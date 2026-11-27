/* Danças (pedido 28/11): biblioteca de passos gerada do protótipo nae-ferramentas/scratchpad/proto_danca.js + o sistema no jogo */
/* PROTÓTIPO das danças, rodada 2 (28/11): pés no chão de verdade.
   · Perna: coxa (flexão), joelho e abertura; o pé fica sempre reto no chão (pé = coxa − joelho) e a perna compensa a inclinação,
     o giro e o rebolado do quadril (o quadril mexe por cima das pernas, os pés não escorregam).
   · Mãos por IK: nos joelhos (hk), na cintura (hw), nas coxas (ht), nos ombros/peito de quem está sentado (hs), na barra (hp), na nuca (hn).
   · Passo = poses-chave em batidas (laço), estilo define o andamento; coreografias encadeiam passos no mesmo relógio de batidas. */
(function () {
  const PI = Math.PI, V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), WP = (o, x, y, z) => { o.updateMatrixWorld(true); return o.localToWorld(V(x, y, z)); };
  window.DANCE_STY = { funk: { n: 'Funk', bpm: 130 }, twerk: { n: 'Twerk', bpm: 100 }, lap: { n: 'Lap Dance', bpm: 80 }, strip: { n: 'Striptease', bpm: 80 }, pole: { n: 'Barra', bpm: 80 } };
  const lerp = (a, b, t) => a + (b - a) * t, ease = t => 0.5 - 0.5 * Math.cos(PI * t);
  function mix(P, Q, t) { const o = {}; for (const k of new Set([...Object.keys(P), ...Object.keys(Q)])) { const a = P[k], b = Q[k]; if (typeof a === 'string' || typeof b === 'string') { o[k] = t < 0.5 ? (a ?? b) : (b ?? a); continue; } if (Array.isArray(a) || Array.isArray(b)) { const A = a || b.map(() => 0), B = b || a.map(() => 0); o[k] = A.map((v, i) => lerp(v, B[i], t)); } else o[k] = lerp(a || 0, b || 0, t); } return o; }
  function at(step, beat) { const K = step.k, L = step.len, b = ((beat % L) + L) % L; for (let i = 0; i < K.length; i++) { const [t0, P] = K[i], [t1, Q] = K[(i + 1) % K.length]; const e = i + 1 < K.length ? t1 : L + K[0][0]; if (b >= t0 && b < e) return mix(P, Q, (step.lin ? (x => x) : ease)((b - t0) / (e - t0))); } return K[0][1]; }
  /* aplica a pose no boneco (depois do affPose em pé); ctx: { seatHead, seatChest, pole } pontos do ambiente para as mãos */
  function apply(R, P, ctx) { const s = (o, x, y, z) => { if (o) o.rotation.set(x || 0, y || 0, z || 0, 'XZY'); };
    const hx = P.hx || 0, hy = P.hy || 0, hz = P.hz || 0; R.hips.rotation.set(hx, hy, hz, 'XZY');
    s(R.spine, (P.fw || 0) - hx * 0.7 + (P.sx || 0), -hy * 0.6 + (P.sy || 0), -hz * 0.8 + (P.sz || 0));   /* o tronco desfaz parte do movimento do quadril: o quadril mexe, o peito fica */
    s(R.chest, P.cx || 0, P.cy || 0, P.cz || 0); if (R.neckJ) s(R.neckJ, P.nx || 0, P.ny || 0, P.nz || 0); R.head.rotation.set(P.hdx || 0, P.ty || 0, P.hdz || 0, 'XZY');
    for (const [k, sg] of [['LA', -1], ['LB', 1]]) { const p = P[k] || [0.05, 0.1, 0.06], ab = p[2] || 0, out = p[3] || 0; R[k].hp.rotation.set(-p[0] - hx, -hy + sg * out, sg * ab - hz, 'XZY'); R[k].kn.rotation.x = p[1]; R[k].ft.rotation.set(p[0] - p[1], 0, -sg * ab * 0.9); }
    for (const [k, sg] of [['A', -1], ['B', 1]]) { const p = P[k] || [0.12, 0.18, 0, 0.25]; R[k].sh.rotation.set(-p[0], p[2], sg * p[1], 'XZY'); R[k].el.rotation.set(-p[3], 0, 0); }
    R.root.updateMatrixWorld(true);
    for (const k of ['A', 'B']) { const h = P['h' + k] || P.h; if (!h || typeof ikArm !== 'function') continue; const sg = k === 'A' ? -1 : 1, L = k === 'A' ? R.LA : R.LB; let t = null;
      if (h === 'k') t = WP(L.kn, 0, 0.04, 0.07);   /* mão no joelho */
      else if (h === 't') t = WP(L.hp, 0, -0.17, 0.09);   /* mão na coxa */
      else if (h === 'w') t = WP(R.hips, sg * 0.15, 0.1, 0.02);   /* mão na cintura */
      else if (h === 'n') t = WP(R.head, sg * 0.04, -0.06, -0.09);   /* mão na nuca */
      else if (h === 'b') t = WP(R.hips, sg * 0.1, -0.02, -0.12);   /* mão no quadril, por trás */
      else if (h === 's' && ctx && ctx.seatHead) t = ctx.seatHead.clone().add(V(sg * 0.17, -0.2, 0));   /* nos ombros de quem está sentado */
      else if (h === 'c' && ctx && ctx.seatChest) t = ctx.seatChest.clone().add(V(sg * 0.09, 0, 0));   /* no peito dele */
      else if (h === 'p' && ctx && ctx.pole) t = V(ctx.pole.x, (P['p' + k] || 1.7), ctx.pole.z);   /* na barra, na altura dada */
      if (t) ikArm(R, k, t, [1.0, -0.3, 0, 1.0]); } }
  const S = window.DANCE = {};
  const add = (id, sty, n, len, k, extra) => { S[id] = Object.assign({ id, sty, n, len, k }, extra || {}); };
  /* bases de perna: [coxa, joelho, abertura, ponta para fora] */
  const ST = [0.05, 0.1, 0.06, 0.12], SOFT = [0.22, 0.42, 0.1, 0.15], WIDE = [0.55, 1.0, 0.32, 0.35], SQ = [1.15, 1.95, 0.42, 0.45], HALF = [0.8, 1.35, 0.36, 0.4];
  const AUP = [2.7, 0.3, 0, 0.35], AL = [0.15, 0.2, 0, 0.3], AFLOW = [0.9, 0.5, 0, 1.2];

  /* ===================== FUNK (130) ===================== */
  add('fk_rebolado', 'funk', 'Rebolado', 4, [[0, { hz: 0.22, hy: 0.15, h: 'w', LA: SOFT, LB: SOFT }], [1, { hx: 0.25, h: 'w', LA: SOFT, LB: SOFT }], [2, { hz: -0.22, hy: -0.15, h: 'w', LA: SOFT, LB: SOFT }], [3, { hx: -0.22, h: 'w', LA: SOFT, LB: SOFT }]]);
  add('fk_quadradinho', 'funk', 'Quadradinho', 4, [[0, { fw: 0.55, nx: -0.45, hx: 0.3, hz: 0.18, h: 'k', LA: HALF, LB: HALF }], [1, { fw: 0.55, nx: -0.45, hx: -0.2, hz: 0.18, h: 'k', LA: HALF, LB: HALF }], [2, { fw: 0.55, nx: -0.45, hx: -0.2, hz: -0.18, h: 'k', LA: HALF, LB: HALF }], [3, { fw: 0.55, nx: -0.45, hx: 0.3, hz: -0.18, h: 'k', LA: HALF, LB: HALF }]], { lin: 1 });
  add('fk_sarrada', 'funk', 'Sarrada', 2, [   /* desce rápido com o quadril para trás e sobe empurrando, braços acompanham */
    [0, { fw: 0.35, hx: 0.35, A: [0.6, 0.4, 0, 1.5], B: [0.6, 0.4, 0, 1.5], LA: WIDE, LB: WIDE }], [0.5, { fw: 0.1, hx: -0.3, A: [-0.3, 0.3, 0, 0.6], B: [-0.3, 0.3, 0, 0.6], LA: SOFT, LB: SOFT }],
    [1, { fw: 0.35, hx: 0.35, A: [0.6, 0.4, 0, 1.5], B: [0.6, 0.4, 0, 1.5], LA: WIDE, LB: WIDE }], [1.5, { fw: 0.1, hx: -0.3, A: [-0.3, 0.3, 0, 0.6], B: [-0.3, 0.3, 0, 0.6], LA: SOFT, LB: SOFT }]]);
  add('fk_passinho', 'funk', 'Passinho', 2, [[0, { hy: 0.25, cy: -0.2, A: [0.6, 0.3, 0, 1.6], B: [-0.2, 0.2, 0, 0.8], LA: [0.6, 1.0, 0.08, 0.2], LB: SOFT }], [0.5, { A: AL, B: AL, LA: SOFT, LB: SOFT }], [1, { hy: -0.25, cy: 0.2, A: [-0.2, 0.2, 0, 0.8], B: [0.6, 0.3, 0, 1.6], LA: SOFT, LB: [0.6, 1.0, 0.08, 0.2] }], [1.5, { A: AL, B: AL, LA: SOFT, LB: SOFT }]]);
  add('fk_ombrinho', 'funk', 'Ombrinho', 2, [[0, { cy: 0.35, hy: -0.12, hz: 0.1, A: [0.55, 0.25, 0, 1.4], B: [0.1, 0.2, 0, 1.2], LA: SOFT, LB: [0.32, 0.55, 0.1, 0.15] }], [1, { cy: -0.35, hy: 0.12, hz: -0.1, A: [0.1, 0.2, 0, 1.2], B: [0.55, 0.25, 0, 1.4], LA: [0.32, 0.55, 0.1, 0.15], LB: SOFT }]]);
  add('fk_tremidinha', 'funk', 'Tremidinha', 1, [[0, { fw: 0.25, hx: 0.12, h: 't', LA: [0.5, 0.9, 0.28, 0.3], LB: [0.5, 0.9, 0.28, 0.3] }], [0.25, { fw: 0.25, hx: -0.06, h: 't', LA: [0.42, 0.78, 0.36, 0.3], LB: [0.42, 0.78, 0.36, 0.3] }], [0.5, { fw: 0.25, hx: 0.12, h: 't', LA: [0.5, 0.9, 0.28, 0.3], LB: [0.5, 0.9, 0.28, 0.3] }], [0.75, { fw: 0.25, hx: -0.06, h: 't', LA: [0.42, 0.78, 0.36, 0.3], LB: [0.42, 0.78, 0.36, 0.3] }]], { lin: 1 });
  add('fk_destravada', 'funk', 'Destravada', 2, [   /* joelhos abrem e fecham juntos, braços cruzando */
    [0, { fw: 0.2, LA: [0.45, 0.85, 0.05, -0.15], LB: [0.45, 0.85, 0.05, -0.15], A: [0.8, -0.2, 0, 1.0], B: [0.8, -0.2, 0, 1.0] }], [0.5, { fw: 0.2, LA: [0.45, 0.85, 0.4, 0.45], LB: [0.45, 0.85, 0.4, 0.45], A: [0.6, 0.6, 0, 0.6], B: [0.6, 0.6, 0, 0.6] }],
    [1, { fw: 0.2, LA: [0.45, 0.85, 0.05, -0.15], LB: [0.45, 0.85, 0.05, -0.15], A: [0.8, -0.2, 0, 1.0], B: [0.8, -0.2, 0, 1.0] }], [1.5, { fw: 0.2, LA: [0.45, 0.85, 0.4, 0.45], LB: [0.45, 0.85, 0.4, 0.45], A: [0.6, 0.6, 0, 0.6], B: [0.6, 0.6, 0, 0.6] }]]);
  add('fk_maosalto', 'funk', 'Mãos elevatórias', 4, [[0, { hz: 0.2, A: AUP, B: [2.4, 0.5, 0, 0.6], LA: SOFT, LB: SOFT, ty: 0.2 }], [2, { hz: -0.2, A: [2.4, 0.5, 0, 0.6], B: AUP, LA: SOFT, LB: SOFT, ty: -0.2 }]]);

  /* ===================== TWERK (100) ===================== */
  const TW = { fw: 0.8, nx: -0.75, h: 'k', LA: [0.85, 1.25, 0.34, 0.4], LB: [0.85, 1.25, 0.34, 0.4] };
  add('tw_pe', 'twerk', 'Twerk de pé', 1, [[0, Object.assign({}, TW, { hx: 0.4 })], [0.5, Object.assign({}, TW, { hx: -0.18 })]], { lin: 1 });
  add('tw_agachado', 'twerk', 'Agachado', 2, [[0, { fw: 0.55, nx: -0.4, hx: 0.35, hA: 'k', B: AUP, LA: SQ, LB: SQ }], [0.5, { fw: 0.55, nx: -0.4, hx: -0.15, hA: 'k', B: AUP, LA: SQ, LB: SQ }], [1, { fw: 0.55, nx: -0.4, hx: 0.35, A: AUP, hB: 'k', LA: SQ, LB: SQ }], [1.5, { fw: 0.55, nx: -0.4, hx: -0.15, A: AUP, hB: 'k', LA: SQ, LB: SQ }]], { lin: 1 });
  add('tw_shuffle', 'twerk', 'Shuffle', 2, [[0, Object.assign({}, TW, { hz: 0.28, hx: 0.25 })], [1, Object.assign({}, TW, { hz: -0.28, hx: 0.25 })]]);
  add('tw_pulse', 'twerk', 'Pulso', 1, [[0, { fw: 0.45, hx: 0.3, h: 't', LA: WIDE, LB: WIDE }], [0.5, { fw: 0.35, hx: -0.28, h: 't', LA: WIDE, LB: WIDE }]]);
  add('tw_circulo', 'twerk', 'Círculos', 4, [[0, Object.assign({}, TW, { hz: 0.25 })], [1, Object.assign({}, TW, { hx: 0.42 })], [2, Object.assign({}, TW, { hz: -0.25 })], [3, Object.assign({}, TW, { hx: -0.15 })]]);
  add('tw_onda', 'twerk', 'Onda', 4, [[0, { cx: -0.3, nx: 0.15, A: AL, B: AL, LA: ST, LB: ST }], [1, { cx: 0.25, sx: -0.25, nx: -0.1, A: [0.4, 0.3, 0, 1.0], B: [0.4, 0.3, 0, 1.0], LA: SOFT, LB: SOFT }], [2, { cx: 0.1, sx: 0.25, hx: -0.3, h: 't', LA: [0.4, 0.7, 0.12, 0.2], LB: [0.4, 0.7, 0.12, 0.2] }], [3, { cx: -0.1, hx: 0.3, h: 't', LA: SOFT, LB: SOFT }]]);
  add('tw_costas', 'twerk', 'De costas', 2, [[0, { rot: PI, fw: 0.3, hz: 0.25, hx: 0.25, ty: 0.9, nz: 0.2, hA: 'w', B: [0.6, 0.3, 0, 1.2], LA: WIDE, LB: WIDE }], [1, { rot: PI, fw: 0.3, hz: -0.25, hx: 0.25, ty: 0.9, nz: 0.2, hA: 'w', B: [0.6, 0.3, 0, 1.2], LA: WIDE, LB: WIDE }]]);
  add('tw_chao', 'twerk', 'Ajoelhada', 2, [   /* de joelhos, mãos no chão à frente, quadril batendo */
    [0, { kneel: 1, fw: 1.0, nx: -0.7, hx: 0.35, A: [1.4, 0.15, 0, 0.1], B: [1.4, 0.15, 0, 0.1], LA: [-0.1, 1.65, 0.2, 0], LB: [-0.1, 1.65, 0.2, 0] }], [0.5, { kneel: 1, fw: 1.0, nx: -0.7, hx: -0.15, A: [1.4, 0.15, 0, 0.1], B: [1.4, 0.15, 0, 0.1], LA: [-0.1, 1.65, 0.2, 0], LB: [-0.1, 1.65, 0.2, 0] }],
    [1, { kneel: 1, fw: 1.0, nx: -0.7, hx: 0.35, A: [1.4, 0.15, 0, 0.1], B: [1.4, 0.15, 0, 0.1], LA: [-0.1, 1.65, 0.2, 0], LB: [-0.1, 1.65, 0.2, 0] }], [1.5, { kneel: 1, fw: 1.0, nx: -0.7, hx: -0.15, A: [1.4, 0.15, 0, 0.1], B: [1.4, 0.15, 0, 0.1], LA: [-0.1, 1.65, 0.2, 0], LB: [-0.1, 1.65, 0.2, 0] }]], { lin: 1 });

  /* ===================== LAP DANCE (80) — para quem está sentado ===================== */
  add('lp_ombros', 'lap', 'Mãos nos ombros', 4, [[0, { fw: 0.4, nx: -0.2, hz: 0.2, hy: 0.15, h: 's', LA: SOFT, LB: SOFT }], [2, { fw: 0.5, nx: -0.3, hz: -0.2, hy: -0.15, h: 's', LA: [0.35, 0.6, 0.12, 0.15], LB: [0.35, 0.6, 0.12, 0.15] }]], { chair: 'front' });
  add('lp_descida', 'lap', 'Descida', 4, [[0, { cx: -0.2, A: [2.4, 0.4, 0, 0.6], B: [2.4, 0.4, 0, 0.6], LA: ST, LB: ST }], [1.5, { fw: 0.25, hx: 0.3, h: 'k', LA: SQ, LB: SQ }], [2.5, { fw: 0.1, hx: -0.2, cx: 0.2, h: 'k', LA: SQ, LB: SQ }], [3.5, { cx: -0.3, sx: 0.15, h: 'n', LA: SOFT, LB: SOFT }]], { chair: 'front' });
  add('lp_cabelo', 'lap', 'Jogada de cabelo', 2, [[0, { fw: 0.35, nx: 0.5, hz: 0.12, hA: 'n', hB: 'w', LA: SOFT, LB: SOFT }], [1, { fw: -0.15, nx: -0.45, hdz: 0.3, hz: -0.12, hA: 'n', hB: 'w', LA: SOFT, LB: SOFT }]], { chair: 'front' });
  add('lp_volta', 'lap', 'Volta na cadeira', 4, [   /* anda em volta da cadeira com a mão deslizando pelos ombros dele */
    [0, { orbitC: 0, hA: 's', B: AFLOW, LA: [0.35, 0.5, 0.05, 0.1], LB: ST, hz: 0.15 }], [1, { orbitC: PI / 2, hA: 's', B: AFLOW, LA: ST, LB: [0.35, 0.5, 0.05, 0.1], hz: -0.15 }],
    [2, { orbitC: PI, hA: 's', B: AFLOW, LA: [0.35, 0.5, 0.05, 0.1], LB: ST, hz: 0.15 }], [3, { orbitC: 3 * PI / 2, hA: 's', B: AFLOW, LA: ST, LB: [0.35, 0.5, 0.05, 0.1], hz: -0.15 }], [4, { orbitC: 2 * PI, hA: 's', B: AFLOW, LA: [0.35, 0.5, 0.05, 0.1], LB: ST, hz: 0.15 }]], { chair: 'orbit', lin: 1 });
  add('lp_colo', 'lap', 'No colo, de costas', 4, [[0, { sit: 'lap', sx: -0.25, nx: -0.15, ty: 0.4, hz: 0.15, A: [0.6, 0.5, 0, 0.6], hB: 'n', LA: [1.45, 1.45, 0.25, 0.1], LB: [1.45, 1.45, 0.25, 0.1] }], [2, { sit: 'lap', sx: -0.3, nx: -0.2, ty: 0.6, hz: -0.15, A: [0.6, 0.5, 0, 0.6], hB: 'n', LA: [1.45, 1.45, 0.25, 0.1], LB: [1.45, 1.45, 0.25, 0.1] }]], { chair: 'lap' });
  add('lp_recosta', 'lap', 'Recostada no colo', 4, [   /* sentada de lado no colo, um braço no pescoço dele, a outra mão no peito */
    [0, { sit: 'side', sx: -0.2, hz: 0.1, hA: 'c', B: [1.6, 0.6, 0.3, 1.6], LA: [1.4, 1.3, 0.1, 0], LB: [1.4, 1.5, 0.12, 0], ty: -0.3 }], [2, { sit: 'side', sx: -0.28, hz: -0.06, hA: 'c', B: [1.6, 0.6, 0.3, 1.6], LA: [1.4, 1.5, 0.1, 0], LB: [1.4, 1.3, 0.12, 0], ty: -0.5 }]], { chair: 'side' });
  add('lp_inclina', 'lap', 'Inclinada sobre ele', 4, [   /* de pé à frente, desce o rosto até perto do dele e sobe devagar */
    [0, { fw: 0.15, h: 'w', LA: SOFT, LB: SOFT }], [2, { fw: 0.95, nx: -0.6, hz: 0.1, h: 's', LA: [0.25, 0.35, 0.1, 0.1], LB: [0.25, 0.35, 0.1, 0.1] }]], { chair: 'front' });

  /* ===================== STRIPTEASE (80) ===================== */
  add('st_ombro', 'strip', 'Desce a alça', 4, [[0, { hz: 0.15, ty: 0.5, A: [1.0, 0.1, 0, 2.4], B: AL, LA: ST, LB: [0.35, 0.5, 0.05, 0.15] }], [2, { hz: -0.1, ty: 0.7, nz: 0.2, A: [0.3, 0.6, 0, 1.0], B: AL, LA: [0.35, 0.5, 0.05, 0.15], LB: ST }]], { strip: 'on' });
  add('st_abre', 'strip', 'Abre o robe', 4, [[0, { A: [0.6, -0.1, 0, 1.8], B: [0.6, -0.1, 0, 1.8], LA: ST, LB: ST }], [2, { A: [1.0, 1.2, 0, 0.3], B: [1.0, 1.2, 0, 0.3], cx: -0.2, hz: 0.12, LA: ST, LB: [0.3, 0.5, 0.05, 0.15] }]], { strip: 'on' });
  add('st_bodyroll', 'strip', 'Ondulação', 4, [[0, { cx: -0.3, A: [2.6, 0.3, 0, 2.0], B: [2.6, 0.3, 0, 2.0], LA: ST, LB: ST }], [1.3, { cx: 0.25, sx: -0.2, A: [0.9, 0.2, 0, 2.3], B: [0.9, 0.2, 0, 2.3], LA: SOFT, LB: SOFT }], [2.6, { sx: 0.25, hx: -0.3, h: 't', LA: [0.4, 0.7, 0.12, 0.2], LB: [0.4, 0.7, 0.12, 0.2] }]]);
  add('st_jogar', 'strip', 'Jogar a peça', 4, [[0, { ty: -0.3, A: [2.8, 0.4, 0, 0.2], hB: 'w', LA: ST, LB: ST }], [1, { ty: 0.3, A: [2.9, 0.6, 0.6, 0.3], hB: 'w', LA: ST, LB: ST }], [2, { hy: 0.4, cy: 0.3, A: [1.4, 1.1, 0, 0.1], hB: 'w', LA: ST, LB: [0.4, 0.6, 0.05, 0.15] }], [3, { hz: 0.15, A: AL, hB: 'w', LA: ST, LB: ST }]], { strip: 'throw' });
  add('st_shimmy', 'strip', 'Shimmy', 1, [[0, { cy: 0.18, h: 'b', LA: SOFT, LB: SOFT }], [0.25, { cy: -0.18, h: 'b', LA: SOFT, LB: SOFT }], [0.5, { cy: 0.18, h: 'b', LA: SOFT, LB: SOFT }], [0.75, { cy: -0.18, h: 'b', LA: SOFT, LB: SOFT }]], { lin: 1 });
  add('st_lento', 'strip', 'Rebolado lento', 4, [[0, { hz: 0.28, hx: 0.1, hA: 'n', hB: 't', LA: SOFT, LB: [0.35, 0.6, 0.1, 0.15], ty: 0.3 }], [2, { hz: -0.28, hx: 0.1, hA: 't', hB: 'n', LA: [0.35, 0.6, 0.1, 0.15], LB: SOFT, ty: -0.3 }]]);
  add('st_pose', 'strip', 'Pose final', 4, [[0, { hz: 0.25, sz: -0.12, hdz: -0.15, hA: 'n', hB: 'w', LA: ST, LB: [0.35, 0.6, 0.05, 0.15] }], [2, { hz: -0.2, sz: 0.1, hdz: 0.15, hA: 'w', hB: 'n', LA: [0.35, 0.6, 0.05, 0.15], LB: ST }]], { strip: 'off' });

  /* ===================== BARRA (80) ===================== */
  add('pl_ladylike', 'pole', 'Volta elegante', 4, [   /* anda em volta da barra na ponta dos pés, mão alta na barra */
    [0, { orbit: 0, hA: 'p', pA: 1.85, B: AFLOW, LA: [0.3, 0.45, 0.05, 0.1], LB: ST }], [2, { orbit: PI, hA: 'p', pA: 1.85, B: AFLOW, LA: ST, LB: [0.3, 0.45, 0.05, 0.1] }], [4, { orbit: 2 * PI, hA: 'p', pA: 1.85, B: AFLOW, LA: [0.3, 0.45, 0.05, 0.1], LB: ST }]], { pole: 1, lin: 1 });
  add('pl_cadeira', 'pole', 'Giro cadeira', 4, [   /* duas mãos na barra, pernas dobradas como sentada, gira no ar */
    [0, { orbit: 0, air: 0.35, hA: 'p', pA: 1.75, hB: 'p', pB: 1.3, LA: [1.4, 1.5, 0.05, 0], LB: [1.4, 1.5, 0.05, 0] }], [4, { orbit: 2 * PI, air: 0.35, hA: 'p', pA: 1.75, hB: 'p', pB: 1.3, LA: [1.4, 1.5, 0.05, 0], LB: [1.4, 1.5, 0.05, 0] }]], { pole: 1, lin: 1 });
  add('pl_bombeiro', 'pole', 'Giro bombeiro', 4, [   /* joelhos abraçando a barra, desce girando */
    [0, { orbit: 0, air: 0.5, hA: 'p', pA: 1.9, hB: 'p', pB: 1.45, LA: [1.0, 1.2, 0.0, -0.2], LB: [0.9, 1.3, 0.0, -0.2], sz: 0.2 }], [4, { orbit: 2 * PI, air: 0.15, hA: 'p', pA: 1.6, hB: 'p', pB: 1.2, LA: [1.0, 1.2, 0, -0.2], LB: [0.9, 1.3, 0, -0.2], sz: 0.2 }]], { pole: 1, lin: 1 });
  add('pl_onda', 'pole', 'Onda na barra', 4, [   /* de frente para a barra, onda do corpo com as mãos no alto */
    [0, { face: 1, cx: -0.3, hA: 'p', pA: 1.8, hB: 'p', pB: 1.6, LA: ST, LB: ST }], [1.3, { face: 1, cx: 0.25, sx: -0.2, hA: 'p', pA: 1.75, hB: 'p', pB: 1.55, LA: SOFT, LB: SOFT }], [2.6, { face: 1, sx: 0.25, hx: -0.3, hA: 'p', pA: 1.7, hB: 'p', pB: 1.5, LA: [0.45, 0.8, 0.15, 0.2], LB: [0.45, 0.8, 0.15, 0.2] }]], { pole: 1 });
  add('pl_descida', 'pole', 'Descida de costas', 4, [[0, { back: 1, cx: -0.2, hA: 'p', pA: 1.85, hB: 'p', pB: 1.85, LA: ST, LB: ST }], [2, { back: 1, cx: -0.1, hA: 'p', pA: 1.45, hB: 'p', pB: 1.45, LA: SQ, LB: SQ }]], { pole: 1 });

  /* ---- coreografias de exemplo ---- */
  window.DANCE_CHOREO = {
    palco: { n: 'Noite no palco', bpm: 100, seq: [['tw_onda', 4], ['fk_rebolado', 8], ['tw_pe', 4], ['tw_shuffle', 4], ['tw_costas', 4], ['fk_quadradinho', 8], ['st_pose', 4]] },
    funk: { n: 'Baile', bpm: 130, seq: [['fk_passinho', 4], ['fk_ombrinho', 4], ['fk_sarrada', 4], ['fk_destravada', 4], ['fk_tremidinha', 4], ['fk_maosalto', 4], ['fk_quadradinho', 8]] },
    strip: { n: 'Striptease completo', bpm: 80, seq: [['st_bodyroll', 8], ['st_abre', 4], ['st_ombro', 4], ['st_jogar', 4], ['st_shimmy', 4], ['st_lento', 8], ['st_pose', 8]] },
    lap: { n: 'Lap dance', bpm: 80, seq: [['lp_volta', 4], ['lp_cabelo', 4], ['lp_ombros', 8], ['lp_inclina', 4], ['lp_descida', 4], ['lp_colo', 8], ['lp_recosta', 8]] },
    barra: { n: 'Na barra', bpm: 80, seq: [['pl_ladylike', 8], ['pl_onda', 8], ['pl_cadeira', 4], ['pl_bombeiro', 4], ['pl_descida', 4]] } };
  /* ---- espelho e jeito de cada uma: mesmas batidas, passos e intensidades diferentes ---- */
  const NEG = ['hy', 'hz', 'sy', 'sz', 'cy', 'cz', 'ny', 'nz', 'ty', 'hdz', 'rot'];
  function mirror(P) { const o = Object.assign({}, P); for (const k of NEG) if (o[k]) o[k] = -o[k]; [o.A, o.B] = [P.B, P.A]; [o.LA, o.LB] = [P.LB, P.LA]; [o.hA, o.hB] = [P.hB, P.hA]; [o.pA, o.pB] = [P.pB, P.pA]; return o; }
  function flavor(P, k) { const o = Object.assign({}, P); for (const q of ['hx', 'hy', 'hz', 'cy', 'sz', 'nx']) if (o[q]) o[q] *= k; return o; }
  window.danceStyle = (step, beat, me) => { let P = at(step, beat + (me.ph || 0)); if (me.mir) P = mirror(P); if (me.k && me.k !== 1) P = flavor(P, me.k); return P; };
  /* duplas e grupos: [passo, x, z, giro, espelho, atraso em batidas, intensidade] */
  window.DANCE_GROUPS = {
    g_funk: { n: 'Trio no baile', sty: 'funk', len: 4, m: [['fk_rebolado', -0.75, 0, 0.3, 0, 0, 1.1], ['fk_ombrinho', 0, 0.15, 0, 0, 0.12, 0.9], ['fk_rebolado', 0.75, 0, -0.3, 1, 0.25, 1.0]] },
    g_twerk: { n: 'Trio de twerk', sty: 'twerk', len: 2, m: [['tw_shuffle', -0.8, 0, 0.5, 0, 0, 1.0], ['tw_pe', 0, 0.1, 0, 0, 0, 1.15], ['tw_shuffle', 0.8, 0, -0.5, 1, 0.5, 0.9]] },
    p_frente: { n: 'Dupla frente a frente', sty: 'twerk', len: 4, m: [['tw_circulo', -0.38, 0, Math.PI / 2, 0, 0, 1.0], ['fk_rebolado', 0.38, 0, -Math.PI / 2, 1, 0.5, 1.0]] },
    p_costas: { n: 'Dupla costas com costas', sty: 'strip', len: 4, m: [['st_lento', -0.22, 0, -Math.PI / 2, 0, 0, 1.0], ['st_lento', 0.22, 0, Math.PI / 2, 1, 0, 1.0]] } };
  window.danceAt = at; window.danceApply = apply;
})();

