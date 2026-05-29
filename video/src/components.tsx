import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { ACCENTS, Scene } from "./scenes";

export const MONO =
  '"SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';
export const DISPLAY =
  '"SF Pro Display", "Helvetica Neue", Inter, system-ui, sans-serif';

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 132bpm pulse in [0,1], sharp attack — drives "音乐感" without audio.
function beatPulse(frame: number, fps: number, bpm = 132) {
  const beats = (frame / fps) * (bpm / 60);
  const f = beats - Math.floor(beats);
  return Math.pow(1 - f, 2.4);
}

// ---------------------------------------------------------------- background
export const Bg: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const b1x = Math.sin(t * 0.45) * 240;
  const b1y = Math.cos(t * 0.33) * 140;
  const b2x = Math.cos(t * 0.3) * 220;
  const b2y = Math.sin(t * 0.5) * 160;
  return (
    <AbsoluteFill style={{ background: "#07070d" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${1300 + b1x}px ${
            120 + b1y
          }px, rgba(176,122,255,.30), transparent 60%),
          radial-gradient(820px 680px at ${360 + b2x}px ${
            980 + b2y
          }px, rgba(122,240,192,.22), transparent 58%),
          radial-gradient(700px 520px at 960px 540px, rgba(255,93,158,.10), transparent 60%)`,
        }}
      />
      <BarField />
      {/* vignette */}
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 320px 80px rgba(0,0,0,.85)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

// faint full-width bars behind everything, beat-reactive
const BarField: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const N = 72;
  const pulse = beatPulse(frame, fps);
  return (
    <AbsoluteFill style={{ alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 6, width, height: height * 0.7, alignItems: "flex-end", opacity: 0.16 }}>
        {Array.from({ length: N }).map((_, i) => {
          const wob = Math.sin(frame * 0.08 + i * 0.6) * 0.5 + 0.5;
          const h = (0.08 + wob * 0.5 + pulse * 0.4) * 100;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: 4,
                background: "linear-gradient(180deg,#7af0c0,#b07aff)",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------- the browser card
export const BrowserFrame: React.FC<{ clip: string }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const scale = interpolate(intro, [0, 1], [0.965, 1]);
  const opacity = interpolate(frame, [0, 7], [0, 1], clamp);
  // neon cut-flash
  const flash = interpolate(frame, [0, 8], [0.5, 0], clamp);

  const CARD_W = 1280;
  const CARD_H = 720;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          marginTop: 84,
          width: CARD_W,
          transform: `scale(${scale})`,
          opacity,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid #2a2740",
          boxShadow:
            "0 40px 120px -30px rgba(122,240,192,.25), 0 30px 90px -20px rgba(176,122,255,.30), 0 0 0 1px rgba(255,255,255,.03)",
          background: "#0b0b12",
        }}
      >
        {/* mock browser bar */}
        <div
          style={{
            height: 46,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            background: "linear-gradient(180deg,#15131f,#0e0d16)",
            borderBottom: "1px solid #221f31",
            fontFamily: MONO,
          }}
        >
          <Dot c="#ff5f57" />
          <Dot c="#febc2e" />
          <Dot c="#28c840" />
          <div
            style={{
              marginLeft: 14,
              flex: 1,
              maxWidth: 520,
              height: 26,
              borderRadius: 999,
              background: "#0a0a12",
              border: "1px solid #262338",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              fontSize: 14,
              color: "#9b97b8",
            }}
          >
            <span style={{ color: "#7af0c0", marginRight: 8 }}>▲</span>
            vibe-web-gray.vercel.app
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, color: "#ff5d9e", fontSize: 13, fontWeight: 700 }}>
            <RecDot /> LIVE
          </div>
        </div>
        <div style={{ position: "relative", width: CARD_W, height: CARD_H }}>
          <OffthreadVideo
            src={staticFile(`clips/${clip}.mp4`)}
            style={{ width: CARD_W, height: CARD_H, objectFit: "cover", display: "block" }}
          />
          <AbsoluteFill style={{ background: "#7af0c0", opacity: flash, mixBlendMode: "overlay" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Dot: React.FC<{ c: string }> = ({ c }) => (
  <div style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />
);

const RecDot: React.FC = () => {
  const frame = useCurrentFrame();
  const o = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame * 0.4));
  return <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5d9e", opacity: o, boxShadow: "0 0 10px #ff5d9e" }} />;
};

// ------------------------------------------------------------------- captions
export const Caption: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = ACCENTS[scene.accent ?? "neon"];
  const rise = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  const y = interpolate(rise, [0, 1], [40, 0]);
  const op = interpolate(frame, [0, 10], [0, 1], clamp);
  const kickOp = interpolate(frame, [2, 12], [0, 1], clamp);
  const kickX = interpolate(rise, [0, 1], [-26, 0]);
  const subOp = interpolate(frame, [10, 22], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 300px 76px" }}>
      <div style={{ transform: `translateY(${y}px)`, opacity: op }}>
        {/* kicker chip */}
        <div
          style={{
            transform: `translateX(${kickX}px)`,
            opacity: kickOp,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontFamily: MONO,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: accent,
            background: "rgba(10,10,18,.6)",
            border: `1px solid ${accent}55`,
            padding: "8px 16px",
            borderRadius: 999,
            marginBottom: 18,
            backdropFilter: "blur(6px)",
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: 99, background: accent, boxShadow: `0 0 12px ${accent}` }} />
          {scene.kicker}
        </div>
        {/* title */}
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 56,
            lineHeight: 1.12,
            color: "#f4f2fb",
            maxWidth: 1320,
            textShadow: "0 6px 30px rgba(0,0,0,.7)",
            letterSpacing: "-0.01em",
          }}
        >
          {scene.title}
        </div>
        {/* sub */}
        <div
          style={{
            opacity: subOp,
            marginTop: 16,
            fontFamily: MONO,
            fontSize: 24,
            color: "#a7a3c4",
          }}
        >
          {scene.sub}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------- logo bug
export const LogoBug: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [4, 16], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 30,
        left: 40,
        opacity: op,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: 26,
        letterSpacing: "-0.02em",
        color: "#e8e6f0",
        zIndex: 50,
      }}
    >
      <span style={{ color: "#7af0c0" }}>vibe</span>
      <span style={{ color: "#7a7790" }}>-</span>
      <span style={{ color: "#b07aff" }}>music</span>
    </div>
  );
};

// --------------------------------------------------------------------- INTRO
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const scale = interpolate(pop, [0, 1], [0.7, 1]);
  const vibeX = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [-60, 0]);
  const musicX = interpolate(spring({ frame: frame - 4, fps, config: { damping: 200 } }), [0, 1], [60, 0]);
  const tagOp = interpolate(frame, [18, 34], [0, 1], clamp);
  const tagY = interpolate(frame, [18, 38], [24, 0], clamp);
  const flickOp = interpolate(frame, [30, 44], [0, 1], clamp);
  const out = interpolate(frame, [78, 95], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: out }}>
      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 168, letterSpacing: "-0.04em", lineHeight: 1 }}>
          <span style={{ display: "inline-block", transform: `translateX(${vibeX}px)`, color: "#7af0c0", textShadow: "0 0 60px rgba(122,240,192,.55)" }}>vibe</span>
          <span style={{ color: "#3a3550" }}>-</span>
          <span style={{ display: "inline-block", transform: `translateX(${musicX}px)`, color: "#b07aff", textShadow: "0 0 60px rgba(176,122,255,.55)" }}>music</span>
        </div>
        <div style={{ transform: `translateY(${tagY}px)`, opacity: tagOp, marginTop: 30, fontFamily: MONO, fontSize: 34, color: "#cfcce4" }}>
          type a vibe <span style={{ color: "#7af0c0" }}>→</span> MiniMax writes Strudel <span style={{ color: "#b07aff" }}>→</span> your browser plays it
        </div>
        <div style={{ opacity: flickOp, marginTop: 22, fontFamily: MONO, fontSize: 22, color: "#ff5d9e", letterSpacing: "0.1em" }}>
          a (mildly unhinged) live demo, driven by a Playwright robot 🤖
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --------------------------------------------------------------------- OUTRO
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13 } });
  const scale = interpolate(pop, [0, 1], [0.8, 1]);
  const urlOp = interpolate(frame, [16, 30], [0, 1], clamp);
  const urlY = interpolate(frame, [16, 34], [26, 0], clamp);
  const footOp = interpolate(frame, [34, 50], [0, 1], clamp);
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.18);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ transform: `scale(${scale})`, fontFamily: DISPLAY, fontWeight: 900, fontSize: 150, letterSpacing: "-0.04em", color: "#f4f2fb" }}>
          your turn<span style={{ color: "#7af0c0" }}>.</span>
        </div>
        <div
          style={{
            transform: `translateY(${urlY}px)`,
            opacity: urlOp,
            marginTop: 34,
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            fontFamily: MONO,
            fontSize: 40,
            fontWeight: 700,
            color: "#04120c",
            background: "#7af0c0",
            padding: "18px 34px",
            borderRadius: 16,
            boxShadow: `0 0 ${30 + glow * 50}px rgba(122,240,192,${0.5 + glow * 0.4})`,
          }}
        >
          ▶ vibe-web-gray.vercel.app
        </div>
        <div style={{ opacity: footOp, marginTop: 40, fontFamily: MONO, fontSize: 24, color: "#8c89a6" }}>
          built with <span style={{ color: "#7af0c0" }}>Strudel</span> · NL→code by{" "}
          <span style={{ color: "#b07aff" }}>MiniMax-M2.7</span> · terminal twin{" "}
          <span style={{ color: "#e8e6f0" }}>/vibe-music</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
