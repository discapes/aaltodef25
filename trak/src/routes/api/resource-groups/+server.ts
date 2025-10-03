import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createResourceGroupSchema } from '$lib/server/db/types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        
        // Validate the data
        const validatedData = createResourceGroupSchema.parse(data);
        
        // TODO: Implement database insertion logic
        console.log('Resource group data to be saved:', validatedData);
        
        // For now, just return success
        return json({ 
            message: 'Resource group created successfully',
            data: validatedData 
        });
    } catch (error) {
        console.error('Error creating resource group:', error);
        return json({ 
            error: 'Failed to create resource group',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 });
    }
};