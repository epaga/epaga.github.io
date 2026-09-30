// Tiny WebAudio instrument: a soft bell per object. Each movement plays its own
// pentatonic phrase, so walking or retelling Genesis in order plays a little melody.
let ctx = null, master = null, verb = null;
let muted = false;
const KEY = '66rooms:muted';
try { muted = localStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }

const SCALES = [
  [261.63, 293.66, 329.63, 392.0, 440.0],   // I   Beginnings — C major pentatonic
  [349.23, 392.0, 440.0, 523.25, 587.33],   // II  Promise — F
  [440.0, 523.25, 587.33, 659.25, 783.99],  // III Struggle — A minor
  [523.25, 587.33, 659.25, 783.99, 1046.5], // IV  Providence — home to C
];

export function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  const len = Math.floor(ctx.sampleRate * 2.6);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  verb = ctx.createGain();
  verb.gain.value = 0.35;
  verb.connect(conv);
  conv.connect(master);
}

function voice(freq, type, gain, decay, when) {
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g);
  g.connect(master);
  g.connect(verb);
  o.start(t);
  o.stop(t + decay + 0.05);
}

export function note(i, { vol = 0.14, when = 0 } = {}) {
  if (!ctx || muted) return;
  const f = SCALES[Math.floor(i / 5)][i % 5];
  voice(f, 'sine', vol, 1.9, when);
  voice(f * 2.005, 'sine', vol * 0.28, 1.1, when);
  voice(f * 3.01, 'triangle', vol * 0.05, 0.5, when);
}

export function wrong() {
  if (!ctx || muted) return;
  voice(155.56, 'sine', 0.12, 0.45, 0);
  voice(146.83, 'sine', 0.1, 0.5, 0.02);
}

export function whoosh() {
  if (!ctx || muted) return;
  const len = Math.floor(ctx.sampleRate * 1.4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.8;
  const t = ctx.currentTime;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(1800, t + 0.9);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
  src.connect(f); f.connect(g); g.connect(master); g.connect(verb);
  src.start(t);
}

export function isMuted() { return muted; }

export function setMuted(m) {
  muted = m;
  try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* ignore */ }
  if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.05);
}
