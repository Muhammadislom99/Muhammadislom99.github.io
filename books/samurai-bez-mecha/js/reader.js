/* Читалка: разбирает собственный экземпляр книги пользователя (FB2 / TXT)
   на главы. Файл обрабатывается только в браузере и никуда не отправляется. */
(function () {
  function decode(buf) {
    var head = new TextDecoder('ascii').decode(buf.slice(0, 200));
    var m = head.match(/encoding=["']([\w-]+)["']/i);
    if (m) {
      try { return new TextDecoder(m[1].toLowerCase()).decode(buf); } catch (e) {}
    }
    var utf = new TextDecoder('utf-8').decode(buf);
    var bad = (utf.match(/�/g) || []).length;
    if (bad > 10) {
      try { return new TextDecoder('windows-1251').decode(buf); } catch (e) {}
    }
    return utf;
  }

  function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function parseFB2(xml) {
    var doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Не удалось прочитать FB2');
    var chapters = [];
    var titleInfo = doc.getElementsByTagName('book-title')[0];
    var bookTitle = titleInfo ? clean(titleInfo.textContent) : 'Книга';
    var bodies = Array.prototype.filter.call(doc.getElementsByTagName('body'), function (b) {
      return b.getAttribute('name') !== 'notes';
    });

    function blocksOf(el, out) {
      Array.prototype.forEach.call(el.children, function (c) {
        var n = c.localName;
        if (n === 'section' || n === 'title') return;
        if (n === 'p') out.push({ t: 'p', text: clean(c.textContent) });
        else if (n === 'subtitle') out.push({ t: 'h', text: clean(c.textContent) });
        else if (n === 'epigraph' || n === 'cite') {
          Array.prototype.forEach.call(c.querySelectorAll('p, v, text-author'), function (p) {
            out.push({ t: 'epi', text: clean(p.textContent) });
          });
        } else if (n === 'poem') {
          Array.prototype.forEach.call(c.querySelectorAll('v, title p, text-author'), function (p) {
            out.push({ t: 'epi', text: clean(p.textContent) });
          });
        } else if (n === 'empty-line' || n === 'image') {
          /* пропуск */
        } else if (c.textContent.trim()) {
          out.push({ t: 'p', text: clean(c.textContent) });
        }
      });
      return out.filter(function (b) { return b.text; });
    }

    function walk(sec, level) {
      var t = Array.prototype.find.call(sec.children, function (c) { return c.localName === 'title'; });
      var title = t ? Array.prototype.map.call(t.children, function (p) { return clean(p.textContent); }).filter(Boolean).join('. ') : '';
      var blocks = blocksOf(sec, []);
      var subs = Array.prototype.filter.call(sec.children, function (c) { return c.localName === 'section'; });
      if (blocks.length || !subs.length) {
        chapters.push({ title: title || ('Раздел ' + (chapters.length + 1)), level: level, blocks: blocks });
      } else if (title) {
        chapters.push({ title: title, level: level, blocks: [] });
      }
      subs.forEach(function (s) { walk(s, Math.min(level + 1, 2)); });
    }

    bodies.forEach(function (b) {
      var secs = Array.prototype.filter.call(b.children, function (c) { return c.localName === 'section'; });
      if (!secs.length) walk(b, 1);
      else {
        var pre = blocksOf(b, []);
        if (pre.length) chapters.push({ title: 'Вступление', level: 1, blocks: pre });
        secs.forEach(function (s) { walk(s, 1); });
      }
    });
    // Пустые главы-заголовки сливаем с первой подглавой
    chapters = chapters.filter(function (c, i) {
      return c.blocks.length || !(chapters[i + 1] && chapters[i + 1].level > c.level);
    });
    return { title: bookTitle, chapters: chapters };
  }

  var HEAD = /^(глава|часть|раздел|введение|предисловие|вступление|пролог|эпилог|заключение|послесловие|от автора|урок)\b/i;

  function parseTXT(txt, name) {
    var lines = txt.replace(/\r/g, '').split('\n');
    var paras = [], buf = [];
    lines.forEach(function (l) {
      var s = l.trim();
      if (!s) { if (buf.length) { paras.push(buf.join(' ')); buf = []; } return; }
      // строка с отступом или короткая строка-заголовок начинает новый абзац
      if (buf.length && (/^\s{2,}|^\t/.test(l) || HEAD.test(s))) { paras.push(buf.join(' ')); buf = []; }
      buf.push(s);
      if (HEAD.test(s) && s.length < 120) { paras.push(buf.join(' ')); buf = []; }
    });
    if (buf.length) paras.push(buf.join(' '));

    var chapters = [], cur = null;
    paras.forEach(function (p) {
      if (HEAD.test(p) && p.length < 120) {
        cur = { title: p, level: 1, blocks: [] };
        chapters.push(cur);
      } else {
        if (!cur) { cur = { title: 'Начало', level: 1, blocks: [] }; chapters.push(cur); }
        cur.blocks.push({ t: 'p', text: p });
      }
    });
    if (chapters.length <= 1 && paras.length > 80) {
      chapters = [];
      for (var i = 0; i < paras.length; i += 60) {
        chapters.push({ title: 'Часть ' + (i / 60 + 1), level: 1, blocks: paras.slice(i, i + 60).map(function (p) { return { t: 'p', text: p }; }) });
      }
    }
    return { title: name.replace(/\.[^.]+$/, ''), chapters: chapters };
  }

  window.Reader = {
    parseFile: function (file) {
      return file.arrayBuffer().then(function (buf) {
        var text = decode(buf);
        var book = /\.fb2$/i.test(file.name) || /<FictionBook/i.test(text.slice(0, 2000))
          ? parseFB2(text) : parseTXT(text, file.name);
        if (!book.chapters.length) throw new Error('В файле не найден текст');
        book.words = book.chapters.reduce(function (n, c) {
          return n + c.blocks.reduce(function (m, b) { return m + b.text.split(/\s+/).length; }, 0);
        }, 0);
        return book;
      });
    }
  };
})();
