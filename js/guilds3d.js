// ============================================================
//  GUILDAS — fachadas e móveis das plantas aprovadas (28/11)
//  · Escola de Magia do Círculo: pedra cinza-azulada gótica, duas torres de ardósia (a maior com o observatório),
//    janelas em arco com vitrais, gárgulas nas quinas, estátuas de dois magos fundadores no portão, bandeirolas roxas e douradas.
//  · Pavilhão dos Arqueiros: madeira escura, telhado de colmo, galhadas de cervo sobre a porta, estandarte verde.
//  · Móveis novos: estátua de mago, pentagrama no chão, altar de elemento, poleiro de coruja, porta-arcos; alvo de palha no campo.
//  Quadro local (como na vila): a porta fica na frente (z = h), x vai de 0 a w.
// ============================================================
const GD3 = { stone: '#7c8696', stone2: '#5e6878', slate: '#2e3442', gold: '#d8b048', purple: '#5a2a8a', glass: ['#7a3ac8', '#2a6ad0', '#d8a028', '#c8303a', '#3aa060'] };
if (typeof styleOf === 'function') { const _soG = styleOf; styleOf = function (b) {
  if (b && b.kind === 'school') return { wall: GD3.stone, roof: GD3.slate, tex: 'brick', roofTex: 'slate', trim: GD3.gold };
  if (b && b.kind === 'archery') return { wall: '#4a3020', roof: '#c8a050', tex: 'oldplank', roofTex: 'thatch', trim: '#2a5a2a' };
  return _soG.apply(this, arguments); }; }
/* um mago de pedra com cajado (a ponta acende à noite) */
function gdWizard(g, x, z, h, night, faceZ) { const st = smat(null, '#a7aeb8', { rough: 0.75 }), dk = smat(null, '#6a7280', { rough: 0.9 }), tip = smat(null, '#b8d8ff', { emissive: '#7ab0ff', ei: night ? 2.2 : 0.4 });
  g.add(wbox(0.55, 0.32, 0.55, x, 0.16, z, dk, 1));
  const body = mk(new THREE.ConeGeometry(0.24, h * 0.62, 10).translate(x, 0.32 + h * 0.31, z), st); g.add(body);
  g.add(mk(new THREE.SphereGeometry(0.11, 10, 8).translate(x, 0.32 + h * 0.66, z), st));
  g.add(mk(new THREE.ConeGeometry(0.15, 0.36, 10).translate(x, 0.32 + h * 0.66 + 0.24, z), st));
  g.add(mk(new THREE.ConeGeometry(0.1, 0.22, 8).translate(x, 0.32 + h * 0.52, z + (faceZ || 1) * 0.12), st));   /* barba */
  g.add(mk(new THREE.CylinderGeometry(0.025, 0.025, h * 0.85, 6).translate(x + 0.2, 0.32 + h * 0.42, z), dk));
  g.add(mk(new THREE.SphereGeometry(0.06, 8, 6).translate(x + 0.2, 0.32 + h * 0.85, z), tip)); }
