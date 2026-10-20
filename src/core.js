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

/* --- Pasowania ISO 286 (najczęstsze): odchyłki w µm wg przedziałów wymiarów do 500 mm --- */
var FIT_R = [3,6,10,18,30,50,80,120,180,250,315,400,500];
var FIT_IT = {
  5:[4,5,6,8,9,11,13,15,18,20,23,25,27], 6:[6,8,9,11,13,16,19,22,25,29,32,36,40],
  7:[10,12,15,18,21,25,30,35,40,46,52,57,63], 8:[14,18,22,27,33,39,46,54,63,72,81,89,97],
  9:[25,30,36,43,52,62,74,87,100,115,130,140,155], 10:[40,48,58,70,84,100,120,140,160,185,210,230,250],
  11:[60,75,90,110,130,160,190,220,250,290,320,360,400]
};
/* Wałki d–h: odchyłka górna es */
var FIT_ES = {
  d:[-20,-30,-40,-50,-65,-80,-100,-120,-145,-170,-190,-210,-230], e:[-14,-20,-25,-32,-40,-50,-60,-72,-85,-100,-110,-125,-135],
  f:[-6,-10,-13,-16,-20,-25,-30,-36,-43,-50,-56,-62,-68], g:[-2,-4,-5,-6,-7,-9,-10,-12,-14,-15,-17,-18,-20], h:[0,0,0,0,0,0,0,0,0,0,0,0,0]
};
/* Wałki k–p: odchyłka dolna ei (k: wartości dla IT4–IT7) */
var FIT_EI = {
  k:[0,1,1,1,2,2,2,3,3,4,4,4,5], m:[2,4,6,7,8,9,11,13,15,17,20,21,23],
  n:[4,8,10,12,15,17,20,23,27,31,34,37,40], p:[6,12,15,18,22,26,32,37,43,50,56,62,68]
};
/* Δ dla otworów K, M, N, P (IT5–IT8) */
var FIT_DELTA = {5:[0,1,2,3,3,4,5,5,6,6,7,7,7], 6:[0,3,3,3,4,5,6,7,7,9,9,11,13], 7:[0,4,6,7,8,9,11,13,15,17,20,21,23], 8:[0,6,7,9,12,14,16,19,23,26,29,32,34]};
/* Zwraca {name, hole, up, lo} w mm albo {err} gdy pasowanie nieobsługiwane. */
function parseFit(s){
  var m = String(s || '').trim().match(/^([A-Za-z]{1,2})\s*(\d{1,2})$/);
  if (!m) return null;
  var L = m[1], g = +m[2];
  if (L.length === 2 && L.toLowerCase() !== 'js') return null;
  return {L:L, g:g, hole:L[0] === L[0].toUpperCase(), name:(L.length === 2 ? (L[0] === 'J' ? 'JS' : 'js') : L) + g};
}
function isoFit(size, fit){
  var f = typeof fit === 'string' ? parseFit(fit) : fit;
  if (!f) return {err:'Wpisz np. H7, h6, g6, k6, JS7.'};
  if (!(size > 0) || size > 500) return {err:'Pasowania liczę dla wymiarów od 0 do 500 mm.'};
  var IT = FIT_IT[f.g];
  if (!IT) return {err:'Obsługuję klasy IT5–IT11.'};
  var i = 0; while (size > FIT_R[i] + 1e-9) i++;
  var it = IT[i], l = f.L.toLowerCase(), es, ei;
  if (l === 'js'){ es = it / 2; ei = -it / 2; }
  else if (!f.hole){
    if (FIT_ES[l] != null){ es = FIT_ES[l][i]; ei = es - it; }
    else if (FIT_EI[l] != null){ ei = l === 'k' && (f.g < 4 || f.g > 7) ? 0 : FIT_EI[l][i]; es = ei + it; }
    else return {err:'Wałek ' + f.name + ' nie jest w tabeli. Obsługuję d, e, f, g, h, js, k, m, n, p.'};
  } else {
    if (FIT_ES[l] != null){ ei = -FIT_ES[l][i]; es = ei + it; }
    else if (FIT_EI[l] != null){
      if (f.g > (l === 'p' ? 7 : 8) || f.g < 5 || size > 250) return {err:'Otwór ' + f.name + ' dla tego wymiaru wpisz ręcznie z tabeli.'};
      es = -FIT_EI[l][i] + FIT_DELTA[f.g][i]; ei = es - it;
    } else return {err:'Otwór ' + f.name + ' nie jest w tabeli. Obsługuję D, E, F, G, H, JS, K, M, N, P.'};
  }
  return {name:f.name, hole:f.hole, up:es / 1000, lo:ei / 1000};
}
/* Rozbija „20H7”, „Ø20 g6” na wymiar i pasowanie. */
function splitFit(s){
  var m = String(s || '').replace(/[Øø⌀]/g, '').trim().match(/^(\d+(?:[.,]\d+)?)\s*([A-Za-z]{1,2}\s*\d{1,2})$/);
  return m ? {nom:m[1].replace(',', '.'), fit:m[2].replace(/\s+/g, '')} : null;
}

