// views.js —— 产品视图渲染（纯函数：state → HTML）
import { PRODUCT, DEMO_NOTICE, NAV_SECTIONS } from './product.js';
import { GROUPS, CAPABILITIES, SCENARIOS, INTEGRATION_STEPS, capsOf, stats, readyCaps, capById, groupOf, OUTPUT_LABEL } from './capabilities.js';
import { INTERPRET, HELP, TOUR_STEPS } from './guide.js';
import { EXPERIENCES } from './wizard.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


/* ============ 框架 ============ */
export function topbar(s) {
  const mode = s.config?.mode || 'mock';
  return `<header class="topbar"><div class="topbar__inner">
    <button class="brand" data-view="home" aria-label="返回首页">
      <span class="brand__mark">如</span>
      <span class="brand__text"><b>${PRODUCT.name}</b><small>${PRODUCT.vendor} · PaaS 能力门户</small></span>
    </button>
    <div class="topbar__spacer"></div>
    <button class="env-switch ${mode === 'mock' ? 'is-demo' : 'is-real'}" id="btn-mode" title="点击切换运行环境">
      <i></i>${mode === 'mock' ? '演示环境' : '真实环境'}<span class="env-switch__arrow">⇄</span>
    </button>
    <a class="btn btn--ghost topbar__link" href="${PRODUCT.docsUrl}" target="_blank" rel="noreferrer">产品文档 ↗</a>
    <button class="btn btn--primary" data-view="create">进入工作台</button>
  </div></header>`;
}

export function sidenav(s) {
  return `<aside class="sidenav">${NAV_SECTIONS.map((sec) => `
    <div class="nav-group"><div class="nav-group__label">${sec.label}</div>
      ${sec.items.map((it) => `<button class="nav-item ${s.view === it.id ? 'is-active' : ''}" data-view="${it.id}">
        <span class="nav-item__icon">${it.icon}</span><span>${it.label}</span>
        ${it.id === 'tasks' && s.works.length ? `<em>${s.works.length}</em>` : ''}
      </button>`).join('')}
    </div>`).join('')}
    <div class="sidenav__foot">
      <div class="quota-mini">
        <div class="quota-mini__head"><span>本月用量</span><b>${s.quota?.usedPct ?? 0}%</b></div>
        <div class="quota-mini__bar"><i style="width:${s.quota?.usedPct ?? 0}%"></i></div>
        <small>${s.quota ? `${s.quota.videoUsed} / ${s.quota.videoTotal} 分钟视频` : '读取中…'}</small>
      </div>
      <div class="sidenav__version">${PRODUCT.shortName} v${PRODUCT.version}</div>
    </div>
  </aside>`;
}

export function footer() {
  return `<footer class="footer"><span>© 2026 ${PRODUCT.vendor} · ${PRODUCT.name}</span>
    <span class="footer__sep">·</span><span>AI 生成内容请按规定添加显式标识</span>
    <span class="footer__sep">·</span><a href="${PRODUCT.docsUrl}" target="_blank" rel="noreferrer">官方文档</a>
    <span class="footer__right">v${PRODUCT.version}</span></footer>`;
}

