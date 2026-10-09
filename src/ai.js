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
    (multiAx() ? 'To maszyna ' + (m.fiveAxis ? '5-osiowa' : 'z osiami obrotowymi') + ' (osie obrotowe ' + m.rot.join(', ') + (c === 'fanuc' ? '; płaszczyzna pochylona G68.2/G53.1, TCP G43.4' : '; płaszczyzna pochylona CYCLE800, TCP TRAORI') + '). ' : '') +
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
  $(AI.sample ? '#ai-ask' : '#ai-share').scrollIntoView({behavior:'smooth', block:'center'});
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
  store.set('aiWait', {sent:text, at:Date.now()});
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
    toast('Gdy AI odpowie: Kopiuj i wróć tutaj');
  }, function(e){
    if (e && e.name === 'AbortError') return;
    toast('Nie udało się otworzyć menu. Tekst jest w schowku — wklej go w aplikacji AI');
  });
});
$('#ai-copy').addEventListener('click', function(){
  if (!validateAI()) return;
  var t = buildText(false); copyText(t);
  store.set('aiWait', {sent:t, at:Date.now()});
});

/* ----- Odpowiedź wraca do aplikacji: schowek albo „Udostępnij → Korektor CNC” ----- */
function extractCode(s){
  var blocks = [], m, re = /```[\w+-]*[ \t]*\n?([\s\S]*?)```/g;
  while ((m = re.exec(s))) blocks.push(m[1].replace(/\n$/, ''));
  if (blocks.length) return blocks.sort(function(a, b){ return b.length - a.length; })[0];
  var lines = s.split(/\r?\n/).filter(function(l){ return /^\s*(N\d+|[GMTOSF]\d|[XYZIJKR][-+.\d]|%|;|\(|[A-Z_]{3,}\d*\s*\()/i.test(l); });
  return lines.length >= 3 ? lines.join('\n') : '';
}
function setAnswer(text, quiet){
  text = String(text || '').trim();
  if (!text) return;
  AI.answer = text;
  store.set('aiAnswer', {t:text, at:Date.now()});
  store.set('aiWait', null);
  renderAnswer();
  if (!quiet){
    toast('Odpowiedź z AI jest w aplikacji');
    setTimeout(function(){ $('#ai-anscard').scrollIntoView({behavior:'smooth', block:'start'}); }, 80);
  }
}
function renderAnswer(){
  var has = !!AI.answer;
  $('#ai-anscard').hidden = !has;
  $('#ai-wait').hidden = has;
  if (!has) return;
  $('#ai-ansBody').innerHTML = md(AI.answer).html;
  var code = extractCode(AI.answer);
  $('#ai-insert').hidden = !code;
  if (code){ var n = code.split('\n').length; $('#ai-insert').lastChild.textContent = 'Wstaw kod do Programu (' + n + ' ' + plLines(n) + ')'; }
}
$('#ai-insert').addEventListener('click', function(){ var code = extractCode(AI.answer || ''); if (code) insertCode(code); });
$('#ai-ansCopy').addEventListener('click', function(){ if (AI.answer) copyText(AI.answer); });
$('#ai-ansClear').addEventListener('click', function(){ AI.answer = ''; store.set('aiAnswer', null); renderAnswer(); });
function takeManual(){ var el = $('#ai-ans'), v = el.value; if (v.trim().length > 2){ setAnswer(v); el.value = ''; el.blur(); var d = el.closest('details'); if (d) d.open = false; } }
$('#ai-ans').addEventListener('paste', function(){ setTimeout(takeManual, 50); });
$('#ai-ans').addEventListener('change', takeManual);

function looksNew(t){
  var w = store.get('aiWait', null);
  t = String(t || '').trim();
  if (!t || t.length < 3) return false;
  if (w && w.sent && t === String(w.sent).trim()) return false;
  if (AI.answer && t === AI.answer) return false;
  return true;
}
function readClipboard(fromTap){
  if (!navigator.clipboard || !navigator.clipboard.readText){ if (fromTap) manualPaste(); return; }
  navigator.clipboard.readText().then(function(t){
    if (looksNew(t)) setAnswer(t);
    else if (fromTap) toast('W schowku nie ma nowej odpowiedzi. W aplikacji AI przytrzymaj odpowiedź i wybierz Kopiuj');
  }, function(){ if (fromTap) manualPaste(); });
}
function manualPaste(){
  var d = $('#ai-ans').closest('details'); if (d) d.open = true;
  $('#ai-ans').focus();
  toast('Przytrzymaj pole i wybierz Wklej');
}
$('#ai-paste').addEventListener('click', function(){ readClipboard(true); });
// Po powrocie z aplikacji AI: sprawdź schowek sam
function onReturn(){
  var w = store.get('aiWait', null);
  if (!w || Date.now() - w.at > 3600000 || document.visibilityState !== 'visible') return;
  setTimeout(function(){ if (document.hasFocus()) readClipboard(false); }, 350);
}
document.addEventListener('visibilitychange', onReturn);
window.addEventListener('focus', onReturn);

function insertCode(code){
  S.gEdited = true; S.gFileName = ''; $('#g-prog').value = code; setRange(0, 0); onProgChange(true);
  showTab('gcode'); window.scrollTo(0, 0);
  toast(/\?/.test(code) ? 'Wstawiono. Sprawdź znaki „?” — to miejsca nieczytelne' : 'Wstawiono do zakładki Program');
}

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


/* ===== Logowanie kontem Claude: strona otwarta w Claude pyta AI na koncie zalogowanej osoby ===== */
var CLAUDE_URL = 'https://claude.ai/artifact/YVM71eUHrsapEhqtbPeTW3';
AI.sample = null; AI.sampleImages = false; AI.chat = []; AI.busy = false; AI.ctrl = null;

function setAIMode(){
  var acc = !!AI.sample;
  $('#ai-askbox').hidden = !acc;
  $('#ai-sharebox').hidden = acc;
  $('#ai-claudecard').hidden = acc || !IS_PWA;
  $('#ai-openClaude').href = CLAUDE_URL;
  $('#ai-status').hidden = !acc;
  if (acc){
    $('#ai-lead').textContent = 'Claude odpowie tutaj, na Twoim koncie Claude. Przy pierwszym pytaniu Claude poprosi o zgodę.';
    $('#ai-status').innerHTML = '<div class="connrow"><span class="chip ok">Zalogowano</span><span class="connname">Twoje konto Claude</span></div>' +
      (AI.sampleImages ? '' : '<p class="fine">W tym widoku nie można wysyłać zdjęć — wpisz pytanie albo dołącz program z zakładki Program.</p>');
    $('#ai-photoBtns').hidden = !AI.sampleImages;
  } else {
    $('#ai-lead').textContent = 'Przygotuję zdjęcie i pytanie, a Ty wyślesz je do ChatGPT, Claude albo Gemini na swoim telefonie.';
    $('#ai-photoBtns').hidden = false;
  }
}
if (!IS_PWA && window.claude && typeof window.claude.use === 'function'){
  window.claude.use('sample').then(function(s){
    if (!s) return;
    AI.sample = s;
    return s.limits().then(function(l){ AI.sampleImages = !!(l && l.images); }, function(){});
  }, function(){}).then(setAIMode);
}

function md(src){
  var blocks = [];
  src = String(src).replace(/```[\w+-]*[ \t]*\n?([\s\S]*?)```/g, function(m, code){ blocks.push(code.replace(/\n$/, '')); return '\n\u0000' + (blocks.length - 1) + '\u0000\n'; });
  var open = src.indexOf('```');
  if (open >= 0){ blocks.push(src.slice(open + 3).replace(/^[\w+-]*[ \t]*\n?/, '')); src = src.slice(0, open) + '\n\u0000' + (blocks.length - 1) + '\u0000\n'; }
  function inl(s){ return s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }
  var out = '', list = null, para = [];
  function flushP(){ if (para.length){ out += '<p>' + para.map(inl).join('<br>') + '</p>'; para = []; } }
  function flushL(){ if (list){ out += '</' + list + '>'; list = null; } }
  esc(src).split('\n').forEach(function(line){
    var m;
    if ((m = line.match(/^\u0000(\d+)\u0000$/))){ flushP(); flushL(); out += '<pre class="aicode">' + esc(blocks[+m[1]]) + '</pre>'; return; }
    if (!line.trim()){ flushP(); flushL(); return; }
    if ((m = line.match(/^#{1,4}\s+(.*)$/))){ flushP(); flushL(); out += '<h4>' + inl(m[1]) + '</h4>'; return; }
    if ((m = line.match(/^\s*[-*•]\s+(.*)$/))){ flushP(); if (list !== 'ul'){ flushL(); out += '<ul>'; list = 'ul'; } out += '<li>' + inl(m[1]) + '</li>'; return; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))){ flushP(); if (list !== 'ol'){ flushL(); out += '<ol>'; list = 'ol'; } out += '<li>' + inl(m[1]) + '</li>'; return; }
    flushL(); para.push(line);
  });
  flushP(); flushL();
  return {html:out, blocks:blocks};
}

var chatQueued = false;
function drawChatSoon(){ if (chatQueued) return; chatQueued = true; requestAnimationFrame(function(){ chatQueued = false; drawChat(); }); }
function drawChat(){
  $('#ai-new').hidden = !AI.chat.length || AI.busy;
  $('#ai-ask').hidden = AI.busy; $('#ai-stop').hidden = !AI.busy;
  $('#ai-ask').lastChild.textContent = AI.chat.length ? 'Zapytaj ponownie' : 'Zapytaj Claude';
  $('#ai-chat').innerHTML = AI.chat.map(function(t, i){
    if (t.role === 'user'){
      return '<div class="msg u">' + (t.urls.length ? '<div class="uimgs">' + t.urls.map(function(u){ return '<img src="' + u + '" alt="Wysłane zdjęcie">'; }).join('') + '</div>' : '') + esc(t.show) + '</div>';
    }
    if (t.pending && !t.content) return '<div class="msg a"><span class="thinking" aria-label="Claude myśli"><i></i><i></i><i></i></span></div>';
    var r = md(t.content || '');
    return '<div class="msg a' + (t.error ? ' err' : '') + '">' + r.html + (t.error ? '<p class="errline">' + esc(t.error) + '</p>' : '') +
      (!t.pending && t.content ? '<div class="acts"><button type="button" class="btn" data-copy="' + i + '">Kopiuj</button>' +
        (r.blocks.length ? '<button type="button" class="btn primary" data-insert="' + i + '">Wstaw kod do Programu</button>' : '') + '</div>' : '') + '</div>';
  }).join('');
}
$('#ai-chat').addEventListener('click', function(e){
  var c = e.target.closest('[data-copy]'), ins = e.target.closest('[data-insert]');
  if (c) copyText(AI.chat[+c.getAttribute('data-copy')].content);
  if (ins){ var code = extractCode(AI.chat[+ins.getAttribute('data-insert')].content); if (code) insertCode(code); }
});

var SAMPLE_ERR = {
  not_granted:'Nie zezwolono na użycie Claude. Otwórz stronę ponownie i zezwól, gdy Claude zapyta.',
  sampling_disabled:'Claude nie jest dostępny na tym koncie.', rate_limited:'Osiągnięto limit użycia konta. Spróbuj później.',
  session_expired:'Zaloguj się ponownie do Claude.', image_rejected:'Zdjęcie odrzucone — za duże albo zły format. Spróbuj innego.',
  images_unavailable:'W tym widoku nie można wysyłać zdjęć.', refused:'Claude nie odpowie na to pytanie. Spróbuj inaczej.',
  prompt_too_large:'Za dużo tekstu naraz. Wyślij krótszy fragment programu.', empty_completion:'Brak odpowiedzi. Spróbuj inaczej sformułować pytanie.'
};
$('#ai-ask').addEventListener('click', function(){
  if (AI.busy || !AI.sample || !validateAI()) return;
  var q = $('#ai-q').value.trim() || 'Pomóż mi z tym, co jest na zdjęciu.';
  var full = (AI.chat.length ? '' : aiContext() + '\n\n') + q;
  if ($('#ai-incProg').checked && progText() && !$('#ai-progWrap').hidden) full += '\n\nProgram:\n```\n' + progText().slice(0, 60000) + '\n```';
  var photos = AI.sampleImages ? AI.photos.slice() : [];
  var history = AI.chat.filter(function(t){ return !(t.role === 'assistant' && (t.error || !t.content)); }).slice(-10)
    .map(function(t){ return {role:t.role, content:t.content}; });
  while (history.length && history[0].role !== 'user') history.shift();
  var userTurn = {role:'user', show:AI_ACTS[AI.act].label || q, content:full, urls:photos.map(function(p){ return p.url; })};
  if (AI.act === 'ask') userTurn.show = q;
  var ans = {role:'assistant', content:'', pending:true};
  AI.chat.push(userTurn, ans);
  AI.photos = []; renderAI();
  AI.busy = true; AI.ctrl = new AbortController(); drawChat();
  setTimeout(function(){ var m = $$('#ai-chat .msg'); if (m.length) m[m.length - 1].scrollIntoView({behavior:'smooth', block:'center'}); }, 60);
  var opts = {onText:function(u){ ans.content = u.text; drawChatSoon(); }, signal:AI.ctrl.signal, cache:false};
  if (photos.length) opts.images = photos.map(function(p){ return p.file; });
  AI.sample(history.concat([{role:'user', content:full}]), opts).then(function(r){ ans.content = r.text; }, function(e){
    if (e && e.text) ans.content = e.text;
    if (e && e.code === 'cancelled'){ if (!ans.content) ans.error = 'Zatrzymano.'; }
    else { if (e && e.code === 'refused') ans.content = ''; ans.error = (e && SAMPLE_ERR[e.code]) || 'Nie udało się połączyć z Claude. Spróbuj ponownie.'; }
  }).then(function(){ ans.pending = false; AI.busy = false; AI.ctrl = null; drawChat(); });
});
$('#ai-stop').addEventListener('click', function(){ if (AI.ctrl) AI.ctrl.abort(); });
$('#ai-new').addEventListener('click', function(){ AI.chat = []; drawChat(); setAct(AI.act); });

AI_ACTS.ocr.label = 'Odczytaj program ze zdjęcia'; AI_ACTS.check.label = 'Sprawdź program'; AI_ACTS.explain.label = 'Wyjaśnij program'; AI_ACTS.ask.label = '';
setAIMode();
setAct('ocr');
(function(){
  var saved = store.get('aiAnswer', null);
  if (saved && saved.t && Date.now() - saved.at < 12 * 3600000){ AI.answer = saved.t; }
  renderAnswer();
  // „Udostępnij → Korektor CNC” z aplikacji AI
  var p = new URLSearchParams(location.search);
  if (p.has('st')){
    var t = [p.get('title'), p.get('text'), p.get('url')].filter(function(x){ return x && x.trim(); }).join('\n\n');
    try { history.replaceState(null, '', location.pathname); } catch(e){}
    if (t){ showTab('ai'); setAnswer(t); }
  } else if (store.get('aiWait', null)){
    onReturn();
  }
})();
