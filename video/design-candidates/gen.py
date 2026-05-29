#!/usr/bin/env python3
# Generates a single gallery (index.html) with 9 distinct VIDEO design candidates
# for the vibe-music RedNote vertical video. Each is a 1080x1920 frame mockup,
# scaled into a phone card, embedding the real app screen (screen.png).
# Grounded in UI/UX Pro Max design system: Video-First Hero, bold display type.

import random

# ---- content shown in every candidate (a representative video "frame") -------
HEADER = "打字就能做音乐的宝藏网站"
KICKER = "第 3 句"
PROMPT = "再加点温暖的电钢琴和弦"
TAG = "一句一句加，越来越好听 ♪"
NOWPLAYING = "正在播放 · 浏览器实时生成"
CTA = "vibe-web-gray.vercel.app"
FOOTER = "中文一句话 → MiniMax 写代码 → 浏览器出声"

GFONTS = (
    "https://fonts.googleapis.com/css2?"
    "family=Poppins:wght@400;500;600;700;800;900&"
    "family=Righteous&"
    "family=Space+Grotesk:wght@400;500;700&"
    "family=Playfair+Display:ital,wght@0,600;0,800;1,600&"
    "family=Noto+Sans+SC:wght@400;500;700;900&"
    "family=Syne:wght@600;700;800&"
    "family=DM+Mono:wght@400;500&display=swap"
)

# bar heights — deterministic so re-runs are stable
random.seed(7)
BARS = [random.random() for _ in range(41)]

def bars_html(grad, glow, w_pct=True, radius=99):
    out = []
    n = len(BARS)
    half = (n - 1) / 2
    for i, _ in enumerate(BARS):
        dist = abs(i - half) / half
        # center (bass) tall, edges shorter, plus jitter
        v = (1 - dist * 0.7) * (0.35 + BARS[i] * 0.65)
        h = max(8, int(v * 100))
        out.append(
            f'<div style="flex:1;height:{h}%;border-radius:{radius}px;'
            f'background:{grad};box-shadow:{glow};align-self:center"></div>'
        )
    return "".join(out)


