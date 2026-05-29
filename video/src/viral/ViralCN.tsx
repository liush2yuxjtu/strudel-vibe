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
  CJK,
  MONO,
  SECTIONS,
  ACCENT_HEX,
  STRINGS,
  sectionAt,
} from "./config-cn";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------------------------------------------------------------- main
export const ViralCN: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
    src: staticFile(AUDIO_SRC),
    frame,
    fps,
    windowInSeconds: 30,
  });

  const frequencies = audioData
    ? visualizeAudio({ fps, frame, audioData, numberOfSamples: 64, optimizeFor: "speed", dataOffsetInSeconds })
    : null;

  const bass = frequencies ? Math.min(1, (frequencies.slice(0, 8).reduce((a, b) => a + b, 0) / 8) * 3) : 0;

  const idx = sectionAt(frame);
  const section = SECTIONS[idx];
  const accent = ACCENT_HEX[section.accent];
  const localFrame = frame - Math.round(section.start * fps);
  const cardW = width - 76;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <Bg frame={frame} fps={fps} width={width} height={height} bass={bass} accent={accent} />

      {/* header pill */}
      <div style={{ position: "absolute", top: 58, left: 0, width, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 12, fontFamily: CJK, fontSize: 30, fontWeight: 600, color: COLORS.ink,
            background: "rgba(10,10,18,.55)", border: "1px solid #2a2740", padding: "12px 24px", borderRadius: 999, backdropFilter: "blur(6px)",
          }}
        >
          {STRINGS.header}
        </div>
      </div>

      {/* caption block */}
      <div key={idx} style={{ position: "absolute", top: 158, left: 48, width: width - 96 }}>
        <Kicker label={section.kicker} accent={accent} localFrame={localFrame} />
        <div style={{ marginTop: 22 }}>
          <TypedPrompt text={section.prompt} localFrame={localFrame} accent={accent} fontSize={66} maxWidth={width - 96} />
        </div>
        <Tag text={section.tag} localFrame={localFrame} size={30} />
      </div>

      {/* device card */}
      <div style={{ position: "absolute", top: 626, left: 38, width: cardW }}>
        <DeviceCard frame={frame} fps={fps} w={cardW} bass={bass} accent={accent} />
      </div>

      {/* now playing + spectrum */}
      <div style={{ position: "absolute", top: 1316, left: 48, width: width - 96 }}>
        <div style={{ fontFamily: CJK, fontSize: 24, color: accent, letterSpacing: "0.06em", marginBottom: 14 }}>
          ♪ {STRINGS.nowPlaying}
        </div>
        <Spectrum frequencies={frequencies} accent={accent} width={width - 96} height={150} />
      </div>

      {/* CTA */}
      <div style={{ position: "absolute", top: 1604, left: 0, width, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <CTA frame={frame} />
        <div style={{ fontFamily: CJK, fontSize: 26, color: COLORS.dim }}>{STRINGS.ctaNote}</div>
      </div>

      {/* footer */}
      <div style={{ position: "absolute", bottom: 64, left: 0, width, display: "flex", justifyContent: "center", gap: 14, alignItems: "center" }}>
        <Brand size={28} />
        <span style={{ fontFamily: CJK, fontSize: 22, color: "#7a7790" }}>· {STRINGS.footer}</span>
      </div>

      <Audio src={staticFile(AUDIO_SRC)} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- background
const Bg: React.FC<{ frame: number; fps: number; width: number; height: number; bass: number; accent: string }> = ({
  frame, fps, width, height, bass, accent,
}) => {
  const t = frame / fps;
  const b1x = Math.sin(t * 0.4) * 220;
  const b1y = Math.cos(t * 0.3) * 150;
  const b2x = Math.cos(t * 0.28) * 200;
  const b2y = Math.sin(t * 0.46) * 170;
  const flash = 0.05 + bass * 0.16;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 760px at ${width * 0.78 + b1x}px ${height * 0.16 + b1y}px, rgba(176,122,255,.30), transparent 60%),
          radial-gradient(820px 720px at ${width * 0.22 + b2x}px ${height * 0.82 + b2y}px, rgba(122,240,192,.22), transparent 58%),
          radial-gradient(680px 520px at ${width * 0.5}px ${height * 0.5}px, rgba(255,93,158,.10), transparent 60%)`,
        }}
      />
      <AbsoluteFill style={{ background: accent, opacity: flash, mixBlendMode: "overlay" }} />
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
        width: w, transform: `scale(${scale})`, opacity, borderRadius: 20, overflow: "hidden",
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
        <OffthreadVideo src={staticFile(VIDEO_SRC)} muted style={{ width: w, height: vh, objectFit: "cover", display: "block" }} />
      </div>
    </div>
  );
};

const Dot: React.FC<{ c: string }> = ({ c }) => <div style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />;
const RecDot: React.FC = () => {
  const frame = useCurrentFrame();
  const o = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame * 0.4));
  return <div style={{ width: 11, height: 11, borderRadius: "50%", background: COLORS.hot, opacity: o, boxShadow: `0 0 10px ${COLORS.hot}` }} />;
};

// ---------------------------------------------------------------- spectrum
const Spectrum: React.FC<{ frequencies: number[] | null; accent: string; width: number; height: number }> = ({
  frequencies, accent, width, height,
}) => {
  const N = 41;
  const half = (N - 1) / 2;
  const vals: number[] = [];
  for (let i = 0; i < N; i++) {
    const dist = Math.abs(i - half);
    const fi = Math.min(31, Math.round((dist / half) * 31));
    let v = frequencies ? frequencies[fi] ?? 0 : 0;
    const db = 20 * Math.log10(Math.max(v, 1e-6));
    v = Math.max(0, Math.min(1, (db - -62) / (-12 - -62)));
    vals.push(v);
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.max(3, width * 0.004), width, height }}>
      {vals.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: Math.max(height * 0.06, v * height), borderRadius: 99, alignSelf: "center",
            background: `linear-gradient(180deg, ${accent}, ${COLORS.purple})`,
            boxShadow: `0 0 ${6 + v * 16}px ${accent}${v > 0.5 ? "cc" : "55"}`,
          }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- typed prompt
const TypedPrompt: React.FC<{ text: string; localFrame: number; accent: string; fontSize: number; maxWidth: number }> = ({
  text, localFrame, accent, fontSize, maxWidth,
}) => {
  const charsPerFrame = 0.9; // slower for Chinese readability
  const n = Math.max(0, Math.floor(localFrame * charsPerFrame));
  const shown = text.slice(0, n);
  const done = n >= text.length;
  const cursorOn = done ? Math.floor(localFrame / 8) % 2 === 0 : true;
  return (
    <div
      style={{
        fontFamily: CJK, fontWeight: 700, fontSize, lineHeight: 1.18, color: COLORS.ink,
        maxWidth, letterSpacing: "0.01em", textShadow: "0 6px 30px rgba(0,0,0,.75)",
      }}
    >
      <span style={{ color: COLORS.dim }}>「</span>
      {shown}
      <span style={{ color: COLORS.dim }}>{done ? "」" : ""}</span>
      <span style={{ opacity: cursorOn ? 1 : 0, color: accent, fontWeight: 400 }}>▌</span>
    </div>
  );
};

const Kicker: React.FC<{ label: string; accent: string; localFrame: number }> = ({ label, accent, localFrame }) => {
  const op = interpolate(localFrame, [0, 8], [0, 1], CLAMP);
  const x = interpolate(localFrame, [0, 10], [-22, 0], CLAMP);
  return (
    <div
      style={{
        transform: `translateX(${x}px)`, opacity: op, display: "inline-flex", alignItems: "center", gap: 10,
        fontFamily: CJK, fontSize: 24, fontWeight: 700, letterSpacing: "0.08em", color: accent,
        background: "rgba(10,10,18,.6)", border: `1px solid ${accent}55`, padding: "8px 18px", borderRadius: 999, backdropFilter: "blur(6px)",
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
    <div style={{ opacity: op, transform: `translateY(${y}px)`, fontFamily: CJK, fontSize: size, color: COLORS.dim, marginTop: size * 0.8 }}>
      {text}
    </div>
  );
};

const Brand: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ fontFamily: '"SF Pro Display", system-ui, sans-serif', fontWeight: 800, fontSize: size, letterSpacing: "-0.02em" }}>
    <span style={{ color: COLORS.neon }}>vibe</span>
    <span style={{ color: "#7a7790" }}>-</span>
    <span style={{ color: COLORS.purple }}>music</span>
  </div>
);

const CTA: React.FC<{ frame: number }> = ({ frame }) => {
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.18);
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 40, fontWeight: 700,
        color: "#04120c", background: COLORS.neon, padding: "18px 34px", borderRadius: 16,
        boxShadow: `0 0 ${24 + glow * 46}px rgba(122,240,192,${0.45 + glow * 0.4})`,
      }}
    >
      ▶ vibe-web-gray.vercel.app
    </div>
  );
};
