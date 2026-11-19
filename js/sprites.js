// ============================================================
//  SPRITES — heróis (esqueleto com membros dinâmicos), NPCs,
//  monstros e ícones, em pixel art realista (resolução 2x).
// ============================================================
// ---------- visual de cada skin ----------
function heroLook(cls, skinId, accentHex) {
  const A = tone(accentHex || '#8b2e2e');
  const L = {
    skin: tone('#d8a47f'), hair: tone('#4a3424'), hairStyle: 'short', beard: null, eyes: px('#20160e'),
    armor: 'plate', body: tone('#a3a9b3'), body2: tone('#5b3a22'), accent: A, legs: tone('#4b4a52'), boots: tone('#3b2a1f'),
    cape: false, capeTone: tone(shadeHex(accentHex, -0.25)), head: 'none', headTone: tone('#a3a9b3'), plume: A,
    weapon: null, shield: null, pauldron: null, quiver: false, trim: tone('#c9a24a'), orb: '#7fb2ff', pattern: null, extra: null,
  };
  switch (cls + ':' + skinId) {
    case 'knight:iron': Object.assign(L, { armor: 'plate', head: 'greathelm', cape: true, weapon: 'sword', shield: 'kite', pauldron: 'round' }); break;
    case 'knight:dragon': Object.assign(L, {
      armor: 'plate', body: tone('#4a2326'), body2: tone('#2a1416'), headTone: tone('#3a1c1e'), head: 'horned', cape: true,
      capeTone: tone('#5a1414'), weapon: 'darkblade', shield: 'dragon', pauldron: 'spike', legs: tone('#2c2224'), boots: tone('#1e1517'),
      trim: tone('#b8442e'), pattern: 'scales', extra: 'ember' }); break;
    case 'knight:sun': Object.assign(L, {
      armor: 'plate', body: tone('#e3dccb'), body2: tone('#b58a3a'), headTone: tone('#d9b65a'), head: 'winged', cape: true,
      capeTone: tone('#f0ead8'), weapon: 'goldsword', shield: 'sun', pauldron: 'wing', legs: tone('#cfc6b0'), boots: tone('#8a6a34'),
      trim: tone('#e2b74e'), extra: 'halo' }); break;
    case 'archer:scout': Object.assign(L, { armor: 'leather', body: tone('#5d6b3c'), body2: tone('#6b4a2b'), head: 'hood', weapon: 'bow', quiver: true, legs: tone('#5a4636'), boots: tone('#4a3220'), hair: tone('#6b4423') }); break;
    case 'archer:winter': Object.assign(L, {
      armor: 'leather', body: tone('#3f5a78'), body2: tone('#d9dde2'), head: 'furhood', headTone: tone('#e4e7ea'), weapon: 'frostbow', quiver: true,
      legs: tone('#3b4656'), boots: tone('#cfd5dc'), cape: true, capeTone: tone('#c9d0d8'), hair: tone('#c9c2b8'), extra: 'frost' }); break;
    case 'archer:sylvan': Object.assign(L, {
      armor: 'leather', body: tone('#3e7449'), body2: tone('#c9a24a'), head: 'circlet', hairStyle: 'long', hair: tone('#e0c27a'), weapon: 'elfbow',
      quiver: true, legs: tone('#2f5236'), boots: tone('#6b4a2b'), cape: true, capeTone: tone(shadeHex(accentHex, -0.1)), pattern: 'leaves', skin: tone('#e8c3a0'), extra: 'leaf' }); break;
    case 'mage:adept': Object.assign(L, { armor: 'robe', body: A, body2: tone(shadeHex(accentHex, -0.45)), head: 'wizard', headTone: tone(shadeHex(accentHex, -0.2)), weapon: 'staff', beard: tone('#cfc9c0'), hair: tone('#cfc9c0') }); break;
    case 'mage:astral': Object.assign(L, {
      armor: 'robe', body: tone('#22305e'), body2: tone('#141c3a'), head: 'astralhood', headTone: tone('#1b2550'), weapon: 'starstaff', orb: '#c9e1ff',
      pattern: 'stars', trim: tone('#d9c27a'), cape: true, capeTone: tone(shadeHex(accentHex, -0.3)), extra: 'orbit', hair: tone('#e8e4dc') }); break;
    case 'mage:druid': Object.assign(L, {
      armor: 'robe', body: tone('#5c4a33'), body2: tone('#3f5a32'), head: 'antlerhood', headTone: tone('#4a6b38'), weapon: 'druidstaff', orb: '#9be37a',
      beard: tone('#d8d2c4'), hair: tone('#d8d2c4'), pattern: 'leaves', trim: tone('#8fbf5a'), extra: 'leaf' }); break;
  }
  return L;
}
function shadeHex(hex, amt) {
  const [r, g, b] = rgbOf(hex || '#888888'); const t = amt < 0 ? 0 : 255, f = Math.abs(amt);
  const h = v => Math.round(v + (t - v) * f).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}
