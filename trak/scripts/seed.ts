import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { categories, locations, resources, resourceCategories, resourceGroups, resourceGroupCategories } from '../src/lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';

// Get the database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// Create database connection using the same pattern as db/index.ts
const pool = new pg.Pool({
    connectionString: DATABASE_URL
});

const db = drizzle(pool, { schema });

// ========================================================================================
// DATA MODELS - Define complete data structures with relationships
// ========================================================================================

interface SeedCategory {
    name: string;
    description: string;
}

interface SeedLocation {
    cityName: string;
}

interface SeedResource {
    name: string;
    description: string;
    locationName: string; // Reference to location by name
    latitude: number;
    longitude: number;
    categoryNames: string[]; // References to categories by name
    setupTimeHours: number; // Time required to set up this resource before use
}

interface SeedResourceGroup {
    name: string;
    description: string;
    categoryNames: string[]; // References to categories by name
    setupTimeHours: number; // Additional setup time after all resources are assembled
}

// ========================================================================================
// SEED DATA DEFINITIONS
// ========================================================================================

// ========================================================================================
// SEED DATA DEFINITIONS
// ========================================================================================

const SEED_CATEGORIES: SeedCategory[] = [
    // Material categories
    { name: 'drone battery', description: 'Battery for drone operations' },
    { name: 'drone body', description: 'Main body/frame of a drone' },
    { name: 'laptop', description: 'Portable computer' },
    { name: 'tent', description: 'Portable shelter' },
    { name: 'controller', description: 'Remote control device for drones' },
    { name: 'laptop charger', description: 'Power adapter for laptops' },
    { name: 'food (1 day for 1 person)', description: 'Daily food ration for one person' },
    { name: 'water (1 liter)', description: 'One liter of drinking water' },
    { name: 'electricity source', description: 'Power generation equipment' },
    { name: 'first aid kit', description: 'Basic medical supplies for emergencies' },
    { name: 'medical kit', description: 'Advanced medical equipment and supplies' },
    { name: 'medical tools', description: 'Specialized medical instruments' },
    { name: 'ambulance', description: 'Emergency medical vehicle' },
    { name: 'car', description: 'Motor vehicle for transportation' },

    // People categories
    { name: 'driver', description: 'Person capable of operating vehicles' },
    { name: 'nurse', description: 'Healthcare professional' },
    { name: 'doctor', description: 'Medical doctor' },
    { name: 'hardware developer', description: 'Engineer specializing in hardware development' },
    { name: 'drone operator', description: 'Person trained to operate drones' },
    { name: 'software developer', description: 'Programmer and software engineer' },
    { name: 'person', description: 'General human resource' },
];

const SEED_LOCATIONS: SeedLocation[] = [
    { cityName: 'Helsinki' },
    { cityName: 'Espoo' },
    { cityName: 'Tampere' },
    { cityName: 'Vantaa' },
    { cityName: 'Oulu' },
    { cityName: 'Turku' },
    { cityName: 'Jyväskylä' },
    { cityName: 'Lahti' },
    { cityName: 'Kuopio' },
    { cityName: 'Pori' },
    { cityName: 'Joensuu' },
    { cityName: 'Lappeenranta' },
    { cityName: 'Hämeenlinna' },
    { cityName: 'Vaasa' },
    { cityName: 'Seinäjoki' },
    { cityName: 'Rovaniemi' },
];

