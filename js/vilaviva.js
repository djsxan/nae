// ============================================================
//  VILA DOS VIAJANTES, etapa 2 (27/11): moradores dos seis povos e as lojas exóticas
//  Cada bairro tem um vendedor (ou guardião do marco) parado junto ao seu prédio e um morador que passeia pelo bairro.
//  Itens novos: chá de jasmim e bolo da lua (chinês), tapete e especiarias (persa), taça de Murano e contas de vidro
//  (veneziano), capa de pele e kvas (eslavo), anel de ouro e manteiga de karité (saheliano), laranja de Sevilha (andaluz).
// ============================================================
const VV = { cold: 0.5 };
/* ---- itens ---- */
if (typeof LOOT !== 'undefined') Object.assign(LOOT, {
  jasmintea: { name: 'Chá de Jasmim', price: 14, icon: '🍵', color: '#d8e8b0', desc: 'Da Casa de Chá do Rio. Mata a sede e descansa a cabeça: Bem descansado por 2 minutos. Clique para beber.' },
  mooncake: { name: 'Bolo da Lua', price: 18, icon: '🥮', color: '#c8903a', desc: 'Bolinho recheado de pasta doce, com o desenho da lua por cima. Enche a barriga.' },
  carpet: { name: 'Tapete Persa', price: 140, icon: '🧶', color: '#a8283a', desc: 'Tecido à mão no Bazar das Cúpulas, em vermelho, azul e ouro. Um presente e tanto.' },
  spice: { name: 'Especiarias do Bazar', price: 22, icon: '🌶', color: '#c8501e', desc: 'Açafrão, cominho e pimenta. Uma pitada esquenta o corpo: menos frio por 3 minutos e fôlego cheio. Clique para usar.' },
  murano: { name: 'Taça de Murano', price: 75, icon: '🍷', color: '#5aa8d8', desc: 'Vidro soprado na vidraria veneziana do Alambique, com fios de ouro. Presente fino.' },
  beads: { name: 'Contas de Vidro', price: 16, icon: '📿', color: '#3ab8a8', desc: 'Colar de contas coloridas de vidro veneziano. Um mimo.' },
  kvass: { name: 'Kvas', price: 8, icon: '🍺', color: '#8a5a2a', desc: 'Bebida eslava de pão fermentado, levemente azeda. Mata a sede. Clique para beber.' },
  goldring: { name: 'Anel de Ouro do Sahel', price: 160, icon: '💍', color: '#e8c050', desc: 'Ouro trabalhado em filigrana pelo ourives saheliano. O presente mais caro da vila.' },
  shea: { name: 'Manteiga de Karité', price: 20, icon: '🧴', color: '#efe0b0', desc: 'Pomada do Sahel. Alivia feridas e baixa a febre. Clique para usar.' },
  orange: { name: 'Laranja de Sevilha', price: 6, icon: '🍊', color: '#f0901e', desc: 'Do pátio dos Banhos. Doce e suculenta.' } });