const NPC_LOOKS = {
  jailer: () => Object.assign(heroLook('knight', 'iron', '#4a3a2a'), { armor: 'leather', body: tone('#4a3a2a'), body2: tone('#2a2018'), accent: tone('#6a5a3a'), trim: tone('#8a7a50'), legs: tone('#3a2e22'), boots: tone('#1e1610'), head: 'none', hair: tone('#2a1e14'), beard: tone('#2a1e14'), weapon: 'club', shield: null, capeTone: null, skin: tone('#c89878') }),
  executioner: () => Object.assign(heroLook('knight', 'iron', '#1c1816'), { armor: 'leather', body: tone('#1c1816'), body2: tone('#3a2a1e'), accent: tone('#1c1816'), trim: tone('#4a3a2a'), legs: tone('#2a2420'), boots: tone('#1a1410'), head: 'hood', headTone: tone('#0e0c0b'), weapon: 'axe', shield: null, capeTone: null, skin: tone('#c89a7a') }),
  noble: () => Object.assign(heroLook('archer', 'scout', '#3a2a5a'), { armor: 'robe', body: tone('#3a2a5a'), body2: tone('#d8c890'), accent: tone('#d4a94a'), trim: tone('#d4a94a'), head: 'circlet', hairStyle: 'long', hair: tone('#c8a060'), weapon: null, quiver: false, capeTone: tone('#2a1a40'), skin: tone('#f0d0b8') }),
  noble2: () => Object.assign(heroLook('knight', 'iron', '#1e3a5a'), { armor: 'leather', body: tone('#1e3a5a'), body2: tone('#d8c890'), accent: tone('#d4a94a'), trim: tone('#d4a94a'), head: 'none', hair: tone('#3a2a1a'), beard: tone('#3a2a1a'), weapon: 'sword', shield: null, capeTone: tone('#5a1420'), skin: tone('#e0b898') }),
  gardener: () => Object.assign(heroLook('archer', 'scout', '#4a5a2a'), { armor: 'vest', body: tone('#5a6a3a'), body2: tone('#c8b890'), head: 'cap', headTone: tone('#6a5a3a'), weapon: null, quiver: false, hair: tone('#8a7a6a'), beard: tone('#8a7a6a'), skin: tone('#d8a880') }),
  st_wheat: () => Object.assign(heroLook('knight', 'iron', '#7a6a3a'), { armor: 'robe', body: tone('#7a6a3a'), body2: tone('#d8c890'), accent: tone('#5a3a1a'), trim: tone('#5a3a1a'), head: 'none', hair: tone('#c8a04a'), beard: tone('#c8a04a'), weapon: null, capeTone: null, skin: tone('#d8a070') }),
  st_mill: () => Object.assign(heroLook('archer', 'scout', '#e8e0cc'), { armor: 'robe', body: tone('#e8e0cc'), body2: tone('#a8a090'), accent: tone('#6a5a3a'), trim: tone('#6a5a3a'), head: 'none', hairStyle: 'long', hair: tone('#8a8478'), weapon: null, quiver: false, capeTone: null, skin: tone('#e8c8a8') }),
  st_bakery: () => Object.assign(heroLook('knight', 'iron', '#f0ead8'), { armor: 'robe', body: tone('#f0ead8'), body2: tone('#c8a878'), accent: tone('#c8a878'), trim: tone('#8a6a3a'), head: 'none', hair: tone('#3a2a1a'), beard: tone('#3a2a1a'), weapon: null, capeTone: null, skin: tone('#e8b890') }),
  st_saw: () => Object.assign(heroLook('knight', 'iron', '#6a4a2a'), { armor: 'robe', body: tone('#6a4a2a'), body2: tone('#c8b890'), accent: tone('#3a2a1a'), trim: tone('#3a2a1a'), head: 'none', hair: tone('#3a2a1a'), beard: tone('#3a2a1a'), weapon: null, capeTone: null, skin: tone('#d8a880') }),
  st_mine: () => Object.assign(heroLook('knight', 'iron', '#4a4a50'), { armor: 'robe', body: tone('#4a4a50'), body2: tone('#8a7a60'), accent: tone('#2a2a2a'), trim: tone('#6a5a3a'), head: 'none', hair: tone('#a85a2a'), beard: tone('#a85a2a'), weapon: null, capeTone: null, skin: tone('#c89878') }),
  st_farm: () => Object.assign(heroLook('archer', 'scout', '#5a7a3a'), { armor: 'robe', body: tone('#5a7a3a'), body2: tone('#e8dcb8'), accent: tone('#e8dcb8'), trim: tone('#7a5a2a'), head: 'none', hairStyle: 'long', hair: tone('#b8862a'), weapon: null, quiver: false, capeTone: null, skin: tone('#e2b896') }),
  st_carp: () => Object.assign(heroLook('archer', 'scout', '#8a6a3a'), { armor: 'robe', body: tone('#8a6a3a'), body2: tone('#d8c8a0'), accent: tone('#4a3018'), trim: tone('#4a3018'), head: 'none', hair: tone('#5a3a20'), beard: null, weapon: null, quiver: false, capeTone: null, skin: tone('#dcae88') }),
  st_alch: () => Object.assign(heroLook('mage', 'adept', '#3e5a46'), { armor: 'robe', body: tone('#3e5a46'), body2: tone('#c8b890'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hairStyle: 'long', hair: tone('#a8342a'), beard: null, weapon: null, capeTone: null, skin: tone('#e8c4a4') }),
  st_apoth: () => Object.assign(heroLook('mage', 'adept', '#6a3a5a'), { armor: 'robe', body: tone('#6a3a5a'), body2: tone('#efe6cf'), accent: tone('#efe6cf'), trim: tone('#3a2a1a'), head: 'none', hairStyle: 'long', hair: tone('#2a1a10'), beard: null, weapon: null, capeTone: null, skin: tone('#d8a888') }),
  st_witch: () => Object.assign(heroLook('mage', 'adept', '#3a1e4a'), { armor: 'robe', body: tone('#3a1e4a'), body2: tone('#5aa89a'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hairStyle: 'long', hair: tone('#1a1418'), beard: null, weapon: null, capeTone: null, skin: tone('#f0d8c8') }),
  st_arcane: () => Object.assign(heroLook('mage', 'adept', '#2a2a5a'), { armor: 'robe', body: tone('#2a2a5a'), body2: tone('#8a7ac8'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hair: tone('#e8e4dc'), beard: null, weapon: null, capeTone: null, skin: tone('#e8c8b0') }),
  st_tailor: () => Object.assign(heroLook('archer', 'scout', '#a83a4a'), { armor: 'robe', body: tone('#a83a4a'), body2: tone('#efe6cf'), accent: tone('#efe6cf'), trim: tone('#d4a94a'), head: 'none', hairStyle: 'long', hair: tone('#8a8478'), weapon: null, quiver: false, capeTone: null, skin: tone('#e6c0a0') }),
  st_scroll: () => Object.assign(heroLook('mage', 'adept', '#4a3a2a'), { armor: 'robe', body: tone('#4a3a2a'), body2: tone('#d8ccb0'), accent: tone('#1a1a1a'), trim: tone('#1a1a1a'), head: 'none', hair: tone('#6a6a6a'), beard: tone('#8a8a8a'), weapon: null, capeTone: null, skin: tone('#dcb090') }),
  courier1: () => Object.assign(heroLook('archer', 'scout', '#3a6a8a'), { armor: 'robe', body: tone('#3a6a8a'), body2: tone('#d8c8a0'), accent: tone('#c9a24a'), trim: tone('#5a3a1a'), head: 'none', hair: tone('#d8a84a'), beard: null, weapon: null, quiver: false, capeTone: null, skin: tone('#e8c0a0') }),
  courier2: () => Object.assign(heroLook('archer', 'scout', '#7a5a2a'), { armor: 'robe', body: tone('#7a5a2a'), body2: tone('#c84a3a'), accent: tone('#c84a3a'), trim: tone('#3a2a1a'), head: 'none', hairStyle: 'long', hair: tone('#1a1410'), weapon: null, quiver: false, capeTone: null, skin: tone('#b88866') }),
  courier3: () => Object.assign(heroLook('knight', 'iron', '#5a5040'), { armor: 'robe', body: tone('#5a5040'), body2: tone('#a89878'), accent: tone('#3a2a1a'), trim: tone('#3a2a1a'), head: 'none', hair: tone('#4a3a2a'), beard: tone('#4a3a2a'), weapon: null, capeTone: null, skin: tone('#cc9c78') }),
  v_house1: () => Object.assign(heroLook('archer', 'scout', '#8a5a6a'), { armor: 'robe', body: tone('#8a5a6a'), body2: tone('#efe6cf'), accent: tone('#efe6cf'), trim: tone('#5a3a2a'), head: 'hood', hairStyle: 'long', hair: tone('#5a3a20'), weapon: null, quiver: false, capeTone: null, skin: tone('#e2b896') }),
  v_house2: () => Object.assign(heroLook('archer', 'scout', '#4a6a8a'), { armor: 'robe', body: tone('#4a6a8a'), body2: tone('#e8dcc0'), accent: tone('#e8dcc0'), trim: tone('#3a2a1a'), head: 'none', hairStyle: 'long', hair: tone('#2a1a10'), weapon: null, quiver: false, capeTone: null, skin: tone('#c89878') }),
  v_trav1: () => Object.assign(heroLook('knight', 'iron', '#5a4a3a'), { armor: 'leather', body: tone('#5a4a3a'), body2: tone('#8a7a5a'), accent: tone('#3a2a1a'), trim: tone('#3a2a1a'), head: 'hood', hair: tone('#4a3a2a'), beard: tone('#4a3a2a'), weapon: null, capeTone: tone('#3a3428'), skin: tone('#d8a880') }),
  v_trav2: () => Object.assign(heroLook('archer', 'scout', '#3a5a3a'), { armor: 'leather', body: tone('#3a5a3a'), body2: tone('#a89878'), accent: tone('#2a2a1a'), trim: tone('#2a2a1a'), head: 'hood', hair: tone('#8a6a4a'), weapon: null, quiver: false, capeTone: tone('#2a3a2a'), skin: tone('#e2b896') }),
  v_vis1: () => Object.assign(heroLook('mage', 'adept', '#7a6a3a'), { armor: 'robe', body: tone('#7a6a3a'), body2: tone('#d8c8a0'), accent: tone('#c9a24a'), trim: tone('#5a4a2a'), head: 'none', hair: tone('#3a2a1a'), beard: null, weapon: null, capeTone: null, skin: tone('#dcb090') }),
  v_vis2: () => Object.assign(heroLook('archer', 'scout', '#a85a3a'), { armor: 'robe', body: tone('#a85a3a'), body2: tone('#efe6cf'), accent: tone('#efe6cf'), trim: tone('#5a3a1a'), head: 'none', hairStyle: 'long', hair: tone('#c8962a'), weapon: null, quiver: false, capeTone: null, skin: tone('#ecc8a8') }),
  v_thug1: () => Object.assign(heroLook('archer', 'scout', '#2a2a2a'), { armor: 'leather', body: tone('#2a2a2a'), body2: tone('#4a3a2a'), accent: tone('#1a1a1a'), trim: tone('#5a1a1a'), head: 'hood', hair: tone('#1a1a1a'), weapon: null, quiver: false, capeTone: tone('#1e1e1e'), skin: tone('#c89878') }),
  v_thug2: () => Object.assign(heroLook('knight', 'iron', '#3a2a2a'), { armor: 'leather', body: tone('#3a2a2a'), body2: tone('#2a2420'), accent: tone('#1a1a1a'), trim: tone('#3a1a1a'), head: 'none', hair: tone('#2a1a10'), beard: tone('#2a1a10'), weapon: null, capeTone: null, skin: tone('#b8886a') }),
  supplier: () => Object.assign(heroLook('knight', 'iron', '#6a4a2a'), { armor: 'leather', body: tone('#6a4a2a'), body2: tone('#c8b890'), accent: tone('#3a2a1a'), trim: tone('#3a2a1a'), head: 'none', hair: tone('#5a4030'), beard: tone('#5a4030'), weapon: null, capeTone: null, skin: tone('#d8a880') }),
  banker: () => Object.assign(heroLook('mage', 'adept', '#1e2a3a'), { armor: 'robe', body: tone('#1e2a3a'), body2: tone('#c9a24a'), accent: tone('#c9a24a'), trim: tone('#e2b74e'), head: 'none', hair: tone('#c8c4bc'), beard: tone('#c8c4bc'), weapon: null, capeTone: tone('#14141e'), skin: tone('#e2c0a0') }),
  banker2: () => Object.assign(heroLook('mage', 'adept', '#2a2a3a'), { armor: 'robe', body: tone('#2a2a3a'), body2: tone('#e8dcc0'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hairStyle: 'long', hair: tone('#5a3a20'), beard: null, weapon: null, capeTone: null, skin: tone('#e8c4a4') }),
  banker3: () => Object.assign(heroLook('mage', 'adept', '#2a2a3a'), { armor: 'robe', body: tone('#2a2a3a'), body2: tone('#e8dcc0'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hair: tone('#3a2a1a'), beard: tone('#3a2a1a'), weapon: null, capeTone: null, skin: tone('#c89878') }),
  v_house3: () => Object.assign(heroLook('archer', 'scout', '#6a7a3a'), { armor: 'robe', body: tone('#6a7a3a'), body2: tone('#efe6cf'), accent: tone('#c84a3a'), trim: tone('#4a3a1a'), head: 'hood', hairStyle: 'long', hair: tone('#a8682a'), weapon: null, quiver: false, capeTone: null, skin: tone('#ecc8a8') }),
  v_house4: () => Object.assign(heroLook('archer', 'scout', '#7a4a3a'), { armor: 'robe', body: tone('#7a4a3a'), body2: tone('#d8c8a0'), accent: tone('#d8c8a0'), trim: tone('#3a2a1a'), head: 'none', hairStyle: 'long', hair: tone('#888078'), weapon: null, quiver: false, capeTone: null, skin: tone('#d8a888') }),
  v_trav3: () => Object.assign(heroLook('archer', 'scout', '#8a2a4a'), { armor: 'robe', body: tone('#8a2a4a'), body2: tone('#e8c84a'), accent: tone('#e8c84a'), trim: tone('#3a8a6a'), head: 'none', hair: tone('#c8962a'), beard: null, weapon: null, quiver: false, capeTone: tone('#3a8a6a'), skin: tone('#e8c0a0') }),
  v_monk: () => Object.assign(heroLook('mage', 'adept', '#7a5a3a'), { armor: 'robe', body: tone('#7a5a3a'), body2: tone('#5a4028'), accent: tone('#3a2a1a'), trim: tone('#3a2a1a'), head: 'hood', hair: tone('#3a2a1a'), beard: tone('#5a4a3a'), weapon: 'staff', capeTone: null, skin: tone('#d8a880') }),
  v_noblef: () => Object.assign(heroLook('mage', 'adept', '#5a1a4a'), { armor: 'robe', body: tone('#5a1a4a'), body2: tone('#f0e0b0'), accent: tone('#e2b74e'), trim: tone('#e2b74e'), head: 'none', hairStyle: 'long', hair: tone('#2a1a10'), weapon: null, capeTone: tone('#3a0e2a'), skin: tone('#f0d0b8') }),
  v_noblem: () => Object.assign(heroLook('knight', 'iron', '#1e3a5a'), { armor: 'leather', body: tone('#1e3a5a'), body2: tone('#e8dcc0'), accent: tone('#e2b74e'), trim: tone('#e2b74e'), head: 'none', hair: tone('#d8c8a0'), beard: tone('#d8c8a0'), weapon: null, shield: null, capeTone: tone('#5a1a1a'), skin: tone('#ecc8a8') }),
  v_peasm: () => Object.assign(heroLook('knight', 'iron', '#7a6a4a'), { armor: 'leather', body: tone('#7a6a4a'), body2: tone('#a89878'), accent: tone('#4a3a2a'), trim: tone('#4a3a2a'), head: 'none', hair: tone('#5a3a20'), beard: tone('#5a3a20'), weapon: null, shield: null, capeTone: null, skin: tone('#c8946a') }),
  v_peasf: () => Object.assign(heroLook('archer', 'scout', '#8a7a5a'), { armor: 'robe', body: tone('#8a7a5a'), body2: tone('#e8dcc0'), accent: tone('#e8dcc0'), trim: tone('#5a4a2a'), head: 'hood', hairStyle: 'long', hair: tone('#3a2414'), weapon: null, quiver: false, capeTone: null, skin: tone('#c89070') }),
  v_elderm: () => Object.assign(heroLook('mage', 'adept', '#4a4a4a'), { armor: 'robe', body: tone('#4a4a4a'), body2: tone('#8a8a8a'), accent: tone('#2a2a2a'), trim: tone('#2a2a2a'), head: 'none', hair: tone('#e8e4dc'), beard: tone('#e8e4dc'), weapon: 'staff', capeTone: null, skin: tone('#d8b096') }),
  v_elderf: () => Object.assign(heroLook('archer', 'scout', '#3a3a5a'), { armor: 'robe', body: tone('#3a3a5a'), body2: tone('#d8d0c0'), accent: tone('#d8d0c0'), trim: tone('#2a2a3a'), head: 'hood', hairStyle: 'long', hair: tone('#d8d4cc'), weapon: null, quiver: false, capeTone: null, skin: tone('#e2bca0') }),
  agent: () => Object.assign(heroLook('archer', 'scout', '#e4dcc4'), { armor: 'vest', body: tone('#e4dcc4'), body2: tone('#f6f2ea'), accent: tone('#5a2a1a'), trim: tone('#c9a24a'), legs: tone('#d8cfb4'), boots: tone('#4a2e1a'), head: 'none', hair: tone('#2a2420'), beard: null, mustache: '#2a2420', fez: '#a8201a', weapon: null, shield: null, quiver: false, capeTone: null, skin: tone('#b8875e') }),   /* Mestre Farid: fez vermelho, terno de linho, bigode */
  v_candf: () => Object.assign(heroLook('archer', 'scout', '#7a3a3a'), { armor: 'vest', body: tone('#7a3a3a'), body2: tone('#7a3a3a'), accent: tone('#efe6d2'), trim: tone('#4a2a1a'), legs: tone('#3a2a3a'), boots: tone('#3a2416'), head: 'none', hairStyle: 'long', hair: tone('#2a1a10'), beard: null, weapon: null, shield: null, quiver: false, capeTone: null, skin: tone('#c89a74'), apron: '#efe6d2', scarf: '#c8a040' }),
  v_maidf: () => Object.assign(heroLook('archer', 'scout', '#6a4a5a'), { armor: 'robe', body: tone('#6a4a5a'), body2: tone('#f4efe2'), accent: tone('#f4efe2'), trim: tone('#5a3a2a'), head: 'none', hairStyle: 'long', hair: tone('#4a2e1a'), beard: null, weapon: null, shield: null, quiver: false, capeTone: null, skin: tone('#e2b896'), apron: '#f4efe2', scarf: '#b84a3a' }),
  v_maidm: () => Object.assign(heroLook('archer', 'scout', '#4a5a4a'), { armor: 'vest', body: tone('#4a5a4a'), body2: tone('#4a5a4a'), accent: tone('#d8ccb0'), trim: tone('#5a3a2a'), legs: tone('#3a3428'), head: 'none', hair: tone('#2a1e14'), beard: null, weapon: null, shield: null, quiver: false, capeTone: null, skin: tone('#c89a74'), apron: '#efe6d2' }),
  v_maiko: () => Object.assign(heroLook('archer', 'scout', '#6a1420'), { armor: 'robe', body: tone('#6a1420'), body2: tone('#141010'), accent: tone('#c8302a'), trim: tone('#d4a94a'), head: 'none', hairStyle: 'long', hair: tone('#0e0a0a'), beard: null, weapon: null, shield: null, quiver: false, capeTone: null, skin: tone('#f6f0ea'), furisode: 1, obi: '#141010', obiGold: '#d4a94a', collar: '#c8302a', sakura: 1, nihongami: 1, lips: '#c8102a' }),   /* Celina: maiko de quimono vermelho-escuro com cerejeiras */
  v_maidf2: () => Object.assign(heroLook('archer', 'scout', '#3a4e6e'), { armor: 'robe', body: tone('#3a4e6e'), body2: tone('#f4efe2'), accent: tone('#f4efe2'), trim: tone('#2a3040'), head: 'none', hairStyle: 'long', hair: tone('#1a1410'), beard: null, weapon: null, shield: null, quiver: false, capeTone: null, skin: tone('#a8764e'), apron: '#f4efe2', scarf: '#4a7a4a' }),
  v_maidm2: () => Object.assign(heroLook('archer', 'scout', '#6a4a2e'), { armor: 'vest', body: tone('#6a4a2e'), body2: tone('#6a4a2e'), accent: tone('#d8ccb0'), trim: tone('#3a2416'), legs: tone('#2e2a24'), head: 'none', hair: tone('#7a4a1a'), beard: tone('#7a4a1a'), weapon: null, shield: null, quiver: false, capeTone: null, skin: tone('#e8c49a'), apron: '#efe6d2' }),
  v_segm: () => Object.assign(heroLook('knight', 'iron', '#5a4030'), { body: tone('#5a4030'), body2: tone('#3a2a1e'), accent: tone('#8a2a1a'), trim: tone('#a8843a'), head: 'none', hair: tone('#2a1e14'), beard: tone('#2a1e14'), cape: false, capeTone: null, skin: tone('#c89a74') }),
  v_segm2: () => Object.assign(heroLook('knight', 'iron', '#3a4048'), { body: tone('#3a4048'), body2: tone('#2a2a2e'), accent: tone('#2a4a6a'), trim: tone('#8a8e96'), head: 'none', hair: tone('#7a4a1a'), beard: null, cape: false, capeTone: null, skin: tone('#e8c49a') }),
  v_segf: () => Object.assign(heroLook('knight', 'iron', '#4a3a40'), { body: tone('#4a3a40'), body2: tone('#2a2024'), accent: tone('#6a1a2a'), trim: tone('#a8843a'), head: 'none', hairStyle: 'long', hair: tone('#1a1410'), beard: null, cape: false, capeTone: null, skin: tone('#d8a880') }),
  hotelkeeper: () => Object.assign(heroLook('archer', 'scout', '#6a4a2a'), { armor: 'vest', body: tone('#6a4a2a'), body2: tone('#d8c8a8'), accent: tone('#8a3a2a'), trim: tone('#a8843a'), head: 'none', hairStyle: 'long', hair: tone('#7a3a1a'), beard: null, weapon: null, shield: null, capeTone: null, skin: tone('#e2b896') }),
  banker4: () => Object.assign(heroLook('mage', 'adept', '#2a2a3a'), { armor: 'robe', body: tone('#22303e'), body2: tone('#e8dcc0'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hair: tone('#6a6a6a'), beard: tone('#6a6a6a'), weapon: null, capeTone: null, skin: tone('#d8b494') }),
  banker5: () => Object.assign(heroLook('mage', 'adept', '#2a2a3a'), { armor: 'robe', body: tone('#3a2230'), body2: tone('#e8dcc0'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hairStyle: 'long', hair: tone('#a8a8a8'), beard: null, weapon: null, capeTone: null, skin: tone('#e2c0a0') }),
  banker6: () => Object.assign(heroLook('mage', 'adept', '#2a2a3a'), { armor: 'robe', body: tone('#1e2a22'), body2: tone('#e8dcc0'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hair: tone('#2a1a10'), beard: tone('#2a1a10'), weapon: null, capeTone: null, skin: tone('#b88868') }),
  bankporter: () => Object.assign(heroLook('knight', 'iron', '#5a1418'), { armor: 'vest', body: tone('#5a1418'), body2: tone('#c9a24a'), accent: tone('#c9a24a'), trim: tone('#e2b74e'), head: 'none', hair: tone('#3a2a1a'), beard: tone('#3a2a1a'), weapon: null, shield: null, capeTone: null, skin: tone('#c89878') }),
  broker: () => Object.assign(heroLook('archer', 'scout', '#3a2a1a'), { armor: 'robe', body: tone('#4a3420'), body2: tone('#e8dcc0'), accent: tone('#c9a24a'), trim: tone('#c9a24a'), head: 'none', hair: tone('#5a5048'), beard: tone('#5a5048'), weapon: null, quiver: false, capeTone: null, skin: tone('#dcb090') }),
  tailor: () => Object.assign(heroLook('mage', 'adept', '#6e1424'), { armor: 'robe', body: tone('#5e1422'), body2: tone('#2a0e14'), accent: tone('#d4a94a'), trim: tone('#d4a94a'), head: 'none', hair: tone('#d8d4cc'), beard: tone('#d8d4cc'), weapon: null, capeTone: tone('#2a0e14'), skin: tone('#e2c0a0') }),
  fruit: () => Object.assign(heroLook('archer', 'scout', '#3e5a34'), { armor: 'robe', body: tone('#3e5a34'), body2: tone('#efe6cf'), accent: tone('#efe6cf'), trim: tone('#a8342a'), head: 'none', hairStyle: 'long', hair: tone('#3a2414'), weapon: null, quiver: false, skin: tone('#e6bea0'), capeTone: null }),
  priest: () => Object.assign(heroLook('mage', 'adept', '#e9e2cf'), { body: tone('#e9e2cf'), body2: tone('#c9a24a'), head: 'hood', accent: tone('#f2ecdc'), weapon: 'book', beard: null, hair: tone('#6b4a2b'), skin: tone('#e2b896') }),
  merchant: () => Object.assign(heroLook('archer', 'scout', '#2f5a3a'), { armor: 'vest', body: tone('#7a3b22'), body2: tone('#d6c9a8'), head: 'cap', headTone: tone('#2f5a3a'), weapon: null, quiver: false, beard: tone('#5a3a22'), hair: tone('#5a3a22') }),
  innkeeper: () => Object.assign(heroLook('knight', 'iron', '#5a3a22'), { armor: 'leather', body: tone('#5a3a22'), body2: tone('#e8dcc0'), accent: tone('#2a1a10'), trim: tone('#c9a24a'), legs: tone('#3a2a1a'), boots: tone('#2a1a10'), head: 'none', hairStyle: 'short', hair: tone('#b8501e'), beard: tone('#c25a22'), braids: 1, weapon: 'mug', shield: null, quiver: false, skin: tone('#e0a88a') }),   // Brom Barbarruiva, anão
  tavmaid: () => Object.assign(heroLook('archer', 'scout', '#3a6a4a'), { armor: 'vest', body: tone('#3a6a4a'), body2: tone('#ece6d6'), head: 'none', hairStyle: 'long', hair: tone('#d8b060'), weapon: 'mug', quiver: false, skin: tone('#f0c8a8') }),   // Lina, a ajudante
  st_dojo: () => Object.assign(heroLook('mage', 'adept', '#14141a'), { armor: 'robe', body: tone('#14141a'), body2: tone('#14141a'), accent: tone('#f4f0e6'), trim: tone('#14141a'), head: 'none', hair: tone('#e8e6e0'), topknot: 1, bald: 1, beard: tone('#f0eee8'), beardLong: 1, brows: tone('#f0eee8'), gi: tone('#f4f0e6'), weapon: null, shield: null, capeTone: null, skin: tone('#c8946a') }),   // o sensei: mestre de artes marciais (gi branco, hakama preta, coque e barba longa)
  v_gymm: () => Object.assign(heroLook('knight', 'iron', '#f0ece0'), { armor: 'vest', body: tone('#f0ece0'), body2: tone('#1a1a1a'), accent: tone('#1a1a1a'), trim: tone('#1a1a1a'), legs: tone('#f0ece0'), boots: tone('#c8946a'), head: 'none', hair: tone('#4a3424'), beard: null, weapon: null, shield: null, pauldron: null, cape: false, capeTone: null, skin: tone('#c8946a') }),   // praticante de quimono
  v_gymf: () => Object.assign(heroLook('knight', 'iron', '#f0ece0'), { armor: 'vest', body: tone('#f0ece0'), body2: tone('#8a1a1a'), accent: tone('#8a1a1a'), trim: tone('#8a1a1a'), legs: tone('#f0ece0'), boots: tone('#d8a880'), head: 'none', hair: tone('#2a1a10'), hairStyle: 'long', beard: null, weapon: null, shield: null, pauldron: null, cape: false, capeTone: null, skin: tone('#d8a880') }),
  v_offguard: () => Object.assign(heroLook('knight', 'iron', '#2c4a7a'), { head: 'none', hair: tone('#5a3a20'), cape: false, weapon: null, shield: null, pauldron: null, beard: tone('#5a4a3a') }),   // sentinela de folga: sem elmo nem lança
  guard: () => Object.assign(heroLook('knight', 'iron', '#2c4a7a'), { head: 'helm', cape: false, weapon: 'spear', shield: null, beard: tone('#5a4a3a') }),
  smith: () => Object.assign(heroLook('archer', 'scout', '#5a3a22'), { armor: 'vest', body: tone('#5a4a3e'), body2: tone('#6b4423'), head: 'none', hair: tone('#3a2a1e'), hairStyle: 'short', beard: tone('#6a3a1e'), weapon: 'hammer', quiver: false, skin: tone('#c8906a') }),
  captain: () => Object.assign(heroLook('knight', 'iron', '#2c3f6b'), { head: 'none', hairStyle: 'short', hair: tone('#2a2420'), body: tone('#6f7682'), cape: true, capeTone: tone('#24365c'), shield: null, weapon: 'sword', pauldron: 'round', scar: true }),
};

// ============================================================
//  ESQUELETO DOS HERÓIS — juntas (ombro, cotovelo, quadril, joelho)
//  num "3D simplificado" projetado para 4 vistas. Cada animação é
//  uma sequência de poses (keyframes) interpoladas.
//  Eixos do corpo: f = frente, s = lado, v = para baixo.
// ============================================================
const HW = 88, HH = 116, HAX = 44, HAY = 108;
const BODY = { thigh: 13, shin: 14, neck: -24, head: -31, shoulder: 8.5, hip: 4, upper: 11, fore: 10.5 };

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dir3 = (th, ph, side) => [Math.sin(th) * Math.cos(ph), side * Math.sin(ph), Math.cos(th) * Math.cos(ph)];
function proj(p, view) {
  if (view === 'E') return [p[0] + p[1] * 0.28, p[2], p[1]];
  if (view === 'S') return [p[1], p[2], p[0]];
  return [-p[1], p[2], -p[0]];
}

// ---------- poses-base por classe ----------
const BASE = {
  knight: { aA: [0.3, 0.12, 0.55], aB: [0.55, 0.2, 0.9], wp: 0.55, tl: 0.02 },
  free: { aA: [0.08, 0.13, 0.2], aB: [0.08, 0.13, 0.2], wp: 0, tl: 0 },   // arma guardada: mãos livres
  archer: { aA: [0.12, 0.12, 0.35], aB: [0.06, 0.1, 0.25], wp: 3.14, tl: 0 },
  mage: { aA: [0.4, 0.16, 0.85], aB: [0.15, 0.12, 0.4], wp: 3.1, tl: 0.02 },
};
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

// keyframes: [progresso, {campos}] — campos ausentes ficam na pose-base
const ACTS = {
  // ---- Cavaleiro (preparação -> impacto rápido -> acompanhamento) ----
  swing: [[0, {}], [0.28, { aA: [2.9, 0.3, 0.5], wp: 3.6, tl: -0.2, tw: -0.6, kn: -0.25 }], [0.42, { aA: [1.6, 0.15, 0.1], wp: 1.9, tl: 0.15, tw: 0.2, kn: -0.3 }], [0.52, { aA: [0.7, 0.05, 0.05], wp: 0.9, tl: 0.34, tw: 0.55, lA: [0.5, -0.25], kn: -0.38 }], [0.78, { aA: [0.55, 0.1, 0.2], wp: 0.7, tl: 0.25, tw: 0.45, kn: -0.2 }], [1, {}]],
  bash: [[0, {}], [0.36, { aA: [3.1, 0.15, 0.3], aB: [3.0, -0.05, 0.4], wp: 3.5, tl: -0.3, kn: -0.2 }], [0.5, { aA: [1.3, 0.05, 0.05], aB: [1.2, 0, 0.15], wp: 1.4, tl: 0.48, kn: -0.8 }], [0.72, { aA: [1.1, 0.05, 0.1], aB: [1.0, 0, 0.2], wp: 1.25, tl: 0.42, kn: -0.72 }], [1, {}]],
  spin: [[0, { tw: 0 }], [0.2, { aA: [1.2, 1.2, 0.2], wp: 1.57, tw: -0.9, kn: -0.4, tl: 0.12 }], [0.75, { aA: [1.3, 1.25, 0.05], wp: 1.57, tw: 6.0, kn: -0.45 }], [0.88, { tw: 6.45, kn: -0.3, tl: 0.1 }], [1, { tw: 6.28 }]],
  block: [[0, {}], [0.18, { aB: [1.65, 0.05, 0.4], aA: [0.6, 0.1, 0.9], wp: 2.2, tl: 0.2, kn: -0.6 }], [0.82, { aB: [1.6, 0.05, 0.4], aA: [0.6, 0.1, 0.9], wp: 2.2, tl: 0.2, kn: -0.6 }], [1, {}]],
  warcry: [[0, {}], [0.22, { aA: [0.6, 0.2, 1.2], aB: [0.6, 0.3, 1.2], tl: 0.25, kn: -0.35 }], [0.42, { aA: [3.1, 0.3, 0.05], aB: [1.2, 1.1, 0.2], wp: 3.14, tl: -0.28, ht: -0.45, mouth: 1 }], [0.85, { aA: [3.05, 0.3, 0.08], aB: [1.2, 1.1, 0.2], wp: 3.14, tl: -0.24, ht: -0.4, mouth: 1 }], [1, {}]],
  // ---- Atirador ----
  shoot: [[0, {}], [0.15, { aA: [1.5, 0, 0], aB: [1.4, 0.05, -0.4], tw: 0.45, pull: 0.2, tl: -0.05 }], [0.55, { aA: [1.57, 0, 0], aB: [1.25, 0.12, -2.35], tw: 0.55, pull: 1, tl: -0.08 }], [0.62, { aA: [1.62, 0, 0], aB: [0.9, 0.5, -2.7], tw: 0.55, pull: 0, tl: 0.06 }], [0.85, { aA: [1.5, 0, 0], aB: [0.7, 0.4, -1.5], tw: 0.4 }], [1, {}]],
  double: [[0, {}], [0.14, { aA: [1.55, 0, 0], aB: [1.3, 0.1, -2.2], tw: 0.5, pull: 1 }], [0.24, { aA: [1.62, 0, 0], aB: [1.0, 0.4, -2.6], tw: 0.5, pull: 0, tl: 0.05 }], [0.46, { aA: [1.55, 0, 0], aB: [1.3, 0.1, -2.2], tw: 0.5, pull: 1, tl: -0.04 }], [0.56, { aA: [1.62, 0, 0], aB: [1.0, 0.4, -2.6], tw: 0.5, pull: 0, tl: 0.06 }], [1, {}]],
  pierce: [[0, {}], [0.3, { aA: [1.5, 0, 0], aB: [1.3, 0.1, -1.0], tw: 0.6, kn: -0.7, tl: 0.18, pull: 0.4 }], [0.68, { aA: [1.52, 0, 0], aB: [1.2, 0.15, -2.55], tw: 0.65, kn: -0.7, tl: 0.18, pull: 1, glow: 1 }], [0.74, { aA: [1.65, 0, 0], aB: [0.8, 0.5, -2.8], tw: 0.6, tl: -0.2, pull: 0 }], [0.9, { tl: -0.1, tw: 0.3 }], [1, {}]],
  rain: [[0, {}], [0.3, { aA: [2.6, 0, 0], aB: [2.25, 0.1, -2.15], tl: -0.34, tw: 0.4, pull: 1, kn: -0.3 }], [0.58, { aA: [2.65, 0, 0], aB: [1.9, 0.4, -2.6], tl: -0.36, tw: 0.4, pull: 0 }], [1, {}]],
  dash: [[0, {}], [0.25, { tl: 0.2, kn: -0.85, aA: [-0.5, 0.2, 0.3], aB: [-0.6, 0.2, 0.3] }], [0.5, { tl: 0.5, lA: [0.85, -0.4], lB: [-0.75, -0.7], aA: [-1.0, 0.25, 0.4], aB: [-1.0, 0.25, 0.4] }], [1, {}]],
  // ---- Mago ----
  bolt: [[0, {}], [0.3, { aA: [0.3, 0.1, 1.2], wp: 2.4, tl: -0.12, aB: [0.5, 0.3, 0.8] }], [0.48, { aA: [1.4, 0.1, 0.05], wp: 1.35, aB: [1.4, 0.3, 0.05], tl: 0.24, glow: 1 }], [0.75, { aA: [1.3, 0.1, 0.1], wp: 1.3, aB: [1.2, 0.3, 0.1], tl: 0.16, glow: 1 }], [1, {}]],
  fireball: [[0, {}], [0.38, { aB: [-0.7, 0.4, 1.6], aA: [0.9, 0.2, 0.6], wp: 2.6, tw: -0.5, tl: -0.12, kn: -0.25 }], [0.55, { aB: [1.6, 0.05, 0.05], aA: [0.8, 0.2, 0.6], wp: 2.5, tw: 0.45, tl: 0.26, glow: 1 }], [0.8, { aB: [1.4, 0.1, 0.1], tw: 0.35, tl: 0.18 }], [1, {}]],
  nova: [[0, {}], [0.38, { aA: [2.9, 0.15, 0.3], aB: [2.8, -0.1, 0.4], wp: 3.1, tl: -0.16 }], [0.55, { aA: [0.7, 0.1, 0.4], aB: [0.8, 0.1, 0.5], wp: 0.05, tl: 0.34, kn: -0.85, glow: 1 }], [0.78, { aA: [0.75, 0.1, 0.4], wp: 0.1, tl: 0.3, kn: -0.7, glow: 1 }], [1, {}]],
  heal: [[0, {}], [0.4, { aA: [2.1, 0.9, 0.2], aB: [2.1, 0.9, 0.2], wp: 2.8, ht: -0.32, glow: 1 }], [0.8, { aA: [2.25, 1.0, 0.2], aB: [2.25, 1.0, 0.2], wp: 2.8, ht: -0.32, glow: 1 }], [1, {}]],
  meteor: [[0, { aA: [2.9, 0.2, 0.2], aB: [2.9, 0.1, 0.2], wp: 3.1, ht: -0.25 }], [0.35, { aA: [3.1, 0.25, 0.1], aB: [3.1, 0.15, 0.1], wp: 3.14, ht: -0.4, tl: -0.2, glow: 1 }], [0.52, { aA: [0.95, 0.2, 0.2], aB: [1.0, 0.15, 0.2], wp: 1.6, tl: 0.42, kn: -0.6, glow: 1 }], [0.8, { aA: [0.9, 0.2, 0.25], wp: 1.5, tl: 0.32, kn: -0.45 }], [1, {}]],
  cast: [[0, { aA: [2.0, 0.6, 0.6], aB: [2.0, 0.7, 0.6], wp: 2.9, glow: 1 }], [0.5, { aA: [2.3, 0.7, 0.4], aB: [2.3, 0.8, 0.4], wp: 3.0, glow: 1 }], [1, { aA: [2.0, 0.6, 0.6], aB: [2.0, 0.7, 0.6], wp: 2.9, glow: 1 }]],
  // ---- variações de ataque ----
  kick: [[0, {}], [0.28, { lA: [1.35, -2.0], lB: [-0.1, -0.35], tl: -0.2, aA: [0.7, 0.7, 0.5], aB: [0.6, 0.7, 0.5], wp: 1.1 }], [0.45, { lA: [1.85, 0.05], lB: [-0.25, -0.15], tl: -0.5, aA: [0.3, 0.95, 0.2], aB: [0.3, 0.95, 0.2], wp: 0.6 }], [0.62, { lA: [1.8, 0.0], lB: [-0.25, -0.15], tl: -0.45, aA: [0.3, 0.9, 0.2], aB: [0.3, 0.9, 0.2] }], [0.82, { lA: [0.7, -0.9], tl: -0.15 }], [1, {}]],
  kneelput: [[0, { tuck: 1, aA: [0.62, 0.32, 1.25], aB: [0.62, 0.32, 1.25] }], [0.3, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], tl: 0.18, ht: 0.12, aA: [1.0, 0.3, 0.9], aB: [1.0, 0.3, 0.9] }], [0.6, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], tl: 0.3, ht: 0.18, aA: [1.3, 0.28, 0.4], aB: [1.3, 0.28, 0.4] }], [0.8, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], tl: 0.2, ht: 0.14, aA: [0.8, 0.2, 0.6], aB: [0.8, 0.2, 0.6] }], [1, { tuck: 1 }]],   /* ajoelha com o corpo erguido e apoia a bandeja na borda */
  pour: [[0, { tuck: 1 }], [0.08, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], ht: 0.14, tl: 0.2, aA: [1.0, 0.1, 0.6], aB: [0.9, -0.05, 0.6], tokk: 0 }],   /* ajoelha erguida (hiza-dachi): as mãos ficam acima da borda */
    [0.16, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], ht: 0.16, tl: 0.18, aA: [1.2, 0.12, 0.55], aB: [1.05, -0.4, 1.3], tokk: 1, tokt: 0 }],   /* pega a garrafa; a esquerda segura a manga */
    [0.3, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], ht: 0.22, tl: 0.16, aA: [1.38, 0.12, 0.32], aB: [1.1, -0.45, 1.35], tokk: 1, tokt: 0.95 }],   /* garrafa sobre o copo, inclinando */
    [0.55, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], ht: 0.24, tl: 0.17, aA: [1.4, 0.12, 0.3], aB: [1.1, -0.45, 1.35], tokk: 1, tokt: 1.15 }],
    [0.8, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], ht: 0.23, tl: 0.16, aA: [1.38, 0.12, 0.32], aB: [1.1, -0.45, 1.35], tokk: 1, tokt: 1.0 }],
    [0.88, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], ht: 0.18, tl: 0.17, aA: [1.25, 0.12, 0.45], aB: [1.05, -0.4, 1.3], tokk: 1, tokt: 0.1 }],   /* endireita sem pingar */
    [0.95, { tuck: 1, lA: [0.05, -1.62], lB: [0.05, -1.62], ht: 0.14, tl: 0.18, aA: [1.0, 0.1, 0.6], aB: [0.9, -0.05, 0.6], tokk: 0 }], [1, { tuck: 1 }]],   /* devolve à bandeja e se levanta */
  massage: [[0, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.46, ht: 0.15, aA: [1.38, 0.05, 0.32], aB: [1.12, 0.05, 0.55] }], [0.08, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.52, ht: 0.15, aA: [1.12, 0.05, 0.55], aB: [1.38, 0.05, 0.32] }], [0.16, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.46, ht: 0.15, aA: [1.38, 0.05, 0.32], aB: [1.12, 0.05, 0.55] }], [0.25, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.52, ht: 0.15, aA: [1.12, 0.05, 0.55], aB: [1.38, 0.05, 0.32] }], [0.33, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.5, ht: 0.15, aA: [1.5, 0.14, 0.1], aB: [1.5, 0.14, 0.1] }], [0.41, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.38, ht: 0.16, aA: [1.42, 0.14, 0.18], aB: [1.42, 0.14, 0.18] }], [0.5, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.52, ht: 0.15, aA: [1.5, 0.14, 0.1], aB: [1.5, 0.14, 0.1] }], [0.58, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.38, ht: 0.16, aA: [1.42, 0.14, 0.18], aB: [1.42, 0.14, 0.18] }], [0.66, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.44, ht: 0.15, aA: [1.1, 0.38, 0.85], aB: [1.28, 0.28, 0.55] }], [0.75, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.44, ht: 0.15, aA: [1.28, 0.28, 0.55], aB: [1.1, 0.38, 0.85] }], [0.83, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.44, ht: 0.15, aA: [1.1, 0.38, 0.85], aB: [1.28, 0.28, 0.55] }], [0.92, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.44, ht: 0.15, aA: [1.28, 0.28, 0.55], aB: [1.1, 0.38, 0.85] }], [1, { tuck: 1, lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.46, ht: 0.15, aA: [1.38, 0.05, 0.32], aB: [1.12, 0.05, 0.55] }]],   /* massagem: polegares na coluna, palmas nos ombros, amassando os braços */
  execute: [[0, {}], [0.35, { aA: [3.1, 0.1, 0.2], aB: [3.0, -0.05, 0.3], wp: 3.4, tl: -0.35, ht: -0.3, kn: -0.2 }], [0.5, { aA: [1.2, 0.05, 0.05], aB: [1.1, 0, 0.1], wp: 1.2, tl: 0.6, kn: -0.95, mouth: 1 }], [0.8, { aA: [1.0, 0.05, 0.1], aB: [1.0, 0, 0.15], wp: 1.0, tl: 0.5, kn: -0.85 }], [1, {}]],
  quiver: [[0, {}], [0.25, { aB: [2.9, 0.3, 2.6], aA: [1.2, 0, 0], tw: -0.3, ht: 0.1 }], [0.4, { aB: [2.6, 0.2, 2.3], aA: [1.4, 0, 0], tw: -0.2 }], [0.65, { aA: [1.57, 0, 0], aB: [1.25, 0.12, -2.4], tw: 0.55, pull: 1, tl: -0.08 }], [0.72, { aA: [1.62, 0, 0], aB: [0.9, 0.5, -2.7], tw: 0.55, pull: 0, tl: 0.06 }], [1, {}]],
  turnshot: [[0, {}], [0.15, { aA: [1.55, 0, 0], aB: [1.3, 0.1, -2.2], tw: 0.5, pull: 1 }], [0.24, { aA: [1.62, 0, 0], aB: [1.0, 0.4, -2.6], tw: 0.5, pull: 0 }], [0.5, { yaw: 3.14, aA: [1.4, 0, 0], aB: [1.2, 0.1, -1.6], tw: 0.3, pull: 0.5, kn: -0.3 }], [0.66, { yaw: 3.14, aA: [1.55, 0, 0], aB: [1.3, 0.1, -2.3], tw: 0.5, pull: 1 }], [0.74, { yaw: 3.14, aA: [1.62, 0, 0], aB: [1.0, 0.4, -2.6], tw: 0.5, pull: 0 }], [0.9, { yaw: 3.14 }], [1, { yaw: 6.28 }]],
  castup: [[0, { aA: [2.95, 0.15, 0.2], aB: [1.0, 0.55, 0.6], wp: 3.2, tl: -0.08, glow: 1 }], [0.5, { aA: [3.05, 0.2, 0.12], aB: [1.15, 0.65, 0.5], wp: 3.28, tl: -0.12, glow: 1 }], [1, { aA: [2.95, 0.15, 0.2], aB: [1.0, 0.55, 0.6], wp: 3.2, tl: -0.08, glow: 1 }]],   // cajado erguido acima da cabeça (Bola de Fogo)
  fireball: [[0, { aA: [3.05, 0.2, 0.12], aB: [1.1, 0.6, 0.5], wp: 3.28, tl: -0.1, glow: 1 }], [0.35, { aA: [1.55, 0.1, 0.05], aB: [0.6, 0.4, 0.6], wp: 1.6, tl: 0.18, kn: -0.15, glow: 1 }], [0.7, { aA: [1.5, 0.1, 0.05], aB: [0.6, 0.4, 0.6], wp: 1.55, tl: 0.15 }], [1, {}]],   // aponta o cajado e a bola sai da ponta
  dualcast: [[0, {}], [0.35, { aA: [0.4, 0.3, 1.4], aB: [0.4, 0.3, 1.4], wp: 2.2, tl: -0.15, glow: 1 }], [0.52, { aA: [1.5, 0.25, 0.05], aB: [1.5, 0.25, 0.05], wp: 1.4, tl: 0.25, glow: 1 }], [0.8, { aA: [1.4, 0.25, 0.1], aB: [1.4, 0.25, 0.1], wp: 1.3, tl: 0.18, glow: 1 }], [1, {}]],
  turncast: [[0, {}], [0.2, { aB: [1.5, 0.1, 0.05], aA: [0.8, 0.2, 0.6], wp: 2.4, tl: 0.2, glow: 1 }], [0.3, { aB: [1.3, 0.1, 0.1], glow: 1 }], [0.55, { yaw: 3.14, aB: [0.5, 0.3, 1.2], tl: -0.1, kn: -0.3, glow: 1 }], [0.7, { yaw: 3.14, aB: [1.55, 0.1, 0.05], aA: [0.8, 0.2, 0.6], wp: 2.4, tl: 0.22, glow: 1 }], [0.9, { yaw: 3.14 }], [1, { yaw: 6.28 }]],
  // ---- emojis ----
  salute: [[0, {}], [0.25, { aB: [2.55, 0.15, 2.5], ht: -0.08 }], [0.75, { aB: [2.55, 0.15, 2.5], ht: -0.08 }], [1, {}]],
  point: [[0, {}], [0.2, { aB: [1.6, 0.05, 0.05], tw: 0.25, ht: 0.05 }], [0.8, { aB: [1.6, 0.05, 0.05], tw: 0.25, ht: 0.05 }], [1, {}]],
  // ---- reações e levantar ----
  hurt_head: [[0, {}], [0.22, { ht: -0.75, tl: -0.32, aA: [0.6, 0.35, 0.7], aB: [0.7, 0.35, 0.8] }], [1, {}]],
  hurt_leg: [[0, {}], [0.22, { lA: [0.35, -1.0], lB: [-0.1, -0.2], tl: 0.35, drop: 4 }], [1, {}]],
  getup: [[0, { lA: [1.75, -2.35], lB: [0.25, -2.0], tl: 0.95, aA: [0.6, 0.55, 0.8], aB: [0.7, 0.55, 0.9], drop: 10 }], [0.5, { lA: [1.3, -1.7], lB: [0.15, -1.3], tl: 0.55 }], [1, {}]],
  // ---- combate direcional ----
  atk_over:   [[0, {}], [0.36, { aA: [2.9, 0.25, 1.5], wp: 3.7, tl: -0.12, ht: -0.15 }], [0.5, { aA: [0.85, 0.1, 0.1], wp: 0.6, tl: 0.35, ht: 0.15 }], [0.62, { aA: [0.6, 0.12, 0.15], wp: 0.3, tl: 0.3 }], [1, {}]],
  atk_under:  [[0, {}], [0.36, { aA: [-0.7, 0.35, 0.3], wp: -1.0, tl: 0.3 }], [0.5, { aA: [1.9, 0.12, 0.2], wp: 2.4, tl: -0.15 }], [0.62, { aA: [2.1, 0.12, 0.25], wp: 2.6, tl: -0.12 }], [1, {}]],
  atk_slashR_old: [[0, {}], [0.36, { tw: 0.95, yaw: 0.35, aA: [2.05, 0.15, 1.45], wp: 2.75, tl: 0.02 }], [0.47, { tw: 0.1, yaw: 0, aA: [1.5, 0.1, 0.35], wp: 1.75 }], [0.55, { tw: -0.85, yaw: -0.45, aA: [1.45, 0.05, 0.15], wp: 1.6, tl: 0.15 }], [0.66, { tw: -0.95, yaw: -0.5, aA: [1.3, 0.05, 0.25], wp: 1.4, tl: 0.12 }], [1, {}]],
  atk_slashL_old: [[0, {}], [0.36, { tw: -0.95, yaw: -0.35, aA: [1.7, -0.55, 1.35], wp: 2.45, tl: 0.02 }], [0.47, { tw: -0.1, yaw: 0, aA: [1.5, -0.1, 0.4], wp: 1.8 }], [0.55, { tw: 0.85, yaw: 0.45, aA: [1.45, 0.55, 0.15], wp: 1.6, tl: 0.15 }], [0.66, { tw: 0.95, yaw: 0.5, aA: [1.3, 0.6, 0.25], wp: 1.4, tl: 0.12 }], [1, {}]],
  atk_stab:   [[0, {}], [0.36, { aA: [0.55, 0.2, 1.95], wp: 1.5, tl: -0.08, lA: [-0.25, -0.2] }], [0.5, { aA: [1.52, 0.05, 0.05], wp: 1.55, tl: 0.3, lA: [0.5, -0.3], lB: [-0.35, -0.1] }], [0.62, { aA: [1.5, 0.05, 0.08], wp: 1.55, tl: 0.28, lA: [0.45, -0.3] }], [1, {}]],
  parry:      [[0, { aA: [1.35, 0.55, 1.35], wp: 2.7, aB: [1.25, 0.25, 1.0], tl: 0.05 }], [1, { aA: [1.35, 0.55, 1.35], wp: 2.7, aB: [1.25, 0.25, 1.0], tl: 0.05 }]],
  // bloqueio direcional: escudo/arma no alto, de cada lado ou embaixo
  blk_front:  [[0, { aA: [1.3, 0.45, 1.4], wp: 2.6, aB: [1.8, 0.05, 1.25], tl: 0.04 }], [1, { aA: [1.3, 0.45, 1.4], wp: 2.6, aB: [1.8, 0.05, 1.25], tl: 0.04 }]],   // escudo na frente, na altura do peito
  blk_top:    [[0, { aA: [1.9, 0.5, 1.5], wp: 3.3, aB: [2.65, 0.15, 1.3], tl: 0.0, ht: -0.15 }], [1, { aA: [1.9, 0.5, 1.5], wp: 3.3, aB: [2.65, 0.15, 1.3], tl: 0.0, ht: -0.15 }]],
  blk_L:      [[0, { aA: [1.3, 0.45, 1.4], wp: 2.6, aB: [1.3, -0.35, 1.05], tw: 0.5, tl: 0.05 }], [1, { aA: [1.3, 0.45, 1.4], wp: 2.6, aB: [1.3, -0.35, 1.05], tw: 0.5, tl: 0.05 }]],
  blk_R:      [[0, { aA: [1.35, 0.8, 1.2], wp: 2.9, aB: [1.3, 0.75, 1.0], tw: -0.5, tl: 0.05 }], [1, { aA: [1.35, 0.8, 1.2], wp: 2.9, aB: [1.3, 0.75, 1.0], tw: -0.5, tl: 0.05 }]],
  blk_low:    [[0, { aA: [0.8, 0.35, 0.9], wp: 1.4, aB: [0.65, 0.2, 0.7], tl: 0.28, kn: -0.28, ht: 0.2 }], [1, { aA: [0.8, 0.35, 0.9], wp: 1.4, aB: [0.65, 0.2, 0.7], tl: 0.28, kn: -0.28, ht: 0.2 }]],
  sbash:      [[0, {}], [0.3, { aB: [1.0, 0.1, 1.6], tw: 0.35, tl: -0.05 }], [0.5, { aB: [1.55, 0.05, 0.25], tw: -0.25, tl: 0.25, lA: [0.45, -0.2] }], [0.8, { aB: [1.3, 0.1, 0.6], tl: 0.12 }], [1, {}]],
  // cavaleiro: saudação e apontar com a espada (braço da espada)
  salute_k: [[0, {}], [0.25, { aA: [1.35, 0.12, 1.25], wp: 3.05, ht: -0.08 }], [0.75, { aA: [1.35, 0.12, 1.25], wp: 3.05, ht: -0.08 }], [1, {}]],
  point_k: [[0, {}], [0.2, { aA: [1.55, 0.05, 0.05], wp: 1.6, tw: -0.25, ht: 0.05 }], [0.8, { aA: [1.55, 0.05, 0.05], wp: 1.6, tw: -0.25, ht: 0.05 }], [1, {}]],
  dance: [[0, { aA: [2.6, 0.7, 0.4], aB: [0.5, 0.6, 1.2], tw: 0.35, lA: [0.4, -0.6], kn: -0.2, ht: 0.1 }], [0.25, { aA: [1.4, 0.9, 0.9], aB: [1.4, 0.9, 0.9], tw: 0, kn: -0.45 }], [0.5, { aA: [0.5, 0.6, 1.2], aB: [2.6, 0.7, 0.4], tw: -0.35, lB: [0.4, -0.6], kn: -0.2, ht: -0.1 }], [0.75, { aA: [1.4, 0.9, 0.9], aB: [1.4, 0.9, 0.9], tw: 0, kn: -0.45 }], [1, { aA: [2.6, 0.7, 0.4], aB: [0.5, 0.6, 1.2], tw: 0.35, lA: [0.4, -0.6], kn: -0.2, ht: 0.1 }]],
  // ---- arco: puxar a corda (quadro = quanto já puxou), soltar e pegar outra flecha na aljava (sobre o ombro) ----
  // puxada: a mão sai da corda junto ao arco, o braço abre de lado na altura do ombro e termina com o cotovelo para trás e a mão no rosto
  bowdraw: [[0, { aA: [1.52, 0, 0], aB: [1.45, 0.1, 0.3], tw: 0.45, pull: 0.12, tl: -0.04 }], [0.5, { aA: [1.56, 0, 0], aB: [0.2, 1.45, 1.9], tw: 0.55, pull: 0.55, tl: -0.05 }], [1, { aA: [1.57, 0, 0], aB: [-1.3, 0.45, 2.7], tw: 0.6, pull: 1, tl: -0.05 }]],
  loose: [[0, { aA: [1.57, 0, 0], aB: [-1.3, 0.45, 2.7], tw: 0.6, pull: 1, tl: -0.05 }], [0.12, { aA: [1.66, 0, 0], aB: [-1.55, 0.6, 2.0], tw: 0.62, pull: 0, tl: -0.08 }], [0.55, { aA: [1.6, 0, 0], aB: [-1.4, 0.55, 1.8], tw: 0.58, pull: 0 }], [1, {}]],
  nock: [[0, {}], [0.3, { aB: [2.9, 0.35, 2.6], harrow: 1, ht: -0.1, tw: -0.25 }], [0.55, { aB: [2.2, 0.25, 1.5], harrow: 1, tw: 0.1 }], [0.82, { aA: [1.45, 0, 0], aB: [1.4, 0.05, -0.4], harrow: 0, pull: 0.08, tw: 0.4 }], [1, { aA: [1.4, 0, 0], aB: [1.3, 0.05, -0.3], pull: 0.08, tw: 0.35 }]],
  // ---- emoções ----
  cheer: [[0, {}], [0.2, { aA: [2.9, 0.4, 0.6], aB: [2.9, 0.4, 0.6], ht: -0.25, mouth: 1, tl: -0.1 }], [0.4, { aA: [2.5, 0.5, 1.2], aB: [2.5, 0.5, 1.2], kn: -0.25 }], [0.6, { aA: [3.0, 0.4, 0.5], aB: [3.0, 0.4, 0.5], ht: -0.3, mouth: 1 }], [0.8, { aA: [2.5, 0.5, 1.2], aB: [2.5, 0.5, 1.2], kn: -0.2 }], [1, {}]],
  surprise: [[0, {}], [0.15, { aA: [1.3, 0.25, 2.2], aB: [1.3, 0.25, 2.2], tl: -0.25, ht: -0.2, mouth: 1 }], [0.7, { aA: [1.2, 0.25, 2.0], aB: [1.2, 0.25, 2.0], tl: -0.2, ht: -0.15, mouth: 1 }], [1, {}]],
  adore: [[0, {}], [0.25, { lA: [1.55, -1.6], lB: [-0.15, -1.95], tl: 0.35, ht: 0.35, aA: [1.0, -0.1, 1.6], aB: [1.0, -0.1, 1.6] }], [0.85, { lA: [1.55, -1.6], lB: [-0.15, -1.95], tl: 0.55, ht: 0.5, aA: [1.1, -0.1, 1.7], aB: [1.1, -0.1, 1.7] }], [1, {}]],
  anger: [[0, {}], [0.2, { aA: [1.7, 0.3, 2.3], aB: [0.4, 0.3, 1.8], tl: 0.2, ht: 0.1, mouth: 1 }], [0.35, { aA: [2.3, 0.3, 2.0], tl: 0.22 }], [0.5, { aA: [1.7, 0.3, 2.3] }], [0.65, { aA: [2.3, 0.3, 2.0], tl: 0.25, mouth: 1 }], [0.8, { aA: [1.7, 0.3, 2.3] }], [1, {}]],
  fear: [[0, {}], [0.2, { kn: -0.6, tl: 0.35, aA: [1.6, 0.1, 2.4], aB: [1.6, 0.1, 2.4], ht: 0.3, lA: [0.6, -0.9], lB: [0.4, -0.8] }], [0.5, { kn: -0.65, tl: 0.4, aA: [1.66, 0.12, 2.45], aB: [1.6, 0.1, 2.4], ht: 0.32, lA: [0.6, -0.9], lB: [0.4, -0.8] }], [0.85, { kn: -0.6, tl: 0.35, aA: [1.6, 0.1, 2.4], aB: [1.62, 0.1, 2.4], ht: 0.3, lA: [0.6, -0.9], lB: [0.4, -0.8] }], [1, {}]],
  sad: [[0, {}], [0.3, { tl: 0.25, ht: 0.6, aA: [1.4, 0.1, 2.5], aB: [0.1, 0.05, 0.2] }], [0.85, { tl: 0.28, ht: 0.65, aA: [1.45, 0.1, 2.55], aB: [0.1, 0.05, 0.2] }], [1, {}]],
  offer: [[0, { aA: [1.35, 0.15, 0.3], tl: 0.08, ht: 0.12, apple: 1 }], [1, { aA: [1.35, 0.15, 0.3], tl: 0.08, ht: 0.12, apple: 1 }]],
  cuff: [[0, {}], [0.3, { aA: [1.0, 0.1, 0.9], aB: [1.0, 0.1, 0.9], tl: 0.3, kn: -0.25, ht: 0.3 }], [0.75, { aA: [0.9, -0.05, 1.1], aB: [0.9, -0.05, 1.1], tl: 0.32, kn: -0.25, ht: 0.35 }], [1, {}]],
  key: [[0, {}], [0.3, { aA: [1.45, 0.05, 0.5], ht: 0.15 }], [0.55, { aA: [1.45, 0.05, 0.5], ht: 0.15, tw: 0.25 }], [0.8, { aA: [1.45, 0.05, 0.5], ht: 0.15, tw: -0.1 }], [1, {}]],
  shove: [[0, {}], [0.25, { aA: [1.0, 0.1, 1.6], aB: [1.0, 0.1, 1.6], tl: -0.1 }], [0.5, { aA: [1.5, 0.05, 0.1], aB: [1.5, 0.05, 0.1], tl: 0.3, lA: [0.5, -0.3] }], [1, {}]],
  lever: [[0, {}], [0.3, { aA: [2.6, 0.2, 0.4], tl: -0.1, ht: -0.1 }], [0.55, { aA: [0.9, 0.25, 0.2], tl: 0.35, kn: -0.3 }], [1, { aA: [0.8, 0.25, 0.2], tl: 0.25, kn: -0.2 }]],
  // ---- casa: mexer a panela e varrer ----
  cookfull: [[0, { aA: [1.1, 0.15, 1.0], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.32, ladle: 1 }], [0.08, { aA: [1.18, 0.4, 1.15], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.32, ladle: 1 }], [0.16, { aA: [1.24, 0.12, 1.25], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.32, ladle: 1 }], [0.24, { aA: [1.18, -0.12, 1.15], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.32, ladle: 1 }], [0.32, { aA: [1.12, 0.18, 1.05], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.32, ladle: 1 }],   /* mexe com a concha */
    [0.4, { aA: [1.05, 0.2, 0.7], aB: [0.95, 0.15, 1.4], tl: 0.22, ht: 0.32, spat: 1 }], [0.46, { aA: [1.35, 0.2, 0.55], aB: [0.95, 0.15, 1.4], tl: 0.22, ht: 0.32, spat: 1 }], [0.52, { aA: [1.0, 0.2, 0.9], aB: [0.95, 0.15, 1.4], tl: 0.22, ht: 0.32, spat: 1 }],   /* vira com a espátula */
    [0.58, { aA: [0.6, 0.2, 0.8], aB: [1.45, 0.25, 1.55], tl: 0.22, ht: 0.32, pinch: 1 }], [0.66, { aA: [0.6, 0.2, 0.8], aB: [1.35, 0.32, 1.35], tl: 0.22, ht: 0.32, pinch: 1 }],   /* tempera com uma pitada */
    [0.72, { aA: [1.25, 0.1, 1.6], aB: [0.7, 0.15, 1.2], tl: 0.1, ht: 0.05, ladle: 1 }], [0.8, { aA: [1.5, 0.12, 2.35], aB: [0.7, 0.15, 1.2], tl: 0.05, ht: -0.12, ladle: 1 }],   /* prova */
    [0.88, { aA: [0.6, 0.2, 0.9], aB: [0.95, 0.3, 1.4], tl: 0.1, ht: 0.15, plate: 1 }], [1, { aA: [0.5, 0.2, 0.9], aB: [0.85, 0.3, 1.45], tl: 0.05, ht: 0.12, plate: 1 }]],   /* o prato pronto na mão */
  cook: [[0, { aA: [1.1, 0.15, 1.0], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.3 }], [0.25, { aA: [1.15, 0.38, 1.1], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.3 }], [0.5, { aA: [1.22, 0.15, 1.2], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.3 }], [0.75, { aA: [1.15, -0.08, 1.1], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.3 }], [1, { aA: [1.1, 0.15, 1.0], aB: [0.9, 0.1, 1.5], tl: 0.22, ht: 0.3 }]],
  atk_slashR: [[0, {}],
    [0.14, { tw: 0.55, yaw: 0.2, aA: [1.6, 0.6, 1.2], ay: 0.55, wp: 2.6, aB: [0.6, -0.2, 0.8] }],
    [0.36, { tw: 1.15, yaw: 0.42, tl: -0.05, aA: [1.85, 1.0, 1.35], ay: 0.9, wp: 3.0, wr: -0.5, aB: [0.9, -0.5, 1.0], lA: [0.1, -0.1], lB: [-0.25, -0.2] }],
    [0.46, { tw: 0.35, yaw: 0.15, tl: 0.1, aA: [1.6, 0.55, 0.35], ay: 0.6, wp: 1.75, wr: -1.2, aB: [0.7, -0.2, 0.9], lA: [0.35, -0.3], lB: [-0.15, -0.15] }],
    [0.53, { tw: -0.55, yaw: -0.25, tl: 0.2, aA: [1.55, 0.05, 0.05], ay: -0.2, wp: 1.55, wr: -1.45, aB: [0.5, 0.3, 0.7], lA: [0.4, -0.3], lB: [-0.2, -0.15] }],
    [0.64, { tw: -1.05, yaw: -0.5, tl: 0.18, aA: [1.35, -0.45, 0.35], ay: -0.85, wp: 1.25, wr: -1.2, aB: [0.4, 0.6, 0.6], lA: [0.3, -0.25] }],
    [0.8, { tw: -0.5, yaw: -0.2, aA: [1.1, -0.1, 0.5], wp: 1.3, wr: -0.4 }], [1, {}]],
  atk_slashL: [[0, {}],
    [0.14, { tw: -0.55, yaw: -0.2, aA: [1.55, -0.55, 1.3], ay: -0.6, wp: 2.5, aB: [0.6, 0.3, 0.8] }],
    [0.36, { tw: -1.1, yaw: -0.4, tl: -0.05, aA: [1.75, -0.7, 1.45], ay: -0.95, wp: 2.85, wr: 0.6, aB: [0.8, 0.6, 1.0], lB: [0.15, -0.1], lA: [-0.2, -0.2] }],
    [0.46, { tw: -0.3, yaw: -0.15, tl: 0.1, aA: [1.6, -0.3, 0.4], ay: -0.5, wp: 1.75, wr: 1.25, aB: [0.7, 0.3, 0.9], lB: [0.35, -0.3] }],
    [0.53, { tw: 0.6, yaw: 0.25, tl: 0.2, aA: [1.55, 0.25, 0.05], ay: 0.25, wp: 1.55, wr: 1.45, aB: [0.5, -0.3, 0.7], lB: [0.4, -0.3], lA: [-0.2, -0.15] }],
    [0.64, { tw: 1.05, yaw: 0.5, tl: 0.18, aA: [1.4, 0.9, 0.3], ay: 0.85, wp: 1.25, wr: 1.2, aB: [0.4, -0.6, 0.6] }],
    [0.8, { tw: 0.5, yaw: 0.2, aA: [1.1, 0.4, 0.5], wp: 1.3, wr: 0.4 }], [1, {}]],
  gather: [[0, { aA: [0.7, 0.15, 0.4], aB: [0.6, 0.2, 0.5], tl: 0.55, ht: 0.25, lA: [0.9, -1.4], lB: [0.4, -0.5], drop: 6 }], [0.5, { aA: [1.25, 0.1, 0.8], aB: [0.7, 0.2, 0.5], tl: 0.65, ht: 0.3, lA: [0.9, -1.4], lB: [0.4, -0.5], drop: 6 }], [1, { aA: [0.7, 0.15, 0.4], aB: [0.6, 0.2, 0.5], tl: 0.55, ht: 0.25, lA: [0.9, -1.4], lB: [0.4, -0.5], drop: 6 }]],
  sweep: [[0, { aA: [0.85, 0.12, 0.5], aB: [0.55, 0.15, 1.0], tl: 0.3, tw: 0.45, ht: 0.3, broom: 1 }], [0.5, { aA: [0.85, 0.12, 0.5], aB: [0.55, 0.15, 1.0], tl: 0.34, tw: -0.45, ht: 0.3, broom: 1 }], [1, { aA: [0.85, 0.12, 0.5], aB: [0.55, 0.15, 1.0], tl: 0.3, tw: 0.45, ht: 0.3, broom: 1 }]],
  // ---- beber: do cantil (gole com a cabeça para trás) e com as mãos num riacho/poça (ajoelhado) ----
  drinkb: [[0, {}], [0.18, { aA: [1.7, 0.15, 2.2], bot: 1, ht: -0.05 }], [0.32, { aA: [2.45, 0.1, 2.55], bot: 1, ht: -0.5, tl: -0.08 }], [0.78, { aA: [2.5, 0.1, 2.55], bot: 1, ht: -0.55, tl: -0.1 }], [0.9, { aA: [1.6, 0.15, 2.1], bot: 1 }], [1, { bot: 0 }]],
  scoop: [[0, {}], [0.22, { lA: [1.55, -1.6], lB: [-0.15, -1.95], tl: 0.75, ht: 0.45, aA: [0.55, 0.2, 0.35], aB: [0.55, 0.2, 0.35] }], [0.45, { lA: [1.55, -1.6], lB: [-0.15, -1.95], tl: 0.85, ht: 0.5, aA: [0.25, 0.12, 0.25], aB: [0.25, 0.12, 0.25] }], [0.7, { lA: [1.55, -1.6], lB: [-0.15, -1.95], tl: 0.3, ht: -0.15, aA: [1.55, 0.3, 2.35], aB: [1.55, 0.3, 2.35] }], [0.85, { lA: [1.55, -1.6], lB: [-0.15, -1.95], tl: 0.3, ht: -0.15, aA: [1.55, 0.3, 2.35], aB: [1.55, 0.3, 2.35] }], [1, {}]],
  // ---- reação ao golpe ----
  hurt: [[0, {}], [0.25, { tl: -0.38, aA: [0.7, 0.55, 0.6], aB: [0.7, 0.55, 0.6], ht: -0.45, kn: -0.35 }], [1, {}]],
  // ---- guardar / sacar: na cintura (espada) ou por cima do ombro (alabarda, arco, cajado); soco ----
  sheatheH: [[0, {}], [0.35, { aA: [0.35, -0.45, 1.35], tw: 0.25, ht: 0.25, hw: 0.2 }], [0.6, { aA: [0.12, -0.35, 1.0], tw: 0.3, ht: 0.3, hw: 0.25 }], [1, {}]],
  drawwpH: [[0, {}], [0.3, { aA: [0.12, -0.35, 1.0], tw: 0.3, ht: 0.3, hw: 0.25 }], [0.6, { aA: [0.9, 0.3, 0.6], tw: -0.1 }], [1, {}]],
  sheatheB: [[0, {}], [0.4, { aA: [2.75, 0.15, 2.55], tl: 0.06, ht: 0.1, tw: -0.15 }], [0.7, { aA: [2.9, 0.1, 2.8], tl: 0.06, tw: -0.2 }], [1, {}]],
  drawwpB: [[0, {}], [0.35, { aA: [2.9, 0.1, 2.8], tl: 0.06, tw: -0.2 }], [0.65, { aA: [2.2, 0.25, 1.4], tw: -0.05 }], [1, {}]],
  // ---- coleta: machado (lateral baixo no tronco), picareta (de cima para baixo), foice (agachado ceifando) ----
  chop: [[0, {}], [0.3, { aA: [1.25, 0.95, 0.7], aB: [1.05, 0.7, 1.0], tw: 0.65, tl: 0.1, kn: -0.1, yaw: 0.2 }], [0.5, { aA: [1.35, -0.25, 0.15], aB: [1.15, -0.15, 0.45], tw: -0.55, tl: 0.2, yaw: -0.2 }], [0.75, { aA: [1.15, -0.45, 0.35], aB: [1.0, -0.3, 0.6], tw: -0.4, tl: 0.15 }], [1, {}]],
  bow: [[0, {}], [0.3, { tl: 0.78, ht: 0.25, aA: [0.12, 0.08, 0.1], aB: [0.12, 0.08, 0.1] }], [0.7, { tl: 0.78, ht: 0.25, aA: [0.12, 0.08, 0.1], aB: [0.12, 0.08, 0.1] }], [1, {}]],
  kata: [[0, {}], [0.12, { lA: [0.55, -0.55], lB: [-0.2, -0.3], tw: 0.45, aA: [1.55, 0.08, 0.05], aB: [0.65, 0.25, 2.1] }], [0.3, { lA: [0.55, -0.55], lB: [-0.2, -0.3], tw: -0.45, aB: [1.55, 0.08, 0.05], aA: [0.65, 0.25, 2.1] }], [0.48, { lA: [1.45, -0.15], lB: [-0.1, -0.2], tl: -0.18, aA: [0.9, 0.45, 1.8], aB: [0.9, 0.45, 1.8] }], [0.66, { lA: [0.4, -0.5], lB: [-0.3, -0.4], tw: 0.35, aA: [2.6, 0.2, 0.6], aB: [0.7, 0.3, 1.9] }], [0.84, { lA: [0.55, -0.55], lB: [-0.2, -0.3], tw: -0.3, aA: [0.6, 0.25, 2.0], aB: [1.55, 0.08, 0.05] }], [1, {}]],
  seiza: [[0, {}], [0.12, { lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.05, ht: 0.12, aA: [0.35, 0.18, 0.95], aB: [0.35, 0.18, 0.95] }], [0.9, { lA: [1.45, -2.75], lB: [1.45, -2.75], tl: 0.05, ht: 0.18, aA: [0.35, 0.18, 0.95], aB: [0.35, 0.18, 0.95] }], [1, {}]],
  guard: [[0, {}], [0.2, { lA: [0.45, -0.5], lB: [-0.25, -0.35], tw: 0.3, aA: [1.25, 0.15, 1.9], aB: [1.05, 0.2, 2.2] }], [0.8, { lA: [0.45, -0.5], lB: [-0.25, -0.35], tw: 0.3, aA: [1.25, 0.15, 1.9], aB: [1.05, 0.2, 2.2] }], [1, {}]],
  pickswing: [[0, {}], [0.35, { aA: [2.95, 0.15, 0.55], aB: [2.85, 0.1, 0.7], tl: -0.14, ht: -0.1 }], [0.55, { aA: [0.95, 0.1, 0.1], aB: [0.95, 0.05, 0.2], tl: 0.42, kn: -0.22, ht: 0.25 }], [0.8, { aA: [1.05, 0.1, 0.2], aB: [1.0, 0.05, 0.3], tl: 0.36, kn: -0.15, ht: 0.2 }], [1, {}]],
  reap: [[0, { tl: 0.5, lA: [0.95, -1.4], lB: [0.4, -0.55], drop: 6, aA: [0.95, 0.75, 0.45], aB: [0.6, 0.2, 0.8], ht: 0.3 }], [0.5, { tl: 0.6, lA: [0.95, -1.4], lB: [0.4, -0.55], drop: 6, aA: [0.95, -0.55, 0.3], aB: [0.6, 0.2, 0.8], tw: -0.3, ht: 0.35 }], [1, { tl: 0.5, lA: [0.95, -1.4], lB: [0.4, -0.55], drop: 6, aA: [0.95, 0.75, 0.45], aB: [0.6, 0.2, 0.8], ht: 0.3 }]],
  punch: [[0, {}], [0.3, { aA: [1.15, 0.1, 2.3], aB: [1.25, 0.1, 2.2], tw: 0.35, tl: -0.04, lA: [0.25, -0.15] }], [0.5, { aA: [1.55, 0.05, 0.12], aB: [1.2, 0.1, 2.25], tw: -0.4, tl: 0.14, lA: [0.35, -0.1], lB: [-0.2, -0.05] }], [0.72, { aA: [1.35, 0.1, 1.0], aB: [1.2, 0.1, 2.2], tw: -0.15, tl: 0.06 }], [1, {}]],
};
const ACT_MS = { pour: 6000, cookfull: 6000, kneelput: 1600, massage: 5000, smoke: 9000, bow: 1600, kata: 2600, seiza: 8000, guard: 1500, fireball: 500, sbash: 600, chop: 750, pickswing: 750, reap: 750, sheatheH: 500, drawwpH: 500, sheatheB: 750, drawwpB: 750, punch: 520, gather: 700, cuff: 1900, key: 1100, shove: 700, lever: 1100, cheer: 1400, surprise: 1000, adore: 2600, anger: 1400, fear: 1600, sad: 2200, cook: 3000, sweep: 1400, loose: 350, nock: 800, drinkb: 1600, scoop: 1500, hurt_head: 420, hurt_leg: 420, getup: 650, kick: 520, execute: 720, quiver: 760, turnshot: 950, dualcast: 560, turncast: 950, salute: 1200, point: 1300, dance: 900, hurt: 300, swing: 440, bash: 560, spin: 560, block: 650, warcry: 700, shoot: 440, double: 620, pierce: 640, rain: 560, dash: 560, bolt: 400, fireball: 520, nova: 620, heal: 680, meteor: 720, cast: 600, bite: 320 };
const IDLES = {
  look: [[0, {}], [0.25, { hw: 0.6 }], [0.6, { hw: -0.6 }], [1, {}]],
  stretch: [[0, {}], [0.4, { aA: [3.0, 0.3, 0.2], aB: [3.0, 0.3, 0.2], tl: -0.12, mouth: 1, wp: 3.1 }], [0.7, { aA: [3.0, 0.3, 0.2], aB: [3.0, 0.3, 0.2], tl: -0.12, wp: 3.1 }], [1, {}]],
  yawn: [[0, {}], [0.3, { aB: [1.4, 0.15, 1.9], ht: -0.15, mouth: 1 }], [0.7, { aB: [1.4, 0.15, 1.9], ht: -0.15, mouth: 1 }], [1, {}]],
  kick: [[0, {}], [0.3, { lA: [0.6, -0.3] }], [0.5, { lA: [0.1, 0] }], [0.7, { lA: [0.6, -0.3] }], [1, {}]],
  polish: [[0, {}], [0.3, { aA: [1.3, 0.0, 0.9], aB: [1.2, 0.0, 1.2], wp: 1.57, tl: 0.1, ht: 0.25 }], [0.8, { aA: [1.3, 0.0, 0.9], aB: [1.25, 0.0, 1.0], wp: 1.57, tl: 0.1, ht: 0.25 }], [1, {}]],
  pray: [[0, {}], [0.3, { aA: [1.0, -0.1, 1.5], aB: [1.0, -0.1, 1.5], ht: 0.25 }], [0.85, { aA: [1.0, -0.1, 1.5], aB: [1.0, -0.1, 1.5], ht: 0.25 }], [1, {}]],
  salute: [[0, {}], [0.3, { aA: [2.4, 0.4, 1.4] }], [0.8, { aA: [2.4, 0.4, 1.4] }], [1, {}]],
  drink: [[0, {}], [0.3, { aA: [1.5, 0.1, 1.8], ht: -0.2 }], [0.7, { aA: [1.5, 0.1, 1.8], ht: -0.25 }], [1, {}]],
  read: [[0, {}], [0.2, { aA: [0.9, 0.0, 1.1], aB: [0.9, 0.0, 1.1], ht: 0.3 }], [0.9, { aA: [0.9, 0.0, 1.1], aB: [0.9, 0.0, 1.1], ht: 0.3 }], [1, {}]],
  wave: [[0, {}], [0.25, { aA: [2.6, 0.5, 0.5] }], [0.45, { aA: [2.6, 0.8, 0.2] }], [0.65, { aA: [2.6, 0.5, 0.5] }], [1, {}]],
  // ---- vida na cidade: conversar gesticulando, ouvir balançando a cabeça, rir, apontar, braços cruzados, mãos para trás,
  //      coçar a cabeça, olhar o céu, dar de ombros, encostar, comer em pé ----
  talk: [[0, {}], [0.12, { aA: [0.9, 0.25, 1.3], aB: [0.35, 0.15, 0.6], hw: 0.08 }], [0.3, { aA: [1.25, 0.4, 0.85], aB: [0.6, 0.25, 1.0], hw: -0.05, mouth: 1 }], [0.48, { aA: [0.8, 0.2, 1.45], aB: [0.35, 0.15, 0.7], hw: 0.12 }], [0.66, { aA: [1.15, 0.5, 0.7], aB: [0.75, 0.3, 1.1], mouth: 1 }], [0.84, { aA: [0.95, 0.3, 1.2], aB: [0.4, 0.15, 0.7], hw: -0.08 }], [1, {}]],
  listen: [[0, {}], [0.15, { ht: 0.12, aB: [0.25, 0.1, 0.5] }], [0.3, { ht: -0.04, aB: [0.25, 0.1, 0.5] }], [0.45, { ht: 0.14, aB: [0.25, 0.1, 0.5], hw: 0.06 }], [0.6, { ht: -0.02, aB: [0.25, 0.1, 0.5] }], [0.8, { ht: 0.1, hw: -0.06, aB: [0.25, 0.1, 0.5] }], [1, {}]],
  laugh: [[0, {}], [0.15, { tl: -0.14, ht: -0.32, mouth: 1, aB: [0.55, 0.1, 1.7] }], [0.32, { tl: 0.16, ht: 0.12, mouth: 1, aB: [0.6, 0.1, 1.7] }], [0.5, { tl: -0.12, ht: -0.28, mouth: 1, aB: [0.55, 0.1, 1.7] }], [0.7, { tl: 0.14, ht: 0.08, mouth: 1, aB: [0.6, 0.1, 1.6] }], [1, {}]],
  point: [[0, {}], [0.25, { aA: [1.62, 0.25, 0.05], hw: 0.12, tl: 0.04 }], [0.5, { aA: [1.66, 0.3, 0.05], hw: 0.15, tl: 0.04, mouth: 1 }], [0.8, { aA: [1.62, 0.25, 0.05], hw: 0.12 }], [1, {}]],
  crossarms: [[0, {}], [0.2, { aA: [0.75, -0.45, 2.05], aB: [0.7, -0.45, 2.0], tl: -0.05 }], [0.55, { aA: [0.75, -0.45, 2.05], aB: [0.7, -0.45, 2.0], tl: -0.05, hw: 0.35 }], [0.85, { aA: [0.75, -0.45, 2.05], aB: [0.7, -0.45, 2.0], tl: -0.05, hw: -0.2 }], [1, {}]],
  handsback: [[0, {}], [0.2, { aA: [-0.45, 0.12, 1.25], aB: [-0.45, 0.12, 1.25], tl: -0.06, ht: -0.05 }], [0.6, { aA: [-0.45, 0.12, 1.25], aB: [-0.45, 0.12, 1.25], tl: -0.06, hw: 0.4 }], [0.85, { aA: [-0.45, 0.12, 1.25], aB: [-0.45, 0.12, 1.25], tl: -0.06, hw: -0.3 }], [1, {}]],
  scratch: [[0, {}], [0.25, { aA: [2.3, 0.65, 2.55], ht: 0.18, hw: 0.1 }], [0.45, { aA: [2.4, 0.6, 2.65], ht: 0.2, hw: 0.12 }], [0.65, { aA: [2.3, 0.65, 2.55], ht: 0.18, hw: 0.1 }], [1, {}]],
  lookup: [[0, {}], [0.3, { ht: -0.55, tl: -0.1, hw: 0.2 }], [0.7, { ht: -0.55, tl: -0.1, hw: -0.25 }], [1, {}]],
  shrug: [[0, {}], [0.3, { aA: [0.35, 0.55, 1.5], aB: [0.35, 0.55, 1.5], ht: 0.12, hw: 0.15, mouth: 1 }], [0.7, { aA: [0.35, 0.6, 1.55], aB: [0.35, 0.6, 1.55], ht: 0.14, hw: 0.15 }], [1, {}]],
  lean: [[0, {}], [0.2, { tl: -0.14, lA: [0.35, -0.75], lB: [-0.08, -0.04], aA: [0.15, 0.25, 0.3], aB: [0.1, 0.3, 0.2], kn: -0.05 }], [0.85, { tl: -0.14, lA: [0.35, -0.75], lB: [-0.08, -0.04], aA: [0.15, 0.25, 0.3], aB: [0.1, 0.3, 0.2], hw: 0.3 }], [1, {}]],
  eatstand: [[0, { apple: 1 }], [0.2, { aA: [1.55, 0.1, 2.35], apple: 1, ht: -0.05 }], [0.35, { aA: [1.6, 0.1, 2.45], apple: 1, ht: -0.08, mouth: 1 }], [0.55, { aA: [1.1, 0.12, 1.4], apple: 1 }], [0.75, { aA: [1.6, 0.1, 2.45], apple: 1, mouth: 1 }], [1, { apple: 1 }]],
};

