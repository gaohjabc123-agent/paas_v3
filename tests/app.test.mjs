import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HELP, TOUR_STEPS, nextTourStep, shouldShowTour, markTourDone, INTERPRET } from '../src/lib/guide.js';
import { createWizard, chooseExperience, goNext, goPrev, validateText, estimateSeconds, stepProgress, stageLabel, EXPERIENCES } from '../src/lib/wizard.js';

const REQUIRED_HELP = ['nav-home','nav-video','nav-voice','nav-chat','nav-works','nav-help','toggle-explain','start-tour','pick-video','pick-voice','pick-chat','btn-sample','btn-generate','btn-regenerate','btn-save-work','btn-download','btn-tts','btn-chat-send','btn-chat-stop','chip-q1','chip-q2','btn-works-delete','btn-works-clear','btn-reset-demo','btn-help-close'];

test('guide：所有按钮都有"做什么/什么结果"说明', () => {
  for (const id of REQUIRED_HELP) {
    const h = HELP[id];
    assert.ok(h, `缺少说明：${id}`);
    assert.ok(h.title && h.what && h.result, `${id} 说明不完整`);
  }
});

test('guide：新手引导步骤与持久化', () => {
  assert.ok(TOUR_STEPS.length >= 4);
  for (const s of TOUR_STEPS) {
    assert.ok(s.title && s.text, '引导步骤缺少标题或说明');
    // 选择器须为合法 CSS 选择器（产品版用属性选择器定位新导航）
    assert.ok(/^[#.\[]/.test(s.selector), `非法选择器：${s.selector}`);
  }
  assert.equal(nextTourStep(0), 1);
  assert.equal(nextTourStep(TOUR_STEPS.length - 1), -1);
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(shouldShowTour(storage), true);
  markTourDone(storage);
  assert.equal(shouldShowTour(storage), false);
});

test('guide：三类结果都有四行解读且提到关键判定', () => {
  for (const kind of ['avatar', 'voice', 'chat']) {
    const lines = INTERPRET[kind]({ duration: 5.8, duration_ms: 6800 });
    assert.equal(lines.length, 4);
    assert.deepEqual(lines.map((l) => l.label), ['看到了什么', '它说明什么', '怎样算对', '不对先查什么']);
  }
  assert.match(INTERPRET.avatar({ duration: 5.8 })[0].text, /AI生成/);
});

test('wizard：选择体验→下一步→上一步', () => {
  let w = createWizard();
  assert.equal(w.step, 0);
  w = chooseExperience(w, 'video');
  assert.equal(w.step, 1);
  w = goNext(w); assert.equal(w.step, 2);
  w = goPrev(w); assert.equal(w.step, 1);
  assert.equal(goPrev(createWizard()).step, 0);
});

test('wizard：文案校验（太短/超长/合格）与时长估算', () => {
  assert.equal(validateText('短').ok, false);
  assert.equal(validateText('字'.repeat(201)).ok, false);
  assert.equal(validateText('山禾鲜的赣南脐橙今天到货').ok, true);
  assert.equal(estimateSeconds('一二三四五六七八九十'), 2.6);
  assert.ok(EXPERIENCES.find((e) => e.id === 'chat'));
});

test('wizard：进度与阶段文案', () => {
  let w = chooseExperience(createWizard(), 'video');
  assert.equal(stepProgress(w), 50);
  w = { ...w, step: 2, status: 'done' };
  assert.equal(stepProgress(w), 100);
  assert.equal(stageLabel(100), '完成');
  assert.equal(stageLabel(60), '生成中');
  assert.equal(stageLabel(25), '排队中');
});

test('works：保存/读取/删除/7 天有效期', async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const works = await import('../src/lib/works.js?t=' + Date.now());
  const w = works.addWork({ type: '视频口播', title: '测试作品', url: '/files/mock_video.mp4', duration: 5.8 });
  assert.equal(works.listWorks().length, 1);
  assert.equal(works.daysLeft(w.expiresAt), 7);
  works.removeWork(w.id);
  assert.equal(works.listWorks().length, 0);
});