if (typeof FOOD !== 'undefined') Object.assign(FOOD, { mooncake: 35, orange: 14 });
if (typeof CLOAKS !== 'undefined' && !CLOAKS[30]) { CLOAKS[30] = { k: 'cape_fur', n: 'Capa de Pele Eslava', tone: '#7a5a3a', price: 130 }; if (typeof CLOAK_BY_ITEM !== 'undefined') CLOAK_BY_ITEM.cape_fur = 30; if (typeof LOOT !== 'undefined') LOOT.cape_fur = { name: 'Capa de Pele Eslava', price: 130, icon: '🧥', color: '#7a5a3a', desc: 'Pele grossa de urso com forro de lã, da peleteira eslava. Vestida, o frio chega com metade da força. Clique para vestir ou tirar.' }; }
if (typeof L8_GIFT !== 'undefined') Object.assign(L8_GIFT, { carpet: 14, murano: 12, goldring: 18, beads: 6, mooncake: 3, jasmintea: 2 });
if (typeof L8_GIFT_LINES !== 'undefined') Object.assign(L8_GIFT_LINES, { carpet: ['Um tapete persa? Vai ficar lindo na sala!', 'Nunca tive nada tão bonito.'], murano: ['Que taça delicada... parece que vai quebrar só de olhar.', 'Vidro de Murano! Obrigada!'], goldring: ['Ouro? Para mim? Não sei nem o que dizer...', 'Vou usar todos os dias.'], beads: ['Que cores bonitas!', 'Vou usar no domingo.'] });
/* ---- moradores ---- */
const VV_NPCS = [
  { id: 'vv_ines', name: 'Inês Albaicín, a Banhista', kind: 'vv_ines', at: [-79, -26], stock: ['orange'], q: 'and' },
  { id: 'vv_rafael', name: 'Rafael Triana, o Ceramista', kind: 'vv_rafael', route: [[-80, -20], [-79, -12], [-80, -8], [-79, -17]], q: 'and' },
  { id: 'vv_marco', name: 'Marco Foscari, o Vidreiro', kind: 'vv_marco', at: [-69.5, -15], stock: ['murano', 'beads'], q: 'ven' },
  { id: 'vv_lucia', name: 'Lucia Contarini, a Gondoleira', kind: 'vv_lucia', route: [[-71, -24], [-62, -24], [-66, -21], [-71, -21]], q: 'ven' },
  { id: 'vv_dariush', name: 'Dariush Kermani, o Mercador de Tapetes', kind: 'vv_dariush', at: [-79.5, 8], stock: ['carpet', 'spice'], q: 'per' },
  { id: 'vv_shirin', name: 'Shirin Golestan, a Tecelã', kind: 'vv_shirin', route: [[-80, 11], [-80, 17], [-78, 4], [-80, 8]], q: 'per' },
  { id: 'vv_mei', name: 'Mei Lin, a Mestra do Chá', kind: 'vv_mei', at: [-69.5, 7.5], stock: ['jasmintea', 'mooncake'], q: 'chi' },
  { id: 'vv_wen', name: 'Wen Bo, o Monge do Pagode', kind: 'vv_wen', at: [-66.2, 14.2], q: 'chi' },
  { id: 'vv_bogdan', name: 'Padre Bogdan, o Sacerdote', kind: 'vv_bogdan', at: [-95, -25.5], q: 'esl' },
  { id: 'vv_vasilisa', name: 'Vasilisa Morozova, a Peleteira', kind: 'vv_vasilisa', at: [-95.5, -18], stock: ['cape_fur', 'kvass'], q: 'esl' },
  { id: 'vv_amadou', name: 'Amadou Keita, o Ourives', kind: 'vv_amadou', at: [-95, 9], stock: ['goldring', 'shea'], q: 'sah' },
  { id: 'vv_fatou', name: 'Fatoumata Diallo, a Guardiã do Celeiro', kind: 'vv_fatou', route: [[-95, 12], [-95, 18], [-93, 23], [-95, 7]], q: 'sah' } ];
