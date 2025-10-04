
import { z } from 'zod';

// Base resource schema
export const category = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
});

// Base resource schema
export const location = z.object({
    id: z.number(),
    name: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
});

// Resource group schema with recursive structure
export const resourceGroup = z.object({
    id: z.number(),
    name: z.string(),
    items: z.array(z.union([
        z.object({
            type: z.literal('resource'),
            count: z.number().int(),
            hours_needed: z.number().optional(),
            hours_to_realize: z.number().optional(),
            data: category,
        }),
        z.object({
            type: z.literal('group'),
            count: z.number().int().min(0),
            hours_needed: z.number().optional(),
            hours_to_realize: z.number().optional(),
            get data() {
                return resourceGroup
            }
        })
    ]))
});

export const capabilityResourceGroup = z.object({
    name: z.string(),
    description: z.string().optional(),
    items: z.array(z.object({
        type: z.literal('resource'),
        count: z.number().int().min(0),
        categoryName: z.string(), // Category name instead of full category object
        hours_needed: z.number().optional(), // Hours of operation/usage
        hours_to_realize: z.number().optional(), // Hours to deploy/setup
    }))
});

export const telegramMessage = z.object({
    message: z.string(),
})

export const newResource = z.object({
    name: z.string(),
    telegram: z.string(),
    categories: z.array(z.string())
})

export const capability = z.object({
    category_names: z.array(z.string()),
    resource_group_names: z.array(z.string()),
    new_categories: z.string()
});

// Capabilities API schemas
export const CapabilitiesRequestSchema = z.object({
    message: z.string(),
});

export const CapabilitiesResponseSchema = z.object({
    success: z.boolean(),
    response: capabilityResourceGroup,
    usage: z.object({
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
        total_tokens: z.number()
    }).optional()
});

export const CapabilitiesErrorSchema = z.object({
    error: z.string()
});

export type CapabilitiesRequest = z.infer<typeof CapabilitiesRequestSchema>;
export type CapabilitiesResponse = z.infer<typeof CapabilitiesResponseSchema>;
export type CapabilitiesError = z.infer<typeof CapabilitiesErrorSchema>;


// Base resource schema
export const locationWithResourceCounts = z.object({
    location: location,
    resources: z.array(z.object({
        categoryId: z.number(),
        categoryName: z.string(),
        count: z.number().min(0), // Total available units
        used: z.number().min(0).optional(), // How many of this category are used by resource groups
        remaining: z.number().min(0).optional(), // How many units remain after allocation
        transferred: z.number().min(0).optional(), // How many units were transferred to other locations
    })),
    resourceGroups: z.array(z.object({
        group: resourceGroup,
        count: z.number().min(0),
        time_to_realize: z.number().min(0).optional(), // Hours needed to realize this group (including travel time)
        sources: z.array(z.object({
            categoryId: z.number(),
            categoryName: z.string(),
            sourceLocationId: z.number(),
            sourceLocationName: z.string(),
            unitsTransferred: z.number().min(0), // Total units of this resource transferred
            transportationTimeHours: z.number().min(0),
            distanceKm: z.number().min(0),
            count: z.number().min(0) // Number of resource groups this source contributes to
        })).optional() // Sources for resource transfers
    })),
    categoryUsage: z.record(z.number(), z.number()).optional(), // Category ID to usage count mapping
});

// Form schema for creating new resource groups
export const createResourceGroupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    items: z.array(z.union([
        z.object({
            type: z.literal('resource'),
            count: z.number().int().min(0),
            data: z.object({
                id: z.number(),
                name: z.string(),
                description: z.string().nullable(),
            }),
        }),
        z.object({
            type: z.literal('group'),
            count: z.number().int().min(0),
            get data() {
                return createResourceGroupSchema
            }
        }),
        z.object({
            type: z.literal('existing-group'),
            count: z.number().int().min(0),
            data: z.object({
                id: z.number(),
                name: z.string(),
                description: z.string().optional(),
            }),
        })
    ]))
});

// Type exports
export const locationArray = z.array(locationWithResourceCounts);
export type LocationWithResourceCounts = z.infer<typeof locationWithResourceCounts>;
export type LocationArray = z.infer<typeof locationArray>;
export type ResourceGroup = z.infer<typeof resourceGroup>;
export type Category = z.infer<typeof category>;
export type Location = z.infer<typeof location>;
export type CreateResourceGroup = z.infer<typeof createResourceGroupSchema>;
export type NewResource = z.infer<typeof newResource>;