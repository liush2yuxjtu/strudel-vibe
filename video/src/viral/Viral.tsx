import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useWindowedAudioData, visualizeAudio } from "@remotion/media-utils";
import {
  VIDEO_SRC,
  AUDIO_SRC,
  COLORS,
  MONO,
  DISPLAY,
  SECTIONS,
  ACCENT_HEX,
  sectionAt,
} from "./config";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------------------------------------------------------------- main
export const Viral: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height >= width;

  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
    src: staticFile(AUDIO_SRC),
    frame,
    fps,
    windowInSeconds: 30,
  });

  const frequencies = audioData
    ? visualizeAudio({
        fps,
        frame,
        audioData,
        numberOfSamples: 64,
        optimizeFor: "speed",
        dataOffsetInSeconds,
      })
    : null;

  // bass intensity for global pulse
  const bass = frequencies
    ? Math.min(
        1,
        (frequencies.slice(0, 8).reduce((a, b) => a + b, 0) / 8) * 3,
      )
    : 0;

  const idx = sectionAt(frame);
  const section = SECTIONS[idx];
  const accent = ACCENT_HEX[section.accent];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <Bg frame={frame} fps={fps} width={width} height={height} bass={bass} accent={accent} />
      {isVertical
        ? <Vertical frame={frame} idx={idx} accent={accent} frequencies={frequencies} bass={bass} width={width} height={height} />
        : <Landscape frame={frame} idx={idx} accent={accent} frequencies={frequencies} bass={bass} width={width} height={height} />}
      <Audio src={staticFile(AUDIO_SRC)} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- background
const Bg: React.FC<{ frame: number; fps: number; width: number; height: number; bass: number; accent: string }> = ({
  frame, fps, width, height, bass, accent,
}) => {
  const t = frame / fps;
  const b1x = Math.sin(t * 0.45) * 240;
  const b1y = Math.cos(t * 0.33) * 160;
  const b2x = Math.cos(t * 0.3) * 220;
  const b2y = Math.sin(t * 0.5) * 180;
  const flash = 0.06 + bass * 0.18;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 760px at ${width * 0.78 + b1x}px ${height * 0.16 + b1y}px, rgba(176,122,255,.32), transparent 60%),
          radial-gradient(820px 720px at ${width * 0.22 + b2x}px ${height * 0.82 + b2y}px, rgba(122,240,192,.24), transparent 58%),
          radial-gradient(680px 520px at ${width * 0.5}px ${height * 0.5}px, rgba(255,93,158,.12), transparent 60%)`,
        }}
      />
      {/* bass flash */}
      <AbsoluteFill style={{ background: accent, opacity: flash, mixBlendMode: "overlay" }} />
      {/* vignette */}
      <AbsoluteFill style={{ boxShadow: "inset 0 0 360px 90px rgba(0,0,0,.85)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- device card
const DeviceCard: React.FC<{ frame: number; fps: number; w: number; bass: number; accent: string }> = ({
  frame, fps, w, bass, accent,
}) => {
  const intro = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const scale = interpolate(intro, [0, 1], [0.94, 1]);
  const opacity = interpolate(frame, [0, 8], [0, 1], CLAMP);
  const vh = Math.round((w * 720) / 1280);
  const glow = 24 + bass * 70;
  return (
    <div
      style={{
        width: w,
        transform: `scale(${scale})`,
        opacity,
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${accent}55`,
        boxShadow: `0 40px 120px -30px ${accent}55, 0 0 ${glow}px ${Math.round(glow * 0.4)}px ${accent}40, 0 0 0 1px rgba(255,255,255,.03)`,
        background: "#0b0b12",
      }}
    >
      <div
        style={{
          height: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 16px",
          background: "linear-gradient(180deg,#15131f,#0e0d16)", borderBottom: "1px solid #221f31", fontFamily: MONO,
        }}
      >
        <Dot c="#ff5f57" /><Dot c="#febc2e" /><Dot c="#28c840" />
        <div
          style={{
            marginLeft: 12, flex: 1, maxWidth: 460, height: 26, borderRadius: 999, background: "#0a0a12",
            border: "1px solid #262338", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 14, color: "#9b97b8",
          }}
        >
          <span style={{ color: COLORS.neon, marginRight: 8 }}>▲</span>vibe-web-gray.vercel.app
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, color: COLORS.hot, fontSize: 13, fontWeight: 700 }}>
          <RecDot /> LIVE
        </div>
      </div>
      <div style={{ position: "relative", width: w, height: vh }}>
        <OffthreadVideo
          src={staticFile(VIDEO_SRC)}
          muted
          style={{ width: w, height: vh, objectFit: "cover", display: "block" }}
        />
      </div>
    </div>
  );
};

const Dot: React.FC<{ c: string }> = ({ c }) => (
  <div style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
);
const RecDot: React.FC = () => {
  const frame = useCurrentFrame();
  const o = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame * 0.4));
  return <div style={{ width: 11, height: 11, borderRadius: "50%", background: COLORS.hot, opacity: o, boxShadow: `0 0 10px ${COLORS.hot}` }} />;
};