/* --- Numery alarmów: „41”, „0041”, „PS41”, „ps 0041” trafiają w PS0041 --- */
function alarmKey(s){
  var m = String(s || '').toUpperCase().replace(/\s+/g, '').match(/^([A-Z]{0,3})0*(\d+)$/);
  return m ? {p:m[1], n:m[2]} : null;
}
/* 0 = ten sam numer, 1 = numer zaczyna się od wpisanych cyfr, -1 = numer nie pasuje (szukaj w tekście) */
function alarmNumScore(code, query){
  var wild = String(code).match(/^(\d+)(x+)$/i), qk = alarmKey(query);
  if (wild && qk && !qk.p){
    if (qk.n.length > String(code).length) return -1;
    var pre = qk.n.indexOf(wild[1]) === 0 || wild[1].indexOf(qk.n) === 0;
    return pre ? (qk.n.length === String(code).length ? 0 : 1) : -1;
  }
  var ck = alarmKey(code);
  if (!qk || !ck) return -1;
  if (qk.n === ck.n && (!qk.p || qk.p === ck.p)) return 0;
  if ((!qk.p || qk.p === ck.p) && ck.n.indexOf(qk.n) === 0) return 1;
  return -1;
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

/* ===== Symulacja toru narzędzia (podgląd, bez kinematyki maszyny) =====
   Zwraca odcinki (szybki / praca / łuk / otwór) i kroki z opisem po polsku dla każdej linii. */
function simWords(code){
  var out = [], re = /(^|[^A-Z_,])(CR|[GMTSFXYZIJKRABCD])\s*=?\s*([+-]?(?:\d+\.?\d*|\.\d+))/gi, m;
  while ((m = re.exec(code))) out.push([m[2].toUpperCase(), parseFloat(m[3])]);
  return out;
}
function fmtN(v){ var s = (Math.round(v * 1000) / 1000).toString(); return s === '-0' ? '0' : s; }
function simulateProgram(text, ctl, opts){
  opts = opts || {};
  var lines = String(text || '').split(/\r?\n/);
  var pos = {x:null, y:null, z:null}, abs = true, motion = 0, plane = 17, comp = 40, feed = null;
  var cycF = null, cycZ = null, cycR = null, mcall = null;
  var segs = [], steps = [], notes = {}, noteOrder = [];
  var rot = {A:0, B:0, C:0}, frame = null, tcp = false, rotUsed = false;
  var tool = null, tdia = null, pendT = null, pendD = null, lastDia = null, cycKind = null, ln = 0, zUnknown = false;
  function addSeg(o){ o.tool = tool; o.td = tdia; o.f = feed; o.comp = comp; o.rot = {A:rot.A, B:rot.B, C:rot.C}; o.F = frame; o.tcp = tcp; if (zUnknown) o.zu = true; if (o.type === 'hole') o.cyc = cycKind; segs.push(o); }
  function note(k, t){ if (!notes[k]){ notes[k] = t; noteOrder.push(k); } }
  function pt(p){ return [p.x, p.y, p.z == null ? 0 : p.z]; }
  function hole(ln, x, y, depth, top){
    if (x == null || y == null) return;
    zUnknown = false;
    addSeg({ln:ln, type:'hole', a:[x, y, top == null ? (pos.z == null ? 0 : pos.z) : top], b:[x, y, depth == null ? (pos.z == null ? 0 : pos.z) : depth]});
  }
  lines.forEach(function(line, idx){
    ln = idx + 1;
    var parts = segmentLine(line, ctl);
    var code = parts.filter(function(p){ return p.t === 'code'; }).map(function(p){ return p.s; }).join(' ').toUpperCase();
    var cmt = parts.filter(function(p){ return p.t !== 'code'; }).map(function(p){ return p.s; }).join(' ');
    var dm = cmt.match(/(?:Ø|ø|⌀|\bFI|\bDIA\.?|\bD)\s*=?\s*(\d+(?:[.,]\d+)?)/i), lineDia = dm ? parseFloat(dm[1].replace(',', '.')) : null;
    if (lineDia > 0) lastDia = {d:lineDia, ln:ln}; else lineDia = null;
    var tName = ctl === 'sinumerik' ? line.match(/(^|[^A-Z_])T\s*=\s*"([^"]*)"/i) : null;
    if (!code.trim()) return;
    var w = simWords(code), g = [], ax = {}, I = null, J = null, K = null, R = null, T = null, Ms = [], hasF = false, rw = {};
    w.forEach(function(p){
      var k = p[0], v = p[1];
      if (k === 'G') g.push(v);
      else if (k === 'X' || k === 'Y' || k === 'Z') ax[k.toLowerCase()] = v;
      else if (k === 'I') I = v; else if (k === 'J') J = v;
      else if (k === 'A' || k === 'B' || (k === 'C' && !/(^|[^A-Z_])CR\s*=/.test(code))) rw[k] = v;
      else if (k === 'R' || k === 'CR') R = v;
      else if (k === 'F'){ feed = v; hasF = true; }
      else if (k === 'T') T = v;
      else if (k === 'M') Ms.push(v);
    });
    if (tName){ T = tName[2]; var nd = tName[2].match(/(?:D|Ø|FI)\s*_?(\d+(?:[.,]\d+)?)/i); if (nd && !lineDia) lineDia = parseFloat(nd[1].replace(',', '.')); }
    if (T != null){ pendT = T; pendD = lineDia || (lastDia && ln - lastDia.ln <= 5 ? lastDia.d : null); if (opts.tools && opts.tools[T] > 0) pendD = opts.tools[T]; }
    if (Ms.indexOf(6) >= 0 || (T != null && tool == null && ctl === 'fanuc' && /M\s*0*6(?!\d)/.test(code))){ tool = pendT; tdia = lineDia || pendD; }
    else if (T != null && ctl === 'sinumerik' && Ms.indexOf(6) < 0 && tool == null){ /* Sinumerik: T wybiera, M6 zmienia */ }
    var km = code.match(/(^|[^A-Z_])K\s*=?\s*([+-]?(?:\d+\.?\d*|\.\d+))/); if (km) K = parseFloat(km[2]);
    // płaszczyzna pochylona / TCP / osie obrotowe
    var g682 = g.some(function(v){ return Math.abs(v - 68.2) < 1e-6; });
    if (g682){
      frame = eulerFrame(ax.x || 0, ax.y || 0, ax.z || 0, I || 0, J || 0, K || 0);
      steps.push({ln:ln, text:'Płaszczyzna pochylona G68.2: I' + fmtN(I || 0) + ' J' + fmtN(J || 0) + ' K' + fmtN(K || 0) + ' — od teraz X, Y, Z liczone w pochylonym układzie', seg:segs.length});
      return;
    }
    if (g.some(function(v){ return v === 69; })){ frame = null; }
    if (g.some(function(v){ return Math.abs(v - 43.4) < 1e-6 || Math.abs(v - 43.5) < 1e-6; })) tcp = true;
    if (g.some(function(v){ return v === 49; })) tcp = false;
    if (ctl === 'sinumerik'){
      if (/(^|[^A-Z_])TRAORI(?![A-Z_])/.test(code)) tcp = true;
      if (/(^|[^A-Z_])TRAFOOF(?![A-Z_])/.test(code)) tcp = false;
      var c8 = code.match(/CYCLE800\s*\(([^)]*)\)/);
      if (c8){
        var q8 = c8[1].split(',').map(function(x){ return parseFloat(x); });
        if (!c8[1].trim() || (q8.slice(7, 10).every(function(x){ return !x; }) && q8.slice(4, 7).every(function(x){ return !x; }))) frame = null;
        else frame = axisFrame(q8[4] || 0, q8[5] || 0, q8[6] || 0, q8[7] || 0, q8[8] || 0, q8[9] || 0, q8[10] || 0, q8[11] || 0, q8[12] || 0);
        steps.push({ln:ln, text:frame ? 'Płaszczyzna pochylona CYCLE800 (pokazana w przybliżeniu: obrót X, potem Y, potem Z)' : 'Wyłączenie płaszczyzny pochylonej', seg:segs.length});
        return;
      }
    }
    var rotDesc = [];
    ['A', 'B', 'C'].forEach(function(k){ if (k in rw){ rot[k] = abs ? rw[k] : rot[k] + rw[k]; rotUsed = true; rotDesc.push(k + fmtN(rot[k]) + '°'); } });
    var desc = [], moveGiven = ('x' in ax) || ('y' in ax) || ('z' in ax);
    var machineCoords = g.some(function(v){ return v === 53 || v === 28 || v === 30; }) || /(^|[^A-Z_])(SUPA|G153|G74)(?![A-Z_\d])/.test(code);
    if (/G\s*0*68(?![\d.])|(^|[^A-Z_])(A?TRANS|A?ROT|A?MIRROR|A?SCALE)(?![A-Z_\d])|G\s*0*5[12](?![\d])/.test(code))
      note('trans', 'Podgląd nie uwzględnia obrotu 2D, przesunięcia, lustra ani skali (G68, G52, TRANS, ROT, MIRROR) — tor jest rysowany w układzie programu.');
    if (/M\s*0*98|M\s*0*99|(^|[^A-Z_])L\d+|(^|[^A-Z_])CALL(?![A-Z_])/.test(code)) note('sub', 'Podprogramy nie są rozwijane w podglądzie.');
    g.forEach(function(v){
      if (v === 90) abs = true; else if (v === 91) abs = false;
      else if (v === 17 || v === 18 || v === 19) plane = v;
      else if (v === 40 || v === 41 || v === 42){ comp = v; desc.push(v === 40 ? 'Wyłączenie korekcji promienia' : 'Włączenie korekcji promienia (frez po ' + (v === 41 ? 'lewej' : 'prawej') + ' stronie konturu)'); }
      else if (v === 0 || v === 1 || v === 2 || v === 3){ motion = v; if (ctl === 'fanuc') cycF = null; }
      else if (v === 80){ cycF = null; desc.push('Koniec cyklu wiercenia'); }
      else if ([73, 74, 76, 81, 82, 83, 84, 85, 86, 87, 88, 89].indexOf(v) >= 0 && ctl === 'fanuc'){ cycF = v; }
      else if (v === 43 && !machineCoords) desc.push('Korekcja długości narzędzia');
    });
    if (rotDesc.length) desc.push('Oś obrotowa: ' + rotDesc.join(' ') + (tcp ? ' (z TCP — czubek narzędzia w układzie detalu)' : ''));
    if (g.some(function(v){ return Math.abs(v - 53.1) < 1e-6; })) desc.push('Ustawienie osi obrotowych do płaszczyzny pochylonej (G53.1)');
    if (plane !== 17) note('plane', 'Łuki w płaszczyźnie G18/G19 są pokazane w przybliżeniu.');
    if (T != null && Ms.indexOf(6) >= 0) desc.push('Zmiana narzędzia na T' + fmtN(T));
    else if (T != null) desc.push('Wybór narzędzia T' + fmtN(T));
    if (Ms.indexOf(3) >= 0) desc.push('Wrzeciono w prawo');
    if (Ms.indexOf(4) >= 0) desc.push('Wrzeciono w lewo');
    if (Ms.indexOf(5) >= 0) desc.push('Stop wrzeciona');
    if (Ms.indexOf(8) >= 0) desc.push('Chłodziwo włączone');
    if (Ms.indexOf(9) >= 0) desc.push('Chłodziwo wyłączone');
    if (Ms.indexOf(30) >= 0 || Ms.indexOf(2) >= 0) desc.push('Koniec programu');
    if (Ms.indexOf(0) >= 0 || Ms.indexOf(1) >= 0) desc.push('Zatrzymanie programu');

    // Sinumerik: cykle wiercenia CYCLE8x(RTP, RFP, SDIS, DP, ...)
    var sc = code.match(/(MCALL\s*)?CYCLE8([1-9])\s*\(([^)]*)\)/);
    if (ctl === 'sinumerik' && /(^|[^A-Z_])MCALL\s*$/.test(code.trim())){ mcall = null; desc.push('Koniec wywołania modalnego cyklu'); }
    if (ctl === 'sinumerik' && sc){
      var pr = sc[3].split(',').map(function(s){ return parseFloat(s); });
      var cyc = {rfp:isFinite(pr[1]) ? pr[1] : 0, dp:isFinite(pr[3]) ? pr[3] : null, name:'CYCLE8' + sc[2], kind:80 + (+sc[2])};
      if (!isFinite(cyc.dp) && isFinite(pr[4])) cyc.dp = cyc.rfp - Math.abs(pr[4]);
      cycKind = cyc.kind;
      if (sc[1]) mcall = cyc;
      else { zUnknown = false; hole(ln, pos.x, pos.y, cyc.dp, cyc.rfp); desc.push('Wiercenie (' + cyc.name + ') w X' + fmtN(pos.x) + ' Y' + fmtN(pos.y) + (cyc.dp != null ? ' do Z' + fmtN(cyc.dp) : '')); }
    }

    if (machineCoords){
      if (moveGiven) desc.push('Ruch w układzie maszyny / do punktu referencyjnego (nie rysowany)');
      if (desc.length) steps.push({ln:ln, text:desc.join(' · '), seg:segs.length});
      return;
    }
    if (ctl === 'fanuc' && cycF != null){
      if ('z' in ax) cycZ = abs ? ax.z : (cycZ == null ? 0 : cycZ) + ax.z;
      var rr = w.filter(function(p){ return p[0] === 'R'; })[0]; if (rr) cycR = rr[1];
      if (('x' in ax) || ('y' in ax) || ('z' in ax)){
        var nx = 'x' in ax ? (abs || pos.x == null ? ax.x : pos.x + ax.x) : pos.x, ny = 'y' in ax ? (abs || pos.y == null ? ax.y : pos.y + ax.y) : pos.y;
        if (pos.z != null && pos.x != null && pos.y != null && (nx !== pos.x || ny !== pos.y)){ zUnknown = false; addSeg({ln:ln, type:'rapid', a:pt(pos), b:[nx, ny, pos.z]}); }
        cycKind = cycF;
        pos.x = nx; pos.y = ny;
        hole(ln, nx, ny, cycZ, cycR);
        desc.push('Wiercenie (G' + fmtN(cycF) + ') w X' + fmtN(nx) + ' Y' + fmtN(ny) + (cycZ != null ? ' do Z' + fmtN(cycZ) : ''));
      }
      if (desc.length) steps.push({ln:ln, text:desc.join(' · '), seg:segs.length});
      return;
    }
    if (moveGiven){
      var a = {x:pos.x, y:pos.y, z:pos.z};
      var b = {
        x: 'x' in ax ? (abs || pos.x == null ? ax.x : pos.x + ax.x) : pos.x,
        y: 'y' in ax ? (abs || pos.y == null ? ax.y : pos.y + ax.y) : pos.y,
        z: 'z' in ax ? (abs || pos.z == null ? ax.z : pos.z + ax.z) : pos.z
      };
      zUnknown = a.z == null && b.z == null;
      if (a.z == null) a.z = b.z;
      if (a.x == null || a.y == null || b.x == null || b.y == null){
        // pozycja startowa nieznana — tylko zapamiętaj, nie rysuj
        pos = b; desc.push('Pozycja startowa' + (('x' in ax) ? ' X' + fmtN(b.x) : '') + (('y' in ax) ? ' Y' + fmtN(b.y) : '') + (('z' in ax) ? ' Z' + fmtN(b.z) : ''));
        steps.push({ln:ln, text:desc.join(' · '), seg:segs.length});
        return;
      }
      var to = (('x' in ax) ? ' X' + fmtN(b.x) : '') + (('y' in ax) ? ' Y' + fmtN(b.y) : '') + (('z' in ax) ? ' Z' + fmtN(b.z) : '');
      if (motion === 2 || motion === 3){
        var cw = motion === 2, cx, cy, r;
        if (I != null || J != null){ cx = a.x + (I || 0); cy = a.y + (J || 0); r = Math.hypot(a.x - cx, a.y - cy); }
        else if (R != null){
          r = Math.abs(R);
          var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 1e-9 || d > 2 * r + 1e-6){ note('arc', 'Nie da się narysować łuku w linii ' + ln + ' — promień nie pasuje do punktów (alarm promienia na maszynie).'); cx = (a.x + b.x) / 2; cy = (a.y + b.y) / 2; r = d / 2; }
          else {
            var h = Math.sqrt(Math.max(0, r * r - d * d / 4)), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            var sgn = (cw ? -1 : 1) * (R < 0 ? -1 : 1);
            cx = mx - sgn * h * dy / d; cy = my + sgn * h * dx / d;
          }
        } else { note('arc0', 'Łuk bez R / I J w linii ' + ln + ' — pokazany jako prosta.'); cx = null; }
        if (cx != null){
          addSeg({ln:ln, type:'arc', a:pt(a), b:pt(b), c:[cx, cy], r:r, cw:cw});
          desc.push('Łuk ' + (cw ? 'zgodnie' : 'przeciwnie') + ' z ruchem zegara do' + to + ', promień ' + fmtN(r));
        } else { addSeg({ln:ln, type:'feed', a:pt(a), b:pt(b)}); desc.push('Ruch do' + to); }
      } else if (motion === 1){
        addSeg({ln:ln, type:'feed', a:pt(a), b:pt(b)});
        desc.push('Skrawanie po prostej do' + to + (feed != null ? ', posuw F' + fmtN(feed) : ''));
      } else {
        addSeg({ln:ln, type:'rapid', a:pt(a), b:pt(b)});
        desc.push('Ruch szybki do' + to);
      }
      pos = b;
      zUnknown = false;
      if (ctl === 'sinumerik' && mcall && (('x' in ax) || ('y' in ax))){ cycKind = mcall.kind; hole(ln, pos.x, pos.y, mcall.dp, mcall.rfp); desc.push('Wiercenie (' + mcall.name + ')'); }
    }
    if (desc.length) steps.push({ln:ln, text:desc.join(' · '), seg:segs.length});
  });
  if (!abs) note('inc', 'Program kończy się w trybie przyrostowym G91 — sprawdź, czy tak ma być.');
  if (frame || tcp) note('five5', 'Program kończy się z aktywną płaszczyzną pochyloną albo TCP — sprawdź G69 / G49 (TRAFOOF, CYCLE800()).');
  return {segs:segs, steps:steps, notes:noteOrder.map(function(k){ return notes[k]; })};
}
/* ===== Kontrola przed wgraniem: krańcówki, promień narzędzia, posuw, przejazdy w powietrzu =====
   o: {wo:{x,y,z}|null (G54 w pozycjach maszyny), L (najdłuższe narzędzie), d (Ø gdy brak w programie), top (Z góry materiału),
       lim:{x:[min,max], y:[...], z:[...]} (pozycje maszyny, Z = linia pomiaru wrzeciona), limOk (zakresy sprawdzone na maszynie)} */