function sampleKeys(keys, p) {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (p >= keys[i][0] && p <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
  const t = ease((p - a[0]) / ((b[0] - a[0]) || 1));
  return { a: a[1], b: b[1], t };
}
function mixField(base, a, b, t, key) {
  const va = a[key] ?? base[key], vb = b[key] ?? base[key];
  if (va == null && vb == null) return undefined;
  if (Array.isArray(va) || Array.isArray(vb)) { const x = va || vb, y = vb || va; return x.map((v, i) => lerp(v, y[i], t)); }
  return lerp(va ?? 0, vb ?? 0, t);
}

// calcula a pose final (ângulos) a partir de caminhada + ação + idle
function buildPose(cls, P) {
  const base = P.shea ? BASE.free : BASE[cls] || BASE.knight;
  const Q = { aA: base.aA.slice(), aB: base.aB.slice(), wp: base.wp, tl: base.tl, tw: 0, lA: [0.04, -0.06], lB: [-0.04, -0.06], kn: 0, drop: 0, ht: 0, hw: 0, mouth: 0, pull: 0, glow: 0, bot: 0, harrow: 0, broom: 0, apple: 0, ay: 0, wr: 0 };
  if (P.walk >= 0) {
    // ciclo de passada: a perna de apoio fica quase reta; o joelho dobra quando a perna avança
    const ph = P.walk / 12 * Math.PI * 2;
    const heavy = cls === 'knight' ? 1 : cls === 'mage' ? 0.6 : 0.4;
    const run = P.run ? 1 : 0, amp = (0.42 + (1 - heavy) * 0.06) * (1 + run * 0.45);
    const leg = p => {
      const hip = Math.sin(p) * amp;
      const swing = Math.max(0, Math.sin(p + 1.2));            // fase em que a perna vai para a frente
      const knee = -(Math.pow(swing, 1.4) * (0.95 + heavy * 0.2)) - 0.06 - (Math.cos(p) > 0.85 ? 0.12 : 0);
      return [hip, knee];
    };
    Q.lA = leg(ph); Q.lB = leg(ph + Math.PI);
    const armSw = (0.32 - heavy * 0.1) * (1 + run * 0.8);
    if (run) { Q.tl += 0.16; Q.aA[2] += cls === 'knight' ? 0 : 0.5; Q.aB[2] += 0.6; }
    Q.aB[0] += Math.sin(ph) * armSw; Q.aB[2] += 0.15 + Math.max(0, Math.sin(ph)) * 0.25;
    if (cls !== 'knight' || P.shea) { Q.aA[0] += -Math.sin(ph) * armSw * 0.7; Q.aA[2] += 0.1 + Math.max(0, -Math.sin(ph)) * 0.2; }
    Q.tl += 0.06 + heavy * 0.05;
    Q.tw += -Math.sin(ph) * (0.06 + heavy * 0.06);          // ombros giram ao contrário do quadril
    Q.sway = Math.sin(ph) * (0.035 + heavy * 0.02);            // quadril balança para os lados
    Q.ht += Math.abs(Math.cos(ph)) * 0.03;
    if (P.gait) gaitPose(Q, P.gait, ph);
  }
  if (P.drag === 'arms') {   // de costas, curvado para trás fazendo força, as duas mãos nos pulsos do corpo; tranco a cada passo
    const ph = P.walk >= 0 ? P.walk / 12 * Math.PI * 2 : 0, jerk = P.walk >= 0 ? Math.max(0, Math.sin(ph * 2)) * 0.12 : 0;
    Q.aA = [0.42 + jerk, 0.1, 0.06]; Q.aB = [0.42 + jerk, 0.1, 0.06]; Q.tl = -0.22 - jerk; Q.kn = -0.62; Q.ht = 0.3; Q.wp = Q.aA[0] + 0.3;
    if (P.walk >= 0) { Q.lA = [Q.lA[0] * 0.55, Q.lA[1] * 0.7 - 0.25]; Q.lB = [Q.lB[0] * 0.55, Q.lB[1] * 0.7 - 0.25]; }
  } else if (P.drag === 'foot') {   // de frente, inclinado, um braço esticado para trás segurando o tornozelo
    Q.aA = [-0.62, 0.18, 0.05]; Q.tl = 0.32; Q.kn = -0.2; Q.ht = -0.1; Q.wp = -0.4;
  } else if (P.drag === 'back') {   // corpo dobrado sobre o ombro: a mão segura as pernas, o tronco curvado com o peso
    Q.aA = [1.55, 0.3, 2.35]; Q.tl = 0.18; Q.kn = -0.15; Q.ht = 0.08;
  } else if (P.drag === 'lead') {   // sentinela conduzindo: uma mão no braço do preso, a outra no ombro
    Q.aA = [1.05, 0.05, 0.55]; Q.aB = [1.2, -0.15, 1.0]; Q.tl = 0.06;
  } else if (P.drag === 'grip') {   // mata-leão: um braço em volta do pescoço, a outra mão travando por trás da cabeça
    Q.aA = [1.35, -0.55, 2.0]; Q.aB = [1.75, 0.35, 2.45]; Q.tl = -0.12; Q.kn = -0.25; Q.ht = 0.15;
  }
  if (P.held) {   // preso no mata-leão: mãos puxando o braço do pescoço; sufocando, se debate e as pernas fraquejam
    const sh = P.held === 2 ? [0, 0.12, -0.08, 0.1][Math.floor(Date.now() / 90) % 4] : 0;
    Q.aA = [1.85 + sh, 0.2, 2.45]; Q.aB = [1.8 - sh, 0.2, 2.4]; Q.ht = -0.35 - (P.held === 2 ? 0.15 : 0); Q.tl = -0.1; if (P.held === 2) { Q.kn = -0.5; Q.lA = [0.4, -0.7]; Q.lB = [0.1, -0.5 + sh]; }
  }
  const apply = (keys, p) => {
    const { a, b, t } = sampleKeys(keys, p);
    for (const k of ['aA', 'aB', 'wp', 'tl', 'tw', 'lA', 'lB', 'kn', 'drop', 'ht', 'hw', 'mouth', 'pull', 'glow', 'yaw', 'bot', 'harrow', 'broom', 'apple', 'ay', 'wr', 'tokk', 'tokt', 'tuck', 'ladle', 'spat', 'pinch', 'plate']) {
      if (a[k] == null && b[k] == null) continue;
      const v = mixField(Q, a, b, t, k);
      if (v !== undefined) Q[k] = v;
    }
  };
  if (P.act && ACTS[P.act.k]) apply(ACTS[P.act.k], (P.act.f + 0.5) / 12);
  else if (P.idle && IDLES[P.idle.k]) apply(IDLES[P.idle.k], (P.idle.f + 0.5) / 12);
  if (P.hold && !P.act) holdPose(Q, P.hold, P);
  if (P.tool) Q['t_' + P.tool] = 1;
  if (P.sl) { Q.lA = [1.4, -0.12]; Q.lB = [0.35, -2.15]; Q.tl = -0.6; Q.tw = 0; Q.aA = [0.5, 1.0, 0.25]; Q.aB = [0.3, 1.1, 0.35]; Q.drop = 10; }
  else if (P.cr) {
    const ph = P.walk >= 0 ? P.walk / 12 * Math.PI * 2 : 0, s = P.walk >= 0 ? 0.3 : 0;
    Q.lA = [1.05 + Math.sin(ph) * s, -1.95 - Math.max(0, Math.sin(ph + 1.2)) * 0.35]; Q.lB = [0.7 + Math.sin(ph + Math.PI) * s, -1.55 - Math.max(0, Math.sin(ph + Math.PI + 1.2)) * 0.35];
    Q.tl += 0.42; Q.drop = 6; if (!P.act) { Q.aA[0] += 0.25; Q.aB[0] += 0.25; }
  }
  if (P.hs && !P.sl) {
    const br = P.br != null ? [0, 0.6, 1, 0.6][P.br] : 0;
    if (P.hs === 1) {
      // exausto: curvado, cabeça baixa, respiração pesada; andando, braços caídos arrastando a arma e passos arrastados
      Q.tl += 0.16 + br * 0.07; Q.ht = (Q.ht || 0) + 0.1 + br * 0.04;
      // braços pendurados na vertical (compensa a curvatura do tronco) e a ponta da arma arrastando atrás
      if (!P.act) { const t = Q.tl; Q.aA = [-t * 0.9, 0.16, 0.08]; Q.aB = [-t * 0.85, 0.14, 0.12]; const arm = Q.aA[0] + Q.aA[2]; Q.wp = cls === 'knight' ? arm + 0.25 : cls === 'mage' ? arm + Math.PI + 0.35 : Q.wp; }
      if (P.walk >= 0 && !P.cr && P.run) {
        // corrida exausta: tronco despencado, cabeça pendendo, passos pesados e desiguais, braços soltos balançando
        const ph = P.walk / 12 * Math.PI * 2;
        Q.tl += 0.18 + Math.abs(Math.sin(ph)) * 0.1; Q.ht += 0.12 + Math.abs(Math.cos(ph)) * 0.1;
        Q.lA = [Q.lA[0] * 0.85, Q.lA[1] * 0.75 - 0.1]; Q.lB = [Q.lB[0] * 0.7, Q.lB[1] * 0.6 - 0.1];
        Q.sway = (Q.sway || 0) * 2.6; Q.tw *= 1.6;
        if (!P.act) { const t = Q.tl; Q.aA = [-t * 0.7 + Math.sin(ph) * 0.55, 0.22, 0.25]; Q.aB = [-t * 0.7 - Math.sin(ph) * 0.5, 0.2, 0.3]; const arm = Q.aA[0] + Q.aA[2]; Q.wp = cls === 'knight' ? arm + 0.35 : cls === 'mage' ? arm + Math.PI + 0.45 : Q.wp; }
      } else if (P.walk >= 0 && !P.cr) { Q.lA = [Q.lA[0] * 0.55, Q.lA[1] * 0.4 - 0.04]; Q.lB = [Q.lB[0] * 0.55, Q.lB[1] * 0.4 - 0.04]; Q.tw *= 0.4; }
    }
    else if (P.hs === 3) {
      // de joelhos: um joelho no chão, mão no peito, arrastando-se devagar
      const ph = P.walk >= 0 ? P.walk / 12 * Math.PI * 2 : 0, s = P.walk >= 0 ? 0.18 : 0;
      Q.lA = [1.5 + Math.sin(ph) * s, -1.55]; Q.lB = [0.05 + Math.sin(ph + Math.PI) * s, -1.62];
      Q.tl = 0.3 + br * 0.08; Q.tw = 0; Q.sway = 0; Q.drop = 10; Q.ht = (Q.ht || 0) + 0.15 + br * 0.04;
      if (!P.act) { Q.aB = [0.85, 0.3, 2.05]; Q.aA = [0.15, 0.25, 0.25]; Q.wp = cls === 'knight' ? -0.2 : Q.wp; }
    }
    else { Q.tl += 0.36 + br * 0.07; if (!P.act) Q.aB = [0.85, 0.3, 2.05]; if (P.walk >= 0 && !P.cr) Q.lB = [Q.lB[0] * 0.45, -0.1]; Q.ht = (Q.ht || 0) + br * 0.04; }
  }
  if (P.down) { Q.aA = [0.5, 0.75, 0.6]; Q.aB = [0.25, 0.85, 0.35]; Q.lA = [0.35, -0.6]; Q.lB = [0.05, -0.12]; Q.tl = 0; Q.tw = 0.18; Q.ht = -0.25; Q.sway = 0; }
  // perna ferida: manca (a perna machucada quase não dobra, passo curto, tronco pende); braço da arma ferido pende
  if (P.limp && !P.sl && !P.sit) {
    const k = [0, 0.35, 0.7, 1][P.limp];
    if (P.walk >= 0) { Q.lB = [Q.lB[0] * (1 - k * 0.6), Q.lB[1] * (1 - k * 0.8)]; Q.sway = (Q.sway || 0) + Math.sin(P.walk / 12 * Math.PI * 2) * 0.08 * k; Q.tw += 0.12 * k; }
    Q.tl += 0.08 * k; if (P.limp >= 3 && !P.act) Q.aB = [0.35, 0.4, 0.6];
  }
  if (P.armw && !P.act) { Q.aA = [Q.tl * -0.5, 0.18, 0.12]; Q.wp = cls === 'knight' ? Q.aA[0] + Q.aA[2] + 0.2 : Q.wp; }
  if (P.sit === 'g') { Q.lA = [2.45, -2.35]; Q.lB = [2.2, -2.0]; Q.drop = 12; Q.aA = [1.15, 0.35, 1.35]; Q.aB = [1.05, 0.4, 1.25]; Q.tl = -0.22; Q.ht = 0.12; }
  if (P.med) { const br = Math.sin((P.med - 1) / 6 * Math.PI * 2); Q.lA = [1.5, -2.6, 0, -0.75]; Q.lB = [1.5, -2.6, 0, 0.75]; Q.drop = 12; Q.aA = [0.42, 0.5, 0.95]; Q.aB = [0.42, 0.5, 0.95]; Q.tl = 0.03 + br * 0.03; Q.ht = 0.1 + br * 0.03; Q.wp = 0; }   /* lótus: pernas cruzadas, mãos nos joelhos, respiração lenta */
  else if (P.sit) { Q.lA = [1.5, -1.55]; Q.lB = [1.45, -1.5]; Q.drop = 12; Q.aA = [0.45, 0.25, 0.7]; Q.aB = [0.45, 0.25, 0.7]; Q.tl = -0.02; }
  if (P.tied) { Q.aA = [-0.45, -0.28, 0.35]; Q.aB = [-0.45, -0.28, 0.35]; Q.tl = 0.12; Q.ht = 0.3; Q.tie = P.tied; Q.nowp = 1; }   // mãos amarradas atrás das costas
  if (P.nowp) Q.nowp = 1;
  if (P.bed) { Q.aA = [0.08, 0.16, 0.12]; Q.aB = [0.08, 0.16, 0.12]; Q.lA = [0.02, -0.04]; Q.lB = [-0.02, -0.04]; Q.tl = 0; Q.tw = 0; Q.ht = 0.05; Q.sway = 0; Q.nowp = 1; }   // deitado na cama: esticado, braços ao lado do corpo, sem arma
  if (P.wpn === 'halberd' && !P.down && !P.sit) { if (!P.act) { Q.aA = [0.55, 0.12, 0.9]; Q.wp = 3.05; } Q.aB = [Q.aA[0] - 0.12, 0.28, Math.max(0.2, Q.aA[2] + 0.35)]; }   // em repouso: haste em pé, lâmina para cima   // alabarda: a mão esquerda segura a haste mais abaixo
  if (P.down && P.crawl) {   // rastejando de bruços: braços se alternam puxando o corpo; 5 = parado com uma mão estendida pedindo piedade
    const ph = (P.crawl - 1) / 4 * Math.PI * 2;
    if (P.crawl === 5) { Q.aA = [2.4, 0.2, 0.3]; Q.aB = [0.6, 0.7, 0.8]; Q.lA = [0.2, -0.3]; Q.lB = [0.1, -0.2]; }
    else { Q.aA = [2.2 + Math.sin(ph) * 0.6, 0.25, 0.5 + Math.max(0, Math.sin(ph)) * 0.5]; Q.aB = [2.2 - Math.sin(ph) * 0.6, 0.25, 0.5 + Math.max(0, -Math.sin(ph)) * 0.5]; Q.lA = [0.3 + Math.sin(ph) * 0.25, -0.4 - Math.max(0, Math.sin(ph)) * 0.5]; Q.lB = [0.3 - Math.sin(ph) * 0.25, -0.4 - Math.max(0, -Math.sin(ph)) * 0.5]; }
    Q.nowp = 1;
  }
  if (P.surr) { Q.aA = [2.6, 1.1, 2.6]; Q.aB = [2.6, 1.1, 2.6]; Q.ht = 0.25; Q.tl = 0.05; Q.nowp = 1; }                    // rendido: mãos na nuca
  if (P.led && P.walk >= 0) {   // andar forçado: passos curtos e desajeitados, curvado, tropeçando
    const ph = P.walk / 12 * Math.PI * 2, st = Math.max(0, Math.sin(ph * 2 + 0.6)) > 0.92 ? 0.25 : 0;
    Q.lA = [Q.lA[0] * 0.5, Q.lA[1] * 0.6 - 0.15 - st]; Q.lB = [Q.lB[0] * 0.5, Q.lB[1] * 0.6 - 0.15]; Q.tl += 0.28 + st * 0.5; Q.ht = (Q.ht || 0) + 0.25; Q.sway = (Q.sway || 0) * 1.8;
  }
  if (P.smk != null || P.eat != null) {   // fumando cachimbo / comendo: a mão vai à boca de tempos em tempos
    const ph = Math.floor((P.smk ?? P.eat) * 8) / 8, up = ph >= 0.25 && ph < 0.5;
    Q.aA = up ? [1.6, 0.2, 2.45] : [0.75, 0.3, 1.25]; if (up) Q.ht = -0.12; if (P.smk != null) { if (P.cig) Q.cig = 1; else Q.pipe = 1; }
  }
  if (P.sit && P.sv) {
    if (P.sit === 'g') {
      if (P.sv === 1) { Q.lA = [1.45, -0.12]; Q.lB = [1.25, -0.55]; Q.tl = -0.55; Q.aA = [-0.75, 0.32, 0.05]; Q.aB = [-0.75, 0.32, 0.05]; Q.ht = -0.15; }
      else { Q.lA = [2.75, -2.7]; Q.lB = [2.7, -2.65]; Q.tl = 0.4; Q.aA = [1.0, 0.12, 1.85]; Q.aB = [1.0, 0.12, 1.85]; Q.ht = 0.3; }
    } else {
      if (P.sv === 1) { Q.tl = -0.22; Q.aA = [2.75, 0.55, 2.4]; Q.aB = [2.75, 0.55, 2.4]; Q.lB = [1.75, -0.7]; Q.ht = -0.12; }
      else { Q.tl = 0.48; Q.aA = [0.85, 0.15, 1.55]; Q.aB = [0.85, 0.15, 1.55]; Q.ht = 0.2; }
    }
  }
  if (P.carry) { Q.aA = [2.75, 0.25, 0.4]; Q.aB = [2.75, 0.25, 0.4]; Q.wp = 0.4; }
  if (Q.kn) { Q.lA = [Q.lA[0] - Q.kn * 0.5, Q.lA[1] + Q.kn]; Q.lB = [Q.lB[0] - Q.kn * 0.5, Q.lB[1] + Q.kn]; }
  return Q;
}

// ---------- montagem do esqueleto ----------
function skeleton(Q, view) {
  const ct = Math.cos(Q.tw), st = Math.sin(Q.tw), cl = Math.cos(Q.tl), sl = Math.sin(Q.tl);
  // tronco: gira (tw) e inclina (tl) em volta da pelve
  const up = p => { let f = p[0] * ct - p[1] * st, s = p[0] * st + p[1] * ct, v = p[2]; const f2 = f * cl - v * sl, v2 = f * sl + v * cl; return [f2, s, v2]; };
  const upDir = d => up(d);
  const sh = side => up([0, side * BODY.shoulder, BODY.neck + 2]);
  const arm = (a, side) => {
    const s0 = sh(side), d1 = upDir(dir3(a[0], a[1], side)), el = add3(s0, mul3(d1, BODY.upper));
    const d2 = upDir(dir3(a[0] + a[2], a[1], side)), hand = add3(el, mul3(d2, BODY.fore));
    return { s: s0, e: el, h: hand, d: d2 };
  };
  const leg = (l, side) => {
    const h0 = [0, side * BODY.hip, 0], d1 = dir3(l[0], 0, side), kn = add3(h0, mul3(d1, BODY.thigh));
    const d2 = dir3(l[0] + l[1], 0, side), ft = add3(kn, mul3(d2, BODY.shin));
    return { h: h0, k: kn, f: ft };
  };
  const A = arm(Q.aA, 1), Bm = arm(Q.aB, -1), LA = leg(Q.lA, 1), LB = leg(Q.lB, -1);
  const neck = up([0, 0, BODY.neck]), head = up([0, 0, BODY.head]), pelvis = [0, 0, 0];
  const fwd = up([1, 0, 0]);
  const wdir = upDir([Math.sin(Q.wp), 0, Math.cos(Q.wp)]);
  // apoio no chão: o pé mais baixo encosta no solo
  const footV = Math.max(LA.f[2], LB.f[2]);
  const oy = HAY - 2 - footV + Q.drop * 0;
  const P2 = p => { const q = proj(p, view); return [HAX + q[0], oy + q[1], q[2]]; };
  return { A, B: Bm, LA, LB, neck, head, pelvis, fwd, wdir, P2, oy, up };
}

// ---------- desenho ----------
function drawHeroPC(pc, L, P, cls) {
  const view = P.view, Q = buildPose(cls, P), K = skeleton(Q, view), P2 = K.P2;
  const parts = [];
  const add = (d, fn) => parts.push({ d, fn });
  const capP = (a, b, ra, rb, T) => { const p1 = P2(a), p2 = P2(b); pc.cap(p1[0], p1[1], p2[0], p2[1], ra, rb, T); };
  const dOf = (...pts) => pts.reduce((s, p) => s + P2(p)[2], 0) / pts.length;
  const robe = L.armor === 'robe';
  const sleeve = L.armor === 'vest' ? tone('#cfc6b4') : L.body;
  const glove = L.armor === 'plate' ? L.body : L.armor === 'leather' ? L.body2 : L.skin;

  // capa
  if (L.cape && L.capeTone) {
    const sway = P.walk >= 0 ? 4 : 1.5, sA = K.A.s, sB = K.B.s, back = mul3(K.fwd, -1);
    const bA = add3(add3(sA, mul3(back, 3 + sway)), [0, 0.8, 27]), bB = add3(add3(sB, mul3(back, 3 + sway)), [0, -0.8, 27]);
    add(dOf(sA, sB) - 4.5 * (view === 'N' ? -1 : 1) * 0 + (view === 'N' ? 3 : -3), () => {
      const a = P2(sA), b = P2(sB), c = P2(bB), d = P2(bA);
      const T = L.capeTone;
      pc.poly([a[0], a[1] - 1, b[0], b[1] - 1, c[0], c[1], d[0], d[1]], 0, (x, y) => lit(T, ((x * 3 + y) % 11 < 2 ? -0.5 : 0.05) - (y - a[1]) / 60, x, y));
    });
  }
  // aljava
  if (L.quiver) {
    const q0 = K.up([-4, -3, BODY.neck + 1]), q1 = K.up([-4, 3, -6]);
    add(dOf(q0, q1) - 2, () => {
      capP(q0, q1, 2.6, 2.4, tone('#5a3a22'));
      const t = P2(q0);
      for (let k = 0; k < 4; k++) { pc.P(Math.round(t[0] - 2 + k * 1.5), Math.round(t[1] - 3), px('#e8e2d0')); pc.P(Math.round(t[0] - 2 + k * 1.5), Math.round(t[1] - 4), px('#a83226')); }
    });
  }
  // pernas
  for (const [Lg, far] of [[K.LA, 0], [K.LB, 1]]) {
    add(dOf(Lg.h, Lg.k, Lg.f), () => {
      const pants = L.legs, boots = L.boots;
      capP(Lg.h, Lg.k, 3.2, 2.7, pants);
      const mid = add3(Lg.k, mul3(add3(Lg.f, mul3(Lg.k, -1)), 0.35));
      capP(Lg.k, mid, 2.6, 2.4, pants);
      capP(mid, Lg.f, 2.6, 2.3, boots);
      const toe = add3(Lg.f, mul3(K.fwd, 3.5));
      capP(Lg.f, add3(toe, [0, 0, 0.5]), 2.2, 1.8, boots);
      if (L.armor === 'plate') { const kp = P2(Lg.k); pc.e(kp[0], kp[1], 2.4, 2, 0, (x, y, nx, ny) => lit(L.body, -nx * 0.5 - ny * 0.6 + 0.3, x, y)); }
    });
  }
  // tronco
  add(0, () => {
    const pv = P2(K.pelvis), nk = P2(K.neck);
    const wS = view === 'E' ? 6.5 : 9.5, wC = view === 'E' ? 6.8 : 8.6, wW = view === 'E' ? 5.4 : 6.6, wH = view === 'E' ? 5.6 : 7.2;
    const ax = nk[0] - pv[0], ay = nk[1] - pv[1], al = Math.hypot(ax, ay) || 1, nx = -ay / al, ny = ax / al;
    const lv = [[0, wH], [0.35, wW], [0.72, wC], [1, wS]];
    const ptsR = [], ptsL = [];
    for (const [t, w] of lv) { const cx = pv[0] + ax * t, cy = pv[1] + ay * t; ptsR.push(cx + nx * w, cy + ny * w); ptsL.unshift(cx - nx * w, cy - ny * w); }
    const wAt = t => t < 0.35 ? lerp(wH, wW, t / 0.35) : t < 0.72 ? lerp(wW, wC, (t - 0.35) / 0.37) : lerp(wC, wS, (t - 0.72) / 0.28);
    const T = L.body;
    pc.poly([...ptsR, ...ptsL.slice(0)].map(v => v), 0, (x, y) => {
      const rx = x + 0.5 - pv[0], ry = y + 0.5 - pv[1], t = clamp((rx * ax + ry * ay) / (al * al), 0, 1);
      const side = (rx * nx + ry * ny) / wAt(t);
      let l = -side * 0.75 * (view === 'N' ? -1 : 1) + 0.15 - side * side * 0.25 + (t - 0.5) * 0.25;
      if (L.pattern === 'scales' && (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0) l -= 0.25;
      if (L.pattern === 'stars' && hash2(x, y, 7) < 0.04) return L.trim.lll;
      if (L.pattern === 'leaves' && hash2(x >> 1, y >> 1, 9) < 0.12) return L.body2.l;
      return lit(T, l, x, y);
    });
    // detalhes do peito e cinto
    const at = (t, s) => [pv[0] + ax * t + nx * s, pv[1] + ay * t + ny * s];
    const beltY = 0.3;
    for (let s = -wW; s <= wW; s += 0.5) { const p = at(beltY, s); pc.P(Math.round(p[0]), Math.round(p[1]), L.body2.d); pc.P(Math.round(p[0]), Math.round(p[1]) + 1, L.body2.b); }
    { const p = at(beltY, view === 'E' ? 2 : 0); pc.e(p[0], p[1] + 0.5, 1.6, 1.4, L.trim.l); }
    if (view === 'S' && L.armor === 'plate') {
      // tabardo com brasão
      const top = at(0.85, 0), bot = at(-0.25, 0);
      pc.poly([top[0] - 3.5, top[1], top[0] + 3.5, top[1], bot[0] + 3.8, bot[1], bot[0], bot[1] + 3, bot[0] - 3.8, bot[1]], 0, (x, y) => lit(L.accent, (x - top[0]) / -6 + 0.1, x, y));
      const em = at(0.6, 0); pc.poly([em[0], em[1] - 3, em[0] + 2.5, em[1], em[0], em[1] + 3, em[0] - 2.5, em[1]], 0, (x, y) => lit(L.trim, 0.4 - (y - em[1]) / 6, x, y));
    }
    if (view === 'E' && L.armor === 'plate') { const top = at(0.8, 3), bot = at(-0.25, 3.5); pc.poly([top[0] - 1.5, top[1], top[0] + 2.5, top[1], bot[0] + 2.5, bot[1], bot[0] - 1.5, bot[1]], 0, (x, y) => lit(L.accent, -0.1, x, y)); }
    if (view === 'S' && L.armor === 'leather') for (let k = 0; k < 4; k++) { const p = at(0.45 + k * 0.1, (k % 2 ? 1 : -1)); pc.P(Math.round(p[0]), Math.round(p[1]), L.body2.dd); }
    if (L.armor === 'vest' && view !== 'N') { const a = at(0.85, view === 'E' ? 2 : -3), b = at(0.0, view === 'E' ? 3 : -3.5); pc.poly([a[0], a[1], a[0] + (view === 'E' ? 4 : 6), a[1], b[0] + (view === 'E' ? 4.5 : 7), b[1], b[0], b[1]], 0, (x, y) => lit(L.body2, 0.1, x, y)); }
    if (robe) {
      const sw = P.walk >= 0 ? Math.sin(P.walk / 8 * Math.PI * 2) * 1.5 : 0;
      const wl = at(0.32, -wW - 0.5), wr = at(0.32, wW + 0.5);
      const hemY = Math.max(P2(K.LA.f)[1], P2(K.LB.f)[1]) - 2;
      const spread = view === 'E' ? 4 : 5.5;
      pc.poly([wl[0], wl[1], wr[0], wr[1], wr[0] + spread + sw, hemY, wl[0] - spread + sw, hemY], 0, (x, y) => {
        const t = (x - (wl[0] - spread)) / (wr[0] - wl[0] + spread * 2);
        if (y >= hemY - 2) return lit(L.trim, 0.2, x, y);
        if (view === 'S' && Math.abs(x + 0.5 - (wl[0] + wr[0]) / 2 - sw * (y - wl[1]) / (hemY - wl[1])) < 1) return L.trim.b;
        if (L.pattern === 'stars' && hash2(x, y, 7) < 0.04) return L.trim.lll;
        return lit(L.body, (0.5 - t) * 1.2 * (view === 'N' ? -1 : 1) + ((x + y * 2) % 13 < 2 ? -0.4 : 0), x, y);
      });
    }
  });
  // braços
  const armPart = (Ar, isA) => () => {
    capP(Ar.s, Ar.e, robe ? 3.4 : 2.9, robe ? 3.2 : 2.4, sleeve);
    capP(Ar.e, Ar.h, robe ? 3.3 : 2.3, robe ? 2.8 : 2.0, robe ? sleeve : glove);
    if (robe) { const cuff = P2(add3(Ar.e, mul3(add3(Ar.h, mul3(Ar.e, -1)), 0.8))); pc.e(cuff[0], cuff[1], 2.6, 2.2, L.trim.b); }
    const hp = P2(Ar.h); pc.e(hp[0], hp[1], 2.1, 2.1, 0, (x, y, nx, ny) => lit(L.armor === 'plate' ? L.body : L.skin, -nx * 0.6 - ny * 0.6, x, y));
  };
  add(dOf(K.A.s, K.A.e, K.A.h) + 0.2, armPart(K.A, true));
  add(dOf(K.B.s, K.B.e, K.B.h), armPart(K.B, false));
  // ombreiras
  if (L.pauldron) for (const Ar of [K.A, K.B]) add(P2(Ar.s)[2] + 0.5, () => {
    const p = P2(Ar.s);
    pc.e(p[0], p[1] - 0.5, 3.6, 2.8, 0, (x, y, nx, ny) => lit(L.body, -nx * 0.6 - ny * 0.8 + 0.15, x, y));
    pc.l(p[0] - 3, p[1] + 1.8, p[0] + 3, p[1] + 1.8, L.trim.b, 1);
    if (L.pauldron === 'spike') { pc.l(p[0], p[1] - 2, p[0] - 1, p[1] - 6, L.body.ll, 1); pc.l(p[0] + 2, p[1] - 2, p[0] + 3, p[1] - 5, L.body.l, 1); }
    if (L.pauldron === 'wing') { pc.l(p[0], p[1] - 2, p[0] + (p[0] < HAX ? -4 : 4), p[1] - 7, L.trim.ll, 1); pc.l(p[0] + (p[0] < HAX ? -1 : 1), p[1] - 1, p[0] + (p[0] < HAX ? -5 : 5), p[1] - 4, L.trim.l, 1); }
  });
  // cabeça
  add(P2(K.head)[2] + 0.3, () => drawHead2(pc, L, P2(K.head), P2(K.neck), view, Q));
  // arma
  if (L.weapon) add(P2(K.A.h)[2] + (view === 'N' ? -0.6 : 0.6), () => drawWeapon2(pc, L, K, Q, view));
  // escudo
  if (L.shield) add(P2(K.B.h)[2] + 0.8, () => drawShield2(pc, L, K, view));

  parts.sort((a, b) => a.d - b.d);
  for (const p of parts) p.fn();
}

function drawHead2(pc, L, h, nk, view, Q) {
  const E = view === 'E', N = view === 'N', sk = L.skin;
  const hx = h[0] + (E ? 0.5 : 0) + Q.hw * (view === 'S' ? 0 : 1.2), hy = h[1];
  // pescoço
  pc.cap(nk[0], nk[1] - 1, hx, hy + 4, 2.2, 2.0, sk);
  const helm = L.head === 'greathelm' || L.head === 'horned' || L.head === 'winged';
  const hood = L.head === 'hood' || L.head === 'furhood' || L.head === 'astralhood' || L.head === 'antlerhood';
  const fx = E ? 1 : 0; // deslocamento do rosto no perfil
  const look = view === 'S' ? Math.round(Q.hw * 1.5) : 0;
  if (!helm) {
    pc.e(hx, hy, 5.6, 6.4, 0, (x, y, nx, ny) => lit(sk, -nx * 0.55 - ny * 0.45 + 0.2 - (E && nx < -0.3 ? 0.3 : 0), x, y));
    if (!N) {
      const ey = Math.round(hy + 0.5), mouthY = Math.round(hy + 3.5 - Q.ht * 2);
      if (E) {
        pc.P(Math.round(hx + 3), ey, L.eyes); pc.P(Math.round(hx + 3), ey - 1, sk.dd); pc.P(Math.round(hx + 2), ey - 2, L.hair ? L.hair.d : sk.dd);
        pc.P(Math.round(hx + 6), ey + 1, sk.b); pc.P(Math.round(hx + 6), ey + 2, sk.d); pc.P(Math.round(hx + 5), ey + 2, sk.dd);
        pc.P(Math.round(hx + 4), mouthY, Q.mouth > 0.5 ? px('#4a1a14') : sk.dd);
        pc.e(hx - 1.5, hy + 0.5, 1.2, 1.6, sk.d);
      } else {
        for (const ex of [-2.5, 2.5]) { const X = Math.round(hx + ex - 0.5 + look); pc.P(X, ey, px('#e8e0d0')); pc.P(X + (ex < 0 ? 1 : 0), ey, L.eyes); pc.P(X, ey - 2, L.hair ? L.hair.d : sk.dd); pc.P(X + 1, ey - 2, L.hair ? L.hair.d : sk.dd); }
        pc.P(Math.round(hx), ey + 2, sk.d); pc.P(Math.round(hx - 1), ey + 2, sk.dd);
        if (Q.mouth > 0.5) { pc.P(Math.round(hx - 1), mouthY, px('#4a1a14')); pc.P(Math.round(hx), mouthY, px('#4a1a14')); pc.P(Math.round(hx - 1), mouthY + 1, px('#4a1a14')); pc.P(Math.round(hx), mouthY + 1, px('#4a1a14')); }
        else { pc.P(Math.round(hx - 1), mouthY, sk.dd); pc.P(Math.round(hx), mouthY, sk.dd); }
        if (L.scar) { pc.P(Math.round(hx + 2), ey - 1, px('#9a5444')); pc.P(Math.round(hx + 3), ey + 1, px('#9a5444')); pc.P(Math.round(hx + 3), ey, px('#9a5444')); }
      }
    }
    if (L.hair && !hood) {
      const hr = L.hair;
      pc.e(hx, hy - 1.2, 5.9, 5.8, 0, (x, y, nx, ny) => {
        const keep = N ? true : E ? (nx < 0.15 || ny < -0.5) : (ny < -0.42 || (Math.abs(nx) > 0.82 && ny < 0.35));
        return keep ? lit(hr, -nx * 0.4 - ny * 0.7 + ((x + y) % 3 === 0 ? -0.3 : 0), x, y) : 0;
      });
      if (L.hairStyle === 'long') { const side = E ? [-3.5] : [-5, 5]; for (const sx of side) pc.cap(hx + sx, hy, hx + sx * 1.1, hy + 10, 2, 1.6, hr); if (N) pc.cap(hx, hy, hx, hy + 10, 4.5, 3.5, hr); }
    }
    if (L.beard && !N) {
      if (E) pc.e(hx + 2.5, hy + 4.5, 3.5, 3.2, 0, (x, y, nx, ny) => lit(L.beard, -ny * 0.4 + ((x + y) % 2 ? -0.2 : 0.1), x, y));
      else { pc.e(hx, hy + 4.8, 4.8, 3.8, 0, (x, y, nx, ny) => ny < -0.3 && Math.abs(nx) < 0.35 ? 0 : lit(L.beard, -nx * 0.3 - ny * 0.3 + ((x + y) % 2 ? -0.15 : 0.1), x, y)); if (Q.mouth > 0.5) pc.r(hx - 1, hy + 3.5, 2, 2, px('#4a1a14')); }
    }
  }
  const H = L.headTone;
  switch (L.head) {
    case 'greathelm': case 'horned': case 'winged': {
      pc.e(hx, hy, 6, 6.8, 0, (x, y, nx, ny) => lit(H, -nx * 0.65 - ny * 0.5 + 0.2 + (Math.abs(nx - 0.05) < 0.08 && !E ? 0.4 : 0), x, y));
      if (!N) {
        if (E) { pc.r(hx + 1, hy - 0.5, 5, 1, px('#100c08')); for (let k = 0; k < 3; k++) pc.P(Math.round(hx + 3 + (k % 2)), Math.round(hy + 2 + k), px('#100c08')); }
        else { pc.r(hx - 4.5, hy - 0.5, 9, 1, px('#100c08')); pc.r(hx - 0.5, hy + 1, 1, 4, H.d); for (const ox of [-2.5, 2.5]) { pc.P(Math.round(hx + ox), Math.round(hy + 3), px('#100c08')); pc.P(Math.round(hx + ox), Math.round(hy + 4.5), px('#100c08')); } }
      }
      pc.r(hx - 6, hy + 5.2, 12, 1.2, H.dd);
      if (L.head === 'greathelm') {
        const pl = L.plume;
        for (let k = 0; k < 9; k++) { const t = k / 8, x = hx - (E ? 1 + t * 9 : t * 2 - 1), y = hy - 6.5 - Math.sin(t * Math.PI) * 4 + t * 3; pc.e(x, y, 1.8, 1.4, 0, (xx, yy, nx, ny) => lit(pl, -ny * 0.6 + 0.1, xx, yy)); }
      } else if (L.head === 'horned') {
        const hn = tone('#d6c9aa');
        const horn = (sx, d) => { for (let k = 0; k < 8; k++) { const t = k / 7; pc.e(hx + sx + d * t * 4, hy - 3 - t * 6 + t * t * 2, 1.6 - t * 0.9, 1.6 - t * 0.9, 0, (x, y, nx, ny) => lit(hn, -nx * 0.5 - ny * 0.4 + 0.2, x, y)); } };
        if (E) horn(-2, -1); else { horn(-5, -1); horn(5, 1); }
        pc.P(Math.round(hx), Math.round(hy - 5), px('#e04a2a'));
      } else {
        const wg = tone('#f0ebde');
        const wing = (sx, d) => { for (let k = 0; k < 4; k++) pc.l(hx + sx, hy - 1 - k, hx + sx + d * (6 - k), hy - 7 - k * 1.5, k % 2 ? wg.l : wg.b, 1); };
        if (E) wing(-3, -1); else { wing(-5, -1); wing(5, 1); }
      }
      break;
    }
    case 'hood': case 'furhood': case 'astralhood': case 'antlerhood': {
      pc.e(hx, hy - 0.5, 6.6, 7.2, 0, (x, y, nx, ny) => {
        const face = !N && (E ? (nx > 0.2 && ny > -0.35 && ny < 0.8) : (Math.abs(nx) < 0.58 && ny > -0.4 && ny < 0.85));
        if (face) return 0;
        if (L.head === 'astralhood' && hash2(x, y, 3) < 0.06) return L.trim.lll;
        return lit(H, -nx * 0.6 - ny * 0.5 + 0.1 - (face ? 0 : 0), x, y);
      });
      if (!N) { const T2 = H; if (E) pc.cap(hx - 3, hy + 2, hx - 4, hy + 10, 2.5, 2, T2); else { pc.cap(hx - 5, hy + 3, hx - 6, hy + 10, 2, 2.2, T2); pc.cap(hx + 5, hy + 3, hx + 6, hy + 10, 2, 2.2, T2); } }
      if (L.head === 'furhood') {
        const fr = tone('#ecebe6');
        if (!N) pc.e(hx + (E ? 2 : 0), hy - 0.5, E ? 3 : 4.6, 5.8, 0, (x, y, nx, ny) => nx * nx + ny * ny > 0.72 ? lit(fr, -ny * 0.4 + 0.2, x, y) : 0);
        pc.poly([hx - 5, hy - 5, hx - 3.5, hy - 10, hx - 1.5, hy - 6], fr.b); pc.poly([hx + 1.5, hy - 6, hx + 3.5, hy - 10, hx + 5, hy - 5], fr.d);
      }
      if (L.head === 'astralhood' && !N) { pc.l(hx - (E ? -1 : 4), hy - 3.5, hx + 4, hy - 3.5, L.trim.l, 1); pc.e(hx + (E ? 3 : 0), hy - 4, 1, 1, px('#c8e8ff')); }
      if (L.head === 'antlerhood') {
        const an = tone('#c8b48c');
        const ant = (sx, d) => { pc.l(hx + sx, hy - 5, hx + sx + d * 4, hy - 13, an.b, 1); pc.l(hx + sx + d * 2.5, hy - 10, hx + sx + d * 7, hy - 12, an.l, 1); pc.l(hx + sx + d * 1.2, hy - 7, hx + sx - d * 1, hy - 11, an.d, 1); pc.l(hx + sx + d * 3.5, hy - 12, hx + sx + d * 3, hy - 16, an.l, 1); };
        if (E) ant(-1, -1); else { ant(-3, -1); ant(3, 1); }
      }
      break;
    }
    case 'circlet':
      if (!N) pc.l(hx - (E ? -1 : 5), hy - 3, hx + 5, hy - 3, L.trim.b, 1);
      if (!N) pc.P(Math.round(hx + (E ? 3 : 0)), Math.round(hy - 3), px('#6fe0a8'));
      if (E) { pc.P(Math.round(hx - 4), Math.round(hy - 1), sk.b); pc.P(Math.round(hx - 5), Math.round(hy - 2), sk.l); }
      else { pc.P(Math.round(hx - 6), Math.round(hy - 1), sk.b); pc.P(Math.round(hx + 5), Math.round(hy - 1), sk.d); }
      break;
    case 'wizard': {
      pc.e(hx + fx, hy - 4.5, 9, 2.2, 0, (x, y, nx, ny) => lit(H, -ny * 0.3 - 0.25, x, y));
      const tip = [hx - (E ? 7 : 4), hy - 22];
      pc.poly([hx - 5.5, hy - 5, hx + 5.5, hy - 5, hx + 2, hy - 13, tip[0], tip[1], hx - 2.5, hy - 12], 0, (x, y, lx, ly) => lit(H, (hx - lx) / 6 + 0.05 - (y - hy) / 60, x, y));
      pc.l(hx - 5, hy - 7, hx + 5, hy - 7, L.trim.b, 2);
      if (!N) pc.e(hx + (E ? 2 : 0), hy - 10, 1.2, 1.2, L.trim.ll);
      break;
    }
    case 'cap':
      pc.e(hx + fx, hy - 5, 7, 1.8, H.d); pc.e(hx, hy - 7, 5, 3, 0, (x, y, nx, ny) => lit(H, -nx * 0.5 - ny * 0.5, x, y));
      pc.l(hx - 3, hy - 9, hx - 8, hy - 15, px('#a8382a'), 1); pc.l(hx - 4, hy - 9, hx - 9, hy - 14, px('#c8584a'), 1);
      break;
    case 'helm':
      pc.e(hx, hy - 3, 6.2, 4.6, 0, (x, y, nx, ny) => ny > 0.55 ? 0 : lit(H, -nx * 0.6 - ny * 0.4 + 0.2, x, y));
      pc.e(hx, hy - 0.5, 7.5, 1.5, H.d);
      if (!N) pc.r(hx - 0.5 + (E ? 3 : 0), hy - 3, 1, 5, H.dd);
      break;
  }
}

function drawWeapon2(pc, L, K, Q, view) {
  const P2 = K.P2, hand = K.A.h, w = K.wdir, kind = L.weapon;
  const pt = d => P2(add3(hand, mul3(w, d)));
  const glowOn = Q.glow > 0.5;
  switch (kind) {
    case 'sword': case 'darkblade': case 'goldsword': {
      const len = kind === 'darkblade' ? 25 : 22;
      const blade = kind === 'darkblade' ? tone('#3a2c2e') : tone('#c8ced6');
      const guard = kind === 'goldsword' ? L.trim : kind === 'darkblade' ? tone('#5a1818') : tone('#8a6a34');
      const g0 = pt(-4), g1 = pt(0), b0 = pt(1.5), b1 = pt(len);
      pc.cap(g0[0], g0[1], g1[0], g1[1], 1.1, 1.1, tone('#4a3020'));
      pc.e(g0[0], g0[1], 1.5, 1.5, guard.l);
      pc.cap(b0[0], b0[1], b1[0], b1[1], 1.7, 0.5, blade);
      pc.l(b0[0], b0[1], b1[0], b1[1], glowOn ? px('#ffd07a') : kind === 'darkblade' ? px('#e0482a') : blade.lll, 1);
      // guarda perpendicular
      const sx = b1[1] - b0[1], sy = -(b1[0] - b0[0]), sl = Math.hypot(sx, sy) || 1;
      pc.l(g1[0] - sx / sl * 4, g1[1] - sy / sl * 4, g1[0] + sx / sl * 4, g1[1] + sy / sl * 4, guard.b, 2);
      break;
    }
    case 'staff': case 'starstaff': case 'druidstaff': {
      const pole = kind === 'starstaff' ? tone('#aeb6c2') : kind === 'druidstaff' ? tone('#5a4028') : tone('#6b4a2b');
      const a = pt(-14), b = pt(24);
      if (kind === 'druidstaff') { for (let k = -14; k < 24; k += 4) { const p1 = pt(k), p2 = pt(k + 4); pc.cap(p1[0] + (k % 8 ? 0.6 : -0.6), p1[1], p2[0], p2[1], 1.2, 1.1, pole); } }
      else pc.cap(a[0], a[1], b[0], b[1], 1.1, 1.0, pole);
      const o = pt(27), oc = tone(L.orb);
      if (kind === 'starstaff') { pc.poly([o[0], o[1] - 4.5, o[0] + 2.8, o[1], o[0], o[1] + 4.5, o[0] - 2.8, o[1]], 0, (x, y, lx, ly) => lit(oc, (o[0] - lx) / 3 + 0.4, x, y)); }
      else {
        pc.e(o[0], o[1], 3.2, 3.2, 0, (x, y, nx, ny) => lit(oc, -nx * 0.7 - ny * 0.7 + 0.5, x, y));
        if (kind === 'staff') { pc.l(o[0] - 3, o[1] + 3, o[0] - 1, o[1] + 1, L.trim.b, 1); pc.l(o[0] + 3, o[1] + 3, o[0] + 1, o[1] + 1, L.trim.b, 1); }
      }
      if (kind === 'druidstaff') for (let k = 0; k < 5; k++) pc.e(o[0] + Math.cos(k * 1.3) * 4, o[1] + Math.sin(k * 1.3) * 3, 1.4, 1, px(k % 2 ? '#5aa23a' : '#7cc24a'));
      if (glowOn) for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2; pc.P(Math.round(o[0] + Math.cos(an) * 5.5), Math.round(o[1] + Math.sin(an) * 5.5), oc.lll); }
      break;
    }
    case 'bow': case 'frostbow': case 'elfbow': {
      const wood = kind === 'frostbow' ? tone('#c4d8e8') : kind === 'elfbow' ? L.trim : tone('#6e4320');
      // eixo do arco: perpendicular à direção de tiro, curvado para a frente
      const shoot = K.up([Math.sin(Q.aA[0]), 0, Math.cos(Q.aA[0])]);
      const axis = K.up([Math.cos(Q.aA[0]), 0, -Math.sin(Q.aA[0])]);
      const tipA = add3(hand, mul3(axis, 13)), tipB = add3(hand, mul3(axis, -13));
      let prev = null;
      for (let t = -1; t <= 1.001; t += 0.125) {
        const p = add3(add3(hand, mul3(axis, t * 13)), mul3(shoot, (1 - t * t) * 3.5 - 1));
        const q = P2(p);
        if (prev) pc.cap(prev[0], prev[1], q[0], q[1], 1.1, 1.1, wood);
        prev = q;
      }
      const pullP = Q.pull > 0.05 ? add3(hand, mul3(shoot, -1 - Q.pull * 11)) : add3(hand, mul3(shoot, -1));
      const a = P2(tipA), b = P2(tipB), c = P2(pullP);
      pc.l(a[0], a[1], c[0], c[1], px('#e6e0cc'), 0.5); pc.l(c[0], c[1], b[0], b[1], px('#e6e0cc'), 0.5);
      if (Q.pull > 0.05) { const tip = P2(add3(hand, mul3(shoot, 5))); pc.l(c[0], c[1], tip[0], tip[1], px('#d4c8a6'), 1); pc.P(Math.round(tip[0]), Math.round(tip[1]), Q.glow > 0.5 ? px('#d8ffd0') : px('#c0c6ce')); pc.P(Math.round(c[0]), Math.round(c[1]), px('#a83226')); }
      if (kind === 'elfbow') { pc.P(Math.round(a[0]), Math.round(a[1]) - 1, px('#6fe0a8')); pc.P(Math.round(b[0]), Math.round(b[1]) + 1, px('#6fe0a8')); }
      break;
    }
    case 'hammer': { const a = pt(-4), b = pt(12); pc.cap(a[0], a[1], b[0], b[1], 1, 1, tone('#6b4a2b')); const h1 = pt(10), h2 = pt(15); pc.cap(h1[0] - 3, h1[1], h2[0] + 3, h2[1], 2.4, 2.4, tone('#5a5c62')); break; }
    case 'spear': { const a = pt(-16), b = pt(24); pc.cap(a[0], a[1], b[0], b[1], 1, 1, tone('#6b4a2b')); const t = pt(30); pc.cap(b[0], b[1], t[0], t[1], 1.8, 0.4, tone('#c8ced6')); break; }
    case 'book': { const h = P2(hand); pc.r(h[0] - 3, h[1] - 4, 6, 5, px('#5a1a1c')); pc.r(h[0] - 3, h[1] - 4, 1, 5, px('#c9a24a')); pc.r(h[0] - 2, h[1] - 4, 4, 1, px('#e8e0cc')); break; }
    case 'mug': { const h = P2(hand); pc.r(h[0] - 2, h[1] - 5, 4, 5, px('#8a5424')); pc.r(h[0] - 2, h[1] - 6, 4, 1.5, px('#f2ead8')); pc.P(Math.round(h[0] + 2), Math.round(h[1] - 3), px('#8a5424')); break; }
  }
}

function drawShield2(pc, L, K, view) {
  const k = L.shield, P2 = K.P2;
  const c3 = add3(K.B.h, mul3(K.fwd, 2));
  const c = P2(c3);
  const nScreen = proj(K.fwd, view);           // normal do escudo projetada
  const faceW = Math.max(1.6, 5.8 * Math.sqrt(Math.max(0, 1 - nScreen[0] * nScreen[0])));
  const rim = k === 'dragon' ? tone('#24120f') : L.trim, field = k === 'dragon' ? tone('#3a1a1c') : k === 'sun' ? tone('#ece6d4') : L.accent;
  const cx = c[0], cy = c[1] - 2;
  if (k === 'sun') {
    pc.e(cx, cy, faceW + 0.8, 7, 0, (x, y, nx, ny) => lit(rim, -nx * 0.5 - ny * 0.5 + 0.2, x, y));
    pc.e(cx, cy, faceW - 0.6, 5.8, 0, (x, y, nx, ny) => lit(field, -nx * 0.4 - ny * 0.4 + 0.2, x, y));
    if (faceW > 3) { pc.e(cx, cy, 2, 2, L.trim.ll); for (let a = 0; a < 8; a++) pc.l(cx + Math.cos(a * 0.785) * 2.5, cy + Math.sin(a * 0.785) * 2.5, cx + Math.cos(a * 0.785) * 4, cy + Math.sin(a * 0.785) * 4, L.trim.b, 1); }
  } else {
    const W = faceW;
    pc.poly([cx - W - 0.8, cy - 7, cx + W + 0.8, cy - 7, cx + W + 0.8, cy + 2, cx, cy + 10, cx - W - 0.8, cy + 2], 0, (x, y, lx, ly) => lit(rim, (cx - lx) / (W + 1) * 0.5 + 0.2 - (ly - cy) / 20, x, y));
    pc.poly([cx - W + 0.6, cy - 5.6, cx + W - 0.6, cy - 5.6, cx + W - 0.6, cy + 1.6, cx, cy + 8, cx - W + 0.6, cy + 1.6], 0, (x, y, lx, ly) => lit(field, (cx - lx) / W * 0.45 + 0.1 - (ly - cy) / 22, x, y));
    if (W > 3) {
      if (k === 'dragon') { pc.e(cx, cy, 2, 1.4, px('#e0482a')); pc.P(Math.round(cx), Math.round(cy), px('#2a0a08')); }
      else { pc.r(cx - 0.6, cy - 4.5, 1.2, 10, L.trim.l); pc.r(cx - 3.5, cy - 1.5, 7, 1.2, L.trim.l); }
    }
  }
}

function poseKey(P) {
  return P.view + (P.walk >= 0 ? P.walk : '-') + (P.act ? P.act.k + P.act.f : '') + (P.idle ? P.idle.k + P.idle.f : '') + (P.sit ? 's' : '') + (P.carry ? 'c' : '');
}
const _lookCache = new Map();
function lookFor(key, make) { let l = _lookCache.get(key); if (!l) { l = make(); _lookCache.set(key, l); } return l; }
function heroSprite(cls, skin, color, P) {
  const lk = cls + ':' + skin + ':' + color;
  const L = lookFor(lk, () => heroLook(cls, skin, color));
  return sprite('h|' + lk + '|' + poseKey(P), HW, HH, HAX, HAY, pc => drawHeroPC(pc, L, P, cls), { ok: 0.42 });
}
const NPC_CLS = { v_maiko: 'archer', v_candf: 'archer', v_segm: 'knight', v_segm2: 'knight', v_segf: 'knight', agent: 'archer', v_maidf: 'archer', v_maidm: 'archer', v_maidf2: 'archer', v_maidm2: 'archer', st_witch: 'mage', hotelkeeper: 'archer', banker4: 'mage', banker5: 'mage', banker6: 'mage', bankporter: 'archer', v_house3: 'archer', v_house4: 'archer', v_trav3: 'archer', v_monk: 'mage', v_noblef: 'mage', v_noblem: 'knight', v_peasm: 'knight', v_peasf: 'archer', v_elderm: 'mage', v_elderf: 'archer', banker: 'mage', banker2: 'mage', banker3: 'mage', v_house1: 'archer', v_house2: 'archer', v_trav1: 'knight', v_trav2: 'archer', v_vis1: 'mage', v_vis2: 'archer', v_thug1: 'archer', v_thug2: 'knight', supplier: 'knight', st_saw: 'knight', st_mine: 'knight', st_farm: 'archer', st_carp: 'archer', st_alch: 'mage', st_apoth: 'mage', st_arcane: 'mage', st_tailor: 'archer', st_scroll: 'mage', courier1: 'archer', courier2: 'archer', courier3: 'knight', broker: 'archer', noble: 'archer', noble2: 'knight', gardener: 'archer', tailor: 'mage', jailer: 'knight', executioner: 'knight', fruit: 'archer', priest: 'mage', merchant: 'archer', innkeeper: 'archer', guard: 'knight', captain: 'knight', smith: 'knight' };
function npcSprite(kind, P) {
  const L = lookFor('npc:' + kind, NPC_LOOKS[kind]);
  return sprite('n|' + kind + '|' + poseKey(P), HW, HH, HAX, HAY, pc => drawHeroPC(pc, L, P, NPC_CLS[kind] || 'knight'), { ok: 0.42 });
}

// ---------- MONSTROS (vista lateral, olhando para a direita) ----------
const MON_SIZE = { rat: [36, 26], slime: [32, 28], wolf: [44, 34], spider: [44, 30], toad: [38, 30], goblin: [36, 44], skeleton: [36, 50], orc: [44, 54], troll: [64, 70] };
function monSprite(type, f, atk) {
  const [w, h] = MON_SIZE[type];
  return sprite(`m|${type}|${f}|${atk}`, w, h, w >> 1, h - 3, pc => drawMonsterPC(pc, type, f, atk, w, h), { k: ART });
}
function drawMonsterPC(pc, type, f, atk, w, h) {
  const ph = f / 4 * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
  const lg = atk >= 0 ? [0, 2, 4, 1][atk] : 0; // avanço do ataque
  const by = h - 3; // linha do chão
  switch (type) {
    case 'rat': {
      const fur = tone('#7d7066'), belly = tone('#b5a698'), pink = px('#d99a96');
      pc.l(6, by - 5, 2, by - 8 + Math.round(s), pink, 1); pc.l(2, by - 8 + Math.round(s), 3, by - 11, pink, 1);
      for (const [x, o] of [[11, s], [20, -s]]) pc.r(x + Math.round(o * 1.5), by - 3, 2, 3, fur.d);
      pc.e(16 + lg * 0.3, by - 6, 9, 5, 0, (x, y, nx, ny) => ny > 0.35 ? belly.b : ny < -0.5 ? fur.l : nx > 0.5 ? fur.d : fur.b);
      for (let i = 0; i < 5; i++) pc.p(10 + i * 3, by - 10, fur.d);
      const hx = 25 + lg;
      pc.e(hx, by - 7, 4.5, 3.5, 0, (x, y, nx, ny) => ny > 0.4 ? belly.b : fur.b);
      pc.p(hx + 4, by - 7, pink); pc.p(hx + 1, by - 8, px('#14100c'));
      pc.e(hx - 2, by - 11, 2, 2, fur.b); pc.p(hx - 2, by - 11, pink);
      pc.l(hx + 3, by - 6, hx + 6, by - 7, px('#cfc6bc'), 1);
      if (atk === 2) pc.p(hx + 3, by - 5, px('#f4f0e8'));
      break;
    }
    case 'slime': {
      const sq = Math.round(s * 1.5) + (atk >= 0 ? [0, -2, 2, 1][atk] : 0);
      const body = tone('#5f9e4a');
      pc.e(16, by - 8 + sq * 0.5, 12 + sq * 0.6, 9 - sq * 0.5, 0, (x, y, nx, ny) => {
        if (nx < -0.3 && ny < -0.3 && nx * nx + ny * ny < 0.5) return px('#cfeeb4', 0, 235);
        return ny > 0.5 ? px('#3a6e2e', 0, 235) : nx > 0.5 ? px('#4c8a3c', 0, 235) : px('#5f9e4a', 0, 230);
      });
      pc.e(17, by - 7, 4, 3, px('#3a6e2e', 0, 210));
      pc.p(18, by - 11 + sq * 0.5, px('#14200f')); pc.p(22, by - 11 + sq * 0.5, px('#14200f'));
      pc.p(9, by - 3, px('#cfeeb4', 0, 220));
      break;
    }
    case 'wolf': {
      const fur = tone('#6c6f76'), lt = tone('#a6a9ae');
      const legs = [[10, s], [14, -s], [26, -s], [30, s]];
      legs.forEach(([x, o], k) => { const t = k % 2 ? fur.d : fur.b; pc.l(x, by - 9, x + o * 2.5, by - 1, t, 2); pc.p(x + o * 2.5 + 1, by - 1, t); });
      pc.poly([8, by - 15, 2, by - 20 + Math.round(c), 1, by - 15, 6, by - 11], fur.b);
      pc.e(19 + lg * 0.4, by - 13, 12, 5.5, 0, (x, y, nx, ny) => ny < -0.45 ? lt.b : ny > 0.4 ? fur.d : fur.b);
      for (let i = 0; i < 6; i++) pc.p(10 + i * 3, by - 18 + (i % 2), lt.l);
      const hx = 31 + lg;
      pc.e(hx, by - 16, 5, 4.5, fur.b);
      pc.poly([hx + 2, by - 18, hx + 9, by - 16, hx + 9, by - 13, hx + 2, by - 13], lt.b);
      pc.p(hx + 9, by - 16, px('#14100c'));
      pc.poly([hx - 3, by - 19, hx - 1, by - 25, hx + 1, by - 19], fur.d); pc.poly([hx, by - 19, hx + 2, by - 24, hx + 3, by - 19], fur.b);
      pc.p(hx + 3, by - 17, px('#e0b040'));
      if (atk >= 1) { pc.r(hx + 3, by - 13, 6, 2, px('#5a1a1a')); pc.p(hx + 5, by - 13, px('#f4f0e8')); pc.p(hx + 7, by - 12, px('#f4f0e8')); }
      break;
    }
    case 'spider': {
      const shell = tone('#3a332e');
      for (let i = 0; i < 4; i++) {
        const o = Math.sin(ph + i * 1.4) * 2, bx = 18 + i * 3;
        pc.l(bx, by - 9, bx - 6 - i, by - 15 + o, shell.d, 1); pc.l(bx - 6 - i, by - 15 + o, bx - 10 - i, by, shell.d, 1);
        pc.l(bx, by - 9, bx + 5 + i, by - 15 - o, shell.b, 1); pc.l(bx + 5 + i, by - 15 - o, bx + 9 + i, by, shell.b, 1);
      }
      pc.e(14, by - 11, 9, 7, 0, (x, y, nx, ny) => ny < -0.5 ? shell.l : nx > 0.4 ? shell.d : shell.b);
      pc.poly([14, by - 15, 16, by - 11, 14, by - 7, 12, by - 11], px('#8a2a22'));
      pc.e(26 + lg, by - 9, 5, 4, shell.d);
      for (let i = 0; i < 4; i++) pc.p(27 + lg + (i % 2) * 2, by - 11 + (i >> 1) * 2, px('#d0402a'));
      pc.l(30 + lg, by - 7, 32 + lg + (atk >= 1 ? 1 : 0), by - 4, px('#d9cfb8'), 1);
      break;
    }
    case 'toad': {
      const sk = tone('#6e7a3a'), bel = tone('#cdb87a');
      const hop = atk >= 0 ? 0 : Math.max(0, s) * 1;
      pc.e(11, by - 2, 5, 2.5, sk.d); pc.e(25, by - 2, 5, 2.5, sk.d);
      pc.e(18, by - 8 - hop, 12, 8, 0, (x, y, nx, ny) => ny > 0.35 && nx > -0.2 ? bel.b : ny < -0.5 ? sk.l : sk.b);
      for (let i = 0; i < 7; i++) pc.p(9 + Math.floor(hash2(i, 1, 5) * 16), by - 14 + Math.floor(hash2(i, 2, 5) * 8) - hop, sk.dd);
      const sac = 2 + Math.round(Math.abs(s) * 2);
      pc.e(25, by - 4 - hop, 3 + sac * 0.4, 1.5 + sac * 0.5, bel.l);
      pc.e(21, by - 16 - hop, 3, 3, sk.b); pc.e(27, by - 15 - hop, 3, 3, sk.b);
      pc.p(22, by - 17 - hop, px('#e0b040')); pc.p(28, by - 16 - hop, px('#e0b040'));
      pc.l(22, by - 9 - hop, 30, by - 10 - hop, sk.dd, 1);
      if (atk >= 1) { const L2 = [0, 6, 12, 5][atk]; pc.l(30, by - 9, 30 + L2, by - 8, px('#c43a4a'), 2); }
      break;
    }
    default:
      drawBrutePC(pc, type, f, atk, w, h);
  }
}

// humanoides (goblin, esqueleto, orc, troll)
function drawBrutePC(pc, type, f, atk, w, h) {
  const k = { goblin: 0.82, skeleton: 1, orc: 1.12, troll: 1.55 }[type];
  const ph = f / 4 * Math.PI * 2, s = Math.sin(ph);
  const X = w / 2, by = h - 3;
  const S = v => v * k;
  const look = {
    goblin: { skin: tone('#6f8e3a'), top: tone('#6b4a2b'), pants: tone('#4a3a2a'), eye: px('#e8d040') },
    skeleton: { skin: tone('#e2dccb'), top: tone('#d4cdb8'), pants: tone('#c9c1aa'), eye: px('#e0402a') },
    orc: { skin: tone('#5e7f42'), top: tone('#4a3020'), pants: tone('#3d2b1a'), eye: px('#e04a4a') },
    troll: { skin: tone('#7b8794'), top: tone('#57534e'), pants: tone('#44403c'), eye: px('#e0c040') },
  }[type];
  const lean = atk >= 0 ? [0, 1, 3, 1][atk] : 0;
  const hip = [X, by - S(10)];
  // pernas
  [[-1, s], [1, -s]].forEach(([d, o], i) => {
    const fx = X + o * S(4) + d, t = i === 0 ? look.pants.d : look.pants.b;
    if (type === 'skeleton') pc.l(hip[0] + d, hip[1], fx, by - 1, i === 0 ? look.skin.d : look.skin.b, 1);
    else pc.l(hip[0] + d, hip[1], fx, by - 2, t, Math.max(2, Math.round(S(3))));
    pc.r(Math.round(fx) - 1, by - 2, Math.round(S(4)), 2, type === 'troll' ? look.skin.d : px('#2a1d12'));
  });
  // braço de trás
  const sh = [X + lean * 0.5, by - S(22)];
  pc.l(sh[0], sh[1], sh[0] - S(3) - s * 2, by - S(12), look.skin.d, type === 'skeleton' ? 1 : Math.max(2, Math.round(S(2.5))));
  // tronco
  const tw = S(type === 'skeleton' ? 6 : 8), th = S(13);
  const tx = X - tw / 2 + lean * 0.5, ty = by - S(23);
  if (type === 'skeleton') {
    pc.l(X, ty, X, ty + th, look.skin.b, 1);
    for (let i = 0; i < 4; i++) pc.l(tx, ty + 2 + i * 2.5, tx + tw, ty + 2 + i * 2.5, i % 2 ? look.skin.d : look.skin.b, 1);
    pc.r(Math.round(X - 3), Math.round(ty + th - 1), 6, 2, look.skin.d);
  } else {
    pc.e(X + lean * 0.5, ty + th / 2, tw / 2 + 1, th / 2 + 0.5, 0, (x, y, nx, ny) => nx < -0.4 ? look.top.l : nx > 0.4 ? look.top.d : look.top.b);
    if (type === 'orc') { pc.e(X + lean, ty + 2, S(4), S(2.5), px('#7a808a')); pc.p(X + lean, ty + 1, px('#b8bec8')); }
    if (type === 'troll') { pc.e(X - 2, ty + 2, 3, 2, px('#4d7c2f')); pc.e(X + 3, ty + 1, 2, 1.5, px('#3f6a22')); }
    pc.r(Math.round(tx), Math.round(ty + th - 2), Math.round(tw + 1), 2, px('#2a1d12'));
  }
  // cabeça
  const hx = X + S(2) + lean, hy = ty - S(4) + (type === 'troll' ? S(3) : 0);
  pc.e(hx, hy, S(4), S(4), 0, (x, y, nx, ny) => nx > 0.45 ? look.skin.d : ny < -0.5 ? look.skin.l : look.skin.b);
  if (type === 'goblin') { pc.poly([hx - S(3), hy - 1, hx - S(9), hy - S(4), hx - S(3), hy + 2], look.skin.b); pc.poly([hx + 2, hy - 2, hx + S(7), hy - S(5), hx + 3, hy + 1], look.skin.d); }
  if (type === 'skeleton') { pc.r(Math.round(hx), Math.round(hy - 1), 2, 2, px('#14100c')); pc.p(hx + 1, hy - 1, look.eye); pc.r(Math.round(hx), Math.round(hy + 2), 3, 1, px('#14100c')); }
  else {
    pc.p(hx + S(2), hy - 1, look.eye);
    if (type === 'orc' || type === 'troll') { pc.p(hx + S(2), hy + S(2), px('#f2ede0')); pc.p(hx + S(3.5), hy + S(2), px('#f2ede0')); }
    if (type === 'orc') { pc.e(hx - 0.5, hy - S(3), S(4.2), S(2), px('#4b4f57')); pc.l(hx - S(3), hy - S(4), hx - S(6), hy - S(8), px('#e2dccb'), 1); pc.l(hx + S(2), hy - S(4), hx + S(5), hy - S(8), px('#e2dccb'), 1); }
    if (type === 'troll') { pc.e(hx - 1, hy - S(3.5), S(3), S(1.5), px('#4d7c2f')); }
  }
  // braço da frente + arma
  const swing = atk >= 0 ? [-1.2, -1.6, 0.6, 0.2][atk] : -0.3 + s * 0.15;
  const hand = [sh[0] + Math.sin(swing + 1.4) * S(8), sh[1] + Math.cos(swing + 1.4) * S(8) + S(2)];
  pc.l(sh[0] + 1, sh[1], hand[0], hand[1], look.skin.b, type === 'skeleton' ? 1 : Math.max(2, Math.round(S(2.5))));
  const wa = swing + 0.6, dx = Math.sin(wa), dy = -Math.cos(wa);
  const at = d => [hand[0] + dx * d, hand[1] + dy * d];
  if (type === 'goblin') { const t = at(6); pc.l(hand[0], hand[1], t[0], t[1], px('#c0c6ce'), 1); }
  if (type === 'skeleton') { const t = at(12); pc.l(hand[0], hand[1], t[0], t[1], px('#9a8a70'), 2); pc.l(hand[0] - dy * 2, hand[1] + dx * 2, hand[0] + dy * 2, hand[1] - dx * 2, px('#6a5a40'), 1); }
  if (type === 'orc') { const t = at(14); pc.l(hand[0], hand[1], t[0], t[1], px('#5a3a22'), 1); const b0 = at(10); pc.poly([b0[0], b0[1], t[0] + dy * 5, t[1] - dx * 5, b0[0] + dy * 5 - dx * 3, b0[1] - dx * 5 - dy * 3], px('#9aa0a8')); }
  if (type === 'troll') { const t = at(22); pc.l(hand[0], hand[1], t[0], t[1], px('#6b4a2b'), 3); pc.e(t[0], t[1], 4, 4, px('#6b4a2b')); pc.p(t[0] - 1, t[1] - 1, px('#a8a29e')); }
}

// ---------- ícones das habilidades (16x16) ----------
function iconSprite(id) {
  return sprite('ic|' + id, 18, 18, 0, 0, pc => {
    const bgc = { bash: '#5a2a1a', warcry: '#5a1a1a', whirl: '#2e2e34', wall: '#5a441a', double: '#2a3a1a', pierce: '#1a3a24', rain: '#1a2e24', agile: '#14402e', fireball: '#5a2414', nova: '#14304a', heal: '#1e3a1a', meteor: '#3a1a4a', hp: '#3a0e0e', mp: '#0e1a3a' }[id] || '#333333';
    const bg = tone(bgc);
    pc.e(9, 9, 9, 9, 0, (x, y, nx, ny) => nx * nx + ny * ny < 0.5 ? bg.l : bg.b);
    const W = px('#f4efe2'), G = px('#e2b74e'), S2 = px('#c9ced6');
    switch (id) {
      case 'bash': pc.l(4, 14, 13, 5, S2, 2); pc.l(3, 15, 5, 13, px('#7a5a2a'), 1); pc.l(4, 11, 7, 14, G, 1); pc.e(13, 5, 2.5, 2.5, px('#ff9a4a')); break;
      case 'warcry': for (let r = 3; r <= 7; r += 2) for (let a = -0.9; a <= 0.9; a += 0.15) pc.p(6 + Math.cos(a) * r, 9 + Math.sin(a) * r, px('#ffb4a4')); pc.e(5, 9, 2, 2.5, px('#ffd8cc')); break;
      case 'whirl': for (let a = 0; a < 5; a += 0.12) pc.p(9 + Math.cos(a) * (2 + a), 9 + Math.sin(a) * (2 + a), W); break;
      case 'wall': pc.poly([4, 3, 14, 3, 14, 9, 9, 15, 4, 9], G); pc.poly([6, 5, 12, 5, 12, 9, 9, 12, 6, 9], px('#8a6a24')); pc.r(8, 5, 2, 7, px('#ffe8a0')); break;
      case 'double': pc.l(3, 13, 12, 4, px('#d6c9a8'), 1); pc.l(5, 15, 14, 6, px('#d6c9a8'), 1); pc.p(13, 3, S2); pc.p(15, 5, S2); break;
      case 'pierce': pc.l(2, 9, 14, 9, px('#bff5c8'), 2); pc.poly([13, 6, 17, 9, 13, 12], px('#e8ffe8')); pc.p(6, 7, px('#7ad89a')); pc.p(9, 11, px('#7ad89a')); break;
      case 'rain': for (let i = 0; i < 4; i++) { pc.l(4 + i * 3, 3 + (i % 2) * 3, 4 + i * 3, 10 + (i % 2) * 3, px('#d6c9a8'), 1); pc.p(4 + i * 3, 11 + (i % 2) * 3, S2); } break;
      case 'agile': for (let i = 0; i < 3; i++) for (let x = 3; x < 15; x++) pc.p(x, 5 + i * 4 + Math.round(Math.sin(x / 2 + i) * 1), px('#7ae0b4')); break;
      case 'fireball': pc.e(10, 8, 4, 4, 0, (x, y, nx, ny) => nx * nx + ny * ny < 0.3 ? px('#fff2b0') : px('#ff8a2a')); pc.l(3, 14, 7, 10, px('#d0401a'), 2); break;
      case 'nova': for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3; pc.l(9, 9, 9 + Math.cos(an) * 6, 9 + Math.sin(an) * 6, px('#cfeaff'), 1); } pc.e(9, 9, 1.5, 1.5, W); break;
      case 'heal': pc.r(8, 3, 3, 12, px('#c8f5c0')); pc.r(4, 7, 11, 3, px('#c8f5c0')); pc.p(9, 4, W); break;
      case 'meteor': pc.l(3, 3, 9, 9, px('#ff8a2a'), 2); pc.e(11, 11, 3.5, 3.5, px('#7a3a14')); pc.p(10, 10, px('#ffb04a')); break;
      case 'hp': case 'mp': { const c2 = id === 'hp' ? '#c43a3a' : '#3a5ac4'; pc.e(9, 11, 5, 5, px(c2)); pc.p(7, 9, px('#ffffff')); pc.r(7, 3, 4, 4, px('#c9c2b0')); pc.r(7, 2, 4, 1, px('#7a4a22')); break; }
    }
  }, { k: ART });
}

