// server/src/config/database.js
const path = require('path');
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
require('dotenv').config({ path: path.resolve(process.cwd(), envFile) });

const { Pool } = require('pg');

console.log('DB password type:', typeof process.env.DB_PASSWORD);
console.log('Has DB password?', !!process.env.DB_PASSWORD);
console.log('Using DATABASE_URL?', !!process.env.DATABASE_URL);

const connectionString = process.env.DATABASE_URL || null;

if (!connectionString) {
  if (typeof process.env.DB_PASSWORD !== 'string' || process.env.DB_PASSWORD.length === 0) {
    throw new Error('Database password is missing or not a string. Set DATABASE_URL or DB_PASSWORD (check .env.test for tests).');
  }
}

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

module.exports = pool;