// Location coordinates (actual Finnish cities) - realistic populations for individual people
const LOCATION_COORDS: Record<string, { lat: number; lon: number; population: number }> = {
    'Helsinki': { lat: 60.1699, lon: 24.9384, population: 350 },
    'Espoo': { lat: 60.2055, lon: 24.6559, population: 280 },
    'Tampere': { lat: 61.4991, lon: 23.7871, population: 240 },
    'Vantaa': { lat: 60.2934, lon: 25.0378, population: 220 },
    'Oulu': { lat: 65.0121, lon: 25.4651, population: 200 },
    'Turku': { lat: 60.4518, lon: 22.2666, population: 190 },
    'Jyväskylä': { lat: 62.2426, lon: 25.7473, population: 140 },
    'Lahti': { lat: 60.9827, lon: 25.6612, population: 120 },
    'Kuopio': { lat: 62.8924, lon: 27.6780, population: 120 },
    'Pori': { lat: 61.4851, lon: 21.7976, population: 85 },
    'Joensuu': { lat: 62.6010, lon: 29.7636, population: 80 },
    'Lappeenranta': { lat: 61.0587, lon: 28.1856, population: 75 },
    'Hämeenlinna': { lat: 60.9959, lon: 24.4641, population: 70 },
    'Vaasa': { lat: 63.0951, lon: 21.6165, population: 70 },
    'Seinäjoki': { lat: 62.7903, lon: 22.8404, population: 65 },
    'Rovaniemi': { lat: 66.5039, lon: 25.7294, population: 65 },
};

