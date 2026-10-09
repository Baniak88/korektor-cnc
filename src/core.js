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

/* ===== Symulacja toru narzędzia (podgląd, bez kinematyki maszyny) =====
   Zwraca odcinki (szybki / praca / łuk / otwór) i kroki z opisem po polsku dla każdej linii. */
function simWords(code){
  var out = [], re = /(^|[^A-Z_,])(CR|[GMTSFXYZIJKRABCD])\s*=?\s*([+-]?(?:\d+\.?\d*|\.\d+))/gi, m;
  while ((m = re.exec(code))) out.push([m[2].toUpperCase(), parseFloat(m[3])]);
  return out;
}
function fmtN(v){ var s = (Math.round(v * 1000) / 1000).toString(); return s === '-0' ? '0' : s; }
function simulateProgram(text, ctl){
  var lines = String(text || '').split(/\r?\n/);
  var pos = {x:null, y:null, z:null}, abs = true, motion = 0, plane = 17, comp = 40, feed = null;
  var cycF = null, cycZ = null, cycR = null, mcall = null;
  var segs = [], steps = [], notes = {}, noteOrder = [];
  function note(k, t){ if (!notes[k]){ notes[k] = t; noteOrder.push(k); } }
  function pt(p){ return [p.x, p.y, p.z == null ? 0 : p.z]; }
  function hole(ln, x, y, depth, top){
    if (x == null || y == null) return;
    segs.push({ln:ln, type:'hole', a:[x, y, top == null ? (pos.z == null ? 0 : pos.z) : top], b:[x, y, depth == null ? (pos.z == null ? 0 : pos.z) : depth]});
  }
  lines.forEach(function(line, idx){
    var ln = idx + 1;
    var code = segmentLine(line, ctl).filter(function(p){ return p.t === 'code'; }).map(function(p){ return p.s; }).join(' ').toUpperCase();
    if (!code.trim()) return;
    var w = simWords(code), g = [], ax = {}, I = null, J = null, R = null, T = null, Ms = [], hasF = false;
    w.forEach(function(p){
      var k = p[0], v = p[1];
      if (k === 'G') g.push(v);
      else if (k === 'X' || k === 'Y' || k === 'Z') ax[k.toLowerCase()] = v;
      else if (k === 'I') I = v; else if (k === 'J') J = v;
      else if (k === 'R' || k === 'CR') R = v;
      else if (k === 'F'){ feed = v; hasF = true; }
      else if (k === 'T') T = v;
      else if (k === 'M') Ms.push(v);
    });
    var desc = [], moveGiven = ('x' in ax) || ('y' in ax) || ('z' in ax);
    var machineCoords = g.some(function(v){ return v === 53 || v === 28 || v === 30; }) || /(^|[^A-Z_])(SUPA|G153|G74)(?![A-Z_\d])/.test(code);
    if (/G\s*0*68\.2|G\s*0*68(?![\d.])|CYCLE800|TRAORI|G\s*0*43\.4|(^|[^A-Z_])(A?TRANS|A?ROT|A?MIRROR|A?SCALE)(?![A-Z_\d])|G\s*0*5[12](?![\d])/.test(code))
      note('trans', 'Podgląd nie uwzględnia obrotu, przesunięcia, lustra ani pochylenia układu (G68, G68.2, G52, TRANS, ROT, CYCLE800, TCP) — tor jest rysowany w układzie programu.');
    if (/M\s*0*98|M\s*0*99|(^|[^A-Z_])L\d+|CALL/.test(code)) note('sub', 'Podprogramy nie są rozwijane w podglądzie.');
    g.forEach(function(v){
      if (v === 90) abs = true; else if (v === 91) abs = false;
      else if (v === 17 || v === 18 || v === 19) plane = v;
      else if (v === 40 || v === 41 || v === 42){ comp = v; desc.push(v === 40 ? 'Wyłączenie korekcji promienia' : 'Włączenie korekcji promienia (frez po ' + (v === 41 ? 'lewej' : 'prawej') + ' stronie konturu)'); }
      else if (v === 0 || v === 1 || v === 2 || v === 3){ motion = v; if (ctl === 'fanuc') cycF = null; }
      else if (v === 80){ cycF = null; desc.push('Koniec cyklu wiercenia'); }
      else if ([73, 74, 76, 81, 82, 83, 84, 85, 86, 87, 88, 89].indexOf(v) >= 0 && ctl === 'fanuc'){ cycF = v; }
      else if (v === 43 && !machineCoords) desc.push('Korekcja długości narzędzia');
    });
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
      var cyc = {rfp:isFinite(pr[1]) ? pr[1] : 0, dp:isFinite(pr[3]) ? pr[3] : null, name:'CYCLE8' + sc[2]};
      if (sc[1]) mcall = cyc;
      else { hole(ln, pos.x, pos.y, cyc.dp, cyc.rfp); desc.push('Wiercenie (' + cyc.name + ') w X' + fmtN(pos.x) + ' Y' + fmtN(pos.y) + (cyc.dp != null ? ' do Z' + fmtN(cyc.dp) : '')); }
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
        if (pos.z != null && pos.x != null && pos.y != null && (nx !== pos.x || ny !== pos.y)) segs.push({ln:ln, type:'rapid', a:pt(pos), b:[nx, ny, pos.z]});
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
          segs.push({ln:ln, type:'arc', a:pt(a), b:pt(b), c:[cx, cy], r:r, cw:cw});
          desc.push('Łuk ' + (cw ? 'zgodnie' : 'przeciwnie') + ' z ruchem zegara do' + to + ', promień ' + fmtN(r));
        } else { segs.push({ln:ln, type:'feed', a:pt(a), b:pt(b)}); desc.push('Ruch do' + to); }
      } else if (motion === 1){
        segs.push({ln:ln, type:'feed', a:pt(a), b:pt(b)});
        desc.push('Skrawanie po prostej do' + to + (feed != null ? ', posuw F' + fmtN(feed) : ''));
      } else {
        segs.push({ln:ln, type:'rapid', a:pt(a), b:pt(b)});
        desc.push('Ruch szybki do' + to);
      }
      pos = b;
      if (ctl === 'sinumerik' && mcall && (('x' in ax) || ('y' in ax))){ hole(ln, pos.x, pos.y, mcall.dp, mcall.rfp); desc.push('Wiercenie (' + mcall.name + ')'); }
    }
    if (desc.length) steps.push({ln:ln, text:desc.join(' · '), seg:segs.length});
  });
  if (!abs) note('inc', 'Program kończy się w trybie przyrostowym G91 — sprawdź, czy tak ma być.');
  return {segs:segs, steps:steps, notes:noteOrder.map(function(k){ return notes[k]; })};
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
