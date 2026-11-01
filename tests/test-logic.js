// Jalankan: node tests/test-logic.js
const assert = require('assert');
const PK = require('../js/tree-logic.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { console.error('GAGAL ' + name + '\n     ' + e.message); process.exitCode = 1; }
}

/* ---------- Umur ---------- */
test('umur naik tepat di hari ulang tahun', () => {
  assert.strictEqual(PK.calcAge('2000-11-01', '2026-10-31'), 25);
  assert.strictEqual(PK.calcAge('2000-11-01', '2026-11-01'), 26);
  assert.strictEqual(PK.calcAge('2000-11-01', '2027-10-31'), 26);
  assert.strictEqual(PK.calcAge('2000-11-01', '2027-11-01'), 27);
});
test('umur otomatis bertambah dari tahun ke tahun (dari tanggal lahir yang sama)', () => {
  const ages = [2026, 2027, 2028, 2029].map((y) => PK.calcAge('1990-06-15', y + '-12-31'));
  assert.deepStrictEqual(ages, [36, 37, 38, 39]);
});
test('lahir 29 Februari: naik di 1 Maret pada tahun biasa', () => {
  assert.strictEqual(PK.calcAge('2000-02-29', '2027-02-28'), 26);
  assert.strictEqual(PK.calcAge('2000-02-29', '2027-03-01'), 27);
  assert.strictEqual(PK.calcAge('2000-02-29', '2028-02-29'), 28);
});
test('sudah wafat: umur dihitung sampai tanggal wafat, bukan hari ini', () => {
  const i = PK.info({ birthDate: '1950-05-11', deathDate: '2020-05-10' }, '2030-01-01');
  assert.strictEqual(i.deceased, true);
  assert.strictEqual(i.age, 69);
  assert.strictEqual(i.death, '10 Mei 2020');
});
test('tanggal tidak valid ditolak', () => {
  assert.strictEqual(PK.parseISO('2001-02-30'), null);
  assert.strictEqual(PK.parseISO('2001-13-01'), null);
  assert.strictEqual(PK.parseISO('abc'), null);
  assert.strictEqual(PK.calcAge('2030-01-01', '2026-01-01'), null);
});
test('format tanggal bahasa Indonesia', () => {
  assert.strictEqual(PK.formatDate('1948-03-14'), '14 Maret 1948');
});

/* ---------- Susunan pohon ---------- */
const family = PK.sampleFamily();
const forest = PK.buildForest(family);
const L = PK.layoutForest(forest.roots);
const O = L.options;
const byName = {};
L.cards.forEach((c) => { byName[c.person.id] = c; });

test('semua orang masuk pohon, tidak ada yatim', () => {
  assert.strictEqual(forest.orphans.length, 0);
  assert.strictEqual(L.cards.length, family.length);
});
test('pasangan berdampingan: sejajar, tepat di sebelah kanan', () => {
  [['g1', 'g2'], ['a1', 'a1s'], ['a2', 'a2s'], ['b1', 'b1s']].forEach(([a, b]) => {
    assert.strictEqual(byName[b].y, byName[a].y);
    assert.strictEqual(byName[b].x, byName[a].x + O.cardW + O.coupleGap);
  });
});
test('anak berada satu generasi di bawah orang tuanya', () => {
  const gen = O.cardH + O.levelGap;
  [['a1', 'g1'], ['a2', 'g1'], ['a3', 'g1'], ['b1', 'a1'], ['b2', 'a1'], ['b3', 'a2'], ['c1', 'b1']].forEach(([kid, par]) => {
    assert.strictEqual(byName[kid].y, byName[par].y + gen, kid + ' di bawah ' + par);
  });
});
test('saudara berjajar ke samping, urut dari yang tertua', () => {
  assert.ok(byName.a1.x < byName.a2.x && byName.a2.x < byName.a3.x);
  assert.ok(byName.b1.x < byName.b2.x);
});
test('cucu dan cicit berada di bawah, tidak melebar ke luar keluarganya', () => {
  // Anak-anak Budi & Sari (b1, b2) harus berada di bawah Budi & Sari, bukan di bawah Rina.
  const aLeft = byName.a1.x, aRight = byName.a1s.x + O.cardW;
  const bMid = (byName.b1.x + byName.b2.x + O.cardW) / 2;
  assert.ok(bMid > aLeft && bMid < aRight);
  assert.ok(byName.b3.x > byName.b2.x, 'cucu dari Rina di sebelah kanan cucu dari Budi');
});
test('tidak ada kartu yang bertumpuk di generasi yang sama', () => {
  const rows = {};
  L.cards.forEach((c) => { (rows[c.y] = rows[c.y] || []).push(c); });
  Object.values(rows).forEach((row) => {
    row.sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) assert.ok(row[i].x >= row[i - 1].x + O.cardW, 'tumpang tindih');
  });
});
test('ukuran kanvas memuat semua kartu', () => {
  L.cards.forEach((c) => {
    assert.ok(c.x >= 0 && c.y >= 0);
    assert.ok(c.x + c.w <= L.width && c.y + c.h <= L.height);
  });
});
test('setiap anak punya garis turun ke tepi atas kartunya', () => {
  ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'c1'].forEach((id) => {
    const c = byName[id];
    const cx = c.x + c.w / 2;
    assert.ok(L.lines.some((l) => l.kind === 'child' && l.x2 === cx && l.y2 === c.y && l.x1 === cx), 'garis ke ' + id);
  });
});
test('ada garis ikatan untuk tiap pasangan', () => {
  assert.strictEqual(L.lines.filter((l) => l.kind === 'couple').length, 4);
});
test('beberapa puncak pohon disusun berdampingan tanpa tumpang tindih', () => {
  const two = family.concat([
    { id: 'r2', name: 'Keluarga Lain', birthDate: '1960-01-01', deathDate: '', type: 'root', refId: '' },
    { id: 'r2c', name: 'Anak Lain', birthDate: '1990-01-01', deathDate: '', type: 'child', refId: 'r2' }
  ]);
  const l2 = PK.layoutForest(PK.buildForest(two).roots);
  assert.strictEqual(l2.cards.length, two.length);
  const top = l2.cards.filter((c) => c.depth === 0).sort((a, b) => a.x - b.x);
  for (let i = 1; i < top.length; i++) assert.ok(top[i].x >= top[i - 1].x + O.cardW);
});
test('daftar kosong menghasilkan kanvas kosong', () => {
  const e = PK.layoutForest(PK.buildForest([]).roots);
  assert.strictEqual(e.cards.length, 0);
  assert.strictEqual(e.width, 0);
});
test('data rusak (orang tua tidak ada / saling berputar) tidak bikin crash dan dilaporkan', () => {
  const bad = [
    { id: 'x', name: 'X', birthDate: '2000-01-01', deathDate: '', type: 'child', refId: 'tidak-ada' },
    { id: 'p', name: 'P', birthDate: '1990-01-01', deathDate: '', type: 'child', refId: 'q' },
    { id: 'q', name: 'Q', birthDate: '1991-01-01', deathDate: '', type: 'child', refId: 'p' }
  ];
  const fb = PK.buildForest(bad);
  assert.strictEqual(fb.roots.length, 0);
  assert.strictEqual(fb.orphans.length, 3);
});