/* ============ 产品官网区 ============ */
export function homeView(s) {
  const st = stats();
  return `<div class="site">
    <section class="hero">
      <div class="hero__bg"></div>
      <div class="hero__inner">
        <div class="hero__badge"><i></i> 数字人 PaaS · 能力即服务</div>
        <h1>${esc(PRODUCT.tagline)}</h1>
        <p class="hero__lead">${esc(PRODUCT.description)}</p>
        <div class="hero__actions">
          <button class="btn btn--primary btn--lg" data-view="create">立即体验能力 →</button>
          <button class="btn btn--lg btn--outline" data-view="capabilities">查看能力矩阵</button>
        </div>
        <div class="hero__stats">
          <div><b>${st.groups}</b><span>能力大类</span></div>
          <div><b>${st.capabilities}</b><span>平台能力</span></div>
          <div><b>${st.ready}</b><span>即刻可体验</span></div>
          <div><b>${st.scenarios}</b><span>行业场景</span></div>
        </div>
      </div>
    </section>

    <div class="notice-bar"><span class="notice-bar__icon">ⓘ</span><span>${esc(DEMO_NOTICE)}</span>
      <button class="btn btn--ghost btn--sm" data-view="settings">环境设置</button></div>

    <section class="section">
      <div class="section__head"><div><span class="eyebrow">CAPABILITIES</span><h2>一套 API，覆盖数字人内容生产全链路</h2>
        <p>按平台 8 大模块组织，从形象、音色到成片、互动，能力可组合、可集成。</p></div>
        <button class="btn" data-view="capabilities">全部能力 →</button></div>
      <div class="cap-grid">${GROUPS.map((g) => {
        const cs = capsOf(g.id); const ready = cs.filter((c) => c.status === 'ready').length;
        return `<button class="cap-card" data-group="${g.id}" style="--accent:${g.accent}">
          <div class="cap-card__icon">${g.icon}</div>
          <h3>${g.name}</h3><p>${esc(g.desc)}</p>
          <div class="cap-card__foot"><span>${cs.length} 项能力</span><span class="cap-card__dot ${ready ? 'on' : ''}">${ready ? '全部可体验' : '可体验'}</span></div>
        </button>`;
      }).join('')}</div>
    </section>

    <section class="section section--alt">
      <div class="section__head"><div><span class="eyebrow">SCENARIOS</span><h2>从场景出发，选能力组合</h2>
        <p>不同行业的落地路径，都落在同一套开放能力之上。</p></div></div>
      <div class="scene-grid">${SCENARIOS.map((sc) => `
        <div class="scene-card"><div class="scene-card__icon">${sc.icon}</div>
          <h3>${sc.name}</h3><p>${esc(sc.desc)}</p>
          <div class="scene-card__tags">${sc.caps.map((id) => { const c = capById(id); return c ? `<span>${esc(c.name)}</span>` : ''; }).join('')}</div>
        </div>`).join('')}</div>
    </section>

    <section class="section">
      <div class="section__head"><div><span class="eyebrow">INTEGRATION</span><h2>四步接入，凭据不出服务端</h2>
        <p>与官方「快速集成」一致：签名换取 Token → 调用能力 → 取回成果。</p></div>
        <a class="btn" href="${PRODUCT.docsUrl}" target="_blank" rel="noreferrer">接入文档 ↗</a></div>
      <div class="steps-grid">${INTEGRATION_STEPS.map((x) => `
        <div class="step-card"><div class="step-card__n">${x.n}</div><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div>`).join('')}</div>
    </section>

    <section class="cta"><div class="cta__inner"><h2>现在就看看能力长什么样</h2>
      <p>无需注册、无需密钥，演示环境直接体验；准备好后可一键切换真实环境。</p>
      <div class="cta__actions"><button class="btn btn--primary btn--lg" data-view="create">打开工作台</button>
      <button class="btn btn--lg btn--outline" data-view="overview">查看总览</button></div></div></section>
  </div>`;
}

