/* Muralha histórica (lista 16, item 1) — PROTÓTIPO: só liga com ?muralha=nova
   Trecho do portão sul: bar de York com barbacã, ronda coberta (estilo Rothenburg) e torres quadradas de telhado alto. */
const MUR_PROTO = typeof location !== 'undefined' && /[?&]muralha=nova/.test(location.search);
const MUR = { k: new Uint8Array(MAP_W * MAP_H), barb: null };   /* k: 1 ronda coberta · 2 muro da barbacã · 3 muro da barbacã com o arco de fora */
if (MUR_PROTO && !TEST3D) (function murTiles() {
  const W = WORLD, idx = (x, y) => y * MAP_W + x, gi = W.gates.findIndex(g => g.kind === 'main'); if (gi < 0) return;
  const gt = W.gates[gi], y1 = gt.y, gx0 = gt.x0, gx1 = gt.x1; gt.bar = 1;
  const setT = (x, y, o, fl, wd) => { const i = idx(x, y); W.obj[i] = o; W.fl1[i] = fl; if (wd !== undefined) W.wdir[i] = wd; W.ground[i] = W.ground[i] === T.WATER ? T.WATER : T.FLOORSTONE; W.rdir[i] = 0; };
  /* torres do portão: viram o corpo do bar (o modelo do portão desenha tudo) */
  for (const tx of [gx0 - 2, gx1 + 1]) for (let y = y1 - 1; y <= y1; y++) for (let x = tx; x <= tx + 1; x++) setT(x, y, O.PART, 0);
  /* barbacã: dois muros saindo 2 casas (até a ponte do fosso) para fora, o arco de fora preso no muro leste */
  for (let y = y1 + 1; y <= y1 + 2; y++) { setT(gx0 - 1, y, O.WALL, 0, 2); setT(gx1 + 1, y, O.WALL, 0, 1); MUR.k[idx(gx0 - 1, y)] = 2; MUR.k[idx(gx1 + 1, y)] = y === y1 + 2 ? 3 : 2; for (let x = gx0; x <= gx1; x++) { const i = idx(x, y); if (W.obj[i] !== O.NONE && W.obj[i] !== O.GATE) W.obj[i] = O.NONE; W.ground[i] = T.FLOORSTONE; W.rdir[i] = 2; } }
  MUR.barb = { gi, x0: gx0, x1: gx1, y1 };
  /* torres quadradas para fora (as duas redondas mais perto do portão saem) */
  const sq = []; for (let x = gx0 - 16; x <= gx1 + 16; x++) { const i = idx(x, y1); if (W.obj[i] === O.TOWER && Math.abs(x - (gx0 + gx1) / 2) > 4) sq.push(x - 1); }
  for (const tx of sq) { for (let y = y1 - 1; y <= y1 - 1; y++) for (let x = tx; x <= tx + 1; x++) { setT(x, y, O.NONE, 0, 0); W.ground[idx(x, y)] = T.COBBLE; }
    for (let x = tx; x <= tx + 1; x++) { setT(x, y1, O.PART, 1); setT(x, y1 + 1, O.PART, 1); }
    const a = idx(tx + 1, y1 + 1); W.obj[a] = O.TOWER; W.tvar[a] = 6; W.toff[a] = 0; }
  /* ronda coberta: 12 casas de cada lado do portão */
  for (let x = gx0 - 14; x <= gx1 + 14; x++) { const i = idx(x, y1); if (W.obj[i] === O.WALL) { MUR.k[i] = 1; W.wdir[i] = 3; } }
})();

