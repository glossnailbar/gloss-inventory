#!/usr/bin/env node
/**
 * Run database migration using Node.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationFile = path.join(__dirname, '001_add_auth_tables.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
