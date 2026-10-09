/* Стиль «Силуэт»: тёмные фигуры с контурным светом на плоских цветных слоях
   (в духе современных 2D-стелс-игр). Персонажи и сцены — оригинальные. */
(function () {
  var uid = 0;
  var ACC = '#e0523f', GOLD = '#e5b84a', LIGHT = '#f6ecd0', DARK = '#0e0d14';

  var PALS = {
    day:   { sky: ['#e8935a', '#f8d49b'], far: '#c47a5c', mid: '#82505a', near: '#3a2c3d', fg: '#17141d', sun: '#fff2cf' },
    cool:  { sky: ['#77a9c0', '#e8dec3'], far: '#6a98a6', mid: '#41707e', near: '#274656', fg: '#111d27', sun: '#fff7de' },
    night: { sky: ['#14183a', '#3d3b72'], far: '#2e3566', mid: '#222854', near: '#171b3c', fg: '#0b0c18', sun: '#f4ead2' },
    inter: { sky: ['#2a2030', '#4a3440'], far: '#3a2b38', mid: '#2c212e', near: '#211923', fg: '#120e15', sun: '#f2c27a' }
  };
  function palFor(id) {
    if (id === 'night' || id === 'temple') return PALS.night;
    if (id === 'hall' || id === 'room') return PALS.inter;
    if (id === 'river' || id === 'flood' || id === 'sea') return PALS.cool;
    return PALS.day;
  }

  function ridge(color, base, pts, y0) {
    var d = 'M0 220 L0 ' + (pts[0][1]);
    pts.forEach(function (p) { d += ' L' + p[0] + ' ' + p[1]; });
    d += ' L320 ' + pts[pts.length - 1][1] + ' L320 220 Z';
    return '<path d="' + d + '" fill="' + color + '" stroke="none"/>';
  }
  function pines(color, xs, base, h) {
    return xs.map(function (x, i) {
      var s = h * (0.8 + (i % 3) * 0.18);
      return '<path d="M' + x + ' ' + (base - s) + ' L' + (x - s * 0.28) + ' ' + (base - s * 0.45) + ' L' + (x - s * 0.16) + ' ' + (base - s * 0.45) + ' L' + (x - s * 0.36) + ' ' + base + ' L' + (x + s * 0.36) + ' ' + base + ' L' + (x + s * 0.16) + ' ' + (base - s * 0.45) + ' L' + (x + s * 0.28) + ' ' + (base - s * 0.45) + ' Z" fill="' + color + '" stroke="none"/>';
    }).join('');
  }
  function sunDisc(P, x, y, r) {
    return '<circle class="sil-sun" cx="' + x + '" cy="' + y + '" r="' + (r * 1.8) + '" fill="' + P.sun + '" opacity=".16" stroke="none"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + P.sun + '" stroke="none"/>';
  }
  function roof(color, cx, base, w, h) {
    return '<path d="M' + (cx - w / 2 - 8) + ' ' + base + ' Q' + (cx - w / 4) + ' ' + (base - 2) + ' ' + cx + ' ' + (base - h) + ' Q' + (cx + w / 4) + ' ' + (base - 2) + ' ' + (cx + w / 2 + 8) + ' ' + base + ' Z" fill="' + color + '" stroke="none"/>';
  }
  function tower(color, cx, base, w, tiers) {
    var s = '';
    for (var i = 0; i < tiers; i++) {
      var ww = w * (1 - i * 0.22), hh = 15, y = base - i * 24;
      s += '<rect x="' + (cx - ww / 2 + 3) + '" y="' + (y - hh) + '" width="' + (ww - 6) + '" height="' + hh + '" fill="' + color + '" stroke="none"/>' + roof(color, cx, y - hh, ww, 12);
    }
    return s + '<rect x="' + (cx - 1) + '" y="' + (base - tiers * 24 - 20) + '" width="2" height="12" fill="' + color + '" stroke="none"/>';
  }
  function windows(P, x, y, n, w, h, gap) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<rect x="' + (x + i * (w + gap)) + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + GOLD + '" opacity=".8" stroke="none"/>';
    return s;
  }
  function flameGlow(x, y, s) {
    return '<g class="sil-flick" style="transform-origin:' + x + 'px ' + y + 'px"><circle cx="' + x + '" cy="' + (y - 14 * s) + '" r="' + (34 * s) + '" fill="' + ACC + '" opacity=".28" stroke="none"/>' +
      '<path d="M' + x + ' ' + y + ' Q' + (x - 14 * s) + ' ' + (y - 18 * s) + ' ' + (x - 3 * s) + ' ' + (y - 36 * s) + ' Q' + (x - 1 * s) + ' ' + (y - 24 * s) + ' ' + (x + 7 * s) + ' ' + (y - 24 * s) + ' Q' + (x + 10 * s) + ' ' + (y - 36 * s) + ' ' + (x + 2 * s) + ' ' + (y - 50 * s) + ' Q' + (x + 28 * s) + ' ' + (y - 26 * s) + ' ' + (x + 16 * s) + ' ' + y + ' Z" fill="' + ACC + '" stroke="none"/>' +
      '<path d="M' + (x + 3 * s) + ' ' + y + ' Q' + (x - 4 * s) + ' ' + (y - 10 * s) + ' ' + (x + 2 * s) + ' ' + (y - 20 * s) + ' Q' + (x + 8 * s) + ' ' + (y - 10 * s) + ' ' + (x + 10 * s) + ' ' + y + ' Z" fill="' + GOLD + '" stroke="none"/></g>';
  }

  var SC = {
    village: function (P) {
      return sunDisc(P, 240, 74, 26) + ridge(P.far, 0, [[0, 128], [70, 112], [140, 130], [220, 108], [320, 126]]) + ridge(P.mid, 0, [[0, 150], [90, 138], [200, 152], [320, 140]]) +
        '<rect x="22" y="132" width="52" height="46" fill="' + P.near + '" stroke="none"/>' + roof(P.near, 48, 134, 52, 24) + windows(P, 34, 150, 2, 9, 12, 8) +
        [0, 1, 2, 3, 4, 5].map(function (i) { return '<rect x="' + (190 + i * 16) + '" y="150" width="3" height="28" fill="' + P.near + '" stroke="none"/>'; }).join('') + '<rect x="188" y="158" width="86" height="3" fill="' + P.near + '" stroke="none"/>';
    },
    road: function (P) {
      return sunDisc(P, 250, 70, 24) + ridge(P.far, 0, [[0, 120], [50, 80], [100, 118], [150, 74], [210, 120], [270, 92], [320, 124]]) + ridge(P.mid, 0, [[0, 150], [120, 140], [220, 154], [320, 144]]) +
        pines(P.near, [24, 56, 268, 300, 236], 172, 60) + '<path d="M130 220 L150 176 L170 176 L196 220 Z" fill="' + P.mid + '" opacity=".5" stroke="none"/>';
    },
    hall: function (P) {
      var s = '<rect width="320" height="150" fill="' + P.mid + '" stroke="none"/>';
      for (var i = 0; i < 4; i++) s += '<rect x="' + (22 + i * 76) + '" y="30" width="56" height="86" fill="' + GOLD + '" opacity=".78" stroke="none"/><path d="M' + (22 + i * 76) + ' 58 H' + (78 + i * 76) + ' M' + (22 + i * 76) + ' 88 H' + (78 + i * 76) + ' M' + (50 + i * 76) + ' 30 V116" stroke="' + P.near + '" stroke-width="3"/>';
      s += '<rect y="150" width="320" height="70" fill="' + P.fg + '" stroke="none"/><path d="M0 150 H320" stroke="' + GOLD + '" opacity=".25"/>';
      s += '<path d="M150 0 L170 0 L250 150 L70 150 Z" fill="' + GOLD + '" opacity=".14" stroke="none"/><rect x="152" y="0" width="16" height="8" fill="' + P.near + '" stroke="none"/>';
      return s;
    },
    castle: function (P) {
      return sunDisc(P, 70, 76, 24) + ridge(P.far, 0, [[0, 130], [60, 112], [130, 132], [250, 110], [320, 128]]) + tower(P.mid, 200, 146, 100, 3) +
        '<rect x="0" y="150" width="320" height="30" fill="' + P.near + '" stroke="none"/><path d="M0 150 H320" stroke="' + P.sun + '" opacity=".25"/>' + windows(P, 20, 160, 6, 10, 8, 40);
    },
    wall: function (P) {
      return sunDisc(P, 250, 66, 20) + ridge(P.far, 0, [[0, 120], [90, 100], [180, 124], [320, 108]]) + tower(P.mid, 260, 124, 70, 2) +
        '<path d="M0 220 L0 112 L112 112 L126 134 L140 122 L156 140 L172 112 L320 112 L320 220 Z" fill="' + P.near + '" stroke="none"/>' +
        '<path d="M122 150 V100 M178 150 V100 M122 118 H178 M122 134 H178" stroke="' + P.fg + '" stroke-width="3"/>';
    },
    river: function (P) {
      var s = sunDisc(P, 80, 70, 24) + ridge(P.far, 0, [[0, 116], [60, 82], [120, 114], [200, 86], [260, 112], [320, 96]]) + pines(P.mid, [30, 70, 250, 290], 140, 46);
      s += '<rect y="140" width="320" height="46" fill="' + P.near + '" stroke="none"/>';
      for (var i = 0; i < 6; i++) s += '<rect x="' + (10 + i * 54) + '" y="' + (148 + (i % 3) * 10) + '" width="' + (24 + (i % 2) * 14) + '" height="2.4" fill="' + P.sun + '" opacity=".5" stroke="none"/>';
      s += '<rect x="90" y="146" width="62" height="7" rx="3.5" fill="' + P.fg + '" stroke="none"/><rect x="190" y="156" width="70" height="7" rx="3.5" fill="' + P.fg + '" stroke="none"/>';
      return s;
    },
    field: function (P) {
      var s = sunDisc(P, 240, 80, 22) + ridge(P.far, 0, [[0, 130], [100, 112], [200, 134], [320, 118]]) + ridge(P.mid, 0, [[0, 156], [160, 148], [320, 158]]);
      [34, 276].forEach(function (x) { s += '<rect x="' + x + '" y="84" width="3" height="94" fill="' + P.fg + '" stroke="none"/><path d="M' + (x + 3) + ' 88 H' + (x + 36) + ' V120 H' + (x + 3) + ' Z" fill="' + ACC + '" stroke="none"/>'; });
      for (var i = 0; i < 12; i++) s += '<path d="M' + (70 + i * 15) + ' 160 V132 M' + (70 + i * 15) + ' 128 l-2 6 h4 z" stroke="' + P.near + '" stroke-width="1.6" fill="' + P.near + '"/>';
      return s;
    },
    flood: function (P) {
      var s = sunDisc(P, 70, 66, 22) + ridge(P.far, 0, [[0, 120], [70, 96], [150, 124], [250, 100], [320, 118]]) + '<rect y="124" width="320" height="70" fill="' + P.mid + '" stroke="none"/>';
      s += tower(P.fg, 160, 132, 70, 2) + '<path d="M120 132 H200 L208 142 H112 Z" fill="' + P.fg + '" stroke="none"/>';
      for (var i = 0; i < 7; i++) s += '<rect x="' + (14 + i * 46) + '" y="' + (146 + (i % 3) * 9) + '" width="' + (26 + (i % 2) * 12) + '" height="2.4" fill="' + P.sun + '" opacity=".5" stroke="none"/>';
      return s + '<path d="M0 124 L38 106 H66 L84 124 Z M236 124 L254 106 H282 L320 124 Z" fill="' + P.near + '" stroke="none"/>';
    },
    night: function (P) {
      var s = sunDisc(P, 250, 52, 16);
      for (var i = 0; i < 18; i++) s += '<circle cx="' + ((i * 53) % 310 + 5) + '" cy="' + (12 + (i * 29) % 90) + '" r="1.1" fill="' + LIGHT + '" opacity=".75" stroke="none"/>';
      return s + ridge(P.far, 0, [[0, 130], [80, 106], [160, 132], [260, 108], [320, 128]]) + ridge(P.mid, 0, [[0, 156], [120, 148], [320, 158]]);
    },
    temple: function (P) {
      var s = SC.night(P);
      s += '<rect x="76" y="128" width="168" height="52" fill="' + P.fg + '" stroke="none"/>' + roof(P.fg, 160, 130, 190, 30) + windows(P, 94, 142, 5, 18, 28, 14);
      return s + flameGlow(104, 138, 1.5) + flameGlow(160, 112, 2.2) + flameGlow(218, 136, 1.7);
    },
    sea: function (P) {
      var s = sunDisc(P, 80, 80, 26) + '<rect y="116" width="320" height="104" fill="' + P.mid + '" stroke="none"/>';
      for (var i = 0; i < 9; i++) s += '<rect x="' + (i * 38 - 8) + '" y="' + (128 + (i % 4) * 12) + '" width="' + (22 + (i % 3) * 10) + '" height="2.4" fill="' + P.sun + '" opacity=".5" stroke="none"/>';
      [[220, 150, 1], [280, 138, 0.7]].forEach(function (b) {
        s += '<path d="M' + (b[0] - 40 * b[2]) + ' ' + b[1] + ' H' + (b[0] + 44 * b[2]) + ' L' + (b[0] + 32 * b[2]) + ' ' + (b[1] + 14 * b[2]) + ' H' + (b[0] - 28 * b[2]) + ' Z" fill="' + P.fg + '" stroke="none"/><rect x="' + (b[0] - 1) + '" y="' + (b[1] - 54 * b[2]) + '" width="2.4" height="54" fill="' + P.fg + '" stroke="none"/><path d="M' + (b[0] + 3) + ' ' + (b[1] - 52 * b[2]) + ' Q' + (b[0] + 34 * b[2]) + ' ' + (b[1] - 30 * b[2]) + ' ' + (b[0] + 3) + ' ' + (b[1] - 6) + ' Z" fill="' + P.near + '" stroke="none"/>';
      });
      return s;
    },
    tea: function (P) {
      var s = sunDisc(P, 250, 70, 22) + ridge(P.far, 0, [[0, 128], [100, 112], [210, 132], [320, 118]]);
      s += '<rect x="226" y="124" width="70" height="54" fill="' + P.near + '" stroke="none"/>' + roof(P.near, 261, 126, 70, 26) + windows(P, 238, 142, 2, 14, 18, 12);
      [[40, 120, 38], [66, 130, 30], [26, 134, 26]].forEach(function (b) { s += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="#e58fa0" opacity=".85" stroke="none"/>'; });
      s += '<rect x="44" y="140" width="6" height="40" fill="' + P.near + '" stroke="none"/><rect x="171" y="130" width="3" height="48" fill="' + P.near + '" stroke="none"/><path d="M146 132 Q172 106 198 132 Z" fill="' + ACC + '" stroke="none"/>';
      return s;
    },
    mount: function (P) {
      return sunDisc(P, 240, 62, 26) + ridge(P.far, 0, [[0, 110], [60, 64], [110, 108], [170, 44], [240, 112], [290, 80], [320, 110]]) + ridge(P.mid, 0, [[0, 150], [80, 126], [160, 150], [250, 130], [320, 150]]) + pines(P.near, [20, 52, 280, 306], 178, 54);
    },
    camp: function (P) {
      var s = sunDisc(P, 70, 72, 22) + ridge(P.far, 0, [[0, 126], [120, 108], [240, 132], [320, 114]]) + '<path d="M180 150 Q250 112 320 150 Z" fill="' + P.mid + '" stroke="none"/>' + tower(P.near, 262, 134, 60, 2);
      [[40, 1], [96, 0.8], [150, 1.1]].forEach(function (t) {
        var x = t[0], k = t[1];
        s += '<path d="M' + (x - 30 * k) + ' 180 L' + x + ' ' + (180 - 46 * k) + ' L' + (x + 30 * k) + ' 180 Z" fill="' + P.fg + '" stroke="none"/><rect x="' + (x - 1) + '" y="' + (180 - 62 * k) + '" width="2" height="18" fill="' + P.fg + '" stroke="none"/><path d="M' + (x + 1) + ' ' + (180 - 62 * k) + ' h14 l-4 5 l4 5 h-14 z" fill="' + ACC + '" stroke="none"/>';
      });
      return s;
    }
  };
  SC.room = SC.hall;

  /* ---------- Персонажи-силуэты ---------- */
  var ACCENT = { hide: ACC, hideL: ACC, hideK: '#a07be0', nobu: GOLD, sam: '#6fa3c8', pea: '#b59b6e', foe: '#b06ac0', mon: '#d9d2c0' };
  function sArm(d) { return '<path d="' + d + '" fill="none" stroke="' + DARK + '" stroke-width="8.5"/>'; }

  function silPerson(o) {
    var s = o.s || 1, m = o.mood || 'calm', pose = o.pose || 'down', acc = ACCENT[o.k] || GOLD;
    var h = o.k === 'nobu' ? 1.1 : (o.k.indexOf('hide') === 0) ? 0.92 : 1;
    var rim = 'rgba(255,236,200,.42)';
    var g = '<g transform="translate(' + o.x + ',' + o.y + ') scale(' + ((o.flip ? -1 : 1) * s * h) + ',' + (s * h) + ')" stroke="' + rim + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">';
    g += '<g class="sil-idle" style="animation-delay:-' + ((o.x || 0) % 7 / 3).toFixed(2) + 's">';
    g += '<path class="sil-scarf" d="M-6 -88 Q-22 -91 -31 -82 Q-40 -73 -50 -80" fill="none" stroke="' + acc + '" stroke-width="5.5" style="transform-origin:-6px -88px"/>';
    if (o.k === 'nobu') g += '<path d="M-19 -86 Q-36 -48 -28 -2 L-12 -2 L-14 -60 Z" fill="' + DARK + '"/><path d="M19 -86 Q38 -48 30 -2 L14 -2 L16 -60 Z" fill="' + acc + '" opacity=".8" stroke="none"/>';
    g += '<path d="M-17 -48 L-23 0 H-4 L0 -20 L4 0 H23 L17 -48 Z" fill="' + DARK + '"/>';
    g += '<path d="M-19 -50 L-16 -89 Q0 -95 16 -89 L19 -50 Z" fill="' + DARK + '"/>';
    g += '<path d="M-19 -55 H19 V-47 H-19 Z" fill="' + acc + '" stroke="none"/><path d="M12 -55 l9 14 l-5 1 z" fill="' + acc + '" stroke="none"/>';
    var arms = {
      down:  'M-17 -85 L-25 -57 M17 -85 L25 -57', up: 'M-17 -85 L-25 -57 M17 -85 L31 -112', point: 'M-17 -85 L-25 -57 M17 -85 L44 -94',
      hold:  'M-17 -85 L-9 -64 L6 -66 M17 -85 L9 -64 L-6 -66', cross: 'M-17 -85 L8 -66 M17 -85 L-8 -66', both: 'M-17 -85 L-30 -112 M17 -85 L30 -112', kneel: 'M-17 -85 L-9 -62 L6 -60 M17 -85 L9 -62 L-6 -60'
    };
    (arms[pose] || arms.down).split(' M').forEach(function (seg, i) { g += sArm('M' + seg.replace(/^M/, '')); });
    g += '<circle cx="0" cy="-100" r="12.5" fill="' + DARK + '"/>';
    if (o.hat === 'kasa') g += '<path d="M-26 -106 Q0 -134 26 -106 Z" fill="' + DARK + '"/>';
    else if (o.hat === 'helm') g += '<path d="M-15 -104 Q0 -130 15 -104 Z" fill="' + DARK + '"/><path d="M0 -126 l-9 -13 h18 z" fill="' + acc + '" stroke="none"/>';
    else g += '<path d="M0 -112 Q6 -126 15 -122" fill="none" stroke="' + DARK + '" stroke-width="4"/><path d="M0 -112 Q6 -126 15 -122" fill="none" stroke="' + rim + '" stroke-width="1" opacity=".6"/>';
    // глаза-прорези светом
    var ey = '';
    if (m === 'angry') ey = '<path d="M-9 -104 L-2 -100.5 M9 -104 L2 -100.5" stroke="' + LIGHT + '" stroke-width="2.4" fill="none"/>';
    else if (m === 'shock') ey = '<circle cx="-5" cy="-101" r="2.8" fill="' + LIGHT + '" stroke="none"/><circle cx="5" cy="-101" r="2.8" fill="' + LIGHT + '" stroke="none"/>';
    else if (m === 'happy') ey = '<path d="M-8 -100 q3 -3.5 6 0 M2 -100 q3 -3.5 6 0" stroke="' + LIGHT + '" stroke-width="2" fill="none"/>';
    else if (m === 'worry') ey = '<path d="M-8 -103 L-2 -101 M8 -103 L2 -101" stroke="' + LIGHT + '" stroke-width="2" fill="none"/><circle cx="-5" cy="-99.4" r="1.4" fill="' + LIGHT + '" stroke="none"/><circle cx="5" cy="-99.4" r="1.4" fill="' + LIGHT + '" stroke="none"/>';
    else ey = '<path d="M-8 -101 h6 M2 -101 h6" stroke="' + LIGHT + '" stroke-width="2.6" fill="none"/>';
    g += ey;
    if (o.item === 'sandals') g += '<ellipse cx="-5" cy="-70" rx="9" ry="3.6" fill="' + GOLD + '" stroke="none"/><ellipse cx="9" cy="-70" rx="9" ry="3.6" fill="' + GOLD + '" stroke="none"/>';
    if (o.item === 'scroll') g += '<rect x="-10" y="-74" width="22" height="8" rx="4" fill="' + LIGHT + '" stroke="none"/>';
    if (o.item === 'fan') g += '<path d="M30 -94 l-3 -22 q14 -4 25 6 z" fill="' + GOLD + '" stroke="none" transform="translate(' + (pose === 'point' ? 14 : 0) + ',0)"/>';
    if (o.item === 'spear') g += '<path d="M30 -2 L30 -150" stroke="' + rim + '" stroke-width="2.6"/><path d="M30 -150 l-4 -14 l8 0 z" fill="' + LIGHT + '" stroke="none"/>';
    if (o.item === 'cup') g += '<path d="M-8 -72 h16 q-2 10 -8 10 q-6 0 -8 -10 z" fill="' + LIGHT + '" stroke="none"/>';
    return g + '</g></g>';
  }

  /* ---------- Эффекты шума и света ---------- */
  function rings(panel) {
    var shout = (panel.b || []).some(function (b) { return b.k === 'shout'; });
    var c = (panel.c || [])[0];
    if (!shout || !c) return '';
    var s = (c.s || 1) >= 1.5 ? 1.6 : (c.s || 1), cx = Math.min(300, Math.max(20, c.x)), cy = (c.s || 1) >= 1.5 ? 70 : c.y - 100 * s * 0.92;
    return [16, 30, 46].map(function (r, i) { return '<circle class="sil-ring" style="animation-delay:' + (i * 0.28).toFixed(2) + 's;transform-origin:' + cx + 'px ' + cy + 'px" cx="' + cx + '" cy="' + cy + '" r="' + (r * s) + '" fill="none" stroke="' + ACC + '" stroke-width="' + (2.4 - i * 0.5) + '" opacity="' + (0.7 - i * 0.2) + '"/>'; }).join('');
  }

  function svg(panel) {
    var id = 'sg' + (++uid), P = palFor(panel.s), sc = SC[panel.s] || SC.village;
    var out = '<svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:' + LIGHT + '" role="img" aria-label="' + (panel.cap ? String(panel.cap).replace(/"/g, '&quot;') : 'Иллюстрация') + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.sky[0] + '"/><stop offset="1" stop-color="' + P.sky[1] + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'v" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>' +
      '<rect width="320" height="220" fill="url(#' + id + ')"/>' + sc(P);
    if (panel.s !== 'hall' && panel.s !== 'room') out += '<rect y="178" width="320" height="42" fill="' + P.fg + '"/><path d="M0 178 H320" stroke="' + LIGHT + '" opacity=".16"/>';
    var F = window.Comic && Comic.fx;
    (panel.fx || []).filter(function (f) { return f.t === 'speed' || f.t === 'focus' || f.t === 'rain'; }).forEach(function (f) { if (F) out += F(f); });
    out += rings(panel);
    (panel.c || []).forEach(function (c) { out += silPerson(c); });
    (panel.fx || []).filter(function (f) { return !(f.t === 'speed' || f.t === 'focus' || f.t === 'rain'); }).forEach(function (f) { if (F) out += F(f); });
    return out + '<rect width="320" height="220" fill="url(#' + id + 'v)" stroke="none"/></svg>';
  }

  window.ComicSil = { svg: svg };
})();
