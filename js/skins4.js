/* Skins novas, 3ª leva (28/11): 10 por vocação, bem variadas. 3 de armaduras históricas de civilizações reais e 7 de fantasia
   (Dark Souls/Elden Ring, Skyrim, The Witcher, Game of Thrones, Senhor dos Anéis, Harry Potter), com desenhos e nomes próprios do jogo.
   Ordem em cada vocação: 4 livres, níveis 15, 30, 45 e 60, e 2 lendárias de 10.000 de ouro (Alfaiataria Real). Todas no provador do Ateliê Real. */
const SKINS4 = {
  knight: [
    { id: 'legiao', name: 'Legionário de Roma', rarity: 'Comum', lv: 1, hist: 1, ref: 'Roma antiga: couraça de lâminas, túnica vermelha, elmo de crista e escudo retangular' },
    { id: 'teutonico', name: 'Cavaleiro Teutônico', rarity: 'Comum', lv: 1, hist: 1, ref: 'a ordem dos cavaleiros do Báltico: sobreveste branca com a cruz negra e grande elmo' },
    { id: 'sol', name: 'Cavaleiro do Sol Radiante', rarity: 'Comum', lv: 1, ref: 'o cavaleiro que louva o sol: sobreveste com o sol pintado sobre a malha e elmo de balde' },
    { id: 'rocha', name: 'Guardião de Pedra', rarity: 'Comum', lv: 1, ref: 'o guerreiro da armadura de rocha: placas grossas como pedra, escudo-torre e clava' },
    { id: 'samurai', name: 'Samurai da Casa Vermelha', rarity: 'Rara', lv: 15, hist: 1, ref: 'Japão feudal: armadura laqueada de lâminas, ombreiras largas e elmo com a lua crescente' },
    { id: 'bulbo', name: 'Cavaleiro Bulboso', rarity: 'Rara', lv: 30, ref: 'os cavaleiros da armadura arredondada como cebola, risonhos e teimosos' },
    { id: 'solnegro', name: 'Imperial do Sol Negro', rarity: 'Rara', lv: 45, ref: 'o império do sul: aço negro, o sol dourado no peito e elmo alado' },
    { id: 'bronze', name: 'Autômato de Bronze', rarity: 'Rara', lv: 60, ref: 'os anões desaparecidos das cidades de bronze: placas de bronze com engrenagens' },
    { id: 'daedrico', name: 'Cavaleiro Daédrico', rarity: 'Lendária', lv: 1, price: 10000, ref: 'a armadura dos príncipes demônios: negra e vermelha, espinhos e brasa' },
    { id: 'caria', name: 'Cavaleiro de Cária', rarity: 'Lendária', lv: 1, price: 10000, ref: 'os cavaleiros da rainha da lua: aço azul e espada de luz azul' },
  ],
  archer: [
    { id: 'gales', name: 'Arqueiro do Arco Longo', rarity: 'Comum', lv: 1, hist: 1, ref: 'os arqueiros galeses e ingleses da Idade Média: gibão acolchoado verde e chapéu de ferro' },
    { id: 'rouxinol', name: 'Rouxinol da Guilda', rarity: 'Comum', lv: 1, ref: 'a irmandade dos ladrões das sombras: couro escuro, capuz e máscara' },
    { id: 'grifo', name: 'Bruxo da Escola do Grifo', rarity: 'Comum', lv: 1, ref: 'os caçadores de monstros do grifo: gibão azul acolchoado e medalhão' },
    { id: 'rosa', name: 'Arqueira do Jardim das Rosas', rarity: 'Comum', lv: 1, ref: 'a casa da rosa dourada: verde e ouro, a rosa no peito' },
    { id: 'mongol', name: 'Arqueiro das Estepes', rarity: 'Rara', lv: 15, hist: 1, ref: 'os arqueiros a cavalo mongóis: casaco de pele, elmo cônico com pluma e arco recurvo' },
    { id: 'imortal', name: 'Imortal da Pérsia', rarity: 'Rara', lv: 30, hist: 1, ref: 'a guarda persa dos Imortais: túnica bordada, escamas, gorro alto e aljava' },
    { id: 'vidro', name: 'Guardião de Vidro', rarity: 'Rara', lv: 45, ref: 'a armadura élfica de vidro verde-mar das terras do norte' },
    { id: 'harad', name: 'Arqueiro do Sul Distante', rarity: 'Rara', lv: 60, ref: 'os povos do deserto distante: turbante, sedas vermelhas e ouro, pintura de guerra' },
    { id: 'facanegra', name: 'Assassina da Faca Negra', rarity: 'Lendária', lv: 1, price: 10000, ref: 'as assassinas encapuzadas da faca negra: preto e ouro, rosto coberto' },
    { id: 'espectral', name: 'Caçador Espectral', rarity: 'Lendária', lv: 1, price: 10000, ref: 'os cavaleiros da caçada selvagem: armadura de gelo com espinhos e brilho frio' },
  ],
  mage: [
    { id: 'faraonico', name: 'Sacerdote do Faraó', rarity: 'Comum', lv: 1, hist: 1, ref: 'o Egito antigo: linho branco, colar largo de ouro e o toucado listrado' },
    { id: 'gelido', name: 'Aluno do Instituto Gélido', rarity: 'Comum', lv: 1, ref: 'a escola de magia do norte: veste vermelho-sangue, capa e gorro de pele' },
    { id: 'azulfranca', name: 'Aluna da Academia Azul', rarity: 'Comum', lv: 1, ref: 'a escola de magia do sul: seda azul-celeste, capa curta e chapéu de feltro' },
    { id: 'cacamagos', name: 'Caçador de Magos das Trevas', rarity: 'Comum', lv: 1, ref: 'os caçadores do ministério: sobretudo longo escuro e varinha' },
    { id: 'bizantino', name: 'Patriarca de Bizâncio', rarity: 'Rara', lv: 15, hist: 1, ref: 'o império bizantino: vestes púrpura e ouro e o gorro alto bordado' },
    { id: 'jade', name: 'Sábio do Jade', rarity: 'Rara', lv: 30, hist: 1, ref: 'os sábios da China antiga: túnica de mangas largas, coroinha de jade e leque' },
    { id: 'muitasfaces', name: 'Servo de Muitas Faces', rarity: 'Rara', lv: 45, ref: 'a casa do deus de muitas faces: manto cinza e preto, capuz fundo' },
    { id: 'necromante', name: 'Necromante do Vale', rarity: 'Rara', lv: 60, ref: 'os necromantes das criptas: veste negra, crânio no cajado e brilho roxo' },
    { id: 'arvore', name: 'Feiticeiro da Árvore Dourada', rarity: 'Lendária', lv: 1, price: 10000, ref: 'a fé da grande árvore dourada: vestes de ouro e auréola de luz' },
    { id: 'lua', name: 'Rainha da Lua Cheia', rarity: 'Lendária', lv: 1, price: 10000, ref: 'a rainha feiticeira da lua: chapéu altíssimo com coroa, veste azul-noite e cajado da lua' },
  ],
};
if (typeof SKINS2_ON !== 'undefined' && SKINS2_ON) {
  for (const cls in SKINS4) SKINS[cls].push(...SKINS4[cls]); SKIN_LVL.push(1, 1, 1, 1, 15, 30, 45, 60, 1, 1);
  if (typeof NPC_DIALOG !== 'undefined' && NPC_DIALOG.st_tailor) NPC_DIALOG.st_tailor.opts.splice(3, 0, ['Traje lendário raro I (10.000 de ouro)', { skbuy: 3 }], ['Traje lendário raro II (10.000 de ouro)', { skbuy: 4 }]);
  if (typeof window !== 'undefined' && window.skAddButtons) window.skAddButtons();
}

