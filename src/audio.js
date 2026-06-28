let ctx = null;

function getCtx() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    ctx = C ? new C() : null;
  }
  return ctx;
}

export function resumeAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume();
}

function envelope(gain, t0, a, d, s, r, peak) {
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + a);
  gain.gain.linearRampToValueAtTime(s, t0 + a + d);
  gain.gain.linearRampToValueAtTime(0, t0 + a + d + r);
}

function tone({ freq, type = 'sine', start = 0, attack = 0.005, decay = 0.04, sustain = 0.05, release = 0.08, peak = 0.25, slideTo, slideEnd, slideExp = false }) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo != null) {
    const tEnd = t + (slideEnd ?? (attack + decay + sustain + release));
    if (slideExp) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), tEnd);
    else          o.frequency.linearRampToValueAtTime(slideTo, tEnd);
  }
  envelope(g, t, attack, decay, sustain, release, peak);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + attack + decay + sustain + release + 0.05);
}

function noise({ start = 0, duration = 0.1, peak = 0.18, filterFreq = 1000, filterQ = 1 }) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + start;
  const len = (c.sampleRate * duration) | 0;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  f.Q.value = filterQ;
  const g = c.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.linearRampToValueAtTime(0, t + duration);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(t);
}

export function playClick() {
  tone({ freq: 700, type: 'square', attack: 0.002, decay: 0.02, sustain: 0.0, release: 0.04, peak: 0.12, slideTo: 300, slideExp: true });
}

export function playUnscrew() {
  // metallic squeak
  tone({ freq: 180, type: 'sawtooth', attack: 0.01, decay: 0.04, sustain: 0.06, release: 0.1, peak: 0.10, slideTo: 360, slideEnd: 0.22 });
  tone({ freq: 360, type: 'sawtooth', start: 0.02, attack: 0.01, decay: 0.04, sustain: 0.06, release: 0.1, peak: 0.06, slideTo: 600, slideEnd: 0.22 });
  noise({ duration: 0.18, peak: 0.06, filterFreq: 1800, filterQ: 4 });
}

export function playSlot() {
  tone({ freq: 520, type: 'triangle', attack: 0.003, decay: 0.03, sustain: 0.02, release: 0.06, peak: 0.22 });
  noise({ duration: 0.06, peak: 0.05, filterFreq: 3000, filterQ: 2 });
}

export function playMatch() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
  notes.forEach((f, i) => {
    tone({ freq: f, type: 'triangle', start: i * 0.06, attack: 0.005, decay: 0.04, sustain: 0.08, release: 0.18, peak: 0.22 });
  });
  noise({ start: 0, duration: 0.25, peak: 0.04, filterFreq: 5000, filterQ: 1 });
}

export function playWin() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => {
    tone({ freq: f, type: 'sine', start: i * 0.11, attack: 0.02, decay: 0.06, sustain: 0.15, release: 0.3, peak: 0.28 });
    tone({ freq: f * 2, type: 'triangle', start: i * 0.11, attack: 0.02, decay: 0.06, sustain: 0.1, release: 0.25, peak: 0.10 });
  });
}

export function playLose() {
  const notes = [392, 311, 233, 174];
  notes.forEach((f, i) => {
    tone({ freq: f, type: 'sawtooth', start: i * 0.18, attack: 0.02, decay: 0.08, sustain: 0.1, release: 0.35, peak: 0.18 });
  });
}

export function playThud() {
  tone({ freq: 140, type: 'sine', attack: 0.005, decay: 0.05, sustain: 0.0, release: 0.18, peak: 0.4, slideTo: 50, slideEnd: 0.22, slideExp: true });
  noise({ duration: 0.18, peak: 0.15, filterFreq: 200, filterQ: 1 });
}

export function playBlocked() {
  tone({ freq: 180, type: 'square', attack: 0.005, decay: 0.04, sustain: 0.0, release: 0.06, peak: 0.10 });
  tone({ freq: 140, type: 'square', start: 0.05, attack: 0.005, decay: 0.04, sustain: 0.0, release: 0.06, peak: 0.10 });
}

export function playHeartParty() {
  resumeAudio();
  noise({ duration: 0.32, peak: 0.12, filterFreq: 4200, filterQ: 0.7 });
  const chords = [
    [523.25, 659.25, 783.99],
    [587.33, 739.99, 880.00],
    [659.25, 830.61, 987.77],
    [783.99, 987.77, 1174.66],
  ];
  chords.forEach((chord, wave) => {
    chord.forEach((freq, note) => {
      tone({
        freq,
        type: note === 0 ? 'sine' : 'triangle',
        start: wave * 0.15 + note * 0.018,
        attack: 0.012,
        decay: 0.05,
        sustain: 0.13,
        release: 0.34,
        peak: note === 0 ? 0.19 : 0.11,
        slideTo: freq * 1.08,
        slideEnd: 0.35,
      });
    });
  });
  tone({ freq: 1046.5, type: 'sine', start: 0.66, attack: 0.02, decay: 0.08, sustain: 0.25, release: 0.65, peak: 0.24 });
}
