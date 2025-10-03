
import { z } from 'zod';

// Base resource schema
export const category = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// Base resource schema
export const location = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// Resource group schema with recursive structure
export const resourceGroup = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
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
export const locationCounts = z.object({
    locations: z.array(z.object({
        location: location,
        resources: z.array(z.object({
            categoryId: z.number(),
            categoryName: z.string(),
            count: z.number().min(0)
        })),
        resourceGroups: z.array(z.object({
            categoryId: z.number(),
            categoryName: z.string(),
            count: z.number().min(0),
            data: resourceGroup,
        })),
    })),
});

// Type exports
export type LocationCounts = z.infer<typeof locationCounts>;
export type ResourceGroup = z.infer<typeof resourceGroup>;
export type Category = z.infer<typeof category>;
export type Location = z.infer<typeof location>;
