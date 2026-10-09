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
