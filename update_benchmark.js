const fs = require('fs');
const file = 'backend/src/services/benchmarkService.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('const getMyRoleFit = async (studentId) => {', 'const getMyRoleFit = async (studentId, options = {}) => {');

const cacheCheckStr = const exactMatch = await _getLatestDoneSession(studentId, currentHash, currentJobRoles);
  if (exactMatch) {;
const newCacheCheckStr = const exactMatch = await _getLatestDoneSession(studentId, currentHash, currentJobRoles);
  if (!options.forceRefresh && exactMatch) {;
content = content.replace(cacheCheckStr, newCacheCheckStr);

const refreshFuncStr = const refreshMyRoleFit = async (studentId) => {
  // Cancel any running sessions so they aren't permanently locked out
  await query(
    \UPDATE benchmark_sessions SET status='error', error_message='Cancelled by user', updated_at=NOW()
     WHERE  created_by=\\ AND status='running'\,
    [studentId],
  );

  return getMyRoleFit(studentId);
};;
const newRefreshFuncStr = const refreshMyRoleFit = async (studentId) => {
  // Cancel any running sessions so they aren't permanently locked out
  await query(
    \UPDATE benchmark_sessions SET status='error', error_message='Cancelled by user', updated_at=NOW()
     WHERE  created_by=\\ AND status='running'\,
    [studentId],
  );

  return getMyRoleFit(studentId, { forceRefresh: true });
};;
content = content.replace(refreshFuncStr, newRefreshFuncStr);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated benchmarkService.js!');
