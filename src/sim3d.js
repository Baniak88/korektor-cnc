/* ===== Symulacja 3D (WebGL, bez bibliotek): materiał jako mapa wysokości, tor i narzędzie =====
   Logika zbierania materiału i korekcji promienia: makeStock(), cutSegs(), compPaths() w core.js. */

function cssColor(name, fb){
  var v = '';
  try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch(e){}
  var m = v.match(/^#([0-9a-f]{6})$/i);
  if (m){ var n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  m = v.match(/rgba?\(([^)]+)\)/);
  if (m){ var p = m[1].split(',').map(parseFloat); return [p[0] / 255, p[1] / 255, p[2] / 255]; }
  return fb;
}
function m4persp(fov, asp, n, f){ var t = 1 / Math.tan(fov / 2), d = n - f; return [t / asp,0,0,0, 0,t,0,0, 0,0,(f + n) / d,-1, 0,0,2 * f * n / d,0]; }
function m4look(e, c, u){
  var z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]], l = Math.hypot(z[0], z[1], z[2]); z = [z[0] / l, z[1] / l, z[2] / l];
  var x = [u[1] * z[2] - u[2] * z[1], u[2] * z[0] - u[0] * z[2], u[0] * z[1] - u[1] * z[0]]; l = Math.hypot(x[0], x[1], x[2]) || 1; x = [x[0] / l, x[1] / l, x[2] / l];
  var y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1];
}
function m4mul(a, b){ var o = new Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++){ var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }

/* Rosnący bufor Float32 / indeksów — szybkie składanie siatki bez tablic JS */
function FBuf(n){ this.a = new Float32Array(n || 4096); this.n = 0; }
FBuf.prototype.need = function(k){ if (this.n + k > this.a.length){ var b = new Float32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a.subarray(0, this.n)); this.a = b; } };
function IBuf(n){ this.a = new Uint32Array(n || 4096); this.n = 0; }
IBuf.prototype.need = function(k){ if (this.n + k > this.a.length){ var b = new Uint32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a.subarray(0, this.n)); this.a = b; } };