function preflight(text, ctl, o){
  o = o || {};
  var sim = simulateProgram(text, ctl), segs = sim.segs, items = [];
  var AX = ['x', 'y', 'z'], ext = {x:[Infinity, -Infinity], y:[Infinity, -Infinity], z:[Infinity, -Infinity]}, extLn = {x:[0, 0], y:[0, 0], z:[0, 0]};
  var skipped = 0, moves = 0;
  function pts(s){ return s.type === 'arc' ? arcPoints(s, 48) : [s.a, s.b]; }
  segs.forEach(function(s){
    if (s.zu) return;
    if (s.F || s.tcp || (s.rot && (s.rot.A || s.rot.B || s.rot.C))){ skipped++; return; }
    moves++;
    pts(s).forEach(function(p){ AX.forEach(function(k, i){ var v = p[i]; if (v == null || !isFinite(v)) return;
      if (v < ext[k][0]){ ext[k][0] = v; extLn[k][0] = s.ln; } if (v > ext[k][1]){ ext[k][1] = v; extLn[k][1] = s.ln; } }); });
  });
  function n3(v){ return String(r3(v)); }

  /* 1. Krańcówki */
  var lim = o.lim, ot = {k:'limit', title:'Krańcówki', lines:[]};
  if (!moves) { ot.sev = 'na'; ot.text = skipped ? 'Wszystkie ruchy są w płaszczyźnie pochylonej albo z obrotem osi — ich pozycji w maszynie nie liczę.' : 'Brak ruchów do sprawdzenia.'; }
  else {
    var bad = [], warn = [], spanBad = [];
    AX.forEach(function(k){
      if (!lim || !lim[k]) return;
      var trav = lim[k][1] - lim[k][0], span = ext[k][1] - ext[k][0];
      if (span > trav + 1e-6){ spanBad.push(k.toUpperCase() + ': program zajmuje ' + n3(span) + ' mm, a przesuw to ' + n3(trav) + ' mm'); ot.lines.push(extLn[k][0], extLn[k][1]); }
    });
    if (o.wo && lim){
      AX.forEach(function(k){
        if (!isFinite(o.wo[k]) || !lim[k]) return;
        var add = o.wo[k] + (k === 'z' ? (isFinite(o.L) ? o.L : 0) : 0);
        var mn = ext[k][0] + add, mx = ext[k][1] + add, K = k.toUpperCase();
        if (mn < lim[k][0] - 1e-6){ bad.push(K + ' w linii ' + extLn[k][0] + ': ' + n3(mn) + ' w maszynie, za krańcówką − o ' + n3(lim[k][0] - mn) + ' mm'); ot.lines.push(extLn[k][0]); }
        else if (mn < lim[k][0] + 5) warn.push(K + ' w linii ' + extLn[k][0] + ': ' + n3(mn - lim[k][0]) + ' mm od krańcówki −');
        if (mx > lim[k][1] + 1e-6){ bad.push(K + ' w linii ' + extLn[k][1] + ': ' + n3(mx) + ' w maszynie, za krańcówką + o ' + n3(mx - lim[k][1]) + ' mm'); ot.lines.push(extLn[k][1]); }
        else if (mx > lim[k][1] - 5) warn.push(K + ' w linii ' + extLn[k][1] + ': ' + n3(lim[k][1] - mx) + ' mm od krańcówki +');
      });
    }
    var all = spanBad.concat(bad);
    if (all.length){ ot.sev = o.limOk ? 'bad' : 'warn'; ot.text = (o.limOk ? '' : 'Według przyjętych zakresów osi (niesprawdzonych na maszynie): ') + all.join('. ') + '.'; }
    else if (!o.wo){ ot.sev = 'na'; ot.text = 'Wpisz G54 (pozycje MASZYNA) i najdłuższe narzędzie, żeby policzyć, czy ruchy zmieszczą się w przesuwach.'; }
    else if (warn.length){ ot.sev = 'warn'; ot.text = 'Mieści się, ale blisko krańcówki: ' + warn.join('. ') + '.'; }
    else { ot.sev = 'ok'; ot.text = 'Wszystkie ruchy mieszczą się w przesuwach' + (o.limOk ? '' : ' (według przyjętych zakresów osi)') + (isFinite(o.L) ? '' : '. Bez długości narzędzia Z jest liczone dla narzędzia o długości 0') + '.'; }
    if (skipped) ot.text += ' Pominięte ruchy z obrotem osi albo płaszczyzną pochyloną: ' + skipped + '.';
  }
  items.push(ot);

  /* 2. Promień narzędzia przy G41/G42 */
  var rr = {k:'radius', title:'Promień narzędzia', lines:[]}, rb = [], rw = [], noD = false, comps = 0, minIn = Infinity;
  segs.forEach(function(s){
    if (s.type !== 'arc' || (s.comp !== 41 && s.comp !== 42)) return;
    comps++;
    var d = s.td > 0 ? s.td : o.d; if (!(d > 0)){ noD = true; return; }
    var inside = (s.comp === 41) !== !!s.cw, R = d / 2;
    if (!inside) return;
    minIn = Math.min(minIn, s.r);
    if (R > s.r + 1e-6){ rb.push('linia ' + s.ln + ': łuk R' + n3(s.r) + ', frez Ø' + n3(d)); rr.lines.push(s.ln); }
    else if (R > s.r - 0.05){ rw.push('linia ' + s.ln + ': łuk R' + n3(s.r) + ', frez Ø' + n3(d)); rr.lines.push(s.ln); }
  });
  var hasComp = segs.some(function(s){ return s.comp === 41 || s.comp === 42; });
  if (rb.length){ rr.sev = 'bad'; rr.text = 'Frez nie zmieści się w łuku wewnętrznym — alarm ' + (ctl === 'fanuc' ? 'PS0041' : '10751') + ' albo podcięcie konturu. ' + rb.slice(0, 2).join('; ') + (rb.length > 2 ? ' i dalej' : '') + '. Weź mniejszy frez albo zwiększ promień łuku.'; }
  else if (rw.length){ rr.sev = 'warn'; rr.text = 'Promień freza jest równy promieniowi łuku — zostaje zero zapasu. Każde dodatnie zużycie promienia da alarm ' + (ctl === 'fanuc' ? 'PS0041' : '10751') + '. ' + rw.slice(0, 2).join('; ') + (rw.length > 2 ? ' i dalej' : '') + '.'; }
  else if (noD){ rr.sev = 'na'; rr.text = 'Program ma łuki z G41/G42, ale nie znam średnicy freza. Wpisz Ø w ustawieniach albo dopisz ją w komentarzu przy narzędziu, np. (FREZ D10).'; }
  else if (!hasComp){ rr.sev = 'na'; rr.text = 'Program nie używa G41/G42 — tor jest po środku narzędzia, nie ma czego sprawdzić.'; }
  else { rr.sev = 'ok'; rr.text = comps ? 'Frez mieści się we wszystkich łukach wewnętrznych' + (isFinite(minIn) ? ' (najmniejszy R' + n3(minIn) + ')' : '') + '.' : 'Kontur z G41/G42 bez łuków — w porządku.'; }
  items.push(rr);

  /* 3. Posuw */
  var ff = {k:'feed', title:'Posuw F', lines:[]}, noF = segs.filter(function(s){ return (s.type === 'feed' || s.type === 'arc') && !(s.f > 0); });
  if (noF.length){ ff.sev = 'bad'; ff.lines = [noF[0].ln]; ff.text = 'Ruch roboczy bez posuwu w linii ' + noF[0].ln + ' — alarm ' + (ctl === 'fanuc' ? 'PS0011' : '14800') + '. Dopisz F przed pierwszym G1/G2/G3.'; }
  else { ff.sev = 'ok'; ff.text = 'Każdy ruch roboczy ma posuw.'; }
  items.push(ff);

  /* 4. Przejazdy w powietrzu: G1/G2/G3 w całości nad materiałem */
  var top = isFinite(o.top) ? o.top : 0, air = {k:'air', title:'Przejazdy w powietrzu', lines:[]}, aLen = 0, aT = 0, aN = 0;
  segs.forEach(function(s){
    if ((s.type !== 'feed' && s.type !== 'arc') || s.zu || s.F || s.tcp) return;
    if (Math.min(s.a[2], s.b[2]) <= top + 0.5) return;
    var P = pts(s), L = 0; for (var i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]);
    if (L < 1) return;
    aLen += L; aN++; if (s.f > 0) aT += L / s.f * 60; air.lines.push(s.ln);
  });
  if (aN){ air.sev = aLen > 30 || aT > 5 ? 'warn' : 'ok'; air.text = aN + ' ' + (aN === 1 ? 'ruch' : 'ruchy') + ' posuwem ponad Z' + n3(top) + ': ' + n3(Math.round(aLen)) + ' mm' + (aT ? ', ok. ' + (aT < 60 ? Math.round(aT) + ' s' : (aT / 60).toFixed(1).replace('.', ',') + ' min') + ' na cykl' : '') + '. Tam, gdzie narzędzie nie dotyka materiału, wystarczy G0.'; }
  else { air.sev = 'ok'; air.text = 'Brak ruchów roboczych nad Z' + n3(top) + '.'; }
  items.push(air);

  var cnt = {bad:0, warn:0, ok:0, na:0}; items.forEach(function(it){ cnt[it.sev]++; it.lines = it.lines.filter(function(v, i, a){ return v && a.indexOf(v) === i; }).sort(function(a, b){ return a - b; }); });
  return {items:items, ext:ext, extLn:extLn, cnt:cnt, skipped:skipped, moves:moves};
}

