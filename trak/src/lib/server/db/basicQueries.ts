import { db } from './index';
import { categories, resources, resourceCategories, resourceGroups, resourceGroupCategories, resourceGroupSubgroups, locations } from './schema';
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
    try {
        return await db
            .select({
                id: resourceGroups.id,
                name: resourceGroups.name,
                description: resourceGroups.description
            })
            .from(resourceGroups)
            .orderBy(resourceGroups.name)
            .execute();
    } catch (error) {
        console.error('Error fetching resource groups:', error);
        // Return empty array instead of mock data if there's an error
        return [];
    }
}

export async function getResourceGroupById(id: number): Promise<CreateResourceGroup | null> {
    try {
        // Get the main resource group
        const [group] = await db
            .select()
            .from(resourceGroups)
            .where(eq(resourceGroups.id, id))
            .execute();

        if (!group) return null;

        // Get categories for this resource group
        const groupCategories = await db
            .select({
                categoryId: resourceGroupCategories.categoryId,
                categoryName: categories.name,
                categoryDescription: categories.description
            })
            .from(resourceGroupCategories)
            .innerJoin(categories, eq(resourceGroupCategories.categoryId, categories.id))
            .where(eq(resourceGroupCategories.resourceGroupId, id))
            .execute();

        // Get subgroups for this resource group
        const subGroups = await db
            .select({
                subGroupId: resourceGroupSubgroups.sub_group_id,
                subGroupName: resourceGroups.name,
                subGroupDescription: resourceGroups.description
            })
            .from(resourceGroupSubgroups)
            .innerJoin(resourceGroups, eq(resourceGroupSubgroups.sub_group_id, resourceGroups.id))
            .where(eq(resourceGroupSubgroups.parent_group_id, id))
            .execute();

        // Build the items array
        const items: CreateResourceGroup['items'] = [];

        // Add resource items
        for (const category of groupCategories) {
            items.push({
                type: 'resource',
                count: 1, // Default count, could be stored in a separate table if needed
                data: {
                    id: category.categoryId,
                    name: category.categoryName,
                    description: category.categoryDescription
                }
            });
        }

        // Add existing group items (count occurrences of each subgroup)
        const subGroupCounts = new Map<number, { count: number; data: any }>();
        for (const subGroup of subGroups) {
            if (subGroupCounts.has(subGroup.subGroupId)) {
                subGroupCounts.get(subGroup.subGroupId)!.count++;
            } else {
                subGroupCounts.set(subGroup.subGroupId, {
                    count: 1,
                    data: {
                        id: subGroup.subGroupId,
                        name: subGroup.subGroupName,
                        description: subGroup.subGroupDescription
                    }
                });
            }
        }

        for (const [_, { count, data }] of subGroupCounts) {
            items.push({
                type: 'existing-group',
                count,
                data
            });
        }

        return {
            name: group.name,
            description: group.description || '',
            items
        };
    } catch (error) {
        console.error('Error fetching resource group:', error);
        return null;
    }
}

export async function addNewResource(newResourceData: NewResource, latitude: number, longitude: number) {
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {

        const locationss = await tx.select().from(locations).limit(1).execute()
        
        // Insert the resource
        const [insertedResource] = await tx
            .insert(resources)
            .values({
                name: newResourceData.name,
                latitude,
                locationId: locationss[0].id,
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
