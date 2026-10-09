var MACHINES = {
  chiron: {
    name:'Chiron FZ12', short:'FZ12', def:'sinumerik', fiveAxis:false, rot:['A','B','C'], type:'Pionowe centrum obróbcze, wersje 3- i 5-osiowe',
    ctlNote:'Najczęściej Siemens Sinumerik 840D. Spotykane też wersje z Fanuc.',
    specs:[['Przesuwy X/Y/Z','ok. 500–550 / 300–400 / 280–550 mm (zależnie od wersji)'],['Wrzeciono','HSK50, SK40 lub ISO30; do ok. 15 000 obr/min'],['Magazyn','koszykowy, 20–64 miejsc'],['Wersje','m.in. W, KW (dwie palety), KS i FX (5 osi)']],
    tips:['Sinumerik: korekcja długości i promienia włącza się z T i D. D0 wyłącza korekcję.','Przy zarządzaniu narzędziami narzędzie bywa wywoływane nazwą: T="NAZWA" M6.','Zużycie (ΔL, ΔR) wpisujesz dla konkretnego ostrza D danego narzędzia.']
  },
  matsuura: {
    name:'Matsuura MX-330', short:'MX-330', def:'fanuc', fiveAxis:true, rot:['A','C'], type:'Centrum 5-osiowe z magazynem palet (PC10)',
    ctlNote:'Matsuura G-Tech 31i, zbudowane na Fanuc 31i.',
    specs:[['Przesuwy X/Y/Z','435 / 465 / 560 mm'],['Osie obrotowe','A (wychylna) + C 360°'],['Wrzeciono','BT40, 15 000 obr/min (opcja 20 000)'],['Magazyn','90 narzędzi'],['Detal maks.','Ø330 × 300 mm, 80 kg'],['Palety','10 (Capto C6)']],
    tips:['Maszyna 5-osiowa: oś A wychyla stół, oś C go obraca. Obróbka 3+2 (płaszczyzna pochylona) albo 5 osi naraz z TCP.','Płaszczyzna pochylona: G68.2 + G53.1, cofnięcie G69. TCP: G43.4, anulowanie G49.','Przy pochylonym narzędziu korekcja długości działa wzdłuż osi narzędzia, a nie wzdłuż Z stołu.','Na pochylonej płaszczyźnie X/Y korekcji i programu dotyczą tej płaszczyzny, nie stołu.','Przy kilku paletach sprawdź, który układ (G54… / G54.1 Pn) używa dana paleta.']
  },
  quaser: {
    name:'Quaser MV184', short:'MV184', def:'fanuc', fiveAxis:false, rot:['A','B','C'], type:'Pionowe centrum obróbcze',
    ctlNote:'Zwykle Fanuc (np. 31i-MB lub 0i, zależnie od rocznika). Spotykane też Heidenhain i Siemens.',
    specs:[['Przesuwy X/Y/Z','ok. 1020 / 610 / 610 mm'],['Wrzeciono','stożek 40, typowo 15 000 obr/min'],['Magazyn','np. 30 narzędzi (zależnie od wersji)']],
    tips:['Długie detale mierz po ostygnięciu. Stal rośnie ok. 0,012 mm na metr na każdy °C, aluminium ok. 0,023 mm.','Fanuc: klawisz [+WPROWADŹ] / [+INPUT] dodaje wpisaną wartość do obecnej korekcji.']
  }
};

