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
  var self = this, view = 'xy', cur = 0, timer = null, data = null, cmp = null, lines = [];
  root.innerHTML =
    '<div class="simhead"><span class="lab">' + (opts.title || 'Podgląd ruchów') + '</span>' +
    '<div class="seg small"><button type="button" data-v="xy" aria-pressed="true">Z góry</button><button type="button" data-v="xz" aria-pressed="false">Z boku</button></div></div>' +
    '<svg class="simsvg" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Rysunek toru narzędzia"></svg>' +
    '<div class="simctl"><button type="button" class="simbtn" data-a="prev" aria-label="Poprzedni krok">‹</button>' +
    '<button type="button" class="simbtn play" data-a="play" aria-label="Odtwórz">▶</button>' +
    '<button type="button" class="simbtn" data-a="next" aria-label="Następny krok">›</button>' +
    '<input type="range" min="0" max="0" value="0" aria-label="Krok programu"></div>' +
    '<div class="simline"></div><div class="simleg"></div><ul class="notes simnotes"></ul>';
  var svg = root.querySelector('svg'), range = root.querySelector('input[type=range]'), playBtn = root.querySelector('[data-a=play]');
  root.querySelector('.seg').addEventListener('click', function(e){
    var b = e.target.closest('[data-v]'); if (!b) return;
    view = b.getAttribute('data-v');
    Array.prototype.forEach.call(root.querySelectorAll('[data-v]'), function(x){ x.setAttribute('aria-pressed', String(x === b)); });
    draw();
  });
  root.querySelector('.simctl').addEventListener('click', function(e){
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'play') toggle();
    else { stop(); go(cur + (a === 'next' ? 1 : -1)); }
  });
  range.addEventListener('input', function(){ stop(); go(+this.value); });

  function toggle(){ if (timer) stop(); else { if (cur >= data.steps.length) cur = 0; timer = setInterval(function(){ if (cur >= data.steps.length){ stop(); return; } go(cur + 1); }, 420); playBtn.textContent = '❚❚'; } }
  function stop(){ if (timer){ clearInterval(timer); timer = null; } playBtn.textContent = '▶'; }
  function go(n){ cur = Math.max(0, Math.min(n, data ? data.steps.length : 0)); range.value = cur; draw(); }

  function proj(p){ return view === 'xy' ? [p[0], p[1]] : [p[0], p[2]]; }
  function segPts(s){
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
  function draw(){
    if (!data){ svg.innerHTML = ''; return; }
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
        var c = cls + (i < end ? ' on' : '');
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
    var last = upto > 0 ? data.segs[upto - 1] : data.segs[0];
    if (last){
      var tp = proj(upto > 0 ? last.b : last.a);
      out += '<circle class="sim-tool" cx="' + X(tp[0]) + '" cy="' + Y(tp[1]) + '" r="6"/>';
    }
    svg.innerHTML = out;
    // opis kroku
    var st = cur > 0 ? data.steps[cur - 1] : null;
    root.querySelector('.simline').innerHTML = st
      ? '<span class="mono simcode">' + esc((lines[st.ln - 1] || '').trim()) + '</span><span class="simdesc">' + esc(st.text) + '</span><span class="simstep">Krok ' + cur + ' z ' + data.steps.length + ' · linia ' + st.ln + '</span>'
      : '<span class="simdesc">' + (data.steps.length ? 'Naciśnij ▶ albo przesuń suwak, żeby zobaczyć ruchy po kolei.' : 'Brak ruchów do pokazania.') + '</span>';
  }
  this.set = function(text, ctl, compareText){
    stop();
    lines = String(text || '').split(/\r?\n/);
    data = simulateProgram(text, ctl);
    cmp = compareText ? simulateProgram(compareText, ctl) : null;
    range.max = data.steps.length;
    cur = opts.showAll ? data.steps.length : 0;
    range.value = cur;
    root.querySelector('.simleg').innerHTML =
      '<span><i class="lg lg-feed"></i>skrawanie</span><span><i class="lg lg-rapid"></i>ruch szybki</span><span><i class="lg lg-hole"></i>wiercenie</span>' +
      (cmp ? '<span><i class="lg lg-old"></i>przed zmianą</span>' : '');
    root.querySelector('.simnotes').innerHTML = data.notes.concat(['Podgląd pokazuje tor z programu (środek albo kontur), bez promienia freza, mocowań i kinematyki maszyny. To nie zastępuje symulacji na sterowaniu.']).map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('');
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
