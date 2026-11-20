// ============================================================
//  RUA NOVA DO BAIRRO NOBRE: Clube do Cervo de Prata (clube de
//  cavalheiros), Termas de Aurora (termas romanas) e Casa de
//  Veludo (o palácio da Dama Ysolde). Modelos 3D e móveis novos.
//  No quadro local a porta fica em z = h; a câmera vê o lado
//  x = w e o fundo z = 0 (porta virada para o oeste).
// ============================================================
function mNoble(b, night) { return b.deco === 'club' ? mClub(b, night) : b.deco === 'thermae' ? mThermae(b, night) : mVelvet(b, night); }
const NB = {
  glow: (night, c = '#ffd59a', e = '#ffb860') => smat(null, c, { emissive: e, ei: night ? 1.3 : 0.12, rough: 0.4 }),
  win(o, x, y, z, ry, ww, wh, frame, glass, arch) { const g = grp(); g.add(wbox(ww + 0.12, wh + 0.12, 0.06, 0, 0, 0, frame, 1)); g.add(mk(new THREE.PlaneGeometry(ww, wh).translate(0, 0, 0.035), glass));
    g.add(wbox(ww, 0.035, 0.03, 0, 0, 0.05, frame)); g.add(wbox(0.035, wh, 0.03, 0, 0, 0.05, frame)); g.add(wbox(ww + 0.22, 0.06, 0.14, 0, -wh / 2 - 0.08, 0.05, frame, 1));
    if (arch) { const a = mk(new THREE.CircleGeometry(ww / 2 + 0.06, 16, 0, Math.PI).translate(0, wh / 2, 0.02), frame); g.add(a); g.add(mk(new THREE.CircleGeometry(ww / 2, 16, 0, Math.PI).translate(0, wh / 2, 0.04), glass)); }
    g.position.set(x, y, z); g.rotation.y = ry; o.add(g); },
  /* janelas em todas as paredes: lado (0 frente z=h, 1 direita x=w, 2 fundo z=0, 3 esquerda x=0) */
  wins(o, w, h, y, step, ww, wh, frame, glass, arch, skipDoor, dX) { const sides = [[0, h + 0.03, 0, w], [1, w + 0.03, Math.PI / 2, h], [2, -0.03, Math.PI, w], [3, -0.03, -Math.PI / 2, h]];
    for (const [s, c, ry, L] of sides) { const n = Math.max(1, Math.floor((L - 0.8) / step)), off = (L - (n - 1) * step) / 2; for (let k = 0; k < n; k++) { const u = off + k * step; if (s === 0 && skipDoor && Math.abs(u - dX) < 1.0 && y < 2.4) continue; if (s === 0 || s === 2) NB.win(o, u, y, c, ry, ww, wh, frame, glass, arch); else NB.win(o, c, y, u, ry, ww, wh, frame, glass, arch); } } },
  shell(o, w, h, H, wall, t = 0.18) { o.add(wbox(w, H, t, w / 2, H / 2, t / 2, wall, 0.6)); o.add(wbox(w, H, t, w / 2, H / 2, h - t / 2, wall, 0.6)); o.add(wbox(t, H, h - 2 * t, t / 2, H / 2, h / 2, wall, 0.6)); o.add(wbox(t, H, h - 2 * t, w - t / 2, H / 2, h / 2, wall, 0.6)); },
  hip(o, w, h, y0, rh, m, over = 0.25) { const r = Math.SQRT2 / 2, c = mk(new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0), m); c.scale.set((w + over * 2) / (2 * r), rh, (h + over * 2) / (2 * r)); c.position.set(w / 2, y0, h / 2); o.add(c); },
  door(o, x, z, ry, dw, dh, m, brass) { const g = grp(); g.add(wbox(dw, dh, 0.08, 0, dh / 2, 0, m, 1)); g.add(wbox(0.03, dh, 0.09, 0, dh / 2, 0.01, brass)); for (const s of [-1, 1]) g.add(mk(new THREE.SphereGeometry(0.035, 8, 6).translate(s * 0.1, dh * 0.5, 0.06), brass)); g.position.set(x, 0, z); g.rotation.y = ry; o.add(g); },
  lantern(o, x, y, z, ry, col, night) { const g = grp(), ir = smat(null, '#2a2420', { metal: 0.6, rough: 0.5 }); g.add(wbox(0.4, 0.03, 0.03, 0.2, 0.25, 0, ir)); g.add(wbox(0.012, 0.12, 0.012, 0.38, 0.18, 0, ir));
    const L = mk(new THREE.SphereGeometry(0.13, 12, 8).scale(1, 1.25, 1).translate(0.38, 0, 0), smat(null, col, { emissive: col, ei: night ? 1.9 : 0.45, transparent: true, opacity: 0.92, rough: 0.6 })); g.add(L);
    for (const yy of [-0.17, 0.17]) g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10).translate(0.38, yy, 0), smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }))); g.add(wbox(0.01, 0.12, 0.01, 0.38, -0.25, 0, smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 })));
    g.position.set(x, y, z); g.rotation.y = ry; o.add(g); },
};
// ---------- Clube do Cervo de Prata: tijolo escuro georgiano, cunhais brancos, janelas de guilhotina, telhado de ardósia e chaminés ----------
function mClub(b, night) {
  const w = b.w, h = b.h, { H, RH } = bldDims(b), o = grp(), dX = doorCol(b) + 0.5;
  const brick = smat('brick', '#5e2a22', { bump: 1.2 }), stone = smat('stoneblock', '#e8e2d4', { bump: 0.8 }), slate = smat('slate', '#2c3038', { bump: 0.6, rough: 0.6 }), black = smat(null, '#141418', { rough: 0.25, metal: 0.2 }), brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }), wFrame = smat(null, '#f2eee4', { rough: 0.5 });
  const glass = NB.glow(night, '#3a3a40', '#ffc070');
  o.add(wbox(w + 0.12, 0.35, h + 0.12, w / 2, 0.175, h / 2, stone, 1));
  NB.shell(o, w, h, H, brick);
  for (const [cx, cz] of [[0, 0], [w, 0], [0, h], [w, h]]) for (let k = 0; k < 7; k++) { const yy = 0.5 + k * 0.52, big = k % 2 === 0; o.add(wbox(big ? 0.5 : 0.3, 0.24, big ? 0.3 : 0.5, cx + (cx ? -0.1 : 0.1) + (big ? (cx ? -0.1 : 0.1) : 0), yy, cz + (cz ? -0.1 : 0.1) + (!big ? (cz ? -0.1 : 0.1) : 0), stone, 1)); }   /* cunhais de pedra branca */
  NB.wins(o, w, h, 1.85, 1.35, 0.62, 1.55, wFrame, glass, false, true, dX);
  o.add(wbox(w + 0.3, 0.16, h + 0.3, w / 2, H - 0.3, h / 2, stone, 1)); o.add(wbox(w + 0.4, 0.12, h + 0.4, w / 2, H - 0.08, h / 2, stone, 1));   /* cornija */
  NB.hip(o, w, h, H, RH + 0.6, slate, 0.3);
  for (const cz of [1.0, h - 1.0]) { o.add(wbox(0.7, 1.8, 0.5, w * 0.3, H + 0.9, cz, brick, 1)); o.add(wbox(0.82, 0.12, 0.62, w * 0.3, H + 1.82, cz, stone, 1)); for (const s of [-0.16, 0.16]) o.add(mk(new THREE.CylinderGeometry(0.08, 0.09, 0.3, 8).translate(w * 0.3 + s, H + 2.0, cz), smat('brick', '#8a4a32'))); }
  /* entrada: pórtico de colunas brancas, porta preta laqueada com aldraba de latão e bandeira em leque */
  for (const s of [-0.75, 0.75]) { o.add(mk(new THREE.CylinderGeometry(0.1, 0.12, 2.4, 12).translate(dX + s, 1.55, h + 0.5), wFrame)); }
  o.add(wbox(1.9, 0.18, 0.75, dX, 2.85, h + 0.4, stone, 1)); o.add(wbox(2.1, 0.1, 0.9, dX, 0.05, h + 0.45, stone, 1)); NB.door(o, dX, h + 0.03, 0, 0.95, 2.1, black, brass); o.add(mk(new THREE.CircleGeometry(0.5, 16, 0, Math.PI).translate(dX, 2.18, h + 0.04), glass));
  /* placa do cervo de prata no lado que a câmera vê, e lanternas de ferro */
  { const pl = grp(), silver = smat(null, '#d8dce2', { metal: 1, rough: 0.25 }); pl.add(wbox(0.06, 0.9, 1.3, 0, 0, 0, smat('wood', '#2a1810'), 1)); pl.add(mk(new THREE.SphereGeometry(0.16, 10, 8).scale(0.6, 1, 0.8).translate(0.08, -0.1, 0), silver));
    for (const s of [-1, 1]) { pl.add(mk(new THREE.CylinderGeometry(0.018, 0.022, 0.42, 5).rotateX(s * 0.5).translate(0.08, 0.2, s * 0.12), silver)); for (const k of [0.1, 0.22]) pl.add(mk(new THREE.CylinderGeometry(0.012, 0.015, 0.16, 5).rotateX(s * 1.1).translate(0.08, 0.18 + k, s * (0.16 + k * 0.4)), silver)); }
    pl.position.set(w + 0.05, 2.75, h / 2); o.add(pl); }
  NB.lantern(o, w, 2.6, h * 0.25, 0, '#ffd890', night); NB.lantern(o, w, 2.6, h * 0.75, 0, '#ffd890', night);
  /* grade de ferro forjado e arbustos podados no lado sul */
  for (let z = 0.4; z < h - 0.3; z += 0.18) o.add(wbox(0.025, 0.7, 0.025, w + 0.55, 0.35, z, black)); o.add(wbox(0.05, 0.05, h - 0.6, w + 0.55, 0.7, h / 2, black)); for (let z = 0.4; z < h - 0.3; z += 0.18) o.add(mk(new THREE.ConeGeometry(0.03, 0.08, 5).translate(w + 0.55, 0.75, z), brass));
  return o; }
