import type { LocationWithResourceCounts, ResourceGroup, resourceGroup } from '../db/types';
import type z from 'zod';

// Calculate how many complete resource groups can be formed from available resources at a location
export function countResourcesGroupsInLocation(location: LocationWithResourceCounts, requiredCategories: Record<number, number>): number {
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
export function extractCategoriesFromResourceGroup(group: ResourceGroup, multiplier: number = 1): Record<number, number> {
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
