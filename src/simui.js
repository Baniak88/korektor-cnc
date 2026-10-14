/* ===== Podgląd ruchów: rysunek toru narzędzia z animacją krok po kroku ===== */
var SIM_EX = {
  'Ruch szybki': {f:'G90 G00 X0 Y0 Z20.\nG00 X40. Y25.\nZ2.', s:'G90 G0 X0 Y0 Z20\nG0 X40 Y25\nZ2'},
  'Ruch roboczy po prostej': {f:'G00 X0 Y0 Z2.\nG01 Z-3. F200\nX40. F800\nY20.\nX0', s:'G0 X0 Y0 Z2\nG1 Z-3 F200\nX40 F800\nY20\nX0'},
  'Łuk w prawo / w lewo': {f:'G00 X0 Y0 Z2.\nG01 Z-2. F200\nG02 X20. Y0 R10. F600\nG03 X40. Y0 R10.', s:'G0 X0 Y0 Z2\nG1 Z-2 F200\nG2 X20 Y0 CR=10 F600\nG3 X40 Y0 CR=10'},
  'Absolutnie / przyrostowo': {f:'G90 G00 X0 Y0 Z2.\nG01 Z-1. F300\nG91 X20.\nY10.\nX-20.\nG90 Y0', s:'G90 G0 X0 Y0 Z2\nG1 Z-1 F300\nG91 X20\nY10\nX-20\nG90 Y0'},
  'Kompensacja promienia': {f:'G00 X-10. Y-10. Z2.\nG01 Z-3. F200\nG41 D1 X0 Y0 F600\nY30.\nX40.\nY0\nX0\nG40 X-10. Y-10.', s:'G0 X-10 Y-10 Z2\nG1 Z-3 F200\nG41 X0 Y0 F600\nY30\nX40\nY0\nX0\nG40 X-10 Y-10'},
  'Wiercenie': {f:'G00 X0 Y0 Z20.\nG81 X10. Y10. Z-15. R2. F150\nX30.\nX50. Y20.\nG80', s:'G0 X10 Y10 Z20\nCYCLE81(20,0,2,-15)\nG0 X30\nCYCLE81(20,0,2,-15)\nG0 X50 Y20\nCYCLE81(20,0,2,-15)'},
  'Wiercenie z postojem': {f:'G00 X0 Y0 Z20.\nG82 X10. Y10. Z-3. R2. P300 F100\nX30.\nG80', s:'G0 X10 Y10 Z20\nCYCLE82(20,0,2,-3)\nG0 X30\nCYCLE82(20,0,2,-3)'},
  'Wiercenie głębokie z wycofaniem': {f:'G00 X0 Y0 Z20.\nG83 X10. Y10. Z-40. R2. Q5. F120\nX30.\nG80', s:'G0 X10 Y10 Z20\nCYCLE83(20,0,2,-40)\nG0 X30\nCYCLE83(20,0,2,-40)'},
  'Wiercenie z łamaniem wióra': {f:'G00 X0 Y0 Z20.\nG73 X10. Y10. Z-20. R2. Q3. F150\nX30.\nG80', s:'G0 X10 Y10 Z20\nCYCLE83(20,0,2,-20)\nG0 X30\nCYCLE83(20,0,2,-20)'},
  'Gwintowanie sztywne': {f:'G00 X0 Y0 Z20.\nM29 S500\nG84 X10. Y10. Z-15. R3. F625\nX30.\nG80', s:'G0 X10 Y10 Z20\nCYCLE84(20,0,3,-15)\nG0 X30\nCYCLE84(20,0,3,-15)'},
  'Rozwiercanie': {f:'G00 X0 Y0 Z20.\nG85 X10. Y10. Z-20. R2. F80\nX30.\nG80', s:'G0 X10 Y10 Z20\nCYCLE85(20,0,2,-20)\nG0 X30\nCYCLE85(20,0,2,-20)'},
  'Wytaczanie z odsunięciem noża': {f:'G00 X0 Y0 Z20.\nG76 X20. Y10. Z-20. R2. Q0.2 F60\nG80', s:'G0 X20 Y10 Z20\nCYCLE86(20,0,2,-20)'}
};

