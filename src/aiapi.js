/* ===== AI przez własny klucz API (Claude, ChatGPT, Gemini) =====
   Każdy operator wpisuje swój klucz. Klucz zostaje tylko w tym telefonie (localStorage),
   zapytania idą prosto z telefonu do dostawcy AI — bez naszego serwera. */

var PROV = {
  claude: {name:'Claude', firm:'Anthropic', def:'claude-sonnet-5-5', hint:'sk-ant-…', keyUrl:'https://console.anthropic.com/settings/keys',
    how:['Zaloguj się na console.anthropic.com (to inne konto niż czat Claude — płacisz za użycie API).', 'Settings → Billing: doładuj konto i ustaw limit miesięczny.', 'Settings → API Keys → Create Key. Skopiuj klucz (zaczyna się od sk-ant-).']},
  openai: {name:'ChatGPT', firm:'OpenAI', def:'gpt-5.4-mini', hint:'sk-…', keyUrl:'https://platform.openai.com/api-keys',
    how:['Zaloguj się na platform.openai.com (abonament ChatGPT Plus nie obejmuje API — płacisz osobno za użycie).', 'Settings → Billing: doładuj konto i ustaw limit.', 'API keys → Create new secret key. Skopiuj klucz (zaczyna się od sk-).']},
  gemini: {name:'Gemini', firm:'Google', def:'gemini-2.5-flash', hint:'AIza…', keyUrl:'https://aistudio.google.com/apikey',
    how:['Wejdź na aistudio.google.com i zaloguj się kontem Google.', 'Get API key → Create API key. Skopiuj klucz (zaczyna się od AIza).', 'Darmowy limit jest mały; przy większym użyciu włącz płatności w Google Cloud.']}
};
var APIS = store.get('api', {prov:'claude', keys:{}, model:{}, models:{}});
if (!APIS.keys) APIS.keys = {};
if (!APIS.model) APIS.model = {};
if (!APIS.models) APIS.models = {};
function apiSave(){ store.set('api', APIS); }
function apiReady(){ return IS_PWA && !!APIS.keys[APIS.prov]; }
function apiName(){ return PROV[APIS.prov].name; }
function apiModel(){ return APIS.model[APIS.prov] || PROV[APIS.prov].def; }

/* ----- Pliki: zdjęcia zmniejszane do ~2000 px (szybciej i taniej), PDF bez zmian ----- */
function fileToB64(file){
  return new Promise(function(res, rej){
    var r = new FileReader();
    r.onload = function(){ res(String(r.result).split(',')[1] || ''); };
    r.onerror = function(){ rej(new Error('read')); };
    r.readAsDataURL(file);
  });
}
function imageToB64(file, max){
  max = max || 2000;
  return new Promise(function(res){
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function(){
      var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      if (k >= 1 && file.size < 3.5e6 && /jpe?g|png|webp/.test(file.type)){ URL.revokeObjectURL(url); fileToB64(file).then(function(b){ res({mime:file.type, b64:b}); }); return; }
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      var g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res({mime:'image/jpeg', b64:c.toDataURL('image/jpeg', 0.88).split(',')[1]});
    };
    img.onerror = function(){ URL.revokeObjectURL(url); fileToB64(file).then(function(b){ res({mime:file.type || 'image/jpeg', b64:b}); }); };
    img.src = url;
  });
}
function prepFiles(files){
  return Promise.all((files || []).map(function(f, i){
    if (f.type === 'application/pdf') return fileToB64(f).then(function(b){ return {mime:'application/pdf', b64:b, name:f.name || ('rysunek-' + (i + 1) + '.pdf')}; });
    return imageToB64(f).then(function(o){ o.name = 'zdjecie-' + (i + 1) + '.jpg'; return o; });
  }));
}