{ const _hl4 = heroLook;
  heroLook = function (cls, skinId, accentHex) {
    const L = _hl4(cls, skinId, accentHex), SP = skinParts(skinId), k = SP.base, fem = SP.fem, T = tone, set = o => Object.assign(L, o);
    switch (cls + ':' + k) {
      case 'knight:legiao': set({ armor: 'plate', body: T('#b8b4a8'), body2: T('#8a1a14'), accent: T('#9a1a14'), legs: T('#b06a4a'), boots: T('#6a4424'), trim: T('#c9a24a'), head: 'helm', headTone: T('#c0a060'), crest: 'roman', plume: T('#b81a14'), hair: T('#2a1a10'), segs: 1, cape: true, capeTone: T('#9a1a14'), weapon: 'sword', shield: 'scutum', pauldron: 'round' }); break;
      case 'knight:teutonico': set({ armor: 'plate', body: T('#ecebe6'), body2: T('#3a3a40'), accent: T('#f2f0ea'), legs: T('#9aa0a8'), boots: T('#4a4a50'), trim: T('#1a1a1c'), head: 'greathelm', headTone: T('#a8aeb6'), plume: T('#ecebe6'), emblem: 'cross', cape: true, capeTone: T('#ecebe6'), weapon: 'sword', shield: 'kite', shieldC: '#f2f0ea', shieldMark: 'cross', pauldron: null }); break;
      case 'knight:sol': set({ armor: 'plate', body: T('#9aa0a8'), body2: T('#5a4a3a'), accent: T('#ecebe0'), legs: T('#8a8e96'), boots: T('#4a3a2a'), trim: T('#e2b74e'), head: 'greathelm', headTone: T('#a8aeb6'), plume: T('#a8aeb6'), emblem: 'sun', cape: false, weapon: 'sword', shield: 'kite', shieldC: '#ecebe0', shieldMark: 'sun', pauldron: 'round', mail: 1 }); break;
      case 'knight:rocha': set({ armor: 'plate', body: T('#6a6458'), body2: T('#3a342c'), accent: T('#5a544a'), legs: T('#5e584e'), boots: T('#3a342c'), trim: T('#7a7468'), head: 'greathelm', headTone: T('#6a6458'), plume: T('#6a6458'), rocky: 1, weapon: 'club', shield: 'tower', shieldC: '#6a6458', pauldron: 'round', cape: false }); break;
      case 'knight:samurai': set({ armor: 'plate', body: T('#8a1a14'), body2: T('#1a1414'), accent: T('#1a1414'), legs: T('#2a1a18'), boots: T('#1a1414'), trim: T('#d8a83a'), head: 'helm', headTone: T('#1a1414'), kabuto: 1, lamellar: 1, sode: 1, hair: T('#141010'), weapon: 'katana', shield: null, pauldron: null, cape: false }); break;
      case 'knight:bulbo': set({ armor: 'plate', body: T('#9aa0a8'), body2: T('#6a5a3a'), accent: T('#9aa0a8'), legs: T('#8a9098'), boots: T('#6a6e76'), trim: T('#b8bcc4'), head: 'greathelm', headTone: T('#a8aeb6'), plume: T('#a8aeb6'), bulb: 1, weapon: 'sword', shield: 'round', shieldC: '#8a9098', pauldron: 'round', cape: false }); break;
      case 'knight:solnegro': set({ armor: 'plate', body: T('#1a1818'), body2: T('#3a2a14'), accent: T('#1a1818'), legs: T('#1e1c1c'), boots: T('#141212'), trim: T('#d8a83a'), head: 'winged', headTone: T('#1e1c1c'), emblem: 'sun', cape: true, capeTone: T('#141212'), weapon: 'goldsword', shield: 'kite', shieldC: '#1a1818', shieldMark: 'sun', pauldron: 'wing' }); break;
      case 'knight:bronze': set({ armor: 'plate', body: T('#b07a3a'), body2: T('#5a3a1a'), accent: T('#8a5a2a'), legs: T('#a0702e'), boots: T('#6a4420'), trim: T('#e0a050'), head: 'helm', headTone: T('#b07a3a'), gears: 1, weapon: 'hammer', shield: 'round', shieldC: '#a0702e', shieldMark: 'runes', pauldron: 'round', cape: false }); break;
      case 'knight:daedrico': set({ armor: 'plate', body: T('#1a1012'), body2: T('#3a0a0a'), accent: T('#2a0a0a'), legs: T('#1e1214'), boots: T('#140a0c'), trim: T('#c82a1a'), head: 'horned', headTone: T('#1a1012'), pattern: 'scales', pauldron: 'spike', extra: 'ember', weapon: 'darkblade', shield: 'kite', shieldC: '#1a1012', shieldMark: 'dragon3', cape: true, capeTone: T('#3a0a0a'), spikes: 1 }); break;
      case 'knight:caria': set({ armor: 'plate', body: T('#3a5a9a'), body2: T('#1a2a4a'), accent: T('#2a3a6a'), legs: T('#34508a'), boots: T('#1e2a4a'), trim: T('#c8d8f0'), head: 'greathelm', headTone: T('#4a6aa8'), plume: T('#c8d8f0'), weapon: 'glowsword', shield: 'kite', shieldC: '#2a3a6a', pauldron: 'round', cape: true, capeTone: T('#1a2a4a') }); break;
      case 'archer:gales': set({ armor: 'leather', body: T('#4a6a3a'), body2: T('#6a4a2a'), legs: T('#5a4a34'), boots: T('#4a3220'), head: 'helm', headTone: T('#8a8e96'), hair: T('#6a4423'), beard: T('#6a4423'), quilted: 1, weapon: 'bow', quiver: true, trim: T('#8a7a5a'), cape: false }); break;
      case 'archer:rouxinol': set({ armor: 'leather', body: T('#1e1e22'), body2: T('#2a2a30'), legs: T('#1a1a1e'), boots: T('#141418'), head: 'hood', headTone: T('#16161a'), veil: '#141418', cape: true, capeTone: T('#141418'), weapon: 'bow', quiver: true, trim: T('#5a5a64') }); break;
      case 'archer:grifo': set({ armor: 'leather', body: T('#2a4a7a'), body2: T('#5a4a3a'), legs: T('#2e3a52'), boots: T('#3a2a1e'), head: 'none', hair: T('#4a3424'), beard: T('#4a3424'), quilted: 1, medallion: 'griffin', weapon: 'bow', quiver: true, trim: T('#c8ccd4'), cape: false }); break;
      case 'archer:rosa': set({ armor: 'leather', body: T('#3a6a2a'), body2: T('#d8a83a'), accent: T('#2e5222'), legs: T('#2e5222'), boots: T('#5a3a1e'), head: 'circlet', headTone: T('#e2c870'), hair: T('#8a4a22'), hairStyle: 'long', emblem: 'rose', cape: true, capeTone: T('#d8a83a'), weapon: 'elfbow', quiver: true, trim: T('#e2c870') }); if (!fem) femLook(L); break;
      case 'archer:mongol': set({ armor: 'leather', body: T('#6a3a1e'), body2: T('#3a5a7a'), legs: T('#4a3424'), boots: T('#3a2414'), head: 'none', mongol: 1, hair: T('#141010'), beard: T('#141010'), beardStyle: 'mustache', fur: '#5a4430', weapon: 'bow', quiver: true, trim: T('#d8a83a'), cape: false }); break;
      case 'archer:imortal': set({ armor: 'leather', body: T('#6a2a5a'), body2: T('#d8a83a'), accent: T('#3a5a8a'), legs: T('#3a3a5a'), boots: T('#5a3a1e'), head: 'none', tiara: '#ecdcb0', hair: T('#141010'), beard: T('#141010'), pattern: 'scales', weapon: 'bow', quiver: true, trim: T('#d8a83a'), cape: false }); break;
      case 'archer:vidro': set({ armor: 'plate', body: T('#6ab8a0'), body2: T('#3a6a5a'), accent: T('#4a8a78'), legs: T('#5aa08a'), boots: T('#3a6a5a'), trim: T('#c8ece0'), head: 'circlet', headTone: T('#a8e8d0'), hair: T('#e8dcc0'), hairStyle: 'long', glass: 1, weapon: 'elfbow', quiver: true, cape: false }); break;
      case 'archer:harad': set({ armor: 'leather', body: T('#a81a14'), body2: T('#d8a83a'), legs: T('#3a1a14'), boots: T('#5a3a1e'), head: 'none', turban: '#d8a83a', skin: T('#7a4a2a'), hair: T('#141010'), warpaint: 1, weapon: 'bow', quiver: true, trim: T('#e2b74e'), cape: true, capeTone: T('#a81a14') }); break;
      case 'archer:facanegra': set({ armor: 'leather', body: T('#141216'), body2: T('#2a2418'), accent: T('#141216'), legs: T('#141216'), boots: T('#0e0c10'), head: 'hood', headTone: T('#100e12'), veil: '#100e12', cape: true, capeTone: T('#100e12'), weapon: 'bow', quiver: true, trim: T('#c9a24a'), studs: 1 }); if (!fem) femLook(L); break;
      case 'archer:espectral': set({ armor: 'plate', body: T('#3a4a5a'), body2: T('#1a2a3a'), accent: T('#2a3a4a'), legs: T('#34404c'), boots: T('#1e2a36'), trim: T('#a8d8ff'), head: 'horned', headTone: T('#4a5a6a'), pauldron: 'spike', spikes: 1, extra: 'frost', weapon: 'frostbow', quiver: true, cape: true, capeTone: T('#1a2a3a') }); break;
      case 'mage:faraonico': set({ armor: 'robe', body: T('#f0ead8'), body2: T('#d8a83a'), head: 'none', nemes: 1, usekh: 1, skin: T('#a8744a'), hair: T('#141010'), beard: null, weapon: 'staff', orb: '#3a8ad8', trim: T('#d8a83a'), cape: false }); break;
      case 'mage:gelido': set({ armor: 'robe', body: T('#7a1414'), body2: T('#4a0a0a'), head: 'none', furhat: '#5a4430', fur: '#5a4430', hair: T('#2a1a10'), beard: null, weapon: 'wand', trim: T('#d8a83a'), cape: true, capeTone: T('#6a1010') }); break;
      case 'mage:azulfranca': set({ armor: 'robe', body: T('#7aa8d8'), body2: T('#4a78b0'), head: 'none', brim: 1, headTone: T('#6a98c8'), hatTall: 1, hair: T('#e8d8a8'), hairStyle: 'long', beard: null, weapon: 'wand', trim: T('#ecebe6'), cape: true, capeTone: T('#6a98c8') }); if (!fem) femLook(L); break;
      case 'mage:cacamagos': set({ armor: 'robe', body: T('#24221e'), body2: T('#3a3026'), head: 'none', hair: T('#2a1a10'), beard: T('#2a1a10'), beardStyle: 'stubble', weapon: 'wand', trim: T('#6a6458'), cape: true, capeTone: T('#1e1c1a'), longcoat: 1 }); break;
      case 'mage:bizantino': set({ armor: 'robe', body: T('#5a1a5a'), body2: T('#d8a83a'), head: 'none', mitre: '#d8a83a', hair: T('#e8e4dc'), beard: T('#e8e4dc'), beardLong: true, weapon: 'staff', orb: '#e8c860', trim: T('#d8a83a'), cape: true, capeTone: T('#d8a83a'), pattern: 'stars' }); break;
      case 'mage:jade': set({ armor: 'robe', body: T('#2a6a5a'), body2: T('#ecebe0'), head: 'none', jadecrown: 1, hair: T('#141010'), hairStyle: 'bun', beard: T('#141010'), beardStyle: 'goatee', weapon: 'staff', orb: '#7ad8a8', trim: T('#d8a83a'), cape: false }); break;
      case 'mage:muitasfaces': set({ armor: 'robe', body: T('#4a4a4c'), body2: T('#1e1e20'), head: 'hood', headTone: T('#3a3a3c'), hair: T('#2a2a2a'), beard: null, weapon: 'wand', trim: T('#1e1e20'), cape: true, capeTone: T('#2a2a2c') }); break;
      case 'mage:necromante': set({ armor: 'robe', body: T('#141216'), body2: T('#3a1a4a'), head: 'hood', headTone: T('#0e0c10'), hair: T('#e8e4dc'), beard: null, weapon: 'staff', orb: '#a84aff', skull: 1, trim: T('#6a3a8a'), cape: true, capeTone: T('#0e0c10') }); break;
      case 'mage:arvore': set({ armor: 'robe', body: T('#d8b050'), body2: T('#8a6a2a'), head: 'none', hair: T('#e8dcb0'), beard: T('#e8dcb0'), beardLong: true, extra: 'halo', weapon: 'starstaff', orb: '#ffe080', trim: T('#ffe8a0'), cape: true, capeTone: T('#b08a3a') }); break;
      case 'mage:lua': set({ armor: 'robe', body: T('#1a2a5a'), body2: T('#0e1636'), head: 'wizard', headTone: T('#1a2a5a'), moonhat: 1, hair: T('#e8e4f0'), hairStyle: 'long', beard: null, weapon: 'starstaff', orb: '#d8e8ff', trim: T('#c8d8f0'), cape: true, capeTone: T('#0e1636'), pattern: 'stars' }); if (!fem) femLook(L); break;
      default: return L;
    }
    if (fem) { femLook(L); L.beard = null; }
    return L; }; }

