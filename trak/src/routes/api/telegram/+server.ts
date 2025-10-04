import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { newResource, telegramMessage } from '$lib/server/db/types';
import { addNewResource, getAllCategories } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import z from 'zod';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { message } = telegramMessage.parse(body);

    const categories = await getAllCategories();
    const categoryNames = categories.map(c => c.name);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_KEY}`,
        'HTTP-Referer': 'http://localhost:5173', // Replace with your domain
        'X-Title': 'Trak',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.2-24b-instruct:free",
        messages: [
          {
            role: "system", content: `You are a system that takes in an item which needs to be categorized into military terms. 
            Given a capability description, you should return the name of the resource (short) and the categories that the item fits into.
            
            Available categories: ${categoryNames.join(", ")}.
                        
            Only use categories from the available list.
            If the message is nonsensical or contains anything else other than a description of an item, return an empty string for the name.
            `
          },
          { role: "user", content: message }
        ],
        metadata: {
          thinking: false,
        },
        max_tokens: 3000,
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "capability_resource_group",
            strict: true,
            schema: z.toJSONSchema(newResource)
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const resBody = await response.json();
    if (!resBody.choices || !resBody.choices[0] || !resBody.choices[0].message) {
      console.log("No categories returned", resBody)
      return json({
        success: false,
        response: { name: "", description: "", items: [] },
      }, { status: 401})
    }
    const rawJson = JSON.parse(resBody.choices[0].message.content)
    const data = newResource.parse(rawJson)

    if(data.name == "") {
            console.log("Nonsensical message detected: " + message, resBody)
      return json({
        success: false,
        response: { name: "", description: "", items: [] },
      }, { status: 422})
    }

    console.log(`categories for ${data.name}:`, data.categories)

    const lat = Math.random() * 0.05 + 60.15
    const lon = Math.random() * 0.05 + 24.9

    await addNewResource(data, 1, lat,lon)

    return json({
      success: true,
    });
  } catch (error) {
    console.error('Error processing telegram message:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 400 }
    );
  }
};