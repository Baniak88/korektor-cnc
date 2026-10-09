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
const ctx = {}; vm.createContext(ctx); vm.runInContext(core + '\nthis.calcCorrection = calcCorrection; this.processProgram = processProgram;', ctx);
const { calcCorrection, processProgram } = ctx;
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

console.log('OK — ' + scripts.length + ' skryptów, testy logiki przeszły');