# ---- 9 themes ---------------------------------------------------------------
# Each theme returns CSS (scoped by .cand{ID}) + structural variant.
THEMES = [
    {
        "id": 1, "name": "Neon Noir", "kind": "stack",
        "why": "OLED dark + pink/blue neon glow — the recommended system, refined. Premium, music-app native.",
        "bg": "radial-gradient(900px 760px at 80% 12%, rgba(236,72,153,.30), transparent 60%),"
              "radial-gradient(820px 720px at 18% 86%, rgba(37,99,235,.26), transparent 58%), #0B0B12",
        "ink": "#F4F2FB", "dim": "#A7A3C4", "a1": "#EC4899", "a2": "#2563EB",
        "display": "'Poppins',sans-serif", "cjk": "'Noto Sans SC',sans-serif",
        "panel": "#0E0E16", "border": "rgba(255,255,255,.08)", "radius": 22,
        "chip_bg": "rgba(236,72,153,.12)", "shadow": "0 40px 100px -30px rgba(236,72,153,.5)",
        "grad": "linear-gradient(180deg,#EC4899,#2563EB)", "glow": "0 0 12px rgba(236,72,153,.6)",
        "deco": "", "promptShadow": "0 0 22px rgba(236,72,153,.35)",
    },
    {
        "id": 2, "name": "Aurora Glass", "kind": "stack",
        "why": "Glassmorphism: frosted panels over a living aurora. Dreamy, premium, very screenshot-able.",
        "bg": "linear-gradient(135deg,#0a1f3c,#3b0a5e 45%,#0a3d4d)",
        "ink": "#FFFFFF", "dim": "#C7D2FE", "a1": "#7af0c0", "a2": "#b07aff",
        "display": "'Poppins',sans-serif", "cjk": "'Noto Sans SC',sans-serif",
        "panel": "rgba(255,255,255,.08)", "border": "rgba(255,255,255,.22)", "radius": 28,
        "chip_bg": "rgba(255,255,255,.14)", "shadow": "0 30px 90px -20px rgba(0,0,0,.6)",
        "grad": "linear-gradient(180deg,#7af0c0,#b07aff)", "glow": "0 0 14px rgba(122,240,192,.6)",
        "deco": "glass", "promptShadow": "0 2px 20px rgba(0,0,0,.5)",
    },
    {
        "id": 3, "name": "Vaporwave Sunset", "kind": "stack",
        "why": "Retro-futurist sunset gradient + perspective grid + scanlines. Nostalgic, music/aesthetic crowd.",
        "bg": "linear-gradient(180deg,#2b1055 0%,#7b2d8e 45%,#ff6 a 0%)".replace("#ff6 a 0%","#ff6ab3 100%"),
        "ink": "#FFF7FB", "dim": "#ffd9ef", "a1": "#01CDFE", "a2": "#FF71CE",
        "display": "'Righteous',cursive", "cjk": "'Noto Sans SC',sans-serif",
        "panel": "rgba(20,6,40,.55)", "border": "rgba(1,205,254,.45)", "radius": 16,
        "chip_bg": "rgba(1,205,254,.16)", "shadow": "0 0 60px rgba(255,113,206,.45)",
        "grad": "linear-gradient(180deg,#01CDFE,#FF71CE)", "glow": "0 0 14px #01CDFE",
        "deco": "grid", "promptShadow": "0 0 18px #ff71ce, 0 0 4px #01CDFE",
    },
    {
        "id": 4, "name": "Y2K Chrome", "kind": "stack",
        "why": "Bubblegum chrome, iridescent, sparkles, bubble shapes. Loud, playful, Gen-Z viral energy.",
        "bg": "linear-gradient(135deg,#ff9ad5,#9ad6ff 50%,#c6a8ff)",
        "ink": "#1a0b2e", "dim": "#5b3a7a", "a1": "#FF69B4", "a2": "#00C2FF",
        "display": "'Righteous',cursive", "cjk": "'Noto Sans SC',sans-serif",
        "panel": "rgba(255,255,255,.55)", "border": "rgba(255,255,255,.9)", "radius": 30,
        "chip_bg": "rgba(255,255,255,.7)", "shadow": "0 18px 50px rgba(120,80,200,.4)",
        "grad": "linear-gradient(180deg,#FF69B4,#00C2FF)", "glow": "0 0 10px rgba(255,105,180,.7)",
        "deco": "sparkle", "promptShadow": "0 2px 0 #fff, 0 4px 16px rgba(120,80,200,.4)",
    },
    {
        "id": 5, "name": "Kinetic Brutalism", "kind": "brutal",
        "why": "Acid-yellow on near-black, oversized uppercase Space Grotesk, marquee energy. Bold, stops the scroll.",
        "bg": "#09090B",
        "ink": "#FAFAFA", "dim": "#9b9ba3", "a1": "#DFE104", "a2": "#FAFAFA",
        "display": "'Space Grotesk',sans-serif", "cjk": "'Noto Sans SC',sans-serif",
        "panel": "#0f0f12", "border": "#3F3F46", "radius": 0,
        "chip_bg": "#DFE104", "shadow": "none",
        "grad": "linear-gradient(180deg,#DFE104,#DFE104)", "glow": "none",
        "deco": "marquee", "promptShadow": "none",
    },
    {
        "id": 6, "name": "Neo-Brutalist Pop", "kind": "neobrutal",
        "why": "Cream canvas, thick black borders, hard offset shadows, rotated sticker cards. THE 小红书 look.",
        "bg": "#FFFDF5",
        "ink": "#111111", "dim": "#555", "a1": "#FF5247", "a2": "#7C5CFF",
        "display": "'Space Grotesk',sans-serif", "cjk": "'Noto Sans SC',sans-serif",
        "panel": "#FFFFFF", "border": "#111111", "radius": 18,
        "chip_bg": "#FFE14D", "shadow": "8px 8px 0 #111",
        "grad": "linear-gradient(180deg,#7C5CFF,#FF5247)", "glow": "none",
        "deco": "sticker", "promptShadow": "none",
    },
    {
        "id": 7, "name": "Editorial Mag", "kind": "editorial",
        "why": "Cream + serif Playfair, drop cap, byline, hairline rules. Calm, premium, 'curated find' tone.",
        "bg": "#F6F1E7",
        "ink": "#1c1a17", "dim": "#7a736a", "a1": "#b5462f", "a2": "#1c1a17",
        "display": "'Playfair Display',serif", "cjk": "'Noto Sans SC',serif",
        "panel": "#fffdf9", "border": "rgba(28,26,23,.18)", "radius": 6,
        "chip_bg": "transparent", "shadow": "0 24px 60px -28px rgba(0,0,0,.35)",
        "grad": "linear-gradient(180deg,#b5462f,#caa15a)", "glow": "none",
        "deco": "rule", "promptShadow": "none",
    },
    {
        "id": 8, "name": "Bento Soft", "kind": "bento",
        "why": "Modular rounded bento cards on deep slate. Modern SaaS/product clarity, organized & friendly.",
        "bg": "radial-gradient(700px 600px at 50% 0%, #1b2440, #0c1020)",
        "ink": "#eef2ff", "dim": "#93a0c8", "a1": "#5eead4", "a2": "#a78bfa",
        "display": "'Syne',sans-serif", "cjk": "'Noto Sans SC',sans-serif",
        "panel": "#141a2e", "border": "rgba(255,255,255,.07)", "radius": 26,
        "chip_bg": "rgba(94,234,212,.14)", "shadow": "0 24px 60px -30px rgba(0,0,0,.7)",
        "grad": "linear-gradient(180deg,#5eead4,#a78bfa)", "glow": "0 0 10px rgba(94,234,212,.5)",
        "deco": "", "promptShadow": "none",
    },
    {
        "id": 9, "name": "Mono Terminal", "kind": "stack",
        "why": "Code-native: monospace, terminal green, grid lines. Speaks to the 'it's real code' devs/makers.",
        "bg": "#06120c",
        "ink": "#d6ffe6", "dim": "#5f8f74", "a1": "#36f08c", "a2": "#9af7c5",
        "display": "'DM Mono',monospace", "cjk": "'Noto Sans SC',monospace",
        "panel": "#08160e", "border": "rgba(54,240,140,.25)", "radius": 8,
        "chip_bg": "rgba(54,240,140,.12)", "shadow": "0 0 40px rgba(54,240,140,.25)",
        "grad": "linear-gradient(180deg,#36f08c,#9af7c5)", "glow": "0 0 10px rgba(54,240,140,.6)",
        "deco": "scan", "promptShadow": "0 0 12px rgba(54,240,140,.4)",
    },
]


