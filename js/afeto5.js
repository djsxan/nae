/* Lista 9: poses novas de afeto (geradas do protótipo nae-ferramentas/scratchpad/proto_poses.js) e a cama a quatro no jogo */
/* PROTÓTIPO das poses de afeto da lista 9 (só no roteiro de fotos). Usa as juntas e a IK do js/afeto.js e as ferramentas do js/afeto2.js
   (affPose, affLie, affBend, ikArm, lookAtP, rigExtra). Cada cena recebe o herói H e as moças G e devolve os bonecos para fotografar. */
(function () {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), WP = (o, x, y, z) => { o.updateMatrixWorld(true); return o.localToWorld(V(x, y, z)); };
  const near = (R, P) => W(R.A.sh).distanceTo(P) < W(R.B.sh).distanceTo(P) ? 'A' : 'B';
  const mouth = R => { R.root.updateMatrixWorld(true); return R.head.localToWorld(V(0, -0.05, 0.1)); };
  const lie = (R, e, yaw, roll, x, z) => { affPose(R, e, { down: true, bed: 1, dir: 2 }); affLie(R, yaw, roll, x, z); };
  const faceTo = (R, e, yaw, x, z, tx, tz) => { let best = 1.3, bv = -9; for (const r of [1.3, -1.3]) { lie(R, e, yaw, r, x, z); const hp = W(R.head), f = WP(R.head, 0, 0, 1).sub(hp); const v = f.x * (tx - x) + f.z * (tz - z); if (v > bv) { bv = v; best = r; } } lie(R, e, yaw, best, x, z); return best; };
  const leg = (R, side, hip, knee, abd) => { const L = side === 'A' ? R.LA : R.LB; L.hp.rotation.x = -hip; L.kn.rotation.x = knee; if (abd != null) L.hp.rotation.z = abd; };
  const topLeg = (R, P) => W(R.LA.hp).distanceTo(P) < W(R.LB.hp).distanceTo(P) ? 'A' : 'B';
  const lowArm = R => W(R.A.sh).y < W(R.B.sh).y ? 'A' : 'B', highArm = R => lowArm(R) === 'A' ? 'B' : 'A';
  const tuck = R => ikArm(R, lowArm(R), WP(R.head, 0, -0.1, 0.16), [1.7, -0.2, 0, 2.1]);   /* braço de baixo dobrado na frente do rosto, como travesseiro */
  const side = (R, P, hip = 0.7, knee = 1.0) => { const tl = topLeg(R, P); leg(R, tl, hip, knee); leg(R, tl === 'A' ? 'B' : 'A', 0.25, 0.45); };
  const LB = [[-0.25, 0.6], [-0.45, 0.45], [-0.6, 0.6], [-0.3, 0.6], [-0.5, 0.5]];
  const headTo = (R, pt, lim) => affBend(R, Rr => Rr.head.localToWorld(V(0, 0.02, 0)), pt, lim || LB);
  const kiss = (A, B, n = 4) => { for (let r = 0; r < n; r++) { const mA = mouth(A), mB = mouth(B), mid = mA.clone().add(mB).multiplyScalar(0.5), dA = mA.clone().sub(mB).normalize().multiplyScalar(0.02); lookAtP(A, mB, 0.5); lookAtP(B, mA, -0.5); affBend(A, mouth, mid.clone().add(dA), LB); affBend(B, mouth, mid.clone().sub(dA), LB); } };   /* rostos não se atravessam: as bocas param a 2 cm do meio, cabeças tombadas para lados opostos */
  const stand = (R, e, yaw, x, z, P) => { affPose(R, e, Object.assign({ dir: 2 }, P || {})); R.root.rotation.set(0, yaw, 0); R.root.position.set(x, 0, z); R.root.updateMatrixWorld(true); };
  /* de bruços aos pés da cama, de través, queixo nas mãos, uma perna para o alto (o usuário gostou desta) */
  const footProne = (R, e, x, z, look) => { affPose(R, e, { down: true, bed: 1, dir: 2 }); affLie(R, Math.PI / 2, Math.PI, x, z); affBend(R, Rr => Rr.head.localToWorld(V(0, 0, 0)), WP(R.chest, 0, 0.42, 0.12), [[-0.7, 0.1], [-0.2, 0.2], [-0.2, 0.2], [-0.6, 0.1], [-0.3, 0.3]]);
    ikArm(R, 'A', WP(R.head, -0.05, -0.12, 0.08), [2.0, -0.3, 0, 2.2]); ikArm(R, 'B', WP(R.head, 0.05, -0.12, 0.08), [2.0, -0.3, 0, 2.2]); leg(R, 'A', 0.0, 1.7); leg(R, 'B', 0.05, 0.9); if (look) lookAtP(R, look, 0); };
  const L = window.POSES = {};

  /* ===================== CAMA A QUATRO ===================== */
  L.bed4a = (H, G) => { const [A, B, C] = G;   /* aconchego: cabeça no ombro, cabeça no peito, e a de trás em conchinha com ela */
    lie(H.R, H.e, 0, 0, 0, 0); H.R.LA.kn.rotation.x = 0.12; H.R.LB.kn.rotation.x = 0.25;
    faceTo(A.R, A.e, 0, -0.42, 0.06, 0, 0.06); headTo(A.R, WP(H.R.A.clav || H.R.chest, 0, 0.09, 0.05)); tuck(A.R); ikArm(A.R, highArm(A.R), WP(H.R.chest, 0.03, 0, 0.15), [1.2, -0.3, 0, 1.0]); side(A.R, W(H.R.hips)); lookAtP(A.R, W(H.R.head), 0);
    faceTo(C.R, C.e, 0, 0.4, 0.2, 0, 0.2); headTo(C.R, WP(H.R.chest, 0.1, 0.02, 0.15)); tuck(C.R); ikArm(C.R, highArm(C.R), WP(H.R.chest, -0.12, -0.04, 0.15), [1.2, -0.3, 0, 1.0]); side(C.R, W(H.R.hips), 0.6, 0.9); lookAtP(C.R, W(H.R.head), 0);
    faceTo(B.R, B.e, 0, 0.78, 0.24, 0, 0.24); headTo(B.R, WP(C.R.head, 0, -0.02, -0.12)); tuck(B.R); ikArm(B.R, highArm(B.R), WP(C.R.chest, 0, 0, 0.16), [1.3, -0.2, 0, 0.8]); side(B.R, W(C.R.hips), 0.65, 1.0);
    ikArm(H.R, 'A', WP(A.R.spine, 0, 0.1, -0.14), [0.6, -1.2, 0, 1.0]); ikArm(H.R, 'B', WP(C.R.spine, 0, 0.12, -0.12), [0.6, -1.2, 0, 1.0]); lookAtP(H.R, W(C.R.head), 0);
    return [H.R, A.R, B.R, C.R]; };
  L.bed4b = (H, G) => { const [A, B, C] = G;   /* ele de lado beija A; C em conchinha atrás dele; B em conchinha atrás de C, a mão no cabelo dela */
    faceTo(H.R, H.e, 0, 0.02, 0.02, -1, 0.02); side(H.R, V(-1, 0.3, 0), 0.45, 0.7);
    faceTo(A.R, A.e, 0, -0.34, 0.0, 0.5, 0.0); side(A.R, W(H.R.hips), 0.55, 0.8); kiss(H.R, A.R); tuck(A.R); ikArm(A.R, highArm(A.R), WP(H.R.head, 0, -0.04, -0.08), [1.4, -0.5, 0, 1.3]); ikArm(H.R, highArm(H.R), WP(A.R.spine, 0, 0.06, -0.14), [1.0, -0.6, 0, 1.0]); tuck(H.R);
    faceTo(C.R, C.e, 0, 0.36, 0.05, -1, 0.05); headTo(C.R, WP(H.R.chest, 0, 0.1, -0.16)); ikArm(C.R, highArm(C.R), WP(H.R.spine, 0, 0.0, 0.14), [1.2, -0.3, 0, 0.6]); tuck(C.R); leg(C.R, 'A', 0.5, 0.8); leg(C.R, 'B', 0.5, 0.8);
    faceTo(B.R, B.e, 0, 0.7, 0.1, -1, 0.1); headTo(B.R, WP(C.R.head, 0, 0.0, -0.13)); ikArm(B.R, highArm(B.R), WP(C.R.head, 0, 0.08, -0.04), [1.6, -0.3, 0, 1.3]); tuck(B.R); leg(B.R, 'A', 0.5, 0.8); leg(B.R, 'B', 0.5, 0.8);
    return [H.R, A.R, B.R, C.R]; };
  L.bed4c = (H, G) => { const [A, B, C] = G;   /* A e C se beijam por cima dele; B de bruços aos pés, queixo nas mãos, perna para o alto, olhando */
    lie(H.R, H.e, 0, 0, 0, 0); H.R.LA.kn.rotation.x = 0.2;
    faceTo(A.R, A.e, 0, -0.36, 0.1, 0, 0.1); faceTo(C.R, C.e, 0, 0.36, 0.1, 0, 0.1); side(A.R, W(H.R.hips), 0.6, 0.9); side(C.R, W(H.R.hips), 0.6, 0.9);
    kiss(A.R, C.R, 5); ikArm(A.R, highArm(A.R), WP(C.R.head, 0, -0.04, -0.06), [1.5, -0.4, 0, 1.2]); ikArm(C.R, highArm(C.R), WP(H.R.chest, 0.02, 0.0, 0.15), [1.2, -0.3, 0, 1.0]); tuck(A.R); tuck(C.R);
    ikArm(H.R, 'A', WP(A.R.spine, 0, 0.1, -0.14), [0.6, -1.2, 0, 1.0]); ikArm(H.R, 'B', WP(C.R.spine, 0, 0.1, -0.14), [0.6, -1.2, 0, 1.0]); lookAtP(H.R, mouth(A.R).add(mouth(C.R)).multiplyScalar(0.5), 0);
    footProne(B.R, B.e, 0.05, 1.05, W(H.R.head)); return [H.R, A.R, B.R, C.R]; };
  L.bed4d = (H, G) => { const [A, B, C] = G;   /* ele com A (deitados de frente, beijo); ao lado, C e B abraçadas trocando carinho entre elas */
    faceTo(H.R, H.e, 0, -0.2, 0, -1, 0); faceTo(A.R, A.e, 0, -0.54, 0, 1, 0); kiss(H.R, A.R); tuck(H.R); tuck(A.R); side(H.R, W(A.R.hips), 0.5, 0.8); side(A.R, W(H.R.hips), 0.6, 0.9);
    ikArm(H.R, highArm(H.R), WP(A.R.spine, 0, 0.08, -0.14), [1.0, -0.6, 0, 1.0]); ikArm(A.R, highArm(A.R), WP(H.R.head, 0, -0.03, -0.08), [1.4, -0.5, 0, 1.3]);
    faceTo(C.R, C.e, 0, 0.36, 0.08, 1, 0.08); faceTo(B.R, B.e, 0, 0.72, 0.08, -1, 0.08); for (let r = 0; r < 2; r++) { headTo(C.R, WP(B.R.head, 0, -0.04, 0.09)); headTo(B.R, WP(C.R.head, 0, 0.0, 0.1)); }
    ikArm(C.R, highArm(C.R), WP(B.R.head, 0, 0.08, -0.03), [1.6, -0.3, 0, 1.3]); ikArm(B.R, highArm(B.R), WP(C.R.spine, 0, 0.1, -0.13), [1.0, -0.5, 0, 1.0]); tuck(C.R); tuck(B.R); side(C.R, W(B.R.hips), 0.5, 0.9); side(B.R, W(C.R.hips), 0.4, 0.7);
    return [H.R, A.R, B.R, C.R]; };

  /* ===================== DUAS DEITADAS ===================== */
  L.p2hug = (H, G) => { const [A, B] = G; faceTo(A.R, A.e, 0, -0.2, 0, 1, 0); faceTo(B.R, B.e, 0, 0.2, 0, -1, 0);
    for (let r = 0; r < 2; r++) { headTo(A.R, WP(B.R.head, 0, 0.0, 0.1)); headTo(B.R, WP(A.R.head, 0, -0.06, 0.08)); }
    ikArm(A.R, highArm(A.R), WP(B.R.spine, 0, 0.12, -0.14), [1.1, -0.5, 0, 1.0]); ikArm(B.R, highArm(B.R), WP(A.R.chest, 0, 0.05, -0.15), [1.1, -0.5, 0, 1.0]); tuck(A.R); tuck(B.R);
    leg(A.R, topLeg(A.R, W(B.R.hips)), 0.5, 0.9); leg(B.R, topLeg(B.R, W(A.R.hips)), 0.35, 0.6); return [A.R, B.R]; };
  L.p2kiss = (H, G) => { const [A, B] = G; faceTo(A.R, A.e, 0, -0.17, 0, 1, 0); faceTo(B.R, B.e, 0, 0.17, 0, -1, 0); kiss(A.R, B.R);
    ikArm(A.R, highArm(A.R), WP(B.R.head, 0, -0.05, -0.05), [1.5, -0.4, 0, 1.3]); ikArm(B.R, highArm(B.R), WP(A.R.spine, 0, 0.1, -0.12), [1.0, -0.5, 0, 1.0]); tuck(A.R); tuck(B.R); side(A.R, W(B.R.hips), 0.4, 0.7); side(B.R, W(A.R.hips), 0.4, 0.7); return [A.R, B.R]; };
  L.p2spoon = (H, G) => { const [A, B] = G; faceTo(B.R, B.e, 0, -0.05, 0, -1, 0); faceTo(A.R, A.e, 0, 0.27, 0.03, -1, 0.03);
    affBend(A.R, mouth, WP(B.R[highArm(B.R)].clav || B.R.chest, 0, 0.05, -0.02), LB); ikArm(A.R, highArm(A.R), WP(B.R.spine, 0, 0.05, 0.15), [1.2, -0.3, 0, 0.6]); tuck(A.R); tuck(B.R);
    for (const R of [A.R, B.R]) { leg(R, 'A', 0.55, 0.9); leg(R, 'B', 0.55, 0.9); } lookAtP(B.R, W(A.R.head), 0); return [A.R, B.R]; };
  L.p2chest = (H, G) => { const [A, B] = G; lie(A.R, A.e, 0, 0, -0.1, 0); faceTo(B.R, B.e, 0, 0.26, 0.18, -1, 0.18);
    headTo(B.R, WP(A.R.chest, 0.06, 0.04, 0.14)); ikArm(B.R, highArm(B.R), WP(A.R.chest, -0.1, -0.05, 0.14), [1.1, -0.3, 0, 1.0]); tuck(B.R); side(B.R, W(A.R.hips), 0.65, 1.0);
    ikArm(A.R, near(A.R, W(B.R.head)), WP(B.R.head, 0, 0.1, -0.02), [1.5, -0.8, 0, 1.4]); lookAtP(A.R, W(B.R.head), 0); A.R.LA.kn.rotation.x = 0.3; return [A.R, B.R]; };

  /* ===================== EM PÉ ===================== */
  L.sBack = (H, G) => { const [A] = G; stand(A.R, A.e, 0, 0, 0); stand(H.R, H.e, 0, 0, -0.22);
    rigExtra(H.R, { clavA: [0.1, 0.3], clavB: [0.1, 0.3] }); affBend(H.R, R => R.head.localToWorld(V(0, -0.08, 0.06)), WP(A.R.A.clav || A.R.chest, 0, 0.09, 0), [[-0.1, 0.5], [-0.3, 0.3], [-0.3, 0.3], [-0.1, 0.5], [-0.4, 0.4]]);
    ikArm(H.R, 'A', WP(A.R.spine, -0.02, 0.0, 0.15), [0.8, -0.3, 0, 1.2]); ikArm(H.R, 'B', WP(A.R.spine, 0.04, 0.06, 0.15), [0.8, -0.3, 0, 1.2]); ikArm(A.R, 'A', WP(H.R.A.hand, 0, 0.02, 0.03), [0.4, -0.2, 0, 1.2]); ikArm(A.R, 'B', WP(A.R.head, 0.02, -0.04, -0.12), [2.4, -0.4, 0, 2.0]);
    lookAtP(A.R, W(H.R.head), 0.3); A.R.head.rotation.z = -0.25; return [H.R, A.R]; };
  L.sForehead = (H, G) => { const [A] = G; stand(H.R, H.e, Math.PI / 2, -0.21, 0); stand(A.R, A.e, -Math.PI / 2, 0.21, 0);
    for (let r = 0; r < 3; r++) { const fa = WP(H.R.head, 0, 0.06, 0.1), fb = WP(A.R.head, 0, 0.06, 0.1), mid = fa.clone().add(fb).multiplyScalar(0.5); affBend(H.R, R => R.head.localToWorld(V(0, 0.06, 0.1)), mid, LB); affBend(A.R, R => R.head.localToWorld(V(0, 0.06, 0.1)), mid, LB); }
    ikArm(A.R, 'A', WP(H.R.head, -0.09, -0.04, 0.02), [1.4, -0.3, 0, 1.4]); ikArm(A.R, 'B', WP(H.R.head, 0.09, -0.04, 0.02), [1.4, -0.3, 0, 1.4]); ikArm(H.R, 'A', WP(A.R.spine, 0, 0.12, -0.14), [0.8, -0.6, 0, 1.0]); ikArm(H.R, 'B', WP(A.R.spine, 0.1, 0.04, -0.12), [0.8, -0.6, 0, 1.0]); return [H.R, A.R]; };
  L.sDance = (H, G) => { const [A] = G; stand(H.R, H.e, Math.PI / 2, -0.23, 0); stand(A.R, A.e, -Math.PI / 2, 0.23, 0);
    const mid = W(H.R.chest).add(W(A.R.chest)).multiplyScalar(0.5).add(V(0, 0.22, 0.22)); ikArm(H.R, 'B', mid.clone().add(V(-0.02, 0, 0)), [1.2, -0.4, 0, 1.0]); ikArm(A.R, 'A', mid.clone().add(V(0.02, 0, 0)), [1.2, -0.4, 0, 1.0]);
    ikArm(H.R, 'A', WP(A.R.spine, 0, 0.06, -0.15), [0.6, -0.6, 0, 1.2]); ikArm(A.R, 'B', WP(H.R.B.clav || H.R.chest, 0, 0.06, 0), [1.2, -0.6, 0, 1.1]); headTo(A.R, WP(H.R.chest, 0, 0.18, 0.14), [[-0.05, 0.25], [-0.2, 0.2], [-0.3, 0.3], [-0.1, 0.3], [-0.5, 0.5]]); lookAtP(H.R, W(A.R.head), 0); return [H.R, A.R]; };
  L.sHandKiss = (H, G) => { const [A] = G; stand(H.R, H.e, Math.PI / 2, -0.4, 0); stand(A.R, A.e, -Math.PI / 2, 0.3, 0);
    const hand = W(A.R.chest).add(V(-0.3, -0.15, 0.06)); ikArm(A.R, 'A', hand, [1.0, -0.2, 0, 0.3]); const hp = W(A.R.A.hand); affBend(H.R, mouth, hp.clone().add(V(-0.02, 0.03, 0)), [[0, 0.8], [-0.2, 0.2], [-0.3, 0.3], [-0.1, 0.6], [-0.3, 0.3]]); ikArm(H.R, 'B', hp.clone().add(V(-0.02, -0.04, 0)), [1.0, -0.2, 0, 0.6]); ikArm(H.R, 'A', WP(H.R.spine, -0.05, 0.0, -0.12), [0.2, -0.3, 0, 1.6]);
    lookAtP(A.R, W(H.R.head), 0.2); A.R.head.rotation.z = 0.2; return [H.R, A.R]; };
  L.s3group = (H, G) => { const [A, B, C] = G;   /* ele abraça A por trás; ao lado, B e C dançam juntas */
    const R1 = L.sBack(H, [A]); stand(B.R, B.e, Math.PI / 2, 0.75, 0.1); stand(C.R, C.e, -Math.PI / 2, 1.2, 0.1);
    const mid = W(B.R.chest).add(W(C.R.chest)).multiplyScalar(0.5).add(V(0, 0.22, 0.22)); ikArm(B.R, 'B', mid.clone().add(V(-0.02, 0, 0)), [1.2, -0.4, 0, 1.0]); ikArm(C.R, 'A', mid.clone().add(V(0.02, 0, 0)), [1.2, -0.4, 0, 1.0]);
    ikArm(B.R, 'A', WP(C.R.spine, 0, 0.06, -0.15), [0.6, -0.6, 0, 1.2]); ikArm(C.R, 'B', WP(B.R.B.clav || B.R.chest, 0, 0.06, 0), [1.2, -0.6, 0, 1.1]); kiss(B.R, C.R, 3); return R1.concat([B.R, C.R]); };

  /* ===================== SENTADOS (sofá) ===================== */
  L.tLap = (H, G) => { const [A] = G; stand(H.R, H.e, 0, 0, 0, { sit: 'c' }); const lap = W(H.R.LA.hp).add(W(H.R.LB.hp)).multiplyScalar(0.5).add(V(0, 0.12, 0.12));
    affPose(A.R, A.e, { down: true, bed: 1, dir: 2 }); affLie(A.R, Math.PI / 2, -0.1, 0.85, 0.1); A.R.root.position.y += lap.y - 0.42; A.R.root.updateMatrixWorld(true); headTo(A.R, lap, [[-0.4, 0.4], [-0.4, 0.4], [-0.3, 0.3], [-0.3, 0.4], [-0.4, 0.4]]); leg(A.R, 'A', 0.6, 1.2); leg(A.R, 'B', 0.3, 0.6);
    ikArm(H.R, 'A', WP(A.R.head, 0, 0.1, 0.0), [1.0, -0.4, 0, 1.4]); ikArm(H.R, 'B', WP(A.R.chest, 0, 0.0, 0.14), [0.9, -0.3, 0, 1.2]); lookAtP(H.R, W(A.R.head), 0); lookAtP(A.R, W(H.R.head), 0); return [H.R, A.R]; };
  L.tWhisper = (H, G) => { const [A] = G; stand(H.R, H.e, 0, -0.24, 0, { sit: 'c' }); stand(A.R, A.e, 0, 0.24, 0, { sit: 'c' });
    const ear = WP(H.R.head, 0.1, 0.0, 0); affBend(A.R, mouth, ear.clone().add(V(0.03, 0, 0.02)), [[-0.1, 0.5], [-0.5, 0.5], [-0.8, 0.8], [-0.2, 0.4], [-0.5, 0.5]]); ikArm(A.R, 'A', ear.clone().add(V(0.02, -0.01, 0.07)), [1.6, -0.4, 0, 2.0]); ikArm(A.R, 'B', WP(H.R.LB.kn, 0, 0.06, 0), [0.6, -0.2, 0, 0.6]);
    lookAtP(H.R, W(A.R.head), 0); H.R.head.rotation.z = -0.15; return [H.R, A.R]; };

  /* ===================== BANHEIRA DE COBRE ===================== */
  L.wBetween = (H, G) => { const [A] = G; stand(H.R, H.e, 0, 0, -0.18, { sit: 'g', tub: true }); stand(A.R, A.e, 0, 0, 0.02, { sit: 'g', tub: true }); leg(A.R, 'A', 1.45, 1.4, 0.05); leg(A.R, 'B', 1.4, 1.35, -0.05);   /* quadril dela encostado nele, pernas esticadas para a frente */
    leg(H.R, 'A', 1.0, 0.9, 0.35); leg(H.R, 'B', 1.0, 0.9, -0.35); A.R.spine.rotation.x = -0.32; { A.R.root.updateMatrixWorld(true); H.R.root.updateMatrixWorld(true); const dy = W(H.R.hips).y - W(A.R.hips).y - 0.03; A.R.root.position.y += dy; A.R.root.updateMatrixWorld(true); }   /* sentada no fundo, na altura dele */ headTo(A.R, WP(H.R.B.clav || H.R.chest, 0.02, 0.1, 0.05), [[-0.5, 0.1], [-0.3, 0.3], [-0.3, 0.3], [-0.4, 0.2], [-0.4, 0.4]]); A.R.head.rotation.z = 0.25;
    ikArm(H.R, 'A', WP(A.R.spine, -0.06, 0.08, 0.15), [0.8, -0.3, 0, 1.2]); ikArm(H.R, 'B', WP(A.R.spine, 0.06, 0.14, 0.15), [0.8, -0.3, 0, 1.2]); ikArm(A.R, 'A', WP(H.R.A.hand, 0, 0.03, 0.02), [0.6, -0.2, 0, 0.8]); affBend(H.R, mouth, WP(A.R.head, 0.05, 0.02, -0.02), [[-0.1, 0.5], [-0.3, 0.3], [-0.4, 0.4], [-0.1, 0.4], [-0.4, 0.4]]); return [H.R, A.R]; };
  L.wThree = (H, G) => { const [A, B, C] = G; stand(H.R, H.e, 0, 0, -0.3, { sit: 'g', tub: true }); stand(A.R, A.e, 0.7, -0.42, -0.12, { sit: 'g', tub: true }); stand(C.R, C.e, -0.7, 0.42, -0.12, { sit: 'g', tub: true }); stand(B.R, B.e, Math.PI, 0, 0.55, { sit: 'g', tub: true });
    headTo(A.R, WP(H.R.A.clav || H.R.chest, 0, 0.09, 0.03), [[-0.1, 0.4], [-0.45, 0.45], [-0.4, 0.4], [-0.2, 0.4], [-0.5, 0.5]]); headTo(C.R, WP(H.R.B.clav || H.R.chest, 0, 0.09, 0.03), [[-0.1, 0.4], [-0.45, 0.45], [-0.4, 0.4], [-0.2, 0.4], [-0.5, 0.5]]);
    ikArm(H.R, 'A', WP(A.R.chest, 0, 0.12, -0.15), [1.2, -1.0, 0, 1.0]); ikArm(H.R, 'B', WP(C.R.chest, 0, 0.12, -0.15), [1.2, -1.0, 0, 1.0]); ikArm(A.R, near(A.R, W(H.R.chest)), WP(H.R.chest, -0.05, -0.02, 0.15), [1.0, -0.3, 0, 1.0]); ikArm(C.R, near(C.R, W(H.R.chest)), WP(H.R.chest, 0.05, -0.08, 0.15), [1.0, -0.3, 0, 1.0]);
    ikArm(B.R, 'A', WP(B.R.head, -0.05, 0.12, 0.25), [2.0, -0.2, 0, 0.6]); lookAtP(B.R, W(H.R.head), 0); lookAtP(H.R, W(B.R.head), 0); return [H.R, A.R, B.R, C.R]; };
  L.wPair = (H, G) => { const [A, B, C] = G;   /* ele beija A na água; B e C abraçadas do outro lado da banheira */
    stand(H.R, H.e, Math.PI / 2, -0.45, 0, { sit: 'g', tub: true }); stand(A.R, A.e, -Math.PI / 2, -0.05, 0, { sit: 'g', tub: true }); kiss(H.R, A.R, 3); ikArm(H.R, 'B', WP(A.R.spine, 0, 0.1, -0.14), [1.0, -0.6, 0, 1.0]); ikArm(A.R, 'A', WP(H.R.head, 0, -0.04, -0.08), [1.4, -0.5, 0, 1.3]);
    stand(B.R, B.e, Math.PI / 2, 0.45, 0.35, { sit: 'g', tub: true }); stand(C.R, C.e, -Math.PI / 2, 0.85, 0.35, { sit: 'g', tub: true }); headTo(C.R, WP(B.R.B.clav || B.R.chest, 0, 0.09, 0.03), [[-0.1, 0.4], [-0.45, 0.45], [-0.4, 0.4], [-0.2, 0.4], [-0.5, 0.5]]); ikArm(B.R, 'B', WP(C.R.spine, 0, 0.12, -0.14), [1.0, -0.6, 0, 1.0]); ikArm(C.R, 'A', WP(B.R.head, 0, 0.08, -0.03), [1.6, -0.3, 0, 1.3]);
    return [H.R, A.R, B.R, C.R]; };
})();

