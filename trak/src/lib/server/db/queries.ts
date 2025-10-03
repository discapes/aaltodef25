import { db } from './index';
import { resources, locations, resourceCategories } from './schema';
import { count, eq } from 'drizzle-orm';

export async function getResourceCounts(categoryId: number) {
    return db
        .select({
            count: count(resources.id)
        })
        .from(resources)
        .innerJoin(resourceCategories, eq(resources.id, resourceCategories.resourceId))
        .where(eq(resourceCategories.categoryId, categoryId))
        .execute();
}
