import { db } from './index';
import { categories, resources, resourceCategories, resourceGroups, resourceGroupCategories, resourceGroupSubgroups } from './schema';
import { eq, inArray, sql } from 'drizzle-orm';
import type { NewResource, CreateResourceGroup } from './types';

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


export async function getAllResourcesLimited() {
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
        .orderBy(sql<string>`RANDOM()`)
        .limit(1207)
        .execute();
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

export async function createResourceGroup(resourceGroupData: CreateResourceGroup): Promise<{ id: number; name: string; description: string | null }> {
    return await db.transaction(async (tx) => {
        
        async function createResourceGroupRecursive(data: CreateResourceGroup): Promise<{ id: number; name: string; description: string | null }> {
            // Insert the main resource group
            const [insertedGroup] = await tx.insert(resourceGroups).values({
                name: data.name,
                description: data.description || null,
            }).returning({ 
                id: resourceGroups.id, 
                name: resourceGroups.name,
                description: resourceGroups.description
            });

            // Process items
            for (const item of data.items) {
                if (item.type === 'resource') {
                    // Insert into resource_group_categories
                    await tx.insert(resourceGroupCategories).values({
                        resourceGroupId: insertedGroup.id,
                        categoryId: item.data.id,
                    });
                } else if (item.type === 'existing-group') {
                    // Insert into resource_group_subgroups
                    for (let i = 0; i < item.count; i++) {
                        await tx.insert(resourceGroupSubgroups).values({
                            parent_group_id: insertedGroup.id,
                            sub_group_id: item.data.id,
                        });
                    }
                } else if (item.type === 'group') {
                    // Recursively create new sub-groups
                    for (let i = 0; i < item.count; i++) {
                        const subGroup = await createResourceGroupRecursive(item.data);
                        await tx.insert(resourceGroupSubgroups).values({
                            parent_group_id: insertedGroup.id,
                            sub_group_id: subGroup.id,
                        });
                    }
                }
            }

            return insertedGroup;
        }

        return await createResourceGroupRecursive(resourceGroupData);
    });
}