function gdSchool(b, night) { const o = vBase(b), w = b.w, h = b.h, { H, RH } = bldDims(b), dX = vDX(b);
  const st = smat('brick', GD3.stone, { bump: 0.6 }), st2 = smat('brick', GD3.stone2, { bump: 0.6 }), sl = smat('slate', GD3.slate, { bump: 0.8 }), gold = smat(null, GD3.gold, { metal: 0.7, rough: 0.35 }), wood = smat('wood', '#3a2416', { bump: 1 }), iron = smat(null, '#1e1e24', { metal: 0.6, rough: 0.5 });
  const glass = GD3.glass.map(c => smat(null, c, { emissive: c, ei: night ? 1.4 : 0.25, rough: 0.2, metal: 0.1 }));
  o.add(wbox(w, H, h, w / 2, H / 2, h / 2, st, 1)); o.add(wbox(w + 0.12, 0.5, h + 0.12, w / 2, 0.25, h / 2, st2, 1));   /* corpo e embasamento */
  for (let f = 1; f < 4; f++) o.add(wbox(w + 0.06, 0.1, h + 0.06, w / 2, f * H / 4, h / 2, st2, 1));   /* cornijas entre os andares */
  vGable(o, w, h, H, RH, sl, 0.35, 'x');   /* telhado íngreme de ardósia */
  vDoorF(o, dX, h, 1.0, 1.75, wood, { arch: true, frame: st2 });
  /* janelas em arco com vitrais: 4 andares na frente e dos lados */
  let gi = 0; const fl = H / 4;
  for (let f = 0; f < 4; f++) { const y = f * fl + fl * 0.42; for (let x = 0.9; x < w - 0.5; x += 1.6) { if (f === 0 && Math.abs(x - dX) < 1.2) continue; vWinF(o, x, y, 0, 'F', 0.42, fl * 0.5, st2, glass[gi++ % 5], { arch: true }); }
    for (let z = 1; z < h - 0.5; z += 1.8) { vWinF(o, z, y, 0, 'L', 0.42, fl * 0.5, st2, glass[gi++ % 5], { arch: true }); vWinF(o, z, y, 0, 'R', 0.42, fl * 0.5, st2, glass[gi++ % 5], { arch: true }); } }
  /* rosácea sobre a porta */
  { const r = mk(new THREE.CircleGeometry(0.55, 24), glass[0]); r.position.set(dX, fl * 1.55, h + 0.03); o.add(r); o.add(mk(new THREE.TorusGeometry(0.58, 0.07, 6, 24).translate(dX, fl * 1.55, h + 0.04), st2)); }
  /* torres: a maior no fundo à direita (observatório), a menor na frente à esquerda */
  for (const [tx, tz, r, tH] of [[w - 0.9, 1.0, 1.25, H + 3.6], [0.8, h - 0.8, 0.85, H + 2.2]]) { o.add(mk(new THREE.CylinderGeometry(r, r * 1.04, tH, 18).translate(tx, tH / 2, tz), st));
    const cone = mk(new THREE.ConeGeometry(r * 1.25, r * 2.6, 18).translate(tx, tH + r * 1.3, tz), sl); o.add(cone); o.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6).translate(tx, tH + r * 2.6 + 0.3, tz), gold));
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, wy = tH - 1.2; o.add(mk(new THREE.BoxGeometry(0.22, 0.5, 0.05).translate(tx + Math.cos(a) * (r + 0.01), wy, tz + Math.sin(a) * (r + 0.01)).rotateY(0), glass[k % 5])); } }
  /* gárgulas nas quinas do telhado */
  for (const [gx, gz, s] of [[0.1, 0.1, -1], [w - 0.1, 0.1, 1], [0.1, h - 0.1, -1], [w - 0.1, h - 0.1, 1]]) { const gg = grp(); gg.add(mk(new THREE.BoxGeometry(0.3, 0.22, 0.42), st2)); gg.add(mk(new THREE.SphereGeometry(0.12, 8, 6).translate(0, 0.12, 0.22), st2)); gg.add(mk(new THREE.BoxGeometry(0.5, 0.04, 0.2).translate(0, 0.14, -0.05), st2)); gg.position.set(gx, H + 0.12, gz); gg.rotation.y = s * 0.4; o.add(gg); }
  /* estátuas dos fundadores guardando o portão e bandeirolas */
  gdWizard(o, dX - 1.45, h + 0.55, 1.5, night, 1); gdWizard(o, dX + 1.45, h + 0.55, 1.5, night, 1);
  const pur = smat('cloth', GD3.purple, { bump: 0.3 }); for (const x of [dX - 2.6, dX + 2.6]) if (x > 0.5 && x < w - 0.5) { o.add(wbox(0.55, 1.6, 0.04, x, fl * 2.6, h + 0.06, pur)); o.add(wbox(0.6, 0.06, 0.06, x, fl * 2.6 + 0.82, h + 0.07, gold)); o.add(mk(new THREE.OctahedronGeometry(0.14).translate(x, fl * 2.6 + 0.2, h + 0.1), gold)); }
  if (night) for (const x of [dX - 0.75, dX + 0.75]) o.add(mk(new THREE.SphereGeometry(0.08, 8, 6).translate(x, 1.5, h + 0.2), smat(null, '#ffd08a', { emissive: '#ffb050', ei: 2 })));
  return o; }