def device(t):
    """mock browser card with the real screen."""
    return f'''
      <div class="device">
        <div class="bar">
          <span class="d" style="background:#ff5f57"></span>
          <span class="d" style="background:#febc2e"></span>
          <span class="d" style="background:#28c840"></span>
          <div class="url">▲ vibe-web-gray.vercel.app</div>
          <div class="live">● LIVE</div>
        </div>
        <img src="screen.png" alt="vibe-web 实时演奏中"/>
      </div>'''


def inner(t):
    k = t["kind"]
    dev = device(t)
    bars = f'<div class="spectrum">{bars_html(t["grad"], t["glow"])}</div>'
    np = f'<div class="np">♪ {NOWPLAYING}</div>'
    cta = f'<div class="cta">▶ {CTA}</div>'

    if k == "editorial":
        return f'''
        <div class="hd">{HEADER}</div>
        <div class="byline">VIBE-MUSIC · 实验</div>
        <div class="prompt"><span class="dc">「</span>{PROMPT}」</div>
        <div class="tag">{TAG}</div>
        <hr class="rule"/>
        {dev}
        <div class="figcap">实时画面 · 浏览器内 WebAudio 发声</div>
        {np}{bars}
        {cta}
        <div class="ft">{FOOTER}</div>'''

    if k == "bento":
        return f'''
        <div class="bento">
          <div class="cell hd-cell">🎧 {HEADER}</div>
          <div class="cell kick-cell"><span class="chip">{KICKER}</span></div>
          <div class="cell prompt-cell"><div class="prompt">「{PROMPT}」</div><div class="tag">{TAG}</div></div>
          <div class="cell dev-cell">{dev}</div>
          <div class="cell np-cell">{np}{bars}</div>
          <div class="cell cta-cell">{cta}</div>
        </div>
        <div class="ft">{FOOTER}</div>'''

    if k == "neobrutal":
        return f'''
        <div class="hd">🎧 {HEADER}</div>
        <div class="chip rot">{KICKER}</div>
        <div class="promptbox"><div class="prompt">「{PROMPT}」</div></div>
        <div class="tag">{TAG}</div>
        {dev}
        {np}{bars}
        {cta}
        <div class="ft">{FOOTER}</div>'''

    if k == "brutal":
        return f'''
        <div class="hd">{HEADER}</div>
        <div class="chip">{KICKER}</div>
        <div class="prompt">{PROMPT}</div>
        <div class="tag">{TAG}</div>
        {dev}
        {np}{bars}
        {cta}
        <div class="ft">{FOOTER}</div>'''

    # default stack
    return f'''
        <div class="hd">🎧 {HEADER}</div>
        <div class="chip">{KICKER}</div>
        <div class="prompt">「{PROMPT}」<span class="cur">▌</span></div>
        <div class="tag">{TAG}</div>
        {dev}
        {np}{bars}
        {cta}
        <div class="ft">{FOOTER}</div>'''


