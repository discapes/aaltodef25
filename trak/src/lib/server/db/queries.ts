import { db } from './index';
import { resources, categories, locations, resourceCategories } from './schema';
import { count, like, ilike, eq, and, or } from 'drizzle-orm';

export async function getCategoryCounts(categoryId: number) {
    return db
        .select({
            count: count(resources.id)
        })
        .from(resources)
        .innerJoin(resourceCategories, eq(resources.id, resourceCategories.resourceId))
        .where(eq(resourceCategories.categoryId, categoryId))
        .execute();
}

export async function getGroupCounts(queryId: number) {
    // TODO
}
