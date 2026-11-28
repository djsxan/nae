/* Chair dance (28/11): 30 passos com a cadeira de veludo da dançarina, somados ao funk, twerk e lap dance.
   Vocabulário das aulas de chair dance: abrir e fechar as pernas, cruzar, onda sentada, jogada de cabelo, montada ao contrário no encosto,
   debruçada no encosto, pé no assento, joelho no assento, chute por cima, desce e senta, levanta em onda...
   Na pose: chx/chz = onde está a cadeira (no referencial dela, +z é a frente dela), chr = giro da cadeira (0: encosto atrás dela), csit = sentada. */
(function () {
  if (typeof DANCE === 'undefined') return;
  DANCE_STY.chair = { n: 'Chair Dance', bpm: 90 };
  const PI = Math.PI, add = (id, n, len, k, extra) => { DANCE[id] = Object.assign({ id, sty: 'chair', n, len, k, cprop: 1 }, extra || {}); };
  const SOFT = [0.22, 0.42, 0.1, 0.15], HALF = [0.8, 1.35, 0.36, 0.4], ST = [0.05, 0.1, 0.06, 0.12], AUP = [2.7, 0.3, 0, 0.35];
  const SL = (abd, out) => [1.5, 1.55, abd ?? 0.12, out ?? 0.1];   /* perna sentada: coxa na horizontal, canela na vertical */
  const SIT = o => Object.assign({ csit: 1, chz: -0.1, LA: SL(), LB: SL(), A: [0.3, 0.25, 0, 0.6], B: [0.3, 0.25, 0, 0.6] }, o);   /* sentada normal, cadeira atrás */
  const INV = o => Object.assign({ csit: 1, chz: -0.06, chr: PI, LA: SL(0.62, 0.2), LB: SL(0.62, 0.2), A: [1.25, 0.25, 0, 1.1], B: [1.25, 0.25, 0, 1.1] }, o);   /* montada ao contrário, de frente para o encosto */
  const FRONT = o => Object.assign({ chz: 0.48, chr: 0 }, o);   /* a cadeira à frente dela, com o encosto do lado dela */
  const M = P => { const o = Object.assign({}, P); for (const q of ['hy', 'hz', 'sy', 'sz', 'cy', 'cz', 'ny', 'nz', 'ty', 'hdz', 'chx']) if (o[q]) o[q] = -o[q]; [o.A, o.B] = [P.B, P.A]; [o.LA, o.LB] = [P.LB, P.LA]; [o.hA, o.hB] = [P.hB, P.hA]; return o; };

  /* ---------- sentada ---------- */
  add('ch_abre', 'Abre e fecha', 2, [[0, SIT({ h: 'k', fw: 0.15, LA: SL(0.05, -0.1), LB: SL(0.05, -0.1) })], [1, SIT({ h: 't', sx: -0.15, nx: 0.15, LA: SL(0.7, 0.35), LB: SL(0.7, 0.35) })]]);
  add('ch_cruza', 'Cruza as pernas', 4, [[0, SIT({ hA: 'k', B: [0.4, 0.3, 0, 0.9], LA: [1.75, 1.45, -0.32, -0.1], LB: SL(0.05) })], [2, SIT({ hB: 'k', A: [0.4, 0.3, 0, 0.9], LA: SL(0.05), LB: [1.75, 1.45, -0.32, -0.1] })]]);
  add('ch_onda', 'Onda sentada', 4, [[0, SIT({ cx: -0.3, nx: 0.2, A: [2.4, 0.35, 0, 0.6], B: [2.4, 0.35, 0, 0.6] })], [1.3, SIT({ cx: 0.3, sx: -0.25, h: 't' })], [2.6, SIT({ sx: 0.3, hx: 0.25, nx: -0.25, h: 'k' })]]);
  add('ch_cabelo', 'Jogada de cabelo sentada', 2, [[0, SIT({ fw: 0.7, nx: 0.5, h: 'k', LA: SL(0.45, 0.3), LB: SL(0.45, 0.3) })], [1, SIT({ fw: -0.25, nx: -0.6, hdz: 0.3, hA: 'n', hB: 't', LA: SL(0.45, 0.3), LB: SL(0.45, 0.3) })]]);
  add('ch_inclina', 'Inclinada para a frente', 4, [[0, SIT({ fw: 0.85, nx: -0.6, h: 'k', LA: SL(0.5, 0.3), LB: SL(0.5, 0.3) })], [2, SIT({ fw: 0.65, nx: -0.75, hdz: 0.2, hz: 0.12, h: 'k', LA: SL(0.6, 0.35), LB: SL(0.6, 0.35) })]]);
  add('ch_rebola', 'Rebolado na cadeira', 4, [[0, SIT({ hz: 0.2, hy: 0.12, h: 't' })], [1, SIT({ hx: 0.22, h: 't' })], [2, SIT({ hz: -0.2, hy: -0.12, h: 't' })], [3, SIT({ hx: -0.2, h: 't' })]], { lin: 1 });
  add('ch_perna', 'Perna para o alto', 4, [[0, SIT({ sx: -0.2, A: [1.3, 0.2, 0, 0.3], hB: 't', LA: [2.6, 0.15, 0.1, 0.1] })], [2, SIT({ sx: -0.25, nx: 0.2, A: [1.1, 0.25, 0, 0.3], hB: 't', LA: [2.2, 0.25, 0.4, 0.3] })]]);
  add('ch_maos', 'Mãos subindo nas coxas', 4, [[0, SIT({ fw: 0.4, h: 'k', LA: SL(0.4, 0.3), LB: SL(0.4, 0.3) })], [2, SIT({ fw: 0.1, h: 't', nx: -0.1, LA: SL(0.5, 0.3), LB: SL(0.5, 0.3) })], [3, SIT({ cx: -0.2, h: 'w', nx: 0.2, LA: SL(0.3, 0.2), LB: SL(0.3, 0.2) })]]);
  add('ch_ombro', 'Ombrinho sentada', 2, [[0, SIT({ cy: 0.35, ty: 0.25, A: [0.6, 0.3, 0, 1.4], B: [0.15, 0.25, 0, 1.0] })], [1, SIT({ cy: -0.35, ty: -0.25, A: [0.15, 0.25, 0, 1.0], B: [0.6, 0.3, 0, 1.4] })]]);
  add('ch_recosta', 'Recostada', 4, [[0, SIT({ sx: -0.35, cx: -0.15, nx: 0.3, A: AUP, B: AUP, LA: [1.3, 1.1, 0.15, 0.1], LB: [1.3, 1.1, 0.15, 0.1] })], [2, SIT({ sx: -0.3, nx: 0.35, hdz: 0.2, hA: 'n', hB: 'n', LA: [1.6, 1.2, -0.2, -0.1], LB: SL() })]]);
  add('ch_abertura', 'Abertura sentada', 2, [[0, SIT({ fw: 0.45, nx: -0.3, h: 'k', LA: SL(0.85, 0.5), LB: SL(0.85, 0.5) })], [1, SIT({ fw: 0.25, nx: -0.1, hx: -0.15, h: 'k', LA: SL(0.95, 0.55), LB: SL(0.95, 0.55) })]]);
  add('ch_peito', 'Peito à frente', 1, [[0, SIT({ cx: 0.3, sx: -0.1, A: [0.2, 0.4, 0, 0.5], B: [0.2, 0.4, 0, 0.5] })], [0.5, SIT({ cx: -0.15, sx: 0.05, A: [0.25, 0.3, 0, 0.7], B: [0.25, 0.3, 0, 0.7] })]]);
  add('ch_ombrolado', 'Olhar por cima do ombro', 4, [[0, SIT({ rot: PI, sx: 0.1, ty: 1.0, nz: 0.25, hA: 'n', hB: 'k', LA: SL(0.3), LB: SL(0.3) })], [2, SIT({ rot: PI, sx: 0.2, hz: 0.15, ty: 0.85, nz: 0.2, hA: 'n', hB: 'k', LA: SL(0.5, 0.3), LB: SL(0.5, 0.3) })]]);   /* sentada de costas para a plateia, olhando para trás */

  /* ---------- montada ao contrário ---------- */
  add('ch_invertida', 'Montada ao contrário', 4, [[0, INV({ hx: 0.25, hz: 0.12 })], [1, INV({ hx: -0.2 })], [2, INV({ hx: 0.25, hz: -0.12 })], [3, INV({ hx: -0.2 })]]);
  add('ch_encosto', 'Abraçada ao encosto', 4, [[0, INV({ fw: 0.3, A: [1.5, -0.3, 0, 1.7], B: [1.5, -0.3, 0, 1.7], ty: 0.5, nx: -0.1 })], [2, INV({ fw: 0.35, A: [1.5, -0.3, 0, 1.7], B: [1.5, -0.3, 0, 1.7], ty: -0.5, hdz: 0.15 })]]);
  add('ch_arqueia', 'Arqueia no encosto', 4, [[0, INV({ fw: 0.2 })], [2, INV({ sx: -0.55, cx: -0.3, nx: 0.55, A: [1.3, 0.2, 0, 0.1], B: [1.3, 0.2, 0, 0.1] })], [3, INV({ sx: 0.2, nx: -0.2 })]]);
  add('ch_quica', 'Quica montada', 1, [[0, INV({ hx: 0.35, fw: 0.15 })], [0.5, INV({ hx: -0.05, LA: [1.35, 1.4, 0.62, 0.2], LB: [1.35, 1.4, 0.62, 0.2] })]], { lin: 1 });

  /* ---------- em pé, com a cadeira ---------- */
  add('ch_lado', 'Passo ao lado da cadeira', 4, [[0, { chx: -0.42, chz: 0.05, chr: PI / 2, hz: 0.2, A: [1.0, 0.35, 0, 0.6], B: [0.4, 0.3, 0, 0.9], LA: [0.2, 0.3, 0.38, 0.35], LB: SOFT }], [1, { chx: -0.42, chz: 0.05, chr: PI / 2, A: [1.0, 0.35, 0, 0.6], B: [0.4, 0.3, 0, 0.9], LA: SOFT, LB: SOFT }], [2, { chx: -0.42, chz: 0.05, chr: PI / 2, hz: -0.2, A: [1.0, 0.35, 0, 0.6], hB: 'w', LA: SOFT, LB: [0.2, 0.3, 0.38, 0.35] }], [3, { chx: -0.42, chz: 0.05, chr: PI / 2, A: [1.0, 0.35, 0, 0.6], B: [0.4, 0.3, 0, 0.9], LA: SOFT, LB: SOFT }]]);   /* mão no encosto, passos de lado rebolando */
  add('ch_pe', 'Pé no assento', 4, [[0, FRONT({ chr: PI, chz: 0.42, cx: -0.25, hA: 't', B: [2.3, 0.4, 0, 0.6], LA: [1.25, 1.6, 0.1, 0.1], LB: ST })], [2, FRONT({ chr: PI, chz: 0.42, fw: 0.35, cx: 0.2, sx: -0.15, h: 'k', LA: [1.35, 1.75, 0.15, 0.1], LB: SOFT })]]);   /* um pé em cima do assento, onda do corpo */
  add('ch_debruca', 'Debruçada no encosto', 1, [[0, FRONT({ fw: 0.85, nx: -0.6, hx: 0.42, A: [1.3, 0.35, 0, 0.3], B: [1.3, 0.35, 0, 0.3], LA: [0.7, 1.1, 0.34, 0.4], LB: [0.7, 1.1, 0.34, 0.4] })], [0.5, FRONT({ fw: 0.8, nx: -0.6, hx: -0.15, A: [1.3, 0.35, 0, 0.3], B: [1.3, 0.35, 0, 0.3], LA: [0.6, 0.9, 0.34, 0.4], LB: [0.6, 0.9, 0.34, 0.4] })]]);   /* atrás da cadeira, braços no encosto, twerk */
  add('ch_twerk', 'Twerk com as mãos no assento', 1, [[0, FRONT({ chr: PI, chz: 0.55, fw: 1.15, nx: -0.8, hx: 0.42, A: [1.55, 0.25, 0, 0.15], B: [1.55, 0.25, 0, 0.15], LA: [0.55, 0.6, 0.32, 0.35], LB: [0.55, 0.6, 0.32, 0.35] })], [0.5, FRONT({ chr: PI, chz: 0.55, fw: 1.1, nx: -0.8, hx: -0.12, A: [1.55, 0.25, 0, 0.15], B: [1.55, 0.25, 0, 0.15], LA: [0.5, 0.5, 0.32, 0.35], LB: [0.5, 0.5, 0.32, 0.35] })]]);
  add('ch_agacha', 'Mãos no encosto, agacha', 2, [[0, FRONT({ fw: 0.2, A: [1.35, 0.3, 0, 0.6], B: [1.35, 0.3, 0, 0.6], LA: SOFT, LB: SOFT })], [1, FRONT({ fw: 0.35, hx: 0.35, A: [0.9, 0.3, 0, 0.3], B: [0.9, 0.3, 0, 0.3], LA: [1.2, 2.0, 0.45, 0.5], LB: [1.2, 2.0, 0.45, 0.5] })]]);
  add('ch_joelho', 'Joelho no assento', 4, [[0, { chx: -0.32, chz: 0.12, chr: PI / 2, fw: 0.1, cx: -0.25, A: [1.05, 0.3, 0, 0.5], hB: 'n', LA: [1.35, 1.95, 0.2, 0.1], LB: ST }], [2, { chx: -0.32, chz: 0.12, chr: PI / 2, fw: 0.3, cx: 0.25, sx: -0.2, hx: 0.25, A: [1.05, 0.3, 0, 0.5], hB: 't', LA: [1.35, 1.95, 0.2, 0.1], LB: SOFT }]]);   /* um joelho em cima do assento, ondulando */

  /* ---------- passagens: senta, levanta, chuta ---------- */
  add('ch_desliza', 'Desce e senta', 4, [[0, { chz: -0.1, hA: 'n', hB: 'w', LA: SOFT, LB: SOFT, hz: 0.2 }], [1.5, { chz: -0.1, fw: 0.35, hx: 0.35, h: 'k', LA: [1.1, 1.8, 0.4, 0.4], LB: [1.1, 1.8, 0.4, 0.4], hz: -0.15 }], [3, SIT({ sx: -0.15, h: 't', LA: SL(0.5, 0.3), LB: SL(0.5, 0.3) })]]);
  add('ch_levanta', 'Levanta em onda', 4, [[0, SIT({ fw: 0.5, h: 'k', LA: SL(0.4, 0.3), LB: SL(0.4, 0.3) })], [1.5, { chz: -0.1, fw: 0.45, hx: 0.4, h: 't', LA: [0.9, 1.5, 0.3, 0.3], LB: [0.9, 1.5, 0.3, 0.3] }], [3, { chz: -0.1, cx: 0.3, sx: -0.25, hx: -0.25, hA: 'n', hB: 'w', LA: SOFT, LB: SOFT }]]);
  add('ch_chute', 'Chute por cima', 4, [[0, SIT({ h: 't', LA: SL(0.1), LB: SL(0.1) })], [1, SIT({ sx: -0.3, A: [1.2, 0.5, 0, 0.3], B: [1.2, 0.5, 0, 0.3], LA: [2.5, 0.2, 0.1, 0.1], LB: SL(0.1) })], [2, SIT({ sx: -0.3, A: [1.2, 0.5, 0, 0.3], B: [1.2, 0.5, 0, 0.3], LA: [2.4, 0.2, 0.9, 0.4], LB: SL(0.1) })], [3, SIT({ h: 't', LA: [1.75, 1.45, -0.32, -0.1], LB: SL(0.05) })]]);   /* a perna sobe esticada, passa por cima em arco e cai cruzada */
  add('ch_sentaquica', 'Senta e levanta no tempo', 2, [[0, SIT({ h: 't', LA: SL(0.4, 0.3), LB: SL(0.4, 0.3) })], [0.5, { chz: -0.1, fw: 0.4, hx: 0.3, h: 't', LA: [1.0, 1.6, 0.35, 0.35], LB: [1.0, 1.6, 0.35, 0.35] }], [1, SIT({ h: 't', hz: 0.15, LA: SL(0.4, 0.3), LB: SL(0.4, 0.3) })], [1.5, { chz: -0.1, fw: 0.4, hx: 0.3, h: 't', LA: [1.0, 1.6, 0.35, 0.35], LB: [1.0, 1.6, 0.35, 0.35] }]]);
  add('ch_giro', 'Meia-volta para sentar de lado', 4, [[0, { chx: 0.35, chz: 0, chr: -PI / 2, hA: 'n', B: AUP, LA: SOFT, LB: SOFT }], [2, { chx: 0.2, chz: -0.05, chr: -PI / 2, fw: 0.3, hx: 0.3, h: 't', LA: [1.0, 1.6, 0.3, 0.3], LB: [1.0, 1.6, 0.3, 0.3] }], [3, SIT({ chx: 0.05, chz: -0.06, chr: -PI / 2, sz: 0.15, hA: 'n', hB: 't', LA: [1.5, 1.4, 0.35, 0.3], LB: [1.45, 1.55, 0.2, 0.2] })]]);
  add('ch_ladosente', 'Sentada de lado', 4, [[0, SIT({ chr: -PI / 2, chx: 0.05, sz: 0.15, nz: 0.15, hA: 'n', hB: 't', LA: [1.5, 1.4, 0.35, 0.3], LB: [1.45, 1.55, 0.2, 0.2] })], [2, SIT({ chr: -PI / 2, chx: 0.05, sz: -0.05, sx: -0.2, nx: 0.3, A: AUP, hB: 't', LA: [1.55, 1.3, 0.4, 0.3], LB: [1.45, 1.6, 0.2, 0.2] })]]);
  add('ch_pose', 'Pose final na cadeira', 4, [[0, SIT({ sx: -0.15, hdz: 0.2, A: AUP, hB: 'k', LA: [1.75, 1.45, -0.32, -0.1], LB: SL(0.05) })], [2, SIT({ sx: -0.2, hdz: 0.25, nx: 0.15, hA: 'n', hB: 'k', LA: [1.75, 1.45, -0.32, -0.1], LB: SL(0.05) })]]);

  /* ---------- coreografias (show do palco) ---------- */
  DANCE_CHOREO.chair1 = { n: 'Chair dance: a cadeira', bpm: 90, seq: [['ch_lado', 4], ['ch_desliza', 4], ['ch_abre', 4], ['ch_cruza', 8], ['ch_onda', 4], ['ch_cabelo', 4], ['ch_inclina', 4], ['ch_rebola', 8], ['ch_maos', 4], ['ch_perna', 4], ['ch_levanta', 4], ['ch_pose', 4]] };
  DANCE_CHOREO.chair2 = { n: 'Chair dance: montada', bpm: 90, seq: [['ch_giro', 4], ['ch_ladosente', 4], ['ch_ombro', 4], ['ch_peito', 4], ['ch_recosta', 4], ['ch_invertida', 8], ['ch_encosto', 4], ['ch_arqueia', 4], ['ch_quica', 4], ['ch_ombrolado', 4], ['ch_chute', 4], ['ch_pose', 4]] };
  DANCE_CHOREO.chair3 = { n: 'Chair dance: em volta', bpm: 90, seq: [['ch_debruca', 4], ['ch_agacha', 4], ['ch_twerk', 4], ['ch_pe', 4], ['ch_joelho', 4], ['ch_desliza', 4], ['ch_abertura', 4], ['ch_sentaquica', 4], ['ch_rebola', 4], ['ch_levanta', 4], ['ch_lado', 4], ['ch_pose', 4]] };
  if (typeof DZ_SHOW !== 'undefined') DZ_SHOW.push('chair1', 'chair2', 'chair3');

  /* ---------- a cadeira: madeira escura, assento e encosto de veludo vinho, frisos dourados ---------- */
  const CH_GEO = new Map();
  function chairMesh(seat) { const k = Math.round(seat * 50); if (CH_GEO.has(k)) return CH_GEO.get(k).clone();
    const g = new THREE.Group(), wd = mat('#3a2216', 'wood'), vel = mat('#6a1424', 'cloth'), gd = mat('#c9a24a', 'gold'), S = k / 50;
    for (const [x, z] of [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]]) g.add(mesh(cylG(0.018, 0.014, S, 6), wd, x, S / 2, z));
    g.add(mesh(boxG(0.42, 0.04, 0.42), wd, 0, S, 0)); g.add(mesh(boxG(0.38, 0.05, 0.38), vel, 0, S + 0.04, 0));
    for (const x of [-0.18, 0.18]) g.add(mesh(cylG(0.016, 0.016, 0.5, 6), wd, x, S + 0.27, -0.19));
    g.add(mesh(boxG(0.4, 0.05, 0.03), wd, 0, S + 0.52, -0.19)); g.add(mesh(boxG(0.32, 0.3, 0.025), vel, 0, S + 0.3, -0.19)); g.add(mesh(boxG(0.42, 0.012, 0.035), gd, 0, S + 0.555, -0.19));
    CH_GEO.set(k, g); return g.clone(); }
  window.dzChairAdd = function (R, Q) {
    const V = new THREE.Vector3(); R.root.position.set(0, 0, 0); R.root.updateMatrixWorld(true);
    let minY = Infinity; for (const f of [R.LA.ft, R.LB.ft]) { f.getWorldPosition(V); minY = Math.min(minY, V.y); } for (const k of [R.LA.kn, R.LB.kn]) { k.getWorldPosition(V); minY = Math.min(minY, V.y - 0.05); }
    const floor = minY - 0.035; R.hips.getWorldPosition(V); const seat = Q.csit ? Math.max(0.34, Math.min(0.56, V.y - floor - 0.1)) : 0.46;
    const g = chairMesh(seat); g.position.set(Q.chx || 0, floor, Q.chz || 0); g.rotation.y = Q.chr || 0; R.root.add(g); return g; };
})();
