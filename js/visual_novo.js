/* GERADO por nae-ferramentas/mkvisual.js a partir dos protótipos — não editar aqui. */
/* PROTÓTIPO dos rostos (só no roteiro de fotos). FACE.style: 'old' (como hoje), 'A' (estilizado detalhado), 'B' (semi-realista).
   O rosto é pintado numa textura (olhos, sobrancelhas, nariz, boca, sombras) sobre uma "máscara" que acompanha a frente da cabeça. */
window.FACE = { style: 'old', expr: 'n' };
(function () {
  const hx = h => { if (h == null) return '#888888'; if (typeof h === 'string') return h; if (typeof h === 'number') return '#' + (h & 0xffffff).toString(16).padStart(6, '0'); if (h.getHexString) return '#' + h.getHexString(); if (h.hex != null) return hx(h.hex); return '#888888'; }, TEX = new Map();
  const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
  /* textura do rosto: 512x512, fundo transparente; u (x) da direita do personagem para a esquerda dele, v (y) da testa ao queixo */
  function faceTex(L, st, ex) { const key = st + ex + '|' + hx(L.skin) + hx(L.hair) + hx(L.eyes) + (L.fem ? 'f' : 'm') + (L.beard ? 'b' : ''); if (TEX.has(key)) return TEX.get(key);
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d'), skin = hx(L.skin), hair = hx(L.hair || '#3a2a1e'), iris = L.eyes ? hx(L.eyes) : (L.fem ? '#5a7a3a' : '#5a3a22'), fem = !!L.fem;
    const EY = st === 'B' ? 214 : 216, EX = st === 'B' ? 90 : 100, closed = ex === 'c' || ex === 'k';
    /* sombras suaves (só no semi-realista): órbitas, laterais do nariz, maçãs */
    if (st === 'B') { const g = (cx, cy, r, a, col) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0)); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
      const dk = new THREE.Color(skin).multiplyScalar(0.7), rgb = `rgba(${Math.round(dk.r * 255)},${Math.round(dk.g * 255)},${Math.round(dk.b * 255)},A)`;
      for (const s of [-1, 1]) { g(256 + s * EX, EY - 6, 56, 0.45, rgb); g(256 + s * 26, 300, 26, 0.35, rgb); g(256 + s * 120, 330, 70, 0.25, rgb); }
      if (fem) for (const s of [-1, 1]) g(256 + s * 98, 318, 44, 0.22, 'rgba(220,110,120,A)'); }
    if (st === 'A' && fem) for (const s of [-1, 1]) { const gr = x.createRadialGradient(256 + s * 100, 312, 0, 256 + s * 100, 312, 38); gr.addColorStop(0, 'rgba(240,120,130,0.35)'); gr.addColorStop(1, 'rgba(240,120,130,0)'); x.fillStyle = gr; x.beginPath(); x.arc(256 + s * 100, 312, 38, 0, 7); x.fill(); }
    /* olhos */
    for (const s of [-1, 1]) { const cx = 256 + s * EX, cy = EY, w = st === 'B' ? 60 : 76, h = st === 'B' ? 30 : 46;
      if (closed) { x.strokeStyle = '#2a1a12'; x.lineWidth = st === 'B' ? 5 : 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - w, cy + 2); x.quadraticCurveTo(cx, cy + 12, cx + w, cy + 2); x.stroke(); if (fem) for (let q = 0; q < 3; q++) { x.beginPath(); x.moveTo(cx + s * (w - 6 - q * 9), cy + 6); x.lineTo(cx + s * (w - q * 9), cy + 14); x.stroke(); } continue; }
      x.save(); x.beginPath(); x.moveTo(cx - w, cy); x.quadraticCurveTo(cx, cy - h * 1.45, cx + w, cy); x.quadraticCurveTo(cx, cy + h * 1.15, cx - w, cy); x.closePath(); x.fillStyle = '#f6f1e8'; x.fill(); x.clip();
      const ir = st === 'B' ? 27 : 40, ix = cx - s * 2, iy = cy - 1, gi = x.createRadialGradient(ix, iy - 3, 2, ix, iy, ir); gi.addColorStop(0, shade(iris, 1.5)); gi.addColorStop(0.6, iris); gi.addColorStop(1, shade(iris, 0.45)); x.fillStyle = gi; x.beginPath(); x.arc(ix, iy, ir, 0, 7); x.fill();
      x.fillStyle = '#0c0806'; x.beginPath(); x.arc(ix, iy, ir * 0.45, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(ix - ir * 0.35, iy - ir * 0.4, ir * 0.28, 0, 7); x.fill(); x.beginPath(); x.arc(ix + ir * 0.3, iy + ir * 0.3, ir * 0.12, 0, 7); x.fill();
      x.fillStyle = 'rgba(40,20,10,0.25)'; x.fillRect(cx - w, cy - h * 1.4, w * 2, h * 0.5); x.restore();
      /* pálpebra e cílios */
      x.strokeStyle = '#140c08'; x.lineCap = 'round'; x.lineWidth = st === 'B' ? (fem ? 9 : 7) : (fem ? 14 : 11); x.beginPath(); x.moveTo(cx - w - 3, cy + 2); x.quadraticCurveTo(cx, cy - h * 1.5, cx + w + 3, cy + 2); x.stroke();
      if (fem) { x.lineWidth = st === 'B' ? 5 : 7; for (let q = 0; q < 3; q++) { const px = cx + s * (w - 6 - q * 12), py = cy - h * 0.95 + q * 4; x.beginPath(); x.moveTo(px, py); x.lineTo(px + s * 14, py - 12); x.stroke(); } }
      if (st === 'B') { x.strokeStyle = 'rgba(60,30,20,0.45)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx - w * 0.8, cy + h * 0.55); x.quadraticCurveTo(cx, cy + h * 1.15, cx + w * 0.9, cy + h * 0.4); x.stroke(); } }
    /* sobrancelhas */
    x.strokeStyle = shade(hair, 0.85); x.lineCap = 'round';
    for (const s of [-1, 1]) { const cx = 256 + s * EX, by = EY - (st === 'B' ? 62 : 78); if (st === 'B') { x.lineWidth = fem ? 9 : 12; for (let q = 0; q < 11; q++) { const t = q / 10, px = cx - s * 46 + s * t * 96, py = by + 6 - Math.sin(t * Math.PI) * 9 + (fem ? 0 : 2); x.globalAlpha = 0.55; x.beginPath(); x.moveTo(px, py + 4); x.lineTo(px + s * 9, py - 3); x.stroke(); } x.globalAlpha = 1; }
      else { x.lineWidth = fem ? 13 : 18; x.beginPath(); x.moveTo(cx - s * 52, by + 6); x.quadraticCurveTo(cx, by - 14, cx + s * 54, by + 4); x.stroke(); } }
    /* nariz */
    x.strokeStyle = shade(skin, 0.6); x.lineWidth = st === 'B' ? 4 : 5; x.lineCap = 'round'; x.beginPath(); if (st === 'B') { x.moveTo(256 - 16, 318); x.quadraticCurveTo(256, 328, 256 + 16, 318); x.stroke(); x.fillStyle = shade(skin, 0.45); for (const s of [-1, 1]) { x.beginPath(); x.ellipse(256 + s * 10, 320, 5, 3, 0, 0, 7); x.fill(); } } else { x.moveTo(256 - 10, 316); x.quadraticCurveTo(256 + 4, 324, 256 + 12, 314); x.stroke(); }
    /* boca */
    const my = st === 'B' ? 374 : 372, lip = fem ? (st === 'B' ? '#b8505e' : '#c8505e') : shade(skin, 0.62);
    if (ex === 'k') { x.fillStyle = lip; x.beginPath(); x.ellipse(256, my, 14, 12, 0, 0, 7); x.fill(); x.fillStyle = shade(lip, 0.6); x.beginPath(); x.ellipse(256, my, 6, 5, 0, 0, 7); x.fill(); }
    else if (fem || st === 'B') { const w = st === 'B' ? (fem ? 42 : 44) : (fem ? 40 : 38), up = ex === 's' ? -6 : 0; x.fillStyle = lip; x.beginPath(); x.moveTo(256 - w, my + up); x.quadraticCurveTo(256 - w * 0.4, my - 10, 256, my - 5); x.quadraticCurveTo(256 + w * 0.4, my - 10, 256 + w, my + up); x.quadraticCurveTo(256, my + 16, 256 - w, my + up); x.fill();
      x.strokeStyle = shade(lip, 0.55); x.lineWidth = 3; x.beginPath(); x.moveTo(256 - w, my + up); x.quadraticCurveTo(256, my + 4 + (ex === 's' ? 6 : 0), 256 + w, my + up); x.stroke(); if (st === 'B') { x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.ellipse(256 - 6, my + 7, 9, 3, 0, 0, 7); x.fill(); } }
    else { x.strokeStyle = shade(skin, 0.45); x.lineWidth = 9; x.beginPath(); x.moveTo(256 - 34, my); x.quadraticCurveTo(256, my + (ex === 's' ? 14 : 5), 256 + 34, my); x.stroke(); }
    /* barba por fazer no semi-realista */
    if (st === 'B' && !fem && !L.beard) { const dk = new THREE.Color(hair); x.fillStyle = `rgba(${Math.round(dk.r * 200)},${Math.round(dk.g * 200)},${Math.round(dk.b * 200)},0.07)`; x.beginPath(); x.ellipse(256, 450, 150, 60, 0, 0, 7); x.fill(); }
    const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; if ('colorSpace' in tx && THREE.SRGBColorSpace) tx.colorSpace = THREE.SRGBColorSpace; else if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; TEX.set(key, tx); return tx; }
  /* troca a cabeça: esconde olhos, pálpebras, sobrancelhas e o cone do nariz; ajusta crânio, queixo e nariz; põe a máscara pintada */
  function shapeHead(g, st, R) { const P = g.attributes.position, v = new THREE.Vector3(), jw = st === 'B' ? 0.3 : 0.22;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const t = Math.max(0, -v.y / R); v.x *= (st === 'B' ? 0.86 : 0.92) * (1 - jw * Math.pow(t, 1.4)); v.y *= st === 'B' ? 1.08 : 1.05; v.z *= (st === 'B' ? 0.98 : 1) * (1 - 0.12 * t); if (v.z > 0 && t > 0.55) v.z += 0.06 * R * (t - 0.55); if (v.z > 0 && t < 0.15 && v.y < 0.4 * R) v.z += 0.02 * R * Math.max(0, 1 - Math.abs(v.x) / (0.5 * R)) * (st === 'B' ? 1 : 0.5); P.setXYZ(i, v.x, v.y, v.z); }
    P.needsUpdate = true; g.computeVertexNormals(); return g; }
  const _bh = buildHead; buildHead = function (head, L, S, skinM, accM, trimM) { const r = _bh.apply(this, arguments); if (FACE.style === 'old') return r; const st = FACE.style;
    const kill = new Set([...(head.userData.eyes || []), ...(head.userData.lids || [])]);
    for (const o of head.children.slice()) { if (kill.has(o)) { o.visible = false; continue; } const g = o.geometry; if (!g) continue; const t = g.type, p = o.position;
      if (t === 'ConeGeometry' && p.z > 0.08 * S && Math.abs(p.y) < 0.03 * S) o.visible = false;   /* cone do nariz */
      if (t === 'BoxGeometry' && p.z > 0.08 * S && p.y > 0.03 * S && p.y < 0.06 * S && Math.abs(p.x) > 0.02 * S && Math.abs(p.x) < 0.06 * S) o.visible = false;   /* sobrancelhas em bloco */
      if (t === 'BoxGeometry' && p.z > 0.08 * S && p.y < 0.015 * S && p.y > -0.005 * S && g.parameters && g.parameters.height < 0.006 * S) o.visible = false;   /* cílios */
      if (o.material === skinM && t === 'SphereGeometry' && Math.abs(p.y + 0.05 * S) < 0.002 && p.z > 0.01 * S) o.visible = false;   /* queixo antigo (a emenda fazia uma mancha) */
      if (o.material === skinM && t === 'SphereGeometry' && p.y === 0 && p.z === 0 && p.x === 0) { o.geometry = shapeHead(new THREE.SphereGeometry(0.105 * S, 40, 30), st, 0.105 * S); o.scale.set(1, 1, 1); } }
    const R0 = 0.105 * S * 1.012, g = shapeHead(new THREE.SphereGeometry(R0, 40, 28, Math.PI / 2 - 1.1, 2.2, 0.95, 1.25), st, R0), m = new THREE.MeshStandardMaterial({ map: faceTex(L, st, FACE.expr), transparent: true, depthWrite: false, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mask = new THREE.Mesh(g, m); mask.renderOrder = 3; head.add(mask); head.userData.faceMask = mask;
    /* nariz com volume (pequeno no estilizado, mais marcado no semi-realista) */
    const nose = new THREE.Mesh(new THREE.SphereGeometry(st === 'B' ? 0.0125 * S : 0.011 * S, 12, 10), skinM); nose.scale.set(0.8, st === 'B' ? 1.3 : 1, 0.9); nose.position.set(0, st === 'B' ? -0.012 * S : -0.014 * S, (st === 'B' ? 0.1 : 0.098) * S); head.add(nose);
    if (false) { const brow = new THREE.Mesh(new THREE.SphereGeometry(0.1 * S, 20, 10, 0, Math.PI * 2, 0, 0.5), skinM); brow.scale.set(0.82, 0.35, 0.9); brow.position.set(0, 0.03 * S, 0.012 * S); brow.rotation.x = 1.25; head.add(brow); }
    return r; };
})();

;
/* PROTÓTIPO 2 dos rostos — "estilizado detalhado" refinado (FACE.style = 'C').
   Cabeça esculpida numa peça só (crânio, maçãs, queixo, nariz e arco das sobrancelhas na própria malha),
   cor pintada nos vértices (luz de cima, rubor, sombra sob o queixo) e uma máscara com o rosto pintado à mão
   (olhos, sobrancelhas, boca, sombras e brilhos suaves) numa textura de 1024. Carregar DEPOIS de proto_face.js. */
(function () {
  const V3 = THREE.Vector3;
  const hx = h => { if (h == null) return '#888888'; if (typeof h === 'string') return h; if (typeof h === 'number') { const r = h & 255, g = (h >> 8) & 255, b = (h >> 16) & 255; return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0'); }   /* px() do jogo guarda ABGR */ if (h.getHexString) return '#' + h.getHexString(); if (h.hex != null) return hx(h.hex); return '#888888'; };
  const C = h => new THREE.Color(hx(h));
  const rgba = (c, a) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
  const mix = (a, b, t) => a.clone().lerp(b, t);
  const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

  /* ---------- forma da cabeça (em unidades do raio; frente = +z, cima = +y) ---------- */
  function sculpt(nx, ny, nz, fem) {
    let x = nx * (fem ? 0.86 : 0.89), y = ny * 1.07, z = nz * 0.97;
    const lo = Math.max(0, -ny);
    x *= 1 - (fem ? 0.34 : 0.24) * Math.pow(lo, 1.5);                         /* afina o queixo */
    if (nz < 0) z *= 1 - 0.18 * lo;                                           /* nuca */
    let push = 0;
    const front = Math.max(0, nz);
    push += (fem ? 0.03 : 0.04) * (g2(nx, ny, 0.55, -0.12, 0.2, 0.15) + g2(nx, ny, -0.55, -0.12, 0.2, 0.15)) * front;   /* maçãs */
    push -= 0.032 * (g2(nx, ny, 0.35, 0.07, 0.14, 0.08) + g2(nx, ny, -0.35, 0.07, 0.14, 0.08)) * front;                   /* órbitas */
    push += (fem ? 0.012 : 0.03) * (g2(nx, ny, 0.33, 0.25, 0.2, 0.06) + g2(nx, ny, -0.33, 0.25, 0.2, 0.06)) * front;      /* arco das sobrancelhas */
    if (!fem) push += 0.035 * (g2(nx, ny, 0.62, -0.58, 0.14, 0.14) + g2(nx, ny, -0.62, -0.58, 0.14, 0.14));            /* ângulo da mandíbula */
    push += 0.016 * g2(nx, ny, 0, -0.43, 0.3, 0.12) * front;
    push += (fem ? 0.016 : 0.01) * g2(nx, ny, 0, -0.395, 0.17, 0.025) * front + (fem ? 0.02 : 0.013) * g2(nx, ny, 0, -0.45, 0.15, 0.03) * front - 0.012 * g2(nx, ny, 0, -0.505, 0.13, 0.025) * front;   /* lábios e covinha */                                                           /* boca */
    push += (fem ? 0.03 : 0.045) * g2(nx, ny, 0, -0.8, 0.16, 0.1) * front;                                            /* queixo */
    /* nariz: dorso estreito que desce e termina numa ponta arredondada */
    const nose = front > 0.6 ? (g2(nx, ny, 0, -0.02, fem ? 0.055 : 0.065, 0.22) * (fem ? 0.07 : 0.085) + g2(nx, ny, 0, -0.23, fem ? 0.075 : 0.09, 0.07) * (fem ? 0.075 : 0.095)) * Math.pow(front, 4) : 0;
    const k = 1 + push;
    return [x * k, y * k, z * k + nose];
  }
  function shapeGeo(g, R, fem) {
    const P = g.attributes.position, v = new V3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).divideScalar(R); const n = v.clone().normalize(), r = v.length(); const [x, y, z] = sculpt(n.x, n.y, n.z, fem); P.setXYZ(i, x * R * r, y * R * r, z * R * r); }
    P.needsUpdate = true; g.computeVertexNormals(); return g;
  }
  /* cor pintada nos vértices: luz quente em cima, rubor nas maçãs/nariz/orelhas, sombra fria embaixo do queixo */
  function paintVerts(g, R, skin, fem) {
    const P = g.attributes.position, n = new V3(), col = new Float32Array(P.count * 3), warm = new THREE.Color(1.0, 0.55, 0.5), cool = new THREE.Color(0.55, 0.55, 0.85);
    for (let i = 0; i < P.count; i++) { n.fromBufferAttribute(P, i).normalize(); const c = new THREE.Color(1, 1, 1);
      const top = Math.max(0, n.y); c.multiplyScalar(0.96 + 0.1 * top);
      const blush = (g2(n.x, n.y, 0.5, -0.2, 0.22, 0.16) + g2(n.x, n.y, -0.5, -0.2, 0.22, 0.16)) * Math.max(0, n.z) * (fem ? 0.26 : 0.06) + g2(n.x, n.y, 0, -0.18, 0.1, 0.1) * Math.max(0, n.z) * (fem ? 0.14 : 0.08);
      c.lerp(warm, blush);
      const under = Math.max(0, -n.y - 0.55) * (1 - Math.max(0, n.z) * 0.5); c.lerp(cool, Math.min(0.45, under * 0.9)); c.multiplyScalar(1 - under * 0.25);
      if (n.z < -0.2) c.multiplyScalar(0.94);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
  }

  /* ---------- rosto pintado (1024x1024; u = da direita do personagem para a esquerda, v = testa → queixo) ---------- */
  const TEX = new Map();
  function faceTex(L, ex) {
    const fem = !!L.fem, key = 'C' + ex + hx(L.skin) + hx(L.hair) + hx(L.eyes) + (fem ? 'f' : 'm') + (L.beard ? 'b' : '') + hx(L.lips || '');
    if (TEX.has(key)) return TEX.get(key);
    const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), k = S / 512;
    x.scale(k, k); x.translate(256, 0); x.scale(1.25 / 2.2, 1); x.translate(-256, 0);   /* unidades iguais nos dois sentidos (a máscara cobre 2,2 rad de largura e 1,25 de altura) */
    const skin = C(L.skin || '#d8a47f'), hair = C(L.hair || L.brows || '#3a2a1e'), dark = mix(skin, new THREE.Color('#3a1810'), 0.55), shadow = mix(skin, new THREE.Color('#5a2a40'), 0.35), light = mix(skin, new THREE.Color('#fff4e0'), 0.55);
    const irisC = (() => { const e = L.eyes != null ? C(L.eyes) : null; if (!e || e.r * 0.3 + e.g * 0.59 + e.b * 0.11 < 0.16) { const k = (hx(L.hair) + hx(L.skin) + (fem ? 'f' : 'm')).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); const P = ['#5a3a20', '#5a3a20', '#7a5a28', '#4f7a4a', '#3f6a9a', '#6a7480']; return C(P[k % P.length]); } return e; })();
    const closed = ex === 'c' || ex === 'k', smile = ex === 's';
    const soft = (cx, cy, rx, ry, col, a) => { x.save(); x.translate(cx, cy); x.scale(1, ry / rx); const gr = x.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); x.fillStyle = gr; x.beginPath(); x.arc(0, 0, rx, 0, 7); x.fill(); x.restore(); };
    const EY = 236, EX = fem ? 156 : 156;
    /* luz e sombra pintadas */
    for (const s of [-1, 1]) {
      soft(256 + s * EX, EY - 26, 95, 36, shadow, fem ? 0.32 : 0.42);           /* sombra sob o arco da sobrancelha */
      soft(256 + s * 40, 305, 28, 52, shadow, 0.34);                              /* lateral do nariz */
      soft(256 + s * 225, 300, 75, 30, light, 0.28);                              /* topo das maçãs */
      soft(256 + s * 310, 420, 100, 110, shadow, fem ? 0.14 : 0.24);                /* lateral da mandíbula */
      if (fem) soft(256 + s * 190, 325, 75, 34, new THREE.Color('#e86a70'), 0.3);  /* rubor */
    }
    soft(256, 105, 210, 60, light, 0.25);      /* testa */
    soft(256, 300, 12, 38, light, 0.3);       /* dorso do nariz */
    soft(256, 462, 46, 14, shadow, 0.4);       /* sob o lábio inferior */
    soft(256, 500, 50, 14, light, 0.2);       /* ponta do queixo */
    soft(256, 364, 40, 10, shadow, 0.35);      /* sob o nariz */
    if (!fem && !L.beard) soft(256, 490, 230, 70, mix(hair, skin, 0.5), 0.1);   /* sombra de barba */
    /* olhos */
    for (const s of [-1, 1]) {
      const cx = 256 + s * EX, cy = EY, w = fem ? 92 : 82, h = fem ? 47 : 37;
      /* pálpebra superior (dobra) */
      x.strokeStyle = rgba(dark, 0.5); x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - s * w * 0.95, cy - h * 0.55); x.quadraticCurveTo(cx - s * 4, cy - h * 2.15, cx + s * w * 1.05, cy - h * 0.6); x.stroke();
      if (closed) { x.strokeStyle = rgba(new THREE.Color('#1e0e08'), 1); x.lineWidth = fem ? 6 : 5; x.beginPath(); x.moveTo(cx - s * w, cy); x.quadraticCurveTo(cx, cy + h * 0.75, cx + s * w * 1.05, cy - 2); x.stroke();
        if (fem) { x.lineWidth = 3.5; for (let q = 0; q < 4; q++) { const t = 0.35 + q * 0.18, px = cx - s * w + s * 2 * w * t, py = cy + h * 0.55 * Math.sin(Math.PI * t); x.beginPath(); x.moveTo(px, py); x.lineTo(px + s * 5, py + 9); x.stroke(); } }
        continue; }
      /* forma amendoada: canto interno mais baixo e redondo, externo puxado para cima */
      const eye = () => { x.beginPath(); x.moveTo(cx - s * w, cy + 3); x.bezierCurveTo(cx - s * w * 0.6, cy - h * 1.25, cx + s * w * 0.55, cy - h * 1.35, cx + s * w * 1.08, cy - h * 0.3); x.bezierCurveTo(cx + s * w * 0.7, cy + h * 0.95, cx - s * w * 0.4, cy + h * 1.0, cx - s * w, cy + 3); x.closePath(); };
      x.save(); eye(); x.fillStyle = '#f3ede4'; x.fill(); x.clip();
      const ir = fem ? 41 : 35, ix = cx + s * 1, iy = cy - (smile ? 3 : 1);
      const gi = x.createRadialGradient(ix, iy + 4, 2, ix, iy, ir); const ic = (() => { const h = {}; irisC.getHSL(h); return new THREE.Color().setHSL(h.h, Math.min(0.85, h.s * 1.05 + 0.04), Math.min(0.55, h.l * 1.5 + 0.1)); })(); gi.addColorStop(0, rgba(mix(ic, new THREE.Color('#fff0b8'), 0.5), 1)); gi.addColorStop(0.5, rgba(ic, 1)); gi.addColorStop(0.86, rgba(ic.clone().multiplyScalar(0.62), 1)); gi.addColorStop(1, rgba(irisC.clone().multiplyScalar(0.28), 1));
      x.fillStyle = gi; x.beginPath(); x.arc(ix, iy, ir, 0, 7); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1.2; for (let q = 0; q < 14; q++) { const a = q / 14 * 6.283; x.beginPath(); x.moveTo(ix + Math.cos(a) * ir * 0.45, iy + Math.sin(a) * ir * 0.45); x.lineTo(ix + Math.cos(a) * ir * 0.85, iy + Math.sin(a) * ir * 0.85); x.stroke(); }
      x.fillStyle = '#0a0605'; x.beginPath(); x.arc(ix, iy, ir * 0.33, 0, 7); x.fill(); x.fillStyle = rgba(mix(ic, new THREE.Color('#fff8d8'), 0.55), 0.55); x.beginPath(); x.arc(ix, iy + ir * 0.12, ir * 0.82, 0.25 * Math.PI, 0.75 * Math.PI); x.arc(ix, iy + ir * 0.12, ir * 0.5, 0.75 * Math.PI, 0.25 * Math.PI, true); x.fill();
      { const sg = x.createLinearGradient(0, cy - h * 1.3, 0, cy - h * 0.1); sg.addColorStop(0, 'rgba(50,24,16,0.6)'); sg.addColorStop(1, 'rgba(50,24,16,0)'); x.fillStyle = sg; x.fillRect(cx - w * 1.4, cy - h * 1.5, w * 2.8, h * 1.4); }      /* sombra da pálpebra no globo */
      x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(ix - ir * 0.32, iy - ir * 0.38, ir * 0.24, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.arc(ix + ir * 0.35, iy + ir * 0.3, ir * 0.1, 0, 7); x.fill();
      x.restore();
      x.fillStyle = 'rgba(214,120,120,0.7)'; x.beginPath(); x.ellipse(cx - s * w * 0.93, cy + 3, 7, 5, 0, 0, 7); x.fill();   /* canto interno */
      /* linha dos cílios de cima, grossa e com ponta para fora */
      x.fillStyle = '#140906'; x.beginPath(); x.moveTo(cx - s * w * 1.02, cy + 3); x.bezierCurveTo(cx - s * w * 0.6, cy - h * 1.35, cx + s * w * 0.55, cy - h * 1.45, cx + s * w * (fem ? 1.3 : 1.12), cy - h * (fem ? 0.75 : 0.35)); x.bezierCurveTo(cx + s * w * 0.55, cy - h * (fem ? 1.05 : 1.15), cx - s * w * 0.6, cy - h * (fem ? 0.85 : 0.95), cx - s * w * 1.02, cy + 3); x.fill();
      if (fem) { const B = (t, a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d; x.strokeStyle = '#140906'; x.lineCap = 'round'; for (let q = 0; q < 5; q++) { const t = 0.5 + q * 0.11, px = B(t, cx - s * w * 1.02, cx - s * w * 0.6, cx + s * w * 0.55, cx + s * w * 1.3), py = B(t, cy + 3, cy - h * 1.35, cy - h * 1.45, cy - h * 0.75); x.lineWidth = 3.6 - q * 0.3; x.beginPath(); x.moveTo(px, py + 1); x.quadraticCurveTo(px + s * (5 + q * 2), py - 7, px + s * (9 + q * 4), py - 9 + q * 1.5); x.stroke(); } }
      /* pálpebra de baixo: traço fino só na metade de fora */
      x.strokeStyle = rgba(dark, 0.38); x.lineWidth = 2; x.beginPath(); x.moveTo(cx + s * w * 0.15, cy + h * 0.93); x.quadraticCurveTo(cx + s * w * 0.7, cy + h * 0.72, cx + s * w * 1.0, cy - h * 0.15); x.stroke();
      if (smile) { x.strokeStyle = rgba(dark, 0.35); x.lineWidth = 2; x.beginPath(); x.moveTo(cx - s * w * 0.5, cy + h * 1.5); x.quadraticCurveTo(cx, cy + h * 1.85, cx + s * w * 0.6, cy + h * 1.45); x.stroke(); }
    }
    /* sobrancelhas: forma afilada (cabeça grossa perto do nariz, cauda fina) com fios */
    const browC = mix(hair, new THREE.Color('#000'), 0.15);
    for (const s of [-1, 1]) {
      const cx = 256 + s * EX, by = EY - (fem ? 84 : 78) - (smile ? 5 : 0), th = fem ? 15 : 24, len = fem ? 76 : 80;
      const p0 = [cx - s * len * 0.8, by + 8], p1 = [cx - s * 10, by - (fem ? 10 : 6)], p2 = [cx + s * len * 0.75, by - (fem ? 6 : 2)], p3 = [cx + s * len * 1.05, by + (fem ? 8 : 6)];
      x.fillStyle = rgba(browC, 1); x.beginPath(); x.moveTo(p0[0], p0[1] + th * 0.5); x.bezierCurveTo(p1[0], p1[1] + th * 0.55, p2[0], p2[1] + th * 0.3, p3[0], p3[1]); x.bezierCurveTo(p2[0], p2[1] - th * 0.35, p1[0], p1[1] - th * 0.5, p0[0], p0[1] - th * 0.5); x.closePath(); x.fill();
      x.strokeStyle = rgba(mix(browC, new THREE.Color('#fff'), 0.25), 0.5); x.lineWidth = 1.3; for (let q = 0; q < 16; q++) { const t = q / 15, px = p0[0] + (p3[0] - p0[0]) * t, py = p0[1] + (p3[1] - p0[1]) * t - Math.sin(Math.PI * t) * (fem ? 13 : 10); x.beginPath(); x.moveTo(px, py + th * 0.35 * (1 - t)); x.lineTo(px + s * 7, py - th * 0.3 * (1 - t) - 2); x.stroke(); }
    }
    /* nariz: narinas e brilho na ponta (o volume já vem da malha) */
    x.fillStyle = rgba(dark, 0.75); for (const s of [-1, 1]) { x.beginPath(); x.ellipse(256 + s * 17, 354, 8, 4, s * 0.35, 0, 7); x.fill(); }
    x.strokeStyle = rgba(dark, 0.4); x.lineWidth = 2.4; for (const s of [-1, 1]) { x.beginPath(); x.arc(256 + s * 23, 344, 13, s > 0 ? -0.6 : Math.PI - 1.6, s > 0 ? 1.6 : Math.PI + 0.6); x.stroke(); }
    soft(252, 338, 13, 8, new THREE.Color('#fff8ec'), 0.55);
    /* boca — sulco acima do lábio (filtro), lábios com volume pintado, linha da boca afilada nas pontas */
    const my = 430, lipBase = L.lips ? C(L.lips) : fem ? new THREE.Color('#c45866') : mix(skin, new THREE.Color('#a8484c'), 0.32), lipD = lipBase.clone().multiplyScalar(0.6), lipL = mix(lipBase, new THREE.Color('#ffe6dc'), 0.42), lineC = mix(lipD, new THREE.Color('#2a0c0a'), 0.55);
    for (const s of [-1, 1]) soft(256 + s * 12, 392, 6, 22, light, 0.32);
    soft(256, 394, 8, 20, shadow, 0.28);
    const w = fem ? 80 : 74, up = smile ? -14 : 0, mid = smile ? 6 : 0, uh = fem ? 17 : 11, lh = fem ? 27 : 18;
    if (ex === 'k') {
      x.fillStyle = rgba(lipBase, 1); x.beginPath(); x.ellipse(256, my + 2, 24, 20, 0, 0, 7); x.fill();
      x.fillStyle = rgba(lipD, 1); x.beginPath(); x.ellipse(256, my + 1, 10, 8, 0, 0, 7); x.fill();
      soft(250, my + 12, 10, 5, lipL, 0.85); soft(256, my + 32, 30, 10, shadow, 0.35);
    } else {
      soft(256, my + lh + 12, w * 0.55, 10, shadow, fem ? 0.45 : 0.55);
      x.strokeStyle = rgba(light, fem ? 0.5 : 0.35); x.lineWidth = 3; x.beginPath(); x.moveTo(256 - w * 0.7, my - uh * 0.45 + up * 0.6); x.bezierCurveTo(256 - w * 0.35, my - uh * 1.15, 256 - w * 0.12, my - uh * 1.25, 256, my - uh * 0.75); x.bezierCurveTo(256 + w * 0.12, my - uh * 1.25, 256 + w * 0.35, my - uh * 1.15, 256 + w * 0.7, my - uh * 0.45 + up * 0.6); x.stroke();
      const ug = x.createLinearGradient(0, my - uh, 0, my); ug.addColorStop(0, rgba(fem ? lipBase : lipBase.clone().lerp(skin, 0.35), fem ? 1 : 0.9)); ug.addColorStop(1, rgba(lipD, fem ? 1 : 0.9));
      x.fillStyle = ug; x.beginPath(); x.moveTo(256 - w, my + up);
      x.bezierCurveTo(256 - w * 0.7, my - uh * 0.55 + up * 0.5, 256 - w * 0.3, my - uh * 1.05, 256 - w * 0.13, my - uh);
      x.quadraticCurveTo(256, my - uh * 0.62, 256 + w * 0.13, my - uh);
      x.bezierCurveTo(256 + w * 0.3, my - uh * 1.05, 256 + w * 0.7, my - uh * 0.55 + up * 0.5, 256 + w, my + up);
      x.bezierCurveTo(256 + w * 0.5, my + mid * 0.8, 256 - w * 0.5, my + mid * 0.8, 256 - w, my + up); x.fill();
      const lg = x.createLinearGradient(0, my, 0, my + lh); lg.addColorStop(0, rgba(lipBase.clone().multiplyScalar(0.85), fem ? 1 : 0.75)); lg.addColorStop(0.45, rgba(fem ? lipBase : lipBase.clone().lerp(skin, 0.4), fem ? 1 : 0.75)); lg.addColorStop(1, rgba(lipBase.clone().lerp(skin, fem ? 0.35 : 0.7), fem ? 0.9 : 0.5));
      x.fillStyle = lg; x.beginPath(); x.moveTo(256 - w * 0.88, my + up + 1);
      x.bezierCurveTo(256 - w * 0.5, my + mid + 2, 256 + w * 0.5, my + mid + 2, 256 + w * 0.88, my + up + 1);
      x.bezierCurveTo(256 + w * 0.62, my + lh * 0.95, 256 + w * 0.25, my + lh * 1.08, 256, my + lh * 1.05);
      x.bezierCurveTo(256 - w * 0.25, my + lh * 1.08, 256 - w * 0.62, my + lh * 0.95, 256 - w * 0.88, my + up + 1); x.fill();
      soft(248, my + lh * 0.45 + mid * 0.5, w * 0.22, lh * 0.18, lipL, fem ? 0.9 : 0.45);
      x.fillStyle = rgba(lineC, 0.92); x.beginPath(); x.moveTo(256 - w - 3, my + up - 1);
      x.bezierCurveTo(256 - w * 0.5, my + mid - 2.2, 256 + w * 0.5, my + mid - 2.2, 256 + w + 3, my + up - 1);
      x.bezierCurveTo(256 + w * 0.5, my + mid + 3.2, 256 - w * 0.5, my + mid + 3.2, 256 - w - 3, my + up - 1); x.fill();
      for (const s of [-1, 1]) { soft(256 + s * (w + 2), my + up - 1, 7, 6, lineC, 0.55); if (smile) { x.strokeStyle = rgba(lineC, 0.5); x.lineWidth = 2.4; x.beginPath(); x.arc(256 + s * (w + 6), my + up - 8, 9, s > 0 ? 0.1 : Math.PI - 1.3, s > 0 ? 1.3 : Math.PI - 0.1); x.stroke(); } }
    }
    const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 8; if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; TEX.set(key, tx); return tx;
  }

  /* ---------- troca a cabeça ---------- */
  const _bh = buildHead;
  buildHead = function (head, L, S, skinM, accM, trimM) {
    const want = window.FACE && (FACE.style === 'C' || (L && L.newLook));
    if (!want) return _bh.apply(this, arguments);
    const prev = FACE.style; FACE.style = 'old'; const r = _bh.apply(this, arguments); FACE.style = prev;
    const fem = !!L.fem, R0 = 0.105 * S;
    const kill = new Set([...(head.userData.eyes || []), ...(head.userData.lids || [])]);
    let skull = null;
    for (const o of head.children.slice()) { if (kill.has(o)) { o.visible = false; continue; } const g = o.geometry; if (!g) continue; const t = g.type, p = o.position, pr = g.parameters || {};
      if (t === 'ConeGeometry' && p.z > 0.08 * S && Math.abs(p.y) < 0.03 * S) o.visible = false;                                  /* nariz antigo */
      if (t === 'BoxGeometry' && p.z > 0.08 * S && p.y > 0.03 * S && p.y < 0.06 * S && Math.abs(p.x) < 0.06 * S) o.visible = false; /* sobrancelhas antigas */
      if (o.material === skinM && t === 'SphereGeometry' && Math.abs(p.y + 0.05 * S) < 0.002 && p.z > 0.01 * S) o.visible = false; /* queixo antigo */
      if (o.material === skinM && t === 'SphereGeometry' && Math.abs(Math.abs(p.x) - 0.1 * S) < 0.002 && Math.abs(pr.radius - 0.025 * S) < 0.002) {   /* orelhas */
        const s = Math.sign(p.x); o.geometry = new THREE.SphereGeometry(0.022 * S, 16, 12); o.scale.set(0.42, 1.12, 0.74); o.material = skinM.clone(); o.material.color.multiplyScalar(0.88); o.position.set(s * 0.093 * S, -0.004 * S, -0.008 * S); o.rotation.set(0, -s * 0.35, s * 0.08);
        const inner = new THREE.Mesh(new THREE.SphereGeometry(0.017 * S, 12, 10), new THREE.MeshStandardMaterial({ color: skinM.color.clone().multiplyScalar(0.72).lerp(new THREE.Color(0.6, 0.15, 0.12), 0.18), roughness: 0.8 }));
        inner.scale.set(0.3, 1.0, 0.6); inner.position.set(s * 0.0055 * S, -0.002 * S, 0.002 * S); o.add(inner); continue; }
      if (o.material === skinM && t === 'SphereGeometry' && p.x === 0 && p.y === 0 && p.z === 0) skull = o; }
    /* crânio esculpido com cor pintada nos vértices */
    const hm = skinM.clone(); hm.vertexColors = true; hm.roughness = 0.7;
    if (skull) { skull.geometry = paintVerts(shapeGeo(new THREE.SphereGeometry(R0, 112, 84), R0, fem), R0, skinM.color, fem); skull.scale.set(1, 1, 1); skull.material = hm; }
    /* máscara pintada: mesma forma, um pouco por fora */
    const R1 = R0 * 1.006, mg = shapeGeo(new THREE.SphereGeometry(R1, 112, 72, Math.PI / 2 - 1.1, 2.2, 0.95, 1.25), R1, fem);
    const m = new THREE.MeshStandardMaterial({ map: faceTex(L, (window.FACE && FACE.expr) || 'n'), transparent: true, depthWrite: false, roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mask = new THREE.Mesh(mg, m); mask.renderOrder = 3; head.add(mask); head.userData.faceMask = mask;
    for (const o of head.children) { const g = o.geometry; if (g && g.type === 'SphereGeometry' && g.parameters && Math.abs(g.parameters.radius - 0.112 * S) < 1e-4 && Math.abs(o.rotation.x + 0.42) < 1e-3) { o.rotation.x = -0.3; o.position.y = 0.016 * S; o.scale.set(0.97, 0.92, 1.03); } }
    return r; };
})();

;
/* PROTÓTIPO do cabelo — etapa 2 da nova definição (vale com FACE.style = 'C'; carregar DEPOIS de proto_face2.js).
   Calota que acompanha o crânio (volume no alto, fina na linha do cabelo, entradas e recorte das orelhas),
   mechas afiladas (franja, mechas do rosto, costas, rabo, trança) e textura pintada com fios, raiz e faixa de brilho. */
(function () {
  const V3 = THREE.Vector3, PI = Math.PI;
  const hx = h => { if (h == null) return '#3a2a1e'; if (typeof h === 'string') return h; if (typeof h === 'number') { const r = h & 255, g = (h >> 8) & 255, b = (h >> 16) & 255; return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0'); } if (h.getHexString) return '#' + h.getHexString(); if (h.hex != null) return hx(h.hex); return '#3a2a1e'; };
  const sm = (a, b, t) => { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerpKeys = (K, d) => { for (let i = 1; i < K.length; i++) if (d <= K[i][0]) { const [d0, v0] = K[i - 1], [d1, v1] = K[i]; return v0 + (v1 - v0) * sm(0, 1, (d - d0) / (d1 - d0)); } return K[K.length - 1][1]; };

  /* ---------- textura pintada (raiz no alto da imagem, pontas embaixo) ---------- */
  const TEX = new Map();
  function hairTex(hex) {
    if (TEX.has(hex)) return TEX.get(hex);
    const W = 512, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const c = new THREE.Color(hex), hs = {}; c.getHSL(hs);
    const col = (dl, ds = 0, a = 1) => { const k = new THREE.Color().setHSL(hs.h, Math.max(0, Math.min(1, hs.s + ds)), Math.max(0, Math.min(0.95, hs.l + dl))); return `rgba(${k.r * 255 | 0},${k.g * 255 | 0},${k.b * 255 | 0},${a})`; };
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col(-0.1)); g.addColorStop(0.5, col(0)); g.addColorStop(1, col(0.05)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    /* mechas largas (claras e escuras) */
    for (let i = 0; i < 70; i++) { const px = rnd() * W, w = 6 + rnd() * 16, dl = (rnd() - 0.5) * 0.14; x.strokeStyle = col(dl, 0, 0.5); x.lineWidth = w; x.beginPath(); x.moveTo(px, -10); x.bezierCurveTo(px + (rnd() - 0.5) * 20, H * 0.33, px + (rnd() - 0.5) * 20, H * 0.66, px + (rnd() - 0.5) * 16, H + 10); x.stroke(); }
    /* fios finos */
    for (let i = 0; i < 260; i++) { const px = rnd() * W, dl = (rnd() - 0.5) * 0.24; x.strokeStyle = col(dl, 0, 0.55); x.lineWidth = 1 + rnd() * 1.6; x.beginPath(); x.moveTo(px, rnd() * 40 - 20); x.quadraticCurveTo(px + (rnd() - 0.5) * 14, H * 0.5, px + (rnd() - 0.5) * 10, H - rnd() * 30); x.stroke(); }
    /* separação escura entre mechas */
    for (let i = 0; i < 40; i++) { const px = rnd() * W; x.strokeStyle = col(-0.16, 0, 0.6); x.lineWidth = 1.5 + rnd() * 2; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (rnd() - 0.5) * 12, H); x.stroke(); }
    /* faixa de brilho (anel) em pinceladas curtas */
    for (let i = 0; i < 220; i++) { const px = rnd() * W, py = H * 0.28 + Math.sin(px / W * PI * 6) * 10 + (rnd() - 0.5) * 34, len = 18 + rnd() * 40; x.strokeStyle = col(0.2 + rnd() * 0.12, -0.05, 0.22 + rnd() * 0.3); x.lineWidth = 1.5 + rnd() * 3; x.beginPath(); x.moveTo(px, py - len / 2); x.lineTo(px + (rnd() - 0.5) * 4, py + len / 2); x.stroke(); }
    const tx = new THREE.CanvasTexture(cv); tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 8; if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; TEX.set(hex, tx); return tx;
  }
  const MATC = new Map();
  function hairMat(hex) { if (MATC.has(hex)) return MATC.get(hex); const m = new THREE.MeshStandardMaterial({ map: hairTex(hex), roughness: 0.62, metalness: 0.02, side: THREE.DoubleSide }); MATC.set(hex, m); return m; }

  /* ---------- crânio (mesma forma da cabeça do rosto novo, só a parte de cima) ---------- */
  function scalp(n, fem) { const lo = Math.max(0, -n.y); let x = n.x * (fem ? 0.86 : 0.89), y = n.y * 1.07, z = n.z * 0.97; x *= 1 - (fem ? 0.34 : 0.24) * Math.pow(lo, 1.5); if (n.z < 0) z *= 1 - 0.18 * lo; return new V3(x, y, z); }

  /* ---------- calota ---------- */
  const lineK = (fem, line) => line || (fem ? [[0, 0.33], [0.2, 0.35], [0.4, 0.5], [0.52, 0.47], [0.66, 0.58], [0.85, 0.72], [1, 0.78]] : [[0, 0.37], [0.12, 0.34], [0.25, 0.38], [0.4, 0.5], [0.5, 0.45], [0.62, 0.55], [0.82, 0.74], [1, 0.8]]);
  function capGeo(R, o) {
    const fem = o.fem, segW = 72, segH = 40, g = new THREE.SphereGeometry(1, segW, segH, 0, 2 * PI, 0, PI), P = g.attributes.position, uv = g.attributes.uv;
    /* linha do cabelo (ângulo polar) conforme o ângulo a partir da testa (0 = frente, 1 = nuca), em frações de PI */
    const K = lineK(fem, o.line);
    for (let iy = 0; iy <= segH; iy++) for (let ix = 0; ix <= segW; ix++) { const i = iy * (segW + 1) + ix, u = ix / segW, t = iy / segH, phi = u * 2 * PI;
      let d = Math.abs(((phi - PI / 2) + 3 * PI) % (2 * PI) - PI) / PI;   /* 0 na testa, 1 na nuca */
      const wav = (o.wave == null ? 0.012 : o.wave) * (Math.sin(phi * 7) * 0.7 + Math.sin(phi * 13 + 1) * 0.3) * sm(0.6, 1, t), th = t * lerpKeys(K, d) * PI * (1 + wav), n = new V3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
      const ridge = Math.pow(0.5 + 0.5 * Math.cos(phi * (o.clumps || 15) + Math.sin(t * 3.2 + phi * 2) * 0.9), 2.2);
      const thick = (o.vol || 0.1) * Math.pow(1 - t, 0.75) + 0.035 + (o.ridge || 0.035) * ridge * t * (1 - sm(0.72, 0.97, t)) - 0.034 * sm(0.8, 1, t);
      const p = scalp(n, fem).multiplyScalar(R * (1 + thick)); P.setXYZ(i, p.x, p.y, p.z); uv.setXY(i, u * (o.rep || 3), 1 - t); }
    P.needsUpdate = true; g.computeVertexNormals(); return g;
  }

  /* ---------- mecha afilada ao longo de uma curva (pontos em unidades de R) ---------- */
  function lockGeo(R, pts, w0, o = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new V3(p[0] * R, p[1] * R, p[2] * R))), N = o.seg || 16, M = 8, flat = o.flat || 0.42, pos = [], uvs = [], idx = [];
    const ctr = new V3(0, (o.cy || 0) * R, 0);
    for (let i = 0; i <= N; i++) { const t = i / N, p = curve.getPoint(t), T = curve.getTangent(t).normalize();
      let out = p.clone().sub(ctr); out.addScaledVector(T, -out.dot(T)); if (out.lengthSq() < 1e-10) out.set(0, 0, 1); out.normalize();
      const B = new V3().crossVectors(T, out).normalize(), w = w0 * R * (o.prof ? o.prof(t) : (t < 0.22 ? 0.25 + 3.4 * t : 1 - 0.85 * Math.pow((t - 0.22) / 0.78, 1.3)));
      for (let j = 0; j <= M; j++) { const a = j / M * 2 * PI, q = p.clone().addScaledVector(B, Math.cos(a) * w).addScaledVector(out, Math.sin(a) * w * flat + w * flat * 0.4);
        pos.push(q.x, q.y, q.z); uvs.push((o.u0 || 0) + j / M * 0.35, 1 - t * 0.95); } }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  /* ponto na superfície do cabelo numa direção (ângulos em graus: az 0 = frente, + = esquerda do personagem; el 90 = topo) */
  function onHead(az, el, fem, out = 1.13) { const a = az * PI / 180, e = el * PI / 180, n = new V3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)); const p = scalp(n, fem).multiplyScalar(out); return [p.x, p.y, p.z]; }

  /* ---------- penteados ---------- */
  function addHair(head, L, S) {
    const R = 0.105 * S, fem = !!L.fem, hex = hx(L.hair), m = hairMat(hex), st = L.hairStyle || (fem ? 'long' : 'short');
    const style = fem && !['bun', 'short', 'braid', 'tail', 'curly', 'mohawk'].includes(st) ? 'long' : st;
    const add = (g, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); head.add(o); return o; };
    const lock = (pts, w, o) => add(lockGeo(R, pts, w, o));
    let hairline = null, vol = 0.1, ridge = 0.035;
    if (style === 'tail' || style === 'braid' || style === 'bun') hairline = fem ? [[0, 0.26], [0.12, 0.25], [0.25, 0.3], [0.4, 0.47], [0.52, 0.45], [0.66, 0.58], [0.85, 0.72], [1, 0.76]] : null;
    if (style === 'curly') { vol = 0.2; ridge = 0.07; }
    if (style === 'mohawk') return false;
    add(capGeo(R, { fem, line: hairline, vol, ridge, clumps: style === 'curly' ? 22 : 15 }));
    /* fios curtos penteados para trás saindo da linha do cabelo: deixam a borda macia e irregular */
    const edge = (a0, a1, step, len, w) => { const K = lineK(fem, hairline); let q = 0; for (let az = a0; az <= a1; az += step, q++) { const j = Math.sin(q * 12.9898) * 0.5 + 0.5, d = Math.abs(az) / 180, th = lerpKeys(K, d), el = 90 - th * 180; const sgn = Math.sign(az) || 1, back = az * (0.82 + 0.1 * j);
        lock([onHead(az, el - 2 - j * 2.5, fem, 1.02), onHead(az * 0.97, el + 6, fem, 1.065), onHead(back, el + len * (0.7 + 0.6 * j), fem, 1.1)], w * (0.8 + 0.4 * j), { seg: 10, flat: 0.35 }); } };
    if (fem && (style === 'tail' || style === 'bun' || style === 'braid')) { }
    if (style === 'long') { edge(-82, -34, 7, 18, 0.07); edge(34, 82, 7, 18, 0.07); }
    if (style === 'short') { edge(-80, -40, 8, 14, 0.07); edge(40, 80, 8, 14, 0.07); }
    /* mecha longa ondulada: desce em ondas, abre para as pontas e a ponta vira */
    const wavy = (az, el0, len, out, w, ph, o2 = {}) => { const a = az * PI / 180, sx = Math.sin(a), cz = Math.cos(a), pts = [onHead(az, el0, fem, 1.12), onHead(az, el0 - 32, fem, out)];
      const p1 = pts[1], n = 6; for (let j = 1; j <= n; j++) { const f = j / n, rr = 1 + 0.12 * f + 0.1 * f * f, amp = 0.11 * Math.sin(j * 1.5 + ph) * (0.4 + f);
        let x = p1[0] * rr + cz * amp, z = p1[2] * rr - sx * amp * 0.6, y = p1[1] - len * f; if (o2.front) { z = Math.max(z, 0.05); }
        if (j === n) { x += sx * 0.14; z += cz * 0.14; y += 0.1; } pts.push([x, y, z]); }
      lock(pts, w, { cy: -1.4, flat: 0.48, seg: 26, prof: t => t < 0.15 ? 0.3 + 4.6 * t : 1 + 0.15 * Math.sin(t * PI) - 0.8 * Math.pow((t - 0.15) / 0.85, 2.2) }); };
    if (style === 'short') {
      /* franja curta penteada para o lado (risca à esquerda do personagem) e costeletas */
      const F = fem ? [[-40, 1], [-20, 1.1], [0, 1.15], [20, 1.1], [38, 1]] : [[-46, 0.85], [-30, 1], [-14, 1.1], [2, 1.1], [18, 1], [34, 0.85]];
      F.forEach(([az, k], i) => { const r = onHead(az + 18, 70, fem, 1.14), mid = onHead(az - 2, 52, fem, 1.19), tip = onHead(az - 20, fem ? 36 : 35, fem, 1.13); lock([r, mid, tip], 0.27 * k, { cy: 0 }); });
      for (const s of [-1, 1]) { const a = onHead(s * 64, 38, fem, 1.1), b = onHead(s * 70, 18, fem, 1.08), c = onHead(s * 72, 4, fem, 1.05); lock([a, b, c], 0.13, {}); }
      if (fem) for (const s of [-1, 1]) { const a = onHead(s * 80, 20, fem, 1.1), b = onHead(s * 84, -20, fem, 1.12), c = [s * 0.95, -0.85, 0.1]; lock([a, b, c], 0.2, {}); }
    }
    if (style === 'long' || style === 'curly' && fem) {
      /* franja cortina aberta no meio */
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const r = onHead(s * (6 + k * 10), 70, fem, 1.14), mid = onHead(s * (24 + k * 12), 50, fem, 1.17), tip = onHead(s * (36 + k * 12), 26 - k * 8, fem, 1.13); lock([r, mid, tip], 0.25 - k * 0.025, {}); }
      /* mechas do rosto até o peito, onduladas */
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) wavy(s * (60 + k * 11), 44 - k * 4, 1.9 + k * 0.15, 1.17 + k * 0.025, 0.24, k * 1.3 + (s > 0 ? 0 : 2), { front: k < 2 });
      /* costas em duas camadas: a de dentro mais longa, a de fora mais curta e mais aberta */
      for (let k = 0; k < 10; k++) wavy(180 + (k - 4.5) * 17, 34, 3.0 - Math.abs(k - 4.5) * 0.06, 1.17, 0.3, k * 0.9);
      for (let k = 0; k < 7; k++) wavy(180 + (k - 3) * 24, 46, 2.3, 1.23, 0.3, k * 1.7 + 1);
    }
    if (fem && (style === 'tail' || style === 'bun' || style === 'braid')) for (let k = 0; k < 7; k++) { const az = (k - 3) * 15; lock([onHead(az, 54, fem, 1.08), onHead(az * 0.9, 64, fem, 1.14), onHead(az * 0.7, 80, fem, 1.15), onHead(180 - az * 0.7, 78, fem, 1.15), onHead(180 - az * 0.6, 58, fem, 1.13)], 0.22, { seg: 24, flat: 0.3 }); }
    if (style === 'tail') {
      const tie = [0, 0.55, -1.05]; add(new THREE.TorusGeometry(0.17 * R, 0.07 * R, 6, 12), 0, tie[1] * R, tie[2] * R).rotation.x = 1.1;
      for (let k = 0; k < 4; k++) { const sx = (k - 1.5) * 0.12; lock([[sx * 0.4, 0.62, -1.08], [sx, 0.4, -1.55], [sx * 1.6, -0.6, -1.75], [sx * 2, -1.9, -1.55]], 0.26, { cy: 0.2 }); }
      if (fem) for (const s of [-1, 1]) lock([onHead(s * 58, 40, fem, 1.12), onHead(s * 70, 0, fem, 1.14), [s * 0.88, -0.75, 0.32]], 0.1, {});
    }
    if (style === 'bun') {
      const b = add(capGeo(0.48 * R, { fem: false, vol: 0.02, ridge: 0.08, clumps: 12, line: [[0, 1], [1, 1]] }), 0, 0.82 * R, -0.78 * R); b.rotation.x = -0.6;
      if (fem) for (const s of [-1, 1]) lock([onHead(s * 58, 40, fem, 1.12), onHead(s * 70, 0, fem, 1.14), [s * 0.88, -0.75, 0.32]], 0.1, {});
    }
    if (style === 'braid') {
      for (let k = 0; k < 9; k++) { const y = -0.35 - k * 0.38, sz = 0.3 - k * 0.012; const e = add(capGeo(sz * R, { fem: false, vol: 0, ridge: 0.05, clumps: 8, line: [[0, 1], [1, 1]] }), (k % 2 ? 0.07 : -0.07) * R, y * R, (-1.05 - Math.min(k, 3) * 0.03) * R); e.scale.set(1, 1.35, 0.8); e.rotation.z = (k % 2 ? 0.45 : -0.45); }
      add(new THREE.TorusGeometry(0.17 * R, 0.07 * R, 6, 12), 0, -3.85 * R, -1.15 * R).rotation.x = PI / 2;
      for (let k = 0; k < 3; k++) lock([[0, -3.9, -1.15], [(k - 1) * 0.12, -4.3, -1.15], [(k - 1) * 0.2, -4.6, -1.1]], 0.12, { cy: -3 });
      if (fem) lock([onHead(-10, 70, fem, 1.14), onHead(-40, 50, fem, 1.17), onHead(-62, 18, fem, 1.13)], 0.22, {});
    }
    if (style === 'curly') {
      for (let k = 0; k < 26; k++) { const az = (k * 137.5) % 360, el = 10 + (k * 23) % 70; if (Math.abs(((az + 540) % 360) - 180) > 140 && el < 40) continue; const p = onHead(az, el, fem, 1.2), c = add(capGeo(0.3 * R, { fem: false, vol: 0, ridge: 0.12, clumps: 7, line: [[0, 1], [1, 1]] }), p[0] * R, p[1] * R, p[2] * R); c.rotation.set(k, k * 2, 0); }
    }
    head.userData.hairK = lineK(fem, hairline); head.userData.hairHex = hex;
    return true;
  }

  /* penugem: a pele logo abaixo da linha do cabelo puxa para a cor do cabelo, em degradê */
  function fuzz(head, L) { const K = head.userData.hairK; if (!K) return; const sk = head.children.find(o => o.geometry && o.geometry.attributes.color && o.material && o.material.vertexColors); if (!sk) return;
    const P = sk.geometry.attributes.position, Cc = sk.geometry.attributes.color, skin = sk.material.color, hc = new THREE.Color(head.userData.hairHex).convertSRGBToLinear(), n = new V3();
    const ratio = [hc.r / Math.max(0.02, skin.r), hc.g / Math.max(0.02, skin.g), hc.b / Math.max(0.02, skin.b)];
    for (let i = 0; i < P.count; i++) { n.fromBufferAttribute(P, i); n.set(n.x / (L.fem ? 0.86 : 0.89), n.y / 1.07, n.z / 0.97).normalize(); const th = Math.acos(Math.max(-1, Math.min(1, n.y))) / PI, az = Math.atan2(n.x, n.z), d = Math.abs(az) / PI, h = lerpKeys(K, d) * 0.985; if (th < h - 0.03 || th > h + 0.055) continue;
      const a = th < h ? 0.75 : 0.75 * (1 - sm(0, 0.055, th - h)); for (let c = 0; c < 3; c++) { const v = [Cc.getX(i), Cc.getY(i), Cc.getZ(i)][c]; const nv = v * (1 + (Math.min(1.2, ratio[c]) - 1) * a); if (c === 0) Cc.setX(i, nv); else if (c === 1) Cc.setY(i, nv); else Cc.setZ(i, nv); } }
    Cc.needsUpdate = true; }
  const HELM = ['greathelm', 'horned', 'winged', 'wolfhelm', 'wyvernhelm', 'owlhelm', 'boarhelm', 'sunhelm'], HOOD = ['hood', 'furhood', 'astralhood', 'antlerhood'];
  const _bh = buildHead;
  buildHead = function (head, L, S, skinM, accM, trimM) {
    const ok = window.FACE && (FACE.style === 'C' || L.newLook) && FACE.hair !== false && L.hair && !L.bald && !L.nihongami && !L.topknot && !HELM.includes(L.head) && !HOOD.includes(L.head) && L.hairStyle !== 'mohawk';
    if (!ok) return _bh.apply(this, arguments);
    const L2 = Object.assign(Object.create(Object.getPrototypeOf(L)), L, { bald: true });
    const r = _bh.call(this, head, L2, S, skinM, accM, trimM);
    addHair(head, L, S); fuzz(head, L);
    const st0 = L.hairStyle || (L.fem ? 'long' : 'short'); if (L.fem && !['bun', 'short', 'braid', 'tail'].includes(st0)) for (const o of head.children) { const g = o.geometry; if (g && g.type === 'SphereGeometry' && Math.abs(o.scale.x - 0.42) < 1e-3) o.visible = false; }
    for (const o of head.children) { const g = o.geometry; if (g && g.type === 'TorusGeometry' && g.parameters && Math.abs(g.parameters.radius - 0.105 * S) < 1e-4) o.scale.setScalar(1.07); }   /* tiara por cima do volume novo */
    return r; };
})();

