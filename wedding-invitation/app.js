/* ==========================================================================
   Фатхуллоходжа & Шукронахон · 08.12.2026
   Scenes, page-turn transitions, envelope opening, particles, parallax.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.WEDDING_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var body = document.body;
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  /* ======================================================================
     1. SVG library: roses, leaves, bouquet, wreath, ornaments, seal
     ====================================================================== */
  function buildLibrary() {
    var PETAL = 'M0,6 C-25,-2 -31,-36 0,-47 C31,-36 25,-2 0,6Z';

    function rose(id, grad, stroke) {
      var s = '<g id="' + id + '">';
      s += '<circle r="44" cy="5" fill="rgba(70,45,25,.16)"/>';
      var layers = [[6, 1, 0], [6, .8, 30], [5, .62, 12], [5, .45, 48], [4, .3, 20], [3, .18, 70]];
      for (var l = 0; l < layers.length; l++) {
        var n = layers[l][0], sc = layers[l][1], off = layers[l][2];
        for (var k = 0; k < n; k++) {
          var rot = off + k * 360 / n + (l % 2 ? 4 : -3);
          s += '<path d="' + PETAL + '" transform="rotate(' + rot.toFixed(1) + ') scale(' + sc + ')" fill="url(#' + grad + ')" stroke="' + stroke + '" stroke-width=".7" vector-effect="non-scaling-stroke"/>';
        }
      }
      s += '<path d="M-3,-2 C-3,-6 4,-6 4,-1 C4,3 -2,4 -3,1" fill="none" stroke="' + stroke + '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
      return s + '</g>';
    }

    var defs = '';
    defs += '<radialGradient id="gr-ivory" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="48">' +
      '<stop offset="0" stop-color="#d7a98e"/><stop offset=".35" stop-color="#efd8c3"/><stop offset=".75" stop-color="#fbf1e4"/><stop offset="1" stop-color="#fffaf2"/></radialGradient>';
    defs += '<radialGradient id="gr-blush" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="48">' +
      '<stop offset="0" stop-color="#b8706a"/><stop offset=".4" stop-color="#e2b0a4"/><stop offset=".8" stop-color="#f6dcd3"/><stop offset="1" stop-color="#fcefe9"/></radialGradient>';
    defs += '<radialGradient id="gr-burg" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="48">' +
      '<stop offset="0" stop-color="#3f0b17"/><stop offset=".45" stop-color="#7a2433"/><stop offset=".85" stop-color="#a8505a"/><stop offset="1" stop-color="#c47a7f"/></radialGradient>';
    defs += '<linearGradient id="gr-leaf" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0" stop-color="#253d2f"/><stop offset=".55" stop-color="#4b6a4f"/><stop offset="1" stop-color="#7d9a78"/></linearGradient>';
    defs += '<linearGradient id="gr-sage" x1="0" x2="1" y1="0" y2="1">' +
      '<stop offset="0" stop-color="#8fa58e"/><stop offset="1" stop-color="#b9c8b2"/></linearGradient>';
    defs += '<linearGradient id="gr-gold" x1="0" x2="1" y1="0" y2="1">' +
      '<stop offset="0" stop-color="#8d6a2c"/><stop offset=".35" stop-color="#e8cf96"/><stop offset=".55" stop-color="#fff3d1"/><stop offset=".75" stop-color="#c9a253"/><stop offset="1" stop-color="#8d6a2c"/></linearGradient>';
    defs += '<radialGradient id="gr-seal" cx=".38" cy=".32" r=".75">' +
      '<stop offset="0" stop-color="#fff0c8"/><stop offset=".3" stop-color="#e3c27d"/><stop offset=".7" stop-color="#b48a3e"/><stop offset="1" stop-color="#7c5b22"/></radialGradient>';

    defs += rose('rose-ivory', 'gr-ivory', 'rgba(150,105,80,.32)');
    defs += rose('rose-blush', 'gr-blush', 'rgba(140,70,62,.3)');
    defs += rose('rose-burg', 'gr-burg', 'rgba(50,8,18,.45)');

    defs += '<g id="leaf"><path d="M0,0 C9,-10 27,-13 48,0 C27,13 9,10 0,0Z" fill="url(#gr-leaf)"/>' +
      '<path d="M3,0 C18,-1 32,-1 44,0" fill="none" stroke="rgba(230,240,220,.35)" stroke-width=".8"/></g>';
    defs += '<g id="leaf-gold"><path d="M0,0 C9,-9 25,-11 42,0 C25,11 9,9 0,0Z" fill="url(#gr-gold)" opacity=".9"/>' +
      '<path d="M3,0 L38,0" stroke="rgba(120,85,30,.45)" stroke-width=".6"/></g>';
    defs += '<g id="leaf-sage"><ellipse cx="9" cy="0" rx="9" ry="6.5" fill="url(#gr-sage)"/></g>';
    defs += '<g id="bud"><path d="M0,-14 C8,-8 8,6 0,10 C-8,6 -8,-8 0,-14Z" fill="url(#gr-blush)" transform="scale(1.1)"/>' +
      '<path d="M0,12 C-6,8 -9,2 -7,-3 C-3,2 -1,6 0,12 C1,6 3,2 7,-3 C9,2 6,8 0,12Z" fill="#3c5a44"/>' +
      '<path d="M0,12 L0,26" stroke="#3c5a44" stroke-width="1.2"/></g>';

    // ----- bouquet (corner composition, symmetric around the diagonal) -----
    var B = '<g id="bouquet">';
    B += '<g fill="none" stroke="url(#gr-gold)" stroke-linecap="round">' +
      '<path d="M-8,26 C60,30 140,52 262,40" stroke-width="1.3"/>' +
      '<path d="M26,-8 C30,60 52,140 40,262" stroke-width="1.3"/>' +
      '<path d="M40,40 C90,80 150,128 226,168" stroke-width=".9" opacity=".7"/>' +
      '<path d="M40,40 C80,90 128,150 168,226" stroke-width=".9" opacity=".7"/>' +
      '</g>';
    var leaves = [ // x, y, rot, scale
      [138, 40, -26, 1.05], [146, 50, 24, .95], [192, 40, -18, .9], [198, 48, 20, .8], [236, 40, -8, .62],
      [108, 34, -40, .9], [168, 92, 40, .75], [210, 140, 32, .6]
    ];
    var golds = [[176, 44, -34, .75], [120, 108, 38, .7], [222, 46, 14, .55], [180, 112, 28, .55]];
    var sage = [[150, 110], [166, 120], [182, 134], [198, 146], [214, 158]];
    function both(fn) { fn(false); fn(true); }
    both(function (mir) {
      var i, x, y, a;
      for (i = 0; i < sage.length; i++) {
        x = mir ? sage[i][1] : sage[i][0]; y = mir ? sage[i][0] : sage[i][1];
        B += '<use href="#leaf-sage" transform="translate(' + x + ',' + y + ') rotate(' + (mir ? 100 : -10) + ') scale(' + (1 - i * .1) + ')"/>';
      }
      for (i = 0; i < leaves.length; i++) {
        x = mir ? leaves[i][1] : leaves[i][0]; y = mir ? leaves[i][0] : leaves[i][1];
        a = mir ? 90 - leaves[i][2] : leaves[i][2];
        B += '<use href="#leaf" transform="translate(' + x + ',' + y + ') rotate(' + a + ') scale(' + leaves[i][3] + ')"/>';
      }
      for (i = 0; i < golds.length; i++) {
        x = mir ? golds[i][1] : golds[i][0]; y = mir ? golds[i][0] : golds[i][1];
        a = mir ? 90 - golds[i][2] : golds[i][2];
        B += '<use href="#leaf-gold" transform="translate(' + x + ',' + y + ') rotate(' + a + ') scale(' + golds[i][3] + ')"/>';
      }
    });
    // baby's breath
    var gyp = [[232, 92], [244, 82], [238, 104], [252, 96], [226, 80], [92, 232], [82, 244], [104, 238], [96, 252], [80, 226], [178, 178], [190, 170], [170, 190]];
    gyp.forEach(function (p) {
      B += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.2" fill="#fffaf0" stroke="rgba(184,145,74,.7)" stroke-width=".8"/>';
    });
    B += '<use href="#bud" transform="translate(250,30) rotate(70) scale(.9)"/>';
    B += '<use href="#bud" transform="translate(30,250) rotate(-160) scale(.9)"/>';
    B += '<use href="#rose-blush" transform="translate(146,26) scale(.5)"/>';
    B += '<use href="#rose-blush" transform="translate(26,146) scale(.5) rotate(40)"/>';
    B += '<use href="#rose-burg" transform="translate(122,118) scale(.36) rotate(15)"/>';
    B += '<use href="#rose-ivory" transform="translate(68,68) scale(1.08)"/>';
    B += '</g>';
    defs += B;

    // ----- wreath -----
    var W = '<g id="wreath">';
    W += '<circle cx="150" cy="150" r="104" fill="none" stroke="url(#gr-gold)" stroke-width="1.1"/>';
    W += '<circle cx="150" cy="150" r="97" fill="none" stroke="rgba(184,145,74,.35)" stroke-width=".6"/>';
    var N = 15;
    both(function (mir) {
      for (var i = 0; i < N; i++) {
        var k = i / (N - 1);
        var ang = (90 + (mir ? -1 : 1) * (18 + k * 140)) * Math.PI / 180; // from bottom up the side
        var R = 104 + (i % 2 ? 7 : -5);
        var x = 150 + Math.cos(ang) * R, y = 150 + Math.sin(ang) * R;
        var tangent = ang * 180 / Math.PI + (mir ? -90 : 90);
        var tilt = (i % 2 ? -28 : 28) * (mir ? -1 : 1);
        var sc = .62 - k * .3;
        var type = i % 4 === 3 ? 'leaf-gold' : (i % 5 === 2 ? 'leaf-sage' : 'leaf');
        W += '<use href="#' + type + '" transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + (tangent + tilt).toFixed(1) + ') scale(' + sc.toFixed(2) + ')"/>';
      }
    });
    [[112, 248], [188, 248], [96, 236], [204, 236]].forEach(function (p) {
      W += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="#fffaf0" stroke="rgba(184,145,74,.7)" stroke-width=".8"/>';
    });
    W += '<use href="#bud" transform="translate(118,262) rotate(-130) scale(.65)"/>';
    W += '<use href="#bud" transform="translate(182,262) rotate(130) scale(.65)"/>';
    W += '<use href="#rose-blush" transform="translate(124,248) scale(.34)"/>';
    W += '<use href="#rose-blush" transform="translate(176,248) scale(.34) rotate(30)"/>';
    W += '<use href="#rose-burg" transform="translate(150,232) scale(.2)"/>';
    W += '<use href="#rose-ivory" transform="translate(150,256) scale(.46)"/>';
    W += '<path d="M150,30 l4,8 -4,8 -4,-8z" fill="url(#gr-gold)"/>';
    W += '</g>';
    defs += W;

    // ----- ornaments -----
    defs += '<g id="divider" fill="none" stroke="currentColor" stroke-linecap="round">' +
      '<path d="M8,12 H96" stroke-width=".8" opacity=".7"/><path d="M144,12 H232" stroke-width=".8" opacity=".7"/>' +
      '<path d="M96,12 C104,4 112,4 114,10 C116,15 110,17 108,13" stroke-width="1"/>' +
      '<path d="M144,12 C136,4 128,4 126,10 C124,15 130,17 132,13" stroke-width="1"/>' +
      '<path d="M120,4 L126,12 L120,20 L114,12Z" fill="currentColor" stroke="none"/>' +
      '<circle cx="4" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="236" cy="12" r="1.6" fill="currentColor" stroke="none"/>' +
      '</g>';
    defs += '<g id="corner" fill="none" stroke="currentColor" stroke-linecap="round">' +
      '<path d="M2,64 V18 Q2,2 18,2 H64" stroke-width="1.1"/>' +
      '<path d="M9,52 V22 Q9,9 22,9 H52" stroke-width=".6" opacity=".7"/>' +
      '<path d="M18,30 C18,22 22,18 30,18 C38,18 40,26 34,29 C29,31 26,27 29,24" stroke-width=".9"/>' +
      '<path d="M2,2 L8,8" stroke-width=".9"/>' +
      '<circle cx="64" cy="2" r="1.6" fill="currentColor" stroke="none"/><circle cx="2" cy="64" r="1.6" fill="currentColor" stroke="none"/>' +
      '</g>';
    var ring = '<g id="ring" fill="none" stroke="currentColor">' +
      '<circle cx="60" cy="60" r="56" stroke-width=".9"/><circle cx="60" cy="60" r="51" stroke-width=".5" opacity=".6"/>';
    for (var d = 0; d < 36; d++) {
      var aa = d * 10 * Math.PI / 180, r1 = d % 3 ? 56 : 54, r2 = 58.5;
      ring += '<line x1="' + (60 + Math.cos(aa) * r1).toFixed(2) + '" y1="' + (60 + Math.sin(aa) * r1).toFixed(2) + '" x2="' + (60 + Math.cos(aa) * r2).toFixed(2) + '" y2="' + (60 + Math.sin(aa) * r2).toFixed(2) + '" stroke-width=".6"/>';
    }
    ring += '<path d="M60,0 l3,4 -3,4 -3,-4z M60,112 l3,4 -3,4 -3,-4z" fill="currentColor" stroke="none"/></g>';
    defs += ring;

    // venue icon: elegant arch hall with chandelier
    defs += '<g id="hall" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M18,76 V40 C18,16 40,4 60,4 C80,4 102,16 102,40 V76" stroke-width="1.3"/>' +
      '<path d="M28,76 V42 C28,24 44,14 60,14 C76,14 92,24 92,42 V76" stroke-width=".7" opacity=".7"/>' +
      '<path d="M8,76 H112" stroke-width="1.3"/>' +
      '<path d="M60,14 V26" stroke-width=".8"/>' +
      '<path d="M46,30 C50,38 70,38 74,30" stroke-width="1"/>' +
      '<path d="M50,30 V35 M60,30 V38 M70,30 V35" stroke-width=".8"/>' +
      '<circle cx="50" cy="37" r="1.6" fill="currentColor"/><circle cx="60" cy="40" r="1.8" fill="currentColor"/><circle cx="70" cy="37" r="1.6" fill="currentColor"/>' +
      '<path d="M42,30 H78" stroke-width=".9"/>' +
      '<path d="M48,76 V56 C48,49 53,45 60,45 C67,45 72,49 72,56 V76" stroke-width="1"/>' +
      '</g>';

    // wax seal: wavy-edged gold disc with monogram
    var wav = '';
    for (var w = 0; w <= 72; w++) {
      var t = w / 72 * Math.PI * 2, rr = 46 + Math.sin(t * 13) * 1.6 + Math.sin(t * 5 + 1) * 1.1;
      wav += (w ? 'L' : 'M') + (50 + Math.cos(t) * rr).toFixed(2) + ',' + (50 + Math.sin(t) * rr).toFixed(2);
    }
    defs += '<g id="seal"><path d="' + wav + 'Z" fill="url(#gr-seal)"/>' +
      '<circle cx="50" cy="50" r="35" fill="none" stroke="rgba(110,76,24,.55)" stroke-width="1.6"/>' +
      '<circle cx="50" cy="50" r="31.5" fill="none" stroke="rgba(255,243,210,.6)" stroke-width=".7"/>' +
      '<text x="50" y="60.5" text-anchor="middle" font-family="Great Vibes, cursive" font-size="29" fill="rgba(255,244,214,.55)" transform="translate(.6,.8)">Ф&amp;Ш</text>' +
      '<text x="50" y="60" text-anchor="middle" font-family="Great Vibes, cursive" font-size="29" fill="#6e4f1c">Ф&amp;Ш</text>' +
      '</g>';

    $('#lib').innerHTML = '<defs>' + defs + '</defs>';

    // frame corners on every card
    $$('.frame').forEach(function (f) {
      for (var i = 1; i <= 4; i++) {
        f.insertAdjacentHTML('beforeend', '<svg class="corner c' + i + '" viewBox="0 0 66 66" aria-hidden="true"><use href="#corner"/></svg>');
      }
    });
  }

  /* ======================================================================
     2. Particles: falling rose petals + golden dust (two canvas layers)
     ====================================================================== */
  var FX = (function () {
    var back = $('#fx-back'), front = $('#fx-front');
    var bctx = back.getContext('2d'), fctx = front.getContext('2d');
    var W = 0, H = 0, DPR = 1;
    var petalsBack = [], petalsFront = [], dust = [], sparks = [];
    var sprites = [], goldSprite;
    var wind = 0, windTarget = 0, running = true, last = 0;

    function makePetal(c1, c2, c3) {
      var s = 72, cv = document.createElement('canvas');
      cv.width = cv.height = s;
      var x = cv.getContext('2d');
      var g = x.createRadialGradient(s * .5, s * .86, 2, s * .5, s * .5, s * .55);
      g.addColorStop(0, c3); g.addColorStop(.45, c2); g.addColorStop(1, c1);
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(s * .5, s * .95);
      x.bezierCurveTo(s * .06, s * .72, s * .06, s * .2, s * .36, s * .08);
      x.quadraticCurveTo(s * .5, s * .17, s * .64, s * .08);
      x.bezierCurveTo(s * .94, s * .2, s * .94, s * .72, s * .5, s * .95);
      x.fill();
      x.globalAlpha = .28;
      x.strokeStyle = '#fff';
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(s * .5, s * .9);
      x.quadraticCurveTo(s * .44, s * .5, s * .5, s * .2);
      x.stroke();
      return cv;
    }
    function makeGold() {
      var s = 32, cv = document.createElement('canvas');
      cv.width = cv.height = s;
      var x = cv.getContext('2d');
      var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,248,222,1)');
      g.addColorStop(.25, 'rgba(240,210,140,.9)');
      g.addColorStop(.6, 'rgba(201,162,83,.25)');
      g.addColorStop(1, 'rgba(201,162,83,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, s, s);
      return cv;
    }

    function newPetal(layer, initial) {
      var big = layer === 'front';
      var size = big ? rand(26, 42) : rand(11, 22);
      var r = Math.random();
      return {
        x: rand(-0.1, 1.1) * W,
        y: initial ? rand(-0.1, 1) * H : rand(-0.25, -0.05) * H,
        size: size,
        vy: (big ? rand(34, 56) : rand(18, 34)),
        vx: rand(-8, 10),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.9, 0.9),
        flip: rand(0, Math.PI * 2),
        vf: rand(0.8, 2.2),
        sway: rand(14, 38),
        sf: rand(0.4, 0.9),
        ph: rand(0, Math.PI * 2),
        a: big ? rand(.75, .95) : rand(.45, .8),
        sp: sprites[r < .1 ? 3 : r < .5 ? 0 : r < .8 ? 1 : 2]
      };
    }
    function newDust(initial) {
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 10,
        r: rand(.8, 2.4),
        vy: -rand(5, 16),
        vx: rand(-4, 4),
        tw: rand(0, Math.PI * 2),
        ts: rand(.8, 2.2)
      };
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      [back, front].forEach(function (c) {
        c.width = Math.round(W * DPR);
        c.height = Math.round(H * DPR);
      });
    }

    function init() {
      sprites = [
        makePetal('#fbe6e0', '#efbfb4', '#d98f86'),
        makePetal('#fffaf3', '#f5e3d2', '#e6c1a7'),
        makePetal('#f9ddd5', '#e6a69c', '#c06c68'),
        makePetal('#c26b72', '#8e3442', '#5e1524')
      ];
      goldSprite = makeGold();
      resize();
      var small = W < 700;
      var nB = REDUCED ? 6 : small ? 13 : 22;
      var nF = REDUCED ? 0 : small ? 4 : 7;
      var nD = REDUCED ? 14 : small ? 34 : 64;
      for (var i = 0; i < nB; i++) petalsBack.push(newPetal('back', true));
      for (i = 0; i < nF; i++) petalsFront.push(newPetal('front', true));
      for (i = 0; i < nD; i++) dust.push(newDust(true));
      window.addEventListener('resize', resize);
      document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) { last = performance.now(); requestAnimationFrame(loop); }
      });
      last = performance.now();
      requestAnimationFrame(loop);
    }

    function drawPetal(ctx, p, t) {
      var x = p.x + Math.sin(t * p.sf + p.ph) * p.sway;
      var fy = Math.cos(p.flip);
      ctx.globalAlpha = p.a;
      ctx.setTransform(DPR, 0, 0, DPR, x * DPR, p.y * DPR);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(fy) < .12 ? .12 : fy);
      ctx.drawImage(p.sp, -p.size / 2, -p.size / 2, p.size, p.size);
    }

    function stepPetals(arr, layer, dt, t) {
      for (var i = 0; i < arr.length; i++) {
        var p = arr[i];
        p.y += p.vy * dt;
        p.x += (p.vx + wind * (layer === 'front' ? 1.4 : 1)) * dt;
        p.rot += p.vr * dt;
        p.flip += p.vf * dt;
        if (p.y > H + 60 || p.x < -120 || p.x > W + 120) arr[i] = newPetal(layer, false);
      }
    }

    function loop(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var t = now / 1000;
      wind += (windTarget - wind) * Math.min(1, dt * 2.2);
      windTarget *= Math.pow(0.25, dt);

      // back layer: dust + small petals
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, back.width, back.height);
      for (var i = 0; i < dust.length; i++) {
        var d = dust[i];
        d.y += d.vy * dt; d.x += (d.vx + wind * .3) * dt; d.tw += d.ts * dt;
        if (d.y < -10) dust[i] = d = newDust(false);
        var a = .25 + .75 * Math.abs(Math.sin(d.tw));
        bctx.globalAlpha = a * .85;
        var s = d.r * 5;
        bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        bctx.drawImage(goldSprite, d.x - s / 2, d.y - s / 2, s, s);
      }
      stepPetals(petalsBack, 'back', dt, t);
      for (i = 0; i < petalsBack.length; i++) drawPetal(bctx, petalsBack[i], t);

      // front layer: large petals + sparks
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, front.width, front.height);
      stepPetals(petalsFront, 'front', dt, t);
      for (i = 0; i < petalsFront.length; i++) drawPetal(fctx, petalsFront[i], t);
      for (i = sparks.length - 1; i >= 0; i--) {
        var sp = sparks[i];
        sp.life -= dt;
        if (sp.life <= 0) { sparks.splice(i, 1); continue; }
        sp.vx *= Math.pow(.15, dt); sp.vy = sp.vy * Math.pow(.15, dt) + 30 * dt;
        sp.x += sp.vx * dt; sp.y += sp.vy * dt;
        var k = sp.life / sp.max;
        fctx.globalAlpha = Math.min(1, k * 1.6);
        var ss = sp.r * (1 + (1 - k));
        fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        fctx.drawImage(goldSprite, sp.x - ss / 2, sp.y - ss / 2, ss, ss);
      }
      bctx.globalAlpha = fctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    }

    return {
      init: init,
      gust: function (dir) { if (!REDUCED) windTarget = dir * 70; },
      burst: function (x, y, n) {
        if (REDUCED) n = Math.round(n / 3);
        for (var i = 0; i < n; i++) {
          var ang = Math.random() * Math.PI * 2, sp = rand(60, 320);
          var life = rand(.9, 2);
          sparks.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40, r: rand(6, 16), life: life, max: life });
        }
      },
      shower: function (n) {
        for (var i = 0; i < n; i++) {
          var p = newPetal(Math.random() < .3 ? 'front' : 'back', false);
          p.y = rand(-0.4, -0.02) * H;
          (Math.random() < .3 ? petalsFront : petalsBack).push(p);
        }
        // trim back to a sensible amount later
        setTimeout(function () {
          var maxB = W < 700 ? 13 : 22, maxF = W < 700 ? 4 : 7;
          if (petalsBack.length > maxB) petalsBack.length = maxB;
          if (petalsFront.length > maxF) petalsFront.length = maxF;
        }, 16000);
      }
    };
  })();

  /* ======================================================================
     3. Parallax (pointer / device tilt / gentle autonomous drift)
     ====================================================================== */
  function initParallax() {
    if (REDUCED) return;
    var els = $$('.px');
    var tx = 0, ty = 0, cx = 0, cy = 0, lastInput = 0;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
      lastInput = performance.now();
    }, { passive: true });
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 25));
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      lastInput = performance.now();
    }, { passive: true });

    (function frame(now) {
      if (now - lastInput > 3000) { // autonomous slow drift
        tx = Math.sin(now / 5200) * .5;
        ty = Math.cos(now / 6900) * .4;
      }
      cx += (tx - cx) * .05;
      cy += (ty - cy) * .05;
      if (!document.hidden) {
        for (var i = 0; i < els.length; i++) {
          var el = els[i], d = +el.dataset.depth || 0;
          if (el.offsetParent === null && !el.classList.contains('bg-flora')) continue;
          el.style.translate = (cx * d).toFixed(2) + 'px ' + (cy * d * .7).toFixed(2) + 'px';
        }
      }
      requestAnimationFrame(frame);
    })(performance.now());
  }

  /* ======================================================================
     4. Scenes & page-turn transitions
     ====================================================================== */
  var scenes = $$('.scene');
  var cards = scenes.map(function (s) { return $('.card', s); });
  var current = -1;
  var animating = false;
  var dotsWrap = $('.dots');
  var prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn');
  var sweep = $('.sweep');
  var NAMES = ['Приглашение', 'Имена', 'Дата', 'Место', 'Финал'];

  scenes.forEach(function (s, i) {
    var b = document.createElement('button');
    b.className = 'dot';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', (i + 1) + ' — ' + NAMES[i]);
    b.setAttribute('aria-selected', 'false');
    b.addEventListener('click', function () { go(i); });
    dotsWrap.appendChild(b);
  });
  var dots = $$('.dot', dotsWrap);

  function updateUI() {
    dots.forEach(function (d, i) { d.setAttribute('aria-selected', i === current ? 'true' : 'false'); });
    prevBtn.disabled = current <= 0;
    nextBtn.disabled = current >= scenes.length - 1;
    scenes.forEach(function (s, i) { s.setAttribute('aria-hidden', i === current ? 'false' : 'true'); });
  }

  function activate(i) {
    var s = scenes[i];
    s.classList.remove('active');
    void s.offsetWidth; // restart reveal choreography
    s.classList.add('active');
  }

  function anim(el, frames, opts) {
    var a = el.animate(frames, opts);
    return new Promise(function (res) {
      a.onfinish = function () { res(a); };
      a.oncancel = function () { res(a); };
    });
  }

  function lightSweep() {
    if (REDUCED) return;
    sweep.animate([
      { opacity: 0, transform: 'translateX(-60%)' },
      { opacity: 1, offset: .35 },
      { opacity: 0, transform: 'translateX(60%)' }
    ], { duration: 1700, easing: 'cubic-bezier(.45,0,.25,1)' });
  }

  function go(to) {
    if (animating || to === current || to < 0 || to >= scenes.length || current < 0) return;
    animating = true;
    var from = current, dir = to > from ? 1 : -1;
    var outS = scenes[from], inS = scenes[to];
    var outC = cards[from], inC = cards[to];
    var outShade = $('.shade', outC), inShade = $('.shade', inC);
    current = to;
    updateUI();
    FX.gust(-dir);
    lightSweep();

    activate(to);
    var D = REDUCED ? 700 : 1500;
    var jobs = [];

    if (REDUCED) {
      inS.style.zIndex = 2; outS.style.zIndex = 1;
      jobs.push(anim(outC, [{ opacity: 1 }, { opacity: 0 }], { duration: D, easing: 'ease', fill: 'both' }));
      jobs.push(anim(inC, [{ opacity: 0 }, { opacity: 1 }], { duration: D, easing: 'ease', fill: 'both' }));
    } else if (dir > 0) {
      // the current card is turned away like a page; the next one rises from depth
      outS.style.zIndex = 3; inS.style.zIndex = 2;
      jobs.push(anim(outC, [
        { transform: 'translate3d(0,0,0) rotateY(0deg)', opacity: 1 },
        { transform: 'translate3d(-2%,0,40px) rotateY(-28deg)', opacity: 1, offset: .35 },
        { transform: 'translate3d(-14%,0,60px) rotateY(-96deg)', opacity: 0 }
      ], { duration: D, easing: 'cubic-bezier(.55,.05,.35,1)', fill: 'both' }));
      jobs.push(anim(outShade, [{ opacity: 0 }, { opacity: 1 }], { duration: D * .8, easing: 'ease-in', fill: 'both' }));
      jobs.push(anim(inC, [
        { transform: 'translate3d(0,2%,-320px) scale(.96)', opacity: 0, filter: 'blur(5px)' },
        { opacity: 1, offset: .5 },
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, filter: 'blur(0px)' }
      ], { duration: D + 300, delay: 180, easing: 'cubic-bezier(.22,.61,.24,1)', fill: 'both' }));
    } else {
      // previous page swings back in over the current one
      outS.style.zIndex = 2; inS.style.zIndex = 3;
      jobs.push(anim(inC, [
        { transform: 'translate3d(-14%,0,60px) rotateY(-96deg)', opacity: 0 },
        { transform: 'translate3d(-2%,0,40px) rotateY(-28deg)', opacity: 1, offset: .65 },
        { transform: 'translate3d(0,0,0) rotateY(0deg)', opacity: 1 }
      ], { duration: D, easing: 'cubic-bezier(.55,.05,.35,1)', fill: 'both' }));
      jobs.push(anim(inShade, [{ opacity: 1 }, { opacity: 0 }], { duration: D, easing: 'ease-out', fill: 'both' }));
      jobs.push(anim(outC, [
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, filter: 'blur(0px)' },
        { transform: 'translate3d(0,2%,-320px) scale(.96)', opacity: 0, filter: 'blur(5px)' }
      ], { duration: D, delay: 150, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both' }));
    }

    Promise.all(jobs).then(function (done) {
      outS.classList.remove('active');
      outS.style.zIndex = inS.style.zIndex = '';
      done.forEach(function (a) { a.cancel(); });
      animating = false;
      if (to === scenes.length - 1) FX.shower(REDUCED ? 3 : 10);
    });
  }
  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // keyboard
  document.addEventListener('keydown', function (e) {
    if (current < 0) return;
    var tag = (e.target && e.target.tagName) || '';
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === ' ' && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); next(); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(scenes.length - 1); }
  });

  // wheel / trackpad (with inertia guard)
  var wheelLock = 0, wheelAcc = 0;
  window.addEventListener('wheel', function (e) {
    if (current < 0) return;
    e.preventDefault();
    var now = performance.now();
    if (animating || now < wheelLock) { wheelLock = Math.max(wheelLock, now + 260); wheelAcc = 0; return; }
    wheelAcc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(wheelAcc) > 40) {
      var d = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      wheelLock = now + 1700;
      go(current + d);
    }
  }, { passive: false });

  // touch swipe (horizontal = page turn, vertical = scroll)
  var tStart = null;
  window.addEventListener('touchstart', function (e) {
    if (current < 0 || e.touches.length !== 1) { tStart = null; return; }
    var t = e.touches[0];
    tStart = { x: t.clientX, y: t.clientY, time: performance.now() };
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (!tStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - tStart.x, dy = t.clientY - tStart.y, dt = performance.now() - tStart.time;
    tStart = null;
    if (dt > 900) return;
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 45) return;
    if (ax > ay) { dx < 0 ? next() : prev(); }
    else { dy < 0 ? next() : prev(); }
  }, { passive: true });

  /* ======================================================================
     5. Cinematic opening — the envelope
     ====================================================================== */
  var envelope = $('#envelope');
  var opened = false;

  function intro() {
    body.classList.add('env-in');
    setTimeout(function () { body.classList.add('fog-lift'); }, 600);
    setTimeout(function () {
      body.classList.add('env-ready', 'music-on-ui');
    }, REDUCED ? 300 : 2900);
  }

  function openEnvelope() {
    if (opened) return;
    opened = true;
    body.classList.add('opening');
    envelope.setAttribute('aria-disabled', 'true');

    // music starts with the first gesture, unless the guest switched it off already
    if (!musicTouched) window.WeddingMusic.play();

    var seal = $('#seal');
    var flap = $('.env-flap-wrap', envelope);
    var letter = $('.env-letter', envelope);
    var sr = seal.getBoundingClientRect();
    var T = REDUCED ? .35 : 1;

    // freeze the floating pose
    var cs = getComputedStyle(envelope).transform;
    envelope.style.transform = cs === 'none' ? '' : cs;
    envelope.style.animation = 'none';
    envelope.style.opacity = '1';
    envelope.style.filter = 'none';

    FX.burst(sr.left + sr.width / 2, sr.top + sr.height / 2, 46);

    // 1 — the seal breaks away
    anim(seal, [
      { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1 },
      { transform: 'translate(-50%,-50%) scale(1.18) rotate(-6deg)', opacity: 1, offset: .3 },
      { transform: 'translate(-50%,-30%) scale(.4) rotate(24deg)', opacity: 0 }
    ], { duration: 700 * T, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' })
      .then(function () {
        seal.style.visibility = 'hidden';
        // 2 — the flap opens
        setTimeout(function () { flap.style.zIndex = 1; }, 420 * T);
        return anim(flap, [
          { transform: 'rotateX(0deg)' },
          { transform: 'rotateX(180deg)' }
        ], { duration: 950 * T, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' });
      })
      .then(function () {
        // 3 — the letter slides out
        return anim(letter, [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-46%)' }
        ], { duration: 1100 * T, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
      })
      .then(function () { return wait(120 * T); })
      .then(function () {
        // 4 — camera flies into the letter, which becomes the first card
        var lr = letter.getBoundingClientRect();
        var card = cards[0];
        current = 0;
        scenes[0].style.zIndex = 3;
        activate(0);
        updateUI();
        var cr = card.getBoundingClientRect();
        var sx = lr.width / cr.width, sy = lr.height / cr.height;
        var dx = (lr.left + lr.width / 2) - (cr.left + cr.width / 2);
        var dy = (lr.top + lr.height / 2) - (cr.top + cr.height / 2);

        letter.style.visibility = 'hidden';
        body.classList.add('opened');
        lightSweep();

        var D = REDUCED ? 600 : 1700;
        anim(envelope, [
          { transform: envelope.style.transform || 'none', opacity: 1, filter: 'blur(0px)' },
          { transform: 'translateY(38vh) scale(1.25)', opacity: 0, filter: 'blur(8px)' }
        ], { duration: D, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
        $('.op-inner').animate([{ opacity: 1 }, { opacity: 0 }], { duration: D, easing: 'ease-in', fill: 'forwards' });

        return anim(card, [
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')', opacity: 1 },
          { transform: 'translate(0,0) scale(1,1)', opacity: 1 }
        ], { duration: D, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'both' });
      })
      .then(function (a) {
        a.cancel();
        scenes[0].style.zIndex = '';
        $('#opening').classList.add('gone');
        body.classList.remove('is-intro', 'opening');
        body.classList.add('ui-on');
        FX.shower(REDUCED ? 2 : 8);
      });
  }
  envelope.addEventListener('click', openEnvelope);

  /* ======================================================================
     6. Music button
     ====================================================================== */
  var musicBtn = $('#musicBtn');
  var musicTouched = false;
  musicBtn.addEventListener('click', function () {
    musicTouched = true;
    window.WeddingMusic.toggle();
  });
  window.WeddingMusic.onChange(function (on) {
    musicBtn.classList.toggle('playing', on);
    musicBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', on ? 'Выключить музыку' : 'Включить музыку');
  });
  var pausedByHide = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && window.WeddingMusic.playing) { pausedByHide = true; window.WeddingMusic.pause(); }
    else if (!document.hidden && pausedByHide) { pausedByHide = false; window.WeddingMusic.play(); }
  });

  /* ======================================================================
     7. Countdown, map, share, replay
     ====================================================================== */
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  var target = new Date(CFG.dateISO || '2026-12-08T00:00:00').getTime();
  var cdEls = {}, cdLbl = {};
  ['d', 'h', 'm', 's'].forEach(function (k) {
    cdEls[k] = $('[data-cd="' + k + '"]');
    cdLbl[k] = $('[data-cdl="' + k + '"]');
  });
  var LBL = {
    d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'],
    m: ['минута', 'минуты', 'минут'], s: ['секунда', 'секунды', 'секунд']
  };
  function tickCountdown() {
    var diff = Math.max(0, target - Date.now());
    var v = {
      d: Math.floor(diff / 864e5),
      h: Math.floor(diff / 36e5) % 24,
      m: Math.floor(diff / 6e4) % 60,
      s: Math.floor(diff / 1e3) % 60
    };
    for (var k in v) {
      var txt = v[k] < 10 ? '0' + v[k] : String(v[k]);
      if (cdEls[k].textContent !== txt) cdEls[k].textContent = txt;
      var l = plural(v[k], LBL[k][0], LBL[k][1], LBL[k][2]);
      if (cdLbl[k].textContent !== l) cdLbl[k].textContent = l;
    }
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  var mapBtn = $('#mapBtn');
  mapBtn.href = CFG.mapUrl || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Туйхони Зикриддин'));

  var toastEl = $('#toast'), toastT = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  $('#shareBtn').addEventListener('click', function () {
    var data = {
      title: 'Фатхуллоходжа & Шукронахон · 08.12.2026',
      text: 'С любовью приглашаем вас разделить с нами самый счастливый день нашей жизни — 08.12.2026, Туйхони Зикриддин.',
      url: location.href
    };
    if (navigator.share) {
      navigator.share(data).catch(function () { /* dismissed */ });
      return;
    }
    var copy = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(data.url)
      : Promise.reject();
    copy.then(function () { toast('Ссылка скопирована'); }, function () {
      var ta = document.createElement('textarea');
      ta.value = data.url;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      toast(ok ? 'Ссылка скопирована' : data.url);
    });
  });

  $('#replayBtn').addEventListener('click', function () { go(0); });

  /* ======================================================================
     8. Boot
     ====================================================================== */
  buildLibrary();
  FX.init();
  initParallax();
  updateUI();

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, wait(2500)]).then(function () {
    requestAnimationFrame(intro);
  });
})();
