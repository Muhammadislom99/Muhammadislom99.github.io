/* ==========================================================================
   Background music
   ─ If WEDDING_CONFIG.musicSrc is set, that file is played (looped, with fades).
   ─ Otherwise a gentle romantic piano waltz with a soft pad and hall reverb
     is synthesised live with the Web Audio API (no file needed).
   Music never starts on its own — only after a user gesture.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.WEDDING_CONFIG || {};
  var AC = window.AudioContext || window.webkitAudioContext;

  /* ---------------- file player ---------------- */
  function FilePlayer(src) {
    this.audio = new Audio();
    this.audio.src = src;
    this.audio.loop = true;
    this.audio.preload = 'none';
    this.audio.volume = 0;
    this.raf = 0;
  }
  FilePlayer.prototype.fade = function (to, ms, done) {
    var a = this.audio, from = a.volume, t0 = performance.now(), self = this;
    cancelAnimationFrame(this.raf);
    (function step(now) {
      var k = Math.min(1, (now - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) self.raf = requestAnimationFrame(step);
      else if (done) done();
    })(t0);
  };
  FilePlayer.prototype.play = function () {
    var self = this;
    var p = this.audio.play();
    return Promise.resolve(p).then(function () { self.fade(0.85, 2200); });
  };
  FilePlayer.prototype.pause = function () {
    var a = this.audio;
    this.fade(0, 700, function () { a.pause(); });
    return Promise.resolve();
  };

  /* ---------------- synthesised waltz ---------------- */
  var BPM = 70;
  var BEAT = 60 / BPM;
  // chords: root midi note (2nd octave) + minor flag
  var C = {
    D: [38, 0], A: [45, 0], Bm: [47, 1], G: [43, 0], Em: [40, 1], Fsm: [42, 1]
  };
  var PROG = ['D', 'A', 'Bm', 'G', 'Em', 'A', 'G', 'A', 'D', 'A', 'Bm', 'G', 'Em', 'A', 'A', 'D'];
  // melody per bar: [midi, beats]
  var MEL = [
    [[78, 2], [76, .5], [74, .5]],
    [[76, 3]],
    [[74, 1], [78, 1], [83, 1]],
    [[81, 2], [79, 1]],
    [[79, 1.5], [78, .5], [76, 1]],
    [[73, 1], [76, 1], [81, 1]],
    [[83, 1.5], [81, .5], [79, 1]],
    [[79, 1], [76, 1], [73, 1]],
    [[81, 2], [78, 1]],
    [[76, 1], [81, 1], [85, 1]],
    [[86, 2], [83, 1]],
    [[81, 1.5], [79, .5], [78, 1]],
    [[79, 1], [76, 1], [79, 1]],
    [[78, 1.5], [76, .5], [76, 1]],
    [[76, 2], [73, 1]],
    [[74, 3]]
  ];

  function buildScore() {
    var ev = [];
    for (var b = 0; b < PROG.length; b++) {
      var t0 = b * 3;
      var ch = C[PROG[b]], r = ch[0], third = ch[1] ? 15 : 16;
      // left hand: flowing arpeggio in eighths
      var arp = [r, r + 7, r + 12, r + third, r + 19, r + 12];
      for (var i = 0; i < 6; i++) {
        ev.push({ t: t0 + i * 0.5, m: arp[i], v: i === 0 ? 0.2 : 0.11, d: 1.4, k: 'p' });
      }
      // pad chord
      ev.push({ t: t0, m: r + 12, third: third, v: 0.03, d: 3 * BEAT, k: 'pad' });
      // melody
      var mt = t0, mel = MEL[b];
      for (var j = 0; j < mel.length; j++) {
        ev.push({ t: mt, m: mel[j][0], v: 0.26, d: mel[j][1] * BEAT + 0.4, k: 'm' });
        mt += mel[j][1];
      }
    }
    ev.sort(function (a, b) { return a.t - b.t; });
    return { events: ev, length: PROG.length * 3 };
  }

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function SynthPlayer() {
    this.ctx = null;
    this.score = buildScore();
    this.timer = 0;
  }
  SynthPlayer.prototype.init = function () {
    var ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = 0;

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;

    this.bus = ctx.createGain();
    var tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 4200;
    tone.Q.value = 0.3;

    var verb = ctx.createConvolver();
    verb.buffer = this.impulse(4.2, 2.8);
    var wet = ctx.createGain(); wet.gain.value = 0.55;
    var dry = ctx.createGain(); dry.gain.value = 0.75;

    this.bus.connect(tone);
    tone.connect(dry); dry.connect(comp);
    tone.connect(verb); verb.connect(wet); wet.connect(comp);
    comp.connect(this.master);
    this.master.connect(ctx.destination);

    this.pos = 0;            // position in beats inside the loop
    this.idx = 0;            // next event index
    this.next = ctx.currentTime + 0.15; // audio time of loop start
  };
  SynthPlayer.prototype.impulse = function (sec, decay) {
    var ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * sec);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        var k = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, decay) * (k < 0.003 ? k / 0.003 : 1);
      }
    }
    return buf;
  };
  SynthPlayer.prototype.piano = function (t, m, v, d) {
    var ctx = this.ctx, f = mtof(m);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(v * 0.38, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.8);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(9000, f * 9), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.2), t + d + 1);
    g.connect(lp); lp.connect(this.bus);
    var parts = [[1, 'sine', 1], [2, 'triangle', 0.16], [3, 'sine', 0.06], [1.003, 'sine', 0.35]];
    for (var i = 0; i < parts.length; i++) {
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.type = parts[i][1];
      o.frequency.value = f * parts[i][0];
      og.gain.value = parts[i][2];
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + d + 2);
    }
  };
  SynthPlayer.prototype.pad = function (t, root, third, v, d) {
    var ctx = this.ctx;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 1.1);
    g.gain.setValueAtTime(v, t + d - 0.2);
    g.gain.linearRampToValueAtTime(0, t + d + 1.2);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    g.connect(lp); lp.connect(this.bus);
    var notes = [root, root + third - 12 + 12, root + 7];
    for (var i = 0; i < notes.length; i++) {
      for (var k = -1; k <= 1; k += 2) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(notes[i]);
        o.detune.value = k * 7;
        var og = ctx.createGain(); og.gain.value = 0.18;
        o.connect(og); og.connect(g);
        o.start(t); o.stop(t + d + 1.4);
      }
    }
  };
  SynthPlayer.prototype.tick = function () {
    var ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    var ahead = ctx.currentTime + 0.5;
    var ev = this.score.events, L = this.score.length;
    while (true) {
      if (this.idx >= ev.length) { this.idx = 0; this.next += L * BEAT; }
      var e = ev[this.idx], at = this.next + e.t * BEAT;
      if (at > ahead) break;
      if (at >= ctx.currentTime - 0.05) {
        if (e.k === 'pad') this.pad(at, e.m, e.third, e.v, e.d);
        else this.piano(at, e.m, e.v, e.d);
      }
      this.idx++;
    }
  };
  SynthPlayer.prototype.play = function () {
    var self = this;
    if (!AC) return Promise.reject(new Error('Web Audio API unsupported'));
    if (!this.ctx) this.init();
    var ctx = this.ctx;
    return Promise.resolve(ctx.resume()).then(function () {
      var now = ctx.currentTime;
      if (self.next < now) {           // re-align after a long pause
        self.idx = 0;
        self.next = now + 0.15;
      }
      self.master.gain.cancelScheduledValues(now);
      self.master.gain.setValueAtTime(self.master.gain.value, now);
      self.master.gain.linearRampToValueAtTime(0.9, now + 2.4);
      clearInterval(self.timer);
      self.timer = setInterval(function () { self.tick(); }, 120);
      self.tick();
    });
  };
  SynthPlayer.prototype.pause = function () {
    var ctx = this.ctx, self = this;
    if (!ctx) return Promise.resolve();
    var now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.8);
    return new Promise(function (res) {
      setTimeout(function () {
        clearInterval(self.timer);
        // drop already-scheduled notes: restart the loop cleanly next time
        self.idx = 0;
        self.next = 0;
        Promise.resolve(ctx.suspend()).then(res, res);
      }, 850);
    });
  };

  /* ---------------- public API ---------------- */
  var player = CFG.musicSrc ? new FilePlayer(CFG.musicSrc) : new SynthPlayer();
  var playing = false, busy = Promise.resolve();
  var listeners = [];

  function emit() { listeners.forEach(function (fn) { fn(playing); }); }

  window.WeddingMusic = {
    get playing() { return playing; },
    onChange: function (fn) { listeners.push(fn); },
    play: function () {
      if (playing) return busy;
      playing = true; emit();
      busy = busy.then(function () { return player.play(); }).catch(function () {
        playing = false; emit();
      });
      return busy;
    },
    pause: function () {
      if (!playing) return busy;
      playing = false; emit();
      busy = busy.then(function () { return player.pause(); }).catch(function () {});
      return busy;
    },
    toggle: function () { return playing ? this.pause() : this.play(); }
  };
})();
