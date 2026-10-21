/* Глобальные настройки чтения и озвучка (Web Speech API, работает офлайн
   в большинстве браузеров; голос — системный). */
(function () {
  var root = document.documentElement;
  var KEY = 'sbm-prefs';
  var def = { fs: 1, align: 'left', font: 'auto', rate: 1, voice: '' };
  var prefs;
  try { prefs = Object.assign({}, def, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { prefs = Object.assign({}, def); }

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
  /* Онлайн-голоса (Microsoft «Online/Natural», Google) ходят в облако: при блокировке сети,
     VPN или фаерволе они молчат. Поэтому: по умолчанию — голоса устройства, а голос, который
     не отозвался, помечаем «плохим» и переходим к следующему. */
  var bad = {};
  try { bad = JSON.parse(sessionStorage.getItem('sbm-badvoices') || '{}'); } catch (e) { bad = {}; }
  function isLocal(v) { return !!v && (v.localService === true || (v.localService === undefined && !/online|natural|google|yandex/i.test(v.name))); }
  function candidates() { var c = voices.filter(function (v) { return !bad[v.name]; }); return c.length ? c : voices; }
  function pickVoice() {
    var c = candidates();
    if (!c.length) return null;
    return c.find(function (v) { return v.name === prefs.voice; }) ||
      c.filter(isLocal).sort(function (a, b) { return (/irina|svetlana|milena|katya|pavel/i.test(b.name) ? 1 : 0) - (/irina|svetlana|milena|katya|pavel/i.test(a.name) ? 1 : 0); })[0] ||
      c.find(function (v) { return /google|yandex/i.test(v.name); }) || c[0];
  }
  var toastT;
  function toast(msg) {
    var t = document.getElementById('ttsToast');
    if (!t) { t = document.createElement('div'); t.id = 'ttsToast'; t.className = 'tts-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 7000);
  }
  /* голос не отозвался: помечаем и переключаемся на другой; возвращает новый голос или null */
  function failVoice(v, silent) {
    if (!v) return pickVoice();
    bad[v.name] = true;
    try { sessionStorage.setItem('sbm-badvoices', JSON.stringify(bad)); } catch (e) {}
    var next = pickVoice();
    if (next && next.name !== v.name) {
      prefs.voice = next.name; save(); renderVoices();
      if (!silent) toast('Голос «' + v.name.replace(/^Microsoft\s+/, '') + '» не отвечает (онлайн-голосам нужен интернет и доступ к службе речи). Переключил на «' + next.name.replace(/^Microsoft\s+/, '') + '».');
      return next;
    }
    if (!silent) toast('Ни один голос не отвечает. Проверьте звук системы и вкладки, а в настройках Windows — «Речь» и русский голос.');
    return null;
  }
  function testVoice(done) {
    if (!supported) { done('none'); return; }
    try { synth.cancel(); } catch (e) {}
    var tries = 0;
    (function attempt() {
      var v = pickVoice();
      if (!v) { done('none'); return; }
      var u = new SpeechSynthesisUtterance('Проверка голоса. Если вы это слышите, всё работает.'), started = false, over = false;
      u.voice = v; u.lang = v.lang; u.rate = prefs.rate || 1;
      function next() { if (over) return; over = true; try { synth.cancel(); } catch (e) {} failVoice(v, true); if (++tries < Math.max(2, Math.min(voices.length, 5)) && !allBad()) setTimeout(attempt, 300); else done('fail'); }
      u.onstart = function () { started = true; };
      u.onend = function () { if (over) return; over = true; done('ok', v); };
      u.onerror = function (e) { if (e.error === 'interrupted' || e.error === 'canceled') return; next(); };
      synth.speak(u);
      setTimeout(function () { if (!started && !over) next(); }, 3500);
    })();
  }
  function allBad() { return voices.length > 0 && voices.every(function (v) { return bad[v.name]; }); }

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
      ? voices.map(function (v) { return '<option value="' + v.name.replace(/"/g, '&quot;') + '"' + (v === pickVoice() ? ' selected' : '') + '>' + v.name + (isLocal(v) ? ' · на устройстве' : ' · онлайн') + (bad[v.name] ? ' · не отвечает' : '') + '</option>'; }).join('')
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
        '<div class="sp-row"><button class="btn small" data-voicetest>🔊 Проверить голос</button><span id="voiceStat" class="muted" aria-live="polite" style="font-size:.85rem"></span></div>' : '<p class="muted" style="margin:0">Озвучка в этом браузере недоступна.</p>') +
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
        var st = panel.querySelector('#voiceStat'); if (st) st.textContent = 'Проверяю…';
        testVoice(function (r, v) {
          var st2 = panel.querySelector('#voiceStat'); renderVoices();
          if (st2) st2.textContent = r === 'ok' ? 'Работает: «' + v.name.replace(/^Microsoft\s+/, '') + '»' : r === 'none' ? 'Русский голос не найден в системе' : 'Ни один голос не ответил. Проверьте звук системы и вкладки.';
        });
        return;
      }
      if (b.dataset.fs) prefs.fs = Math.round(Math.max(0.85, Math.min(1.5, prefs.fs + (+b.dataset.fs) * 0.05)) * 100) / 100;
      else if (b.dataset.set) prefs[b.dataset.set] = b.dataset.set === 'rate' ? +b.dataset.val : b.dataset.val;
      else if (b.hasAttribute('data-reset')) prefs = Object.assign({}, def);
      else if (b.hasAttribute('data-close')) { open(false); return; }
      else if (b.hasAttribute('data-howto')) { open(false); if (window.Onboarding) Onboarding.tour(); return; }
      save(); apply(); render();
    });
  }

  window.Prefs = { get: function () { return prefs; } };
  window.TTS = { supported: supported, voice: pickVoice, fail: failVoice, test: testVoice, isLocal: isLocal, toast: toast };
})();
