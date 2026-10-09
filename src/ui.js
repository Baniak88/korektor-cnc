/* ===== Opisy UI ===== */
var CAT_NAMES = {slownik:'Słowniczek', R:'Ruch', U:'Układy', K:'Korekcje', C:'Cykle', P:'Program', '5':'5 osi', M:'Kody M'};

var KIND_UI = {
  outer:  {short:'Czop', help:'Czop, występ lub szerokość mierzona z zewnątrz, frezowana konturem z G41/G42. Za duży → zmniejszasz zużycie promienia.',
           icon:'<path d="M8 13h16v14H8z"/><path d="M8 4v7M24 4v7M8 7.5h16"/><path d="M11 5.5l-3 2 3 2M21 5.5l3 2-3 2"/>'},
  inner:  {short:'Otwór', help:'Otwór lub kieszeń frezowane konturem z G41/G42 (nie wiertło, nie rozwiertak). Za mały → zmniejszasz zużycie promienia.',
           icon:'<circle cx="16" cy="17" r="10"/><path d="M8.5 17h15"/><path d="M11.5 15l-3 2 3 2M20.5 15l3 2-3 2"/>'},
  wall:   {short:'Ścianka', help:'Jedna ścianka mierzona od bazy, np. od krawędzi detalu. Korekta działa tylko z jednej strony, więc cała różnica idzie w zużycie.',
           icon:'<path d="M5 5v23" stroke-dasharray="2 3"/><path d="M18 9h9v16h-9z"/><path d="M5 17h13"/><path d="M15 15l3 2-3 2"/>'},
  depth:  {short:'Głębokość', help:'Głębokość od górnej powierzchni, np. dno kieszeni albo stopień. Za płytko → zmniejszasz zużycie długości.',
           icon:'<path d="M3 9h8v14h10V9h8"/><path d="M16 9v14"/><path d="M14 12l2-3 2 3M14 20l2 3 2-3"/>'},
  height: {short:'Wysokość', help:'Grubość lub wysokość od dołu detalu do frezowanej powierzchni. Za wysoko → zmniejszasz zużycie długości.',
           icon:'<path d="M3 27h26"/><path d="M5 27V11h9v8h13v8"/><path d="M21 27v-8"/><path d="M19 22l2-3 2 3M19 24l2 3 2-3"/>'}
};

var ROT = {A:1, B:1, C:1};
var OP_EXAMPLE = {
  widen: function(a){ return a === 'Z'
    ? 'Przykład: dwie powierzchnie w Z (np. Z0 i Z-10) mają się od siebie oddalić o 0.04 → środek <b>-5</b>, zmiana <b>0.04</b>.'
    : 'Przykład: kieszeń ' + a + ' od −20 do 20 (40 mm) ma mieć 40.04 → środek <b>0</b>, zmiana <b>0.04</b>. ' + a + '20 → ' + a + '20.02, ' + a + '-20 → ' + a + '-20.02.'; },
  shift: function(a){ if (ROT[a]) return 'Przykład: kąt ' + a + ' ma być o 0.5° większy w całym programie → przesunięcie <b>0.5</b>. Wartości w stopniach.'; return a === 'Z'
    ? 'Przykład: wszystko ma być 0.05 mm głębiej → oś Z, przesunięcie <b>-0.05</b>.'
    : 'Przykład: otwór ma być 0.05 mm dalej w plus ' + a + ' → przesunięcie <b>0.05</b>. Każde ' + a + ' w zakresie zmieni się o tyle samo.'; },
  replace: function(a){ if (ROT[a]) return 'Przykład: wychylenie ' + a + '-30. ma być ' + a + '-30.5 → obecna <b>-30</b>, nowa <b>-30.5</b>. Wartości w stopniach.'; return a === 'Z'
    ? 'Przykład: głębokość Z-8 ma być Z-8.05 → obecna <b>-8</b>, nowa <b>-8.05</b>. Inne wartości Z zostają bez zmian.'
    : 'Przykład: wszystkie ' + a + '15 mają być ' + a + '15.1 → obecna <b>15</b>, nowa <b>15.1</b>. Inne wartości zostają bez zmian.'; }
};

/* ===== Pamięć i stan ===== */
var store = {
  get: function(k, d){ try { var v = localStorage.getItem('kcnc:' + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set: function(k, v){ try { localStorage.setItem('kcnc:' + k, JSON.stringify(v)); } catch(e){} }
};
var IS_PWA = !!window.KCNC_PWA;
var S = {
  machine: store.get('machine', 'chiron'),
  ctlMap: store.get('ctlMap', {}),
  kind: store.get('kind', 'inner'),
  wallDir: store.get('wallDir', 1),
  target: 'mid',
  gMode: 'widen', gAxis: 'X',
  alarmCtl: null, cat: 'all',
  log: store.get('log', []),
  confirmClear: false,
  gEdited: false, gFileName: '',
  theme: store.get('theme', 'auto'),
  wake: store.get('wake', false),
  rangePending: false,
  axMap: store.get('axMap', {})
};
if (!MACHINES[S.machine]) S.machine = 'chiron';
if (!KINDS[S.kind]) S.kind = 'inner';
function ctl(){ return S.ctlMap[S.machine] || MACHINES[S.machine].def; }
function multiAx(id){ id = id || S.machine; return id in S.axMap ? !!S.axMap[id] : !!MACHINES[id].fiveAxis; }
function axLabel(id){ id = id || S.machine; return multiAx(id) ? (MACHINES[id].fiveAxis ? '5 osi' : 'osie obrotowe') : ''; }
function sampleProg(){ return ctl() === 'fanuc' && S.machine === 'matsuura' && multiAx() ? SAMPLES.fanuc5 : SAMPLES[ctl()]; }

function $(s){ return document.querySelector(s); }
function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function setPressed(sel, attr, val){ $$(sel + ' button').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(val))); }); }
function setChecked(sel, attr, val){ $$(sel + ' [role=radio]').forEach(function(b){ b.setAttribute('aria-checked', String(b.getAttribute(attr) === String(val))); }); }
function segClick(sel, attr, fn){ $(sel).addEventListener('click', function(e){ var b = e.target.closest('button'); if (b && b.hasAttribute(attr)) fn(b.getAttribute(attr)); }); }

var toastT;
function toast(msg){ var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove('on'); }, 1900); }
window.toast = toast;
function copyText(text, fallbackEl){
  function ok(){ toast('Skopiowano'); }
  function fb(){ if (fallbackEl && fallbackEl.select){ fallbackEl.classList.remove('sr'); fallbackEl.focus(); fallbackEl.select(); toast('Zaznaczono — skopiuj ręcznie'); } else toast('Nie udało się skopiować'); }
  try { navigator.clipboard.writeText(text).then(ok, fb); } catch(e){ fb(); }
}
function canShare(){ return IS_PWA && navigator.share; }
function shareText(title, text){ try { navigator.share({title:title, text:text}).catch(function(){}); } catch(e){} }