// ---------------------------------------------------------------- spectrum bars
const Spectrum: React.FC<{ frequencies: number[] | null; accent: string; width: number; height: number }> = ({
  frequencies, accent, width, height,
}) => {
  const N = 41; // odd -> symmetric center
  const half = (N - 1) / 2;
  const vals: number[] = [];
  for (let i = 0; i < N; i++) {
    const dist = Math.abs(i - half); // 0 at center
    const fi = Math.min(31, Math.round((dist / half) * 31)); // center=bass
    let v = frequencies ? frequencies[fi] ?? 0 : 0;
    // log scaling for visual balance
    const db = 20 * Math.log10(Math.max(v, 1e-6));
    v = Math.max(0, Math.min(1, (db - -62) / (-12 - -62)));
    vals.push(v);
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.max(3, width * 0.004), width, height }}>
      {vals.map((v, i) => {
        const h = Math.max(height * 0.06, v * height);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: h,
              borderRadius: 99,
              alignSelf: "center",
              background: `linear-gradient(180deg, ${accent}, ${COLORS.purple})`,
              boxShadow: `0 0 ${6 + v * 16}px ${accent}${v > 0.5 ? "cc" : "55"}`,
            }}
          />
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- typed prompt
const TypedPrompt: React.FC<{
  text: string; localFrame: number; accent: string; fontSize: number; maxWidth: number;
}> = ({ text, localFrame, accent, fontSize, maxWidth }) => {
  const charsPerFrame = 1.5;
  const n = Math.max(0, Math.floor(localFrame * charsPerFrame));
  const shown = text.slice(0, n);
  const done = n >= text.length;
  const cursorOn = done ? Math.floor(localFrame / 8) % 2 === 0 : true;
  return (
    <div
      style={{
        fontFamily: DISPLAY, fontWeight: 800, fontSize, lineHeight: 1.08, color: COLORS.ink,
        maxWidth, letterSpacing: "-0.015em", textShadow: "0 6px 30px rgba(0,0,0,.75)",
      }}
    >
      <span style={{ color: COLORS.dim }}>“</span>
      {shown}
      <span style={{ color: COLORS.dim }}>{done ? "”" : ""}</span>
      <span style={{ opacity: cursorOn ? 1 : 0, color: accent, fontWeight: 400 }}>▌</span>
    </div>
  );
};

const Kicker: React.FC<{ label: string; accent: string; localFrame: number; size?: number }> = ({
  label, accent, localFrame, size = 20,
}) => {
  const op = interpolate(localFrame, [0, 8], [0, 1], CLAMP);
  const x = interpolate(localFrame, [0, 10], [-22, 0], CLAMP);
  return (
    <div
      style={{
        transform: `translateX(${x}px)`, opacity: op, display: "inline-flex", alignItems: "center", gap: 10,
        fontFamily: MONO, fontSize: size, fontWeight: 700, letterSpacing: "0.22em", color: accent,
        background: "rgba(10,10,18,.6)", border: `1px solid ${accent}55`, padding: "8px 16px", borderRadius: 999,
        backdropFilter: "blur(6px)",
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 99, background: accent, boxShadow: `0 0 12px ${accent}` }} />
      {label}
    </div>
  );
};

const Tag: React.FC<{ text: string; localFrame: number; size: number }> = ({ text, localFrame, size }) => {
  const op = interpolate(localFrame, [12, 24], [0, 1], CLAMP);
  const y = interpolate(localFrame, [12, 26], [16, 0], CLAMP);
  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, fontFamily: MONO, fontSize: size, color: COLORS.dim, marginTop: size * 0.7 }}>
      {text}
    </div>
  );
};

const Brand: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em" }}>
    <span style={{ color: COLORS.neon }}>vibe</span>
    <span style={{ color: "#7a7790" }}>-</span>
    <span style={{ color: COLORS.purple }}>music</span>
  </div>
);

const CTA: React.FC<{ frame: number; fps: number; size: number; show: boolean }> = ({ frame, fps, size, show }) => {
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.18);
  const pop = show ? spring({ frame: frame - 0, fps, config: { damping: 14 } }) : 1;
  return (
    <div
      style={{
        transform: `scale(${interpolate(pop, [0, 1], [0.9, 1])})`,
        display: "inline-flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: size, fontWeight: 700,
        color: "#04120c", background: COLORS.neon, padding: `${size * 0.45}px ${size * 0.85}px`, borderRadius: 16,
        boxShadow: `0 0 ${24 + glow * 46}px rgba(122,240,192,${0.45 + glow * 0.4})`,
      }}
    >
      ▶ vibe-web-gray.vercel.app
    </div>
  );
};