const VV_TALK = {
  vv_ines: ['Os banhos abrem logo: água morna, vapor e chá de hortelã no pátio.', 'As laranjeiras do pátio vieram de Sevilha, numa caixa de terra.', 'Em casa a gente dizia: quem não viu Granada não viu nada.'],
  vv_rafael: ['Cada azulejo é pintado à mão. Este azul custa caro!', 'Quer um painel de azulejo na sua casa? Um dia eu faço.'],
  vv_marco: ['O vidro precisa de fogo forte e paciência. Esta taça levou três dias.', 'Em Murano a gente aprende o ofício antes de aprender a ler.'],
  vv_lucia: ['Ainda não tenho gôndola, mas o canal já está pronto. Logo, logo!', 'Remar no canal ao pôr do sol é a coisa mais bonita desta vila.'],
  vv_dariush: ['Um tapete bom dura cem anos. Este aqui tem trinta mil nós.', 'O açafrão vem de longe, por isso vale ouro.', 'No bazar, quem pechincha ganha amigos.'],
  vv_shirin: ['Cada desenho do tapete conta uma história da minha família.', 'O tear não para: de dia eu teço, de noite eu sonho com cores.'],
  vv_mei: ['O chá de jasmim acalma o coração. Sente-se, fique um pouco.', 'A água não pode ferver demais, senão o chá fica amargo.'],
  vv_wen: ['O sino do pagode toca ao amanhecer. Quem ouve com calma começa o dia leve.', 'Cinco telhados: terra, água, fogo, vento e céu.'],
  vv_bogdan: ['A igreja foi erguida sem um prego, só com encaixes de madeira.', 'As cúpulas douradas guardam a luz do sol para o inverno.'],
  vv_vasilisa: ['Uma boa pele vale mais que uma fogueira quando a noite esfria.', 'No meu país o inverno dura meio ano. Aqui é primavera o tempo todo!'],
  vv_amadou: ['O ouro do Sahel atravessou o deserto em caravanas de camelos.', 'Filigrana é paciência: fio de ouro mais fino que um cabelo.'],
  vv_fatou: ['O celeiro guarda os grãos da vila para o tempo das vacas magras.', 'As paredes de barro são refeitas todo ano, numa grande festa.'] };
if (typeof NPCS !== 'undefined' && typeof WORLD !== 'undefined' && typeof MAP_W !== 'undefined' && MAP_W === 384) for (const d of VV_NPCS) { if (NPCS.some(q => q.id === d.id)) continue;
  const p0 = d.at || d.route[0], def = Object.assign({ id: d.id, name: d.name, kind: d.kind, x: CENTER + p0[0], y: CENTER + p0[1] }, d.route ? { route: d.route.map(([x, y]) => [CENTER + x, CENTER + y]) } : {}); NPCS.push(def);
  if (typeof G !== 'undefined' && G.npcs && typeof mkEnt === 'function' && !G.npcs[d.id]) G.npcs[d.id] = mkEnt({ ...def, isNpc: true, visible: true, dir: 0 }); }   /* o jogo monta G.npcs antes deste arquivo */
/* ---- servidor: comprar, conversar, bênção do padre e sino do monge ---- */
if (typeof npcAction === 'function' && typeof S !== 'undefined') { const _naVV = npcAction; npcAction = function (p, m) { const d = m && VV_NPCS.find(q => q.id === m.n); if (!d) return _naVV.apply(this, arguments);
  const sn = S.npcs && S.npcs[d.id]; if (!sn || sn.dead || sn.downed) return _naVV.apply(this, arguments); if (dist(p.x, p.y, sn.x, sn.y) > 3.5) { tell(p, 'Chegue mais perto para conversar.'); return; }
  const say = text => Net.toOne(p.id, { t: 'npc', n: d.id, text }), now = now_();
  if (m.a === 'vvbuy') { const k = String(m.item || ''); if (!(d.stock || []).includes(k) || !LOOT[k]) return; const price = LOOT[k].price; if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { say('Sua mochila está cheia.'); return; } if (!canPay(p, price)) { say('Custa ' + price + ' de ouro. Volte quando tiver.'); return; }
    payCity(p, price); p.inv[k] = (p.inv[k] || 0) + 1; sendStat(p); say(LOOT[k].icon + ' ' + LOOT[k].name + '. ' + ['Bom proveito!', 'Escolha excelente.', 'Volte sempre.'][Math.floor(Math.random() * 3)]); return; }
  if (m.a === 'vvtalk') { const L = VV_TALK[d.id] || ['...']; say(L[Math.floor(Math.random() * L.length)]); near(sn.x, sn.y, { t: 'anim', w: 'n', id: d.id, a: 'talk', txt: '💬', ms: 1 }); return; }
  if (m.a === 'vvbless' && d.id === 'vv_bogdan') { if (now < (p._vvBless || 0)) { say('Já te abençoei hoje, filho. Vá em paz.'); return; } p._vvBless = now + 600000; p.buffs.rested = Math.max(p.buffs.rested || 0, now) + 300000; sendStat(p); say('Que a luz das cúpulas te guarde. (Bem descansado por mais 5 minutos.)'); near(sn.x, sn.y, { t: 'anim', w: 'n', id: d.id, a: 'adore', ms: 1600 }); return; }
  if (m.a === 'vvbell' && d.id === 'vv_wen') { if (now < (p._vvBell || 0)) { say('O sino descansa um pouco entre um toque e outro.'); return; } p._vvBell = now + 300000; p.cst = typeof cstMaxOf === 'function' ? cstMaxOf(p) : p.cst; p.buffs.rested = Math.max(p.buffs.rested || 0, now) + 120000; sendStat(p); say('🔔 O sino soa longe e devagar. Você respira fundo: fôlego cheio e a cabeça leve.'); return; }
  return _naVV.apply(this, arguments); }; }