function arcPoints(s, n){
  var a0 = Math.atan2(s.a[1] - s.c[1], s.a[0] - s.c[0]), a1 = Math.atan2(s.b[1] - s.c[1], s.b[0] - s.c[0]);
  var sweep = a1 - a0;
  if (s.cw){ if (sweep >= -1e-9) sweep -= 2 * Math.PI; } else { if (sweep <= 1e-9) sweep += 2 * Math.PI; }
  if (Math.abs(s.a[0] - s.b[0]) < 1e-9 && Math.abs(s.a[1] - s.b[1]) < 1e-9) sweep = s.cw ? -2 * Math.PI : 2 * Math.PI;
  n = n || Math.max(8, Math.ceil(Math.abs(sweep) / (Math.PI / 36)));
  var pts = [];
  for (var i = 0; i <= n; i++){
    var t = i / n, ang = a0 + sweep * t;
    pts.push([s.c[0] + s.r * Math.cos(ang), s.c[1] + s.r * Math.sin(ang), s.a[2] + (s.b[2] - s.a[2]) * t]);
  }
  return pts;
}

/* Punkt zerowy z dotknięcia (pozycje maszynowe). o: {ax, m:'edge'|'center', side:-1|1, d, p, p2, ev, L, b, kind:'hole'|'boss'}
   Zwraca {value (do wpisania w G54), at (pozycja krawędzi/środka/powierzchni), size?} albo null. */
function calcZero(o){
  var p = parseNum(o.p), d = parseNum(o.d), ev = parseNum(o.ev); if (!isFinite(ev)) ev = 0;
  if (!isFinite(p)) return null;
  if (o.ax === 'Z'){
    var L = parseNum(o.L), b = parseNum(o.b); if (!isFinite(b)) b = 0;
    if (!isFinite(L)) return null;
    var surf = p - L - b;
    return {value: r3(surf - ev), at: r3(surf)};
  }
  if (o.m === 'center'){
    var p2 = parseNum(o.p2); if (!isFinite(p2)) return null;
    var cen = (p + p2) / 2, gap = Math.abs(p2 - p);
    return {value: r3(cen - ev), at: r3(cen), size: isFinite(d) ? r3(o.kind === 'boss' ? gap - d : gap + d) : null};
  }
  if (!isFinite(d)) return null;
  var edge = p - (o.side < 0 ? -1 : 1) * d / 2;
  return {value: r3(edge - ev), at: r3(edge)};
}
/* Długość narzędzia z dotknięcia. o: {m:'part'|'zero', p (Z maszynowe), base (G54 Z), b (płytka)} */
function calcToolLen(o){
  var p = parseNum(o.p), b = parseNum(o.b); if (!isFinite(b)) b = 0;
  var base = o.m === 'part' ? parseNum(o.base) : 0;
  if (!isFinite(p) || !isFinite(base)) return null;
  return r3(p - base - b);
}

/* ===== Generator programu 2.5D i otworów (Fanuc / Sinumerik) ===== */
var TAP_TABLE = {3:[0.5,2.5], 4:[0.7,3.3], 5:[0.8,4.2], 6:[1,5], 8:[1.25,6.8], 10:[1.5,8.5], 12:[1.75,10.2], 14:[2,12], 16:[2,14], 18:[2.5,15.5], 20:[2.5,17.5], 24:[3,21], 30:[3.5,26.5]};
/* "M10" → gwint zwykły z tabeli; "M10x1" → drobnozwojny, wiertło = d − skok */
function tapInfo(s){
  var m = String(s || '').toUpperCase().replace(/\s/g, '').replace(/,/g, '.').match(/^M?(\d+(?:\.\d+)?)(?:[X×*](\d+(?:\.\d+)?))?$/);
  if (!m) return null;
  var d = +m[1], T = TAP_TABLE[d], p = m[2] ? +m[2] : (T ? T[0] : NaN);
  if (!(p > 0) || !(d > 0)) return null;
  var coarse = T && Math.abs(T[0] - p) < 1e-9;
  return {d:d, pitch:p, drill:coarse ? T[1] : r3(d - p), name:'M' + d + (m[2] && !coarse ? 'x' + p : ''), fine:!coarse};
}

/* Wartości startowe skrawania (narzędzia z węglika, gwintownik HSS-E). Zawsze do sprawdzenia w katalogu narzędzia. */
var MATERIALS = {
  stal:     {name:'Stal (C45, S355)', mill:150, fz:0.006, face:180, faceFz:0.12, drill:80,  frev:0.018, tap:10, ream:40},
  nierdz:   {name:'Stal nierdzewna',  mill:90,  fz:0.004, face:120, faceFz:0.10, drill:50,  frev:0.012, tap:6,  ream:25},
  alu:      {name:'Aluminium',        mill:300, fz:0.010, face:400, faceFz:0.10, drill:150, frev:0.025, tap:20, ream:60},
  zeliwo:   {name:'Żeliwo',           mill:150, fz:0.007, face:150, faceFz:0.15, drill:90,  frev:0.022, tap:12, ream:40},
  tworzywo: {name:'Tworzywo',         mill:250, fz:0.010, face:300, faceFz:0.10, drill:100, frev:0.030, tap:15, ream:40}
};
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
/* o: {tool:'mill'|'face'|'drill'|'spot'|'tap'|'ream', d, z (ostrza), mat, maxS, pitch} → {vc, S, F, fz|frev, capped} */
function cutData(o){
  var M = MATERIALS[o.mat] || MATERIALS.stal, d = +o.d, maxS = +o.maxS || 15000, vc, per, F, z = 0;
  if (!(d > 0)) return null;
  if (o.tool === 'face'){ vc = M.face; z = +o.z || Math.max(3, Math.round(d / 10)); per = M.faceFz; }
  else if (o.tool === 'mill'){ vc = M.mill; z = +o.z || (o.mat === 'alu' ? 3 : 4); per = clamp(M.fz * d, 0.01, 0.15); }
  else if (o.tool === 'drill'){ vc = M.drill; per = clamp(M.frev * d, 0.03, 0.4); }
  else if (o.tool === 'spot'){ vc = M.drill * 0.8; per = 0.05; }
  else if (o.tool === 'ream'){ vc = M.ream; per = clamp(0.02 * d, 0.1, 0.5); }
  else if (o.tool === 'tap'){ vc = M.tap; per = +o.pitch; if (!(per > 0)) return null; }
  else return null;
  var S = vc * 1000 / (Math.PI * d), capped = false;
  if (S > maxS){ S = maxS; capped = true; }
  S = Math.max(10, Math.round(S / 10) * 10);
  if (o.tool === 'tap') F = S * per; else F = z ? S * per * z : S * per;
  return {vc:vc, S:S, F:Math.max(1, Math.round(F * (o.tool === 'tap' ? 1000 : 1)) / (o.tool === 'tap' ? 1000 : 1)), fz:z ? per : null, frev:z ? null : per, z:z, capped:capped};
}

function holePattern(p){
  var pts = [], n, i, j;
  if (!p) return pts;
  if (p.kind === 'row'){
    n = Math.round(+p.n) || 0;
    for (i = 0; i < n; i++) pts.push([r3(+p.x + i * (+p.dx || 0)), r3(+p.y + i * (+p.dy || 0))]);
  } else if (p.kind === 'circle'){
    n = Math.round(+p.n) || 0;
    var R = (+p.pcd || 0) / 2, a0 = (+p.a0 || 0) * Math.PI / 180;
    for (i = 0; i < n; i++){ var a = a0 + 2 * Math.PI * i / n; pts.push([r3(+p.x + R * Math.cos(a)), r3(+p.y + R * Math.sin(a))]); }
  } else if (p.kind === 'grid'){
    var nx = Math.round(+p.nx) || 0, ny = Math.round(+p.ny) || 0;
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++){ var ii = j % 2 ? nx - 1 - i : i; pts.push([r3(+p.x + ii * (+p.dx || 0)), r3(+p.y + j * (+p.dy || 0))]); }
  } else {
    var src = Array.isArray(p.pts) ? p.pts : String(p.text || '').split(/[;\n]+/).map(function(s){
      var m = s.replace(/,(?=\d)/g, '.').match(/X?\s*([-+]?\d*\.?\d+)\s*[\s,/]\s*Y?\s*([-+]?\d*\.?\d+)/i);
      return m ? [+m[1], +m[2]] : null;
    });
    src.forEach(function(q){ if (q && isFinite(q[0]) && isFinite(q[1])) pts.push([r3(+q[0]), r3(+q[1])]); });
  }
  return pts;
}

