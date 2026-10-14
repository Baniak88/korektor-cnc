/* ===== Nawigacja: menu boczne (hamburger) u góry, strzałka wstecz, przycisk Wstecz w Androidzie =====
   Każde przejście między ekranami trafia na stos. Strzałka „‹” i systemowy Wstecz cofają o jeden ekran;
   otwarte menu albo arkusz zamykają się najpierw. */

var NAV_MENU = [
  ['', [
    ['tab:start', 'Start', '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>'],
    ['guide:diag', 'Co jest nie tak?', '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>']
  ]],
  ['Pomiar i korekcja', [
    ['tab:korekcja', 'Korekcja z pomiaru', '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'],
    ['guide:offset', 'Gdzie wpisać korekcję', '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M10 10v9"/>']
  ]],
  ['Ustawienia przy maszynie', [
    ['guide:zero', 'Punkt zerowy (G54)', '<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>'],
    ['guide:tool', 'Długość narzędzia', '<path d="M9 3h6v6l-2 2v9h-2v-9L9 9z"/>'],
    ['guide:cut', 'Obroty i posuw', '<circle cx="12" cy="12" r="8"/><path d="M12 12l4-3"/>'],
    ['guide:restart', 'Wznów program od linii', '<path d="M5 12a7 7 0 1 0 2-5"/><path d="M5 4v4h4"/>']
  ]],
  ['Program', [
    ['tab:gcode', 'Popraw program i symulacja', '<path d="M8 5L3 12l5 7"/><path d="M16 5l5 7-5 7"/>'],
    ['tab:nowy', 'Nowy program', '<path d="M6 3h8l4 4v14H6z"/><path d="M12 11v6M9 14h6"/>'],
    ['tab:ai', 'Zapytaj AI', '<path d="M4 5h16v11H10l-5 4v-4H4z"/>']
  ]],
  ['Problemy', [
    ['tab:alarmy', 'Alarmy', '<path d="M12 3L2 20h20z"/><path d="M12 10v4M12 17v.5"/>'],
    ['guide:broken', 'Złamane narzędzie', '<path d="M5 19L12 12M14 10l5-5"/>'],
    ['guide:limit', 'Krańcówka — oś nie rusza', '<path d="M4 12h12"/><path d="M13 8l4 4-4 4"/><path d="M20 4v16"/>']
  ]],
  ['Wiedza', [
    ['tab:kody', 'Kody G i M', '<path d="M5 4h14v16H5z"/><path d="M9 8h6M9 12h6M9 16h4"/>'],
    ['tab:slownik', 'Słowniczek', '<path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/>']
  ]],
  ['Aplikacja', [
    ['sheet:machine', 'Maszyna i ustawienia', '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'],
    ['sheet:help', 'Jak korzystać', '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.5M12 17v.3"/>']
  ]]
];

var NAV = {stack:[], cur:null, restoring:false, hist:false};
function navTitle(st){
  if (!st) return '';
  if (st.t === 'guide') return GUIDES[st.g] ? GUIDES[st.g].title : 'Przewodnik';
  if (st.t === 'wiedza') return {kody:'Kody G i M', slownik:'Słowniczek', alarmy:'Alarmy'}[st.w] || 'Wiedza';
  return {start:'Start', korekcja:'Korekcja', gcode:'Popraw program', nowy:'Nowy program', ai:'Zapytaj AI'}[st.t] || '';
}
function navKey(st){ return st.t + '|' + (st.g || '') + '|' + (st.w || ''); }
function navState(t){
  var st = {t:t};
  if (t === 'guide') st.g = curGuide;
  if (t === 'wiedza') st.w = store.get('wsub', 'kody');
  return st;
}
function navUpdate(){
  $('#navBack').hidden = !NAV.stack.length;
  $('#navTitle').textContent = navTitle(NAV.cur);
  renderDrawer();
}
function navApply(st){
  NAV.restoring = true;
  try {
    if (st.t === 'guide' && st.g) openGuide(st.g);
    else if (st.t === 'wiedza') showTab(st.w || 'kody');
    else showTab(st.t);
  } finally { NAV.restoring = false; }
  window.scrollTo(0, 0);
}
/* Zapis przejścia (wywoływane po każdym showTab) */
var _showTabNav = showTab;
showTab = function(t){
  _showTabNav(t);
  var real = $('#tab-guide') && !$('#tab-guide').hidden ? 'guide' : TABS.filter(function(x){ return $('#tab-' + x) && !$('#tab-' + x).hidden; })[0] || 'start';
  var st = navState(real);
  if (real === 'ai' && typeof renderAI === 'function') renderAI();
  if (!NAV.restoring && NAV.cur && navKey(st) !== navKey(NAV.cur)){
    NAV.stack.push(NAV.cur);
    if (NAV.stack.length > 40) NAV.stack.shift();
    if (NAV.hist) try { history.pushState({kcnc:1, d:NAV.stack.length}, ''); } catch(e){ NAV.hist = false; }
  }
  NAV.cur = st;
  closeDrawer();
  navUpdate();
};
/* Zmiana podwidoku Wiedzy (kody / słowniczek / alarmy) też jest krokiem */
var _showWiedzaNav = showWiedza;
showWiedza = function(sub){
  _showWiedzaNav(sub);
  if (!NAV.cur || NAV.cur.t !== 'wiedza' || NAV.cur.w === sub) return;
  if (!NAV.restoring){
    NAV.stack.push(NAV.cur);
    if (NAV.hist) try { history.pushState({kcnc:1, d:NAV.stack.length}, ''); } catch(e){ NAV.hist = false; }
  }
  NAV.cur = {t:'wiedza', w:sub}; navUpdate();
};
function navBackInternal(){
  if (!NAV.stack.length) return false;
  var st = NAV.stack.pop();
  NAV.cur = st;
  navApply(st);
  NAV.cur = st;
  navUpdate();
  return true;
}
function navBack(){
  if (closeOverlays()) return;
  if (!NAV.stack.length) return;
  if (NAV.hist){ try { history.back(); return; } catch(e){} }
  navBackInternal();
}
/* Przycisk Wstecz w Androidzie / przeglądarce */
function closeOverlays(){
  var any = false;
  if (!$('#drawer').hidden){ closeDrawer(); any = true; }
  if (openSheetId){ closeSheet(); any = true; }
  return any;
}
window.addEventListener('popstate', function(){
  if (closeOverlays()){
    // tylko zamknij menu / arkusz — zostań na tym ekranie
    try { history.pushState({kcnc:1, d:NAV.stack.length}, ''); } catch(e){}
    return;
  }
  navBackInternal();
});
$('#navBack').addEventListener('click', navBack);

