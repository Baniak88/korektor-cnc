/* ===== Asystent AI ===== */
var PROVIDERS = {
  anthropic: {name:'Claude (Anthropic)', short:'Claude', model:'claude-sonnet-5-5', keyUrl:'https://console.anthropic.com/settings/keys', keyHint:'Klucz zaczyna się od sk-ant-',
    note:'Klucz API to osobna usługa od subskrypcji Claude. Płacisz za użycie na koncie API.'},
  openai: {name:'ChatGPT (OpenAI)', short:'ChatGPT', model:'gpt-6-sol', keyUrl:'https://platform.openai.com/api-keys', keyHint:'Klucz zaczyna się od sk-',
    note:'Klucz API to osobna usługa od subskrypcji ChatGPT. Płacisz za użycie na platform.openai.com.'},
  gemini: {name:'Gemini (Google)', short:'Gemini', model:'gemini-3.6-flash', keyUrl:'https://aistudio.google.com/apikey', keyHint:'Klucz z Google AI Studio',
    note:'Na darmowym planie Google może wykorzystywać przesłane dane do ulepszania usług. Nie wysyłaj wtedy programów klientów.'}
};

var AI = {
  cfg: store.get('ai', {prov:'anthropic', keys:{}, models:{}}),
  sample: null, sampleImages: false, checking: !IS_PWA,
  editing: false, testing: false, status: '',
  chat: [], pending: [], busy: false, ctrl: null,
  privOk: store.get('aiPriv', false), afterPriv: null
};
if (!AI.cfg.keys) AI.cfg.keys = {};
if (!AI.cfg.models) AI.cfg.models = {};
if (!PROVIDERS[AI.cfg.prov]) AI.cfg.prov = 'anthropic';
function saveCfg(){ store.set('ai', AI.cfg); }
function provKey(){ return (AI.cfg.keys[AI.cfg.prov] || '').trim(); }
function provModel(){ return (AI.cfg.models[AI.cfg.prov] || PROVIDERS[AI.cfg.prov].model).trim(); }
function aiMode(){ if (AI.sample) return 'account'; if (IS_PWA) return 'key'; return 'none'; }
function aiReady(){ var m = aiMode(); return m === 'account' || (m === 'key' && !!provKey()); }
function aiCanImages(){ return aiMode() === 'key' || (aiMode() === 'account' && AI.sampleImages); }

/* Połączenie z kontem Claude, gdy strona jest otwarta w Claude */
if (!IS_PWA && window.claude && typeof window.claude.use === 'function'){
  window.claude.use('sample').then(function(s){
    AI.sample = s || null; AI.checking = false;
    if (s && s.limits) return s.limits().then(function(l){ AI.sampleImages = !!(l && l.images); }, function(){});
  }, function(){ AI.checking = false; }).then(function(){ renderConn(); renderComposer(); });
} else AI.checking = false;