/* ============================================================
   DANÇAS NO JOGO: um NPC com dança marcada (n.dz = { ch | step, t0, mir, ph, k }) é desenhado no passo da batida certa.
   O relógio de batidas parte de t0 (hora do servidor) e do andamento do estilo/coreografia: quem dança junto fica no mesmo compasso.
   Pronto para música: quando houver trilha, basta o t0 e o bpm virem dela.
   ============================================================ */
function dzStepAt(d, beat) { if (d.ch && DANCE_CHOREO[d.ch]) { const C = DANCE_CHOREO[d.ch], tot = C.seq.reduce((a, s) => a + s[1], 0); let b = ((beat % tot) + tot) % tot; for (const [id, n] of C.seq) { if (b < n) return [DANCE[id], b]; b -= n; } const L = C.seq[C.seq.length - 1]; return [DANCE[L[0]], 0]; } return [DANCE[d.step], beat]; }
function dzBpm(d) { return d.ch && DANCE_CHOREO[d.ch] ? DANCE_CHOREO[d.ch].bpm : d.step && DANCE[d.step] ? DANCE_STY[DANCE[d.step].sty].bpm : 100; }
/* ---------------- SERVIDOR ---------------- */
const DZ_SHOW = ['palco', 'funk', 'strip'];
function dzSet(n, d) { const was = n.dz ? JSON.stringify(n.dz) : '', now = d ? JSON.stringify(d) : ''; if (was === now) return; n.dz = d || null; near(n.x, n.y, { t: 'ndance', id: n.id, d: n.dz }); }
function dzTick(now) {
  const h = typeof empHour === 'function' ? empHour() : 0, show = h >= VL_SHOW[0] && h < VL_SHOW[1] && !(typeof vlSerpOn === 'function' && vlSerpOn());
  S.dzT0 = S.dzT0 || now;
  /* show no palco: as dançarinas na mesma coreografia, cada uma do seu jeito (a segunda espelhada e um pouco atrás no tempo) */
  const ch = DZ_SHOW[Math.floor(now / 240000) % DZ_SHOW.length];
  [['vl_d1', { mir: 0, ph: 0, k: 1.1 }], ['vl_d2', { mir: 1, ph: 0.25, k: 0.9 }]].forEach(([id, me]) => { const n = S.npcs[id]; if (!n) return; const busy = S.vl5 && S.vl5[id] && S.vl5[id].a === 'tdance'; dzSet(n, show && !busy ? Object.assign({ ch, t0: S.dzT0 }, me) : null); });
  /* moças dançando na frente do palco: funk ou twerk, cada uma com o seu passo e a sua intensidade */
  for (const T of VEL_STAFF) { if (T.menu !== 'comp') continue; const n = S.npcs[T.id]; if (!n) continue; const L = S.vl5 && S.vl5[T.id], party = typeof vl6Who === 'function' && vl6Who(T.id) && S.vlParty[vl6Who(T.id)];
    if (party && party.dance > now && party.stage === 'party') { if (!party.dzT0) party.dzT0 = now; const i = party.girls.indexOf(T.id); dzSet(n, { ch: i === 1 ? 'funk' : 'palco', t0: party.dzT0, mir: i === 2 ? 1 : 0, ph: i * 0.12, k: [1.1, 0.95, 1.0][i] || 1 }); continue; }
    if (party && !(party.dance > now)) party.dzT0 = 0;
    if (L && L.ph === 'do' && (L.a === 'stage' || L.a === 'tdance')) { if (!L.dz) { const sts = ['fk_rebolado', 'tw_shuffle', 'fk_ombrinho', 'tw_circulo', 'fk_tremidinha', 'tw_pe']; L.dz = { step: sts[(T.id.length + Math.floor(now / 60000)) % sts.length], t0: S.dzT0, mir: T.id.length % 2, ph: (T.id.charCodeAt(3) % 4) * 0.1, k: 0.9 + (T.id.length % 3) * 0.1 }; } dzSet(n, L.dz); continue; }
    dzSet(n, null); }
  /* quem chega agora também vê (repete a cada 4 s) */
  if (now - (S.dzRe || 0) > 4000) { S.dzRe = now; for (const n of Object.values(S.npcs)) if (n.dz) near(n.x, n.y, { t: 'ndance', id: n.id, d: n.dz }); } }
