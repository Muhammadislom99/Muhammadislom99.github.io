/* Режим «Фильм»: эпизоды комикса подряд, как мультфильм.
   Титр эпизода → кадры (плавный наезд камеры, реплики появляются по очереди,
   субтитры, озвучка) → урок эпизода. Озвучка — синтезатор речи браузера. */
(function () {
  var C = window.COMIC || [];
  var synth = window.speechSynthesis, canSpeak = !!(synth && window.SpeechSynthesisUtterance);
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lessonOf(ep) { return (window.LESSONS || []).find(function (l) { return l.id === ep.lesson; }); }

  /* ---------- Сценарий ---------- */
  var T = [];
  C.forEach(function (ep, e) {
    T.push({ k: 'title', e: e });
    ep.panels.forEach(function (p, i) { T.push({ k: 'panel', e: e, p: i }); });
    if (lessonOf(ep)) T.push({ k: 'lesson', e: e });
  });
  function startOf(e) { for (var i = 0; i < T.length; i++) if (T[i].e === e) return i; return 0; }
  function lines(it) {
    var ep = C[it.e];
    if (it.k === 'title') return [{ t: 'Эпизод ' + (it.e + 1) + '. ' + ep.title + '. ' + ep.year.replace('≈', 'около ') + ' год.', sub: '', say: ep.intro }];
    if (it.k === 'lesson') { var l = lessonOf(ep); return [{ t: 'Урок. ' + l.title + '. ' + l.summary, sub: '' }]; }
    var p = ep.panels[it.p], out = [{ t: p.cap, sub: p.cap }];
    (p.b || []).forEach(function (b, j) {
      if (b.k === 'narr') return;
      out.push({ t: b.t, sub: '— ' + b.t, bubble: j, voice: b.k === 'think' ? 'think' : 'say' });
    });
    return out;
  }
  var totalWords = 0;
  T.forEach(function (it) { lines(it).forEach(function (x) { totalWords += (x.t + ' ' + (x.say || '')).split(/\s+/).length; }); });
  var minutes = Math.round(totalWords / 130 + T.length * 0.02);

  /* ---------- Состояние ---------- */
  var idx = 0, li = 0, playing = false, token = 0, root = null, hideT = null, shown = -1;
  var muted = Store.get('film-muted', !canSpeak), subs = Store.get('film-subs', true);

  /* ---------- Озвучка (с обходом особенностей Android Chrome) ---------- */
  var lastCancel = 0, watch = null;
  function cancel() { if (canSpeak && (synth.speaking || synth.pending)) { synth.cancel(); lastCancel = Date.now(); } }
  function say(text, opts, done) {
    var my = token, finished = false;
    function fin() { if (finished || my !== token) return; finished = true; clearInterval(watch); done(); }
    var fallback = Math.max(2600, text.length * 62 / rate());
    if (muted || !canSpeak) { setTimeout(fin, fallback); return; }
    var started = false, t0, retried = false;
    function go() {
      if (my !== token) return;
      var u = new SpeechSynthesisUtterance(text), v = window.TTS && TTS.voice && TTS.voice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'ru-RU';
      u.rate = rate() * (opts.voice === 'say' ? 1.05 : 1);
      u.pitch = opts.voice === 'say' ? 1.15 : opts.voice === 'think' ? 0.9 : 1;
      u.onstart = function () { started = true; };
      u.onend = fin;
      u.onerror = function (e) { if (e.error !== 'interrupted' && e.error !== 'canceled') fin(); };
      t0 = Date.now();
      synth.speak(u);
    }
    var wait = 260 - (Date.now() - lastCancel);
    if (wait > 0) setTimeout(go, wait); else go();
    clearInterval(watch);
    watch = setInterval(function () {
      if (my !== token || finished) { clearInterval(watch); return; }
      var age = Date.now() - (t0 || Date.now());
      if (started && age > 800 && !synth.speaking && !synth.pending) fin();
      else if (!started && age > 1500 && !retried) { retried = true; cancel(); setTimeout(go, 260); }
      else if (!started && age > 4000) { clearInterval(watch); setTimeout(fin, Math.max(0, fallback - age)); }
    }, 500);
  }
  function rate() { return (window.Prefs && Prefs.get().rate) || 1; }

  /* ---------- Кадры ---------- */
  function frameHtml(it) {
    var ep = C[it.e];
    if (it.k === 'title') {
      return '<div class="fl-card"><div class="fl-ep">Эпизод ' + (it.e + 1) + ' из ' + C.length + ' · ' + esc(ep.year) + '</div>' +
        '<h2>' + esc(ep.title) + '</h2><div class="fl-rule"></div><p>' + esc(ep.intro) + '</p></div>';
    }
    if (it.k === 'lesson') {
      var l = lessonOf(ep);
      return '<div class="fl-card fl-lesson"><div class="fl-ep">Урок эпизода</div><div class="fl-art">' + (window.ART && ART[l.art] || '') + '</div>' +
        '<h2>' + esc(l.title) + '</h2><p>' + esc(l.summary) + '</p></div>';
    }
    var p = ep.panels[it.p], dir = ['kb1', 'kb2', 'kb3', 'kb4'][(it.e * 3 + it.p) % 4];
    return '<div class="fl-panel ' + dir + '">' + Comic.render(p) + '</div>';
  }
  function show(it) {
    var scr = root.querySelector('.fl-screen');
    var old = scr.querySelectorAll('.fl-frame');
    var f = document.createElement('div');
    f.className = 'fl-frame';
    f.innerHTML = frameHtml(it);
    f.querySelectorAll('.bubble').forEach(function (b, j) {
      var data = it.k === 'panel' && C[it.e].panels[it.p].b[j];
      b.dataset.j = j;
      if (data && data.k !== 'narr') b.classList.add('fl-hidden');
    });
    scr.appendChild(f);
    requestAnimationFrame(function () { f.classList.add('in'); });
    old.forEach(function (o) { o.classList.add('out'); setTimeout(function () { o.remove(); }, 700); });
  }
  function setSub(t) {
    var s = root.querySelector('.fl-sub');
    s.textContent = t || '';
    s.classList.toggle('on', !!t && subs);
  }

  /* ---------- Воспроизведение ---------- */
  function playItem(i, fromLine) {
    var my = ++token;
    cancel();
    idx = Math.max(0, Math.min(T.length - 1, i));
    Store.set('film-pos', idx);
    var it = T[idx], L = lines(it);
    if (shown !== idx) { show(it); shown = idx; }
    updateUi();
    li = fromLine || 0;
    if (!playing) { setSub(L[li] && L[li].sub); return; }
    (function next() {
      if (my !== token || !playing) return;
      if (li >= L.length) {
        setTimeout(function () {
          if (my !== token || !playing) return;
          if (idx + 1 >= T.length) { playing = false; updateUi(); setSub('Конец. Спасибо за просмотр!'); return; }
          playItem(idx + 1);
        }, it.k === 'panel' ? 500 : 900);
        return;
      }
      var x = L[li];
      if (x.bubble != null) {
        var b = root.querySelector('.fl-frame:last-child .bubble[data-j="' + x.bubble + '"]');
        if (b) b.classList.remove('fl-hidden');
      }
      setSub(x.sub);
      var text = x.t + (x.say && x.say !== x.t ? ' ' + x.say : '');
      say(text, x, function () { if (my !== token) return; li++; next(); });
    })();
  }
  function play() {
    if (window.Player) Player.stop();
    playing = true; root.classList.remove('paused'); updateUi(); playItem(idx, li); peek();
  }
  function pause() { playing = false; token++; cancel(); root.classList.add('paused'); updateUi(); showUi(); }
  function toggle() { if (playing) pause(); else play(); }
  function go(d) { var was = playing; token++; cancel(); li = 0; playing = was; playItem(idx + d); peek(); }
  function goEp(e) { idx = startOf(e); li = 0; closeList(); if (playing) playItem(idx); else play(); }

  /* ---------- Интерфейс ---------- */
  function updateUi() {
    if (!root) return;
    var it = T[idx];
    root.querySelector('[data-f="toggle"]').innerHTML = playing ? '❚❚' : '▶';
    root.querySelector('[data-f="toggle"]').setAttribute('aria-label', playing ? 'Пауза' : 'Смотреть');
    root.querySelector('[data-f="mute"]').textContent = muted ? '🔇' : '🔊';
    root.querySelector('[data-f="subs"]').classList.toggle('off', !subs);
    root.querySelector('.fl-now').textContent = 'Эпизод ' + (it.e + 1) + ' · ' + C[it.e].title;
    root.querySelector('.fl-bar div').style.width = ((idx + 1) / T.length * 100) + '%';
    root.querySelectorAll('.fl-seg').forEach(function (s, e) { s.classList.toggle('on', e === it.e); s.classList.toggle('done', e < it.e); });
  }
  function showUi() { root.classList.add('ui'); clearTimeout(hideT); }
  function peek() { showUi(); hideT = setTimeout(function () { if (playing && root) root.classList.remove('ui'); }, 3200); }
  function openList() { root.querySelector('.fl-list').hidden = false; showUi(); }
  function closeList() { root.querySelector('.fl-list').hidden = true; }

  function view(arg) {
    var pos = Store.get('film-pos', 0), resumeEp = T[pos] ? T[pos].e : 0;
    return '<div class="film paused ui" id="film">' +
      '<div class="fl-screen" aria-live="off"></div>' +
      '<div class="fl-sub" aria-live="polite"></div>' +
      '<div class="fl-start">' +
        '<div class="fl-poster"><div class="fl-logo">侍</div><div class="fl-ep">Мультфильм по мотивам книги</div><h1>Самурай без меча</h1>' +
        '<p>' + C.length + ' эпизодов из жизни Тоётоми Хидэёси · около ' + minutes + ' мин · с озвучкой и субтитрами</p>' +
        '<div class="btn-row" style="justify-content:center">' +
        (C[+arg - 1] ? '<button class="btn primary" data-f="resume">▶ Эпизод ' + (+arg) + ': ' + esc(C[+arg - 1].title) + '</button><button class="btn" data-f="start">С начала</button>'
          : '<button class="btn primary" data-f="start">▶ Смотреть с начала</button>' +
            (pos > 0 ? '<button class="btn" data-f="resume">Продолжить: эпизод ' + (resumeEp + 1) + '</button>' : '')) +
        '<button class="btn" data-f="list">Эпизоды</button></div>' +
        (canSpeak ? '' : '<p class="fl-warn">Браузер не умеет читать вслух — фильм пойдёт с субтитрами.</p>') +
        '<a class="fl-exit-link" href="#/comic">← Вернуться к комиксу</a></div></div>' +
      '<div class="fl-top"><a class="fl-btn" href="#/comic" aria-label="Выйти">✕</a><span class="fl-now"></span>' +
        '<button class="fl-btn" data-f="list" aria-label="Список эпизодов">☰</button></div>' +
      '<div class="fl-ui">' +
        '<div class="fl-segs">' + C.map(function (ep, e) { return '<button class="fl-seg" data-ep="' + e + '" aria-label="Эпизод ' + (e + 1) + '"></button>'; }).join('') + '</div>' +
        '<div class="fl-bar"><div></div></div>' +
        '<div class="fl-ctrl">' +
          '<button class="fl-btn" data-f="subs" aria-label="Субтитры">CC</button>' +
          '<button class="fl-btn" data-f="prev" aria-label="Предыдущий кадр">⏮</button>' +
          '<button class="fl-btn fl-main" data-f="toggle" aria-label="Смотреть">▶</button>' +
          '<button class="fl-btn" data-f="next" aria-label="Следующий кадр">⏭</button>' +
          '<button class="fl-btn" data-f="mute" aria-label="Звук">🔊</button>' +
          '<button class="fl-btn" data-f="full" aria-label="Во весь экран">⛶</button>' +
        '</div></div>' +
      '<div class="fl-list" hidden><div class="fl-list-in"><div class="fl-list-head"><b>Эпизоды</b><button class="fl-btn" data-f="closelist" aria-label="Закрыть">✕</button></div>' +
        C.map(function (ep, e) {
          return '<button class="fl-item" data-ep="' + e + '"><span class="fl-thumb">' + Comic.render(ep.panels[0], true) + '</span><span><small>' + (e + 1) + ' · ' + esc(ep.year) + '</small><b>' + esc(ep.title) + '</b></span></button>';
        }).join('') + '</div></div>' +
    '</div>';
  }
  function bind(arg) {
    root = document.getElementById('film');
    if (arg != null && arg !== '' && C[+arg - 1]) idx = startOf(+arg - 1);
    else idx = Store.get('film-pos', 0) < T.length ? Store.get('film-pos', 0) : 0;
    li = 0; playing = false; shown = -1;
    show(T[idx]); shown = idx; updateUi();
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f], [data-ep]');
      if (!b) {
        if (e.target.closest('.fl-list-in, .fl-start')) return;
        if (root.querySelector('.fl-start')) return;
        if (root.classList.contains('ui') && playing) { root.classList.remove('ui'); clearTimeout(hideT); } else peek();
        return;
      }
      if (b.dataset.ep != null) { begin(); goEp(+b.dataset.ep); return; }
      var a = b.dataset.f;
      if (a === 'start') { begin(); idx = 0; li = 0; play(); }
      else if (a === 'resume') { begin(); play(); }
      else if (a === 'toggle') toggle();
      else if (a === 'prev') go(-1);
      else if (a === 'next') go(1);
      else if (a === 'mute') { muted = !muted; Store.set('film-muted', muted); if (playing) { token++; cancel(); playItem(idx, li); } updateUi(); }
      else if (a === 'subs') { subs = !subs; Store.set('film-subs', subs); setSub(root.querySelector('.fl-sub').textContent); updateUi(); }
      else if (a === 'full') fullscreen();
      else if (a === 'list') openList();
      else if (a === 'closelist') closeList();
    });
  }
  function begin() { var s = root.querySelector('.fl-start'); if (s) s.remove(); }
  function fullscreen() {
    var d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
    } catch (e) {}
  }
  addEventListener('keydown', function (e) {
    if (!root || !document.contains(root) || e.target.closest('input, textarea')) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); begin(); toggle(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'f') fullscreen();
    else if (e.key === 'Escape' && !root.querySelector('.fl-list').hidden) closeList();
  });
  addEventListener('hashchange', function () {
    if (location.hash.indexOf('#/film') !== 0 && root) { playing = false; token++; cancel(); root = null;
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }
  });

  window.Film = { view: view, bind: bind, episodes: C.length, minutes: minutes };
})();
