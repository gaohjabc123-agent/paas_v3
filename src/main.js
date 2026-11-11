// main.js —— 如影 AI 能力开放平台（产品版 v2.0）
// 官网(home/capabilities/scenarios/integration) + 工作台(overview/create/tasks/catalog/settings)
import './style.css';
import { PRODUCT, DEFAULT_VIEW, navById } from './lib/product.js';
import { mountExplain, TOUR_STEPS, nextTourStep, shouldShowTour, markTourDone } from './lib/guide.js';
import { createWizard, EXPERIENCES, validateText, stageLabel } from './lib/wizard.js';
import { api, chatStream, pollTask, runCapabilityFlow } from './lib/api.js';
import { listWorks, addWork, removeWork, clearWorks, daysLeft } from './lib/works.js';
import { CAPABILITIES, capById, GROUPS } from './lib/capabilities.js';
import * as V from './lib/views.js';
import * as E from './lib/experience.js';

const esc = V.esc;
const state = {
  view: DEFAULT_VIEW,
  config: { mode: 'mock', appIdMasked: '—', hasToken: false, allowBillable: false },
  quota: null,
  capFilter: 'all',
  createTab: 'video',
  exp: { capId: null, running: false, percent: 0, result: null, error: '' },
  wizard: { ...createWizard(), experience: 'video', step: 1, text: '新款智能手表今天上市，支持全天心率监测与运动记录，欢迎了解。' },
  voice: { text: '大家好，欢迎使用如影 AI 能力开放平台。', busy: false, result: null, error: '' },
  chat: { messages: [], input: '', streaming: false, abort: null, error: '' },
  works: [],
  guide: { explain: false, sheet: null, tour: -1 },
  modeDialog: false,
  toast: '',
};

const app = document.getElementById('app');
let toastTimer = null;

function toast(msg) {
  state.toast = msg; render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = ''; render(); }, 2400);
}
const SITE_VIEWS = ['home', 'capabilities', 'scenarios', 'integration'];
function maybeStartTour(view) {
  // 引导只在工作台首次进入时出现，营销首页不打扰客户
  if (SITE_VIEWS.includes(view)) { state.guide.tour = -1; return; }
  if (state.guide.tour < 0 && shouldShowTour(localStorage)) state.guide.tour = 0;
}
function setView(view) {
  if (!navById(view)) return;
  state.view = view; state.guide.sheet = null; state.modeDialog = false;
  if (view === 'tasks' || view === 'overview') state.works = listWorks();
  maybeStartTour(view);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}
function setCreateTab(tab) {
  state.createTab = tab;
  state.wizard = { ...state.wizard, experience: tab };
  render();
}

/* ---------------- 数据加载 ---------------- */
async function loadConfig() {
  try { const d = await api.config(); state.config = { ...state.config, ...d }; } catch { /* 保留默认 */ }
  render();
}
async function loadQuota() {
  try { state.quota = await api.quota(); } catch { state.quota = null; }
  render();
}

/* ---------------- 创作动作 ---------------- */
async function runVideo() {
  const w = state.wizard;
  const v = validateText(w.text, 4, 200);
  if (!v.ok) { state.wizard = { ...w, error: v.message }; return render(); }
  state.wizard = { ...w, busy: true, error: '', status: 'running', progress: 5, result: null, stage: '已提交' };
  render();
  try {
    const tts = await api.tts(w.text, 0);
    state.wizard.progress = 20; state.wizard.stage = '配音完成'; render();
    const created = await api.avatar({ text: w.text, audioUrl: tts.audio_url, duration: tts.duration_ms / 1000 });
    const product = await pollTask(created.taskId, {
      onProgress: ({ percent }) => { state.wizard.progress = percent; state.wizard.stage = stageLabel(percent); render(); },
    });
    state.wizard = {
      ...state.wizard, busy: false, step: 2, status: 'done', progress: 100, stage: '完成',
      result: { videoUrl: product.videoPath, duration: product.duration, watermark: product.watermark, thumb: product.thumbPath, taskId: created.taskId },
    };
    render();
    toast('生成完成，往下看「结果解读」');
  } catch (e) {
    state.wizard = { ...state.wizard, busy: false, status: 'error', error: e.message };
    render();
  }
}
function fillSample() {
  state.wizard = { ...state.wizard, text: '新款智能手表今天上市，支持全天心率监测、睡眠分析与运动记录，轻巧续航七天，欢迎到店体验。', error: '' };
  render();
}
function saveWork() {
  const r = state.createTab === 'video' ? state.wizard.result : state.voice.result;
  if (!r) return;
  const isVideo = state.createTab === 'video';
  addWork({
    type: isVideo ? '视频口播' : '语音试听',
    title: (isVideo ? state.wizard.text : state.voice.text).slice(0, 18) + '…',
    url: isVideo ? r.videoUrl : r.audio_url,
    duration: isVideo ? r.duration : Math.round(r.duration_ms / 1000),
  });
  state.works = listWorks();
  toast('已保存到「任务与作品」，7 天内可查看');
}

