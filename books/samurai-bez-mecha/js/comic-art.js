/* Рисовалка комикс-панелей: оригинальные персонажи и сцены в виде inline SVG.
   Цвета берутся из CSS-переменных, поэтому панели работают во всех темах. */
(function () {
  var INK = 'currentColor', SK = '#f2d4b3';
  var PAL = {
    hide:  { robe: '#8d7554', sash: '#5b4a33' },
    hideL: { robe: '#a3402f', sash: '#4a3a2a' },
    hideK: { robe: '#6a4c93', sash: '#a7802f' },
    nobu:  { robe: '#2f2a3a', sash: '#b23a2b' },
    sam:   { robe: '#3d5a73', sash: '#22313d' },
    pea:   { robe: '#b59b6e', sash: '#7d6a47' },
    foe:   { robe: '#5b3a58', sash: '#2b1c2a' },
    mon:   { robe: '#d9d2c0', sash: '#8a8472' }
  };

  function eyes(m) {
    switch (m) {
      case 'happy':  return '<path d="M-7.5 -101 q3 -3.5 6 0 M1.5 -101 q3 -3.5 6 0" fill="none"/>';
      case 'angry':  return '<path d="M-9 -105 L-2 -101.5 M9 -105 L2 -101.5" fill="none"/><circle cx="-5" cy="-100" r="1.3" fill="' + INK + '"/><circle cx="5" cy="-100" r="1.3" fill="' + INK + '"/>';
      case 'shock':  return '<circle cx="-5" cy="-101" r="3" fill="var(--surface)"/><circle cx="5" cy="-101" r="3" fill="var(--surface)"/><circle cx="-5" cy="-101" r="1" fill="' + INK + '"/><circle cx="5" cy="-101" r="1" fill="' + INK + '"/>';
      case 'worry':  return '<path d="M-8 -104 L-2 -106 M8 -104 L2 -106" fill="none"/><circle cx="-5" cy="-100.5" r="1.3" fill="' + INK + '"/><circle cx="5" cy="-100.5" r="1.3" fill="' + INK + '"/>';
      case 'det':    return '<path d="M-8 -102 h6 M2 -102 h6" fill="none" stroke-width="2.8"/>';
      default:       return '<circle cx="-5" cy="-101" r="1.5" fill="' + INK + '"/><circle cx="5" cy="-101" r="1.5" fill="' + INK + '"/>';
    }
  }
  function mouth(m) {
    switch (m) {
      case 'happy': return '<path d="M-4.5 -95 q4.5 5 9 0" fill="none"/>';
      case 'angry':
      case 'shout': return '<ellipse cx="0" cy="-93.5" rx="3.5" ry="3" fill="' + INK + '"/>';
      case 'shock': return '<ellipse cx="0" cy="-93.5" rx="2" ry="2.6" fill="var(--surface)"/>';
      case 'worry': return '<path d="M-3 -92.5 q3 -2.5 6 0" fill="none"/>';
      default:      return '<path d="M-3 -94 h6" fill="none"/>';
    }
  }
  function arm(d, P) {
    return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="10"/>' +
           '<path d="' + d + '" fill="none" stroke="' + P.robe + '" stroke-width="6"/>';
  }
  function hand(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="3.6" fill="' + SK + '"/>'; }

  function person(o) {
    var P = PAL[o.k] || PAL.sam, s = o.s || 1, m = o.mood || 'calm', pose = o.pose || 'down';
    var h = o.k === 'nobu' ? 1.1 : (o.k === 'hide' || o.k === 'hideL' || o.k === 'hideK') ? 0.92 : 1;
    var g = '<g transform="translate(' + o.x + ',' + o.y + ') scale(' + ((o.flip ? -1 : 1) * s * h) + ',' + (s * h) + ')" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">';
    if (o.k === 'nobu') g += '<path d="M-20 -88 Q-34 -50 -26 -6 L26 -6 Q34 -50 20 -88 Z" fill="#b23a2b" opacity=".9"/>';
    // ноги и хакама
    g += '<path d="M-17 -48 L-22 0 H-4 L0 -20 L4 0 H22 L17 -48 Z" fill="' + P.sash + '"/>';
    // торс
    g += '<path d="M-19 -50 L-16 -89 Q0 -95 16 -89 L19 -50 Z" fill="' + P.robe + '"/>';
    g += '<path d="M-19 -54 H19 V-47 H-19 Z" fill="' + P.sash + '"/>';
    if (o.k === 'hideL' || o.k === 'sam' || o.k === 'foe') g += '<path d="M-16 -86 L-16 -56 M16 -86 L16 -56 M-8 -88 V-58 M8 -88 V-58" fill="none" stroke-width="1.4" opacity=".6"/>';
    g += '<path d="M-6 -91 L0 -72 L6 -91" fill="none"/>';
    // руки
    var A = {
      down:  arm('M-17 -85 L-25 -57', P) + arm('M17 -85 L25 -57', P) + hand(-25, -55) + hand(25, -55),
      up:    arm('M-17 -85 L-25 -57', P) + arm('M17 -85 L31 -112', P) + hand(-25, -55) + hand(31, -115),
      point: arm('M-17 -85 L-25 -57', P) + arm('M17 -85 L44 -94', P) + hand(-25, -55) + hand(47, -94),
      hold:  arm('M-17 -85 L-9 -64 L6 -66', P) + arm('M17 -85 L9 -64 L-6 -66', P) + hand(0, -66),
      cross: arm('M-17 -85 L8 -66', P) + arm('M17 -85 L-8 -66', P) + hand(8, -65) + hand(-8, -65),
      both:  arm('M-17 -85 L-30 -112', P) + arm('M17 -85 L30 -112', P) + hand(-30, -115) + hand(30, -115),
      kneel: arm('M-17 -85 L-9 -62 L6 -60', P) + arm('M17 -85 L9 -62 L-6 -60', P) + hand(0, -60)
    };
    g += A[pose] || A.down;
    // голова
    g += '<circle cx="0" cy="-100" r="12.5" fill="' + SK + '"/>';
    g += '<ellipse cx="-12.5" cy="-100" rx="2.6" ry="4" fill="' + SK + '"/><ellipse cx="12.5" cy="-100" rx="2.6" ry="4" fill="' + SK + '"/>';
    if (o.k.indexOf('hide') === 0) g += '<path d="M-9 -96 q2 3 4 3 M9 -96 q-2 3 -4 3" fill="none" stroke-width="1.1" opacity=".7"/><path d="M-6 -110 q2 -2 4 0 M2 -110 q2 -2 4 0" fill="none" stroke-width="1" opacity=".5"/>';
    g += eyes(m) + mouth(m);
    if (o.k === 'nobu') g += '<path d="M-7 -97 q3.5 -3 7 0 q3.5 -3 7 0" fill="none" stroke-width="1.8"/>';
    // причёска / головной убор
    if (o.hat === 'kasa') g += '<path d="M-24 -106 Q0 -132 24 -106 Z" fill="#d6b66a"/><path d="M-12 -118 L0 -110 L12 -118" fill="none" stroke-width="1" opacity=".6"/>';
    else if (o.hat === 'helm') g += '<path d="M-15 -104 Q0 -130 15 -104 Z" fill="#4a4a52"/><path d="M0 -126 l-9 -13 h18 z" fill="#a7802f"/>';
    else if (o.hat === 'eboshi') g += '<path d="M-10 -108 L-6 -128 H10 L12 -108 Z" fill="#1d1a24"/>';
    else g += '<path d="M-12.5 -102 Q-12 -115 0 -115 Q12 -115 12.5 -102 Q6 -108 0 -108 Q-6 -108 -12.5 -102 Z" fill="' + INK + '"/><path d="M0 -115 Q4 -125 12 -122" fill="none" stroke-width="3.4"/>';
    // предметы
    if (o.item === 'sandals') g += '<ellipse cx="-5" cy="-70" rx="9" ry="4" fill="#d6b66a"/><ellipse cx="9" cy="-70" rx="9" ry="4" fill="#d6b66a"/>';
    if (o.item === 'scroll')  g += '<rect x="-10" y="-74" width="22" height="9" rx="4" fill="#f4ead2"/><path d="M-6 -69.5 h14" stroke-width="1" fill="none"/>';
    if (o.item === 'fan')     g += '<path d="M30 -94 l-3 -22 q14 -4 25 6 z" fill="#d9ab48" transform="translate(' + (pose === 'point' ? 14 : 0) + ',0)"/>';
    if (o.item === 'spear')   g += '<path d="M30 -2 L30 -150" stroke-width="3" fill="none"/><path d="M30 -150 l-4 -14 l8 0 z" fill="' + INK + '"/>';
    if (o.item === 'cup')     g += '<path d="M-8 -72 h16 q-2 10 -8 10 q-6 0 -8 -10 z" fill="#e8dcc0"/>';
    g += '</g>';
    return g;
  }

  /* ---------- Сцены ---------- */
  var S = {
    village: function () {
      return '<circle cx="245" cy="62" r="26" fill="var(--accent)" stroke="none" opacity=".9"/>' +
        '<path d="M0 150 Q80 120 150 142 T320 130 V220 H0 Z" fill="currentColor" opacity=".08" stroke="none"/>' +
        '<path d="M0 172 H320" opacity=".4"/>' +
        '<path d="M26 150 L58 122 L90 150 Z" fill="var(--surface)"/><path d="M34 150 V176 H82 V150" fill="var(--surface)"/><path d="M52 176 V158 H66 V176"/>' +
        '<path d="M170 176 v-14 M180 176 v-18 M190 176 v-14 M200 176 v-18 M210 176 v-14 M220 176 v-18" stroke="#a7802f" stroke-width="3"/>';
    },
    road: function () {
      return '<circle cx="262" cy="52" r="20" fill="var(--accent)" stroke="none" opacity=".85"/>' +
        '<path d="M0 120 L50 78 L96 112 L150 70 L210 118 L260 90 L320 124 V220 H0 Z" fill="currentColor" opacity=".1" stroke="none"/>' +
        '<path d="M120 220 L150 130 M230 220 L170 130" opacity=".6"/><path d="M150 130 H170" opacity=".4"/>' +
        '<path d="M44 170 V130 M44 140 L30 154 M44 134 L58 150 M44 128 L34 140" stroke-width="3"/>';
    },
    hall: function () {
      var l = '<rect x="0" y="0" width="320" height="140" fill="currentColor" opacity=".06" stroke="none"/>' +
        '<path d="M0 140 H320"/><path d="M0 220 L40 140 M80 220 L100 140 M160 220 L160 140 M240 220 L220 140 M320 220 L280 140" opacity=".35"/>';
      for (var i = 0; i < 6; i++) l += '<path d="M' + (i * 64) + ' 0 V140" opacity=".5"/>';
      l += '<path d="M0 36 H320 M0 88 H320" opacity=".35"/><rect x="132" y="22" width="56" height="86" fill="var(--surface)"/><path d="M144 40 q16 20 32 0 M146 70 q14 -14 28 0" stroke="var(--accent)" fill="none"/>';
      return l;
    },
    castle: function () {
      return '<path d="M0 176 H320" opacity=".5"/><path d="M0 176 V150 H320 V176" fill="currentColor" opacity=".1" stroke="none"/>' +
        '<path d="M110 150 L120 118 H200 L210 150" fill="var(--surface)"/><path d="M122 118 V98 H198 V118" fill="var(--surface)"/>' +
        '<path d="M112 98 L160 74 L208 98 M128 74 L160 52 L192 74" fill="none"/><path d="M144 98 V118 M176 98 V118" opacity=".5"/>' +
        '<path d="M160 52 V38" stroke="var(--accent)"/><path d="M160 38 l16 5 l-16 5" fill="var(--accent)" stroke="none"/>';
    },
    wall: function () {
      return '<path d="M0 176 H320" opacity=".5"/><path d="M0 176 V120 H120 L136 138 L150 124 L164 140 L176 120 H320 V176" fill="var(--surface)"/>' +
        '<path d="M0 148 H320 M70 120 V176 M140 148 V176 M210 120 V176 M280 120 V176" opacity=".3"/>' +
        '<path d="M150 176 V90 M150 90 H200 M200 90 V176 M150 120 H200 M150 148 H200" opacity=".6"/>';
    },
    river: function () {
      var l = '<path d="M0 120 Q80 100 150 120 T320 112 V220 H0 Z" fill="var(--accent)" opacity=".12" stroke="none"/>';
      for (var i = 0; i < 4; i++) l += '<path d="M0 ' + (136 + i * 18) + ' q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" opacity="' + (0.6 - i * 0.12) + '" stroke="var(--accent)"/>';
      l += '<path d="M0 120 Q80 100 150 120 T320 112" /><path d="M0 100 L40 70 L80 96 L130 60 L190 98 L250 72 L320 100" opacity=".25"/>';
      return l;
    },
    field: function () {
      return '<path d="M0 150 Q100 134 200 150 T320 146 V220 H0 Z" fill="currentColor" opacity=".1" stroke="none"/>' +
        '<path d="M40 150 V92 M40 98 H70 V120 H40" stroke="var(--accent)"/><path d="M250 150 V84 M250 90 H282 V114 H250" stroke="var(--accent)"/>' +
        '<path d="M100 150 l4 -12 l4 12 M120 148 l4 -12 l4 12 M140 150 l4 -12 l4 12 M160 148 l4 -12 l4 12 M180 150 l4 -12 l4 12" opacity=".5"/>';
    },
    flood: function () {
      var l = '<path d="M0 118 H320 V220 H0 Z" fill="var(--accent)" opacity=".16" stroke="none"/>';
      for (var i = 0; i < 4; i++) l += '<path d="M0 ' + (126 + i * 22) + ' q20 -9 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="var(--accent)" opacity="' + (0.8 - i * 0.15) + '"/>';
      l += '<path d="M118 118 L128 92 H192 L202 118 Z" fill="var(--surface)"/><path d="M130 92 V76 H190 V92 M124 76 L160 56 L196 76" fill="var(--surface)"/>' +
        '<path d="M0 118 L30 100 H60 L80 118 M240 118 L262 100 H292 L320 118" opacity=".5"/>';
      return l;
    },
    night: function () {
      return '<rect width="320" height="220" fill="currentColor" opacity=".55" stroke="none"/><circle cx="262" cy="40" r="16" fill="#f4ead2" stroke="none"/>' +
        '<path d="M30 30 l2 0 M80 52 l2 0 M140 24 l2 0 M200 60 l2 0 M300 90 l2 0" stroke="#f4ead2" stroke-width="3"/><path d="M0 176 H320" stroke="#f4ead2" opacity=".4"/>';
    },
    temple: function () {
      return S.night() +
        '<path d="M70 176 V122 H250 V176" fill="var(--surface)" opacity=".92"/><path d="M52 122 Q160 84 268 122 L250 108 Q160 76 70 108 Z" fill="currentColor" stroke="none"/>' +
        '<path d="M110 176 V130 M160 176 V130 M210 176 V130" opacity=".5"/>' +
        flame(90, 128, 1.2) + flame(160, 110, 1.6) + flame(226, 126, 1.3);
    },
    sea: function () {
      var l = '<circle cx="80" cy="56" r="22" fill="var(--accent)" stroke="none" opacity=".85"/><path d="M0 130 H320 V220 H0 Z" fill="var(--accent)" opacity=".13" stroke="none"/>';
      for (var i = 0; i < 4; i++) l += '<path d="M0 ' + (140 + i * 20) + ' q20 -9 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="var(--accent)" opacity="' + (0.8 - i * 0.15) + '"/>';
      l += '<path d="M190 148 L250 148 L242 162 H198 Z" fill="var(--surface)"/><path d="M220 148 V96 M220 100 Q250 116 220 138" fill="var(--surface)"/>' +
        '<path d="M260 140 L300 140 L295 150 H265 Z" fill="var(--surface)" opacity=".8"/><path d="M280 140 V108 M280 112 Q298 122 280 132" fill="var(--surface)" opacity=".8"/>';
      return l;
    },
    tea: function () {
      return '<path d="M0 176 H320" opacity=".5"/><path d="M0 176 V160 H320 V176" fill="currentColor" opacity=".08" stroke="none"/>' +
        '<path d="M40 176 V110 M40 120 Q10 110 14 90 Q40 94 40 116 M40 112 Q70 100 62 80 Q36 86 40 110" stroke-width="2.5" fill="var(--accent)" opacity=".5"/>' +
        '<path d="M236 176 V132 H300 V176" fill="var(--surface)"/><path d="M226 132 L268 108 L310 132 Z" fill="currentColor" stroke="none"/><path d="M252 176 V148 H284 V176"/>' +
        '<path d="M170 176 V136 M146 136 Q170 112 194 136 Z" fill="var(--accent)"/>';
    },
    mount: function () {
      return '<circle cx="250" cy="48" r="22" fill="var(--accent)" stroke="none" opacity=".85"/>' +
        '<path d="M0 150 L60 70 L100 118 L150 52 L210 124 L260 86 L320 140 V220 H0 Z" fill="currentColor" opacity=".13" stroke="none"/>' +
        '<path d="M0 150 L60 70 L100 118 L150 52 L210 124 L260 86 L320 140"/>' +
        '<path d="M0 182 H320" opacity=".4"/><path d="M20 110 h40 M180 96 h50" opacity=".25"/>';
    },
    camp: function () {
      return '<path d="M0 170 H320" opacity=".5"/><path d="M0 170 Q60 150 120 168 T320 160 V220 H0 Z" fill="currentColor" opacity=".08" stroke="none"/>' +
        '<path d="M190 150 L200 124 H270 L280 150 M200 124 V108 H270 V124 M196 108 L235 90 L274 108" fill="var(--surface)"/><path d="M0 150 H190" opacity=".2"/>' +
        '<path d="M20 170 L44 138 L68 170 Z M80 170 L104 142 L128 170 Z" fill="var(--surface)"/>' +
        '<path d="M44 138 V126 M104 142 V130" stroke="var(--accent)"/><path d="M44 126 l12 4 l-12 4 M104 130 l12 4 l-12 4" fill="var(--accent)" stroke="none"/>';
    },
    room: function () { return S.hall(); }
  };

  function flame(x, y, s) {
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')"><path d="M0 0 Q-18 -22 -4 -44 Q-2 -30 8 -30 Q12 -44 2 -62 Q34 -34 20 0 Z" fill="var(--accent)" stroke="none"/><path d="M4 0 Q-6 -12 2 -26 Q10 -14 12 0 Z" fill="#e5b84a" stroke="none"/></g>';
  }

  /* ---------- Эффекты ---------- */
  function fx(f) {
    var x = f.x || 0, y = f.y || 0, s = f.s || 1;
    switch (f.t) {
      case 'speed':
        var l = '';
        for (var i = 0; i < 9; i++) l += '<path d="M' + (f.dir === 'v' ? (20 + i * 34) + ' 0 v' + (60 + (i % 3) * 20) : '0 ' + (14 + i * 22) + ' h' + (50 + (i % 3) * 30)) + '" opacity=".35" stroke-width="1.6"/>';
        return l;
      case 'focus':
        var r = '';
        for (var k = 0; k < 28; k++) {
          var a = k / 28 * Math.PI * 2, x1 = 160 + Math.cos(a) * 190, y1 = 110 + Math.sin(a) * 160, x2 = 160 + Math.cos(a) * 250, y2 = 110 + Math.sin(a) * 220;
          r += '<path d="M' + x1.toFixed(0) + ' ' + y1.toFixed(0) + ' L' + x2.toFixed(0) + ' ' + y2.toFixed(0) + '" opacity=".4" stroke-width="3"/>';
        }
        return r;
      case 'sweat': return '<path d="M' + x + ' ' + y + ' q-5 9 0 12 q5 -3 0 -12 z" fill="#8ec5e8" transform="scale(' + s + ')" style="transform-origin:' + x + 'px ' + y + 'px"/>';
      case 'vein':  return '<path d="M' + x + ' ' + y + ' l8 3 M' + x + ' ' + y + ' l3 8 M' + (x + 12) + ' ' + y + ' l-8 3 M' + (x + 12) + ' ' + y + ' l-3 8" stroke="var(--accent)" stroke-width="2.4" fill="none"/>';
      case 'spark': return '<path d="M' + x + ' ' + (y - 9 * s) + ' L' + (x + 2.6 * s) + ' ' + (y - 2.6 * s) + ' L' + (x + 9 * s) + ' ' + y + ' L' + (x + 2.6 * s) + ' ' + (y + 2.6 * s) + ' L' + x + ' ' + (y + 9 * s) + ' L' + (x - 2.6 * s) + ' ' + (y + 2.6 * s) + ' L' + (x - 9 * s) + ' ' + y + ' L' + (x - 2.6 * s) + ' ' + (y - 2.6 * s) + ' Z" fill="#e5b84a" stroke="none"/>';
      case 'flame': return flame(x, y, s);
      case 'bang':  return '<text x="' + x + '" y="' + y + '" font-size="' + (30 * s) + '" font-weight="700" fill="var(--accent)" stroke="none" font-family="Literata, serif">' + (f.txt || '!') + '</text>';
      case 'rain':
        var rr = '';
        for (var j = 0; j < 22; j++) rr += '<path d="M' + (j * 15 + (j % 3) * 4) + ' ' + (10 + (j * 37) % 120) + ' l-5 14" opacity=".35" stroke-width="1.4"/>';
        return rr;
      case 'dust': return '<circle cx="' + x + '" cy="' + y + '" r="6" opacity=".25"/><circle cx="' + (x + 12) + '" cy="' + (y - 4) + '" r="9" opacity=".2"/><circle cx="' + (x + 28) + '" cy="' + y + '" r="5" opacity=".25"/>';
      case 'swords': return '<path d="M' + x + ' ' + y + ' l40 -40 M' + (x + 40) + ' ' + y + ' l-40 -40" stroke-width="3.4"/><path d="M' + (x + 20) + ' ' + (y - 20) + ' m-7 0 l14 0" stroke="var(--accent)"/>';
    }
    return '';
  }

  var BUBBLE_TAIL = { bl: 1, br: 1, tl: 1, tr: 1 };

  function speakerOf(panel, b) {
    var cs = panel.c || []; if (!cs.length || b.k === 'narr') return -1;
    var w = Math.min(b.w || 62, 10 + String(b.t).length * 1.7), tail = b.tail || 'bl';
    var ax = (tail === 'br' || tail === 'tr') ? b.x + w - 8 : b.x + 8, best = 0, bd = 1e9;
    cs.forEach(function (c, i) { var cx = (c.s >= 1.5 ? 50 : c.x / 3.2), d = Math.abs(cx - ax); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function render(panel, noBubbles, style) {
    var sc = S[panel.s] || S.village;
    var svg = '<svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="' + (panel.cap ? panel.cap.replace(/"/g, '&quot;') : 'Иллюстрация') + '">' +
      '<defs><pattern id="ht" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="currentColor" opacity=".12" stroke="none"/></pattern></defs>' +
      '<rect width="320" height="220" fill="var(--surface-2)" stroke="none"/><rect width="320" height="220" fill="url(#ht)" stroke="none"/>' +
      sc();
    (panel.fx || []).filter(function (f) { return f.t === 'speed' || f.t === 'focus' || f.t === 'rain'; }).forEach(function (f) { svg += fx(f); });
    (panel.c || []).forEach(function (c) { svg += person(c); });
    (panel.fx || []).filter(function (f) { return !(f.t === 'speed' || f.t === 'focus' || f.t === 'rain'); }).forEach(function (f) { svg += fx(f); });
    svg += '</svg>';
    if ((style || (window.Comic && window.Comic.style)) === 'sil' && window.ComicSil) svg = window.ComicSil.svg(panel);
    var html = '<div class="stage">' + svg;
    if (!noBubbles) (panel.b || []).forEach(function (b) {
      var tail = BUBBLE_TAIL[b.tail] ? b.tail : 'bl';
      html += '<div class="bubble ' + (b.k || 'say') + '" data-sp="' + speakerOf(panel, b) + '" data-tail="' + tail + '" style="left:' + b.x + '%;top:' + b.y + '%;' + (b.w ? 'max-width:' + b.w + '%' : '') + '">' + b.t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</div>';
    });
    return html + '</div>';
  }

  window.Comic = { render: render, fx: fx, style: null };
})();
