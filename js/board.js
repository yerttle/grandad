/* Grandad's Cold Snap: the 3D board scene and everything that moves on it. */
(function (G) {
  'use strict';
  const V3 = THREE.Vector3;
  const PI = Math.PI;
  const B = {};
  G.Board = B;

  const PAWN_COLORS = ['#e8432f', '#2a9d8f', '#f2c230', '#8e6cc4'];
  B.PAWN_COLORS = PAWN_COLORS;

  let scene, camera, orbit, grandad, fire, table, lamp, thermo, die, hemi, key, topMat, snow, snowGeo, curRing, crown;
  let crownFor = null;
  const props = [];
  const prizes = {};
  const pawns = [];
  let targets = [];
  let shiverAmp = 0;
  let coldNow = 0;
  const labelCache = {};
  // free the geometry of things we add and remove during play (materials and textures are shared)
  const drop = (o) => { scene.remove(o); o.traverse((c) => { if (c.geometry) c.geometry.dispose(); }); };

  B.init = () => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a110b');
    scene.fog = new THREE.Fog('#1a110b', 48, 110);
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 250);
    B.scene = scene;
    B.camera = camera;

    hemi = new THREE.HemisphereLight('#ffe8c8', '#3a2618', 0.62);
    scene.add(hemi);
    key = new THREE.DirectionalLight('#fff1dc', 0.6);
    key.position.set(9, 22, 13);
    key.castShadow = true;
    key.shadow.mapSize.set(G.isPhone ? 1024 : 2048, G.isPhone ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
    key.shadow.bias = -0.0006;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#9ab8ff', 0.14);
    fill.position.set(-12, 9, -8);
    scene.add(fill);

    const tableM = G.mat('#ffffff', { map: G.tex.walnut() });
    const tablePlane = G.mesh(new THREE.PlaneGeometry(120, 120), tableM, 0, -0.5, 0, false);
    tablePlane.rotation.x = -PI / 2;
    scene.add(tablePlane);

    topMat = new THREE.MeshLambertMaterial({ map: G.tex.boardTop() });
    const side = G.mat('#3a2618');
    const edge = G.mat('#e0a526');
    const board = G.mesh(G.geo.box(20, 0.5, 20), [side, side, topMat, side, side, side], 0, -0.25, 0);
    scene.add(board);
    const rim = G.mesh(G.geo.box(20.4, 0.12, 20.4), edge, 0, -0.44, 0);
    scene.add(rim);

    // Grandad's corner of the front room
    const rug = G.mesh(new THREE.CircleGeometry(4.4, 48), G.mat('#ffffff', { map: G.tex.rug() }), 0, 0.012, 0.4, false);
    rug.rotation.x = -PI / 2;
    scene.add(rug);
    grandad = G.makeGrandad();
    grandad.group.position.set(0, 0, -0.5);
    scene.add(grandad.group);
    fire = G.makeFireplace();
    fire.group.position.set(4.3, 0, -3.5);
    fire.group.rotation.y = -0.6;
    scene.add(fire.group);
    table = G.makeSideTable();
    table.group.position.set(-2.8, 0, 1.0);
    scene.add(table.group);
    lamp = G.makeLamp();
    lamp.group.position.set(-2.3, 0, -2.3);
    scene.add(lamp.group);
    thermo = G.makeThermometer();
    thermo.group.position.set(-5.7, 0, 2.3);
    thermo.group.rotation.y = 0.35;
    scene.add(thermo.group);

    // corner props
    // props sit on the outer half of each corner; the pawn stands beside them and the text stays clear
    const cornerAt = { 0: [0.82, 0.78], 8: [-0.72, 0.8], 16: [-0.6, -0.5], 24: [0.62, -0.55] };
    for (const [i, off] of Object.entries(cornerAt)) {
      const sp = G.SPACES[i];
      const p = G.makeCornerProp(sp.key);
      const c = G.tileCentre(+i);
      p.group.position.set(c.x + off[0], 0, c.z + off[1]);
      if (sp.key === 'stairlift') p.group.rotation.y = PI / 2;
      if (sp.key === 'window' || sp.key === 'boiler') p.group.scale.setScalar(0.66);
      if (sp.key === 'cat') p.group.rotation.y = -0.6;
      scene.add(p.group);
      props.push(p);
      if (sp.key === 'boiler') B.boiler = p;
    }

    // a fairground stall in every room, with its prize floating above
    for (const d of G.DISTRICTS) {
      const i = d.idx[1];
      const c = G.tileCentre(i);
      const stall = G.makeStall(d.color);
      stall.position.set(c.x, 0, c.z - 0.5);
      scene.add(stall);
      const prize = new THREE.Group();
      const model = G.makeItem(d.item);
      model.scale.setScalar(0.62);
      model.position.y = -0.2;
      prize.add(model);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.tex.skyGlow(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(1.6);
      prize.add(glow);
      prize.position.set(c.x, 3.05, c.z - 0.55);
      scene.add(prize);
      prizes[d.item] = { group: prize, model, base: prize.position.clone() };
    }

    die = G.makeDie();
    die.position.set(2.8, 0.45, 3.6);
    die.quaternion.copy(G.dieBase(6));
    scene.add(die);

    curRing = G.mesh(new THREE.RingGeometry(0.5, 0.64, 32), G.glow('#f6ecd2', { transparent: true, opacity: 0.9, side: THREE.DoubleSide }), 0, 0.03, 0, false);
    curRing.rotation.x = -PI / 2;
    curRing.visible = false;
    scene.add(curRing);

    // Grandad's favourite wears a crown
    crown = new THREE.Group();
    const gold = G.shiny('#e0a526', { metalness: 0.35, roughness: 0.3, emissive: '#3a2400' });
    crown.add(G.mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.16, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#e0a526', metalness: 0.35, roughness: 0.3, emissive: '#3a2400', side: THREE.DoubleSide }), 0, 0, 0));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * PI * 2;
      crown.add(G.mesh(new THREE.ConeGeometry(0.06, 0.18, 6), gold, Math.cos(a) * 0.22, 0.16, Math.sin(a) * 0.22));
      crown.add(G.mesh(G.geo.sph(0.035, 8, 6), G.glow(k % 2 ? '#b3261e' : '#2a9d8f'), Math.cos(a + 0.6) * 0.235, 0.0, Math.sin(a + 0.6) * 0.235, false));
    }
    crown.visible = false;
    scene.add(crown);

    // snow
    const NS = 900;
    snowGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(NS * 3);
    const vel = new Float32Array(NS);
    for (let k = 0; k < NS; k++) {
      pos[k * 3] = G.rand(-16, 16);
      pos[k * 3 + 1] = G.rand(0, 16);
      pos[k * 3 + 2] = G.rand(-16, 16);
      vel[k] = G.rand(0.6, 1.4);
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    snowGeo.userData.vel = vel;
    snowGeo.setDrawRange(0, 0);
    snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, transparent: true, opacity: 0.85, depthWrite: false }));
    scene.add(snow);

    const fitPoints = [];
    [-1, 1].forEach((a) => [-1, 1].forEach((b) => { fitPoints.push(new V3(a * 10.2, 0, b * 10.2)); fitPoints.push(new V3(a * 10, 1.6, b * 10)); }));
    fitPoints.push(new V3(0, 5.2, -0.5));
    orbit = G.makeOrbit(camera, { fitPoints });
    orbit.onClick = (p) => {
      const hit = G.rayPlane(new THREE.Plane(new V3(0, 1, 0), 0), p.ndc, camera);
      if (!hit) return;
      const i = G.tileAtXZ(hit.x, hit.z);
      if (i !== null && B.onTileClick) B.onTileClick(i);
    };
    const baseMove = orbit.pointerMove;
    orbit.pointerMove = (p, e, dx, dy) => {
      baseMove(p, e, dx, dy);
      if (!p.down) {
        let over = false;
        if (targets.length) {
          const hit = G.rayPlane(new THREE.Plane(new V3(0, 1, 0), 0), p.ndc, camera);
          const i = hit ? G.tileAtXZ(hit.x, hit.z) : null;
          over = targets.some((t) => t.i === i);
        }
        G.E.canvas.style.cursor = over ? 'pointer' : 'grab';
      }
    };
    B.orbit = orbit;

    G.onFrame(update);
  };

  B.show = () => G.setView(scene, camera, orbit);
  // swoop the camera down to a stall before heading into the fair, and back out afterwards
  B.focusTile = (i) => {
    const c = G.tileCentre(i);
    orbit.goalTarget.set(c.x, 1.2, c.z - 0.3);
    orbit.goal.zoom = 0.42;
    return G.sleep(G.ms(1100));
  };
  B.unfocus = () => { orbit.goalTarget.copy(orbit.home); orbit.goal.zoom = 1; };
  B.refreshTop = () => {
    const old = topMat.map;
    topMat.map = G.tex.boardTop();
    topMat.needsUpdate = true;
    if (old) old.dispose();
  };
  B.resetView = () => orbit.reset();

  function update(dt, t) {
    for (const k in prizes) {
      const p = prizes[k];
      p.group.position.y = p.base.y + Math.sin(t * 2 + p.base.x) * 0.12;
      p.model.rotation.y = t * 1.3;
    }
    props.forEach((p) => p.update(t));
    fire.update(t, dt);
    table.update(t);
    grandad.man.position.x = shiverAmp ? Math.sin(t * 60) * shiverAmp : 0;
    const n = snowGeo.drawRange.count;
    if (n) {
      const a = snowGeo.attributes.position.array;
      const vel = snowGeo.userData.vel;
      for (let k = 0; k < n; k++) {
        a[k * 3 + 1] -= vel[k] * dt;
        a[k * 3] += Math.sin(t + k) * dt * 0.3;
        if (a[k * 3 + 1] < 0) { a[k * 3 + 1] = 16; a[k * 3] = G.rand(-16, 16); a[k * 3 + 2] = G.rand(-16, 16); }
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    if (curRing.visible) {
      const s = 1 + Math.sin(t * 5) * 0.08;
      curRing.scale.set(s, s, s);
    }
    const leader = crownFor !== null ? pawns[crownFor] : null;
    crown.visible = !!leader;
    if (leader) {
      crown.position.copy(leader.group.position).add(new V3(0, 1.42 * leader.group.scale.y, 0));
      crown.rotation.y = t * 1.5;
    }
    targets.forEach((tg, k) => {
      tg.arrow.position.y = 2.1 + Math.sin(t * 5 + k) * 0.18;
      tg.ring.material.opacity = 0.55 + Math.sin(t * 6) * 0.35;
    });
    pawns.forEach((pw) => {
      pw.carry.children.forEach((c, k, all) => {
        const a = t * 1.6 + (k / all.length) * PI * 2;
        const r = all.length > 1 ? 0.38 : 0;
        c.position.set(Math.cos(a) * r, Math.sin(t * 3 + k) * 0.05, Math.sin(a) * r);
        c.rotation.y = t * 2;
      });
    });
  }

  // ---------- Pawns ----------
  const STACK = [[-0.42, -0.3], [0.42, -0.3], [-0.42, 0.38], [0.42, 0.38]];
  B.spot = (i) => {
    const c = G.tileCentre(i);
    const sp = G.SPACES[i];
    if (sp.type === 'room' && sp.stall) return new V3(c.x, 0, c.z + 0.45);
    if (sp.type === 'corner') return new V3(c.x - Math.sign(c.x) * 0.55, 0, c.z + Math.sign(c.z) * 0.55);
    const inw = G.inward(i);
    return new V3(c.x + inw.x * 0.2, 0, c.z + inw.z * 0.2);
  };
  function spotFor(players, k, pos = players[k].pos) {
    const here = players.map((q, j) => (q.pos === pos ? j : -1)).filter((j) => j >= 0);
    if (!here.includes(k)) here.push(k);
    const s = B.spot(pos);
    if (here.length < 2) return s;
    const off = STACK[here.indexOf(k) % 4];
    return s.add(new V3(off[0], 0, off[1]));
  }
  B.setPlayers = (players) => {
    pawns.forEach((p) => scene.remove(p.group));
    pawns.length = 0;
    players.forEach((pl, k) => {
      const group = G.makePawn(PAWN_COLORS[k]);
      const carry = new THREE.Group();
      carry.position.y = 1.75;
      group.add(carry);
      scene.add(group);
      pawns.push({ group, carry, keys: '' });
    });
    B.placePawns(players, 0);
  };
  B.placePawns = (players, cur, showRing = true) => {
    players.forEach((pl, k) => { if (pawns[k]) pawns[k].group.position.copy(spotFor(players, k)); });
    if (pawns[cur] && showRing) {
      curRing.visible = true;
      curRing.position.set(pawns[cur].group.position.x, 0.03, pawns[cur].group.position.z);
    } else curRing.visible = false;
  };
  B.hideRing = () => { curRing.visible = false; };
  B.hop = (players, k, fromPos) => {
    const pw = pawns[k].group;
    const a = spotFor(players, k, fromPos);
    const b = spotFor(players, k);
    return G.tween(G.ms(230), (t) => {
      pw.position.lerpVectors(a, b, t);
      pw.position.y = Math.sin(t * PI) * 0.7;
    }, G.ease.linear);
  };
  B.ride = (players, k, fromPos) => {
    const pw = pawns[k].group;
    const a = spotFor(players, k, fromPos);
    const b = spotFor(players, k);
    return G.tween(G.ms(1400), (t) => {
      pw.position.lerpVectors(a, b, t);
      pw.position.y = Math.sin(t * PI) * 3;
      pw.rotation.y = t * PI * 2;
    });
  };
  B.pawnWorld = (k) => pawns[k].group.position.clone().add(new V3(0, 1.1, 0));
  B.squash = (k) => {
    const pw = pawns[k].group;
    return G.tween(G.ms(600), (t) => { const s = Math.sin(t * PI); pw.scale.set(1 + s * 0.25, 1 - s * 0.55, 1 + s * 0.25); });
  };
  B.setCarry = (players) => {
    players.forEach((pl, k) => {
      const pw = pawns[k];
      const keys = pl.carry.join(',');
      if (!pw || pw.keys === keys) return;
      pw.keys = keys;
      while (pw.carry.children.length) { const c = pw.carry.children[0]; pw.carry.remove(c); c.traverse((q) => { if (q.geometry) q.geometry.dispose(); }); }
      pl.carry.forEach((key) => {
        const m = G.makeItem(key);
        m.scale.setScalar(0.34);
        pw.carry.add(m);
      });
    });
  };

  // ---------- Dice ----------
  B.rollDie = (v) => {
    const start = new V3(G.rand(-2.5, 0), 4, 6.2);
    const end = new V3(G.rand(1.6, 3.6), 0.45, G.rand(2.6, 4.2));
    const yaw = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), Math.random() * PI * 2);
    const qFinal = yaw.multiply(G.dieBase(v));
    const axis = new V3(G.rand(-1, 1), G.rand(-1, 1), G.rand(-1, 1)).normalize();
    const spin = PI * (5 + Math.random() * 2);
    const tmp = new THREE.Quaternion();
    return G.tween(G.ms(1150), (t) => {
      const e = G.ease.out(t);
      die.position.set(G.lerp(start.x, end.x, e), 0.45 + 3.6 * Math.pow(1 - t, 2) * Math.abs(Math.cos(t * PI * 2.5)), G.lerp(start.z, end.z, e));
      tmp.setFromAxisAngle(axis, spin * (1 - e));
      die.quaternion.copy(qFinal).multiply(tmp);
    }, G.ease.linear);
  };

  // ---------- Direction choices ----------
  B.showTargets = (list) => {
    B.clearTargets();
    list.forEach(({ i, text }) => {
      const s = B.spot(i);
      const g = new THREE.Group();
      g.position.set(s.x, 0, s.z);
      const ring = G.mesh(new THREE.RingGeometry(0.55, 0.8, 32), G.glow('#c9531f', { transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }), 0, 0.04, 0, false);
      ring.rotation.x = -PI / 2;
      g.add(ring);
      const arrow = G.mesh(new THREE.ConeGeometry(0.28, 0.55, 12), G.shiny('#c9531f', { emissive: '#5a1a08' }), 0, 2.1, 0);
      arrow.rotation.x = PI;
      g.add(arrow);
      const tex = labelCache[text] || (labelCache[text] = G.tex.label(text, { size: 56 }));
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      label.scale.set(0.62 * tex.userData.aspect, 0.62, 1);
      label.position.y = 2.95;
      label.renderOrder = 10;
      g.add(label);
      scene.add(g);
      targets.push({ i, group: g, ring, arrow });
    });
  };
  B.clearTargets = () => {
    targets.forEach((t) => drop(t.group));
    targets = [];
    if (G.E.canvas) G.E.canvas.style.cursor = 'grab';
  };

  // ---------- Prizes and cosy things ----------
  B.setPrizes = (items) => { for (const k in prizes) prizes[k].group.visible = items[k].state === 'room'; };
  async function flyModel(key, from, to, ms, s0, s1, arc = 2.5) {
    const m = G.makeItem(key);
    scene.add(m);
    await G.tween(G.ms(ms), (t) => {
      m.position.lerpVectors(from, to, t);
      m.position.y += Math.sin(t * PI) * arc;
      m.scale.setScalar(G.lerp(s0, s1, t));
      m.rotation.y = t * PI * 3;
    });
    drop(m);
  }
  B.prizeToPawn = (key, k) => { prizes[key].group.visible = false; return flyModel(key, prizes[key].group.position.clone(), B.pawnWorld(k).add(new V3(0, 0.6, 0)), 800, 0.62, 0.34, 2); };
  B.backToStall = (key, k) => flyModel(key, B.pawnWorld(k), prizes[key].base.clone(), 900, 0.34, 0.62, 4);
  B.passItem = (key, from, to) => flyModel(key, B.pawnWorld(from).add(new V3(0, 0.6, 0)), B.pawnWorld(to).add(new V3(0, 0.6, 0)), 700, 0.34, 0.34, 1.6);
  B.setCrown = (k) => { crownFor = k; };
  B.setWorn = (keys) => {
    grandad.setWorn(keys);
    table.tea.visible = keys.includes('tea');
    fire.setLit(keys.includes('logs'));
  };

  // ---------- Cutscenes ----------
  // Cutscene steps run on their own clock, so a tap can skip straight to the end of the scene.
  let skipping = false;
  let saved = null;
  const cineTween = (ms, fn, ease = G.ease.inOut) => new Promise((resolve) => {
    const dur = G.ms(ms);
    if (skipping || dur <= 1) { fn(ease(1)); resolve(); return; }
    const t0 = performance.now();
    const off = G.onFrame(() => {
      const k = skipping ? 1 : Math.min(1, (performance.now() - t0) / dur);
      fn(ease(k));
      if (k >= 1) { off(); resolve(); }
    });
  });
  B.cineWait = (ms) => cineTween(ms, () => {});
  B.cineSkip = () => { skipping = true; };
  const nearAz = (a) => a + PI * 2 * Math.round((orbit.az - a) / (PI * 2));
  // frame a close-up: far enough back that Grandad and the thing he's getting both fit, whatever the screen shape
  // On wide screens Grandad sits right of centre, leaving room for the card on the left.
  B.cineSide = () => camera.aspect > 1.05;
  function shot(key) {
    // [target x, y, z, camera angle, shift Grandad right?]: the logs shot takes in the fireplace and Grandad together
    const [x, y, z, az, shift] = { logs: [2.8, 1.8, -2.4, -0.35, 0], tea: [-1.1, 1.9, 0.1, -0.22, 1] }[key] || [0.25, 2.05, -0.2, 0.3, 1];
    const tanV = Math.tan((camera.fov * PI) / 360);
    const wide = B.cineSide();
    // on upright screens the card sits underneath, so stand back a little and lift Grandad up the frame
    const dist = wide ? Math.max(13.5, 4.2 / (tanV * camera.aspect)) : Math.max(15.5, 4.6 / (tanV * camera.aspect));
    const aim = nearAz(az);
    const side = wide && shift ? 0.4 * dist * tanV * camera.aspect : 0;
    orbit.goalTarget.set(x - Math.cos(aim) * side, wide ? y : y - 0.7, z + Math.sin(aim) * side);
    orbit.goal.az = aim;
    orbit.goal.el = 0.3;
    orbit.goal.zoom = dist / orbit.fitR;
  }
  // with reduced motion the camera cuts between shots instead of gliding
  function snap() {
    if (!G.reduceMotion) return;
    orbit.az = orbit.goal.az;
    orbit.el = orbit.goal.el;
    orbit.zoom = orbit.goal.zoom;
    orbit.target.copy(orbit.goalTarget);
  }
  B.cineIn = (key) => {
    skipping = false;
    if (!saved) saved = { az: orbit.goal.az, el: orbit.goal.el, zoom: orbit.goal.zoom, target: orbit.goalTarget.clone() };
    orbit.locked = true;
    orbit.smooth = 0.02;
    curRing.visible = false;
    shot(key);
    snap();
  };
  B.cineShot = (key) => { shot(key); snap(); };
  B.cineOut = () => {
    skipping = false;
    if (saved) {
      orbit.goal.az = nearAz(saved.az);
      orbit.goal.el = saved.el;
      orbit.goal.zoom = saved.zoom;
      orbit.goalTarget.copy(saved.target);
      saved = null;
    }
    snap();
    orbit.locked = false;
    // glide back out, then hand the snappy camera back to the player
    setTimeout(() => { if (!orbit.locked) orbit.smooth = 0.001; }, 1000);
  };

  function anchorOf(key) {
    if (key === 'tea') return table.tea.getWorldPosition(new V3());
    if (key === 'logs') return fire.group.localToWorld(new V3(0, 0.55, 0.5));
    return grandad.anchor(key);
  }
  // The item lifts off the pawn with a trail of sparkles, hovers in front of Grandad glowing,
  // then puts itself on him. onArrive runs the moment it lands, so the game can update the score.
  B.deliveryShow = async (key, k, onArrive) => {
    const from = pawns[k] ? B.pawnWorld(k).add(new V3(0, 0.6, 0)) : new V3(0, 3, 8);
    // hover in clear air: above the fireplace or the side table, otherwise beside Grandad's head, nearer the camera
    const az = orbit.goal.az;
    const hover = key === 'logs' ? fire.group.localToWorld(new V3(0, 3.7, 1.4))
      : key === 'tea' ? table.group.localToWorld(new V3(0, 2.6, 0.5))
        : new V3(0, 4.2, 0.2).add(new V3(-Math.cos(az), 0, Math.sin(az)).multiplyScalar(2.1)).add(new V3(Math.sin(az), 0, Math.cos(az)).multiplyScalar(1.2));
    const holder = new THREE.Group();
    const m = G.makeItem(key);
    holder.add(m);
    const haloMat = new THREE.SpriteMaterial({ map: G.tex.skyGlow(), color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Sprite(haloMat);
    holder.add(halo);
    holder.position.copy(from);
    scene.add(holder);
    G.Sound.play('rise');
    let nextSpark = 0;
    await cineTween(1000, (t) => {
      holder.position.lerpVectors(from, hover, G.ease.inOut(t));
      holder.position.y += Math.sin(t * PI) * 2.4;
      m.scale.setScalar(G.lerp(0.34, 0.9, G.ease.out(t)));
      m.rotation.y = t * PI * 4;
      haloMat.opacity = t * 0.85;
      halo.scale.setScalar(0.5 + t * 1.9);
      const now = performance.now();
      if (!skipping && now > nextSpark && t < 1) {
        nextSpark = now + 45;
        G.spawnSparkles(scene, holder.position, { n: 3, speed: 0.5, life: 0.7, size: 0.4 });
      }
    }, G.ease.linear);
    G.Sound.play('sparkle');
    await cineTween(700, (t) => {
      holder.position.set(hover.x, hover.y + Math.sin(t * PI * 2) * 0.14, hover.z);
      m.rotation.y = PI * 4 + t * PI * 2.5;
      halo.scale.setScalar(2.4 + Math.sin(t * PI * 4) * 0.3);
      haloMat.opacity = 0.85;
    }, G.ease.linear);
    const to = anchorOf(key);
    const hp = holder.position.clone();
    await cineTween(340, (t) => {
      holder.position.lerpVectors(hp, to, t);
      m.scale.setScalar(G.lerp(0.9, 0.45, t));
      m.rotation.y += 0.3;
      haloMat.opacity = 0.85 * (1 - t);
    }, G.ease.in);
    drop(holder);
    haloMat.dispose();
    if (onArrive) onArrive();
    if (key === 'tea') {
      const tea = table.tea;
      tea.visible = true;
      G.tween(G.ms(600), (t) => { tea.position.y = 1.29 + 1.2 * (1 - t); tea.scale.setScalar(0.72 * Math.max(0.01, G.ease.back(t))); }, G.ease.out);
    } else if (key === 'logs') {
      fire.ignite();
      G.Sound.play('ignite');
      G.spawnSparkles(scene, to, { n: 30, speed: 2.6, life: 1.1, size: 0.5, color: '#ff9a3c' });
    } else grandad.putOn(key, G.ms(650));
    G.spawnSparkles(scene, to, { n: 26, speed: 3, life: 0.9, size: 0.55 });
    // a pop of confetti from each arm of the chair, falling back through the shot
    [-1, 1].forEach((sd) => G.spawnConfetti(scene, new V3(sd * 1.3, 2.2, 0.3), { n: G.isPhone ? 40 : 70, spread: 2.2, up: 7.5, life: 2.8, size: 0.18 }));
    grandad.cheer(G.ms(1600));
  };

  // The last delivery: fireworks over the house, Grandad thaws out and does a little dance, and everyone jumps for joy.
  B.celebrate = async () => {
    skipping = false;
    orbit.locked = true;
    orbit.smooth = 0.05;
    orbit.goal.el = 0.55;
    orbit.goal.zoom = Math.max(0.7, 20 / orbit.fitR);
    // aim a little up and to one side, so the fireworks fill the sky and Grandad stays clear of the card
    const tanV = Math.tan((camera.fov * PI) / 360);
    const side = B.cineSide() ? 0.36 * orbit.fitR * orbit.goal.zoom * tanV * camera.aspect : 0;
    const aimAt = (a) => orbit.goalTarget.set(-Math.cos(a) * side, 3.4, Math.sin(a) * side);
    // swing gently from side to side, always keeping Grandad's front to the camera
    const az0 = nearAz(0);
    orbit.goal.az = az0;
    aimAt(az0);
    snap();
    const sway = G.reduceMotion ? 0 : 0.75;
    const c0 = coldNow;
    G.tween(G.ms(2200), (t) => B.setCold(c0 * (1 - t), 0));
    const colors = ['#ffd27a', '#ff6b4a', '#4fd1c0', '#b69cff', '#fff0a8', '#b7e36a', '#ffffff'];
    let running = true;
    let clock = 0, nextRocket = 0.2, nextRain = 0;
    let swing = 0;
    const off = G.onFrame((dt, t) => {
      swing += dt;
      orbit.goal.az = az0 + Math.sin(swing * 0.7) * sway;
      aimAt(orbit.goal.az);
      if (!G.reduceMotion) pawns.forEach((pw, j) => { pw.group.position.y = Math.abs(Math.sin(t * 6 + j * 1.3)) * 0.55; });
      hemi.intensity += (0.62 - hemi.intensity) * Math.min(1, dt * 4);
      if (!running || skipping) return;
      clock += dt;
      if (clock > nextRocket) { nextRocket = clock + G.rand(0.28, 0.6); rocket(G.pick(colors)); }
      if (clock > nextRain) { nextRain = clock + 0.8; G.spawnConfetti(scene, new V3(G.rand(-5, 5), 11, G.rand(-5, 5)), { n: G.isPhone ? 40 : 70, spread: 2.5, up: 0.4, life: 4.2, size: 0.2 }); }
    });
    (async () => { while (running && !skipping) await grandad.cheer(G.ms(1300)); })();
    G.Sound.play('hooray');
    await B.cineWait(6500);
    running = false;
    off();
    pawns.forEach((pw) => { pw.group.position.y = 0; });
    hemi.intensity = 0.62;
    orbit.locked = false;
    orbit.smooth = 0.001;
    skipping = false;
  };
  function rocket(color) {
    // launch from the back half of the board, so the bursts fill the sky behind Grandad
    const a = G.rand(PI * 1.1, PI * 1.9);
    const r = G.rand(5.5, 9);
    const from = new V3(Math.cos(a) * r, 0.5, Math.sin(a) * r);
    const to = new V3(from.x * 0.6, G.rand(5.5, 8), from.z * 0.6 - 1.5);
    const mat = new THREE.SpriteMaterial({ map: G.tex.skyGlow(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const spark = new THREE.Sprite(mat);
    spark.scale.setScalar(0.7);
    scene.add(spark);
    G.Sound.play('rocket');
    G.tween(700, (t) => { spark.position.lerpVectors(from, to, t); }, G.ease.out).then(() => {
      scene.remove(spark);
      mat.dispose();
      G.spawnFirework(scene, to, color);
      G.Sound.play('firework');
      hemi.intensity = 1.1;
    });
  }

  // ---------- Cold ----------
  B.setCold = (c, level) => {
    coldNow = c;
    grandad.setCold(c);
    shiverAmp = G.reduceMotion ? 0 : [0, 0.015, 0.035, 0.06][level];
    hemi.color.set(G.mixHex('#ffe8c8', '#cfe2ff', c));
    key.color.set(G.mixHex('#fff1dc', '#dbeeff', c));
    const bg = G.mixHex('#1a110b', '#0f1a26', c);
    scene.background.set(bg);
    scene.fog.color.set(bg);
    topMat.color.set(G.mixHex('#ffffff', '#d4e8f6', c * 0.85));
    snowGeo.setDrawRange(0, Math.round(c * 900));
  };
  B.setTemp = (t, instant) => thermo.set(t, instant);
  B.setFrozen = (v) => {
    grandad.setCold(v ? 1 : 0);
    if (v) shiverAmp = 0;
    if (!B.ice) {
      B.ice = G.mesh(G.geo.box(3.4, 5.2, 3), new THREE.MeshLambertMaterial({ color: '#d6ecf7', transparent: true, opacity: 0.45 }), 0, 2.6, -0.3, false);
      grandad.group.add(B.ice);
    }
    B.ice.visible = v;
  };

  // ---------- Grandad's newspaper ----------
  B.windUp = () => G.tween(G.ms(700), (t) => { grandad.armPivot.rotation.x = -1.1 * t; }, G.ease.out);
  B.throwPaper = async (k, ducked, onImpact) => {
    const from = grandad.handWorld();
    grandad.paper.visible = false;
    G.tween(G.ms(220), (t) => { grandad.armPivot.rotation.x = G.lerp(-1.1, 0.5, t); }).then(() => G.tween(G.ms(400), (t) => { grandad.armPivot.rotation.x = G.lerp(0.5, 0, t); }));
    const to = B.pawnWorld(k);
    const roll = G.makeRolledPaper();
    scene.add(roll);
    const end = ducked ? to.clone().add(to.clone().sub(from).setY(0).multiplyScalar(0.45)).setY(0.2) : to;
    if (ducked) B.squash(k);
    await G.tween(G.ms(ducked ? 760 : 520), (t) => {
      roll.position.lerpVectors(from, end, t);
      roll.position.y += Math.sin(t * PI) * (ducked ? 2.4 : 3);
      roll.rotation.set(t * 9, t * 4, t * 14);
    }, G.ease.linear);
    if (onImpact) onImpact();
    if (!ducked) {
      orbit.shake = 0.35;
      B.squash(k);
      await G.tween(G.ms(350), (t) => { roll.position.y = G.lerp(to.y, 0.2, t); roll.rotation.z += 0.1; });
    }
    setTimeout(() => drop(roll), 600);
    grandad.paper.visible = true;
  };
  B.shake = (s = 0.3) => { orbit.shake = s; };
  B.headWorld = () => new V3(0, 5.25, -0.7);
  B.flashBoiler = () => { if (B.boiler) B.boiler.flash(); };
})(window.GCS);
