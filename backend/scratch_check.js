require('dotenv').config();
const { query } = require('./src/config/db');

async function run() {
  const { rows } = await query(`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'rankings'
  `);
  console.log('Constraints:', rows);
  process.exit(0);
}
run();