export function capabilitiesView(s) {
  const filter = s.capFilter || 'all';
  const list = filter === 'all' ? CAPABILITIES : CAPABILITIES.filter((c) => c.group === filter);
  return `<div class="site site--inner">
    <div class="page-head"><span class="eyebrow">CAPABILITY CATALOG</span><h1>能力矩阵</h1>
      <p>平台全部能力的索引，标注了本工作台的可体验状态与对应接口。</p></div>
    <div class="filter-row">
      <button class="chip ${filter === 'all' ? 'is-on' : ''}" data-filter="all">全部 ${CAPABILITIES.length}</button>
      ${GROUPS.map((g) => `<button class="chip ${filter === g.id ? 'is-on' : ''}" data-filter="${g.id}">${g.icon} ${g.name}</button>`).join('')}
    </div>
    <div class="cap-table-wrap"><table class="table cap-table">
      <thead><tr><th>能力</th><th>所属</th><th>说明 / 场景</th><th>输出</th><th>接口</th><th></th></tr></thead>
      <tbody>${list.map((c) => `<tr>
        <td><b>${esc(c.name)}</b>${c.tag ? `<span class="tag">${esc(c.tag)}</span>` : ''}</td>
        <td>${groupOf(c.group)?.name ?? ''}</td>
        <td><span class="muted">${esc(c.desc)}</span><small class="cell-scene">${esc(c.scene)}</small></td>
        <td><span class="status st-ready">${OUTPUT_LABEL[c.experience?.output] || '文本'}</span></td>
        <td><code class="code-sm">${esc(c.api)}</code></td>
        <td><button class="btn btn--sm btn--primary" data-use="${c.id}">体验 →</button></td>
      </tr>`).join('')}</tbody></table></div>
    <div class="hint-block">全部 ${CAPABILITIES.length} 项能力均已接入工作台，点「体验」可直接运行；能力口径依据官方产品文档与平台后台 8 大模块整理。</div>
  </div>`;
}

export function scenariosView() {
  return `<div class="site site--inner">
    <div class="page-head"><span class="eyebrow">SCENARIOS</span><h1>应用场景</h1><p>按行业看能力如何组合成可落地的解决方案。</p></div>
    <div class="scene-detail">${SCENARIOS.map((sc, i) => `
      <div class="scene-row"><div class="scene-row__num">0${i + 1}</div>
        <div class="scene-row__icon">${sc.icon}</div>
        <div class="scene-row__body"><h2>${sc.name}</h2><p>${esc(sc.desc)}</p>
          <div class="scene-row__caps">${sc.caps.map((id) => { const c = capById(id); return c ? `<span class="cap-pill">${esc(c.name)}<small>${OUTPUT_LABEL[c.experience?.output] || '文本'}</small></span>` : ''; }).join('')}</div>
        </div></div>`).join('')}</div>
  </div>`;
}

export function integrationView() {
  return `<div class="site site--inner">
    <div class="page-head"><span class="eyebrow">INTEGRATION GUIDE</span><h1>接入指南</h1>
      <p>从凭据到成果的完整路径。所有密钥只存在于服务端，前端永远拿不到。</p></div>
    <div class="integration-steps">${INTEGRATION_STEPS.map((x, i) => `
      <div class="int-step"><div class="int-step__rail"><span>${x.n}</span>${i < INTEGRATION_STEPS.length - 1 ? '<i></i>' : ''}</div>
        <div class="int-step__body"><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div></div>`).join('')}</div>
    <div class="grid-2">
      <div class="card"><div class="card__title"><h2>安全边界</h2><span class="pill pill--ok">默认开启</span></div>
        <ul class="check-list">
          <li>APP_ID / APP_KEY 仅保存在服务端 <code>.env</code>，不进入前端产物</li>
          <li>Token 服务端缓存、并发合并、提前刷新，不下发浏览器</li>
          <li>计费接口白名单校验，未显式开启 <code>ALLOW_BILLABLE</code> 时拒绝调用</li>
          <li>所有 AI 生成内容对外发布前添加「AI生成」显式标识</li>
        </ul></div>
      <div class="card"><div class="card__title"><h2>两种运行环境</h2></div>
        <table class="table"><thead><tr><th></th><th>演示环境</th><th>真实环境</th></tr></thead><tbody>
          <tr><td>数据来源</td><td>本地模拟</td><td>如影 PaaS 真实 API</td></tr>
          <tr><td>费用</td><td><b class="ok">0 元</b></td><td>按平台计费</td></tr>
          <tr><td>凭据</td><td>不需要</td><td>需配置 .env</td></tr>
          <tr><td>适用</td><td>客户演示 / 培训</td><td>生产集成</td></tr>
        </tbody></table>
        <button class="btn" style="margin-top:14px" data-view="settings">前往环境设置 →</button></div>
    </div>
  </div>`;
}

