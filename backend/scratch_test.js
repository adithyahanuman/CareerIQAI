require('dotenv').config();
const { query } = require('./src/config/db');
const { getMyRoleFit } = require('./src/services/benchmarkService');

async function test() {
  try {
    const studentId = '267b0e78-e8f2-4b05-9760-295b84640f89';
    const { rows } = await query(`SELECT id, status, resume_text_hash, job_roles FROM benchmark_sessions WHERE created_by = $1 ORDER BY created_at DESC LIMIT 3`, [studentId]);
    console.log('Recent sessions:', JSON.stringify(rows, null, 2));
    
    const result = await getMyRoleFit(studentId);
    console.log('getMyRoleFit status:', result.status, 'cache:', result.cache);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
test();
