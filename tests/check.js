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
const ctx = {}; vm.createContext(ctx); vm.runInContext(core + '\nthis.calcCorrection = calcCorrection; this.processProgram = processProgram; this.simulateProgram = simulateProgram; this.arcPoints = arcPoints; this.calcZero = calcZero; this.calcToolLen = calcToolLen; this.genProgram = genProgram; this.tapInfo = tapInfo; this.cutData = cutData; this.holePattern = holePattern; this.compPaths = compPaths; this.makeStock = makeStock; this.cutSegs = cutSegs; this.resetLocal = resetLocal; this.partTransform = partTransform; this.makeVox = makeVox; this.voxCutSegs = voxCutSegs; this.rotFromAxis = rotFromAxis; this.isoFit = isoFit; this.splitFit = splitFit; this.alarmNumScore = alarmNumScore; this.preflight = preflight;', ctx);
const { calcCorrection, processProgram, simulateProgram, arcPoints, calcZero, calcToolLen, genProgram, tapInfo, cutData, holePattern, compPaths, makeStock, cutSegs, resetLocal, partTransform, makeVox, voxCutSegs, rotFromAxis, isoFit, splitFit, alarmNumScore, preflight } = ctx;
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

// Gwinty: zwykły z tabeli, drobnozwojny d − skok
let ti = tapInfo('M10'); near(ti.pitch, 1.5); near(ti.drill, 8.5);
ti = tapInfo('m8 x 1'); near(ti.pitch, 1); near(ti.drill, 7); assert.ok(ti.fine);
assert.strictEqual(tapInfo('abc'), null);
// Dane skrawania: frez Ø10 stal → S = 150·1000/(π·10) ≈ 4770, F = S·0,06·4
let cd = cutData({ tool: 'mill', d: 10, mat: 'stal' }); assert.strictEqual(cd.S, 4770); assert.strictEqual(cd.F, 1145);
cd = cutData({ tool: 'tap', d: 10, pitch: 1.5, mat: 'stal' }); near(cd.F, cd.S * 1.5);
cd = cutData({ tool: 'mill', d: 1, mat: 'alu', maxS: 15000 }); assert.strictEqual(cd.S, 15000); assert.ok(cd.capped);
// Wzory otworów
let hp = holePattern({ kind: 'circle', x: 0, y: 0, pcd: 20, n: 4 }); assert.strictEqual(hp.length, 4); near(hp[1][1], 10); near(hp[2][0], -10);
hp = holePattern({ kind: 'grid', x: 0, y: 0, nx: 3, ny: 2, dx: 10, dy: 5 }); assert.deepStrictEqual(JSON.parse(JSON.stringify(hp)), [[0,0],[10,0],[20,0],[20,5],[10,5],[0,5]]);
hp = holePattern({ kind: 'list', text: 'X10 Y20; 30,5 -7,5\n-4 8' }); assert.strictEqual(hp.length, 3); near(hp[1][0], 30.5); near(hp[1][1], -7.5);
// Generator: kieszeń + otwory, Fanuc i Sinumerik
const GS = { name: 'Płyta', safe: 50, ops: [
  { type: 'pocket', shape: 'rect', T: 2, d: 10, S: 4700, F: 500, cx: 50, cy: 30, w: 40, h: 24, r: 6, depth: -5, ap: 2.5 },
  { type: 'boss', shape: 'circle', T: 3, d: 12, S: 4000, F: 600, cx: 50, cy: 30, D: 40, depth: -3, stock: 3 },
  { type: 'holes', kind: 'peck', T: 4, d: 8.5, S: 3000, F: 400, depth: -20, q: 4, pattern: { kind: 'row', x: 10, y: 10, n: 3, dx: 20 } },
  { type: 'holes', kind: 'tap', T: 5, d: 10, S: 300, F: 450, pitch: 1.5, depth: -15, pattern: { kind: 'list', pts: [[10, 10]] } } ] };
