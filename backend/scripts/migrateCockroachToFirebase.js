const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const { db } = require('../src/config/firebase');

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
  port:     process.env.DB_PORT,
  ssl: isCockroach ? { rejectUnauthorized: true } : false,
};

const pool = new Pool(poolConfig);

async function migrateData() {
  try {
    console.log('🚀 Starting Data Migration: CockroachDB -> Firestore');

    // 1. Get all user tables from public schema
    const { rows: tables } = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public'
    `);

    const tableNames = tables.map(t => t.tablename);
    console.log(`\nFound ${tableNames.length} tables to migrate:`, tableNames.join(', '));

    // 2. Loop through each table and migrate rows
    for (const tableName of tableNames) {
      console.log(`\n📦 Migrating table: ${tableName}`);
      
      const { rows } = await pool.query(`SELECT * FROM ${tableName}`);
      if (rows.length === 0) {
         console.log(`   Table is empty. Skipping.`);
         continue;
      }
      
      console.log(`   Found ${rows.length} rows.`);

      // Firestore Batch max operations is 500
      let batchCount = 0;
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const batch = db.batch();
        const collectionRef = db.collection(tableName);

        chunk.forEach(row => {
          // Use 'firebase_uid', 'id', or generate a new ID
          const docId = row.firebase_uid || row.id || require('crypto').randomUUID();
          
          // Clean up row data
          const dataToInsert = { ...row };
          
          Object.keys(dataToInsert).forEach(key => {
            if (dataToInsert[key] === undefined) {
               delete dataToInsert[key];
            }
          });

          const docRef = collectionRef.doc(docId);
          batch.set(docRef, dataToInsert, { merge: true });
        });

        await batch.commit();
        batchCount++;
      }
      
      console.log(`   ✅ Successfully migrated ${rows.length} rows (in ${batchCount} batches).`);
    }

    console.log('\n🎉 All Data Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during migration:', err);
    process.exit(1);
  }
}

migrateData();
