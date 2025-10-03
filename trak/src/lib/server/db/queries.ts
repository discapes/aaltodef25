import { db } from './index';
import { resources, locations, resourceCategories } from './schema';
import { count, eq } from 'drizzle-orm';

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

export async function getAllResources() {
    return await db.select().from(resources);
}

export async function getResourcesWithLocation() {
    return await db
        .select({
            id: resources.id,
            name: resources.name,
            description: resources.description,
            latitude: resources.latitude,
            longitude: resources.longitude,
            locationName: locations.cityName,
            createdAt: resources.createdAt,
            updatedAt: resources.updatedAt
        })
        .from(resources)
        .leftJoin(locations, eq(resources.locationId, locations.id));
}