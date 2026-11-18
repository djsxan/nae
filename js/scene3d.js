// ============================================================
//  CENÁRIO 3D "PRÉ-RENDERIZADO" — árvores, rochas, construções,
//  castelo e objetos do vilarejo são montados como modelos 3D
//  (com texturas de pedra, madeira, telha, palha e relevo),
//  iluminados por um sol fixo e fotografados de cima, no mesmo
//  ângulo do mapa. As fotos viram sprites 2D guardados em cache.
//  Unidades: 1 tile = 1 unidade; X = x do mapa, Z = y do mapa.
// ============================================================
const S3 = { ok: false, budget: 4, pin: new Set(), px: 0, pinPx: 0 };
const A3 = 32 * Math.SQRT2;                 // unidades de arte por unidade 3D (na horizontal da tela)
const HV = A3 * Math.cos(Math.PI / 6);      // unidades de arte por unidade de altura
const SRS = 3.4;                            // pixels da foto por unidade de arte
const h3 = art => art / HV;                 // altura em arte -> unidades 3D

(function initScene3D() {
  if (typeof THREE === 'undefined') return;
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xb4c0d6, 0x5a4430, 0.55));
    const sun = new THREE.DirectionalLight(0xffcf94, 2.9);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0x8aa0d0, 0.32); fill.position.set(6, 3, 2); scene.add(fill);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    const SUN = new THREE.Vector3(-0.9, 0.95, 0.5).normalize();
    const ec = document.createElement('canvas'); ec.width = 64; ec.height = 32;
    const ex = ec.getContext('2d'), eg = ex.createLinearGradient(0, 0, 0, 32);
    eg.addColorStop(0, '#dfe8f4'); eg.addColorStop(0.48, '#b0bccb'); eg.addColorStop(0.52, '#6a5a44'); eg.addColorStop(1, '#2a2218');
    ex.fillStyle = eg; ex.fillRect(0, 0, 64, 32);
    const envTex = new THREE.CanvasTexture(ec); envTex.mapping = THREE.EquirectangularReflectionMapping; envTex.encoding = THREE.sRGBEncoding;
    scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(envTex).texture;
    Object.assign(S3, { ok: true, renderer, scene, sun, cam, SUN });
  } catch (e) { console.warn('cenário 3D indisponível:', e); }
})();

// ---------- fotografa um modelo: a origem cai no ponto de apoio do sprite ----------
const _bb = typeof THREE !== 'undefined' ? new THREE.Box3() : null;
function shootScene(obj) {
  const { renderer, scene, sun, cam, SUN } = S3;
  scene.add(obj);
  obj.updateMatrixWorld(true);
  _bb.setFromObject(obj);
  const { min, max } = _bb;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let q = 0; q < 8; q++) {
    const x = q & 1 ? max.x : min.x, y = q & 2 ? max.y : min.y, z = q & 4 ? max.z : min.z;
    const sx = (x - z) * 32, sy = (x + z) * 16 - y * HV;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  x0 = Math.floor(x0 - 2); y0 = Math.floor(y0 - 2); x1 = Math.ceil(x1 + 2); y1 = Math.ceil(y1 + 2);
  const w = x1 - x0, h = y1 - y0;
  const k = Math.min(SRS * (SET.quality === 'low' ? 0.6 : SET.quality === 'med' ? 0.8 : 1), 2800 / Math.max(w, h)), W = Math.max(2, Math.round(w * k)), H = Math.max(2, Math.round(h * k));
  // câmera: olha de (+x, +y) para baixo, 30° de inclinação (igual ao mapa)
  cam.position.set(60, 60 * Math.SQRT2 * Math.tan(Math.PI / 6), 60); cam.lookAt(0, 0, 0);
  cam.left = x0 / A3; cam.right = x1 / A3; cam.top = -y0 / A3; cam.bottom = -y1 / A3; cam.updateProjectionMatrix();
  // sombra do sol ajustada ao tamanho do modelo
  const c = new THREE.Vector3(), sz = new THREE.Vector3(); _bb.getCenter(c); _bb.getSize(sz);
  const r = sz.length() / 2 + 0.2;
  sun.position.copy(c).addScaledVector(SUN, r + 8); sun.target.position.copy(c); sun.target.updateMatrixWorld();
  const sc = sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 0.5; sc.far = 2 * r + 16; sc.updateProjectionMatrix();
  renderer.setSize(W, H, false);
  renderer.render(scene, cam);
  scene.remove(obj);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.getContext('2d').drawImage(renderer.domElement, 0, 0);
  disposeTree(obj);
  return { c: cv, w, h, ax: -x0, ay: -y0, painted: true, s3: true };
}
function disposeTree(o) { o.traverse(m => { if (m.geometry && !m.geometry.__keep) m.geometry.dispose(); }); }

// cache com limite de fotos novas por quadro (enquanto isso, usa o desenho pintado)
const SC3 = new Map();
function scen3(key, make) {
  if (!S3.ok) return null;
  let s = SC3.get(key);
  if (s !== undefined) { SC3.delete(key); SC3.set(key, s); if (S3.pinning && !S3.pin.has(key)) { S3.pin.add(key); if (s) { S3.px -= s.c.width * s.c.height; S3.pinPx += s.c.width * s.c.height; } } return s; }
  if (S3.budget <= 0) return null;
  S3.budget--;
  if (S3.pinning) S3.pin.add(key);
  try { s = shootScene(make()); } catch (e) { console.warn('cena3d', key, e); s = null; }
  SC3.set(key, s);
  if (s && !S3.pin.has(key)) S3.px = (S3.px || 0) + s.c.width * s.c.height;
  if (s && S3.pin.has(key)) S3.pinPx = (S3.pinPx || 0) + s.c.width * s.c.height;
  if (S3.px > 90e6) for (const [k0, s0] of SC3) { if (S3.px <= 70e6) break; if (S3.pin.has(k0)) continue; SC3.delete(k0); if (s0) S3.px -= s0.c.width * s0.c.height; }
  return s;
}

// ---------- texturas procedurais (cor + relevo) ----------
const CTX3 = {};
function canvasTex(kind) {
  if (CTX3[kind]) return CTX3[kind];
  const S = 512, c = document.createElement('canvas'), b = document.createElement('canvas'), WIDE = kind === 'kanoland' ? 2048 : S;
  c.width = b.width = WIDE; c.height = b.height = S;
  const x = c.getContext('2d'), y = b.getContext('2d'), R = rng(hashStr(kind));
  const both = (f) => { f(x, false); f(y, true); };
  const gray = v => { const q = Math.round(clamp(v, 0, 1) * 255); return `rgb(${q},${q},${q})`; };
  const noiseDots = (n, rmin, rmax, aC, aB) => { for (let i = 0; i < n; i++) { const px_ = R() * S, py = R() * S, r = rmin + R() * (rmax - rmin), v = R(); x.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},${aC})`; x.beginPath(); x.arc(px_, py, r, 0, 7); x.fill(); y.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},${aB})`; y.beginPath(); y.arc(px_, py, r, 0, 7); y.fill(); } };
  x.scale(2, 2); y.scale(2, 2);
  { const S = 256;
  x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, S, S); y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  if (kind === 'brick' || kind === 'stoneblock') {
    const rows = kind === 'brick' ? 14 : 8, rh = S / rows;
    x.fillStyle = '#8a857c'; x.fillRect(0, 0, S, S); y.fillStyle = gray(0.15); y.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) {
      const cols = kind === 'brick' ? 6 : 4, cw = S / cols, off = r % 2 ? cw / 2 : 0;
      for (let k = -1; k < cols; k++) {
        const bx = k * cw + off + 2 + R() * 2, by = r * rh + 2, bw = cw - 4 - R() * 3, bh = rh - 4;
        const v = 0.66 + R() * 0.28, gs = x.createLinearGradient(bx, by, bx + bw * 0.3, by + bh);
        gs.addColorStop(0, gray(v + 0.1)); gs.addColorStop(0.55, gray(v)); gs.addColorStop(1, gray(v - 0.14));
        x.fillStyle = gs; x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, 3 + R() * 3) : x.rect(bx, by, bw, bh); x.fill();
        for (let q = 0; q < 6; q++) { x.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,250,240'},${0.05 + R() * 0.07})`; x.beginPath(); x.arc(bx + R() * bw, by + R() * bh, 1 + R() * 3, 0, 7); x.fill(); }
        if (R() < 0.18) { x.fillStyle = `rgba(80,100,50,${0.12 + R() * 0.15})`; x.beginPath(); x.ellipse(bx + R() * bw, by + bh * 0.8, 4 + R() * 8, 2 + R() * 3, 0, 0, 7); x.fill(); }
        const g = y.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, gray(0.85)); g.addColorStop(0.5, gray(0.75)); g.addColorStop(1, gray(0.55));
        y.fillStyle = g; y.beginPath(); y.roundRect ? y.roundRect(bx, by, bw, bh, 5) : y.rect(bx, by, bw, bh); y.fill();
      }
    }
    noiseDots(500, 0.5, 2.5, 0.12, 0.18);
    for (let i = 0; i < 18; i++) { const sx = R() * S, sy = R() * S; x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (R() - 0.5) * 20, sy + R() * 14); x.stroke(); }
  } else if (kind === 'plaster') {
    // reboco de cal envelhecido: manchado suave, grão fino, marcas de desempenadeira, umidade, rachaduras e partes descascadas
    x.fillStyle = gray(0.86); x.fillRect(0, 0, S, S);
    const blot = (cx, cy, r, col, a) => { for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const gr = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r); gr.addColorStop(0, col + a + ')'); gr.addColorStop(1, col + '0)'); x.fillStyle = gr; x.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2); } };
    for (let i = 0; i < 26; i++) blot(R() * S, R() * S, 30 + R() * 70, R() < 0.5 ? 'rgba(255,252,244,' : 'rgba(96,84,66,', 0.05 + R() * 0.07);
    // marcas de desempenadeira (arcos largos e suaves)
    for (let i = 0; i < 40; i++) { const cx = R() * S, cy = R() * S, r = 14 + R() * 26; x.strokeStyle = 'rgba(255,255,250,' + (0.05 + R() * 0.05) + ')'; x.lineWidth = 3 + R() * 5; x.beginPath(); x.arc(cx, cy, r, R() * 6, R() * 6 + 1.2); x.stroke(); y.strokeStyle = gray(0.56); y.globalAlpha = 0.5; y.lineWidth = x.lineWidth; y.beginPath(); y.arc(cx, cy, r, 0, 0.01); y.stroke(); y.globalAlpha = 1; }
    // grão fino da cal
    for (let i = 0; i < 6000; i++) { const px_ = R() * S, py = R() * S, v = R(); x.fillStyle = v < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'; x.fillRect(px_, py, 1, 1); y.fillStyle = v < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'; y.fillRect(px_, py, 1, 1); }
    // escorridos de umidade
    for (let i = 0; i < 7; i++) { const sx = R() * S, sy = R() * S * 0.5, len = 40 + R() * 90, w = 3 + R() * 7, gr = x.createLinearGradient(0, sy, 0, sy + len); gr.addColorStop(0, 'rgba(90,82,60,0)'); gr.addColorStop(0.4, 'rgba(90,82,60,0.10)'); gr.addColorStop(1, 'rgba(90,82,60,0)'); x.fillStyle = gr; x.fillRect(sx, sy, w, len); }
    // rachaduras finas
    for (let i = 0; i < 6; i++) { let cx = R() * S, cy = R() * S; x.strokeStyle = 'rgba(40,32,24,0.32)'; x.lineWidth = 0.6; y.strokeStyle = gray(0.2); y.lineWidth = 1; x.beginPath(); y.beginPath(); x.moveTo(cx, cy); y.moveTo(cx, cy); for (let k = 0; k < 6; k++) { cx += (R() - 0.5) * 16; cy += 4 + R() * 9; x.lineTo(cx, cy); y.lineTo(cx, cy); } x.stroke(); y.stroke(); }
    // reboco caído mostrando o tijolo por baixo
    for (let i = 0; i < 3; i++) {
      const cx = 20 + R() * (S - 40), cy = 20 + R() * (S - 40), rw = 5 + R() * 8, rh2 = 4 + R() * 5, pts = [];
      for (let k = 0; k < 9; k++) { const t = k / 9 * Math.PI * 2, rr = 0.7 + R() * 0.45; pts.push([cx + Math.cos(t) * rw * rr, cy + Math.sin(t) * rh2 * rr]); }
      const path = cx2 => { cx2.beginPath(); pts.forEach(([px_, py], k) => k ? cx2.lineTo(px_, py) : cx2.moveTo(px_, py)); cx2.closePath(); };
      x.save(); path(x); x.clip(); x.fillStyle = 'rgb(118,92,78)'; x.fillRect(cx - rw * 2, cy - rh2 * 2, rw * 4, rh2 * 4);
      for (let by = cy - rh2 * 2; by < cy + rh2 * 2; by += 6) for (let bx = cx - rw * 2 + ((by / 6) % 2) * 6; bx < cx + rw * 2; bx += 12) { x.fillStyle = 'rgba(' + (130 + R() * 40 | 0) + ',' + (88 + R() * 20 | 0) + ',' + (70 + R() * 14 | 0) + ',1)'; x.fillRect(bx + 0.8, by + 0.8, 10.4, 4.4); }
      x.restore(); path(x); x.strokeStyle = 'rgba(255,250,240,0.55)'; x.lineWidth = 1.2; x.stroke();
      y.save(); path(y); y.clip(); y.fillStyle = gray(0.22); y.fillRect(cx - rw * 2, cy - rh2 * 2, rw * 4, rh2 * 4);
      for (let by = cy - rh2 * 2; by < cy + rh2 * 2; by += 6) for (let bx = cx - rw * 2 + ((by / 6) % 2) * 6; bx < cx + rw * 2; bx += 12) { y.fillStyle = gray(0.36); y.fillRect(bx + 0.8, by + 0.8, 10.4, 4.4); }
      y.restore(); path(y); y.strokeStyle = gray(0.85); y.lineWidth = 1.5; y.stroke();
    }
  } else if (kind === 'wood' || kind === 'bark') {
    const planks = kind === 'wood' ? 5 : 1;
    for (let p = 0; p < planks; p++) {
      const pw = S / planks, v = 0.6 + R() * 0.3;
      x.fillStyle = gray(v); x.fillRect(p * pw, 0, pw, S);
      for (let i = 0; i < 40; i++) { const gx = p * pw + R() * pw; x.strokeStyle = `rgba(0,0,0,${0.08 + R() * 0.15})`; x.lineWidth = 0.6 + R() * (kind === 'bark' ? 3 : 1.2); x.beginPath(); x.moveTo(gx, 0); x.bezierCurveTo(gx + (R() - 0.5) * 8, S / 3, gx + (R() - 0.5) * 8, S * 2 / 3, gx, S); x.stroke(); y.strokeStyle = `rgba(0,0,0,${kind === 'bark' ? 0.5 : 0.2})`; y.lineWidth = x.lineWidth * (kind === 'bark' ? 1.6 : 1); y.beginPath(); y.moveTo(gx, 0); y.bezierCurveTo(gx + (R() - 0.5) * 8, S / 3, gx + (R() - 0.5) * 8, S * 2 / 3, gx, S); y.stroke(); }
      if (kind === 'wood') { x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(p * pw, 0, 2, S); y.fillStyle = gray(0); y.fillRect(p * pw, 0, 3, S); }
      if (kind === 'wood' && R() < 0.7) { const kx = p * pw + pw / 2, ky = R() * S; x.fillStyle = 'rgba(40,20,10,0.4)'; x.beginPath(); x.ellipse(kx, ky, 4, 7, 0, 0, 7); x.fill(); }
    }
  } else if (kind === 'shingle' || kind === 'slate') {
    const rows = 10, rh = S / rows, cols = kind === 'slate' ? 8 : 10;
    y.fillStyle = gray(0.1); y.fillRect(0, 0, S, S); x.fillStyle = '#555'; x.fillRect(0, 0, S, S);
    for (let r = rows - 1; r >= -1; r--) for (let k = -1; k <= cols; k++) {
      const cw = S / cols * (0.85 + R() * 0.3), bx = k * (S / cols) + (r % 2 ? S / cols / 2 : 0) + (R() - 0.5) * 2, by = r * rh + (R() - 0.5) * 1.5, v = 0.55 + R() * 0.4;
      x.fillStyle = gray(v); x.beginPath(); x.moveTo(bx + 1, by); x.lineTo(bx + cw - 1, by); x.lineTo(bx + cw - 1, by + rh * 1.3); x.quadraticCurveTo(bx + cw / 2, by + rh * 1.55, bx + 1, by + rh * 1.3); x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(bx + 1, by + rh * 1.2, cw - 2, 2);
      const g = y.createLinearGradient(0, by, 0, by + rh * 1.4); g.addColorStop(0, gray(0.3)); g.addColorStop(1, gray(0.95));
      y.fillStyle = g; y.beginPath(); y.moveTo(bx + 1, by); y.lineTo(bx + cw - 1, by); y.lineTo(bx + cw - 1, by + rh * 1.3); y.quadraticCurveTo(bx + cw / 2, by + rh * 1.55, bx + 1, by + rh * 1.3); y.closePath(); y.fill();
    }
    noiseDots(300, 0.5, 2, 0.15, 0.1);
    for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(70,90,40,${0.1 + R() * 0.16})`; x.beginPath(); x.arc(R() * S, R() * S, 2 + R() * 6, 0, 7); x.fill(); }
    for (let i = 0; i < 14; i++) { const sx = R() * S; const g2 = x.createLinearGradient(0, 0, 0, S); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.5, `rgba(30,24,18,${0.06 + R() * 0.08})`); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(sx, 0, 6 + R() * 14, S); }
  } else if (kind === 'thatch') {
    x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, S, S); y.fillStyle = gray(0.4); y.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { const px_ = R() * S, py = R() * S, l = 10 + R() * 22, v = 0.45 + R() * 0.55; x.strokeStyle = gray(v); x.lineWidth = 1 + R() * 1.5; x.beginPath(); x.moveTo(px_, py); x.lineTo(px_ + (R() - 0.5) * 3, py + l); x.stroke(); y.strokeStyle = gray(v); y.lineWidth = x.lineWidth; y.beginPath(); y.moveTo(px_, py); y.lineTo(px_ + (R() - 0.5) * 3, py + l); y.stroke(); }
    for (let r = 0; r < 9; r++) { const yy = r * S / 9 + (R() - 0.5) * 4; for (let k = 0; k < 14; k++) { const xx = k * S / 14 + (R() - 0.5) * 10; x.fillStyle = 'rgba(0,0,0,' + (0.06 + R() * 0.08) + ')'; x.beginPath(); x.ellipse(xx, yy + 3, 12 + R() * 8, 3, 0, 0, Math.PI); x.fill(); y.fillStyle = gray(0.2 + R() * 0.15); y.beginPath(); y.ellipse(xx, yy + 3, 12, 3, 0, 0, Math.PI); y.fill(); } }
  } else if (kind === 'rock') {
    for (let i = 0; i < 70; i++) { const g = x.createRadialGradient(R() * S, R() * S, 0, R() * S, R() * S, 20 + R() * 50); const v = R(); g.addColorStop(0, `rgba(${v < 0.5 ? '40,38,34' : '230,225,215'},0.2)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); }
    noiseDots(1200, 0.5, 2.5, 0.06, 0.18);
    for (let i = 0; i < 26; i++) { const sx = R() * S, sy = R() * S; for (const c2 of [x, y]) { c2.strokeStyle = 'rgba(0,0,0,0.45)'; c2.lineWidth = 1 + R(); c2.beginPath(); c2.moveTo(sx, sy); for (let k = 0; k < 4; k++) c2.lineTo(sx + (R() - 0.5) * 40, sy + (R() - 0.5) * 40); c2.stroke(); } }
  } else if (kind === 'flag') {
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
      const v = 0.55 + R() * 0.4; x.fillStyle = gray(v);
      x.fillRect(k * 64 + 3, r * 64 + 3, 58, 58); y.fillStyle = gray(0.8); y.fillRect(k * 64 + 3, r * 64 + 3, 58, 58);
    }
    noiseDots(400, 0.5, 2, 0.1, 0.15);
  } else if (kind === 'cloth') {
    for (let i = 0; i < S; i += 2) { x.fillStyle = `rgba(0,0,0,${0.04 + R() * 0.04})`; x.fillRect(0, i, S, 1); x.fillRect(i, 0, 1, S); }
    noiseDots(300, 1, 4, 0.05, 0.08);
  } else if (kind === 'scales') {   // tapete de escamas verdes com borda dourada
    x.fillStyle = '#2e4a26'; x.fillRect(0, 0, S, S);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 10; c++) { const cx = c * 28 + (r % 2) * 14, cy = r * 22; x.fillStyle = ['#4e7a3a', '#5a8a44', '#46703a'][(r + c) % 3]; x.beginPath(); x.arc(cx, cy, 15, 0, Math.PI); x.fill(); x.strokeStyle = 'rgba(20,30,10,0.6)'; x.lineWidth = 2; x.stroke(); }
    x.strokeStyle = '#c8a040'; x.lineWidth = 12; x.strokeRect(6, 6, S - 12, S - 12);
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'stripes') {
    for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#f2ead8' : '#a8302a'; x.fillRect(k * 32, 0, 32, S); }
    for (let i = 0; i < S; i += 2) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(0, i, S, 1); }
  } else if (kind === 'oldplank') {
    // tábuas velhas na horizontal: veios, frestas escuras, nós, pregos e desgaste
    const rows = 7, rh = S / rows;
    for (let r = 0; r < rows; r++) {
      const v = 0.5 + R() * 0.32; x.fillStyle = gray(v); x.fillRect(0, r * rh, S, rh);
      for (let i = 0; i < 26; i++) { const gy = r * rh + R() * rh; x.strokeStyle = 'rgba(0,0,0,' + (0.07 + R() * 0.12) + ')'; x.lineWidth = 0.5 + R(); x.beginPath(); x.moveTo(0, gy); x.bezierCurveTo(S * 0.3, gy + (R() - 0.5) * 6, S * 0.7, gy + (R() - 0.5) * 6, S, gy + (R() - 0.5) * 3); x.stroke(); }
      x.fillStyle = 'rgba(20,10,4,0.65)'; x.fillRect(0, r * rh, S, 2); y.fillStyle = gray(0); y.fillRect(0, r * rh, S, 3);
      const cut = R() * S; x.fillStyle = 'rgba(20,10,4,0.5)'; x.fillRect(cut, r * rh, 2, rh); y.fillRect(cut, r * rh, 2, rh);
      for (const nx of [cut - 7, cut + 9]) { x.fillStyle = 'rgba(30,26,22,0.9)'; x.beginPath(); x.arc((nx + S) % S, r * rh + rh / 2, 1.6, 0, 7); x.fill(); }
      if (R() < 0.6) { const kx = R() * S, ky = r * rh + rh / 2; x.fillStyle = 'rgba(40,20,8,0.45)'; x.beginPath(); x.ellipse(kx, ky, 6, 3, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(40,20,8,0.3)'; x.beginPath(); x.ellipse(kx, ky, 10, 4.5, 0, 0, 7); x.stroke(); }
    }
    noiseDots(700, 0.5, 2, 0.08, 0.12);
  } else if (kind === 'wallpaper') {
    // papel de parede aconchegante: listras creme e rosa-velho com raminhos, rodapé de madeira
    x.fillStyle = '#efe2c6'; x.fillRect(0, 0, S, S); y.fillStyle = gray(0.7); y.fillRect(0, 0, S, S);
    for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? 'rgba(168,92,84,0.28)' : 'rgba(120,140,96,0.12)'; x.fillRect(k * 32 + 4, 0, k % 2 ? 10 : 4, S); }
    for (let r = 0; r < 6; r++) for (let k = 0; k < 4; k++) { const fx = k * 64 + 22 + (r % 2) * 32, fy = r * 44 + 18; x.fillStyle = 'rgba(150,70,64,0.55)'; for (let q = 0; q < 5; q++) { const a = q / 5 * 6.28; x.beginPath(); x.arc(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 1.8, 0, 7); x.fill(); } x.fillStyle = 'rgba(210,170,80,0.8)'; x.beginPath(); x.arc(fx, fy, 1.3, 0, 7); x.fill(); x.strokeStyle = 'rgba(90,120,70,0.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(fx, fy + 3); x.quadraticCurveTo(fx + 5, fy + 8, fx + 2, fy + 13); x.stroke(); }
    for (let i = 0; i < S; i += 3) { x.fillStyle = 'rgba(0,0,0,0.025)'; x.fillRect(0, i, S, 1); }
    noiseDots(400, 0.5, 2, 0.04, 0.06);
  } else if (kind === 'quilt') {
    // colcha de retalhos
    const cols = ['#a8402e', '#d8a848', '#4a6a8a', '#6a8a4a', '#e8dcc0', '#8a4a6a', '#c87a3a'];
    for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) { const px_ = k * S / 6, py = r * S / 6, s6 = S / 6; x.fillStyle = cols[Math.floor(R() * cols.length)]; x.fillRect(px_, py, s6, s6); if (R() < 0.5) { x.fillStyle = 'rgba(255,255,255,0.18)'; for (let d = 4; d < s6; d += 8) x.fillRect(px_, py + d, s6, 2); } x.strokeStyle = 'rgba(40,24,12,0.55)'; x.setLineDash([3, 2]); x.lineWidth = 1; x.strokeRect(px_ + 1.5, py + 1.5, s6 - 3, s6 - 3); x.setLineDash([]); y.fillStyle = gray(0.55 + R() * 0.2); y.fillRect(px_ + 2, py + 2, s6 - 4, s6 - 4); }
  } else if (kind === 'marblechk') {
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const dark = (r + k) % 2; x.fillStyle = dark ? '#3a3632' : '#ece6da'; x.fillRect(k * 64, r * 64, 64, 64);
      for (let v = 0; v < 6; v++) { x.strokeStyle = dark ? 'rgba(200,190,170,0.18)' : 'rgba(120,110,95,0.22)'; x.lineWidth = 0.6 + R(); x.beginPath(); let px_ = k * 64 + R() * 64, py = r * 64 + R() * 64; x.moveTo(px_, py); for (let q = 0; q < 4; q++) { px_ += (R() - 0.5) * 30; py += (R() - 0.5) * 30; x.lineTo(px_, py); } x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1.2; x.strokeRect(k * 64, r * 64, 64, 64); y.fillStyle = gray(0.7); y.fillRect(k * 64 + 1, r * 64 + 1, 62, 62); }
  } else if (kind === 'rates') {
    x.fillStyle = '#1e2a22'; x.fillRect(0, 0, S, S); x.strokeStyle = '#c9a24a'; x.lineWidth = 10; x.strokeRect(5, 5, S - 10, S - 10);
    x.fillStyle = '#e8dcb8'; x.font = 'bold 26px serif'; x.textAlign = 'center'; x.fillText('BANCO DE NAE', 128, 48);
    x.font = '20px serif'; x.textAlign = 'left'; [['Rendimento', '2% / semana'], ['Empréstimo', '10% / semana'], ['Prazo', '2 semanas'], ['Limite', '100 + 4 × rep.']].forEach(([a, b], k) => { x.fillStyle = '#e8dcb8'; x.fillText(a, 22, 96 + k * 38); x.fillStyle = '#e8c048'; x.textAlign = 'right'; x.fillText(b, 234, 96 + k * 38); x.textAlign = 'left'; });
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'celestial') {
    x.fillStyle = '#141a30'; x.fillRect(0, 0, S, S); x.strokeStyle = '#c9a24a'; x.lineWidth = 3; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.stroke(); x.beginPath(); x.arc(128, 128, 84, 0, 7); x.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; x.beginPath(); x.moveTo(128 + Math.cos(a) * 84, 128 + Math.sin(a) * 84); x.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); x.stroke(); }
    for (let k = 0; k < 90; k++) { x.fillStyle = 'rgba(240,232,200,' + (0.4 + R() * 0.6) + ')'; x.beginPath(); x.arc(R() * S, R() * S, 0.6 + R() * 1.6, 0, 7); x.fill(); }
    x.fillStyle = '#e8ecf4'; x.beginPath(); x.arc(128, 128, 22, 0, 7); x.fill(); x.fillStyle = '#141a30'; x.beginPath(); x.arc(138, 122, 20, 0, 7); x.fill();
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'constell') {
    x.fillStyle = '#3e3a52'; x.fillRect(0, 0, S, S); x.strokeStyle = 'rgba(232,200,110,0.85)'; x.fillStyle = '#f0d890'; x.lineWidth = 1.4;
    for (let c2 = 0; c2 < 4; c2++) { const ox = 20 + (c2 % 2) * 120, oy = 20 + Math.floor(c2 / 2) * 120, pts = []; for (let k = 0; k < 5; k++) pts.push([ox + R() * 100, oy + R() * 100]); x.beginPath(); pts.forEach(([a, b2], k) => k ? x.lineTo(a, b2) : x.moveTo(a, b2)); x.stroke(); for (const [a, b2] of pts) { x.beginPath(); x.arc(a, b2, 3, 0, 7); x.fill(); } }
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'keysign') {
    x.fillStyle = '#2a3a4a'; x.fillRect(0, 0, S, S); x.strokeStyle = '#c9a24a'; x.lineWidth = 12; x.strokeRect(8, 8, S - 16, S - 16);
    x.strokeStyle = '#e2b74e'; x.fillStyle = '#e2b74e'; x.lineWidth = 14; x.beginPath(); x.arc(84, 110, 32, 0, 7); x.stroke(); x.fillRect(112, 102, 92, 16); x.fillRect(176, 116, 12, 26); x.fillRect(154, 116, 12, 18);   // chave
    x.font = 'bold 26px serif'; x.textAlign = 'center'; x.fillText('IMÓVEIS', 128, 196); x.font = 'italic 17px serif'; x.fillText('Chave de Bronze', 128, 222);
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'handsign') {   // placa da agência: duas mãos se apertando
    x.fillStyle = '#3a2416'; x.fillRect(0, 0, S, S); x.strokeStyle = '#c9a24a'; x.lineWidth = 8; x.strokeRect(6, 6, S - 12, S - 12);
    x.save(); x.translate(128, 104); x.fillStyle = '#e8c49a'; x.strokeStyle = '#7a4a2a'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(-86, 18); x.lineTo(-40, -10); x.quadraticCurveTo(-10, -26, 18, -12); x.lineTo(40, 2); x.quadraticCurveTo(46, 12, 36, 16); x.lineTo(6, 6); x.lineTo(-30, 30); x.lineTo(-86, 40); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#d8b088'; x.beginPath(); x.moveTo(86, 18); x.lineTo(42, -12); x.quadraticCurveTo(14, -22, -8, -8); x.lineTo(-30, 8); x.quadraticCurveTo(-34, 18, -24, 20); x.lineTo(2, 12); x.quadraticCurveTo(10, 26, 0, 34); x.lineTo(30, 32); x.lineTo(86, 42); x.closePath(); x.fill(); x.stroke();
    for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(-6 + k * 10, 12 + k * 3); x.lineTo(4 + k * 10, 24 + k * 2); x.stroke(); }
    x.fillStyle = '#2e3a5a'; x.fillRect(-100, 14, 18, 34); x.fillStyle = '#6a2a1a'; x.fillRect(82, 14, 18, 34); x.restore();
    x.fillStyle = '#e2b74e'; x.font = 'bold 30px serif'; x.textAlign = 'center'; x.fillText('EMPREGOS', 128, 200); x.font = 'italic 18px serif'; x.fillText('Mão Amiga', 128, 228);
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'jobboard') {   // quadro de cortiça com os retratos dos candidatos do dia
    x.fillStyle = '#a8784a'; x.fillRect(0, 0, S, S); for (let k = 0; k < 900; k++) { x.fillStyle = 'rgba(' + (R() < 0.5 ? '60,36,16' : '220,180,120') + ',0.35)'; x.fillRect(R() * S, R() * S, 2, 2); }
    x.fillStyle = '#f2e6c8'; x.fillRect(40, 8, 176, 30); x.fillStyle = '#3a2416'; x.font = 'bold 17px serif'; x.textAlign = 'center'; x.fillText('CANDIDATOS DO DIA', 128, 29);
    const tones = ['#e8c49a', '#c89a74', '#a8764e', '#f0d0b0', '#8a5a3a', '#e2b896'], hairs = ['#3a2416', '#7a4a1a', '#1a1410', '#c8a060', '#6a6460', '#4a2e1a'], cloth = ['#6a4a5a', '#4a5a4a', '#5a4a3a', '#3a4a6a', '#7a3a2a', '#4a4a5a'];
    for (let k = 0; k < 6; k++) { const cx = 46 + (k % 3) * 82, cy = 92 + Math.floor(k / 3) * 104, rot = ((k * 7) % 5 - 2) * 0.03; x.save(); x.translate(cx, cy); x.rotate(rot);
      x.fillStyle = '#f6eedc'; x.fillRect(-32, -44, 64, 88); x.fillStyle = '#d8ccb0'; x.fillRect(-26, -38, 52, 46);
      x.fillStyle = cloth[k]; x.beginPath(); x.ellipse(0, 6, 20, 12, 0, Math.PI, 0); x.fill(); x.fillStyle = '#f4efe2'; x.fillRect(-7, -4, 14, 10);
      x.fillStyle = tones[k]; x.beginPath(); x.arc(0, -16, 11, 0, 7); x.fill(); x.fillStyle = hairs[k]; x.beginPath(); x.arc(0, -19, 11, Math.PI * 1.05, Math.PI * 1.95); x.fill(); if (k % 2 === 0) { x.fillStyle = cloth[(k + 3) % 6]; x.fillRect(-12, -30, 24, 6); }
      x.fillStyle = '#3a2416'; x.fillRect(-22, 16, 44, 4); x.fillRect(-22, 24, 30, 3); x.fillStyle = '#7a5a2a'; x.font = 'bold 11px serif'; x.fillText((6 + k * 3) + ' ouro', 0, 40);
      x.fillStyle = '#a8302a'; x.beginPath(); x.arc(0, -42, 4, 0, 7); x.fill(); x.restore(); }
    y.fillStyle = gray(0.55); y.fillRect(0, 0, S, S);
  } else if (kind === 'adsboard') {
    x.fillStyle = '#5a3a20'; x.fillRect(0, 0, S, S);
    const ads = [['#f2e6c8', 'CASA', '161/sem'], ['#e8dcc0', 'LOJA', 'à venda'], ['#f4ead4', 'OFICINA', '2520'], ['#efe2c4', 'CASA', 'nobre'], ['#f2e6c8', 'PONTO', 'centro'], ['#e8dcc0', 'ALUGA', 'vila']];
    ads.forEach(([c, t1, t2], k) => { const px_ = 14 + (k % 3) * 80, py = 16 + Math.floor(k / 3) * 118, rot = (k % 2 ? -1 : 1) * 0.04; x.save(); x.translate(px_ + 34, py + 50); x.rotate(rot); x.fillStyle = c; x.fillRect(-34, -50, 68, 100); x.fillStyle = '#3a2a1a';
      x.fillRect(-20, -38, 40, 26); x.beginPath(); x.moveTo(-24, -38); x.lineTo(0, -52); x.lineTo(24, -38); x.fill(); x.font = 'bold 12px serif'; x.textAlign = 'center'; x.fillText(t1, 0, 4); x.font = '11px serif'; x.fillText(t2, 0, 22); x.fillStyle = '#a8302a'; x.beginPath(); x.arc(24, -42, 4, 0, 7); x.fill(); x.restore(); });
    y.fillStyle = gray(0.55); y.fillRect(0, 0, S, S);
  } else if (kind === 'leaded' || kind === 'vitdragon' || kind === 'vitmug' || kind === 'vitflame') {   // vitral: losangos âmbar presos com chumbo; os brasões têm um escudo colorido no meio
    const amb = ['#4a7aa6', '#5888b2', '#42709c', '#6494ba'];   /* vidro de verdade: levemente azulado */
    for (let r = -1; r < 9; r++) for (let q = -1; q < 9; q++) { const cx = q * 32 + (r % 2 ? 16 : 0), cy = r * 32; x.fillStyle = amb[(r * 3 + q * 7 + 64) % 4]; x.beginPath(); x.moveTo(cx, cy - 16); x.lineTo(cx + 16, cy); x.lineTo(cx, cy + 16); x.lineTo(cx - 16, cy); x.closePath(); x.fill(); }
    { const gr = x.createLinearGradient(0, 0, S, S); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(220,235,255,0.28)'); gr.addColorStop(0.58, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, S, S); }   /* reflexo */
    x.strokeStyle = '#2a2018'; x.lineWidth = 4; for (let k = -8; k < 16; k++) { x.beginPath(); x.moveTo(k * 32, 0); x.lineTo(k * 32 + S, S); x.stroke(); x.beginPath(); x.moveTo(k * 32, 0); x.lineTo(k * 32 - S, S); x.stroke(); }
    if (kind !== 'leaded') {
      x.fillStyle = '#2a2018'; x.beginPath(); x.moveTo(60, 44); x.lineTo(196, 44); x.lineTo(196, 140); x.quadraticCurveTo(196, 200, 128, 222); x.quadraticCurveTo(60, 200, 60, 140); x.closePath(); x.fill();
      x.fillStyle = kind === 'vitdragon' ? '#2e7a3a' : kind === 'vitmug' ? '#8a2420' : '#24407a'; x.beginPath(); x.moveTo(68, 52); x.lineTo(188, 52); x.lineTo(188, 140); x.quadraticCurveTo(188, 194, 128, 213); x.quadraticCurveTo(68, 194, 68, 140); x.closePath(); x.fill();
      if (kind === 'vitdragon') { x.fillStyle = '#9ad860'; x.beginPath(); x.ellipse(122, 130, 34, 22, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(160, 96, 18, 14, -0.4, 0, 7); x.fill(); x.beginPath(); x.moveTo(110, 116); x.lineTo(92, 74); x.lineTo(130, 112); x.fill(); x.beginPath(); x.moveTo(90, 140); x.quadraticCurveTo(70, 170, 96, 178); x.lineTo(100, 168); x.quadraticCurveTo(84, 160, 100, 146); x.fill(); x.fillStyle = '#f0d060'; x.beginPath(); x.arc(164, 92, 4, 0, 7); x.fill(); }
      else if (kind === 'vitmug') { x.fillStyle = '#f0b040'; x.fillRect(100, 92, 50, 70); x.fillStyle = '#fff4dc'; x.beginPath(); x.ellipse(125, 92, 30, 13, 0, 0, 7); x.fill(); x.strokeStyle = '#f0b040'; x.lineWidth = 10; x.beginPath(); x.arc(156, 126, 16, -1.4, 1.4); x.stroke(); }
      else { x.fillStyle = '#ff9a30'; x.beginPath(); x.moveTo(128, 70); x.quadraticCurveTo(170, 120, 150, 170); x.quadraticCurveTo(128, 190, 106, 170); x.quadraticCurveTo(86, 120, 128, 70); x.fill(); x.fillStyle = '#ffe070'; x.beginPath(); x.moveTo(128, 110); x.quadraticCurveTo(150, 140, 140, 168); x.quadraticCurveTo(128, 178, 116, 168); x.quadraticCurveTo(106, 140, 128, 110); x.fill(); }
      x.strokeStyle = '#2a2018'; x.lineWidth = 3; x.strokeRect(68, 52, 120, 4);
    }
    y.fillStyle = gray(0.55); y.fillRect(0, 0, S, S); y.strokeStyle = gray(0.85); y.lineWidth = 4; for (let k = -8; k < 16; k++) { y.beginPath(); y.moveTo(k * 32, 0); y.lineTo(k * 32 + S, S); y.stroke(); y.beginPath(); y.moveTo(k * 32, 0); y.lineTo(k * 32 - S, S); y.stroke(); }
  } else if (kind === 'glowmask' || kind === 'glowdragon' || kind === 'glowmug' || kind === 'glowflame') {
    const gr = x.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.75); gr.addColorStop(0, '#ffe2a0'); gr.addColorStop(1, '#c88a30'); x.fillStyle = gr; x.fillRect(0, 0, S, S);
    if (kind !== 'glowmask') { x.fillStyle = kind === 'glowdragon' ? '#5ac85a' : kind === 'glowmug' ? '#e04a30' : '#5a7ae8'; x.beginPath(); x.moveTo(68, 52); x.lineTo(188, 52); x.lineTo(188, 140); x.quadraticCurveTo(188, 194, 128, 213); x.quadraticCurveTo(68, 194, 68, 140); x.closePath(); x.fill(); }
    x.strokeStyle = '#000000'; x.lineWidth = 5; for (let k = -8; k < 16; k++) { x.beginPath(); x.moveTo(k * 32, 0); x.lineTo(k * 32 + S, S); x.stroke(); x.beginPath(); x.moveTo(k * 32, 0); x.lineTo(k * 32 - S, S); x.stroke(); }
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'fascia') {   // tábua escura com RONCO DO DRAGÃO em dourado (o plano é 9x mais largo que alto: letras desenhadas esticadas na vertical)
    x.fillStyle = '#1e2a1c'; x.fillRect(0, 0, S, S); x.fillStyle = '#c9a24a'; x.fillRect(0, 0, S, 14); x.fillRect(0, S - 14, S, 14);
    x.save(); x.scale(1, 9); x.fillStyle = '#e8c060'; x.font = 'bold 15px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RONCO  DO  DRAGÃO', 128, S / 18); x.restore();
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'apothsign') {   // placa verde-garrafa com letras de latão e um almofariz
    x.fillStyle = '#1c3626'; x.fillRect(0, 0, S, S); x.strokeStyle = '#c9a24a'; x.lineWidth = 8; x.strokeRect(8, 8, S - 16, S - 16); x.lineWidth = 2; x.strokeRect(18, 18, S - 36, S - 36);
    x.fillStyle = '#d8b45a'; x.textAlign = 'center'; x.font = 'bold 34px serif'; x.fillText('BOTICÁRIO', 128, 170); x.font = 'italic 24px serif'; x.fillText('de Elva', 128, 204);
    x.fillStyle = '#c9a24a'; x.beginPath(); x.moveTo(92, 70); x.lineTo(164, 70); x.quadraticCurveTo(160, 128, 128, 132); x.quadraticCurveTo(96, 128, 92, 70); x.fill(); x.fillRect(110, 132, 36, 8); x.strokeStyle = '#e8d090'; x.lineWidth = 7; x.beginPath(); x.moveTo(140, 82); x.lineTo(176, 44); x.stroke();
    x.fillStyle = '#6aa84a'; for (const [a, b2] of [[60, 120], [196, 120], [70, 90], [186, 90]]) { x.beginPath(); x.ellipse(a, b2, 9, 18, a < 128 ? -0.5 : 0.5, 0, 7); x.fill(); }
    y.fillStyle = gray(0.55); y.fillRect(0, 0, S, S);
  } else if (kind === 'drawers') {   // gavetinhas de madeira com etiquetas e puxadores de latão
    x.fillStyle = '#3a2416'; x.fillRect(0, 0, S, S);
    for (let r = 0; r < 8; r++) for (let q = 0; q < 6; q++) { const X = 6 + q * 41, Y = 6 + r * 31; x.fillStyle = (r + q) % 3 ? '#5a3a22' : '#4e321e'; x.fillRect(X, Y, 37, 27); x.fillStyle = '#e8dcc0'; x.fillRect(X + 9, Y + 5, 19, 8); x.fillStyle = '#c9a24a'; x.beginPath(); x.arc(X + 18.5, Y + 19, 3, 0, 7); x.fill(); }
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S); for (let r = 0; r < 8; r++) for (let q = 0; q < 6; q++) { y.fillStyle = gray(0.7); y.fillRect(6 + q * 41, 6 + r * 31, 37, 27); }
  } else if (kind === 'dragsign') {
    x.fillStyle = '#6a4428'; x.fillRect(0, 0, S, S); for (let i = 0; i < 30; i++) { x.strokeStyle = 'rgba(0,0,0,0.12)'; x.beginPath(); const gy = R() * S; x.moveTo(0, gy); x.lineTo(S, gy + (R() - 0.5) * 8); x.stroke(); }
    x.strokeStyle = '#2a1a0c'; x.lineWidth = 10; x.strokeRect(5, 5, S - 10, S - 10);
    x.fillStyle = '#4e8a3a'; x.beginPath(); x.ellipse(118, 118, 52, 40, 0, 0, 7); x.fill();                                  // corpo
    x.beginPath(); x.moveTo(70, 130); x.quadraticCurveTo(30, 150, 40, 100); x.quadraticCurveTo(46, 130, 76, 112); x.fill();   // rabo
    x.beginPath(); x.ellipse(160, 76, 30, 24, -0.3, 0, 7); x.fill(); x.beginPath(); x.ellipse(188, 82, 20, 13, -0.1, 0, 7); x.fill();   // cabeça e focinho
    x.fillStyle = '#3a6a2a'; x.beginPath(); x.moveTo(110, 82); x.lineTo(72, 40); x.lineTo(96, 92); x.fill(); x.beginPath(); x.moveTo(126, 80); x.lineTo(120, 34); x.lineTo(138, 84); x.fill();   // asas
    x.fillStyle = '#efe0b8'; x.beginPath(); x.moveTo(146, 56); x.lineTo(136, 36); x.lineTo(156, 54); x.fill(); x.beginPath(); x.moveTo(164, 54); x.lineTo(162, 32); x.lineTo(174, 54); x.fill();   // chifres
    x.fillStyle = '#d8c080'; x.beginPath(); x.ellipse(122, 130, 34, 22, 0, 0, 7); x.fill();                                 // barriga
    x.strokeStyle = '#1a120a'; x.lineWidth = 4; x.beginPath(); x.arc(160, 70, 7, 0.2, Math.PI - 0.2); x.stroke();          // olho fechado, feliz
    x.beginPath(); x.arc(186, 86, 12, 0.3, Math.PI - 0.8); x.stroke();                                                      // sorriso
    x.fillStyle = '#d8a040'; x.fillRect(196, 102, 30, 40); x.fillStyle = '#f4ead4'; x.beginPath(); x.ellipse(211, 102, 18, 8, 0, 0, 7); x.fill(); x.strokeStyle = '#d8a040'; x.lineWidth = 6; x.beginPath(); x.arc(228, 122, 9, -1.4, 1.4); x.stroke();   // caneca
    x.strokeStyle = '#4e8a3a'; x.lineWidth = 9; x.beginPath(); x.moveTo(160, 116); x.lineTo(198, 118); x.stroke();          // braço segurando a caneca
    x.fillStyle = '#f0d890'; x.font = 'italic bold 20px serif'; x.fillText('z', 206, 52); x.font = 'italic bold 15px serif'; x.fillText('z', 222, 38);
    x.fillStyle = '#e8c872'; x.font = 'bold 30px serif'; x.textAlign = 'center'; x.fillText('RONCO', 128, 206); x.font = 'italic 21px serif'; x.fillText('do Dragão', 128, 234);
    y.fillStyle = gray(0.6); y.fillRect(0, 0, S, S); y.fillStyle = gray(0.2); y.fillRect(0, 0, S, 12); y.fillRect(0, S - 12, S, 12); y.fillRect(0, 0, 12, S); y.fillRect(S - 12, 0, 12, S);
  } else if (kind === 'boarsign' || kind === 'tavsign') {   /* tavsign: taverna, javali gordo com caneca */
    // placa da pousada: tábua com borda, javali magro pintado e o nome
    x.fillStyle = '#7a5230'; x.fillRect(0, 0, S, S); for (let i = 0; i < 30; i++) { x.strokeStyle = 'rgba(0,0,0,0.12)'; x.beginPath(); const gy = R() * S; x.moveTo(0, gy); x.lineTo(S, gy + (R() - 0.5) * 8); x.stroke(); }
    x.strokeStyle = '#3a2412'; x.lineWidth = 10; x.strokeRect(5, 5, S - 10, S - 10);
    x.fillStyle = '#2a1a10'; x.beginPath(); x.ellipse(128, 120, kind === 'tavsign' ? 70 : 62, kind === 'tavsign' ? 40 : 30, 0, 0, 7); x.fill();                       // corpo magro
    x.beginPath(); x.moveTo(184, 108); x.lineTo(226, 120); x.lineTo(222, 134); x.lineTo(182, 136); x.fill();     // focinho
    x.beginPath(); x.moveTo(176, 96); x.lineTo(186, 76); x.lineTo(192, 100); x.fill();                          // orelha
    for (const lx of [86, 104, 150, 168]) x.fillRect(lx, 140, 7, 30);                                              // pernas finas
    x.beginPath(); x.moveTo(66, 112); x.quadraticCurveTo(48, 100, 56, 124); x.lineWidth = 4; x.strokeStyle = '#2a1a10'; x.stroke();   // rabo
    for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(84 + k * 10, 92); x.lineTo(88 + k * 10, 82); x.lineTo(92 + k * 10, 93); x.fill(); }   // cerdas
    x.fillStyle = '#efe0b8'; x.beginPath(); x.moveTo(214, 126); x.lineTo(232, 116); x.lineTo(218, 132); x.fill();   // presa
    x.fillStyle = '#e8c872'; x.font = 'bold 30px serif'; x.textAlign = 'center'; x.fillText(kind === 'tavsign' ? 'TAVERNA' : 'POUSADA', 128, 212); x.font = 'italic 19px serif'; x.fillText(kind === 'tavsign' ? 'do Javali' : 'do Javali Magro', 128, 236);
    if (kind === 'tavsign') { x.fillStyle = '#d8a040'; x.fillRect(196, 30, 34, 42); x.fillStyle = '#f4ead4'; x.beginPath(); x.ellipse(213, 30, 20, 9, 0, 0, 7); x.fill(); x.strokeStyle = '#d8a040'; x.lineWidth = 6; x.beginPath(); x.arc(232, 52, 10, -1.4, 1.4); x.stroke(); }
    y.fillStyle = gray(0.6); y.fillRect(0, 0, S, S); y.fillStyle = gray(0.2); y.fillRect(0, 0, S, 12); y.fillRect(0, S - 12, S, 12); y.fillRect(0, 0, 12, S); y.fillRect(S - 12, 0, 12, S);
  } else if (kind === 'shoji') {   // papel de arroz com treliça de madeira clara
    x.fillStyle = '#f4efe2'; x.fillRect(0, 0, S, S); for (let k = 0; k < 900; k++) { x.fillStyle = 'rgba(160,140,100,' + (Math.random() * 0.06) + ')'; x.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 6, 1); }
    x.fillStyle = '#7a5a38'; for (let k = 0; k <= 4; k++) x.fillRect(k * S / 4 - 5, 0, 10, S); for (let k = 0; k <= 6; k++) x.fillRect(0, k * S / 6 - 5, S, 10);
    y.fillStyle = gray(0.45); y.fillRect(0, 0, S, S); y.fillStyle = gray(0.75); for (let k = 0; k <= 4; k++) y.fillRect(k * S / 4 - 5, 0, 10, S); for (let k = 0; k <= 6; k++) y.fillRect(0, k * S / 6 - 5, S, 10);
  } else if (kind === 'tatami') {   // palha de junco trançada com a borda de pano escuro
    x.fillStyle = '#b8b07a'; x.fillRect(0, 0, S, S); for (let r = 0; r < S; r += 4) { x.fillStyle = r % 8 ? 'rgba(120,110,60,.18)' : 'rgba(255,250,200,.12)'; x.fillRect(0, r, S, 2); }
    for (let k = 0; k < 2500; k++) { x.fillStyle = 'rgba(90,85,40,' + (Math.random() * 0.12) + ')'; x.fillRect(Math.random() * S, Math.random() * S, 1, 3); }
    x.fillStyle = '#26301e'; x.fillRect(0, 0, 22, S); x.fillRect(S - 22, 0, 22, S);
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S); for (let r = 0; r < S; r += 4) { y.fillStyle = gray(r % 8 ? 0.38 : 0.62); y.fillRect(0, r, S, 2); }
  } else if (kind === 'kawara') {   // telhas de barro cinza em fileiras arredondadas
    x.fillStyle = '#4e535a'; x.fillRect(0, 0, S, S); const cw = S / 8;
    for (let q = 0; q < 8; q++) { const g2 = x.createLinearGradient(q * cw, 0, q * cw + cw, 0); g2.addColorStop(0, '#3a3e44'); g2.addColorStop(0.5, '#6a7078'); g2.addColorStop(1, '#3a3e44'); x.fillStyle = g2; x.fillRect(q * cw + 2, 0, cw - 4, S); }
    x.fillStyle = 'rgba(20,22,26,.55)'; for (let r = 0; r < 8; r++) x.fillRect(0, r * S / 8, S, 5);
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S); for (let q = 0; q < 8; q++) { const g3 = y.createLinearGradient(q * cw, 0, q * cw + cw, 0); g3.addColorStop(0, gray(0.25)); g3.addColorStop(0.5, gray(0.85)); g3.addColorStop(1, gray(0.25)); y.fillStyle = g3; y.fillRect(q * cw, 0, cw, S); }
  } else if (kind === 'noren') {   // cortina de pano índigo com o punho branco do dojô
    x.fillStyle = '#1e2c4a'; x.fillRect(0, 0, S, S); for (let k = 0; k < 1200; k++) { x.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')'; x.fillRect(Math.random() * S, Math.random() * S, 3, 1); }
    x.strokeStyle = '#f2ece0'; x.lineWidth = 16; x.beginPath(); x.arc(S / 2, S * 0.42, S * 0.24, 0, 7); x.stroke();
    x.fillStyle = '#f2ece0'; x.beginPath(); x.roundRect ? x.roundRect(S * 0.36, S * 0.3, S * 0.28, S * 0.22, 18) : x.rect(S * 0.36, S * 0.3, S * 0.28, S * 0.22); x.fill(); x.fillRect(S * 0.34, S * 0.27, S * 0.07, S * 0.12); x.fillRect(S * 0.43, S * 0.25, S * 0.07, S * 0.1); x.fillRect(S * 0.52, S * 0.25, S * 0.07, S * 0.1);
    x.fillStyle = '#f2ece0'; x.font = 'bold ' + Math.round(S * 0.09) + 'px serif'; x.textAlign = 'center'; x.fillText('PUNHO DE FERRO', S / 2, S * 0.84);
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'dojosign') {   // tábua vertical clara com letras pretas a pincel (a placa é ~3,5x mais alta que larga)
    x.fillStyle = '#d8c49a'; x.fillRect(0, 0, S, S); for (let k = 0; k < 40; k++) { x.strokeStyle = 'rgba(120,90,50,' + (0.08 + Math.random() * 0.1) + ')'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, Math.random() * S); x.bezierCurveTo(S / 3, Math.random() * S, S * 2 / 3, Math.random() * S, S, Math.random() * S); x.stroke(); }
    x.strokeStyle = '#2a1a10'; x.lineWidth = 14; x.strokeRect(10, 10, S - 20, S - 20);
    x.save(); x.scale(3.5, 1); x.fillStyle = '#111'; x.textAlign = 'center'; x.font = 'bold ' + Math.round(S * 0.075) + 'px serif'; const L2 = ['D', 'O', 'J', 'Ô', '·', 'P', 'U', 'N', 'H', 'O', ' ', 'D', 'E', ' ', 'F', 'E', 'R', 'R', 'O']; L2.forEach((ch, k) => x.fillText(ch, S / 7, 40 + k * (S - 60) / L2.length + S * 0.03)); x.restore();
    x.fillStyle = '#b8261c'; x.fillRect(S * 0.36, S * 0.9, S * 0.28, S * 0.06);
    y.fillStyle = gray(0.55); y.fillRect(0, 0, S, S);
  } else if (kind === 'byobu') {   // folha de ouro com garças e ondas
    const g4 = x.createLinearGradient(0, 0, S, S); g4.addColorStop(0, '#d8b04a'); g4.addColorStop(0.5, '#f0d27a'); g4.addColorStop(1, '#c89a3a'); x.fillStyle = g4; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(160,120,40,.35)'; x.lineWidth = 2; for (let q = 0; q < 8; q++) { x.beginPath(); x.moveTo(0, q * S / 8); x.lineTo(S, q * S / 8); x.stroke(); }
    x.strokeStyle = '#2a4a6a'; x.lineWidth = 6; for (let q = 0; q < 4; q++) { x.beginPath(); for (let k = 0; k <= 16; k++) { const X = k * S / 16, Y = S * 0.82 + q * 14 + Math.sin(k * 1.3 + q) * 8; if (k) x.lineTo(X, Y); else x.moveTo(X, Y); } x.stroke(); }
    for (const [cx, cy, sc] of [[S * 0.3, S * 0.42, 1], [S * 0.68, S * 0.3, 0.8]]) { x.fillStyle = '#f6f2ea'; x.beginPath(); x.ellipse(cx, cy, 34 * sc, 16 * sc, -0.3, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - 10 * sc, cy - 4 * sc); x.lineTo(cx - 60 * sc, cy - 40 * sc); x.lineTo(cx - 20 * sc, cy - 14 * sc); x.fill(); x.beginPath(); x.moveTo(cx + 10 * sc, cy - 4 * sc); x.lineTo(cx + 70 * sc, cy - 46 * sc); x.lineTo(cx + 24 * sc, cy - 12 * sc); x.fill();
      x.strokeStyle = '#1a1a1a'; x.lineWidth = 4 * sc; x.beginPath(); x.moveTo(cx + 30 * sc, cy - 4 * sc); x.quadraticCurveTo(cx + 46 * sc, cy - 30 * sc, cx + 40 * sc, cy - 46 * sc); x.stroke(); x.fillStyle = '#c8261c'; x.beginPath(); x.arc(cx + 40 * sc, cy - 48 * sc, 5 * sc, 0, 7); x.fill(); x.strokeStyle = '#1a1a1a'; x.beginPath(); x.moveTo(cx - 6 * sc, cy + 12 * sc); x.lineTo(cx - 10 * sc, cy + 48 * sc); x.moveTo(cx + 6 * sc, cy + 12 * sc); x.lineTo(cx + 4 * sc, cy + 48 * sc); x.stroke(); }
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'gravel') {   // cascalho branco rastelado em linhas
    x.fillStyle = '#e4e0d4'; x.fillRect(0, 0, S, S); for (let k = 0; k < 6000; k++) { const v = 190 + Math.random() * 60 | 0; x.fillStyle = 'rgb(' + v + ',' + v + ',' + (v - 8) + ')'; x.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S); for (let r = 0; r < S; r += 16) { const g5 = y.createLinearGradient(0, r, 0, r + 16); g5.addColorStop(0, gray(0.3)); g5.addColorStop(0.5, gray(0.8)); g5.addColorStop(1, gray(0.3)); y.fillStyle = g5; y.fillRect(0, r, S, 16); }
    x.fillStyle = 'rgba(120,110,90,.10)'; for (let r = 0; r < S; r += 16) x.fillRect(0, r, S, 3);
  } else if (kind === 'kakejiku') {   // pergaminho pendurado: montanha, lua e pinheiro a nanquim
    x.fillStyle = '#f2ead8'; x.fillRect(0, 0, S, S); x.fillStyle = '#5a4a3a'; x.fillRect(0, 0, S, 26); x.fillRect(0, S - 26, S, 26);
    x.fillStyle = 'rgba(30,30,30,.75)'; x.beginPath(); x.moveTo(S * 0.05, S * 0.75); x.lineTo(S * 0.4, S * 0.38); x.lineTo(S * 0.55, S * 0.5); x.lineTo(S * 0.75, S * 0.3); x.lineTo(S * 0.95, S * 0.75); x.fill();
    x.fillStyle = 'rgba(30,30,30,.35)'; x.beginPath(); x.moveTo(0, S * 0.85); x.lineTo(S * 0.3, S * 0.6); x.lineTo(S * 0.6, S * 0.8); x.lineTo(S, S * 0.65); x.lineTo(S, S * 0.9); x.lineTo(0, S * 0.9); x.fill();
    x.fillStyle = '#c8261c'; x.beginPath(); x.arc(S * 0.72, S * 0.15, S * 0.07, 0, 7); x.fill(); x.fillRect(S * 0.1, S * 0.1, 16, 22);
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'fusuma') {   // painel de correr: papel creme com ondas suaves azul-acinzentadas, moldura e puxador redondo
    x.fillStyle = '#efe8d8'; x.fillRect(0, 0, S, S); x.strokeStyle = 'rgba(110,140,160,.55)'; x.lineWidth = 5;
    for (let r = 0; r < 7; r++) for (let q = -1; q < 5; q++) { const cx = q * S / 4 + (r % 2) * S / 8, cy = S * 0.25 + r * S * 0.1; x.beginPath(); x.arc(cx, cy, S / 8, Math.PI, 0); x.stroke(); }
    x.fillStyle = 'rgba(200,170,110,.35)'; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(S * (0.2 + k * 0.22), S * 0.12, 16, 0, 7); x.fill(); }
    x.strokeStyle = '#6a4a2a'; x.lineWidth = 18; x.strokeRect(9, 9, S - 18, S - 18);
    x.fillStyle = '#2a2420'; x.beginPath(); x.arc(S * 0.86, S * 0.55, 13, 0, 7); x.fill(); x.fillStyle = '#c9a24a'; x.beginPath(); x.arc(S * 0.86, S * 0.55, 8, 0, 7); x.fill();
    y.fillStyle = gray(0.45); y.fillRect(0, 0, S, S); y.strokeStyle = gray(0.8); y.lineWidth = 18; y.strokeRect(9, 9, S - 18, S - 18);
  } else if (kind === 'fusumagold') {   // folha de ouro com pinheiro e nuvens, moldura laqueada preta
    const g6 = x.createLinearGradient(0, 0, S, S); g6.addColorStop(0, '#c89a3a'); g6.addColorStop(0.45, '#f2d27a'); g6.addColorStop(1, '#c08a2e'); x.fillStyle = g6; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(150,110,40,.35)'; x.lineWidth = 2; for (let q = 0; q < 8; q++) { x.beginPath(); x.moveTo(q * S / 8, 0); x.lineTo(q * S / 8, S); x.stroke(); x.beginPath(); x.moveTo(0, q * S / 8); x.lineTo(S, q * S / 8); x.stroke(); }
    x.fillStyle = 'rgba(255,250,235,.75)'; for (const [cx, cy, rw] of [[S * 0.25, S * 0.2, 90], [S * 0.7, S * 0.62, 110]]) { x.beginPath(); x.ellipse(cx, cy, rw, 22, 0, 0, 7); x.ellipse(cx + rw * 0.5, cy - 14, rw * 0.5, 18, 0, 0, 7); x.fill(); }
    x.strokeStyle = '#3a2a1a'; x.lineWidth = 14; x.beginPath(); x.moveTo(S * 0.15, S); x.bezierCurveTo(S * 0.25, S * 0.7, S * 0.45, S * 0.65, S * 0.5, S * 0.35); x.stroke();
    x.fillStyle = '#2e5a2e'; for (const [cx, cy] of [[S * 0.5, S * 0.35], [S * 0.36, S * 0.55], [S * 0.62, S * 0.5], [S * 0.28, S * 0.72]]) { x.beginPath(); x.ellipse(cx, cy, 58, 20, -0.15, 0, 7); x.fill(); }
    x.strokeStyle = '#140c08'; x.lineWidth = 16; x.strokeRect(8, 8, S - 16, S - 16); x.fillStyle = '#c9a24a'; x.beginPath(); x.arc(S * 0.88, S * 0.55, 12, 0, 7); x.fill();
    y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'kanoland') {   // paisagem contínua sobre folha de ouro (estilo Kanō): montanhas azuis, névoa, lago azul, ponte, pinheiros e garças
    const Wd = WIDE, g8 = x.createLinearGradient(0, 0, 0, S); g8.addColorStop(0, '#e8c470'); g8.addColorStop(0.5, '#f2d488'); g8.addColorStop(1, '#d8aa50'); x.fillStyle = g8; x.fillRect(0, 0, Wd, S);
    x.strokeStyle = 'rgba(160,115,40,.28)'; x.lineWidth = 2; for (let q = 0; q < Wd; q += 64) { x.beginPath(); x.moveTo(q, 0); x.lineTo(q, S); x.stroke(); } for (let q = 0; q < S; q += 64) { x.beginPath(); x.moveTo(0, q); x.lineTo(Wd, q); x.stroke(); }   /* quadradinhos da folha de ouro */
    const ridge = (base, amp, seed, col1, col2) => { const g9 = x.createLinearGradient(0, base - amp, 0, base + 60); g9.addColorStop(0, col1); g9.addColorStop(1, col2); x.fillStyle = g9; x.beginPath(); x.moveTo(0, S); for (let q = 0; q <= Wd; q += 16) { const h = Math.sin(q / 210 + seed) * amp * 0.6 + Math.sin(q / 77 + seed * 2.3) * amp * 0.25 + Math.sin(q / 31 + seed * 5) * amp * 0.08; x.lineTo(q, base - Math.max(0, h + amp * 0.4)); } x.lineTo(Wd, S); x.closePath(); x.fill(); };
    ridge(230, 150, 1.3, '#7ea4cc', '#b8cce0'); ridge(270, 120, 4.1, '#3e6a9e', '#7a9cc4'); ridge(310, 90, 7.7, '#1e3e72', '#4a6e9e');   /* três camadas de montanhas azuis */
    x.fillStyle = 'rgba(248,232,190,.85)'; for (let q = 0; q < 9; q++) { const cx = (q * 260 + 90) % Wd, cy = 200 + (q % 3) * 50; x.beginPath(); x.ellipse(cx, cy, 150, 18, 0, 0, 7); x.ellipse(cx + 70, cy - 12, 80, 14, 0, 0, 7); x.fill(); }   /* faixas de névoa dourada */
    const lg = x.createLinearGradient(0, 360, 0, S); lg.addColorStop(0, '#2a5a9a'); lg.addColorStop(1, '#16386e'); x.fillStyle = lg; x.fillRect(0, 360, Wd, S - 360);   /* lago azul */
    x.strokeStyle = 'rgba(200,225,250,.55)'; x.lineWidth = 3; for (let r = 0; r < 7; r++) for (let q = 0; q < Wd; q += 90) { const yy = 380 + r * 18; x.beginPath(); x.moveTo(q + (r % 2) * 40, yy); x.quadraticCurveTo(q + 25 + (r % 2) * 40, yy - 6, q + 50 + (r % 2) * 40, yy); x.stroke(); }
    x.fillStyle = 'rgba(248,232,190,.9)'; x.fillRect(0, 352, Wd, 10);   /* margem de névoa */
    { const bx = 1240; x.strokeStyle = '#b8261c'; x.lineWidth = 10; x.beginPath(); x.moveTo(bx - 140, 372); x.quadraticCurveTo(bx, 300, bx + 140, 372); x.stroke(); x.lineWidth = 4; for (let k = -3; k <= 3; k++) { const px2 = bx + k * 40, py2 = 372 - (1 - (k / 3.5) ** 2) * 66; x.beginPath(); x.moveTo(px2, py2); x.lineTo(px2, py2 + 26); x.stroke(); } }   /* ponte vermelha em arco */
    { const px3 = 520; x.fillStyle = '#5a2a1a'; x.fillRect(px3 - 40, 300, 80, 46); x.fillStyle = '#20304a'; x.beginPath(); x.moveTo(px3 - 64, 304); x.lineTo(px3, 270); x.lineTo(px3 + 64, 304); x.fill(); x.fillStyle = '#b8261c'; x.fillRect(px3 - 34, 316, 68, 6); }   /* pavilhão à beira do lago */
    const pine = (px, py, sc) => { x.strokeStyle = '#3a2412'; x.lineWidth = 9 * sc; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + 20 * sc, py - 60 * sc, px - 30 * sc, py - 110 * sc, px + 10 * sc, py - 170 * sc); x.stroke(); x.fillStyle = '#2a4a2a'; for (const [ox, oy, rw] of [[0, -170, 60], [-40, -120, 52], [38, -100, 48], [-10, -60, 40]]) { x.beginPath(); x.ellipse(px + ox * sc, py + oy * sc, rw * sc, 15 * sc, -0.12, 0, 7); x.fill(); } };
    pine(140, 400, 1.2); pine(860, 390, 1.0); pine(1720, 405, 1.3); pine(1960, 395, 0.9);
    const crane = (cx, cy, sc) => { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx, cy, 22 * sc, 8 * sc, -0.2, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - 4 * sc, cy - 2 * sc); x.lineTo(cx - 40 * sc, cy - 26 * sc); x.lineTo(cx - 10 * sc, cy - 8 * sc); x.fill(); x.beginPath(); x.moveTo(cx + 4 * sc, cy - 2 * sc); x.lineTo(cx + 44 * sc, cy - 30 * sc); x.lineTo(cx + 12 * sc, cy - 6 * sc); x.fill(); x.strokeStyle = '#1a1a1a'; x.lineWidth = 3 * sc; x.beginPath(); x.moveTo(cx + 20 * sc, cy - 2 * sc); x.lineTo(cx + 38 * sc, cy - 10 * sc); x.stroke(); x.fillStyle = '#c8261c'; x.beginPath(); x.arc(cx + 38 * sc, cy - 11 * sc, 3 * sc, 0, 7); x.fill(); };
    crane(360, 120, 1); crane(420, 150, 0.8); crane(1480, 100, 1.1); crane(1560, 130, 0.8); crane(1900, 160, 0.9);
    y.fillStyle = gray(0.5); y.fillRect(0, 0, Wd, S);
  } else if (kind === 'ranma') {   // faixa de madeira entalhada vazada: nuvens e garças
    x.fillStyle = '#5a3a20'; x.fillRect(0, 0, S, S); x.fillStyle = '#1a1008';
    for (let q = 0; q < 5; q++) { const cx = (q + 0.5) * S / 5; x.beginPath(); x.ellipse(cx, S * 0.5, S * 0.07, S * 0.2, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx + S * 0.07, S * 0.36, S * 0.05, S * 0.12, 0.6, 0, 7); x.fill(); }
    x.strokeStyle = '#3a2412'; x.lineWidth = 10; x.strokeRect(5, 5, S - 10, S - 10); x.fillStyle = '#c9a24a'; x.fillRect(0, 0, S, 6); x.fillRect(0, S - 6, S, 6);
    y.fillStyle = gray(0.6); y.fillRect(0, 0, S, S); y.fillStyle = gray(0.15); for (let q = 0; q < 5; q++) { const cx = (q + 0.5) * S / 5; y.beginPath(); y.ellipse(cx, S * 0.5, S * 0.07, S * 0.2, 0, 0, 7); y.fill(); }
  } else if (kind === 'nafuda') {   // quadro com as plaquinhas de madeira dos alunos (nafudakake)
    x.fillStyle = '#4a2e1a'; x.fillRect(0, 0, S, S);
    for (let q = 0; q < 14; q++) { const X = 12 + q * (S - 24) / 14; x.fillStyle = q % 5 === 0 ? '#e8d4a8' : '#d8bc88'; x.fillRect(X + 2, 30, (S - 24) / 14 - 4, S - 60); x.fillStyle = '#1a1a1a'; for (let k = 0; k < 4; k++) x.fillRect(X + (S - 24) / 28 - 3, 50 + k * 44, 6, 26); }
    x.fillStyle = '#c8261c'; x.fillRect(12, 8, 40, 16); y.fillStyle = gray(0.5); y.fillRect(0, 0, S, S);
  } else if (kind === 'ishigaki') {   // muralha de pedras encaixadas, estilo castelo japonês
    x.fillStyle = '#4a4844'; x.fillRect(0, 0, S, S); y.fillStyle = gray(0.2); y.fillRect(0, 0, S, S);
    for (let r = 0; r < 5; r++) { let X = (r % 2) * -40; while (X < S) { const wdt = 70 + Math.random() * 60, hgt = S / 5 - 6, Y = r * S / 5 + 3, v = 100 + Math.random() * 40 | 0; x.fillStyle = 'rgb(' + v + ',' + (v - 4) + ',' + (v - 10) + ')'; x.beginPath(); x.moveTo(X + 6, Y); x.lineTo(X + wdt - 4, Y + 2); x.lineTo(X + wdt, Y + hgt - 4); x.lineTo(X + 3, Y + hgt); x.closePath(); x.fill(); const g7 = y.createRadialGradient(X + wdt / 2, Y + hgt / 2, 4, X + wdt / 2, Y + hgt / 2, wdt / 1.6); g7.addColorStop(0, gray(0.85)); g7.addColorStop(1, gray(0.35)); y.fillStyle = g7; y.beginPath(); y.moveTo(X + 6, Y); y.lineTo(X + wdt - 4, Y + 2); y.lineTo(X + wdt, Y + hgt - 4); y.lineTo(X + 3, Y + hgt); y.closePath(); y.fill(); X += wdt + 4; } }
  } else if (kind === 'iron') {
    noiseDots(1500, 0.5, 3, 0.15, 0.3);
  }
  }
  const map = new THREE.CanvasTexture(c), bump = new THREE.CanvasTexture(b);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (kind === 'plaster') t.repeat.set(0.22, 0.22); }   // reboco: textura grande, sem padrão repetido
  map.encoding = THREE.sRGBEncoding;
  return CTX3[kind] = { map, bump };
}
const SMATS = new Map();
function smat(kind, hex, o = {}) {
  const key = kind + hex + JSON.stringify(o);
  let m = SMATS.get(key);
  if (m) return m;
  const p = { color: new THREE.Color(hex).convertSRGBToLinear(), roughness: o.rough ?? 0.9, metalness: o.metal ?? 0 };
  if (kind) { const t = canvasTex(kind); p.map = t.map; p.bumpMap = t.bump; p.bumpScale = o.bump ?? 1.2; }
  if (o.side) p.side = o.side;
  if (o.vc) p.vertexColors = true;
  if (o.alphaTest) { p.alphaTest = o.alphaTest; p.transparent = false; }
  if (o.leafMap) { p.map = o.leafMap; p.alphaTest = 0.5; p.side = THREE.DoubleSide; }
  if (o.emissive) { p.emissive = new THREE.Color(o.emissive).convertSRGBToLinear(); p.emissiveIntensity = o.ei ?? 1; }
  if (o.emap && p.map) p.emissiveMap = p.map;   /* vitral: a própria textura brilha */
  if (o.emapKind) { const em = canvasTex(o.emapKind).map; p.emissiveMap = em; }   /* brilho com desenho próprio (luz de dentro) */
  if (o.transparent) { p.transparent = true; p.opacity = o.opacity ?? 0.8; }
  m = new THREE.MeshStandardMaterial(p);
  SMATS.set(key, m);
  return m;
}
// textura de folhas (recorte com transparência)
let _leafTex = null, _needleTex = null;
function leafTex() {
  if (_leafTex) return _leafTex;
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), R = rng(77);
  for (let i = 0; i < 90; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 52, px_ = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d;
    const v = 0.55 + R() * 0.45, ang = R() * Math.PI * 2, l = 7 + R() * 5;
    x.save(); x.translate(px_, py); x.rotate(ang);
    x.fillStyle = `rgb(${Math.round(v * 225)},${Math.round(v * 245)},${Math.round(v * 200)})`;
    x.beginPath(); x.moveTo(0, -l); x.quadraticCurveTo(l * 0.55, 0, 0, l); x.quadraticCurveTo(-l * 0.55, 0, 0, -l); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(0, -l); x.lineTo(0, l); x.stroke();
    x.restore();
  }
  _leafTex = new THREE.CanvasTexture(c); _leafTex.encoding = THREE.sRGBEncoding;
  return _leafTex;
}
function needleTex() {
  if (_needleTex) return _needleTex;
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), R = rng(78);
  x.lineCap = 'round';
  x.strokeStyle = '#5a4a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(64, 4); x.lineTo(64, 124); x.stroke();
  for (let i = 0; i < 260; i++) {
    const t = R(), py = 6 + t * 116, side = R() < 0.5 ? -1 : 1, l = (1 - Math.abs(t - 0.45)) * 46 * (0.6 + R() * 0.4), v = 0.5 + R() * 0.5;
    x.strokeStyle = `rgb(${Math.round(v * 200)},${Math.round(v * 240)},${Math.round(v * 210)})`; x.lineWidth = 1.2 + R();
    x.beginPath(); x.moveTo(64, py); x.lineTo(64 + side * l, py + l * 0.45); x.stroke();
  }
  _needleTex = new THREE.CanvasTexture(c); _needleTex.encoding = THREE.sRGBEncoding;
  return _needleTex;
}

// ---------- ajudantes de geometria ----------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function mk(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
function grp(...a) { const g = new THREE.Group(); a.forEach(o => o && g.add(o)); return g; }
// UV pelo mundo (as texturas continuam de uma peça para outra)
function wuv(g, s = 1) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u * s; uv[i * 2 + 1] = v * s;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
const BOX = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const CYL = (r1, r2, h, x, y, z, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s).translate(x, y, z);
function wbox(w, h, d, x, y, z, m, s = 1) { return mk(wuv(BOX(w, h, d, x, y, z), s), m); }
// deforma vértices com ruído (pedras, troncos irregulares)
function jitter(g, amt, seed, flatBottom) {
  const p = g.attributes.position, R = rng(seed), cache = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let d = cache.get(key); if (!d) { d = [(R() - 0.5) * amt, (R() - 0.5) * amt, (R() - 0.5) * amt]; cache.set(key, d); }
    p.setXYZ(i, x + d[0], flatBottom && y <= flatBottom ? y : y + d[1], z + d[2]);
  }
  g.computeVertexNormals();
  return g;
}
// cores por vértice (musgo em cima, neve, etc.)
function vcolor(g, fn) {
  const p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(c, p.getX(i), p.getY(i), p.getZ(i), n.getY(i)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
// cartões de folhas (planos com textura recortada), com normais "de copa" para luz macia
function leafCards(cards, center, size) {
  const pos = [], nor = [], uv = [], idx = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
  cards.forEach((cd, k) => {
    e.set(cd.rx, cd.ry, cd.rz); q.setFromEuler(e);
    const s = (cd.s || size) / 2, nn = V3(cd.x - center.x, (cd.y - center.y) * 1.2 + 0.35, cd.z - center.z).normalize();
    const corners = [[-s, -s, 0, 0], [s, -s, 1, 0], [s, s, 1, 1], [-s, s, 0, 1]];
    for (const [a, b, u, w] of corners) { v.set(a, b, 0).applyQuaternion(q); pos.push(cd.x + v.x, cd.y + v.y, cd.z + v.z); nor.push(nn.x, nn.y, nn.z); uv.push(u, w); }
    const o = k * 4; idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
// copa: aglomerados de cartões numa elipse
function crown(R, cx, cy, cz, rx, ry, n, size, leafM, coreHex) {
  const cards = [];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, el = Math.acos(R() * 2 - 1), d = 0.55 + Math.sqrt(R()) * 0.45;
    cards.push({ x: cx + Math.sin(el) * Math.cos(a) * rx * d, y: cy + Math.cos(el) * ry * d, z: cz + Math.sin(el) * Math.sin(a) * rx * d, rx: R() * 6, ry: R() * 6, rz: R() * 6, s: size * (0.75 + R() * 0.5) });
  }
  const g = grp(mk(leafCards(cards, V3(cx, cy, cz), size), leafM));
  if (coreHex) { const core = jitter(new THREE.IcosahedronGeometry(1, 1), 0.25, Math.floor(R() * 1e6)).scale(rx * 0.62, ry * 0.6, rx * 0.62).translate(cx, cy, cz); g.add(mk(core, smat(null, coreHex, { rough: 1 }))); }
  return g;
}
// galho/tronco afunilado entre dois pontos
function limb(a, b, r1, r2, m, seg = 7) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r2, r1, L, seg, 3);
  const o = mk(g, m); o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
  return o;
}

// ============================================================
//  VEGETAÇÃO E ROCHAS
// ============================================================
const LEAF_TINT = { 0: '#6a9a40', 1: '#78ac48', 2: '#d89a34', 3: '#4a7444' };
const CORE_TINT = { 0: '#2a4a1e', 1: '#305824', 2: '#6a4416', 3: '#1c3420' };
function mTree(v, tint) {
  const R = rng(101 + v * 13 + tint * 7), bark = smat('bark', '#6a5038', { bump: 2 });
  const g = grp();
  const top = V3((R() - 0.5) * 0.15, 1.15, (R() - 0.5) * 0.15);
  g.add(limb(V3(0, -0.05, 0), top, 0.15, 0.1, bark, 9));
  // raízes
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + R(); g.add(limb(V3(0, 0.18, 0), V3(Math.cos(a) * 0.28, -0.02, Math.sin(a) * 0.28), 0.07, 0.025, bark, 6)); }
  // galhos e copas
  const leafM = smat(null, LEAF_TINT[tint] || LEAF_TINT[0], { leafMap: leafTex(), rough: 0.8 });
  const blobs = [[0, 1.9, 0, 0.78, 0.62]];
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + R() * 0.8, d = 0.45 + R() * 0.15; blobs.push([Math.cos(a) * d, 1.55 + R() * 0.55, Math.sin(a) * d, 0.42 + R() * 0.12, 0.38 + R() * 0.08]); }
  for (const [bx, by, bz, rx, ry] of blobs) {
    if (bx || bz) g.add(limb(V3(top.x * 0.8, 1.0 + R() * 0.2, top.z * 0.8), V3(bx * 0.8, by - 0.15, bz * 0.8), 0.07, 0.03, bark, 6));
    g.add(crown(R, bx, by, bz, rx, ry, Math.round(rx * 110), 0.44, leafM, CORE_TINT[tint] || CORE_TINT[0]));
  }
  if (tint === 0 && v === 1) for (let k = 0; k < 12; k++) { const a = R() * 6.28, el = R() * 1.2; g.add(mk(new THREE.SphereGeometry(0.035, 6, 5).translate(Math.cos(a) * 0.75 * Math.cos(el - 0.4), 2.0 + Math.sin(el) * 0.5, Math.sin(a) * 0.75 * Math.cos(el - 0.4)), smat(null, '#b0281e', { rough: 0.4 }))); }
  return g;
}
function mPine(v) {
  const R = rng(201 + v * 11), bark = smat('bark', '#5a4030', { bump: 2 });
  const g = grp(limb(V3(0, -0.05, 0), V3(0, 3.1, 0), 0.1, 0.03, bark, 8));
  const nm = smat(null, '#5e9060', { leafMap: needleTex(), rough: 0.85 });
  const core = smat(null, '#1e3a26', { rough: 1 });
  const layers = 7, H0 = 0.55, H1 = 3.3;
  for (let l = 0; l < layers; l++) {
    const t = l / (layers - 1), y = H0 + t * (H1 - H0 - 0.3), rad = (1 - t) * 0.72 + 0.12;
    g.add(mk(jitter(new THREE.ConeGeometry(rad * 0.8, 0.55, 10, 1, true), 0.05, 300 + l + v * 9).translate(0, y + 0.15, 0), core));
    const n = Math.round(10 + rad * 22);
    // cada cartão aponta para fora e cai um pouco (galho de pinheiro)
    const pos = [], nor = [], uv = [], idx = [], q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), vv = new THREE.Vector3();
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + R() * 0.3, d = rad * (0.15 + R() * 0.1), cy = y + 0.12 + R() * 0.08, sz = rad * 0.9 + 0.12;
      e.set(0, -a + Math.PI / 2, 0); q.setFromEuler(e);
      const droop = 0.35 + R() * 0.25, nn = V3(Math.cos(a), 0.9, Math.sin(a)).normalize(), wdt = sz * 0.32;
      // cartão no plano horizontal, saindo do tronco para fora e caindo
      const pts = [[-wdt, 0, 0, 0], [wdt, 0, 1, 0], [wdt, sz, 1, 1], [-wdt, sz, 0, 1]];
      for (const [a2, b2, u, w] of pts) {
        vv.set(a2, -b2 * droop, b2).applyQuaternion(q);
        pos.push(Math.cos(a) * d + vv.x, cy + vv.y, Math.sin(a) * d + vv.z); nor.push(nn.x, nn.y, nn.z); uv.push(u, w);
      }
      const o = k * 4; idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); cg.setIndex(idx);
    g.add(mk(cg, nm));
  }
  return g;
}
function mDeadTree(v) {
  const R = rng(301 + v * 5), bark = smat('bark', '#5a4c42', { bump: 2 }), g = grp();
  const branch = (a, dir, len, r, d) => {
    const b = a.clone().addScaledVector(dir, len);
    b.x += (R() - 0.5) * 0.1; b.z += (R() - 0.5) * 0.1;
    g.add(limb(a, b, r, r * 0.65, bark, 6));
    if (d > 0) for (let k = 0; k < 2; k++) {
      const nd = dir.clone().applyAxisAngle(V3(1, 0, 0), (R() - 0.5) * 1.3).applyAxisAngle(V3(0, 0, 1), (R() - 0.5) * 1.3);
      nd.y = Math.abs(nd.y) * 0.8 + 0.2; nd.normalize();
      branch(b, nd, len * 0.68, r * 0.62, d - 1);
    }
  };
  branch(V3(0, -0.05, 0), V3(0, 1, 0), 1.0, 0.12, 3);
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + R(); g.add(limb(V3(0, 0.15, 0), V3(Math.cos(a) * 0.3, -0.02, Math.sin(a) * 0.3), 0.07, 0.02, bark, 5)); }
  return g;
}
function mBush(v) {
  const R = rng(401 + v * 3), leafM = smat(null, '#5a8a3a', { leafMap: leafTex(), rough: 0.8 }), g = grp();
  for (const [x, z, r] of [[-0.2, 0.05, 0.3], [0.2, -0.05, 0.3], [0, 0, 0.36]]) g.add(crown(R, x, r * 0.85, z, r, r * 0.8, 46, 0.32, leafM, '#18301a'));
  if (v === 2) for (let k = 0; k < 14; k++) { const a = R() * 6.28; g.add(mk(new THREE.SphereGeometry(0.03, 6, 5).translate(Math.cos(a) * 0.35, 0.2 + R() * 0.4, Math.sin(a) * 0.35), smat(null, '#6a1a3a', { rough: 0.35 }))); }
  return g;
}
// ---------- espécies novas ----------
function mOak(v) {
  const R = rng(1101 + v * 7), bark = smat('bark', '#5a4430', { bump: 2.2 }), g = grp();
  const top = V3((R() - 0.5) * 0.1, 0.85, (R() - 0.5) * 0.1); g.add(limb(V3(0, -0.05, 0), top, 0.24, 0.17, bark, 10));
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + R(); g.add(limb(V3(0, 0.2, 0), V3(Math.cos(a) * 0.4, -0.02, Math.sin(a) * 0.4), 0.1, 0.03, bark, 6)); }
  const leafM = smat(null, '#5a8a3a', { leafMap: leafTex(), rough: 0.85 }), blobs = [[0, 1.75, 0, 0.75, 0.48]];
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + R() * 0.6, d = 0.7 + R() * 0.2; blobs.push([Math.cos(a) * d, 1.35 + R() * 0.35, Math.sin(a) * d, 0.55 + R() * 0.12, 0.38 + R() * 0.08]); }
  for (const [bx, by, bz, rx, ry] of blobs) { if (bx || bz) g.add(limb(V3(top.x, 0.8, top.z), V3(bx * 0.75, by - 0.2, bz * 0.75), 0.1, 0.045, bark, 6)); g.add(crown(R, bx, by, bz, rx, ry, Math.round(rx * 120), 0.42, leafM, '#203a16')); }
  return g;
}
function mBirch(v) {
  const R = rng(1201 + v * 7), bark = smat(null, '#e8e2d2', { rough: 0.7 }), dark = smat(null, '#2a2622', { rough: 0.9 }), g = grp();
  const top = V3((R() - 0.5) * 0.25, 2.2, (R() - 0.5) * 0.25); g.add(limb(V3(0, -0.05, 0), top, 0.085, 0.045, bark, 8));
  for (let k = 0; k < 10; k++) { const t = 0.1 + R() * 0.8, y = t * 2.1; g.add(mk(new THREE.BoxGeometry(0.05 + R() * 0.05, 0.02, 0.012).translate(top.x * t + (R() - 0.5) * 0.02, y, top.z * t + 0.07), dark, false)); }
  const leafM = smat(null, '#9ac04e', { leafMap: leafTex(), rough: 0.8 });
  for (let k = 0; k < 5; k++) { const a = k * 1.3 + R(), y = 1.3 + k * 0.22, d = 0.25 + R() * 0.15; g.add(limb(V3(top.x * y / 2.2, y - 0.2, top.z * y / 2.2), V3(Math.cos(a) * d, y + 0.1, Math.sin(a) * d), 0.025, 0.012, bark, 5)); g.add(crown(R, Math.cos(a) * d, y + 0.1, Math.sin(a) * d, 0.3, 0.28, 40, 0.28, leafM, null)); }
  g.add(crown(R, top.x, 2.3, top.z, 0.35, 0.3, 46, 0.28, leafM, null));
  return g;
}
function mWillow(v) {
  const R = rng(1301 + v * 7), bark = smat('bark', '#4e4232', { bump: 2 }), g = grp();
  const lean = (R() - 0.5) * 0.4, top = V3(lean, 1.25, (R() - 0.5) * 0.3); g.add(limb(V3(0, -0.05, 0), top, 0.2, 0.13, bark, 9));
  const leafM = smat(null, '#7aa04a', { leafMap: leafTex(), rough: 0.85, side: THREE.DoubleSide });
  g.add(crown(R, top.x, 1.75, top.z, 0.85, 0.45, 110, 0.4, leafM, '#2a4020'));
  // galhos caídos: cortinas de folhas penduradas até perto do chão
  const cards = [];
  for (let k = 0; k < 90; k++) { const a = R() * Math.PI * 2, d = 0.55 + R() * 0.45, len = 0.8 + R() * 0.6; for (let s = 0; s < 3; s++) cards.push({ x: top.x + Math.cos(a) * d, y: 1.7 - s * len / 3 - 0.15, z: top.z + Math.sin(a) * d, rx: 0, ry: a + Math.PI / 2, rz: (R() - 0.5) * 0.3, s: 0.32 }); }
  g.add(mk(leafCards(cards, V3(top.x, 1.2, top.z), 0.32), leafM));
  return g;
}
function mFern(v) {
  const R = rng(1401 + v * 5), g = grp(), leafM = smat(null, ['#4a7a30', '#5a8a36', '#6a8a3a'][v % 3], { leafMap: leafTex(), rough: 0.85, side: THREE.DoubleSide });
  const cards = [];
  for (let f = 0; f < 9; f++) { const a = f / 9 * Math.PI * 2 + R() * 0.4, len = 0.45 + R() * 0.25; for (let s = 1; s <= 6; s++) { const t = s / 6, rr = t * len, h = Math.sin(t * Math.PI * 0.85) * 0.35; cards.push({ x: Math.cos(a) * rr, y: h, z: Math.sin(a) * rr, rx: -0.6 + t, ry: -a, rz: 0, s: 0.14 * (1.2 - t * 0.6) }); } }
  g.add(mk(leafCards(cards, V3(0, 0.1, 0), 0.14), leafM, false));
  return g;
}
function mRoots(v) {
  const R = rng(1501 + v), bark = smat('bark', '#4a3826', { bump: 2 }), g = grp();
  for (let k = 0; k < 5; k++) { const a = R() * 6.28, a2 = a + (R() - 0.5) * 1.2, l = 0.35 + R() * 0.25; g.add(limb(V3(Math.cos(a) * 0.05, 0.06, Math.sin(a) * 0.05), V3(Math.cos(a) * l * 0.6, 0.09, Math.sin(a) * l * 0.6), 0.05, 0.035, bark, 5)); g.add(limb(V3(Math.cos(a) * l * 0.6, 0.09, Math.sin(a) * l * 0.6), V3(Math.cos(a2) * l, 0.0, Math.sin(a2) * l), 0.035, 0.012, bark, 5)); }
  return g;
}
function mShrooms(v) {
  const R = rng(1601 + v), g = grp(), stem = smat(null, '#e8dfca', { rough: 0.7 }), cap = smat(null, v ? '#8a5a2a' : '#c8b07a', { rough: 0.5 });
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, x = Math.cos(a) * 0.36, z = Math.sin(a) * 0.36, s = 0.7 + R() * 0.5; g.add(mk(CYL(0.018 * s, 0.024 * s, 0.1 * s, x, 0.05 * s, z, 7), stem)); g.add(mk(new THREE.SphereGeometry(0.06 * s, 12, 6, 0, 6.28, 0, Math.PI / 2).scale(1, 0.6, 1).translate(x, 0.09 * s, z), cap)); }
  return g;
}
function mBerry(v) {
  const R = rng(1701 + v * 3), leafM = smat(null, '#4e7a34', { leafMap: leafTex(), rough: 0.8 }), g = grp();
  for (const [x, z, r] of [[-0.18, 0.05, 0.28], [0.18, -0.05, 0.28], [0, 0, 0.33]]) g.add(crown(R, x, r * 0.85, z, r, r * 0.75, 44, 0.28, leafM, '#1a301a'));
  const berry = smat(null, v ? '#2a2a7a' : '#c0182a', { rough: 0.3 });
  for (let k = 0; k < 22; k++) { const a = R() * 6.28, el = R() * 1.2; g.add(mk(new THREE.SphereGeometry(0.03, 7, 5).translate(Math.cos(a) * 0.32 * Math.cos(el - 0.3), 0.22 + Math.sin(el) * 0.25, Math.sin(a) * 0.32 * Math.cos(el - 0.3)), berry)); }
  return g;
}
function mHerb(v) {
  const R = rng(1801 + v), g = grp(), leafM = smat(null, '#6aa040', { leafMap: leafTex(), rough: 0.8, side: THREE.DoubleSide }), fl = smat(null, v ? '#c8b8f0' : '#f4f0e0', { emissive: v ? '#4a3a7a' : '#4a4a3a', ei: 0.2 });
  const cards = []; for (let k = 0; k < 14; k++) { const a = R() * 6.28, r = 0.05 + R() * 0.14; cards.push({ x: Math.cos(a) * r, y: 0.05 + R() * 0.18, z: Math.sin(a) * r, rx: -0.9, ry: -a, rz: 0, s: 0.12 }); }
  g.add(mk(leafCards(cards, V3(0, 0.1, 0), 0.12), leafM, false));
  for (let k = 0; k < 6; k++) { const a = R() * 6.28, r = R() * 0.1, h = 0.3 + R() * 0.12; g.add(limb(V3(Math.cos(a) * r, 0, Math.sin(a) * r), V3(Math.cos(a) * r, h, Math.sin(a) * r), 0.006, 0.004, smat(null, '#4a7a2a'), 4)); g.add(mk(new THREE.SphereGeometry(0.025, 6, 5).translate(Math.cos(a) * r, h, Math.sin(a) * r), fl)); }
  return g;
}
function mBoulder(v) {
  const g = rockGeo(1900 + v * 11, 0.7, 1.15, 0.85, 1.0).translate(0, 0.32, 0);
  vcolor(g, (c, x, y, z, ny) => { const m = ny > 0.25 && vnoise(x * 4, z * 4, 19) > 0.3; const l = vnoise(x * 9, y * 9, 21) > 0.75; c.set(m ? '#4e6e2c' : l ? '#a8a070' : '#6e6a62'); c.convertSRGBToLinear(); });
  return grp(mk(g, smat('rock', '#ffffff', { vc: true, bump: 1.5 })));
}
// cadafalso: tablado de 3x3 tiles com escada na frente, guarda-corpo, guilhotina, cesto e alavanca (v=1: lâmina embaixo)
function mGuillotine(v) {
  const o = grp(), W = WOOD(), D = DWOOD(), iron = smat(null, '#9aa0a8', { metal: 1, rough: 0.3 }), rope = smat(null, '#a88a5a', { rough: 0.9 });
  o.add(wbox(2.9, 0.12, 2.9, 0, 0.74, 0, W, 2)); o.add(wbox(2.8, 0.68, 2.8, 0, 0.34, 0, D, 2));
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) o.add(wbox(0.16, 0.8, 0.16, x, 0.4, z, D, 1.5));
  for (let s = 0; s < 4; s++) o.add(wbox(0.95, 0.18, 0.26, 0, 0.09 + s * 0.18, 2.12 - s * 0.22, W, 1.5));
  // guarda-corpo nos lados e atrás
  for (const [x, z, w, d] of [[-1.38, 0, 0.06, 2.8], [1.38, 0, 0.06, 2.8], [0, -1.38, 2.8, 0.06]]) { o.add(wbox(w, 0.06, d, x, 1.3, z, D, 1.5)); }
  for (const [x, z] of [[-1.38, -1.38], [-1.38, 0], [-1.38, 1.3], [1.38, -1.38], [1.38, 0], [1.38, 1.3], [0, -1.38]]) o.add(wbox(0.07, 0.52, 0.07, x, 1.06, z, D, 1.5));
  // guilhotina: dois montantes altos, travessa, lâmina inclinada, luneta e prancha
  const z0 = -0.25;
  for (const x of [-0.34, 0.34]) o.add(wbox(0.13, 2.6, 0.13, x, 2.1, z0, D, 2));
  o.add(wbox(0.95, 0.16, 0.2, 0, 3.42, z0, D, 2)); o.add(wbox(0.12, 0.12, 0.6, 0, 3.42, z0 - 0.1, D, 2));
  const by = v ? 1.32 : 2.85, bl = new THREE.Shape(); bl.moveTo(-0.28, 0.22); bl.lineTo(0.28, 0.22); bl.lineTo(0.28, 0.02); bl.lineTo(-0.28, -0.14); bl.closePath();
  o.add(mk(new THREE.ExtrudeGeometry(bl, { depth: 0.03, bevelEnabled: false }).translate(0, by, z0 - 0.015), iron));
  o.add(wbox(0.6, 0.14, 0.1, 0, by + 0.29, z0, D, 1));
  o.add(wbox(0.62, 0.16, 0.14, 0, 1.12, z0, D, 1.5)); o.add(wbox(0.62, 0.12, 0.14, 0, 1.38, z0, D, 1.5));
  o.add(mk(new THREE.TorusGeometry(0.09, 0.03, 6, 14).translate(0, 1.24, z0 + 0.08), D));
  o.add(wbox(0.4, 0.08, 1.3, 0, 0.98, z0 - 0.75, W, 1.5)); for (const zz of [-0.5, -1.3]) o.add(wbox(0.08, 0.2, 0.08, 0, 0.88, z0 + zz, D, 1));
  // cesto na frente da luneta e alavanca com corda
  o.add(mk(new THREE.CylinderGeometry(0.2, 0.15, 0.24, 12, 1, true).translate(0, 0.92, z0 + 0.38), smat(null, '#8a6a3a', { side: THREE.DoubleSide, rough: 0.9 })));
  const lv = mk(BOX(0.05, 0.5, 0.05, 0, 0.25, 0), D); lv.position.set(0.55, 0.8, z0 + 0.1); lv.rotation.z = v ? -0.6 : 0.5; o.add(lv);
  o.add(mk(new THREE.CylinderGeometry(0.008, 0.008, 2.2, 4).translate(0.36, 2.3, z0 + 0.06), rope));
  if (v) o.add(mk(new THREE.CircleGeometry(0.35, 14).rotateX(-Math.PI / 2).translate(0, 0.81, z0 + 0.3), smat(null, '#5a0c0c', { rough: 0.3 })));
  return o;
}
// banquinho de madeira (três pés e assento redondo)
function mStool() { const o = grp(), W = WOOD(); o.add(mk(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14).translate(0, 0.46, 0), W)); for (let k = 0; k < 3; k++) { const a = k * 2.09, l = mk(new THREE.CylinderGeometry(0.025, 0.03, 0.46, 6).translate(0, 0.23, 0), DWOOD()); l.position.set(Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13); l.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); o.add(l); } return o; }
function mGuillotineG(v) {
  const o = grp(), W = WOOD(), D = DWOOD(), iron = smat(null, '#9aa0a8', { metal: 1, rough: 0.3 }), rope = smat(null, '#a88a5a', { rough: 0.9 }), z0 = -0.15;
  o.add(wbox(1.1, 0.12, 0.7, 0, 0.06, z0, D, 1.5));
  for (const x of [-0.32, 0.32]) o.add(wbox(0.12, 2.5, 0.12, x, 1.25, z0, D, 2));
  o.add(wbox(0.9, 0.15, 0.2, 0, 2.55, z0, D, 2));
  for (const x of [-0.32, 0.32]) { const br = mk(BOX(0.07, 0.9, 0.07, 0, 0, 0), D); br.position.set(x, 0.45, z0 - 0.3); br.rotation.x = -0.6; o.add(br); }
  const by = v === 2 ? 0.5 : 2.0, bl = new THREE.Shape(); bl.moveTo(-0.27, 0.2); bl.lineTo(0.27, 0.2); bl.lineTo(0.27, 0.02); bl.lineTo(-0.27, -0.13); bl.closePath();
  o.add(mk(new THREE.ExtrudeGeometry(bl, { depth: 0.03, bevelEnabled: false }).translate(0, by, z0 - 0.015), iron)); o.add(wbox(0.58, 0.14, 0.1, 0, by + 0.27, z0, D, 1));
  o.add(wbox(0.6, 0.15, 0.13, 0, 0.36, z0, D, 1.5)); o.add(wbox(0.6, 0.12, 0.13, 0, v ? 0.6 : 0.85, z0, D, 1.5));   // luneta (a de cima desce para prender)
  o.add(mk(new THREE.CylinderGeometry(0.2, 0.15, 0.26, 12, 1, true).translate(0, 0.13, z0 - 0.45), smat(null, '#8a6a3a', { side: THREE.DoubleSide, rough: 0.9 })));
  const lv = mk(BOX(0.05, 0.55, 0.05, 0, 0.27, 0), D); lv.position.set(0.5, 0.3, z0); lv.rotation.z = v === 2 ? -0.7 : 0.45; o.add(lv);
  o.add(mk(new THREE.CylinderGeometry(0.008, 0.008, 2.0, 4).translate(0.38, 1.4, z0 + 0.06), rope));
  if (v === 2) { o.add(mk(new THREE.CircleGeometry(0.16, 12).rotateX(-Math.PI / 2).translate(0, 0.27, z0 - 0.45), smat(null, '#5a0c0c', { rough: 0.3 }))); o.add(mk(new THREE.CircleGeometry(0.12, 10).rotateX(-Math.PI / 2).translate(0.03, 0.465, z0 + 0.22), smat(null, '#6a0e0e', { rough: 0.3 })));
    o.add(mk(new THREE.SphereGeometry(0.1, 12, 10).translate(0.02, 0.24, z0 - 0.47), smat(null, '#c89c7c', { rough: 0.8 }))); o.add(mk(new THREE.SphereGeometry(0.104, 12, 10, 0, 6.3, 0, 1.3).translate(0.02, 0.245, z0 - 0.47), smat(null, '#3a2818', { rough: 0.9 })));   // cabeça no cesto
    o.add(mk(new THREE.PlaneGeometry(0.4, 0.09).translate(0, by - 0.07, z0 + 0.02), smat(null, '#7a0e0e', { rough: 0.25, side: THREE.DoubleSide })));   // sangue na lâmina
    for (let k = 0; k < 5; k++) o.add(mk(new THREE.CircleGeometry(0.03 + (k % 2) * 0.02, 8).rotateX(-Math.PI / 2).translate(-0.2 + k * 0.1, 0.125, z0 + 0.25 - (k % 3) * 0.12), smat(null, '#6a0e0e', { rough: 0.3 }))); }
  o.add(mk(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 12).translate(0, 0.25, z0 - 0.45), smat(null, '#c8a870', { rough: 1 })));   // serragem no cesto
  o.rotation.y = -Math.PI / 2; return grp(o);
}
function mFruitCrate() { const o = grp(), W = WOOD(); o.add(wbox(0.6, 0.32, 0.45, 0, 0.16, 0, W, 1.5)); const cols = ['#c02a1e', '#e8a83a', '#7ab83a', '#b8281e']; for (let k = 0; k < 12; k++) o.add(mk(new THREE.SphereGeometry(0.065, 8, 6).translate(-0.22 + (k % 4) * 0.15, 0.36 + (k % 3 === 0 ? 0.04 : 0), -0.12 + Math.floor(k / 4) * 0.12), smat(null, cols[k % 4], { rough: 0.45 }))); return o; }
// prancha (tile a oeste da guilhotina): desenhada separada para o corpo ficar entre ela e a armação
function mGuilPlank() {
  const o = grp(), W = WOOD(), D = DWOOD();
  o.add(wbox(0.36, 0.07, 1.3, 0, 0.42, -0.37, W, 1.5)); for (const zz of [-0.8, 0.1]) o.add(wbox(0.07, 0.38, 0.07, 0, 0.19, zz, D, 1));
  for (const zz of [-0.95, 0.15]) o.add(wbox(0.4, 0.04, 0.04, 0, 0.47, zz, D, 1));   // travessas onde passam as correias
  o.add(wbox(0.38, 0.015, 0.06, 0, 0.46, -0.55, smat(null, '#3a2a1a', { rough: 0.9 }))); o.add(wbox(0.38, 0.015, 0.06, 0, 0.46, -1.0, smat(null, '#3a2a1a', { rough: 0.9 })));   // correias de couro
  o.rotation.y = -Math.PI / 2; return grp(o);
}
// roda d'água da serraria (4 quadros girando)
function mWaterWheel(v) {
  const o = grp(), W = WOOD(), D = DWOOD(), ir = IRON(), R = 0.95, rot = grp(); rot.position.set(0, 1.0, 0); rot.rotation.x = v * Math.PI / 8;
  for (const zz of [-0.22, 0.22]) rot.add(mk(new THREE.TorusGeometry(R, 0.05, 6, 24).rotateY(Math.PI / 2).translate(zz, 0, 0), W));
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, sp = mk(new THREE.BoxGeometry(0.06, R * 2, 0.06), D); sp.rotation.x = a; rot.add(sp); const pd = mk(new THREE.BoxGeometry(0.5, 0.32, 0.05), W); pd.position.set(0, Math.cos(a) * R, Math.sin(a) * R); pd.rotation.x = -a; rot.add(pd); }
  rot.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 10).rotateZ(Math.PI / 2), ir)); o.add(rot);
  for (const zz of [-0.4, 0.4]) o.add(wbox(0.12, 1.1, 0.12, zz, 0.55, 0, D, 1));
  o.add(mk(new THREE.BoxGeometry(0.9, 0.12, 0.3).translate(0, 0.06, 0), smat('stoneblock', '#7a756a')));
  o.rotation.y = Math.PI / 2; return grp(o);
}
function mNoticeBoard() {
  const o = grp(), W = WOOD(), D = DWOOD(); for (const x of [-0.42, 0.42]) o.add(wbox(0.08, 1.5, 0.08, x, 0.75, 0, D, 1));
  o.add(wbox(1.0, 0.7, 0.06, 0, 1.05, 0.02, W, 1.5)); o.add(mk(new THREE.ConeGeometry(0.7, 0.28, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.35).translate(0, 1.55, 0), smat('shingle', '#7a3a26')));
  const paper = ['#efe6cf', '#e8dcb8', '#f4ecd8', '#e0d4b0']; for (let k = 0; k < 5; k++) { const p = mk(new THREE.BoxGeometry(0.2 + (k % 2) * 0.06, 0.22, 0.01).translate(-0.33 + k * 0.165, 1.02 + (k % 3 - 1) * 0.12, 0.06), smat(null, paper[k % 4], { rough: 1 })); p.rotation.z = (k % 2 ? 0.08 : -0.06); o.add(p); }
  return o;
}
const NATURE = { board: [mNoticeBoard, 1.0], wheel: [mWaterWheel, 1.0], guilp: [mGuilPlank, 1.0], guil: [mGuillotineG, 1.0], stool: [mStool, 1.0], fcrate: [mFruitCrate, 1.0], oak: [mOak, 2.15], birch: [mBirch, 2.0], willow: [mWillow, 2.05], fern: [mFern, 1.15], roots: [mRoots, 1.0], shrooms: [mShrooms, 0.95], berry: [mBerry, 1.05], herb: [mHerb, 1.0], boulder: [mBoulder, 1.15] };
function natureSprite(kind, v) { const N = NATURE[kind]; if (!N || !S3.ok) return null; return scen3('nt|' + kind + '|' + v, () => { const g = N[0](v); g.scale.setScalar(N[1]); return g; }); }
function rockGeo(seed, r, sx, sy, sz) {
  const g = new THREE.IcosahedronGeometry(r, 2), p = g.attributes.position, R = rng(seed), off = [R() * 9, R() * 9, R() * 9];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = vnoise(x * 3 / r * 0.4 + off[0], z * 3 / r * 0.4 + y * 2 + off[1], 7) * 0.35 + vnoise(x * 7 / r * 0.4 + off[2], y * 7, 8) * 0.12;
    const k = 0.78 + n; p.setXYZ(i, x * k * sx, Math.max(-r * 0.25, y * k) * sy, z * k * sz);
  }
  g.computeVertexNormals();
  return wuv(g, 1.6);
}
function mRock(v, mossy) {
  const g = rockGeo(500 + v * 7, 0.42, 1.25, 0.8, 1.05).translate(0, 0.14, 0);
  vcolor(g, (c, x, y, z, ny) => { const m = mossy && ny > 0.35 && vnoise(x * 6, z * 6, 9) > 0.35; c.set(m ? '#5a7a34' : '#77726a'); c.convertSRGBToLinear(); });
  const out = grp(mk(g, smat('rock', '#ffffff', { vc: true, bump: 1.2 })));
  if (v === 1) out.add(mk(rockGeo(520, 0.16, 1.2, 0.8, 1).translate(0.42, 0.06, 0.18), smat('rock', '#9c968a', { bump: 2.5 })));
  return out;
}
function mGrass(v, dry) {
  const R = rng(601 + v * 5 + (dry ? 50 : 0)), pos = [], col = [], idx = [], c = new THREE.Color();
  const pal = dry ? ['#8a7a48', '#a8955a', '#c4b070', '#6a5c34'] : ['#2f5a22', '#3f7230', '#58903e', '#76aa50'];
  let n = 0;
  for (let b = 0; b < 34; b++) {
    const a = R() * 6.28, d = Math.sqrt(R()) * 0.3, x = Math.cos(a) * d, z = Math.sin(a) * d, ht = 0.3 + R() * 0.32, lean = (R() - 0.5) * 0.35, la = R() * 6.28, w = 0.025 + R() * 0.015, fa = R() * 6.28;
    const segs = 3;
    c.set(pal[Math.floor(R() * 4)]).convertSRGBToLinear();
    for (let s2 = 0; s2 <= segs; s2++) {
      const t = s2 / segs, bend = lean * t * t, ww = w * (1 - t * 0.9);
      const px_ = x + Math.cos(la) * bend, pz = z + Math.sin(la) * bend, py = ht * t;
      pos.push(px_ - Math.cos(fa) * ww, py, pz - Math.sin(fa) * ww, px_ + Math.cos(fa) * ww, py, pz + Math.sin(fa) * ww);
      const sh = 0.45 + t * 0.6;
      col.push(c.r * sh, c.g * sh, c.b * sh, c.r * sh, c.g * sh, c.b * sh);
    }
    for (let s2 = 0; s2 < segs; s2++) { const o = n + s2 * 2; idx.push(o, o + 1, o + 3, o, o + 3, o + 2); }
    n += (segs + 1) * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  const nr = g.attributes.normal; for (let i = 0; i < nr.count; i++) nr.setXYZ(i, nr.getX(i) * 0.3, 0.9, nr.getZ(i) * 0.3);
  return grp(mk(g, smat(null, '#ffffff', { vc: true, side: THREE.DoubleSide, rough: 0.8 }), false));
}
function mMushroom(v) {
  const R = rng(701 + v), glow = v >= 2, g = grp();
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * 0.16 + (R() - 0.5) * 0.06, z = (R() - 0.5) * 0.15, s = 0.7 + R() * 0.6;
    g.add(mk(CYL(0.025 * s, 0.035 * s, 0.14 * s, x, 0.07 * s, z, 8), smat(null, '#e8dfca', { rough: 0.7 })));
    const capM = glow ? smat(null, '#48b8e8', { emissive: '#3ab0ff', ei: 1.6, rough: 0.4 }) : smat(null, '#a82a1e', { rough: 0.45 });
    g.add(mk(new THREE.SphereGeometry(0.09 * s, 14, 8, 0, 6.28, 0, Math.PI / 2).scale(1, 0.65, 1).translate(x, 0.13 * s, z), capM));
    if (!glow) for (let i = 0; i < 4; i++) { const a = R() * 6.28; g.add(mk(new THREE.SphereGeometry(0.012 * s, 5, 4).translate(x + Math.cos(a) * 0.05 * s, 0.17 * s, z + Math.sin(a) * 0.05 * s), smat(null, '#f4ece0'))); }
  }
  return g;
}
function mReeds(v) {
  const R = rng(801 + v), g = grp(), stem = smat(null, '#5a7a2e', { rough: 0.8 }), head = smat(null, '#5a3820', { rough: 0.9 });
  for (let k = 0; k < 14; k++) {
    const a = R() * 6.28, d = Math.sqrt(R()) * 0.28, x = Math.cos(a) * d, z = Math.sin(a) * d, ht = 0.6 + R() * 0.55, lx = (R() - 0.5) * 0.15, lz = (R() - 0.5) * 0.15;
    g.add(limb(V3(x, 0, z), V3(x + lx, ht, z + lz), 0.012, 0.006, stem, 4));
    if (k % 2 === 0) g.add(limb(V3(x + lx * 0.85, ht * 0.85, z + lz * 0.85), V3(x + lx * 0.97, ht * 0.97, z + lz * 0.97), 0.028, 0.028, head, 6));
  }
  return g;
}

// ============================================================
//  OBJETOS DO VILAREJO (1 unidade ≈ 1 metro)
// ============================================================
const WOOD = () => smat('wood', '#8a6440'), DWOOD = () => smat('wood', '#5a3e26'), IRON = () => smat('iron', '#4a4a50', { metal: 0.85, rough: 0.45 }), STONE = () => smat('rock', '#9a958a', { bump: 2 });
function mBarrel() {
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.24 + Math.sin(t * Math.PI) * 0.05, t * 0.8)); }
  const g = new THREE.LatheGeometry(pts, 18);
  const o = grp(mk(g, smat('wood', '#9a6e40')));
  o.add(mk(CYL(0.25, 0.25, 0.02, 0, 0.79, 0, 18), smat('wood', '#7a5430')));
  for (const y of [0.12, 0.4, 0.68]) o.add(mk(new THREE.TorusGeometry(0.24 + Math.sin(y / 0.8 * Math.PI) * 0.05 + 0.006, 0.014, 6, 24).rotateX(Math.PI / 2).translate(0, y, 0), IRON()));
  return o;
}
function mCrate() {
  const o = grp(wbox(0.6, 0.6, 0.6, 0, 0.3, 0, smat('wood', '#9a7448'), 1.6));
  const fm = smat('wood', '#6a4a2a');
  for (const [w, h, d, x, y, z] of [[0.64, 0.07, 0.07, 0, 0.035, 0.3], [0.64, 0.07, 0.07, 0, 0.565, 0.3], [0.07, 0.6, 0.07, -0.3, 0.3, 0.3], [0.07, 0.6, 0.07, 0.3, 0.3, 0.3], [0.07, 0.07, 0.64, 0.3, 0.035, 0], [0.07, 0.07, 0.64, 0.3, 0.565, 0], [0.07, 0.6, 0.07, 0.3, 0.3, -0.3]]) o.add(wbox(w, h, d, x, y, z, fm, 2));
  const diag = mk(BOX(0.06, 0.78, 0.04, 0, 0, 0), fm); diag.position.set(0, 0.3, 0.31); diag.rotation.z = 0.78; o.add(diag);
  return o;
}
function mHay() {
  const m = smat('thatch', '#c8a850', { bump: 2 });
  const g = new THREE.CylinderGeometry(0.32, 0.32, 0.9, 16).rotateZ(Math.PI / 2).translate(0, 0.32, 0);
  const o = grp(mk(wuv(g, 1.6), m));
  for (const x of [-0.25, 0.25]) o.add(mk(new THREE.TorusGeometry(0.325, 0.012, 5, 20).rotateY(Math.PI / 2).translate(x, 0.32, 0), smat(null, '#6a4a2a')));
  o.add(mk(wuv(new THREE.CylinderGeometry(0.26, 0.26, 0.7, 14).rotateZ(Math.PI / 2).translate(0.15, 0.82, 0.05), 1.6), m));
  return o;
}
function mBench() {
  const w = WOOD(), o = grp(wbox(1.1, 0.06, 0.32, 0, 0.45, 0, w, 2));
  for (const x of [-0.45, 0.45]) o.add(wbox(0.07, 0.45, 0.28, x, 0.22, 0, DWOOD(), 2));
  return o;
}
function mWell() {
  const pts = [new THREE.Vector2(0.38, 0), new THREE.Vector2(0.52, 0), new THREE.Vector2(0.52, 0.7), new THREE.Vector2(0.38, 0.7), new THREE.Vector2(0.38, 0)];
  const o = grp(mk(wuv(new THREE.LatheGeometry(pts, 20), 2), smat('brick', '#a8a294', { bump: 1.5 })));
  o.add(mk(CYL(0.38, 0.38, 0.02, 0, 0.45, 0, 20), smat(null, '#1a2e3a', { rough: 0.1 })));
  for (const x of [-0.45, 0.45]) o.add(wbox(0.08, 1.6, 0.08, x, 0.8, 0, DWOOD(), 2));
  o.add(mk(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8).rotateZ(Math.PI / 2).translate(0, 1.25, 0), DWOOD()));
  const roofM = smat('shingle', '#8a3a2a');
  for (const s of [-1, 1]) { const r = mk(wuv(BOX(1.15, 0.04, 0.5, 0, 0, 0), 2), roofM); r.position.set(0, 1.72, s * 0.2); r.rotation.x = s * 0.62; o.add(r); }
  o.add(mk(CYL(0.09, 0.07, 0.14, 0.1, 0.95, 0, 10), smat('wood', '#7a5430')));
  return o;
}
function mStall() {
  const o = grp(wbox(1.4, 0.08, 0.7, 0, 0.8, 0, WOOD(), 1.5), wbox(1.36, 0.7, 0.04, 0, 0.42, 0.33, DWOOD(), 1.5));
  for (const [x, z] of [[-0.66, -0.32], [0.66, -0.32], [-0.66, 0.32], [0.66, 0.32]]) o.add(wbox(0.06, z < 0 ? 1.95 : 1.65, 0.06, x, z < 0 ? 0.975 : 0.825, z, DWOOD(), 2));
  const aw = new THREE.PlaneGeometry(1.5, 0.9, 1, 1).rotateX(-Math.PI / 2 + 0.33).translate(0, 1.8, 0.05);
  o.add(mk(aw, smat('stripes', '#ffffff', { side: THREE.DoubleSide, bump: 0.3 })));
  const R = rng(5), cols = ['#c8402a', '#e8b030', '#7aa03a', '#d86a20'];
  for (let k = 0; k < 14; k++) o.add(mk(new THREE.SphereGeometry(0.06, 8, 6).translate(-0.55 + (k % 7) * 0.18, 0.89, -0.15 + Math.floor(k / 7) * 0.2 + R() * 0.04), smat(null, cols[k % 4], { rough: 0.5 })));
  return o;
}
function mTent() {
  const sh = new THREE.Shape(); sh.moveTo(-0.75, 0); sh.lineTo(0.75, 0); sh.lineTo(0, 1.2); sh.closePath();
  const hole = new THREE.Path(); hole.moveTo(-0.22, 0.02); hole.lineTo(0.22, 0.02); hole.lineTo(0, 0.6); hole.closePath(); sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.8, bevelEnabled: false }).translate(0, 0, -0.9).rotateY(Math.PI / 2);
  const o = grp(mk(wuv(g, 1.2), smat('cloth', '#a07a4c', { side: THREE.DoubleSide, bump: 0.6 })));
  o.add(mk(new THREE.BufferGeometry().setFromPoints([V3(0.88, 0.02, -0.22), V3(0.88, 0.02, 0.22), V3(0.88, 0.6, 0)]), smat(null, '#1a120a', { side: THREE.DoubleSide })));
  o.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 6).rotateZ(Math.PI / 2).translate(0, 1.22, 0), DWOOD()));
  o.add(mk(CYL(0.02, 0.02, 0.5, 1.02, 1.4, 0, 6), DWOOD()));
  o.add(mk(new THREE.PlaneGeometry(0.35, 0.2).translate(1.2, 1.55, 0), smat('cloth', '#8a1a14', { side: THREE.DoubleSide })));
  return o;
}
function mSpikes() {
  const o = grp(), m = smat('bark', '#6b4a2b', { bump: 1.5 });
  for (const x of [-0.35, 0, 0.35]) for (const s of [-1, 1]) o.add(limb(V3(x - s * 0.25, 0, -0.2), V3(x + s * 0.25, 0.85, 0.25), 0.05, 0.005, m, 6));
  o.add(limb(V3(-0.6, 0.35, 0), V3(0.6, 0.35, 0), 0.05, 0.05, m, 6));
  return o;
}
function mRubble(v) {
  const o = grp(), R = rng(901 + v), m = smat('rock', '#a29c90', { bump: 2.5 });
  for (let k = 0; k < 7; k++) o.add(mk(rockGeo(910 + k + v * 10, 0.12 + R() * 0.12, 1.2, 0.8, 1).translate((R() - 0.5) * 0.8, 0.06, (R() - 0.5) * 0.6), m));
  o.add(wbox(0.4, 0.22, 0.25, 0.1, 0.11, 0.1, smat('brick', '#9a958a'), 1));
  return o;
}
function mDummy() {
  const o = grp(wbox(0.08, 1.7, 0.08, 0, 0.85, 0, DWOOD(), 2), wbox(0.9, 0.07, 0.07, 0, 1.3, 0, DWOOD(), 2));
  const sack = smat('cloth', '#b89a68', { bump: 1.5 });
  o.add(mk(new THREE.CapsuleGeometry(0.2, 0.4, 4, 12).translate(0, 1.1, 0), sack));
  o.add(mk(new THREE.SphereGeometry(0.15, 12, 10).translate(0, 1.6, 0), sack));
  o.add(mk(new THREE.TorusGeometry(0.2, 0.015, 5, 16).rotateX(Math.PI / 2).translate(0, 1.0, 0), smat(null, '#5a3a20')));
  return o;
}
function mStatue() {
  const st = smat('rock', '#b8b2a4', { bump: 1.2 }), o = grp(wbox(0.8, 0.5, 0.8, 0, 0.25, 0, smat('brick', '#8e897e'), 1.5), wbox(0.9, 0.08, 0.9, 0, 0.54, 0, st, 1.5));
  const robe = [new THREE.Vector2(0.3, 0), new THREE.Vector2(0.24, 0.5), new THREE.Vector2(0.2, 1.05), new THREE.Vector2(0.24, 1.2), new THREE.Vector2(0.08, 1.3), new THREE.Vector2(0, 1.3)];
  o.add(mk(new THREE.LatheGeometry(robe, 16).translate(0, 0.58, 0), st));
  o.add(mk(new THREE.SphereGeometry(0.13, 14, 12).translate(0, 2.0, 0), st));
  o.add(mk(new THREE.SphereGeometry(0.16, 14, 10, 0, 6.28, 0, 1.6).translate(0, 2.0, -0.02), st));
  o.add(mk(BOX(0.06, 1.0, 0.02, 0.0, 1.35, 0.32), st));
  o.add(mk(BOX(0.3, 0.05, 0.05, 0, 1.75, 0.32), st));
  for (const s of [-1, 1]) o.add(limb(V3(s * 0.25, 1.75, 0), V3(s * 0.06, 1.68, 0.3), 0.07, 0.06, st, 8));
  return o;
}
function mCave() {
  // massa de rocha com uma boca escura, ossos na entrada
  const o = grp(), rk = smat('rock', '#8a857c', { bump: 2 });
  for (const [x, y, z, s] of [[-1.3, 0.9, -0.2, 1.2], [1.3, 0.9, -0.2, 1.2], [0, 2.0, -0.5, 1.5], [-0.9, 2.2, -1.1, 1.2], [0.9, 2.3, -1.0, 1.1], [-1.9, 0.5, 0.3, 0.8], [1.9, 0.5, 0.3, 0.8]]) o.add(mk(rockGeo(Math.floor((x + 3) * 100 + y * 10), s, 1, 0.9, 1).translate(x, y, z), rk));
  o.add(mk(new THREE.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.3, 0.55).translate(0, 0, 0.35), smat(null, '#050403', { rough: 1, side: THREE.DoubleSide })));
  const bone = smat(null, '#d8d0bc', { rough: 0.8 });
  for (let k = 0; k < 5; k++) { const b = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), bone); b.position.set(-0.8 + k * 0.4, 0.04, 0.9 + (k % 2) * 0.2); b.rotation.set(Math.PI / 2, 0, k * 0.9); o.add(b); }
  o.add(mk(new THREE.SphereGeometry(0.11, 10, 8).translate(0.5, 0.1, 1.05), bone));
  return o;
}
function mHoard() {
  // ninho do dragão: monte de moedas, taças, coroa, espada e escudo
  const o = grp(), gold = smat(null, '#e2b74e', { metal: 1, rough: 0.28 }), dg = smat(null, '#b8892a', { metal: 1, rough: 0.4 });
  o.add(mk(new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.25, 0.42, 1.05), dg));
  for (let k = 0; k < 40; k++) { const a = k * 2.4, r = 0.15 + (k % 7) * 0.09, y = 0.26 - r * 0.3 + (k % 3) * 0.01; o.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 10).rotateX(0.3 * Math.sin(k)).translate(Math.cos(a) * r * 1.2, y, Math.sin(a) * r), gold)); }
  o.add(mk(new THREE.LatheGeometry([new THREE.Vector2(0.06, 0), new THREE.Vector2(0.03, 0.04), new THREE.Vector2(0.02, 0.14), new THREE.Vector2(0.08, 0.2), new THREE.Vector2(0.07, 0.26)], 12).translate(0.3, 0.2, 0.1), gold));
  o.add(mk(new THREE.TorusGeometry(0.1, 0.025, 6, 16).rotateX(Math.PI / 2 - 0.3).translate(-0.25, 0.27, -0.05), gold));
  for (let k = 0; k < 5; k++) o.add(mk(new THREE.ConeGeometry(0.02, 0.07, 4).translate(-0.25 + Math.cos(k * 1.26) * 0.1, 0.32, -0.05 + Math.sin(k * 1.26) * 0.1), gold));
  const sw = grp(mk(new THREE.BoxGeometry(0.05, 0.75, 0.015), smat(null, '#c8ccd2', { metal: 0.9, rough: 0.3 })), mk(new THREE.BoxGeometry(0.22, 0.04, 0.04).translate(0, -0.28, 0), gold)); sw.position.set(0.1, 0.32, -0.25); sw.rotation.set(0.4, 0.3, 1.1); o.add(sw);
  for (const [x, z, c] of [[-0.4, 0.2, '#c83a3a'], [0.45, -0.1, '#3a8ad8'], [0.05, 0.35, '#3ad878']]) o.add(mk(new THREE.OctahedronGeometry(0.05).translate(x, 0.2, z), smat(null, c, { rough: 0.1, emissive: c, ei: 0.3 })));
  return o;
}
function mArmorPile(v) {
  // restos de um cavaleiro: elmo, escudo, espada, ossos
  const o = grp(), steel = smat(null, '#7a7e86', { metal: 0.8, rough: 0.5 }), rust = smat(null, '#6a4a32', { metal: 0.5, rough: 0.7 }), bone = smat(null, '#d8d0bc', { rough: 0.8 });
  o.add(mk(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.6).rotateZ(1.3).translate(-0.18, 0.1, 0.05), v ? rust : steel));
  const sh = mk(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 14).rotateX(0.2).translate(0.15, 0.04, -0.05), smat(null, v ? '#2a3a6a' : '#7a1a1c', { rough: 0.6 })); o.add(sh);
  o.add(mk(new THREE.BoxGeometry(0.04, 0.02, 0.7).rotateY(0.6).translate(0.05, 0.02, 0.15), steel));
  for (let k = 0; k < 4; k++) { const b = mk(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 5).rotateZ(Math.PI / 2).rotateY(k * 1.1).translate(-0.1 + k * 0.08, 0.02, 0.25 - k * 0.06), bone); o.add(b); }
  o.add(mk(new THREE.SphereGeometry(0.07, 10, 8).translate(0.32, 0.06, 0.2), bone));
  return o;
}
function mRuinTower() {
  // torre de vigia derrubada pelo dragão: toco de pedra com topo quebrado, chamuscado
  const o = grp(), st = smat('stoneblock', '#8a847a', { bump: 1.3 }), burnt = smat('stoneblock', '#3a3632', { bump: 1.3 });
  const R = rng(4242);
  for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, hh = 1.2 + R() * 2.6 * (0.5 + 0.5 * Math.cos(a - 0.6)); o.add(mk(new THREE.BoxGeometry(0.42, hh, 0.36).translate(0, hh / 2, 0).rotateY(-a).translate(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05), k % 3 === 0 ? burnt : st)); }
  for (let k = 0; k < 7; k++) o.add(mk(new THREE.BoxGeometry(0.35, 0.25, 0.3).rotateY(R() * 3).translate((R() - 0.5) * 2.6, 0.12, 0.9 + R() * 0.8), st));
  o.add(mk(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 16).translate(0, 0.03, 0), burnt));
  return o;
}
function mChest(v) {
  const o = grp(), wood = smat('wood', '#6a4220', { bump: 1.2 }), iron = smat('iron', '#3a3a40', { metal: 0.9, rough: 0.4 }), gold = smat(null, '#e2b74e', { metal: 1, rough: 0.3 });
  o.add(wbox(0.9, 0.5, 0.6, 0, 0.25, 0, wood, 2));
  for (const x of [-0.32, 0.32]) o.add(mk(new THREE.BoxGeometry(0.06, 0.52, 0.62).translate(x, 0.26, 0), iron));
  const lid = grp(mk(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, 0.3), wood));
  for (const x of [-0.32, 0.32]) lid.add(mk(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(x, 0, 0.3), iron));
  lid.position.set(0, 0.5, -0.3); if (v) lid.rotation.x = -1.9; o.add(lid);
  o.add(mk(new THREE.BoxGeometry(0.14, 0.16, 0.04).translate(0, 0.42, 0.31), gold));
  if (v) for (let k = 0; k < 6; k++) o.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10).translate(-0.25 + k * 0.1, 0.5, (k % 2) * 0.1 - 0.05), gold));
  return o;
}
function mAnvil() {
  const sh = new THREE.Shape(); sh.moveTo(-0.32, 0); sh.lineTo(0.2, 0); sh.quadraticCurveTo(0.42, 0.02, 0.5, 0.1); sh.lineTo(0.2, 0.12); sh.lineTo(-0.32, 0.12); sh.closePath();
  const top = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }).translate(0, 0.62, -0.1);
  const o = grp(mk(top, smat('iron', '#3a3a40', { metal: 0.9, rough: 0.35 })), mk(BOX(0.22, 0.2, 0.16, -0.04, 0.52, 0), IRON()));
  o.add(mk(wuv(CYL(0.26, 0.3, 0.42, -0.04, 0.21, 0, 14), 2), smat('bark', '#6a4a2a', { bump: 2 })));
  return o;
}
function mWeaponRack() {
  const o = grp(wbox(1.1, 0.06, 0.06, 0, 1.1, 0, DWOOD(), 2), wbox(1.1, 0.06, 0.06, 0, 0.35, 0, DWOOD(), 2));
  for (const x of [-0.5, 0.5]) o.add(wbox(0.07, 1.25, 0.07, x, 0.62, 0, DWOOD(), 2));
  const steel = smat(null, '#c8ccd4', { metal: 0.9, rough: 0.3 });
  for (let k = 0; k < 4; k++) {
    const x = -0.33 + k * 0.22;
    if (k % 2) { o.add(mk(BOX(0.05, 0.9, 0.012, x, 0.75, 0.05), steel)); o.add(mk(BOX(0.2, 0.03, 0.04, x, 1.18, 0.05), smat(null, '#8a6a2a', { metal: 0.8, rough: 0.4 }))); }
    else { o.add(mk(CYL(0.015, 0.015, 1.6, x, 0.9, 0.05, 6), DWOOD())); o.add(mk(new THREE.ConeGeometry(0.04, 0.16, 6).translate(x, 1.78, 0.05), steel)); }
  }
  return o;
}
function mCart() {
  const o = grp(wbox(1.4, 0.08, 0.9, 0, 0.55, 0, WOOD(), 1.5));
  for (const [w, d, x, z] of [[1.4, 0.05, 0, 0.45], [1.4, 0.05, 0, -0.45], [0.05, 0.9, -0.7, 0]]) o.add(wbox(w, 0.28, d, x, 0.73, z, DWOOD(), 1.5));
  for (const z of [-0.5, 0.5]) {
    o.add(mk(new THREE.TorusGeometry(0.36, 0.04, 6, 20).translate(0.1, 0.38, z), DWOOD()));
    for (let k = 0; k < 6; k++) { const sp = mk(BOX(0.03, 0.7, 0.03, 0, 0, 0), DWOOD()); sp.position.set(0.1, 0.38, z); sp.rotation.z = k * Math.PI / 6; o.add(sp); }
    o.add(mk(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10).rotateX(Math.PI / 2).translate(0.1, 0.38, z), IRON()));
  }
  for (const z of [-0.3, 0.3]) o.add(limb(V3(0.7, 0.55, z), V3(1.6, 0.25, z * 0.8), 0.03, 0.025, DWOOD(), 6));
  o.add(mk(wuv(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 12).rotateZ(Math.PI / 2).translate(-0.15, 0.82, 0), 1.6), smat('thatch', '#c8a850')));
  return o;
}
function mTable() {
  const o = grp(wbox(1.1, 0.06, 0.7, 0, 0.75, 0, WOOD(), 1.5));
  for (const [x, z] of [[-0.48, -0.28], [0.48, -0.28], [-0.48, 0.28], [0.48, 0.28]]) o.add(wbox(0.06, 0.72, 0.06, x, 0.36, z, DWOOD(), 2));
  o.add(mk(CYL(0.05, 0.045, 0.13, -0.2, 0.85, 0.05, 10), smat('wood', '#8a5424')));
  o.add(mk(CYL(0.05, 0.045, 0.13, 0.25, 0.85, -0.1, 10), smat('wood', '#8a5424')));
  o.add(mk(CYL(0.13, 0.11, 0.05, 0.05, 0.8, 0.12, 14), smat(null, '#c8b8a0', { rough: 0.5 })));
  return o;
}
function mFence(alongX) {
  const o = grp(), m = smat('wood', '#7a5a38'), R = rng(alongX ? 3 : 4);
  for (const t of [-0.5, 0.5]) { const p = wbox(0.08, 1.0, 0.08, alongX ? t : 0, 0.5, alongX ? 0 : t, m, 2); p.rotation.z = (R() - 0.5) * 0.08; o.add(p); }
  for (const y of [0.35, 0.75]) o.add(wbox(alongX ? 1.08 : 0.05, 0.08, alongX ? 0.05 : 1.08, 0, y, 0, m, 2));
  return o;
}
function mTorch() {
  return grp(mk(CYL(0.03, 0.04, 1.05, 0, 0.52, 0, 8), DWOOD()), mk(CYL(0.08, 0.05, 0.12, 0, 1.1, 0, 10), IRON()), mk(CYL(0.065, 0.065, 0.03, 0, 1.15, 0, 10), smat(null, '#2a1a10', { emissive: '#ff6a20', ei: 0.6 })));
}
function mCampfire() {
  const o = grp(), R = rng(9), st = smat('rock', '#8a877e', { bump: 2 });
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28; o.add(mk(rockGeo(930 + k, 0.09, 1.2, 0.8, 1).translate(Math.cos(a) * 0.36, 0.04, Math.sin(a) * 0.36), st)); }
  for (let k = 0; k < 4; k++) { const a = k * 0.8 + 0.3; o.add(limb(V3(Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3), V3(-Math.cos(a) * 0.05, 0.22, -Math.sin(a) * 0.05), 0.04, 0.03, smat('bark', '#3a2414'), 6)); }
  o.add(mk(CYL(0.2, 0.22, 0.04, 0, 0.02, 0, 12), smat(null, '#3a1a0a', { emissive: '#ff5010', ei: 1.4 })));
  return o;
}
function mBrazier() {
  const o = grp(), ir = IRON();
  for (let k = 0; k < 3; k++) { const a = k / 3 * 6.28; o.add(limb(V3(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3), V3(Math.cos(a) * 0.08, 0.7, Math.sin(a) * 0.08), 0.022, 0.022, ir, 6)); }
  const bowl = [new THREE.Vector2(0.08, 0), new THREE.Vector2(0.28, 0.1), new THREE.Vector2(0.32, 0.18)];
  o.add(mk(new THREE.LatheGeometry(bowl, 16).translate(0, 0.68, 0), smat('iron', '#3a3a3e', { metal: 0.8, rough: 0.5, side: THREE.DoubleSide })));
  o.add(mk(CYL(0.2, 0.2, 0.04, 0, 0.8, 0, 14), smat(null, '#3a1208', { emissive: '#ff5a10', ei: 0.9 })));
  return o;
}
function mLamp() {
  const ir = IRON(), o = grp(mk(CYL(0.1, 0.12, 0.16, 0, 0.08, 0, 10), ir), mk(CYL(0.035, 0.04, 1.75, 0, 0.95, 0, 8), ir));
  o.add(limb(V3(0, 1.78, 0), V3(0.24, 1.8, -0.24), 0.02, 0.02, ir, 6));
  o.add(mk(BOX(0.16, 0.2, 0.16, 0.22, 1.62, -0.22), smat(null, '#ffd890', { emissive: '#ffcc70', ei: 1.4, rough: 0.2 })));
  o.add(mk(new THREE.ConeGeometry(0.14, 0.1, 4).rotateY(Math.PI / 4).translate(0.22, 1.77, -0.22), ir));
  return o;
}
function mBannerPole() {
  return grp(mk(CYL(0.035, 0.045, 2.4, 0.06, 1.2, -0.06, 8), DWOOD()), mk(new THREE.SphereGeometry(0.06, 10, 8).translate(0.06, 2.42, -0.06), smat(null, '#c9a24a', { metal: 1, rough: 0.3 })));
}
function mFountain() {
  const st = smat('brick', '#b4ae9f', { bump: 1.4 }), o = grp();
  const rim = [new THREE.Vector2(0.62, 0), new THREE.Vector2(0.8, 0), new THREE.Vector2(0.8, 0.36), new THREE.Vector2(0.68, 0.38), new THREE.Vector2(0.62, 0.36), new THREE.Vector2(0.62, 0)];
  o.add(mk(wuv(new THREE.LatheGeometry(rim, 8), 2.5), st));
  o.add(mk(CYL(0.64, 0.64, 0.02, 0, 0.3, 0, 8), smat(null, '#3a6a8a', { rough: 0.05, metal: 0.2 })));
  o.add(mk(wuv(CYL(0.1, 0.14, 0.9, 0, 0.7, 0, 10), 3), st));
  const bowl = [new THREE.Vector2(0.06, 0), new THREE.Vector2(0.3, 0.08), new THREE.Vector2(0.34, 0.14), new THREE.Vector2(0.3, 0.14), new THREE.Vector2(0.06, 0.06)];
  o.add(mk(new THREE.LatheGeometry(bowl, 14).translate(0, 1.02, 0), st));
  o.add(mk(CYL(0.04, 0.06, 0.14, 0, 1.2, 0, 8), st));
  return o;
}
function mStump() {
  const o = grp(mk(jitter(CYL(0.2, 0.25, 0.32, 0, 0.16, 0, 12), 0.03, 11, 0.01), smat('bark', '#5e4630', { bump: 2 })));
  o.add(mk(CYL(0.19, 0.19, 0.01, 0, 0.325, 0, 12), smat(null, '#b8956a', { rough: 0.9 })));
  for (let k = 0; k < 4; k++) { const a = k * 1.6; o.add(limb(V3(0, 0.12, 0), V3(Math.cos(a) * 0.34, -0.01, Math.sin(a) * 0.34), 0.06, 0.02, smat('bark', '#5e4630'), 5)); }
  return o;
}
function mLog(v) {
  const g = new THREE.CylinderGeometry(0.15, 0.17, 1.2, 12).rotateZ(Math.PI / 2).rotateY(v ? 0.6 : -0.6).translate(0, 0.15, 0);
  const o = grp(mk(g, smat('bark', '#6a4a30', { bump: 2 })));
  const end = mk(new THREE.CircleGeometry(0.15, 12).rotateY(Math.PI / 2).translate(0.601, 0, 0).rotateY(v ? 0.6 : -0.6).translate(0, 0.15, 0), smat(null, '#b8956a'));
  o.add(end);
  return o;
}
function mGrave(v) {
  const sh = new THREE.Shape(); sh.moveTo(-0.22, 0); sh.lineTo(0.22, 0); sh.lineTo(0.22, 0.5); sh.quadraticCurveTo(0.22, 0.75, 0, 0.78); sh.quadraticCurveTo(-0.22, 0.75, -0.22, 0.5); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }).translate(0, 0, -0.05).rotateY(v ? 0.25 : -0.15);
  const o = grp(mk(wuv(g, 2), smat('rock', '#9a968c', { bump: 2 })));
  o.add(mk(BOX(0.04, 0.3, 0.01, 0, 0.45, 0.07).rotateY(v ? 0.25 : -0.15), smat(null, '#3a362e')));
  o.add(mk(BOX(0.18, 0.04, 0.01, 0, 0.52, 0.07).rotateY(v ? 0.25 : -0.15), smat(null, '#3a362e')));
  o.add(mk(BOX(0.5, 0.06, 0.9, 0, 0.03, 0.45), smat('rock', '#5a5040')));
  return o;
}

// ============================================================
//  CASTELO, PENHASCOS E CONSTRUÇÕES
// ============================================================
const WALL_H = h3(FLOOR_PX);                 // altura da muralha (andar de cima)
const BLD_K = 1;                              // alturas vêm direto de cada construção (b.H / b.RH)
const ivyM = () => smat(null, '#3e6a2e', { leafMap: leafTex(), rough: 0.85 });
function ivyCards(R, faces, n, H) {
  const cards = [];
  for (let i = 0; i < n; i++) {
    const f = faces[Math.floor(R() * faces.length)], t = R() - 0.5, y = Math.pow(R(), 0.7) * H * 0.95;
    cards.push(f === 'z' ? { x: t, y, z: 0.51 + R() * 0.03, rx: 0, ry: (R() - 0.5) * 0.6, rz: R() * 6, s: 0.18 + R() * 0.12 } : { x: 0.51 + R() * 0.03, y, z: t, rx: 0, ry: Math.PI / 2 + (R() - 0.5) * 0.6, rz: R() * 6, s: 0.18 + R() * 0.12 });
  }
  return mk(leafCards(cards, V3(0, H * 0.5, 0), 0.2), ivyM());
}
function merlonRow(o, side, H, m) {
  // side: 1:+x 2:-x 3:+y(z) 4:-y(z); 2 ameias por tile na borda indicada
  for (const t of [-0.25, 0.25]) {
    const g = new THREE.BoxGeometry(side <= 2 ? 0.22 : 0.32, 0.42, side <= 2 ? 0.32 : 0.22);
    const e = side === 1 ? [0.39, t] : side === 2 ? [-0.39, t] : side === 3 ? [t, 0.39] : [t, -0.39];
    o.add(mk(wuv(g.translate(e[0], H + 0.21, e[1]), 1.5), m));
  }
  const lip = side <= 2 ? new THREE.BoxGeometry(0.22, 0.14, 1) : new THREE.BoxGeometry(1, 0.14, 0.22);
  const e = side === 1 ? [0.39, 0] : side === 2 ? [-0.39, 0] : side === 3 ? [0, 0.39] : [0, -0.39];
  o.add(mk(wuv(lip.translate(e[0], H + 0.07, e[1]), 1.5), m));
}
function mWall(v, low, ivy, od, ends) {
  const R = rng(1001 + v * 3 + (low ? 50 : 0) + (ivy ? 9 : 0) + (od || 0) * 101), o = grp();
  if (low) {
    const H = 0.5;
    o.add(wbox(1, H, 0.8, 0, H / 2, 0, smat('stoneblock', '#8e897e', { bump: 1.6 }), 1.2));
    for (let k = 0; k < 4; k++) o.add(mk(rockGeo(1010 + k + v * 7, 0.12 + R() * 0.08, 1.3, 0.7, 1).translate((R() - 0.5) * 0.8, H + 0.03, (R() - 0.5) * 0.5), smat('rock', '#8a857a', { bump: 2 })));
    return o;
  }
  const H = WALL_H, capM = smat('stoneblock', '#b0a998', { bump: 1 });
  const alongX = od === 3 || od === 4 || !od, eL = 0, eR = ends & 2 ? 0.35 : 0, len = 1 + eL + eR, off = (eR - eL) / 2;
  o.add(gwall(alongX ? len : 1, H - 0.08, alongX ? 1 : len, alongX ? off : 0, (H - 0.08) / 2, alongX ? 0 : off, 'brick', '#a29c90', H, v, 1, 1.4));
  o.add(wbox(alongX ? len : 1, 0.08, alongX ? 1 : len, alongX ? off : 0, H - 0.04, alongX ? 0 : off, capM, 1));
  // base mais larga do lado de fora (sapata) e cordão de pedra no topo
  const out = od || 3, sx = out === 1 ? 1 : out === 2 ? -1 : 0, sz = out === 3 ? 1 : out === 4 ? -1 : 0;
  o.add(wbox(sx ? 0.14 : 1, 0.5, sz ? 0.14 : 1, sx * 0.53, 0.25, sz * 0.53, smat('stoneblock', '#8a857a', { bump: 1.4 }), 1.2));
  o.add(wbox(sx ? 0.08 : 1, 0.1, sz ? 0.08 : 1, sx * 0.53, H - 0.25, sz * 0.53, capM, 1.2));
  merlonRow(o, out, H, capM);
  if (ivy) o.add(ivyCards(R, out === 1 || out === 2 ? ['x'] : ['z'], 50, H));
  return o;
}
function mGate(alongX) {
  const o = grp(), H = WALL_H, top = 0.5;
  const lint = wbox(1, top, 1, 0, H - top / 2, 0, smat('stoneblock', '#a29c90', { bump: 1.4 }), 1.4); o.add(lint);
  const ir = smat('iron', '#2e2e32', { metal: 0.85, rough: 0.5 });
  // grade levadiça erguida (só as pontas aparecem)
  for (let k = 0; k < 7; k++) {
    const t = -0.42 + k * 0.14, bar = new THREE.BoxGeometry(0.035, 0.32, 0.035).translate(alongX ? t : 0, H - top - 0.14, alongX ? 0 : t);
    o.add(mk(bar, ir));
    o.add(mk(new THREE.ConeGeometry(0.03, 0.09, 4).rotateX(Math.PI).translate(alongX ? t : 0, H - top - 0.34, alongX ? 0 : t), ir));
  }
  o.add(mk(new THREE.BoxGeometry(alongX ? 1 : 0.04, 0.04, alongX ? 0.04 : 1).translate(0, H - top - 0.08, 0), ir));
  // pedras do arco
  for (let k = 0; k < 5; k++) { const t = -0.4 + k * 0.2; o.add(mk(new THREE.BoxGeometry(alongX ? 0.18 : 1.02, 0.1, alongX ? 1.02 : 0.18).translate(alongX ? t : 0, H - top - 0.02 + Math.cos(t * 2.4) * 0.02, alongX ? 0 : t), smat('stoneblock', '#8e897e'))); }
  return o;
}
function cylUV(g, su, sv) {
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); uv.setXY(i, (a / (Math.PI * 2) + 0.5) * su, p.getY(i) * sv); }
  return g;
}
function mTower(v, off) {
  const R = rng(1101 + v), o = grp(), spire = v === 3, r = 1.12, H = spire ? 9.5 : WALL_H;
  const st = smat('brick', '#a29c90', { bump: 1.4 });
  o.add(mk(cylUV(new THREE.CylinderGeometry(r, r + 0.04, H, 28, 4, true).translate(0, H / 2, 0), 6, 1), st));
  o.add(mk(cylUV(new THREE.CylinderGeometry(r + 0.1, r + 0.14, 0.35, 28).translate(0, 0.175, 0), 6, 1), smat('stoneblock', '#8e897e')));
  // cornija e ameias
  o.add(mk(cylUV(new THREE.CylinderGeometry(r + 0.1, r, 0.14, 28, 1, true).translate(0, H + 0.07, 0), 6, 1), smat('stoneblock', '#b4ae9f')));
  o.add(mk(CYL(r + 0.1, r + 0.1, 0.02, 0, H + 0.14, 0, 28), smat('stoneblock', '#8a857a')));
  const n = 14;
  for (let k = 0; k < n; k++) {
    if (k % 2 || spire) continue;
    const a = k / n * Math.PI * 2, m = mk(wuv(new THREE.BoxGeometry(0.3, 0.3, 0.2), 1.5), smat('stoneblock', '#b4ae9f'));
    m.position.set(Math.cos(a) * (r + 0.02), H + 0.29, Math.sin(a) * (r + 0.02)); m.rotation.y = -a + Math.PI / 2; o.add(m);
  }
  // seteiras viradas para a frente
  for (const [a, y] of [[Math.PI / 4, 1.2], [Math.PI / 4 + 0.9, 1.9], [Math.PI / 4 - 1.0, 0.8]]) {
    const s = mk(new THREE.BoxGeometry(0.08, 0.4, 0.1), smat(null, '#141210')); s.position.set(Math.cos(a) * (r - 0.02), y, Math.sin(a) * (r - 0.02)); s.rotation.y = -a + Math.PI / 2; o.add(s);
  }
  // bandeira no alto
  if (spire) {
    const roofM = smat('slate', '#3e4a66', { bump: 1.6 });
    o.add(mk(cylUV(new THREE.ConeGeometry(r + 0.28, 3.2, 28, 6, true).translate(0, H + 0.14 + 1.6, 0), 8, 1.2), roofM));
    o.add(mk(new THREE.SphereGeometry(0.09, 10, 8).translate(0, H + 3.4, 0), smat(null, '#e2b74e', { metal: 1, rough: 0.3 })));
    o.add(mk(CYL(0.015, 0.015, 0.9, 0, H + 3.8, 0, 6), DWOOD()));
    o.add(mk(new THREE.PlaneGeometry(0.6, 0.32, 4, 1).translate(0.31, H + 4.05, 0), smat('cloth', '#7a1a1c', { side: THREE.DoubleSide })));
    for (const [a, y] of [[Math.PI / 4, H * 0.55], [Math.PI / 4 + 0.7, H * 0.8]]) { const w = mk(new THREE.BoxGeometry(0.22, 0.42, 0.1), smat(null, '#ffd890', { emissive: '#7a5a20', ei: 0.4 })); w.position.set(Math.cos(a) * (r - 0.02), y, Math.sin(a) * (r - 0.02)); w.rotation.y = -a + Math.PI / 2; o.add(w); }
  }
  if (v === 0) { o.add(mk(CYL(0.02, 0.02, 1.1, 0, H + 0.6, 0, 6), DWOOD())); const f = mk(new THREE.PlaneGeometry(0.55, 0.35, 4, 1).translate(0.29, H + 0.95, 0), smat('cloth', '#2c447a', { side: THREE.DoubleSide })); o.add(f); }
  // hera do lado iluminado
  const cards = [];
  for (let i = 0; i < 60; i++) { const a = Math.PI / 2 + (R() - 0.5) * 1.6, y = Math.pow(R(), 0.8) * H * 0.85; cards.push({ x: Math.cos(a) * (r + 0.03), y, z: Math.sin(a) * (r + 0.03), rx: 0, ry: -a + Math.PI / 2, rz: R() * 6, s: 0.2 + R() * 0.12 }); }
  o.add(mk(leafCards(cards, V3(0, 1, 0), 0.2), ivyM()));
  return o;
}
function mStairs(dir, part) {
  const o = grp(), H = WALL_H / STAIR_N, n = 4, m = smat('stoneblock', '#aaa496', { bump: 1.2 }), base = (part || 0) * H, ax = dir <= 2;
  if (base > 0) o.add(wbox(1, base, 1, 0, base / 2, 0, smat('brick', '#958f84', { bump: 1.2 }), 1));
  for (let k = 0; k < n; k++) {
    const zt = base + (k + 1) * H / n, len = 1 - k / n, c = (dir === 1 || dir === 3) ? 0.5 - len / 2 : -0.5 + len / 2;
    o.add(wbox(ax ? len : 1, H / n, ax ? 1 : len, ax ? c : 0, zt - H / n / 2, ax ? 0 : c, m, 1.5));
  }
  return o;
}
function mSlab(v) {
  const o = grp(wbox(1, 0.15, 1, 0, -0.075, 0, smat('stoneblock', '#857f74', { bump: 1 }), 1));
  return o;
}
function mCliff(h, v, snow) {
  const R = rng(1201 + h * 17 + v * 5 + (snow ? 3 : 0)), o = grp(), H = h3(CLIFF_H[h]);
  const rockM = smat('rock', '#ffffff', { vc: true, bump: 1.6 });
  const topC = snow ? '#eef2f5' : h >= 3 ? '#9a9484' : '#5a7a3c';
  const layers = Math.max(2, Math.round(H / 0.55));
  for (let l = 0; l <= layers; l++) {
    const y = l === layers ? H - 0.15 : (l + 0.35) / layers * H, n = l === layers ? 2 : 3;
    for (let q = 0; q < n; q++) {
      const rr = l === layers ? 0.5 : 0.4 + R() * 0.2, g = rockGeo(1300 + l * 7 + q + v * 31 + h * 101, rr, 1.35, l === layers ? 0.55 : 0.95, 1.25).translate((R() - 0.5) * 1.0, y, (R() - 0.5) * 1.0);
      vcolor(g, (c, x, yy, z, ny) => { const top = ny > 0.55 && yy > H - 0.35; const t = clamp(yy / (H + 0.3), 0, 1); c.set(top ? topC : '#9a9486'); if (!top) c.multiplyScalar(0.5 + t * 0.5); c.convertSRGBToLinear(); });
      o.add(mk(g, rockM));
    }
  }
  return o;
}
// ---------- portão (arco + duas folhas de madeira) ----------
function mGateHouse(gt, f) {
  const n = gt.vert ? gt.y - gt.y0 + 1 : gt.x1 - gt.x0 + 1, main = gt.kind === 'main' || gt.kind === 'west', gh = main ? 6.4 : WALL_H, o = grp();
  const L = -(n - 0.5), Rr = 0.5, cx = -(n - 1) / 2, rx = (n - 0.3) / 2, spring = main ? 2.9 : 2.2, ry = Math.min(rx * 0.85, gh - spring - 0.5);
  const st = smat('brick', '#a29c90', { bump: 1.4 }), capM = smat('stoneblock', '#b0a998', { bump: 1 });
  // parte de cima do arco
  const sh = new THREE.Shape(); sh.moveTo(L, spring); sh.lineTo(L, gh); sh.lineTo(Rr, gh); sh.lineTo(Rr, spring); sh.lineTo(cx + rx, spring);
  for (let k = 1; k <= 20; k++) { const t = k / 20 * Math.PI; sh.lineTo(cx + rx * Math.cos(t), spring + ry * Math.sin(t)); }
  sh.lineTo(L, spring);
  o.add(mk(wuv(new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5), 1), st));
  for (const jx of [L + (cx - rx - L) / 2, Rr - (Rr - cx - rx) / 2]) o.add(wbox(Math.max(0.12, cx - rx - L), spring, 1, jx, spring / 2, 0, st, 1));
  // pedras do arco (aduelas) na face de fora
  for (let k = 0; k <= 10; k++) { const t = k / 10 * Math.PI, m = mk(new THREE.BoxGeometry(0.2, 0.32, 0.08), capM); m.position.set(cx + (rx + 0.12) * Math.cos(t), spring + (ry + 0.12) * Math.sin(t), gt.out * 0.52); m.rotation.z = t - Math.PI / 2; o.add(m); }
  // cornija e ameias dos dois lados
  o.add(wbox(n, 0.1, 1.08, cx, gh - 0.05, 0, capM, 1));
  for (let k = 0; k < n * 2; k++) for (const zz of [0.42, -0.42]) o.add(mk(wuv(new THREE.BoxGeometry(0.3, 0.42, 0.2).translate(L + 0.25 + k * 0.5, gh + 0.21, zz), 1.5), capM));
  if (main) {
    // brasão e lanternas na fachada do portão principal
    const shield = mk(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 6).rotateX(Math.PI / 2).translate(cx, spring + ry + 0.42, gt.out * 0.55), smat(null, '#7a1a1c', { rough: 0.5 }));
    o.add(shield); o.add(mk(new THREE.SphereGeometry(0.12, 10, 8).translate(cx, spring + ry + 0.42, gt.out * 0.6), smat(null, '#e2b74e', { metal: 1, rough: 0.3 })));
    for (const lx of [L + 0.1, Rr - 0.1]) o.add(mk(new THREE.BoxGeometry(0.14, 0.2, 0.14).translate(lx, 1.6, gt.out * 0.6), smat(null, '#ffd890', { emissive: '#ffbb60', ei: 1.4 })));
  }
  // folhas das portas: giram para dentro da cidade conforme f (0 fechado, 1 aberto)
  const woodM = smat('wood', '#6a4424', { bump: 1.6 }), ir = IRON();
  const zin = -gt.out * 0.3, ang = f * 1.5;
  const topAt = xw => spring + ry * Math.sqrt(Math.max(0, 1 - ((xw - cx) / rx) ** 2));
  for (const side of [-1, 1]) {
    const hinge = cx + side * rx, lw = rx - 0.02, ls = new THREE.Shape();
    ls.moveTo(0, 0); ls.lineTo(lw, 0);
    for (let k = 0; k <= 12; k++) { const u = lw * (1 - k / 12); ls.lineTo(u, topAt(hinge - side * u) - 0.02); }
    ls.lineTo(0, 0);
    const leaf = grp(mk(wuv(new THREE.ExtrudeGeometry(ls, { depth: 0.09, bevelEnabled: false }).translate(0, 0, -0.045), 1.4), woodM));
    for (const y of [0.35, spring * 0.55, spring - 0.1]) leaf.add(mk(new THREE.BoxGeometry(lw * 0.96, 0.07, 0.11).translate(lw / 2, y, 0), ir));
    leaf.add(mk(new THREE.TorusGeometry(0.07, 0.015, 5, 12).translate(lw - 0.18, spring * 0.5, gt.out * 0.06), ir));
    const pv = grp(leaf); pv.position.set(hinge, 0, zin); pv.userData.leaf = (side === -1 ? 1 : -1) * (gt.out > 0 ? 1 : -1);
    if (side === 1) leaf.scale.x = -1;
    pv.rotation.y = (side === -1 ? 1 : -1) * ang * (gt.out > 0 ? 1 : -1);
    o.add(pv);
  }
  if (gt.vert) { o.rotation.y = -Math.PI / 2; return grp(o); }   // portão na muralha oeste: gira 90°
  return o;
}
function gateHouseSprite(gi) {
  const gt = WORLD.gates[gi], f = (G.gateF && G.gateF[gi]) || 0, q = Math.round(f * 4);
  return scen3('gh|' + gi + '|' + q, () => mGateHouse(gt, q / 4)) || (q ? null : gateSprite(true));
}
// ---------- torre-escada (3x3): por fora uma torre de pedra; cortada mostra a escada em espiral ----------
function mStairTower(b, cut) {
  const o = grp(), H = WALL_H, cx = 1.5, cz = 1.5, t = 0.22, wallM = smat('brick', '#a29c90', { bump: 1.4 }), capM = smat('stoneblock', '#b0a998', { bump: 1 });
  const hw = 0.35, dc = 1.5, dw = 0.7, dh = 1.15;
  // piso e chão do alto (passarela)
  o.add(wbox(3, 0.06, 3, cx, 0.03, cz, smat('stoneblock', '#8e887c', { bump: 1 }), 1));
  if (!cut) o.add(wbox(3, 0.12, 3, cx, H - 0.06, cz, smat('stoneblock', '#9a948a', { bump: 1 }), 1));
  // paredes: as do fundo (lado oposto à câmera) sempre inteiras; as da frente cortadas quando você está dentro
  const knee = cut ? { S: ['front', 'right'], N: ['back', 'left'], E: ['front', 'left'], W: ['back', 'right'] }[b.realDoor || 'S'] : [];
  const fh = f => knee.includes(f) ? hw : H;
  o.add(gwall(t, fh('left'), 3, t / 2, fh('left') / 2, cz, 'brick', '#a29c90', H, 2.1, 1, 1.4));
  o.add(gwall(3, fh('back'), t, cx, fh('back') / 2, t / 2, 'brick', '#a29c90', H, 2.2, 1, 1.4));
  o.add(gwall(t, fh('right'), 3, 3 - t / 2, fh('right') / 2, cz, 'brick', '#a29c90', H, 2.3, 1, 1.4));
  const fr = knee.includes('front') ? hw : dh;
  if (dc - dw / 2 > 0) o.add(gwall(dc - dw / 2, fh('front'), t, (dc - dw / 2) / 2, fh('front') / 2, 3 - t / 2, 'brick', '#a29c90', H, 2.4, 1, 1.4));
  o.add(gwall(3 - dc - dw / 2, fh('front'), t, (dc + dw / 2 + 3) / 2, fh('front') / 2, 3 - t / 2, 'brick', '#a29c90', H, 2.5, 1, 1.4));
  if (!knee.includes('front')) o.add(gwall(dw, H - dh, t, dc, dh + (H - dh) / 2, 3 - t / 2, 'brick', '#a29c90', H, 2.6, 1, 1.4));
  if (!cut) {
    // porta em arco, seteiras e ameias
    const doorM = smat('wood', '#5a3a1e', { bump: 1.5 });
    o.add(mk(new THREE.BoxGeometry(dw - 0.06, dh - 0.04, 0.05).translate(dc, (dh - 0.04) / 2, 3 + 0.01), doorM));
    o.add(mk(new THREE.CylinderGeometry(dw / 2, dw / 2, 0.06, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(dc, dh, 3 + 0.01), capM));
    for (const [x, y, z, ry] of [[3.02, H * 0.45, 1.5, Math.PI / 2], [3.02, H * 0.75, 1.0, Math.PI / 2], [1.0, H * 0.6, 3.02, 0]]) { const a = mk(new THREE.BoxGeometry(0.1, 0.42, 0.05), smat(null, '#141210')); a.position.set(x, y, z); a.rotation.y = ry; o.add(a); }
    for (let k = 0; k < 6; k++) for (const [x, z, w2, d2] of [[0.25 + k * 0.5, 2.9, 0.3, 0.2], [2.9, 0.25 + k * 0.5, 0.2, 0.3], [0.25 + k * 0.5, 0.1, 0.3, 0.2], [0.1, 0.25 + k * 0.5, 0.2, 0.3]]) if (k % 2 === 0) o.add(mk(wuv(new THREE.BoxGeometry(w2, 0.42, d2).translate(x, H + 0.21, z), 1.5), capM));
    o.add(wbox(3.12, 0.12, 3.12, cx, H - 0.02, cz, capM, 1));
    // alçapão no alto (por onde se desce)
    o.add(mk(new THREE.BoxGeometry(0.7, 0.03, 0.7).translate(cx, H + 0.02, cz), smat('wood', '#4a2f17', { bump: 1.2 })));
  }
  // escada em espiral: degraus em leque subindo em volta de um pilar central
  const pillarM = smat('stoneblock', '#9a948a', { bump: 1.2 }), stepM = smat('stoneblock', '#b4ae9f', { bump: 1.2 });
  // escada reta de 1 tile no centro, subindo para o fundo, com uma abertura escura no alto
  { const n = 8; for (let k = 0; k < n; k++) o.add(wbox(0.8, (k + 1) * 0.32, 0.9 / n, cx, (k + 1) * 0.16, cz + 0.45 - (k + 0.5) * 0.9 / n, stepM, 2)); for (const x of [cx - 0.44, cx + 0.44]) o.add(wbox(0.06, 2.6, 0.9, x, 1.3, cz, pillarM, 2)); o.add(mk(new THREE.BoxGeometry(0.8, 0.02, 0.9).translate(cx, 0.07, cz), smat(null, '#c8a050', { emissive: '#6a4a10', ei: 0.25, transparent: true, opacity: 0.3 }), false)); }
  if (cut) { const lp = new THREE.PointLight(0xffc070, 0.9, 3.5); lp.position.set(cx + 0.8, 1.2, cz + 0.8); o.add(lp); }
  return o;
}
// ---------- construções do vilarejo ----------
const BSTYLE = {
  temple: { wall: '#d8d0bc', roof: '#46587a', tex: 'brick', roofTex: 'slate', trim: '#c9a24a' },
  shop: { wall: '#e6d6b0', roof: '#9a3c2a', tex: 'plaster', roofTex: 'shingle', trim: '#4a2f17' },
  tavern: { wall: '#6e4a2e', roof: '#c4a058', tex: 'oldplank', roofTex: 'thatch', trim: '#2e1c10' },   // celeiro: tábuas escuras, telhado de palha
  smith: { wall: '#8e897e', roof: '#4e4844', tex: 'brick', roofTex: 'slate', trim: '#2a1e14' },
  barracks: { wall: '#9c968a', roof: '#5e4034', tex: 'brick', roofTex: 'shingle', trim: '#2a1e14' },
  stable: { wall: '#9a7850', roof: '#5a5048', tex: 'wood', roofTex: 'slate', trim: '#3a2410' },
  manor: { wall: '#ece4d2', roof: '#3a4252', tex: 'stoneblock', roofTex: 'slate', trim: '#8a7a5a' },
  boutique: { wall: '#f2ece0', roof: '#2c3346', tex: 'stoneblock', roofTex: 'slate', trim: '#c9a24a' },
  fruithouse: { wall: '#f0cf6a', roof: '#a8402a', tex: 'plaster', roofTex: 'shingle', trim: '#5a3418' },
  jail: { wall: '#7c786e', roof: '#3a3c42', tex: 'brick', roofTex: 'slate', trim: '#1e1a16' },
  stairtower: { wall: '#a29c90', roof: '#3e4a66', tex: 'brick', roofTex: 'slate', trim: '#2a1e14' },
};
// variações de casas e lojas (cores de reboco, telhados e madeira)
const HVAR = [
  { wall: '#e4d8bc', roof: '#8a3a2a', roofTex: 'shingle', trim: '#4a2f17' },
  { wall: '#d8c8a0', roof: '#9a5232', roofTex: 'shingle', trim: '#3a2410' },
  { wall: '#e8e0cc', roof: '#4e5464', roofTex: 'slate', trim: '#2e2218' },
  { wall: '#d4b890', roof: '#7a3426', roofTex: 'shingle', trim: '#3a2410' },
  { wall: '#cfc4ae', roof: '#6a5a4a', roofTex: 'slate', trim: '#4a3020' },
  { wall: '#e2cfa8', roof: '#3e4656', roofTex: 'slate', trim: '#5a3a1e' },
];
BSTYLE.hotel = { wall: '#8a6040', roof: '#7a4a30', tex: 'oldplank', roofTex: 'shingle', trim: '#3a2212' };   // pousada: pedra embaixo, tábuas em cima, telhado de meia-água   // pousada: enxaimel de reboco claro e vigas escuras, telhado de telha
BSTYLE.bank = { wall: '#efe9dc', roof: '#4a5262', tex: 'stoneblock', roofTex: 'slate', trim: '#c9a24a' };
const WSTYLE = {
  saw: { wall: '#8a6a44', roof: '#5a4a3a', tex: 'wood', roofTex: 'shingle', trim: '#3a2410' },
  carp: { wall: '#a07a4e', roof: '#7a3a26', tex: 'wood', roofTex: 'shingle', trim: '#3a2410' },
  alch: { wall: '#d8c8a0', roof: '#3e5a46', tex: 'plaster', roofTex: 'shingle', trim: '#3a2410' },
  farm: { wall: '#9a7850', roof: '#8a6a3a', tex: 'wood', roofTex: 'shingle', trim: '#3a2410' },
  mine: { wall: '#7a756a', roof: '#4a4440', tex: 'stoneblock', roofTex: 'slate', trim: '#2a1e14' },
  wheat: { wall: '#a8402a', roof: '#6a4a2a', tex: 'wood', roofTex: 'shingle', trim: '#e8dcc0' },
  mill: { wall: '#e2d6bc', roof: '#5a4a3a', tex: 'plaster', roofTex: 'shingle', trim: '#4a3018' },
  bakery: { wall: '#efd49a', roof: '#b4482a', tex: 'plaster', roofTex: 'shingle', trim: '#3e2412' },   // enxaimel cor de trigo, vigas escuras, telha vermelha
};
function styleOf(b) {
  if (b.deco === 'arcane') return { wall: '#3a2a20', roof: '#2c2a32', tex: 'oldplank', roofTex: 'slate', trim: '#a8823a' };   // varinhas: madeira quase preta, ouro gasto
  if (b.deco === 'tailor') return { wall: '#dccbaa', roof: '#33263a', tex: 'oldplank', roofTex: 'slate', trim: '#d4a94a' };   // alfaiataria: paredes bege, telhado ameixa e dourado
  if (b.kind === 'shop' && b.v === 6) return { wall: '#3e3a52', roof: '#24403e', tex: 'stoneblock', roofTex: 'slate', trim: '#c9a24a' };   // alquimista: pedra escura arroxeada, latão
  if (b.office === 'agency') return { wall: '#e6dfcf', roof: '#3a2c24', tex: 'stoneblock', roofTex: 'slate', trim: '#3a2416' };   // agência: pedra clara e madeira escura
  if (b.office) return { wall: '#e8e2d2', roof: '#34404e', tex: 'stoneblock', roofTex: 'slate', trim: '#b08a3a' };   // imobiliária: pedra clara e bronze
  if (b.kind === 'workshop') return WSTYLE[b.wk] || WSTYLE.carp;
  if (b.kind === 'house' || (b.kind === 'shop' && b.v)) { const h = HVAR[(b.v || 0) % HVAR.length]; return { tex: 'plaster', ...h }; }
  return BSTYLE[b.kind];
}
function bldDims(b) { return { H: b.H || h3(b.wall * 2), RH: b.RH || h3(b.roof * 2) }; }
function bldWinList(b) { return b.kind === 'temple' ? [['R', 0.25], ['R', 0.75], ['L', 0.2], ['L', 0.8]] : b.kind === 'house' || b.kind === 'stable' ? [['R', 0.5], ['L', 0.22]] : [['R', 0.3], ['R', 0.72], ['L', 0.16], ['L', 0.84]]; }
// telhado: cada face é um polígono com UV que segue a inclinação
function roofFace(pts, m) {
  const a = pts[0], b = pts[1], e = new THREE.Vector3().subVectors(b, a).normalize();
  let n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
  if (n.y < 0) { pts = pts.slice().reverse(); n.negate(); }
  const s = new THREE.Vector3().crossVectors(n, e).normalize();
  const pos = [], uv = [];
  const tri = (p, q, r) => { for (const v of [p, q, r]) { pos.push(v.x, v.y, v.z); const d = new THREE.Vector3().subVectors(v, a); uv.push(d.dot(e) * 1.2, d.dot(s) * 1.2); } };
  tri(pts[0], pts[1], pts[2]); if (pts.length === 4) tri(pts[0], pts[2], pts[3]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return mk(g, m);
}
// sujeira e umidade: escurece a base das paredes (cor por vértice)
function grime(g, H, seed) {
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = clamp(y / Math.min(1.4, H), 0, 1), n = 0.9 + vnoise(p.getX(i) * 2 + seed, p.getZ(i) * 2, 3) * 0.1, v = (0.62 + 0.38 * Math.sqrt(t)) * n; col[i * 3] = v; col[i * 3 + 1] = v * 0.98; col[i * 3 + 2] = v * 0.94; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function gwall(w, h, d, x, y, z, kind, hex, H, seed, sc = 0.7, bump = 1.2) {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w * 2)), Math.max(2, Math.round(h * 2)), Math.max(1, Math.round(d * 2))).translate(x, y, z);
  wuv(g, sc); grime(g, H, seed);
  return mk(g, smat(kind, hex, { vc: true, bump }));
}
function mCastle(b, night) {
  const w = b.w, h = b.h, { H, RH } = bldDims(b), o = grp(), seed = 3.7;
  const wallC = '#bab2a2', roofM = smat('slate', '#3a465e', { bump: 1.8 }), capM = smat('stoneblock', '#c8c0ae', { bump: 1 }), gold = smat(null, '#e2b74e', { metal: 1, rough: 0.3 });
  const darkS = smat('stoneblock', '#8a857a', { bump: 1.5 }), ir = IRON(), woodM = smat('wood', '#5a3a1e', { bump: 1.5 });
  const glassM = night ? smat(null, '#ffd890', { emissive: '#ffb850', ei: 1.6, rough: 0.3 }) : smat(null, '#24323e', { rough: 0.08, metal: 0.4 });
  const leadM = smat(null, '#2a2a2e', { metal: 0.6, rough: 0.5 });
  // paredes de cantaria (blocos grandes de pedra clara), base inclinada mais escura e cornija
  o.add(gwall(w, H, h, w / 2, H / 2, h / 2, 'stoneblock', wallC, H, seed, 0.55, 1.6));
  o.add(wbox(w + 0.3, 0.45, h + 0.3, w / 2, 0.225, h / 2, darkS, 1)); o.add(wbox(w + 0.16, 0.3, h + 0.16, w / 2, 0.6, h / 2, darkS, 1));
  o.add(wbox(w + 0.1, 0.12, h + 0.1, w / 2, H * 0.52, h / 2, capM, 1));   // friso no meio da parede
  o.add(wbox(w + 0.18, 0.16, h + 0.18, w / 2, H - 0.08, h / 2, capM, 1));
  // janelas góticas: moldura, arco pontudo, vitral com caixilhos de chumbo, travessa e peitoril
  const gwin = (x, y, z, ry, tall) => { const g = grp(); const ww = 0.5, wh = tall ? 1.4 : 0.85;
    g.add(mk(new THREE.BoxGeometry(ww + 0.16, wh + 0.1, 0.09), capM)); g.add(mk(new THREE.ConeGeometry(ww / 2 + 0.08, 0.45, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.25).translate(0, wh / 2 + 0.2, 0), capM));
    g.add(mk(new THREE.BoxGeometry(ww, wh, 0.04).translate(0, 0, 0.03), glassM));
    g.add(mk(new THREE.BoxGeometry(0.03, wh, 0.05).translate(0, 0, 0.05), leadM)); g.add(mk(new THREE.BoxGeometry(ww, 0.03, 0.05).translate(0, wh * 0.15, 0.05), leadM));
    g.add(mk(new THREE.BoxGeometry(ww + 0.24, 0.07, 0.16).translate(0, -wh / 2 - 0.06, 0.06), capM));
    g.position.set(x, y, z); g.rotation.y = ry; o.add(g); };
  const dc = doorCol(b) + 0.5;
  for (let k = 0; k < 6; k++) { const u = (k + 0.5) * w / 6; if (Math.abs(u - dc) > 1.5) gwin(u, 1.75, h + 0.03, 0, true); gwin(u, H - 1.25, h + 0.03, 0, false); }
  for (let k = 0; k < 5; k++) { const u = (k + 0.5) * h / 5; gwin(w + 0.03, 1.75, u, Math.PI / 2, true); gwin(w + 0.03, H - 1.25, u, Math.PI / 2, false); }
  // contrafortes entre as janelas (com topo inclinado)
  const butt = (x, z, ry) => { const g = grp(); g.add(wbox(0.34, H * 0.8, 0.3, 0, H * 0.4, 0.15, capM, 1)); g.add(mk(new THREE.BoxGeometry(0.34, 0.5, 0.3).translate(0, 0.25, -0.15).rotateX(0.7).translate(0, H * 0.8 - 0.05, 0.28), capM)); g.position.set(x, 0, z); g.rotation.y = ry; o.add(g); };
  for (let k = 1; k < 6; k++) { const u = k * w / 6; if (Math.abs(u - dc) > 1.9) butt(u, h, 0); }
  for (let k = 1; k < 5; k++) butt(w, k * h / 5, Math.PI / 2);
  // ameias com mísulas (machicólis) no alto das paredes
  for (let k = 0; k < w * 2; k++) { o.add(mk(wuv(new THREE.BoxGeometry(0.3, 0.42, 0.24).translate(0.25 + k * 0.5, H + 0.21, h + 0.02), 1.5), capM)); o.add(mk(new THREE.BoxGeometry(0.12, 0.22, 0.14).translate(0.25 + k * 0.5, H - 0.27, h + 0.1), capM)); }
  for (let k = 0; k < h * 2; k++) { o.add(mk(wuv(new THREE.BoxGeometry(0.24, 0.42, 0.3).translate(w + 0.02, H + 0.21, 0.25 + k * 0.5), 1.5), capM)); o.add(mk(new THREE.BoxGeometry(0.14, 0.22, 0.12).translate(w + 0.1, H - 0.27, 0.25 + k * 0.5), capM)); }
  // telhado de ardósia de quatro águas, com cumeeira de chumbo e trapeiras
  const ov = 0.1, A = V3(ov, H, ov), B = V3(w - ov, H, ov), C = V3(w - ov, H, h - ov), D = V3(ov, H, h - ov), r1 = V3(h / 2, H + RH, h / 2), r2 = V3(w - h / 2, H + RH, h / 2);
  for (const f of [[D, C, r2, r1], [B, A, r1, r2], [A, D, r1], [C, B, r2]]) o.add(roofFace(f, roofM));
  o.add(mk(new THREE.BoxGeometry(Math.max(0.2, w - h + 0.1), 0.08, 0.12).translate(w / 2, H + RH + 0.03, h / 2), leadM));
  for (const t of [0.3, 0.7]) { const x = w * t, tt = 0.38, z = h - ov - tt * (h / 2 - ov), y = H + tt * RH, dg = grp();
    dg.add(wbox(0.7, 0.75, 0.9, 0, 0.375, 0, capM, 1)); dg.add(mk(new THREE.BoxGeometry(0.4, 0.45, 0.03).translate(0, 0.4, 0.46), glassM)); dg.add(mk(new THREE.BoxGeometry(0.03, 0.45, 0.04).translate(0, 0.4, 0.475), leadM));
    dg.add(mk(new THREE.ConeGeometry(0.58, 0.55, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 1.4).translate(0, 1.0, -0.05), roofM)); dg.position.set(x, y - 0.25, z); o.add(dg); }
  // torres nos cantos: cantaria, mísulas, parapeito com ameias, seteiras, telhado cônico e flâmula
  for (const [tx, tz] of [[0, 0], [w, 0], [0, h], [w, h]]) {
    const th = H + 3.6, tr = 1.05;
    o.add(mk(cylUV(new THREE.CylinderGeometry(tr, tr + 0.12, th, 24, 4, true).translate(tx, th / 2, tz), 5, 1), smat('stoneblock', wallC, { bump: 1.6 })));
    o.add(mk(cylUV(new THREE.CylinderGeometry(tr + 0.2, tr + 0.2, 0.45, 24, 1, true).translate(tx, 0.22, tz), 6, 1), darkS));
    for (let k = 0; k < 14; k++) { const an = k / 14 * Math.PI * 2; o.add(mk(new THREE.BoxGeometry(0.14, 0.24, 0.16).translate(tx + Math.cos(an) * (tr + 0.08), th - 0.1, tz + Math.sin(an) * (tr + 0.08)), capM)); }
    o.add(mk(cylUV(new THREE.CylinderGeometry(tr + 0.2, tr + 0.2, 0.42, 24, 1, true).translate(tx, th + 0.2, tz), 6, 1), capM));
    for (let k = 0; k < 12; k += 2) { const an = k / 12 * Math.PI * 2; o.add(mk(new THREE.BoxGeometry(0.3, 0.3, 0.2).translate(tx + Math.cos(an) * (tr + 0.2), th + 0.55, tz + Math.sin(an) * (tr + 0.2)), capM)); }
    o.add(mk(cylUV(new THREE.ConeGeometry(tr + 0.15, 2.5, 24, 4, true).translate(tx, th + 0.4 + 1.25, tz), 8, 1.2), roofM));
    o.add(mk(new THREE.SphereGeometry(0.08, 10, 8).translate(tx, th + 2.95, tz), gold));
    o.add(mk(CYL(0.015, 0.015, 0.8, tx, th + 3.3, tz, 6), DWOOD())); o.add(mk(new THREE.PlaneGeometry(0.55, 0.22, 3, 1).translate(tx + 0.28, th + 3.55, tz), smat('cloth', '#7a1a1c', { side: THREE.DoubleSide })));
    for (const [an, yy] of [[Math.PI / 4, th * 0.42], [Math.PI / 4 + 0.8, th * 0.68], [Math.PI / 4 - 0.8, th * 0.68]]) { const wnd = mk(new THREE.BoxGeometry(0.12, 0.55, 0.1), glassM); wnd.position.set(tx + Math.cos(an) * tr, yy, tz + Math.sin(an) * tr); wnd.rotation.y = -an + Math.PI / 2; o.add(wnd); }
  }
  // torre de menagem central (mais baixa que antes), com guaritas nos cantos
  { const cx = w / 2, cz = 2.3, s2 = 3.2, th = H + 7.5;
    o.add(gwall(s2, th, s2, cx, th / 2, cz, 'stoneblock', wallC, th, seed + 1, 0.55, 1.6));
    o.add(wbox(s2 + 0.2, 0.16, s2 + 0.2, cx, th - 0.08, cz, capM, 1)); o.add(wbox(s2 + 0.1, 0.1, s2 + 0.1, cx, th * 0.6, cz, capM, 1));
    for (const [x, z, ry] of [[cx, cz + s2 / 2 + 0.03, 0], [cx + s2 / 2 + 0.03, cz, Math.PI / 2]]) { gwin(x, th - 1.4, z, ry, true); gwin(x, th - 3.5, z, ry, false); }
    o.add(mk(new THREE.ConeGeometry(s2 * 0.82, 3.6, 4, 1).rotateY(Math.PI / 4).translate(cx, th + 1.8, cz), roofM));
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1]]) { const bx = cx + dx * s2 / 2, bz = cz + dz * s2 / 2;
      o.add(mk(cylUV(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 14, 1, true).translate(bx, th - 0.4, bz), 3, 1), capM)); o.add(mk(new THREE.ConeGeometry(0.34, 0.5, 14).rotateX(Math.PI).translate(bx, th - 1.25, bz), capM));
      o.add(mk(cylUV(new THREE.ConeGeometry(0.44, 1.2, 14, 1, true).translate(bx, th + 0.8, bz), 3, 1), roofM)); }
    o.add(mk(new THREE.SphereGeometry(0.14, 10, 8).translate(cx, th + 3.7, cz), gold));
    o.add(mk(CYL(0.02, 0.02, 1.2, cx, th + 4.3, cz, 6), DWOOD()));
    o.add(mk(new THREE.PlaneGeometry(0.9, 0.5, 4, 1).translate(cx + 0.46, th + 4.6, cz), smat('cloth', '#7a1a1c', { side: THREE.DoubleSide })));
  }
  // entrada: casa da porta saliente com ameias, portal em arco, grade levadiça erguida, ponte levadiça baixada com correntes
  { const g = grp(), dw = 1.6, dh = 2.8, gw = dw + 1.3, gh = dh + 1.6;
    g.add(gwall(gw, gh, 0.5, 0, gh / 2, 0.2, 'stoneblock', wallC, gh, seed + 2, 0.55, 1.6));
    for (let k = 0; k < 6; k++) g.add(mk(new THREE.BoxGeometry(0.28, 0.36, 0.22).translate(-gw / 2 + 0.24 + k * (gw - 0.48) / 5, gh + 0.18, 0.4), capM));
    g.add(mk(new THREE.BoxGeometry(dw + 0.4, dh + 0.25, 0.1).translate(0, (dh + 0.25) / 2, 0.46), capM));
    g.add(mk(new THREE.BoxGeometry(dw, dh, 0.06).translate(0, dh / 2, 0.5), smat(null, '#140e08', { rough: 1 })));   // passagem escura
    g.add(mk(new THREE.CylinderGeometry(dw / 2, dw / 2, 0.06, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, dh, 0.5), smat(null, '#140e08')));
    for (let k = 0; k <= 7; k++) g.add(mk(new THREE.BoxGeometry(0.04, 0.55, 0.04).translate(-dw / 2 + 0.1 + k * (dw - 0.2) / 7, dh + 0.05, 0.55), ir));   // grade levadiça erguida (pontas aparecendo)
    for (let k = 0; k <= 7; k++) g.add(mk(new THREE.ConeGeometry(0.035, 0.12, 4).rotateX(Math.PI).translate(-dw / 2 + 0.1 + k * (dw - 0.2) / 7, dh - 0.28, 0.55), ir));
    g.add(mk(new THREE.BoxGeometry(dw - 0.1, 0.05, 0.04).translate(0, dh + 0.12, 0.56), ir));
    const bl = 1.5; g.add(wbox(dw + 0.1, 0.1, bl, 0, 0.06, 0.55 + bl / 2, woodM, 1.5));   // ponte levadiça baixada
    for (let k = 0; k < 6; k++) g.add(mk(new THREE.BoxGeometry(dw + 0.12, 0.012, 0.02).translate(0, 0.115, 0.6 + k * bl / 6), smat(null, '#2a1a0e')));
    for (const zz of [0.75, 0.55 + bl - 0.2]) g.add(mk(new THREE.BoxGeometry(dw + 0.14, 0.03, 0.08).translate(0, 0.125, zz), ir));
    for (const sx of [-1, 1]) { const p0 = V3(sx * (dw / 2 + 0.02), 0.13, 0.55 + bl - 0.15), p1 = V3(sx * (dw / 2 + 0.2), dh + 0.7, 0.48), L = p0.distanceTo(p1), c = mk(new THREE.CylinderGeometry(0.025, 0.025, L, 5), ir);
      c.position.copy(p0).add(p1).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(V3(0, 1, 0), p1.clone().sub(p0).normalize()); g.add(c);
      g.add(mk(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10).rotateZ(Math.PI / 2).translate(sx * (dw / 2 + 0.2), dh + 0.7, 0.5), ir)); }
    for (const sx of [-1.15, 1.15]) { g.add(mk(new THREE.PlaneGeometry(0.5, 1.5).translate(sx, 2.5, 0.47), smat('cloth', '#7a1a1c', { side: THREE.DoubleSide }))); g.add(mk(new THREE.CircleGeometry(0.15, 12).translate(sx, 2.8, 0.48), gold)); }
    { const sh = mk(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 6).rotateX(Math.PI / 2).translate(0, dh + 1.05, 0.48), smat(null, '#7a1a1c', { rough: 0.5 })); g.add(sh); g.add(mk(new THREE.SphereGeometry(0.1, 10, 8).translate(0, dh + 1.05, 0.52), gold)); }
    for (const sx of [-1, 1]) g.add(mk(new THREE.BoxGeometry(0.14, 0.2, 0.14).translate(sx * (gw / 2 - 0.12), 1.7, 0.55), smat(null, '#ffd890', { emissive: '#ffbb60', ei: night ? 1.6 : 0.6 })));
    g.position.set(dc, 0, h); o.add(g); }
  return o;
}
// monta o prédio no quadro local (porta virada para +z) e gira para o lado certo;
// a origem fica no canto da área do prédio (igual ao desenho antigo)
function localB(b) { const [A, D] = bDims(b); return { realDoor: b.door || 'S', ...b, w: A, h: D, door: 'S', x: b.arch != null ? 40 + b.arch * 7 : b.x, y: b.arch != null ? 40 + b.arch * 13 : b.y }; }
function placeRot(b, inner) {
  const [A, D] = bDims(b), root = grp(), mid = grp(inner);
  inner.position.set(-A / 2, 0, -D / 2);
  mid.rotation.y = DOOR_ROT[b.door || 'S']; mid.position.set(b.w / 2, 0, b.h / 2); root.add(mid);
  return root;
}
// pousada: telhado de meia-água (oitão cortado por uma aba de quatro águas), duas águas-furtadas e o javali no cume
function mHotelRoof(o, b, W2, H2, H, RH, st, glassM, night) {
  const roofM = smat('shingle', st.roof, { bump: 1.6, side: THREE.DoubleSide }), edge = smat('wood', '#3a2212'), ov = 0.4, g = 0.1, c = 0.55;
  const zf = H2 + ov, zb = -ov, zm = H2 / 2, hc = H + c * RH, top = H + RH, zcf = zf - c * (zf - zm), zcb = zb + c * (zm - zb), ins = (1 - c) * (zf - zm), rx1 = -g + ins, rx2 = W2 + g - ins;
  const q = (...p) => o.add(roofFace(p, roofM));
  q(V3(-g, H, zf), V3(W2 + g, H, zf), V3(W2 + g, hc, zcf), V3(-g, hc, zcf)); q(V3(-g, hc, zcf), V3(W2 + g, hc, zcf), V3(rx2, top, zm), V3(rx1, top, zm));
  q(V3(W2 + g, H, zb), V3(-g, H, zb), V3(-g, hc, zcb), V3(W2 + g, hc, zcb)); q(V3(W2 + g, hc, zcb), V3(-g, hc, zcb), V3(rx1, top, zm), V3(rx2, top, zm));
  q(V3(-g, hc, zcb), V3(-g, hc, zcf), V3(rx1, top, zm)); q(V3(W2 + g, hc, zcf), V3(W2 + g, hc, zcb), V3(rx2, top, zm));
  // oitões de tábuas até a aba
  const gm = smat('oldplank', '#6e4a30', { bump: 1, side: THREE.DoubleSide }), yE = H + RH * ov / (zf - zm);
  const tri = (p, r, t) => { const gg = new THREE.BufferGeometry().setFromPoints([p, r, t]); gg.computeVertexNormals(); wuv(gg, 0.7); o.add(mk(gg, gm)); };
  for (const x of [0, W2]) { const P = [V3(x, H, 0), V3(x, yE, 0), V3(x, hc, zcb + 0.02), V3(x, hc, zcf - 0.02), V3(x, yE, H2), V3(x, H, H2)]; for (let k = 1; k < P.length - 1; k++) tri(P[0], P[k], P[k + 1]); }
  // tábuas de acabamento nas beiradas e cumeeira
  for (const [p, r] of [[V3(-g, H, zf), V3(W2 + g, H, zf)], [V3(-g, H, zb), V3(W2 + g, H, zb)], [V3(-g, H, zf), V3(-g, hc, zcf)], [V3(-g, H, zb), V3(-g, hc, zcb)], [V3(W2 + g, H, zf), V3(W2 + g, hc, zcf)], [V3(W2 + g, H, zb), V3(W2 + g, hc, zcb)], [V3(-g, hc, zcf), V3(rx1, top, zm)], [V3(-g, hc, zcb), V3(rx1, top, zm)], [V3(W2 + g, hc, zcf), V3(rx2, top, zm)], [V3(W2 + g, hc, zcb), V3(rx2, top, zm)]]) o.add(limb(p, r, 0.05, 0.05, edge, 4));
  o.add(limb(V3(rx1 - 0.05, top + 0.02, zm), V3(rx2 + 0.05, top + 0.02, zm), 0.07, 0.07, smat('wood', '#4a2e1a'), 6));
  // janelinha redonda nos oitões
  for (const x of [-0.03, W2 + 0.03]) { const gw = mk(new THREE.CircleGeometry(0.16, 12), glassM); gw.position.set(x, H + (hc - H) * 0.5, H2 / 2); gw.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2; o.add(gw); o.add(mk(new THREE.TorusGeometry(0.17, 0.03, 5, 14).rotateY(Math.PI / 2).translate(x, H + (hc - H) * 0.5, H2 / 2), edge)); }
  // duas águas-furtadas na água da frente
  const dz = zf - 0.42 * (zf - zm), dy = H + 0.42 * RH, wallM = smat('oldplank', '#7a5434', { bump: 1 });
  for (const dx of [W2 * 0.26, W2 * 0.62]) { const gD = grp(), dw = 0.72, dh = 0.62, dd = 0.95;
    gD.add(wbox(dw, dh, dd, 0, dh / 2 - 0.12, -dd / 2, wallM, 1));
    gD.add(mk(new THREE.BoxGeometry(0.36, 0.34, 0.02).translate(0, dh / 2 - 0.1, 0.01), glassM)); for (const [ww, hh, xx, yy] of [[0.44, 0.05, 0, dh / 2 + 0.08], [0.44, 0.05, 0, dh / 2 - 0.28], [0.05, 0.4, -0.2, dh / 2 - 0.1], [0.05, 0.4, 0.2, dh / 2 - 0.1], [0.03, 0.34, 0, dh / 2 - 0.1]]) gD.add(mk(new THREE.BoxGeometry(ww, hh, 0.04).translate(xx, yy, 0.03), edge));
    const rL = V3(-dw / 2 - 0.08, dh - 0.14, 0.08), rR = V3(dw / 2 + 0.08, dh - 0.14, 0.08), rT = V3(0, dh + 0.24, 0.08), bL = V3(-dw / 2 - 0.08, dh - 0.14, -dd), bR = V3(dw / 2 + 0.08, dh - 0.14, -dd), bT = V3(0, dh + 0.24, -dd);
    gD.add(roofFace([rL, rT, bT, bL], roofM)); gD.add(roofFace([rT, rR, bR, bT], roofM));
    const tg = new THREE.BufferGeometry().setFromPoints([V3(-dw / 2, dh - 0.12, 0), V3(dw / 2, dh - 0.12, 0), V3(0, dh + 0.2, 0)]); tg.computeVertexNormals(); gD.add(mk(tg, smat('oldplank', '#6e4a30', { side: THREE.DoubleSide })));
    gD.position.set(dx, dy, dz); o.add(gD); }
  // cata-vento de javali no cume
  { const iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 }), sh = new THREE.Shape();
    sh.moveTo(-0.3, 0); sh.lineTo(-0.26, 0.1); sh.lineTo(-0.18, 0.16); sh.lineTo(0.12, 0.17); sh.lineTo(0.2, 0.22); sh.lineTo(0.22, 0.15); sh.lineTo(0.34, 0.08); sh.lineTo(0.36, 0.02); sh.lineTo(0.26, 0.0); sh.lineTo(0.22, -0.08); sh.lineTo(0.16, -0.08); sh.lineTo(0.12, 0); sh.lineTo(-0.14, 0); sh.lineTo(-0.18, -0.08); sh.lineTo(-0.24, -0.08); sh.closePath();
    const v = grp(mk(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 5).translate(0, 0.27, 0), iron), mk(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }).translate(0, 0.5, -0.01), iron));
    for (const a of [0, Math.PI / 2]) v.add(mk(new THREE.BoxGeometry(0.32, 0.012, 0.012).rotateY(a).translate(0, 0.3, 0), iron));
    v.rotation.y = 0.5; v.position.set(W2 / 2, top, zm); o.add(v); }
}
// pousada: varanda coberta na frente, placas do javali, cabeça de javali sobre a porta, janelas com floreira
function mHotelFacade(o, b, H, night, trimM) {
  const w = b.w, h = b.h, dX = doorCol(b) + 0.5, iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 }), wood = smat('wood', '#5a3a20', { bump: 1 });
  const glassH = night ? smat(null, '#ffd890', { emissive: '#ffb850', ei: 1.6, rough: 0.3 }) : smat(null, '#24323e', { rough: 0.08, metal: 0.4 }), frame = smat('wood', '#3a2212'), shut = smat('wood', '#6a2a22', { bump: 1 });
  const flowers = ['#d84a4a', '#f2d24a', '#e88ad0', '#ffffff', '#8a6ad8'];
  const winH = (x, z, ry) => { const g2 = grp(), y0 = 1.32; g2.add(mk(new THREE.BoxGeometry(0.44, 0.48, 0.03).translate(0, y0, 0.02), glassH)); for (const [ww2, hh2, xx, yy] of [[0.52, 0.06, 0, y0 + 0.27], [0.52, 0.06, 0, y0 - 0.27], [0.06, 0.56, -0.24, y0], [0.06, 0.56, 0.24, y0], [0.04, 0.48, 0, y0], [0.44, 0.03, 0, y0]]) g2.add(mk(new THREE.BoxGeometry(ww2, hh2, 0.06).translate(xx, yy, 0.04), frame));
    for (const s2 of [-1, 1]) g2.add(mk(new THREE.BoxGeometry(0.22, 0.54, 0.03).translate(s2 * 0.39, y0, 0.05), shut));
    g2.add(mk(new THREE.BoxGeometry(0.58, 0.12, 0.16).translate(0, y0 - 0.38, 0.1), frame)); for (let k = 0; k < 5; k++) g2.add(mk(new THREE.SphereGeometry(0.05, 6, 5).translate(-0.22 + k * 0.11, y0 - 0.28, 0.1), smat(null, flowers[(k + Math.round(x * 3 + z)) % 5])));
    g2.rotation.y = ry; g2.position.set(x, 0, z); o.add(g2); };
  for (const x of [0.9, 2.5]) winH(x, h + 0.02, 0);                                  // frente (fora da varanda)
  winH(4.3, h + 0.02, 0);                                                             // debaixo da varanda
  for (const z of [1.2, 3.5, 5.8]) winH(-0.02, z, -Math.PI / 2);                     // lado que a câmera vê
  for (const x of [1.2, 3.5, 5.8]) winH(x, -0.02, Math.PI);                          // fundos
  // varanda coberta: telhadinho de uma água sobre a entrada, postes, guarda-corpo e banco
  const px0 = 3.3, px1 = w + 0.05, pd = 0.9, y1 = H - 0.12, y2 = H - 0.55, pM = smat('shingle', '#6a3e28', { bump: 1.4, side: THREE.DoubleSide });
  o.add(roofFace([V3(px0, y1, h), V3(px1, y1, h), V3(px1, y2, h + pd + 0.12), V3(px0, y2, h + pd + 0.12)], pM));
  o.add(limb(V3(px0, y2 - 0.02, h + pd + 0.12), V3(px1, y2 - 0.02, h + pd + 0.12), 0.04, 0.04, frame, 4));
  for (const x of [px0 + 0.08, 5.15, px1 - 0.08]) { o.add(wbox(0.1, y2, 0.1, x, y2 / 2, h + pd, wood, 1)); o.add(wbox(0.18, 0.08, 0.18, x, 0.04, h + pd, smat('stoneblock', '#8e887a'), 1)); o.add(limb(V3(x, y2 - 0.3, h + pd), V3(x, y2 - 0.02, h + pd - 0.3), 0.025, 0.025, wood, 4)); }
  o.add(wbox(5.15 - px0 - 0.1, 0.06, 0.05, (px0 + 5.15) / 2, 0.55, h + pd, wood, 1)); for (let k = 1; k < 6; k++) o.add(wbox(0.04, 0.5, 0.04, px0 + k * (5.15 - px0) / 6, 0.3, h + pd, wood, 1));
  o.add(wbox(px1 - px0 + 0.1, 0.06, pd, (px0 + px1) / 2, 0.03, h + pd / 2, smat('oldplank', '#7a5434'), 1));   // assoalho da varanda
  { const bn = grp(wbox(1.0, 0.06, 0.3, 0, 0.4, 0, wood, 1), wbox(0.06, 0.4, 0.26, -0.44, 0.2, 0, wood, 1), wbox(0.06, 0.4, 0.26, 0.44, 0.2, 0, wood, 1)); bn.position.set(4.25, 0, h + 0.3); o.add(bn); }
  { const br = mBarrel(); br.scale.setScalar(0.7); br.position.set(2.0, 0, h + 0.35); o.add(br); }
  // lampião pendurado na varanda
  { const lp = grp(mk(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 4).translate(0, -0.12, 0), iron), mk(new THREE.BoxGeometry(0.15, 0.2, 0.15).translate(0, -0.35, 0), smat(null, '#ffd890', { emissive: '#ffbb60', ei: night ? 2 : 0.7 })), mk(new THREE.ConeGeometry(0.12, 0.08, 4).rotateY(Math.PI / 4).translate(0, -0.22, 0), iron)); lp.position.set(dX - 0.55, y2 + 0.05, h + pd * 0.6); o.add(lp); }
  // placa do Javali Magro: no lado que a câmera vê e na quina da varanda
  const sg = grp(); sg.add(mk(new THREE.BoxGeometry(0.05, 0.05, 0.62).translate(0, 0, 0.3), iron)); for (const z of [0.2, 0.52]) sg.add(mk(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4).translate(0, -0.06, z), iron));
  sg.add(mk(new THREE.BoxGeometry(0.03, 0.42, 0.48).translate(0, -0.33, 0.36), [smat('boarsign', '#ffffff', { bump: 0.6 }), smat('boarsign', '#ffffff', { bump: 0.6 }), wood, wood, wood, wood]));
  const s1 = sg.clone(); s1.rotation.y = -Math.PI / 2; s1.position.set(-0.02, 1.95, h - 0.9); o.add(s1);
  const s2 = sg.clone(); s2.rotation.y = Math.PI / 2; s2.position.set(px0 - 0.1, y2 - 0.05, h + pd); s2.scale.setScalar(0.85); o.add(s2);
  // cabeça de javali num escudo de madeira sobre a porta
  { const hd = grp(), fur = smat('cloth', '#4a3020', { bump: 1.4 }), tusk = smat(null, '#f2ead8', { rough: 0.4 });
    hd.add(mk(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 7).rotateX(Math.PI / 2), smat('wood', '#7a5434')));
    hd.add(mk(new THREE.SphereGeometry(0.15, 10, 8).scale(1, 0.9, 1.1).translate(0, 0, 0.12), fur)); hd.add(mk(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8).rotateX(Math.PI / 2).translate(0, -0.04, 0.27), fur));
    hd.add(mk(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 10).rotateX(Math.PI / 2).translate(0, -0.04, 0.355), smat(null, '#3a2018')));
    for (const s3 of [-1, 1]) { hd.add(mk(new THREE.ConeGeometry(0.02, 0.12, 5).rotateZ(-s3 * 0.4).translate(s3 * 0.08, 0.0, 0.3), tusk)); hd.add(mk(new THREE.ConeGeometry(0.05, 0.1, 5).rotateZ(s3 * 0.5).translate(s3 * 0.11, 0.14, 0.08), fur)); hd.add(mk(new THREE.SphereGeometry(0.018, 6, 5).translate(s3 * 0.06, 0.05, 0.24), smat(null, '#100806'))); }
    hd.position.set(dX, H - 0.42, h + 0.05); o.add(hd); }
  // lenha empilhada no lado da câmera
  { const lw = grp(); for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - (r ? 1 : 0); k++) lw.add(mk(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 7).rotateX(Math.PI / 2).translate(-0.22 + k * 0.15 + r * 0.07, 0.08 + r * 0.13, 0), smat('bark', '#6a4a30'))); lw.rotation.y = Math.PI / 2; lw.position.set(-0.3, 0, 2.3); o.add(lw); }
}
// padaria: forno de pedra em cúpula, vitrine de pães com toldo listrado, sacos de farinha e cestos de pão, pão dourado pendurado
function mBakeryFacade(o, b, H, night, trimM) {
  const w = b.w, h = b.h, dX = doorCol(b) + 0.5, iron = IRON(), stone = smat('stoneblock', '#a89a84', { bump: 1.6 }), crust = smat(null, '#c27a32', { rough: 0.6 }), crust2 = smat(null, '#9a5a22', { rough: 0.6 }), pale = smat(null, '#e0b46a', { rough: 0.7 });
  const loaf = (g2, x, y, z, k) => { const t = k % 3; if (t === 0) g2.add(mk(new THREE.SphereGeometry(0.09, 10, 7).scale(1.5, 0.75, 0.9).translate(x, y, z), crust)); else if (t === 1) g2.add(mk(new THREE.SphereGeometry(0.08, 10, 7).scale(1, 0.7, 1).translate(x, y, z), crust2)); else g2.add(mk(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8).rotateZ(Math.PI / 2).translate(x, y, z), pale)); };
  // forno de cúpula encostado na parede do lado da câmera, com boca acesa e chaminé
  { const ov = grp(), ox = -0.55, oz = 1.25, r = 0.62;
    ov.add(mk(new THREE.CylinderGeometry(r + 0.08, r + 0.12, 0.5, 18).translate(0, 0.25, 0), stone));
    ov.add(mk(jitter(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0.02, 7).translate(0, 0.5, 0), stone));
    ov.add(mk(new THREE.TorusGeometry(0.22, 0.05, 6, 14, Math.PI).rotateY(-Math.PI / 2).translate(-r + 0.04, 0.5, 0), smat('stoneblock', '#7a6e5e')));
    ov.add(mk(new THREE.CircleGeometry(0.19, 14, 0, Math.PI).rotateY(-Math.PI / 2).translate(-r - 0.01, 0.5, 0), smat(null, '#ff8a2a', { emissive: '#ff6a10', ei: night ? 2.2 : 1.2 })));
    ov.add(mk(new THREE.CylinderGeometry(0.1, 0.13, H * 0.62, 10).translate(0.02, H * 0.31 + 0.85, -0.2), smat('brick', '#8a7a68', { bump: 1.4 }))); ov.add(mk(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 10).translate(0.02, H * 0.62 + 0.88, -0.2), smat('stoneblock', '#6a6258')));
    ov.add(mk(new THREE.BoxGeometry(0.5, 0.05, 0.3).translate(-r - 0.1, 0.48, 0.0), smat('stoneblock', '#8e8270')));   // soleira
    for (let k = 0; k < 6; k++) ov.add(mk(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6).rotateZ(Math.PI / 2).translate(-0.1 + (k % 3) * 0.02, 0.06 + Math.floor(k / 3) * 0.1, 0.62 + (k % 3) * 0.1), smat('bark', '#6a4a30')));   // lenha
    { const pl = grp(mk(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 5), smat('wood', '#8a6440')), mk(new THREE.BoxGeometry(0.02, 0.18, 0.26).translate(0, -0.6, 0), smat('wood', '#8a6440'))); pl.rotation.z = 0.25; pl.position.set(-r - 0.25, 0.55, -0.45); ov.add(pl); }   // pá de forno
    ov.position.set(ox, 0, oz); o.add(ov); }
  // vitrine de pães na frente, ao lado da porta, com toldo listrado creme e marrom
  { const vx = dX - 1.55, gV = grp(), wd = 1.3, ht = 0.75, y0 = 0.5;
    gV.add(wbox(wd + 0.16, 0.1, 0.5, 0, y0 - 0.05, 0.2, trimM, 2)); gV.add(wbox(wd + 0.16, 0.08, 0.5, 0, y0 + ht + 0.04, 0.2, trimM, 2));
    for (const ex of [-wd / 2 - 0.04, wd / 2 + 0.04]) gV.add(wbox(0.08, ht, 0.5, ex, y0 + ht / 2, 0.2, trimM, 2));
    gV.add(mk(new THREE.BoxGeometry(wd, ht, 0.02).translate(0, y0 + ht / 2, 0.44), smat(null, '#c8d8e0', { rough: 0.05, metal: 0.2, transparent: true, opacity: 0.25 }), false));
    gV.add(mk(new THREE.BoxGeometry(wd, ht, 0.02).translate(0, y0 + ht / 2, -0.02), smat(null, '#3a2414')));
    gV.add(wbox(wd, 0.03, 0.4, 0, y0 + 0.36, 0.2, trimM, 2));
    for (let k = 0; k < 8; k++) loaf(gV, -wd / 2 + 0.16 + (k % 4) * (wd - 0.32) / 3, y0 + 0.07 + Math.floor(k / 4) * 0.36, 0.22 + (k % 2) * 0.06, k);
    gV.add(mk(new THREE.PlaneGeometry(wd + 0.4, 0.62).rotateX(-Math.PI / 2 + 0.6).translate(0, y0 + ht + 0.3, 0.46), smat('stripes', '#f0d8a8', { side: THREE.DoubleSide, bump: 0.3 })));
    for (let k = 0; k < 8; k++) gV.add(mk(new THREE.ConeGeometry(0.06, 0.1, 3).rotateX(Math.PI).translate(-wd / 2 - 0.15 + k * (wd + 0.3) / 7, y0 + ht + 0.06, 0.72), smat('cloth', k % 2 ? '#7a4a22' : '#f0e2c0')));
    gV.position.set(Math.max(0.85, vx), 0, h + 0.01); gV.scale.setScalar(0.85); o.add(gV); }
  // sacos de farinha e cestos de pão na porta
  for (const [x, z, s] of [[dX + 0.62, h + 0.25, 1], [dX + 0.82, h + 0.5, 0.85], [dX + 0.6, h + 0.6, 0.75]]) { const sk = grp(mk(new THREE.SphereGeometry(0.17, 10, 8).scale(1, 1.25, 0.9).translate(0, 0.2, 0), smat('cloth', '#ece4cc', { bump: 1 })), mk(new THREE.CylinderGeometry(0.04, 0.07, 0.08, 8).translate(0, 0.43, 0), smat('cloth', '#d8ccae')), mk(new THREE.TorusGeometry(0.05, 0.012, 4, 10).rotateX(Math.PI / 2).translate(0, 0.4, 0), smat(null, '#8a6a3a'))); sk.scale.setScalar(s); sk.position.set(x, 0, z); o.add(sk); }
  for (const [x, z] of [[dX - 0.6, h + 0.32], [dX + 0.2, h + 0.62]]) { const bk = grp(mk(new THREE.CylinderGeometry(0.17, 0.13, 0.2, 12, 1, true).translate(0, 0.1, 0), smat('wood', '#b08840', { side: THREE.DoubleSide }))); for (let k = 0; k < 4; k++) loaf(bk, Math.cos(k * 1.6) * 0.06, 0.2, Math.sin(k * 1.6) * 0.06, k); bk.position.set(x, 0, z); o.add(bk); }
  // pão dourado pendurado (na frente e no lado que a câmera vê)
  const sg = grp(); sg.add(mk(new THREE.BoxGeometry(0.04, 0.04, 0.62).translate(0, 0, 0.3), iron)); sg.add(mk(new THREE.TorusGeometry(0.1, 0.012, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(0, -0.04, 0.5), iron));
  const gold = smat(null, '#e0a83a', { metal: 0.55, rough: 0.35, emissive: '#5a3a08', ei: night ? 0.5 : 0.15 }); sg.add(mk(new THREE.SphereGeometry(0.24, 14, 10).scale(1.5, 0.75, 0.85).translate(0, -0.3, 0.5), gold));
  for (let k = 0; k < 3; k++) sg.add(mk(new THREE.BoxGeometry(0.03, 0.02, 0.22).rotateY(0.35).translate(-0.14 + k * 0.14, -0.13, 0.5), smat(null, '#8a5a1a')));
  sg.position.set(Math.min(w - 0.3, dX + 0.9), 1.85, h + 0.02); o.add(sg);
  const s2 = sg.clone(); s2.rotation.y = -Math.PI / 2; s2.position.set(-0.02, 1.85, h - 0.2); o.add(s2);
  // lampião da porta
  { const lp = grp(mk(new THREE.BoxGeometry(0.04, 0.04, 0.22).translate(0, 0, 0.11), iron), mk(new THREE.BoxGeometry(0.13, 0.19, 0.13).translate(0, -0.11, 0.22), smat(null, '#ffd890', { emissive: '#ffbb60', ei: night ? 1.6 : 0.5 }))); lp.position.set(dX - 0.5, 1.45, h + 0.02); lp.scale.setScalar(0.75); o.add(lp); }
}
// escada externa de madeira encostada na parede do lado: degraus, patamar com guarda-corpo, porta no andar de cima e lanterna
function mExtStair(o, b, s, fh, f, night) {
  const R = s.ext > 0, x0 = R ? b.w : 0, sg = R ? 1 : -1, D = b.h, y0 = f * fh, wood = smat('wood', '#6a4a2c', { bump: 1.2 }), tread = smat('wood', '#8a6038', { bump: 1 }), post = smat('wood', '#4a3020'), iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 });
  const zBot = D - 0.95, zTop = D - 2.25, n = 9, sw = 0.82, xc = x0 + sg * (sw / 2 + 0.04);
  for (let k = 0; k < n; k++) { const z = zBot - (k + 0.5) * (zBot - zTop) / n, y = y0 + (k + 1) * fh / n; o.add(wbox(sw, 0.06, (zBot - zTop) / n + 0.03, xc, y, z, tread, 2)); o.add(wbox(sw, y - y0 - 0.03, 0.04, xc, y0 + (y - y0) / 2, z + (zBot - zTop) / n / 2 - 0.02, wood, 2)); }   // degraus e espelhos
  const xo = x0 + sg * (sw + 0.06);
  o.add(limb(V3(xo, y0 + 0.05, zBot), V3(xo, y0 + fh, zTop), 0.05, 0.05, wood, 4));   // banzo de fora
  o.add(limb(V3(xo, y0 + 0.9, zBot), V3(xo, y0 + fh + 0.9, zTop), 0.03, 0.03, post, 4));   // corrimão
  for (let k = 0; k <= 4; k++) { const t = k / 4, z = zBot + (zTop - zBot) * t, y = y0 + fh * t; o.add(wbox(0.05, 0.9, 0.05, xo, y + 0.45, z, post, 2)); }
  // patamar sobre pilares, guarda-corpo e porta
  const zA = zTop, zB = D - 3 + 0.02, pz = (zA + zB) / 2, pd = zA - zB;
  o.add(wbox(sw + 0.1, 0.08, pd, xc + sg * 0.03, y0 + fh, pz, tread, 2));
  for (const z of [zA, zB]) { o.add(wbox(0.1, fh, 0.1, xo, y0 + fh / 2, z, post, 1)); o.add(wbox(0.18, 0.06, 0.18, xo, y0 + 0.03, z, smat('stoneblock', '#8e887a'), 1)); }
  o.add(wbox(0.04, 0.06, pd, xo, y0 + fh + 0.9, pz, post, 2)); o.add(wbox(sw + 0.08, 0.06, 0.04, xc + sg * 0.02, y0 + fh + 0.9, zB, post, 2));
  for (let k = 0; k <= 3; k++) o.add(wbox(0.04, 0.88, 0.04, xo, y0 + fh + 0.45, zB + k * pd / 3, post, 2)); for (let k = 1; k <= 3; k++) o.add(wbox(0.04, 0.88, 0.04, x0 + sg * k * sw / 4, y0 + fh + 0.45, zB, post, 2));
  { const gd = grp(), dz = s.trig[1] + 0.5, dw = 0.62, dh = Math.min(1.25, fh - 0.25), dm = smat('wood', '#5a3a20', { bump: 1.4 });
    gd.add(wbox(dw + 0.12, dh + 0.08, 0.06, 0, dh / 2, 0, smat('wood', '#3a2212'), 1)); gd.add(wbox(dw, dh, 0.04, 0, dh / 2, 0.03, dm, 1));
    for (const y of [0.22, dh - 0.22]) gd.add(mk(new THREE.BoxGeometry(dw * 0.9, 0.04, 0.02).translate(0, y, 0.06), iron));
    gd.add(mk(new THREE.SphereGeometry(0.03, 8, 6).translate(dw * 0.3, dh * 0.5, 0.07), smat(null, '#c9a24a', { metal: 1, rough: 0.3 })));
    gd.rotation.y = R ? Math.PI / 2 : -Math.PI / 2; gd.position.set(x0 + sg * 0.02, y0 + fh + 0.04, dz); o.add(gd);
    const lp = grp(mk(new THREE.BoxGeometry(0.2, 0.04, 0.04).translate(0.1, 0, 0), iron), mk(new THREE.BoxGeometry(0.13, 0.19, 0.13).translate(0.2, -0.13, 0), smat(null, '#ffd890', { emissive: '#ffbb60', ei: night ? 1.6 : 0.5 }))); lp.rotation.y = R ? 0 : Math.PI; lp.position.set(x0 + sg * 0.02, y0 + fh + dh + 0.12, dz - 0.5); o.add(lp); }
}
// faces que a câmera vê (no quadro local, com a porta em F = z=h): F frente, R direita (x=w), L esquerda (x=0), B fundo (z=0)
function camFaces(b) { const d = b.realDoor || 'S'; return d === 'S' ? ['F', 'R'] : d === 'E' ? ['F', 'L'] : d === 'W' ? ['R', 'B'] : ['L', 'B']; }
const faceLen = (f, w, h) => f === 'F' || f === 'B' ? w : h;
function onFace(o, g, f, u, w, h, y = 0) { if (f === 'F') g.position.set(u, y, h + 0.01); else if (f === 'B') { g.position.set(w - u, y, -0.01); g.rotation.y = Math.PI; } else if (f === 'R') { g.position.set(w + 0.01, y, h - u); g.rotation.y = Math.PI / 2; } else { g.position.set(-0.01, y, u); g.rotation.y = -Math.PI / 2; } o.add(g); return g; }
// Arcanos & Varinhas: estreita, alta e um pouco torta; madeira quase preta, letreiro dourado descascado, janelinhas de vidro grosso e a vitrine com uma única varinha numa almofada de veludo roxo
function mArcaneFacade(o, b, H, night, trimM) {
  const w = b.w, h = b.h, dX = doorCol(b) + 0.5, gold = smat(null, '#b8923a', { metal: 0.8, rough: 0.45 }), dark = smat('wood', '#241812', { bump: 1.2 }), velvet = smat('cloth', '#4a1a5a', { bump: 0.6 });
  const glassT = night ? smat(null, '#ffd890', { emissive: '#ffb850', ei: 1.2, rough: 0.3 }) : smat(null, '#3a4a3a', { rough: 0.1, metal: 0.3, transparent: true, opacity: 0.8 });
  // letreiro comprido: tábua escura com moldura dourada gasta, uma varinha dourada e manchas de ouro descascado
  const sign = () => { const g = grp(); g.add(wbox(1.7, 0.36, 0.06, 0, 0, 0.03, dark, 2)); for (const [ww, hh, x, y] of [[1.76, 0.04, 0, 0.2], [1.76, 0.04, 0, -0.2], [0.04, 0.42, -0.88, 0], [0.04, 0.42, 0.88, 0]]) g.add(mk(new THREE.BoxGeometry(ww, hh, 0.05).translate(x, y, 0.05), gold));
    g.add(limb(V3(-0.6, -0.05, 0.08), V3(0.55, 0.06, 0.08), 0.022, 0.012, gold, 6)); g.add(mk(new THREE.SphereGeometry(0.04, 8, 6).translate(0.58, 0.07, 0.08), smat(null, '#fff0c0', { emissive: '#ffd060', ei: night ? 2 : 0.8 })));
    for (let k = 0; k < 9; k++) g.add(mk(new THREE.BoxGeometry(0.05 + (k % 3) * 0.03, 0.015, 0.01).translate(-0.7 + k * 0.17, -0.12 + (k % 2) * 0.05, 0.065), gold));   // letras gastas
    g.rotation.z = 0.05; return g; };
  // janelinha de vidro grosso (fundos de garrafa), torta
  const bottle = (tilt) => { const g = grp(); g.add(wbox(0.5, 0.56, 0.06, 0, 0, 0.02, dark, 2)); for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { g.add(mk(new THREE.CircleGeometry(0.1, 10).translate(-0.1 + c * 0.2, -0.17 + r * 0.17, 0.056), glassT)); g.add(mk(new THREE.TorusGeometry(0.1, 0.018, 4, 10).translate(-0.1 + c * 0.2, -0.17 + r * 0.17, 0.058), smat(null, '#2a3a2a', { rough: 0.2 }))); } g.rotation.z = tilt; return g; };
  // vitrine: uma varinha numa almofada de veludo roxo, sob vidro
  const vitrine = () => { const g = grp(), wd = 1.0, ht = 0.8, y0 = 0.5; g.add(wbox(wd + 0.14, 0.1, 0.42, 0, y0 - 0.05, 0.15, dark, 2)); g.add(wbox(wd + 0.14, 0.1, 0.42, 0, y0 + ht + 0.05, 0.15, dark, 2));
    for (const ex of [-wd / 2 - 0.04, wd / 2 + 0.04]) g.add(wbox(0.08, ht, 0.42, ex, y0 + ht / 2, 0.15, dark, 2));
    g.add(mk(new THREE.BoxGeometry(wd, ht, 0.02).translate(0, y0 + ht / 2, -0.02), smat(null, '#140c0a')));
    g.add(mk(new THREE.BoxGeometry(0.5, 0.08, 0.26).translate(0, y0 + 0.25, 0.14), velvet)); for (const sx of [-0.25, 0.25]) for (const sz of [0.01, 0.27]) g.add(mk(new THREE.SphereGeometry(0.025, 6, 5).translate(sx, y0 + 0.29, sz), gold));
    g.add(limb(V3(-0.2, y0 + 0.31, 0.14), V3(0.18, y0 + 0.31, 0.14), 0.016, 0.01, smat('wood', '#5a3a22'), 6)); g.add(mk(new THREE.SphereGeometry(0.05, 10, 8).translate(0, y0 + 0.62, 0.14), smat(null, '#fff4d8', { emissive: '#ffcc66', ei: night ? 1.6 : 0.5, transparent: true, opacity: 0.8 })));
    g.add(mk(new THREE.BoxGeometry(wd, ht, 0.02).translate(0, y0 + ht / 2, 0.34), smat(null, '#9ab0a0', { rough: 0.05, metal: 0.3, transparent: true, opacity: 0.28 }), false));
    for (let k = 0; k < 4; k++) g.add(mk(new THREE.BoxGeometry(0.16, 0.05, 0.08).translate(-0.38 + (k % 2) * 0.06, y0 + 0.04 + k * 0.05, 0.05 + (k % 2) * 0.04), smat('wood', ['#6a4a2c', '#3a2418', '#8a6a3a', '#4a2e1a'][k])));   // caixinhas empilhadas
    return g; };
  // na frente: letreiro sobre a porta e vitrine ao lado; nas faces que a câmera vê: letreiro, vitrine e janelinhas
  onFace(o, sign(), 'F', dX, w, h, Math.min(H - 0.45, 2.3)); onFace(o, vitrine(), 'F', dX + 1.45 < w - 0.5 ? dX + 1.45 : dX - 1.45, w, h).scale.setScalar(0.85);
  for (const f of camFaces(b)) { if (f === 'F') continue; const L = faceLen(f, w, h); onFace(o, sign(), f, L * 0.5, w, h, Math.min(H - 0.45, 2.3)); onFace(o, vitrine(), f, L * 0.3, w, h).scale.setScalar(0.85); onFace(o, bottle(0.07), f, L * 0.78, w, h, 1.3); onFace(o, bottle(-0.06), f, L * 0.6, w, h, H - 0.75); onFace(o, bottle(0.05), f, L * 0.22, w, h, H - 0.7); }
  for (const u of [0.6, w - 0.6]) if (Math.abs(u - dX) > 0.9) onFace(o, bottle(u < dX ? -0.08 : 0.06), 'F', u, w, h, H - 0.75);
  // chaminé torta e lampião esverdeado na porta
  { const ch = wbox(0.34, 1.2, 0.34, 0, 0.6, 0, smat('brick', '#3a3430', { bump: 1.4 }), 2); const cg = grp(ch, wbox(0.44, 0.08, 0.44, 0, 1.22, 0, smat('stoneblock', '#2a2622'), 2)); cg.rotation.z = 0.12; cg.rotation.x = -0.06; cg.position.set(w * 0.72, H + 0.4, h * 0.35); o.add(cg); }
  { const lp = grp(mk(new THREE.BoxGeometry(0.04, 0.04, 0.22).translate(0, 0, 0.11), gold), mk(new THREE.BoxGeometry(0.13, 0.2, 0.13).translate(0, -0.12, 0.22), smat(null, '#c8f0c0', { emissive: '#8ad890', ei: night ? 1.8 : 0.6 }))); lp.position.set(dX - 0.6, 1.5, h + 0.02); lp.scale.setScalar(0.75); o.add(lp); }
}
// Alfaiataria Real: roxo-ameixa e dourado, pilastras douradas, vitrines grandes com manequins (capas, mantos e um vestido de baile que brilha), toldo listrado e um carretel dourado no letreiro
function mTailorFacade(o, b, H, night, trimM) {
  const w = b.w, h = b.h, dX = doorCol(b) + 0.5, gold = smat(null, '#d4a94a', { metal: 0.9, rough: 0.3 });
  // faixas douradas no topo e no rodapé e pilastras nos cantos
  for (const [ww, dd, x, z] of [[w + 0.08, 0.08, w / 2, h + 0.02], [w + 0.08, 0.08, w / 2, -0.02], [0.08, h + 0.08, w + 0.02, h / 2], [0.08, h + 0.08, -0.02, h / 2]]) { o.add(mk(new THREE.BoxGeometry(ww, 0.12, dd).translate(x, H - 0.12, z), gold)); o.add(mk(new THREE.BoxGeometry(ww, 0.08, dd).translate(x, 0.5, z), gold)); }
  for (const [x, z] of [[0.04, h + 0.04], [w + 0.04, h + 0.04], [w + 0.04, 0.04], [0.04, 0.04]]) o.add(mk(new THREE.BoxGeometry(0.16, H, 0.16).translate(x, H / 2, z), smat('wood', '#5e2c52', { bump: 0.8 })));   // pilastras ameixa sobre a parede bege
  const mannequin = (x, col, glow) => { const g = grp(); g.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6).translate(x, 0.75, 0.15), gold)); g.add(mk(new THREE.CylinderGeometry(0.11, 0.08, 0.36, 10).translate(x, 1.15, 0.15), smat('cloth', '#e8dcc0')));
    g.add(mk(new THREE.SphereGeometry(0.07, 10, 8).translate(x, 1.4, 0.15), smat(null, '#e8dcc0')));
    g.add(mk(new THREE.ConeGeometry(glow ? 0.26 : 0.2, glow ? 0.85 : 0.75, 14, 1, true).translate(x, glow ? 0.85 : 0.92, 0.15), smat('cloth', col, { side: THREE.DoubleSide, emissive: glow ? '#e8c8f0' : undefined, ei: glow ? (night ? 1.2 : 0.45) : 0 })));
    if (!glow) g.add(mk(new THREE.CylinderGeometry(0.14, 0.24, 0.6, 12, 1, true, Math.PI * 0.15, Math.PI * 1.7).translate(x, 1.05, 0.13), smat('cloth', shadeH(col, -0.2), { side: THREE.DoubleSide }))); return g; };
  const vitrine = (cols) => { const g = grp(), wd = 1.5, ht = 1.2, y0 = 0.55;
    for (const [ww, hh, x, y] of [[wd + 0.16, 0.08, 0, y0 - 0.04], [wd + 0.16, 0.08, 0, y0 + ht + 0.04], [0.08, ht, -wd / 2 - 0.04, y0 + ht / 2], [0.08, ht, wd / 2 + 0.04, y0 + ht / 2]]) g.add(mk(new THREE.BoxGeometry(ww, hh, 0.1).translate(x, y, 0.04), gold));
    g.add(mk(new THREE.BoxGeometry(wd, ht, 0.02).translate(0, y0 + ht / 2, -0.02), smat(null, '#2a1424')));
    cols.forEach((c, k) => g.add(mannequin(-0.45 + k * 0.45, c, k === 1 && cols.length === 3)));
    g.add(mk(new THREE.BoxGeometry(wd, ht, 0.02).translate(0, y0 + ht / 2, 0.32), smat(null, '#c8b8d8', { rough: 0.05, metal: 0.2, transparent: true, opacity: 0.22 }), false));
    g.add(mk(new THREE.PlaneGeometry(wd + 0.4, 0.6).rotateX(-Math.PI / 2 + 0.6).translate(0, y0 + ht + 0.32, 0.4), smat('stripes', '#e8b8f0', { side: THREE.DoubleSide, bump: 0.3 })));   // toldo listrado ameixa
    for (let k = 0; k < 9; k++) g.add(mk(new THREE.ConeGeometry(0.05, 0.1, 3).rotateX(Math.PI).translate(-wd / 2 - 0.15 + k * (wd + 0.3) / 8, y0 + ht + 0.06, 0.66), k % 2 ? gold : smat('cloth', '#5e2c52')));
    return g; };
  // carretel dourado com linha e uma agulha atravessada, pendurado num braço de ferro
  const spool = () => { const g = grp(); g.add(mk(new THREE.BoxGeometry(0.04, 0.04, 0.6).translate(0, 0, 0.3), gold));
    const sp = grp(mk(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16).translate(0, 0.16, 0), gold), mk(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16).translate(0, -0.16, 0), gold), mk(new THREE.CylinderGeometry(0.15, 0.15, 0.28, 16), smat('cloth', '#8a2a6a')));
    sp.rotation.x = Math.PI / 2; sp.rotation.z = Math.PI / 2; sp.position.set(0, -0.32, 0.5); g.add(sp);
    g.add(limb(V3(-0.02, -0.05, 0.3), V3(0.02, -0.55, 0.7), 0.012, 0.006, smat(null, '#d8dce4', { metal: 0.9, rough: 0.2 }), 4)); return g; };
  // frente: carretel e vitrine ao lado da porta; faces que a câmera vê: vitrines grandes e o carretel
  onFace(o, spool(), 'F', Math.min(w - 0.3, dX + 0.95), w, h, 2.1);
  onFace(o, vitrine(['#5e2c52', '#1e2a4a']), 'F', dX + 1.5 < w - 0.6 ? dX + 1.5 : dX - 1.5, w, h).scale.setScalar(0.8);
  let k2 = 0; for (const f of camFaces(b)) { if (f === 'F') continue; const L = faceLen(f, w, h); onFace(o, vitrine(k2++ ? ['#1e4a32', '#7a1a1c'] : ['#5e2c52', '#f0e0f8', '#1e2a4a']), f, L * 0.5, w, h).scale.setScalar(0.9); onFace(o, spool(), f, L * 0.88, w, h, 2.1); }
  // moldura dourada na porta e vasos com arbustos podados
  { const gd = grp(); for (const sx of [-0.4, 0.4]) gd.add(mk(new THREE.BoxGeometry(0.06, 1.3, 0.06).translate(sx, 0.65, 0.04), gold)); gd.add(mk(new THREE.TorusGeometry(0.4, 0.03, 5, 14, Math.PI).translate(0, 1.3, 0.04), gold)); onFace(o, gd, 'F', dX, w, h); }
  for (const s2 of [-0.8, 0.8]) { const p = grp(); p.add(mk(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 10).translate(0, 0.15, 0), smat('stoneblock', '#e8e0d4'))); p.add(mk(new THREE.SphereGeometry(0.2, 12, 10).translate(0, 0.5, 0), smat(null, '#2e5a2a', { rough: 0.9 }))); p.position.set(dX + s2, 0, h + 0.3); o.add(p); }
}
// Ronco do Dragão: base alta de pedra e tábuas em cima, portas duplas, janelas redondas de vitral âmbar (uma enorme sobre a porta, fileira no térreo, no andar de cima e na empena),
// dragão de madeira dormindo abraçado num barril na cumeeira, placa do dragão com caneca, bancos e mesas de barril, lampiões, feno e barris
const TAV_BASE = 0.62;
function roundWin(R, night, big) {   // janela redonda: moldura grossa de madeira, vitral âmbar em pedaços e cruz de madeira
  const g = grp(), wood = smat('wood', '#3a2414', { bump: 1.2 });
  g.add(mk(new THREE.TorusGeometry(R, big ? 0.09 : 0.06, 6, 24), wood));
  const cols = ['#e0a040', '#c87a28', '#f0c060', '#b86420'];
  for (let k = 0; k < 8; k++) { const glass = smat(null, cols[k % 4], { emissive: night ? '#ff9a30' : cols[k % 4], ei: night ? 1.5 : 0.18, rough: 0.2, metal: 0.1 }); g.add(mk(new THREE.CircleGeometry(R, 6, k * Math.PI / 4, Math.PI / 4).translate(0, 0, -0.01), glass)); }
  g.add(mk(new THREE.BoxGeometry(R * 2, big ? 0.07 : 0.05, 0.05), wood)); g.add(mk(new THREE.BoxGeometry(big ? 0.07 : 0.05, R * 2, 0.05), wood));
  if (big) g.add(mk(new THREE.TorusGeometry(R * 0.45, 0.03, 5, 18), wood));   // anel de dentro na janela grande
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; g.add(mk(new THREE.BoxGeometry(0.1, 0.14, 0.06).translate(0, R + 0.08, 0).rotateZ(a), smat('stoneblock', '#8e887c'))); }   // aduelas de pedra em volta
  return g;
}
function mSleepDragon() {   // dragão de madeira entalhada (pintura verde desbotada) dormindo, abraçado num barril
  const g = grp(), skin = smat('wood', '#5a7a44', { bump: 1.4 }), belly = smat('wood', '#c8a868', { bump: 1 }), horn = smat(null, '#e8dcc0'), wingM = smat('wood', '#4a6a3a', { bump: 1, side: THREE.DoubleSide });
  g.add(mk(new THREE.SphereGeometry(0.5, 14, 10).scale(1.25, 0.55, 0.62).translate(0, 0.28, 0), skin));                                  // corpo deitado
  g.add(mk(new THREE.SphereGeometry(0.42, 12, 8).scale(1.1, 0.35, 0.45).translate(0.05, 0.16, 0.02), belly));
  g.add(limb(V3(0.5, 0.36, 0), V3(0.85, 0.5, 0.12), 0.16, 0.12, skin, 6));                                                                   // pescoço
  const hd = grp(mk(new THREE.SphereGeometry(0.17, 10, 8).scale(1.2, 0.85, 0.9), skin), mk(new THREE.CylinderGeometry(0.09, 0.13, 0.26, 8).rotateZ(Math.PI / 2).translate(0.22, -0.03, 0), skin));
  for (const z of [-0.08, 0.08]) { hd.add(mk(new THREE.ConeGeometry(0.04, 0.24, 6).rotateZ(-2.1).translate(-0.12, 0.14, z), horn)); hd.add(mk(new THREE.BoxGeometry(0.07, 0.012, 0.03).translate(0.06, 0.06, z * 1.6), smat(null, '#1a120a'))); }   // chifres e olhos fechados
  for (const z of [-0.04, 0.04]) hd.add(mk(new THREE.SphereGeometry(0.018, 5, 4).translate(0.35, 0.0, z), smat(null, '#1a120a')));    // narinas
  hd.position.set(0.95, 0.5, 0.15); hd.rotation.z = -0.25; hd.rotation.y = -0.3; g.add(hd);
  let p0 = V3(-0.55, 0.3, 0); const tail = [[-0.95, 0.22, -0.15], [-1.3, 0.12, -0.05], [-1.55, 0.1, 0.2], [-1.6, 0.14, 0.4]];   // rabo caindo pelo telhado
  tail.forEach(([x, y, z], k) => { const p1 = V3(x, y, z); g.add(limb(p0, p1, 0.13 - k * 0.025, 0.11 - k * 0.025, skin, 6)); p0 = p1; }); g.add(mk(new THREE.ConeGeometry(0.06, 0.16, 4).rotateZ(Math.PI / 2).translate(-1.68, 0.14, 0.48), skin));
  for (let k = 0; k < 7; k++) g.add(mk(new THREE.ConeGeometry(0.045, 0.12, 4).translate(-0.5 + k * 0.17, 0.58 - Math.abs(k - 3) * 0.015, 0), horn));   // espinhos nas costas
  for (const z of [-1, 1]) { const wg = new THREE.BufferGeometry().setFromPoints([V3(0.25, 0.48, z * 0.15), V3(-0.55, 0.5, z * 0.2), V3(-0.25, 0.28, z * 0.42), V3(0.25, 0.48, z * 0.15), V3(-0.25, 0.28, z * 0.42), V3(0.15, 0.3, z * 0.36)]); wg.computeVertexNormals(); g.add(mk(wg, wingM)); }   // asas fechadas
  const br = mBarrel(); br.scale.setScalar(0.42); br.rotation.x = Math.PI / 2; br.position.set(0.55, 0.16, 0.36); g.add(br);           // o barril abraçado
  for (const [x, z] of [[0.42, 0.3], [0.7, 0.3]]) g.add(limb(V3(x, 0.3, z - 0.15), V3(x + 0.05, 0.2, z + 0.2), 0.06, 0.05, skin, 5));     // patas da frente em volta do barril
  for (const z of [-0.28, 0.28]) g.add(limb(V3(-0.35, 0.22, z * 0.6), V3(-0.25, 0.04, z), 0.08, 0.06, skin, 5));                          // patas de trás
  return g;
}
function tudorBand(len, ht, night, k0) {   // faixa Tudor: verga e peitoril de madeira, montantes, travessa, vitral (brasões alternados embaixo, losangos em cima)
  const g = grp(), oak = smat('wood', '#2e2014', { bump: 1.2 }), n = Math.max(2, Math.round(len / 0.34)), pw = len / n, tr = ht * 0.7;
  const glass = kind => smat(kind, '#c4d8ff', { emissive: '#ffcc70', emapKind: { leaded: 'glowmask', vitdragon: 'glowdragon', vitmug: 'glowmug', vitflame: 'glowflame' }[kind], ei: 0.11, rough: 0.08, metal: 0.1 });   /* vidro azulado + luz amarela de dentro */
  for (let k = 0; k < n; k++) { const x = -len / 2 + (k + 0.5) * pw, em = (k + k0) % 2 === 1 ? ['vitdragon', 'vitmug', 'vitflame'][Math.floor((k + k0) / 2) % 3] : 'leaded';
    g.add(mk(new THREE.PlaneGeometry(pw - 0.02, tr - 0.02).translate(x, tr / 2, 0), glass(em)));
    g.add(mk(new THREE.PlaneGeometry(pw - 0.02, ht - tr - 0.02).translate(x, tr + (ht - tr) / 2, 0), glass('leaded'))); }
  for (let k = 0; k <= n; k++) g.add(wbox(k === 0 || k === n ? 0.07 : 0.045, ht, 0.07, -len / 2 + k * pw, ht / 2, 0.02, oak, 1));
  g.add(wbox(len + 0.1, 0.05, 0.07, 0, tr, 0.02, oak, 1));
  g.add(wbox(len + 0.16, 0.09, 0.1, 0, ht + 0.045, 0.03, oak, 1)); g.add(wbox(len + 0.2, 0.06, 0.16, 0, -0.03, 0.06, smat('stoneblock', '#8e887c'), 1));
  return g;
}
function flowerBits(g, n, w, y, z, R) { const cols = ['#e83a5a', '#f0d040', '#d860c8', '#f08a30', '#ffffff']; for (let k = 0; k < n; k++) { const a = k * 2.4; g.add(mk(new THREE.SphereGeometry(0.04, 6, 5).translate((Math.cos(a) * 0.5) * w * (k / n), y + Math.sin(k * 1.7) * 0.03, z + Math.sin(a) * 0.04), smat(null, cols[k % 5], { rough: 0.7 }))); } for (let k = 0; k < n; k++) g.add(mk(new THREE.SphereGeometry(0.045, 6, 5).translate(-w / 2 + (k + 0.5) * w / n, y - 0.04, z - 0.03), smat(null, '#3a7a2a', { rough: 0.8 }))); }
function mTavernFacade(o, b, H, RH, night, trimM) {
  const w = b.w, h = b.h, dX = doorCol(b) + 0.5, iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 }), wood = smat('wood', '#3a2618', { bump: 1.2 }), plank = smat('oldplank', '#7a5434', { bump: 1.2 });
  const stone = smat('stoneblock', '#8a8274', { bump: 1.6 }), capM = smat('stoneblock', '#6e685e', { bump: 1.4 }), fh = H / 2, JD = 0.22, wallM = smat('oldplank', '#6e4a2e', { bump: 1.2 }), DW2 = 0.78;
  // base de pedra baixa, recortada na porta
  const slab = (x0, x1, z, side) => { const L = x1 - x0; if (L < 0.05) return; if (side) { o.add(wbox(0.1, TAV_BASE, L, z, TAV_BASE / 2, (x0 + x1) / 2, stone, 1.2)); o.add(wbox(0.16, 0.08, L + 0.06, z, TAV_BASE + 0.04, (x0 + x1) / 2, capM, 1)); } else { o.add(wbox(L, TAV_BASE, 0.1, (x0 + x1) / 2, TAV_BASE / 2, z, stone, 1.2)); o.add(wbox(L + 0.06, 0.08, 0.16, (x0 + x1) / 2, TAV_BASE + 0.04, z, capM, 1)); } };
  slab(-0.05, dX - DW2, h + 0.03); slab(dX + DW2, w + 0.05, h + 0.03); slab(-0.05, w + 0.05, -0.03); slab(-0.05, h + 0.05, -0.03, true); slab(-0.05, h + 0.05, w + 0.03, true);
  // andar de cima saliente (frente e lateral) com viga de borda e mãos-francesas embaixo
  o.add(wbox(w + JD, H - fh, 0.07, (w - JD) / 2, (H + fh) / 2, h + JD, wallM, 1.2)); o.add(wbox(0.07, H - fh, h + JD, -JD, (H + fh) / 2, (h + JD) / 2, wallM, 1.2));
  o.add(wbox(w + JD + 0.06, 0.12, JD + 0.08, (w - JD) / 2, fh, h + JD / 2, wood, 1)); o.add(wbox(JD + 0.08, 0.12, h + JD + 0.06, -JD / 2, fh, (h + JD) / 2, wood, 1));
  o.add(wbox(w + JD + 0.04, 0.1, 0.1, (w - JD) / 2, H - 0.05, h + JD, wood, 1)); o.add(wbox(0.1, 0.1, h + JD + 0.04, -JD, H - 0.05, (h + JD) / 2, wood, 1));
  for (let k = 0; k <= 4; k++) { const x = k * w / 4; o.add(limb(V3(x, fh - 0.42, h + 0.04), V3(x, fh - 0.04, h + JD - 0.02), 0.035, 0.035, wood, 4)); }
  for (let k = 0; k <= 4; k++) { const z = k * h / 4; o.add(limb(V3(-0.04, fh - 0.42, z), V3(-JD + 0.02, fh - 0.04, z), 0.035, 0.035, wood, 4)); }
  for (const x of [-JD, w]) o.add(wbox(0.1, H - fh, 0.1, x, (H + fh) / 2, h + JD, wood, 1)); o.add(wbox(0.1, H - fh, 0.1, -JD, (H + fh) / 2, 0, wood, 1));
  // faixas Tudor: térreo dos dois lados da porta, andar de cima inteiro, lateral embaixo e em cima
  const band = (len, ht, x, y, z, ry, k0) => { if (len < 0.5) return; const g = tudorBand(len, ht, night, k0); g.rotation.y = ry; g.position.set(x, y, z); o.add(g); };
  const gy = TAV_BASE + 0.08, gh = fh - gy - 0.2, uy = fh + 0.36, uh = H - fh - 0.66;
  band(dX - DW2 - 0.35, gh, (0.15 + dX - DW2 - 0.2) / 2, gy, h + 0.06, 0, 0); band(w - 0.15 - (dX + DW2 + 0.2), gh, (dX + DW2 + 0.2 + w - 0.15) / 2, gy, h + 0.06, 0, 1);
  band(w + JD - 0.5, uh, (w - JD) / 2, uy, h + JD + 0.05, 0, 0);
  band(h - 0.5, gh, -0.06, gy, h / 2, -Math.PI / 2, 1); band(h + JD - 0.5, uh, -JD - 0.05, uy, (h + JD) / 2, -Math.PI / 2, 0);
  // faixa escura com o nome em dourado, entre o térreo e o saliente
  o.add(mk(new THREE.PlaneGeometry(w + JD - 0.4, 0.22).translate((w - JD) / 2, fh + 0.18, h + JD + 0.045), smat('fascia', '#ffffff', { bump: 0.3 })));   /* nome na frente do saliente */
  // floreiras no peitoril do térreo e cestos de flores pendurados
  const box = (x0, x1, z, side) => { const L = x1 - x0; if (L < 0.4) return; const g = grp(wbox(L, 0.14, 0.16, 0, 0, 0, plank, 1)); flowerBits(g, Math.round(L * 9), L, 0.1, 0.02); if (side) { g.rotation.y = -Math.PI / 2; g.position.set(-0.14, gy - 0.12, (x0 + x1) / 2); } else g.position.set((x0 + x1) / 2, gy - 0.12, z); o.add(g); };
  box(0.2, dX - DW2 - 0.25, h + 0.16); box(dX + DW2 + 0.25, w - 0.2, h + 0.16); box(0.3, h - 0.3, 0, true);
  const basket = (x, z, ry) => { const g = grp(wbox(0.03, 0.03, 0.34, 0, 0, 0.17, iron, 1), mk(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 3).translate(0, -0.1, 0.32), iron), mk(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -0.2, 0.32), smat('wood', '#6a4a2a')));
    flowerBits(g, 14, 0.22, -0.18, 0.32); for (let k = 0; k < 6; k++) g.add(mk(new THREE.SphereGeometry(0.035, 5, 4).translate(Math.cos(k) * 0.1, -0.3 - (k % 3) * 0.05, 0.32 + Math.sin(k) * 0.1), smat(null, '#3a7a2a'))); g.rotation.y = ry; g.position.set(x, fh - 0.3, z); o.add(g); };
  basket(0.1, h + 0.06, 0); basket(w - 0.1, h + 0.06, 0); basket(-0.06, h * 0.33, -Math.PI / 2); basket(-0.06, h * 0.7, -Math.PI / 2);
  // porta em arco Tudor: moldura de pedra, folha de carvalho com cravos de ferro, degrau e lampião em cima
  { const g = grp(), dw = 1.0, dh = 1.32, ah = 0.3, arch = (W, Hh, A) => { const sh = new THREE.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(-W / 2, Hh); sh.quadraticCurveTo(-W / 2 + 0.02, Hh + A * 0.9, -W * 0.18, Hh + A * 0.96); sh.lineTo(0, Hh + A); sh.lineTo(W * 0.18, Hh + A * 0.96); sh.quadraticCurveTo(W / 2 - 0.02, Hh + A * 0.9, W / 2, Hh); sh.lineTo(W / 2, 0); sh.lineTo(-W / 2, 0); return sh; };
    const fr = arch(dw + 0.3, dh, ah + 0.07), hole = arch(dw, dh, ah); fr.holes.push(new THREE.Path(hole.getPoints(24).map(p => new THREE.Vector2(p.x, p.y + 0.001))));
    g.add(mk(new THREE.ExtrudeGeometry(fr, { depth: 0.14, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -0.04), stone));
    const leaf = new THREE.ExtrudeGeometry(arch(dw - 0.02, dh, ah - 0.01), { depth: 0.05, bevelEnabled: false, curveSegments: 12 }); g.add(mk(leaf.translate(0, 0, -0.02), smat('oldplank', '#5a3a1e', { bump: 1.4 })));
    for (let k = 1; k < 5; k++) g.add(wbox(0.025, dh + ah * 0.5, 0.02, -dw / 2 + k * dw / 5, (dh + ah * 0.5) / 2, 0.035, smat('wood', '#3a2414'), 1));
    for (const y of [0.32, dh - 0.25]) { g.add(wbox(dw - 0.08, 0.06, 0.02, 0, y, 0.04, iron, 1)); for (let k = 0; k < 6; k++) g.add(mk(new THREE.SphereGeometry(0.018, 5, 4).translate(-dw / 2 + 0.1 + k * (dw - 0.2) / 5, y, 0.055), iron)); }
    g.add(mk(new THREE.TorusGeometry(0.07, 0.014, 5, 12).translate(dw * 0.3, dh * 0.55, 0.06), smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 })));
    g.add(mk(new THREE.BoxGeometry(0.02, dh * 0.9, 0.01).translate(0, dh * 0.45, 0.032), smat(null, '#ffb050', { emissive: '#ff9a30', ei: night ? 1.8 : 0.3 })));   // frestinha de luz no meio
    g.add(wbox(dw + 0.6, 0.1, 0.42, 0, 0.05, 0.2, capM, 1));
    const lp = grp(wbox(0.04, 0.04, 0.26, 0, 0, 0.13, iron, 1), mk(new THREE.BoxGeometry(0.15, 0.2, 0.15).translate(0, -0.13, 0.27), smat(null, '#ffd890', { emissive: '#ffbb60', ei: night ? 2 : 0.6 })), mk(new THREE.ConeGeometry(0.12, 0.1, 4).rotateY(Math.PI / 4).translate(0, 0.02, 0.27), iron)); lp.position.set(dw / 2 + 0.32, dh - 0.05, 0.02); g.add(lp);
    g.position.set(dX, 0, h + 0.05); o.add(g); }
  // beiral grosso de palha
  { const th = smat('thatch', '#b08a48', { bump: 2 }); for (const z of [-0.45, h + 0.45]) o.add(mk(new THREE.CylinderGeometry(0.14, 0.14, w + 0.9, 8).rotateZ(Math.PI / 2).translate(w / 2, H + 0.02, z), th)); }
  for (const [x, z] of [[w, h], [w, 0], [0, 0]]) o.add(wbox(0.12, fh - TAV_BASE, 0.12, x, (fh + TAV_BASE) / 2, z, wood, 1));   // montantes das quinas do térreo
  // à noite: manchas de luz colorida dos vitrais no chão da rua
  if (night) { const spot = (x, z, c, sx, sz) => { const m = mk(new THREE.CircleGeometry(0.5, 16).scale(sx, sz, 1).rotateX(-Math.PI / 2).translate(x, 0.015, z), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false })); o.add(m); };
    for (const [x, c] of [[0.6, '#e0a040'], [1.3, '#5ad06a'], [dX + 1.1, '#e05040'], [w - 0.5, '#e0a040'], [w - 1.2, '#5a80e0']]) if (Math.abs(x - dX) > 0.8) spot(x, h + 0.9, c, 0.8, 0.55);
    for (const [z, c] of [[h * 0.25, '#5ad06a'], [h * 0.55, '#e0a040'], [h * 0.82, '#e05040']]) spot(-0.9, z, c, 0.55, 0.8); }
  // o dragão de madeira dormindo na cumeeira
  { const dg = mSleepDragon(), ridgeX = w >= h; dg.scale.setScalar(1.4); if (ridgeX) { dg.position.set(w * 0.62, H + RH - 0.12, h / 2); } else { dg.position.set(w / 2, H + RH - 0.12, h * 0.6); dg.rotation.y = -Math.PI / 2; } o.add(dg); }
  // bancos e mesas de barril
  const bench = (x, z, ry) => { const g = grp(wbox(1.1, 0.06, 0.3, 0, 0.42, 0, plank, 2), wbox(0.06, 0.42, 0.26, -0.48, 0.21, 0, wood, 1), wbox(0.06, 0.42, 0.26, 0.48, 0.21, 0, wood, 1)); g.rotation.y = ry; g.position.set(x, 0, z); o.add(g); };
  const btable = (x, z) => { const br = mBarrel(); br.scale.setScalar(0.85); br.position.set(x, 0, z); o.add(br); o.add(wbox(0.8, 0.06, 0.8, x, 0.86, z, plank, 2)); o.add(mk(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 10).translate(x - 0.12, 0.97, z), smat(null, '#c8a050', { metal: 0.6 }))); o.add(mk(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 10).translate(x + 0.15, 0.97, z + 0.1), smat(null, '#a87a3a'))); };
  bench(dX - 1.75, h + 0.5, 0); btable(dX - 1.75, h + 1.0); bench(dX + 1.8, h + 0.5, 0);
  bench(-0.5, h * 0.38, Math.PI / 2); btable(-1.0, h * 0.38); bench(-0.5, h * 0.7, Math.PI / 2);
  // placa do dragão pendurada na quina da frente, embaixo do saliente
  { const sg = grp(); sg.add(mk(new THREE.BoxGeometry(0.06, 0.06, 1.0).translate(0, 0, 0.5), iron)); for (const z of [0.3, 0.85]) sg.add(mk(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4).translate(0, -0.08, z), iron));
    sg.add(mk(new THREE.BoxGeometry(0.04, 0.62, 0.8).translate(0, -0.46, 0.58), [smat('dragsign', '#ffffff', { bump: 0.6 }), smat('dragsign', '#ffffff', { bump: 0.6 }), wood, wood, wood, wood]));
    sg.position.set(w + 0.02, fh - 0.08, h + JD); o.add(sg); }
  // feno e barris empilhados no canto
  { const hy = mHay(); hy.position.set(w + 0.45, 0, 0.7); o.add(hy); for (const [x, z, y] of [[-0.55, h - 0.25, 0], [-0.55, h - 0.8, 0], [-0.55, h - 0.52, 0.62]]) { const br = mBarrel(); br.scale.setScalar(0.7); br.position.set(x, y, z); o.add(br); } }
}
// Boticário de Elva: pavilhão-estufa vitoriano — mureta de pedra, paredes e abóbada de vidro esverdeado em ferro verde-garrafa, detalhes de latão,
// lanterninha no alto, portas de vidro com bandeira em arco, placa, e as plantas aparecendo pelo vidro (canteiros, plantas que brilham, vasos pendurados, trepadeiras e o tanque)
function mGreenhouse(b, night) {
  const w = b.w, h = b.h, { H } = bldDims(b), o = grp(), dX = doorCol(b) + 0.5, B0 = 0.45;
  const iron = smat(null, '#1f3d2c', { metal: 0.55, rough: 0.45 }), brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }), stone = smat('stoneblock', '#7c847a', { bump: 1.3 });
  const glass = smat(null, '#cfeedd', { rough: 0.05, metal: 0.25, transparent: true, opacity: 0.24, side: THREE.DoubleSide, emissive: night ? '#ffd890' : '#000000', ei: night ? 0.3 : 0 });
  const leaf = smat(null, '#3e7a34', { rough: 0.85 }), leaf2 = smat(null, '#5a9a40', { rough: 0.85 }), soil = smat(null, '#3a2a1c', { rough: 1 }), woodD = smat('wood', '#3a2618', { bump: 1.2 });
  o.add(wbox(w, 0.08, h, w / 2, 0.04, h / 2, smat('stoneblock', '#8e9286', { bump: 1 }), 1));
  // mureta de pedra (com vão da porta na frente) e vidro acima dela
  const seg = (x0, x1, z, side) => { const L = x1 - x0; if (L < 0.05) return; if (side) { o.add(wbox(0.14, B0, L, z, B0 / 2, (x0 + x1) / 2, stone, 1.2)); o.add(mk(new THREE.PlaneGeometry(L, H - B0).rotateY(Math.PI / 2).translate(z, B0 + (H - B0) / 2, (x0 + x1) / 2), glass, false)); o.add(wbox(0.2, 0.06, L + 0.04, z, B0 + 0.03, (x0 + x1) / 2, brass, 1)); }
    else { o.add(wbox(L, B0, 0.14, (x0 + x1) / 2, B0 / 2, z, stone, 1.2)); o.add(mk(new THREE.PlaneGeometry(L, H - B0).translate((x0 + x1) / 2, B0 + (H - B0) / 2, z), glass, false)); o.add(wbox(L + 0.04, 0.06, 0.2, (x0 + x1) / 2, B0 + 0.03, z, brass, 1)); } };
  seg(0, dX - 0.6, h, false); seg(dX + 0.6, w, h, false); seg(0, w, 0, false); seg(0, h, 0, true); seg(0, h, w, true);
  // montantes de ferro a cada meia casa e travessas
  for (let x = 0; x <= w + 0.001; x += 0.5) for (const z of [0, h]) if (z === 0 || Math.abs(x - dX) > 0.62 || Math.abs(x - dX) < 0.01) o.add(wbox(0.05, H, 0.05, x, H / 2, z, iron, 1));
  for (let z = 0.5; z < h - 0.001; z += 0.5) for (const x of [0, w]) o.add(wbox(0.05, H, 0.05, x, H / 2, z, iron, 1));
  for (const y of [B0 + (H - B0) * 0.55, H]) { o.add(wbox(w + 0.06, 0.05, 0.06, w / 2, y, 0, iron, 1)); o.add(wbox(0.06, 0.05, h + 0.06, 0, y, h / 2, iron, 1)); o.add(wbox(0.06, 0.05, h + 0.06, w, y, h / 2, iron, 1)); for (const [a, b2] of [[0, dX - 0.6], [dX + 0.6, w]]) o.add(wbox(b2 - a + 0.06, 0.05, 0.06, (a + b2) / 2, y, h, iron, 1)); }
  // abóbada de vidro em meio-cilindro sobre o lado maior, com costelas de ferro, cumeeira e pontas de latão
  const ridgeX = w >= h, R = (ridgeX ? h : w) / 2, L = ridgeX ? w : h;
  { const vg = new THREE.CylinderGeometry(R, R, L, 26, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2); if (ridgeX) vg.rotateY(Math.PI / 2); vg.translate(w / 2, H, h / 2); o.add(mk(vg, glass, false));
    for (const e of [0, L]) { const cg = new THREE.CircleGeometry(R, 22, 0, Math.PI); if (ridgeX) cg.rotateY(Math.PI / 2).translate(e, H, h / 2); else cg.translate(w / 2, H, e); o.add(mk(cg, glass, false)); }
    for (let k = 0; k <= L + 0.001; k += 0.5) { const rg = new THREE.TorusGeometry(R, 0.03, 5, 24, Math.PI); if (ridgeX) rg.rotateY(Math.PI / 2).translate(k, H, h / 2); else rg.translate(w / 2, H, k); o.add(mk(rg, iron)); }
    const rb = ridgeX ? wbox(L + 0.1, 0.07, 0.07, w / 2, H + R, h / 2, iron, 1) : wbox(0.07, 0.07, L + 0.1, w / 2, H + R, h / 2, iron, 1); o.add(rb);
    for (const e of [-0.05, L + 0.05]) { const p = ridgeX ? V3(e, H + R + 0.05, h / 2) : V3(w / 2, H + R + 0.05, e); o.add(mk(new THREE.ConeGeometry(0.06, 0.32, 8).translate(p.x, p.y + 0.16, p.z), brass)); o.add(mk(new THREE.SphereGeometry(0.06, 10, 8).translate(p.x, p.y + 0.36, p.z), brass)); }
    // lanterninha de vidro no alto
    const lx = w / 2, lz = h / 2, ly = H + R; o.add(mk(new THREE.CylinderGeometry(0.32, 0.32, 0.42, 8, 1, true).translate(lx, ly + 0.2, lz), glass, false)); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; o.add(wbox(0.035, 0.42, 0.035, lx + Math.cos(a) * 0.32, ly + 0.2, lz + Math.sin(a) * 0.32, iron, 1)); }
    o.add(mk(new THREE.ConeGeometry(0.4, 0.34, 8).translate(lx, ly + 0.58, lz), smat(null, '#2a5a3c', { metal: 0.6, rough: 0.35 }))); o.add(mk(new THREE.SphereGeometry(0.07, 10, 8).translate(lx, ly + 0.82, lz), brass)); }
  // portas de vidro duplas com moldura de latão e bandeira em arco, placa em cima
  { const g = grp(), dw = 1.05, dh = 1.75; for (const sx of [-1, 1]) { g.add(wbox(0.07, dh, 0.08, sx * dw / 2, dh / 2, 0.02, brass, 1)); g.add(wbox(0.04, dh, 0.05, sx * 0.02, dh / 2, 0.02, brass, 1)); g.add(mk(new THREE.PlaneGeometry(dw / 2 - 0.05, dh - 0.08).translate(sx * dw / 4, dh / 2, 0.01), glass, false)); g.add(mk(new THREE.SphereGeometry(0.03, 8, 6).translate(sx * 0.09, dh * 0.5, 0.06), brass)); }
    g.add(mk(new THREE.TorusGeometry(dw / 2, 0.035, 5, 18, Math.PI).translate(0, dh, 0.02), brass)); g.add(mk(new THREE.CircleGeometry(dw / 2 - 0.03, 16, 0, Math.PI).translate(0, dh, 0.01), glass, false)); for (let k = 1; k < 5; k++) { const a = k / 5 * Math.PI; g.add(limb(V3(0, dh, 0.02), V3(Math.cos(a) * dw / 2, dh + Math.sin(a) * dw / 2, 0.02), 0.012, 0.012, brass, 3)); }
    g.add(wbox(dw + 0.5, 0.08, 0.5, 0, 0.04, 0.25, stone, 1));
    g.add(mk(new THREE.BoxGeometry(1.25, 0.5, 0.05).translate(0, dh + dw / 2 + 0.38, 0.05), [smat(null, '#1c3626'), smat(null, '#1c3626'), brass, brass, smat('apothsign', '#ffffff', { bump: 0.4 }), smat('apothsign', '#ffffff', { bump: 0.4 })]));
    g.position.set(dX, 0, h + 0.02); o.add(g); }
  // placa também nas faces que a câmera vê (a porta pode ficar do outro lado)
  for (const f of camFaces(b)) { if (f === 'F') continue; const sg = grp(mk(new THREE.BoxGeometry(1.25, 0.5, 0.05).translate(0, 0, 0.06), [smat(null, '#1c3626'), smat(null, '#1c3626'), brass, brass, smat('apothsign', '#ffffff', { bump: 0.4 }), smat('apothsign', '#ffffff', { bump: 0.4 })]));
    for (const sx of [-0.5, 0.5]) sg.add(wbox(0.04, 0.3, 0.04, sx, 0.38, 0.06, brass, 1)); onFace(o, sg, f, faceLen(f, w, h) / 2, w, h, H - 0.75); }
  // lanternas de latão com luz esverdeada ao lado da porta e vasos com plantas medicinais
  for (const sx of [-0.82, 0.82]) { const g = grp(wbox(0.04, 0.04, 0.24, 0, 0, 0.12, brass, 1), mk(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8).translate(0, -0.12, 0.24), smat(null, '#d8f0c0', { emissive: '#9ae0a0', ei: night ? 1.8 : 0.4 })), mk(new THREE.ConeGeometry(0.1, 0.1, 8).translate(0, 0.03, 0.24), brass)); g.position.set(dX + sx, 1.4, h + 0.02); o.add(g);
    const p = grp(mk(new THREE.CylinderGeometry(0.17, 0.12, 0.3, 10).translate(0, 0.15, 0), smat(null, '#a8583a')), mk(new THREE.SphereGeometry(0.21, 12, 10).scale(1, 0.85, 1).translate(0, 0.46, 0), leaf2)); for (let k = 0; k < 5; k++) p.add(mk(new THREE.SphereGeometry(0.04, 6, 5).translate(Math.cos(k * 1.3) * 0.15, 0.6 + (k % 2) * 0.05, Math.sin(k * 1.3) * 0.15), smat(null, k % 2 ? '#9a6ad8' : '#f0e0f0'))); p.position.set(dX + sx * 1.45, 0, h + 0.35); o.add(p); }
  // dentro, pelo vidro: os mesmos móveis do interior, nas mesmas posições (balcão, gavetinhas, alambique, canteiros, tanque, vasos e plantas)
  { const I = mInterior({ ...b, realDoor: b.realDoor || 'N' }, 0); for (const c of [...I.children]) if (c.userData && c.userData.furn) o.add(c); }
  for (const x of [0.25, w - 0.25]) for (let k = 0; k < 3; k++) o.add(limb(V3(x, B0 + 0.05, h - 0.06), V3(x + (k - 1) * 0.12, B0 + 0.7 + k * 0.35, h - 0.06), 0.022, 0.012, leaf2, 4));   /* trepadeiras subindo pelo vidro da frente */
  if (false) { const px = w / 2, pz = h * 0.6; o.add(mk(new THREE.CylinderGeometry(0.42, 0.45, 0.16, 18).translate(px, 0.08, pz), stone)); o.add(mk(new THREE.CircleGeometry(0.36, 18).rotateX(-Math.PI / 2).translate(px, 0.15, pz), smat(null, '#2e6a7a', { rough: 0.05, metal: 0.3 }))); for (let k = 0; k < 4; k++) o.add(mk(new THREE.CircleGeometry(0.07, 10).rotateX(-Math.PI / 2).translate(px + Math.cos(k * 1.7) * 0.2, 0.16, pz + Math.sin(k * 1.7) * 0.2), leaf2)); }
  return o;
}
function mBuildingRot(b, night) { return placeRot(b, mBuilding(localB(b), night)); }
// Dojô do Punho de Ferro: machiya alta de Edo (madeira escura, treliças kōshi, noren, telhadinhos e varandas), 4 andares
function mMachiya(b, night) {
  const w = b.w, h = b.h, { H, RH } = bldDims(b), o = grp(), nF = 4, fh = H / nF;
  const dark = smat('wood', '#9a6838', { bump: 1.1 }), dark2 = smat('oldplank', '#c8945a', { bump: 1.2 }), plaster = smat('plaster', '#f0e8d6', { bump: 0.5 }), stone = smat('stoneblock', '#6c6a64', { bump: 1.2 });   /* hinoki mel */
  const tile = smat('kawara', '#5a6a8a', { bump: 1.4 }), tileD = smat(null, '#1a2030', { rough: 0.55, metal: 0.15 }), slat = smat('wood', '#a8743e', { bump: 0.8 }), bamboo = smat(null, '#b8a868', { rough: 0.7 });   /* telha preta-azulada */
  const shoji = smat('shoji', '#ffffff', { emissive: night ? '#ffb040' : '#000000', ei: night ? 1.15 : 0, bump: 0.4 }), red = smat(null, '#b8261c', { emissive: night ? '#ff7a40' : '#000000', ei: night ? 1.4 : 0.05 });   /* âmbar como a taverna, só à noite */
  const dX = doorCol(b) + 0.5, d2X = b.door2L ? b.door2L[0] + 0.5 : -9;
  { const ish = smat('ishigaki', '#ffffff', { bump: 1.6 }); o.add(wbox(w + 0.24, 0.55, h + 0.24, w / 2, 0.275, h / 2, ish, 0.7)); o.add(wbox(w + 0.3, 0.06, h + 0.3, w / 2, 0.58, h / 2, smat('stoneblock', '#8a8680', { bump: 1 }), 1)); }   /* base alta de pedras encaixadas */
  const ironM = smat(null, '#161412', { metal: 0.75, rough: 0.4 });
  // paredes de cada andar: embaixo madeira escura, em cima reboco; vigas escuras em cada andar
  for (let f = 0; f < nF; f++) { const y0 = f * fh;
    o.add(wbox(w, fh, h, w / 2, y0 + fh / 2, h / 2, plaster, 0.6));
    o.add(wbox(w + 0.02, Math.min(0.95, fh * 0.4), h + 0.02, w / 2, y0 + Math.min(0.95, fh * 0.4) / 2 + (f ? 0 : 0.2), h / 2, dark2, 1.2));
    o.add(wbox(w + 0.08, 0.16, h + 0.08, w / 2, y0 + fh - 0.08, h / 2, dark, 1));   // viga do andar
  }
  for (let x = 0; x <= w + 0.001; x += 1) for (const z of [0, h]) { o.add(wbox(0.12, H, 0.12, x, H / 2, z, dark, 1)); for (let f = 0; f < nF; f++) for (const y of [f * (H / nF) + 0.75, f * (H / nF) + 2.05]) { o.add(wbox(0.15, 0.06, 0.15, x, y, z, ironM, 1)); for (const s2 of [-1, 1]) o.add(mk(new THREE.SphereGeometry(0.018, 5, 4).translate(x + s2 * 0.04, y, z + (z ? 0.078 : -0.078)), ironM)); } }   // pilares com cintas e cravos de ferro
  for (let z = 1; z < h - 0.001; z += 1) for (const x of [0, w]) o.add(wbox(0.12, H, 0.12, x, H / 2, z, dark, 1));
  // térreo da frente: treliça kōshi de ripas finas, porta com noren e lanternas vermelhas
  for (let x = 0.1; x < w - 0.05; x += 0.1) { if (Math.abs(x - dX) < 0.6 || Math.abs(x - d2X) < 0.6) continue; o.add(wbox(0.035, 1.9, 0.05, x, 1.15, h + 0.04, slat, 1)); }
  if (d2X > 0) { o.add(mk(new THREE.PlaneGeometry(1.0, 2.0).translate(d2X, 1.2, h + 0.005), smat(null, '#140c08'))); o.add(wbox(1.2, 0.08, 0.1, d2X, 2.1, h + 0.1, dark, 1)); for (let k = 0; k < 2; k++) o.add(mk(new THREE.PlaneGeometry(0.5, 0.62).translate(d2X - 0.26 + k * 0.52, 1.74, h + 0.11), smat(null, '#f1ece2', { side: THREE.DoubleSide }))); o.add(mk(new THREE.CircleGeometry(0.13, 16).translate(d2X, 1.78, h + 0.12), smat(null, '#1e2c4a'))); }   /* entrada do corredor do elevador: noren branco com o selo índigo */
  o.add(wbox(w, 0.06, 0.08, w / 2, 2.12, h + 0.05, dark, 1)); o.add(wbox(w, 0.06, 0.08, w / 2, 0.22, h + 0.05, dark, 1));
  o.add(mk(new THREE.PlaneGeometry(1.0, 2.0).translate(dX, 1.2, h + 0.005), smat(null, '#140c08')));
  o.add(wbox(1.25, 0.08, 0.1, dX, 2.1, h + 0.1, dark, 1));
  for (let k = 0; k < 3; k++) o.add(mk(new THREE.PlaneGeometry(0.36, 0.78).translate(dX - 0.38 + k * 0.38, 1.68, h + 0.11), smat('noren', '#ffffff', { bump: 0.3, side: THREE.DoubleSide })));
  const lantern = (x, y, z) => { const g2 = grp(mk(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 12).translate(0, 0, 0), red), mk(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10).translate(0, 0.19, 0), tileD), mk(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10).translate(0, -0.19, 0), tileD)); g2.position.set(x, y, z); o.add(g2); if (night) { const pl = new THREE.PointLight(0xff8a50, 0.9, 3.2); pl.position.set(x, y, z + 0.2); o.add(pl); } };
  lantern(dX - 0.85, 1.95, h + 0.32); lantern(dX + 0.85, 1.95, h + 0.32); if (d2X > 0) lantern(d2X + 0.75, 1.95, h + 0.32);
  // lanternas de ferro com braço curvo nos cantos da fachada
  for (const x of [0.08, w - 0.08]) { o.add(limb(V3(x, 1.75, h + 0.06), V3(x, 1.95, h + 0.45), 0.02, 0.02, ironM, 5)); o.add(limb(V3(x, 1.95, h + 0.45), V3(x, 1.85, h + 0.55), 0.02, 0.02, ironM, 4)); const lb = grp(wbox(0.2, 0.26, 0.2, 0, 0, 0, smat(null, '#ffd890', { emissive: night ? '#ffb040' : '#000000', ei: night ? 1.4 : 0.1 }), 1), mk(new THREE.ConeGeometry(0.17, 0.14, 4).rotateY(Math.PI / 4).translate(0, 0.2, 0), ironM)); for (const [a2, c2] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) lb.add(wbox(0.025, 0.28, 0.025, a2, 0, c2, ironM, 1)); lb.position.set(x, 1.66, h + 0.55); o.add(lb); }
  // correntes de chuva (kusari-doi) dos beirais até bacias de pedra
  for (const x of [-0.3, w + 0.3]) { for (let k = 0; k < 30; k++) { const y = 0.6 + k * (H - 0.6) / 30; o.add(mk(new THREE.TorusGeometry(0.035, 0.009, 4, 8).rotateY(k % 2 ? Math.PI / 2 : 0).translate(x, y, h + 0.85), ironM)); } o.add(mk(new THREE.CylinderGeometry(0.2, 0.16, 0.22, 12).translate(x, 0.11, h + 0.85), stone)); o.add(mk(new THREE.CircleGeometry(0.16, 12).rotateX(-Math.PI / 2).translate(x, 0.225, h + 0.85), smat(null, '#5a8a8a', { rough: 0.1 }))); }
  // janela do térreo com grade de ferro no lado que a câmera vê
  { const z = 2.6; o.add(mk(new THREE.PlaneGeometry(1.0, 0.6).rotateY(-Math.PI / 2).translate(-0.02, 1.55, z), shoji)); for (let k = 0; k < 6; k++) o.add(wbox(0.03, 0.66, 0.03, -0.06, 1.55, z - 0.45 + k * 0.18, ironM, 1)); for (const y of [1.25, 1.85]) o.add(wbox(0.04, 0.04, 1.08, -0.06, y, z, ironM, 1)); }
  { const sg = grp(mk(new THREE.BoxGeometry(0.42, 1.5, 0.06), [dark, dark, dark, dark, smat('dojosign', '#ffffff', { bump: 0.4 }), dark])); sg.position.set(1.4, 1.15, h + 0.12); o.add(sg); }
  // telhadinho (hisashi) sobre o térreo, na frente e no lado que a câmera vê
  const hisashi = (y, side) => { const g2 = grp(), L = side === 'F' ? w + 0.5 : h + 0.3, dp = side === 'F' ? 0.8 : 0.45; g2.add(mk(new THREE.BoxGeometry(L, 0.05, dp).translate(0, 0, dp / 2).rotateX(0.32), tile)); g2.add(mk(new THREE.BoxGeometry(L, 0.07, 0.07).translate(0, -0.15 * dp / 0.8, dp - 0.02), tileD));
    if (side === 'F') g2.position.set(w / 2, y, h); else { g2.rotation.y = -Math.PI / 2; g2.position.set(0, y, h / 2); } o.add(g2); };
  hisashi(fh + 0.02, 'F'); for (let f = 1; f <= 3; f++) hisashi(f * fh + 0.02, 'L');
  // andares de cima: portas de correr shoji para a varanda (uma por apartamento), varandas com guarda-corpo, vasos e varal
  for (let f = 1; f < nF; f++) { const y0 = f * fh;
    for (let k = 0; k < Math.floor(w / 2); k++) { const cx = k * 2 + 1; o.add(mk(new THREE.PlaneGeometry(1.5, 1.65).translate(cx, y0 + 0.25 + 0.85, h + 0.02), shoji)); o.add(wbox(1.6, 0.07, 0.07, cx, y0 + 1.93, h + 0.04, dark, 1)); o.add(wbox(0.06, 1.7, 0.07, cx, y0 + 1.1, h + 0.04, dark, 1)); }
    const bw = f < nF - 1 ? w : 6;   /* a varanda da suíte só vai até a porta do hall */
    o.add(wbox(bw + 0.1, 0.08, 1.0, bw / 2, y0 + 0.04, h + 0.5, dark2, 1)); o.add(wbox(bw + 0.1, 0.14, 0.12, bw / 2, y0 - 0.05, h + 0.95, dark, 1));
    for (let x = 0; x <= bw + 0.001; x += 1) { o.add(wbox(0.08, 0.92, 0.08, x, y0 + 0.5, h + 0.96, dark, 1)); o.add(wbox(0.1, 0.05, 0.1, x, y0 + 0.97, h + 0.96, smat(null, '#1a1816', { metal: 0.7, rough: 0.45 }), 1)); }
    o.add(wbox(bw + 0.1, 0.06, 0.08, bw / 2, y0 + 0.93, h + 0.96, dark, 1)); o.add(wbox(bw, 0.04, 0.05, bw / 2, y0 + 0.3, h + 0.96, dark, 1));
    for (let x = 0.15; x < bw; x += 0.17) o.add(wbox(0.025, 0.6, 0.025, x, y0 + 0.62, h + 0.96, slat, 1));
    for (let x = 1; x < bw; x += 2) o.add(limb(V3(x, y0 + 0.02, h + 0.1), V3(x, y0 - 0.55, h + 0.05), 0.03, 0.03, smat(null, '#1a1816', { metal: 0.7 }), 4));   /* mãos-francesas de ferro sob a varanda */
    for (let k = 0; k < Math.floor(w / 2); k++) { const px = k * 2 + 0.45 + ((f + k) % 2) * 1.1; o.add(mk(new THREE.CylinderGeometry(0.11, 0.08, 0.18, 10).translate(px, y0 + 0.17, h + 0.42), smat(null, '#8a5a3a'))); o.add(mk(new THREE.SphereGeometry(0.16, 10, 8).scale(1, 0.8, 1).translate(px, y0 + 0.36, h + 0.42), smat(null, ['#4a7a34', '#5a8a3a', '#3e6a2e'][k]))); }
    if (f !== 2) { o.add(limb(V3(0.25, y0 + 1.95, h + 0.48), V3(w - 0.25, y0 + 1.95, h + 0.48), 0.022, 0.022, bamboo, 6)); for (let k = 0; k < 3; k++) { const cx = 0.9 + k * 1.7 + f * 0.2; o.add(mk(new THREE.PlaneGeometry(0.5, 0.62).translate(cx, y0 + 1.62, h + 0.48), smat(null, ['#e8e0d0', '#6a8ab8', '#c8a060', '#b85a4a'][(k + f) % 4], { side: THREE.DoubleSide }))); } }
    // janelinhas shoji no lado que a câmera vê
    for (const z of [1.2, 3.6]) o.add(mk(new THREE.PlaneGeometry(0.8, 0.9).rotateY(-Math.PI / 2).translate(-0.02, y0 + 1.25, z), shoji));
  }
  for (const z of [1.2, 3.6]) o.add(mk(new THREE.PlaneGeometry(0.75, 0.5).rotateY(-Math.PI / 2).translate(-0.02, 1.55, z), shoji));
  // telhado principal de duas águas (cumeeira ao longo da fachada), beiral largo cobrindo a varanda de cima
  { const ov = 0.75, half = h / 2 + ov, sl = Math.atan2(RH, half), L = Math.hypot(half, RH);
    for (const sgn of [-1, 1]) { const pl = mk(new THREE.BoxGeometry(w + 0.9, 0.09, L).translate(0, 0, sgn * L / 2), tile); pl.rotation.x = sgn * sl; pl.position.set(w / 2, H + RH, h / 2); o.add(pl); o.add(wbox(w + 0.9, 0.1, 0.12, w / 2, H - 0.02, h / 2 + sgn * half, tileD, 1)); }
    o.add(wbox(w + 1.0, 0.18, 0.24, w / 2, H + RH + 0.05, h / 2, tileD, 1));
    for (const x of [-0.45, w + 0.45]) { o.add(wbox(0.26, 0.34, 0.3, x, H + RH + 0.14, h / 2, tileD, 1)); const tri = new THREE.Shape(); tri.moveTo(-h / 2, 0); tri.lineTo(h / 2, 0); tri.lineTo(0, RH); tri.closePath(); const tg = new THREE.ShapeGeometry(tri).rotateY(Math.PI / 2); tg.translate(x < 0 ? 0 : w, H, h / 2); o.add(mk(tg, plaster)); }
  }
  return o;
}
function mBuilding(b, night) {
  if (b.kind === 'castle') return mCastle(b, night);
  if (b.deco === 'machiya') return mMachiya(b, night);
  if (b.deco === 'greenhouse') return mGreenhouse(b, night);
  if (b.kind === 'stairtower') return mStairTower(b, false);
  const w = b.w, h = b.h, { H, RH } = bldDims(b), o = grp(), R = rng(b.x * 31 + b.y * 7), seed = b.x * 0.37 + b.y;
  const st = styleOf(b);
  const trimM = smat('wood', st.trim, { bump: 1 }), stoneM = '#8e887c';
  const floors = b.floors || Math.max(1, Math.round(H / 1.5)), fh = H / floors;
  const timber = st.tex === 'plaster';
  // térreo de pedra nas casas de 2+ andares; andares de cima em enxaimel avançando sobre a rua
  const jet = timber && floors >= 2 ? 0.22 : 0;
  const baseH = timber && floors >= 2 ? fh : 0;
  if (baseH) {
    o.add(gwall(w, baseH, h, w / 2, baseH / 2, h / 2, 'brick', stoneM, H, seed, 0.9, 1.5));
    o.add(gwall(w + jet, H - baseH, h + jet, w / 2 + jet / 2, baseH + (H - baseH) / 2, h / 2 + jet / 2, 'plaster', st.wall, H + 2, seed, 0.6, 0.8));
    // vigas que sustentam o andar avançado
    for (let k = 0; k <= w; k++) { const m = mk(new THREE.BoxGeometry(0.1, 0.1, jet + 0.14), trimM); m.position.set(Math.min(w - 0.05, Math.max(0.05, k)), baseH - 0.05, h + jet / 2 - 0.02); o.add(m); }
    for (let k = 0; k <= h; k++) { const m = mk(new THREE.BoxGeometry(jet + 0.14, 0.1, 0.1), trimM); m.position.set(w + jet / 2 - 0.02, baseH - 0.05, Math.min(h - 0.05, Math.max(0.05, k))); o.add(m); }
  } else if (b.kind === 'hotel') {   // térreo de pedra até a cintura, tábuas escuras em cima, cintas e cunhais de madeira
    const sb = 0.95;
    o.add(gwall(w + 0.06, sb, h + 0.06, w / 2, sb / 2, h / 2, 'stoneblock', '#8e887a', H, seed, 0.9, 1.6));
    o.add(gwall(w, H - sb, h, w / 2, sb + (H - sb) / 2, h / 2, 'oldplank', st.wall, H + 2, seed, 0.8, 1.2));
    o.add(wbox(w + 0.14, 0.1, h + 0.14, w / 2, sb, h / 2, trimM, 1)); o.add(wbox(w + 0.1, 0.12, h + 0.1, w / 2, H - 0.06, h / 2, trimM, 1));
    for (const [x, z] of [[0, 0], [w, 0], [0, h], [w, h]]) o.add(wbox(0.16, H - sb, 0.16, x, sb + (H - sb) / 2, z, trimM, 1));
  } else {
    o.add(gwall(w, H, h, w / 2, H / 2, h / 2, st.tex, st.wall, H, seed, st.tex === 'brick' ? 0.8 : 0.7, st.tex === 'plaster' ? 0.8 : 1.4));
    if (st.tex !== 'brick') o.add(wbox(w + 0.08, 0.45, h + 0.08, w / 2, 0.22, h / 2, smat('stoneblock', '#8a857a', { bump: 1.5 }), 1.2));
  }
  const W2 = w + jet, H2 = h + jet;          // medidas da parte de cima (com o avanço)
  // enxaimel
  if (timber) {
    const beam = (x0, y0, z0, x1, y1, z1) => { const a = V3(x0, y0, z0), c = V3(x1, y1, z1), d = new THREE.Vector3().subVectors(c, a), L = d.length(); const m = mk(new THREE.BoxGeometry(0.1, L, 0.05), trimM); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); return m; };
    const y0 = baseH || 0.45, fz = (baseH ? H2 : h) + 0.025, fx = (baseH ? W2 : w) + 0.025, ww = baseH ? W2 : w, hh = baseH ? H2 : h;
    const nX = Math.max(2, Math.round(ww / 0.9)), nZ = Math.max(2, Math.round(hh / 0.9));
    for (let k = 0; k <= nX; k++) o.add(beam(k * ww / nX, y0, fz, k * ww / nX, H, fz));
    for (let k = 0; k <= nZ; k++) o.add(beam(fx, y0, k * hh / nZ, fx, H, k * hh / nZ));
    for (let f = 0; f <= floors; f++) { const y = f === floors ? H - 0.05 : Math.max(y0, f * fh); if (y < y0 - 0.01) continue; o.add(beam(0, y, fz, ww, y, fz)); o.add(beam(fx, y, 0, fx, y, hh)); }
    if (b.kind === 'hotel') {
      const bz = -0.025, bx = -0.025;
      for (const zf of [fz, bz]) for (let k = 0; k < nX; k++) { o.add(beam(k * ww / nX, y0, zf, (k + 1) * ww / nX, H - 0.05, zf)); o.add(beam((k + 1) * ww / nX, y0, zf, k * ww / nX, H - 0.05, zf)); }
      for (const xf of [fx, bx]) for (let k = 0; k < nZ; k++) { o.add(beam(xf, y0, k * hh / nZ, xf, H - 0.05, (k + 1) * hh / nZ)); o.add(beam(xf, y0, (k + 1) * hh / nZ, xf, H - 0.05, k * hh / nZ)); }
      for (let k = 0; k <= nX; k++) o.add(beam(k * ww / nX, y0, bz, k * ww / nX, H, bz));
      for (let k = 0; k <= nZ; k++) o.add(beam(bx, y0, k * hh / nZ, bx, H, k * hh / nZ));
      for (const y of [y0, H - 0.05]) { o.add(beam(0, y, bz, ww, y, bz)); o.add(beam(bx, y, 0, bx, y, hh)); }
    }
    else for (let k = 0; k < nX; k++) if (k % 2 === 0) o.add(beam(k * ww / nX, y0, fz, (k + 1) * ww / nX, Math.min(H, y0 + fh * 0.6), fz));
    if (b.kind !== 'hotel') for (let k = 0; k < nZ; k++) if (k % 2 === 1) o.add(beam(fx, y0, (k + 1) * hh / nZ, fx, Math.min(H, y0 + fh * 0.6), k * hh / nZ));
  } else if (st.tex === 'brick') {
    // pedras de canto alternadas (cunhais)
    for (const [x, z] of [[w, h], [0, h], [w, 0]]) for (let y = 0; y < H - 0.1; y += 0.36) { const big = Math.round(y / 0.36) % 2; o.add(wbox(big ? 0.36 : 0.22, 0.32, big ? 0.22 : 0.36, x, y + 0.17, z, smat('stoneblock', shadeH(st.wall, 0.06)), 1.4)); }
    o.add(wbox(w + 0.1, 0.16, h + 0.1, w / 2, H - 0.08, h / 2, smat('stoneblock', shadeH(st.wall, 0.08)), 1.4));
  }
  // janelas em arco com venezianas, uma fileira por andar
  const glassM = night ? smat(null, '#ffd890', { emissive: '#ffb850', ei: 1.6, rough: 0.3 }) : smat(null, '#24323e', { rough: 0.08, metal: 0.4 });
  const shutM = smat('wood', ['#3e5a3a', '#6a2a22', '#3a4a6a', '#5a4026'][(b.v || 0) % 4], { bump: 1 });
  const winAt = (face, u, y, small) => {
    const ww = small ? 0.32 : 0.38, wh = Math.min(small ? 0.5 : 0.62, fh * 0.42), gO = grp();
    gO.add(mk(new THREE.BoxGeometry(ww + 0.1, wh + 0.08, 0.06), trimM));
    gO.add(mk(new THREE.CylinderGeometry(ww / 2 + 0.05, ww / 2 + 0.05, 0.06, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, wh / 2, 0), trimM));
    gO.add(mk(new THREE.BoxGeometry(ww, wh, 0.02).translate(0, 0, 0.025), glassM));
    gO.add(mk(new THREE.CylinderGeometry(ww / 2, ww / 2, 0.02, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, wh / 2, 0.025), glassM));
    gO.add(mk(new THREE.BoxGeometry(0.03, wh + ww / 2, 0.03).translate(0, ww / 4, 0.04), trimM));
    gO.add(mk(new THREE.BoxGeometry(ww, 0.03, 0.03).translate(0, 0, 0.04), trimM));
    gO.add(mk(new THREE.BoxGeometry(ww + 0.16, 0.05, 0.12).translate(0, -wh / 2 - 0.04, 0.04), smat('stoneblock', '#9a948a')));
    if (timber) for (const sgn of [-1, 1]) { const sh = mk(wuv(new THREE.BoxGeometry(ww * 0.52, wh + 0.1, 0.03), 3), shutM); sh.position.set(sgn * (ww * 0.78 + 0.05), 0, 0.05); sh.rotation.y = sgn * 0.25; gO.add(sh); }
    if (timber && (b.kind === 'hotel' || b.wk === 'bakery' || R() < 0.4)) { gO.add(mk(new THREE.BoxGeometry(ww + 0.1, 0.1, 0.16).translate(0, -wh / 2 - 0.12, 0.1), trimM)); for (let k = 0; k < 4; k++) gO.add(mk(new THREE.SphereGeometry(0.05, 6, 5).translate(-ww / 2 + 0.06 + k * ww / 3.4, -wh / 2 - 0.03, 0.12), smat(null, ['#c83a3a', '#e8b030', '#e86aa8', '#f2ede0'][k % 4], { rough: 0.6 }))); }
    const jz = y > baseH && baseH ? jet : 0;
    if (face === 'L') gO.position.set(u, y, h + jz + 0.02); else if (face === 'X0') { gO.position.set(-jz - 0.02, y, u); gO.rotation.y = -Math.PI / 2; } else { gO.position.set(w + jz + 0.02, y, u); gO.rotation.y = Math.PI / 2; }
    o.add(gO);
  };
  const doorX = doorCol(b) + 0.5;
  if (b.wk === 'bakery') winAt('X0', h * 0.6, fh * 0.55, false);
  const extZ = []; for (let f = 0; f < floors - 1; f++) if (stairKind(b, f) === 'ext') { const sp = stairSpec(b, f); if (sp.ext > 0) extZ.push([f + 1, sp.trig[1] + 0.5]); }   // onde fica a porta de cima da escada externa
  if (b.kind !== 'hotel' && b.kind !== 'tavern') for (let f = 0; f < floors; f++) {
    const y = f * fh + fh * 0.55;
    const nL = Math.max(1, Math.floor(w / 1.5)), nR = Math.max(1, Math.floor(h / 1.5));
    for (let k = 0; k < nL; k++) { const u = (k + 0.5) * w / nL; if (f === 0 && Math.abs(u - doorX) < 0.8) continue; winAt('L', u, y, f > 0); }
    for (let k = 0; k < nR; k++) { const u = (k + 0.5) * h / nR; if (extZ.some(([ef, ez]) => ef === f && Math.abs(u - ez) < 0.8)) continue; winAt('R', u, y, f > 0); }
  }
  // porta em arco
  if (b.kind !== 'tavern') {
    const dw = b.kind === 'temple' ? 1.3 : 0.95, dh = b.kind === 'temple' ? 2.5 : 1.85, gD = grp();
    gD.add(mk(new THREE.BoxGeometry(dw + 0.2, dh + 0.08, 0.08).translate(0, dh / 2, 0), smat('stoneblock', '#8e897e')));
    gD.add(mk(new THREE.CylinderGeometry(dw / 2 + 0.1, dw / 2 + 0.1, 0.08, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, dh, 0), smat('stoneblock', '#8e897e')));
    const doorM = smat('wood', '#6e4626', { bump: 1.5 });
    gD.add(mk(new THREE.BoxGeometry(dw, dh, 0.04).translate(0, dh / 2, 0.03), doorM));
    gD.add(mk(new THREE.CylinderGeometry(dw / 2, dw / 2, 0.04, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, dh, 0.03), doorM));
    for (const y of [0.35, dh - 0.3]) gD.add(mk(new THREE.BoxGeometry(dw * 0.9, 0.05, 0.02).translate(0, y, 0.06), IRON()));
    gD.add(mk(new THREE.SphereGeometry(0.035, 8, 6).translate(dw * 0.32, dh * 0.5, 0.07), smat(null, '#c9a24a', { metal: 1, rough: 0.3 })));
    gD.add(mk(new THREE.BoxGeometry(dw + 0.5, 0.12, 0.5).translate(0, 0.06, 0.25), smat('stoneblock', '#8a857a')));   // degrau
    gD.position.set(doorX, 0, h + 0.02); gD.scale.setScalar(0.62);
    o.add(gD);
  }
  // telhado: duas águas (oitões) ou quatro águas, com beiral
  if (b.kind === 'hotel') mHotelRoof(o, b, W2, H2, H, RH, st, glassM, night);
  else {
  const ov = 0.42, roofM = smat(st.roofTex, st.roof, { bump: st.roofTex === 'thatch' ? 2 : 1.6, side: THREE.DoubleSide }), ridgeX = W2 >= H2;
  const gable = b.kind === 'house' ? (b.v || 0) % 2 === 0 : b.kind === 'shop' || b.kind === 'barracks' || b.kind === 'fruithouse' || b.wk === 'bakery' || b.kind === 'tavern';
  // no oitão o telhado avança pouco (beiral curto) e ganha uma tábua de acabamento na borda inclinada
  const ox = gable && ridgeX ? 0.03 : ov, oz = gable && !ridgeX ? 0.03 : ov;
  const A = V3(-ox, H, -oz), B = V3(W2 + ox, H, -oz), C = V3(W2 + ox, H, H2 + oz), D = V3(-ox, H, H2 + oz);
  let r1, r2;
  if (gable) { r1 = ridgeX ? V3(-ox, H + RH, H2 / 2) : V3(W2 / 2, H + RH, -oz); r2 = ridgeX ? V3(W2 + ox, H + RH, H2 / 2) : V3(W2 / 2, H + RH, H2 + oz); }
  else { r1 = ridgeX ? V3(H2 / 2, H + RH, H2 / 2) : V3(W2 / 2, H + RH, W2 / 2); r2 = ridgeX ? V3(W2 - H2 / 2, H + RH, H2 / 2) : V3(W2 / 2, H + RH, H2 - W2 / 2); }
  const faces = gable ? (ridgeX ? [[D, C, r2, r1], [B, A, r1, r2]] : [[A, D, r2, r1], [C, B, r1, r2]]) : (ridgeX ? [[D, C, r2, r1], [B, A, r1, r2], [A, D, r1], [C, B, r2]] : [[A, D, r2, r1], [C, B, r1, r2], [B, A, r1], [D, C, r2]]);
  for (const f of faces) { const pts = f.filter((p, i) => i === 0 || !p.equals(f[i - 1])); if (pts.length >= 3) o.add(roofFace(pts, roofM)); }
  if (gable) {
    // oitões (paredes triangulares nas pontas) com uma janelinha
    const gm = smat(timber ? 'plaster' : st.tex, shadeH(st.wall, -0.12), { bump: 1, side: THREE.DoubleSide });
    const tri = (p, q, t) => { const g = new THREE.BufferGeometry().setFromPoints([p, q, t]); g.computeVertexNormals(); wuv(g, 0.7); return mk(g, gm); };
    // parede do oitão vai até encostar no telhado (pentágono: sobe na beira e termina na cumeeira)
    const pent = (P) => { for (let k = 1; k < P.length - 1; k++) o.add(tri(P[0], P[k], P[k + 1])); };
    if (ridgeX) { const e = RH * ov / (H2 / 2 + ov); for (const x of [0, W2]) pent([V3(x, H, 0), V3(x, H + e, 0), V3(x, H + RH, H2 / 2), V3(x, H + e, H2), V3(x, H, H2)]); }
    else { const e = RH * ov / (W2 / 2 + ov); for (const z of [0, H2]) pent([V3(0, H, z), V3(0, H + e, z), V3(W2 / 2, H + RH, z), V3(W2, H + e, z), V3(W2, H, z)]); }
    const gw = b.kind === 'tavern' ? roundWin(0.42, night, false) : mk(new THREE.CircleGeometry(0.18, 12), glassM);
    if (ridgeX) { gw.position.set(W2 + 0.05, H + RH * 0.3, H2 / 2); gw.rotation.y = Math.PI / 2; } else { gw.position.set(W2 / 2, H + RH * 0.3, H2 + 0.05); }
    o.add(gw);
    if (b.kind === 'tavern') { const g2 = roundWin(0.42, night, false); if (ridgeX) { g2.position.set(-0.05, H + RH * 0.3, H2 / 2); g2.rotation.y = -Math.PI / 2; } else { g2.position.set(W2 / 2, H + RH * 0.3, -0.05); g2.rotation.y = Math.PI; } o.add(g2); }
  }
  const edge = smat('wood', shadeH(st.roof, -0.5));
  for (const [p, q] of (gable ? (ridgeX ? [[D, C]] : [[C, B]]) : [[D, C], [C, B]])) { const d = new THREE.Vector3().subVectors(q, p), L = d.length(); const m = mk(new THREE.BoxGeometry(L, 0.1, 0.06), edge); m.position.copy(p).addScaledVector(d, 0.5); m.position.y -= 0.05; m.rotation.y = -Math.atan2(d.z, d.x); o.add(m); }
  if (gable) for (const [p, q] of (ridgeX ? [[C, r2], [r2, B], [D, r1], [r1, A]] : [[A, r1], [r1, B], [D, r2], [r2, C]])) o.add(limb(p.clone().add(V3(0, 0.02, 0)), q.clone().add(V3(0, 0.02, 0)), 0.06, 0.06, edge, 4));
  if (!r1.equals(r2)) { const d = new THREE.Vector3().subVectors(r2, r1); o.add(limb(r1.clone().addScaledVector(d, -0.02), r2.clone().addScaledVector(d, 0.02), 0.07, 0.07, smat(st.roofTex === 'thatch' ? 'thatch' : 'stoneblock', shadeH(st.roof, st.roofTex === 'thatch' ? -0.1 : 0.15)), 8)); }
  if (gable && timber && b.wk === 'bakery' && !ridgeX) { const bm = (x0, y0, x1, y1) => o.add(limb(V3(x0, y0, H2 + 0.03), V3(x1, y1, H2 + 0.03), 0.04, 0.04, trimM, 4)); bm(W2 / 2, H, W2 / 2, H + RH - 0.05); bm(W2 * 0.2, H, W2 / 2, H + RH * 0.55); bm(W2 * 0.8, H, W2 / 2, H + RH * 0.55); }   // vigas no oitão da frente
  }
  // água-furtada (janela no telhado) nas casas grandes
  if (false) { const dx = W2 * 0.35, gD = grp(); gD.add(wbox(0.8, 0.8, 0.9, 0, 0.4, 0, smat('plaster', st.wall), 1)); gD.add(mk(new THREE.ConeGeometry(0.66, 0.55, 4).rotateY(Math.PI / 4).translate(0, 1.07, 0), roofM)); const gw = mk(new THREE.BoxGeometry(0.38, 0.46, 0.02).translate(0, 0.42, 0.46), glassM); gD.add(gw); gD.position.set(dx, H + RH * 0.3, H2 - (H2 / 2) * 0.62); o.add(gD); }
  // chaminé
  if (b.kind === 'tavern' || b.kind === 'house' || b.kind === 'smith') {
    const cx = W2 * 0.3, cz = H2 * 0.35, top = H + RH * 0.85 + 0.6;
    o.add(wbox(0.46, top - H + 0.2, 0.46, cx, (top + H - 0.2) / 2, cz, smat('brick', '#8a8478', { bump: 1.4 }), 2));
    o.add(wbox(0.56, 0.1, 0.56, cx, top + 0.05, cz, smat('stoneblock', '#6a665e'), 2));
  }
  // catedral: torre do sino com flecha e sol dourado + vitrais
  if (b.kind === 'temple') {
    // (sem a torre central: catedral baixa, telhado rente)
    const rose = mk(new THREE.CircleGeometry(0.6, 20), smat(null, night ? '#ffcc80' : '#2e2440', { emissive: night ? '#ffaa40' : '#000000', ei: night ? 1.4 : 0, rough: 0.15, metal: 0.3 }));
    rose.position.set(w * 0.5, H * 0.76, h + 0.05); o.add(rose);
    o.add(mk(new THREE.TorusGeometry(0.62, 0.06, 6, 24).translate(w * 0.5, H * 0.76, h + 0.05), smat('stoneblock', '#b4ae9f')));
  }
  // letreiros grandes com emblema 3D + vitrine com mercadorias (o prédio se explica sozinho)
  if ((b.kind === 'shop' && b.v !== 6 && !b.deco) || b.kind === 'smith') {   /* a taverna tem placa e lampião próprios */
    const kind = b.kind === 'shop' ? 'shop' + (b.v || 0) : b.kind;
    const x = Math.min(w - 0.35, doorX + 0.75), y = Math.min(fh * 0.85, 1.35), gS = grp();
    gS.add(mk(new THREE.BoxGeometry(0.05, 0.05, 0.75).translate(0, 0.05, 0.37), IRON()));
    gS.add(mk(new THREE.TorusGeometry(0.12, 0.012, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(0, -0.05, 0.6), IRON()));
    gS.add(mk(wuv(new THREE.BoxGeometry(0.05, 0.62, 0.7).translate(0, -0.38, 0.6), 2), smat('wood', '#6a4a2c')));
    gS.add(mk(new THREE.BoxGeometry(0.06, 0.66, 0.74).translate(0, -0.38, 0.6), smat('wood', '#3a2414')).translateX(-0.01));
    const em = grp(); em.position.set(0.06, -0.38, 0.6);
    const goldM = smat(null, '#e2b74e', { metal: 1, rough: 0.3 });
    if (kind === 'shop0') { for (let k = 0; k < 4; k++) em.add(mk(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 16).rotateZ(Math.PI / 2).translate(0.02, -0.12 + k * 0.05, -0.08 + k * 0.03), goldM)); em.add(mk(new THREE.SphereGeometry(0.11, 10, 8).scale(0.6, 1, 1).translate(0.03, 0.05, 0.12), smat('cloth', '#a88a5a'))); }
    else if (kind === 'shop1') { em.add(mk(new THREE.SphereGeometry(0.13, 12, 10).translate(0.03, -0.06, 0), smat(null, '#3ad878', { emissive: '#1a8a4a', ei: 0.9, rough: 0.1, transparent: true, opacity: 0.85 }))); em.add(mk(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 8).translate(0.03, 0.12, 0), smat(null, '#c8e8d8', { rough: 0.1 }))); em.add(mk(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8).translate(0.03, 0.2, 0), smat('wood', '#6a4a2c'))); }
    else if (kind === 'shop2') { const st2 = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? 0.08 : 0.2; st2[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } em.add(mk(new THREE.ExtrudeGeometry(st2, { depth: 0.03, bevelEnabled: false }).rotateY(Math.PI / 2), smat(null, '#b080ff', { emissive: '#6a3ad8', ei: 1.2, rough: 0.3 }))); em.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6).rotateX(0.7).translate(0.04, -0.05, 0), smat('wood', '#3a2414'))); }
    else if (kind === 'shop3') { for (const a of [0.6, -0.6]) { const bl = mk(new THREE.BoxGeometry(0.02, 0.4, 0.05), smat(null, '#c8ccd4', { metal: 0.9, rough: 0.3 })); bl.rotation.x = a; bl.position.set(0.03, 0, 0); em.add(bl); } for (const z of [-0.09, 0.09]) em.add(mk(new THREE.TorusGeometry(0.05, 0.015, 6, 12).rotateY(Math.PI / 2).translate(0.03, -0.17, z), goldM)); }
    else if (kind === 'shop4') { em.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 12).rotateX(Math.PI / 2).translate(0.04, 0.05, 0), smat('cloth', '#e8dcb8'))); em.add(mk(new THREE.BoxGeometry(0.02, 0.22, 0.36).translate(0.03, -0.1, 0), smat('cloth', '#e0d2a8'))); for (const z of [-0.21, 0.21]) em.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8).rotateX(Math.PI / 2).translate(0.04, 0.05, z), smat('wood', '#5a3a1e'))); }
    else if (kind === 'tavern') { em.add(mk(new THREE.CylinderGeometry(0.12, 0.1, 0.28, 12).translate(0.06, -0.02, 0), smat('wood', '#a8783a'))); em.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12).translate(0.06, 0.13, 0), smat(null, '#f4ead4', { rough: 0.9 }))); em.add(mk(new THREE.TorusGeometry(0.07, 0.02, 5, 10, Math.PI).rotateY(Math.PI / 2).rotateX(Math.PI / 2).translate(0.06, 0, 0.15), smat('wood', '#7a5428'))); }
    else if (kind === 'smith') { em.add(mk(new THREE.BoxGeometry(0.1, 0.1, 0.36).translate(0.04, 0.02, 0), smat(null, '#3a3a40', { metal: 0.9, rough: 0.4 }))); em.add(mk(new THREE.BoxGeometry(0.1, 0.12, 0.14).translate(0.04, -0.09, 0), smat(null, '#3a3a40', { metal: 0.9, rough: 0.4 }))); const hm = grp(mk(new THREE.BoxGeometry(0.03, 0.34, 0.03), smat('wood', '#6a4a2c')), mk(new THREE.BoxGeometry(0.07, 0.07, 0.15).translate(0, 0.16, 0), smat(null, '#9a9ca4', { metal: 0.9 }))); hm.position.set(0.07, 0.12, 0.12); hm.rotation.x = -0.8; em.add(hm); }
    gS.add(em);
    gS.position.set(x, y, h + (y > baseH && baseH ? jet : 0)); gS.scale.setScalar(0.72);
    o.add(gS);
    // vitrine saliente com mercadorias ao lado da porta (térreo)
    if (b.kind === 'shop') {
      const vx = doorX + 1.45 < w - 0.6 ? doorX + 1.45 : doorX - 1.45, gV = grp(), wd = 1.25, ht = 0.95, y0 = 0.55;
      gV.add(mk(wuv(new THREE.BoxGeometry(wd + 0.16, 0.12, 0.42).translate(0, y0 - 0.06, 0.16), 2), trimM));
      gV.add(mk(wuv(new THREE.BoxGeometry(wd + 0.16, 0.1, 0.42).translate(0, y0 + ht + 0.05, 0.16), 2), trimM));
      for (const ex of [-wd / 2 - 0.04, wd / 2 + 0.04]) gV.add(mk(new THREE.BoxGeometry(0.08, ht, 0.42).translate(ex, y0 + ht / 2, 0.16), trimM));
      gV.add(mk(new THREE.BoxGeometry(wd, ht, 0.02).translate(0, y0 + ht / 2, 0.36), smat(null, '#9ab8c8', { rough: 0.05, metal: 0.2, transparent: true, opacity: 0.32 }), false));
      gV.add(mk(new THREE.BoxGeometry(wd, ht, 0.02).translate(0, y0 + ht / 2, -0.02), smat(null, '#1a1410')));
      const cols = [['#c8a050', '#8a5a2a', '#d8d0b0'], ['#3ad878', '#d84a6a', '#5aa8f0'], ['#6a3ad8', '#2a2a6a', '#e2b74e'], ['#c83a3a', '#3a5ac8', '#e8d8b0'], ['#e8dcb8', '#c8b080', '#8a6a3a']][b.v || 0];
      for (let k = 0; k < 7; k++) { const it = k % 3, c = cols[k % 3], px = -wd / 2 + 0.15 + k * (wd - 0.3) / 6, py = y0 + 0.08 + (k % 2) * 0.42;
        const m = (b.v === 1) ? new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8) : (b.v === 2) ? new THREE.BoxGeometry(0.08, 0.2, 0.14) : (b.v === 3) ? new THREE.CylinderGeometry(0.06, 0.06, 0.26, 10).rotateZ(Math.PI / 2) : (b.v === 4) ? new THREE.CylinderGeometry(0.035, 0.035, 0.26, 8).rotateZ(Math.PI / 2) : (it ? new THREE.SphereGeometry(0.07, 8, 6) : new THREE.BoxGeometry(0.14, 0.14, 0.14));
        gV.add(mk(m.translate(px, py + 0.08, 0.16), smat(null, c, { rough: b.v === 1 ? 0.1 : 0.6, emissive: b.v === 2 && it === 2 ? '#8a6a20' : undefined, ei: 0.5 }))); }
      gV.add(mk(new THREE.PlaneGeometry(wd + 0.5, 0.6).rotateX(-Math.PI / 2 + 0.55).translate(0, y0 + ht + 0.32, 0.42), smat('stripes', '#ffffff', { side: THREE.DoubleSide, bump: 0.3 })));
      gV.position.set(vx, 0, h + 0.02); gV.scale.setScalar(0.66); o.add(gV);
    }
    // lampião ao lado da porta
    const lp = grp(mk(new THREE.BoxGeometry(0.04, 0.04, 0.25).translate(0, 0, 0.12), IRON()), mk(new THREE.BoxGeometry(0.14, 0.2, 0.14).translate(0, -0.12, 0.25), smat(null, '#ffd890', { emissive: '#ffbb60', ei: night ? 1.6 : 0.6 })));
    lp.position.set(doorX - 0.55, 1.15, h + 0.02); lp.scale.setScalar(0.7); o.add(lp);
  }
  if (b.kind === 'hotel') mHotelFacade(o, b, H, night, trimM);
  if (b.kind === 'tavern') mTavernFacade(o, b, H, RH, night, trimM);
  if (b.kind === 'boutique') {
    const gold = smat(null, '#d4a94a', { metal: 1, rough: 0.28 }), velvet = smat('cloth', '#6e1424', { bump: 0.5, side: THREE.DoubleSide }), glass = smat(null, '#2a3440', { rough: 0.05, metal: 0.4, emissive: '#5a3a14', ei: night ? 0.9 : 0.25 }), lead = smat(null, '#2a2420', { metal: 0.6 });
    const H0 = bldDims(b).H;
    // faixa dourada no topo e no rodapé, pilastras nos cantos
    for (const [ww, dd, x, z] of [[w + 0.08, 0.1, w / 2, h + 0.02], [0.1, h + 0.08, w + 0.02, h / 2]]) { o.add(mk(new THREE.BoxGeometry(ww, 0.12, dd).translate(x, H0 - 0.1, z), gold)); o.add(mk(new THREE.BoxGeometry(ww, 0.08, dd).translate(x, 0.18, z), gold)); }
    for (const [x, z] of [[0.05, h + 0.03], [w + 0.03, h + 0.03], [w + 0.03, 0.05]]) o.add(mk(new THREE.BoxGeometry(0.18, H0, 0.18).translate(x, H0 / 2, z), smat('brick', '#f4eee0', { bump: 0.8 })));
    // janelões: dois na frente (fora da porta) e dois no lado direito, com caixilho em chumbo, moldura de ouro e toldo vinho
    const win = (x, z, side) => { const gw = grp(), ww = 1.05, wh = 1.45, y0 = 0.45;
      gw.add(mk(new THREE.BoxGeometry(ww + 0.14, wh + 0.14, 0.05).translate(0, y0 + wh / 2, 0.01), gold)); gw.add(mk(new THREE.BoxGeometry(ww, wh, 0.03).translate(0, y0 + wh / 2, 0.035), glass));
      for (let k = 1; k < 4; k++) gw.add(mk(new THREE.BoxGeometry(0.02, wh, 0.02).translate(-ww / 2 + k * ww / 4, y0 + wh / 2, 0.05), lead));
      for (let k = 1; k < 5; k++) gw.add(mk(new THREE.BoxGeometry(ww, 0.02, 0.02).translate(0, y0 + k * wh / 5, 0.05), lead));
      const aw = mk(new THREE.PlaneGeometry(ww + 0.35, 0.62).rotateX(-Math.PI / 2 + 0.6).translate(0, y0 + wh + 0.3, 0.26), velvet); gw.add(aw);
      for (let k = 0; k < 7; k++) gw.add(mk(new THREE.ConeGeometry(0.05, 0.12, 4).rotateX(Math.PI).translate(-ww / 2 - 0.12 + k * (ww + 0.24) / 6, y0 + wh + 0.04, 0.53), gold));
      if (side) { gw.rotation.y = Math.PI / 2; gw.position.set(w + 0.02, 0, z); } else gw.position.set(x, 0, h + 0.02); o.add(gw); };
    const dX = doorCol(b) + 0.5; for (const x of [1.15, w - 1.15]) if (Math.abs(x - dX) > 1.3) win(x, 0, false); win(0, h * 0.3, true); win(0, h * 0.72, true);
    // brasão dourado sobre a porta e letreiro
    const crest = grp(); crest.add(mk(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 6).rotateX(Math.PI / 2), velvet)); crest.add(mk(new THREE.TorusGeometry(0.34, 0.035, 6, 6).rotateZ(Math.PI / 6), gold));
    const cr = new THREE.Shape(); cr.moveTo(-0.2, -0.08); cr.lineTo(-0.2, 0.1); cr.lineTo(-0.1, 0.02); cr.lineTo(0, 0.14); cr.lineTo(0.1, 0.02); cr.lineTo(0.2, 0.1); cr.lineTo(0.2, -0.08); cr.closePath(); crest.add(mk(new THREE.ExtrudeGeometry(cr, { depth: 0.04, bevelEnabled: false }).translate(0, 0, 0.03), gold));
    crest.position.set(dX, Math.min(H0 - 0.6, 2.45), h + 0.06); o.add(crest);
    // vasos com arbustos podados ladeando a porta
    for (const s of [-0.95, 0.95]) { const p = grp(); p.add(mk(new THREE.CylinderGeometry(0.2, 0.15, 0.36, 10).translate(0, 0.18, 0), smat('brick', '#ece4d4'))); p.add(mk(new THREE.SphereGeometry(0.24, 12, 10).translate(0, 0.58, 0), smat(null, '#2e5a2a', { rough: 0.9 }))); p.position.set(dX + s, 0, h + 0.38); o.add(p); }
  }
  if (b.kind === 'fruithouse') {
    const flowers = ['#e83a4a', '#f4c43a', '#f08ac8', '#ffffff'], box = smat('wood', '#6a4226', { bump: 1 }), leaf = smat(null, '#3e7a2a', { rough: 0.9 });
    const fbox = (x, z, side) => { const g2 = grp(); g2.add(mk(new THREE.BoxGeometry(0.75, 0.16, 0.22).translate(0, 1.0, 0.13), box)); for (let k = 0; k < 9; k++) { g2.add(mk(new THREE.SphereGeometry(0.06, 6, 5).translate(-0.3 + (k % 5) * 0.15, 1.13, 0.08 + Math.floor(k / 5) * 0.1), leaf)); g2.add(mk(new THREE.SphereGeometry(0.035, 6, 5).translate(-0.3 + (k % 5) * 0.15 + 0.03, 1.18, 0.1 + Math.floor(k / 5) * 0.1), smat(null, flowers[k % 4]))); }
      if (side) { g2.rotation.y = Math.PI / 2; g2.position.set(w + 0.02, 0, z); } else g2.position.set(x, 0, h + 0.02); o.add(g2); };
    const dX = doorCol(b) + 0.5; for (const x of [0.9, w - 0.9]) if (Math.abs(x - dX) > 1) fbox(x, 0, false); fbox(0, h * 0.5, true);
    // hera subindo no canto e cestos de maçã na porta
    for (let k = 0; k < 26; k++) o.add(mk(new THREE.SphereGeometry(0.08 + (k % 3) * 0.02, 6, 5).translate(w + 0.05, 0.2 + k * 0.08 + Math.sin(k) * 0.05, 0.25 + Math.sin(k * 1.7) * 0.18), leaf));
    for (const s of [-0.62, 0.62]) { const bk = grp(); bk.add(mk(new THREE.CylinderGeometry(0.17, 0.13, 0.22, 10, 1, true).translate(0, 0.11, 0), smat('wood', '#a8803a', { side: THREE.DoubleSide }))); for (let k = 0; k < 6; k++) bk.add(mk(new THREE.SphereGeometry(0.06, 7, 5).translate(Math.cos(k) * 0.08, 0.22, Math.sin(k) * 0.08), smat(null, k % 3 ? '#c02a1e' : '#e8c03a', { rough: 0.45 }))); bk.position.set(dX + s, 0, h + 0.3); o.add(bk); }
  }
  if (b.kind === 'workshop' && b.wk === 'mill') {   // pás do moinho de vento na fachada
    const { H: H1 } = bldDims(b), wood = smat('wood', '#5a3a20'), cloth2 = smat('cloth', '#efe6d0', { side: THREE.DoubleSide }), hub = grp(); hub.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10).rotateX(Math.PI / 2), wood));
    for (let k = 0; k < 4; k++) { const arm = grp(mk(new THREE.BoxGeometry(0.08, 1.6, 0.05).translate(0, 0.85, 0), wood), mk(new THREE.PlaneGeometry(0.42, 1.25).translate(0.24, 0.95, 0.03), cloth2)); arm.rotation.z = k * Math.PI / 2 + 0.3; hub.add(arm); }
    hub.position.set(w / 2, H1 - 0.2, h + 0.2); o.add(hub); }
  if (b.kind === 'workshop' && b.wk === 'bakery') mBakeryFacade(o, b, H, night, trimM);
  if (b.kind === 'shop' && b.v === 6) {   // fachada da alquimista: vitrais coloridos com moldura de latão, frascos brilhando, lanternas e placa da lua
    const brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.28 }), dX = doorCol(b) + 0.5, cols = ['#7ad8e8', '#e86ac8', '#a8e86a', '#e8c84a', '#8a6ae8'], { H: H0, RH: RH0 } = bldDims(b);
    // porta única em arco de latão, com vitral redondo em cima
    { const gd = grp(); for (const s of [-0.55, 0.55]) gd.add(mk(new THREE.BoxGeometry(0.08, 1.9, 0.1).translate(s, 0.95, 0.06), brass)); gd.add(mk(new THREE.TorusGeometry(0.55, 0.05, 6, 20, Math.PI).translate(0, 1.9, 0.06), brass));
      gd.add(mk(new THREE.CircleGeometry(0.3, 20).translate(0, 2.55, 0.05), smat(null, '#8a6ae8', { emissive: '#6a4ad8', ei: night ? 1.4 : 0.5, rough: 0.1 }))); gd.add(mk(new THREE.TorusGeometry(0.3, 0.04, 6, 20).translate(0, 2.55, 0.07), brass));
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; gd.add(mk(new THREE.BoxGeometry(0.02, 0.28, 0.01).rotateZ(a).translate(0, 2.55, 0.08), brass)); }
      gd.position.set(dX, 0, h + 0.01); o.add(gd); }
    // constelações pintadas na parede e frascos pendurados na marquise
    for (const [px, pz, ry] of [[w * 0.5, h + 0.02, 0], [w + 0.02, h * 0.5, Math.PI / 2]]) { const pl = mk(new THREE.PlaneGeometry(1.6, 0.9).translate(0, H0 - 0.8, 0), smat('constell', '#ffffff', { rough: 0.8, transparent: true, opacity: 0.85 })); pl.rotation.y = ry; pl.position.set(px, 0, pz); if (ry === 0) pl.position.x = dX + 1.8 > w - 0.8 ? dX - 1.8 : dX + 1.8; o.add(pl); }
    { const aw = grp(); aw.add(mk(new THREE.BoxGeometry(2.0, 0.06, 0.5).translate(0, 2.1, 0.25), brass)); for (let k = 0; k < 6; k++) { const c = cols[k % 5]; aw.add(mk(new THREE.CylinderGeometry(0.004, 0.004, 0.25, 4).translate(-0.85 + k * 0.34, 1.95, 0.45), brass)); aw.add(mk(new THREE.SphereGeometry(0.07, 10, 8).translate(-0.85 + k * 0.34, 1.78, 0.45), smat(null, c, { emissive: c, ei: night ? 1.6 : 0.7, rough: 0.1 }))); }
      aw.position.set(dX, 0, h); o.add(aw); }
    // plantas brilhantes em vasos dos dois lados da porta
    for (const s of [-1.05, 1.05]) { const pt = grp(); pt.add(mk(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12).translate(0, 0.14, 0), smat(null, '#5a3a4a', { rough: 0.6 }))); for (let k = 0; k < 7; k++) pt.add(mk(new THREE.SphereGeometry(0.05 + (k % 3) * 0.015, 8, 6).translate(Math.cos(k * 1.7) * 0.1, 0.35 + (k % 4) * 0.08, Math.sin(k * 1.7) * 0.1), smat(null, k % 2 ? '#6af0c8' : '#c88af0', { emissive: k % 2 ? '#3ac8a0' : '#9a5ad8', ei: 1.1 })));
      pt.position.set(dX + s, 0, h + 0.3); o.add(pt); }
    // torre de observatório no canto do fundo: corpo de pedra, cúpula de vidro e latão, telescópio e a lua no topo
    { const tw = grp(), th = H0 + RH0 + 1.6, tx = w - 0.7, tz = 0.7; tw.add(mk(new THREE.CylinderGeometry(0.62, 0.68, th, 14).translate(0, th / 2, 0), smat('stoneblock', '#3e3a52', { bump: 1 })));
      for (let k = 0; k < 3; k++) tw.add(mk(new THREE.BoxGeometry(0.16, 0.34, 0.04).translate(0, th * (0.45 + k * 0.17), 0.66), smat(null, '#7ad8e8', { emissive: '#4ab8c8', ei: night ? 1.4 : 0.5 })));
      tw.add(mk(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 16).translate(0, th, 0), brass)); tw.add(mk(new THREE.SphereGeometry(0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, th + 0.05, 0), smat(null, '#9ab8e8', { rough: 0.05, metal: 0.3, transparent: true, opacity: 0.55, emissive: '#3a4a8a', ei: night ? 0.8 : 0.2 })));
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const rib = mk(new THREE.TorusGeometry(0.6, 0.02, 4, 12, Math.PI / 2).rotateY(a).translate(0, th + 0.05, 0), brass); tw.add(rib); }
      const tel = mk(new THREE.CylinderGeometry(0.05, 0.08, 0.9, 10).rotateZ(-0.9).translate(0.32, th + 0.55, 0.1), brass); tw.add(tel);
      tw.add(mk(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6).translate(0, th + 0.9, 0), brass)); const moon = grp(mk(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20).rotateX(Math.PI / 2), smat(null, '#e8ecf4', { emissive: '#c8d8f8', ei: night ? 1.6 : 0.5 })), mk(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20).rotateX(Math.PI / 2).translate(0.08, 0.04, 0), smat(null, '#3e3a52'))); moon.position.set(0, th + 1.3, 0); tw.add(moon);
      tw.position.set(tx, 0, tz); o.add(tw); }
    for (const vx of [0.9, w - 0.9]) { if (Math.abs(vx - dX) < 1.1) continue; const gv = grp(); gv.add(wbox(1.0, 1.15, 0.08, 0, 1.25, 0.04, brass, 1));
      for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 3; c2++) gv.add(mk(new THREE.BoxGeometry(0.28, 0.33, 0.02).translate(-0.3 + c2 * 0.3, 0.9 + r * 0.35, 0.09), smat(null, cols[(r * 3 + c2 + Math.round(vx)) % 5], { emissive: cols[(r * 3 + c2 + Math.round(vx)) % 5], ei: night ? 1.2 : 0.45, rough: 0.1, transparent: true, opacity: 0.85 })));
      for (let k = 0; k < 5; k++) gv.add(mk(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 8).translate(-0.36 + k * 0.18, 0.72, 0.16), smat(null, cols[k], { emissive: cols[k], ei: 1.0, rough: 0.1 })));
      gv.add(wbox(1.1, 0.06, 0.24, 0, 0.64, 0.12, brass, 1)); gv.position.set(vx, 0, h + 0.01); o.add(gv); }
    for (const sx of [-0.6, 0.6]) { const lp = grp(mk(new THREE.BoxGeometry(0.04, 0.04, 0.2).translate(0, 0, 0.1), brass), mk(new THREE.SphereGeometry(0.1, 10, 8).translate(0, -0.1, 0.22), smat(null, '#9ae8d8', { emissive: '#5ad8c8', ei: night ? 2 : 0.8 }))); lp.position.set(dX + sx, 1.6, h + 0.02); lp.scale.setScalar(0.8); o.add(lp); }
    const sg = grp(); sg.add(mk(new THREE.BoxGeometry(0.05, 0.05, 0.55).translate(0, 0, 0.27), brass)); sg.add(mk(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 20).rotateX(Math.PI / 2).translate(0, -0.3, 0.42), brass));
    sg.add(mk(new THREE.CircleGeometry(0.2, 20).translate(0, -0.3, 0.44), smat(null, '#e8ecf4', { emissive: '#c8d8f8', ei: night ? 1.4 : 0.4 }))); sg.add(mk(new THREE.CircleGeometry(0.17, 20).translate(0.07, -0.27, 0.445), smat(null, '#3e3a52'))); sg.position.set(dX + 1.05, 2.05, h + 0.02); o.add(sg);   // lua crescente
  }
  if (b.office) {
    const dX = doorCol(b) + 0.5, bronze = smat(null, '#b08a3a', { metal: 0.9, rough: 0.3 }), stone = smat('stoneblock', '#d8d0bc', { bump: 1 });
    for (let s = 0; s < 2; s++) o.add(wbox(1.3 - s * 0.2, 0.09, 0.32 - s * 0.12, dX, 0.045 + s * 0.09, h + 0.16 - s * 0.06, stone, 1));   // degraus
    const SGK = b.office === 'agency' ? 'handsign' : 'keysign', ADK = b.office === 'agency' ? 'jobboard' : 'adsboard';
    const sg = grp(); sg.add(mk(new THREE.BoxGeometry(0.05, 0.05, 0.6).translate(0, 0, 0.3), bronze)); sg.add(mk(new THREE.BoxGeometry(0.03, 0.42, 0.5).translate(0, -0.3, 0.38), [smat(SGK, '#ffffff', { bump: 0.5 }), smat(SGK, '#ffffff', { bump: 0.5 }), bronze, bronze, bronze, bronze]));
    sg.position.set(dX + 0.95, 2.1, h + 0.02); o.add(sg);   // placa pendurada com a chave de bronze
    if (b.realDoor === 'W' || b.realDoor === 'N') { const s2 = sg.clone(); s2.rotation.y = Math.PI / 2; s2.position.set(w + 0.02, 2.1, h * 0.5); o.add(s2); }   // porta num lado escondido: placa também no lado que a câmera vê
    const vt = grp(); vt.add(wbox(1.1, 0.9, 0.12, 0, 1.15, 0.06, bronze, 1)); vt.add(mk(new THREE.PlaneGeometry(0.98, 0.78).translate(0, 1.15, 0.125), smat(ADK, '#ffffff', { rough: 0.6, emissive: night ? '#3a2a10' : '#000000', ei: night ? 0.6 : 0 })));
    vt.add(wbox(1.2, 0.08, 0.22, 0, 0.66, 0.1, stone, 1)); vt.position.set(dX - 1.55 < 0.6 ? dX + 1.6 : dX - 1.55, 0, h + 0.01); o.add(vt); if (b.realDoor === 'W' || b.realDoor === 'N') { const v2 = vt.clone(); v2.rotation.y = Math.PI / 2; v2.position.set(w + 0.01, 0, h * 0.25 + 0.4); o.add(v2); }   // vitrine com anúncios de imóveis
    for (const sx of [-0.62, 0.62]) { const lp = grp(mk(new THREE.BoxGeometry(0.04, 0.04, 0.2).translate(0, 0, 0.1), bronze), mk(new THREE.BoxGeometry(0.13, 0.19, 0.13).translate(0, -0.11, 0.2), smat(null, '#ffd890', { emissive: '#ffbb60', ei: night ? 1.6 : 0.5 }))); lp.position.set(dX + sx, 1.55, h + 0.02); lp.scale.setScalar(0.7); o.add(lp); }
  }
  if (b.kind === 'tavern' || (b.kind === 'shop' && !b.deco)) { const br = mBarrel(); br.scale.setScalar(0.8); br.position.set(w + 0.32, 0, h * 0.25); o.add(br); }
  if (b.deco === 'arcane') mArcaneFacade(o, b, H, night, trimM);
  if (b.deco === 'tailor') mTailorFacade(o, b, H, night, trimM);
  for (let f = 0; f < floors - 1; f++) if (stairKind(b, f) === 'ext') mExtStair(o, b, stairSpec(b, f), fh, f, night);
  if (b.kind === 'bank') {   // pórtico de colunas brancas, frontão com o brasão dourado e escadaria (estilo Gringotts)
    const marble = smat('stoneblock', '#f2ede2', { bump: 0.8 }), gold = smat(null, '#d4a94a', { metal: 1, rough: 0.3 }), n = 6, z0 = h + 0.75, Hc = H - 0.2;
    for (let k = 0; k < 3; k++) o.add(wbox(w + 0.6 - k * 0.2, 0.14, 1.3 - k * 0.32, w / 2, 0.07 + k * 0.14, h + 0.65 - k * 0.16, marble, 1));
    const dXc = doorCol(b) + 0.5, colX = []; for (let x = dXc - 1.15; x >= 0.3; x -= 1.05) colX.push(x); for (let x = dXc + 1.15; x <= w - 0.3; x += 1.05) colX.push(x);
    for (let k = 0; k < colX.length; k++) { const x = colX[k];   /* vão largo na frente da porta */ o.add(mk(new THREE.CylinderGeometry(0.17, 0.2, Hc - 0.5, 14).translate(x, 0.42 + (Hc - 0.5) / 2, z0), marble)); o.add(wbox(0.46, 0.14, 0.46, x, 0.49, z0, marble, 1)); o.add(wbox(0.46, 0.16, 0.46, x, Hc - 0.02, z0, marble, 1)); }
    o.add(wbox(w + 0.3, 0.32, 1.0, w / 2, Hc + 0.22, h + 0.55, marble, 1));
    const tri = new THREE.Shape(); tri.moveTo(-w / 2 - 0.15, 0); tri.lineTo(w / 2 + 0.15, 0); tri.lineTo(0, 1.0); tri.closePath();
    o.add(mk(new THREE.ExtrudeGeometry(tri, { depth: 0.9, bevelEnabled: false }).translate(w / 2, Hc + 0.38, h + 0.1), marble));
    o.add(mk(new THREE.CircleGeometry(0.28, 16).translate(w / 2, Hc + 0.72, h + 1.01), gold)); o.add(mk(new THREE.TorusGeometry(0.28, 0.03, 6, 20).translate(w / 2, Hc + 0.72, h + 1.02), gold));
  }
  if (b.kind === 'stable') { const hy = mHay(); hy.position.set(w + 0.5, 0, h * 0.5); hy.rotation.y = Math.PI / 2; o.add(hy); }
  if (b.kind === 'smith') { o.add(mk(CYL(0.3, 0.34, 0.5, w + 0.45, 0.25, 0.7, 12), smat('brick', '#6a665e'))); o.add(mk(CYL(0.26, 0.26, 0.03, w + 0.45, 0.51, 0.7, 12), smat(null, '#3a1208', { emissive: '#ff5a10', ei: 0.8 }))); }
  return o;
}

// ============================================================
//  INTERIORES (aparecem quando o telhado some)
// ============================================================
// ---------- interior do Dojô do Punho de Ferro: paredes de cada andar (dojô, apartamento, suíte), janelas japonesas, piso da suíte e a varanda ----------
function machiyaInterior(o, b, fl, { w, h, hw, t, nF, knee }) {
  const top = fl >= nF - 1, HW = Math.min(hw, 2.3), dk = smat('wood', '#3a2212', { bump: 1 }), lacq = smat(null, '#120a08', { rough: 0.25, metal: 0.1 }), brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 });
  const post = top ? lacq : dk;
  // paredes altas do fundo (z = 0) e da direita (x = w): faixas do estilo do andar
  const walls = [['back', 0, w], ['right', 0, h]].filter(([f]) => !knee.includes(f));
  for (const [f, a0, a1] of walls) {
    const at = (u, y, len, hh, m, depth = 0.03) => o.add(f === 'back' ? mk(wuv(new THREE.BoxGeometry(len, hh, depth).translate(u, y, t + depth / 2 + 0.002), 1), m) : mk(wuv(new THREE.BoxGeometry(depth, hh, len).translate(w - t - depth / 2 - 0.002, y, u), 1), m));
    const panel = (u, y, len, hh, kind) => { const g2 = mk(new THREE.PlaneGeometry(len, hh), smat(kind, '#ffffff', { bump: 0.4 })); if (f === 'back') g2.position.set(u, y, t + 0.035); else { g2.rotation.y = -Math.PI / 2; g2.position.set(w - t - 0.035, y, u); } o.add(g2); };
    if (fl === 0) { at((a0 + a1) / 2, 0.55, a1 - a0, 1.1, smat('oldplank', '#5a3a22', { bump: 1.2 }), 0.04); at((a0 + a1) / 2, 1.12, a1 - a0, 0.06, dk, 0.06); at((a0 + a1) / 2, 1.95, a1 - a0, 0.1, dk, 0.07);   /* rodapé alto de madeira e a viga nageshi */
      if (f === 'back') panel(2.4, 1.55, 2.8, 0.42, 'nafuda'); }
    else if (!top) { for (let u = a0; u < a1 - 0.01; u += 1) panel(u + 0.5, 0.97, 0.98, 1.86, 'fusuma'); at((a0 + a1) / 2, 1.93, a1 - a0, 0.08, dk, 0.06); at((a0 + a1) / 2, 2.1, a1 - a0, 0.06, dk, 0.05); }
    else { const rose = smat('oldplank', '#3a140a', { bump: 0.5, rough: 0.28, metal: 0.06 }), silver = smat(null, '#c8ccd4', { metal: 0.95, rough: 0.22 }), goldL = smat(null, '#e0b450', { metal: 0.95, rough: 0.2 });
      const c0 = f === 'back' ? Math.max(a0, 2) : a0;   /* atrás do ofurô (u 0..2) a parede é a rocha da cascata */
      at((c0 + a1) / 2, 0.3, a1 - c0, 0.6, rose, 0.05); at((c0 + a1) / 2, 0.61, a1 - c0, 0.03, silver, 0.07); at((c0 + a1) / 2, 0.08, a1 - c0, 0.04, goldL, 0.07);   /* lambri de jacarandá com friso de prata e rodapé de ouro */
      for (let u = c0; u < a1 - 0.01; u += 1) { const g3 = new THREE.PlaneGeometry(0.98, 1.1), uv = g3.attributes.uv, t0 = (u - a0) / (a1 - a0), t1 = (u + 1 - a0) / (a1 - a0), off = f === 'back' ? 0 : 0.5; for (let q = 0; q < uv.count; q++) uv.setX(q, off * 0 + (uv.getX(q) > 0.5 ? t1 : t0)); const m3 = mk(g3, smat('kanoland', '#ffffff', { bump: 0.25, rough: 0.45, metal: 0.25 })); if (f === 'back') m3.position.set(u + 0.5, 1.15, t + 0.035); else { m3.rotation.y = -Math.PI / 2; m3.position.set(w - t - 0.035, 1.15, u + 0.5); } o.add(m3); }   /* paisagem contínua */ panel((c0 + a1) / 2, 1.95, a1 - c0, 0.34, 'ranma'); at((c0 + a1) / 2, 1.73, a1 - c0, 0.06, goldL, 0.07); at((a0 + a1) / 2, 2.15, a1 - a0, 0.08, rose, 0.07); at((a0 + a1) / 2, 2.2, a1 - a0, 0.03, silver, 0.08); }
    for (let u = a0; u <= a1 + 0.001; u += (fl === 0 ? 1 : 2)) { at(u, HW / 2, 0.1, HW, post, 0.07); if (top) { at(u, 1.74, 0.13, 0.05, brass, 0.08); at(u, 0.06, 0.14, 0.12, brass, 0.08); at(u, HW - 0.04, 0.14, 0.08, brass, 0.08); } }
  }
  // janelas japonesas na parede do fundo: treliça de bambu no dojô, shoji nos apartamentos, marumado redonda e shoji na suíte
  if (!knee.includes('back')) { const bamboo = smat(null, '#9aa860', { rough: 0.6 }), paper = smat('shoji', '#ffffff', { emissive: '#fff0d0', ei: 0.35, bump: 0.3 });
    const xs = fl === 0 ? [1.0, 4.4] : !top ? [1.5, 4.5] : [4.6];
    for (const x of xs) { if (fl === 0) { o.add(wbox(1.0, 0.5, 0.05, x, 1.6, t + 0.03, paper, 1)); o.add(wbox(1.08, 0.06, 0.08, x, 1.88, t + 0.05, dk, 1)); o.add(wbox(1.08, 0.06, 0.08, x, 1.32, t + 0.05, dk, 1)); for (let k = 0; k < 8; k++) o.add(mk(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 5).translate(x - 0.44 + k * 0.125, 1.6, t + 0.09), bamboo)); }
      else { o.add(wbox(0.9, 0.85, 0.04, x, 1.25, t + 0.03, paper, 1)); for (const y of [0.8, 1.7]) o.add(wbox(0.98, 0.06, 0.07, x, y, t + 0.05, post, 1)); for (const dx2 of [-0.47, 0.47]) o.add(wbox(0.06, 0.96, 0.07, x + dx2, 1.25, t + 0.05, post, 1)); } }
  }
  if (top) {   /* cortina de seda vinho com barra dourada, do fundo (oeste) até o meio da sala, separando o banho da cama; e luzes quentes */
    const goldC = smat(null, '#d4a94a', { metal: 0.9, rough: 0.3 });
    { const teak = smat('oldplank', '#6a3a1e', { bump: 0.8, rough: 0.4 }), teak2 = smat('oldplank', '#8a5230', { bump: 0.8, rough: 0.4 });   /* deque de madeira (sunoko) em volta do ofurô: transição entre o piso e a banheira */
      for (let k = 0; k < 9; k++) { const z = 0.1 + k * 0.29; o.add(mk(wuv(new THREE.BoxGeometry(2.55, 0.035, 0.24).translate(1.28, 0.085, z), 1), k % 2 ? teak : teak2)); }
      o.add(wbox(0.05, 0.04, 2.6, 2.58, 0.09, 1.3, goldC, 1)); o.add(wbox(2.6, 0.04, 0.05, 1.3, 0.09, 2.6, goldC, 1)); }
    for (const [lx, ly, lz, pw] of [[1.0, 1.75, 1.2, 0.75], [4.9, 1.7, 1.0, 0.7], [4.5, 1.6, 2.6, 0.6], [0.9, 1.5, 3.9, 0.45], [5.4, 1.5, 4.2, 0.45], [3.2, 1.2, 1.6, 0.4]]) { const pl = new THREE.PointLight(0xff9a40, pw, 3.8); pl.position.set(lx, ly, lz); o.add(pl); }
    for (const [lx, lz] of [[1.0, 1.2], [4.5, 2.6]]) { const ch = grp(mk(new THREE.SphereGeometry(0.16, 14, 10).scale(1, 1.25, 1), smat('shoji', '#ffffff', { emissive: '#ffb860', ei: 1.1, bump: 0.2 })), mk(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10).translate(0, 0.21, 0), lacq), mk(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10).translate(0, -0.21, 0), lacq), mk(new THREE.CylinderGeometry(0.005, 0.005, 0.4, 4).translate(0, 0.42, 0), lacq)); ch.position.set(lx, Math.min(hw, 2.3) - 0.62, lz); o.add(ch); }   /* lanternas chōchin penduradas */
  }
  // piso da suíte: ilhas de tatame com borda de brocado dourado e o engawa de hinoki junto à varanda
  if (top) { const tat = smat('tatami', '#ffffff', { bump: 0.6 }), gold = smat(null, '#c9a24a', { metal: 0.6, rough: 0.35 }), hin = smat('oldplank', '#d8a868', { bump: 0.6, rough: 0.35 });
    for (const [u0, v0, u1, v1] of [[2.9, 1.9, 6.0, 3.6], [3.9, 0.05, 6.0, 1.95]]) { o.add(mk(wuv(new THREE.BoxGeometry(u1 - u0, 0.03, v1 - v0).translate((u0 + u1) / 2, 0.075, (v0 + v1) / 2), 1), tat)); for (const [x0, z0, x1, z1] of [[u0, v0, u1, v0], [u0, v1, u1, v1], [u0, v0, u0, v1], [u1, v0, u1, v1]]) o.add(wbox(Math.max(0.06, x1 - x0), 0.035, Math.max(0.06, z1 - z0), (x0 + x1) / 2, 0.08, (z0 + z1) / 2, gold, 1)); }
    o.add(mk(wuv(new THREE.BoxGeometry(6.0 - 0.15, 0.03, 0.6).translate(3.0, 0.075, h - 0.38), 1), hin)); }
  // varanda: piso fora da fachada, guarda-corpo de ripas, vasos; portas de correr nos vãos da fachada
  const bc = balconyOf(b, fl); if (bc) { const hin = smat('oldplank', '#c8945a', { bump: 1 }), rail = smat('wood', '#9a6838', { bump: 0.8 }), iron = smat(null, '#1a1816', { metal: 0.7, rough: 0.45 }), [u0, u1] = bc;
    o.add(mk(wuv(new THREE.BoxGeometry(u1 - u0, 0.08, 1.0).translate((u0 + u1) / 2, 0.02, h + 0.5), 1), hin));
    for (let u = u0; u <= u1 + 0.001; u += 1) { o.add(wbox(0.08, 0.95, 0.08, u, 0.48, h + 0.96, rail, 1)); o.add(wbox(0.1, 0.05, 0.1, u, 0.98, h + 0.96, iron, 1)); }
    o.add(wbox(u1 - u0 + 0.08, 0.06, 0.08, (u0 + u1) / 2, 0.95, h + 0.96, rail, 1)); o.add(wbox(u1 - u0, 0.04, 0.05, (u0 + u1) / 2, 0.3, h + 0.96, rail, 1));
    for (let u = u0 + 0.15; u < u1; u += 0.17) o.add(wbox(0.025, 0.62, 0.025, u, 0.62, h + 0.96, rail, 1));
    for (const u of [u0 + 0.4, u1 - 0.4]) { o.add(mk(new THREE.CylinderGeometry(0.13, 0.1, 0.22, 10).translate(u, 0.15, h + 0.6), smat(null, '#8a5a3a'))); o.add(mk(new THREE.SphereGeometry(0.19, 10, 8).scale(1, 0.8, 1).translate(u, 0.4, h + 0.6), smat(null, '#4a7a34'))); }
    if (!top) for (let k = 0; k < 2; k++) o.add(mk(new THREE.PlaneGeometry(0.45, 0.55).translate(0.9 + k * 3.2, 1.55, h + 0.55), smat(null, ['#6a8ab8', '#e8e0d0'][k], { side: THREE.DoubleSide })));
    const sp = smat('shoji', '#ffffff', { bump: 0.3 });
    for (const [a, c] of fl < nF - 1 ? [[1, 2], [4, 5], [7, 8]] : [[2, 4]]) { o.add(wbox(0.06, 2.0, 0.08, a, 1.0, h - 0.04, post, 1)); o.add(wbox(0.06, 2.0, 0.08, c, 1.0, h - 0.04, post, 1)); o.add(wbox(c - a + 0.06, 0.08, 0.08, (a + c) / 2, 2.0, h - 0.04, post, 1)); o.add(wbox(c - a, 0.02, 0.1, (a + c) / 2, 0.02, h - 0.04, brass, 1)); }   /* batentes e trilho; as folhas deslizam (desenhadas no jogo) */
  }
}
function mInterior(b, fl = 0) {
  const [w, h] = bDims(b), { H } = bldDims(b), o = grp(), L = interiorLayout(b, fl), R = rng(b.x * 13 + b.y), nF = floorsOf(b);
  const stoneK = b.kind === 'bank' || b.kind === 'temple' || b.kind === 'castle' || b.kind === 'smith' || b.kind === 'barracks' || b.kind === 'jail' || b.kind === 'boutique' || b.kind === 'manor';
  const hotelI = b.kind === 'hotel';
  const floorM = fl < 0 ? smat('stoneblock', '#5e584e', { bump: 1.5 }) : b.deco === 'machiya' ? (fl === 0 ? smat('oldplank', '#a8865a', { bump: 1.1 }) : fl >= nF - 1 ? smat('oldplank', '#2a1610', { bump: 0.5, rough: 0.28, metal: 0.08 }) : smat('tatami', '#ffffff', { bump: 0.6 })) : b.deco === 'greenhouse' ? smat('stoneblock', '#8e9286', { bump: 1 }) : b.kind === 'tavern' ? smat('oldplank', '#6a4a2c', { bump: 1.3 }) : b.deco === 'arcane' ? smat('oldplank', '#5a3e28', { bump: 1.3 }) : b.deco === 'tailor' ? smat('oldplank', '#8a5a4a', { bump: 1 }) : b.kind === 'shop' && b.v === 6 ? smat('stoneblock', '#3a3644', { bump: 0.8 }) : hotelI ? smat('oldplank', '#8a6440', { bump: 1.3 }) : b.kind === 'bank' ? smat('marblechk', '#ffffff', { bump: 0.4, rough: 0.35 }) : stoneK ? smat('stoneblock', b.kind === 'castle' ? '#a8a092' : '#8e887c', { bump: 1 }) : smat('wood', b.kind === 'stable' ? '#8a6a3e' : '#7a5232', { bump: 1.2 });
  const wallM = fl < 0 ? smat('brick', '#6e675c', { bump: 1.5 }) : b.deco === 'machiya' ? smat('plaster', '#e6dcc4', { bump: 0.5 }) : b.deco === 'greenhouse' ? smat(null, '#cfeedd', { rough: 0.05, metal: 0.25, transparent: true, opacity: 0.3 }) : b.kind === 'tavern' ? smat('oldplank', '#5e4028', { bump: 1.2 }) : b.deco === 'arcane' ? smat('oldplank', '#3a2a20', { bump: 1.2 }) : b.deco === 'tailor' ? smat('wallpaper', '#c89ac0', { bump: 0.5 }) : b.kind === 'shop' && b.v === 6 ? smat('stoneblock', '#4a4458', { bump: 1 }) : hotelI ? smat('wallpaper', '#ffffff', { bump: 0.5 }) : stoneK ? smat('brick', b.kind === 'castle' ? '#b4ad9c' : '#a29c90', { bump: 1.2 }) : smat('plaster', '#e2d6bc', { bump: 0.7 });
  const trimM = smat('wood', '#4a2f17'), hw = Math.min(H / nF, b.kind === 'castle' || b.kind === 'temple' ? 5 : 2.3), t = 0.16;
  o.add(mk(wuv(new THREE.BoxGeometry(w, 0.06, h).translate(w / 2, 0.03, h / 2), 1), floorM));
  // quais paredes (no quadro local) ficam viradas para a câmera depende do lado da porta
  const knee = { S: ['front', 'right'], N: ['back', 'left'], E: ['front', 'left'], W: ['back', 'right'] }[b.realDoor || 'S'];
  const KH = 0.34, wallH = f => knee.includes(f) ? KH : hw, dx = doorCol(b) + 0.5;
  const lightWin = smat(null, '#ffe2a8', { emissive: '#ffcc80', ei: 0.7, rough: 0.3 }), capM = smat('stoneblock', '#b0a998', { bump: 1 });
  const wallSeg = (f, w2, d2, x, z) => { const hh = wallH(f); o.add(mk(wuv(new THREE.BoxGeometry(w2, hh, d2).translate(x, hh / 2, z), 0.7), wallM)); if (hh === KH) o.add(mk(new THREE.BoxGeometry(w2 + 0.02, 0.05, d2 + 0.04).translate(x, KH + 0.025, z), capM)); };
  wallSeg('back', w, t, w / 2, t / 2); wallSeg('left', t, h, t / 2, h / 2);
  wallSeg('right', t, h, w - t / 2, h / 2);
  if (b.deco === 'machiya' && fl > 0) { for (const [u0, v0, u1, v1] of iwallsLocal(b, fl) || []) if (Math.abs(v0 - h) < 0.01 && Math.abs(v1 - h) < 0.01) wallSeg('front', u1 - u0, t, (u0 + u1) / 2, h - t / 2); }   /* fachada com os vãos das portas para a varanda */
  else if (b.door2L && fl === 0 && b.door2L[1] === h - 1) { const d2 = b.door2L[0] + 0.5, a0 = Math.min(dx, d2), a1 = Math.max(dx, d2);   /* duas portas na frente (dojô e corredor do elevador) */
    if (a0 - 0.6 > 0) wallSeg('front', a0 - 0.6, t, (a0 - 0.6) / 2, h - t / 2); if (a1 - a0 - 1.2 > 0) wallSeg('front', a1 - a0 - 1.2, t, (a0 + a1) / 2, h - t / 2); if (w - a1 - 0.6 > 0) wallSeg('front', w - a1 - 0.6, t, (a1 + 0.6 + w) / 2, h - t / 2); }
  else { if (dx - 0.6 > 0) wallSeg('front', dx - 0.6, t, (dx - 0.6) / 2, h - t / 2);
  if (w - dx - 0.6 > 0) wallSeg('front', w - dx - 0.6, t, (dx + 0.6 + w) / 2, h - t / 2); }
  if (!knee.includes('front') && !(b.deco === 'machiya' && fl > 0)) o.add(mk(wuv(new THREE.BoxGeometry(1.2, hw - 1.3, t).translate(dx, 1.3 + (hw - 1.3) / 2, h - t / 2), 0.7), wallM));
  if (b.deco === 'machiya') machiyaInterior(o, b, fl, { w, h, hw, t, nF, knee });
  if (fl !== 0 && !knee.includes('front') && b.deco !== 'machiya') o.add(mk(wuv(new THREE.BoxGeometry(1.2, 1.3, t).translate(dx, 0.65, h - t / 2), 0.7), wallM));
  if (fl > 0) o.add(mk(wuv(new THREE.BoxGeometry(w, 0.18, h).translate(w / 2, -0.09, h / 2), 1), smat('wood', '#4e3420', { bump: 1 })));
  // janelas com luz entrando, só nas paredes inteiras
  // janelas de verdade (moldura, 4 vidros, travessas e parapeito) nas paredes inteiras
  const frameM = smat('wood', '#4a2f17'), glassW = smat(null, '#9fb4c0', { emissive: '#6a7a84', ei: 0.35, rough: 0.15, metal: 0.2 });
  const win = (x, z, ry) => { if (fl < 0 || b.deco === 'greenhouse' || b.deco === 'machiya') return;   /* estufa: as paredes já são de vidro */ const g = grp(), y = Math.min(hw * 0.58, 1.5); g.add(mk(new THREE.BoxGeometry(0.5, 0.66, 0.02).translate(0, y, 0.012), glassW, false)); for (const [ww, hh, xx, yy] of [[0.58, 0.05, 0, y + 0.33], [0.58, 0.05, 0, y - 0.33], [0.05, 0.7, -0.27, y], [0.05, 0.7, 0.27, y], [0.03, 0.66, 0, y], [0.5, 0.03, 0, y]]) g.add(mk(new THREE.BoxGeometry(ww, hh, 0.05).translate(xx, yy, 0.02), frameM)); g.add(mk(new THREE.BoxGeometry(0.66, 0.05, 0.12).translate(0, y - 0.37, 0.05), frameM)); g.rotation.y = ry; g.position.set(x, 0, z); o.add(g); };
  if (!knee.includes('back') && b.kind !== 'bank') for (let k = 0; k < Math.floor(w / 2); k++) win(1 + k * 2, t + 0.005, 0);
  if (!knee.includes('left')) for (let k = 0; k < Math.floor(h / 2); k++) win(t + 0.005, 1 + k * 2, Math.PI / 2);
  if (!knee.includes('right')) for (let k = 0; k < Math.floor(h / 2); k++) win(w - t - 0.005, 1 + k * 2, -Math.PI / 2);
  if (!knee.includes('front')) for (let k = 0; k < Math.floor(w / 2); k++) if (Math.abs(1 + k * 2 - dx) > 0.9) win(1 + k * 2, h - t - 0.005, Math.PI);
  // luz quente no meio do cômodo
  { const pl = new THREE.PointLight(0xffd09a, 0.55, Math.max(w, h) * 1.2); pl.position.set(w / 2, 1.6, h / 2); o.add(pl); }
  // ---- luzes e detalhes ----
  if (b.deco !== 'machiya') {
    const iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 }), flameM = smat(null, '#ffd27a', { emissive: '#ff9a30', ei: 2.6 }), wax = smat(null, '#efe4c8', { rough: 0.6 });
    const used = new Set(L.F.flatMap(f => { const c = []; for (let a2 = 0; a2 < f.w; a2++) for (let b2 = 0; b2 < f.h; b2++) c.push((f.i + a2) + ',' + (f.j + b2)); return c; }));
    // arandela com vela acesa presa à parede (wall: 'back' ou 'left')
    const sconce = (wall, pos) => {
      const g2 = grp(), y = Math.min(hw - 0.35, 1.55);
      g2.add(mk(new THREE.BoxGeometry(0.08, 0.22, 0.04).translate(0, y, 0.02), iron));
      g2.add(mk(new THREE.BoxGeometry(0.06, 0.04, 0.2).translate(0, y - 0.08, 0.12), iron));
      g2.add(mk(new THREE.CylinderGeometry(0.07, 0.05, 0.04, 8).translate(0, y - 0.05, 0.2), iron));
      g2.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6).translate(0, y + 0.04, 0.2), wax));
      g2.add(mk(new THREE.ConeGeometry(0.025, 0.07, 6).translate(0, y + 0.15, 0.2), flameM, false));
      const pl = new THREE.PointLight(0xffa858, 0.75, 3.2); pl.position.set(0, y + 0.2, 0.35); g2.add(pl);
      if (wall === 'back') g2.position.set(pos, 0, t); else { g2.rotation.y = Math.PI / 2; g2.position.set(t, 0, pos); }
      o.add(g2);
    };
    const R2 = rng(b.x * 7 + b.y * 3 + fl * 11);
    if (!knee.includes('back')) for (const px of w >= 6 ? [w * 0.25, w * 0.75] : [w * 0.5]) sconce('back', px + 0.5 * (R2() - 0.5) * 0.3);
    if (!knee.includes('left')) sconce('left', h * 0.5);
    if (knee.includes('back') && knee.includes('left')) { const pl = new THREE.PointLight(0xffa858, 0.6, 3.5); pl.position.set(0.6, 1.4, 0.6); o.add(pl); }
    // lamparina pendurada no meio do cômodo
    if (b.kind !== 'stairtower') { const lx = w / 2, lz = h / 2, ly = Math.min(hw - 0.2, 2.0); o.add(mk(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 4).translate(lx, ly + 0.25, lz), iron)); o.add(mk(new THREE.CylinderGeometry(0.09, 0.12, 0.2, 6).translate(lx, ly - 0.1, lz), iron)); o.add(mk(new THREE.SphereGeometry(0.06, 8, 6).translate(lx, ly - 0.1, lz), flameM, false)); const pl = new THREE.PointLight(0xffc070, 0.7, 4.5); pl.position.set(lx, ly - 0.15, lz); o.add(pl); }
    // quadro / tapeçaria na parede do fundo
    if (!knee.includes('back') && w >= 4) { const px = w * (0.35 + R2() * 0.3), tapestry = b.kind === 'castle' || b.kind === 'temple' || b.kind === 'barracks'; const cols = ['#6a1a1c', '#1a3a5a', '#3a4a1a', '#5a3a1a']; if (tapestry) { o.add(mk(new THREE.PlaneGeometry(0.8, 1.2).translate(px, Math.min(hw - 0.9, 1.4), t + 0.02), smat('cloth', cols[Math.floor(R2() * 4)], { side: THREE.DoubleSide }))); o.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.95, 6).rotateZ(Math.PI / 2).translate(px, Math.min(hw - 0.3, 2.0), t + 0.03), smat('wood', '#4a2f17'))); } else { const fy = Math.min(hw - 0.7, 1.45); o.add(mk(new THREE.BoxGeometry(0.62, 0.46, 0.04).translate(px, fy, t + 0.02), smat('wood', '#5a3a1a'))); o.add(mk(new THREE.PlaneGeometry(0.5, 0.34).translate(px, fy, t + 0.045), smat(null, ['#7a8a5a', '#8a6a4a', '#5a6a8a'][Math.floor(R2() * 3)], { rough: 0.9 }))); } }
    // escudos na parede (quartel e castelo)
    if ((b.kind === 'barracks' || b.kind === 'castle') && !knee.includes('left')) for (const pz of [h * 0.3, h * 0.7]) { const sh = mk(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 12).rotateZ(Math.PI / 2).translate(t + 0.03, 1.5, pz), smat(null, ['#7a1a1c', '#1a3a6a'][Math.floor(R2() * 2)], { metal: 0.3, rough: 0.5 })); o.add(sh); o.add(mk(new THREE.SphereGeometry(0.05, 8, 6).translate(t + 0.06, 1.5, pz), smat(null, '#c9a24a', { metal: 1, rough: 0.3 }))); }
    // pequenos objetos no chão em tiles livres: sacos, balde, cesto
    const sack = smat('cloth', '#9a8458', { bump: 1 });
    for (let k = 0; k < Math.min(3, Math.floor(w * h / 10)); k++) {
      const i2 = Math.floor(R2() * w), j2 = Math.floor(R2() * h); if (used.has(i2 + ',' + j2) || (fl === 0 && i2 === doorCol(b) && j2 >= h - 2) || (i2 > 0 && i2 < w - 1 && j2 > 0)) continue;
      const kind = R2();
      if (kind < 0.45) { const s2 = mk(new THREE.SphereGeometry(0.18, 10, 8).scale(1, 1.3, 1).translate(i2 + 0.3 + R2() * 0.4, 0.2, j2 + 0.3 + R2() * 0.4), sack); o.add(s2); }
      else if (kind < 0.75) { o.add(mk(new THREE.CylinderGeometry(0.13, 0.11, 0.24, 10, 1, true).translate(i2 + 0.5, 0.12, j2 + 0.5), smat('wood', '#6a4a2a', { side: THREE.DoubleSide }))); o.add(mk(new THREE.TorusGeometry(0.125, 0.01, 4, 12).rotateX(Math.PI / 2).translate(i2 + 0.5, 0.2, j2 + 0.5), iron)); }
      else { o.add(mk(new THREE.CylinderGeometry(0.2, 0.15, 0.22, 10).translate(i2 + 0.5, 0.11, j2 + 0.5), smat('wood', '#a8844a'))); for (let q = 0; q < 3; q++) o.add(mk(new THREE.SphereGeometry(0.05, 6, 5).translate(i2 + 0.42 + q * 0.08, 0.25, j2 + 0.5), smat(null, ['#c83a2a', '#d8a030', '#6a8a3a'][q]))); }
    }
    // ervas secando perto da lareira e teias de aranha nos cantos altos
    const fp = L.F.find(f => f.t === 'fireplace'); if (fp && !knee.includes('back')) for (let q = 0; q < 3; q++) { const hx = fp.i + 0.2 + q * 0.3; o.add(mk(new THREE.ConeGeometry(0.05, 0.22, 5).rotateX(Math.PI).translate(hx, Math.min(hw - 0.25, 1.9), t + 0.12), smat(null, ['#5a7a3a', '#7a6a3a', '#4a6a2a'][q], { rough: 1 }))); }
    if (!knee.includes('back') && !knee.includes('left') && hw > 1.6) o.add(mk(new THREE.CircleGeometry(0.28, 6, 0, Math.PI / 2).rotateY(Math.PI / 4).translate(t + 0.05, hw - 0.1, t + 0.05), smat(null, '#d8d4cc', { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), false));
  }
  if (b.deco === 'greenhouse' && fl === 0) {   /* estufa por dentro igual por fora: mureta, ferro verde-garrafa e latão nas paredes de vidro */
    const iron = smat(null, '#1f3d2c', { metal: 0.55, rough: 0.45 }), brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }), stone = smat('stoneblock', '#7c847a', { bump: 1.3 }), B0 = 0.45;
    const face = (f, x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), tall = !knee.includes(f), hh = tall ? hw : KH, alongX = Math.abs(z1 - z0) < 0.01;
      o.add(alongX ? wbox(L, Math.min(B0, hh), 0.18, (x0 + x1) / 2, Math.min(B0, hh) / 2, z0, stone, 1.2) : wbox(0.18, Math.min(B0, hh), L, x0, Math.min(B0, hh) / 2, (z0 + z1) / 2, stone, 1.2));
      o.add(alongX ? wbox(L, 0.05, 0.22, (x0 + x1) / 2, Math.min(B0, hh) + 0.02, z0, brass, 1) : wbox(0.22, 0.05, L, x0, Math.min(B0, hh) + 0.02, (z0 + z1) / 2, brass, 1));
      if (tall) for (let k = 0; k <= L + 0.001; k += 0.5) { const x = alongX ? x0 + k * Math.sign(x1 - x0 || 1) : x0, z = alongX ? z0 : z0 + k * Math.sign(z1 - z0 || 1); if (f === 'front' && Math.abs(x - dx) < 0.6) continue; o.add(wbox(0.06, hw, 0.06, x, hw / 2, z, iron, 1)); }
      if (tall) o.add(alongX ? wbox(L, 0.05, 0.07, (x0 + x1) / 2, hw * 0.6, z0, iron, 1) : wbox(0.07, 0.05, L, x0, hw * 0.6, (z0 + z1) / 2, iron, 1)); };
    face('back', 0, 0.05, w, 0.05); if (dx - 0.6 > 0.05) face('front', 0, h - 0.05, dx - 0.6, h - 0.05); if (w - dx - 0.6 > 0.05) face('front', dx + 0.6, h - 0.05, w, h - 0.05); /* vão da porta livre */ face('left', 0.05, 0, 0.05, h); face('right', w - 0.05, 0, w - 0.05, h);
  }
  if (b.deco === 'machiya' && fl >= 0) {   /* paredes finas: no térreo, parede de madeira entre o corredor e o dojô; em cima, divisórias shoji dos apartamentos */
    const dk = smat('wood', '#3a2618', { bump: 1 }), pap = smat('shoji', '#ffffff', { bump: 0.4, emissive: '#ffe2b0', ei: 0.12 }), pl = smat('oldplank', '#5a3e28', { bump: 1.2 }), HH0 = Math.min(hw, 2.2);
    for (const [u0, v0, u1, v1] of iwallsLocal(b, fl) || []) { const HH = fl === 0 ? 1.2 : (fl < nF - 1 && Math.abs(u0 - 6) > 0.01) ? 0.38 : HH0;   /* andares 1–2: divisórias entre os apartamentos baixas (panturrilha) para ver dentro; a do patamar fica alta */   /* no térreo, meia-parede: dá para ver o corredor e o elevador */
      if (fl > 0 && Math.abs(v0 - h) < 0.01 && Math.abs(v1 - h) < 0.01) continue;   /* fachada: desenhada como parede baixa da frente */ const alongX = Math.abs(v0 - v1) < 0.01, L = alongX ? Math.abs(u1 - u0) : Math.abs(v1 - v0), cx = (u0 + u1) / 2, cz = (v0 + v1) / 2;
      if (fl === 0) { o.add(mk(wuv(new THREE.BoxGeometry(alongX ? L : 0.1, HH, alongX ? 0.1 : L).translate(cx, HH / 2, cz), 0.8), pl)); }
      else o.add(mk(new THREE.BoxGeometry(alongX ? L : 0.06, HH - 0.1, alongX ? 0.06 : L).translate(cx, (HH - 0.1) / 2 + 0.05, cz), pap));
      o.add(mk(new THREE.BoxGeometry(alongX ? L + 0.04 : 0.1, 0.08, alongX ? 0.1 : L + 0.04).translate(cx, HH, cz), dk)); o.add(mk(new THREE.BoxGeometry(alongX ? L : 0.1, 0.06, alongX ? 0.1 : L).translate(cx, 0.03, cz), dk));
      for (const e of [0, 1]) { const px = alongX ? (e ? u1 : u0) : u0, pz = alongX ? v0 : (e ? v1 : v0); o.add(mk(new THREE.BoxGeometry(0.1, HH, 0.1).translate(px, HH / 2, pz), dk)); } }
  }
  // móveis
  const W_ = () => smat('wood', '#7a5434', { bump: 1 }), DW = () => smat('wood', '#4e3420', { bump: 1 });
  const cloth = c => smat('cloth', c, { bump: 0.5 });
  for (const f of L.F) {
    const cx = f.i + f.w / 2, cz = f.j + f.h / 2, g = grp();
    const backZ = f.j === 0, backX = f.i === 0;
    switch (f.t) {
      case 'bed': g.add(wbox(0.9, 0.3, f.h - 0.15, 0, 0.15, 0, W_(), 2)); g.add(mk(new THREE.BoxGeometry(0.82, 0.14, f.h - 0.3).translate(0, 0.37, 0.02), cloth('#e8e0cc'))); g.add(mk(new THREE.BoxGeometry(0.86, 0.06, (f.h - 0.3) * 0.6).translate(0, 0.46, 0.2), cloth(['#7a2a2a', '#2a4a7a', '#3a6a3a'][f.i % 3]))); g.add(mk(new THREE.BoxGeometry(0.5, 0.1, 0.25).translate(0, 0.48, -(f.h - 0.3) / 2 + 0.15), cloth('#f4eedc'))); g.add(wbox(0.9, 0.7, 0.08, 0, 0.35, -(f.h - 0.15) / 2, DW(), 2)); break;
      case 'bunk': for (const y of [0.15, 1.0]) { g.add(wbox(0.85, 0.12, f.h - 0.2, 0, y + 0.12, 0, W_(), 2)); g.add(mk(new THREE.BoxGeometry(0.78, 0.1, f.h - 0.35).translate(0, y + 0.24, 0), cloth('#9a8a6a'))); } for (const [px, pz] of [[-0.4, -(f.h - 0.2) / 2], [0.4, -(f.h - 0.2) / 2], [-0.4, (f.h - 0.2) / 2], [0.4, (f.h - 0.2) / 2]]) g.add(wbox(0.06, 1.4, 0.06, px, 0.7, pz, DW(), 2)); break;
      case 'fireplace': { const fx = backZ ? 0 : -0.25, fz = backZ ? -0.25 : 0; g.add(wbox(backZ ? 0.95 : 0.5, 1.5, backZ ? 0.5 : 0.95, fx, 0.75, fz, smat('brick', '#8a8478', { bump: 1.4 }), 1.5)); g.add(mk(new THREE.BoxGeometry(backZ ? 0.55 : 0.08, 0.5, backZ ? 0.08 : 0.55).translate(fx + (backZ ? 0 : 0.22), 0.35, fz + (backZ ? 0.22 : 0)), smat(null, '#140c06'))); g.add(mk(new THREE.ConeGeometry(0.18, 0.34, 6).translate(fx + (backZ ? 0 : 0.2), 0.3, fz + (backZ ? 0.2 : 0)), smat(null, '#ff9a30', { emissive: '#ff7a10', ei: 2.2 }))); g.add(wbox(backZ ? 1.1 : 0.62, 0.1, backZ ? 0.62 : 1.1, fx, 1.0, fz, smat('stoneblock', '#9a948a'), 2)); const pl = new THREE.PointLight(0xff9a40, 1.6, 4.5); pl.position.set(fx + (backZ ? 0 : 0.5), 0.6, fz + (backZ ? 0.5 : 0)); g.add(pl); break; }
      case 'bars': case 'celldoor': {   // grades de ferro (v=0 ao longo de x, 1 ao longo de z, 2 canto); a porta tem moldura e fechadura
        const iron = smat(null, '#3e3c3a', { metal: 0.85, rough: 0.45 }), alongX = f.v !== 1, n = 6, H = 2.05;
        const rod = (x, z) => g.add(mk(new THREE.CylinderGeometry(0.022, 0.022, H, 6).translate(x, H / 2, z), iron));
        if (f.t === 'celldoor') { g.add(mk(new THREE.BoxGeometry(0.07, H, 0.07).translate(-0.47, H / 2, 0), iron)); g.add(mk(new THREE.BoxGeometry(0.07, H, 0.07).translate(0.47, H / 2, 0), iron)); g.add(mk(new THREE.BoxGeometry(1.0, 0.06, 0.07).translate(0, H - 0.03, 0), iron)); break; }
        if (f.v === 2) { rod(0, 0); rod(-0.3, 0); rod(0, -0.3); }
        else for (let k = 0; k < n; k++) { const s = -0.45 + k * 0.9 / (n - 1); alongX ? rod(s, 0) : rod(0, s); }
        for (const y of [0.08, 1.0, H - 0.06]) g.add(mk(new THREE.BoxGeometry(alongX ? 1.0 : 0.05, 0.05, alongX ? 0.05 : 1.0).translate(0, y, 0), iron));
        if (f.t === 'celldoor') { g.add(mk(new THREE.BoxGeometry(0.07, H, 0.07).translate(-0.47, H / 2, 0), iron)); g.add(mk(new THREE.BoxGeometry(0.07, H, 0.07).translate(0.47, H / 2, 0), iron)); g.add(mk(new THREE.BoxGeometry(0.14, 0.18, 0.08).translate(0.32, 1.0, 0.03), smat(null, '#5a4a2a', { metal: 0.7, rough: 0.4 }))); }
        break; }
      case 'cot': g.add(wbox(0.8, 0.22, f.h - 0.2, 0, 0.11, 0, DW(), 2)); g.add(mk(new THREE.BoxGeometry(0.72, 0.12, f.h - 0.35).translate(0, 0.28, 0), smat('cloth', '#b09a60', { bump: 1.4 }))); g.add(mk(new THREE.BoxGeometry(0.66, 0.05, (f.h - 0.4) * 0.5).translate(0, 0.36, 0.2), f.cab != null ? smat('quilt', '#ffffff', { bump: 0.7 }) : smat('cloth', '#6a5a48', { bump: 0.6 })));
        if (f.cab != null) g.add(mk(new THREE.BoxGeometry(0.5, 0.1, 0.26).translate(0, 0.39, -(f.h - 0.2) / 2 + 0.22), smat('cloth', '#f2ead8', { bump: 0.4 })));   // travesseiro
        break;
      case 'desk': {   // escrivaninha grande com livros-razão, tinteiro, pena e papéis
        const top = smat('wood', '#5a3420', { bump: 1 }); g.add(wbox(f.w - 0.1, 0.08, 0.72, 0, 0.78, 0, top, 1.5)); for (const px of [-(f.w - 0.3) / 2, (f.w - 0.3) / 2]) g.add(wbox(0.35, 0.74, 0.66, px, 0.37, 0, DW(), 2));
        g.add(wbox(f.w - 0.8, 0.5, 0.05, 0, 0.5, 0.3, DW(), 2));
        for (let k = 0; k < 3; k++) g.add(mk(new THREE.BoxGeometry(0.28, 0.06, 0.2).translate(-f.w / 2 + 0.5 + k * 0.05, 0.85 + k * 0.06, -0.1), smat(null, ['#6a1a1a', '#1e3a2a', '#3a2a5a'][k], { rough: 0.6 })));
        g.add(mk(new THREE.BoxGeometry(0.42, 0.01, 0.3).translate(0.1, 0.83, 0), smat(null, '#efe4c8'))); g.add(mk(new THREE.CylinderGeometry(0.04, 0.05, 0.07, 10).translate(0.45, 0.86, -0.15), smat(null, '#1a1a2a', { rough: 0.2 })));
        g.add(mk(new THREE.CylinderGeometry(0.006, 0.004, 0.26, 4).rotateZ(0.5).translate(0.5, 0.95, -0.12), smat(null, '#f4f0e8'))); break; }
      case 'keyboard': {   // quadro de chaves na parede
        const bz = backZ ? -0.42 : 0; g.add(wbox(0.8, 0.6, 0.05, 0, 1.45, bz, smat('wood', '#4a2a18'), 1.5)); g.add(wbox(0.9, 0.86, 0.38, 0, 0.43, bz + 0.15, DW(), 2));
        for (let k = 0; k < 12; k++) { const kx = -0.3 + (k % 4) * 0.2, ky = 1.62 - Math.floor(k / 4) * 0.17; g.add(mk(new THREE.TorusGeometry(0.028, 0.008, 4, 10).translate(kx, ky, bz + 0.04), smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }))); g.add(mk(new THREE.BoxGeometry(0.012, 0.06, 0.01).translate(kx, ky - 0.05, bz + 0.04), smat(null, '#c9a24a', { metal: 0.9 }))); } break; }
      case 'filing': {   // arquivo de gavetas com pastas
        g.add(wbox(0.7, 1.35, 0.5, 0, 0.675, backZ ? -0.2 : 0, smat('wood', '#5a3a22', { bump: 1 }), 2));
        for (let k = 0; k < 4; k++) { g.add(wbox(0.6, 0.26, 0.02, 0, 0.22 + k * 0.31, (backZ ? -0.2 : 0) + 0.26, smat('wood', '#6e4a2c'), 1)); g.add(mk(new THREE.BoxGeometry(0.12, 0.03, 0.03).translate(0, 0.27 + k * 0.31, (backZ ? -0.2 : 0) + 0.28), smat(null, '#c9a24a', { metal: 0.8 }))); }
        for (let k = 0; k < 5; k++) g.add(mk(new THREE.BoxGeometry(0.06, 0.24, 0.3).translate(-0.24 + k * 0.1, 1.47, backZ ? -0.2 : 0), smat(null, ['#b8a070', '#8a3a2a', '#d8c898', '#3a4a6a', '#c8b080'][k]))); break; }
      case 'mapframe': {   // mapa da cidade emoldurado na parede do fundo
        const bz = -0.47; g.add(wbox(0.92, 0.66, 0.04, 0, 1.55, bz, smat('wood', '#3a2212'), 1)); g.add(mk(new THREE.PlaneGeometry(0.8, 0.54).translate(0, 1.55, bz + 0.025), smat('adsboard', '#e8d8b0', { rough: 0.7 }))); break; }
      case 'citymodel': {   // maquete de Nae numa mesa, com plaquinhas nos imóveis à venda
        g.add(wbox(f.w - 0.15, 0.08, f.h - 0.15, 0, 0.74, 0, W_(), 1.5)); for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(wbox(0.06, 0.72, 0.06, px * (f.w / 2 - 0.15), 0.36, pz * (f.h / 2 - 0.15), DW(), 2));
        g.add(mk(new THREE.BoxGeometry(f.w - 0.3, 0.02, f.h - 0.3).translate(0, 0.79, 0), smat(null, '#7a9a5a')));
        const R2 = rng(f.i * 7 + f.j * 13 + 5); for (let k = 0; k < 11; k++) { const bx = (R2() - 0.5) * (f.w - 0.5), bz = (R2() - 0.5) * (f.h - 0.45), bh = 0.04 + R2() * 0.08; g.add(mk(new THREE.BoxGeometry(0.09, bh, 0.09).translate(bx, 0.8 + bh / 2, bz), smat(null, ['#e8dcc0', '#d8c8a0', '#c8b8a0'][k % 3]))); g.add(mk(new THREE.ConeGeometry(0.075, 0.06, 4).rotateY(Math.PI / 4).translate(bx, 0.83 + bh, bz), smat(null, k % 2 ? '#8a3a2a' : '#4e5464')));
          if (k % 3 === 0) { g.add(mk(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4).translate(bx + 0.06, 0.86, bz), smat(null, '#2a2a2a'))); g.add(mk(new THREE.BoxGeometry(0.05, 0.03, 0.005).translate(bx + 0.085, 0.91, bz), smat(null, '#c83a2a'))); } }
        g.add(mk(new THREE.BoxGeometry(0.16, 0.06, 0.16).translate(0, 0.83, 0), smat(null, '#a8a090'))); g.add(mk(new THREE.BoxGeometry(f.w - 0.3, 0.012, 0.08).translate(0, 0.805, 0.05), smat(null, '#5a8ab8'))); break; }   // castelinho no meio e o rio
      case 'fruitcrate': {   // caixote cheio de frutas
        const cr = mCrate(); cr.scale.setScalar(0.78); g.add(cr); const C3 = f.v ? ['#e8c03a', '#d88a2a', '#e8d84a'] : ['#c0281e', '#7ab83a', '#d8402a'];
        for (let k = 0; k < 14; k++) g.add(mk(new THREE.SphereGeometry(0.075, 8, 6).translate(-0.22 + (k % 4) * 0.15, 0.6 + Math.floor(k / 8) * 0.07, -0.18 + (Math.floor(k / 4) % 3) * 0.17), smat(null, C3[k % 3], { rough: 0.45 }))); break; }
      case 'baskets': {   // cestos de vime com frutas
        for (const [bx, bz, s] of [[-0.18, -0.12, 1], [0.2, 0.15, 0.85]]) { const bk = grp(); bk.add(mk(new THREE.CylinderGeometry(0.2, 0.15, 0.26, 12, 1, true).translate(0, 0.13, 0), smat('wood', '#b08a42', { side: THREE.DoubleSide }))); bk.add(mk(new THREE.TorusGeometry(0.2, 0.02, 5, 14).rotateX(Math.PI / 2).translate(0, 0.26, 0), smat('wood', '#8a6a32')));
          for (let k = 0; k < 7; k++) bk.add(mk(new THREE.SphereGeometry(0.065, 7, 5).translate(Math.cos(k) * 0.1, 0.27 + (k === 6 ? 0.05 : 0), Math.sin(k) * 0.1), smat(null, (f.v ? ['#e8c03a', '#5a2a6a', '#e8a03a'] : ['#c02a1e', '#e8c03a', '#7ab83a'])[k % 3], { rough: 0.45 }))); bk.scale.setScalar(s); bk.position.set(bx, 0, bz); g.add(bk); } break; }
      case 'jamshelf': {   // prateleira de potes de geleia
        const along = backZ; g.add(wbox(along ? 0.9 : 0.35, 1.5, along ? 0.32 : 0.9, along ? 0 : -0.3, 0.75, along ? -0.3 : 0, DW(), 2));
        for (let sy = 0; sy < 3; sy++) { g.add(wbox(along ? 0.86 : 0.3, 0.03, along ? 0.28 : 0.86, along ? 0 : -0.28, 0.3 + sy * 0.45, along ? -0.28 : 0, W_(), 2)); for (let k = 0; k < 4; k++) { const off = -0.3 + k * 0.2, c = ['#a8201e', '#d87a1a', '#5a1a4a', '#c8a020'][(k + sy) % 4];
          g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 10).translate(along ? off : -0.28, 0.4 + sy * 0.45, along ? -0.28 : off), smat(null, c, { rough: 0.15, transparent: true, opacity: 0.9 }))); g.add(mk(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 10).translate(along ? off : -0.28, 0.48 + sy * 0.45, along ? -0.28 : off), cloth('#e8dcc0'))); } } break; }
      case 'garlic': {   // réstias de alho e cebola penduradas na viga
        g.add(wbox(0.9, 0.05, 0.05, 0, 2.05, 0, DW(), 1)); for (let k = 0; k < 3; k++) { const sx = -0.3 + k * 0.3; g.add(mk(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 4).translate(sx, 1.78, 0), smat(null, '#c8b070')));
          for (let q = 0; q < 6; q++) g.add(mk(new THREE.SphereGeometry(0.045, 7, 5).translate(sx + (q % 2 ? 0.03 : -0.03), 1.98 - q * 0.08, 0), smat(null, (f.v ? (k % 2 ? '#c88a3a' : '#f0e8d8') : (k % 2 ? '#f0e8d8' : '#b86a2a')), { rough: 0.6 }))); } break; }
      case 'sorttable': {   // mesa de separar frutas
        g.add(wbox(f.w - 0.15, 0.06, 0.7, 0, 0.74, 0, W_(), 1.5)); for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(wbox(0.06, 0.72, 0.06, px * (f.w / 2 - 0.15), 0.36, pz * 0.28, DW(), 2));
        for (let k = 0; k < 16; k++) g.add(mk(new THREE.SphereGeometry(0.06, 7, 5).translate(-f.w / 2 + 0.3 + (k % 8) * (f.w - 0.6) / 7, 0.83, (Math.floor(k / 8) - 0.5) * 0.25), smat(null, ['#c02a1e', '#e8c03a', '#7ab83a', '#d88a2a'][(k * 3) % 4], { rough: 0.45 })));
        g.add(mk(new THREE.CylinderGeometry(0.2, 0.15, 0.14, 12, 1, true).translate(f.w / 2 - 0.35, 0.84, 0), smat('wood', '#b08a42', { side: THREE.DoubleSide }))); break; }
      case 'lift': case 'lifttop': {   // elevador manual 2×2: cabine laqueada, grade pantográfica de latão virada para o corredor, mostrador de ponteiro
        if (f.t === 'lifttop' && fl < nF - 1) break;
        const lac = smat('wood', '#3a1a12', { bump: 0.6, rough: 0.45 }), br = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }), HC = Math.min(hw - 0.05, 2.15), R2 = 0.96;
        g.add(wbox(1.94, 0.05, 1.94, 0, 0.025, 0, smat('oldplank', '#5a3420', { bump: 1 }), 1)); g.add(wbox(1.98, 0.04, 1.98, 0, 0.06, 0, br, 1));
        g.add(wbox(1.92, HC, 0.06, 0, HC / 2, -R2, lac, 1)); g.add(wbox(0.06, HC, 1.92, R2, HC / 2, 0, lac, 1));
        for (const z of [-R2, R2]) g.add(wbox(1.98, 0.06, 0.06, 0, HC, z, br, 1)); for (const x of [-R2, R2]) g.add(wbox(0.06, 0.06, 1.98, x, HC, 0, br, 1));   /* aro de latão no alto (sem teto de tábuas) */
        for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.78; g.add(limb(V3(Math.cos(a) * 0.9, HC, Math.sin(a) * 0.9), V3(0, HC + 0.32, 0), 0.008, 0.008, br, 3)); }
        { const wh = mk(new THREE.TorusGeometry(0.16, 0.03, 6, 18).rotateY(Math.PI / 2), smat(null, '#2a2622', { metal: 0.8, rough: 0.4 })); wh.position.set(0, HC + 0.36, 0); g.add(wh); g.add(limb(V3(0, HC + 0.36, 0), V3(0, Math.max(HC + 0.6, hw + 0.4), 0), 0.012, 0.012, smat(null, '#2a2622', { metal: 0.8 }), 4)); g.add(limb(V3(0, HC + 0.36, -0.16), V3(0, Math.max(HC + 0.6, hw + 0.4), -0.16), 0.01, 0.01, smat(null, '#2a2622', { metal: 0.8 }), 4)); }   /* roldana e cabos subindo pelo poço */
        g.add(wbox(0.05, 0.9, 1.92, -R2, 0.45, 0, lac, 1)); for (let k = 0; k <= 14; k++) g.add(wbox(0.018, HC - 0.9, 0.018, -R2 - 0.01, 0.9 + (HC - 0.9) / 2, -0.9 + k * 0.128, br, 1)); for (const y of [0.92, 1.5, HC - 0.04]) g.add(wbox(0.03, 0.035, 1.94, -R2 - 0.01, y, 0, br, 1));   /* lado do dojô: grade de latão */
        for (const x of [-0.94, 0.94]) g.add(wbox(0.05, HC, 0.05, x, HC / 2, R2, br, 1));
        for (let k = 0; k < 5; k++) { const x0 = -0.92 + k * 0.1, x1 = x0 + 0.1; for (let q = 0; q < 7; q++) { const y0 = 0.1 + q * (HC - 0.2) / 7, y1 = y0 + (HC - 0.2) / 7; g.add(limb(V3(x0, y0, R2 + 0.01), V3(x1, y1, R2 + 0.01), 0.009, 0.009, br, 3)); g.add(limb(V3(x1, y0, R2 + 0.01), V3(x0, y1, R2 + 0.01), 0.009, 0.009, br, 3)); } }   /* grade recolhida à esquerda: a porta fica aberta */
        g.add(wbox(1.9, 0.05, 0.04, 0, 0.1, R2 + 0.01, br, 1)); g.add(wbox(1.9, 0.05, 0.04, 0, HC - 0.1, R2 + 0.01, br, 1));
        { const dg = grp(mk(new THREE.CircleGeometry(0.2, 22, 0, Math.PI), br), mk(new THREE.CircleGeometry(0.17, 22, 0, Math.PI).translate(0, 0, 0.005), smat(null, '#f1e6c8'))); const nd = mk(new THREE.BoxGeometry(0.012, 0.14, 0.01).translate(0, 0.07, 0), smat(null, '#1a1a1a')); nd.position.z = 0.012; nd.rotation.z = (0.5 - fl / (nF - 1)) * 2.6; dg.add(nd); dg.position.set(0, Math.min(hw - 0.12, HC + 0.14), R2 + 0.02); g.add(dg); }
        g.add(wbox(0.5, 0.9, 0.06, 0.55, 1.15, -R2 + 0.04, smat('wood', '#5a2a1a', { bump: 0.6 }), 1)); g.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6).rotateZ(0.6).translate(0.55, 1.2, -R2 + 0.12), br));   /* painel com a alavanca do ascensorista */
        g.add(mk(new THREE.SphereGeometry(0.06, 8, 6).translate(0, HC - 0.12, 0), smat(null, '#fff2d0', { emissive: '#ffd890', ei: 1.4 })));
        break; }
      case 'tatami': { for (let a = 0; a < f.w; a++) for (let c = 0; c < f.h; c++) { const tm = mk(new THREE.BoxGeometry(0.97, 0.05, 0.97).translate(a - (f.w - 1) / 2, 0.085, c - (f.h - 1) / 2), smat('tatami', '#ffffff', { bump: 0.7 })); if ((a + c) % 2) tm.rotation.y = 0; g.add(tm); } g.add(wbox(f.w + 0.04, 0.07, 0.05, 0, 0.085, -f.h / 2, smat(null, '#26301e'), 1)); g.add(wbox(f.w + 0.04, 0.07, 0.05, 0, 0.085, f.h / 2, smat(null, '#26301e'), 1)); break; }
      case 'makiwara': { g.add(wbox(0.3, 0.06, 0.3, 0, 0.03, 0, DW(), 1)); g.add(wbox(0.1, 1.35, 0.1, 0, 0.7, 0, smat('wood', '#8a6a44', { bump: 1 }), 1)); g.add(wbox(0.14, 0.28, 0.08, 0, 1.08, 0.06, smat('thatch', '#c8b070', { bump: 1.4 }), 1)); for (const y of [0.97, 1.19]) g.add(wbox(0.16, 0.025, 0.1, 0, y, 0.06, smat(null, '#3a2a1a'), 1)); break; }
      case 'mokujin': { const wd = smat('wood', '#7a5434', { bump: 1.1 }); g.add(wbox(0.34, 0.08, 0.34, 0, 0.04, 0, DW(), 1)); g.add(mk(new THREE.CylinderGeometry(0.13, 0.14, 1.55, 12).translate(0, 0.85, 0), wd)); g.add(mk(new THREE.SphereGeometry(0.13, 12, 8).scale(1, 0.4, 1).translate(0, 1.63, 0), wd));
        for (const [y, a] of [[1.3, 0.5], [1.3, -0.5], [1.0, 0]]) { const e2 = V3(Math.sin(a) * 0.45, y - 0.03, Math.cos(a) * 0.45); g.add(limb(V3(0, y, 0), e2, 0.03, 0.025, wd, 6)); } g.add(limb(V3(0, 0.55, 0), V3(0.05, 0.25, 0.4), 0.035, 0.03, wd, 6)); break; }
      case 'kamiza': { const dk = smat('wood', '#3a2212', { bump: 1 }); g.add(wbox(f.w - 0.1, 0.5, 0.42, 0, 0.25, -0.26, dk, 1)); g.add(wbox(f.w - 0.3, 0.05, 0.32, 0, 1.72, -0.34, dk, 1));
        const sh = grp(wbox(0.5, 0.32, 0.22, 0, 0.16, 0, smat('wood', '#c8a878', { bump: 0.8 }), 1), wbox(0.64, 0.05, 0.3, 0, 0.36, 0, smat(null, '#3a3e44'), 1)); sh.position.set(0, 1.75, -0.36); g.add(sh);
        g.add(mk(new THREE.PlaneGeometry(0.42, 0.9).translate(0, 1.05, -0.47), smat('dojosign', '#ffffff', { bump: 0.3 })));
        for (const x of [-0.7, 0.7]) { g.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8).translate(x, 0.58, -0.26), smat(null, '#f4ead4'))); g.add(mk(new THREE.SphereGeometry(0.025, 6, 5).translate(x, 0.69, -0.26), smat(null, '#ffcc66', { emissive: '#ffb040', ei: 1.6 }))); }
        g.add(mk(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 8).translate(0.35, 0.57, -0.3), smat(null, '#e8e0d0'))); g.add(mk(new THREE.SphereGeometry(0.1, 8, 6).translate(0.35, 0.72, -0.3), smat(null, '#3e6a2e'))); break; }
      case 'bokkenrack': { const dk = smat('wood', '#3a2212', { bump: 1 }), bk = smat('wood', '#c8a878', { bump: 0.6 }); g.add(wbox(0.6, 0.06, 0.3, 0, 0.03, -0.2, dk, 1)); g.add(wbox(0.6, 0.06, 0.08, 0, 0.9, -0.33, dk, 1)); for (let k = 0; k < 4; k++) g.add(limb(V3(-0.22 + k * 0.15, 0.08, -0.2), V3(-0.22 + k * 0.15, 1.05, -0.32), 0.018, 0.012, bk, 5)); break; }
      case 'andon': { const fr = smat('wood', '#3a2212', { bump: 0.8 }); g.add(mk(new THREE.BoxGeometry(0.24, 0.42, 0.24).translate(0, 0.3, 0), smat('shoji', '#ffffff', { emissive: '#ffcc80', ei: 0.9, bump: 0.3 }))); for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) g.add(wbox(0.025, 0.52, 0.025, x, 0.26, z, fr, 1)); { const pl2 = new THREE.PointLight(0xffc070, 0.5, 2.6); pl2.position.set(0, 0.4, 0); g.add(pl2); } break; }
      case 'umbrella': { g.add(mk(new THREE.CylinderGeometry(0.1, 0.09, 0.32, 10).translate(0, 0.16, 0), smat(null, '#6a4a2a'))); for (const [a, c] of [[0.2, '#b8261c'], [-0.25, '#1e2c4a']]) { const u = mk(new THREE.ConeGeometry(0.05, 0.85, 8).translate(0, 0.42, 0), smat(null, c)); u.rotation.z = a; u.position.y = 0.2; g.add(u); } break; }
      case 'plantpot': { g.add(mk(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 10).translate(0, 0.13, 0), smat(null, '#5a6a7a'))); g.add(limb(V3(0, 0.25, 0), V3(0.05, 0.6, 0), 0.03, 0.02, smat('bark', '#5a3e28'), 5)); g.add(mk(new THREE.SphereGeometry(0.22, 10, 8).scale(1.2, 0.6, 1).translate(0.06, 0.66, 0), smat(null, '#3e6a2e'))); break; }
      case 'tansu': { const dk = smat('wood', '#4a2e1a', { bump: 1 }), ir = smat(null, '#1a1614', { metal: 0.6 }); g.add(wbox(0.86, 1.05, 0.42, 0, 0.525, -0.27, dk, 1)); g.add(wbox(0.5, 0.45, 0.42, 0.18, 1.27, -0.27, dk, 1)); for (let r = 0; r < 4; r++) { g.add(wbox(0.78, 0.015, 0.02, 0, 0.22 + r * 0.25, -0.05, ir, 1)); g.add(wbox(0.12, 0.04, 0.03, 0, 0.12 + r * 0.25, -0.05, ir, 1)); } break; }
      case 'irori': { g.add(wbox(0.82, 0.07, 0.82, 0, 0.035, 0, smat('wood', '#3a2212', { bump: 1 }), 1)); g.add(wbox(0.62, 0.05, 0.62, 0, 0.05, 0, smat(null, '#7a7670'), 1)); for (let k = 0; k < 5; k++) g.add(mk(new THREE.SphereGeometry(0.04, 6, 5).translate(Math.cos(k * 1.3) * 0.08, 0.09, Math.sin(k * 1.3) * 0.08), smat(null, '#ff6a20', { emissive: '#ff5010', ei: 1.8 })));
        g.add(limb(V3(0, Math.min(hw, 2.2), 0), V3(0, 0.55, 0), 0.015, 0.015, smat(null, '#2a2622', { metal: 0.6 }), 4)); g.add(mk(new THREE.SphereGeometry(0.14, 10, 8).scale(1, 0.8, 1).translate(0, 0.42, 0), smat(null, '#24201c', { metal: 0.5, rough: 0.5 }))); { const pl2 = new THREE.PointLight(0xff7a30, 0.45, 2); pl2.position.set(0, 0.3, 0); g.add(pl2); } break; }
      case 'futon': { g.add(wbox(0.82, 0.08, f.h - 0.2, 0, 0.04, 0, smat('cloth', '#efe8da', { bump: 0.5 }), 1)); g.add(wbox(0.8, 0.06, (f.h - 0.2) * 0.62, 0, 0.11, 0.2, smat('quilt', '#ffffff', { bump: 0.6 }), 1)); g.add(wbox(0.36, 0.08, 0.2, 0, 0.12, -(f.h - 0.2) / 2 + 0.16, smat('cloth', '#8a6a48', { bump: 0.4 }), 1)); break; }
      case 'chabudai': { const dk = smat('wood', '#5a3420', { bump: 0.8 }); g.add(mk(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20).translate(0, 0.3, 0), dk)); for (let k = 0; k < 4; k++) g.add(wbox(0.04, 0.28, 0.04, Math.cos(k * 1.57 + 0.78) * 0.22, 0.14, Math.sin(k * 1.57 + 0.78) * 0.22, dk, 1)); g.add(mk(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 8).translate(0.08, 0.36, 0.02), smat(null, '#e8e0d0'))); g.add(wbox(0.36, 0.06, 0.36, 0, 0.03, 0.42, smat('cloth', '#8a2a2a', { bump: 0.5 }), 1)); break; }
      case 'kakejiku': { const pz = backZ ? -0.46 : 0; g.add(mk(new THREE.PlaneGeometry(0.42, 1.0).translate(0, 1.3, pz), smat('kakejiku', '#ffffff', { bump: 0.3, side: THREE.DoubleSide }))); for (const y of [0.78, 1.82]) g.add(mk(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6).rotateZ(Math.PI / 2).translate(0, y, pz + 0.01), smat(null, '#3a2212'))); break; }   /* pergaminho na parede do fundo */
      case 'ikebana': { g.add(mk(new THREE.CylinderGeometry(0.1, 0.13, 0.32, 12).translate(0, 0.16, 0), smat(null, '#2a3a4a', { rough: 0.35 }))); const br2 = smat('bark', '#5a3e28'); for (let k = 0; k < 3; k++) g.add(limb(V3(0, 0.3, 0), V3(Math.cos(k * 2.1) * 0.22, 0.75 + k * 0.12, Math.sin(k * 2.1) * 0.12), 0.012, 0.006, br2, 4)); for (let k = 0; k < 7; k++) g.add(mk(new THREE.SphereGeometry(0.04, 6, 5).translate(Math.cos(k * 1.7) * 0.18, 0.62 + (k % 3) * 0.12, Math.sin(k * 1.7) * 0.1), smat(null, ['#f0a0b8', '#ffffff', '#e86a7a'][k % 3]))); break; }
      case 'byobu': { const pan = smat('byobu', '#ffffff', { bump: 0.3, side: THREE.DoubleSide }), fr = smat(null, '#1a1210'); for (let k = 0; k < 4; k++) { const p2 = mk(new THREE.PlaneGeometry(0.25, 1.3).translate(0, 0.72, 0), pan); p2.position.set(-0.375 + k * 0.25, 0, (k % 2) * 0.08 - 0.04); p2.rotation.y = (k % 2 ? 0.35 : -0.35); g.add(p2); g.add(wbox(0.02, 1.36, 0.02, -0.5 + k * 0.25, 0.68, (k % 2) * 0.08 - 0.04, fr, 1)); } break; }
      case 'ofuro': {   // ofurô de hinoki para 4 (água 2×2), deque de pedra, balde, banquinho e bambus; bolhas e vapor desenhados por cima
        const hin = smat('wood', '#d4a870', { bump: 0.7 }), stoneF = smat('stoneblock', '#8a8680', { bump: 1.1 }), water = smat(null, '#7ac8c8', { rough: 0.05, metal: 0.2, transparent: true, opacity: 0.82, emissive: '#2a6a6a', ei: 0.25 }), W2 = f.w - 0.55, O = W2 / 2 + 0.06;
        g.add(wbox(f.w, 0.06, f.h, 0, 0.03, 0, stoneF, 1.4));
        for (const sgn of [-1, 1]) { g.add(wbox(W2 + 0.24, 0.62, 0.12, 0, 0.37, sgn * O, hin, 1)); g.add(wbox(0.12, 0.62, W2 + 0.24, sgn * O, 0.37, 0, hin, 1)); g.add(wbox(W2 + 0.3, 0.04, 0.18, 0, 0.69, sgn * O, hin, 1)); g.add(wbox(0.18, 0.04, W2 + 0.3, sgn * O, 0.69, 0, hin, 1)); }
        for (const y of [0.18, 0.5]) for (const sgn of [-1, 1]) { g.add(wbox(W2 + 0.28, 0.03, 0.14, 0, y, sgn * O, smat(null, '#5a3a20'), 1)); g.add(wbox(0.14, 0.03, W2 + 0.28, sgn * O, y, 0, smat(null, '#5a3a20'), 1)); }
        g.add(wbox(W2, 0.03, W2, 0, 0.07, 0, smat(null, '#1a0e08'), 1)); for (let k = 0; k < 7; k++) { const pw = W2 / 7; g.add(wbox(pw - 0.012, 0.025, W2 - 0.02, -W2 / 2 + pw * (k + 0.5), 0.088, 0, smat('oldplank', ['#6a3a22', '#7e4a2c', '#5e3420'][k % 3], { bump: 0.8, rough: 0.45 }), 1.6)); }   /* fundo próprio: tábuas de cedro-vermelho escuro, em tons alternados, com frestas */ g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 14).translate(0.3, 0.095, 0.3), smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }))); g.add(mk(new THREE.CylinderGeometry(0.04, 0.04, 0.014, 12).translate(0.3, 0.097, 0.3), smat(null, '#2a2420')));   /* fundo de hinoki e ralo de latão (a água é desenhada por cima, com o nível da alavanca) */
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mk(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10).rotateX(Math.PI / 2).translate(x * (O - 0.065), 0.4, z * 0.5 * O), smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 })));   /* bicos dos jatos de latão */
        g.add(mk(new THREE.CylinderGeometry(0.14, 0.12, 0.2, 12).translate(f.w / 2 - 0.2, 0.16, f.h / 2 - 0.2), hin)); g.add(wbox(0.3, 0.2, 0.22, f.w / 2 - 0.22, 0.1, f.h / 2 - 0.62, hin, 1)); g.add(wbox(0.18, 0.05, 0.12, f.w / 2 - 0.55, 0.03, f.h / 2 - 0.2, smat('cloth', '#f4efe2', { bump: 0.3 }), 1));
        { const gold = smat(null, '#d4a94a', { metal: 0.95, rough: 0.25 }), slate = smat('rock', '#3a3c40', { bump: 1.4, rough: 0.5 }), wet = smat(null, '#9ad8e0', { rough: 0.05, metal: 0.3, transparent: true, opacity: 0.35 }), zb = -f.h / 2 + 0.06;   /* cascata */
          const R8 = rng(91), HT = 3.8, X0 = -1.0, X1 = 1.0, TY = 2.2, TZ = -0.56, ZW = zb + 0.105;   /* face da parede do quarto (espessura 0,16) */   /* parede de pedra: uma peça só, do chão até a viga de jacarandá (a mobília tem a altura achatada ~0,55 em relação às paredes) */
          const stones = [];   /* fiadas de pedras de tamanhos variados, desencontradas */
          for (let y = 0, r = 0; y < HT; r++) { const rh = 0.28 + R8() * 0.14; let x = X0 - R8() * 0.2; const row = []; while (x < X1) { const sw = 0.18 + R8() * 0.22; row.push({ cx: x + sw / 2, cy: y + rh / 2, hx: sw / 2, hy: rh / 2, amp: 0.05 + R8() * 0.07, tone: 0.55 + R8() * 0.35, warm: R8(), mossy: R8() }); x += sw; } stones.push({ y0: y, y1: y + rh, row }); y += rh; }
          const wetZ = (x, y) => Math.abs(x) < 0.56 && y > 0.62 && y < TY + 0.05;
          const surf = (x, y) => { let fr = stones[stones.length - 1]; for (const q of stones) if (y < q.y1) { fr = q; break; } const wav = Math.sin(x * 9 + fr.y0 * 13) * 0.012; let st = fr.row[0]; for (const q of fr.row) if (x >= q.cx - q.hx) st = q; const nx = (x - st.cx) / st.hx, ny = (y + wav - st.cy) / st.hy, e = Math.pow(Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4), 0.25), lim = y < 0.75 ? 0.035 : (Math.abs(x) < 0.5 && Math.abs(y - TY) < 0.18 ? 0.2 : 1), bump = e < 1 ? Math.sqrt(1 - e * e) : 0, edge = Math.min(1, (x - X0) / 0.08); return { d: (0.012 + Math.min(st.amp, lim) * bump * (0.85 + 0.15 * Math.sin(x * 31 + y * 23))) * edge, st, gap: e > 0.86 }; };
          { const SX = 100, SY = 170, geo = new THREE.PlaneGeometry(X1 - X0, HT, SX, SY), pos = geo.attributes.position, uv = geo.attributes.uv, col = new Float32Array(pos.count * 3);
            for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), y = pos.getY(k) + HT / 2, r = surf(x, y), st = r.st, n = 0.92 + 0.08 * Math.sin(x * 57 + y * 41) * Math.cos(x * 23 - y * 37); let c = r.gap ? [0.2, 0.19, 0.17] : [st.tone * (0.95 + st.warm * 0.1), st.tone * 0.97, st.tone * (0.92 - st.warm * 0.06)];
              if (!r.gap && st.mossy > 0.72 && !wetZ(x, y) && y > 0.75) { const t2 = Math.max(0, (y - st.cy) / st.hy); c = [c[0] * (1 - t2 * 0.6) + 0.22 * t2, c[1] * (1 - t2 * 0.4) + 0.42 * t2, c[2] * (1 - t2 * 0.7) + 0.12 * t2]; }   /* musgo no alto das pedras */
              if (r.gap && st.mossy > 0.45 && !wetZ(x, y)) c = [0.16, 0.3, 0.1];   /* musgo nas frestas */
              if (wetZ(x, y)) c = c.map(v => v * 0.55);   /* pedra molhada atrás da cortina d'água */
              col[k * 3] = c[0] * n; col[k * 3 + 1] = c[1] * n; col[k * 3 + 2] = c[2] * n; pos.setZ(k, r.d); uv.setXY(k, x * 1.4, y * 1.4); }
            geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); geo.translate(0, HT / 2, ZW);
            g.add(mk(geo, smat('rock', '#ffffff', { bump: 1.2, rough: 0.82, vc: 1 })));
            g.add(wbox(X1 - X0, HT, 0.04, 0, HT / 2, ZW - 0.015, smat('rock', '#3a3834', { bump: 1 }), 1)); g.add(wbox(0.035, HT, 0.06, X0 + 0.0175, HT / 2, ZW + 0.02, smat('rock', '#4a4740', { bump: 1.2 }), 1)); }   /* fundo e quina da peça */
          const S2 = (x, y) => ZW + surf(x, y).d;
          const moss = smat(null, '#3e6e28', { rough: 0.95 }), moss2 = smat(null, '#5e8e32', { rough: 0.95 }), moss3 = smat(null, '#7aa83e', { rough: 0.95 }), fern = smat(null, '#3a7430', { side: THREE.DoubleSide, rough: 0.9 }), fern2 = smat(null, '#5a9a3a', { side: THREE.DoubleSide, rough: 0.9 }), bam = smat(null, '#9aa860', { rough: 0.45 }), bamD = smat(null, '#6e7a40', { rough: 0.5 });
          const free = (x, y) => !(Math.abs(x) < 0.62 && y < TY + 0.2) && x > X0 + 0.06 && x < X1 - 0.08;
          for (let k = 0; k < 90; k++) { const x = X0 + R8() * 2, y = 0.8 + R8() * (HT - 0.85); if (!free(x, y)) continue; g.add(mk(new THREE.SphereGeometry(0.035 + R8() * 0.04, 7, 5).scale(1.5, 0.45, 0.7).translate(x, y, S2(x, y) + 0.005), [moss, moss2, moss3][k % 3])); }   /* tufos de musgo */
          for (let k = 0; k < 22; k++) { const x = X0 + 0.12 + R8() * 1.76, y = 0.85 + R8() * (HT - 0.95); if (!free(x, y)) continue; const sz = 0.16 + R8() * 0.16, z0 = S2(x, y); for (let q = 0; q < 7; q++) { const fr = mk(new THREE.PlaneGeometry(0.05, sz).translate(0, sz / 2, 0), q % 2 ? fern : fern2); fr.position.set(x, y, z0 + 0.01); fr.rotation.set(-0.35 - R8() * 0.35, (q - 3) * 0.22, (q - 3) * 0.38); g.add(fr); } }   /* samambaias brotando das frestas */
          for (let k = 0; k < 8; k++) { const x = X0 + 0.12 + k * 0.25 + (R8() - 0.5) * 0.06, len = 0.6 + R8() * (Math.abs(x) < 0.6 ? 0.5 : 1.6); const pts = []; for (let q = 0; q <= 8; q++) { const y = HT - 0.02 - q * len / 8, xx = x + Math.sin(q * 0.9 + k) * 0.025; pts.push(V3(xx, y, S2(xx, y) + 0.015)); } for (let q = 0; q < 8; q++) g.add(limb(pts[q], pts[q + 1], 0.008, 0.007, moss, 4)); for (let q = 1; q <= 8; q++) g.add(mk(new THREE.SphereGeometry(0.022 + (q % 3) * 0.006, 5, 4).scale(1.3, 0.8, 0.6).translate(pts[q].x + (q % 2 ? 0.018 : -0.018), pts[q].y, pts[q].z + 0.006), q % 2 ? moss2 : moss3)); }   /* trepadeiras descendo da viga */
          for (const [fx, fy, c] of [[-0.82, 3.2, '#f0a0c0'], [0.78, 2.9, '#ffffff'], [-0.75, 1.7, '#f4d860'], [0.8, 1.8, '#c8a0f0'], [-0.3, 3.45, '#ffffff'], [0.35, 3.3, '#f0a0c0']]) for (let q = 0; q < 5; q++) { const x = fx + Math.cos(q * 1.26) * 0.04, y = fy + Math.sin(q * 1.26) * 0.025; g.add(mk(new THREE.SphereGeometry(0.02, 5, 4).translate(x, y, S2(x, y) + 0.03), smat(null, c))); }   /* florzinhas */
          { const gy = TY + 0.16, gz = S2(0, gy) + 0.03; g.add(limb(V3(-0.6, gy, gz), V3(0.6, gy, gz), 0.032, 0.032, bamD, 8)); for (const x of [-0.6, 0.6]) g.add(mk(new THREE.CylinderGeometry(0.034, 0.034, 0.012, 10).rotateZ(Math.PI / 2).translate(x, gy, gz), smat(null, '#5a6438')));   /* calha de bambu encaixada na pedra */
            for (let k = 0; k < 5; k++) { const bx = -0.44 + k * 0.22; g.add(limb(V3(bx, gy, gz), V3(bx, TY, TZ), 0.02, 0.02, bam, 7)); g.add(mk(new THREE.CylinderGeometry(0.022, 0.022, 0.015, 10).rotateX(Math.PI / 2).translate(bx, TY, TZ), smat(null, '#7a8a48'))); } }   /* cinco bicas de bambu: a água forma uma cortina */ }
        break; }
      case 'jkitchen': { const wd = smat('oldplank', '#5a2a14', { bump: 0.6, rough: 0.35 }), top = smat('stoneblock', '#2a2826', { bump: 0.8, rough: 0.3 }), clay = smat(null, '#a8583a', { rough: 0.8 }), cop = smat(null, '#c8784a', { metal: 0.9, rough: 0.3 }), gold = smat(null, '#d4a94a', { metal: 0.95, rough: 0.25 }), L = Math.max(f.w, f.h) - 0.1; if (f.w > f.h) g.rotation.y = Math.PI / 2;   /* bancada deitada ao longo da parede da frente */
        g.add(wbox(0.8, 0.82, L, 0, 0.41, 0, wd, 1)); g.add(wbox(0.86, 0.05, L + 0.06, 0, 0.845, 0, top, 1)); for (const z of [-L / 2 + 0.02, L / 2 - 0.02]) g.add(wbox(0.86, 0.04, 0.03, 0, 0.6, z, gold, 1));
        g.add(mk(new THREE.CylinderGeometry(0.22, 0.26, 0.26, 14).translate(0, 1.0, -L / 4), clay)); g.add(mk(new THREE.SphereGeometry(0.17, 12, 8).scale(1, 0.6, 1).translate(0, 1.18, -L / 4), smat(null, '#2a2420', { metal: 0.5, rough: 0.45 }))); g.add(mk(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10).translate(0, 1.26, -L / 4), smat('wood', '#7a5434')));
        g.add(mk(new THREE.SphereGeometry(0.05, 6, 5).translate(0, 0.92, -L / 4 + 0.24), smat(null, '#ff7a30', { emissive: '#ff5010', ei: 1.8 })));   /* brasa no kamado */
        g.add(mk(new THREE.CylinderGeometry(0.2, 0.16, 0.1, 16, 1, true).translate(0, 0.84, L / 4), cop)); g.add(mk(new THREE.CircleGeometry(0.17, 16).rotateX(-Math.PI / 2).translate(0, 0.81, L / 4), smat(null, '#7ac0c8', { rough: 0.05, metal: 0.3 })));
        for (let k = 0; k < 3; k++) g.add(mk(new THREE.CylinderGeometry(0.06, 0.04, 0.05, 10).translate(-0.25, 0.9, L / 4 - 0.15 + k * 0.14), smat(null, ['#e8e0d0', '#2a3a5a', '#8a3a2a'][k])));
        { const pl2 = new THREE.PointLight(0xff9a50, 0.35, 1.8); pl2.position.set(0, 1.0, -L / 4 + 0.3); g.add(pl2); } break; }
      case 'jobboard': {   // quadro de candidatos na parede (fundo, ou parede lateral quando é mais alto que largo); a mobília tem a altura achatada: 1 un. = 0,55
        const fr = smat('wood', '#3a2416', { bump: 0.8 }), side = f.h > f.w, L = side ? f.h : f.w, d0 = (side ? f.w : f.h), zb2 = -d0 / 2 + 0.2, jb = grp();
        jb.add(wbox(L - 0.25, 1.5, 0.05, 0, 2.35, zb2, fr, 1)); jb.add(mk(new THREE.PlaneGeometry(L - 0.38, 1.36).translate(0, 2.35, zb2 + 0.03), smat('jobboard', '#ffffff', { bump: 0.4, rough: 0.8 })));
        jb.add(wbox(L - 0.1, 0.1, 0.12, 0, 1.55, zb2 + 0.04, fr, 1)); jb.add(wbox(L - 0.1, 0.08, 0.1, 0, 3.12, zb2 + 0.03, fr, 1)); if (side) jb.rotation.y = -Math.PI / 2; g.add(jb); break; }
      case 'agcounter': {   // balcão da agenciadora: livro de registros aberto, tinteiro com pena, sineta de latão, pilha de fichas e plaquinha
        const side = f.h > f.w, L = side ? f.h : f.w, wd = smat('wood', '#3a2416', { bump: 1 }), top = smat('wood', '#6a4428', { bump: 0.6, rough: 0.4 }), brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }), pap = smat(null, '#f2ead6'), cg = grp();
        cg.add(wbox(L - 0.1, 1.6, 0.55, 0, 0.8, 0, wd, 1.4)); cg.add(wbox(L, 0.08, 0.7, 0, 1.64, 0.02, top, 1.4)); for (let k = 0; k < Math.round(L); k++) cg.add(wbox(0.8, 1.1, 0.02, -L / 2 + 0.5 + k, 0.8, 0.28, smat('wood', '#4a2e1a', { bump: 0.8 }), 1));   /* almofadas no painel */
        cg.add(wbox(L - 0.06, 0.06, 0.04, 0, 0.12, 0.28, brass, 1));
        cg.add(wbox(0.42, 0.04, 0.3, -0.5, 1.7, 0, pap)); cg.add(wbox(0.02, 0.05, 0.3, -0.5, 1.71, 0, smat(null, '#6a1e18'))); for (let k = 0; k < 4; k++) cg.add(wbox(0.16, 0.005, 0.01, -0.6 + (k % 2) * 0.2, 1.73, -0.08 + Math.floor(k / 2) * 0.08, smat(null, '#3a2a1a')));   /* livro aberto */
        cg.add(mk(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10).translate(0.1, 1.72, -0.12), smat(null, '#1a1a22', { rough: 0.2 }))); { const pen = mk(new THREE.ConeGeometry(0.02, 0.32, 6).translate(0, 0.16, 0), smat(null, '#f4f0e6')); pen.position.set(0.1, 1.76, -0.12); pen.rotation.z = -0.5; cg.add(pen); }   /* tinteiro e pena */
        cg.add(mk(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0.5, 1.68, 0.12), brass)); cg.add(mk(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6).translate(0.5, 1.77, 0.12), brass));   /* sineta */
        for (let k = 0; k < 5; k++) cg.add(wbox(0.22, 0.012, 0.16, L / 2 - 0.3 + (k % 2) * 0.01, 1.69 + k * 0.014, -0.15, pap));   /* fichas */
        cg.add(wbox(0.3, 0.14, 0.02, 0.35, 1.78, 0.22, smat(null, '#2e3a5a'))); if (side) cg.rotation.y = -Math.PI / 2; g.add(cg); break; }
      case 'waitbench': {   // banco de espera de madeira escura com encosto (os candidatos sentam aqui)
        const wd = smat('wood', '#5a3a22', { bump: 0.8 }), dk = smat('wood', '#2e1c10', { bump: 0.8 }), L = f.w - 0.15;
        g.add(wbox(L, 0.07, 0.46, 0, 0.6, 0.02, wd, 1)); for (const sx of [-L / 2 + 0.08, 0, L / 2 - 0.08]) for (const sz of [-0.17, 0.2]) g.add(wbox(0.06, 0.58, 0.06, sx, 0.29, sz, dk, 1));
        g.add(wbox(L, 0.5, 0.05, 0, 1.0, 0.25, wd, 1)); g.add(wbox(L + 0.04, 0.06, 0.08, 0, 1.27, 0.25, dk, 1)); for (const sx of [-L / 2 + 0.05, L / 2 - 0.05]) g.add(wbox(0.06, 0.4, 0.4, sx, 0.8, 0.03, dk, 1)); break; }
      case 'kakebar': { const dk = smat('wood', '#3a2212', { bump: 1 }); g.add(wbox(0.06, 1.5, 0.06, -0.05, 0.75, 0, dk, 1)); g.add(wbox(0.06, 1.5, 0.06, 0.55, 0.75, 0, dk, 1)); g.add(wbox(0.66, 0.05, 0.05, 0.25, 1.45, 0, dk, 1)); g.add(wbox(0.64, 0.06, 0.3, 0.25, 0.03, 0, dk, 1)); g.add(mk(new THREE.PlaneGeometry(0.3, 0.5).translate(0.4, 1.18, 0.03), smat('cloth', '#f4efe2', { bump: 0.3, side: THREE.DoubleSide }))); break; }
      case 'tokonoma': { const hin = smat('wood', '#d4a870', { bump: 0.7 }), dk = smat('wood', '#3a2212', { bump: 1 }); g.add(wbox(f.w - 0.05, 0.14, 0.7, 0, 0.07, -0.13, hin, 1)); g.add(wbox(0.12, Math.min(hw, 2.2), 0.12, f.w / 2 - 0.08, Math.min(hw, 2.2) / 2, 0.2, smat('bark', '#7a5a3a'), 1)); g.add(wbox(f.w - 0.05, 0.12, 0.1, 0, Math.min(hw, 2.2) - 0.3, 0.2, dk, 1));
        g.add(mk(new THREE.PlaneGeometry(0.5, 1.15).translate(-0.2, 1.05, -0.47), smat('kakejiku', '#ffffff', { bump: 0.3 }))); g.add(mk(new THREE.SphereGeometry(0.13, 12, 8).scale(1, 1.2, 1).translate(0.45, 0.28, -0.2), smat(null, '#2a3a4a', { rough: 0.3 })));
        for (let k = 0; k < 5; k++) g.add(mk(new THREE.SphereGeometry(0.045, 6, 5).translate(-0.6 + Math.cos(k) * 0.1, 0.42 + k * 0.07, -0.25), smat(null, ['#f0a0b8', '#ffffff', '#e86a7a', '#f4d860', '#ffffff'][k]))); g.add(mk(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 10).translate(-0.6, 0.24, -0.25), smat(null, '#c8b088'))); break; }
      case 'platbed': { const hin = smat('wood', '#c89a62', { bump: 0.7 }); g.add(wbox(1.9, 0.22, 1.9, 0, 0.11, 0, hin, 1)); g.add(wbox(1.6, 0.12, 1.6, 0, 0.28, 0.05, smat('cloth', '#f2ece0', { bump: 0.4 }), 1)); g.add(wbox(1.55, 0.06, 1.0, 0, 0.37, 0.28, smat('cloth', '#2a3a5a', { bump: 0.5 }), 1)); for (const x of [-0.4, 0.4]) g.add(wbox(0.5, 0.1, 0.24, x, 0.38, -0.6, smat('cloth', '#e8e0d0', { bump: 0.3 }), 1));
        for (const x of [-0.97, 0.97]) { g.add(mk(new THREE.BoxGeometry(0.22, 0.4, 0.22).translate(x, 0.42, -0.75), smat('shoji', '#ffffff', { emissive: '#ffcc80', ei: 0.9, bump: 0.3 }))); } { const pl2 = new THREE.PointLight(0xffc070, 0.55, 3); pl2.position.set(0, 0.8, -0.6); g.add(pl2); } break; }
      case 'kotatsu': { const dk = smat('wood', '#5a3420', { bump: 0.8 }); g.add(wbox(0.8, 0.26, 0.8, 0, 0.13, 0, smat('quilt', '#ffffff', { bump: 0.6 }), 1)); g.add(wbox(0.86, 0.04, 0.86, 0, 0.28, 0, dk, 1)); g.add(mk(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 8).translate(0.1, 0.34, 0.05), smat(null, '#e8e0d0'))); g.add(mk(new THREE.SphereGeometry(0.05, 8, 6).translate(-0.15, 0.34, -0.1), smat(null, '#e8902a'))); for (const [x, z] of [[0, 0.62], [-0.62, 0]]) g.add(wbox(0.36, 0.06, 0.36, x, 0.03, z, smat('cloth', '#8a2a2a', { bump: 0.5 }), 1)); break; }
      case 'zengarden': { g.add(wbox(f.w - 0.04, 0.1, f.h - 0.04, 0, 0.05, 0, smat('wood', '#5a3a20', { bump: 1 }), 1)); g.add(mk(wuv(new THREE.BoxGeometry(f.w - 0.2, 0.04, f.h - 0.2).translate(0, 0.1, 0), 1), smat('gravel', '#ffffff', { bump: 1.2 })));
        for (const [x, z, r] of [[-0.4, -0.3, 0.16], [0.3, 0.35, 0.11], [0.45, -0.4, 0.08]]) g.add(mk(new THREE.DodecahedronGeometry(r, 0).scale(1, 0.7, 1).translate(x, 0.12 + r * 0.5, z), smat('rock', '#6a6660', { bump: 1.2 })));
        { const ln = grp(wbox(0.12, 0.3, 0.12, 0, 0.15, 0, smat('stoneblock', '#8a8680', { bump: 1 }), 1), wbox(0.24, 0.16, 0.24, 0, 0.38, 0, smat('stoneblock', '#8a8680', { bump: 1 }), 1), mk(new THREE.ConeGeometry(0.22, 0.14, 4).rotateY(Math.PI / 4).translate(0, 0.53, 0), smat('stoneblock', '#7a7670', { bump: 1 })), mk(new THREE.BoxGeometry(0.12, 0.08, 0.13).translate(0, 0.38, 0), smat(null, '#ffd890', { emissive: '#ffb040', ei: 1.2 }))); ln.position.set(0.55, 0.1, 0.5); g.add(ln); }
        g.add(mk(new THREE.CylinderGeometry(0.1, 0.08, 0.12, 8).translate(-0.55, 0.17, 0.5), smat(null, '#4a5a6a'))); g.add(limb(V3(-0.55, 0.2, 0.5), V3(-0.5, 0.45, 0.45), 0.025, 0.015, smat('bark', '#5a3e28'), 4)); g.add(mk(new THREE.SphereGeometry(0.15, 8, 6).scale(1.3, 0.55, 1).translate(-0.48, 0.48, 0.45), smat(null, '#3e6a2e')));
        for (let k = 0; k < 4; k++) g.add(limb(V3(-0.85 + k * 0.06, 0.1, -0.85), V3(-0.85 + k * 0.06, 1.7, -0.85), 0.025, 0.02, smat(null, '#7a9a4a'), 6));
        if (b.deco === 'machiya') { const gold = smat(null, '#d4a94a', { metal: 0.95, rough: 0.25 }), ebony = smat('wood', '#2a1810', { bump: 0.6, rough: 0.3 }); g.add(wbox(0.26, 0.06, 0.26, 0.45, 0.13, -0.4, smat('stoneblock', '#8a8680'), 1)); g.add(wbox(0.1, 1.3, 0.1, 0.45, 0.8, -0.4, ebony, 1)); g.add(wbox(0.15, 0.3, 0.09, 0.45, 1.14, -0.33, smat('thatch', '#e0c070', { bump: 1.2 }), 1)); for (const y of [0.98, 1.3]) g.add(wbox(0.17, 0.025, 0.11, 0.45, y, -0.33, gold, 1)); g.add(mk(new THREE.SphereGeometry(0.04, 8, 6).translate(0.45, 1.48, -0.4), gold)); }   /* makiwara particular de ébano e ouro */
        break; }
      case 'hpart': {   // divisória de tábuas das cabines (v=0 ao longo de x, 1 ao longo de z, 2 canto); papel de parede do lado de dentro
        const H = 2.1, plank = smat('oldplank', '#7a5634', { bump: 1.2 }), paper = smat('wallpaper', '#ffffff', { bump: 0.5 }), wp = f.wp || '', post = smat('wood', '#3a2212', { bump: 1 });
        const face = (k2, d) => (wp.includes(k2) ? paper : plank);
        if (f.v !== 1) g.add(mk(new THREE.BoxGeometry(1.0, H, 0.1).translate(0, H / 2, 0), [plank, plank, post, post, face('pz'), face('nz')]));
        if (f.v !== 0) g.add(mk(new THREE.BoxGeometry(0.1, H, 1.0).translate(0, H / 2, 0), [face('px'), face('nx'), post, post, plank, plank]));
        g.add(mk(new THREE.BoxGeometry(f.v === 1 ? 0.14 : 1.02, 0.07, f.v === 0 ? 0.14 : 1.02).translate(0, H + 0.035, 0), post));   // travessa de cima
        if (f.v === 2) g.add(mk(new THREE.BoxGeometry(0.16, H + 0.08, 0.16).translate(0, (H + 0.08) / 2, 0), post));
        break; }
      case 'cabindoor': {   // batente da porta da cabine (a folha é desenhada à parte e abre quando alguém passa)
        const H = 2.1, post = smat('wood', '#3a2212', { bump: 1 }), alongX = f.v !== 1;
        for (const s of [-0.47, 0.47]) g.add(mk(new THREE.BoxGeometry(alongX ? 0.08 : 0.12, H, alongX ? 0.12 : 0.08).translate(alongX ? s : 0, H / 2, alongX ? 0 : s), post));
        g.add(mk(new THREE.BoxGeometry(alongX ? 1.02 : 0.14, 0.12, alongX ? 0.14 : 1.02).translate(0, H - 0.04, 0), post));
        g.add(mk(new THREE.BoxGeometry(alongX ? 0.92 : 0.1, 0.03, alongX ? 0.1 : 0.92).translate(0, 0.015, 0), post));
        break; }
      case 'bucket': g.add(mk(new THREE.CylinderGeometry(0.17, 0.14, 0.3, 12).translate(0.1, 0.15, -0.15), smat('wood', '#5a4028', { bump: 1 }))); g.add(mk(new THREE.TorusGeometry(0.165, 0.012, 5, 14).rotateX(Math.PI / 2).translate(0.1, 0.25, -0.15), smat(null, '#3e3c3a', { metal: 0.8 }))); break;
      case 'stove': {   // fogão a lenha de ferro: corpo escuro, boca com brasa, chapa, panela fumegante e cano
        const iron = smat(null, '#2e2a28', { metal: 0.6, rough: 0.5 }), dz = backZ ? -0.12 : 0, dx = backX ? -0.12 : 0;
        g.add(mk(new THREE.BoxGeometry(0.8, 0.72, 0.62).translate(dx, 0.36, dz), iron)); g.add(mk(new THREE.BoxGeometry(0.84, 0.05, 0.66).translate(dx, 0.74, dz), smat(null, '#1e1c1a', { metal: 0.7, rough: 0.4 })));
        g.add(mk(new THREE.BoxGeometry(0.34, 0.18, 0.02).translate(dx, 0.3, dz + 0.32), smat(null, '#ff7a2a', { emissive: '#ff5a10', ei: 1.4 })));
        g.add(mk(new THREE.CylinderGeometry(0.17, 0.14, 0.2, 14).translate(dx - 0.12, 0.86, dz), smat(null, '#5a5650', { metal: 0.8, rough: 0.35 })));
        g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8).translate(dx + 0.25, 1.3, dz - 0.18), iron)); break; }
      case 'barrel': { const br = mBarrel(); br.scale.setScalar(0.75); g.add(br); break; }
      case 'crate': { const cr = mCrate(); cr.scale.setScalar(0.8); g.add(cr); if (f.v === 7) for (let k = 0; k < 9; k++) g.add(mk(new THREE.SphereGeometry(0.07, 8, 6).translate(-0.18 + (k % 3) * 0.18, 0.62, -0.18 + Math.floor(k / 3) * 0.18), smat(null, k % 4 ? '#b8281e' : '#7ab83a', { rough: 0.45 }))); break; }
      case 'mirror': { const gold = smat(null, '#d4a94a', { metal: 1, rough: 0.3 }), dz = backZ ? -0.36 : 0, dx = backX ? -0.36 : 0;
        g.add(mk(new THREE.BoxGeometry(backX ? 0.08 : 0.86, 1.9, backX ? 0.86 : 0.08).translate(dx, 1.05, dz), gold));
        g.add(mk(new THREE.BoxGeometry(backX ? 0.04 : 0.72, 1.7, backX ? 0.72 : 0.04).translate(dx + (backX ? 0.04 : 0), 1.05, dz + (backX ? 0 : 0.04)), smat(null, '#cfe0ea', { metal: 0.9, rough: 0.05 })));
        g.add(mk(new THREE.SphereGeometry(0.09, 10, 8).translate(dx, 2.05, dz), gold)); break; }
      case 'clothrack': { const gold = smat(null, '#c9a24a', { metal: 1, rough: 0.35 }); g.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8).rotateZ(Math.PI / 2).translate(0, 1.55, 0), gold)); for (const x of [-0.42, 0.42]) g.add(mk(new THREE.CylinderGeometry(0.025, 0.03, 1.55, 8).translate(x, 0.78, 0), gold));
        const cols = ['#6a1424', '#1e2a5a', '#2a4a2a', '#e8dcc0', '#3a1a3a']; for (let k = 0; k < 5; k++) g.add(mk(new THREE.BoxGeometry(0.12, 0.85, 0.42).translate(-0.32 + k * 0.16, 1.08, 0), cloth(cols[(k + f.i) % 5]))); break; }
      case 'chest': g.add(wbox(0.7, 0.42, 0.45, 0, 0.21, 0, W_(), 2)); g.add(mk(new THREE.CylinderGeometry(0.225, 0.225, 0.7, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0.42, 0), W_())); for (const x of [-0.25, 0.25]) g.add(mk(new THREE.BoxGeometry(0.05, 0.5, 0.47).translate(x, 0.3, 0), IRON())); break;
      case 'table': g.add(wbox(f.w - 0.15, 0.06, f.h - 0.15, 0, 0.74, 0, W_(), 1.5)); for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(wbox(0.06, 0.72, 0.06, px * (f.w / 2 - 0.15), 0.36, pz * (f.h / 2 - 0.15), DW(), 2)); for (let k = 0; k < Math.max(2, f.h * 2); k++) { const z = -f.h / 2 + 0.3 + k * (f.h - 0.6) / Math.max(1, f.h * 2 - 1); g.add(mk(new THREE.CylinderGeometry(0.045, 0.04, 0.12, 8).translate((k % 2 ? 0.2 : -0.2) * Math.min(1, f.w), 0.83, z), smat('wood', '#8a5424'))); if (k % 3 === 0) g.add(mk(new THREE.CylinderGeometry(0.12, 0.1, 0.03, 12).translate(0, 0.78, z + 0.1), smat(null, '#c8b8a0', { rough: 0.5 }))); } g.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6).translate(0, 0.85, 0), smat(null, '#f4ecd8', { emissive: '#ffcc66', ei: 0.4 }))); break;
      case 'chair': { const sd = f.seat; g.add(wbox(0.42, 0.05, 0.42, 0, 0.45, 0, W_(), 2)); for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(wbox(0.04, 0.45, 0.04, px * 0.18, 0.22, pz * 0.18, DW(), 2)); const bx = sd === 1 ? -0.19 : sd === 5 ? 0.19 : 0, bz = sd === 7 ? -0.19 : sd === 3 ? 0.19 : 0; g.add(wbox(bx ? 0.04 : 0.42, 0.5, bz ? 0.04 : 0.42, bx, 0.72, bz, DW(), 2)); break; }
      case 'pew': g.add(wbox(f.w - 0.1, 0.06, 0.42, 0, 0.45, -0.05, W_(), 2)); g.add(wbox(f.w - 0.1, 0.55, 0.05, 0, 0.75, 0.17, W_(), 2)); for (const px of [-(f.w - 0.2) / 2, (f.w - 0.2) / 2]) g.add(wbox(0.06, 0.95, 0.46, px, 0.47, 0, DW(), 2)); break;
      case 'shelf': if (f.v === 7) { const along = backZ, cols7 = ['#7ad8e8', '#e86ac8', '#a8e86a', '#e8c84a', '#8a6ae8', '#ff8a5a']; g.add(wbox(along ? 0.9 : 0.35, 2.0, along ? 0.35 : 0.9, along ? 0 : -0.3, 1.0, along ? -0.3 : 0, smat('wood', '#2a1e2a', { bump: 1 }), 2));
        for (let sy = 0; sy < 5; sy++) { g.add(wbox(along ? 0.86 : 0.3, 0.03, along ? 0.3 : 0.86, along ? 0 : -0.28, 0.2 + sy * 0.4, along ? -0.28 : 0, smat(null, '#c9a24a', { metal: 0.8, rough: 0.3 }), 2)); for (let k = 0; k < 4; k++) { const off = -0.3 + k * 0.2, c = cols7[(k + sy * 2) % 6]; g.add(mk(new THREE.CylinderGeometry(0.035, 0.05, 0.15 + (k % 2) * 0.06, 8).translate(along ? off : -0.28, 0.3 + sy * 0.4, along ? -0.28 : off), smat(null, c, { emissive: c, ei: 0.9, rough: 0.1 }))); } }
        break; } { const along = backZ; g.add(wbox(along ? 0.9 : 0.35, 1.8, along ? 0.35 : 0.9, along ? 0 : -0.3, 0.9, along ? -0.3 : 0, DW(), 2)); const cols = [['#c8a050', '#8a5a2a', '#d8d0b0', '#6a8a4a'], ['#3ad878', '#d84a6a', '#5aa8f0', '#e8c040'], ['#6a2a2a', '#2a3a6a', '#3a5a2a', '#7a5a2a'], ['#c83a3a', '#3a5ac8', '#e8d8b0', '#8a3ac8'], ['#e8dcb8', '#c8b080', '#d8c8a0', '#a88a5a']][f.v || 0]; for (let sy = 0; sy < 4; sy++) { g.add(wbox(along ? 0.86 : 0.3, 0.03, along ? 0.3 : 0.86, along ? 0 : -0.28, 0.25 + sy * 0.45, along ? -0.28 : 0, W_(), 2)); for (let k = 0; k < 4; k++) { const off = -0.3 + k * 0.2, c = cols[(k + sy) % 4]; const gm = f.v === 1 ? new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8) : f.v === 2 ? new THREE.BoxGeometry(0.06, 0.24, 0.16) : f.v === 3 ? new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8).rotateZ(Math.PI / 2) : new THREE.CylinderGeometry(0.06, 0.07, 0.15, 8); g.add(mk(gm.translate(along ? off : -0.28, 0.35 + sy * 0.45, along ? -0.28 : off), smat(null, c, { rough: f.v === 1 ? 0.1 : 0.6 }))); } } break; }
      case 'bankdesk': { const dk = smat('wood', '#3a2214', { bump: 1.2 }), gold = smat(null, '#d4a94a', { metal: 1, rough: 0.3 });
        { const side = f.v === 2 ? 1 : -1;   // extras de Gringotes (lado do banqueiro = parede)
          g.add(mk(new THREE.CylinderGeometry(0.012, 0.016, 0.38, 6).translate(0.05, 1.6, 0.2), gold)); g.add(mk(new THREE.BoxGeometry(0.34, 0.012, 0.012).translate(0.05, 1.78, 0.2), gold));
          for (const x of [-0.12, 0.22]) { g.add(mk(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4).translate(x, 1.71, 0.2), gold)); g.add(mk(new THREE.CylinderGeometry(0.07, 0.05, 0.02, 10).translate(x, 1.64, 0.2), gold)); }
          g.add(mk(new THREE.BoxGeometry(0.26, 0.05, 0.2).translate(-0.18, 1.43, -0.18), smat('leather', '#5a1416'))); g.add(mk(new THREE.BoxGeometry(0.24, 0.035, 0.18).translate(-0.18, 1.46, -0.18), smat(null, '#efe6cc', { rough: 1 })));
          g.add(mk(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 8).translate(0.3, 1.44, 0.3), smat(null, '#1a1a22', { rough: 0.2 }))); const q = mk(new THREE.CylinderGeometry(0.004, 0.012, 0.22, 4).translate(0, 0.11, 0), smat(null, '#f4f0e6', { rough: 1 })); q.position.set(0.3, 1.46, 0.3); q.rotation.z = 0.45; g.add(q);
          g.add(mk(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12).translate(side * 0.75, 1.0, 0), dk)); g.add(mk(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 6).translate(side * 0.75, 0.5, 0), dk)); } g.add(wbox(0.8, 1.35, 0.9, 0, 0.675, 0, dk, 1.5)); g.add(wbox(0.9, 0.06, 1.0, 0, 1.38, 0, dk, 1.5)); g.add(mk(new THREE.BoxGeometry(0.3, 0.04, 0.22).translate(0, 1.43, 0.1), smat(null, '#efe6cf', { rough: 1 }))); g.add(mk(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8).translate(0.28, 1.53, -0.25), gold)); g.add(mk(new THREE.SphereGeometry(0.07, 8, 6).translate(0.28, 1.7, -0.25), smat(null, '#ffd890', { emissive: '#ffb850', ei: 1.2 }))); for (let k = 0; k < 3; k++) g.add(mk(new THREE.CylinderGeometry(0.05, 0.05, 0.03 + k * 0.02, 10).translate(-0.25, 1.42 + k * 0.025, 0.2), gold)); break; }
      case 'rails': { const ir = smat(null, '#4a4a50', { metal: 1, rough: 0.5 }), wd = smat('wood', '#4a3020');   // trilhos saindo do cofre e a vagoneta
        for (const x of [-0.22, 0.22]) g.add(mk(new THREE.BoxGeometry(0.05, 0.05, 1.6).translate(x, 0.05, 0.2), ir)); for (let k = 0; k < 6; k++) g.add(mk(new THREE.BoxGeometry(0.62, 0.04, 0.1).translate(0, 0.02, -0.5 + k * 0.28), wd));
        g.add(mk(new THREE.BoxGeometry(0.62, 0.42, 0.7).translate(0, 0.36, 0.25), smat(null, '#5a5a62', { metal: 0.9, rough: 0.45 }))); g.add(mk(new THREE.BoxGeometry(0.66, 0.05, 0.74).translate(0, 0.58, 0.25), smat(null, '#c9a24a', { metal: 1, rough: 0.3 })));
        for (const [x, z] of [[-0.25, 0.0], [0.25, 0.0], [-0.25, 0.5], [0.25, 0.5]]) g.add(mk(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10).rotateZ(Math.PI / 2).translate(x, 0.1, z), ir));
        for (let k = 0; k < 6; k++) g.add(mk(new THREE.SphereGeometry(0.07, 8, 6).translate(-0.18 + (k % 3) * 0.18, 0.62, 0.12 + Math.floor(k / 3) * 0.22), smat(null, '#e8c048', { metal: 1, rough: 0.25 }))); break; }
      case 'goldsacks': { const sk = smat(null, '#a8916a', { rough: 1 }), gold = smat(null, '#e8c048', { metal: 1, rough: 0.25 });
        for (const [x, z, s] of [[-0.2, -0.1, 1], [0.2, 0.05, 0.85], [0, 0.3, 0.75], [-0.05, -0.05, 0.6]]) { const b = mk(new THREE.SphereGeometry(0.28 * s, 10, 8).translate(x, 0.24 * s + (s < 0.7 ? 0.38 : 0), z), sk); b.scale.set(1, 1.15, 1); g.add(b); g.add(mk(new THREE.CylinderGeometry(0.05 * s, 0.09 * s, 0.1, 8).translate(x, 0.55 * s + (s < 0.7 ? 0.38 : 0), z), smat(null, '#7a5a30', { rough: 1 }))); }
        for (let k = 0; k < 9; k++) g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 10).translate(-0.35 + (k % 3) * 0.12, 0.01 + Math.floor(k / 3) * 0.016, 0.42), gold)); break; }
      case 'starrug': g.add(mk(new THREE.PlaneGeometry(f.w - 0.1, f.h - 0.1).rotateX(-Math.PI / 2).translate(0, 0.07, 0), smat('celestial', '#ffffff', { rough: 0.8 }))); break;
      case 'spellbooks': { g.add(wbox(0.8, 0.75, 0.55, 0, 0.375, 0, DW(), 2)); for (let k = 0; k < 4; k++) g.add(mk(new THREE.BoxGeometry(0.3, 0.06, 0.22).translate(-0.12 + (k % 2) * 0.05, 0.8 + k * 0.06, -0.05), smat(null, ['#4a1a5a', '#1a3a4a', '#5a1a1a', '#2a4a1a'][k], { rough: 0.6 })));
        g.add(mk(new THREE.BoxGeometry(0.42, 0.02, 0.3).rotateX(-0.25).translate(0.18, 0.86, 0.1), smat(null, '#efe4c8'))); g.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8).translate(-0.3, 0.84, 0.18), smat(null, '#f4ecd8', { emissive: '#ffcc66', ei: 0.8 }))); break; }
      case 'still': {   // destilador de latão e vidro, com líquido brilhando
        const brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }), glass = smat(null, '#9ae8d8', { emissive: '#3ac8a8', ei: 0.9, rough: 0.05, transparent: true, opacity: 0.75 });
        g.add(wbox(0.8, 0.7, 0.6, 0, 0.35, 0, DW(), 2)); g.add(mk(new THREE.SphereGeometry(0.18, 14, 10).translate(-0.18, 0.92, 0), glass)); g.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6).rotateZ(-0.9).translate(0.02, 1.12, 0), brass));
        g.add(mk(new THREE.CylinderGeometry(0.1, 0.12, 0.26, 12).translate(0.24, 0.84, 0), glass)); g.add(mk(new THREE.TorusGeometry(0.08, 0.015, 6, 14).translate(0.24, 1.0, 0), brass)); g.add(mk(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 10).translate(-0.18, 0.72, 0), smat(null, '#ff7a2a', { emissive: '#ff5a10', ei: 1.4 }))); break; }
      case 'goldbars': {   // pilha de barras de ouro e moedas (no tesouro, atrás das grades)
        const gold = smat(null, '#e8c048', { metal: 1, rough: 0.22 }); g.add(wbox(0.8, 0.12, 0.6, 0, 0.06, -0.1, smat('wood', '#4a2e1a'), 1));
        for (let l = 0; l < 3; l++) for (let k = 0; k < 4 - l; k++) g.add(mk(new THREE.BoxGeometry(0.16, 0.07, 0.3).translate(-0.27 + k * 0.18 + l * 0.09, 0.16 + l * 0.075, -0.1), gold));
        for (let k = 0; k < 4; k++) for (let q = 0; q < 3 + k; q++) g.add(mk(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 10).translate(0.28, 0.13 + q * 0.014, 0.18 - k * 0.04), gold)); break; }
      case 'clock': {   // relógio de pêndulo na parede
        const wd2 = smat('wood', '#3a2214'), brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }), side = backX ? -0.42 : 0.42;
        const cg = grp(); cg.add(wbox(0.44, 1.7, 0.26, 0, 0.85, 0, wd2, 1.5)); cg.add(mk(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20).rotateX(Math.PI / 2).translate(0, 1.42, 0.14), smat(null, '#efe6cc'))); cg.add(mk(new THREE.TorusGeometry(0.17, 0.02, 5, 20).translate(0, 1.42, 0.14), brass));
        cg.add(mk(new THREE.BoxGeometry(0.01, 0.12, 0.01).translate(0, 1.47, 0.155), smat(null, '#1a1a1a'))); cg.add(mk(new THREE.BoxGeometry(0.08, 0.01, 0.01).translate(0.03, 1.42, 0.155), smat(null, '#1a1a1a')));
        cg.add(mk(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4).translate(0, 0.85, 0.12), brass)); cg.add(mk(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14).rotateX(Math.PI / 2).translate(0, 0.6, 0.12), brass));
        cg.rotation.y = backX ? Math.PI / 2 : -Math.PI / 2; cg.position.set(backX ? -0.36 : 0.36, 0, 0); g.add(cg); break; }
      case 'ratesboard': {   // quadro com as taxas do banco
        const gb = grp(); gb.add(wbox(0.9, 0.7, 0.04, 0, 1.55, 0, smat('wood', '#3a2214'), 1)); gb.add(mk(new THREE.PlaneGeometry(0.82, 0.62).translate(0, 1.55, 0.025), smat('rates', '#ffffff', { rough: 0.6 })));
        gb.rotation.y = backX ? Math.PI / 2 : -Math.PI / 2; gb.position.set(backX ? -0.46 : 0.46, 0, 0); g.add(gb); break; }
      case 'pillar': { const mb = smat('stoneblock', '#efe9dc', { bump: 0.6 }), gold = smat(null, '#c9a24a', { metal: 1, rough: 0.3 }); g.add(mk(new THREE.BoxGeometry(0.62, 0.18, 0.62).translate(0, 0.09, 0), mb)); g.add(mk(new THREE.CylinderGeometry(0.22, 0.25, 3.0, 16).translate(0, 1.68, 0), mb)); g.add(mk(new THREE.BoxGeometry(0.6, 0.2, 0.6).translate(0, 3.28, 0), mb)); g.add(mk(new THREE.TorusGeometry(0.25, 0.03, 6, 16).rotateX(Math.PI / 2).translate(0, 0.3, 0), gold)); break; }
      case 'chandelier': { const gold = smat(null, '#d4a94a', { metal: 1, rough: 0.3 }), fl = smat(null, '#ffd890', { emissive: '#ffb850', ei: 1.6 });   // lustre pendurado (corrente até o teto)
        g.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 4).translate(0, 3.3, 0), gold)); g.add(mk(new THREE.TorusGeometry(0.42, 0.035, 6, 20).rotateX(Math.PI / 2).translate(0, 2.65, 0), gold)); g.add(mk(new THREE.SphereGeometry(0.08, 8, 6).translate(0, 2.6, 0), gold));
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42; g.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6).translate(x, 2.74, z), smat(null, '#f4ecd8', { rough: 1 }))); g.add(mk(new THREE.SphereGeometry(0.035, 6, 5).translate(x, 2.83, z), fl)); }
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; g.add(mk(new THREE.OctahedronGeometry(0.035).translate(Math.cos(a) * 0.3, 2.5, Math.sin(a) * 0.3), smat(null, '#e8f4ff', { rough: 0.05, metal: 0.2 }))); } break; }
      case 'vault': { const ir = smat(null, '#8a8e96', { metal: 1, rough: 0.35 }), gold = smat(null, '#c9a24a', { metal: 1, rough: 0.3 }), st = smat('stoneblock', '#6a665e', { bump: 1.2 });
        g.add(mk(new THREE.TorusGeometry(1.15, 0.18, 8, 32).translate(0, 1.3, -0.4), st)); g.add(mk(new THREE.CylinderGeometry(1.05, 1.05, 0.22, 32).rotateX(Math.PI / 2).translate(0, 1.3, -0.38), ir));
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.add(mk(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10).rotateX(Math.PI / 2).translate(Math.cos(a) * 0.82, 1.3 + Math.sin(a) * 0.82, -0.25), gold)); }
        g.add(mk(new THREE.TorusGeometry(0.35, 0.04, 6, 20).translate(0, 1.3, -0.24), gold)); for (let k = 0; k < 6; k++) { const s = mk(new THREE.BoxGeometry(0.7, 0.04, 0.04).translate(0, 1.3, -0.24), gold); s.rotation.z = k / 6 * Math.PI; s.position.set(0, 0, 0); g.add(s); }
        g.add(mk(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12).rotateX(Math.PI / 2).translate(0, 1.3, -0.2), gold)); break; }
      case 'counter': if (f.v === 9) { const gold = smat(null, '#d4a94a', { metal: 1, rough: 0.3 }); g.add(wbox(f.w - 0.05, 0.95, 0.6, 0, 0.475, 0, smat('wood', '#2a1610', { bump: 1.2 }), 1.5)); g.add(mk(new THREE.BoxGeometry(f.w + 0.05, 0.06, 0.7).translate(0, 0.99, 0), smat(null, '#1a1a1e', { rough: 0.15, metal: 0.3 }))); g.add(mk(new THREE.BoxGeometry(f.w - 0.1, 0.05, 0.62).translate(0, 0.12, 0.01), gold)); g.add(mk(new THREE.BoxGeometry(f.w - 0.1, 0.05, 0.62).translate(0, 0.86, 0.01), gold)); break; }
        g.add(wbox(f.w - 0.05, 0.95, 0.6, 0, 0.475, 0, smat('wood', '#5a3a1e', { bump: 1.2 }), 1.5)); g.add(wbox(f.w + 0.05, 0.07, 0.7, 0, 0.98, 0, W_(), 1.5)); for (let k = 0; k < f.w * 2; k++) g.add(mk((k % 2 ? new THREE.CylinderGeometry(0.05, 0.045, 0.14, 8) : new THREE.BoxGeometry(0.16, 0.1, 0.12)).translate(-f.w / 2 + 0.3 + k * 0.5, 1.08, 0), smat(null, ['#c8a050', '#8a5a2a', '#3ad878', '#d84a6a', '#e8dcb8'][(k + (f.v || 0)) % 5], { rough: 0.5 }))); break;
      case 'display': g.add(wbox(0.85, 0.75, 0.6, 0, 0.375, 0, W_(), 2)); for (let k = 0; k < 5; k++) g.add(mk(new THREE.SphereGeometry(0.06, 8, 6).translate(-0.3 + k * 0.15, 0.82, (k % 2) * 0.15 - 0.07), smat(null, ['#e8b030', '#c83a3a', '#3ad878', '#5aa8f0', '#e8e0c8'][(k + (f.v || 0)) % 5], { rough: 0.4 }))); break;
      case 'mannequin': g.add(wbox(0.06, 1.1, 0.06, 0, 0.55, 0, DW(), 2)); g.add(mk(new THREE.CylinderGeometry(0.17, 0.12, 0.6, 10).translate(0, 1.3, 0), cloth('#7a2a5a'))); g.add(mk(new THREE.CylinderGeometry(0.22, 0.12, 0.5, 10).translate(0, 0.85, 0), cloth('#5a1a3a'))); break;
      case 'orb': g.add(wbox(0.6, 0.8, 0.6, 0, 0.4, 0, cloth('#2a1a4a'), 2)); g.add(mk(new THREE.SphereGeometry(0.17, 16, 12).translate(0, 1.0, 0), smat(null, '#b080ff', { emissive: '#7a4ae8', ei: 1.4, rough: 0.1 }))); break;
      case 'cauldron': g.add(mk(new THREE.SphereGeometry(0.32, 14, 10, 0, 6.28, Math.PI * 0.3, Math.PI * 0.7).translate(0, 0.42, 0), smat(null, '#1e1e22', { metal: 0.6, rough: 0.5, side: THREE.DoubleSide }))); g.add(mk(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 14).translate(0, 0.6, 0), smat(null, '#3ad878', { emissive: '#1a9a4a', ei: 1.3 }))); break;
      case 'forge': g.add(wbox(1.8, 0.8, 0.85, 0, 0.4, -0.05, smat('brick', '#6a665e', { bump: 1.4 }), 1.5)); g.add(mk(new THREE.BoxGeometry(1.2, 0.05, 0.55).translate(0, 0.82, 0), smat(null, '#3a1208', { emissive: '#ff5a10', ei: 2 }))); g.add(mk(new THREE.ConeGeometry(0.8, 0.9, 4).rotateY(Math.PI / 4).translate(0, 1.9, -0.15), smat('brick', '#5a564e'))); g.add(wbox(0.4, 1.0, 0.4, 0, 2.6, -0.25, smat('brick', '#5a564e'), 1.5)); { const pl = new THREE.PointLight(0xff7a30, 1.8, 5); pl.position.set(0, 1.1, 0.4); g.add(pl); } break;
      case 'anvil': g.add(mAnvil()); break;
      case 'stairup': {
        // escada de 2 tiles encostada na parede, subindo ao longo dela (dv = de baixo para o topo)
        const sm = smat('wood', '#6a4a2c', { bump: 1.2 }), tm = smat('wood', '#8a6038', { bump: 1 }), n = 10, fh = H / nF, [ux, uz] = f.dv;
        const wx = ux ? 0 : -1, wz = ux ? -1 : 0;                  // lado da parede
        for (let s2 = 0; s2 < n; s2++) {
          const s = -1 + (s2 + 0.5) * 2 / n, hh = (s2 + 1) * fh / n, px = ux * s + wx * 0.04, pz = uz * s + wz * 0.04;
          g.add(wbox(ux ? 2 / n : 0.84, hh, ux ? 0.84 : 2 / n, px, hh / 2, pz, sm, 2));
          g.add(wbox(ux ? 2 / n + 0.02 : 0.88, 0.035, ux ? 0.88 : 2 / n + 0.02, px - wx * 0.01, hh + 0.017, pz - wz * 0.01, tm, 2));
        }
        const ox = -wx * 0.44, oz = -wz * 0.44;
        g.add(limb(V3(-ux + ox, 0.95, -uz + oz), V3(ux + ox, fh + 0.95, uz + oz), 0.03, 0.03, DW(), 5));
        for (let k = 0; k <= 4; k++) { const s = -1 + k * 0.5, y0 = Math.max(0, (s + 1) / 2 * fh); g.add(wbox(0.05, 0.95, 0.05, ux * s + ox, y0 + 0.47, uz * s + oz, DW(), 2)); }
        g.add(mk(new THREE.BoxGeometry(ux ? 0.9 : 0.9, 0.04, 0.9).translate(-ux * 0.5, 0.075, -uz * 0.5), smat(null, '#c8a050', { emissive: '#6a4a10', ei: 0.25, transparent: true, opacity: 0.3 }), false));
        break;
      }
      case 'telescope': {   // telescópio de latão num tripé, apontado para o céu
        const brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.28 });
        for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; g.add(limb(V3(Math.cos(a) * 0.32, 0.06, Math.sin(a) * 0.32), V3(0, 0.95, 0), 0.025, 0.02, DW(), 4)); }
        const tb = grp(mk(new THREE.CylinderGeometry(0.07, 0.1, 1.1, 14), brass), mk(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 14).translate(0, 0.55, 0), brass), mk(new THREE.CircleGeometry(0.1, 14).rotateX(-Math.PI / 2).translate(0, 0.585, 0), smat(null, '#9ab8e8', { emissive: '#3a4a8a', ei: 0.6, rough: 0.05 })));
        tb.rotation.z = -0.75; tb.rotation.y = 0.6; tb.position.set(0, 1.05, 0); g.add(tb); break;
      }
      case 'taps': {   // barris deitados num cavalete com torneiras de latão, canecas penduradas em cima
        const brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 });
        g.add(wbox(0.9, 0.4, 0.5, 0, 0.2, -0.15, DW(), 2)); for (const [y, x] of [[0.62, -0.22], [0.62, 0.22], [1.08, 0]]) { const br = mBarrel(); br.scale.setScalar(0.55); br.rotation.z = Math.PI / 2; br.position.set(x + 0.17, y - 0.18, -0.15); g.add(br); g.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6).rotateX(Math.PI / 2).translate(x, y, 0.15), brass)); }
        for (let k = 0; k < 4; k++) g.add(mk(new THREE.CylinderGeometry(0.05, 0.045, 0.12, 8).translate(-0.3 + k * 0.2, 1.5, -0.38), smat('wood', '#a8783a')));
        g.add(wbox(0.92, 0.04, 0.06, 0, 1.6, -0.4, DW(), 2)); break;
      }
      case 'bar': {   // balcão longo de tábuas grossas com canecas, garrafas e um pano
        const L = (f.w || 1) - 0.1; g.add(wbox(L, 0.95, 0.55, 0, 0.475, 0, smat('oldplank', '#5a3a22', { bump: 1.2 }), 2)); g.add(wbox(L + 0.08, 0.06, 0.65, 0, 0.98, 0, smat('wood', '#7a5434'), 2));
        for (let k = 0; k < 3; k++) { const x = -L / 2 + 0.25 + k * (L - 0.5) / 2; g.add(mk(new THREE.CylinderGeometry(0.06, 0.055, 0.14, 10).translate(x, 1.08, 0.08 * (k % 2)), smat('wood', '#a8783a'))); g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10).translate(x, 1.16, 0.08 * (k % 2)), smat(null, '#f4ead4'))); }
        g.add(mk(new THREE.CylinderGeometry(0.035, 0.045, 0.24, 8).translate(L / 2 - 0.15, 1.13, -0.1), smat(null, '#2a5a2a', { rough: 0.2 }))); g.add(mk(new THREE.BoxGeometry(0.22, 0.01, 0.16).translate(-L / 2 + 0.2, 1.015, -0.12), smat('cloth', '#d8ccb0'))); break;
      }
      case 'bottles': {   // prateleira de garrafas coloridas na parede
        const side = f.j === 0 ? 'b' : f.i === 0 ? 'l' : 'r', sg = grp(); sg.add(wbox(0.92, 1.7, 0.08, 0, 0.85, -0.4, DW(), 2));
        for (let r = 0; r < 3; r++) { const y = 0.5 + r * 0.45; sg.add(wbox(0.9, 0.04, 0.3, 0, y, -0.28, W_(), 2)); for (let k = 0; k < 5; k++) sg.add(mk(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8).translate(-0.34 + k * 0.17, y + 0.13, -0.28), smat(null, ['#2a5a2a', '#6a2a1a', '#3a2a5a', '#8a6a2a', '#1a3a4a'][(k + r) % 5], { rough: 0.15 }))); }
        if (b.kind === 'tavern') { sg.add(mk(new THREE.SphereGeometry(0.11, 12, 10).scale(0.85, 1.15, 0.85).translate(0.02, 1.48, -0.26), smat(null, '#3a8a5a', { emissive: '#3ad88a', ei: 0.8, rough: 0.25, metal: 0.3 }))); sg.add(mk(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 10).translate(0.02, 1.36, -0.26), smat('wood', '#3a2414'))); const pl = new THREE.PointLight(0x5ae0a0, 0.5, 1.6); pl.position.set(0.02, 1.5, -0.1); sg.add(pl); }   /* o "ovo de dragão" (falso, diz o taverneiro) */
        sg.rotation.y = side === 'b' ? 0 : side === 'l' ? Math.PI / 2 : -Math.PI / 2; g.add(sg); break;
      }
      case 'hearth': {   // lareira enorme de pedra com fogo, caldeirão, chifres e escudos em cima
        const stone = smat('stoneblock', '#8a8274', { bump: 1.6 }), side = f.i === 0 ? 1 : -1, len = f.h - 0.1, hg = grp();
        hg.add(wbox(0.7, 2.1, len, -0.1, 1.05, 0, stone, 1.5)); hg.add(mk(new THREE.BoxGeometry(0.1, 0.85, len * 0.62).translate(0.25, 0.48, 0), smat(null, '#140c06')));
        hg.add(wbox(0.85, 0.12, len + 0.1, 0.05, 1.12, 0, smat('wood', '#4a3020'), 2));
        for (let k = 0; k < 5; k++) hg.add(mk(new THREE.ConeGeometry(0.1 + (k % 2) * 0.04, 0.32 + (k % 3) * 0.08, 6).translate(0.25, 0.32, -0.36 + k * 0.18), smat(null, '#ff8a2a', { emissive: '#ff6a10', ei: 2 })));
        hg.add(mk(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65).translate(0.25, 0.5, 0), smat(null, '#1e1e22', { metal: 0.6, side: THREE.DoubleSide })));
        for (const z of [-len * 0.3, len * 0.3]) { const sh = mk(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14).rotateZ(Math.PI / 2).translate(0.27, 1.55, z), smat('wood', z < 0 ? '#7a2a1a' : '#2a3a6a')); hg.add(sh); hg.add(mk(new THREE.SphereGeometry(0.05, 8, 6).translate(0.3, 1.55, z), smat(null, '#c9a24a', { metal: 0.9 }))); }
        { const bone = smat(null, '#e8dcc0', { rough: 0.8 }), dark = smat(null, '#1a120a');   /* crânio de dragão com chifres longos */
          hg.add(wbox(0.1, 0.3, 0.5, 0.25, 1.95, 0, smat('wood', '#5a3a22'), 1));
          hg.add(mk(new THREE.SphereGeometry(0.17, 10, 8).scale(1, 0.85, 1.05).translate(0.38, 1.98, 0), bone)); hg.add(mk(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8).rotateZ(Math.PI / 2).translate(0.6, 1.92, 0), bone));
          hg.add(mk(new THREE.BoxGeometry(0.26, 0.04, 0.16).translate(0.6, 1.83, 0), bone)); for (let k = 0; k < 4; k++) for (const z of [-0.06, 0.06]) hg.add(mk(new THREE.ConeGeometry(0.012, 0.05, 4).rotateX(Math.PI).translate(0.52 + k * 0.06, 1.86, z), bone));
          for (const z of [-0.08, 0.08]) { hg.add(mk(new THREE.SphereGeometry(0.045, 6, 5).translate(0.48, 2.02, z), dark)); hg.add(limb(V3(0.32, 2.08, z * 1.5), V3(0.2, 2.3, z * 4.5), 0.035, 0.01, bone, 5)); } }
        { const pl = new THREE.PointLight(0xff8a3a, 1.6, 5); pl.position.set(0.5, 0.6, 0); hg.add(pl); }
        hg.rotation.y = side > 0 ? 0 : Math.PI; g.add(hg); break;
      }
      case 'stage': {   // palco baixo do bardo, com tapete e um alaúde no suporte
        const L = (f.w || 2) - 0.1; g.add(wbox(L, 0.18, 0.9, 0, 0.09, 0, smat('oldplank', '#6a4a2c', { bump: 1 }), 2)); g.add(mk(new THREE.BoxGeometry(L - 0.3, 0.01, 0.6).translate(0, 0.19, 0), b.kind === 'tavern' ? smat('scales', '#ffffff', { bump: 0.8 }) : smat('cloth', '#7a1a1c')));
        if (b.kind === 'tavern') { const tw = smat('wood', '#5a7a44', { bump: 1.2 }); let p0 = V3(-L / 2, 0.22, 0.42); for (let k = 1; k <= 6; k++) { const t = k / 6, p1 = V3(-L / 2 + t * L, 0.22 + Math.sin(t * Math.PI) * 0.06, 0.42 + Math.sin(t * Math.PI * 2) * 0.05); g.add(limb(p0, p1, 0.08 - t * 0.05, 0.08 - t * 0.055, tw, 5)); p0 = p1; } g.add(mk(new THREE.ConeGeometry(0.06, 0.16, 4).rotateZ(-Math.PI / 2).translate(L / 2 + 0.06, 0.22, 0.42), tw)); for (let k = 0; k < 5; k++) g.add(mk(new THREE.ConeGeometry(0.025, 0.07, 4).translate(-L / 2 + 0.15 + k * L / 5, 0.3 + Math.sin((k + 0.5) / 5 * Math.PI) * 0.06, 0.42), smat(null, '#e8dcc0'))); }   /* cauda de dragão de madeira na beira do palco */
        const lute = grp(mk(new THREE.SphereGeometry(0.16, 12, 8).scale(1, 1.3, 0.4), smat('wood', '#a8783a')), mk(new THREE.BoxGeometry(0.05, 0.4, 0.03).translate(0, 0.35, 0), smat('wood', '#5a3a22'))); lute.rotation.z = 0.25; lute.position.set(-L / 2 + 0.3, 0.55, -0.2); g.add(lute); break;
      }
      case 'wheel': {   // lustre de roda de carroça com velas pingando, preso por correntes
        const y = hw - 0.55, wood2 = smat('wood', '#4a3020'), wax = smat(null, '#f4ead4'), flame = smat(null, '#fff0c0', { emissive: '#ffbb60', ei: 2 });
        g.add(mk(new THREE.TorusGeometry(0.42, 0.04, 6, 20).rotateX(Math.PI / 2).translate(0, y, 0), wood2)); for (let k = 0; k < 4; k++) g.add(wbox(0.84, 0.03, 0.04, 0, y, 0, wood2, 1).rotateY(k * Math.PI / 4));
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42; g.add(mk(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 6).translate(x, y + 0.08, z), wax)); g.add(mk(new THREE.SphereGeometry(0.022, 6, 5).translate(x, y + 0.16, z), flame)); }
        for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; g.add(limb(V3(Math.cos(a) * 0.4, y, Math.sin(a) * 0.4), V3(0, hw - 0.02, 0), 0.008, 0.008, smat(null, '#2a2622', { metal: 0.8 }), 3)); }
        { const pl = new THREE.PointLight(0xffc070, 1.1, 5); pl.position.set(0, y, 0); g.add(pl); } break;
      }
      case 'beamlamp': {   // lampião pendurado numa viga
        const y = hw - 0.5; g.add(mk(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 4).translate(0, hw - 0.25, 0), smat(null, '#2a2622'))); g.add(mk(new THREE.BoxGeometry(0.16, 0.22, 0.16).translate(0, y, 0), smat(null, '#ffd890', { emissive: '#ffbb60', ei: 1.6 })));
        g.add(mk(new THREE.ConeGeometry(0.13, 0.1, 4).rotateY(Math.PI / 4).translate(0, y + 0.16, 0), smat(null, '#2a2622', { metal: 0.8 }))); break;
      }
      case 'champs': {   // quadro de madeira "Campeões do Tonel" com plaquinhas de latão e duas canecas cruzadas em cima
        const qg = grp(), brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.35 }); qg.add(wbox(0.8, 0.62, 0.05, 0, 1.45, -0.44, smat('wood', '#3a2414'), 1)); qg.add(wbox(0.7, 0.52, 0.02, 0, 1.45, -0.41, smat('oldplank', '#7a5434'), 1));
        qg.add(wbox(0.5, 0.07, 0.02, 0, 1.66, -0.4, brass, 1)); for (let k = 0; k < 4; k++) qg.add(wbox(0.44 - k * 0.04, 0.045, 0.015, 0, 1.54 - k * 0.09, -0.4, smat(null, k ? '#e8dcc0' : '#e2b74e'), 1));
        for (const sx of [-1, 1]) { const m = grp(mk(new THREE.CylinderGeometry(0.05, 0.045, 0.12, 8), smat('wood', '#a8783a')), mk(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 8).translate(0, 0.07, 0), smat(null, '#f4ead4'))); m.rotation.z = sx * 0.6; m.position.set(sx * 0.1, 1.86, -0.4); qg.add(m); }
        const side = f.j === 0 ? 'b' : f.i === 0 ? 'l' : 'r'; qg.rotation.y = side === 'b' ? 0 : side === 'l' ? Math.PI / 2 : -Math.PI / 2; g.add(qg); break;
      }
      case 'drawers': {   // parede de gavetinhas até em cima, com potes de porcelana e frascos coloridos no alto
        const L = Math.max(f.w || 1, f.h || 1) - 0.06, dg = grp(); dg.add(mk(new THREE.BoxGeometry(L, 1.75, 0.42).translate(0, 0.875, -0.27), [smat('wood', '#3a2416'), smat('wood', '#3a2416'), smat('wood', '#2e1c10'), smat('wood', '#3a2416'), smat('drawers', '#ffffff', { bump: 0.8 }), smat('wood', '#3a2416')]));
        dg.add(wbox(L + 0.06, 0.05, 0.46, 0, 1.78, -0.27, smat('wood', '#2e1c10'), 1));
        for (let k = 0; k < Math.round(L * 5); k++) { const x = -L / 2 + 0.1 + k * (L - 0.2) / Math.max(1, Math.round(L * 5) - 1); dg.add(k % 2 ? mk(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10).translate(x, 1.89, -0.27), smat(null, '#f4f4f0', { rough: 0.3 })) : mk(new THREE.CylinderGeometry(0.035, 0.05, 0.2, 8).translate(x, 1.91, -0.27), smat(null, ['#3a8a5a', '#8a3a6a', '#3a5aaa', '#c8a040'][k % 4], { rough: 0.1, emissive: ['#1a4a2a', '#4a1a3a', '#1a2a5a', '#5a4a10'][k % 4], ei: 0.4 }))); if (k % 2) dg.add(mk(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 10).translate(x, 1.86, -0.27), smat(null, '#2a4a9a'))); }
        dg.rotation.y = (f.h || 1) > 1 ? (f.i === 0 ? Math.PI / 2 : -Math.PI / 2) : f.j === 0 ? 0 : f.i === 0 ? Math.PI / 2 : -Math.PI / 2; g.add(dg); break;
      }
      case 'apothcounter': {   // balcão verde-garrafa com latão: balança de pratos, almofariz e pilão, livro de receitas e frascos
        const L = (f.w || 1) - 0.08, brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 });
        g.add(wbox(L, 0.9, 0.5, 0, 0.45, 0, smat('wood', '#1f3d2c', { bump: 1 }), 2)); g.add(wbox(L + 0.06, 0.05, 0.58, 0, 0.92, 0, smat('wood', '#4a2f1a'), 2)); g.add(wbox(L + 0.02, 0.04, 0.02, 0, 0.2, 0.26, brass, 1));
        if (L > 1) { const bx = -L / 2 + 0.35; g.add(mk(new THREE.CylinderGeometry(0.015, 0.02, 0.36, 6).translate(bx, 1.12, 0), brass)); g.add(wbox(0.4, 0.015, 0.015, bx, 1.3, 0, brass, 1)); for (const s2 of [-1, 1]) { g.add(limb(V3(bx + s2 * 0.19, 1.3, 0), V3(bx + s2 * 0.19, 1.12, 0), 0.004, 0.004, brass, 2)); g.add(mk(new THREE.CylinderGeometry(0.08, 0.05, 0.02, 12).translate(bx + s2 * 0.19, 1.11, 0), brass)); } }
        { const mx = L / 2 - 0.25; g.add(mk(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(mx, 1.04, 0.02), smat('stoneblock', '#b8b0a0', { side: THREE.DoubleSide }))); g.add(limb(V3(mx, 1.0, 0.02), V3(mx + 0.06, 1.18, -0.04), 0.018, 0.014, smat(null, '#d8d0c0'), 4)); }
        g.add(mk(new THREE.BoxGeometry(0.26, 0.03, 0.18).translate(0.05, 0.96, -0.08), smat(null, '#e8dcc0'))); for (let k = 0; k < 3; k++) g.add(mk(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 8).translate(-0.12 + k * 0.08, 1.0, 0.14), smat(null, ['#3ad878', '#d84a6a', '#5aa8f0'][k], { rough: 0.1 }))); break;
      }
      case 'distill': {   // bancada de destilação: alambique de cobre, serpentina, retorta de vidro e fogareiro aceso
        const cu = smat(null, '#b8683a', { metal: 0.85, rough: 0.35 }); g.add(wbox(0.86, 0.8, 0.5, 0, 0.4, -0.15, smat('wood', '#3a2618'), 2));
        g.add(mk(new THREE.SphereGeometry(0.17, 14, 10).translate(-0.18, 1.0, -0.18), cu)); g.add(limb(V3(-0.18, 1.15, -0.18), V3(0.12, 1.32, -0.18), 0.035, 0.02, cu, 5)); for (let k = 0; k < 4; k++) g.add(mk(new THREE.TorusGeometry(0.07, 0.012, 5, 12).rotateX(Math.PI / 2).translate(0.2, 1.22 - k * 0.07, -0.18), cu));
        g.add(mk(new THREE.SphereGeometry(0.09, 12, 10).translate(0.2, 0.92, -0.05), smat(null, '#9af0b0', { transparent: true, opacity: 0.55, emissive: '#3ad878', ei: 0.9, rough: 0.05 })));
        g.add(mk(new THREE.CylinderGeometry(0.13, 0.11, 0.12, 10).translate(-0.18, 0.86, -0.18), smat(null, '#2a2622', { metal: 0.6 }))); g.add(mk(new THREE.SphereGeometry(0.06, 8, 6).translate(-0.18, 0.88, -0.05), smat(null, '#ff8a3a', { emissive: '#ff5a10', ei: 2 }))); break;
      }
      case 'planter': {   // canteiro elevado de ervas medicinais com plaquinhas
        const L = (f.h || 1) - 0.1; g.add(wbox(0.7, 0.4, L, 0, 0.2, 0, smat('wood', '#3a2618', { bump: 1.2 }), 2)); g.add(wbox(0.62, 0.04, L - 0.08, 0, 0.4, 0, smat(null, '#3a2a1c'), 1));
        for (let k = 0; k < Math.round(L * 9); k++) { const z = -L / 2 + 0.08 + (k / Math.max(1, Math.round(L * 9) - 1)) * (L - 0.16), x = ((k * 37) % 5 - 2) * 0.1; g.add(mk(new THREE.SphereGeometry(0.07 + (k % 3) * 0.02, 7, 6).translate(x, 0.5, z), smat(null, ['#3e7a34', '#5a9a40', '#6a8a3a'][k % 3], { rough: 0.85 }))); if (k % 4 === 0) g.add(mk(new THREE.CylinderGeometry(0.01, 0.01, 0.26, 4).translate(x + 0.04, 0.6, z), smat(null, '#9a7ad8'))); }
        for (let k = 0; k < Math.max(1, Math.floor(L)); k++) g.add(wbox(0.12, 0.08, 0.01, 0.3, 0.5, -L / 2 + 0.4 + k, smat(null, '#e8dcc0'), 1)); break;
      }
      case 'glowplant': {   // planta rara num vaso: flores que brilham de leve
        const c = ['#7ae0e8', '#f08ad8', '#b8f07a'][(f.i + f.j) % 3]; g.add(mk(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 10).translate(0, 0.16, 0), smat(null, '#2a5a3c', { metal: 0.4 })));
        for (let k = 0; k < 4; k++) { const a = k * 1.6; g.add(limb(V3(0, 0.3, 0), V3(Math.cos(a) * 0.14, 0.7 + k * 0.05, Math.sin(a) * 0.14), 0.014, 0.01, smat(null, '#3e7a34'), 3)); g.add(mk(new THREE.SphereGeometry(0.06, 10, 8).translate(Math.cos(a) * 0.14, 0.74 + k * 0.05, Math.sin(a) * 0.14), smat(null, c, { emissive: c, ei: 1.4, rough: 0.3 }))); }
        { const pl = new THREE.PointLight(new THREE.Color(c), 0.45, 2); pl.position.set(0, 0.8, 0); g.add(pl); } break;
      }
      case 'hangpot': {   // vaso pendurado no teto com folhas caindo
        const y0 = hw - 0.75; g.add(limb(V3(0, hw - 0.02, 0), V3(0, y0, 0), 0.006, 0.006, smat(null, '#2a2622', { metal: 0.8 }), 3)); g.add(mk(new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, y0, 0), smat(null, '#a8583a', { side: THREE.DoubleSide })));
        for (let k = 0; k < 7; k++) g.add(limb(V3(Math.cos(k) * 0.11, y0 - 0.02, Math.sin(k) * 0.11), V3(Math.cos(k) * 0.18, y0 - 0.35 - (k % 3) * 0.12, Math.sin(k) * 0.18), 0.022, 0.012, smat(null, '#4e8a3a'), 3)); break;
      }
      case 'herbrack': {   // vara perto do teto com maços de ervas, raízes e flores secando
        const L = (f.w || 1) - 0.1, y0 = hw - 0.3; g.add(limb(V3(-L / 2, y0, 0), V3(L / 2, y0, 0), 0.02, 0.02, smat('wood', '#4a2f1a'), 4));
        for (const sx of [-L / 2, L / 2]) g.add(limb(V3(sx, y0, 0), V3(sx, hw - 0.02, 0), 0.006, 0.006, smat(null, '#2a2622', { metal: 0.8 }), 2));
        for (let k = 0; k < Math.round(L * 5); k++) { const x = -L / 2 + 0.12 + k * (L - 0.24) / Math.max(1, Math.round(L * 5) - 1); g.add(mk(new THREE.ConeGeometry(0.06, 0.28, 6).rotateX(Math.PI).translate(x, y0 - 0.16, 0), smat(null, ['#6a7a3a', '#8a6a3a', '#7a5a8a', '#5a7a4a'][k % 4], { rough: 0.95 }))); } break;
      }
      case 'pond': {   // tanque de pedra com plantas aquáticas e uma bica de latão
        g.add(mk(new THREE.CylinderGeometry(0.42, 0.45, 0.22, 18).translate(0, 0.11, 0), smat('stoneblock', '#8a8e84', { bump: 1 }))); g.add(mk(new THREE.CircleGeometry(0.36, 18).rotateX(-Math.PI / 2).translate(0, 0.21, 0), smat(null, '#2e6a7a', { rough: 0.05, metal: 0.3, transparent: true, opacity: 0.85 })));
        for (let k = 0; k < 5; k++) g.add(mk(new THREE.CircleGeometry(0.065, 10).rotateX(-Math.PI / 2).translate(Math.cos(k * 1.3) * 0.2, 0.215, Math.sin(k * 1.3) * 0.2), smat(null, '#5a9a40'))); g.add(mk(new THREE.SphereGeometry(0.035, 8, 6).translate(0.12, 0.23, -0.1), smat(null, '#f0d0e8')));
        g.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8).translate(0, 0.36, -0.3), smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }))); break;
      }
      case 'mezzrail': {   // corrimão de madeira na beira do mezanino
        const L = (f.w || 1) - 0.1, wood2 = smat('wood', '#5a3a22'); g.add(wbox(L, 0.07, 0.07, 0, 0.92, 0.38, wood2, 2)); g.add(wbox(L, 0.05, 0.05, 0, 0.5, 0.38, wood2, 2)); for (let k = 0; k <= Math.round(L * 3); k++) g.add(wbox(0.05, 0.9, 0.05, -L / 2 + k * L / Math.round(L * 3), 0.45, 0.38, wood2, 1)); break;
      }
      case 'wandwall': {   // estante do chão ao teto cheia de caixinhas de varinha (algumas meio para fora)
        const side = f.j === 0 ? 'b' : f.i === 0 ? 'l' : 'r', low = knee.includes({ b: 'back', l: 'left', r: 'right' }[side]), sh = smat('wood', '#2e1e14', { bump: 1.1 }), top = low ? 0.62 : hw - 0.08, rot = side === 'b' ? 0 : side === 'l' ? Math.PI / 2 : -Math.PI / 2, sg = grp();
        sg.add(wbox(0.98, top, 0.08, 0, top / 2, -0.4, sh, 2)); for (const x of [-0.47, 0.47]) sg.add(wbox(0.05, top, 0.34, x, top / 2, -0.26, sh, 2));
        const R3 = rng(f.i * 31 + f.j * 7 + 3), rows = low ? 3 : Math.max(5, Math.floor(top / 0.17));
        for (let r = 0; r < rows; r++) { const y = 0.12 + r * (top - 0.2) / rows; sg.add(wbox(0.92, 0.025, 0.3, 0, y - 0.03, -0.26, sh, 2));
          for (let c = 0; c < 5; c++) { if (R3() < 0.08) continue; const out = R3() < 0.12 ? 0.06 : 0; sg.add(mk(new THREE.BoxGeometry(0.15, 0.07, 0.22).translate(-0.36 + c * 0.18, y + 0.04, -0.27 + out), smat('wood', ['#6a4a2c', '#3a2418', '#8a6a3a', '#4a2e1a', '#5a3a4a', '#2e3a2a'][Math.floor(R3() * 6)]))); sg.add(mk(new THREE.BoxGeometry(0.152, 0.012, 0.01).translate(-0.36 + c * 0.18, y + 0.045, -0.155 + out), smat(null, R3() < 0.5 ? '#c8a050' : '#e8e0c8'))); } }
        sg.rotation.y = rot; g.add(sg); break;
      }
      case 'libladder': {   // escada de biblioteca com rodinhas, encostada na estante do fundo
        const rail = smat('wood', '#6a4a2a', { bump: 1 }), top = hw - 0.15, iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 });
        for (const x of [-0.2, 0.2]) { g.add(limb(V3(x, 0.08, 0.15), V3(x, top, -0.36), 0.025, 0.022, rail, 5)); g.add(mk(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10).rotateZ(Math.PI / 2).translate(x, 0.05, 0.16), iron)); }
        for (let y = 0.3; y < top - 0.1; y += 0.28) { const z = 0.15 - (y / top) * 0.51; g.add(limb(V3(-0.2, y, z), V3(0.2, y, z), 0.018, 0.018, rail, 4)); }
        g.add(mk(new THREE.CylinderGeometry(0.015, 0.015, 0.96, 6).rotateZ(Math.PI / 2).translate(0, top, -0.4), iron)); if (knee.includes('back')) g.rotation.y = Math.PI / 2; break;
      }
      case 'wandcounter': {   // balcão escuro com almofada de veludo, uma caixinha aberta com a varinha e caixinhas empilhadas
        const wd = f.w - 0.12, dark = smat('wood', '#2e1e14', { bump: 1.1 });
        g.add(wbox(wd, 0.92, 0.6, 0, 0.46, 0, dark, 2)); g.add(wbox(wd + 0.06, 0.05, 0.66, 0, 0.945, 0, smat('wood', '#4a2e1a'), 2));
        g.add(mk(new THREE.BoxGeometry(0.4, 0.06, 0.22).translate(0, 1.0, 0.05), smat('cloth', '#4a1a5a', { bump: 0.6 })));
        g.add(mk(new THREE.BoxGeometry(0.3, 0.05, 0.1).translate(0.12, 0.99, -0.16), smat('wood', '#6a4a2c'))); g.add(limb(V3(-0.15, 1.04, 0.05), V3(0.16, 1.04, 0.06), 0.012, 0.008, smat('wood', '#4a2a16'), 5));
        for (let k = 0; k < 5; k++) g.add(mk(new THREE.BoxGeometry(0.16, 0.06, 0.22).translate(-wd / 2 + 0.15 + (k % 2) * 0.02, 1.0 + k * 0.065, -0.05), smat('wood', ['#6a4a2c', '#3a2418', '#8a6a3a', '#4a2e1a', '#5a3a4a'][k])));
        g.add(mk(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 12).translate(wd / 2 - 0.2, 0.99, 0), smat(null, '#c9a24a', { metal: 0.8 }))); g.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6).translate(wd / 2 - 0.2, 1.08, 0), smat(null, '#f4ead4', { emissive: '#ffcc66', ei: 0.9 })));   // vela
        break;
      }
      case 'carvebench': {   // bancada do artesão: tocos de madeira rara, potes de núcleos que brilham, faca de entalhe e a fita métrica
        const wood = smat('wood', '#5a3a22', { bump: 1.1 }), len = f.h - 0.15;
        g.add(wbox(0.6, 0.08, len, 0, 0.8, 0, wood, 2)); for (const [x, z] of [[-0.25, -len / 2 + 0.06], [0.25, -len / 2 + 0.06], [-0.25, len / 2 - 0.06], [0.25, len / 2 - 0.06]]) g.add(wbox(0.06, 0.8, 0.06, x, 0.4, z, wood, 2));
        for (let k = 0; k < 4; k++) g.add(mk(new THREE.CylinderGeometry(0.04, 0.045, 0.42, 8).rotateX(Math.PI / 2).translate(-0.18 + k * 0.05, 0.88, -len / 2 + 0.3 + k * 0.06), smat('wood', ['#c8a070', '#3a2418', '#8a3a2a', '#e8d8b0'][k])));
        for (let k = 0; k < 3; k++) { const z = 0.1 + k * 0.26 - len / 4; g.add(mk(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10, 1, true).translate(0.18, 0.94, z), smat(null, '#c8d8e0', { transparent: true, opacity: 0.35, rough: 0.05, side: THREE.DoubleSide })));
          g.add(mk(new THREE.SphereGeometry(0.035, 8, 6).translate(0.18, 0.92, z), smat(null, ['#ff8a3a', '#f0f0ff', '#7ad0f0'][k], { emissive: ['#ff6a10', '#d8d8ff', '#4ab0e0'][k], ei: 1.2 }))); g.add(mk(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 10).translate(0.18, 1.05, z), smat('wood', '#3a2418'))); }
        g.add(mk(new THREE.BoxGeometry(0.03, 0.01, 0.18).translate(-0.05, 0.85, len / 2 - 0.25), smat(null, '#c8ccd4', { metal: 0.9 }))); g.add(mk(new THREE.TorusGeometry(0.07, 0.02, 4, 14).rotateX(Math.PI / 2).translate(-0.15, 0.86, len / 2 - 0.18), smat('cloth', '#e8c84a')));
        break;
      }
      case 'fabricwall': {   // estante alta de rolos de tecido coloridos; em cima, chapéus pontudos e caixas de luvas
        const side = f.j === 0 ? 'b' : f.i === 0 ? 'l' : 'r', low = knee.includes({ b: 'back', l: 'left', r: 'right' }[side]), sh = smat('wood', '#4a2040', { bump: 1 }), top = low ? 0.6 : hw - 0.1, sg = grp(), R3 = rng(f.i * 17 + f.j * 5 + 11);
        sg.add(wbox(0.98, top, 0.08, 0, top / 2, -0.4, sh, 2)); for (const x of [-0.47, 0.47]) sg.add(wbox(0.05, top, 0.38, x, top / 2, -0.24, sh, 2));
        const cols = ['#5e2c52', '#1e4a32', '#7a1a1c', '#1e2a4a', '#d8b860', '#e8e0f0', '#3a6a8a', '#8a4a20', '#c85a8a'], rows = low ? 1 : Math.max(3, Math.floor((top - 0.5) / 0.32));
        for (let r = 0; r < rows; r++) { const y = 0.2 + r * 0.32; sg.add(wbox(0.92, 0.03, 0.34, 0, y - 0.02, -0.24, sh, 2)); for (let c = 0; c < 3; c++) sg.add(mk(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 12).rotateX(Math.PI / 2).translate(-0.3 + c * 0.3, y + 0.11, -0.24), smat('cloth', cols[Math.floor(R3() * cols.length)], { bump: 0.6 }))); }
        const ty = 0.2 + rows * 0.32; if (low) { sg.rotation.y = side === 'b' ? 0 : side === 'l' ? Math.PI / 2 : -Math.PI / 2; g.add(sg); break; } sg.add(wbox(0.92, 0.03, 0.34, 0, ty - 0.02, -0.24, sh, 2)); sg.add(mk(new THREE.ConeGeometry(0.1, 0.32, 12).translate(-0.28, ty + 0.16, -0.24), smat('cloth', '#2a1a3a'))); sg.add(mk(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14).translate(-0.28, ty + 0.01, -0.24), smat('cloth', '#2a1a3a')));
        sg.add(mk(new THREE.BoxGeometry(0.22, 0.1, 0.16).translate(0.1, ty + 0.05, -0.24), smat(null, '#e8dcc0'))); sg.add(mk(new THREE.BoxGeometry(0.22, 0.1, 0.16).translate(0.3, ty + 0.05, -0.24), smat(null, '#c8a0d8')));
        sg.rotation.y = side === 'b' ? 0 : side === 'l' ? Math.PI / 2 : -Math.PI / 2; g.add(sg); break;
      }
      case 'fitstool': {   // banquinho de provas: pedestal redondo e três espelhos de moldura dourada atrás
        const gold = smat(null, '#d4a94a', { metal: 0.9, rough: 0.3 }), mirror = smat(null, '#c8d8e8', { metal: 0.95, rough: 0.05 });
        g.add(mk(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 20).translate(0, 0.08, 0), smat('wood', '#4a2040'))); g.add(mk(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 20).translate(0, 0.17, 0), smat('cloth', '#7a2a5a')));
        for (const a of [-0.7, 0, 0.7]) { const m = grp(mk(new THREE.BoxGeometry(0.34, 1.3, 0.04).translate(0, 0.85, 0), gold), mk(new THREE.BoxGeometry(0.28, 1.2, 0.02).translate(0, 0.85, 0.022), mirror)); m.position.set(Math.sin(a) * 0.52, 0, -Math.cos(a) * 0.52); m.rotation.y = -a; g.add(m); }
        break;
      }
      case 'gown': {   // vestido de baile num manequim, brilhando devagar
        g.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6).translate(0, 0.1, 0), smat(null, '#d4a94a', { metal: 0.9 }))); g.add(mk(new THREE.ConeGeometry(0.36, 1.1, 18, 1, true).translate(0, 0.62, 0), smat('cloth', '#e8d8f4', { side: THREE.DoubleSide, emissive: '#c8a8f0', ei: 0.55 })));
        g.add(mk(new THREE.CylinderGeometry(0.1, 0.13, 0.36, 12).translate(0, 1.32, 0), smat('cloth', '#e8d8f4', { emissive: '#c8a8f0', ei: 0.45 }))); g.add(mk(new THREE.SphereGeometry(0.08, 10, 8).translate(0, 1.6, 0), smat(null, '#e8dcc0')));
        for (let k = 0; k < 10; k++) g.add(mk(new THREE.SphereGeometry(0.015, 5, 4).translate(Math.cos(k) * 0.25, 0.3 + k * 0.08, Math.sin(k) * 0.25), smat(null, '#fff8ff', { emissive: '#ffffff', ei: 1.5 })));
        break;
      }
      case 'mannequin2': {   // manequim com capa ou manto da cor do v
        const col = ['#5e2c52', '#1e4a32', '#1e2a4a', '#7a1a1c'][(f.v || 0) % 4];
        g.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6).translate(0, 0.35, 0), smat(null, '#d4a94a', { metal: 0.9 }))); g.add(mk(new THREE.CylinderGeometry(0.15, 0.11, 0.5, 12).translate(0, 0.95, 0), smat('cloth', '#e8dcc0'))); g.add(mk(new THREE.SphereGeometry(0.08, 10, 8).translate(0, 1.28, 0), smat(null, '#e8dcc0')));
        g.add(mk(new THREE.CylinderGeometry(0.16, 0.26, 0.95, 14, 1, true, Math.PI * 0.35, Math.PI * 1.3).translate(0, 0.74, -0.03), smat('cloth', col, { side: THREE.DoubleSide }))); g.add(mk(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4).translate(0, 1.15, -0.01), smat('cloth', col, { side: THREE.DoubleSide }))); g.add(mk(new THREE.TorusGeometry(0.14, 0.025, 5, 14).rotateX(Math.PI / 2).translate(0, 1.18, 0), smat(null, '#d4a94a', { metal: 0.9 })));
        break;
      }
      case 'sewtable': {   // mesa de costura com tesoura, fita métrica e agulhas trabalhando sozinhas no ar
        const wood = smat('wood', '#4a2040'), steel = smat(null, '#d8dce4', { metal: 0.95, rough: 0.2 }), gold = smat(null, '#d4a94a', { metal: 0.9 });
        g.add(wbox(f.w - 0.15, 0.06, 0.6, 0, 0.8, 0, wood, 2)); for (const [x, z] of [[-(f.w - 0.3) / 2, -0.22], [(f.w - 0.3) / 2, -0.22], [-(f.w - 0.3) / 2, 0.22], [(f.w - 0.3) / 2, 0.22]]) g.add(wbox(0.05, 0.8, 0.05, x, 0.4, z, wood, 2));
        g.add(mk(new THREE.BoxGeometry(0.5, 0.02, 0.4).translate(0, 0.84, 0), smat('cloth', '#7a2a5a')));
        const sc = grp(); for (const a of [0.35, -0.35]) { const bl = mk(new THREE.BoxGeometry(0.03, 0.01, 0.26).translate(0, 0, 0.1), steel); bl.rotation.y = a; sc.add(bl); sc.add(mk(new THREE.TorusGeometry(0.035, 0.008, 4, 10).rotateX(Math.PI / 2).translate(Math.sin(a) * -0.06, 0, -0.06), gold)); } sc.position.set(-0.15, 1.32, 0); sc.rotation.z = 0.5; g.add(sc);
        { const pts = []; for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push(V3(-0.1 + t * 0.4, 1.1 + Math.sin(t * Math.PI * 2) * 0.12, Math.cos(t * Math.PI * 2) * 0.1)); } const cv = new THREE.CatmullRomCurve3(pts); g.add(mk(new THREE.TubeGeometry(cv, 30, 0.012, 4), smat('cloth', '#e8c84a'))); }
        for (let k = 0; k < 2; k++) { g.add(limb(V3(0.15 + k * 0.1, 1.45 + k * 0.08, -0.05), V3(0.22 + k * 0.1, 1.6 + k * 0.08, -0.08), 0.004, 0.002, steel, 3)); g.add(limb(V3(0.15 + k * 0.1, 1.45 + k * 0.08, -0.05), V3(0.05 + k * 0.05, 0.9, 0.05), 0.002, 0.002, smat(null, ['#c83a6a', '#3a6ac8'][k]), 3)); }
        for (let k = 0; k < 6; k++) g.add(mk(new THREE.SphereGeometry(0.012, 5, 4).translate(-0.3 + k * 0.12, 1.2 + (k % 3) * 0.12, 0.1), smat(null, '#fff4d8', { emissive: '#ffe8a0', ei: 1.4 })));   // brilhinhos da magia
        break;
      }
      case 'spiral': {   // caracol: poste central, degraus em leque girando uma volta e um quarto, corrimão em hélice
        const fh = hw, n = 14, turn = Math.PI * 2.5, a0 = backX ? 0 : Math.PI, st = smat('wood', '#7a5434', { bump: 1.2 }), iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 });
        g.add(mk(new THREE.CylinderGeometry(0.06, 0.07, fh - 0.02, 10).translate(0, (fh - 0.02) / 2, 0), DW()));
        for (let k = 0; k < n; k++) { const a = a0 + (k + 0.5) / n * turn, y = (k + 1) / n * fh, sp = wbox(0.42, 0.05, 0.2, 0.25, y, 0, st, 2); const st2 = grp(sp); st2.rotation.y = -a; g.add(st2);
          const px = Math.cos(a) * 0.45, pz = Math.sin(a) * 0.45; if (k % 2 === 0) g.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 5).translate(px, y + 0.4, pz), iron)); }
        for (let k = 0; k < 24; k++) { const a = a0 + k / 24 * turn, a2 = a0 + (k + 1) / 24 * turn, y = k / 24 * fh + 0.8, y2 = (k + 1) / 24 * fh + 0.8; g.add(limb(V3(Math.cos(a) * 0.45, y, Math.sin(a) * 0.45), V3(Math.cos(a2) * 0.45, y2, Math.sin(a2) * 0.45), 0.02, 0.02, iron, 4)); }
        
        g.add(mk(new THREE.RingGeometry(0.4, 0.5, 24).rotateX(-Math.PI / 2).translate(0, 0.075, 0), smat(null, '#c8a050', { emissive: '#6a4a10', ei: 0.25, transparent: true, opacity: 0.3, side: THREE.DoubleSide }), false));
        { const inner = grp(...g.children); inner.scale.set(0.74, 1, 0.74); inner.position.set(backX ? 0.08 : -0.08, 0, backZ ? 0.08 : 0); g.add(inner); }   // longe das paredes do canto
        break;
      }
      case 'spiraltop': {   // vão redondo no piso de cima: o alto do poste, os últimos degraus e grade em volta
        const iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 }), st = smat('wood', '#5a3c22');
        g.add(mk(new THREE.CircleGeometry(0.46, 24).rotateX(-Math.PI / 2).translate(0, 0.066, 0), smat(null, '#050302', { rough: 1 })));
        g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.95, 10).translate(0, 0.5, 0), DW()));
        for (let k = 0; k < 4; k++) { const a = (backX ? 0 : Math.PI) + Math.PI * 2.5 - (k + 0.5) / 14 * Math.PI * 2.5, sp = grp(wbox(0.42, 0.04, 0.2, 0.25, 0.08 - k * 0.002, 0, st, 2)); sp.rotation.y = -a; g.add(sp); }
        for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 1.6 + (backX ? Math.PI * 0.7 : -Math.PI * 0.3), a2 = (k + 1) / 18 * Math.PI * 1.6 + (backX ? Math.PI * 0.7 : -Math.PI * 0.3); g.add(limb(V3(Math.cos(a) * 0.5, 0.82, Math.sin(a) * 0.5), V3(Math.cos(a2) * 0.5, 0.82, Math.sin(a2) * 0.5), 0.02, 0.02, iron, 4)); if (k % 3 === 0) g.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.76, 5).translate(Math.cos(a) * 0.5, 0.45, Math.sin(a) * 0.5), iron)); }
        g.add(mk(new THREE.RingGeometry(0.46, 0.54, 24).rotateX(-Math.PI / 2).translate(0, 0.075, 0), smat(null, '#c8a050', { emissive: '#6a4a10', ei: 0.25, transparent: true, opacity: 0.3, side: THREE.DoubleSide }), false));
        { const inner = grp(...g.children); inner.scale.set(0.74, 1, 0.74); inner.position.set(backX ? 0.08 : -0.08, 0, backZ ? 0.08 : 0); g.add(inner); }
        break;
      }
      case 'ladder': {   // escada de mão encostada na parede do fundo, subindo até o alçapão
        const fh = hw, rail = smat('wood', '#7a5434', { bump: 1 }), top = fh - 0.02;
        for (const x of [-0.24, 0.24]) g.add(limb(V3(x, 0.05, -0.12), V3(x, top, -0.4), 0.035, 0.03, rail, 5));
        for (let y = 0.3; y < top - 0.1; y += 0.3) { const z = -0.12 - (y / top) * 0.28; g.add(limb(V3(-0.24, y, z), V3(0.24, y, z), 0.02, 0.02, rail, 4)); }
        g.add(mk(new THREE.BoxGeometry(0.9, 0.04, 0.9).translate(0, 0.075, 0.1), smat(null, '#c8a050', { emissive: '#6a4a10', ei: 0.25, transparent: true, opacity: 0.3 }), false));
        break;
      }
      case 'laddertop': {   // alçapão aberto no piso de cima: buraco escuro, tampa erguida, pontas da escada aparecendo
        const rail = smat('wood', '#7a5434', { bump: 1 }), lid = smat('oldplank', '#6a4a2c', { bump: 1.2 }), iron = smat(null, '#2a2622', { metal: 0.8, rough: 0.5 });
        g.add(mk(new THREE.BoxGeometry(0.78, 0.02, 0.78).translate(0, 0.066, -0.05), smat(null, '#050302', { rough: 1 })));
        for (const [ww, dd, x, z] of [[0.86, 0.06, 0, 0.36], [0.86, 0.06, 0, -0.46], [0.06, 0.86, -0.42, -0.05], [0.06, 0.86, 0.42, -0.05]]) g.add(wbox(ww, 0.05, dd, x, 0.09, z, DW(), 2));   // moldura
        const lg = grp(wbox(0.78, 0.05, 0.78, 0, 0, -0.39, lid, 2), wbox(0.7, 0.06, 0.06, 0, 0.04, -0.2, iron, 1), wbox(0.7, 0.06, 0.06, 0, 0.04, -0.6, iron, 1)); lg.rotation.x = 1.4; lg.position.set(0, 0.1, -0.44); g.add(lg);   // tampa aberta encostada
        for (const x of [-0.24, 0.24]) g.add(limb(V3(x, -0.2, -0.38), V3(x, 0.5, -0.42), 0.035, 0.03, rail, 5));
        g.add(mk(new THREE.BoxGeometry(0.9, 0.04, 0.9).translate(0, 0.08, 0), smat(null, '#c8a050', { emissive: '#6a4a10', ei: 0.25, transparent: true, opacity: 0.3 }), false));
        break;
      }
      case 'extdoor': {   // porta da escada externa, no andar de cima: soleira, capacho e a luz de fora
        const sx = f.ext > 0 ? 0.48 : -0.48;
        g.add(wbox(0.12, 0.05, 0.8, sx, 0.09, 0, smat('stoneblock', '#9a9488'), 1));
        g.add(mk(new THREE.BoxGeometry(0.5, 0.02, 0.7).translate(sx * 0.45, 0.075, 0), smat('cloth', '#7a3a26', { bump: 0.6 })));
        g.add(mk(new THREE.BoxGeometry(0.9, 0.04, 0.9).translate(0, 0.08, 0), smat(null, '#c8a050', { emissive: '#6a4a10', ei: 0.25, transparent: true, opacity: 0.3 }), false));
        break;
      }
      case 'stairdown': {
        // vão da escada no andar de cima: degraus descendo do topo (U) para baixo (L), corrimão em volta
        const n = 6, [ux, uz] = f.dv, wx = ux ? 0 : -1, wz = ux ? -1 : 0;
        g.add(mk(new THREE.BoxGeometry(ux ? 1.96 : 0.9, 0.02, ux ? 0.9 : 1.96).translate(wx * 0.03, 0.065, wz * 0.03), smat(null, '#050302', { rough: 1, metal: 0 })));
        for (let k = 0; k < n; k++) { const s = 1 - (k + 0.5) * 2 / n, c = Math.round(0x6a * (1 - k / n * 0.85)), col = '#' + [c, Math.round(c * 0.7), Math.round(c * 0.42)].map(v => v.toString(16).padStart(2, '0')).join(''); g.add(wbox(ux ? 2 / n - 0.03 : 0.8, 0.04, ux ? 0.8 : 2 / n - 0.03, ux * s + wx * 0.03, 0.09, uz * s + wz * 0.03, smat('wood', col), 2)); }
        const ox = -wx * 0.46, oz = -wz * 0.46;
        // corrimão em todo o lado aberto e na ponta de baixo; a ponta do topo fica livre para descer
        g.add(wbox(ux ? 2.0 : 0.05, 0.08, ux ? 0.05 : 2.0, ox, 0.82, oz, DW(), 2));
        for (const s of [-1, -0.5, 0, 0.5, 1]) g.add(wbox(0.05, 0.8, 0.05, ux * s + ox, 0.42, uz * s + oz, DW(), 2));
        g.add(wbox(ux ? 0.05 : 0.92, 0.08, ux ? 0.92 : 0.05, -ux * 1 + wx * 0.0, 0.82, -uz * 1, DW(), 2));
        for (const q of [-0.44, 0, 0.44]) g.add(wbox(0.05, 0.8, 0.05, -ux + (ux ? 0 : q), 0.42, -uz + (ux ? q : 0), DW(), 2));
        g.add(mk(new THREE.BoxGeometry(0.9, 0.04, 0.9).translate(ux * 0.5, 0.08, uz * 0.5), smat(null, '#c8a050', { emissive: '#6a4a10', ei: 0.25, transparent: true, opacity: 0.3 }), false));
        break;
      }
      case 'rack': g.add(mWeaponRack().rotateY(backZ ? 0 : Math.PI / 2)); break;
      case 'trough': g.add(wbox(f.w - 0.2, 0.4, 0.5, 0, 0.2, 0, W_(), 2)); g.add(mk(new THREE.BoxGeometry(f.w - 0.35, 0.02, 0.36).translate(0, 0.36, 0), smat(null, '#3a5a6a', { rough: 0.1 }))); break;
      case 'hay': g.add(mHay()); break;
      case 'altar': g.add(wbox(f.w - 0.3, 0.95, 0.75, 0, 0.475, 0, smat('stoneblock', '#d8d0bc'), 1.5)); g.add(mk(new THREE.BoxGeometry(f.w - 0.2, 0.03, 0.8).translate(0, 0.96, 0), cloth('#e8e0cc'))); g.add(mk(new THREE.BoxGeometry(0.6, 0.6, 0.02).translate(0, 0.62, 0.39), cloth('#7a1a1c'))); g.add(mk(new THREE.TorusGeometry(0.3, 0.04, 6, 20).translate(0, 1.8, -0.3), smat(null, '#e2b74e', { metal: 1, rough: 0.3, emissive: '#6a5010', ei: 0.5 }))); for (const x of [-0.6, 0.6]) g.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6).translate(x, 1.08, 0), smat(null, '#f4ecd8', { emissive: '#ffcc66', ei: 0.8 }))); break;
      case 'candles': g.add(mk(new THREE.CylinderGeometry(0.03, 0.12, 1.2, 8).translate(0, 0.6, 0), smat(null, '#c9a24a', { metal: 0.9, rough: 0.35 }))); for (let k = 0; k < 3; k++) g.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6).translate((k - 1) * 0.12, 1.28, 0), smat(null, '#fff4d8', { emissive: '#ffcc66', ei: 1.4 }))); { const pl = new THREE.PointLight(0xffc070, 0.8, 3); pl.position.set(0, 1.4, 0.2); g.add(pl); } break;
      case 'throne': g.add(wbox(1.6, 0.25, 1.4, 0, 0.125, 0, smat('stoneblock', '#a8a092'), 1.5)); g.add(mk(new THREE.BoxGeometry(1.5, 0.02, 1.3).translate(0, 0.26, 0.1), cloth('#7a1a1c'))); g.add(wbox(0.7, 0.2, 0.6, 0, 0.6, 0.05, smat(null, '#c9a24a', { metal: 0.8, rough: 0.35 }), 2)); g.add(mk(new THREE.BoxGeometry(0.62, 0.08, 0.52).translate(0, 0.72, 0.05), cloth('#9a1a1c'))); g.add(wbox(0.75, 1.5, 0.12, 0, 1.2, -0.25, smat(null, '#c9a24a', { metal: 0.8, rough: 0.35 }), 2)); g.add(mk(new THREE.ConeGeometry(0.08, 0.2, 6).translate(-0.3, 2.05, -0.25), smat(null, '#e2b74e', { metal: 1 }))); g.add(mk(new THREE.ConeGeometry(0.08, 0.2, 6).translate(0.3, 2.05, -0.25), smat(null, '#e2b74e', { metal: 1 }))); for (const x of [-0.36, 0.36]) g.add(wbox(0.1, 0.35, 0.55, x, 0.85, 0.05, smat(null, '#c9a24a', { metal: 0.8, rough: 0.35 }), 2)); break;
      case 'banner': g.add(mk(new THREE.PlaneGeometry(0.7, 2.2).translate(0, 1.8, -0.4), smat('cloth', '#7a1a1c', { side: THREE.DoubleSide }))); g.add(mk(new THREE.CircleGeometry(0.2, 12).translate(0, 2.2, -0.39), smat(null, '#e2b74e', { metal: 1, rough: 0.3 }))); break;
      case 'rug': if (f.v === 9) { const gold = smat(null, '#d4a94a', { metal: 1, rough: 0.3 }); g.add(mk(new THREE.BoxGeometry(f.w - 0.1, 0.015, f.h - 0.1).translate(0, 0.07, 0), cloth('#7a1420'))); g.add(mk(new THREE.BoxGeometry(f.w - 0.35, 0.017, f.h - 0.35).translate(0, 0.072, 0), cloth('#8e2030')));
          for (const [ww, hh, x, z] of [[f.w - 0.1, 0.06, 0, (f.h - 0.16) / 2], [f.w - 0.1, 0.06, 0, -(f.h - 0.16) / 2], [0.06, f.h - 0.1, (f.w - 0.16) / 2, 0], [0.06, f.h - 0.1, -(f.w - 0.16) / 2, 0]]) g.add(mk(new THREE.BoxGeometry(ww, 0.02, hh).translate(x, 0.08, z), gold));
          const ch = grp(); ch.add(mk(new THREE.TorusGeometry(0.42, 0.03, 6, 18).rotateX(Math.PI / 2), gold)); ch.add(mk(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 4).translate(0, 0.45, 0), gold));
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ch.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6).translate(Math.cos(a) * 0.42, 0.07, Math.sin(a) * 0.42), smat(null, '#f4ead4'))); ch.add(mk(new THREE.SphereGeometry(0.03, 6, 5).translate(Math.cos(a) * 0.42, 0.16, Math.sin(a) * 0.42), smat(null, '#ffd27a', { emissive: '#ffb040', ei: 2 }))); }
          ch.position.set(0, 2.25, 0); g.add(ch); break; }
        g.add(mk(new THREE.BoxGeometry(Math.min(3, w - 1.4), 0.015, Math.min(h - 1.4, b.kind === 'castle' ? h - 3 : 2)).translate(0, 0.07, b.kind === 'castle' ? (h - 3) / 2 - 0.5 : 0.5), cloth(b.kind === 'castle' ? '#8a1a1c' : ['#7a3a2a', '#3a4a6a', '#5a6a3a'][f.i % 3]))); break;
    }
    g.position.set(cx, 0, cz); g.userData.furn = 1;
    { const ST = f.t === 'taps' || f.t === 'bar' || f.t === 'bottles' || f.t === 'hearth' || f.t === 'stage' || f.t === 'wheel' || f.t === 'beamlamp' || f.t === 'mezzrail' || f.t === 'champs' || f.t === 'drawers' || f.t === 'apothcounter' || f.t === 'distill' || f.t === 'planter' || f.t === 'glowplant' || f.t === 'hangpot' || f.t === 'herbrack' || f.t === 'pond' || f.t === 'wandwall' || f.t === 'libladder' || f.t === 'wandcounter' || f.t === 'carvebench' || f.t === 'fabricwall' || f.t === 'fitstool' || f.t === 'gown' || f.t === 'mannequin2' || f.t === 'sewtable' || f.t === 'telescope' || f.t === 'stairup' || f.t === 'stairdown' || f.t === 'spiral' || f.t === 'spiraltop' || f.t === 'ladder' || f.t === 'laddertop' || f.t === 'extdoor', sx = f.w > 1 || f.h > 1 || f.t === 'rug' || ST ? 1 : 0.84; if (ST) { o.add(g); continue; } if (f.t === 'blk') continue; g.scale.set(sx, sx < 1 ? 0.68 : 0.55, sx); if (sx < 1) g.position.set(cx + (backX ? -0.06 : 0), 0, cz + (backZ ? -0.06 : 0)); }   /* móveis de 1 tile quase do tamanho do tile: o bloqueio bate com o que se vê */
    o.add(g);
  }
  return o;
}
function interiorSprite(b, fl = 0) {
  const key = 'in|' + archKey(b) + '|' + (b.door || 'S') + '|' + fl;
  return scen3(key, () => b.kind === 'stairtower' ? placeRot(b, mStairTower({ ...localB(b), realDoor: b.door || 'S' }, true)) : placeRot(b, mInterior({ ...localB(b), realDoor: b.door || 'S' }, fl)));
}
// ============================================================
//  LIGAÇÃO: troca os desenhos pintados pelas fotos 3D (quando
//  prontas). Enquanto a foto não fica pronta, usa o pintado.
// ============================================================
(function hookScenery() {
  if (!S3.ok) return;
  const wrap = (name, key, make) => {
    const orig = window[name];
    window[name] = function (...a) { return scen3(key(...a), () => make(...a)) || orig.apply(null, a); };
  };
  wrap('treeSprite', (v, w, t) => `tr|${v}|${t}`, (v, w, t) => sc(mTree(v, t || 0), 2.15));
  wrap('pineSprite', v => `pi|${v}`, v => sc(mPine(v), v % 2 ? 2.45 : 1.95));
  wrap('deadTreeSprite', v => `dt|${v}`, v => sc(mDeadTree(v), 2.0));
  wrap('bushSprite', v => `bu|${v}`, v => sc(mBush(v), 1.05));
  wrap('rockSprite', (v, m) => `ro|${v}|${m}`, (v, m) => mRock(v, m));
  wrap('grassSprite', (v, w, d) => `gr|${v}|${d}`, (v, w, d) => sc(mGrass(v, d), 0.7));
  const SMALL = { mushroom: mMushroom, reeds: mReeds, stump: mStump, log: mLog, deadtree: mDeadTree, grave: mGrave, tent: mTent, barrel: mBarrel, crate: mCrate, hay: mHay, bench: mBench, well: mWell, stall: mStall, spikes: mSpikes, rubblebig: mRubble, dummy: mDummy, statue: mStatue, anvil: mAnvil, cave: mCave, chest: mChest, hoard: mHoard, armorpile: mArmorPile, ruintower: mRuinTower, weaponrack: mWeaponRack, cart: mCart, table: mTable };
  const PS = { barrel: 0.5, crate: 0.5, hay: 0.55, bench: 0.5, well: 0.72, stall: 0.6, tent: 0.75, spikes: 0.7, rubblebig: 0.8, dummy: 0.55, statue: 1.0, anvil: 0.5, cave: 0.8, chest: 0.55, hoard: 0.9, armorpile: 0.8, ruintower: 0.9, weaponrack: 0.55, cart: 0.6, table: 0.5, grave: 0.6, stump: 0.75, log: 0.8, mushroom: 0.8, reeds: 0.8, deadtree: 1.25 };
  const sc = (g, k) => { g.scale.setScalar(k); return g; };
  const origSmall = window.smallSprite;
  window.smallSprite = function (kind, v = 0, w) { const f = SMALL[kind]; return (f && scen3(`sm|${kind}|${v}`, () => sc(f(v), PS[kind] || 1))) || origSmall(kind, v, w); };
  const ANIM = { torch: mTorch, campfire: mCampfire, brazier: mBrazier, lamp: mLamp, banner: mBannerPole, fountain: mFountain };
  const origAnim = window.animSprite;
  const PA = { torch: 0.8, campfire: 0.7, brazier: 0.6, lamp: 1, banner: 1, fountain: 1.15 };
  window.animSprite = function (kind) { const f = ANIM[kind]; return (f && scen3(`an|${kind}`, () => sc(f(), PA[kind] || 1))) || origAnim(kind); };
  wrap('fenceSprite', a => `fe|${a ? 1 : 0}`, a => { const g = mFence(a); g.scale.set(1, 0.6, 1); return g; });
  wrap('wallSprite', (v, low, ivy, od, e) => `wa|${v}|${low ? 1 : 0}|${ivy ? 1 : 0}|${od | 0}|${e | 0}`, (v, low, ivy, od, e) => mWall(v, low, ivy, od, e | 0));
  wrap('gateSprite', a => `ga|${a ? 1 : 0}`, a => mGate(a));
  wrap('towerSprite', (v, off) => `to|${v}|${off ?? 4}`, (v, off) => { const g = mTower(v), o = off ?? 4; g.position.set((Math.floor(o / 3) - 1) * 0.5, 0, (o % 3 - 1) * 0.5); return grp(g); });
  wrap('stairsSprite', (d, k) => `st|${d}|${k | 0}`, (d, k) => mStairs(d, k | 0));
  wrap('slabSprite', v => `sl|${v}`, v => mSlab(v));
  wrap('cliffSprite', (h, v, s) => `cl|${h}|${v}|${s}`, (h, v, s) => mCliff(h, v, s));
  wrap('buildingSprite', (b, n) => `bd|${archKey(b)}|${b.door || 'S'}`, (b, n) => mBuildingRot(b, false));
  // luzes das janelas na altura nova das paredes
  window.buildingWindows = function (b) {
    if (b.kind === 'stairtower') return [];
    const [A, D] = bDims(b), H = bldDims(b).H, out = [], fl = b.floors || 1, fh = H / fl;
    for (let f = 0; f < fl; f++) { const zc = (f * fh + fh * 0.55) * HV; for (let k = 0; k < Math.floor(A / 1.5); k++) { const [x, y] = localToWorld(b, (k + 0.5) * A / Math.floor(A / 1.5), D); out.push([x, y, zc]); } for (let k = 0; k < Math.floor(D / 1.5); k++) for (const u of [0, A]) { const [x, y] = localToWorld(b, u, (k + 0.5) * D / Math.floor(D / 1.5)); out.push([x, y, zc]); } }
    return out;
  };
})();
// altura de uma construção na tela (para nomes e fumaça)
function bldTopArt(b) { return (b.wall + b.roof) * 2 * (S3.ok ? BLD_K : 1); }
