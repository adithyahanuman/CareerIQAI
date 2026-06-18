require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

const connectionString = process.env.DATABASE_URL;
const isCockroach = connectionString
  ? connectionString.includes('cockroachlabs.cloud')
  : (process.env.DB_HOST || '').includes('cockroachlabs.cloud');

const poolConfig = connectionString ? {
  connectionString,
  ssl: isCockroach ? { rejectUnauthorized: true } : false,
} : {
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     parseInt(process.env.DB_PORT || '5432'),
  ssl: isCockroach ? { rejectUnauthorized: true } : false,
};

const pool = new Pool(poolConfig);

async function run() {
  console.log('Recreating rankings table without the individual component scores...');
  try {
    await pool.query('DROP TABLE IF EXISTS rankings CASCADE');
    console.log('Dropped old rankings table.');
    
    const schemaFile = path.join(__dirname, '../src/db/schema/004_rankings.sql');
    const sql = fs.readFileSync(schemaFile, 'utf8');
    
    await pool.query(sql);
    console.log('Successfully created new rankings table!');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}
run();