/* ----- Wywołanie API. turns: [{role:'user'|'assistant', text, files:[{mime,b64,name}]}] ----- */
function apiErr(status, msg){
  var t;
  if (status === 401 || status === 403) t = 'Klucz nieprawidłowy albo bez uprawnień. Sprawdź go w ustawieniach AI.';
  else if (status === 429) t = 'Limit zapytań albo brak środków na koncie API. Sprawdź limit i płatności u dostawcy.';
  else if (status === 404) t = 'Ten model jest niedostępny. Wybierz inny model w ustawieniach AI.';
  else if (status === 413) t = 'Za duży plik. Zrób zdjęcie z mniejszą rozdzielczością albo wyślij mniej stron.';
  else if (status >= 500) t = 'Serwer AI jest przeciążony. Spróbuj za chwilę.';
  else if (status === 0) t = 'Brak połączenia z internetem.';
  else t = 'Błąd AI (' + status + ').';
  var e = new Error(t + (msg && status !== 0 ? ' ' + String(msg).slice(0, 200) : '')); e.status = status; e.short = t; return e;
}
function apiFetch(url, opt){
  return fetch(url, opt).then(function(r){
    return r.text().then(function(t){
      var j = null; try { j = JSON.parse(t); } catch(_){}
      if (!r.ok) throw apiErr(r.status, j && j.error ? (j.error.message || j.error.type || '') : '');
      return j || {};
    });
  }, function(e){ if (e && e.name === 'AbortError') throw e; throw apiErr(0); });
}
function apiCall(o){
  var prov = o.prov || APIS.prov, key = o.key || APIS.keys[prov], model = o.model || APIS.model[prov] || PROV[prov].def;
  if (!key) return Promise.reject(apiErr(401));
  var turns = o.turns || [], sys = o.system || '';
  if (prov === 'claude'){
    return apiFetch('https://api.anthropic.com/v1/messages', {method:'POST', signal:o.signal,
      headers:{'content-type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:model, max_tokens:o.maxTokens || 8000, system:sys || undefined, messages:turns.map(function(t){
        var c = (t.files || []).map(function(f){ return f.mime === 'application/pdf' ? {type:'document', source:{type:'base64', media_type:f.mime, data:f.b64}} : {type:'image', source:{type:'base64', media_type:f.mime, data:f.b64}}; });
        c.push({type:'text', text:t.text || '.'});
        return {role:t.role === 'assistant' ? 'assistant' : 'user', content:c};
      })})
    }).then(function(j){ return (j.content || []).filter(function(c){ return c.type === 'text'; }).map(function(c){ return c.text; }).join('\n').trim(); });
  }
  if (prov === 'openai'){
    var msgs = sys ? [{role:'system', content:sys}] : [];
    turns.forEach(function(t){
      if (t.role === 'assistant'){ msgs.push({role:'assistant', content:t.text}); return; }
      var c = [{type:'text', text:t.text || '.'}];
      (t.files || []).forEach(function(f){
        if (f.mime === 'application/pdf') c.push({type:'file', file:{filename:f.name || 'rysunek.pdf', file_data:'data:application/pdf;base64,' + f.b64}});
        else c.push({type:'image_url', image_url:{url:'data:' + f.mime + ';base64,' + f.b64, detail:'high'}});
      });
      msgs.push({role:'user', content:c});
    });
    return apiFetch('https://api.openai.com/v1/chat/completions', {method:'POST', signal:o.signal,
      headers:{'content-type':'application/json', 'authorization':'Bearer ' + key},
      body:JSON.stringify({model:model, messages:msgs})
    }).then(function(j){ var m = j.choices && j.choices[0] && j.choices[0].message; return String(m && m.content || '').trim(); });
  }
  // gemini
  return apiFetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {method:'POST', signal:o.signal,
    headers:{'content-type':'application/json'},
    body:JSON.stringify({systemInstruction:sys ? {parts:[{text:sys}]} : undefined, contents:turns.map(function(t){
      var p = (t.files || []).map(function(f){ return {inline_data:{mime_type:f.mime, data:f.b64}}; });
      p.push({text:t.text || '.'});
      return {role:t.role === 'assistant' ? 'model' : 'user', parts:p};
    })})
  }).then(function(j){
    var c = j.candidates && j.candidates[0];
    if (!c && j.promptFeedback) throw apiErr(400, 'Zapytanie zablokowane przez filtr Gemini.');
    return (c && c.content && c.content.parts || []).map(function(p){ return p.text || ''; }).join('').trim();
  });
}