/* Przycisk ± — klawiatura liczbowa Androida często nie ma minusa */
document.addEventListener('click', function(e){
  var b = e.target.closest('.pm'); if (!b) return;
  var inp = document.getElementById(b.getAttribute('data-for')); if (!inp) return;
  var v = inp.value.trim();
  if (v.charAt(0) === '-' || v.charAt(0) === '−') v = v.slice(1);
  else if (v.charAt(0) === '+') v = '-' + v.slice(1);
  else v = '-' + v;
  inp.value = v;
  inp.dispatchEvent(new Event('input', {bubbles:true}));
});

/* ===== Motyw, ekran, instalacja ===== */
var hostTheme = document.documentElement.getAttribute('data-theme');
function applyTheme(){
  var r = document.documentElement;
  if (S.theme === 'auto'){ if (hostTheme) r.setAttribute('data-theme', hostTheme); else r.removeAttribute('data-theme'); }
  else r.setAttribute('data-theme', S.theme);
  setPressed('#themeSeg', 'data-th', S.theme);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m){ try { m.setAttribute('content', getComputedStyle(document.body).backgroundColor); } catch(e){} }
}
segClick('#themeSeg', 'data-th', function(v){ S.theme = v; store.set('theme', v); applyTheme(); });
if (window.matchMedia){ try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch(e){} }

var wakeLock = null;
function requestWake(){
  if (!S.wake || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  navigator.wakeLock.request('screen').then(function(l){ wakeLock = l; }, function(){
    if (S.wake){ toast('Tutaj nie da się blokować wygaszania'); S.wake = false; $('#wakeSw').checked = false; store.set('wake', false); }
  });
}
$('#wakeSw').addEventListener('change', function(){
  S.wake = this.checked; store.set('wake', S.wake);
  if (S.wake) requestWake(); else if (wakeLock){ try { wakeLock.release(); } catch(e){} wakeLock = null; }
});
document.addEventListener('visibilitychange', requestWake);

var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferredPrompt = e; $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', function(){
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function(){ deferredPrompt = null; $('#installBtn').hidden = true; });
});

/* ===== Arkusze (maszyna, pomoc, wyjaśnienie) ===== */
var openSheetId = null, sheetReturn = null;
function openSheet(id){
  if (openSheetId) $(openSheetId).hidden = true;
  if (!openSheetId) sheetReturn = document.activeElement;
  openSheetId = id; $('#scrim').hidden = false; $(id).hidden = false;
  var cl = $(id + ' [data-close]'); setTimeout(function(){ cl && cl.focus(); }, 30);
  updateStrip();
}
function closeSheet(){
  if (!openSheetId) return;
  $(openSheetId).hidden = true; $('#scrim').hidden = true; openSheetId = null;
  if (sheetReturn && sheetReturn.focus) try { sheetReturn.focus({preventScroll:true}); } catch(e){}
  updateStrip();
}
$('#mpill').addEventListener('click', function(){ renderSheet(); openSheet('#sheet'); });
$('#helpBtn').addEventListener('click', function(){ openSheet('#help'); });
$('#scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeSheet(); });
document.addEventListener('click', function(e){
  if (e.target.closest('[data-close]')){ closeSheet(); return; }
  var t = e.target.closest('[data-term]');
  if (t){ openTerm(t.getAttribute('data-term')); return; }
  var g = e.target.closest('[data-goto]');
  if (g){ closeSheet(); $('#c-q').value = ''; showTab(g.getAttribute('data-goto')); window.scrollTo(0, 0); }
});
function findTerm(id){ for (var i = 0; i < GLOSSARY.length; i++) if (GLOSSARY[i][0] === id) return GLOSSARY[i]; return null; }
function openTerm(id){
  var g = findTerm(id); if (!g) return;
  $('#infoH').textContent = g[1];
  $('#infoBody').innerHTML = '<p>' + esc(g[2]) + '</p>';
  openSheet('#info');
}

function ctlName(id){ var c = S.ctlMap[id] || MACHINES[id].def; return c === 'fanuc' ? (id === 'matsuura' ? 'G-Tech 31i' : 'Fanuc') : 'Sinumerik'; }
function renderSheet(){
  $('#mlist').innerHTML = Object.keys(MACHINES).map(function(id){
    var m = MACHINES[id];
    return '<button type="button" class="mopt" role="radio" aria-checked="' + (id === S.machine) + '" data-m="' + id + '"><b>' + esc(m.name) + '</b><small>' + esc(m.type) + '</small><span class="ct">' + esc(ctlName(id)) + (multiAx(id) ? '<br>' + axLabel(id) : '') + '</span></button>';
  }).join('');
  setPressed('#ctlSeg', 'data-ctl', ctl());
  var m = MACHINES[S.machine];
  $('#minfo').innerHTML =
    '<dl><dt>Sterowanie</dt><dd>' + esc(m.ctlNote) + '</dd>' +
    m.specs.map(function(s){ return '<dt>' + esc(s[0]) + '</dt><dd class="mono">' + esc(s[1]) + '</dd>'; }).join('') + '</dl>' +
    '<ul>' + m.tips.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
    '<p class="fine">Dane typowej konfiguracji. Twoja maszyna może się różnić — sprawdź tabliczkę i dokumentację.</p>';
  $('#wakeSw').checked = !!S.wake;
  $('#axSw').checked = multiAx();
  $('#axNote').textContent = 'Oś ' + MACHINES[S.machine].rot.join(', ') + ' w zakładce Program, uwagi 5-osiowe przy korekcji i dla AI.';
}
$('#axSw').addEventListener('change', function(){ S.axMap[S.machine] = this.checked; store.set('axMap', S.axMap); onControlChange(); renderSheet(); });
$('#mlist').addEventListener('click', function(e){
  var b = e.target.closest('.mopt'); if (!b) return;
  S.machine = b.getAttribute('data-m'); store.set('machine', S.machine); onControlChange(); renderSheet();
  toast('Maszyna: ' + MACHINES[S.machine].name);
});
segClick('#ctlSeg', 'data-ctl', function(v){ S.ctlMap[S.machine] = v; store.set('ctlMap', S.ctlMap); onControlChange(); renderSheet(); });

function onControlChange(){
  if (typeof renderStart === 'function' && !$('#tab-start').hidden) renderStart();
  $('#mpName').textContent = MACHINES[S.machine].name;
  $('#mpCtl').textContent = ctlName(S.machine) + (multiAx() ? ' · ' + (MACHINES[S.machine].fiveAxis ? '5X' : '4/5X') : '');
  renderAxes();
  renderKorekcja();
  S.alarmCtl = ctl(); $('#a-title').textContent = 'Alarmy ' + (ctl() === 'fanuc' ? 'Fanuc' : 'Sinumerik') + ' · ' + MACHINES[S.machine].name + (MACHINE_ALARMS[S.machine] && MACHINE_ALARMS[S.machine].ctl === ctl() ? ' · z alarmami maszyny' : ''); renderAlarms();
  renderCodes();
  if (!S.gEdited){ $('#g-prog').value = sampleProg(); S.gFileName = ''; }
  $('#g-old').value = ctl() === 'fanuc' ? '-8.' : '-8';
  onProgChange(true);
}

/* ===== Korekcja ===== */
if (!store.get('tipSeen', false)) $('#tipcard').hidden = false;
$('#tipClose').addEventListener('click', function(){ $('#tipcard').hidden = true; store.set('tipSeen', true); });

var FORM_IDS = ['k-nom','k-meas','k-up','k-lo','k-custom','k-tool','k-cur'];
var EXAMPLE = {'k-nom':'20','k-meas':'19.998','k-up':'0.021','k-lo':'0','k-custom':'','k-tool':'','k-cur':'-0.010'};
var saved = store.get('form', null);
var kExample = !saved;
function fillForm(vals){ FORM_IDS.forEach(function(id){ $('#' + id).value = vals[id] != null ? vals[id] : ''; }); }
fillForm(saved || EXAMPLE);
S.target = (saved && saved.target) || 'mid';
$('#k-dia').checked = !!(saved && saved.dia);
function saveForm(){
  var v = {}; FORM_IDS.forEach(function(id){ v[id] = $('#' + id).value; });
  v.target = S.target; v.dia = $('#k-dia').checked; store.set('form', v);
}

function renderKinds(){
  $('#kinds').innerHTML = Object.keys(KINDS).map(function(id){
    return '<button type="button" class="ktile" role="radio" aria-checked="' + (id === S.kind) + '" data-k="' + id + '">' +
      '<svg viewBox="0 0 32 32" aria-hidden="true">' + KIND_UI[id].icon + '</svg><span>' + esc(KIND_UI[id].short) + '</span></button>';
  }).join('');
  $('#kdesc').innerHTML = '<b>' + esc(KINDS[S.kind].label) + '.</b> ' + esc(KIND_UI[S.kind].help);
}
$('#kinds').addEventListener('click', function(e){
  var b = e.target.closest('.ktile'); if (!b) return;
  S.kind = b.getAttribute('data-k'); store.set('kind', S.kind); renderKinds(); renderKorekcja();
});
segClick('#wallSeg', 'data-dir', function(v){ S.wallDir = Number(v); store.set('wallDir', S.wallDir); renderKorekcja(); });
segClick('#tgtSeg', 'data-t', function(v){ S.target = v; kExample = false; saveForm(); renderKorekcja(); if (v === 'custom') setTimeout(function(){ $('#k-custom').focus(); }, 30); });
FORM_IDS.forEach(function(id){ $('#' + id).addEventListener('input', function(){ kExample = false; saveForm(); renderKorekcja(); }); });
$('#k-dia').addEventListener('change', function(){ saveForm(); renderKorekcja(); });
var NEXT = {'k-nom':'k-up', 'k-up':'k-lo', 'k-lo':'k-meas'};
Object.keys(NEXT).forEach(function(id){ $('#' + id).addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); $('#' + NEXT[id]).focus(); } }); });
$('#k-meas').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ this.blur(); $('#kres').scrollIntoView({behavior:'smooth', block:'center'}); } });
$('#kNext').addEventListener('click', function(){ $('#k-meas').value = ''; kExample = false; saveForm(); renderKorekcja(); $('#k-meas').focus(); $('#k-meas').scrollIntoView({block:'center'}); });
$('#kReset').addEventListener('click', function(){
  fillForm({}); S.target = 'mid'; $('#k-dia').checked = false; kExample = false; saveForm(); renderKorekcja(); $('#k-nom').focus();
});

