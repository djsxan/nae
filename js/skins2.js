/* Skins novas (28/11): 5 por vocação, inspiradas no clima de Game of Thrones, Senhor dos Anéis e Harry Potter (desenhos próprios do jogo).
   Obtenção mista: 2 livres no criador, 1 no nível 15, 1 no nível 30 e 1 comprada com ouro na Alfaiataria Real. */
const SKINS2 = {
  knight: [
    { id: 'vigia', name: 'Irmão da Vigília Negra', rarity: 'Comum', lv: 1, ref: 'a irmandade de negro que guarda a grande muralha do norte' },
    { id: 'planicie', name: 'Cavaleiro das Planícies Verdes', rarity: 'Comum', lv: 1, ref: 'os cavaleiros dos campos de cavalos, crina branca no elmo e escudo redondo' },
    { id: 'norte', name: 'Lobo do Inverno', rarity: 'Rara', lv: 15, ref: 'os senhores do norte gelado: aço escuro, manto de pele e escudo de madeira' },
    { id: 'cidadela', name: 'Sentinela da Cidadela Alva', rarity: 'Rara', lv: 30, ref: 'a guarda da cidade de pedra branca: aço negro, árvore branca no peito e elmo alado' },
    { id: 'branca', name: 'Guarda Alva do Trono', rarity: 'Lendária', lv: 1, price: 6000, ref: 'a guarda pessoal do rei, toda de branco esmaltado e ouro' },
  ],
  archer: [
    { id: 'andarilho', name: 'Andarilho das Terras Ermas', rarity: 'Comum', lv: 1, ref: 'os guardiões errantes de capuz verde-escuro e barba por fazer' },
    { id: 'selvagem', name: 'Caçadora Além da Muralha', rarity: 'Comum', lv: 1, ref: 'o povo livre do norte: peles, ossos, trança ruiva e arco rústico' },
    { id: 'sombria', name: 'Arqueiro da Mata Sombria', rarity: 'Rara', lv: 15, ref: 'os elfos da floresta escura: verde profundo, diadema de prata, cabelo negro' },
    { id: 'rubra', name: 'Lança-Sol do Deserto Rubro', rarity: 'Rara', lv: 30, ref: 'os príncipes do sul quente: sedas laranja e areia, véu e arco dourado' },
    { id: 'dourada', name: 'Guardião do Bosque Dourado', rarity: 'Lendária', lv: 1, price: 6000, ref: 'os elfos da floresta dourada: manto cinza-prata com broche de folha, cabelo platinado' },
  ],
  mage: [
    { id: 'escarlate', name: 'Aprendiz da Torre Escarlate', rarity: 'Comum', lv: 1, ref: 'a escola de magia: veste negra, cachecol vermelho e dourado, varinha' },
    { id: 'esmeralda', name: 'Aprendiz da Torre Esmeralda', rarity: 'Comum', lv: 1, ref: 'a escola de magia: veste negra, cachecol verde e prata, varinha' },
    { id: 'cinzento', name: 'Peregrino Cinzento', rarity: 'Rara', lv: 15, ref: 'o mago andarilho: manto cinza, chapéu pontudo de aba larga, barba longa e cajado' },
    { id: 'chama', name: 'Sacerdotisa da Chama Rubra', rarity: 'Rara', lv: 30, ref: 'a fé do deus do fogo: veste carmesim, gargantilha de rubi e cajado em brasa' },
    { id: 'alvo', name: 'Sábio Alvo', rarity: 'Lendária', lv: 1, price: 6000, ref: 'o chefe da ordem dos magos: tudo branco, cajado negro com cristal' },
  ],
};
const SKINS2_ON = typeof location === 'undefined' || !/[?&]skins=antigas/.test(location.search);
if (SKINS2_ON) { for (const cls in SKINS2) SKINS[cls].push(...SKINS2[cls]); SKIN_LVL.push(1, 1, 15, 30, 1); }   /* mesma ordem nas três vocações */
const SKIN_PRICE = id => { for (const c in SKINS) { const s = SKINS[c].find(q => q.id === id); if (s) return s.price || 0; } return 0; };

