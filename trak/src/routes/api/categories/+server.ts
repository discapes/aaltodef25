import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllCategories } from '$lib/server/db/basicQueries';

export const GET: RequestHandler = async () => {
    try {
        const categories = await getAllCategories();
        return json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
};