var lastK = null;
function renderKorekcja(){
  var K = KINDS[S.kind], c = ctl(), isR = K.ax === 'R';
  $('#wallWrap').hidden = S.kind !== 'wall';
  setPressed('#wallSeg', 'data-dir', S.wallDir);
  setPressed('#tgtSeg', 'data-t', S.target);
  $('#customWrap').hidden = S.target !== 'custom';
  $('#diaWrap').hidden = !(isR && c === 'fanuc');
  $('#toolLab').textContent = c === 'fanuc' ? (isR ? 'Nr korekcji D' : 'Nr korekcji H') : 'Narzędzie i ostrze';
  $('#toolQ').setAttribute('data-term', c === 'sinumerik' ? 'ostrze-d' : (isR ? 'kor-promienia' : 'kor-dlugosci'));
  $('#k-tool').placeholder = c === 'fanuc' ? (isR ? 'np. D5' : 'np. H5') : 'np. T5 D1';
  $('#kExTag').innerHTML = kExample ? '<span class="ex">przykład</span>' : '';

  var nom = parseNum($('#k-nom').value), up = parseNum($('#k-up').value), lo = parseNum($('#k-lo').value);
  if (isFinite(nom)){
    var u = isFinite(up) ? up : 0, l = isFinite(lo) ? lo : 0;
    var mn = nom + Math.min(u, l), mx = nom + Math.max(u, l);
    $('#tolsum').innerHTML = 'Dobry wymiar: <b>' + mn.toFixed(3) + '</b> do <b>' + mx.toFixed(3) + '</b>' + (mx > mn ? ' · środek <b>' + String(+((mn + mx) / 2).toFixed(4)) + '</b>' : '');
  } else $('#tolsum').textContent = 'Wpisz nominał, np. 20 dla Ø20. Puste odchyłki = 0.';

  var meas = parseNum($('#k-meas').value);
  var r = calcCorrection({
    kind:S.kind, wallDir:S.wallDir, nom:nom, up:up, lo:lo,
    meas:meas, target:S.target, custom:parseNum($('#k-custom').value),
    current:parseNum($('#k-cur').value), dia:(isR && c === 'fanuc' && $('#k-dia').checked)
  });
  lastK = r;
  var box = $('#kres');
  if (!r){
    box.innerHTML = '<p class="empty">' + (!isFinite(nom) ? 'Wpisz nominał w kroku 2.' : !isFinite(meas) ? 'Wpisz zmierzony wymiar w kroku 3.' : 'Wpisz własny cel w kroku 3.') + '</p>';
    updateStrip(); return;
  }

  var tool = $('#k-tool').value.trim();
  var delta = r.delta, zero = Math.abs(delta) < 0.0005;
  var colName = c === 'fanuc' ? (isR ? 'zużycia promienia' : 'zużycia długości') : (isR ? 'ΔR' : 'ΔL');
  var label = c === 'fanuc' ? (isR ? 'Korekta zużycia promienia (D)' : 'Korekta zużycia długości (H)') : (isR ? 'Korekta ΔR (promień)' : 'Korekta ΔL (długość)');
  var who = tool ? ' ' + esc(tool) : '';
  var headline;
  if (zero) headline = 'Wymiar jest w celu. Nie zmieniaj korekcji.';
  else if (c === 'sinumerik' && r.newWear != null) headline = 'Ustaw ' + colName + who + ' na <b>' + f3(r.newWear) + '</b>.';
  else headline = 'Dodaj <b>' + f3(delta, true) + '</b> do ' + colName + who + '.';

  var stChip = r.status === 'ok' ? '<span class="chip ok">Pomiar w tolerancji</span>'
    : '<span class="chip bad">Poza tolerancją — ' + (r.status === 'high' ? 'za duży' : 'za mały') + '</span>';

  var expl = '';
  if (!zero){
    var effect = isR ? (delta < 0 ? 'frez zbierze więcej materiału' : 'frez zostawi więcej materiału')
                     : (delta < 0 ? 'narzędzie zejdzie niżej' : 'narzędzie zostanie wyżej');
    expl = 'Pomiar jest o <b class="mono">' + f3(Math.abs(r.err)) + '</b> mm ' + (r.err > 0 ? 'większy' : 'mniejszy') + ' niż cel. Po zmianie ' + effect + '.' +
      (isR && KINDS[S.kind].n === 2 ? ' Korekta działa na obie strony, więc to połowa różnicy.' : '');
  }

  var lo2 = Math.min(r.lower, r.target, meas), hi2 = Math.max(r.upper, r.target, meas);
  var span = Math.max(hi2 - lo2, 0.002), pad = span * 0.18, a = lo2 - pad, b = hi2 + pad;
  function pc(v){ return ((v - a) / (b - a) * 100).toFixed(2) + '%'; }
  var tgtStr = String(+r.target.toFixed(4));
  var bar = '<div class="tol"><div class="tbar" role="img" aria-label="Pomiar ' + f3(meas) + ' przy granicach ' + f3(r.lower) + ' i ' + f3(r.upper) + '">' +
    '<div class="tband" style="left:' + pc(r.lower) + ';width:calc(' + pc(r.upper) + ' - ' + pc(r.lower) + ')"></div>' +
    '<div class="ttgt" style="left:' + pc(r.target) + '"></div>' +
    '<div class="tmeas ' + (r.status === 'ok' ? 'ok' : 'bad') + '" style="left:' + pc(meas) + '"></div></div>' +
    '<div class="tlegend"><span>min<b>' + r.lower.toFixed(3) + '</b></span><span class="lt">cel<b>' + tgtStr + '</b></span><span>pomiar<b>' + meas.toFixed(3) + '</b></span><span>max<b>' + r.upper.toFixed(3) + '</b></span></div></div>';

  var where;
  if (c === 'fanuc'){
    where = '<ol style="margin:0;padding-left:20px;display:grid;gap:4px">' +
      '<li>Naciśnij <b>OFFSET/SETTING</b> → zakładka <b>KOREKCJA</b> (OFFSET).</li>' +
      '<li>Znajdź wiersz <b>' + esc(tool || 'z numerem ' + (isR ? 'D' : 'H')) + '</b>, kolumna <b>ZUŻYCIE ' + (isR ? '(D)' : '(H)') + '</b> / WEAR.</li>' +
      '<li>Wpisz <b class="mono">' + f3(delta, true) + '</b> i naciśnij <b>[+WPROWADŹ]</b> / [+INPUT]. <button type="button" class="q" data-term="input-plus" aria-label="Co robi +WPROWADŹ?">?</button></li>' +
      '</ol>' + (r.newWear != null ? '<p>Po zmianie w komórce powinno być <b class="mono">' + f3(r.newWear) + '</b>.</p>' : '') +
      '<p class="fine">Inny układ ekranu? Zobacz <button type="button" class="tlink" data-term="pamiec-abc">pamięć korekcji A / B / C</button>.</p>';
  } else {
    where = '<ol style="margin:0;padding-left:20px;display:grid;gap:4px">' +
      '<li>Otwórz <b>Parametry</b> → <b>Zużycie narzędzia</b>.</li>' +
      '<li>Znajdź <b>' + esc(tool || 'narzędzie i ostrze D') + '</b>, kolumna <b>' + (isR ? 'ΔPromień (ΔR)' : 'ΔDługość (ΔL)') + '</b>.</li>' +
      '<li>' + (r.newWear != null ? 'Wpisz <b class="mono">' + f3(r.newWear) + '</b> (obecne ' + f3(parseNum($('#k-cur').value)) + ' ' + (delta < 0 ? '−' : '+') + ' ' + f3(Math.abs(delta)) + ').' : 'Dodaj <b class="mono">' + f3(delta, true) + '</b> do wartości, która tam stoi. Wpisz obecne zużycie w kroku 4, a policzę całą wartość.') + '</li>' +
      '</ol>';
  }

  var notes = [];
  if (r.swapped) notes.push(['warn','Odchyłka dolna była większa niż górna — zamieniono je miejscami.']);
  if (Math.abs(r.err) > 1) notes.push(['bad','Różnica ponad 1 mm. To raczej zły wymiar, złe narzędzie albo błąd odczytu, nie zużycie. Sprawdź przed zmianą.']);
  else if (Math.abs(delta) >= 0.1) notes.push(['warn','Duża korekta (0,1 mm lub więcej). Sprawdź pomiar, temperaturę detalu i stan narzędzia.']);
  if (r.status === 'ok' && !zero) notes.push(['','Pomiar mieści się w tolerancji. Korekta tylko przesunie wymiar bliżej celu — możesz ją pominąć.']);
  if (multiAx()) notes.push(['', isR ? 'Obróbka 5-osiowa: jeśli program z CAM idzie po torze środka narzędzia (bez G41/G42), korekcja D nic nie zmieni — popraw w CAM albo w programie.' : 'Obróbka 5-osiowa: przy pochylonym narzędziu korekcja długości przesuwa narzędzie wzdłuż jego osi, a nie wzdłuż Z stołu.']);
  notes.push(['', isR ? 'Działa tylko, gdy kontur jest frezowany z G41/G42. Zmieni wszystkie kontury robione tym ' + (c === 'fanuc' ? 'numerem D' : 'ostrzem D') + '.' : 'Zmieni wszystkie głębokości robione tym narzędziem.']);
  if (isR && c === 'fanuc' && $('#k-dia').checked) notes.push(['warn','Liczone w średnicy (×2).']);

  box.innerHTML =
    '<div class="res-top"><div><div class="lrow" style="justify-content:flex-start"><span class="lab">' + esc(label) + '</span><button type="button" class="q" data-term="zuzycie" aria-label="Co to jest zużycie?">?</button></div>' +
    '<div class="big">' + f3(delta, true) + '<small>mm</small></div></div>' +
    '<button type="button" class="btn" id="copyDelta">Kopiuj</button></div>' +
    '<p class="headline">' + headline + '</p>' +
    '<div class="chips">' + stChip + '<span class="dev">od celu <b>' + f3(r.err, true) + '</b> mm</span></div>' +
    bar + (expl ? '<p class="explain">' + expl + '</p>' : '') +
    '<ul class="notes">' + notes.map(function(n){ return '<li class="' + n[0] + '">' + esc(n[1]) + '</li>'; }).join('') + '</ul>' +
    (zero ? '' : '<details class="more"' + (store.get('whereOpen', true) ? ' open' : '') + ' id="whereDet"><summary>Jak to wpisać na ' + (c === 'fanuc' ? (S.machine === 'matsuura' ? 'G-Tech 31i (Fanuc)' : 'Fanuc') : 'Sinumerik') + '</summary><div class="where">' + where + '</div></details>') +
    '<div class="row"><button type="button" class="btn primary" id="saveLog">Zapisz w dzienniku</button>' +
    (canShare() ? '<button type="button" class="btn" id="shareK">Udostępnij</button>' : '') + '</div>';

  $('#copyDelta').onclick = function(){ copyText(f3(delta)); };
  if ($('#whereDet')) $('#whereDet').addEventListener('toggle', function(){ store.set('whereOpen', this.open); });
  $('#saveLog').onclick = function(){
    S.log.unshift({t:new Date().toISOString(), m:S.machine, c:c, tool:tool, kind:S.kind, ax:r.ax, delta:delta, nw:r.newWear, meas:meas, tgt:r.target, st:r.status});
    S.log = S.log.slice(0, 50); store.set('log', S.log); renderLog(); toast('Zapisano w dzienniku');
  };
  if (canShare()) $('#shareK').onclick = function(){
    shareText('Korekta', MACHINES[S.machine].name + (tool ? ' · ' + tool : '') + '\n' + KINDS[S.kind].label + ': pomiar ' + f3(meas) + ', cel ' + tgtStr + '\n' + label + ': ' + f3(delta, true) + (r.newWear != null ? ' → ' + f3(r.newWear) : ''));
  };
  updateStrip();
}

