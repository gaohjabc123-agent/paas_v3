// mock.mjs —— 平台替身：通用能力执行引擎（零费用本地模拟）
// 保留原有 /api/tts /avatar /video /task /chat 语义，新增通用 runCapability。
import path from 'node:path';
import { CAPABILITIES, capById } from '../src/lib/capabilities.js';

const ASSETS = path.resolve(import.meta.dirname, 'mock', 'assets');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createMock() {
  const tasks = new Map();
  let seq = 12000;
  const jitter = () => 0.9 + Math.random() * 0.2;
  const words = (text) => [...String(text).replace(/\s/g, '')].length;
  const TASK_MS = Number(process.env.MOCK_TASK_MS ?? 1400);

  // 按能力 output 生成模拟结果（数据全部来自 capabilities.js 的 experience 规格）
  function resultFor(cap, params) {
    const ex = cap.experience || {};
    const base = {
      capabilityId: cap.id, capabilityName: cap.name, output: ex.output,
      title: ex.mockTitle || cap.name, watermark: 'AI生成', mode: 'mock',
      generatedAt: new Date().toISOString(),
    };
    switch (ex.output) {
      case 'video':
        return { ...base, videoUrl: '/files/mock_image_avatar.mp4', thumb: '/files/mock_thumb.png', duration: 5.8, productParam: { videoPath: '/files/mock_image_avatar.mp4', thumbPath: '/files/mock_thumb.png', duration: 5.8, watermark: 'AI生成' } };
      case 'audio':
        return { ...base, audioUrl: '/files/mock_tts.mp3', durationMs: Math.max(1200, Math.round((words(params.text || '') / 3.8) * 1000)) };
      case 'image':
        return { ...base, imageUrl: '/files/mock_portrait.png', thumb: '/files/mock_thumb.png' };
      case 'json': {
        const j = { ...(ex.mockJson || {}) };
        // 把用户输入回填到模拟回执，让结果「看得出是自己填的」
        for (const f of ex.fields || []) {
          if (['text', 'textarea'].includes(f.type) && params[f.key] && !j[f.key]) j[f.key] = String(params[f.key]).slice(0, 60);
        }
        return { ...base, json: j, jsonText: JSON.stringify(j, null, 2) };
      }
      case 'text':
        return { ...base, text: ex.mockText || '（演示结果）' };
      case 'chat':
        return { ...base, text: '演示回答：真实模式下由大模型流式返回。' };
      default:
        return { ...base, text: '（演示结果）' };
    }
  }

  // 通用任务视图：沿用平台 1→2→5 状态机
  function view(t) {
    const elapsed = Date.now() - t.at;
    const status = elapsed >= TASK_MS ? 5 : elapsed >= TASK_MS / 2 ? 2 : 1;
    const product = status === 5 ? { capabilityId: t.capId, result: t.result, productParam: JSON.stringify(t.result?.productParam || t.result || {}) } : {};
    return { id: t.id, status, algoType: 20, capId: t.capId, productParam: JSON.stringify(product), startTime: new Date(t.at).toISOString() };
  }

  function legacyView(id) {
    const t = tasks.get(Number(id)); if (!t) return null;
    const elapsed = Date.now() - t.at;
    const status = elapsed >= TASK_MS ? 5 : elapsed >= TASK_MS / 2 ? 2 : 1;
    const product = status === 5 ? (t.result?.productParam || {}) : {};
    return { id: t.id, status, algoType: t.type === 'avatar' ? 34 : 20, productParam: JSON.stringify(product), startTime: new Date(t.at).toISOString() };
  }

  return {
    assets: ASSETS, mime: MIME, TASK_MS,
    tts(text) { return { audio_url: '/files/mock_tts.mp3', duration_ms: Math.max(1200, Math.round((words(text) / 3.8) * 1000)) }; },
    createTask(type) { const id = ++seq; tasks.set(id, { id, type, capId: type, at: Date.now(), result: null }); return id; },
    // 兼容旧 /api/avatar 图片数字人：返回带 videoPath 的成片
    createLegacyVideoTask(type) {
      const id = ++seq;
      const legacy = type === 'avatar'
        ? { videoPath: '/files/mock_image_avatar.mp4', thumbPath: '/files/mock_thumb.png', duration: 5.8, watermark: 'AI生成' }
        : { videoPath: '/files/mock_video.mp4', thumbPath: '/files/mock_thumb.png', duration: 6880, watermark: 'AI生成' };
      tasks.set(id, { id, type, capId: type, at: Date.now(), legacy: true, result: { productParam: legacy } });
      return id;
    },
    legacyView,
    task(id) { const t = tasks.get(Number(id)); return t ? (t.legacy ? legacyView(id) : view(t)) : null; },
    reset() { tasks.clear(); return { ok: true }; },

    /** 通用能力执行：按 capId 创建异步任务，返回结果对象 */
    async runCapability(capId, params = {}) {
      const cap = capById(capId);
      if (!cap) throw Object.assign(new Error(`未知能力：${capId}`), { code: 84115010 });
      const ex = cap.experience || {};
      // 通用「至少 4 字」校验：仅对含文本输入的能力生效
      const textFields = (ex.fields || []).filter((f) => ['text', 'textarea'].includes(f.type));
      for (const f of textFields) {
        const v = String(params[f.key] ?? '');
        if (v && v.trim() && !v.startsWith('http') && words(v) < 4 && f.key === 'text') {
          throw Object.assign(new Error(`${f.label}至少 4 个字，请再写一点`), { code: 84115927 });
        }
      }
      // 同步类能力（json/text/chat）直接返回；异步类（video/audio/image）走任务轮询
      if (['json', 'text', 'chat'].includes(ex.output)) {
        return { sync: true, result: resultFor(cap, params) };
      }
      const id = ++seq;
      tasks.set(id, { id, type: capId, capId, at: Date.now(), result: resultFor(cap, params) });
      return { sync: false, taskId: id, output: ex.output };
    },
    capabilityResult(taskId) {
      const t = tasks.get(Number(taskId)); if (!t) return null;
      const elapsed = Date.now() - t.at;
      return { status: elapsed >= TASK_MS ? 5 : elapsed >= TASK_MS / 2 ? 2 : 1, result: t.result, capId: t.capId };
    },

    async chat(text, onDelta) {
      const answer = `这是如影 AI 能力开放平台的演示回答。你问的是"${String(text).slice(0, 24)}"。真实接入后，这里会由大模型流式返回；当前为演示环境，不产生任何费用。`;
      const chunks = answer.match(/.{1,6}/gs) || [];
      for (const c of chunks) { onDelta?.(c); await sleep(12 * jitter()); }
      return answer;
    },
  };
}
