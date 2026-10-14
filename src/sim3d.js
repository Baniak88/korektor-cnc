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

function Sim3D(box){
  var self = this;
  box.innerHTML = '<canvas aria-label="Symulacja 3D: przeciągnij, żeby obrócić; dwa palce — przybliż"></canvas>';
  var cv = box.querySelector('canvas'), gl = null;
  try { gl = cv.getContext('webgl', {antialias:true, preserveDrawingBuffer:false}) || cv.getContext('experimental-webgl'); } catch(e){}
  this.ok = !!gl;
  if (!gl){ box.innerHTML = '<div class="sim3d-off">Ten telefon albo przeglądarka nie obsługuje widoku 3D (WebGL). Użyj widoku z góry i z boku.</div>'; this.set = this.update = this.draw = this.reset = function(){}; return; }
  var uintIdx = !!gl.getExtension('OES_element_index_uint');

  var VS = 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 M;varying vec3 vn;varying vec3 vc;void main(){gl_Position=M*vec4(p,1.0);vn=n;vc=c;gl_PointSize=6.0;}';
  var FS = 'precision mediump float;varying vec3 vn;varying vec3 vc;uniform vec3 L1;uniform vec3 L2;uniform float uFlat;void main(){vec3 N=normalize(vn);float d=0.42+0.5*max(dot(N,L1),0.0)+0.22*max(dot(N,L2),0.0);gl_FragColor=vec4(mix(vc*d,vc,uFlat),1.0);}';
  function sh(t, src){ var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)){ box.innerHTML = '<div class="sim3d-off">Nie udało się uruchomić widoku 3D na tym telefonie. Użyj widoku z góry i z boku.</div>'; this.ok = false; this.set = this.update = this.draw = this.reset = this.recolor = function(){}; return; }
  gl.useProgram(pr);
  var aP = gl.getAttribLocation(pr, 'p'), aN = gl.getAttribLocation(pr, 'n'), aC = gl.getAttribLocation(pr, 'c');
  var uM = gl.getUniformLocation(pr, 'M'), uL1 = gl.getUniformLocation(pr, 'L1'), uL2 = gl.getUniformLocation(pr, 'L2'), uF = gl.getUniformLocation(pr, 'uFlat');
  function mk(){ return {v:gl.createBuffer(), i:gl.createBuffer(), n:0, big:false}; }
  var bMesh = mk(), bLines = mk(), bTool = mk();
  function upload(b, verts, idx){
    gl.bindBuffer(gl.ARRAY_BUFFER, b.v); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
    b.big = verts.length / 9 > 65535;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b.big && uintIdx ? new Uint32Array(idx) : new Uint16Array(idx), gl.DYNAMIC_DRAW);
    b.n = idx.length;
  }
  function drawBuf(b, mode, flat){
    if (!b.n) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.v); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i);
    gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(aN); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(aC); gl.vertexAttribPointer(aC, 3, gl.FLOAT, false, 36, 24);
    gl.uniform1f(uF, flat ? 1 : 0);
    gl.drawElements(mode, b.n, b.big && uintIdx ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
  }

  var st = null, col = {}, cam = {yaw:-0.95, pitch:0.62, zoom:1}, tgt = [0, 0, 0], span = 100, dirty = true;
  function colors(){
    col = {bg:cssColor('--sim-bg', [.91,.91,.93]), stock:cssColor('--sim-stock', [.79,.8,.83]), cut:cssColor('--sim-cut', [.56,.72,.91]), bad:cssColor('--sim-bad', [1,.23,.19]),
      tool:cssColor('--sim-tool', [1,.58,0]), path:cssColor('--sim-path', [0,.48,1]), rapid:cssColor('--sim-rapid', [.56,.56,.58]), future:cssColor('--sim-future', [.72,.72,.75]), hole:cssColor('--sim-hole', [.7,.31,0])};
  }
  colors();

  /* Siatka materiału + ścianki boczne */
  this.setStock = function(s, keep){ st = s; if (keep){ this.meshDirty = true; dirty = true; return; } tgt = [s.x0 + (s.nx - 1) * s.cell / 2, s.y0 + (s.ny - 1) * s.cell / 2, (s.top + s.bot) / 2]; span = Math.max((s.nx - 1) * s.cell, (s.ny - 1) * s.cell, (s.top - s.bot) * 1.5, 10); this.meshDirty = true; dirty = true; };
  function buildMesh(){
    if (!st) return;
    var nx = st.nx, ny = st.ny, c = st.cell, v = [], idx = [], z = st.z, top = st.top;
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++){
      var k = j * nx + i, zl = z[j * nx + Math.max(0, i - 1)], zr = z[j * nx + Math.min(nx - 1, i + 1)], zd = z[Math.max(0, j - 1) * nx + i], zu = z[Math.min(ny - 1, j + 1) * nx + i];
      var gx = -(zr - zl) / (2 * c), gy = -(zu - zd) / (2 * c), gl2 = Math.hypot(gx, gy, 1);
      var cc = st.mark[k] === 2 ? col.bad : z[k] < top - 0.005 ? col.cut : col.stock;
      v.push(st.x0 + i * c, st.y0 + j * c, z[k], gx / gl2, gy / gl2, 1 / gl2, cc[0], cc[1], cc[2]);
    }
    for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++){ var a = j * nx + i; idx.push(a, a + 1, a + nx + 1, a, a + nx + 1, a + nx); }
    // ścianki: cztery boki
    function wall(list, n){
      var base = v.length / 9;
      list.forEach(function(k){ var i = k % nx, j = (k - i) / nx, x = st.x0 + i * c, y = st.y0 + j * c, cc = st.mark[k] === 2 ? col.bad : z[k] < top - 0.005 ? col.cut : col.stock;
        v.push(x, y, z[k], n[0], n[1], 0, cc[0] * .92, cc[1] * .92, cc[2] * .92, x, y, st.bot, n[0], n[1], 0, col.stock[0] * .8, col.stock[1] * .8, col.stock[2] * .8); });
      for (var q = 0; q < list.length - 1; q++){ var a2 = base + q * 2; idx.push(a2, a2 + 1, a2 + 3, a2, a2 + 3, a2 + 2); }
    }
    var L = [], R = [], B = [], T = [];
    for (i = 0; i < nx; i++){ B.push(i); T.push((ny - 1) * nx + i); }
    for (j = 0; j < ny; j++){ L.push(j * nx); R.push(j * nx + nx - 1); }
    wall(B, [0, -1]); wall(T, [0, 1]); wall(L, [-1, 0]); wall(R, [1, 0]);
    upload(bMesh, v, idx);
  }
  this.meshDirty = true;

  /* Tor: zrobione (kolor), szybkie (szare), reszta (blada) */
  this.setPath = function(segs, upto){
    var v = [], idx = [];
    function line(a, b, cc){ var n = v.length / 9; v.push(a[0], a[1], a[2], 0, 0, 1, cc[0], cc[1], cc[2], b[0], b[1], b[2], 0, 0, 1, cc[0], cc[1], cc[2]); idx.push(n, n + 1); }
    segs.forEach(function(s, i){
      if (s.zu) return;
      var done = i < upto, cc = !done ? col.future : s.type === 'rapid' ? col.rapid : s.type === 'hole' ? col.hole : col.path;
      if (s.type === 'hole'){ line(s.a, s.b, cc); return; }
      var P = segPath(s);
      for (var q = 1; q < P.length; q++) line(P[q - 1], P[q], cc);
    });
    upload(bLines, v, idx); dirty = true;
  };
  /* Narzędzie: walec w pozycji p */
  this.setTool = function(p, r){
    if (!p){ bTool.n = 0; dirty = true; return; }
    var v = [], idx = [], N = 28, h = Math.max(r * 3.5, span * 0.18), cc = col.tool;
    for (var i = 0; i <= N; i++){
      var a = i / N * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a);
      v.push(p[0] + cx * r, p[1] + sy * r, p[2], cx, sy, 0, cc[0], cc[1], cc[2], p[0] + cx * r, p[1] + sy * r, p[2] + h, cx, sy, 0, cc[0], cc[1], cc[2]);
    }
    for (i = 0; i < N; i++){ var b = i * 2; idx.push(b, b + 1, b + 3, b, b + 3, b + 2); }
    var c0 = v.length / 9; v.push(p[0], p[1], p[2], 0, 0, -1, cc[0] * .8, cc[1] * .8, cc[2] * .8);
    for (i = 0; i <= N; i++){ a = i / N * Math.PI * 2; v.push(p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, p[2], 0, 0, -1, cc[0] * .8, cc[1] * .8, cc[2] * .8); }
    for (i = 0; i < N; i++) idx.push(c0, c0 + 1 + i, c0 + 2 + i);
    upload(bTool, v, idx); dirty = true;
  };

  function frame(){
    raf = 0;
    if (!dirty) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (!w || !h) return; // ukryty — narysuje się, gdy będzie widoczny (ResizeObserver)
    dirty = false;
    if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
    if (self.meshDirty){ buildMesh(); self.meshDirty = false; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(col.bg[0], col.bg[1], col.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    var d = span * 1.9 / cam.zoom, cp = Math.cos(cam.pitch);
    var eye = [tgt[0] + d * cp * Math.cos(cam.yaw), tgt[1] + d * cp * Math.sin(cam.yaw), tgt[2] + d * Math.sin(cam.pitch)];
    var M = m4mul(m4persp(0.62, w / h, d * 0.05, d * 6), m4look(eye, tgt, [0, 0, 1]));
    gl.uniformMatrix4fv(uM, false, new Float32Array(M));
    var l1 = [eye[0] - tgt[0] + span * 0.4, eye[1] - tgt[1] - span * 0.3, eye[2] - tgt[2] + span], ll = Math.hypot(l1[0], l1[1], l1[2]);
    gl.uniform3f(uL1, l1[0] / ll, l1[1] / ll, l1[2] / ll); gl.uniform3f(uL2, -0.5, 0.6, 0.62);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2);
    drawBuf(bMesh, gl.TRIANGLES, false);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    drawBuf(bTool, gl.TRIANGLES, false);
    drawBuf(bLines, gl.LINES, true);
  }
  var raf = 0;
  this.draw = function(){ dirty = true; if (!raf) raf = requestAnimationFrame(frame); };
  this.reset = function(){ cam = {yaw:-0.95, pitch:0.62, zoom:1}; self.draw(); };
  this.recolor = function(){ colors(); self.meshDirty = true; self.draw(); };

  /* Obrót palcem, przybliżanie dwoma palcami / kółkiem, podwójne dotknięcie = widok od nowa */
  var ptrs = {}, lastTap = 0, pinch0 = 0, zoom0 = 1;
  cv.addEventListener('pointerdown', function(e){
    ptrs[e.pointerId] = [e.clientX, e.clientY]; try { cv.setPointerCapture(e.pointerId); } catch(_){}
    var ids = Object.keys(ptrs);
    if (ids.length === 2){ var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = cam.zoom; }
    var now = Date.now(); if (ids.length === 1 && now - lastTap < 300) self.reset(); lastTap = now;
  });
  cv.addEventListener('pointermove', function(e){
    if (!ptrs[e.pointerId]) return;
    var ids = Object.keys(ptrs), p = ptrs[e.pointerId];
    if (ids.length === 1){
      cam.yaw -= (e.clientX - p[0]) * 0.011; cam.pitch = Math.max(0.05, Math.min(1.55, cam.pitch + (e.clientY - p[1]) * 0.009));
    }
    ptrs[e.pointerId] = [e.clientX, e.clientY];
    if (ids.length === 2 && pinch0){ var a = ptrs[ids[0]], b = ptrs[ids[1]]; cam.zoom = Math.max(0.4, Math.min(8, zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0)); }
    self.draw();
  });
  function up(e){ delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) pinch0 = 0; }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', function(e){ e.preventDefault(); cam.zoom = Math.max(0.4, Math.min(8, cam.zoom * (e.deltaY < 0 ? 1.12 : 0.89))); self.draw(); }, {passive:false});
  if (window.ResizeObserver) try { new ResizeObserver(function(){ dirty = true; if (!raf) raf = requestAnimationFrame(frame); }).observe(cv); } catch(_){}
  if (window.matchMedia) try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ self.recolor(); }); } catch(_){}
}