if (typeof useItem === 'function' && typeof S !== 'undefined') { const _uiVV = useItem; useItem = function (p, k) { const now = now_();
  if (!['jasmintea', 'spice', 'kvass', 'shea'].includes(k) || !p.inv[k] || now < (p.useT || 0)) return _uiVV.apply(this, arguments); p.useT = now + 600; if (--p.inv[k] <= 0) delete p.inv[k];
  if (k === 'jasmintea') { p.water = Math.min(100, (p.water ?? 100) + 40); p.buffs.rested = Math.max(p.buffs.rested || 0, now) + 120000; tell(p, 'O chá de jasmim perfuma a garganta e acalma.'); }
  else if (k === 'spice') { p.buffs.warm = Math.max(p.buffs.warm || 0, now) + 180000; p.cold = Math.max(0, (p.cold || 0) - 30); if (typeof cstMaxOf === 'function') p.cst = cstMaxOf(p); tell(p, 'Arde na língua e esquenta o peito: menos frio por 3 minutos.'); }
  else if (k === 'kvass') { p.water = Math.min(100, (p.water ?? 100) + 25); tell(p, 'Azedinho e fresco.'); }
  else if (k === 'shea') { p.infect = Math.max(0, (p.infect || 0) - 1); p.infT = 0; if (p.body && typeof BODY_PARTS !== 'undefined') for (const bp of BODY_PARTS) if (p.body[bp] != null) p.body[bp] = Math.min(100, p.body[bp] + 15); tell(p, 'A manteiga de karité alivia as feridas.'); }
  sendStat(p); }; }
