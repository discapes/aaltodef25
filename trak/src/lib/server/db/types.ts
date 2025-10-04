
import { z } from 'zod';

// Base resource schema
export const category = z.object({
    id: z.number(),
    name: z.string(),
});

// Base resource schema
export const location = z.object({
    id: z.number(),
    name: z.string(),
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
            data: z.any, // Recursive reference to resourceGroup
        })
    ]))
});

export const capability = z.object({
    categories: z.array(z.union(
        [
            z.string(),
        ]
    ))
});


// Capabilities API schemas
export const CapabilitiesRequestSchema = z.object({
  message: z.string(),
});

export const CapabilitiesResponseSchema = z.object({
  success: z.boolean(),
  response: capability,
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
        count: z.number().min(0),
        used: z.number().min(0).optional(), // How many of this category are used by resource groups
    })),
    resourceGroups: z.array(z.object({
        group: resourceGroup,
        count: z.number().min(0),
        time_to_realize: z.number().min(0).optional(), // Hours needed to realize this group (including travel time)
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
            data: z.any, // Recursive reference to createResourceGroupSchema
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