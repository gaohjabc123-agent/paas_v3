# 部署到云服务器（客户体验版）

目标：客户打开 `http://你的服务器IP:8080` 就能体验；**无需真实密钥、不产生平台费用**。

## 方式一：Node 直接部署（最轻量）
```bash
# 1. 服务器安装 Node 22（以 Ubuntu 为例）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2. 上传代码（任选）
git clone <你的仓库地址> ch08-digital-human && cd ch08-digital-human
# 或者用 scp 把整个目录传上去

# 3. 安装、构建、启动
npm ci
npm run build
PORT=8080 npm start        # 前台运行，验证用
# 长期运行建议用 pm2 或 systemd：
# npm i -g pm2 && pm2 start "npm start" --name yunfan-experience && pm2 save
```

## 方式二：Docker（推荐，环境一致）
```bash
sudo apt-get install -y docker.io docker-compose-plugin
cd ch08-digital-human
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml ps
```

## 开放端口
- 阿里云/腾讯云/华为云：控制台 → 安全组 → 入方向放行 **8080**（或直接 80）；
- 本机防火墙：`sudo ufw allow 8080/tcp`（若启用）。

## 客户访问
- `http://<公网IP>:8080` → 首页 → 任选一条体验；
- 页面右上角"讲解模式/新手引导"帮助客户理解每个按钮。

## 可选：域名 + HTTPS（Caddy 一条命令）
```bash
sudo apt-get install -y caddy
sudo caddy reverse-proxy --from demo.example.com --to 127.0.0.1:8080
```
> 把 `demo.example.com` 换成你的域名并解析到服务器；Caddy 自动申请 HTTPS 证书。

## 验收检查
```bash
curl -s http://127.0.0.1:8080/api/health
# {"code":0,...,"data":{"mode":"mock","service":"如影 AI 能力开放平台","version":"2.0.0",...}}
curl -s -X POST http://127.0.0.1:8080/api/tts -H 'Content-Type: application/json' -d '{"text":"欢迎体验商予科技数字人"}'
# {"code":0,"data":{"audio_url":"/files/mock_tts.mp3","duration_ms":...}}
```
浏览器完整走一遍：首页 → 能力矩阵 → 任选一项能力「体验」→ 填写参数并运行 → 保存作品 → 创作中心三条快捷链路 → 环境与配置。

## 注意
- 这是**体验演示站**：默认离线 mock，不会调用真实平台；
- 真实平台接入需在服务端配置 `.env`（AppKey 等），并按前面章节的计费/水印/授权要求改造；
- 客户演示前可设置 `MOCK_TASK_MS=1000` 让等待更短；服务重启会清空任务，但"我的作品"存在客户浏览器本地。