/* ---------- Validasi ---------- */
test('anak dari seorang pasangan otomatis jadi anak pasangan itu (satu keluarga)', () => {
  assert.strictEqual(PK.normalizeRef(family, 'child', 'a1s'), 'a1');
  assert.strictEqual(PK.normalizeRef(family, 'child', 'a1'), 'a1');
});
test('satu orang hanya boleh punya satu pasangan', () => {
  assert.ok(PK.validateRelation(family, { type: 'spouse', refId: 'a1' }));
  assert.strictEqual(PK.validateRelation(family, { type: 'spouse', refId: 'a3' }), null);
});
test('pasangan tidak bisa punya pasangan lagi', () => {
  assert.ok(PK.validateRelation(family, { type: 'spouse', refId: 'a1s' }));
});
test('tidak boleh jadi anak diri sendiri atau keturunan sendiri', () => {
  assert.ok(PK.validateRelation(family, { id: 'a1', type: 'child', refId: 'a1' }));
  assert.ok(PK.validateRelation(family, { id: 'a1', type: 'child', refId: 'a1s' }));
  assert.ok(PK.validateRelation(family, { id: 'g1', type: 'child', refId: 'c1' }));
  assert.strictEqual(PK.validateRelation(family, { id: 'b1', type: 'child', refId: 'a2' }), null);
});
test('orang yang punya anak tidak boleh diubah jadi pasangan', () => {
  assert.ok(PK.validateRelation(family, { id: 'a1', type: 'spouse', refId: 'a3' }));
});
test('validasi isian orang', () => {
  const today = '2026-11-01';
  assert.ok(PK.validatePerson({ name: '', birthDate: '2000-01-01' }, today));
  assert.ok(PK.validatePerson({ name: 'A', birthDate: '' }, today));
  assert.ok(PK.validatePerson({ name: 'A', birthDate: '2027-01-01' }, today));
  assert.ok(PK.validatePerson({ name: 'A', birthDate: '2000-01-01', deathDate: '1999-01-01' }, today));
  assert.ok(PK.validatePerson({ name: 'A', birthDate: '2000-01-01', deathDate: '2030-01-01' }, today));
  assert.strictEqual(PK.validatePerson({ name: 'A', birthDate: '2000-01-01', deathDate: '' }, today), null);
  assert.strictEqual(PK.validatePerson({ name: 'A', birthDate: '2000-01-01', deathDate: '2020-01-01' }, today), null);
});
test('keturunan lengkap untuk hapus beruntun', () => {
  const ids = PK.descendantIds(family, 'a1').sort();
  assert.deepStrictEqual(ids, ['a1s', 'b1', 'b1s', 'b2', 'c1']);
  assert.deepStrictEqual(PK.descendantIds(family, 'c1'), []);
});

console.log('\n' + passed + ' tes lulus' + (process.exitCode ? ', ada yang gagal' : ''));