/* ----- Karta połączenia ----- */
function renderConn(){
  var box = $('#ai-conn'), m = aiMode(), P = PROVIDERS[AI.cfg.prov], h;
  if (AI.checking){ box.innerHTML = '<p class="empty">Łączenie z Claude…</p>'; return; }
  if (m === 'account'){
    h = '<div class="connrow"><span class="chip ok">Połączono</span><span class="connname">Claude z Twojego konta</span></div>' +
      '<p class="fine">Każdy, kto otworzy tę stronę w Claude, używa własnego konta i własnego limitu. Przy pierwszym pytaniu Claude poprosi o zgodę.' +
      (AI.sampleImages ? '' : ' Zdjęcia nie są dostępne w tym widoku.') + '</p>' +
      '<p class="fine">Własny klucz ChatGPT, Gemini lub Claude API wpiszesz w zainstalowanej aplikacji.</p>';
  } else if (m === 'none'){
    h = '<p class="empty">Asystent działa w zainstalowanej aplikacji (z własnym kluczem AI) albo na stronie otwartej w Claude po zalogowaniu.</p>';
  } else if (provKey() && !AI.editing){
    h = '<div class="connrow"><span class="chip ' + (AI.cfg.ok && AI.cfg.ok[AI.cfg.prov] ? 'ok">Połączono' : 'neutral">Klucz zapisany') + '</span>' +
      '<span class="connname">' + esc(P.name) + ' · <span class="mono">' + esc(provModel()) + '</span></span>' +
      '<button type="button" class="btn ghost" id="ai-edit">Zmień</button></div>';
  } else {
    h = '<div class="ghead"><span class="lab">Połącz swoje AI</span>' + (provKey() ? '<button type="button" class="btn ghost" id="ai-cancel">Anuluj</button>' : '') + '</div>' +
      '<div class="seg" id="ai-prov">' + Object.keys(PROVIDERS).map(function(k){
        return '<button type="button" data-p="' + k + '" aria-pressed="' + (k === AI.cfg.prov) + '">' + PROVIDERS[k].short + '</button>'; }).join('') + '</div>' +
      '<ol class="steps">' +
      '<li>Załóż klucz API: <a href="' + P.keyUrl + '" target="_blank" rel="noopener">' + esc(P.keyUrl.replace('https://', '')) + '</a></li>' +
      '<li>Skopiuj go i wklej poniżej. ' + esc(P.keyHint) + '.</li>' +
      '<li>Naciśnij „Zapisz i sprawdź”.</li></ol>' +
      '<p class="fine">' + esc(P.note) + '</p>' +
      '<div class="field"><label class="lab" for="ai-key">Klucz API</label>' +
      '<div class="num"><input id="ai-key" class="txt" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="wklej klucz" value="' + esc(AI.cfg.keys[AI.cfg.prov] || '') + '">' +
      '<button type="button" class="pm" id="ai-show" aria-label="Pokaż klucz" style="font-size:13px;width:64px">Pokaż</button></div>' +
      '<span class="hint">Klucz zostaje tylko na tym telefonie i idzie wyłącznie do ' + esc(P.short) + '.</span></div>' +
      '<details class="more"><summary>Model (zaawansowane)</summary><div class="field" style="padding-top:8px"><label class="lab" for="ai-model">Nazwa modelu</label>' +
      '<div class="num"><input id="ai-model" class="txt" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(provModel()) + '"></div>' +
      '<span class="hint">Domyślnie ' + esc(P.model) + '. Zmień, jeśli dostawca wprowadzi nowszy model.</span></div></details>' +
      '<div class="row"><button type="button" class="btn primary" id="ai-save"' + (AI.testing ? ' disabled' : '') + '>' + (AI.testing ? 'Sprawdzam…' : 'Zapisz i sprawdź') + '</button>' +
      (provKey() ? '<button type="button" class="btn danger" id="ai-del">Usuń klucz</button>' : '') + '</div>' +
      (AI.status ? '<p class="fine" id="ai-status">' + AI.status + '</p>' : '');
  }
  box.innerHTML = h;
}
$('#ai-conn').addEventListener('click', function(e){
  var t = e.target;
  var p = t.closest('[data-p]');
  if (p){ keepDraft(); AI.cfg.prov = p.getAttribute('data-p'); AI.status = ''; saveCfg(); renderConn(); renderComposer(); return; }
  if (t.id === 'ai-edit'){ AI.editing = true; AI.status = ''; renderConn(); return; }
  if (t.id === 'ai-cancel'){ AI.editing = false; AI.status = ''; renderConn(); return; }
  if (t.id === 'ai-show'){ var k = $('#ai-key'); k.type = k.type === 'password' ? 'text' : 'password'; t.textContent = k.type === 'password' ? 'Pokaż' : 'Ukryj'; return; }
  if (t.id === 'ai-del'){ delete AI.cfg.keys[AI.cfg.prov]; if (AI.cfg.ok) delete AI.cfg.ok[AI.cfg.prov]; saveCfg(); AI.editing = false; AI.status = ''; renderConn(); renderComposer(); toast('Klucz usunięty z telefonu'); return; }
  if (t.id === 'ai-save') testConnection();
});
function keepDraft(){
  var k = $('#ai-key'), m = $('#ai-model');
  if (k && k.value.trim()) AI.cfg.keys[AI.cfg.prov] = k.value.trim();
  if (m){ var v = m.value.trim(); if (v && v !== PROVIDERS[AI.cfg.prov].model) AI.cfg.models[AI.cfg.prov] = v; else delete AI.cfg.models[AI.cfg.prov]; }
}
function testConnection(){
  keepDraft();
  if (!provKey()){ AI.status = 'Wklej klucz API.'; renderConn(); return; }
  saveCfg(); AI.testing = true; AI.status = ''; renderConn();
  callProvider([{role:'user', content:'Odpowiedz jednym słowem: OK', images:[]}], 'Test połączenia.', function(){}, new AbortController().signal)
    .then(function(){
      AI.cfg.ok = AI.cfg.ok || {}; AI.cfg.ok[AI.cfg.prov] = true; saveCfg();
      AI.testing = false; AI.editing = false; AI.status = ''; renderConn(); renderComposer(); toast('Połączono z ' + PROVIDERS[AI.cfg.prov].short);
    }, function(err){
      AI.cfg.ok = AI.cfg.ok || {}; AI.cfg.ok[AI.cfg.prov] = false; saveCfg();
      AI.testing = false; AI.status = '<span style="color:var(--bad)">' + esc(err.message || 'Nie udało się połączyć.') + '</span> Klucz zapisany — możesz poprawić i spróbować ponownie.'; renderConn();
    });
}

