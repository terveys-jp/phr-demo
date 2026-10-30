/* 202610280015 PHR アプリのデモ。2026-10-30
   データはすべて架空。顔の写真は保存も送信もしない（キャンバスで色の平均を取り、すぐ消す）。
   食事の結果・助言・受診前のまとめは見本（実際は食事解析の仕組みと統合 AI エンジンが出す）。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function md(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
  function hm(d) { return d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var now = new Date();
  $('today-label').textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日（' + WD[now.getDay()] + '）';

  /* ---------- タブ ---------- */
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.toggle('on', x === t); });
      document.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.id === 'pane-' + t.dataset.tab); });
      if (t.dataset.tab === 'sum') renderSummary();
      if (t.dataset.tab !== 'face') stopCamera();
    });
  });

  /* ---------- 食事 ---------- */
  var MEALS = [
    { id: 'b', when: '朝', em: '🍙', name: 'ごはん・味噌汁・納豆・焼き鮭', kcal: 540, fiber: 5.6, fat: 14, salt: 3.1 },
    { id: 'l', when: '昼', em: '🍜', name: 'しょうゆラーメン', kcal: 680, fiber: 2.4, fat: 22, salt: 6.2 },
    { id: 'd', when: '夜', em: '🥗', name: '野菜炒め定食', kcal: 650, fiber: 7.8, fat: 21, salt: 3.6 },
    { id: 's', when: '間食', em: '🍌', name: 'ヨーグルトとバナナ', kcal: 190, fiber: 1.6, fat: 3, salt: 0.1 }
  ];
  var eaten = [];
  MEALS.forEach(function (m) {
    var b = document.createElement('button');
    b.className = 'meal-pick';
    b.innerHTML = '<span class="em">' + m.em + '</span>' + m.when + '：' + esc(m.name);
    b.addEventListener('click', function () {
      if (eaten.indexOf(m) < 0) { eaten.push(m); b.classList.add('done'); }
      $('meal-result').hidden = false;
      $('meal-result').innerHTML = '<b>' + m.em + ' ' + esc(m.name) + '</b>' +
        '<div class="kv"><span>エネルギー ' + m.kcal + ' kcal</span><span>食物繊維 ' + m.fiber + ' g</span>' +
        '<span>脂質 ' + m.fat + ' g</span><span>塩分 ' + m.salt + ' g</span></div>' +
        '<div class="src">食事解析の結果の例（実際は写真から自動で返ります）</div>';
      renderMealLog();
    });
    $('meal-picks').appendChild(b);
  });
  function renderMealLog() {
    $('meal-log').innerHTML = eaten.map(function (m) {
      return '<li><span>' + m.when + '　' + esc(m.name) + '</span><span>繊維 ' + m.fiber + ' g</span></li>';
    }).join('');
  }

  /* ---------- 排便（ブリストル便形状スケール） ---------- */
  var BR = [
    { t: 1, label: 'コロコロの硬い便' },
    { t: 2, label: '硬く短いかたまり' },
    { t: 3, label: 'やや硬い（表面にひび）' },
    { t: 4, label: '普通（なめらか）' },
    { t: 5, label: 'やわらかい' },
    { t: 6, label: '泥のよう' },
    { t: 7, label: '水のよう' }
  ];
  function bristolSvg(t) {
    var c = 'fill="#8b5a2b"', l = 'fill="#b08254"', s = '';
    if (t === 1) s = [8, 24, 40, 56].map(function (x) { return '<circle cx="' + x + '" cy="13" r="5.5" ' + c + '/>'; }).join('');
    if (t === 2) s = [12, 20, 28, 36, 44, 52].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (12 + (i % 2) * 2) + '" r="7" ' + c + '/>'; }).join('');
    if (t === 3) s = '<rect x="4" y="6" width="60" height="14" rx="7" ' + c + '/>' + [16, 28, 40, 52].map(function (x) { return '<path d="M' + x + ' 7 l2 5" stroke="#5c3b1c" stroke-width="1.5"/>'; }).join('');
    if (t === 4) s = '<rect x="4" y="7" width="62" height="12" rx="6" ' + c + '/>';
    if (t === 5) s = [12, 33, 54].map(function (x) { return '<ellipse cx="' + x + '" cy="13" rx="9" ry="6" ' + l + '/>'; }).join('');
    if (t === 6) s = '<path d="M6 16 q6 -10 14 -4 q6 -8 14 0 q8 -7 14 1 q8 -4 14 5 q-4 6 -14 4 q-10 3 -20 0 q-12 3 -22 -6z" ' + l + '/>';
    if (t === 7) s = '<ellipse cx="35" cy="17" rx="30" ry="5" fill="#c9a77f"/><circle cx="14" cy="9" r="2" fill="#c9a77f"/><circle cx="52" cy="8" r="2.5" fill="#c9a77f"/>';
    return '<svg viewBox="0 0 70 26" aria-hidden="true">' + s + '</svg>';
  }
  var stools = [];
  BR.forEach(function (b) {
    var el = document.createElement('button');
    el.className = 'b-pick' + (b.t >= 3 && b.t <= 5 ? ' mid' : '');
    el.innerHTML = '<span class="t">' + b.t + '</span>' + bristolSvg(b.t) + '<span>' + b.label + '</span>';
    el.addEventListener('click', function () {
      stools.push({ t: b.t, at: new Date() });
      $('stool-log').innerHTML = stools.map(function (x) {
        return '<li><span>' + hm(x.at) + '　タイプ ' + x.t + '（' + BR[x.t - 1].label + '）</span><span>記録</span></li>';
      }).join('');
    });
    $('bristol').appendChild(el);
  });

  /* ---------- 顔色（カメラ。画像は保存・送信しない） ---------- */
  var BASE = { L: 64, a: 13 }; // デモの「ふだんの値」（実際はその方の過去の記録から）
  var stream = null, face = null;
  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function (tr) { tr.stop(); }); stream = null; }
    $('cam-video').srcObject = null;
    $('cam-off').hidden = false;
    $('cam-shot').disabled = true;
  }
  $('cam-start').addEventListener('click', function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showFaceMsg('この環境ではカメラを使えません。「見本の値で試す」をお使いください。');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then(function (s) {
      stream = s;
      $('cam-video').srcObject = s;
      $('cam-video').play();
      $('cam-off').hidden = true;
      $('cam-shot').disabled = false;
    }).catch(function () {
      showFaceMsg('カメラの使用が許可されませんでした。「見本の値で試す」をお使いください。');
    });
  });
  $('cam-shot').addEventListener('click', function () {
    var v = $('cam-video'), cv = $('cam-canvas');
    if (!v.videoWidth) return;
    var w = 120, h = Math.round(120 * v.videoHeight / v.videoWidth);
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.drawImage(v, 0, 0, w, h);
    // 枠の中央（頬のあたり）の色の平均だけを使う
    var px = ctx.getImageData(Math.round(w * .35), Math.round(h * .45), Math.round(w * .3), Math.round(h * .15)).data;
    var r = 0, g = 0, b = 0, n = 0;
    for (var i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
    ctx.clearRect(0, 0, w, h); // 画像はすぐ消す
    stopCamera();
    setFace(r / n, g / n, b / n, 'カメラ');
  });
  $('cam-sample').addEventListener('click', function () { stopCamera(); setFace(201, 152, 134, '見本'); });

  function toLab(r, g, b) {
    function lin(c) { c /= 255; return c > .04045 ? Math.pow((c + .055) / 1.055, 2.4) : c / 12.92; }
    var R = lin(r), G = lin(g), B = lin(b);
    var X = (R * .4124 + G * .3576 + B * .1805) / .95047, Y = R * .2126 + G * .7152 + B * .0722, Z = (R * .0193 + G * .1192 + B * .9505) / 1.08883;
    function f(t) { return t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    return { L: 116 * f(Y) - 16, a: 500 * (f(X) - f(Y)) };
  }
  function setFace(r, g, b, src) {
    var lab = toLab(r, g, b);
    var dA = lab.a - BASE.a, dL = lab.L - BASE.L;
    var idx = Math.round((dA * 0.6 + dL * 0.2) * 10) / 10; // デモ用の簡易の指標（ふだんとの差）
    var word = idx <= -3 ? 'ふだんより血色が少なめです' : idx >= 3 ? 'ふだんより赤みが強めです' : 'ふだんと同じくらいです';
    face = { idx: idx, word: word };
    $('face-result').hidden = false;
    $('face-result').innerHTML = '<b><span class="swatch" style="background:rgb(' + [r, g, b].map(Math.round).join(',') + ')"></span> 顔色の指標 ' + (idx > 0 ? '+' : '') + idx + '</b>' +
      '<div>' + word + '</div>' +
      '<div class="kv"><span>赤み ' + lab.a.toFixed(1) + '（ふだん ' + BASE.a + '）</span><span>明るさ ' + lab.L.toFixed(1) + '（ふだん ' + BASE.L + '）</span></div>' +
      '<div class="src">' + (src === 'カメラ' ? '撮った画像は計算の後すぐに消しました。' : '見本の色で計算しました。') + '実際はご用意の顔色解析 AI を組み込みます。</div>';
  }
  function showFaceMsg(msg) { $('face-result').hidden = false; $('face-result').textContent = msg; }

  /* ---------- まとめと助言（見本の決まりで作る） ---------- */
  function renderSummary() {
    if (!eaten.length && !stools.length && !face) {
      $('sum-body').innerHTML = '<p class="empty">食事・排便・顔色のタブで記録すると、ここにきょうのまとめと助言が出ます。</p>';
      return;
    }
    var fiber = eaten.reduce(function (s, m) { return s + m.fiber; }, 0);
    var kcal = eaten.reduce(function (s, m) { return s + m.kcal; }, 0);
    var last = stools.length ? stools[stools.length - 1].t : null;
    var rows = [
      ['食事', eaten.length ? eaten.length + '回・' + kcal + ' kcal' : 'まだ記録なし'],
      ['食物繊維', eaten.length ? fiber.toFixed(1) + ' g（目標の例 20 g）' : '―'],
      ['排便', stools.length ? stools.length + '回・最後はタイプ ' + last : 'まだ記録なし'],
      ['顔色', face ? face.word : 'まだ記録なし']
    ];
    var tips = [];
    if (eaten.length && fiber < 15) tips.push('食物繊維が少なめです。野菜・海藻・豆を一品足しましょう。');
    if (last !== null && last <= 2) tips.push('便が硬めです。水分をこまめにとりましょう。');
    if (last !== null && last >= 6) tips.push('便がゆるめです。脂っこい食事は控えめにしましょう。');
    if (stools.length >= 4) tips.push('きょうは排便の回数が多めです。');
    if (face && face.idx <= -3) tips.push('顔色がふだんより白っぽく見えます。休息をとりましょう。');
    if (!tips.length) tips.push('きょうの記録は、ふだんと大きく変わりません。この調子で続けましょう。');
    tips.push('気になる状態が続く時は、次の受診で医師にお伝えください（記録は許可した医師と共有されています）。');
    $('sum-body').innerHTML = rows.map(function (r) { return '<div class="sum-row"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>'; }).join('') +
      '<div class="advice"><b>きょうの助言</b>' + tips.map(esc).join('<br>') + '</div>';
  }

  /* ---------- 医師の画面（架空の患者様・30日分） ---------- */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pick(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  var DAYS = 30;
  var dates = [];
  for (var i = DAYS; i >= 1; i--) { var d = new Date(now); d.setDate(now.getDate() - i); dates.push(d); }

  function makeA() { // 潰瘍性大腸炎（寛解期）。17〜21日目に悪化、22〜24日目に回復途中
    var r = rng(7), out = [];
    for (var i = 0; i < DAYS; i++) {
      var flare = i >= 17 && i <= 21, rec = i >= 22 && i <= 24;
      var n = flare ? pick(r, 4, 6) : rec ? pick(r, 2, 3) : pick(r, 1, 2), types = [];
      for (var k = 0; k < n; k++) types.push(flare ? pick(r, 6, 7) : rec ? pick(r, 5, 6) : pick(r, 3, 5));
      out.push({ types: types, fiber: flare ? 6 + r() * 4 : 14 + r() * 6, face: flare ? -4 - r() * 2.5 : rec ? -2 - r() : (r() - .5) * 2.4 });
    }
    return out;
  }
  function makeB() { // 慢性の便秘。15日目から食物繊維を増やし、便の形が普通に近づく
    var r = rng(11), out = [];
    for (var i = 0; i < DAYS; i++) {
      var after = i >= 15, types = [];
      var n = after ? (r() < .85 ? 1 : 2) : (r() < .4 ? 0 : 1);
      for (var k = 0; k < n; k++) types.push(after ? (i < 19 ? pick(r, 2, 4) : pick(r, 3, 4)) : pick(r, 1, 2));
      out.push({ types: types, fiber: after ? 16 + r() * 6 : 7 + r() * 4, face: (r() - .5) * 2.2 });
    }
    return out;
  }
  var PTS = [
    { id: 'A', name: 'Aさん', note: '40代・潰瘍性大腸炎（寛解期）', data: makeA(), share: { doc: true, diet: false, fam: false } },
    { id: 'B', name: 'Bさん', note: '30代・慢性の便秘', data: makeB(), share: { doc: true, diet: true, fam: false } }
  ];
  var cur = PTS[0];
  var audit = [
    { at: shift(-1, 9, 12), who: '主治医（架空）', what: 'Aさんの30日の推移を閲覧' },
    { at: shift(-2, 18, 40), who: 'Bさん本人', what: '管理栄養士への共有を許可' },
    { at: shift(-3, 10, 5), who: '主治医（架空）', what: 'Bさんの受診前のまとめを閲覧' }
  ];
  function shift(dd, h, m) { var d = new Date(now); d.setDate(now.getDate() + dd); d.setHours(h, m, 0, 0); return d; }

  PTS.forEach(function (p) {
    var b = document.createElement('button');
    b.className = 'pt-pick' + (p === cur ? ' on' : '');
    b.textContent = p.name + '（' + p.note + '）';
    b.addEventListener('click', function () {
      cur = p;
      document.querySelectorAll('.pt-pick').forEach(function (x) { x.classList.toggle('on', x === b); });
      log('デモの閲覧者', p.name + 'の30日の推移を閲覧');
      renderDoc();
    });
    $('pt-picks').appendChild(b);
  });

  function log(who, what) { audit.unshift({ at: new Date(), who: who, what: what }); renderAudit(); }
  function renderAudit() {
    $('audit').innerHTML = audit.slice(0, 6).map(function (a) {
      return '<tr><td>' + md(a.at) + ' ' + hm(a.at) + '</td><td>' + esc(a.who) + '<br>' + esc(a.what) + '</td></tr>';
    }).join('');
  }

  var SHARE = [['doc', '主治医（○○消化器内科・架空）'], ['diet', '管理栄養士（架空）'], ['fam', 'ご家族']];
  function renderConsent() {
    $('consent').innerHTML = '';
    SHARE.forEach(function (s) {
      var li = document.createElement('li');
      var on = cur.share[s[0]];
      li.innerHTML = '<span>' + esc(s[1]) + '</span>';
      var sw = document.createElement('button');
      sw.className = 'switch' + (on ? ' on' : '');
      sw.textContent = on ? '共有中' : '共有しない';
      sw.addEventListener('click', function () {
        cur.share[s[0]] = !cur.share[s[0]];
        log(cur.name + '本人', s[1].replace(/（.*）/, '') + 'への共有を' + (cur.share[s[0]] ? '許可' : '取り消し'));
        renderDoc();
      });
      li.appendChild(sw);
      $('consent').appendChild(li);
    });
  }

  var X0 = 30, XW = 556;
  function x(i) { return X0 + i * XW / (DAYS - 1); }
  function chartStool(data) {
    var y = function (t) { return 10 + (t - 1) * 110 / 6; };
    var s = '<rect x="0" y="' + y(3) + '" width="600" height="' + (y(5) - y(3)) + '" fill="#dcfce7"/>';
    [1, 4, 7].forEach(function (t) { s += '<text x="0" y="' + (y(t) + 4) + '" font-size="18" fill="#94a3b8">' + t + '</text>'; });
    data.forEach(function (d, i) {
      d.types.forEach(function (t, k) {
        var bad = t <= 2 || t >= 6;
        s += '<circle cx="' + (x(i) + (k - (d.types.length - 1) / 2) * 3) + '" cy="' + y(t) + '" r="4.5" fill="' + (bad ? '#e11d48' : '#8b5a2b') + '" fill-opacity=".8"/>';
      });
      if (!d.types.length) s += '<circle cx="' + x(i) + '" cy="133" r="4" fill="none" stroke="#94a3b8" stroke-width="1.5"/>';
    });
    return s;
  }
  function chartFiber(data) {
    var s = '<line x1="0" x2="600" y1="' + (95 - 20 * 3.4) + '" y2="' + (95 - 20 * 3.4) + '" stroke="#059669" stroke-dasharray="4 3"/>' +
      '<text x="600" y="' + (95 - 20 * 3.4 - 3) + '" font-size="16" fill="#059669" text-anchor="end">目標の例 20g</text>';
    data.forEach(function (d, i) { var h = d.fiber * 3.4; s += '<rect x="' + (x(i) - 7) + '" y="' + (95 - h) + '" width="14" height="' + h + '" rx="2" fill="#38bdf8"/>'; });
    return s;
  }
  function chartFace(data) {
    var y = function (v) { return 40 - v * 7; };
    var s = '<line x1="0" x2="600" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#94a3b8" stroke-dasharray="4 3"/>';
    s += '<polyline fill="none" stroke="#0284c7" stroke-width="2.5" points="' + data.map(function (d, i) { return x(i) + ',' + y(d.face); }).join(' ') + '"/>';
    data.forEach(function (d, i) { if (d.face <= -3) s += '<circle cx="' + x(i) + '" cy="' + y(d.face) + '" r="4" fill="#e11d48"/>'; });
    return s;
  }

  function runs(flags) { // 連続した日のまとまり
    var out = [], st = -1;
    flags.concat([false]).forEach(function (f, i) { if (f && st < 0) st = i; if (!f && st >= 0) { out.push([st, i - 1]); st = -1; } });
    return out;
  }
  function avg(a) { return a.reduce(function (s, v) { return s + v; }, 0) / (a.length || 1); }
  function summarize(p) {
    var D = p.data, L = [];
    runs(D.map(function (d) { return d.types.some(function (t) { return t >= 6; }); })).forEach(function (r) {
      if (r[1] - r[0] < 1) return;
      var cnt = D.slice(r[0], r[1] + 1).map(function (d) { return d.types.length; });
      L.push('<span class="flag">' + md(dates[r[0]]) + '〜' + md(dates[r[1]]) + ' の' + (r[1] - r[0] + 1) + '日間</span>、泥や水のような便（タイプ6〜7）が続き、回数は1日' + Math.min.apply(null, cnt) + '〜' + Math.max.apply(null, cnt) + '回でした。');
      var f = D.slice(r[0], r[1] + 1).map(function (d) { return d.face; });
      if (Math.min.apply(null, f) <= -3) L.push('同じ時期に、顔色の指標がふだんより下がっています（最も低い日 ' + Math.min.apply(null, f).toFixed(1) + '）。');
    });
    var hard = D.filter(function (d) { return d.types.some(function (t) { return t <= 2; }); }).length;
    var none = D.filter(function (d) { return !d.types.length; }).length;
    if (hard >= 5) L.push('硬い便（タイプ1〜2）の日が' + hard + '日、排便のない日が' + none + '日ありました。');
    var f1 = avg(D.slice(0, 15).map(function (d) { return d.fiber; })), f2 = avg(D.slice(15).map(function (d) { return d.fiber; }));
    if (Math.abs(f2 - f1) >= 4) L.push('食物繊維は1日平均 ' + f1.toFixed(0) + 'g（前半15日）→ ' + f2.toFixed(0) + 'g（後半15日）に' + (f2 > f1 ? '増え' : '減り') + 'ました。');
    var last7 = D.slice(-7), mid = last7.filter(function (d) { return d.types.length && d.types.every(function (t) { return t >= 3 && t <= 5; }); }).length;
    L.push('直近7日のうち' + mid + '日は、便の形が普通の範囲（3〜5）でした。');
    return '<ul>' + L.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul><p class="note">※ 自動で作ったまとめの見本です。診断ではありません。</p>';
  }

  function renderDoc() {
    renderConsent();
    var ok = cur.share.doc;
    ['ch-stool', 'ch-fiber', 'ch-face'].forEach(function (id) { $(id).style.opacity = ok ? 1 : .15; });
    if (!ok) {
      $('ch-stool').innerHTML = $('ch-fiber').innerHTML = $('ch-face').innerHTML = '';
      $('doc-summary').innerHTML = '<p class="flag">' + esc(cur.name) + 'は主治医への共有を取り消しています。医師の画面には何も表示されません。</p>';
    } else {
      $('ch-stool').innerHTML = chartStool(cur.data);
      $('ch-fiber').innerHTML = chartFiber(cur.data);
      $('ch-face').innerHTML = chartFace(cur.data);
      $('doc-summary').innerHTML = '<p><b>' + esc(cur.name) + '</b>（' + esc(cur.note) + '）<br>' + md(dates[0]) + '〜' + md(dates[DAYS - 1]) + '</p>' + summarize(cur);
    }
    $('ch-axis').innerHTML = '<span>' + md(dates[0]) + '</span><span>' + md(dates[14]) + '</span><span>' + md(dates[DAYS - 1]) + '</span>';
    renderAudit();
  }
  renderDoc();
})();