// ---------- Termas de Aurora: travertino, colunata dórica no lado sul, frontões, telhado de telha romana e cúpula com óculo e vapor ----------
function mThermae(b, night) {
  const w = b.w, h = b.h, { H } = bldDims(b), o = grp(), dX = doorCol(b) + 0.5;
  const trav = smat('stoneblock', '#e6d8b8', { bump: 0.9 }), marble = smat('stoneblock', '#f4efe4', { bump: 0.4 }), tile = smat('shingle', '#b0583a', { bump: 1.1 }), bronze = smat(null, '#8a6a3a', { metal: 0.9, rough: 0.35 }), dome = smat(null, '#cfc6b4', { rough: 0.75 });
  const glass = NB.glow(night, '#7a8a90', '#ffb070');
  o.add(wbox(w + 0.6, 0.3, h + 0.6, w / 2, 0.15, h / 2, marble, 1)); o.add(wbox(w + 0.9, 0.15, h + 0.9, w / 2, 0.075, h / 2, trav, 1));   /* estilóbato em degraus */
  NB.shell(o, w, h, H, trav);
  NB.wins(o, w, h, 2.6, 2.0, 0.7, 1.0, marble, glass, true, true, dX);
  /* friso de mosaico (azul, ouro e branco) */
  { const cols = ['#2a5a9a', '#e8c060', '#f4efe4', '#3a8a9a']; let k = 0; for (let x = 0.15; x < w; x += 0.3) for (const z of [-0.02, h + 0.02]) o.add(wbox(0.28, 0.22, 0.02, x, H - 0.55, z, smat(null, cols[k++ % 4], { rough: 0.4 }))); for (let z = 0.15; z < h; z += 0.3) for (const x of [-0.02, w + 0.02]) o.add(wbox(0.02, 0.22, 0.28, x, H - 0.55, z, smat(null, cols[k++ % 4], { rough: 0.4 }))); }
  o.add(wbox(w + 0.3, 0.25, h + 0.3, w / 2, H - 0.12, h / 2, marble, 1));   /* entablamento */
  /* telhado de duas águas ao longo de z, com frontões triangulares nas pontas */
  const rh = 1.3, half = w / 2 + 0.25; for (const s of [-1, 1]) { const sl = Math.hypot(half, rh), p = mk(new THREE.BoxGeometry(sl, 0.12, h + 0.5), tile); p.position.set(w / 2 + s * half / 2, H + rh / 2, h / 2); p.rotation.z = -s * Math.atan2(rh, half); o.add(p); }
  for (const z of [0.02, h - 0.02]) { const tri = new THREE.Shape(); tri.moveTo(-half, 0); tri.lineTo(half, 0); tri.lineTo(0, rh); tri.lineTo(-half, 0); const tg = mk(new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }).translate(w / 2, H, z - 0.06), marble); o.add(tg);
    o.add(mk(new THREE.CircleGeometry(0.32, 20).translate(w / 2, H + 0.45, z < 1 ? z - 0.08 : z + 0.08).rotateY(0), bronze)); }
  /* cúpula com tambor, nervuras e óculo; vapor saindo */
  { const R = Math.min(w, h) * 0.26, cy = H + rh * 0.55, cz = h / 2; o.add(mk(new THREE.CylinderGeometry(R + 0.08, R + 0.12, 0.7, 28).translate(w / 2, cy + 0.35, cz), trav)); o.add(mk(new THREE.SphereGeometry(R, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(w / 2, cy + 0.7, cz), dome));
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, rib = mk(new THREE.TorusGeometry(R + 0.02, 0.035, 4, 16, Math.PI / 2), marble); rib.rotation.y = a; rib.position.set(w / 2, cy + 0.7, cz); o.add(rib); }
    o.add(mk(new THREE.TorusGeometry(0.32, 0.07, 6, 18).rotateX(Math.PI / 2).translate(w / 2, cy + 0.7 + R - 0.03, cz), marble));
    const steam = smat(null, '#ffffff', { transparent: true, opacity: 0.22, rough: 1, side: THREE.DoubleSide }); for (let k = 0; k < 4; k++) { const sp = mk(new THREE.PlaneGeometry(0.7 + k * 0.25, 0.9 + k * 0.3), steam, false); sp.position.set(w / 2 + Math.sin(k * 2) * 0.2, cy + 0.9 + R + k * 0.55, cz + Math.cos(k * 1.7) * 0.2); sp.rotation.y = k * 0.8; o.add(sp); } }
  /* colunata no lado que a câmera vê (x = w): colunas com base e capitel, arquitrave e alpendre */
  const CX = w + 1.1; for (let z = 0.6; z <= h - 0.5; z += (h - 1.1) / 6) { o.add(mk(new THREE.CylinderGeometry(0.16, 0.19, H - 0.55, 14).translate(CX, 0.3 + (H - 0.55) / 2, z), marble)); o.add(wbox(0.46, 0.14, 0.46, CX, 0.37, z, marble, 1)); o.add(wbox(0.5, 0.16, 0.5, CX, H - 0.3, z, marble, 1)); }
  o.add(wbox(0.55, 0.3, h - 0.4, CX, H - 0.07, h / 2, marble, 1)); { const ln = mk(new THREE.BoxGeometry(1.3, 0.1, h - 0.3), tile); ln.position.set(w + 0.6, H + 0.2, h / 2); ln.rotation.z = -0.25; o.add(ln); }
  o.add(wbox(1.3, 0.3, h - 0.2, w + 0.65, 0.15, h / 2, marble, 1));
  /* porta de bronze na frente e inscrição */
  NB.door(o, dX, h + 0.03, 0, 1.2, 2.4, bronze, smat(null, '#e8c060', { metal: 1, rough: 0.2 })); for (const s of [-0.95, 0.95]) o.add(mk(new THREE.CylinderGeometry(0.13, 0.15, 2.8, 12).translate(dX + s, 1.7, h + 0.35), marble)); o.add(wbox(2.4, 0.3, 0.6, dX, 3.2, h + 0.3, marble, 1));
  { const pl = mk(new THREE.PlaneGeometry(2.6, 0.3).rotateY(Math.PI / 2).translate(w + 0.04, H - 0.55, h / 2), smat(null, '#c8b890', { rough: 0.5 })); o.add(pl); for (let k = 0; k < 9; k++) o.add(wbox(0.012, 0.16, 0.14, w + 0.05, H - 0.55, h / 2 - 1.1 + k * 0.27, smat(null, '#5a4a30'))); }
  /* braseiros na colunata */
  for (const z of [0.6, h - 0.6]) { o.add(mk(new THREE.CylinderGeometry(0.22, 0.1, 0.3, 10).translate(CX + 0.45, 0.75, z), bronze)); o.add(mk(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 6).translate(CX + 0.45, 0.4, z), bronze)); o.add(mk(new THREE.ConeGeometry(0.14, 0.32, 8).translate(CX + 0.45, 1.05, z), smat(null, '#ffb040', { emissive: '#ff8020', ei: night ? 2.2 : 1.0 }))); }
  return o; }
