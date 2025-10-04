"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var neon_http_1 = require("drizzle-orm/neon-http");
var serverless_1 = require("@neondatabase/serverless");
var schema_1 = require("../src/lib/server/db/schema");
var drizzle_orm_1 = require("drizzle-orm");
var schema = require("../src/lib/server/db/schema");
// Get the database URL from environment
var DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
// Create database connection directly
var client = (0, serverless_1.neon)(DATABASE_URL);
var db = (0, neon_http_1.drizzle)(client, { schema: schema });
function seedDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var mockResources, mockResourceIds, insertedCategories_1, insertedLocations, resourcesData, insertedResources, resourceCategoryData, findCategory, _i, insertedResources_1, resource, categoryId, categoryId, categoryId, categoryId, categoryId, categoryId, categoryId, categoryId, categoryId, shovelId, wrenchId, categoryId, categoryId, categoryId, categoryId, categoryId, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Starting database seeding...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 12, , 13]);
                    // Clear existing mock data (keep real data)
                    console.log('🧹 Clearing existing mock data...');
                    return [4 /*yield*/, db.select().from(schema_1.resources).where((0, drizzle_orm_1.like)(schema_1.resources.name, 'mock_%'))];
                case 2:
                    mockResources = _a.sent();
                    mockResourceIds = mockResources.map(function (r) { return r.id; });
                    if (!(mockResourceIds.length > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, db.delete(schema_1.resourceCategories).where((0, drizzle_orm_1.inArray)(schema_1.resourceCategories.resourceId, mockResourceIds))];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: 
                // Delete mock resources
                return [4 /*yield*/, db.delete(schema_1.resources).where((0, drizzle_orm_1.like)(schema_1.resources.name, 'mock_%'))];
                case 5:
                    // Delete mock resources
                    _a.sent();
                    // Delete mock categories and locations
                    return [4 /*yield*/, db.delete(schema_1.categories).where((0, drizzle_orm_1.like)(schema_1.categories.name, 'mock_%'))];
                case 6:
                    // Delete mock categories and locations
                    _a.sent();
                    return [4 /*yield*/, db.delete(schema_1.locations).where((0, drizzle_orm_1.like)(schema_1.locations.cityName, 'mock_%'))];
                case 7:
                    _a.sent();
                    // Insert categories (skills, abilities, and tools)
                    console.log('📂 Inserting categories...');
                    return [4 /*yield*/, db.insert(schema_1.categories).values([
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
                        ]).returning()];
                case 8:
                    insertedCategories_1 = _a.sent();
                    // Insert locations
                    console.log('📍 Inserting locations...');
                    return [4 /*yield*/, db.insert(schema_1.locations).values([
                            { cityName: 'mock_Helsinki' },
                            { cityName: 'mock_Tampere' },
                            { cityName: 'mock_Turku' },
                            { cityName: 'mock_Oulu' },
                            { cityName: 'mock_Jyväskylä' },
                            { cityName: 'mock_Lahti' },
                            { cityName: 'mock_Kuopio' },
                            { cityName: 'mock_Pori' },
                        ]).returning()];
                case 9:
                    insertedLocations = _a.sent();
                    // Insert resources (people and equipment)
                    console.log('👥 Inserting resources...');
                    resourcesData = [
                        // Helsinki resources
                        { name: 'mock_John Smith', description: 'Senior web developer with 8 years experience', locationId: insertedLocations[0].id, latitude: 60.1699, longitude: 24.9384 },
                        { name: 'mock_Maria Virtanen', description: 'Registered nurse specializing in emergency care', locationId: insertedLocations[0].id, latitude: 60.1881, longitude: 24.9200 },
                        { name: 'mock_Ahmed Hassan', description: 'Embedded systems engineer', locationId: insertedLocations[0].id, latitude: 60.1756, longitude: 24.9342 },
                        { name: 'mock_Emergency Toolkit A', description: 'Complete emergency response toolkit', locationId: insertedLocations[0].id, latitude: 60.1612, longitude: 24.9521 },
                        { name: 'mock_Medical Station 1', description: 'Mobile medical equipment station', locationId: insertedLocations[0].id, latitude: 60.1695, longitude: 24.9354 },
                        { name: 'mock_Dr. Sarah Johnson', description: 'Emergency medicine physician', locationId: insertedLocations[0].id, latitude: 60.1733, longitude: 24.9417 },
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
                    ];
                    return [4 /*yield*/, db.insert(schema_1.resources).values(resourcesData).returning()];
                case 10:
                    insertedResources = _a.sent();
                    // Create resource-category relationships
                    console.log('🔗 Creating resource-category relationships...');
                    resourceCategoryData = [];
                    findCategory = function (name) { var _a; return (_a = insertedCategories_1.find(function (cat) { return cat.name === name; })) === null || _a === void 0 ? void 0 : _a.id; };
                    // Assign skills and tools to resources
                    for (_i = 0, insertedResources_1 = insertedResources; _i < insertedResources_1.length; _i++) {
                        resource = insertedResources_1[_i];
                        // Technical Skills
                        if (resource.name.toLowerCase().includes('web developer') || resource.name.toLowerCase().includes('john smith')) {
                            categoryId = findCategory('mock_Web Development');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('embedded') || resource.name.toLowerCase().includes('ahmed hassan')) {
                            categoryId = findCategory('mock_Embedded Systems');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('network') || resource.name.toLowerCase().includes('mikko korhonen') || resource.name.toLowerCase().includes('it support')) {
                            categoryId = findCategory('mock_Network Administration');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('database') || resource.name.toLowerCase().includes('anna lindberg')) {
                            categoryId = findCategory('mock_Database Management');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        // Medical Skills
                        if (resource.name.toLowerCase().includes('first aid') || resource.name.toLowerCase().includes('coordinator')) {
                            categoryId = findCategory('mock_First Aid');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('nurse') || resource.name.toLowerCase().includes('maria virtanen')) {
                            categoryId = findCategory('mock_Nursing');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('surgeon') || resource.name.toLowerCase().includes('surgery')) {
                            categoryId = findCategory('mock_Surgery');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('emergency medicine') || resource.name.toLowerCase().includes('dr.') || resource.name.toLowerCase().includes('paramedic')) {
                            categoryId = findCategory('mock_Emergency Medicine');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        // Tools and Equipment
                        if (resource.name.toLowerCase().includes('toolkit') || resource.name.toLowerCase().includes('construction') || resource.name.toLowerCase().includes('maintenance')) {
                            categoryId = findCategory('mock_Hammer');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                            shovelId = findCategory('mock_Shovel');
                            if (shovelId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: shovelId });
                            wrenchId = findCategory('mock_Wrench Set');
                            if (wrenchId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: wrenchId });
                        }
                        if (resource.name.toLowerCase().includes('heavy equipment') || resource.name.toLowerCase().includes('chainsaw')) {
                            categoryId = findCategory('mock_Chainsaw');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        // Resources and Supplies
                        if (resource.name.toLowerCase().includes('fuel')) {
                            categoryId = findCategory('mock_Fuel (1L)');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('medical') && (resource.name.toLowerCase().includes('station') || resource.name.toLowerCase().includes('unit') || resource.name.toLowerCase().includes('supplies'))) {
                            categoryId = findCategory('mock_Medical Supplies');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('food')) {
                            categoryId = findCategory('mock_Food Rations');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                        if (resource.name.toLowerCase().includes('communication')) {
                            categoryId = findCategory('mock_Communication Radio');
                            if (categoryId)
                                resourceCategoryData.push({ resourceId: resource.id, categoryId: categoryId });
                        }
                    }
                    return [4 /*yield*/, db.insert(schema_1.resourceCategories).values(resourceCategoryData)];
                case 11:
                    _a.sent();
                    console.log('✅ Database seeding completed successfully!');
                    console.log("\uD83D\uDCCA Inserted:");
                    console.log("   - ".concat(insertedCategories_1.length, " categories"));
                    console.log("   - ".concat(insertedLocations.length, " locations"));
                    console.log("   - ".concat(insertedResources.length, " resources"));
                    console.log("   - ".concat(resourceCategoryData.length, " resource-category relationships"));
                    return [3 /*break*/, 13];
                case 12:
                    error_1 = _a.sent();
                    console.error('❌ Error seeding database:', error_1);
                    throw error_1;
                case 13: return [2 /*return*/];
            }
        });
    });
}
// Run the seeding function
seedDatabase()
    .then(function () {
    console.log('🎉 Seeding process completed!');
    process.exit(0);
})
    .catch(function (error) {
    console.error('💥 Seeding process failed:', error);
    process.exit(1);
});
