// ============================================================
//  LAP DANCE refeita (lista 12, 27/11): sempre na frente do sofá (ela não passa mais por trás nem atravessa o encosto),
//  cada mão num lugar de verdade (quadril, cabelo, joelhos dele, encosto do sofá, ombros, pescoço), por IK.
//  Roteiro (80 bpm): anda de um lado para o outro → joga o cabelo → mãos nos joelhos dele → de costas, desce e sobe →
//  sentada no colo de costas, recostada nele → mãos no encosto, inclinada sobre ele → sentada de frente no colo, pés no chão.
//  Ele fica sentado com as pernas um pouco abertas e as mãos no sofá.
// ============================================================
const LAP2 = { bpm: 80, fpb: 3, seq: [['walk', 4], ['hair', 2], ['knees', 4], ['bend', 4], ['away', 8], ['rest', 4], ['astride', 8]] };
LAP2.len = LAP2.seq.reduce((a, s) => a + s[1], 0);
function lap2At(beat) { let b = ((beat % LAP2.len) + LAP2.len) % LAP2.len; for (const [m, n] of LAP2.seq) { if (b < n) return [m, b, n]; b -= n; } return ['walk', 0, 4]; }
if (typeof dzlSprite === 'function' && typeof G !== 'undefined') dzlSprite = function (e, L) {
  const beat = Math.max(0, (Date.now() - L.t0) / 60000 * LAP2.bpm), [mv, b0, n] = lap2At(beat), nF = n * LAP2.fpb, f = Math.min(nF - 1, Math.floor(b0 / n * nF)), dir = e.dir | 0, gN = G.npcs[L.g], kind = gN ? gN.kind : 'vl_comp1';
  const key = 'l2|' + mv + '|' + f + '|' + dir + '|' + L.g + '|' + (e.cls + e.skin + e.color); let s = DZL_SPR.get(key); if (s) return s; if (!R3.ok || (R3.budget != null && R3.budget <= 0 && L.last)) return L.last || null;
  const RA = dzlRig(e, 'LH'), eg = { isNpc: true, kind, id: L.g }, RB = dzlRig(eg, 'LG'); rigReset(RA); rigReset(RB);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), u = f / nF, ph = (b0 + 0.5 / LAP2.fpb) * Math.PI, sw = Math.sin(ph * 2) /* um balanço por batida */;
  /* ele: sentado, pernas um pouco abertas, mãos no sofá ao lado do quadril */
  affPose(RA, e, { dir: 2, sit: 'c' }); RA.root.rotation.set(0, 0, 0); RA.root.position.set(0, 0, -0.3); RA.LA.hp.rotation.z -= 0.24; RA.LB.hp.rotation.z += 0.24; RA.root.updateMatrixWorld(true);
  const hA = W(RA.hips), kA = W(RA.LA.kn), kB = W(RA.LB.kn), sideOf = j => Math.sign(W(j).x - hA.x) || 1;
  for (const arm of ['A', 'B']) { const sd = sideOf(RA[arm].sh); ikArm(RA, arm, V(hA.x + sd * 0.27, hA.y - 0.02, hA.z - 0.08), [0.2, -0.5, 0, 0.5]); }
  const footA = Math.min(W(RA.LA.ft).y, W(RA.LB.ft).y), headA = W(RA.head), back = V(0, headA.y - 0.06, headA.z - 0.2);   /* o encosto, atrás da cabeça dele */
  /* ela */
  const stand = (x, z, ry) => { affPose(RB, eg, { dir: 2 }); rigReset(RB); RB.root.rotation.set(0, ry, 0); RB.root.position.set(x, 0, z); RB.root.updateMatrixWorld(true); };
  const ground = () => { RB.root.updateMatrixWorld(true); let m = 9; for (const j of [RB.LA.ft, RB.LB.ft]) m = Math.min(m, W(j).y); RB.root.position.y += footA - m; RB.root.updateMatrixWorld(true); };
  const sway = (k) => { RB.hips.rotation.z = k * 0.13 * sw; RB.spine.rotation.z = -k * 0.09 * sw; RB.chest.rotation.z = -k * 0.04 * sw; };
  const hipOf = arm => affWP(RB.hips, (arm === 'A' ? -1 : 1) * 0.15, 0.06, 0.03);
  const sitOn = (ry, t, lean) => { affPose(RB, eg, { dir: 2, sit: 'c' }); rigReset(RB); RB.root.rotation.set(0, ry, 0); RB.root.position.set(0, 0, 0); RB.root.updateMatrixWorld(true); const seat = hA.clone().lerp(kA.clone().lerp(kB, 0.5), t); seat.y = Math.max(W(RA.LA.hp).y, W(RA.LB.hp).y) + 0.12; const hb = W(RB.hips); RB.root.position.set(seat.x - hb.x, seat.y - hb.y, seat.z - hb.z); RB.root.updateMatrixWorld(true); RB.spine.rotation.x = lean; };
  if (mv === 'walk') { stand(0.26 * Math.sin(u * Math.PI * 2), 0.66, Math.PI); RB.LA.kn.rotation.x = 0.12 + 0.15 * Math.max(0, sw); RB.LB.kn.rotation.x = 0.12 + 0.15 * Math.max(0, -sw); ground(); sway(1);   /* anda de um lado para o outro, o quadril balançando */
    ikArm(RB, 'A', hipOf('A'), [0.3, -0.4, 0, 1.4]); const hd = W(RB.head); ikArm(RB, 'B', hd.clone().add(V(0.06, 0.1 + 0.03 * sw, -0.02)), [2.4, -0.5, 0, 1.6]); lookAtP(RB, headA, 0.1 * sw); }
  else if (mv === 'hair') { stand(0, 0.6, Math.PI); ground(); sway(0.6); const k = Math.sin(u * Math.PI * 2); if (RB.neckJ) RB.neckJ.rotation.set(-0.15 * Math.abs(k), 0, 0.45 * k); RB.head.rotation.z = 0.25 * k; RB.spine.rotation.x = -0.12 * Math.abs(k); RB.root.updateMatrixWorld(true);   /* joga o cabelo de um lado para o outro */
    const hd = W(RB.head); ikArm(RB, 'A', hd.clone().add(V(-0.08, 0.1, 0)), [2.5, -0.4, 0, 1.6]); ikArm(RB, 'B', hd.clone().add(V(0.08, 0.12, 0)), [2.5, -0.4, 0, 1.6]); }
  else if (mv === 'knees') { const dn = Math.sin(u * Math.PI); stand(0, 0.5, Math.PI); RB.spine.rotation.x = 0.35 + 0.35 * dn + 0.06 * sw; RB.chest.rotation.x = 0.2 + 0.15 * dn; RB.LA.kn.rotation.x = 0.15; RB.LB.kn.rotation.x = 0.15; ground(); sway(0.4);   /* inclinada, as mãos nos joelhos dele */
    ikArm(RB, 'A', (W(RB.A.sh).x < 0 ? (kA.x < kB.x ? kA : kB) : (kA.x < kB.x ? kB : kA)).clone().add(V(0, 0.05, 0.02)), [1.2, -0.3, 0, 0.3]); ikArm(RB, 'B', (W(RB.B.sh).x < 0 ? (kA.x < kB.x ? kA : kB) : (kA.x < kB.x ? kB : kA)).clone().add(V(0, 0.05, 0.02)), [1.2, -0.3, 0, 0.3]); lookAtP(RB, headA, 0); }
  else if (mv === 'bend') { const dn = Math.sin(u * Math.PI); stand(0, 0.48, 0); RB.spine.rotation.x = 0.85 * dn; RB.chest.rotation.x = 0.3 * dn; RB.LA.kn.rotation.x = 0.1 + 0.2 * dn; RB.LB.kn.rotation.x = 0.1 + 0.2 * dn; ground(); sway(1);   /* de costas para ele, desce devagar com as mãos deslizando pelas coxas e sobe */
    for (const arm of ['A', 'B']) { const L0 = arm === 'A' ? RB.LA : RB.LB, kn = W(L0.kn), hp = W(L0.hp); ikArm(RB, arm, hp.clone().lerp(kn, 0.3 + 0.6 * dn).add(V(0, 0.02, 0.06)), [0.6, -0.3, 0, 0.4]); } }
  else if (mv === 'away') { sitOn(0, 0.6, -0.12 - 0.04 * sw); const c = Math.cos(ph * 2), sn = Math.sin(ph * 2); RB.root.position.x += 0.035 * c; RB.root.position.z += 0.025 * sn; RB.hips.rotation.z = 0.08 * c; RB.spine.rotation.z = -0.06 * c; RB.root.updateMatrixWorld(true);   /* sentada no colo de costas, recostada no peito dele, o quadril girando */
    for (const L0 of [RB.LA, RB.LB]) { L0.hp.rotation.z += (sideOf(L0.hp) > 0 ? 1 : -1) * 0.12; } RB.root.updateMatrixWorld(true);
    const nk = affWP(RA.neckJ || RA.head, 0, 0, -0.03); ikArm(RB, 'A', nk.clone().add(V(-0.1, 0.02, 0)), [2.6, -0.8, 0.4, 1.8]); ikArm(RB, 'B', nk.clone().add(V(0.1, 0.02, 0)), [2.6, -0.8, 0.4, 1.8]); if (RB.neckJ) RB.neckJ.rotation.set(-0.1, 0, 0.35); RB.head.rotation.z = 0.25 + 0.1 * c; }
  else if (mv === 'rest') { const dn = Math.sin(u * Math.PI); stand(0.05 * sw, 0.42, Math.PI); RB.spine.rotation.x = 0.5 + 0.25 * dn; RB.chest.rotation.x = 0.2 + 0.08 * dn; RB.LA.kn.rotation.x = 0.2; RB.LB.kn.rotation.x = 0.35; ground(); sway(0.5);   /* inclinada sobre ele, as mãos no encosto do sofá, uma de cada lado da cabeça */
    ikArm(RB, 'A', back.clone().add(V(W(RB.A.sh).x < 0 ? -0.28 : 0.28, 0, 0)), [1.8, -0.3, 0, 0.3]); ikArm(RB, 'B', back.clone().add(V(W(RB.B.sh).x < 0 ? -0.28 : 0.28, 0, 0)), [1.8, -0.3, 0, 0.3]); lookAtP(RB, headA, 0); lookAtP(RA, W(RB.head), 0); }
  else { sitOn(Math.PI, 0.6, -0.08 + 0.08 * sw); RB.root.position.y += 0.02; RB.root.updateMatrixWorld(true);   /* sentada de frente, as pernas por fora das dele, os pés no chão; mãos nos ombros dele; o corpo ondula */
    for (const L0 of [RB.LA, RB.LB]) { const sd = sideOf(L0.hp), kn = (sd > 0 ? (kA.x > kB.x ? kA : kB) : (kA.x > kB.x ? kB : kA)).clone().add(V(sd * 0.2, 0.04, 0.08)); const ft = kn.clone().add(V(sd * 0.03, -0.4, -0.06)); ft.y = Math.max(ft.y, footA + 0.03); if (typeof camaIkLeg === 'function') { let best = null; for (const z0 of [0.4, -0.4, 0]) for (const y0 of [0, 0.5, -0.5]) { const e0 = camaIkLeg(RB, L0, kn, ft, [1.3, y0, z0, 1.4]); if (!best || e0 < best.e) best = { e: e0, i: [1.3, y0, z0, 1.4] }; } camaIkLeg(RB, L0, kn, ft, best.i); } }
    for (const arm of ['A', 'B']) { const sd = Math.sign(W(RB[arm].sh).x) || 1, cl = (sd < 0 ? (W(RA.A.sh).x < 0 ? RA.A : RA.B) : (W(RA.A.sh).x < 0 ? RA.B : RA.A)); ikArm(RB, arm, affWP(cl.clav || RA.chest, 0, 0.08, 0.02), [1.4, -0.5, 0, 1.2]); }
    RB.chest.rotation.x = 0.1 * Math.sin(ph * 2 + 1); lookAtP(RB, headA, 0.15 * sw); lookAtP(RA, W(RB.head), 0); }
  { const minD = 0.3; let pushed = 0; for (let it = 0; it < 30; it++) { RB.root.updateMatrixWorld(true); const d = W(RA.head).distanceTo(W(RB.head)); if (d >= minD) break;   /* as cabeças nunca se atravessam */
    if ((mv === 'away' || mv === 'astride') && pushed > 0.12) { if (RB.neckJ) RB.neckJ.rotation.z += 0.06; RA.head.rotation.y += 0.05; RA.root.updateMatrixWorld(true); continue; }
    const st = Math.min(0.03, minD - d + 0.005); RB.root.position.z += st; pushed += st; if (mv !== 'away' && mv !== 'astride') ground(); } }
  if (mv !== 'rest' && mv !== 'astride') lookAtP(RA, W(RB.head).lerp(W(RB.hips), mv === 'bend' ? 0.6 : 0.2), 0);
  /* gira o par para a direção dele e põe no chão do quadro */
  const piv = new THREE.Group(); piv.rotation.y = affYaw(dir); for (const R of [RA, RB]) piv.add(R.root); piv.updateMatrixWorld(true);
  let minY = Infinity; for (const R of [RA, RB]) minY = Math.min(minY, new THREE.Box3().setFromObject(R.root).min.y); piv.position.y = -minY + 0.01; piv.updateMatrixWorld(true);
  const { renderer, scene, cam, W: Wd, H: Hh } = R3; scene.add(piv); renderer.render(scene, cam); scene.remove(piv); for (const R of [RA, RB]) piv.remove(R.root);
  const cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hh; cv.getContext('2d').drawImage(renderer.domElement, 0, 0); if (R3.budget != null) R3.budget--;
  s = { c: cv, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; DZL_SPR.set(key, s); L.last = s; if (DZL_SPR.size > 160) { const k0 = [...DZL_SPR.keys()].find(k => !k.startsWith('dzl|')); if (k0) DZL_SPR.delete(k0); } return s; };
