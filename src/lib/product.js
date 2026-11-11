// product.js —— 产品元信息与导航（单一数据源）
export const PRODUCT = {
  name: '如影 AI 能力开放平台',
  shortName: '如影开放平台',
  brand: '如影',
  version: '2.0.0',
  vendor: '商予科技',
  tagline: '把数字人能力，变成你的产品能力',
  description: '面向客户与合作方的数字人 PaaS 能力门户：在线体验 8 大类 AI 能力，查看接入路径，一键切换演示与真实环境。',
  docsUrl: 'https://senseavatar.feishu.cn/wiki/space/7652622993675324361',
  consoleUrl: 'https://aigc.softsugar.com/#/company/nav',
};

/** 一级导航：官网(home) + 工作台(console) 双区 */
export const NAV_SECTIONS = [
  {
    id: 'site', label: '产品', items: [
      { id: 'home', label: '首页', icon: '⌂' },
      { id: 'capabilities', label: '能力矩阵', icon: '◈' },
      { id: 'scenarios', label: '应用场景', icon: '◎' },
      { id: 'integration', label: '接入指南', icon: '⇄' },
    ],
  },
  {
    id: 'console', label: '工作台', items: [
      { id: 'overview', label: '总览', icon: '▦' },
      { id: 'create', label: '创作中心', icon: '✦' },
      { id: 'tasks', label: '任务与作品', icon: '▤' },
      { id: 'catalog', label: '能力目录', icon: '◈' },
      { id: 'settings', label: '环境与配置', icon: '⚙' },
    ],
  },
];

export const ALL_NAV = NAV_SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.id, sectionLabel: s.label })));
export const navById = (id) => ALL_NAV.find((n) => n.id === id);

/** 默认首页视图 */
export const DEFAULT_VIEW = 'home';

/** 演示模式的合规提示（全站统一口径） */
export const DEMO_NOTICE = '演示环境使用本地模拟数据，不调用真实平台、不产生任何费用；生成内容仅用于体验。';
