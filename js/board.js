/* Grandad's Cold Snap: the 3D board scene and everything that moves on it. */
(function (G) {
  'use strict';
  const V3 = THREE.Vector3;
  const PI = Math.PI;
  const B = {};
  G.Board = B;

  const PAWN_COLORS = ['#e8432f', '#2a9d8f', '#f2c230', '#8e6cc4'];
  B.PAWN_COLORS = PAWN_COLORS;

  let scene, camera, orbit, grandad, fire, table, lamp, thermo, die, hemi, key, topMat, snow, snowGeo, curRing;
  const props = [];
  const prizes = {};
  const pawns = [];
  let targets = [];
  let shiverAmp = 0;
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
    key.shadow.mapSize.set(2048, 2048);
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
    fire.update(t);
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
  B.toGrandad = (key, k) => flyModel(key, B.pawnWorld(k).add(new V3(0, 0.6, 0)), new V3(0, 2.4, 0.2), 850, 0.34, 0.9, 3);
  B.backToStall = (key, k) => flyModel(key, B.pawnWorld(k), prizes[key].base.clone(), 900, 0.34, 0.62, 4);
  B.setWorn = (keys) => {
    grandad.setWorn(keys);
    table.tea.visible = keys.includes('tea');
    fire.setLit(keys.includes('logs'));
  };
  B.popWorn = (key) => {
    if (key === 'tea') { const t = table.tea; G.tween(500, (k) => t.scale.setScalar(0.72 * (0.4 + 0.6 * G.ease.back(k)))); }
    else if (key !== 'logs') grandad.pop(key);
  };

  // ---------- Cold ----------
  B.setCold = (c, level) => {
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