/* ============================================================
   CAMA A QUATRO NO JOGO (lista 9): na suíte, com as três moças da festa, deitar na cama de lua mostra os quatro juntos
   num quadro só (as cenas do catálogo), revezando a cada 25 s: aconchego → você com uma e elas entre si → beijo e conchinha
   → elas se beijam. Cada cena tem 4 quadros com respiração e pequenos movimentos (cabeça, braços, joelhos, quadril).
   ============================================================ */
const AF5 = { scenes: ['bed4a', 'bed4d', 'bed4b', 'bed4c'], rot: 25000, frames: 4, frMs: 700, zShift: -0.25 };
/* ---------------- SERVIDOR ---------------- */
function af5Send(p, P, on) { const B = BEDS[P.bed]; if (!B) return; near(B.x, B.y, { t: 'vlgrp', pid: p.id, bed: P.bed, ids: on ? P.girls.slice(0, 3) : [], sc: on ? AF5.scenes[P.gs % AF5.scenes.length] : '', on: on ? 1 : 0 }); }
if (typeof vl8Bed === 'function' && typeof S !== 'undefined') {
  const _vbA5 = vl8Bed;
  vl8Bed = function (p, P, G0, now) {
    if (G0.length < 3) { if (P.grp) { P.grp = 0; af5Send(p, P, 0); } return _vbA5.apply(this, arguments); }
    const b = velB('velvet'), B = BEDS[P.bed]; if (!B) { vl6End(p.id); return; }
    if (p.sleep !== P.bed) { if (P.grp) { P.grp = 0; af5Send(p, P, 0); } return _vbA5.apply(this, arguments); }   /* levantou: a lógica de antes cuida do descanso */
    const pos = () => G0.forEach((n, k) => { const [u, v] = VL6_BEDG[Math.min(k, VL6_BEDG.length - 1)], [x, y] = localToWorld(b, u, v); if (n.aff && n.aff.w === p.id) { vl6Hold(n, now); return; } n.x = x; n.y = y; n.sleeping = true; n.walk = false; vl6Pos(n, u, v, 3, B.dir || 0); });
    if (P.grp && p.aff) { P.grp = 0; af5Send(p, P, 0); P.userAff = 1; }   /* escolheu um gesto na roda: a cena de grupo pausa */
    if (P.userAff) { if (p.aff) { pos(); return; } P.userAff = 0; }   /* acabou o gesto: volta a cena */
    if (!P.grp && p.aff && typeof affEnd === 'function') affEnd(p);
    if (!P.grp) { P.grp = 1; P.gs = 0; P.gT = now; af5Send(p, P, 1); empSay(G0[0], vl6Pick(VL6_LINES.bed)); }
    else if (now - P.gT > AF5.rot) { P.gT = now; P.gs = (P.gs + 1) % AF5.scenes.length; af5Send(p, P, 1); if (Math.random() < 0.5) empSay(G0[Math.floor(Math.random() * 3)], vl6Pick(VL6_LINES.bed)); }
    else if (now - (P.gSend || 0) > 5000) { P.gSend = now; af5Send(p, P, 1); }   /* quem chega depois também vê */
    G0.forEach((n, k) => { const [u, v] = VL6_BEDG[Math.min(k, VL6_BEDG.length - 1)], [x, y] = localToWorld(b, u, v); n.x = x; n.y = y; n.sleeping = true; n.walk = false; vl6Pos(n, u, v, 3, B.dir || 0); }); };
}
if (typeof vl6End === 'function' && typeof S !== 'undefined') { const _veA5 = vl6End; vl6End = function (pid) { const P = S.vlParty && S.vlParty[pid], p = S.players[pid]; if (P && P.grp && p) { P.grp = 0; af5Send(p, P, 0); } return _veA5.apply(this, arguments); }; }
/* ---------------- CLIENTE ---------------- */
const AF5_SPR = new Map();
function af5Wiggle(R, ph, s) { const a = Math.sin(ph + s), c = Math.cos(ph + s * 1.7); R.chest.rotation.x += 0.03 * a; R.spine.rotation.z += 0.015 * c; if (R.neckJ) R.neckJ.rotation.z += 0.04 * c; R.head.rotation.y += 0.05 * a;
  R.LA.kn.rotation.x += 0.05 * c; R.LB.kn.rotation.x += 0.04 * a; R.hips.rotation.z += 0.012 * a; for (const k of ['A', 'B']) if (R[k] && R[k].el) R[k].el.rotation.x += 0.05 * c; }
