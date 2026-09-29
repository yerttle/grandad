/* Grandad's Cold Snap: the fairground stall games. Win one to take home Grandad's cosy thing. */
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
    ['miniHud', 'miniTitle', 'miniPrize', 'miniStatus', 'miniTimerWrap', 'miniTimer', 'miniHint', 'power', 'powerLabel', 'powerZone', 'powerFill', 'powerMarker', 'miniCardWrap', 'miniCard', 'fade', 'stage'].forEach((id) => { hud[id] = $(id); });
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

  // ---------- Running a stall ----------
  M.play = async (gameKey, opts = {}) => {
    const { diff = 'chilly', prizeKey = null, practice = false, playerName = '' } = opts;
    if (M.autoResult !== null) { await G.sleep(40); return M.autoResult; }
    if (!hud.fade) grabHud();
    const def = GAMES[gameKey];
    const level = G.DIFFS[diff].level;
    const L = (a, b, c) => [a, b, c][level];
    const p = def.params(L);
    M.active = true;
    await fade(true);
    document.body.classList.add('minigame');
    const booth = G.makeBooth({ title: def.title, c1: def.c1, c2: def.c2 });
    if (prizeKey) {
      const pm = G.makeItem(prizeKey);
      pm.scale.setScalar(0.95);
      booth.prizeSlot.add(pm);
    }
    let state = 'intro';
    let won = null;
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
      end: (w) => { if (state !== 'play') return; state = 'over'; won = w; resolveDone(w); },
      rayZ: (z) => G.rayPlane(planeZ(z), G.ptr.ndc, booth.camera),
      rayY: (y) => G.rayPlane(planeY(y), G.ptr.ndc, booth.camera),
      hits: (objs) => G.raycast(objs, G.ptr.ndc, booth.camera),
    };
    hud.miniTitle.textContent = def.title;
    hud.miniPrize.textContent = prizeKey ? `Prize: Grandad's ${G.ITEMS[prizeKey].name}` : 'Practice round';
    hud.miniStatus.textContent = '';
    hud.miniHint.innerHTML = def.keys;
    hud.power.hidden = true;
    hud.powerZone.hidden = true;
    hud.miniTimerWrap.hidden = true;
    hud.miniHud.hidden = false;
    const game = def.build(ctx);
    let t0 = 0;
    const controller = {
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
      ${prizeKey ? (practice ? `<p class="prize-line">In the game, this stall has Grandad's <b>${G.ITEMS[prizeKey].name}</b>.</p>` : `<p class="prize-line">Win Grandad's <b>${G.ITEMS[prizeKey].name}</b></p>`) : ''}
      <p class="goal">${def.goal(p)}</p>
      <p>${def.how}</p>
      <p class="keys">${def.keys}</p>`, 'Play!');
    await countdown();
    state = 'play';
    t0 = G.E.time;
    if (game.start) game.start();
    await done;
    G.Sound.play(won ? 'cheer' : 'aww');
    await G.sleep(1100);
    G.Music.stop();
    hud.power.hidden = true;
    await card(won
      ? `<p class="kicker">${def.title}</p><h2 class="logo small">You won!</h2>${prizeKey && !practice ? `<p class="prize-line">Grandad's <b>${G.ITEMS[prizeKey].name}</b> is yours. Take it to one of his doors.</p>` : '<p>Proper fairground champion. Now try it for real.</p>'}`
      : `<p class="kicker">${def.title}</p><h2 class="logo small cold">So close!</h2><p>${prizeKey && !practice ? `The ${G.ITEMS[prizeKey].name} stays on the stall. Land in the room again to have another go.` : 'Have another go from the fair menu.'}</p>`,
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
    title: 'Hook-a-Duck', c1: '#3f8fa0', c2: '#f6ecd2',
    params: (L) => ({ need: 3, dips: L(7, 6, 5), tol: L(0.2, 0.16, 0.12), speed: L(0.5, 0.6, 0.72) }),
    goal: (p) => `Hook ${p.need} ducks. You get ${p.dips} dips.`,
    how: "Rubber ducks float round the trough. Dip the hook so it drops through a duck's ring just as it passes the white circle. The hook takes a moment to drop, so go a little early.",
    keys: 'Press <kbd>Space</kbd> or click to dip the hook.',
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

      const yellow = G.shiny('#f7c52b', { roughness: 0.35 });
      const makeDuck = () => {
        const d = new THREE.Group();
        const body = mesh(sph(0.3), yellow, 0, 0.1, 0);
        body.scale.set(1.25, 0.8, 1);
        d.add(body);
        d.add(mesh(sph(0.19), yellow, 0.24, 0.38, 0));
        const beak = mesh(new THREE.ConeGeometry(0.07, 0.18, 8), G.mat('#e8612c'), 0.45, 0.36, 0);
        beak.rotation.z = -PI / 2;
        d.add(beak);
        [-1, 1].forEach((s) => d.add(mesh(sph(0.03, 6, 4), G.mat('#2b1a10'), 0.34, 0.45, s * 0.1)));
        const ring = mesh(new THREE.TorusGeometry(0.1, 0.028, 6, 16), G.mat('#b3261e'), 0.24, 0.6, 0);
        ring.rotation.x = PI / 2;
        d.add(ring);
        return d;
      };
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
      const status = () => ctx.status(`Ducks hooked <b>${caught}/${p.need}</b> · Dips left <b>${left}</b>`);
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
          const to = new V3(-3.5 + caught * 0.9, 1.35, 2.5);
          caught++;
          status();
          await G.tween(500, (t) => { d.g.position.lerpVectors(from, to, t); d.g.position.y += Math.sin(t * PI) * 1.2; d.g.rotation.y = t * PI * 2; });
          if (caught >= p.need) ctx.end(true);
        }
        dipping = false;
        if (caught < p.need && left <= 0) setTimeout(() => ctx.end(false), 300);
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
    title: 'Coconut Shy', c1: '#7a3b1d', c2: '#e0a526', cursor: 'none',
    params: (L) => ({ balls: L(6, 5, 5), need: L(2, 2, 3), sway: L(0.14, 0.24, 0.3), hitR: L(0.62, 0.54, 0.5) }),
    goal: (p) => `Knock ${p.need} coconuts off their posts. You get ${p.balls} balls.`,
    how: "Point at a coconut and click to throw. Your aim wobbles a bit, so wait for the crosshair to drift over the coconut before you let go.",
    keys: 'Move the mouse to aim, click to throw.',
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
      for (let k = 0; k < p.balls; k++) { const b = mesh(sph(0.16, 14, 10), ballM, 3.2 + (k % 3) * 0.4, 1.28, 2.45 + Math.floor(k / 3) * 0.35); scene.add(b); shelfBalls.push(b); }
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
      const status = () => ctx.status(`Coconuts <b>${knocked}/${p.need}</b> · Balls left <b>${left}</b>`);
      status();
      const aimNow = (t) => new V3(aimBase.x + Math.sin(t * 1.7) * p.sway + Math.sin(t * 3.1) * p.sway * 0.4, aimBase.y + Math.sin(t * 2.3 + 1) * p.sway * 0.8, Z);
      const checkEnd = () => {
        if (knocked >= p.need) setTimeout(() => ctx.end(true), 600);
        else if (left <= 0 && !flying) setTimeout(() => ctx.end(false), 600);
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
          knocked++;
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
        pointerMove() { const h = ctx.rayZ(Z); if (h) aimBase = new V3(G.clamp(h.x, -4, 4), G.clamp(h.y, 0.8, 4.8), Z); },
        pointerDown() { const h = ctx.rayZ(Z); if (h) aimBase = new V3(G.clamp(h.x, -4, 4), G.clamp(h.y, 0.8, 4.8), Z); throwBall(); },
      };
    },
  };

  // ======================================================================
  // 3. Tin Can Alley (Living Room, Tartan Blanket)
  // ======================================================================
  GAMES.cans = {
    title: 'Tin Can Alley', c1: '#2a7a8c', c2: '#f6ecd2',
    params: (L) => ({ balls: L(5, 4, 3), px: L(1.7, 1.35, 1.1), py: L(1.5, 1.2, 0.95) }),
    goal: (p) => `Knock all 6 cans off the shelf. You get ${p.balls} balls.`,
    how: 'A line sweeps side to side: stop it to pick where across you throw. Then a second line sweeps up and down: stop it to pick the height. Hit the bottom row and the cans above come down too.',
    keys: 'Press <kbd>Space</kbd> or click twice: once to set across, once to set height.',
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
        if (down === 6) ctx.end(true);
        else if (left <= 0) ctx.end(false);
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
          if (run) ctx.hint(stage === 'x' ? 'Stop the line to set <b>across</b>: <kbd>Space</kbd> or click.' : 'Now stop the line to set the <b>height</b>.');
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
    title: 'Whack-a-Mole', c1: '#6f7d32', c2: '#f6ecd2', cursor: 'none',
    params: (L) => ({ need: L(8, 10, 12), up: L(1.05, 0.85, 0.66), gap: L([0.5, 0.85], [0.42, 0.72], [0.36, 0.6]), time: 20 }),
    goal: (p) => `Whack ${p.need} moles in ${p.time} seconds.`,
    how: "Moles pop up out of the holes. Whack them before they duck back down. If Tiddles the cat pops up, leave her alone: whacking the cat costs you a mole.",
    keys: 'Click the moles, or use <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd> / <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd> for the holes.',
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
        scene.add(lab);
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
      const status = () => ctx.status(`Moles whacked <b>${score}/${p.need}</b>`);
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
        if (score >= p.need) setTimeout(() => ctx.end(true), 350);
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
          if (e >= p.time) { ctx.end(score >= p.need); return; }
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
    title: 'Water Pistol Race', c1: '#3f8fa0', c2: '#f3efe4', cursor: 'none',
    params: (L) => ({ rival: L(11, 9, 7.8), fill: 6, r: L(0.62, 0.52, 0.44), mx: L(0.6, 0.95, 1.2), my: L(0.25, 0.4, 0.5) }),
    goal: () => 'Pop your balloon before the other two players pop theirs.',
    how: "Squirt water into the clown's mouth in the middle lane. The balloon above only fills while you're on target, and the clown keeps moving, so follow it.",
    keys: 'Move the mouse to aim. Hold the mouse button (or <kbd>Space</kbd>) to squirt.',
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
          const popped = lanes.find((l) => l.fill >= 1);
          if (popped) {
            over = true;
            burst(popped);
            ctx.float(popped === me ? 'POP! You win!' : 'POP! Too slow...', popped.bal.position.clone(), popped === me ? 'good' : 'bad');
            setTimeout(() => ctx.end(popped === me), 500);
          }
        },
        pointerMove() { const h = ctx.rayZ(Z); if (h) aim = new V3(G.clamp(h.x, -4.5, 4.5), G.clamp(h.y, 0.6, 4.6), Z); },
        pointerDown() { const h = ctx.rayZ(Z); if (h) aim = new V3(G.clamp(h.x, -4.5, 4.5), G.clamp(h.y, 0.6, 4.6), Z); },
        keyDown(e) { if (e.key === ' ') { e.preventDefault(); spaceDown = true; } },
        keyUp(e) { if (e.key === ' ') spaceDown = false; },
      };
    },
  };

  // ======================================================================
  // 6. Hoopla (Bedroom, Cardigan)
  // ======================================================================
  GAMES.hoopla = {
    title: 'Hoopla', c1: '#c9648c', c2: '#f6ecd2',
    params: (L) => ({ rings: L(7, 6, 5), need: 2, pegR: L(0.3, 0.25, 0.21), scatter: L(0.05, 0.08, 0.11), period: L(1.6, 1.3, 1.05) }),
    goal: (p) => `Land ${p.need} rings over the pegs. You get ${p.rings} rings.`,
    how: 'Move the mouse left and right to line up with a peg. Hold the button down to charge your throw, and let go when the power is right: more power throws further back.',
    keys: 'Mouse to aim. Hold the mouse button (or <kbd>Space</kbd>) to charge, release to throw.',
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
      const status = () => ctx.status(`Ringers <b>${ringers}/${p.need}</b> · Rings left <b>${left}</b>`);
      status();
      const release = async () => {
        if (!charging) return;
        charging = false;
        if (flying || left <= 0 || !ctx.running()) return;
        flying = true;
        left--;
        status();
        const pw = power;
        const land = new V3(aimX + G.rand(-1, 1) * p.scatter * 3, 0.92, 0.6 - pw * 5.6 + G.rand(-1, 1) * p.scatter * 2);
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
        if (ringers >= p.need) setTimeout(() => ctx.end(true), 500);
        else if (left <= 0) setTimeout(() => ctx.end(false), 600);
      };
      const press = () => { if (!flying && left > 0 && ctx.running()) { charging = true; chargeT0 = G.E.time; } };
      return {
        always(dt, t) {
          aimLine.position.x = aimX;
          if (charging) power = G.tri(t - chargeT0, p.period);
          else if (!flying) power = 0;
          ctx.power.set(power);
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
    title: 'Shooting Gallery', c1: '#8a7452', c2: '#f6ecd2', cursor: 'crosshair',
    params: (L) => ({ corks: 12, need: L(5, 6, 7), sp: L([1.2, 1.6], [1.5, 2.0], [1.8, 2.4]), time: 30 }),
    goal: (p) => `Score ${p.need} points with ${p.corks} corks. Gold ducks score 2.`,
    how: 'Tin ducks sail along two rows. Click to fire a cork at them. Every cork counts, so pick your shots.',
    keys: 'Move the mouse to aim, click to fire.',
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
      const status = () => ctx.status(`Points <b>${score}/${p.need}</b> · Corks <b>${corks}</b>`);
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
            ctx.sfx('clatter');
            ctx.float(d.gold ? '+2' : '+1', hits[0].point.clone().add(new V3(0, 0.5, 0)), 'good');
          }
        }
        status();
        if (score >= p.need) { ending = true; setTimeout(() => ctx.end(true), 500); } else if (corks <= 0) { ending = true; setTimeout(() => ctx.end(false), 700); }
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
          if (e >= p.time && !ending) { ending = true; ctx.end(score >= p.need); }
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
    title: 'Test Your Strength', c1: '#4a6b3a', c2: '#f6ecd2',
    params: (L) => ({ swings: L(4, 3, 3), period: L(1.15, 0.95, 0.8), ring: 0.9 }),
    goal: (p) => `Ring the bell at the top. You get ${p.swings} swings.`,
    how: 'The power needle races back and forth. Swing the hammer when it is in the red zone at the far end, and the puck will fly all the way up to the bell.',
    keys: 'Press <kbd>Space</kbd> or click to swing the hammer.',
    build(ctx) {
      const { scene, camera, p, booth } = ctx;
      camera.position.set(0, 3.9, 10.6);
      camera.lookAt(0, 3.7, -3.4);
      // this one stands in the open air: hide the booth's roof and front awning
      booth.scene.children.forEach((o) => { if (o.position.y > 5.2 && o.position.z > 1.5) o.visible = false; if (o.geometry && o.geometry.type === 'PlaneGeometry' && o.rotation.x > 1.5) o.visible = false; });
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
      let busy = false;
      let t0 = 0;
      ctx.power.show(true, 'Power');
      ctx.power.zone(p.ring, 1);
      const status = () => ctx.status(`Swings left <b>${left}</b>`);
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
        if (rings) ctx.end(true);
        else if (left <= 0) ctx.end(false);
      };
      return {
        start() { t0 = G.E.time; },
        always(dt, t) { if (ctx.running() && !busy) ctx.power.set(G.tri(t - t0, p.period)); },
        keyDown(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) swing(); } },
        pointerDown() { swing(); },
      };
    },
  };
})(window.GCS);
