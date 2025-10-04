import { db } from './index';
import { categories, resources, resourceCategories, resourceGroups } from './schema';
import { eq, inArray, sql } from 'drizzle-orm';
import type { NewResource } from './types';

export async function getAllCategories() {
    return db
        .select()
        .from(categories)
        .execute();
}

export async function getAllCategoriesAndResourceGroupNames() {
    return db.select({ name: categories.name, type: sql<string>`'category'`.as("type") })
        .from(categories)
        .union(
            db.select({ name: resourceGroups.name, type: sql<string>`'resource_group'`.as("type") })
                .from(resourceGroups)
        )
}


export async function getAllResources() {
    return db
        .select({
            id: resources.id,
            name: resources.name,
            description: resources.description,
            locationId: resources.locationId,
            latitude: resources.latitude,
            longitude: resources.longitude,
            createdAt: resources.createdAt,
            updatedAt: resources.updatedAt,
            categoryId: resourceCategories.categoryId,
            categoryName: categories.name
        })
        .from(resources)
        .leftJoin(resourceCategories, eq(resources.id, resourceCategories.resourceId))
        .leftJoin(categories, eq(resourceCategories.categoryId, categories.id))
        .execute();
}

export async function getResourcesByCategories(categoryIds: number[] = []) {
    if (categoryIds.length === 0) {
        // If no categories specified, return all resources
        return getAllResources();
    }

    return db
        .select({
            id: resources.id,
            name: resources.name,
            description: resources.description,
            locationId: resources.locationId,
            latitude: resources.latitude,
            longitude: resources.longitude,
            createdAt: resources.createdAt,
            updatedAt: resources.updatedAt,
            categoryId: resourceCategories.categoryId,
            categoryName: categories.name
        })
        .from(resources)
        .innerJoin(resourceCategories, eq(resources.id, resourceCategories.resourceId))
        .innerJoin(categories, eq(resourceCategories.categoryId, categories.id))
        .where(inArray(resourceCategories.categoryId, categoryIds))
        .execute();
}

export async function getAllResourceGroups() {
    // TODO: Implement when resource groups table is created
    // For now, return mock data for development
    return [
        { id: 1, name: 'Emergency Response Kit', description: 'Standard emergency response equipment' },
        { id: 2, name: 'Medical Supplies', description: 'Basic medical equipment and supplies' },
        { id: 3, name: 'Communication Equipment', description: 'Radios, phones, and communication gear' }
    ];
}

export async function addNewResource(newResourceData: NewResource, locationId: number, latitude: number, longitude: number) {
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
        // Insert the resource
        const [insertedResource] = await tx
            .insert(resources)
            .values({
                name: newResourceData.name,
                description: `Telegram: ${newResourceData.telegram}`, // Store telegram info in description
                locationId,
                latitude,
                longitude,
            })
            .returning({
                id: resources.id,
                name: resources.name,
                description: resources.description,
                locationId: resources.locationId,
                latitude: resources.latitude,
                longitude: resources.longitude,
                createdAt: resources.createdAt,
                updatedAt: resources.updatedAt,
            });

        // Get category IDs for the provided category names
        const categoryRecords = await tx
            .select({ id: categories.id, name: categories.name })
            .from(categories)
            .where(inArray(categories.name, newResourceData.categories))
            .execute();

        // Create relationships between the resource and categories
        if (categoryRecords.length > 0) {
            const resourceCategoryInserts = categoryRecords.map(category => ({
                resourceId: insertedResource.id,
                categoryId: category.id,
            }));

            await tx
                .insert(resourceCategories)
                .values(resourceCategoryInserts)
                .execute();
        }

        // Return the created resource with its categories
        return {
            ...insertedResource,
            categories: categoryRecords,
        };
    });
}
