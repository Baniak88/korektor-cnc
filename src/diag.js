/* ===== Diagnoza: objaw → najczęstsze przyczyny → co sprawdzić → gdzie poprawić =====
   oraz kalkulator obrotów i posuwu. Wpięte jako przewodniki (GUIDES.diag, GUIDES.cut). */

var DIAG = [
  {id:'drift', t:'Wymiar ucieka w serii', s:'Każdy kolejny detal trochę inny',
    causes:[
      ['Zużycie ostrza', 'Wymiar zmienia się stopniowo w jedną stronę. Zmierz 3 kolejne detale i zapisz — jeśli trend jest stały, koryguj zużycie co kilka sztuk albo wymień ostrze.'],
      ['Maszyna się nagrzewa', 'Rano wymiar inny niż po godzinie pracy. Rozgrzej wrzeciono (ok. 10–15 min) przed serią, mierz detale po ostygnięciu.'],
      ['Wióry pod detalem albo w bazie', 'Skok wymiaru na pojedynczym detalu. Przedmuchaj i przetrzyj szczęki, oporę i spód detalu przed każdym mocowaniem.'],
      ['Mocowanie', 'Za słabo — detal się przesuwa; za mocno — cienki detal się odkształca i „odbija” po zwolnieniu.']],
    acts:[{go:'korekcja', t:'Policz korektę zużycia'}]},
  {id:'offset', t:'Wymiar stale za duży albo za mały', s:'O tyle samo na każdym detalu',
    causes:[
      ['Korekcja promienia / długości', 'Najszybciej poprawisz zużyciem (' + '<b>D/H</b> na Fanuc, <b>ΔR/ΔL</b> na Sinumerik). Policz wartość w zakładce Korekcja.'],
      ['Program bez G41/G42', 'Jeśli kontur idzie po torze środka narzędzia, zużycie promienia nic nie zmieni — trzeba zmienić program (Popraw program → Poszerz).'],
      ['Zła średnica w tabeli', 'Sprawdź, czy promień w tabeli narzędzi zgadza się z frezem w oprawce (np. po wymianie na przeszlifowany).'],
      ['Pomiar', 'Sprawdź przyrząd na wzorcu i mierz w tej samej temperaturze.']],
    acts:[{go:'korekcja', t:'Policz korektę z pomiaru'}, {guide:'offset', t:'Gdzie wpisać korekcję'}]},
  {id:'taper', t:'Ściana krzywa albo stożek', s:'Otwór lub czop inny u góry i u dołu',
    causes:[
      ['Narzędzie się odgina', 'Długi wysięg albo duża szerokość skrawania. Zostaw 0,1–0,2 mm na wykończenie i zrób przejście wykańczające na pełną głębokość.'],
      ['Bicie narzędzia', 'Sprawdź czujnikiem w oprawce (cel: poniżej 0,01 mm). Wyczyść stożek oprawki i wrzeciona.'],
      ['Stępione ostrze', 'Tępy frez bardziej się odpycha. Wymień i porównaj.'],
      ['Przejście „na sucho”', 'Powtórz ostatnie przejście bez zmiany korekcji (spring pass) — często zdejmie stożek.']],
    acts:[{calc:'cut', t:'Policz obroty i posuw'}]},
  {id:'chatter', t:'Drgania, zła powierzchnia', s:'Pisk, fale, chropowatość',
    causes:[
      ['Obroty w strefie drgań', 'Zmień obroty o 10–20% w górę albo w dół (override wrzeciona) i posłuchaj.'],
      ['Wysięg narzędzia', 'Skróć narzędzie w oprawce, jak tylko się da. Każdy milimetr się liczy.'],
      ['Posuw na ząb', 'Za mały — ostrze trze zamiast skrawać (piszczy). Za duży — narzędzie się ugina. Sprawdź w kalkulatorze.'],
      ['Mocowanie detalu', 'Cienkie ścianki i wysoko wystający detal drgają. Podeprzyj albo zmniejsz głębokość skrawania.'],
      ['Frezowanie przeciwbieżne', 'Na wykończeniu frezuj współbieżnie — przy obrotach M3 to korekcja G41 (narzędzie po lewej stronie toru).']],
    acts:[{calc:'cut', t:'Policz obroty i posuw'}]},
  {id:'depth', t:'Zła głębokość albo wysokość', s:'Z za głęboko albo za płytko',
    causes:[
      ['Długość narzędzia', 'Zmierzona źle albo zła płytka/wałeczek. Zmierz ponownie.'],
      ['Numer H / ostrze D', 'Fanuc: H w programie musi pasować do narzędzia (G43 H5 przy T5). Sinumerik: właściwe ostrze D.'],
      ['G54 Z', 'Po zmianie detalu lub szczęk sprawdź Z0 detalu.'],
      ['Zużycie długości', 'Jeśli tylko trochę (setki) — popraw zużyciem długości w zakładce Korekcja.']],
    acts:[{guide:'tool', t:'Ustaw długość narzędzia'}, {go:'korekcja', t:'Policz korektę głębokości'}]},
  {id:'position', t:'Kontur albo otwory przesunięte', s:'Dobry wymiar, złe położenie X/Y',
    causes:[
      ['G54 X/Y', 'Sprawdź bazę: najedź w MDI na X0 Y0 i porównaj z detalem albo zmierz sondą.'],
      ['Inny układ', 'Program może używać G55/G56 albo innej palety — sprawdź, który układ jest aktywny.'],
      ['Detal przesunięty w imadle', 'Brak oporu, wiór przy oporze albo detal obrócony.'],
      ['Odwrotny kierunek', 'Przesunięcie dwa razy większe niż oczekiwane — znak w G54 albo pomylona strona dotknięcia.']],
    acts:[{guide:'zero', t:'Ustaw punkt zerowy'}, {go:'gcode', t:'Przesuń w programie'}]},
  {id:'hole', t:'Otwór owalny albo za duży', s:'Po wierceniu wymiar nie ten',
    causes:[
      ['Brak nawiercenia', 'Wiertło „ucieka” na wejściu. Nawierć nawiertakiem 90°.'],
      ['Bicie / ostrzenie wiertła', 'Niesymetryczne ostrza wiercą większy otwór. Sprawdź bicie i naostrzenie.'],
      ['Za duży posuw', 'Zmniejsz posuw na obrót.'],
      ['Tolerancja H7', 'Wiertłem nie zrobisz H7 — wierć mniejszym (np. −0,2 mm) i rozwierć albo wytocz.']],
    acts:[{calc:'cut', t:'Policz obroty i posuw'}, {go:'nowy', t:'Program: otwory i rozwiercanie'}]},
  {id:'thread', t:'Gwint za ciasny albo pęka gwintownik', s:'Sprawdzian nie wchodzi, gwintownik łamie się',
    causes:[
      ['Złe wiertło pod gwint', 'M6 → 5,0; M8 → 6,8; M10 → 8,5; M12 → 10,2. Za małe wiertło = pęknięty gwintownik.'],
      ['Posuw ≠ obroty × skok', 'Przy gwintowaniu sztywnym F = S × skok (np. S500, skok 1,5 → F750).'],
      ['Za płytki otwór nieprzelotowy', 'Gwintownik dobija do dna albo do wiórów. Wierć głębiej o 3 skoki + stożek wiertła.'],
      ['Brak chłodzenia / zły gwintownik', 'Do nieprzelotowych gwintownik ze spiralą (wyciąga wiór w górę), do przelotowych z nakrojem.']],
    acts:[{calc:'cut', t:'Policz obroty i posuw'}]},
  {id:'break', t:'Narzędzie się łamie', s:'Pęka frez albo wiertło',
    causes:[
      ['Za duży posuw na ząb', 'Sprawdź w kalkulatorze i katalogu narzędzia.'],
      ['Wiór nie ucieka', 'Kieszenie i głębokie otwory: chłodziwo, przedmuch, wiercenie z wycofaniem (G83 / CYCLE83).'],
      ['Wejście pionowe frezem', 'Frez bez ostrzy czołowych nie wejdzie pionowo — rampa, spirala albo otwór startowy.'],
      ['Zła długość / kolizja', 'Narzędzie weszło za głęboko szybkim ruchem. Sprawdź długość i H/D.']],
    acts:[{guide:'broken', t:'Co zrobić po złamaniu'}, {calc:'cut', t:'Policz obroty i posuw'}]}
];