var SAMPLES = {
  fanuc5: [
    'O2001 (MX-330 KIESZEN NA SCIANIE POD 30 STOPNI)',
    'G21 G17 G40 G49 G80 G90',
    'T5 M06 (FREZ D10)',
    'G54',
    'G68.2 X0 Y0 Z0 I0 J-30. K0 (PLASZCZYZNA POCHYLONA)',
    'G53.1 (USTAW OSIE A I C)',
    'G00 X0. Y0. S6000 M03',
    'G43 H5 Z50. M08',
    'Z2.',
    'G01 Z-5. F300',
    'G41 D5 X15. Y0. F800',
    'Y8.',
    'G03 X10. Y13. R5.',
    'G01 X-10.',
    'G03 X-15. Y8. R5.',
    'G01 Y-8.',
    'G03 X-10. Y-13. R5.',
    'G01 X10.',
    'G03 X15. Y-8. R5.',
    'G01 Y0.',
    'G40 X0.',
    'G00 Z50. M09',
    'G69 (KONIEC PLASZCZYZNY POCHYLONEJ)',
    'G49',
    'G91 G28 Z0.',
    'G90',
    'M30'
  ].join('\n'),
  fanuc: [
    'O1001 (KIESZEN 40X30 R5)',
    'G21 G17 G40 G49 G80 G90',
    'T5 M06 (FREZ D10)',
    'G54 G00 X0. Y0. S6000 M03',
    'G43 H5 Z50. M08',
    'Z2.',
    'G01 Z-8. F300',
    'G41 D5 X20. Y0. F800',
    'Y10.',
    'G03 X15. Y15. R5.',
    'G01 X-15.',
    'G03 X-20. Y10. R5.',
    'G01 Y-10.',
    'G03 X-15. Y-15. R5.',
    'G01 X15.',
    'G03 X20. Y-10. R5.',
    'G01 Y0.',
    'G40 X0.',
    'G00 Z50. M09',
    'G91 G28 Z0.',
    'M30'
  ].join('\n'),
  sinumerik: [
    '; KIESZEN 40X30 R5',
    'N10 G17 G90 G71 G40',
    'N20 T5 M6 ; FREZ D10',
    'N30 D1 G54 G0 X0 Y0 S6000 M3',
    'N40 Z50 M8',
    'N50 Z2',
    'N60 G1 Z-8 F300',
    'N70 G41 X20 Y0 F800',
    'N80 Y10',
    'N90 G3 X15 Y15 CR=5',
    'N100 G1 X-15',
    'N110 G3 X-20 Y10 CR=5',
    'N120 G1 Y-10',
    'N130 G3 X-15 Y-15 CR=5',
    'N140 G1 X15',
    'N150 G3 X20 Y-10 CR=5',
    'N160 G1 Y0',
    'N170 G40 X0',
    'N180 G0 Z50 M9',
    'N190 SUPA G0 Z0 D0',
    'N200 M30'
  ].join('\n')
};


