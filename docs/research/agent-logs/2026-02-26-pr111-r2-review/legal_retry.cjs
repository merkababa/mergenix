const { spawnSync } = require('child_process');
const fs = require('fs');
const basedir = 'C:/Users/t2tec/Tortit/docs/research/agent-logs/2026-02-26-pr111-r2-review';
const env = { ...process.env, PATH: process.env.PATH + ';C:\\Users\\t2tec\\AppData\\Roaming\\npm' };
const prompt = fs.readFileSync(basedir + '/r2_legal.txt', 'utf8');

for (let attempt = 1; attempt <= 3; attempt++) {
  console.log(`Attempt ${attempt}/3 (prompt: ${prompt.length} chars)...`);
  const result = spawnSync('cmd', ['/c', 'gemini', '--model', 'gemini-3.1-pro-preview'], {
    input: prompt,
    timeout: 250000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf8',
    env,
  });
  if (result.stdout && result.stdout.length > 100) {
    fs.writeFileSync(basedir + '/legal.md', result.stdout);
    console.log('SAVED: ' + result.stdout.length + ' chars');
    console.log(result.stdout.substring(0, 400));
    break;
  } else {
    const err = result.error
      ? result.error.message.substring(0, 100)
      : (result.stderr || '').substring(0, 150);
    console.log(`Attempt ${attempt} failed: ${err}`);
    if (attempt < 3) {
      console.log('Waiting 30s before retry...');
      const wait = spawnSync('cmd', ['/c', 'timeout', '/t', '30'], { encoding: 'utf8' });
    }
  }
}
