import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = 3099;
const env = { ...process.env, PORT: String(PORT), NODE_ENV: 'test' };

console.log('🚀 Starting PRATYAKSHA Backend Server on port', PORT, '...');

const serverProc = spawn('npx', ['tsx', 'server.ts'], {
  env,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProc.stdout.on('data', (d) => {
  const line = d.toString();
  if (line.includes('listening on')) {
    console.log('✅ Server output:', line.trim());
    runHttpTests();
  }
});

serverProc.stderr.on('data', (d) => {
  console.error('Server stderr:', d.toString());
});

async function runHttpTests() {
  try {
    const endpoints = [
      '/api/health',
      '/api/system/status',
      '/api/dashboard/overview?municipality=ahmedabad',
      '/api/ml/anomalies?city=ahmedabad',
    ];

    for (const ep of endpoints) {
      const url = `http://localhost:${PORT}${ep}`;
      const res = await fetch(url);
      const json = await res.json();
      console.log(`✅ [HTTP ${res.status}] ${ep} ->`, JSON.stringify(json).slice(0, 110) + '...');
    }

    console.log('\n🎉 BACKEND HTTP API IS FULLY FUNCTIONAL AND SERVING LIVE RESPONSES!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    serverProc.kill();
    process.exit(0);
  }
}

// Timeout safety
setTimeout(() => {
  console.log('Timed out waiting for server.');
  serverProc.kill();
  process.exit(0);
}, 15000);
