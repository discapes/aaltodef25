import type { PageServerLoad } from './$types';
import { getAllCategories, getAllResourceGroups } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
    const categories = await getAllCategories();
    const existingResourceGroups = await getAllResourceGroups();
    
    return {
        categories,
        existingResourceGroups
    };
};