/* ----- Wywołania dostawców ----- */
function aiError(msg){ var e = new Error(msg); e.aiError = true; return e; }
function httpError(res, body){
  var msg = '';
  try { var j = JSON.parse(body); msg = (j.error && (j.error.message || j.error.type)) || j.message || ''; } catch(e){ msg = body.slice(0, 200); }
  var s = res.status;
  if (s === 401 || s === 403) return aiError('Klucz API jest nieprawidłowy albo nie ma uprawnień. ' + msg);
  if (s === 404) return aiError('Nie ma modelu „' + provModel() + '” albo klucz nie ma do niego dostępu. Sprawdź nazwę modelu. ' + msg);
  if (s === 429) return aiError('Limit zapytań albo brak środków na koncie API. Spróbuj za chwilę lub doładuj konto. ' + msg);
  if (s === 400 || s === 413) return aiError('Dostawca odrzucił zapytanie: ' + msg);
  if (s >= 500) return aiError('Serwer dostawcy ma problem (' + s + '). Spróbuj za chwilę.');
  return aiError('Błąd ' + s + ': ' + msg);
}
function readSSE(res, onData){
  var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
  function pump(){
    return reader.read().then(function(r){
      if (r.done) return;
      buf += dec.decode(r.value, {stream:true});
      var i;
      while ((i = buf.indexOf('\n')) >= 0){
        var line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1);
        if (line.indexOf('data:') !== 0) continue;
        var d = line.slice(5).trim();
        if (!d || d === '[DONE]') continue;
        var obj; try { obj = JSON.parse(d); } catch(e){ continue; }
        onData(obj);
      }
      return pump();
    });
  }
  return pump();
}
function netCatch(e){
  if (e && e.name === 'AbortError') throw e;
  if (e && e.aiError) throw e;
  throw aiError('Brak połączenia z internetem albo dostawca zablokował połączenie.');
}