// ---------- Casa de Veludo: palácio rosa e dourado com pátio aberto, fonte, escadaria dupla, varandas e lanternas vermelhas ----------
function mVelvet(b, night) {
  const w = b.w, h = b.h, { H } = bldDims(b), o = grp(), dX = doorCol(b) + 0.5, D = 3.4;   /* D: profundidade das alas em volta do pátio */
  const rose = smat('plaster', '#a8455a', { bump: 0.5 }), cream = smat('stoneblock', '#f0e2c8', { bump: 0.6 }), gold = smat(null, '#d8b050', { metal: 0.85, rough: 0.3 }), marble = smat('stoneblock', '#f2ece2', { bump: 0.3 }), wood = smat('wood', '#3a1a12', { bump: 0.8 }), tile = smat('shingle', '#7a2a2a', { bump: 1 });
  const glass = NB.glow(night, '#6a1a2a', '#ff6060'), redGlow = '#ff3a3a';
  o.add(wbox(w + 0.2, 0.3, h + 0.2, w / 2, 0.15, h / 2, cream, 1));
  NB.shell(o, w, h, H, rose);
  /* faixas de cantaria creme e cunhais */
  for (const yy of [0.5, 2.55, H - 0.15]) o.add(wbox(w + 0.12, 0.16, h + 0.12, w / 2, yy, h / 2, cream, 1)); for (const [cx, cz] of [[0, 0], [w, 0], [0, h], [w, h]]) o.add(wbox(0.4, H, 0.4, cx, H / 2, cz, cream, 1));
  NB.wins(o, w, h, 1.5, 1.6, 0.55, 1.0, gold, glass, true, true, dX); NB.wins(o, w, h, 3.6, 1.6, 0.55, 1.1, gold, glass, true, false, dX);
  /* telhado das alas (quatro águas em volta do pátio aberto) e balaustrada dourada com urnas */
  const yR = H, rr = 1.1; for (const [x0, z0, ww, dd] of [[0, 0, w, D], [0, h - D, w, D], [0, D, D, h - 2 * D], [w - D, D, D, h - 2 * D]]) { o.add(wbox(ww, 0.15, dd, x0 + ww / 2, yR + 0.07, z0 + dd / 2, cream, 1)); }
  { const s1 = mk(new THREE.BoxGeometry(w + 0.3, 0.1, Math.hypot(D, rr)), tile); s1.position.set(w / 2, yR + rr / 2 + 0.1, D / 2); s1.rotation.x = Math.atan2(rr, D); o.add(s1); const s2 = s1.clone(); s2.position.z = h - D / 2; s2.rotation.x = -Math.atan2(rr, D); o.add(s2);
    const s3 = mk(new THREE.BoxGeometry(Math.hypot(D, rr), 0.1, h - 2 * D + 0.1), tile); s3.position.set(D / 2, yR + rr / 2 + 0.1, h / 2); s3.rotation.z = -Math.atan2(rr, D); o.add(s3); const s4 = s3.clone(); s4.position.x = w - D / 2; s4.rotation.z = Math.atan2(rr, D); o.add(s4); }
  for (let k = 0; k <= 12; k++) for (const [x, z] of [[k * w / 12, -0.05], [k * w / 12, h + 0.05], [-0.05, k * h / 12], [w + 0.05, k * h / 12]]) { o.add(mk(new THREE.CylinderGeometry(0.045, 0.06, 0.38, 8).translate(x, yR + 0.34, z), cream)); }
  for (const [x, z, ww, dd] of [[w / 2, -0.05, w + 0.1, 0.12], [w / 2, h + 0.05, w + 0.1, 0.12], [-0.05, h / 2, 0.12, h + 0.1], [w + 0.05, h / 2, 0.12, h + 0.1]]) o.add(wbox(ww, 0.08, dd, x, yR + 0.56, z, gold, 1));
  for (const [x, z] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0], [w, h / 2]]) { o.add(mk(new THREE.SphereGeometry(0.17, 12, 8).scale(1, 1.2, 1).translate(x, yR + 0.82, z), gold)); o.add(mk(new THREE.CylinderGeometry(0.12, 0.08, 0.2, 10).translate(x, yR + 0.64, z), gold)); }
  /* pátio aberto: piso de mármore, paredes internas com arcadas, fonte em três taças e vasos */
  const ix0 = D, ix1 = w - D, iz0 = D, iz1 = h - D;
  o.add(wbox(ix1 - ix0, 0.04, iz1 - iz0, w / 2, yR + 0.02, h / 2, smat('marblechk', '#ffffff', { bump: 0.3, rough: 0.35 }), 1));
  for (const [x0, z0, ww, dd] of [[ix0, iz0, ix1 - ix0, 0.12], [ix0, iz1 - 0.12, ix1 - ix0, 0.12], [ix0, iz0, 0.12, iz1 - iz0], [ix1 - 0.12, iz0, 0.12, iz1 - iz0]]) o.add(wbox(ww, 0.9, dd, x0 + ww / 2, yR + 0.45, z0 + dd / 2, rose, 0.6));
  { const fx = w / 2, fz = h / 2, fy = yR + 0.04, water = smat(null, '#5ab0d0', { rough: 0.05, metal: 0.2, transparent: true, opacity: 0.85 }); o.add(mk(new THREE.CylinderGeometry(1.1, 1.15, 0.32, 24).translate(fx, fy + 0.16, fz), marble)); o.add(mk(new THREE.CylinderGeometry(1.0, 1.0, 0.04, 24).translate(fx, fy + 0.28, fz), water));
    for (const [r, y] of [[0.55, 0.75], [0.3, 1.15]]) { o.add(mk(new THREE.CylinderGeometry(0.07, 0.09, y - 0.3, 10).translate(fx, fy + 0.3 + (y - 0.3) / 2, fz), marble)); o.add(mk(new THREE.CylinderGeometry(r, r * 0.6, 0.12, 18).translate(fx, fy + y, fz), gold)); o.add(mk(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.02, 18).translate(fx, fy + y + 0.06, fz), water)); }
    o.add(mk(new THREE.SphereGeometry(0.1, 10, 8).translate(fx, fy + 1.4, fz), gold));
    for (const [px, pz] of [[ix0 + 0.5, iz0 + 0.5], [ix1 - 0.5, iz0 + 0.5], [ix0 + 0.5, iz1 - 0.5], [ix1 - 0.5, iz1 - 0.5]]) { o.add(mk(new THREE.CylinderGeometry(0.22, 0.16, 0.36, 12).translate(px, fy + 0.18, pz), cream)); o.add(mk(new THREE.SphereGeometry(0.32, 10, 8).translate(px, fy + 0.6, pz), smat(null, '#3a6a2a', { rough: 0.9 }))); for (let k = 0; k < 5; k++) o.add(mk(new THREE.SphereGeometry(0.05, 6, 4).translate(px + Math.cos(k * 1.3) * 0.25, fy + 0.7 + (k % 2) * 0.1, pz + Math.sin(k * 1.3) * 0.25), smat(null, '#e8406a'))); }
    /* cordões de lanternas cruzando o pátio */
    for (const [a, c] of [[[ix0, iz0], [ix1, iz1]], [[ix1, iz0], [ix0, iz1]]]) for (let k = 1; k < 6; k++) { const t2 = k / 6, x = a[0] + (c[0] - a[0]) * t2, z = a[1] + (c[1] - a[1]) * t2, y = yR + 1.7 - Math.sin(t2 * Math.PI) * 0.4; o.add(mk(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 1.3, 1).translate(x, y, z), smat(null, redGlow, { emissive: redGlow, ei: night ? 2.0 : 0.5, transparent: true, opacity: 0.9 }))); } }
  /* escadaria dupla no lado que a câmera vê, subindo a uma varanda com porta dourada */
  { const SX = w + 0.05, bw = 0.9, top = 2.55, mid = h / 2, run = 2.6, dark = smat('stoneblock', '#e6dac2', { bump: 0.5 });
    o.add(wbox(1.2, 0.12, 2.6, SX + 0.55, top, mid, cream, 1)); for (let z = mid - 1.25; z <= mid + 1.25; z += 0.2) o.add(mk(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 8).translate(SX + 1.1, top + 0.3, z), cream)); o.add(wbox(0.1, 0.07, 2.6, SX + 1.1, top + 0.58, mid, gold, 1));
    NB.door(o, SX - 0.02, mid, Math.PI / 2, 1.0, 2.0, wood, gold); o.children[o.children.length - 1].position.y = top;
    for (const s of [-1, 1]) { const n = 12; for (let k = 0; k < n; k++) { const y = (k + 1) * top / n, z = mid + s * (1.3 + run - (k + 0.5) * run / n); o.add(wbox(bw, 0.06 + y, run / n + 0.02, SX + 0.55 + 0.1, y / 2, z, dark, 1)); }
      const rail = mk(new THREE.BoxGeometry(0.08, 0.08, Math.hypot(run, top)), gold); rail.position.set(SX + 1.1, top / 2 + 0.55, mid + s * (1.3 + run / 2)); rail.rotation.x = s * Math.atan2(top, run); o.add(rail); } }
  /* varandas com flores e lanternas vermelhas penduradas por toda a volta */
  for (const z of [1.6, h - 1.6]) { o.add(wbox(0.6, 0.1, 1.4, w + 0.3, 2.62, z, cream, 1)); for (let k = 0; k < 7; k++) o.add(mk(new THREE.CylinderGeometry(0.025, 0.035, 0.45, 6).translate(w + 0.58, 2.88, z - 0.6 + k * 0.2), gold)); o.add(wbox(0.18, 0.18, 1.2, w + 0.5, 2.78, z, smat(null, '#3a6a2a', { rough: 0.9 }), 1)); for (let k = 0; k < 6; k++) o.add(mk(new THREE.SphereGeometry(0.06, 6, 4).translate(w + 0.55, 2.9, z - 0.5 + k * 0.2), smat(null, k % 2 ? '#e8406a' : '#f0c0d0'))); }
  for (let z = 0.8; z < h; z += 1.6) NB.lantern(o, w, 2.2, z, 0, redGlow, night); for (let x = 0.8; x < w; x += 1.6) NB.lantern(o, x, 2.2, 0, Math.PI / 2, redGlow, night);
  NB.door(o, dX, h + 0.03, 0, 1.3, 2.3, wood, gold); for (const s of [-0.9, 0.9]) NB.lantern(o, dX + s, 2.3, h, -Math.PI / 2, redGlow, night);
  return o; }
