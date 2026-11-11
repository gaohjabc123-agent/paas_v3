// wizard.js —— 创作中心状态机：选择体验 → 填写内容 → 生成与结果
export const STEPS = ['choose', 'input', 'result'];
export const EXPERIENCES = [
  { id: 'video', name: '视频口播', desc: '文案 → 配音 → 数字人成片', icon: '🎬', detail: '适合做商品介绍、课程开场白；生成约 10 秒' },
  { id: 'voice', name: '语音试听', desc: '文字 → 语音，选音色', icon: '🔊', detail: '适合先听听声音效果；生成约 3 秒' },
  { id: 'chat', name: 'AI 客服', desc: '提问 → 流式回答', icon: '💬', detail: '适合体验多轮问答；回答逐字出现' },
];
export function createWizard() { return { step: 0, experience: null, text: '', voice: 0, status: 'idle', result: null, error: '', taskId: null, progress: 0, busy: false }; }
export function goNext(w) { return { ...w, step: Math.min(w.step + 1, STEPS.length - 1) }; }
export function goPrev(w) { return { ...w, step: Math.max(w.step - 1, 0) }; }
export function chooseExperience(w, id) { return { ...w, experience: id, step: 1, error: '' }; }
export function validateText(text, min = 4, max = 200) {
  const chars = [...String(text || '').replace(/\s/g, '')].length;
  if (chars < min) return { ok: false, message: `至少写 ${min} 个字，现在 ${chars} 个字` };
  if (chars > max) return { ok: false, message: `最多 ${max} 个字，请删减后再生成（不截断）` };
  return { ok: true, message: '', chars };
}
export function estimateSeconds(text) { return Math.round(([...String(text).replace(/\s/g, '')].length / 3.8) * 10) / 10; }
export function stepProgress(w) { return Math.min(100, Math.round(((w.step + (w.status === 'done' ? 1 : 0)) / (STEPS.length - 1)) * 100)); }
export function stageLabel(progress) { return progress >= 100 ? '完成' : progress >= 60 ? '生成中' : progress >= 25 ? '排队中' : '已提交'; }
