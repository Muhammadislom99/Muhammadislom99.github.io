/* Плеер озвучки: читает текст прямо со страницы, по предложениям.
   Текущее предложение подсвечивается (CSS Custom Highlight API, без изменения DOM),
   страница прокручивается следом. Мини-плеер внизу: назад / пауза / вперёд / стоп. */
(function () {
  var synth = window.speechSynthesis;
  var supported = !!(synth && window.SpeechSynthesisUtterance);
  var canMark = !!(window.CSS && CSS.highlights && window.Highlight);

  // Что читаем внутри выбранной области
  var READ = 'h1, h2, h3, .lead, .tldr li, .prose p, .prose li, p.prose, .s-name, .s-rule, .sx-label, .sx p, .steps li, ' +
    '.box h3, .box p, .box li, .t-title, .person .num, .person > p, .more-body p, figcaption, .reader-text p';
  // Что пропускаем (если не является самой областью)
  var SKIP = '.more, .s-actions, .pager, .say-row, .facts-row, figure.diagram, .comic-note, textarea, .q-meta, .hl-bar';

  var items = [], idx = 0, token = 0, playing = false, paused = false, btn = null, scope = null, title = '';
  var lastUser = 0, bar = null, curBlock = null;

  /* ---------- Сбор текста ---------- */
  function skipped(el, sc) {
    for (var a = el.parentElement; a && a !== sc; a = a.parentElement) if (a.matches(SKIP)) return true;
    return false;
  }
  function onlyLink(el) {
    var a = el.firstElementChild;
    return el.childElementCount === 1 && a.tagName === 'A' && a.textContent.trim() === el.textContent.trim();
  }
  function sentences(text) {
    var out = [], re = /[^.!?…]+(?:[.!?…]+[»"”)]*|$)/g, m;
    while ((m = re.exec(text))) {
      if (!m[0]) { re.lastIndex++; continue; }
      var s = m.index, e = m.index + m[0].length;
      while (s < e && /\s/.test(text[s])) s++;
      while (e > s && /\s/.test(text[e - 1])) e--;
      if (e - s < 1) continue;
      // слишком длинное предложение режем по «;» или « — »
      if (e - s > 260) {
        var part = text.slice(s, e), cut = part.search(/;\s|\s—\s/);
        if (cut > 60 && cut < part.length - 40) { out.push([s, s + cut + 1]); out.push([s + cut + 2, e]); continue; }
      }
      out.push([s, e]);
    }
    return out;
  }
  function collect(sc) {
    var list = [].slice.call(sc.querySelectorAll(READ)).filter(function (el) {
      return !skipped(el, sc) && el.textContent.trim() && !onlyLink(el);
    });
    list = list.filter(function (el) { return !list.some(function (o) { return o !== el && o.contains(el); }); });
    var res = [];
    list.forEach(function (el) {
      var t = el.textContent;
      sentences(t).forEach(function (r) {
        var say = t.slice(r[0], r[1]).replace(/[→←↗›]/g, ' ').trim();
        if (/[0-9A-Za-zА-Яа-яЁё]/.test(say)) res.push({ el: el, s: r[0], e: r[1], text: say });
      });
    });
    return res;
  }

  /* ---------- Подсветка и прокрутка ---------- */
  function rangeFor(el, s, e) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, pos = 0, r = document.createRange(), started = false;
    while ((n = w.nextNode())) {
      var len = n.data.length;
      if (!started && s <= pos + len) { r.setStart(n, s - pos); started = true; }
      if (started && e <= pos + len) { r.setEnd(n, e - pos); return r; }
      pos += len;
    }
    return started ? r : null;
  }
  function clearMark() {
    if (canMark) CSS.highlights.delete('tts');
    if (curBlock) curBlock.classList.remove('tts-block');
    curBlock = null;
  }
  function reveal(el) {
    for (var d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    var ti = el.closest('.t-item'); if (ti && !ti.classList.contains('open')) ti.classList.add('open');
  }
  function mark(it, force) {
    clearMark();
    reveal(it.el);
    curBlock = it.el; curBlock.classList.add('tts-block');
    var r = rangeFor(it.el, it.s, it.e);
    if (r && canMark) CSS.highlights.set('tts', new Highlight(r));
    if (!force && Date.now() - lastUser < 5000) { bar && bar.classList.add('detached'); return; }
    if (bar) bar.classList.remove('detached');
    var rect = (r && r.getBoundingClientRect()) || it.el.getBoundingClientRect();
    if (!rect.height) rect = it.el.getBoundingClientRect();
    if (force || rect.top < 90 || rect.bottom > innerHeight - 130) {
      scrollTo({ top: scrollY + rect.top - innerHeight * 0.33, behavior: force ? 'auto' : 'smooth' });
    }
  }
  ['wheel', 'touchmove'].forEach(function (ev) { addEventListener(ev, function () { if (playing) lastUser = Date.now(); }, { passive: true }); });
  addEventListener('keydown', function (e) { if (playing && /^(Arrow|Page|Home|End| )/.test(e.key) && !e.target.closest('input, textarea')) lastUser = Date.now(); });

  /* ---------- Воспроизведение ---------- */
  /* Android Chrome: cancel() прямо перед speak() «съедает» новую фразу, а onend
     иногда не приходит. Поэтому: между фразами без cancel(), при перемотке —
     cancel() и пауза 250 мс, плюс сторож, который двигает очередь, если onend потерялся. */
  var cur = null, note = '', lastCancel = 0, retryFor = -1;
  function cancelNow() { if (supported && (synth.speaking || synth.pending)) { synth.cancel(); lastCancel = Date.now(); } }
  function speakAt(i, interrupt) {
    var my = ++token;
    idx = i;
    if (idx >= items.length) { stop(); return; }
    var it = items[idx];
    if (!document.contains(it.el)) { stop(); return; }
    mark(it);
    note = '';
    updateBar();
    if (paused) return;
    var go = function () {
      if (my !== token || paused) return;
      var u = new SpeechSynthesisUtterance(it.text), v = window.TTS && TTS.voice && TTS.voice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'ru-RU';
      u.rate = (window.Prefs && Prefs.get().rate) || 1;
      var st = cur = { my: my, t0: Date.now(), started: false, done: false, go: go };
      u.onstart = function () { st.started = true; };
      u.onend = function () { finish(st); };
      u.onerror = function (e) {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        if (e.error === 'not-allowed') { blocked(); return; }
        finish(st);
      };
      synth.speak(u);
      if (synth.paused) synth.resume();
    };
    if (interrupt) cancelNow();
    var wait = 260 - (Date.now() - lastCancel);
    if (wait > 0) setTimeout(go, wait);
    else go(); // синхронно — внутри нажатия, иначе мобильный браузер может запретить звук
  }
  function finish(st) {
    if (st.done || st.my !== token || !playing || paused) return;
    st.done = true;
    speakAt(idx + 1, false);
  }
  function blocked() {
    paused = true; token++;
    cancelNow();
    note = 'Нажмите ▶, чтобы продолжить';
    updateBar();
  }
  setInterval(function () {
    if (!playing || paused || !cur || cur.done || cur.my !== token) return;
    var age = Date.now() - cur.t0;
    if (cur.started && age > 800 && !synth.speaking && !synth.pending) finish(cur);
    else if (!cur.started && !synth.speaking && age > 1500 && retryFor !== idx) { retryFor = idx; var g = cur.go; cancelNow(); setTimeout(g, 260); }
    else if (!cur.started && age > 6000 && !synth.speaking) blocked();
  }, 600);
  function setBtn(b, on) {
    if (!b) return;
    b.classList.toggle('playing', on);
    b.setAttribute('aria-label', on ? 'Остановить' : 'Слушать');
    var ic = b.querySelector('.ic'); if (ic) ic.textContent = on ? '■' : '▶';
  }
  function start(sc, b, from) {
    if (!supported) { alert('Этот браузер не умеет читать вслух. Попробуйте Chrome или Safari.'); return; }
    stop();
    items = collect(sc);
    if (!items.length) return;
    scope = sc; btn = b; playing = true; paused = false; lastUser = 0;
    var h = sc.querySelector('h1, .s-rule, h3, .t-title, h2');
    title = h ? h.textContent.trim() : 'Озвучка';
    setBtn(btn, true); showBar();
    speakAt(from || 0, true);
  }
  function stop() {
    token++;
    cancelNow();
    playing = false; paused = false;
    setBtn(btn, false); btn = null; scope = null; items = [];
    clearMark(); hideBar();
  }
  function toggle(sc, b) {
    if (playing && b && b === btn) { stop(); return; }
    start(sc, b);
  }
  function pause() {
    if (!playing) return;
    paused = !paused;
    if (paused) { token++; cancelNow(); updateBar(); }
    else speakAt(idx, true);
  }
  addEventListener('hashchange', stop);
  addEventListener('beforeunload', function () { if (supported) synth.cancel(); });

  /* ---------- Мини-плеер ---------- */
  function showBar() {
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'player'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Озвучка');
      bar.innerHTML = '<div class="pl-progress"><div></div></div>' +
        '<button class="pl-btn" data-pl="prev" aria-label="Предыдущее предложение">⏮</button>' +
        '<button class="pl-btn main" data-pl="pause" aria-label="Пауза">❚❚</button>' +
        '<button class="pl-btn" data-pl="next" aria-label="Следующее предложение">⏭</button>' +
        '<button class="pl-info" data-pl="follow"><b></b><span></span></button>' +
        '<button class="pl-btn" data-pl="stop" aria-label="Остановить">✕</button>';
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pl]'); if (!b) return;
        var a = b.dataset.pl;
        if (a === 'stop') stop();
        else if (a === 'pause') pause();
        else if (a === 'prev') { lastUser = 0; speakAt(Math.max(0, idx - 1), true); }
        else if (a === 'next') { lastUser = 0; speakAt(Math.min(items.length - 1, idx + 1), true); }
        else if (a === 'follow') { lastUser = 0; if (items[idx]) mark(items[idx], true); }
      });
      document.body.appendChild(bar);
    }
    bar.hidden = false; document.body.classList.add('has-player');
  }
  function hideBar() { if (bar) bar.hidden = true; document.body.classList.remove('has-player'); }
  function updateBar() {
    if (!bar) return;
    bar.querySelector('.pl-info b').textContent = title;
    bar.querySelector('.pl-info span').textContent = note || (paused ? 'Пауза · ' : '') + (idx + 1) + ' из ' + items.length + (bar.classList.contains('detached') ? ' · ↓ к тексту' : '');
    bar.querySelector('.pl-progress div').style.width = (items.length ? (idx + 1) / items.length * 100 : 0) + '%';
    var p = bar.querySelector('[data-pl="pause"]');
    p.textContent = paused ? '▶' : '❚❚'; p.setAttribute('aria-label', paused ? 'Продолжить' : 'Пауза');
  }

  window.Player = { supported: supported, toggle: toggle, stop: stop, isPlaying: function () { return playing; } };
})();