function Sim3D(box, opts){
  opts = opts || {};
  var self = this;
  box.innerHTML = '<canvas aria-label="Symulacja 3D: przeciągnij, żeby obrócić; dwa palce — przybliż i przesuń; stuknij, żeby zmierzyć punkt"></canvas><div class="s3ov" aria-live="polite"></div><div class="s3pick" hidden></div>';
  var cv = box.querySelector('canvas'), gl = null;
  this.overlay = box.querySelector('.s3ov'); this.pickEl = box.querySelector('.s3pick');
  function off(msg){ box.innerHTML = '<div class="sim3d-off">' + msg + '</div>'; self.ok = false; ['setStock', 'setPath', 'setTool', 'draw', 'reset', 'recolor', 'pick'].forEach(function(k){ self[k] = function(){}; }); self.overlay = self.pickEl = document.createElement('div'); }
  try { gl = cv.getContext('webgl', {antialias:true}) || cv.getContext('experimental-webgl'); } catch(e){}
  this.ok = !!gl;
  if (!gl){ off('Ten telefon albo przeglądarka nie obsługuje widoku 3D (WebGL). Użyj widoku z góry i z boku.'); return; }
  var uintIdx = !!gl.getExtension('OES_element_index_uint');

  var VS = 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 M;uniform mat4 Mo;varying vec3 vn;varying vec3 vc;void main(){gl_Position=M*(Mo*vec4(p,1.0));vn=(Mo*vec4(n,0.0)).xyz;vc=c;}';
  var FS = 'precision mediump float;varying vec3 vn;varying vec3 vc;uniform vec3 L1;uniform vec3 L2;uniform float uFlat;void main(){vec3 N=normalize(vn);float d=0.40+0.52*max(dot(N,L1),0.0)+0.22*max(dot(N,L2),0.0);gl_FragColor=vec4(mix(vc*d,vc,uFlat),1.0);}';
  function sh(t, src){ var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)){ off('Nie udało się uruchomić widoku 3D na tym telefonie. Użyj widoku z góry i z boku.'); return; }
  gl.useProgram(pr);
  var aP = gl.getAttribLocation(pr, 'p'), aN = gl.getAttribLocation(pr, 'n'), aC = gl.getAttribLocation(pr, 'c');
  var uMo = gl.getUniformLocation(pr, 'Mo'), I4 = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]), MO = I4, ROT = null;
  var uM = gl.getUniformLocation(pr, 'M'), uL1 = gl.getUniformLocation(pr, 'L1'), uL2 = gl.getUniformLocation(pr, 'L2'), uF = gl.getUniformLocation(pr, 'uFlat');
  function mk(){ return {v:gl.createBuffer(), i:gl.createBuffer(), n:0, big:false}; }
  var bMesh = mk(), bLines = mk(), bCur = mk(), bTool = mk(), bMark = mk(), bTable = mk(), bExtra = mk(), bExtraL = mk();
  function upload(b, V, I){
    var verts = V.a ? V.a.subarray(0, V.n) : new Float32Array(V), nv = verts.length / 9;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.v); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    b.big = nv > 65535 && uintIdx;
    var idx = I.a ? I.a.subarray(0, I.n) : I;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b.big ? (idx instanceof Uint32Array ? idx : new Uint32Array(idx)) : new Uint16Array(idx), gl.DYNAMIC_DRAW);
    b.n = (nv > 65535 && !uintIdx) ? 0 : idx.length;
  }
  function drawBuf(b, mode, flat){
    if (!b.n) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.v); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i);
    gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(aN); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(aC); gl.vertexAttribPointer(aC, 3, gl.FLOAT, false, 36, 24);
    gl.uniform1f(uF, flat ? 1 : 0);
    gl.uniformMatrix4fv(uMo, false, MO);
    gl.drawElements(mode, b.n, b.big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
  }

  var CAM0 = opts.cam || {yaw:-0.95, pitch:0.62, zoom:1};
  var st = null, col = {}, cam = {yaw:CAM0.yaw, pitch:CAM0.pitch, zoom:CAM0.zoom, pan:[0, 0, 0]}, tgt = [0, 0, 0], span = 100, dirty = true, lastBuild = 0;
  function colors(){
    col = {bg:cssColor('--sim-bg', [.91,.91,.93]), stock:cssColor('--sim-stock', [.79,.8,.83]), cut:cssColor('--sim-cut', [.56,.72,.91]), bad:cssColor('--sim-bad', [1,.23,.19]),
      tool:cssColor('--sim-tool', [1,.58,0]), path:cssColor('--sim-path', [0,.48,1]), rapid:cssColor('--sim-rapid', [.56,.56,.58]), future:cssColor('--sim-future', [.72,.72,.75]),
      hole:cssColor('--sim-hole', [.7,.31,0]), mark:cssColor('--sim-mark', [.2,.78,.35])};
  }
  colors();

  this.setStock = function(s, keep){
    st = s; this.meshDirty = true; dirty = true;
    if (keep) return;
    if (s.vox){ tgt = [s.x0 + s.nx * s.c / 2, s.y0 + s.ny * s.c / 2, (s.top + s.bot) / 2]; span = Math.max(s.nx * s.c, s.ny * s.c, s.nz * s.c * 1.3, 10); }
    else {
      tgt = [s.x0 + (s.nx - 1) * s.cell / 2, s.y0 + (s.ny - 1) * s.cell / 2, (s.top + s.bot) / 2];
      span = Math.max((s.nx - 1) * s.cell, (s.ny - 1) * s.cell, (s.top - s.bot) * 1.5, 10);
    }
    cam.pan = [0, 0, 0]; self.clearPick();
  };
  /* Materiał jako słupki: płaskie góry (łączone w pasy) i pionowe ścianki — ostre krawędzie jak na detalu */
  function cellCol(k, out){
    var z = st.z[k];
    if (st.mark[k] === 2){ out[0] = col.bad[0]; out[1] = col.bad[1]; out[2] = col.bad[2]; return; }
    if (z < st.top - 0.002){
      var f = Math.min(1, (st.top - z) / Math.max(st.top - st.bot, 1)), m = 1 - 0.45 * f;
      out[0] = col.cut[0] * m; out[1] = col.cut[1] * m; out[2] = col.cut[2] * m; return;
    }
    out[0] = col.stock[0]; out[1] = col.stock[1]; out[2] = col.stock[2];
  }
  var V = new FBuf(1 << 16), I = new IBuf(1 << 15), C = [0, 0, 0], C2 = [0, 0, 0];
  function quad(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, nx, ny, nz, c){
    V.need(36); I.need(6);
    var a = V.a, o = V.n, b = o / 9;
    a[o] = x1; a[o+1] = y1; a[o+2] = z1; a[o+9] = x2; a[o+10] = y2; a[o+11] = z2; a[o+18] = x3; a[o+19] = y3; a[o+20] = z3; a[o+27] = x4; a[o+28] = y4; a[o+29] = z4;
    for (var q = 0; q < 4; q++){ var oo = o + q * 9; a[oo+3] = nx; a[oo+4] = ny; a[oo+5] = nz; a[oo+6] = c[0]; a[oo+7] = c[1]; a[oo+8] = c[2]; }
    V.n += 36;
    var ia = I.a, io = I.n; ia[io] = b; ia[io+1] = b + 1; ia[io+2] = b + 2; ia[io+3] = b; ia[io+4] = b + 2; ia[io+5] = b + 3; I.n += 6;
  }
  /* Woksele (5 osi): ścianki między materiałem a pustym miejscem, łączone w pasy */
  function buildVox(){
    V.n = 0; I.n = 0;
    var nx = st.nx, ny = st.ny, nz = st.nz, c = st.c, v = st.v, nxy = nx * ny, x0 = st.x0, y0 = st.y0, z0 = st.z0;
    function nb(i, j, k){ return (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? 9 : v[k * nxy + j * nx + i]; }
    function cls(n){ return n === 9 ? 0 : n === 2 ? 2 : n === 0 ? 1 : -1; }
    function colFor(cl, k, out){
      if (cl === 2){ out[0] = col.bad[0]; out[1] = col.bad[1]; out[2] = col.bad[2]; return; }
      if (cl === 1){ var f = Math.min(1, (st.top - (z0 + (k + 0.5) * c)) / Math.max(st.top - st.bot, 1)), m = 1 - 0.45 * Math.max(0, f); out[0] = col.cut[0] * m; out[1] = col.cut[1] * m; out[2] = col.cut[2] * m; return; }
      out[0] = col.stock[0]; out[1] = col.stock[1]; out[2] = col.stock[2];
    }
    var D = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    D.forEach(function(d){
      var runY = d[0] !== 0; // ścianki ±X łączone wzdłuż Y, pozostałe wzdłuż X
      var A = runY ? nx : ny, Bn = runY ? ny : nx;
      for (var k = 0; k < nz; k++) for (var a = 0; a < A; a++){
        var b = 0;
        while (b < Bn){
          var i = runY ? a : b, j = runY ? b : a, idx = k * nxy + j * nx + i, cl = v[idx] === 1 ? cls(nb(i + d[0], j + d[1], k + d[2])) : -1;
          if (cl < 0){ b++; continue; }
          var e = b;
          while (e + 1 < Bn){ var i2 = runY ? a : e + 1, j2 = runY ? e + 1 : a; if (v[k * nxy + j2 * nx + i2] !== 1 || cls(nb(i2 + d[0], j2 + d[1], k + d[2])) !== cl) break; e++; }
          colFor(cl, k, C);
          var xa, xb, ya, yb, za = z0 + k * c, zb = za + c;
          if (runY){ xa = xb = x0 + (a + (d[0] > 0 ? 1 : 0)) * c; ya = y0 + b * c; yb = y0 + (e + 1) * c; }
          else { xa = x0 + b * c; xb = x0 + (e + 1) * c; ya = y0 + a * c; yb = ya + c; }
          if (d[0] > 0) quad(xa, ya, za, xa, yb, za, xa, yb, zb, xa, ya, zb, 1, 0, 0, C);
          else if (d[0] < 0) quad(xa, yb, za, xa, ya, za, xa, ya, zb, xa, yb, zb, -1, 0, 0, C);
          else if (d[1] > 0){ var yy = ya + c; quad(xb, yy, za, xa, yy, za, xa, yy, zb, xb, yy, zb, 0, 1, 0, C); }
          else if (d[1] < 0) quad(xa, ya, za, xb, ya, za, xb, ya, zb, xa, ya, zb, 0, -1, 0, C);
          else if (d[2] > 0) quad(xa, ya, zb, xb, ya, zb, xb, yb, zb, xa, yb, zb, 0, 0, 1, C);
          else quad(xa, yb, za, xb, yb, za, xb, ya, za, xa, ya, za, 0, 0, -1, C);
          b = e + 1;
        }
      }
    });
    upload(bMesh, V, I);
    lastBuild = performance.now();
  }
  function buildMesh(){
    if (!st) return;
    if (st.vox) return buildVox();
    V.n = 0; I.n = 0;
    var nx = st.nx, ny = st.ny, c = st.cell, h = c / 2, z = st.z, mk = st.mark, x0 = st.x0, y0 = st.y0, bot = st.bot, i, j, k;
    // góry: pasy w wierszach o tej samej wysokości i stanie
    for (j = 0; j < ny; j++){
      var y = y0 + j * c;
      i = 0;
      while (i < nx){
        k = j * nx + i; var zz = z[k], m0 = mk[k], e = i;
        while (e + 1 < nx && Math.abs(z[k + e + 1 - i] - zz) < 1e-5 && mk[k + e + 1 - i] === m0) e++;
        cellCol(k, C);
        var xa = x0 + i * c - h, xb = x0 + e * c + h;
        quad(xa, y - h, zz, xb, y - h, zz, xb, y + h, zz, xa, y + h, zz, 0, 0, 1, C);
        i = e + 1;
      }
    }
    // ścianki między komórkami (w X i w Y) — kolor niższej komórki (obrobiona powierzchnia)
    for (j = 0; j < ny; j++) for (i = 0; i < nx - 1; i++){
      k = j * nx + i; var za = z[k], zb = z[k + 1];
      if (Math.abs(za - zb) < 1e-4) continue;
      var xw = x0 + i * c + h, yw = y0 + j * c, lo = za < zb ? k : k + 1;
      cellCol(lo, C2);
      if (za > zb) quad(xw, yw - h, zb, xw, yw + h, zb, xw, yw + h, za, xw, yw - h, za, 1, 0, 0, C2);
      else quad(xw, yw + h, za, xw, yw - h, za, xw, yw - h, zb, xw, yw + h, zb, -1, 0, 0, C2);
    }
    for (j = 0; j < ny - 1; j++) for (i = 0; i < nx; i++){
      k = j * nx + i; var zc = z[k], zd = z[k + nx];
      if (Math.abs(zc - zd) < 1e-4) continue;
      var xv = x0 + i * c, yv = y0 + j * c + h, lo2 = zc < zd ? k : k + nx;
      cellCol(lo2, C2);
      if (zc > zd) quad(xv + h, yv, zd, xv - h, yv, zd, xv - h, yv, zc, xv + h, yv, zc, 0, 1, 0, C2);
      else quad(xv - h, yv, zc, xv + h, yv, zc, xv + h, yv, zd, xv - h, yv, zd, 0, -1, 0, C2);
    }
    // ścianki zewnętrzne półfabrykatu
    var S = [col.stock[0] * .86, col.stock[1] * .86, col.stock[2] * .86];
    for (i = 0; i < nx; i++){
      var xs = x0 + i * c, yb0 = y0 - h, yt = y0 + (ny - 1) * c + h;
      quad(xs - h, yb0, bot, xs + h, yb0, bot, xs + h, yb0, z[i], xs - h, yb0, z[i], 0, -1, 0, S);
      quad(xs + h, yt, bot, xs - h, yt, bot, xs - h, yt, z[(ny - 1) * nx + i], xs + h, yt, z[(ny - 1) * nx + i], 0, 1, 0, S);
    }
    for (j = 0; j < ny; j++){
      var ys = y0 + j * c, xl = x0 - h, xr = x0 + (nx - 1) * c + h;
      quad(xl, ys + h, bot, xl, ys - h, bot, xl, ys - h, z[j * nx], xl, ys + h, z[j * nx], -1, 0, 0, S);
      quad(xr, ys - h, bot, xr, ys + h, bot, xr, ys + h, z[j * nx + nx - 1], xr, ys - h, z[j * nx + nx - 1], 1, 0, 0, S);
    }
    var xa2 = x0 - h, xb2 = x0 + (nx - 1) * c + h, ya2 = y0 - h, yb2 = y0 + (ny - 1) * c + h;
    quad(xa2, ya2, bot, xa2, yb2, bot, xb2, yb2, bot, xb2, ya2, bot, 0, 0, -1, S);
    upload(bMesh, V, I);
    lastBuild = performance.now();
  }
  this.meshDirty = true;

  /* Tor: zrobione (kolor), szybkie (szare), dalsze (blade); bieżący krok osobno, w kolorze narzędzia */
  function lineBuf(){ return {v:[], i:[]}; }
  function line(B, a, b, cc){ var n = B.v.length / 9; B.v.push(a[0], a[1], a[2], 0, 0, 1, cc[0], cc[1], cc[2], b[0], b[1], b[2], 0, 0, 1, cc[0], cc[1], cc[2]); B.i.push(n, n + 1); }
  this.setPath = function(segs, upto, curFrom, curTo){
    var B = lineBuf(), Bc = lineBuf();
    segs.forEach(function(s, i){
      if (s.zu) return;
      var isCur = i >= curFrom && i < curTo, done = i < upto;
      var cc = isCur ? col.tool : !done ? col.future : s.type === 'rapid' ? col.rapid : s.type === 'hole' ? col.hole : col.path;
      var T = isCur ? Bc : B;
      if (s.type === 'hole'){ line(T, s.a, s.b, cc); return; }
      var P = segPath(s);
      for (var q = 1; q < P.length; q++) line(T, P[q - 1], P[q], cc);
    });
    upload(bLines, B.v, B.i); upload(bCur, Bc.v, Bc.i); dirty = true;
  };
  /* Narzędzie: walec w pozycji p */
  function basis(ax){
    var w = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    var u = [ax[1] * w[2] - ax[2] * w[1], ax[2] * w[0] - ax[0] * w[2], ax[0] * w[1] - ax[1] * w[0]], ul = Math.hypot(u[0], u[1], u[2]); u = [u[0] / ul, u[1] / ul, u[2] / ul];
    var t = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]];
    return [u, t];
  }
  function cylinder(V2, I2, p, ax, r, h, cc, cap){
    var N = 32, B = basis(ax), u = B[0], t = B[1], base = V2.length / 9;
    for (var i = 0; i <= N; i++){
      var a = i / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), n = [u[0] * ca + t[0] * sa, u[1] * ca + t[1] * sa, u[2] * ca + t[2] * sa];
      V2.push(p[0] + n[0] * r, p[1] + n[1] * r, p[2] + n[2] * r, n[0], n[1], n[2], cc[0], cc[1], cc[2], p[0] + n[0] * r + ax[0] * h, p[1] + n[1] * r + ax[1] * h, p[2] + n[2] * r + ax[2] * h, n[0], n[1], n[2], cc[0], cc[1], cc[2]);
    }
    for (i = 0; i < N; i++){ var b = base + i * 2; I2.push(b, b + 1, b + 3, b, b + 3, b + 2); }
    [0, h].forEach(function(off, q){
      if (!cap && q) return;
      var nn = q ? ax : [-ax[0], -ax[1], -ax[2]], c0 = V2.length / 9, m = q ? 1 : 0.8;
      V2.push(p[0] + ax[0] * off, p[1] + ax[1] * off, p[2] + ax[2] * off, nn[0], nn[1], nn[2], cc[0] * m, cc[1] * m, cc[2] * m);
      for (var k = 0; k <= N; k++){ var a2 = k / N * Math.PI * 2, n2 = [u[0] * Math.cos(a2) + t[0] * Math.sin(a2), u[1] * Math.cos(a2) + t[1] * Math.sin(a2), u[2] * Math.cos(a2) + t[2] * Math.sin(a2)];
        V2.push(p[0] + n2[0] * r + ax[0] * off, p[1] + n2[1] * r + ax[1] * off, p[2] + n2[2] * r + ax[2] * off, nn[0], nn[1], nn[2], cc[0] * m, cc[1] * m, cc[2] * m); }
      for (k = 0; k < N; k++) I2.push(c0, c0 + 1 + k, c0 + 2 + k);
    });
  }
  this.setTool = function(p, r, ax){
    if (!p){ bTool.n = 0; dirty = true; return; }
    var v = [], idx = [];
    ax = ax || [0, 0, 1];
    cylinder(v, idx, p, ax, r, Math.max(r * 4, span * 0.16), col.tool, true);
    var hp = [p[0] + ax[0] * Math.max(r * 4, span * 0.16), p[1] + ax[1] * Math.max(r * 4, span * 0.16), p[2] + ax[2] * Math.max(r * 4, span * 0.16)];
    cylinder(v, idx, hp, ax, Math.max(r * 1.6, span * 0.035), span * 0.07, col.rapid, true);
    upload(bTool, v, idx); dirty = true;
  };
  /* Dodatkowe bryły (kalkulatory): walce, kule, prostopadłościany, linie. Kolor: nazwa z palety symulacji. */
  this.setExtras = function(items){
    var v = [], idx = [], lv = {v:[], i:[]};
    function cc(c){ return Array.isArray(c) ? c : (col[c] || col.stock); }
    items.forEach(function(it){
      var c = cc(it.c);
      if (it.t === 'cyl') cylinder(v, idx, it.p, it.ax || [0, 0, 1], it.r, it.h, c, true);
      else if (it.t === 'sph'){
        var N = 18, M = 12, base = v.length / 9;
        for (var a = 0; a <= M; a++) for (var b = 0; b <= N; b++){
          var th = a / M * Math.PI, ph = b / N * Math.PI * 2, n = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
          v.push(it.p[0] + n[0] * it.r, it.p[1] + n[1] * it.r, it.p[2] + n[2] * it.r, n[0], n[1], n[2], c[0], c[1], c[2]);
        }
        for (a = 0; a < M; a++) for (b = 0; b < N; b++){ var q = base + a * (N + 1) + b; idx.push(q, q + N + 1, q + 1, q + 1, q + N + 1, q + N + 2); }
      } else if (it.t === 'box'){
        var x0 = it.a[0], y0 = it.a[1], z0 = it.a[2], x1 = it.b[0], y1 = it.b[1], z1 = it.b[2];
        [[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1]], [[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[x0,y0,z0],[0,0,-1]], [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0]],
         [[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[0,1,0]], [[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],[1,0,0]], [[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[-1,0,0]]].forEach(function(f){
          var base2 = v.length / 9;
          for (var k = 0; k < 4; k++) v.push(f[k][0], f[k][1], f[k][2], f[4][0], f[4][1], f[4][2], c[0], c[1], c[2]);
          idx.push(base2, base2 + 1, base2 + 2, base2, base2 + 2, base2 + 3);
        });
      } else if (it.t === 'cone'){
        var ax2 = it.ax, Bs = basis(ax2), u = Bs[0], w = Bs[1], N2 = 20, tip = [it.p[0] + ax2[0] * it.h, it.p[1] + ax2[1] * it.h, it.p[2] + ax2[2] * it.h], b0 = v.length / 9;
        for (var q2 = 0; q2 <= N2; q2++){
          var an = q2 / N2 * Math.PI * 2, nn = [u[0] * Math.cos(an) + w[0] * Math.sin(an), u[1] * Math.cos(an) + w[1] * Math.sin(an), u[2] * Math.cos(an) + w[2] * Math.sin(an)];
          v.push(it.p[0] + nn[0] * it.r, it.p[1] + nn[1] * it.r, it.p[2] + nn[2] * it.r, nn[0], nn[1], nn[2], c[0], c[1], c[2], tip[0], tip[1], tip[2], nn[0], nn[1], nn[2], c[0], c[1], c[2]);
        }
        for (q2 = 0; q2 < N2; q2++){ var bb = b0 + q2 * 2; idx.push(bb, bb + 2, bb + 1); }
      } else if (it.t === 'line') line(lv, it.a, it.b, c);
    });
    upload(bExtra, v, idx); upload(bExtraL, lv.v, lv.i); dirty = true;
  };
  /* Ustaw środek i wielkość widoku na zadany prostopadłościan */
  this.frameBox = function(lo, hi){ tgt = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]; span = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) * 0.82; dirty = true; };
  this.eye = function(){ return lastM ? (ROT ? m3v(m3t(ROT), lastM.eye) : lastM.eye) : null; };
  /* Punkt 3D → piksele na płótnie (do etykiet) */
  this.project = function(p){
    if (!lastM) return null;
    var M = lastM.M, q = ROT ? m3v(ROT, p) : p, x = M[0] * q[0] + M[4] * q[1] + M[8] * q[2] + M[12], y = M[1] * q[0] + M[5] * q[1] + M[9] * q[2] + M[13], w = M[3] * q[0] + M[7] * q[1] + M[11] * q[2] + M[15];
    if (w <= 0) return null;
    return [(x / w * 0.5 + 0.5) * cv.clientWidth, (1 - (y / w * 0.5 + 0.5)) * cv.clientHeight];
  };
  /* Widok maszyny: cała scena obrócona jak stół (detal → maszyna), narzędzie wtedy pionowo */
  this.setMachine = function(R3){
    ROT = R3 || null;
    MO = R3 ? new Float32Array([R3[0], R3[3], R3[6], 0, R3[1], R3[4], R3[7], 0, R3[2], R3[5], R3[8], 0, 0, 0, 0, 1]) : I4;
    if (R3 && st){
      var v = [], idx = [], rr = span * 0.62, zt = st.bot - span * 0.01;
      cylinder(v, idx, [0, 0, zt - span * 0.07], [0, 0, 1], rr, span * 0.07, col.future, true);
      upload(bTable, v, idx);
    } else bTable.n = 0;
    dirty = true;
  };

  /* Kamera */
  var lastM = null, lastEye = null, lastW = 1, lastH = 1;
  function camState(w, h){
    var tg = ROT ? m3v(ROT, tgt) : tgt, d = span * 1.9 / cam.zoom, cp = Math.cos(cam.pitch), t = [tg[0] + cam.pan[0], tg[1] + cam.pan[1], tg[2] + cam.pan[2]];
    var eye = [t[0] + d * cp * Math.cos(cam.yaw), t[1] + d * cp * Math.sin(cam.yaw), t[2] + d * Math.sin(cam.pitch)];
    return {d:d, t:t, eye:eye, M:m4mul(m4persp(0.62, w / h, d * 0.02, d * 8), m4look(eye, t, [0, 0, 1]))};
  }
  function frame(){
    raf = 0;
    if (!dirty) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (!w || !h) return; // ukryty — narysuje się, gdy będzie widoczny (ResizeObserver)
    dirty = false;
    if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
    if (self.meshDirty){
      // przy animacji przebudowa siatki najwyżej ~12 razy na sekundę
      if (self.throttle && performance.now() - lastBuild < 80){ dirty = true; raf = requestAnimationFrame(frame); }
      else { buildMesh(); self.meshDirty = false; }
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(col.bg[0], col.bg[1], col.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    var cs = camState(w, h); lastM = cs; lastW = w; lastH = h;
    gl.uniformMatrix4fv(uM, false, new Float32Array(cs.M));
    var l1 = [cs.eye[0] - cs.t[0] + span * 0.4, cs.eye[1] - cs.t[1] - span * 0.3, cs.eye[2] - cs.t[2] + span], ll = Math.hypot(l1[0], l1[1], l1[2]);
    gl.uniform3f(uL1, l1[0] / ll, l1[1] / ll, l1[2] / ll); gl.uniform3f(uL2, -0.5, 0.6, 0.62);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2);
    drawBuf(bMesh, gl.TRIANGLES, false);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    drawBuf(bTable, gl.TRIANGLES, false);
    drawBuf(bTool, gl.TRIANGLES, false);
    drawBuf(bLines, gl.LINES, true);
    gl.disable(gl.DEPTH_TEST);
    drawBuf(bCur, gl.LINES, true);
    drawBuf(bMark, gl.LINES, true);
    gl.enable(gl.DEPTH_TEST);
    drawBuf(bExtra, gl.TRIANGLES, false);
    drawBuf(bExtraL, gl.LINES, true);
    if (opts.onFrame) try { opts.onFrame(); } catch(e){}
  }
  var raf = 0;
  this.draw = function(){ dirty = true; if (!raf) raf = requestAnimationFrame(frame); };
  this.setCam = function(c){ CAM0 = {yaw:c.yaw, pitch:c.pitch, zoom:c.zoom}; self.reset(); };
  this.reset = function(){ cam = {yaw:CAM0.yaw, pitch:CAM0.pitch, zoom:CAM0.zoom, pan:[0, 0, 0]}; self.draw(); };
  this.recolor = function(){ colors(); self.meshDirty = true; self.draw(); };

  /* Pomiar: stuknięcie w model → X, Y, Z punktu na powierzchni materiału */
  function hAt(x, y){
    var i = Math.round((x - st.x0) / st.cell), j = Math.round((y - st.y0) / st.cell);
    if (i < 0 || j < 0 || i >= st.nx || j >= st.ny) return null;
    return st.z[j * st.nx + i];
  }
  function voxAt(x, y, z){
    var i = Math.floor((x - st.x0) / st.c), j = Math.floor((y - st.y0) / st.c), k = Math.floor((z - st.z0) / st.c);
    if (i < 0 || j < 0 || k < 0 || i >= st.nx || j >= st.ny || k >= st.nz) return false;
    return st.v[k * st.nx * st.ny + j * st.nx + i] === 1;
  }
  this.pick = function(clientX, clientY){
    if (!st || !lastM) return null;
    var r = cv.getBoundingClientRect(), nx = ((clientX - r.left) / r.width) * 2 - 1, ny = 1 - ((clientY - r.top) / r.height) * 2;
    var e = lastM.eye, t = lastM.t, f = [t[0] - e[0], t[1] - e[1], t[2] - e[2]], fl = Math.hypot(f[0], f[1], f[2]); f = [f[0] / fl, f[1] / fl, f[2] / fl];
    var rt = [f[1] * 1 - f[2] * 0, f[2] * 0 - f[0] * 1, 0], rl = Math.hypot(rt[0], rt[1], rt[2]) || 1; rt = [rt[0] / rl, rt[1] / rl, rt[2] / rl];
    var up = [rt[1] * f[2] - rt[2] * f[1], rt[2] * f[0] - rt[0] * f[2], rt[0] * f[1] - rt[1] * f[0]];
    var th = Math.tan(0.31), asp = lastW / lastH;
    var dir = [f[0] + nx * th * asp * rt[0] + ny * th * up[0], f[1] + nx * th * asp * rt[1] + ny * th * up[1], f[2] + nx * th * asp * rt[2] + ny * th * up[2]];
    var dl = Math.hypot(dir[0], dir[1], dir[2]); dir = [dir[0] / dl, dir[1] / dl, dir[2] / dl];
    if (ROT){ var Rt = m3t(ROT); e = m3v(Rt, e); dir = m3v(Rt, dir); }
    var step = st.cell * 0.5, far = lastM.d * 4, prevIn = false, hit = null;
    function inside(s){ var x = e[0] + dir[0] * s, y = e[1] + dir[1] * s, z = e[2] + dir[2] * s; if (st.vox) return voxAt(x, y, z); var hz = hAt(x, y); return hz != null && z <= hz && z >= st.bot - 1e-6; }
    for (var s = 0; s < far; s += step){
      if (inside(s)){ var a = s - step, b = s; for (var q = 0; q < 24; q++){ var m = (a + b) / 2; if (inside(m)) b = m; else a = m; } hit = b; break; }
    }
    if (hit == null){ self.clearPick(); return null; }
    var P = [e[0] + dir[0] * hit, e[1] + dir[1] * hit, e[2] + dir[2] * hit], hz = st.vox ? null : hAt(P[0], P[1]);
    if (hz != null && Math.abs(P[2] - hz) < st.cell * 1.5) P[2] = hz; // na górnej powierzchni: dokładne Z z mapy
    var L = span * 0.06, cc = col.mark, B = {v:[], i:[]};
    line(B, [P[0] - L, P[1], P[2]], [P[0] + L, P[1], P[2]], cc); line(B, [P[0], P[1] - L, P[2]], [P[0], P[1] + L, P[2]], cc); line(B, [P[0], P[1], P[2]], [P[0], P[1], P[2] + L * 2], cc);
    upload(bMark, B.v, B.i); self.draw();
    return {x:P[0], y:P[1], z:P[2], top:st.top};
  };
  this.clearPick = function(){ bMark.n = 0; if (self.pickEl) self.pickEl.hidden = true; dirty = true; };

  /* Obrót palcem; dwa palce: przybliżanie i przesuwanie; kółko myszy: przybliżanie; stuknięcie: pomiar */
  var ptrs = {}, pinch0 = 0, zoom0 = 1, mid0 = null, pan0 = null, down = null;
  function mid(){ var ids = Object.keys(ptrs), a = ptrs[ids[0]], b = ptrs[ids[1]]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  cv.addEventListener('pointerdown', function(e){
    ptrs[e.pointerId] = [e.clientX, e.clientY]; try { cv.setPointerCapture(e.pointerId); } catch(_){}
    var ids = Object.keys(ptrs);
    if (ids.length === 1) down = {x:e.clientX, y:e.clientY, t:Date.now(), moved:false};
    if (ids.length === 2){ var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = cam.zoom; mid0 = mid(); pan0 = cam.pan.slice(); if (down) down.moved = true; }
  });
  cv.addEventListener('pointermove', function(e){
    if (!ptrs[e.pointerId]) return;
    var ids = Object.keys(ptrs), p = ptrs[e.pointerId];
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) down.moved = true;
    if (ids.length === 1 && down && down.moved){
      cam.yaw -= (e.clientX - p[0]) * 0.011; cam.pitch = Math.max(0.05, Math.min(1.55, cam.pitch + (e.clientY - p[1]) * 0.009));
    }
    ptrs[e.pointerId] = [e.clientX, e.clientY];
    if (ids.length === 2 && pinch0){
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      cam.zoom = Math.max(0.4, Math.min(40, zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0));
      var m = mid(), d = span * 1.9 / cam.zoom, k = d * 0.62 / (cv.clientHeight || 1);
      var dx = (m[0] - mid0[0]) * k, dy = (m[1] - mid0[1]) * k, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), sp = Math.sin(cam.pitch);
      // przesunięcie w płaszczyźnie ekranu: w prawo = (sin yaw, −cos yaw, 0)
      cam.pan = [pan0[0] - dx * sy + dy * (-cy * sp), pan0[1] + dx * cy + dy * (-sy * sp), pan0[2] + dy * Math.cos(cam.pitch)];
    }
    self.draw();
  });
  function up(e){
    var was = ptrs[e.pointerId]; delete ptrs[e.pointerId];
    if (Object.keys(ptrs).length < 2) pinch0 = 0;
    if (was && down && !down.moved && !Object.keys(ptrs).length && Date.now() - down.t < 500 && e.type === 'pointerup'){
      if (!opts.noPick){ var r = self.pick(e.clientX, e.clientY); if (opts.onPick) opts.onPick(r); }
    }
    if (!Object.keys(ptrs).length) down = null;
  }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', function(e){ e.preventDefault(); cam.zoom = Math.max(0.4, Math.min(40, cam.zoom * (e.deltaY < 0 ? 1.12 : 0.89))); self.draw(); }, {passive:false});
  if (window.ResizeObserver) try { new ResizeObserver(function(){ dirty = true; if (!raf) raf = requestAnimationFrame(frame); }).observe(cv); } catch(_){}
  if (window.matchMedia) try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ self.recolor(); }); } catch(_){}
}
