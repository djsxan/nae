/* Skins novas, 2ª leva (28/11): mais 5 por vocação. Referências: outras facções de Game of Thrones, Senhor dos Anéis e Harry Potter,
   The Witcher, Elden Ring/Dark Souls e Vikings/Skyrim (desenhos e nomes próprios do jogo). Obtenção igual à 1ª leva: 2 livres, nv 15, nv 30 e 1 lendária (8.000). */
const SKINS3 = {
  knight: [
    { id: 'leao', name: 'Leão do Rochedo Dourado', rarity: 'Comum', lv: 1, ref: 'a casa do leão dourado: aço dourado, leão no peito e nos ombros, capa carmesim' },
    { id: 'jarl', name: 'Jarl das Neves', rarity: 'Comum', lv: 1, ref: 'os nórdicos do norte gelado: elmo de ferro com chifres, peles, machado e escudo redondo pintado' },
    { id: 'anao', name: 'Guardião da Montanha', rarity: 'Rara', lv: 15, ref: 'os anões do reino sob a montanha: placas grossas gravadas, barba trançada com argolas e martelo' },
    { id: 'crepusculo', name: 'Cavaleiro do Crepúsculo', rarity: 'Rara', lv: 30, ref: 'os cavaleiros maculados das terras sombrias: aço gasto, capa em farrapos e elmo de fenda estreita' },
    { id: 'dragao', name: 'Herdeiro do Dragão Negro', rarity: 'Lendária', lv: 1, price: 8000, ref: 'a casa do dragão: escamas negras, o dragão de três cabeças vermelho no peito e elmo de espinhos' },
  ],
  archer: [
    { id: 'bruxo', name: 'Bruxo da Escola do Lobo', rarity: 'Comum', lv: 1, ref: 'os caçadores de monstros: couro com tachas, medalhão de lobo, cabelo branco e duas espadas nas costas' },
    { id: 'escudeira', name: 'Escudeira das Ilhas', rarity: 'Comum', lv: 1, ref: 'as escudeiras nórdicas: tranças loiras, peles, escudo redondo nas costas' },
    { id: 'valeoculto', name: 'Sentinela do Vale Oculto', rarity: 'Rara', lv: 15, ref: 'os elfos do vale escondido: vinho e ouro, diadema e manto elegante' },
    { id: 'luar', name: 'Caçadora do Luar', rarity: 'Rara', lv: 30, ref: 'os caçadores da noite eterna: tricórnio, sobretudo escuro e lenço sobre a boca' },
    { id: 'brumas', name: 'Andorinha das Brumas', rarity: 'Lendária', lv: 1, price: 8000, ref: 'a herdeira do sangue antigo: cabelo cinza, camisa clara, colete escuro e cicatriz no rosto' },
  ],
  mage: [
    { id: 'ambar', name: 'Aprendiz da Torre Âmbar', rarity: 'Comum', lv: 1, ref: 'a escola de magia: veste negra, cachecol amarelo e preto, varinha' },
    { id: 'safira', name: 'Aprendiz da Torre Safira', rarity: 'Comum', lv: 1, ref: 'a escola de magia: veste negra, cachecol azul e bronze, varinha' },
    { id: 'aretuza', name: 'Feiticeira da Ilha das Magas', rarity: 'Rara', lv: 15, ref: 'as feiticeiras da academia da ilha: preto e branco, cachos negros e a estrela de obsidiana no pescoço' },
    { id: 'mascara', name: 'Seguidor da Máscara Prateada', rarity: 'Rara', lv: 30, ref: 'os seguidores do lorde das trevas: capuz negro e máscara de prata' },
    { id: 'cristal', name: 'Erudito da Academia de Cristal', rarity: 'Lendária', lv: 1, price: 8000, ref: 'os feiticeiros da academia da pedra-estrela: veste azul, coroa de cristal e cajado azul' },
  ],
};
if (typeof SKINS2_ON !== 'undefined' && SKINS2_ON) {
  for (const cls in SKINS3) SKINS[cls].push(...SKINS3[cls]); SKIN_LVL.push(1, 1, 15, 30, 1);
  if (typeof NPC_DIALOG !== 'undefined' && NPC_DIALOG.st_tailor) NPC_DIALOG.st_tailor.opts.splice(2, 0, ['Trajes lendários das lendas (8.000 de ouro)', { skbuy: 2 }]);
  if (typeof window !== 'undefined' && window.skAddButtons) window.skAddButtons();
}

