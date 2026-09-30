/* Grandad's Cold Snap: shared helpers, sound, settings, rules and board geometry. */
window.GCS = window.GCS || {};
(function (G) {
  'use strict';

  // ---------- Helpers ----------
  G.$ = (id) => document.getElementById(id);
  G.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  G.rnd = (n) => Math.floor(Math.random() * n);
  G.rand = (a, b) => a + Math.random() * (b - a);
  G.pick = (a) => a[G.rnd(a.length)];
  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.ease = {
    linear: (t) => t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  G.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  G.mixHex = (a, b, t) => {
    const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
    const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  G.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Device ----------
  // Touch mode for phones and tablets (including iPads, which report themselves as Macs).
  const ua = navigator.userAgent || '';
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  G.isTouch = mobileUA || window.matchMedia('(pointer: coarse)').matches;
  G.isPhone = G.isTouch && Math.min(screen.width, screen.height) < 600;
  document.documentElement.classList.toggle('touch', G.isTouch);
  document.documentElement.classList.toggle('phone', G.isPhone);
  G.isPortrait = () => window.innerHeight > window.innerWidth;
  // triangle wave 0..1..0 with the given period (seconds)
  G.tri = (t, period) => { const p = ((t / period) % 1 + 1) % 1; return p < 0.5 ? p * 2 : 2 - p * 2; };

  // ---------- Sound (all synthesised) ----------
  const Sound = {
    ctx: null, out: null, musicOut: null, muted: false,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.55;
        this.out.connect(this.ctx.destination);
        this.musicOut = this.ctx.createGain();
        this.musicOut.gain.value = 0.32;
        this.musicOut.connect(this.out);
      } catch (e) { this.ctx = null; }
    },
    tone(f, d, o = {}) {
      if (!this.ctx || this.muted) return;
      const { type = 'sine', vol = 0.2, at = 0, to = null, attack = 0.01, dest = this.out } = o;
      const t = this.ctx.currentTime + at;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + d + 0.05);
    },
    noise(d, o = {}) {
      if (!this.ctx || this.muted) return;
      const { vol = 0.2, at = 0, freq = 1000, to = null, q = 1, type = 'bandpass', swell = false } = o;
      const t = this.ctx.currentTime + at;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * d));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, t);
      if (to) f.frequency.exponentialRampToValueAtTime(to, t + d);
      f.Q.value = q;
      const g = this.ctx.createGain();
      if (swell) {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + d * 0.45);
      } else g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(f).connect(g).connect(this.out);
      src.start(t);
      src.stop(t + d);
    },
    play(name) {
      if (!this.ctx || this.muted) return;
      const r = G.rnd;
      switch (name) {
        case 'step': this.tone(480 + r(120), 0.06, { type: 'triangle', vol: 0.07 }); break;
        case 'dice': for (let k = 0; k < 7; k++) this.noise(0.035, { vol: 0.35, at: k * 0.09 + Math.random() * 0.03, freq: 2200 + r(1800), q: 5 }); break;
        case 'pickup': [660, 880, 1320].forEach((f, k) => this.tone(f, 0.2, { type: 'triangle', vol: 0.14, at: k * 0.07 })); break;
        case 'deliver': [392, 494, 587, 784].forEach((f, k) => this.tone(f, 0.7, { vol: 0.1, at: k * 0.06 })); break;
        case 'thwack': this.noise(0.2, { vol: 0.7, freq: 1100, type: 'lowpass' }); this.tone(170, 0.22, { vol: 0.45, to: 45 }); break;
        case 'whoosh': this.noise(0.45, { vol: 0.35, freq: 350, to: 3200, q: 2, swell: true }); break;
        case 'windup': this.tone(200, 0.9, { type: 'triangle', vol: 0.05, to: 420, attack: 0.3 }); break;
        case 'draught': this.noise(1.3, { vol: 0.2, freq: 500, to: 1400, q: 3, swell: true }); break;
        case 'grumble': this.tone(118, 0.32, { type: 'sawtooth', vol: 0.06, to: 92 }); this.tone(100, 0.34, { type: 'sawtooth', vol: 0.05, at: 0.3, to: 78 }); break;
        case 'boiler': this.tone(90, 0.8, { type: 'sawtooth', vol: 0.05, to: 140, attack: 0.2 }); this.noise(0.8, { vol: 0.12, freq: 300, type: 'lowpass', swell: true }); break;
        case 'clank': this.tone(190, 0.16, { type: 'square', vol: 0.07 }); this.noise(0.12, { vol: 0.25, freq: 3200, q: 9 }); this.tone(150, 0.16, { type: 'square', vol: 0.05, at: 0.18 }); break;
        case 'meow': this.tone(620, 0.3, { vol: 0.12, to: 980 }); this.tone(900, 0.35, { vol: 0.1, at: 0.28, to: 560 }); break;
        case 'munch': for (let k = 0; k < 3; k++) this.noise(0.07, { vol: 0.3, at: k * 0.13, freq: 1400, q: 1.5 }); break;
        case 'warm': [523, 659].forEach((f, k) => this.tone(f, 0.4, { vol: 0.09, at: k * 0.08 })); break;
        case 'stairlift': this.tone(220, 0.9, { type: 'square', vol: 0.03, to: 180 }); break;
        case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, k) => this.tone(f, k === 5 ? 0.8 : 0.18, { type: 'triangle', vol: 0.14, at: k * 0.14 })); break;
        case 'lose': [392, 370, 349].forEach((f, k) => this.tone(f, 0.38, { type: 'sawtooth', vol: 0.06, at: k * 0.42 })); this.tone(330, 1.2, { type: 'sawtooth', vol: 0.06, at: 1.26, to: 290 }); break;
        case 'turn': this.tone(880, 0.1, { type: 'triangle', vol: 0.06 }); break;
        // fairground
        case 'splash': this.noise(0.35, { vol: 0.35, freq: 900, type: 'lowpass' }); this.tone(300, 0.2, { vol: 0.08, to: 120 }); break;
        case 'hook': this.tone(900, 0.12, { type: 'triangle', vol: 0.12, to: 1500 }); break;
        case 'ding': this.tone(1568, 1.6, { vol: 0.2 }); this.tone(2093, 1.3, { vol: 0.12 }); this.tone(3136, 0.8, { vol: 0.05 }); break;
        case 'pop': this.noise(0.09, { vol: 0.6, freq: 2500, type: 'highpass' }); this.tone(900, 0.1, { vol: 0.15, to: 180 }); break;
        case 'cork': this.tone(560, 0.07, { type: 'square', vol: 0.08, to: 240 }); this.noise(0.05, { vol: 0.3, freq: 1800, q: 2 }); break;
        case 'clatter': for (let k = 0; k < 6; k++) this.noise(0.07, { vol: 0.28, at: k * 0.07 + Math.random() * 0.05, freq: 3000 + r(2500), q: 10 }); this.tone(720, 0.1, { type: 'square', vol: 0.04 }); break;
        case 'thud': this.tone(120, 0.2, { vol: 0.35, to: 55 }); this.noise(0.12, { vol: 0.2, freq: 300, type: 'lowpass' }); break;
        case 'bonk': this.tone(330, 0.12, { type: 'square', vol: 0.1, to: 170 }); this.noise(0.05, { vol: 0.25, freq: 1200, q: 2 }); break;
        case 'squirt': this.noise(0.12, { vol: 0.1, freq: 2600, q: 1.4 }); break;
        case 'throw': this.noise(0.22, { vol: 0.18, freq: 500, to: 1800, q: 1.5, swell: true }); break;
        case 'strike': this.tone(140, 0.25, { vol: 0.4, to: 60 }); this.noise(0.1, { vol: 0.4, freq: 2400, q: 3 }); break;
        case 'cheer': this.noise(1.4, { vol: 0.2, freq: 1300, q: 0.6, swell: true }); [784, 988, 1175, 1568].forEach((f, k) => this.tone(f, 0.25, { type: 'triangle', vol: 0.1, at: 0.1 + k * 0.1 })); break;
        case 'aww': this.tone(440, 0.7, { type: 'sawtooth', vol: 0.05, to: 300 }); this.tone(330, 0.7, { type: 'sawtooth', vol: 0.04, at: 0.1, to: 220 }); break;
        case 'tick': this.tone(660, 0.1, { type: 'triangle', vol: 0.12 }); break;
        case 'go': this.tone(990, 0.3, { type: 'triangle', vol: 0.14 }); break;
        case 'wobble': this.tone(260, 0.3, { type: 'triangle', vol: 0.08, to: 200 }); break;
        case 'buzz': this.tone(110, 0.4, { type: 'square', vol: 0.1 }); this.tone(117, 0.4, { type: 'sawtooth', vol: 0.07 }); break;
        case 'splat': this.noise(0.18, { vol: 0.5, freq: 700, type: 'lowpass' }); this.tone(90, 0.18, { vol: 0.3, to: 50 }); break;
        case 'squeak': this.tone(1400, 0.12, { type: 'triangle', vol: 0.08, to: 2200 }); break;
        case 'paddle': this.noise(0.12, { vol: 0.18, freq: 1200, q: 1.2 }); break;
        case 'stroke': this.noise(0.18, { vol: 0.3, freq: 800, q: 1 }); this.tone(520, 0.1, { type: 'triangle', vol: 0.06 }); break;
        case 'whirr': this.tone(180 + r(40), 0.12, { type: 'sawtooth', vol: 0.025 }); break;
        case 'star': [988, 1319, 1568].forEach((f, k) => this.tone(f, 0.16, { type: 'triangle', vol: 0.09, at: k * 0.06 })); break;
        // the delivery cutscene
        case 'rise': this.tone(330, 0.55, { type: 'triangle', vol: 0.07, to: 990, attack: 0.2 }); this.noise(0.55, { vol: 0.08, freq: 2000, to: 6000, q: 3, swell: true }); break;
        case 'sparkle': for (let k = 0; k < 6; k++) this.tone(1760 + r(1400), 0.12, { type: 'triangle', vol: 0.05, at: k * 0.05 }); break;
        case 'fanfare': {
          // a brass-band "ta-da": two pick-ups and a big held chord
          [[523, 0, 0.12], [659, 0.13, 0.12], [784, 0.26, 0.9]].forEach(([f, at, d]) => { this.tone(f, d, { type: 'sawtooth', vol: 0.07, at }); this.tone(f * 2, d, { type: 'triangle', vol: 0.06, at }); });
          [392, 523, 659, 1047].forEach((f) => this.tone(f, 1.1, { type: 'triangle', vol: 0.07, at: 0.26 }));
          this.tone(131, 1.0, { type: 'sine', vol: 0.18, at: 0.26 });
          break;
        }
        case 'ignite': this.noise(1.1, { vol: 0.4, freq: 200, to: 1600, q: 0.8, swell: true }); this.tone(70, 0.9, { vol: 0.25, to: 140 }); for (let k = 0; k < 5; k++) this.noise(0.04, { vol: 0.3, at: 0.3 + k * 0.12 + Math.random() * 0.08, freq: 3000, q: 4 }); break;
        case 'rocket': this.noise(0.7, { vol: 0.16, freq: 600, to: 4000, q: 4, swell: true }); break;
        case 'firework': this.noise(0.5, { vol: 0.5, freq: 900, type: 'lowpass' }); this.tone(70, 0.4, { vol: 0.3, to: 40 }); for (let k = 0; k < 8; k++) this.noise(0.03, { vol: 0.14, at: 0.15 + k * 0.07 + Math.random() * 0.05, freq: 5000, q: 6 }); break;
        case 'coin': [1319, 1760, 2637].forEach((f, k) => this.tone(f, k === 2 ? 0.35 : 0.1, { type: 'triangle', vol: 0.12, at: k * 0.06 })); this.noise(0.05, { vol: 0.2, freq: 5000, q: 8 }); break;
        case 'till': this.tone(2093, 0.5, { vol: 0.14 }); this.tone(2637, 0.6, { vol: 0.1, at: 0.08 }); this.noise(0.12, { vol: 0.25, freq: 3500, q: 3 }); this.tone(180, 0.12, { type: 'square', vol: 0.05, at: 0.2 }); break;
        case 'heartbeat': [0, 0.22, 0.8, 1.02].forEach((at, k) => this.tone(k % 2 ? 62 : 72, 0.16, { vol: 0.35, at, to: 40 })); break;
        // rummaging
        case 'rustle': for (let k = 0; k < 4; k++) this.noise(0.09, { vol: 0.22, at: k * 0.17 + Math.random() * 0.05, freq: 1800 + r(1500), q: 1.2 }); break;
        case 'find': [784, 988, 1175, 1568].forEach((f, k) => this.tone(f, 0.22, { type: 'triangle', vol: 0.11, at: k * 0.055 })); this.noise(0.08, { vol: 0.3, freq: 3000, type: 'highpass' }); break;
        case 'boing': this.tone(180, 0.45, { type: 'triangle', vol: 0.12, to: 520 }); this.tone(520, 0.3, { type: 'triangle', vol: 0.08, at: 0.2, to: 160 }); break;
        case 'snore': this.noise(0.9, { vol: 0.16, freq: 260, q: 2, swell: true }); this.tone(90, 0.8, { type: 'sawtooth', vol: 0.03, to: 70, attack: 0.3 }); break;
        case 'hooray': this.noise(2.4, { vol: 0.24, freq: 1100, q: 0.5, swell: true }); this.noise(2.0, { vol: 0.12, freq: 2400, q: 0.8, swell: true }); break;
      }
    },
  };
  G.Sound = Sound;

  // ---------- Fairground organ (an original little waltz) ----------
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const freq = (n) => { const m = n.match(/([A-G])(#?)(\d)/); return 440 * Math.pow(2, (NOTE[m[1]] + (m[2] ? 1 : 0) + (+m[3] + 1) * 12 - 69) / 12); };
  const TUNE = [
    ['E5', 'G5', 'C6'], ['B5', '-', 'G5'], ['F5', 'G5', 'B5'], ['A5', '-', 'G5'],
    ['F5', 'D5', 'F5'], ['G5', '-', 'F5'], ['E5', 'D5', 'E5'], ['G5', '-', '-'],
    ['E5', 'G5', 'C6'], ['E6', '-', 'D6'], ['C6', 'A5', 'F5'], ['A5', '-', 'G5'],
    ['E5', 'G5', 'E5'], ['D5', 'F5', 'B4'], ['C5', '-', '-'], ['-', 'G4', 'B4'],
  ];
  const CHORDS = ['C', 'C', 'G7', 'G7', 'G7', 'G7', 'C', 'C', 'C', 'C', 'F', 'F', 'C', 'G7', 'C', 'G7'];
  const CHORD_NOTES = { C: ['C3', 'E4', 'G4'], G7: ['G2', 'F4', 'B4'], F: ['F2', 'A4', 'C5'] };
  const Music = {
    timer: null, beat: 0, next: 0, spb: 60 / 168,
    start() {
      if (!Sound.ctx || this.timer) return;
      this.beat = 0;
      this.next = Sound.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 90);
    },
    stop() { clearInterval(this.timer); this.timer = null; },
    schedule() {
      const ctx = Sound.ctx;
      if (!ctx) return;
      while (this.next < ctx.currentTime + 0.3) {
        if (!Sound.muted) {
          const bar = Math.floor(this.beat / 3) % TUNE.length;
          const b = this.beat % 3;
          const at = this.next - ctx.currentTime;
          const ch = CHORD_NOTES[CHORDS[bar]];
          if (b === 0) Sound.tone(freq(ch[0]), this.spb * 0.9, { type: 'triangle', vol: 0.16, at, dest: Sound.musicOut });
          else { Sound.tone(freq(ch[1]), this.spb * 0.5, { type: 'square', vol: 0.025, at, dest: Sound.musicOut }); Sound.tone(freq(ch[2]), this.spb * 0.5, { type: 'square', vol: 0.025, at, dest: Sound.musicOut }); }
          const n = TUNE[bar][b];
          if (n !== '-') {
            let len = 1;
            while (b + len < 3 && TUNE[bar][b + len] === '-') len++;
            Sound.tone(freq(n), this.spb * len * 0.92, { type: 'square', vol: 0.045, at, dest: Sound.musicOut });
            Sound.tone(freq(n) * 2, this.spb * len * 0.6, { type: 'sine', vol: 0.02, at, dest: Sound.musicOut });
          }
        }
        this.next += this.spb;
        this.beat++;
      }
    },
  };
  G.Music = Music;

  // ---------- Settings ----------
  G.DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
  const SETTINGS_KEY = 'grandads-cold-snap-settings';
  G.loadSettings = () => {
    const base = { count: 1, names: G.DEFAULT_NAMES.slice(), diff: 'chilly', muted: false, shuffle: true, goal: 6, mode: 'coop', fastest: {} };
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        if ([1, 2, 3, 4].includes(saved.count)) base.count = saved.count;
        if (Array.isArray(saved.names)) saved.names.slice(0, 4).forEach((n, i) => { if (typeof n === 'string' && n.trim()) base.names[i] = n.slice(0, 18); });
        if (G.DIFFS[saved.diff]) base.diff = saved.diff;
        base.muted = !!saved.muted;
        if (typeof saved.shuffle === 'boolean') base.shuffle = saved.shuffle;
        if ([3, 6, 9, 12].includes(saved.goal)) base.goal = saved.goal;
        if (G.MODES[saved.mode]) base.mode = saved.mode;
        // the fewest goes it's taken to save Grandad, for each setting and length of game ("chilly-6")
        if (saved.fastest && typeof saved.fastest === 'object') {
          for (const [key, n] of Object.entries(saved.fastest)) if (/^(mild|chilly|freeze)-(3|6|9|12)$/.test(key) && Number.isFinite(n) && n > 0) base.fastest[key] = Math.round(n);
        }
      }
    } catch (e) { /* storage unavailable */ }
    return base;
  };
  G.saveSettings = (s) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } };

  // ---------- Rules ----------
  G.N = 32;
  G.DOORS = [4, 12, 20, 28];
  // The difficulty sets how hard the stalls are, how much the bad squares cost and how fast his paper comes.
  // start is where the thermometer begins: it falls to 35.0°C over the game's rounds.
  G.DIFFS = {
    mild:   { name: 'Mild Autumn',    start: 36.6, zone: 0.30, period: 1150, level: 0, loss: { window: 1, draught: 1, cat: 1, find: 1, paper: 1 } },
    chilly: { name: 'Chilly Winter',  start: 36.4, zone: 0.22, period: 950,  level: 1, loss: { window: 2, draught: 1, cat: 2, find: 1, paper: 1 } },
    freeze: { name: 'The Big Freeze', start: 36.2, zone: 0.16, period: 800,  level: 2, loss: { window: 3, draught: 2, cat: 2, find: 2, paper: 2 } },
  };
  // How many rounds Grandad can last before hypothermia (a round is everyone having one go).
  // Co-op: the team fills one list. Versus: everyone races to fill their own, so it takes longer.
  // Set from simulated games so a steady player gets there about 9 times in 10 on Chilly Winter.
  G.ROUNDS = {
    coop:   { 1: { 3: 15, 6: 27, 9: 37, 12: 48 }, 2: { 3: 9, 6: 14, 9: 20, 12: 25 }, 3: { 3: 6, 6: 10, 9: 14, 12: 18 }, 4: { 3: 5, 6: 8, 9: 11, 12: 14 } },
    versus: { 2: { 3: 11, 6: 22, 9: 32, 12: 42 }, 3: { 3: 10, 6: 20, 9: 30, 12: 39 }, 4: { 3: 9, 6: 19, 9: 28, 12: 38 } },
  };
  G.MODES = { coop: 'Co-op', versus: 'Versus' };
  G.modeFor = (mode, players) => (players > 1 && mode === 'versus' ? 'versus' : 'coop');
  G.roundsFor = (mode, players, goal) => G.ROUNDS[G.modeFor(mode, players)][players][goal];

  G.ITEMS = {
    slippers: { name: 'Slippers', thanks: 'About time! Me toes were going blue.' },
    tea:      { name: 'Cup of Tea', thanks: 'Ahh. Proper tea. None of your fancy stuff.' },
    blanket:  { name: 'Tartan Blanket', thanks: "That's more like it. Tuck it in, tuck it in." },
    scarf:    { name: 'Woolly Scarf', thanks: 'Your Nan knitted that, you know.' },
    hwb:      { name: 'Hot Water Bottle', thanks: "Ooh, that's lovely. Not too hot, mind." },
    cardigan: { name: 'Cardigan', thanks: 'Me good cardigan! With the patches!' },
    hat:      { name: 'Bobble Hat', thanks: "Does this bobble make me look daft? Don't answer that." },
    logs:     { name: 'Logs for the Fire', thanks: "Now we're cooking. Stand back, I'll light it." },
    mittens:  { name: 'Woolly Mittens', thanks: 'Me fingers are coming back to life!' },
    earmuffs: { name: 'Earmuffs', thanks: 'What? WHAT? Oh, these are lovely.' },
    soup:     { name: 'Bowl of Soup', thanks: "Tomato! My favourite. Mind, it's hot." },
    heater:   { name: 'Electric Heater', thanks: "Two bars! Don't tell your Nan about the electric bill." },
  };
  G.ITEM_KEYS = Object.keys(G.ITEMS);

  G.DISTRICTS = [
    { key: 'hall',    name: 'Hallway',      color: '#8c5a9e', item: 'slippers', game: 'duck',     idx: [1, 2, 3],    spaces: ['Doormat', 'Hook-a-Duck', 'Telephone Table'] },
    { key: 'kitchen', name: 'Kitchen',      color: '#e08a2e', item: 'tea',      game: 'coconut',  idx: [5, 6, 7],    spaces: ['Larder', 'Coconut Shy', 'Back Door'], darkText: true },
    { key: 'living',  name: 'Living Room',  color: '#b8412f', item: 'blanket',  game: 'cans',     idx: [9, 10, 11],  spaces: ['Sofa', 'Tin Can Alley', 'Sideboard'] },
    { key: 'conserv', name: 'Conservatory', color: '#9bb040', item: 'scarf',    game: 'mole',     idx: [13, 14, 15], spaces: ['Wicker Chair', 'Whack-a-Mole', 'Leaky Window'], darkText: true },
    { key: 'bath',    name: 'Bathroom',     color: '#3f8fa0', item: 'hwb',      game: 'water',    idx: [17, 18, 19], spaces: ['Bath Tub', 'Water Pistol Race', 'Airing Cupboard'] },
    { key: 'bed',     name: 'Bedroom',      color: '#c9648c', item: 'cardigan', game: 'hoopla',   idx: [21, 22, 23], spaces: ['Wardrobe', 'Hoopla', 'Chest of Drawers'] },
    { key: 'loft',    name: 'Loft',         color: '#8a7452', item: 'hat',      game: 'gallery',  idx: [25, 26, 27], spaces: ['Old Trunk', 'Shooting Gallery', 'Water Tank'] },
    { key: 'shed',    name: 'Garden Shed',  color: '#4a6b3a', item: 'logs',     game: 'strength', idx: [29, 30, 31], spaces: ['Log Pile', 'Test Your Strength', 'Lawnmower'] },
  ];
  G.DISTRICT_OF_ITEM = Object.fromEntries(G.DISTRICTS.map((d) => [d.item, d]));

  // Fairground stalls: the middle square of every room, plus the Larder and the Sideboard.
  G.EXTRA_STALLS = { 5: 'floss', 11: 'rat' };
  G.STALL_SQUARES = [...G.DISTRICTS.map((d) => d.idx[1]), ...Object.keys(G.EXTRA_STALLS).map(Number)].sort((a, b) => a - b);
  // Which game stands on each stall square. The classic line-up is above; a game can deal
  // them at random from the whole fair instead. Games not on the board wait in the reserve,
  // and a stall that pays out packs up and swaps with one of them.
  G.CLASSIC_STALLS = { ...Object.fromEntries(G.DISTRICTS.map((d) => [d.idx[1], d.game])), ...G.EXTRA_STALLS };
  G.dealt = { ...G.CLASSIC_STALLS };
  G.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = G.rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  G.dealStalls = (shuffle) => {
    if (!shuffle) return { ...G.CLASSIC_STALLS };
    const keys = G.shuffle(Object.keys(G.Mini.GAMES));
    return Object.fromEntries(G.STALL_SQUARES.map((i, k) => [i, keys[k]]));
  };
  G.reserve = () => Object.keys(G.Mini.GAMES).filter((key) => !Object.values(G.dealt).includes(key));
  // the name printed on a square (stall squares show whichever stall is there now)
  G.spaceName = (i) => {
    const sp = G.SPACES[i];
    if (sp.type === 'room' && sp.stall && G.Mini) return G.Mini.GAMES[G.dealt[i]].title;
    return sp.name;
  };

  G.CORNERS = {
    0:  { key: 'boiler',    name: 'Boiler Cupboard', rule: 'Pass or thump it: +1 token',  short: '+1 token' },
    8:  { key: 'window',    name: 'Open Window',     rule: 'Brrr! Tokens blow away',      short: 'lose tokens' },
    16: { key: 'stairlift', name: 'Stairlift',       rule: 'Ride down to the boiler',     short: 'ride to the boiler' },
    24: { key: 'cat',       name: "Tiddles' Basket", rule: 'Tiddles pinches tokens!',     short: 'lose tokens' },
  };

  G.SPACE_FX = {
    7:  { kind: 'draught', mark: 'draught', short: 'lose tokens', card: "The back door's wide open, and the draught whips tokens out of your hand.", text: "The back door's wide open. A draught blows tokens away.", line: 'Were you born in a barn? Shut that door!' },
    15: { kind: 'draught', mark: 'draught', short: 'lose tokens', card: 'The conservatory window leaks like a sieve, and the draught whips tokens out of your hand.', text: 'The leaky conservatory window blows tokens away.', line: 'I can feel that draught from here!' },
    19: { kind: 'warm', mark: 'warm', short: '+1 token', card: 'You fold the warm towels in the airing cupboard, and Grandad gives you a token for your trouble.', text: 'Folding the towels in the airing cupboard earns a token from Grandad.', line: "Ooh, that's warm." },
  };

  // ---------- Tokens ----------
  // Stalls pay out fairground tokens, and everything at the Fair Shop costs three of them.
  G.ITEM_COST = 3;
  // how many things Grandad needs before he's saved: chosen on the start screen
  G.GOALS = [3, 6, 9, 12];
  G.MAX_TOKENS = 3;
  G.DOOR_TOKENS = 1; // popping in to Grandad: he slips you a token from his cardigan pocket
  G.LAP_TOKENS = 1; // walking past the boiler (START) on the way round the house
  G.TOKEN_SVG = '<svg class="token" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="#e0a526" stroke="#2b1a10" stroke-width="1.6"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="#9a6a14" stroke-width="1.1"/><path d="M12 6.9l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#fff3c4" stroke="#8a5a12" stroke-width=".6" stroke-linejoin="round"/></svg>';
  G.tokenWord = (n) => `${n} token${n === 1 ? '' : 's'}`;

  // ---------- Rummage ----------
  // Every plain square in a room has something to find. Each find is [effect, text, tokens]:
  // token (tokens, usually 1), lose (tokens, more on harder settings), charm (stops the next newspaper),
  // nap (Grandad nods off: no newspaper this go), hop (two more squares on), dud (nothing, but a laugh).
  G.RUMMAGE = {
    1: { where: 'You lift the doormat...', finds: [
      ['token', "The spare key! Grandad's been looking for that since 1987. He gives you a token for finding it."],
      ['dud', 'Three catalogues and a leaflet about double glazing.'],
      ['charm', 'A lucky horseshoe that fell off the front door.'],
      ['hop', 'The postman barges in and sweeps you two squares along.'],
      ['dud', 'You shake it out of the front door. Brrr! Just dust.'],
      ['token', 'A token someone dropped on their way in!'],
      ['lose', 'A hole in your pocket. A token rolls out under the door.'],
    ] },
    3: { where: 'You check the telephone table...', finds: [
      ['token', "The phone rings. It's Nan! She says there's a token for you under the phone."],
      ['token', "Grandad's little address book. He's so chuffed you found it, he gives you a token."],
      ['nap', 'You ring the talking clock for him. Grandad nods off listening.'],
      ['dud', 'A pencil with no lead and a phone book from 1974.'],
      ['charm', 'A lucky four-leaf clover, pressed in the phone book.'],
      ['token', 'A token tucked in the address book, for emergencies.'],
    ] },
    9: { where: 'Down the back of the sofa...', finds: [
      ['token', "The TV remote! He's been lost without it, so he gives you a token."],
      ['charm', 'A lucky penny. Heads up, too.'],
      ['dud', 'Fluff. So much fluff.'],
      ['nap', 'You plump the cushions and Grandad dozes off at the very thought.'],
      ['token', "Tiddles' heated cushion. You tuck it behind Grandad, and he's so grateful he gives you a token."],
      ['token', 'A fairground token down the back of the sofa!'],
      ['lose', "You lose a token down the back of the sofa. It's gone for ever."],
    ] },
    13: { where: 'You poke about in the wicker chair...', finds: [
      ['token', "Grandad's reading glasses! Now he can do the crossword, and he gives you a token."],
      ['dud', 'A wicker splinter. Ow.'],
      ['hop', 'It creaks, collapses and bounces you two squares along.'],
      ['lose', 'You fiddle with the blinds and a token slips down behind the radiator.'],
      ['charm', 'A lucky pebble from Skegness.'],
      ['token', 'A token stuck in the wicker.'],
    ] },
    17: { where: 'You look in the bath...', finds: [
      ['charm', 'A lucky rubber duck. Squeak!'],
      ['dud', "A bar of soap. That's it. Just soap."],
      ['hop', 'You slip on the soap and skid two squares along.'],
      ['token', "The hot tap works! A hot flannel for Grandad's forehead, and he's so grateful he gives you a token."],
      ['token', "Grandad's false teeth, in a glass! He's so delighted to have them back, he gives you two tokens.", 2],
      ['lose', 'A token rolls straight down the plughole. Glug.'],
      ['token', 'A token in the soap dish. A bit soapy, still spends.'],
    ] },
    21: { where: 'You open the wardrobe...', finds: [
      ['nap', 'Moth balls! The pong sends Grandad off for a snooze.'],
      ['token', "Grandad's wedding suit. He goes all misty-eyed and presses two tokens into your hand.", 2],
      ['dud', 'A coat hanger falls on your head. Nothing else.'],
      ['hop', 'You get lost among the coats and come out two squares along.'],
      ['charm', 'A lucky flat cap.'],
      ['token', 'A token in the pocket of his best coat!'],
    ] },
    23: { where: 'You rifle through the chest of drawers...', finds: [
      ['token', "His old bowls trophy! He puffs up with pride and gives you two tokens.", 2],
      ['dud', 'A sock. Just the one.'],
      ['token', "Thermal long johns. You don't ask. He's so delighted he gives you a token."],
      ['charm', 'A lucky threepenny bit.'],
      ['nap', 'His old pyjamas. He yawns just looking at them.'],
      ['token', 'A token in the sock drawer. With the socks.'],
    ] },
    25: { where: 'You creak open the old trunk...', finds: [
      ['token', "Grandad's school photo. Look at his hair! He laughs so much he gives you a token."],
      ['dud', 'A Christmas bauble shaped like a sad walrus.'],
      ['charm', "A lucky rabbit's foot. Plastic, probably."],
      ['hop', 'A jack-in-the-box springs out and you jump two squares.'],
      ['token', "A moth-eaten jumper for Grandad's knees. He's so chuffed he gives you a token."],
      ['token', 'An old token from the fair of 1963!'],
      ['lose', 'A moth flies out and makes off with one of your tokens.'],
    ] },
    27: { where: 'You lift the lid of the water tank...', finds: [
      ['lose', 'A token slips out of your hand and plops into the tank.'],
      ['dud', 'A very old tennis ball, bobbing about.'],
      ['token', 'You lag the pipes, and Grandad pays you a token for the job.'],
      ['hop', 'The pipes clank so loudly you jump two squares.'],
      ['nap', 'The gurgling sounds like the seaside. Grandad drifts off.'],
      ['token', "You fix the ballcock. Grandad says you're a proper plumber and pays you a token."],
      ['token', 'A token floating on the top. Lucky!'],
    ] },
    29: { where: 'You dig through the log pile...', finds: [
      ['hop', 'The pile rolls and carries you two squares along.'],
      ['charm', 'A lucky conker. A proper tough one.'],
      ['dud', 'A woodlouse. It waves.'],
      ['token', "An old hand-warmer, still working. Straight into Grandad's pocket, and he's so thrilled he gives you a token."],
      ['token', "Grandad's lost pipe. He won't light it, he just likes holding it. He gives you a token for finding it."],
      ['token', 'A token wedged between two logs.'],
    ] },
    31: { where: 'You tinker with the lawnmower...', finds: [
      ['hop', 'It roars into life and chases you two squares on!'],
      ['dud', 'Grass cuttings. In your hair.'],
      ['token', "You oil the blades. Grandad says you're a proper handyman and pays you a token."],
      ['dud', 'You leave the shed door open. Brrr! Nothing else happens.'],
      ['charm', 'A lucky garden gnome was hiding behind it.'],
      ['token', 'A token in the grass box!'],
      ['lose', 'The mower chews up one of your tokens.'],
    ] },
  };
  // how likely each kind of find is: mostly good, a few duds, the odd chilly one
  G.FIND_WEIGHT = { token: 20, charm: 9, nap: 8, hop: 8, dud: 9, lose: 7 };

  G.SPACES = [];
  for (const [i, c] of Object.entries(G.CORNERS)) G.SPACES[+i] = { type: 'corner', ...c };
  for (const i of G.DOORS) G.SPACES[i] = { type: 'door', name: 'Pop in to Grandad' };
  G.DISTRICTS.forEach((d, di) => d.idx.forEach((i, k) => { G.SPACES[i] = { type: 'room', district: di, name: d.spaces[k], stall: G.STALL_SQUARES.includes(i) }; }));

  G.GRUMBLES = [
    "It's brass monkeys in here.",
    'In my day we just put another jumper on.',
    "Don't you touch that thermostat!",
    "Coldest night since '63, it says here.",
    "A funfair? In my house? Whatever next.",
    "I can't feel me knees.",
    'Is it me, or is it parky in here?',
    'Who keeps leaving doors open?',
    'Turn that organ music down!',
  ];
  G.SWAT_LINES = ['Oi! Stop dawdling!', 'Out of me light!', 'Take that, whippersnapper!', "That's for the draught!", 'Stop your fidgeting!'];
  G.DUCK_LINES = ['Blast. Missed.', 'Hmph. Quick little so-and-so.', "I'll get you next time."];
  G.COLD_WARNINGS = [
    { at: 36.0, line: 'Me teeth are starting to chatter...' },
    { at: 35.6, line: "I c-can't feel me n-nose..." },
    { at: 35.3, line: 'Is that... an icicle on me nose?' },
  ];

  // ---------- Board geometry (world units; board is 20 x 20, south edge nearest the camera) ----------
  G.BOARD = 20;
  const TRACKS = [1.35, 1, 1, 1, 1, 1, 1, 1, 1.35];
  const TOTAL = TRACKS.reduce((a, b) => a + b, 0);
  const starts = [];
  TRACKS.reduce((s, w, k) => { starts[k] = s; return s + w; }, 0);
  G.TRACKS = TRACKS;
  G.trackStart = (k) => starts[k] / TOTAL;           // 0..1
  G.trackSize = (k) => TRACKS[k] / TOTAL;            // 0..1
  G.trackMid = (k) => (starts[k] + TRACKS[k] / 2) / TOTAL;
  G.rc = (i) => {
    if (i === 0) return [8, 8];
    if (i < 8) return [8, 8 - i];
    if (i === 8) return [8, 0];
    if (i < 16) return [16 - i, 0];
    if (i === 16) return [0, 0];
    if (i < 24) return [0, i - 16];
    if (i === 24) return [0, 8];
    return [i - 24, 8];
  };
  G.sideOf = (i) => (i % 8 === 0 ? 'corner' : i < 8 ? 'bottom' : i < 16 ? 'left' : i < 24 ? 'top' : 'right');
  const W = G.BOARD;
  G.tileCentre = (i) => { const [r, c] = G.rc(i); return { x: (G.trackMid(c) - 0.5) * W, z: (G.trackMid(r) - 0.5) * W }; };
  // direction pointing from a tile towards the middle of the board (unit, axis-aligned)
  G.inward = (i) => {
    const s = G.sideOf(i);
    if (s === 'bottom') return { x: 0, z: -1 };
    if (s === 'top') return { x: 0, z: 1 };
    if (s === 'left') return { x: 1, z: 0 };
    if (s === 'right') return { x: -1, z: 0 };
    const c = G.tileCentre(i);
    return { x: -Math.sign(c.x) * 0.7071, z: -Math.sign(c.z) * 0.7071 };
  };
  const GRID = {};
  for (let i = 0; i < G.N; i++) GRID[G.rc(i).join(',')] = i;
  G.tileAtXZ = (x, z) => {
    const u = x / W + 0.5;
    const v = z / W + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    const find = (f) => { for (let k = 0; k < 9; k++) if (f < G.trackStart(k) + G.trackSize(k)) return k; return 8; };
    const key = `${find(v)},${find(u)}`;
    return key in GRID ? GRID[key] : null;
  };
  G.wrap = (i) => ((i % G.N) + G.N) % G.N;
})(window.GCS);