async function runVoice() {
  const v = validateText(state.voice.text, 4, 200);
  if (!v.ok) { state.voice.error = v.message; return render(); }
  state.voice.busy = true; state.voice.error = ''; state.voice.result = null; render();
  try { state.voice.result = await api.tts(state.voice.text, 0); } catch (e) { state.voice.error = e.message; }
  state.voice.busy = false; render();
}

async function sendChat(text) {
  const q = String(text ?? state.chat.input).trim();
  if (!q || state.chat.streaming) return;
  state.chat.input = '';
  state.chat.messages.push({ role: 'user', text: q });
  const idx = state.chat.messages.push({ role: 'assistant', text: '' }) - 1;
  state.chat.streaming = true; state.chat.error = ''; render();
  const ctrl = new AbortController(); state.chat.abort = ctrl;
  try {
    const answer = await chatStream(q, { signal: ctrl.signal, onDelta: (partial) => { state.chat.messages[idx].text = partial; renderKeepChat(); } });
    state.chat.messages[idx].text = answer;
  } catch (e) {
    if (e.name === 'AbortError') state.chat.messages[idx].text += '\n（已停止）';
    else state.chat.error = e.message;
  }
  state.chat.streaming = false; state.chat.abort = null; render();
}
function stopChat() { state.chat.abort?.abort(); }
function renderKeepChat() {
  render();
  const nb = document.getElementById('chat-box'); if (nb) nb.scrollTop = nb.scrollHeight;
}

/* ---------------- 通用能力体验器 ---------------- */
function openExperience(capId) {
  const cap = capById(capId);
  if (!cap) return toast('未知能力：' + capId);
  state.exp = { capId, running: false, percent: 0, result: null, error: '' };
  state.view = 'experience';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}
function collectExpParams() {
  const params = {};
  document.querySelectorAll('.exp-input').forEach((el) => { params[el.dataset.field] = el.value; });
  return params;
}
async function runExperience() {
  const cap = capById(state.exp.capId);
  if (!cap || state.exp.running) return;
  const params = collectExpParams();
  state.exp = { ...state.exp, running: true, percent: 5, result: null, error: '' };
  render();
  try {
    const result = await runCapabilityFlow(cap.id, params, {
      onProgress: ({ percent }) => { state.exp.percent = percent; render(); },
    });
    state.exp = { ...state.exp, running: false, percent: 100, result };
    render();
    toast('运行完成，往下看结果');
  } catch (e) {
    state.exp = { ...state.exp, running: false, error: e.message };
    render();
  }
}
function resetExperience() {
  const cap = capById(state.exp.capId);
  state.exp = { capId: cap?.id || null, running: false, percent: 0, result: null, error: '' };
  render();
}
function saveExperienceWork() {
  const r = state.exp.result;
  if (!r) return;
  const cap = capById(state.exp.capId);
  const url = r.videoUrl || r.audioUrl || r.imageUrl || '';
  addWork({ type: cap?.name || '能力体验', title: r.title || cap?.name || '体验结果', url: url || 'data:text/plain,' + encodeURIComponent(r.jsonText || r.text || ''), duration: r.duration || 0 });
  state.works = listWorks();
  toast('已保存到「任务与作品」');
}
function copyExperience() {
  const r = state.exp.result;
  const t = r?.jsonText || r?.text || '';
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(() => toast('已复制')).catch(() => toast('复制失败'));
  else toast('当前浏览器不支持自动复制');
}

