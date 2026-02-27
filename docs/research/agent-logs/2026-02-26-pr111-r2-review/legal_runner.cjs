const { spawnSync } = require('child_process');
const fs = require('fs');
const basedir = 'C:/Users/t2tec/Tortit/docs/research/agent-logs/2026-02-26-pr111-r2-review';
const env = { ...process.env, PATH: process.env.PATH + ';C:\\Users\\t2tec\\AppData\\Roaming\\npm' };
const prompt = fs.readFileSync(basedir + '/r2_legal.txt', 'utf8');
console.log('Running legal review (prompt: ' + prompt.length + ' chars)...');
const result = spawnSync('cmd', ['/c', 'gemini', '--model', 'gemini-3.1-pro-preview'], {
  input: prompt, timeout: 300000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf8', env
});
if (result.stdout && result.stdout.length > 100) {
  fs.writeFileSync(basedir + '/legal.md', result.stdout);
  console.log('SAVED: ' + result.stdout.length + ' chars');
  console.log(result.stdout.substring(0, 500));
} else {
  console.log('Failed. status: ' + result.status);
  console.log('stderr: ' + (result.stderr || '').substring(0, 300));
  if (result.error) console.log('error: ' + result.error.message.substring(0, 150));
}