/* Pasek wyniku — widoczny, gdy karta wyniku jest poza ekranem */
var resVisible = true;
function updateStrip(){
  var show = !$('#tab-korekcja').hidden && lastK && !resVisible && !openSheetId;
  $('#strip').hidden = !show;
  if (!lastK) return;
  var c = ctl(), isR = lastK.ax === 'R', tool = $('#k-tool').value.trim();
  $('#stripLab').textContent = 'Korekta ' + (c === 'fanuc' ? (isR ? 'zużycia D' : 'zużycia H') : (isR ? 'ΔR' : 'ΔL')) + (tool ? ' · ' + tool : '');
  $('#stripVal').textContent = f3(lastK.delta, true);
  $('#stripSt').className = 'ss ' + (lastK.status === 'ok' ? 'ok' : 'bad');
}
if ('IntersectionObserver' in window){
  new IntersectionObserver(function(en){ resVisible = en[0].isIntersecting; updateStrip(); }, {rootMargin:'0px 0px -140px 0px'}).observe($('#kres'));
}
$('#stripBtn').addEventListener('click', function(){ $('#kres').scrollIntoView({behavior:'smooth', block:'start'}); });

function renderLog(){
  $('#logEmpty').hidden = S.log.length > 0;
  $('#logList').innerHTML = S.log.map(function(e){
    var d = new Date(e.t);
    var ts = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var m = MACHINES[e.m] ? MACHINES[e.m].name : e.m;
    var axl = e.c === 'fanuc' ? (e.ax === 'R' ? 'D' : 'H') : (e.ax === 'R' ? 'ΔR' : 'ΔL');
    return '<li><span class="t">' + ts + '</span><span class="d">' + esc(m) + ' · ' + esc(e.tool || '—') + ' · ' + esc(KIND_UI[e.kind] ? KIND_UI[e.kind].short : '') + '</span><span class="v">' + axl + ' ' + f3(e.delta, true) + '</span>' +
      '<span class="s">pomiar ' + (isFinite(e.meas) ? f3(e.meas) : '—') + ' · cel ' + (isFinite(e.tgt) ? +(+e.tgt).toFixed(4) : '—') + (e.nw != null ? ' · nowe ' + f3(e.nw) : '') + '</span></li>';
  }).join('');
  var act = $('#logActions');
  if (!S.log.length){ act.innerHTML = ''; return; }
  act.innerHTML = S.confirmClear
    ? '<span class="row"><button type="button" class="btn danger" id="logYes">Usuń wpisy</button><button type="button" class="btn ghost" id="logNo">Anuluj</button></span>'
    : '<button type="button" class="btn ghost" id="logClear">Wyczyść</button>';
  if (S.confirmClear){
    $('#logYes').onclick = function(){ S.log = []; store.set('log', S.log); S.confirmClear = false; renderLog(); toast('Dziennik wyczyszczony'); };
    $('#logNo').onclick = function(){ S.confirmClear = false; renderLog(); };
  } else $('#logClear').onclick = function(){ S.confirmClear = true; renderLog(); };
}

