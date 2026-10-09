/* Мини-игра «Тень Хидэёси»: стелс-платформер по эпизодам книги.
   Оригинальные персонажи и уровни; рисуется на canvas, работает офлайн. */
(function () {
  var ACC = '#e0523f', GOLD = '#e5b84a', LIGHT = '#f6ecd0', DARK = '#0e0d14';
  var GY = 330;           // уровень земли (логические пиксели)

  var SKIES = {
    dawn:  { sky: ['#e8935a', '#f8d49b'], far: '#c47a5c', mid: '#82505a', gnd: '#17141d', sun: '#fff2cf', dark: false },
    dusk:  { sky: ['#b8605a', '#f0b27a'], far: '#a65a58', mid: '#6a3f52', gnd: '#15121b', sun: '#ffe9bd', dark: false },
    night: { sky: ['#14183a', '#3d3b72'], far: '#2e3566', mid: '#222854', gnd: '#0b0c18', sun: '#f4ead2', dark: true },
    ember: { sky: ['#2a0f1c', '#8a3326'], far: '#4a1c2a', mid: '#341521', gnd: '#0c0709', sun: '#ffb06a', dark: true }
  };

  var LEVELS = [
    { id: 1, ep: 'sandals', title: 'Тёплые сандалии', sky: 'dawn', W: 2300, par: 70, stones: 2,
      intro: 'Холодное утро в замке Киёсу. Донеси сандалии Нобунаге, пока стража не подняла тревогу. Прячься в кустах и тени крыш.',
      hides: [{ x: 420, k: 'bush' }, { x: 880, k: 'crate' }, { x: 1460, k: 'bush' }, { x: 1880, k: 'crate' }],
      shades: [[560, 790], [1180, 1380], [1990, 2160]],
      guards: [{ a: 520, b: 1020, sp: 55, look: 230 }, { a: 1260, b: 1760, sp: 60, look: 230 }],
      props: [{ k: 'house', x: 150 }, { k: 'house', x: 680 }, { k: 'tree', x: 1050 }, { k: 'house', x: 1280 }, { k: 'tree', x: 1600 }, { k: 'house', x: 2060 }],
      exit: 2230, who: 'nobu' },
    { id: 2, ep: 'mino', title: 'Ночная встреча', sky: 'night', W: 2700, par: 90, stones: 3,
      intro: 'Ночь в Мино. Доставь тайное послание вассалу в шатре. Свет фонарей выдаёт тебя — крадись по темноте, а стражу отвлекай камнями.',
      hides: [{ x: 700, k: 'curtain' }, { x: 1540, k: 'curtain' }, { x: 2200, k: 'crate' }],
      lamps: [{ x: 520, r: 190 }, { x: 1320, r: 210 }, { x: 2060, r: 190 }],
      guards: [{ a: 380, b: 860, sp: 55, look: 250 }, { a: 1120, b: 1680, sp: 60, look: 260 }, { a: 1900, b: 2380, sp: 60, look: 250 }],
      props: [{ k: 'tent', x: 260 }, { k: 'tree', x: 900 }, { k: 'tent', x: 1000 }, { k: 'tree', x: 1800 }, { k: 'tent', x: 2400 }],
      exit: 2620, who: 'sam' },
    { id: 3, ep: 'honnoji', title: 'Пламя Хоннодзи', sky: 'ember', W: 3000, par: 100, stones: 3,
      intro: 'Храм горит. Пробейся через двор к коню и унеси весть. Огонь освещает и выдаёт, а горящие балки смертельны — обходи их по тени.',
      hides: [{ x: 600, k: 'crate' }, { x: 1250, k: 'crate' }, { x: 1950, k: 'curtain' }, { x: 2500, k: 'crate' }],
      lamps: [{ x: 900, r: 170, fire: true }, { x: 1720, r: 180, fire: true }, { x: 2300, r: 170, fire: true }],
      fires: [{ x: 880, w: 70 }, { x: 1700, w: 70 }],
      guards: [{ a: 400, b: 800, sp: 62, look: 250 }, { a: 1050, b: 1550, sp: 62, look: 260 }, { a: 1850, b: 2250, sp: 66, look: 260 }],
      props: [{ k: 'temple', x: 900 }, { k: 'temple', x: 1720 }, { k: 'tree', x: 400 }, { k: 'temple', x: 2300 }],
      exit: 2920, who: 'hide' },
    { id: 4, ep: 'odawara', title: 'Ночь перед сдачей', sky: 'dusk', W: 3300, par: 120, stones: 3,
      intro: 'Лагерь под Одаварой. Проведи переговорщика к воротам замка через два кордона. Время и терпение — главное оружие Хидэёси.',
      hides: [{ x: 500, k: 'bush' }, { x: 1050, k: 'crate' }, { x: 1500, k: 'bush' }, { x: 2050, k: 'crate' }, { x: 2650, k: 'bush' }],
      shades: [[700, 900], [1700, 1900], [2300, 2480]],
      guards: [{ a: 380, b: 860, sp: 60, look: 250 }, { a: 1150, b: 1620, sp: 64, look: 260 }, { a: 1800, b: 2250, sp: 66, look: 260 }, { a: 2420, b: 2900, sp: 70, look: 270 }],
      props: [{ k: 'tent', x: 220 }, { k: 'tent', x: 800 }, { k: 'tree', x: 1300 }, { k: 'tent', x: 1900 }, { k: 'tent', x: 2380 }, { k: 'castle', x: 3100 }],
      exit: 3230, who: 'nobu' }
  ];

  var G = null;                 // состояние текущей игры
  var raf = 0, listeners = [];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stars() { return (window.Store && Store.get('game-stars', {})) || {}; }

  /* ---------- Страницы ---------- */
  function view(id) {
    var n = +id;
    if (!n || !LEVELS[n - 1]) return list();
    var L = LEVELS[n - 1];
    return '<div class="game-wrap fade-in"><div class="game-head"><a href="#/game" class="muted">← Уровни</a><b>' + esc(n + '. ' + L.title) + '</b><span id="gHud" class="muted"></span></div>' +
      '<div class="game-stage" id="gStage"><canvas id="gCanvas" aria-label="Игровое поле"></canvas><div class="game-overlay" id="gOv"></div></div>' +
      '<div class="game-pad" id="gPad"><div class="pad-move"><button data-k="left" aria-label="Влево">◀</button><button data-k="right" aria-label="Вправо">▶</button></div>' +
      '<div class="pad-act"><button data-k="run">Бег</button><button data-k="hide">Присесть</button><button data-k="stone">Камень</button></div></div>' +
      '<p class="muted game-keys">← → / A D — идти (тихо) · Shift — бежать (шумно) · ↓ / S — присесть и спрятаться · Пробел — бросить камень, чтобы отвлечь стражу</p></div>';
  }
  function list() {
    var st = stars();
    return '<div class="game-wrap fade-in"><div class="eyebrow">Мини-игра</div><h1>Тень Хидэёси</h1>' +
      '<p class="lead">Стелс-платформер по эпизодам книги. Не попадайся на глаза страже, используй тень, кусты и камни, доберись до цели.</p>' +
      '<div class="grid" style="margin-top:22px">' + LEVELS.map(function (L, i) {
        var s = st[L.id] || 0;
        return '<a class="card" href="#/game/' + L.id + '"><div class="num">Уровень ' + L.id + ' · ' + (s ? '★'.repeat(s) + '☆'.repeat(3 - s) : '☆☆☆') + '</div><h3>' + esc(L.title) + '</h3><p>' + esc(L.intro) + '</p></a>';
      }).join('') + '</div></div>';
  }

  /* ---------- Запуск ---------- */
  function bind(id) {
    stop();
    var L = LEVELS[(+id) - 1]; if (!L) return;
    var stage = document.getElementById('gStage'), cv = document.getElementById('gCanvas');
    if (!stage || !cv) return;
    G = { L: L, cv: cv, ctx: cv.getContext('2d'), keys: {}, t: 0, state: 'intro', time: 0, stones: L.stones, maxAlert: 0, stoneList: [], noise: [], puffs: [], scarf: [] };
    resize();
    reset();
    overlay('intro');
    on(window, 'resize', resize);
    on(window, 'keydown', function (e) { keyChange(e, true); });
    on(window, 'keyup', function (e) { keyChange(e, false); });
    on(document, 'visibilitychange', function () { if (document.hidden && G && G.state === 'play') { G.state = 'pause'; overlay('pause'); } });
    bindPad();
    var last = performance.now();
    function loop(now) {
      if (!G) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      update(dt); draw();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  function on(t, ev, fn) { t.addEventListener(ev, fn); listeners.push([t, ev, fn]); }
  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); }); listeners = [];
    G = null;
  }

  function resize() {
    if (!G) return;
    var st = document.getElementById('gStage'); if (!st) return;
    var w = Math.min(960, st.clientWidth || 640), dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.VW = w < 600 ? 520 : 760; G.VH = Math.round(G.VW * 9 / 16);
    G.cv.width = Math.round(w * dpr); G.cv.height = Math.round(w * 9 / 16 * dpr);
    G.cv.style.height = Math.round(w * 9 / 16) + 'px';
    G.k = G.cv.width / G.VW;
    G.gy = Math.round(G.VH * 0.8);
  }

  function reset() {
    var L = G.L;
    G.p = { x: 90, face: 1, moving: false, run: false, crouch: 0, hid: false, tPhase: 0, exposed: false };
    G.guards = (L.guards || []).map(function (g) { return { x: g.a + 40, a: g.a, b: g.b, sp: g.sp, look: g.look, face: 1, m: 0, mode: 'patrol', wait: 0, tx: 0, tw: 0, ph: Math.random() * 6 }; });
    G.stones = L.stones; G.stoneList = []; G.noise = []; G.puffs = []; G.time = 0; G.maxAlert = 0; G.scarf = [];
    G.cam = 0;
  }

  /* ---------- Ввод ---------- */
  function keyChange(e, down) {
    var k = e.key.toLowerCase();
    var map = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', shift: 'run', arrowdown: 'hide', s: 'hide', control: 'hide', ' ': 'stone', e: 'stone' };
    var a = map[k]; if (!a || !G) return;
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    e.preventDefault();
    if (a === 'stone') { if (down && !G.keys.stone) throwStone(); G.keys.stone = down; return; }
    G.keys[a] = down;
    if (down && G.state === 'intro' && (k === 'enter' || k === ' ')) startPlay();
  }
  function bindPad() {
    document.querySelectorAll('#gPad [data-k]').forEach(function (b) {
      var k = b.dataset.k;
      function d(e) { e.preventDefault(); if (!G) return; if (G.state === 'intro') startPlay(); if (k === 'stone') { throwStone(); return; } G.keys[k] = true; b.classList.add('on'); }
      function u(e) { e.preventDefault(); if (!G) return; if (k !== 'stone') G.keys[k] = false; b.classList.remove('on'); }
      b.addEventListener('pointerdown', d); b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  function startPlay() { if (!G) return; G.state = 'play'; overlay(null); }

  function overlay(kind, extra) {
    var ov = document.getElementById('gOv'); if (!ov) return;
    if (!kind) { ov.innerHTML = ''; ov.style.display = 'none'; return; }
    var L = G.L, html = '';
    if (kind === 'intro') html = '<h2>' + esc(L.title) + '</h2><p>' + esc(L.intro) + '</p><button class="btn primary" data-go="start">Начать</button>';
    if (kind === 'pause') html = '<h2>Пауза</h2><button class="btn primary" data-go="resume">Продолжить</button>';
    if (kind === 'caught') html = '<h2>Заметили!</h2><p>Стража подняла тревогу. Попробуй пройти тише или отвлеки охрану камнем.</p><button class="btn primary" data-go="retry">Ещё раз</button><a class="btn" href="#/game">К уровням</a>';
    if (kind === 'fire') html = '<h2>Обжёгся!</h2><p>Горящие балки смертельны. Обходи их по тёмной стороне.</p><button class="btn primary" data-go="retry">Ещё раз</button><a class="btn" href="#/game">К уровням</a>';
    if (kind === 'win') {
      var s = extra.stars;
      html = '<h2>Путь пройден</h2><div class="stars">' + '★'.repeat(s) + '<span>' + '★'.repeat(3 - s) + '</span></div><p>Время: ' + extra.time + ' с' + (extra.maxAlert < 0.5 ? ' · тревоги не было' : '') + '</p>' +
        (LEVELS[L.id] ? '<a class="btn primary" href="#/game/' + (L.id + 1) + '">Дальше</a>' : '<a class="btn primary" href="#/game">Все уровни</a>') +
        '<button class="btn" data-go="retry">Заново</button><a class="btn" href="#/comic/' + L.ep + '">Эпизод в комиксе</a>';
    }
    ov.innerHTML = html; ov.style.display = 'flex';
    ov.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.dataset.go;
        if (g === 'start' || g === 'resume') startPlay();
        if (g === 'retry') { reset(); G.state = 'play'; overlay(null); }
      });
    });
  }

  /* ---------- Логика ---------- */
  function inSpot(x) { return (G.L.hides || []).some(function (h) { return Math.abs(h.x - x) < 34; }); }
  function inShade(x) { return (G.L.shades || []).some(function (s) { return x > s[0] && x < s[1]; }); }
  function inLight(x) { return (G.L.lamps || []).some(function (l) { return Math.abs(l.x - x) < l.r; }); }
  function exposed() {
    var p = G.p;
    if (p.hid) return false;
    var dark = SKIES[G.L.sky].dark;
    if (dark) return inLight(p.x);
    return !inShade(p.x);
  }

  function makeNoise(x, r, kind) {
    G.noise.push({ x: x, r: r, t: 0, kind: kind });
    G.guards.forEach(function (g) {
      if (g.m > 0.9) return;
      if (Math.abs(g.x - x) < r) { g.mode = 'invest'; g.tx = x; g.tw = 0; }
    });
  }
  function throwStone() {
    if (!G || G.state !== 'play' || G.stones <= 0) return;
    G.stones--;
    var p = G.p;
    G.stoneList.push({ x: p.x + p.face * 18, y: G.gy - 70, tx: p.x + p.face * 230, t: 0, x0: p.x + p.face * 18 });
  }

  function update(dt) {
    var g = G; g.t += dt;
    if (g.state !== 'play') { g.p.moving = false; return; }
    g.time += dt;
    var p = g.p, k = g.keys, L = g.L;
    var dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    p.run = !!k.run && dir !== 0;
    var want = !!k.hide;
    p.crouch += ((want ? 1 : 0) - p.crouch) * Math.min(1, dt * 12);
    var speed = want ? 0 : (p.run ? 215 : 105);
    if (dir) { p.face = dir; p.x += dir * speed * dt; }
    p.x = Math.max(30, Math.min(L.W - 20, p.x));
    p.moving = dir !== 0 && speed > 0;
    if (p.moving) p.tPhase += dt * (p.run ? 1.7 : 1);
    p.hid = want && p.crouch > 0.6 && inSpot(p.x);
    p.exposed = exposed();
    if (p.run && dir) { g.noiseT = (g.noiseT || 0) - dt; if (g.noiseT <= 0) { g.noiseT = 0.45; makeNoise(p.x, 150, 'step'); } g.puffs.push({ x: p.x - dir * 8, y: g.gy, t: 0 }); }

    // огонь
    (L.fires || []).forEach(function (f) { if (Math.abs(p.x - f.x) < f.w / 2 + 8) { g.state = 'dead'; overlay('fire'); } });

    // камни
    g.stoneList.forEach(function (s) {
      s.t += dt / 0.55; var u = Math.min(1, s.t);
      s.x = s.x0 + (s.tx - s.x0) * u; s.y = g.gy - 70 - Math.sin(u * Math.PI) * 60 + u * 70;
      if (u >= 1 && !s.done) { s.done = true; makeNoise(s.tx, 280, 'stone'); }
    });
    g.stoneList = g.stoneList.filter(function (s) { return !s.done || s.t < 1.2; });
    g.noise.forEach(function (n) { n.t += dt * 1.6; });
    g.noise = g.noise.filter(function (n) { return n.t < 1; });
    g.puffs.forEach(function (q) { q.t += dt * 2.2; }); g.puffs = g.puffs.filter(function (q) { return q.t < 1; });

    // стража
    g.guards.forEach(function (gd) {
      gd.ph += dt;
      if (gd.mode === 'patrol') {
        if (gd.wait > 0) gd.wait -= dt;
        else {
          gd.x += gd.face * gd.sp * dt;
          if (gd.x > gd.b) { gd.x = gd.b; gd.face = -1; gd.wait = 0.9; }
          if (gd.x < gd.a) { gd.x = gd.a; gd.face = 1; gd.wait = 0.9; }
        }
      } else if (gd.mode === 'invest') {
        var d = gd.tx - gd.x; gd.face = d >= 0 ? 1 : -1;
        if (Math.abs(d) > 6) gd.x += gd.face * gd.sp * 1.5 * dt;
        else { gd.tw += dt; if (gd.tw > 2.6) { gd.mode = 'patrol'; gd.x = Math.max(gd.a, Math.min(gd.b, gd.x)); } }
      }
      // зрение
      var dx = p.x - gd.x, front = (dx * gd.face) > 0, dist = Math.abs(dx), seen = false;
      if (p.exposed && front && dist < gd.look) seen = true;
      if (!p.hid && dist < 46 && (p.moving || p.exposed)) seen = true;
      if (seen) gd.m += dt / (0.45 + dist / gd.look * 0.55); else gd.m = Math.max(0, gd.m - dt / 1.6);
      if (seen && gd.mode === 'patrol') { gd.mode = 'invest'; gd.tx = p.x; gd.tw = 0; }
      gd.seeing = seen;
      if (gd.m > g.maxAlert) g.maxAlert = gd.m;
      if (gd.m >= 1 && g.state === 'play') { g.state = 'dead'; overlay('caught'); }
    });

    // цель
    if (p.x >= L.exit - 24 && g.state === 'play') {
      g.state = 'win';
      var s = 1 + (g.maxAlert < 0.5 ? 1 : 0) + (g.time <= L.par ? 1 : 0);
      var all = stars(); if ((all[L.id] || 0) < s) { all[L.id] = s; Store.set('game-stars', all); }
      overlay('win', { stars: s, time: Math.round(g.time), maxAlert: g.maxAlert });
    }
    var hud = document.getElementById('gHud');
    if (hud) hud.textContent = (p.hid ? '● спрятан' : p.exposed ? '○ на виду' : '◐ в тени') + ' · камней: ' + g.stones + ' · ' + Math.round(g.time) + ' с';
    g.cam += (Math.max(0, Math.min(L.W - g.VW, p.x - g.VW * 0.38)) - g.cam) * Math.min(1, dt * 6);
  }

  /* ---------- Рисование ---------- */
  function ridge(c, cam, par, base, amp, col, seed) {
    c.fillStyle = col; c.beginPath(); c.moveTo(-10, G.VH);
    for (var x = -10; x <= G.VW + 20; x += 16) {
      var wx = x + cam * par;
      c.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(wx * 0.006 + seed)) - amp * 0.4 * Math.sin(wx * 0.017 + seed * 2.3));
    }
    c.lineTo(G.VW + 20, G.VH); c.closePath(); c.fill();
  }
  function roofPath(c, cx, y, w, h) { c.beginPath(); c.moveTo(cx - w / 2 - 10, y); c.quadraticCurveTo(cx - w / 4, y - 3, cx, y - h); c.quadraticCurveTo(cx + w / 4, y - 3, cx + w / 2 + 10, y); c.closePath(); c.fill(); }

  function drawProp(c, pr, sx, S) {
    var gy = G.gy; c.fillStyle = S.mid;
    if (pr.k === 'house') { c.fillRect(sx - 50, gy - 60, 100, 60); roofPath(c, sx, gy - 60, 100, 34); c.fillStyle = GOLD; c.globalAlpha = S.dark ? 0.85 : 0.55; c.fillRect(sx - 24, gy - 40, 14, 18); c.fillRect(sx + 10, gy - 40, 14, 18); c.globalAlpha = 1; }
    if (pr.k === 'tree') { c.fillStyle = S.mid; c.fillRect(sx - 4, gy - 70, 8, 70); [0, 1, 2].forEach(function (i) { c.beginPath(); c.arc(sx - 14 + i * 14, gy - 82 - (i % 2) * 8, 22, 0, 6.3); c.fill(); }); }
    if (pr.k === 'tent') { c.fillStyle = S.mid; c.beginPath(); c.moveTo(sx - 60, gy); c.lineTo(sx, gy - 70); c.lineTo(sx + 60, gy); c.fill(); c.fillStyle = ACC; c.fillRect(sx - 1, gy - 90, 2, 22); c.fillRect(sx + 1, gy - 90, 14, 8); }
    if (pr.k === 'temple') { c.fillRect(sx - 90, gy - 70, 180, 70); roofPath(c, sx, gy - 70, 180, 40); c.fillStyle = GOLD; c.globalAlpha = 0.7; for (var i = 0; i < 4; i++) c.fillRect(sx - 70 + i * 38, gy - 52, 20, 30); c.globalAlpha = 1; }
    if (pr.k === 'castle') { for (var t = 0; t < 3; t++) { c.fillStyle = S.mid; c.fillRect(sx - 60 + t * 12, gy - 40 - t * 40, 120 - t * 24, 28); roofPath(c, sx, gy - 40 - t * 40 - 28 + 28, 140 - t * 24, 20); } }
  }
  function lamp(c, sx, l, S) {
    var gy = G.gy, fl = 0.85 + 0.15 * Math.sin(G.t * 9 + l.x);
    c.fillStyle = DARK; c.fillRect(sx - 2, gy - 100, 4, 100);
    if (!l.fire) { c.fillStyle = GOLD; c.fillRect(sx - 8, gy - 116, 16, 20); c.strokeStyle = DARK; c.lineWidth = 2; c.strokeRect(sx - 8, gy - 116, 16, 20); }
    var gr = c.createRadialGradient(sx, gy - 60, 6, sx, gy - 40, l.r);
    gr.addColorStop(0, l.fire ? 'rgba(255,140,60,' + 0.5 * fl + ')' : 'rgba(255,220,130,' + 0.42 * fl + ')'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(sx, gy - 40, l.r, 0, 6.3); c.fill();
    c.fillStyle = l.fire ? 'rgba(255,150,80,.16)' : 'rgba(255,225,140,.14)';
    c.beginPath(); c.moveTo(sx - l.r, gy); c.lineTo(sx + l.r, gy); c.lineTo(sx + 16, gy - 108); c.lineTo(sx - 16, gy - 108); c.closePath(); c.fill();
  }
  function flames(c, sx, w) {
    var gy = G.gy;
    for (var i = 0; i < 5; i++) {
      var fx = sx - w / 2 + (i + 0.5) * w / 5, h = 38 + 16 * Math.sin(G.t * 8 + i * 1.7 + sx), hh = h * (0.8 + 0.2 * Math.sin(G.t * 12 + i));
      c.fillStyle = ACC; c.beginPath(); c.moveTo(fx - 12, gy); c.quadraticCurveTo(fx - 14, gy - hh * 0.6, fx, gy - hh); c.quadraticCurveTo(fx + 14, gy - hh * 0.6, fx + 12, gy); c.fill();
      c.fillStyle = GOLD; c.beginPath(); c.moveTo(fx - 6, gy); c.quadraticCurveTo(fx - 6, gy - hh * 0.35, fx, gy - hh * 0.55); c.quadraticCurveTo(fx + 6, gy - hh * 0.35, fx + 6, gy); c.fill();
    }
    c.fillStyle = DARK; c.fillRect(sx - w / 2 - 6, gy - 8, w + 12, 8);
  }
  function hideSpot(c, h, sx, S) {
    var gy = G.gy, col = S.dark ? '#08090f' : '#0d0b12';
    c.fillStyle = col;
    if (h.k === 'bush') { [[-26, 0, 22], [0, -8, 28], [26, 0, 22], [-8, -22, 20], [14, -20, 20]].forEach(function (b) { c.beginPath(); c.arc(sx + b[0], gy - 24 + b[1], b[2], 0, 6.3); c.fill(); }); c.fillStyle = 'rgba(120,170,100,.35)'; c.beginPath(); c.arc(sx - 4, gy - 48, 6, 0, 6.3); c.arc(sx + 18, gy - 44, 5, 0, 6.3); c.fill(); }
    if (h.k === 'crate') { c.fillRect(sx - 34, gy - 62, 68, 62); c.strokeStyle = 'rgba(255,230,180,.22)'; c.lineWidth = 2; c.strokeRect(sx - 34, gy - 62, 68, 62); c.beginPath(); c.moveTo(sx - 34, gy - 62); c.lineTo(sx + 34, gy); c.moveTo(sx + 34, gy - 62); c.lineTo(sx - 34, gy); c.stroke(); }
    if (h.k === 'curtain') { c.fillRect(sx - 40, gy - 110, 80, 10); c.beginPath(); c.moveTo(sx - 38, gy - 100); for (var i = 0; i <= 8; i++) c.lineTo(sx - 38 + i * 9.5, gy - (i % 2 ? 0 : 6)); c.lineTo(sx + 38, gy - 100); c.closePath(); c.fill(); c.fillStyle = 'rgba(224,82,63,.4)'; c.fillRect(sx - 38, gy - 100, 76, 6); }
    // подсказка
    if (Math.abs(G.p.x - h.x) < 40 && G.state === 'play') { c.fillStyle = 'rgba(246,236,208,.85)'; c.font = '600 11px sans-serif'; c.textAlign = 'center'; c.fillText('↓ спрятаться', sx, gy - 128); }
  }

  function human(c, x, y, o) {
    var f = o.face || 1, cr = o.crouch || 0, t = o.t || 0, mv = o.moving, run = o.run;
    var sw = mv ? Math.sin(t * (run ? 13 : 8)) : 0, bob = mv ? Math.abs(Math.sin(t * (run ? 13 : 8))) * 2 : Math.sin(G.t * 2 + (o.ph || 0)) * 0.8;
    var H = 1 - cr * 0.34, lean = (run ? 0.22 : mv ? 0.08 : 0) - cr * 0.1;
    c.save(); c.translate(x, y); c.scale(f, 1); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    var rim = 'rgba(255,236,200,.4)', ink = o.ink || DARK;
    c.lineCap = 'round'; c.lineJoin = 'round';
    // ноги
    c.strokeStyle = ink; c.lineWidth = 9;
    c.beginPath(); c.moveTo(-3, -42 * H); c.lineTo(-3 + sw * 14, -(cr ? 8 : 0) * 0); c.moveTo(3, -42 * H); c.lineTo(3 - sw * 14, 0); c.stroke();
    // хакама
    c.fillStyle = ink; c.beginPath(); c.moveTo(-13, -40 * H); c.lineTo(-17 + sw * 6, -4); c.lineTo(17 - sw * 6, -4); c.lineTo(13, -40 * H); c.closePath(); c.fill();
    // торс
    c.save(); c.translate(0, -42 * H - bob); c.rotate(lean);
    c.fillStyle = ink; c.beginPath(); c.moveTo(-12, 2); c.lineTo(-10, -36 * H); c.quadraticCurveTo(0, -42 * H, 10, -36 * H); c.lineTo(12, 2); c.closePath(); c.fill();
    c.strokeStyle = rim; c.lineWidth = 1.4; c.beginPath(); c.moveTo(11, -33 * H); c.lineTo(12, 2); c.stroke();
    c.fillStyle = o.accent || ACC; c.fillRect(-12, -6, 24, 6);
    // руки
    c.strokeStyle = ink; c.lineWidth = 7;
    c.beginPath(); c.moveTo(-9, -32 * H); c.lineTo(-14 - sw * 5, -14); c.moveTo(9, -32 * H); c.lineTo(15 + sw * 5, -16); c.stroke();
    if (o.hold === 'spear') { c.strokeStyle = 'rgba(246,236,208,.7)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(18, 8); c.lineTo(18, -86); c.stroke(); c.fillStyle = LIGHT; c.beginPath(); c.moveTo(18, -98); c.lineTo(14, -84); c.lineTo(22, -84); c.fill(); }
    if (o.hold === 'sandals') { c.fillStyle = GOLD; c.fillRect(8, -22, 14, 4); c.fillRect(8, -16, 14, 4); }
    if (o.hold === 'scroll') { c.fillStyle = LIGHT; c.fillRect(6, -22, 18, 6); }
    // голова
    c.fillStyle = ink; c.beginPath(); c.arc(0, -46 * H - 2, 11, 0, 6.3); c.fill();
    c.strokeStyle = rim; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -46 * H - 2, 11, -1.1, 0.9); c.stroke();
    if (o.hat === 'helm') { c.fillStyle = ink; c.beginPath(); c.moveTo(-14, -46 * H - 3); c.quadraticCurveTo(0, -46 * H - 28, 14, -46 * H - 3); c.fill(); c.fillStyle = o.accent || GOLD; c.beginPath(); c.moveTo(0, -46 * H - 32); c.lineTo(-6, -46 * H - 22); c.lineTo(6, -46 * H - 22); c.fill(); }
    else { c.strokeStyle = ink; c.lineWidth = 4; c.beginPath(); c.moveTo(1, -46 * H - 12); c.quadraticCurveTo(7, -46 * H - 22, 14, -46 * H - 18); c.stroke(); }
    // глаза-прорезь
    c.strokeStyle = o.alert ? ACC : LIGHT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(1, -46 * H - 3); c.lineTo(8, -46 * H - 3); c.stroke();
    // шарф
    var sc = o.scarf || (o.accent || ACC);
    c.strokeStyle = sc; c.lineWidth = 5; c.beginPath(); c.moveTo(-8, -38 * H);
    for (var i = 1; i <= 6; i++) c.lineTo(-8 - i * (mv ? (run ? 9 : 6) : 3), -38 * H + Math.sin(G.t * (mv ? 11 : 3) + i * 0.9) * (mv ? 3.2 : 1.6) + i * (mv ? 0.6 : 2.2));
    c.stroke();
    c.restore(); c.restore();
  }

  function draw() {
    var g = G, c = g.ctx, L = g.L, S = SKIES[L.sky], cam = g.cam, gy = g.gy;
    c.setTransform(g.k, 0, 0, g.k, 0, 0);
    var gr = c.createLinearGradient(0, 0, 0, g.VH); gr.addColorStop(0, S.sky[0]); gr.addColorStop(1, S.sky[1]);
    c.fillStyle = gr; c.fillRect(0, 0, g.VW, g.VH);
    c.fillStyle = S.sun; c.globalAlpha = 0.18; c.beginPath(); c.arc(g.VW * 0.78, g.VH * 0.28, 54, 0, 6.3); c.fill(); c.globalAlpha = 1; c.beginPath(); c.arc(g.VW * 0.78, g.VH * 0.28, 30, 0, 6.3); c.fill();
    if (S.dark) { c.fillStyle = LIGHT; for (var i = 0; i < 22; i++) { c.globalAlpha = 0.4 + 0.4 * Math.sin(g.t * 2 + i); c.fillRect((i * 97) % g.VW, 10 + (i * 41) % (g.VH * 0.4), 1.6, 1.6); } c.globalAlpha = 1; }
    ridge(c, cam, 0.15, gy - 70, 70, S.far, 1.3);
    ridge(c, cam, 0.4, gy - 20, 50, S.mid, 4.1);
    // мир
    c.save(); c.translate(-cam, 0);
    (L.props || []).forEach(function (pr) { if (pr.x > cam - 200 && pr.x < cam + g.VW + 200) drawProp(c, pr, pr.x, S); });
    (L.shades || []).forEach(function (s) {
      c.fillStyle = 'rgba(8,6,16,.5)'; c.fillRect(s[0], gy - 120, s[1] - s[0], 120);
      c.fillStyle = S.gnd; c.fillRect(s[0] - 6, gy - 124, s[1] - s[0] + 12, 10); roofPath(c, (s[0] + s[1]) / 2, gy - 124, s[1] - s[0], 26);
      c.fillStyle = S.gnd; c.fillRect(s[0], gy - 114, 5, 114); c.fillRect(s[1] - 5, gy - 114, 5, 114);
    });
    (L.lamps || []).forEach(function (l) { lamp(c, l.x, l, S); });
    (L.fires || []).forEach(function (f) { flames(c, f.x, f.w); });
    (L.hides || []).forEach(function (h) { hideSpot(c, h, h.x, S); });
    // цель
    var ex = L.exit; c.fillStyle = 'rgba(255,220,130,.22)'; c.fillRect(ex - 36, gy - 120, 72, 120);
    c.fillStyle = GOLD; c.fillRect(ex - 36, gy - 124, 72, 5);
    human(c, ex + 8, gy, { face: -1, accent: GOLD, hat: L.who === 'sam' ? 'helm' : null, scarf: GOLD, ph: 3 });
    // конусы зрения
    g.guards.forEach(function (gd) {
      var col = gd.m > 0.05 ? 'rgba(224,82,63,' + (0.16 + gd.m * 0.28) + ')' : 'rgba(255,225,130,.18)';
      c.fillStyle = col; c.beginPath(); c.moveTo(gd.x + gd.face * 10, gy - 84); c.lineTo(gd.x + gd.face * gd.look, gy - 120); c.lineTo(gd.x + gd.face * gd.look, gy); c.closePath(); c.fill();
      c.strokeStyle = gd.m > 0.05 ? 'rgba(224,82,63,.6)' : 'rgba(255,225,130,.4)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(gd.x + gd.face * 10, gy - 84); c.lineTo(gd.x + gd.face * gd.look, gy - 120); c.moveTo(gd.x + gd.face * 10, gy - 84); c.lineTo(gd.x + gd.face * gd.look, gy); c.stroke();
    });
    // шум
    g.noise.forEach(function (n) { c.strokeStyle = n.kind === 'stone' ? 'rgba(246,236,208,' + (0.6 * (1 - n.t)) + ')' : 'rgba(224,82,63,' + (0.5 * (1 - n.t)) + ')'; c.lineWidth = 2; c.beginPath(); c.ellipse(n.x, gy - 4, n.r * n.t, n.r * n.t * 0.22, 0, 0, 6.3); c.stroke(); });
    g.puffs.forEach(function (q) { c.fillStyle = 'rgba(240,220,190,' + (0.25 * (1 - q.t)) + ')'; c.beginPath(); c.arc(q.x, q.y - 4 - q.t * 8, 4 + q.t * 8, 0, 6.3); c.fill(); });
    // стража
    g.guards.forEach(function (gd) {
      human(c, gd.x, gy, { face: gd.face, moving: gd.mode !== 'patrol' || gd.wait <= 0, t: gd.ph * 0.9, hat: 'helm', hold: 'spear', accent: '#b06ac0', scarf: '#b06ac0', ph: gd.ph, alert: gd.m > 0.2, ink: '#0b0a10' });
      if (gd.m > 0.04) { var bx = gd.x - 14, by = gy - 128; c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(bx, by, 28, 6); c.fillStyle = ACC; c.fillRect(bx, by, 28 * Math.min(1, gd.m), 6); c.fillStyle = LIGHT; c.font = '700 15px sans-serif'; c.textAlign = 'center'; c.fillText(gd.m > 0.6 ? '!' : '?', gd.x, by - 4); }
      else if (gd.mode === 'invest') { c.fillStyle = GOLD; c.font = '700 14px sans-serif'; c.textAlign = 'center'; c.fillText('?', gd.x, gy - 130); }
    });
    // камни
    g.stoneList.forEach(function (s) { c.fillStyle = LIGHT; c.beginPath(); c.arc(s.x, s.y, 4, 0, 6.3); c.fill(); });
    // игрок
    var p = g.p;
    human(c, p.x, gy, { face: p.face, moving: p.moving, run: p.run, t: p.tPhase, crouch: p.crouch, alpha: p.hid ? 0.38 : (p.exposed ? 1 : 0.78), hold: L.id === 1 ? 'sandals' : 'scroll', accent: ACC, scarf: ACC });
    c.restore();
    // земля и затемнение
    c.fillStyle = S.gnd; c.fillRect(0, gy, g.VW, g.VH - gy);
    c.fillStyle = 'rgba(255,236,200,.14)'; c.fillRect(0, gy, g.VW, 2);
    if (S.dark) { var vg = c.createLinearGradient(0, 0, 0, g.VH); vg.addColorStop(0, 'rgba(4,5,16,.18)'); vg.addColorStop(1, 'rgba(4,5,16,.34)'); c.fillStyle = vg; c.fillRect(0, 0, g.VW, g.VH); }
    // индикатор видимости
    c.fillStyle = p.hid ? 'rgba(140,200,160,.9)' : p.exposed ? 'rgba(255,225,130,.95)' : 'rgba(150,170,230,.9)';
    c.beginPath(); c.arc(16, 16, 6, 0, 6.3); c.fill();
  }

  window.Game = { view: view, bind: bind, stop: stop, levels: LEVELS, _s: function () { return G; } };
})();
