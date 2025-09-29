import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('🏭 Configuring PostgreSQL connection for VPS/Production...');

// Configure connection pool with proper settings for Neon with pg
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout for establishing new connections
  allowExitOnIdle: false // Keep the pool alive
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Handle pool errors gracefully
pool.on('error', (err: Error) => {
  console.error('💥 Unexpected error on idle client:', err.message);
  console.error('📍 Stack trace:', err.stack);
});

// Test connection on startup
pool.connect()
  .then((client) => {
    console.log('✅ Database connection established successfully');
    client.release();
  })
  .catch((err) => {
    console.error('💥 Error connecting to database:', err.message);
    console.error('📍 Stack trace:', err.stack);
    throw err;
  });