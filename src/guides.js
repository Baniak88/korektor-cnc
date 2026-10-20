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
    stepsBase: {
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
    keys: 'krancowka overtravel limit os nie rusza ot0500 ot0501 ot0510 ot0511 pre-check pre check 10620 10720 21614 700001 700002 700003 soft hard g54.1',
    steps: {
      fanuc: [
        '<b>OT0510 / OT0511 (PRE-CHECK)</b>: sterowanie sprawdziło blok <b>przed</b> ruchem — oś nie ruszyła. Wystarczy <b>RESET</b>. Policz w kalkulatorze powyżej, dokąd blok chciał jechać, i popraw układ albo program.',
        '<b>Krańcówka programowa</b> (OT0500/OT0501, IE0001…): <b>RESET</b>, potem w <b>HANDLE</b>/<b>JOG</b> odjedź w <b>przeciwnym</b> kierunku.',
        'Sprawdź, dlaczego oś tam jechała: który układ jest aktywny (na ekranie WORK u góry, np. (G54.1P007)), jego wartość, wartość w bloku programu, EXT, G52, numer H dla Z.',
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
    {go:'check', t:'Sprawdź program przed wgraniem', s:'Krańcówki, promień freza, posuw, przejazdy w powietrzu', i:'<path d="M12 3l8 4v5c0 4.4-3.4 8-8 9-4.6-1-8-4.6-8-9V7z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', c:'teal'},
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
    (typeof G.steps === 'function' ? G.steps(c) : G.steps[c]).map(function(s){ return '<li>' + s + '</li>'; }).join('') + '</ol></div>';
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
    var isZ = ZC.ax === 'Z', A = ZC.ax, F = c === 'fanuc';
    var read = F ? 'POS → [WSZYSTKO] / [ALL] → kolumna <b>MASZYNA</b>' : 'okno pozycji przełączone na <b>MKS</b>';
    var how = isZ ? ['Dotknij narzędziem (albo przez płytkę) górnej powierzchni detalu.', 'Odczytaj <b>Z</b> na sterowaniu: ' + read + '.', 'Wpisz Z i długość narzędzia poniżej — dostaniesz liczbę do G54 Z.']
      : ZC.m === 'center' ? ['Dotknij kulką ściany ' + (ZC.kind === 'hole' ? 'otworu' : 'czopu') + ' z jednej strony w osi ' + A + ' i odczytaj <b>' + A + '</b>: ' + read + '.', 'Dotknij przeciwnej ściany i odczytaj drugą liczbę.', 'Wpisz obie liczby poniżej — dostaniesz środek do G54 ' + A + '.']
      : ['Dotknij kulką (trzpieniem) krawędzi detalu.', 'Odczytaj <b>' + A + '</b> na sterowaniu: ' + read + '. To pozycja w chwili dotknięcia.', 'Wpisz ją poniżej i wybierz, z której strony była kulka — dostaniesz liczbę do G54 ' + A + '.'];
    var h = '<ol class="zhow">' + how.map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ol>';
    h += '<div class="seg" id="zc-ax">' + ['X','Y','Z'].map(function(a){ return '<button type="button" data-v="' + a + '" aria-pressed="' + (ZC.ax === a) + '">Oś ' + a + '</button>'; }).join('') + '</div>';
    if (!isZ) h += '<div class="seg" id="zc-m"><button type="button" data-v="edge" aria-pressed="' + (ZC.m === 'edge') + '">Krawędź</button><button type="button" data-v="center" aria-pressed="' + (ZC.m === 'center') + '">Środek otworu / czopu</button></div>';
    h += '<div id="zc-vizslot"></div>';
    var posLab = function(t){ return t + ' <button type="button" class="q" data-term="poz-masz" aria-label="Co to jest pozycja maszynowa?">?</button>'; };
    if (!isZ){
      if (ZC.m === 'edge'){
        var sides = A === 'X' ? ['Kulka z lewej (X−)', 'Kulka z prawej (X+)'] : ['Kulka z przodu (Y−)', 'Kulka z tyłu (Y+)'];
        h += '<div class="field"><span class="lab">Gdzie była kulka względem detalu?</span><div class="seg" id="zc-side"><button type="button" data-v="-1" aria-pressed="' + (ZC.side == -1) + '">' + sides[0] + '</button><button type="button" data-v="1" aria-pressed="' + (ZC.side == 1) + '">' + sides[1] + '</button></div>' +
          (A === 'Y' ? '<span class="hint">Przód = strona operatora.</span>' : '') + '</div>';
        h += '<div class="field"><label class="lab" for="zc-p">' + posLab(A + ' z ekranu MASZYNA') + '</label><div class="num big"><input id="zc-p" inputmode="decimal" autocomplete="off" placeholder="np. −412,500" value="' + esc(ZC.p) + '"><button type="button" class="pm" data-for="zc-p" aria-label="Zmień znak">±</button></div><span class="hint">Pozycja w chwili dotknięcia krawędzi, z minusem jeśli jest.</span></div>';
        h += '<div class="fields">' + numField('zc-d', 'Średnica kulki / trzpienia', ZC.d, 'np. 10 dla trzpienia Ø10') + '</div>';
      } else {
        h += '<div class="seg" id="zc-kind"><button type="button" data-v="hole" aria-pressed="' + (ZC.kind === 'hole') + '">Otwór (od środka)</button><button type="button" data-v="boss" aria-pressed="' + (ZC.kind === 'boss') + '">Czop (z zewnątrz)</button></div>';
        h += '<div class="fields">' + numField('zc-p', A + ' MASZYNA — dotknięcie 1', ZC.p, 'np. −425,000') + numField('zc-p2', A + ' MASZYNA — dotknięcie 2', ZC.p2, 'druga strona') + '</div>';
        h += '<div class="fields">' + numField('zc-d', 'Średnica kulki / trzpienia', ZC.d) + '</div>';
      }
    } else {
      h += '<div class="field"><label class="lab" for="zc-p">' + posLab('Z z ekranu MASZYNA') + '</label><div class="num big"><input id="zc-p" inputmode="decimal" autocomplete="off" placeholder="np. −400,000" value="' + esc(ZC.p) + '"><button type="button" class="pm" data-for="zc-p" aria-label="Zmień znak">±</button></div><span class="hint">Pozycja w chwili dotknięcia powierzchni.</span></div>';
      h += '<div class="fields">' + numField('zc-L', 'Długość narzędzia', ZC.L, F ? 'z tabeli korekcji H (geometria)' : 'z listy narzędzi') + numField('zc-b', 'Płytka pod narzędziem', ZC.b, '0 gdy bez płytki') + '</div>';
    }
    h += '<div id="zc-out"></div>';
    var evOn = parseNum(ZC.ev) ? true : false;
    h += '<details class="more"' + (evOn || ZC.wo !== 'G54' ? ' open' : '') + '><summary>Więcej: inny układ niż G54, przesunięcie bazy</summary><div class="group" style="padding-top:8px"><div class="fields">' +
      numField('zc-ev', (isZ ? 'Powierzchnia' : ZC.m === 'center' ? 'Środek' : 'Krawędź') + ' ma mieć w programie ' + A + ' =', ZC.ev, 'zostaw 0, jeśli baza programu jest na ' + (isZ ? 'tej powierzchni' : ZC.m === 'center' ? 'środku' : 'tej krawędzi')) +
      '<div class="field"><label class="lab" for="zc-wo">Układ</label><div class="num"><input id="zc-wo" class="txt" value="' + esc(ZC.wo) + '" autocapitalize="characters"></div><span class="hint">G54…G59, G54.1 P…</span></div></div></div></details>';
    box.innerHTML = h;
    calc();
  }
  function calc(){
    var r = calcZero(ZC), out = '';
    if (r && ZC.ax === 'Z') out = calcResult(esc(ZC.wo) + ' Z — wpisz', f4(r.value), 'Z maszynowe − długość narzędzia − płytka − Z powierzchni. Działa, gdy długości narzędzi są mierzone od nosa wrzeciona (ustawiarka, pomiar na maszynie).');
    else if (r && ZC.m === 'center') out = calcResult(esc(ZC.wo) + ' ' + ZC.ax + ' — wpisz', f4(r.value), 'Środek w ' + ZC.ax + ' maszynowym ' + f4(r.at) + (r.size != null ? '. Zmierzony ' + (ZC.kind === 'hole' ? 'otwór' : 'czop') + ': ' + f4(r.size) + ' mm.' : '.'));
    else if (r) out = calcResult(esc(ZC.wo) + ' ' + ZC.ax + ' — wpisz', f4(r.value), 'Krawędź jest w ' + ZC.ax + ' maszynowym ' + f4(r.at) + ' (pozycja ' + (ZC.side < 0 ? '+' : '−') + ' promień ' + f4(parseNum(ZC.d) / 2) + ').');
    else if (ZC.ax === 'Z' && isFinite(parseNum(ZC.p))) out = '<p class="fine">Wpisz długość narzędzia, którym dotykasz. Jeśli w Twoim zakładzie długość = odległość od G54 (G54 Z = 0), użyj przewodnika „Ustaw długość narzędzia”.</p>';
    if (!out) out = '<p class="fine zwait">Wpisz pozycję z ekranu MASZYNA — tu pojawi się liczba do wpisania w ' + esc(ZC.wo) + '.</p>';
    else if (parseNum(ZC.ev)) out += '<p class="note-warn">Uwaga: liczysz z przesunięciem — ' + (ZC.ax === 'Z' ? 'powierzchnia' : 'baza') + ' ma mieć ' + ZC.ax + ' = ' + esc(ZC.ev) + ' (pole w „Więcej”). Jeśli baza programu jest na ' + (ZC.ax === 'Z' ? 'tej powierzchni' : 'krawędzi / środku') + ', wpisz tam 0.</p>';
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
    var R = toolRef();
    var h = '<p class="fine tcref">Pomiar w układzie <b>' + R + '</b> (ustawienie maszyny ' + esc(MACHINES[S.machine].short) + ' — zmienisz w „Maszyna i ustawienia”).</p>';
    h += '<div class="seg" id="tc-m"><button type="button" data-v="part" aria-pressed="' + (TC.m === 'part') + '">Znam ' + R + ' Z (z tabeli)</button><button type="button" data-v="zero" aria-pressed="' + (TC.m === 'zero') + '">' + R + ' Z = 0</button></div>';
    h += '<div class="fields">' + numField('tc-p', 'Z maszynowe przy dotknięciu', TC.p, 'kolumna MASZYNA / MKS') +
      numField('tc-b', 'Płytka / wałeczek', TC.b, '0 gdy dotykasz bezpośrednio') +
      (TC.m === 'part' ? numField('tc-base', R + ' Z (z tabeli układów)', TC.base, 'OFFSET/SETTING → ' + R + ', kolumna Z') : '') +
      '<div class="field"><label class="lab" for="tc-tool">' + (c === 'fanuc' ? 'Numer H' : 'Narzędzie / D') + '</label><div class="num"><input id="tc-tool" class="txt" value="' + esc(TC.tool) + '" placeholder="' + (c === 'fanuc' ? 'np. H5' : 'np. T5 D1') + '" autocapitalize="characters"></div></div></div>';
    h += '<div id="tc-out"></div>';
    box.innerHTML = h; calc();
  }
  function calc(){
    var L = calcToolLen(TC), out;
    if (L != null){
      out = calcResult('Długość ' + (TC.tool ? esc(TC.tool) + ' ' : '') + '— wpisz w ' + (c === 'fanuc' ? 'GEOM (H)' : 'Długość'), f4(L),
        (TC.m === 'part' ? 'Z maszynowe − ' + toolRef() + ' Z − płytka.' : 'Z maszynowe − płytka (metoda z ' + toolRef() + ' Z = 0 — długości są ujemne).') + ' Zużycie dla nowego narzędzia ustaw na 0.' +
        (TC.m === 'part' && L <= 0 ? ' Uwaga: wynik ≤ 0 — sprawdź, czy ' + toolRef() + ' Z i pozycja są z tego samego układu.' : ''));
    } else out = '<p class="fine">Wpisz Z maszynowe' + (TC.m === 'part' ? ' i ' + toolRef() + ' Z' : '') + ' — wynik pojawi się tutaj.</p>';
    box.querySelector('#tc-out').innerHTML = out;
  }
  box.addEventListener('click', function(e){ var b = e.target.closest('button[data-v]'); if (b && b.parentNode.id === 'tc-m'){ TC.m = b.getAttribute('data-v'); save(); render(); } });
  box.addEventListener('input', function(e){ var map = {'tc-p':'p', 'tc-b':'b', 'tc-base':'base', 'tc-tool':'tool'}; if (map[e.target.id]){ TC[map[e.target.id]] = e.target.value; save(); calc(); } });
  render();
}

/* ----- Wyszukiwarka na ekranie Start: przewodniki, alarmy, kody ----- */
function startSearch(){
  var raw = $('#st-q').value.trim(), q = norm(raw), out = [];
  renderStartRecentA();
  if (!q){ $('#st-res').hidden = true; $('#st-tasks').hidden = false; return; }
  var c = ctl(), F = findAlarms(raw, c), cards = '', hit = '';
  /* Ten sam numer alarmu: od razu cała karta, bez dodatkowego dotknięcia */
  F.std.forEach(function(x){ if (x.s === 0){ cards += alarmStdCard(x.a, c, true); hit = hit || x.a[0]; } });
  if (F.M) F.mach.forEach(function(x){ if (x.s === 0){ cards += alarmMachCard(x.a, F.M, true); hit = hit || x.a[0]; } });
  if (!cards && /^[A-Za-z]{0,3}\s*\d{3,6}$/.test(raw)){ cards = alarmLookupCard(raw, c); if (cards) hit = alarmKey(raw).n; }
  rememberHitSoon(hit);
  Object.keys(GUIDES).forEach(function(id){ var G = GUIDES[id]; if (norm(G.title + ' ' + G.sub + ' ' + G.keys).indexOf(q) >= 0) out.push({k:'guide', id:id, t:G.title, s:'Przewodnik'}); });
  F.std.forEach(function(x){ if (x.s > 0) out.push({k:'alarm', q:x.a[0], t:x.a[0] + ' — ' + x.a[2], s:'Alarm ' + (c === 'fanuc' ? 'Fanuc' : 'Sinumerik')}); });
  F.mach.forEach(function(x){ if (x.s > 0) out.push({k:'alarm', q:x.a[0], t:x.a[0] + ' — ' + x.a[1], s:'Alarm maszyny'}); });
  CODES.forEach(function(r){ var code = c === 'fanuc' ? r[2] : r[3]; if (norm(code + ' ' + r[1] + ' ' + r[4]).indexOf(q) >= 0) out.push({k:'code', q:code.split(/[ /]/)[0], t:code + ' — ' + r[1], s:'Kod'}); });
  (FULL_CODES[c] || []).forEach(function(r){ if (norm(r[0] + ' ' + r[1]).indexOf(q) >= 0 && !out.some(function(o){ return o.k === 'code' && o.t.indexOf(r[0]) === 0; })) out.push({k:'full', q:r[0], t:r[0] + ' — ' + r[1], s:'Kod (pełna lista)'}); });
  GLOSSARY.forEach(function(g){ if (norm(g[1] + ' ' + g[2]).indexOf(q) >= 0) out.push({k:'term', id:g[0], t:g[1], s:'Pojęcie'}); });
  $('#st-tasks').hidden = true; $('#st-res').hidden = false;
  $('#st-res').innerHTML = cards + out.slice(0, cards ? 6 : 12).map(function(o, i){
    return '<li><button type="button" class="sres" data-ri="' + i + '"><span class="tt"><b>' + esc(o.t) + '</b><small>' + esc(o.s) + '</small></span><span class="chev" aria-hidden="true">›</span></button></li>';
  }).join('') || '<li class="crow"><p class="fine">Nic nie znaleziono. Spróbuj numeru alarmu, kodu (np. G54) albo słowa (np. długość).</p></li>';
  startSearch.res = out;
}
function renderStartRecentA(){
  var box = $('#st-ralarm'), html = $('#st-q').value.trim() ? '' : recentChips('data-strecent');
  box.innerHTML = html; box.hidden = !html;
}
$('#st-ralarm').addEventListener('click', function(e){
  var b = e.target.closest('[data-strecent]'); if (!b) return;
  $('#st-q').value = b.getAttribute('data-strecent'); startSearch(); window.scrollTo(0, 0);
});
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

/* ===== Rysunek 3D (rzut ukośny) do kalkulatorów punktu zerowego i długości narzędzia =====
   Schemat, nie w skali — liczby na rysunku są z kalkulatora. */
function zvNum(v){ return isFinite(v) ? String(Math.round(v * 1000) / 1000).replace('.', ',').replace('-', '−') : '?'; }
function zeroVizSvg(o){
  var W = 320, H = 190, ca = Math.cos(0.62) * 0.5, sa = Math.sin(0.62) * 0.5, S = 2.05, OX = 62, OY = 168;
  function P(x, y, z){ return [OX + (x + y * ca) * S, OY - (z + 26 + y * sa) * S]; }
  function pts(a){ return a.map(function(p){ var q = P(p[0], p[1], p[2]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
  function poly(a, cls){ return '<polygon class="' + cls + '" points="' + pts(a) + '"/>'; }
  function ln(a, b, cls){ var p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]); return '<line class="' + cls + '" x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'; }
  function tx(p, t, cls, anchor){ var q = P(p[0], p[1], p[2]); return '<text class="' + cls + '" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" text-anchor="' + (anchor || 'middle') + '">' + t + '</text>'; }
  function box(x0, y0, z0, x1, y1, z1, cls){
    return poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], cls + ' zv-top') + poly([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], cls + ' zv-front') + poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], cls + ' zv-side');
  }
  function circ(cx, cy, z, r){ var a = []; for (var i = 0; i < 40; i++){ var t = i / 40 * Math.PI * 2; a.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z]); } return a; }
  function cyl(cx, cy, z0, z1, r, cls){
    var a = [], n = 40, i, t;
    for (i = 0; i <= n / 2; i++){ t = Math.PI * 0.86 + i / n * Math.PI * 2; a.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z0]); }
    for (i = n / 2; i >= 0; i--){ t = Math.PI * 0.86 + i / n * Math.PI * 2; a.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z1]); }
    return poly(a, cls + ' zv-front') + poly(circ(cx, cy, z1, r), cls + ' zv-top');
  }
  function probe(x, y, z, r){
    var q = P(x, y, z), top = P(x, y, z + 30);
    return '<line class="zv-stylus" x1="' + q[0].toFixed(1) + '" y1="' + q[1].toFixed(1) + '" x2="' + top[0].toFixed(1) + '" y2="' + top[1].toFixed(1) + '"/>' +
      '<circle class="zv-ball" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (r * S).toFixed(1) + '"/>';
  }
  function mark(p, n, dx, dy){ var q = P(p[0], p[1], p[2]), x = q[0] + (dx || 0), y = q[1] + (dy || 0); return '<g class="zv-mk"><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="8.5"/><text x="' + x.toFixed(1) + '" y="' + (y + 3.8).toFixed(1) + '" text-anchor="middle">' + n + '</text></g>'; }
  function origin(x, y, z){
    return ln([x, y, z], [x + 16, y, z], 'zv-ax') + ln([x, y, z], [x, y + 20, z], 'zv-ax') + ln([x, y, z], [x, y, z + 16], 'zv-ax') +
      '<circle class="zv-o" cx="' + P(x, y, z)[0].toFixed(1) + '" cy="' + P(x, y, z)[1].toFixed(1) + '" r="3.4"/>' +
      tx([x + 18, y, z - 1], 'X', 'zv-axl', 'start') + tx([x + 1, y + 22, z], 'Y', 'zv-axl', 'start') + tx([x, y, z + 18], 'Z', 'zv-axl');
  }
  var h = '', leg = [], r = 5, ax = o.ax, val = function(v, pre){ return '<b class="mono">' + (pre || '') + zvNum(v) + '</b>'; };
  if (ax === 'Z'){
    var bz = o.b > 0 ? 4 : 0, tool = o.mode === 'tool';
    h += box(0, 0, -26, 80, 40, 0, 'zv-part');
    h += origin(0, 0, 0);
    if (bz) h += box(31, 12, 0, 49, 28, bz, 'zv-gauge');
    h += cyl(40, 20, bz, bz + 30, 6, 'zv-tool');
    var hq = P(40, 20, bz + 30);
    h += '<rect class="zv-holder" x="' + (hq[0] - 17).toFixed(1) + '" y="' + (hq[1] - 26).toFixed(1) + '" width="34" height="26" rx="4"/>';
    h += ln([58, 20, bz + 30], [58, 20, bz], 'zv-dimln') + mark([40, 20, bz + 30], 1, 30, -18) + (bz ? mark([49, 12, bz / 2], 2, 16, 0) : '') + mark([58, 20, bz + 15], 3, 12, 0) + mark([0, 0, 0], 4, -16, 8);
    leg.push([1, 'Z maszynowe przy dotknięciu', val(o.p)]);
    if (bz) leg.push([2, 'Płytka / wałeczek', val(o.b)]);
    if (tool){ leg.push([3, 'Długość narzędzia — wpisz', '<b class="mono zv-ok">' + zvNum(o.res) + '</b>']); leg.push([4, toolRef() + ' Z (z tabeli)', val(o.base)]); }
    else { leg.push([3, 'Długość narzędzia (z tabeli)', val(o.L)]); leg.push([4, (o.wo || 'G54') + ' Z — wpisz', '<b class="mono zv-ok">' + zvNum(o.res) + '</b>']); }
  } else if (o.m === 'center'){
    var isX = ax === 'X', R = 15, cx = 40, cy = 20, boss = o.kind === 'boss';
    h += box(0, 0, -26, 80, 40, 0, 'zv-part');
    if (boss) h += cyl(cx, cy, 0, 10, R, 'zv-part');
    else h += poly(circ(cx, cy, 0, R), 'zv-hole') + poly(circ(cx, cy - 3, -9, R * 0.92), 'zv-holein');
    var zt = boss ? 5 : -2, off = boss ? R + r : R - r;
    var p1 = isX ? [cx - off, cy, zt] : [cx, cy - off, zt], p2 = isX ? [cx + off, cy, zt] : [cx, cy + off, zt];
    h += probe(p1[0], p1[1], p1[2], r) + probe(p2[0], p2[1], p2[2], r);
    h += origin(cx, cy, boss ? 10 : 0);
    h += mark(p1, 1, -14, -14) + mark(p2, 2, 14, -14) + mark([cx, cy, boss ? 10 : 0], 3, 0, 16);
    leg.push([1, 'Pozycja 1 (maszynowa ' + ax + ')', val(o.p)]);
    leg.push([2, 'Pozycja 2 (maszynowa ' + ax + ')', val(o.p2)]);
    leg.push([3, 'Środek → ' + (o.wo || 'G54') + ' ' + ax + ' — wpisz', '<b class="mono zv-ok">' + zvNum(o.res) + '</b>']);
    if (isFinite(o.size)) leg.push(['', (boss ? 'Zmierzony czop' : 'Zmierzony otwór'), val(o.size, 'Ø')]);
  } else {
    var isX2 = ax === 'X', left = o.side < 0, ex, ey, pp;
    h += box(0, 0, -26, 80, 40, 0, 'zv-part');
    if (isX2){ ex = left ? 0 : 80; pp = [left ? -r : 80 + r, 0, -7]; h += ln([ex, 0, -30], [ex, 0, 10], 'zv-edge'); }
    else { ey = left ? 0 : 40; pp = [62, left ? -r * 2.2 : 40 + r, -7]; h += ln([-8, ey, 0], [92, ey, 0], 'zv-edge'); }
    var ox = isX2 ? ex : 62, oy = isX2 ? 20 : ey;
    h += origin(isX2 ? ex : 30, isX2 ? 20 : ey, 0);
    h += probe(pp[0], pp[1], pp[2], r);
    h += mark(pp, 1, left ? -16 : 16, -14) + mark(isX2 ? [ex, 0, -26] : [92, ey, 0], 2, isX2 ? (left ? -12 : 12) : 10, isX2 ? 8 : 0);
    leg.push([1, ax + ' MASZYNA — kulka Ø' + zvNum(o.d) + ' od strony ' + ax + (left ? '−' : '+'), val(o.p)]);
    leg.push([2, 'Krawędź detalu → ' + (o.wo || 'G54') + ' ' + ax + ' — wpisz', '<b class="mono zv-ok">' + zvNum(o.res) + '</b>']);
  }
  return '<div class="zvwrap"><svg class="zviz" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Rysunek: gdzie dotykasz i gdzie jest punkt zerowy">' + h + '</svg>' +
    '<ul class="zvleg">' + leg.map(function(l){ return '<li>' + (l[0] !== '' ? '<span class="zv-n">' + l[0] + '</span>' : '<span></span>') + '<span>' + l[1] + '</span>' + l[2] + '</li>'; }).join('') + '</ul>' +
    '<p class="fine zvnote">Rysunek poglądowy, nie w skali. Zielony znak to punkt zerowy detalu (X, Y, Z).' + (ax === 'Y' ? ' Y− = strona operatora.' : '') + '</p></div>';
}
/* ===== Rysunek 3D w kalkulatorach — ten sam silnik i kolory co symulacja ===== */
var ZV = {node:null, s3:null, labels:[]};
function zvNode(){
  if (ZV.node) return ZV.node;
  var n = document.createElement('div'); n.className = 'zvwrap';
  n.innerHTML = '<div class="zv3"><div class="zv3c"></div><div class="zv3lab" aria-hidden="true"></div><button type="button" class="zv3reset" aria-label="Widok od nowa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2-5"/><path d="M5 4v4h4"/></svg></button></div><ul class="zvleg"></ul><p class="fine zvnote"></p>';
  ZV.node = n;
  ZV.s3 = new Sim3D(n.querySelector('.zv3c'), {noPick:true, cam:{yaw:-1.2, pitch:0.48, zoom:1.18}, onFrame:zvPlace});
  n.querySelector('.zv3reset').addEventListener('click', function(){ ZV.s3.reset(); });
  return n;
}
function zvPlace(){
  ZV.labels.forEach(function(l){
    var q = ZV.s3.project(l.p), e = ZV.s3.eye();
    if (q && l.nrm && e && (l.nrm[0] * (e[0] - l.p[0]) + l.nrm[1] * (e[1] - l.p[1]) + l.nrm[2] * (e[2] - l.p[2])) <= 0) q = null;
    if (!q){ l.el.style.display = 'none'; return; }
    l.el.style.display = '';
    var x = q[0] + (l.dx || 0), y = q[1] + (l.dy || 0), pw = l.el.parentNode.clientWidth, hw = l.el.offsetWidth / 2 + 4;
    if (l.txt) x = Math.max(hw, Math.min(pw - hw, x));
    l.el.style.left = x.toFixed(1) + 'px'; l.el.style.top = y.toFixed(1) + 'px';
  });
}
function zvScene(o){
  var W = 80, D = 50, H = 25, cx = 40, cy = 25, it = [], lab = [], leg = [], r = 5, ax = o.ax;
  var st = makeStock(0, 0, W, D, 0, -H, 170), i, j, k;
  function setZ(fn){ for (j = 0; j < st.ny; j++) for (i = 0; i < st.nx; i++){ k = j * st.nx + i; var z = fn(st.x0 + i * st.cell, st.y0 + j * st.cell); if (z != null) st.z[k] = z; } }
  function probe(p){ it.push({t:'cyl', p:[p[0], p[1], p[2] + r * 0.6], r:1.4, h:30, c:'rapid'}); it.push({t:'sph', p:p, r:r, c:'tool'}); }
  function origin(p){
    it.push({t:'sph', p:p, r:1.7, c:'mark'});
    it.push({t:'cyl', p:p, ax:[1, 0, 0], r:0.6, h:16, c:'mark'}); it.push({t:'cyl', p:p, ax:[0, 1, 0], r:0.6, h:16, c:'mark'}); it.push({t:'cyl', p:p, ax:[0, 0, 1], r:0.6, h:16, c:'mark'});
  }
  var val = function(v, pre){ return '<b class="mono">' + (pre || '') + zvNum(v) + '</b>'; }, ok = function(v){ return '<b class="mono zv-ok">' + zvNum(v) + '</b>'; };
  // Strzałki osi maszyny z opisem plus / minus
  function arrow(p0, p1){
    var d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], L = Math.hypot(d[0], d[1], d[2]), u = [d[0] / L, d[1] / L, d[2] / L];
    it.push({t:'cyl', p:p0, ax:u, r:0.55, h:L - 5, c:'path'});
    it.push({t:'cone', p:[p1[0] - u[0] * 5, p1[1] - u[1] * 5, p1[2] - u[2] * 5], ax:u, r:2, h:5, c:'path'});
  }
  // Mały kompas osi maszyny (tylny lewy róg) i opisy stron detalu
  var yaw = -1.2;
  if (o.m !== 'center' && ax === 'X' && o.side < 0) yaw = -1.95;
  if (o.m !== 'center' && ax === 'Y' && o.side > 0) yaw = 1.15;
  var kp = [Math.cos(yaw) > 0 ? -8 : W + 8, Math.sin(yaw) > 0 ? -8 : D + 8, 0];
  arrow(kp, [kp[0] + 20, kp[1], kp[2]]); arrow(kp, [kp[0], kp[1] + 20, kp[2]]); arrow(kp, [kp[0], kp[1], kp[2] + 20]);
  lab.push({txt:'X+', p:[kp[0] + 25, kp[1], kp[2]], cls:'zv3p'}); lab.push({txt:'Y+', p:[kp[0], kp[1] + 25, kp[2]], cls:'zv3p'}); lab.push({txt:'Z+', p:[kp[0], kp[1], kp[2] + 25], cls:'zv3p'});
  lab.push({txt:'strona X−', p:[0, D * 0.55, -H * 0.72], nrm:[-1, 0, 0], cls:'zv3n'}); lab.push({txt:'strona X+', p:[W, D * 0.55, -H * 0.72], nrm:[1, 0, 0], cls:'zv3n'});
  lab.push({txt:'strona Y− (operator)', p:[W / 2, 0, -H * 0.72], nrm:[0, -1, 0], cls:'zv3n'}); lab.push({txt:'strona Y+', p:[W / 2, D, -H * 0.72], nrm:[0, 1, 0], cls:'zv3n'});
  if (ax === 'Z'){
    var bz = o.b > 0 ? 4 : 0, tool = o.mode === 'tool';
    if (bz) it.push({t:'box', a:[31, 16, 0], b:[49, 34, bz], c:'hole'});
    it.push({t:'cyl', p:[cx, cy, bz], r:5, h:26, c:'tool'});
    it.push({t:'cyl', p:[cx, cy, bz + 26], r:10, h:12, c:'rapid'});
    origin([0, 0, 0]);
    lab.push({n:1, p:[cx, cy, bz + 38], dx:22}); if (bz) lab.push({n:2, p:[49, 16, bz / 2], dx:14}); lab.push({n:3, p:[cx, cy, bz + 13], dx:18}); lab.push({n:4, p:[0, 0, 0], dx:-14, dy:10});
    leg.push([1, 'Z maszynowe przy dotknięciu', val(o.p)]);
    if (bz) leg.push([2, 'Płytka / wałeczek', val(o.b)]);
    if (tool){ leg.push([3, 'Długość narzędzia — wpisz', ok(o.res)]); leg.push([4, toolRef() + ' Z (z tabeli)', val(o.base)]); }
    else { leg.push([3, 'Długość narzędzia (z tabeli)', val(o.L)]); leg.push([4, (o.wo || 'G54') + ' Z — wpisz', ok(o.res)]); }
  } else if (o.m === 'center'){
    var isX = ax === 'X', R = 15, boss = o.kind === 'boss', zt = boss ? -6 : -6, off = boss ? R + r : R - r;
    if (boss) setZ(function(x, y){ return Math.hypot(x - cx, y - cy) > R ? -12 : null; });
    else setZ(function(x, y){ return Math.hypot(x - cx, y - cy) <= R ? -16 : null; });
    for (k = 0; k < st.z.length; k++) if (st.z[k] < 0) st.mark[k] = 1;
    var p1 = isX ? [cx - off, cy, zt] : [cx, cy - off, zt], p2 = isX ? [cx + off, cy, zt] : [cx, cy + off, zt];
    probe(p1); probe(p2);
    origin([cx, cy, 0]);
    lab.push({n:1, p:[p1[0], p1[1], p1[2] + 30], dx:-12}); lab.push({n:2, p:[p2[0], p2[1], p2[2] + 30], dx:12}); lab.push({n:3, p:[cx, cy, 0], dx:0, dy:16});
    leg.push([1, 'Pozycja 1 (maszynowa ' + ax + ')', val(o.p)]);
    leg.push([2, 'Pozycja 2 (maszynowa ' + ax + ')', val(o.p2)]);
    leg.push([3, 'Środek → ' + (o.wo || 'G54') + ' ' + ax + ' — wpisz', ok(o.res)]);
    if (isFinite(o.size)) leg.push(['', boss ? 'Zmierzony czop' : 'Zmierzony otwór', val(o.size, 'Ø')]);
  } else {
    var left = o.side < 0, pp, edgeA, edgeB, org;
    if (ax === 'X'){
      var ex = left ? 0 : W; pp = [left ? -r : W + r, cy, -7];
      it.push({t:'box', a:[ex - 0.5, -0.5, -0.5], b:[ex + 0.5, D + 0.5, 0.5], c:'bad'}); it.push({t:'box', a:[ex - 0.5, -0.5, -H], b:[ex + 0.5, 0.5, 0.5], c:'bad'});
      org = [ex, 0, 0];
    } else {
      var ey = left ? 0 : D; pp = [cx, left ? -r : D + r, -7];
      it.push({t:'box', a:[-0.5, ey - 0.5, -0.5], b:[W + 0.5, ey + 0.5, 0.5], c:'bad'});
      org = [0, ey, 0];
    }
    probe(pp); origin(org);
    lab.push({n:1, p:[pp[0], pp[1], pp[2] + 30], dx:left ? -14 : 14}); lab.push({n:2, p:org, dx:-14, dy:12});
    leg.push([1, ax + ' MASZYNA — kulka Ø' + zvNum(o.d) + ' od strony ' + ax + (left ? '−' : '+'), val(o.p)]);
    leg.push([2, 'Krawędź detalu → ' + (o.wo || 'G54') + ' ' + ax + ' — wpisz', ok(o.res)]);
  }
  return {st:st, items:it, labels:lab, leg:leg, yaw:yaw};
}
function zeroViz3(container, before, o){
  var n = zvNode();
  if (n.parentNode !== container || n.nextSibling !== before) container.insertBefore(n, before);
  if (!ZV.s3.ok){ n.innerHTML = zeroVizSvg(o); return; }
  var sc = zvScene(o), key = o.ax + o.m + o.kind + o.side + (o.b > 0) + o.mode;
  ZV.s3.setStock(sc.st, ZV.key === key);
  ZV.s3.setExtras(sc.items);
  ZV.s3.frameBox([-8, -8, -26], [88, 66, o.ax === 'Z' ? 44 : 30]);
  if (ZV.key !== key){
    ZV.s3.setCam({yaw:sc.yaw, pitch:0.5, zoom:0.8});
  }
  ZV.key = key;
  var lb = n.querySelector('.zv3lab');
  lb.innerHTML = sc.labels.map(function(l){ return l.txt ? '<span class="zv3t ' + (l.cls || '') + '">' + l.txt + '</span>' : '<span class="zv3m">' + l.n + '</span>'; }).join('');
  ZV.labels = sc.labels.map(function(l, i){ l.el = lb.children[i]; return l; });
  n.querySelector('.zvleg').innerHTML = sc.leg.map(function(l){ return '<li>' + (l[0] !== '' ? '<span class="zv-n">' + l[0] + '</span>' : '<span></span>') + '<span>' + l[1] + '</span>' + l[2] + '</li>'; }).join('');
  n.querySelector('.zvnote').textContent = 'Niebieskie strzałki to kierunki plus osi maszyny: X+ w prawo, Y+ od operatora do tyłu, Z+ w górę. Na ścianach detalu opis, która to strona. Zielony znak to punkt zerowy detalu, czerwona linia — krawędź, której dotykasz. Przeciągnij, żeby obrócić. Rysunek nie w skali.';
  ZV.s3.draw();
}
(function(){
  var _zc = zeroCalc, _tc = toolCalc;
  zeroCalc = function(box){
    _zc(box);
    function upd(){
      var out = box.querySelector('#zc-out'); if (!out) return;
      var r = calcZero(ZC) || {};
      var slot = box.querySelector('#zc-vizslot');
      zeroViz3(slot.parentNode, slot, {ax:ZC.ax, m:ZC.m, side:+ZC.side, d:parseNum(ZC.d), p:parseNum(ZC.p), p2:parseNum(ZC.p2), L:parseNum(ZC.L), b:parseNum(ZC.b) || 0, wo:esc(ZC.wo), kind:ZC.kind, res:r.value, size:r.size});
    }
    box.addEventListener('input', function(){ setTimeout(upd, 0); });
    box.addEventListener('click', function(){ setTimeout(upd, 0); });
    upd();
  };
  toolCalc = function(box){
    _tc(box);
    function upd(){
      var out = box.querySelector('#tc-out'); if (!out) return;
      zeroViz3(out.parentNode, out, {ax:'Z', mode:'tool', p:parseNum(TC.p), b:parseNum(TC.b) || 0, base:TC.m === 'part' ? parseNum(TC.base) : 0, res:calcToolLen(TC)});
    }
    box.addEventListener('input', function(){ setTimeout(upd, 0); });
    box.addEventListener('click', function(){ setTimeout(upd, 0); });
    upd();
  };
})();