// uniforme por cima da aparência (mantém pele, cabelo e barba; troca roupa, tira arma e escudo)
// capa ou manto da Alfaiataria Real por cima da roupa da classe
function cloakLook(L, code) {
  const C = typeof CLOAKS !== 'undefined' && CLOAKS[code]; if (!C) return L;
  L.cape = true; L.capeTone = tone(C.tone);
  if (C.robe) Object.assign(L, { armor: 'robe', body: tone(C.tone), body2: tone(shadeHex(C.tone, -0.25)), trim: tone(C.trim || '#d4a94a'), accent: tone(C.trim || '#d4a94a'), pattern: C.pat || L.pattern, pauldron: null });
  return L;
}
function uniformLook(L, code) {
  const U = UNIFORMS[code]; if (!U) return L;
  return Object.assign(L, { armor: 'robe', body: tone(U.body), body2: tone(U.b2), accent: tone(U.b2), trim: tone(U.trim), head: U.head || 'none', weapon: null, shield: null, pauldron: null, cape: false, capeTone: null, quiver: false, pattern: null });
}
// funcionários NPC com o uniforme do lugar onde trabalham
{ const map = { st_saw: 1, st_carp: 1, st_mine: 7, st_farm: 7, st_alch: 2, st_apoth: 2, st_arcane: 3, st_tailor: 3, st_scroll: 3, courier1: 5, courier2: 5, courier3: 5, supplier: 5, banker2: 6, banker3: 6 };
  for (const k in map) { const f = NPC_LOOKS[k]; if (f) NPC_LOOKS[k] = () => uniformLook(f(), map[k]); } }

