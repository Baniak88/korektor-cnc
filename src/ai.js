/* ===== AI przez aplikacje na telefonie (ChatGPT, Claude, Gemini) =====
   Bez kluczy API: aplikacja przygotowuje zdjęcia i pytanie, a operator wysyła je
   menu „Udostępnij” Androida do wybranej aplikacji AI. Odpowiedź z kodem można wkleić z powrotem. */

var AI = { act: 'ocr', photos: [], progTouched: false, qTouched: false };

var AI_ACTS = {
  ocr: {step:'Zrób zdjęcie programu', opt:'', needImg:true, prog:false,
    q:function(){ return 'Na zdjęciu jest program CNC z ekranu sterowania albo z wydruku. Przepisz go dokładnie, znak po znaku, w jednym bloku kodu. Nie poprawiaj błędów i nic nie dopisuj, zachowaj kolejność linii i numery N. Znaki, których nie da się pewnie odczytać, zastąp znakiem ?. Na końcu wypisz linie do sprawdzenia albo napisz „brak”.'; }},
  check: {step:'Dodaj program', opt:'zdjęcie albo program z zakładki Program', needImg:false, prog:true,
    q:function(){ return 'Sprawdź ten program przed uruchomieniem. Szukaj: błędów składni, brakującej lub złej korekcji długości i promienia, ruchów szybkich w dół do materiału, G90/G91, brakującego posuwu lub obrotów, cykli bez zakończenia, końca programu. Odpowiedz listą „Linia — problem — co zrobić”: najpierw rzeczy groźne (kolizja, złom), potem drobne. Nie pisz, że program jest bezpieczny.'; }},
  explain: {step:'Dodaj program', opt:'zdjęcie albo program z zakładki Program', needImg:false, prog:true,
    q:function(){ return 'Wyjaśnij prostym językiem, co robi ten program, krok po kroku: narzędzia, operacje, głębokości, kontury i cykle. Krótko.'; }},
  ask: {step:'Opisz problem', opt:'zdjęcie ekranu z alarmem pomaga', needImg:false, prog:false,
    q:function(){ return ''; }}
};

function aiCtlName(){ return ctlName(S.machine); }
function aiContext(){
  var m = MACHINES[S.machine], c = ctl();
  return 'Pracuję na frezarce CNC ' + m.name + ', sterowanie ' + aiCtlName() + (c === 'fanuc' ? ' (składnia Fanuc)' : ' (Siemens Sinumerik)') + '. ' +
    'Odpowiadaj po polsku, krótko i prostym językiem warsztatowym. Kod podawaj w składni ' + (c === 'fanuc' ? 'Fanuc' : 'Sinumerik') + ' w bloku kodu. ' +
    'Gdy coś zależy od parametrów maszyny, powiedz to wprost. Przy zmianach programu przypomnij o symulacji albo przejeździe na sucho.';
}
function progText(){ return $('#g-prog').value.trim(); }
var LONG_PROG = 12000;
function buildText(withFileNote){
  var q = $('#ai-q').value.trim() || 'Pomóż mi z tym, co jest na zdjęciu.';
  var t = aiContext() + '\n\n' + q;
  if ($('#ai-incProg').checked && progText() && !$('#ai-progWrap').hidden){
    if (withFileNote) t += '\n\nProgram jest w załączonym pliku program.txt.';
    else t += '\n\nProgram:\n```\n' + progText() + '\n```';
  }
  return t;
}

/* ----- Wybór akcji ----- */
function setAct(id, keepQ){
  AI.act = id; setChecked('#ai-acts', 'data-act', id);
  var A = AI_ACTS[id];
  $('#ai-s2').textContent = A.step;
  $('#ai-s2opt').textContent = A.opt;
  if (!keepQ){ $('#ai-q').value = A.q(); AI.qTouched = false; }
  $('#ai-q').placeholder = id === 'ask' ? 'Np. Mam alarm 0041 przy wejściu na kontur. Co sprawdzić?' : '';
  AI.progTouched = false;
  renderAI();
}
$('#ai-acts').addEventListener('click', function(e){ var b = e.target.closest('[data-act]'); if (b) setAct(b.getAttribute('data-act')); });
$('#ai-q').addEventListener('input', function(){ AI.qTouched = true; });