/* ============ 工作台区 ============ */
export function consoleBar(s, title) {
  const mode = s.config?.mode || 'mock';
  return `<div class="console-bar"><div><span class="eyebrow">WORKSPACE</span><h1>${esc(title || '工作台')}</h1></div>
    <div class="console-bar__right"><span class="pill ${mode === 'mock' ? 'pill--mock' : 'pill--ok'}">${mode === 'mock' ? '演示模式 · 零费用' : '真实模式 · 计费'}</span>
    <button class="btn btn--sm" data-view="settings">环境配置</button></div></div>`;
}

export function overviewView(s) {
  const q = s.quota || { videoUsed: 0, videoTotal: 20, usedPct: 0, works: 0 };
  const recent = s.works.slice(0, 5);
  return `<div class="console">
    <div class="kpi-grid">
      <div class="kpi"><span>可体验能力</span><b>${readyCaps().length}</b><small>共 ${CAPABILITIES.length} 项平台能力</small></div>
      <div class="kpi"><span>我的作品</span><b>${s.works.length}</b><small>本地保存 · 7 天有效</small></div>
      <div class="kpi"><span>视频用量</span><b>${q.videoUsed}<i>min</i></b><small>配额 ${q.videoTotal} min</small></div>
      <div class="kpi"><span>运行环境</span><b class="kpi__mode">${(s.config?.mode || 'mock') === 'mock' ? '演示' : '真实'}</b><small>可在环境配置切换</small></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card__title"><h2>快速开始</h2><span class="pill pill--info">推荐路径</span></div>
        <div class="quick-list">${EXPERIENCES.map((e) => `
          <button class="quick-item" data-experience="${e.id}"><span class="quick-item__icon">${e.icon}</span>
            <span><b>${esc(e.name)}</b><small>${esc(e.desc)}</small></span><span class="quick-item__arrow">→</span></button>`).join('')}</div></div>
      <div class="card"><div class="card__title"><h2>资源用量</h2><button class="btn btn--sm" data-view="settings">详情</button></div>
        <div class="quota-list">${(s.quota?.items || []).map((it) => `
          <div class="quota-item"><div class="quota-item__head"><span>${esc(it.name)}</span><b>${esc(it.used)} / ${esc(it.total)}</b></div>
            <div class="quota-item__bar"><i style="width:${it.pct}%"></i></div></div>`).join('') || '<div class="empty">读取中…</div>'}</div></div>
    </div>
    <div class="card"><div class="card__title"><h2>最近作品</h2><button class="btn btn--sm" data-view="tasks">查看全部 →</button></div>
      ${recent.length ? `<table class="table"><thead><tr><th>名称</th><th>类型</th><th>创建时间</th><th>剩余</th><th></th></tr></thead><tbody>
        ${recent.map((w) => `<tr><td><b>${esc(w.title)}</b></td><td>${esc(w.type)}</td><td class="muted">${esc(w.createdAt || '—')}</td>
          <td>${w.days} 天</td><td><a class="btn btn--sm" href="${esc(w.url)}" target="_blank" rel="noreferrer">查看</a></td></tr>`).join('')}
      </tbody></table>` : '<div class="empty"><div class="empty__icon">📁</div><p>还没有作品，去创作中心生成第一条吧。</p></div>'}</div>
  </div>`;
}

export function createView(s) {
  const active = s.createTab || 'video';
  return `<div class="console">
    <div class="create-tabs">${EXPERIENCES.map((e) => `<button class="create-tab ${active === e.id ? 'is-active' : ''}" data-create="${e.id}">${e.icon} ${esc(e.name)}</button>`).join('')}</div>
    ${active === 'video' ? videoForm(s) : active === 'voice' ? voiceForm(s) : chatForm(s)}
  </div>`;
}