/* capa de pele: o frio chega com metade da força */
if (typeof survivalTick === 'function' && typeof S !== 'undefined') { const _stVV = survivalTick; survivalTick = function (p, now, dt) { const c0 = p.cold || 0; const r = _stVV.apply(this, arguments); if (p.cloak === 30 && (p.cold || 0) > c0) p.cold = c0 + ((p.cold || 0) - c0) * VV.cold; return r; }; }
/* ---- cliente: aparência e diálogos ---- */
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function' && typeof tone === 'function') {
  const look = (cls, sk, c1, c2, o) => () => Object.assign(heroLook(cls, sk, c1), { body: tone(c1), body2: tone(c2), accent: tone(c2), trim: tone(o.trim || c2), weapon: null, shield: null, cape: false, quiver: false, extra: null }, o.x || {});
  Object.assign(NPC_LOOKS, {
    vv_ines: look('mage', 'adept~f', '#f2ede2', '#2f5f9a', { x: { armor: 'robe', hairStyle: 'bun', hair: tone('#1a1010'), skin: tone('#d8a880'), head: 'none' } }),
    vv_rafael: look('archer', 'scout', '#e8e0cc', '#2f5f9a', { x: { armor: 'vest', hair: tone('#2a1a10'), skin: tone('#c89870'), head: 'none' } }),
    vv_marco: look('mage', 'adept', '#6a1a2a', '#d4a94a', { x: { armor: 'robe', hair: tone('#3a2416'), skin: tone('#e0b896'), head: 'cap', headTone: tone('#5a1a24') } }),
    vv_lucia: look('archer', 'scout~f', '#1e2a4a', '#f0e8da', { x: { armor: 'vest', hairStyle: 'tail', hair: tone('#5a3a1a'), skin: tone('#e8c4a4'), head: 'cap', headTone: tone('#d8c890') } }),
    vv_dariush: look('mage', 'adept', '#2a7a7a', '#d4a94a', { x: { armor: 'robe', hair: tone('#1a1414'), beard: tone('#1a1414'), skin: tone('#b88a68'), head: 'cap', headTone: tone('#efe8da') } }),
    vv_shirin: look('mage', 'adept~f', '#a8283a', '#2a7a7a', { x: { armor: 'robe', hairStyle: 'long', hair: tone('#140c0a'), skin: tone('#c89a78'), head: 'hood', headTone: tone('#2a7a7a') } }),
    vv_mei: look('mage', 'adept~f', '#a8281e', '#d4a94a', { x: { armor: 'robe', hairStyle: 'bun', hair: tone('#0e0a0a'), skin: tone('#ecd0b0'), head: 'none' } }),
    vv_wen: look('mage', 'adept', '#d8902a', '#8a3a1a', { x: { armor: 'robe', hair: null, skin: tone('#e4c4a0'), head: 'none' } }),
    vv_bogdan: look('mage', 'adept', '#1a1a1e', '#d4a94a', { x: { armor: 'robe', hair: tone('#5a4a3a'), beard: tone('#6a5a4a'), skin: tone('#e8c8a8'), head: 'cap', headTone: tone('#1a1a1e') } }),
    vv_vasilisa: look('archer', 'scout~f', '#8a2a2a', '#efe8da', { x: { armor: 'vest', hairStyle: 'braid', hair: tone('#c8a060'), skin: tone('#f0d4bc'), head: 'furhood', headTone: tone('#7a5a3a') } }),
    vv_amadou: look('mage', 'adept', '#f0e8d0', '#3a6a9a', { x: { armor: 'robe', hair: tone('#0e0a08'), skin: tone('#5a3a24'), head: 'cap', headTone: tone('#f0e8d0') } }),
    vv_fatou: look('mage', 'adept~f', '#d8a028', '#2a5a3a', { x: { armor: 'robe', hairStyle: 'bun', hair: tone('#0e0a08'), skin: tone('#4a2e1c'), head: 'hood', headTone: tone('#d8a028') } }) });
  if (typeof NPC_CLS !== 'undefined') for (const d of VV_NPCS) NPC_CLS[d.kind] = /rafael|lucia|vasilisa/.test(d.kind) ? 'archer' : 'mage'; }
if (typeof NPC_DIALOG !== 'undefined') {
  const buy = (k, extra) => [(LOOT[k] ? LOOT[k].icon + ' ' + LOOT[k].name + ' — ' + LOOT[k].price + ' ouro' : k) + (extra || ''), { a: 'vvbuy', item: k }], talk = ['Conversar', { a: 'vvtalk' }];
  Object.assign(NPC_DIALOG, {
    vv_ines: { greet: 'Bem-vindo aos Banhos do Pátio! Ainda estamos arrumando os azulejos de dentro, mas as laranjas já estão maduras.', opts: [buy('orange'), talk] },
    vv_rafael: { greet: 'Olá! Está vendo esse azul nas casas? Fui eu que pintei.', opts: [talk] },
    vv_marco: { greet: 'Benvenuto! Vidro soprado à moda de Murano, direto do forno do Alambique.', opts: [buy('murano'), buy('beads'), talk] },
    vv_lucia: { greet: 'Ciao! Sou gondoleira... quando a gôndola chegar. Por enquanto cuido do canal.', opts: [talk] },
    vv_dariush: { greet: 'Salam, amigo! Tapetes de trinta mil nós e especiarias de além do deserto.', opts: [buy('carpet'), buy('spice'), talk] },
    vv_shirin: { greet: 'Olá. Estou indo ao tear, mas posso conversar um pouco.', opts: [talk] },
    vv_mei: { greet: 'Seja bem-vindo à Casa de Chá do Rio. Uma xícara?', opts: [buy('jasmintea'), buy('mooncake'), talk] },
    vv_wen: { greet: 'Paz. O pagode está aberto para quem chega em silêncio.', opts: [['🔔 Ouvir o sino (fôlego e descanso)', { a: 'vvbell' }], talk] },
    vv_bogdan: { greet: 'Que a luz te acompanhe, filho. A igreja está sempre aberta.', opts: [['✝ Receber a bênção (descanso)', { a: 'vvbless' }], talk] },
    vv_vasilisa: { greet: 'Dobryy den! Peles quentes para as noites frias, e kvas fresquinho.', opts: [buy('cape_fur'), buy('kvass'), talk] },
    vv_amadou: { greet: 'I ni sogoma! Ouro do Sahel e manteiga de karité para as feridas.', opts: [buy('goldring'), buy('shea'), talk] },
    vv_fatou: { greet: 'Bem-vindo ao Celeiro. Aqui a vila guarda o grão para os tempos difíceis.', opts: [talk] } }); }