function zLevels(top, bottom, ap){
  var out = [], z = top;
  if (!(ap > 0) || bottom >= top) return [bottom];
  while (z - ap > bottom + 1e-6){ z = r3(z - ap); out.push(z); }
  out.push(bottom);
  return out;
}
function asciiUp(s){
  var map = {'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ź':'z','ż':'z','Ą':'A','Ć':'C','Ę':'E','Ł':'L','Ń':'N','Ó':'O','Ś':'S','Ź':'Z','Ż':'Z','Ø':'D','ø':'D','×':'X','–':'-','—':'-'};
  return String(s || '').replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻØø×–—]/g, function(c){ return map[c]; }).replace(/[()";]/g, ' ').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
var OP_NAMES = {face:'Planowanie', pocket:'Kieszeń', boss:'Kontur zewnętrzny', holes:'Otwory'};
var HOLE_NAMES = {spot:'Nawiercanie', drill:'Wiercenie', peck:'Wiercenie głębokie', tap:'Gwintowanie', ream:'Rozwiercanie'};

/* Ścieżka prostokąta z zaokrąglonymi narożami, start i koniec w środku prawego boku.
   dir: 'ccw' (G3) albo 'cw' (G2). Zwraca ruchy {g:1|2|3, x, y, i, j}. */
function rrectPath(cx, cy, hx, hy, rc, dir){
  rc = Math.max(0, Math.min(rc, hx, hy));
  var P = [], ccw = dir !== 'cw', g = ccw ? 3 : 2;
  function L(x, y){ P.push({g:1, x:x, y:y}); }
  function A(x, y, ax, ay){ P.push({g:g, x:x, y:y, cx:ax, cy:ay}); }
  var xr = cx + hx, xl = cx - hx, yt = cy + hy, yb = cy - hy;
  if (ccw){
    L(xr, yt - rc); if (rc) A(xr - rc, yt, xr - rc, yt - rc);
    L(xl + rc, yt); if (rc) A(xl, yt - rc, xl + rc, yt - rc);
    L(xl, yb + rc); if (rc) A(xl + rc, yb, xl + rc, yb + rc);
    L(xr - rc, yb); if (rc) A(xr, yb + rc, xr - rc, yb + rc);
    L(xr, cy);
  } else {
    L(xr, yb + rc); if (rc) A(xr - rc, yb, xr - rc, yb + rc);
    L(xl + rc, yb); if (rc) A(xl, yb + rc, xl + rc, yb + rc);
    L(xl, yt - rc); if (rc) A(xl + rc, yt, xl + rc, yt - rc);
    L(xr - rc, yt); if (rc) A(xr, yt - rc, xr - rc, yt - rc);
    L(xr, cy);
  }
  return P;
}

function genProgram(spec){
  var ctl = spec.ctl === 'sinumerik' ? 'sinumerik' : 'fanuc', F = ctl === 'fanuc';
  var safe = isFinite(+spec.safe) ? +spec.safe : 50, rd = isFinite(+spec.rdist) && +spec.rdist > 0 ? +spec.rdist : 2;
  var maxS = +spec.maxS || 15000, out = [], warns = [], errors = [], tools = [];
  var px = null, py = null, pz = null, pf = null;
  function gw(k){ return F ? 'G0' + k : 'G' + k; }
  function fw(f){ f = Math.round(f); if (f === pf) return ''; pf = f; return ' F' + f; }
  function n(v){ var s = r3(v).toFixed(3).replace(/0+$/, '').replace(/\.$/, F ? '.' : ''); if (s === '-0.' || s === '-0') s = F ? '0.' : '0'; return s; }
  function hn(v){ return String(r3(v)).replace('.', ','); }
  function L(s){ out.push(s); }
  function C(s){ s = asciiUp(s); if (s) L(F ? '(' + s + ')' : '; ' + s); }
  function warn(k, t){ if (warns.every(function(w){ return w.k !== k; })) warns.push({k:k, t:t}); }
  function err(i, t){ errors.push({op:i, t:t}); }
  function G0(x, y, z){ var w = []; if (x != null && x !== px){ w.push('X' + n(x)); px = x; } if (y != null && y !== py){ w.push('Y' + n(y)); py = y; } if (z != null && z !== pz){ w.push('Z' + n(z)); pz = z; } if (w.length) L(gw(0) + ' ' + w.join(' ')); }
  function G1(x, y, z, f){ var w = []; if (x != null && Math.abs(x - px) > 1e-9){ w.push('X' + n(x)); px = x; } if (y != null && Math.abs(y - py) > 1e-9){ w.push('Y' + n(y)); py = y; } if (z != null && Math.abs(z - pz) > 1e-9){ w.push('Z' + n(z)); pz = z; } if (w.length) L(gw(1) + ' ' + w.join(' ') + (f ? fw(f) : '')); }
  function arc(m, pre){ L((pre || '') + gw(m.g) + ' X' + n(m.x) + ' Y' + n(m.y) + ' I' + n(m.cx - px) + ' J' + n(m.cy - py)); px = m.x; py = m.y; }
  function path(P){ P.forEach(function(m){ if (m.g === 1) G1(m.x, m.y); else if (Math.abs(m.x - px) > 1e-9 || Math.abs(m.y - py) > 1e-9 || m.full) arc(m); }); }
  function circle(cx, cy, R, g){ L(gw(g) + ' X' + n(cx + R) + ' Y' + n(cy) + ' I' + n(-R) + ' J' + n(0)); px = cx + R; py = cy; }
  function pick(cands, ok){ for (var i = 0; i < cands.length; i++) if (ok(cands[i])) return cands[i]; return null; }

  var name = asciiUp(spec.name || 'DETAL') || 'DETAL';
  if (F){
    var num = String(spec.num || '1000').replace(/\D/g, '').slice(0, 4) || '1000';
    L('%'); L('O' + num + ' (' + name + ')');
  } else L('; ' + name);
  C('KOREKTOR CNC - PROGRAM WYGENEROWANY Z FORMULARZA');
  C('SPRAWDZ NA SYMULACJI I NA SUCHO PRZED OBROBKA');
  if (spec.datum) C('BAZA G54: ' + spec.datum);
  if (spec.mat && MATERIALS[spec.mat]) C('MATERIAL: ' + MATERIALS[spec.mat].name);
  L(F ? 'G21 G17 G40 G49 G80 G90 G94' : 'G17 G40 G90 G94 G71');

  (spec.ops || []).forEach(function(op, i){
    var no = i + 1, T = Math.round(+op.T) || no, d = +op.d, rt = d / 2, S = Math.round(+op.S), Fd = +op.F;
    var Fp = +op.Fz > 0 ? +op.Fz : Math.max(1, Math.round(Fd / 3)), top = isFinite(+op.top) ? +op.top : 0;
    var start = out.length, e0 = errors.length;
    if (!(d > 0)) err(no, 'Podaj średnicę narzędzia.');
    if (!(S > 0)) err(no, 'Podaj obroty S.');
    if (!(Fd > 0)) err(no, 'Podaj posuw F.');
    if (S > maxS) err(no, 'Obroty S' + S + ' większe niż maks. wrzeciona (' + maxS + ').');
    var kind = op.type === 'holes' ? (op.kind || 'drill') : '';
    var label = op.type === 'holes' ? HOLE_NAMES[kind] || 'Otwory' : OP_NAMES[op.type] || op.type;
    var toolDesc = op.tname || (op.type === 'face' ? 'GLOWICA' : op.type === 'holes' ? (kind === 'tap' ? 'GWINTOWNIK ' + (op.thread || '') : kind === 'ream' ? 'ROZWIERTAK' : kind === 'spot' ? 'NAWIERTAK' : 'WIERTLO') : 'FREZ') + ' D' + n(d).replace(/\.$/, '');
    tools.push({T:T, d:d, desc:toolDesc, op:no});
    var depth = +op.depth, sx, sy;
    var first = null;
    // pierwszy punkt operacji (do najazdu)
    if (op.type === 'face'){
      var x0 = Math.min(+op.x0, +op.x1), x1 = Math.max(+op.x0, +op.x1), y0 = Math.min(+op.y0, +op.y1), y1 = Math.max(+op.y0, +op.y1);
      if (![x0, x1, y0, y1].every(isFinite) || x1 - x0 <= 0 || y1 - y0 <= 0) err(no, 'Podaj obszar planowania (X od–do, Y od–do).');
      var zf = isFinite(+op.z) ? +op.z : 0, step = +op.step > 0 ? +op.step : d * 0.7, ov = d * 0.1;
      if (step > d * 0.9) err(no, 'Zachodzenie ścieżek za małe: krok boczny musi być mniejszy niż 0,9 × średnica.');
      var ya = y0 - ov + rt, yb = y1 + ov - rt, rows = [];
      if (yb <= ya) rows = [(y0 + y1) / 2];
      else { var nr = Math.max(1, Math.ceil((yb - ya) / step - 1e-9)) + 1; for (var k = 0; k < nr; k++) rows.push(ya + (yb - ya) * k / (nr - 1)); }
      var xa = x0 - rt - 2, xb = x1 + rt + 2;
      first = [xa, rows[0]];
      op._run = function(){
        zLevels(top, zf, +op.ap > 0 ? +op.ap : 2).forEach(function(z, li){
          if (li){ G0(null, null, z + rd + (top - z)); G0(xa, rows[0]); }
          G0(xa, rows[0], z + rd + (li ? 0 : top - z)); G1(null, null, z, Fp);
          rows.forEach(function(y, ri){ var xe = ri % 2 ? xa : xb, xs = ri % 2 ? xb : xa; if (ri) G1(xs, y, null, Fd); G1(xe, y, null, Fd); });
        });
      };
      if (zf > top) err(no, 'Z końcowe wyżej niż góra materiału.');
    } else if (op.type === 'pocket' || op.type === 'boss'){
      var cx = +op.cx || 0, cy = +op.cy || 0, circ = op.shape === 'circle', allow = isFinite(+op.allow) && +op.allow >= 0 ? +op.allow : 0.2;
      var stp = +op.step > 0 ? +op.step : d * 0.5, w = +op.w, h = +op.h, D = +op.D, rc = +op.r || 0, bot = depth;
      if (!isFinite(bot) || bot >= top) err(no, 'Podaj głębokość (Z dna niżej niż góra materiału, np. −10).');
      if (stp > d * 0.9) err(no, 'Krok boczny musi być mniejszy niż 0,9 × średnica.');
      if (circ && !(D > 0)) err(no, 'Podaj średnicę.');
      if (!circ && !(w > 0 && h > 0)) err(no, 'Podaj wymiary X i Y.');
      if (!circ && rc > Math.min(w, h) / 2 + 1e-9) err(no, 'Promień naroża większy niż połowa krótszego boku.');
      var levels = zLevels(top, bot, +op.ap > 0 ? +op.ap : d * 0.5);
      if (op.type === 'pocket'){
        var A = circ ? D / 2 - rt - allow : w / 2 - rt - allow, B = circ ? A : h / 2 - rt - allow;
        if (d > 0 && (A <= 0 || B <= 0)) err(no, 'Frez Ø' + hn(d) + ' za duży na tę kieszeń.');
        if (!circ && rc > 0 && rc <= rt + 1e-9) err(no, 'Promień naroża R' + hn(rc) + ' musi być większy niż promień freza (' + hn(rt) + '). Weź mniejszy frez albo wpisz R 0 (zostanie promień freza).');
        if (!circ && rc === 0) warn('rc0', 'Naroża kieszeni: zostanie promień freza R' + hn(rt) + '.');
        warn('plunge', 'Kieszeń: wejście pionowe w środku z posuwem wgłębnym — frez musi skrawać czołem albo wywierć wcześniej otwór startowy.');
        first = [cx, cy];
        op._run = function(){
          var m = Math.min(A, B), ins = [];
          for (var t = m; t > 1e-6; t -= stp) ins.push(t);
          ins.push(0);
          var rr = Math.max(0, rc - rt - allow);
          levels.forEach(function(z, li){
            if (li){ G0(null, null, pz + rd); G0(cx, cy); G0(null, null, levels[li - 1] + rd); } else G0(cx, cy, top + rd);
            G1(null, null, z, Fp);
            ins.forEach(function(t){
              var hx = Math.max(0, A - t), hy = Math.max(0, B - t);
              if (circ){ if (hx > 1e-6){ G1(cx + hx, cy, null, Fd); circle(cx, cy, hx, 3); } }
              else { G1(cx + hx, cy, null, Fd); path(rrectPath(cx, cy, hx, hy, Math.max(0, rr - t), 'ccw')); }
            });
            G1(cx, cy);
          });
          // wykończenie ściany z korekcją promienia G41 (współbieżnie)
          C('WYKONCZENIE SCIANY Z KOREKCJA PROMIENIA');
          var Rw = circ ? D / 2 : w / 2, Hh = circ ? D / 2 : h / 2;
          sx = cx + Rw; sy = cy;
          var Rl = pick([0.9, 0.75, 0.6, 0.45].map(function(f){ return f * (Math.min(Rw, Hh) - rt); }), function(R){
            if (!(R > rt * 1.05)) return false;
            if (circ) return Math.sqrt(Math.pow(Rw - R, 2) + R * R) <= Rw - rt + 1e-9;
            return R <= Hh - rt + 1e-9 && R <= Rw;
          });
          var dcode = F ? ' D' + T : '';
          if (Rl){
            L('G41 ' + gw(1) + ' X' + n(sx - Rl) + ' Y' + n(sy - Rl) + dcode + fw(Fd)); px = sx - Rl; py = sy - Rl;
            arc({g:3, x:sx, y:sy, cx:sx - Rl, cy:sy});
          } else { L('G41 ' + gw(1) + ' X' + n(sx) + ' Y' + n(sy) + dcode + fw(Fd)); px = sx; py = sy; }
          if (circ) circle(cx, cy, Rw, 3); else path(rrectPath(cx, cy, Rw, Hh, rc, 'ccw'));
          if (Rl) arc({g:3, x:sx - Rl, y:sy + Rl, cx:sx - Rl, cy:sy});
          L('G40 ' + gw(1) + ' X' + n(cx) + ' Y' + n(cy)); px = cx; py = cy;
        };
      } else {
        var stock = isFinite(+op.stock) && +op.stock >= 0 ? +op.stock : 2;
        var Rw2 = circ ? D / 2 : w / 2, Hh2 = circ ? D / 2 : h / 2, ex = cx + Rw2 + stock + rt + 2;
        first = [ex, cy];
        op._run = function(){
          var offs = [];
          for (var s = stock; s > 1e-6; s -= stp) offs.push(rt + allow + s);
          offs.push(rt + allow);
          levels.forEach(function(z, li){
            if (li) G0(null, null, pz + rd);
            G0(ex, cy); G0(null, null, (li ? levels[li - 1] : top) + rd); G1(null, null, z, Fp);
            offs.forEach(function(o){
              G1(cx + Rw2 + o, cy, null, Fd);
              if (circ) circle(cx, cy, Rw2 + o, 2); else path(rrectPath(cx, cy, w / 2 + o, h / 2 + o, rc + o, 'cw'));
            });
            G1(ex, cy);
          });
          C('WYKONCZENIE KONTURU Z KOREKCJA PROMIENIA');
          sx = cx + Rw2; sy = cy;
          var Rl = Math.max(rt * 1.5, 3), dcode = F ? ' D' + T : '';
          G1(sx + Rl + rt + 2, sy + Rl);
          L('G41 ' + gw(1) + ' X' + n(sx + Rl) + ' Y' + n(sy + Rl) + dcode + fw(Fd)); px = sx + Rl; py = sy + Rl;
          arc({g:3, x:sx, y:sy, cx:sx + Rl, cy:sy});
          if (circ) circle(cx, cy, Rw2, 2); else path(rrectPath(cx, cy, Rw2, Hh2, rc, 'cw'));
          arc({g:3, x:sx + Rl, y:sy - Rl, cx:sx + Rl, cy:sy});
          L('G40 ' + gw(1) + ' X' + n(sx + Rl + rt + 2) + ' Y' + n(sy - Rl)); px = sx + Rl + rt + 2; py = sy - Rl;
        };
      }
      warn('g41', 'Ściany wykańczane z korekcją promienia G41 — wymiar poprawisz zużyciem promienia ' + (F ? '(D)' : '(ΔR)') + ' w tabeli narzędzi.');
    } else if (op.type === 'holes'){
      var pts = holePattern(op.pattern || {kind:'list', pts:op.pts});
      if (!pts.length) err(no, 'Brak pozycji otworów.');
      if (!isFinite(depth) || depth >= top) err(no, 'Podaj głębokość otworu (Z dna niżej niż góra materiału).');
      var q = +op.q > 0 ? +op.q : Math.max(1, r3(d)), pitch = +op.pitch, dw = Math.round(+op.dwell || 0);
      if (kind === 'tap' && !(pitch > 0)) err(no, 'Podaj skok gwintu.');
      if (kind === 'tap'){ Fd = r3(S * pitch); warn('tap', F ? 'Gwintowanie sztywne: M29 przed G84 — na niektórych maszynach kod jest inny albo niepotrzebny (parametr). Sprawdź w instrukcji maszyny.' : 'CYCLE84: wrzeciono musi pracować w trybie pozycjonowania. Parametry cyklu sprawdź na ekranie cyklu.'); }
      if (kind === 'peck' && q > Math.abs(depth - top)) q = r3(Math.abs(depth - top));
      first = pts[0];
      op._run = function(){
        var R = top + rd;
        if (F){
          var head = '';
          if (kind === 'tap'){ L('M29 S' + S); head = 'G98 G84'; }
          else if (kind === 'peck') head = 'G98 G83';
          else if (kind === 'ream') head = 'G98 G85';
          else head = dw > 0 ? 'G98 G82' : 'G98 G81';
          L(head + ' X' + n(pts[0][0]) + ' Y' + n(pts[0][1]) + ' Z' + n(depth) + ' R' + n(R) + (kind === 'peck' ? ' Q' + n(q) : '') + (dw > 0 && kind !== 'tap' && kind !== 'peck' && kind !== 'ream' ? ' P' + dw : '') + ' F' + (kind === 'tap' ? n(Fd) : Math.round(Fd)));
          pts.slice(1).forEach(function(p){ L('X' + n(p[0]) + ' Y' + n(p[1])); });
          L('G80');
        } else {
          var cyc;
          if (kind === 'tap') cyc = 'CYCLE84(' + n(safe) + ',' + n(top) + ',' + n(rd) + ',' + n(depth) + ',,0,3,,' + n(pitch) + ',0,' + S + ',' + S + ')';
          else if (kind === 'peck') cyc = 'CYCLE83(' + n(safe) + ',' + n(top) + ',' + n(rd) + ',' + n(depth) + ',,,' + n(q) + ',' + n(q) + ',0,0,1,1)';
          else if (kind === 'ream') cyc = 'CYCLE85(' + n(safe) + ',' + n(top) + ',' + n(rd) + ',' + n(depth) + ',,0,' + Math.round(Fd) + ',' + Math.round(Fd * 2) + ')';
          else if (dw > 0) cyc = 'CYCLE82(' + n(safe) + ',' + n(top) + ',' + n(rd) + ',' + n(depth) + ',,' + r3(dw / 1000) + ')';
          else cyc = 'CYCLE81(' + n(safe) + ',' + n(top) + ',' + n(rd) + ',' + n(depth) + ')';
          if (kind !== 'tap') L('F' + Math.round(Fd));
          pf = Math.round(Fd);
          L(cyc);
          if (pts.length > 1){
            L('MCALL ' + cyc);
            pts.forEach(function(p, k){ if (k) L('X' + n(p[0]) + ' Y' + n(p[1])); });
            L('MCALL');
          }
        }
        px = pts[pts.length - 1][0]; py = pts[pts.length - 1][1];
        pz = safe;
      };
      warn('cyc', 'Cykle wracają na wysokość bezpieczną Z' + hn(safe) + ' między otworami (' + (F ? 'G98' : 'RTP') + ').');
    } else err(no, 'Nieznany typ operacji.');
    if (errors.length > e0){ op._run = null; return; }

    // ----- nagłówek operacji: zmiana narzędzia, najazd -----
    L('');
    L('N' + no + (F ? ' (' : ' ; ') + asciiUp('OP' + no + ' ' + label + ' - T' + T + ' ' + toolDesc) + (F ? ')' : ''));
    if (F){ L('G91 G28 Z0.'); L('G90'); L('T' + T + ' M06'); }
    else { L('T' + T + ' M6'); L('D1'); }
    px = py = pz = pf = null;
    L((F ? 'G00 G90 G54 X' : 'G54 G0 X') + n(first[0]) + ' Y' + n(first[1])); px = first[0]; py = first[1];
    if (!(op.type === 'holes' && kind === 'tap')) L((F ? 'S' + S + ' M03' : 'S' + S + ' M3'));
    if (F) L('G43 Z' + n(safe) + ' H' + T + (spec.cool !== false ? ' M08' : ''));
    else { L('G0 Z' + n(safe)); if (spec.cool !== false) L('M8'); }
    pz = safe;
    op._run();
    op._run = null;
    G0(null, null, safe);
    if (spec.cool !== false) L(F ? 'M09' : 'M9');
    L(F ? 'M05' : 'M5');
  });
  L('');
  if (F){ L('G91 G28 Z0.'); L('G90'); L('M30'); L('%'); }
  else L('M30');
  var tseen = {};
  tools.forEach(function(t){ if (tseen[t.T] != null && Math.abs(tseen[t.T] - t.d) > 1e-9) warn('tdup' + t.T, 'T' + t.T + ' ma w różnych operacjach różne średnice (' + hn(tseen[t.T]) + ' i ' + hn(t.d) + '). Sprawdź numery narzędzi.'); tseen[t.T] = t.d; });
  if (!F) warn('sintool', 'Zmiana narzędzia „T… M6” i D1 — na niektórych maszynach (np. z zarządzaniem narzędziami) narzędzie wywołuje się nazwą T="…" albo własnym podprogramem. Dopasuj do swojej maszyny.');
  if (!(spec.ops || []).length) errors.push({op:0, t:'Dodaj co najmniej jedną operację.'});
  return {text:out.join('\n').replace(/\n{3,}/g, '\n\n'), warns:warns, errors:errors, tools:tools};
}


/* ===== Symulacja 3D: tor środka narzędzia z korekcją promienia i zbieranie materiału ===== */
/* Dla odcinków z G41/G42 dopisuje s.cpath = [[x,y,z]...] — tor środka freza przesunięty o promień.
   Rogi wypukłe: łuk wokół narożnika; wklęsłe: przecięcie torów. Zwraca listę uwag. */
function compPaths(segs, defD){
  var notes = [], i = 0;
  function rad(s){ return ((s.td > 0 ? s.td : defD) || 10) / 2; }
  while (i < segs.length){
    var s0 = segs[i];
    if (!(s0.comp === 41 || s0.comp === 42) || s0.type === 'hole' || s0.zu){ i++; continue; }
    var j = i;
    while (j + 1 < segs.length && segs[j + 1].comp === s0.comp && segs[j + 1].type !== 'hole' && segs[j + 1].tool === s0.tool) j++;
    var sg = s0.comp === 41 ? 1 : -1, r = rad(s0);
    // punkty konturu (od końca wejścia)
    var P = [{x:s0.b[0], y:s0.b[1], z:s0.b[2], si:i}];
    for (var k = i + 1; k <= j; k++){
      var s = segs[k];
      if (s.type === 'arc'){
        var inside = (s.cw ? -1 : 1) * sg > 0;
        if (inside && s.r - r < -1e-6) notes.push('Linia ' + s.ln + ': promień łuku R' + fmtN(s.r) + ' mniejszy niż promień freza — na maszynie będzie alarm korekcji.');
        arcPoints(s).slice(1).forEach(function(p){ P.push({x:p[0], y:p[1], z:p[2], si:k}); });
      } else P.push({x:s.b[0], y:s.b[1], z:s.b[2], si:k});
    }
    // usuń punkty bez ruchu w XY (zostaw zmianę Z na poprzednim punkcie)
    var Q = [P[0]];
    for (var q = 1; q < P.length; q++){
      var L = Q[Q.length - 1];
      if (Math.hypot(P[q].x - L.x, P[q].y - L.y) < 1e-7){ Q.push({x:L.x, y:L.y, z:P[q].z, si:P[q].si, zonly:true}); }
      else Q.push(P[q]);
    }
    var pieces = [];
    for (q = 1; q < Q.length; q++){
      if (Q[q].zonly) continue;
      var a = Q[q - 1], b = Q[q], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      var tx = dx / d, ty = dy / d, nx = -ty * sg * r, ny = tx * sg * r;
      pieces.push({a:a, b:b, t:[tx, ty], n:[nx, ny], si:b.si});
    }
    var out = [];
    function add(x, y, z, si){ out.push({p:[x, y, z], si:si}); }
    if (pieces.length){
      var p0 = pieces[0];
      add(p0.a.x + p0.n[0], p0.a.y + p0.n[1], p0.a.z, p0.si);
      for (q = 0; q < pieces.length; q++){
        var A = pieces[q], B = pieces[q + 1];
        if (!B){ add(A.b.x + A.n[0], A.b.y + A.n[1], A.b.z, A.si); break; }
        var cr = A.t[0] * B.t[1] - A.t[1] * B.t[0], dot = A.t[0] * B.t[0] + A.t[1] * B.t[1], vx = A.b.x, vy = A.b.y, vz = A.b.z;
        if (Math.abs(cr) < 1e-9 && dot > 0){ add(vx + A.n[0], vy + A.n[1], vz, A.si); continue; }
        if (sg * cr < 0 || dot < -0.999){
          // róg wypukły: łuk wokół narożnika
          add(vx + A.n[0], vy + A.n[1], vz, A.si);
          var a0 = Math.atan2(A.n[1], A.n[0]), a1 = Math.atan2(B.n[1], B.n[0]), sw = a1 - a0;
          if (sg > 0){ while (sw > 0) sw -= 2 * Math.PI; } else { while (sw < 0) sw += 2 * Math.PI; }
          var nn = Math.max(1, Math.ceil(Math.abs(sw) / (Math.PI / 18)));
          for (var m = 1; m <= nn; m++){ var an = a0 + sw * m / nn; add(vx + r * Math.cos(an), vy + r * Math.sin(an), vz, B.si); }
        } else {
          // róg wklęsły: przecięcie przesuniętych prostych
          var ax0 = A.a.x + A.n[0], ay0 = A.a.y + A.n[1], bx0 = B.a.x + B.n[0], by0 = B.a.y + B.n[1];
          var den = A.t[0] * B.t[1] - A.t[1] * B.t[0], tt = ((bx0 - ax0) * B.t[1] - (by0 - ay0) * B.t[0]) / den;
          var ix = ax0 + A.t[0] * tt, iy = ay0 + A.t[1] * tt;
          if (Math.hypot(ix - vx, iy - vy) > r * 6){ ix = vx + A.n[0]; iy = vy + A.n[1]; }
          add(ix, iy, vz, A.si);
        }
      }
    } else add(s0.b[0], s0.b[1], s0.b[2], i);
    // rozdziel tor na odcinki programu
    var prev = s0.a.slice();
    var startP = out[0].p;
    s0.cpath = [prev, [startP[0], startP[1], s0.b[2]]];
    prev = s0.cpath[1];
    var byS = {};
    out.forEach(function(o, idx){ if (idx === 0) return; (byS[o.si] = byS[o.si] || []).push(o.p); });
    for (k = i + 1; k <= j; k++){
      var sk = segs[k], pts = byS[k] || [];
      if (!pts.length) pts = [[prev[0], prev[1], sk.b[2]]];
      sk.cpath = [prev].concat(pts);
      prev = sk.cpath[sk.cpath.length - 1];
    }
    // wyjście z korekcji (G40)
    var nx2 = segs[j + 1];
    if (nx2 && nx2.comp === 40 && nx2.type !== 'hole' && nx2.tool === s0.tool) nx2.cpath = [prev, nx2.b.slice()];
    i = j + 1;
  }
  return notes;
}
function segPath(s){
  if (s.pts) return s.pts;
  if (s.cpath) return s.cpath;
  if (s.type === 'arc') return arcPoints(s);
  return [s.a, s.b];
}

/* Materiał jako mapa wysokości (Z-map). */
function makeStock(x0, y0, x1, y1, top, bot, maxCells){
  var w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1), cell = Math.max(w, h) / (maxCells || 200);
  var nx = Math.max(2, Math.ceil(w / cell) + 1), ny = Math.max(2, Math.ceil(h / cell) + 1);
  var z = new Float32Array(nx * ny), mark = new Uint8Array(nx * ny);
  for (var i = 0; i < z.length; i++) z[i] = top;
  return {x0:x0, y0:y0, cell:cell, nx:nx, ny:ny, top:top, bot:bot, z:z, mark:mark};
}
/* Przejazd płaskiego (albo stożkowego — wiertło 118°) narzędzia po odcinku. Zwraca liczbę komórek, w które wjechał ruch szybki. */
function cutPiece(st, a, b, r, opt){
  opt = opt || {};
  var minx = Math.min(a[0], b[0]) - r, maxx = Math.max(a[0], b[0]) + r, miny = Math.min(a[1], b[1]) - r, maxy = Math.max(a[1], b[1]) + r;
  var i0 = Math.max(0, Math.floor((minx - st.x0) / st.cell)), i1 = Math.min(st.nx - 1, Math.ceil((maxx - st.x0) / st.cell));
  var j0 = Math.max(0, Math.floor((miny - st.y0) / st.cell)), j1 = Math.min(st.ny - 1, Math.ceil((maxy - st.y0) / st.cell));
  if (i0 > i1 || j0 > j1) return 0;
  var dx = b[0] - a[0], dy = b[1] - a[1], ll = dx * dx + dy * dy, r2 = r * r, hits = 0, cone = opt.cone ? 0.6 : 0, lowest = Math.min(a[2], b[2]);
  if (lowest >= st.top) return 0;
  for (var j = j0; j <= j1; j++){
    var py = st.y0 + j * st.cell;
    for (var i = i0; i <= i1; i++){
      var px = st.x0 + i * st.cell, t = ll > 1e-12 ? ((px - a[0]) * dx + (py - a[1]) * dy) / ll : 0;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      var qx = a[0] + dx * t - px, qy = a[1] + dy * t - py, d2 = qx * qx + qy * qy;
      if (d2 > r2) continue;
      var zt = ll > 1e-12 ? a[2] + (b[2] - a[2]) * t : lowest;
      if (cone) zt += Math.sqrt(d2) * cone;
      var k = j * st.nx + i;
      if (zt < st.z[k] - 1e-6){
        if (opt.rapid && st.z[k] - zt > 0.05){ st.mark[k] = 2; hits++; }
        else if (st.mark[k] !== 2) st.mark[k] = 1;
        st.z[k] = Math.max(zt, st.bot);
      }
    }
  }
  return hits;
}
/* Zbierz materiał odcinkami segs[from..to). Zwraca listę linii z ruchem szybkim w materiale. */
function cutSegs(st, segs, from, to, defD){
  var bad = [];
  for (var n = from; n < to; n++){
    var s = segs[n];
    if (s.zu) continue;
    var r = ((s.td > 0 ? s.td : defD) || 10) / 2, hits = 0;
    if (s.type === 'hole'){
      var cone = [73, 81, 82, 83].indexOf(s.cyc) >= 0;
      hits = cutPiece(st, [s.a[0], s.a[1], s.b[2]], [s.b[0], s.b[1], s.b[2]], r, {cone:cone});
      continue;
    }
    var P = segPath(s);
    for (var q = 1; q < P.length; q++) hits += cutPiece(st, P[q - 1], P[q], r, {rapid:s.type === 'rapid'});
    if (hits && bad.indexOf(s.ln) < 0) bad.push(s.ln);
  }
  return bad;
}


/* ===== 5 osi: płaszczyzna pochylona, TCP, osie obrotowe ===== */
function m3mul(A, B){ var o = []; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return o; }
function m3v(A, v){ return [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]]; }
function m3t(A){ return [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]]; }
function rX(d){ var a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
function rY(d){ var a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
function rZ(d){ var a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
/* Fanuc G68.2: kąty Eulera I (wokół Z), J (wokół nowego X), K (wokół nowego Z) */
function eulerFrame(x, y, z, I, J, K){ return {o:[x, y, z], R:m3mul(m3mul(rZ(I), rX(J)), rZ(K))}; }
/* Sinumerik CYCLE800 w trybie osiowym: przesunięcie, obrót X → Y → Z, przesunięcie po obrocie (przybliżenie) */
function axisFrame(x0, y0, z0, a, b, c, x1, y1, z1){ var R = m3mul(m3mul(rX(a), rY(b)), rZ(c)), o1 = m3v(R, [x1, y1, z1]); return {o:[x0 + o1[0], y0 + o1[1], z0 + o1[2]], R:R}; }
/* Stół uchylno-obrotowy: detal → maszyna. Uchył A (wokół X) albo B (wokół Y), obrót C (wokół Z stołu). */
function tableRot(rot, tilt){ return m3mul(tilt === 'B' ? rY(rot.B || 0) : rX(rot.A || 0), rZ(rot.C || 0)); }
/* Kąty A/C dla zadanej osi narzędzia v (w układzie detalu): v = (sinA·sinC, sinA·cosC, cosA); preferujemy A ≤ 0 */
function rotFromAxis(v){
  var A = -Math.acos(Math.max(-1, Math.min(1, v[2]))) * 180 / Math.PI, sA = Math.sin(A * Math.PI / 180);
  var C = Math.abs(sA) < 1e-9 ? 0 : Math.atan2(v[0] / sA, v[1] / sA) * 180 / Math.PI;
  return {A:r3(A), B:0, C:r3(C)};
}
function resetLocal(segs){
  segs.forEach(function(s){
    if (s.la){ s.a = s.la.slice(); s.b = s.lb.slice(); } else { s.la = s.a.slice(); s.lb = s.b.slice(); }
    delete s.cpath; delete s.pts; delete s.v; delete s.mrot; s.five = false;
  });
}
/* Przelicz odcinki z układu programu do układu detalu (G54). Zwraca true, gdy program jest 5-osiowy. */
function partTransform(segs, tilt){
  var any = false;
  if (!tilt) tilt = segs.some(function(s){ return s.rot && s.rot.B; }) ? 'B' : 'A';
  segs.forEach(function(s){
    var rot = s.rot || {A:0, B:0, C:0}, hasRot = !!(rot.A || rot.B || rot.C);
    if (!s.F && !hasRot) return;
    var P = s.cpath || (s.type === 'arc' ? arcPoints(s) : [s.a, s.b]), pts, v;
    if (s.F){
      pts = P.map(function(p){ var q = m3v(s.F.R, p); return [q[0] + s.F.o[0], q[1] + s.F.o[1], q[2] + s.F.o[2]]; });
      v = m3v(s.F.R, [0, 0, 1]);
      s.mrot = hasRot ? rot : rotFromAxis(v);
    } else {
      var Rt = m3t(tableRot(rot, tilt));
      pts = s.tcp ? P.map(function(p){ return p.slice(); }) : P.map(function(p){ return m3v(Rt, p); });
      v = m3v(Rt, [0, 0, 1]);
      s.mrot = rot;
    }
    s.pts = pts; s.a = pts[0].slice(); s.b = pts[pts.length - 1].slice(); s.v = v; s.five = true; s.tilt = tilt;
    if (Math.abs(v[2] - 1) > 1e-6) any = true;
  });
  return any;
}

/* Materiał wokselowy (dla 5 osi): 1 = materiał, 0 = zebrany, 2 = zebrany ruchem szybkim */
function makeVox(x0, y0, z0, x1, y1, z1, maxCells){
  var c = Math.max(x1 - x0, y1 - y0, z1 - z0, 1) / (maxCells || 120);
  var nx = Math.max(2, Math.ceil((x1 - x0) / c)), ny = Math.max(2, Math.ceil((y1 - y0) / c)), nz = Math.max(2, Math.ceil((z1 - z0) / c));
  var v = new Uint8Array(nx * ny * nz); v.fill(1);
  return {vox:true, x0:x0, y0:y0, z0:z0, c:c, cell:c, nx:nx, ny:ny, nz:nz, v:v, top:z1, bot:z0};
}
/* Walec narzędzia (oś ax, długość L od czubka) przesunięty od a do b. */
function voxCut(vx, a, b, ax, r, L, opt){
  opt = opt || {};
  var c = vx.c, hits = 0, e = [a[0] + ax[0] * L, a[1] + ax[1] * L, a[2] + ax[2] * L], f = [b[0] + ax[0] * L, b[1] + ax[1] * L, b[2] + ax[2] * L];
  var lo = [Math.min(a[0], b[0], e[0], f[0]) - r, Math.min(a[1], b[1], e[1], f[1]) - r, Math.min(a[2], b[2], e[2], f[2]) - r];
  var hi = [Math.max(a[0], b[0], e[0], f[0]) + r, Math.max(a[1], b[1], e[1], f[1]) + r, Math.max(a[2], b[2], e[2], f[2]) + r];
  var i0 = Math.max(0, Math.floor((lo[0] - vx.x0) / c)), i1 = Math.min(vx.nx - 1, Math.floor((hi[0] - vx.x0) / c));
  var j0 = Math.max(0, Math.floor((lo[1] - vx.y0) / c)), j1 = Math.min(vx.ny - 1, Math.floor((hi[1] - vx.y0) / c));
  var k0 = Math.max(0, Math.floor((lo[2] - vx.z0) / c)), k1 = Math.min(vx.nz - 1, Math.floor((hi[2] - vx.z0) / c));
  if (i0 > i1 || j0 > j1 || k0 > k1) return 0;
  var d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dv = d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2];
  var dp = [d[0] - dv * ax[0], d[1] - dv * ax[1], d[2] - dv * ax[2]], dpp = dp[0] * dp[0] + dp[1] * dp[1] + dp[2] * dp[2], r2 = r * r;
  var nxy = vx.nx * vx.ny, cone = opt.cone ? 0.6 : 0;
  for (var k = k0; k <= k1; k++){
    var qz = vx.z0 + (k + 0.5) * c;
    for (var j = j0; j <= j1; j++){
      var qy = vx.y0 + (j + 0.5) * c, base = k * nxy + j * vx.nx;
      for (var i = i0; i <= i1; i++){
        var idx = base + i; if (!vx.v[idx] || (vx.v[idx] !== 1 && !opt.rapid)) { if (vx.v[idx] !== 1) continue; }
        var qx = vx.x0 + (i + 0.5) * c, w0 = qx - a[0], w1 = qy - a[1], w2 = qz - a[2];
        var s0 = w0 * ax[0] + w1 * ax[1] + w2 * ax[2];
        var p0 = w0 - s0 * ax[0], p1 = w1 - s0 * ax[1], p2 = w2 - s0 * ax[2], t;
        if (dpp > 1e-12){ t = (p0 * dp[0] + p1 * dp[1] + p2 * dp[2]) / dpp; t = t < 0 ? 0 : t > 1 ? 1 : t; }
        else t = Math.abs(dv) > 1e-12 ? Math.max(0, Math.min(1, s0 / dv)) : 0;
        var e0 = p0 - t * dp[0], e1 = p1 - t * dp[1], e2 = p2 - t * dp[2], dd = e0 * e0 + e1 * e1 + e2 * e2;
        if (dd > r2) continue;
        var sa = s0 - t * dv;
        if (sa < (cone ? Math.sqrt(dd) * cone : 0) - c * 0.5 || sa > L) continue;
        if (opt.rapid){ var rr = r - c * 1.5; if (dd <= rr * rr && sa > c){ vx.v[idx] = 2; hits++; } else vx.v[idx] = 0; } else vx.v[idx] = 0;
      }
    }
  }
  return hits;
}
function voxCutSegs(vx, segs, from, to, defD){
  var bad = [];
  for (var n = from; n < to; n++){
    var s = segs[n]; if (s.zu) continue;
    var r = ((s.td > 0 ? s.td : defD) || 10) / 2, ax = s.v || [0, 0, 1], L = Math.max(r * 3, 12), hits = 0;
    if (s.type === 'hole'){
      var dep = Math.hypot(s.a[0] - s.b[0], s.a[1] - s.b[1], s.a[2] - s.b[2]);
      voxCut(vx, s.b, s.b, ax, r, dep + L, {cone:[73, 81, 82, 83].indexOf(s.cyc) >= 0});
      continue;
    }
    var P = segPath(s);
    for (var q = 1; q < P.length; q++) hits += voxCut(vx, P[q - 1], P[q], ax, r, L, {rapid:s.type === 'rapid'});
    if (hits && bad.indexOf(s.ln) < 0) bad.push(s.ln);
  }
  return bad;
}
