import { getAllCategories, getAllResourceGroups } from '$lib/server/db/basicQueries';
import type { PageServerLoad } from './$types';

export const ssr = false;

export const load: PageServerLoad = async () => {
    const categories = await getAllCategories();
    const existingResourceGroups = await getAllResourceGroups();

    return {
        categories,
        existingResourceGroups
    };
};
