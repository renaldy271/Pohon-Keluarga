/* Logika murni pohon keluarga: umur, susunan pohon, validasi.
   Dipakai oleh halaman publik, halaman admin, dan tes (Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PK = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  /* ---------- Tanggal & umur ---------- */

  function parseISO(s) {
    if (typeof s !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return { y: y, m: mo, d: d };
  }

  // Terima Date (pakai tanggal lokal) atau string 'YYYY-MM-DD'.
  function toParts(v) {
    if (v instanceof Date) return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() };
    return parseISO(v);
  }

  function key(p) { return p.y * 10000 + p.m * 100 + p.d; }

  // Umur penuh pada tanggal `ref` (default: hari ini). Naik tepat di hari ulang tahun.
  function calcAge(birthISO, ref) {
    const b = parseISO(birthISO);
    const r = toParts(ref || new Date());
    if (!b || !r) return null;
    let age = r.y - b.y;
    if (r.m < b.m || (r.m === b.m && r.d < b.d)) age--;
    return age < 0 ? null : age;
  }

  function formatDate(iso) {
    const p = parseISO(iso);
    return p ? p.d + ' ' + BULAN[p.m - 1] + ' ' + p.y : '';
  }

  // Data siap tampil untuk satu orang. Jika sudah wafat, umur dihitung sampai tanggal wafat.
  function info(person, today) {
    const deceased = !!person.deathDate;
    return {
      deceased: deceased,
      age: calcAge(person.birthDate, deceased ? person.deathDate : (today || new Date())),
      birth: formatDate(person.birthDate),
      death: deceased ? formatDate(person.deathDate) : ''
    };
  }

  function cmpPerson(a, b) {
    const x = a.birthDate || '', y = b.birthDate || '';
    if (x < y) return -1;
    if (x > y) return 1;
    return (a.name || '').localeCompare(b.name || '');
  }

  /* ---------- Struktur pohon ---------- */

  // Setiap orang punya: type ('root' | 'spouse' | 'child') dan refId.
  //   root   : puncak pohon, tanpa refId
  //   spouse : pasangan dari orang refId (satu pasangan per orang)
  //   child  : anak dari orang refId (anak otomatis ikut pasangan orang itu)
  function buildForest(people) {
    const byId = {};
    people.forEach(function (p) { byId[p.id] = p; });
    const spouseOf = {}, kidsOf = {};

    people.slice().sort(cmpPerson).forEach(function (p) {
      const ref = byId[p.refId];
      if (!ref) return;
      if (p.type === 'spouse' && ref.type !== 'spouse' && !spouseOf[ref.id]) {
        spouseOf[ref.id] = p;
      } else if (p.type === 'child' && ref.type !== 'spouse') {
        (kidsOf[ref.id] = kidsOf[ref.id] || []).push(p);
      }
    });

    const visited = {};
    function unit(p) {
      visited[p.id] = true;
      const sp = spouseOf[p.id] || null;
      if (sp) visited[sp.id] = true;
      const kids = (kidsOf[p.id] || []).filter(function (k) { return !visited[k.id]; }).map(unit);
      return { id: p.id, main: p, spouse: sp, children: kids };
    }

    const roots = people
      .filter(function (p) { return p.type !== 'spouse' && p.type !== 'child'; })
      .sort(cmpPerson)
      .map(unit);

    // Orang yang tidak terjangkau dari puncak mana pun (hubungan rusak / berputar).
    const orphans = people.filter(function (p) { return !visited[p.id]; });
    return { roots: roots, orphans: orphans };
  }

  /* ---------- Susunan (layout) ---------- */

  const DEFAULTS = {
    cardW: 184, cardH: 128,
    coupleGap: 44,   // jarak antar pasangan
    siblingGap: 32,  // jarak antar saudara
    levelGap: 88,    // jarak antar generasi
    rootGap: 80,     // jarak antar puncak pohon
    pad: 40
  };

  // Hasil: kartu (posisi tiap orang) dan garis penghubung.
  // Pasangan bersebelahan; anak di bawah pasangan; saudara berjajar ke samping.
  function layoutForest(roots, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const cards = [], lines = [];
    const m = {}; // metrik per unit: { w, kidsW, x }
    const unitW = function (u) { return u.spouse ? 2 * o.cardW + o.coupleGap : o.cardW; };

    function measure(u) {
      u.children.forEach(measure);
      const n = u.children.length;
      const kidsW = n ? u.children.reduce(function (s, c) { return s + m[c.id].w; }, 0) + (n - 1) * o.siblingGap : 0;
      m[u.id] = { w: Math.max(unitW(u), kidsW), kidsW: kidsW, x: 0 };
    }

    function place(u, left, depth) {
      const y = o.pad + depth * (o.cardH + o.levelGap);
      const x = left + (m[u.id].w - unitW(u)) / 2;
      m[u.id].x = x;
      cards.push({ person: u.main, role: 'main', depth: depth, x: x, y: y, w: o.cardW, h: o.cardH });

      let ax, ay;
      if (u.spouse) {
        const sx = x + o.cardW + o.coupleGap;
        cards.push({ person: u.spouse, role: 'spouse', depth: depth, x: sx, y: y, w: o.cardW, h: o.cardH });
        lines.push({ kind: 'couple', x1: x + o.cardW, y1: y + o.cardH / 2, x2: sx, y2: y + o.cardH / 2 });
        ax = x + o.cardW + o.coupleGap / 2;
        ay = y + o.cardH / 2;
      } else {
        ax = x + o.cardW / 2;
        ay = y + o.cardH;
      }

      if (u.children.length) {
        const busY = y + o.cardH + o.levelGap / 2;
        let cl = left + (m[u.id].w - m[u.id].kidsW) / 2;
        const xs = [ax];
        u.children.forEach(function (c) {
          place(c, cl, depth + 1);
          const cx = m[c.id].x + o.cardW / 2;
          xs.push(cx);
          lines.push({ kind: 'child', x1: cx, y1: busY, x2: cx, y2: y + o.cardH + o.levelGap });
          cl += m[c.id].w + o.siblingGap;
        });
        lines.push({ kind: 'child', x1: ax, y1: ay, x2: ax, y2: busY });
        const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
        if (maxX > minX) lines.push({ kind: 'child', x1: minX, y1: busY, x2: maxX, y2: busY });
      }
    }

    let left = o.pad;
    roots.forEach(function (r, i) {
      measure(r);
      place(r, left, 0);
      left += m[r.id].w + (i < roots.length - 1 ? o.rootGap : 0);
    });

    let maxY = 0;
    cards.forEach(function (c) { maxY = Math.max(maxY, c.y + c.h); });
    return {
      cards: cards,
      lines: lines,
      width: roots.length ? left + o.pad : 0,
      height: roots.length ? maxY + o.pad : 0,
      options: o
    };
  }

  /* ---------- Hubungan & validasi ---------- */

  // Semua orang di bawah `id`: pasangan dan keturunan (rekursif).
  function descendantIds(people, id) {
    const out = {};
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      people.forEach(function (p) {
        if (p.refId === cur && p.id !== id && !out[p.id]) {
          out[p.id] = true;
          stack.push(p.id);
        }
      });
    }
    return Object.keys(out);
  }

  // Anak dari seorang pasangan disimpan sebagai anak dari orang intinya.
  function normalizeRef(people, type, refId) {
    if (type === 'child') {
      const r = people.filter(function (p) { return p.id === refId; })[0];
      if (r && r.type === 'spouse') return r.refId;
    }
    return refId;
  }

  function validatePerson(d, today) {
    const name = (d.name || '').trim();
    if (!name) return 'Isi nama dulu.';
    if (name.length > 80) return 'Nama maksimal 80 karakter.';
    const b = parseISO(d.birthDate);
    if (!b) return 'Isi tanggal lahir yang valid.';
    const t = toParts(today || new Date());
    if (key(b) > key(t)) return 'Tanggal lahir tidak boleh di masa depan.';
    if (d.deathDate) {
      const w = parseISO(d.deathDate);
      if (!w) return 'Tanggal wafat tidak valid.';
      if (key(w) < key(b)) return 'Tanggal wafat tidak boleh sebelum tanggal lahir.';
      if (key(w) > key(t)) return 'Tanggal wafat tidak boleh di masa depan.';
    }
    return null;
  }

  // d = { id?, type, refId }. Kembalikan pesan error, atau null jika aman.
  function validateRelation(people, d) {
    if (d.type === 'root') return null;
    if (d.type !== 'spouse' && d.type !== 'child') return 'Pilih hubungan keluarga.';
    if (!d.refId) return 'Pilih anggota keluarga yang terkait.';
    const target = people.filter(function (p) { return p.id === d.refId; })[0];
    if (!target) return 'Anggota yang dipilih tidak ditemukan.';
    if (d.id && target.id === d.id) return 'Seseorang tidak bisa terhubung ke dirinya sendiri.';

    if (d.type === 'spouse') {
      if (target.type === 'spouse') {
        return target.name + ' sudah tercatat sebagai pasangan orang lain. Pilih anggota intinya.';
      }
      const taken = people.some(function (p) {
        return p.type === 'spouse' && p.refId === target.id && p.id !== d.id;
      });
      if (taken) return target.name + ' sudah punya pasangan.';
      if (d.id && people.some(function (p) { return p.refId === d.id; })) {
        return 'Orang ini masih punya pasangan atau anak. Pindahkan atau hapus mereka dulu.';
      }
      return null;
    }

    const parentId = normalizeRef(people, 'child', d.refId);
    if (d.id) {
      if (parentId === d.id) return 'Seseorang tidak bisa menjadi anak dirinya sendiri.';
      if (descendantIds(people, d.id).indexOf(parentId) !== -1) {
        return 'Keturunan sendiri tidak bisa dijadikan orang tua.';
      }
    }
    return null;
  }

  /* ---------- Data contoh (mode demo & tes) ---------- */

  function sampleFamily() {
    return [
      { id: 'g1', name: 'Hasan Basri', birthDate: '1948-03-14', deathDate: '', type: 'root', refId: '' },
      { id: 'g2', name: 'Siti Aminah', birthDate: '1951-08-02', deathDate: '2019-11-20', type: 'spouse', refId: 'g1' },
      { id: 'a1', name: 'Budi Santoso', birthDate: '1973-05-21', deathDate: '', type: 'child', refId: 'g1' },
      { id: 'a1s', name: 'Sari Wulandari', birthDate: '1975-09-10', deathDate: '', type: 'spouse', refId: 'a1' },
      { id: 'a2', name: 'Rina Marlina', birthDate: '1977-01-30', deathDate: '', type: 'child', refId: 'g1' },
      { id: 'a2s', name: 'Agus Setiawan', birthDate: '1974-12-05', deathDate: '', type: 'spouse', refId: 'a2' },
      { id: 'a3', name: 'Dedi Hermawan', birthDate: '1980-07-17', deathDate: '', type: 'child', refId: 'g1' },
      { id: 'b1', name: 'Aditya Pratama', birthDate: '2001-04-12', deathDate: '', type: 'child', refId: 'a1' },
      { id: 'b1s', name: 'Maya Lestari', birthDate: '2002-10-03', deathDate: '', type: 'spouse', refId: 'b1' },
      { id: 'b2', name: 'Nadia Putri', birthDate: '2005-06-25', deathDate: '', type: 'child', refId: 'a1' },
      { id: 'b3', name: 'Kevin Setiawan', birthDate: '2003-11-08', deathDate: '', type: 'child', refId: 'a2' },
      { id: 'c1', name: 'Arka Pratama', birthDate: '2025-01-15', deathDate: '', type: 'child', refId: 'b1' }
    ];
  }

  return {
    DEFAULTS: DEFAULTS,
    parseISO: parseISO,
    calcAge: calcAge,
    formatDate: formatDate,
    info: info,
    cmpPerson: cmpPerson,
    buildForest: buildForest,
    layoutForest: layoutForest,
    descendantIds: descendantIds,
    normalizeRef: normalizeRef,
    validatePerson: validatePerson,
    validateRelation: validateRelation,
    sampleFamily: sampleFamily
  };
});