/* ===== Program ===== */
function plLines(n){ return n === 1 ? 'linia' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'linie' : 'linii'; }
var gTimer = null, gLast = null;
function onProgChange(now){
  var t = $('#g-prog').value, n = t ? t.split(/\r?\n/).length : 0;
  $('#g-meta').textContent = n + ' ' + plLines(n) + ' · ' + (ctl() === 'fanuc' ? 'Fanuc' : 'Sinumerik');
  $('#g-ex').hidden = S.gEdited;
  clearTimeout(gTimer);
  if (now) runG(); else gTimer = setTimeout(runG, 300);
}
$('#g-prog').addEventListener('input', function(){ S.gEdited = true; onProgChange(); });
$('#g-sample').addEventListener('click', function(){ S.gEdited = false; S.gFileName = ''; $('#g-prog').value = sampleProg(); setRange(0, 0); onProgChange(true); });
$('#g-clear').addEventListener('click', function(){ S.gEdited = true; S.gFileName = ''; $('#g-prog').value = ''; setRange(0, 0); onProgChange(true); $('#g-prog').focus(); });
$('#g-file').addEventListener('change', function(){
  var f = this.files && this.files[0]; if (!f) return;
  var rd = new FileReader();
  rd.onload = function(){ S.gEdited = true; S.gFileName = f.name; $('#g-prog').value = String(rd.result); setRange(0, 0); onProgChange(true); toast('Wczytano ' + f.name); };
  rd.onerror = function(){ toast('Nie udało się odczytać pliku'); };
  rd.readAsText(f);
  this.value = '';
});
$('#g-ops').addEventListener('click', function(e){
  var b = e.target.closest('[data-mode]'); if (!b) return;
  S.gMode = b.getAttribute('data-mode'); setChecked('#g-ops', 'data-mode', S.gMode); showGFields(); runG();
});
segClick('#g-axis', 'data-axis', function(v){ S.gAxis = v; setPressed('#g-axis', 'data-axis', v); showGFields(); runG(); });
['#g-center','#g-wdelta','#g-sdelta','#g-old','#g-new','#g-from','#g-to'].forEach(function(id){ $(id).addEventListener('input', function(){ clearTimeout(gTimer); gTimer = setTimeout(runG, 250); }); });
$('#g-all').addEventListener('click', function(){ setRange(0, 0); runG(); });

