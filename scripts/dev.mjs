// dev.mjs —— 本地开发：API 服务（8787）+ Vite（5173）
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = spawn(process.execPath, [path.join(root, 'server', 'index.mjs')], { env: { ...process.env, PORT: '8787', MOCK_MODE: '1' }, stdio: 'inherit' });
const vite = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1'], { cwd: root, stdio: 'inherit' });
const stop = () => { api.kill(); vite.kill(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