function af5Rig(e, slot) { const L = affLook(e, 'bHold', true); L.ling = null; const k = 'af5|' + slot + '|' + (e.isNpc ? e.kind + '#' + e.id : e.cls + ':' + e.skin + ':' + e.color); let R = AF5_SPR.get(k); if (!R) { R = buildHumanoid(L); R._fem = !!L.fem; AF5_SPR.set(k, R); } return R; }
function af5Sprite(G0) { const fr = Math.floor(performance.now() / AF5.frMs) % AF5.frames, key = G0.sc + '|' + fr + '|' + G0.pid + '|' + G0.ids.join(','); let s = AF5_SPR.get('s|' + key); if (s) return s; if (!R3.ok || (R3.budget != null && R3.budget <= 0 && G0.last)) return G0.last || null;
  const pe = G.players[G0.pid]; if (!pe || !POSES[G0.sc]) return null; const H = { e: pe, R: af5Rig(pe, 'H') }, girls = G0.ids.map((id, i) => { const n = G.npcs[id]; const e = { isNpc: true, kind: n ? n.kind : 'vl_comp1', id }; return { e, R: af5Rig(e, 'G' + i) }; }); if (girls.length < 3) return null;
  for (const R of [H.R].concat(girls.map(g => g.R))) rigReset(R);
  const Rs = POSES[G0.sc](H, girls), ph = fr / AF5.frames * Math.PI * 2; Rs.forEach((R, i) => af5Wiggle(R, ph, i * 1.3));
  let minY = Infinity; for (const R of Rs) { R.root.position.z += AF5.zShift; R.root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(R.root); minY = Math.min(minY, bb.min.y); }
  const { renderer, scene, cam, W, H: Hh } = R3; for (const R of Rs) { R.root.position.y += 0.01 - minY; R.root.updateMatrixWorld(true); scene.add(R.root); } renderer.render(scene, cam); for (const R of Rs) scene.remove(R.root);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; cv.getContext('2d').drawImage(renderer.domElement, 0, 0); if (R3.budget != null) R3.budget--;
  s = { c: cv, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; AF5_SPR.set('s|' + key, s); G0.last = s;
  for (const k of [...AF5_SPR.keys()]) if (k.startsWith('s|') && AF5_SPR.size > 90) AF5_SPR.delete(k); return s; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peA5 = progEvent; progEvent = function (m, now) { if (m.t === 'vlgrp') { G.vlGrp = G.vlGrp || {}; const K = m.pid + (m.water ? '|w' : ''); if (m.on) { const o = G.vlGrp[K]; G.vlGrp[K] = Object.assign(o && o.sc === m.sc ? o : {}, m); } else delete G.vlGrp[K]; return true; } return _peA5(m, now); }; }
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhA5 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) {
  const GR = G.vlGrp; if (GR && e) { if (e.isNpc) { for (const k in GR) if (GR[k].ids.includes(e.id)) { e._spr = null; return; } }
    else if (GR[e.id]) { const G0 = GR[e.id], B = BEDS[G0.bed]; const s = B && af5Sprite(G0); if (s) { const pa = tileW(e.rx, e.ry, 0), pb = tileW(B.x, B.y, 0); ctx.imageSmoothingEnabled = true; const x = sx + (pb.x - pa.x), y = sy + (pb.y - pa.y) - 11; pblit(ctx, s, x, y); e._spr = s; e._sx = x; e._sy = y; e._drawT = now; return; } } }
  return _dhA5.apply(this, arguments); }; }

