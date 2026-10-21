/* Глобальные настройки чтения и озвучка (Web Speech API, работает офлайн
   в большинстве браузеров; голос — системный). */
(function () {
  var root = document.documentElement;
  var KEY = 'sbm-prefs';
  var def = { fs: 1, align: 'left', font: 'auto', rate: 1, voice: '', vv: 2 };
  var prefs, stored = {};
  try { stored = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; prefs = Object.assign({}, def, stored); } catch (e) { prefs = Object.assign({}, def); }

  // однократный сброс голоса: прежние версии могли сохранить локальный голос автоматически
  if (stored.vv !== 2) { prefs.voice = ''; prefs.vv = 2; try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }
  function apply() {
    root.style.setProperty('--fs', prefs.fs);
    root.dataset.align = prefs.align;
    root.dataset.font = prefs.font;
  }
  apply();

  /* ---------- Озвучка ---------- */
  var synth = window.speechSynthesis, queue = [], curBtn = null, voices = [];
  var supported = !!(synth && window.SpeechSynthesisUtterance);
  function loadVoices() {
    if (!supported) return;
    voices = synth.getVoices().filter(function (v) { return /^ru/i.test(v.lang); });
    renderVoices();
  }
  if (supported) { loadVoices(); synth.onvoiceschanged = loadVoices; }
  /* Онлайн-голоса (Microsoft «Online/Natural», Google) ходят в облако: если служба речи
     недоступна (интернет, VPN, фаервол), голос не загружается. Мы это ПОКАЗЫВАЕМ: окно с
     причиной и кнопками «Повторить» / «Взять другой голос». Выбранный голос молча не меняем. */
  var bad = {};
  try { bad = JSON.parse(sessionStorage.getItem('sbm-badvoices') || '{}'); } catch (e) { bad = {}; }
  function saveBad() { try { sessionStorage.setItem('sbm-badvoices', JSON.stringify(bad)); } catch (e) {} }
  function isLocal(v) { return !!v && (v.localService === true || (v.localService === undefined && !/online|natural|google|yandex/i.test(v.name))); }
  var LOCALPREF = /irina|svetlana|milena|katya|pavel|ирина|светлана|павел/i;
  function bestLocal(list) {
    var l = list.filter(isLocal);
    return l.sort(function (a, b) { return (LOCALPREF.test(b.name) ? 1 : 0) - (LOCALPREF.test(a.name) ? 1 : 0); })[0] || null;
  }
  /* по умолчанию — онлайн-голос (качественнее): сначала Microsoft «Natural», затем Google/Yandex, затем голос устройства */
  function best(list) {
    var online = list.filter(function (v) { return !isLocal(v); });
    return online.find(function (v) { return /natural/i.test(v.name); }) ||
      online.find(function (v) { return /google|yandex/i.test(v.name); }) || online[0] || bestLocal(list) || list[0] || null;
  }
  function pickVoice() {
    if (!voices.length) return null;
    var sel = voices.find(function (v) { return v.name === prefs.voice; });
    if (sel) return sel;
    var ok = voices.filter(function (v) { return !bad[v.name]; });
    return best(ok.length ? ok : voices);
  }
  /* что предложить, если голос не загрузился: для онлайн-голоса — голос устройства (он точно без интернета) */
  function altVoice(name) {
    var failed = voices.find(function (v) { return v.name === name; });
    var rest = voices.filter(function (v) { return v.name !== name; }), ok = rest.filter(function (v) { return !bad[v.name]; });
    if (failed && !isLocal(failed)) return bestLocal(ok) || bestLocal(rest) || best(ok) || best(rest);
    return best(ok) || best(rest);
  }
  function short(n) { return String(n).replace(/^Microsoft\s+/, ''); }

  var noticeEl = null, resumeCb = null, noticeVoice = '', noticeAlt = '';
  function hideNotice() { if (noticeEl) noticeEl.classList.remove('on'); resumeCb = null; }
  function showNotice(v, resume) {
    if (!noticeEl) {
      noticeEl = document.createElement('div'); noticeEl.id = 'ttsNotice'; noticeEl.className = 'tts-notice'; noticeEl.setAttribute('role', 'alert');
      document.body.appendChild(noticeEl);
      noticeEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tn]'); if (!b) return;
        var act = b.dataset.tn, cb = resumeCb;
        if (act === 'retry') { delete bad[noticeVoice]; saveBad(); hideNotice(); renderVoices(); if (cb) cb(); }
        else if (act === 'alt') { prefs.voice = noticeAlt; save(); delete bad[noticeAlt]; saveBad(); hideNotice(); renderVoices(); if (cb) cb(); }
        else if (act === 'open') { hideNotice(); var pb = document.getElementById('prefsBtn'); if (pb) pb.click(); }
        else hideNotice();
      });
    }
    var alt = altVoice(v.name);
    noticeVoice = v.name; noticeAlt = alt ? alt.name : ''; resumeCb = resume || null;
    var why = isLocal(v)
      ? 'Голос установлен на устройстве, но не заговорил. Проверьте, что звук включён в системе и именно в этой вкладке браузера, и что выбран нужный выход звука.'
      : 'Это онлайн-голос: ему нужен интернет и доступ к службе речи (Microsoft или Google). Её могут блокировать VPN, фаервол, антивирус или сеть.';
    noticeEl.innerHTML = '<b>Голос «' + short(v.name).replace(/</g, '&lt;') + '» не загрузился</b><span>' + why + '</span><div class="tn-btns">' +
      '<button data-tn="retry">Повторить</button>' +
      (alt ? '<button data-tn="alt">Взять «' + short(alt.name).replace(/</g, '&lt;') + '» · ' + (isLocal(alt) ? 'на устройстве' : 'онлайн') + '</button>' : '') +
      '<button data-tn="open">Настройки голоса</button><button data-tn="x" class="tn-x" aria-label="Закрыть">✕</button></div>';
    noticeEl.classList.add('on');
  }
  /* голос не заговорил: показываем это; resume — что сделать после выбора пользователя */
  function failVoice(v, resume) {
    if (!v) return;
    bad[v.name] = true; saveBad(); renderVoices();
    showNotice(v, resume);
  }
  function okVoice() { if (noticeEl && noticeEl.classList.contains('on')) hideNotice(); }

  /* проверка: сначала выбранный голос; если не отвечает — ищем рабочий и предлагаем его */
  function testVoice(progress, done) {
    if (!supported) { done({ results: [] }); return; }
    try { synth.cancel(); } catch (e) {}
    var order = [], results = [];
    var cur = pickVoice(); if (cur) order.push(cur);
    voices.forEach(function (v) { if (order.indexOf(v) < 0) order.push(v); });
    order = order.slice(0, 5);
    (function step(i) {
      if (i >= order.length) { done({ results: results }); return; }
      var v = order[i], started = false, over = false;
      progress('Проверяю «' + short(v.name) + '»…');
      var u = new SpeechSynthesisUtterance('Проверка голоса. Если вы это слышите, всё работает.');
      u.voice = v; u.lang = v.lang; u.rate = prefs.rate || 1;
      function end(ok) { if (over) return; over = true; try { synth.cancel(); } catch (e) {} results.push({ v: v, ok: ok }); if (ok || i === order.length - 1) { done({ results: results }); } else setTimeout(function () { step(i + 1); }, 250); }
      u.onstart = function () { started = true; };
      u.onend = function () { end(true); };
      u.onerror = function (e) { if (e.error === 'interrupted' || e.error === 'canceled') return; end(false); };
      synth.speak(u);
      setTimeout(function () { if (!started && !over) end(false); }, 3500);
    })(0);
  }

  /* ---------- Панель настроек ---------- */
  var panel, btn;
  function seg(name, opts, cur) {
    return '<div class="seg" role="group">' + opts.map(function (o) {
      return '<button data-set="' + name + '" data-val="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  function renderVoices() {
    var sel = panel && panel.querySelector('#voiceSel');
    if (!sel) return;
    sel.innerHTML = voices.length
      ? voices.map(function (v) { return '<option value="' + v.name.replace(/"/g, '&quot;') + '"' + (v === pickVoice() ? ' selected' : '') + '>' + v.name + (isLocal(v) ? ' · на устройстве' : ' · онлайн') + (bad[v.name] ? ' · не загрузился' : '') + '</option>'; }).join('')
      : '<option>Русский голос не найден в системе</option>';
  }
  function render() {
    panel.innerHTML =
      '<div class="sp-row"><span>Размер текста</span><div class="seg">' +
        '<button data-fs="-1" aria-label="Меньше">A−</button><output>' + Math.round(prefs.fs * 100) + '%</output><button data-fs="1" aria-label="Больше">A+</button></div></div>' +
      '<div class="sp-row"><span>Выравнивание</span>' + seg('align', [['left', 'По левому краю'], ['justify', 'По ширине']], prefs.align) + '</div>' +
      '<div class="sp-row"><span>Шрифт</span>' + seg('font', [['auto', 'Как задумано'], ['serif', 'С засечками'], ['sans', 'Без засечек']], prefs.font) + '</div>' +
      '<div class="sp-row"><span>Скорость чтения</span>' + seg('rate', [[0.8, '0.8×'], [1, '1×'], [1.25, '1.25×'], [1.5, '1.5×']], prefs.rate) + '</div>' +
      (supported ? '<div class="sp-row"><span>Голос</span><select id="voiceSel"></select></div>' +
        '<div class="sp-row"><button class="btn small" data-voicetest>🔊 Проверить голос</button><span id="voiceStat" class="muted" aria-live="polite" style="font-size:.85rem;line-height:1.5"></span></div>' : '<p class="muted" style="margin:0">Озвучка в этом браузере недоступна.</p>') +
      '<div class="sp-row end"><button class="link-btn" data-reset>Сбросить</button><button class="link-btn" data-howto>Как пользоваться?</button><button class="btn small primary" data-close>Готово</button></div>';
    renderVoices();
  }
  function open(on) {
    panel.hidden = !on; btn.setAttribute('aria-expanded', on);
    if (on) render();
  }
  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
  var inited = false;
  function init() {
    if (inited) return; inited = true;
    btn = document.getElementById('prefsBtn');
    panel = document.getElementById('prefsPanel');
    if (!btn || !panel) return;
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(panel.hidden); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) open(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { open(false); btn.focus(); } });
    panel.addEventListener('change', function (e) { if (e.target.id === 'voiceSel') { prefs.voice = e.target.value; delete bad[e.target.value]; try { sessionStorage.setItem('sbm-badvoices', JSON.stringify(bad)); } catch (x) {} save(); } });
    panel.addEventListener('click', function (e) {
      e.stopPropagation(); // панель перерисовывается, а целевая кнопка исчезает из DOM
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-voicetest')) {
        var st = panel.querySelector('#voiceStat');
        testVoice(function (m) { var x = panel.querySelector('#voiceStat'); if (x) x.textContent = m; }, function (r) {
          var x = panel.querySelector('#voiceStat'); if (!x) return;
          if (!r.results.length) { x.textContent = 'Русский голос не найден в системе'; return; }
          var out = [], good = null;
          r.results.forEach(function (it) { if (it.ok) { good = it.v; out.push('✓ «' + short(it.v.name) + '» работает'); } else { bad[it.v.name] = true; out.push('✗ «' + short(it.v.name) + '» не загрузился'); } });
          saveBad(); renderVoices();
          x.innerHTML = out.join('<br>') + (good && good.name !== (pickVoice() || {}).name ? '<br><button class="link-btn" data-usevoice="' + good.name.replace(/"/g, '&quot;') + '">Использовать «' + short(good.name) + '»</button>' : '') +
            (!good ? '<br>Ни один голос не ответил. Проверьте звук в системе и в этой вкладке, а в Windows — «Речь» и русский голос.' : '');
        });
        return;
      }
      if (b.dataset.usevoice) { prefs.voice = b.dataset.usevoice; delete bad[prefs.voice]; saveBad(); save(); render(); return; }
      if (b.dataset.fs) prefs.fs = Math.round(Math.max(0.85, Math.min(1.5, prefs.fs + (+b.dataset.fs) * 0.05)) * 100) / 100;
      else if (b.dataset.set) prefs[b.dataset.set] = b.dataset.set === 'rate' ? +b.dataset.val : b.dataset.val;
      else if (b.hasAttribute('data-reset')) prefs = Object.assign({}, def);
      else if (b.hasAttribute('data-close')) { open(false); return; }
      else if (b.hasAttribute('data-howto')) { open(false); if (window.Onboarding) Onboarding.tour(); return; }
      save(); apply(); render();
    });
  }

  window.Prefs = { get: function () { return prefs; } };
  window.TTS = { supported: supported, voice: pickVoice, fail: failVoice, ok: okVoice, test: testVoice, isLocal: isLocal };
})();
