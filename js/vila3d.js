// ============================================================
//  VILA DOS VIAJANTES — fachadas de seis povos (Prancheta da Vila, 27/11)
//  Casas e marcos com cult (and, ven, per, chi, esl, sah) ganham um modelo próprio; as oficinas mantêm o modelo do ofício
//  (roda d'água, velas, boca da pedreira) com as cores e os materiais do seu povo.
//  Quadro local: a porta fica na frente (z = h), centrada em dX; x vai de 0 a w.
// ============================================================
const VILA_STYLE = {
  and: { wall: '#f2ede2', roof: '#b0583a', tex: 'plaster', roofTex: 'slate', trim: '#2f5f9a' },
  ven: { wall: '#d8865a', roof: '#a8483a', tex: 'plaster', roofTex: 'slate', trim: '#efe8da' },
  per: { wall: '#d8c094', roof: '#2a9a9a', tex: 'brick', roofTex: 'slate', trim: '#2a8a96' },
  chi: { wall: '#ece6d8', roof: '#3a4a48', tex: 'plaster', roofTex: 'slate', trim: '#a8281e' },
  esl: { wall: '#8a6440', roof: '#5a3e28', tex: 'oldplank', roofTex: 'slate', trim: '#efe8da' },
  sah: { wall: '#c08850', roof: '#9a6a3a', tex: 'plaster', roofTex: 'slate', trim: '#5a3a1e' } };
if (typeof styleOf === 'function') { const _soV = styleOf; styleOf = function (b) { if (b && b.cult && VILA_STYLE[b.cult]) return VILA_STYLE[b.cult]; return _soV.apply(this, arguments); }; }
if (typeof mBuilding === 'function') { const _mbV = mBuilding; mBuilding = function (b, night) { if (b && b.cult && (b.kind === 'house' || b.kind === 'vila') && VILA_3D[b.cult]) { try { return VILA_3D[b.cult](b, night); } catch (e) { console.warn('vila3d', e); } } return _mbV.apply(this, arguments); }; }
/* ---- ajudantes ---- */
const vG = night => smat(null, '#ffc070', { emissive: '#ffa040', ei: night ? 1.5 : 0.12, rough: 0.6 });
function vHip(o, w, h, H, RH, m, ov = 0.25) { const c = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); c.rotateY(Math.PI / 4); c.translate(0, 0.5, 0); const r = mk(c, m); r.scale.set(w + ov * 2, RH, h + ov * 2); r.position.set(w / 2, H, h / 2); o.add(r); return r; }
function vGable(o, w, h, H, RH, m, ov = 0.3, along = 'x') { const L = along === 'x' ? w : h, D = along === 'x' ? h : w, half = D / 2 + ov, sl = Math.atan2(RH, D / 2), len = Math.hypot(half, RH * (half / (D / 2)));
  for (const sg of [-1, 1]) { const pl = mk(new THREE.BoxGeometry(along === 'x' ? L + ov * 2 : 0.08, along === 'x' ? 0.08 : 0.08, along === 'x' ? 0.08 : L + ov * 2), m); const g = new THREE.Group(); const p = mk(along === 'x' ? new THREE.BoxGeometry(L + ov * 2, 0.08, len).translate(0, 0, sg * len / 2) : new THREE.BoxGeometry(len, 0.08, L + ov * 2).translate(sg * len / 2, 0, 0), m);
    if (along === 'x') p.rotation.x = sg * sl; else p.rotation.z = -sg * sl; p.position.set(w / 2, H + RH, h / 2); o.add(p); }
  const tri = new THREE.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, RH); tri.closePath(); for (const e of [0, L]) { const tg = new THREE.ShapeGeometry(tri); const t = mk(tg, m); if (along === 'x') { t.rotation.y = Math.PI / 2; t.position.set(e, H, h / 2); } else { t.position.set(w / 2, H, e); } o.add(t); } }