/* turns: [{role:'user'|'assistant', content, images:[{mime,b64,blob}]}] — obrazy tylko w ostatniej wiadomości użytkownika */
function callProvider(turns, sys, onText, signal){
  var prov = AI.cfg.prov, key = provKey(), model = provModel(), text = '';
  function add(t){ if (t){ text += t; onText(text); } }
  var req;
  if (prov === 'anthropic'){
    req = fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', signal:signal,
      headers:{'content-type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'},
      body: JSON.stringify({model:model, max_tokens:8000, stream:true, system:sys, messages: turns.map(function(t){
        if (t.role !== 'user') return {role:'assistant', content:t.content};
        return {role:'user', content: t.images.map(function(im){ return {type:'image', source:{type:'base64', media_type:im.mime, data:im.b64}}; }).concat([{type:'text', text:t.content}])};
      })})
    });
    return req.then(function(res){
      if (!res.ok) return res.text().then(function(b){ throw httpError(res, b); });
      return readSSE(res, function(d){
        if (d.type === 'content_block_delta' && d.delta && d.delta.type === 'text_delta') add(d.delta.text);
        else if (d.type === 'error') throw aiError('Błąd Claude: ' + ((d.error && d.error.message) || ''));
      });
    }).then(function(){ return text; }, netCatch);
  }
  if (prov === 'openai'){
    req = fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST', signal:signal,
      headers:{'content-type':'application/json', 'authorization':'Bearer ' + key},
      body: JSON.stringify({model:model, stream:true, messages: [{role:'system', content:sys}].concat(turns.map(function(t){
        if (t.role !== 'user' || !t.images.length) return {role:t.role, content:t.content};
        return {role:'user', content:[{type:'text', text:t.content}].concat(t.images.map(function(im){ return {type:'image_url', image_url:{url:'data:' + im.mime + ';base64,' + im.b64}}; }))};
      }))})
    });
    return req.then(function(res){
      if (!res.ok) return res.text().then(function(b){ throw httpError(res, b); });
      return readSSE(res, function(d){
        if (d.error) throw aiError('Błąd OpenAI: ' + (d.error.message || ''));
        var c = d.choices && d.choices[0] && d.choices[0].delta; if (c && c.content) add(c.content);
      });
    }).then(function(){ return text; }, netCatch);
  }
  req = fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(key), {
    method:'POST', signal:signal, headers:{'content-type':'application/json'},
    body: JSON.stringify({systemInstruction:{parts:[{text:sys}]}, contents: turns.map(function(t){
      return {role: t.role === 'user' ? 'user' : 'model', parts: (t.images || []).map(function(im){ return {inline_data:{mime_type:im.mime, data:im.b64}}; }).concat([{text:t.content}])};
    })})
  });
  return req.then(function(res){
    if (!res.ok) return res.text().then(function(b){ throw httpError(res, b); });
    return readSSE(res, function(d){
      if (d.error) throw aiError('Błąd Gemini: ' + (d.error.message || ''));
      var parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
      (parts || []).forEach(function(p){ if (p.text && !p.thought) add(p.text); });
    });
  }).then(function(){ if (!text) throw aiError('Gemini nie zwrócił odpowiedzi (mogła zostać zablokowana).'); return text; }, netCatch);
}

var SAMPLE_ERR = {
  not_granted:'Nie zezwolono tej stronie na używanie Claude. Otwórz stronę ponownie, aby wyrazić zgodę.',
  sampling_disabled:'Claude nie jest dostępny na tym koncie.', rate_limited:'Osiągnięto limit użycia. Spróbuj później.',
  session_expired:'Zaloguj się ponownie do Claude.', image_rejected:'Zdjęcie odrzucone — za duże lub zły format. Spróbuj innego.',
  images_unavailable:'W tym widoku nie można wysyłać zdjęć.', refused:'Claude odmówił odpowiedzi na to pytanie.',
  prompt_too_large:'Za dużo tekstu naraz. Wyślij krótszy fragment programu.', empty_completion:'Brak odpowiedzi. Spróbuj inaczej sformułować pytanie.'
};
function callAccount(turns, sys, onText, signal){
  var input = [{role:'user', content:sys}].concat(turns.map(function(t){ return {role:t.role, content:t.content}; }));
  var last = turns[turns.length - 1];
  var opts = {onText:function(u){ onText(u.text); }, signal:signal, cache:false};
  if (last.images.length) opts.images = last.images.map(function(im){ return im.blob; });
  return AI.sample(input, opts).then(function(r){ return r.text; }, function(e){
    if (e && e.code === 'cancelled'){ var a = new Error('cancelled'); a.name = 'AbortError'; a.partial = e.text; throw a; }
    var err = aiError((e && SAMPLE_ERR[e.code]) || 'Nie udało się połączyć z Claude. Spróbuj ponownie.'); err.partial = e && e.text; throw err;
  });
}

