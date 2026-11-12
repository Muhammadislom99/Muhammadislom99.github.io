/* ==========================================================================
   Fathullokhuja & Shukronakhon · 08.12.2026
   «Шёлк и свет»: живой шёлковый фон (WebGL), занавес, вертикальная история,
   одна прокрутка — одна страница, тексты и цветок оживают анимацией сами.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.WEDDING_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var easeIO = function (t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* ======================================================================
     1. Palettes — the silk changes through the wedding day
        [shadow, mid, light], spark amount, warm glow amount
     ====================================================================== */
  function hex(h) {
    return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  }
  function pal(a, b, c, spark, glow) { return { c: [hex(a), hex(b), hex(c)], spark: spark, glow: glow || 0 }; }
  var P = {
    curtain: pal('#04110c', '#0e2a21', '#2d5c49', .7),
    morning: pal('#dcc4a0', '#f5e9d6', '#fffcf5', .5),
    noon:    pal('#d9c198', '#f1e0c2', '#fff8e8', .55),
    gold:    pal('#c59d5a', '#e9cd97', '#fff3d3', .6),
    sunset:  pal('#4e1c2c', '#a85a4c', '#eeb283', .55),
    ember:   pal('#0d0706', '#2b1512', '#643a28', .7),
    night:   pal('#030e0b', '#0d2a22', '#2c5f4c', .9),
    lights:  pal('#040b08', '#11241c', '#35563f', 1, 1),
    wine:    pal('#190409', '#480e1b', '#8a3040', 1, .25)
  };
  function mixPal(a, b, t, out) {
    for (var i = 0; i < 3; i++) for (var k = 0; k < 3; k++) out.c[i][k] = a.c[i][k] + (b.c[i][k] - a.c[i][k]) * t;
    out.spark = a.spark + (b.spark - a.spark) * t;
    out.glow = a.glow + (b.glow - a.glow) * t;
    return out;
  }
  var cur = pal('#000000', '#000000', '#000000', 0, 0);

  /* ======================================================================
     2. WebGL silk
     ====================================================================== */
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;',
    'uniform float uTime,uScroll,uOpen,uSpark,uGlow;',
    'uniform vec3 uC0,uC1,uC2,uD0,uD1,uD2;',
    'float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}',
    'float field(vec2 p,float t){',
    '  for(int i=1;i<4;i++){float f=float(i);',
    '    p.x+=.50/f*sin(f*1.6*p.y+t*.9+f*1.7);',
    '    p.y+=.42/f*cos(f*1.4*p.x+t*.7+f*2.3);}',
    '  return sin(p.x*1.7+p.y*.9)*.5+.5;}',
    'vec3 silk(vec2 p,float t,vec3 c0,vec3 c1,vec3 c2){',
    '  float e=.02;',
    '  float h=field(p,t),hx=field(p+vec2(e,0.),t),hy=field(p+vec2(0.,e),t);',
    '  vec3 n=normalize(vec3(h-hx,h-hy,e*1.7));',
    '  vec3 l=normalize(vec3(-.5,.55,.68));',
    '  float d=dot(n,l)*.5+.5;',
    '  float s=pow(max(dot(n,normalize(l+vec3(0.,0.,1.))),0.),26.);',
    '  vec3 c=mix(c0,c1,smoothstep(.22,.74,d));',
    '  c=mix(c,c2,clamp(smoothstep(.6,1.,d)*.8+s*.75,0.,1.));',
    '  return c;}',
    'void main(){',
    '  float mn=min(uRes.x,uRes.y);',
    '  vec2 uv=(gl_FragCoord.xy-.5*uRes)/mn;',
    '  float halfW=.5*uRes.x/mn;',
    '  vec2 p=uv*1.75;p.y+=uScroll*.6;p.x+=uScroll*.12;',
    '  vec3 col=silk(p,uTime,uC0,uC1,uC2);',
    '  vec2 g=uv-vec2(0.,.04);',
    '  col+=vec3(1.,.7,.36)*uGlow*.5*exp(-dot(g,g)*2.6)*(.86+.14*sin(uTime*2.9)*sin(uTime*1.7));',
    '  if(uOpen<1.){',
    '    vec2 q=uv*vec2(2.3,.75)+vec2(0.,3.);',
    '    vec3 cu=silk(q,uTime*.7,uD0,uD1,uD2);',
    '    float edge=abs(uv.x)/halfW;',
    '    float w=.07*sin(uv.y*3.1+uTime*.8)+.04*sin(uv.y*7.7-uTime*.5);',
    '    float dd=uOpen*1.45-.14-edge+w*min(1.,uOpen*5.);',
    '    float m=smoothstep(-.015,.02,dd);',
    '    cu+=vec3(1.,.85,.55)*exp(-max(-dd,0.)*5.)*.4*smoothstep(0.,.15,uOpen);',
    '    float seam=exp(-abs(uv.x)*70.)*(1.-smoothstep(0.,.12,uOpen))*(.45+.25*sin(uTime*1.3+uv.y*4.));',
    '    cu+=vec3(.95,.78,.45)*seam;',
    '    col=mix(cu,col,m);',
    '    col+=vec3(1.,.9,.66)*exp(-abs(dd)*24.)*smoothstep(0.,.08,uOpen)*(1.-smoothstep(.85,1.,uOpen));',
    '  }',
    '  vec2 gp=gl_FragCoord.xy/mn*30.;gp.y+=uScroll*16.-uTime*.22;gp.x+=sin(uTime*.1)*.6;',
    '  vec2 id=floor(gp);vec2 f=fract(gp)-.5;',
    '  float r=hash(id);',
    '  vec2 o=(vec2(hash(id+3.1),hash(id+9.7))-.5)*.7;',
    '  float tw=pow(.5+.5*sin(uTime*(.7+r*2.6)+r*60.),5.);',
    '  float sp=smoothstep(.07+.09*r,0.,length(f-o))*step(.7,r)*tw;',
    '  float lum=dot(col,vec3(.3,.59,.11));',
    '  vec3 sc=mix(vec3(1.,.92,.66),vec3(.66,.47,.16),smoothstep(.35,.8,lum));',
    '  col=mix(col,sc,clamp(sp*uSpark,0.,1.));',
    '  vec2 vv=gl_FragCoord.xy/uRes-.5;',
    '  col*=1.-.3*dot(vv,vv);',
    '  col+=(hash(gl_FragCoord.xy+fract(uTime)*91.)-.5)*.02;',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');
  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  var canvas = $('#bg'), fallback = $('#bgFallback');
  var gl = null, U = {}, scale = 1, lastFallback = '';

  function initGL() {
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return false;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { gl = null; return false; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uScroll', 'uOpen', 'uSpark', 'uGlow', 'uC0', 'uC1', 'uC2', 'uD0', 'uD1', 'uD2'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
    gl.uniform3fv(U.uD0, P.curtain.c[0]);
    gl.uniform3fv(U.uD1, P.curtain.c[1]);
    gl.uniform3fv(U.uD2, P.curtain.c[2]);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); gl = null; canvas.style.display = 'none'; });
    return true;
  }

  function sizeCanvas() {
    if (!gl) return;
    var w = window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    var s = Math.min(1, Math.sqrt(620000 / (w * h))) * scale;
    var cw = Math.max(2, Math.round(w * s)), ch = Math.max(2, Math.round(h * s));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch;
      gl.viewport(0, 0, cw, ch);
    }
  }

  function css(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }

  function draw(time, scroll, open) {
    if (gl) {
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uScroll, scroll);
      gl.uniform1f(U.uOpen, open);
      gl.uniform1f(U.uSpark, cur.spark);
      gl.uniform1f(U.uGlow, cur.glow);
      gl.uniform3fv(U.uC0, cur.c[0]);
      gl.uniform3fv(U.uC1, cur.c[1]);
      gl.uniform3fv(U.uC2, cur.c[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      var a = open < 1 ? mixPal(P.curtain, cur, smooth(open), tmpPal) : cur;
      var bg = 'radial-gradient(120% 90% at 30% 18%,' + css(a.c[2]) + ' 0%,' + css(a.c[1]) + ' 48%,' + css(a.c[0]) + ' 100%)';
      if (bg !== lastFallback) { fallback.style.background = bg; lastFallback = bg; }
    }
  }
  var tmpPal = pal('#000000', '#000000', '#000000', 0, 0);

  /* ======================================================================
     3. Layout metrics, palette track, sections
     ====================================================================== */
  var secs = $$('.sec').map(function (el) {
    return { el: el, id: el.id, top: 0, h: 0, on: false };
  });
  var byId = {};
  secs.forEach(function (s) { byId[s.id] = s; });
  var vh = window.innerHeight, maxScroll = 1, track = [];
  var story = $('#story');
  var stops = [], stopSec = [], page = 0;   // page stops (virtual scroll positions) and their sections

  function measure() {
    vh = window.innerHeight;
    secs.forEach(function (s) {
      s.top = s.el.offsetTop;
      s.h = s.el.offsetHeight;
    });
    maxScroll = Math.max(1, story.offsetHeight - vh);

    // one stop per page; a page taller than the screen gets extra stops inside it
    var keep = stopSec.length ? stopSec[page] : 0;
    stops = []; stopSec = [];
    secs.forEach(function (s, i) {
      var end = Math.min(maxScroll, s.top + Math.max(0, s.h - vh)), y = Math.min(maxScroll, s.top);
      stops.push(y); stopSec.push(i);
      while (end - y > vh * .2) { y = Math.min(end, y + vh * .8); stops.push(y); stopSec.push(i); }
    });
    page = Math.max(0, stopSec.indexOf(keep));
    tween = null; drag = 0;
    sy = stops[page];
    var center = function (s) { return s.top + (s.h - vh) / 2; };
    var T = center(byId.time);
    track = [
      { y: 0, p: P.morning },
      { y: center(byId.words), p: P.noon },
      { y: center(byId.date), p: P.gold },
      { y: T - vh * .6, p: P.sunset },
      { y: T - vh * .25, p: P.ember },
      { y: T, p: P.night },
      { y: center(byId.place), p: P.lights },
      { y: Math.min(maxScroll, center(byId.final)), p: P.wine }
    ];
    for (var i = 1; i < track.length; i++) if (track[i].y <= track[i - 1].y) track[i].y = track[i - 1].y + 1;
    buildVine();
    sizeCanvas();
  }

  /* ---- S-line: swings from side to side, one swing per screen ---- */
  var vine = $('#vine'), vinePath = $('#vinePath'), vineEcho = $('#vineEcho');
  var vineLen = 0, vineTop = 0, vineBot = 0;

  function buildVine() {
    var W = story.clientWidth, H = story.offsetHeight;
    vine.setAttribute('width', W);
    vine.setAttribute('height', H);
    vine.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    $('#vineGrad').setAttribute('y2', H);

    var narrow = W < 700;
    var L = W * (narrow ? .08 : .14), Rr = W * (narrow ? .92 : .86);
    var pts = [];
    // start softly at the top centre of the first page
    pts.push([W * .5, byId.names.top + vh * .04]);
    secs.forEach(function (s, i) {
      pts.push([i % 2 ? Rr : L, s.top + s.h / 2]);   // beside the text while the page is in view
    });
    var last = secs[secs.length - 1];
    pts.push([W * .5, last.top + last.h - vh * .05]); // ends on the last page

    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    var e = 'M' + (pts[0][0] + 7).toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var k = 1; k < pts.length; k++) {
      var a = pts[k - 1], b = pts[k], dy = (b[1] - a[1]) * .55;
      d += 'C' + a[0].toFixed(1) + ' ' + (a[1] + dy).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + (b[1] - dy).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
      var o = k % 2 ? 9 : -9;
      e += 'C' + (a[0] - o).toFixed(1) + ' ' + (a[1] + dy).toFixed(1) + ' ' + (b[0] + o).toFixed(1) + ' ' + (b[1] - dy).toFixed(1) + ' ' + (b[0] + o * .4).toFixed(1) + ' ' + b[1].toFixed(1);
    }
    vinePath.setAttribute('d', d);
    vineEcho.setAttribute('d', e);
    vineLen = vinePath.getTotalLength();
    vineTop = pts[0][1];
    vineBot = pts[pts.length - 1][1];

    // the flower: sized to the screen, rides the line in the lower part of the page (clear of the text)
    bloomSize = clamp(Math.min(W, vh * .5) * .49, 128, 290);
    if (bloomOk) Bloom.resize(bloomSize);
    bloomY = -1;
  }

  // y grows monotonically along the path, so find the length for a given y by bisection
  function lenAtY(y) {
    var lo = 0, hi = vineLen;
    for (var n = 0; n < 22; n++) {
      var m = (lo + hi) / 2;
      if (vinePath.getPointAtLength(m).y < y) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }

  /* ---- the living flower: a bud while it travels, it blooms when the page arrives ---- */
  var Bloom = window.WeddingBloom, bloomEl = $('#bloom');
  var bloomOk = !!(Bloom && bloomEl && Bloom.init(bloomEl));
  var bloomSize = 200, bloomY = -1, bloomS = 0, bloomOpen = .3, bloomTick = 0;
  var BLOOM_AT = .88;   // where on the screen (by height) the flower rides

  function placeBloom(scrollY, time, dt, moving) {
    if (!vineLen || !bloomOk) return;
    var y = clamp(scrollY + vh * BLOOM_AT, vineTop, vineBot);
    if (Math.abs(y - bloomY) > .1) {
      bloomY = y;
      bloomS = lenAtY(y);
      var p = vinePath.getPointAtLength(bloomS);
      bloomEl.style.transform = 'translate3d(' + (p.x - bloomSize / 2).toFixed(1) + 'px,' + (p.y - bloomSize / 2).toFixed(1) + 'px,0)';
      // the line pauses under the flower so it does not show through the petals
      var gap = bloomSize * .2;
      vinePath.setAttribute('stroke-dasharray', Math.max(0, bloomS - gap).toFixed(1) + ' ' + (gap * 2).toFixed(1) + ' ' + (vineLen + 10).toFixed(1));
    }
    var target = !opened ? .3 : moving ? .36 : 1;
    var rate = target < bloomOpen ? 4.5 : 1.5;
    bloomOpen += (target - bloomOpen) * Math.min(1, dt / 1000 * rate);
    if (REDUCED) bloomOpen = opened ? 1 : .3;
    // petals sway slowly, so redrawing every other frame is plenty
    if ((bloomTick++ & 1) === 0) Bloom.draw(bloomOpen, REDUCED ? 0 : time, bloomS * .0016 + (REDUCED ? 0 : Math.sin(time * .4) * .05));
  }

  function paletteAt(y) {
    if (y <= track[0].y) return mixPal(track[0].p, track[0].p, 0, cur);
    for (var i = 1; i < track.length; i++) {
      if (y <= track[i].y) {
        return mixPal(track[i - 1].p, track[i].p, smooth((y - track[i - 1].y) / (track[i].y - track[i - 1].y)), cur);
      }
    }
    var last = track[track.length - 1].p;
    return mixPal(last, last, 0, cur);
  }

  /* ---- words that light up ---- */
  var wordEls = [];
  (function splitWords() {
    var host = $('#wordsP');
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            s.style.setProperty('--i', wordEls.length);
            wordEls.push(s);
            frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    }
    walk(host);
  })();

  /* ---- clock ---- */
  var hHand = $('#hHand'), mHand = $('#mHand'), sHand = $('#sHand'), bead = $('#sunBead'), clockTxt = $('#clockTxt');
  (function ticks() {
    var g = $('#ticks'), s = '';
    for (var i = 0; i < 60; i++) {
      var big = i % 5 === 0, q = i % 15 === 0;
      s += '<line x1="100" y1="' + (big ? 9 : 9.5) + '" x2="100" y2="' + (q ? 19 : big ? 15 : 11.5) + '" stroke-width="' + (q ? 1.3 : big ? .9 : .4) +
        '" opacity="' + (big ? 1 : .55) + '" transform="rotate(' + i * 6 + ' 100 100)"/>';
    }
    g.innerHTML = s;
  })();
  var lastClock = '', clockStart = -1;
  function setClock(p, time) {
    var hours = 12 + 6 * easeIO(p);
    var mins = Math.round(hours * 60);
    var hh = Math.floor(mins / 60), mm = mins % 60;
    hHand.setAttribute('transform', 'rotate(' + ((mins / 60) % 12 * 30).toFixed(2) + ' 100 100)');
    mHand.setAttribute('transform', 'rotate(' + (mm * 6) + ' 100 100)');
    bead.setAttribute('transform', 'rotate(' + ((mins / 60) % 12 * 30).toFixed(2) + ' 100 100)');
    sHand.setAttribute('transform', 'rotate(' + ((time * 6) % 360).toFixed(1) + ' 100 100)');
    var txt = (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm);
    if (txt !== lastClock) { clockTxt.textContent = txt; lastClock = txt; }
  }

  /* ---- rail ---- */
  var rail = $('#rail'), dots = [];
  secs.forEach(function (s) {
    var b = document.createElement('button');
    b.className = 'dot';
    b.type = 'button';
    b.setAttribute('aria-label', s.el.dataset.name || s.id);
    b.addEventListener('click', function () { go(stopSec.indexOf(secs.indexOf(s))); });
    rail.appendChild(b);
    dots.push(b);
  });
  var activeDot = -1;

  /* ======================================================================
     4. Frame loop
     ====================================================================== */
  var sy = 0, open = 0, opened = false, running = true;
  var tween = null, drag = 0, navLock = 0, lastStoryY = null;
  var t0 = performance.now(), tPrev = t0, slow = 0, frames = 0;

  // glide to a page stop: the whole move is one smooth animation
  function go(i) {
    if (!opened || performance.now() < navLock) return;
    i = clamp(i, 0, stops.length - 1);
    var to = stops[i];
    if (i === page && Math.abs(sy - to) < 1) return;
    var pages = Math.abs(to - sy) / vh;
    tween = { from: sy, to: to, t0: performance.now(), dur: REDUCED ? 1 : clamp(820 + pages * 430, 420, 2600) };
    page = i;
    drag = 0;
  }

  function frame(now) {
    if (!running) return;
    var dt = now - tPrev; tPrev = now;
    var time = (now - t0) / 1000;
    if (tween) {
      var tk = clamp((now - tween.t0) / tween.dur, 0, 1);
      sy = tween.from + (tween.to - tween.from) * easeIO(tk);
      if (tk >= 1) tween = null;
    } else {
      sy = stops[page] + drag;
    }
    var storyY = (-sy).toFixed(2);
    if (storyY !== lastStoryY) { lastStoryY = storyY; story.style.transform = 'translate3d(0,' + storyY + 'px,0)'; }

    paletteAt(sy);

    // sections: reveal state + active dot
    var mid = sy + vh / 2, act = 0;
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i];
      var vis = (Math.min(s.top + s.h, sy + vh) - Math.max(s.top, sy)) / Math.min(s.h, vh);
      var on = opened && (s.on ? vis > .25 : vis > .5);
      if (on !== s.on) {
        s.on = on;
        s.el.classList.toggle('in', on);
        if (s.id === 'time') clockStart = on ? now + 500 : -1;
      }
      if (mid >= s.top) act = i;
    }
    if (act !== activeDot) {
      activeDot = act;
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === act ? 'true' : 'false'); });
    }

    // clock: hands run by themselves from noon to 18:00
    if (clockStart < 0) setClock(0, time);
    else setClock(REDUCED ? 1 : clamp((now - clockStart) / 3800, 0, 1), time);

    placeBloom(sy, time, dt, !!tween || drag !== 0);

    draw(REDUCED ? time * .25 : time * .5, sy / vh, open);

    // adaptive resolution on slow devices
    if (gl && dt > 34) slow++;
    if (++frames >= 90) {
      if (slow > 45 && scale > .45) { scale *= .75; sizeCanvas(); }
      frames = 0; slow = 0;
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { tPrev = performance.now(); requestAnimationFrame(frame); }
  });
  var rT = 0;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(measure, 120); });
  window.addEventListener('load', measure);

  /* ======================================================================
     5. Opening the curtain, then one gesture = one page
     ====================================================================== */
  function openCurtain() {
    if (opened || !root.classList.contains('ready')) return;
    opened = true;
    navLock = performance.now() + (REDUCED ? 300 : 1500);
    wheelLock = navLock;
    root.classList.add('opening');
    var start = performance.now(), D = REDUCED ? 600 : 2600;
    (function step(now) {
      var k = clamp((now - start) / D, 0, 1);
      open = easeIO(k);
      if (k < 1) requestAnimationFrame(step);
    })(start);
    setTimeout(function () { root.classList.add('opened'); }, REDUCED ? 200 : 1100);
  }
  $('#gate').addEventListener('click', openCurtain);

  // wheel / trackpad: one page per gesture, however long its inertia lasts
  var wheelLock = 0, wheelAcc = 0, wheelT = 0;
  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return;                       // browser zoom
    e.preventDefault();
    var now = performance.now();
    var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (e.deltaMode === 1) d *= 32;
    if (!opened) { if (Math.abs(d) > 2) openCurtain(); return; }
    if (tween || now < wheelLock) { wheelLock = Math.max(wheelLock, now + 200); wheelAcc = 0; return; }
    if (now - wheelT > 280) wheelAcc = 0;
    wheelT = now;
    wheelAcc += d;
    if (Math.abs(wheelAcc) > 26) {
      go(page + (wheelAcc > 0 ? 1 : -1));
      wheelAcc = 0;
      wheelLock = now + 420;
    }
  }, { passive: false });

  // touch: the page follows the finger a little, then glides to the next one
  var touch = null;
  window.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touch = null; return; }
    var t = e.touches[0];
    touch = { x: t.clientX, y: t.clientY, dx: 0, dy: 0, t: performance.now() };
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!touch) return;
    if (e.touches.length > 1) { touch = null; endDrag(); return; }
    if (e.cancelable) e.preventDefault();
    var t = e.touches[0];
    touch.dx = t.clientX - touch.x;
    touch.dy = t.clientY - touch.y;
    // the gesture that opens the curtain only opens it — it never turns a page as well
    if (!opened) { if (Math.abs(touch.dy) > 12) { openCurtain(); touch.spent = true; } return; }
    if (touch.spent || tween || performance.now() < navLock || Math.abs(touch.dy) < 6) return;
    var dgy = -touch.dy * .3;
    if ((page === 0 && dgy < 0) || (page === stops.length - 1 && dgy > 0)) dgy *= .35;   // soft edge
    drag = clamp(dgy, -vh * .14, vh * .14);
  }, { passive: false });
  function endDrag() {
    if (drag !== 0 && !tween) {
      tween = { from: sy, to: stops[page], t0: performance.now(), dur: REDUCED ? 1 : 420 };
      drag = 0;
    }
  }
  function touchEnd() {
    if (!touch) return;
    var tc = touch;
    touch = null;
    if (!opened || tween || tc.spent) { drag = 0; return; }
    var ady = Math.abs(tc.dy), quick = performance.now() - tc.t < 320 && ady > 22;
    if ((ady > 54 || quick) && ady > Math.abs(tc.dx)) go(page + (tc.dy < 0 ? 1 : -1));
    endDrag();
  }
  window.addEventListener('touchend', touchEnd, { passive: true });
  window.addEventListener('touchcancel', function () { touch = null; endDrag(); }, { passive: true });

  // keyboard
  window.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key, tag = (e.target && e.target.tagName) || '', onControl = tag === 'BUTTON' || tag === 'A';
    if (!opened) {
      if (['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp', 'End'].indexOf(k) >= 0 || (k === ' ' && !onControl)) { e.preventDefault(); openCurtain(); }
      return;
    }
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey && !onControl)) { e.preventDefault(); go(page + 1); }
    else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey && !onControl)) { e.preventDefault(); go(page - 1); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(stops.length - 1); }
  });

  // keyboard focus must never scroll the document itself: turn the page instead
  function resetNativeScroll() {
    if (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }
  window.addEventListener('scroll', resetNativeScroll, { passive: true });
  document.addEventListener('focusin', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('.sec') : null;
    if (el && opened) {
      var idx = secs.indexOf(byId[el.id]);
      if (stopSec[page] !== idx) go(stopSec.indexOf(idx));
    }
    resetNativeScroll();
  });

  /* ======================================================================
     6. Countdown, map, share
     ====================================================================== */
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  var targetDate = new Date(CFG.dateISO || '2026-12-08T18:00:00').getTime();
  var LBL = {
    d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'],
    m: ['минута', 'минуты', 'минут'], s: ['секунда', 'секунды', 'секунд']
  };
  var cdEls = {}, cdLbl = {};
  Object.keys(LBL).forEach(function (k) { cdEls[k] = $('[data-cd="' + k + '"]'); cdLbl[k] = $('[data-cdl="' + k + '"]'); });
  function tickCountdown() {
    var diff = Math.max(0, targetDate - Date.now());
    var v = { d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, s: Math.floor(diff / 1e3) % 60 };
    for (var k in v) {
      var txt = v[k] < 10 ? '0' + v[k] : String(v[k]);
      if (cdEls[k].textContent !== txt) cdEls[k].textContent = txt;
      var l = plural(v[k], LBL[k][0], LBL[k][1], LBL[k][2]);
      if (cdLbl[k].textContent !== l) cdLbl[k].textContent = l;
    }
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  $('#mapBtn').href = CFG.mapUrl || 'https://yandex.ru/maps/-/CXCtQ-Mp';

  var toastEl = $('#toast'), toastT = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }
  $('#shareBtn').addEventListener('click', function () {
    var data = {
      title: 'Fathullokhuja & Shukronakhon · 08.12.2026',
      text: 'Приглашаем вас на нашу свадьбу: 8 декабря 2026 года, 18:00, ресторан «Зикриддин».',
      url: location.href
    };
    if (navigator.share) { navigator.share(data).catch(function () { /* dismissed */ }); return; }
    var copy = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(data.url) : Promise.reject();
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
  $('#topBtn').addEventListener('click', function () { go(0); });

  /* ======================================================================
     7. Boot
     ====================================================================== */
  if (!initGL()) canvas.style.display = 'none';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  measure();
  requestAnimationFrame(frame);

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
    measure();
    root.classList.add('ready');
  });
})();
