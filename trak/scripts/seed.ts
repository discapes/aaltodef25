import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { categories, locations, resources, resourceCategories, resourceGroups, resourceGroupCategories } from '../src/lib/server/db/schema';
import { like, inArray } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import { env } from 'node:process';


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

async function seedDatabase() {
    console.log('🌱 Starting database seeding...');

    try {
        // Clear existing mock data (keep real data)
        console.log('🧹 Clearing existing mock data...');

        // First, find all mock resources to get their IDs
        const mockResources = await db.select().from(resources).where(like(resources.name, 'mock_%'));
        const mockResourceIds = mockResources.map(r => r.id);

        // Delete resource-category relationships for mock resources
        if (mockResourceIds.length > 0) {
            await db.delete(resourceCategories).where(inArray(resourceCategories.resourceId, mockResourceIds));
        }

        // Delete mock resources
        await db.delete(resources).where(like(resources.name, 'mock_%'));

        // Delete mock resource groups and their relationships
        const mockResourceGroups = await db.select().from(resourceGroups).where(like(resourceGroups.name, 'mock_%'));
        const mockResourceGroupIds = mockResourceGroups.map(rg => rg.id);

        // Delete resource group-category relationships for mock resource groups
        if (mockResourceGroupIds.length > 0) {
            await db.delete(resourceGroupCategories).where(inArray(resourceGroupCategories.resourceGroupId, mockResourceGroupIds));
        }

        // Delete mock resource groups
        await db.delete(resourceGroups).where(like(resourceGroups.name, 'mock_%'));

        // Delete mock categories and locations
        await db.delete(categories).where(like(categories.name, 'mock_%'));
        await db.delete(locations).where(like(locations.cityName, 'mock_%'));

        // Insert categories (skills, abilities, and tools)
        console.log('📂 Inserting categories...');
        const insertedCategories = await db.insert(categories).values([
            // Technical Skills
            { name: 'mock_Web Development', description: 'Frontend and backend web development skills' },
            { name: 'mock_Embedded Systems', description: 'Embedded hardware and software development' },
            { name: 'mock_Network Administration', description: 'Computer network setup and maintenance' },
            { name: 'mock_Database Management', description: 'Database design, administration and optimization' },

            // Medical Skills
            { name: 'mock_First Aid', description: 'Basic emergency medical care and treatment' },
            { name: 'mock_Nursing', description: 'Professional nursing and patient care' },
            { name: 'mock_Surgery', description: 'Surgical procedures and medical operations' },
            { name: 'mock_Emergency Medicine', description: 'Emergency medical response and trauma care' },

            // Manual Tools
            { name: 'mock_Hammer', description: 'Basic construction and repair tool' },
            { name: 'mock_Shovel', description: 'Digging and earth moving tool' },
            { name: 'mock_Wrench Set', description: 'Mechanical repair and assembly tools' },
            { name: 'mock_Chainsaw', description: 'Power tool for cutting wood and debris' },

            // Resources/Supplies
            { name: 'mock_Fuel (1L)', description: 'One liter of gasoline or diesel fuel' },
            { name: 'mock_Medical Supplies', description: 'Basic medical equipment and supplies' },
            { name: 'mock_Food Rations', description: 'Emergency food supplies for one person/day' },
            { name: 'mock_Communication Radio', description: 'Two-way radio communication device' },

            { name: 'mock_Water Supply', description: 'Fresh water supply' },

        ]).returning();

        // Insert locations
        console.log('📍 Inserting locations...');
        const insertedLocations = await db.insert(locations).values([
            { cityName: 'mock_Helsinki' },
            { cityName: 'mock_Tampere' },
            { cityName: 'mock_Turku' },
            { cityName: 'mock_Oulu' },
            { cityName: 'mock_Jyväskylä' },
            { cityName: 'mock_Lahti' },
            { cityName: 'mock_Kuopio' },
            { cityName: 'mock_Pori' },
        ]).returning();

        // Insert resources (people and equipment)
        console.log('👥 Inserting resources...');
        const resourcesData = [
            // Helsinki resources
            { name: 'mock_John Smith', description: 'Senior web developer with 8 years experience', locationId: insertedLocations[0].id, latitude: 60.1699, longitude: 24.9384 },
            { name: 'mock_Maria Virtanen', description: 'Registered nurse specializing in emergency care', locationId: insertedLocations[0].id, latitude: 60.1881, longitude: 24.9200 },
            { name: 'mock_Ahmed Hassan', description: 'Embedded systems engineer', locationId: insertedLocations[0].id, latitude: 60.1756, longitude: 24.9342 },
            { name: 'mock_Emergency Toolkit A', description: 'Complete emergency response toolkit', locationId: insertedLocations[0].id, latitude: 60.1612, longitude: 24.9521 },
            { name: 'mock_Medical Station 1', description: 'Mobile medical equipment station', locationId: insertedLocations[0].id, latitude: 60.1695, longitude: 24.9354 },
            { name: 'mock_Dr. Sarah Johnson', description: 'Emergency medicine physician', locationId: insertedLocations[0].id, latitude: 60.1733, longitude: 24.9417 },
            { name: 'mock_Freshwater well', description: 'Fresh water well', locationId: insertedLocations[0].id, latitude: 60.1833, longitude: 24.9517 },

            // Tampere resources
            { name: 'mock_Mikko Korhonen', description: 'Network administrator and IT specialist', locationId: insertedLocations[1].id, latitude: 61.4991, longitude: 23.7871 },
            { name: 'mock_Anna Lindberg', description: 'Database administrator with medical data experience', locationId: insertedLocations[1].id, latitude: 61.4981, longitude: 23.7619 },
            { name: 'mock_Construction Team A', description: 'Team with construction tools and equipment', locationId: insertedLocations[1].id, latitude: 61.4978, longitude: 23.7610 },
            { name: 'mock_Fuel Depot 1', description: 'Emergency fuel storage (500L capacity)', locationId: insertedLocations[1].id, latitude: 61.4985, longitude: 23.7604 },
            { name: 'mock_Food Distribution Point', description: 'Emergency food supplies station', locationId: insertedLocations[1].id, latitude: 61.4953, longitude: 23.7582 },

            // Turku resources
            { name: 'mock_Surgeon Team', description: 'Surgical team with mobile equipment', locationId: insertedLocations[2].id, latitude: 60.4518, longitude: 22.2666 },
            { name: 'mock_Paramedic Unit', description: 'Emergency medical response team', locationId: insertedLocations[2].id, latitude: 60.4515, longitude: 22.2581 },
            { name: 'mock_Heavy Equipment Operator', description: 'Operator with chainsaw and heavy tools', locationId: insertedLocations[2].id, latitude: 60.4489, longitude: 22.2555 },
            { name: 'mock_Communication Hub', description: 'Radio communication equipment and operator', locationId: insertedLocations[2].id, latitude: 60.4495, longitude: 22.2638 },

            // Oulu resources
            { name: 'mock_Emergency Response Coordinator', description: 'Coordinator with first aid certification', locationId: insertedLocations[3].id, latitude: 65.0121, longitude: 25.4651 },
            { name: 'mock_IT Support Team', description: 'Technical support team with equipment', locationId: insertedLocations[3].id, latitude: 65.0141, longitude: 25.4689 },
            { name: 'mock_Mobile Medical Unit', description: 'Vehicle with medical supplies and equipment', locationId: insertedLocations[3].id, latitude: 65.0134, longitude: 25.4712 },

            // Other cities with fewer resources
            { name: 'mock_Nurse Practitioner', description: 'Advanced practice nurse', locationId: insertedLocations[4].id, latitude: 62.2426, longitude: 25.7473 },
            { name: 'mock_Maintenance Technician', description: 'General maintenance with tool kit', locationId: insertedLocations[5].id, latitude: 60.9827, longitude: 25.6612 },
            { name: 'mock_Emergency Supplies Cache', description: 'Emergency supply storage point', locationId: insertedLocations[6].id, latitude: 62.8924, longitude: 27.6780 },
            { name: 'mock_Volunteer Coordinator', description: 'First aid trained volunteer coordinator', locationId: insertedLocations[7].id, latitude: 61.4851, longitude: 21.7976 },

            // Additional Helsinki resources
            { name: 'mock_Senior Web Developer Lisa Chen', description: 'Full-stack web developer', locationId: insertedLocations[0].id, latitude: 60.1702, longitude: 24.9388 },
            { name: 'mock_Embedded Engineer Petri Salo', description: 'IoT and embedded systems specialist', locationId: insertedLocations[0].id, latitude: 60.1756, longitude: 24.9350 },
            { name: 'mock_Network Engineer Sasha Volkov', description: 'Network infrastructure specialist', locationId: insertedLocations[0].id, latitude: 60.1720, longitude: 24.9365 },
            { name: 'mock_Database Architect Emma Wilson', description: 'Senior database administrator', locationId: insertedLocations[0].id, latitude: 60.1680, longitude: 24.9340 },
            { name: 'mock_First Aid Instructor Matti Virtanen', description: 'Certified first aid trainer', locationId: insertedLocations[0].id, latitude: 60.1715, longitude: 24.9395 },
            { name: 'mock_Head Nurse Kristiina Laakso', description: 'Senior nursing supervisor', locationId: insertedLocations[0].id, latitude: 60.1685, longitude: 24.9375 },

            // Additional Tampere resources  
            { name: 'mock_Web Developer Tommi Hakkarainen', description: 'Frontend specialist', locationId: insertedLocations[1].id, latitude: 61.4995, longitude: 23.7875 },
            { name: 'mock_Systems Administrator Aino Koskinen', description: 'Linux systems specialist', locationId: insertedLocations[1].id, latitude: 61.4985, longitude: 23.7625 },
            { name: 'mock_Emergency Nurse Elina Mattila', description: 'Trauma care specialist', locationId: insertedLocations[1].id, latitude: 61.4975, longitude: 23.7615 },
            { name: 'mock_First Aid Responder Jari Nieminen', description: 'Volunteer emergency responder', locationId: insertedLocations[1].id, latitude: 61.4970, longitude: 23.7605 },

            // Additional Turku resources
            { name: 'mock_DevOps Engineer Sampo Rautiainen', description: 'Network and deployment specialist', locationId: insertedLocations[2].id, latitude: 60.4522, longitude: 22.2670 },
            { name: 'mock_Database Developer Mari Huhtala', description: 'Database optimization expert', locationId: insertedLocations[2].id, latitude: 60.4520, longitude: 22.2585 },
            { name: 'mock_Emergency Physician Dr. Kari Mäkelä', description: 'Emergency department doctor', locationId: insertedLocations[2].id, latitude: 60.4493, longitude: 22.2559 },
            { name: 'mock_Paramedic Supervisor Anna-Liisa Kero', description: 'Senior paramedic', locationId: insertedLocations[2].id, latitude: 60.4499, longitude: 22.2642 },

            // Additional Oulu resources
            { name: 'mock_Full-Stack Developer Ville Karhu', description: 'Web and mobile developer', locationId: insertedLocations[3].id, latitude: 65.0125, longitude: 25.4655 },
            { name: 'mock_Network Technician Hanna Järvinen', description: 'Network maintenance specialist', locationId: insertedLocations[3].id, latitude: 65.0145, longitude: 25.4693 },
            { name: 'mock_Critical Care Nurse Tuula Rantala', description: 'ICU nursing specialist', locationId: insertedLocations[3].id, latitude: 65.0138, longitude: 25.4716 },

            // Additional resources in other cities
            { name: 'mock_Software Engineer Aleksi Heikkilä', description: 'Backend developer', locationId: insertedLocations[4].id, latitude: 62.2430, longitude: 25.7477 },
            { name: 'mock_Network Admin Paula Saarinen', description: 'IT infrastructure manager', locationId: insertedLocations[4].id, latitude: 62.2422, longitude: 25.7469 },
            { name: 'mock_Emergency Nurse Coordinator Leena Koivisto', description: 'Nursing team leader', locationId: insertedLocations[5].id, latitude: 60.9831, longitude: 25.6616 },
            { name: 'mock_First Aid Trainer Jukka Laine', description: 'Safety training specialist', locationId: insertedLocations[5].id, latitude: 60.9823, longitude: 25.6608 },
            { name: 'mock_Database Specialist Riikka Ojala', description: 'Data management expert', locationId: insertedLocations[6].id, latitude: 62.8928, longitude: 27.6784 },
            { name: 'mock_Web Developer Antti Kallio', description: 'E-commerce developer', locationId: insertedLocations[6].id, latitude: 62.8920, longitude: 27.6776 },
            { name: 'mock_Emergency Coordinator Päivi Aho', description: 'Crisis management specialist', locationId: insertedLocations[7].id, latitude: 61.4855, longitude: 21.7980 },
            { name: 'mock_Senior Nurse Marko Lindström', description: 'Clinical nurse specialist', locationId: insertedLocations[7].id, latitude: 61.4847, longitude: 21.7972 },
        ];

        const insertedResources = await db.insert(resources).values(resourcesData).returning();

        // Create resource-category relationships
        console.log('🔗 Creating resource-category relationships...');
        const resourceCategoryData: { resourceId: number; categoryId: number }[] = [];

        // Helper function to find category by name
        const findCategory = (name: string): number | undefined =>
            insertedCategories.find(cat => cat.name === name)?.id;

        // Assign skills and tools to resources
        for (const resource of insertedResources) {
            // Technical Skills
            if (resource.name.toLowerCase().includes('web developer') || resource.name.toLowerCase().includes('john smith')) {
                const categoryId = findCategory('mock_Web Development');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('embedded') || resource.name.toLowerCase().includes('ahmed hassan')) {
                const categoryId = findCategory('mock_Embedded Systems');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('network') || resource.name.toLowerCase().includes('mikko korhonen') || resource.name.toLowerCase().includes('it support')) {
                const categoryId = findCategory('mock_Network Administration');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('database') || resource.name.toLowerCase().includes('anna lindberg')) {
                const categoryId = findCategory('mock_Database Management');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }

            // Medical Skills
            if (resource.name.toLowerCase().includes('first aid') || resource.name.toLowerCase().includes('coordinator')) {
                const categoryId = findCategory('mock_First Aid');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('nurse') || resource.name.toLowerCase().includes('maria virtanen')) {
                const categoryId = findCategory('mock_Nursing');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('surgeon') || resource.name.toLowerCase().includes('surgery')) {
                const categoryId = findCategory('mock_Surgery');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('emergency medicine') || resource.name.toLowerCase().includes('dr.') || resource.name.toLowerCase().includes('paramedic')) {
                const categoryId = findCategory('mock_Emergency Medicine');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }

            // Tools and Equipment
            if (resource.name.toLowerCase().includes('toolkit') || resource.name.toLowerCase().includes('construction') || resource.name.toLowerCase().includes('maintenance')) {
                const categoryId = findCategory('mock_Hammer');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
                const shovelId = findCategory('mock_Shovel');
                if (shovelId) resourceCategoryData.push({ resourceId: resource.id, categoryId: shovelId });
                const wrenchId = findCategory('mock_Wrench Set');
                if (wrenchId) resourceCategoryData.push({ resourceId: resource.id, categoryId: wrenchId });
            }
            if (resource.name.toLowerCase().includes('heavy equipment') || resource.name.toLowerCase().includes('chainsaw')) {
                const categoryId = findCategory('mock_Chainsaw');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }

            // Resources and Supplies
            if (resource.name.toLowerCase().includes('fuel')) {
                const categoryId = findCategory('mock_Fuel (1L)');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('medical') && (resource.name.toLowerCase().includes('station') || resource.name.toLowerCase().includes('unit') || resource.name.toLowerCase().includes('supplies'))) {
                const categoryId = findCategory('mock_Medical Supplies');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('food')) {
                const categoryId = findCategory('mock_Food Rations');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('communication')) {
                const categoryId = findCategory('mock_Communication Radio');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
            if (resource.name.toLowerCase().includes('water')) {
                const categoryId = findCategory('mock_Water Supply');
                if (categoryId) resourceCategoryData.push({ resourceId: resource.id, categoryId });
            }
        }

        await db.insert(resourceCategories).values(resourceCategoryData);

        // Insert resource groups
        console.log('🏢 Inserting resource groups...');
        const insertedResourceGroups = await db.insert(resourceGroups).values([
            { name: 'mock_Medical Emergency Response Unit', description: 'Complete medical emergency response capability including personnel and equipment' },
            { name: 'mock_Firefighting Force', description: 'Fire suppression and rescue operations team with equipment' },
            { name: 'mock_IT Support Center', description: 'Technical support and infrastructure maintenance team' },
            { name: 'mock_Field Hospital', description: 'Mobile medical facility with surgical capabilities' },
            { name: 'mock_Emergency Communications Hub', description: 'Communication coordination center with radio equipment' },
            { name: 'mock_Construction and Repair Team', description: 'Infrastructure repair and construction capabilities' },
            { name: 'mock_Emergency Supply Distribution', description: 'Food, water, and essential supplies distribution network' },
            { name: 'mock_Search and Rescue Team', description: 'Personnel search, rescue, and recovery operations' },
            { name: 'mock_Database and Information Systems', description: 'Data management and information systems support' },
            { name: 'mock_Mobile Command Center', description: 'Coordination and command capabilities for emergency response' }
        ]).returning();

        // Create resource group - category relationships
        console.log('🔗 Creating resource group-category relationships...');
        const resourceGroupCategoryData: { resourceGroupId: number; categoryId: number }[] = [];

        // Medical Emergency Response Unit
        const medicalUnitId = insertedResourceGroups.find(rg => rg.name === 'mock_Medical Emergency Response Unit')?.id;
        if (medicalUnitId) {
            const firstAidId = findCategory('mock_First Aid');
            const nursingId = findCategory('mock_Nursing');
            const emergencyMedId = findCategory('mock_Emergency Medicine');
            const medicalSuppliesId = findCategory('mock_Medical Supplies');
            if (firstAidId) resourceGroupCategoryData.push({ resourceGroupId: medicalUnitId, categoryId: firstAidId });
            if (nursingId) resourceGroupCategoryData.push({ resourceGroupId: medicalUnitId, categoryId: nursingId });
            if (emergencyMedId) resourceGroupCategoryData.push({ resourceGroupId: medicalUnitId, categoryId: emergencyMedId });
            if (medicalSuppliesId) resourceGroupCategoryData.push({ resourceGroupId: medicalUnitId, categoryId: medicalSuppliesId });
        }

        // Firefighting Force
        const firefightingId = insertedResourceGroups.find(rg => rg.name === 'mock_Firefighting Force')?.id;
        if (firefightingId) {
            const chainsawId = findCategory('mock_Chainsaw');
            const wrenchSetId = findCategory('mock_Wrench Set');
            const firstAidId = findCategory('mock_First Aid');
            const fuelId = findCategory('mock_Fuel (1L)');
            if (chainsawId) resourceGroupCategoryData.push({ resourceGroupId: firefightingId, categoryId: chainsawId });
            if (wrenchSetId) resourceGroupCategoryData.push({ resourceGroupId: firefightingId, categoryId: wrenchSetId });
            if (firstAidId) resourceGroupCategoryData.push({ resourceGroupId: firefightingId, categoryId: firstAidId });
            if (fuelId) resourceGroupCategoryData.push({ resourceGroupId: firefightingId, categoryId: fuelId });
        }

        // IT Support Center
        const itSupportId = insertedResourceGroups.find(rg => rg.name === 'mock_IT Support Center')?.id;
        if (itSupportId) {
            const webDevId = findCategory('mock_Web Development');
            const networkAdminId = findCategory('mock_Network Administration');
            const dbMgmtId = findCategory('mock_Database Management');
            const embeddedId = findCategory('mock_Embedded Systems');
            if (webDevId) resourceGroupCategoryData.push({ resourceGroupId: itSupportId, categoryId: webDevId });
            if (networkAdminId) resourceGroupCategoryData.push({ resourceGroupId: itSupportId, categoryId: networkAdminId });
            if (dbMgmtId) resourceGroupCategoryData.push({ resourceGroupId: itSupportId, categoryId: dbMgmtId });
            if (embeddedId) resourceGroupCategoryData.push({ resourceGroupId: itSupportId, categoryId: embeddedId });
        }

        // Field Hospital
        const fieldHospitalId = insertedResourceGroups.find(rg => rg.name === 'mock_Field Hospital')?.id;
        if (fieldHospitalId) {
            const surgeryId = findCategory('mock_Surgery');
            const nursingId = findCategory('mock_Nursing');
            const emergencyMedId = findCategory('mock_Emergency Medicine');
            const medicalSuppliesId = findCategory('mock_Medical Supplies');
            if (surgeryId) resourceGroupCategoryData.push({ resourceGroupId: fieldHospitalId, categoryId: surgeryId });
            if (nursingId) resourceGroupCategoryData.push({ resourceGroupId: fieldHospitalId, categoryId: nursingId });
            if (emergencyMedId) resourceGroupCategoryData.push({ resourceGroupId: fieldHospitalId, categoryId: emergencyMedId });
            if (medicalSuppliesId) resourceGroupCategoryData.push({ resourceGroupId: fieldHospitalId, categoryId: medicalSuppliesId });
        }

        // Emergency Communications Hub
        const commHubId = insertedResourceGroups.find(rg => rg.name === 'mock_Emergency Communications Hub')?.id;
        if (commHubId) {
            const commRadioId = findCategory('mock_Communication Radio');
            const networkAdminId = findCategory('mock_Network Administration');
            const embeddedId = findCategory('mock_Embedded Systems');
            if (commRadioId) resourceGroupCategoryData.push({ resourceGroupId: commHubId, categoryId: commRadioId });
            if (networkAdminId) resourceGroupCategoryData.push({ resourceGroupId: commHubId, categoryId: networkAdminId });
            if (embeddedId) resourceGroupCategoryData.push({ resourceGroupId: commHubId, categoryId: embeddedId });
        }

        // Construction and Repair Team
        const constructionId = insertedResourceGroups.find(rg => rg.name === 'mock_Construction and Repair Team')?.id;
        if (constructionId) {
            const hammerId = findCategory('mock_Hammer');
            const shovelId = findCategory('mock_Shovel');
            const wrenchSetId = findCategory('mock_Wrench Set');
            const chainsawId = findCategory('mock_Chainsaw');
            if (hammerId) resourceGroupCategoryData.push({ resourceGroupId: constructionId, categoryId: hammerId });
            if (shovelId) resourceGroupCategoryData.push({ resourceGroupId: constructionId, categoryId: shovelId });
            if (wrenchSetId) resourceGroupCategoryData.push({ resourceGroupId: constructionId, categoryId: wrenchSetId });
            if (chainsawId) resourceGroupCategoryData.push({ resourceGroupId: constructionId, categoryId: chainsawId });
        }

        // Emergency Supply Distribution
        const supplyDistId = insertedResourceGroups.find(rg => rg.name === 'mock_Emergency Supply Distribution')?.id;
        if (supplyDistId) {
            const foodRationsId = findCategory('mock_Food Rations');
            const waterSupplyId = findCategory('mock_Water Supply');
            const fuelId = findCategory('mock_Fuel (1L)');
            if (foodRationsId) resourceGroupCategoryData.push({ resourceGroupId: supplyDistId, categoryId: foodRationsId });
            if (waterSupplyId) resourceGroupCategoryData.push({ resourceGroupId: supplyDistId, categoryId: waterSupplyId });
            if (fuelId) resourceGroupCategoryData.push({ resourceGroupId: supplyDistId, categoryId: fuelId });
        }

        // Search and Rescue Team
        const sarId = insertedResourceGroups.find(rg => rg.name === 'mock_Search and Rescue Team')?.id;
        if (sarId) {
            const firstAidId = findCategory('mock_First Aid');
            const emergencyMedId = findCategory('mock_Emergency Medicine');
            const commRadioId = findCategory('mock_Communication Radio');
            const chainsawId = findCategory('mock_Chainsaw');
            if (firstAidId) resourceGroupCategoryData.push({ resourceGroupId: sarId, categoryId: firstAidId });
            if (emergencyMedId) resourceGroupCategoryData.push({ resourceGroupId: sarId, categoryId: emergencyMedId });
            if (commRadioId) resourceGroupCategoryData.push({ resourceGroupId: sarId, categoryId: commRadioId });
            if (chainsawId) resourceGroupCategoryData.push({ resourceGroupId: sarId, categoryId: chainsawId });
        }

        // Database and Information Systems
        const dbSystemsId = insertedResourceGroups.find(rg => rg.name === 'mock_Database and Information Systems')?.id;
        if (dbSystemsId) {
            const dbMgmtId = findCategory('mock_Database Management');
            const webDevId = findCategory('mock_Web Development');
            const networkAdminId = findCategory('mock_Network Administration');
            if (dbMgmtId) resourceGroupCategoryData.push({ resourceGroupId: dbSystemsId, categoryId: dbMgmtId });
            if (webDevId) resourceGroupCategoryData.push({ resourceGroupId: dbSystemsId, categoryId: webDevId });
            if (networkAdminId) resourceGroupCategoryData.push({ resourceGroupId: dbSystemsId, categoryId: networkAdminId });
        }

        // Mobile Command Center
        const commandCenterId = insertedResourceGroups.find(rg => rg.name === 'mock_Mobile Command Center')?.id;
        if (commandCenterId) {
            const commRadioId = findCategory('mock_Communication Radio');
            const networkAdminId = findCategory('mock_Network Administration');
            const firstAidId = findCategory('mock_First Aid');
            if (commRadioId) resourceGroupCategoryData.push({ resourceGroupId: commandCenterId, categoryId: commRadioId });
            if (networkAdminId) resourceGroupCategoryData.push({ resourceGroupId: commandCenterId, categoryId: networkAdminId });
            if (firstAidId) resourceGroupCategoryData.push({ resourceGroupId: commandCenterId, categoryId: firstAidId });
        }

        await db.insert(resourceGroupCategories).values(resourceGroupCategoryData);

        console.log('✅ Database seeding completed successfully!');
        console.log(`📊 Inserted:`);
        console.log(`   - ${insertedCategories.length} categories`);
        console.log(`   - ${insertedLocations.length} locations`);
        console.log(`   - ${insertedResources.length} resources`);
        console.log(`   - ${resourceCategoryData.length} resource-category relationships`);
        console.log(`   - ${insertedResourceGroups.length} resource groups`);
        console.log(`   - ${resourceGroupCategoryData.length} resource group-category relationships`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

// Run the seeding function
seedDatabase()
    .then(() => {
        console.log('🎉 Seeding process completed!');
        return pool.end();
    })
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Seeding process failed:', error);
        pool.end().finally(() => {
            process.exit(1);
        });
    });
