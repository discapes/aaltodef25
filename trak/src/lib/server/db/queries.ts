import { db } from './index';
import { resources, categories, locations, resourceCategories } from './schema';
import { count, like, ilike, eq, and, or } from 'drizzle-orm';

export async function getResourceCounts(query?: string) {
    // TODO
}