function renderAxes(){
  var list = ['X','Y','Z'].concat(multiAx() ? MACHINES[S.machine].rot : []);
  if (list.indexOf(S.gAxis) < 0) S.gAxis = 'X';
  $('#g-axis').innerHTML = list.map(function(a){ return '<button type="button" data-axis="' + a + '" aria-pressed="' + (a === S.gAxis) + '">' + a + (ROT[a] ? '°' : '') + '</button>'; }).join('');
  showGFields();
}
function setRange(a, b){ $('#g-from').value = a || ''; $('#g-to').value = b || ''; S.rangePending = false; }
function showGFields(){
  var rot = !!ROT[S.gAxis], wt = $('#g-ops [data-mode=widen]');
  wt.disabled = rot; wt.title = rot ? 'Dla osi obrotowej użyj Przesuń albo Zamień' : '';
  if (rot && S.gMode === 'widen'){ S.gMode = 'shift'; setChecked('#g-ops', 'data-mode', 'shift'); }
  $('#g-sdeltaLab').textContent = rot ? 'O ile obrócić (°)' : 'O ile przesunąć (mm)';
  $$('#tab-gcode .field[data-for]').forEach(function(el){ el.hidden = el.getAttribute('data-for') !== S.gMode; });
  $('#g-example').innerHTML = OP_EXAMPLE[S.gMode](S.gAxis);
}

function renderViewer(changed){
  var view = $('#g-view');
  if (!$('#g-rangewrap').open){ view.innerHTML = ''; return; }
  var lines = $('#g-prog').value.split(/\r?\n/);
  var from = parseInt($('#g-from').value, 10) || 0, to = parseInt($('#g-to').value, 10) || 0;
  var chg = {}; (changed || []).forEach(function(c){ chg[c.ln] = 1; });
  var max = Math.min(lines.length, 3000), html = '';
  for (var i = 0; i < max; i++){
    var ln = i + 1, cls = [];
    if ((from || to) && ln >= (from || 1) && ln <= (to || lines.length)) cls.push('in');
    if (ln === from || ln === to) cls.push('edge');
    if (chg[ln]) cls.push('chg');
    html += '<li class="' + cls.join(' ') + '"><button type="button" data-ln="' + ln + '"><span class="n">' + ln + '</span><span class="c">' + (esc(lines[i]) || ' ') + '</span></button></li>';
  }
  if (lines.length > max) html += '<li><p class="fine" style="padding:6px 10px">Pokazano pierwsze ' + max + ' linii. Dalsze wpisz w pola zakresu.</p></li>';
  view.innerHTML = html;
}
$('#g-rangewrap').addEventListener('toggle', function(){ renderViewer(gLast && gLast.changes); });
$('#g-view').addEventListener('click', function(e){
  var b = e.target.closest('button[data-ln]'); if (!b) return;
  var ln = Number(b.getAttribute('data-ln'));
  if (!S.rangePending){ $('#g-from').value = ln; $('#g-to').value = ln; S.rangePending = true; toast('Początek: linia ' + ln + '. Teraz dotknij końca.'); }
  else {
    var a = Number($('#g-from').value) || ln;
    $('#g-from').value = Math.min(a, ln); $('#g-to').value = Math.max(a, ln); S.rangePending = false;
    toast('Zakres: linie ' + Math.min(a, ln) + '–' + Math.max(a, ln));
  }
  runG();
});

