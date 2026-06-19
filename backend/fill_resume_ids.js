require('dotenv').config();
const { query } = require('./src/config/db');

async function fill() {
  try {
    const { rows: tables } = await query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public' AND tablename LIKE 'role_%'
    `);

    console.log(`Found ${tables.length} role tables to update.`);

    for (const { tablename } of tables) {
      console.log(`Updating ${tablename}...`);
      await query(`
        UPDATE ${tablename} t
        SET resume_id = r.id
        FROM resumes r
        WHERE t.student_id = r.student_id
          AND r.is_primary = TRUE
          AND t.resume_id IS NULL
      `);
    }

    console.log('Update complete!');
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

fill();