GUIDES.diag = {title:'Co jest nie tak?', sub:'Wybierz objaw — powiem, co sprawdzić', keys:'diagnoza problem objaw drgania chropowatosc stozek owalny gwint luz wymiar ucieka seria temperatura bicie odgina pisk',
  render:function(box){ diagList(box); }};
GUIDES.cut = {title:'Obroty i posuw', sub:'S i F z materiału i średnicy', keys:'obroty posuw vc fz s f predkosc skrawania kalkulator gwint wiertlo pod gwint',
  render:function(box){ cutCalc(box); }, warn:['Wartości startowe dla narzędzi z węglika (gwintowniki HSS-E). Zawsze sprawdź katalog producenta narzędzia.']};

function diagList(box){
  box.innerHTML = '<div class="tasks">' + DIAG.map(function(d){
    return '<button type="button" class="task" data-sym="' + d.id + '"><span class="tt"><b>' + esc(d.t) + '</b><small>' + esc(d.s) + '</small></span><span class="chev" aria-hidden="true">›</span></button>';
  }).join('') + '</div>';
}
function diagShow(id){
  var d = DIAG.filter(function(x){ return x.id === id; })[0]; if (!d) return;
  var box = $('#calc');
  box.innerHTML = '<button type="button" class="tlink" data-symback>‹ Wszystkie objawy</button>' +
    '<div class="sec-h"><h3 class="h3big">' + esc(d.t) + '</h3><p class="lead">Najczęstsze przyczyny — sprawdzaj po kolei:</p></div>' +
    '<ol class="gsteps causes">' + d.causes.map(function(c){ return '<li><b>' + esc(c[0]) + '</b><br>' + c[1] + '</li>'; }).join('') + '</ol>' +
    '<div class="group">' + d.acts.map(function(a, i){
      var attr = a.go ? 'data-go="' + a.go + '"' : a.guide ? 'data-guide="' + a.guide + '"' : 'data-guide="cut"';
      return '<button type="button" class="btn ' + (i ? '' : 'primary ') + 'wide" ' + attr + '>' + esc(a.t) + '</button>';
    }).join('') + '<button type="button" class="btn wide" data-askdiag="' + d.id + '">Zapytaj AI o ten problem</button></div>';
  window.scrollTo(0, 0);
}
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-sym]'); if (b){ diagShow(b.getAttribute('data-sym')); return; }
  if (e.target.closest('[data-symback]')){ diagList($('#calc')); return; }
  var a = e.target.closest('[data-askdiag]');
  if (a){
    var d = DIAG.filter(function(x){ return x.id === a.getAttribute('data-askdiag'); })[0];
    goAI('ask', 'Problem: ' + d.t.toLowerCase() + ' (' + d.s.toLowerCase() + ') na ' + MACHINES[S.machine].name + '. Materiał: , narzędzie: , operacja: . Co sprawdzić po kolei?');
    $('#ai-q').focus();
  }
});

