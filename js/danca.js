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
  add('fk_rebolado', 'funk', 'Rebolado', 4, [   /* quadril em círculo; braços soltos balançando ao contrário do quadril; o joelho do lado que sobe dobra mais */
    [0, { hz: 0.24, hy: 0.16, A: [0.25, 0.32, 0, 0.9], B: [0.05, 0.28, 0, 0.5], LA: [0.18, 0.32, 0.1, 0.15], LB: [0.32, 0.6, 0.1, 0.15] }], [1, { hx: 0.26, A: [0.35, 0.3, 0, 1.0], B: [0.35, 0.3, 0, 1.0], LA: [0.3, 0.5, 0.1, 0.15], LB: [0.3, 0.5, 0.1, 0.15] }],
    [2, { hz: -0.24, hy: -0.16, A: [0.05, 0.28, 0, 0.5], B: [0.25, 0.32, 0, 0.9], LA: [0.32, 0.6, 0.1, 0.15], LB: [0.18, 0.32, 0.1, 0.15] }], [3, { hx: -0.22, A: [0.15, 0.3, 0, 0.7], B: [0.15, 0.3, 0, 0.7], LA: [0.22, 0.4, 0.1, 0.15], LB: [0.22, 0.4, 0.1, 0.15] }]]);
  add('fk_quadradinho', 'funk', 'Quadradinho', 4, [[0, { fw: 0.55, nx: -0.45, hx: 0.3, hz: 0.18, h: 'k', LA: HALF, LB: HALF }], [1, { fw: 0.55, nx: -0.45, hx: -0.2, hz: 0.18, h: 'k', LA: HALF, LB: HALF }], [2, { fw: 0.55, nx: -0.45, hx: -0.2, hz: -0.18, h: 'k', LA: HALF, LB: HALF }], [3, { fw: 0.55, nx: -0.45, hx: 0.3, hz: -0.18, h: 'k', LA: HALF, LB: HALF }]], { lin: 1 });
  add('fk_sarrada', 'funk', 'Sarrada', 2, [   /* desce fundo com o quadril para trás e os braços à frente; sobe rápido empurrando o quadril, braços puxando para trás */
    [0, { fw: 0.42, hx: 0.42, nx: -0.2, A: [0.85, 0.35, 0, 1.3], B: [0.85, 0.35, 0, 1.3], LA: [0.85, 1.45, 0.3, 0.35], LB: [0.85, 1.45, 0.3, 0.35] }], [0.35, { fw: 0.05, hx: -0.4, nx: 0.1, A: [-0.35, 0.4, 0, 1.4], B: [-0.35, 0.4, 0, 1.4], LA: [0.2, 0.35, 0.22, 0.3], LB: [0.2, 0.35, 0.22, 0.3] }],
    [1, { fw: 0.42, hx: 0.42, nx: -0.2, A: [0.85, 0.35, 0, 1.3], B: [0.85, 0.35, 0, 1.3], LA: [0.85, 1.45, 0.3, 0.35], LB: [0.85, 1.45, 0.3, 0.35] }], [1.35, { fw: 0.05, hx: -0.4, nx: 0.1, A: [-0.35, 0.4, 0, 1.4], B: [-0.35, 0.4, 0, 1.4], LA: [0.2, 0.35, 0.22, 0.3], LB: [0.2, 0.35, 0.22, 0.3] }]]);
  add('fk_passinho', 'funk', 'Passinho (sabará)', 4, [   /* um pé de apoio; a outra perna vai à frente e atrás; quadril para o lado contrário; braços soltos; troca o apoio a cada 2 batidas */
    [0, { hy: -0.2, hz: 0.12, cy: 0.15, A: [0.5, 0.3, 0, 1.4], B: [-0.15, 0.25, 0, 0.7], LA: [0.55, 0.35, 0.05, 0.1], LB: [0.25, 0.45, 0.06, 0.15] }], [0.5, { hy: 0.15, hz: 0.12, cy: -0.1, A: [-0.1, 0.25, 0, 0.7], B: [0.45, 0.3, 0, 1.3], LA: [-0.3, 0.7, 0.05, 0.1], LB: [0.25, 0.45, 0.06, 0.15] }],
    [1, { hy: -0.2, hz: 0.12, cy: 0.15, A: [0.5, 0.3, 0, 1.4], B: [-0.15, 0.25, 0, 0.7], LA: [0.55, 0.35, 0.05, 0.1], LB: [0.25, 0.45, 0.06, 0.15] }], [1.5, { hy: 0.15, hz: 0.12, cy: -0.1, A: [-0.1, 0.25, 0, 0.7], B: [0.45, 0.3, 0, 1.3], LA: [-0.3, 0.7, 0.05, 0.1], LB: [0.25, 0.45, 0.06, 0.15] }],
    [2, { hy: 0.2, hz: -0.12, cy: -0.15, A: [-0.15, 0.25, 0, 0.7], B: [0.5, 0.3, 0, 1.4], LA: [0.25, 0.45, 0.06, 0.15], LB: [0.55, 0.35, 0.05, 0.1] }], [2.5, { hy: -0.15, hz: -0.12, cy: 0.1, A: [0.45, 0.3, 0, 1.3], B: [-0.1, 0.25, 0, 0.7], LA: [0.25, 0.45, 0.06, 0.15], LB: [-0.3, 0.7, 0.05, 0.1] }],
    [3, { hy: 0.2, hz: -0.12, cy: -0.15, A: [-0.15, 0.25, 0, 0.7], B: [0.5, 0.3, 0, 1.4], LA: [0.25, 0.45, 0.06, 0.15], LB: [0.55, 0.35, 0.05, 0.1] }], [3.5, { hy: -0.15, hz: -0.12, cy: 0.1, A: [0.45, 0.3, 0, 1.3], B: [-0.1, 0.25, 0, 0.7], LA: [0.25, 0.45, 0.06, 0.15], LB: [-0.3, 0.7, 0.05, 0.1] }]]);
  add('fk_ombrinho', 'funk', 'Ombrinho', 2, [[0, { cy: 0.35, hy: -0.12, hz: 0.1, A: [0.55, 0.25, 0, 1.4], B: [0.1, 0.2, 0, 1.2], LA: SOFT, LB: [0.32, 0.55, 0.1, 0.15] }], [1, { cy: -0.35, hy: 0.12, hz: -0.1, A: [0.1, 0.2, 0, 1.2], B: [0.55, 0.25, 0, 1.4], LA: [0.32, 0.55, 0.1, 0.15], LB: SOFT }]]);
  add('fk_tremidinha', 'funk', 'Tremidinha', 1, [   /* joelhos alternando rápido (um dobra, o outro estica), o quadril treme junto, mãos nas coxas */
    [0, { fw: 0.3, hx: 0.14, hz: 0.1, h: 't', LA: [0.5, 1.0, 0.28, 0.3], LB: [0.42, 0.65, 0.28, 0.3] }], [0.25, { fw: 0.3, hx: -0.04, hz: -0.1, h: 't', LA: [0.42, 0.65, 0.28, 0.3], LB: [0.5, 1.0, 0.28, 0.3] }],
    [0.5, { fw: 0.3, hx: 0.14, hz: 0.1, h: 't', LA: [0.5, 1.0, 0.28, 0.3], LB: [0.42, 0.65, 0.28, 0.3] }], [0.75, { fw: 0.3, hx: -0.04, hz: -0.1, h: 't', LA: [0.42, 0.65, 0.28, 0.3], LB: [0.5, 1.0, 0.28, 0.3] }]], { lin: 1 });
  add('fk_destravada', 'funk', 'Destravada', 2, [   /* joelhos abrem e fecham juntos, braços cruzando */
    [0, { fw: 0.2, LA: [0.45, 0.85, 0.05, -0.15], LB: [0.45, 0.85, 0.05, -0.15], A: [0.8, -0.2, 0, 1.0], B: [0.8, -0.2, 0, 1.0] }], [0.5, { fw: 0.2, LA: [0.45, 0.85, 0.4, 0.45], LB: [0.45, 0.85, 0.4, 0.45], A: [0.6, 0.6, 0, 0.6], B: [0.6, 0.6, 0, 0.6] }],
    [1, { fw: 0.2, LA: [0.45, 0.85, 0.05, -0.15], LB: [0.45, 0.85, 0.05, -0.15], A: [0.8, -0.2, 0, 1.0], B: [0.8, -0.2, 0, 1.0] }], [1.5, { fw: 0.2, LA: [0.45, 0.85, 0.4, 0.45], LB: [0.45, 0.85, 0.4, 0.45], A: [0.6, 0.6, 0, 0.6], B: [0.6, 0.6, 0, 0.6] }]]);
  add('fk_maosalto', 'funk', 'Mãos elevatórias', 4, [[0, { hz: 0.2, A: AUP, B: [2.4, 0.5, 0, 0.6], LA: SOFT, LB: SOFT, ty: 0.2 }], [2, { hz: -0.2, A: [2.4, 0.5, 0, 0.6], B: AUP, LA: SOFT, LB: SOFT, ty: -0.2 }]]);

  /* ===================== TWERK (100) ===================== */
  const TW = (hx, kb, hz) => ({ fw: 0.8, nx: -0.75, hx, hz: hz || 0, h: 'k', LA: [0.85 + kb * 0.5, 1.25 + kb, 0.34, 0.4], LB: [0.85 + kb * 0.5, 1.25 + kb, 0.34, 0.4] });   /* o joelho dobra mais quando o quadril sai */
  add('tw_pe', 'twerk', 'Twerk de pé', 1, [[0, TW(0.42, 0.14, 0.05)], [0.5, TW(-0.18, -0.06, -0.05)]]);
  add('tw_agachado', 'twerk', 'Agachado', 2, [   /* agachamento fundo com quique: desce no tempo, sobe um pouco no contratempo; um braço para cima */
    [0, { fw: 0.55, nx: -0.4, hx: 0.38, hA: 'k', B: AUP, LA: [1.2, 2.05, 0.42, 0.45], LB: [1.2, 2.05, 0.42, 0.45] }], [0.5, { fw: 0.5, nx: -0.4, hx: -0.12, hA: 'k', B: [2.5, 0.4, 0, 0.6], LA: [1.0, 1.7, 0.42, 0.45], LB: [1.0, 1.7, 0.42, 0.45] }],
    [1, { fw: 0.55, nx: -0.4, hx: 0.38, A: AUP, hB: 'k', LA: [1.2, 2.05, 0.42, 0.45], LB: [1.2, 2.05, 0.42, 0.45] }], [1.5, { fw: 0.5, nx: -0.4, hx: -0.12, A: [2.5, 0.4, 0, 0.6], hB: 'k', LA: [1.0, 1.7, 0.42, 0.45], LB: [1.0, 1.7, 0.42, 0.45] }]]);
  add('tw_shuffle', 'twerk', 'Shuffle', 2, [[0, TW(0.28, 0.1, 0.3)], [0.5, TW(0.05, 0, 0)], [1, TW(0.28, 0.1, -0.3)], [1.5, TW(0.05, 0, 0)]]);
  add('tw_pulse', 'twerk', 'Pulso', 1, [   /* quadril para a frente e para trás, os joelhos acompanham (dobram no para trás) */
    [0, { fw: 0.5, hx: 0.34, h: 't', LA: [0.7, 1.2, 0.3, 0.35], LB: [0.7, 1.2, 0.3, 0.35] }], [0.5, { fw: 0.32, hx: -0.3, h: 't', LA: [0.45, 0.8, 0.3, 0.35], LB: [0.45, 0.8, 0.3, 0.35] }]]);
  add('tw_circulo', 'twerk', 'Círculos', 4, [[0, TW(0.1, 0.05, 0.28)], [1, TW(0.45, 0.14, 0)], [2, TW(0.1, 0.05, -0.28)], [3, TW(-0.18, -0.04, 0)]]);
  add('tw_onda', 'twerk', 'Onda', 4, [[0, { cx: -0.3, nx: 0.15, A: AL, B: AL, LA: ST, LB: ST }], [1, { cx: 0.25, sx: -0.25, nx: -0.1, A: [0.4, 0.3, 0, 1.0], B: [0.4, 0.3, 0, 1.0], LA: SOFT, LB: SOFT }], [2, { cx: 0.1, sx: 0.25, hx: -0.3, h: 't', LA: [0.4, 0.7, 0.12, 0.2], LB: [0.4, 0.7, 0.12, 0.2] }], [3, { cx: -0.1, hx: 0.3, h: 't', LA: SOFT, LB: SOFT }]]);
  add('tw_costas', 'twerk', 'De costas', 2, [   /* de costas, coluna em onda e quadril solto, olhando por cima do ombro */
    [0, { rot: PI, fw: 0.35, sx: 0.15, cy: 0.12, hz: 0.34, hx: 0.32, ty: 0.9, nz: 0.2, hA: 't', B: [0.6, 0.3, 0, 1.2], LA: [0.6, 1.0, 0.3, 0.35], LB: [0.45, 0.75, 0.3, 0.35] }], [0.5, { rot: PI, fw: 0.22, sx: -0.12, hx: -0.1, ty: 0.8, nz: 0.15, hA: 't', B: [0.5, 0.3, 0, 1.0], LA: [0.5, 0.85, 0.3, 0.35], LB: [0.5, 0.85, 0.3, 0.35] }],
    [1, { rot: PI, fw: 0.35, sx: 0.15, cy: -0.12, hz: -0.34, hx: 0.32, ty: 0.9, nz: 0.2, hA: 't', B: [0.6, 0.3, 0, 1.2], LA: [0.45, 0.75, 0.3, 0.35], LB: [0.6, 1.0, 0.3, 0.35] }], [1.5, { rot: PI, fw: 0.22, sx: -0.12, hx: -0.1, ty: 0.8, nz: 0.15, hA: 't', B: [0.5, 0.3, 0, 1.0], LA: [0.5, 0.85, 0.3, 0.35], LB: [0.5, 0.85, 0.3, 0.35] }]]);
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
  add('st_ombro', 'strip', 'Desce a alça', 4, [   /* rebolando devagar enquanto desliza o robe pelo ombro */
    [0, { hz: 0.24, hy: 0.12, ty: 0.5, A: [1.0, 0.1, 0, 2.4], B: [0.2, 0.3, 0, 0.8], LA: [0.15, 0.25, 0.06, 0.12], LB: [0.38, 0.65, 0.08, 0.15] }], [1, { hx: 0.2, ty: 0.6, A: [0.8, 0.3, 0, 1.9], B: [0.2, 0.3, 0, 0.9], LA: [0.28, 0.48, 0.07, 0.13], LB: [0.28, 0.48, 0.07, 0.13] }],
    [2, { hz: -0.24, hy: -0.12, ty: 0.7, nz: 0.2, A: [0.3, 0.6, 0, 1.0], B: [0.2, 0.3, 0, 0.8], LA: [0.38, 0.65, 0.08, 0.15], LB: [0.15, 0.25, 0.06, 0.12] }], [3, { hx: -0.15, ty: 0.5, A: [0.6, 0.4, 0, 1.6], B: [0.2, 0.3, 0, 0.9], LA: [0.28, 0.48, 0.07, 0.13], LB: [0.28, 0.48, 0.07, 0.13] }]], { strip: 'on' });
  add('st_abre', 'strip', 'Abre o robe', 4, [   /* rebola em oito enquanto abre o robe como asas */
    [0, { hz: 0.22, hy: 0.14, A: [0.6, -0.1, 0, 1.8], B: [0.6, -0.1, 0, 1.8], LA: [0.15, 0.25, 0.06, 0.12], LB: [0.38, 0.65, 0.08, 0.15] }], [1, { hx: 0.18, A: [0.8, 0.5, 0, 1.0], B: [0.8, 0.5, 0, 1.0], LA: [0.28, 0.48, 0.07, 0.13], LB: [0.28, 0.48, 0.07, 0.13] }],
    [2, { hz: -0.22, hy: -0.14, A: [1.0, 1.2, 0, 0.3], B: [1.0, 1.2, 0, 0.3], cx: -0.2, LA: [0.38, 0.65, 0.08, 0.15], LB: [0.15, 0.25, 0.06, 0.12] }], [3, { hx: -0.15, A: [0.8, 0.8, 0, 0.6], B: [0.8, 0.8, 0, 0.6], LA: [0.28, 0.48, 0.07, 0.13], LB: [0.28, 0.48, 0.07, 0.13] }]], { strip: 'on' });
  add('st_bodyroll', 'strip', 'Ondulação', 4, [[0, { cx: -0.3, A: [2.6, 0.3, 0, 2.0], B: [2.6, 0.3, 0, 2.0], LA: ST, LB: ST }], [1.3, { cx: 0.25, sx: -0.2, A: [0.9, 0.2, 0, 2.3], B: [0.9, 0.2, 0, 2.3], LA: SOFT, LB: SOFT }], [2.6, { sx: 0.25, hx: -0.3, h: 't', LA: [0.4, 0.7, 0.12, 0.2], LB: [0.4, 0.7, 0.12, 0.2] }]]);
  add('st_jogar', 'strip', 'Jogar a peça', 4, [   /* gira a peça na mão sem parar de rebolar e joga */
    [0, { hz: 0.22, ty: -0.3, A: [2.8, 0.4, 0, 0.2], hB: 'w', LA: [0.15, 0.25, 0.06, 0.12], LB: [0.38, 0.65, 0.08, 0.15] }], [1, { hz: -0.22, ty: 0.3, A: [2.9, 0.6, 0.6, 0.3], hB: 'w', LA: [0.38, 0.65, 0.08, 0.15], LB: [0.15, 0.25, 0.06, 0.12] }],
    [2, { hy: 0.4, cy: 0.3, hz: 0.18, A: [1.4, 1.1, 0, 0.1], hB: 'w', LA: [0.15, 0.25, 0.06, 0.12], LB: [0.38, 0.65, 0.08, 0.15] }], [3, { hz: -0.2, hx: 0.12, A: [0.3, 0.4, 0, 0.9], hB: 'w', LA: [0.38, 0.65, 0.08, 0.15], LB: [0.15, 0.25, 0.06, 0.12] }]], { strip: 'throw' });
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
  /* ---- física de mola nas juntas (o "ragdoll" da dança): cada junta segue a pose-alvo com atraso e um leve balanço.
     O passo é simulado 3 voltas (24 subpassos por batida) e os quadros saem da 3ª volta, então o laço fecha sem salto.
     Firme no quadril e nas pernas de apoio (os pés não escorregam), solta nos braços; na barra as pernas ficam bem soltas e pendem. ---- */
  const SPRING = { arm: [50, 0.45], head: [85, 0.55], spine: [140, 0.7], hips: [200, 0.8], leg: [260, 0.9], legAir: [28, 0.3] };
  const GROUP = { A: 'arm', B: 'arm', LA: 'leg', LB: 'leg', hx: 'hips', hy: 'hips', hz: 'hips', sx: 'spine', sy: 'spine', sz: 'spine', cx: 'spine', cy: 'spine', cz: 'spine', fw: 'spine', nx: 'head', ny: 'head', nz: 'head', ty: 'head', hdx: 'head', hdz: 'head' };
  function frames(step, nF) { step._fr = step._fr || {}; if (step._fr[nF]) return step._fr[nF]; const L = step.len, sub = 24, dt = 1 / sub, st = {}, out = new Array(nF);
    const par = k => { let g = GROUP[k]; if ((k === 'LA' || k === 'LB') && step.pole) g = 'legAir'; const [kk, z] = SPRING[g]; return [kk, 2 * z * Math.sqrt(kk)]; };
    const n = Math.round(L * sub * 3), rec0 = Math.round(L * sub * 2);
    for (let i = 0; i <= n; i++) { const t = i * dt, T = at(step, t % L);
      for (const k in GROUP) { const tg = T[k]; if (tg == null) continue; const [kk, c] = par(k);
        if (Array.isArray(tg)) { const S0 = st[k] || (st[k] = { x: tg.slice(), v: tg.map(() => 0) }); for (let j = 0; j < tg.length; j++) { const acc = kk * (tg[j] - S0.x[j]) - c * S0.v[j]; S0.v[j] += acc * dt; S0.x[j] += S0.v[j] * dt; } }
        else { const S0 = st[k] || (st[k] = { x: tg, v: 0 }); const acc = kk * (tg - S0.x) - c * S0.v; S0.v += acc * dt; S0.x += S0.v * dt; } }
      if (i >= rec0) { const f = Math.round((i - rec0) / (L * sub) * nF); if (f < nF && !out[f]) { const P = Object.assign({}, T); for (const k in st) if (T[k] != null) P[k] = Array.isArray(st[k].x) ? st[k].x.slice() : st[k].x; out[f] = P; } } }
    for (let f = 0; f < nF; f++) if (!out[f]) out[f] = at(step, f / nF * L); return (step._fr[nF] = out); }
  window.danceFrames = frames;
  window.danceStyleF = (step, f, nF, me) => { me = me || {}; const fr = frames(step, nF), sh = Math.round((me.ph || 0) / step.len * nF); let P = fr[(((f + sh) % nF) + nF) % nF]; if (me.mir) P = mirror(P); if (me.k && me.k !== 1) P = flavor(P, me.k); return P; };
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
      const Q = danceStyleF(st, f, nF, { mir: d.mir, k: d.k }); affPose(R, { isNpc: true, kind, id: nid }, { dir }); rigReset(R); danceApply(R, Q, null);
      const sheer = st.sty === 'strip' ? R.spine.children.filter(o => o.material && o.material.transparent && o.material.opacity < 0.5) : [], vis = st.strip === 'on' || (st.strip === 'throw' ? bF < 2 : st.strip !== 'off'); for (const o of sheer) o.visible = vis;
      const s = shoot3D(R, (dir + (Q.rot ? 4 : 0)) % 8, 0); for (const o of sheer) o.visible = true; return s; }, 'n|' + vk + dir); };
}

