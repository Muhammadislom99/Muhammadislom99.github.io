/* SPA: маршрутизация по hash и отрисовка разделов. */
(function () {
  var app = document.getElementById('app');
  var ART = window.ART, LESSONS = window.LESSONS, LIFE = window.LIFE;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sayBtn(key, label) {
    if (!window.TTS || !TTS.supported) return '';
    return '<button class="say' + (label ? ' wide' : '') + '" type="button" data-say="' + esc(key) + '" aria-label="Слушать"><span class="ic" aria-hidden="true">▶</span>' + (label ? '<span>' + esc(label) + '</span>' : '') + '</button>';
  }
  function sayText(key) {
    var k = key.split(':'), id = k.slice(1).join(':'), out = [];
    if (k[0] === 'secret' || k[0] === 'secretfull') {
      var s = secretById(id), x = (window.SX || {})[id];
      if (!s) return '';
      out.push(s.name + '. ' + s.rule + '.');
      if (x && k[0] === 'secret') {
        out.push('Ситуация. ' + x.sit, 'Что он сделал. ' + x.do.map(function (d, i) { return (i + 1) + '. ' + d + '.'; }).join(' '), 'Итог. ' + x.res);
      } else out = out.concat(s.story);
      out.push('Суть. ' + s.key);
    } else if (k[0] === 'chapter') {
      var c = CH.find(function (x) { return x.n === +id; });
      if (!c) return '';
      out.push((c.n ? 'Глава ' + c.n + '. ' : '') + c.title + '. ' + c.sub + '.');
      out = out.concat(c.intro);
      (c.sections || []).forEach(function (sc) { out.push(sc.h + '.'); out = out.concat(sc.p); });
      (c.secrets || []).forEach(function (sc, i) { out.push('Секрет ' + (i + 1) + '. ' + sc.name + ': ' + sc.rule + '. ' + sc.key); });
      if (c.outro) out.push(c.outro.h + '. ' + c.outro.p);
    } else if (k[0] === 'lesson') {
      var l = lessonById(id);
      if (l) out.push(l.title + '. ' + l.summary, l.story, 'Принцип. ' + l.points.join(' '));
    } else if (k[0] === 'comic') {
      var e = COMIC.find(function (x) { return x.id === id; });
      if (e) out = [e.title + '. ' + e.intro].concat(e.detail);
    } else if (k[0] === 'person') {
      var pp = (window.PEOPLE || []).find(function (x) { return x.id === id; });
      if (pp) out.push(pp.name + ', ' + pp.role + '. ' + pp.t);
    } else if (k[0] === 'life') {
      var ev = LIFE[+id];
      if (ev) out.push(ev.year + '. ' + ev.title + '. ' + ev.text);
    }
    return out.join(' ');
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('.say');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    TTS.speak(sayText(b.dataset.say), b);
  });

  function lessonById(id) { return LESSONS.find(function (l) { return l.id === id; }); }
  function readSet() { return Store.get('read', []); }

  /* ---------- Тема ---------- */
  var root = document.documentElement;
  function currentTheme() {
    return root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  document.getElementById('themeBtn').addEventListener('click', function () {
    var order = ['light', 'sepia', 'dark'];
    var t = order[(order.indexOf(currentTheme()) + 1) % 3];
    root.dataset.theme = t;
    Store.set('theme', t);
    try { localStorage.setItem('sbm-theme', t); } catch (e) {}
  });

  /* ---------- Меню ---------- */
  var nav = document.getElementById('nav'), menuBtn = document.getElementById('menuBtn');
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });

  /* ---------- Прогресс прокрутки ---------- */
  var bar = document.getElementById('progressBar');
  var lastY = 0;
  addEventListener('scroll', function () {
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
    var reading = location.hash.indexOf('#/reader') === 0 || location.hash.indexOf('#/lesson/') === 0 || location.hash.indexOf('#/comic/') === 0 || location.hash.indexOf('#/chapter/') === 0;
    var down = scrollY > lastY + 6, up = scrollY < lastY - 6;
    if (reading && down && scrollY > 120 && !nav.classList.contains('open')) document.body.classList.add('hide-bar');
    else if (up || !reading || scrollY < 120) document.body.classList.remove('hide-bar');
    if (down || up) lastY = scrollY;
  }, { passive: true });

  /* ---------- Главная ---------- */
  function home() {
    var B = window.BOOK, done = readSet().length;
    return '<div class="fade-in">' +
      '<div class="hero"><div>' +
        '<div class="eyebrow">' + esc(B.author) + '</div>' +
        '<h1>' + esc(B.title) + '</h1>' +
        '<p class="lead">Как сын крестьянина без знатного имени и без меча стал правителем Японии — и что из этого можно взять себе.</p>' +
        '<div class="btn-row">' +
          '<a class="btn primary" href="#/book">' + (studied().length ? 'Продолжить по главам (' + studied().length + '/' + SECRETS.length + ')' : 'Читать по главам') + '</a>' +
          '<a class="btn" href="#/lessons">' + (done ? 'Уроки (' + done + '/' + LESSONS.length + ')' : 'Уроки') + '</a>' +
          '<a class="btn" href="#/life">Жизнь Хидэёси</a>' +
        '</div>' +
      '</div><div class="art">' + ART.cover + '</div></div>' +

      '<section class="narrow prose"><div class="eyebrow">О книге</div>' +
        B.about.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '</section>' +

      '<section><div class="facts">' +
        B.facts.map(function (f) { return '<div class="fact"><b>' + f.v + '</b><span>' + esc(f.t) + '</span></div>'; }).join('') +
      '</div></section>' +

      '<section class="narrow"><div class="eyebrow">Главные идеи</div><h2>Семь мыслей в одну минуту</h2>' +
        '<ol class="prose">' + B.ideas.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ol>' +
      '</section>' +

      '<section><div class="eyebrow">Разделы</div><div class="grid">' +
        card('#/book', (CH.length - 1) + ' глав · ' + SECRETS.length + ' секретов', 'Книга по главам', 'Все главы книги: эпизоды, суть каждого секрета и практика. Отмечайте изученное.', ART.scroll) +
        card('#/cards', SECRETS.length + ' карточек', 'Карточки секретов', 'Вспомните правило по названию — и проверьте себя, перевернув карточку.', ART.ear) +
        card('#/people', (window.PEOPLE || []).length + ' человек', 'Люди Хидэёси', 'Нобунага, Нэнэ, Хидэнага, Хамбэй, соперники и бывшие враги — кто есть кто.', ART.people) +
        card('#/era', '7 ступеней', 'Эпоха', 'Социальная лестница феодальной Японии и краткая история самураев.', ART.mountain) +
        card('#/life', 'Хронология', 'Жизнь Хидэёси', 'От деревни Накамура до замка Фусими — ' + LIFE.length + ' событий с иллюстрациями.', ART.castle) +
        card('#/comic', COMIC.length + ' эпизодов', 'Комикс', 'Ключевые моменты жизни Хидэёси в картинках, с пересказом каждого эпизода.', ART.sword) +
        card('#/lessons', LESSONS.length + ' тем', 'Уроки', 'Каждый принцип — история, суть, практика и вопрос для размышления.', ART.scroll) +
        card('#/quiz', QUIZ.length + ' вопросов', 'Проверь себя', 'Короткий тест по событиям и идеям книги.', ART.enso) +
        card('#/reader', 'Ваш экземпляр', 'Читать книгу', 'Откройте свой файл PDF, FB2 или TXT — с главами, поиском и закладками.', ART.lantern) +
      '</div></section></div>';
  }
  function card(href, num, title, text, art) {
    return '<a class="card" href="' + href + '">' + (art ? '<div class="thumb">' + art + '</div>' : '') +
      '<div class="num">' + esc(num) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></a>';
  }

  /* ---------- Жизнь ---------- */
  var era = 'all';
  function life() {
    return '<div class="fade-in narrow" style="max-width:820px">' +
      '<div class="eyebrow">Хронология</div><h1>Жизнь Тоётоми Хидэёси</h1>' +
      '<p class="lead">Нажмите на событие, чтобы раскрыть историю и связанный с ней урок.</p>' +
      (window.DIAGRAMS ? '<figure class="diagram">' + DIAGRAMS.career + '</figure>' : '') +
      '<div class="era-filter">' + ERAS.map(function (e) {
        return '<button class="chip' + (e.id === era ? ' active' : '') + '" data-era="' + e.id + '">' + esc(e.name) + '</button>';
      }).join('') + '</div>' +
      '<div class="timeline">' + LIFE.map(function (ev, i) {
        if (era !== 'all' && ev.era !== era) return '';
        var l = lessonById(ev.lesson);
        return '<div class="t-item" id="ev' + i + '"><span class="t-dot"></span>' +
          '<button class="t-head" aria-expanded="false"><span class="t-year">' + esc(ev.year) + '</span><span class="t-title">' + esc(ev.title) + '</span><span class="t-arrow">›</span></button>' +
          '<div class="t-body"><div class="art">' + ART[ev.art] + '</div><div><div class="say-row">' + sayBtn('life:' + LIFE.indexOf(ev), 'Слушать') + '</div><p class="prose" style="font-size:1.05rem">' + esc(ev.text) + '</p>' +
          (l ? '<a class="lesson-link" href="#/lesson/' + l.id + '">Урок: ' + esc(l.title) + ' →</a>' : '') +
          (ev.sec && secretById(ev.sec) ? '<br><a class="lesson-link" href="#/chapter/' + secretById(ev.sec).ch + '/' + ev.sec + '">В книге: ' + esc(secretById(ev.sec).name) + ' →</a>' : '') +
          '</div></div></div>';
      }).join('') + '</div></div>';
  }
  function bindLife() {
    app.querySelectorAll('[data-era]').forEach(function (b) {
      b.addEventListener('click', function () { era = b.dataset.era; render(); });
    });
    app.querySelectorAll('.t-head').forEach(function (h) {
      h.addEventListener('click', function () {
        var open = h.parentNode.classList.toggle('open');
        h.setAttribute('aria-expanded', open);
      });
    });
  }

  /* ---------- Комикс ---------- */
  function comicById(id) { return COMIC.find(function (e) { return e.id === id; }); }
  function comicList() {
    return '<div class="fade-in"><div class="eyebrow">Манхва по мотивам книги</div><h1>Комикс</h1>' +
      '<p class="lead">' + COMIC.length + ' эпизодов из жизни Хидэёси: картинки, реплики и подробный пересказ каждого момента.</p>' +
      '<div class="grid">' + COMIC.map(function (e, i) {
        return '<a class="card" href="#/comic/' + e.id + '"><div class="thumb comic-thumb">' + Comic.render(e.panels[0], true) + '</div>' +
          '<div class="num">' + (i + 1) + ' · ' + esc(e.year) + '</div><h3>' + esc(e.title) + '</h3><p>' + esc(e.intro) + '</p></a>';
      }).join('') + '</div></div>';
  }
  function comicEpisode(id) {
    var e = comicById(id);
    if (!e) return notFound();
    var i = COMIC.indexOf(e), prev = COMIC[i - 1], next = COMIC[i + 1], l = lessonById(e.lesson);
    return '<article class="fade-in comic-page">' +
      '<a href="#/comic" class="muted">← Все эпизоды</a>' +
      '<div class="eyebrow" style="margin-top:20px">Эпизод ' + (i + 1) + ' · ' + esc(e.year) + '</div>' +
      '<h1>' + esc(e.title) + '</h1><p class="lead">' + esc(e.intro) + '</p>' +
      '<div class="strip">' + e.panels.map(function (p, k) {
        return '<figure class="panel' + (e.panels.length % 2 && k === 0 ? ' span2' : '') + '">' + Comic.render(p) +
          '<figcaption><b>' + (k + 1) + '.</b> ' + esc(p.cap) + '</figcaption></figure>';
      }).join('') + '</div>' +
      '<p class="muted comic-note">Реплики и сцены придуманы для иллюстрации; события и преданья переданы по историческим источникам.</p>' +
      '<div class="narrow prose"><h2>Подробно</h2><div class="say-row">' + sayBtn('comic:' + e.id, 'Слушать') + '</div>' + e.detail.map(function (d) { return '<p>' + esc(d) + '</p>'; }).join('') +
      (l ? '<div class="box"><h3>Урок</h3><p style="margin:0"><a href="#/lesson/' + l.id + '">' + esc(l.title) + '</a> — ' + esc(l.summary) + '</p></div>' : '') +
      '</div>' +
      '<nav class="pager">' +
        (prev ? '<a href="#/comic/' + prev.id + '"><small>← Назад</small>' + esc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a href="#/comic/' + next.id + '" style="text-align:right"><small>Далее →</small>' + esc(next.title) + '</a>' : '<a href="#/lessons" style="text-align:right"><small>Дальше →</small>Уроки</a>') +
      '</nav></article>';
  }

  /* ---------- Уроки ---------- */
  function lessons() {
    var read = readSet(), parts = [];
    LESSONS.forEach(function (l) { if (parts.indexOf(l.part) < 0) parts.push(l.part); });
    return '<div class="fade-in"><div class="eyebrow">Уроки по темам</div><h1>Путь без меча</h1>' +
      '<p class="lead">Пройдено ' + read.length + ' из ' + LESSONS.length + '.</p>' +
      parts.map(function (p) {
        return '<section><h2>' + esc(p) + '</h2><div class="grid">' +
          LESSONS.filter(function (l) { return l.part === p; }).map(function (l) {
            var n = LESSONS.indexOf(l) + 1;
            return '<a class="card" href="#/lesson/' + l.id + '"><div class="thumb">' + ART[l.art] + '</div>' +
              (read.indexOf(l.id) >= 0 ? '<span class="done">✓ пройден</span>' : '') +
              '<div class="num">Урок ' + n + '</div><h3>' + esc(l.title) + '</h3><p>' + esc(l.summary) + '</p></a>';
          }).join('') + '</div></section>';
      }).join('') + '</div>';
  }

  function lesson(id) {
    var l = lessonById(id);
    if (!l) return notFound();
    var i = LESSONS.indexOf(l), prev = LESSONS[i - 1], next = LESSONS[i + 1];
    var read = readSet().indexOf(id) >= 0;
    var events = LIFE.filter(function (e) { return e.lesson === id; });
    return '<article class="fade-in narrow">' +
      '<a href="#/lessons" class="muted">← Все уроки</a>' +
      '<div class="eyebrow" style="margin-top:20px">Урок ' + (i + 1) + ' · ' + esc(l.part) + '</div>' +
      '<h1>' + esc(l.title) + '</h1><p class="lead">' + esc(l.summary) + '</p>' +
      '<div class="say-row">' + sayBtn('lesson:' + l.id, 'Слушать урок') + '</div>' +
      '<div class="lesson-hero">' + ART[l.art] + '</div>' +
      '<div class="prose">' +
        '<h2>История</h2><p>' + esc(l.story) + '</p>' +
        '<h2>Принцип</h2><ul>' + l.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
        '<div class="box"><h3>Применить сегодня</h3><ul>' + l.apply.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="box reflect"><h3>Вопрос для размышления</h3><p style="font-family:var(--serif);font-size:1.15rem;margin:0">' + esc(l.reflect) + '</p>' +
          '<textarea id="reflectNote" placeholder="Ваш ответ сохранится в заметках…" style="margin-top:12px">' + esc(Store.get('reflect-' + id, '')) + '</textarea></div>' +
        (events.length ? '<h2>В хронологии</h2><ul>' + events.map(function (e) {
          return '<li><a href="#/life">' + esc(e.year) + ' — ' + esc(e.title) + '</a></li>';
        }).join('') + '</ul>' : '') +
        '<label class="check"><input type="checkbox" id="readChk"' + (read ? ' checked' : '') + '> Урок пройден</label>' +
      '</div>' +
      '<nav class="pager">' +
        (prev ? '<a href="#/lesson/' + prev.id + '"><small>← Назад</small>' + esc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a href="#/lesson/' + next.id + '" style="text-align:right"><small>Далее →</small>' + esc(next.title) + '</a>' : '<a href="#/quiz" style="text-align:right"><small>Финал →</small>Пройти тест</a>') +
      '</nav></article>';
  }
  function bindLesson(id) {
    var chk = document.getElementById('readChk');
    chk.addEventListener('change', function () {
      var r = readSet().filter(function (x) { return x !== id; });
      if (chk.checked) r.push(id);
      Store.set('read', r);
    });
    var ta = document.getElementById('reflectNote'), t;
    ta.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { Store.set('reflect-' + id, ta.value); }, 300);
    });
  }

  /* ---------- Книга по главам ---------- */
  var CH = window.CHAPTERS || [];
  var SECRETS = [];
  CH.forEach(function (c) { (c.secrets || []).forEach(function (s) { SECRETS.push(Object.assign({ ch: c.n }, s)); }); });
  function secretById(id) { return SECRETS.find(function (s) { return s.id === id; }); }
  function studied() { return Store.get('secrets', []); }
  function chLabel(n) { return n === 0 ? 'Вступление' : 'Глава ' + n; }
  function meter(done, total) {
    return '<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><div style="width:' + (total ? done / total * 100 : 0) + '%"></div></div>';
  }

  function bookView() {
    var st = studied();
    return '<div class="fade-in">' +
      '<div class="eyebrow">Книга по главам</div><h1>Самурай без меча</h1>' +
      '<p class="lead">' + (CH.length - 1) + ' глав и ' + SECRETS.length + ' «секретов» Хидэёси — каждый с эпизодом из книги, сутью и практикой. Пересказ своими словами, без текста книги.</p>' +
      '<div class="book-progress"><span>Изучено секретов: <b>' + st.length + '</b> из ' + SECRETS.length + '</span>' + meter(st.length, SECRETS.length) + '</div>' +
      '<div class="btn-row"><a class="btn primary" href="#/chapter/' + (st.length ? nextChapter() : 0) + '">' + (st.length ? 'Продолжить' : 'Начать со вступления') + '</a>' +
        '<a class="btn" href="#/cards">Карточки секретов</a><a class="btn" href="#/people">Люди</a><a class="btn" href="#/era">Эпоха</a></div>' +
      '<section class="ch-list">' + CH.map(function (c) {
        var ids = (c.secrets || []).map(function (s) { return s.id; });
        var d = ids.filter(function (id) { return st.indexOf(id) >= 0; }).length;
        return '<a class="ch-row card" href="#/chapter/' + c.n + '"><div class="ch-art">' + ART[c.art] + '</div><div class="ch-body">' +
          '<div class="num">' + chLabel(c.n) + (ids.length ? ' · ' + d + '/' + ids.length : '') + '</div><h3>' + esc(c.title) + '</h3><p>' + esc(c.sub) + '</p>' +
          (ids.length ? meter(d, ids.length) : '') + '</div></a>';
      }).join('') + '</section>' +
      '<section><div class="eyebrow">Шпаргалка</div><h2>Все секреты одним списком</h2><div class="cheat">' +
        CH.filter(function (c) { return c.secrets; }).map(function (c) {
          return '<div class="cheat-ch"><h3><a href="#/chapter/' + c.n + '">' + c.n + '. ' + esc(c.title) + '</a></h3><ul>' + c.secrets.map(function (s) {
            return '<li class="' + (st.indexOf(s.id) >= 0 ? 'is-done' : '') + '"><a href="#/chapter/' + c.n + '/' + s.id + '"><b>' + esc(s.name) + '</b></a> — ' + esc(s.rule) + '</li>';
          }).join('') + '</ul></div>';
        }).join('') + '</div></section></div>';
  }
  function nextChapter() {
    var st = studied();
    var c = CH.find(function (c) { return c.secrets && c.secrets.some(function (s) { return st.indexOf(s.id) < 0; }); });
    return c ? c.n : 0;
  }

  function secretBody(s) {
    var x = (window.SX || {})[s.id], D = window.DIAGRAMS || {}, h = '';
    if (x) {
      h += '<div class="facts-row">' + x.f.map(function (f) { return '<div class="fx"><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></div>'; }).join('') + '</div>' +
        '<div class="sx"><div class="sx-label">Ситуация</div><p>' + esc(x.sit) + '</p></div>' +
        '<div class="sx"><div class="sx-label">Что он сделал</div><ol class="steps">' + x.do.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ol></div>' +
        (x.viz && D[x.viz] ? '<figure class="diagram">' + D[x.viz] + '</figure>' : '') +
        '<div class="sx result"><div class="sx-label">Итог</div><p>' + esc(x.res) + '</p></div>';
    }
    h += '<details class="more"' + (x ? '' : ' open') + '><summary>Полная история' + (x ? ' · ' + s.story.length + ' абз.' : '') + '</summary><div class="more-body">' + sayBtn('secretfull:' + s.id, 'Слушать полностью') +
      s.story.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div></details>';
    return h;
  }
  function chapterView(n, openId) {
    var c = CH.find(function (x) { return x.n === n; });
    if (!c) return notFound();
    var i = CH.indexOf(c), prev = CH[i - 1], next = CH[i + 1], st = studied();
    var html = '<article class="fade-in narrow chapter">' +
      '<a href="#/book" class="muted">← Все главы</a>' +
      '<div class="eyebrow" style="margin-top:20px">' + chLabel(c.n) + (c.n ? ' из ' + (CH.length - 1) : '') + '</div>' +
      '<h1>' + esc(c.title) + '</h1><p class="lead">' + esc(c.sub) + '</p>' +
      '<div class="say-row">' + sayBtn('chapter:' + c.n, 'Слушать главу') + '</div>' +
      '<div class="lesson-hero">' + ART[c.art] + '</div>' +
      ((window.TLDR || {})[c.n] ? '<div class="tldr"><div class="sx-label">Главное за 30 секунд</div><ul>' + TLDR[c.n].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="prose ch-prose">' + c.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      (c.sections || []).map(function (s) { return '<h2>' + esc(s.h) + '</h2>' + s.p.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); }).join('') +
      (c.note ? '<div class="box"><h3>Как читать</h3><p style="margin:0">' + esc(c.note) + '</p></div>' : '') +
      (c.n === 0 && window.DIAGRAMS ? '<h2>Где всё происходило</h2><figure class="diagram">' + DIAGRAMS.japan + '</figure><p><a href="#/era">Эпоха: кто есть кто в феодальной Японии →</a></p>' : '') +
      '</div>';
    if (c.secrets) {
      html += '<h2 class="secrets-h">Секреты главы</h2><div class="secrets">' + c.secrets.map(function (s, k) {
        var done = st.indexOf(s.id) >= 0;
        return '<details class="secret' + (done ? ' is-done' : '') + '" id="s-' + s.id + '"' + (s.id === openId ? ' open' : '') + '>' +
          '<summary><span class="s-num">' + (k + 1) + '</span><span class="s-head"><span class="s-name">' + esc(s.name) + '</span><span class="s-rule">' + esc(s.rule) + '</span></span>' + sayBtn('secret:' + s.id) + '<span class="s-mark" aria-hidden="true">' + (done ? '✓' : '›') + '</span></summary>' +
          '<div class="s-body">' + secretBody(s) +
            '<div class="box key"><h3>Суть</h3><p>' + esc(s.key) + '</p></div>' +
            '<div class="box reflect"><h3>Попробуй</h3><p style="margin:0">' + esc(s.try) + '</p></div>' +
            (s.note ? '<p class="s-note">' + esc(s.note) + '</p>' : '') +
            '<div class="s-actions"><label class="check"><input type="checkbox" data-secret="' + s.id + '"' + (done ? ' checked' : '') + '> Изучено</label>' +
            '<button class="btn small" data-find="' + esc(s.name.toLowerCase()) + '">Найти в своём экземпляре</button></div>' +
          '</div></details>';
      }).join('') + '</div>';
    }
    if (c.outro) html += '<div class="prose ch-prose"><h2>' + esc(c.outro.h) + '</h2><p>' + esc(c.outro.p) + '</p></div>';
    if (c.reflect) html += '<div class="box reflect"><h3>Вопрос к главе</h3><p style="font-family:var(--serif);font-size:1.15rem;margin:0">' + esc(c.reflect) + '</p>' +
      '<textarea id="chReflect" placeholder="Ваш ответ сохранится в заметках…" style="margin-top:12px">' + esc(Store.get('reflect-ch-' + c.n, '')) + '</textarea></div>';
    html += '<nav class="pager">' +
      (prev ? '<a href="#/chapter/' + prev.n + '"><small>← ' + chLabel(prev.n) + '</small>' + esc(prev.title) + '</a>' : '<a href="#/book"><small>← Назад</small>Оглавление</a>') +
      (next ? '<a href="#/chapter/' + next.n + '" style="text-align:right"><small>' + chLabel(next.n) + ' →</small>' + esc(next.title) + '</a>' : '<a href="#/cards" style="text-align:right"><small>Закрепить →</small>Карточки секретов</a>') +
      '</nav></article>';
    return html;
  }
  function bindChapter(n, openId) {
    app.querySelectorAll('[data-secret]').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var id = chk.dataset.secret, r = studied().filter(function (x) { return x !== id; });
        if (chk.checked) r.push(id);
        Store.set('secrets', r);
        var d = chk.closest('.secret');
        d.classList.toggle('is-done', chk.checked);
        d.querySelector('.s-mark').textContent = chk.checked ? '✓' : '›';
      });
    });
    app.querySelectorAll('[data-find]').forEach(function (b) {
      b.addEventListener('click', function () { Store.set('search', b.dataset.find); location.hash = '#/reader'; });
    });
    var ta = document.getElementById('chReflect'), t;
    if (ta) ta.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { Store.set('reflect-ch-' + n, ta.value); }, 300);
    });
    if (openId) {
      var el = document.getElementById('s-' + openId);
      if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); scrollBy(0, -80); }, 30);
    }
  }

  /* ---------- Карточки ---------- */
  var deck = null;
  function newDeck(onlyNew) {
    var known = Store.get('known', []);
    var list = SECRETS.map(function (s, i) { return i; }).filter(function (i) { return !onlyNew || known.indexOf(SECRETS[i].id) < 0; });
    for (var k = list.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), x = list[k]; list[k] = list[j]; list[j] = x; }
    return { list: list, i: 0, flip: false, onlyNew: onlyNew };
  }
  function cardsView() {
    if (!deck) deck = newDeck(false);
    var known = Store.get('known', []);
    var head = '<div class="fade-in q-card"><div class="eyebrow">Повторение</div><h1>Карточки секретов</h1>' +
      '<p class="lead">Вспомни правило по названию секрета, переверни карточку и честно отметь, знаешь ли ты его.</p>' +
      '<div class="book-progress"><span>Знаю: <b>' + known.length + '</b> из ' + SECRETS.length + '</span>' + meter(known.length, SECRETS.length) + '</div>' +
      '<div class="era-filter"><button class="chip' + (!deck.onlyNew ? ' active' : '') + '" data-deck="all">Все карточки</button>' +
      '<button class="chip' + (deck.onlyNew ? ' active' : '') + '" data-deck="new">Только незнакомые</button>' +
      (known.length ? '<button class="chip" data-deck="reset">Сбросить отметки</button>' : '') + '</div>';
    if (deck.i >= deck.list.length) {
      return head + '<div class="card flash done-card"><div style="max-width:140px;margin:0 auto;color:var(--ink)">' + ART.enso + '</div>' +
        '<h2>' + (deck.list.length ? 'Колода пройдена' : 'Все секреты отмечены как знакомые') + '</h2>' +
        '<div class="btn-row" style="justify-content:center"><button class="btn primary" data-deck="' + (deck.onlyNew ? 'new' : 'all') + '">Перемешать снова</button><a class="btn" href="#/quiz">Пройти тест</a></div></div></div>';
    }
    var s = SECRETS[deck.list[deck.i]];
    return head + '<div class="q-meta" style="margin-top:20px"><span>Карточка ' + (deck.i + 1) + ' из ' + deck.list.length + '</span><span>' + chLabel(s.ch) + '</span></div>' +
      '<button class="card flash' + (deck.flip ? ' flipped' : '') + '" id="flash" aria-live="polite">' +
        (deck.flip
          ? '<div class="num">' + esc(s.name) + '</div><div class="flash-rule">' + esc(s.rule) + '</div><p class="muted">' + esc(s.key) + '</p>'
          : '<div class="num">' + chLabel(s.ch) + '</div><div class="flash-rule">' + esc(s.name) + '</div><p class="muted">Как звучит это правило? Нажмите, чтобы перевернуть</p>') +
      '</button>' +
      (deck.flip
        ? '<div class="btn-row" style="justify-content:center"><button class="btn" id="fAgain">Повторить позже</button><button class="btn primary" id="fKnow">Знаю ✓</button></div>' +
          '<p style="text-align:center"><a href="#/chapter/' + s.ch + '/' + s.id + '">Открыть эпизод в главе →</a></p>'
        : '') + '</div>';
  }
  function bindCards() {
    app.querySelectorAll('[data-deck]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.deck === 'reset') { if (!confirm('Сбросить все отметки «знаю»?')) return; Store.set('known', []); deck = newDeck(false); }
        else deck = newDeck(b.dataset.deck === 'new');
        render(true);
      });
    });
    var f = document.getElementById('flash');
    if (f) f.addEventListener('click', function () { deck.flip = !deck.flip; render(true); });
    function step(knowIt) {
      var id = SECRETS[deck.list[deck.i]].id, k = Store.get('known', []).filter(function (x) { return x !== id; });
      if (knowIt) k.push(id); else deck.list.push(deck.list[deck.i]);
      Store.set('known', k); deck.i++; deck.flip = false; render(true);
    }
    var a = document.getElementById('fAgain'), kn = document.getElementById('fKnow');
    if (a) a.addEventListener('click', function () { step(false); });
    if (kn) kn.addEventListener('click', function () { step(true); });
  }

  /* ---------- Люди ---------- */
  var pg = 'all';
  function peopleView() {
    var P = window.PEOPLE || [];
    return '<div class="fade-in"><div class="eyebrow">Действующие лица</div><h1>Люди Хидэёси</h1>' +
      '<p class="lead">' + P.length + ' человек, без которых не было бы этой истории, — какими их показывает книга.</p>' +
      '<div class="era-filter">' + PEOPLE_GROUPS.map(function (g) {
        var cnt = g.id === 'all' ? P.length : P.filter(function (p) { return p.g === g.id; }).length;
        return '<button class="chip' + (g.id === pg ? ' active' : '') + '" data-pg="' + g.id + '">' + esc(g.name) + ' · ' + cnt + '</button>';
      }).join('') + '</div>' +
      '<div class="grid people" style="margin-top:20px">' + P.filter(function (p) { return pg === 'all' || p.g === pg; }).map(function (p) {
        return '<div class="card person"><div class="p-top"><span class="p-mark" aria-hidden="true">' + p.mark + '</span><div><h3>' + esc(p.name) + '</h3><div class="num">' + esc(p.role) + '</div></div>' + sayBtn('person:' + p.id) + '</div>' +
          '<p>' + esc(p.t) + '</p><div class="p-links">' + p.s.map(function (id) {
            var s = secretById(id);
            return s ? '<a class="tag" href="#/chapter/' + s.ch + '/' + s.id + '">' + esc(s.name) + '</a>' : '';
          }).join('') + '</div></div>';
      }).join('') + '</div></div>';
  }
  function bindPeople() {
    app.querySelectorAll('[data-pg]').forEach(function (b) {
      b.addEventListener('click', function () { pg = b.dataset.pg; render(true); });
    });
  }

  /* ---------- Эпоха ---------- */
  function eraView() {
    var E = window.ERA;
    return '<div class="fade-in narrow" style="max-width:820px"><div class="eyebrow">Контекст</div><h1>Эпоха сражающихся провинций</h1>' +
      '<p class="lead">Чтобы понять, насколько невероятен путь Хидэёси, нужно увидеть лестницу, по которой он поднимался — с самой нижней ступени.</p>' +
      '<h2>Социальная лестница</h2><p class="muted">Нажмите на ступень, чтобы узнать подробнее.</p>' +
      '<div class="ladder">' + E.ladder.map(function (l, i) {
        return '<button class="rung" style="--w:' + (46 + i * 9) + '%" data-rung="' + i + '"' + (i === E.ladder.length - 1 ? ' aria-current="true"' : '') + '><b>' + esc(l.name) + '</b><span>' + esc(l.jp) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="box" id="rungInfo" aria-live="polite"><h3>' + esc(E.ladder[E.ladder.length - 1].name) + '</h3><p style="margin:0">' + esc(E.ladder[E.ladder.length - 1].t) + '</p></div>' +
      '<p class="prose">Хидэёси прошёл этот путь почти целиком: от безымянного крестьянина — к самураю, генералу, даймё и регенту императора, второму человеку после самого тэнно.</p>' +
      (window.DIAGRAMS ? '<h2>Карта событий</h2><figure class="diagram">' + DIAGRAMS.japan + '</figure>' : '') +
      '<h2>Краткая история самураев</h2><div class="timeline">' + E.history.map(function (h) {
        return '<div class="t-item open"><span class="t-dot"></span><div class="t-head" style="cursor:default"><span class="t-year">' + esc(h.y) + '</span><span class="t-title" style="font-weight:400">' + esc(h.t) + '</span></div></div>';
      }).join('') + '</div>' +
      '<div class="btn-row"><a class="btn primary" href="#/chapter/0">Вступление к книге</a><a class="btn" href="#/life">Хронология жизни Хидэёси</a></div></div>';
  }
  function bindEra() {
    var info = document.getElementById('rungInfo');
    app.querySelectorAll('[data-rung]').forEach(function (b) {
      b.addEventListener('click', function () {
        var l = window.ERA.ladder[+b.dataset.rung];
        app.querySelectorAll('[data-rung]').forEach(function (x) { x.removeAttribute('aria-current'); });
        b.setAttribute('aria-current', 'true');
        info.innerHTML = '<h3>' + esc(l.name) + '</h3><p style="margin:0">' + esc(l.t) + '</p>';
      });
    });
  }

  /* ---------- Тест ---------- */
  var quiz = null;
  var QMODES = [
    { id: 'quick', name: 'Быстрый', d: '10 случайных вопросов' },
    { id: 'book', name: 'По главам книги', d: 'вопросы о секретах и эпизодах' },
    { id: 'life', name: 'По жизни Хидэёси', d: 'события и уроки' },
    { id: 'all', name: 'Полный', d: 'все вопросы подряд' }
  ];
  function quizList(mode) {
    var all = QUIZ.map(function (q, i) { return i; });
    if (mode === 'book') return all.filter(function (i) { return QUIZ[i].ch; });
    if (mode === 'life') return all.filter(function (i) { return !QUIZ[i].ch; });
    if (mode === 'quick') {
      for (var k = all.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), x = all[k]; all[k] = all[j]; all[j] = x; }
      return all.slice(0, 10);
    }
    return all;
  }
  function quizView() {
    if (!quiz) {
      return '<div class="fade-in q-card"><div class="eyebrow">Проверь себя</div><h1>Тест</h1><p class="lead">Выберите режим — всего ' + QUIZ.length + ' вопросов.</p>' +
        '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">' + QMODES.map(function (m) {
          var n = quizList(m.id).length, best = Store.get('best-' + m.id, null);
          return '<button class="card mode" data-mode="' + m.id + '"><div class="num">' + n + ' вопр.</div><h3>' + esc(m.name) + '</h3><p>' + esc(m.d) + (best != null ? ' · лучший: ' + best + '/' + n : '') + '</p></button>';
        }).join('') + '</div></div>';
    }
    var total = quiz.list.length;
    if (quiz.i >= total) {
      var best = Math.max(Store.get('best-' + quiz.mode, 0), quiz.score);
      Store.set('best-' + quiz.mode, best);
      var pct = quiz.score / total;
      var verdict = pct >= .9 ? 'Достойно кампаку!' : pct >= .6 ? 'Хороший путь — ещё немного практики.' : 'Носильщик сандалий тоже когда-то начинал. Перечитайте уроки!';
      return '<div class="fade-in q-card card" style="text-align:center"><div style="max-width:200px;margin:0 auto;color:var(--ink)">' + ART.enso + '</div>' +
        '<h2>' + quiz.score + ' из ' + total + '</h2><p class="lead">' + verdict + '</p><p class="muted">Лучший результат: ' + best + '</p>' +
        '<div class="btn-row" style="justify-content:center"><button class="btn primary" id="qRestart">Пройти снова</button><button class="btn" id="qModes">Другой режим</button><a class="btn" href="#/book">К главам</a></div></div>';
    }
    var q = QUIZ[quiz.list[quiz.i]];
    return '<div class="fade-in q-card"><div class="eyebrow">Проверь себя</div>' +
      '<div class="card"><div class="q-meta"><span>Вопрос ' + (quiz.i + 1) + ' из ' + total + '</span><span>Счёт: ' + quiz.score + '</span></div>' +
      '<div class="q-text">' + esc(q.q) + '</div><div class="opts">' +
      q.o.map(function (o, k) {
        var cls = '';
        if (quiz.answered) { if (k === q.a) cls = ' right'; else if (k === quiz.picked) cls = ' wrong'; }
        return '<button class="opt' + cls + '" data-k="' + k + '"' + (quiz.answered ? ' disabled' : '') + '>' + esc(o) + '</button>';
      }).join('') + '</div>' +
      (quiz.answered ? '<div class="explain box">' + esc(q.e) + (q.ch ? ' <a href="#/chapter/' + q.ch + '">Глава ' + q.ch + ' →</a>' : '') + '</div><div class="btn-row"><button class="btn primary" id="qNext">' + (quiz.i + 1 < total ? 'Следующий вопрос' : 'Результат') + '</button></div>' : '') +
      '</div></div>';
  }
  function bindQuiz() {
    app.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        quiz = { mode: b.dataset.mode, list: quizList(b.dataset.mode), i: 0, score: 0, answered: false, picked: -1 };
        render(true);
      });
    });
    app.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        quiz.picked = +b.dataset.k; quiz.answered = true;
        if (quiz.picked === QUIZ[quiz.list[quiz.i]].a) quiz.score++;
        render(true);
      });
    });
    var n = document.getElementById('qNext');
    if (n) n.addEventListener('click', function () { quiz.i++; quiz.answered = false; quiz.picked = -1; render(true); });
    var r = document.getElementById('qRestart');
    if (r) r.addEventListener('click', function () { var m = quiz.mode; quiz = { mode: m, list: quizList(m), i: 0, score: 0, answered: false, picked: -1 }; render(true); });
    var qm = document.getElementById('qModes');
    if (qm) qm.addEventListener('click', function () { quiz = null; render(true); });
  }

  /* ---------- Заметки ---------- */
  function notes() {
    var list = Store.get('notes', []);
    var reflections = LESSONS.map(function (l) { return { l: l, v: Store.get('reflect-' + l.id, ''), href: '#/lesson/' + l.id }; })
      .concat(CH.filter(function (c) { return c.reflect; }).map(function (c) { return { l: { title: 'Глава ' + c.n + '. ' + c.title, reflect: c.reflect }, v: Store.get('reflect-ch-' + c.n, ''), href: '#/chapter/' + c.n }; }))
      .filter(function (x) { return x.v.trim(); });
    return '<div class="fade-in narrow"><div class="eyebrow">Личное</div><h1>Заметки</h1>' +
      '<p class="lead">Мысли и выводы хранятся только в этом браузере.</p>' +
      '<textarea id="noteText" placeholder="Что вы вынесли из прочитанного?"></textarea>' +
      '<div class="btn-row"><button class="btn primary" id="noteAdd">Сохранить заметку</button>' +
      (list.length || reflections.length ? '<button class="btn" id="noteExport">Скачать .txt</button>' : '') + '</div>' +
      '<section>' + (list.length ? list.slice().reverse().map(function (n) {
        return '<div class="card note"><div class="meta"><span>' + esc(new Date(n.d).toLocaleString('ru-RU')) + '</span><button class="link-btn" data-del="' + n.d + '">удалить</button></div><p>' + esc(n.t) + '</p></div>';
      }).join('') : '<p class="muted">Пока нет заметок.</p>') + '</section>' +
      (reflections.length ? '<section><h2>Ответы на вопросы уроков</h2>' + reflections.map(function (x) {
        return '<div class="card note"><div class="meta"><a href="' + x.href + '">' + esc(x.l.title) + '</a></div><p class="muted" style="font-style:italic;margin-bottom:6px">' + esc(x.l.reflect) + '</p><p>' + esc(x.v) + '</p></div>';
      }).join('') + '</section>' : '') + '</div>';
  }
  function bindNotes() {
    document.getElementById('noteAdd').addEventListener('click', function () {
      var t = document.getElementById('noteText').value.trim();
      if (!t) return;
      var l = Store.get('notes', []); l.push({ d: Date.now(), t: t }); Store.set('notes', l); render(true);
    });
    app.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.set('notes', Store.get('notes', []).filter(function (n) { return String(n.d) !== b.dataset.del; })); render(true);
      });
    });
    var ex = document.getElementById('noteExport');
    if (ex) ex.addEventListener('click', function () {
      var txt = 'Самурай без меча — мои заметки\n\n' + Store.get('notes', []).map(function (n) {
        return new Date(n.d).toLocaleString('ru-RU') + '\n' + n.t;
      }).join('\n\n') + '\n\n' + LESSONS.map(function (l) {
        var v = Store.get('reflect-' + l.id, ''); return v ? l.title + ' — ' + l.reflect + '\n' + v : '';
      }).concat(CH.map(function (c) {
        var v = Store.get('reflect-ch-' + c.n, ''); return v ? 'Глава ' + c.n + '. ' + c.title + ' — ' + c.reflect + '\n' + v : '';
      })).filter(Boolean).join('\n\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
      a.download = 'samurai-zametki.txt'; a.click();
    });
  }

  /* ---------- Читалка ---------- */
  var book = null, bookLoaded = false;
  function readerView(ch) {
    if (!bookLoaded) {
      Store.getBig('book').then(function (b) { book = b || null; bookLoaded = true; render(true); });
      return '<p class="muted">Загрузка…</p>';
    }
    if (!book) {
      return '<div class="fade-in narrow"><div class="eyebrow">Читалка</div><h1>Читать книгу</h1>' +
        '<p class="lead">Откройте свой экземпляр книги — PDF, FB2 или TXT. Приложение извлечёт текст и покажет его целиком, по главам, с удобным шрифтом и тёмной темой.</p>' +
        '<label class="drop" id="drop"><input type="file" id="file">' +
        '<div style="max-width:140px;margin:0 auto;color:var(--ink)">' + ART.scroll + '</div>' +
        '<p><b>Перетащите файл сюда</b> или нажмите, чтобы выбрать</p><p class="muted" style="margin:0">PDF, FB2 или TXT · файл обрабатывается только в вашем браузере, без интернета</p></label>' +
        '<p class="muted" style="font-size:.92rem">Загружать нужно один раз: книга сохраняется в этом браузере и открывается сразу при следующих визитах. Не сохранится в режиме инкогнито или после очистки данных сайта.</p>' +
        '<p id="readerErr" class="muted" role="alert"></p></div>';
    }
    var i = Math.max(0, Math.min(book.chapters.length - 1, ch == null ? Store.get('chapter', 0) : ch));
    Store.set('chapter', i);
    var c = book.chapters[i], q = Store.get('search', '');
    return '<div class="fade-in"><div class="reader-tools">' +
        '<button class="btn small toc-toggle" id="tocBtn">Оглавление</button>' +
        '<span class="muted" style="font-size:.9rem">Китами Масао · ' + esc(book.title) + ' · ' + book.chapters.length + ' гл. · ' + book.words.toLocaleString('ru-RU') + ' слов</span>' +
        '<span class="spacer"></span>' +
        '<button class="btn small" id="fMinus" aria-label="Уменьшить шрифт">A−</button><button class="btn small" id="fPlus" aria-label="Увеличить шрифт">A+</button>' +
        '<button class="btn small" id="lMinus" aria-label="Уменьшить интервал">↕−</button><button class="btn small" id="lPlus" aria-label="Увеличить интервал">↕+</button>' +
        '<button class="btn small" id="bookClose">Другой файл</button>' +
      '</div>' +
      '<input type="search" id="search" placeholder="Поиск по книге…" value="' + esc(q) + '"><div class="search-results" id="results"></div>' +
      '<div class="reader"><nav class="toc" id="toc">' + book.chapters.map(function (x, k) {
        return '<a href="#/reader/' + k + '" class="' + (k === i ? 'active ' : '') + (x.level > 1 ? 'lvl2' : '') + '">' + esc(x.title) + '</a>';
      }).join('') + '</nav>' +
      '<article class="reader-text"><div class="eyebrow">Глава ' + (i + 1) + ' из ' + book.chapters.length + '</div><h2>' + esc(c.title) + '</h2>' +
        c.blocks.map(function (b) {
          var t = hl(b.text, q);
          return b.t === 'h' ? '<h3>' + t + '</h3>' : '<p' + (b.t === 'epi' ? ' class="epigraph"' : '') + '>' + t + '</p>';
        }).join('') +
        '<nav class="pager" style="font-family:var(--sans);font-size:1rem">' +
          (i > 0 ? '<a href="#/reader/' + (i - 1) + '"><small>← Назад</small>' + esc(book.chapters[i - 1].title) + '</a>' : '<span></span>') +
          (i < book.chapters.length - 1 ? '<a href="#/reader/' + (i + 1) + '" style="text-align:right"><small>Далее →</small>' + esc(book.chapters[i + 1].title) + '</a>' : '<span></span>') +
        '</nav></article></div></div>';
  }
  function hl(text, q) {
    var e = esc(text);
    if (!q || q.length < 3) return e;
    var re = new RegExp('(' + esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return e.replace(re, '<mark>$1</mark>');
  }
  function bindReader() {
    document.documentElement.style.setProperty('--reader-size', Store.get('fontSize', 19) + 'px');
    var file = document.getElementById('file');
    if (file) {
      var drop = document.getElementById('drop'), err = document.getElementById('readerErr');
      var load = function (f) {
        if (!f) return;
        err.textContent = 'Обработка файла «' + f.name + '»…';
        var fail = function (e) {
          err.textContent = 'Ошибка: ' + ((e && (e.message || e.name)) || String(e)) + '. Попробуйте другой браузер (Chrome, Safari) или пришлите этот текст ошибки.';
        };
        try {
          Reader.parseFile(f, function (m) { err.textContent = 'Обработка: ' + m + '…'; }).then(function (b) {
            book = b; bookLoaded = true; Store.setBig('book', b); Store.set('chapter', 0);
            try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
            if (location.hash === '#/reader/0') render(true); else location.hash = '#/reader/0';
          }).catch(fail);
        } catch (e) { fail(e); }
      };
      file.addEventListener('change', function () { load(file.files[0]); });
      ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { e.preventDefault(); load(e.dataTransfer.files[0]); });
      return;
    }
    function font(d) {
      var s = Math.max(14, Math.min(28, Store.get('fontSize', 19) + d));
      Store.set('fontSize', s); document.documentElement.style.setProperty('--reader-size', s + 'px');
    }
    document.documentElement.style.setProperty('--reader-lh', Store.get('lineHeight', 1.6));
    function lh(d) {
      var v = Math.round(Math.max(1.3, Math.min(2.1, Store.get('lineHeight', 1.6) + d)) * 100) / 100;
      Store.set('lineHeight', v); document.documentElement.style.setProperty('--reader-lh', v);
    }
    document.getElementById('lMinus').addEventListener('click', function () { lh(-0.1); });
    document.getElementById('lPlus').addEventListener('click', function () { lh(0.1); });
    document.getElementById('fMinus').addEventListener('click', function () { font(-1); });
    document.getElementById('fPlus').addEventListener('click', function () { font(1); });
    document.getElementById('tocBtn').addEventListener('click', function () { document.getElementById('toc').classList.toggle('open'); });
    document.getElementById('bookClose').addEventListener('click', function () {
      if (!confirm('Убрать загруженную книгу из браузера?')) return;
      book = null; Store.delBig('book'); render(true);
    });
    var s = document.getElementById('search'), res = document.getElementById('results'), t;
    function find() {
      var q = s.value.trim(); Store.set('search', q);
      if (q.length < 3) { res.innerHTML = ''; return; }
      var ql = q.toLowerCase(), out = [];
      book.chapters.forEach(function (c, k) {
        c.blocks.forEach(function (b) {
          var p = b.text.toLowerCase().indexOf(ql);
          if (p >= 0 && out.length < 30) {
            var frag = b.text.slice(Math.max(0, p - 60), p + q.length + 60);
            out.push('<a href="#/reader/' + k + '"><small>' + esc(c.title) + '</small><br>…' + hl(frag, q) + '…</a>');
          }
        });
      });
      res.innerHTML = out.length ? out.join('') + (out.length === 30 ? '<p class="muted">Показаны первые 30 совпадений.</p>' : '') : '<p class="muted">Ничего не найдено.</p>';
    }
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(find, 250); });
    if (s.value) find();
  }

  function notFound() {
    return '<div class="narrow"><h1>Страница не найдена</h1><p><a href="#/">На главную</a></p></div>';
  }

  /* ---------- Роутер ---------- */
  function render(keepScroll) {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var r = parts[0] || 'home', html, bind;
    switch (r) {
      case 'home': html = home(); break;
      case 'life': html = life(); bind = bindLife; break;
      case 'comic': html = parts[1] ? comicEpisode(parts[1]) : comicList(); break;
      case 'lessons': html = lessons(); break;
      case 'lesson': html = lesson(parts[1]); if (lessonById(parts[1])) bind = function () { bindLesson(parts[1]); }; break;
      case 'book': html = bookView(); break;
      case 'chapter': html = chapterView(+parts[1] || 0, parts[2]); bind = function () { bindChapter(+parts[1] || 0, parts[2]); }; break;
      case 'cards': html = cardsView(); bind = bindCards; break;
      case 'people': html = peopleView(); bind = bindPeople; break;
      case 'era': html = eraView(); bind = bindEra; break;
      case 'quiz': html = quizView(); bind = bindQuiz; break;
      case 'notes': html = notes(); bind = bindNotes; break;
      case 'reader': html = readerView(parts[1] != null && parts[1] !== '' ? +parts[1] : null); if (bookLoaded) bind = bindReader; break;
      default: html = notFound();
    }
    app.innerHTML = html;
    if (bind) bind();
    var navKey = r === 'lesson' ? 'lessons' : (r === 'chapter' || r === 'cards' || r === 'era') ? 'book' : r;
    nav.querySelectorAll('a').forEach(function (a) { a.classList.toggle('active', a.dataset.route === navKey); });
    nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    if (!keepScroll && !(r === 'chapter' && parts[2])) { scrollTo(0, 0); app.focus({ preventScroll: true }); }
    var titles = { book: 'Книга', cards: 'Карточки', people: 'Люди', era: 'Эпоха', comic: 'Комикс', life: 'Жизнь', lessons: 'Уроки', quiz: 'Тест', notes: 'Заметки', reader: 'Читать' };
    var l = r === 'lesson' && lessonById(parts[1]);
    var cc = r === 'chapter' && CH.find(function (x) { return x.n === (+parts[1] || 0); });
    if (cc) l = cc;
    document.title = (l ? l.title + ' · ' : titles[r] ? titles[r] + ' · ' : '') + 'Самурай без меча';
  }
  addEventListener('hashchange', function () { render(); });
  render();
})();