function gdArchery(b, night) { const o = vBase(b), w = b.w, h = b.h, { H, RH } = bldDims(b), dX = vDX(b);
  const pl = smat('oldplank', '#4a3020', { bump: 1 }), dk = smat('wood', '#2e1c10', { bump: 1 }), th = smat('thatch', '#c8a050', { bump: 0.9 }), green = smat('cloth', '#2a5a2a', { bump: 0.3 }), bone = smat(null, '#e8dcc0', { rough: 0.8 }), gl = vG(night);
  o.add(wbox(w, H, h, w / 2, H / 2, h / 2, pl, 1)); for (const x of [0.12, w - 0.12]) for (const z of [0.12, h - 0.12]) o.add(wbox(0.24, H + 0.05, 0.24, x, H / 2, z, dk, 1));
  vGable(o, w, h, H, RH, th, 0.55, 'x');   /* colmo com beiral largo */
  o.add(wbox(w, 0.1, 1.1, w / 2, H - 0.1, h + 0.5, th, 1)); for (const x of [0.4, w - 0.4]) o.add(wbox(0.16, H - 0.1, 0.16, x, (H - 0.1) / 2, h + 1.0, dk, 1));   /* varanda aberta para o campo */
  vDoorF(o, dX, h, 0.85, 1.35, dk, {});
  for (const x of [1.2, w - 1.2]) if (Math.abs(x - dX) > 0.9) vWinF(o, x, 1.2, 0, 'F', 0.6, 0.45, dk, gl, {});
  /* galhada de cervo sobre a porta */
  for (const s of [-1, 1]) { const a = mk(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 6).rotateZ(s * 0.6).translate(dX + s * 0.18, 1.85, h + 0.06), bone); o.add(a); for (let k = 0; k < 2; k++) o.add(mk(new THREE.CylinderGeometry(0.018, 0.025, 0.25, 5).rotateZ(-s * 0.4).translate(dX + s * (0.22 + k * 0.1), 1.95 + k * 0.1, h + 0.06), bone)); }
  o.add(mk(new THREE.SphereGeometry(0.1, 8, 6).translate(dX, 1.72, h + 0.08), bone));
  /* estandarte verde com o arco cruzado */
  const sx = w - 0.7; o.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6).translate(sx, 1.3, h + 1.2), dk)); o.add(wbox(0.6, 0.85, 0.03, sx + 0.32, 2.2, h + 1.2, green));
  o.add(mk(new THREE.TorusGeometry(0.2, 0.02, 4, 12, Math.PI).rotateZ(Math.PI / 2).translate(sx + 0.32, 2.2, h + 1.22), bone));
  return o; }
if (typeof mBuilding === 'function') { const _mbG = mBuilding; mBuilding = function (b, night) { if (b && (b.kind === 'school' || b.kind === 'archery')) { try { return b.kind === 'school' ? gdSchool(b, night) : gdArchery(b, night); } catch (e) { console.warn('guilds3d', e); } } return _mbG.apply(this, arguments); }; }