let g = genProgram(Object.assign({ ctl: 'fanuc' }, GS));
assert.deepStrictEqual(JSON.parse(JSON.stringify(g.errors)), []);
assert.ok(/^%\nO1000 \(PLYTA\)/.test(g.text) && /M30\n%$/.test(g.text));
assert.ok(g.text.includes('T2 M06') && g.text.includes('G43 Z50. H2 M08'));
assert.ok(g.text.includes('G41 G01') && g.text.includes(' D2') && g.text.includes('G40 G01'));
assert.ok(g.text.includes('G98 G83 X10. Y10. Z-20. R2. Q4. F400') && g.text.includes('X50. Y10.\nG80'));
assert.ok(g.text.includes('M29 S300\nG98 G84 X10. Y10. Z-15. R2. F450.'));
let gsim = simulateProgram(g.text, 'fanuc'); assert.strictEqual(gsim.segs.filter(x => x.type === 'hole').length, 4);
assert.ok(Math.min(...gsim.segs.map(x => x.b[2])) === -20);
g = genProgram(Object.assign({ ctl: 'sinumerik' }, GS));
assert.deepStrictEqual(JSON.parse(JSON.stringify(g.errors)), []);
assert.ok(g.text.includes('CYCLE83(50,0,2,-20,,,4,4,0,0,1,1)\nMCALL CYCLE83(50,0,2,-20,,,4,4,0,0,1,1)\nX30 Y10\nX50 Y10\nMCALL'));
assert.ok(g.text.includes('CYCLE84(50,0,2,-15,,0,3,,1.5,0,300,300)') && !/G0\d/.test(g.text));
sim = simulateProgram(g.text, 'sinumerik'); assert.strictEqual(gsim.segs.filter(x => x.type === 'hole').length, 4);
assert.deepStrictEqual(JSON.parse(JSON.stringify(gsim.notes)), []);
// Błędy: frez za duży, promień naroża mniejszy niż frez
g = genProgram({ ctl: 'fanuc', ops: [{ type: 'pocket', shape: 'rect', T: 1, d: 30, S: 1000, F: 200, cx: 0, cy: 0, w: 20, h: 20, r: 0, depth: -5 }] });
assert.ok(g.errors.some(e => /za duży/.test(e.t)));
g = genProgram({ ctl: 'fanuc', ops: [{ type: 'pocket', shape: 'rect', T: 1, d: 10, S: 1000, F: 200, cx: 0, cy: 0, w: 40, h: 40, r: 4, depth: -5 }] });
assert.ok(g.errors.some(e => /Promień naroża/.test(e.t)));

g = genProgram({ ctl: 'fanuc', ops: [{ type: 'holes', kind: 'drill', T: 3, d: 5, S: 3000, F: 300, depth: -10, pattern: { kind: 'list', pts: [[0, 0]] } }, { type: 'holes', kind: 'drill', T: 3, d: 8, S: 2000, F: 300, depth: -10, pattern: { kind: 'list', pts: [[5, 0]] } }] });
assert.ok(g.warns.some(w => /T3 ma w różnych/.test(w.t)));