/* ----- Kontekst i polecenia ----- */
function sysPrompt(){
  var m = MACHINES[S.machine], c = ctl();
  return 'Jesteś doświadczonym technologiem CNC i operatorem frezarek. Pomagasz operatorowi przy maszynie ' + m.name + ' (' + m.type + '), sterowanie: ' + ctlName(S.machine) + '.\n' +
    'Dane maszyny: ' + m.specs.map(function(s){ return s[0] + ': ' + s[1]; }).join('; ') + '.\n' +
    'Zasady:\n- Odpowiadaj po polsku, krótko i konkretnie, prostym językiem warsztatowym. Skróty i pojęcia (np. TCP, G41) wyjaśniaj przy pierwszym użyciu.\n' +
    '- Kod podawaj w składni ' + (c === 'fanuc' ? 'Fanuc' : 'Siemens Sinumerik') + ', w blokach ```.\n' +
    '- Gdy coś zależy od parametrów maszyny, makr producenta lub dokumentacji, powiedz to wprost zamiast zgadywać.\n' +
    '- Nigdy nie zapewniaj, że program jest bezpieczny. Przy zmianach w programie przypominaj o symulacji lub przejeździe na sucho z ograniczonym posuwem.\n' +
    '- Korekty z pomiaru podawaj jako zmianę zużycia narzędzia (' + (c === 'fanuc' ? 'Fanuc: kolumna ZUŻYCIE D lub H' : 'Sinumerik: ΔR lub ΔL dla ostrza D') + ').\n' +
    '- Jeśli zdjęcie jest nieczytelne, napisz, które fragmenty są niepewne.';
}
function progText(){ return $('#g-prog').value.trim(); }
function progBlock(){
  var t = progText(); if (!t) return '';
  var cut = t.length > 40000;
  return '\n\nProgram (' + (ctl() === 'fanuc' ? 'Fanuc' : 'Sinumerik') + (cut ? ', obcięty do 40 000 znaków' : '') + '):\n```\n' + (cut ? t.slice(0, 40000) : t) + '\n```';
}
var ACTIONS = {
  ocr: {label:'Odczytaj program ze zdjęcia', needs:'img', prog:false,
    prompt:function(){ return 'Na zdjęciach jest program CNC (' + (ctl() === 'fanuc' ? 'Fanuc' : 'Sinumerik') + ') z ekranu sterowania albo z wydruku. Przepisz go dokładnie, znak po znaku, w JEDNYM bloku ```gcode. Zasady: nie poprawiaj błędów, nic nie dopisuj, zachowaj kolejność linii i numery N. Znaki, których nie da się pewnie odczytać, zastąp znakiem ?. Jeśli zdjęć jest kilka, połącz je po kolei i nie powtarzaj linii, które się nakładają. Po bloku napisz „Niepewne:” i wypisz linie do sprawdzenia albo „brak”.'; }},
  check: {label:'Sprawdź program', needs:'prog', prog:true,
    prompt:function(){ return 'Sprawdź ten program CNC przed uruchomieniem na tej maszynie. Szukaj: błędów składni; brakującej lub złej korekcji długości i promienia (' + (ctl() === 'fanuc' ? 'G43 H, D, G41/G42, G40' : 'T, D, G41/G42, G40') + '); ruchów G0 w dół do materiału; G90/G91; brakującego F lub S; cykli bez zakończenia; zmian narzędzi; końca programu. Odpowiedz listą „Linia N — problem — co zrobić”: najpierw rzeczy groźne (kolizja, złom), potem drobne. Na końcu podaj 3 rzeczy do sprawdzenia na maszynie. Jeśli nic nie znajdziesz, napisz to, ale nie twierdź, że program jest bezpieczny.'; }},
  explain: {label:'Wyjaśnij program', needs:'prog', prog:true,
    prompt:function(){ return 'Wyjaśnij prostym językiem, co robi ten program, krok po kroku: jakie narzędzia, jakie operacje, głębokości, kontury i cykle. Krótko.'; }},
  korekta: {label:'Wyjaśnij moją korektę', needs:'kor', prog:false,
    prompt:function(){
      var r = lastK, tool = $('#k-tool').value.trim();
      return 'Policzyłem korektę z pomiaru. Rodzaj wymiaru: ' + KINDS[S.kind].label + ' (' + KINDS[S.kind].sub + '). Nominał ' + $('#k-nom').value + ', odchyłki ' + ($('#k-up').value || '0') + ' / ' + ($('#k-lo').value || '0') +
        ', cel ' + (+r.target.toFixed(4)) + ', pomiar ' + $('#k-meas').value + '. Wynik: zmiana zużycia ' + (r.ax === 'R' ? 'promienia' : 'długości') + ' o ' + f3(r.delta, true) + ' mm' + (tool ? ' dla ' + tool : '') +
        (r.newWear != null ? ', nowa wartość ' + f3(r.newWear) : '') + '. Wyjaśnij krótko, skąd taka korekta, i na co uważać przy jej wpisywaniu na tym sterowaniu.';
    }}
};