function vWinF(o, x, y, z, side, ww, wh, frame, glass, opts = {}) {   /* janela numa parede: side 'F' (frente z = h), 'B' (fundo z = 0), 'L' (x = 0), 'R' (x = w) */
  const g = new THREE.Group(), p = mk(new THREE.PlaneGeometry(ww, wh), glass, false); g.add(p);
  if (frame) { g.add(mk(new THREE.BoxGeometry(ww + 0.1, 0.06, 0.05).translate(0, -wh / 2 - 0.03, 0.01), frame)); g.add(mk(new THREE.BoxGeometry(ww + 0.1, 0.06, 0.05).translate(0, wh / 2 + 0.03, 0.01), frame)); for (const sx of [-1, 1]) g.add(mk(new THREE.BoxGeometry(0.06, wh, 0.05).translate(sx * (ww / 2 + 0.03), 0, 0.01), frame)); }
  if (opts.arch) { const a = mk(new THREE.CircleGeometry(ww / 2, 14, 0, Math.PI), glass, false); a.position.y = wh / 2; g.add(a); if (frame) { const t = mk(new THREE.TorusGeometry(ww / 2 + 0.03, 0.03, 4, 14, Math.PI), frame); t.position.y = wh / 2; g.add(t); } }
  if (opts.bars) for (let k = -1; k <= 1; k++) g.add(mk(new THREE.BoxGeometry(0.02, wh + (opts.arch ? ww / 2 : 0), 0.02).translate(k * ww / 3, opts.arch ? ww / 4 : 0, 0.04), opts.bars));
  if (opts.shut) for (const sx of [-1, 1]) g.add(mk(new THREE.BoxGeometry(ww / 2, wh, 0.03).translate(sx * (ww * 0.75 + 0.05), 0, 0.02), opts.shut));
  const W = o.userData.w, H0 = o.userData.h; if (side === 'F') g.position.set(x, y, H0 + 0.012 + (z || 0)); else if (side === 'B') { g.rotation.y = Math.PI; g.position.set(x, y, -0.012); } else if (side === 'L') { g.rotation.y = -Math.PI / 2; g.position.set(-0.012, y, x); } else { g.rotation.y = Math.PI / 2; g.position.set(W + 0.012, y, x); }
  o.add(g); return g; }
function vDoorF(o, dX, h, dw, dh, wood, opts = {}) { const g = new THREE.Group(); g.add(mk(new THREE.BoxGeometry(dw, dh, 0.06).translate(0, dh / 2, 0), wood)); if (opts.arch) { const a = mk(new THREE.CircleGeometry(dw / 2, 14, 0, Math.PI), wood, false); a.position.set(0, dh, 0.031); g.add(a); }
  if (opts.frame) { g.add(mk(new THREE.BoxGeometry(dw + 0.16, 0.1, 0.08).translate(0, dh + (opts.arch ? dw / 2 : 0) + 0.05, 0.02), opts.frame)); for (const sx of [-1, 1]) g.add(mk(new THREE.BoxGeometry(0.08, dh, 0.08).translate(sx * (dw / 2 + 0.04), dh / 2, 0.02), opts.frame)); }
  g.position.set(dX, 0, h + 0.02); o.add(g); return g; }