/* ----- Menu boczne ----- */
function curNavId(){
  var c = NAV.cur; if (!c) return '';
  if (c.t === 'guide') return 'guide:' + c.g;
  if (c.t === 'wiedza') return 'tab:' + (c.w || 'kody');
  return 'tab:' + c.t;
}
function renderDrawer(){
  var cid = curNavId();
  $('#drawerBody').innerHTML = NAV_MENU.map(function(g){
    return (g[0] ? '<span class="glab">' + esc(g[0]) + '</span>' : '') + '<div class="dgrp">' + g[1].map(function(it){
      return '<button type="button" class="ditem" data-nav="' + it[0] + '"' + (it[0] === cid ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + it[2] + '</svg><span>' + esc(it[1]) + '</span></button>';
    }).join('') + '</div>';
  }).join('');
}
function openDrawer(){
  if (openSheetId) closeSheet();
  renderDrawer();
  $('#drawer').hidden = false; $('#scrim').hidden = false;
  $('#navMenu').setAttribute('aria-expanded', 'true');
  setTimeout(function(){ var c = $('#drawer [aria-current]') || $('#navClose'); c.focus(); }, 30);
}
function closeDrawer(){
  if ($('#drawer').hidden) return;
  $('#drawer').hidden = true;
  if (!openSheetId) $('#scrim').hidden = true;
  $('#navMenu').setAttribute('aria-expanded', 'false');
}
$('#navMenu').addEventListener('click', function(){ if ($('#drawer').hidden) openDrawer(); else closeDrawer(); });
$('#navClose').addEventListener('click', closeDrawer);
$('#scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeDrawer(); });
$('#drawerBody').addEventListener('click', function(e){
  var b = e.target.closest('[data-nav]'); if (!b) return;
  var v = b.getAttribute('data-nav').split(':');
  closeDrawer();
  if (v[0] === 'tab'){ if (v[1] === 'gcode' || v[1] === 'nowy') store.set('ptab', v[1]); showTab(v[1]); window.scrollTo(0, 0); }
  else if (v[0] === 'guide') openGuide(v[1]);
  else if (v[1] === 'machine'){ renderSheet(); openSheet('#sheet'); }
  else if (v[1] === 'help') openSheet('#help');
});
/* Przycisk „‹ Start” w przewodnikach zastąpiony strzałką u góry */
document.addEventListener('click', function(e){ if (e.target.closest('[data-back]')){ e.stopImmediatePropagation(); navBack(); } }, true);

/* Start: bieżący ekran jako punkt wyjścia historii */
(function(){
  var h = (location.hash || '').replace('#', '');
  if (/^g-/.test(h) && GUIDES[h.slice(2)]) openGuide(h.slice(2));
  NAV.cur = navState($('#tab-guide') && !$('#tab-guide').hidden ? 'guide' : TABS.filter(function(x){ return $('#tab-' + x) && !$('#tab-' + x).hidden; })[0] || 'start');
  NAV.stack = [];
  try { history.replaceState({kcnc:1, d:0}, ''); NAV.hist = true; } catch(e){ NAV.hist = false; }
  navUpdate();
})();
