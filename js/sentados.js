// ============================================================
//  AFETO SENTADO (lista 12, 27/11): os dois ficam nos próprios lugares, lado a lado
//  · De mãos dadas: os braços que se encostam alinhados, as mãos juntas em cima dos joelhos.
//  · Abraçados: quem pediu passa o braço por trás dos ombros de quem está ao lado; ela encosta nele.
//  · Beijo: os dois giram só o tronco (quadril e joelhos para a frente); lento e sem fim; as mãos passeiam
//    (dele: rosto/nuca → ombros → cintura/coxa; dela: peito → pescoço → rosto dele) e as cabeças trocam de lado.
//  · Cabeça no colo: quem deita continua sentado e tomba o tronco de lado até o colo do outro, que faz carinho no cabelo.
//  · Sussurro: no sofá, sem ninguém sair do lugar.
// ============================================================
const SENT = { kissMs: 520, kissN: 24, gap: 0.44 };
if (typeof AF2 !== 'undefined' && typeof AFX !== 'undefined') { delete AFX.dur.sKiss; if (AF2.K.sKiss) AF2.K.sKiss = AF2.K.sKiss.slice(0, 4); }   /* o beijo sentado dura até alguém levantar */
const SENT_KS = /^(sHand|sHug|sKiss|tLapH|tWhis)$/;
if (typeof affPairSprite2 === 'function' && typeof G !== 'undefined') { const _psSe = affPairSprite2; affPairSprite2 = function (e, o, A) {
  if (A && A.ctx === 'seat' && A.k === 'sKiss') A = Object.assign({}, A, { _lapfr: Math.floor(performance.now() / SENT.kissMs) % SENT.kissN });
  return _psSe(e, o, A); }; }