function vBase(b) { const o = grp(), w = b.w, h = b.h; o.userData.w = w; o.userData.h = h; return o; }
const vDX = b => doorCol(b) + 0.5;
const vHash = b => Math.abs(Math.round(b.x * 31 + b.y * 17));
/* ---- ANDALUZ: cal branca, faixa de azulejo, porta em arco de ferradura, grades de ferro, telhas de barro; banhos com cúpula e arcada ---- */
function vAnd(b, night) { const o = vBase(b), w = b.w, h = b.h, { H, RH } = bldDims(b), dX = vDX(b), cal = smat('plaster', '#f4f0e6', { bump: 0.4 }), azul = smat(null, '#2f5f9a', { rough: 0.35 }), azul2 = smat(null, '#e8e2d2', { rough: 0.35 }), ferro = smat(null, '#1e1c1c', { metal: 0.6, rough: 0.5 }), wood = smat('wood', '#5a3420', { bump: 1 }), telha = smat('slate', '#b0583a', { bump: 0.8 }), gl = vG(night);
  o.add(wbox(w, H, h, w / 2, H / 2, h / 2, cal, 1)); o.add(wbox(w + 0.04, 0.42, h + 0.04, w / 2, 0.21, h / 2, azul, 1));
  for (let k = 0; k < Math.floor((w + h) * 2 / 0.3); k++) { const t = k * 0.3; const m = k % 2 ? azul2 : azul; if (t < w) o.add(wbox(0.12, 0.12, 0.03, t + 0.15, 0.3, h + 0.03, m)); }   /* azulejos em xadrez na frente */
  vDoorF(o, dX, h, 0.8, 1.25, wood, { arch: true, frame: azul });
  for (const x of [0.6, w - 0.6]) if (Math.abs(x - dX) > 0.8) vWinF(o, x, 1.3, 0, 'F', 0.45, 0.55, null, gl, { arch: true, bars: ferro });
  for (let z = 0.8; z < h - 0.4; z += 1.5) { vWinF(o, z, 1.3, 0, 'R', 0.45, 0.55, null, gl, { arch: true, bars: ferro }); vWinF(o, z, 1.3, 0, 'L', 0.45, 0.55, null, gl, { arch: true, bars: ferro }); }
  for (const x of [0.6, w - 0.6]) if (Math.abs(x - dX) > 0.8) for (let k = 0; k < 3; k++) o.add(mk(new THREE.SphereGeometry(0.07, 8, 6).translate(x - 0.15 + k * 0.15, 0.98, h + 0.12), smat(null, k % 2 ? '#c8202a' : '#3a8a3a')));   /* gerânios na janela */
  if (b.vk === 'banhos') { o.add(wbox(w + 0.1, 0.12, h + 0.1, w / 2, H + 0.06, h / 2, cal, 1)); const d = mk(new THREE.SphereGeometry(Math.min(w, h) * 0.32, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), cal); d.position.set(w / 2, H + 0.12, h / 2); o.add(d);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, r = Math.min(w, h) * 0.2; o.add(mk(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 6).translate(w / 2 + Math.cos(a) * r, H + 0.12 + Math.min(w, h) * 0.24, h / 2 + Math.sin(a) * r), gl)); }   /* clarabóias em estrela */
    for (let k = 0; k < 3; k++) { const x = w * (0.25 + k * 0.25); if (Math.abs(x - dX) < 0.5) continue; o.add(wbox(0.18, 1.3, 0.18, x - 0.55, 0.65, h + 0.4, cal)); }
    o.add(wbox(w, 0.14, 0.7, w / 2, 1.42, h + 0.35, telha)); }
  else vHip(o, w, h, H, RH, telha, 0.22);
  return o; }
/* ---- VENEZIANO: reboco colorido, molduras de pedra branca, janelas em arco gótico, varanda, chaminé em sino ---- */
function vVen(b, night) { const o = vBase(b), w = b.w, h = b.h, { H, RH } = bldDims(b), dX = vDX(b), cols = ['#d8865a', '#e0b060', '#c86a5a', '#e8c8a0', '#d89878'], wall = smat('plaster', cols[vHash(b) % cols.length], { bump: 0.5 }), pedra = smat('stoneblock', '#efe8da', { bump: 0.6 }), wood = smat('wood', '#3a2a1a', { bump: 1 }), telha = smat('slate', '#a8483a', { bump: 0.8 }), verde = smat(null, '#2a5a3a'), gl = vG(night);
  o.add(wbox(w, H, h, w / 2, H / 2, h / 2, wall, 1)); o.add(wbox(w + 0.06, 0.5, h + 0.06, w / 2, 0.25, h / 2, pedra, 1)); o.add(wbox(w + 0.14, 0.12, h + 0.14, w / 2, H - 0.06, h / 2, pedra, 1)); o.add(wbox(w + 0.08, 0.08, h + 0.08, w / 2, H * 0.5, h / 2, pedra, 1));
  vDoorF(o, dX, h, 0.75, 1.15, wood, { arch: true, frame: pedra });
  for (const fy of [H * 0.32, H * 0.72]) { for (let x = 0.55; x < w - 0.3; x += 0.9) { if (fy < H * 0.5 && Math.abs(x - dX) < 0.7) continue; vWinF(o, x, fy, 0, 'F', 0.36, 0.55, pedra, gl, { arch: true, shut: verde }); }
    for (let z = 0.6; z < h - 0.3; z += 1.1) { vWinF(o, z, fy, 0, 'R', 0.36, 0.55, pedra, gl, { arch: true }); vWinF(o, z, fy, 0, 'L', 0.36, 0.55, pedra, gl, { arch: true }); } }
  o.add(wbox(1.3, 0.08, 0.45, dX, H * 0.55, h + 0.22, pedra)); for (let k = 0; k < 6; k++) o.add(wbox(0.04, 0.32, 0.04, dX - 0.6 + k * 0.24, H * 0.55 + 0.2, h + 0.43, pedra));   /* varandinha de pedra */
  vHip(o, w, h, H, RH, telha, 0.18);
  const cx = w * 0.75, cz = h * 0.3; o.add(wbox(0.22, 0.6, 0.22, cx, H + RH * 0.5 + 0.2, cz, wall)); o.add(mk(new THREE.CylinderGeometry(0.24, 0.08, 0.3, 10).translate(cx, H + RH * 0.5 + 0.65, cz), wall));   /* fumaiolo */
  return o; }