function videoForm(s) {
  const w = s.wizard;
  const input = `<div class="card"><div class="card__title"><h2>① 写一段口播文案</h2>
      <span class="pill pill--info">${[...w.text.replace(/\s/g, '')].length} 字</span></div>
    <textarea class="editor" id="video-text" style="min-height:110px" placeholder="例如：新款智能手表上市，支持全天心率监测与运动记录…">${esc(w.text)}</textarea>
    <div class="form-grid" style="margin-top:10px">
      <div class="form-field"><label>音色</label><select class="input" id="video-voice"><option value="0">亲和（中文女声）</option><option value="1">沉稳（中文男声）</option></select></div>
      <div class="form-field"><label>预计时长</label><input class="input" value="${(w.text ? Math.round(([...w.text.replace(/\s/g, '')].length / 3.8) * 10) / 10 : 0)} 秒" disabled /></div></div>
    <div class="token-actions"><button class="btn" id="btn-sample">填入示例</button>
      <button class="btn btn--primary" id="btn-generate" ${w.busy ? 'disabled' : ''}>${w.busy ? '生成中…' : '生成视频 →'}</button></div>
    ${w.error ? `<div class="hint hint--err">✗ ${esc(w.error)}</div>` : ''}
    <div class="explain-card">文案会先合成为配音，再驱动数字人口型生成视频；字数决定时长。AI 生成内容自动带「AI生成」水印。</div></div>`;
  const running = (w.busy || w.status === 'running') ? `<div class="card"><div class="card__title"><h2>正在生成</h2>
      <span class="pill pill--warn">${w.stage || '已提交'}</span></div>
    <div class="progress-bar"><i style="width:${w.progress}%"></i></div>
    <div class="hint">阶段估算：提交 → 配音 → 排队 → 生成 → 完成</div></div>` : '';
  const result = w.result ? `<div class="card" id="result-card"><div class="card__title"><h2>③ 你的成片</h2><span class="pill pill--ok">带 AI生成 水印</span></div>
      <video controls playsinline poster="/files/mock_thumb.png" src="${esc(w.result.videoUrl)}" style="width:100%;max-height:360px;border-radius:10px;background:#000"></video>
      <div class="download-row"><button class="btn" id="btn-save-work">保存到作品</button>
        <a class="btn" href="${esc(w.result.videoUrl)}" download>下载结果</a>
        <button class="btn" id="btn-regenerate">重新生成</button></div>
      <div class="interpret">${INTERPRET.avatar(w.result).map((l) => `<div class="line"><b>${l.label}</b><span>${esc(l.text)}</span></div>`).join('')}</div></div>` : '';
  return input + running + result;
}

function voiceForm(s) {
  const v = s.voice;
  return `<div class="card"><div class="card__title"><h2>文字转语音</h2><span class="pill pill--info">${[...v.text.replace(/\s/g, '')].length} 字</span></div>
    <textarea class="editor" id="voice-text" style="min-height:90px">${esc(v.text)}</textarea>
    <div class="form-grid" style="margin-top:10px"><div class="form-field"><label>音色</label>
      <select class="input" id="voice-voice"><option value="0">亲和（中文女声）</option><option value="1">沉稳（中文男声）</option></select></div></div>
    <div class="token-actions"><button class="btn btn--primary" id="btn-tts" ${v.busy ? 'disabled' : ''}>${v.busy ? '合成中…' : '生成语音 →'}</button></div>
    ${v.error ? `<div class="hint hint--err">✗ ${esc(v.error)}</div>` : ''}
    ${v.result ? `<div style="margin-top:12px"><audio controls src="${esc(v.result.audio_url)}" style="width:100%"></audio>
      <div class="download-row"><button class="btn" id="btn-save-work">保存到作品</button>
        <a class="btn" href="${esc(v.result.audio_url)}" download>下载 mp3</a></div>
      <div class="interpret">${INTERPRET.voice(v.result).map((l) => `<div class="line"><b>${l.label}</b><span>${esc(l.text)}</span></div>`).join('')}</div></div>` : ''}
    <div class="explain-card">文字合成为 mp3 音频，时长约等于字数 ÷ 3.8 秒。可切换音色试听。</div></div>`;
}

