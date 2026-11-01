/* Lapisan data. Dua mode dengan antarmuka sama (window.PKDB):
   - firebase : Firestore + Firebase Auth (dipakai kalau js/config.js sudah diisi)
   - demo     : localStorage di browser ini, untuk mencoba tanpa server */
(function () {
  'use strict';

  var cfg = window.FIREBASE_CONFIG || {};
  var live = !!cfg.apiKey && cfg.apiKey.indexOf('ISI_') !== 0 && typeof firebase !== 'undefined';
  var COL = 'people';
  var api = { mode: live ? 'firebase' : 'demo' };

  function clean(p) {
    return {
      name: String(p.name || '').trim(),
      birthDate: p.birthDate || '',
      deathDate: p.deathDate || '',
      type: p.type || 'root',
      refId: p.type === 'root' ? '' : (p.refId || '')
    };
  }

  if (live) {
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    var fs = firebase.firestore();
    var auth = firebase.auth ? firebase.auth() : null;

    api.subscribe = function (cb, onError) {
      return fs.collection(COL).onSnapshot(function (snap) {
        cb(snap.docs.map(function (d) {
          var x = d.data();
          x.id = d.id;
          return x;
        }));
      }, function (err) { if (onError) onError(err); });
    };

    api.save = function (p) {
      var id = p.id || fs.collection(COL).doc().id;
      return fs.collection(COL).doc(id).set(clean(p)).then(function () { return id; });
    };

    api.remove = function (ids) {
      var batch = fs.batch();
      ids.forEach(function (id) { batch.delete(fs.collection(COL).doc(id)); });
      return batch.commit();
    };

    api.login = function (email, password) { return auth.signInWithEmailAndPassword(email, password); };
    api.logout = function () { return auth.signOut(); };
    api.onAuth = function (cb) {
      if (!auth) { cb(null); return function () {}; }
      return auth.onAuthStateChanged(function (u) { cb(u ? { email: u.email, uid: u.uid } : null); });
    };
  } else {
    var KEY = 'pk_demo_people';
    var SESSION = 'pk_demo_user';
    var listeners = [];
    var authListeners = [];

    var read = function () {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
    };
    var emit = function () { var d = read(); listeners.forEach(function (f) { f(d); }); };
    var write = function (arr) { localStorage.setItem(KEY, JSON.stringify(arr)); emit(); };
    var newId = function () { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
    var currentUser = function () {
      try { return sessionStorage.getItem(SESSION) ? { email: 'admin@demo.local', uid: 'demo' } : null; } catch (e) { return null; }
    };
    var emitAuth = function () { var u = currentUser(); authListeners.forEach(function (f) { f(u); }); };

    window.addEventListener('storage', function (e) { if (e.key === KEY) emit(); });

    api.subscribe = function (cb) {
      listeners.push(cb);
      cb(read());
      return function () { listeners = listeners.filter(function (f) { return f !== cb; }); };
    };

    api.save = function (p) {
      var arr = read();
      var id = p.id || newId();
      var rec = clean(p);
      rec.id = id;
      var i = arr.findIndex(function (x) { return x.id === id; });
      if (i === -1) arr.push(rec); else arr[i] = rec;
      write(arr);
      return Promise.resolve(id);
    };

    api.remove = function (ids) {
      write(read().filter(function (x) { return ids.indexOf(x.id) === -1; }));
      return Promise.resolve();
    };

    api.login = function (email, password) {
      if (email === 'admin@demo.local' && password === 'demo123') {
        try { sessionStorage.setItem(SESSION, '1'); } catch (e) {}
        emitAuth();
        return Promise.resolve();
      }
      return Promise.reject({ code: 'auth/invalid-credential' });
    };
    api.logout = function () {
      try { sessionStorage.removeItem(SESSION); } catch (e) {}
      emitAuth();
      return Promise.resolve();
    };
    api.onAuth = function (cb) {
      authListeners.push(cb);
      cb(currentUser());
      return function () { authListeners = authListeners.filter(function (f) { return f !== cb; }); };
    };

    api.seedDemo = function () { write(window.PK.sampleFamily()); };
    api.clearDemo = function () { write([]); };
  }

  window.PKDB = api;
})();