/* ---- PERSA: tijolo cor de areia, portal (iwan) de azulejo turquesa em arco, cúpula azul; bazar com fileira de cúpulas e toldos ---- */
function vPer(b, night) { const o = vBase(b), w = b.w, h = b.h, { H } = bldDims(b), dX = vDX(b), tij = smat('brick', '#d8c094', { bump: 1 }), turq = smat(null, '#2a9a9a', { rough: 0.3 }), azulE = smat(null, '#1e3a6a', { rough: 0.3 }), wood = smat('wood', '#4a2a16', { bump: 1 }), ouro = smat(null, '#d4a94a', { metal: 0.8, rough: 0.3 }), gl = vG(night);
  o.add(wbox(w, H, h, w / 2, H / 2, h / 2, tij, 1)); o.add(wbox(w + 0.1, 0.16, h + 0.1, w / 2, H + 0.08, h / 2, turq, 1));
  { const iw = 1.3, ih = Math.min(H + 0.5, 2.6); o.add(wbox(iw + 0.3, ih, 0.2, dX, ih / 2, h + 0.1, turq)); o.add(wbox(iw, ih - 0.3, 0.06, dX, (ih - 0.3) / 2, h + 0.21, azulE)); const a = mk(new THREE.CircleGeometry(iw / 2, 14, 0, Math.PI), azulE, false); a.position.set(dX, ih - 0.3, h + 0.22); o.add(a); }   /* iwan */
  vDoorF(o, dX, h + 0.2, 0.7, 1.15, wood, { arch: true });
  for (let x = 0.5; x < w - 0.3; x += 1.2) if (Math.abs(x - dX) > 1.0) vWinF(o, x, 1.25, 0, 'F', 0.34, 0.5, null, gl, { arch: true, bars: turq });
  for (let z = 0.7; z < h - 0.3; z += 1.3) { vWinF(o, z, 1.25, 0, 'R', 0.34, 0.5, null, gl, { arch: true, bars: turq }); vWinF(o, z, 1.25, 0, 'L', 0.34, 0.5, null, gl, { arch: true, bars: turq }); }
  const dome = (x, z, r) => { o.add(mk(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.25, 16).translate(x, H + 0.28, z), tij)); const d = mk(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), turq); d.position.set(x, H + 0.4, z); d.scale.y = 1.15; o.add(d); o.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6).translate(x, H + 0.4 + r * 1.15 + 0.15, z), ouro)); o.add(mk(new THREE.SphereGeometry(0.05, 8, 6).translate(x, H + 0.4 + r * 1.15 + 0.32, z), ouro)); };
  if (b.vk === 'bazar') { for (let k = 0; k < 3; k++) dome(w * (0.2 + k * 0.3), h / 2, Math.min(h * 0.28, 1.0)); const cl = ['#c8402a', '#d4a94a', '#3a7a5a', '#6a3a8a']; for (let k = 0; k < 4; k++) { const x = w * (0.12 + k * 0.25); if (Math.abs(x - dX) < 0.8) continue; const aw = mk(new THREE.BoxGeometry(1.1, 0.04, 0.7).translate(0, 0, 0.35), smat('cloth', cl[k], { bump: 0.4 })); aw.rotation.x = 0.35; aw.position.set(x, 1.55, h); o.add(aw); } }   /* toldos das bancas */
  else dome(w / 2, h / 2, Math.min(w, h) * 0.33);
  return o; }