// 3D: średnica narzędzia z komentarza, korekcja G41 na zewnątrz prostokąta, zbieranie materiału
let k3 = simulateProgram('T5 M06 (FREZ D10)\nG00 X-10. Y-10. Z2.\nG01 Z-3. F200\nG41 D5 X0 Y0 F600\nY30.\nX40.\nY0\nX0\nG40 X-10. Y-10.\nG00 Z50.', 'fanuc');
assert.strictEqual(k3.segs[1].td, 10); assert.strictEqual(k3.segs[1].tool, 5);
assert.deepStrictEqual(JSON.parse(JSON.stringify(compPaths(k3.segs, 10))), []);
let cp = k3.segs.find(x => x.ln === 5).cpath; near(cp[0][0], -5); near(cp[cp.length - 1][0], -5); near(cp[cp.length - 1][1], 30);
let cp6 = k3.segs.find(x => x.ln === 6).cpath; near(cp6[cp6.length - 1][0], 40); near(cp6[cp6.length - 1][1], 35);
let stk = makeStock(-20, -20, 60, 50, 0, -20, 160);
assert.deepStrictEqual(JSON.parse(JSON.stringify(cutSegs(stk, k3.segs, 0, k3.segs.length, 10))), []);
const hz = (x, y) => stk.z[Math.round((y - stk.y0) / stk.cell) * stk.nx + Math.round((x - stk.x0) / stk.cell)];
near(hz(20, 15), 0); near(hz(20, 33), -3); near(hz(-6, 15), -3); near(hz(-15, 15), 0);
// G41 wewnątrz kieszeni: róg wklęsły = przecięcie torów
let k4 = simulateProgram('G0 X20 Y15 Z2\nG1 Z-2 F100\nG41 G1 X20 Y5\nX35\nY25\nX5\nY5\nX20\nG40 G1 X20 Y15', 'fanuc');
compPaths(k4.segs, 6); let c4 = k4.segs.find(x => x.ln === 4).cpath; near(c4[c4.length - 1][0], 32); near(c4[c4.length - 1][1], 8);
// ruch szybki w materiał
let k5 = simulateProgram('T1 M06 (D10)\nG0 X0 Y0 Z5\nG0 Z-2\nG0 Z5', 'fanuc');
compPaths(k5.segs, 10);
assert.deepStrictEqual(JSON.parse(JSON.stringify(cutSegs(makeStock(-20, -20, 20, 20, 0, -10, 80), k5.segs, 0, k5.segs.length, 10))), [3]);
// wiercenie: stożek wiertła
let k6 = simulateProgram('T3 M06 (WIERTLO D10)\nG0 X0 Y0 Z20\nG98 G81 X0 Y0 Z-10 R2 F100\nG80', 'fanuc');
let st6 = makeStock(-10, -10, 10, 10, 0, -20, 40); cutSegs(st6, k6.segs, 0, k6.segs.length, 10);
const h6 = (x, y) => st6.z[Math.round((y - st6.y0) / st6.cell) * st6.nx + Math.round((x - st6.x0) / st6.cell)];
near(h6(0, 0), -10); assert.ok(h6(4, 0) > -8 && h6(4, 0) < -7); near(h6(7, 0), 0);

// 5 osi: G68.2 J-30 — punkt (0,10,10) w pochylonym układzie to (0, 13.66, 3.66) w G54; oś narzędzia (0, 0.5, 0.866)
let f5 = simulateProgram('T1 M06 (D6)\nG68.2 X0 Y0 Z0 I0 J-30. K0\nG53.1\nG00 X0 Y0 Z10.\nG01 Y10. F100\nG69', 'fanuc');
resetLocal(f5.segs); compPaths(f5.segs, 6); assert.ok(partTransform(f5.segs, 'A'));
let s5 = f5.segs.find(x => x.ln === 5); near(s5.b[1], 13.660254037844386); near(s5.b[2], 3.6602540378443855); near(s5.v[1], 0.5); near(s5.v[2], 0.8660254037844386);
let rr5 = rotFromAxis(s5.v); near(rr5.A, -30); near(Math.abs(rr5.C), 180);
// TCP: G43.4 + A-30 — pozycje bez zmian, oś narzędzia z kątów
let t5 = simulateProgram('T1 M06 (D6)\nG00 X0 Y0 Z20. A0 C0\nG43.4 H1\nG00 A-30. C0\nG01 Z-1. F100\nX10.\nG49', 'fanuc');
resetLocal(t5.segs); partTransform(t5.segs, 'A'); let st5 = t5.segs.find(x => x.ln === 6); near(st5.b[0], 10); near(st5.b[2], -1); near(st5.v[1], -0.5);
// woksele: rowek frezem Ø6 na głębokość 2 wzdłuż X
let vx5 = makeVox(-10, -10, -10, 30, 10, 0, 80);
let g5 = simulateProgram('T1 M06 (D6)\nG0 X0 Y0 Z5\nG1 Z-2 F100\nX20', 'fanuc'); resetLocal(g5.segs); partTransform(g5.segs);
assert.deepStrictEqual(JSON.parse(JSON.stringify(voxCutSegs(vx5, g5.segs, 0, g5.segs.length, 6))), []);
const vxa = (x, y, z) => vx5.v[Math.floor((z - vx5.z0) / vx5.c) * vx5.nx * vx5.ny + Math.floor((y - vx5.y0) / vx5.c) * vx5.nx + Math.floor((x - vx5.x0) / vx5.c)];
assert.strictEqual(vxa(10, 0, -1), 0); assert.strictEqual(vxa(10, 0, -3), 1); assert.strictEqual(vxa(10, 5, -1), 1);