/* ---------- o visual ---------- */
{ const _hl3 = heroLook;
  heroLook = function (cls, skinId, accentHex) {
    const L = _hl3(cls, skinId, accentHex), SP = skinParts(skinId), k = SP.base, fem = SP.fem, T = tone, set = o => Object.assign(L, o);
    switch (cls + ':' + k) {
      case 'knight:leao': set({ armor: 'plate', body: T('#c9a24a'), body2: T('#6a1a1c'), accent: T('#8a1a1c'), legs: T('#b08a3a'), boots: T('#5a3a1e'), trim: T('#e8c86a'), head: 'none', hair: T('#d8b060'), hairStyle: 'short', beard: T('#d8b060'), beardStyle: 'stubble', cape: true, capeTone: T('#8a1a1c'), emblem: 'lion', weapon: 'goldsword', shield: 'kite', shieldC: '#8a1a1c', pauldron: 'round', lionPaul: 1 }); break;
      case 'knight:jarl': set({ armor: 'leather', body: T('#5a4a3a'), body2: T('#3a2a1a'), accent: T('#6a2a1a'), legs: T('#4a3a2a'), boots: T('#3a2818'), trim: T('#9a9488'), head: 'horned', headTone: T('#6a6a70'), fur: '#4a3a2c', hair: T('#c88a4a'), hairStyle: 'braid', beard: T('#c88a4a'), weapon: 'axe', shield: 'round', shieldC: '#7a2a1a', shieldMark: 'knot', cape: true, capeTone: T('#4a3a2c') }); break;
      case 'knight:anao': set({ armor: 'plate', body: T('#7a6a5a'), body2: T('#4a3420'), accent: T('#3a5a6a'), legs: T('#5a4a3a'), boots: T('#3a2818'), trim: T('#c9a24a'), head: 'helm', headTone: T('#8a7a64'), hair: T('#8a4a22'), beard: T('#8a4a22'), braids: 1, weapon: 'hammer', shield: 'round', shieldC: '#4a3a2a', shieldMark: 'runes', pattern: null, runes: 1, cape: false, pauldron: 'round' }); break;
      case 'knight:crepusculo': set({ armor: 'plate', body: T('#4a4844'), body2: T('#2a2622'), accent: T('#3a3632'), legs: T('#3a3834'), boots: T('#22201c'), trim: T('#6a6458'), head: 'greathelm', headTone: T('#55524c'), plume: T('#2a2622'), cape: true, capeTone: T('#2e2a26'), tatter: 1, weapon: 'sword', shield: 'kite', shieldC: '#3a3632', pauldron: 'round' }); break;
      case 'knight:dragao': set({ armor: 'plate', body: T('#1a1618'), body2: T('#2a0e0e'), accent: T('#1a1618'), legs: T('#1e1a1c'), boots: T('#141012'), trim: T('#8a1a14'), head: 'wyvernhelm', headTone: T('#1c181a'), pattern: 'scales', emblem: 'dragon3', cape: true, capeTone: T('#6a0e0c'), weapon: 'darkblade', shield: 'kite', shieldC: '#1a1618', shieldMark: 'dragon3', pauldron: 'spike', extra: 'ember' }); break;
      case 'archer:bruxo': set({ armor: 'leather', body: T('#3a3430'), body2: T('#5a4a3a'), legs: T('#2e2a26'), boots: T('#2a2018'), head: 'none', hair: T('#e8e6e0'), hairStyle: 'tail', beard: T('#d8d6d0'), beardStyle: 'stubble', medallion: 'wolf', backSwords: 1, studs: 1, weapon: 'bow', quiver: false, trim: T('#a8a8b0'), scar: 1, cape: false }); break;
      case 'archer:escudeira': set({ armor: 'leather', body: T('#6a5a4a'), body2: T('#3a5a6a'), accent: T('#3a5a6a'), legs: T('#4a4034'), boots: T('#4a3624'), head: 'none', hair: T('#e2c880'), hairStyle: 'braid', fur: '#4a3a2a', backShield: '#3a5a6a', weapon: 'bow', quiver: true, trim: T('#a8a8b0'), cape: false }); if (!fem) femLook(L); break;
      case 'archer:valeoculto': set({ armor: 'leather', body: T('#6a1e2a'), body2: T('#c9a24a'), legs: T('#4a1a22'), boots: T('#4a3420'), head: 'circlet', headTone: T('#e2c870'), hair: T('#2a1a12'), hairStyle: 'long', skin: T('#efd6bc'), cape: true, capeTone: T('#7a2a34'), weapon: 'elfbow', quiver: true, trim: T('#e2c870'), pattern: 'leaves' }); break;
      case 'archer:luar': set({ armor: 'leather', body: T('#24221e'), body2: T('#3a3026'), legs: T('#22201c'), boots: T('#1a1612'), head: 'none', hair: T('#3a2a1e'), tricorn: '#1e1c1a', veil: '#2a2622', cape: true, capeTone: T('#1e1c1a'), weapon: 'bow', quiver: true, trim: T('#8a8478') }); break;
      case 'archer:brumas': set({ armor: 'leather', body: T('#e8e2d4'), body2: T('#2a2622'), accent: T('#2a2622'), legs: T('#3a3632'), boots: T('#2a2018'), head: 'none', hair: T('#c8c8c4'), hairStyle: 'long', scar: 1, vest: '#2a2622', weapon: 'elfbow', quiver: true, trim: T('#a8a8b0'), cape: false }); if (!fem) femLook(L); break;
      case 'mage:ambar': set({ armor: 'robe', body: T('#1c1c22'), body2: T('#121216'), accent: T('#d8a820'), head: 'none', hair: T('#8a5a2a'), hairStyle: 'short', beard: null, weapon: 'wand', scarf: ['#d8a820', '#1a1a1a'], trim: T('#d8a820'), cape: false }); break;
      case 'mage:safira': set({ armor: 'robe', body: T('#1c1c22'), body2: T('#121216'), accent: T('#1e3a7a'), head: 'none', hair: T('#2a1a10'), hairStyle: 'long', beard: null, weapon: 'wand', scarf: ['#1e3a7a', '#b08040'], trim: T('#b08040'), cape: false }); break;
      case 'mage:aretuza': set({ armor: 'robe', body: T('#141216'), body2: T('#ecebe6'), accent: T('#ecebe6'), head: 'none', hair: T('#0e0c10'), hairStyle: 'curly', beard: null, weapon: 'staff', orb: '#b07ae8', choker: '#5a2a8a', trim: T('#ecebe6'), cape: true, capeTone: T('#141216') }); if (!fem) femLook(L); break;
      case 'mage:mascara': set({ armor: 'robe', body: T('#121114'), body2: T('#0a090c'), head: 'hood', headTone: T('#0e0d10'), mask: '#c8ccd4', beard: null, weapon: 'wand', trim: T('#3a3a40'), cape: true, capeTone: T('#0e0d10') }); break;
      case 'mage:cristal': set({ armor: 'robe', body: T('#2a4a8a'), body2: T('#1a2a5a'), accent: T('#c8d8f0'), head: 'none', hair: T('#d8d4cc'), beard: T('#d8d4cc'), beardLong: true, crystalCrown: 1, weapon: 'starstaff', orb: '#7ab8ff', trim: T('#c8d8f0'), cape: true, capeTone: T('#1a2a5a'), pattern: 'stars' }); break;
      default: return L;
    }
    if (fem) { femLook(L); L.beard = null; }
    return L; }; }

