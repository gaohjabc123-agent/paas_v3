// index.mjs —— 如影 AI 能力开放平台 服务端 v2.0
// 单端口：静态托管 + 同源 API；演示(mock) / 真实(real) 双模式
// 密钥只存在于服务端，前端永远拿不到；计费接口有白名单保护。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMock } from './mock.mjs';
import { getConfig, isBillable } from './lib/config.mjs';
import { TokenManager } from './lib/token.mjs';
import { maskValue } from './lib/mask.mjs';
import { CAPABILITIES, GROUPS, capById, stats, OUTPUT_LABEL } from '../src/lib/capabilities.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8080);
const MOCK = createMock();
const VERSION = '2.0.0';
const PRODUCT_NAME = '如影 AI 能力开放平台';

// 运行时模式：默认 mock；切换真实模式需 .env 已配置凭据
let CFG = null;
let CFG_ERROR = null;
try { CFG = getConfig(); } catch (e) { CFG_ERROR = e.message; }
let activeMode = CFG?.mode || 'mock';
const tokenManager = CFG ? new TokenManager(CFG, { log: (m) => console.log('[ruying] ' + m) }) : null;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon',
};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (res, status, body) => {
  const t = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(t), ...CORS });
  res.end(t);
};
const ok = (res, data) => json(res, 200, { code: 0, message: 'success', data });
const err = (res, code, message) => json(res, 200, { code, message, data: null });
const body = (req) => new Promise((resolve) => {
  let b = ''; req.on('data', (c) => { b += c; });
  req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
});

