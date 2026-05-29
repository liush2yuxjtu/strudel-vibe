// RedNote (小红书) cut — calm Chinese user building one chill lo-fi track,
// real captured WebAudio. Trimmed to the first beat (ss 20.527s) so music
// hits at frame 0. Section starts = real pattern-change times in the clip.

export const FPS = 30;
export const DURATION_FRAMES = Math.floor(54.47 * FPS); // 1634

export const VIDEO_SRC = "viral-cn.mp4";
export const AUDIO_SRC = "viral-cn-audio.wav";

export const COLORS = {
  bg: "#07070d",
  neon: "#7af0c0",
  purple: "#b07aff",
  hot: "#ff5d9e",
  ink: "#f4f2fb",
  dim: "#b3afce",
};

// CJK-friendly stacks (PingFang on macOS render host; Noto fallback).
export const CJK =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Noto Sans CJK SC", system-ui, sans-serif';
export const MONO =
  '"SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';

export type Accent = "neon" | "purple" | "hot";

export type Section = {
  start: number;
  accent: Accent;
  kicker: string;
  prompt: string;
  tag: string;
};

export const SECTIONS: Section[] = [
  { start: 0.0, accent: "neon", kicker: "第 1 句", prompt: "来一段轻松的 lo-fi 鼓点", tag: "我就随手打了一句中文 ↑" },
  { start: 10.11, accent: "purple", kicker: "第 2 句", prompt: "加一条慵懒的贝斯线", tag: "它真听懂了，还会一层层叠 🎹" },
  { start: 22.06, accent: "hot", kicker: "第 3 句", prompt: "再加点温暖的电钢琴和弦", tag: "一句一句加，越来越好听" },
  { start: 34.04, accent: "neon", kicker: "第 4 句", prompt: "整体更梦幻一点，加点混响", tag: "氛围感直接拉满 ✨" },
  { start: 44.74, accent: "purple", kicker: "彩蛋", prompt: "你甚至能自己改代码——是真的 Strudel", tag: "周末在浏览器里就能玩 🎧" },
];

export const ACCENT_HEX: Record<Accent, string> = {
  neon: COLORS.neon,
  purple: COLORS.purple,
  hot: COLORS.hot,
};

export const STRINGS = {
  header: "🎧 打字就能做音乐的宝藏网站",
  nowPlaying: "正在播放 · 浏览器实时生成",
  ctaNote: "免费 · 链接见评论区 👇",
  footer: "中文一句话 · MiniMax 写代码 · 浏览器出声",
};

export function sectionAt(frame: number): number {
  const t = frame / FPS;
  let idx = 0;
  for (let i = 0; i < SECTIONS.length; i++) if (t >= SECTIONS[i].start) idx = i;
  return idx;
}
