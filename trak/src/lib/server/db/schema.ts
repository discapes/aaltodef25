import { pgTable, serial, integer, varchar, text, timestamp, real } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const resources = pgTable('resources', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	locationId: integer('location_id').references(() => locations.id).notNull(),
	latitude: real('latitude').notNull(),
	longitude: real('longitude').notNull(),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const resourceCategories = pgTable('resource_categories', {
	id: serial('id').primaryKey(),
	resourceId: integer('resource_id').references(() => resources.id).notNull(),
	categoryId: integer('category_id').references(() => categories.id).notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

export const locations = pgTable('locations', {
	id: serial('id').primaryKey(),
	cityName: varchar('city_name', { length: 255 }).notNull(),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