/* ---- CHINÊS: base de pedra, pilares vermelhos, paredes claras com treliça, telhado curvo de duas camadas com pontas erguidas, lanternas; pagode de cinco telhados ---- */
function vChiRoof(o, cx, cz, y, sw, sd, rh, tile, red) { const r = vHip(o, sw - 0.3, sd - 0.3, y, rh, tile, 0.15); r.position.set(cx, y, cz); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const t = mk(new THREE.ConeGeometry(0.06, 0.4, 5).rotateZ(-sx * 0.9).rotateX(sz * 0.9), tile); t.position.set(cx + sx * sw / 2, y + 0.08, cz + sz * sd / 2); o.add(t); } o.add(wbox(sw * 0.5, 0.08, 0.1, cx, y + rh + 0.02, cz, red)); }
function vChi(b, night) { const o = vBase(b), w = b.w, h = b.h, { H } = bldDims(b), dX = vDX(b), pedra = smat('stoneblock', '#8a8478', { bump: 1.2 }), cal = smat('plaster', '#ece6d8', { bump: 0.4 }), red = smat(null, '#a8281e', { rough: 0.5 }), tile = smat('slate', '#3a4a48', { bump: 0.7 }), lat = smat(null, '#3a2014'), ouro = smat(null, '#d4a94a', { metal: 0.8, rough: 0.3 }), lant = smat(null, '#e83020', { emissive: '#ff4020', ei: night ? 2.0 : 0.3 }), gl = vG(night);
  if (b.vk === 'pagode') { o.add(wbox(w + 0.3, 0.3, h + 0.3, w / 2, 0.15, h / 2, pedra, 1)); let y = 0.3; for (let k = 0; k < 5; k++) { const s = Math.max(0.9, w - k * 0.42), th = k === 0 ? 1.0 : 0.62; o.add(wbox(s * 0.72, th, s * 0.72, w / 2, y + th / 2, h / 2, k % 2 ? cal : red, 1)); y += th; vChiRoof(o, w / 2, h / 2, y, s + 0.5, s + 0.5, 0.24, tile, red); y += 0.24; }
    o.add(mk(new THREE.CylinderGeometry(0.03, 0.05, 0.7, 8).translate(w / 2, y + 0.35, h / 2), ouro)); for (let k = 0; k < 3; k++) o.add(mk(new THREE.TorusGeometry(0.08 - k * 0.015, 0.015, 4, 10).rotateX(Math.PI / 2).translate(w / 2, y + 0.2 + k * 0.15, h / 2), ouro)); vDoorF(o, dX, h - 0.85, 0.6, 0.85, red); return o; }
  o.add(wbox(w + 0.3, 0.32, h + 0.3, w / 2, 0.16, h / 2, pedra, 1)); o.add(wbox(w - 0.2, H - 0.32, h - 0.2, w / 2, 0.32 + (H - 0.32) / 2, h / 2, cal, 1));
  for (const [x, z] of [[0.05, 0.05], [w - 0.05, 0.05], [0.05, h - 0.05], [w - 0.05, h - 0.05], [dX - 0.6, h - 0.05], [dX + 0.6, h - 0.05]]) o.add(mk(new THREE.CylinderGeometry(0.08, 0.08, H - 0.32, 10).translate(x, 0.32 + (H - 0.32) / 2, z), red));
  vDoorF(o, dX, h - 0.1, 0.8, 1.3, red, { frame: lat });
  for (let x = 0.6; x < w - 0.4; x += 1.1) if (Math.abs(x - dX) > 0.9) { const g = vWinF(o, x, 1.35, -0.1, 'F', 0.6, 0.6, lat, gl); for (let k = -1; k <= 1; k++) { g.add(mk(new THREE.BoxGeometry(0.02, 0.6, 0.02).translate(k * 0.2, 0, 0.03), lat)); g.add(mk(new THREE.BoxGeometry(0.6, 0.02, 0.02).translate(0, k * 0.2, 0.03), lat)); } }
  for (let z = 0.8; z < h - 0.4; z += 1.4) { vWinF(o, z, 1.35, 0, 'R', 0.55, 0.55, lat, gl); vWinF(o, z, 1.35, 0, 'L', 0.55, 0.55, lat, gl); }
  vChiRoof(o, w / 2, h / 2, H, w + 0.9, h + 0.9, 0.5, tile, red); vChiRoof(o, w / 2, h / 2, H + 0.7, w * 0.6, h * 0.6, 0.4, tile, red);
  o.add(wbox(w * 0.6 - 0.4, 0.5, h * 0.6 - 0.4, w / 2, H + 0.5, h / 2, red, 1));
  for (const x of [dX - 0.75, dX + 0.75]) { o.add(mk(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 4).translate(x, H - 0.15, h + 0.35), lat)); const l = mk(new THREE.SphereGeometry(0.12, 10, 8), lant); l.scale.y = 1.3; l.position.set(x, H - 0.42, h + 0.35); o.add(l); }   /* lanternas vermelhas */
  return o; }