/* ---------- peças novas ---------- */
if (typeof buildHumanoid === 'function') {
  const _bh3 = buildHumanoid;
  buildHumanoid = function (L, opts = {}) {
    const R = _bh3(L, opts); if (!R || !R.chest) return R;
    const S = opts.scale || 1, ch = R.chest, gold = () => mat('#d8b050', 'gold');
    if (L.emblem === 'lion') { const g = gold(); ch.add(mesh(sphG(0.045 * S), g, 0, 0.06 * S, 0.15 * S)); const mane = mesh(torG(0.045 * S, 0.014 * S), g, 0, 0.06 * S, 0.145 * S); ch.add(mane); for (const s of [-1, 1]) ch.add(mesh(sphG(0.012 * S), g, s * 0.02 * S, 0.1 * S, 0.15 * S)); }   /* cabeça de leão no peito */
    if (L.lionPaul) for (const s of [-1, 1]) { const g = mesh(sphG(0.035 * S), gold(), s * 0.2 * S, 0.24 * S, 0.06 * S); g.scale.set(1, 0.8, 0.5); ch.add(g); }
    if (L.emblem === 'dragon3') { const r = mat('#b8201a', 'cloth', { emissive: '#4a0806' }); for (const [x, y] of [[-0.045, 0.1], [0, 0.12], [0.045, 0.1]]) { ch.add(mesh(sphG(0.02 * S), r, x * S, y * S, 0.152 * S)); ch.add(mesh(boxG(0.01 * S, 0.06 * S, 0.008 * S), r, x * 0.6 * S, (y - 0.04) * S, 0.152 * S)); } const w = mesh(boxG(0.13 * S, 0.035 * S, 0.008 * S), r, 0, 0.02 * S, 0.153 * S); ch.add(w); }   /* o dragão de três cabeças */
    if (L.runes) { const g = gold(); for (let q = 0; q < 4; q++) { const b = mesh(boxG(0.16 * S, 0.008 * S, 0.006 * S), g, 0, (0.12 - q * 0.06) * S, 0.152 * S); b.rotation.z = q % 2 ? 0.25 : -0.25; ch.add(b); } }   /* gravações em ziguezague nas placas */
    if (L.medallion) { const s = mat('#c8ccd4', 'metal'); ch.add(mesh(cylG(0.006 * S, 0.006 * S, 0.14 * S, 5), mat('#3a3430', 'leather'), 0, 0.27 * S, 0.11 * S)); const m = mesh(cylG(0.035 * S, 0.035 * S, 0.008 * S, 12), s, 0, 0.18 * S, 0.16 * S); m.rotation.x = Math.PI / 2; ch.add(m); for (const x of [-1, 1]) { const e = mesh(coneG(0.01 * S, 0.025 * S, 4), s, x * 0.02 * S, 0.215 * S, 0.162 * S); ch.add(e); } }   /* medalhão de lobo */
    if (L.studs) { const s = mat('#a8a8b0', 'metal'); for (let q = 0; q < 10; q++) ch.add(mesh(sphG(0.008 * S), s, ((q % 5) - 2) * 0.05 * S, (q < 5 ? 0.12 : -0.02) * S, 0.148 * S)); }
    if (L.backSwords) { const bl = mat('#cfd4dc', 'metal'), hd = mat('#2a1a10', 'leather'); for (const s of [-1, 1]) { const g = new THREE.Group(); g.add(mesh(boxG(0.035 * S, 0.7 * S, 0.008 * S), bl, 0, -0.2 * S, 0)); g.add(mesh(boxG(0.14 * S, 0.02 * S, 0.02 * S), mat('#6a6a70', 'metal'), 0, 0.15 * S, 0)); g.add(mesh(cylG(0.014 * S, 0.014 * S, 0.12 * S, 6), hd, 0, 0.22 * S, 0)); g.position.set(s * 0.05 * S, 0.12 * S, -0.16 * S); g.rotation.z = s * 0.35; ch.add(g); } }   /* duas espadas cruzadas nas costas */
    if (L.backShield) { const g = new THREE.Group(); g.add(mesh(cylG(0.22 * S, 0.22 * S, 0.025 * S, 20), mat(L.backShield, 'wood'), 0, 0, 0)); g.add(mesh(sphG(0.05 * S), mat('#5a5c62', 'darkmetal'), 0, -0.012 * S, 0)); g.rotation.x = Math.PI / 2; g.position.set(0, 0.04 * S, -0.17 * S); ch.add(g); }
    if (L.tatter && R.cape) { R.cape.material = R.cape.material.clone(); R.cape.material.transparent = false; }   /* (capa gasta: mesma capa, escura) */
    if (L.vest) { const v = mesh(capG(0.175 * S, 0.24 * S), mat(L.vest, 'leather'), 0, 0.0, 0); v.scale.set(L.fem ? 0.97 : 1.17, 0.95, L.fem ? 0.72 : 0.77); ch.add(v); }   /* colete por cima da camisa */
    const H = R.head;
    if (H && L.tricorn) { const m = mat(L.tricorn, 'cloth'); const b = mesh(cylG(0.17 * S, 0.17 * S, 0.012 * S, 3), m, 0, 0.1 * S, 0); b.rotation.y = Math.PI; H.add(b); H.add(mesh(cylG(0.08 * S, 0.1 * S, 0.09 * S, 12), m, 0, 0.15 * S, -0.01 * S)); for (let q = 0; q < 3; q++) { const a = q / 3 * Math.PI * 2 + Math.PI, f = mesh(boxG(0.16 * S, 0.06 * S, 0.012 * S), m, Math.sin(a) * 0.12 * S, 0.13 * S, Math.cos(a) * 0.12 * S); f.rotation.y = a; f.rotation.x = -0.4; H.add(f); } }   /* tricórnio de abas viradas */
    if (H && L.mask) { const m = mat(L.mask, 'metal'); const f = mesh(sphG(0.1 * S), m, 0, 0.0, 0.035 * S); f.scale.set(0.9, 1.05, 0.8); H.add(f); const d = mat('#0a0a0c', 'cloth'); for (const s of [-1, 1]) H.add(mesh(sphG(0.016 * S), d, s * 0.035 * S, 0.015 * S, 0.112 * S)); for (let q = 0; q < 4; q++) H.add(mesh(boxG(0.05 * S, 0.004 * S, 0.004 * S), d, 0, (0.06 - q * 0.04) * S, 0.118 * S)); }   /* máscara de prata com arabescos */
    if (H && L.crystalCrown) { const c = mat('#8ac0ff', 'gem', { emissive: '#3a70c8', emissiveIntensity: 0.9 }); const cone = mesh(new THREE.ConeGeometry(0.13 * S, 0.32 * S, 8, 1, true), c, 0, 0.17 * S, 0); H.add(cone); H.add(mesh(torG(0.115 * S, 0.012 * S), mat('#c8d8f0', 'metal'), 0, 0.04 * S, 0)); for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 2, sp = mesh(new THREE.OctahedronGeometry(0.025 * S), c, Math.cos(a) * 0.12 * S, 0.08 * S, Math.sin(a) * 0.12 * S); H.add(sp); } }   /* coroa de pedra-estrela */
    return R; };
}
if (typeof buildShield === 'function') {
  const _bs3 = buildShield;
  buildShield = function (L, S, accM, trimM) { const g = _bs3(L, S, accM, trimM);
    const gi = (g.userData && g.userData.inner) || g;
    if (L.shield === 'round' && L.shieldMark === 'knot') { const m = mat('#e8d8b0', 'cloth'); for (let q = 0; q < 4; q++) { const a = q / 4 * Math.PI * 2, b = mesh(boxG(0.03 * S, 0.02 * S, 0.2 * S), m, 0, 0.034 * S, 0); b.rotation.y = a; b.position.set(Math.cos(a) * 0.06 * S, 0.034 * S, Math.sin(a) * 0.06 * S); gi.add(b); } }   /* nó nórdico pintado */
    if (L.shield === 'round' && L.shieldMark === 'runes') { const m = mat('#c9a24a', 'gold'); const tr = mesh(torG(0.17 * S, 0.01 * S), m, 0, 0.03 * S, 0); tr.rotation.x = Math.PI / 2; gi.add(tr); }
    if (L.shield === 'kite' && L.shieldMark === 'dragon3') { const r = mat('#b8201a', 'cloth'); for (const [x, y] of [[-0.06, 0.1], [0, 0.13], [0.06, 0.1]]) g.add(mesh(sphG(0.03 * S), r, x * S, y * S, 0.045 * S)); g.add(mesh(boxG(0.18 * S, 0.05 * S, 0.01 * S), r, 0, 0.0, 0.045 * S)); }
    return g; };
}

