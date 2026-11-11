# 如影 AI 能力开放平台

> 商予科技 · 数字人 PaaS 的**产品化前端入口** —— 官网 + 工作台，演示 / 真实双模式，可部署、可演示、可交付。

## 这是什么

如影 PaaS 已有完整 API 与后台控制台，缺一个面向客户与合作方的产品门面。本项目把它补成一个独立产品：

| 区域 | 内容 |
|---|---|
| **产品官网** | 首页（价值主张 / 数据）、能力矩阵（6 大类 15 项能力）、应用场景、接入指南 |
| **工作台** | 总览、创作中心（3 条快捷链路）、**能力目录 + 统一能力体验器（15 项全部可体验）**、任务与作品、环境与配置 |
| **双模式** | 默认**演示环境**（本地模拟、零费用、免密钥）；配置 `.env` 后可切**真实环境**（如影 PaaS 线上 API） |

**15 项能力全部接入、全部可体验**：能力目录点任意一项「体验 →」即进入统一体验器，按该能力的表单填参数、提交、轮询、查看结果（视频 / 音频 / 图片 / JSON / 文本）。能力定义集中在 `src/lib/capabilities.js` 一份数据源，前端渲染与服务端执行都读它，不存在两份清单。

产品口径依据 `aigc.softsugar.com` 后台 8 大模块 24 功能页与官方产品文档 26 篇整理。

## 快速开始

```bash
npm ci
npm run dev            # 开发：Vite 5173 + API 8787
# 或生产预览：
npm run build && npm start     # http://127.0.0.1:8080
```

打开后默认进入**演示环境**，无需任何配置即可完整体验。

## 产品结构

```
产品官网  ├─ 首页            Hero / 能力概览 / 场景 / 接入四步 / CTA
         ├─ 能力矩阵        15 项能力，按 6 大类筛选，全部可点「体验 →」
         ├─ 应用场景        零售电商 / 教育培训 / 政务服务 / 传媒内容
         └─ 接入指南        四步流程 + 安全边界 + 双环境对比

工作台   ├─ 总览            4 个 KPI / 快速开始 / 资源用量 / 最近作品
         ├─ 创作中心        视频口播 · 语音试听 · 流式问答（3 条快捷链路）
         ├─ 能力目录        15 项能力全部接入，点击进入统一体验器
         ├─ 能力体验器      按能力规格自动生成表单 → 提交 → 轮询 → 结果（含四行解读）
         ├─ 任务与作品      本地保存，7 天有效
         └─ 环境与配置      演示/真实切换、接入状态、合规说明
```

## 两种运行环境

| | 演示环境（默认） | 真实环境 |
|---|---|---|
| 数据来源 | 本地模拟素材 | 如影 PaaS 线上 API |
| 费用 | **0 元** | 按平台计费 |
| 凭据 | 不需要 | 服务端 `.env` 配置 |
| 适用 | 客户演示、培训、验收 | 生产集成 |

**切换方式**：点顶栏「演示环境 ⇄」或工作台「环境与配置」。真实模式需要服务端已配置凭据，否则会明确拒绝并提示，不会静默降级。

### 真实环境配置

复制 `.env.example` 为项目根目录 `.env`：

```ini
RUYING_MOCK=false
RUYING_APP_ID=你的APP_ID
RUYING_APP_KEY=你的APP_KEY
RUYING_BASE_URL=https://aigc.softsugar.com
SIGN_TS_UNIT=ms
ALLOW_BILLABLE=false      # 演示/培训务必保持 false；true 才会真正提交计费任务
```

## 安全边界

- **APP_ID / APP_KEY 仅在服务端**，绝不进入前端产物或 API 响应（`/api/config` 只返回脱敏值）
- Token 由服务端缓存、并发合并、提前刷新，不下发浏览器
- 计费接口有白名单 `server/lib/config.mjs`；未设 `ALLOW_BILLABLE=true` 时拒绝调用
- 签名实现见 `server/lib/sign.mjs`（取 Token 与回调验签两套公式，勿混用）
- 所有 AI 生成内容对外发布前添加「AI生成」显式标识（演示成片已自带水印）

## 测试与检查

```bash
npm test           # 引导 / 向导 / 作品 / 产品数据层 / API / SSE / 双模式
npm run build
npm run check:leaks    # 检查前端产物是否泄露密钥
npm run ci             # 三合一
```

## 部署

单端口同源 API，无需跨域配置：

```bash
npm ci && npm run build
PORT=8080 npm start
```

Docker：`docker compose up -d`（见 `deploy/`）。详见 `deploy/CLOUD.md`。

## 目录

```
src/
  main.js                     应用入口（状态 + 交互）
  style.css                   产品视觉
  lib/
    product.js                品牌与导航定义
    capabilities.js           能力目录 + 体验规格（前后端唯一数据源）
    experience.js             统一能力体验器视图
    views.js                  官网与工作台视图（纯函数）
    api.js                    同源 API 客户端
    wizard.js / guide.js / works.js   向导、引导、作品
  shared/design/              设计令牌与基础样式
server/
  index.mjs                   单端口服务 + 双模式路由
  mock.mjs                    平台替身（零费用模拟）
  lib/  config / sign / token / mask   真实接入骨架
deploy/                      Dockerfile / compose / 云部署说明
tests/                       单元与接口测试
```
