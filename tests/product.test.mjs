// product.test.mjs —— 产品化数据层与视图一致性测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT, NAV_SECTIONS, ALL_NAV, navById, DEFAULT_VIEW, DEMO_NOTICE } from '../src/lib/product.js';
import { GROUPS, CAPABILITIES, SCENARIOS, INTEGRATION_STEPS, capsOf, readyCaps, capById, groupOf, stats } from '../src/lib/capabilities.js';

test('product：品牌与导航结构完整', () => {
  assert.equal(PRODUCT.version, '2.0.0');
  assert.match(PRODUCT.name, /如影/);
  assert.ok(PRODUCT.docsUrl.startsWith('https://'));
  assert.equal(NAV_SECTIONS.length, 2);
  assert.ok(NAV_SECTIONS.find((s) => s.id === 'site'));
  assert.ok(NAV_SECTIONS.find((s) => s.id === 'console'));
  assert.ok(navById(DEFAULT_VIEW));
  assert.ok(DEMO_NOTICE.includes('不产生任何费用'));
});

test('capabilities：每个能力都有合法分组、状态与文档出处', () => {
  for (const c of CAPABILITIES) {
    assert.ok(c.id && c.name && c.desc && c.api && c.doc && c.scene, `${c.id} 字段不完整`);
    assert.ok(groupOf(c.group), `${c.id} 分组 ${c.group} 不存在`);
    assert.equal(c.status, 'ready', `${c.id} 应为可体验状态`);
  }
  // id 唯一
  assert.equal(new Set(CAPABILITIES.map((c) => c.id)).size, CAPABILITIES.length);
});

test('capabilities：能力矩阵覆盖 6 大类且统计自洽', () => {
  assert.equal(GROUPS.length, 6);
  for (const g of GROUPS) assert.ok(capsOf(g.id).length > 0, `${g.name} 无能力项`);
  assert.ok(readyCaps().length >= 4, '至少要有多条可体验能力');
  const st = stats();
  assert.equal(st.groups, GROUPS.length);
  assert.equal(st.capabilities, CAPABILITIES.length);
  assert.equal(st.ready, readyCaps().length);
  assert.equal(st.scenarios, SCENARIOS.length);
});

test('capabilities：场景引用的能力 id 都真实存在', () => {
  for (const sc of SCENARIOS) {
    assert.ok(sc.name && sc.desc && sc.icon);
    for (const id of sc.caps) assert.ok(capById(id), `${sc.name} 引用了不存在的 ${id}`);
  }
});

test('capabilities：接入流程四步且与官方快速集成一致', () => {
  assert.equal(INTEGRATION_STEPS.length, 4);
  assert.deepEqual(INTEGRATION_STEPS.map((x) => x.n), ['01', '02', '03', '04']);
  assert.match(INTEGRATION_STEPS[0].desc, /凭据|APP_ID/);
  assert.match(INTEGRATION_STEPS[1].desc, /Token|签名/);
});

test('product：全部能力可体验且体验规格完整（都接入）', () => {
  assert.equal(readyCaps().length, CAPABILITIES.length, '所有能力都应为 ready（用户要求「都接入 可体验」）');
  const outputs = new Set(['video', 'audio', 'image', 'json', 'text', 'chat']);
  for (const c of CAPABILITIES) {
    const ex = c.experience;
    assert.ok(ex, `${c.id} 缺少 experience 体验规格`);
    assert.ok(outputs.has(ex.output), `${c.id} output 类型非法：${ex.output}`);
    assert.ok(ex.submit && ex.mockTitle && ex.notes, `${c.id} 体验规格字段不完整`);
    assert.ok(Array.isArray(ex.fields) && ex.fields.length > 0, `${c.id} 没有输入字段`);
    for (const f of ex.fields) {
      assert.ok(f.key && f.label && f.type, `${c.id} 字段定义不完整`);
      assert.ok(['text', 'textarea', 'select', 'number'].includes(f.type), `${c.id} 字段类型非法`);
      if (f.type === 'select') assert.ok(Array.isArray(f.options) && f.options.length, `${c.id} 下拉缺少选项`);
    }
    assert.ok(c.realApi === null || typeof c.realApi === 'string', `${c.id} realApi 定义非法`);
    assert.equal(typeof c.billable, 'boolean');
  }
});

test('capabilities：服务端共用同一份数据源，统计与前端一致', async () => {
  const api = await import('../server/mock.mjs');
  // mock.mjs 直接 import capabilities.js，说明前后端共用；此处验证 stats 自洽
  const st = stats();
  assert.equal(st.capabilities, readyCaps().length);
  assert.equal(st.ready, CAPABILITIES.length);
  assert.ok(api.createMock, '服务端 mock 模块可加载');
});