/* ---- ESLAVO: toras empilhadas, molduras brancas entalhadas e postigos azuis, telhado alto de tabuinhas; igreja com cúpulas de cebola ---- */
function vLogs(o, w, h, H, m) { const r = 0.085; for (let y = r; y < H; y += r * 2) { o.add(mk(new THREE.CylinderGeometry(r, r, w + 0.24, 8).rotateZ(Math.PI / 2).translate(w / 2, y, 0.02), m)); o.add(mk(new THREE.CylinderGeometry(r, r, w + 0.24, 8).rotateZ(Math.PI / 2).translate(w / 2, y, h - 0.02), m)); o.add(mk(new THREE.CylinderGeometry(r, r, h + 0.24, 8).rotateX(Math.PI / 2).translate(0.02, y + r, h / 2), m)); o.add(mk(new THREE.CylinderGeometry(r, r, h + 0.24, 8).rotateX(Math.PI / 2).translate(w - 0.02, y + r, h / 2), m)); } }
function vOnion(o, x, y, z, r, m, cross) { const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12, rr = r * Math.sin(Math.PI * Math.min(1, t * 1.25)) * (1 - t * 0.35) + 0.01, yy = t * r * 2.4; pts.push(new THREE.Vector2(Math.max(0.005, rr), yy)); } const L = mk(new THREE.LatheGeometry(pts, 14), m); L.position.set(x, y, z); o.add(L); if (cross) { o.add(wbox(0.03, 0.4, 0.03, x, y + r * 2.4 + 0.2, z, cross)); o.add(wbox(0.2, 0.03, 0.03, x, y + r * 2.4 + 0.28, z, cross)); } }
function vEsl(b, night) { const o = vBase(b), w = b.w, h = b.h, { H, RH } = bldDims(b), dX = vDX(b), tora = smat('bark', '#8a6440', { bump: 1.6 }), core = smat('oldplank', '#7a5434', { bump: 1 }), white = smat(null, '#efe8da'), azul = smat(null, '#3a6aa8'), telh = smat('oldplank', '#5a3e28', { bump: 1.2 }), ouro = smat(null, '#d4a94a', { metal: 0.85, rough: 0.25 }), verde = smat(null, '#2a7a5a', { metal: 0.2, rough: 0.35 }), gl = vG(night);
  o.add(wbox(w - 0.1, H, h - 0.1, w / 2, H / 2, h / 2, core, 1)); vLogs(o, w, h, H, tora);
  vDoorF(o, dX, h + 0.08, 0.75, 1.2, core, { frame: white });
  for (let x = 0.6; x < w - 0.3; x += 1.2) if (Math.abs(x - dX) > 0.9) { const g = vWinF(o, x, 1.25, 0.08, 'F', 0.42, 0.52, white, gl, { shut: azul }); g.add(mk(new THREE.ConeGeometry(0.34, 0.2, 3).rotateZ(0).translate(0, 0.4, 0.02), white)); }
  for (let z = 0.8; z < h - 0.4; z += 1.4) { vWinF(o, z, 1.25, 0, 'R', 0.42, 0.52, white, gl, { shut: azul }); vWinF(o, z, 1.25, 0, 'L', 0.42, 0.52, white, gl, { shut: azul }); }
  if (b.vk === 'igreja') { vGable(o, w, h, H, 1.0, telh, 0.25, 'z'); const tx = w / 2, tz = h * 0.4; o.add(mk(new THREE.CylinderGeometry(0.55, 0.6, 1.2, 12).translate(tx, H + 1.0 + 0.6, tz), core)); vOnion(o, tx, H + 2.2, tz, 0.5, ouro, ouro);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = tx + sx * w * 0.32, z = tz + sz * h * 0.28; o.add(mk(new THREE.CylinderGeometry(0.2, 0.22, 0.6, 10).translate(x, H + 0.6, z), core)); vOnion(o, x, H + 0.9, z, 0.22, verde, ouro); }
    o.add(wbox(1.0, 1.6, 1.0, dX, 0.8, h + 0.55, core)); vOnion(o, dX, 1.6, h + 0.55, 0.3, verde, ouro); }   /* alpendre da porta com cúpula */
  else vGable(o, w, h, H, Math.max(RH, 1.4), telh, 0.3, 'x');
  return o; }
