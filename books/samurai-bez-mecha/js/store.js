/* Хранилище: мелкие настройки — localStorage, текст книги — IndexedDB.
   Всё обёрнуто в try/catch, чтобы приложение работало и без хранилища. */
(function () {
  var P = 'sbm-';
  var mem = {};

  function get(key, def) {
    try {
      var v = localStorage.getItem(P + key);
      return v === null ? def : JSON.parse(v);
    } catch (e) { return key in mem ? mem[key] : def; }
  }
  function set(key, val) {
    mem[key] = val;
    try { localStorage.setItem(P + key, JSON.stringify(val)); } catch (e) {}
  }

  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('samurai-bez-mecha', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  function idb(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var tx = d.transaction('kv', mode);
        var req = fn(tx.objectStore('kv'));
        tx.oncomplete = function () { res(req && req.result); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  var big = {};
  window.Store = {
    get: get,
    set: set,
    getBig: function (k) {
      return idb('readonly', function (s) { return s.get(k); })
        .catch(function () { return big[k]; });
    },
    setBig: function (k, v) {
      big[k] = v;
      return idb('readwrite', function (s) { return s.put(v, k); }).catch(function () {});
    },
    delBig: function (k) {
      delete big[k];
      return idb('readwrite', function (s) { return s.delete(k); }).catch(function () {});
    }
  };
})();