/* ---------- movimentos leves em TODOS os gestos de afeto (pedido 28/11): 4 quadros com respiração, cabeça, braços, joelhos e quadril ---------- */
if (typeof affPairSprite === 'function' && typeof affBuild === 'function' && typeof G !== 'undefined') {
  affPairSprite = function (k, eA, eB, flip) { const fr = Math.floor(performance.now() / 650) % 4, key = k + '|' + fr + '|' + (flip ? 1 : 0) + '|' + affRigOf('A', eA, k).lk + '|' + affRigOf('B', eB, k).lk + '|' + (eA.lost || 0) + (eB.lost || 0);
    let s = AFF_PAIR.get(key); if (s) return s; if (!R3.ok) return null;
    const [RA, RB] = affBuild(k, eA, eB, flip), { renderer, scene, cam, W, H } = R3, ph = fr / 4 * Math.PI * 2; af5Wiggle(RA, ph, 0.3); af5Wiggle(RB, ph, 1.9);
    for (const R of [RA, RB]) { for (const A of [R.A, R.B]) if (A && A.slv && typeof hangWorld === 'function') hangWorld(A.slv, R, 0); scene.add(R.root); R.root.updateMatrixWorld(true); }
    renderer.render(scene, cam); scene.remove(RA.root); scene.remove(RB.root);
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(renderer.domElement, 0, 0);
    s = { c, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; AFF_PAIR.set(key, s); if (AFF_PAIR.size > 120) AFF_PAIR.delete(AFF_PAIR.keys().next().value); return s; };
}
if (typeof affPairSprite2 === 'function' && typeof affBuild2 === 'function' && typeof G !== 'undefined') {
  affPairSprite2 = function (e, o, A) { const rel = [Math.round(((o.rx ?? o.x) - (e.rx ?? e.x)) * 20), Math.round(((o.ry ?? o.y) - (e.ry ?? e.y)) * 20)], c = A.ctx || 'stand', bath = c !== 'seat';
    const fr = A._lapfr != null ? A._lapfr : Math.floor(performance.now() / 650) % 4; A = Object.assign({}, A, { fr }); const key = A.k + '|' + fr + '|' + c + '|' + (e.dir | 0) + (o.dir | 0) + '|' + (c === 'seat' || c === 'edge' || c === 'water' || c === 'vtub' ? rel.join(',') : '') + '|' + affRigOf('A', e, A.k, bath).lk + '|' + affRigOf('B', o, A.k, bath).lk;
    let s = AFF_PAIR2.get(key); if (s) return s; if (!R3.ok) return null; const [RA, RB] = affBuild2(A.k, e, o, A), { renderer, scene, cam, W, H } = R3;
    if (!AFF_CARESS.includes(A.k)) { const ph = fr / 4 * Math.PI * 2; af5Wiggle(RA, ph, 0.3); af5Wiggle(RB, ph, 1.9); }   /* o carinho já tem o seu próprio movimento de mão */
    for (const R of [RA, RB]) { for (const X of [R.A, R.B]) if (X && X.slv && typeof hangWorld === 'function') hangWorld(X.slv, R, 0); scene.add(R.root); R.root.updateMatrixWorld(true); }
    renderer.render(scene, cam); scene.remove(RA.root); scene.remove(RB.root);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(renderer.domElement, 0, 0);
    s = { c: cv, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; AFF_PAIR2.set(key, s); if (AFF_PAIR2.size > 160) AFF_PAIR2.delete(AFF_PAIR2.keys().next().value); return s; };
}

/* ---------- gestos novos do catálogo na roda 💞 (com jogador ou NPC): em pé, sentados e na água ---------- */
const AF5_NEW = {
  sBackH: ['stand', 'sBack', 'Abraço por trás', 'quer te abraçar por trás', '🫂'],
  sFore: ['stand', 'sForehead', 'Testa com testa', 'quer encostar a testa na sua', '😌'],
  sDance: ['stand', 'sDance', 'Dança lenta', 'quer dançar com você', '💃'],
  sHandK: ['stand', 'sHandKiss', 'Beijo na mão', 'quer beijar a sua mão', '🤚'],
  tLapH: ['seat', 'tLap', 'Cabeça no colo', 'quer deitar a cabeça no seu colo', '😴'],
  tWhis: ['seat', 'tWhisper', 'Sussurro', 'quer sussurrar no seu ouvido', '🤫'],
  wBetw: ['water', 'wBetween', 'Entre as pernas', 'quer sentar entre as suas pernas na água', '🛁'] };
if (typeof AFX !== 'undefined' && AFX.gap) Object.assign(AFX.gap, { sBackH: 0.3, sFore: 0.42, sDance: 0.46, sHandK: 0.7 });   /* distância entre os dois em pé (o servidor usa para posicionar) */
if (typeof AF2 !== 'undefined' && typeof AFX !== 'undefined') for (const k in AF5_NEW) { const [c, sc, n, a, i] = AF5_NEW[k]; AF2.K[k] = [c, n, a, i, 12000]; AFX.n[k] = n; AFX.ask[k] = a; AFX.i[k] = i; AFX.dur[k] = 12000; if (!AFF_KS.includes(k)) AFF_KS.push(k); if (AFF_CTX[c] && !AFF_CTX[c].includes(k)) AFF_CTX[c].push(k); }
/* quem faz o papel "dele" na cena do catálogo: o homem do par (senão, quem conduz) */
function af5Roles(RA, RB, eA, eB) { const aF = !!RA._fem, bF = !!RB._fem; return !aF && bF ? [{ e: eA, R: RA }, { e: eB, R: RB }] : aF && !bF ? [{ e: eB, R: RB }, { e: eA, R: RA }] : [{ e: eA, R: RA }, { e: eB, R: RB }]; }
if (typeof affBuild === 'function' && typeof G !== 'undefined') { const _abA5 = affBuild; affBuild = function (k, eA, eB, flip) { const N = AF5_NEW[k]; if (!N || N[0] !== 'stand') return _abA5.apply(this, arguments);
  const a = affRigOf('A', eA, k), b = affRigOf('B', eB, k); rigReset(a.R); rigReset(b.R); const [H, X] = af5Roles(a.R, b.R, eA, eB); POSES[N[1]](H, [X]); return [a.R, b.R]; }; }
if (typeof affBuild2 === 'function' && typeof G !== 'undefined') { const _ab2A5 = affBuild2; affBuild2 = function (k, e, o, A) { const N = AF5_NEW[k]; if (!N || N[0] === 'stand') return _ab2A5.apply(this, arguments);
  const bath = (A.ctx || N[0]) !== 'seat', a = affRigOf('A', e, k, bath), b = affRigOf('B', o, k, bath); rigReset(a.R); rigReset(b.R); const [H, X] = af5Roles(a.R, b.R, e, o); POSES[N[1]](H, [X]);
  { const bb = new THREE.Box3(); for (const R of [a.R, b.R]) { R.root.updateMatrixWorld(true); bb.union(new THREE.Box3().setFromObject(R.root)); } const cx = (bb.min.x + bb.max.x) / 2; for (const R of [a.R, b.R]) { R.root.position.x -= cx; if (bath) R.root.position.y -= bb.min.y; R.root.updateMatrixWorld(true); } }   /* centraliza no quadro (a moça deitada no sofá não sai pela borda) */
  return [a.R, b.R, a.lk, b.lk]; }; }
/* na festa da suíte: as moças usam os gestos novos com você e entre elas */
if (typeof vl6Rot === 'function' && typeof S !== 'undefined') { const _vrA5 = vl6Rot; vl6Rot = function (p, P, keys, now) { const extra = keys.includes('hug') ? ['sDance', 'sFore', 'sBackH', 'sHandK'] : keys.includes('sShoulder') ? ['tLapH', 'tWhis'] : keys.includes('wHug') ? ['wBetw'] : []; return _vrA5.call(this, p, P, keys.concat(extra), now); }; }
if (typeof af3Start === 'function' && typeof S !== 'undefined') { const _a3A5 = af3Start; af3Start = function (a, b, k, ms, place) { if (S.vlParty && (k === 'hug' || k === 'kissF') && Object.values(S.vlParty).some(P => P.girls.includes(a.id)) && Math.random() < 0.5) k = Math.random() < 0.5 ? 'sDance' : 'sFore'; return _a3A5.call(this, a, b, k, ms, place); }; }

/* ---------- banheira de cobre com as três: cena de grupo como a da cama ("as três na banheira" e "você com uma, elas entre si") ---------- */
const AF5_TUB = ['wThree', 'wPair'];
if (typeof vl6Tick === 'function' && typeof S !== 'undefined') { const _v6A5 = vl6Tick; vl6Tick = function (now) { _v6A5(now);
  try { for (const pid in S.vlParty || {}) { const P = S.vlParty[pid], p = S.players[pid]; if (!p) continue; const G0 = P.girls.map(g => S.npcs[g]).filter(Boolean);
    if (P.stage !== 'tub' || G0.length < 3) { if (P.tgrp) { P.tgrp = 0; af5SendTub(p, P, 0); } continue; }
    if (p.aff && P.tgrp && P.tgrp !== 'start') { P.tgrp = 0; af5SendTub(p, P, 0); P.tUser = now + 20000; continue; }   /* gesto escolhido na roda: pausa */
    if (!P.tgrp && now < (P.tUser || 0)) continue; if (!P.tgrp) { if (p.aff && typeof affEnd === 'function') affEnd(p); P.tgrp = 1; P.tgs = 0; P.tgT = now; af5SendTub(p, P, 1); }
    else if (now - P.tgT > AF5.rot) { P.tgT = now; P.tgs = (P.tgs + 1) % AF5_TUB.length; af5SendTub(p, P, 1); } else if (now - (P.tgSend || 0) > 5000) { P.tgSend = now; af5SendTub(p, P, 1); }
    P.next = now + 60000; } } catch (e) { console.warn('banheira a quatro', e); } }; }   /* enquanto a cena vale, o revezamento antigo de gestos fica parado */
function af5SendTub(p, P, on) { const b = velB('velvet'), [x, y] = localToWorld(b, AF2.vtub[0], AF2.vtub[1]); near(x, y, { t: 'vlgrp', pid: p.id, bed: -1, x, y, water: 1, ids: on ? P.girls.slice(0, 3) : [], sc: on ? AF5_TUB[(P.tgs || 0) % AF5_TUB.length] : '', on: on ? 1 : 0 }); }   /* a cena da banheira tem a sua própria mensagem (não apaga a da cama) */
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhT5 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) { const GR = G.vlGrp, G0 = GR && e && !e.isNpc && GR[e.id + '|w'];
  if (G0 && G0.water && G0.x != null) { const s = af5Sprite(G0); if (s) { const pa = tileW(e.rx, e.ry, 0), pb = tileW(G0.x, G0.y, 0), x = sx + (pb.x - pa.x), y = sy + (pb.y - pa.y); ctx.imageSmoothingEnabled = true; affWaterBlit(ctx, s, x - s.ax, y - s.ay + 0.22 * HV, y - 0.3 * HV, 0.35); e._spr = s; e._sx = x; e._sy = y; e._drawT = now; return; } }
  return _dhT5.apply(this, arguments); }; }

/* gesto na água ou na cama: sem a roupa da casa por cima do traje de banho */
if (typeof affLook === 'function' && typeof G !== 'undefined') { const _alA5 = affLook; affLook = function (e, k, bath) { const L = _alA5.apply(this, arguments); if (bath && L) L.ling = null; return L; }; }
