/* Danças novas (28/11, 2ª leva): 15 passos de twerk e 15 de lap dance, mais ousados (mais contato e mais rebolado no colo, nada explícito).
   Nomes dos passos de twerk tirados das aulas: sobe e desce, pop para trás, pop duplo, wobble, zigue-zague, bate-palma (clapper), dobrada (bend over),
   vibração subindo/descendo (shake up/down), de quatro, isolamento... */
(function () {
  if (typeof DANCE === 'undefined') return;
  const PI = Math.PI, add = (id, sty, n, len, k, extra) => { DANCE[id] = Object.assign({ id, sty, n, len, k }, extra || {}); };
  const ST = [0.05, 0.1, 0.06, 0.12], SOFT = [0.22, 0.42, 0.1, 0.15], HALF = [0.8, 1.35, 0.36, 0.4], SQ = [1.15, 1.95, 0.42, 0.45];
  const AUP = [2.7, 0.3, 0, 0.35], AFLOW = [0.9, 0.5, 0, 1.2];
  const M = P => { const o = Object.assign({}, P); for (const q of ['hy', 'hz', 'sy', 'sz', 'cy', 'cz', 'ny', 'nz', 'ty', 'hdz']) if (o[q]) o[q] = -o[q]; [o.A, o.B] = [P.B, P.A]; [o.LA, o.LB] = [P.LB, P.LA]; [o.hA, o.hB] = [P.hB, P.hA]; return o; };
  const TW = (hx, kb, hz, o) => Object.assign({ fw: 0.8, nx: -0.75, hx, hz: hz || 0, h: 'k', LA: [0.85 + kb * 0.5, 1.25 + kb, 0.34, 0.4], LB: [0.85 + kb * 0.5, 1.25 + kb, 0.34, 0.4] }, o || {});

  /* ===================== TWERK (100) ===================== */
  add('tw2_sobedesce', 'twerk', 'Sobe e desce', 2, [   /* arqueia e encaixa o quadril enquanto sobe e desce: embaixo a lombar dobra, em cima o peito */
    [0, TW(0.45, 0.25)], [0.5, TW(-0.15, 0.1)], [1, Object.assign(TW(0.4, -0.15), { fw: 0.55, cx: 0.2 })], [1.5, Object.assign(TW(-0.2, -0.2), { fw: 0.5, cx: 0.25 })]]);
  add('tw2_popback', 'twerk', 'Pop para trás', 2, [[0, TW(-0.1, 0)], [0.15, TW(0.55, 0.16)], [1, TW(0.5, 0.14)], [1.15, TW(-0.1, 0)]], { lin: 1 });   /* estala o quadril para trás no tempo e segura */
  add('tw2_popduplo', 'twerk', 'Pop duplo', 1, [[0, TW(0.5, 0.14)], [0.2, TW(0, 0)], [0.4, TW(0.5, 0.14)], [0.7, TW(-0.15, -0.05)]], { lin: 1 });
  add('tw2_wobble', 'twerk', 'Wobble', 1, [[0, TW(0.2, 0.08, 0.32, { LA: [1.0, 1.5, 0.34, 0.4], LB: [0.8, 1.15, 0.34, 0.4] })], [0.5, TW(0.2, 0.08, -0.32, { LA: [0.8, 1.15, 0.34, 0.4], LB: [1.0, 1.5, 0.34, 0.4] })]]);   /* quadril balança de lado a lado com os joelhos alternando */
  add('tw2_zigue', 'twerk', 'Zigue-zague', 2, [[0, TW(0.42, 0.12, 0.26)], [0.5, TW(-0.12, -0.04, 0)], [1, TW(0.42, 0.12, -0.26)], [1.5, TW(-0.12, -0.04, 0)]], { lin: 1 });
  add('tw2_palma', 'twerk', 'Bate-palma', 1, [   /* agachada funda, os joelhos abrem e fecham rápido e o quadril bate junto */
    [0, { fw: 0.75, nx: -0.7, hx: 0.4, h: 'k', LA: [1.15, 1.9, 0.48, 0.5], LB: [1.15, 1.9, 0.48, 0.5] }], [0.25, { fw: 0.75, nx: -0.7, hx: 0.2, h: 'k', LA: [1.15, 1.9, 0.2, 0.2], LB: [1.15, 1.9, 0.2, 0.2] }],
    [0.5, { fw: 0.75, nx: -0.7, hx: 0.4, h: 'k', LA: [1.15, 1.9, 0.48, 0.5], LB: [1.15, 1.9, 0.48, 0.5] }], [0.75, { fw: 0.75, nx: -0.7, hx: 0.2, h: 'k', LA: [1.15, 1.9, 0.2, 0.2], LB: [1.15, 1.9, 0.2, 0.2] }]], { lin: 1 });
  add('tw2_dobrada', 'twerk', 'Dobrada', 1, [   /* tronco lá embaixo, mãos nos tornozelos, pernas quase esticadas, o quadril tremendo no alto */
    [0, { fw: 1.35, nx: -1.0, hx: 0.4, A: [1.6, 0.25, 0, 0.2], B: [1.6, 0.25, 0, 0.2], LA: [0.35, 0.3, 0.3, 0.3], LB: [0.35, 0.3, 0.3, 0.3] }], [0.5, { fw: 1.3, nx: -1.0, hx: 0.05, A: [1.6, 0.25, 0, 0.2], B: [1.6, 0.25, 0, 0.2], LA: [0.3, 0.45, 0.3, 0.3], LB: [0.3, 0.45, 0.3, 0.3] }]]);
  add('tw2_vibrasobe', 'twerk', 'Vibração subindo', 4, (() => { const K = []; for (let q = 0; q < 16; q++) { const t = q / 16, kb = 0.3 - t * 0.5; K.push([q * 0.25, TW(q % 2 ? -0.05 : 0.38, kb, 0, { fw: 0.85 - t * 0.35 })]); } return K; })(), { lin: 1 });   /* tremendo enquanto sobe do agachamento */
  add('tw2_vibradesce', 'twerk', 'Vibração descendo', 4, (() => { const K = []; for (let q = 0; q < 16; q++) { const t = q / 16, kb = -0.2 + t * 0.5; K.push([q * 0.25, TW(q % 2 ? -0.05 : 0.38, kb, 0, { fw: 0.5 + t * 0.35 })]); } return K; })(), { lin: 1 });
  add('tw2_quatro', 'twerk', 'De quatro', 2, [   /* de joelhos e mãos no chão, arqueia as costas e solta o quadril, olhando para trás */
    [0, { kneel: 1, fw: 1.05, sx: -0.25, nx: -0.4, ty: 0.7, hx: 0.42, A: [1.45, 0.18, 0, 0.1], B: [1.45, 0.18, 0, 0.1], LA: [-0.1, 1.65, 0.28, 0], LB: [-0.1, 1.65, 0.28, 0] }], [0.5, { kneel: 1, fw: 1.0, sx: 0.1, nx: -0.6, ty: 0.7, hx: -0.12, A: [1.45, 0.18, 0, 0.1], B: [1.45, 0.18, 0, 0.1], LA: [-0.1, 1.65, 0.28, 0], LB: [-0.1, 1.65, 0.28, 0] }],
    [1, { kneel: 1, fw: 1.05, sx: -0.25, nx: -0.4, ty: -0.7, hx: 0.42, A: [1.45, 0.18, 0, 0.1], B: [1.45, 0.18, 0, 0.1], LA: [-0.1, 1.65, 0.28, 0], LB: [-0.1, 1.65, 0.28, 0] }], [1.5, { kneel: 1, fw: 1.0, sx: 0.1, nx: -0.6, ty: -0.7, hx: -0.12, A: [1.45, 0.18, 0, 0.1], B: [1.45, 0.18, 0, 0.1], LA: [-0.1, 1.65, 0.28, 0], LB: [-0.1, 1.65, 0.28, 0] }]]);
  add('tw2_ajoelhada', 'twerk', 'Ajoelhada de costas', 2, [   /* de joelhos e de costas, o quadril desce até os calcanhares e sobe rebolando, mão no cabelo */
    [0, { kneel: 1, rot: PI, sx: 0.2, hx: 0.3, hz: 0.2, ty: 0.8, hA: 'n', hB: 't', LA: [-0.1, 1.65, 0.25, 0], LB: [-0.1, 1.65, 0.25, 0] }], [0.5, { kneel: 1, rot: PI, fw: 0.15, hx: 0.55, ty: 0.8, hA: 'n', hB: 't', LA: [0.3, 2.2, 0.25, 0], LB: [0.3, 2.2, 0.25, 0] }],
    [1, { kneel: 1, rot: PI, sx: 0.2, hx: 0.3, hz: -0.2, ty: 0.8, hA: 'n', hB: 't', LA: [-0.1, 1.65, 0.25, 0], LB: [-0.1, 1.65, 0.25, 0] }], [1.5, { kneel: 1, rot: PI, fw: 0.15, hx: 0.55, ty: 0.8, hA: 'n', hB: 't', LA: [0.3, 2.2, 0.25, 0], LB: [0.3, 2.2, 0.25, 0] }]]);
  add('tw2_bracos', 'twerk', 'Braços para o alto', 1, [[0, { fw: 0.45, nx: -0.2, hx: 0.42, A: AUP, B: AUP, LA: HALF, LB: HALF }], [0.5, { fw: 0.35, nx: -0.15, hx: -0.18, A: [2.5, 0.45, 0, 0.6], B: [2.5, 0.45, 0, 0.6], LA: [0.65, 1.05, 0.36, 0.4], LB: [0.65, 1.05, 0.36, 0.4] }]]);
  add('tw2_isolado', 'twerk', 'Isolamento', 1, [   /* o tronco parado, só o quadril tremendo rápido */
    [0, { fw: 0.6, sx: -0.4, nx: -0.5, hx: 0.38, h: 't', LA: HALF, LB: HALF }], [0.25, { fw: 0.6, sx: -0.12, nx: -0.5, hx: 0.05, h: 't', LA: HALF, LB: HALF }], [0.5, { fw: 0.6, sx: -0.4, nx: -0.5, hx: 0.38, h: 't', LA: HALF, LB: HALF }], [0.75, { fw: 0.6, sx: -0.12, nx: -0.5, hx: 0.05, h: 't', LA: HALF, LB: HALF }]], { lin: 1 });
  add('tw2_ombro', 'twerk', 'Por cima do ombro', 4, [   /* de lado, olhando para trás por cima do ombro, joga o cabelo no fim */
    [0, { rot: PI * 0.6, fw: 0.55, ty: 1.0, nz: 0.25, hx: 0.42, hA: 'k', B: [0.5, 0.4, 0, 1.1], LA: [0.9, 1.4, 0.3, 0.35], LB: [0.75, 1.15, 0.3, 0.35] }], [0.5, { rot: PI * 0.6, fw: 0.45, ty: 1.0, nz: 0.25, hx: -0.1, hA: 'k', B: [0.5, 0.4, 0, 1.1], LA: [0.8, 1.25, 0.3, 0.35], LB: [0.8, 1.25, 0.3, 0.35] }],
    [1, { rot: PI * 0.6, fw: 0.55, ty: 1.0, nz: 0.25, hx: 0.42, hA: 'k', B: [0.5, 0.4, 0, 1.1], LA: [0.9, 1.4, 0.3, 0.35], LB: [0.75, 1.15, 0.3, 0.35] }], [2, { rot: PI * 0.6, fw: 0.45, ty: 1.0, nz: 0.25, hx: -0.1, hA: 'k', B: [0.5, 0.4, 0, 1.1], LA: [0.8, 1.25, 0.3, 0.35], LB: [0.8, 1.25, 0.3, 0.35] }],
    [3, { rot: PI * 0.6, fw: -0.1, nx: -0.5, hdz: 0.35, ty: 0.6, hA: 'n', hB: 'w', LA: SOFT, LB: SOFT }]]);
  add('tw2_sumo', 'twerk', 'Agachada aberta', 2, [   /* agachamento bem aberto, mãos empurrando as coxas, quica e rebola */
    [0, { fw: 0.4, nx: -0.2, hx: 0.3, hz: 0.18, h: 't', LA: [1.1, 1.8, 0.6, 0.65], LB: [1.1, 1.8, 0.6, 0.65] }], [0.5, { fw: 0.32, hx: -0.15, h: 't', LA: [0.85, 1.4, 0.6, 0.65], LB: [0.85, 1.4, 0.6, 0.65] }],
    [1, { fw: 0.4, nx: -0.2, hx: 0.3, hz: -0.18, h: 't', LA: [1.1, 1.8, 0.6, 0.65], LB: [1.1, 1.8, 0.6, 0.65] }], [1.5, { fw: 0.32, hx: -0.15, h: 't', LA: [0.85, 1.4, 0.6, 0.65], LB: [0.85, 1.4, 0.6, 0.65] }]]);

  /* ===================== LAP DANCE (80) — mais ousado ===================== */
  const RID = (o) => Object.assign({ sit: 'lap', h: 's', LA: [1.55, 2.25, 0.62, 0.2], LB: [1.55, 2.25, 0.62, 0.2] }, o);   /* montada de frente: joelhos dos dois lados das coxas dele, mãos nos ombros */
  add('lp2_monta', 'lap', 'Montada de frente', 4, [[0, RID({ sx: 0.1, hx: 0.25, nx: -0.1 })], [1, RID({ sx: -0.15, hx: -0.25, nx: 0.1 })], [2, RID({ sx: 0.1, hx: 0.25, nx: -0.1, hdz: 0.15 })], [3, RID({ sx: -0.15, hx: -0.25, nx: 0.1, hdz: -0.15 })]], { chair: 'straddle' });
  add('lp2_rebola', 'lap', 'Rebolado no colo', 4, [[0, RID({ hz: 0.25, hy: 0.15 })], [1, RID({ hx: 0.28 })], [2, RID({ hz: -0.25, hy: -0.15 })], [3, RID({ hx: -0.22 })]], { chair: 'straddle', lin: 1 });
  add('lp2_arco', 'lap', 'Arqueada para trás', 4, [   /* montada, solta os ombros dele e arqueia para trás com os braços abertos, depois volta colada */
    [0, RID({ sx: -0.1 })], [1.5, RID({ h: null, sx: -0.65, cx: -0.3, nx: 0.5, A: [1.6, 1.1, 0, 0.3], B: [1.6, 1.1, 0, 0.3] })], [2.5, RID({ h: null, sx: -0.55, cx: -0.25, nx: 0.45, A: [2.4, 0.6, 0, 0.4], B: [2.4, 0.6, 0, 0.4] })], [3.5, RID({ sx: 0.2, nx: -0.2 })]], { chair: 'straddle' });
  add('lp2_pescoco', 'lap', 'Abraço no pescoço', 4, [[0, RID({ sx: 0.3, nx: -0.15, ty: 0.4, A: [1.7, -0.4, 0, 1.9], B: [1.7, -0.4, 0, 1.9], h: null, hz: 0.12 })], [2, RID({ sx: 0.35, nx: -0.2, ty: -0.4, A: [1.7, -0.4, 0, 1.9], B: [1.7, -0.4, 0, 1.9], h: null, hz: -0.12 })]], { chair: 'straddle' });   /* braços em volta do pescoço dele, rosto de lado */
  add('lp2_encaixe', 'lap', 'Encaixe de costas', 2, [   /* sentada de costas no colo, vai e volta encaixando o quadril */
    [0, { sit: 'lap', sx: -0.2, hx: 0.3, nx: -0.1, ty: 0.5, hA: 't', hB: 'n', LA: [1.45, 1.45, 0.3, 0.1], LB: [1.45, 1.45, 0.3, 0.1] }], [1, { sit: 'lap', sx: -0.35, hx: -0.25, ty: 0.6, hA: 't', hB: 'n', LA: [1.45, 1.45, 0.3, 0.1], LB: [1.45, 1.45, 0.3, 0.1] }]], { chair: 'lap' });
  add('lp2_quica', 'lap', 'Quicadinha no colo', 1, [[0, { sit: 'lap', fw: 0.35, hx: 0.38, h: 'k', LA: [1.3, 1.6, 0.4, 0.2], LB: [1.3, 1.6, 0.4, 0.2] }], [0.5, { sit: 'lap', fw: 0.3, hx: -0.05, h: 'k', LA: [1.2, 1.4, 0.4, 0.2], LB: [1.2, 1.4, 0.4, 0.2] }]], { chair: 'lap', lin: 1 });   /* de costas, mãos nos joelhos, quicando no colo */
  add('lp2_twerkcolo', 'lap', 'Twerk sobre o colo', 1, [[0, TW(0.45, 0.14)], [0.5, TW(-0.15, -0.05)]], { chair: 'back' });   /* de costas, em pé, dobrada sobre ele, twerk em cima do colo */
  add('lp2_desce', 'lap', 'Descida de costas', 4, [   /* de costas, desce rebolando até quase sentar e sobe devagar em onda */
    [0, { cx: -0.2, hA: 'n', hB: 'w', LA: SOFT, LB: SOFT, hz: 0.2 }], [1.5, { fw: 0.35, hx: 0.45, h: 'k', LA: SQ, LB: SQ, hz: -0.15 }], [2.5, { fw: 0.3, hx: 0.3, h: 'k', LA: SQ, LB: SQ, hz: 0.15 }], [3.5, { fw: 0.1, cx: 0.25, sx: -0.2, hx: -0.2, h: 't', LA: HALF, LB: HALF }]], { chair: 'back' });
  add('lp2_peito', 'lap', 'Mãos no peito dele', 4, [[0, { fw: 0.45, nx: -0.2, hz: 0.25, hy: 0.15, h: 'c', LA: SOFT, LB: [0.35, 0.6, 0.1, 0.15] }], [2, { fw: 0.55, nx: -0.3, hz: -0.25, hy: -0.15, h: 'c', LA: [0.35, 0.6, 0.1, 0.15], LB: SOFT }]], { chair: 'front' });   /* de frente, inclinada, as duas mãos no peito dele e o quadril rebolando */
  add('lp2_cabelo', 'lap', 'Cabelo no rosto', 4, [   /* debruça sobre ele, o cabelo cai no rosto dele, sobe jogando para trás */
    [0, { fw: 0.2, hA: 'n', hB: 'w', LA: SOFT, LB: SOFT }], [1.5, { fw: 1.0, nx: -0.6, hdz: 0.2, h: 's', LA: [0.3, 0.35, 0.1, 0.1], LB: [0.3, 0.35, 0.1, 0.1] }], [2.5, { fw: 0.95, nx: -0.5, hdz: -0.2, h: 's', LA: [0.3, 0.35, 0.1, 0.1], LB: [0.3, 0.35, 0.1, 0.1] }], [3.5, { fw: -0.15, nx: 0.5, hA: 'n', hB: 'n', LA: SOFT, LB: SOFT }]], { chair: 'front' });
  add('lp2_volta', 'lap', 'Volta rebolando', 4, [   /* dá a volta na cadeira com o quadril em twerk e a mão deslizando nos ombros dele */
    [0, { orbitC: 0, hA: 's', B: AFLOW, fw: 0.3, hx: 0.3, LA: HALF, LB: HALF }], [1, { orbitC: PI / 2, hA: 's', B: AFLOW, fw: 0.3, hx: -0.1, LA: HALF, LB: HALF }], [2, { orbitC: PI, hA: 's', B: AFLOW, fw: 0.3, hx: 0.3, LA: HALF, LB: HALF }],
    [3, { orbitC: 3 * PI / 2, hA: 's', B: AFLOW, fw: 0.3, hx: -0.1, LA: HALF, LB: HALF }], [4, { orbitC: 2 * PI, hA: 's', B: AFLOW, fw: 0.3, hx: 0.3, LA: HALF, LB: HALF }]], { chair: 'orbit', lin: 1 });
  add('lp2_ajoelha', 'lap', 'Ajoelhada à frente', 4, [   /* de joelhos entre os pés dele, sobe o corpo em onda com as mãos nos ombros */
    [0, { kneel: 1, fw: 0.2, h: 's', LA: [-0.1, 1.65, 0.25, 0], LB: [-0.1, 1.65, 0.25, 0] }], [1.5, { kneel: 1, cx: 0.3, sx: -0.25, hx: -0.25, h: 's', LA: [-0.1, 1.65, 0.25, 0], LB: [-0.1, 1.65, 0.25, 0] }], [3, { kneel: 1, sx: 0.25, cx: -0.2, hx: 0.25, nx: 0.2, h: 's', LA: [-0.1, 1.65, 0.25, 0], LB: [-0.1, 1.65, 0.25, 0] }]], { chair: 'front' });
  add('lp2_lado', 'lap', 'Sentada de lado, perna cruzada', 4, [[0, { sit: 'side', sx: -0.2, hz: 0.1, hA: 'c', B: [1.6, 0.6, 0.3, 1.6], LA: [1.5, 1.2, -0.25, 0], LB: [1.3, 1.5, 0.12, 0], ty: -0.3 }], [2, { sit: 'side', sx: -0.35, cx: -0.1, nx: 0.25, hz: -0.06, hA: 'n', B: [1.7, 0.6, 0.3, 1.7], LA: [1.5, 1.2, -0.25, 0], LB: [1.3, 1.5, 0.12, 0], ty: -0.6 }]], { chair: 'side' });
  add('lp2_monta2', 'lap', 'Onda montada', 4, [[0, RID({ cx: -0.3, sx: 0.15, nx: 0.15 })], [1.3, RID({ cx: 0.25, sx: -0.25, hx: -0.2 })], [2.6, RID({ sx: 0.25, hx: 0.3, nx: -0.2 })]], { chair: 'straddle' });   /* onda do corpo montada nele, do peito ao quadril */
  add('lp2_final', 'lap', 'Pose final no colo', 4, [[0, RID({ sx: 0.25, nx: -0.25, ty: 0.5, hdz: 0.2, hA: 's', hB: 'n' })], [2, RID({ sx: 0.3, nx: -0.3, ty: 0.35, hdz: 0.25, hA: 's', hB: 'n' })]], { chair: 'straddle' });

  /* ---- coreografias e onde elas entram ---- */
  DANCE_CHOREO.twerk2 = { n: 'Twerk até de manhã', bpm: 100, seq: [['tw2_sobedesce', 4], ['tw2_popback', 4], ['tw2_popduplo', 4], ['tw2_wobble', 4], ['tw2_zigue', 4], ['tw2_palma', 4], ['tw2_dobrada', 4], ['tw2_vibrasobe', 4], ['tw2_vibradesce', 4], ['tw2_quatro', 4], ['tw2_ajoelhada', 4], ['tw2_bracos', 4], ['tw2_isolado', 4], ['tw2_ombro', 4], ['tw2_sumo', 4]] };
  DANCE_CHOREO.lap2 = { n: 'Lap dance colada', bpm: 80, seq: [['lp2_volta', 4], ['lp2_peito', 4], ['lp2_cabelo', 4], ['lp2_monta', 8], ['lp2_rebola', 8], ['lp2_arco', 4], ['lp2_pescoco', 8], ['lp2_monta2', 4], ['lp2_final', 4]] };
  DANCE_CHOREO.lap3 = { n: 'Lap dance de costas', bpm: 80, seq: [['lp2_ajoelha', 4], ['lp2_desce', 4], ['lp2_twerkcolo', 8], ['lp2_encaixe', 8], ['lp2_quica', 8], ['lp2_lado', 8], ['lp2_monta', 4], ['lp2_final', 4]] };
  if (typeof DZ_SHOW !== 'undefined') DZ_SHOW.push('twerk2');
  if (typeof DZL_CHS !== 'undefined') DZL_CHS.push('lap2', 'lap3');
  if (typeof VL9_STEPS !== 'undefined') VL9_STEPS.push('tw2_wobble', 'tw2_zigue', 'tw2_popback', 'tw2_bracos', 'tw2_isolado', 'tw2_sumo');   /* os que dá para fazer em pé, no meio da pista */
  window.DZ_TW2_STAGE = ['tw2_sobedesce', 'tw2_popduplo', 'tw2_palma', 'tw2_dobrada', 'tw2_quatro', 'tw2_ajoelhada', 'tw2_ombro'];   /* passos de palco das moças que sobem para dançar */
})();
