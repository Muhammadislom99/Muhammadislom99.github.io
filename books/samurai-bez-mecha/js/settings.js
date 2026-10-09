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
  function pickVoice() {
    if (!voices.length) return null;
    return voices.find(function (v) { return v.name === prefs.voice; }) ||
      voices.find(function (v) { return /google|yandex|milena|natural|online/i.test(v.name); }) || voices[0];
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
      ? voices.map(function (v) { return '<option value="' + v.name.replace(/"/g, '&quot;') + '"' + (v === pickVoice() ? ' selected' : '') + '>' + v.name + '</option>'; }).join('')
      : '<option>Русский голос не найден в системе</option>';
  }
  function render() {
    panel.innerHTML =
      '<div class="sp-row"><span>Размер текста</span><div class="seg">' +
        '<button data-fs="-1" aria-label="Меньше">A−</button><output>' + Math.round(prefs.fs * 100) + '%</output><button data-fs="1" aria-label="Больше">A+</button></div></div>' +
      '<div class="sp-row"><span>Выравнивание</span>' + seg('align', [['left', 'По левому краю'], ['justify', 'По ширине']], prefs.align) + '</div>' +
      '<div class="sp-row"><span>Шрифт</span>' + seg('font', [['auto', 'Как задумано'], ['serif', 'С засечками'], ['sans', 'Без засечек']], prefs.font) + '</div>' +
      '<div class="sp-row"><span>Скорость чтения</span>' + seg('rate', [[0.8, '0.8×'], [1, '1×'], [1.25, '1.25×'], [1.5, '1.5×']], prefs.rate) + '</div>' +
      (supported ? '<div class="sp-row"><span>Голос</span><select id="voiceSel"></select></div>' : '<p class="muted" style="margin:0">Озвучка в этом браузере недоступна.</p>') +
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
    panel.addEventListener('change', function (e) { if (e.target.id === 'voiceSel') { prefs.voice = e.target.value; save(); } });
    panel.addEventListener('click', function (e) {
      e.stopPropagation(); // панель перерисовывается, а целевая кнопка исчезает из DOM
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fs) prefs.fs = Math.round(Math.max(0.85, Math.min(1.5, prefs.fs + (+b.dataset.fs) * 0.05)) * 100) / 100;
      else if (b.dataset.set) prefs[b.dataset.set] = b.dataset.set === 'rate' ? +b.dataset.val : b.dataset.val;
      else if (b.hasAttribute('data-reset')) prefs = Object.assign({}, def);
      else if (b.hasAttribute('data-close')) { open(false); return; }
      else if (b.hasAttribute('data-howto')) { open(false); if (window.Onboarding) Onboarding.open(0); return; }
      save(); apply(); render();
    });
  }

  window.Prefs = { get: function () { return prefs; } };
  window.TTS = { supported: supported, voice: pickVoice };
})();
