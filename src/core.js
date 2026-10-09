/* ===== Logika (czyste funkcje) ===== */
var KINDS = {
  outer:  {label:'Czop / szerokość', sub:'wymiar zewnętrzny, 2 strony', k:-1, n:2, ax:'R'},
  inner:  {label:'Otwór / kieszeń',  sub:'wymiar wewnętrzny, 2 strony', k:1,  n:2, ax:'R'},
  wall:   {label:'Jedna ścianka',    sub:'odległość od bazy, 1 strona', k:0,  n:1, ax:'R'},
  depth:  {label:'Głębokość',        sub:'od górnej powierzchni (Z)',   k:1,  n:1, ax:'L'},
  height: {label:'Wysokość / dno',   sub:'grubość od dolnej bazy (Z)',  k:-1, n:1, ax:'L'}
};

function parseNum(s){
  if (s == null) return NaN;
  s = String(s).trim().replace(/\s+/g,'').replace(',', '.').replace(/[−–]/g,'-');
  if (s === '' || s === '+' || s === '-') return NaN;
  return Number(s);
}
function r3(x){ var v = Math.round(x*1000)/1000; return Object.is(v,-0) ? 0 : v; }
function f3(x, sign){ var v = r3(x); var s = v.toFixed(3); if (s === '-0.000') s = '0.000'; return (sign && v > 0 ? '+' : '') + s; }

function calcCorrection(o){
  var nom = o.nom, up = o.up, lo = o.lo, meas = o.meas;
  if (!isFinite(nom) || !isFinite(meas)) return null;
  if (!isFinite(up)) up = 0;
  if (!isFinite(lo)) lo = 0;
  var swapped = false;
  if (lo > up){ var t = lo; lo = up; up = t; swapped = true; }
  var lower = nom + lo, upper = nom + up;
  var target = o.target === 'nom' ? nom : o.target === 'custom' ? o.custom : (lower + upper) / 2;
  if (!isFinite(target)) return null;
  var K = KINDS[o.kind];
  var k = o.kind === 'wall' ? (o.wallDir || 1) : K.k;
  var err = meas - target;
  var delta = err / (k * K.n);
  if (K.ax === 'R' && o.dia) delta *= 2;
  var status = meas < lower - 1e-9 ? 'low' : meas > upper + 1e-9 ? 'high' : 'ok';
  var res = {ax:K.ax, lower:lower, upper:upper, target:target, err:err, delta:r3(delta), status:status, swapped:swapped};
  if (isFinite(o.current)) res.newWear = r3(o.current + res.delta);
  return res;
}

/* --- Program G-code --- */
function segmentLine(line, ctl){
  var parts = [], buf = '', i = 0;
  function push(t, s){ if (s) parts.push({t:t, s:s}); }
  while (i < line.length){
    var ch = line[i], j, end;
    if (ctl === 'fanuc' && ch === '('){
      push('code', buf); buf = '';
      j = line.indexOf(')', i); end = j < 0 ? line.length : j + 1;
      push('cm', line.slice(i, end)); i = end; continue;
    }
    if (ctl === 'sinumerik' && ch === ';'){
      push('code', buf); buf = ''; push('cm', line.slice(i)); i = line.length; continue;
    }
    if (ctl === 'sinumerik' && ch === '"'){
      push('code', buf); buf = '';
      j = line.indexOf('"', i + 1); end = j < 0 ? line.length : j + 1;
      push('cm', line.slice(i, end)); i = end; continue;
    }
    buf += ch; i++;
  }
  push('code', buf);
  return parts;
}
function decOf(n){
  if (!isFinite(n)) return 0;
  var s = String(Math.abs(+(+n).toFixed(6)));
  var i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}
function rawDec(raw){ var i = raw.indexOf('.'); return i < 0 ? 0 : raw.length - i - 1; }
function fmtVal(v, dec, ctl){
  var s = v.toFixed(dec);
  if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
  if (dec === 0 && ctl === 'fanuc') s += '.';
  return s;
}

