// Viral cut config — one continuous take of REAL captured Strudel audio
// (video/public/viral-demo.mp4 + viral-audio.wav, trimmed to the first beat so
// music hits at frame 0). Section boundaries are the real pattern-change times
// in the trimmed clip (measured via silencedetect + the recorder timeline).

export const FPS = 30;
// WAV is 51.573s; clip 51.633s — use the shorter so audio never runs out.
export const DURATION_FRAMES = Math.floor(51.57 * FPS); // 1547

export const VIDEO_SRC = "viral-demo.mp4";
export const AUDIO_SRC = "viral-audio.wav";

export const COLORS = {
  bg: "#07070d",
  neon: "#7af0c0",
  purple: "#b07aff",
  hot: "#ff5d9e",
  ink: "#f4f2fb",
  dim: "#a7a3c4",
};

export const MONO =
  '"SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';
export const DISPLAY =
  '"SF Pro Display", "Helvetica Neue", Inter, system-ui, sans-serif';

export type Accent = "neon" | "purple" | "hot";

export type Section = {
  // start time in the trimmed clip, in seconds
  start: number;
  accent: Accent;
  kicker: string;
  prompt: string; // the (absurd) thing that was typed
  tag: string; // small voiceover-style line
};

// pattern-change times in the trimmed clip (orig play time − 31.316s)
export const SECTIONS: Section[] = [
  {
    start: 0.0,
    accent: "purple",
    kicker: "PROMPT 01",
    prompt: "808 thunderstorm + a robot choir chanting in binary",
    tag: "I typed this. it's playing right now. ↑",
  },
  {
    start: 10.31,
    accent: "hot",
    kicker: "PROMPT 02",
    prompt: "cyberpunk taiko vs a glitchy acid bass @ 160bpm",
    tag: "no edits. straight from the prompt.",
  },
  {
    start: 19.73,
    accent: "neon",
    kicker: "PROMPT 03",
    prompt: "lofi rain where every drop is a tiny dubstep wobble",
    tag: "it just... gets the vibe.",
  },
  {
    start: 30.01,
    accent: "purple",
    kicker: "PROMPT 04",
    prompt: "a disco ball shattering into free jazz",
    tag: "4 dumb sentences → 4 real tracks.",
  },
  {
    start: 40.56,
    accent: "neon",
    kicker: "YOUR TURN",
    prompt: "then I edited the code myself — it's real Strudel.",
    tag: "free, in your browser, no install.",
  },
];

export const ACCENT_HEX: Record<Accent, string> = {
  neon: COLORS.neon,
  purple: COLORS.purple,
  hot: COLORS.hot,
};

// active section index for a given frame
export function sectionAt(frame: number): number {
  const t = frame / FPS;
  let idx = 0;
  for (let i = 0; i < SECTIONS.length; i++) {
    if (t >= SECTIONS[i].start) idx = i;
  }
  return idx;
}
