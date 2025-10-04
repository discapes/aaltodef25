import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createResourceGroupSchema } from '$lib/server/db/types';
import { createResourceGroup } from '$lib/server/db/basicQueries';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        
        // Validate the data
        const validatedData = createResourceGroupSchema.parse(data);
        
        // Insert into database
        const createdGroup = await createResourceGroup(validatedData);
        
        return json({ 
            message: 'Resource group created successfully',
            data: {
                id: createdGroup.id,
                ...validatedData
            }
        });
    } catch (error) {
        console.error('Error creating resource group:', error);
        return json({ 
            error: 'Failed to create resource group',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 });
    }
};