import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { CapabilitiesRequestSchema, capabilityResourceGroup } from '$lib/server/db/types';
import { getAllCategoriesAndResourceGroupNames } from '$lib/server/db';
import { z } from 'zod';

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
      // Consider the DOTMLPF doctrine(Doctrine, Organization, Training, Materiel, Leadership, Personnel, Facilities) when determining resource requirements.
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free",
        messages: [
          {
            role: "system", content: `You are a system that creates resource groups based on military capabilities requested by the user. 
            Given a capability description, you should create a resource group containing the specific resources (by category name) and quantities needed to fulfill that capability.
            
            Available categories: ${categories.join(", ")}.
            Available existing resource groups: ${resource_groups.join(", ")}.
            
            Create a resource group with:
            - A descriptive name for the capability
            - An optional description explaining the purpose
            - A list of items, each specifying either:
              
              For individual resources:
              * type: "resource" 
              * count: number of units needed
              * categoryName: exact name from the available categories
              * hours_needed: estimated hours of operation/usage (optional, for ongoing activities)
              * hours_to_realize: estimated hours to deploy/setup (optional, for initial setup time)
              
              For existing resource groups:
              * type: "existing-group"
              * count: number of groups needed
              * resourceGroupName: exact name from the available existing resource groups
              * hours_needed: estimated hours of operation/usage (optional, for ongoing activities)
              * hours_to_realize: estimated hours to deploy/setup (optional, for initial setup time)
            
            Use existing resource groups when they match the capability requirements closely. This is more efficient than listing individual resources.
            Only list the resources actually needed for to build the item, form the team or complete the action depending on the type of request.
            Nothing else. The fewer the better.
          
            Some categories are people or skills people have. Do not use them if you are not explicitly asked to form a team or similar.
            
            Only use categories and resource group names from the available lists. Choose realistic quantities and time estimates based on military operational requirements.
            For timing estimates: hours_to_realize should reflect deployment/setup time (e.g., 2-24 hours), 
            hours_needed should reflect operational duration (e.g., 8-72 hours for missions).`
          },
          { role: "user", content: message }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "capability_resource_group",
            strict: true,
            schema: z.toJSONSchema(capabilityResourceGroup)
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const resBody = await response.json();
    if (!resBody.choices || !resBody.choices[0] || !resBody.choices[0].message) {
      console.log("No resource group returned", resBody)
      return json({
        success: false,
        response: { name: "", description: "", items: [] },
        usage: resBody.usage
      })
    }
    const capJson = JSON.parse(resBody.choices[0].message.content)
    const data = capabilityResourceGroup.parse(capJson)

    console.log('Successfully parsed and validated response:', data)

    return json({
      success: true,
      response: data,
    });
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    return json({ error: 'Failed to call AI service' }, { status: 500 });
  }
};