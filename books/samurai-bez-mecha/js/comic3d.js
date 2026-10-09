/* 3D-версия комикса: оригинальные low-poly персонажи и сцены (three.js).
   Используются те же данные панелей, что и в 2D-версии. Один общий WebGL-рендерер
   рисует панели по очереди в обычные canvas, поэтому лимит контекстов не мешает. */
(function () {
  var T = window.THREE;
  if (!T) { window.Comic3D = { ok: false }; return; }

  var SKIN = 0xf2d4b3, INK = 0x1b1714;
  var PAL = {
    hide:  { robe: 0x8d7554, sash: 0x5b4a33 },
    hideL: { robe: 0xa3402f, sash: 0x4a3a2a },
    hideK: { robe: 0x6a4c93, sash: 0xa7802f },
    nobu:  { robe: 0x2f2a3a, sash: 0xb23a2b },
    sam:   { robe: 0x3d5a73, sash: 0x22313d },
    pea:   { robe: 0xb59b6e, sash: 0x7d6a47 },
    foe:   { robe: 0x5b3a58, sash: 0x2b1c2a },
    mon:   { robe: 0xd9d2c0, sash: 0x8a8472 }
  };

  var tone, outMat, shadowMat, renderer, ok = null, STYLE = 'real';
  var geoCache = {}, matCache = {};

  function G(key, make) { return geoCache[key] || (geoCache[key] = make()); }
  function toon(color, extra) {
    var k = STYLE + color + (extra ? JSON.stringify(extra) : '');
    if (!matCache[k]) matCache[k] = STYLE === 'real'
      ? new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.78, metalness: 0.03 }, extra || {}))
      : new T.MeshToonMaterial(Object.assign({ color: color, gradientMap: tone }, extra || {}));
    return matCache[k];
  }
  function basic(color, extra) {
    var k = 'b' + color + (extra ? JSON.stringify(extra) : '');
    if (!matCache[k]) matCache[k] = new T.MeshBasicMaterial(Object.assign({ color: color }, extra || {}));
    return matCache[k];
  }
  function mesh(geo, color, opt) {
    opt = opt || {};
    var m = new T.Mesh(geo, opt.basic ? basic(color, opt.mat) : toon(color, opt.mat));
    if (!opt.basic) { m.castShadow = true; m.receiveShadow = true; }
    if (!opt.noOutline && STYLE === 'toon') { var o = new T.Mesh(geo, outMat); o.scale.setScalar(opt.ol || 1.06); m.add(o); }
    return m;
  }
  function put(m, x, y, z) { m.position.set(x, y, z); return m; }
  function box(w, h, d, color, opt) { return mesh(G('box' + w + ',' + h + ',' + d, function () { return new T.BoxGeometry(w, h, d); }), color, opt); }
  function cyl(rt, rb, h, seg, color, opt) { return mesh(G('cyl' + [rt, rb, h, seg], function () { return new T.CylinderGeometry(rt, rb, h, Math.max(seg, STYLE === 'real' ? 28 : seg)); }), color, opt); }
  function cone(r, h, seg, color, opt) { return mesh(G('cone' + [r, h, seg], function () { return new T.ConeGeometry(r, h, seg); }), color, opt); }
  function sph(r, color, opt) { return mesh(G('sph' + r, function () { return new T.SphereGeometry(r, 36, 24); }), color, opt); }

  function init() {
    if (ok !== null) return ok;
    try {
      var data = new Uint8Array([70, 150, 255]);
      tone = new T.DataTexture(data, 3, 1, T.RedFormat);
      tone.minFilter = tone.magFilter = T.NearestFilter; tone.needsUpdate = true;
      outMat = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
      shadowMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
      renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      ok = true;
    } catch (e) { ok = false; }
    return ok;
  }

  /* ---------- Персонажи ---------- */
  function face(head, mood, bigEars) {
    function eye(sx) {
      var g = new T.Group(), x = sx * 0.17;
      if (mood === 'shock') {
        g.add(put(sph(0.105, 0xffffff, { noOutline: true }), x, 0.05, 0.37));
        g.add(put(sph(0.04, INK, { noOutline: true }), x, 0.05, 0.46));
      } else if (mood === 'happy') {
        var e = sph(0.065, INK, { noOutline: true }); e.scale.set(1.3, 0.35, 0.6); g.add(put(e, x, 0.05, 0.42));
      } else if (mood === 'det') {
        g.add(put(box(0.15, 0.035, 0.04, INK, { noOutline: true }), x, 0.05, 0.43));
      } else {
        g.add(put(sph(0.058, INK, { noOutline: true }), x, 0.05, 0.42));
      }
      if (mood === 'angry') { var b = box(0.22, 0.045, 0.04, INK, { noOutline: true }); b.rotation.z = sx * 0.5; g.add(put(b, x, 0.17, 0.42)); }
      if (mood === 'worry') { var w = box(0.2, 0.04, 0.04, INK, { noOutline: true }); w.rotation.z = -sx * 0.4; g.add(put(w, x, 0.17, 0.42)); }
      if (mood === 'shock') { var s = box(0.18, 0.04, 0.04, INK, { noOutline: true }); g.add(put(s, x, 0.22, 0.4)); }
      return g;
    }
    head.add(eye(-1)); head.add(eye(1));
    var m;
    if (mood === 'happy') { m = new T.Mesh(G('smile', function () { return new T.TorusGeometry(0.09, 0.02, 6, 14, Math.PI); }), basic(INK)); m.rotation.z = Math.PI; m.position.set(0, -0.14, 0.43); }
    else if (mood === 'worry') { m = new T.Mesh(G('frown', function () { return new T.TorusGeometry(0.07, 0.018, 6, 14, Math.PI); }), basic(INK)); m.position.set(0, -0.22, 0.42); }
    else if (mood === 'angry' || mood === 'shout') { m = sph(0.075, INK, { noOutline: true }); m.scale.set(1, 1.1, 0.5); m.position.set(0, -0.2, 0.43); }
    else if (mood === 'shock') { m = sph(0.05, INK, { noOutline: true }); m.scale.set(1, 1.2, 0.5); m.position.set(0, -0.2, 0.44); }
    else { m = box(0.14, 0.025, 0.03, INK, { noOutline: true }); m.position.set(0, -0.2, 0.44); }
    head.add(m);
    [-1, 1].forEach(function (sx) {
      var ear = sph(bigEars ? 0.14 : 0.1, SKIN); ear.scale.set(0.5, 1, 1); head.add(put(ear, sx * 0.47, 0, 0));
    });
  }

  function arm(side, P, pose) {
    var a = new T.Group(); a.position.set(side * 0.5, 1.28, 0);
    a.add(put(cyl(0.1, 0.09, 0.62, 10, P.robe), 0, -0.31, 0));
    a.add(put(sph(0.12, SKIN), 0, -0.68, 0));
    var r = { x: 0, z: side * 0.18 };
    switch (pose) {
      case 'up':    if (side > 0) r = { x: 0, z: 2.7 }; break;
      case 'both':  r = { x: 0, z: side * 2.7 }; break;
      case 'point': if (side > 0) r = { x: -0.25, z: 1.45 }; break;
      case 'hold':  r = { x: -1.0, z: -side * 0.35 }; break;
      case 'cross': r = { x: -0.9, z: -side * 0.9 }; break;
      case 'kneel': r = { x: -0.8, z: -side * 0.3 }; break;
    }
    a.rotation.order = 'ZXY'; a.rotation.set(r.x, 0, r.z);
    return a;
  }

  function character(o, closeup) {
    var P = PAL[o.k] || PAL.sam, g = new T.Group(), b = new T.Group();
    var hs = o.k === 'nobu' ? 1.1 : (o.k.indexOf('hide') === 0 ? 0.92 : 1);
    var sc = closeup ? 1 : (o.s || 1) * hs;
    b.scale.setScalar(sc); g.add(b);
    var sh = new T.Mesh(G('shadow', function () { return new T.CircleGeometry(0.75, 20); }), shadowMat);
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.scale.setScalar(sc); if (STYLE === 'toon') g.add(sh);

    if (o.k === 'nobu') {
      var cape = new T.Mesh(G('cape', function () { return new T.PlaneGeometry(1.5, 1.8); }), toon(0xb23a2b, { side: T.DoubleSide }));
      cape.position.set(0, 1.0, -0.42); cape.rotation.x = 0.08; b.add(cape);
    }
    [-1, 1].forEach(function (sx) { b.add(put(box(0.26, 0.12, 0.4, 0x2b2420), sx * 0.2, 0.06, 0.08)); });
    b.add(put(cyl(0.4, 0.58, 0.62, 18, P.sash), 0, 0.4, 0));
    b.add(put(cyl(0.36, 0.5, 0.82, 18, P.robe), 0, 1.0, 0));
    var sash = new T.Mesh(G('sash', function () { return new T.TorusGeometry(0.44, 0.075, 8, 22); }), toon(P.sash));
    sash.rotation.x = Math.PI / 2; sash.position.y = 0.74; b.add(sash);
    b.add(put(box(0.2, 0.3, 0.05, 0xece3cf, { noOutline: true }), 0, 1.24, 0.43));

    var head = new T.Group(); head.position.y = 1.7; b.add(head);
    head.add(sph(0.46, SKIN));
    var hair = new T.Mesh(G('hair', function () { return new T.SphereGeometry(0.49, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.52); }), toon(INK));
    hair.rotation.x = -0.28; hair.position.set(0, 0.03, -0.02); head.add(hair);
    head.add(put(sph(0.13, INK), 0, 0.58, -0.12));
    face(head, o.mood || 'calm', o.k.indexOf('hide') === 0);
    if (o.k.indexOf('hide') === 0) {
      [-1, 1].forEach(function (sx) { head.add(put(box(0.1, 0.02, 0.03, 0x7a5c44, { noOutline: true }), sx * 0.3, -0.06, 0.34)); });
    }
    if (o.k === 'nobu') [-1, 1].forEach(function (sx) {
      var m = box(0.17, 0.035, 0.04, INK, { noOutline: true }); m.rotation.z = -sx * 0.25; head.add(put(m, sx * 0.1, -0.12, 0.44));
    });
    if (o.hat === 'kasa') head.add(put(cone(0.95, 0.42, 26, 0xd6b66a), 0, 0.5, 0));
    if (o.hat === 'helm') {
      var hm = new T.Mesh(G('helm', function () { return new T.SphereGeometry(0.54, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5); }), toon(0x4a4a52));
      hm.position.y = 0.08; head.add(hm); head.add(put(cone(0.16, 0.6, 4, 0xa7802f), 0, 0.72, 0));
    }

    b.add(arm(-1, P, o.pose)); b.add(arm(1, P, o.pose));
    if (o.item === 'sandals') { b.add(put(box(0.3, 0.05, 0.14, 0xd6b66a), -0.14, 0.92, 0.6)); b.add(put(box(0.3, 0.05, 0.14, 0xd6b66a), 0.14, 0.92, 0.6)); }
    if (o.item === 'scroll') { var sc2 = cyl(0.08, 0.08, 0.55, 12, 0xf4ead2); sc2.rotation.z = Math.PI / 2; b.add(put(sc2, 0, 0.92, 0.6)); }
    if (o.item === 'cup') b.add(put(cyl(0.12, 0.09, 0.12, 12, 0xe8dcc0), 0, 0.92, 0.6));
    if (o.item === 'fan') { var fn = cyl(0.36, 0.36, 0.03, 20, 0xd9ab48); fn.rotation.x = Math.PI / 2; b.add(put(fn, 0.85, 1.35, 0.3)); }
    if (o.item === 'spear') { b.add(put(cyl(0.04, 0.04, 3.4, 8, 0x5b4a33), 0.85, 1.7, 0.1)); b.add(put(cone(0.09, 0.3, 6, 0xcfcfd4), 0.85, 3.55, 0.1)); }
    return g;
  }

  /* ---------- Окружение ---------- */
  function ground(color, w, d) {
    var m = new T.Mesh(G('ground' + w + d, function () { return new T.PlaneGeometry(w || 80, d || 50); }), toon(color, { side: T.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m;
  }
  function sun(g, x, y, z, r) { g.add(put(mesh(G('disc' + r, function () { return new T.CircleGeometry(r, 32); }), 0xd65a45, { basic: true, noOutline: true }), x, y, z)); }
  function pine(g, x, z, s) {
    g.add(put(cyl(0.12 * s, 0.16 * s, 1.2 * s, 6, 0x5b4a33), x, 0.6 * s, z));
    [0, 1, 2].forEach(function (i) { g.add(put(cone((1.1 - i * 0.28) * s, 1.1 * s, 7, 0x4f7a58), x, (1.5 + i * 0.7) * s, z)); });
  }
  function water(g, y, color, z, w, d) {
    var m = new T.Mesh(G('water' + w + d, function () { return new T.PlaneGeometry(w || 80, d || 12); }), toon(color, { transparent: true, opacity: 0.88, side: T.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, y, z); g.add(m);
    for (var i = 0; i < 9; i++) g.add(put(box(1.4 + (i % 3) * 0.5, 0.025, 0.06, 0xdff1fa, { noOutline: true }), -9 + i * 2.3, y + 0.02, z + ((i * 7) % 5) - 2));
  }
  function tier(g, w, h, d, y, z, wall, roof) {
    g.add(put(box(w, h, d, wall), 0, y + h / 2, z));
    var r = cone(Math.max(w, d) * 0.78, h * 0.8, 4, roof); r.rotation.y = Math.PI / 4; g.add(put(r, 0, y + h + h * 0.4, z));
  }
  function flame3(g, x, y, z, s) {
    var c1 = cone(0.5 * s, 1.5 * s, 7, 0xd8442c, { basic: true, noOutline: true });
    var c2 = cone(0.28 * s, 0.95 * s, 7, 0xf2b84a, { basic: true, noOutline: true });
    g.add(put(c1, x, y + 0.75 * s, z)); g.add(put(c2, x + 0.05, y + 0.5 * s, z + 0.15));
  }
  function tent(g, x, z, flag) {
    var c = cone(1.5, 2.2, 4, 0xeee4cc); c.rotation.y = Math.PI / 4; g.add(put(c, x, 1.1, z));
    if (flag) { g.add(put(cyl(0.03, 0.03, 1, 6, 0x5b4a33), x, 2.6, z)); g.add(put(box(0.5, 0.3, 0.02, 0xb23a2b, { noOutline: true }), x + 0.28, 2.85, z)); }
  }
  function mountain(g, x, z, r, h, color) {
    g.add(put(cone(r, h, 7, color || 0x9aa5b2, { ol: 1.02 }), x, h / 2 - 0.2, z));
    g.add(put(cone(r * 0.32, h * 0.3, 7, 0xf6f4ee, { noOutline: true }), x, h - h * 0.15 - 0.2, z));
  }

  var SKY = { village: 0xf3e2c0, road: 0xf1dfc0, hall: 0xe9dfc7, castle: 0xdbe6ee, wall: 0xdbe6ee, river: 0xdceaf0, field: 0xe9dcc2, flood: 0xcfdde6, night: 0x1d2036, temple: 0x1d2036, sea: 0xf0e0c4, tea: 0xe8eed6, mount: 0xf1dfc0, camp: 0xe2e7ee, room: 0xe9dfc7 };
  var ENV = {
    village: function (g) {
      g.add(put(ground(0xcdbf8a), 0, 0, 0)); sun(g, 5, 6, -16, 1.8);
      g.add(put(box(3.4, 2.2, 2.6, 0xe8dcc0), -6.2, 1.1, -5)); var r = cone(3, 1.6, 4, 0x5b4a33); r.rotation.y = Math.PI / 4; g.add(put(r, -6.2, 3.0, -5));
      g.add(put(box(0.7, 1.2, 0.1, 0x7d6a47, { noOutline: true }), -6.2, 0.6, -3.65));
      for (var i = 0; i < 6; i++) g.add(put(cyl(0.07, 0.07, 1.1, 6, 0xa7802f), 2.2 + i * 0.8, 0.55, -3));
      for (var j = 0; j < 14; j++) g.add(put(cone(0.1, 0.8, 5, 0xc8aa4e, { noOutline: true }), -1 + (j % 7) * 0.7, 0.4, -7 - Math.floor(j / 7) * 1.2));
      var h1 = sph(5, 0xb8b078, { noOutline: true }); h1.scale.set(1.6, 0.5, 0.8); g.add(put(h1, -9, -1, -13)); var h2 = sph(5, 0xa9a56c, { noOutline: true }); h2.scale.set(1.8, 0.45, 0.8); g.add(put(h2, 8, -1.2, -15));
    },
    road: function (g) {
      g.add(put(ground(0xb9ae82), 0, 0, 0)); var p = new T.Mesh(G('pathp', function () { return new T.PlaneGeometry(3.4, 40); }), toon(0xd9c9a0)); p.rotation.x = -Math.PI / 2; p.position.set(0, 0.02, -10); g.add(p);
      sun(g, 5, 5.5, -17, 1.5); mountain(g, -8, -14, 4, 5, 0x8f9aa6); mountain(g, 0, -17, 5, 6.4, 0x9aa5b2); mountain(g, 9, -14, 4, 4.8, 0x8f9aa6);
      pine(g, -5.5, -4, 1.1); pine(g, 6.2, -5, 1.3); pine(g, -9, -8, 1);
    },
    hall: function (g) {
      g.add(put(ground(0xd8c9a0), 0, 0, 0));
      g.add(put(box(40, 7, 0.4, 0xf0e8d2), 0, 3.5, -5));
      for (var i = -6; i <= 6; i++) g.add(put(box(0.07, 7, 0.1, 0x6b5a42, { noOutline: true }), i * 1.7, 3.5, -4.75));
      [0.6, 3.4, 6.2].forEach(function (y) { g.add(put(box(40, 0.09, 0.1, 0x6b5a42, { noOutline: true }), 0, y, -4.75)); });
      g.add(put(box(1.6, 3.2, 0.06, 0xfaf6ea), 0, 3.6, -4.65)); g.add(put(box(0.5, 0.5, 0.04, 0xb23a2b, { noOutline: true }), 0, 3.9, -4.6));
      [-8, 8].forEach(function (x) { g.add(put(box(0.5, 7, 0.5, 0x6b5a42), x, 3.5, -4.4)); });
      for (var k = -5; k <= 5; k++) g.add(put(box(0.04, 0.02, 12, 0xb5a77f, { noOutline: true }), k * 1.6, 0.02, -2));
    },
    castle: function (g) {
      g.add(put(ground(0xbdb59a), 0, 0, 0)); g.add(put(box(18, 1.2, 2, 0xa6a08c), 0, 0.6, -6)); g.add(put(box(14, 0.3, 2.3, 0xc9c3ad), 0, 1.35, -6));
      tier(g, 6, 2.2, 4.4, 1.5, -9, 0xf0ead8, 0x4a4a52); tier(g, 4.4, 1.8, 3.2, 4.4, -9, 0xf0ead8, 0x4a4a52); tier(g, 3, 1.5, 2.2, 7.1, -9, 0xf0ead8, 0x4a4a52);
      g.add(put(cyl(0.04, 0.04, 2, 6, 0x5b4a33), 0, 10.4, -9)); g.add(put(box(0.8, 0.45, 0.02, 0xb23a2b, { noOutline: true }), 0.42, 11, -9));
      mountain(g, -11, -18, 5, 6, 0x9fb0b8); mountain(g, 12, -20, 5, 5, 0xaebcc2);
    },
    wall: function (g) {
      g.add(put(ground(0xbdb59a), 0, 0, 0));
      g.add(put(box(7, 2.6, 0.9, 0xd8d0b8), -5, 1.3, -3.6)); g.add(put(box(7, 2.6, 0.9, 0xd8d0b8), 5.6, 1.3, -3.6));
      g.add(put(box(2, 1, 0.9, 0xd8d0b8), -0.4, 0.5, -3.6)); g.add(put(box(0.8, 0.6, 0.8, 0xc9c1a8), 0.9, 0.3, -3.2));
      [-1.6, 1.6].forEach(function (x) { g.add(put(cyl(0.07, 0.07, 4.2, 6, 0x7d6a47), x, 2.1, -2.8)); });
      [1.2, 2.4, 3.6].forEach(function (y) { g.add(put(box(3.4, 0.09, 0.09, 0x7d6a47, { noOutline: true }), 0, y, -2.8)); });
      tier(g, 6, 2, 4, 2.6, -9, 0xf0ead8, 0x4a4a52);
    },
    river: function (g) {
      g.add(put(ground(0xaec08a), 0, 0, 0)); water(g, 0.04, 0x5a8fb0, -5.5, 80, 7);
      mountain(g, -9, -17, 5, 6, 0x8f9aa6); mountain(g, 8, -18, 5, 5.2, 0x9aa5b2);
      for (var i = 0; i < 4; i++) { var l = cyl(0.22, 0.22, 3, 10, 0xa57d4b); l.rotation.z = Math.PI / 2; l.rotation.y = 0.2; g.add(put(l, -4 + i * 3.2, 0.2, -5 + (i % 2) * 0.8)); }
      pine(g, -7, -9, 1.2); pine(g, 7.5, -10, 1.4);
    },
    field: function (g) {
      g.add(put(ground(0xb7b17c), 0, 0, 0)); mountain(g, 0, -20, 7, 5, 0x9aa5b2);
      [-6, 6.4].forEach(function (x) { g.add(put(cyl(0.05, 0.05, 4.2, 6, 0x5b4a33), x, 2.1, -4)); g.add(put(box(1.3, 1.0, 0.03, 0xb23a2b, { noOutline: true }), x + 0.7, 3.5, -4)); });
      for (var i = 0; i < 14; i++) { g.add(put(cyl(0.02, 0.02, 1.8, 4, 0x5b4a33, { noOutline: true }), -9 + i * 1.4, 0.9, -9)); g.add(put(cone(0.06, 0.24, 4, 0xcfcfd4, { noOutline: true }), -9 + i * 1.4, 1.9, -9)); }
    },
    flood: function (g) {
      g.add(put(ground(0xaab38a), 0, -0.2, 0)); water(g, 0.45, 0x4f86a6, -3, 80, 30);
      g.add(put(box(4, 0.8, 4, 0xa6a08c), 0, 0.5, -8)); tier(g, 3, 1.6, 2.4, 0.9, -8, 0xf0ead8, 0x4a4a52);
      g.add(put(box(9, 1.2, 1.2, 0x8a7a5a), -10, 0.6, -5)); g.add(put(box(9, 1.2, 1.2, 0x8a7a5a), 10, 0.6, -5));
      mountain(g, -12, -20, 6, 6, 0x9fb0b8); mountain(g, 13, -20, 6, 5, 0xaebcc2);
    },
    night: function (g) {
      g.add(put(ground(0x2a2e3f), 0, 0, 0)); g.add(put(sph(1.2, 0xf4ead2, { basic: true, noOutline: true }), 7, 7, -18));
      for (var i = 0; i < 16; i++) g.add(put(sph(0.06, 0xf4ead2, { basic: true, noOutline: true }), -12 + (i * 37) % 24, 5 + (i * 13) % 8, -20));
    },
    temple: function (g) {
      ENV.night(g);
      g.add(put(box(9, 3, 4.4, 0x7d6a47), 0, 1.5, -6));
      var r = cone(7, 2, 4, 0x2b2420); r.rotation.y = Math.PI / 4; r.scale.set(1.15, 1, 0.7); g.add(put(r, 0, 4, -6));
      [-3, 0, 3].forEach(function (x) { g.add(put(box(1.4, 1.8, 0.1, 0xe2c27a, { noOutline: true }), x, 1.1, -3.75)); });
      flame3(g, -3.4, 2.6, -4, 1.9); flame3(g, 0, 3.8, -5, 2.6); flame3(g, 3.2, 2.6, -4, 2.1); flame3(g, 5.5, 0.2, -3, 1.2);
    },
    sea: function (g) {
      g.add(put(ground(0x4f86a6, 90, 60), 0, -0.1, 0)); water(g, 0.0, 0x5a8fb0, -2, 90, 40); sun(g, -6, 5.5, -18, 2);
      [[4, -6, 1], [-2, -11, 0.8], [9, -9, 0.7]].forEach(function (s) {
        var hull = box(4 * s[2], 0.9 * s[2], 1.4 * s[2], 0x7d6a47); g.add(put(hull, s[0], 0.5, s[1]));
        g.add(put(cyl(0.07, 0.07, 4 * s[2], 6, 0x5b4a33), s[0], 2.6 * s[2] + 0.3, s[1]));
        g.add(put(box(2.2 * s[2], 2.6 * s[2], 0.05, 0xf4f0e4), s[0], 2.4 * s[2] + 0.3, s[1] + 0.1));
      });
    },
    tea: function (g) {
      g.add(put(ground(0xb9c48e), 0, 0, 0));
      g.add(put(box(4.4, 2.4, 3, 0xe8dcc0), 6, 1.2, -5)); var rf = cone(4.2, 1.6, 4, 0x4a4a52); rf.rotation.y = Math.PI / 4; rf.scale.set(1.1, 1, 0.8); g.add(put(rf, 6, 3.2, -5));
      g.add(put(cyl(0.2, 0.28, 2.4, 8, 0x6b5238), -6.5, 1.2, -4)); [[0, 3, 0], [-1.3, 2.6, 0.4], [1.3, 2.7, -0.3], [0, 3.6, 0.3]].forEach(function (o) { g.add(put(sph(1.3, 0xf0b5c0, { noOutline: true }), -6.5 + o[0], o[1], -4 + o[2])); });
      g.add(put(cyl(0.04, 0.04, 2.4, 6, 0x5b4a33), 1.5, 1.2, -4)); var um = cone(1.7, 0.7, 14, 0xb23a2b); g.add(put(um, 1.5, 2.55, -4));
      mountain(g, 0, -20, 6, 5, 0xaebcc2);
    },
    mount: function (g) {
      g.add(put(ground(0xb9ae82), 0, 0, 0)); sun(g, 6, 6, -22, 2.2);
      mountain(g, -9, -10, 5, 8, 0x8f9aa6); mountain(g, 1, -14, 7, 10.5, 0x9aa5b2); mountain(g, 11, -11, 5, 7, 0x8f9aa6);
      pine(g, -6, -3, 1.2); pine(g, 7, -4, 1.1);
    },
    camp: function (g) {
      g.add(put(ground(0xb7b17c), 0, 0, 0)); var hill = sph(7, 0xa9a56c, { noOutline: true }); hill.scale.set(1.8, 0.55, 1); g.add(put(hill, 7, -2.8, -12));
      tier(g, 3.6, 1.6, 2.6, 0.8, -12, 0xf0ead8, 0x4a4a52); tier(g, 2.4, 1.3, 1.8, 3.2, -12, 0xf0ead8, 0x4a4a52);
      tent(g, -7, -3, true); tent(g, -3.5, -5, false); tent(g, 8, -3.5, true); tent(g, 4.5, -6, false);
      mountain(g, -12, -20, 6, 6, 0x9fb0b8);
    }
  };
  ENV.room = ENV.hall;

  /* ---------- Эффекты ---------- */
  function textSprite(txt, color) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'); x.font = '700 110px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 12; x.strokeStyle = '#1b1714'; x.strokeText(txt, 64, 70); x.fillStyle = color; x.fillText(txt, 64, 70);
    var t = new T.CanvasTexture(c); var s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true }));
    s.scale.set(1.6, 1.6, 1); return s;
  }
  function wx(x) { return (x - 160) / 28; }
  function wy(y) { return Math.max(0.3, (220 - y) / 220 * 6.4); }
  function addFx(g, f) {
    var x = wx(f.x || 160), y = wy(f.y || 110), s = f.s || 1;
    switch (f.t) {
      case 'flame': flame3(g, x, 0.1, 1, 0.9 * s); break;
      case 'spark': var sp = mesh(G('oct', function () { return new T.OctahedronGeometry(0.28, 0); }), 0xe5b84a, { basic: true }); sp.scale.set(1, 1.5, 1); g.add(put(sp, x, y, 1.5)); break;
      case 'sweat': g.add(put(sph(0.1, 0x8ec5e8, { noOutline: true }), x, y, 1.6)); break;
      case 'bang': var b = textSprite(f.txt || '!', '#d65a45'); g.add(put(b, x, y + 0.6, 2)); break;
      case 'vein': var v = textSprite('#', '#d65a45'); v.scale.set(0.8, 0.8, 1); g.add(put(v, x, y, 2)); break;
      case 'dust': for (var i = 0; i < 4; i++) g.add(put(sph(0.2 + i * 0.05, 0xcfc6ad, { noOutline: true, mat: { transparent: true, opacity: 0.55 } }), x + i * 0.4, 0.25 + i * 0.1, 1.2)); break;
      case 'swords': var s1 = box(0.1, 1.8, 0.05, 0xcfcfd4), s2 = box(0.1, 1.8, 0.05, 0xcfcfd4); s1.rotation.z = 0.7; s2.rotation.z = -0.7; g.add(put(s1, x + 0.7, y, 1.3)); g.add(put(s2, x + 0.7, y, 1.3)); break;
      case 'rain': for (var r = 0; r < 70; r++) { var d = box(0.025, 0.6, 0.025, 0xdfe9f1, { noOutline: true, basic: true }); d.rotation.z = 0.2; g.add(put(d, -9 + (r * 31) % 18, 0.5 + (r * 17) % 7, -3 + (r * 13) % 8)); } break;
      case 'speed': for (var q = 0; q < 12; q++) { var l = box(1.8 + (q % 3), 0.02, 0.02, 0xffffff, { noOutline: true, basic: true }); g.add(put(l, -8 + (q * 29) % 16, 0.6 + (q * 19) % 6, 2.5)); } break;
    }
  }

  function hasFlame(panel) { return (panel.fx || []).some(function (f) { return f.t === 'flame'; }); }
  function skyTexture(col, dark) {
    var c = document.createElement('canvas'); c.width = 8; c.height = 256; var x = c.getContext('2d');
    var base = new T.Color(col), top = base.clone().multiplyScalar(dark ? 0.55 : 0.8).lerp(new T.Color(dark ? 0x0a0c18 : 0x6f9bd0), dark ? 0.4 : 0.55);
    var g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#' + top.getHexString()); g.addColorStop(0.62, '#' + base.getHexString()); g.addColorStop(1, '#' + base.clone().lerp(new T.Color(0xfff2d8), dark ? 0 : 0.35).getHexString());
    x.fillStyle = g; x.fillRect(0, 0, 8, 256);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  /* ---------- Сборка панели ---------- */
  function build(panel) {
    var scene = new T.Scene(), skyCol = SKY[panel.s] || 0xe9dfc7;
    var dark = panel.s === 'night' || panel.s === 'temple', real = STYLE === 'real';
    scene.background = real ? skyTexture(skyCol, dark) : new T.Color(skyCol);
    if (panel.s !== 'hall' && panel.s !== 'room') scene.fog = new T.Fog(skyCol, real ? 22 : 18, real ? 60 : 48);
    if (real) {
      scene.add(new T.HemisphereLight(dark ? 0x6f7fb0 : 0xcfe0f2, dark ? 0x1a1c2a : 0x8c7a5a, dark ? 0.55 : 0.75));
      var dl = new T.DirectionalLight(dark ? 0x9fb0ff : 0xffe2b8, dark ? 0.9 : 2.1); dl.position.set(-6, 10, 8);
      dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); dl.shadow.bias = -0.0004; dl.shadow.normalBias = 0.03; dl.shadow.radius = 4;
      var sc = dl.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 12; sc.bottom = -8; sc.near = 1; sc.far = 40; scene.add(dl);
      var rim = new T.DirectionalLight(dark ? 0x7f95ff : 0xaecbff, 0.8); rim.position.set(8, 4, -6); scene.add(rim);
      if (panel.s === 'temple') { var fl = new T.PointLight(0xff7a3a, 90, 22, 1.6); fl.position.set(0, 3.5, -2); scene.add(fl); }
      if (hasFlame(panel)) { var fl2 = new T.PointLight(0xff8a44, 40, 14, 1.8); fl2.position.set(0, 2.2, 1.5); scene.add(fl2); }
    } else {
      scene.add(new T.HemisphereLight(dark ? 0x7f8fc0 : 0xffffff, dark ? 0x2a2e3f : 0xb9a98a, dark ? 0.9 : 1.15));
      var dl2 = new T.DirectionalLight(dark ? 0xaab8ff : 0xfff1d6, dark ? 0.7 : 1.0); dl2.position.set(5, 9, 8); scene.add(dl2);
    }
    var env = new T.Group(); (ENV[panel.s] || ENV.village)(env); scene.add(env);

    var chars = panel.c || [];
    var closeup = chars.length === 1 && chars[0].s >= 1.5;
    chars.forEach(function (c, i) {
      var ch = character(c, closeup);
      var x = closeup ? 0 : wx(c.x), z = closeup ? 0 : (c.y - 212) / 30 + i * 0.01;
      ch.position.set(x, 0, z);
      ch.rotation.y = closeup ? 0.12 : (c.flip ? -0.55 : 0.55);
      if (chars.length === 1 && !closeup) ch.rotation.y = c.flip ? -0.25 : 0.25;
      scene.add(ch);
    });
    (panel.fx || []).forEach(function (f) { addFx(scene, f); });

    var cam = new T.PerspectiveCamera(closeup ? 36 : 38, 1.45, 0.1, 120);
    var view = closeup ? { r: 4.7, ty: 1.95 } : { r: 9.4, ty: 1.9 };
    return { scene: scene, cam: cam, view: view, yaw: 0, pitch: 0 };
  }

  function place(st, aspect) {
    var v = st.view, cam = st.cam;
    cam.aspect = aspect;
    // для узких панелей отодвигаем камеру, чтобы сцена не обрезалась по бокам
    var k = aspect < 1.45 ? 1.45 / aspect : 1, r = v.r * (st.view.r > 6 ? Math.min(k, 1.5) : 1);
    var cp = Math.cos(st.pitch), y = v.ty + 0.55 + Math.sin(st.pitch) * r;
    cam.position.set(Math.sin(st.yaw) * r * cp, y, Math.cos(st.yaw) * r * cp);
    cam.lookAt(0, v.ty, 0); cam.updateProjectionMatrix();
  }

  function draw(st, canvas) {
    var host = canvas.parentNode || canvas, w = Math.max(2, host.clientWidth), h = Math.max(2, host.clientHeight), dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.toneMapping = STYLE === 'real' ? T.ACESFilmicToneMapping : T.NoToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    place(st, w / h);
    renderer.render(st.scene, st.cam);
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext('2d'); ctx.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height);
  }

  function disposeState(st) {
    if (!st) return;
    st.scene.traverse(function (o) { if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); } });
  }

  /* ---------- Подключение к странице ---------- */
  var mounted = [], active = null, io = null, queue = [], busy = false;

  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    requestAnimationFrame(function () {
      var job = queue.shift();
      try { var st = build(job.panel); draw(st, job.canvas); job.stage.classList.add('is3d'); if (!job.keep) disposeState(st); else setActive(job, st); }
      catch (e) { job.stage.classList.remove('is3d'); }
      busy = false; pump();
    });
  }
  function setActive(job, st) { if (active && active.st !== st) disposeState(active.st); active = { job: job, st: st }; }

  function mountAll(root, panels, style) {
    if (!init()) return false;
    unmount(); STYLE = style === 'toon' ? 'toon' : 'real';
    var stages = root.querySelectorAll('.panel .stage');
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { io.unobserve(e.target); var j = e.target._job; if (j) { queue.push(j); pump(); } }
        });
      }, { rootMargin: '300px' });
    }
    stages.forEach(function (stage, i) {
      var panel = panels[i]; if (!panel) return;
      var canvas = document.createElement('canvas'); canvas.className = 'c3d';
      stage.insertBefore(canvas, stage.firstChild);
      var job = { panel: panel, canvas: canvas, stage: stage };
      mounted.push(job); stage._job = job;
      bindDrag(job);
      if (io) io.observe(stage); else { queue.push(job); pump(); }
    });
    return true;
  }

  function bindDrag(job) {
    var c = job.canvas, down = null, raf = 0;
    function frame() { raf = 0; if (active && active.job === job) draw(active.st, c); }
    c.addEventListener('pointerdown', function (e) {
      down = { x: e.clientX, y: e.clientY };
      if (!(active && active.job === job)) { setActive(job, build(job.panel)); }
      try { c.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      job.stage.classList.add('dragging');
    });
    c.addEventListener('pointermove', function (e) {
      if (!down || !active || active.job !== job) return;
      var st = active.st;
      st.yaw = Math.max(-0.9, Math.min(0.9, st.yaw - (e.clientX - down.x) * 0.006));
      st.pitch = Math.max(-0.1, Math.min(0.35, st.pitch + (e.clientY - down.y) * 0.003));
      down = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(frame);
    });
    function up() { down = null; job.stage.classList.remove('dragging'); }
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('dblclick', function () { if (active && active.job === job) { active.st.yaw = 0; active.st.pitch = 0; draw(active.st, c); } });
  }

  function unmount() {
    if (io) { io.disconnect(); io = null; }
    queue = []; if (active) { disposeState(active.st); active = null; }
    mounted = [];
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { mounted.forEach(function (j) { if (j.stage.classList.contains('is3d') && j.canvas.isConnected) { queue.push(j); } }); pump(); }, 250);
  });

  window.Comic3D = { get ok() { return init(); }, mountAll: mountAll, unmount: unmount };
})();