/* ---------- peças novas ---------- */
if (typeof buildHumanoid === 'function') {
  const _bh4 = buildHumanoid;
  buildHumanoid = function (L, opts = {}) {
    const R = _bh4(L, opts); if (!R || !R.chest) return R;
    const S = opts.scale || 1, ch = R.chest, H = R.head, hx = h => (h && h.hex) || h || '#888888';
    const band = (y, c, z = 0.15, w = 0.3) => ch.add(mesh(boxG(w * S, 0.012 * S, 0.01 * S), mat(c, 'metal'), 0, y * S, z * S));
    if (L.segs) for (let q = 0; q < 5; q++) band(0.14 - q * 0.05, '#d8d4c8', 0.152, 0.32);   /* couraça de lâminas romana */
    if (L.lamellar) for (let q = 0; q < 6; q++) band(0.15 - q * 0.045, '#d8a83a', 0.152, 0.3);   /* cordões da armadura de lâminas */
    if (L.quilted) for (let q = 0; q < 6; q++) band(0.15 - q * 0.05, '#2a2a20', 0.15, 0.28);   /* gibão acolchoado */
    if (L.sode) for (const s of [-1, 1]) { const g = mesh(boxG(0.14 * S, 0.16 * S, 0.12 * S), mat('#8a1a14', 'leather'), s * 0.24 * S, 0.17 * S, 0); g.rotation.z = s * 0.35; ch.add(g); for (let q = 0; q < 3; q++) { const b = mesh(boxG(0.145 * S, 0.008 * S, 0.125 * S), mat('#d8a83a', 'gold'), s * (0.24 - q * 0.015) * S, (0.21 - q * 0.05) * S, 0); b.rotation.z = s * 0.35; ch.add(b); } }   /* ombreiras largas (sode) */
    if (L.emblem === 'cross') { const m = mat('#141414', 'cloth'); ch.add(mesh(boxG(0.04 * S, 0.2 * S, 0.008 * S), m, 0, 0.04 * S, 0.153 * S)); ch.add(mesh(boxG(0.14 * S, 0.04 * S, 0.008 * S), m, 0, 0.08 * S, 0.153 * S)); }
    if (L.emblem === 'sun') { const g = mat('#e8b440', 'gold', { emissive: '#4a3008' }); const d = mesh(cylG(0.045 * S, 0.045 * S, 0.008 * S, 16), g, 0, 0.06 * S, 0.153 * S); d.rotation.x = Math.PI / 2; ch.add(d); for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2, r = mesh(boxG(0.012 * S, 0.035 * S, 0.006 * S), g, Math.cos(a) * 0.065 * S, 0.06 * S + Math.sin(a) * 0.065 * S, 0.153 * S); r.rotation.z = a - Math.PI / 2; ch.add(r); } }
    if (L.emblem === 'rose') { const r = mat('#d8a83a', 'gold'); for (let q = 0; q < 5; q++) { const a = q / 5 * Math.PI * 2; ch.add(mesh(sphG(0.018 * S), r, Math.cos(a) * 0.022 * S, 0.07 * S + Math.sin(a) * 0.022 * S, 0.15 * S)); } ch.add(mesh(sphG(0.014 * S), mat('#a8801a', 'gold'), 0, 0.07 * S, 0.158 * S)); }
    if (L.rocky) { const m = mat('#7a7468', 'darkmetal'); for (let q = 0; q < 9; q++) { const r = mesh(sphG((0.035 + (q % 3) * 0.01) * S), m, ((q % 3) - 1) * 0.08 * S, (0.12 - Math.floor(q / 3) * 0.08) * S, 0.13 * S); r.scale.set(1, 0.8, 0.5); ch.add(r); } }   /* placas de pedra empilhadas */
    if (L.bulb) { const m = mat('#a8aeb6', 'metal'); const b = mesh(sphG(0.2 * S), m, 0, 0.0, 0.01 * S); b.scale.set(1.2, 1.05, 1.0); ch.add(b); for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 2, f = mesh(boxG(0.008 * S, 0.36 * S, 0.01 * S), mat('#7a8088', 'metal'), Math.sin(a) * 0.235 * S, 0, Math.cos(a) * 0.2 * S); f.rotation.y = a; ch.add(f); } }   /* corpo arredondado de cebola, com gomos */
    if (L.gears) { const g = mat('#e0a050', 'gold'); for (const [x, y, r] of [[-0.06, 0.08, 0.04], [0.05, 0.02, 0.03]]) { const t = mesh(torG(r * S, 0.008 * S), g, x * S, y * S, 0.152 * S); ch.add(t); for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2; ch.add(mesh(boxG(0.012 * S, 0.012 * S, 0.008 * S), g, (x + Math.cos(a) * (r + 0.01)) * S, (y + Math.sin(a) * (r + 0.01)) * S, 0.152 * S)); } } }   /* engrenagens */
    if (L.spikes) { const m = mat(hx(L.trim), 'darkmetal'); for (const s of [-1, 1]) for (let q = 0; q < 3; q++) { const c = mesh(coneG(0.02 * S, 0.12 * S, 5), m, s * (0.18 + q * 0.03) * S, (0.3 - q * 0.02) * S, (-0.02 + q * 0.02) * S); c.rotation.z = -s * 0.6; ch.add(c); } }
    if (L.glass) { const m = mat('#9ae8d0', 'gem', { emissive: '#2a6a5a', emissiveIntensity: 0.4 }); for (const s of [-1, 1]) { const p = mesh(new THREE.OctahedronGeometry(0.06 * S), m, s * 0.2 * S, 0.24 * S, 0); p.scale.set(1, 0.6, 1); ch.add(p); } ch.add(mesh(new THREE.OctahedronGeometry(0.05 * S), m, 0, 0.08 * S, 0.14 * S)); }
    if (L.usekh) { const c = mesh(cylG(0.16 * S, 0.12 * S, 0.06 * S, 20, 1, true), mat('#d8a83a', 'gold'), 0, 0.29 * S, 0); ch.add(c); for (const col of ['#3a8ad8', '#c83a2a']) { const r = mesh(torG(0.135 * S, 0.01 * S), mat(col, 'gem'), 0, (col === '#3a8ad8' ? 0.3 : 0.275) * S, 0); r.rotation.x = Math.PI / 2; ch.add(r); } }   /* colar largo de ouro e pedras */
    if (L.longcoat && R.cape) { R.cape.scale.y = Math.max(R.cape.scale.y, 1.15); }
    if (L.skull) { const b = mat('#e8e0c8', 'bone'); ch.add(mesh(sphG(0.03 * S), b, 0.1 * S, -0.05 * S, 0.14 * S)); }
    if (H) {
      if (L.crest === 'roman') { const p = mat(hx(L.plume), 'hair'); const c = mesh(boxG(0.04 * S, 0.09 * S, 0.26 * S), p, 0, 0.18 * S, -0.01 * S); H.add(c); for (const s of [-1, 1]) H.add(mesh(boxG(0.012 * S, 0.1 * S, 0.06 * S), mat('#c0a060', 'gold'), s * 0.105 * S, -0.04 * S, 0.04 * S)); }   /* crista vermelha e protetores das faces */
      if (L.kabuto) { const k = mat('#1a1414', 'darkmetal'), g = mat('#d8a83a', 'gold'); const sh = mesh(new THREE.ConeGeometry(0.2 * S, 0.12 * S, 16, 1, true), k, 0, 0.0, -0.02 * S); H.add(sh); const moon = mesh(torG(0.09 * S, 0.012 * S, 4, 16, Math.PI), g, 0, 0.17 * S, 0.06 * S); moon.rotation.z = Math.PI; H.add(moon); H.add(mesh(sphG(0.02 * S), g, 0, 0.1 * S, 0.1 * S)); }   /* elmo de abas (shikoro) e a lua crescente (maedate) */
      if (L.mongol) { const m = mat('#8a8e96', 'metal'); H.add(mesh(coneG(0.11 * S, 0.16 * S, 12), m, 0, 0.14 * S, 0)); H.add(mesh(torG(0.11 * S, 0.03 * S), mat('#5a4430', 'fur'), 0, 0.07 * S, 0)); H.children[H.children.length - 1].rotation.x = Math.PI / 2; const pl = mesh(capG(0.01 * S, 0.16 * S), mat('#a81a14', 'hair'), 0, 0.28 * S, -0.02 * S); pl.rotation.x = -0.4; H.add(pl); }   /* elmo cônico com aba de pele e pluma */
      if (L.tiara) { const m = mat(L.tiara, 'cloth'); H.add(mesh(cylG(0.09 * S, 0.11 * S, 0.16 * S, 14), m, 0, 0.13 * S, 0)); H.add(mesh(torG(0.105 * S, 0.01 * S), mat('#d8a83a', 'gold'), 0, 0.07 * S, 0)); H.children[H.children.length - 1].rotation.x = Math.PI / 2; }   /* gorro alto dos Imortais */
      if (L.turban) { const m = mat(L.turban, 'cloth'); for (let q = 0; q < 3; q++) { const t = mesh(torG(0.1 * S, 0.035 * S), m, 0, (0.06 + q * 0.035) * S, 0); t.rotation.x = Math.PI / 2 + (q - 1) * 0.15; H.add(t); } H.add(mesh(sphG(0.07 * S), m, 0, 0.12 * S, 0)); }
      if (L.warpaint) { const m = mat('#e8e0c8', 'cloth'); for (const s of [-1, 1]) H.add(mesh(boxG(0.03 * S, 0.008 * S, 0.006 * S), m, s * 0.04 * S, -0.02 * S, 0.1 * S)); }
      if (L.nemes) { const a = mat('#3a5a9a', 'cloth'), b = mat('#d8a83a', 'cloth'); const cap = mesh(sphG(0.118 * S), a, 0, 0.02 * S, -0.005 * S); cap.scale.set(1.0, 0.95, 1.05); H.add(cap); for (const s of [-1, 1]) for (let q = 0; q < 4; q++) H.add(mesh(boxG(0.05 * S, 0.035 * S, 0.03 * S), q % 2 ? b : a, s * 0.1 * S, (-0.04 - q * 0.035) * S, 0.03 * S)); for (let q = 0; q < 5; q++) { const st = mesh(torG(0.119 * S, 0.006 * S), b, 0, (0.06 - q * 0.025) * S, -0.005 * S); st.rotation.x = Math.PI / 2; H.add(st); } }   /* toucado listrado azul e ouro */
      if (L.furhat) { const m = mat(L.furhat, 'fur'); const h = mesh(cylG(0.12 * S, 0.125 * S, 0.12 * S, 16), m, 0, 0.12 * S, 0); H.add(h); }   /* gorro de pele */
      if (L.hatTall) { const m = mat(hx(L.headTone), 'cloth'); H.add(mesh(coneG(0.1 * S, 0.22 * S, 14), m, 0, 0.2 * S, 0)); }   /* chapéu pontudo de feltro, aba pequena */
      if (L.mitre) { const m = mat(L.mitre, 'gold'); const h = mesh(cylG(0.08 * S, 0.11 * S, 0.2 * S, 16), m, 0, 0.15 * S, 0); H.add(h); H.add(mesh(sphG(0.03 * S), mat('#c83a2a', 'gem'), 0, 0.27 * S, 0)); }   /* gorro alto bordado */
      if (L.jadecrown) { const m = mat('#5ab88a', 'gem'); H.add(mesh(boxG(0.06 * S, 0.05 * S, 0.1 * S), m, 0, 0.13 * S, -0.02 * S)); H.add(mesh(cylG(0.005 * S, 0.005 * S, 0.18 * S, 5), mat('#d8a83a', 'gold'), 0, 0.14 * S, -0.02 * S)); H.children[H.children.length - 1].rotation.x = Math.PI / 2; }   /* coroinha de jade com o grampo */
      if (L.moonhat) { const g = mat('#e8ecff', 'gem', { emissive: '#6a7ac8', emissiveIntensity: 0.8 }); const m = mesh(torG(0.06 * S, 0.012 * S, 4, 16, Math.PI * 1.4), g, 0, 0.42 * S, 0.02 * S); m.rotation.z = 0.8; H.add(m); H.add(mesh(torG(0.115 * S, 0.014 * S), mat('#c8d8f0', 'gold'), 0, 0.09 * S, 0)); H.children[H.children.length - 1].rotation.x = Math.PI / 2; const hat = mesh(coneG(0.09 * S, 0.5 * S, 14), mat(hx(L.headTone), 'cloth'), 0, 0.4 * S, 0); H.add(hat); }   /* chapéu altíssimo com a lua */
    }
    return R; };
}
if (typeof buildShield === 'function') {
  const _bs4 = buildShield;
  buildShield = function (L, S, accM, trimM) {
    if (L.shield === 'scutum' || L.shield === 'tower') {   /* escudo retangular curvo (romano) ou escudo-torre de pedra */
      const g = new THREE.Group(), tw = L.shield === 'tower', w = tw ? 0.46 : 0.36, h = tw ? 0.8 : 0.62, c = mat(L.shieldC || '#9a1a14', tw ? 'darkmetal' : 'leather');
      const geo = new THREE.CylinderGeometry(w * 1.2 * S, w * 1.2 * S, h * S, 16, 1, true, -0.5, 1.0); const body = mesh(geo, c, 0, -0.05 * S, -w * 1.2 * S + 0.03 * S); g.add(body);
      if (!tw) { const gd = mat('#d8a83a', 'gold'); g.add(mesh(sphG(0.05 * S), gd, 0, -0.05 * S, 0.04 * S)); for (const s of [-1, 1]) g.add(mesh(boxG(0.012 * S, h * 0.9 * S, 0.01 * S), gd, s * 0.12 * S, -0.05 * S, 0.02 * S)); }
      return g; }
    const g = _bs4(L, S, accM, trimM);
    if (L.shield === 'kite' && L.shieldMark === 'cross') { const m = mat('#141414', 'cloth'); g.add(mesh(boxG(0.05 * S, 0.3 * S, 0.01 * S), m, 0, -0.03 * S, 0.045 * S)); g.add(mesh(boxG(0.22 * S, 0.05 * S, 0.01 * S), m, 0, 0.05 * S, 0.045 * S)); }
    if (L.shield === 'kite' && L.shieldMark === 'sun') { const m = mat('#e8b440', 'gold'); const d = mesh(cylG(0.08 * S, 0.08 * S, 0.01 * S, 16), m, 0, 0.0, 0.045 * S); d.rotation.x = Math.PI / 2; g.add(d); }
    return g; };
}
if (typeof buildWeapon === 'function') {
  const _bw4 = buildWeapon;
  buildWeapon = function (L, S, trimM) {
    if (L.weapon === 'katana' || L.weapon === 'glowsword') {   /* katana curva / espada de luz azul */
      const obj = new THREE.Group(), kat = L.weapon === 'katana';
      obj.add(mesh(cylG(0.016 * S, 0.018 * S, 0.22 * S, 8), mat(kat ? '#1a1414' : '#2a3a6a', 'leather'), 0, 0.08 * S, 0));
      obj.add(mesh(cylG(0.045 * S, 0.045 * S, 0.01 * S, 12), mat(kat ? '#d8a83a' : '#c8d8f0', 'gold'), 0, -0.035 * S, 0));
      const bm = kat ? mat('#dfe4ec', 'metal') : mat('#8ac0ff', 'gem', { emissive: '#3a7aff', emissiveIntensity: 1.6 }), len = kat ? 0.85 : 0.9;
      for (let q = 0; q < 6; q++) { const t = (q + 0.5) / 6, seg = mesh(boxG(0.04 * S, len / 6 * S + 0.002, 0.01 * S), bm, (kat ? t * t * 0.06 : 0) * S, (-0.04 - t * len) * S, 0); seg.rotation.z = kat ? t * 0.12 : 0; obj.add(seg); }
      return { obj }; }
    return _bw4(L, S, trimM); };
}
