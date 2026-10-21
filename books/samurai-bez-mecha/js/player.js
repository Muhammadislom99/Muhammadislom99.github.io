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
  var lastUser = 0, bar = null, curBlock = null, scopeKey = '';

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

  /* ---------- Запоминание места ---------- */
  function posMap() { try { return Store.get('listen', {}) || {}; } catch (e) { return {}; } }
  function getPos(key) { var p = key && posMap()[key]; return p && p.idx > 0 && p.total > 1 ? p : null; }
  function savePos() {
    if (!scopeKey || !items[idx]) return;
    var m = posMap();
    m[scopeKey] = { idx: idx, total: items.length, snip: items[idx].text.slice(0, 50), title: title, hash: location.hash, t: Date.now() };
    try { Store.set('listen', m); Store.set('listen-last', scopeKey); } catch (e) {}
  }
  function clearPos(key) {
    if (!key) return;
    var m = posMap(); delete m[key];
    try { Store.set('listen', m); if (Store.get('listen-last', '') === key) Store.set('listen-last', ''); } catch (e) {}
  }
  function last() {
    var key = ''; try { key = Store.get('listen-last', ''); } catch (e) {}
    var p = getPos(key);
    return p && p.hash ? Object.assign({ key: key }, p) : null;
  }
  /* кнопка «Продолжить» рядом с «Слушать» */
  function decorate(root) {
    if (!supported || !root) return;
    root.querySelectorAll('.say.resume').forEach(function (r) { r.remove(); });
    root.querySelectorAll('.say.wide[data-say]').forEach(function (b) {
      var pos = getPos(b.dataset.say);
      if (!pos || (playing && btn === b)) return;
      var r = document.createElement('button');
      r.type = 'button'; r.className = 'say wide resume'; r.dataset.say = b.dataset.say; r.dataset.resume = '1';
      r.title = 'С места остановки: «' + pos.snip + '…»';
      r.setAttribute('aria-label', 'Продолжить с места остановки, предложение ' + (pos.idx + 1) + ' из ' + pos.total);
      r.innerHTML = '<span class="ic" aria-hidden="true">⏵</span><span>Продолжить · ' + (pos.idx + 1) + ' из ' + pos.total + '</span>';
      b.insertAdjacentElement('afterend', r);
    });
  }
  function refresh() { decorate(document.getElementById('app')); }
  /* индекс предложения по месту в тексте */
  function indexAt(list, node, offset) {
    var host = null;
    list.some(function (it) { if (it.el.contains(node)) { host = it.el; return true; } });
    if (!host) return 0;
    var r = document.createRange(), off = 0;
    try { r.selectNodeContents(host); r.setEnd(node, offset); off = r.toString().length; } catch (e) {}
    var i;
    for (i = 0; i < list.length; i++) if (list[i].el === host && off >= list[i].s && off <= list[i].e) return i;
    for (i = 0; i < list.length; i++) if (list[i].el === host && list[i].s >= off) return i;
    for (i = list.length - 1; i >= 0; i--) if (list[i].el === host) return i;
    return 0;
  }

  /* ---------- Воспроизведение ---------- */
  /* Android Chrome: cancel() прямо перед speak() «съедает» новую фразу, а onend
     иногда не приходит. Поэтому: между фразами без cancel(), при перемотке —
     cancel() и пауза 250 мс, плюс сторож, который двигает очередь, если onend потерялся. */
  var cur = null, note = '', lastCancel = 0, retryFor = -1;
  function cancelNow() { if (supported && (synth.speaking || synth.pending)) { synth.cancel(); lastCancel = Date.now(); } }
  function speakAt(i, interrupt) {
    var my = ++token;
    idx = i;
    if (idx >= items.length) { clearPos(scopeKey); stop(); return; }
    var it = items[idx];
    if (!document.contains(it.el)) { stop(); return; }
    mark(it);
    savePos();
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
      u.onstart = function () { st.started = true; if (note === 'Загружаю голос…') { note = ''; updateBar(); } if (window.TTS && TTS.ok) TTS.ok(); };
      u.onend = function () { finish(st); };
      u.onerror = function (e) {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        if (e.error === 'not-allowed') { blocked(); return; }
        if (!st.started && /network|synthesis|unavailable|language|voice/.test(e.error || '')) { voiceFailed(v); return; }
        finish(st);
      };
      st.voice = v;
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
  function voiceFailed(v) {
    paused = true; token++;
    cancelNow();
    note = 'Голос не загрузился';
    updateBar();
    if (window.TTS && TTS.fail && v) TTS.fail(v, function () { paused = false; speakAt(idx, true); });
    else blocked();
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
    else if (!cur.started && age > 700 && !note) { note = 'Загружаю голос…'; updateBar(); }
    if (!cur.started && !synth.speaking && age > 1500 && retryFor !== idx) { retryFor = idx; var g = cur.go; cancelNow(); setTimeout(g, 260); }
    else if (!cur.started && age > 3200) { if (cur.voice) voiceFailed(cur.voice); else if (age > 6000 && !synth.speaking) blocked(); }
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
    scopeKey = (b && b.dataset && b.dataset.say) || '';
    if (typeof from === 'function') from = from(items);
    if (!(from >= 0 && from < items.length)) from = 0;
    var h = sc.querySelector('h1, .s-rule, h3, .t-title, h2');
    title = h ? h.textContent.trim() : 'Озвучка';
    setBtn(btn, true); showBar(); refresh();
    speakAt(from, true);
  }
  function stop() {
    token++;
    cancelNow();
    playing = false; paused = false;
    setBtn(btn, false); btn = null; scope = null; items = [];
    clearMark(); hideBar(); scopeKey = '';
    refresh();
  }
  function toggle(sc, b) {
    if (playing && b && b === btn) { stop(); return; }
    start(sc, b);
  }
  function mainBtn(b) { return b.classList.contains('resume') ? (b.parentElement.querySelector('.say.wide:not(.resume)[data-say="' + b.dataset.say + '"]') || b) : b; }
  function resume(sc, b) {
    var main = mainBtn(b), pos = getPos(main.dataset.say);
    if (playing && btn === main) { return; }
    start(sc, main, function (list) {
      if (!pos) return 0;
      if (list[pos.idx] && list[pos.idx].text.slice(0, 50) === pos.snip) return pos.idx;
      for (var i = 0; i < list.length; i++) if (list[i].text.slice(0, 50) === pos.snip) return i;
      return Math.min(pos.idx, list.length - 1);
    });
  }
  function startAt(sc, b, node, offset) {
    var main = mainBtn(b);
    start(sc, main, function (list) { return indexAt(list, node, offset); });
  }
  function pause() {
    if (!playing) return;
    paused = !paused;
    if (paused) { token++; cancelNow(); updateBar(); }
    else speakAt(idx, true);
  }
  var resolver = null, chip = null, chipT = 0, chipCtx = null;
  function scopeAt(t) {
    if (!resolver) return null;
    var best = null;
    document.querySelectorAll('#app .say.wide[data-say]:not(.resume)').forEach(function (b) {
      var sc = resolver(b);
      if (sc && sc.contains(t) && (!best || best.sc.contains(sc))) best = { sc: sc, b: b };
    });
    return best;
  }
  function caretAt(x, y) {
    if (document.caretPositionFromPoint) { var p = document.caretPositionFromPoint(x, y); return p && p.offsetNode ? { node: p.offsetNode, offset: p.offset } : null; }
    if (document.caretRangeFromPoint) { var r = document.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, offset: r.startOffset } : null; }
    return null;
  }
  function hideChip() { clearTimeout(chipT); if (chip) chip.hidden = true; chipCtx = null; }
  function showChip(x, y, ctx) {
    if (!chip) {
      chip = document.createElement('button'); chip.type = 'button'; chip.className = 'say-chip'; chip.hidden = true;
      chip.addEventListener('click', function (e) {
        e.stopPropagation(); var c = chipCtx; hideChip();
        if (c) startAt(c.sc, c.b, c.node, c.offset);
      });
      document.body.appendChild(chip);
    }
    chipCtx = ctx;
    chip.innerHTML = '<span aria-hidden="true">▶</span> ' + (playing ? 'Читать отсюда' : 'Слушать отсюда');
    chip.hidden = false;
    var w = chip.offsetWidth || 150;
    chip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + 'px';
    chip.style.top = (y > 110 ? y - 58 : y + 22) + 'px';
    clearTimeout(chipT); chipT = setTimeout(hideChip, 4500);
  }
  document.addEventListener('click', function (e) {
    if (!supported || !(e.target instanceof Element)) return;
    var t = e.target;
    if (chip && chip.contains(t)) return;
    hideChip();
    if (t.closest('a, button, summary, input, textarea, select, label, .player, .hl-bar, .prefs-panel, .tts-notice, .tour, .film, .t-head, .say-row, mark.hl, [data-nohl]')) return;
    var sel = window.getSelection && getSelection(); if (sel && !sel.isCollapsed) return;
    if (!t.closest(READ)) return;
    var sc = scopeAt(t); if (!sc) return;
    var pos = caretAt(e.clientX, e.clientY); if (!pos) return;
    showChip(e.clientX, e.clientY, { sc: sc.sc, b: sc.b, node: pos.node, offset: pos.offset });
  });
  addEventListener('scroll', hideChip, { passive: true });
  function startFromNode(node, offset) {
    var el = node && (node.nodeType === 1 ? node : node.parentElement); if (!el) return false;
    var sc = scopeAt(el); if (!sc) return false;
    startAt(sc.sc, sc.b, node, offset); return true;
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

  window.Player = {
    supported: supported, toggle: toggle, stop: stop, isPlaying: function () { return playing; },
    resume: resume, startAt: startAt, startFromNode: startFromNode, decorate: decorate, last: last,
    setScopeResolver: function (f) { resolver = f; }
  };
})();
