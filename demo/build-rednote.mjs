// Build the RedNote (小红书) Remotion inputs from a fresh CN recording.
// Reads demo/out/{vibe-demo-cn.mp4,timeline-cn.json}, finds the first audible
// beat (silencedetect), trims BOTH video+audio identically into video/public/
// {viral-cn.mp4,viral-cn-audio.wav}, derives the 5 caption section start-times
// from the real per-prompt "play" beats, and rewrites video/src/viral/config-cn.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MP4 = join(__dirname, 'out', 'vibe-demo-cn.mp4');
const TL = JSON.parse(readFileSync(join(__dirname, 'out', 'timeline-cn.json'), 'utf8'));
const PUBLIC = join(ROOT, 'video', 'public');
const CONFIG = join(ROOT, 'video', 'src', 'viral', 'config-cn.ts');
const FPS = 30;

const ff = (args) => spawnSync('ffmpeg', args, { encoding: 'utf8' });
const probe = (a) => spawnSync('ffprobe', a, { encoding: 'utf8' }).stdout.trim();

// 1) trim point = end of the leading silence (music hits ~frame 0)
const sd = ff(['-i', MP4, '-af', 'silencedetect=noise=-45dB:d=0.4', '-f', 'null', '-']).stderr || '';
const m = sd.match(/silence_end:\s*([\d.]+)/);
const playBeats = TL.beats.filter((b) => b.kind === 'play').map((b) => b.at / 1000);
const finale = (TL.beats.find((b) => b.kind === 'finale') || {}).at / 1000;
const end = (TL.beats.find((b) => b.kind === 'end') || {}).at / 1000;
const trim = m ? parseFloat(m[1]) : (playBeats[0] || 0);
const dur = parseFloat(probe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MP4]));
const clipLen = +(Math.min(dur, end + 1.0) - trim - 0.2).toFixed(2);

// 2) section starts (relative to trim, clamped >=0): 4 prompts + finale easter egg
const starts = [...playBeats.slice(0, 4), finale].map((t) => Math.max(0, +(t - trim).toFixed(2)));
console.log('trim =', trim, 'clipLen =', clipLen, 'sections =', starts);

// 3) trim video (muted) + audio wav, identical -ss (after -i = frame-accurate)
let r = ff(['-y', '-loglevel', 'error', '-i', MP4, '-ss', String(trim), '-an',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium',
  join(PUBLIC, 'viral-cn.mp4')]);
if (r.status !== 0) { console.error('video trim failed', r.stderr); process.exit(2); }
r = ff(['-y', '-loglevel', 'error', '-i', MP4, '-ss', String(trim), '-vn',
  '-c:a', 'pcm_s16le', '-ar', '48000', join(PUBLIC, 'viral-cn-audio.wav')]);
if (r.status !== 0) { console.error('audio trim failed', r.stderr); process.exit(3); }

// cap duration to the captured audio (it can be a touch shorter than the video)
// so the cut never ends on a silent black tail
const wavDur = parseFloat(probe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
  join(PUBLIC, 'viral-cn-audio.wav')]));
const finalLen = +Math.min(clipLen, wavDur - 0.1).toFixed(2);

// 4) rewrite config-cn.ts: DURATION_FRAMES + SECTIONS[].start
let cfg = readFileSync(CONFIG, 'utf8');
cfg = cfg.replace(/export const DURATION_FRAMES = [^\n]+/,
  `export const DURATION_FRAMES = ${Math.floor(finalLen * FPS)}; // ${finalLen}s @ ${FPS}fps (auto)`);
let i = 0;
cfg = cfg.replace(/start:\s*[\d.]+/g, () => `start: ${starts[i++] ?? 0}`);
writeFileSync(CONFIG, cfg);
console.log('updated', CONFIG);
console.log('wrote', join(PUBLIC, 'viral-cn.mp4'), '+', join(PUBLIC, 'viral-cn-audio.wav'));
