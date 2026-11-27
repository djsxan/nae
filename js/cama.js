// ============================================================
//  CAMA (lista 11, 27/11)
//  · F num NPC: ele para e se vira para quem falou (alguns segundos, ou enquanto a pessoa fica perto).
//  · Na cama, o travesseiro é a referência: a cabeça fica nele e o corpo segue a cama (sozinho e a dois).
//  · Colo na cama: as canelas de quem está por cima vão para trás, por fora das pernas de quem está embaixo.
//  · Beijo no colo (na cama) sem fim: dura até sair da cama.
//  · Deitados abraçados x carinho na barriga: no abraço o braço dela cruza o peito dele, a perna por cima e ele a
//    envolve; no carinho, a mão faz círculos na barriga.
//  · Beijo na cama: quem pediu passa a mão nas costas e na bunda de quem beija, com carinho e apertos leves.
//  · Novo: "Por cima de mim" / "Por cima de você": quem fica embaixo deitado de barriga para cima e quem fica por
//    cima ajoelhado, girando o quadril e os braços.
// ============================================================
const CAMA = { hk: 0.57, faceMs: 12000, faceR: 4.5, frames: { bBelly: [650, 4], bKiss: [700, 4], bTop: [210, 8], bTopMe: [210, 8] } };
const CAMA_NEW = { bTop: ['Por cima de mim', 'quer que você fique por cima', '🔥'], bTopMe: ['Por cima de você', 'quer ficar por cima de você', '🔥'] };
if (typeof AF2 !== 'undefined' && typeof AFX !== 'undefined') {
  for (const k in CAMA_NEW) { const [n, a, i] = CAMA_NEW[k]; AF2.K[k] = ['bed', n, a, i]; AFX.n[k] = n; AFX.ask[k] = a; AFX.i[k] = i; delete AFX.dur[k]; if (!AFF_KS.includes(k)) AFF_KS.push(k); if (typeof AFF_CTX !== 'undefined' && !AFF_CTX.bed.includes(k)) AFF_CTX.bed.push(k); if (!AFX.sin.includes(k)) AFX.sin.push(k); }
  for (const k of ['bLapK', 'bLapMeK']) { delete AFX.dur[k]; if (AF2.K[k]) AF2.K[k] = AF2.K[k].slice(0, 4); }   /* beijo no colo na cama: até sair da cama */
  if (typeof AFF_CARESS !== 'undefined') { const i = AFF_CARESS.indexOf('bHold'); if (i >= 0) AFF_CARESS.splice(i, 1); }   /* o abraço deitado não anima mais a mão */
}

// ---------------- SERVIDOR: o NPC para e se vira no F ----------------
if (typeof hostOnClient === 'function') { const _hoCa = hostOnClient; hostOnClient = function (from, m) {
  if (m && m.t === 'npcface') { const p = S.players[from], n = S.npcs && S.npcs[m.id]; if (p && n && !n.dead && !n.downed && (n.fl || 0) === (p.fl || 0) && Math.hypot(p.x - n.x, p.y - n.y) < CAMA.faceR) { if (n.faceT == null || n.faceP !== p.id) { n.faceX = n.x; n.faceY = n.y; } n.faceP = p.id; n.faceT = now_() + CAMA.faceMs; } return; }
  return _hoCa.apply(this, arguments); }; }
/* logo antes de mandar o estado: quem foi chamado fica onde estava, olhando para quem falou */
function npcFaceFix(now) { for (const n of Object.values(S.npcs || {})) { if (n.faceT == null) continue; const p = S.players[n.faceP];
  if (!p || now > n.faceT || n.dead || n.downed || n.dragBy || n.onBackBy || Math.hypot(p.x - n.x, p.y - n.y) > CAMA.faceR + 1) { n.faceT = null; n.faceX = n.faceY = null; n.faceP = null; continue; }
  if (n.aff || n.sleeping || n.sleep) continue;
  if (!n.sit && n.faceX != null) { n.x = n.faceX; n.y = n.faceY; n.walking = false; }
  if (!n.sit) { n.dir = dirFromVecS(p.x - n.x, p.y - n.y); if (now - (n.faceS || 0) > 900) { n.faceS = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'face', tx: p.x, ty: p.y, ms: 1 }); } } } }

