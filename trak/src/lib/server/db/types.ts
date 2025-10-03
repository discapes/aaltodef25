
import { z } from 'zod';

// Category schemas
export const categoryInsertSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional()
});

export const categorySelectSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date()
});

export const categoryUpdateSchema = categoryInsertSchema.partial();

// Location schemas
export const locationInsertSchema = z.object({
    cityName: z.string().min(1).max(255)
});

export const locationSelectSchema = z.object({
    id: z.number(),
    cityName: z.string(),
    createdAt: z.date(),
    updatedAt: z.date()
});

export const locationUpdateSchema = locationInsertSchema.partial();

// Resource schemas
export const resourceInsertSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    locationId: z.number().int().positive(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
});

export const resourceSelectSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    locationId: z.number(),
    latitude: z.number(),
    longitude: z.number(),
    createdAt: z.date(),
    updatedAt: z.date()
});

export const resourceUpdateSchema = resourceInsertSchema.partial();

// Resource Categories junction table schemas
export const resourceCategoryInsertSchema = z.object({
    resourceId: z.number().int().positive(),
    categoryId: z.number().int().positive()
});

export const resourceCategorySelectSchema = z.object({
    id: z.number(),
    resourceId: z.number(),
    categoryId: z.number(),
    createdAt: z.date()
});

// Query and response schemas
export const resourceWithDetailsSchema = resourceSelectSchema.extend({
    location: locationSelectSchema,
    categories: z.array(categorySelectSchema)
});

export const resourceCountsResponseSchema = z.object({
    totalResources: z.number(),
    categoryCounts: z.array(z.object({
        categoryId: z.number(),
        categoryName: z.string(),
        resourceCount: z.number()
    })),
    locationCounts: z.array(z.object({
        locationId: z.number(),
        cityName: z.string(),
        resourceCount: z.number()
    })),
    query: z.string().nullable()
});

// API request schemas
export const searchQuerySchema = z.object({
    query: z.string().optional(),
    limit: z.number().int().positive().max(100).default(20),
    offset: z.number().int().min(0).default(0)
});

export const coordinatesSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
});

// Type exports
export type CategoryInsert = z.infer<typeof categoryInsertSchema>;
export type CategorySelect = z.infer<typeof categorySelectSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

export type LocationInsert = z.infer<typeof locationInsertSchema>;
export type LocationSelect = z.infer<typeof locationSelectSchema>;
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

export type ResourceInsert = z.infer<typeof resourceInsertSchema>;
export type ResourceSelect = z.infer<typeof resourceSelectSchema>;
export type ResourceUpdate = z.infer<typeof resourceUpdateSchema>;

export type ResourceCategoryInsert = z.infer<typeof resourceCategoryInsertSchema>;
export type ResourceCategorySelect = z.infer<typeof resourceCategorySelectSchema>;

export type ResourceWithDetails = z.infer<typeof resourceWithDetailsSchema>;
export type ResourceCountsResponse = z.infer<typeof resourceCountsResponseSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;