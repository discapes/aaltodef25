import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { CapabilitiesRequestSchema, capability } from '$lib/server/db/types';
import { getAllCategoriesAndResourceGroupNames } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { message } = CapabilitiesRequestSchema.parse(body);

    const availableCategoriesAndGroups = await getAllCategoriesAndResourceGroupNames();
    const categories = availableCategoriesAndGroups.filter(c => c.type == "category").map(c => c.name)
    const resource_groups = availableCategoriesAndGroups.filter(c => c.type == "resource_group").map(c => c.name)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_KEY}`,
        'HTTP-Referer': 'http://localhost:5173', // Replace with your domain
        'X-Title': 'Trak',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free",
        messages: [
          {
            role: "system", content: `You are a system which, based on the capabilities 
            requested by the user, return a list of categories which are required to fulfill
            the given capability. You should consider the DOTMLPF doctrine, and return categories
            that are based on doctrine, organization, training, materiel, leadership, personnel or facilities.
            If there are not enough categories or some important ones are missing, simply return an empty capabilities array.
            Categories are ${categories.join(", ")}.
            Resource groups are ${resource_groups.join(", ")}
            `
          },
          { role: "user", content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "capability_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                }
              },
              required: ["categories"],
              additionalProperties: false
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const resBody = await response.json();
    if(!resBody.choices) {
      console.log("No categories returned", resBody)
      return json({
        success: false,
        respone: {categories: []},
        usage: resBody.usage
      })
    }
    const capJson = JSON.parse(resBody.choices[0].message.content)
    const data = capability.parse(capJson)

    return json({
      success: true,
      response: data,
      usage: resBody.usage
    });
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    return json({ error: 'Failed to call AI service' }, { status: 500 });
  }
};