/* ---------- LAP DANCE PAGA: sentado no seu reservado com uma moça à mesa (ou no sofá na festa da suíte), 💃 Lap dance ---------- */
const DZL = { price: 40, ch: 'lap' };
const dzlTotal = () => DANCE_CHOREO[DZL.ch].seq.reduce((a, s) => a + s[1], 0), dzlMs = () => dzlTotal() / DANCE_CHOREO[DZL.ch].bpm * 60000;
/* servidor */
function dzlGirl(p) { const P = S.vlParty && S.vlParty[p.id]; if (P && P.stage === 'party' && p.sit) return P.girls[0]; const fav = typeof l9VFav === 'function' && S.estate ? l9VFav(p) : null; const L = Object.keys(S.vlTable || {}).filter(g => S.vlTable[g].who === p.id && !S.vlTable[g].npc); return L.includes(fav) ? fav : L[0] || null; }
function dzlStart(p) { const now = Date.now(); if (!p.sit) { tell(p, 'Sente-se primeiro (no seu reservado ou no sofá da suíte).'); return; } if (p.dzl && p.dzl.until > now) { tell(p, 'Ela já está dançando para você.'); return; }
  const g = dzlGirl(p), n = g && S.npcs[g]; if (!n) { tell(p, 'Chame uma moça para a sua mesa primeiro.'); return; } if ((p.gold || 0) < DZL.price) { tell(p, 'A lap dance custa ' + DZL.price + ' de ouro.'); return; }
  p.gold -= DZL.price; sendStat(p); p.dzl = { g, t0: now + 800, until: now + 800 + dzlMs() }; if (p.aff && typeof affEnd === 'function') affEnd(p);
  empSay(n, ['Relaxa e só olha.', 'Essa é só para você.', 'Mãos no sofá, querido.'][Math.floor(Math.random() * 3)]); near(p.x, p.y, { t: 'vllap', pid: p.id, g, t0: p.dzl.t0, until: p.dzl.until, on: 1 });
  if (typeof l9VAdd === 'function' && S.estate) l9VAdd(p, g, 2); }
