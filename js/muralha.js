/* Muralha histórica (lista 16, item 1): a volta toda no estilo York/Rothenburg, na mesma linha de antes.
   · os 4 portões viram bars (casa de porta de 3 andares com torrinhas) com barbacã de 2 casas para fora
   · torres quadradas de telhado alto saindo para fora; torres grandes nos 4 cantos
   · dobras de 2 casas para fora no norte e no sul; postigos no norte (na ponte velha) e no oeste
   · ronda coberta 12 casas de cada lado dos portões; fosso seco no norte e no leste (água no oeste e no sul)
   · ?muralha=antiga volta para a muralha de antes */
const MUR_ON = typeof location === 'undefined' || !/[?&]muralha=antiga/.test(location.search);
const MUR_PROTO = MUR_ON;   /* (nome antigo, usado pelas ligações abaixo) */
const MUR = { k: new Uint8Array(MAP_W * MAP_H), arch: {} };   /* k: 1 ronda coberta · 2 muro da barbacã · 3 muro da barbacã com o arco · 4/5 postigo (horizontal/vertical) */
if (MUR_ON && !TEST3D) (function murTiles() {
  const W = WORLD, C = CENTER, idx = (x, y) => y * MAP_W + x, G = k => W.gates.find(g => g.kind === k);
  const gS = G('main'), gN = G('small'), gW = G('west'), gE = G('east'); if (!gS || !gN || !gW || !gE) return;
  const x0 = gW.x0, X1 = gE.x0, y0 = gN.y, y1 = gS.y;
  const grd = (x, y, g) => { const i = idx(x, y); W.obj[i] = O.NONE; W.fl1[i] = 0; W.wdir[i] = 0; W.tvar[i] = 0; W.toff[i] = 4; W.ground[i] = g || T.COBBLE; W.rdir[i] = 0; MUR.k[i] = 0; };
  const wall = (x, y, wd, fl = 1) => { const i = idx(x, y); W.obj[i] = O.WALL; W.fl1[i] = fl; W.wdir[i] = wd; W.ground[i] = T.FLOORSTONE; W.rdir[i] = 0; MUR.k[i] = 0; };
  const part = (x, y, fl = 1) => { const i = idx(x, y); W.obj[i] = O.PART; W.fl1[i] = fl; W.ground[i] = T.FLOORSTONE; W.rdir[i] = 0; MUR.k[i] = 0; };
  const tower = (ax, ay, v, off = 0) => { const i = idx(ax, ay); W.obj[i] = O.TOWER; W.tvar[i] = v; W.toff[i] = off; W.fl1[i] = 1; };
  const isT = (x, y) => { const o = W.obj[idx(x, y)]; return o === O.TOWER || o === O.PART; };
  /* 1. fosso seco no norte e no leste */
  for (let y = y0 - 6; y <= y1 + 6; y++) for (let x = x0 - 6; x <= X1 + 6; x++) { const i = idx(x, y); if (W.ground[i] !== T.WATER) continue; if ((y <= y0 - 2 && y >= y0 - 6) || (x >= X1 + 2 && x <= X1 + 6)) { W.ground[i] = T.DIRT; W.river[i] = 0; W.flow[i * 2] = 0; W.flow[i * 2 + 1] = 0; } }
  /* 2. as torres redondas antigas da volta (não as do castelo) */
  const old = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= X1; x++) { if (W.obj[idx(x, y)] !== O.TOWER) continue; if (!(x <= x0 + 1 || x >= X1 - 1 || y <= y0 + 1 || y >= y1 - 1)) continue; old.push([x, y]); }
  const lineOf = (bx, by) => (by <= y0 + 1 && by - 1 <= y0) ? 'N' : (by >= y1 - 1 && by - 1 >= y1 - 2 && by >= y1) ? 'S' : (bx <= x0 + 1) ? 'W' : 'E';
  for (const [ax, ay] of old) for (let y = ay - 1; y <= ay; y++) for (let x = ax - 1; x <= ax; x++) { const onN = y === y0, onS = y === y1, onW = x === x0, onE = x === X1; if (onN || onS || onW || onE) wall(x, y, onN ? 4 : onS ? 3 : onW ? 2 : 1); else grd(x, y); }   /* tira todas; a linha do muro volta a ser muro */
  /* 3. dobras de 2 casas para fora: norte (x 26..56) e sul (x 14..52) */
  const bulge = (xa, xb, yl, dy, wd) => { const yn = yl + dy * 2; for (let x = xa + 1; x < xb; x++) { grd(x, yl); grd(x, yl + dy); } for (let x = xa; x <= xb; x++) wall(x, yn, wd); for (const [x, w2] of [[xa, 2], [xb, 1]]) for (let k = 0; k <= 1; k++) wall(x, yl + dy * k, w2); return yn; };
  const NBx = [C + 26, C + 56], SBx = [C + 14, C + 52], yN2 = bulge(NBx[0], NBx[1], y0, -1, 4), yS2 = bulge(SBx[0], SBx[1], y1, 1, 3);
  /* 4. torres novas: quadradas, saindo para fora, nos mesmos lugares das antigas (fora dos portões e das dobras) */
  const nearGate = (g, a, b) => Math.max(a, g.x0 - 3) <= Math.min(b, g.x1 + 3);
  const nearGateV = (g, a, b) => Math.max(a, g.y0 - 3) <= Math.min(b, g.y + 3);
  const sqT = (cells, ax, ay, v) => { for (const [x, y] of cells) part(x, y); tower(ax, ay, v, 0); };
  const corner = new Set(); for (const [cx, cy] of [[x0, y0], [X1, y0], [x0, y1], [X1, y1]]) { for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) { part(x, y); corner.add(idx(x, y)); } tower(cx, cy, 8, 4); }   /* torres grandes dos cantos */
  for (const [ax, ay] of old) { const tx = ax - 1, ty = ay - 1;
    if ([[tx, ty], [ax, ay]].some(([x, y]) => corner.has(idx(x, y)) || Math.abs(x - x0) + Math.abs(y - y0) < 4 || Math.abs(x - X1) + Math.abs(y - y0) < 4 || Math.abs(x - x0) + Math.abs(y - y1) < 4 || Math.abs(x - X1) + Math.abs(y - y1) < 4)) continue;
    if (ty <= y0 + 1 && ty >= y0) { if (nearGate(gN, tx, ax) || (tx >= NBx[0] - 1 && ax <= NBx[1] + 1)) continue; sqT([[tx, y0 - 1], [ax, y0 - 1], [tx, y0], [ax, y0]], ax, y0, 6); }
    else if (ay >= y1 - 1 && ay <= y1) { if (nearGate(gS, tx, ax) || (tx >= SBx[0] - 1 && ax <= SBx[1] + 1)) continue; sqT([[tx, y1], [ax, y1], [tx, y1 + 1], [ax, y1 + 1]], ax, y1 + 1, 6); }
    else if (tx <= x0 + 1 && tx >= x0) { if (nearGateV(gW, ty, ay)) continue; sqT([[x0 - 1, ty], [x0 - 1, ay], [x0, ty], [x0, ay]], x0, ay, 7); }
    else if (ax >= X1 - 1 && ax <= X1) { if (nearGateV(gE, ty, ay)) continue; sqT([[X1, ty], [X1, ay], [X1 + 1, ty], [X1 + 1, ay]], X1 + 1, ay, 7); } }
  /* torres das dobras: nas quinas de fora e no meio (no sul, para dentro: a água encosta no muro) */
  for (const x of [NBx[0], Math.round((NBx[0] + NBx[1]) / 2), NBx[1]]) sqT([[x - 1, yN2 - 1], [x, yN2 - 1], [x - 1, yN2], [x, yN2]], x, yN2, 6);
  for (const x of [SBx[0], Math.round((SBx[0] + SBx[1]) / 2), SBx[1]]) sqT([[x - 1, yS2 - 1], [x, yS2 - 1], [x - 1, yS2], [x, yS2]], x, yS2, 6);
  /* 5. os quatro bars com barbacã */
  const barb = (cells, walls, anchor, arch) => { for (const [x, y, rd] of cells) { const i = idx(x, y); if (W.obj[i] !== O.GATE) W.obj[i] = O.NONE; W.fl1[i] = 0; W.ground[i] = W.ground[i] === T.BRIDGE ? T.BRIDGE : T.FLOORSTONE; W.rdir[i] = rd; MUR.k[i] = 0; } for (const [x, y, wd] of walls) { wall(x, y, wd, 0); MUR.k[idx(x, y)] = 2; } MUR.k[idx(anchor[0], anchor[1])] = 3; MUR.arch[idx(anchor[0], anchor[1])] = arch; };
  { const g = gS; g.bar = 1; for (const tx of [g.x0 - 2, g.x1 + 1]) for (let y = y1 - 1; y <= y1; y++) for (let x = tx; x <= tx + 1; x++) part(x, y, 0);
    const cells = [], walls = []; for (let y = y1 + 1; y <= y1 + 2; y++) { for (let x = g.x0; x <= g.x1; x++) cells.push([x, y, 2]); walls.push([g.x0 - 1, y, 2], [g.x1 + 1, y, 1]); } barb(cells, walls, [g.x1 + 1, y1 + 2], { n: g.x1 - g.x0 + 1, rot: 0, od: 1 }); }
  { const g = gN; g.bar = 1; for (const tx of [g.x0 - 2, g.x1 + 1]) for (let y = y0; y <= y0 + 1; y++) for (let x = tx; x <= tx + 1; x++) part(x, y, 0);
    const cells = [], walls = []; for (let y = y0 - 2; y <= y0 - 1; y++) { for (let x = g.x0; x <= g.x1; x++) cells.push([x, y, 2]); walls.push([g.x0 - 1, y, 2], [g.x1 + 1, y, 1]); } barb(cells, walls, [g.x0 - 1, y0 - 2], { n: g.x1 - g.x0 + 1, rot: Math.PI, od: 2 }); }
  { const g = gW; g.bar = 1; for (const ty of [g.y0 - 2, g.y + 1]) for (let y = ty; y <= ty + 1; y++) for (let x = x0; x <= x0 + 1; x++) part(x, y, 0);
    const cells = [], walls = []; for (let x = x0 - 2; x <= x0 - 1; x++) { for (let y = g.y0; y <= g.y; y++) cells.push([x, y, 1]); walls.push([x, g.y0 - 1, 4], [x, g.y + 1, 3]); } barb(cells, walls, [x0 - 2, g.y + 1], { n: g.y - g.y0 + 1, rot: -Math.PI / 2, od: 3 }); }
  { const g = gE; g.bar = 1; for (const ty of [g.y0 - 2, g.y + 1]) for (let y = ty; y <= ty + 1; y++) for (let x = X1 - 1; x <= X1; x++) part(x, y, 0);
    const cells = [], walls = []; for (let x = X1 + 1; x <= X1 + 2; x++) { for (let y = g.y0; y <= g.y; y++) cells.push([x, y, 1]); walls.push([x, g.y0 - 1, 4], [x, g.y + 1, 3]); } barb(cells, walls, [X1 + 2, g.y + 1], { n: g.y - g.y0 + 1, rot: -Math.PI / 2, od: 3 }); }   /* preso no muro sul: o arco cresce para cima no quadro (não sai da borda) */
  /* 6. postigos: norte na ponte velha (x +21) e oeste (y +30), com ponte nova sobre a água */
  { const x = C + 21, i = idx(x, y0); W.obj[i] = O.GATE; W.fl1[i] = 0; W.ground[i] = T.FLOORSTONE; MUR.k[i] = 4; for (let y = y0 - 2; y <= y0 - 1; y++) { const j = idx(x, y); if (W.obj[j] === O.PART || W.obj[j] === O.TOWER) continue; W.obj[j] = O.NONE; W.ground[j] = T.COBBLE; W.rdir[j] = 2; } }
  { const y = C + 30, i = idx(x0, y); W.obj[i] = O.GATE; W.fl1[i] = 0; W.ground[i] = T.FLOORSTONE; MUR.k[i] = 5; for (let x = x0 - 3; x <= x0 - 1; x++) { const j = idx(x, y); W.obj[j] = O.NONE; W.ground[j] = W.ground[j] === T.WATER ? T.BRIDGE : T.COBBLE; W.rdir[j] = 1; } }
  /* 7. ronda coberta: 12 casas de cada lado dos portões */
  const cov = (x, y, wd) => { const i = idx(x, y); if (W.obj[i] === O.WALL && !MUR.k[i]) { MUR.k[i] = 1; W.wdir[i] = wd; } };
  for (let x = gS.x0 - 14; x <= gS.x1 + 14; x++) cov(x, y1, 3);
  for (let x = gN.x0 - 14; x <= gN.x1 + 14; x++) cov(x, y0, 4);
  for (let y = gW.y0 - 14; y <= gW.y + 14; y++) cov(x0, y, 2);
  for (let y = gE.y0 - 14; y <= gE.y + 14; y++) cov(X1, y, 1);
  MUR.box = { x0, X1, y0, y1, yN2, yS2 };
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
  const o = grp(), H = WALL_H, big = v === 8, HT = H * (big ? 2.05 : 1.75), w = big ? 2.75 : 1.9, alongX = v !== 7;
  const st = smat('brick', '#a29c90', { bump: 1.4 }), capM = smat('stoneblock', '#b0a998', { bump: 1 }), roofM = smat('slate', '#a04a2e', { bump: 1.4 }), dark = smat(null, '#151311'), wd = DWOOD();
  o.add(gwall(w, HT, w, 0, HT / 2, 0, 'brick', '#a29c90', HT, 31, 1, 1.4));
  o.add(wbox(w + 0.16, 0.6, w + 0.16, 0, 0.3, 0, smat('stoneblock', '#8a857a', { bump: 1.4 }), 1.2));   /* sapata */
  for (const y of [H - 0.1, HT - 0.05]) o.add(wbox(w + 0.08, 0.1, w + 0.08, 0, y, 0, capM, 1.2));          /* cordões */
  /* passagem da ronda: portinhas nos dois lados do muro */
  for (const sd of (big ? [] : [-1, 1])) { const [x, z] = alongX ? [sd * (w / 2 + 0.005), -0.35] : [-0.35, sd * (w / 2 + 0.005)]; o.add(wbox(alongX ? 0.02 : 0.5, 0.95, alongX ? 0.5 : 0.02, x, H + 0.48, z, dark)); }
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
  if (gt.vert) { const o = murBar(Object.assign({}, gt, { vert: 0, x0: 0, x1: gt.y - gt.y0 }), f, pc); o.rotation.y = -Math.PI / 2; return grp(o); }   /* portões do oeste e do leste: o mesmo bar, girado */
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
function murBarbArch(n, rot, od) {   /* arco de fora da barbacã, preso num dos muros dela: vai por cima da passagem de n casas (rot gira para o lado do portão) */
  const a = grp(), o = grp(), H = WALL_H, x0 = -(n + 0.5), x1 = -0.5, sp = 2.1, cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, ry = 1.0;
  const st = smat('brick', '#a29c90', { bump: 1.4 }), capM = smat('stoneblock', '#b0a998', { bump: 1 });
  const sh = new THREE.Shape(); sh.moveTo(x0, sp); sh.lineTo(x0, H); sh.lineTo(x1, H); sh.lineTo(x1, sp);
  for (let k = 1; k <= 18; k++) { const t = k / 18 * Math.PI; sh.lineTo(cx + rx * Math.cos(t), sp + ry * Math.sin(t)); }
  o.add(mk(wuv(new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false }).translate(0, 0, -0.2), 1), st));
  for (let k = 0; k <= 10; k++) { const t = k / 10 * Math.PI, m = mk(new THREE.BoxGeometry(0.2, 0.3, 0.06), capM); m.position.set(cx + (rx + 0.1) * Math.cos(t), sp + (ry + 0.1) * Math.sin(t), 0.52); m.rotation.z = t - Math.PI / 2; o.add(m); }
  o.add(wbox(x1 - x0, 0.08, 0.76, cx, H + 0.04, 0.15, capM, 1));
  const mer = grp(); murMerlons(mer, x0, x1, -0.2, 0.5, H + 0.08, capM, 'f'); o.add(mer);
  o.rotation.y = rot || 0; a.add(o); a.add(mWall(1, false, false, od || 1, 0));
  return a;
}