def theme_css(t):
    c = f".cand{t['id']}"
    base = f'''
    {c}{{background:{t['bg']};color:{t['ink']};font-family:{t['cjk']};}}
    {c} .hd{{font-family:{t['cjk']};font-weight:700;font-size:30px;color:{t['ink']};opacity:.92;text-align:center;padding:30px 40px 0}}
    {c} .chip{{display:inline-block;font-family:{t['display']};font-weight:700;font-size:24px;letter-spacing:.06em;
        color:{t['a1']};background:{t['chip_bg']};border:1px solid {t['a1']}55;padding:8px 20px;border-radius:999px;margin:26px 0 0 48px}}
    {c} .prompt{{font-family:{t['cjk']};font-weight:800;font-size:74px;line-height:1.16;color:{t['ink']};
        padding:16px 48px 0;text-shadow:{t['promptShadow']}}}
    {c} .cur{{color:{t['a1']}}}
    {c} .tag{{font-family:{t['cjk']};font-size:30px;color:{t['dim']};padding:18px 48px 0}}
    {c} .device{{margin:34px 38px 0;border-radius:{t['radius']}px;overflow:hidden;border:1px solid {t['border']};
        box-shadow:{t['shadow']};background:{t['panel']}}}
    {c} .device .bar{{height:48px;display:flex;align-items:center;gap:9px;padding:0 18px;background:rgba(0,0,0,.25);
        border-bottom:1px solid {t['border']};font-family:'DM Mono',monospace;font-size:15px;color:{t['dim']}}}
    {c} .device .d{{width:12px;height:12px;border-radius:50%}}
    {c} .device .url{{margin-left:12px;flex:1;max-width:520px;color:{t['dim']};opacity:.9}}
    {c} .device .live{{margin-left:auto;color:#ff5d9e;font-weight:700;font-size:14px}}
    {c} .device img{{display:block;width:100%;height:auto}}
    {c} .np{{font-family:{t['cjk']};font-size:25px;color:{t['a1']};letter-spacing:.04em;padding:34px 48px 14px}}
    {c} .spectrum{{display:flex;align-items:center;gap:5px;height:150px;margin:0 48px}}
    {c} .cta{{margin:40px auto 0;width:max-content;font-family:'DM Mono',monospace;font-weight:700;font-size:40px;
        color:#04120c;background:{t['a1']};padding:20px 38px;border-radius:16px;box-shadow:0 0 40px {t['a1']}80}}
    {c} .ft{{text-align:center;font-family:{t['cjk']};font-size:22px;color:{t['dim']};padding:32px 40px 0}}
    '''
    deco = ""
    if t["deco"] == "glass":
        base += f"{c} .device,{c} .cta{{backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}}"
        base += f"{c} .chip{{backdrop-filter:blur(10px)}}"
        base += f"{c} .cta{{color:#08210f}}"
    if t["deco"] == "grid":
        deco = (f'<div class="deco-grid"></div>')
        base += (f"{c} .deco-grid{{position:absolute;inset:55% 0 0 0;"
                 "background-image:linear-gradient(#01CDFE55 1px,transparent 1px),linear-gradient(90deg,#01CDFE55 1px,transparent 1px);"
                 "background-size:60px 60px;transform:perspective(400px) rotateX(60deg);transform-origin:bottom;opacity:.5}}")
        base += f"{c}{{position:relative;overflow:hidden}}"
        base += f"{c} .cta{{color:#0a0420}}"
    if t["deco"] == "sparkle":
        deco = ''.join(f'<div class="spk" style="left:{x}%;top:{y}%;font-size:{s}px">✦</div>'
                       for x,y,s in [(12,18,34),(86,12,26),(78,40,40),(8,62,28),(90,70,30),(20,88,34)])
        base += f"{c} .spk{{position:absolute;color:#fff;text-shadow:0 0 10px #FF69B4;opacity:.9}}"
        base += f"{c}{{position:relative;overflow:hidden}}"
        base += f"{c} .chip,{c} .device{{box-shadow:{t['shadow']}}}"
        base += f"{c} .cta{{background:linear-gradient(90deg,#FF69B4,#00C2FF);color:#fff}}"
    if t["deco"] == "scan":
        deco = '<div class="scan"></div>'
        base += (f"{c} .scan{{position:absolute;inset:0;pointer-events:none;"
                 "background:repeating-linear-gradient(0deg,rgba(54,240,140,.06) 0 2px,transparent 2px 4px)}}")
        base += f"{c}{{position:relative;overflow:hidden}}"
    if t["deco"] == "marquee":
        deco = f'<div class="mq">VIBE · MUSIC · 打字成曲 · VIBE · MUSIC · 打字成曲 ·</div>'
        base += (f"{c} .mq{{position:absolute;top:0;left:0;right:0;background:{t['a1']};color:#000;"
                 "font-family:'Space Grotesk';font-weight:700;font-size:22px;letter-spacing:1px;padding:8px 0;white-space:nowrap;overflow:hidden}}")
        base += f"{c}{{position:relative;overflow:hidden}}"
        base += f"{c} .hd{{padding-top:60px;text-transform:uppercase;letter-spacing:-1px;font-family:'Space Grotesk'}}"
        base += f"{c} .chip{{border-radius:0;color:#000;background:{t['a1']};border:none;text-transform:uppercase}}"
        base += f"{c} .prompt{{text-transform:uppercase;letter-spacing:-1px;line-height:1.0;font-size:70px}}"
        base += f"{c} .device{{border:2px solid {t['border']};border-radius:0}}"
        base += f"{c} .cta{{border-radius:0;background:{t['a1']};box-shadow:6px 6px 0 #000}}"
    if t["deco"] == "sticker":
        base += f"{c} .chip{{border:3px solid #111;box-shadow:4px 4px 0 #111;color:#111;font-weight:800}}"
        base += f"{c} .chip.rot{{transform:rotate(-3deg)}}"
        base += f"{c} .promptbox{{margin:18px 40px 0;background:#fff;border:4px solid #111;border-radius:16px;box-shadow:8px 8px 0 #111;padding:18px 22px;transform:rotate(-1deg)}}"
        base += f"{c} .promptbox .prompt{{padding:0;text-shadow:none}}"
        base += f"{c} .device{{border:4px solid #111;box-shadow:8px 8px 0 #111;border-radius:14px}}"
        base += f"{c} .device .bar{{background:#111;color:#fff}}"
        base += f"{c} .cta{{background:#FF5247;color:#fff;border:4px solid #111;box-shadow:8px 8px 0 #111;border-radius:14px}}"
        base += f"{c} .np{{color:#7C5CFF;font-weight:700}}"
        base += f"{c} .spectrum div{{box-shadow:none !important}}"
    if t["deco"] == "rule":
        base += f"{c} .byline{{text-align:center;font-family:'DM Mono',monospace;font-size:20px;letter-spacing:.3em;color:{t['dim']};padding-top:10px}}"
        base += f"{c} .rule{{border:none;border-top:1px solid {t['border']};margin:26px 48px}}"
        base += f"{c} .hd{{font-style:italic;font-weight:600}}"
        base += f"{c} .prompt{{font-family:'Playfair Display',serif;font-weight:800;font-size:80px}}"
        base += f"{c} .dc{{float:left;font-size:120px;line-height:.8;color:{t['a1']};margin-right:6px}}"
        base += f"{c} .figcap{{text-align:center;font-family:'DM Mono',monospace;font-size:20px;color:{t['dim']};padding:12px 48px 0}}"
        base += f"{c} .cta{{background:{t['a1']};color:#fff}}"
        base += f"{c} .np{{color:{t['a1']}}}"
    if t["kind"] == "bento":
        base += f"{c} .bento{{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:30px 38px 0}}"
        base += f"{c} .cell{{background:{t['panel']};border:1px solid {t['border']};border-radius:{t['radius']}px;padding:22px}}"
        base += f"{c} .hd-cell{{grid-column:1/3;font-size:30px;font-weight:700;text-align:center}}"
        base += f"{c} .kick-cell{{display:flex;align-items:center;justify-content:center}}"
        base += f"{c} .prompt-cell{{}}"
        base += f"{c} .prompt-cell .prompt{{padding:0;font-size:40px;line-height:1.2}}"
        base += f"{c} .prompt-cell .tag{{padding:10px 0 0;font-size:22px}}"
        base += f"{c} .dev-cell{{grid-column:1/3;padding:0;border:none;background:none}}"
        base += f"{c} .dev-cell .device{{margin:0}}"
        base += f"{c} .np-cell{{grid-column:1/3}}"
        base += f"{c} .np-cell .np{{padding:0 0 12px}}"
        base += f"{c} .np-cell .spectrum{{margin:0;height:110px}}"
        base += f"{c} .cta-cell{{grid-column:1/3;display:flex;justify-content:center}}"
        base += f"{c} .cta-cell .cta{{margin:0}}"
    return base, deco