if (typeof velTick === 'function' && typeof S !== 'undefined') { const _vtDz = velTick; velTick = function (now) { _vtDz(now); try { if (S.estate && now - (S.dzT || 0) > 500) { S.dzT = now; dzTick(now); } } catch (e) { console.warn('danças', e); } }; }
/* a animação antiga de dança das dançarinas não briga com a coreografia */
if (typeof near === 'function' && typeof S !== 'undefined') { const _nrDz = near; near = function (x, y, m) { if (m && m.t === 'anim' && m.a === 'dance' && m.w === 'n' && S.npcs && S.npcs[m.id] && S.npcs[m.id].dz) return; return _nrDz.apply(this, arguments); }; }
/* ---------------- CLIENTE ---------------- */
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peDz = progEvent; progEvent = function (m, now) { if (m.t === 'ndance') { G.npcDz = G.npcDz || {}; if (m.d) G.npcDz[m.id] = m.d; else delete G.npcDz[m.id]; return true; } return _peDz(m, now); }; }
if (typeof npcSprite3D === 'function' && typeof G !== 'undefined') {
  const _nsDz = npcSprite3D;
  npcSprite3D = function (kind, P) { const nid = P && P.nid ? String(P.nid) : '', d = nid && G.npcDz && G.npcDz[nid]; if (!d || !R3.ok || (P && (P.down || P.sit))) return _nsDz.apply(this, arguments);
    const beat = (Date.now() - d.t0) / 60000 * dzBpm(d), [st, b0] = dzStepAt(d, beat); if (!st) return _nsDz.apply(this, arguments);
    const nF = Math.min(16, Math.max(8, Math.round(st.len * 4))), f = Math.floor(((b0 % st.len) + st.len) % st.len / st.len * nF) % nF, bF = f / nF * st.len, vk = kind + '#' + nid, dir = P.dir | 0;
    return cache3('dz|' + vk + '|' + st.id + '|' + f + '|' + (d.mir ? 1 : 0) + '|' + (d.k || 1) + '|' + dir, () => {
      const L = lookFor('npc:' + vk, typeof npcLookOf === 'function' && NPC_LOOKS[kind] ? () => npcLookOf(kind, nid) : NPC_LOOKS[kind]), R = rigFor('npc:' + vk, L, NPC_SCALE[kind] ? { scale: NPC_SCALE[kind] } : undefined);
      const Q = danceStyle(st, bF, { mir: d.mir, ph: 0, k: d.k }); affPose(R, { isNpc: true, kind, id: nid }, { dir }); rigReset(R); danceApply(R, Q, null);
      const sheer = st.sty === 'strip' ? R.spine.children.filter(o => o.material && o.material.transparent && o.material.opacity < 0.5) : [], vis = st.strip === 'on' || (st.strip === 'throw' ? bF < 2 : st.strip !== 'off'); for (const o of sheer) o.visible = vis;
      const s = shoot3D(R, (dir + (Q.rot ? 4 : 0)) % 8, 0); for (const o of sheer) o.visible = true; return s; }, 'n|' + vk + dir); };
}