/* ---------- modelos ---------- */
function murCovWall(od, e) {   /* muro com ronda coberta: parapeito alto com seteiras, telhado de telha em meia-água sobre esteios */
  const o = grp(), H = WALL_H, out = od || 3, ax = out === 3 || out === 4, s = out === 1 || out === 3 ? 1 : -1;
  const P = (a, z) => ax ? [a, z * s] : [z * s, a];   /* a: ao longo do muro · z: para fora */
  const B = (la, h, lz, a, y, z, m, k) => { const [x, zz] = P(a, z); return wbox(ax ? la : lz, h, ax ? lz : la, x, y, zz, m, k); };
  const capM = smat('stoneblock', '#b0a998', { bump: 1 }), roofM = smat('slate', '#a04a2e', { bump: 1.2 }), wd = DWOOD(), dark = smat(null, '#151311');
  o.add(gwall(1, H - 0.08, 1, 0, (H - 0.08) / 2, 0, 'brick', '#a29c90', H, 7, 1, 1.4));
  o.add(wbox(1, 0.08, 1, 0, H - 0.04, 0, capM, 1));
  o.add(B(1, 0.5, 0.14, 0, 0.25, 0.53, smat('stoneblock', '#8a857a', { bump: 1.4 }), 1.2));
  o.add(B(1, 1.15, 0.22, 0, H + 0.575, 0.39, smat('brick', '#a29c90', { bump: 1.4 }), 1.4));   /* parapeito cheio */
  o.add(B(0.07, 0.42, 0.24, 0, H + 0.62, 0.39, dark));                                          /* seteira */
  const yo = H + 1.62, yi = H + 1.28, zo = 0.56, zi = -0.62, L = Math.hypot(zo - zi, yo - yi), ang = Math.atan2(yo - yi, zo - zi);
  { const r = wbox(ax ? 1.02 : L + 0.08, 0.06, ax ? L + 0.08 : 1.02, 0, 0, 0, roofM, 1.4), [px, pz] = P(0, (zo + zi) / 2); r.position.set(px, (yo + yi) / 2, pz); if (ax) r.rotation.x = -ang * s; else r.rotation.z = ang * s; o.add(r); }
  o.add(B(1, 0.1, 0.1, 0, yi - 0.12, -0.44, wd));                                             /* frechal */
  o.add(B(0.09, yi - 0.12 - H, 0.09, 0, H + (yi - 0.12 - H) / 2, -0.44, wd));                 /* esteio */
  o.add(B(0.05, 0.05, 0.62, 0, H + 1.0, -0.12, wd));                                          /* linha do telhado */
  o.add(B(1, 0.05, 0.6, 0, H + 0.03, -0.15, smat('wood', '#7a5a3a', { bump: 1 }), 1.5));      /* tabuado da ronda */
  return o;
}
function murSqTower(v) {   /* torre quadrada de telhado alto (Rothenburg), 2x2, saliente para fora */
  const o = grp(), H = WALL_H, HT = H * 1.75, w = 1.9, alongX = v === 6;
  const st = smat('brick', '#a29c90', { bump: 1.4 }), capM = smat('stoneblock', '#b0a998', { bump: 1 }), roofM = smat('slate', '#a04a2e', { bump: 1.4 }), dark = smat(null, '#151311'), wd = DWOOD();
  o.add(gwall(w, HT, w, 0, HT / 2, 0, 'brick', '#a29c90', HT, 31, 1, 1.4));
  o.add(wbox(w + 0.16, 0.6, w + 0.16, 0, 0.3, 0, smat('stoneblock', '#8a857a', { bump: 1.4 }), 1.2));   /* sapata */
  for (const y of [H - 0.1, HT - 0.05]) o.add(wbox(w + 0.08, 0.1, w + 0.08, 0, y, 0, capM, 1.2));          /* cordões */
  /* passagem da ronda: portinhas nos dois lados do muro */
  for (const sd of [-1, 1]) { const [x, z] = alongX ? [sd * (w / 2 + 0.005), -0.35] : [-0.35, sd * (w / 2 + 0.005)]; o.add(wbox(alongX ? 0.02 : 0.5, 0.95, alongX ? 0.5 : 0.02, x, H + 0.48, z, dark)); }
  /* seteiras e janelinhas nas três faces de fora */
  for (const [fx, fz] of [[0, 1], [1, 0], [-1, 0]]) { const fx2 = alongX ? fx : fz, fz2 = alongX ? fz : fx;
    for (const [t, y, hh] of [[0, 1.4, 0.5], [0, 3.0, 0.5], [0, H + 1.6, 0.4]]) { const px = fx2 * (w / 2 + 0.01) + (fx2 ? 0 : t), pz = fz2 * (w / 2 + 0.01) + (fz2 ? 0 : t); o.add(wbox(fx2 ? 0.02 : 0.09, hh, fz2 ? 0.02 : 0.09, px, y, pz, dark)); }
    const px = fx2 * (w / 2 + 0.01), pz = fz2 * (w / 2 + 0.01); for (const t of [-0.17, 0.17]) o.add(wbox(fx2 ? 0.02 : 0.22, 0.42, fz2 ? 0.02 : 0.22, px + (fx2 ? 0 : t), HT - 0.75, pz + (fz2 ? 0 : t), dark)); }
  /* beiral e telhado de quatro águas bem alto */
  o.add(wbox(w + 0.3, 0.08, w + 0.3, 0, HT + 0.04, 0, wd, 1));
  const roof = new THREE.ConeGeometry((w + 0.42) / Math.SQRT2 * 1.0, 3.3, 4, 3, true).rotateY(Math.PI / 4).translate(0, HT + 0.08 + 1.65, 0);
  o.add(mk(cylUV(roof, 5, 1.6), roofM));
  o.add(mk(new THREE.ConeGeometry(0.12, 0.08, 4).rotateY(Math.PI / 4).translate(0, HT + 0.12, 0), wd));
  o.add(mk(CYL(0.025, 0.025, 0.7, 0, HT + 3.6, 0, 6), smat('iron', '#3a3a3e', { metal: 0.8 })));
  o.add(mk(new THREE.SphereGeometry(0.07, 10, 8).translate(0, HT + 3.75, 0), smat(null, '#e2b74e', { metal: 1, rough: 0.3 })));
  /* lucarna virada para fora */
  { const [x, z] = alongX ? [0, (w + 0.42) / 2 * 0.62] : [(w + 0.42) / 2 * 0.62, 0], dg = grp(); dg.add(wbox(0.42, 0.42, 0.42, 0, 0.21, 0, st, 1)); dg.add(wbox(0.24, 0.26, 0.02, 0, 0.2, 0.22, dark)); const r = mk(new THREE.ConeGeometry(0.36, 0.34, 4, 1).rotateY(Math.PI / 4).translate(0, 0.59, 0), roofM); dg.add(r); dg.position.set(x, HT + 0.75, z); if (!alongX) dg.rotation.y = Math.PI / 2; o.add(dg); }
  return o;
}
function murMerlons(o, x0, x1, z0, z1, y, m, sides) {   /* ameias ao longo de um retângulo */
  const put = (x, z, w, d) => o.add(mk(wuv(new THREE.BoxGeometry(w, 0.42, d).translate(x, y + 0.21, z), 1.5), m));
  if (sides.includes('f')) for (let x = x0 + 0.2; x <= x1 - 0.15; x += 0.5) put(x, z1 - 0.1, 0.28, 0.2);
  if (sides.includes('b')) for (let x = x0 + 0.2; x <= x1 - 0.15; x += 0.5) put(x, z0 + 0.1, 0.28, 0.2);
  if (sides.includes('l')) for (let z = z0 + 0.2; z <= z1 - 0.15; z += 0.5) put(x0 + 0.1, z, 0.2, 0.28);
  if (sides.includes('r')) for (let z = z0 + 0.2; z <= z1 - 0.15; z += 0.5) put(x1 - 0.1, z, 0.2, 0.28);
}
function murBar(gt, f, pc) {   /* bar de York: casa de porta retangular de 3 andares sobre o arco, torrinhas redondas nos cantos */
  const o = mGateHouse0(Object.assign({}, gt, { kind: 'main' }), f, pc), n = gt.x1 - gt.x0 + 1, L = -(n - 0.5), z = gt.out;
  const XL = L - 2, XR = 2.5, ZF = 0.5, ZB = -1.5, gh = 6.4, HB = 8.8, spring = 2.9;
  const st = smat('brick', '#aaa395', { bump: 1.4 }), capM = smat('stoneblock', '#b8b1a0', { bump: 1 }), dark = smat(null, '#151311'), lit = smat(null, '#ffd890', { emissive: '#7a5a20', ei: 0.35 });
  const Z = v => v * z;   /* tudo desenhado com a frente para +z e espelhado se o portão olha para -z */
  const box = (x0, x1, y0, y1, z0, z1, m) => wbox(x1 - x0, y1 - y0, Math.abs(Z(z1) - Z(z0)), (x0 + x1) / 2, (y0 + y1) / 2, (Z(z0) + Z(z1)) / 2, m || st, 1.2);
  o.add(box(XL, L, 0, HB, ZB, ZF)); o.add(box(0.5, XR, 0, HB, ZB, ZF));            /* blocos dos lados */
  o.add(box(L, 0.5, gh - 0.1, HB, ZB, ZF - 0.02));                                     /* andares de cima sobre o arco */
  o.add(box(L, 0.5, spring + 1.6, gh, ZB, ZB + 1));                                    /* face de dentro, sobre a passagem */
  o.add(box(L, 0.5, spring + 1.5, spring + 1.62, ZB, ZF, smat('stoneblock', '#8e897e')));   /* teto da passagem */
  for (const y of [gh - 0.05, gh + 1.25]) o.add(box(XL - 0.04, XR + 0.04, y, y + 0.1, ZB - 0.04, ZF + 0.04, capM));   /* cordões entre os andares */
  o.add(box(XL - 0.08, XR + 0.08, HB - 0.1, HB + 0.04, ZB - 0.08, ZF + 0.08, capM));   /* cornija */
  /* ameias na volta toda, com figuras de pedra na frente (como as de Micklegate) */
  const mer = grp(); murMerlons(mer, XL, XR, ZB, ZF, HB, capM, 'fblr'); if (z < 0) mer.scale.z = -1; o.add(mer);
  for (const fx of [L + 0.6, -0.5]) { const fg = grp(); fg.add(mk(CYL(0.09, 0.12, 0.42, 0, 0.21, 0, 8), capM)); fg.add(mk(new THREE.SphereGeometry(0.08, 8, 6).translate(0, 0.5, 0), capM)); fg.position.set(fx, HB + 0.42, Z(ZF - 0.1)); o.add(fg); }
  /* janelas: seteiras nos blocos, janela gótica de duas luzes no centro, brasão grande */
  for (const cx of [(XL + L) / 2, (0.5 + XR) / 2]) for (const y of [1.6, 3.4, 5.2, 7.4]) o.add(box(cx - 0.05, cx + 0.05, y, y + 0.55, ZF, ZF + 0.02, dark));
  const cx = -(n - 1) / 2;
  for (const t of [-0.28, 0.28]) { o.add(box(cx + t - 0.18, cx + t + 0.18, gh + 1.55, gh + 2.35, ZF, ZF + 0.02, lit)); o.add(mk(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2).translate(cx + t, gh + 2.35, Z(ZF + 0.01)), lit)); }
  o.add(box(cx - 0.03, cx + 0.03, gh + 1.55, gh + 2.5, ZF, ZF + 0.04, capM));
  for (const y of [gh + 0.3]) for (const t of [-1.2, -0.4, 0.4, 1.2]) o.add(box(cx + t - 0.08, cx + t + 0.08, y, y + 0.55, ZF, ZF + 0.02, dark));
  { const sh = new THREE.MeshStandardMaterial({ map: heraldTex('shield'), transparent: true, alphaTest: 0.5, roughness: 0.6, metalness: 0.2 }); for (const sx of [(XL + L) / 2, (0.5 + XR) / 2]) { const sp = mk(new THREE.PlaneGeometry(0.8, 1.0), sh); sp.position.set(sx, gh + 1.0, Z(ZF + 0.03)); if (z < 0) sp.rotation.y = Math.PI; o.add(sp); } }
  /* torrinhas redondas nos quatro cantos, sobre mísulas, mais altas que a cornija */
  for (const [tx, tz, r] of [[XL, ZF, 0.5], [XR, ZF, 0.5], [XL, ZB, 0.4], [XR, ZB, 0.4]]) { const y0 = HB - 2.4, y1 = HB + 0.9;
    o.add(mk(cylUV(new THREE.CylinderGeometry(r, r, y1 - y0, 18, 1, true).translate(tx, (y0 + y1) / 2, Z(tz)), 3, 1), st));
    o.add(mk(new THREE.ConeGeometry(r, 0.7, 18, 1, true).rotateX(Math.PI).translate(tx, y0 - 0.35, Z(tz)), st));
    o.add(mk(CYL(r + 0.06, r + 0.06, 0.1, tx, y1, Z(tz), 18), capM));
    for (let k = 0; k < 8; k += 2) { const a = k / 8 * Math.PI * 2, m = mk(new THREE.BoxGeometry(0.22, 0.32, 0.14), capM); m.position.set(tx + Math.cos(a) * r, y1 + 0.2, Z(tz) + Math.sin(a) * r); m.rotation.y = -a + Math.PI / 2; o.add(m); }
    o.add(mk(new THREE.BoxGeometry(0.06, 0.4, 0.04).translate(tx + (tx < 0 ? -r : r) * 0.72, y0 + 1.4, Z(tz) + Z(r) * 0.7), dark)); }
  /* bandeira no mastro do meio */
  o.add(mk(CYL(0.02, 0.02, 1.3, cx, HB + 0.65, Z(ZB + 0.9), 6), DWOOD()));
  o.add(mk(new THREE.PlaneGeometry(0.7, 0.42, 4, 1).translate(cx + 0.36, HB + 1.08, Z(ZB + 0.9)), smat('cloth', '#7a1a1c', { side: THREE.DoubleSide })));
  return o;
}
function murBarbArch() {   /* arco de fora da barbacã, preso no muro leste: vai por cima da passagem de 4 casas */
  const o = grp(), H = WALL_H, x0 = -4.5, x1 = -0.5, sp = 2.1, cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, ry = 1.0;
  const st = smat('brick', '#a29c90', { bump: 1.4 }), capM = smat('stoneblock', '#b0a998', { bump: 1 });
  const sh = new THREE.Shape(); sh.moveTo(x0, sp); sh.lineTo(x0, H); sh.lineTo(x1, H); sh.lineTo(x1, sp);
  for (let k = 1; k <= 18; k++) { const t = k / 18 * Math.PI; sh.lineTo(cx + rx * Math.cos(t), sp + ry * Math.sin(t)); }
  o.add(mk(wuv(new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false }).translate(0, 0, -0.2), 1), st));
  for (let k = 0; k <= 10; k++) { const t = k / 10 * Math.PI, m = mk(new THREE.BoxGeometry(0.2, 0.3, 0.06), capM); m.position.set(cx + (rx + 0.1) * Math.cos(t), sp + (ry + 0.1) * Math.sin(t), 0.52); m.rotation.z = t - Math.PI / 2; o.add(m); }
  o.add(wbox(x1 - x0, 0.08, 0.76, cx, H + 0.04, 0.15, capM, 1));
  const mer = grp(); murMerlons(mer, x0, x1, -0.2, 0.5, H + 0.08, capM, 'f'); o.add(mer);
  o.add(mWall(1, false, false, 1, 0));
  return o;
}

