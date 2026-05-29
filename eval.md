# 评测 — vibe-music

每条都跑；由第三方核对可观察结果，禁止自评。

1. **CLI 能编译与查询** — `node strudel-cli/bin/strudel.mjs eval 's("bd*4")' 1`
   通过：打印 4 条 JSON 事件，均为 `"s":"bd"`，起点在 0/.25/.5/.75。

2. **实时叠加与热重载** — `strudel start --no-audio`；`append 's("bd*4")'`；`append 'note("c2 e2").s("sawtooth")'`；`show`。
   通过：buffer 含 2 个 `// ---` 分隔块；`capture-pane` 显示 `layers: 2` 且 `cycle` 在递增。

3. **自然语言→Strudel（MiniMax）** — `MINIMAX_API_KEY=… translate("四拍鼓加八分hihat")`。
   通过：返回单个 Strudel 表达式（如 `s("bd*4, hh*8")`），且 `compile()` 不抛错。

4. **网页已上线** — `curl -s -o /dev/null -w '%{http_code}' https://vibe-web-gray.vercel.app/`。
   通过：`200`；`POST /api/vibe {"intent":"house beat"}` 返回可编译的 `{code}`；播放后浏览器 AudioContext 状态为 `running`。

5. **生成过程要"可感知"** — 从点击/回车到出声之间（MiniMax 约 3–5s）持续给反馈。
   通过：100ms 内即出现"正在作曲"状态并有动效（按钮 loading／频谱／进度），全程不断；杜绝"点了没反应、5 秒后突然出声"的死等（任意 >1s 界面无变化即不通过）。
