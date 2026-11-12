/* ==========================================================================
   Живой цветок: садовая роза с листьями, нарисованная на canvas.
   Лепестки с объёмом и тенями слегка дышат; цветок умеет сжиматься в бутон
   и распускаться (open: 0 — бутон, 1 — раскрыт).
   ========================================================================== */
(function () {
  'use strict';

  var cv = null, ctx = null, S = 200, dpr = 1, R = 50;

  // deterministic randomness: the flower looks the same on every visit
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(c1, c2, t) {
    return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
  }
  function rgb(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; }

  // petal colours: outer ring → heart of the flower
  var TIP = [[255, 233, 228], [242, 172, 176]];
  var MID = [[245, 184, 186], [216, 118, 136]];
  var BASE = [[214, 122, 142], [156, 56, 86]];
  var DEEP = [108, 26, 54];
  var WARM = [255, 214, 186];

  var RINGS = [
    { n: 6, r: 1.00, w: .60 },
    { n: 6, r: .85, w: .60 },
    { n: 5, r: .70, w: .62 },
    { n: 5, r: .55, w: .64 },
    { n: 4, r: .41, w: .68 },
    { n: 3, r: .28, w: .74 },
    { n: 3, r: .17, w: .80 }
  ];
  var petals = [];
  (function build() {
    var off = 0;
    for (var i = 0; i < RINGS.length; i++) {
      var g = RINGS[i];
      off += Math.PI / g.n + .9;
      for (var k = 0; k < g.n; k++) {
        petals.push({
          ring: i,
          t: i / (RINGS.length - 1),
          a: off + k * Math.PI * 2 / g.n + (rnd() - .5) * .3,
          len: g.r * (.9 + rnd() * .2),
          tint: rnd() * .22,
          wid: g.w * (.9 + rnd() * .2),
          ph: rnd() * Math.PI * 2,
          skew: (rnd() - .5) * .12
        });
      }
    }
  })();

  var LEAVES = [
    { a: 2.50, len: 1.62, wid: .48, ph: 0.3, bend: .16 },
    { a: 5.55, len: 1.50, wid: .44, ph: 2.1, bend: -.14 },
    { a: 4.05, len: 1.30, wid: .38, ph: 4.0, bend: .10 }
  ];

  function petalPath(len, wid, skew) {
    var s = skew * wid;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wid * .78, -len * .16, -wid * 1.04 + s, -len * .76, -wid * .46 + s, -len * .97);
    ctx.quadraticCurveTo(-wid * .14 + s, -len * 1.07, s, -len * .985);
    ctx.quadraticCurveTo(wid * .14 + s, -len * 1.07, wid * .46 + s, -len * .97);
    ctx.bezierCurveTo(wid * 1.04 + s, -len * .76, wid * .78, -len * .16, 0, 0);
    ctx.closePath();
  }

  function drawPetal(p, open, time) {
    // closed bud: every ring reaches about the same small radius
    var closedReach = (.50 - .045 * p.ring) / RINGS[p.ring].r;
    var e = clamp(open * 1.15 - p.t * .15, 0, 1);
    var breathe = 1 + Math.sin(time * .7 + p.ph) * .014;
    var len = R * p.len * lerp(Math.min(1, closedReach), 1, e) * breathe;
    var wid = len * p.wid * lerp(.8, 1, e);
    var ang = p.a + Math.sin(time * .9 + p.ph) * .03 * (1 - p.t * .6) + (1 - e) * .5 * (p.ring % 2 ? 1 : -1) * (1 - p.t);
    var tip = mix(mix(TIP[0], TIP[1], p.t), WARM, p.tint), mid = mix(mix(MID[0], MID[1], p.t), WARM, p.tint * .6), base = mix(BASE[0], BASE[1], p.t);

    ctx.save();
    ctx.rotate(ang);

    // body with a soft shadow on whatever lies beneath
    petalPath(len, wid, p.skew);
    var g = ctx.createRadialGradient(0, -len * .08, len * .03, 0, -len * .42, len * 1.02);
    g.addColorStop(0, rgb(base));
    g.addColorStop(.46, rgb(mid));
    g.addColorStop(.86, rgb(tip));
    g.addColorStop(1, rgb(mix(tip, [255, 255, 255], .3)));
    ctx.shadowColor = 'rgba(70, 8, 30, .55)';
    ctx.shadowBlur = R * .15;
    ctx.shadowOffsetX = R * .02;
    ctx.shadowOffsetY = R * .04;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;

    // volume: light from the upper left, the petal cups towards its base
    ctx.save();
    ctx.clip();
    var c = ctx.createLinearGradient(-wid, 0, wid, 0);
    c.addColorStop(0, 'rgba(255,255,255,.24)');
    c.addColorStop(.45, 'rgba(255,255,255,0)');
    c.addColorStop(1, rgb(DEEP, .3));
    ctx.fillStyle = c;
    ctx.fillRect(-wid * 1.2, -len * 1.1, wid * 2.4, len * 1.2);
    var d = ctx.createRadialGradient(0, 0, 0, 0, 0, len * .62);
    d.addColorStop(0, rgb(DEEP, .62));
    d.addColorStop(1, rgb(DEEP, 0));
    ctx.fillStyle = d;
    ctx.fillRect(-wid * 1.2, -len * .7, wid * 2.4, len * .8);
    // faint veins
    ctx.strokeStyle = rgb(DEEP, .1);
    ctx.lineWidth = Math.max(.5, R * .008);
    for (var v = -2; v <= 2; v++) {
      ctx.beginPath();
      ctx.moveTo(0, -len * .06);
      ctx.quadraticCurveTo(v * wid * .2, -len * .5, v * wid * .34 + p.skew * wid, -len * .93);
      ctx.stroke();
    }
    // curled lip catching the light: an inner stroke that fades away from the tip
    petalPath(len, wid, p.skew);
    var lip = ctx.createLinearGradient(0, -len * 1.04, 0, -len * .5);
    lip.addColorStop(0, 'rgba(255, 250, 246, ' + lerp(.9, .55, p.t) + ')');
    lip.addColorStop(.5, 'rgba(255, 250, 246, ' + lerp(.4, .2, p.t) + ')');
    lip.addColorStop(1, 'rgba(255, 250, 246, 0)');
    ctx.strokeStyle = lip;
    ctx.lineWidth = Math.max(1.4, R * .05);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function drawLeaf(L, time, open) {
    var len = R * L.len, wid = R * L.wid, N = 13;
    var a = L.a + Math.sin(time * .8 + L.ph) * .05;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -R * .3);

    // serrated outline around a gently bent midrib
    function mid(u) { return [Math.sin(u * Math.PI) * L.bend * len * .5, -u * len]; }
    function half(sign) {
      for (var i = 1; i <= N; i++) {
        var u = i / N, m = mid(u);
        var w = Math.pow(Math.sin(Math.PI * Math.pow(u, .78)), .9) * wid * .5;
        var tooth = i < N ? (i % 2 ? 1.07 : .95) : 0;
        ctx.lineTo(m[0] + sign * w * tooth, m[1]);
      }
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    half(-1);
    for (var i = N - 1; i >= 0; i--) {
      var u = i / N, m = mid(u);
      var w = Math.pow(Math.sin(Math.PI * Math.pow(u, .78)), .9) * wid * .5;
      ctx.lineTo(m[0] + w * (i % 2 ? 1.07 : .95), m[1]);
    }
    ctx.closePath();
    var g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, '#22382a');
    g.addColorStop(.45, '#3f6244');
    g.addColorStop(1, '#7c9a62');
    ctx.shadowColor = 'rgba(10, 30, 16, .4)';
    ctx.shadowBlur = R * .12;
    ctx.shadowOffsetY = R * .04;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.save();
    ctx.clip();
    // one half catches more light: the leaf folds along its midrib
    var sh = ctx.createLinearGradient(-wid * .5, 0, wid * .5, 0);
    sh.addColorStop(0, 'rgba(255,255,255,.2)');
    sh.addColorStop(.5, 'rgba(255,255,255,.04)');
    sh.addColorStop(.52, 'rgba(0,20,8,.16)');
    sh.addColorStop(1, 'rgba(0,20,8,.02)');
    ctx.fillStyle = sh;
    ctx.fillRect(-wid, -len, wid * 2, len);
    // veins
    ctx.strokeStyle = 'rgba(214, 232, 190, .42)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(.6, R * .012);
    for (var k = 1; k <= 6; k++) {
      var u0 = k / 7.4, m0 = mid(u0), m1 = mid(Math.min(1, u0 + .2));
      var w0 = Math.pow(Math.sin(Math.PI * Math.pow(u0 + .16, .78)), .9) * wid * .46;
      ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(m0[0] - w0 * .5, m0[1] - len * .08, m1[0] - w0, m1[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(m0[0] + w0 * .5, m0[1] - len * .08, m1[0] + w0, m1[1]); ctx.stroke();
    }
    ctx.restore();
    // midrib
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (var j = 1; j <= N; j++) { var mm = mid(j / N); ctx.lineTo(mm[0], mm[1]); }
    ctx.strokeStyle = 'rgba(226, 240, 204, .7)';
    ctx.lineWidth = Math.max(.8, R * .02);
    ctx.stroke();
    ctx.restore();
  }

  function draw(open, time, rot) {
    if (!ctx) return;
    open = clamp(open, 0, 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.translate(S / 2, S / 2);
    ctx.rotate(rot || 0);

    for (var l = 0; l < LEAVES.length; l++) drawLeaf(LEAVES[l], time, open);

    // soft shadow of the whole head on the leaves
    var reach = R * lerp(.52, 1, open);
    var sh = ctx.createRadialGradient(R * .03, R * .06, reach * .5, R * .03, R * .06, reach * 1.12);
    sh.addColorStop(0, 'rgba(40, 12, 20, .38)');
    sh.addColorStop(1, 'rgba(40, 12, 20, 0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(R * .03, R * .06, reach * 1.12, 0, Math.PI * 2);
    ctx.fill();

    for (var i = 0; i < petals.length; i++) drawPetal(petals[i], open, time);

    // heart of the rose
    var hr = R * .1;
    var hg = ctx.createRadialGradient(-hr * .3, -hr * .3, 0, 0, 0, hr);
    hg.addColorStop(0, rgb(mix(BASE[1], DEEP, .3)));
    hg.addColorStop(1, rgb(DEEP));
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(0, 0, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 236, 230, .55)';
    ctx.lineWidth = Math.max(.7, R * .014);
    ctx.beginPath();
    ctx.arc(0, 0, hr * .55, .6 + time * .05, 3.9 + time * .05);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hr * .08, hr * .05, hr * .95, 3.4, 5.9);
    ctx.stroke();
  }

  window.WeddingBloom = {
    init: function (canvas) {
      cv = canvas;
      ctx = cv.getContext('2d');
      return !!ctx;
    },
    // size: CSS pixels of the square canvas; the open flower is half of it across
    resize: function (size) {
      S = Math.round(size);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = cv.height = Math.round(S * dpr);
      cv.style.width = cv.style.height = S + 'px';
      R = S * .25;
    },
    draw: draw
  };
})();
