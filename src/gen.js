/* ===== Nowy program: formularz operacji 2.5D + odczyt rysunku przez AI =====
   Kod składa genProgram() z core.js. AI tylko odczytuje wymiary (JSON) — nie pisze G-code. */

var GEN = store.get('gen', null) || {name:'', num:'1000', mat:'stal', datum:'Lewy dolny róg, góra detalu', safe:'50', rdist:'2', cool:true, sx:'', sy:'', sz:'', ops:[]};
var GEN_FILES = [], GEN_UNDO = null, genOpen = store.get('genOpen', 0);
function genSave(){ store.set('gen', GEN); }
function maxS(){ return MACHINES[S.machine].maxS || 15000; }

var MILLS = [3, 4, 5, 6, 8, 10, 12, 16, 20];
function pickMill(max, minCorner){
  var lim = Math.min(max, minCorner > 0 ? minCorner * 2 * 0.95 : Infinity), best = MILLS[0];
  MILLS.forEach(function(d){ if (d <= lim + 1e-9) best = d; });
  return best;
}
function nextT(){ var m = 0; GEN.ops.forEach(function(o){ m = Math.max(m, parseInt(o.T, 10) || 0); }); return m + 1; }
function toolKind(op){ return op.type === 'face' ? 'face' : op.type === 'holes' ? (op.kind === 'peck' ? 'drill' : op.kind) : 'mill'; }
function autoCut(op){
  if (op.auto === false) return;
  var info = op.type === 'holes' && op.kind === 'tap' ? tapInfo(op.thread) : null;
  var c = cutData({tool:toolKind(op), d:parseNum(op.d), z:parseNum(op.z), mat:GEN.mat, maxS:maxS(), pitch:info ? info.pitch : parseNum(op.pitch)});
  if (c){ op.S = String(c.S); op.F = String(c.F); }
}
function newOp(type, o){
  var op = {type:type, T:String(nextT()), auto:true};
  var X = parseNum(GEN.sx) > 0 ? parseNum(GEN.sx) : 100, Y = parseNum(GEN.sy) > 0 ? parseNum(GEN.sy) : 60;
  if (type === 'face') Object.assign(op, {d:'50', z:'', x0:'0', y0:'0', x1:String(X), y1:String(Y), top:'1', zf:'0', ap:'1'});
  if (type === 'pocket') Object.assign(op, {shape:'rect', d:'10', z:'', cx:String(X / 2), cy:String(Y / 2), w:'40', h:'20', r:'6', D:'30', depth:'5', ap:'', allow:'0.2'});
  if (type === 'boss') Object.assign(op, {shape:'rect', d:'12', z:'', cx:String(X / 2), cy:String(Y / 2), w:String(X), h:String(Y), r:'0', D:'40', depth:'5', stock:'2', ap:'', allow:'0.2'});
  if (type === 'holes') Object.assign(op, {kind:'drill', d:'8.5', thread:'M10', depth:'15', tip:true, through:false, q:'', dwell:'', pat:'list', pts:'10 10\n' + (X - 10) + ' 10', x:'10', y:'10', n:'4', dx:'20', dy:'20', pcd:'40', a0:'0', nx:'3', ny:'2', cx:String(X / 2), cy:String(Y / 2)});
  if (o) Object.assign(op, o);
  autoCut(op);
  return op;
}

/* ----- Opis operacji (nagłówek karty) ----- */
function fmtV(v){ var x = parseNum(v); return isFinite(x) ? String(r3(x)).replace('.', ',') : '?'; }
function opTitle(op){
  if (op.type === 'face') return 'Planowanie ' + fmtV(op.x1) + '×' + fmtV(op.y1);
  if (op.type === 'pocket' || op.type === 'boss'){
    var sh = op.shape === 'circle' ? 'Ø' + fmtV(op.D) : fmtV(op.w) + '×' + fmtV(op.h);
    return (op.type === 'pocket' ? 'Kieszeń ' : 'Kontur zewn. ') + sh + ', gł. ' + fmtV(op.depth);
  }
  var n = holePattern(holePat(op)).length;
  return (HOLE_NAMES[op.kind] || 'Otwory') + (op.kind === 'tap' ? ' ' + (op.thread || '') : ' Ø' + fmtV(op.d)) + ' · ' + n + ' ' + (n === 1 ? 'otwór' : n > 1 && n < 5 ? 'otwory' : 'otworów');
}
function opTool(op){ return 'T' + (op.T || '?') + ' · Ø' + fmtV(op.d) + ' · S' + (op.S || '?') + ' F' + (op.F || '?'); }
function holePat(op){
  if (op.pat === 'row') return {kind:'row', x:parseNum(op.x), y:parseNum(op.y), n:parseNum(op.n), dx:parseNum(op.dx), dy:parseNum(op.dy)};
  if (op.pat === 'circle') return {kind:'circle', x:parseNum(op.cx), y:parseNum(op.cy), pcd:parseNum(op.pcd), n:parseNum(op.n), a0:parseNum(op.a0)};
  if (op.pat === 'grid') return {kind:'grid', x:parseNum(op.x), y:parseNum(op.y), nx:parseNum(op.nx), ny:parseNum(op.ny), dx:parseNum(op.dx), dy:parseNum(op.dy)};
  return {kind:'list', text:op.pts};
}
/* Głębokość wiercenia z dodatkiem na stożek (118° → 0,3 × Ø) i na przejście 1 mm dla przelotowych */
function holeDepth(op){
  var dep = parseNum(op.depth), d = parseNum(op.d);
  if (!isFinite(dep)) return NaN;
  if (op.through && op.kind !== 'spot') dep += 1;
  if (op.tip && (op.kind === 'drill' || op.kind === 'peck') && d > 0) dep += 0.3 * d;
  return r3(dep);
}
function toSpec(){
  return {ctl:ctl(), name:GEN.name || 'DETAL', num:GEN.num, mat:GEN.mat, datum:GEN.datum, safe:parseNum(GEN.safe), rdist:parseNum(GEN.rdist), cool:GEN.cool, maxS:maxS(),
    ops:GEN.ops.map(function(op){
      var o = {type:op.type, T:parseNum(op.T), d:parseNum(op.d), S:parseNum(op.S), F:parseNum(op.F), ap:parseNum(op.ap), allow:parseNum(op.allow), step:parseNum(op.step), tname:''};
      if (op.type === 'face') Object.assign(o, {x0:parseNum(op.x0), y0:parseNum(op.y0), x1:parseNum(op.x1), y1:parseNum(op.y1), top:parseNum(op.top) || 0, z:parseNum(op.zf) || 0});
      if (op.type === 'pocket' || op.type === 'boss') Object.assign(o, {shape:op.shape, cx:parseNum(op.cx), cy:parseNum(op.cy), w:parseNum(op.w), h:parseNum(op.h), r:parseNum(op.r) || 0, D:parseNum(op.D), depth:-parseNum(op.depth), stock:parseNum(op.stock)});
      if (op.type === 'holes'){
        var ti = op.kind === 'tap' ? tapInfo(op.thread) : null;
        Object.assign(o, {kind:op.kind, depth:-holeDepth(op), q:parseNum(op.q), dwell:parseNum(op.dwell), pitch:ti ? ti.pitch : NaN, thread:ti ? ti.name : '', pattern:holePat(op)});
      }
      return o;
    })};
}

