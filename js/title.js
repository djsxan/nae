// ============================================================
//  NAE — tela inicial: cena 3D viva (da sombra da floresta para o castelo ao sol)
//  e menu minimalista. Os painéis (jogar, personagens, reinos) reaproveitam o lobby.
// ============================================================
const TITLE = { on: false };
// fundo da tela inicial: foto real (Bled, de Dreamy Pixel, CC BY 4.0) com névoa, água, nuvens, raios de luz, pássaros e câmera lenta; a cor segue a hora real
function titlePhoto() {
  const cv = document.createElement('canvas'); cv.id = 'title3d'; document.body.insertBefore(cv, document.body.firstChild);
  const ctx = cv.getContext('2d'), im = new Image(); im.src = 'img/lobby/bled.jpg';
  const P0 = { water: 0.7, cx: 0.49, cy: 0.38, cw: 0.08, sun: [0.75, 0.42], wins: [[0.468, 0.372], [0.476, 0.375], [0.486, 0.37], [0.497, 0.378], [0.505, 0.381], [0.513, 0.383]] };
  const GR = { dawn: { mul: [1, 0.9, 0.92], add: [40, 10, 30], glow: 'rgba(255,170,150,', b: 1, night: 0, mist: 1.25 }, day: { mul: [1.04, 1.02, 1], add: [10, 8, 0], glow: 'rgba(255,240,210,', b: 1.08, night: 0, mist: 0.7 },
    dusk: { mul: [1.06, 0.82, 0.66], add: [34, 4, -6], glow: 'rgba(255,140,70,', b: 0.92, night: 0.2, mist: 0.9 }, night: { mul: [0.32, 0.4, 0.62], add: [0, 6, 22], glow: 'rgba(150,170,255,', b: 0.7, night: 1, mist: 0.8 } };
  const todNow = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 19.5 ? 'dusk' : 'night'; };
  const rnd = s => { const x = Math.sin(s * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
  let graded = null, gk = '', t0 = performance.now(), dpr = 1;
  const fit = () => { dpr = Math.min(1.25, devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; }; fit(); addEventListener('resize', fit);
  const grade = g => { const w = Math.min(2400, im.naturalWidth), h = Math.round(im.naturalHeight * w / im.naturalWidth), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
    try { const d = x.getImageData(0, 0, w, h), a = d.data; for (let i = 0; i < a.length; i += 4) { a[i] = Math.min(255, a[i] * g.mul[0] * g.b + g.add[0]); a[i + 1] = Math.min(255, a[i + 1] * g.mul[1] * g.b + g.add[1]); a[i + 2] = Math.min(255, a[i + 2] * g.mul[2] * g.b + g.add[2]); } x.putImageData(d, 0, 0); } catch (e) { }   // arquivo local: sem permissão de ler os pixels, fica a cor original
    return c; };
  let lastF = 0, vgK = '', vgC = null, lgC = null;
  const frame = now => {
    if (!TITLE.on) { cv.remove(); return; } requestAnimationFrame(frame);
    if (now - lastF < 33) return; lastF = now;   /* 30 quadros por segundo bastam para a introdução */
    const W = cv.width, H = cv.height, t = now - t0, tk = todNow(), G = GR[tk];
    if (!im.complete || !im.naturalWidth) { ctx.fillStyle = '#1a1622'; ctx.fillRect(0, 0, W, H); return; }
    if (gk !== tk) { graded = grade(G); gk = tk; }
    const iw = graded.width, ih = graded.height, base = Math.max(W / iw, H / ih), z = base * (1.08 + 0.05 * Math.sin(t / 26000)), dw = iw * z, dh = ih * z;
    const px = (W - dw) / 2 + W * 0.06 + Math.sin(t / 31000) * W * 0.02, py = (H - dh) / 2 + Math.cos(t / 37000) * H * 0.012;   // castelo um pouco à direita (o menu fica à esquerda)
    ctx.drawImage(graded, px, py, dw, dh);
    const X = u => px + u * dw, Y = v => py + v * dh, wy = Y(P0.water);
    for (let y = Math.max(0, wy); y < H; y += 4) { const k = (y - wy) / (H - wy + 1), sh = Math.sin(y * 0.09 / dpr + t / 420) * (1.5 + k * 4) * dpr; ctx.drawImage(graded, -px / z, (y - py) / z, W / z, 4 / z, sh, y, W, 4); }   /* água ondulando: faixas tiradas da foto, sem ler a própria tela */
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let k = 0; k < 70; k++) { const yy = wy + (H - wy) * rnd(k) ** 1.4, x = (rnd(k + 5) * W + t * (0.006 + rnd(k + 9) * 0.01) * W / 100) % W, l = W * (0.02 + rnd(k + 2) * 0.06) * (0.4 + (yy - wy) / (H - wy)), a = (0.08 + 0.1 * Math.sin(t / 300 + k * 1.7)) * (G.night ? 0.6 : 1); ctx.fillStyle = G.glow + Math.max(0, a) + ')'; ctx.fillRect(x, yy, l, (1.4 + (yy - wy) / (H - wy) * 1.5) * dpr); }
    ctx.restore();
    if (G.night) { for (let k = 0; k < 170; k++) { const a = (0.35 + 0.65 * Math.abs(Math.sin(t / 700 + k))) * G.night * rnd(k + 77); ctx.fillStyle = 'rgba(235,240,255,' + a + ')'; ctx.fillRect(rnd(k) * W, rnd(k + 50) * H * 0.4, 1.5 * dpr, 1.5 * dpr); }
      const mx = W * 0.82, my = H * 0.14, r = H * 0.035, mg = ctx.createRadialGradient(mx, my, r, mx, my, r * 6); mg.addColorStop(0, 'rgba(210,220,255,.35)'); mg.addColorStop(1, 'rgba(210,220,255,0)'); ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H * 0.5); ctx.fillStyle = '#f0f3ff'; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.fill(); }
    if (!G.night || tk === 'dusk') { ctx.save(); ctx.globalCompositeOperation = 'screen'; const sx = X(P0.sun[0]), sy = Y(P0.sun[1]);
      for (let k = 0; k < 9; k++) { const a = Math.PI * 0.35 + k * 0.17 + Math.sin(t / 5000 + k) * 0.04, a2 = a + 0.06 + 0.04 * rnd(k); ctx.fillStyle = G.glow + (0.03 + 0.02 * Math.sin(t / 1800 + k)) + ')'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * W * 1.5, sy + Math.sin(a) * W * 1.5); ctx.lineTo(sx + Math.cos(a2) * W * 1.5, sy + Math.sin(a2) * W * 1.5); ctx.fill(); }
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.55); sg.addColorStop(0, G.glow + '0.25)'); sg.addColorStop(1, G.glow + '0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (G.night > 0.1) for (let k = 0; k < P0.wins.length; k++) { const wx = X(P0.wins[k][0]), wy2 = Y(P0.wins[k][1]), f = (0.6 + 0.4 * Math.sin(t / 600 + k * 2.3)) * G.night, rr = dw * 0.004;
      const gw = ctx.createRadialGradient(wx, wy2, 0, wx, wy2, rr * 4); gw.addColorStop(0, 'rgba(255,200,110,' + f + ')'); gw.addColorStop(1, 'rgba(255,160,60,0)'); ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(wx, wy2, rr * 4, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,224,150,' + f + ')'; ctx.fillRect(wx - rr * 0.4, wy2 - rr * 0.6, rr * 0.8, rr * 1.2); }
    for (let k = 0; k < 7; k++) { const x = ((rnd(k) * 1.5 * W + t * (0.004 + k * 0.0015) * W / 100) % (W * 1.5)) - W * 0.25, y = H * (0.05 + rnd(k + 20) * 0.28), cg = ctx.createRadialGradient(x, y, 0, x, y, W * 0.18); cg.addColorStop(0, G.glow + (0.07 * (1 - G.night * 0.6)) + ')'); cg.addColorStop(1, G.glow + '0)'); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.18); ctx.translate(-x, -y); ctx.fillStyle = cg; ctx.fillRect(x - W * 0.2, y - W * 0.2, W * 0.4, W * 0.4); ctx.restore(); }
    for (let L = 0; L < 4; L++) { const yb = wy - H * 0.06 + L * H * 0.05, sp = (0.003 + L * 0.004) * W / 100, a = (0.06 + L * 0.035) * G.mist;
      for (let k = 0; k < 6; k++) { const x = ((rnd(k + L * 10) * 1.6 * W + t * sp) % (W * 1.6)) - W * 0.3, y = yb + Math.sin(t / 4000 + k + L) * H * 0.01, rw = W * (0.22 + rnd(k + L * 7) * 0.2), rh = H * (0.05 + L * 0.015), mg = ctx.createRadialGradient(x, y, 0, x, y, rw);
        mg.addColorStop(0, (G.night ? 'rgba(170,185,220,' : 'rgba(246,238,232,') + a + ')'); mg.addColorStop(1, 'rgba(240,235,230,0)'); ctx.save(); ctx.translate(x, y); ctx.scale(1, rh / rw); ctx.translate(-x, -y); ctx.fillStyle = mg; ctx.fillRect(x - rw, y - rw, rw * 2, rw * 2); ctx.restore(); } }
    const nb = G.night ? 5 : 14; for (let k = 0; k < nb; k++) { const per = 26000 + rnd(k) * 20000, ph = ((t + rnd(k + 3) * per) % per) / per, x = W * (1.1 - ph * 1.25), y = H * (0.18 + rnd(k + 8) * 0.25) + Math.sin(t / 900 + k) * H * 0.015 + (k % 3) * H * 0.012, s = H * (0.008 + rnd(k + 11) * 0.006), f = Math.sin(t / (G.night ? 70 : 130) + k * 2) * s * 0.9;
      ctx.strokeStyle = 'rgba(20,16,18,.75)'; ctx.lineWidth = Math.max(1, s * 0.22); ctx.beginPath(); ctx.moveTo(x - s, y - f); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.3, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.3, x + s, y - f); ctx.stroke(); }
    for (let k = 0; k < 26; k++) { const x = (rnd(k + 900) * W + t * (0.01 + rnd(k) * 0.02) * W / 100 + Math.sin(t / 1300 + k) * 20) % W, y = (rnd(k + 950) * H + t * 0.004 * H / 100) % H, a = 0.25 + 0.25 * Math.sin(t / 500 + k); ctx.fillStyle = G.night ? 'rgba(200,255,170,' + a + ')' : 'rgba(255,245,215,' + a * 0.7 + ')'; ctx.beginPath(); ctx.arc(x, y, (G.night ? 1.6 : 1.2) * dpr, 0, 7); ctx.fill(); }
    if (vgK !== W + 'x' + H) { vgK = W + 'x' + H; vgC = ctx.createRadialGradient(W * 0.55, H * 0.5, H * 0.35, W * 0.55, H * 0.5, W * 0.75); vgC.addColorStop(0, 'rgba(0,0,0,0)'); vgC.addColorStop(1, 'rgba(0,0,0,0.6)'); lgC = ctx.createLinearGradient(0, 0, W * 0.5, 0); lgC.addColorStop(0, 'rgba(0,0,0,0.6)'); lgC.addColorStop(1, 'rgba(0,0,0,0)'); }
    ctx.fillStyle = vgC; ctx.fillRect(0, 0, W, H); ctx.fillStyle = lgC; ctx.fillRect(0, 0, W * 0.5, H);
  };
  TITLE.on = true; requestAnimationFrame(frame);
}
function titleScene() {
  return titlePhoto();
  if (typeof THREE === 'undefined') return;
  const cv = document.createElement('canvas'); cv.id = 'title3d'; document.body.insertBefore(cv, document.body.firstChild);
  let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return; }
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xb9c2a0, 55, 190);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 400); cam.position.set(0, 1.7, 9);
  const C = (h) => new THREE.Color(h).convertSRGBToLinear();
  const M = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: C(hex), roughness: o.r ?? 0.9, metalness: o.m ?? 0, side: o.side || THREE.FrontSide, emissive: o.e ? C(o.e) : undefined, emissiveIntensity: o.ei || 0, transparent: !!o.t, opacity: o.op ?? 1, depthWrite: o.dw ?? true });
  // céu: gradiente ensolarado (azul em cima, dourado no horizonte)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C('#5f8fc4') }, hor: { value: C('#f1dfb0') } },
    vertexShader: 'varying vec3 vp; void main(){ vp = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vp,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vp; void main(){ float h = clamp(normalize(vp).y * 2.2, 0., 1.); gl_FragColor = vec4(mix(hor, top, pow(h, .7)), 1.); }' }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(C('#d8e4ff'), C('#3a3020'), 0.55));
  const sun = new THREE.DirectionalLight(C('#fff1d0'), 2.6); sun.position.set(30, 40, -50); scene.add(sun);
  // chão: clareira clara ao longe, chão escuro de floresta perto
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 60, 60).rotateX(-Math.PI / 2), M('#6f8a3c'));
  { const p = ground.geometry.attributes.position, col = []; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), x = p.getX(i); p.setY(i, Math.sin(x * 0.07) * 0.6 + Math.cos(z * 0.05) * 0.8 + (z < -40 ? Math.max(0, (-z - 40) * 0.05) : 0)); const near = Math.max(0, Math.min(1, (z + 10) / 18)); const c = C('#7a9a42').lerp(C('#1c2112'), near); col.push(c.r, c.g, c.b); } ground.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); ground.material.vertexColors = true; ground.geometry.computeVertexNormals(); }
  scene.add(ground);
  // castelo ao longe sobre uma colina: muralha, torres redondas com telhados cônicos e torre de menagem com a bandeira
  const stone = M('#a39d90'), dark = M('#3a3f4c'), castle = new THREE.Group(); castle.position.set(-4, 3.2, -78);
  castle.add(new THREE.Mesh(new THREE.BoxGeometry(34, 7, 18), stone).translateY(3.5));
  for (let k = 0; k < 16; k++) for (const z of [-9.2, 9.2]) castle.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 1), stone).translateX(-16 + k * 2.15).translateY(7.6).translateZ(z));
  for (const [x, z, h] of [[-17, -9, 11], [17, -9, 11], [-17, 9, 10], [17, 9, 10]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, h, 16), stone); t.position.set(x, h / 2, z); castle.add(t); const r = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.5, 16), dark); r.position.set(x, h + 2.2, z); castle.add(r); }
  const keep = new THREE.Mesh(new THREE.BoxGeometry(9, 19, 9), stone); keep.position.set(2, 9.5, -1); castle.add(keep);
  const kr = new THREE.Mesh(new THREE.ConeGeometry(7, 6, 4), dark); kr.rotation.y = Math.PI / 4; kr.position.set(2, 22, -1); castle.add(kr);
  for (let k = 0; k < 7; k++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.2), M('#1a1612', { e: '#4a2a10', ei: 0.4 })); w.position.set(-1 + (k % 3) * 1.9 + (k > 2 ? 0.5 : 0), 12 + Math.floor(k / 3) * 3.5, 3.55); castle.add(w); }
  castle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), M('#2a2420')).translateX(2).translateY(28));
  const flagG = new THREE.PlaneGeometry(8, 4.4, 28, 12), flag = new THREE.Mesh(flagG, new THREE.MeshLambertMaterial({ color: C('#9a1a24'), side: THREE.DoubleSide, emissive: C('#3a0608') }));
  flagG.translate(4, 0, 0); flag.position.set(2.1, 30, -1); flag.frustumCulled = false; castle.add(flag); const flag0 = flagG.attributes.position.array.slice();
  // emblema na bandeira (uma estrela/coroa clara)
  const emb = new THREE.Mesh(new THREE.CircleGeometry(0.7, 5), M('#e8d8b0', { side: THREE.DoubleSide })); emb.position.set(2.4, 0, 0.03); flag.add(emb);
  castle.scale.setScalar(1.1); scene.add(castle);
  // linha de árvores no meio da distância
  const tl = M('#3e5a2a'), tl2 = M('#2e4420');
  for (let k = 0; k < 70; k++) { const a = (k / 70) * Math.PI * 1.4 - Math.PI * 0.7, r = 46 + (k % 5) * 6, x = Math.sin(a) * r * 1.6, z = -Math.cos(a) * r * 0.9 - 20; if (Math.abs(x + 4) < 26 && z < -60) continue; const s = 2 + (k * 37 % 10) / 4, tr = new THREE.Mesh(new THREE.ConeGeometry(s, s * 3.2, 7), k % 2 ? tl : tl2); tr.position.set(x, s * 1.6 + Math.sin(x * 0.07) * 0.6, z); scene.add(tr); }
  // floresta em primeiro plano: troncos escuros e copas que fazem a moldura de sombra
  const bark = M('#1e1914'), leaf = M('#16200f'), leaf2 = M('#1d2914');
  const trunks = [[-6.5, 2.5, 0.55], [-4.2, -1, 0.35], [-9, -4, 0.7], [5.8, 1.5, 0.5], [8.5, -2.5, 0.65], [3.6, -6, 0.3], [-2.6, -9, 0.28], [11, 3, 0.8], [-12, 1, 0.9], [7, -10, 0.32]];
  for (const [x, z, r] of trunks) { const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, 22, 10), bark); t.position.set(x, 10, z); t.rotation.z = (x > 0 ? -1 : 1) * 0.03; scene.add(t); }
  for (let k = 0; k < 40; k++) { const x = (k % 2 ? 1 : -1) * (6.5 + (k * 13 % 9)), y = 11 + (k * 7 % 6), z = -10 + (k * 11 % 16); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4 + (k % 3), 1), k % 3 ? leaf : leaf2); b.position.set(x, y, z); scene.add(b); }
  for (let k = 0; k < 24; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + (k % 4), 1), leaf); b.position.set(-14 + k * 1.3, 15.5 + Math.sin(k) * 1.5, 4 - (k % 3) * 2); scene.add(b); }   // copa acima da câmera
  for (let k = 0; k < 60; k++) { const x = (k % 2 ? 1 : -1) * (1.5 + (k * 7 % 11) * 0.9), z = 5 - (k * 5 % 14); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + (k % 4) * 0.18, 0), k % 2 ? leaf : leaf2); f.scale.set(1.4, 0.55, 1.2); f.position.set(x, 0.15, z); f.rotation.y = k; scene.add(f); }   // samambaias/arbustos
  // raios de sol entre os troncos (planos aditivos)
  const shafts = [];
  for (let k = 0; k < 6; k++) { const m = new THREE.MeshBasicMaterial({ color: C('#fff0c8'), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + k * 0.3, 26), m); s.position.set(-6 + k * 2.6, 9, -4 - k); s.rotation.z = 0.5; s.rotation.y = -0.3; scene.add(s); shafts.push(s); }
  // poeira dourada no ar e folhas caindo
  const N = 260, dp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { dp[i * 3] = (Math.random() - 0.5) * 16; dp[i * 3 + 1] = Math.random() * 7; dp[i * 3 + 2] = 4 - Math.random() * 14; }
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dp, 3)), new THREE.PointsMaterial({ color: C('#fff2c8'), size: 0.035, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(dust);
  const leaves = []; const lm = M('#6a5a20', { side: THREE.DoubleSide });
  for (let k = 0; k < 18; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), lm); l.position.set((Math.random() - 0.5) * 12, Math.random() * 8, 2 - Math.random() * 10); l.userData = { s: 0.3 + Math.random() * 0.4, p: Math.random() * 6 }; scene.add(l); leaves.push(l); }
  const resize = () => { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 1 ? 60 : 42; cam.updateProjectionMatrix(); };
  resize(); window.addEventListener('resize', resize);
  TITLE.on = true; const t0 = performance.now();
  const loop = () => {
    if (!TITLE.on) { renderer.dispose(); cv.remove(); return; }
    const t = (performance.now() - t0) / 1000;
    cam.position.set(Math.sin(t * 0.11) * 0.35, 1.7 + Math.sin(t * 0.27) * 0.06, 9 + Math.sin(t * 0.07) * 0.3); cam.lookAt(-2 + Math.sin(t * 0.09) * 0.5, 9.5, -70);
    const fp = flagG.attributes.position; for (let i = 0; i < fp.count; i++) { const x0 = flag0[i * 3], y0 = flag0[i * 3 + 1], u = x0 / 8; fp.setZ(i, Math.sin(x0 * 1.6 - t * 5.5) * 0.45 * u + Math.sin(y0 * 2 + t * 3) * 0.1 * u); fp.setY(i, y0 - u * u * 0.4 + Math.sin(x0 - t * 4) * 0.08 * u); } fp.needsUpdate = true; flagG.computeVertexNormals();
    for (let i = 0; i < N; i++) { dp[i * 3] += Math.sin(t * 0.3 + i) * 0.002; dp[i * 3 + 1] += Math.sin(t * 0.5 + i * 1.7) * 0.0015 + 0.0008; if (dp[i * 3 + 1] > 7) dp[i * 3 + 1] = 0; } dust.geometry.attributes.position.needsUpdate = true;
    for (const l of leaves) { const d = l.userData; l.position.y -= d.s * 0.012; l.position.x += Math.sin(t * 1.3 + d.p) * 0.01; l.rotation.set(t * d.s * 2 + d.p, t * 1.7 + d.p, t * d.s); if (l.position.y < 0) l.position.y = 8; }
    shafts.forEach((s, k) => { s.material.opacity = 0.035 + Math.sin(t * 0.4 + k * 1.3) * 0.02; });
    renderer.render(scene, cam); requestAnimationFrame(loop);
  };
  loop();
}
// ---------- Reinos Online: lista, mundos guardados ----------
function realmScreen() { realmWorlds(); realmScan(); }
function realmWorlds() {
  const box = document.getElementById('nae-rworlds'); if (!box || typeof worldsList !== 'function') return; const L = worldsList(), esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const dt = t => { if (!t) return 'antigo'; const d = new Date(t); return d.toLocaleDateString('pt-BR') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  /* o último mundo jogado fica no topo (e já vem marcado); "Mundo novo" fica separado embaixo */
  box.innerHTML = (L.length ? '<div class="nae-rwh">Mundos guardados</div>' : '')
    + L.map((w, i) => `<label class="nae-rw${i === 0 ? ' last' : ''}"><input type="radio" name="nae-rw" value="${esc(w.id)}"${i === 0 ? ' checked' : ''}><span><b>${esc(w.n)}${i === 0 ? ' <em class="nae-rwtag">último jogado</em>' : ''}</b><small>${w.own ? 'seu mundo' : 'cópia do reino de ' + esc(w.h || '?')} · salvo em ${dt(w.t)}</small></span>${w.id !== 'legacy' ? `<button class="nae-link" data-wexp="${esc(w.id)}" title="Baixar este mundo num arquivo, para guardar ou levar a outro computador">exportar</button><button class="nae-link" data-wdel="${esc(w.id)}" title="Apagar este mundo">apagar</button>` : ''}</label>`).join('')
    ;
  let nw = document.getElementById('nae-rwnewbox'); if (!nw) { nw = document.createElement('div'); nw.id = 'nae-rwnewbox'; box.after(nw); }   /* "Mundo novo" fora da lista rolável, sempre à vista */
  nw.innerHTML = '<div class="nae-rwh">' + (L.length ? 'Ou comece do zero' : 'Mundo') + '</div><label class="nae-rw nae-rwnew"><input type="radio" name="nae-rw" value="new"' + (L.length ? '' : ' checked') + '><span><b>✦ Mundo novo</b><small>Cidade do zero: ninguém tem casa nem negócio, economia nova.</small></span></label><label class="nae-link" style="cursor:pointer;display:inline-block;margin-top:8px" title="Traz um mundo exportado de outro computador">Importar mundo (.json)<input type="file" id="nae-wimp" accept=".json,application/json" style="display:none"></label>';
  { const im = nw.querySelector('#nae-wimp'); if (im) im.onchange = () => { const f = im.files && im.files[0]; if (f) worldImport(f, ok => { setStatus(ok ? 'Mundo importado: ' + ok + '. Ele já está no topo da lista.' : 'Arquivo de mundo inválido.', !ok); realmWorlds(); }); }; }
  box.querySelectorAll('[data-wexp]').forEach(b => b.onclick = e => { e.preventDefault(); worldExport(b.dataset.wexp); });
  box.querySelectorAll('[data-wdel]').forEach(b => b.onclick = e => { e.preventDefault(); if (b.dataset.sure) { worldDelete(b.dataset.wdel); realmWorlds(); } else { b.dataset.sure = 1; b.textContent = 'confirmar?'; } });
}
/* levar um mundo guardado para outro computador: tudo o que o anfitrião salvou daquele mundo vai num arquivo .json */
function worldExport(id) { try { const pre = worldPre(id), ix = worldsIndex(), keys = {}; if (!pre || !ix[id]) return; for (const k of Object.keys(localStorage)) if (k.startsWith(pre)) keys[k.slice(pre.length)] = localStorage.getItem(k);
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ naeWorld: 1, at: Date.now(), ver: VERSION, id, meta: ix[id], keys })], { type: 'application/json' })); a.download = 'nae-mundo-' + String(ix[id].n || 'nae').replace(/[^\wÀ-ÿ-]+/g, '_') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); setStatus('Mundo exportado. Leve o arquivo e use "Importar mundo" no outro computador.'); } catch (e) { setStatus('Não foi possível exportar o mundo.', true); } }
function worldImport(file, done) { const r = new FileReader(); r.onerror = () => done(null); r.onload = () => { try { const d = JSON.parse(r.result); if (!d || d.naeWorld !== 1 || !d.keys || !/^w[a-z0-9]+$/i.test(String(d.id || ''))) throw 0; const pre = worldPre(d.id);
  for (const k of Object.keys(localStorage)) if (k.startsWith(pre)) localStorage.removeItem(k);   /* se já existia aqui, o arquivo vale */
  for (const k in d.keys) if (typeof d.keys[k] === 'string') localStorage.setItem(pre + k, d.keys[k]);
  const ix = worldsIndex(), m = d.meta || {}; ix[d.id] = { n: String(m.n || 'Nae').slice(0, 28), t: Date.now(), h: String(m.h || ''), own: !!m.own }; worldsSave(ix); done(ix[d.id].n); } catch (e) { done(null); } }; r.readAsText(file); }