var ALARMS = {
  fanuc: [
    ['PS0003','TOO MANY DIGITS','Za dużo cyfr w słowie programu.','Literówkę w liczbie, np. X1000000.'],
    ['PS0007','ILLEGAL USE OF DECIMAL POINT','Kropka przy adresie, który jej nie przyjmuje.','Adresy P, H, D, T, M — mają być bez kropki.'],
    ['PS0009','ILLEGAL ADDRESS INPUT','Niedozwolony adres w bloku.','Literówkę, znak spoza kodu, brakujący nawias komentarza.'],
    ['PS0010','IMPROPER G-CODE','Kod G nieobsługiwany lub bez wykupionej opcji.','Numer G, czy program nie jest z innego sterowania.'],
    ['PS0011','FEED ZERO (COMMAND F)','Brak posuwu przy G01/G02/G03.','Czy przed pierwszym ruchem roboczym jest F.'],
    ['PS0020','OVER TOLERANCE OF RADIUS','Punkt końcowy łuku nie zgadza się z I/J/R.','Po zmianie wymiaru: współrzędne końca łuku i I, J, R.'],
    ['PS0029','ILLEGAL OFFSET VALUE','Wartość korekcji poza dopuszczalnym zakresem.','Wpisaną wartość korekcji (przecinek, rząd wielkości).'],
    ['PS0030','ILLEGAL OFFSET NUMBER','Numer korekcji D/H większy niż liczba korekcji.','Nr D/H w programie.'],
    ['PS0033','NO SOLUTION AT CRC','Kompensacja promienia nie może wyznaczyć przecięcia.','Wejście i zejście G41/G42, krótkie odcinki, zbyt duży promień.'],
    ['PS0037','CAN NOT CHANGE PLANE IN CRC','Zmiana płaszczyzny przy aktywnym G41/G42.','Dodaj G40 przed G17/G18/G19.'],
    ['PS0041','INTERFERENCE IN CRC','Promień narzędzia podcina kontur.','Promień + zużycie D względem najmniejszego promienia konturu, kąt wejścia.'],
    ['PS0070','NO PROGRAM SPACE IN MEMORY','Brak miejsca w pamięci programów.','Usuń stare programy lub pracuj z karty / serwera.'],
    ['PS0071','DATA NOT FOUND','Nie znaleziono szukanego numeru / adresu.','Numer N lub programu przy wyszukiwaniu.'],
    ['PS0073','PROGRAM NUMBER ALREADY IN USE','Program o tym numerze już istnieje.','Zmień numer O lub usuń stary program.'],
    ['PS0076','PROGRAM NOT FOUND','Nie ma wywoływanego podprogramu.','Numer w M98 P / G65 P, czy podprogram jest w pamięci.'],
    ['OT0500','+ OVERTRAVEL (SOFT 1)','Oś przekroczyłaby krańcówkę programową w kierunku +.','Korekcję długości H, przesunięcie G54, wartość Z/X/Y w programie.'],
    ['OT0501','- OVERTRAVEL (SOFT 1)','Oś przekroczyłaby krańcówkę programową w kierunku −.','Jak wyżej. Po alarmie odjedź ręcznie w przeciwnym kierunku.'],
    ['IE0001','+ OVERTRAVEL (SOFT 1)','Ruch przekroczyłby programową krańcówkę 1 w kierunku + (kontrola przed ruchem).','Wartość osi w programie, korekcję długości H i przesunięcie G54. Odjedź ręcznie w kierunku −.'],
    ['IE0002','- OVERTRAVEL (SOFT 1)','Ruch przekroczyłby programową krańcówkę 1 w kierunku − (kontrola przed ruchem).','Wartość osi w programie, korekcję długości H i przesunięcie G54. Odjedź ręcznie w kierunku +.'],
    ['IE0003','+ OVERTRAVEL (SOFT 2)','Ruch przekroczyłby programową krańcówkę 2 w kierunku + (strefa ustawiona parametrami lub G22).','Czy G22 / strefa zabroniona jest aktywna, pozycję w programie.'],
    ['IE0004','- OVERTRAVEL (SOFT 2)','Ruch przekroczyłby programową krańcówkę 2 w kierunku − (strefa ustawiona parametrami lub G22).','Czy G22 / strefa zabroniona jest aktywna, pozycję w programie.'],
    ['IE0005','+ OVERTRAVEL (SOFT 3)','Ruch przekroczyłby programową krańcówkę 3 w kierunku +.','Pozycję w programie i ustawienie strefy 3 (utrzymanie ruchu).'],
    ['IE0006','- OVERTRAVEL (SOFT 3)','Ruch przekroczyłby programową krańcówkę 3 w kierunku −.','Pozycję w programie i ustawienie strefy 3 (utrzymanie ruchu).'],
    ['DS5340','PARAMETER CHECK SUM ERROR','Suma kontrolna parametrów się nie zgadza — parametry maszyny zostały zmienione.','Nie kasuj na ślepo. Zgłoś utrzymaniu ruchu, czy zmiana parametrów była zamierzona.'],
    ['DS5550','AXIS IMMEDIATE STOP','Natychmiastowe zatrzymanie osi.','Komunikaty obok alarmu, kolizję, sygnały bezpieczeństwa. Zgłoś utrzymaniu ruchu.'],
    ['SV0410','EXCESS ERROR (STOP)','Za duży błąd położenia osi w spoczynku.','Hamulec osi, kolizję, napęd. Zgłoś utrzymaniu ruchu.'],
    ['SV0411','EXCESS ERROR (MOVING)','Za duży błąd położenia w ruchu.','Kolizję, zablokowaną oś, zbyt duży posuw. Zgłoś utrzymaniu ruchu.']
  ],
  sinumerik: [
    ['3000','Emergency stop','Aktywny wyłącznik awaryjny.','Grzybek, drzwi, łańcuch bezpieczeństwa. Zwolnij i skasuj.'],
    ['10203','NC start without reference point','Start programu w trybie AUTOMATIC albo MDI, gdy oś, która musi być zbazowana, nie ma najazdu na punkt referencyjny.','Zbazuj osie (najazd na punkt referencyjny), potem uruchom program ponownie.'],
    ['10208','Continue program with NC start','Po wyszukiwaniu bloku z obliczaniem sterowanie jest gotowe — program można kontynuować. To komunikat, nie usterka.','Sprawdź pozycję narzędzia i naciśnij NC Start.'],
    ['10620','Axis reaches software limit switch','Oś dojeżdża do krańcówki programowej w trakcie ruchu.','Korekcję długości, przesunięcie G54, wartości osi w programie.'],
    ['10720','Software limit switch','Zaprogramowany punkt leży za krańcówką programową.','Jak wyżej. Sprawdź też aktywne narzędzie i D.'],
    ['10750','Tool radius compensation activated without tool number','G41/G42 bez aktywnego narzędzia lub ostrza D.','Czy przed G41/G42 jest T i D (nie D0).'],
    ['10751','Danger of collision due to tool radius compensation','Kompensacja promienia wykryła podcięcie konturu.','Promień + ΔR względem najmniejszego promienia konturu, wejście na kontur.'],
    ['10762','Too many empty blocks between two traversing blocks','Za dużo bloków bez ruchu przy aktywnym G41/G42.','Bloki z samymi M, komentarzami lub obliczeniami w kompensacji.'],
    ['12080','Syntax error','Błąd składni w bloku.','Literówkę, brak nawiasu, znak = przy adresie.'],
    ['12550','Name not defined or option not available','Nieznana nazwa lub brak opcji.','Nazwę zmiennej / cyklu, czy program nie jest z innej maszyny.'],
    ['14011','Program not existing or will be edited','Wywoływany program nie istnieje albo jest otwarty w edycji.','Nazwę podprogramu, zamknij edytor.'],
    ['14080','Jump destination not found','Nie znaleziono etykiety skoku.','Nazwę etykiety i kierunek GOTOF / GOTOB.'],
    ['14800','Programmed path velocity less than or equal to zero','Posuw zerowy lub ujemny.','F w programie, posuw w R-parametrze.'],
    ['25040','Standstill monitoring','Oś nie utrzymuje pozycji w spoczynku.','Kolizję, hamulec, napęd. Zgłoś utrzymaniu ruchu.'],
    ['25050','Contour monitoring','Oś nie nadąża za zadanym torem.','Kolizję, przeciążenie, zbyt duży posuw. Zgłoś utrzymaniu ruchu.'],
    ['25080','Positioning monitoring','Oś nie doszła do pozycji w czasie.','Luz, napęd, zablokowaną oś. Zgłoś utrzymaniu ruchu.'],
    ['61xxx','Cycle alarms','Alarmy cykli (CYCLE…, POCKET… itp.).','Parametry cyklu: płaszczyzny RTP/RFP, głębokość, średnica narzędzia.']
  ]
};