/* ---- SAHELIANO: adobe ocre de cantos arredondados, vigas aparentes (toron), pináculos na platibanda, teto plano; celeiro com torres-pilastras como em Djenné ---- */
function vSah(b, night) { const o = vBase(b), w = b.w, h = b.h, { H } = bldDims(b), dX = vDX(b), ad = smat('plaster', '#c08850', { bump: 1.6 }), ad2 = smat('plaster', '#a8703c', { bump: 1.6 }), vig = smat('wood', '#5a3a1e', { bump: 1 }), wood = smat('oldplank', '#6a4424', { bump: 1 }), gl = vG(night);
  o.add(wbox(w, H, h, w / 2, H / 2, h / 2, ad, 1)); o.add(wbox(w + 0.16, 0.4, h + 0.16, w / 2, 0.2, h / 2, ad2, 1));
  const pin = (x, z, hh) => { o.add(mk(new THREE.CylinderGeometry(0.08, 0.16, hh, 8).translate(x, H + hh / 2, z), ad)); o.add(mk(new THREE.SphereGeometry(0.08, 8, 6).translate(x, H + hh, z), ad)); };
  for (let x = 0.15; x <= w - 0.1; x += 0.7) { pin(x, h - 0.05, 0.45); pin(x, 0.05, 0.45); } for (let z = 0.7; z < h - 0.3; z += 0.7) { pin(0.05, z, 0.45); pin(w - 0.05, z, 0.45); }
  for (let y = 0.9; y < H; y += 0.8) { for (let x = 0.35; x < w; x += 0.7) o.add(wbox(0.06, 0.06, 0.4, x, y, h + 0.12, vig)); for (let z = 0.35; z < h; z += 0.7) { o.add(wbox(0.4, 0.06, 0.06, w + 0.12, y, z, vig)); o.add(wbox(0.4, 0.06, 0.06, -0.12, y, z, vig)); } }   /* toron */
  vDoorF(o, dX, h, 0.75, 1.25, wood, { frame: ad2 });
  for (let x = 0.6; x < w - 0.3; x += 1.3) if (Math.abs(x - dX) > 0.9) vWinF(o, x, 1.6, 0, 'F', 0.28, 0.32, null, gl);
  if (b.vk === 'celeiro') { for (const x of [0, w / 2, w]) { o.add(wbox(0.5, H + 0.6, 0.5, x, (H + 0.6) / 2, h + 0.1, ad)); o.add(mk(new THREE.ConeGeometry(0.28, 0.8, 8).translate(x, H + 1.0, h + 0.1), ad)); o.add(mk(new THREE.SphereGeometry(0.08, 8, 6).translate(x, H + 1.45, h + 0.1), smat(null, '#e8e0c8'))); }
    for (const [x, z] of [[w * 0.25, h * 0.3], [w * 0.7, h * 0.35]]) { o.add(mk(new THREE.CylinderGeometry(0.45, 0.5, 0.9, 12).translate(x, H + 0.45, z), ad)); o.add(mk(new THREE.ConeGeometry(0.62, 0.7, 12).translate(x, H + 1.25, z), smat('cloth', '#b89a5a', { bump: 1.4 }))); } }   /* silos com chapéu de palha */
  return o; }
const VILA_3D = { and: vAnd, ven: vVen, per: vPer, chi: vChi, esl: vEsl, sah: vSah };
