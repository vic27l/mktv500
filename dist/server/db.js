// server/db.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';
import 'dotenv/config';
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL is not set in environment variables');
    console.error('Please set DATABASE_URL in your .env file or environment variables');
    console.error('Example: DATABASE_URL="postgresql://username:password@localhost:5432/database_name"');
    throw new Error('DATABASE_URL is not set in environment variables');
}
const sql = neon(databaseUrl);
export const db = drizzle(sql, {
    schema,
    logger: process.env.NODE_ENV === 'development'
});
//# sourceMappingURL=db.js.map