// ============================================================
//  ETAPA 3: os guardiões dentro dos marcos, as funções de cada marco e os pedidos (missões) dos moradores
// ============================================================
const VV_IN = { vv_ines: 'banhos', vv_dariush: 'bazar', vv_mei: 'cha', vv_bogdan: 'igreja', vv_fatou: 'celeiro', vv_wen: 'pagode' };
const VV_Q = {
  vv_shirin: { need: { queensilk: 1 }, gold: 180, item: ['carpet', 1], txt: 'Seda da Rainha-Aranha para o tear (1)' },
  vv_lucia: { need: { hardwood: 5 }, gold: 120, txt: 'Madeira nobre para a gôndola (5)' },
  vv_fatou: { need: { wheat: 10 }, gold: 60, item: ['shea', 1], txt: 'Trigo para o celeiro (10)' },
  vv_vasilisa: { need: { boartusk: 4 }, gold: 40, item: ['cape_fur', 1], txt: 'Presas de javali para os botões das capas (4)' },
  vv_wen: { need: { wispdust: 3 }, gold: 100, item: ['mooncake', 2], txt: 'Pó fantasma para o incenso do pagode (3)' },
  vv_rafael: { need: { gem: 2 }, gold: 150, txt: 'Gemas brutas para o esmalte dos azulejos (2)' } };
/* os guardiões dos marcos ficam dentro, no lugar da planta */
if (typeof NPCS !== 'undefined' && typeof BUILDINGS !== 'undefined' && typeof MAP_W !== 'undefined' && MAP_W === 384) for (const id in VV_IN) { const b = BUILDINGS.find(q => q.vk === VV_IN[id]), d = NPCS.find(q => q.id === id); if (!b || !d) continue; const L = interiorLayout(b, 0).npc; if (!L) continue; const [x, y] = bLocal(b, L.i, L.j); d.x = x; d.y = y; delete d.route;
  if (typeof G !== 'undefined' && G.npcs && G.npcs[id]) Object.assign(G.npcs[id], { x, y, rx: x, ry: y }); }
