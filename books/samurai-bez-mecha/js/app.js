/* SPA: маршрутизация по hash и отрисовка разделов. */
(function () {
  var app = document.getElementById('app');
  var ART = window.ART, LESSONS = window.LESSONS, LIFE = window.LIFE;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
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
    var reading = location.hash.indexOf('#/reader') === 0 || location.hash.indexOf('#/lesson/') === 0 || location.hash.indexOf('#/comic/') === 0;
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
          '<a class="btn primary" href="#/lessons">' + (done ? 'Продолжить уроки (' + done + '/' + LESSONS.length + ')' : 'Начать с уроков') + '</a>' +
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
      '<div class="era-filter">' + ERAS.map(function (e) {
        return '<button class="chip' + (e.id === era ? ' active' : '') + '" data-era="' + e.id + '">' + esc(e.name) + '</button>';
      }).join('') + '</div>' +
      '<div class="timeline">' + LIFE.map(function (ev, i) {
        if (era !== 'all' && ev.era !== era) return '';
        var l = lessonById(ev.lesson);
        return '<div class="t-item" id="ev' + i + '"><span class="t-dot"></span>' +
          '<button class="t-head" aria-expanded="false"><span class="t-year">' + esc(ev.year) + '</span><span class="t-title">' + esc(ev.title) + '</span><span class="t-arrow">›</span></button>' +
          '<div class="t-body"><div class="art">' + ART[ev.art] + '</div><div><p class="prose" style="font-size:1.05rem">' + esc(ev.text) + '</p>' +
          (l ? '<a class="lesson-link" href="#/lesson/' + l.id + '">Урок: ' + esc(l.title) + ' →</a>' : '') +
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
      '<div class="narrow prose"><h2>Подробно</h2>' + e.detail.map(function (d) { return '<p>' + esc(d) + '</p>'; }).join('') +
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

  /* ---------- Тест ---------- */
  var quiz = null;
  function quizView() {
    if (!quiz) quiz = { i: 0, score: 0, answered: false, picked: -1 };
    if (quiz.i >= QUIZ.length) {
      var best = Math.max(Store.get('best', 0), quiz.score);
      Store.set('best', best);
      var pct = quiz.score / QUIZ.length;
      var verdict = pct >= .9 ? 'Достойно кампаку!' : pct >= .6 ? 'Хороший путь — ещё немного практики.' : 'Носильщик сандалий тоже когда-то начинал. Перечитайте уроки!';
      return '<div class="fade-in q-card card" style="text-align:center"><div style="max-width:200px;margin:0 auto;color:var(--ink)">' + ART.enso + '</div>' +
        '<h2>' + quiz.score + ' из ' + QUIZ.length + '</h2><p class="lead">' + verdict + '</p><p class="muted">Лучший результат: ' + best + '</p>' +
        '<div class="btn-row" style="justify-content:center"><button class="btn primary" id="qRestart">Пройти снова</button><a class="btn" href="#/lessons">К урокам</a></div></div>';
    }
    var q = QUIZ[quiz.i];
    return '<div class="fade-in q-card"><div class="eyebrow">Проверь себя</div>' +
      '<div class="card"><div class="q-meta"><span>Вопрос ' + (quiz.i + 1) + ' из ' + QUIZ.length + '</span><span>Счёт: ' + quiz.score + '</span></div>' +
      '<div class="q-text">' + esc(q.q) + '</div><div class="opts">' +
      q.o.map(function (o, k) {
        var cls = '';
        if (quiz.answered) { if (k === q.a) cls = ' right'; else if (k === quiz.picked) cls = ' wrong'; }
        return '<button class="opt' + cls + '" data-k="' + k + '"' + (quiz.answered ? ' disabled' : '') + '>' + esc(o) + '</button>';
      }).join('') + '</div>' +
      (quiz.answered ? '<div class="explain box">' + esc(q.e) + '</div><div class="btn-row"><button class="btn primary" id="qNext">' + (quiz.i + 1 < QUIZ.length ? 'Следующий вопрос' : 'Результат') + '</button></div>' : '') +
      '</div></div>';
  }
  function bindQuiz() {
    app.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        quiz.picked = +b.dataset.k; quiz.answered = true;
        if (quiz.picked === QUIZ[quiz.i].a) quiz.score++;
        render(true);
      });
    });
    var n = document.getElementById('qNext');
    if (n) n.addEventListener('click', function () { quiz.i++; quiz.answered = false; quiz.picked = -1; render(true); });
    var r = document.getElementById('qRestart');
    if (r) r.addEventListener('click', function () { quiz = null; render(true); });
  }

  /* ---------- Заметки ---------- */
  function notes() {
    var list = Store.get('notes', []);
    var reflections = LESSONS.map(function (l) { return { l: l, v: Store.get('reflect-' + l.id, '') }; }).filter(function (x) { return x.v.trim(); });
    return '<div class="fade-in narrow"><div class="eyebrow">Личное</div><h1>Заметки</h1>' +
      '<p class="lead">Мысли и выводы хранятся только в этом браузере.</p>' +
      '<textarea id="noteText" placeholder="Что вы вынесли из прочитанного?"></textarea>' +
      '<div class="btn-row"><button class="btn primary" id="noteAdd">Сохранить заметку</button>' +
      (list.length || reflections.length ? '<button class="btn" id="noteExport">Скачать .txt</button>' : '') + '</div>' +
      '<section>' + (list.length ? list.slice().reverse().map(function (n) {
        return '<div class="card note"><div class="meta"><span>' + esc(new Date(n.d).toLocaleString('ru-RU')) + '</span><button class="link-btn" data-del="' + n.d + '">удалить</button></div><p>' + esc(n.t) + '</p></div>';
      }).join('') : '<p class="muted">Пока нет заметок.</p>') + '</section>' +
      (reflections.length ? '<section><h2>Ответы на вопросы уроков</h2>' + reflections.map(function (x) {
        return '<div class="card note"><div class="meta"><a href="#/lesson/' + x.l.id + '">' + esc(x.l.title) + '</a></div><p class="muted" style="font-style:italic;margin-bottom:6px">' + esc(x.l.reflect) + '</p><p>' + esc(x.v) + '</p></div>';
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
      }).filter(Boolean).join('\n\n');
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
      case 'quiz': html = quizView(); bind = bindQuiz; break;
      case 'notes': html = notes(); bind = bindNotes; break;
      case 'reader': html = readerView(parts[1] != null && parts[1] !== '' ? +parts[1] : null); if (bookLoaded) bind = bindReader; break;
      default: html = notFound();
    }
    app.innerHTML = html;
    if (bind) bind();
    var navKey = r === 'lesson' ? 'lessons' : r;
    nav.querySelectorAll('a').forEach(function (a) { a.classList.toggle('active', a.dataset.route === navKey); });
    nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    if (!keepScroll) { scrollTo(0, 0); app.focus({ preventScroll: true }); }
    var titles = { comic: 'Комикс', life: 'Жизнь', lessons: 'Уроки', quiz: 'Тест', notes: 'Заметки', reader: 'Читать' };
    var l = r === 'lesson' && lessonById(parts[1]);
    document.title = (l ? l.title + ' · ' : titles[r] ? titles[r] + ' · ' : '') + 'Самурай без меча';
  }
  addEventListener('hashchange', function () { render(); });
  render();
})();
