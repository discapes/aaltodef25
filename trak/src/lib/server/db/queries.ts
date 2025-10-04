import { db } from './index';
import { resources, categories, resourceCategories, locations } from './schema';
import { count, eq, inArray } from 'drizzle-orm';
import type { LocationArray, LocationWithResourceCounts, ResourceGroup } from './types';
import { countResourcesGroupsInLocation, extractCategoriesFromResourceGroup } from '../utils/resourceGroupUtils';

export async function getLocationsWithResourceCounts(categoryIds: number[] = []): Promise<LocationArray> {
    try {
        // Build where condition for category filtering
        const whereCondition = categoryIds.length > 0 ? inArray(categories.id, categoryIds) : undefined;

        // First, get location coordinates (using first resource's coordinates as representative)
        const locationCoords = await db
            .select({
                locationId: locations.id,
                latitude: resources.latitude,
                longitude: resources.longitude
            })
            .from(locations)
            .leftJoin(resources, eq(locations.id, resources.locationId))
            .orderBy(locations.id, resources.id); // Order to get consistent "first" resource per location

        // Create a map of location coordinates (using first resource per location)
        const coordsMap = new Map();
        for (const coord of locationCoords) {
            if (!coordsMap.has(coord.locationId) && coord.latitude !== null && coord.longitude !== null) {
                coordsMap.set(coord.locationId, {
                    latitude: coord.latitude,
                    longitude: coord.longitude,
                });
            }
        }

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
                const coords = coordsMap.get(row.locationId) || { latitude: null, longitude: null };
                locationMap[row.locationId] = {
                    location: {
                        id: row.locationId,
                        name: row.cityName,
                        latitude: coords.latitude,
                        longitude: coords.longitude
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
        const categoryUsage: Record<number, number> = {};

        // For each resource group, calculate how many can be formed at this location
        for (const group of resourceGroups) {
            const requiredCategories = allCategoryData[group.id.toString()];
            const groupCount = countResourcesGroupsInLocation(location, requiredCategories);

            // Create sources array for local resources
            const sources = [];
            for (const [categoryIdStr, requiredCount] of Object.entries(requiredCategories)) {
                const categoryId = Number(categoryIdStr);
                const localResource = location.resources.find(r => r.categoryId === categoryId);
                if (localResource && localResource.count > 0 && groupCount > 0) {
                    // Units used = required per group * number of groups formed
                    const unitsUsedByThisGroup = requiredCount * groupCount;
                    if (unitsUsedByThisGroup > 0 && unitsUsedByThisGroup <= localResource.count) {
                        sources.push({
                            categoryId: categoryId,
                            categoryName: localResource.categoryName,
                            sourceLocationId: location.location.id,
                            sourceLocationName: location.location.name,
                            unitsTransferred: unitsUsedByThisGroup,
                            transportationTimeHours: 0, // Local resources, no transportation time
                            distanceKm: 0, // Local resources, no distance
                            count: groupCount, // Number of groups this local source supports
                            remainingAtLocation: localResource.count - unitsUsedByThisGroup // Remaining units at this location
                        });
                    }
                }
            }

            location.resourceGroups.push({
                group: group,
                count: groupCount,
                sources: sources
            });

            // Track usage of each category across all groups
            for (const [categoryIdStr, count] of Object.entries(allCategoryData[group.id.toString()])) {
                const categoryId = Number(categoryIdStr);
                categoryUsage[categoryId] = (categoryUsage[categoryId] ?? 0) + count;
            }
        }


        return {
            ...location,
            categoryUsage: categoryUsage
        };
    });

    return locationsWithGroupCounts;
}

export async function getLocationsWithResourceGroupCountsOptimized(resourceGroups: ResourceGroup[]): Promise<{
    locations: LocationWithResourceCounts[];
    combinedOptimization: {
        group: ResourceGroup;
        currentTotal: number;
        potentialAdditional: number;
        totalPossible: number;
        additionalPlacements: {
            targetLocationId: number;
            targetLocationName: string;
            additionalGroupsAtLocation: number;
            resourceTransfers: {
                fromLocationId: number;
                fromLocationName: string;
                categoryId: number;
                categoryName: string;
                quantity: number;
                travelTimeHours: number;
                distanceKm: number;
            }[];
            maxTravelTimeHours: number;
            totalTransferDistance: number;
        }[];
    }[];
}> {
    // First get the regular location-based counts
    const locations = await getLocationsWithResourceGroupCounts(resourceGroups);

    // Extract categories from all resource groups
    const allCategoryData: Record<string, Record<number, number>> = {};

    for (const group of resourceGroups) {
        const categoryData = extractCategoriesFromResourceGroup(group);
        allCategoryData[group.id.toString()] = categoryData;
    }

    // Calculate combined optimization potential with travel optimization
    const combinedOptimization = await Promise.all(resourceGroups.map(async (group) => {
        const requiredCategories = allCategoryData[group.id.toString()];

        // Sum up current counts from all locations
        let currentTotal = 0;
        for (const location of locations) {
            const locationGroup = location.resourceGroups.find(rg => rg.group.id === group.id);
            currentTotal += locationGroup?.count || 0;
        }

        // Calculate total available resources across all locations
        // NOTE: This should account for resources already allocated to local groups
        const totalAvailableByCategory: Record<number, number> = {};
        const resourcesByLocationAndCategory: Record<number, Record<number, number>> = {};

        for (const location of locations) {
            resourcesByLocationAndCategory[location.location.id] = {};
            for (const resource of location.resources) {
                // Calculate how much of this resource is already used by local groups at this location
                let locallyUsed = 0;
                for (const locationGroup of location.resourceGroups) {
                    if (locationGroup.sources) {
                        for (const source of locationGroup.sources) {
                            if (source.sourceLocationId === location.location.id &&
                                source.categoryId === resource.categoryId) {
                                locallyUsed += source.unitsTransferred;
                            }
                        }
                    }
                }

                // Available for transfer = total - locally used
                const availableForTransfer = Math.max(0, resource.count - locallyUsed);

                totalAvailableByCategory[resource.categoryId] =
                    (totalAvailableByCategory[resource.categoryId] || 0) + availableForTransfer;
                resourcesByLocationAndCategory[location.location.id][resource.categoryId] = availableForTransfer;
            }
        }

        // Calculate maximum possible ADDITIONAL groups from remaining available resources
        let maxAdditionalGroups = Infinity;
        for (const [categoryIdStr, requiredCount] of Object.entries(requiredCategories)) {
            const categoryId = Number(categoryIdStr);
            const totalAvailable = totalAvailableByCategory[categoryId] || 0;
            const additionalPossible = Math.floor(totalAvailable / requiredCount);
            maxAdditionalGroups = Math.min(maxAdditionalGroups, additionalPossible);
        }

        const potentialAdditional = maxAdditionalGroups === Infinity ? 0 : maxAdditionalGroups;

        console.log(`Optimization for ${group.name}:`, {
            currentTotal,
            potentialAdditional,
            totalAvailableByCategory,
            requiredCategories
        });

        // Calculate optimal placement for additional groups
        const additionalPlacements = [];

        if (potentialAdditional > 0) {
            // For each location, calculate how many additional groups could be placed there
            // and what resources would need to be transferred
            for (const targetLocation of locations) {
                let additionalGroupsAtLocation = 0;
                const resourceTransfers = [];
                const remainingNeeds: Record<number, number> = { ...requiredCategories };

                // First, use what's already available at the target location
                for (const [categoryIdStr, needed] of Object.entries(remainingNeeds)) {
                    const categoryId = Number(categoryIdStr);
                    const available = resourcesByLocationAndCategory[targetLocation.location.id][categoryId] || 0;
                    const used = Math.min(available, needed);
                    remainingNeeds[categoryId] -= used;
                }

                // Calculate how many groups we can form with local resources
                let localGroups = Infinity;
                for (const [categoryIdStr, _] of Object.entries(requiredCategories)) {
                    const categoryId = Number(categoryIdStr);
                    const available = resourcesByLocationAndCategory[targetLocation.location.id][categoryId] || 0;
                    const required = requiredCategories[categoryId];
                    localGroups = Math.min(localGroups, Math.floor(available / required));
                }
                localGroups = localGroups === Infinity ? 0 : localGroups;

                // Calculate additional groups possible with transfers
                const surplus: Record<number, { locationId: number, locationName: string, quantity: number }[]> = {};

                // Collect surplus resources from other locations
                for (const sourceLocation of locations) {
                    if (sourceLocation.location.id === targetLocation.location.id) continue;

                    for (const resource of sourceLocation.resources) {
                        if (!surplus[resource.categoryId]) {
                            surplus[resource.categoryId] = [];
                        }
                        // Use available resources from our calculation, not total count
                        const availableFromThisLocation = resourcesByLocationAndCategory[sourceLocation.location.id][resource.categoryId] || 0;
                        if (availableFromThisLocation > 0) {
                            surplus[resource.categoryId].push({
                                locationId: sourceLocation.location.id,
                                locationName: sourceLocation.location.name,
                                quantity: availableFromThisLocation
                            });
                        }
                    }
                }

                // Calculate transfers needed and additional groups possible
                let maxAdditionalGroups = potentialAdditional;
                const transfers = [];
                let totalTransferDistance = 0;
                let maxTravelTime = 0;

                // Try to form additional groups by transferring resources
                for (let groupAttempt = 1; groupAttempt <= maxAdditionalGroups; groupAttempt++) {
                    const neededForThisGroup: Record<number, number> = {};
                    let canFormGroup = true;

                    // Calculate what we need for this additional group
                    for (const [categoryIdStr, required] of Object.entries(requiredCategories)) {
                        const categoryId = Number(categoryIdStr);
                        const localAvailable = resourcesByLocationAndCategory[targetLocation.location.id][categoryId] || 0;
                        const alreadyUsed = (localGroups + groupAttempt - 1) * required;
                        const stillAvailableLocally = Math.max(0, localAvailable - alreadyUsed);
                        const stillNeeded = Math.max(0, required - stillAvailableLocally);

                        if (stillNeeded > 0) {
                            neededForThisGroup[categoryId] = stillNeeded;
                        }
                    }

                    // Try to fulfill needs from surplus
                    for (const [categoryIdStr, needed] of Object.entries(neededForThisGroup)) {
                        const categoryId = Number(categoryIdStr);
                        const categoryName = locations.find(l => l.resources.some(r => r.categoryId === categoryId))
                            ?.resources.find(r => r.categoryId === categoryId)?.categoryName || 'Unknown';

                        let remainingNeed = needed;

                        if (surplus[categoryId]) {
                            for (const source of surplus[categoryId]) {
                                if (remainingNeed <= 0) break;

                                const transferQuantity = Math.min(remainingNeed, source.quantity);
                                if (transferQuantity > 0) {
                                    // Calculate travel time between locations
                                    const travelInfo = await calculateLocationTravelTime(
                                        source.locationId,
                                        targetLocation.location.id
                                    );

                                    if (travelInfo) {
                                        transfers.push({
                                            fromLocationId: source.locationId,
                                            fromLocationName: source.locationName,
                                            categoryId,
                                            categoryName,
                                            quantity: transferQuantity,
                                            travelTimeHours: travelInfo.travelTimeHours,
                                            distanceKm: travelInfo.distanceKm
                                        });

                                        totalTransferDistance += travelInfo.distanceKm * transferQuantity;
                                        maxTravelTime = Math.max(maxTravelTime, travelInfo.travelTimeHours);

                                        source.quantity -= transferQuantity;
                                        remainingNeed -= transferQuantity;
                                    }
                                }
                            }
                        }

                        if (remainingNeed > 0) {
                            canFormGroup = false;
                            break;
                        }
                    }

                    if (canFormGroup) {
                        additionalGroupsAtLocation = groupAttempt;
                    } else {
                        break;
                    }
                }

                if (additionalGroupsAtLocation > 0) {
                    // Calculate local resource consumption for this placement
                    const localResourceSources = [];
                    for (const [categoryIdStr, required] of Object.entries(requiredCategories)) {
                        const categoryId = Number(categoryIdStr);
                        const categoryName = locations.find(l => l.resources.some(r => r.categoryId === categoryId))
                            ?.resources.find(r => r.categoryId === categoryId)?.categoryName || 'Unknown';
                        const localAvailable = resourcesByLocationAndCategory[targetLocation.location.id][categoryId] || 0;
                        const totalNeeded = additionalGroupsAtLocation * required;

                        // Calculate how much comes from local resources
                        const fromLocal = Math.min(localAvailable, totalNeeded);

                        if (fromLocal > 0) {
                            localResourceSources.push({
                                categoryId,
                                categoryName,
                                quantity: fromLocal
                            });
                        }
                    }

                    additionalPlacements.push({
                        targetLocationId: targetLocation.location.id,
                        targetLocationName: targetLocation.location.name,
                        additionalGroupsAtLocation,
                        resourceTransfers: transfers,
                        localResourceSources,
                        maxTravelTimeHours: Math.round(maxTravelTime * 100) / 100,
                        totalTransferDistance: Math.round(totalTransferDistance * 100) / 100
                    });
                }
            }

            // Sort placements by efficiency (most additional groups with least travel time)
            additionalPlacements.sort((a, b) => {
                const efficiencyA = a.additionalGroupsAtLocation / (a.maxTravelTimeHours + 1);
                const efficiencyB = b.additionalGroupsAtLocation / (b.maxTravelTimeHours + 1);
                return efficiencyB - efficiencyA;
            });
        }

        return {
            group,
            currentTotal,
            potentialAdditional,
            totalPossible: currentTotal + potentialAdditional,
            additionalPlacements
        };
    }));

    return {
        locations,
        combinedOptimization
    };
}

// Calculate travel time between two coordinates (latitude, longitude pairs)
export function calculateTravelTime(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    speedKmh: number = 50 // Default average speed including stops, traffic, etc.
): {
    distanceKm: number;
    travelTimeHours: number;
} {
    // Haversine formula to calculate distance between two points on Earth
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Calculate travel time in hours
    const travelTimeHours = distanceKm / speedKmh;

    return {
        distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
        travelTimeHours: Math.round(travelTimeHours * 100) / 100 // Round to 2 decimal places
    };
}

// Calculate travel time between two locations using their representative coordinates
export async function calculateLocationTravelTime(
    locationId1: number,
    locationId2: number,
    speedKmh: number = 50
): Promise<{
    location1: { id: number; name: string; latitude: number; longitude: number };
    location2: { id: number; name: string; latitude: number; longitude: number };
    distanceKm: number;
    travelTimeHours: number;
} | null> {
    try {
        // Get representative coordinates for each location (using first resource's coordinates)
        const location1Data = await db
            .select({
                locationId: locations.id,
                locationName: locations.cityName,
                latitude: resources.latitude,
                longitude: resources.longitude
            })
            .from(locations)
            .leftJoin(resources, eq(locations.id, resources.locationId))
            .where(eq(locations.id, locationId1))
            .limit(1);

        const location2Data = await db
            .select({
                locationId: locations.id,
                locationName: locations.cityName,
                latitude: resources.latitude,
                longitude: resources.longitude
            })
            .from(locations)
            .leftJoin(resources, eq(locations.id, resources.locationId))
            .where(eq(locations.id, locationId2))
            .limit(1);

        if (!location1Data[0] || !location2Data[0] ||
            location1Data[0].latitude === null || location1Data[0].longitude === null ||
            location2Data[0].latitude === null || location2Data[0].longitude === null) {
            return null; // Missing location data or coordinates
        }

        const travelInfo = calculateTravelTime(
            location1Data[0].latitude,
            location1Data[0].longitude,
            location2Data[0].latitude,
            location2Data[0].longitude,
            speedKmh
        );

        return {
            location1: {
                id: location1Data[0].locationId,
                name: location1Data[0].locationName,
                latitude: location1Data[0].latitude,
                longitude: location1Data[0].longitude
            },
            location2: {
                id: location2Data[0].locationId,
                name: location2Data[0].locationName,
                latitude: location2Data[0].latitude,
                longitude: location2Data[0].longitude
            },
            ...travelInfo
        };
    } catch (error) {
        console.error('Error calculating location travel time:', error);
        return null;
    }
}

// Calculate total realization time including individual resource/group times
function calculateTotalRealizationTime(group: ResourceGroup, travelTime: number = 0): number {
    let maxResourceTime = 0;
    let totalHoursNeeded = 0;

    // Calculate time for each item in the group
    for (const item of group.items) {
        // Add hours needed (parallel activities)
        const itemHoursNeeded = (item.hours_needed || 0) * item.count;
        totalHoursNeeded = Math.max(totalHoursNeeded, itemHoursNeeded);

        // Add hours to realize (sequential setup time)
        const itemHoursToRealize = (item.hours_to_realize || 0) * item.count;
        maxResourceTime = Math.max(maxResourceTime, itemHoursToRealize);

        // Handle nested groups recursively
        if (item.type === 'group' && item.data &&
            typeof item.data === 'object' &&
            'id' in item.data && 'name' in item.data && 'items' in item.data) {
            const nestedGroupTime = calculateTotalRealizationTime(item.data as ResourceGroup, 0);
            maxResourceTime = Math.max(maxResourceTime, nestedGroupTime * item.count);
        }
    }

    // Total time = travel time + setup time + operational time
    // Travel and setup can happen in parallel, so take the max
    // Operational time is added on top
    return Math.max(travelTime, maxResourceTime) + totalHoursNeeded;
}

export async function getLocationsWithOptimalResourceGroupPlacement(resourceGroups: ResourceGroup[]): Promise<LocationWithResourceCounts[]> {
    // Get the optimized analysis
    const optimizedAnalysis = await getLocationsWithResourceGroupCountsOptimized(resourceGroups);
    const locations = [...optimizedAnalysis.locations];

    // Place additional groups at optimal locations
    for (const groupOptimization of optimizedAnalysis.combinedOptimization) {
        if (groupOptimization.additionalPlacements.length > 0) {
            // Take the most efficient placement (first in sorted array)
            const bestPlacement = groupOptimization.additionalPlacements[0];

            // Find the target location and add the additional groups
            const targetLocation = locations.find(loc => loc.location.id === bestPlacement.targetLocationId);
            if (targetLocation) {
                // Find or create the resource group entry for this location
                let resourceGroupEntry = targetLocation.resourceGroups.find((rg: any) => rg.group.id === groupOptimization.group.id);

                if (resourceGroupEntry) {
                    // Update existing entry - calculate total realization time
                    resourceGroupEntry.count += bestPlacement.additionalGroupsAtLocation;
                    const totalRealizationTime = calculateTotalRealizationTime(
                        groupOptimization.group,
                        bestPlacement.maxTravelTimeHours
                    );
                    resourceGroupEntry.time_to_realize = totalRealizationTime;

                    // Add sources information for additional groups (optimized - aggregate duplicates)
                    if (!resourceGroupEntry.sources) {
                        resourceGroupEntry.sources = [];
                    }

                    // Aggregate local resource sources
                    const localSourceMap = new Map<number, any>();
                    for (const localSource of (bestPlacement as any).localResourceSources || []) {
                        const existing = localSourceMap.get(localSource.categoryId);
                        if (existing) {
                            existing.unitsTransferred += localSource.quantity;
                        } else {
                            localSourceMap.set(localSource.categoryId, {
                                categoryId: localSource.categoryId,
                                categoryName: localSource.categoryName,
                                sourceLocationId: bestPlacement.targetLocationId,
                                sourceLocationName: bestPlacement.targetLocationName,
                                unitsTransferred: localSource.quantity,
                                transportationTimeHours: 0,
                                distanceKm: 0,
                                count: bestPlacement.additionalGroupsAtLocation
                            });
                        }
                    }
                    resourceGroupEntry.sources.push(...localSourceMap.values());

                    // Aggregate transfer sources
                    const transferSourceMap = new Map<string, any>();
                    for (const transfer of bestPlacement.resourceTransfers) {
                        const key = `${transfer.categoryId}-${transfer.fromLocationId}`;
                        const existing = transferSourceMap.get(key);
                        if (existing) {
                            existing.unitsTransferred += transfer.quantity;
                        } else {
                            transferSourceMap.set(key, {
                                categoryId: transfer.categoryId,
                                categoryName: transfer.categoryName,
                                sourceLocationId: transfer.fromLocationId,
                                sourceLocationName: transfer.fromLocationName,
                                unitsTransferred: transfer.quantity,
                                transportationTimeHours: transfer.travelTimeHours,
                                distanceKm: transfer.distanceKm,
                                count: bestPlacement.additionalGroupsAtLocation
                            });
                        }
                    }
                    resourceGroupEntry.sources.push(...transferSourceMap.values());
                } else {
                    // Create new entry - calculate total realization time and sources
                    const totalRealizationTime = calculateTotalRealizationTime(
                        groupOptimization.group,
                        bestPlacement.maxTravelTimeHours
                    );

                    // Aggregate sources to avoid duplicates
                    const localSourceMap = new Map<number, any>();
                    for (const localSource of (bestPlacement as any).localResourceSources || []) {
                        localSourceMap.set(localSource.categoryId, {
                            categoryId: localSource.categoryId,
                            categoryName: localSource.categoryName,
                            sourceLocationId: bestPlacement.targetLocationId,
                            sourceLocationName: bestPlacement.targetLocationName,
                            unitsTransferred: localSource.quantity,
                            transportationTimeHours: 0,
                            distanceKm: 0,
                            count: bestPlacement.additionalGroupsAtLocation
                        });
                    }

                    const transferSourceMap = new Map<string, any>();
                    for (const transfer of bestPlacement.resourceTransfers) {
                        const key = `${transfer.categoryId}-${transfer.fromLocationId}`;
                        transferSourceMap.set(key, {
                            categoryId: transfer.categoryId,
                            categoryName: transfer.categoryName,
                            sourceLocationId: transfer.fromLocationId,
                            sourceLocationName: transfer.fromLocationName,
                            unitsTransferred: transfer.quantity,
                            transportationTimeHours: transfer.travelTimeHours,
                            distanceKm: transfer.distanceKm,
                            count: bestPlacement.additionalGroupsAtLocation
                        });
                    }

                    const sources = [...localSourceMap.values(), ...transferSourceMap.values()];

                    targetLocation.resourceGroups.push({
                        group: groupOptimization.group,
                        count: bestPlacement.additionalGroupsAtLocation,
                        time_to_realize: totalRealizationTime,
                        sources: sources
                    });
                }
            }
        }
    }

    // Calculate time_to_realize for all groups including existing ones
    for (const location of locations) {
        for (const resourceGroup of location.resourceGroups) {
            if (resourceGroup.time_to_realize === undefined) {
                // For existing groups, only consider internal realization time (no travel)
                resourceGroup.time_to_realize = calculateTotalRealizationTime(resourceGroup.group, 0);
            }
        }
    }

    // Calculate resource usage, transfers, and remaining units
    for (const location of locations) {
        // Track transfers from this location to others
        const transfersFromLocation: Record<number, number> = {};

        // Count transfers out
        for (const otherLocation of locations) {
            if (otherLocation.location.id === location.location.id) continue;

            for (const resourceGroup of otherLocation.resourceGroups) {
                if (resourceGroup.sources) {
                    for (const source of resourceGroup.sources) {
                        if (source.sourceLocationId === location.location.id) {
                            transfersFromLocation[source.categoryId] =
                                (transfersFromLocation[source.categoryId] || 0) + source.unitsTransferred;
                        }
                    }
                }
            }
        }

        // Calculate local usage and remaining for each resource
        for (const resource of location.resources) {
            let localUsage = 0;

            // Calculate local usage from resource groups at this location
            for (const resourceGroup of location.resourceGroups) {
                if (resourceGroup.sources) {
                    for (const source of resourceGroup.sources) {
                        if (source.sourceLocationId === location.location.id &&
                            source.categoryId === resource.categoryId) {
                            localUsage += source.unitsTransferred;
                        }
                    }
                }
            }

            const transferred = transfersFromLocation[resource.categoryId] || 0;
            const totalUsed = localUsage + transferred;

            resource.used = localUsage;
            resource.transferred = transferred;
            resource.remaining = Math.max(0, resource.count - totalUsed);
        }
    }

    return locations;
}

// Helper function to aggregate duplicate sources
function aggregateSources(sources: any[]): any[] {
    const aggregated = new Map<string, any>();

    for (const source of sources) {
        const key = `${source.categoryId}-${source.sourceLocationId}`;
        if (aggregated.has(key)) {
            const existing = aggregated.get(key)!;
            existing.unitsTransferred += source.unitsTransferred;
            existing.count = Math.max(existing.count, source.count);
        } else {
            aggregated.set(key, { ...source });
        }
    }

    return Array.from(aggregated.values());
}

// Helper function to create sources for a placement
function createSourcesForPlacement(placement: any): any[] {
    const sources = [];

    // Add local resource sources (aggregated)
    const localSources = new Map<number, any>();
    for (const localSource of (placement as any).localResourceSources || []) {
        if (localSources.has(localSource.categoryId)) {
            localSources.get(localSource.categoryId)!.unitsTransferred += localSource.quantity;
        } else {
            localSources.set(localSource.categoryId, {
                categoryId: localSource.categoryId,
                categoryName: localSource.categoryName,
                sourceLocationId: placement.targetLocationId,
                sourceLocationName: placement.targetLocationName,
                unitsTransferred: localSource.quantity,
                transportationTimeHours: 0,
                distanceKm: 0,
                count: placement.additionalGroupsAtLocation
            });
        }
    }
    sources.push(...localSources.values());

    // Add transfer sources (aggregated)
    const transferSources = new Map<string, any>();
    for (const transfer of placement.resourceTransfers) {
        const key = `${transfer.categoryId}-${transfer.fromLocationId}`;
        if (transferSources.has(key)) {
            transferSources.get(key)!.unitsTransferred += transfer.quantity;
        } else {
            transferSources.set(key, {
                categoryId: transfer.categoryId,
                categoryName: transfer.categoryName,
                sourceLocationId: transfer.fromLocationId,
                sourceLocationName: transfer.fromLocationName,
                unitsTransferred: transfer.quantity,
                transportationTimeHours: transfer.travelTimeHours,
                distanceKm: transfer.distanceKm,
                count: placement.additionalGroupsAtLocation
            });
        }
    }
    sources.push(...transferSources.values());

    return sources;
}

// Optimized resource usage calculation
function calculateResourceUsageOptimized(locations: any[]) {
    // Build transfer maps for efficient lookup
    const transfersFromLocation: Record<number, Record<number, number>> = {};

    for (const location of locations) {
        transfersFromLocation[location.location.id] = {};

        for (const otherLocation of locations) {
            if (otherLocation.location.id === location.location.id) continue;

            for (const resourceGroup of otherLocation.resourceGroups) {
                if (resourceGroup.sources) {
                    for (const source of resourceGroup.sources) {
                        if (source.sourceLocationId === location.location.id) {
                            const categoryId = source.categoryId;
                            transfersFromLocation[location.location.id][categoryId] =
                                (transfersFromLocation[location.location.id][categoryId] || 0) + source.unitsTransferred;
                        }
                    }
                }
            }
        }
    }

    // Calculate usage and remaining for each location
    for (const location of locations) {
        for (const resource of location.resources) {
            let localUsage = 0;

            // Calculate local usage
            for (const resourceGroup of location.resourceGroups) {
                if (resourceGroup.sources) {
                    for (const source of resourceGroup.sources) {
                        if (source.sourceLocationId === location.location.id &&
                            source.categoryId === resource.categoryId) {
                            localUsage += source.unitsTransferred;
                        }
                    }
                }
            }

            const transferred = transfersFromLocation[location.location.id][resource.categoryId] || 0;
            const totalUsed = localUsage + transferred;

            resource.used = localUsage;
            resource.transferred = transferred;
            resource.remaining = Math.max(0, resource.count - totalUsed);
        }
    }

    return locations;
}