/* ---------------- 环境切换 ---------------- */
async function confirmMode() {
  const next = state.config.mode === 'mock' ? 'real' : 'mock';
  state.modeDialog = false;
  try {
    const d = await api.setMode(next);
    state.config = { ...state.config, ...d, modeChangeError: '' };
    toast(next === 'real' ? '已切换到真实环境' : '已切换到演示环境');
    await loadConfig(); await loadQuota();
  } catch (e) {
    state.config = { ...state.config, modeChangeError: e.message };
    toast('切换失败：' + e.message);
  }
  render();
}

/* ---------------- 渲染 ---------------- */
function render() {
  const s = state;
  const isSite = ['home', 'capabilities', 'scenarios', 'integration'].includes(s.view);
  const isExperience = s.view === 'experience';
  let pageHtml;
  if (isExperience) {
    const cap = capById(s.exp.capId);
    pageHtml = cap ? `<div class="console">
        ${E.experienceForm(cap)}
        ${s.exp.running ? E.experienceRunning(s.exp.percent) : ''}
        ${s.exp.error ? `<div class="hint hint--err">✗ ${esc(s.exp.error)}</div>` : ''}
        ${s.exp.result ? E.experienceResult(s.exp.result) : ''}
      </div>` : '<div class="console"><div class="card">能力不存在</div></div>';
  } else {
    const page = {
      home: V.homeView, capabilities: V.capabilitiesView, scenarios: V.scenariosView, integration: V.integrationView,
      overview: V.overviewView, create: V.createView, tasks: V.tasksView, catalog: E.catalogWithExperience,
      settings: V.settingsView,
    }[s.view] || V.homeView;
    pageHtml = page(s);
  }
  const barTitle = isExperience ? '能力体验' : ({ overview: '工作台总览', create: '创作中心', tasks: '任务与作品', catalog: '能力目录', settings: '环境与配置' })[s.view] || '工作台';

  app.innerHTML = `<div class="app ${isSite ? 'app--site' : 'app--console'}">
    ${V.topbar(s)}
    ${isSite ? `<main class="site-main">${pageHtml}</main>` : `
      <div class="console-shell">${V.sidenav(s)}<main class="console-main">${V.consoleBar(s, barTitle)}${pageHtml}</main></div>`}
    ${V.footer()}
    ${s.guide.explain ? '<div class="explain-bar">讲解模式已开启：点击任意按钮，看它做什么</div>' : ''}
    ${V.guideOverlays(s)}
    ${s.modeDialog ? V.modeDialog(s) : ''}
    ${s.toast ? `<div class="toast">${esc(s.toast)}</div>` : ''}
  </div>`;
  bind();
  highlightTourTarget();
}
function highlightTourTarget() {
  if (state.guide.tour < 0) return;
  const el = document.querySelector(TOUR_STEPS[state.guide.tour].selector);
  if (el?.scrollIntoView) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('tour-target'); }
}