// ---------- móveis novos (o resto da mobília fica em scene3d.js) ----------
function furnX(g, f, C) {
  const rot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][f.v | 0], sub = grp(), leather = smat('leather', '#5a2a1a', { bump: 0.6 }), dw = smat('wood', '#2e1a10', { bump: 0.8 }), brass = smat(null, '#c9a24a', { metal: 0.9, rough: 0.3 }), marble = smat('stoneblock', '#f2ece2', { bump: 0.3 });
  const velvet = smat('cloth', '#7a1030', { bump: 0.4 }), goldM = smat(null, '#d8b050', { metal: 0.85, rough: 0.3 });
  switch (f.t) {
    case 'armchair': sub.add(wbox(0.7, 0.36, 0.66, 0, 0.26, 0, leather, 1)); sub.add(wbox(0.7, 0.62, 0.16, 0, 0.62, -0.26, leather, 1)); for (const s of [-1, 1]) sub.add(wbox(0.14, 0.24, 0.62, s * 0.3, 0.52, 0, leather, 1)); for (const [x, z] of [[-0.28, -0.26], [0.28, -0.26], [-0.28, 0.26], [0.28, 0.26]]) sub.add(mk(new THREE.CylinderGeometry(0.03, 0.025, 0.1, 6).translate(x, 0.05, z), dw)); break;
    case 'cardtable': { const r = Math.min(f.w, f.h) * 0.36; sub.add(mk(new THREE.CylinderGeometry(r, r, 0.05, 24).translate(0, 0.74, 0), smat('cloth', '#1e5a32', { bump: 0.2 }))); sub.add(mk(new THREE.TorusGeometry(r, 0.035, 6, 24).rotateX(Math.PI / 2).translate(0, 0.76, 0), dw)); sub.add(mk(new THREE.CylinderGeometry(0.08, 0.2, 0.72, 10).translate(0, 0.36, 0), dw));
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4, ch = grp(); ch.add(wbox(0.42, 0.06, 0.42, 0, 0.45, 0, leather, 1)); ch.add(wbox(0.42, 0.5, 0.06, 0, 0.72, -0.2, dw, 1)); for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) ch.add(wbox(0.04, 0.44, 0.04, x, 0.22, z, dw)); ch.position.set(Math.sin(a) * (r + 0.32), 0, Math.cos(a) * (r + 0.32)); ch.rotation.y = a + Math.PI; sub.add(ch); }
      for (let k = 0; k < 5; k++) { const cd = mk(new THREE.PlaneGeometry(0.07, 0.1).rotateX(-Math.PI / 2).translate(Math.cos(k) * r * 0.5, 0.772, Math.sin(k) * r * 0.5), smat(null, '#f4f0e8')); cd.rotation.y = k; sub.add(cd); } for (let k = 0; k < 3; k++) sub.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.02 + k * 0.02, 10).translate(-r * 0.4 + k * 0.1, 0.78 + k * 0.01, r * 0.2), brass)); break; }
    case 'chesstable': { sub.add(wbox(0.6, 0.04, 0.6, 0, 0.72, 0, dw, 1)); sub.add(mk(new THREE.CylinderGeometry(0.06, 0.14, 0.7, 8).translate(0, 0.35, 0), dw)); const lt = smat(null, '#e8dcc0'), dk = smat(null, '#2a1a10'); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) sub.add(wbox(0.06, 0.012, 0.06, -0.21 + i * 0.06, 0.745, -0.21 + j * 0.06, (i + j) % 2 ? dk : lt));
      for (let k = 0; k < 6; k++) sub.add(mk(new THREE.CylinderGeometry(0.012, 0.018, 0.05 + (k % 3) * 0.02, 6).translate(-0.18 + k * 0.07, 0.775, k % 2 ? -0.18 : 0.18), k % 2 ? dk : lt)); for (const s of [-1, 1]) { const ar = grp(); ar.add(wbox(0.62, 0.32, 0.6, 0, 0.24, 0, leather, 1)); ar.add(wbox(0.62, 0.55, 0.14, 0, 0.6, -0.24, leather, 1)); ar.position.set(0, 0, s * 0.62); ar.rotation.y = s > 0 ? Math.PI : 0; ar.scale.setScalar(0.85); sub.add(ar); } break; }
    case 'bookwall': { const L = Math.max(f.w, f.h); sub.add(wbox(L - 0.05, 2.3, 0.36, 0, 1.15, -0.3, dw, 1)); const cols = ['#5a1a1a', '#1a3a5a', '#2a4a2a', '#6a4a1a', '#3a2a4a', '#7a6a4a']; for (let r = 0; r < 5; r++) { sub.add(wbox(L - 0.15, 0.03, 0.3, 0, 0.2 + r * 0.44, -0.26, dw)); for (let x = -L / 2 + 0.15; x < L / 2 - 0.15; x += 0.075) { const hh = 0.26 + ((x * 37 + r * 13) % 7) * 0.015; sub.add(wbox(0.06, hh, 0.22, x, 0.22 + r * 0.44 + hh / 2, -0.27, smat(null, cols[Math.abs(Math.round(x * 40 + r * 3)) % cols.length], { rough: 0.8 }))); } } if (f.h > f.w) sub.rotation.y = Math.PI / 2; break; }
    case 'clubbar': { const L = Math.max(f.w, f.h); sub.add(wbox(0.6, 1.05, L - 0.1, 0, 0.525, 0, dw, 1)); sub.add(wbox(0.72, 0.06, L, 0, 1.08, 0, smat('stoneblock', '#3a2a24', { bump: 0.3, rough: 0.3 }), 1)); sub.add(mk(new THREE.CylinderGeometry(0.025, 0.025, L - 0.2, 8).rotateX(Math.PI / 2).translate(0.36, 0.2, 0), brass));
      for (let k = 0; k < Math.floor(L / 0.2); k++) sub.add(mk(new THREE.CylinderGeometry(0.035, 0.04, 0.24, 8).translate(-0.15, 1.23, -L / 2 + 0.15 + k * 0.2), smat(null, ['#3a1a10', '#5a6a2a', '#8a4a1a', '#c8b060'][k % 4], { transparent: true, opacity: 0.85, rough: 0.1 }))); if (f.w > f.h) sub.rotation.y = Math.PI / 2; break; }
    case 'nrug': sub.add(mk(new THREE.BoxGeometry(f.w - 0.2, 0.015, f.h - 0.2).translate(0, 0.07, 0), smat('cloth', f.v === 1 ? '#5a0a1a' : '#5a2a1a', { bump: 0.3 }))); sub.add(mk(new THREE.BoxGeometry(f.w - 0.5, 0.017, f.h - 0.5).translate(0, 0.072, 0), smat('cloth', f.v === 1 ? '#8a1a30' : '#2a3a5a', { bump: 0.3 }))); return g.add(sub);
    case 'tpool': { const hot = f.v === 1, wa = smat(null, hot ? '#6ac0c8' : '#3a8ac0', { rough: 0.05, metal: 0.2, transparent: true, opacity: 0.85, emissive: hot ? '#2a6a70' : '#000000', ei: hot ? 0.3 : 0 }); const W2 = f.w - 0.1, D2 = f.h - 0.1;
      for (const [x, z, ww, dd] of [[0, -D2 / 2, W2, 0.2], [0, D2 / 2, W2, 0.2], [-W2 / 2, 0, 0.2, D2], [W2 / 2, 0, 0.2, D2]]) sub.add(wbox(ww, 0.32, dd, x, 0.16, z, marble, 1)); sub.add(mk(new THREE.BoxGeometry(W2 - 0.2, 0.02, D2 - 0.2).translate(0, 0.2, 0), wa));
      const cols = ['#2a5a9a', '#e8c060', '#3a8a9a']; let k = 0; for (let x = -W2 / 2 + 0.2; x < W2 / 2 - 0.1; x += 0.25) for (const z of [-D2 / 2 + 0.11, D2 / 2 - 0.11]) sub.add(wbox(0.22, 0.012, 0.06, x, 0.325, z, smat(null, cols[k++ % 3])));
      if (hot) { const st = smat(null, '#ffffff', { transparent: true, opacity: 0.07, rough: 1, side: THREE.DoubleSide, depthWrite: false }); for (let q = 0; q < 5; q++) { const sp = mk(new THREE.CircleGeometry(0.35, 12), st, false); sp.position.set(-W2 / 3 + q * W2 / 6, 0.6 + (q % 2) * 0.3, (q % 3 - 1) * D2 / 4); sp.rotation.y = q * 0.9; sub.add(sp); } } break; }
    case 'column': sub.add(mk(new THREE.CylinderGeometry(0.16, 0.19, 2.6, 14).translate(0, 1.5, 0), marble)); sub.add(wbox(0.46, 0.16, 0.46, 0, 0.08, 0, marble, 1)); sub.add(wbox(0.5, 0.18, 0.5, 0, 2.86, 0, marble, 1)); break;
    case 'tbench': sub.add(wbox(f.w - 0.2, 0.08, 0.45, 0, 0.42, 0, marble, 1)); for (const s of [-1, 1]) sub.add(wbox(0.3, 0.38, 0.4, s * (f.w / 2 - 0.35), 0.19, 0, marble, 1)); if (f.h > f.w) sub.rotation.y = Math.PI / 2; break;
    case 'perfume': { const L = Math.max(f.w, f.h); sub.add(wbox(L - 0.1, 0.9, 0.55, 0, 0.45, 0, marble, 1)); sub.add(wbox(L, 0.05, 0.62, 0, 0.92, 0, goldM, 1)); const cs = ['#e85a8a', '#8a5ae8', '#5ac8e8', '#e8c05a', '#5ae88a']; for (let k = 0; k < 9; k++) sub.add(mk(new THREE.SphereGeometry(0.05 + (k % 3) * 0.01, 10, 8).scale(1, 1.4, 1).translate(-L / 2 + 0.2 + k * (L - 0.4) / 8, 1.02, (k % 2) * 0.12 - 0.06), smat(null, cs[k % 5], { transparent: true, opacity: 0.75, rough: 0.05 }))); if (f.h > f.w) sub.rotation.y = Math.PI / 2; break; }
    case 'divan': { const L = Math.max(f.w, f.h); g.userData.dv = 1; sub.add(wbox(0.75, 0.3, L - 0.15, 0, 0.25, 0, velvet, 1)); sub.add(wbox(0.18, 0.5, L - 0.15, -0.3, 0.55, 0, velvet, 1)); sub.add(wbox(0.6, 0.45, 0.18, 0, 0.5, -(L - 0.3) / 2, velvet, 1)); for (const z of [-L / 4, L / 4]) sub.add(mk(new THREE.SphereGeometry(0.15, 10, 8).scale(1, 0.6, 1.3).translate(-0.12, 0.48, z), goldM)); sub.add(wbox(0.8, 0.04, L - 0.1, 0, 0.08, 0, goldM)); sub.rotation.y = (f.w > f.h ? -Math.PI / 2 : 0) + rot; g.add(sub); return; }
    case 'drape': { const L = Math.max(f.w, f.h), m = smat('cloth', '#8a1a2a', { bump: 0.4, side: THREE.DoubleSide }); const gm = new THREE.PlaneGeometry(L, 2.4, 24, 1), p = gm.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.06); gm.computeVertexNormals(); sub.add(mk(gm.translate(0, 1.25, -0.4), m)); sub.add(mk(new THREE.CylinderGeometry(0.03, 0.03, L, 8).rotateZ(Math.PI / 2).translate(0, 2.47, -0.4), goldM)); if (f.h > f.w) sub.rotation.y = Math.PI / 2; break; }
    case 'redlantern': { const c = '#ff3a3a'; sub.add(mk(new THREE.SphereGeometry(0.16, 12, 8).scale(1, 1.3, 1).translate(0, 2.25, 0), smat(null, c, { emissive: c, ei: 1.4, transparent: true, opacity: 0.92 }))); sub.add(wbox(0.01, 0.4, 0.01, 0, 2.65, 0, goldM)); for (const y of [2.04, 2.46]) sub.add(mk(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 10).translate(0, y, 0), goldM)); break; }
    case 'fountain2': { const water = smat(null, '#5ab0d0', { rough: 0.05, metal: 0.2, transparent: true, opacity: 0.85 }), R2 = Math.min(f.w, f.h) * 0.45; sub.add(mk(new THREE.CylinderGeometry(R2, R2 + 0.05, 0.4, 28).translate(0, 0.2, 0), marble)); sub.add(mk(new THREE.CylinderGeometry(R2 - 0.1, R2 - 0.1, 0.04, 28).translate(0, 0.36, 0), water));
      for (const [r, y] of [[R2 * 0.5, 0.95], [R2 * 0.28, 1.4]]) { sub.add(mk(new THREE.CylinderGeometry(0.08, 0.1, y - 0.36, 10).translate(0, 0.36 + (y - 0.36) / 2, 0), marble)); sub.add(mk(new THREE.CylinderGeometry(r, r * 0.6, 0.12, 20).translate(0, y, 0), goldM)); sub.add(mk(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.02, 20).translate(0, y + 0.06, 0), water)); }
      sub.add(mk(new THREE.SphereGeometry(0.11, 10, 8).translate(0, 1.66, 0), goldM)); for (const [x, z] of [[R2 - 0.1, 0], [-R2 + 0.1, 0], [0, R2 - 0.1], [0, -R2 + 0.1]]) sub.add(mk(new THREE.SphereGeometry(0.24, 10, 8).translate(x * 1.25, 0.55, z * 1.25), smat(null, '#3a6a2a', { rough: 0.9 }))); break; }
    case 'dstair': { const L = f.w, top = 2.0, st = smat('stoneblock', '#e6dac2', { bump: 0.5 }); sub.add(wbox(L * 0.36, 0.14, 0.9, 0, top, -f.h / 2 + 0.45, marble, 1)); for (let z = -L * 0.17; z <= L * 0.17; z += 0.18) sub.add(mk(new THREE.CylinderGeometry(0.03, 0.045, 0.45, 8).translate(z, top + 0.28, -f.h / 2 + 0.9), marble)); sub.add(wbox(L * 0.36, 0.06, 0.08, 0, top + 0.53, -f.h / 2 + 0.9, goldM, 1));
      for (const s of [-1, 1]) { const n = 10, run = L * 0.32; for (let k = 0; k < n; k++) { const y = (k + 1) * top / n, x = s * (L * 0.18 + run - (k + 0.5) * run / n); sub.add(wbox(run / n + 0.02, 0.06 + y, 0.85, x, y / 2, -f.h / 2 + 0.45, st, 1)); } const rl = mk(new THREE.BoxGeometry(Math.hypot(run, top), 0.07, 0.07), goldM); rl.position.set(s * (L * 0.18 + run / 2), top / 2 + 0.5, -f.h / 2 + 0.88); rl.rotation.z = -s * Math.atan2(top, run); sub.add(rl); }
      sub.add(wbox(L * 0.3, 2.4, 0.1, 0, top + 1.2, -f.h / 2 + 0.05, smat('cloth', '#7a1030', { bump: 0.4 }), 1)); break; }
    default: return;
  }
  if (rot && !['bookwall', 'clubbar', 'tbench', 'perfume', 'divan', 'drape'].includes(f.t)) sub.rotation.y = rot;
  g.add(sub); }
