require('dotenv').config();
const { query } = require('./src/config/db');

async function migrate() {
  try {
    // 1. Get all role tables
    const { rows: tables } = await query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public' AND tablename LIKE 'role_%'
    `);

    console.log(`Found ${tables.length} role tables to migrate.`);

    for (const { tablename } of tables) {
      console.log(`Migrating ${tablename}...`);

      // 2. Find and drop the unique constraint on student_id dynamically
      const { rows: constraints } = await query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = $1::regclass AND contype = 'u'
      `, [tablename]);
      
      for (const { conname } of constraints) {
        if (conname.includes('student_id')) {
           console.log(`Dropping constraint ${conname}...`);
           await query(`DROP INDEX ${tablename}@${conname} CASCADE`);
        }
      }

      // 3. Add resume_id column if it doesn't exist
      try {
        await query(`ALTER TABLE ${tablename} ADD COLUMN IF NOT EXISTS resume_id UUID`);
      } catch (e) {
        console.log(`Column resume_id might already exist on ${tablename}.`);
      }

      // 4. Add UNIQUE(resume_id) constraint
      try {
        await query(`ALTER TABLE ${tablename} ADD CONSTRAINT ${tablename}_resume_id_key UNIQUE (resume_id)`);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.log(`Warning: Could not add unique constraint on resume_id for ${tablename}: ${e.message}`);
        }
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
