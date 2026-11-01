/* Halaman admin: login, form anggota, daftar anggota. */
(function () {
  'use strict';

  var PK = window.PK, DB = window.PKDB;
  var $ = function (id) { return document.getElementById(id); };

  var people = [];
  var editingId = null;
  var firstLoad = true;

  var f = {
    form: $('person-form'), name: $('f-name'), birth: $('f-birth'), death: $('f-death'),
    type: $('f-type'), refWrap: $('ref-wrap'), refLabel: $('ref-label'), ref: $('f-ref'),
    photoUrl: $('f-photo-url'), photoFile: $('f-photo-file'), photoPreview: $('photo-preview'),
    title: $('form-title'), submit: $('f-submit'), cancel: $('f-cancel'), msg: $('f-msg')
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function setPhotoPreview(url) {
    if (!url) {
      f.photoPreview.hidden = true;
      f.photoPreview.removeAttribute('src');
      return;
    }
    f.photoPreview.src = url;
    f.photoPreview.hidden = false;
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  f.birth.max = todayISO();
  f.death.max = todayISO();

  if (DB.mode === 'demo') {
    var banner = $('demo-banner');
    banner.hidden = false;
    banner.textContent = 'Mode demo: data hanya tersimpan di browser ini. Masuk dengan admin@demo.local dan kata sandi demo123. Isi js/config.js untuk memakai Firebase.';
    $('email').value = 'admin@demo.local';
  }

  /* ---------- Login ---------- */

  function loginError(e) {
    var c = (e && e.code) || '';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-email') {
      return 'Email atau kata sandi salah.';
    }
    if (c === 'auth/too-many-requests') return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
    if (c === 'auth/network-request-failed') return 'Tidak ada koneksi internet. Coba lagi.';
    return 'Tidak bisa masuk. Coba lagi.';
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('login-msg'), btn = $('login-btn');
    msg.textContent = '';
    var email = $('email').value.trim(), pw = $('password').value;
    if (!email || !pw) { msg.textContent = 'Isi email dan kata sandi.'; return; }
    btn.disabled = true;
    DB.login(email, pw)
      .then(function () { $('password').value = ''; })
      .catch(function (err) { msg.textContent = loginError(err); })
      .then(function () { btn.disabled = false; });
  });

  $('logout').addEventListener('click', function () { DB.logout(); });

  DB.onAuth(function (user) {
    $('view-login').hidden = !!user;
    $('view-app').hidden = !user;
    $('logout').hidden = !user;
    $('who').textContent = user ? user.email : '';
    if (!user) resetForm();
  });

  /* ---------- Susunan daftar ---------- */

  function flatten(forest) {
    var out = [];
    function walk(u, depth, parentNames) {
      out.push({ p: u.main, depth: depth, label: parentNames ? 'Anak dari ' + parentNames : 'Paling atas di pohon' });
      if (u.spouse) out.push({ p: u.spouse, depth: depth, label: 'Pasangan dari ' + u.main.name });
      var names = u.spouse ? u.main.name + ' & ' + u.spouse.name : u.main.name;
      u.children.forEach(function (c) { walk(c, depth + 1, names); });
    }
    forest.roots.forEach(function (r) { walk(r, 0, ''); });
    return out;
  }

  function ageText(p) {
    var i = PK.info(p);
    var a = i.age == null ? '?' : i.age;
    return i.deceased ? 'Wafat, ' + a + ' tahun' : a + ' tahun';
  }

  function buildRow(p, depth, label) {
    var li = el('li', 'member');
    li.style.setProperty('--depth', depth);

    var avatarWrap = el('div', 'member-avatar-wrap');
    var avatar = document.createElement('img');
    if (p.photoUrl) {
      avatar.className = 'member-avatar';
      avatar.src = p.photoUrl;
      avatar.alt = 'Foto ' + p.name;
      avatar.loading = 'lazy';
    } else {
      avatar.className = 'member-avatar placeholder';
      avatar.alt = 'Foto ' + p.name;
      avatar.textContent = '';
      avatar.setAttribute('data-initials', (p.name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part[0].toUpperCase(); }).join('') || 'K');
    }
    if (!p.photoUrl) {
      avatar.textContent = (p.name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part[0].toUpperCase(); }).join('') || 'K';
      avatar.classList.add('placeholder');
    }
    avatarWrap.appendChild(avatar);
    li.appendChild(avatarWrap);

    var info = el('div', 'member-info');
    info.appendChild(el('strong', 'member-name', p.name));
    info.appendChild(el('span', 'member-rel', label));
    li.appendChild(info);

    li.appendChild(el('span', 'member-age', ageText(p)));

    var act = el('div', 'member-actions');
    var edit = el('button', 'btn btn-small', 'Ubah');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Ubah ' + p.name);
    edit.addEventListener('click', function () { startEdit(p); });
    var del = el('button', 'btn btn-small btn-danger', 'Hapus');
    del.type = 'button';
    del.setAttribute('aria-label', 'Hapus ' + p.name);
    del.addEventListener('click', function () { removePerson(p); });
    act.appendChild(edit);
    act.appendChild(del);
    li.appendChild(act);
    return li;
  }

  function renderList() {
    var list = $('member-list'), ol = $('orphan-list');
    list.textContent = '';
    ol.textContent = '';
    var forest = PK.buildForest(people);
    var flat = flatten(forest);

    if (!flat.length && !forest.orphans.length) {
      list.appendChild(el('li', 'empty-row', 'Belum ada anggota. Mulai dengan menambahkan orang yang paling atas di pohon, misalnya kakek.'));
    }
    flat.forEach(function (r) { list.appendChild(buildRow(r.p, r.depth, r.label)); });

    $('orphans').hidden = !forest.orphans.length;
    forest.orphans.forEach(function (p) { ol.appendChild(buildRow(p, 0, 'Hubungan keluarga tidak valid')); });
  }

  /* ---------- Pilihan "Anak dari / Pasangan dari" ---------- */

  function refreshRefOptions() {
    var type = f.type.value;
    f.refWrap.hidden = type === 'root';
    f.refLabel.textContent = type === 'spouse' ? 'Pasangan dari' : 'Anak dari';
    if (type === 'root') return;

    var keep = f.ref.value;
    f.ref.textContent = '';
    var placeholder = el('option', null, 'Pilih anggota keluarga');
    placeholder.value = '';
    f.ref.appendChild(placeholder);

    var byId = {};
    people.forEach(function (p) { byId[p.id] = p; });
    var blocked = {};
    if (editingId) {
      blocked[editingId] = true;
      PK.descendantIds(people, editingId).forEach(function (id) { blocked[id] = true; });
    }

    flatten(PK.buildForest(people)).forEach(function (r) {
      var p = r.p;
      if (blocked[p.id]) return;
      if (type === 'spouse') {
        if (p.type === 'spouse') return;
        var hasSpouse = people.some(function (x) { return x.type === 'spouse' && x.refId === p.id && x.id !== editingId; });
        if (hasSpouse) return;
      }
      var text = p.name;
      var year = PK.parseISO(p.birthDate);
      if (year) text += ' (lahir ' + year.y + ')';
      if (p.type === 'spouse' && byId[p.refId]) text = p.name + ' (pasangan ' + byId[p.refId].name + ')';
      var o = el('option', null, '  '.repeat(r.depth) + text);
      o.value = p.id;
      f.ref.appendChild(o);
    });

    if (keep && Array.prototype.some.call(f.ref.options, function (o) { return o.value === keep; })) f.ref.value = keep;
  }

  f.type.addEventListener('change', refreshRefOptions);

  /* ---------- Form ---------- */

  function setMsg(text, kind) {
    f.msg.textContent = text || '';
    f.msg.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function resetForm(keepMsg) {
    editingId = null;
    f.name.value = '';
    f.birth.value = '';
    f.death.value = '';
    f.photoUrl.value = '';
    f.photoFile.value = '';
    setPhotoPreview('');
    f.title.textContent = 'Tambah anggota';
    f.submit.textContent = 'Tambah anggota';
    f.cancel.hidden = true;
    if (!keepMsg) setMsg('');
    refreshRefOptions();
  }

  function startEdit(p) {
    editingId = p.id;
    f.name.value = p.name || '';
    f.birth.value = p.birthDate || '';
    f.death.value = p.deathDate || '';
    f.photoUrl.value = p.photoUrl || '';
    setPhotoPreview(p.photoUrl || '');
    f.type.value = p.type || 'root';
    refreshRefOptions();
    if (p.type !== 'root') f.ref.value = p.refId || '';
    f.title.textContent = 'Ubah anggota';
    f.submit.textContent = 'Simpan perubahan';
    f.cancel.hidden = false;
    setMsg('');
    f.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    f.name.focus();
  }

  f.cancel.addEventListener('click', function () { resetForm(); });

  f.photoFile.addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setMsg('File yang dipilih harus berupa gambar.', 'error');
      this.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMsg('Ukuran foto maksimal 4 MB.', 'error');
      this.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var result = reader.result;
      f.photoUrl.value = result;
      setPhotoPreview(result);
      setMsg('Foto siap disimpan.', 'ok');
    };
    reader.onerror = function () {
      setMsg('Foto tidak bisa dibaca. Coba file lain.', 'error');
    };
    reader.readAsDataURL(file);
  });

  f.photoUrl.addEventListener('input', function () {
    setPhotoPreview(this.value.trim());
  });

  function saveError(e) {
    var c = (e && e.code) || '';
    if (c === 'permission-denied') return 'Akun ini tidak punya izin mengubah data. Cek UID admin di firestore.rules.';
    if (c === 'unavailable' || c === 'auth/network-request-failed') return 'Tidak ada koneksi internet. Coba lagi.';
    return 'Gagal menyimpan. Coba lagi.';
  }

  f.form.addEventListener('submit', function (e) {
    e.preventDefault();
    setMsg('');
    var type = f.type.value;
    var draft = {
      id: editingId,
      name: f.name.value.trim(),
      birthDate: f.birth.value,
      deathDate: f.death.value,
      photoUrl: f.photoUrl.value.trim(),
      type: type,
      refId: type === 'root' ? '' : f.ref.value
    };
    var err = PK.validatePerson(draft) || PK.validateRelation(people, draft);
    if (err) { setMsg(err, 'error'); return; }
    if (type === 'child') draft.refId = PK.normalizeRef(people, 'child', draft.refId);

    var wasEditing = !!editingId;
    f.submit.disabled = true;
    DB.save(draft)
      .then(function () {
        if (wasEditing) {
          resetForm(true);
          setMsg('Perubahan disimpan.', 'ok');
        } else {
          f.name.value = '';
          f.birth.value = '';
          f.death.value = '';
          f.photoUrl.value = '';
          f.photoFile.value = '';
          setPhotoPreview('');
          setMsg('Anggota ditambahkan.', 'ok');
          f.name.focus();
        }
      })
      .catch(function (er) { setMsg(saveError(er), 'error'); })
      .then(function () { f.submit.disabled = false; });
  });

  /* ---------- Hapus ---------- */

  function removePerson(p) {
    var ids = [p.id].concat(PK.descendantIds(people, p.id));
    var extra = ids.length - 1;
    var text = 'Hapus "' + p.name + '"' + (extra ? ' beserta ' + extra + ' pasangan dan keturunannya' : '') + '? Ini tidak bisa dibatalkan.';
    if (!window.confirm(text)) return;
    $('list-msg').textContent = '';
    DB.remove(ids)
      .then(function () { if (editingId && ids.indexOf(editingId) !== -1) resetForm(); })
      .catch(function (er) { $('list-msg').textContent = saveError(er).replace('menyimpan', 'menghapus'); });
  }

  /* ---------- Alat mode demo ---------- */

  if (DB.seedDemo) {
    var tools = $('demo-tools');
    var seed = el('button', 'btn btn-small', 'Isi data contoh');
    seed.type = 'button';
    seed.addEventListener('click', function () {
      if (!people.length || window.confirm('Data demo yang ada akan diganti data contoh. Lanjut?')) DB.seedDemo();
    });
    var clear = el('button', 'btn btn-small', 'Kosongkan');
    clear.type = 'button';
    clear.addEventListener('click', function () {
      if (window.confirm('Hapus semua data demo?')) { DB.clearDemo(); resetForm(); }
    });
    tools.appendChild(seed);
    tools.appendChild(clear);
  }

  /* ---------- Data masuk ---------- */

  DB.subscribe(function (list) {
    people = list;
    if (firstLoad) {
      f.type.value = people.length ? 'child' : 'root';
      firstLoad = false;
    }
    renderList();
    refreshRefOptions();
    $('list-msg').textContent = '';
  }, function () {
    $('list-msg').textContent = 'Data belum bisa dimuat. Periksa koneksi dan pengaturan Firebase.';
  });
})();