// ---------------------------------------------------------------- VERTICAL 1080x1920
const Vertical: React.FC<{
  frame: number; idx: number; accent: string; frequencies: number[] | null; bass: number; width: number; height: number;
}> = ({ frame, idx, accent, frequencies, width }) => {
  const { fps } = useVideoConfig();
  const section = SECTIONS[idx];
  const localFrame = frame - Math.round(section.start * fps);
  const cardW = width - 76;

  return (
    <AbsoluteFill>
      {/* header */}
      <div style={{ position: "absolute", top: 58, left: 0, width, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 26, color: COLORS.ink,
            background: "rgba(10,10,18,.55)", border: "1px solid #2a2740", padding: "12px 22px", borderRadius: 999, backdropFilter: "blur(6px)",
          }}
        >
          🎛️ this site turns <b style={{ color: accent }}>words</b> into <b style={{ color: COLORS.purple }}>music</b>
        </div>
      </div>

      {/* caption block */}
      <div key={idx} style={{ position: "absolute", top: 150, left: 48, width: width - 96 }}>
        <Kicker label={section.kicker} accent={accent} localFrame={localFrame} size={22} />
        <div style={{ marginTop: 22 }}>
          <TypedPrompt text={section.prompt} localFrame={localFrame} accent={accent} fontSize={62} maxWidth={width - 96} />
        </div>
        <Tag text={section.tag} localFrame={localFrame} size={28} />
      </div>

      {/* device card */}
      <div style={{ position: "absolute", top: 612, left: 38, width: cardW }}>
        <DeviceCard frame={frame} fps={fps} w={cardW} bass={(frequencies?.slice(0,8).reduce((a,b)=>a+b,0) ?? 0)/8*3} accent={accent} />
      </div>

      {/* now playing + spectrum */}
      <div style={{ position: "absolute", top: 1300, left: 48, width: width - 96 }}>
        <div style={{ fontFamily: MONO, fontSize: 22, color: accent, letterSpacing: "0.18em", marginBottom: 14 }}>
          ♪ NOW PLAYING — REAL STRUDEL AUDIO
        </div>
        <Spectrum frequencies={frequencies} accent={accent} width={width - 96} height={150} />
      </div>

      {/* CTA */}
      <div style={{ position: "absolute", top: 1600, left: 0, width, display: "flex", justifyContent: "center" }}>
        <CTA frame={frame} fps={fps} size={40} show={false} />
      </div>

      {/* footer brand */}
      <div style={{ position: "absolute", bottom: 70, left: 0, width, display: "flex", justifyContent: "center", gap: 18, alignItems: "center" }}>
        <Brand size={30} />
        <span style={{ fontFamily: MONO, fontSize: 22, color: "#7a7790" }}>· NL→code by MiniMax</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- LANDSCAPE 1920x1080
const Landscape: React.FC<{
  frame: number; idx: number; accent: string; frequencies: number[] | null; bass: number; width: number; height: number;
}> = ({ frame, idx, accent, frequencies, width, height }) => {
  const { fps } = useVideoConfig();
  const section = SECTIONS[idx];
  const localFrame = frame - Math.round(section.start * fps);
  const cardW = 1020;

  return (
    <AbsoluteFill>
      {/* left: device card */}
      <div style={{ position: "absolute", top: (height - (44 + (cardW * 720) / 1280)) / 2, left: 70 }}>
        <DeviceCard frame={frame} fps={fps} w={cardW} bass={(frequencies?.slice(0,8).reduce((a,b)=>a+b,0) ?? 0)/8*3} accent={accent} />
      </div>

      {/* header top-left */}
      <div style={{ position: "absolute", top: 48, left: 70, display: "flex", alignItems: "center", gap: 16 }}>
        <Brand size={30} />
        <span style={{ fontFamily: MONO, fontSize: 22, color: "#8c89a6" }}>· words → music, live in your browser</span>
      </div>

      {/* right column: captions */}
      <div key={idx} style={{ position: "absolute", top: 150, left: 1160, width: width - 1160 - 70 }}>
        <Kicker label={section.kicker} accent={accent} localFrame={localFrame} size={22} />
        <div style={{ marginTop: 24 }}>
          <TypedPrompt text={section.prompt} localFrame={localFrame} accent={accent} fontSize={58} maxWidth={width - 1160 - 70} />
        </div>
        <Tag text={section.tag} localFrame={localFrame} size={26} />
      </div>

      {/* right column: spectrum + cta */}
      <div style={{ position: "absolute", top: 640, left: 1160, width: width - 1160 - 70 }}>
        <div style={{ fontFamily: MONO, fontSize: 20, color: accent, letterSpacing: "0.18em", marginBottom: 14 }}>
          ♪ NOW PLAYING — REAL STRUDEL AUDIO
        </div>
        <Spectrum frequencies={frequencies} accent={accent} width={width - 1160 - 70} height={120} />
        <div style={{ marginTop: 44 }}>
          <CTA frame={frame} fps={fps} size={36} show={false} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