function renderAI(){
  var A = AI_ACTS[AI.act];
  $('#ai-thumbs').innerHTML = AI.photos.map(function(p, i){
    return '<div class="thumb"><img src="' + p.url + '" alt="Zdjęcie ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="Usuń zdjęcie">×</button></div>';
  }).join('');
  var n = progText() ? progText().split(/\r?\n/).length : 0;
  $('#ai-progWrap').hidden = !n || AI.act === 'ocr';
  if (!AI.progTouched) $('#ai-incProg').checked = A.prog && !!n && !AI.photos.length;
  $('#ai-progInfo').textContent = n ? '(' + n + ' ' + plLines(n) + (S.gEdited ? '' : ', przykład') + ')' : '';
  $('#ai-photoTip').hidden = AI.act !== 'ocr' && AI.act !== 'check' && AI.act !== 'explain';
}
$('#ai-incProg').addEventListener('change', function(){ AI.progTouched = true; });

/* ----- Zdjęcia ----- */
function addPhotos(files){
  var list = Array.prototype.slice.call(files || []).filter(function(f){ return /^image\//.test(f.type); });
  if (!list.length) return;
  var room = 6 - AI.photos.length;
  if (room <= 0){ toast('Maksymalnie 6 zdjęć'); return; }
  list.slice(0, room).forEach(function(f){ AI.photos.push({file:f, url:URL.createObjectURL(f)}); });
  if (list.length > room) toast('Dodano ' + room + ' (maks. 6)');
  renderAI();
  $('#ai-share').scrollIntoView({behavior:'smooth', block:'center'});
}
['#ai-cam', '#ai-gal'].forEach(function(id){ $(id).addEventListener('change', function(){ addPhotos(this.files); this.value = ''; }); });
$('#ai-thumbs').addEventListener('click', function(e){
  var b = e.target.closest('[data-rm]'); if (!b) return;
  var i = Number(b.getAttribute('data-rm')), p = AI.photos[i];
  if (p) try { URL.revokeObjectURL(p.url); } catch(_){}
  AI.photos.splice(i, 1); renderAI();
});

/* ----- Wysyłanie ----- */
function validateAI(){
  var A = AI_ACTS[AI.act];
  if (A.needImg && !AI.photos.length){ toast('Najpierw zrób zdjęcie programu'); $('#ai-cam').click(); return false; }
  if (AI.act !== 'ocr' && AI.act !== 'ask' && !AI.photos.length && !($('#ai-incProg').checked && progText())){
    toast('Dodaj zdjęcie programu albo dołącz program z zakładki Program'); return false;
  }
  if (AI.act === 'ask' && !$('#ai-q').value.trim() && !AI.photos.length){ toast('Wpisz pytanie albo dodaj zdjęcie'); $('#ai-q').focus(); return false; }
  return true;
}
function copyQuiet(text){ try { navigator.clipboard.writeText(text).catch(function(){}); } catch(e){} }

$('#ai-share').addEventListener('click', function(){
  if (!validateAI()) return;
  var files = AI.photos.map(function(p, i){
    var ext = (p.file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    return new File([p.file], 'zdjecie-' + (i + 1) + '.' + ext, {type:p.file.type || 'image/jpeg'});
  });
  var longProg = $('#ai-incProg').checked && !$('#ai-progWrap').hidden && progText().length > LONG_PROG;
  if (longProg){
    var pf = new File([progText()], 'program.txt', {type:'text/plain'});
    if (navigator.canShare && navigator.canShare({files:[pf]})) files.push(pf); else longProg = false;
  }
  var text = buildText(longProg);
  copyQuiet(text);
  if (!navigator.share){
    toast('Tekst skopiowany. Otwórz aplikację AI i wklej' + (files.length ? ', zdjęcie dodaj ręcznie' : ''));
    return;
  }
  var data = {text:text};
  if (files.length){
    if (navigator.canShare && navigator.canShare({files:files})) data.files = files;
    else toast('Ten telefon nie przekaże zdjęć — dodaj je ręcznie w aplikacji AI');
  }
  navigator.share(data).then(function(){
    toast('Wysłano. Odpowiedź z kodem możesz wkleić w kroku 4');
  }, function(e){
    if (e && e.name === 'AbortError') return;
    toast('Nie udało się otworzyć menu. Tekst jest w schowku — wklej go w aplikacji AI');
  });
});
$('#ai-copy').addEventListener('click', function(){
  if (!validateAI()) return;
  copyText(buildText(false));
});

/* ----- Odpowiedź z kodem ----- */
function extractCode(s){
  var blocks = [], m, re = /```[\w+-]*[ \t]*\n?([\s\S]*?)```/g;
  while ((m = re.exec(s))) blocks.push(m[1].replace(/\n$/, ''));
  if (blocks.length) return blocks.sort(function(a, b){ return b.length - a.length; })[0];
  var lines = s.split(/\r?\n/).filter(function(l){ return /^\s*(N\d+|[GMTOSF]\d|[XYZIJKR][-+.\d]|%|;|\(|[A-Z_]{3,}\d*\s*\()/i.test(l); });
  return lines.length >= 3 ? lines.join('\n') : '';
}
function onAns(){
  var code = extractCode($('#ai-ans').value);
  $('#ai-insert').disabled = !code;
  var n = code ? code.split('\n').length : 0;
  $('#ai-ansInfo').textContent = !$('#ai-ans').value.trim() ? '' : code ? 'Znaleziono kod: ' + n + ' ' + plLines(n) + '.' : 'Nie widzę kodu w tej odpowiedzi.';
}
$('#ai-ans').addEventListener('input', onAns);
$('#ai-paste').addEventListener('click', function(){
  try {
    navigator.clipboard.readText().then(function(t){ $('#ai-ans').value = t; onAns(); }, function(){ toast('Przytrzymaj pole poniżej i wybierz Wklej'); $('#ai-ans').focus(); });
  } catch(e){ toast('Przytrzymaj pole i wybierz Wklej'); $('#ai-ans').focus(); }
});
$('#ai-insert').addEventListener('click', function(){
  var code = extractCode($('#ai-ans').value); if (!code) return;
  S.gEdited = true; S.gFileName = ''; $('#g-prog').value = code; setRange(0, 0); onProgChange(true);
  showTab('gcode'); window.scrollTo(0, 0);
  toast(/\?/.test(code) ? 'Wstawiono. Sprawdź znaki „?” — to miejsca nieczytelne' : 'Wstawiono do zakładki Program');
});

/* ----- Wejścia z innych miejsc ----- */
function goAI(act, q){
  showTab('ai'); window.scrollTo(0, 0);
  setAct(act, !!q);
  if (q){ $('#ai-q').value = q; AI.qTouched = true; }
}
document.addEventListener('click', function(e){
  var a = e.target.closest('[data-askalarm]');
  if (a){
    var code = a.getAttribute('data-askalarm'), row = null;
    (ALARMS[S.alarmCtl] || []).forEach(function(x){ if (x[0] === code) row = x; });
    goAI('ask', 'Mam alarm ' + code + (row ? ' (' + row[1] + ')' : '') + '. Co mogło go spowodować i co sprawdzić krok po kroku? Szczegóły: ');
    $('#ai-q').focus();
    return;
  }
  var g = e.target.closest('[data-aiact]');
  if (g){
    var act = g.getAttribute('data-aiact');
    goAI(act);
    if (act === 'ocr') $('#ai-cam').click();
  }
});
$$('.tab[data-tab=ai]').forEach(function(b){ b.addEventListener('click', renderAI); });

setAct('ocr');
