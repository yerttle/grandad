/* Grandad's Cold Snap: the fairground stall games. Each pays out 0 to 3 tokens for the Fair Shop. */
(function (G) {
  'use strict';
  const V3 = THREE.Vector3;
  const PI = Math.PI;
  const M = { active: false, autoResult: null };
  G.Mini = M;
  const GAMES = {};
  M.GAMES = GAMES;

  const planeZ = (z) => new THREE.Plane(new V3(0, 0, 1), -z);
  const planeY = (y) => new THREE.Plane(new V3(0, 1, 0), -y);
  const { mesh } = G;
  const { box, cyl, sph } = G.geo;
  const $ = G.$;

  // ---------- HUD bits ----------
  const hud = {};
  function grabHud() {
    ['miniHud', 'miniTitle', 'miniPrize', 'miniTokens', 'miniNext', 'miniStatus', 'miniTimerWrap', 'miniTimer', 'miniHint', 'power', 'powerLabel', 'powerZone', 'powerFill', 'powerMarker', 'miniCardWrap', 'miniCard', 'fade', 'stage'].forEach((id) => { hud[id] = $(id); });
  }
  const fade = (on) => new Promise((r) => {
    hud.fade.classList.toggle('on', on);
    setTimeout(r, G.reduceMotion ? 30 : 330);
  });
  function floatText(text, world, camera, cls = '') {
    const p = G.toScreen(world, camera);
    const el = document.createElement('div');
    el.className = 'float-text ' + cls;
    el.textContent = text;
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    hud.stage.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
  let cardResolve = null;
  function card(html, button) {
    return new Promise((resolve) => {
      hud.miniCard.innerHTML = html + `<div class="lid-actions"><button class="btn primary" id="miniGo" type="button">${button} <kbd>Space</kbd></button></div>`;
      hud.miniCardWrap.hidden = false;
      const done = () => { hud.miniCardWrap.hidden = true; cardResolve = null; resolve(); };
      cardResolve = done;
      $('miniGo').addEventListener('click', done);
      setTimeout(() => { const b = $('miniGo'); if (b) b.focus({ preventScroll: true }); }, 30);
    });
  }
  async function countdown() {
    for (const n of ['3', '2', '1']) {
      const el = document.createElement('div');
      el.className = 'countdown';
      el.textContent = n;
      hud.stage.appendChild(el);
      G.Sound.play('tick');
      await G.sleep(520);
      el.remove();
    }
    const el = document.createElement('div');
    el.className = 'countdown go';
    el.textContent = 'Go!';
    hud.stage.appendChild(el);
    G.Sound.play('go');
    setTimeout(() => el.remove(), 600);
  }

  // "every duck" / "every 3 ducks"
  const every = (n, one, many) => (n === 1 ? `every ${one}` : `every ${n} ${many}`);
  const plural = (one, many) => (n) => (n === 1 ? one : many);

  // ---------- Running a stall ----------
  M.play = async (gameKey, opts = {}) => {
    const { diff = 'chilly', practice = false, playerName = '' } = opts;
    // test hook: skip the stall and pay out a fixed number of tokens (true/false mean 3/0)
    if (M.autoResult !== null) { await G.sleep(40); const r = M.autoResult; return r === true ? 3 : r === false ? 0 : r; }
    if (!hud.fade) grabHud();
    const def = GAMES[gameKey];
    const level = G.DIFFS[diff].level;
    const L = (a, b, c) => [a, b, c][level];
    const p = def.params(L);
    M.active = true;
    await fade(true);
    document.body.classList.add('minigame');
    const booth = G.makeBooth({ title: def.title, c1: def.c1, c2: def.c2 });
    // three gold tokens hang in the prize slot
    [-0.7, 0, 0.7].forEach((x) => { const tk = G.makeToken(); tk.position.x = x; tk.scale.setScalar(0.72); booth.prizeSlot.add(tk); });
    let state = 'intro';
    let won = null;
    // tokens: games report a raw score and every p.per of it earns a token, up to three
    const per = p.per || 1;
    let tokens = 0;
    const unit = (n) => (typeof def.unit === 'function' ? def.unit(n) : def.unit || '');
    const setTokens = (t) => {
      t = G.clamp(Math.floor(t), 0, G.MAX_TOKENS);
      if (t > tokens) G.Sound.play('coin');
      tokens = t;
      hud.miniTokens.querySelectorAll('.slot').forEach((el, k) => el.classList.toggle('on', k < tokens));
    };
    let nextNote = '';
    const showNext = (score) => {
      if (!def.unit) { hud.miniNext.textContent = nextNote; return; }
      if (tokens >= G.MAX_TOKENS) { hud.miniNext.textContent = 'Top prize!'; return; }
      const need = per * (tokens + 1) - score;
      hud.miniNext.textContent = `${need} more ${unit(need)} for the next token`;
    };
    let resolveDone;
    const done = new Promise((r) => { resolveDone = r; });
    const ctx = {
      scene: booth.scene,
      camera: booth.camera,
      booth,
      level,
      p,
      ptr: G.ptr,
      running: () => state === 'play',
      status: (h) => { hud.miniStatus.innerHTML = h; },
      hint: (h) => { hud.miniHint.innerHTML = h; },
      timer: (f) => { hud.miniTimerWrap.hidden = f === null; if (f !== null) hud.miniTimer.style.width = G.clamp(f, 0, 1) * 100 + '%'; },
      power: {
        show(v, label = 'Power') { hud.power.hidden = !v; hud.powerLabel.textContent = label; },
        set(v) { hud.powerFill.style.width = G.clamp(v, 0, 1) * 100 + '%'; hud.powerMarker.style.left = G.clamp(v, 0, 1) * 100 + '%'; },
        zone(a, b) { hud.powerZone.hidden = a === null; if (a !== null) { hud.powerZone.style.left = a * 100 + '%'; hud.powerZone.style.width = (b - a) * 100 + '%'; } },
      },
      float: (text, world, cls) => floatText(text, world, booth.camera, cls),
      sfx: (n) => G.Sound.play(n),
      // score(n): raw progress, turned into tokens; tokens(n): set tokens directly (races and the like)
      score: (n) => { setTokens(n / per); showNext(n); return tokens; },
      tokens: (t, note = def.note || '') => { nextNote = note; setTokens(t); showNext(0); return tokens; },
      full: () => tokens >= G.MAX_TOKENS,
      end: (w) => {
        if (state !== 'play') return;
        if (typeof w === 'number') setTokens(w);
        state = 'over';
        won = tokens;
        resolveDone(tokens);
      },
      rayZ: (z) => G.rayPlane(planeZ(z), G.ptr.ndc, booth.camera),
      rayY: (y) => G.rayPlane(planeY(y), G.ptr.ndc, booth.camera),
      hits: (objs) => G.raycast(objs, G.ptr.ndc, booth.camera),
    };
    hud.miniTitle.textContent = def.title;
    hud.miniPrize.textContent = practice ? 'Practice round · up to 3 tokens' : 'Win up to 3 tokens';
    hud.miniTokens.querySelectorAll('.slot').forEach((el) => el.classList.remove('on'));
    hud.miniNext.textContent = def.unit ? `${per} ${unit(per)} for each token` : def.note || '';
    hud.miniStatus.textContent = '';
    const keysText = G.isTouch && def.touch ? def.touch : def.keys;
    hud.miniHint.innerHTML = keysText;
    hud.power.hidden = true;
    hud.powerZone.hidden = true;
    hud.miniTimerWrap.hidden = true;
    hud.miniHud.hidden = false;
    const game = def.build(ctx);
    const camBase = { pos: booth.camera.position.clone(), quat: booth.camera.quaternion.clone(), fov: booth.camera.fov };
    let t0 = 0;
    const controller = {
      resize: () => fitCamera(booth.camera, camBase),
      pointerDown: (ptr, e) => { if (state === 'play' && game.pointerDown) game.pointerDown(ptr, e); },
      pointerMove: (ptr, e) => { if (state === 'play' && game.pointerMove) game.pointerMove(ptr, e); },
      pointerUp: (ptr, e) => { if (state === 'play' && game.pointerUp) game.pointerUp(ptr, e); },
      update: (dt, t) => {
        booth.update(t);
        if (game.always) game.always(dt, t);
        if (state === 'play' && game.update) game.update(dt, t, t - t0);
      },
    };
    M.keyDown = (e) => {
      if (cardResolve && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); cardResolve(); return; }
      if (state === 'play' && game.keyDown) game.keyDown(e);
    };
    M.keyUp = (e) => { if (state === 'play' && game.keyUp) game.keyUp(e); };
    G.setView(booth.scene, booth.camera, controller);
    G.resizeEngine();
    G.E.canvas.style.cursor = def.cursor || 'default';
    await fade(false);
    G.Music.start();
    await card(`
      <p class="kicker">${practice ? 'Practice at the fair' : `${G.esc(playerName)} steps up to the stall`}</p>
      <h2 class="logo small">${def.title}</h2>
      <p class="prize-line">${practice ? 'In the game this stall pays out' : 'Win'} up to <b>3 tokens</b> ${G.TOKEN_SVG}${G.TOKEN_SVG}${G.TOKEN_SVG} for the Fair Shop</p>
      <p class="goal">${def.goal(p)}</p>
      <p>${def.how}</p>
      <p class="keys">${keysText}</p>
      ${G.isTouch && G.isPortrait() ? '<p class="tip">Tip: turn your phone sideways for a bigger view of the stall.</p>' : ''}`, 'Play!');
    await countdown();
    state = 'play';
    t0 = G.E.time;
    if (game.start) game.start();
    await done;
    G.Sound.play(won ? 'cheer' : 'aww');
    if (won) {
      // a confetti cannon from each side of the stall, bigger for a bigger win
      [-1, 1].forEach((s) => G.spawnConfetti(booth.scene, new V3(s * 3.4, 1.2, 1.5), { n: (G.isPhone ? 20 : 36) * won, spread: 1.6, up: 7.5, life: 2.4, size: 0.2 }));
    }
    await G.sleep(1100);
    G.Music.stop();
    hud.power.hidden = true;
    const coins = [0, 1, 2].map((k) => `<span class="${k < won ? 'on' : ''}">${G.TOKEN_SVG}</span>`).join('');
    const heads = ['No tokens!', 'One token!', 'Two tokens!', 'Top prize!'];
    const notes = practice
      ? ['Have another go from the fair menu.', 'In the game that would be a token for the Fair Shop.', 'In the game that would be two tokens for the Fair Shop.', 'Three tokens: in the game that buys Grandad something straight away.']
      : ['Better luck next time. Land on a stall again for another go.', 'Every token counts. Three buys Grandad something at the Fair Shop.', 'Nearly enough for something at the Fair Shop.', 'Three tokens: enough to buy Grandad something at the Fair Shop!'];
    await card(`<p class="kicker">${def.title}</p><h2 class="logo small${won ? '' : ' cold'}">${heads[won]}</h2><div class="token-row">${coins}</div><p class="prize-line">${notes[won]}</p>`,
      practice ? 'Back to the fair' : 'Back to the board');
    await fade(true);
    hud.miniHud.hidden = true;
    document.body.classList.remove('minigame');
    booth.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    M.active = false;
    M.keyDown = M.keyUp = null;
    G.Board.show();
    G.resizeEngine();
    await fade(false);
    return won;
  };

  // shared: a rubber duck with a ring on its head (forward is +x)
  function makeRubberDuck(color = '#f7c52b', ringColor = '#b3261e') {
    const yellow = G.shiny(color, { roughness: 0.35 });
    const d = new THREE.Group();
    const body = mesh(sph(0.3), yellow, 0, 0.1, 0);
    body.scale.set(1.25, 0.8, 1);
    d.add(body);
    d.add(mesh(sph(0.19), yellow, 0.24, 0.38, 0));
    const beak = mesh(new THREE.ConeGeometry(0.07, 0.18, 8), G.mat('#e8612c'), 0.45, 0.36, 0);
    beak.rotation.z = -PI / 2;
    d.add(beak);
    [-1, 1].forEach((s) => d.add(mesh(sph(0.03, 6, 4), G.mat('#2b1a10'), 0.34, 0.45, s * 0.1)));
    const ring = mesh(new THREE.TorusGeometry(0.1, 0.028, 6, 16), G.mat(ringColor), 0.24, 0.6, 0);
    ring.rotation.x = PI / 2;
    d.add(ring);
    return d;
  }

  // Stalls are framed for a wide screen. On a narrower (or portrait) screen, widen the view and step
  // the camera back so the whole stall still fits across.
  function fitCamera(camera, base) {
    const REF = 1.6;
    const a = camera.aspect;
    camera.position.copy(base.pos);
    camera.fov = base.fov;
    if (a < REF * 0.95) {
      const want = Math.tan(base.fov * PI / 360) * REF * (a < 1 ? 0.82 : 1);
      const tv = Math.min(want / a, Math.tan(72 * PI / 360));
      camera.fov = Math.max(base.fov, Math.atan(tv) * 360 / PI);
      const have = Math.tan(camera.fov * PI / 360) * a;
      const dir = new V3(0, 0, -1).applyQuaternion(base.quat);
      const F = dir.z < -0.05 ? Math.max(4, (base.pos.z + 3) / -dir.z) : 10;
      if (have < want) camera.position.addScaledVector(dir, -F * (want / have - 1));
    }
    camera.updateProjectionMatrix();
  }
  // on touch screens, aim a little above the fingertip so the finger doesn't hide what you're aiming at
  const lift = (e) => (e && e.pointerType === 'touch' ? 0.65 : 0);

  // shared: take the roof and front awning off the booth for stalls that need a clear view
  function openAir(booth) {
    booth.scene.children.forEach((o) => {
      if (o.position.y > 5.2 && o.position.z > 1.5) o.visible = false;
      if (o.geometry && o.geometry.type === 'PlaneGeometry' && o.rotation.x > 1.5) o.visible = false;
    });
  }

  // shared: a ball that flies in an arc
  function flyTo(obj, from, to, ms, arc) {
    return G.tween(ms, (t) => {
      obj.position.lerpVectors(from, to, t);
      obj.position.y += Math.sin(t * PI) * arc;
    }, G.ease.linear);
  }

  // ======================================================================
  // 1. Hook-a-Duck (Hallway, Slippers)
  // ======================================================================
  GAMES.duck = {
    title: 'Hook-a-Duck', c1: '#3f8fa0', c2: '#f6ecd2', blurb: 'Hook a duck as it floats past.',
    params: (L) => ({ per: L(1, 2, 3), dips: L(6, 9, 12), tol: L(0.2, 0.16, 0.12), speed: L(0.5, 0.6, 0.72) }),
    unit: plural('duck', 'ducks'),
    goal: (p) => `A token for ${every(p.per, 'duck', 'ducks')} you hook, up to 3 tokens. You get ${p.dips} dips.`,
    how: "Rubber ducks float round the trough. Dip the hook so it drops through a duck's ring just as it passes the white circle. The hook takes a moment to drop, so go a little early.",
    keys: 'Press <kbd>Space</kbd> or click to dip the hook.',
    touch: 'Tap anywhere to dip the hook.',
    build(ctx) {
      const { scene, camera, p } = ctx;
      camera.position.set(0, 7, 7.8);
      camera.lookAt(0, 1.2, -1.3);
      const C = new V3(0, 0, -1.4);
      const R = 2.6;
      const wallM = G.mat('#ffffff', { map: G.tex.stripes('#b3261e', '#f6ecd2', 24, true, [2, 1]) });
      scene.add(mesh(cyl(3.35, 3.4, 1.35, 48), wallM, C.x, 0.675, C.z));
      const water = mesh(new THREE.RingGeometry(1.9, 3.3, 64), new THREE.MeshLambertMaterial({ color: '#3f8fa0', emissive: '#0d3040', side: THREE.DoubleSide }), C.x, 1.37, C.z, false);
      water.rotation.x = -PI / 2;
      scene.add(water);
      scene.add(mesh(cyl(1.9, 1.9, 1.7, 32), G.mat('#e0a526'), C.x, 0.85, C.z));
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.label('A PRIZE EVERY TIME*', { size: 40, bg: '#f6ecd2', fg: '#b3261e' }) }));
      sign.scale.set(3, 0.5, 1);
      sign.position.set(C.x, 2.1, C.z);
      scene.add(sign);
      const A0 = PI / 2;
      const spot = new V3(C.x + R * Math.cos(A0), 1.38, C.z + R * Math.sin(A0));
      const marker = mesh(new THREE.RingGeometry(0.3, 0.38, 32), G.glow('#ffffff', { side: THREE.DoubleSide }), spot.x, 1.385, spot.z, false);
      marker.rotation.x = -PI / 2;
      scene.add(marker);

      const makeDuck = () => makeRubberDuck();
      const ducks = [];
      const n = 10;
      let a = 0;
      for (let k = 0; k < n; k++) {
        a += (PI * 2) / n * G.rand(0.6, 1.4);
        const d = makeDuck();
        scene.add(d);
        ducks.push({ g: d, a, caught: false, ph: Math.random() * 6 });
      }
      // hook rig
      const pole = G.limb(new V3(4.2, 6.2, 4.8), new V3(0, 5.3, spot.z), 0.06, G.mat('#8a5a33'));
      scene.add(pole);
      const line = mesh(cyl(0.012, 0.012, 1, 4), G.mat('#2b1a10'), 0, 0, 0, false);
      scene.add(line);
      const hook = new THREE.Group();
      const hookJ = mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 16, PI * 1.3), G.shiny('#c9d2d6', { metalness: 0.8, roughness: 0.3 }), 0, -0.1, 0);
      hookJ.rotation.z = PI * 0.85;
      hook.add(hookJ);
      hook.add(mesh(sph(0.05, 8, 6), G.mat('#2b1a10'), 0, 0.05, 0));
      scene.add(hook);
      const top = 5.3, idle = 3.2, bottom = 1.98;
      let hookY = idle;
      let dipping = false;
      let left = p.dips;
      let caught = 0;
      let carrying = null;
      const setHook = () => {
        hook.position.set(spot.x, hookY, spot.z);
        line.position.set(spot.x, (top + hookY) / 2, spot.z);
        line.scale.y = top - hookY;
      };
      setHook();
      const status = () => ctx.status(`Ducks hooked <b>${caught}</b> · Dips left <b>${left}</b>`);
      status();
      const dip = async () => {
        if (dipping || left <= 0 || !ctx.running()) return;
        dipping = true;
        left--;
        status();
        await G.tween(280, (t) => { hookY = G.lerp(idle, bottom, t); setHook(); }, G.ease.in);
        // is a ring under the hook right now?
        let best = null;
        let bestD = p.tol;
        for (const d of ducks) {
          if (d.caught) continue;
          const diff = Math.abs(Math.atan2(Math.sin(d.a - A0), Math.cos(d.a - A0)));
          if (diff < bestD) { bestD = diff; best = d; }
        }
        if (best) {
          best.caught = true;
          carrying = best;
          ctx.sfx('hook');
          ctx.sfx('splash');
          ctx.float('Hooked!', spot.clone().add(new V3(0, 1, 0)), 'good');
        } else {
          ctx.sfx('splash');
          ctx.float('Missed', spot.clone().add(new V3(0, 1, 0)), 'bad');
        }
        await G.sleep(110);
        await G.tween(350, (t) => { hookY = G.lerp(bottom, idle, t); setHook(); }, G.ease.out);
        if (carrying) {
          const d = carrying;
          carrying = null;
          const from = d.g.position.clone();
          const to = new V3(-3.6 + caught * 0.8, 1.35, 2.5);
          caught++;
          status();
          await G.tween(500, (t) => { d.g.position.lerpVectors(from, to, t); d.g.position.y += Math.sin(t * PI) * 1.2; d.g.rotation.y = t * PI * 2; });
          ctx.score(caught);
          if (ctx.full()) ctx.end();
        }
        dipping = false;
        if (!ctx.full() && left <= 0) setTimeout(() => ctx.end(), 300);
      };
      return {
        always(dt, t) {
          for (const d of ducks) {
            if (d.caught) {
              if (d === carrying) d.g.position.set(spot.x - 0.24, hookY - 0.62, spot.z);
              continue;
            }
            d.a += dt * p.speed;
            d.g.position.set(C.x + R * Math.cos(d.a), 1.36 + Math.sin(t * 3 + d.ph) * 0.04, C.z + R * Math.sin(d.a));
            const dx = -Math.sin(d.a), dz = Math.cos(d.a);
            d.g.rotation.y = Math.atan2(-dz, dx);
          }
        },
        keyDown(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) dip(); } },
        pointerDown() { dip(); },
      };
    },
  };

  // ======================================================================
  // 2. Coconut Shy (Kitchen, Cup of Tea)
  // ======================================================================
  GAMES.coconut = {
    title: 'Coconut Shy', c1: '#7a3b1d', c2: '#e0a526', cursor: 'none', blurb: 'Throw balls at the coconuts.',
    params: (L) => ({ per: L(1, 2, 2), balls: L(6, 9, 10), sway: L(0.14, 0.24, 0.3), hitR: L(0.62, 0.54, 0.5) }),
    unit: plural('coconut', 'coconuts'),
    goal: (p) => `A token for ${every(p.per, 'coconut', 'coconuts')} you knock off, up to 3 tokens. You get ${p.balls} balls, and a fresh coconut goes up each time one falls.`,
    how: "Point at a coconut and click to throw. Your aim wobbles a bit, so wait for the crosshair to drift over the coconut before you let go.",
    keys: 'Move the mouse to aim, click to throw.',
    touch: 'Put your finger on the screen to aim (the crosshair sits just above it), slide to adjust, and let go to throw.',
    build(ctx) {
      const { scene, p } = ctx;
      const back = mesh(new THREE.PlaneGeometry(11, 5), G.mat('#ffffff', { map: G.tex.burlap() }), 0, 2.5, -4.7, false);
      scene.add(back);
      const Z = -3.4;
      const nuts = [-2.4, 0, 2.4].map((x) => {
        scene.add(mesh(cyl(0.07, 0.09, 2.6, 8), G.mat('#4a2a15'), x, 1.3, Z));
        scene.add(mesh(cyl(0.26, 0.16, 0.22, 14, true), G.mat('#e0a526', { side: THREE.DoubleSide }), x, 2.66, Z));
        const n = mesh(sph(0.38, 20, 14), G.mat('#ffffff', { map: G.tex.coconut() }), x, 3.0, Z);
        n.rotation.set(0.3, Math.random() * 6, 0.2);
        scene.add(n);
        return { m: n, home: n.position.clone(), down: false, wob: 0, vel: new V3(), spin: new V3() };
      });
      const ballM = G.shiny('#b3261e');
      const shelfBalls = [];
      for (let k = 0; k < p.balls; k++) { const b = mesh(sph(0.16, 14, 10), ballM, 3.0 + (k % 4) * 0.36, 1.28, 2.45 + Math.floor(k / 4) * 0.35); scene.add(b); shelfBalls.push(b); }
      const cross = new THREE.Group();
      const cm = G.glow('#ffffff', { depthTest: false, transparent: true });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.23, 32), cm);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), cm);
      [ring, dot].forEach((o) => { o.renderOrder = 20; cross.add(o); });
      cross.position.set(0, 3, Z + 0.4);
      scene.add(cross);
      let aimBase = new V3(0, 3, Z);
      let left = p.balls;
      let knocked = 0;
      let flying = false;
      const status = () => ctx.status(`Coconuts <b>${knocked}</b> · Balls left <b>${left}</b>`);
      status();
      const aimNow = (t) => new V3(aimBase.x + Math.sin(t * 1.7) * p.sway + Math.sin(t * 3.1) * p.sway * 0.4, aimBase.y + Math.sin(t * 2.3 + 1) * p.sway * 0.8, Z);
      const checkEnd = () => {
        if (ctx.full()) setTimeout(() => ctx.end(), 600);
        else if (left <= 0 && !flying) setTimeout(() => ctx.end(), 600);
      };
      const throwBall = async () => {
        if (flying || left <= 0 || !ctx.running()) return;
        flying = true;
        left--;
        const b = shelfBalls.pop();
        if (b) scene.remove(b);
        status();
        const aim = aimNow(G.E.time);
        const ball = mesh(sph(0.16, 14, 10), ballM, 1.6, 1.6, 6.4);
        scene.add(ball);
        ctx.sfx('throw');
        await flyTo(ball, ball.position.clone(), aim, 460, 0.7);
        let hit = null;
        let near = null;
        for (const n of nuts) {
          if (n.down) continue;
          const d = Math.hypot(aim.x - n.home.x, aim.y - n.home.y);
          if (d < p.hitR) hit = n;
          else if (d < p.hitR + 0.4) near = n;
        }
        if (hit) {
          hit.down = true;
          hit.downAt = G.E.time;
          knocked++;
          ctx.score(knocked);
          hit.vel.set(G.rand(-0.8, 0.8), 2.2, -3.2);
          hit.spin.set(G.rand(4, 8), G.rand(-3, 3), G.rand(-4, 4));
          ctx.sfx('thud');
          ctx.float('Knocked off!', hit.home.clone().add(new V3(0, 0.7, 0)), 'good');
          status();
          await flyTo(ball, ball.position.clone(), new V3(aim.x, 0.16, Z + 1.2), 400, 0.4);
        } else {
          if (near) { near.wob = 1; ctx.sfx('wobble'); ctx.float('It wobbled!', near.home.clone().add(new V3(0, 0.7, 0))); } else ctx.sfx('thud');
          await flyTo(ball, ball.position.clone(), new V3(aim.x, aim.y, -4.6), 150, 0);
          await flyTo(ball, ball.position.clone(), new V3(aim.x, 0.16, -4.4), 350, 0);
        }
        flying = false;
        setTimeout(() => scene.remove(ball), 1500);
        checkEnd();
      };
      return {
        always(dt, t) {
          const a = aimNow(t);
          cross.position.set(a.x, a.y, Z + 0.45);
          cross.visible = ctx.running();
          for (const n of nuts) {
            // the stall-holder puts a fresh coconut up on the post
            if (n.down && n.downAt && t - n.downAt > 1.4 && ctx.running()) {
              n.down = false;
              n.downAt = 0;
              n.m.position.copy(n.home);
              n.m.rotation.set(0.3, Math.random() * 6, 0.2);
              n.pop = 0;
            }
            if (n.pop !== undefined && n.pop < 1) { n.pop = Math.min(1, n.pop + dt * 4); n.m.scale.setScalar(Math.max(0.01, G.ease.back(n.pop))); }
            if (n.down) {
              if (n.m.position.y > 0.38) {
                n.vel.y -= 9.8 * dt;
                n.m.position.addScaledVector(n.vel, dt);
                n.m.rotation.x += n.spin.x * dt;
                n.m.rotation.z += n.spin.z * dt;
                if (n.m.position.y < 0.38) { n.m.position.y = 0.38; n.vel.set(0, 0, 0); }
              }
            } else if (n.wob > 0) {
              n.wob = Math.max(0, n.wob - dt * 1.2);
              n.m.rotation.z = Math.sin(t * 30) * 0.25 * n.wob;
            }
          }
        },
        pointerMove(ptr, e) { const h = ctx.rayZ(Z); if (h) aimBase = new V3(G.clamp(h.x, -4, 4), G.clamp(h.y + lift(e), 0.8, 4.8), Z); },
        pointerDown(ptr, e) { const h = ctx.rayZ(Z); if (h) aimBase = new V3(G.clamp(h.x, -4, 4), G.clamp(h.y + lift(e), 0.8, 4.8), Z); if (!e || e.pointerType !== 'touch') throwBall(); },
        pointerUp(ptr, e) { if (e && e.pointerType === 'touch') throwBall(); },
      };
    },
  };

  // ======================================================================
  // 3. Tin Can Alley (Living Room, Tartan Blanket)
  // ======================================================================
  GAMES.cans = {
    title: 'Tin Can Alley', c1: '#2a7a8c', c2: '#f6ecd2', blurb: 'Knock the tins off the shelf.',
    params: (L) => ({ per: L(1, 2, 2), balls: L(4, 4, 3), px: L(1.7, 1.35, 1.1), py: L(1.5, 1.2, 0.95) }),
    unit: plural('can', 'cans'),
    goal: (p) => `A token for ${every(p.per, 'can', 'cans')} you knock off the shelf, up to 3 tokens. You get ${p.balls} balls.`,
    how: 'A line sweeps side to side: stop it to pick where across you throw. Then a second line sweeps up and down: stop it to pick the height. Hit the bottom row and the cans above come down too.',
    keys: 'Press <kbd>Space</kbd> or click twice: once to set across, once to set height.',
    touch: 'Tap twice: once to set across, once to set the height.',
    build(ctx) {
      const { scene, camera, p } = ctx;
      camera.position.set(0, 3.3, 8.6);
      camera.lookAt(0, 2.7, -3);
      scene.add(mesh(new THREE.PlaneGeometry(11, 5), G.mat('#ffffff', { map: G.tex.cloth('#1f3b5a') }), 0, 2.6, -4.6, false));
      const wood = G.mat('#ffffff', { map: G.tex.wood('#8a5a33') });
      const Z = -3.2;
      scene.add(mesh(box(4.6, 0.16, 1.0), wood, 0, 1.9, Z));
      scene.add(mesh(box(4.6, 1.82, 0.2), wood, 0, 0.91, Z - 0.4));
      const canM = G.shiny('#ffffff', { map: G.tex.can(), metalness: 0.5, roughness: 0.35 });
      const lidM = G.shiny('#c9d2d6', { metalness: 0.7, roughness: 0.3 });
      const layout = [[-0.64, 0], [0, 0], [0.64, 0], [-0.32, 1], [0.32, 1], [0, 2]];
      const cans = layout.map(([x, row]) => {
        const m = mesh(cyl(0.3, 0.3, 0.62, 20), [canM, lidM, lidM], x, 2.29 + row * 0.62, Z);
        m.rotation.y = G.rand(-0.4, 0.4);
        scene.add(m);
        return { m, row, x, standing: true, vel: new V3(), spin: new V3() };
      });
      const supports = { 3: [0, 1], 4: [1, 2], 5: [3, 4] };
      const lineM = G.glow('#ffffff', { transparent: true, opacity: 0.9, depthTest: false });
      const vLine = new THREE.Mesh(box(0.05, 2.6, 0.02), lineM);
      const hLine = new THREE.Mesh(box(3.6, 0.05, 0.02), lineM);
      [vLine, hLine].forEach((l) => { l.renderOrder = 20; scene.add(l); l.visible = false; });
      const ballM = G.shiny('#e0a526');
      let left = p.balls;
      let stage = 'x';
      let lockX = 0;
      let tStage = 0;
      let busy = false;
      const status = () => ctx.status(`Cans down <b>${cans.filter((c) => !c.standing).length}/6</b> · Balls left <b>${left}</b>`);
      status();
      const knock = (c, vx, strong) => {
        if (!c.standing) return;
        c.standing = false;
        c.vel.set(vx + G.rand(-0.5, 0.5), strong ? 2.6 : 0.8, strong ? -3.4 : -1.4);
        c.spin.set(G.rand(-8, 8), G.rand(-4, 4), G.rand(-8, 8));
      };
      const cascade = () => {
        let changed = true;
        while (changed) {
          changed = false;
          for (const [top, [a, b]] of Object.entries(supports)) {
            if (cans[top].standing && (!cans[a].standing || !cans[b].standing)) { knock(cans[top], G.rand(-0.6, 0.6), false); changed = true; }
          }
        }
      };
      const throwAt = async (x, y) => {
        busy = true;
        left--;
        status();
        const ball = mesh(sph(0.15, 14, 10), ballM, 0.9, 1.5, 6.2);
        scene.add(ball);
        ctx.sfx('throw');
        const target = new V3(x, y, Z + 0.35);
        await flyTo(ball, ball.position.clone(), target, 420, 0.5);
        let primary = null;
        let bestD = 9;
        for (const c of cans) {
          if (!c.standing) continue;
          const dx = Math.abs(x - c.m.position.x);
          const dy = Math.abs(y - c.m.position.y);
          if (dx < 0.44 && dy < 0.45 && dx + dy < bestD) { bestD = dx + dy; primary = c; }
        }
        if (primary) {
          ctx.sfx('clatter');
          knock(primary, (primary.m.position.x - x) * 3, true);
          for (const c of cans) if (c.standing && c.row === primary.row && Math.abs(c.m.position.x - primary.m.position.x) < 0.7 && Math.random() < 0.4) knock(c, Math.sign(c.m.position.x - x) * 1.5, true);
          cascade();
          ctx.float('Clang!', target.clone().add(new V3(0, 0.6, 0)), 'good');
          await flyTo(ball, target, new V3(x, 0.15, Z + 1.3), 380, 0.3);
        } else {
          ctx.sfx('thud');
          ctx.float('Missed', target.clone().add(new V3(0, 0.6, 0)), 'bad');
          await flyTo(ball, target, new V3(x, y, -4.5), 160, 0);
          await flyTo(ball, ball.position.clone(), new V3(x, 0.15, -4.3), 360, 0);
        }
        setTimeout(() => scene.remove(ball), 1400);
        status();
        await G.sleep(700);
        busy = false;
        const down = cans.filter((c) => !c.standing).length;
        ctx.score(down);
        if (ctx.full() || down === 6 || left <= 0) ctx.end();
        else { stage = 'x'; tStage = G.E.time; }
      };
      const press = () => {
        if (busy || !ctx.running()) return;
        if (stage === 'x') { lockX = vLine.position.x; stage = 'y'; tStage = G.E.time; ctx.sfx('tick'); } else if (stage === 'y') { stage = 'fly'; throwAt(lockX, hLine.position.y); }
      };
      return {
        start() { tStage = G.E.time; },
        always(dt, t) {
          for (const c of cans) {
            if (c.standing) continue;
            if (c.m.position.y > 0.3 || c.vel.lengthSq() > 0.01) {
              c.vel.y -= 9.8 * dt;
              c.m.position.addScaledVector(c.vel, dt);
              c.m.rotation.x += c.spin.x * dt;
              c.m.rotation.z += c.spin.z * dt;
              if (c.m.position.y < 0.3) { c.m.position.y = 0.3; c.vel.y *= -0.3; c.vel.x *= 0.6; c.vel.z *= 0.6; c.spin.multiplyScalar(0.6); if (Math.abs(c.vel.y) < 0.3) c.vel.set(0, 0, 0); }
            }
          }
          const run = ctx.running() && !busy;
          vLine.visible = run && (stage === 'x' || stage === 'y');
          hLine.visible = run && stage === 'y';
          const e = t - tStage;
          if (stage === 'x') vLine.position.set(-1.5 + 3 * G.tri(e, p.px), 2.9, Z + 0.4);
          else if (stage === 'y') { vLine.position.x = lockX; hLine.position.set(lockX, 1.95 + 1.95 * G.tri(e, p.py), Z + 0.42); }
          if (run) ctx.hint(stage === 'x' ? (G.isTouch ? 'Tap to stop the line and set <b>across</b>.' : 'Stop the line to set <b>across</b>: <kbd>Space</kbd> or click.') : (G.isTouch ? 'Now tap to set the <b>height</b>.' : 'Now stop the line to set the <b>height</b>.'));
        },
        keyDown(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); } },
        pointerDown() { press(); },
      };
    },
  };

  // ======================================================================
  // 4. Whack-a-Mole (Conservatory, Woolly Scarf)
  // ======================================================================
  GAMES.mole = {
    title: 'Whack-a-Mole', c1: '#6f7d32', c2: '#f6ecd2', cursor: 'none', blurb: 'Whack the moles, not the cat.',
    params: (L) => ({ per: L(3, 4, 4), up: L(1.05, 0.85, 0.66), gap: L([0.5, 0.85], [0.42, 0.72], [0.36, 0.6]), time: 20 }),
    unit: plural('mole', 'moles'),
    goal: (p) => `A token for every ${p.per} moles you whack, up to 3 tokens. You have ${p.time} seconds.`,
    how: "Moles pop up out of the holes. Whack them before they duck back down. If Tiddles the cat pops up, leave her alone: whacking the cat costs you a mole.",
    keys: 'Click the moles, or use <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd> / <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd> for the holes.',
    touch: 'Tap the moles as they pop up. Two thumbs work well.',
    build(ctx) {
      const { scene, camera, p } = ctx;
      camera.position.set(0, 6.4, 6.4);
      camera.lookAt(0, 1.1, -1.2);
      const felt = G.mat('#3f7d3a');
      const wood = G.mat('#8a5a33');
      scene.add(mesh(box(5.6, 1.2, 4.2), [wood, wood, felt, wood, wood, wood], 0, 0.6, -1.2));
      const KEYS = ['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'];
      const holes = [];
      const brown = G.mat('#7a4f2c');
      const pink = G.mat('#e0667a');
      const ginger = G.mat('#e0a526');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = (c - 1) * 1.7, z = -2.5 + r * 1.3;
        const hole = mesh(cyl(0.46, 0.46, 0.02, 24), G.mat('#140c07'), x, 1.205, z, false);
        scene.add(hole);
        const g = new THREE.Group();
        g.position.set(x, -0.15, z);
        const mole = new THREE.Group();
        mole.add(mesh(cyl(0.34, 0.36, 1.4, 16), brown, 0, 0, 0));
        mole.add(mesh(sph(0.34), brown, 0, 0.72, 0));
        [-1, 1].forEach((s) => mole.add(mesh(sph(0.05, 8, 6), G.mat('#2b1a10'), s * 0.13, 0.85, 0.28)));
        mole.add(mesh(sph(0.09, 10, 8), pink, 0, 0.72, 0.34));
        mole.add(mesh(box(0.12, 0.08, 0.04), G.mat('#ffffff'), 0, 0.58, 0.32));
        g.add(mole);
        const cat = new THREE.Group();
        cat.add(mesh(cyl(0.3, 0.3, 1.2, 14), ginger, 0, 0, 0));
        cat.add(mesh(sph(0.36), ginger, 0, 0.62, 0));
        [-1, 1].forEach((s) => { const e = mesh(new THREE.ConeGeometry(0.12, 0.26, 4), ginger, s * 0.2, 0.98, 0); cat.add(e); });
        [-1, 1].forEach((s) => cat.add(mesh(sph(0.05, 8, 6), G.mat('#3f7d3a'), s * 0.13, 0.7, 0.3)));
        cat.add(mesh(sph(0.05, 8, 6), pink, 0, 0.6, 0.35));
        g.add(cat);
        scene.add(g);
        const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.label(KEYS[r * 3 + c].toUpperCase(), { size: 44, bg: '#f6ecd2', fg: '#2b1a10' }), transparent: true }));
        lab.scale.set(0.42, 0.42, 1);
        lab.position.set(x + 0.62, 1.4, z + 0.42);
        if (!G.isTouch) scene.add(lab);
        holes.push({ g, mole, cat, x, z, active: false, type: 'mole', t0: 0, dur: 0, hit: false, y: -0.15 });
      }
      const mallet = new THREE.Group();
      const head = mesh(cyl(0.26, 0.26, 0.7, 16), G.mat('#b3261e'), 0, 0, 0);
      head.rotation.z = PI / 2;
      mallet.add(head);
      mallet.add(mesh(cyl(0.06, 0.06, 1.4, 8), G.mat('#e0a526'), 0, 0.7, 0));
      mallet.position.set(0, 2.6, -1);
      scene.add(mallet);
      let swing = 0;
      let score = 0;
      let nextSpawn = 0.4;
      let elapsed = 0;
      const status = () => ctx.status(`Moles whacked <b>${score}</b>`);
      status();
      ctx.timer(1);
      const whack = (i) => {
        if (!ctx.running()) return;
        const h = holes[i];
        mallet.position.set(h.x + 0.2, 2.3, h.z);
        swing = 1;
        if (!h.active || h.hit || h.y < 0.6) { ctx.sfx('bonk'); return; }
        h.hit = true;
        h.dur = Math.min(h.dur, elapsed - h.t0 + 0.05);
        if (h.type === 'mole') {
          score++;
          ctx.sfx('bonk');
          ctx.float('+1', new V3(h.x, 2.2, h.z), 'good');
        } else {
          score = Math.max(0, score - 1);
          ctx.sfx('meow');
          ctx.float('Not Tiddles!', new V3(h.x, 2.2, h.z), 'bad');
        }
        status();
        ctx.score(score);
        if (ctx.full()) setTimeout(() => ctx.end(), 350);
      };
      return {
        always(dt) {
          for (const h of holes) {
            let target = -0.15;
            if (h.active) {
              const age = elapsed - h.t0;
              if (age < h.dur) target = 1.1;
              else if (h.y <= -0.12) h.active = false;
            }
            h.y += (target - h.y) * Math.min(1, dt * (h.hit ? 20 : 16));
            h.g.position.y = h.y;
            h.g.scale.y = h.hit ? 0.7 : 1;
            h.mole.visible = h.type === 'mole';
            h.cat.visible = h.type === 'cat';
          }
          if (swing > 0) { swing = Math.max(0, swing - dt * 5); mallet.rotation.x = -Math.sin(swing * PI) * 1.1; }
        },
        update(dt, t, e) {
          elapsed = e;
          ctx.timer(1 - e / p.time);
          if (e >= p.time) { ctx.end(); return; }
          if (e >= nextSpawn) {
            const free = holes.filter((h) => !h.active);
            if (free.length) {
              const h = G.pick(free);
              h.active = true;
              h.hit = false;
              h.type = Math.random() < 0.15 ? 'cat' : 'mole';
              h.t0 = e;
              h.dur = p.up * G.rand(0.85, 1.15);
            }
            nextSpawn = e + G.rand(p.gap[0], p.gap[1]);
          }
        },
        pointerMove() {
          const hit = ctx.rayY(1.9);
          if (hit && swing === 0) mallet.position.set(G.clamp(hit.x, -2.8, 2.8) + 0.2, 2.6, G.clamp(hit.z, -3.4, 0.9));
        },
        pointerDown() {
          const hits = ctx.hits(holes.map((h) => h.g));
          let idx = -1;
          if (hits.length) idx = holes.findIndex((h) => { let o = hits[0].object; while (o) { if (o === h.g) return true; o = o.parent; } return false; });
          if (idx < 0) {
            const at = ctx.rayY(1.25);
            if (at) {
              let best = 9;
              holes.forEach((h, k) => { const d = Math.hypot(at.x - h.x, at.z - h.z); if (d < best && d < 0.7) { best = d; idx = k; } });
            }
          }
          if (idx >= 0) whack(idx); else { swing = 1; }
        },
        keyDown(e) {
          const i = KEYS.indexOf(e.key.toLowerCase());
          if (i >= 0 && !e.repeat) { e.preventDefault(); whack(i); }
        },
      };
    },
  };

  // ======================================================================
  // 5. Water Pistol Race (Bathroom, Hot Water Bottle)
  // ======================================================================
  GAMES.water = {
    title: 'Water Pistol Race', c1: '#3f8fa0', c2: '#f3efe4', cursor: 'none', blurb: 'Squirt the clown to pop your balloon.',
    params: (L) => ({ rival: L(11, 9, 7.8), fill: 6, r: L(0.62, 0.52, 0.44), mx: L(0.6, 0.95, 1.2), my: L(0.25, 0.4, 0.5) }),
    note: 'Pop your balloon first for all 3',
    goal: () => 'Pop your balloon first for 3 tokens. Lose the race and you still get a token for every third of your balloon you filled.',
    how: "Squirt water into the clown's mouth in the middle lane. The balloon above only fills while you're on target, and the clown keeps moving, so follow it.",
    keys: 'Move the mouse to aim. Hold the mouse button (or <kbd>Space</kbd>) to squirt.',
    touch: 'Hold your finger just below the clown to squirt, and follow it as it moves.',
    build(ctx) {
      const { scene, p } = ctx;
      const Z = -4.2;
      const lanes = [-3, 0, 3].map((x, k) => {
        const board = mesh(box(2.2, 3.2, 0.2), G.mat('#ffffff', { map: G.tex.stripes(k === 1 ? '#b3261e' : '#2a7a8c', '#f6ecd2', 6, true) }), x, 2.4, Z - 0.3);
        scene.add(board);
        const face = mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshLambertMaterial({ map: G.tex.target(true) }), x, 2.2, Z, false);
        scene.add(face);
        const bal = mesh(sph(1, 20, 16), G.shiny(['#2a9d8f', '#e8432f', '#8e6cc4'][k], { roughness: 0.25 }), x, 4.3, Z);
        bal.scale.setScalar(0.22);
        scene.add(bal);
        const str = mesh(cyl(0.01, 0.01, 1, 4), G.mat('#f6ecd2'), x, 3.6, Z, false);
        scene.add(str);
        const name = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.label(k === 1 ? 'YOU' : 'RIVAL', { size: 40, bg: k === 1 ? '#e0a526' : '#f6ecd2', fg: '#2b1a10' }), transparent: true }));
        name.scale.set(0.9, 0.34, 1);
        name.position.set(x, 0.9, Z + 0.2);
        scene.add(name);
        return { x, face, bal, str, fill: 0, speed: k === 1 ? 0 : 1 / (p.rival * G.rand(0.95, 1.08)) };
      });
      const me = lanes[1];
      const gun = new THREE.Group();
      gun.add(mesh(box(0.3, 0.38, 0.8), G.shiny('#e8612c'), 0, 0, 0));
      gun.add(mesh(box(0.22, 0.5, 0.25), G.shiny('#e8612c'), 0, -0.35, -0.22));
      const barrel = mesh(cyl(0.06, 0.06, 0.8, 10), G.shiny('#f2c230'), 0, 0.08, 0.7);
      barrel.rotation.x = PI / 2;
      gun.add(barrel);
      gun.add(mesh(sph(0.17), G.shiny('#3f8fa0', { transparent: true, opacity: 0.8 }), 0, 0.3, -0.1));
      gun.position.set(1.9, 1.35, 5.4);
      scene.add(gun);
      const drops = [];
      const dropM = G.glow('#9fd8f0', { transparent: true, opacity: 0.85 });
      for (let k = 0; k < 18; k++) { const d = mesh(sph(0.05, 6, 4), dropM, 0, -5, 0, false); scene.add(d); drops.push(d); }
      const cross = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 24), G.glow('#ffffff', { depthTest: false, transparent: true }));
      cross.renderOrder = 20;
      scene.add(cross);
      let aim = new V3(0, 2.2, Z);
      let spaceDown = false;
      let lastSq = 0;
      let over = false;
      const burst = (lane) => {
        ctx.sfx('pop');
        lane.bal.visible = false;
        lane.str.visible = false;
        const bits = [];
        for (let k = 0; k < 14; k++) {
          const b = mesh(sph(0.06, 6, 4), lane.bal.material, lane.bal.position.x, lane.bal.position.y, Z, false);
          b.userData.v = new V3(G.rand(-3, 3), G.rand(-1, 4), G.rand(-1, 2));
          scene.add(b);
          bits.push(b);
        }
        G.tween(900, () => bits.forEach((b) => { b.userData.v.y -= 0.25; b.position.addScaledVector(b.userData.v, 0.016); }), G.ease.linear).then(() => bits.forEach((b) => scene.remove(b)));
      };
      ctx.status('Your balloon <b>0%</b>');
      return {
        always(dt, t) {
          const run = ctx.running();
          me.face.position.x = me.x + Math.sin(t * 0.9) * p.mx + Math.sin(t * 2.1) * p.mx * 0.25;
          me.face.position.y = 2.2 + Math.sin(t * 1.3) * p.my;
          lanes.forEach((l, k) => {
            if (k !== 1) l.face.position.y = 2.2 + Math.sin(t * 1.1 + k) * 0.2;
            const s = 0.22 + l.fill * 0.75;
            l.bal.scale.setScalar(s);
            l.bal.position.set(l.face.position.x, 3.55 + 0.35 + s * 0.9, Z);
            l.str.position.set(l.face.position.x, (2.9 + l.bal.position.y - s) / 2, Z);
            l.str.scale.y = Math.max(0.1, l.bal.position.y - s - 2.9);
          });
          cross.position.set(aim.x, aim.y, Z + 0.3);
          cross.visible = run;
          const squirting = run && (G.ptr.down || spaceDown);
          const nozzle = gun.localToWorld(new V3(0, 0.08, 1.12));
          gun.lookAt(aim);
          drops.forEach((d, k) => {
            if (!squirting) { d.visible = false; return; }
            d.visible = true;
            const ph = (t * 2.4 + k / drops.length) % 1;
            d.position.lerpVectors(nozzle, aim, ph);
            d.position.y += Math.sin(ph * PI) * 0.5;
          });
          if (!run || over) return;
          const onTarget = Math.hypot(aim.x - me.face.position.x, aim.y - me.face.position.y) < p.r;
          if (squirting) {
            if (t - lastSq > 0.12) { lastSq = t; ctx.sfx('squirt'); }
            if (onTarget) me.fill = Math.min(1, me.fill + dt / p.fill);
          }
          lanes.forEach((l, k) => { if (k !== 1) l.fill = Math.min(1, l.fill + dt * l.speed * G.rand(0.7, 1.3)); });
          cross.material.color.set(onTarget ? '#7ee07e' : '#ffffff');
          ctx.status(`Your balloon <b>${Math.round(me.fill * 100)}%</b> · Rivals <b>${Math.round(lanes[0].fill * 100)}%</b> and <b>${Math.round(lanes[2].fill * 100)}%</b>`);
          ctx.tokens(me.fill >= 1 ? 3 : Math.floor(me.fill * 3), 'Pop your balloon first for all 3');
          const popped = lanes.find((l) => l.fill >= 1);
          if (popped) {
            over = true;
            burst(popped);
            ctx.float(popped === me ? 'POP! You win!' : 'POP! Too slow...', popped.bal.position.clone(), popped === me ? 'good' : 'bad');
            setTimeout(() => ctx.end(popped === me ? 3 : Math.min(2, Math.floor(me.fill * 3))), 500);
          }
        },
        pointerMove(ptr, e) { const h = ctx.rayZ(Z); if (h) aim = new V3(G.clamp(h.x, -4.5, 4.5), G.clamp(h.y + lift(e), 0.6, 4.6), Z); },
        pointerDown(ptr, e) { const h = ctx.rayZ(Z); if (h) aim = new V3(G.clamp(h.x, -4.5, 4.5), G.clamp(h.y + lift(e), 0.6, 4.6), Z); },
        keyDown(e) { if (e.key === ' ') { e.preventDefault(); spaceDown = true; } },
        keyUp(e) { if (e.key === ' ') spaceDown = false; },
      };
    },
  };

  // ======================================================================
  // 6. Hoopla (Bedroom, Cardigan)
  // ======================================================================
  GAMES.hoopla = {
    title: 'Hoopla', c1: '#c9648c', c2: '#f6ecd2', blurb: 'Throw rings over the pegs.',
    // rise: seconds for the landing target to slide from the front of the table to the back
    params: (L) => ({ per: 1, rings: L(6, 5, 5), pegR: L(0.32, 0.26, 0.24), scatter: L(0.04, 0.06, 0.08), rise: L(1.6, 1.2, 1.0) }),
    unit: plural('ringer', 'ringers'),
    goal: (p) => `A token for every ring you land over a peg, up to 3 tokens. You get ${p.rings} rings.`,
    how: 'Move left and right to line up with a peg. Hold the button down and a target slides across the table showing where your ring will land. Let go when it lights up over a peg.',
    keys: 'Mouse (or <kbd>←</kbd> <kbd>→</kbd>) to aim. Hold the mouse button (or <kbd>Space</kbd>) and let go when the target is over a peg.',
    touch: 'Slide left or right to aim, hold, and let go when the target lights up over a peg.',
    build(ctx) {
      const { scene, camera, p } = ctx;
      camera.position.set(0, 4.8, 8.2);
      camera.lookAt(0, 1.2, -2.2);
      const cloth = G.mat('#ffffff', { map: G.tex.cloth('#8a1f1a') });
      const wood = G.mat('#6b3f22');
      scene.add(mesh(box(6.2, 0.9, 5.8), [wood, wood, cloth, wood, wood, wood], 0, 0.45, -2.4));
      const cols = ['#e0a526', '#2a9d8f', '#8e6cc4', '#e8432f', '#3f8fa0', '#9bb040', '#c9648c', '#e08a2e', '#f6ecd2'];
      const pegs = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = (c - 1) * 1.7, z = -4.3 + r * 1.5;
        scene.add(mesh(box(0.55, 0.3, 0.55), G.mat(cols[r * 3 + c]), x, 1.05, z));
        scene.add(mesh(cyl(0.07, 0.07, 0.55, 8), G.mat('#f6ecd2'), x, 1.47, z));
        pegs.push({ x, z });
      }
      const aimLine = new THREE.Mesh(box(0.05, 0.02, 5.4), G.glow('#ffffff', { transparent: true, opacity: 0.5 }));
      aimLine.position.set(0, 0.92, -2.4);
      scene.add(aimLine);
      // where the ring will land: slides away from you while you hold, and lights up over a peg
      const markM = G.glow('#f6ecd2', { transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const marker = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 32), markM);
      marker.rotation.x = -PI / 2;
      marker.visible = false;
      scene.add(marker);
      const landZ = (pw) => 0.6 - pw * 5.6;
      const pegUnder = (x, z) => pegs.find((pg) => Math.hypot(x - pg.x, z - pg.z) < p.pegR);
      // timed from the real clock, so a slow frame rate doesn't throw your timing off
      const now = () => performance.now() / 1000;
      const powerAt = () => G.tri(now() - chargeT0, p.rise * 2);
      const ringM = [G.shiny('#f2c230'), G.shiny('#2a9d8f'), G.shiny('#e8432f')];
      let aimX = 0;
      let charging = false;
      let chargeT0 = 0;
      let power = 0;
      let left = p.rings;
      let ringers = 0;
      let flying = false;
      ctx.power.show(true, 'Throw power');
      ctx.power.zone(null);
      const status = () => ctx.status(`Ringers <b>${ringers}</b> · Rings left <b>${left}</b>`);
      status();
      const release = async () => {
        if (!charging) return;
        charging = false;
        if (flying || left <= 0 || !ctx.running()) return;
        flying = true;
        left--;
        status();
        const pw = powerAt();
        power = pw;
        marker.visible = false;
        const land = new V3(aimX + G.rand(-1, 1) * p.scatter * 2, 0.92, landZ(pw) + G.rand(-1, 1) * p.scatter * 1.5);
        const ring = mesh(new THREE.TorusGeometry(0.36, 0.055, 8, 24), ringM[left % 3], 0, 2.2, 5);
        scene.add(ring);
        ctx.sfx('throw');
        const from = ring.position.clone();
        await G.tween(700, (t) => {
          ring.position.lerpVectors(from, land, t);
          ring.position.y += Math.sin(t * PI) * 2.2 + 0.2 * (1 - t);
          ring.rotation.set(PI / 2 + Math.sin(t * 12) * 0.2, t * 14, 0);
        }, G.ease.linear);
        let best = null;
        let bestD = 9;
        for (const pg of pegs) { const d = Math.hypot(land.x - pg.x, land.z - pg.z); if (d < bestD) { bestD = d; best = pg; } }
        if (best && bestD < p.pegR) {
          ringers++;
          ctx.score(ringers);
          ctx.sfx('ding');
          ctx.float('Ringer!', new V3(best.x, 2.4, best.z), 'good');
          await G.tween(300, (t) => { ring.position.set(G.lerp(land.x, best.x, t), G.lerp(1.8, 1.25, t), G.lerp(land.z, best.z, t)); ring.rotation.set(PI / 2, 0, 0); });
        } else if (best && bestD < p.pegR + 0.4) {
          ctx.sfx('clatter');
          ctx.float('Bounced off!', new V3(best.x, 2.4, best.z), 'bad');
          const dir = new V3(land.x - best.x, 0, land.z - best.z).normalize();
          const a = ring.position.clone();
          const b = new V3(best.x + dir.x * 0.75, 0.95, best.z + dir.z * 0.75);
          await G.tween(350, (t) => { ring.position.lerpVectors(a, b, t); ring.position.y = 0.95 + Math.sin(t * PI) * 0.6; ring.rotation.set(PI / 2, 0, t * 2); });
        } else {
          ctx.sfx('thud');
          ring.position.y = 0.95;
          ring.rotation.set(PI / 2, 0, 0);
        }
        status();
        flying = false;
        if (ctx.full()) setTimeout(() => ctx.end(), 500);
        else if (left <= 0) setTimeout(() => ctx.end(), 600);
      };
      const press = () => { if (!flying && left > 0 && ctx.running()) { charging = true; chargeT0 = now(); } };
      return {
        always(dt, t) {
          aimLine.position.x = aimX;
          if (charging) power = powerAt();
          else if (!flying) power = 0;
          ctx.power.set(power);
          marker.visible = charging;
          if (charging) {
            const z = landZ(power);
            marker.position.set(aimX, 0.935, z);
            const over = pegUnder(aimX, z);
            markM.color.set(over ? '#7ee07e' : '#f6ecd2');
            marker.scale.setScalar(over ? 1.12 : 1);
          }
        },
        pointerMove() { const h = ctx.rayY(0.92); if (h) aimX = G.clamp(h.x, -2.6, 2.6); },
        pointerDown() { const h = ctx.rayY(0.92); if (h) aimX = G.clamp(h.x, -2.6, 2.6); press(); },
        pointerUp() { release(); },
        keyDown(e) { if (e.key === ' ') { e.preventDefault(); if (!e.repeat) press(); } if (e.key === 'ArrowLeft') aimX = G.clamp(aimX - 0.2, -2.6, 2.6); if (e.key === 'ArrowRight') aimX = G.clamp(aimX + 0.2, -2.6, 2.6); },
        keyUp(e) { if (e.key === ' ') release(); },
      };
    },
  };

  // ======================================================================
  // 7. Shooting Gallery (Loft, Bobble Hat)
  // ======================================================================
  GAMES.gallery = {
    title: 'Shooting Gallery', c1: '#8a7452', c2: '#f6ecd2', cursor: 'crosshair', blurb: 'Fire corks at the tin ducks.',
    params: (L) => ({ per: L(2, 3, 4), corks: L(12, 14, 16), sp: L([1.2, 1.6], [1.5, 2.0], [1.8, 2.4]), time: L(30, 30, 34) }),
    unit: plural('point', 'points'),
    goal: (p) => `A token for every ${p.per} points, up to 3 tokens. Gold ducks score 2. You have ${p.corks} corks and ${p.time} seconds.`,
    how: 'Tin ducks sail along two rows. Click to fire a cork at them. Every cork counts, so pick your shots.',
    keys: 'Move the mouse to aim, click to fire.',
    touch: 'Tap the ducks to fire.',
    build(ctx) {
      const { scene, p } = ctx;
      const Z = -4.1;
      scene.add(mesh(new THREE.PlaneGeometry(11, 4.5), G.mat('#1f3b5a'), 0, 2.6, -4.6, false));
      const shape = new THREE.Shape();
      shape.absellipse(0, 0, 0.42, 0.26, 0, PI * 2, false, 0);
      const headS = new THREE.Shape();
      headS.absarc(0.3, 0.32, 0.17, 0, PI * 2, false);
      const beakS = new THREE.Shape();
      beakS.moveTo(0.44, 0.34); beakS.lineTo(0.64, 0.3); beakS.lineTo(0.44, 0.26); beakS.lineTo(0.44, 0.34);
      const opts = { depth: 0.06, bevelEnabled: false };
      const geos = [new THREE.ExtrudeGeometry(shape, opts), new THREE.ExtrudeGeometry(headS, opts), new THREE.ExtrudeGeometry(beakS, opts)];
      const silver = G.shiny('#c9d2d6', { metalness: 0.6, roughness: 0.35 });
      const gold = G.shiny('#e0a526', { metalness: 0.6, roughness: 0.3 });
      const beakM = G.mat('#e8612c');
      const rows = [{ y: 2.0, dir: 1, sp: p.sp[0], z: Z }, { y: 3.25, dir: -1, sp: p.sp[1], z: Z - 0.1 }];
      rows.forEach((r) => {
        scene.add(mesh(box(11, 0.5, 0.3), G.mat('#3f2a1a'), 0, r.y - 0.45, r.z + 0.25));
        for (let x = -5.5; x <= 5.5; x += 0.6) { const w = mesh(cyl(0.3, 0.3, 0.3, 12, false, 0, PI), G.mat('#3f8fa0'), x, r.y - 0.25, r.z + 0.35); w.rotation.set(PI / 2, 0, PI / 2); scene.add(w); }
      });
      const ducks = [];
      rows.forEach((r, ri) => {
        for (let k = 0; k < 6; k++) {
          const g = new THREE.Group();
          const isGold = Math.random() < 0.22;
          const m = isGold ? gold : silver;
          g.add(new THREE.Mesh(geos[0], m), new THREE.Mesh(geos[1], m), new THREE.Mesh(geos[2], beakM));
          g.children.forEach((c) => { c.castShadow = true; });
          const pivot = new THREE.Group();
          pivot.add(g);
          g.position.y = 0.3;
          pivot.position.set(-5.5 + k * 1.9 + ri * 0.9, r.y - 0.3, r.z);
          if (r.dir < 0) g.scale.x = -1;
          scene.add(pivot);
          ducks.push({ pivot, g, row: r, gold: isGold, down: false, flip: 0 });
        }
      });
      const gun = new THREE.Group();
      const barrel = mesh(cyl(0.1, 0.08, 1.6, 12), G.shiny('#4a2a15'), 0, 0, 0.8);
      barrel.rotation.x = PI / 2;
      gun.add(barrel);
      gun.add(mesh(box(0.3, 0.3, 0.8), G.shiny('#8a5a33'), 0, -0.1, -0.1));
      gun.position.set(0, 1.25, 6.4);
      scene.add(gun);
      const cross = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 24), G.glow('#ffffff', { depthTest: false, transparent: true }));
      cross.renderOrder = 20;
      scene.add(cross);
      let aim = new V3(0, 2.6, Z);
      let corks = p.corks;
      let score = 0;
      let ending = false;
      const status = () => ctx.status(`Points <b>${score}</b> · Corks <b>${corks}</b>`);
      status();
      ctx.timer(1);
      const fire = () => {
        if (!ctx.running() || corks <= 0 || ending) return;
        corks--;
        ctx.sfx('cork');
        const hits = ctx.hits(ducks.filter((d) => !d.down).map((d) => d.pivot));
        const cork = mesh(cyl(0.05, 0.06, 0.14, 8), G.mat('#d8b37a'), 0, 0, 0, false);
        scene.add(cork);
        const from = gun.localToWorld(new V3(0, 0, 1.6));
        const to = hits.length ? hits[0].point : aim.clone().add(new V3(0, 0, -0.5));
        G.tween(140, (t) => cork.position.lerpVectors(from, to, t), G.ease.linear).then(() => scene.remove(cork));
        if (hits.length) {
          const d = ducks.find((q) => { let o = hits[0].object; while (o) { if (o === q.pivot) return true; o = o.parent; } return false; });
          if (d && !d.down) {
            d.down = true;
            score += d.gold ? 2 : 1;
            ctx.score(score);
            ctx.sfx('clatter');
            ctx.float(d.gold ? '+2' : '+1', hits[0].point.clone().add(new V3(0, 0.5, 0)), 'good');
          }
        }
        status();
        if (ctx.full()) { ending = true; setTimeout(() => ctx.end(), 500); } else if (corks <= 0) { ending = true; setTimeout(() => ctx.end(), 700); }
      };
      return {
        always(dt) {
          for (const d of ducks) {
            d.pivot.position.x += d.row.dir * d.row.sp * dt;
            if (d.pivot.position.x > 6) { d.pivot.position.x -= 12; d.down = false; }
            if (d.pivot.position.x < -6) { d.pivot.position.x += 12; d.down = false; }
            d.flip += ((d.down ? 1 : 0) - d.flip) * Math.min(1, dt * 12);
            d.pivot.rotation.x = -d.flip * PI * 0.5;
          }
          cross.position.set(aim.x, aim.y, Z + 0.6);
          cross.visible = ctx.running();
          gun.lookAt(aim);
        },
        update(dt, t, e) {
          ctx.timer(1 - e / p.time);
          if (e >= p.time && !ending) { ending = true; ctx.end(); }
        },
        pointerMove() { const h = ctx.rayZ(Z); if (h) aim = new V3(G.clamp(h.x, -5, 5), G.clamp(h.y, 0.8, 4.6), Z); },
        pointerDown() { const h = ctx.rayZ(Z); if (h) aim = new V3(G.clamp(h.x, -5, 5), G.clamp(h.y, 0.8, 4.6), Z); fire(); },
      };
    },
  };

  // ======================================================================
  // 8. Test Your Strength (Garden Shed, Logs)
  // ======================================================================
  GAMES.strength = {
    title: 'Test Your Strength', c1: '#4a6b3a', c2: '#f6ecd2', blurb: 'Swing the hammer, ring the bell.',
    params: (L) => ({ per: 1, swings: L(4, 4, 4), period: L(1.15, 0.95, 0.8), ring: L(0.85, 0.9, 0.92) }),
    unit: plural('ring of the bell', 'rings of the bell'),
    goal: (p) => `A token every time you ring the bell, up to 3 tokens. You get ${p.swings} swings.`,
    how: 'The power needle races back and forth. Swing the hammer when it is in the red zone at the far end, and the puck will fly all the way up to the bell.',
    keys: 'Press <kbd>Space</kbd> or click to swing the hammer.',
    touch: 'Tap to swing the hammer.',
    build(ctx) {
      const { scene, camera, p, booth } = ctx;
      camera.position.set(0, 3.9, 10.6);
      camera.lookAt(0, 3.7, -3.4);
      // this one stands in the open air
      openAir(booth);
      booth.sign.visible = false;
      const Z = -3.4;
      const face = G.mat('#ffffff', { map: G.tex.striker() });
      const wood = G.mat('#8a5a33');
      scene.add(mesh(box(1.0, 7, 0.2), [wood, wood, wood, wood, face, wood], 0, 3.7, Z));
      scene.add(mesh(cyl(0.05, 0.05, 6.8, 8), G.shiny('#c9d2d6', { metalness: 0.8 }), 0, 3.7, Z + 0.22));
      const bell = mesh(new THREE.SphereGeometry(0.45, 20, 12, 0, PI * 2, 0, PI / 2), G.shiny('#e0a526', { metalness: 0.3, roughness: 0.35, emissive: '#3a2400', side: THREE.DoubleSide }), 0, 7.3, Z + 0.2);
      scene.add(bell);
      const bellGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.skyGlow(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      bellGlow.scale.setScalar(3.5);
      bellGlow.position.set(0, 7.4, Z + 0.3);
      scene.add(bellGlow);
      const puck = mesh(box(0.42, 0.22, 0.3), G.shiny('#b3261e'), 0, 0.55, Z + 0.25);
      scene.add(puck);
      scene.add(mesh(box(1.2, 0.3, 1.0), G.mat('#4a2a15'), 0, 0.15, Z + 0.9));
      const pad = mesh(box(0.8, 0.12, 0.7), G.shiny('#b3261e'), 0, 0.36, Z + 0.95);
      scene.add(pad);
      const hammer = new THREE.Group();
      hammer.position.set(2.1, 0.9, Z + 1.0);
      const handle = mesh(cyl(0.07, 0.08, 2.4, 8), G.mat('#e0a526'), -1.2, 0, 0);
      handle.rotation.z = PI / 2;
      hammer.add(handle);
      const hh = mesh(cyl(0.3, 0.3, 0.8, 16), G.mat('#4a2a15'), -2.2, 0, 0);
      hammer.add(hh);
      scene.add(hammer);
      const UP = -1.3;
      hammer.rotation.z = UP;
      const bottom = 0.55, topY = 7.0;
      let left = p.swings;
      let dings = 0;
      let busy = false;
      let t0 = 0;
      ctx.power.show(true, 'Power');
      ctx.power.zone(p.ring, 1);
      const status = () => ctx.status(`Bells rung <b>${dings}</b> · Swings left <b>${left}</b>`);
      status();
      const swing = async () => {
        if (busy || left <= 0 || !ctx.running()) return;
        busy = true;
        left--;
        status();
        const pw = G.tri(G.E.time - t0, p.period);
        ctx.power.set(pw);
        await G.tween(170, (t) => { hammer.rotation.z = G.lerp(UP, 0.12, t); }, G.ease.in);
        ctx.sfx('strike');
        const h = G.clamp(pw + G.rand(-0.015, 0.015), 0, 1);
        const rings = h >= p.ring;
        const peak = rings ? topY : bottom + (topY - bottom - 0.4) * h;
        G.tween(400, (t) => { hammer.rotation.z = G.lerp(0.12, UP, t); });
        await G.tween(650, (t) => { puck.position.y = G.lerp(bottom, peak, t); }, G.ease.out);
        if (rings) {
          dings++;
          ctx.score(dings);
          status();
          ctx.sfx('ding');
          ctx.float('DING!', new V3(0, 7.2, Z + 0.4), 'good');
          G.tween(1200, (t) => { bellGlow.material.opacity = Math.sin(t * PI) * 0.9; bell.rotation.z = Math.sin(t * PI * 8) * 0.12 * (1 - t); });
        } else {
          const names = ['WEAKLING', 'CUSTARD CREAM', 'CARDIGAN', 'LUMBERJACK', 'STRONGMAN'];
          ctx.float(names[Math.min(4, Math.floor(h * 5.5))], new V3(0.9, peak + 0.3, Z + 0.4), 'bad');
          ctx.sfx('wobble');
        }
        await G.tween(700, (t) => { puck.position.y = G.lerp(peak, bottom, t); }, G.ease.in);
        busy = false;
        t0 = G.E.time;
        if (ctx.full() || left <= 0) ctx.end();
      };
      return {
        start() { t0 = G.E.time; },
        always(dt, t) { if (ctx.running() && !busy) ctx.power.set(G.tri(t - t0, p.period)); },
        keyDown(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) swing(); } },
        pointerDown() { swing(); },
      };
    },
  };
  // ======================================================================
  // 9. Dodgems
  // ======================================================================
  GAMES.dodgems = {
    title: 'Dodgems', c1: '#8e6cc4', c2: '#f6ecd2', blurb: 'Drive your car and bump the others.',
    params: (L) => ({ per: L(1, 2, 4), time: L(20, 25, 35), rival: L(1.6, 2.1, 2.6), speed: 4.4 }),
    unit: plural('bump', 'bumps'),
    goal: (p) => `A token for ${every(p.per, 'bump', 'bumps')} you give the other cars, up to 3 tokens. You have ${p.time} seconds.`,
    how: "Your car is the red one. It drives towards wherever you point, so steer it into the other cars. They'll try to get out of your way, and a car needs a moment to recover before you can bump it again.",
    keys: 'Point with the mouse to steer, or drive with the arrow keys.',
    touch: 'Touch where you want your car to go.',
    build(ctx) {
      const { scene, camera, p, booth } = ctx;
      openAir(booth);
      camera.position.set(0, 10.5, 7.2);
      camera.lookAt(0, 0, -2.2);
      const X0 = -4.6, X1 = 4.6, Z0 = -5.0, Z1 = 0.8;
      const fc = document.createElement('canvas');
      fc.width = fc.height = 256;
      const fx = fc.getContext('2d');
      fx.fillStyle = '#3b4250'; fx.fillRect(0, 0, 256, 256);
      fx.strokeStyle = 'rgba(255,255,255,.1)'; fx.lineWidth = 3;
      for (let k = 0; k <= 256; k += 32) { fx.beginPath(); fx.moveTo(k, 0); fx.lineTo(k, 256); fx.moveTo(0, k); fx.lineTo(256, k); fx.stroke(); }
      const ft = new THREE.CanvasTexture(fc);
      ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
      ft.repeat.set(4, 3);
      const floor = mesh(new THREE.PlaneGeometry(X1 - X0 + 1.4, Z1 - Z0 + 1.4), new THREE.MeshLambertMaterial({ map: ft }), 0, 0.03, (Z0 + Z1) / 2, false);
      floor.rotation.x = -PI / 2;
      scene.add(floor);
      const tyreM = G.mat('#ffffff', { map: G.tex.stripes('#2b1a10', '#e0a526', 16, true, [6, 1]) });
      const W = X1 - X0 + 2, D = Z1 - Z0 + 2, cz = (Z0 + Z1) / 2;
      scene.add(mesh(box(W, 0.45, 0.3), tyreM, 0, 0.22, Z0 - 0.85));
      scene.add(mesh(box(W, 0.45, 0.3), tyreM, 0, 0.22, Z1 + 0.85));
      scene.add(mesh(box(0.3, 0.45, D), tyreM, X0 - 0.85, 0.22, cz));
      scene.add(mesh(box(0.3, 0.45, D), tyreM, X1 + 0.85, 0.22, cz));
      const makeCar = (color) => {
        const g = new THREE.Group();
        g.add(mesh(box(1.1, 0.4, 0.8), G.shiny(color), 0, 0.38, 0));
        const bump = mesh(new THREE.TorusGeometry(0.6, 0.12, 8, 24), G.mat('#1a1a1a'), 0, 0.2, 0);
        bump.rotation.x = PI / 2;
        bump.scale.set(1, 0.72, 1);
        g.add(bump);
        g.add(mesh(box(0.3, 0.4, 0.6), G.mat('#2b1a10'), -0.25, 0.75, 0));
        g.add(mesh(cyl(0.025, 0.025, 1.8, 6), G.mat('#c9d2d6'), -0.4, 1.4, 0));
        const spark = mesh(sph(0.09, 8, 6), G.glow('#9fd8ff'), -0.4, 2.32, 0, false);
        g.add(spark);
        g.userData.spark = spark;
        scene.add(g);
        return g;
      };
      const me = { g: makeCar('#e8432f'), x: 0, z: Z1 - 0.6, a: -PI / 2, v: 0 };
      const you = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.label('YOU', { size: 40, bg: '#e0a526', fg: '#2b1a10' }), transparent: true, depthTest: false }));
      you.scale.set(0.9, 0.34, 1);
      you.renderOrder = 10;
      scene.add(you);
      const rivals = ['#2a9d8f', '#f2c230', '#3f8fa0', '#9bb040', '#c9648c'].map((c, k) => ({
        g: makeCar(c), x: X0 + 1 + k * 1.8, z: G.rand(Z0 + 0.4, Z0 + 2.6), a: Math.random() * PI * 2, cool: 0, kx: 0, kz: 0, spin: 0,
      }));
      const keys = {};
      let target = null;
      let score = 0;
      const status = () => ctx.status(`Bumps <b>${score}</b>`);
      status();
      ctx.timer(1);
      const turn = (c, want, rate, dt) => { const d = Math.atan2(Math.sin(want - c.a), Math.cos(want - c.a)); c.a += G.clamp(d, -rate * dt, rate * dt); };
      const wall = (c) => {
        let hit = false;
        if (c.x < X0) { c.x = X0; c.a = PI - c.a; hit = true; }
        if (c.x > X1) { c.x = X1; c.a = PI - c.a; hit = true; }
        if (c.z < Z0) { c.z = Z0; c.a = -c.a; hit = true; }
        if (c.z > Z1) { c.z = Z1; c.a = -c.a; hit = true; }
        return hit;
      };
      const place = (c) => { c.g.position.set(c.x, 0, c.z); c.g.rotation.y = -c.a + (c.spin || 0); };
      const KEYMAP = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', a: 'l', d: 'r', w: 'u', s: 'd' };
      return {
        always(dt, t) {
          [me, ...rivals].forEach((c) => { place(c); c.g.userData.spark.visible = Math.random() > 0.35; });
          you.position.set(me.x, 1.1, me.z + 0.95);
          void t;
        },
        update(dt, t, e) {
          ctx.timer(1 - e / p.time);
          if (e >= p.time) { ctx.end(); return; }
          const kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
          const kz = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
          if (kx || kz) {
            turn(me, Math.atan2(kz, kx), 4.2, dt);
            me.v += (p.speed - me.v) * Math.min(1, dt * 3);
          } else if (target) {
            const dx = target.x - me.x, dz = target.z - me.z, dist = Math.hypot(dx, dz);
            if (dist > 0.7) { turn(me, Math.atan2(dz, dx), 3.8, dt); me.v += (p.speed * Math.min(1, dist / 2) - me.v) * Math.min(1, dt * 3); } else me.v *= Math.max(0, 1 - dt * 4);
          } else me.v *= Math.max(0, 1 - dt * 3);
          me.x += Math.cos(me.a) * me.v * dt;
          me.z += Math.sin(me.a) * me.v * dt;
          if (wall(me)) me.v *= 0.5;
          for (const r of rivals) {
            r.cool = Math.max(0, r.cool - dt);
            const dx = r.x - me.x, dz = r.z - me.z;
            if (Math.hypot(dx, dz) < 3.2 && r.cool <= 0) turn(r, Math.atan2(dz, dx) + Math.sin(t * 2 + r.x) * 0.7, 2.3, dt);
            else r.a += Math.sin(t * 0.7 + r.z * 3) * dt * 1.3;
            const sp = r.cool > 0 ? p.rival * 0.4 : p.rival;
            r.x += Math.cos(r.a) * sp * dt + r.kx * dt;
            r.z += Math.sin(r.a) * sp * dt + r.kz * dt;
            const damp = Math.max(0, 1 - dt * 3);
            r.kx *= damp; r.kz *= damp;
            r.spin *= Math.max(0, 1 - dt * 2);
            wall(r);
            const d = Math.hypot(r.x - me.x, r.z - me.z);
            if (d < 1.2) {
              const nx = (r.x - me.x) / (d || 1), nz = (r.z - me.z) / (d || 1);
              const push = (1.2 - d) / 2;
              r.x += nx * push; r.z += nz * push; me.x -= nx * push; me.z -= nz * push;
              if (r.cool <= 0 && me.v > 1.2) {
                score++;
                r.cool = 1.8;
                r.kx = nx * 4; r.kz = nz * 4; r.spin = PI * 2;
                me.v *= 0.35;
                ctx.sfx('bonk'); ctx.sfx('thud');
                ctx.float('BUMP!', r.g.position.clone().add(new V3(0, 1.8, 0)), 'good');
                status();
                ctx.score(score);
                if (ctx.full()) setTimeout(() => ctx.end(), 400);
              }
            }
          }
          for (let i = 0; i < rivals.length; i++) for (let j = i + 1; j < rivals.length; j++) {
            const a = rivals[i], b = rivals[j];
            const d = Math.hypot(a.x - b.x, a.z - b.z);
            if (d < 1.2 && d > 0) { const nx = (b.x - a.x) / d, nz = (b.z - a.z) / d, push = (1.2 - d) / 2; a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push; a.a = Math.atan2(-nz, -nx); b.a = Math.atan2(nz, nx); }
          }
        },
        pointerMove() { const h = ctx.rayY(0); if (h) target = { x: h.x, z: h.z }; },
        pointerDown() { const h = ctx.rayY(0); if (h) target = { x: h.x, z: h.z }; },
        keyDown(e) { const k = KEYMAP[e.key]; if (k) { e.preventDefault(); keys[k] = true; } },
        keyUp(e) { const k = KEYMAP[e.key]; if (k) keys[k] = false; },
      };
    },
  };

  // ======================================================================
  // 10. Candy Floss
  // ======================================================================
  GAMES.floss = {
    title: 'Candy Floss', c1: '#e0667a', c2: '#f6ecd2', blurb: 'Spin the floss at a steady speed.',
    params: (L) => ({ time: L(24, 20, 17), fill: L(8, 10, 11), lo: L(0.8, 1.0, 1.2), hi: L(2.9, 2.5, 2.2) }),
    note: 'Fill the whole stick for all 3',
    goal: (p) => `A token for every third of a stick of candy floss you spin, and 3 for a full stick. You have ${p.time} seconds.`,
    how: "Move the mouse round and round the machine to spin it. Keep the speed in the green: too slow and the sugar won't stick, too fast and the floss flies off the stick.",
    keys: 'Circle the mouse round the machine, or tap <kbd>←</kbd> and <kbd>→</kbd> one after the other.',
    touch: 'Draw circles round the machine with your finger, at a steady speed.',
    build(ctx) {
      const { scene, camera, p } = ctx;
      camera.position.set(0, 6.6, 6.4);
      camera.lookAt(0, 1.6, -1.2);
      const C = new V3(0, 0, -1.2);
      const cartM = G.mat('#ffffff', { map: G.tex.stripes('#e0667a', '#f6ecd2', 12, true) });
      scene.add(mesh(box(3.4, 1.3, 2.6), [cartM, cartM, G.mat('#f6ecd2'), cartM, cartM, cartM], C.x, 0.65, C.z));
      [-1, 1].forEach((s) => { const w = mesh(cyl(0.35, 0.35, 0.15, 16), G.mat('#2b1a10'), s * 1.3, 0.35, C.z + 1.35); w.rotation.x = PI / 2; scene.add(w); });
      const steel = new THREE.MeshLambertMaterial({ color: '#dfe5e8', emissive: '#2a3035', side: THREE.DoubleSide });
      scene.add(mesh(new THREE.CylinderGeometry(1.4, 1.2, 0.8, 32, 1, true), steel, C.x, 1.7, C.z));
      scene.add(mesh(cyl(1.2, 1.2, 0.04, 32), G.mat('#c9d2d6'), C.x, 1.32, C.z));
      const head = mesh(cyl(0.3, 0.3, 0.25, 16), G.shiny('#e0a526', { metalness: 0.4 }), C.x, 1.46, C.z);
      scene.add(head);
      const strandsGeo = new THREE.BufferGeometry();
      const sp = new Float32Array(160 * 3);
      for (let k = 0; k < 160; k++) { const a = Math.random() * PI * 2, r = G.rand(0.4, 1.15); sp[k * 3] = Math.cos(a) * r; sp[k * 3 + 1] = G.rand(0, 0.5); sp[k * 3 + 2] = Math.sin(a) * r; }
      strandsGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      const strands = new THREE.Points(strandsGeo, new THREE.PointsMaterial({ color: '#ffb4d0', size: 0.07, transparent: true, opacity: 0 }));
      strands.position.set(C.x, 1.4, C.z);
      scene.add(strands);
      scene.add(mesh(cyl(0.035, 0.035, 2.4, 6), G.mat('#f3e6c9'), C.x, 2.7, C.z));
      const floss = new THREE.Group();
      floss.position.set(C.x, 2.55, C.z);
      const flossM = new THREE.MeshLambertMaterial({ color: '#ffb4d0', emissive: '#4a1a2a', transparent: true, opacity: 0.93 });
      [[0, 0, 0, 0.42], [0.25, 0.15, 0.1, 0.3], [-0.22, 0.12, -0.12, 0.32], [0.1, 0.35, -0.2, 0.28], [-0.12, -0.2, 0.2, 0.3], [0.18, -0.12, -0.25, 0.26], [-0.2, 0.32, 0.18, 0.26]].forEach(([x, y, z, r]) => floss.add(mesh(sph(r, 12, 10), flossM, x, y, z, false)));
      scene.add(floss);
      const flyBits = [];
      let lastAng = null;
      let lastKey = null;
      let acc = 0;
      let speed = 0;
      let prog = 0;
      let best = 0;
      let spin = 0;
      let lastWhirr = 0;
      let lastWarn = 0;
      ctx.power.show(true, 'Spin speed');
      ctx.power.zone(p.lo / 3.6, p.hi / 3.6);
      ctx.timer(1);
      ctx.status('Candy floss <b>0%</b>');
      return {
        always(dt, t) {
          spin += speed * PI * 2 * dt;
          head.rotation.y = spin;
          strands.rotation.y = spin * 0.9;
          strands.material.opacity = Math.min(0.9, speed * 0.5);
          floss.scale.setScalar(0.18 + prog * 1.05);
          floss.rotation.y = spin * 0.3;
          for (let k = flyBits.length - 1; k >= 0; k--) {
            const b = flyBits[k];
            b.userData.v.y -= 6 * dt;
            b.position.addScaledVector(b.userData.v, dt);
            if (b.position.y < 0) { scene.remove(b); flyBits.splice(k, 1); }
          }
          void t;
        },
        update(dt, t, e) {
          ctx.timer(1 - e / p.time);
          if (e >= p.time) { ctx.end(); return; }
          const inst = acc / (PI * 2) / Math.max(dt, 1e-3);
          acc = 0;
          speed += (inst - speed) * Math.min(1, dt * 3);
          ctx.power.set(speed / 3.6);
          if (speed > 0.3 && t - lastWhirr > 0.12) { lastWhirr = t; ctx.sfx('whirr'); }
          if (speed >= p.lo && speed <= p.hi) {
            prog = Math.min(1, prog + dt / p.fill);
            ctx.hint('Lovely! Keep it steady.');
          } else if (speed > p.hi) {
            prog = Math.max(0, prog - dt * 0.06);
            ctx.hint('<b>Too fast!</b> The floss is flying off.');
            if (Math.random() < dt * 12) {
              const b = mesh(sph(0.08, 6, 4), flossM, C.x + G.rand(-0.3, 0.3), 2.6, C.z, false);
              b.userData.v = new V3(G.rand(-3, 3), G.rand(1, 3), G.rand(-1, 2));
              scene.add(b);
              flyBits.push(b);
            }
            if (t - lastWarn > 1.4) { lastWarn = t; ctx.float('Too fast!', new V3(C.x, 3.6, C.z), 'bad'); }
          } else ctx.hint(speed > 0.2 ? '<b>Faster!</b> The sugar needs a proper spin.' : G.isTouch ? 'Draw circles round the machine with your finger.' : 'Circle the mouse round the machine, or tap <kbd>←</kbd> <kbd>→</kbd> in turn.');
          ctx.status(`Candy floss <b>${Math.round(prog * 100)}%</b>`);
          // tokens you've spun stay yours, even if the floss droops a little
          best = Math.max(best, prog >= 1 ? 3 : Math.floor(prog * 3));
          ctx.tokens(best, 'Fill the whole stick for all 3');
          if (prog >= 1) ctx.end(3);
        },
        pointerMove(ptr) {
          const c = G.toScreen(new V3(C.x, 1.7, C.z), camera);
          const dx = ptr.x - c.x, dy = ptr.y - c.y;
          if (Math.hypot(dx, dy) < 25) { lastAng = null; return; }
          const a = Math.atan2(dy, dx);
          if (lastAng !== null) { const d = a - lastAng; acc += Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); }
          lastAng = a;
        },
        keyDown(e) {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          if (e.repeat) return;
          if (lastKey && lastKey !== e.key) acc += PI / 2;
          lastKey = e.key;
        },
      };
    },
  };

  // ======================================================================
  // 11. Duck Derby
  // ======================================================================
  GAMES.derby = {
    title: 'Duck Derby', c1: '#2a7a8c', c2: '#f2c230', blurb: 'Paddle your duck to the finish line.',
    params: (L) => ({ rival: L(0.62, 0.74, 0.86), beat: L(0.6, 0.55, 0.5), win: L(0.15, 0.13, 0.11) }),
    note: '1st: 3 tokens · 2nd: 2 · 3rd: 1',
    goal: () => 'Race your duck to the finish: 3 tokens for 1st place, 2 for 2nd and 1 for 3rd.',
    how: 'Tap to paddle. A ring shrinks down onto your duck: tap just as it lands for a big push. Tapping too fast only splashes about.',
    keys: 'Tap <kbd>Space</kbd> or click to paddle, in time with the ring.',
    touch: 'Tap in time with the ring to paddle.',
    build(ctx) {
      const { scene, camera, p } = ctx;
      camera.position.set(0, 5.6, 8.4);
      camera.lookAt(0, 1.2, -2.2);
      const START = -4.6, FINISH = 4.6, WY = 1.22;
      const lanes = [-4.0, -3.0, -2.0, -1.0];
      scene.add(mesh(box(11.2, 0.3, 4.4), new THREE.MeshLambertMaterial({ color: '#3f8fa0', emissive: '#0d3040' }), 0, WY - 0.15, -2.5));
      const wood = G.mat('#ffffff', { map: G.tex.wood('#8a5a33') });
      scene.add(mesh(box(11.6, 0.9, 0.2), wood, 0, 0.75, -0.2));
      scene.add(mesh(box(11.6, 0.9, 0.2), wood, 0, 0.75, -4.8));
      scene.add(mesh(box(11.6, 0.75, 4.4), wood, 0, 0.37, -2.5));
      [-3.5, -2.5, -1.5].forEach((z) => {
        const rope = mesh(cyl(0.02, 0.02, 10.8, 5), G.mat('#f6ecd2'), 0, WY + 0.05, z, false);
        rope.rotation.z = PI / 2;
        scene.add(rope);
        for (let x = -5.2; x <= 5.2; x += 0.5) scene.add(mesh(sph(0.07, 8, 6), G.mat(Math.round(x * 2) % 2 ? '#b3261e' : '#f6ecd2'), x, WY + 0.05, z, false));
      });
      const fc = document.createElement('canvas');
      fc.width = 64; fc.height = 256;
      const fx = fc.getContext('2d');
      for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 4; xx++) { fx.fillStyle = (xx + yy) % 2 ? '#2b1a10' : '#f6ecd2'; fx.fillRect(xx * 16, yy * 16, 16, 16); }
      const fl = mesh(new THREE.PlaneGeometry(0.35, 4.3), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(fc) }), FINISH + 0.35, WY + 0.02, -2.5, false);
      fl.rotation.x = -PI / 2;
      scene.add(fl);
      [-0.3, -4.7].forEach((z) => { scene.add(mesh(cyl(0.05, 0.05, 1.6, 6), G.mat('#2b1a10'), FINISH + 0.35, WY + 0.8, z)); });
      const finishSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.label('FINISH', { size: 44, bg: '#f6ecd2', fg: '#2b1a10' }), transparent: true }));
      finishSign.scale.set(1.5, 0.46, 1);
      finishSign.position.set(FINISH + 0.35, WY + 1.9, -2.5);
      scene.add(finishSign);
      const colours = [['#8fd0ff', '#2a7a8c'], ['#b6f09a', '#3f7d3a'], ['#ffb4d0', '#c9648c'], ['#f7c52b', '#b3261e']];
      const ducks = lanes.map((z, k) => {
        const g = makeRubberDuck(colours[k][0], colours[k][1]);
        g.position.set(START, WY, z);
        scene.add(g);
        return { g, z, x: START, speed: p.rival * G.rand(0.94, 1.06), ph: Math.random() * 6 };
      });
      const me = ducks[3];
      me.speed = 0;
      const band = mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 16), G.mat('#b3261e'), 0.24, 0.3, 0);
      band.rotation.y = PI / 2;
      me.g.add(band);
      const you = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.label('YOU', { size: 40, bg: '#e0a526', fg: '#2b1a10' }), transparent: true }));
      you.scale.set(0.8, 0.3, 1);
      you.position.set(0, 1.2, 0);
      me.g.add(you);
      const ringM = G.glow('#ffffff', { transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
      const ring = mesh(new THREE.RingGeometry(0.42, 0.52, 32), ringM, 0, WY + 0.04, me.z, false);
      ring.rotation.x = -PI / 2;
      scene.add(ring);
      let v = 0;
      let lastTap = -9;
      let el = 0;
      let done = false;
      const place = () => {
        const order = ducks.slice().sort((a, b) => b.x - a.x);
        const pos = order.indexOf(me) + 1;
        ctx.status(`Your duck is <b>${['1st', '2nd', '3rd', '4th'][pos - 1]}</b>`);
      };
      place();
      const tap = () => {
        if (!ctx.running() || done) return;
        const ph = (el % p.beat) / p.beat;
        const off = Math.min(ph, 1 - ph) * p.beat;
        if (el - lastTap < 0.22) { v += 0.02; ctx.sfx('paddle'); ctx.float('Splash!', me.g.position.clone().add(new V3(0, 1, 0)), 'bad'); }
        else if (off < p.win) { v += 1.0; ctx.sfx('stroke'); ctx.float('Stroke!', me.g.position.clone().add(new V3(0, 1, 0)), 'good'); }
        else { v += 0.14; ctx.sfx('paddle'); }
        lastTap = el;
      };
      return {
        always(dt, t) {
          ducks.forEach((d) => {
            d.g.position.set(d.x, WY + Math.sin(t * 4 + d.ph) * 0.03, d.z);
            d.g.rotation.z = Math.sin(t * 6 + d.ph) * 0.06;
          });
          const ph = (el % p.beat) / p.beat;
          const s = 1 + 1.4 * (1 - ph);
          ring.scale.set(s, s, s);
          ring.position.x = me.x;
          const off = Math.min(ph, 1 - ph) * p.beat;
          ringM.color.set(off < p.win ? '#7ee07e' : '#ffffff');
          ring.visible = ctx.running() && !done;
        },
        update(dt, t, e) {
          el = e;
          if (done) return;
          v -= v * 1.6 * dt;
          me.x += v * dt;
          ducks.forEach((d) => { if (d !== me) d.x += d.speed * (0.9 + 0.2 * Math.sin(t * 1.3 + d.ph)) * dt; });
          place();
          const winner = ducks.find((d) => d.x >= FINISH);
          if (winner) {
            done = true;
            const place = ducks.slice().sort((a, b) => b.x - a.x).indexOf(me);
            ctx.float(['Winner!', '2nd place!', '3rd place!', 'Last!'][place], me.g.position.clone().add(new V3(0, 1.4, 0)), place < 3 ? 'good' : 'bad');
            ctx.tokens([3, 2, 1, 0][place]);
            setTimeout(() => ctx.end([3, 2, 1, 0][place]), 600);
          }
        },
        keyDown(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) tap(); } },
        pointerDown() { tap(); },
      };
    },
  };

  // ======================================================================
  // 12. Buzz Wire
  // ======================================================================
  GAMES.buzz = {
    title: 'Buzz Wire', c1: '#2a9d8f', c2: '#f6ecd2', cursor: 'none', blurb: 'Steady hand: guide the loop along the wire.',
    params: (L) => ({ r: L(0.46, 0.38, 0.32), buzzes: L(4, 2, 1), time: L(40, 32, 28) }),
    note: 'Reach the gold post for all 3',
    goal: (p) => `Carry the loop along the wire: a token for every third of the way, and 3 if you reach the gold post. You have ${p.time} seconds, and you can set the buzzer off ${p.buzzes} time${p.buzzes === 1 ? '' : 's'}; one more and you're out.`,
    how: 'Move the mouse onto the loop at the green post to pick it up, then guide it along the twisty wire. Go steady: if the loop touches the wire, the buzzer goes off.',
    keys: 'Move the mouse slowly and steadily. No clicking needed.',
    touch: 'Drag the loop along the wire. It sits just above your fingertip so you can see it.',
    build(ctx) {
      const { scene, camera, p } = ctx;
      camera.position.set(0, 3.4, 8.2);
      camera.lookAt(0, 2.7, -1.8);
      const Z = -1.8;
      const pts = [];
      let y = 2.7;
      for (let k = 0; k <= 12; k++) {
        const x = -4.2 + k * 0.7;
        if (k > 0 && k < 12) y = G.clamp(y + G.rand(-0.9, 0.9), 1.9, 3.6);
        else y = 2.7;
        pts.push(new V3(x, y, Z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      scene.add(mesh(new THREE.TubeGeometry(curve, 240, 0.045, 8, false), G.shiny('#d07a3a', { metalness: 0.7, roughness: 0.3 }), 0, 0, 0));
      const poly = curve.getSpacedPoints(320);
      const woodM = G.mat('#ffffff', { map: G.tex.wood('#8a5a33') });
      scene.add(mesh(box(9.8, 0.35, 1.1), woodM, 0, 0.85, Z));
      [[pts[0], '#3f7d3a'], [pts[12], '#e0a526']].forEach(([pt, col]) => {
        scene.add(mesh(cyl(0.07, 0.07, pt.y - 1.0, 8), G.mat('#2b1a10'), pt.x, (pt.y + 1.0) / 2, Z));
        scene.add(mesh(sph(0.16, 12, 10), G.shiny(col), pt.x, pt.y, Z));
      });
      const lampM = G.glow('#5a1a10');
      scene.add(mesh(sph(0.22, 14, 10), lampM, 4.7, 1.35, Z + 0.3, false));
      scene.add(mesh(cyl(0.18, 0.2, 0.2, 12), G.mat('#2b1a10'), 4.7, 1.12, Z + 0.3));
      const loop = new THREE.Group();
      const ringMesh = mesh(new THREE.TorusGeometry(p.r, 0.045, 8, 28), G.shiny('#c9d2d6', { metalness: 0.7, roughness: 0.3 }), 0, 0, 0);
      loop.add(ringMesh);
      const handle = new THREE.Group();
      handle.add(mesh(cyl(0.035, 0.035, 0.9, 6), G.shiny('#c9d2d6', { metalness: 0.7 }), 0, -p.r - 0.45, 0));
      handle.add(mesh(cyl(0.09, 0.09, 0.6, 10), G.mat('#b3261e'), 0, -p.r - 1.1, 0));
      loop.add(handle);
      scene.add(loop);
      let pos = poly[0].clone();
      let idx = 0;
      let bestIdx = 0;
      let carrying = false;
      let buzzes = 0;
      let grace = 0;
      let touching = false;
      let aim = null;
      let over = false;
      ctx.timer(1);
      const status = () => ctx.status(`Buzzes <b>${buzzes}/${p.buzzes}</b> · Along the wire <b>${Math.round(idx / (poly.length - 1) * 100)}%</b>`);
      status();
      ctx.hint(G.isTouch ? 'Put your finger just below the loop at the <b>green</b> post to pick it up.' : 'Move the mouse onto the loop at the <b>green</b> post to pick it up.');
      const nearest = (q, from, span) => {
        let best = from, bd = Infinity;
        for (let k = Math.max(0, from - span); k <= Math.min(poly.length - 1, from + span); k++) {
          const d = (q.x - poly[k].x) ** 2 + (q.y - poly[k].y) ** 2;
          if (d < bd) { bd = d; best = k; }
        }
        return best;
      };
      return {
        always(dt, t) {
          const k = Math.min(poly.length - 2, idx);
          const tan = new V3().subVectors(poly[k + 1], poly[k]).normalize();
          loop.position.copy(pos);
          // face the loop along the wire, tipped towards the camera so you can see it's a ring
          loop.quaternion.setFromUnitVectors(new V3(0, 0, 1), new V3(tan.x, tan.y, 0.9).normalize());
          lampM.color.set(grace > 0.6 ? '#ff3a2a' : '#5a1a10');
          void t;
        },
        update(dt, t, e) {
          ctx.timer(1 - e / p.time);
          if (over) return;
          if (e >= p.time) { over = true; ctx.float("Time's up!", pos.clone().add(new V3(0, 0.8, 0)), 'bad'); setTimeout(() => ctx.end(), 400); return; }
          grace = Math.max(0, grace - dt);
          if (!aim) return;
          if (!carrying) {
            if (Math.hypot(aim.x - pos.x, aim.y - pos.y) < p.r + 0.2) { carrying = true; ctx.sfx('tick'); ctx.hint('Steady now... all the way to the <b>gold</b> post.'); }
            return;
          }
          // move towards the pointer, but never faster than a steady hand
          const step = new V3(aim.x - pos.x, aim.y - pos.y, 0);
          const maxStep = 5 * dt;
          if (step.length() > maxStep) step.setLength(maxStep);
          const want = pos.clone().add(step);
          idx = nearest(want, idx, 14);
          const w = poly[idx];
          const off = new V3(want.x - w.x, want.y - w.y, 0);
          const room = p.r - 0.05;
          touching = off.length() > room;
          if (touching) off.setLength(room); // the wire runs through the loop, so it can't leave it
          pos.set(w.x + off.x, w.y + off.y, Z);
          if (touching && grace <= 0) {
            buzzes++;
            grace = 0.9;
            ctx.sfx('buzz');
            ctx.float('BZZZT!', pos.clone().add(new V3(0, 0.7, 0)), 'bad');
            if (buzzes > p.buzzes) { over = true; setTimeout(() => ctx.end(), 500); }
          }
          status();
          // the furthest you've got along the wire earns tokens: a third, two thirds, then the gold post
          bestIdx = Math.max(bestIdx, idx);
          if (!over) ctx.tokens(Math.min(2, Math.floor((3 * bestIdx) / (poly.length - 1))), 'Reach the gold post for all 3');
          if (idx >= poly.length - 3 && !over) { over = true; ctx.sfx('ding'); ctx.float('Made it!', pos.clone().add(new V3(0, 0.8, 0)), 'good'); ctx.tokens(3); setTimeout(() => ctx.end(3), 500); }
        },
        pointerMove(ptr, e) { const h = ctx.rayZ(Z); if (h) { h.y += lift(e); aim = h; } },
        pointerDown(ptr, e) { const h = ctx.rayZ(Z); if (h) { h.y += lift(e); aim = h; } },
      };
    },
  };

  // ======================================================================
  // 13. Splat the Rat
  // ======================================================================
  GAMES.rat = {
    title: 'Splat the Rat', c1: '#3f7d3a', c2: '#e0a526', blurb: 'Whack the rat as it shoots out of the pipe.',
    params: (L) => ({ per: L(1, 1, 2), rats: L(5, 5, 8), speed: L(3.0, 4.0, 5.0), zone: L(1.5, 1.15, 0.9) }),
    unit: plural('rat', 'rats'),
    goal: (p) => `A token for ${every(p.per, 'rat', 'rats')} you splat, up to 3 tokens. There are ${p.rats} rats, and you get one swing at each.`,
    how: "The stall-holder drops a rat down the drainpipe, and you won't know when. It shoots out of the bottom and along the plank: swing the bat when it's on the red target. One swing per rat, so don't jump the gun.",
    keys: 'Press <kbd>Space</kbd> or click to swing the bat.',
    touch: 'Tap to swing the bat.',
    build(ctx) {
      const { scene, camera, p } = ctx;
      camera.position.set(0, 4.2, 8.6);
      camera.lookAt(0, 2.5, -2.6);
      const Z = -3.1;
      const TX = 0.9;
      scene.add(mesh(box(8, 4.4, 0.2), G.mat('#3f7d3a'), 0, 2.2, -3.75));
      const pipeM = G.shiny('#8b8f96', { metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
      scene.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.9, 16, 1, true), pipeM, -2.8, 3.55, Z));
      const elbow = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16, 1, true), pipeM, -2.45, 1.52, Z);
      elbow.rotation.z = PI / 2;
      scene.add(elbow);
      scene.add(mesh(sph(0.3, 12, 8), pipeM, -2.8, 1.55, Z));
      scene.add(mesh(box(5.8, 0.14, 0.8), G.mat('#ffffff', { map: G.tex.wood('#a06a3a') }), 0.7, 1.3, Z));
      scene.add(mesh(box(p.zone + 0.12, 0.02, 0.76), G.mat('#f6ecd2'), TX, 1.375, Z, false));
      scene.add(mesh(box(p.zone, 0.03, 0.66), G.glow('#b3261e'), TX, 1.38, Z, false));
      scene.add(mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.2, 18, 1, true), G.mat('#6b3f22', { side: THREE.DoubleSide }), 4.0, 0.6, Z));
      const hand = new THREE.Group();
      hand.position.set(-2.8, 5.85, Z);
      hand.add(mesh(sph(0.3, 12, 10), G.mat('#f6ecd2'), 0, 0, 0));
      hand.add(mesh(cyl(0.2, 0.22, 0.5, 10), G.mat('#b3261e'), 0, 0.4, 0));
      scene.add(hand);
      const grey = G.mat('#8b8680');
      const rat = new THREE.Group();
      const body = mesh(sph(0.22, 14, 10), grey, 0, 0, 0);
      body.scale.set(1.8, 0.8, 0.9);
      rat.add(body);
      rat.add(mesh(sph(0.15, 12, 10), grey, 0.4, 0.03, 0));
      [-1, 1].forEach((s) => { rat.add(mesh(sph(0.07, 8, 6), G.mat('#e0667a'), 0.36, 0.17, s * 0.1)); rat.add(mesh(sph(0.025, 6, 4), G.mat('#2b1a10'), 0.5, 0.08, s * 0.07)); });
      rat.add(mesh(sph(0.04, 6, 4), G.mat('#e0667a'), 0.56, 0.03, 0));
      const tail = mesh(cyl(0.02, 0.01, 0.8, 5), G.mat('#e0667a'), -0.75, 0.05, 0);
      tail.rotation.z = PI / 2 + 0.2;
      rat.add(tail);
      scene.add(rat);
      const bat = new THREE.Group();
      bat.position.set(TX, 1.52, Z + 1.7);
      bat.add(mesh(box(0.42, 0.08, 1.5), G.mat('#e3c49a'), 0, 0, -0.95));
      const grip = mesh(cyl(0.05, 0.05, 0.5, 8), G.mat('#2b1a10'), 0, 0, 0.05);
      grip.rotation.x = PI / 2;
      bat.add(grip);
      scene.add(bat);
      const UP = 1.1;
      bat.rotation.x = UP;
      let ratNo = 0;
      let splats = 0;
      let state = 'hold';
      let timer = 0;
      let swung = false;
      let x = -2.1;
      let v = p.speed;
      let fakes = 0;
      let ending = false;
      const inFlight = () => ['pipe', 'plank', 'fall'].includes(state);
      const status = () => ctx.status(`Splats <b>${splats}</b> · Rats left <b>${p.rats - ratNo - (inFlight() ? 1 : 0)}</b>`);
      const newRat = () => {
        state = 'hold';
        timer = G.rand(1.0, 3.2);
        fakes = G.rnd(3);
        swung = false;
        x = -2.1;
        v = p.speed * G.rand(0.9, 1.1);
        rat.visible = true;
        rat.scale.set(1, 1, 1);
        rat.rotation.set(0, 0, -PI / 2);
        rat.position.set(-2.8, 5.35, Z + 0.45);
        bat.rotation.x = UP;
        status();
      };
      newRat();
      const finishRat = () => {
        state = 'done';
        timer = 0.9;
        ratNo++;
        status();
        const left = p.rats - ratNo;
        if (!ending && (ctx.full() || left <= 0)) { ending = true; setTimeout(() => ctx.end(), 700); }
      };
      const swing = async () => {
        if (!ctx.running() || swung || state === 'done' || ending) return;
        swung = true;
        await G.tween(90, (t) => { bat.rotation.x = G.lerp(UP, 0, t); }, G.ease.in);
        ctx.sfx('strike');
        const hitNow = state === 'plank' && Math.abs(x - TX) < p.zone / 2 + 0.22;
        if (hitNow) {
          splats++;
          ctx.score(splats);
          ctx.sfx('splat');
          ctx.float('SPLAT!', new V3(TX, 2.3, Z), 'good');
          rat.scale.set(1.2, 0.3, 1.3);
          finishRat();
        } else {
          ctx.float(state === 'plank' ? (x < TX ? 'Too early!' : 'Too late!') : 'Too early!', new V3(TX, 2.3, Z), 'bad');
        }
        G.tween(350, (t) => { bat.rotation.x = G.lerp(0, UP * 0.6, t); });
      };
      return {
        always(dt, t) {
          if (state === 'hold') {
            const jig = fakes > 0 && timer < fakes * 0.9 && Math.sin(t * 30) > 0 ? 0.08 : 0;
            hand.position.x = -2.8 + jig;
            rat.position.x = -2.8 + jig;
          } else hand.position.x = -2.8;
        },
        update(dt, t, e) {
          void e;
          if (ending && state === 'done') return;
          if (state === 'hold') {
            timer -= dt;
            if (timer <= 0) { state = 'pipe'; timer = 3.9 / (v * 1.4); rat.visible = false; ctx.sfx('whoosh'); status(); }
          } else if (state === 'pipe') {
            timer -= dt;
            if (timer <= 0) { state = 'plank'; rat.visible = true; rat.rotation.set(0, 0, 0); x = -2.1; ctx.sfx('squeak'); }
          } else if (state === 'plank') {
            x += v * dt;
            rat.position.set(x, 1.52, Z);
            if (x > 3.6) {
              state = 'fall';
              if (!swung) ctx.float('Missed it!', new V3(3.4, 2.4, Z), 'bad');
            }
          } else if (state === 'fall') {
            rat.position.x += v * 0.5 * dt;
            rat.position.y -= 4 * dt;
            if (rat.position.y < 0.5) { rat.visible = false; finishRat(); }
          } else if (state === 'done') {
            timer -= dt;
            if (timer <= 0 && ratNo < p.rats && !ending) newRat();
          }
        },
        keyDown(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) swing(); } },
        pointerDown() { swing(); },
      };
    },
  };
})(window.GCS);