/* ---------- o visual de cada skin ---------- */
const _hl2 = heroLook;
heroLook = function (cls, skinId, accentHex) {
  const L = _hl2(cls, skinId, accentHex), SP = skinParts(skinId), k = SP.base, fem = SP.fem, T = tone;
  const set = o => Object.assign(L, o);
  switch (cls + ':' + k) {
    case 'knight:vigia': set({ armor: 'leather', body: T('#1c1b1d'), body2: T('#2a2422'), accent: T('#141314'), legs: T('#1e1c1e'), boots: T('#151212'), trim: T('#5a5650'), head: 'none', hair: T('#1a1410'), hairStyle: 'short', beard: T('#1a1410'), cape: true, capeTone: T('#121112'), fur: '#2a2624', weapon: 'sword', shield: null, pauldron: null }); break;
    case 'knight:planicie': set({ armor: 'plate', body: T('#8a8a80'), body2: T('#5a3a1e'), accent: T('#2e5a2a'), legs: T('#4a4030'), boots: T('#3a2a18'), trim: T('#c9a24a'), head: 'helm', headTone: T('#b0a890'), crest: 'horse', plume: T('#f0ece0'), hair: T('#d8b878'), hairStyle: 'braid', beard: T('#d8b878'), cape: true, capeTone: T('#2e5a2a'), weapon: 'spear', shield: 'round', shieldC: '#2e5a2a', shieldMark: 'sun', pattern: 'scales', pauldron: 'round' }); break;
    case 'knight:norte': set({ armor: 'plate', body: T('#5a5e66'), body2: T('#3a2c22'), accent: T('#c8ccd0'), legs: T('#3a3a40'), boots: T('#2a2018'), trim: T('#9aa0a8'), head: 'none', hair: T('#2a1c12'), hairStyle: 'long', beard: T('#2a1c12'), cape: true, capeTone: T('#3a3632'), fur: '#4a4038', weapon: 'sword', shield: 'round', shieldC: '#6a4a2a', shieldMark: 'wolf', pauldron: 'round' }); break;
    case 'knight:cidadela': set({ armor: 'plate', body: T('#26262c'), body2: T('#1a1a1e'), accent: T('#18181c'), legs: T('#2a2a30'), boots: T('#151518'), trim: T('#c8ccd4'), head: 'helm', headTone: T('#d0d4dc'), crest: 'wings', emblem: 'tree', cape: true, capeTone: T('#141418'), weapon: 'sword', shield: 'kite', shieldC: '#18181c', shieldMark: 'tree', pauldron: 'round' }); break;
    case 'knight:branca': set({ armor: 'plate', body: T('#ecebe4'), body2: T('#c8b890'), accent: T('#f4f2ea'), legs: T('#e2e0d8'), boots: T('#d8d4c8'), trim: T('#e2b74e'), head: 'greathelm', headTone: T('#efeee8'), plume: T('#ffffff'), cape: true, capeTone: T('#f6f4ee'), weapon: 'goldsword', shield: 'kite', shieldC: '#f4f2ea', pauldron: 'wing' }); break;
    case 'archer:andarilho': set({ armor: 'leather', body: T('#3a3a2c'), body2: T('#4a3420'), legs: T('#3a3428'), boots: T('#2a1e14'), head: 'hood', headTone: T('#26301f'), hair: T('#2a1c12'), beard: T('#2a1c12'), beardStyle: 'stubble', cape: true, capeTone: T('#26301f'), weapon: 'bow', quiver: true, trim: T('#8a7a5a') }); break;
    case 'archer:selvagem': set({ armor: 'leather', body: T('#6a5440'), body2: T('#4a3a2a'), legs: T('#5a4634'), boots: T('#4a3624'), head: 'none', hair: T('#a8482a'), hairStyle: 'braid', fur: '#4e3c2a', accent: T('#4a3a2a'), weapon: 'bow', quiver: true, trim: T('#d8ceb8'), bones: 1, cape: false }); if (!fem) femLook(L); break;
    case 'archer:sombria': set({ armor: 'leather', body: T('#2a4a2c'), body2: T('#5a4028'), legs: T('#24382a'), boots: T('#3a2818'), head: 'circlet', headTone: T('#c8ccd4'), hair: T('#16120e'), hairStyle: 'long', skin: T('#ecd2b4'), cape: true, capeTone: T('#4a3420'), weapon: 'elfbow', quiver: true, trim: T('#c8ccd4'), pattern: 'leaves' }); break;
    case 'archer:rubra': set({ armor: 'leather', body: T('#d8b070'), body2: T('#a8501a'), accent: T('#d8601a'), legs: T('#c8a060'), boots: T('#8a5a2a'), head: 'hood', headTone: T('#e07a2a'), veil: '#e8a04a', skin: T('#b07a52'), hair: T('#16100a'), cape: true, capeTone: T('#d8601a'), weapon: 'elfbow', quiver: true, trim: T('#e2b74e') }); break;
    case 'archer:dourada': set({ armor: 'leather', body: T('#7a8474'), body2: T('#c8ccd0'), legs: T('#5a6458'), boots: T('#6a5a44'), head: 'circlet', headTone: T('#e2c870'), hair: T('#efe6c8'), hairStyle: 'long', skin: T('#f0dcc4'), cape: true, capeTone: T('#9aa49c'), brooch: 'leaf', weapon: 'elfbow', quiver: true, trim: T('#e2c870'), pattern: 'leaves' }); break;
    case 'mage:escarlate': set({ armor: 'robe', body: T('#1c1c22'), body2: T('#121216'), accent: T('#7a1a1c'), head: 'none', hair: T('#2a1a10'), hairStyle: 'curly', beard: null, weapon: 'wand', scarf: ['#8a1a1c', '#d8a83a'], trim: T('#d8a83a'), cape: false }); break;
    case 'mage:esmeralda': set({ armor: 'robe', body: T('#1c1c22'), body2: T('#121216'), accent: T('#1e5a34'), head: 'none', hair: T('#c8b070'), hairStyle: 'short', beard: null, weapon: 'wand', scarf: ['#1e5a34', '#c8ccd4'], trim: T('#c8ccd4'), cape: false }); break;
    case 'mage:cinzento': set({ armor: 'robe', body: T('#8a8a86'), body2: T('#5a5a56'), head: 'wizard', headTone: T('#7a7a76'), brim: 1, hair: T('#d8d4cc'), beard: T('#d8d4cc'), beardLong: true, weapon: 'staff', orb: '#f4f0e0', trim: T('#a8a49c'), cape: true, capeTone: T('#6a6a66') }); break;
    case 'mage:chama': set({ armor: 'robe', body: T('#8a1414'), body2: T('#4a0a0a'), head: 'none', hair: T('#b8381a'), hairStyle: 'long', beard: null, weapon: 'staff', orb: '#ff6a1a', choker: '#e0201a', trim: T('#d8a03a'), cape: true, capeTone: T('#5a0a0a'), extra: 'ember' }); if (!fem) femLook(L); break;
    case 'mage:alvo': set({ armor: 'robe', body: T('#f0efea'), body2: T('#d8d6ce'), head: 'none', hair: T('#f4f2ec'), hairStyle: 'long', beard: T('#f4f2ec'), beardLong: true, weapon: 'starstaff', orb: '#ffffff', trim: T('#d8d4c8'), cape: true, capeTone: T('#ffffff'), staffDark: 1 }); break;
    default: return L;
  }
  if (fem) { femLook(L); L.beard = null; }
  return L;
};