/* Długość narzędzia: kroki zależne od układu pomiaru maszyny (np. Quaser — G59) */
GUIDES.tool.steps = function(c){
  var R = toolRef(), base = GUIDES.tool.stepsBase[c].slice();
  if (R === 'G54') return base;
  var pre = c === 'fanuc'
    ? 'Na tej maszynie długość mierzysz w układzie <b>' + R + '</b>. W <b>MDI</b> wpisz <b>G90 ' + R + '</b> i <b>CYCLE START</b> — sprawdź na ekranie pozycji, że aktywny jest ' + R + '.'
    : 'Na tej maszynie długość mierzysz w przesunięciu <b>' + R + '</b>. W <b>MDA</b> wpisz <b>' + R + '</b> i <b>NC Start</b>.';
  base.splice(1, 0, pre);
  base.splice(4, 0, 'Do kalkulatora wpisz <b>' + R + ' Z</b> z tabeli układów (OFFSET/SETTING → [UKŁ.WSP] / [WORK] → ' + R + ', kolumna Z). Długość = Z maszynowe − ' + R + ' Z − płytka.');
  return base;
};

/* Krańcówka: kalkulator „dokąd chciał jechać blok” (przesunięcie układu + wartość w programie + EXT/G52) */
var OTC = store.get('otc', {ax:'X', wo:'', prog:'', ext:'0', pos:''});
GUIDES.limit.render = function(box){
  function save(){ store.set('otc', OTC); }
  function render(){
    var h = '<span class="glab">Dokąd chciał jechać blok?</span><div class="calc">' +
      '<div class="seg" id="ot-ax">' + ['X', 'Y', 'Z'].map(function(a){ return '<button type="button" data-v="' + a + '" aria-pressed="' + (OTC.ax === a) + '">Oś ' + a + '</button>'; }).join('') + '</div>' +
      '<div class="fields">' + numField('ot-wo', 'Układ (G54… / G54.1 P…) ' + OTC.ax, OTC.wo, 'z ekranu WORK, aktywny układ') + numField('ot-prog', OTC.ax + ' w bloku programu', OTC.prog, 'blok z alarmu (N…)') +
      numField('ot-ext', 'EXT / G52 ' + OTC.ax, OTC.ext, 'zwykle 0') + numField('ot-pos', OTC.ax + ' MASZYNA teraz', OTC.pos, 'opcjonalnie, z POS → ALL') + '</div>' +
      '<div id="ot-out"></div></div>';
    box.innerHTML = h; calc();
  }
  function calc(){
    var wo = parseNum(OTC.wo), pg = parseNum(OTC.prog), ex = parseNum(OTC.ext) || 0, pos = parseNum(OTC.pos), out;
    if (isFinite(wo) && isFinite(pg)){
      var t = wo + pg + ex;
      out = calcResult('Cel w ' + OTC.ax + ' MASZYNA', f4(t), 'Układ ' + f4(wo) + ' + program ' + f4(pg) + (ex ? ' + EXT/G52 ' + f4(ex) : '') + '. Jeśli to jest za końcem ruchu osi, sterowanie da OT05xx. ' +
        (isFinite(pos) ? 'Teraz oś jest w ' + f4(pos) + ' — blok chciał jechać o ' + f4(t - pos) + ' (' + (t < pos ? 'w stronę −' : 'w stronę +') + ').' : '') +
        ' Zakres ruchu: dojedź ręcznie do końca i odczytaj MASZYNA (krańcówki programowe są w parametrach, zwykle 1320/1321 na Fanuc — sprawdź w dokumentacji).');
      if (OTC.ax !== 'Z' && Math.abs(t - pos) > 0 && isFinite(pos) && Math.abs(t - pos) > 600) out += '<p class="note-warn">Bardzo duży ruch — sprawdź, czy program jest dla tego układu (inny numer P / inna paleta).</p>';
    } else out = '<p class="fine">Wpisz wartość układu dla osi z alarmu i wartość z bloku programu.</p>';
    box.querySelector('#ot-out').innerHTML = out;
  }
  box.addEventListener('click', function(e){ var b = e.target.closest('#ot-ax [data-v]'); if (b){ OTC.ax = b.getAttribute('data-v'); save(); render(); } });
  box.addEventListener('input', function(e){ var m = {'ot-wo':'wo', 'ot-prog':'prog', 'ot-ext':'ext', 'ot-pos':'pos'}[e.target.id]; if (m){ OTC[m] = e.target.value; save(); calc(); } });
  render();
};
