import { db } from './index';
import { resources, categories, resourceCategories, locations } from './schema';
import { count, eq, inArray } from 'drizzle-orm';
import type { LocationArray, LocationWithResourceCounts, resourceGroup, ResourceGroup } from './types';
import type z from 'zod';

export async function getLocationsWithResourceCounts(categoryIds: number[] = []): Promise<LocationArray> {
    try {
        // Build where condition for category filtering
        const whereCondition = categoryIds.length > 0 ? inArray(categories.id, categoryIds) : undefined;

        // Execute query with optional category filtering
        const locationCounts = await db
            .select({
                locationId: locations.id,
                cityName: locations.cityName,
                categoryId: categories.id,
                categoryName: categories.name,
                resourceCount: count(resources.id)
            })
            .from(locations)
            .leftJoin(resources, eq(locations.id, resources.locationId))
            .leftJoin(resourceCategories, eq(resources.id, resourceCategories.resourceId))
            .leftJoin(categories, eq(resourceCategories.categoryId, categories.id))
            .where(whereCondition)
            .groupBy(locations.id, locations.cityName, categories.id, categories.name);

        // Transform flat results into nested structure
        const locationMap: Record<number, LocationWithResourceCounts> = {};

        for (const row of locationCounts) {
            if (!locationMap[row.locationId]) {
                locationMap[row.locationId] = {
                    location: {
                        id: row.locationId,
                        name: row.cityName
                    },
                    resources: [],
                    resourceGroups: []
                };
            }
            if (row.categoryId !== null) {
                locationMap[row.locationId].resources.push({
                    categoryId: row.categoryId,
                    categoryName: row.categoryName ?? "",
                    count: Number(row.resourceCount)
                });
            }
        }

        return Object.values(locationMap);
    } catch (error) {
        console.error('Error getting locations with resource counts:', error);
        throw new Error('Failed to retrieve locations with resource counts');
    }
}

export async function getLocationsWithResourceGroupCounts(resourceGroups: ResourceGroup[]): Promise<LocationWithResourceCounts[]> {
    // Extract categories from all resource groups
    const allCategoryData: Record<string, Record<number, number>> = {};
    const allCategoryIds = new Set<number>();

    for (const group of resourceGroups) {
        const categoryData = extractCategoriesFromResourceGroup(group);
        allCategoryData[group.id.toString()] = categoryData;

        // Collect all unique category IDs
        for (const categoryId of Object.keys(categoryData)) {
            allCategoryIds.add(Number(categoryId));
        }
    }

    // Get location data for all required categories
    const locations = await getLocationsWithResourceCounts(Array.from(allCategoryIds));

    // Calculate group counts for each location and each resource group
    const locationsWithGroupCounts = locations.map(location => {

        // For each resource group, calculate how many can be formed at this location
        for (const group of resourceGroups) {
            const requiredCategories = allCategoryData[group.id.toString()];
            const groupCount = countResourcesGroupsInLocation(location, requiredCategories);
            location.resourceGroups.push({
                group: group,
                count: groupCount,
            });
        }

        return {
            ...location,
        };
    });

    return locationsWithGroupCounts;
}

// Calculate how many complete resource groups can be formed from available resources at a location
function countResourcesGroupsInLocation(location: LocationWithResourceCounts, requiredCategories: Record<number, number>): number {
    let maxGroups = Infinity;

    // For each required category, check how many groups we can form
    for (const [categoryIdStr, requiredCount] of Object.entries(requiredCategories)) {
        const categoryId = Number(categoryIdStr);

        // Find the available count for this category at this location
        const categoryData = location.resources.find(cat => cat.categoryId === categoryId);
        const availableCount = categoryData ? categoryData.count : 0;

        // Calculate how many groups we can form with this category
        const possibleGroups = Math.floor(availableCount / requiredCount);

        // The limiting factor determines the maximum groups we can form
        maxGroups = Math.min(maxGroups, possibleGroups);
    }

    // If we couldn't find any required categories, we can't form any groups
    return maxGroups === Infinity ? 0 : maxGroups;
}

// Multiplier is used to handle nested groups correctly, only specified within the function when calling recursively
function extractCategoriesFromResourceGroup(group: ResourceGroup, multiplier: number = 1): Record<number, number> {
    let categoryData: Record<number, number> = {};

    for (const item of group.items) {
        if (item.type === 'resource') {
            // For resources, the data is a category itself
            const categoryId = item.data.id;
            const currentCount = categoryData[categoryId] || 0;
            categoryData[categoryId] = currentCount + (item.count * multiplier);
        } else if (item.type === 'group') {
            // For nested groups, multiply the current multiplier by the group's count
            const nestedGroup = item.data as z.infer<typeof resourceGroup>;
            const nestedMultiplier = multiplier * item.count;
            const nestedCategoryData = extractCategoriesFromResourceGroup(nestedGroup, nestedMultiplier);

            // Merge nested category data
            for (const [categoryId, count] of Object.entries(nestedCategoryData)) {
                const id = Number(categoryId);
                const currentCount = categoryData[id] || 0;
                categoryData[id] = currentCount + count;
            }
        }
    }

    return categoryData;
}

export async function getAllCategories() {
    return db
        .select()
        .from(categories)
        .execute();
}

export async function getAllResources() {
    return db
        .select()
        .from(resources).execute()
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
