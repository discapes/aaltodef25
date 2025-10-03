import { db } from './index';
import { resources, resourceCategories, categories } from './schema';
import { count, eq } from 'drizzle-orm';

export async function getResourceCounts(categoryId: number) {
    return db
        .select({
            count: count(resources.id)
        })
        .from(resources)
        .innerJoin(resourceCategories, eq(resources.id, resourceCategories.resourceId))
        .where(eq(resourceCategories.categoryId, categoryId))
        .execute();
}

export async function getAllCategories() {
    return db
        .select()
        .from(categories)
        .execute();
}

export async function getAllResources() {
    return db
    .select()
    .from(resources).execute()
}


export async function getAllResourceGroups() {
    // TODO: Implement when resource groups table is created
    // For now, return mock data for development
    return [
        { id: 1, name: 'Emergency Response Kit', description: 'Standard emergency response equipment' },
        { id: 2, name: 'Medical Supplies', description: 'Basic medical equipment and supplies' },
        { id: 3, name: 'Communication Equipment', description: 'Radios, phones, and communication gear' }
    ];
}