;
/* PROTÓTIPO do corpo — etapa 3 da nova definição, versão 2 (vale com FACE.style = 'C' e FACE.body !== false).
   As juntas do boneco ficam exatamente onde estão (poses, gestos e afeto continuam valendo); só as formas mudam.
   v2: musculatura definida (peitoral, abdômen, oblíquos, dorsais, trapézio, lombar, bíceps, tríceps, quadríceps, panturrilha),
   sombra pintada nas dobras (cores nos vértices), anatomia feminina com seios e glúteos variados, biquíni e sunga moldados,
   10 tons de pele e uma "semente" por personagem (L.seed; no jogo, o id do NPC) que torna cada corpo único. */
(function () {
  const PI = Math.PI;
  const hx = h => (h && h.hex) || h || '#888888';
  /* curva contínua entre os anéis (Hermite com tangentes pelos vizinhos): sem os degraus/listras da interpolação trecho a trecho */
  const lerpK = (K, y) => { const n = K.length; if (y >= K[0][0]) return K[0].slice(1); if (y <= K[n - 1][0]) return K[n - 1].slice(1);
    let i = 1; while (i < n - 1 && y < K[i][0]) i++; const a = K[i - 1], b = K[i], h = b[0] - a[0], t = (y - a[0]) / h, t2 = t * t, t3 = t2 * t;
    const tg = (j, k) => { const p = K[Math.max(0, j - 1)], q = K[Math.min(n - 1, j + 1)]; return (q[k] - p[k]) / (q[0] - p[0]) * h; };
    const out = []; for (let k = 1; k < a.length; k++) { const m0 = i - 1 === 0 ? b[k] - a[k] : tg(i - 1, k), m1 = i === n - 1 ? b[k] - a[k] : tg(i, k); let v = (2 * t3 - 3 * t2 + 1) * a[k] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * b[k] + (t3 - t2) * m1; if (k < 3) v = Math.max(0, Math.min(v, Math.max(a[k], b[k]) * 1.08)); out.push(v); } return out; };
  const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
  /* calota elíptica: 1 no centro, 0 na borda; ryU/ryD = alturas acima/abaixo do centro; p < 1 deixa mais redonda */
  const capF = (x, y, cx, cy, rx, ryU, ryD, p) => { const dx = (x - cx) / rx, dy = (y - cy) / (y > cy ? ryU : ryD), q = dx * dx + dy * dy; return q >= 1 ? 0 : Math.pow(1 - q, p); };

  /* tubo de seção elíptica: K = [[y, rx, rz, zc], ...] de cima para baixo.
     o.bump(y,a,x,z) → deslocamento radial; o.shade(y,a,x,z) → escurecimento 0..1 (cor nos vértices); o.keep(y,a,x,z) → só esses triângulos */
  function tubeG(K, S, o = {}) {
    K = K.map(k => [k[0], k[1], k[2], k[3] || 0]);
    const lod = window.VN_LOD || 1, M = Math.max(10, Math.round((o.M || 28) * lod)), N = Math.max(8, Math.round((o.N || 30) * lod)), y0 = K[0][0], y1 = K[K.length - 1][0], pos = [], col = [], keep = [], idx = [], ex = o.sq || 0, off = o.off || 0;
    const put = (x, y, z, d, k, pc0) => { pos.push(x * S, y * S, z * S); const c = 1 - Math.min(0.6, d); let pc = pc0, w = 1; if (pc0 && pc0.c) { pc = pc0.c; w = pc0.w; }
      if (o.base || pc) { const Bs = o.base || pc, sk = [Bs.r * c * (1 + 0.05 * d), Bs.g * c * (1 - 0.12 * d), Bs.b * c * (1 - 0.22 * d)]; if (pc && w > 0) { const cc = 1 - Math.min(0.4, d * 0.6), sw = [pc.r * cc, pc.g * cc, pc.b * cc]; col.push(sk[0] + (sw[0] - sk[0]) * w, sk[1] + (sw[1] - sk[1]) * w, sk[2] + (sw[2] - sk[2]) * w); } else col.push(sk[0], sk[1], sk[2]); }
      else col.push(c * (1 + 0.05 * d), c * (1 - 0.12 * d), c * (1 - 0.22 * d)); keep.push(k); };
    put(0, y0 + 0.002, K[0][3], 0, !o.keep);
    for (let i = 0; i <= N; i++) { const y = y0 + (y1 - y0) * i / N, [rx, rz, zc] = lerpK(K, y);
      for (let j = 0; j < M; j++) { const a = j / M * 2 * PI, c = Math.cos(a), s = Math.sin(a), sq = 1 + ex * (Math.abs(c * s) * 2);
        let x = rx * c * sq, z = rz * s * sq; const b = (o.bump ? o.bump(y, a, x, z) : 0) + off, rr = Math.hypot(x, z) || 1; const x0 = x, z0 = z; x += x / rr * b; z += z / rr * b;
        put(x, y, z + zc, o.shade ? o.shade(y, a, x0, z0) : 0, o.keep ? o.keep(y, a, x0, z0) : true, o.paint ? o.paint(y, a, x0, z0) : null); } }
    put(0, y1 - 0.002, K[K.length - 1][3], 0, !o.keep);
    const last = pos.length / 3 - 1, tri = (a, b, c) => { if (keep[a] && keep[b] && keep[c]) idx.push(a, b, c); };
    for (let j = 0; j < M; j++) tri(0, 1 + (j + 1) % M, 1 + j);
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = 1 + i * M + j, b = 1 + i * M + (j + 1) % M, c2 = a + M, d = b + M; tri(a, b, c2); tri(b, d, c2); }
    for (let j = 0; j < M; j++) { const a = 1 + N * M + j, b = 1 + N * M + (j + 1) % M; tri(a, b, last); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (o.shade || o.base) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const GC = new Map(), G = (k, f) => GC.get(k) || (GC.set(k, f()), GC.get(k));
  const VCM = new Map(); const vcMat = (m, white) => { if (!m) return m; const k = m.uuid + (white ? 'w' : ''); let c = VCM.get(k); if (!c) { c = m.clone(); c.vertexColors = true; if (white) c.color.setRGB(1, 1, 1); VCM.set(k, c); } return c; };

  /* ---------- semente e medidas de cada personagem ---------- */
  const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rngOf = seed => { let a = seed || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const SKIN = ['#e4bea4', '#dbae8f', '#cf9e7b', '#c08d6a', '#b07d5a', '#986948', '#815538', '#6a452f', '#553626', '#422a1f'];
  window.BODY_SKINS = SKIN;
  function bodyParams(L) {
    const key = L.seed != null ? 's' + L.seed : JSON.stringify([hx(L.skin), hx(L.hair), hx(L.body), hx(L.legs), L.hairStyle, !!L.fem, L.armor]);
    const r = rngOf(hashS(key)), q = v => Math.round(v * 6) / 6, fem = !!L.fem;
    const P0 = { fem, skin: Math.floor(r() * SKIN.length),
      mus: q(fem ? 0.1 + 0.6 * r() : 0.2 + 0.8 * r()), fat: q(fem ? 0.1 + 0.65 * r() : 0.0 + 0.7 * r()), sh: q(r()), waist: q(r()), hip: q(r()), thigh: q(r()),
      bust: { size: q(r()), lift: q(r()), sep: q(r()), shape: q(r()), sag: q(r()) }, butt: { size: q(r()), lift: q(r()), round: q(r()) } };
    const U = P0.butt; U.size = 0.1 + 0.65 * U.size; P0.hip = Math.max(P0.hip, U.size * 0.7); U.round = Math.max(U.round, 0.4 + 0.3 * U.size);   /* sem glúteo grande em quadril estreito */
    if (L.bodyCfg && /^[0-9]{8}$/.test(L.bodyCfg)) { const d = L.bodyCfg.split('').map(c => +c / 9); P0.skin = +L.bodyCfg[0]; P0.mus = d[1]; P0.fat = d[2] * 0.8; P0.sh = d[3]; P0.waist = d[4]; P0.hip = d[5]; P0.bust.size = d[6]; U.size = 0.1 + 0.65 * d[7]; U.round = Math.max(U.round, 0.4 + 0.3 * U.size); }   /* ajuste escolhido pelo jogador na criação */
    return P0;
  }
  window.bodyParams = bodyParams;

  /* ---------- tronco (coordenadas da junta do peito) ---------- */
  function torsoSpec(P) {
    const { fem, mus, fat, sh } = P;
    const K = fem ? [[0.27, 0.03, 0.03, -0.005], [0.255, 0.058, 0.05, -0.005], [0.24, 0.098 + 0.008 * sh, 0.066, -0.006], [0.22, 0.138 + 0.01 * sh, 0.074, -0.005], [0.198, 0.163 + 0.012 * sh, 0.082, -0.003], [0.17, 0.168 + 0.014 * sh, 0.094, 0.002],   /* trapézio em rampa até o deltoide */ [0.08, 0.146 + 0.01 * sh + 0.008 * fat, 0.094 + 0.006 * fat, 0.008],
                    [-0.04, 0.12 + 0.012 * fat, 0.082 + 0.01 * fat, 0.01], [-0.17, 0.098 + 0.02 * fat - 0.008 * P.waist, 0.074 + 0.014 * fat, 0.014], [-0.24, 0.116 + 0.02 * fat + 0.008 * P.hip, 0.08 + 0.012 * fat, 0.01], [-0.3, 0.122 + 0.016 * fat + 0.01 * P.hip, 0.078 + 0.01 * fat, 0.006]]   /* o fim do tronco fica dentro do quadril */
                  : [[0.27, 0.035, 0.035, -0.006], [0.255, 0.066 + 0.008 * mus, 0.058, -0.006], [0.235, 0.125 + 0.012 * mus, 0.082, -0.008], [0.205, 0.195 + 0.02 * sh + 0.01 * mus, 0.098, -0.008], [0.16, 0.214 + 0.02 * sh + 0.012 * mus, 0.115 + 0.01 * mus, 0.0],
                    [0.06, 0.192 + 0.012 * sh + 0.01 * mus + 0.008 * fat, 0.12 + 0.008 * mus + 0.008 * fat, 0.01], [-0.06, 0.166 + 0.018 * fat, 0.108 + 0.02 * fat, 0.006 + 0.01 * fat], [-0.18, 0.15 + 0.028 * fat, 0.102 + 0.03 * fat, 0.004 + 0.012 * fat], [-0.3, 0.154 + 0.022 * fat, 0.106 + 0.02 * fat, 0.0]];
    const B = P.bust, sep = 0.058 + 0.02 * B.sep, br = 0.052 + 0.026 * B.size, bh = 0.034 + 0.068 * B.size, bcy = 0.045 + 0.035 * B.lift - 0.016 * B.sag, bU = br * 1.3, bD = br * (0.82 + 0.22 * B.sag), bp = 1.05 + 0.5 * B.shape;
    const def = fem ? 0.4 + 0.6 * mus - 0.4 * fat : 0.35 + 0.8 * mus - 0.6 * fat, absD = Math.max(0, def);
    const bump = (y, a, x, z) => { let b = 0; const s = Math.sin(a), fr = Math.max(0, s), bk = Math.max(0, -s), sd = Math.abs(Math.cos(a));
      let bb0 = 0; if (fem) { for (const sx of [-1, 1]) bb0 += bh * capF(x, y, sx * (sep + br * 0.12), bcy, br, bU, bD, bp) * Math.pow(fr, 0.6); }
      else { for (const sx of [-1, 1]) b += (0.01 + 0.022 * mus + 0.008 * fat) * capF(x, y, sx * 0.074, 0.098, 0.095, 0.07, 0.052, 1.15) * Math.pow(fr, 0.7); b -= 0.004 * g2(x, y, 0, 0.1, 0.009, 0.07) * fr; }
      b += (fem ? 0.005 : 0.004) * (g2(Math.abs(x), y, 0.075, 0.207 - 0.06 * (Math.abs(x) - 0.04), 0.05, 0.007)) * fr;   /* clavículas */
      /* abdômen: linha alba, gomos e barriga */
      b -= 0.004 * absD * g2(x, y, 0, -0.1, 0.007, 0.15) * fr;
      if (!fem) for (const ry of [0.0, -0.062, -0.124, -0.19]) for (const sx of [-1, 1]) b += 0.0065 * absD * g2(x, y, sx * 0.031, ry, 0.022, 0.022) * fr;
      else for (const sx of [-1, 1]) b += 0.003 * absD * g2(x, y, sx * 0.028, -0.12, 0.02, 0.09) * fr;
      b += (fem ? 0.022 : 0.034) * fat * g2(x, y, 0, -0.19, 0.12, 0.09) * fr;
      /* oblíquos e serrátil */
      for (const sx of [-1, 1]) { b += 0.008 * (0.3 + mus) * g2(x, y, sx * (fem ? 0.11 : 0.135), -0.17, 0.035, 0.07) * sd; if (!fem) for (let k = 0; k < 3; k++) b += 0.004 * mus * g2(x, y, sx * 0.16, 0.07 - k * 0.035, 0.02, 0.012) * sd * fr; }
      /* costas: dorsais, trapézio, omoplatas, coluna e lombar */
      for (const sx of [-1, 1]) { b += (fem ? 0.004 : 0.014) * (0.3 + mus) * g2(x, y, sx * 0.13, 0.05, 0.06, 0.1) * (bk + sd * 0.5);
        b += (fem ? 0.004 : 0.012) * (0.4 + mus) * g2(x, y, sx * 0.05, 0.218, 0.06, 0.03) * (0.4 + bk * 0.6);
        b += (fem ? 0.006 : 0.01) * g2(x, y, sx * 0.08, 0.13, 0.05, 0.06) * bk;
        b += (fem ? 0.003 : 0.008) * (0.3 + mus) * g2(x, y, sx * 0.032, -0.2, 0.02, 0.09) * bk;
        if (fem) b -= 0.004 * g2(x, y, sx * 0.03, -0.27, 0.012, 0.012) * bk; }
      b -= (fem ? 0.006 : 0.007) * g2(x, y, 0, -0.02, 0.011, 0.3) * bk;
      if (P.ar === 'plate') { b += 0.008 * g2(x, y, 0, 0.02, 0.011, 0.22) * fr; for (const yl of [-0.205, -0.255]) b -= 0.003 * g2(0, y, 0, yl, 1, 0.004); }
      return (b * (P.dm == null ? 1 : P.dm) + (P.ar === 'plate' ? b - b + (0.008 * g2(x, y, 0, 0.02, 0.011, 0.22) * fr) : 0) + bb0 * (P.bb == null ? 1 : P.bb)) * Math.min(1, Math.max(0, (y + 0.3) / 0.07)) + (y < -0.27 ? -0.004 * Math.min(1, (-0.27 - y) / 0.03) : 0); };
    const shade = (y, a, x, z) => { let d = 0; const s = Math.sin(a), fr = Math.max(0, s), bk = Math.max(0, -s), sd = Math.abs(Math.cos(a));
      if (fem) for (const sx of [-1, 1]) { d += 0.55 * (0.5 + B.size) * g2(x, y, sx * (sep + br * 0.12), bcy - bD * 0.92, br * 0.75, 0.011) * fr; d += 0.18 * capF(x, y, sx * (sep + br * 0.12), bcy - bD * 0.35, br * 0.9, br * 0.4, bD * 0.7, 1) * fr; }
      if (fem) d += 0.45 * B.size * g2(x, y, 0, bcy, 0.012, br * 0.7) * fr;
      else for (const sx of [-1, 1]) d += 0.32 * (0.3 + mus) * g2(x, y, sx * 0.076, 0.098 - 0.05, 0.07, 0.011) * fr;
      if (!fem) { d += 0.22 * absD * g2(x, y, 0, -0.1, 0.008, 0.16) * fr; for (const ry of [-0.031, -0.093, -0.157]) d += 0.16 * absD * g2(x, y, 0, ry, 0.05, 0.007) * fr; }
      else d += 0.12 * absD * g2(x, y, 0, -0.1, 0.008, 0.14) * fr;
      d += 0.2 * g2(x, y, 0, -0.02, 0.012, 0.3) * bk;
      for (const sx of [-1, 1]) d += 0.14 * g2(x, y, sx * 0.17, 0.14, 0.03, 0.04) * sd;   /* axilas */
      if (P.ar === 'plate') { d += 0.22 * (g2(0, y, 0, -0.205, 1, 0.004) + g2(0, y, 0, -0.255, 1, 0.004)); d -= 0.12 * g2(x, y, 0, 0.0, 0.012, 0.2) * fr; }
      if (P.ar === 'leather') { d += 0.35 * Math.exp(-(((sd - 0.985) / 0.008) ** 2)) + 0.22 * g2(0, y, 0, 0.17, 1, 0.003) * (0.3 + fr); }   /* placas: lâminas embaixo e quilha clara; couro: costuras dos lados e do peito */
      return d * (P.sm == null ? 1 : P.sm) + (P.ar === 'plate' || P.ar === 'leather' ? 0 : 0); };
    return { K, bump, shade, br, bcy, bD, sep };
  }
  const torsoG = (S, P, k, base, swim) => G('torso' + S + k + (base ? base.getHexString() : '') + (swim ? swim.getHexString() : ''), () => { const T = torsoSpec(P); const bandY = T.bcy - T.bD * 0.85;
    const paint = swim && P.fem ? (y, a, x) => { let w = Math.max(0, Math.min(1, (0.012 - Math.abs(y - bandY)) / 0.005)); if (Math.sin(a) > 0) for (const sx of [-1, 1]) { const q = capF(x, y, sx * (T.sep + T.br * 0.12), T.bcy, T.br * 1.02, T.br * 1.05, T.bD * 1.02, 1); w = Math.max(w, Math.min(1, q / 0.1)); if (y > T.bcy && y < 0.25) w = Math.max(w, Math.max(0, Math.min(1, (0.008 - Math.abs(x - sx * T.sep * 0.95)) / 0.004))); } return lingTorso(P, T, y, a, x, swimP(swim, w)); } : null;
    return tubeG(T.K, S, { bump: T.bump, shade: T.shade, base, paint, N: 80, M: 72, sq: P.fem ? 0.015 : 0.03 }); });
  /* biquíni: as taças seguem o seio, faixa embaixo e alças até o ombro */
  const bikiniTopG = (S, P, k) => G('bkt' + S + k, () => { const T = torsoSpec(P); const bandY = T.bcy - T.bD * 0.85;
    return tubeG(T.K, S, { bump: T.bump, off: 0.0035, N: 56, M: 48, sq: 0.015, keep: (y, a, x, z) => { const fr = Math.sin(a) > 0;
      if (Math.abs(y - bandY) < 0.011) return true; if (fr) for (const sx of [-1, 1]) { if (capF(x, y, sx * (T.sep + T.br * 0.12), T.bcy, T.br * 1.05, T.br * 1.1, T.bD * 1.05, 1) > 0) return true; if (Math.abs(x - sx * T.sep * 0.95) < 0.007 && y > T.bcy && y < 0.25) return true; } return false; } }); });

  /* ---------- roupa de banho: faixa de cima e recorte das pernas ---------- */
  const swimTop = (fem, front, ax) => fem ? (front ? -0.035 + 0.075 * Math.pow(ax, 1.2) : -0.01 + 0.035 * ax) : -0.065;
  const swimLeg = (fem, front, ax) => fem ? (front ? -0.155 + 0.19 * Math.pow(ax, 1.5) : -0.15 + 0.15 * ax) : -0.42;
  const inSwim = (fem, front, ax, y) => y < swimTop(fem, front, ax) && y > swimLeg(fem, front, ax);
  const swimBack = (ax, y) => { const top = -0.01 + 0.035 * ax, cr = -0.155; if (y > top + 0.01 || y < cr - 0.01) return 0; const t = Math.max(0, Math.min(1, (top - y) / (top - cr))), wb = 1 - 0.9 * Math.pow(t, 0.55); const a = (top - y) / 0.006, b = (wb - ax) / 0.04, c = (y - cr) / 0.006; return Math.max(0, Math.min(1, 0.5 + a * 0.5)) * Math.max(0, Math.min(1, 0.5 + b * 0.5)) * Math.max(0, Math.min(1, 0.5 + c * 0.5)); };
  const swimW = (fem, front, ax, y) => { if (fem && !front) return swimBack(ax, y); const e = fem ? 0.008 : 0.006, a = (swimTop(fem, front, ax) - y) / e, b = (y - swimLeg(fem, front, ax)) / e; return Math.max(0, Math.min(1, 0.5 + a * 0.5)) * Math.max(0, Math.min(1, 0.5 + b * 0.5)); };
  const swimP = (c, w) => w > 0.01 ? { c, w } : null;
  const LCM = new Map(), lcol = h => LCM.get(h) || (LCM.set(h, new THREE.Color(h).convertSRGBToLinear()), LCM.get(h));
  const cl = v => Math.max(0, Math.min(1, v));
  function lingTorso(P, T, y, a, x, sw) { const g = P.ling; if (!g) return sw; const c1 = lcol(g.c), c2 = lcol(g.c2), fr = Math.sin(a) > 0;
    if (g.t === 'corset') { const top = T.bcy - T.bD * 0.8; if (y < top + 0.006 && y > -0.32) { const lace = fr && Math.abs(Math.abs(x) - 0.012) < 0.0028, bone = Math.abs(Math.cos(a)) > 0.97 || (fr && Math.abs(Math.abs(x) - 0.06) < 0.0025); return { c: lace ? c2 : bone ? c2 : c1, w: cl((top + 0.006 - y) / 0.006) }; } }
    if (g.t === 'qipao') { const key = fr && capF(x, y, 0, T.bcy + 0.035, 0.03, 0.05, 0.055, 1) > 0.02; if (!key && y < 0.258) return { c: y > 0.236 || (fr && Math.abs(x - 0.05 * (0.236 - y) / 0.1) < 0.003 && y > 0.14) ? c2 : c1, w: cl((0.258 - y) / 0.005) }; }
    return sw; }
  function lingPelvis(P, y, a, x, sw) { const g = P.ling; if (!g) return sw; const c1 = lcol(g.c), c2 = lcol(g.c2);
    if (g.t === 'corset' && y < -0.012 && y > -0.05) return { c: c2, w: cl(Math.min(-0.012 - y, y + 0.05) / 0.004) };
    if (g.t === 'qipao') return { c: c1, w: 1 };
    return sw; }
  function lingLeg(P, y, a, x, sw, calf) { const g = P.ling; if (!g || !g.st) return sw; const c2 = lcol(g.c2), fr = Math.sin(a) > 0;
    if (calf) return { c: c2, w: 0.8 };
    if (y < -0.2) return { c: c2, w: y > -0.226 ? 1 : 0.8 };
    if (y < -0.03 && Math.abs(x) < 0.0045 && (fr || g.t === 'corset')) return { c: c2, w: 1 };   /* cinta-liga: alças na frente e atrás até a meia */
    return sw; }
  /* ---------- quadril (coordenadas da junta da coluna) ---------- */
  function pelvisSpec(P) {
    const { fem, fat, hip, mus } = P, U = P.butt;
    const K = fem ? [[0.045, 0.11 + 0.016 * fat + 0.008 * hip, 0.074 + 0.01 * fat, 0.007], [0.0, 0.128 + 0.018 * fat + 0.012 * hip, 0.083 + 0.011 * fat, 0.002], [-0.04, 0.168 + 0.02 * hip + 0.012 * fat, 0.092 + 0.01 * fat, -0.004], [-0.08, 0.18 + 0.02 * hip + 0.01 * fat, 0.096 + 0.008 * fat, -0.009], [-0.115, 0.181 + 0.018 * hip + 0.008 * fat, 0.093, -0.012], [-0.14, 0.172 + 0.014 * hip + 0.006 * fat, 0.086, -0.015], [-0.162, 0.13 + 0.01 * hip, 0.072, -0.019], [-0.176, 0.07, 0.056, -0.02], [-0.186, 0.026, 0.028, -0.016], [-0.192, 0.006, 0.006, -0.01]]   /* perfil redondo: lombar → glúteo mais saliente perto de −0,09 → dobra */
                  : [[0.03, 0.146 + 0.02 * fat, 0.1 + 0.018 * fat, 0], [0.0, 0.152 + 0.022 * fat, 0.104 + 0.02 * fat, 0.0], [-0.05, 0.158 + 0.018 * fat + 0.006 * hip, 0.104 + 0.016 * fat, -0.004 + 0.004 * fat], [-0.1, 0.158 + 0.012 * fat + 0.006 * hip, 0.1 + 0.008 * fat, -0.008], [-0.14, 0.136 + 0.006 * hip, 0.09, -0.01], [-0.165, 0.088, 0.068, -0.01], [-0.18, 0.034, 0.032, -0.006], [-0.186, 0.006, 0.006, -0.004]];
    const bs = fem ? 0.066 + 0.01 * hip : 0.06, ur = fem ? 0.078 + 0.014 * U.size : 0.08, uh = fem ? 0.012 + 0.024 * U.size + 0.004 * fat : 0.016 + 0.02 * mus, uy = (fem ? -0.08 - 0.014 * (1 - U.lift) : -0.085 - 0.01 * (1 - U.lift)), uU = ur * (fem ? 1.05 : 1.15), uD = ur * (fem ? 1.0 + 0.08 * (1 - U.lift) : 0.95 + 0.06 * (1 - U.lift)), uX = ur * 1.15, up = fem ? 0.9 + 0.35 * U.round : 1.45 + 0.45 * U.round;
    const GT = 0.012, GF = -0.176 - 0.008 * (1 - U.lift), GP = 0.6 - 0.14 * U.lift, GE = 0.5 + 0.25 * (1 - U.round), GA = 0.02 + 0.055 * U.size + 0.008 * fat;   /* perfil do glúteo: topo, dobra, pico, arredondado, volume */
    const bump = (y, a, x, z) => { let b = 0; const s = Math.sin(a), fr = Math.max(0, s), bk = Math.max(0, -s);
      let bu0 = 0; if (fem) { const t = (GT - y) / (GT - GF); if (t > 0 && t < 1) { const f = t < GP ? 0.5 - 0.5 * Math.cos(PI * t / GP) : Math.pow(Math.max(0, 1 - ((t - GP) / (1 - GP)) ** 2), GE); const ax = Math.abs(x), dx = ax > bs ? (ax - bs) / (uX * 1.05) : (bs - ax) / (bs * 2.2); bu0 = GA * f * Math.exp(-dx * dx * 1.2) * Math.pow(bk, 0.5); } }
      else for (const sx of [-1, 1]) bu0 += uh * capF(x, y, sx * bs, uy, uX, uU, uD, up) * Math.pow(bk, 0.5);
      if (y < -0.1) b -= (fem ? 0.007 : 0.006) * g2(x, y, 0, uy - 0.05, 0.006, 0.09) * bk;
      if (!fem && mus > 0.4) for (const sx of [-1, 1]) { const t = Math.max(0, Math.min(1, (-y - 0.04) / 0.16)), lx = sx * (0.1 - 0.07 * t); b -= 0.003 * (mus - 0.4) * g2(x, y, lx, -0.04 - 0.16 * t, 0.008, 0.08) * fr; }
      if (fem) b += 0.01 * fat * g2(x, y, 0, -0.12, 0.1, 0.06) * fr;
      return b * (P.dm == null ? 1 : P.dm) * Math.min(1, Math.max(0, -y / 0.07)) + bu0 * (P.bm == null ? 1 : P.bm) * (fem ? 1 : Math.min(1, Math.max(0, -y / 0.07))); };
    const shade = (y, a, x, z) => { let d = 0; const bk = Math.max(0, -Math.sin(a));
      for (const sx of [-1, 1]) d += 0.45 * (fem ? 0.5 + U.size : 0.4) * g2(x, y, sx * bs, fem ? GF + 0.012 : uy - uD * 0.92, uX * 0.75, 0.011) * bk;
      if (y < -0.1) d += 0.28 * g2(x, y, 0, uy - 0.05, 0.008, 0.09) * bk;
      if (P.ar === 'plate') for (const yl of [-0.01, -0.055, -0.1]) d += 0.3 * g2(0, y, 0, yl, 1, 0.0035);
      if (P.ar === 'leather') d += 0.3 * Math.exp(-(((Math.abs(Math.cos(a)) - 0.985) / 0.008) ** 2));
      return d * (P.sm == null ? 1 : P.sm); };
    return { K, bump, shade };
  }
  const pelvisG = (S, P, k, base, swim, pant) => G('pelv' + S + k + (base ? base.getHexString() : '') + (swim ? swim.getHexString() : '') + (pant ? 'p' + pant.getHexString() : ''), () => { const T = pelvisSpec(P);
    const paint = swim ? (y, a, x) => lingPelvis(P, y, a, x, swimP(swim, swimW(P.fem, Math.sin(a) > 0, Math.min(1, Math.abs(x) / 0.17), y))) : pant ? (y) => swimP(pant, Math.max(0, Math.min(1, (-0.1 - y) / 0.008 + 0.5))) : null;   /* com roupa: a túnica acaba no quadril e a calça aparece embaixo */
    return tubeG(T.K, S, { bump: T.bump, shade: T.shade, base, paint, N: 110, M: 144, sq: 0.04 }); });
  const bottomG = (S, P, k) => G('bot' + S + k, () => { const T = pelvisSpec(P);
    return tubeG(T.K, S, { bump: T.bump, off: 0.005, N: 34, M: 44, sq: 0.04, keep: P.fem ? (y, a, x) => { const s = Math.sin(a); return s > 0 ? y < -0.11 - 0.1 * Math.min(1, Math.abs(x) / 0.17) : y < -0.1 - 0.04 * Math.min(1, Math.abs(x) / 0.17); } : (y) => y < -0.065 }); });

  /* ---------- braços e pernas (ao longo de -Y a partir da junta; frente = +z) ---------- */
  const upperArmG = (S, P, robe, k) => G('ua' + S + k + robe, () => { const F = P.fem ? 0.8 : 1, m = P.mus * P.dm, f = P.fat;
    if (robe) return tubeG([[0.035, 0.0, 0.0], [0.02, 0.06 * F, 0.058 * F], [-0.05, 0.072 * F, 0.07 * F], [-0.25, 0.08 * F, 0.078 * F], [-0.31, 0.06 * F, 0.06 * F], [-0.33, 0, 0]], S);
    const bump = (y, a, x, z) => { const s = Math.sin(a), fr = Math.max(0, s), bk = Math.max(0, -s); return (P.fem ? 0.004 : 0.011) * (0.2 + m) * g2(0, y, 0, -0.13, 1, 0.06) * Math.pow(fr, 1.5) + (P.fem ? 0.004 : 0.009) * (0.2 + m) * g2(0, y, 0, -0.1, 1, 0.07) * Math.pow(bk, 1.5) + 0.006 * f * g2(0, y, 0, -0.14, 1, 0.08) * bk; };
    const shade = (y, a) => 0.12 * (0.3 + m) * g2(0, y, 0, -0.22, 1, 0.025) * Math.max(0, Math.sin(a)) * P.sm;
    return tubeG([...(P.fem ? [[0.06, 0.0, 0.0], [0.054, 0.024 * F, 0.024 * F], [0.042, 0.043 * F, 0.043 * F], [0.022, 0.057 * F, 0.056 * F]] : [[0.05, 0.0, 0.0], [0.035, 0.05 * F, 0.05 * F]]), [0.0, (0.064 + 0.006 * m) * F, (0.062 + 0.006 * m) * F], [-0.08, (0.058 + 0.004 * f) * F, (0.056 + 0.004 * f) * F], [-0.24, 0.045 * F, 0.044 * F], [-0.3, 0.042 * F, 0.041 * F], [-0.325, 0, 0]], S, { bump, shade, N: 30, M: 24 }); });
  const foreArmG = (S, P, robe, k) => G('fa' + S + k + robe, () => { const F = P.fem ? 0.8 : 1, m = P.mus * P.dm;
    if (robe) return tubeG([[0.03, 0, 0], [0.01, 0.065 * F, 0.062 * F], [-0.2, 0.08 * F, 0.075 * F], [-0.24, 0.07 * F, 0.065 * F], [-0.25, 0, 0]], S);
    const bump = (y, a) => (P.fem ? 0.003 : 0.008) * (0.2 + m) * g2(0, y, 0, -0.05, 1, 0.05) * Math.max(0, Math.cos(a + 0.6));
    return tubeG([[0.035, 0, 0], [0.015, 0.046 * F, 0.042 * F], [-0.05, (0.052 + 0.004 * m) * F, 0.045 * F], [-0.14, 0.042 * F, 0.036 * F], [-0.22, 0.031 * F, 0.027 * F], [-0.255, 0.029 * F, 0.025 * F], [-0.28, 0, 0]], S, { bump, N: 26, M: 22 }); });
  const thighG = (S, P, side, k, base, swim) => G('th' + S + k + side + (base ? base.getHexString() : '') + (swim ? swim.getHexString() : ''), () => { const { fem, fat: f, thigh: t } = P, m = P.mus * P.dm, inn = -side;
    const top = fem ? 0.084 + 0.01 * t + 0.01 * f : 0.082 + 0.008 * m + 0.006 * f;
    const bump = (y, a, x, z) => { const s = Math.sin(a), fr = Math.max(0, s), bk = Math.max(0, -s); let b = 0;
      b += (fem ? 0.004 : 0.01) * (0.2 + m) * g2(x, y, inn * 0.035, -0.33, 0.03, 0.05) * fr;   /* vasto medial */
      b += (fem ? 0.003 : 0.007) * (0.2 + m) * g2(x, y, -inn * 0.05, -0.16, 0.03, 0.1);       /* vasto lateral */
      b += (fem ? 0.004 : 0.006) * (0.2 + m) * g2(x, y, 0, -0.18, 0.04, 0.1) * bk;            /* posterior */
      if (fem) { b += (0.004 + 0.008 * f) * g2(x, y, -inn * 0.06, -0.08, 0.035, 0.06); b += (0.012 + 0.016 * P.butt.size) * capF(x, y, inn * 0.014, -0.1, 0.08, 0.06, 0.07, 1.2) * Math.pow(bk, 0.6); }   /* a parte de baixo do glúteo continua sobre o alto da coxa até a dobra */
      return b; };
    const shade = (y, a, x) => 0.1 * (0.3 + m) * g2(x, y, inn * 0.01, -0.25, 0.012, 0.1) * Math.max(0, Math.sin(a)) * P.sm;
    const paint = swim ? (y, a, x) => { const xs = x + side * 0.1, ys = y - 0.02; return lingLeg(P, y, a, x, swimP(swim, swimW(fem, Math.sin(a) > 0, Math.min(1, Math.abs(xs) / 0.17), ys)), false); } : null;
    const K = fem ? [[0.02, 0, 0], [-0.02, top * 0.6, top * 0.66], [-0.06, top * 0.76, top * 0.8, -0.012], [-0.09, top * 0.86, top * 0.88, -0.013], [-0.115, top * 0.93, top * 0.93, -0.008], [-0.15, top, top * 0.96, 0.004], [-0.2, top * 0.96, top * 0.92, 0.005], [-0.26, top * 0.86, top * 0.86, 0.006], [-0.36, 0.064, 0.066, 0.002], [-0.43, 0.054, 0.056, 0.002], [-0.47, 0.049, 0.05, 0.002], [-0.5, 0.032, 0.034], [-0.515, 0, 0]]
      : [[0.02, 0, 0], [-0.02, top * 0.62, top * 0.66], [-0.06, top * 0.8, top * 0.84, -0.008], [-0.1, top * 0.92, top * 0.93, -0.006], [-0.16, top, top * 0.97, 0.002], [-0.24, top * 0.98, 0.082 + 0.004 * f, 0.006], [-0.34, top * 0.9, 0.08 + 0.004 * f, 0.006], [-0.36, 0.06 + 0.012 * f, 0.062, 0.002], [-0.43, 0.055, 0.058], [-0.47, 0.05, 0.051], [-0.5, 0.032, 0.034], [-0.515, 0, 0]];
    return tubeG(K, S, { bump, shade, base, paint, N: 72, M: 64 }); });
  const calfG = (S, P, k, base) => G('ca' + S + k + (base ? base.getHexString() : ''), () => { const m = P.mus * P.dm;
    const bump = (y, a, x, z) => { const bk = Math.max(0, -Math.sin(a)); let b = 0; for (const sx of [-1, 1]) b += (P.fem ? 0.005 : 0.009) * (0.3 + m) * g2(x, y, sx * 0.02, -0.1, 0.025, 0.05) * bk; return b; };
    const shade = (y, a) => 0.12 * g2(0, y, 0, -0.17, 1, 0.03) * Math.max(0, -Math.sin(a)) * P.sm;
    return tubeG(P.fem ? [[0.045, 0, 0], [0.025, 0.042, 0.044], [0.0, 0.052, 0.054, 0.002], [-0.06, 0.052, 0.06, -0.008], [-0.12, 0.048, 0.056, -0.009], [-0.2, 0.039, 0.042, -0.004], [-0.3, 0.031, 0.033], [-0.37, 0.029, 0.031], [-0.4, 0, 0]]
      : [[0.045, 0, 0], [0.025, 0.045, 0.047], [0.0, 0.055, 0.057], [-0.07, 0.057, 0.062, -0.008], [-0.14, 0.052, 0.056, -0.006], [-0.28, 0.039, 0.041], [-0.37, 0.035, 0.037], [-0.4, 0, 0]], S, { bump, shade, N: 44, M: 32, base, paint: base && P.ling ? (y, a, x) => lingLeg(P, y, a, x, null, true) : null }); });
  const bootG = (S) => G('bt' + S, () => tubeG([[-0.15, 0.0, 0.0], [-0.16, 0.066, 0.07, -0.004], [-0.19, 0.064, 0.068, -0.006], [-0.3, 0.052, 0.056, -0.002], [-0.42, 0.05, 0.054], [-0.445, 0.0, 0.0]], S, { N: 20 }));
  const footG = (S) => G('ft' + S, () => { const g = new THREE.SphereGeometry(1, 24, 14), Pp = g.attributes.position;
    for (let i = 0; i < Pp.count; i++) { let x = Pp.getX(i), y = Pp.getY(i), z = Pp.getZ(i); const t = (z + 1) / 2; x *= 0.05 * (0.85 + 0.25 * Math.sin(PI * Math.min(1, t * 1.15))); y = (y < -0.35 ? -0.35 : y) * 0.05 * (1.15 - 0.55 * t); z *= 0.118; Pp.setXYZ(i, x * S, (y + 0.012) * S, (z + 0.045) * S); }
    g.computeVertexNormals(); return g; });

  /* ---------- mão ---------- */
  function buildHand(hand, side, m, S, fem) {
    const k = fem ? 0.9 : 1, grp = new THREE.Group(); hand.add(grp);
    const palm = new THREE.Mesh(G('palm' + S + k, () => { const g = new THREE.SphereGeometry(1, 16, 12); g.scale(0.021 * k * S, 0.04 * k * S, 0.036 * k * S); return g; }), m); palm.position.set(0, -0.022 * S, 0.002 * S); grp.add(palm);
    for (let f = 0; f < 4; f++) { const z = (-0.024 + f * 0.016) * k * S, len = [0.034, 0.042, 0.044, 0.04][f] * k;
      const g1 = new THREE.Mesh(G('fg' + S + len, () => new THREE.CapsuleGeometry(0.0085 * k * S, len * S * 0.55, 4, 8)), m); g1.position.set(-side * 0.003 * S, (-0.06 - len * 0.3) * S, z); g1.rotation.z = side * 0.18; grp.add(g1);
      const g2b = new THREE.Mesh(G('fg2' + S + len, () => new THREE.CapsuleGeometry(0.0078 * k * S, len * S * 0.4, 4, 8)), m); g2b.position.set(-side * 0.012 * S, (-0.06 - len * 0.85) * S, z); g2b.rotation.z = side * 0.55; grp.add(g2b); }
    const th = new THREE.Mesh(G('thumb' + S + k, () => new THREE.CapsuleGeometry(0.0105 * k * S, 0.026 * k * S, 4, 8)), m); th.position.set(-side * 0.01 * S, -0.032 * S, 0.034 * k * S); th.rotation.set(-0.7, 0, side * 0.35); grp.add(th);
    return grp;
  }

  const capR = (o, r) => o && o.geometry && o.geometry.type === 'CapsuleGeometry' && Math.abs(o.geometry.parameters.radius - r) < 1e-5;
  const m0 = o => (o && (o.userData.mat0 || o.material));
  const setG = (o, g, vc) => { if (!o.userData.mat0) o.userData.mat0 = o.material; o.geometry = g; o.scale.set(1, 1, 1); o.position.set(0, 0, 0); if (vc && g.attributes.color) o.material = vcMat(o.material); };
  const _bh = buildHumanoid;
  buildHumanoid = function (L, opts = {}) {
    const on = window.FACE && (FACE.style === 'C' || L.newLook) && FACE.body !== false;
    if (!on) return _bh.apply(this, arguments);
    const P = bodyParams(L);
    const lod0 = window.VN_LOD; if (L.ling || L.isHero) window.VN_LOD = 1;   /* moças da casa e heróis dos jogadores: resolução cheia (aparecem de perto) */
    try {
    { const bareX = L.armor === 'bare', plate = L.armor === 'plate', rb = L.armor === 'robe'; P.dm = bareX ? 1 : plate ? 0 : L.armor === 'leather' ? 0.15 : 0.08; P.sm = bareX ? 1 : plate ? 0.04 : 0.12; P.bm = bareX ? 1 : rb ? 0 : plate ? 0.3 : 0.6; P.bb = bareX ? 1 : plate ? 0.35 : 0.85;   /* sob a roupa: músculos quase somem, o volume do busto e do glúteo fica */ }
    P.ar = L.armor; if (L.ling && L.armor === 'bare' && P.fem) P.ling = L.ling; const PK = JSON.stringify(P);
    /* tom de pele: quem não tem um tom próprio (o padrão dos heróis ou L.skinAuto) recebe um da paleta pela semente */
    const L2 = Object.assign(Object.create(Object.getPrototypeOf(L)), L);
    if (L.skinAuto) L2.skin = SKIN[P.skin];
    if (L.armor === 'bare') L2.body = hx(L2.skin);
    const R = _bh.call(this, L2, opts);
    const S = opts.scale || 1, fem = P.fem, FW = fem ? 0.86 : 1, robe = L.armor === 'robe', bare = L.armor === 'bare';
    /* tronco e quadril */
    const swim = bare ? new THREE.Color(hx(L.trunks || '#2a3a5a')).convertSRGBToLinear() : null;
    const torso = R.chest.children.find(o => capR(o, 0.17 * S)); if (torso) { const base = torso.material.color.clone(); setG(torso, torsoG(S, P, PK, base, fem ? swim : null), false); torso.material = vcMat(torso.userData.mat0, true); }
    if (fem) for (const o of R.chest.children) if (o.geometry && o.geometry.type === 'SphereGeometry' && Math.abs(o.geometry.parameters.radius - 0.07 * S) < 1e-5 && o.position.z > 0.08 * S) o.visible = false;
    const belly = R.spine.children.find(o => capR(o, 0.14 * S)); if (belly) { const base = belly.material.color.clone(); const pant = !swim && !robe && L.armor !== 'plate' && L.legs ? new THREE.Color(hx(L.legs)).convertSRGBToLinear() : null; setG(belly, pelvisG(S, P, PK, base, swim, pant), false); belly.material = vcMat(belly.userData.mat0, true); if (robe) belly.scale.set(0.9, 1, 0.9); }
    for (const o of R.spine.children) { const g = o.geometry; if (g && g.type === 'CylinderGeometry' && Math.abs(g.parameters.radiusTop - 0.165 * S) < 1e-5) { if (robe) o.scale.set(0.182 / 0.165, 1, 0.15 / 0.165); else o.scale.set(((fem ? 0.152 : 0.17) + 0.02 * P.fat) / 0.165, 1, ((fem ? 0.108 : 0.116) + 0.02 * P.fat) / 0.165); } if (g && g.type === 'BoxGeometry' && Math.abs(o.position.y + 0.06 * S) < 1e-5) o.position.z = ((fem ? 0.1 : 0.118) + 0.02 * P.fat) * S; }
    if (fem) for (const o of R.spine.children) if (capR(o, 0.15 * S) && Math.abs(o.position.y + 0.25 * S) < 1e-5) o.visible = false;
    for (const o of R.chest.children) { const g = o.geometry; if (g && g.type === 'BoxGeometry' && o.position.z > 0.11 * S && o.position.z < 0.16 * S) o.position.z = Math.max(o.position.z, ((fem ? 0.112 + 0.05 * P.bust.size : 0.14) + 0.01 * P.fat) * S) + (Math.abs(o.position.y - 0.06 * S) < 1e-5 ? 0.012 * S : 0); }
    for (const o of R.spine.children) { const g = o.geometry; if (g && g.type === 'BoxGeometry' && o.position.z > 0.1 * S && o.position.z < 0.22 * S && Math.abs(o.position.y + 0.06 * S) > 1e-5) o.position.z = Math.max(o.position.z, ((fem ? 0.125 : 0.13) + 0.03 * P.fat) * S); }
    /* roupa de banho moldada */
    if (bare) {
      for (const o of R.spine.children) if (capR(o, 0.155 * S)) o.visible = false;
      if (fem) { for (const o of R.chest.children) { const g = o.geometry; if (!g) continue; if ((g.type === 'SphereGeometry' && Math.abs(g.parameters.radius - 0.074 * S) < 1e-5) || (g.type === 'CylinderGeometry' && Math.abs(g.parameters.radiusTop - 0.172 * S) < 1e-5 && Math.abs(o.position.y - 0.05 * S) < 1e-5)) o.visible = false; }
        for (const o of R.spine.children) { const g = o.geometry; if (g && g.type === 'CylinderGeometry' && Math.abs(g.parameters.radiusTop - 0.172 * S) < 1e-5) o.visible = false; } }
    }
    /* pescoço */
    const nk = R.neckJ.children.find(o => o.geometry && o.geometry.type === 'CylinderGeometry'); if (nk) { nk.geometry = G('neck' + S + fem + P.mus, () => tubeG([[0.1, 0.048 * FW, 0.05 * FW, -0.004], [0.04, (0.05 + 0.004 * P.mus) * FW, 0.052 * FW, 0], [-0.04, (0.058 + 0.008 * P.mus) * FW, 0.06 * FW, -0.006], [-0.07, 0.07 * FW, 0.068 * FW, -0.01]], S, { N: 12, M: 20 })); nk.position.set(0, 0.03 * S, 0); }
    /* braços */
    for (const [A, side] of [[R.A, -1], [R.B, 1]]) {
      const up = A.sh.children.find(o => o.geometry && o.geometry.type === 'CapsuleGeometry' && o.position.y < -0.1 * S);
      if (up) { setG(up, upperArmG(S, P, robe, PK), true); if (!A.sh.userData.delt) { const dr = (fem ? 0.053 : 0.058 + 0.006 * P.mus) * S, d = new THREE.Mesh(G('delt' + dr + fem, () => { const g = new THREE.SphereGeometry(dr, 20, 14); if (fem) g.scale(0.95, 0.92, 0.95); else g.scale(0.9, 0.8, 0.95); return g; }), m0(up)); d.position.set(-side * (fem ? 0.003 : 0.008) * S, (fem ? 0.002 : -0.004) * S, 0); A.sh.add(d); A.sh.userData.delt = d; } }
      const fa = A.el.children.find(o => o.geometry && o.geometry.type === 'CapsuleGeometry'); if (fa) setG(fa, foreArmG(S, P, robe, PK), true);
      { const el = new THREE.Mesh(G('elb' + S + FW, () => new THREE.SphereGeometry(0.041 * FW * S, 12, 10)), m0(fa || up)); A.el.add(el); }
      const hb = A.hand.children.find(o => o.geometry && o.geometry.type === 'SphereGeometry' && Math.abs(o.geometry.parameters.radius - 0.045 * S) < 1e-5);
      if (hb) { hb.visible = false; buildHand(A.hand, side, hb.material, S, fem); }
    }
    /* pernas */
    for (const [Lg, side] of [[R.LA, -1], [R.LB, 1]]) {
      const th = Lg.hp.children.find(o => capR(o, 0.075 * S)); if (th) { const base = th.material.color.clone(); setG(th, thighG(S, P, side, PK, base, swim), false); th.material = vcMat(th.userData.mat0, true); }
      const ca = Lg.kn.children.find(o => capR(o, 0.062 * S)); if (ca) { if (P.ling && P.ling.st && bare) { const base = ca.material.color.clone(); setG(ca, calfG(S, P, PK, base), false); ca.material = vcMat(ca.userData.mat0, true); } else setG(ca, calfG(S, P, PK), true); }
      const bt = Lg.kn.children.find(o => capR(o, 0.068 * S)); if (bt) { if (bare) bt.visible = false; else setG(bt, bootG(S), false); }
      if (bare) for (const o of Lg.hp.children) { const g = o.geometry; if (g && g.type === 'CylinderGeometry' && Math.abs(g.parameters.radiusTop - 0.088 * S) < 1e-5) o.visible = false; }   /* pernas da sunga antiga */
      { const knee = new THREE.Mesh(G('knee' + S, () => new THREE.SphereGeometry(0.047 * S, 12, 10)), m0(th || ca)); knee.position.set(0, 0.004 * S, 0.004 * S); Lg.kn.add(knee);
        if (bare || fem) { const pt = new THREE.Mesh(G('patela' + S, () => { const g = new THREE.SphereGeometry(0.028 * S, 16, 12); g.scale(1.1, 1.2, 0.4); return g; }), m0(th || ca)); pt.position.set(0, 0.006 * S, 0.044 * S); Lg.kn.add(pt); } }
      const ft = Lg.ft.children.find(o => o.geometry && o.geometry.type === 'BoxGeometry'); if (ft) setG(ft, footG(S), false);
    }
    R._body = P; R._lodFull = window.VN_LOD === 1 && lod0 !== 1;
    return R; } finally { window.VN_LOD = lod0; } };
  window.BODYK = { tubeG, torsoSpec, pelvisSpec, thighG, bodyParams, capF, g2, lerpK, G, vcMat, setG, capR, m0, hx };
})();

;
/* PROTÓTIPO das roupas sobre o corpo novo (etapa 4). Carregar DEPOIS de proto_body.js (usa window.BODYK).
   Os mesmos modelos de hoje, moldados ao corpo de cada personagem:
   - manto/vestido e saiote: caem do ponto mais largo do quadril (o tecido não entra nas curvas), alargam até a barra
     e ganham dobras que crescem para baixo; a barra dourada acompanha a borda;
   - cintos, faixas e obis: abraçam o corpo pela parte mais saliente da faixa;
   - colete (frente da camisa), tabardo e avental: painéis que seguem o peito e pendem do busto;
   - capa: inclina para passar por trás do glúteo. */
(function () {
  const BK = window.BODYK; if (!BK) return;
  const { torsoSpec, pelvisSpec, lerpK, G, vcMat, setG, hx } = BK, PI = Math.PI;
  const NA = 96;   /* ângulos usados para amostrar o corpo */

  /* pontos da superfície do corpo (coordenadas da coluna) numa altura y: tronco e quadril, mais as coxas abaixo da virilha */
  function bodyPts(P, y, legs) {
    const out = [], T = torsoSpec(P), Q = pelvisSpec(P);
    const ring = (K, bump, yy, sq, dy) => { if (yy > K[0][0] || yy < K[K.length - 1][0]) return; const [rx, rz, zc] = lerpK(K, yy);
      for (let j = 0; j < NA; j++) { const a = j / NA * 2 * PI, c = Math.cos(a), s = Math.sin(a), q = 1 + sq * Math.abs(c * s) * 2; let x = rx * c * q, z = rz * s * q; const b = bump(yy, a, x, z), rr = Math.hypot(x, z) || 1; x += x / rr * b; z += z / rr * b; out.push([x, z + zc]); } };
    ring(T.K, T.bump, y - 0.28, P.fem ? 0.015 : 0.03); ring(Q.K, Q.bump, y, 0.04);
    if (legs && y < -0.05) { const top = P.fem ? 0.084 + 0.01 * P.thigh + 0.01 * P.fat : 0.082 + 0.008 * P.mus + 0.006 * P.fat, k = Math.min(1, (-0.05 - y) / 0.1), r = top * (0.75 + 0.3 * k);
      for (const sx of [-1, 1]) for (let j = 0; j < 32; j++) { const a = j / 32 * 2 * PI; out.push([sx * 0.1 + r * Math.cos(a), r * 0.97 * Math.sin(a) - 0.004]); } }
    return out;
  }
  /* raio máximo do corpo por ângulo em volta de (0, zc), suavizado (o tecido não acompanha sulcos) */
  function polarMax(pts, zc, M) {
    const r = new Float32Array(M); for (const [x, z] of pts) { const a = Math.atan2(z - zc, x), j = ((Math.round(a / (2 * PI) * M) % M) + M) % M, d = Math.hypot(x, z - zc); if (d > r[j]) r[j] = d; }
    for (let j = 0; j < M; j++) if (!r[j]) { let k = 1; while (k < M && !r[(j + k) % M] && !r[(j - k + M) % M]) k++; r[j] = Math.max(r[(j + k) % M], r[(j - k + M) % M]); }
    const m = new Float32Array(M); for (let j = 0; j < M; j++) { let v = 0; for (let k = -3; k <= 3; k++) v = Math.max(v, r[(j + k + M) % M]); m[j] = v; }
    const o = new Float32Array(M); for (let j = 0; j < M; j++) { let v = 0; for (let k = -3; k <= 3; k++) v += m[(j + k + M) % M]; o[j] = v / 7; } return o;
  }
  /* malha em grade (linhas de cima para baixo, colunas em volta); fn(i, j) → [x, y, z, sombra] */
  function gridG(NR, NC, wrap, fn, S, skip) {
    const pos = [], col = [], idx = [], C = wrap ? NC : NC + 1;
    for (let i = 0; i <= NR; i++) for (let j = 0; j < C; j++) { const [x, y, z, d] = fn(i, j); pos.push(x * S, y * S, z * S); const c = 1 - Math.min(0.55, d || 0); col.push(c * (1 + 0.04 * (d || 0)), c, c * (1 - 0.08 * (d || 0))); }
    for (let i = 0; i < NR; i++) for (let j = 0; j < (wrap ? NC : NC); j++) { const a = i * C + j, b = i * C + (j + 1) % C, c2 = a + C, d = b + C; if (!wrap && j === NC) continue; if (skip && skip(i, j)) continue; idx.push(a, b, c2, b, d, c2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }

  /* saia/manto: de y0 até y1 (coluna); o raio cai do mais largo acima (pende), alarga com 'fl' e ganha 'nf' dobras */
  function skirtProfile(P, y0, y1, o) {
    const lod = window.VN_LOD || 1, M = Math.round((o.M || 120) * lod / 4) * 4, NR = Math.round((o.N || 60) * lod), zc = o.zc != null ? o.zc : -0.008, rows = [];
    let prev = null; for (let i = 0; i <= NR; i++) { const y = y0 + (y1 - y0) * i / NR, r = polarMax(bodyPts(P, y, true), zc, M);
      const cur = new Float32Array(M); for (let j = 0; j < M; j++) cur[j] = Math.max(r[j] + (o.clear || 0.012), prev ? prev[j] : 0);
      rows.push({ y, r: cur }); prev = cur; }
    /* alargamento a partir do ponto mais largo do quadril */
    let yH = y0, best = 0; for (const R of rows) { let w = 0; for (let j = 0; j < M; j++) w += R.r[j]; if (w > best) { best = w; yH = R.y; } }
    for (const R of rows) { const t = Math.max(0, (yH - R.y) / (yH - y1 || 1)), f = (o.fl || 0) * Math.max(0, yH - R.y) * (0.6 + 0.4 * t);
      for (let j = 0; j < M; j++) { const a = j / M * 2 * PI, side = 0.75 + 0.25 * Math.abs(Math.cos(a)); R.r[j] += f * side; } R.t = t; }
    return { rows, M, NR, zc, yH };
  }
  function skirtG(P, y0, y1, o, S, dy, zs, skip) {
    const sp = skirtProfile(P, y0, y1, o), nf = o.nf || 12, amp = o.amp || 0.012, ph = o.ph || 0.3;
    return { sp, g: gridG(sp.NR, sp.M, true, (i, j) => { const R = sp.rows[i], a = j / sp.M * 2 * PI, t = R.t, w = 0.5 - 0.5 * Math.cos(nf * a + ph + 0.6 * Math.sin(3 * a)), r = R.r[j] + amp * Math.pow(t, 1.2) * (w - 0.35) + (o.wave || 0) * t * t * Math.sin(5 * a + 1);
      return [r * Math.cos(a), R.y + (dy || 0), (sp.zc + r * Math.sin(a)) / (zs || 1), 0.32 * Math.pow(t, 1.1) * (1 - w) + (o.top && i < 3 ? 0.1 * (3 - i) / 3 : 0)]; }, S, skip ? (i, j) => skip(sp.rows[i], j / sp.M * 2 * PI, i) : null) };
  }
  /* barra que acompanha a borda de baixo de uma saia: tubo fino em volta da elipse final */
  function hemG(sp, S, rad, dy, zs, rotX) {
    const R = sp.rows[sp.rows.length - 1], pts = []; for (let j = 0; j <= sp.M; j++) { const a = (j % sp.M) / sp.M * 2 * PI, r = R.r[j % sp.M] + rad * 0.6; pts.push(rotX ? new THREE.Vector3(r * Math.cos(a) * S, (sp.zc + r * Math.sin(a)) / zs * S, 0) : new THREE.Vector3(r * Math.cos(a) * S, (R.y + dy) * S, (sp.zc + r * Math.sin(a)) / zs * S)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), sp.M, rad * S, 6, true);
  }
  /* faixa (cinto, obi): em volta do corpo na altura yc, pelo ponto mais saliente da faixa */
  function bandG(P, yc, h, off, S) { const M = 96, zc = -0.004; let r = new Float32Array(M); for (let k = 0; k <= 4; k++) { const rr = polarMax(bodyPts(P, yc - h / 2 + h * k / 4, false), zc, M); for (let j = 0; j < M; j++) r[j] = Math.max(r[j], rr[j]); }
    return gridG(3, M, true, (i, j) => { const a = j / M * 2 * PI, y = yc + h / 2 - h * i / 3, rr = r[j] + off + (i === 0 || i === 3 ? -0.002 : 0); return [rr * Math.cos(a), y, zc + rr * Math.sin(a), i === 3 ? 0.18 : 0]; }, S); }
  /* painel da frente (colete, tabardo, avental): de yT a yB, meia-largura w(y); pende do busto para baixo */
  function panelG(P, yT, yB, w, off, S, extra) {
    const NR = Math.round(48 * (window.VN_LOD || 1)), NC = Math.round(24 * (window.VN_LOD || 1)), zc = -0.004, M = 144, rows = []; let prev = null;
    for (let i = 0; i <= NR; i++) { const y = yT + (yB - yT) * i / NR, r = polarMax(bodyPts(P, y, true), zc, M), ww = w(y), row = [];
      for (let j = 0; j <= NC; j++) { const x = -ww + 2 * ww * j / NC; let z = 0; for (let k = 0; k < M; k++) { const a = k / M * 2 * PI; if (Math.sin(a) <= 0) continue; const px = r[k] * Math.cos(a); if (Math.abs(px - x) < 0.012) z = Math.max(z, zc + r[k] * Math.sin(a)); }
        if (extra) z = Math.max(z, extra(x, y)); if (prev) z = Math.max(z, prev[j] - 0.0); row.push(z); }
      rows.push({ y, ww, row }); prev = row; }
    return gridG(NR, NC, false, (i, j) => { const R = rows[i], jj = NC - j, x = -R.ww + 2 * R.ww * jj / NC, e = Math.abs(jj / NC - 0.5) * 2; return [x, R.y, R.row[jj] + off - 0.002 * e * e, 0.08 * e * e]; }, S);
  }
  const ofType = (o, t) => o && o.geometry && o.geometry.type === t;
  const near = (a, b) => Math.abs(a - b) < 1e-4;

  const _bh = buildHumanoid;
  buildHumanoid = function (L, opts = {}) {
    const R = _bh.apply(this, arguments); const P = R._body; if (!P) return R; const lod0 = window.VN_LOD; if (L.ling || L.isHero) window.VN_LOD = 1;
    const S = opts.scale || 1, robe = L.armor === 'robe', bare = L.armor === 'bare';
    try {
      /* manto/vestido: a malha nova fica no mesmo objeto (o laço de animação continua mexendo nela) */
      if (R.robe && !bare) { const fur = !!(L.furisode || L.kimonoC), zs = 0.82;
        const { sp, g } = skirtG(P, -0.04, -0.86, { fl: fur ? 0.02 : P.fem ? 0.16 : 0.13, nf: fur ? 8 : 13, amp: fur ? 0.006 : 0.013, clear: 0.013, top: 1, wave: fur ? 0 : 0.004 }, S, 0.04, zs);
        R.robe.geometry = g; R.robe.material = vcMat(R.robe.material, false); R.robeW = 1; R._robeSp = sp;
        if (R.hem) R.hem.geometry = G('rhem' + JSON.stringify(P) + fur + S, () => hemG(sp, S, 0.016, 0, zs, true)); }
      /* saiote feminino (de batalha, por cima da calça) e a barra dourada */
      const sk = R.spine.children.find(o => ofType(o, 'CylinderGeometry') && near(o.geometry.parameters.radiusTop, 0.17 * S) && near(o.geometry.parameters.radiusBottom, 0.255 * S));
      if (sk) { const { sp, g } = skirtG(P, -0.1, -0.43, { fl: 0.3, nf: 11, amp: 0.01, clear: 0.012 }, S); setG(sk, g, false); sk.material = vcMat(sk.material, false);
        const hm = R.spine.children.find(o => ofType(o, 'CylinderGeometry') && near(o.geometry.parameters.radiusTop, 0.257 * S)); if (hm) { setG(hm, hemG(sp, S, 0.011, 0, 1, false), false); } R._skirtSp = sp; }
      /* faixas em volta do corpo: cinto, obi, laço do avental, faixa do gi, cós da roupa de banho */
      const bandR = [0.165, 0.172, 0.178, 0.185, 0.188];
      for (const o of R.spine.children) { const g = o.geometry; if (!ofType(o, 'CylinderGeometry')) continue; const p = g.parameters; if (!near(p.radiusTop, p.radiusBottom) || p.height > 0.2) continue; const k = bandR.findIndex(r => near(p.radiusTop, r * S)); if (k < 0) continue;
        if (robe && k === 0) { const y = o.position.y / S; setG(o, bandG(P, y, p.height / S, 0.022, S), false); o.position.y = 0; continue; }
        const y = o.position.y / S; setG(o, bandG(P, y, p.height / S, 0.006 + 0.003 * k, S), false); }
      /* fivela e peças da frente da cintura: na superfície da faixa */
      for (const o of R.spine.children) { if (!ofType(o, 'BoxGeometry')) continue; const y = o.position.y / S; if (y < -0.12 || y > 0.0 || o.position.z <= 0) continue; const r = polarMax(bodyPts(P, y, false), -0.004, 96); o.position.z = (-0.004 + r[24] + 0.012 + (robe ? 0.016 : 0)) * S; }
      /* colete: a frente da camisa vira um painel no peito */
      if (L.armor === 'vest') { const ap = R.chest.children.find(o => ofType(o, 'BoxGeometry') && near(o.geometry.parameters.width, 0.22 * S) && near(o.geometry.parameters.height, 0.5 * S));
        if (ap) { const g = panelG(P, 0.4, -0.08, y => 0.07 + 0.025 * Math.max(0, Math.min(1, (y + 0.08) / 0.4)), 0.004, S); setG(ap, g, false); ap.position.y = -0.28 * S; ap.material = vcMat(ap.material, false); } }
      /* tabardo da armadura e o emblema */
      if (L.armor === 'plate') { const tab = R.chest.children.find(o => ofType(o, 'BoxGeometry') && near(o.geometry.parameters.width, 0.16 * S) && near(o.geometry.parameters.height, 0.5 * S));
        if (tab) { const g = panelG(P, 0.45, -0.3, y => 0.078 + (y < -0.05 ? 0.012 * (-0.05 - y) / 0.25 : 0), 0.008, S); setG(tab, g, false); tab.position.y = -0.28 * S; tab.material = vcMat(tab.material, false);
          const em = R.chest.children.find(o => ofType(o, 'BoxGeometry') && near(o.geometry.parameters.width, 0.07 * S)); if (em) { const r = polarMax(bodyPts(P, 0.34, true), -0.004, 96); em.position.z = (-0.004 + r[24] + 0.016) * S; } } }
      /* avental: peitilho e saia seguindo o corpo (ou o manto) */
      if (L.apron) { const am = R.chest.children.find(o => ofType(o, 'BoxGeometry') && near(o.geometry.parameters.width, 0.2 * S) && near(o.geometry.parameters.height, 0.2 * S));
        if (am) { setG(am, panelG(P, 0.39, 0.16, () => 0.085, 0.007, S), false); am.position.y = -0.28 * S; am.material = vcMat(am.material, false); }
        const ask = R.spine.children.find(o => ofType(o, 'BoxGeometry') && near(o.geometry.parameters.width, 0.3 * S) && near(o.geometry.parameters.height, 0.42 * S));
        if (ask) { const sp = R._robeSp || R._skirtSp, robeZ = sp ? (x, y) => { const yy = robe ? y : y; const rr = sp.rows.find(q => q.y <= yy) || sp.rows[sp.rows.length - 1]; let best = 0; for (let j = 0; j < sp.M; j++) { const a = j / sp.M * 2 * PI, px = rr.r[j] * Math.cos(a); if (Math.sin(a) > 0 && Math.abs(px - x) < 0.015) best = Math.max(best, sp.zc + rr.r[j] * Math.sin(a) + 0.006); } return best; } : null;
          setG(ask, panelG(P, -0.06, -0.5, y => 0.13 + 0.05 * Math.max(0, (-0.06 - y) / 0.44), 0.008, S, robeZ), false); ask.material = vcMat(ask.material, false); }
        for (const o of R.spine.children) if (ofType(o, 'SphereGeometry') && o.position.z < -0.1 * S && Math.abs(o.position.y + 0.08 * S) < 1e-4) { const r = polarMax(bodyPts(P, -0.08, false), -0.004, 96); o.position.z = (-0.004 - r[72] - 0.02 - (robe ? 0.02 : 0)) * S; } }
      /* lingerie da Casa de Veludo: saia transparente com fendas, robe aberto, saia do qipao, cinto dourado e gargantilha */
      const g = P.ling; if (g) { const col = h => new THREE.Color(h).convertSRGBToLinear(), sheer = (h, op) => new THREE.MeshStandardMaterial({ color: col(h), transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, roughness: 0.55, vertexColors: true });
        const gold = new THREE.MeshStandardMaterial({ color: col('#e2b74e'), metalness: 0.85, roughness: 0.3 });
        const add = (parent, geo, m) => { const o = new THREE.Mesh(geo, m); parent.add(o); return o; };
        const angD = (a, b) => { let d = Math.abs(a - b) % (2 * PI); return d > PI ? 2 * PI - d : d; };
        if (g.t === 'harem' || g.t === 'dance') { const front = PI / 2;
          const { g: sg } = skirtG(P, -0.11, -0.84, { fl: 0.14, nf: 9, amp: 0.016, clear: 0.01 }, S, 0, 1, (row, a) => row.y < -0.2 && (angD(a, front - 0.75) < 0.12 || angD(a, front + 0.75) < 0.12 || angD(a, front) < (g.t === 'dance' ? 0.0 : 0.1)));
          add(R.spine, sg, sheer(g.c2 || g.c, 0.42)); add(R.spine, bandG(P, -0.105, 0.026, 0.006, S), gold);
          for (let k = 0; k < 9; k++) { const a = front - 0.9 + k * 0.225, r = polarMax(bodyPts(P, -0.12, false), -0.004, 96)[Math.round(a / (2 * PI) * 96) % 96] + 0.008; const c = add(R.spine, new THREE.CylinderGeometry(0.011 * S, 0.011 * S, 0.003 * S, 10), gold); c.position.set(r * Math.cos(a) * S, -0.135 * S, (-0.004 + r * Math.sin(a)) * S); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); } }
        if (g.t === 'robe') { const front = PI / 2; const { g: rg } = skirtG(P, 0.46, -0.84, { fl: 0.12, nf: 11, amp: 0.012, clear: 0.014 }, S, 0, 1, (row, a) => angD(a, front) < 0.42 + 0.25 * Math.max(0, Math.min(1, (0.2 - row.y) / 0.3)));
          add(R.spine, rg, sheer(g.c, 0.36)); }
        if (g.t === 'qipao') { const { sp, g: qg } = skirtG(P, -0.12, -0.32, { fl: 0.025, nf: 7, amp: 0.005, clear: 0.005 }, S, 0, 1, (row, a) => row.y < -0.16 && (angD(a, 0) < 0.13 || angD(a, PI) < 0.13));
          add(R.spine, qg, new THREE.MeshStandardMaterial({ color: col(g.c), roughness: 0.35, metalness: 0.1, vertexColors: true, side: THREE.DoubleSide })); add(R.spine, hemG(sp, S, 0.005, 0, 1, false), gold); }
        if (R.neckJ) { const ch = add(R.neckJ, new THREE.TorusGeometry(0.05 * S * (P.fem ? 0.86 : 1) + 0.004 * S, 0.0055 * S, 6, 28), new THREE.MeshStandardMaterial({ color: col(g.c2), roughness: 0.6 })); ch.rotation.x = PI / 2; ch.position.y = 0.035 * S; ch.scale.set(1, 1.04, 1);
          const gem = add(R.neckJ, new THREE.SphereGeometry(0.007 * S, 10, 8), gold); gem.position.set(0, 0.028 * S, 0.049 * S); } }
      /* ombreiras: em vez da esfera, três lâminas sobrepostas descendo pelo ombro */
      for (const A of [R.A, R.B]) { if (!A || !A.sh) continue; const pd = A.sh.children.find(o => ofType(o, 'SphereGeometry') && near(o.geometry.parameters.radius, 0.11 * S)); if (!pd || pd.userData.lames) continue; pd.userData.lames = 1;
        const lame = k => G('lame' + k + S, () => { const g = new THREE.SphereGeometry((0.1 - 0.01 * k) * S, 24, 10, 0, 2 * PI, 0, PI * (0.5 + 0.04 * k)); return g; });
        pd.material = pd.material.clone(); pd.material.side = THREE.DoubleSide; pd.geometry = lame(0); pd.scale.set(1.1, 0.82, 1.0); pd.position.y = 0.0; for (let k = 1; k < 3; k++) { const m = new THREE.Mesh(lame(k), pd.material); m.position.y = -0.02 * k * S / 0.82; m.scale.set(1 + 0.03 * k, 1, 1 + 0.02 * k); pd.add(m); }
        const rim = new THREE.Mesh(G('lrim' + S, () => new THREE.TorusGeometry(0.1 * S, 0.005 * S, 5, 26)), pd.material); rim.rotation.x = PI / 2; rim.position.y = 0; pd.add(rim); }
      /* capa: inclina para trás para passar pelo glúteo */
      if (R.cape) { let back = 0; for (const y of [-0.05, -0.08, -0.11, -0.14]) { const r = polarMax(bodyPts(P, y, false), 0, 96); back = Math.max(back, r[72]); } const need = back + 0.02 - 0.13, dy = 0.24 + 0.3 + 0.1; if (need > 0) R.cape.rotation.x = Math.max(R.cape.rotation.x, Math.atan(need / dy)); }
    } catch (e) { console.warn('roupas novas', e); }
    window.VN_LOD = lod0; return R;
  };
  window.CLOTHK = { bodyPts, polarMax, skirtProfile, panelG, bandG };
})();

;
/* Ligações do visual novo com o jogo. */
/* visual novo para todos os personagens (VISUAL_NOVO em config.js, ligado desde a v1.157.0; ?visual=antigo desliga), com menos polígonos nas qualidades baixas */
if (typeof VISUAL_NOVO !== 'undefined' && VISUAL_NOVO) { FACE.style = 'C'; FACE.hair = true; FACE.body = true; window.VN_LOD = [0.3, 0.42, 0.55][typeof VISUAL_Q !== 'undefined' ? VISUAL_Q : 2]; }
/* TESTE: moças da Casa de Veludo de biquíni com o visual novo (rosto, cabelo e corpo); a cor do biquíni vem da roupa de cada uma */
(function () {
  const GIRLS = new Set(['vl_comp1', 'vl_comp2', 'vl_comp3', 'vl_comp4', 'vl_dancer1', 'vl_dancer2']);
  const LING = { vl_comp1: { t: 'corset', c: '#8a1a34', c2: '#120c10', st: 1, sw: '#120c10' }, vl_comp2: { t: 'robe', c: '#6a3a9a', c2: '#2a1438', st: 1, sw: '#2a1438' }, vl_comp3: { t: 'qipao', c: '#16705a', c2: '#e2b74e', sw: '#16705a' }, vl_comp4: { t: 'harem', c: '#d4a52a', c2: '#7a1a3a', sw: '#d4a52a' },
    vl_dancer1: { t: 'dance', c: '#1a5a8a', c2: '#3a8ac8', sw: '#1a5a8a' }, vl_dancer2: { t: 'dance', c: '#c87a1a', c2: '#e8a040', sw: '#c87a1a' } };
  const hexOf = h => (h && h.hex) || (typeof h === 'string' ? h : '#b03a5a');
  if (typeof npcLookOf === 'function') { const _nl = npcLookOf; npcLookOf = function (kind, nid) { const L = _nl(kind, nid); if (!GIRLS.has(kind)) return L;
    Object.assign(L, { newLook: true, seed: nid || kind, armor: 'bare', trunks: hexOf(L.body), barefoot: true, cape: false, weapon: null, shield: null, quiver: false });
    if (typeof VISUAL_NOVO !== 'undefined' && VISUAL_NOVO && LING[kind]) { const q = LING[kind]; L.ling = q; L.trunks = q.sw || q.c; }   /* com o visual novo ligado: as roupas sensuais da casa */
    return L; }; }
})();
/* visual novo ligado: cada NPC com corpo único (semente = id) e a família nobre com o mesmo tom de pele (pequenas diferenças entre parentes);
   quem casou com alguém da casa (cônjuges), guardas e criados mantêm a própria pele */
(function () {
  if (typeof VISUAL_NOVO === 'undefined' || !VISUAL_NOVO || typeof npcLookOf !== 'function') return;
  const HOUSE = { valcarne: '#e4bea4', solmire: '#cf9e7b', thornvale: '#b07d5a', draemor: '#815538', moranthe: '#553626' }, ROYAL = '#dbae8f';
  const hs = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const vary = (hex, key) => { const c = new THREE.Color(hex), k = 0.95 + 0.1 * hs(key), t = (hs(key + 'w') - 0.5) * 0.03; c.r = Math.min(1, c.r * k + t); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k - t); return '#' + c.getHexString(); };
  const _nl = npcLookOf; npcLookOf = function (kind, nid) { const L = _nl(kind, nid); try { if (L.seed == null) L.seed = nid || kind;
    const m = /^(?:hh|hb)_(?:lord|heir|young|child)_([a-z]+)$/.exec(String(kind)); let base = m && HOUSE[m[1]]; if (/^k_(king|prince|princess|rchild|ryoung)$/.test(String(kind))) base = ROYAL;
    if (base) { const h = vary(base, String(nid || kind)); L.skin = typeof tone === 'function' ? tone(h) : h; } } catch (e) { } return L; };
})();
/* ajuste do corpo do herói (visual novo): a aparência leva ~b + 8 algarismos — tom de pele, musculatura, peso, ombros, cintura, quadril, seios e glúteos */
(function () {
  if (typeof heroLook === 'function') { const _hl = heroLook; heroLook = function (cls, skinId, accentHex) { const L = _hl(cls, skinId, accentHex); L.isHero = true; const m = /~b([0-9]{8})/.exec(String(skinId || ''));
    if (m && typeof VISUAL_NOVO !== 'undefined' && VISUAL_NOVO) { L.bodyCfg = m[1]; const h = (window.BODY_SKINS || [])[+m[1][0]]; if (h) L.skin = typeof tone === 'function' ? tone(h) : h; } return L; }; }
  if (typeof VISUAL_NOVO === 'undefined' || !VISUAL_NOVO || typeof document === 'undefined') return;
  const host = document.getElementById('bodysel'); if (!host) return;
  const F = [['mus', 'Musculatura'], ['fat', 'Peso'], ['sh', 'Ombros'], ['waist', 'Cintura'], ['hip', 'Quadril'], ['bust', 'Seios'], ['butt', 'Glúteos']];
  const st = document.createElement('style'); st.textContent = '#bodycfg{display:grid;gap:6px;margin:6px 0 10px}#bodycfg .tones{display:flex;flex-wrap:wrap;gap:5px}#bodycfg .tones button{width:24px;height:24px;border-radius:50%;border:2px solid transparent;padding:0;cursor:pointer}#bodycfg .tones button.sel{border-color:#f0d890}#bodycfg .row{display:grid;grid-template-columns:90px 1fr;align-items:center;gap:8px;font-size:13px}#bodycfg input[type=range]{width:100%;accent-color:#d9a35b}#bodycfg .rnd{justify-self:start;padding:4px 10px;cursor:pointer}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'bodycfg';
  box.innerHTML = '<div class="tones">' + (window.BODY_SKINS || []).map((h, i) => '<button type="button" data-t="' + i + '" style="background:' + h + '" title="Tom ' + (i + 1) + '"></button>').join('') + '</div>' + F.map(([k, n], i) => '<div class="row" data-k="' + k + '"><span>' + n + '</span><input type="range" min="0" max="9" step="1" data-i="' + (i + 1) + '"></div>').join('') + '<button type="button" class="rnd">🎲 Sortear corpo</button>';
  const lab = document.createElement('label'); lab.textContent = 'Ajuste do corpo';
  host.after(box); host.after(lab);
  const cur = () => (chosenBody && /^[0-9]{8}$/.test(chosenBody) ? chosenBody : '34444444').split('');
  const save = d => { chosenBody = d.join(''); try { localStorage.setItem('nae_body', chosenBody); } catch (e) { } bodyCfgSync(); };
  window.bodyCfgSync = () => { const d = cur(); box.querySelectorAll('.tones button').forEach(b => b.classList.toggle('sel', b.dataset.t === d[0])); box.querySelectorAll('input[type=range]').forEach(r => { r.value = d[+r.dataset.i]; }); const bu = box.querySelector('[data-k=bust]'); if (bu) bu.style.display = chosenFem ? '' : 'none'; };
  box.addEventListener('click', e => { const t = e.target.closest('.tones button'); if (t) { const d = cur(); d[0] = t.dataset.t; save(d); } if (e.target.closest('.rnd')) save(Array.from({ length: 8 }, (v, i) => String(i === 0 ? Math.floor(Math.random() * 10) : Math.floor(1 + Math.random() * 8)))); });
  box.addEventListener('input', e => { const r = e.target.closest('input[type=range]'); if (!r) return; const d = cur(); d[+r.dataset.i] = String(r.value); save(d); });
  if (typeof bodyPick === 'function') { const _bp = bodyPick; bodyPick = function (f) { const r = _bp.apply(this, arguments); try { bodyCfgSync(); } catch (e) { } return r; }; }
  bodyCfgSync();
})();
