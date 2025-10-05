import { json } from '@sveltejs/kit';
import { getResourceGroupById } from '$lib/server/db/basicQueries';
import type { RequestEvent } from '@sveltejs/kit';

export const GET = async ({ params }: RequestEvent) => {
    const id = parseInt(params.id);

    if (isNaN(id)) {
        return json({ error: 'Invalid resource group ID' }, { status: 400 });
    }

    try {
        const resourceGroup = await getResourceGroupById(id);

        if (!resourceGroup) {
            return json({ error: 'Resource group not found' }, { status: 404 });
        }

        return json(resourceGroup);
    } catch (error) {
        console.error('Error fetching resource group:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