function serveFile(req, res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600' });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

/* ---------------- 能力目录：与前端共用 src/lib/capabilities.js ---------------- */
// 不再维护服务端副本，避免 total 与首页数字不一致。
const groupName = (id) => GROUPS.find((g) => g.id === id)?.name || id;

/* ---------------- 真实模式：如影 PaaS 代理 ---------------- */
// 真实模式下把 /api/* 的业务请求转发到平台；签名与 Token 由服务端完成。
// 计费路径必须 ALLOW_BILLABLE=true 才放行，避免演示时误产生费用。
const REAL_ROUTES = {
  '/api/tts': { path: '/api/2dvh/v1/material/voice/tts', billable: false },
  '/api/avatar': { path: '/api/2dvh/v1/material/single/image/video/create', billable: true },
  '/api/video': { path: '/api/2dvh/v1/material/video/create', billable: true },
  '/api/task': { path: '/api/2dvh/v1/material/task/query', billable: false },
};

async function realModeCallRaw(apiPath, payload, billable = false) {
  if (billable && isBillable(apiPath) && !CFG.allowBillable) {
    throw Object.assign(new Error('计费接口已受保护：如需真实调用请在服务端 .env 设置 ALLOW_BILLABLE=true'), { code: 84115002 });
  }
  const token = await tokenManager.get();
  const resp = await fetch(`${CFG.baseUrl}${apiPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.accessToken}` },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  let j = null; try { j = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!resp.ok || !j || j.code !== 0) {
    throw Object.assign(new Error(j?.message || `平台返回 HTTP ${resp.status}`), { code: j?.code ?? `HTTP_${resp.status}` });
  }
  return j.data;
}

async function realModeCall(pathname, payload) {
  const route = REAL_ROUTES[pathname];
  if (!route) throw Object.assign(new Error('该能力在真实模式下尚未接入代理'), { code: 84115001 });
  return realModeCallRaw(route.path, payload, route.billable);
}

/* ---------------- 路由 ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  try {
    // === 产品接口 ===
    if (p === '/api/health') {
      return ok(res, {
        mode: activeMode, service: PRODUCT_NAME, version: VERSION, ts: Date.now(),
        product: PRODUCT_NAME, capabilities: CAPABILITIES.length,
      });
    }

    if (p === '/api/config' && req.method === 'GET') {
      return ok(res, {
        mode: activeMode,
        appIdMasked: CFG ? maskValue(CFG.appId) : '—',
        hasToken: tokenManager ? tokenManager.isValid() : false,
        allowBillable: CFG?.allowBillable ?? false,
        baseUrl: activeMode === 'mock' ? '本地模拟' : (CFG?.baseUrl || ''),
        configError: CFG_ERROR,
      });
    }

    if (p === '/api/capabilities' && req.method === 'GET') {
      return ok(res, {
        list: CAPABILITIES.map((c) => ({
          id: c.id, group: groupName(c.group), groupId: c.group, name: c.name,
          desc: c.desc, scene: c.scene, api: c.api, doc: c.doc, tag: c.tag || '',
          status: c.status, output: c.experience?.output || 'text',
          outputLabel: OUTPUT_LABEL[c.experience?.output] || '文本',
          fieldCount: (c.experience?.fields || []).length,
        })),
        total: CAPABILITIES.length,
        groups: GROUPS.length,
        ready: CAPABILITIES.filter((c) => c.status === 'ready').length,
        stats: stats(),
      });
    }

    // 单项能力详情（含体验表单规格）
    if (p === '/api/capability' && req.method === 'GET') {
      const id = url.searchParams.get('id');
      const cap = capById(id);
      if (!cap) return err(res, 84115010, `未知能力：${id}`);
      return ok(res, { ...cap, groupName: groupName(cap.group) });
    }

    // 通用能力执行：所有能力统一入口
    if (p === '/api/capability/run' && req.method === 'POST') {
      const { id, params = {} } = await body(req);
      const cap = capById(id);
      if (!cap) return err(res, 84115010, `未知能力：${id}`);
      if (activeMode === 'real' && cap.realApi && cap.billable && !CFG?.allowBillable) {
        return err(res, 84115002, '计费接口已受保护：如需真实调用请在服务端 .env 设置 ALLOW_BILLABLE=true');
      }
      if (activeMode === 'real' && cap.realApi) {
        const data = await realModeCallRaw(cap.realApi, params, cap.billable);
        return ok(res, { sync: true, result: { capabilityId: id, capabilityName: cap.name, output: cap.experience?.output, mode: 'real', raw: data, title: cap.experience?.mockTitle || cap.name } });
      }
      // 演示模式 / 无真实接口的能力 → 本地模拟，并把「需前置资源」写进结果说明
      const r = await MOCK.runCapability(id, params);
      if (r.result) r.result.notes = cap.experience?.notes || '';
      if (activeMode === 'real' && !cap.realApi) {
        const note = `真实模式下「${cap.name}」需要先在如影 PaaS 控制台准备前置资源（模型 ID / 知识库 / 直播间等），当前返回演示结果供体验。`;
        if (r.result) r.result.realModeNote = note;
        r.realModeNote = note;
      }
      return ok(res, r);
    }

    // 通用任务轮询
    if (p === '/api/capability/task' && req.method === 'POST') {
      const { id } = await body(req);
      const t = MOCK.capabilityResult(id);
      if (!t) return err(res, 99999999, '任务不存在（服务重启会清空任务，请重新体验）');
      return ok(res, t);
    }

    if (p === '/api/quota' && req.method === 'GET') {
      // 演示模式给固定配额；真实模式可接平台「账单查询服务」接口
      const items = [
        { name: '可合成视频时长', used: '0.54 min', total: '20 min', pct: 3 },
        { name: '图片数字人时长', used: '17.9 s', total: '120 s', pct: 15 },
        { name: '人物形象模型', used: '0 个', total: '3 个', pct: 0 },
        { name: 'TTS 个人音色', used: '0 个', total: '3 个', pct: 0 },
        { name: '可直播时长', used: '0 min', total: '100 min', pct: 0 },
      ];
      return ok(res, { mode: activeMode, videoUsed: 0.54, videoTotal: 20, usedPct: 3, items });
    }

    if (p === '/api/mode' && req.method === 'POST') {
      const { mode } = await body(req);
      if (!['mock', 'real'].includes(mode)) return err(res, 84115003, 'mode 只能是 mock 或 real');
      if (mode === 'real') {
        if (!CFG) return err(res, 84115004, `服务端未就绪：${CFG_ERROR || '请检查 .env'}`);
        // 必须显式声明 RUYING_MOCK=false，且凭据为真实值（不能是 mock 占位假密钥）
        const placeholder = (v) => !v || /^mock[-_]/.test(v);
        if (CFG.mock || placeholder(CFG.appId) || placeholder(CFG.appKey)) {
          return err(res, 84115004, '真实模式尚未配置：请先将服务端 .env 的 RUYING_MOCK 设为 false，并填入真实的 RUYING_APP_ID / RUYING_APP_KEY');
        }
      }
      activeMode = mode;
      console.log(`[platform] 运行模式切换为 ${mode}`);
      return ok(res, { mode: activeMode, appIdMasked: CFG ? maskValue(CFG.appId) : '—', hasToken: tokenManager ? tokenManager.isValid() : false, allowBillable: CFG?.allowBillable ?? false });
    }

    // === 业务接口：双模式分发 ===
    if (p === '/api/reset' && req.method === 'POST') {
      MOCK.reset();
      return ok(res, { mode: activeMode, ok: true });
    }

    if (p === '/api/tts' && req.method === 'POST') {
      const { text = '' } = await body(req);
      if ([...text.replace(/\s/g, '')].length < 4) return err(res, 84115927, '文案至少 4 个字，请再写一点（超限也不截断）');
      if (activeMode === 'real') return ok(res, await realModeCall(p, { text }));
      return ok(res, MOCK.tts(text));
    }

    if (p === '/api/avatar' && req.method === 'POST') {
      const { text = '', audioUrl = '', duration = 0 } = await body(req);
      if (!audioUrl) return err(res, 84115927, '缺少配音，请先生成配音');
      if (!(duration > 0)) return err(res, 84115927, '缺少有效时长');
      if (activeMode === 'real') return ok(res, await realModeCall(p, { text, audioUrl, duration }));
      return ok(res, { taskId: MOCK.createLegacyVideoTask('avatar') });
    }

    if (p === '/api/video' && req.method === 'POST') {
      const { text = '' } = await body(req);
      if ([...text.replace(/\s/g, '')].length < 4) return err(res, 84115927, '文案至少 4 个字');
      if (activeMode === 'real') return ok(res, await realModeCall(p, { text }));
      return ok(res, { taskId: MOCK.createLegacyVideoTask('video') });
    }

    if (p === '/api/task' && req.method === 'POST') {
      const { id } = await body(req);
      if (activeMode === 'real') return ok(res, await realModeCall(p, { id }));
      const t = MOCK.task(id);
      return t ? ok(res, t) : err(res, 99999999, '任务不存在（服务重启会清空任务，请重新生成）');
    }

    if (p === '/api/chat' && req.method === 'POST') {
      const { text = '' } = await body(req);
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', ...CORS });
      res.write(': connected\n\n');
      const answer = await MOCK.chat(text, (delta) => res.write(`event: message\ndata: ${JSON.stringify({ delta })}\n\n`));
      res.write(`event: done\ndata: ${JSON.stringify({ answer })}\n\n`);
      return res.end();
    }

    // === 静态资源 & mock 素材 ===
    if (p.startsWith('/files/')) {
      const safe = path.join(MOCK.assets, path.basename(p));
      if (!safe.startsWith(MOCK.assets)) { res.writeHead(400); return res.end('bad request'); }
      if (serveFile(req, res, safe)) return;
      res.writeHead(404); return res.end('not found');
    }
    const distFile = path.join(DIST, p === '/' ? 'index.html' : p);
    if (serveFile(req, res, distFile)) return;
    if (serveFile(req, res, path.join(DIST, 'index.html'))) return; // SPA 回退
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('前端尚未构建：请先运行 npm run build，或使用 npm run dev 开发模式。');
  } catch (e) {
    // 真实模式上游错误统一转成产品可读错误，不泄露密钥与堆栈
    console.error('[platform] error:', e.message);
    return err(res, e.code || 84115999, e.message || '服务暂时不可用，请稍后重试');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${PRODUCT_NAME}] http://127.0.0.1:${PORT}  v${VERSION}  模式=${activeMode}`);
  if (CFG_ERROR) console.warn('[配置告警] ' + CFG_ERROR);
  if (!fs.existsSync(DIST)) console.log('[提示] 未发现 dist/，请先 npm run build；开发模式用 npm run dev。');
});
export { server };