function SimView(root, opts){
  opts = opts || {};
  var self = this, view = store.get('simview', '3d'), cur = 0, anim = null, frac = 0, partCut = 0, speed = +store.get('simspeed', 1) || 1, data = null, cmp = null, lines = [], ctlNow = 'fanuc', setOpts = {};
  var view5 = store.get('simview5', 'part'), s3 = null, st = null, applied = 0, stockKey = '', bad3 = [], defD = parseNum(store.get('simD', '10')) || 10, userStock = null;
  root.innerHTML =
    '<div class="simhead"><span class="lab">' + (opts.title || 'Podgląd ruchów') + '</span>' +
    '<div class="seg small"><button type="button" data-v="3d">3D</button><button type="button" data-v="xy">Z góry</button><button type="button" data-v="xz">Z boku</button></div></div>' +
    '<svg class="simsvg" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Rysunek toru narzędzia"></svg>' +
    '<div class="sim3d" hidden><div class="sim3dc"></div>' +
      '<p class="sim3dhint">Przeciągnij — obrót · dwa palce — przybliżenie i przesunięcie · stuknij w detal — pomiar punktu</p>' +
      '<div class="sim3dbar"><div class="seg small s3five" hidden><button type="button" data-v5="part">Detal</button><button type="button" data-v5="machine">Maszyna</button></div><button type="button" class="btn" data-s3="reset">Widok od nowa</button><button type="button" class="btn" data-s3="stock">Półfabrykat</button></div>' +
      '<div class="stockbox" hidden></div></div>' +
    '<div class="simctl"><button type="button" class="simbtn" data-a="prev" aria-label="Poprzedni krok">‹</button>' +
    '<button type="button" class="simbtn play" data-a="play" aria-label="Odtwórz">▶</button>' +
    '<button type="button" class="simbtn" data-a="next" aria-label="Następny krok">›</button>' +
    '<input type="range" min="0" max="0" value="0" aria-label="Krok programu">' +
    '<button type="button" class="simbtn spd" data-a="speed" aria-label="Prędkość odtwarzania">1×</button></div>' +
    '<div class="simline"></div>' +
    '<div class="simprog" role="list" aria-label="Program — dotknij linii, żeby przejść do niej w symulacji"><ol></ol></div>' +
    '<div class="simleg"></div><ul class="notes simnotes"></ul>';
  var svg = root.querySelector('svg'), range = root.querySelector('input[type=range]'), playBtn = root.querySelector('[data-a=play]'), spdBtn = root.querySelector('[data-a=speed]');
  var progBox = root.querySelector('.simprog'), progOl = progBox.querySelector('ol'), curLi = null;
  var SPEEDS = [0.5, 1, 2, 5, 20];
  function spdLabel(){ spdBtn.textContent = String(speed).replace('.', ',') + '×'; }
  spdLabel();
  var segEl = root.querySelector('.seg');
  function markView(){ Array.prototype.forEach.call(segEl.querySelectorAll('[data-v]'), function(x){ x.setAttribute('aria-pressed', String(x.getAttribute('data-v') === view)); }); }
  segEl.addEventListener('click', function(e){
    var b = e.target.closest('[data-v]'); if (!b) return;
    view = b.getAttribute('data-v'); store.set('simview', view);
    markView(); legend(); draw();
  });
  markView();
  var box3 = root.querySelector('.sim3d'), stockBox = root.querySelector('.stockbox');
  function markV5(){ Array.prototype.forEach.call(box3.querySelectorAll('[data-v5]'), function(x){ x.setAttribute('aria-pressed', String(x.getAttribute('data-v5') === view5)); }); }
  box3.addEventListener('click', function(e){
    var b5 = e.target.closest('[data-v5]');
    if (b5){ view5 = b5.getAttribute('data-v5'); store.set('simview5', view5); markV5(); if (s3) s3.reset(); draw(); return; }
    var b = e.target.closest('[data-s3]'); if (!b) return;
    var a = b.getAttribute('data-s3');
    if (a === 'reset' && s3) s3.reset();
    if (a === 'stock'){ stockBox.hidden = !stockBox.hidden; if (!stockBox.hidden) renderStockBox(); }
    if (a === 'auto'){ userStock = null; stockKey = ''; renderStockBox(); draw(); }
  });
  function renderStockBox(){
    var A = autoStock(), U = userStock || {}, f = function(k, lab){ return '<div class="field"><label class="lab" for="sb-' + k + '">' + lab + '</label><div class="num"><input id="sb-' + k + '" data-sb="' + k + '" inputmode="decimal" autocomplete="off" placeholder="' + fmtN(A[k]) + '" value="' + (U[k] != null ? fmtN(U[k]) : '') + '"></div></div>'; };
    stockBox.innerHTML = '<p class="fine">Puste pola = wymiar policzony z programu. Ruch szybki w materiale jest sprawdzany na tym półfabrykacie.</p>' +
      '<div class="fields">' + f('x0', 'X od') + f('y0', 'Y od') + f('top', 'Z góra') + f('x1', 'X do') + f('y1', 'Y do') + f('bot', 'Z dół') + '</div>' +
      '<div class="field"><label class="lab" for="sb-d">Ø narzędzia bez opisu w programie</label><div class="num"><input id="sb-d" data-sb="d" inputmode="decimal" autocomplete="off" value="' + fmtN(defD) + '"></div><span class="hint">Średnicę biorę z komentarza przy zmianie narzędzia, np. (FREZ D10) albo ; Ø10.</span></div>' +
      '<button type="button" class="btn" data-s3="auto">Wymiary z programu</button>';
  }
  stockBox.addEventListener('input', function(e){
    var k = e.target.getAttribute('data-sb'); if (!k) return;
    var v = parseNum(e.target.value);
    if (k === 'd'){ if (v > 0){ defD = v; store.set('simD', String(v)); prep(); } }
    else { userStock = userStock || {}; if (isFinite(v)) userStock[k] = v; else delete userStock[k]; }
    stockKey = ''; clearTimeout(stockBox._t); stockBox._t = setTimeout(function(){ legend(); draw(); }, 250);
  });
  root.querySelector('.simctl').addEventListener('click', function(e){
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'play') toggle();
    else if (a === 'speed'){ speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; store.set('simspeed', speed); spdLabel(); if (anim){ anim.t0 = performance.now() - frac * stepDur(anim.i) * 1000; } }
    else { stop(); go(cur + (a === 'next' ? 1 : -1)); }
  });
  range.addEventListener('input', function(){ stop(); go(+this.value); });
  progOl.addEventListener('click', function(e){
    var li = e.target.closest('li[data-ln]'); if (!li || !data) return;
    var ln = +li.getAttribute('data-ln'), k = -1;
    data.steps.forEach(function(s, i){ if (s.ln <= ln) k = i; });
    stop(); go(k + 1);
  });

  /* ----- Odtwarzanie płynne: narzędzie jedzie po torze bieżącej linii ----- */
  function stepSegs(i){ return [i > 0 ? data.steps[i - 1].seg : 0, data.steps[i].seg]; }
  function segR(s){ return ((s.td > 0 ? s.td : defD) || 10) / 2; }
  function stepPoly(i){
    data._poly = data._poly || [];
    if (data._poly[i]) return data._poly[i];
    var r = stepSegs(i), out = [], len = 0;
    for (var n = r[0]; n < r[1]; n++){
      var s = data.segs[n]; if (s.zu) continue;
      var P = s.type === 'hole' ? [s.a, s.b, s.a] : segPath(s);
      for (var q = 1; q < P.length; q++){
        var a = P[q - 1], b = P[q], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        out.push({a:a, b:b, l:l, s:s, cut:!(s.type === 'hole' && q === 2)}); len += l;
      }
    }
    return (data._poly[i] = {p:out, len:len});
  }
  function stepDur(i){ var L = stepPoly(i).len; return (L > 1e-6 ? Math.max(0.3, Math.min(2.4, L / 60)) : 0.22) / speed; }
  function lerp(a, b, t){ return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function pointAt(i, f){
    var P = stepPoly(i), L = P.len * f, acc = 0;
    for (var q = 0; q < P.p.length; q++){ var x = P.p[q]; if (acc + x.l >= L) return {p:lerp(x.a, x.b, x.l > 1e-9 ? (L - acc) / x.l : 1), s:x.s}; acc += x.l; }
    var lp = P.p[P.p.length - 1]; return lp ? {p:lp.b, s:lp.s} : null;
  }
  function cutPartial(i, L0, L1){
    var P = stepPoly(i), acc = 0;
    for (var q = 0; q < P.p.length; q++){
      var x = P.p[q], s0 = acc, s1 = acc + x.l; acc = s1;
      if (s1 <= L0 || !x.cut) continue; if (s0 >= L1) break;
      var ta = x.l > 1e-9 ? Math.max(0, (L0 - s0) / x.l) : 0, tb = x.l > 1e-9 ? Math.min(1, (L1 - s0) / x.l) : 1;
      if (st.vox) voxCut(st, lerp(x.a, x.b, ta), lerp(x.a, x.b, tb), x.s.v || [0, 0, 1], segR(x.s), Math.max(segR(x.s) * 3, 12), {rapid:x.s.type === 'rapid'});
      else cutPiece(st, lerp(x.a, x.b, ta), lerp(x.a, x.b, tb), segR(x.s), {rapid:x.s.type === 'rapid'});
    }
  }
  function toggle(){
    if (anim){ var wi = anim.i, wf = frac; stop(); if (wf > 0) go(wi + 1); else draw(); return; }
    if (!data || !data.steps.length) return;
    if (cur >= data.steps.length) cur = 0;
    anim = {i:cur, t0:performance.now()}; frac = 0;
    playBtn.textContent = '❚❚'; playBtn.setAttribute('aria-label', 'Pauza');
    if (s3) s3.throttle = true;
    requestAnimationFrame(tick);
  }
  function tick(now){
    if (!anim) return;
    var f = (now - anim.t0) / (stepDur(anim.i) * 1000);
    if (f >= 1){
      cur = anim.i + 1; frac = 0; range.value = cur;
      if (cur >= data.steps.length){ stop(); draw(); return; }
      anim.i = cur; anim.t0 = now;
    } else frac = f;
    draw();
    requestAnimationFrame(tick);
  }
  function stop(){ anim = null; if (frac > 0){ frac = 0; } playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Odtwórz'); if (s3){ s3.throttle = false; } }
  function go(n){ cur = Math.max(0, Math.min(n, data ? data.steps.length : 0)); frac = 0; range.value = cur; draw(); }
  /* Bieżąca linia i pozycja narzędzia */
  function curStep(){ if (!data || !data.steps.length) return -1; if (anim && cur < data.steps.length) return cur; return cur - 1; }
  function toolPos(){
    if (!data) return null;
    if (anim && cur < data.steps.length){ var r = pointAt(cur, frac); if (r) return r; }
    var upto = cur > 0 ? data.steps[cur - 1].seg : 0, last = upto > 0 ? data.segs[upto - 1] : data.segs[0];
    if (!last || last.zu) return null;
    var P = segPath(last);
    return {p:upto > 0 ? (last.type === 'hole' ? last.a : P[P.length - 1]) : P[0], s:last};
  }
  function renderListing(){
    var max = 20000, L = lines.length > max ? lines.slice(0, max) : lines;
    progOl.innerHTML = L.map(function(l, i){ return '<li data-ln="' + (i + 1) + '"><span class="ln">' + (i + 1) + '</span><code>' + (esc(l) || ' ') + '</code></li>'; }).join('');
    curLi = null; progBox.scrollTop = 0;
  }
  function markLine(ln){
    if (curLi && +curLi.getAttribute('data-ln') === ln) return;
    if (curLi) curLi.classList.remove('cur');
    curLi = ln ? progOl.children[ln - 1] : null;
    if (!curLi) return;
    curLi.classList.add('cur');
    var top = curLi.offsetTop - progBox.clientHeight / 3;
    progBox.scrollTop = Math.max(0, top);
  }
  function fmtP(v){ var s = (Math.round(v * 1000) / 1000).toFixed(3); return (s === '-0.000' ? '0.000' : s).replace('.', ',').replace('-', '−'); }

  function proj(p){ return view === 'xy' ? [p[0], p[1]] : [p[0], p[2]]; }
  function segPts(s){
    if (s.pts) return s.pts;
    if (s.type === 'arc') return arcPoints(s);
    return [s.a, s.b];
  }
  function bounds(list){
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    list.forEach(function(d){ d.segs.forEach(function(s){ segPts(s).forEach(function(p){ var q = proj(p); b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }); }); });
    if (!isFinite(b[0])) return [-10, -10, 10, 10];
    var w = b[2] - b[0], h = b[3] - b[1], m = Math.max(w, h, 10) * 0.08;
    if (w < 1){ b[0] -= 5; b[2] += 5; } if (h < 1){ b[1] -= 5; b[3] += 5; }
    return [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
  }
  function autoStock(){
    var b = [Infinity, Infinity, -Infinity, -Infinity], zmin = Infinity, any = false;
    (data ? data.segs : []).forEach(function(s){
      if (s.zu) return;
      var r = ((s.td > 0 ? s.td : defD) || 10) / 2, cutting = s.type !== 'rapid';
      segPath(s).forEach(function(p){
        if (!cutting) return;
        if (p[2] < 0){ any = true; zmin = Math.min(zmin, p[2]); }
        b[0] = Math.min(b[0], p[0] - r); b[1] = Math.min(b[1], p[1] - r); b[2] = Math.max(b[2], p[0] + r); b[3] = Math.max(b[3], p[1] + r);
      });
      if (s.type === 'hole'){ any = true; zmin = Math.min(zmin, s.b[2]); }
    });
    if (!isFinite(b[0])) b = [-20, -20, 20, 20];
    if (!any) zmin = -5;
    var spanXY = Math.max(b[2] - b[0], b[3] - b[1]);
    var mg = Math.max(5, spanXY * 0.15);
    var A = {x0:r3(b[0] - mg), y0:r3(b[1] - mg), x1:r3(b[2] + mg), y1:r3(b[3] + mg), top:0, bot:r3(zmin - Math.max(3, Math.min(20, spanXY * 0.12)))};
    var S0 = setOpts.stock || {};
    Object.keys(S0).forEach(function(k){ if (isFinite(S0[k])) A[k] = S0[k]; });
    // półfabrykat z formularza nie może być mniejszy niż obróbka
    if (setOpts.stock){ A.x0 = Math.min(A.x0, r3(b[0])); A.y0 = Math.min(A.y0, r3(b[1])); A.x1 = Math.max(A.x1, r3(b[2])); A.y1 = Math.max(A.y1, r3(b[3])); }
    return A;
  }
  function stockDef(){ var A = autoStock(), U = userStock || {}, o = {}; ['x0', 'y0', 'x1', 'y1', 'top', 'bot'].forEach(function(k){ o[k] = U[k] != null ? U[k] : A[k]; }); if (o.x1 <= o.x0) o.x1 = o.x0 + 1; if (o.y1 <= o.y0) o.y1 = o.y0 + 1; if (o.bot >= o.top) o.bot = o.top - 1; return o; }
  function newStock(){ var d = stockDef(); return data && data.five ? makeVox(d.x0, d.y0, d.bot, d.x1, d.y1, d.top, 130) : makeStock(d.x0, d.y0, d.x1, d.y1, d.top, d.bot, 360); }
  function cutAll(stk, from, to){ return stk.vox ? voxCutSegs(stk, data.segs, from, to, defD) : cutSegs(stk, data.segs, from, to, defD); }
  function prep(){ if (!data) return; resetLocal(data.segs); data._poly = null; data.compNotes = compPaths(data.segs, defD); var mr = MACHINES[S.machine].rot || []; data.five = partTransform(data.segs, mr.indexOf('A') < 0 && mr.indexOf('B') >= 0 ? 'B' : undefined); }
  function check3(){
    // ruch szybki w materiał — sprawdzane na całym programie
    if (!data) return [];
    return cutAll(newStock(), 0, data.segs.length);
  }
  function draw3(upto){
    if (!s3){
      s3 = new Sim3D(root.querySelector('.sim3dc'), {onPick:function(r){
        if (!r){ s3.pickEl.hidden = true; return; }
        s3.pickEl.hidden = false;
        s3.pickEl.innerHTML = '<b>Punkt</b> X ' + fmtP(r.x) + ' · Y ' + fmtP(r.y) + ' · Z ' + fmtP(r.z) + (r.z < r.top - 0.001 ? '<br>głębokość od góry ' + fmtP(r.top - r.z) : '') + '<span class="s3acc"> ±' + fmtP(st ? st.cell / 2 : 0).replace(/0+$/, '') + ' mm (siatka)</span>';
      }});
    }
    if (!s3.ok) return;
    var key = JSON.stringify(stockDef()) + '|' + defD;
    if (key !== stockKey || upto < applied || !st || (partCut && !anim)){
      var keep = !!st && key === stockKey;
      st = newStock(); applied = 0; partCut = 0; s3.setStock(st, keep && stockKey !== ''); stockKey = key;
    }
    if (upto > applied){ cutAll(st, applied, upto); applied = upto; partCut = 0; s3.meshDirty = true; }
    var ci = curStep(), cr = ci >= 0 ? stepSegs(ci) : [0, 0];
    if (anim && cur < data.steps.length){
      var L1 = stepPoly(cur).len * frac;
      if (L1 > partCut){ cutPartial(cur, partCut, L1); partCut = L1; s3.meshDirty = true; }
    }
    s3.setPath(data.segs, upto, cr[0], cr[1]);
    var tp = toolPos();
    s3.setTool(tp ? tp.p : null, tp ? segR(tp.s) : 5, tp && tp.s && tp.s.v);
    var mr = tp && tp.s && tp.s.mrot ? tp.s.mrot : null;
    box3.querySelector('.s3five').hidden = !data.five; markV5();
    s3.setMachine(data.five && view5 === 'machine' ? tableRot(mr || {A:0, B:0, C:0}, tp && tp.s && tp.s.tilt) : null);
    var stp = ci >= 0 ? data.steps[ci] : null, tl = tp && tp.s && tp.s.tilt === 'B' ? 'B' : 'A';
    s3.overlay.innerHTML = stp ? '<span class="s3ln">Linia ' + stp.ln + '</span><code>' + esc((lines[stp.ln - 1] || '').trim().slice(0, 60)) + '</code>' + (tp ? '<span class="s3pos">X ' + fmtP(tp.p[0]) + ' Y ' + fmtP(tp.p[1]) + ' Z ' + fmtP(tp.p[2]) + (data.five ? ' · ' + tl + ' ' + fmtP(mr ? mr[tl] || 0 : 0) + '° C ' + fmtP(mr ? mr.C || 0 : 0) + '°' : '') + '</span>' : '') : '';
    s3.draw();
  }
  function draw(){
    if (!data){ svg.innerHTML = ''; return; }
    var is3 = view === '3d';
    svg.style.display = is3 ? 'none' : ''; box3.hidden = !is3;
    if (is3){ draw3(data.steps.length ? (cur === 0 ? 0 : data.steps[cur - 1].seg) : data.segs.length); stepText(); return; }
    var ci2 = curStep(), cr2 = ci2 >= 0 ? stepSegs(ci2) : [0, 0];
    var all = cmp ? [data, cmp] : [data];
    var bb = bounds(all), W = 320, H = 220;
    var sc = Math.min(W / (bb[2] - bb[0]), H / (bb[3] - bb[1]));
    var ox = (W - (bb[2] - bb[0]) * sc) / 2, oy = (H - (bb[3] - bb[1]) * sc) / 2;
    function X(v){ return (ox + (v - bb[0]) * sc).toFixed(1); }
    function Y(v){ return (H - oy - (v - bb[1]) * sc).toFixed(1); }
    function path(s){ return segPts(s).map(function(p, i){ var q = proj(p); return (i ? 'L' : 'M') + X(q[0]) + ' ' + Y(q[1]); }).join(''); }
    var out = '';
    // osie zera
    if (bb[0] < 0 && bb[2] > 0) out += '<line class="sim-axis" x1="' + X(0) + '" y1="0" x2="' + X(0) + '" y2="' + H + '"/>';
    if (bb[1] < 0 && bb[3] > 0) out += '<line class="sim-axis" x1="0" y1="' + Y(0) + '" x2="' + W + '" y2="' + Y(0) + '"/>';
    out += '<text class="sim-lbl" x="6" y="' + (H - 6) + '">' + (view === 'xy' ? 'X → · Y ↑' : 'X → · Z ↑') + '</text>';
    function layer(d, cls, upto){
      var s = '', end = upto == null ? d.segs.length : upto;
      d.segs.forEach(function(g, i){
        var c = cls + (i < end ? ' on' : '') + (d === data && i >= cr2[0] && i < cr2[1] ? ' sim-cur' : '');
        if (g.type === 'hole'){
          var q = proj(g.a), q2 = proj(g.b);
          if (view === 'xy') s += '<circle class="sim-hole ' + c + '" cx="' + X(q[0]) + '" cy="' + Y(q[1]) + '" r="4.5"/>';
          else s += '<line class="sim-hole ' + c + '" x1="' + X(q[0]) + '" y1="' + Y(q[1]) + '" x2="' + X(q2[0]) + '" y2="' + Y(q2[1]) + '"/>';
        } else s += '<path class="sim-' + g.type + ' ' + c + '" d="' + path(g) + '"/>';
      });
      return s;
    }
    var upto = data.steps.length ? (cur === 0 ? 0 : data.steps[cur - 1].seg) : data.segs.length;
    if (cmp) out += layer(cmp, 'sim-old', cmp.segs.length);
    out += layer(data, 'sim-new' + (cmp ? ' sim-cmp' : ''), upto);
    // pozycja narzędzia
    var tpp = toolPos();
    if (tpp){
      var tp = proj(tpp.p);
      out += '<circle class="sim-tool" cx="' + X(tp[0]) + '" cy="' + Y(tp[1]) + '" r="6"/>';
    }
    svg.innerHTML = out;
    stepText();
  }
  function stepText(){
    var ci = curStep(), stp = ci >= 0 ? data.steps[ci] : null, tp = toolPos();
    markLine(stp ? stp.ln : 0);
    root.querySelector('.simline').innerHTML = stp
      ? '<span class="simstep">Linia ' + stp.ln + ' · krok ' + (ci + 1) + ' z ' + data.steps.length + (anim ? ' · w trakcie' : '') + '</span><span class="mono simcode">' + esc((lines[stp.ln - 1] || '').trim()) + '</span><span class="simdesc">' + esc(stp.text) + '</span>' +
        (tp ? '<span class="simpos mono">Narzędzie: X ' + fmtP(tp.p[0]) + ' · Y ' + fmtP(tp.p[1]) + ' · Z ' + fmtP(tp.p[2]) + (tp.s && tp.s.tool != null ? ' · T' + tp.s.tool + ' Ø' + fmtN(segR(tp.s) * 2) : '') + '</span>' : '')
      : '<span class="simdesc">' + (data.steps.length ? 'Naciśnij ▶ albo dotknij linii programu poniżej.' : 'Brak ruchów do pokazania.') + '</span>';
  }
  function legend(){
    var is3 = view === '3d';
    root.querySelector('.simleg').innerHTML = is3
      ? '<span><i class="lg lg-stock"></i>materiał</span><span><i class="lg lg-cut"></i>obrobione</span><span><i class="lg lg-tool"></i>narzędzie</span><span><i class="lg lg-feed"></i>tor</span>' + (bad3.length ? '<span><i class="lg lg-bad"></i>ruch szybki w materiale</span>' : '')
      : '<span><i class="lg lg-feed"></i>skrawanie</span><span><i class="lg lg-rapid"></i>ruch szybki</span><span><i class="lg lg-hole"></i>wiercenie</span>' + (cmp ? '<span><i class="lg lg-old"></i>przed zmianą</span>' : '');
    var nt = data ? data.notes.slice() : [];
    if (data){
      bad3 = check3();
      (data.compNotes || []).forEach(function(n){ nt.push(n); });
      var unk = [];
      data.segs.forEach(function(s){ if (!(s.td > 0) && s.tool != null && s.type !== 'rapid' && unk.indexOf('T' + s.tool) < 0) unk.push('T' + s.tool); });
      if (unk.length) nt.push('Brak średnicy w komentarzu dla: ' + unk.join(', ') + ' — w 3D przyjęto Ø' + fmtN(defD) + ' (zmień w „Półfabrykat”).');
      if (data.five) nt.push('Program 5-osiowy: tor przeliczony do układu detalu (G54). Płaszczyzna pochylona G68.2 / CYCLE800, TCP (G43.4 / TRAORI) i osie ' + (MACHINES[S.machine].rot || ['A', 'C']).join('/') + ' — kinematyka stołu uchylno-obrotowego przyjęta w przybliżeniu (kierunki obrotu zależą od maszyny). Materiał w 3D jako sześcianiki ok. ' + fmtP(newStock().c || 0).replace(/0+$/, '') + ' mm. „Maszyna” pokazuje stół obrócony o A/C.');
      if (!data.segs.some(function(s){ return s.tool != null; }) && data.segs.length) nt.push('Program bez zmiany narzędzia — w 3D przyjęto frez Ø' + fmtN(defD) + '.');
    }
    var html = (bad3.length ? '<li class="bad">Ruch szybki (G0) wchodzi w materiał w ' + (bad3.length === 1 ? 'linii ' : 'liniach ') + bad3.slice(0, 8).join(', ') + (bad3.length > 8 ? '…' : '') + ' — sprawdź program albo wymiary półfabrykatu.</li>' : '') +
      nt.map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('') +
      '<li>' + (is3 ? 'Widok 3D: frez płaski, wiertło ze stożkiem 118°, korekcja G41/G42 policzona w przybliżeniu. Bez oprawki, mocowań i kinematyki maszyny.' : 'Widok z góry i z boku pokazuje tor z programu (środek albo kontur), bez promienia freza.') + ' To nie zastępuje symulacji na sterowaniu ani przejazdu na sucho.</li>';
    root.querySelector('.simnotes').innerHTML = html;
  }
  this.set = function(text, ctl, compareText, o){
    stop();
    setOpts = o || {}; ctlNow = ctl; stockKey = ''; st = null; applied = 0;
    lines = String(text || '').split(/\r?\n/);
    data = simulateProgram(text, ctl, setOpts);
    prep(); renderListing(); partCut = 0; frac = 0;
    cmp = compareText ? simulateProgram(compareText, ctl) : null;
    range.max = data.steps.length;
    cur = opts.showAll ? data.steps.length : 0;
    range.value = cur;
    legend();
    if (!stockBox.hidden) renderStockBox();
    draw();
  };
  this.stop = stop;
}

/* Podgląd w zakładce Program */
var progSim = new SimView($('#g-sim'));
var simTimer = null;
function refreshProgSim(){
  clearTimeout(simTimer);
  simTimer = setTimeout(function(){
    var orig = $('#g-prog').value;
    var changed = gLast && gLast.changes && gLast.changes.length ? gLast.text : null;
    if (!orig.trim()){ $('#g-simwrap').hidden = true; return; }
    $('#g-simwrap').hidden = false;
    if (changed) progSim.set(changed, ctl(), orig); else progSim.set(orig, ctl());
    $('#g-simnote').textContent = changed ? 'Pokazuję program po zmianie (kolor) na tle oryginału (szary).' : '';
  }, 200);
}
var _runG = runG;
runG = function(){ _runG.apply(this, arguments); refreshProgSim(); };

/* „Zobacz ruch” przy kodach */
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-simcode]'); if (!b) return;
  var name = b.getAttribute('data-simcode'), ex = SIM_EX[name]; if (!ex) return;
  var code = ctl() === 'fanuc' ? ex.f : ex.s;
  $('#infoH').textContent = name;
  $('#infoBody').innerHTML = '<div class="simcard" id="sim-info"></div><div class="exb"><span class="lab">Program przykładu</span><pre>' + esc(code) + '</pre></div>';
  var v = new SimView($('#sim-info'), {title:'Zobacz ruch'});
  v.set(code, ctl());
  openSheet('#info');
  setTimeout(function(){ $('#sim-info [data-a=play]').click(); }, 350);
});
refreshProgSim();
renderCodes();