if (typeof affBuild2 === 'function' && typeof G !== 'undefined') { const _abSe = affBuild2; affBuild2 = function (k, e, o, A) {
  if (!A || (A.ctx || 'stand') !== 'seat' || !SENT_KS.test(k)) return _abSe.apply(this, arguments);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), a = affRigOf('A', e, k, false), b = affRigOf('B', o, k, false), RA = a.R, RB = b.R; rigReset(RA); rigReset(RB);
  const rel = affW2M((o.rx ?? o.x) - (e.rx ?? e.x), (o.ry ?? o.y) - (e.ry ?? e.y)), L0 = Math.hypot(rel.x, rel.z); if (L0 > SENT.gap) { rel.x *= SENT.gap / L0; rel.z *= SENT.gap / L0; }
  const sitOf = x => x.isNpc ? 'c' : x === G.me ? (G.me.sit && G.me.sit.chair === 0 ? 'g' : 'c') : ((x.flags & 1024) ? 'c' : 'g'), dA = e.dir | 0, dB = o.dir | 0;
  affPose(RA, e, { sit: sitOf(e), dir: dA }); affPose(RB, o, { sit: sitOf(o), dir: dB }); affPut(RA, dA, 0, 0); affPut(RB, dB, rel.x, rel.z);
  const near = (R, P) => affNear2(R, R.A.sh, R.B.sh, P) ? 'A' : 'B', far = (R, P) => near(R, P) === 'A' ? 'B' : 'A', nearL = (R, P) => W(R.LA.kn).distanceTo(P) < W(R.LB.kn).distanceTo(P) ? R.LA : R.LB;
  const hA = W(RA.hips), hB = W(RB.hips), nA = near(RA, hB), nB = near(RB, hA), fA = nA === 'A' ? 'B' : 'A', fB = nB === 'A' ? 'B' : 'A';
  if (k === 'sHand') { const kA = W(nearL(RA, hB).kn), kB = W(nearL(RB, hA).kn), mid = kA.clone().lerp(kB, 0.5).add(V(0, 0.07, 0)), back = hA.clone().lerp(hB, 0.5); back.y = mid.y; const m = mid.clone().lerp(back, 0.25);   /* as mãos juntas sobre os joelhos que se encostam */
    for (const R of [RA, RB]) { const P = R === RA ? hB : hA, s = R.root.worldToLocal(P.clone()).x > 0 ? 1 : -1; R.spine.rotation.z = -s * 0.06; R.root.updateMatrixWorld(true); }   /* os dois se inclinam um pouco um para o outro: os ombros se encostam */
    ikArm(RA, nA, m.clone().add(V(0, 0.015, 0)), [0.5, 0.1, 0, 1.2]); ikArm(RB, nB, m.clone().add(V(0, -0.01, 0)), [0.5, 0.1, 0, 1.2]);
    ikArm(RA, fA, W(nearL(RA, hA.clone().add(hA.clone().sub(hB))).kn).add(V(0, 0.06, 0)), [0.4, -0.2, 0, 1.2]); ikArm(RB, fB, W(nearL(RB, hB.clone().add(hB.clone().sub(hA))).kn).add(V(0, 0.06, 0)), [0.4, -0.2, 0, 1.2]);
    lookAtP(RB, W(RA.head), -0.1); }
  else if (k === 'sHug') { const clF = RB[fB].clav || RB.chest, cl = RA[nA].clav || RA.chest;   /* o braço dele por trás dos ombros dela, a mão no ombro do outro lado */
    affBend(RB, R => R.head.localToWorld(V(0, 0.02, 0)), affWP(cl, 0, 0.1, 0.02), [[-0.05, 0.25], [-0.35, 0.35], [-0.3, 0.3], [-0.1, 0.25], [-0.45, 0.45]]);   /* ela encosta a cabeça no ombro dele */
    ikArm(RA, nA, affWP(clF, 0, 0.05, -0.05), [1.6, -1.2, 0.2, 1.0]); ikArm(RA, fA, W(nearL(RA, hA.clone().add(hA.clone().sub(hB))).kn).add(V(0, 0.07, 0)), [0.4, -0.2, 0, 1.2]);
    ikArm(RB, nB, affWP(RA.chest, 0, 0.0, 0.14), [0.9, -0.3, 0, 1.4]); ikArm(RB, fB, W(nearL(RB, hA).kn).lerp(W(nearL(RA, hB).kn), 0.6).add(V(0, 0.07, 0)), [0.6, -0.2, 0, 1.0]);   /* a mão dela no peito dele e a outra na coxa dele */
    lookAtP(RA, W(RB.head), 0.1); }
  else if (k === 'sKiss') sentKiss(RA, RB, hA, hB, nA, nB, fA, fB, (A.fr || 0) % SENT.kissN);
  else if (k === 'tLapH') { const kB = W(nearL(RB, hA).kn), thigh = hB.clone().lerp(kB, 0.55).add(V(0, 0.13, 0)), s = RA.root.worldToLocal(hB.clone()).x > 0 ? 1 : -1;   /* quem deita continua sentado e tomba o tronco até o colo */
    affBend(RA, R => R.head.localToWorld(V(-s * 0.08, 0, 0)), thigh, [[-0.2, 0.9], [-1.4, 1.4], [-0.6, 0.6], [-0.4, 0.5], [-0.8, 0.8]]); RA.head.rotation.z = s * 0.2; RA.root.updateMatrixWorld(true);
    ikArm(RA, near(RA, hB), kB.clone().add(V(0, 0.04, 0)), [0.6, 0.2, 0, 1.4]); ikArm(RA, far(RA, hB), W(RA.hips).lerp(kB, 0.4).add(V(0, 0.1, 0)), [0.4, 0, 0, 1.6]);
    ikArm(RB, near(RB, W(RA.head)), affWP(RA.head, 0, 0.08, -0.02), [0.9, -0.4, 0, 1.4]); ikArm(RB, far(RB, W(RA.head)), affWP(RA.chest, 0, 0.05, -0.1), [0.7, -0.3, 0, 1.3]); lookAtP(RB, W(RA.head), 0); }
  else if (k === 'tWhis') { const s = RA.root.worldToLocal(hB.clone()).x > 0 ? 1 : -1, ear = affWP(RB.head, -s * 0.09, 0.0, 0.0);   /* boca no ouvido do outro, a mão em concha */
    affBend(RA, affMouth, ear.clone().add(V(0, 0, 0)), [[-0.1, 0.45], [-0.5, 0.5], [-0.7, 0.7], [-0.2, 0.4], [-0.5, 0.5]]); lookAtP(RA, ear, 0.1);
    const m = affMouth(RA); ikArm(RA, near(RA, ear), m.clone().lerp(ear, 0.5).add(V(0, 0.02, 0)).add(affWP(RA.head, 0, 0, 0.06).sub(W(RA.head))), [1.4, -0.4, 0.3, 2.0]);
    ikArm(RA, far(RA, ear), W(nearL(RB, hA).kn).add(V(0, 0.06, 0)), [0.6, -0.2, 0, 1.0]); RB.head.rotation.z = s * 0.15; lookAtP(RB, W(RA.head), s * 0.2);
    ikArm(RB, near(RB, hA), W(nearL(RA, hB).kn).add(V(0, 0.06, 0)), [0.6, -0.2, 0, 1.0]); }
  for (const R of [RA, RB]) R.root.updateMatrixWorld(true);
  return [RA, RB, a.lk, b.lk]; }; }
