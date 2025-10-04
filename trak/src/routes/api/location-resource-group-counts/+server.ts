import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLocationsWithOptimalResourceGroupPlacement } from '$lib/server/db';
import { resourceGroup } from '$lib/server/db/types';
import { z } from 'zod';

// Schema for validating the request body
const requestSchema = z.object({
    resourceGroups: z.array(resourceGroup)
});

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        console.log('📥 Received request body:', JSON.stringify(body, null, 2));

        // Validate the request body
        const { resourceGroups } = requestSchema.parse(body);
        console.log('✅ Validation passed, resource groups:', resourceGroups.length);

        const locations = await getLocationsWithOptimalResourceGroupPlacement(resourceGroups);
        console.log('📊 Query result:', JSON.stringify(locations, null, 2));

        return json(locations);
    } catch (error) {
        console.error('❌ Error fetching location resource group counts:', error);

        // Handle validation errors specifically
        if (error instanceof z.ZodError) {
            return json({
                error: 'Invalid request body',
                details: error.issues
            }, { status: 400 });
        }

        return json({ error: 'Failed to fetch location resource group counts' }, { status: 500 });
    }
};
