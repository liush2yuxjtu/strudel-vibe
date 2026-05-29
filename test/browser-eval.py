#!/usr/bin/env python3
"""Third-party browser judge for eval.md points #4 (web live) and #5 (perceivable).

Drives the real site in headless Chromium, observes only externally-visible facts,
and prints a fixed JSON verdict. It does NOT trust the app's self-report for the
pass/fail — it measures: HTTP 200, /api/vibe returns code, AudioContext.state, the
click→composing latency (in-page timestamps), and whether the UI ever sits static
for >1s while composing.

Usage:  python3 test/browser-eval.py <url>
Requires: playwright (python) with chromium installed.
"""
import sys, time, json, urllib.request
from playwright.sync_api import sync_playwright

URL = (sys.argv[1] if len(sys.argv) > 1 else "https://vibe-web-gray.vercel.app/").rstrip("/") + "/"


def http_status(u):
    try:
        with urllib.request.urlopen(u, timeout=15) as r:
            return r.status
    except Exception as e:
        return f"err:{e}"


def api_post(u, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(u, data=data, headers={"content-type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except Exception as e:
        return f"err:{e}", {}


def main():
    ev = {"url": URL}

    # --- eval #4 observable facts via plain HTTP (no browser needed) ---
    ev["home_status"] = http_status(URL)
    st, body = api_post(URL + "api/vibe", {"intent": "house beat"})
    ev["api_status"] = st
    ev["api_returned_code"] = bool(body.get("code"))
    ev["api_code_sample"] = body.get("code", "")

    # --- browser run: AudioContext + perceivable feedback ---
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=["--autoplay-policy=no-user-gesture-required", "--mute-audio"])
        pg = b.new_page()
        cerr = []
        pg.on("pageerror", lambda e: cerr.append("pageerror:" + str(e)))
        pg.goto(URL, wait_until="load")
        pg.wait_for_function("window.__vibe && true", timeout=15000)

        # capture-phase click timestamp (fires before the chip's onclick→vibe())
        pg.evaluate("""() => { window.__clickT=null;
          document.addEventListener('click', () => { if(window.__clickT===null) window.__clickT=performance.now(); }, true); }""")
        pg.click(".chip")

        # eval #5a: feedback latency, measured purely from in-page timestamps
        pg.wait_for_function("window.__vibe.phase()==='composing'", timeout=4000)
        lat = pg.evaluate("() => window.__vibe.phaseSince() - window.__clickT")
        ev["feedback_latency_ms"] = round(lat, 2)

        # eval #5b: sample the UI through composing→play; prove it never sits still
        samples, deadline = [], time.time() + 30
        while time.time() < deadline:
            s = pg.evaluate("""() => ({t:performance.now(), phase:window.__vibe.phase(),
              audio:window.__vibe.audioState(), vtext:document.getElementById('vtext').textContent,
              bars:[...document.querySelectorAll('#viz i')].slice(0,8).map(b=>b.style.height)})""")
            samples.append(s)
            if s["phase"] == "playing":
                for _ in range(5):
                    time.sleep(0.12)
                    samples.append(pg.evaluate("""() => ({t:performance.now(), phase:window.__vibe.phase(),
                      audio:window.__vibe.audioState(),
                      bars:[...document.querySelectorAll('#viz i')].slice(0,8).map(b=>b.style.height)})"""))
                break
            time.sleep(0.15)

        busy = [s for s in samples if s["phase"] in ("composing", "loading")]
        max_static = 0.0
        for a, c in zip(busy, busy[1:]):
            if a.get("bars") == c.get("bars") and a.get("vtext") == c.get("vtext"):
                max_static = max(max_static, c["t"] - a["t"])
        play = [s for s in samples if s["phase"] == "playing"]
        ev["busy_samples"] = len(busy)
        ev["busy_max_static_ms"] = round(max_static, 1)
        ev["reached_playing"] = any(s["phase"] == "playing" for s in samples)
        ev["audio_state_when_playing"] = (play[-1]["audio"] if play else pg.evaluate("window.__vibe.audioState()"))
        ev["play_distinct_bar_frames"] = len({tuple(s.get("bars", [])) for s in play})
        ev["page_errors"] = cerr[:5]
        b.close()

    # --- verdicts (fixed predicates; no human judgement) ---
    eval4 = (ev["home_status"] == 200 and ev["api_status"] == 200 and ev["api_returned_code"]
             and ev["reached_playing"] and ev["audio_state_when_playing"] == "running")
    eval5 = (isinstance(ev.get("feedback_latency_ms"), (int, float)) and ev["feedback_latency_ms"] < 100
             and ev["busy_samples"] >= 2 and ev["busy_max_static_ms"] < 1000
             and ev["play_distinct_bar_frames"] >= 2)

    print(json.dumps({
        "eval4_web_live": {"pass": bool(eval4), "evidence": {k: ev[k] for k in
            ["home_status", "api_status", "api_returned_code", "api_code_sample",
             "reached_playing", "audio_state_when_playing"]}},
        "eval5_perceivable": {"pass": bool(eval5), "evidence": {k: ev[k] for k in
            ["feedback_latency_ms", "busy_samples", "busy_max_static_ms", "play_distinct_bar_frames"]}},
        "raw": ev,
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
