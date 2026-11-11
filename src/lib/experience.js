// experience.js —— 通用能力体验器视图（数据驱动，任意能力都能体验）
import { CAPABILITIES, GROUPS, capById, groupOf, OUTPUT_LABEL } from './capabilities.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 参数表单：按 capabilities.js 的 fields 规格渲染 */
export function experienceForm(cap) {
  const ex = cap.experience || {};
  const g = groupOf(cap.group);
  const fields = (ex.fields || []).map((f) => {
    const val = f.default ?? '';
    let control;
    if (f.type === 'textarea') {
      control = `<textarea class="editor exp-input" data-field="${esc(f.key)}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(val)}</textarea>`;
    } else if (f.type === 'select') {
      control = `<select class="input exp-input" data-field="${esc(f.key)}">${(f.options || []).map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    } else {
      control = `<input class="input exp-input" data-field="${esc(f.key)}" type="${f.type === 'number' ? 'number' : 'text'}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" />`;
    }
    return `<div class="form-field"><label>${esc(f.label)}</label>${control}${f.hint ? `<small class="field-hint">${esc(f.hint)}</small>` : ''}</div>`;
  }).join('');

  return `<div class="exp-shell">
    <div class="exp-head">
      <div class="exp-head__crumb"><button class="btn btn--sm btn--ghost" data-view="catalog">← 能力目录</button>
        <span>/</span><span>${esc(g?.name || '')}</span><span>/</span><b>${esc(cap.name)}</b></div>
      <div class="exp-head__meta">
        <span class="pill pill--ok">● 可体验</span>
        <span class="pill pill--info">输出：${OUTPUT_LABEL[ex.output] || '文本'}</span>
        ${cap.tag ? `<span class="tag">${esc(cap.tag)}</span>` : ''}
      </div>
    </div>

    <div class="grid-2 exp-grid">
      <div class="card"><div class="card__title"><h2>① 填写参数</h2><span class="pill pill--info">${(ex.fields || []).length} 项</span></div>
        <div class="form-grid">${fields}</div>
        <div class="token-actions">
          <button class="btn btn--primary" id="btn-exp-run">${esc(ex.submit || '运行')} →</button>
          <button class="btn" id="btn-exp-reset">重置参数</button>
        </div>
        <div id="exp-error"></div>
        <div class="explain-card"><b>这一步在做什么：</b>${esc(ex.notes || '按参数调用能力并生成结果。')}</div>
      </div>

      <div class="card exp-side">
        <div class="card__title"><h2>能力说明</h2><span class="pill pill--info">${esc(cap.doc)}</span></div>
        <table class="table kv-table"><tbody>
          <tr><th>能力名称</th><td>${esc(cap.name)}</td></tr>
          <tr><th>所属大类</th><td>${esc(g?.name || '')}</td></tr>
          <tr><th>适用场景</th><td>${esc(cap.scene)}</td></tr>
          <tr><th>平台接口</th><td><code class="code-sm">${esc(cap.api)}</code></td></tr>
          <tr><th>输出类型</th><td>${OUTPUT_LABEL[ex.output] || '文本'}</td></tr>
          <tr><th>官方文档</th><td>${esc(cap.doc)}</td></tr>
        </tbody></table>
        <div class="exp-desc">${esc(cap.desc)}</div>
      </div>
    </div>

    <div id="exp-result"></div>
  </div>`;
}

/** 运行中进度 */
export function experienceRunning(percent) {
  return `<div class="card"><div class="card__title"><h2>② 正在生成</h2>
    <span class="pill pill--warn">${percent >= 100 ? '即将完成' : percent >= 60 ? '生成中' : '已提交'}</span></div>
    <div class="progress-bar"><i style="width:${percent}%"></i></div>
    <div class="hint">阶段估算：提交 → 排队 → 生成 → 完成。演示环境使用本地模拟数据，不产生任何费用。</div></div>`;
}

/** 按 output 类型渲染结果 */
export function experienceResult(result) {
  if (!result) return '';
  const out = result.output;
  const note = result.realModeNote || result.notes || '';
  let body = '';

  if (out === 'video') {
    body = `<video controls playsinline poster="${esc(result.thumb || '/files/mock_thumb.png')}" src="${esc(result.videoUrl)}" style="width:100%;max-height:380px;border-radius:10px;background:#000"></video>
      <div class="download-row"><a class="btn" href="${esc(result.videoUrl)}" download>下载成片</a>
        <button class="btn" id="btn-exp-save">保存到作品</button>
        <button class="btn" id="btn-exp-run">再跑一次</button></div>`;
  } else if (out === 'audio') {
    body = `<audio controls src="${esc(result.audioUrl)}" style="width:100%"></audio>
      <div class="download-row"><a class="btn" href="${esc(result.audioUrl)}" download>下载 mp3</a>
        <button class="btn" id="btn-exp-save">保存到作品</button>
        <button class="btn" id="btn-exp-run">再跑一次</button></div>`;
  } else if (out === 'image') {
    body = `<img src="${esc(result.imageUrl)}" alt="AI 生成图片预览" style="width:100%;max-height:380px;object-fit:contain;border-radius:10px;background:var(--gray-100)" />
      <div class="download-row"><a class="btn" href="${esc(result.imageUrl)}" download>下载图片</a>
        <button class="btn" id="btn-exp-save">保存到作品</button>
        <button class="btn" id="btn-exp-run">再跑一次</button></div>`;
  } else if (out === 'json') {
    body = `<pre class="json-block">${esc(result.jsonText || JSON.stringify(result.json, null, 2))}</pre>
      <div class="download-row"><button class="btn" id="btn-exp-copy">复制 JSON</button>
        <button class="btn" id="btn-exp-save">保存到作品</button>
        <button class="btn" id="btn-exp-run">再跑一次</button></div>`;
  } else if (out === 'text' || out === 'chat') {
    body = `<div class="text-result">${esc(result.text || '')}</div>
      <div class="download-row"><button class="btn" id="btn-exp-copy">复制文本</button>
        <button class="btn" id="btn-exp-run">再跑一次</button></div>`;
  }

  return `<div class="card" id="exp-result-card"><div class="card__title"><h2>③ 运行结果</h2>
      <span class="pill pill--ok">✓ ${esc(result.title || '完成')}</span></div>
    ${body}
    <div class="interpret">
      <div class="line"><b>看到了什么</b><span>${esc(result.title || '结果')}，输出类型为「${OUTPUT_LABEL[out] || out}」</span></div>
      <div class="line"><b>它说明什么</b><span>能力已按填写的参数完成一次调用；AI 生成内容已带「AI生成」标识</span></div>
      <div class="line"><b>怎样算对</b><span>结果可查看/下载，且与输入参数对应；状态显示完成</span></div>
      <div class="line"><b>不对先查什么</b><span>① 参数是否填完整 ② 演示/真实环境是否符合预期 ③ 真实模式的前置资源是否就绪</span></div>
    </div>
    ${note ? `<div class="explain-card">${esc(note)}</div>` : ''}
    ${result.mode === 'real' ? '<div class="hint">本次调用来自真实环境。</div>' : '<div class="hint">演示环境结果，不调用真实平台、不产生费用。</div>'}
  </div>`;
}

/** 能力目录：全部可体验，点「体验」进入统一体验器 */
export function catalogWithExperience(s) {
  const filter = s.capFilter || 'all';
  const list = filter === 'all' ? CAPABILITIES : CAPABILITIES.filter((c) => c.group === filter);
  return `<div class="console__catalog">
    <div class="filter-row">
      <button class="chip ${filter === 'all' ? 'is-on' : ''}" data-filter="all">全部 ${CAPABILITIES.length}</button>
      ${GROUPS.map((g) => `<button class="chip ${filter === g.id ? 'is-on' : ''}" data-filter="${g.id}">${g.icon} ${g.name} ${capsOfCount(g.id)}</button>`).join('')}
    </div>
    <div class="cap-table-wrap" style="padding:0;max-width:none"><table class="table cap-table">
      <thead><tr><th>能力</th><th>所属</th><th>说明 / 场景</th><th>输出</th><th>接口</th><th></th></tr></thead>
      <tbody>${list.map((c) => `<tr>
        <td><b>${esc(c.name)}</b>${c.tag ? `<span class="tag">${esc(c.tag)}</span>` : ''}</td>
        <td>${groupOf(c.group)?.name ?? ''}</td>
        <td><span class="muted">${esc(c.desc)}</span><small class="cell-scene">${esc(c.scene)}</small></td>
        <td><span class="status st-ready">${OUTPUT_LABEL[c.experience?.output] || '文本'}</span></td>
        <td><code class="code-sm">${esc(c.api)}</code></td>
        <td><button class="btn btn--sm btn--primary" data-use="${c.id}">体验 →</button></td>
      </tr>`).join('')}</tbody></table></div>
    <div class="hint-block">全部 ${CAPABILITIES.length} 项能力均已接入工作台，可直接体验；能力口径依据官方产品文档与平台后台整理。</div>
  </div>`;
}

function capsOfCount(gid) { return CAPABILITIES.filter((c) => c.group === gid).length; }
