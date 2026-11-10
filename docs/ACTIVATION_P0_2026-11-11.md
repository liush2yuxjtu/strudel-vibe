# JamFlow Activation P0 — 2026-11-11

## 结论

8名用户没有提交，记录中也没有后续产品操作；旧埋点不足以区分未操作与未记录的输入。已找到并修复输入法误提交、生成期间预设覆盖草稿、等待时取消入口难找等可复现摩擦；现有样本不足以证明这些缺陷解释了历史流失，更不能声称转化已提升。推广门槛仍为 **Page→submit ≥25%，且至少5名独立生成用户**。

## 改动前基线

[Amplitude project 893642](https://app.amplitude.com/analytics/cold-bar-959821/home/project/893642)，截止 `2026-11-10T16:08:00Z`。主漏斗两步均筛选 `environment=production`、`traffic_class=unknown`，按独立用户、有序、24小时转化窗口计算。`unknown` 不等于已确认真人。

| 查询窗口或人群 | Page→submit | 解释 |
| --- | --- | --- |
| 11月4日00:00Z—11月10日16:08Z，主口径 | 9→1，11.11% | 唯一提交者为回访用户 |
| 10月28日00:00Z—同一截止点，主口径 | 9→1，11.11% | 扩窗没有增加此人群样本 |
| 同一短窗口，新用户诊断 | 8→0 | `newOrActive=new`、`SAME_TIME_RANGE`；不替换主指标 |
| 同一短窗口，全部流量 | 119→6，5.04% | 含测试及其他流量，不用于推广判定 |

旧 Page 的 **130→8 应为6.15%**。它与本次窗口不同，不能拼成趋势。工具的“Last 7 Days”实际返回8个日期；漏斗 CSV 日行全零但 Total 非零，因此不据此绘制日趋势。项目未返回明确时区配置，上述端点均显式使用 UTC。

## 实际路径与证据边界

没有可用 Session Replay；以下来自事件时间线。7名用户停在 `Page Viewed→first_demo_exposed`，另1名用户反复查看页面但没有产品操作；仅1名用户点击预设并提交。旧曝光已检查50%视口可见，但没有持续时长条件，不能证明注意力或阅读。唯一提交者产生 **7次 attempt→7次 API 成功→7次软件播放→6次同 attempt 音频信号**；这不是7名用户。其密集操作类似测试，但没有证据把历史 `unknown` 重标为测试。

反馈表仅1条“test”，有效用户反馈为0。当前材料没有证明首页文案、登录、API失败或音频失败是8名未提交用户的共同原因。此前新增输入事件尚未出现，也可能是部署后没有相应自然操作，不能直接归因 SDK 故障。

生产旧版 `0c763dd` 的1440×900与390×844检查均无横向溢出；本地 demo 达到运行中 AudioContext 和引擎音频信号。手机首屏已有输入框及 Generate，但 Stop 顶部约906px，超出844px视口。此检查支持新增就近取消，未支持重排首页。

## 修复与竞品取舍

| 已确认摩擦 | 本次处理 |
| --- | --- |
| IME 确认候选触发 Enter 提交 | 屏蔽 composing / keyCode 229；保留明确 Enter 和按钮提交 |
| busy 时预设可覆盖输入，切语言会重建按钮 | 全部预设、Random、Make it mine 保持禁用 |
| Stop 只丢弃旧结果，网络请求继续 | 每次生成拥有 AbortController；输入旁新增 Cancel；60秒超时保留提示词，允许重试 |
| 旧 release 无法区分不同体验版本 | 新增版本及阶段事件，保留原 release 和主漏斗定义 |

独立审查发现 Scribble 画布会挡住新 Cancel；已加入既有 `above-scribble` 控制层。真实浏览器开启 Scribble 后点击取消，确认请求中止、回到 idle、保留草稿：**PASS**。

[Strudel](https://strudel.cc/learn/getting-started/) 提供直接播放、编辑、再次应用；[Udio](https://help.udio.com/en/articles/10715838-create-your-first-song) 提供描述、灵感与保留提示词后继续修改；[StrudelLM](https://github.com/tambo-labs/strudellm/blob/main/README.md) 提供预填代码及快捷示例。JamFlow 已有本地 demo、预设和 Make it mine，本次保留其“预填后明确 Generate”契约。没有 demo→submit 的自然用户样本，暂不把 Make it mine 改为直接模型请求。

## 前后比较合同

新标识为 `activation_version=activation-entry-v3-20261111`、`schema_version=3`；旧 `release=funnel-reliability-v2` 保留。自动 pageview 和自定义事件共享页实例、入口语言、视口和 demo 状态；demo 状态不代表新访客身份。新增持续可见1秒的入口曝光、首次可信操作、预填来源及实际发请求事件。同 attempt 串联 submit、request、success、playback，禁止把预填伪装成原生输入。

后续继续固定主漏斗、人群、独立用户及24小时窗口，记录明确 UTC 起止点，分列版本、新用户诊断与未成熟样本。用于结果比较的入口必须已观察满24小时；先按相同成熟规则复算旧基线。旧窗口混有多个构建且没有新版本属性，只能作历史参照，不能冒充随机实验。验收流量全部标记 `internal_test` 并排除；当前新版自然样本不足，uplift 为 **UNKNOWN**，不是0%或达标。

## 交付与验证记录

- 独立离线验证：54/54 PASS；API、模型 prompt 无改动。
- 浏览器回归及 Scribble Cancel：16/16 PASS，API mock，真实 Chromium、Strudel 和样本。360px / 390px touch emulation：PASS，未请求模型。
- 同一交互探针：旧版 IME 确认发出1次请求，新版0次；busy 可点击预设由4个变为0个，切语言后仍为0；Stop/Cancel 在250ms观察窗口内中止 fetch 由 false 变为 true；新版取消按钮位于 y=459px、高44px。探针使用延迟 API mock，不是实际上游延迟数据。
- main commit / 生产 deployment / alias 对应关系：**PENDING**。
- 一次真实生产生成及同 attempt 音频信号：**PENDING**。
- Amplitude 新版本事件入库、改后主漏斗及成熟人数：**PENDING**。
- 60秒测试可用虚拟时钟验证客户端行为；客户端 abort 不证明上游计费取消。引擎信号不等于人工听音，实体手机及实体 IME 未验。

记录位置：[项目 Page](https://chatgpt.com/space/page_b918c11de73081919c82bbaab6cee39a)。仅保存聚合结果和脱敏查询定义，不公开设备或会话标识。

## 可复查文件

- `ACTIVATION_BASELINE_QUERIES_2026-11-11.json`：查询定义，不含原始用户标识。
- `ACTIVATION_BEHAVIOR_COMPARISON_2026-11-11.json`：同一 Chromium 脚本对旧版和新版的交互观察。
- `vibe-web/test/funnel.browser.mjs`：16个确定性浏览器场景；真实生产验收另记。

## 发布前 /verify

A PASS — 4段内联脚本语法、关键ID与脚本结构。
B PASS — API路径保留，API handler / vibe-core / 音乐prompt无diff。
C PASS — 默认自动播放关闭、4项预设披露、主生成按钮、双语与涂鸦提示保留。
D PASS — 360/390触控视口无溢出、可缩放；取消目标44px。历史pads容器的aria-hidden未改，仍为已知可访问性债务。
E PASS — 发布前生产HTTP200及JamFlow旧版标识确认；新版部署后另验。
F SKIP — 后端生成逻辑未变；真实生成仍在J验收。
G PASS — 唯一正式域名jamflow-gray.vercel.app；回滚目标已记录。
H PASS — 54/54离线；首次音频手势、取消、超时及并发owner回归通过。
I PASS — 16/16浏览器场景、360/390触控模拟；paste中英文桌面与手机四场、56项检查PASS，录制器已等待真实SDK。
J SKIP — 本阶段尚未部署；提交后执行精确SHA部署、真实模型及事件入库验收。

独立审查的Scribble遮挡问题已修复；no-comments / deslop没有新增冗余。验收脚本发现异步SDK替换track spy竞态；改为getDeviceId就绪后安装，并断言录制器未被替换。同attempt断言未弱化。
