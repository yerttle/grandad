/* Grandad's Cold Snap: renderer, animation loop, tweens, camera rig and pointer routing. */
(function (G) {
  'use strict';
  const V3 = THREE.Vector3;

  const E = {
    renderer: null, canvas: null, stage: null,
    w: 1, h: 1,
    scene: null, camera: null,
    controller: null, // object with optional pointerDown/Move/Up/click/wheel/update handlers
    time: 0,
  };
  G.E = E;

  // ---------- Tweens & per-frame hooks ----------
  const tweens = new Set();
  const frameFns = new Set();
  G.tween = (ms, fn, ease = G.ease.inOut) => new Promise((resolve) => {
    if (ms <= 0) { fn(1); resolve(); return; }
    tweens.add({ t0: performance.now(), ms, fn, ease, resolve });
  });
  G.onFrame = (fn) => { frameFns.add(fn); return () => frameFns.delete(fn); };
  // board animations respect reduced motion; stall games keep their real timing
  G.ms = (n) => (G.reduceMotion ? Math.max(1, n * 0.35) : n);

  // ---------- Setup ----------
  G.initEngine = (stage, canvas) => {
    E.stage = stage;
    E.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // phones have very dense screens; capping the pixel ratio keeps the 3D smooth and the battery happy
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, G.isPhone ? 1.5 : 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    E.renderer = r;
    G.maxAniso = r.capabilities.getMaxAnisotropy();
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(stage); else window.addEventListener('resize', resize);
    resize();
    bindPointer();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      E.time += dt;
      for (const tw of [...tweens]) {
        const k = G.clamp((now - tw.t0) / tw.ms, 0, 1);
        tw.fn(tw.ease(k));
        if (k >= 1) { tweens.delete(tw); tw.resolve(); }
      }
      for (const fn of [...frameFns]) fn(dt, E.time);
      if (E.controller && E.controller.update) E.controller.update(dt, E.time);
      if (E.scene && E.camera) r.render(E.scene, E.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  function resize() {
    const rect = E.stage.getBoundingClientRect();
    E.w = Math.max(1, Math.round(rect.width));
    E.h = Math.max(1, Math.round(rect.height));
    E.renderer.setSize(E.w, E.h, false);
    if (E.camera) { E.camera.aspect = E.w / E.h; E.camera.updateProjectionMatrix(); }
    if (E.controller && E.controller.resize) E.controller.resize();
  }
  G.resizeEngine = resize;

  G.setView = (scene, camera, controller) => {
    E.scene = scene;
    E.camera = camera;
    E.controller = controller || null;
    camera.aspect = E.w / E.h;
    camera.updateProjectionMatrix();
    if (E.controller && E.controller.resize) E.controller.resize();
  };

  // ---------- Pointer ----------
  const ptr = { x: 0, y: 0, ndc: new THREE.Vector2(), down: false, sx: 0, sy: 0, moved: false, id: null };
  G.ptr = ptr;
  function setPtr(e) {
    const r = E.canvas.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    ptr.ndc.set((ptr.x / r.width) * 2 - 1, -(ptr.y / r.height) * 2 + 1);
  }
  const fingers = new Map();
  let pinch = null;
  const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  function bindPointer() {
    const c = E.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button > 0) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2 && E.controller && E.controller.pinch) {
        // on the board a second finger turns the gesture into a pinch; it never counts as a tap
        pinch = { d0: spread() };
        ptr.moved = true;
        if (E.controller.pinchStart) E.controller.pinchStart();
        e.preventDefault();
        return;
      }
      if (pinch) return; // at the stalls every finger is a tap of its own
      setPtr(e);
      ptr.down = true;
      ptr.moved = false;
      ptr.sx = e.clientX;
      ptr.sy = e.clientY;
      ptr.id = e.pointerId;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (E.controller && E.controller.pointerDown) E.controller.pointerDown(ptr, e);
      e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => {
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && fingers.size >= 2) {
        if (E.controller && E.controller.pinch) E.controller.pinch(spread() / pinch.d0);
        return;
      }
      if (ptr.down && e.pointerId !== ptr.id) return;
      const px = ptr.x, py = ptr.y;
      setPtr(e);
      if (ptr.down && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 6) ptr.moved = true;
      if (E.controller && E.controller.pointerMove) E.controller.pointerMove(ptr, e, ptr.x - px, ptr.y - py);
    });
    const up = (e) => {
      fingers.delete(e.pointerId);
      if (fingers.size < 2) pinch = null;
      if (!ptr.down || e.pointerId !== ptr.id) return;
      setPtr(e);
      ptr.down = false;
      if (E.controller && E.controller.pointerUp) E.controller.pointerUp(ptr, e);
      if (!ptr.moved && E.controller && E.controller.click) E.controller.click(ptr, e);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => {
      if (E.controller && E.controller.wheel) { e.preventDefault(); E.controller.wheel(e); }
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  const ray = new THREE.Raycaster();
  G.raycast = (objects, ndc = ptr.ndc, camera = E.camera) => {
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(objects, true);
  };
  G.rayPlane = (plane, ndc = ptr.ndc, camera = E.camera) => {
    ray.setFromCamera(ndc, camera);
    const out = new V3();
    return ray.ray.intersectPlane(plane, out) ? out : null;
  };
  // world position -> pixel position inside the stage
  G.toScreen = (v, camera = E.camera) => {
    const p = v.clone().project(camera);
    return { x: (p.x + 1) / 2 * E.w, y: (1 - p.y) / 2 * E.h, behind: p.z > 1 };
  };

  // ---------- Board camera: drag to orbit, scroll to zoom ----------
  G.makeOrbit = (camera, opts) => {
    const o = {
      camera,
      target: new V3(0, 0.8, 0.6),
      home: new V3(0, 0.8, 0.6),
      goalTarget: new V3(0, 0.8, 0.6),
      az: 0, el: 0.95, zoom: 1, fitR: 26,
      goal: { az: 0, el: 0.95, zoom: 1 },
      shake: 0,
      // how much of the gap to the goal is left after a second; cutscenes glide more slowly
      smooth: 0.001,
      // cutscenes lock the camera so a stray drag doesn't spoil the shot
      locked: false,
      onClick: null,
      fitPoints: opts.fitPoints,
      resize() {
        // pick a distance that keeps the whole board in view at the default angle
        const az = o.az, el = o.el;
        // measure from the home view, even if the camera is swooped onto a stall right now
        const tgt = o.target.clone();
        o.target.copy(o.home);
        let r = 14;
        for (; r < 90; r += 0.5) {
          place(r, 0, 0.95);
          camera.updateMatrixWorld();
          const ok = o.fitPoints.every((pt) => {
            const p = pt.clone().project(camera);
            return Math.abs(p.x) < 0.94 && p.y < 0.9 && p.y > -0.94;
          });
          if (ok) break;
        }
        o.fitR = r;
        o.target.copy(tgt);
        place(o.fitR * o.zoom, az, el);
      },
      reset() { o.goal.az = 0; o.goal.el = 0.95; o.goal.zoom = 1; },
      pinchStart() { o.pinchZoom = o.goal.zoom; },
      pinch(ratio) { if (!o.locked) o.goal.zoom = G.clamp(o.pinchZoom / ratio, 0.55, 1.5); },
      pointerMove(p, e, dx, dy) {
        if (!p.down || !p.moved || o.locked) return;
        o.goal.az -= dx * 0.006;
        o.goal.el = G.clamp(o.goal.el + dy * 0.004, 0.42, 1.35);
      },
      wheel(e) {
        if (o.locked) return;
        const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        o.goal.zoom = G.clamp(o.goal.zoom * Math.exp(d * 0.0012), 0.55, 1.5);
      },
      click(p) { if (o.onClick) o.onClick(p); },
      update(dt) {
        const k = 1 - Math.pow(o.smooth, dt);
        o.az += (o.goal.az - o.az) * k;
        o.el += (o.goal.el - o.el) * k;
        o.zoom += (o.goal.zoom - o.zoom) * k;
        o.target.lerp(o.goalTarget, k);
        place(o.fitR * o.zoom, o.az, o.el);
        if (o.shake > 0) {
          o.shake = Math.max(0, o.shake - dt);
          const s = o.shake * 0.9;
          camera.position.x += G.rand(-s, s);
          camera.position.y += G.rand(-s, s);
        }
      },
    };
    function place(r, az, el) {
      camera.position.set(
        o.target.x + r * Math.cos(el) * Math.sin(az),
        o.target.y + r * Math.sin(el),
        o.target.z + r * Math.cos(el) * Math.cos(az),
      );
      camera.lookAt(o.target);
    }
    return o;
  };
})(window.GCS);
