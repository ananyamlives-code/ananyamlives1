const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to the environment before running db:init.');
  process.exit(1);
}

(async () => {
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    const schemaSqlPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    await pool.query(schemaSql);
    console.log('✅ Schema applied successfully.');
    console.log('✅ PostgreSQL is ready for the Ananyamlives app.');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
