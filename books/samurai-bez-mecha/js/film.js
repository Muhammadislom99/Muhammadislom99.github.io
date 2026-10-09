/* Режим «Фильм»: эпизоды комикса подряд, как мультфильм.
   Титр эпизода → кадры (плавный наезд камеры, реплики появляются по очереди,
   субтитры, озвучка) → урок эпизода. Озвучка — синтезатор речи браузера. */
(function () {
  var C = window.COMIC || [];
  var CH = window.CHAPTERS || [], SXD = window.SX || {}, TL = window.TLDR || {};
  function chLabel(c) { return c.n ? 'Глава ' + c.n : 'Вступление'; }
  var U = C.map(function (ep, e) { return { kind: 'ep', label: 'Эпизод ' + (e + 1), title: ep.title, meta: ep.year, panel: ep.panels[0] }; })
    .concat(CH.map(function (c) { return { kind: 'ch', label: chLabel(c), title: c.title, meta: c.n ? 'Часть II' : 'Часть II', art: c.art }; }));
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
  /* Часть II: книга по главам */
  function sentences(t, max) {
    var parts = String(t).match(/[^.!?…]+[.!?…»"]*\s*/g) || [String(t)], out = [], cur = '';
    max = max || 190;
    parts.forEach(function (x) { x = x.trim(); if (!x) return; if (!cur) cur = x; else if ((cur + ' ' + x).length <= max) cur += ' ' + x; else { out.push(cur); cur = x; } });
    if (cur) out.push(cur);
    return out;
  }
  CH.forEach(function (c, n) {
    var e = C.length + n, ctx = 0;
    T.push({ k: 'ctitle', e: e, c: n });
    (c.intro || []).forEach(function (p) { T.push({ k: 'bscene', e: e, h: c.title, text: p, i: ctx++ }); });
    (c.secrets || []).forEach(function (sec) {
      T.push({ k: 'stitle', e: e, c: n, sec: sec });
      (sec.story || []).forEach(function (p) { T.push({ k: 'bscene', e: e, h: sec.name, text: p, i: ctx++ }); });
      if (SXD[sec.id]) T.push({ k: 'bsx', e: e, c: n, sec: sec, x: SXD[sec.id] });
      T.push({ k: 'bkey', e: e, c: n, sec: sec });
    });
    if (c.outro) T.push({ k: 'bscene', e: e, h: c.outro.h || c.title, text: c.outro.p, i: ctx++ });
    if (TL[c.n]) T.push({ k: 'btldr', e: e, c: n, items: TL[c.n] });
    if (c.reflect) T.push({ k: 'breflect', e: e, c: n, text: c.reflect });
  });
  /* картинка к абзацу: сцена и герои подбираются по смыслу текста */
  var SCN = [['temple', /хоннодзи|пожар|горящ/i], ['flood', /затоп|плотин|наводн/i], ['river', /рек[аеиу]|лодк|плот/i], ['field', /битв|сражен|войск|армия|атак|полк|воин/i],
    ['tea', /чай|церемони|праздник|угощен/i], ['sea', /мор[еяю]|флот|корей|корабл/i], ['camp', /лагер|осад|одавар|палатк/i], ['castle', /замок|крепост|стен[аыу]|башн/i],
    ['hall', /совет|переговор|дипломат|вассал|господин|приказ|слуг|подчинённ/i], ['mount', /гор[аыу]|поход|марш|перевал/i], ['night', /ночь|ночн|тайн|секрет/i], ['village', /деревн|крестьян|мать|отец|детств|бедн/i]];
  var ROT = ['village', 'road', 'hall', 'castle', 'mount', 'river', 'field', 'camp'], POSES = ['hold', 'up', 'point', 'down'];
  function genPanel(text, i) {
    var sc = null;
    SCN.some(function (r) { if (r[1].test(text)) { sc = r[0]; return true; } });
    if (!sc) sc = ROT[i % ROT.length];
    var mood = /смех|шутк|радост|успех|победа|награ|благодар/i.test(text) ? 'happy' : /опасн|страх|угроз|трудн|потер|поражен|боял/i.test(text) ? 'worry' : /гнев|ярост|злост|раздраж/i.test(text) ? 'angry' : /решил|решимость|упорн|цель|наде/i.test(text) ? 'det' : 'calm';
    var kind = /кампаку|регент|императорск|тоётоми/i.test(text) ? 'hideK' : /армия|битв|войск|правитель|замок/i.test(text) ? 'hideL' : 'hide';
    var cs = [{ k: kind, x: 110, y: 210, s: 1, mood: mood, pose: POSES[i % 4] }];
    if (/нобунаг/i.test(text)) cs.push({ k: 'nobu', x: 242, y: 213, s: 1, mood: 'calm', pose: 'down', flip: true });
    else if (/мицухидэ|акэти|противник|соперник|враг/i.test(text)) cs.push({ k: 'foe', x: 242, y: 212, s: 1, mood: 'worry', pose: 'cross', flip: true });
    else if (/иэясу|ханбэй|канбэй|советник|самура/i.test(text)) cs.push({ k: 'sam', x: 242, y: 212, s: 1, mood: 'calm', pose: 'hold', flip: true });
    else if (/крестьян|мать|народ|люди|рабоч|солдат|воин/i.test(text)) cs.push({ k: 'pea', x: 242, y: 208, s: 0.9, mood: 'happy', pose: 'down', flip: true });
    var fx = /успех|награ|благодар|радост/i.test(text) ? [{ t: 'spark', x: 180, y: 70, s: 1.2 }] : /огонь|пожар/i.test(text) ? [{ t: 'flame', x: 250, y: 190, s: 0.9 }] : [];
    return { s: sc, c: cs, fx: fx, b: [], cap: '' };
  }
  function startOf(e) { for (var i = 0; i < T.length; i++) if (T[i].e === e) return i; return 0; }
  function lines(it) {
    if (it.k === 'ctitle') { var cc = CH[it.c]; return [{ t: chLabel(cc) + '. ' + cc.title + '.', sub: '', say: cc.sub || '' }]; }
    if (it.k === 'stitle') return [{ t: it.sec.name + '. ' + (it.sec.rule || '') + '.', sub: '' }];
    if (it.k === 'bscene') return sentences(it.text).map(function (t) { return { t: t, sub: t, talk: true }; });
    if (it.k === 'bsx') {
      var x = it.x, out = [{ t: 'Что было. ' + x.sit, sub: 'Что было. ' + x.sit }];
      (x.do || []).forEach(function (d, j) { out.push({ t: (j === 0 ? 'Что он сделал. ' : '') + d + '.', sub: (j === 0 ? 'Что он сделал. ' : '') + d }); });
      out.push({ t: 'Итог. ' + x.res, sub: 'Итог. ' + x.res });
      return out;
    }
    if (it.k === 'bkey') {
      var o2 = [{ t: 'Главное. ' + it.sec.key, sub: 'Главное. ' + it.sec.key }];
      if (it.sec['try']) o2.push({ t: 'Попробуй. ' + it.sec['try'], sub: 'Попробуй. ' + it.sec['try'] });
      return o2;
    }
    if (it.k === 'btldr') return [{ t: 'Главное за тридцать секунд. ' + it.items.join('. ') + '.', sub: 'Главное за 30 секунд' }];
    if (it.k === 'breflect') return [{ t: 'Вопрос для размышления. ' + it.text, sub: it.text }];
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
    if (it.k === 'ctitle') {
      var cc = CH[it.c];
      return '<div class="fl-card fl-lesson"><div class="fl-ep">' + esc(chLabel(cc)) + ' · Часть II</div><div class="fl-art">' + (window.ART && ART[cc.art] || '') + '</div><h2>' + esc(cc.title) + '</h2>' + (cc.sub ? '<p>' + esc(cc.sub) + '</p>' : '') + '</div>';
    }
    if (it.k === 'stitle') return '<div class="fl-card"><div class="fl-ep">Секрет · ' + esc(chLabel(CH[it.c])) + '</div><h2>' + esc(it.sec.name) + '</h2><div class="fl-rule"></div><p>' + esc(it.sec.rule || '') + '</p></div>';
    if (it.k === 'bscene') return '<div class="fl-panel kb' + (it.i % 4 + 1) + '">' + Comic.render(genPanel(it.text, it.i), true) + '<div class="fl-chip">' + esc(it.h) + '</div></div>';
    if (it.k === 'bsx') {
      return '<div class="fl-card fl-facts"><div class="fl-ep">' + esc(it.sec.name) + '</div><div class="fl-cols"><div><b>Что было</b><span>' + esc(it.x.sit) + '</span></div><div><b>Что он сделал</b><ul>' +
        (it.x['do'] || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></div><div><b>Итог</b><span>' + esc(it.x.res) + '</span></div></div></div>';
    }
    if (it.k === 'bkey') return '<div class="fl-card fl-lesson"><div class="fl-ep">' + esc(it.sec.name) + '</div><h2>Главное</h2><p>' + esc(it.sec.key) + '</p>' + (it.sec['try'] ? '<div class="fl-rule"></div><p class="fl-try"><b>Попробуй.</b> ' + esc(it.sec['try']) + '</p>' : '') + '</div>';
    if (it.k === 'btldr') return '<div class="fl-card fl-facts"><div class="fl-ep">Главное за 30 секунд</div><h2>' + esc(CH[it.c].title) + '</h2><ul class="fl-tldr">' + it.items.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></div>';
    if (it.k === 'breflect') return '<div class="fl-card fl-lesson"><div class="fl-ep">Вопрос для размышления</div><h2>' + esc(it.text) + '</h2></div>';
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
  function talk(sp) {
    if (!root) return;
    root.querySelectorAll('.sil-char.talking').forEach(function (n) { n.classList.remove('talking'); });
    if (sp == null || +sp < 0) return;
    var n = root.querySelector('.fl-frame:last-child .sil-char[data-ci="' + sp + '"]');
    if (n) n.classList.add('talking');
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
        if (b) { b.classList.remove('fl-hidden'); talk(b.dataset.sp); }
      }
      setSub(x.sub);
      var text = x.t + (x.say && x.say !== x.t ? ' ' + x.say : '');
      if (x.talk) talk(0); else if (x.bubble == null) talk(-1);
      say(text, x, function () { if (my !== token) return; talk(-1); li++; next(); });
    })();
  }
  function play() {
    if (window.Player) Player.stop();
    playing = true; root.classList.remove('paused'); updateUi(); playItem(idx, li); peek();
  }
  function pause() { playing = false; token++; cancel(); talk(-1); root.classList.add('paused'); updateUi(); showUi(); }
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
    root.querySelector('.fl-now').textContent = U[it.e].label + ' · ' + U[it.e].title;
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
        '<p>Часть I: ' + C.length + ' эпизодов из жизни Тоётоми Хидэёси. Часть II: ' + CH.length + ' глав книги и все секреты. Около ' + minutes + ' мин · с озвучкой и субтитрами</p>' +
        '<div class="btn-row" style="justify-content:center">' +
        (U[+arg - 1] ? '<button class="btn primary" data-f="resume">▶ ' + esc(U[+arg - 1].label) + ': ' + esc(U[+arg - 1].title) + '</button><button class="btn" data-f="start">С начала</button>'
          : '<button class="btn primary" data-f="start">▶ Смотреть с начала</button>' +
            '<button class="btn" data-f="book">Книга по главам</button>' +
            (pos > 0 ? '<button class="btn" data-f="resume">Продолжить: ' + esc(U[resumeEp].label.toLowerCase()) + '</button>' : '')) +
        '<button class="btn" data-f="list">Эпизоды</button></div>' +
        (canSpeak ? '' : '<p class="fl-warn">Браузер не умеет читать вслух — фильм пойдёт с субтитрами.</p>') +
        '<a class="fl-exit-link" href="#/comic">← Вернуться к комиксу</a></div></div>' +
      '<div class="fl-top"><a class="fl-btn" href="#/comic" aria-label="Выйти">✕</a><span class="fl-now"></span>' +
        '<button class="fl-btn" data-f="list" aria-label="Список эпизодов">☰</button></div>' +
      '<div class="fl-ui">' +
        '<div class="fl-segs">' + U.map(function (u, e) { return '<button class="fl-seg' + (e === C.length ? ' fl-gap' : '') + '" data-ep="' + e + '" aria-label="' + esc(u.label) + '"></button>'; }).join('') + '</div>' +
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
        U.map(function (u, e) {
          return (e === 0 ? '<div class="fl-part">Часть I · Жизнь Хидэёси</div>' : '') + (e === C.length ? '<div class="fl-part">Часть II · Книга по главам</div>' : '') +
            '<button class="fl-item" data-ep="' + e + '"><span class="fl-thumb' + (u.kind === 'ch' ? ' fl-thumb-art' : '') + '">' + (u.kind === 'ep' ? Comic.render(u.panel, true) : (window.ART && ART[u.art] || '')) + '</span><span><small>' + esc(u.label) + (u.kind === 'ep' ? ' · ' + esc(u.meta) : '') + '</small><b>' + esc(u.title) + '</b></span></button>';
        }).join('') + '</div></div>' +
    '</div>';
  }
  function bind(arg) {
    root = document.getElementById('film');
    if (arg != null && arg !== '' && U[+arg - 1]) idx = startOf(+arg - 1);
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
      else if (a === 'book') { begin(); idx = startOf(C.length); li = 0; play(); }
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