// ---------------- CLIENTE ----------------
/* o F manda o pedido para o NPC do texto do F (ou o mais perto, se for conversa) */
if (typeof document !== 'undefined' && typeof addEventListener === 'function') addEventListener('keydown', ev => { try {
  if ((ev.key !== 'f' && ev.key !== 'F') || ev.repeat || !G.started || !G.me) return; const tg = ev.target && ev.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return;
  const el = document.getElementById('prompt'), t = ((el && el.textContent) || '').trim(); if (!/^F:/.test(t)) return; let best = null, bd = 3.2, near = null, nd = 2.4;
  for (const id in G.npcs) { const n = G.npcs[id]; if (!n || !n.name || n.npDead || n.npDown || n.dead) continue; const d = Math.hypot((n.rx ?? n.x) - G.me.x, (n.ry ?? n.y) - G.me.y); if (d < bd && t.includes(String(n.name).split(/[,(]/)[0].trim())) { bd = d; best = n; } if (d < nd) { nd = d; near = n; } }
  if (!best && /^F: falar/.test(t)) best = near; if (best) Net.send({ t: 'npcface', id: best.id }); } catch (e) { } }, true);

/* geometria de cada cama (em tiles): d = do centro até o travesseiro, top = topo do travesseiro, mat = colchão */
function camaGeo(B) { const h = B.h || 2;
  switch (B.t) { case 'cot': return { d: (h - 0.35) / 2 - 0.14, top: 0.38, mat: 0.34 }; case 'futon': return { d: (h - 0.2) / 2 - 0.16, top: 0.16, mat: 0.14 };
    case 'platbed': return { d: 0.6, top: 0.43, mat: 0.34 }; case 'vbed': return { d: 0.72, top: 0.45, mat: 0.36 }; case 'vmoonbed': return { d: 0.6, top: 0.48, mat: 0.38 };
    default: return { d: (h - 0.3) / 2 - 0.15, top: 0.53, mat: 0.44 }; } }
let _camaYM = 0;
function camaYM() { if (!_camaYM) { const pr = v => { const t = v.clone().project(R3.cam); return (1 - t.y) / 2 * FRAME_H; }; _camaYM = HV / Math.max(1, pr(new THREE.Vector3(0, 0, 0)) - pr(new THREE.Vector3(0, 1, 0))); } return _camaYM; }
/* a cama vista do quadro do sprite (origem = quem é desenhado, 11 px acima do chão) */
function camaFrame(bk, ex, ey) { const B = BEDS[bk]; if (!B) return null; const g = camaGeo(B), L = Math.hypot(B.dx, B.dy) || 1, ux = B.dx / L, uy = B.dy / L, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const p = affW2M(B.x - ux * g.d - ex, B.y - uy * g.d - ey), c = affW2M(B.x - ex, B.y - ey), f = affW2M(ux, uy), fl = Math.hypot(f.x, f.z) || 1, ym = camaYM(), lift = 11 / HV, F = V(f.x / fl, 0, f.z / fl);
  return { p: V(p.x, 0, p.z), c: V(c.x, 0, c.z), f: F, r: V(F.z, 0, -F.x), mat: (g.mat * CAMA.hk - lift) * ym, top: (g.top * CAMA.hk - lift) * ym, tile: { x: B.x - ux * g.d - ex, y: B.y - uy * g.d - ey } }; }
function camaBedOf(e) { if (!e) return -1; if (e === G.me && G.me.sleep && BEDS[G.me.sleep.bed]) { const B = BEDS[G.me.sleep.bed]; return Math.hypot(B.x - (e.rx ?? e.x), B.y - (e.ry ?? e.y)) < 1.2 ? G.me.sleep.bed : -1; } const x = e.rx ?? e.x, y = e.ry ?? e.y, fl = e.fl || 0;
  if (e._camaB != null && BEDS[e._camaB] && Math.hypot(BEDS[e._camaB].x - x, BEDS[e._camaB].y - y) < 0.9) return e._camaB;
  let bi = -1, bd = 0.9; for (let i = 0; i < BEDS.length; i++) { const B = BEDS[i]; if ((B.fl || 0) !== fl) continue; const d = Math.hypot(B.x - x, B.y - y); if (d < bd) { bd = d; bi = i; } } e._camaB = bi; return bi; }
const camaW = j => j.getWorldPosition(new THREE.Vector3());
/* gira e põe no lugar: o eixo cabeça→pés vira o eixo da cama, a cabeça vai para o travesseiro e o corpo desce até o colchão */
function camaFit(Rs, F, head, axis, o) { o = o || {}; const up = new THREE.Vector3(0, 1, 0), th = Math.atan2(F.f.x, F.f.z) - Math.atan2(axis.x, axis.z), q = new THREE.Quaternion().setFromAxisAngle(up, th), piv = head.clone();
  for (const R of Rs) { const rel = R.root.position.clone().sub(piv).applyQuaternion(q); R.root.position.copy(piv).add(rel); R.root.quaternion.premultiply(q); R.root.updateMatrixWorld(true); }
  const heads = (o.heads || [head]).map(h => h.clone().sub(piv).applyQuaternion(q).add(piv)); let mn = Infinity, lat = 0; for (const h of heads) { mn = Math.min(mn, h.clone().sub(F.p).dot(F.f)); lat += h.clone().sub(F.p).dot(F.r) / heads.length; }
  lat -= o.lat || 0; const mv = F.f.clone().multiplyScalar(-mn + (o.fwd || 0)).add(F.r.clone().multiplyScalar(-lat)); let minY = Infinity;
  for (const R of Rs) { R.root.position.add(mv); R.root.updateMatrixWorld(true); minY = Math.min(minY, new THREE.Box3().setFromObject(R.root).min.y); }
  for (const R of Rs) { R.root.position.y += F.mat - minY + (o.dy || 0); R.root.updateMatrixWorld(true); } }
const camaFeet = R => camaW(R.LA.ft).add(camaW(R.LB.ft)).multiplyScalar(0.5);
const camaKnees = R => camaW(R.LA.kn).add(camaW(R.LB.kn)).multiplyScalar(0.5);
function camaAxis(R, to) { const a = (to || camaFeet(R)).sub(camaW(R.head)); a.y = 0; return a.normalize(); }
/* cabeça apoiada no travesseiro: o pescoço levanta um pouco */
function camaPillowHead(R, k) { if (R.neckJ) R.neckJ.rotation.x = (R.neckJ.rotation.x || 0) - (k == null ? 0.32 : k); R.root.updateMatrixWorld(true); }
/* IK da perna: joelho e tornozelo nos alvos (quadril em 3 eixos, joelho só dobra para trás) */
function camaIkLeg(R, L, kneeT, footT, init) { const p = (init || [0.4, 0, 0, 1]).slice(), lim = [[-1.2, 2.6], [-1.2, 1.2], [-1.4, 1.4], [0, 2.9]];
  const set = q => { L.hp.rotation.set(-q[0], q[1], q[2]); L.kn.rotation.x = q[3]; L.hp.updateMatrixWorld(true); }, err = q => { set(q); return camaW(L.kn).distanceToSquared(kneeT) + (footT ? camaW(L.ft).distanceToSquared(footT) : 0); };
  let best = err(p), st = 0.4; for (let it = 0; it < 160 && st > 0.004; it++) { let imp = false; for (let i = 0; i < 4; i++) for (const d of [st, -st]) { const q = p.slice(); q[i] = Math.min(lim[i][1], Math.max(lim[i][0], q[i] + d)); const e = err(q); if (e < best) { best = e; p.splice(0, 4, ...q); imp = true; } } if (!imp) st *= 0.55; }
  set(p); return Math.sqrt(best); }
function camaRender(Rs) { const { renderer, scene, cam, W, H } = R3;
  for (const R of Rs) { for (const X of [R.A, R.B]) if (X && X.slv && typeof hangWorld === 'function') hangWorld(X.slv, R, 0); scene.add(R.root); R.root.updateMatrixWorld(true); }
  renderer.render(scene, cam); for (const R of Rs) scene.remove(R.root); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(renderer.domElement, 0, 0);
  return { c: cv, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; }

/* sozinho na cama */
const CAMA_SPR = new Map();
function camaSleepDraw(ctx, e, sx, sy, now, pr) { if (pr || !R3.ok || typeof affRigOf !== 'function') return false; const bk = camaBedOf(e); if (bk < 0) return false;
  const ex = e.rx ?? e.x, ey = e.ry ?? e.y, bath = !e.isNpc, r = affRigOf('C', e, 'bed', bath), key = r.lk + '|' + bk + '|' + Math.round((ex - BEDS[bk].x) * 20) + ',' + Math.round((ey - BEDS[bk].y) * 20) + '|' + (e.lost || 0) + ':' + (e.pro || 0);
  let s = CAMA_SPR.get(key); if (!s) { if (R3.budget != null && R3.budget <= 0) return false; if (R3.budget != null) R3.budget--; const R = r.R, F = camaFrame(bk, ex, ey); if (!F) return false;
    affPose(R, e, { down: true, bed: 1, dir: 2 }); affLie(R, 0, 0, 0, 0); camaPillowHead(R); camaFit([R], F, camaW(R.head), camaAxis(R), { lat: -F.c.dot(F.r) }); s = camaRender([R]); s.zz = F.tile;
    CAMA_SPR.set(key, s); if (CAMA_SPR.size > 40) CAMA_SPR.delete(CAMA_SPR.keys().next().value); }
  ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy - 11);
  if (typeof drawZzz === 'function') { const z = s.zz || { x: 0, y: 0 }; drawZzz(ctx, sx + (z.x - z.y) * HTW, sy + (z.x + z.y) * HTH - 30, now); } e._spr = null; return true; }

/* a dois: quadros (com a cama na chave) */
if (typeof affPairSprite2 === 'function' && typeof G !== 'undefined') { const _psCa = affPairSprite2; affPairSprite2 = function (e, o, A) {
  if (A && A.ctx === 'bed') { const bk = camaBedOf(e), fr = CAMA.frames[A.k]; let f = 0; if (fr) f = Math.floor(performance.now() / fr[0]) % fr[1]; A = Object.assign({}, A, { _bk: bk, _lapfr: (bk + 1) * 100 + f }); }
  return _psCa(e, o, A); }; }
if (typeof affBuild2 === 'function' && typeof G !== 'undefined') { const _abCa = affBuild2; affBuild2 = function (k, e, o, A) {
  if (!A || A.ctx !== 'bed' || !/^b(Hold|Belly|Kiss|Lap|LapK|LapMe|LapMeK|Top|TopMe)$/.test(k)) return _abCa.apply(this, arguments);
  const bk = A._bk != null ? A._bk : camaBedOf(e), f = (A.fr || 0) % 100, F = bk >= 0 ? camaFrame(bk, e.rx ?? e.x, e.ry ?? e.y) : null;
  if (k === 'bTop' || k === 'bTopMe') return camaTop(k, e, o, A, F, f);
  if (/Lap/.test(k)) return camaLapBed(k, e, o, A, F);
  const r = _abCa.apply(this, arguments), RA = r[0], RB = r[1];
  if (k === 'bHold') camaHug(RA, RB); else if (k === 'bKiss') camaButt(RA, RB, f);
  if (F) { if (k !== 'bKiss') camaPillowHead(RA, 0.2); camaFit([RA, RB], F, camaW(RA.head), camaAxis(RA), { heads: [camaW(RA.head), camaW(RB.head)] }); }
  return r; }; }
/* abraço deitado: o braço dela cruza o peito dele até o ombro do outro lado, a perna dela por cima das dele e ele a envolve pelas costas */
function camaHug(RA, RB) { const hB = camaW(RB.head), farA = affNear2(RA, RA.A.sh, RA.B.sh, hB) ? 'B' : 'A', nearA = farA === 'A' ? 'B' : 'A', top = camaW(RB.A.sh).y > camaW(RB.B.sh).y ? 'A' : 'B', bot = top === 'A' ? 'B' : 'A';
  ikArm(RB, top, affWP(RA[farA].clav || RA.chest, 0, 0.04, 0.06), [1.2, -0.4, 0, 1.0]);   /* por cima do peito dele */
  ikArm(RB, bot, affWP(RA[nearA].clav || RA.chest, 0, 0.1, 0.02).lerp(camaW(RB.head), 0.35), [0.9, -0.5, 0, 1.8]);   /* o outro braço dobrado junto do rosto */
  ikArm(RA, nearA, affWP(RB.spine, 0, 0.1, -0.13), [0.9, -0.9, 0.2, 1.3]);   /* ele a envolve pelas costas */
  const lTop = camaW(RB.LA.hp).y > camaW(RB.LB.hp).y ? RB.LA : RB.LB, kA = camaKnees(RA), hA = camaW(RA.hips), up = new THREE.Vector3(0, 1, 0);
  camaIkLeg(RB, lTop, hA.clone().lerp(kA, 0.75).add(up.clone().multiplyScalar(0.13)), camaFeet(RA).lerp(kA, 0.45).add(up.clone().multiplyScalar(0.1)), [0.9, 0, 0, 1.2]); }
/* beijo deitado: a mão de quem pediu desce pelas costas até a bunda, com carinhos e apertos leves */
function camaButt(RA, RB, f) { const top = camaW(RA.A.sh).y > camaW(RA.B.sh).y ? 'A' : 'B', side = top === 'A' ? -1 : 1, a = f * Math.PI / 2, sq = f === 2 ? 0.025 : 0;
  ikArm(RA, top, affWP(RB.hips, side * (0.05 + 0.025 * Math.cos(a)), -0.05 + 0.025 * Math.sin(a), -0.13 + sq), [1.0, -0.6, 0, 0.9]); }
/* colo na cama: quem fica embaixo recostado na cabeceira, pernas esticadas na cama; quem senta de frente, ajoelhado sobre as coxas */
function camaLapBed(k, e, o, A, F) { const me = /LapMe/.test(k), kiss = /K$/.test(k), a = affRigOf('A', e, k, true), b = affRigOf('B', o, k, true), RA = a.R, RB = b.R, base = me ? RB : RA, rider = me ? RA : RB, eb = me ? o : e, er = me ? e : o;
  affPose(base, eb, { sit: 'g', dir: 2 }); affPose(rider, er, { sit: 'c', dir: 2 }); affPut(base, 2, 0, 0, true);
  for (const [L, s] of [[base.LA, -1], [base.LB, 1]]) { L.hp.rotation.set(-1.5, 0, s * 0.09); L.kn.rotation.x = 0.12; if (L.ft) L.ft.rotation.x = -0.2; }   /* pernas esticadas para a frente */
  base.spine.rotation.x = -0.32; base.chest.rotation.x = -0.08; base.root.updateMatrixWorld(true);   /* recostado */
  affStraddle(base, rider, kiss); camaStraddleLegs(base, rider); if (kiss) camaLapKissHead(base, rider);
  if (F) camaFit([base, rider], F, camaW(base.head), camaAxis(base, camaKnees(base)), { fwd: 0.08 });
  else { let minY = Infinity; for (const R of [base, rider]) { R.root.updateMatrixWorld(true); minY = Math.min(minY, new THREE.Box3().setFromObject(R.root).min.y); } for (const R of [base, rider]) { R.root.position.y += 0.01 - minY; R.root.updateMatrixWorld(true); } }
  return [RA, RB, a.lk, b.lk]; }
/* colo na cama: canelas para trás, por fora das pernas de quem está embaixo, apoiadas na cama */
function camaStraddleLegs(base, rider) { const hb = camaW(base.hips), fw = affWP(base.hips, 0, 0, 1).sub(hb), rt = affWP(base.hips, 1, 0, 0).sub(hb), kb = camaKnees(base), mY = Math.min(camaW(base.LA.kn).y, camaW(base.LB.kn).y, hb.y) - 0.04;
  fw.y = 0; fw.normalize(); rt.y = 0; rt.normalize(); const rh = camaW(rider.hips);
  for (const L of [rider.LA, rider.LB]) { const s = camaW(L.hp).sub(rh).dot(rt) > 0 ? 1 : -1, wide = 0.27;
    const kn = hb.clone().lerp(kb, 0.2).add(rt.clone().multiplyScalar(s * wide)); kn.y = mY;   /* joelho na cama, ao lado do quadril dele */
    const ft = kn.clone().add(fw.clone().multiplyScalar(0.38)).add(rt.clone().multiplyScalar(s * 0.04)); ft.y = mY;   /* canela para trás dela: na direção dos pés dele, por fora das pernas */
    camaIkLeg(rider, L, kn, ft, [1.2, 0, s * -0.4, 2.2]); if (L.ft) L.ft.rotation.x = 0.6; } }
/* beijo no colo: a cabeça não sai do corpo — os dois se inclinam pela coluna e o pescoço só acompanha */
function camaLapKissHead(base, rider) { const lim = [[-0.25, 0.45], [-0.15, 0.15], [-0.3, 0.3], [-0.1, 0.2], [-0.15, 0.15]];
  if (base.neckJ) base.neckJ.rotation.set(0, 0, 0); if (rider.neckJ) rider.neckJ.rotation.set(0, 0, 0); base.head.rotation.set(0, 0, 0); rider.head.rotation.set(0, 0, 0);
  for (let r = 0; r < 4; r++) { const mid = affMouth(base).add(affMouth(rider)).multiplyScalar(0.5); affBend(base, affMouth, mid, [[-0.3, 0.25], [-0.15, 0.15], [-0.25, 0.25], [-0.1, 0.2], [-0.15, 0.15]]); affBend(rider, affMouth, mid, lim); }
  lookAtP(base, affMouth(rider), 0.15); lookAtP(rider, affMouth(base), -0.2); base.head.rotation.x *= 0.5; base.head.rotation.y *= 0.5; rider.head.rotation.x *= 0.5; rider.head.rotation.y *= 0.5; base.root.updateMatrixWorld(true); rider.root.updateMatrixWorld(true); }
/* por cima: quem fica embaixo deitado de barriga para cima; quem fica por cima ajoelhado sobre o quadril, girando o quadril e os braços */
function camaTop(k, e, o, A, F, f) { const me = k === 'bTopMe', a = affRigOf('A', e, k, true), b = affRigOf('B', o, k, true), RA = a.R, RB = b.R, base = me ? RB : RA, rider = me ? RA : RB, eb = me ? o : e, er = me ? e : o, V = (x, y, z) => new THREE.Vector3(x, y, z);
  affPose(base, eb, { down: true, bed: 1, dir: 2 }); affLie(base, 0, 0, 0, 0); camaPillowHead(base, 0.45);
  affPose(rider, er, { dir: 2 }); const ax = camaAxis(base), up = V(0, 1, 0); rider.root.quaternion.identity(); rider.root.rotation.set(0, Math.atan2(-ax.x, -ax.z), 0); rider.root.position.set(0, 0, 0); rider.root.updateMatrixWorld(true);
  const ph = f * Math.PI / 4, rt = V(ax.z, 0, -ax.x), hb = camaW(base.hips), circ = rt.clone().multiplyScalar(0.045 * Math.cos(ph)).add(ax.clone().multiplyScalar(0.04 * Math.sin(ph)));
  const seat = hb.clone().add(up.clone().multiplyScalar(0.2)).add(circ), hr = camaW(rider.hips); rider.root.position.set(seat.x - hr.x, seat.y - hr.y, seat.z - hr.z); rider.root.updateMatrixWorld(true);
  rider.spine.rotation.set(0.08 - 0.1 * Math.sin(ph), 0, 0.14 * Math.cos(ph)); rider.chest.rotation.set(0.04 - 0.06 * Math.sin(ph), 0, -0.1 * Math.cos(ph)); if (rider.neckJ) rider.neckJ.rotation.set(0.05, 0, -0.06 * Math.cos(ph));   /* o quadril gira, o tronco compensa */
  const mY = camaW(base.hips).y - 0.06, kb = camaKnees(base);
  for (const L of [rider.LA, rider.LB]) { const s = camaW(L.hp).sub(camaW(rider.hips)).dot(rt) > 0 ? 1 : -1, wide = 0.25; const kn = hb.clone().add(rt.clone().multiplyScalar(s * wide)).add(ax.clone().multiplyScalar(-0.04)); kn.y = mY;
    const ft = hb.clone().lerp(kb, 0.55).add(rt.clone().multiplyScalar(s * (wide + 0.02))); ft.y = mY; camaIkLeg(rider, L, kn, ft, [1.3, 0, s * -0.3, 2.3]); if (L.ft) L.ft.rotation.x = 0.6; }
  const hd = camaW(rider.head), fwR = affWP(rider.chest, 0, 0, 1).sub(camaW(rider.chest)).normalize();
  for (const [arm, s] of [['A', -1], ['B', 1]]) { const p2 = ph * (s > 0 ? 1 : -1) + (s > 0 ? 0 : Math.PI), c = hd.clone().add(up.clone().multiplyScalar(0.2)).add(rt.clone().multiplyScalar(s * 0.1)).add(fwR.clone().multiplyScalar(0.04));
    ikArm(rider, arm, c.add(rt.clone().multiplyScalar(0.07 * Math.cos(p2))).add(up.clone().multiplyScalar(0.06 * Math.sin(p2))), [2.4, -0.4, 0, 1.0]); }   /* os braços em círculos, acima da cabeça */
  for (const arm of ['A', 'B']) { const s = arm === 'A' ? -1 : 1; ikArm(base, arm, affWP(rider.hips, s * 0.14, 0.02, 0.02), [0.9, -0.4, 0, 1.0]); }   /* as mãos de quem está embaixo no quadril de quem está por cima */
  lookAtP(base, camaW(rider.head), 0); lookAtP(rider, camaW(base.head), 0);
  if (F) camaFit([base, rider], F, camaW(base.head), camaAxis(base), { lat: 0 });
  else { let minY = Infinity; for (const R of [base, rider]) { R.root.updateMatrixWorld(true); minY = Math.min(minY, new THREE.Box3().setFromObject(R.root).min.y); } for (const R of [base, rider]) { R.root.position.y += 0.01 - minY; R.root.updateMatrixWorld(true); } }
  return [RA, RB, a.lk, b.lk]; }

/* cama a quatro (afeto5): a cena gira com a cama, a cabeça dele no travesseiro (no meio da cama) e todos no colchão */
if (typeof af5Sprite === 'function' && typeof G !== 'undefined') af5Sprite = function (G0) { const fr = Math.floor(performance.now() / AF5.frMs) % AF5.frames, key = 'c|' + G0.sc + '|' + fr + '|' + G0.pid + '|' + G0.bed + '|' + G0.ids.join(','); let s = AF5_SPR.get('s|' + key); if (s) return s; if (!R3.ok || (R3.budget != null && R3.budget <= 0 && G0.last)) return G0.last || null;
  const pe = G.players[G0.pid]; if (!pe || !POSES[G0.sc]) return null; const H = { e: pe, R: af5Rig(pe, 'H') }, girls = G0.ids.map((id, i) => { const n = G.npcs[id]; const e = { isNpc: true, kind: n ? n.kind : 'vl_comp1', id }; return { e, R: af5Rig(e, 'G' + i) }; }); if (girls.length < 3) return null;
  for (const R of [H.R].concat(girls.map(g => g.R))) rigReset(R);
  const Rs = POSES[G0.sc](H, girls), ph = fr / AF5.frames * Math.PI * 2; Rs.forEach((R, i) => af5Wiggle(R, ph, i * 1.3)); for (const R of Rs) R.root.updateMatrixWorld(true);
  const B = BEDS[G0.bed], F = B ? camaFrame(G0.bed, B.x, B.y) : null;
  if (F) camaFit(Rs, F, camaW(H.R.head), camaAxis(H.R), { lat: 0, fwd: 0.04 });
  else { let minY = Infinity; for (const R of Rs) { R.root.position.z += AF5.zShift; R.root.updateMatrixWorld(true); minY = Math.min(minY, new THREE.Box3().setFromObject(R.root).min.y); } for (const R of Rs) { R.root.position.y += 0.01 - minY; R.root.updateMatrixWorld(true); } }
  s = camaRender(Rs); if (R3.budget != null) R3.budget--; AF5_SPR.set('s|' + key, s); G0.last = s;
  for (const k of [...AF5_SPR.keys()]) if (k.startsWith('s|') && AF5_SPR.size > 90) AF5_SPR.delete(k); return s; };
