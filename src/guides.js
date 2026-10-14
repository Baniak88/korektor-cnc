/* ===== Szybkie przewodniki: najczęstsze zadania przy maszynie, krok po kroku, z kalkulatorem ===== */
var GUIDES = {
  zero: {
    title: 'Ustaw punkt zerowy (G54)', sub: 'Krawędź albo środek — policzę wartość do wpisania', calc: 'zero',
    keys: 'g54 g55 punkt zerowy przesuniecie baza detalu krawedz srodek otworu sonda trzpien work offset pkt zero',
    steps: {
      fanuc: [
        'Najedź trzpieniem albo sondą na krawędź w trybie <b>HANDLE</b> (pokrętło). Na końcu krok 0.001.',
        'Odczytaj pozycję <b>maszynową</b>: <b>POS</b> → <b>ALL</b> (WSZYSTKO) → kolumna <b>MASZYNA</b> (MACHINE). Wpisz ją w kalkulator powyżej.',
        '<b>OFFSET/SETTING</b> → przycisk ekranowy <b>[UKŁ.WSP]</b> / <b>[WORK]</b> → kursor na G54 (albo inny układ) i oś.',
        'Wpisz wynik z kalkulatora i naciśnij <b>[WPROWADŹ]</b> / <b>[INPUT]</b>. Nie [+WPROWADŹ] — to doda wartość do starej.',
        'Szybciej dla X i Y: na tym samym ekranie wpisz pozycję, jaką ma mieć środek narzędzia (np. <b>X-5.</b> przy kulce Ø10 dotykającej z lewej) i naciśnij <b>[POMIAR]</b> / <b>[MEASURE]</b> — sterowanie samo policzy G54.',
        'Sprawdź w <b>MDI</b>: <b>G90 G54 G00 X0 Y0</b> na bezpiecznej wysokości i zobacz, czy narzędzie stoi tam, gdzie trzeba.'
      ],
      sinumerik: [
        'W trybie <b>JOG</b> najedź na krawędź pokrętłem. Na końcu najmniejszy krok.',
        'Odczytaj pozycję w układzie maszyny: w oknie pozycji przełącz na <b>MKS</b> (układ maszyny). Wpisz ją w kalkulator powyżej.',
        '<b>Parametry</b> → <b>Przesunięcie punktu zerowego</b> (Work offset) → <b>G54…</b> → kursor na oś.',
        'Wpisz wynik z kalkulatora w kolumnę osi i zatwierdź <b>Input</b>.',
        'Szybciej: <b>JOG</b> → <b>Pomiar detalu</b> (Meas. workpiece) → <b>Krawędź</b> → wybierz G54, oś i kierunek, wpisz pozycję zadaną krawędzi → <b>Ustaw PPZ</b> (Set WO). Sterowanie uwzględni promień narzędzia z tabeli.',
        'Sprawdź w <b>MDA</b>: <b>G54 G0 X0 Y0</b> na bezpiecznej wysokości.'
      ]
    },
    warn: ['Przed sprawdzeniem w MDI/MDA ustaw posuw szybki na 25% i trzymaj rękę na STOP.', 'Nazwy przycisków mogą się trochę różnić zależnie od wersji i języka sterowania.']
  },
  tool: {
    title: 'Ustaw długość narzędzia', sub: 'Dotknięcie płytki albo detalu — policzę długość', calc: 'tool',
    keys: 'dlugosc narzedzia h geometria dotkniecie plytka walek ustawiarka tool length touch off nowe narzedzie',
    steps: {
      fanuc: [
        'W <b>MDI</b> wywołaj narzędzie: <b>T5 M06</b> (Twój numer).',
        'Zjedź pokrętłem nad płytkę wzorcową albo powierzchnię detalu. Przesuwaj płytkę pod narzędziem i opuszczaj krok 0.01, aż ledwo nie przejdzie.',
        'Odczytaj <b>Z maszynowe</b>: <b>POS</b> → <b>ALL</b> → <b>MASZYNA</b>. Wpisz w kalkulator powyżej.',
        '<b>OFFSET/SETTING</b> → <b>[KOREKCJA]</b> / <b>[OFFSET]</b> → wiersz numeru <b>H</b> tego narzędzia → kolumna <b>GEOM (H)</b> → wpisz długość → <b>[WPROWADŹ]</b>.',
        'W tym samym wierszu ustaw <b>ZUŻYCIE (H) = 0</b> dla nowego narzędzia.',
        'Jeśli maszyna ma ustawiarkę albo sondę narzędziową z cyklem pomiaru — użyj jej, jest dokładniejsza.'
      ],
      sinumerik: [
        'W <b>MDA</b> wywołaj narzędzie: <b>T5 M6</b> i <b>D1</b>.',
        'W <b>JOG</b> zjedź nad płytkę albo detal i opuszczaj małym krokiem, aż płytka ledwo nie przejdzie.',
        'Najprościej: <b>JOG</b> → <b>Pomiar narzędzia</b> → <b>Ręcznie</b> → <b>Długość</b> → wpisz Z0 (lub grubość płytki) → <b>Ustaw długość</b>.',
        'Ręcznie: odczytaj Z w <b>MKS</b>, policz w kalkulatorze, wpisz w <b>Parametry</b> → <b>Lista narzędzi</b> → kolumna <b>Długość</b> dla ostrza D.',
        'W <b>Parametry</b> → <b>Zużycie narzędzia</b> ustaw <b>ΔL = 0</b> dla nowego narzędzia.'
      ]
    },
    warn: ['Zła długość to kolizja albo frezowanie w powietrzu. Pierwszy zjazd po zmianie: posuw szybki 25%, pojedynczy blok.']
  },
  offset: {
    title: 'Wpisz albo zmień korekcję', sub: 'Gdzie jest geometria, a gdzie zużycie', go: 'korekcja',
    keys: 'korekcja zuzycie wear geometria offset d h promien dlugosc wpisac zmienic tabela',
    steps: {
      fanuc: [
        '<b>OFFSET/SETTING</b> → <b>[KOREKCJA]</b> / <b>[OFFSET]</b>.',
        'Wiersz = numer korekcji (H dla długości, D dla promienia).',
        '<b>GEOM</b> — zmierzony wymiar narzędzia. Ustawiasz przy nowym narzędziu.',
        '<b>ZUŻYCIE</b> (WEAR) — małe poprawki z pomiaru detalu. Tu wpisujesz korekty.',
        'Wpisz liczbę i <b>[+WPROWADŹ]</b>, żeby dodać do obecnej, albo <b>[WPROWADŹ]</b>, żeby zastąpić.',
        'Ile wpisać? Policz w zakładce <b>Korekcja</b> — przycisk niżej.'
      ],
      sinumerik: [
        '<b>Parametry</b> → <b>Lista narzędzi</b> — geometria: Długość i Promień dla ostrza D.',
        '<b>Parametry</b> → <b>Zużycie narzędzia</b> — poprawki z pomiaru: ΔL (długość) i ΔR (promień).',
        'Kursor na narzędzie i ostrze D, wpisz wartość, zatwierdź <b>Input</b>.',
        'Ile wpisać? Policz w zakładce <b>Korekcja</b> — przycisk niżej.'
      ]
    },
    warn: ['Korekta promienia działa tylko przy G41/G42 w programie.']
  },
  restart: {
    title: 'Wznów program od linii', sub: 'Po przerwaniu, złamanym narzędziu, alarmie',
    keys: 'wznowic program od linii blok wyszukiwanie block search restart start od srodka przerwanie',
    steps: {
      fanuc: [
        '<b>RESET</b> i usuń przyczynę (np. wymień narzędzie i ustaw długość).',
        'W programie znajdź blok <b>zmiany narzędzia (T… M06)</b> przed miejscem przerwania — tam są G54, G43 H, S, M3 i M8.',
        'Tryb <b>MEM</b> (AUTO), ustaw kursor na ten blok (wyszukiwanie numeru N albo kursor w programie).',
        'Posuw szybki i posuw na ok. 25%, włącz <b>POJEDYNCZY BLOK</b> (SINGLE BLOCK).',
        '<b>CYCLE START</b>, sprawdzaj każdy ruch. Gdy wszystko się zgadza — wyłącz pojedynczy blok.',
        'Start od środka operacji (funkcja WZNOWIENIE PROGRAMU / PROGRAM RESTART) — tylko według instrukcji maszyny.'
      ],
      sinumerik: [
        '<b>RESET</b> i usuń przyczynę.',
        '<b>AUTO</b> → <b>Wyszukiwanie bloku</b> (Block search) → kursor na blok — najlepiej zmianę narzędzia przed miejscem przerwania.',
        'Wybierz <b>Z obliczaniem konturu</b> (Contour) — sterowanie odtworzy G54, narzędzie, posuw i obroty.',
        '<b>NC Start</b> → pojawi się komunikat 10208 „kontynuuj NC Start”. Sprawdź pozycję i stan maszyny.',
        'Override na ok. 25%, <b>SBL</b> (pojedynczy blok) na pierwsze ruchy, potem <b>NC Start</b>.'
      ]
    },
    warn: ['Start w środku programu bez narzędzia, G54, G43/D i obrotów to najczęstsza przyczyna kolizji. Zawsze startuj od zmiany narzędzia, jeśli możesz.']
  },
  broken: {
    title: 'Złamane narzędzie', sub: 'Co zrobić po kolei',
    keys: 'zlamane narzedzie peklo frez wiertlo zlamal sie kolizja',
    steps: {
      fanuc: [
        '<b>FEED HOLD</b> albo <b>RESET</b>. Poczekaj, aż wrzeciono stanie.',
        'W <b>HANDLE</b>/<b>JOG</b> odjedź w górę w Z. Jeśli kawałek siedzi w detalu — nie ruszaj X/Y, zanim go nie wyjmiesz.',
        'Wymień narzędzie, ustaw nową długość (przewodnik „Ustaw długość narzędzia”), zużycie = 0.',
        'Sprawdź detal i oprawkę. Przy kolizji zgłoś utrzymaniu ruchu przed dalszą pracą.',
        'Wznów od zmiany narzędzia (przewodnik „Wznów program od linii”).'
      ],
      sinumerik: [
        '<b>NC Stop</b> albo <b>RESET</b>. Poczekaj, aż wrzeciono stanie.',
        'W <b>JOG</b> odjedź w górę w Z. Jeśli kawałek siedzi w detalu — nie ruszaj X/Y, zanim go nie wyjmiesz.',
        'Wymień narzędzie, ustaw nową długość (przewodnik „Ustaw długość narzędzia”), ΔL = 0.',
        'Sprawdź detal i oprawkę. Przy kolizji zgłoś utrzymaniu ruchu przed dalszą pracą.',
        'Wznów przez <b>Wyszukiwanie bloku</b> od zmiany narzędzia (przewodnik „Wznów program od linii”).'
      ]
    },
    links: ['tool', 'restart']
  },
  limit: {
    title: 'Krańcówka — oś nie rusza', sub: 'Programowa albo fizyczna',
    keys: 'krancowka overtravel limit os nie rusza ot0500 ot0501 10620 10720 21614 700001 700002 700003 soft hard',
    steps: {
      fanuc: [
        '<b>Krańcówka programowa</b> (OT0500/OT0501, IE0001…): <b>RESET</b>, potem w <b>HANDLE</b>/<b>JOG</b> odjedź w <b>przeciwnym</b> kierunku.',
        'Sprawdź, dlaczego oś tam jechała: wartość w programie, numer H, G54 Z, układ G54–G59.',
        '<b>Krańcówka fizyczna</b> (OT0506/OT0507): jeśli maszyna ma przycisk zwolnienia krańcówki (np. O.T. RELEASE), przytrzymaj go i odjedź pokrętłem w przeciwnym kierunku, potem <b>RESET</b>.',
        'Po najechaniu na krańcówkę fizyczną albo kolizji — zgłoś utrzymaniu ruchu.'
      ],
      sinumerik: [
        '<b>Krańcówka programowa</b> (10620, 10720): <b>RESET</b>, potem w <b>JOG</b> odjedź w <b>przeciwnym</b> kierunku.',
        'Sprawdź, dlaczego oś tam jechała: wartość w programie, ostrze D, przesunięcie G54.',
        '<b>Krańcówka fizyczna</b> (21614; na Chironie także 700001–700003): przycisk zwolnienia krańcówki zależy od maszyny — przytrzymaj go i odjedź w przeciwnym kierunku.',
        'Po najechaniu na krańcówkę fizyczną albo kolizji — zgłoś utrzymaniu ruchu.'
      ]
    },
    warn: ['Numery alarmów zależą od wersji sterowania — porównaj z tekstem na ekranie.']
  }
};

