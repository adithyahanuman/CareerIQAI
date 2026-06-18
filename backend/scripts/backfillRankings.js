require('dotenv').config({ path: __dirname + '/../.env' });
const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
const { query } = require('../src/config/db');

async function backfill() {
  try {
    console.log('Fetching all processed resumes...');
    const res = await query(`
      SELECT s.id AS student_id, s.full_name, r.overall_analysis 
      FROM resumes r
      JOIN students s ON s.id = r.student_id
      WHERE r.status = 'done' AND r.is_primary = TRUE
    `);
    
    console.log(`Found ${res.rows.length} records. Backfilling into rankings table...`);
    
    for (const row of res.rows) {
      if (!row.student_id) continue;
      
      const overallScore = Number(row.overall_analysis?.overall_score) || 0;
      
      await query(
        `INSERT INTO rankings
           (student_id, student_name, overall_score, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (student_id) DO UPDATE SET
           student_name  = EXCLUDED.student_name,
           overall_score = EXCLUDED.overall_score,
           updated_at    = NOW()`,
        [row.student_id, row.full_name || 'Unknown', overallScore]
      );
    }
    
    console.log('Successfully backfilled all previous data into the rankings table!');
    process.exit(0);
  } catch (err) {
    console.error('Error backfilling rankings:', err);
    process.exit(1);
  }
}

backfill();