/* ---------- peças novas do boneco ---------- */
if (typeof buildHumanoid === 'function') {
  const _bh2 = buildHumanoid;
  buildHumanoid = function (L, opts = {}) {
    const R = _bh2(L, opts); if (!R || !R.chest) return R;
    const S = opts.scale || 1, ch = R.chest, hx = h => (h && h.hex) || h || '#888888';
    if (L.fur) {   /* manto de pele sobre os ombros */
      const fm = mat(L.fur, 'fur'); const col = mesh(torG(0.17 * S, 0.075 * S), fm, 0, 0.27 * S, -0.01 * S); col.rotation.x = Math.PI / 2; col.scale.set(1.25, 0.95, 1); ch.add(col);
      for (const s of [-1, 1]) { const sh = mesh(sphG(0.11 * S), fm, s * 0.17 * S, 0.24 * S, -0.03 * S); sh.scale.set(1.1, 0.6, 1.15); ch.add(sh); }
      const bk = mesh(capG(0.16 * S, 0.12 * S), fm, 0, 0.16 * S, -0.12 * S); bk.scale.set(1.3, 1, 0.45); ch.add(bk); }
    if (L.scarf) {   /* cachecol listrado da casa da escola */
      const [a, b] = L.scarf.map(c => mat(c, 'cloth'));
      for (let q = 0; q < 6; q++) { const r = mesh(torG(0.095 * S, 0.03 * S), q % 2 ? b : a, 0, 0.29 * S - q * 0.004 * S, 0.01 * S); r.rotation.x = Math.PI / 2 + 0.15; r.scale.set(1.15 - q * 0.01, 1, 1); if (q === 0) ch.add(r); }
      const ring = mesh(torG(0.1 * S, 0.035 * S), a, 0, 0.29 * S, 0.01 * S); ring.rotation.x = Math.PI / 2 + 0.15; ch.add(ring);
      for (let q = 0; q < 5; q++) ch.add(mesh(boxG(0.06 * S, 0.05 * S, 0.02 * S), q % 2 ? b : a, 0.06 * S, 0.22 * S - q * 0.05 * S, 0.14 * S)); }
    if (L.choker) { const g = mesh(torG(0.062 * S, 0.01 * S), mat('#d8a03a', 'gold'), 0, 0.36 * S, 0.0); g.rotation.x = Math.PI / 2; ch.add(g); ch.add(mesh(sphG(0.022 * S), mat(L.choker, 'gem', { emissive: L.choker, emissiveIntensity: 1.2 }), 0, 0.34 * S, 0.065 * S)); }
    if (L.brooch === 'leaf') { const lf = mesh(sphG(0.035 * S), mat('#8ad070', 'gem', { emissive: '#3a8a3a', emissiveIntensity: 0.8 }), -0.08 * S, 0.22 * S, 0.14 * S); lf.scale.set(0.6, 1.2, 0.3); lf.rotation.z = 0.5; ch.add(lf); }
    if (L.emblem === 'tree') { const wm = mat('#ecebe6', 'cloth'); ch.add(mesh(boxG(0.012 * S, 0.16 * S, 0.01 * S), wm, 0, 0.0, 0.152 * S)); for (const [x, y, r] of [[0, 0.09, 0.03], [-0.035, 0.06, 0.022], [0.035, 0.06, 0.022], [-0.05, 0.02, 0.016], [0.05, 0.02, 0.016]]) ch.add(mesh(sphG(r * S), wm, x * S, y * S, 0.15 * S)); for (const [x, y] of [[-0.04, 0.14], [0, 0.155], [0.04, 0.14]]) ch.add(mesh(sphG(0.008 * S), wm, x * S, y * S, 0.152 * S)); }
    if (L.bones) { const bm = mat('#e8dfc8', 'bone'); for (let q = 0; q < 7; q++) { const a = -0.9 + q * 0.3, t = mesh(coneG(0.012 * S, 0.05 * S, 5), bm, Math.sin(a) * 0.13 * S, 0.24 * S - Math.cos(a) * 0.05 * S, 0.12 * S); t.rotation.x = Math.PI; ch.add(t); } }
    if (L.head === 'helm' && L.crest && R.head) {   /* elmos: crina de cavalo ou asas brancas */
      const h = R.head;
      if (L.crest === 'horse') { const pm = mat(hx(L.plume), 'hair'); const c = mesh(boxG(0.02 * S, 0.06 * S, 0.2 * S), mat('#c9a24a', 'gold'), 0, 0.14 * S, -0.01 * S); h.add(c); const c2 = mesh(boxG(0.03 * S, 0.07 * S, 0.22 * S), pm, 0, 0.19 * S, -0.02 * S); h.add(c2); for (let q = 0; q < 5; q++) { const t = mesh(capG(0.03 * S, 0.3 * S), pm, (q - 2) * 0.012 * S, 0.06 * S, -0.2 * S); t.rotation.x = 0.55 + Math.abs(q - 2) * 0.08; h.add(t); }   /* pente de crina no alto e o rabo caindo pelas costas */ }
      if (L.crest === 'wings') { const wm = mat('#f4f2ec', 'cloth'); for (const s of [-1, 1]) for (let q = 0; q < 3; q++) { const f = mesh(boxG(0.01 * S, 0.12 * S - q * 0.025 * S, 0.035 * S), wm, s * 0.11 * S, 0.1 * S + q * 0.02 * S, -0.03 * S - q * 0.03 * S); f.rotation.x = -0.5 - q * 0.15; f.rotation.z = -s * 0.25; h.add(f); } h.add(mesh(coneG(0.03 * S, 0.1 * S, 8), mat('#d0d4dc', 'metal'), 0, 0.2 * S, 0)); } }
    if (L.brim && R.head) { const b = mesh(cylG(0.24 * S, 0.24 * S, 0.012 * S, 24), mat(hx(L.headTone), 'cloth'), 0, 0.09 * S, 0); R.head.add(b); }   /* chapéu de aba larga */
    if (L.veil && R.head) { const v = mesh(capG(0.085 * S, 0.06 * S), mat(L.veil, 'cloth'), 0, -0.06 * S, 0.035 * S); v.scale.set(1.05, 0.9, 0.8); R.head.add(v); }   /* véu sobre a boca */
    if (L.beardStyle === 'stubble' && R.head) { const st = mesh(sphG(0.084 * S), mat(hx(L.beard), 'hair'), 0, -0.05 * S, 0.023 * S); st.scale.set(0.92, 0.82, 0.98); R.head.add(st); }
    return R; };
}
if (typeof buildShield === 'function') {
  const _bs2 = buildShield;
  buildShield = function (L, S, accM, trimM) {
    if (L.shield === 'round') {   /* escudo redondo de madeira com bossa de ferro */
      const g = new THREE.Group(), wd = mat(L.shieldC || '#6a4a2a', 'wood'), ir = mat('#5a5c62', 'darkmetal');
      g.add(mesh(cylG(0.25 * S, 0.25 * S, 0.03 * S, 24), wd, 0, 0, 0)); const rim = mesh(torG(0.25 * S, 0.012 * S), ir, 0, 0, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
      g.add(mesh(sphG(0.06 * S), ir, 0, 0.012 * S, 0)); for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2; g.add(mesh(sphG(0.012 * S), ir, Math.cos(a) * 0.2 * S, 0.016 * S, Math.sin(a) * 0.2 * S)); }
      if (L.shieldMark === 'sun') g.add(mesh(cylG(0.13 * S, 0.13 * S, 0.034 * S, 16), mat('#d8a83a', 'gold'), 0, 0, 0));
      if (L.shieldMark === 'wolf') { const wm = mat('#d8d8d4', 'cloth'); g.add(mesh(cylG(0.14 * S, 0.14 * S, 0.032 * S, 20), mat('#3a3a40', 'cloth'), 0, 0, 0)); const hd = mesh(sphG(0.06 * S), wm, 0, 0.02 * S, -0.02 * S); hd.scale.set(1, 0.4, 1.1); g.add(hd); for (const s of [-1, 1]) { const e = mesh(coneG(0.025 * S, 0.06 * S, 4), wm, s * 0.04 * S, 0.02 * S, -0.08 * S); e.rotation.x = -Math.PI / 2; g.add(e); } }
      g.rotation.x = Math.PI / 2; const outer = new THREE.Group(); outer.add(g); outer.userData.inner = g;   /* o disco inteiro de pé, virado para a frente */
      return outer; }
    const g = _bs2(L, S, accM, trimM);
    if (L.shieldC && L.shield === 'kite') { g.children[0].material = mat(L.shieldC, 'metal'); if (L.shieldMark === 'tree') { const wm = mat('#ecebe6', 'cloth'); g.add(mesh(boxG(0.015 * S, 0.22 * S, 0.01 * S), wm, 0, -0.02 * S, 0.045 * S)); for (const [x, y, r] of [[0, 0.1, 0.04], [-0.05, 0.06, 0.03], [0.05, 0.06, 0.03]]) g.add(mesh(sphG(r * S), wm, x * S, y * S, 0.04 * S)); } }
    return g; };
}
if (typeof buildWeapon === 'function') {
  const _bw2 = buildWeapon;
  buildWeapon = function (L, S, trimM) {
    if (L.weapon === 'wand') {   /* varinha de madeira com cabo torneado */
      const obj = new THREE.Group(), wd = mat('#5a3a20', 'wood');
      obj.add(mesh(cylG(0.016 * S, 0.018 * S, 0.12 * S, 8), mat('#3a2412', 'wood'), 0, 0.03 * S, 0)); for (const y of [-0.03, 0.0]) obj.add(mesh(torG(0.017 * S, 0.005 * S), wd, 0, y * S, 0));
      obj.add(mesh(cylG(0.006 * S, 0.013 * S, 0.34 * S, 7), wd, 0, -0.2 * S, 0));
      const tp = new THREE.Object3D(); tp.position.set(0, -0.37 * S, 0); obj.add(tp);
      return { obj, tip: tp }; }
    const W = _bw2(L, S, trimM);
    if (W && L.staffDark && W.obj.children[0]) W.obj.children[0].material = mat('#1a1614', 'wood');
    return W; };
}