var SKIP_F = /(^|[^A-Z_])G\s*0*(10|28|30|52|53|65|66|92)(?![\d.])/i;
var SKIP_S = /(^|[^A-Z_])(A?TRANS|A?ROT|A?SCALE|A?MIRROR|SUPA|G53|G153|G74|G75|MCALL)(?![A-Z_\d])/i;
var CALL_S = /(^|[^A-Z_])[A-Z_]{3,}\d*\s*\(/i;
var FIVE_RE = /(^|[^A-Z_\d.])(G\s*0*(43\.4|43\.5|68\.2|68\.3|68\.4|53\.1|53\.6)(?![\d])|TRAORI|CYCLE800|TCARR|TCOABS|TCOFR)/i;
var ROT_AX = {A:1, B:1, C:1};
var CYC_F = {73:1,74:1,76:1,81:1,82:1,83:1,84:1,85:1,86:1,87:1,88:1,89:1};

var WARN_TEXT = {
  arc:   'Łuk G2/G3 ma różnie przesunięty początek i koniec — I/J/R/CR nie będą pasować (Fanuc PS0020, Sinumerik błąd okręgu). Sprawdź te linie.',
  inc:   'Tryb przyrostowy G91 — tych wartości nie zmieniono.',
  skip:  'Bloki pominięte (G10/G28/G52/G53/G92, przesunięcia układu, wywołania cykli). Jeśli dotyczą wymiaru, popraw je ręcznie.',
  cycZ:  'Zmieniono Z w cyklu wiercenia — sprawdź płaszczyznę R i głębokości Q.',
  scyc:  'Wywołania cykli Sinumerik (CYCLE…, POCKET… itp.) nie są zmieniane — popraw ich parametry ręcznie.',
  five:  'Program 5-osiowy (G68.2 / G43.4 / CYCLE800 / TRAORI): X, Y i Z mogą być liczone w pochylonym układzie albo wzdłuż osi narzędzia, nie stołu. Zmiana działa w aktywnym układzie — sprawdź symulacją.',
  rot:   'Zmieniono oś obrotową (wartości w stopniach). Sprawdź kierunek obrotu i zakres osi — na Matsuurze oś A ma ograniczony zakres wychylenia.',
  nodot: 'Wartości bez kropki (np. X10) — w Fanuc mogą znaczyć mikrony. W wyniku wpisano je z kropką. Sprawdź.'
};

function processProgram(text, o){
  var lines = text.split(/\r?\n/);
  var ax = o.axis.toUpperCase();
  var abs = true, motion = 1, cycle = false;
  var pos = null, posNew = null;
  var out = [], changes = [], warns = {}, order = [];
  var re = new RegExp('(^|[^A-Z_,])(' + ax + ')(\\s*=?\\s*)([+-]?(?:\\d+\\.?\\d*|\\.\\d+))(?![\\d.])', 'gi');
  var minDec = o.mode === 'shift' ? decOf(o.delta) : o.mode === 'replace' ? decOf(o.newVal) : decOf(o.delta / 2);
  var from = o.from || 1, to = o.to || lines.length;

  function addW(key, ln){
    if (!warns[key]){ warns[key] = []; order.push(key); }
    if (warns[key].indexOf(ln) < 0) warns[key].push(ln);
  }
  function tf(v){
    var nv = v;
    if (o.mode === 'shift') nv = v + o.delta;
    else if (o.mode === 'replace') nv = Math.abs(v - o.oldVal) < 5e-4 ? o.newVal : v;
    else nv = v > o.center + 1e-9 ? v + o.delta / 2 : v < o.center - 1e-9 ? v - o.delta / 2 : v;
    return Math.round(nv * 1e6) / 1e6;
  }

  lines.forEach(function(line, idx){
    var ln = idx + 1;
    var parts = segmentLine(line, o.ctl);
    var code = parts.filter(function(p){ return p.t === 'code'; }).map(function(p){ return p.s; }).join(' ');
    var gre = /(^|[^A-Z_])G\s*(\d+(?:\.\d+)?)/gi, m;
    while ((m = gre.exec(code))){
      var g = parseFloat(m[2]);
      if (g === 90) abs = true;
      else if (g === 91) abs = false;
      else if (g === 0 || g === 1 || g === 2 || g === 3){ motion = g; if (o.ctl === 'fanuc') cycle = false; }
      else if (g === 80) cycle = false;
      else if (o.ctl === 'fanuc' && CYC_F[g]) cycle = true;
    }
    var inRange = ln >= from && ln <= to;
    var skip = o.ctl === 'fanuc' ? SKIP_F.test(code) : (SKIP_S.test(code) || CALL_S.test(code));
    if (o.ctl === 'sinumerik' && inRange && CALL_S.test(code) && /CYCLE|POCKET|SLOT|HOLES|LONGHOLE|CYCLE/i.test(code)) addW('scyc', ln);
    if (!ROT_AX[ax] && FIVE_RE.test(code)) addW('five', ln);
    var changed = false, marked = '';

    parts.forEach(function(p){
      if (p.t !== 'code'){ marked += p.s; return; }
      marked += p.s.replace(re, function(all, pre, a, eq, num){
        var v = parseFloat(num);
        if (!abs){
          if (pos != null) pos += v;
          if (posNew != null) posNew += v;
          if (inRange && o.mode !== 'replace') addW('inc', ln);
          return all;
        }
        if (skip){
          if (inRange && Math.abs(tf(v) - v) > 1e-9) addW('skip', ln);
          pos = null; posNew = null;
          return all;
        }
        var nv = inRange ? tf(v) : v;
        if ((motion === 2 || motion === 3) && pos != null && posNew != null){
          var s0 = posNew - pos, s1 = nv - v;
          if (Math.abs(s0 - s1) > 1e-7) addW('arc', ln);
        }
        pos = v; posNew = nv;
        if (Math.abs(nv - v) < 1e-9) return all;
        var dec = Math.min(4, Math.max(rawDec(num), minDec));
        if (o.ctl === 'fanuc' && num.indexOf('.') < 0) addW('nodot', ln);
        if (cycle && ax === 'Z') addW('cycZ', ln);
        if (ROT_AX[ax]) addW('rot', ln);
        changed = true;
        return pre + a + eq + '\u0001' + fmtVal(nv, dec, o.ctl) + '\u0002';
      });
    });
    var plain = marked.replace(/[\u0001\u0002]/g, '');
    out.push(plain);
    if (changed) changes.push({ln:ln, old:line, nw:plain, marked:marked});
  });

  return {
    text: out.join('\n'),
    changes: changes,
    warnings: order.map(function(k){ return {key:k, text:WARN_TEXT[k], lines:warns[k]}; }),
    total: lines.length
  };
}
