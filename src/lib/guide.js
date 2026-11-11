// guide.js —— 交互引导：按钮说明 + 新手引导 + 讲解模式
export const HELP = {
  'nav-home': { title: '首页', what: '回到产品首页，看看有哪些能力可以体验', result: '页面切换，不会产生任何任务或费用' },
  'nav-video': { title: '视频口播', what: '输入一段文案，生成一个带 AI 水印的数字人口播视频', result: '大约十几秒后出现成片，可保存到我的作品' },
  'nav-voice': { title: '语音试听', what: '把文字转成语音，试听不同音色', result: '出现播放器，显示音频时长，可下载 mp3' },
  'nav-chat': { title: 'AI 客服', what: '和数字人客服聊天，体验流式回答', result: '回答会逐字出现，可随时停止' },
  'nav-works': { title: '我的作品', what: '查看本机保存的体验结果，7 天内有效', result: '列表显示作品与剩余天数，可删除' },
  'nav-help': { title: '帮助', what: '查看每个按钮的用途与常见问题', result: '打开帮助页，不改变任何数据' },
  'toggle-explain': { title: '讲解模式', what: '开启后点击任意按钮，会解释这个按钮做什么、会产生什么结果', result: '页面出现讲解提示，不影响操作' },
  'start-tour': { title: '新手引导', what: '按顺序高亮页面上的关键位置，带着你走一遍', result: '出现引导气泡，可下一步或跳过' },
  'pick-video': { title: '开始视频口播', what: '进入视频口播体验，按步骤填写文案', result: '进入三步向导，不会立即生成' },
  'pick-voice': { title: '开始语音试听', what: '进入语音试听体验', result: '进入文字转语音页面' },
  'pick-chat': { title: '开始 AI 客服', what: '进入客服对话体验', result: '进入聊天页面' },
  'btn-sample': { title: '填入示例', what: '自动填入一段课程示例文案，方便快速体验', result: '输入框出现示例文字，不会生成任务' },
  'btn-prev': { title: '上一步', what: '回到上一步修改内容，不会提交任务', result: '步骤回退，之前填的内容保留' },
  'btn-next': { title: '下一步', what: '检查当前内容是否合格，合格后进入下一步', result: '内容合格则前进；不合格会提示原因' },
  'btn-generate': { title: '生成视频', what: '先调用 TTS 配音，再提交图片数字人任务并轮询结果', result: '出现 4 阶段进度；完成后显示成片与解读' },
  'btn-regenerate': { title: '重新生成', what: '用同样内容再生成一条（演示环境不会重复计费）', result: '重新走一遍任务，旧结果保留可对比' },
  'btn-save-work': { title: '保存到我的作品', what: '把成片信息保存到本机，方便之后查看', result: '作品 +1，可在"我的作品"看到，7 天有效' },
  'btn-download': { title: '下载结果', what: '下载当前音频或视频文件', result: '浏览器开始下载，不产生费用' },
  'btn-tts': { title: '生成语音', what: '把文字合成为语音并返回音频地址与时长', result: '出现播放器与时长解释' },
  'btn-chat-send': { title: '发送', what: '把问题发给 AI 客服，回答会流式返回', result: '用户气泡 + 逐字出现的回答' },
  'btn-chat-stop': { title: '停止回答', what: '中断当前回答（不会删除已显示的内容）', result: '回答停止追加，可继续提问' },
  'chip-q1': { title: '示例问题 1', what: '填入一个示例问题，省得自己打字', result: '输入框出现示例问题' },
  'chip-q2': { title: '示例问题 2', what: '填入第二个示例问题', result: '输入框出现示例问题' },
  'btn-works-delete': { title: '删除作品', what: '从本机列表中删除这条作品记录（需确认）', result: '列表少一条；不影响云端文件' },
  'btn-works-clear': { title: '清空作品', what: '清空本机保存的全部作品记录（需确认）', result: '列表变空，可重新体验' },
  'btn-reset-demo': { title: '重置演示', what: '清空服务端任务与本机作品，回到初始状态', result: '可以重新开始演示' },
  'btn-help-close': { title: '关闭说明', what: '关闭按钮说明气泡', result: '气泡消失' },
  'deploy-guide': { title: '部署说明', what: '查看如何把本平台部署到云服务器', result: '滚动到部署说明区' },
};

export function helpFor(id) { return HELP[id] || null; }

/** 讲解模式：拦截带 data-help 的控件点击，展示说明（不阻止原操作） */
export function mountExplain(getEnabled, showSheet) {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-help]');
    if (!el || !getEnabled()) return;
    const h = helpFor(el.dataset.help);
    if (h) showSheet(h);
  }, true);
}

export function tooltipAttr(id) { const h = helpFor(id); return h ? `data-help="${id}" title="${h.title}：${h.what}"` : ''; }

// ---- 新手引导：步骤与持久化（纯函数，便于测试）----
// 产品版引导：仅在工作台触发，选择器全部指向当前真实存在的元素
export const TOUR_STEPS = [
  { selector: '[data-view="create"]', title: '从创作中心开始', text: '工作台里可以生成视频、试听语音、和 AI 问答。' },
  { selector: '.create-tabs', title: '三种可体验能力', text: '视频口播、语音试听、流式问答，点标签切换。' },
  { selector: '#btn-sample', title: '不会写文案？', text: '点「填入示例」自动填一段，再改成你的内容。' },
  { selector: '#btn-generate', title: '点一下生成', text: '先配音、再合成，进度条会显示每个阶段。' },
  { selector: '[data-view="capabilities"]', title: '看看全部能力', text: '能力矩阵列出平台 6 大类能力与接入状态。' },
];
export function nextTourStep(index) { return index + 1 < TOUR_STEPS.length ? index + 1 : -1; }
export function shouldShowTour(storage) { try { return storage.getItem('ruying_tour_done_v2') !== '1'; } catch { return true; } }
export function markTourDone(storage) { try { storage.setItem('ruying_tour_done_v2', '1'); } catch { /* ignore */ } }

// ---- 结果四行解读（纯函数）----
export const INTERPRET = {
  avatar: (r) => [
    { label: '看到了什么', text: `一支约 ${r?.duration ?? 5.8} 秒的成片，画面带"AI生成"水印` },
    { label: '它说明什么', text: '文字先被合成为配音，再驱动图片数字人口型，最后编码成视频' },
    { label: '怎样算对', text: `状态显示完成；时长约 ${r?.duration ?? 5.8} 秒；能播放；水印为"AI生成"` },
    { label: '不对先查什么', text: '① 文案是否 ≥4 字 ② 配音是否成功 ③ 任务是否还在排队（等待几秒再看）' },
  ],
  voice: (r) => [
    { label: '看到了什么', text: `播放器可播放，时长约 ${((r?.duration_ms ?? 0) / 1000).toFixed(1)} 秒` },
    { label: '它说明什么', text: 'TTS 把文字逐字合成语音，时长与字数基本成正比' },
    { label: '怎样算对', text: '能播放；时长 = 字数 ÷ 3.8 秒左右；无报错' },
    { label: '不对先查什么', text: '① 文字是否 ≥4 字 ② 音色是否选好 ③ 网络是否断开' },
  ],
  chat: () => [
    { label: '看到了什么', text: '回答逐字出现，最后停在完整句子' },
    { label: '它说明什么', text: '大模型以流式（SSE）返回，前端边收边渲染' },
    { label: '怎样算对', text: '回答完整、没有乱码；点"停止"能中断' },
    { label: '不对先查什么', text: '① 是否点过"停止" ② 网络是否断开 ③ 刷新后重试' },
  ],
};
