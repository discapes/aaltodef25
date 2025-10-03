
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
            data: category,
        }),
        z.object({
            type: z.literal('group'),
            count: z.number().int().min(0),
            data: z.any, // Recursive reference to resourceGroup
        })
    ]))
});

// Base resource schema
export const locationWithResourceCounts = z.object({
    location: location,
    resources: z.array(z.object({
        categoryId: z.number(),
        categoryName: z.string(),
        count: z.number().min(0)
    })),
    resourceGroups: z.array(z.object({
        group: resourceGroup,
        count: z.number().min(0),
    })),
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
