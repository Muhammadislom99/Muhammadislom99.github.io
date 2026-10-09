/* Маркеры: выделите текст → выберите цвет → выделение сохраняется в localStorage
   (ключ sbm-highlights) и появляется в «Заметках». Каждый фрагмент привязан к блоку
   страницы по номеру блока, с запасным поиском по тексту, если содержимое изменилось. */
(function () {
  var COLORS = [
    { id: 'y', name: 'Важно' },
    { id: 'g', name: 'Идея' },
    { id: 'b', name: 'Применить' },
    { id: 'p', name: 'Вопрос' }
  ];
  var BLOCK = 'p, li, h1, h2, h3, figcaption, .s-rule, .t-title, .flash-rule';
  var NO = 'button, textarea, input, select, .note, .hl-bar, .player, .prefs-panel, [data-nohl]';
  var app = document.getElementById('app');
  var bar = null, pending = null, current = null, selTimer = null, barDown = 0;
  var touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function all() { return Store.get('highlights', []); }
  function saveAll(l) { Store.set('highlights', l); }
  function colorName(id) { var c = COLORS.find(function (x) { return x.id === id; }); return c ? c.name : ''; }

  /* Ключ страницы: подстраница секрета и главы — одна страница */
  function pageKey(h) {
    var p = (h || location.hash).replace(/^#\/?/, '').split('/');
    if (p[0] === 'chapter') return 'chapter/' + (p[1] || 0);
    if (p[0] === 'reader') return 'reader/' + (p[1] || Store.get('chapter', 0));
    return p.slice(0, 2).join('/') || 'home';
  }
  function blocks() {
    var l = [].slice.call(app.querySelectorAll(BLOCK)).filter(function (b) { return !b.closest(NO); });
    return l.filter(function (b) { return !l.some(function (o) { return o !== b && o.contains(b); }); });
  }

  /* ---------- Смещения и обёртка ---------- */
  function offsetIn(block, node, off) {
    var r = document.createRange(); r.selectNodeContents(block); r.setEnd(node, off);
    return r.toString().length;
  }
  function wrap(block, s, e, h) {
    var w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT), nodes = [], n, pos = 0;
    while ((n = w.nextNode())) { nodes.push([n, pos]); pos += n.data.length; }
    var first = null;
    nodes.forEach(function (x) {
      var node = x[0], a = Math.max(s, x[1]), b = Math.min(e, x[1] + node.data.length);
      if (a >= b) return;
      if (b - x[1] < node.data.length) node.splitText(b - x[1]);
      if (a - x[1] > 0) node = node.splitText(a - x[1]);
      var m = document.createElement('mark');
      m.className = 'hl hl-' + h.c; m.dataset.hl = h.id;
      if (h.n) m.title = h.n;
      node.parentNode.insertBefore(m, node); m.appendChild(node);
      if (!first) first = m;
    });
    return first;
  }
  function unwrap(id) {
    app.querySelectorAll('mark.hl[data-hl="' + id + '"]').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m); p.normalize();
    });
  }
  function findSeg(bl, g) {
    var b = bl[g.bi];
    if (b && b.textContent.slice(g.s, g.e) === g.t) return [b, g.s, g.e];
    for (var i = 0; i < bl.length; i++) {
      var t = bl[i].textContent, k = g.ctx ? t.indexOf(g.ctx + g.t) : -1;
      if (k >= 0) return [bl[i], k + g.ctx.length, k + g.ctx.length + g.t.length];
    }
    if (g.t.length >= 8) for (var j = 0; j < bl.length; j++) {
      var q = bl[j].textContent.indexOf(g.t);
      if (q >= 0) return [bl[j], q, q + g.t.length];
    }
    return null;
  }
  function apply(h, bl) {
    var first = null;
    h.segs.forEach(function (g) {
      var f = findSeg(bl, g);
      if (f) { var m = wrap(f[0], f[1], f[2], h); if (!first) first = m; }
    });
    if (first && h.n) paintMarks(h);
    return first;
  }

  /* Вызывается после каждой отрисовки страницы */
  function restore() {
    var key = pageKey(), bl = blocks(), jump = Store.get('jumpHl', null);
    all().filter(function (h) { return h.page === key; }).forEach(function (h) {
      var m = apply(h, bl);
      if (m && jump === h.id) {
        Store.set('jumpHl', null);
        setTimeout(function () {
          for (var d = m.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
          var ti = m.closest('.t-item'); if (ti) ti.classList.add('open');
          var r = m.getBoundingClientRect();
          scrollTo({ top: scrollY + r.top - innerHeight * 0.35 });
          app.querySelectorAll('mark.hl[data-hl="' + h.id + '"]').forEach(function (x) { x.classList.add('flash'); });
        }, 150);
      }
    });
  }

  /* ---------- Выделение → сегменты ---------- */
  function segsFromSelection() {
    var sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    if (!app.contains(r.commonAncestorContainer)) return null;
    var anc = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    if (anc.closest(NO)) return null;
    var bl = blocks(), segs = [];
    bl.forEach(function (b, i) {
      if (!r.intersectsNode(b)) return;
      var t = b.textContent;
      var s = b.contains(r.startContainer) ? offsetIn(b, r.startContainer, r.startOffset) : 0;
      var e = b.contains(r.endContainer) ? offsetIn(b, r.endContainer, r.endOffset) : t.length;
      // как маркером в книге: слово целиком, даже если палец захватил его наполовину
      var W = /[0-9A-Za-zА-Яа-яЁё\-]/;
      while (s > 0 && W.test(t[s - 1]) && W.test(t[s])) s--;
      while (e < t.length && W.test(t[e]) && W.test(t[e - 1])) e++;
      while (s < e && /\s/.test(t[s])) s++;
      while (e > s && /\s/.test(t[e - 1])) e--;
      if (e - s < 2) return;
      // уже выделено целиком? тогда не дублируем
      segs.push({ bi: i, s: s, e: e, t: t.slice(s, e), ctx: t.slice(Math.max(0, s - 24), s) });
    });
    return segs.length ? { segs: segs, rect: r.getBoundingClientRect(), anchor: bl[segs[0].bi] } : null;
  }
  function context(block) {
    var sec = block.closest('.secret'), title = document.title.replace(/\s*·\s*Самурай без меча$/, '') || 'Главная';
    var sub = sec ? sec.querySelector('.s-name').textContent : '';
    var link = location.hash || '#/';
    if (sec && /^#\/chapter\//.test(link)) link = '#/chapter/' + pageKey().split('/')[1] + '/' + sec.id.replace(/^s-/, '');
    return { title: title, sub: sub, link: link };
  }

  /* ---------- Панель маркеров ---------- */
  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'hl-bar'; bar.hidden = true; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Маркер');
    document.body.appendChild(bar);
    // Касание панели снимает выделение раньше, чем приходит click. Запоминаем момент касания,
    // чтобы обработчик selectionchange не спрятал панель, а действие выполняем по click.
    bar.addEventListener('pointerdown', function (e) { barDown = Date.now(); if (e.pointerType === 'mouse') e.preventDefault(); });
    bar.addEventListener('touchstart', function () { barDown = Date.now(); }, { passive: true });
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      act(b.dataset.a, b.dataset.c);
    });
    bar.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    return bar;
  }
  function show(rect, existing) {
    ensureBar();
    bar.innerHTML = COLORS.map(function (c) {
      return '<button class="hl-dot hl-' + c.id + (existing && existing.c === c.id ? ' on' : '') + '" data-a="color" data-c="' + c.id + '" aria-label="' + c.name + '" title="' + c.name + '"><i></i><span>' + c.name + '</span></button>';
    }).join('') +
      (!existing ? '<button class="hl-dot hl-plus" data-a="add" aria-label="Выделить с комментарием" title="Выделить с комментарием"><i>+</i><span>Заметка</span></button>' : '') +
      (existing ? '<button class="hl-act" data-a="note" aria-label="Комментарий" title="Комментарий">✎</button>' +
        '<button class="hl-act" data-a="copy" aria-label="Копировать" title="Копировать">⧉</button>' +
        '<button class="hl-act" data-a="del" aria-label="Удалить выделение" title="Удалить">🗑</button>' : '') +
      (existing && existing.n ? '<div class="hl-preview">✎ ' + esc(existing.n) + '</div>' : '');
    bar.hidden = false;
    bar.classList.toggle('dock', touch);
    var w = bar.offsetWidth, h = bar.offsetHeight;
    if (touch) {
      // Телефон: низ экрана занимает панель «Поиск Google», над выделением — меню «Копировать».
      // Ставим панель вверху экрана; если выделение у самого верха — под ним, но не ниже 180 px от края.
      var t = 10;
      if (rect.top < t + h + 80) t = Math.min(rect.bottom + 40, innerHeight - 180 - h);
      bar.style.top = Math.max(10, t) + 'px';
      bar.style.left = Math.max(8, (innerWidth - w) / 2) + 'px';
      return;
    }
    var top = rect.bottom + 12;
    if (top + h > innerHeight - (document.body.classList.contains('has-player') ? 90 : 12)) top = Math.max(70, rect.top - h - 12);
    var left = Math.min(innerWidth - w - 8, Math.max(8, rect.left + rect.width / 2 - w / 2));
    bar.style.top = top + 'px'; bar.style.left = left + 'px';
  }
  function hide() { if (bar) bar.hidden = true; pending = null; current = null; }

  function act(a, c) {
    if (current) {
      var l = all(), h = l.find(function (x) { return x.id === current; });
      if (!h) { hide(); return; }
      if (a === 'color') {
        h.c = c; saveAll(l); paintMarks(h);
      } else if (a === 'del') {
        saveAll(l.filter(function (x) { return x.id !== h.id; })); unwrap(h.id);
      } else if (a === 'note') {
        hide(); barDown = 0; openSheet({ h: h, c: h.c, n: h.n || '' }); return;
      } else if (a === 'copy') {
        try { navigator.clipboard.writeText('«' + h.text + '» — Китами Масао, «Самурай без меча»'); toast('Скопировано'); } catch (e) {}
      }
      hide(); barDown = 0; return;
    }
    if (pending && a === 'color') create(pending, c, '');
    else if (pending && a === 'add') { var snap = pending; hide(); barDown = 0; openSheet({ sel: snap, c: 'y', n: '' }); return; }
    hide();
    barDown = 0;
  }
  function create(sel, c, note) {
    var ctx = context(sel.anchor);
    var hl = { id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), c: c, page: pageKey(),
      segs: sel.segs.map(function (g) { return { bi: g.bi, s: g.s, e: g.e, t: g.t, ctx: g.ctx }; }),
      text: sel.segs.map(function (g) { return g.t; }).join(' … '), title: ctx.title, sub: ctx.sub, link: ctx.link, d: Date.now() };
    if (note) hl.n = note;
    var list = all(); list.push(hl); saveAll(list);
    try { getSelection().removeAllRanges(); } catch (e) {}
    apply(hl, blocks());
    toast(note ? 'Заметка сохранена' : colorName(c) + ' · сохранено');
  }
  function paintMarks(h) {
    var ms = app.querySelectorAll('mark.hl[data-hl="' + h.id + '"]');
    ms.forEach(function (m, i) {
      m.className = 'hl hl-' + h.c + (h.n && i === ms.length - 1 ? ' has-note' : '');
      m.title = h.n || '';
    });
  }

  /* ---------- Окно заметки: цвет + комментарий ---------- */
  var sheet = null, sheetState = null;
  function openSheet(st) {
    sheetState = st;
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'hl-sheet-wrap'; sheet.hidden = true;
      sheet.innerHTML = '<div class="hl-sheet" role="dialog" aria-modal="true" aria-label="Заметка к выделению"></div>';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) { closeSheet(); return; }
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.sc) { sheetState.c = b.dataset.sc; sheet.querySelectorAll('[data-sc]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); sheet.querySelector('.hl-quote').className = 'hl-quote hl-' + sheetState.c; }
        else if (b.dataset.s === 'cancel') closeSheet();
        else if (b.dataset.s === 'save') saveSheet();
      });
      sheet.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeSheet();
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveSheet();
      });
    }
    var text = st.h ? st.h.text : st.sel.segs.map(function (g) { return g.t; }).join(' … ');
    sheet.firstChild.innerHTML =
      '<div class="sx-label">' + (st.h ? 'Изменить заметку' : 'Новая заметка') + '</div>' +
      '<blockquote class="hl-quote hl-' + st.c + '">' + esc(text.length > 280 ? text.slice(0, 280) + '…' : text) + '</blockquote>' +
      '<div class="seg hl-colors">' + COLORS.map(function (c) {
        return '<button type="button" class="hl-' + c.id + '" data-sc="' + c.id + '" aria-pressed="' + (st.c === c.id) + '"><i class="sw hl-' + c.id + '"></i>' + c.name + '</button>';
      }).join('') + '</div>' +
      '<textarea id="hlNote" placeholder="Ваша мысль: почему это важно, как применить…">' + esc(st.n || '') + '</textarea>' +
      '<div class="btn-row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn" data-s="cancel">Отмена</button><button type="button" class="btn primary" data-s="save">Сохранить</button></div>';
    sheet.hidden = false;
    document.body.classList.add('sheet-open');
    setTimeout(function () { var t = document.getElementById('hlNote'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 60);
  }
  function closeSheet() { if (sheet) sheet.hidden = true; sheetState = null; document.body.classList.remove('sheet-open'); }
  function saveSheet() {
    var st = sheetState; if (!st) return;
    var note = document.getElementById('hlNote').value.trim();
    if (st.h) {
      var l = all(), h = l.find(function (x) { return x.id === st.h.id; });
      if (h) { h.c = st.c; if (note) h.n = note; else delete h.n; saveAll(l); paintMarks(h); toast('Заметка обновлена'); }
    } else create(st.sel, st.c, note);
    closeSheet();
  }
  var toastEl, toastT;
  function toast(t) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = t; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 1800);
  }

  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    if (Date.now() - barDown < 900) return;
    selTimer = setTimeout(function () {
      if (Date.now() - barDown < 900) return;
      var p = segsFromSelection();
      if (p) { current = null; pending = p; show(p.rect, null); }
      else if (pending) hide();
    }, 280);
  });
  app.addEventListener('click', function (e) {
    var m = e.target.closest('mark.hl');
    if (!m || !getSelection().isCollapsed) return;
    e.preventDefault(); e.stopPropagation();
    var h = all().find(function (x) { return x.id === m.dataset.hl; });
    if (!h) return;
    pending = null; current = h.id;
    show(m.getBoundingClientRect(), h);
  }, true);
  document.addEventListener('pointerdown', function (e) {
    if (bar && !bar.hidden && !bar.contains(e.target) && current && !e.target.closest('mark.hl')) setTimeout(hide, 0);
  });
  addEventListener('hashchange', hide);
  addEventListener('scroll', function () { if (current && !touch) hide(); }, { passive: true });

  /* ---------- Раздел в «Заметках» ---------- */
  var filter = 'all';
  function notesHtml() {
    var l = all().slice().sort(function (a, b) { return b.d - a.d; });
    if (!l.length) return '<section><h2>Выделения</h2><p class="muted">Пока нет. Выделите любой текст в главах, уроках или читалке и выберите цвет маркера — фрагмент появится здесь.</p></section>';
    var shown = l.filter(function (h) { return filter === 'all' || h.c === filter; });
    return '<section><h2>Выделения</h2>' +
      '<div class="era-filter">' + [{ id: 'all', name: 'Все' }].concat(COLORS).map(function (c) {
        var n = c.id === 'all' ? l.length : l.filter(function (h) { return h.c === c.id; }).length;
        return '<button class="chip' + (filter === c.id ? ' active' : '') + '" data-hlf="' + c.id + '">' + (c.id !== 'all' ? '<i class="sw hl-' + c.id + '"></i>' : '') + esc(c.name) + ' · ' + n + '</button>';
      }).join('') + '</div>' +
      (shown.length ? shown.map(function (h) {
        return '<div class="card note hl-note hl-' + h.c + '"><div class="meta"><span><i class="sw hl-' + h.c + '"></i>' + esc(colorName(h.c)) + ' · ' + esc(new Date(h.d).toLocaleDateString('ru-RU')) + '</span>' +
          '<button class="link-btn" data-hldel="' + h.id + '">удалить</button></div>' +
          '<blockquote>' + esc(h.text) + '</blockquote>' + (h.n ? '<p class="hl-comment">' + esc(h.n) + '</p>' : '') +
          '<a class="hl-src" href="' + esc(h.link) + '" data-hljump="' + h.id + '">' + esc(h.title) + (h.sub ? ' · ' + esc(h.sub) : '') + ' →</a></div>';
      }).join('') : '<p class="muted">В этом цвете пока ничего.</p>') + '</section>';
  }
  function bindNotes(rerender) {
    app.querySelectorAll('[data-hlf]').forEach(function (b) { b.addEventListener('click', function () { filter = b.dataset.hlf; rerender(); }); });
    app.querySelectorAll('[data-hldel]').forEach(function (b) {
      b.addEventListener('click', function () { saveAll(all().filter(function (h) { return h.id !== b.dataset.hldel; })); rerender(); });
    });
    app.querySelectorAll('[data-hljump]').forEach(function (a) { a.addEventListener('click', function () { Store.set('jumpHl', a.dataset.hljump); }); });
  }
  function exportText() {
    var l = all();
    if (!l.length) return '';
    return 'ВЫДЕЛЕНИЯ\n\n' + COLORS.map(function (c) {
      var g = l.filter(function (h) { return h.c === c.id; });
      return g.length ? '— ' + c.name + ' —\n' + g.map(function (h) {
        return '«' + h.text + '»\n  ' + h.title + (h.sub ? ' · ' + h.sub : '') + (h.n ? '\n  Комментарий: ' + h.n : '');
      }).join('\n\n') : '';
    }).filter(Boolean).join('\n\n');
  }

  window.Highlights = { restore: restore, notesHtml: notesHtml, bindNotes: bindNotes, exportText: exportText, count: function () { return all().length; } };
})();