/* ---------- ligações com o desenho ---------- */
if (MUR_PROTO) {
  var mGateHouse0 = mGateHouse;
  mGateHouse = function (gt, f, pc) { return gt && gt.bar ? murBar(gt, f, pc) : mGateHouse0(gt, f, pc); };
  const mTower0 = mTower; mTower = function (v, off) { return v >= 6 && v <= 8 ? murSqTower(v) : mTower0(v, off); };
  const objS0 = objSprite;
  objSprite = function (o, x, y) {
    const i = y * MAP_W + x, k = MUR.k[i];
    if (k && o === O.WALL && typeof scen3 === 'function') { const od = WORLD.wdir[i], isT = j => WORLD.obj[j] === O.PART || WORLD.obj[j] === O.TOWER, ax = od === 3 || od === 4, e = (isT(ax ? i - 1 : i - MAP_W) ? 1 : 0) | (isT(ax ? i + 1 : i + MAP_W) ? 2 : 0);
      const A = MUR.arch[i] || {}; const s = scen3('mur|' + k + '|' + od + '|' + e + '|' + (A.n || 0) + '|' + (A.rot || 0).toFixed(2), () => k === 1 ? murCovWall(od, e) : k === 3 ? murBarbArch(A.n || 4, A.rot || 0, A.od || od) : mWall(1, false, false, od, e)); if (s) return s; }
    if ((k === 4 || k === 5) && o === O.GATE) return gateSprite(k === 4);   /* postigo: arco pequeno na muralha */
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
