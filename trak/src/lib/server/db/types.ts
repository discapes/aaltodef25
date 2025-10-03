
import { z } from 'zod';

// Resource schema with joined location and categories
export const resourceSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    latitude: z.number(),
    longitude: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
    location: z.object({
        id: z.number(),
        cityName: z.string(),
        createdAt: z.date(),
        updatedAt: z.date()
    }),
    categories: z.array(z.object({
        id: z.number(),
        name: z.string(),
        description: z.string().nullable(),
        createdAt: z.date(),
        updatedAt: z.date()
    }))
});

// Type export
export type Resource = z.infer<typeof resourceSchema>;