/* ---- móveis novos ---- */
const GFURN = {
  wstatue(g) { gdWizard(g, 0, 0, 1.25, false, 1); },
  pentag(g, f) { const c = smat(null, '#7ad0ff', { emissive: '#4ab0ff', ei: 1.4, transparent: true, opacity: 0.85 }); const r = mk(new THREE.RingGeometry(0.34, 0.4, 24).rotateX(-Math.PI / 2).translate(0, 0.012, 0), c); g.add(r);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + ((f.i + f.j) % 2) * 0.3, a2 = a + Math.PI * 4 / 5, p = new THREE.Vector3(Math.cos(a) * 0.36, 0.014, Math.sin(a) * 0.36), q = new THREE.Vector3(Math.cos(a2) * 0.36, 0.014, Math.sin(a2) * 0.36), L = p.distanceTo(q); const ln = mk(new THREE.BoxGeometry(L, 0.006, 0.025), c); ln.position.copy(p.clone().add(q).multiplyScalar(0.5)); ln.rotation.y = -Math.atan2(q.z - p.z, q.x - p.x); g.add(ln); } },
  elemaltar(g, f) { const C = ['#ff5a2a', '#e8f4ff', '#5ab040', '#ffd860', '#3a8aff'][(f.i * 3 + f.j * 5) % 5], st = smat('brick', '#8a92a0', { bump: 0.5 }); g.add(wbox(0.42, 0.55, 0.42, 0, 0.275, 0, st, 1)); g.add(wbox(0.5, 0.06, 0.5, 0, 0.58, 0, st, 1));
    g.add(mk(new THREE.OctahedronGeometry(0.13).translate(0, 0.78, 0), smat(null, C, { emissive: C, ei: 1.6, rough: 0.2 }))); },
  owlperch(g, f) { const wd = smat('wood', '#5a3a20', { bump: 1 }), fe = smat(null, ['#7a5a3a', '#c8c0b0', '#3a3028'][(f.i + f.j) % 3], { rough: 0.9 }), ey = smat(null, '#ffc020', { emissive: '#ffa000', ei: 0.6 });
    g.add(mk(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6).translate(0, 0.45, 0), wd)); g.add(wbox(0.4, 0.04, 0.05, 0, 0.9, 0, wd));
    g.add(mk(new THREE.SphereGeometry(0.11, 10, 8).translate(0.08, 1.02, 0), fe)); g.add(mk(new THREE.SphereGeometry(0.08, 10, 8).translate(0.08, 1.16, 0.02), fe));
    for (const s of [-1, 1]) g.add(mk(new THREE.SphereGeometry(0.022, 6, 5).translate(0.08 + s * 0.035, 1.17, 0.09), ey)); },
  bowrack(g) { const wd = smat('wood', '#5a3a20', { bump: 1 }), bw = smat('wood', '#8a5a2a', { bump: 0.6 }); g.add(wbox(0.8, 0.06, 0.12, 0, 0.35, -0.38, wd)); g.add(wbox(0.8, 0.06, 0.12, 0, 1.15, -0.38, wd)); for (const s of [-1, 1]) g.add(wbox(0.06, 1.3, 0.1, s * 0.38, 0.65, -0.4, wd));
    for (let k = 0; k < 3; k++) g.add(mk(new THREE.TorusGeometry(0.42, 0.018, 4, 16, Math.PI * 0.85).rotateZ(Math.PI / 2 + 0.23).translate(-0.24 + k * 0.24, 0.75, -0.32), bw)); }
};
if (typeof furnX === 'function') { const _fxG = furnX; furnX = function (g, f, C) { const B = GFURN[f.t]; if (!B) return _fxG(g, f, C); const sub = grp(); B(sub, f, C); sub.rotation.y = [0, Math.PI / 2, Math.PI, -Math.PI / 2][f.v | 0]; g.add(sub); }; }
/* alvo de palha no tripé, com flechas cravadas */
function mArchTarget() { const g = grp(), wd = smat('wood', '#5a3a20', { bump: 1 }), st = smat('thatch', '#d8b868', { bump: 0.8 }), red = smat(null, '#c8302a'), wh = smat(null, '#f0e8d8'), gd = smat(null, '#e8b830');
  for (const [x, z, r] of [[-0.25, 0.1, 0.2], [0.25, 0.1, -0.2], [0, -0.2, 0]]) { const l = mk(new THREE.CylinderGeometry(0.025, 0.03, 1.2, 6).translate(0, 0.6, 0), wd); l.position.set(x, 0, z); l.rotation.z = r; l.rotation.x = z > 0 ? -0.15 : 0.25; g.add(l); }
  g.add(mk(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 20).rotateX(Math.PI / 2).translate(0, 0.9, 0.05), st));
  for (const [r, m] of [[0.34, wh], [0.26, red], [0.17, wh], [0.09, gd]]) g.add(mk(new THREE.CircleGeometry(r, 20).translate(0, 0.9, 0.135), m));
  for (const [x, y] of [[0.06, 0.95], [-0.12, 0.82], [0.15, 0.78]]) g.add(mk(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 4).rotateX(Math.PI / 2 - 0.2).translate(x, y, 0.28), wd));
  return g; }
if (typeof NATURE !== 'undefined') NATURE.archtarget = [mArchTarget, 1.0];

/* muralha grossa (28/11): as casas de dentro (wdir 9) são o chão do caminho de ronda, sem ameias nem sapata */
if (typeof mWall === 'function') { const _mwG = mWall; mWall = function (v, low, ivy, od, ends) { if (od === 9 && !low) { const o = grp(), H = WALL_H, capM = smat('stoneblock', '#b0a998', { bump: 1 }); o.add(gwall(1, H - 0.08, 1, 0, (H - 0.08) / 2, 0, 'brick', '#a29c90', H, v, 1, 1.4)); o.add(wbox(1, 0.08, 1, 0, H - 0.04, 0, capM, 1)); return o; } return _mwG.apply(this, arguments); }; }
