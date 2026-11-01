/* Halaman publik: menggambar pohon keluarga dari data. */
(function () {
  'use strict';

  var PK = window.PK, DB = window.PKDB;
  var SITE = window.SITE_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  var viewport = $('viewport'), sizer = $('sizer'), stage = $('stage'), svg = $('lines'), empty = $('empty');
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var people = [];
  var layout = { width: 0, height: 0, cards: [], lines: [] };
  var scale = 1;
  var firstRender = true;
  var lastDay = new Date().toDateString();

  if (SITE.title) {
    $('site-title').textContent = SITE.title;
    document.title = SITE.title;
  }
  if (DB.mode === 'demo') $('demo-banner').hidden = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function fitScale() {
    return layout.width ? viewport.clientWidth / layout.width : 1;
  }

  function applyScale() {
    sizer.style.width = Math.ceil(layout.width * scale) + 'px';
    sizer.style.height = Math.ceil(layout.height * scale) + 'px';
    stage.style.transform = 'scale(' + scale + ')';
  }

  function buildCard(c) {
    var i = PK.info(c.person);
    var card = el('article', 'card' + (i.deceased ? ' is-deceased' : ''));
    card.style.left = c.x + 'px';
    card.style.top = c.y + 'px';
    card.style.width = c.w + 'px';
    card.style.height = c.h + 'px';

    var name = el('h3', 'card-name', c.person.name);
    name.title = c.person.name;
    card.appendChild(name);

    var age = el('p', 'card-age');
    age.appendChild(el('span', 'age-num', i.age == null ? '?' : String(i.age)));
    age.appendChild(el('span', 'age-unit', i.deceased ? 'tahun saat wafat' : 'tahun'));
    card.appendChild(age);

    var dates = el('p', 'card-dates');
    dates.appendChild(document.createTextNode('Lahir ' + i.birth));
    if (i.deceased) {
      dates.appendChild(document.createElement('br'));
      dates.appendChild(document.createTextNode('Wafat ' + i.death));
    }
    card.appendChild(dates);
    return card;
  }

  function render() {
    var forest = PK.buildForest(people);
    layout = PK.layoutForest(forest.roots);

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    Array.prototype.slice.call(stage.querySelectorAll('.card')).forEach(function (n) { stage.removeChild(n); });

    var hasTree = layout.cards.length > 0;
    empty.hidden = hasTree;
    stage.hidden = !hasTree;

    var gens = 0;
    layout.cards.forEach(function (c) { gens = Math.max(gens, c.depth + 1); });
    $('site-sub').textContent = hasTree
      ? layout.cards.length + ' anggota dalam ' + gens + ' generasi'
      : '';

    if (hasTree) {
      svg.setAttribute('width', layout.width);
      svg.setAttribute('height', layout.height);
      layout.lines.forEach(function (l) {
        var line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', l.x1); line.setAttribute('y1', l.y1);
        line.setAttribute('x2', l.x2); line.setAttribute('y2', l.y2);
        if (l.kind === 'couple') line.setAttribute('class', 'couple');
        svg.appendChild(line);
      });
      layout.cards.forEach(function (c) { stage.appendChild(buildCard(c)); });
    }

    if (firstRender && hasTree) {
      scale = clamp(fitScale(), 0.5, 1);
      firstRender = false;
    }
    applyScale();
  }

  function zoom(delta) { scale = clamp(Math.round((scale + delta) * 100) / 100, 0.2, 1.5); applyScale(); }
  $('zoom-in').addEventListener('click', function () { zoom(0.1); });
  $('zoom-out').addEventListener('click', function () { zoom(-0.1); });
  $('zoom-fit').addEventListener('click', function () { scale = clamp(fitScale(), 0.2, 1); applyScale(); viewport.scrollLeft = 0; });

  DB.subscribe(function (list) {
    people = list;
    render();
  }, function () {
    $('empty-title').textContent = 'Data belum bisa dimuat';
    $('empty-text').textContent = 'Periksa koneksi internet, lalu muat ulang halaman. Jika tetap gagal, cek pengaturan Firebase.';
    empty.hidden = false;
  });

  // Umur dihitung dari tanggal hari ini. Kalau halaman dibiarkan terbuka lewat tengah malam, gambar ulang.
  setInterval(function () {
    var today = new Date().toDateString();
    if (today !== lastDay) { lastDay = today; render(); }
  }, 60 * 1000);
})();
