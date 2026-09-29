/* Grandad's Cold Snap: procedural textures and 3D models (all built from primitives, no asset files). */
(function (G) {
  'use strict';
  const V3 = THREE.Vector3;
  const PI = Math.PI;

  // ---------- Canvas textures ----------
  const FONT_DISPLAY = '"Shrikhand", "Cooper Black", "Chalkboard SE", Georgia, serif';
  const FONT_BODY = '"Karla", "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  const FONT_NEWS = '"Courier Prime", "Courier New", monospace';
  G.FONT_DISPLAY = FONT_DISPLAY;

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
  }
  function toTex(c, o = {}) {
    const t = new THREE.CanvasTexture(c);
    if (o.repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(o.repeat[0], o.repeat[1]);
    }
    t.anisotropy = G.maxAniso || 4;
    return t;
  }
  function noise(x, w, h, color, alpha, count, size) {
    x.fillStyle = color;
    for (let i = 0; i < count; i++) {
      x.globalAlpha = Math.random() * alpha;
      x.fillRect(Math.random() * w, Math.random() * h, size * (0.5 + Math.random()), size * (0.5 + Math.random()));
    }
    x.globalAlpha = 1;
  }
  function roundRect(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }
  function wrapText(x, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (x.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  const cache = {};
  const once = (key, fn) => cache[key] || (cache[key] = fn());

  G.tex = {
    tartan: () => once('tartan', () => {
      const [c, x] = mk(128, 128);
      x.fillStyle = '#2f5d3a'; x.fillRect(0, 0, 128, 128);
      x.globalAlpha = 0.85; x.fillStyle = '#a8312a'; x.fillRect(0, 18, 128, 30); x.fillRect(18, 0, 30, 128);
      x.globalAlpha = 1; x.fillStyle = '#e0a526'; x.fillRect(0, 84, 128, 5); x.fillRect(84, 0, 5, 128);
      x.fillStyle = '#1b3522'; x.fillRect(0, 62, 128, 5); x.fillRect(62, 0, 5, 128);
      return toTex(c, { repeat: [2, 2] });
    }),
    knit: () => once('knit', () => {
      const [c, x] = mk(64, 64);
      x.fillStyle = '#7b4a2a'; x.fillRect(0, 0, 64, 64);
      x.strokeStyle = '#5e361c'; x.lineWidth = 3;
      for (let yy = 0; yy < 64; yy += 8) for (let xx = 0; xx < 64; xx += 8) {
        x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 4, yy + 5); x.lineTo(xx + 8, yy); x.stroke();
      }
      return toTex(c, { repeat: [4, 4] });
    }),
    stripes: (c1, c2, n = 8, vertical = true, rep = [1, 1]) => once(`stripes${c1}${c2}${n}${vertical}${rep}`, () => {
      const [c, x] = mk(256, 256);
      const s = 256 / n;
      for (let i = 0; i < n; i++) {
        x.fillStyle = i % 2 ? c2 : c1;
        if (vertical) x.fillRect(i * s, 0, s + 1, 256); else x.fillRect(0, i * s, 256, s + 1);
      }
      return toTex(c, { repeat: rep });
    }),
    wood: (base = '#5a3a22', rep = [1, 1]) => once('wood' + base + rep, () => {
      const [c, x] = mk(512, 512);
      x.fillStyle = base; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 90; i++) {
        const y0 = Math.random() * 512;
        x.strokeStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,220,170,.06)';
        x.lineWidth = 1 + Math.random() * 3;
        x.beginPath();
        for (let xx = 0; xx <= 512; xx += 16) x.lineTo(xx, y0 + Math.sin(xx / 60 + i) * 6 + Math.sin(xx / 17 + i * 3) * 2);
        x.stroke();
      }
      for (let k = 0; k < 8; k++) { // planks
        x.fillStyle = 'rgba(0,0,0,.35)';
        x.fillRect(0, k * 64, 512, 2);
      }
      return toTex(c, { repeat: rep });
    }),
    walnut: () => once('walnut', () => {
      const [c, x] = mk(512, 512);
      const g = x.createLinearGradient(0, 0, 512, 0);
      g.addColorStop(0, '#3a2618'); g.addColorStop(0.5, '#2c1c12'); g.addColorStop(1, '#3a2618');
      x.fillStyle = g; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 120; i++) {
        const x0 = Math.random() * 512;
        x.strokeStyle = Math.random() < 0.6 ? 'rgba(0,0,0,.22)' : 'rgba(255,210,160,.05)';
        x.lineWidth = 1 + Math.random() * 2.5;
        x.beginPath();
        for (let y = 0; y <= 512; y += 16) x.lineTo(x0 + Math.sin(y / 70 + i) * 8, y);
        x.stroke();
      }
      return toTex(c, { repeat: [5, 5] });
    }),
    fireTiles: () => once('tiles', () => {
      const [c, x] = mk(128, 128);
      x.fillStyle = '#6b3a1c'; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        x.fillStyle = (i + j) % 2 ? '#b06a38' : '#a15c2e';
        roundRect(x, i * 32 + 2, j * 32 + 2, 28, 28, 4); x.fill();
        x.fillStyle = '#e0a526'; x.beginPath(); x.arc(i * 32 + 16, j * 32 + 16, 4, 0, PI * 2); x.fill();
      }
      return toTex(c, { repeat: [2, 2] });
    }),
    burlap: () => once('burlap', () => {
      const [c, x] = mk(256, 256);
      x.fillStyle = '#b8955a'; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = 'rgba(80,50,20,.25)';
      for (let i = 0; i < 256; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
      noise(x, 256, 256, '#5a3a1a', 0.3, 1500, 3);
      return toTex(c, { repeat: [3, 2] });
    }),
    coconut: () => once('coconut', () => {
      const [c, x] = mk(256, 128);
      x.fillStyle = '#5b3a1e'; x.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 900; i++) {
        x.strokeStyle = Math.random() < 0.5 ? 'rgba(160,110,60,.55)' : 'rgba(30,18,8,.5)';
        x.lineWidth = 1;
        const px = Math.random() * 256, py = Math.random() * 128;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + G.rand(-6, 6), py + G.rand(4, 12)); x.stroke();
      }
      x.fillStyle = '#1e1208';
      [[40, 30], [58, 30], [49, 46]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 5, 0, PI * 2); x.fill(); });
      return toTex(c);
    }),
    grass: () => once('grass', () => {
      const [c, x] = mk(256, 256);
      x.fillStyle = '#2f4a25'; x.fillRect(0, 0, 256, 256);
      noise(x, 256, 256, '#476b33', 0.6, 2500, 3);
      noise(x, 256, 256, '#1e3318', 0.6, 1500, 3);
      return toTex(c, { repeat: [12, 12] });
    }),
    news: () => once('news', () => {
      const [c, x] = mk(256, 320);
      x.fillStyle = '#f3efe4'; x.fillRect(0, 0, 256, 320);
      x.fillStyle = '#29241d';
      x.font = `bold 22px ${FONT_NEWS}`; x.textAlign = 'center';
      x.fillText('THE DAILY', 128, 32);
      x.font = `bold 34px ${FONT_NEWS}`;
      x.fillText('GRUMBLE', 128, 66);
      x.fillRect(14, 76, 228, 4);
      x.font = `bold 17px ${FONT_NEWS}`;
      x.fillText("COLDEST NIGHT SINCE '63", 128, 100);
      x.fillStyle = '#9a9282';
      for (let i = 0; i < 12; i++) { x.fillRect(16, 116 + i * 14, 104, 6); x.fillRect(136, 116 + i * 14, i > 6 ? 104 : 0, 6); }
      x.fillRect(136, 116, 104, 90);
      for (let i = 0; i < 6; i++) x.fillRect(16, 290 - i * 0, 0, 0);
      return toTex(c);
    }),
    rug: () => once('rug', () => {
      const [c, x] = mk(512, 512);
      const rings = ['#e0a526', '#c9531f', '#6b3a1c', '#e0a526', '#c9531f', '#7a3b1d', '#e0a526', '#c9531f'];
      rings.forEach((col, k) => { x.fillStyle = col; x.beginPath(); x.arc(256, 256, 256 - k * 30, 0, PI * 2); x.fill(); });
      noise(x, 512, 512, '#000', 0.08, 3000, 3);
      return toTex(c);
    }),
    can: () => once('can', () => {
      const [c, x] = mk(256, 128);
      x.fillStyle = '#c9d2d6'; x.fillRect(0, 0, 256, 128);
      x.fillStyle = '#b3261e'; x.fillRect(0, 28, 256, 72);
      x.fillStyle = '#e0a526'; x.fillRect(0, 24, 256, 6); x.fillRect(0, 98, 256, 6);
      x.fillStyle = '#f6ecd2'; x.font = `bold 34px ${FONT_BODY}`; x.textAlign = 'center';
      x.fillText('BEANS', 64, 76); x.fillText('BEANS', 192, 76);
      return toTex(c);
    }),
    sign: (text, bg = '#e0a526', fg = '#7a2e1f') => {
      const [c, x] = mk(1024, 256);
      x.fillStyle = '#2b1a10'; roundRect(x, 4, 4, 1016, 248, 40); x.fill();
      x.fillStyle = bg; roundRect(x, 18, 18, 988, 220, 30); x.fill();
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
      let size = 120;
      x.font = `${size}px ${FONT_DISPLAY}`;
      while (x.measureText(text).width > 900 && size > 40) { size -= 6; x.font = `${size}px ${FONT_DISPLAY}`; }
      x.fillStyle = '#2b1a10'; x.fillText(text, 518, 136);
      x.fillStyle = fg; x.fillText(text, 512, 130);
      return toTex(c);
    },
    label: (text, o = {}) => {
      const { size = 64, bg = '#c9531f', fg = '#f6ecd2', pad = 22, font = FONT_BODY, weight = '800' } = o;
      const [m, mx] = mk(8, 8);
      mx.font = `${weight} ${size}px ${font}`;
      const w = Math.ceil(mx.measureText(text).width + pad * 2);
      const h = Math.ceil(size * 1.5);
      const [c, x] = mk(w, h);
      x.font = `${weight} ${size}px ${font}`;
      if (bg) { x.fillStyle = '#2b1a10'; roundRect(x, 0, 0, w, h, h / 2); x.fill(); x.fillStyle = bg; roundRect(x, 4, 4, w - 8, h - 8, h / 2 - 4); x.fill(); }
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, w / 2, h / 2 + 2);
      const t = toTex(c);
      t.userData = { aspect: w / h };
      return t;
    },
    dice: (n) => once('dice' + n, () => {
      const [c, x] = mk(128, 128);
      x.fillStyle = '#f3efe4'; x.fillRect(0, 0, 128, 128);
      x.strokeStyle = '#d8cdb4'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 122);
      const P = { 1: [[64, 64]], 2: [[36, 36], [92, 92]], 3: [[34, 34], [64, 64], [94, 94]], 4: [[36, 36], [92, 36], [36, 92], [92, 92]], 5: [[34, 34], [94, 34], [64, 64], [34, 94], [94, 94]], 6: [[36, 32], [92, 32], [36, 64], [92, 64], [36, 96], [92, 96]] }[n];
      x.fillStyle = n === 1 ? '#b3261e' : '#2b1a10';
      P.forEach(([a, b]) => { x.beginPath(); x.arc(a, b, n === 1 ? 16 : 11, 0, PI * 2); x.fill(); });
      return toTex(c);
    }),
    thermoScale: () => once('thermo', () => {
      const [c, x] = mk(128, 512);
      x.fillStyle = '#f3e6c9'; x.fillRect(0, 0, 128, 512);
      x.strokeStyle = '#2b1a10'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 506);
      const top = 40, bot = 440; // pixels for 37.5 .. 34.5
      const yOf = (t) => bot - (t - 34.5) / 3 * (bot - top);
      x.fillStyle = '#2b1a10'; x.textAlign = 'left'; x.textBaseline = 'middle';
      for (let t = 34.5; t <= 37.51; t += 0.5) {
        const y = yOf(t);
        const whole = Math.abs(t - Math.round(t)) < 0.01;
        x.fillRect(64, y - 1.5, whole ? 26 : 14, 3);
        if (whole) { x.font = `bold 24px ${FONT_NEWS}`; x.fillText(`${Math.round(t)}°`, 76 + 18, y); }
      }
      x.fillStyle = '#b3261e'; x.fillRect(8, yOf(35) - 2, 112, 4);
      x.font = `800 13px ${FONT_BODY}`; x.fillText('HYPOTHERMIA', 10, yOf(35) + 14);
      x.fillStyle = '#3f7d3a'; x.fillText('NORMAL', 10, yOf(37) - 14);
      x.fillStyle = '#7a3b1d'; x.font = `22px ${FONT_DISPLAY}`; x.textAlign = 'center'; x.fillText('Grandad', 64, 488);
      return toTex(c);
    }),
    striker: () => once('striker', () => {
      const [c, x] = mk(128, 1024);
      const bands = [['#3f7d3a', 'WEAKLING'], ['#9bb040', 'CUSTARD CREAM'], ['#e0a526', 'CARDIGAN'], ['#e08a2e', 'LUMBERJACK'], ['#c9531f', 'STRONGMAN'], ['#b3261e', 'GRANDAD!']];
      const h = 1024 / bands.length;
      bands.forEach(([col, name], k) => {
        const y = 1024 - (k + 1) * h;
        x.fillStyle = col; x.fillRect(0, y, 128, h);
        x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, y, 128, 4);
        x.save(); x.translate(64, y + h / 2); x.rotate(-PI / 2);
        x.fillStyle = '#f6ecd2'; x.font = `800 30px ${FONT_BODY}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(name, 0, 0); x.restore();
      });
      return toTex(c);
    }),
    target: (face = false) => once('target' + face, () => {
      const [c, x] = mk(256, 256);
      const cols = ['#b3261e', '#f6ecd2', '#b3261e', '#f6ecd2', '#e0a526'];
      cols.forEach((col, k) => { x.fillStyle = col; x.beginPath(); x.arc(128, 128, 126 - k * 25, 0, PI * 2); x.fill(); });
      if (face) {
        x.fillStyle = '#2b1a10';
        x.beginPath(); x.arc(92, 96, 12, 0, PI * 2); x.arc(164, 96, 12, 0, PI * 2); x.fill();
        x.fillStyle = '#1a110b'; x.beginPath(); x.arc(128, 160, 30, 0, PI * 2); x.fill();
      }
      return toTex(c);
    }),
    valance: (c1, c2) => once('valance' + c1 + c2, () => {
      const [c, x] = mk(1024, 128);
      const n = 16;
      const w = 1024 / n;
      for (let i = 0; i < n; i++) {
        x.fillStyle = i % 2 ? c2 : c1;
        x.beginPath();
        x.moveTo(i * w, 0); x.lineTo(i * w + w, 0); x.lineTo(i * w + w, 70);
        x.arc(i * w + w / 2, 70, w / 2, 0, PI);
        x.closePath(); x.fill();
      }
      x.fillStyle = '#e0a526'; x.fillRect(0, 0, 1024, 10);
      const t = toTex(c);
      return t;
    }),
    cloth: (col = '#8a1f1a') => once('cloth' + col, () => {
      const [c, x] = mk(256, 256);
      x.fillStyle = col; x.fillRect(0, 0, 256, 256);
      noise(x, 256, 256, '#000', 0.15, 2000, 2);
      x.strokeStyle = 'rgba(255,220,120,.5)'; x.lineWidth = 6; x.strokeRect(10, 10, 236, 236);
      return toTex(c);
    }),
    skyGlow: () => once('skyglow', () => {
      const [c, x] = mk(64, 64);
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,220,140,1)'); g.addColorStop(1, 'rgba(255,220,140,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return toTex(c);
    }),
    puff: () => once('puff', () => {
      const [c, x] = mk(64, 64);
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return toTex(c);
    }),
  };

  // ---------- Board top (2048px texture for the 20x20 board) ----------
  function drawIconChair(x, cx, cy, s) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    x.fillStyle = '#d99a2b'; x.strokeStyle = '#2b1a10'; x.lineWidth = 3;
    roundRect(x, -22, -26, 44, 36, 10); x.fill(); x.stroke();
    x.fillStyle = '#e3a73a'; roundRect(x, -32, -6, 14, 28, 5); x.fill(); x.stroke(); roundRect(x, 18, -6, 14, 28, 5); x.fill(); x.stroke();
    x.fillStyle = '#e8b24a'; roundRect(x, -18, 4, 36, 16, 4); x.fill(); x.stroke();
    x.restore();
  }
  function drawMark(x, kind, cx, cy, s) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    x.lineWidth = 4; x.lineCap = 'round';
    if (kind === 'draught') {
      x.strokeStyle = '#3f8fa0';
      x.beginPath(); x.moveTo(-20, -6); x.lineTo(6, -6); x.arc(6, -13, 7, PI / 2, -PI * 0.9, true); x.stroke();
      x.beginPath(); x.moveTo(-20, 8); x.lineTo(12, 8); x.arc(12, 15, 7, -PI / 2, PI * 0.9); x.stroke();
    } else if (kind === 'biscuit') {
      x.fillStyle = '#e8c068'; x.strokeStyle = '#2b1a10'; x.lineWidth = 3;
      roundRect(x, -20, -13, 40, 26, 5); x.fill(); x.stroke();
      x.strokeStyle = '#b8862c'; x.beginPath(); x.moveTo(-12, -4); x.lineTo(12, -4); x.moveTo(-12, 5); x.lineTo(12, 5); x.stroke();
    } else if (kind === 'warm') {
      x.fillStyle = '#e0667a'; x.strokeStyle = '#2b1a10'; x.lineWidth = 3;
      x.fillRect(-15, -14, 30, 30); x.strokeRect(-15, -14, 30, 30);
      x.strokeStyle = '#c9531f'; x.beginPath(); x.moveTo(-6, -24); x.quadraticCurveTo(-10, -20, -6, -17); x.moveTo(6, -24); x.quadraticCurveTo(2, -20, 6, -17); x.stroke();
    }
    x.restore();
  }

  G.tex.boardTop = () => {
    const S = 2048;
    const [c, x] = mk(S, S);
    const px = (k) => G.trackStart(k) * S;
    const sz = (k) => G.trackSize(k) * S;
    x.fillStyle = '#2b1a10'; x.fillRect(0, 0, S, S);
    // centre carpet
    const c0 = px(1) + 3, c1 = px(8) - 3;
    x.fillStyle = '#5a2d17'; x.fillRect(c0, c0, c1 - c0, c1 - c0);
    x.save(); x.beginPath(); x.rect(c0, c0, c1 - c0, c1 - c0); x.clip();
    for (let yy = c0; yy < c1 + 90; yy += 90) for (let xx = c0; xx < c1 + 90; xx += 90) {
      const off = (Math.round((yy - c0) / 90) % 2) * 45;
      [['#a14a1f', 30], ['#5a2d17', 21], ['#8a5a12', 17], ['#7a3b1d', 13]].forEach(([col, r]) => { x.fillStyle = col; x.beginPath(); x.arc(xx + off, yy, r, 0, PI * 2); x.fill(); });
    }
    x.restore();

    const BAND = 0.2;
    for (let i = 0; i < G.N; i++) {
      const sp = G.SPACES[i];
      const [r, cc] = G.rc(i);
      const side = G.sideOf(i);
      const R = { x: px(cc) + 3, y: px(r) + 3, w: sz(cc) - 6, h: sz(r) - 6 };
      x.fillStyle = sp.type === 'door' ? '#e0a526' : '#efe4c4';
      x.fillRect(R.x, R.y, R.w, R.h);
      // content area (leave room for district band on the inner edge)
      const A = { ...R };
      if (sp.type === 'room') {
        const b = (side === 'left' || side === 'right' ? R.w : R.h) * BAND;
        if (side === 'bottom') { A.y += b; A.h -= b; }
        if (side === 'top') { A.h -= b; }
        if (side === 'left') { A.w -= b; }
        if (side === 'right') { A.x += b; A.w -= b; }
      }
      const cx = A.x + A.w / 2;
      const cy = A.y + A.h / 2;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      if (sp.type === 'corner') {
        const topHalf = r === 8; // text sits on the half nearest the middle of the board
        const ty = topHalf ? R.y + R.h * 0.3 : R.y + R.h * 0.68;
        x.fillStyle = '#7a3b1d';
        x.font = `44px ${FONT_DISPLAY}`;
        wrapText(x, sp.name, R.w - 30).forEach((ln, k, all) => x.fillText(ln, R.x + R.w / 2, ty + (k - (all.length - 1) / 2) * 46 - 22));
        x.fillStyle = '#6b5443';
        x.font = `700 26px ${FONT_BODY}`;
        wrapText(x, sp.rule, R.w - 36).forEach((ln, k) => x.fillText(ln, R.x + R.w / 2, ty + 44 + k * 28));
        if (i === 0) {
          x.fillStyle = '#c9531f'; roundRect(x, R.x + 14, R.y + 14, 110, 38, 19); x.fill();
          x.fillStyle = '#f6ecd2'; x.font = `800 22px ${FONT_BODY}`; x.fillText('START', R.x + 69, R.y + 34);
        }
      } else if (sp.type === 'door') {
        drawIconChair(x, cx, cy - 18, 1.35);
        x.fillStyle = '#2b1a10';
        x.font = `800 24px ${FONT_BODY}`;
        x.fillText('POP IN TO', cx, cy + 42);
        x.fillText('GRANDAD', cx, cy + 68);
        // arrow towards the middle
        x.fillStyle = '#7a3b1d';
        const ar = { bottom: [cx, R.y + 22, 0], top: [cx, R.y + R.h - 22, PI], left: [R.x + R.w - 22, cy, PI / 2], right: [R.x + 22, cy, -PI / 2] }[side];
        x.save(); x.translate(ar[0], ar[1]); x.rotate(ar[2]);
        x.beginPath(); x.moveTo(0, -12); x.lineTo(14, 10); x.lineTo(-14, 10); x.closePath(); x.fill();
        x.restore();
      } else {
        const d = G.DISTRICTS[sp.district];
        x.fillStyle = '#2b1a10';
        if (sp.stall) {
          // the 3D stall stands on the far half of this square; its name goes on the near half
          x.font = `34px ${FONT_DISPLAY}`;
          const lines = wrapText(x, G.spaceName(i), A.w - 20);
          const baseY = A.y + A.h - 30 - (lines.length - 1) * 36;
          lines.forEach((ln, k) => x.fillText(ln, cx, baseY + k * 36));
        } else {
          x.font = `800 30px ${FONT_BODY}`;
          const lines = wrapText(x, sp.name, A.w - 24);
          const baseY = A.y + A.h - 34 - (lines.length - 1) * 32;
          lines.forEach((ln, k) => x.fillText(ln, cx, baseY + k * 32));
          const fx = G.SPACE_FX[i];
          if (fx && fx.mark) drawMark(x, fx.mark, cx, A.y + 48, 1.4);
        }
      }
    }
    // district bands with room names
    for (const d of G.DISTRICTS) {
      const cells = d.idx.map(G.rc);
      const side = G.sideOf(d.idx[0]);
      const rows = cells.map((q) => q[0]);
      const cols = cells.map((q) => q[1]);
      const x0 = px(Math.min(...cols)) + 3, x1 = px(Math.max(...cols)) + sz(Math.max(...cols)) - 3;
      const y0 = px(Math.min(...rows)) + 3, y1 = px(Math.max(...rows)) + sz(Math.max(...rows)) - 3;
      let B;
      const bw = sz(1) * BAND;
      if (side === 'bottom') B = { x: x0, y: y0, w: x1 - x0, h: bw };
      if (side === 'top') B = { x: x0, y: y1 - bw, w: x1 - x0, h: bw };
      if (side === 'left') B = { x: x1 - bw, y: y0, w: bw, h: y1 - y0 };
      if (side === 'right') B = { x: x0, y: y0, w: bw, h: y1 - y0 };
      x.fillStyle = d.color;
      x.fillRect(B.x, B.y, B.w, B.h);
      x.save();
      x.translate(B.x + B.w / 2, B.y + B.h / 2);
      if (side === 'left') x.rotate(-PI / 2);
      if (side === 'right') x.rotate(PI / 2);
      x.fillStyle = d.darkText ? '#2b1a10' : '#f6ecd2';
      x.font = `800 28px ${FONT_BODY}`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const label = d.name.toUpperCase().split('').join(String.fromCharCode(8202));
      x.fillText(label, 0, 2);
      x.restore();
    }
    return toTex(c);
  };

  // ---------- Materials & mesh helpers ----------
  const matCache = {};
  G.mat = (color, o = {}) => {
    const key = color + JSON.stringify(Object.keys(o).map((k) => [k, o[k] && o[k].uuid ? o[k].uuid : o[k]]));
    if (matCache[key]) return matCache[key];
    return (matCache[key] = new THREE.MeshLambertMaterial({ color, ...o }));
  };
  G.shiny = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05, ...o });
  G.glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
  const mesh = (geo, mat, x = 0, y = 0, z = 0, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };
  G.mesh = mesh;
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, seg = 16, open = false, ts = 0, tl = PI * 2) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl);
  const sph = (r, ws = 18, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
  G.geo = { box, cyl, sph };
  function limb(a, b, r, mat) {
    const d = new V3().subVectors(b, a);
    const len = d.length();
    const m = mesh(cyl(r, r * 0.9, len, 12), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    return m;
  }
  G.limb = limb;

  // ---------- Grandad's cosy things (about 1 unit across) ----------
  G.makeItem = (key) => {
    const g = new THREE.Group();
    const cream = G.mat('#f3e6c9');
    const ink = G.mat('#2b1a10');
    switch (key) {
      case 'slippers': {
        const tartan = G.mat('#ffffff', { map: G.tex.tartan() });
        [-0.22, 0.22].forEach((sx) => {
          const s = mesh(sph(0.28), tartan, sx, 0.12, 0);
          s.scale.set(0.8, 0.5, 1.5);
          g.add(s);
          const cuff = mesh(new THREE.TorusGeometry(0.15, 0.06, 8, 16), cream, sx, 0.24, -0.16);
          cuff.rotation.x = PI / 2;
          g.add(cuff);
        });
        break;
      }
      case 'tea': {
        g.add(mesh(cyl(0.26, 0.23, 0.5, 20), cream, 0, 0.25, 0));
        g.add(mesh(cyl(0.268, 0.25, 0.12, 20), G.mat('#c9531f'), 0, 0.22, 0));
        g.add(mesh(cyl(0.23, 0.23, 0.02, 20), G.mat('#8a4b24'), 0, 0.49, 0));
        const h = mesh(new THREE.TorusGeometry(0.13, 0.04, 8, 16, PI), cream, 0.26, 0.26, 0);
        h.rotation.z = -PI / 2;
        g.add(h);
        break;
      }
      case 'blanket': {
        const tartan = G.mat('#ffffff', { map: G.tex.tartan() });
        g.add(mesh(box(1.0, 0.3, 0.72), tartan, 0, 0.15, 0));
        const roll = mesh(cyl(0.15, 0.15, 1.0, 14), tartan, 0, 0.15, 0.36);
        roll.rotation.z = PI / 2;
        g.add(roll);
        break;
      }
      case 'scarf': {
        const st = G.mat('#ffffff', { map: G.tex.stripes('#c9531f', '#f3e6c9', 10, true, [3, 1]) });
        const t = mesh(new THREE.TorusGeometry(0.32, 0.11, 10, 24), st, 0, 0.5, 0);
        g.add(t);
        const tail = mesh(box(0.2, 0.62, 0.07), G.mat('#ffffff', { map: G.tex.stripes('#c9531f', '#f3e6c9', 6, false) }), 0.14, 0.05, 0.12);
        tail.rotation.z = 0.2;
        g.add(tail);
        break;
      }
      case 'hwb': {
        const pink = G.mat('#e0667a', { map: G.tex.stripes('#e0667a', '#c9506a', 12, false) });
        g.add(mesh(box(0.62, 0.72, 0.2), pink, 0, 0.36, 0));
        g.add(mesh(cyl(0.1, 0.12, 0.16, 12), G.mat('#e0667a'), 0, 0.8, 0));
        g.add(mesh(cyl(0.12, 0.12, 0.1, 12), ink, 0, 0.92, 0));
        break;
      }
      case 'cardigan': {
        const knit = G.mat('#ffffff', { map: G.tex.knit() });
        g.add(mesh(box(0.72, 0.82, 0.24), knit, 0, 0.45, 0));
        [-1, 1].forEach((s) => {
          const sl = mesh(box(0.2, 0.72, 0.2), knit, s * 0.48, 0.42, 0);
          sl.rotation.z = s * 0.35;
          g.add(sl);
        });
        g.add(mesh(box(0.03, 0.82, 0.02), ink, 0, 0.45, 0.13));
        [0.25, 0.45, 0.65].forEach((y) => g.add(mesh(sph(0.035, 8, 6), G.mat('#e0a526'), 0.06, y, 0.13)));
        g.add(mesh(box(0.28, 0.2, 0.02), G.mat('#a9c1d1'), 0, 0.78, 0.125));
        break;
      }
      case 'hat': {
        const teal = G.mat('#2a7a8c');
        g.add(mesh(new THREE.SphereGeometry(0.4, 20, 12, 0, PI * 2, 0, PI / 2), teal, 0, 0.16, 0));
        g.add(mesh(cyl(0.41, 0.41, 0.16, 20), G.mat('#e0a526'), 0, 0.12, 0));
        const stripe = mesh(new THREE.TorusGeometry(0.32, 0.035, 6, 20), cream, 0, 0.38, 0);
        stripe.rotation.x = PI / 2;
        g.add(stripe);
        g.add(mesh(sph(0.14), cream, 0, 0.62, 0));
        break;
      }
      case 'logs': {
        const endTex = (() => {
          const [c, x] = mk(64, 64);
          x.fillStyle = '#e3c49a'; x.fillRect(0, 0, 64, 64);
          x.strokeStyle = '#a5794a'; x.lineWidth = 3;
          [10, 18, 26].forEach((r) => { x.beginPath(); x.arc(32, 32, r, 0, PI * 2); x.stroke(); });
          return toTex(c);
        })();
        const bark = G.mat('#7a4f2c');
        const end = G.mat('#ffffff', { map: endTex });
        const log = (px, py) => {
          const m = mesh(cyl(0.15, 0.15, 0.9, 12), [bark, end, end], px, py, 0);
          m.rotation.z = PI / 2;
          g.add(m);
        };
        log(0, 0.15); log(0, 0.15); g.children[0].position.z = -0.16; g.children[1].position.z = 0.16;
        log(0, 0.42);
        break;
      }
    }
    return g;
  };

  // ---------- Grandad in his armchair ----------
  G.makeGrandad = () => {
    const root = new THREE.Group();
    const chair = new THREE.Group();
    root.add(chair);
    const mustard = G.mat('#d99a2b');
    const mustardDark = G.mat('#c98a1f');
    const mustardLight = G.mat('#e3a73a');
    chair.add(mesh(box(2.9, 0.8, 2.2), mustardDark, 0, 0.45, 0));
    chair.add(mesh(box(2.94, 0.14, 2.24), G.mat('#a8741a'), 0, 0.12, 0));
    [[-1.3, -0.95], [1.3, -0.95], [-1.3, 0.95], [1.3, 0.95]].forEach(([a, b]) => chair.add(mesh(cyl(0.09, 0.07, 0.1, 8), G.mat('#2b1a10'), a, 0.03, b)));
    chair.add(mesh(box(2.2, 0.35, 1.9), mustardLight, 0, 1.02, 0.12));
    chair.add(mesh(box(2.9, 2.5, 0.5), mustard, 0, 2.1, -0.85));
    const roll = mesh(cyl(0.25, 0.25, 2.9, 16), mustard, 0, 3.35, -0.85);
    roll.rotation.z = PI / 2;
    chair.add(roll);
    [-1, 1].forEach((s) => {
      const wing = mesh(box(0.35, 1.4, 1.0), mustardDark, s * 1.28, 2.55, -0.45);
      wing.rotation.y = s * 0.18;
      chair.add(wing);
      chair.add(mesh(box(0.45, 0.6, 2.1), mustard, s * 1.225, 1.2, 0.05));
      const ar = mesh(cyl(0.3, 0.3, 2.1, 14), G.mat('#e8b24a'), s * 1.225, 1.55, 0.05);
      ar.rotation.x = PI / 2;
      chair.add(ar);
    });
    chair.add(mesh(box(1.3, 0.55, 0.04), G.mat('#f7f1e3'), 0, 3.05, -0.59));
    [[-0.7, 2.2], [0.7, 2.2], [-0.7, 1.6], [0.7, 1.6]].forEach(([a, b]) => chair.add(mesh(sph(0.05, 8, 6), G.mat('#8a5a12'), a, b, -0.59)));

    const man = new THREE.Group();
    root.add(man);
    const skin = new THREE.MeshLambertMaterial({ color: '#f2c29b' });
    const noseMat = new THREE.MeshLambertMaterial({ color: '#e0776a' });
    const shirt = G.mat('#a9c1d1');
    const knit = G.mat('#ffffff', { map: G.tex.knit() });
    const trousers = G.mat('#5c4632');
    const white = G.mat('#f4f1ea');
    const ink = G.mat('#2b1a10');
    const tartan = G.mat('#ffffff', { map: G.tex.tartan() });
    const cream = G.mat('#f3e6c9');
    const wear = {};
    const W = (key, obj) => { (wear[key] = wear[key] || []).push(obj); obj.visible = false; return obj; };

    [-1, 1].forEach((s) => {
      man.add(mesh(box(0.56, 0.42, 1.45), trousers, s * 0.32, 1.42, 0.45));
      man.add(mesh(box(0.5, 1.1, 0.5), trousers, s * 0.32, 0.78, 1.2));
      const foot = mesh(sph(0.3), G.mat('#8b8680'), s * 0.32, 0.17, 1.42);
      foot.scale.set(0.9, 0.5, 1.4);
      man.add(foot);
      const sl = W('slippers', mesh(sph(0.34), tartan, s * 0.32, 0.18, 1.45));
      sl.scale.set(0.95, 0.55, 1.45);
      man.add(sl);
      const cuff = W('slippers', mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 16), cream, s * 0.32, 0.33, 1.22));
      cuff.rotation.x = PI / 2;
      man.add(cuff);
    });

    const torso = mesh(cyl(0.58, 0.7, 1.55, 20), shirt, 0, 2.35, -0.3);
    torso.scale.z = 0.72;
    man.add(torso);
    const tie = mesh(box(0.14, 0.75, 0.04), G.mat('#7a2e1f'), 0, 2.62, 0.17);
    tie.rotation.x = -0.1;
    man.add(tie);
    const shell = W('cardigan', mesh(new THREE.CylinderGeometry(0.61, 0.73, 1.5, 22, 1, true, 0.5, PI * 2 - 1.0), new THREE.MeshLambertMaterial({ map: G.tex.knit(), side: THREE.DoubleSide }), 0, 2.33, -0.3));
    shell.scale.z = 0.74;
    man.add(shell);
    [2.05, 2.4, 2.75].forEach((y) => man.add(W('cardigan', mesh(sph(0.05, 8, 6), G.mat('#e0a526'), 0.3, y, 0.13))));

    man.add(mesh(cyl(0.2, 0.22, 0.35, 12), skin, 0, 3.2, -0.28));
    const scarfMat = G.mat('#ffffff', { map: G.tex.stripes('#c9531f', '#f3e6c9', 12, true, [3, 1]) });
    const scarf = W('scarf', mesh(new THREE.TorusGeometry(0.33, 0.12, 10, 24), scarfMat, 0, 3.12, -0.26));
    scarf.rotation.x = PI / 2;
    man.add(scarf);
    const tail = W('scarf', mesh(box(0.26, 0.9, 0.08), G.mat('#ffffff', { map: G.tex.stripes('#c9531f', '#f3e6c9', 6, false) }), 0.24, 2.66, 0.2));
    tail.rotation.z = 0.12;
    man.add(tail);

    // head
    const head = new THREE.Group();
    head.position.set(0, 3.7, -0.22);
    man.add(head);
    const skull = mesh(sph(0.52, 24, 18), skin, 0, 0, 0);
    skull.scale.set(1, 1.08, 0.95);
    head.add(skull);
    [-1, 1].forEach((s) => {
      const ear = mesh(sph(0.14), skin, s * 0.52, 0, 0);
      ear.scale.set(0.5, 1, 0.8);
      head.add(ear);
      head.add(mesh(sph(0.05, 8, 6), ink, s * 0.18, 0.08, 0.45));
      const lens = mesh(new THREE.TorusGeometry(0.14, 0.022, 6, 20), ink, s * 0.18, 0.08, 0.48);
      head.add(lens);
      const brow = mesh(box(0.28, 0.08, 0.1), white, s * 0.2, 0.3, 0.44);
      brow.rotation.z = -s * 0.3;
      head.add(brow);
      [[0.46, 0.12, -0.05, 0.16], [0.4, 0.32, -0.12, 0.14], [0.3, 0.02, -0.35, 0.14]].forEach(([hx, hy, hz, r]) => head.add(mesh(sph(r, 10, 8), white, s * hx, hy, hz)));
      const tache = mesh(sph(0.14, 12, 8), white, s * 0.12, -0.2, 0.45);
      tache.scale.set(1.35, 0.6, 0.6);
      head.add(tache);
      const arm = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.25, 6), ink, s * 0.4, 0.1, 0.25);
      arm.rotation.x = PI / 2;
      head.add(arm);
    });
    const cheekMat = new THREE.MeshLambertMaterial({ color: '#e0776a', transparent: true, opacity: 0.55 });
    [-1, 1].forEach((s) => head.add(mesh(sph(0.11, 10, 8), cheekMat, s * 0.3, -0.1, 0.38)));
    const bridge = mesh(cyl(0.02, 0.02, 0.1, 6), ink, 0, 0.08, 0.5);
    bridge.rotation.z = PI / 2;
    head.add(bridge);
    const nose = mesh(sph(0.15), noseMat, 0, -0.04, 0.5);
    head.add(nose);
    const mouth = mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 12, PI), G.mat('#7a2e1f'), 0, -0.38, 0.42);
    head.add(mouth);
    const icicle = mesh(new THREE.ConeGeometry(0.045, 0.28, 8), new THREE.MeshLambertMaterial({ color: '#d6ecf7', transparent: true, opacity: 0.85 }), 0, -0.26, 0.55);
    icicle.rotation.x = PI;
    icicle.visible = false;
    head.add(icicle);
    const hatG = W('hat', new THREE.Group());
    hatG.add(mesh(new THREE.SphereGeometry(0.56, 24, 12, 0, PI * 2, 0, PI / 2), G.mat('#2a7a8c'), 0, 0.14, 0));
    hatG.add(mesh(cyl(0.575, 0.575, 0.18, 24), G.mat('#e0a526'), 0, 0.17, 0));
    const hs = mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 24), cream, 0, 0.47, 0);
    hs.rotation.x = PI / 2;
    hatG.add(hs);
    hatG.add(mesh(sph(0.17), cream, 0, 0.74, 0));
    head.add(hatG);

    // his left arm, resting on the armrest (+x side)
    const leftArm = [
      limb(new V3(0.62, 2.95, -0.3), new V3(1.02, 2.2, -0.15), 0.17, shirt),
      limb(new V3(1.02, 2.2, -0.15), new V3(1.16, 1.98, 0.75), 0.16, shirt),
      mesh(sph(0.17), shirt, 1.02, 2.2, -0.15),
    ];
    leftArm.forEach((m) => man.add(m));
    man.add(mesh(sph(0.17), skin, 1.17, 1.96, 0.86));

    // his right arm holding the paper (pivots at the shoulder)
    const armPivot = new THREE.Group();
    armPivot.position.set(-0.62, 2.95, -0.3);
    man.add(armPivot);
    const rightArm = [
      limb(new V3(0, 0, 0), new V3(-0.42, -0.7, 0.35), 0.17, shirt),
      limb(new V3(-0.42, -0.7, 0.35), new V3(-0.52, 0.0, 1.0), 0.16, shirt),
      mesh(sph(0.17), shirt, -0.42, -0.7, 0.35),
    ];
    rightArm.forEach((m) => armPivot.add(m));
    const hand = mesh(sph(0.17), skin, -0.54, 0.02, 1.08);
    armPivot.add(hand);
    const paper = new THREE.Group();
    paper.position.set(-0.72, 0.36, 1.12);
    paper.rotation.set(-0.1, 0.4, 0.14);
    const newsMat = new THREE.MeshLambertMaterial({ map: G.tex.news(), side: THREE.FrontSide });
    const backMat = G.mat('#e8e2d2');
    const page = mesh(box(1.05, 1.3, 0.02), [backMat, backMat, backMat, backMat, newsMat, backMat], 0, 0, 0);
    paper.add(page);
    armPivot.add(paper);

    // blanket and hot water bottle on the lap
    man.add(W('blanket', mesh(box(1.78, 0.1, 1.5), tartan, 0, 1.68, 0.5)));
    man.add(W('blanket', mesh(box(1.78, 1.25, 0.08), tartan, 0, 1.08, 1.3)));
    man.add(W('blanket', mesh(box(1.78, 0.08, 0.1), G.mat('#a8312a'), 0, 0.44, 1.32)));
    const hwb = W('hwb', G.makeItem('hwb'));
    hwb.position.set(0, 1.72, 0.6);
    hwb.rotation.x = -1.1;
    hwb.scale.setScalar(0.85);
    man.add(hwb);

    const armMeshes = [...leftArm, ...rightArm];
    const api = {
      group: root,
      man,
      armPivot,
      paper,
      head,
      setWorn(keys) {
        for (const [k, list] of Object.entries(wear)) list.forEach((o) => { o.visible = keys.includes(k); });
        const m = keys.includes('cardigan') ? knit : shirt;
        armMeshes.forEach((o) => { o.material = m; });
      },
      pop(key) {
        (wear[key] || []).forEach((o) => {
          const s0 = o.scale.clone();
          G.tween(500, (t) => o.scale.copy(s0).multiplyScalar(0.4 + 0.6 * G.ease.back(t)));
        });
      },
      setCold(c) {
        skin.color.set(G.mixHex('#f2c29b', '#b8d2e6', c));
        noseMat.color.set(G.mixHex('#e0776a', '#86add6', c));
        cheekMat.opacity = 0.55 * (1 - c);
        icicle.visible = c > 0.72;
      },
      handWorld() { return paper.getWorldPosition(new V3()); },
      headWorld() { return head.getWorldPosition(new V3()); },
    };
    return api;
  };

  // ---------- Front-room furniture ----------
  G.makeFireplace = () => {
    const g = new THREE.Group();
    const tiles = G.mat('#ffffff', { map: G.tex.fireTiles() });
    const wood = G.mat('#ffffff', { map: G.tex.wood('#5a3420') });
    g.add(mesh(box(3.0, 2.7, 0.7), tiles, 0, 1.35, 0));
    g.add(mesh(box(1.5, 1.5, 0.12), G.mat('#140c07'), 0, 0.8, 0.31));
    g.add(mesh(box(3.5, 0.2, 1.0), wood, 0, 2.8, 0.1));
    g.add(mesh(box(3.3, 0.12, 1.2), G.mat('#7a2e1f'), 0, 0.06, 0.8));
    const clock = new THREE.Group();
    clock.position.set(0.85, 3.2, 0.15);
    clock.add(mesh(box(0.7, 0.55, 0.3), G.mat('#6b3f22'), 0, 0, 0));
    const face = mesh(cyl(0.2, 0.2, 0.04, 20), G.mat('#f3efe4'), 0, 0.02, 0.16);
    face.rotation.x = PI / 2;
    clock.add(face);
    g.add(clock);
    const frame = mesh(box(0.5, 0.6, 0.06), G.mat('#e0a526'), -0.9, 3.22, 0.05);
    frame.rotation.x = -0.12;
    g.add(frame);
    const photo = mesh(box(0.36, 0.44, 0.02), G.mat('#9fc3d8'), -0.9, 3.22, 0.09);
    photo.rotation.x = -0.12;
    g.add(photo);
    const coals = new THREE.Group();
    [[-0.3, 0.2], [0, 0.22], [0.3, 0.2]].forEach(([a, b]) => coals.add(mesh(sph(0.16, 10, 8), G.mat('#4a4540'), a, b, 0.5)));
    g.add(coals);
    const fire = new THREE.Group();
    const bark = G.mat('#7a4f2c');
    [-0.25, 0.25].forEach((a) => { const l = mesh(cyl(0.13, 0.13, 1.2, 10), bark, 0, 0.2, 0.5); l.rotation.z = PI / 2 + a; fire.add(l); });
    const flames = [
      [G.glow('#e8612c', { transparent: true, opacity: 0.9 }), -0.25, 0.26, 0.9],
      [G.glow('#f7a933', { transparent: true, opacity: 0.9 }), 0.12, 0.3, 1.1],
      [G.glow('#fde28a', { transparent: true, opacity: 0.95 }), 0, 0.18, 0.7],
    ].map(([m, x, r, h]) => { const f = mesh(new THREE.ConeGeometry(r, h, 10), m, x, 0.3 + h / 2, 0.52, false); fire.add(f); return f; });
    const light = new THREE.PointLight(0xff8a3c, 0, 16, 1.6);
    light.position.set(0, 1.1, 1.4);
    g.add(light);
    g.add(fire);
    fire.visible = false;
    let lit = false;
    return {
      group: g,
      setLit(v) { lit = v; fire.visible = v; coals.visible = !v; },
      update(t) {
        if (!lit) { light.intensity = 0; return; }
        flames.forEach((f, k) => { f.scale.set(1 - 0.1 * Math.sin(t * 9 + k), 1 + 0.18 * Math.sin(t * 13 + k * 2), 1); });
        light.intensity = 1.5 + Math.sin(t * 11) * 0.2 + Math.sin(t * 23) * 0.15;
      },
    };
  };

  G.makeSideTable = () => {
    const g = new THREE.Group();
    const wood = G.mat('#8a5a33');
    g.add(mesh(cyl(0.62, 0.62, 0.08, 24), wood, 0, 1.25, 0));
    g.add(mesh(cyl(0.07, 0.09, 1.2, 10), G.mat('#4a2a15'), 0, 0.62, 0));
    g.add(mesh(cyl(0.35, 0.4, 0.06, 18), G.mat('#4a2a15'), 0, 0.03, 0));
    const mag = mesh(box(0.5, 0.03, 0.36), G.mat('#2a7a8c'), -0.18, 1.305, 0.1);
    mag.rotation.y = 0.3;
    g.add(mag);
    const tea = G.makeItem('tea');
    tea.scale.setScalar(0.72);
    tea.position.set(0.2, 1.29, -0.05);
    tea.visible = false;
    g.add(tea);
    const puffs = [];
    for (let k = 0; k < 3; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.puff(), transparent: true, opacity: 0.5, depthWrite: false }));
      s.scale.setScalar(0.25);
      tea.add(s);
      puffs.push(s);
    }
    return {
      group: g,
      tea,
      update(t) {
        if (!tea.visible) return;
        puffs.forEach((p, k) => {
          const ph = (t * 0.5 + k / 3) % 1;
          p.position.set(Math.sin(t * 2 + k) * 0.06, 0.6 + ph * 0.9, 0);
          p.material.opacity = 0.5 * (1 - ph);
          p.scale.setScalar(0.2 + ph * 0.3);
        });
      },
    };
  };

  G.makeLamp = () => {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.35, 0.4, 0.08, 18), G.mat('#4a2a15'), 0, 0.04, 0));
    g.add(mesh(cyl(0.05, 0.05, 3.6, 8), G.mat('#b88a3c'), 0, 1.8, 0));
    const shade = mesh(new THREE.CylinderGeometry(0.35, 0.65, 0.7, 20, 1, true), new THREE.MeshLambertMaterial({ color: '#e08a2e', emissive: '#6b3a10', side: THREE.DoubleSide }), 0, 3.75, 0);
    g.add(shade);
    const light = new THREE.PointLight(0xffc27a, 0.55, 12, 1.5);
    light.position.set(0, 3.4, 0);
    g.add(light);
    return { group: g, light, shade };
  };

  G.makeThermometer = () => {
    const g = new THREE.Group();
    const faceMat = G.mat('#ffffff', { map: G.tex.thermoScale() });
    const woodM = G.mat('#8a5a33');
    g.add(mesh(box(1.0, 4.4, 0.12), [woodM, woodM, woodM, woodM, faceMat, woodM], 0, 2.4, 0));
    g.add(mesh(box(0.3, 0.3, 0.3), woodM, 0, 0.15, 0));
    g.add(mesh(box(0.08, 0.3, 0.08), woodM, 0, 0.35, 0));
    // the scale is drawn on the backboard; map its pixel rows to heights
    const yOfPx = (py) => 0.2 + 4.4 * (1 - py / 512);
    const y0 = yOfPx(440);
    const y1 = yOfPx(40);
    const glass = mesh(cyl(0.1, 0.1, y1 - y0 + 0.2, 12), new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 }), -0.14, (y0 + y1) / 2, 0.14, false);
    g.add(glass);
    const mercuryGeo = cyl(0.06, 0.06, 1, 10);
    mercuryGeo.translate(0, 0.5, 0);
    const mercuryMat = new THREE.MeshLambertMaterial({ color: '#b3261e', emissive: '#3a0a06' });
    const mercury = mesh(mercuryGeo, mercuryMat, -0.14, y0 - 0.05, 0.14, false);
    g.add(mercury);
    const bulb = mesh(sph(0.2), mercuryMat, -0.14, y0 - 0.22, 0.16, false);
    g.add(bulb);
    let shown = 36.4;
    return {
      group: g,
      set(t, instant) {
        const target = G.clamp(t, 34.5, 37.5);
        const from = shown;
        shown = target;
        const apply = (v) => {
          mercury.scale.y = Math.max(0.05, (v - 34.5) / 3 * (y1 - y0) + 0.05);
          mercuryMat.color.set(v < 35.8 ? '#5aa6d1' : '#b3261e');
        };
        if (instant) apply(target);
        else G.tween(700, (k) => apply(G.lerp(from, target, k)), G.ease.out);
      },
    };
  };

  // ---------- Board pieces ----------
  G.makeStall = (color) => {
    const g = new THREE.Group();
    const front = G.mat('#ffffff', { map: G.tex.stripes(color, '#f6ecd2', 8, true) });
    g.add(mesh(box(1.45, 0.45, 0.55), [front, front, G.mat('#8a5a33'), front, front, front], 0, 0.225, 0));
    [-0.66, 0.66].forEach((x) => g.add(mesh(cyl(0.04, 0.04, 1.2, 6), G.mat('#f6ecd2'), x, 1.05, -0.2)));
    const canopy = mesh(new THREE.ConeGeometry(1.08, 0.55, 4, 1, true), new THREE.MeshLambertMaterial({ map: G.tex.stripes(color, '#f6ecd2', 12, true), side: THREE.DoubleSide }), 0, 1.9, -0.05);
    canopy.rotation.y = PI / 4;
    canopy.scale.set(1, 1, 0.7);
    g.add(canopy);
    g.add(mesh(cyl(0.02, 0.02, 0.45, 5), G.mat('#2b1a10'), 0, 2.35, -0.05));
    const flag = mesh(new THREE.ConeGeometry(0.12, 0.3, 3), G.mat('#e0a526'), 0.12, 2.5, -0.05);
    flag.rotation.z = -PI / 2;
    g.add(flag);
    return g;
  };

  G.makePawn = (color) => {
    const g = new THREE.Group();
    const pts = [[0, 0], [0.42, 0], [0.42, 0.08], [0.36, 0.13], [0.27, 0.2], [0.18, 0.5], [0.13, 0.78], [0.24, 0.84], [0.24, 0.9], [0.12, 0.96], [0, 0.97]].map(([a, b]) => new THREE.Vector2(a, b));
    const m = G.shiny(color, { roughness: 0.3 });
    const body = mesh(new THREE.LatheGeometry(pts, 24), m, 0, 0, 0);
    g.add(body);
    g.add(mesh(sph(0.23, 20, 16), m, 0, 1.14, 0));
    g.userData.mat = m;
    return g;
  };

  G.makeDie = () => {
    const faces = [3, 4, 1, 6, 2, 5].map((n) => new THREE.MeshLambertMaterial({ map: G.tex.dice(n) }));
    const d = mesh(box(0.9, 0.9, 0.9), faces, 0, 0.45, 0);
    return d;
  };
  // Orientation that puts value v on top.
  G.dieBase = (v) => {
    const q = new THREE.Quaternion();
    const X = new V3(1, 0, 0), Z = new V3(0, 0, 1);
    if (v === 6) q.setFromAxisAngle(X, PI);
    if (v === 2) q.setFromAxisAngle(X, -PI / 2);
    if (v === 5) q.setFromAxisAngle(X, PI / 2);
    if (v === 3) q.setFromAxisAngle(Z, PI / 2);
    if (v === 4) q.setFromAxisAngle(Z, -PI / 2);
    return q;
  };

  G.makeRolledPaper = () => {
    const g = new THREE.Group();
    const news = new THREE.MeshLambertMaterial({ map: G.tex.news() });
    const r = mesh(cyl(0.14, 0.14, 0.95, 14), [news, G.mat('#d8d2c2'), G.mat('#d8d2c2')], 0, 0, 0);
    r.rotation.z = PI / 2;
    g.add(r);
    const band = mesh(cyl(0.15, 0.15, 0.1, 14), G.mat('#c9531f'), 0, 0, 0);
    band.rotation.z = PI / 2;
    g.add(band);
    return g;
  };

  // ---------- Corner props ----------
  G.makeCornerProp = (key) => {
    const g = new THREE.Group();
    const api = { group: g, update() {}, flash() {} };
    if (key === 'boiler') {
      g.add(mesh(box(0.95, 1.4, 0.6), G.mat('#f3efe4'), 0, 0.7, 0));
      const dial = mesh(cyl(0.14, 0.14, 0.06, 16), G.mat('#e0a526'), -0.2, 1.1, 0.31);
      dial.rotation.x = PI / 2;
      g.add(dial);
      const win = G.glow('#3a1a0a');
      g.add(mesh(box(0.42, 0.3, 0.04), win, 0.08, 0.55, 0.31));
      [-0.25, 0.25].forEach((x) => g.add(mesh(cyl(0.06, 0.06, 0.8, 8), G.mat('#b88a3c'), x, 1.8, -0.1)));
      api.flash = () => {
        win.color.set('#ff8a3c');
        setTimeout(() => win.color.set('#3a1a0a'), 2200);
      };
    } else if (key === 'window') {
      const frameM = G.mat('#f3efe4');
      const glassM = new THREE.MeshLambertMaterial({ color: '#bfe0f2', transparent: true, opacity: 0.55 });
      const fr = new THREE.Group();
      fr.add(mesh(box(1.6, 0.1, 0.12), frameM, 0, 0.05, 0));
      fr.add(mesh(box(1.6, 0.1, 0.12), frameM, 0, 1.75, 0));
      fr.add(mesh(box(0.1, 1.8, 0.12), frameM, -0.8, 0.9, 0));
      fr.add(mesh(box(0.1, 1.8, 0.12), frameM, 0.8, 0.9, 0));
      const sash = new THREE.Group();
      sash.position.set(-0.75, 0, 0);
      sash.add(mesh(box(0.75, 1.6, 0.04), glassM, 0.375, 0.9, 0, false));
      sash.add(mesh(box(0.06, 1.6, 0.08), frameM, 0.72, 0.9, 0));
      sash.rotation.y = -1.0;
      fr.add(sash);
      fr.add(mesh(box(0.75, 1.6, 0.04), glassM, 0.4, 0.9, 0, false));
      g.add(fr);
      [-1, 1].forEach((s) => { const cur = mesh(box(0.3, 1.9, 0.1), G.mat('#b8412f'), s * 1.0, 1.0, 0.1); g.add(cur); });
      const flakes = [];
      for (let k = 0; k < 10; k++) { const f = mesh(sph(0.05, 6, 4), G.glow('#ffffff'), 0, 0, 0, false); g.add(f); flakes.push(f); }
      api.update = (t) => {
        sash.rotation.y = -1.0 + Math.sin(t * 1.3) * 0.12;
        flakes.forEach((f, k) => {
          const ph = (t * 0.35 + k / 10) % 1;
          f.position.set(-0.3 + Math.sin(k * 7) * 0.6 + ph * 0.8, 1.7 - ph * 1.6, 0.2 + ph * 1.2);
        });
      };
    } else if (key === 'stairlift') {
      const stepM = G.mat('#7a3b1d');
      for (let k = 0; k < 5; k++) g.add(mesh(box(1.1, 0.3 * (k + 1), 0.35), stepM, 0, 0.15 * (k + 1), 0.7 - k * 0.35));
      const rail = mesh(box(0.1, 0.1, 2.3), G.mat('#8a7452'), 0.62, 1.05, 0);
      rail.rotation.x = 0.66;
      g.add(rail);
      const seat = new THREE.Group();
      seat.position.set(0.62, 1.1, 0.1);
      seat.add(mesh(box(0.55, 0.12, 0.5), G.mat('#e0a526'), 0, 0, 0));
      seat.add(mesh(box(0.55, 0.6, 0.1), G.mat('#c9531f'), 0, 0.3, -0.22));
      g.add(seat);
      api.update = (t) => { seat.position.z = 0.1 + Math.sin(t * 0.6) * 0.5; seat.position.y = 1.1 - Math.sin(t * 0.6) * 0.38; };
    } else if (key === 'cat') {
      g.add(mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.4, 20, 1, true), new THREE.MeshLambertMaterial({ color: '#b07a3c', side: THREE.DoubleSide }), 0, 0.2, 0));
      g.add(mesh(cyl(0.55, 0.55, 0.12, 20), G.mat('#b8412f'), 0, 0.1, 0));
      const ginger = G.mat('#e0a526');
      const body = mesh(sph(0.34), ginger, 0, 0.42, 0);
      body.scale.set(1.25, 0.7, 1);
      g.add(body);
      const head = new THREE.Group();
      head.position.set(0.32, 0.55, 0.2);
      head.add(mesh(sph(0.22), ginger, 0, 0, 0));
      [-1, 1].forEach((s) => { const e = mesh(new THREE.ConeGeometry(0.08, 0.16, 4), ginger, s * 0.11, 0.2, 0); head.add(e); });
      [-1, 1].forEach((s) => head.add(mesh(box(0.08, 0.02, 0.02), G.mat('#2b1a10'), s * 0.08, 0.02, 0.21)));
      g.add(head);
      const tail = mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 16, PI * 0.9), ginger, -0.25, 0.42, 0.05);
      tail.rotation.x = -PI / 2;
      g.add(tail);
      api.update = (t) => { tail.rotation.z = Math.sin(t * 1.5) * 0.35; head.rotation.y = Math.sin(t * 0.4) * 0.3; body.scale.y = 0.7 + Math.sin(t * 1.8) * 0.03; };
    }
    return api;
  };

  // ---------- Fairground booth (shared set for every stall game) ----------
  G.makeBooth = (o) => {
    const { title, c1 = '#b3261e', c2 = '#f6ecd2' } = o;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1b1233');
    scene.fog = new THREE.Fog('#1b1233', 20, 45);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 3.4, 9.5);
    camera.lookAt(0, 2.4, -2);
    scene.add(new THREE.HemisphereLight('#ffe6c4', '#2a1a3a', 0.7));
    const key = new THREE.DirectionalLight('#fff0d8', 0.55);
    key.position.set(4, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
    scene.add(key);
    const inner = new THREE.PointLight('#ffcf8a', 0.7, 16, 1.4);
    inner.position.set(0, 5, 0);
    scene.add(inner);

    const ground = mesh(new THREE.PlaneGeometry(80, 80), G.mat('#ffffff', { map: G.tex.grass() }), 0, 0, 0, false);
    ground.rotation.x = -PI / 2;
    scene.add(ground);
    const floor = mesh(new THREE.PlaneGeometry(12, 8.5), G.mat('#ffffff', { map: G.tex.wood('#6b4428', [3, 2]) }), 0, 0.01, -1.8, false);
    floor.rotation.x = -PI / 2;
    scene.add(floor);
    const wallM = G.mat('#ffffff', { map: G.tex.stripes(c1, c2, 16, true, [1, 1]) });
    const back = mesh(new THREE.PlaneGeometry(12, 7), wallM, 0, 3.5, -6, false);
    scene.add(back);
    [-1, 1].forEach((s) => {
      const side = mesh(new THREE.PlaneGeometry(8.5, 7), G.mat('#ffffff', { map: G.tex.stripes(c1, c2, 12, true) }), s * 6, 3.5, -1.8, false);
      side.rotation.y = -s * PI / 2;
      scene.add(side);
      const post = mesh(cyl(0.16, 0.16, 6.4, 12), G.mat('#ffffff', { map: G.tex.stripes('#e0a526', '#f6ecd2', 10, false, [1, 3]) }), s * 6.05, 3.2, 2.2);
      scene.add(post);
    });
    const roof = mesh(new THREE.PlaneGeometry(12.4, 8.6), G.mat('#2a1a3a'), 0, 6.6, -1.8, false);
    roof.rotation.x = PI / 2;
    scene.add(roof);
    const val = mesh(new THREE.PlaneGeometry(12.4, 1.3), new THREE.MeshLambertMaterial({ map: G.tex.valance(c1, c2), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }), 0, 5.95, 2.25, false);
    scene.add(val);
    const counterFront = G.mat('#ffffff', { map: G.tex.stripes(c2, c1, 20, true) });
    const counterTop = G.mat('#ffffff', { map: G.tex.wood('#8a5a33', [3, 1]) });
    const counter = mesh(box(12, 1.1, 0.8), [counterFront, counterFront, counterTop, counterFront, counterFront, counterFront], 0, 0.55, 2.6);
    scene.add(counter);
    // sign on the back wall
    const sign = mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshBasicMaterial({ map: G.tex.sign(title), transparent: true }), 0, 5.55, -5.95, false);
    const signBulbs = [];
    scene.add(sign);
    // bulbs
    const bulbs = [];
    const bulbCols = ['#ffd84a', '#ff6a3d', '#7ad3ff', '#ff9ad5'];
    for (let x = -5.8; x <= 5.81; x += 0.58) {
      const b = mesh(sph(0.09, 8, 6), G.glow(bulbCols[bulbs.length % 4]), x, 5.28, 2.3, false);
      scene.add(b);
      bulbs.push(b);
    }
    for (let x = -2.4; x <= 2.41; x += 0.4) {
      const b = mesh(sph(0.07, 8, 6), G.glow(bulbCols[bulbs.length % 4]), x, 6.25, -5.9, false);
      scene.add(b);
      bulbs.push(b);
      signBulbs.push(b);
    }
    // prize shelf (top left of the back wall)
    const shelf = mesh(box(1.8, 0.12, 0.6), G.mat('#8a5a33'), -4.4, 4.2, -5.6);
    scene.add(shelf);
    const prizeSlot = new THREE.Group();
    prizeSlot.position.set(-4.4, 4.3, -5.5);
    scene.add(prizeSlot);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.label('PRIZE', { size: 48, bg: '#e0a526', fg: '#2b1a10' }), transparent: true }));
    tag.scale.set(1.0, 0.36, 1);
    tag.position.set(-4.4, 3.85, -5.2);
    scene.add(tag);
    const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.skyGlow(), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    glowS.scale.setScalar(2.4);
    glowS.position.set(-4.4, 4.8, -5.7);
    scene.add(glowS);
    const glowCols = bulbs.map((b) => b.material.color.clone());
    const dim = new THREE.Color('#5a4030');
    return {
      scene,
      camera,
      prizeSlot,
      sign: { set visible(v) { sign.visible = v; signBulbs.forEach((b) => { b.visible = v; }); } },
      counterTopY: 1.1,
      update(t) {
        const step = Math.floor(t * 4);
        bulbs.forEach((b, k) => b.material.color.copy((k + step) % 3 === 0 ? dim : glowCols[k]));
        prizeSlot.rotation.y = t * 1.2;
      },
    };
  };
})(window.GCS);
