import { json, type RequestHandler } from '@sveltejs/kit';
import { getAllResources } from '$lib/server/db/queries';

export const GET: RequestHandler = async () => {
	try {
		const allResources = await getAllResources();
		return json(allResources);
	} catch (error) {
		console.error('Error fetching resources:', error);
		return json({ error: 'Failed to fetch resources' }, { status: 500 });
	}
};