function bind() {
  // 导航
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  // 能力矩阵筛选
  document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { state.capFilter = b.dataset.filter; render(); }));
  // 首页能力卡片 → 能力矩阵对应分组
  document.querySelectorAll('[data-group]').forEach((b) => b.addEventListener('click', () => { state.capFilter = b.dataset.group; setView('capabilities'); }));
  // 能力表「体验」→ 统一体验器（全部能力可体验）
  document.querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => openExperience(b.dataset.use)));
  // 快速开始 / 体验选择
  document.querySelectorAll('[data-experience]').forEach((b) => b.addEventListener('click', () => { setCreateTab(b.dataset.experience); setView('create'); }));
  document.querySelectorAll('[data-create]').forEach((b) => b.addEventListener('click', () => setCreateTab(b.dataset.create)));
  // 环境
  document.getElementById('btn-mode')?.addEventListener('click', () => { state.modeDialog = true; render(); });
  document.getElementById('btn-mode-confirm')?.addEventListener('click', confirmMode);
  document.getElementById('btn-mode-cancel')?.addEventListener('click', () => { state.modeDialog = false; render(); });
  document.getElementById('sheet-mask')?.addEventListener('click', () => { state.modeDialog = false; state.guide.sheet = null; render(); });
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    if ((state.config.mode === 'mock' ? 'mock' : 'real') === b.dataset.mode) return;
    state.modeDialog = true; render();
  }));
  // 创作
  document.getElementById('video-text')?.addEventListener('input', (e) => { state.wizard.text = e.target.value; });
  document.getElementById('btn-sample')?.addEventListener('click', fillSample);
  document.getElementById('btn-generate')?.addEventListener('click', runVideo);
  document.getElementById('btn-regenerate')?.addEventListener('click', runVideo);
  document.getElementById('btn-save-work')?.addEventListener('click', saveWork);
  document.getElementById('voice-text')?.addEventListener('input', (e) => { state.voice.text = e.target.value; });
  document.getElementById('btn-tts')?.addEventListener('click', runVoice);
  // 客服
  document.getElementById('chip-q1')?.addEventListener('click', () => sendChat('这个平台能做什么？'));
  document.getElementById('chip-q2')?.addEventListener('click', () => sendChat('生成视频要多久？'));
  document.getElementById('btn-chat-send')?.addEventListener('click', () => sendChat());
  document.getElementById('btn-chat-stop')?.addEventListener('click', stopChat);
  document.getElementById('chat-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
  document.getElementById('chat-input')?.addEventListener('input', (e) => { state.chat.input = e.target.value; });
  // 作品
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    if (!window.confirm('确认删除这条作品记录？')) return;
    removeWork(b.dataset.del); state.works = listWorks(); render(); toast('已删除');
  }));
  document.getElementById('btn-works-clear')?.addEventListener('click', () => {
    if (!window.confirm('确认清空全部作品记录？')) return;
    clearWorks(); state.works = []; render(); toast('已清空');
  });
  // 通用能力体验器
  document.getElementById('btn-exp-run')?.addEventListener('click', runExperience);
  document.getElementById('btn-exp-reset')?.addEventListener('click', resetExperience);
  document.getElementById('btn-exp-save')?.addEventListener('click', saveExperienceWork);
  document.getElementById('btn-exp-copy')?.addEventListener('click', copyExperience);

  // 引导
  document.getElementById('btn-help-close')?.addEventListener('click', () => { state.guide.sheet = null; render(); });
  document.getElementById('tour-next')?.addEventListener('click', () => {
    const n = nextTourStep(state.guide.tour);
    if (n < 0) { state.guide.tour = -1; markTourDone(localStorage); } else state.guide.tour = n;
    render();
  });
  document.getElementById('tour-skip')?.addEventListener('click', () => { state.guide.tour = -1; markTourDone(localStorage); render(); });
  const chatBox = document.getElementById('chat-box'); if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

/* ---------------- 启动 ---------------- */
const DEMO = new URLSearchParams(location.search).get('demo');
mountExplain(() => state.guide.explain, (hp) => { state.guide.sheet = hp; render(); });
state.works = listWorks();
render();
loadConfig();
loadQuota();
// 首次访问营销首页不弹引导；DEMO 参数用于自动化演示
if (!DEMO) maybeStartTour(state.view);
render();
if (DEMO === 'video') { setCreateTab('video'); setView('create'); setTimeout(runVideo, 300); }
else if (DEMO === 'chat') { setCreateTab('chat'); setView('create'); setTimeout(() => sendChat('这个平台能做什么？'), 300); }
else if (DEMO === 'capabilities') setView('capabilities');