/* ----- Zdjęcia ----- */
function prepImage(file){
  return new Promise(function(resolve, reject){
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function(){
      var max = 1600, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function(b){
        if (!b) return reject(new Error('Nie udało się przygotować zdjęcia'));
        var fr = new FileReader();
        fr.onload = function(){ resolve({blob:b, mime:'image/jpeg', b64:String(fr.result).split(',')[1], url:URL.createObjectURL(b)}); };
        fr.onerror = function(){ reject(new Error('Nie udało się odczytać zdjęcia')); };
        fr.readAsDataURL(b);
      }, 'image/jpeg', 0.88);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error('To nie jest obsługiwane zdjęcie')); };
    img.src = url;
  });
}
var pendingAction = null;
function addFiles(files){
  var list = Array.prototype.slice.call(files || []).filter(function(f){ return /^image\//.test(f.type); });
  if (!list.length) return;
  var room = 4 - AI.pending.length;
  if (room <= 0){ toast('Maksymalnie 4 zdjęcia naraz'); return; }
  if (list.length > room) toast('Dodano tylko ' + room + ' (maks. 4)');
  Promise.all(list.slice(0, room).map(prepImage)).then(function(imgs){
    AI.pending = AI.pending.concat(imgs); renderComposer();
    if (pendingAction === 'ocr'){ pendingAction = null; runAction('ocr'); }
  }, function(e){ toast(e.message || 'Błąd zdjęcia'); pendingAction = null; });
}
['#ai-cam', '#ai-gal'].forEach(function(id){ $(id).addEventListener('change', function(){ addFiles(this.files); this.value = ''; }); });
$('#ai-thumbs').addEventListener('click', function(e){
  var b = e.target.closest('[data-rm]'); if (!b) return;
  var i = Number(b.getAttribute('data-rm')); var im = AI.pending[i];
  if (im) try { URL.revokeObjectURL(im.url); } catch(_){}
  AI.pending.splice(i, 1); renderComposer();
});

/* ----- Rozmowa ----- */
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
var renderQueued = false;
function renderChat(){
  if (renderQueued) return; renderQueued = true;
  requestAnimationFrame(function(){ renderQueued = false; drawChat(); });
}
function drawChat(){
  var box = $('#ai-chat');
  if (!AI.chat.length){ box.innerHTML = ''; $('#ai-new').hidden = true; return; }
  $('#ai-new').hidden = AI.busy;
  box.innerHTML = AI.chat.map(function(t, i){
    if (t.role === 'user'){
      return '<div class="msg u">' + (t.images.length ? '<div class="uimgs">' + t.images.map(function(im){ return '<img src="' + im.url + '" alt="Załączone zdjęcie">'; }).join('') + '</div>' : '') +
        esc(t.show) + (t.withProg ? '<span class="att">+ program z zakładki Program</span>' : '') + '</div>';
    }
    if (t.pending && !t.content) return '<div class="msg a"><span class="thinking" aria-label="Asystent myśli"><i></i><i></i><i></i></span></div>';
    var r = md(t.content || '');
    return '<div class="msg a' + (t.error ? ' err' : '') + '">' + r.html +
      (t.error ? '<p class="errline">' + esc(t.error) + '</p>' : '') +
      (!t.pending && t.content ? '<div class="acts"><button type="button" class="btn" data-copy="' + i + '">Kopiuj</button>' +
        (r.blocks.length ? '<button type="button" class="btn primary" data-insert="' + i + '">Wstaw kod do zakładki Program</button>' : '') + '</div>' : '') +
      '</div>';
  }).join('');
}
$('#ai-chat').addEventListener('click', function(e){
  var c = e.target.closest('[data-copy]'), ins = e.target.closest('[data-insert]');
  if (c){ copyText(AI.chat[+c.getAttribute('data-copy')].content); return; }
  if (ins){
    var r = md(AI.chat[+ins.getAttribute('data-insert')].content);
    var code = r.blocks.sort(function(a, b){ return b.length - a.length; })[0];
    S.gEdited = true; S.gFileName = ''; $('#g-prog').value = code; setRange(0, 0); onProgChange(true);
    showTab('gcode'); window.scrollTo(0, 0); toast('Wstawiono do zakładki Program — sprawdź znaki „?”');
  }
});

function renderComposer(){
  var ready = aiReady();
  $('#ai-work').hidden = aiMode() === 'none';
  $('#ai-thumbs').innerHTML = AI.pending.map(function(im, i){
    return '<div class="thumb"><img src="' + im.url + '" alt="Zdjęcie ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="Usuń zdjęcie">×</button></div>';
  }).join('');
  var canImg = aiCanImages();
  $('#ai-photos').hidden = !canImg;
  $$('[data-act="ocr"]').forEach(function(b){ b.hidden = !canImg; });
  var n = progText() ? progText().split(/\r?\n/).length : 0;
  $('#ai-progWrap').hidden = !n;
  if (!AI.progTouched) $('#ai-incProg').checked = !!S.gEdited;
  $('#ai-progInfo').textContent = n ? '(' + n + ' ' + plLines(n) + (S.gEdited ? '' : ', przykład') + ')' : '';
  $('#ai-send').disabled = AI.busy;
  $('#ai-send').hidden = AI.busy;
  $('#ai-stop').hidden = !AI.busy;
  $('#ai-hint').hidden = ready;
  $$('#ai-acts button').forEach(function(b){ b.disabled = AI.busy; });
}

function lastUserTurns(){
  // ostatnie wiadomości; nieudane odpowiedzi pomijane; zdjęcia tylko w ostatniej wiadomości
  var t = AI.chat.filter(function(x){ return !(x.role === 'assistant' && (x.error || !x.content)); }).slice(-12);
  var out = [];
  t.forEach(function(x, i){
    var isLast = i === t.length - 1;
    var content = x.content + (x.role === 'user' && !isLast && x.images.length ? '\n[Wcześniej załączono ' + x.images.length + ' zdj.]' : '');
    var prev = out[out.length - 1];
    if (prev && prev.role === x.role){ prev.content += '\n\n' + content; if (isLast) prev.images = x.images; }
    else out.push({role:x.role, content:content, images: isLast ? x.images : []});
  });
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

function send(show, content, withProg){
  if (AI.busy) return;
  if (!aiReady()){ toast('Najpierw połącz AI'); $('#ai-conn').scrollIntoView({behavior:'smooth', block:'start'}); return; }
  if (!AI.privOk){
    AI.afterPriv = function(){ send(show, content, withProg); };
    $('#ai-privacy').hidden = false; $('#ai-privacy').scrollIntoView({behavior:'smooth', block:'center'}); return;
  }
  var imgs = AI.pending.slice();
  if (imgs.length && !aiCanImages()){ toast('Tu nie można wysłać zdjęć'); return; }
  AI.pending = [];
  AI.chat.push({role:'user', show:show, content:content + (withProg ? progBlock() : ''), images:imgs, withProg:withProg});
  var ans = {role:'assistant', content:'', pending:true};
  AI.chat.push(ans);
  AI.busy = true; AI.ctrl = new AbortController();
  $('#ai-q').value = '';
  renderComposer(); drawChat();
  setTimeout(function(){ var m = $$('#ai-chat .msg'); if (m.length) m[m.length - 1].scrollIntoView({behavior:'smooth', block:'center'}); }, 50);
  var fn = aiMode() === 'account' ? callAccount : callProvider;
  fn(lastUserTurns(), sysPrompt(), function(text){ ans.content = text; renderChat(); }, AI.ctrl.signal)
    .then(function(text){ ans.content = text || ans.content; }, function(e){
      if (e && e.partial) ans.content = e.partial;
      if (e && e.name === 'AbortError'){ if (!ans.content) ans.error = 'Zatrzymano.'; else ans.content += '\n\n_(zatrzymano)_'; }
      else ans.error = (e && e.message) || 'Coś poszło nie tak.';
    })
    .then(function(){ ans.pending = false; AI.busy = false; AI.ctrl = null; drawChat(); renderComposer(); });
}

function runAction(id){
  var A = ACTIONS[id];
  if (!aiReady()){ toast('Najpierw połącz AI'); $('#ai-conn').scrollIntoView({behavior:'smooth', block:'start'}); return; }
  if (A.needs === 'img' && !AI.pending.length){ pendingAction = 'ocr'; $('#ai-cam').click(); return; }
  if (A.needs === 'prog' && !progText() && !AI.pending.length){ toast('Wklej program w zakładce Program albo dodaj zdjęcie'); return; }
  if (A.needs === 'kor' && !lastK){ toast('Najpierw policz korektę w zakładce Korekcja'); return; }
  var withProg = A.prog && !!progText() && !AI.pending.length;
  send(A.label + (AI.pending.length ? ' (' + AI.pending.length + ' zdj.)' : ''), A.prompt(), withProg);
}
$('#ai-acts').addEventListener('click', function(e){ var b = e.target.closest('[data-act]'); if (b) runAction(b.getAttribute('data-act')); });
$('#ai-send').addEventListener('click', function(){
  var q = $('#ai-q').value.trim();
  if (!q && !AI.pending.length){ toast('Wpisz pytanie albo dodaj zdjęcie'); $('#ai-q').focus(); return; }
  send(q || 'Co widać na zdjęciu?', q || 'Opisz, co jest na zdjęciu, i pomóż z tym, co widać (program, alarm, rysunek lub detal).', $('#ai-incProg').checked && !!progText());
});
$('#ai-stop').addEventListener('click', function(){ if (AI.ctrl) AI.ctrl.abort(); });
$('#ai-new').addEventListener('click', function(){ AI.chat = []; drawChat(); renderComposer(); });
$('#ai-privOk').addEventListener('click', function(){
  AI.privOk = true; store.set('aiPriv', true); $('#ai-privacy').hidden = true;
  var f = AI.afterPriv; AI.afterPriv = null; if (f) f();
});

/* Wejścia z innych zakładek */
function goAI(){ showTab('ai'); window.scrollTo(0, 0); renderComposer(); }
$$('.tab[data-tab=ai]').forEach(function(b){ b.addEventListener('click', renderComposer); });
$('#ai-incProg').addEventListener('change', function(){ AI.progTouched = true; });
document.addEventListener('click', function(e){
  var a = e.target.closest('[data-askalarm]');
  if (a){
    var code = a.getAttribute('data-askalarm'), list = ALARMS[S.alarmCtl] || [], row = null;
    list.forEach(function(x){ if (x[0] === code) row = x; });
    goAI();
    $('#ai-q').value = 'Mam alarm ' + code + (row ? ' (' + row[1] + ')' : '') + ' na ' + MACHINES[S.machine].name + '. Co mogło go spowodować i co sprawdzić krok po kroku? Szczegóły: ';
    $('#ai-q').focus();
    return;
  }
  var g = e.target.closest('[data-aiact]');
  if (g){ goAI(); runAction(g.getAttribute('data-aiact')); }
});

if (AI.privOk) $('#ai-privacy').hidden = true;
renderConn(); renderComposer(); drawChat();
