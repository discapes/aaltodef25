import { json, type RequestHandler } from '@sveltejs/kit';
import { getAllResourcesLimited, getResourcesByCategories } from '$lib/server/db/basicQueries';

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Get category IDs from query parameters
		const categoryParam = url.searchParams.get('categories');
		let categoryIds: number[] = [];
		
		if (categoryParam) {
			// Parse comma-separated category IDs
			categoryIds = categoryParam
				.split(',')
				.map(id => parseInt(id.trim()))
				.filter(id => !isNaN(id));
		}
		
		const resources = categoryIds.length > 0 
			? await getResourcesByCategories(categoryIds)
			: await getAllResourcesLimited();
			
		return json(resources);
	} catch (error) {
		console.error('Error fetching resources:', error);
		return json({ error: 'Failed to fetch resources' }, { status: 500 });
	}
};