function realmScan() {
  const box = document.getElementById('nae-rlist'); if (!box || typeof Net === 'undefined') return; box.innerHTML = '<div class="sv-empty">Procurando reinos...</div>';
  Net.scan(list => { const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    if (!list.length) { box.innerHTML = '<div class="sv-empty">Nenhum reino aberto agora. Crie o seu abaixo!</div>'; return; }
    box.innerHTML = list.map(r => { const ok = !r.ver || r.ver === VERSION; return `<div class="nae-rrow${ok ? '' : ' off'}"><div><b>${esc(r.realm || 'Reino de ' + (r.name || '?'))}${r.lock ? ' 🔒' : ''}</b><small>anfitrião ${esc(r.name || '?')} · ${r.n || 0} jogador${r.n === 1 ? '' : 'es'} · código ${esc(r.code)}${ok ? '' : ' · versão ' + esc(r.ver) + ' (diferente da sua)'}</small></div><button class="btn" data-rjoin="${esc(r.code)}" ${ok ? '' : 'disabled'}>Entrar</button></div>`; }).join('');
    box.querySelectorAll('[data-rjoin]').forEach(b => b.onclick = () => devGate(() => realmJoin(b.dataset.rjoin))); });
}
// ---------- menu minimalista ----------
function titleMenu() {
  const lob = document.getElementById('lobby'); if (!lob) return;
  document.body.classList.add('nae');
  const m = document.createElement('div'); m.id = 'title-menu';
  m.innerHTML = '<div class="nae-logo">NAE</div><nav class="nae-nav nae-nav2">' + [['heroes', 'Jogar'], ['guide', 'Guia do jogo'], ['road', 'Roadmap'], ['opts', 'Configurações'], ['quit', 'Sair']].map(([k, n]) => '<button data-p="' + k + '">' + n + '</button>').join('') + '</nav><div class="nae-credit">Foto: Bled Castle at Sunrise, de Dreamy Pixel (CC BY 4.0)</div><nav class="nae-nav" style="display:none">' + '<a class="nae-guide" href="guia.html" target="_blank" rel="noopener">Guia do jogo</a><a class="nae-guide" href="roadmap.html" target="_blank" rel="noopener">Roadmap</a></nav><div class="nae-ver" id="nae-ver"></div>';
  lob.appendChild(m);
  const v = document.getElementById('version'); if (v) document.getElementById('nae-ver').textContent = v.textContent || (typeof VERSION !== 'undefined' ? VERSION : '');
  const opts = document.createElement('section'); opts.id = 'nae-opts'; opts.className = 'nae-opts';
  opts.innerHTML = '<h2>Configurações</h2><label>Qualidade gráfica</label><div class="nae-row" id="nae-q"><button data-q="auto">Automática</button><button data-q="low">Baixa</button><button data-q="med">Média</button><button data-q="high">Alta</button></div><p class="hint">As demais opções ficam no menu de pausa, dentro do jogo (Esc).</p>';
  lob.querySelector('.scroll').appendChild(opts);
  { // importar herói de um arquivo exportado em outro navegador
    const box = document.createElement('div'); box.className = 'nae-dev';
    box.innerHTML = '<label>Importar herói</label><div class="nae-row"><label class="btn ghost" style="cursor:pointer">Escolher arquivo .json<input type="file" id="title-imp" accept=".json,application/json" style="display:none"></label></div><small id="title-imp-st">Use o arquivo de “Exportar herói” (menu do jogo → Progresso).</small>';
    opts.appendChild(box);
    box.querySelector('#title-imp').onchange = ev => { const f = ev.target.files && ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !d.heroes) throw 0; const all = loadChars(); let n = 0, last = null; for (const k in d.heroes) if (d.heroes[k] && d.heroes[k].name) { all[k] = d.heroes[k]; n++; last = d.heroes[k]; } localStorage.setItem(SAVE_KEY, JSON.stringify(all)); box.querySelector('#title-imp-st').textContent = n + ' herói(s) importado(s).'; if (last) { document.getElementById('name').value = last.name; chosenClass = last.cls; if (window.naeQuick) window.naeQuick(); } } catch (e) { box.querySelector('#title-imp-st').textContent = 'Arquivo inválido.'; } }; r.readAsText(f); };
  }
  { // senha do criador: fica salva neste navegador; ao entrar, pergunta se é o Tecelão ou um herói normal
    const box = document.createElement('div'); box.className = 'nae-dev';
    box.innerHTML = '<label>Senha do Criador</label><div class="nae-row"><input id="nae-devpw" type="password" maxlength="24" placeholder="(opcional)" autocomplete="off"><button id="nae-devsave">Salvar</button><button id="nae-devclr">Apagar</button></div><small id="nae-devst"></small>';
    opts.appendChild(box);
    const st = () => { let has = false; try { has = !!localStorage.getItem('nae-dev'); } catch (e) { } box.querySelector('#nae-devst').textContent = has ? 'Senha salva neste navegador. Ao entrar você escolhe: Tecelão ou herói normal.' : 'Nenhuma senha salva.'; };
    box.querySelector('#nae-devsave').onclick = () => { const v = box.querySelector('#nae-devpw').value.trim(); if (!v) return; try { localStorage.setItem('nae-dev', v.toUpperCase()); } catch (e) { } box.querySelector('#nae-devpw').value = ''; st(); };
    box.querySelector('#nae-devclr').onclick = () => { try { localStorage.removeItem('nae-dev'); } catch (e) { } st(); };
    st();
  }
  { // Jogar = continuar rápido com o herói atual; Personagens = escolher/criar/editar heróis
    const scroll = lob.querySelector('.scroll'), start = scroll.querySelector('.start');
    const q = document.createElement('section'); q.id = 'nae-quick'; q.className = 'nae-quick'; scroll.insertBefore(q, start);
    const tp = document.createElement('div'); tp.id = 'nae-toplay'; tp.className = 'nae-toplay'; tp.innerHTML = '<button class="btn gold">Jogar com este herói ▸</button>'; scroll.insertBefore(tp, start);
    tp.querySelector('button').onclick = () => open('play');
    window.naeQuick = () => {
      const nm = (document.getElementById('name') || {}).value || '', cls = typeof chosenClass !== 'undefined' ? chosenClass : 'knight';
      let sv = null; try { sv = nm.trim() && typeof loadChars === 'function' ? loadChars()[charKey(nm, cls)] : null; } catch (e) { }
      const cn = typeof CLASSES !== 'undefined' && CLASSES[cls] ? CLASSES[cls].name : cls;
      q.innerHTML = nm.trim() ? '<div class="nq-card"><div class="nq-who"><b>' + nm.replace(/</g, '') + '</b><span>' + cn + (sv ? ' · nível ' + (sv.lvl || 1) + ' · ' + (sv.gold || 0) + ' ouro' : ' · herói novo') + '</span></div><button class="btn ghost" id="nq-change">Trocar herói</button></div>'
        : '<div class="nq-card"><div class="nq-who"><b>Nenhum herói ainda</b><span>Crie o seu em Personagens.</span></div><button class="btn gold" id="nq-change">Criar herói</button></div>';
      q.querySelector('#nq-change').onclick = () => open('chars');
      if (nm.trim()) { const e = document.createElement('div'); e.className = 'nq-enter'; e.innerHTML = '<button class="btn gold" id="nq-enter">Entrar no reino ▸</button><small>Entra no reino aberto ou abre um com você de anfitrião. Outros reinos e código de sala em Reinos online.</small>'; q.appendChild(e); e.querySelector('button').onclick = ev => quickEnter(ev.currentTarget); }
    };
  }
  document.body.classList.add('nae-ready');
  const markQ = () => opts.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', (typeof SET !== 'undefined' && (SET.quality || 'auto')) === b.dataset.q));
  opts.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (typeof SET !== 'undefined') { SET.quality = b.dataset.q; try { saveSettings(); } catch (e) { } } markQ(); }); markQ();
  // painel de heróis: depois de escolher, "Continuar" leva aos Reinos Online
  { const sc = lob.querySelector('.scroll'), cont = document.createElement('div'); cont.id = 'nae-cont'; cont.innerHTML = '<button class="btn gold" id="nae-contb">Continuar com este herói ▸</button><small id="nae-cont-st"></small>'; sc.appendChild(cont);
    const rl = document.createElement('section'); rl.id = 'nae-realm'; rl.innerHTML = '<button class="nae-back" id="nae-rback">← Trocar de herói</button><h2>Reinos Online</h2><p class="hint" id="nae-rwho"></p><div id="nae-rmsg" class="nae-rmsg hidden"></div>'
      + '<div class="nae-rsec"><div class="nae-rhead"><b>Reinos abertos</b><button class="nae-link" id="nae-rscan">Procurar de novo</button></div><div id="nae-rlist" class="nae-rlist"><div class="sv-empty">Procurando reinos...</div></div>'
      + '<div class="nae-rcode"><input id="nae-rcode" maxlength="8" placeholder="Código do reino (ex.: S2)" autocomplete="off"><button class="btn" id="nae-rjoin">Entrar pelo código</button></div></div>'
      + '<div class="nae-rsec"><div class="nae-rhead"><b>Criar reino</b></div><div class="nae-rform"><label>Nome do reino<input id="nae-rname" maxlength="28" placeholder="Reino de ..."></label><label>Senha (opcional)<input id="nae-rpw" maxlength="24" type="password" placeholder="sem senha: qualquer um entra" autocomplete="new-password"></label>'
      + '<label>Mundo</label><div id="nae-rworlds" class="nae-rworlds"></div><button class="btn gold" id="nae-rcreate">Criar reino ▸</button></div></div>'; sc.appendChild(rl);
    cont.querySelector('#nae-contb').onclick = () => { const nm = (document.getElementById('name') || {}).value || ''; if (!nm.trim()) { document.getElementById('nae-cont-st').textContent = 'Escolha um herói ou crie um novo (dê um nome).'; return; }
      const cn = typeof CLASSES !== 'undefined' && CLASSES[chosenClass] ? CLASSES[chosenClass].name : ''; document.getElementById('nae-rwho').textContent = 'Você entra como ' + nm.trim() + (cn ? ', ' + cn : '') + '. Entre no reino de alguém ou crie o seu: cada reino tem o mundo do seu anfitrião.'; document.getElementById('nae-rname').placeholder = 'Reino de ' + nm.trim(); realmScreen(); open('realm'); };
    rl.querySelector('#nae-rback').onclick = () => open('heroes');
    rl.querySelector('#nae-rscan').onclick = () => realmScan();
    rl.querySelector('#nae-rjoin').onclick = () => devGate(() => realmJoin(document.getElementById('nae-rcode').value));
    rl.querySelector('#nae-rcreate').onclick = () => { const sel = document.querySelector('input[name=nae-rw]:checked'); devGate(() => realmCreate({ name: document.getElementById('nae-rname').value, pw: document.getElementById('nae-rpw').value, wid: sel && sel.value !== 'new' ? sel.value : null })); };
    try { const msg = sessionStorage.getItem('nae-realm-msg'); if (msg) { sessionStorage.removeItem('nae-realm-msg'); const b = document.getElementById('nae-rmsg'); b.textContent = msg; b.classList.remove('hidden'); setTimeout(() => document.getElementById('nae-contb') && document.getElementById('name').value.trim() && document.getElementById('nae-contb').click(), 400); } } catch (e) { } }
  const open = k => {
    if (k === 'guide') { window.open('guia.html', '_blank', 'noopener'); return; }
    if (k === 'road') { window.open('roadmap.html', '_blank', 'noopener'); return; }
    if (k === 'quit') { window.close(); setTimeout(() => { if (!document.hidden) { const d = document.getElementById('nae-quitmsg') || Object.assign(document.createElement('div'), { id: 'nae-quitmsg' }); d.textContent = 'O navegador não deixou o jogo fechar a aba sozinho. Feche a aba normalmente (Ctrl+W).'; document.body.appendChild(d); setTimeout(() => d.remove(), 4000); } }, 300); return; }
    document.body.classList.toggle('nae-playing', k === 'heroes' || k === 'realm');
    const same = document.body.dataset.tp === k && document.body.classList.contains('tp-open');
    m.querySelectorAll('button').forEach(b => b.classList.toggle('on', !same && b.dataset.p === k));
    if (same) { document.body.classList.remove('tp-open'); return; }
    document.body.dataset.tp = k; document.body.classList.add('tp-open'); if (k === 'play' && window.naeQuick) window.naeQuick();
    if (k === 'chars' || k === 'heroes') { const s = document.getElementById('saved'); if (s) s.scrollIntoView({ block: 'center' }); }
    if (k === 'realms' && typeof scanServers === 'function') scanServers();
  };
  m.querySelectorAll('button').forEach(b => b.onclick = () => open(b.dataset.p));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('tp-open') && !G.started) { document.body.classList.remove('tp-open', 'nae-playing'); m.querySelectorAll('button').forEach(b => b.classList.remove('on')); } });
}
(function () {
  const go = () => { document.title = GAME_NAME; titleMenu(); titleScene(); const iv = setInterval(() => { if (typeof G !== 'undefined' && G.started) { TITLE.on = false; document.body.classList.remove('nae', 'tp-open'); clearInterval(iv); } }, 300); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