/* Alarmy maszyny (PLC producenta). Chiron: indeks faultresolve.com, który powołuje się na „CHIRON Error Message Overview, all series (Siemens control, V2.0.6, 2012)”. Nieoficjalne — numery mogą zależeć od wersji maszyny. */
var MACHINE_ALARMS = {
  chiron: {
    ctl: 'sinumerik',
    title: 'Alarmy maszyny Chiron (PLC)',
    src: 'Źródło: indeks faultresolve.com (nieoficjalny), oparty na „CHIRON Error Message Overview, Siemens control, V2.0.6, 2012”. Numery mogą się różnić zależnie od wersji maszyny — porównaj z tekstem na ekranie.',
    url: 'https://faultresolve.com/chiron/siemens-control-cnc/alarm-',
    total: 545,
    list: [["700114", "Posuw w kierunku (+) zablokowany"], ["700115", "Posuw w kierunku (−) zablokowany"], ["700133", "Wycofanie tylko w trybie INC i ze stacyjką"], ["700138", "Pokrętło ręczne (MPG) niepodłączone"], ["700310", "Błędne PLC-MD, identyfikacja FZ08"], ["700027", "Błędne PLC-MD (opcja pokrętła MPG)"], ["700005", "Brak ciśnienia powietrza"], ["701536", "Tryb oszczędzania energii (czuwanie)"], ["510013", "Brak pozycji bazowej"], ["700016", "Awaria klimatyzatora szafy sterowniczej"], ["701537", "Trwa rozgrzewanie maszyny"], ["700100", "Zabrudzony filtr dokładny przedmuchu powietrza (1)"], ["700101", "Zabrudzony filtr dokładny przedmuchu wrzeciona (2)"], ["700002", "Wyłącznik krańcowy osi Y"], ["700003", "Wyłącznik krańcowy osi Z"], ["700432", "Ponowny najazd bazy osi Z (sprzęgło zwolnione)"], ["700400", "Rozłączone sprzęgło bezpieczeństwa osi Z"], ["701732", "Oś X nie przełączyła się na bezpośredni układ pomiarowy"], ["701733", "Oś Y nie przełączyła się na bezpośredni układ pomiarowy"], ["701734", "Oś Z nie przełączyła się na bezpośredni układ pomiarowy"], ["700021", "Oś X nie jest w pozycji"], ["700229", "Kolizja osi X — sprawdź punkt referencyjny"], ["700020", "Oś Y nie jest w pozycji"], ["700230", "Kolizja osi Y — sprawdź punkt referencyjny"], ["700019", "Oś Z nie jest w pozycji"], ["700231", "Kolizja osi Z — sprawdź punkt referencyjny"], ["700001", "Wyłącznik krańcowy osi X"], ["700109", "Oś 4/5 wybrana po złej stronie stołu"], ["700110", "Oś 4/5 wybrana po stronie załadunku"], ["700143", "Oś 4 nie jest w pozycji"], ["700144", "Oś 5 nie jest w pozycji"], ["700353", "Osie nie są w pozycji załadunku"], ["701109", "Aktywne sprzężenie osi stołu obrotowego"], ["701008", "Hamulec osi 4 nie zadziałał"], ["701110", "Obroty stołu obrotowego powyżej 200 obr/min niemożliwe"], ["701057", "Kontrola prędkości osi 5 (stół obrotowy)"], ["701058", "Kontrola prędkości osi 6 (stół obrotowy)"], ["701852", "Kontrola prędkości osi A"], ["701112", "Uszkodzone zaciskanie osi 4"], ["702334", "Zacisk osi 4 niezwolniony"], ["701101", "Uszkodzone zaciskanie osi 5"], ["702341", "Oś 5 niezablokowana"], ["702342", "Oś 5 niezwolniona"], ["701102", "Uszkodzone zaciskanie osi 6"], ["702350", "Oś 6 niezwolniona"], ["702349", "Oś 6 niezablokowana"], ["702357", "Oś 7 niezablokowana"], ["702358", "Oś 7 niezwolniona"], ["702816", "Uszkodzone zaciskanie osi A"], ["702338", "Zacisk osi A niezaciśnięty"], ["702337", "Zacisk osi A niezwolniony"], ["702818", "Uszkodzone zaciskanie osi BT"], ["702820", "Uszkodzone zaciskanie osi C"], ["702336", "Podpora osi 4 niezablokowana"], ["702335", "Podpora osi 4 niezwolniona"], ["702344", "Podpora osi 5 niezablokowana"], ["702343", "Podpora osi 5 niezwolniona"], ["702331", "Kontrola czasu pracy stołu obrotowego (powyżej 200 obr/min)"], ["700028", "Błędne PLC-MD (oś 4/5)"], ["701111", "Błędne PLC-MD (kontrola temperatury osi 4)"], ["701105", "Błędne PLC-MD (kontrola temperatury osi 5)"], ["701106", "Błędne PLC-MD (kontrola temperatury osi 6)"], ["701103", "Brak zezwolenia regulatora osi 5"], ["701104", "Brak zezwolenia regulatora osi 6"], ["702817", "Brak zezwolenia regulatora osi A"], ["702819", "Brak zezwolenia regulatora osi BT"], ["702821", "Brak zezwolenia regulatora osi C"], ["700722", "Kontrola temperatury osi 4"], ["700723", "Kontrola temperatury osi 5"], ["700728", "Kontrola temperatury osi 6"], ["701056", "Trwa cykl rozgrzewania stołu obrotowego"], ["701100", "Wymagany cykl rozgrzewania stołu obrotowego"], ["701009", "Kontrola hamulca osi 4 — uszkodzony przekaźnik"], ["701459", "Elektrostatyczny filtr powietrza niegotowy"], ["701461", "Kontrola filtra odciągu — alarm minimum"], ["701460", "Kontrola filtra odciągu — ostrzeżenie"], ["700135", "Odciąg mgły niewybrany"], ["701462", "Kontrola filtra odciągu — alarm maksimum"], ["701054", "Czujnik przepływu wentylatora wyciągowego (1)"], ["701055", "Czujnik przepływu wentylatora wyciągowego (2)"], ["701443", "Minimalny poziom wody w odciągu mgły"], ["701411", "Przepełnienie wody w odciągu mgły"], ["701412", "Błędne PLC-MD (odciąg mgły)"], ["700017", "Uszkodzony wentylator odciągu mgły (1)"], ["701021", "Błąd czujnika przepływu wentylatora wyciągowego (1)"], ["701022", "Błąd czujnika przepływu wentylatora wyciągowego (2)"], ["702139", "Kontrola przylegania powietrzem, strefa 1 nieaktywna"], ["702140", "Kontrola przylegania powietrzem, strefa 2 nieaktywna"], ["702132", "Błąd kontroli przylegania 1 — detal źle zamocowany"], ["702134", "Błąd kontroli przylegania 2 — detal źle zamocowany"], ["702133", "Błąd kontroli podparcia 1 — detal niezaładowany"], ["702135", "Błąd kontroli podparcia 2 — detal niezaładowany"], ["702143", "Detal niezdjęty ze stołu, strona 1"], ["702144", "Detal niezdjęty ze stołu, strona 2"], ["700049", "Brak sygnału „Set”"], ["700118", "Czujnik zbliżeniowy palety detalu 1/2"], ["700117", "Zmieniacz detali — krańcówka blokady/odblokowania"], ["700010", "Zły numer programu albo strona stołu"], ["510004", "Zła strona stołu"], ["700128", "Brak rozpoznania strefy roboczej"], ["700127", "Nie włączono trybu wahadłowego"], ["700130", "Błąd sterowania zmieniacza detali"], ["700131", "Przegroda środkowa niepodłączona"], ["700150", "Przegroda środkowa nie jest w pozycji"], ["702345", "Ostrzeżenie: kontrola czasu pracy stołu obrotowego"], ["700043", "Zmieniacz detali nie w pozycji końcowej 1/2"], ["700042", "Zmieniacz detali nieodblokowany / nie w górze"], ["700041", "Zmieniacz detali niezablokowany / nie w dole"], ["700748", "Błąd kontroli regulatora napędu"], ["700429", "Błędne PLC-MD (moduł hamowania)"], ["701513", "Błędne PLC-MD (przekaźnik podnapięciowy)"], ["700525", "Awaria modułu hamowania"], ["700524", "Ostrzeżenie: moduł hamowania"], ["701541", "Sprawdź wybór ładowarki (stacyjka)"], ["701544", "Ładowarka: nie podano surowego detalu"], ["701545", "Ładowarka w cyklu załadunku"], ["701444", "Ładowarka w strefie kolizji"], ["700413", "Ładowarka niewybrana"], ["701549", "Ładowarka niegotowa do pracy"], ["701548", "Ładowarka: operacja w maszynie zakończona"], ["701546", "Robot: błąd połączenia (robot – sprzęgło DP)"], ["701547", "Robot: błąd połączenia (maszyna – sprzęgło DP)"], ["701542", "Ogrodzenie ładowarki niezamknięte"], ["700163", "Aktywne ograniczenie posuwu szybkiego (stacyjka / H30)"], ["700013", "Obroty wrzeciona powyżej 800"], ["700733", "Funkcja serwisowa M555 aktywna (ustawianie zmieniacza narzędzi)"], ["700161", "Funkcja serwisowa M88 aktywna"], ["700160", "Funkcja serwisowa M90 aktywna (zmieniacz narzędzi)"], ["701900", "Naciśnięty STOP na śluzie narzędzi"], ["701954", "Zderzak chwytaka narzędzi niewysunięty"], ["701955", "Zderzak chwytaka narzędzi niewsunięty"], ["702236", "Wywołane narzędzie jest w śluzie narzędzi"], ["701616", "Błędne przypisanie w chwytaku narzędzi"], ["701959", "Miejsce w śluzie niezablokowane"], ["701960", "Miejsce w śluzie niezwolnione"], ["701948", "Załadunek ze śluzy niemożliwy"], ["701950", "Brak wolnego miejsca w magazynie dodatkowym"], ["701606", "Brak narzędzia w chwytaku"], ["701956", "Drzwi ochronne magazynu dodatkowego niezamknięte"], ["701627", "Sprawdź czujnik wolnego miejsca w magazynie dodatkowym"], ["701625", "Kontrola czujnika zderzaka końcowego chwytaka"], ["701628", "Kontrola czujnika blokady śluzy narzędzi"], ["701600", "Kontrola czujnika pozycji bazowej / magazynu chwytaka"], ["701634", "Chwytak narzędzi niezamknięty"], ["701635", "Chwytak narzędzi nieotwarty"], ["701633", "Chwytak narzędzi nie w pozycji bazowej"], ["701632", "Chwytak narzędzi nie w pozycji magazynu"], ["701638", "Ładowarka narzędzi nie w pozycji bazowej"], ["701604", "Ładowarka narzędzi: narzędzie w chwytaku, otwarcie niemożliwe"], ["701949", "Śluza narzędzi zajęta"], ["701947", "Śluza narzędzi nie w pozycji chwytaka"], ["701941", "Drzwi śluzy narzędzi niezamknięte"], ["701951", "Drzwi śluzy narzędzi niezamknięte i niezablokowane"], ["700206", "Nie określono liczby czujników temperatury"], ["700202", "Błąd przesyłu danych kompensacji temperatury"], ["700207", "Błąd rejestracji temperatury"], ["700228", "Błąd kompensacji temperatury śruby kulowej"], ["700257", "Trwa inicjalizacja kompensacji temperatury śruby kulowej"], ["700201", "Nie zarejestrowano temperatury rzeczywistej"], ["700200", "Nie zarejestrowano temperatury odniesienia"], ["700203", "Za duża wartość kompensacji temperatury"], ["700204", "Termoregulacja: przekroczona temperatura maksymalna"], ["700205", "Termoregulacja: nieosiągnięta temperatura minimalna"], ["700134", "Czujnik przepływu agregatu chłodzącego 1"], ["700734", "Czujnik przepływu agregatu chłodzącego 2"], ["700209", "Usterka 2 agregatu chłodzącego (wrzeciono)"], ["700208", "Awaria agregatu chłodzącego 1"], ["700713", "Awaria agregatu chłodzącego 2"], ["700725", "Awaria agregatu chłodzącego chłodziwo"], ["700715", "Kontrola temperatury agregatu chłodzącego 1"], ["700714", "Kontrola temperatury agregatu chłodzącego 2"], ["700730", "Wymagany serwis agregatu chłodzącego (chłodziwo)"], ["700362", "Czujnik przepływu chłodziwa wysokociśnieniowego (1)"], ["700363", "Czujnik przepływu chłodziwa wysokociśnieniowego (2)"], ["700756", "Czujnik przepływu chłodziwa niskociśnieniowego"], ["700758", "Czujnik przepływu płukania przyrządu (1)"], ["701053", "Czujnik przepływu płukania przyrządu (2)"], ["700757", "Czujnik przepływu płukania łoża"], ["510117", "Czujnik wilgoci silnika wrzeciona (1)"], ["700447", "Czujnik wilgoci silnika wrzeciona (2)"], ["702550", "Czujnik wilgoci silnika wrzeciona (3)"], ["702551", "Czujnik wilgoci silnika wrzeciona (4)"], ["702552", "Czujnik wilgoci silnika wrzeciona (5)"], ["702553", "Czujnik wilgoci silnika wrzeciona (6)"], ["702554", "Czujnik wilgoci silnika wrzeciona (7)"], ["510122", "Zabrudzony bęben filtra albo uszkodzony manometr kontaktowy"], ["700210", "Rozłączone sprzęgło bezpieczeństwa przenośnika ślimakowego wiórów"], ["700731", "Wymień chłodziwo agregatu chłodzącego"], ["700151", "Chłodziwo niewybrane"], ["700755", "Uzupełnij układ chłodziwa"], ["700213", "Układ chłodziwa przepełniony"], ["701744", "Filtr papierowy: przepełnienie poziomu chłodziwa"], ["701742", "Maksymalny poziom chłodziwa — woda superczysta"], ["701743", "Minimalny poziom chłodziwa — woda superczysta"], ["701740", "Maksymalny poziom chłodziwa — woda czysta"], ["510119", "Minimalny poziom chłodziwa — woda czysta"], ["510120", "Maksymalny poziom chłodziwa — przenośnik wiórów"], ["700762", "Minimalny poziom chłodziwa — przenośnik wiórów"], ["701746", "Maksymalny poziom chłodziwa — komora podciśnieniowa"], ["701747", "Koniec filtra papierowego"], ["700105", "Sonda (stół) niewłączona"], ["700106", "Usterka sondy (sonda na stole)"], ["701027", "Sonda nie jest w rewolwerze narzędziowym"], ["510103", "Sonda nie jest we wrzecionie"], ["700030", "Błędne PLC-MD (sonda)"], ["510102", "Usterka sondy (sonda we wrzecionie)"], ["700113", "Uszkodzona sonda (zmieniacz narzędzi)"], ["701440", "Minimalne smarowanie niewybrane"], ["701441", "Minimalne smarowanie: czujnik przepływu"], ["701403", "Błędne PLC-MD (minimalne smarowanie ramion narzędzi)"], ["701402", "Awaria minimalnego smarowania"]]
  }
};

/* Linki do opisów alarmów spoza listy (indeks faultresolve.com — strony Siemens powołują się na oficjalny Diagnostics Manual DAsl) */
var ALARM_LOOKUP = {
  sinumerik: function(code){ return 'https://faultresolve.com/siemens/sinumerik-840d-cnc/alarm-' + code; },
  chiron: function(code){ return 'https://faultresolve.com/chiron/siemens-control-cnc/alarm-' + code; },
  fanuc: function(code){ var n = ('0000' + code).slice(-4); return 'https://faultresolve.com/fanuc/0i-d-0i-mate-d-alarm-list/alarm-ps' + n + '-bg' + n + '-sr' + n; },
  fanucList: 'https://faultresolve.com/fanuc/0i-d-0i-mate-d-alarm-list'
};