function chatForm(s) {
  const c = s.chat;
  return `<div class="card"><div class="card__title"><h2>流式问答助手</h2>
      <span class="pill ${c.streaming ? 'pill--warn' : 'pill--info'}">${c.streaming ? '回答中…' : '可以提问'}</span></div>
    <div class="chat" id="chat-box">${c.messages.length ? c.messages.map((m) => `<div class="msg msg--${m.role}"><span class="msg__role">${m.role === 'user' ? '我' : 'AI'}</span><div class="msg__body">${esc(m.text)}</div></div>`).join('') : '<div class="empty"><div class="empty__icon">💬</div><p>问一句试试，比如：这个平台能做什么？</p></div>'}</div>
    <div class="chip-row"><button class="chip" id="chip-q1">这个平台能做什么？</button><button class="chip" id="chip-q2">生成视频要多久？</button></div>
    <div class="req-row"><input class="input" id="chat-input" placeholder="输入问题，按回车发送…" value="${esc(c.input)}" />
      <button class="btn btn--primary" id="btn-chat-send" ${c.streaming ? 'disabled' : ''}>发送</button>
      <button class="btn" id="btn-chat-stop" ${c.streaming ? '' : 'disabled'}>停止</button></div>
    ${c.error ? `<div class="hint hint--err">✗ ${esc(c.error)}</div>` : ''}
    <div class="explain-card">回答通过 SSE 边生成边显示，点「停止」可中断，已显示内容保留。</div></div>`;
}

export function tasksView(s) {
  const ws = s.works;
  return `<div class="console"><div class="card"><div class="card__title"><h2>任务与作品</h2>
      <span class="pill pill--info">${ws.length} 个 · 7 天有效</span>
      <button class="btn btn--sm" id="btn-works-clear" ${ws.length ? '' : 'disabled'}>清空</button></div>
    ${ws.length ? ws.map((w) => `<div class="run-step"><div><b>${esc(w.title)}</b>
      <div class="run-step__meta">${esc(w.type)} · ${w.duration}s · 剩余 ${w.days} 天</div></div>
      <div style="display:flex;gap:8px"><a class="btn btn--sm" href="${esc(w.url)}" target="_blank" rel="noreferrer">查看</a>
      <button class="btn btn--sm" data-del="${w.id}">删除</button></div></div>`).join('')
      : '<div class="empty"><div class="empty__icon">📁</div><p>还没有作品。去创作中心生成一条并保存吧。</p></div>'}
    <div class="hint-block">作品链接保存在本机浏览器，7 天后自动过期；演示环境的成片为本地模拟素材。</div></div></div>`;
}

export function catalogView(s) {
  return `<div class="console">${capabilitiesView(s).replace('class="site site--inner"', 'class="console__catalog"')}</div>`;
}

