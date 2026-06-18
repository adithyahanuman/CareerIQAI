require('dotenv').config({ path: __dirname + '/../.env' });
const { query } = require('../src/config/db');

async function backfill() {
  try {
    console.log('Fetching existing benchmark results...');
    const res = await query('SELECT student_id, role_name, fit_score, detailed_analysis FROM benchmark_results');
    
    console.log(`Found ${res.rows.length} records. Backfilling into rankings table...`);
    
    for (const row of res.rows) {
      if (!row.student_id) continue;
      
      const fitScore = row.fit_score || 0;
      
      await query(
        `INSERT INTO rankings
           (student_id, target_role, target_company, overall_score, details, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (student_id, target_role, target_company) DO UPDATE SET
           overall_score = EXCLUDED.overall_score,
           details       = EXCLUDED.details,
           updated_at    = NOW()`,
        [row.student_id, row.role_name || '', 'Global', fitScore, JSON.stringify(row.detailed_analysis || {})]
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