/* ---------- ligações com o desenho ---------- */
if (MUR_PROTO) {
  var mGateHouse0 = mGateHouse;
  mGateHouse = function (gt, f, pc) { return gt && gt.bar ? murBar(gt, f, pc) : mGateHouse0(gt, f, pc); };
  const mTower0 = mTower; mTower = function (v, off) { return v === 6 || v === 7 ? murSqTower(v) : mTower0(v, off); };
  const objS0 = objSprite;
  objSprite = function (o, x, y) {
    const i = y * MAP_W + x, k = MUR.k[i];
    if (k && o === O.WALL && typeof scen3 === 'function') { const od = WORLD.wdir[i], isT = j => WORLD.obj[j] === O.PART || WORLD.obj[j] === O.TOWER, ax = od === 3 || od === 4, e = (isT(ax ? i - 1 : i - MAP_W) ? 1 : 0) | (isT(ax ? i + 1 : i + MAP_W) ? 2 : 0);
      const s = scen3('mur|' + k + '|' + od + '|' + e, () => k === 1 ? murCovWall(od, e) : k === 3 ? murBarbArch() : mWall(1, false, false, od, e)); if (s) return s; }
    return objS0(o, x, y); };
}

/* ---------- texturas novas (pedidas em 28/11): cantaria irregular da muralha e telha rabo-de-castor ---------- */
function murTex(kind) {
  const S = 1024, c = document.createElement('canvas'), b = document.createElement('canvas'); c.width = c.height = b.width = b.height = S;
  const x = c.getContext('2d'), y = b.getContext('2d'), R = rng(hashStr(kind) + 7), gray = v => { const q = Math.round(clamp(v, 0, 1) * 255); return `rgb(${q},${q},${q})`; };
  const wrapDraw = (ctx, bx, bw, f) => { f(ctx, 0); if (bx < 0) f(ctx, S); if (bx + bw > S) f(ctx, -S); };   /* o que passa da borda aparece do outro lado: a textura emenda sem costura */
  if (kind === 'murstone' || kind === 'murblock') {
    const blk = kind === 'murblock';
    x.fillStyle = '#6e6a62'; x.fillRect(0, 0, S, S); y.fillStyle = gray(0.08); y.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '40,36,30' : '150,145,135'},${0.15 + R() * 0.2})`; x.fillRect(R() * S, R() * S, 2, 2); }   /* rejunte granulado */
    const rowsH = []; let tot = 0; while (tot < S) { const h = blk ? 300 + R() * 60 : 150 + R() * 90; rowsH.push(h); tot += h; } const kk = S / tot; let Y = 0;   /* fiadas de alturas diferentes */
    for (const rh0 of rowsH) { const rh = rh0 * kk; let X = -R() * 200; const stones = [];
      while (X < S - 30) { const w = blk ? 380 + R() * 220 : rh * (1.0 + R() * 1.9); stones.push([X, w]); X += w; }
      const end = S + stones[0][0]; while (stones.length > 2 && stones[stones.length - 1][0] > end - 60) stones.pop(); const last = stones[stones.length - 1]; last[1] = end - last[0];   /* a última pedra fecha a fiada na repetição seguinte */
      for (const [sx, sw] of stones) {
        const g = 7 + R() * 5, bx = sx + g / 2, by = Y + g / 2, bw = sw - g, bh = rh - g, jit = () => (R() - 0.5) * (blk ? 6 : 16);
        const pts = [[bx + jit(), by + jit()], [bx + bw * 0.5 + jit(), by + jit() * 0.5], [bx + bw + jit(), by + jit()], [bx + bw + jit() * 0.5, by + bh * 0.5 + jit()], [bx + bw + jit(), by + bh + jit()], [bx + bw * 0.5 + jit(), by + bh + jit() * 0.5], [bx + jit(), by + bh + jit()], [bx + jit() * 0.5, by + bh * 0.5 + jit()]];
        const path = (ctx, dx) => { ctx.beginPath(); for (let q = 0; q < 8; q++) { const p = pts[q], n = pts[(q + 1) % 8], mx = (p[0] + n[0]) / 2 + dx, my = (p[1] + n[1]) / 2; if (!q) ctx.moveTo((pts[7][0] + p[0]) / 2 + dx, (pts[7][1] + p[1]) / 2); ctx.quadraticCurveTo(p[0] + dx, p[1], mx, my); } ctx.closePath(); };
        const tone = 0.62 + R() * 0.3, warm = (R() - 0.5) * 22, cool = R() < 0.15 ? 18 : 0;
        const base = [tone * 255 + warm, tone * 250 + warm * 0.4, tone * 238 - warm * 0.6 - cool];
        const seeds = []; for (let q = 0; q < 40; q++) seeds.push(R());
        wrapDraw(x, bx, bw, (ctx, dx) => { let si = 0; const r2 = () => seeds[si++ % seeds.length];
          path(ctx, dx); const gr = ctx.createLinearGradient(bx + dx, by, bx + dx + bw * 0.25, by + bh); gr.addColorStop(0, `rgb(${base.map(v => Math.min(255, v + 22) | 0)})`); gr.addColorStop(0.5, `rgb(${base.map(v => v | 0)})`); gr.addColorStop(1, `rgb(${base.map(v => Math.max(0, v - 38) | 0)})`); ctx.fillStyle = gr; ctx.fill();
          ctx.save(); path(ctx, dx); ctx.clip();
          for (let q = 0; q < bw * bh / 90; q++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '30,26,20' : '255,250,240'},${0.04 + R() * 0.07})`; ctx.fillRect(bx + dx + R() * bw, by + R() * bh, 1 + R() * 3, 1 + R() * 2); }   /* grão da pedra */
          for (let q = 0; q < 2; q++) { ctx.strokeStyle = `rgba(40,34,28,${0.12 + r2() * 0.12})`; ctx.lineWidth = 1 + r2(); ctx.beginPath(); let px = bx + dx + r2() * bw, py = by + r2() * bh * 0.4; ctx.moveTo(px, py); for (let t = 0; t < 4; t++) { px += (r2() - 0.5) * 30; py += 8 + r2() * 18; ctx.lineTo(px, py); } ctx.stroke(); }   /* trincas */
          { const gg = ctx.createLinearGradient(0, by + bh * 0.55, 0, by + bh); gg.addColorStop(0, 'rgba(60,70,40,0)'); gg.addColorStop(1, `rgba(${r2() < 0.35 ? '70,88,42' : '58,50,38'},${0.25 + r2() * 0.3})`); ctx.fillStyle = gg; ctx.fillRect(bx + dx, by, bw, bh); }   /* musgo ou sujeira embaixo da pedra */
          if (r2() < 0.4) { const sx2 = bx + dx + r2() * bw, gg = ctx.createLinearGradient(0, by, 0, by + bh); gg.addColorStop(0, 'rgba(40,36,30,0.2)'); gg.addColorStop(1, 'rgba(40,36,30,0)'); ctx.fillStyle = gg; ctx.fillRect(sx2, by, 6 + r2() * 14, bh); }   /* escorrido de chuva */
          ctx.strokeStyle = 'rgba(255,250,235,0.2)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + dx + 4, by + 3); ctx.lineTo(bx + dx + bw - 4, by + 3); ctx.stroke();   /* luz na aresta de cima */
          ctx.restore(); });
        const hb = 0.85 + R() * 0.15;
        wrapDraw(y, bx, bw, (ctx, dx) => { ctx.save(); ctx.filter = 'blur(' + (blk ? 3 : 4) + 'px)'; path(ctx, dx); ctx.fillStyle = gray(0.55); ctx.fill(); ctx.restore(); ctx.save(); ctx.filter = 'blur(14px)'; ctx.beginPath(); ctx.ellipse(bx + dx + bw / 2, by + bh / 2, Math.max(2, bw * 0.4), Math.max(2, bh * 0.34), 0, 0, 7); ctx.fillStyle = gray(0.62 + (hb - 0.85) * 0.8); ctx.fill(); ctx.restore();
          ctx.save(); path(ctx, dx); ctx.clip(); ctx.globalAlpha = 0.18; for (let q = 0; q < bw * bh / 260; q++) { ctx.fillStyle = gray(R() < 0.5 ? 0.35 : 0.95); ctx.beginPath(); ctx.arc(bx + dx + R() * bw, by + R() * bh, 1 + R() * 4, 0, 7); ctx.fill(); } ctx.restore(); });
      }
      Y += rh; }
  } else if (kind === 'murtile') {
    x.fillStyle = '#4a2418'; x.fillRect(0, 0, S, S); y.fillStyle = gray(0.1); y.fillRect(0, 0, S, S);
    const rows = 12, rh = S / rows, cols = 10, cw = S / cols, TL = rh * 1.9;
    for (let r = rows + 1; r >= -1; r--) { const off = (r & 1) ? cw / 2 : 0, ty = r * rh - TL + rh;   /* de baixo para cima: cada fiada cobre a cabeça da de baixo */
      for (let q = -1; q <= cols; q++) { const tx = q * cw + off + 2, tw = cw - 4, rr = tw / 2, v = R(), moss = R() < 0.12, ms = []; for (let k = 0; k < 21; k++) ms.push(R());
        const col = v < 0.12 ? [122, 58, 38] : v < 0.3 ? [176, 84, 52] : v < 0.6 ? [160, 72, 44] : v < 0.85 ? [190, 98, 60] : [140, 66, 46];
        const shape = (ctx, dx, dy) => { const Y0 = ty + dy; ctx.beginPath(); ctx.moveTo(tx + dx, Y0); ctx.lineTo(tx + dx + tw, Y0); ctx.lineTo(tx + dx + tw, Y0 + TL - rr * 0.8); ctx.quadraticCurveTo(tx + dx + tw, Y0 + TL, tx + dx + tw / 2, Y0 + TL + rr * 0.15); ctx.quadraticCurveTo(tx + dx, Y0 + TL, tx + dx, Y0 + TL - rr * 0.8); ctx.closePath(); };
        for (const dy of [0, S, -S]) { if (ty + dy > S || ty + dy + TL + rr < 0) continue;
          wrapDraw(x, tx, tw, (ctx, dx) => { const yy = ty + dy;
            ctx.save(); ctx.filter = 'blur(5px)'; ctx.fillStyle = 'rgba(20,8,4,0.55)'; ctx.translate(2, 6); shape(ctx, dx, dy); ctx.fill(); ctx.restore();   /* sombra sobre a fiada de baixo */
            shape(ctx, dx, dy); const gr = ctx.createLinearGradient(0, yy, 0, yy + TL); gr.addColorStop(0, `rgb(${col.map(c => c * 0.8 | 0)})`); gr.addColorStop(0.7, `rgb(${col})`); gr.addColorStop(1, `rgb(${col.map(c => Math.min(255, c * 1.12) | 0)})`); ctx.fillStyle = gr; ctx.fill();
            ctx.save(); shape(ctx, dx, dy); ctx.clip(); for (let k = 0; k < 260; k++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '40,16,8' : '255,220,190'},${0.05 + R() * 0.08})`; ctx.fillRect(tx + dx + R() * tw, yy + R() * TL, 1 + R() * 2, 1 + R() * 2); }
              if (moss) { ctx.fillStyle = `rgba(92,104,48,${0.35 + ms[0] * 0.3})`; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(tx + dx + ms[1 + k] * tw, yy + TL * (0.6 + ms[8 + k] * 0.4), 3 + ms[14 + k % 7] * 7, 0, 7); ctx.fill(); } }
              ctx.strokeStyle = 'rgba(255,230,200,0.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + dx + 3, yy); ctx.lineTo(tx + dx + 3, yy + TL - rr); ctx.stroke(); ctx.restore(); });
          wrapDraw(y, tx, tw, (ctx, dx) => { ctx.save(); ctx.filter = 'blur(3px)'; shape(ctx, dx, dy); const g2 = ctx.createLinearGradient(0, ty + dy, 0, ty + dy + TL); g2.addColorStop(0, gray(0.35)); g2.addColorStop(1, gray(0.9)); ctx.fillStyle = g2; ctx.fill(); ctx.restore(); }); } }
    }
  }
  const map = new THREE.CanvasTexture(c), bump = new THREE.CanvasTexture(b);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; if (kind !== 'murtile') t.repeat.set(0.72, 0.72); }   /* pedras maiores: a repetição aparece menos */
  map.encoding = THREE.sRGBEncoding;
  return { map, bump };
}
if (MUR_PROTO) {
  const cT0 = canvasTex; canvasTex = function (kind) { if (kind === 'murstone' || kind === 'murblock' || kind === 'murtile') return CTX3[kind] || (CTX3[kind] = murTex(kind)); return cT0(kind); };
  let swap = 0; const smat0 = smat;
  smat = function (kind, hex, o) { if (swap) { if (kind === 'brick') kind = 'murstone'; else if (kind === 'stoneblock') kind = 'murblock'; else if (kind === 'slate') { kind = 'murtile'; hex = '#ffffff'; } } return smat0(kind, hex, o); };
  const inSwap = f => function (...a) { swap++; try { return f.apply(this, a); } finally { swap--; } };
  mWall = inSwap(mWall); mTower = inSwap(mTower); mGateHouse = inSwap(mGateHouse);
  murCovWall = inSwap(murCovWall); murBarbArch = inSwap(murBarbArch);
}