/* ----- Kalkulator obrotów i posuwu ----- */
var CC = store.get('cc', {tool:'mill', d:'10', z:'4', mat:'stal', vc:'', fz:'', thread:'M10'});
function cutCalc(box){
  function save(){ store.set('cc', CC); }
  function base(){ return cutData({tool:CC.tool === 'tap' ? 'tap' : CC.tool, d:parseNum(CC.tool === 'tap' ? (tapInfo(CC.thread) || {}).d : CC.d), z:parseNum(CC.z), mat:CC.mat, maxS:MACHINES[S.machine].maxS || 15000, pitch:(tapInfo(CC.thread) || {}).pitch}); }
  function render(){
    var b = base(), tap = CC.tool === 'tap', perRev = CC.tool === 'drill' || CC.tool === 'ream';
    var h = '<div class="seg wrap" id="cc-tool">' + [['mill', 'Frez'], ['face', 'Głowica'], ['drill', 'Wiertło'], ['ream', 'Rozwiertak'], ['tap', 'Gwintownik']].map(function(t){ return '<button type="button" data-v="' + t[0] + '" aria-pressed="' + (CC.tool === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="field"><label class="lab" for="cc-mat">Materiał</label><select id="cc-mat" class="sel">' + Object.keys(MATERIALS).map(function(m){ return '<option value="' + m + '"' + (CC.mat === m ? ' selected' : '') + '>' + esc(MATERIALS[m].name) + '</option>'; }).join('') + '</select></div>';
    h += '<div class="fields">' + (tap ? '<div class="field"><label class="lab" for="cc-thread">Gwint</label><div class="num"><input id="cc-thread" class="txt" autocapitalize="characters" autocomplete="off" value="' + esc(CC.thread) + '"></div></div>' : numField('cc-d', 'Średnica Ø', CC.d)) +
      (CC.tool === 'mill' || CC.tool === 'face' ? numField('cc-z', 'Liczba ostrzy', CC.z) : '') +
      numField('cc-vc', 'Vc (m/min)', CC.vc, b ? 'puste = ' + b.vc : '') +
      (tap ? '' : numField('cc-fz', perRev ? 'Posuw na obrót (mm)' : 'Posuw na ząb fz (mm)', CC.fz, b ? 'puste = ' + String(r3(b.fz || b.frev)).replace('.', ',') : '')) + '</div>';
    h += '<div id="cc-out"></div>';
    box.innerHTML = h; calc();
  }
  function calc(){
    var b = base(), tap = CC.tool === 'tap', ti = tapInfo(CC.thread), d = tap ? (ti && ti.d) : parseNum(CC.d), out = '';
    if (b && d > 0){
      var vc = parseNum(CC.vc) > 0 ? parseNum(CC.vc) : b.vc, maxS = MACHINES[S.machine].maxS || 15000;
      var S0 = vc * 1000 / (Math.PI * d), Sx = Math.min(maxS, Math.max(10, Math.round(S0 / 10) * 10)), F;
      if (tap) F = r3(Sx * ti.pitch);
      else {
        var per = parseNum(CC.fz) > 0 ? parseNum(CC.fz) : (b.fz || b.frev), z = (CC.tool === 'mill' || CC.tool === 'face') ? (parseNum(CC.z) || b.z) : 1;
        F = Math.max(1, Math.round(Sx * per * z));
      }
      out = '<div class="cres"><div class="cres-two"><div><span class="lab">Obroty S</span><span class="big">' + Sx + '</span></div><div><span class="lab">Posuw F (mm/min)</span><span class="big">' + String(F).replace('.', ',') + '</span></div></div>' +
        (S0 > maxS ? '<p class="fine">Policzone ' + Math.round(S0) + ' obr/min — ograniczone do maks. wrzeciona ' + maxS + '.</p>' : '') +
        (tap ? '<p class="fine">' + esc(ti.name) + ': skok ' + String(ti.pitch).replace('.', ',') + ', wiertło Ø' + String(ti.drill).replace('.', ',') + '. F = S × skok.</p>' : '') +
        '<button type="button" class="btn" data-copyval="S' + Sx + ' F' + F + '">Kopiuj S i F</button></div>';
    } else out = '<p class="fine">' + (tap ? 'Wpisz gwint, np. M8 albo M8x1.' : 'Wpisz średnicę narzędzia.') + '</p>';
    box.querySelector('#cc-out').innerHTML = out;
  }
  box.addEventListener('click', function(e){ var b = e.target.closest('#cc-tool [data-v]'); if (b){ CC.tool = b.getAttribute('data-v'); CC.vc = ''; CC.fz = ''; save(); render(); } });
  box.addEventListener('input', function(e){
    var map = {'cc-d':'d', 'cc-z':'z', 'cc-vc':'vc', 'cc-fz':'fz', 'cc-thread':'thread', 'cc-mat':'mat'}, k = map[e.target.id]; if (!k) return;
    CC[k] = e.target.value; save();
    if (k === 'mat'){ render(); return; }
    calc();
  });
  box.addEventListener('change', function(e){ if (e.target.id === 'cc-mat'){ CC.mat = e.target.value; save(); render(); } });
  render();
}
renderStartTasks();