if (typeof npcAction === 'function' && typeof S !== 'undefined') { const _naVV3 = npcAction; npcAction = function (p, m) { const d = m && VV_NPCS.find(q => q.id === m.n), sn = d && S.npcs && S.npcs[d.id];
  if (!d || !sn || !['vvbath', 'vvwheat', 'vvserve', 'vvquest'].includes(m.a)) return _naVV3.apply(this, arguments); if (dist(p.x, p.y, sn.x, sn.y) > 3.5) { tell(p, 'Chegue mais perto para conversar.'); return; }
  const say = text => Net.toOne(p.id, { t: 'npc', n: d.id, text }), now = now_();
  if (m.a === 'vvbath' && d.id === 'vv_ines') { if (!canPay(p, 15)) { say('O banho de vapor custa 15 de ouro.'); return; } payCity(p, 15); p.cold = 0; p.infect = Math.max(0, (p.infect || 0) - 1); p.infT = 0; p.buffs.rested = Math.max(p.buffs.rested || 0, now) + 240000; if (typeof cstMaxOf === 'function') p.cst = cstMaxOf(p); sendStat(p); say('♨ Vapor de eucalipto, água morna e uma laranja no fim. Saia leve! (sem frio, menos febre, Bem descansado por 4 minutos)'); return; }
  if (m.a === 'vvwheat' && d.id === 'vv_fatou') { const n = p.inv.wheat || 0; if (!n) { say('Traga trigo da fazenda: o celeiro compra por um preço justo.'); return; } const q = Math.min(n, 20), g = Math.round(q * LOOT.wheat.price * 1.5); p.inv.wheat -= q; if (p.inv.wheat <= 0) delete p.inv.wheat; p.gold = (p.gold || 0) + g; sendStat(p); say('🌾 ' + q + ' espigas guardadas. Aqui estão ' + g + ' de ouro. O celeiro agradece.'); return; }
  if (m.a === 'vvserve' && d.id === 'vv_mei') { if (!p.sit) { say('Sente-se a uma das mesas que eu sirvo o chá.'); return; } if (!canPay(p, 10)) { say('A xícara servida custa 10 de ouro.'); return; } payCity(p, 10); p.water = Math.min(100, (p.water ?? 100) + 50); p.buffs.rested = Math.max(p.buffs.rested || 0, now) + 180000; sendStat(p); near(sn.x, sn.y, { t: 'anim', w: 'n', id: d.id, a: 'offer', tx: p.x, ty: p.y, ms: 1400 }); say('🍵 Mei Lin serve o chá com as duas mãos. Beba devagar. (Bem descansado por 3 minutos)'); return; }
  if (m.a === 'vvquest') { const Q = VV_Q[d.id]; if (!Q) return; const day = estDay(); p.vvq = p.vvq || {}; if (p.vvq[d.id] === day) { say('Você já me ajudou hoje. Volte amanhã!'); return; }
    const miss = Object.keys(Q.need).filter(k => (p.inv[k] || 0) < Q.need[k]); if (miss.length) { say('Preciso de: ' + Object.keys(Q.need).map(k => Q.need[k] + 'x ' + (LOOT[k] ? LOOT[k].name : k)).join(', ') + '. Você ainda não tem tudo.'); return; }
    for (const k in Q.need) { p.inv[k] -= Q.need[k]; if (p.inv[k] <= 0) delete p.inv[k]; } p.gold = (p.gold || 0) + Q.gold; if (Q.item) p.inv[Q.item[0]] = (p.inv[Q.item[0]] || 0) + Q.item[1]; p.vvq[d.id] = day; sendStat(p);
    say('Obrigado de coração! Aqui estão ' + Q.gold + ' de ouro' + (Q.item ? ' e ' + (Q.item[1] > 1 ? Q.item[1] + 'x ' : '') + LOOT[Q.item[0]].name : '') + '.'); near(sn.x, sn.y, { t: 'anim', w: 'n', id: d.id, a: 'cheer', ms: 1400 }); return; }
  return _naVV3.apply(this, arguments); }; }
if (typeof NPC_DIALOG !== 'undefined') { const add = (k, o) => { if (NPC_DIALOG[k]) NPC_DIALOG[k].opts.splice(NPC_DIALOG[k].opts.length - 1, 0, o); };
  add('vv_ines', ['♨ Banho de vapor — 15 ouro', { a: 'vvbath' }]); NPC_DIALOG.vv_ines.greet = 'Bem-vindo aos Banhos do Pátio! Água morna, vapor de eucalipto e laranjas do nosso pátio.';
  add('vv_fatou', ['🌾 Vender trigo ao celeiro', { a: 'vvwheat' }]); add('vv_mei', ['🍵 Pedir uma xícara servida à mesa — 10 ouro', { a: 'vvserve' }]);
  for (const id in VV_Q) add(id, ['📜 Pedido: ' + VV_Q[id].txt, { a: 'vvquest' }]); }
