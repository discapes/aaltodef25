import { db } from './index';
import { resources, categories, resourceCategories, locations } from './schema';
import { count, eq, inArray } from 'drizzle-orm';
import type { LocationArray, LocationWithResourceCounts, ResourceGroup } from './types';
import { countResourcesGroupsInLocation, extractCategoriesFromResourceGroup } from '../utils/resourceGroupUtils';

export async function getLocationsWithResourceCounts(categoryIds: number[] = []): Promise<LocationArray> {
    try {
        console.log('🔍 Query parameters - categoryIds:', categoryIds);

        // First, let's check what's actually in the database
        const allCategories = await db.select().from(categories).limit(10);
        console.log('📁 Categories in DB:', allCategories.length, allCategories.map(c => `${c.id}:${c.name}`));

        const allResources = await db.select().from(resources).limit(10);
        console.log('🧑‍💼 Resources in DB:', allResources.length, allResources.map(r => `${r.id}:${r.name}`));

        const allResourceCategories = await db.select().from(resourceCategories).limit(10);
        console.log('🔗 Resource-Category relationships:', allResourceCategories.length, allResourceCategories);

        // Build where condition for category filtering
        const whereCondition = categoryIds.length > 0 ? inArray(categories.id, categoryIds) : undefined;
        console.log('📝 WHERE condition active:', !!whereCondition);

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

        console.log('🗃️ Raw query results:', locationCounts.length, 'rows');
        console.log('📋 Sample raw data:', JSON.stringify(locationCounts.slice(0, 3), null, 2));

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
    console.log('🔄 Processing resource groups:', resourceGroups.length);

    // Extract categories from all resource groups
    const allCategoryData: Record<string, Record<number, number>> = {};
    const allCategoryIds = new Set<number>();

    for (const group of resourceGroups) {
        const categoryData = extractCategoriesFromResourceGroup(group);
        console.log(`📋 Group "${group.name}" requires categories:`, categoryData);
        allCategoryData[group.id.toString()] = categoryData;

        // Collect all unique category IDs
        for (const categoryId of Object.keys(categoryData)) {
            allCategoryIds.add(Number(categoryId));
        }
    }

    console.log('🎯 All required category IDs:', Array.from(allCategoryIds));

    // Get location data for all required categories
    const locations = await getLocationsWithResourceCounts(Array.from(allCategoryIds));
    console.log('🏘️ Found locations:', locations.length);
    console.log('📊 Location details:', JSON.stringify(locations, null, 2));

    // Calculate group counts for each location and each resource group
    const locationsWithGroupCounts = locations.map(location => {

        // For each resource group, calculate how many can be formed at this location
        for (const group of resourceGroups) {
            const requiredCategories = allCategoryData[group.id.toString()];
            const groupCount = countResourcesGroupsInLocation(location, requiredCategories);
            console.log(`🧮 Location "${location.location.name}" can form ${groupCount} of group "${group.name}"`);
            location.resourceGroups.push({
                group: group,
                count: groupCount,
            });
        }

        return {
            ...location,
        };
    });

    console.log('✨ Final result:', locationsWithGroupCounts.length, 'locations with group counts');
    return locationsWithGroupCounts;
}