/* ---------- teste (pedido 28/11): no Ateliê Real do Mestre Aurélio todos os trajes saem de graça ---------- */
if (typeof SKINS2_ON !== 'undefined' && SKINS2_ON) {
  if (typeof NPC_DIALOG !== 'undefined' && NPC_DIALOG.tailor) NPC_DIALOG.tailor.opts.unshift(['Vestir o próximo traje (teste, grátis)', { skfree: 1 }], ['Vestir o traje anterior (teste, grátis)', { skfree: -1 }]);
  if (typeof hostOnClient === 'function') { const _hocF = hostOnClient; hostOnClient = function (from, m) {
    if (m && m.t === 'npc' && m.skfree) { const p = S.players[from], n = S.npcs[m.n]; if (!p || !n || n.kind !== 'tailor' || Math.hypot(n.x - p.x, n.y - p.y) > 5) return;
      const list = SKINS[p.cls] || [], SP = skinParts(p.skin), i0 = list.findIndex(s => s.id === SP.base), s = list[(((i0 < 0 ? 0 : i0) + (m.skfree > 0 ? 1 : -1)) % list.length + list.length) % list.length]; if (!s) return;
      if (s.price) { const own = p.ownSk || (p.ownSk = []); if (!own.includes(s.id)) own.push(s.id); }
      p.skin = skinJoin(s.id, SP.fem, SP.tats, SP.body); Net.toAll({ t: 'pinfo', p: pinfo(p) }); Net.toOne(p.id, { t: 'skown', id: s.id, keep: s.price ? 1 : 0 });
      tell(p, 'Traje ' + (list.indexOf(s) + 1) + ' de ' + list.length + ': ' + s.name + ' (' + s.rarity + ').'); return; }
    return _hocF.apply(this, arguments); }; }
  if (typeof progEvent === 'function') { const _peF = progEvent; progEvent = function (m, now) { if (m && m.t === 'skown' && m.keep === 0) { if (G.me) { const SP = skinParts(G.me.skin); G.me.skin = skinJoin(m.id, SP.fem, SP.tats, SP.body); } if (typeof saveChar === 'function') saveChar(); return; } return _peF.apply(this, arguments); }; }
}
