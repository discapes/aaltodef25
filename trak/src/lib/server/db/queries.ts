import { db } from './index';
import { resources, categories, resourceCategories, locations } from './schema';
import { count, eq, inArray } from 'drizzle-orm';
import type { LocationArray, LocationWithResourceCounts, ResourceGroup } from './types';
import { countResourcesGroupsInLocation, extractCategoriesFromResourceGroup } from '../utils/resourceGroupUtils';

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
