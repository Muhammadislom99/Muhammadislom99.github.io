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

  /* ---------- PDF ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Не удалось загрузить ' + src)); };
      document.head.appendChild(s);
    });
  }
  var pdfReady = null;
  function pdfLib() {
    // Воркер подключается обычным скриптом: так PDF.js работает и при открытии через file://
    if (!pdfReady) pdfReady = loadScript('vendor/pdf.worker.min.js')
      .then(function () { return loadScript('vendor/pdf.min.js'); })
      .then(function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
        return window.pdfjsLib;
      });
    return pdfReady;
  }
  function median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    return s[Math.floor(s.length / 2)];
  }
  var END = /[.!?…:»"”)]$/;

  async function parsePDF(buf, name, progress) {
    var lib = await pdfLib();
    var pdf = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    var pages = [];
    for (var n = 1; n <= pdf.numPages; n++) {
      if (progress) progress('Страница ' + n + ' из ' + pdf.numPages);
      var page = await pdf.getPage(n);
      var tc = await page.getTextContent();
      var lines = [], cur = null;
      tc.items.forEach(function (it) {
        if (!('str' in it)) return;
        var x = it.transform[4], y = it.transform[5];
        var h = Math.abs(it.transform[3]) || it.height || 10;
        if (!cur || Math.abs(cur.y - y) > h * 0.5) {
          if (cur && cur.text.trim()) lines.push(cur);
          cur = { text: '', y: y, x: x, end: x, size: 0 };
        }
        if (it.str) {
          var gap = x - cur.end;
          if (cur.text && gap > h * 0.15 && !/\s$/.test(cur.text) && !/^\s/.test(it.str)) cur.text += ' ';
          cur.text += it.str;
          cur.end = x + (it.width || 0);
          cur.x = Math.min(cur.x, x);
          if (it.str.trim()) cur.size = Math.max(cur.size, h);
        }
      });
      if (cur && cur.text.trim()) lines.push(cur);
      lines.forEach(function (l) { l.text = l.text.replace(/\s+/g, ' ').trim(); });
      pages.push(lines);
      page.cleanup();
    }

    var chars = pages.reduce(function (n, p) { return n + p.reduce(function (m, l) { return m + l.text.length; }, 0); }, 0);
    if (chars < 200) throw new Error('В этом PDF нет текстового слоя (это скан). Нужна версия с текстом или распознавание (OCR).');

    // Колонтитулы: строки, повторяющиеся вверху/внизу многих страниц, и номера страниц
    var norm = function (t) { return t.toLowerCase().replace(/\d+/g, '#'); };
    var freq = {};
    pages.forEach(function (p) {
      [p[0], p[1], p[p.length - 1], p[p.length - 2]].forEach(function (l) {
        if (l) freq[norm(l.text)] = (freq[norm(l.text)] || 0) + 1;
      });
    });
    var limit = Math.max(3, pages.length * 0.25);
    pages = pages.map(function (p) {
      return p.filter(function (l, i) {
        var edge = i < 2 || i >= p.length - 2;
        if (edge && /^[\s\d\-–—.]*$/.test(l.text)) return false;
        if (edge && l.text.length < 70 && freq[norm(l.text)] >= limit) return false;
        return true;
      });
    });

    var all = [].concat.apply([], pages);
    var body = median(all.map(function (l) { return l.size; }));
    var lineGap = median([].concat.apply([], pages.map(function (p) {
      return p.slice(1).map(function (l, i) { return p[i].y - l.y; }).filter(function (g) { return g > 0; });
    }))) || body * 1.3;
    var leftX = median(all.map(function (l) { return l.x; }));
    var rightX = median(all.map(function (l) { return l.end; }).filter(function (e) { return e > leftX; }));

    var bigCount = all.filter(function (l) { return l.size > body * 1.4 && l.text.length < 100; }).length;
    function kind(l) {
      if (l.text.length < 100 && HEAD.test(l.text)) return 'ch';
      if (bigCount < 80 && l.size > body * 1.4 && l.text.length < 100) return 'ch';
      if (l.size > body * 1.15 && l.text.length < 120) return 'h';
      return 'p';
    }

    var chapters = [], ch = null, para = null, prev = null, prevKind = null;
    function flush() { if (para && ch) ch.blocks.push({ t: 'p', text: para }); para = null; }
    function newChapter(title) { flush(); ch = { title: title, level: 1, blocks: [] }; chapters.push(ch); }
    pages.forEach(function (p) {
      p.forEach(function (l, i) {
        var k = kind(l);
        if (k === 'ch') {
          if (prevKind === 'ch' && ch && !ch.blocks.length && !para) ch.title += '. ' + l.text;
          else newChapter(l.text);
        } else if (k === 'h') {
          if (!ch) newChapter('Начало');
          flush();
          var last = ch.blocks[ch.blocks.length - 1];
          if (prevKind === 'h' && last && last.t === 'h') last.text += ' ' + l.text;
          else ch.blocks.push({ t: 'h', text: l.text });
        } else {
          if (!ch) newChapter('Начало');
          var start = !para ||
            (i > 0 && prev && (prev.y - l.y) > lineGap * 1.5) ||
            (l.x - leftX > body * 0.8) ||
            (prev && prev.end < rightX - body * 3 && END.test(prev.text));
          if (start) { flush(); para = l.text; }
          else if (/[-­]$/.test(para) && /^[a-zа-яё]/.test(l.text)) para = para.replace(/[-­]$/, '') + l.text;
          else para += ' ' + l.text;
        }
        prev = l; prevKind = k;
      });
      prev = null;
    });
    flush();

    // Слишком мало глав — делим по страницам
    if (chapters.length < 2) {
      var blocks = chapters.length ? chapters[0].blocks : [];
      chapters = [];
      for (var b = 0; b < blocks.length; b += 50) {
        chapters.push({ title: 'Часть ' + (b / 50 + 1), level: 1, blocks: blocks.slice(b, b + 50) });
      }
    }
    var meta = await pdf.getMetadata().catch(function () { return null; });
    var title = meta && meta.info && meta.info.Title;
    pdf.destroy();
    return { title: title || name.replace(/\.[^.]+$/, ''), chapters: chapters.filter(function (c) { return c.blocks.length; }) };
  }

  window.Reader = {
    parseFile: function (file, progress) {
      var read = file.arrayBuffer ? file.arrayBuffer() : new Promise(function (res, rej) {
        var fr = new FileReader();
        fr.onload = function () { res(fr.result); };
        fr.onerror = function () { rej(fr.error || new Error('Не удалось прочитать файл')); };
        fr.readAsArrayBuffer(file);
      });
      return read.then(function (buf) {
        if (/\.pdf$/i.test(file.name) || new TextDecoder('ascii').decode(buf.slice(0, 5)) === '%PDF-') {
          return parsePDF(buf, file.name, progress).then(finish);
        }
        return finish(parseText(buf, file.name));
      });
    }
  };
  function finish(book) {
    if (!book.chapters.length) throw new Error('В файле не найден текст');
    book.words = book.chapters.reduce(function (n, c) {
      return n + c.blocks.reduce(function (m, b) { return m + b.text.split(/\s+/).length; }, 0);
    }, 0);
    return book;
  }
  function parseText(buf, name) {
    var text = decode(buf);
    return /\.fb2$/i.test(name) || /<FictionBook/i.test(text.slice(0, 2000))
      ? parseFB2(text) : parseTXT(text, name);
  }
})();