/* ---------- as lendárias: compradas na Alfaiataria Real, valem para todos os heróis deste navegador ---------- */
const SK_OWN_KEY = 'nae_trajes';
const skOwned = () => { try { return JSON.parse(localStorage.getItem(SK_OWN_KEY)) || []; } catch (e) { return []; } };
const skPremium = id => SKIN_PRICE(id) > 0;
if (SKINS2_ON) {
  if (typeof NPC_DIALOG !== 'undefined' && NPC_DIALOG.st_tailor) NPC_DIALOG.st_tailor.opts.splice(1, 0, ['Trajes lendários (6.000 de ouro)', { skbuy: 1 }]);
  if (typeof helloMsg === 'function') { const _hm = helloMsg; helloMsg = function () { const m = _hm.apply(this, arguments); if (m) m.own = skOwned().slice(0, 30); return m; }; }
  if (typeof hostOnClient === 'function') { const _hoc = hostOnClient; hostOnClient = function (from, m) {
    if (m && m.t === 'hello') { const SP = skinParts(m.skin), own = Array.isArray(m.own) ? m.own.map(String) : []; if (skPremium(SP.base) && !own.includes(SP.base)) { const cls = CLASSES[m.cls] ? m.cls : 'knight'; m.skin = skinJoin(SKINS[cls][0].id, SP.fem, SP.tats, SP.body); } }   /* lendária sem a compra: volta para a comum */
    const r = _hoc.apply(this, arguments);
    if (m && m.t === 'hello' && S.players[from]) S.players[from].ownSk = (Array.isArray(m.own) ? m.own.map(String) : []).filter(skPremium);
    return r; };
    const _hoc2 = hostOnClient; hostOnClient = function (from, m) {
      if (m && m.t === 'npc' && m.skbuy) { const p = S.players[from], n = S.npcs[m.n]; if (!p || !n || n.kind !== 'st_tailor' || Math.hypot(n.x - p.x, n.y - p.y) > 4) return;
        if (p.voc === 0) { tell(p, 'Os trajes lendários são das guildas. Entre numa guilda primeiro.'); return; }
        const list = (SKINS[p.cls] || []).filter(q => q.price), s = list[((m.skbuy | 0) || 1) - 1] || list[0]; if (!s) return; const SP = skinParts(p.skin), own = p.ownSk || (p.ownSk = []);
        if (SP.base === s.id) { tell(p, 'Você já está vestindo o ' + s.name + '.'); return; }
        if (!own.includes(s.id)) { if ((p.gold | 0) < s.price) { tell(p, 'O ' + s.name + ' custa ' + s.price + ' de ouro. Você tem ' + (p.gold | 0) + '.'); return; } p.gold -= s.price; own.push(s.id); sendStat(p); }
        Net.toOne(p.id, { t: 'scene', k: 'fit' });
        setTimeout(() => { if (!S.players[p.id]) return; const SP2 = skinParts(p.skin); p.skin = skinJoin(s.id, SP2.fem, SP2.tats, SP2.body); Net.toAll({ t: 'pinfo', p: pinfo(p) }); Net.toOne(p.id, { t: 'skown', id: s.id }); tell(p, 'Pronto: o ' + s.name + ' é seu. Na próxima entrada, escolha qualquer traje no cartão da vocação.'); }, 2600);
        return; }
      return _hoc2.apply(this, arguments); }; }
  if (typeof progEvent === 'function') { const _pe = progEvent; progEvent = function (m, now) { if (m && m.t === 'skown') { const o = skOwned(); if (!o.includes(m.id)) { o.push(m.id); try { localStorage.setItem(SK_OWN_KEY, JSON.stringify(o)); } catch (e) { } } if (G.me) { const SP = skinParts(G.me.skin); G.me.skin = skinJoin(m.id, SP.fem, SP.tats, SP.body); } if (typeof saveChar === 'function') saveChar(); return; } return _pe.apply(this, arguments); }; }
  /* lobby: a lendária aparece com cadeado até ser comprada */
  const skLobbyFix = () => { document.querySelectorAll('.class-card').forEach(card => { const cls = card.dataset.cls; card.querySelectorAll('.skin').forEach(b => { const s = SKINS[cls] && SKINS[cls][+b.dataset.si]; if (!s || !s.price) return; const own = skOwned().includes(s.id); b.classList.toggle('locked', !own); b.dataset.lvl = own ? 'seu' : s.price + ' ouro'; b.dataset.tip = s.name + '\nRaridade: Lendária\n' + (own ? 'Traje comprado' : 'Compre na Alfaiataria Real, em Nae (' + s.price + ' de ouro)');
    if (!b._skw) { b._skw = 1; const oc = b.onclick; b.onclick = ev => { if (!skOwned().includes(s.id)) { ev.stopPropagation(); showToast('Este traje se compra na Alfaiataria Real, em Nae: ' + s.price + ' de ouro.'); return; } return oc && oc.call(b, ev); }; } });
    const cur = SKINS[cls] && SKINS[cls].find(q => q.id === chosenSkin[cls]); if (cur && cur.price && !skOwned().includes(cur.id)) chosenSkin[cls] = SKINS[cls][0].id; }); };
  /* o lobby já foi montado antes deste arquivo: põe os botões das skins novas nos cartões */
  const skAddButtons = () => { document.querySelectorAll('.class-card').forEach(card => { const cls = card.dataset.cls, box = card.querySelector('.skins'); if (!box || !SKINS[cls]) return;
    for (const s of SKINS[cls].slice(3)) { if (box.querySelector('[data-sid="' + s.id + '"]')) continue; const si = SKINS[cls].indexOf(s); if (si < 0) continue; const b = document.createElement('button');
      b.className = 'skin ' + s.rarity.toLowerCase().replace('á', 'a').replace('ê', 'e') + (chosenSkin[cls] === s.id ? ' sel' : ''); b.dataset.si = si; b.dataset.sid = s.id; b.dataset.lvl = 'nv. ' + SKIN_LVL[si]; b.textContent = s.name; b.dataset.tip = s.name + '\nRaridade: ' + s.rarity + (SKIN_LVL[si] > 1 ? '\nLibera no nível ' + SKIN_LVL[si] : '');
      b.onclick = ev => { ev.stopPropagation(); if (lobbyLvl(cls) < SKIN_LVL[si]) { showToast('Esta skin libera no nível ' + SKIN_LVL[si] + '.'); return; } chosenSkin[cls] = s.id; chosenClass = cls; for (const el of box.children) el.classList.toggle('sel', el === b); selectClass(cls); };
      box.appendChild(b); } }); skLobbyFix(); if (typeof refreshSkinLocks === 'function') refreshSkinLocks(); };
  if (document.readyState !== 'loading') skAddButtons(); else document.addEventListener('DOMContentLoaded', skAddButtons);
  window.skLobbyFix = skLobbyFix; window.skAddButtons = skAddButtons;
  if (typeof buildLobby === 'function') { const _bl = buildLobby; buildLobby = function () { const r = _bl.apply(this, arguments); skLobbyFix(); return r; }; }
  if (typeof refreshSkinLocks === 'function') { const _rl = refreshSkinLocks; refreshSkinLocks = function () { const r = _rl.apply(this, arguments); skLobbyFix(); return r; }; }
}
