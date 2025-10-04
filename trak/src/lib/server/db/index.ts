import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

if (!building && !env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = building ? neon('postgres://dummy:dummy@localhost:5432/dummy') : neon(env.DATABASE_URL);

export const db = drizzle(client, { schema });

// Barrel exports for easy importing
export * from './queries';
export * from './basicQueries';
export * from '../utils/resourceGroupUtils';