def build():
    cards = []
    css = []
    for t in THEMES:
        c, deco = theme_css(t)
        css.append(c)
        cards.append(f'''
      <figure class="card">
        <div class="meta"><span class="num">{t['id']}</span><span class="nm">{t['name']}</span></div>
        <div class="why">{t['why']}</div>
        <div class="stage">
          <div class="frame cand{t['id']}">
            {deco}
            {inner(t)}
          </div>
        </div>
      </figure>''')

    html = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>vibe-music · 视频设计候选 (9)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{GFONTS}" rel="stylesheet">
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;background:#0a0a0f;color:#e8e6f0;font-family:'Poppins','Noto Sans SC',system-ui,sans-serif}}
  header{{padding:40px 32px 8px;text-align:center}}
  header h1{{margin:0;font-size:30px;font-weight:800;letter-spacing:-.01em}}
  header p{{margin:10px 0 0;color:#9b97b8;font-size:15px}}
  .grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;padding:28px 32px 80px;max-width:1320px;margin:0 auto}}
  @media(max-width:1100px){{.grid{{grid-template-columns:repeat(2,1fr)}}}}
  @media(max-width:760px){{.grid{{grid-template-columns:1fr}}}}
  .card{{margin:0;background:#101019;border:1px solid #21212e;border-radius:18px;padding:16px;transition:transform .2s,border-color .2s}}
  .card:hover{{transform:translateY(-4px);border-color:#3a3a52}}
  .meta{{display:flex;align-items:center;gap:10px;margin-bottom:6px}}
  .num{{width:30px;height:30px;border-radius:8px;background:#EC4899;color:#fff;display:grid;place-items:center;font-weight:800;font-size:16px}}
  .nm{{font-weight:700;font-size:18px}}
  .why{{color:#9b97b8;font-size:13px;line-height:1.5;min-height:56px;margin-bottom:12px}}
  /* phone stage: render 1080x1920 frame scaled to fit card width */
  .stage{{width:100%;aspect-ratio:1080/1920;border-radius:14px;overflow:hidden;position:relative;background:#000}}
  .frame{{position:absolute;top:0;left:0;width:1080px;height:1920px;transform-origin:top left}}
  {''.join(css)}
</style></head>
<body>
  <header>
    <h1>🎬 vibe-music · 视频设计候选（9 选 1）</h1>
    <p>同一帧画面的 9 种视觉方向 · 竖屏 1080×1920 · 选好后我用 Remotion 把它做成真视频（含真实声音 + 频谱）。告诉我编号即可。</p>
  </header>
  <div class="grid">
    {''.join(cards)}
  </div>
  <script>
    // scale each 1080x1920 frame to its card width
    function fit(){{
      document.querySelectorAll('.stage').forEach(s=>{{
        const f=s.querySelector('.frame');
        f.style.transform='scale('+(s.clientWidth/1080)+')';
      }});
    }}
    window.addEventListener('resize',fit); window.addEventListener('load',fit); fit();
  </script>
</body></html>'''
    return html


if __name__ == "__main__":
    open("index.html", "w").write(build())
    print("wrote index.html")
