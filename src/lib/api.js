// api.js —— 前端只调同源 /api（单端口部署，无跨域、不暴露任何密钥）
async function request(path, body, { method = 'POST' } = {}) {
  const r = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
  });
  if (!r.ok) throw new Error(`服务暂时不可用（HTTP ${r.status}），请稍后重试`);
  const j = await r.json();
  if (j.code !== 0) throw new Error(j.message || `请求失败（code=${j.code}）`);
  return j.data;
}

export const api = {
  health: () => fetch('/api/health').then((r) => r.json()),
  config: () => request('/config', {}, { method: 'GET' }),
  capabilities: () => request('/capabilities', {}, { method: 'GET' }),
  quota: () => request('/quota', {}, { method: 'GET' }),
  tts: (text, voice) => request('/tts', { text, voice }),
  avatar: (payload) => request('/avatar', payload),
  video: (payload) => request('/video', payload),
  task: (id) => request('/task', { id }),
  reset: () => request('/reset', {}),
  setMode: (mode) => request('/mode', { mode }),
  capability: (id) => request('/capability?id=' + encodeURIComponent(id), {}, { method: 'GET' }),
  runCapability: (id, params) => request('/capability/run', { id, params }),
  capabilityTask: (taskId) => request('/capability/task', { id: taskId }),
};

/** 通用能力轮询：同步结果直接返回，异步任务轮询到完成 */
export async function runCapabilityFlow(id, params, { onProgress } = {}) {
  const r = await api.runCapability(id, params);
  if (r.sync) return r.result;
  for (let i = 0; i < 30; i++) {
    const t = await api.capabilityTask(r.taskId);
    const pct = t.status === 5 ? 100 : t.status === 2 ? 60 : 25;
    onProgress?.({ status: t.status, percent: pct });
    if (t.status === 5) return t.result;
    if (t.status === 9) throw new Error('生成失败（任务状态 9），请重试');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('等待超时：任务仍在排队，请稍后重试');
}

export async function chatStream(text, { onDelta, signal } = {}) {
  const r = await fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }), signal,
  });
  if (!r.ok) throw new Error(`问答服务暂时不可用（HTTP ${r.status}）`);
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ''; let answer = '';
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split(/\r?\n\r?\n/); buf = parts.pop();
    for (const block of parts) {
      const ev = block.split(/\r?\n/).find((l) => l.startsWith('event:'));
      const data = block.split(/\r?\n/).find((l) => l.startsWith('data:'));
      if (!data) continue;
      let json; try { json = JSON.parse(data.slice(5).trim()); } catch { continue; }
      if (ev?.includes('message') && json.delta) { answer += json.delta; onDelta?.(answer); }
      if (ev?.includes('done') && json.answer) answer = json.answer;
    }
  }
  return answer;
}

export async function pollTask(id, { onProgress, interval = 700, times = 30 } = {}) {
  for (let i = 0; i < times; i++) {
    const t = await api.task(id);
    const pct = t.status === 5 ? 100 : t.status === 2 ? 60 : 25;
    onProgress?.({ status: t.status, percent: pct });
    if (t.status === 5) return JSON.parse(t.productParam || '{}');
    if (t.status === 9) throw new Error('生成失败（任务状态 9），请重试');
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('等待超时：任务仍在排队，请稍后在「任务与作品」查看或重新生成');
}
