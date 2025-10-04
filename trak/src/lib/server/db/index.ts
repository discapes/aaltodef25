import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

if (!building && !env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new pg.Pool({
	connectionString: building ? 'postgres://dummy:dummy@localhost:5432/dummy' : env.DATABASE_URL
});

export const db = drizzle(pool, { schema });

// Barrel exports for easy importing
export * from './queries';
export * from './basicQueries';
export * from '../utils/resourceGroupUtils';



