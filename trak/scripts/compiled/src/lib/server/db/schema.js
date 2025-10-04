"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locations = exports.resourceCategories = exports.resources = exports.categories = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.categories = (0, pg_core_1.pgTable)('categories', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.resources = (0, pg_core_1.pgTable)('resources', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    locationId: (0, pg_core_1.integer)('location_id').references(function () { return exports.locations.id; }).notNull(),
    latitude: (0, pg_core_1.real)('latitude').notNull(),
    longitude: (0, pg_core_1.real)('longitude').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.resourceCategories = (0, pg_core_1.pgTable)('resource_categories', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    resourceId: (0, pg_core_1.integer)('resource_id').references(function () { return exports.resources.id; }).notNull(),
    categoryId: (0, pg_core_1.integer)('category_id').references(function () { return exports.categories.id; }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
exports.locations = (0, pg_core_1.pgTable)('locations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    cityName: (0, pg_core_1.varchar)('city_name', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
