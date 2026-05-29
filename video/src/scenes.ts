// Scene config for the vibe-music demo film.
// Durations come from the ffmpeg cuts in public/clips/manifest.json.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const INTRO_FRAMES = 95;
export const OUTRO_FRAMES = 130;

export type Scene = {
  clip: string; // file under public/clips (no extension)
  seconds: number; // clip duration
  kicker: string;
  title: string;
  sub: string;
  accent?: "neon" | "purple" | "hot";
};

export const SCENES: Scene[] = [
  {
    clip: "s1a",
    seconds: 5.4,
    kicker: "PROMPT 01",
    title: "“a thunderstorm of 808 drums + a robot choir chanting in binary”",
    sub: "we type pure nonsense into the box …",
    accent: "purple",
  },
  {
    clip: "s1b",
    seconds: 4.5,
    kicker: "⚡ MINIMAX → STRUDEL",
    title: "… and it writes live code that actually slaps.",
    sub: "natural language → Strudel → sound, in your browser",
    accent: "neon",
  },
  {
    clip: "s2",
    seconds: 7.0,
    kicker: "PROMPT 02",
    title: "“cyberpunk taiko vs a glitchy acid bassline @ 160bpm”",
    sub: "no cold start this time — instant banger",
    accent: "hot",
  },
  {
    clip: "s3",
    seconds: 7.0,
    kicker: "PROMPT 03",
    title: "“lofi rain where every drop is a tiny dubstep wobble”",
    sub: "it just… gets the vibe",
    accent: "neon",
  },
  {
    clip: "s4",
    seconds: 7.2,
    kicker: "PROMPT 04",
    title: "“a disco ball shattering into free jazz, then techno”",
    sub: "four impossible ideas → four real tracks",
    accent: "purple",
  },
  {
    clip: "s5",
    seconds: 3.6,
    kicker: "ONE-TAP PRESETS",
    title: "too lazy to type? tap a chip.",
    sub: "drum & bass beat — one click",
    accent: "hot",
  },
  {
    clip: "s6",
    seconds: 7.7,
    kicker: "YOU'RE THE PRODUCER",
    title: "it's real Strudel — edit the code, hit apply.",
    sub: "hand-built a banger, live",
    accent: "neon",
  },
];

export const SCENE_FRAMES = SCENES.map((s) => Math.round(s.seconds * FPS));
export const MAIN_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
export const TOTAL_FRAMES = INTRO_FRAMES + MAIN_FRAMES + OUTRO_FRAMES;

// absolute start frame of each scene (after intro)
export const SCENE_STARTS = SCENE_FRAMES.reduce<number[]>((acc, f, i) => {
  acc.push(i === 0 ? INTRO_FRAMES : acc[i - 1] + SCENE_FRAMES[i - 1]);
  return acc;
}, []);

export const ACCENTS = {
  neon: "#7af0c0",
  purple: "#b07aff",
  hot: "#ff5d9e",
} as const;