// ---------- jeitos de andar dos moradores ----------
function gaitPose(Q, g, ph) {
  const s = Math.sin(ph), legs = k => { Q.lA = [Q.lA[0] * k, Q.lA[1] * k]; Q.lB = [Q.lB[0] * k, Q.lB[1] * k]; };
  if (g === 'old') { Q.tl += 0.3; Q.ht -= 0.18; legs(0.5); Q.sway *= 0.5; Q.tw *= 0.4; Q.kn = (Q.kn || 0) - 0.12; Q.aA = [0.25 + s * 0.06, 0.12, 0.5]; Q.aB = [-0.3, 0.15, 1.1]; }
  else if (g === 'noble') { Q.tl -= 0.07; Q.ht -= 0.06; legs(0.85); Q.tw *= 0.3; Q.aA = [-0.45, 0.12, 1.25]; Q.aB = [-0.45, 0.12, 1.25]; }
  else if (g === 'hurry') { Q.tl += 0.15; Q.ht -= 0.06; legs(1.15); Q.aB[0] += s * 0.28; Q.aA[0] -= s * 0.25; Q.aB[2] += 0.35; Q.aA[2] += 0.3; }
  else if (g === 'heavy') { legs(0.9); Q.sway *= 1.9; Q.tw *= 1.5; Q.aA[1] += 0.16; Q.aB[1] += 0.16; Q.tl += 0.04; }
  else if (g === 'light') { Q.tl -= 0.03; Q.sway *= 1.7; Q.tw *= 0.6; Q.aB[0] *= 0.8; }
  else if (g === 'calm') { legs(0.8); Q.tl += 0.04; Q.ht += 0.1; Q.tw *= 0.3; Q.aA = [0.62, -0.12, 1.25]; Q.aB = [0.62, -0.12, 1.25]; }
  else if (g === 'drunk') { const w = Math.sin(ph * 0.5); Q.sway = (Q.sway || 0) * 2.5 + w * 0.14; Q.tw = Q.tw * 2 + w * 0.12; Q.tl += 0.1 + Math.abs(w) * 0.1; Q.ht += 0.15 + w * 0.12; Q.hw = w * 0.25; Q.aA = [s * 0.45, 0.35, 0.3]; Q.aB = [-s * 0.45, 0.35, 0.35]; legs(0.85); }
}
// ---------- objetos nas mãos: cesto, balde, saco no ombro, livro, caneca ----------
function holdPose(Q, h, P) {
  const busyA = P.idle && /^(talk|point|scratch|wave|salute|eatstand|drink|stretch)$/.test(P.idle.k), busyB = P.idle && /^(crossarms|handsback|shrug|stretch|pray|read)$/.test(P.idle.k);
  if (h === 'basket') { if (!busyB) Q.aB = [0.1, 0.28, 0.15]; Q.basket = 1; }
  else if (h === 'bucket') { if (!busyA) Q.aA = [0.05, 0.24, 0.08]; Q.bucket = 1; }
  else if (h === 'sack') { Q.aA = [2.55, 0.32, 2.75]; Q.tl += 0.05; Q.sack = 1; }
  else if (h === 'book') { if (!busyB) Q.aB = [0.5, -0.18, 1.75]; Q.book = 1; }
  else if (h === 'mug') { if (!busyA) Q.aA = [0.5, 0.1, 1.45]; Q.mug = 1; }
  else if (h === 'plate') { Q.aB = [0.85, 0.3, 1.45]; Q.aA = [0.6, 0.2, 1.2]; Q.plate = 1; Q.tuck = 1; }   /* levando o prato para o baú */
  else if (h === 'sktray') { Q.aA = [0.62, 0.32, 1.25]; Q.aB = [0.62, 0.32, 1.25]; Q.sktray = 1; Q.tuck = 1; }   /* bandeja na frente do peito, as duas mãos nas bordas */
}