function dzlTick(now) { for (const p of Object.values(S.players)) { const L = p.dzl; if (!L) continue; const n = S.npcs[L.g];
  if (now > L.until || !p.sit || !n) { p.dzl = null; near(p.x, p.y, { t: 'vllap', pid: p.id, on: 0 }); if (n && now > L.until) { empSay(n, ['Gostou?', 'Quando quiser outra, é só pedir.', 'Fiquei com calor...'][Math.floor(Math.random() * 3)]); } continue; }
  if (now - (L.re || 0) > 4000) { L.re = now; near(p.x, p.y, { t: 'vllap', pid: p.id, g: L.g, t0: L.t0, until: L.until, on: 1 }); } } }
if (typeof velTick === 'function' && typeof S !== 'undefined') { const _vtL = velTick; velTick = function (now) { _vtL(now); try { if (S.estate) dzlTick(now); } catch (e) { console.warn('lap dance', e); } }; }
if (typeof velMsg === 'function' && typeof S !== 'undefined') { const _vmL = velMsg; velMsg = function (p, m) { if (m && m.a === 'lap8') { dzlStart(p); return; } return _vmL.apply(this, arguments); }; }
/* cliente: o par (ele sentado + ela dançando) num quadro só, desenhado no lugar dele; a moça some do lugar dela enquanto dança */
const DZL_SPR = new Map();
function dzlRig(e, slot) { const k = 'dzl|' + slot + '|' + (e.isNpc ? e.kind + '#' + e.id : e.cls + ':' + e.skin + ':' + e.color); let R = DZL_SPR.get(k); if (!R) { const L = Object.assign({}, affLook(e, 'hug', false), { weapon: null, shield: null, quiver: false, cape: false }); R = buildHumanoid(L); DZL_SPR.set(k, R); } return R; }   /* com a roupa de cada um (no reservado não é banho) */
function dzlSprite(e, L) { const C = DANCE_CHOREO[DZL.ch], beat = Math.max(0, (Date.now() - L.t0) / 60000 * C.bpm), [st, b0] = dzStepAt({ ch: DZL.ch }, beat); if (!st) return null;
  const nF = Math.min(16, Math.max(8, Math.round(st.len * 4))), f = Math.floor(((b0 % st.len) + st.len) % st.len / st.len * nF) % nF, bF = f / nF * st.len, dir = e.dir | 0, n = G.npcs[L.g], kind = n ? n.kind : 'vl_comp1';
  const key = st.id + '|' + f + '|' + dir + '|' + L.g + '|' + (e.cls + e.skin + e.color); let s = DZL_SPR.get(key); if (s) return s; if (!R3.ok || (R3.budget != null && R3.budget <= 0 && L.last)) return L.last || null;
  const RA = dzlRig(e, 'LH'), eg = { isNpc: true, kind, id: L.g }, RB = dzlRig(eg, 'LG'); rigReset(RA); rigReset(RB);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), yaw = affYaw(dir);
  affPose(RA, e, { dir: 2, sit: 'c' }); RA.root.rotation.set(0, 0, 0); RA.root.position.set(0, 0, -0.3); RA.root.updateMatrixWorld(true);
  const ctx = { seatHead: W(RA.head), seatChest: W(RA.chest).add(V(0, 0, 0.12)), lapY: (W(RA.LA.hp).y + W(RA.LA.kn).y) / 2 + 0.1, lapZ: (W(RA.LA.hp).z + W(RA.LA.kn).z) / 2 }, P = danceStyleF(st, f, nF, {});
  affPose(RB, eg, { dir: 2 }); rigReset(RB); let rx = 0, rz = 0.36, ry = Math.PI;
  if (st.chair === 'lap') { rz = ctx.lapZ + 0.03; ry = 0; } else if (st.chair === 'side') { rz = ctx.lapZ - 0.02; ry = Math.PI / 2; } else if (st.chair === 'orbit') { const a = P.orbitC || 0; rx = Math.sin(a) * 0.62; rz = -0.3 + Math.cos(a) * 0.62; ry = a + Math.PI / 2; }
  RB.root.rotation.set(0, ry, 0); RB.root.position.set(rx, 0, rz); RB.root.updateMatrixWorld(true); danceApply(RB, P, null);
  RB.root.updateMatrixWorld(true); if (P.sit) RB.root.position.y += ctx.lapY - W(RB.hips).y; else { let m = 9; for (const j of [RB.LA.ft, RB.LB.ft]) m = Math.min(m, W(j).y); RB.root.position.y += 0.035 - m; } RB.root.updateMatrixWorld(true); danceApply(RB, P, ctx);
  /* gira o par para a direção dele e põe no chão do quadro */
  const piv = new THREE.Group(); piv.rotation.y = yaw; for (const R of [RA, RB]) piv.add(R.root); piv.updateMatrixWorld(true);
  let minY = Infinity; for (const R of [RA, RB]) minY = Math.min(minY, new THREE.Box3().setFromObject(R.root).min.y); piv.position.y = -minY + 0.01; piv.updateMatrixWorld(true);
  const { renderer, scene, cam, W: Wd, H: Hh } = R3; scene.add(piv); renderer.render(scene, cam); scene.remove(piv); for (const R of [RA, RB]) piv.remove(R.root);
  const cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hh; cv.getContext('2d').drawImage(renderer.domElement, 0, 0); if (R3.budget != null) R3.budget--;
  s = { c: cv, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; DZL_SPR.set(key, s); L.last = s; if (DZL_SPR.size > 140) { const k0 = [...DZL_SPR.keys()].find(k => !k.startsWith('dzl|')); if (k0) DZL_SPR.delete(k0); } return s; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peL = progEvent; progEvent = function (m, now) {
  if (m.t === 'vllap') { G.vlLap = G.vlLap || {}; if (m.on) G.vlLap[m.pid] = Object.assign(G.vlLap[m.pid] || {}, m); else delete G.vlLap[m.pid]; return true; }
  const r = _peL(m, now);
  if (m.t === 'vlbooth') { let b = document.getElementById('vl-lap'); if (!m.on) { if (b) b.remove(); } else if (!b) { b = document.createElement('button'); b.id = 'vl-lap'; b.className = 'vl-tray'; b.style.bottom = '212px'; b.textContent = '💃 Lap dance (' + DZL.price + ')'; b.onclick = () => Net.send({ t: 'vel', a: 'lap8' }); document.body.appendChild(b); } }
  if (m.t === 'vl6ui') { const d = document.getElementById('vl6-ui'); if (d && m.on && !d.querySelector('[data-lap8]')) { const row = d.querySelector('.aff-row'); if (row) { const b = document.createElement('button'); b.type = 'button'; b.dataset.lap8 = 1; b.textContent = '💃 Lap dance (' + DZL.price + ', sentado)'; b.onclick = () => Net.send({ t: 'vel', a: 'lap8' }); row.appendChild(b); } } }
  return r; }; }
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhL = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) { const LL = G.vlLap;
  if (LL && e) { if (e.isNpc) { for (const k in LL) if (LL[k].g === e.id) { e._spr = null; return; } } else if (LL[e.id] && LL[e.id].g) { const s = dzlSprite(e, LL[e.id]); if (s) { ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy); e._spr = s; e._sx = sx; e._sy = sy; e._drawT = now; return; } } }
  return _dhL.apply(this, arguments); }; }
