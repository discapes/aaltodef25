import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { CapabilitiesRequestSchema, capability } from '$lib/server/db/types';
import { getAllCategoriesAndResourceGroupNames } from '$lib/server/db';
import z from 'zod';

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
            You also have access to the names of several resource groups. These are larger collections of resources that contain multiple categories.
            Categories are ${categories.join(", ")}.
            Resource groups are ${resource_groups.join(", ")}.

            You can, in circumstances where no appropriate categories are available,
            create new categories by adding them to new_categories in the response if they are appropriate in the context of defense. 
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
            schema: z.toJSONSchema(capability)
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

    console.log(data.new_categories)

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