/* ----- Formularz ----- */
function gf(i, k, label, hint, cls){
  var op = GEN.ops[i], v = op[k] == null ? '' : op[k];
  return '<div class="field' + (cls ? ' ' + cls : '') + '"><label class="lab" for="op' + i + '-' + k + '">' + label + '</label><div class="num"><input id="op' + i + '-' + k + '" data-i="' + i + '" data-k="' + k + '" inputmode="decimal" autocomplete="off" value="' + esc(v) + '">' +
    (/^(cx|cy|x0|y0|x1|y1|x|y|dx|dy|zf|top|a0)$/.test(k) ? '<button type="button" class="pm" data-for="op' + i + '-' + k + '" aria-label="Zmień znak">±</button>' : '') + '</div>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
}
function gt(i, k, label, hint, ph, cls){
  var op = GEN.ops[i];
  return '<div class="field' + (cls ? ' ' + cls : '') + '"><label class="lab" for="op' + i + '-' + k + '">' + label + '</label><div class="num"><input id="op' + i + '-' + k + '" class="txt" data-i="' + i + '" data-k="' + k + '" autocomplete="off" autocapitalize="characters" value="' + esc(op[k] || '') + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></div><span class="hint" data-hint="' + i + '-' + k + '">' + (hint || '') + '</span></div>';
}
function threadHint(op){ var ti = tapInfo(op.thread); return ti ? 'skok ' + String(ti.pitch).replace('.', ',') + ' · wiertło Ø' + String(ti.drill).replace('.', ',') : 'np. M8 albo M8x1'; }
function zdnoText(op){ var dd = holeDepth(op); return op.kind !== 'tap' && isFinite(dd) ? 'Z dna w programie: <b class="mono">' + String(-dd).replace('.', ',') + '</b>' : ''; }
function gseg(i, k, items){
  return '<div class="seg wrap" data-i="' + i + '" data-seg="' + k + '">' + items.map(function(it){ return '<button type="button" data-v="' + it[0] + '" aria-pressed="' + (String(GEN.ops[i][k]) === it[0]) + '">' + it[1] + '</button>'; }).join('') + '</div>';
}
function gchk(i, k, label, small){
  return '<label class="switch"><span>' + label + (small ? '<small>' + small + '</small>' : '') + '</span><input type="checkbox" data-i="' + i + '" data-k="' + k + '"' + (GEN.ops[i][k] ? ' checked' : '') + '></label>';
}
function opForm(i){
  var op = GEN.ops[i], h = '', F = ctl() === 'fanuc';
  if (op.type === 'face'){
    h += '<span class="glab">Obszar (zwykle cały detal)</span><div class="fields">' + gf(i, 'x0', 'X od') + gf(i, 'x1', 'X do') + gf(i, 'y0', 'Y od') + gf(i, 'y1', 'Y do') + '</div>';
    h += '<div class="fields">' + gf(i, 'top', 'Góra materiału Z', 'ile naddatku nad Z0, np. 1') + gf(i, 'zf', 'Z końcowe', 'zwykle 0') + gf(i, 'ap', 'Głębokość na przejście', 'mm') + '</div>';
  }
  if (op.type === 'pocket' || op.type === 'boss'){
    h += gseg(i, 'shape', [['rect', 'Prostokąt'], ['circle', 'Okrąg']]);
    h += '<div class="fields">' + gf(i, 'cx', 'Środek X') + gf(i, 'cy', 'Środek Y') + (op.shape === 'circle' ? gf(i, 'D', 'Średnica') : gf(i, 'w', 'Wymiar X') + gf(i, 'h', 'Wymiar Y') + gf(i, 'r', 'Promień naroża R', op.type === 'pocket' ? '0 = zostanie promień freza' : '0 = ostre naroże')) +
      gf(i, 'depth', 'Głębokość', 'mm od góry detalu') + (op.type === 'boss' ? gf(i, 'stock', 'Materiał do zebrania z boku', 'mm na stronę') : '') + '</div>';
  }
  if (op.type === 'holes'){
    h += gseg(i, 'kind', [['spot', 'Nawierc.'], ['drill', 'Wierć'], ['peck', 'Głębokie'], ['tap', 'Gwint'], ['ream', 'Rozwierć']]);
    var ti = op.kind === 'tap' ? tapInfo(op.thread) : null;
    h += '<div class="fields">' + (op.kind === 'tap' ? gt(i, 'thread', 'Gwint', threadHint(op), 'M8') : '') +
      gf(i, 'depth', op.kind === 'tap' ? 'Długość gwintu' : op.kind === 'spot' ? 'Głębokość nawiercenia' : 'Głębokość otworu', 'mm od góry') +
      (op.kind === 'peck' ? gf(i, 'q', 'Krok wiercenia Q', 'puste = 1 × Ø') : '') + '</div>';
    if (op.kind === 'drill' || op.kind === 'peck') h += gchk(i, 'tip', 'Głębokość na pełnej średnicy', 'dodam stożek wiertła 0,3 × Ø');
    if (op.kind !== 'spot') h += gchk(i, 'through', 'Przelotowy', 'dodam 1 mm na przejście');
    h += '<p class="fine" data-zdno="' + i + '">' + zdnoText(op) + '</p>';
    h += '<span class="glab">Pozycje otworów</span>' + gseg(i, 'pat', [['list', 'Lista'], ['row', 'Rząd'], ['circle', 'Na okręgu'], ['grid', 'Siatka']]);
    if (op.pat === 'list') h += '<div class="field"><label class="lab" for="op' + i + '-pts">X Y — jeden otwór w linii</label><textarea id="op' + i + '-pts" class="aiq mono" rows="4" data-i="' + i + '" data-k="pts" spellcheck="false">' + esc(op.pts || '') + '</textarea></div>';
    if (op.pat === 'row') h += '<div class="fields">' + gf(i, 'x', 'Pierwszy X') + gf(i, 'y', 'Pierwszy Y') + gf(i, 'n', 'Ile otworów') + gf(i, 'dx', 'Odstęp X') + gf(i, 'dy', 'Odstęp Y') + '</div>';
    if (op.pat === 'circle') h += '<div class="fields">' + gf(i, 'cx', 'Środek X') + gf(i, 'cy', 'Środek Y') + gf(i, 'pcd', 'Średnica podziałowa') + gf(i, 'n', 'Ile otworów') + gf(i, 'a0', 'Kąt pierwszego', 'stopnie, 0 = w prawo') + '</div>';
    if (op.pat === 'grid') h += '<div class="fields">' + gf(i, 'x', 'Pierwszy X') + gf(i, 'y', 'Pierwszy Y') + gf(i, 'nx', 'Kolumn') + gf(i, 'ny', 'Wierszy') + gf(i, 'dx', 'Odstęp X') + gf(i, 'dy', 'Odstęp Y') + '</div>';
  }
  h += '<span class="glab">Narzędzie</span><div class="fields">' + gf(i, 'T', 'Numer T', F ? 'korekcje H i D = T' : 'ostrze D1') + gf(i, 'd', op.type === 'holes' ? (op.kind === 'tap' ? 'Gwintownik Ø' : 'Średnica wiertła') : 'Średnica freza') +
    (op.type !== 'holes' ? gf(i, 'z', 'Liczba ostrzy', 'puste = typowa') : '') + gf(i, 'S', 'Obroty S') + gf(i, 'F', op.type === 'holes' && op.kind === 'tap' ? 'Posuw F (= S × skok)' : 'Posuw F', 'mm/min') + '</div>';
  h += '<p class="fine" data-cutnote="' + i + '">' + cutNote(op) + '</p>';
  if (op.type !== 'holes') h += '<details class="more"><summary>Więcej: krok, naddatek</summary><div class="fields" style="padding-top:8px">' +
    (op.type !== 'face' ? gf(i, 'ap', 'Głębokość na przejście', 'puste = 0,5 × Ø') + gf(i, 'allow', 'Naddatek na wykończenie', 'mm, ściana z G41') : '') + gf(i, 'step', 'Krok boczny', 'puste = ' + (op.type === 'face' ? '70' : '50') + '% Ø') + '</div></details>';
  h += '<div class="opbtns"><button type="button" class="btn" data-opmv="-1" data-i="' + i + '" aria-label="W górę">↑</button><button type="button" class="btn" data-opmv="1" data-i="' + i + '" aria-label="W dół">↓</button>' +
    '<button type="button" class="btn" data-opdup="' + i + '">Duplikuj</button><button type="button" class="btn danger" data-opdel="' + i + '">Usuń</button></div>';
  return h;
}
function cutNote(op){
  if (op.auto === false) return 'S i F wpisane ręcznie. <button type="button" class="tlink" data-opauto="' + GEN.ops.indexOf(op) + '">Policz z materiału</button>';
  return 'S i F policzone dla: ' + esc(MATERIALS[GEN.mat] ? MATERIALS[GEN.mat].name : '') + ' (wartości startowe — sprawdź katalog narzędzia).';
}
function renderHead(){
  var F = ctl() === 'fanuc', mats = Object.keys(MATERIALS);
  $('#n-head').innerHTML =
    '<div class="field full"><label class="lab" for="n-name">Nazwa / numer rysunku</label><div class="num"><input id="n-name" class="txt" data-g="name" autocomplete="off" value="' + esc(GEN.name) + '" placeholder="np. PLYTA-12"></div></div>' +
    (F ? '<div class="field"><label class="lab" for="n-num">Numer programu O</label><div class="num"><input id="n-num" data-g="num" inputmode="numeric" autocomplete="off" value="' + esc(GEN.num) + '"></div></div>' : '') +
    '<div class="field' + (F ? '' : ' full') + '"><label class="lab" for="n-mat">Materiał</label><select id="n-mat" class="sel" data-g="mat">' + mats.map(function(m){ return '<option value="' + m + '"' + (GEN.mat === m ? ' selected' : '') + '>' + esc(MATERIALS[m].name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field full"><label class="lab" for="n-datum">Baza G54 (gdzie X0 Y0 Z0)</label><div class="num"><input id="n-datum" class="txt" data-g="datum" autocomplete="off" value="' + esc(GEN.datum) + '"></div></div>' +
    '<div class="field"><label class="lab" for="n-safe">Wysokość bezpieczna Z</label><div class="num"><input id="n-safe" data-g="safe" inputmode="decimal" autocomplete="off" value="' + esc(GEN.safe) + '"></div><span class="hint">nad imadłem i łapami</span></div>' +
    '<div class="field"><label class="lab" for="n-rd">Odstęp nad materiałem</label><div class="num"><input id="n-rd" data-g="rdist" inputmode="decimal" autocomplete="off" value="' + esc(GEN.rdist) + '"></div><span class="hint">płaszczyzna R, mm</span></div>' +
    '<label class="switch full"><span>Chłodziwo ' + (F ? 'M08' : 'M8') + '</span><input type="checkbox" data-g="cool"' + (GEN.cool ? ' checked' : '') + '></label>';
}
function renderOps(){
  $('#n-opcount').textContent = GEN.ops.length ? GEN.ops.length + ' ' + (GEN.ops.length === 1 ? 'operacja' : GEN.ops.length < 5 ? 'operacje' : 'operacji') : '';
  if (!GEN.ops.length){ $('#n-ops').innerHTML = '<p class="tip">Dodaj operacje przyciskami niżej albo odczytaj rysunek przez AI.</p>'; return; }
  $('#n-ops').innerHTML = GEN.ops.map(function(op, i){
    var open = genOpen === i;
    return '<div class="opcard' + (open ? ' open' : '') + '" data-card="' + i + '"><button type="button" class="ophead" data-optog="' + i + '" aria-expanded="' + open + '"><span class="opno">' + (i + 1) + '</span><span class="tt"><b data-optitle="' + i + '">' + esc(opTitle(op)) + '</b><small data-optool="' + i + '">' + esc(opTool(op)) + '</small></span><span class="chev" aria-hidden="true">' + (open ? '⌃' : '⌄') + '</span></button>' +
      (open ? '<div class="opbody">' + opForm(i) + '</div>' : '') + '</div>';
  }).join('');
}
function refreshCard(i){
  var op = GEN.ops[i]; if (!op) return;
  var t = $('[data-optitle="' + i + '"]'), tl = $('[data-optool="' + i + '"]'), cn = $('[data-cutnote="' + i + '"]');
  if (t) t.textContent = opTitle(op); if (tl) tl.textContent = opTool(op); if (cn) cn.innerHTML = cutNote(op);
}
var genTimer = null, genView = null, genLast = null;
function genSoon(){ clearTimeout(genTimer); genTimer = setTimeout(renderGen, 250); }
function renderGen(){
  genSave();
  var out = $('#n-out');
  if (!GEN.ops.length){ out.innerHTML = '<p class="fine">Program pojawi się tutaj po dodaniu operacji.</p>'; $('#n-meta').textContent = ''; genLast = null; return; }
  var r = genProgram(toSpec()); genLast = r;
  var lines = r.text.split('\n').length;
  $('#n-meta').textContent = r.errors.length ? '' : lines + ' ' + plLines(lines);
  var h = '';
  if (r.errors.length) h += '<ul class="notes">' + r.errors.map(function(e){ return '<li class="bad"><b>' + (e.op ? 'Operacja ' + e.op + ': ' : '') + '</b>' + esc(e.t) + '</li>'; }).join('') + '</ul>';
  if (!r.errors.length){
    h += '<div class="simcard" id="n-sim"></div>';
    h += '<div class="tooltab"><span class="lab">Narzędzia do przygotowania</span><ul>' + uniqTools(r.tools).map(function(t){ return '<li><b class="mono">T' + t.T + '</b><span>' + esc(t.desc) + '</span><small>op. ' + t.ops.join(', ') + '</small></li>'; }).join('') + '</ul></div>';
    h += '<ul class="notes">' + r.warns.map(function(w){ return '<li class="warn">' + esc(w.t) + '</li>'; }).join('') +
      '<li class="warn">Program z formularza — sprawdź każdą linię, symulację na sterowaniu i <button type="button" class="tlink" data-term="sucho">przejazd na sucho</button> z korekcją posuwu. Podgląd pokazuje tor zaprogramowany (bez korekcji promienia).</li></ul>';
    h += '<label class="sr" for="n-code">Kod programu</label><textarea id="n-code" class="prog" readonly spellcheck="false" wrap="off"></textarea>';
    h += '<div class="row"><button type="button" class="btn primary" id="n-copy">Kopiuj program</button>' + (IS_PWA ? '<button type="button" class="btn" id="n-dl">Zapisz plik</button>' : '') + (canShare() ? '<button type="button" class="btn" id="n-share">Udostępnij</button>' : '') + '</div>';
    h += '<div class="row"><button type="button" class="btn" id="n-edit">Otwórz w „Popraw program”</button><button type="button" class="btn" id="n-check">Sprawdź z AI</button></div>';
  }
  out.innerHTML = h;
  if (r.errors.length) return;
  $('#n-code').value = r.text;
  genView = new SimView($('#n-sim'), {title:'Podgląd ruchów'});
  var face = GEN.ops.filter(function(o){ return o.type === 'face'; })[0], sx = parseNum(GEN.sx), sy = parseNum(GEN.sy), sz = parseNum(GEN.sz), stk = {};
  if (face){ stk.top = parseNum(face.top) || 0; stk.x0 = Math.min(parseNum(face.x0), parseNum(face.x1)); stk.x1 = Math.max(parseNum(face.x0), parseNum(face.x1)); stk.y0 = Math.min(parseNum(face.y0), parseNum(face.y1)); stk.y1 = Math.max(parseNum(face.y0), parseNum(face.y1)); }
  else if (sx > 0 && sy > 0){ stk.x0 = 0; stk.y0 = 0; stk.x1 = sx; stk.y1 = sy; }
  if (sz > 0) stk.bot = -sz;
  genView.set(r.text, ctl(), null, {stock:stk});
}
function toolName(op){
  var d = fmtV(op.d);
  if (op.type === 'face') return 'Głowica Ø' + d;
  if (op.type !== 'holes') return 'Frez Ø' + d;
  if (op.kind === 'tap'){ var ti = tapInfo(op.thread); return 'Gwintownik ' + (ti ? ti.name : 'Ø' + d); }
  return (op.kind === 'spot' ? 'Nawiertak' : op.kind === 'ream' ? 'Rozwiertak' : 'Wiertło') + ' Ø' + d;
}
function uniqTools(list){
  var m = {}, out = [];
  list.forEach(function(t){ var k = t.T; if (!m[k]){ m[k] = {T:t.T, desc:GEN.ops[t.op - 1] ? toolName(GEN.ops[t.op - 1]) : t.desc, ops:[]}; out.push(m[k]); } m[k].ops.push(t.op); });
  return out.sort(function(a, b){ return a.T - b.T; });
}
function genFileName(){ var base = (asciiUp(GEN.name) || 'PROGRAM').replace(/[^A-Z0-9_-]+/g, '_'); return ctl() === 'fanuc' ? 'O' + (String(GEN.num).replace(/\D/g, '') || '1000') + '.nc' : base + '.MPF'; }
$('#n-out').addEventListener('click', function(e){
  if (!genLast) return;
  var id = e.target.closest('button') && e.target.closest('button').id;
  if (id === 'n-copy') copyText(genLast.text);
  if (id === 'n-dl') downloadText(genLast.text, genFileName());
  if (id === 'n-share') shareText(genFileName(), genLast.text);
  if (id === 'n-edit') insertCode(genLast.text);
  if (id === 'n-check'){ S.gEdited = true; S.gFileName = ''; $('#g-prog').value = genLast.text; setRange(0, 0); onProgChange(true); goAI('check'); }
});

/* ----- Zdarzenia formularza ----- */
$('#n-head').addEventListener('input', function(e){
  var k = e.target.getAttribute('data-g'); if (!k) return;
  GEN[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (k === 'mat'){ GEN.ops.forEach(function(op, i){ autoCut(op); }); renderOps(); }
  genSoon();
});
$('#n-head').addEventListener('change', function(e){ if (e.target.getAttribute('data-g') === 'mat' || e.target.type === 'checkbox'){ var k = e.target.getAttribute('data-g'); GEN[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; if (k === 'mat'){ GEN.ops.forEach(autoCut); renderOps(); } genSoon(); } });
$('#n-ops').addEventListener('input', function(e){
  var el = e.target, i = +el.getAttribute('data-i'), k = el.getAttribute('data-k'), op = GEN.ops[i];
  if (!op || !k) return;
  op[k] = el.type === 'checkbox' ? el.checked : el.value;
  if (k === 'S' || k === 'F') op.auto = false;
  if (k === 'd' || k === 'z' || k === 'thread'){
    if (k === 'thread' && op.kind === 'tap'){ var ti = tapInfo(op.thread); if (ti){ op.d = String(ti.d); var dEl = $('#op' + i + '-d'); if (dEl) dEl.value = op.d; } }
    autoCut(op); ['S', 'F'].forEach(function(f){ var x = $('#op' + i + '-' + f); if (x) x.value = op[f]; });
  }
  if (op.type === 'holes'){
    var zd = $('[data-zdno="' + i + '"]'); if (zd) zd.innerHTML = zdnoText(op);
    var th = $('[data-hint="' + i + '-thread"]'); if (th) th.textContent = threadHint(op);
  }
  refreshCard(i); genSoon();
});
$('#n-ops').addEventListener('click', function(e){
  var b;
  if ((b = e.target.closest('[data-optog]'))){ var i = +b.getAttribute('data-optog'); genOpen = genOpen === i ? -1 : i; store.set('genOpen', genOpen); renderOps(); var c = $('[data-card="' + i + '"]'); if (c && genOpen === i) c.scrollIntoView({behavior:'smooth', block:'start'}); return; }
  if ((b = e.target.closest('.seg[data-seg] [data-v]'))){
    var s = b.parentNode, j = +s.getAttribute('data-i'), k = s.getAttribute('data-seg'), op = GEN.ops[j];
    op[k] = b.getAttribute('data-v');
    if (k === 'kind'){
      var ti = tapInfo(op.thread);
      if (op.kind === 'tap' && ti) op.d = String(ti.d);
      if (op.kind === 'spot'){ op.d = '10'; op.depth = '1.5'; }
      if (op.kind === 'tap' && !op.depth) op.depth = '15';
      autoCut(op);
    }
    b.closest('.opbody').innerHTML = opForm(j); refreshCard(j); genSoon(); return;
  }
  if ((b = e.target.closest('[data-opauto]'))){ var a = +b.getAttribute('data-opauto'); GEN.ops[a].auto = true; autoCut(GEN.ops[a]); renderOps(); genSoon(); return; }
  if ((b = e.target.closest('[data-opdel]'))){
    var d = +b.getAttribute('data-opdel'), removed = GEN.ops.splice(d, 1)[0]; genOpen = -1; renderOps(); genSoon();
    toastUndo('Usunięto operację', function(){ GEN.ops.splice(d, 0, removed); genOpen = d; renderOps(); genSoon(); });
    return;
  }
  if ((b = e.target.closest('[data-opdup]'))){ var u = +b.getAttribute('data-opdup'), cp = JSON.parse(JSON.stringify(GEN.ops[u])); GEN.ops.splice(u + 1, 0, cp); genOpen = u + 1; renderOps(); genSoon(); return; }
  if ((b = e.target.closest('[data-opmv]'))){
    var m = +b.getAttribute('data-i'), t = m + +b.getAttribute('data-opmv');
    if (t < 0 || t >= GEN.ops.length) return;
    var x = GEN.ops[m]; GEN.ops[m] = GEN.ops[t]; GEN.ops[t] = x; genOpen = t; renderOps(); genSoon();
  }
});
$('#n-add').addEventListener('click', function(e){
  var b = e.target.closest('[data-add]'); if (!b) return;
  GEN.ops.push(newOp(b.getAttribute('data-add'))); genOpen = GEN.ops.length - 1; store.set('genOpen', genOpen);
  renderOps(); genSoon();
  setTimeout(function(){ var c = $('[data-card="' + genOpen + '"]'); if (c) c.scrollIntoView({behavior:'smooth', block:'start'}); }, 50);
});
function toastUndo(msg, fn){
  toast(msg);
  var t = $('#toast'); if (!t) return;
  var b = document.createElement('button'); b.type = 'button'; b.className = 'tundo'; b.textContent = 'Cofnij';
  b.onclick = function(){ fn(); b.remove(); };
  t.appendChild(b);
  clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove('on'); }, 4500);
}

/* ----- Rysunek → AI → operacje ----- */
function genPrompt(){
  var hint = $('#n-hint').value.trim();
  return 'Na załączonym rysunku technicznym jest detal do frezowania na pionowym centrum CNC ' + MACHINES[S.machine].name + ' (obróbka 2.5D od góry). Odczytaj wymiary i zwróć WYŁĄCZNIE jeden blok ```json w tym formacie:\n' +
    '{"name":"numer rysunku albo nazwa","material":"stal|nierdz|alu|zeliwo|tworzywo|nieznany","stock":{"x":100,"y":60,"z":20},"datum":"gdzie jest X0 Y0 Z0",\n' +
    '"features":[\n' +
    ' {"type":"face","x0":0,"y0":0,"x1":100,"y1":60},\n' +
    ' {"type":"boss","shape":"rect","cx":50,"cy":30,"w":80,"h":40,"r":5,"depth":10},\n' +
    ' {"type":"pocket","shape":"rect","cx":50,"cy":30,"w":40,"h":20,"r":5,"depth":8},\n' +
    ' {"type":"pocket","shape":"circle","cx":20,"cy":30,"d":30,"depth":5},\n' +
    ' {"type":"hole","kind":"drill","d":8.5,"thread":"","depth":20,"through":false,"tol":"","pts":[[10,10],[90,10]]}\n' +
    '],\n"unsure":["co jest nieczytelne albo niepewne"],"notes":["tolerancje, chropowatość, fazki, operacje z innych stron"]}\n' +
    'Zasady:\n' +
    '- Wszystko w mm. Widok z góry: X w prawo, Y w górę. Z0 = górna powierzchnia detalu, "depth" = głębokość dodatnia od tej powierzchni.\n' +
    '- X0 Y0: lewy dolny róg detalu na widoku z góry, chyba że rysunek wymiaruje od innej bazy (np. od środka otworu) — wtedy użyj tej bazy i opisz ją w "datum".\n' +
    '- Środki licz z wymiarów rysunku (łańcuchy wymiarowe sumuj). Dla otworów na okręgu podziałowym podaj wszystkie punkty.\n' +
    '- "hole": kind "tap" dla gwintów (thread np. "M8" albo "M8x1", depth = długość gwintu), "ream" dla otworów z tolerancją typu H7, inaczej "drill". "through": true dla przelotowych (depth = grubość w tym miejscu).\n' +
    '- "boss" tylko gdy trzeba frezować zewnętrzny kontur (czop, wysepka, obrys detalu). "face" gdy górę trzeba splanować.\n' +
    '- Pomiń to, czego nie da się zrobić od góry (otwory z boku, podcięcia) i wpisz w "notes".\n' +
    '- Nie zgaduj. Wymiaru, którego nie da się odczytać, nie dodawaj — wpisz go w "unsure".' +
    (hint ? '\nUwagi operatora: ' + hint : '');
}
function genFeatures(text){
  text = String(text || '');
  var cands = [], m, re = /```(?:json)?\s*([\s\S]*?)```/gi;
  while ((m = re.exec(text))) cands.push(m[1]);
  var a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) cands.push(text.slice(a, b + 1));
  for (var i = 0; i < cands.length; i++){
    try { var j = JSON.parse(cands[i]); if (j && Array.isArray(j.features)) return j; } catch(_){}
  }
  return null;
}
function num(v, def){ var x = parseNum(v); return isFinite(x) ? x : def; }
/* Zamiana elementów z rysunku na operacje: planowanie → kontur → kieszenie → nawiercanie → wiercenie → rozwiercanie → gwinty */
function featuresToOps(fe){
  var ops = [], tools = {}, tn = 0, st = fe.stock || {};
  var X = num(st.x, 100), Y = num(st.y, 60), Z = num(st.z, NaN);
  function T(key){ if (!tools[key]) tools[key] = ++tn; return String(tools[key]); }
  function add(stage, op){ op._stage = stage; ops.push(op); }
  function mk(type, o){ var op = newOp(type, o); return op; }
  (fe.features || []).forEach(function(f){
    var t = String(f.type || '').toLowerCase();
    if (t === 'face'){
      add(0, mk('face', {x0:String(num(f.x0, 0)), y0:String(num(f.y0, 0)), x1:String(num(f.x1, X)), y1:String(num(f.y1, Y)), T:T('face50')}));
    } else if (t === 'pocket' || t === 'boss'){
      var circ = f.shape === 'circle', w = num(f.w, 0), h = num(f.h, 0), D = num(f.d, num(f.D, 0)), r = Math.max(0, num(f.r, 0));
      var d = t === 'pocket' ? (circ ? pickMill(D * 0.6) : pickMill(Math.min(w, h) * 0.6, r)) : 12;
      add(t === 'boss' ? 1 : 2, mk(t, {shape:circ ? 'circle' : 'rect', cx:String(num(f.cx, 0)), cy:String(num(f.cy, 0)), w:String(w), h:String(h), r:String(r), D:String(D), depth:String(num(f.depth, 5)), d:String(d), T:T('mill' + d)}));
    } else if (t === 'hole' || t === 'holes'){
      var pts = (f.pts || []).filter(function(p){ return p && isFinite(+p[0]) && isFinite(+p[1]); }).map(function(p){ return r3(+p[0]) + ' ' + r3(+p[1]); }).join('\n');
      if (!pts) return;
      var kind = String(f.kind || 'drill'), dia = num(f.d, NaN), dep = num(f.depth, 10), thr = !!f.through;
      if (thr && isFinite(Z)) dep = Z;
      var base = {pat:'list', pts:pts, through:thr};
      if (kind === 'tap'){
        var ti = tapInfo(f.thread || ('M' + dia));
        if (!ti) return;
        add(3, mk('holes', Object.assign({}, base, {kind:'spot', d:'10', depth:String(r3(Math.min(ti.drill / 2 + 0.5, 4.5))), through:false, T:T('spot')})));
        add(4, mk('holes', Object.assign({}, base, {kind:dep > ti.drill * 3 ? 'peck' : 'drill', d:String(ti.drill), depth:String(thr ? dep : r3(dep + 3 * ti.pitch)), tip:true, T:T('drill' + ti.drill)})));
        add(6, mk('holes', Object.assign({}, base, {kind:'tap', thread:ti.name, d:String(ti.d), depth:String(dep), T:T('tap' + ti.name)})));
      } else if (isFinite(dia) && dia > 20){
        add(2, mk('pocket', {shape:'circle', cx:pts.split('\n')[0].split(' ')[0], cy:pts.split('\n')[0].split(' ')[1], D:String(dia), depth:String(dep), d:String(pickMill(dia * 0.6)), T:T('mill' + pickMill(dia * 0.6))}));
      } else if (isFinite(dia)){
        var ream = kind === 'ream', dd = ream ? r3(dia - (dia <= 10 ? 0.2 : 0.3)) : dia;
        add(3, mk('holes', Object.assign({}, base, {kind:'spot', d:'10', depth:String(r3(Math.min(dd / 2 + 0.3, 4.5))), through:false, T:T('spot')})));
        add(4, mk('holes', Object.assign({}, base, {kind:dep > dd * 3 ? 'peck' : 'drill', d:String(dd), depth:String(dep), tip:true, T:T('drill' + dd)})));
        if (ream) add(5, mk('holes', Object.assign({}, base, {kind:'ream', d:String(dia), depth:String(dep), T:T('ream' + dia)})));
      }
    }
  });
  ops.sort(function(a, b){ return a._stage - b._stage; });
  ops.forEach(function(op){ delete op._stage; autoCut(op); });
  // ten sam nawiertak dla wszystkich otworów: połącz pozycje
  var spot = null;
  ops = ops.filter(function(op){
    if (op.type === 'holes' && op.kind === 'spot'){ if (!spot){ spot = op; return true; } spot.pts += '\n' + op.pts; spot.depth = String(Math.max(parseNum(spot.depth), parseNum(op.depth))); return false; }
    return true;
  });
  // numery T po kolei, w kolejności użycia
  var map = {}, k = 0;
  ops.forEach(function(op){ if (!map[op.T]) map[op.T] = String(++k); op.T = map[op.T]; });
  return ops;
}
function genImport(fe){
  var ops = featuresToOps(fe);
  GEN_UNDO = JSON.parse(JSON.stringify(GEN));
  if (fe.name) GEN.name = String(fe.name).slice(0, 40);
  if (fe.material && MATERIALS[fe.material]) GEN.mat = fe.material;
  if (fe.datum) GEN.datum = String(fe.datum).slice(0, 80);
  if (fe.stock){ GEN.sx = String(num(fe.stock.x, '')); GEN.sy = String(num(fe.stock.y, '')); GEN.sz = String(num(fe.stock.z, '')); }
  GEN.ops = ops; genOpen = -1;
  ops.forEach(autoCut);
  showTab('nowy'); window.scrollTo(0, 0);
  renderHead(); renderOps(); renderGen();
  var un = (fe.unsure || []).filter(Boolean), no = (fe.notes || []).filter(Boolean);
  $('#n-aiout').innerHTML = '<div class="result aires"><div class="connrow"><span class="chip ' + (ops.length ? 'ok' : 'warn') + '">' + (ops.length ? 'Odczytano' : 'Brak operacji') + '</span><span>' + ops.length + ' ' + (ops.length === 1 ? 'operacja' : ops.length < 5 ? 'operacje' : 'operacji') + ' z rysunku</span></div>' +
    (un.length ? '<span class="lab">Sprawdź na rysunku</span><ul class="notes">' + un.map(function(u){ return '<li class="warn">' + esc(u) + '</li>'; }).join('') + '</ul>' : '') +
    (no.length ? '<span class="lab">Uwagi AI</span><ul class="notes">' + no.map(function(u){ return '<li>' + esc(u) + '</li>'; }).join('') + '</ul>' : '') +
    '<p class="fine">AI może pomylić wymiar. Porównaj każdą operację z rysunkiem, zanim użyjesz programu.</p>' +
    (GEN_UNDO.ops.length ? '<button type="button" class="tlink" id="n-undo">Przywróć poprzednie operacje</button>' : '') + '</div>';
  toast(ops.length ? 'Operacje z rysunku są w formularzu' : 'AI nie znalazło operacji do wykonania od góry');
}
$('#n-aiout').addEventListener('click', function(e){
  if (e.target.id === 'n-undo' && GEN_UNDO){ GEN = GEN_UNDO; GEN_UNDO = null; renderHead(); renderOps(); renderGen(); $('#n-aiout').innerHTML = ''; toast('Przywrócono'); }
});

function renderGenFiles(){
  $('#n-thumbs').innerHTML = GEN_FILES.map(thumbHtml).join('');
  var mode = AI.mode;
  $('#n-read').lastChild.textContent = mode === 'share' ? 'Wyślij rysunek do aplikacji AI' : 'Odczytaj wymiary z rysunku (' + (mode === 'api' ? apiName() : 'Claude') + ')';
  $('#n-readnote').innerHTML = mode === 'share'
    ? 'Wybierz ChatGPT, Claude albo Gemini. Gdy odpowie, skopiuj odpowiedź i wróć — operacje wczytają się same.' + (IS_PWA ? ' <button type="button" class="tlink" data-apiset>Albo połącz klucz API</button> — wtedy bez przełączania.' : '')
    : 'AI odczyta wymiary, a ja złożę z nich operacje. Kod G pisze generator, nie AI.';
}
function addGenFiles(files){
  var list = Array.prototype.slice.call(files || []).filter(function(f){ return /^image\//.test(f.type) || f.type === 'application/pdf'; });
  list = list.filter(function(f){ if (f.size > 15e6){ toast('Plik większy niż 15 MB — pomijam'); return false; } return true; });
  list.slice(0, 4 - GEN_FILES.length).forEach(function(f){ GEN_FILES.push({file:f, pdf:f.type === 'application/pdf', url:f.type === 'application/pdf' ? '' : URL.createObjectURL(f)}); });
  renderGenFiles();
}
['#n-cam', '#n-file'].forEach(function(id){ $(id).addEventListener('change', function(){ addGenFiles(this.files); this.value = ''; }); });
$('#n-thumbs').addEventListener('click', function(e){
  var b = e.target.closest('[data-rm]'); if (!b) return;
  var i = +b.getAttribute('data-rm'), p = GEN_FILES[i]; if (p && p.url) try { URL.revokeObjectURL(p.url); } catch(_){}
  GEN_FILES.splice(i, 1); renderGenFiles();
});
var genBusy = false;
$('#n-read').addEventListener('click', function(){
  if (genBusy) return;
  if (!GEN_FILES.length){ toast('Najpierw dodaj zdjęcie albo PDF rysunku'); $('#n-file').click(); return; }
  var btn = this, text = genPrompt(), mode = AI.mode;
  if (mode === 'share'){
    var files = GEN_FILES.map(function(p, i){ return new File([p.file], (p.pdf ? 'rysunek-' : 'zdjecie-') + (i + 1) + '.' + (p.pdf ? 'pdf' : 'jpg'), {type:p.file.type}); });
    var full = aiContext() + '\n\n' + text;
    copyQuiet(full);
    store.set('aiWait', {sent:full, at:Date.now(), target:'gen'});
    if (!navigator.share){ toast('Tekst skopiowany. Otwórz aplikację AI, wklej i dodaj rysunek'); return; }
    var data = {text:full};
    if (navigator.canShare && navigator.canShare({files:files})) data.files = files; else toast('Dodaj rysunek ręcznie w aplikacji AI');
    navigator.share(data).then(function(){ toast('Gdy AI odpowie: Kopiuj i wróć tutaj'); }, function(){});
    return;
  }
  var pdfs = GEN_FILES.filter(function(p){ return p.pdf; });
  if (mode === 'acc' && (pdfs.length || !AI.sampleImages)){ toast(pdfs.length ? 'W tym widoku PDF nie przejdzie — zrób zdjęcie rysunku' : 'W tym widoku nie można wysłać zdjęcia'); return; }
  genBusy = true; btn.disabled = true; btn.lastChild.textContent = 'AI czyta rysunek…';
  $('#n-aiout').innerHTML = '<div class="result"><span class="thinking" aria-label="AI czyta rysunek"><i></i><i></i><i></i></span><p class="fine">Zwykle 15–60 sekund.</p></div>';
  var p = mode === 'api'
    ? prepFiles(GEN_FILES.map(function(x){ return x.file; })).then(function(f){ return apiCall({system:aiContext(), turns:[{role:'user', text:text, files:f}], maxTokens:12000}); })
    : AI.sample([{role:'user', content:aiContext() + '\n\n' + text}], {images:GEN_FILES.map(function(x){ return x.file; }), cache:false}).then(function(r){ return r.text; });
  p.then(function(ans){
    var fe = genFeatures(ans);
    if (fe) genImport(fe);
    else $('#n-aiout').innerHTML = '<div class="result"><p class="note-warn">AI nie zwróciło listy wymiarów. Odpowiedź:</p><div class="aians">' + md(ans || '(pusta)').html + '</div></div>';
  }, function(e){
    $('#n-aiout').innerHTML = '<p class="note-warn">' + esc((e && (e.message || SAMPLE_ERR[e.code])) || 'Nie udało się połączyć z AI.') + '</p>';
  }).then(function(){ genBusy = false; btn.disabled = false; renderGenFiles(); });
});

/* ----- Przełącznik Popraw / Nowy ----- */
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-ptab]'); if (!b) return;
  var t = b.getAttribute('data-ptab'); store.set('ptab', t); showTab(t); window.scrollTo(0, 0);
});
var _showTabGen = showTab;
showTab = function(t){
  if (t === 'gcode' || t === 'nowy') store.set('ptab', t);
  _showTabGen(t);
  if (t === 'nowy'){ renderGenFiles(); if (genView) genView.stop && genView.stop(); }
};
var _occGen = onControlChange;
onControlChange = function(){ _occGen(); renderHead(); renderOps(); if (!$('#tab-nowy').hidden) renderGen(); else genSoon(); };

renderHead(); renderOps(); renderGenFiles(); renderGen();