// Helper function to add variance to counts (±20% variation)
function addVariance(baseCount: number): number {
    const variance = 0.2; // 20% variance
    const min = Math.round(baseCount * (1 - variance));
    const max = Math.round(baseCount * (1 + variance));
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate random coordinates near a city
function randomCoordNear(baseLat: number, baseLon: number, radiusKm: number = 5): { lat: number; lon: number } {
    const earthRadius = 6371;
    const deltaLat = (Math.random() - 0.5) * 2 * (radiusKm / earthRadius) * (180 / Math.PI);
    const deltaLon = (Math.random() - 0.5) * 2 * (radiusKm / earthRadius) * (180 / Math.PI) / Math.cos(baseLat * Math.PI / 180);

    return {
        lat: Number((baseLat + deltaLat).toFixed(4)),
        lon: Number((baseLon + deltaLon).toFixed(4))
    };
}

// Generate material resources for each location
function generateMaterialResources(): SeedResource[] {
    const resources: SeedResource[] = [];

    Object.keys(LOCATION_COORDS).forEach(cityName => {
        const coords = LOCATION_COORDS[cityName];
        const baseCoord = { lat: coords.lat, lon: coords.lon };

        // Standard materials for each location - each resource is ONE UNIT (with variance)
        const baseMaterialCounts = {
            'drone battery': 100,
            'controller': 40,
            'laptop': 120,
            'car': 30,
            'drone body': 100,
            'electricity source': 30, // individual generators
            'medical kit': 150,
            'first aid kit': 200,
            'food (1 day for 1 person)': 300,
            'tent': 20,
            'laptop charger': 120, // one per laptop potentially
            'water (1 liter)': 500, // individual bottles
            'medical tools': 50, // individual tools
        };

        // Apply variance to material counts for this city
        const materialCounts: Record<string, number> = {};
        Object.entries(baseMaterialCounts).forEach(([key, baseCount]) => {
            materialCounts[key] = addVariance(baseCount);
        });

        // Ambulances (also cars) - individual vehicles with variance
        const ambulanceCount = addVariance(10);
        for (let i = 1; i <= ambulanceCount; i++) {
            const coord = randomCoordNear(baseCoord.lat, baseCoord.lon);
            resources.push({
                name: `Ambulance ${i} - ${cityName}`,
                description: `Emergency medical vehicle in ${cityName}`,
                locationName: cityName,
                latitude: coord.lat,
                longitude: coord.lon,
                categoryNames: ['ambulance', 'car'],
                setupTimeHours: 0.5
            });
        }

        // Other materials
        Object.entries(materialCounts).forEach(([categoryName, count]) => {
            for (let i = 1; i <= count; i++) {
                const coord = randomCoordNear(baseCoord.lat, baseCoord.lon);
                let setupTime = 0;

                // Set setup times based on material type
                if (categoryName === 'electricity source') setupTime = 2.0;
                else if (categoryName === 'medical kit') setupTime = 0.5;
                else if (categoryName === 'tent') setupTime = 1.0;
                else if (categoryName === 'laptop') setupTime = 0.25;
                else if (categoryName === 'drone body') setupTime = 0.5;
                else setupTime = 0.1;

                resources.push({
                    name: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} ${i} - ${cityName}`,
                    description: `${categoryName} located in ${cityName}`,
                    locationName: cityName,
                    latitude: coord.lat,
                    longitude: coord.lon,
                    categoryNames: [categoryName],
                    setupTimeHours: setupTime
                });
            }
        });
    });

    // Special factories
    // Battery factory in Turku
    const turkuCoords = LOCATION_COORDS['Turku'];
    const turkuCoord = randomCoordNear(turkuCoords.lat, turkuCoords.lon);
    resources.push({
        name: 'Battery Factory - Turku',
        description: 'Large-scale battery manufacturing facility',
        locationName: 'Turku',
        latitude: turkuCoord.lat,
        longitude: turkuCoord.lon,
        categoryNames: ['drone battery'],
        setupTimeHours: 240 // 10 days
    });

    // Drone body factory in Kuopio
    const kuopioCoords = LOCATION_COORDS['Kuopio'];
    const kuopioCoord = randomCoordNear(kuopioCoords.lat, kuopioCoords.lon);
    resources.push({
        name: 'Drone Body Factory - Kuopio',
        description: 'Drone manufacturing facility',
        locationName: 'Kuopio',
        latitude: kuopioCoord.lat,
        longitude: kuopioCoord.lon,
        categoryNames: ['drone body'],
        setupTimeHours: 168 // 1 week
    });

    return resources;
}

// Generate people resources for each location
function generatePeopleResources(): SeedResource[] {
    const resources: SeedResource[] = [];
    const firstNames = ['Aino', 'Eino', 'Maija', 'Paavo', 'Liisa', 'Mikko', 'Anna', 'Juha', 'Sari', 'Matti', 'Hanna', 'Pekka', 'Mari', 'Jari', 'Elina', 'Heikki', 'Kaisa', 'Timo', 'Pirjo', 'Kari'];
    const lastNames = ['Virtanen', 'Korhonen', 'Nieminen', 'Mäkinen', 'Hämäläinen', 'Laine', 'Heikkinen', 'Koskinen', 'Järvinen', 'Lehtonen', 'Saarinen', 'Salminen', 'Heinonen', 'Niemi', 'Hakkarainen', 'Mattila', 'Turunen', 'Laitinen', 'Rantala', 'Kallio'];

    Object.keys(LOCATION_COORDS).forEach(cityName => {
        const coords = LOCATION_COORDS[cityName];
        const baseCoord = { lat: coords.lat, lon: coords.lon };
        // Add variance to population count for this city
        const populationCount = addVariance(coords.population);

        for (let i = 1; i <= populationCount; i++) {
            const coord = randomCoordNear(baseCoord.lat, baseCoord.lon);
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

            const categories: string[] = ['person']; // 100% are persons

            // 90% are drivers
            if (Math.random() < 0.9) categories.push('driver');

            // 50% are drone operators
            if (Math.random() < 0.5) categories.push('drone operator');

            // 20% are nurses
            if (Math.random() < 0.2) categories.push('nurse');

            // 20% are software developers
            if (Math.random() < 0.2) categories.push('software developer');

            // 15% are hardware developers
            if (Math.random() < 0.15) categories.push('hardware developer');

            // 2% are doctors
            if (Math.random() < 0.02) categories.push('doctor');

            resources.push({
                name: `${firstName} ${lastName}`,
                description: `Resident of ${cityName}`,
                locationName: cityName,
                latitude: coord.lat,
                longitude: coord.lon,
                categoryNames: categories,
                setupTimeHours: 0
            });
        }
    });

    return resources;
}

const SEED_RESOURCES: SeedResource[] = [
    ...generateMaterialResources(),
    ...generatePeopleResources()
];

const SEED_RESOURCE_GROUPS: SeedResourceGroup[] = [
    {
        name: 'Basic Drone Operation Unit',
        description: 'Essential components for basic drone operations',
        categoryNames: ['drone body', 'drone battery', 'controller', 'drone operator'],
        setupTimeHours: 1.0
    },
    {
        name: 'Extended Drone Operation Unit',
        description: 'Enhanced drone operations with support equipment',
        categoryNames: ['drone body', 'drone battery', 'controller', 'drone operator', 'laptop', 'laptop charger'],
        setupTimeHours: 1.5
    },
    {
        name: 'Medical Emergency Response Team',
        description: 'Complete medical emergency response capability',
        categoryNames: ['doctor', 'nurse', 'driver', 'ambulance', 'medical kit', 'first aid kit'],
        setupTimeHours: 0.5
    },
    {
        name: 'Field Hospital Unit',
        description: 'Mobile medical facility with comprehensive care',
        categoryNames: ['doctor', 'nurse', 'medical tools', 'medical kit', 'electricity source', 'tent'],
        setupTimeHours: 4.0
    },
    {
        name: 'Mobile Command Center',
        description: 'Coordination and communication hub',
        categoryNames: ['software developer', 'hardware developer', 'laptop', 'electricity source', 'tent'],
        setupTimeHours: 2.0
    },
    {
        name: 'Emergency Supply Distribution',
        description: 'Food and water distribution capability',
        categoryNames: ['driver', 'car', 'food (1 day for 1 person)', 'water (1 liter)', 'person'],
        setupTimeHours: 1.0
    },
    {
        name: 'Reconnaissance Drone Squadron',
        description: 'Multi-drone surveillance and reconnaissance',
        categoryNames: ['drone body', 'drone battery', 'controller', 'drone operator', 'laptop'],
        setupTimeHours: 2.0
    },
    {
        name: 'Mobile Tech Support Unit',
        description: 'Technical support and equipment maintenance',
        categoryNames: ['hardware developer', 'software developer', 'laptop', 'laptop charger', 'car'],
        setupTimeHours: 1.0
    }
];

// ========================================================================================
// ROBUST SEEDING FUNCTIONS
// ========================================================================================

async function clearAllData() {
    console.log('🧹 Clearing all existing data...');

    // Get all existing resource IDs
    const allResources = await db.select().from(resources);
    const allResourceIds = allResources.map(r => r.id);

    // Delete all resource-category relationships
    if (allResourceIds.length > 0) {
        await db.delete(resourceCategories).where(inArray(resourceCategories.resourceId, allResourceIds));
    }

    // Delete all resources
    await db.delete(resources);

    // Get all existing resource group IDs
    const allResourceGroups = await db.select().from(resourceGroups);
    const allResourceGroupIds = allResourceGroups.map(rg => rg.id);

    // Delete all resource group-category relationships
    if (allResourceGroupIds.length > 0) {
        await db.delete(resourceGroupCategories).where(inArray(resourceGroupCategories.resourceGroupId, allResourceGroupIds));
    }

    // Delete all resource groups
    await db.delete(resourceGroups);

    // Delete all categories and locations
    await db.delete(categories);
    await db.delete(locations);
}

async function seedDatabaseRobust() {
    console.log('🌱 Starting robust database seeding...');

    // Use a database transaction to ensure atomicity
    return await db.transaction(async (tx) => {
        // Clear all existing data first
        await clearAllData();

        console.log('📂 Inserting categories...');
        const insertedCategories = await tx.insert(categories).values(SEED_CATEGORIES).returning();

        // Create name-to-id mapping for categories
        const categoryMap = new Map<string, number>();
        insertedCategories.forEach(cat => categoryMap.set(cat.name, cat.id));

        console.log('📍 Inserting locations...');
        const insertedLocations = await tx.insert(locations).values(SEED_LOCATIONS).returning();

        // Create name-to-id mapping for locations
        const locationMap = new Map<string, number>();
        insertedLocations.forEach(loc => locationMap.set(loc.cityName, loc.id));

        console.log('👥 Inserting resources with relationships...');
        const resourcesWithLocationIds = SEED_RESOURCES.map(resource => {
            const locationId = locationMap.get(resource.locationName);
            if (!locationId) {
                throw new Error(`Location not found: ${resource.locationName}`);
            }
            return {
                name: resource.name,
                description: resource.description,
                locationId,
                latitude: resource.latitude,
                longitude: resource.longitude,
                setupTimeHours: resource.setupTimeHours
            };
        });

        // Insert resources in batches to avoid stack overflow
        const batchSize = 1000;
        type InsertedResource = {
            id: number;
            name: string;
            description: string | null;
            locationId: number;
            latitude: number;
            longitude: number;
            setupTimeHours: number;
            createdAt: Date | null;
            updatedAt: Date | null;
        };
        const insertedResources: InsertedResource[] = [];

        for (let i = 0; i < resourcesWithLocationIds.length; i += batchSize) {
            const batch = resourcesWithLocationIds.slice(i, i + batchSize);
            const batchResult = await tx.insert(resources).values(batch).returning();
            insertedResources.push(...batchResult);
            console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(resourcesWithLocationIds.length / batchSize)} (${batchResult.length} resources)`);
        }

        console.log('🔗 Creating resource-category relationships...');
        const resourceCategoryData: { resourceId: number; categoryId: number }[] = [];

        for (let i = 0; i < insertedResources.length; i++) {
            const resource = insertedResources[i];
            const seedResource = SEED_RESOURCES[i];

            for (const categoryName of seedResource.categoryNames) {
                const categoryId = categoryMap.get(categoryName);
                if (!categoryId) {
                    throw new Error(`Category not found: ${categoryName}`);
                }
                resourceCategoryData.push({
                    resourceId: resource.id,
                    categoryId
                });
            }
        }

        if (resourceCategoryData.length > 0) {
            // Insert resource-category relationships in batches
            const batchSize = 1000;
            for (let i = 0; i < resourceCategoryData.length; i += batchSize) {
                const batch = resourceCategoryData.slice(i, i + batchSize);
                await tx.insert(resourceCategories).values(batch);
                console.log(`   Inserted resource-category batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(resourceCategoryData.length / batchSize)} (${batch.length} relationships)`);
            }
        }

        console.log('🏢 Inserting resource groups...');
        const resourceGroupsData = SEED_RESOURCE_GROUPS.map(rg => ({
            name: rg.name,
            description: rg.description,
            setupTimeHours: rg.setupTimeHours
        }));

        const insertedResourceGroups = await tx.insert(resourceGroups).values(resourceGroupsData).returning();

        console.log('🔗 Creating resource group-category relationships...');
        const resourceGroupCategoryData: { resourceGroupId: number; categoryId: number }[] = [];

        for (let i = 0; i < insertedResourceGroups.length; i++) {
            const resourceGroup = insertedResourceGroups[i];
            const seedResourceGroup = SEED_RESOURCE_GROUPS[i];

            for (const categoryName of seedResourceGroup.categoryNames) {
                const categoryId = categoryMap.get(categoryName);
                if (!categoryId) {
                    throw new Error(`Category not found: ${categoryName} for resource group: ${seedResourceGroup.name}`);
                }
                resourceGroupCategoryData.push({
                    resourceGroupId: resourceGroup.id,
                    categoryId
                });
            }
        }

        if (resourceGroupCategoryData.length > 0) {
            await tx.insert(resourceGroupCategories).values(resourceGroupCategoryData);
        }

        // Return statistics
        return {
            categories: insertedCategories.length,
            locations: insertedLocations.length,
            resources: insertedResources.length,
            resourceCategoryRelations: resourceCategoryData.length,
            resourceGroups: insertedResourceGroups.length,
            resourceGroupCategoryRelations: resourceGroupCategoryData.length
        };
    });
}

// ========================================================================================
// MAIN EXECUTION
// ========================================================================================

// Run the seeding function
seedDatabaseRobust()
    .then((stats) => {
        console.log('✅ Database seeding completed successfully!');
        console.log(`📊 Seeding Statistics:`);
        console.log(`   - ${stats.categories} categories`);
        console.log(`   - ${stats.locations} locations`);
        console.log(`   - ${stats.resources} resources`);
        console.log(`   - ${stats.resourceCategoryRelations} resource-category relationships`);
        console.log(`   - ${stats.resourceGroups} resource groups`);
        console.log(`   - ${stats.resourceGroupCategoryRelations} resource group-category relationships`);
        console.log('🎉 Seeding process completed!');
        return pool.end();
    })
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Seeding process failed:', error);
        console.error('🔄 Transaction was automatically rolled back');
        pool.end().finally(() => {
            process.exit(1);
        });
    });
