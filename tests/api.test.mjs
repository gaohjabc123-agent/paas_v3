import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';

let child, base;
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const post = async (p, body) => (await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })).json();
const get = async (p) => (await fetch(base + p)).json();
before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: String(port), MOCK_TASK_MS: '150' }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(base + '/api/health'); if (r.ok) break; } catch { /* wait */ } await new Promise((r) => setTimeout(r, 100)); }
});
after(() => { child?.kill(); });

test('api：health 返回 mock 模式与版本', async () => {
  const j = await get('/api/health');
  assert.equal(j.code, 0); assert.equal(j.data.mode, 'mock'); assert.equal(j.data.version, '2.0.0');
  assert.equal(j.data.service, '如影 AI 能力开放平台');
});

test('api：产品接口 config / capabilities / quota 可用且密钥不下发', async () => {
  const cfg = await get('/api/config');
  assert.equal(cfg.code, 0); assert.equal(cfg.data.mode, 'mock');
  assert.ok(!('appKey' in cfg.data), 'APP_KEY 绝不能出现在响应里');
  const caps = await get('/api/capabilities');
  assert.equal(caps.code, 0);
  assert.equal(caps.data.total, 15, '能力总数必须是 15（单一数据源）');
  assert.equal(caps.data.ready, 15, '全部能力都应可体验');
  assert.equal(caps.data.total, caps.data.stats.capabilities, '服务端 total 与前端 stats 必须一致');
  const quota = await get('/api/quota');
  assert.equal(quota.code, 0); assert.ok(Array.isArray(quota.data.items));
});

test('api：全部 15 项能力都能跑通（通用引擎）', async () => {
  const caps = (await get('/api/capabilities')).data.list;
  assert.equal(caps.length, 15);
  for (const c of caps) {
    const detail = await get('/api/capability?id=' + c.id);
    assert.equal(detail.code, 0, `${c.id} 详情读取失败`);
    assert.ok(detail.data.experience?.fields?.length, `${c.id} 无输入字段`);

    const params = {};
    for (const f of detail.data.experience.fields) params[f.key] = f.default ?? '';
    const r = await post('/api/capability/run', { id: c.id, params });
    assert.equal(r.code, 0, `${c.id} 执行失败：${r.message}`);

    if (r.data.sync) {
      assert.ok(r.data.result, `${c.id} 同步结果缺失`);
      assert.equal(r.data.result.capabilityId, c.id);
      if (c.output === 'json') assert.ok(r.data.result.jsonText?.includes('{'));
      if (c.output === 'text') assert.ok(r.data.result.text?.length > 0);
    } else {
      // 异步类：轮询到完成
      let final = null;
      for (let i = 0; i < 30; i++) {
        const t = await post('/api/capability/task', { id: r.data.taskId });
        assert.equal(t.code, 0, `${c.id} 任务查询失败`);
        if (t.data.status === 5) { final = t.data.result; break; }
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(final, `${c.id} 异步任务未达到完成状态`);
      assert.equal(final.capabilityId, c.id);
    }
  }
});

test('api：未知能力被拒绝', async () => {
  const r = await post('/api/capability/run', { id: 'not-exist', params: {} });
  assert.equal(r.code, 84115010);
});

test('api：切换到真实模式被拒绝（未配置凭据）', async () => {
  const j = await post('/api/mode', { mode: 'real' });
  assert.equal(j.code, 84115004);
  const st = await get('/api/config');
  assert.equal(st.data.mode, 'mock', '切换失败后模式不应改变');
});

test('api：非法 mode 被拒绝', async () => {
  const j = await post('/api/mode', { mode: 'hack' });
  assert.equal(j.code, 84115003);
});

test('api：文案太短返回可读错误（不截断）', async () => {
  const j = await post('/api/tts', { text: '短' });
  assert.equal(j.code, 84115927);
  assert.match(j.message, /至少 4 个字/);
});

test('api：TTS 成功返回音频与时长（字数÷3.8）', async () => {
  const j = await post('/api/tts', { text: '欢迎体验云帆数字人' });
  assert.equal(j.code, 0);
  assert.match(j.data.audio_url, /mock_tts\.mp3$/);
  assert.ok(j.data.duration_ms > 0);
});

test('api：图片数字人任务 1→2→5 并带 AI生成水印', async () => {
  const c = await post('/api/avatar', { text: '欢迎体验', audioUrl: '/files/mock_tts.mp3', duration: 3 });
  assert.equal(c.code, 0);
  const statuses = [];
  let product;
  for (let i = 0; i < 30; i++) {
    const t = await post('/api/task', { id: c.data.taskId });
    statuses.push(t.data.status); if (t.data.status === 5) { product = JSON.parse(t.data.productParam); break; }
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(statuses.includes(1) && statuses.includes(5));
  assert.equal(product.watermark, 'AI生成');
  assert.match(product.videoPath, /mock_image_avatar\.mp4$/);
});

test('api：SSE 客服流式返回 delta 与 done', async () => {
  const resp = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '这个平台能做什么？' }) });
  const text = await resp.text();
  const deltas = [...text.matchAll(/event: message\ndata: (.+)/g)].map((m) => JSON.parse(m[1]).delta).join('');
  const done = text.match(/event: done\ndata: (.+)/)[1];
  const answer = JSON.parse(done).answer;
  assert.ok(deltas.length > 0);
  assert.equal(answer, deltas);
});

test('api：静态首页与 mock 素材可访问', { skip: !fs.existsSync('dist/index.html') }, async () => {
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<!doctype html/i);
  const video = await fetch(base + '/files/mock_image_avatar.mp4');
  assert.equal(video.status, 200);
  assert.ok((await video.arrayBuffer()).byteLength > 1000);
});