/* ----- Lista modeli i wybór domyślnego ----- */
function verKey(id){ return (id.match(/\d+(?:\.\d+)?/g) || []).map(Number); }
function verCmp(a, b){ var x = verKey(a), y = verKey(b); for (var i = 0; i < Math.max(x.length, y.length); i++){ var d = (y[i] || 0) - (x[i] || 0); if (d) return d; } return 0; }
function apiModels(prov, key){
  var p;
  if (prov === 'claude') p = apiFetch('https://api.anthropic.com/v1/models?limit=100', {headers:{'x-api-key':key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'}})
    .then(function(j){ return (j.data || []).map(function(m){ return m.id; }); });
  else if (prov === 'openai') p = apiFetch('https://api.openai.com/v1/models', {headers:{'authorization':'Bearer ' + key}})
    .then(function(j){ return (j.data || []).map(function(m){ return m.id; }).filter(function(id){ return /^(gpt-|o\d|chatgpt)/.test(id) && !/audio|realtime|tts|transcribe|image|search|embedding|instruct|codex|moderation|dall|whisper|\d{4}-\d{2}-\d{2}/.test(id); }); });
  else p = apiFetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=' + encodeURIComponent(key), {})
    .then(function(j){ return (j.models || []).filter(function(m){ return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0 && /gemini/.test(m.name) && !/embedding|tts|image|live|audio|aqa/.test(m.name); }).map(function(m){ return m.name.replace(/^models\//, ''); }); });
  return p.then(function(list){ return list.sort(verCmp); });
}
function bestModel(prov, list){
  if (!list.length) return PROV[prov].def;
  var stable = list.filter(function(m){ return !/preview|exp|lite|nano/.test(m); });
  var tries = prov === 'claude' ? [/sonnet/, /opus/, /./] : prov === 'openai' ? [/^gpt-\d+(\.\d+)?-mini$/, /^gpt-\d+(\.\d+)?$/, /^gpt-/, /./] : [/flash$/, /pro$/, /flash/, /./];
  for (var i = 0; i < tries.length; i++){
    var hit = stable.filter(function(m){ return tries[i].test(m); });
    if (hit.length) return hit.sort(verCmp)[0];
  }
  return list[0];
}

/* ----- Okno ustawień AI ----- */
var apiDraft = null;
function renderApiSheet(){
  var p = apiDraft.prov, P = PROV[p], key = apiDraft.keys[p] || '', models = APIS.models[p] || [], cur = apiDraft.model[p] || PROV[p].def;
  if (models.length && models.indexOf(cur) < 0) models = [cur].concat(models);
  $('#apiBody').innerHTML =
    '<div class="seg" id="api-prov">' + Object.keys(PROV).map(function(k){ return '<button type="button" data-v="' + k + '" aria-pressed="' + (k === p) + '">' + PROV[k].name + '</button>'; }).join('') + '</div>' +
    '<div class="field"><label class="lab" for="api-key">Klucz API ' + P.firm + '</label><div class="num"><input id="api-key" class="txt" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + P.hint + '" value="' + esc(key) + '"><button type="button" class="pm" id="api-eye" aria-label="Pokaż albo ukryj klucz"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>' +
    '<div class="field"><label class="lab" for="api-model">Model</label>' +
      (models.length ? '<select id="api-model" class="sel">' + models.map(function(m){ return '<option' + (m === cur ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select>'
        : '<div class="num"><input id="api-model" class="txt" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(cur) + '"></div>') +
      '<span class="hint">Listę modeli pobiorę po sprawdzeniu klucza. Domyślny dobrze czyta zdjęcia i rysunki.</span></div>' +
    '<div id="api-msg"></div>' +
    '<button type="button" class="btn primary wide" id="api-save">Zapisz i sprawdź połączenie</button>' +
    (APIS.keys[p] ? '<button type="button" class="btn danger wide" id="api-del">Usuń klucz ' + P.name + '</button>' : '') +
    '<div class="group"><span class="glab">Jak zdobyć klucz ' + P.name + '</span><ol class="gsteps">' + P.how.map(function(h){ return '<li>' + esc(h) + '</li>'; }).join('') + '</ol>' +
      '<a class="btn wide" href="' + P.keyUrl + '" target="_blank" rel="noopener">Otwórz stronę kluczy ' + P.firm + '</a></div>' +
    '<ul class="notes"><li class="warn">Klucz zostaje tylko w tym telefonie. Każde pytanie kosztuje kilka groszy z Twojego konta API — ustaw limit wydatków u dostawcy. Nie wpisuj klucza na cudzym telefonie.</li>' +
      '<li>Zdjęcia, rysunki i programy trafią do ' + P.firm + '. Sprawdź, czy firma pozwala wysyłać dokumentację klientów.</li></ul>';
}
function openApiSheet(){
  apiDraft = JSON.parse(JSON.stringify({prov:APIS.prov, keys:APIS.keys, model:APIS.model}));
  renderApiSheet(); openSheet('#apiSheet');
}
document.addEventListener('click', function(e){ if (e.target.closest('[data-apiset]')) openApiSheet(); });
$('#apiBody').addEventListener('click', function(e){
  var b = e.target.closest('#api-prov [data-v]');
  if (b){ keepDraft(); apiDraft.prov = b.getAttribute('data-v'); renderApiSheet(); return; }
  if (e.target.closest('#api-eye')){ var k = $('#api-key'); k.type = k.type === 'password' ? 'text' : 'password'; return; }
  if (e.target.closest('#api-del')){
    delete APIS.keys[apiDraft.prov]; delete apiDraft.keys[apiDraft.prov]; apiSave(); renderApiSheet(); setAIMode(); toast('Klucz usunięty z telefonu'); return;
  }
  if (e.target.closest('#api-save')) apiSaveCheck();
});
function keepDraft(){
  var k = $('#api-key'), m = $('#api-model');
  if (k) apiDraft.keys[apiDraft.prov] = k.value.trim();
  if (m && m.value.trim()) apiDraft.model[apiDraft.prov] = m.value.trim();
}
function apiSaveCheck(){
  keepDraft();
  var p = apiDraft.prov, key = apiDraft.keys[p], msg = $('#api-msg'), btn = $('#api-save');
  if (!key){ msg.innerHTML = '<p class="note-warn">Wklej klucz API.</p>'; $('#api-key').focus(); return; }
  btn.disabled = true; btn.textContent = 'Sprawdzam…';
  msg.innerHTML = '';
  apiModels(p, key).then(function(list){
    APIS.models[p] = list;
    var chosen = apiDraft.model[p];
    if (!APIS.model[p] && chosen === PROV[p].def) chosen = null;
    if (!chosen || (list.length && list.indexOf(chosen) < 0)) chosen = bestModel(p, list);
    APIS.keys[p] = key; APIS.model[p] = chosen; APIS.prov = p; apiSave();
    apiDraft.model[p] = chosen;
    renderApiSheet();
    $('#api-msg').innerHTML = '<p class="okline"><span class="chip ok">Połączono</span> ' + esc(PROV[p].name) + ' · ' + esc(chosen) + '</p>';
    setAIMode(); toast('AI połączone: ' + PROV[p].name);
  }, function(err){
    btn.disabled = false; btn.textContent = 'Zapisz i sprawdź połączenie';
    msg.innerHTML = '<p class="note-warn">' + esc(err.message || 'Nie udało się połączyć.') + '</p>';
  });
}
$('#apiBody').addEventListener('change', function(e){
  if (e.target.id === 'api-model'){ apiDraft.model[apiDraft.prov] = e.target.value; if (APIS.keys[apiDraft.prov] && APIS.prov === apiDraft.prov){ APIS.model[apiDraft.prov] = e.target.value; apiSave(); setAIMode(); } }
});
