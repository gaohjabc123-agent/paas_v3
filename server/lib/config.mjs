// config.mjs —— 读取 .env（自解析，不依赖 dotenv），合并默认值；mock 模式不读真实密钥
import fs from 'node:fs';
import path from 'node:path';
import { md5Hex } from './sign.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

export function loadDotEnv(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

export function getConfig(env = {}) {
  const file = loadDotEnv();
  const pick = (k, d) => (env[k] ?? file[k] ?? d);
  const mock = String(pick('RUYING_MOCK', 'true')).toLowerCase() !== 'false';
  const mode = mock ? 'mock' : 'real';
  const cfg = {
    root: ROOT,
    mode,
    mock,
    proxyPort: Number(pick('PROXY_PORT', 8787)),
    mockPort: Number(pick('MOCK_PORT', 8788)),
    // mock 模式用课程占位密钥（假的，写死在配置里只用于本地签名练习；真实模式必须来自 .env")
    appId: mock ? 'mock-app-id-0001' : String(pick('RUYING_APP_ID', '')),
    appKey: mock ? 'mock-app-key-0001-fake' : String(pick('RUYING_APP_KEY', '')),
    baseUrl: mock ? `http://127.0.0.1:${Number(pick('MOCK_PORT', 8788))}` : String(pick('RUYING_BASE_URL', 'https://aigc.softsugar.com')),
    tsUnit: String(pick('SIGN_TS_UNIT', 'ms')),
    allowBillable: String(pick('ALLOW_BILLABLE', 'false')).toLowerCase() === 'true',
    mockTsSkewSec: Number(pick('MOCK_TS_SKEW_SEC', 0)),
    mockRefreshWindowMs: Number(pick('MOCK_REFRESH_WINDOW_MS', 3 * 60 * 60 * 1000)),
    mockTaskMs: Number(pick('MOCK_TASK_MS', 6000)),
    mockVoiceReadyMs: Number(pick('MOCK_VOICE_READY_MS', 1200)),
    mockSseDelayMs: Number(pick('MOCK_SSE_DELAY_MS', 15)),
    // 课程演示用 AuthKey：运行时生成，源码里不写死任何密钥；学生练习可自己改
    demoAuthKey: `practice-${md5Hex('callback-demo-seed').slice(0, 6)}`,
    // 浏览器允许的来源（本地开发）
    allowOrigins: [`http://127.0.0.1:5173`, `http://localhost:5173`, `http://127.0.0.1:4173`],
  };
  if (!cfg.mock) {
    const missing = [];
    if (!cfg.appId) missing.push('RUYING_APP_ID');
    if (!cfg.appKey) missing.push('RUYING_APP_KEY');
    if (missing.length) throw new Error(`真实模式缺少配置：${missing.join('、')}。请检查 .env 或改回 RUYING_MOCK=true。`);
  }
  if (!['ms', 's'].includes(cfg.tsUnit)) throw new Error(`SIGN_TS_UNIT 只能是 ms 或 s，当前：${cfg.tsUnit}`);
  return cfg;
}

export const BILLABLE_PATHS = [
  '/api/2dvh/v1/material/video/create',
  '/api/2dvh/v1/material/video/batchCreate',
  '/api/2dvh/v1/material/single/image/video/create',
  '/api/2dvh/v1/material/single/image/edit',
  '/api/2dvh/v1/material/face/swap/create',
  '/api/2dvh/v1/material/2davatar/model/multi/create',
  '/api/2dvh/v1/material/2davatar/model/rebuilding/video',
];

export function isBillable(pathname) {
  return BILLABLE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
