/* Обучение: при первом запуске — карточки с мини-демонстрациями,
   затем по желанию — тур с подсветкой настоящих кнопок на странице.
   Открыть снова: «Как пользоваться» в панели «Аа» или в подвале. */
(function () {
  var KEY = 'onboarded';

  /* ---------- Мини-демонстрации (HTML/CSS, без картинок) ---------- */
  var tap = '<span class="ob-tap" aria-hidden="true"></span>';
  var SLIDES = [
    { t: 'Книга в кармане', d: 'Пересказ всех 10 глав «Самурая без меча», 45 секретов Хидэёси, люди, хронология, комикс, карточки и тест.',
      demo: '<div class="ob-grid">' + ['Книга', 'Люди', 'Жизнь', 'Комикс', 'Уроки', 'Тест'].map(function (x, i) {
        return '<div class="ob-tile' + (i === 0 ? ' on' : '') + '">' + x + '</div>'; }).join('') + '</div>' },
    { t: 'Секреты раскрываются касанием', d: 'Нажмите на карточку секрета — внутри цифры, ситуация, шаги и итог. Отметьте «Изучено», и прогресс сохранится.',
      demo: '<div class="ob-card"><span class="ob-num">2</span><div><small>СЕКРЕТ ЗАВОЕВАНИЯ СТОРОННИКОВ</small><b>Будьте лидером, а не начальником</b></div><span class="ob-chev">›</span>' + tap + '</div>' +
        '<div class="ob-steps"><span>1</span><i></i><span>2</span><i></i><span>3</span></div>' },
    { t: 'Слушайте вместо чтения', d: 'Кнопка ▶ читает текст вслух. Текущее предложение подсвечивается, страница листается сама. Внизу — пауза и перемотка.',
      demo: '<p class="ob-text">Тайфун обрушил стену. <mark class="ob-tts">Хидэёси разделил людей на десять бригад.</mark> Стену закончили за три дня.</p>' +
        '<div class="ob-player"><span>⏮</span><span class="ob-pp">❚❚</span><span>⏭</span><div><b>Будьте лидером…</b><small>3 из 17</small></div>' + tap + '</div>' },
    { t: 'Выделяйте маркером', d: 'Удерживайте палец на слове и растяните выделение. Сверху появятся цвета: «Важно», «Идея», «Применить», «Вопрос». «+ Заметка» — выделить и записать свою мысль.',
      demo: '<p class="ob-text">Победа без боя — <mark class="ob-hl">лучшая победа</mark>, а переговоры сильнее меча.</p>' +
        '<div class="ob-colors"><i class="hl-y"></i><i class="hl-g"></i><i class="hl-b"></i><i class="hl-p"></i><i class="ob-plus">+</i>' + tap + '</div>' },
    { t: 'Настройте текст под себя', d: 'Кнопка «Аа» в шапке: размер шрифта, выравнивание по левому краю или по ширине, шрифт, скорость и голос озвучки. Рядом — тема: светлая, сепия, тёмная.',
      demo: '<div class="ob-prefs"><span class="ob-aa">Аа' + tap + '</span><div><span>A−</span><b>110%</b><span>A+</span></div><div><span class="on">По левому краю</span><span>По ширине</span></div></div>' },
    { t: 'Всё важное — в «Заметках»', d: 'Выделения с цветами и комментариями, ответы на вопросы глав и ваши записи. Фильтр по цвету, переход к месту в книге и выгрузка в .txt. Всё хранится только в этом браузере.',
      demo: '<div class="ob-note hl-g"><small>● Идея</small><q>Бедность — опыт, который понимает 95% армии</q><span>Глава 1 →</span></div>' +
        '<div class="ob-note hl-y"><small>● Важно</small><q>Сначала дай то, чего хочет другой</q><span>Глава 5 →</span></div>' }
  ];

  var wrap = null, i = 0;
  function render() {
    var s = SLIDES[i], last = i === SLIDES.length - 1;
    wrap.firstChild.innerHTML =
      '<button class="ob-skip" data-ob="close">Пропустить</button>' +
      '<div class="ob-demo" aria-hidden="true">' + s.demo + '</div>' +
      '<div class="ob-body"><div class="eyebrow">' + (i + 1) + ' из ' + SLIDES.length + '</div><h2 id="obTitle">' + s.t + '</h2><p>' + s.d + '</p></div>' +
      '<div class="ob-dots">' + SLIDES.map(function (_, k) { return '<button data-ob-go="' + k + '" class="' + (k === i ? 'on' : '') + '" aria-label="Шаг ' + (k + 1) + '"></button>'; }).join('') + '</div>' +
      '<div class="ob-nav">' + (i > 0 ? '<button class="btn" data-ob="prev">Назад</button>' : '<span></span>') +
      (last ? '<div class="ob-final"><button class="btn" data-ob="tour">Показать на странице</button><button class="btn primary" data-ob="start">Начать читать</button></div>'
            : '<button class="btn primary" data-ob="next">Далее</button>') + '</div>';
  }
  function open(from) {
    i = from || 0;
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'ob-wrap';
      wrap.innerHTML = '<div class="ob-sheet" role="dialog" aria-modal="true" aria-labelledby="obTitle"></div>';
      document.body.appendChild(wrap);
      wrap.addEventListener('click', function (e) {
        var g = e.target.closest('[data-ob-go]');
        if (g) { i = +g.dataset.obGo; render(); return; }
        var b = e.target.closest('[data-ob]'); if (!b) return;
        var a = b.dataset.ob;
        if (a === 'next') { i++; render(); }
        else if (a === 'prev') { i--; render(); }
        else if (a === 'close') { done(); }
        else if (a === 'start') { done(); location.hash = '#/book'; }
        else if (a === 'tour') { done(); tour(); }
      });
      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') done();
        if (e.key === 'ArrowRight' && i < SLIDES.length - 1) { i++; render(); }
        if (e.key === 'ArrowLeft' && i > 0) { i--; render(); }
      });
      // свайп влево/вправо
      var x0 = null;
      wrap.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      wrap.addEventListener('touchend', function (e) {
        if (x0 == null) return;
        var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (dx < -50 && i < SLIDES.length - 1) { i++; render(); }
        else if (dx > 50 && i > 0) { i--; render(); }
      });
    }
    render();
    wrap.hidden = false;
    document.body.classList.add('sheet-open');
    setTimeout(function () { var b = wrap.querySelector('.btn.primary'); if (b) b.focus(); }, 50);
  }
  function done() {
    Store.set(KEY, true);
    if (wrap) wrap.hidden = true;
    document.body.classList.remove('sheet-open');
  }

  /* ---------- Тур по настоящему интерфейсу ---------- */
  var STEPS = [
    { route: '#/', sel: ['#menuBtn', '#nav'], t: 'Разделы', d: 'Книга, Люди, Жизнь, Комикс, Уроки, Тест, Заметки и Читалка — всё здесь.' },
    { route: '#/', sel: ['#prefsBtn'], t: 'Настройки текста', d: 'Размер шрифта, выравнивание, шрифт, скорость и голос озвучки. Здесь же — «Как пользоваться».' },
    { route: '#/', sel: ['#themeBtn'], t: 'Тема', d: 'Светлая, сепия или тёмная — для чтения ночью.' },
    { route: '#/chapter/1', sel: ['.say-row .say'], t: 'Слушать главу', d: 'Нажмите — приложение прочитает главу вслух и будет подсвечивать каждое предложение.' },
    { route: '#/chapter/1', sel: ['.tldr li'], t: 'Маркер', d: 'Удерживайте палец на тексте и выделите его — появятся цвета и «+ Заметка».' },
    { route: '#/chapter/1', sel: ['.secret summary'], t: 'Секреты', d: 'Нажмите на секрет, чтобы раскрыть его. Кнопка ▶ на карточке читает только этот секрет.' },
    { route: '#/chapter/1', sel: ['a[data-route="notes"]', '#menuBtn'], t: 'Заметки', d: 'Все выделения и комментарии собираются в разделе «Заметки». Приятного чтения!' }
  ];
  var tw = null, k = 0;
  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  function target(st) {
    for (var j = 0; j < st.sel.length; j++) {
      var el = [].slice.call(document.querySelectorAll(st.sel[j])).find(visible);
      if (el) return el;
    }
    return null;
  }
  function tour() {
    k = 0;
    if (!tw) {
      tw = document.createElement('div');
      tw.className = 'tour';
      tw.innerHTML = '<div class="tour-spot"></div><div class="tour-tip" role="dialog" aria-live="polite"></div>';
      document.body.appendChild(tw);
      tw.addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return;
        var a = b.dataset.t;
        if (a === 'next') { k++; if (k >= STEPS.length) endTour(); else step(); }
        else if (a === 'prev') { k = Math.max(0, k - 1); step(); }
        else endTour();
      });
      addEventListener('resize', function () { if (!tw.hidden) place(); });
    }
    tw.hidden = false;
    document.body.classList.add('touring');
    step();
    // рамка следует за элементом: шрифты догружаются, страница может сдвинуться
    (function follow() { if (tw.hidden) return; place(); requestAnimationFrame(follow); })();
  }
  function endTour() { if (tw) tw.hidden = true; document.body.classList.remove('touring'); Store.set(KEY, true); }
  var curEl = null;
  function step() {
    var st = STEPS[k];
    var go = function () {
      curEl = target(st);
      if (!curEl) { k++; if (k >= STEPS.length) endTour(); else step(); return; }
      document.body.classList.remove('hide-bar');
      var r = curEl.getBoundingClientRect();
      if (r.top < 80 || r.bottom > innerHeight - 220) scrollTo({ top: scrollY + r.top - innerHeight * 0.3 });
      setTimeout(function () {
        place();
        tw.querySelector('.tour-tip').innerHTML =
          '<div class="eyebrow">Шаг ' + (k + 1) + ' из ' + STEPS.length + '</div><h3>' + st.t + '</h3><p>' + st.d + '</p>' +
          '<div class="tour-nav"><button class="link-btn" data-t="end">Закончить</button><span>' +
          (k > 0 ? '<button class="btn small" data-t="prev">Назад</button>' : '') +
          '<button class="btn small primary" data-t="next">' + (k === STEPS.length - 1 ? 'Готово' : 'Далее') + '</button></span></div>';
        place();
      }, 120);
    };
    if (location.hash.replace(/\/$/, '') !== st.route.replace(/\/$/, '') && !(st.route === '#/' && (location.hash === '' || location.hash === '#/'))) {
      location.hash = st.route; setTimeout(go, 450);
    } else go();
  }
  function place() {
    if (!curEl || !document.contains(curEl)) return;
    var r = curEl.getBoundingClientRect(), pad = 6;
    var sp = tw.querySelector('.tour-spot'), tip = tw.querySelector('.tour-tip');
    sp.style.top = (r.top - pad) + 'px'; sp.style.left = (r.left - pad) + 'px';
    sp.style.width = (r.width + pad * 2) + 'px'; sp.style.height = (r.height + pad * 2) + 'px';
    var tw2 = Math.min(340, innerWidth - 24), th = tip.offsetHeight || 160;
    var below = r.bottom + 16 + th < innerHeight;
    tip.style.width = tw2 + 'px';
    tip.style.top = (below ? r.bottom + 16 : Math.max(12, r.top - th - 16)) + 'px';
    tip.style.left = Math.min(innerWidth - tw2 - 12, Math.max(12, r.left + r.width / 2 - tw2 / 2)) + 'px';
    tip.classList.toggle('above', !below);
  }

  /* ---------- Запуск ---------- */
  document.addEventListener('click', function (e) {
    var h = e.target.closest('[data-help]');
    if (!h) return;
    e.preventDefault();
    var p = document.getElementById('prefsPanel'); if (p) p.hidden = true;
    open(0);
  });
  setTimeout(function () { if (!Store.get(KEY, false)) open(0); }, 700);

  window.Onboarding = { open: open, tour: tour };
})();