export function settingsView(s) {
  const cfg = s.config || { mode: 'mock', appIdMasked: '—', hasToken: false, allowBillable: false };
  const real = cfg.mode === 'real';
  return `<div class="console">
    <div class="grid-2">
      <div class="card"><div class="card__title"><h2>运行环境</h2>
          <span class="pill ${real ? 'pill--ok' : 'pill--mock'}">${real ? '真实' : '演示'}</span></div>
        <p class="muted">切换后立即生效。真实模式会调用如影 PaaS 线上接口并可能产生费用。</p>
        <div class="mode-cards">
          <button class="mode-card ${!real ? 'is-on' : ''}" data-mode="mock"><b>演示环境</b><span>本地模拟 · 零费用 · 免密钥</span></button>
          <button class="mode-card ${real ? 'is-on' : ''}" data-mode="real"><b>真实环境</b><span>线上 API · 按量计费 · 需 .env</span></button>
        </div>
        ${cfg.modeChangeError ? `<div class="hint hint--err">${esc(cfg.modeChangeError)}</div>` : ''}
      </div>
      <div class="card"><div class="card__title"><h2>接入状态</h2></div>
        <table class="table kv-table"><tbody>
          <tr><th>运行模式</th><td>${real ? '真实 API' : '本地 mock'}</td></tr>
          <tr><th>APP_ID</th><td><code>${esc(cfg.appIdMasked || '—')}</code></td></tr>
          <tr><th>Token</th><td>${cfg.hasToken ? '<span class="ok">已缓存</span>' : '未获取'}</td></tr>
          <tr><th>计费接口</th><td>${cfg.allowBillable ? '<span class="warn">已放行</span>' : '<span class="ok">受保护（拒绝）</span>'}</td></tr>
          <tr><th>凭据位置</th><td>仅服务端 .env</td></tr>
        </tbody></table>
        <div class="explain-card" style="margin-top:12px">密钥永不下发前端。真实模式需在服务端 <code>.env</code> 配置 RUYING_APP_ID / RUYING_APP_KEY，并按需设置 ALLOW_BILLABLE。</div>
      </div>
    </div>
    <div class="card"><div class="card__title"><h2>合规与安全</h2></div>
      <ul class="check-list">
        <li>AI 生成内容对外发布前须添加「AI生成」显式标识（平台水印已默认开启）</li>
        <li>演示环境所有素材为本地模拟，不上传任何数据到线上平台</li>
        <li>真实环境下请勿上传个人敏感信息、未公开资料或涉密内容</li>
        <li>作品与配置保存在本机，清除浏览器数据即可完全移除</li>
      </ul></div>
  </div>`;
}

/* ============ 覆盖层 ============ */
export function modeDialog(s) {
  const mode = s.config?.mode || 'mock';
  return `<div class="sheet-mask" id="sheet-mask"></div><div class="sheet" role="dialog" aria-modal="true">
    <h3>切换运行环境</h3>
    <div class="row"><b>当前</b><span>${mode === 'mock' ? '演示环境（零费用）' : '真实环境（计费）'}</span></div>
    <p class="muted" style="margin:10px 0">切换到 <b>${mode === 'mock' ? '真实环境' : '演示环境'}</b>？${mode === 'mock' ? '真实模式将调用线上 API，可能产生费用，且需要服务端已配置 .env。' : '演示模式不会调用线上接口。'}</p>
    <div class="token-actions"><button class="btn btn--primary" id="btn-mode-confirm">确认切换</button>
      <button class="btn" id="btn-mode-cancel">取消</button></div></div>`;
}

export function guideOverlays(s) {
  let out = '';
  if (s.guide.sheet) out += `<div class="sheet-mask" id="sheet-mask"></div><div class="sheet" role="dialog" aria-modal="true"><h3>${esc(s.guide.sheet.title)}</h3>
    <div class="row"><b>它在做什么</b><span>${esc(s.guide.sheet.what)}</span></div><div class="row"><b>会产生什么</b><span>${esc(s.guide.sheet.result)}</span></div>
    <div class="token-actions"><button class="btn btn--primary" id="btn-help-close">知道了</button></div></div>`;
  if (s.guide.tour >= 0) {
    const step = TOUR_STEPS[s.guide.tour];
    out += `<div class="tour-card" role="dialog"><h4>${s.guide.tour + 1}/${TOUR_STEPS.length} · ${esc(step.title)}</h4><p>${esc(step.text)}</p>
      <div class="token-actions"><button class="btn btn--primary" id="tour-next">${s.guide.tour + 1 === TOUR_STEPS.length ? '完成' : '下一步'}</button>
      <button class="btn" id="tour-skip">跳过</button></div></div>`;
  }
  return out;
}
