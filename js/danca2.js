/* Danças novas (28/11): 15 passos de baile funk, metade passinho (sabará, cruzado, puxada, laço, volante, desliza, bate-bate, mole)
   e metade rebolado (mão no joelho, empina, kikada, desce até o chão, créu nas 5 velocidades, sentadinha, tremida de costas).
   Todos no relógio de 130 batidas e encadeados na coreografia "Baile da Madrugada". */
(function () {
  if (typeof DANCE === 'undefined') return;
  const PI = Math.PI, add = (id, n, len, k, extra) => { DANCE[id] = Object.assign({ id, sty: 'funk', n, len, k }, extra || {}); };
  const ST = [0.05, 0.1, 0.06, 0.12], SOFT = [0.22, 0.42, 0.1, 0.15], HALF = [0.8, 1.35, 0.36, 0.4], SQ = [1.15, 1.95, 0.42, 0.45];
  const AUP = [2.7, 0.3, 0, 0.35], AL = [0.15, 0.2, 0, 0.3], AFLOW = [0.9, 0.5, 0, 1.2];
  const M = P => { const o = Object.assign({}, P); for (const q of ['hy', 'hz', 'sy', 'sz', 'cy', 'cz', 'ny', 'nz', 'ty', 'hdz']) if (o[q]) o[q] = -o[q]; [o.A, o.B] = [P.B, P.A]; [o.LA, o.LB] = [P.LB, P.LA]; [o.hA, o.hB] = [P.hB, P.hA]; return o; };   /* o mesmo tempo, do outro lado */

  /* ---------- PASSINHO ---------- */
  { const a = { hy: 0.28, hz: -0.08, cy: -0.2, A: [0.7, 1.05, 0, 0.5], B: [0.25, 0.7, 0, 0.9], LA: [0.42, 0.35, -0.14, -0.05], LB: [-0.28, 0.45, 0.08, 0.2] }, b = { hy: 0.05, A: [0.4, 0.6, 0, 0.9], B: [0.4, 0.6, 0, 0.9], LA: SOFT, LB: SOFT };
    add('fk_cruzado', 'Cruzado', 2, [[0, a], [0.5, b], [1, M(a)], [1.5, b]]); }   /* um pé cruza à frente, o outro desliza para trás, braços abertos (herança do frevo) */
  { const k = (s, up) => ({ fw: 0.25, nx: -0.1, hz: 0.14 * s, hy: -0.12 * s, A: s > 0 ? [0.7, 0.35, 0, 1.3] : [-0.25, 0.3, 0, 0.6], B: s > 0 ? [-0.25, 0.3, 0, 0.6] : [0.7, 0.35, 0, 1.3], LA: s > 0 ? (up ? [0.45, 0.55, 0.45, 0.3] : SOFT) : [0.4, 0.7, 0.12, 0.2], LB: s > 0 ? [0.4, 0.7, 0.12, 0.2] : (up ? [0.45, 0.55, 0.45, 0.3] : SOFT) });
    add('fk_romano', 'Passinho do Romano', 4, [[0, k(1, 0)], [0.5, k(1, 1)], [1, k(1, 0)], [1.5, k(-1, 0)], [2, k(-1, 0)], [2.5, k(-1, 1)], [3, k(-1, 0)], [3.5, k(1, 0)]]); }   /* sabará quicado, a perna livre chuta para o lado, braços em pêndulo (o jeito da Vila Romano) */
  { const a = { hz: 0.1, A: [1.45, 0.55, 0, 0.1], B: [1.2, -0.25, 0, 2.1], LA: [0.95, 1.3, 0.08, 0.1], LB: SOFT }, b = { hx: -0.22, cy: 0.25, A: [1.05, -0.3, 0, 2.2], B: [1.1, -0.2, 0, 2.0], LA: SOFT, LB: [0.3, 0.5, 0.1, 0.15] };
    add('fk_puxada', 'Puxada', 2, [[0, a], [0.5, b], [1, M(a)], [1.5, M(b)]]); }   /* estica o braço, puxa a corda para o peito com o joelho subindo (passinho dos maloka) */
  add('fk_laco', 'Laço', 4, [   /* gira o braço por cima da cabeça como quem roda um laço, quadril em círculo, a outra mão na cintura */
    [0, { hz: 0.22, hy: 0.12, A: [2.75, 0.3, 0, 0.4], hB: 'w', LA: SOFT, LB: [0.32, 0.55, 0.1, 0.15] }], [1, { hx: 0.22, A: [2.55, 0.9, 0.9, 0.55], hB: 'w', LA: [0.3, 0.5, 0.1, 0.15], LB: [0.3, 0.5, 0.1, 0.15] }],
    [2, { hz: -0.22, hy: -0.12, A: [2.65, 0.15, 1.8, 0.4], hB: 'w', LA: [0.32, 0.55, 0.1, 0.15], LB: SOFT }], [3, { hx: -0.18, A: [2.5, -0.3, 2.6, 0.55], hB: 'w', LA: [0.26, 0.45, 0.1, 0.15], LB: [0.26, 0.45, 0.1, 0.15] }]], { lin: 1 });
  { const w = (s, low) => ({ fw: 0.15, sz: 0.28 * s, cy: 0.12 * s, ty: 0.15 * s, A: [1.35 - 0.25 * s, 0.25, 0, 1.45], B: [1.35 + 0.25 * s, 0.25, 0, 1.45], LA: low ? HALF : SOFT, LB: low ? SOFT : HALF });
    add('fk_volante', 'Volante', 2, [[0, w(1, 1)], [0.5, w(1, 0)], [1, w(-1, 0)], [1.5, w(-1, 1)]]); }   /* as mãos num volante imaginário, o tronco vira junto e os joelhos quicam (passinho do volante) */
  { const a = { hz: 0.24, hy: 0.1, A: AFLOW, B: [0.5, 1.1, 0, 0.5], LA: [0.2, 0.3, 0.42, 0.35], LB: [0.4, 0.7, 0.05, 0.15], ty: -0.25 }, b = { hz: 0.05, A: [0.6, 0.7, 0, 0.8], B: [0.6, 0.7, 0, 0.8], LA: SOFT, LB: SOFT };
    add('fk_desliza', 'Desliza', 4, [[0, a], [1, b], [2, M(a)], [3, b]]); }   /* desliza de lado no chão liso, braços fluindo como onda */
  { const i = { fw: 0.22, A: [1.15, -0.18, 0, 1.6], B: [1.15, -0.18, 0, 1.6], LA: [0.45, 0.85, -0.05, -0.25], LB: [0.45, 0.85, -0.05, -0.25] }, o = { fw: 0.18, hx: 0.1, A: [0.9, 0.55, 0, 0.9], B: [0.9, 0.55, 0, 0.9], LA: [0.4, 0.75, 0.38, 0.45], LB: [0.4, 0.75, 0.38, 0.45] };
    add('fk_batebate', 'Bate-bate', 1, [[0, i], [0.5, o]], { lin: 1 }); }   /* joelhos batendo um no outro e as mãos batendo palma no mesmo tempo */
  add('fk_mole', 'Mole', 2, [   /* corpo solto como boneco de pano: o tronco ondula, braços largados, cabeça balança */
    [0, { sx: 0.18, sz: 0.2, nx: 0.25, hdz: 0.2, hz: -0.1, A: [0.2, 0.15, 0, 0.2], B: [0.5, 0.35, 0, 1.4], LA: SOFT, LB: [0.4, 0.75, 0.1, 0.15] }], [0.5, { sx: -0.1, sz: 0, nx: -0.15, A: [0.35, 0.4, 0, 0.9], B: [0.35, 0.4, 0, 0.9], LA: [0.35, 0.6, 0.1, 0.15], LB: [0.35, 0.6, 0.1, 0.15] }],
    [1, { sx: 0.18, sz: -0.2, nx: 0.25, hdz: -0.2, hz: 0.1, A: [0.5, 0.35, 0, 1.4], B: [0.2, 0.15, 0, 0.2], LA: [0.4, 0.75, 0.1, 0.15], LB: SOFT }], [1.5, { sx: -0.1, sz: 0, nx: -0.15, A: [0.35, 0.4, 0, 0.9], B: [0.35, 0.4, 0, 0.9], LA: [0.35, 0.6, 0.1, 0.15], LB: [0.35, 0.6, 0.1, 0.15] }]]);

  /* ---------- REBOLADO ---------- */
  add('fk_maojoelho', 'Mão no joelho', 2, [   /* mãos nos joelhos e a baixadinha: desce empinando, sobe, rebola de lado */
    [0, { fw: 0.62, nx: -0.45, hx: 0.38, hz: 0.12, h: 'k', LA: [1.05, 1.75, 0.4, 0.45], LB: [1.05, 1.75, 0.4, 0.45] }], [0.5, { fw: 0.5, nx: -0.35, hx: 0.05, h: 'k', LA: HALF, LB: HALF }],
    [1, { fw: 0.62, nx: -0.45, hx: 0.38, hz: -0.12, h: 'k', LA: [1.05, 1.75, 0.4, 0.45], LB: [1.05, 1.75, 0.4, 0.45] }], [1.5, { fw: 0.5, nx: -0.35, hx: 0.05, h: 'k', LA: HALF, LB: HALF }]]);
  add('fk_empina', 'Empina e desempina', 1, [[0, { fw: 0.48, nx: -0.3, hx: 0.48, h: 't', LA: HALF, LB: HALF }], [0.5, { fw: 0.38, nx: -0.25, hx: -0.28, h: 't', LA: [0.7, 1.15, 0.36, 0.4], LB: [0.7, 1.15, 0.36, 0.4] }]]);   /* a base do quadradinho */
  add('fk_kikada', 'Kikada', 1, [   /* agachada, quica no tempo: desce fundo e sobe metade, um braço para o alto */
    [0, { fw: 0.45, nx: -0.3, hx: 0.32, hA: 'k', B: AUP, LA: SQ, LB: SQ }], [0.5, { fw: 0.35, nx: -0.2, hx: -0.05, hA: 'k', B: [2.45, 0.5, 0, 0.6], LA: [0.75, 1.25, 0.4, 0.42], LB: [0.75, 1.25, 0.4, 0.42] }]], { lin: 1 });
  add('fk_desce', 'Desce até o chão', 8, [   /* desce rebolando em 4 tempos até o chão, roda o quadril lá embaixo e sobe com o corpo em onda */
    [0, { hz: 0.22, A: AUP, B: [2.5, 0.45, 0, 0.5], LA: SOFT, LB: SOFT }], [1, { hz: -0.22, fw: 0.15, A: [2.2, 0.5, 0, 0.8], hB: 't', LA: [0.5, 0.85, 0.2, 0.3], LB: [0.5, 0.85, 0.2, 0.3] }],
    [2, { hz: 0.22, fw: 0.25, hx: 0.15, hA: 'k', B: [1.6, 0.6, 0, 1.0], LA: HALF, LB: HALF }], [3, { hz: -0.22, fw: 0.35, hx: 0.25, h: 'k', LA: [1.05, 1.75, 0.42, 0.45], LB: [1.05, 1.75, 0.42, 0.45] }],
    [4, { fw: 0.4, hx: 0.35, hz: 0.25, h: 'k', LA: [1.3, 2.2, 0.45, 0.5], LB: [1.3, 2.2, 0.45, 0.5] }], [5, { fw: 0.4, hx: -0.15, hz: -0.25, h: 'k', LA: [1.3, 2.2, 0.45, 0.5], LB: [1.3, 2.2, 0.45, 0.5] }],
    [6, { fw: 0.3, cx: 0.25, sx: -0.2, hx: 0.3, h: 't', LA: HALF, LB: HALF }], [7, { cx: -0.25, sx: 0.2, hx: -0.2, hA: 'n', hB: 'w', LA: SOFT, LB: SOFT }]]);
  { const K = [], up = { fw: 0.28, hx: 0.36, h: 'w', LA: [0.5, 0.9, 0.3, 0.35], LB: [0.5, 0.9, 0.3, 0.35] }, dn = { fw: 0.22, hx: -0.32, h: 'w', LA: [0.4, 0.7, 0.3, 0.35], LB: [0.4, 0.7, 0.3, 0.35] };
    let t = 0; for (const [n, per] of [[1, 2], [2, 2], [3, 1.6], [4, 1.2], [5, 1.2]]) { const step = 1 / (n * 0.8 + 0.2); for (let q = 0; q < per / step; q++) { K.push([t, up]); K.push([t + step / 2, dn]); t += step; } }
    const sc = 8 / t; add('fk_creu', 'Créu nas 5 velocidades', 8, K.map(([tt, P]) => [tt * sc, P]), { lin: 1 }); }   /* o vaivém do quadril acelerando de velocidade em velocidade */
  { const s = (d, hand) => ({ fw: 0.38, nx: -0.2, hx: 0.42, hz: 0.18 * d, hA: 'k', B: hand ? [2.2, 0.6, 0, 1.6] : [1.2, 0.5, 0, 1.2], hB: hand ? 'n' : null, LA: [1.3, 1.6, 0.28, 0.3], LB: [1.3, 1.6, 0.28, 0.3] }), u = { fw: 0.25, hx: 0.05, hA: 'k', B: [1.0, 0.5, 0, 1.0], LA: [0.65, 1.0, 0.25, 0.3], LB: [0.65, 1.0, 0.25, 0.3] };
    add('fk_sentadinha', 'Sentadinha', 2, [[0, s(1, 1)], [0.5, u], [1, s(-1, 0)], [1.5, u]]); }   /* senta no ar, quadril cai de lado, levanta e senta de novo */
  { const a = { rot: PI, fw: 0.55, nx: -0.3, ty: 0.95, nz: 0.2, hx: 0.42, h: 'k', LA: [0.95, 1.55, 0.36, 0.42], LB: [0.95, 1.55, 0.36, 0.42] }, b = Object.assign({}, a, { hx: -0.08, LA: [0.85, 1.4, 0.36, 0.42], LB: [0.85, 1.4, 0.36, 0.42] });
    add('fk_costas', 'Tremida de costas', 2, [[0, a], [0.25, b], [0.5, a], [0.75, b], [1, Object.assign({}, a, { ty: -0.95, nz: -0.2 })], [1.25, Object.assign({}, b, { ty: -0.95, nz: -0.2 })], [1.5, Object.assign({}, a, { ty: -0.95, nz: -0.2 })], [1.75, Object.assign({}, b, { ty: -0.95, nz: -0.2 })]], { lin: 1 }); }   /* de costas, olhando por cima do ombro, o quadril tremendo */

  /* ---------- a sequência e onde elas dançam ---------- */
  DANCE_CHOREO.baile2 = { n: 'Baile da Madrugada', bpm: 130, seq: [['fk_cruzado', 4], ['fk_romano', 8], ['fk_puxada', 4], ['fk_laco', 4], ['fk_volante', 4], ['fk_desliza', 8], ['fk_batebate', 4], ['fk_mole', 4], ['fk_maojoelho', 4], ['fk_empina', 4], ['fk_kikada', 4], ['fk_desce', 8], ['fk_creu', 8], ['fk_sentadinha', 4], ['fk_costas', 4]] };
  DANCE_CHOREO.passinho2 = { n: 'Roda de passinho', bpm: 130, seq: [['fk_passinho', 4], ['fk_cruzado', 4], ['fk_romano', 8], ['fk_puxada', 4], ['fk_laco', 4], ['fk_volante', 4], ['fk_desliza', 4], ['fk_batebate', 4], ['fk_mole', 4]] };
  DANCE_CHOREO.rebola2 = { n: 'Até o chão', bpm: 130, seq: [['fk_rebolado', 4], ['fk_maojoelho', 4], ['fk_empina', 4], ['fk_quadradinho', 8], ['fk_kikada', 4], ['fk_desce', 8], ['fk_sentadinha', 4], ['fk_creu', 8], ['fk_costas', 4]] };
  if (typeof DZ_SHOW !== 'undefined' && Array.isArray(DZ_SHOW)) DZ_SHOW.push('baile2', 'rebola2');
  if (typeof VL9_STEPS !== 'undefined') VL9_STEPS.push('fk_cruzado', 'fk_romano', 'fk_puxada', 'fk_laco', 'fk_volante', 'fk_desliza', 'fk_batebate', 'fk_mole', 'fk_maojoelho', 'fk_empina', 'fk_kikada', 'fk_sentadinha');
  if (typeof L15D !== 'undefined' && L15D.side) Object.assign(L15D.side, { fk_desliza: 2, fk_cruzado: 1, fk_romano: 1 });   /* passos que andam de lado na pista */
})();
