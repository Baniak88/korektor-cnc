// Sprawdza zbudowaną aplikację: składnię skryptów i logikę obliczeń.
// Uruchom: python3 build.py && node tests/check.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'korektor-cnc', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((s, i) => { try { new vm.Script(s, { filename: 'script' + i + '.js' }); } catch (e) { console.error('Błąd składni w skrypcie ' + i); throw e; } });

const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(core + '\nthis.calcCorrection = calcCorrection; this.processProgram = processProgram; this.simulateProgram = simulateProgram; this.arcPoints = arcPoints; this.calcZero = calcZero; this.calcToolLen = calcToolLen;', ctx);
const { calcCorrection, processProgram, simulateProgram, arcPoints, calcZero, calcToolLen } = ctx;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' != ' + b);

// Korekcja: otwór Ø20 H7 zmierzony 19.998 → celujemy w środek 20.0105 → ΔR −0.006
let r = calcCorrection({ kind: 'inner', nom: 20, up: 0.021, lo: 0, meas: 19.998, target: 'mid', current: -0.01 });
near(r.delta, -0.006); near(r.newWear, -0.016); assert.strictEqual(r.status, 'low');
// Czop za duży → ujemna korekta
r = calcCorrection({ kind: 'outer', nom: 30, up: 0, lo: -0.033, meas: 30.01, target: 'mid' });
near(r.delta, -0.013); assert.strictEqual(r.status, 'high');
// Głębokość za płytka → ujemne zużycie długości
r = calcCorrection({ kind: 'depth', nom: 8, up: 0.05, lo: -0.05, meas: 7.96, target: 'nom' });
near(r.delta, -0.04); assert.strictEqual(r.ax, 'L');

// Program: poszerzenie X o 0.04 wokół 0 (Fanuc)
const F = 'G90\nG01 X20. Y0.\nG03 X15. Y15. R5.\nG01 X-15.\nG91 G28 Z0.';
let p = processProgram(F, { ctl: 'fanuc', mode: 'widen', axis: 'X', center: 0, delta: 0.04 });
assert.ok(p.text.includes('X20.02') && p.text.includes('X15.02') && p.text.includes('X-15.02'));
assert.ok(p.text.includes('G91 G28 Z0.'), 'G28 nie może się zmienić');
// Zamiana Z w Sinumerik
p = processProgram('N10 G1 Z-8 F300\nN20 G0 Z50', { ctl: 'sinumerik', mode: 'replace', axis: 'Z', oldVal: -8, newVal: -8.05 });
assert.strictEqual(p.changes.length, 1); assert.ok(p.text.includes('Z-8.05'));
// Komentarze nie są zmieniane
p = processProgram('G01 X10. (X10 KOMENTARZ)', { ctl: 'fanuc', mode: 'shift', axis: 'X', delta: 1 });
assert.ok(p.text.includes('X11.') && p.text.includes('(X10 KOMENTARZ)'));

// 5 osi: ostrzeżenie przy G68.2 i zmianie X; oś obrotowa; fazka ,C nie jest osią C
p = processProgram('G68.2 X0 Y0 Z0 I0 J-30. K0\nG53.1\nG01 X10.\nG69', { ctl: 'fanuc', mode: 'shift', axis: 'X', delta: 0.1 });
assert.ok(p.warnings.some(w => w.key === 'five'), 'brak ostrzeżenia 5 osi');
p = processProgram('G00 A-30. C90.\nG01 X50. ,C2.\nY20.', { ctl: 'fanuc', mode: 'shift', axis: 'C', delta: 0.5 });
assert.ok(p.text.includes('C90.5') && p.text.includes(',C2.'), 'fazka ,C nie może się zmienić');
assert.ok(p.warnings.some(w => w.key === 'rot'));
p = processProgram('N10 TRAORI\nN20 G1 X10 A=20', { ctl: 'sinumerik', mode: 'replace', axis: 'A', oldVal: 20, newVal: 20.5 });
assert.ok(p.text.includes('A=20.5'));

// Symulacja: łuk G03 z R, środek po właściwej stronie
let sim = simulateProgram('G90 G00 X20. Y0. Z5.\nG01 Z-5. F200\nG03 X0 Y20. R20.\nG00 Z50.', 'fanuc');
let arc = sim.segs.find(s => s.type === 'arc');
near(arc.c[0], 0); near(arc.c[1], 0);
let mid = arcPoints(arc, 2)[1]; assert.ok(mid[0] > 13 && mid[1] > 13, 'łuk G03 przez I ćwiartkę');
sim = simulateProgram('G00 X0 Y0\nG02 X10. Y0 I5. J0', 'fanuc'); arc = sim.segs[0]; near(arc.c[0], 5); assert.ok(arc.cw);
// Cykl wiercenia Fanuc: dwa otwory
sim = simulateProgram('G00 X0 Y0 Z10.\nG81 X10. Y10. Z-15. R2. F150\nX30.\nG80', 'fanuc');
assert.strictEqual(sim.segs.filter(s => s.type === 'hole').length, 2);
// Sinumerik: CR= i przyrostowo
sim = simulateProgram('N10 G0 X0 Y0 Z2\nN20 G1 Z-3 F100\nN30 G91 X10\nN40 G90 G3 X10 Y10 CR=5', 'sinumerik');
assert.strictEqual(sim.segs.length, 3); near(sim.segs[1].b[0], 10);
// G28 nie jest rysowany
sim = simulateProgram('G00 X5. Y5. Z5.\nG01 X10.\nG91 G28 Z0.\nG90', 'fanuc');
assert.strictEqual(sim.segs.length, 1);

// Punkt zerowy: krawędź od strony X− (narzędzie z lewej), kulka Ø10, pozycja maszynowa −412.5 → krawędź −407.5
let z = calcZero({ ax: 'X', m: 'edge', side: -1, d: '10', p: '-412,5', ev: '0' });
near(z.value, -407.5);
// Od strony Y+, Ø6, krawędź ma mieć Y = 20 → G54 Y = (−150 − 3) − 20
z = calcZero({ ax: 'Y', m: 'edge', side: 1, d: '6', p: '-150', ev: '20' });
near(z.value, -173); near(z.at, -153);
// Środek otworu z dwóch dotknięć: −300 i −260, trzpień Ø10 → środek −280, otwór 50
z = calcZero({ ax: 'X', m: 'center', p: '-300', p2: '-260', d: '10', kind: 'hole' });
near(z.value, -280); near(z.size, 50);
z = calcZero({ ax: 'X', m: 'center', p: '-300', p2: '-260', d: '10', kind: 'boss' });
near(z.size, 30);
// Z: Z maszynowe −400, długość 150, płytka 10 → G54 Z −560
z = calcZero({ ax: 'Z', p: '-400', L: '150', b: '10', ev: '0' });
near(z.value, -560);
assert.strictEqual(calcZero({ ax: 'Z', p: '-400', L: '' }), null);
assert.strictEqual(calcZero({ ax: 'X', m: 'edge', p: '', d: '10' }), null);
// Długość narzędzia: Z maszynowe −250, G54 Z −560, płytka 10 → 300
near(calcToolLen({ m: 'part', p: '-250', base: '-560', b: '10' }), 300);
// Metoda G54 Z = 0: Z maszynowe −420.3, płytka 0 → −420.3
near(calcToolLen({ m: 'zero', p: '-420.3', b: '' }), -420.3);
assert.strictEqual(calcToolLen({ m: 'part', p: '-250', base: '' }), null);

console.log('OK — ' + scripts.length + ' skryptów, testy logiki przeszły');