function downloadText(text, name){
  try {
    var blob = new Blob([text], {type:'text/plain'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Zapisano ' + name);
  } catch(e){ toast('Nie udało się zapisać pliku'); }
}
function outName(){
  var n = S.gFileName || (ctl() === 'fanuc' ? 'O1001.nc' : 'PROGRAM.MPF');
  var i = n.lastIndexOf('.');
  return i > 0 ? n.slice(0, i) + '_ZM' + n.slice(i) : n + '_ZM';
}

function runG(){
  var text = $('#g-prog').value, out = $('#g-out');
  var from = parseInt($('#g-from').value, 10) || 0, to = parseInt($('#g-to').value, 10) || 0;
  var total = text ? text.split(/\r?\n/).length : 0;
  $('#g-range').innerHTML = (from || to) ? 'Zmieniam tylko linie <b>' + (from || 1) + '–' + (to || total) + '</b>' : '';
  $('#g-all').hidden = !(from || to);
  $('#g-range').parentNode.hidden = !(from || to);
  if (!text.trim()){ gLast = null; out.innerHTML = '<p class="empty">Wklej program albo wczytaj plik w kroku 1.</p>'; renderViewer(); return; }
  var o = {ctl:ctl(), mode:S.gMode, axis:S.gAxis, from:from, to:to}, bad = null;
  if (o.mode === 'widen'){ o.center = parseNum($('#g-center').value); o.delta = parseNum($('#g-wdelta').value); if (!isFinite(o.center) || !isFinite(o.delta)) bad = 'Wpisz środek wymiaru i o ile go zmienić.'; }
  else if (o.mode === 'shift'){ o.delta = parseNum($('#g-sdelta').value); if (!isFinite(o.delta)) bad = 'Wpisz, o ile przesunąć.'; }
  else { o.oldVal = parseNum($('#g-old').value); o.newVal = parseNum($('#g-new').value); if (!isFinite(o.oldVal) || !isFinite(o.newVal)) bad = 'Wpisz obecną i nową wartość.'; }
  if (from && to && from > to) bad = 'Linia „od” jest większa niż „do”.';
  if (bad){ gLast = null; out.innerHTML = '<p class="empty">' + esc(bad) + '</p>'; renderViewer(); return; }

  var r = processProgram(text, o);
  gLast = r;
  var opDesc = o.mode === 'widen' ? 'Poszerzenie ' + o.axis + ' o ' + f3(o.delta, true) + ' wokół ' + o.center
    : o.mode === 'shift' ? 'Przesunięcie ' + o.axis + ' o ' + f3(o.delta, true)
    : 'Zamiana ' + o.axis + ' ' + o.oldVal + ' → ' + o.newVal;

  var html = '<div class="ghead"><span class="lab">' + esc(opDesc) + (S.gEdited ? '' : '<span class="ex">przykład</span>') + '</span></div>' +
    '<div class="chips">' +
    (r.changes.length ? '<span class="chip ok">Zmienione linie: ' + r.changes.length + '</span>' : '<span class="chip neutral">Brak zmian</span>') +
    (r.warnings.length ? '<span class="chip warn">Do sprawdzenia: ' + r.warnings.length + '</span>' : (r.changes.length ? '<span class="chip ok">Bez ostrzeżeń</span>' : '')) + '</div>';
  if (!r.changes.length){
    html += '<p class="empty">' + (o.mode === 'replace' ? 'Nie znaleziono ' + esc(o.axis) + ' równego ' + esc(String(o.oldVal)) + ' w tym zakresie. Sprawdź oś i wartość.' : 'Żadna wartość ' + esc(o.axis) + ' nie zmieniła się. Sprawdź oś, środek i zakres linii.') + '</p>';
  }
  if (r.warnings.length){
    html += '<ul class="notes">' + r.warnings.map(function(w){
      return '<li class="' + (w.key === 'arc' ? 'bad' : 'warn') + '">' + esc(w.text) + ' <span class="mono">Linie: ' + w.lines.slice(0, 12).join(', ') + (w.lines.length > 12 ? '…' : '') + '</span></li>';
    }).join('') + '</ul>';
  }
  if (r.changes.length){
    html += '<p class="fine">Przekreślone — było. Pod spodem — będzie, zmiana zaznaczona na żółto.</p>' +
    '<div class="diff">' + r.changes.map(function(c){
      var nw = esc(c.marked).replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
      return '<div class="drow"><span class="n">' + c.ln + '</span><span class="o">' + esc(c.old) + '</span><span class="w">' + nw + '</span></div>';
    }).join('') + '</div>' +
    '<div class="row"><button type="button" class="btn primary" id="g-copy">Kopiuj program</button>' +
    (IS_PWA ? '<button type="button" class="btn" id="g-dl">Zapisz plik</button>' : '') +
    (canShare() ? '<button type="button" class="btn" id="g-share">Udostępnij</button>' : '') + '</div>' +
    '<button type="button" class="tlink" id="g-use">Zmień dalej ten wynik</button>' +
    '<textarea id="g-result" class="sr prog" readonly tabindex="-1" aria-label="Program po zmianie"></textarea>' +
    '<p class="fine">Przed obróbką: symulacja albo <button type="button" class="tlink" data-term="sucho">przejazd na sucho</button> z ograniczonym posuwem, zgodnie z procedurą zatwierdzania zmian w programie.</p>';
  }
  out.innerHTML = html;
  if (r.changes.length){
    $('#g-result').value = r.text;
    $('#g-copy').onclick = function(){ copyText(r.text, $('#g-result')); };
    if ($('#g-dl')) $('#g-dl').onclick = function(){ downloadText(r.text, outName()); };
    if ($('#g-share')) $('#g-share').onclick = function(){ shareText(outName(), r.text); };
    $('#g-use').onclick = function(){ S.gEdited = true; $('#g-prog').value = r.text; setRange(0, 0); onProgChange(true); toast('Wynik jest teraz programem wejściowym'); };
  }
  renderViewer(r.changes);
}

/* ===== Kody i słowniczek ===== */
function norm(s){ return String(s).toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function renderCats(){
  var keys = ['all','R','U','K','C','P','5','M'];
  $('#c-cats').innerHTML = keys.map(function(k){
    return '<button type="button" class="cat" data-cat="' + k + '" aria-pressed="' + (k === S.cat) + '">' + (k === 'all' ? 'Wszystkie' : CAT_NAMES[k]) + '</button>';
  }).join('');
}
$('#c-cats').addEventListener('click', function(e){
  var b = e.target.closest('.cat'); if (!b) return;
  S.cat = b.getAttribute('data-cat'); renderCats(); renderCodes();
});
function codeRow(r, c){
  var term = r[9] ? findTerm(r[9]) : null;
  var code = c === 'fanuc' ? r[2] : r[3], ex = c === 'fanuc' ? r[6] : r[7];
  var more = r[5] || ex || r[8] || term;
  return '<li class="crow"><div class="chead"><h3>' + esc(r[1]) + '</h3><code class="ccode">' + esc(code) + '</code></div>' +
    '<p class="what">' + esc(r[4]) + '</p>' +
    (more ? '<details class="cmore"><summary>Kiedy i przykład</summary><div class="body">' +
      (r[5] ? '<p>' + esc(r[5]) + '</p>' : '') +
      (ex ? '<div class="exb"><span class="lab">Przykład</span><pre>' + esc(ex) + '</pre></div>' : '') +
      (r[8] ? '<p class="cwarn"><b>Uwaga:</b> ' + esc(r[8]) + '</p>' : '') +
      (term ? '<button type="button" class="tlink" data-term="' + r[9] + '">Co to jest: ' + esc(term[1]) + '</button>' : '') +
      '</div></details>' : '') + '</li>';
}
function termRow(g){
  return '<li class="grow"><h3>' + esc(g[1]) + '</h3><p>' + esc(g[2]) + '</p></li>';
}
function renderCodes(){
  var q = norm($('#c-q').value.trim()), c = ctl();
  var showCodes = S.cat !== 'slownik', showTerms = S.cat === 'slownik' || (S.cat === 'all' && q);
  var codes = showCodes ? CODES.filter(function(r){ return (S.cat === 'all' || r[0] === S.cat) && (!q || norm(r.slice(1, 9).join(' ')).indexOf(q) >= 0); }) : [];
  var terms = showTerms ? GLOSSARY.filter(function(g){ return !q || norm(g[1] + ' ' + g[2]).indexOf(q) >= 0; }) : [];
  var n = codes.length + terms.length;
  $('#c-count').textContent = S.cat === 'slownik' ? terms.length + ' pojęć' : ('Sterowanie ' + (c === 'fanuc' ? 'Fanuc' : 'Sinumerik') + ' · wyniki: ' + n);
  $('#c-list').innerHTML = terms.map(termRow).join('') + codes.map(function(r){ return codeRow(r, c); }).join('') ||
    '<li class="crow"><p class="note">Nic nie znaleziono. Spróbuj numeru kodu, np. G83, albo słowa, np. „wiercenie”.</p></li>';
}
$('#c-q').addEventListener('input', function(){ if (S.cat !== 'all' && S.cat !== 'slownik' && this.value){ S.cat = 'all'; renderCats(); } renderCodes(); });
function renderCatsVis(){ $('#c-cats').hidden = S.cat === 'slownik'; $('#c-q').placeholder = S.cat === 'slownik' ? 'Szukaj pojęcia: TCP, zużycie, G54…' : 'Szukaj: G41, TCP, wiercenie, zużycie…'; }

/* ===== Alarmy ===== */
var ALARM_HELP = {
  fanuc: {title:'Pełny opis alarmu na sterowaniu', text:'Gdy alarm jest aktywny, naciśnij klawisz <b>HELP</b>, a potem przycisk ekranowy <b>ALARM</b> (szczegóły alarmu). Fanuc pokaże opis i przyczynę. Na niektórych wersjach ten ekran jest opcją. Alarmy maszyny (EX, numery od producenta) opisuje instrukcja maszyny.', link:'', linkText:''},
  sinumerik: {title:'Pełny opis alarmu na sterowaniu', text:'Otwórz listę alarmów (<b>Diagnostyka</b> → <b>Alarmy</b>), zaznacz alarm i naciśnij <b>Pomoc</b> / klawisz <b>i</b>. Sinumerik pokaże wyjaśnienie i sposób usunięcia. Alarmy 700000+ to alarmy maszyny od producenta (PLC).',
    link:'https://cache.industry.siemens.com/dl/files/312/61629312/att_78894/v1/DAsl_0911_en_en-US.pdf', linkText:'Oficjalna lista alarmów Siemens (PDF, po angielsku)'}
};
function renderAlarmHelp(){
  var h = ALARM_HELP[S.alarmCtl] || ALARM_HELP.fanuc;
  $('#a-help').innerHTML = '<span class="connname">' + h.title + '</span><p class="fine" style="font-size:14.5px">' + h.text + '</p>' +
    (h.link ? '<a class="lnk" href="' + h.link + '" target="_blank" rel="noopener">' + h.linkText + '</a>' : '');
}
function renderAlarms(){
  renderAlarmHelp();
  var q = norm($('#a-q').value.trim()), list = ALARMS[S.alarmCtl] || [];
  var rows = list.filter(function(a){ return !q || norm(a.join(' ')).indexOf(q) >= 0; });
  var html = rows.map(function(a){
    return '<li class="arow"><div class="ahead"><span class="acode">' + esc(a[0]) + '</span><span class="aen">' + esc(a[1]) + '</span></div>' +
      '<p>' + esc(a[2]) + '</p><p class="chk"><b>Sprawdź:</b> ' + esc(a[3]) + '</p>' +
      '<button type="button" class="tlink" data-askalarm="' + esc(a[0]) + '">Zapytaj AI o ten alarm</button></li>';
  }).join('');
  var M = MACHINE_ALARMS[S.machine], mrows = [];
  if (M && M.ctl === S.alarmCtl){
    mrows = M.list.filter(function(a){ return !q || norm(a[0] + ' ' + a[1]).indexOf(q) >= 0; });
    if (mrows.length){
      html += '<li class="agroup"><b>' + esc(M.title) + '</b><span>' + (q ? 'wyniki: ' + mrows.length : mrows.length + ' alarmów') + '</span></li>' +
        mrows.map(function(a){
          return '<li class="arow"><div class="ahead"><span class="acode">' + esc(a[0]) + '</span></div><p>' + esc(a[1]) + '</p>' +
            '<div class="row" style="gap:16px"><a class="tlink" href="' + M.url + encodeURIComponent(a[0]) + '" target="_blank" rel="noopener">Przyczyna i kroki naprawy (ang.)</a>' +
            '<button type="button" class="tlink" data-askalarm="' + esc(a[0]) + '">Zapytaj AI</button></div></li>';
        }).join('') +
        '<li class="arow"><p class="fine">' + esc(M.src) + '</p></li>';
    }
  }
  $('#a-list').innerHTML = html || '<li class="arow"><p class="chk">Brak tego alarmu na liście. Sprawdź w diagnostyce sterowania (' + (S.alarmCtl === 'fanuc' ? 'HELP → ALARM' : 'Diagnostyka → Alarmy') + ') albo zapytaj AI.</p></li>';
}
$('#a-q').addEventListener('input', renderAlarms);

/* ===== Zakładki ===== */
var TABS = ['start','korekcja','gcode','ai','wiedza'];
var SUBS = {kody:'kody', slownik:'slownik', alarmy:'alarmy'};
function showWiedza(sub){
  setPressed('#wSeg', 'data-w', sub);
  $('#w-kody').hidden = sub === 'alarmy';
  $('#w-alarmy').hidden = sub !== 'alarmy';
  if (sub === 'slownik') S.cat = 'slownik';
  else if (sub === 'kody' && S.cat === 'slownik') S.cat = 'all';
  if (sub !== 'alarmy'){ renderCats(); renderCatsVis(); renderCodes(); }
  store.set('wsub', sub);
}
segClick('#wSeg', 'data-w', function(v){ showWiedza(v); });
function showTab(t){
  if (SUBS[t]){ showWiedza(SUBS[t]); t = 'wiedza'; }
  if (TABS.indexOf(t) < 0) t = 'start';
  TABS.forEach(function(x){ $('#tab-' + x).hidden = x !== t; });
  $$('.tab').forEach(function(b){ b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === t)); });
  if (t === 'start') renderStart();
  updateStrip();
}
$$('.tab').forEach(function(b){ b.addEventListener('click', function(){ showTab(b.getAttribute('data-tab')); window.scrollTo(0, 0); }); });

/* ===== Ekran Start ===== */
function renderStart(){
  var picked = store.get('machineSet', false);
  $('#st-pick').hidden = picked;
  $('#st-main').hidden = !picked;
  if (!picked){
    $('#st-machines').innerHTML = Object.keys(MACHINES).map(function(id){
      var m = MACHINES[id];
      return '<button type="button" class="mopt" data-pickm="' + id + '"><b>' + esc(m.name) + '</b><small>' + esc(m.type) + '</small><span class="ct">' + esc(ctlName(id)) + (multiAx(id) ? '<br>' + axLabel(id) : '') + '</span></button>';
    }).join('');
    return;
  }
  var rec = S.log.slice(0, 3);
  $('#st-recent').hidden = !rec.length;
  $('#st-recentList').innerHTML = rec.map(function(e){
    var d = new Date(e.t), ts = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var axl = e.c === 'fanuc' ? (e.ax === 'R' ? 'D' : 'H') : (e.ax === 'R' ? 'ΔR' : 'ΔL');
    return '<li><span class="mono">' + ts + '</span><span>' + esc((MACHINES[e.m] ? MACHINES[e.m].short : '') + ' · ' + (e.tool || (KIND_UI[e.kind] ? KIND_UI[e.kind].short : ''))) + '</span><b class="mono">' + axl + ' ' + f3(e.delta, true) + '</b></li>';
  }).join('');
}
$('#st-machines').addEventListener('click', function(e){
  var b = e.target.closest('[data-pickm]'); if (!b) return;
  S.machine = b.getAttribute('data-pickm'); store.set('machine', S.machine); store.set('machineSet', true);
  onControlChange(); renderStart(); toast('Maszyna: ' + MACHINES[S.machine].name);
});
$('#st-tasks').addEventListener('click', function(e){
  var b = e.target.closest('[data-go]'); if (!b) return;
  showTab(b.getAttribute('data-go')); window.scrollTo(0, 0);
});
$('#st-help').addEventListener('click', function(){ openSheet('#help'); });

/* ===== Start ===== */
applyTheme();
renderKinds();
renderCats();
$('#g-prog').value = sampleProg();
showGFields();
renderLog();
onControlChange();
var hash = (location.hash || '').replace('#', '');
if (!store.get('machineSet', false) && store.get('machine', null)) store.set('machineSet', true);
showWiedza(store.get('wsub', 'kody'));
showTab(hash || 'start');
if (S.wake){ $('#wakeSw').checked = true; requestWake(); }
