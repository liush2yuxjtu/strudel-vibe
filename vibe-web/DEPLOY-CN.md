# 让中国大陆用户能用 vibe-music（备案 + 阿里云/腾讯云部署）

> **当前已上线（2026-05-29，阿里云轻量 上海 `106.14.154.23`）：**
> - HTTP（独立端口）：**http://106.14.154.23:8131/**
> - HTTPS（共用现有 sslip.io 证书的另一个端口）：**https://106-14-154-23.sslip.io:8443/**
>
> 与已有的 `sub3api`（:3000，Caddy 443）共存：vibe-web 由 `server.mjs` 跑在 `:8131`，
> systemd 单元 `vibe-web.service`（`EnvironmentFile=/opt/vibe-web/vibe.env`，含 `MINIMAX_API_KEY`），
> Caddy 增加一个 `106-14-154-23.sslip.io:8443` 站点反代到 `127.0.0.1:8131`。由于复用同一
> 主机名的已签发证书，**绕开了 sslip.io 的 Let's Encrypt 限频**（新子域名本周已达 250k 限额）。
> 此处用 sslip.io + 非 80/443 端口免去了备案；正式对外仍建议按下文走备案域名。
> 端到端校验：`python3 test/browser-eval.py http://106.14.154.23:8131/` → AudioContext `running`、
> 首帧反馈 0.5ms（eval #4/#5 通过）。


vibe-web 现在是**纯同源**应用：Strudel 引擎（`vendor/`）和鼓/旋律采样（`samples/`）
都打包在站点里，浏览器除了访问站点自身和 `/api/vibe`，**不再请求 unpkg.com 或
GitHub**（这两者在大陆被墙/限速，原先会导致引擎加载慢、鼓声加载不出来）。

剩下的唯一障碍是**站点本身能不能打开**：`*.vercel.app` 在大陆基本被墙。
本文档说明如何用一台国内服务器 + 已备案域名把它跑起来。

整套后端就是一个零依赖的 Node 进程（`server.mjs`），同时托管静态文件和
`/api/vibe`。它和 Vercel 版共用 `lib/vibe-core.mjs`，行为完全一致。

---

## 0. 前置：MiniMax Key 在国内可达

`/api/vibe` 在**服务器端**调用 MiniMax 的 Anthropic 兼容接口
（`https://api.minimaxi.com/anthropic`）。MiniMax 是国内厂商，从阿里云/腾讯云
国内机房可正常访问，无需改动。Key 通过环境变量 `MINIMAX_API_KEY` 注入，
**不会下发到浏览器**。

---

## 1. ICP 备案（必须，最耗时）

国内服务器 + 域名对外提供网站服务，**法律上要求 ICP 备案**；未备案的域名解析到
国内 IP 会被拦截（阿里云/腾讯云会强制拦截 80/443）。

1. 买一个域名（阿里云/腾讯云控制台即可，`.com`/`.cn` 均可）。
2. 买一台国内**轻量应用服务器**（阿里云“轻量应用服务器”或腾讯云“轻量”，
   2核2G 足够，约 ¥24–60/月）。务必选**中国大陆地域**（如杭州/上海/广州）。
3. 在对应云的「备案」控制台提交备案：需要营业执照或个人身份信息、服务器实例、
   域名。**周期通常 1–3 周**（各省管局审核）。
4. 备案通过后，把域名解析（A 记录）指向服务器公网 IP。

> 没有营业执照也可做**个人备案**（用途填个人学习/展示，名称不能含「音乐平台」等
> 经营性词），但部分省份对音视频类较敏感，按管局要求填写即可。

---

## 2. 在服务器上跑起来

```bash
# 服务器上（已装 Node >= 18；没装就 `curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -` 之类）
git clone <你的仓库>            # 或者只上传 vibe-web/ 目录
cd vibe-web

# 用真实 key 启动（监听 8080）
MINIMAX_API_KEY=sk-cp-你的key PORT=8080 node server.mjs
# 看到 "vibe-music server on :8080 (MINIMAX_API_KEY set)" 即成功
```

只需要 `vibe-web/` 这一个目录（含 `index.html` / `vendor/` / `samples/` /
`server.mjs` / `lib/`）。**不需要** `npm install`——零依赖。

### 用 systemd 常驻（推荐）

`/etc/systemd/system/vibe.service`：

```ini
[Unit]
Description=vibe-music
After=network.target

[Service]
WorkingDirectory=/opt/vibe-web
Environment=PORT=8080
Environment=MINIMAX_API_KEY=sk-cp-你的key
ExecStart=/usr/bin/node /opt/vibe-web/server.mjs
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now vibe
sudo systemctl status vibe
```

---

## 3. 域名 + HTTPS（Nginx 反代）

让 Nginx 占 80/443，反代到本地 8080，并上 HTTPS（备案后云厂商可申请免费证书）。

`/etc/nginx/conf.d/vibe.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.cn;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name your-domain.cn;

    ssl_certificate     /etc/nginx/ssl/your-domain.cn.pem;
    ssl_certificate_key /etc/nginx/ssl/your-domain.cn.key;

    # 采样是静态二进制，缓存久一点；引擎同理
    location ~* \.(wav|WAV|js|mjs)$ {
        proxy_pass http://127.0.0.1:8080;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;   # /api/vibe 调 MiniMax 可能要几秒
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

> ⚠️ WebAudio 需要安全上下文：浏览器只在 **HTTPS（或 localhost）** 下允许
> `AudioContext` 出声。所以**必须配 HTTPS**，否则点了播放也没声音。

### 可选：CDN 加速采样

`samples/` 约 16MB 静态文件。备案后可挂阿里云 CDN / 腾讯云 CDN，把
`*.wav` 回源到本服务器，大陆访问更快。引擎与采样都是同源相对路径，挂 CDN
无需改代码（CDN 域名同样需备案）。

---

## 4. 验收

部署后用国内网络（或国内节点）访问 `https://your-domain.cn`：

- [ ] 页面秒开（引擎走同源，不卡 unpkg）。
- [ ] 点示例芯片 → 几秒内出现 Strudel 代码并**出声**（鼓声来自 `/samples/`）。
- [ ] 开浏览器 Network：所有请求都是本域名 + 一个 `/api/vibe`，**没有**
      `unpkg.com` / `githubusercontent.com`。
- [ ] 手动改代码 + ▶ 播放可用；⏹ 停止可用。

本地冒烟测试（任意机器）：

```bash
cd vibe-web
MINIMAX_API_KEY=sk-cp-... PORT=8099 node server.mjs &
curl -s -X POST localhost:8099/api/vibe -H 'content-type: application/json' \
  -d '{"intent":"四拍鼓加八分hihat"}'      # → {"code":"s(\"bd*4, hh*8\")"} 之类
curl -s -o /dev/null -w '%{http_code}\n' localhost:8099/samples/bd/BT0A0A7.wav  # → 200
```

---

## 采样调色板（同源打包了哪些音色）

打包在 `samples/` 里的鼓/旋律音色（共 25 组、258 个 wav）：
`bd sd hh oh cp rim lt mt ht sn clap perc hc drum arpy casio jazz metal east
numbers bass pad piano insect space blip click techno house`（实际以
`samples/strudel.json` 为准）。提示词主要教模型用这些；合成器音色
（sine/sawtooth/square/triangle）不需要采样。若想扩充，把对应 dirt-samples
目录拷进 `samples/` 并在 `samples/strudel.json` 里登记即可。