/* beijo sentado, lento: o tronco gira, as mãos passeiam por três lugares e as cabeças trocam de lado */
function sentKiss(RA, RB, hA, hB, nA, nB, fA, fB, f) { const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), seg = Math.floor(f / 8), t = (f % 8) / 8, nx = (seg + 1) % 3, mix = t < 0.7 ? 0 : (t - 0.7) / 0.3;
  for (const [R, P] of [[RA, hB], [RB, hA]]) { const me = W(R.hips), to = P.clone().sub(me), fw = affWP(R.hips, 0, 0, 1).sub(me); let ang = Math.atan2(to.x, to.z) - Math.atan2(fw.x, fw.z); while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI;
    const tw = Math.max(-0.75, Math.min(0.75, ang * 0.6)); R.spine.rotation.y = tw * 0.45; R.chest.rotation.y = tw * 0.55; R.root.updateMatrixWorld(true); }   /* só o tronco gira: o quadril e os joelhos ficam para a frente */
  const roll = (seg % 2 ? 1 : -1) * (0.3 + 0.05 * Math.sin(f / 8 * Math.PI * 2)), LIM = [[-0.05, 0.35], [-0.25, 0.25], [-0.5, 0.5], [-0.15, 0.35], [-0.35, 0.35]];
  for (let r = 0; r < 4; r++) { const mA = affMouth(RA), mB = affMouth(RB), mid = mA.clone().add(mB).multiplyScalar(0.5), dA = mA.clone().sub(mB).normalize().multiplyScalar(0.02); lookAtP(RA, mB, roll); lookAtP(RB, mA, -roll); affBend(RA, affMouth, mid.clone().add(dA), LIM); affBend(RB, affMouth, mid.clone().sub(dA), LIM); }
  const thighB = W(RB.LA.kn).lerp(W(RB.LB.kn), 0.5).lerp(W(RB.hips), 0.45).add(V(0, 0.1, 0)), heA = [affWP(RB.neckJ || RB.head, 0, 0.0, -0.06).lerp(affWP(RB.head, 0.05, -0.02, 0.04), 0.3), affWP(RB[fB].clav || RB.chest, 0, 0.06, -0.06), affWP(RB.spine, 0, 0.0, 0.0).lerp(thighB, 0.6)];
  const heB = [affWP(RA.chest, 0, 0.0, 0.15), affWP(RA.neckJ || RA.head, 0, -0.02, -0.07), affWP(RA.head, 0, -0.05, 0.05).add(affWP(RA.head, 0.08, 0, 0).sub(W(RA.head)).multiplyScalar(RA.root.worldToLocal(hB.clone()).x > 0 ? 1 : -1))];
  const pa = heA[seg].clone().lerp(heA[nx], mix), pb = heB[seg].clone().lerp(heB[nx], mix);
  ikArm(RA, nA, pa, seg === 1 ? [1.6, -1.2, 0.2, 1.0] : [1.1, -0.6, 0, 1.4]); ikArm(RB, nB, pb, seg === 1 ? [1.6, -0.8, 0.2, 1.2] : [1.0, -0.5, 0, 1.4]);
  ikArm(RA, fA, W(RA.hips).add(affWP(RA.hips, 0, 0, 0.22).sub(W(RA.hips))).add(V(0, 0.12, 0)), [0.4, -0.2, 0, 1.3]);   /* a outra mão dele no próprio colo */
  ikArm(RB, fB, seg === 2 ? affWP(RA.chest, 0.05, 0.08, 0.15) : W(RB.hips).add(affWP(RB.hips, 0, 0, 0.22).sub(W(RB.hips))).add(V(0, 0.12, 0)), [0.5, -0.2, 0, 1.3]); }