var START_GROUPS = [
  ['Problem przy maszynie', [
    {guide:'diag', i:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/><path d="M11 8v3.5M11 14v.3"/>', c:'red'},
    {go:'korekcja', t:'Wymiar poza tolerancją', s:'Policzę, o ile zmienić zużycie', i:'<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>', c:'blue'},
    {guide:'broken', i:'<path d="M5 19L12 12M14 10l5-5"/><path d="M11 6l2 2M16 11l2 2"/>', c:'orange'},
    {go:'alarmy', t:'Alarm na maszynie', s:'Co znaczy i co sprawdzić', i:'<path d="M12 3L2 20h20z"/><path d="M12 10v4M12 17v.5"/>', c:'orange'},
    {guide:'limit', i:'<path d="M4 12h12"/><path d="M13 8l4 4-4 4"/><path d="M20 4v16"/>', c:'purple'}
  ]],
  ['Ustawienia', [
    {guide:'zero', i:'<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>', c:'green'},
    {guide:'tool', i:'<path d="M9 3h6v6l-2 2v9h-2v-9L9 9z"/>', c:'indigo'},
    {guide:'offset', i:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M10 10v9"/>', c:'blue'},
    {guide:'cut', i:'<circle cx="12" cy="12" r="8"/><path d="M12 12l4-3"/><path d="M12 4v2M20 12h-2M4 12h2"/>', c:'green'},
    {guide:'restart', i:'<path d="M5 12a7 7 0 1 0 2-5"/><path d="M5 4v4h4"/>', c:'teal'}
  ]],
  ['Program i wiedza', [
    {go:'nowy', t:'Napisz nowy program', s:'Z rysunku albo z wymiarów: kieszenie, kontury, otwory', i:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M12 11v6M9 14h6"/>', c:'blue'},
    {go:'gcode', t:'Zmień wymiar w programie', s:'Podgląd ruchów, poszerz, przesuń', i:'<path d="M8 5L3 12l5 7"/><path d="M16 5l5 7-5 7"/><path d="M13.5 4l-3 16"/>', c:'indigo'},
    {go:'ai', t:'Zdjęcie programu do AI', s:'ChatGPT, Claude, Gemini', i:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', c:'green'},
    {go:'kody', t:'Co znaczy kod albo pojęcie?', s:'G i M, słowniczek', i:'<path d="M5 4h14v16H5z"/><path d="M9 8h6M9 12h6M9 16h4"/>', c:'orange'}
  ]]
];

function renderStartTasks(){
  $('#st-tasks').innerHTML = START_GROUPS.map(function(g){
    return '<span class="glab">' + esc(g[0]) + '</span><div class="tasks">' + g[1].map(function(it){
      var G = it.guide ? GUIDES[it.guide] : null;
      return '<button type="button" class="task" ' + (G ? 'data-guide="' + it.guide + '"' : 'data-go="' + it.go + '"') + '>' +
        '<span class="ti ic-' + it.c + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + it.i + '</svg></span>' +
        '<span class="tt"><b>' + esc(G ? G.title : it.t) + '</b><small>' + esc(G ? G.sub : it.s) + '</small></span><span class="chev" aria-hidden="true">›</span></button>';
    }).join('') + '</div>';
  }).join('');
}

/* ----- Ekran przewodnika ----- */
var curGuide = null;
function openGuide(id){
  var G = GUIDES[id]; if (!G) return;
  curGuide = id;
  var c = ctl();
  var html = '<div class="sec-h"><h2>' + esc(G.title) + '</h2><p class="lead">' + esc(MACHINES[S.machine].name) + ' · ' + esc(ctlName(S.machine)) + '</p></div>';
  if (G.calc) html += '<div class="calc" id="calc"></div>';
  if (G.render) html += '<div class="group" id="calc"></div>';
  if (G.steps) html += '<div class="group"><span class="glab">Na sterowaniu ' + (c === 'fanuc' ? 'Fanuc' : 'Sinumerik') + '</span><ol class="gsteps">' +
    G.steps[c].map(function(s){ return '<li>' + s + '</li>'; }).join('') + '</ol></div>';
  if (G.warn) html += '<ul class="notes">' + G.warn.map(function(w){ return '<li class="warn">' + esc(w) + '</li>'; }).join('') + '</ul>';
  var btns = '';
  if (G.go) btns += '<button type="button" class="btn primary wide" data-go="' + G.go + '">Policz korektę z pomiaru</button>';
  (G.links || []).forEach(function(l){ btns += '<button type="button" class="btn wide" data-guide="' + l + '">' + esc(GUIDES[l].title) + '</button>'; });
  if (!G.render) btns += '<button type="button" class="btn wide" data-askguide="' + id + '">Zapytaj AI</button>';
  if (btns) html += '<div class="group">' + btns + '</div>';
  $('#guide').innerHTML = html;
  if (G.calc === 'zero') zeroCalc($('#calc'));
  if (G.calc === 'tool') toolCalc($('#calc'));
  if (G.render) G.render($('#calc'));
  showTab('guide'); window.scrollTo(0, 0);
}
document.addEventListener('click', function(e){
  var g = e.target.closest('[data-guide]');
  if (g){ closeSheet(); openGuide(g.getAttribute('data-guide')); return; }
  var b = e.target.closest('[data-back]');
  if (b){ showTab('start'); window.scrollTo(0, 0); return; }
  var a = e.target.closest('[data-askguide]');
  if (a){ var G = GUIDES[a.getAttribute('data-askguide')]; goAI('ask', 'Pomóż mi krok po kroku: ' + G.title.toLowerCase() + ' na ' + MACHINES[S.machine].name + '. Szczegóły: '); $('#ai-q').focus(); }
});

/* ----- Kalkulatory ----- */
function numField(id, label, val, hint){
  return '<div class="field"><label class="lab" for="' + id + '">' + label + '</label><div class="num"><input id="' + id + '" inputmode="decimal" autocomplete="off" value="' + (val == null ? '' : val) + '"><button type="button" class="pm" data-for="' + id + '" aria-label="Zmień znak">±</button></div>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
}
function calcResult(label, value, sub){
  return '<div class="cres"><span class="lab">' + label + '</span><div class="cres-row"><span class="big">' + value + '</span><button type="button" class="btn" data-copyval="' + value + '">Kopiuj</button></div>' + (sub ? '<p class="fine">' + sub + '</p>' : '') + '</div>';
}
document.addEventListener('click', function(e){ var b = e.target.closest('[data-copyval]'); if (b) copyText(b.getAttribute('data-copyval')); });
function f4(v){ return (Math.round(v * 1000) / 1000).toFixed(3); }

var ZC = store.get('zc', {ax:'X', m:'edge', side:-1, d:'10', p:'', p2:'', ev:'0', L:'', b:'0', zv:'0', wo:'G54', kind:'hole'});
function zeroCalc(box){
  var c = ctl();
  function save(){ store.set('zc', ZC); }
  function render(){
    var isZ = ZC.ax === 'Z';
    var h = '<div class="seg" id="zc-ax">' + ['X','Y','Z'].map(function(a){ return '<button type="button" data-v="' + a + '" aria-pressed="' + (ZC.ax === a) + '">Oś ' + a + '</button>'; }).join('') + '</div>';
    if (!isZ){
      h += '<div class="seg" id="zc-m"><button type="button" data-v="edge" aria-pressed="' + (ZC.m === 'edge') + '">Krawędź</button><button type="button" data-v="center" aria-pressed="' + (ZC.m === 'center') + '">Środek (2 dotknięcia)</button></div>';
      if (ZC.m === 'edge'){
        h += '<div class="fields">' + numField('zc-p', 'Pozycja maszynowa ' + ZC.ax, ZC.p, 'przy dotknięciu krawędzi') + numField('zc-d', 'Średnica trzpienia / kulki', ZC.d) + '</div>';
        h += '<div class="field"><span class="lab">Z której strony dotykasz krawędzi?</span><div class="seg" id="zc-side"><button type="button" data-v="-1" aria-pressed="' + (ZC.side == -1) + '">Od strony ' + ZC.ax + '−</button><button type="button" data-v="1" aria-pressed="' + (ZC.side == 1) + '">Od strony ' + ZC.ax + '+</button></div>' +
          '<span class="hint">' + (ZC.ax === 'X' ? 'X− = narzędzie jest z lewej strony krawędzi' : 'Y− = narzędzie zwykle od strony operatora (z przodu)') + '</span></div>';
        h += '<div class="fields">' + numField('zc-ev', 'Krawędź ma mieć w programie ' + ZC.ax + ' =', ZC.ev, 'zwykle 0') + '</div>';
      } else {
        h += '<div class="fields">' + numField('zc-p', 'Pozycja 1 (maszynowa)', ZC.p) + numField('zc-p2', 'Pozycja 2 (maszynowa)', ZC.p2) + numField('zc-d', 'Średnica trzpienia / kulki', ZC.d) + numField('zc-ev', 'Środek ma mieć ' + ZC.ax + ' =', ZC.ev, 'zwykle 0') + '</div>';
        h += '<div class="seg" id="zc-kind"><button type="button" data-v="hole" aria-pressed="' + (ZC.kind === 'hole') + '">Otwór (od środka)</button><button type="button" data-v="boss" aria-pressed="' + (ZC.kind === 'boss') + '">Czop (z zewnątrz)</button></div>';
      }
    } else {
      h += '<div class="fields">' + numField('zc-p', 'Z maszynowe przy dotknięciu', ZC.p, 'kolumna MASZYNA / MKS') + numField('zc-L', 'Długość narzędzia (geometria)', ZC.L, c === 'fanuc' ? 'z tabeli H' : 'z listy narzędzi') +
        numField('zc-b', 'Płytka / wałeczek pod narzędziem', ZC.b, '0 gdy dotykasz bezpośrednio') + numField('zc-ev', 'Powierzchnia ma mieć Z =', ZC.ev, 'zwykle 0') + '</div>';
    }
    h += '<div class="field"><label class="lab" for="zc-wo">Układ</label><div class="num"><input id="zc-wo" class="txt" value="' + esc(ZC.wo) + '" autocapitalize="characters"></div></div>';
    h += '<div id="zc-out"></div>';
    box.innerHTML = h;
    calc();
  }
  function calc(){
    var r = calcZero(ZC), out = '';
    if (r && ZC.ax === 'Z') out = calcResult(esc(ZC.wo) + ' Z — wpisz', f4(r.value), 'Z maszynowe − długość narzędzia − płytka − Z powierzchni. Działa, gdy długości narzędzi są mierzone od nosa wrzeciona (ustawiarka, pomiar na maszynie).');
    else if (r && ZC.m === 'center') out = calcResult(esc(ZC.wo) + ' ' + ZC.ax + ' — wpisz', f4(r.value), 'Środek w ' + ZC.ax + ' maszynowym ' + f4(r.at) + (r.size != null ? '. Zmierzony ' + (ZC.kind === 'hole' ? 'otwór' : 'czop') + ': ' + f4(r.size) + ' mm.' : '.'));
    else if (r) out = calcResult(esc(ZC.wo) + ' ' + ZC.ax + ' — wpisz', f4(r.value), 'Krawędź jest w ' + ZC.ax + ' maszynowym ' + f4(r.at) + ' (pozycja ' + (ZC.side < 0 ? '+' : '−') + ' promień ' + f4(parseNum(ZC.d) / 2) + ').');
    else if (ZC.ax === 'Z' && isFinite(parseNum(ZC.p))) out = '<p class="fine">Wpisz długość narzędzia, którym dotykasz. Jeśli w Twoim zakładzie długość = odległość od G54 (G54 Z = 0), użyj przewodnika „Ustaw długość narzędzia”.</p>';
    if (!out) out = '<p class="fine">Wpisz pozycję maszynową — wynik pojawi się tutaj.</p>';
    box.querySelector('#zc-out').innerHTML = out;
  }
  box.addEventListener('click', function(e){
    var b = e.target.closest('button[data-v]'); if (!b) return;
    var seg = b.parentNode.id, v = b.getAttribute('data-v');
    if (seg === 'zc-ax') ZC.ax = v; else if (seg === 'zc-m') ZC.m = v; else if (seg === 'zc-side') ZC.side = +v; else if (seg === 'zc-kind') ZC.kind = v; else return;
    save(); render();
  });
  box.addEventListener('input', function(e){
    var id = e.target.id, map = {'zc-p':'p', 'zc-p2':'p2', 'zc-d':'d', 'zc-ev':'ev', 'zc-L':'L', 'zc-b':'b', 'zc-wo':'wo'};
    if (map[id]){ ZC[map[id]] = e.target.value; save(); calc(); }
  });
  render();
}

var TC = store.get('tc', {m:'part', p:'', base:'', b:'0', tool:''});
function toolCalc(box){
  var c = ctl();
  function save(){ store.set('tc', TC); }
  function render(){
    var h = '<div class="seg" id="tc-m"><button type="button" data-v="part" aria-pressed="' + (TC.m === 'part') + '">Dotykam detalu (znam G54 Z)</button><button type="button" data-v="zero" aria-pressed="' + (TC.m === 'zero') + '">Długość od G54 (G54 Z = 0)</button></div>';
    h += '<div class="fields">' + numField('tc-p', 'Z maszynowe przy dotknięciu', TC.p, 'kolumna MASZYNA / MKS') +
      numField('tc-b', 'Płytka / wałeczek', TC.b, '0 gdy dotykasz bezpośrednio') +
      (TC.m === 'part' ? numField('tc-base', 'G54 Z (z tabeli układów)', TC.base) : '') +
      '<div class="field"><label class="lab" for="tc-tool">' + (c === 'fanuc' ? 'Numer H' : 'Narzędzie / D') + '</label><div class="num"><input id="tc-tool" class="txt" value="' + esc(TC.tool) + '" placeholder="' + (c === 'fanuc' ? 'np. H5' : 'np. T5 D1') + '" autocapitalize="characters"></div></div></div>';
    h += '<div id="tc-out"></div>';
    box.innerHTML = h; calc();
  }
  function calc(){
    var L = calcToolLen(TC), out;
    if (L != null){
      out = calcResult('Długość ' + (TC.tool ? esc(TC.tool) + ' ' : '') + '— wpisz w ' + (c === 'fanuc' ? 'GEOM (H)' : 'Długość'), f4(L),
        (TC.m === 'part' ? 'Z maszynowe − G54 Z − płytka.' : 'Z maszynowe − płytka (metoda z G54 Z = 0 — długości są ujemne).') + ' Zużycie dla nowego narzędzia ustaw na 0.' +
        (TC.m === 'part' && L <= 0 ? ' Uwaga: wynik ≤ 0 — sprawdź, czy G54 Z i pozycja są z tego samego układu.' : ''));
    } else out = '<p class="fine">Wpisz Z maszynowe' + (TC.m === 'part' ? ' i G54 Z' : '') + ' — wynik pojawi się tutaj.</p>';
    box.querySelector('#tc-out').innerHTML = out;
  }
  box.addEventListener('click', function(e){ var b = e.target.closest('button[data-v]'); if (b && b.parentNode.id === 'tc-m'){ TC.m = b.getAttribute('data-v'); save(); render(); } });
  box.addEventListener('input', function(e){ var map = {'tc-p':'p', 'tc-b':'b', 'tc-base':'base', 'tc-tool':'tool'}; if (map[e.target.id]){ TC[map[e.target.id]] = e.target.value; save(); calc(); } });
  render();
}

/* ----- Wyszukiwarka na ekranie Start: przewodniki, alarmy, kody ----- */
function startSearch(){
  var raw = $('#st-q').value.trim(), q = norm(raw), out = [];
  if (!q){ $('#st-res').hidden = true; $('#st-tasks').hidden = false; return; }
  Object.keys(GUIDES).forEach(function(id){ var G = GUIDES[id]; if (norm(G.title + ' ' + G.sub + ' ' + G.keys).indexOf(q) >= 0) out.push({k:'guide', id:id, t:G.title, s:'Przewodnik'}); });
  var c = ctl();
  (ALARMS[c] || []).forEach(function(a){ if (norm(a.join(' ')).indexOf(q) >= 0) out.push({k:'alarm', q:a[0], t:a[0] + ' — ' + a[2], s:'Alarm ' + (c === 'fanuc' ? 'Fanuc' : 'Sinumerik')}); });
  var M = MACHINE_ALARMS[S.machine];
  if (M && M.ctl === c) M.list.forEach(function(a){ if (norm(a[0] + ' ' + a[1]).indexOf(q) >= 0) out.push({k:'alarm', q:a[0], t:a[0] + ' — ' + a[1], s:'Alarm maszyny'}); });
  CODES.forEach(function(r){ var code = c === 'fanuc' ? r[2] : r[3]; if (norm(code + ' ' + r[1] + ' ' + r[4]).indexOf(q) >= 0) out.push({k:'code', q:code.split(/[ /]/)[0], t:code + ' — ' + r[1], s:'Kod'}); });
  (FULL_CODES[c] || []).forEach(function(r){ if (norm(r[0] + ' ' + r[1]).indexOf(q) >= 0 && !out.some(function(o){ return o.k === 'code' && o.t.indexOf(r[0]) === 0; })) out.push({k:'full', q:r[0], t:r[0] + ' — ' + r[1], s:'Kod (pełna lista)'}); });
  GLOSSARY.forEach(function(g){ if (norm(g[1] + ' ' + g[2]).indexOf(q) >= 0) out.push({k:'term', id:g[0], t:g[1], s:'Pojęcie'}); });
  var looksAlarm = /^\d{3,6}$/.test(raw) && !out.some(function(o){ return o.k === 'alarm'; });
  if (looksAlarm) out.unshift({k:'alarm', q:raw, t:'Alarm ' + raw + ' — poszukaj opisu', s:'Alarm spoza listy'});
  $('#st-tasks').hidden = true; $('#st-res').hidden = false;
  $('#st-res').innerHTML = out.slice(0, 12).map(function(o, i){
    return '<li><button type="button" class="sres" data-ri="' + i + '"><span class="tt"><b>' + esc(o.t) + '</b><small>' + esc(o.s) + '</small></span><span class="chev" aria-hidden="true">›</span></button></li>';
  }).join('') || '<li class="crow"><p class="fine">Nic nie znaleziono. Spróbuj numeru alarmu, kodu (np. G54) albo słowa (np. długość).</p></li>';
  startSearch.res = out;
}
$('#st-q').addEventListener('input', startSearch);
$('#st-res').addEventListener('click', function(e){
  var b = e.target.closest('[data-ri]'); if (!b) return;
  var o = startSearch.res[+b.getAttribute('data-ri')];
  $('#st-q').value = ''; startSearch();
  if (o.k === 'guide') openGuide(o.id);
  else if (o.k === 'term') openTerm(o.id);
  else if (o.k === 'alarm'){ showTab('alarmy'); $('#a-q').value = o.q; renderAlarms(); window.scrollTo(0, 0); }
  else { S.kmode = o.k === 'full' ? 'full' : 'top'; store.set('kmode', S.kmode); S.cat = 'all'; showTab('kody'); $('#c-q').value = o.q; renderCats(); renderCodes(); window.scrollTo(0, 0); }
});

renderStartTasks();

/* Po zmianie maszyny / sterowania odśwież otwarty przewodnik */
var _occGuide = onControlChange;
onControlChange = function(){ _occGuide(); if (curGuide && !$('#tab-guide').hidden) openGuide(curGuide); };