// Pasowania ISO 286: odchyłki w mm
[[20, 'H7', 0.021, 0], [20, 'g6', -0.007, -0.020], [50, 'h6', 0, -0.016], [25, 'k6', 0.015, 0.002], [40, 'p6', 0.042, 0.026], [100, 'f7', -0.036, -0.071],
 [25, 'N7', -0.007, -0.028], [12, 'M7', 0, -0.018], [10, 'H7', 0.015, 0], [25, 'K8', 0.010, -0.023], [20, 'K7', 0.006, -0.015], [16, 'G7', 0.024, 0.006], [8, 'e8', -0.025, -0.047]]
  .forEach(([d, f, up, lo]) => { const q = isoFit(d, f); near(q.up, up); near(q.lo, lo); });
near(isoFit(30, 'js6').up, 0.0065); assert.ok(isoFit(300, 'M7').err && isoFit(20, 'X7').err);
assert.deepStrictEqual(JSON.parse(JSON.stringify(splitFit('Ø20 H7'))), { nom: '20', fit: 'H7' });

// Numer alarmu: „41”, „0041”, „ps41” trafiają w PS0041; „612” zaczyna 61xxx
assert.strictEqual(alarmNumScore('PS0041', '41'), 0); assert.strictEqual(alarmNumScore('PS0041', 'ps 0041'), 0);
assert.strictEqual(alarmNumScore('SV0410', '41'), 1); assert.strictEqual(alarmNumScore('PS0041', 'SV41'), -1);
assert.strictEqual(alarmNumScore('61xxx', '61234'), 0); assert.strictEqual(alarmNumScore('61xxx', '612'), 1); assert.strictEqual(alarmNumScore('10720', '107'), 1);

// Kontrola przed wgraniem: krańcówka X+, posuw, frez równy promieniowi łuku, przejazd w powietrzu
const pfLim = { x: [-630, 0], y: [-560, 0], z: [-510, 0] };
let pf = preflight('G90 G54\nT1 M6 (FREZ D12)\nG0 X0 Y0 S3000 M3\nG43 H1 Z5\nG1 Z-2\nG1 X100 F500\nG1 Z20\nG1 X0 Y0\nM30', 'fanuc', { lim: pfLim, wo: { x: -50, y: -100, z: -480 }, L: 100, limOk: true });
const pfi = k => pf.items.find(i => i.k === k);
assert.strictEqual(pfi('limit').sev, 'bad'); assert.deepStrictEqual(Array.from(pfi('limit').lines), [6]);
assert.strictEqual(pfi('feed').sev, 'bad'); assert.strictEqual(pfi('air').sev, 'warn');
pf = preflight('T5 M06 (FREZ D10)\nG0 X15 Y0 Z2\nG1 Z-5 F300\nG41 D5 X15 Y8 F800\nG03 X10 Y13 R5\nG01 X-10\nG40 G0 Z50', 'fanuc', { lim: pfLim });
assert.strictEqual(pfi('radius').sev, 'warn'); assert.strictEqual(pfi('limit').sev, 'na');
pf = preflight('T5 M06 (FREZ D12)\nG0 X15 Y0 Z2\nG1 Z-5 F300\nG41 D5 X15 Y8 F800\nG03 X10 Y13 R5\nG40 G0 Z50', 'fanuc', {});
assert.strictEqual(pfi('radius').sev, 'bad');

console.log('OK — ' + scripts.length + ' skryptów, testy logiki przeszły');
