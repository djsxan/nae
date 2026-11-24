// ============================================================
//  CONFIGURAÇÃO — classes, skins, habilidades, monstros, missões.
//  Mexa aqui para balancear o jogo.
// ============================================================
const GAME_NAME = 'Nae';
// brasão da família no poder: o castelo, os estandartes e as tapeçarias leem daqui (troca quando outra casa assume)
const CASTLE_OPEN = true;   /* temporário: as sentinelas deixam qualquer um entrar no castelo para conferir os andares */
const CASTLE_INT = true;   /* interior novo do castelo */
// brasões das casas rivais (os mesmos dados servem para a família que tomar o trono)
// ---------- tatuagens: 5 lugares do corpo; f = marca de uma facção (tem efeito social depois que alguém dela vê) ----------
const TAT_SLOTS = [['armA', 'Braço esquerdo'], ['armB', 'Braço direito'], ['chest', 'Peito'], ['back', 'Costas'], ['leg', 'Perna']];
const TATS = [null,
  { id: 'anchor', n: 'Âncora', p: 40 }, { id: 'wolfh', n: 'Cabeça de lobo', p: 40 }, { id: 'serpent', n: 'Serpente', p: 40 }, { id: 'rose', n: 'Rosa', p: 40 }, { id: 'skull', n: 'Caveira', p: 40 }, { id: 'dagger', n: 'Adaga', p: 40 },
  { id: 'moon', n: 'Lua crescente', p: 40 }, { id: 'raven', n: 'Corvo', p: 40 }, { id: 'tree', n: 'Árvore', p: 40 }, { id: 'wave', n: 'Onda', p: 40 }, { id: 'band', n: 'Faixa tribal', p: 40 }, { id: 'star', n: 'Estrela do norte', p: 40 },
  { id: 'h_valcarne', n: 'Lobo de Valcarne', p: 120, f: 'valcarne' }, { id: 'h_draemor', n: 'Serpe de Draemor', p: 120, f: 'draemor' }, { id: 'h_moranthe', n: 'Coruja de Moranthe', p: 120, f: 'moranthe' }, { id: 'h_thornvale', n: 'Javali de Thornvale', p: 120, f: 'thornvale' }, { id: 'h_solmire', n: 'Sol eclipsado de Solmire', p: 120, f: 'solmire' },
  { id: 'h_crown', n: 'Coroa de Aurenfell', p: 120, f: 'crown' }, { id: 'm_guard', n: 'Escudo da Guarda', p: 120, f: 'guard' }, { id: 'm_under', n: 'Olho do Submundo', p: 120, f: 'under' }, { id: 'm_faith', n: 'Sol da Aurora', p: 120, f: 'faith' }];
const TAT_I = id => TATS.findIndex(t => t && t.id === id);
/* a aparência leva sufixos: ~f (corpo feminino) e ~t + 5 letras (uma tatuagem por lugar, '0' = nada) */
function skinParts(skin) { const sp = String(skin || '').split('~'), tc = sp.find(x => /^t[0-9a-z]{5}$/.test(x)); let tats = null; if (tc) { tats = tc.slice(1).split('').map(ch => { const i = parseInt(ch, 36); return TATS[i] ? i : 0; }); if (!tats.some(Boolean)) tats = null; } return { base: sp[0], fem: sp.includes('f'), tats }; }
function skinJoin(base, fem, tats) { return base + (fem ? '~f' : '') + (tats && tats.some(Boolean) ? '~t' + tats.map(i => (i | 0).toString(36)).join('') : ''); }
const HERALDS = {
  valcarne: { house: 'Valcarne', field: '#2c4258', field2: '#1b2a3a', metal: '#d9dde2', charge: 'wolf' }, draemor: { house: 'Draemor', field: '#5a1712', field2: '#2a0e0c', metal: '#e8b44a', charge: 'wyvern' },
  moranthe: { house: 'Moranthe', field: '#33295a', field2: '#1d1630', metal: '#c9c2e8', charge: 'owl' }, thornvale: { house: 'Thornvale', field: '#21492f', field2: '#14301f', metal: '#e4dcc0', charge: 'boar' },
  solmire: { house: 'Solmire', field: '#4a3a22', field2: '#2b2216', metal: '#e8a33c', charge: 'eclipse' } };
const HERALD = { house: 'Aurenfell', name: 'Casa Aurenfell', field: '#9a2a1c', field2: '#6e1d14', metal: '#f1cf6a', charge: 'tower', motto: 'A Luz Não se Curva' };
const VERSION = 'v1.127.0';
const VERSION_NAME = 'Nae · Lado a Lado';

const PLAYER_SPEED = 2.7;          // tiles por segundo (1 tile ≈ 2 m)
// configurações do jogador (menu de pausa)
// migração do nome antigo (World of Sxan) para Nae: copia os saves para as chaves novas
try { for (const [a, b] of [['wos-settings', 'nae-settings'], ['wos-chars-v4', 'nae-chars-v4'], ['sxan_apple', 'nae_apple']]) { const v = localStorage.getItem(a); if (v != null && localStorage.getItem(b) == null) localStorage.setItem(b, v); } for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('wos-fog-')) { const n = 'nae-fog-' + k.slice(8); if (localStorage.getItem(n) == null) localStorage.setItem(n, localStorage.getItem(k)); } } } catch (e) { }
const SET = (() => { const d = { quality: 'auto', bright: 1, zoom: 1, chat: 'fade', phys: 'ragdoll', blood: '1', tele: 'soft', duel: false, pad: (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) ? 0.75 : 0.5 }; try { const S0 = Object.assign(d, JSON.parse(localStorage.getItem('nae-settings') || '{}')); if (!S0.qv) { S0.qv = 1; S0.quality = 'auto'; } return S0; } catch (e) { return d; } })();   /* v1.57: todos passam para a qualidade automática uma vez */
// níveis de qualidade: resolução e efeitos (o 'auto' escolhe sozinho conforme o FPS)
const QLEVELS = [{ n: 'Mínima', dpr: 0.7 }, { n: 'Muito baixa', dpr: 0.85 }, { n: 'Baixa', dpr: 1 }, { n: 'Média', dpr: 1.25 }, { n: 'Alta', dpr: 1.5 }, { n: 'Ultra', dpr: 2 }];
const QFIXED = { low: 2, med: 3, high: 5 };
function saveSettings() { try { localStorage.setItem('nae-settings', JSON.stringify(SET)); } catch (e) { } }
const STAIR_N = 5;                 // escadas: 5 tiles de rampa até o alto da muralha
const SKIN_LVL = [1, 10, 20];      // nível para liberar cada skin (comum, rara, lendária)
const RUN_MUL = 1.65;              // correr (SHIFT) multiplica a velocidade
const STAM_MAX = 400, STAM_DRAIN = 22, STAM_REGEN = 34, STAM_DELAY = 900; // estamina: gasta correndo, volta parado/andando
const OUT_OF_COMBAT_MS = 5000;     // sem lutar por 5s = fora de combate (regenera)
const DOWNED_MS = 30000;           // tempo caído antes de renascer no templo
const REVIVE_MS = 3000;            // segurar F por 3s para reanimar
const VIEW_RADIUS = 20;            // distância (tiles) que cada jogador "enxerga" na rede

// dmg: [mínimo base, mínimo por nível], [máximo base, máximo por nível]
const CLASSES = {
  knight: {
    name: 'Cavaleiro', role: 'Tank',
    desc: 'Veterano de armadura pesada. Segura a linha de frente, atrai os inimigos e protege os companheiros.',
    hp: [150, 24], mp: [30, 4], armor: 0.3, range: 1.45, atkMs: 1100, crit: 0.05,
    dmg: [[5, 1.6], [10, 2.4]], stats: { vida: 5, mana: 1, dano: 3, alcance: 1 },
    passive: { name: 'Pele de Aço', desc: 'Recebe 30% menos dano de todas as fontes.' },
  },
  archer: {
    name: 'Atirador', role: 'Dano à distância',
    desc: 'Caçador paciente das fronteiras. Abate os alvos de longe com precisão letal.',
    hp: [105, 15], mp: [50, 6], armor: 0.1, range: 6, atkMs: 950, crit: 0.2,
    dmg: [[4, 1.4], [8, 2.2]], stats: { vida: 3, mana: 2, dano: 4, alcance: 5 },
    passive: { name: 'Olho de Águia', desc: '20% de chance de acerto crítico (dano x1.8).' },
  },
  mage: {
    name: 'Mago', role: 'Magia / Cura',
    desc: 'Estudioso dos cinco elementos: fogo, ar, terra, luz e água. Começa com uma magia de cada e luta de perto com o cajado.',
    hp: [90, 11], mp: [100, 13], armor: 0, range: 5.5, atkMs: 1250, crit: 0.05,
    dmg: [[3, 1.0], [6, 1.6]], stats: { vida: 2, mana: 5, dano: 5, alcance: 4 },
    passive: { name: 'Mente Arcana', desc: 'Regenera mana duas vezes mais rápido.' },
  },
};
// ---------- o Pentagrama do mago: 5 elementos nas pontas (ordem wicca, Luz em cima, sentido horário) ----------
const MAGE_EL = [
  { k: 'holy', n: 'Luz', ic: '☀', c: '#d9a92e', ink: '#8a6410' },
  { k: 'water', n: 'Água', ic: '💧', c: '#3f86b8', ink: '#1f4f72' },
  { k: 'fire', n: 'Fogo', ic: '🔥', c: '#c4432a', ink: '#7e2414' },
  { k: 'earth', n: 'Terra', ic: '🌿', c: '#5b8a36', ink: '#34561c' },
  { k: 'wind', n: 'Ar', ic: '🌬', c: '#7aa6ae', ink: '#3e6870' },
];
// combinações de dois elementos (no meio do Pentagrama, ainda trancadas: em breve)
const COMBO_NEED = 50;   /* força pedida em cada um dos dois elementos (mais 1 ponto de talento) */
const MAGE_COMBOS = [
  { id: 'c_tornado', a: 'fire', b: 'wind', dk: 'fire', mp: 34, cd: 14000, n: 'Tornado de Fogo', d: 'Um redemoinho de chamas nasce à sua frente e anda devagar na direção do mouse por 6 s: puxa para dentro os inimigos em 2,5 casas, queima quem está nele e põe fogo no mato por onde passa.' },
  { id: 'c_dome', a: 'holy', b: 'wind', dk: 'wind', mp: 32, cd: 14000, n: 'Campo de Defesa', d: 'Uma cúpula de vento e luz de 3,5 casas onde você está, por 8 s: as flechas desviam, os aliados lá dentro levam 40% menos dano e os bichos menores que entram são jogados para fora.' },
  { id: 'c_steam', a: 'fire', b: 'water', dk: 'water', mp: 30, cd: 12000, n: 'Vapor Escaldante', d: 'Uma nuvem fervente de 3 casas onde está o mouse, por 8 s: os aliados lá dentro ficam escondidos dos bichos, e os inimigos dentro dela queimam a cada segundo e ficam molhados.' },
  { id: 'c_embers', a: 'fire', b: 'earth', dk: 'fire', mp: 30, cd: 12000, n: 'Chão de Brasas', d: 'A terra racha e vira brasa em 3 casas onde está o mouse, por 10 s: quem pisa queima e anda 40% mais devagar.' },
  { id: 'c_sflame', a: 'fire', b: 'holy', dk: 'holy', mp: 34, cd: 14000, n: 'Chama Sagrada', d: 'Uma chama dourada de 3 casas em volta de você, por 8 s: cura os aliados (4% da vida por segundo), aquece no frio e queima os inimigos, em dobro os mortos-vivos.' },
  { id: 'c_mud', a: 'water', b: 'earth', dk: 'earth', mp: 30, cd: 12000, n: 'Lodaçal', d: 'A terra vira lama funda em 3,5 casas onde está o mouse, por 10 s: os bichos menores ficam presos 3 s ao entrar e depois andam 60% mais devagar (os grandes só ficam lentos). Apaga o fogo e deixa todos molhados.' },
  { id: 'c_storm', a: 'water', b: 'wind', dk: 'wind', mp: 38, cd: 14000, n: 'Tempestade', d: 'Uma nuvem escura sobre 4 casas onde está o mouse, por 8 s: a chuva molha e apaga o fogo, e a cada segundo cai um raio num inimigo, com dano e 1 s de atordoamento (mais dano em quem já está molhado).' },
  { id: 'c_hwater', a: 'water', b: 'holy', dk: 'water', mp: 30, cd: 12000, n: 'Água Benta', d: 'Uma onda de água abençoada em 4 casas em volta de você: limpa infecção, sangramento e fogo dos aliados, cura 15% da vida e queima os mortos-vivos.' },
  { id: 'c_sand', a: 'earth', b: 'wind', dk: 'earth', mp: 32, cd: 13000, n: 'Tempestade de Areia', d: 'Um redemoinho de areia de 4 casas que acompanha você por 8 s: os inimigos dentro dele erram metade dos golpes e perdem de vista quem está a mais de 2 casas.' },
  { id: 'c_grove', a: 'earth', b: 'holy', dk: 'holy', mp: 34, cd: 14000, n: 'Bosque Sagrado', d: 'Uma clareira de flores e brotos de luz de 3,5 casas onde você está, por 20 s: quem fica parado ou sentado nela recupera 5% da vida por segundo e o fôlego, e os animais ficam calmos.' },
];

// Skins (visuais) de cada vocação
const SKINS = {
  knight: [
    { id: 'iron', name: 'Guarda de Ferro', rarity: 'Comum' },
    { id: 'dragon', name: 'Cavaleiro Dracônico', rarity: 'Rara' },
    { id: 'sun', name: 'Paladino da Aurora', rarity: 'Lendária' },
  ],
  archer: [
    { id: 'scout', name: 'Batedor da Fronteira', rarity: 'Comum' },
    { id: 'winter', name: 'Patrulheiro do Inverno', rarity: 'Rara' },
    { id: 'sylvan', name: 'Arqueiro Sílfide', rarity: 'Lendária' },
  ],
  mage: [
    { id: 'adept', name: 'Adepto Arcano', rarity: 'Comum' },
    { id: 'astral', name: 'Arquimago Astral', rarity: 'Rara' },
    { id: 'druid', name: 'Druida Ancestral', rarity: 'Lendária' },
  ],
};

// tgt: precisa de monstro como alvo · cast: tempo de conjuração (ms)
const SKILLS = {
  knight: [
    { id: 'bash', name: 'Golpe Brutal', mp: 8, cd: 4000, tgt: true, range: 1.6, el: 'phys',
      desc: 'Golpe esmagador: 220% de dano e atordoa o alvo por 1,4s.' },
    { id: 'warcry', name: 'Grito de Guerra', mp: 12, cd: 12000, el: 'phys',
      desc: 'Atrai todos os inimigos em 5 tiles e reduz o dano recebido em 20% por 6s.' },
    { id: 'whirl', name: 'Redemoinho', mp: 15, cd: 8000, el: 'phys',
      desc: 'Gira a lâmina atingindo todos ao redor (1,8 tile) com 160% de dano.' },
    { id: 'wall', name: 'Muralha de Ferro', mp: 20, cd: 20000, el: 'holy',
      desc: 'Ergue o escudo: reduz o dano recebido em 60% por 6s.' },
  ],
  archer: [
    { id: 'double', name: 'Tiro Duplo', mp: 6, cd: 3000, tgt: true, range: 6.5, el: 'phys',
      desc: 'Duas flechas seguidas, cada uma com 100% de dano.' },
    { id: 'pierce', name: 'Flecha Perfurante', mp: 12, cd: 7000, tgt: true, range: 7, el: 'phys',
      desc: 'Atravessa todos os inimigos em linha reta: 180% de dano.' },
    { id: 'rain', name: 'Chuva de Flechas', mp: 18, cd: 10000, tgt: true, range: 6.5, el: 'phys',
      desc: 'Saraivada sobre a área do alvo: 130% de dano em todos.' },
    { id: 'agile', name: 'Passo Ágil', mp: 10, cd: 15000, el: 'wind',
      desc: 'Por 6s: anda 60% mais rápido, ataca 2x mais rápido e +10% de crítico.' },
  ],
  mage: [   // as 5 magias base do Pentagrama (teclas 1 a 5)
    { id: 'ember', name: 'Chamas', mp: 6, cd: 0, el: 'fire', hold: 1,
      desc: 'Segure a tecla 1: um jato contínuo de fogo sai das mãos na direção do mouse (6 de mana por segundo). Quem é atingido arde por 3 s, os animais fogem, o jato acende fogueiras apagadas e pode pôr fogo no mato. O alcance e o dano crescem com o nível, com os pontos na árvore do Fogo e com a perícia Fogo.' },
    { id: 'windstep', name: 'Passo do Vento', mp: 6, cd: 5000, el: 'wind',
      desc: 'Uma lufada leva você 3,5 casas para onde está andando (ou para onde olha). No meio do passo nada te acerta.' },
    { id: 'bloom', name: 'Florescer', mp: 10, cd: 9000, el: 'earth',
      desc: 'Flores brotam na grama em volta e ficam 3 minutos: quem está nelas recupera um pouco de vida e de fôlego, e os animais ali ficam calmos.' },
    { id: 'faith', name: 'Fé Inabalável', mp: 12, cd: 8000, el: 'holy',
      desc: 'Cura um pouco (8% da vida) você e o aliado mais perto, até 3 casas.' },
    { id: 'spring', name: 'Fonte', mp: 8, cd: 10000, el: 'water',
      desc: 'Água brota das suas mãos: enche o seu odre e o de quem está perto, todos bebem um gole, apaga quem estiver pegando fogo e as fogueiras, e rega as flores (duram e curam mais).' },
  ],
};

// Monstros. speed em tiles/s · aggro = distância em que percebe o jogador
const MON = {
  // fauna (beh: flee = foge ao ser atacada · retal = revida · pred = predador que só caça os fracos). Animais não carregam ouro: o lucro vem dos recursos.
  rat:      { name: 'Ratazana',          hp: 18,  dmg: [1, 3],   xp: 5,   gold: [0, 0],   speed: 2.2, atk: 1400, aggro: 0, beh: 'flee' },
  deer:     { name: 'Cervo',             hp: 45,  dmg: [0, 0],   xp: 14,  gold: [0, 0],   speed: 3.6, atk: 1400, aggro: 0, beh: 'flee' },
  boar:     { name: 'Javali',            hp: 85,  dmg: [5, 11],  xp: 30,  gold: [0, 0],   speed: 2.6, atk: 1300, aggro: 0, beh: 'retal' },
  slime:    { name: 'Lodo Vivo',         hp: 32,  dmg: [2, 5],   xp: 12,  gold: [2, 5],   speed: 1.2, atk: 1500, aggro: 4 },
  wolf:     { name: 'Lobo Cinzento',     hp: 60,  dmg: [4, 10],  xp: 28,  gold: [0, 0],   speed: 2.8, atk: 1100, aggro: 7, beh: 'pred' },
  spider:   { name: 'Aranha-Tecelã',     hp: 50,  dmg: [3, 7],   xp: 20,  gold: [0, 0],   speed: 2.4, atk: 1200, aggro: 0, beh: 'flee' },
  toad:     { name: 'Sapo-Boi do Brejo', hp: 55,  dmg: [3, 7],   xp: 20,  gold: [0, 0],   speed: 1.8, atk: 1300, aggro: 0, beh: 'flee' },
  goblin:   { name: 'Saqueador Goblin',  hp: 90,  dmg: [6, 14],  xp: 45,  gold: [8, 16],  speed: 2.3, atk: 1100, aggro: 6 },
  skeleton: { name: 'Esqueleto Errante', hp: 120, dmg: [8, 16],  xp: 60,  gold: [6, 14],  speed: 1.7, atk: 1300, aggro: 6 },
  orc:      { thrower: true, name: 'Orc Guerreiro',     hp: 180, dmg: [10, 22], xp: 95,  gold: [12, 25], speed: 2.0, atk: 1300, aggro: 7 },
  // thrower: arremessa pedras de longe
  troll:    { thrower: true, name: 'Troll da Montanha', hp: 420, dmg: [18, 36], xp: 260, gold: [30, 60], speed: 1.5, atk: 1700, aggro: 6, big: true, boss: true, trophy: 'trolltusk' },
  // inimigos dos bastiões
  bandit:   { name: 'Bandido',           hp: 110, dmg: [7, 14],  xp: 50,  gold: [6, 14],  speed: 2.3, atk: 1100, aggro: 6 },
  deserter: { name: 'Desertor',          hp: 170, dmg: [9, 19],  xp: 80,  gold: [10, 22], speed: 2.0, atk: 1250, aggro: 6 },
  wisp:     { name: 'Fogo-Fátuo',        hp: 60,  dmg: [4, 8],   xp: 45,  gold: [0, 0],   speed: 2.6, atk: 1500, aggro: 7, drain: 10, cs: 1.7 },
  // chefes (ao morrer deixam um baú para quem lutou)
  orcchief: { thrower: true, name: 'Grukk, Chefe Orc',  hp: 750, dmg: [16, 30], xp: 420, gold: [60, 100], speed: 1.9, atk: 1400, aggro: 7, big: true, boss: true, base: 'orc', trophy: 'orcbanner' },
  cryptlord: { name: 'Senhor da Cripta', hp: 620, dmg: [14, 26], xp: 400, gold: [40, 80], speed: 1.7, atk: 1350, aggro: 7, big: true, boss: true, base: 'skeleton', trophy: 'cryptcrown' },
  deserterchief: { name: 'Capitão Varrick', hp: 680, dmg: [15, 28], xp: 410, gold: [70, 120], speed: 2.0, atk: 1250, aggro: 7, big: true, boss: true, base: 'deserter', trophy: 'insignia' },
  dragon:   { name: 'Drakhar, o Flagelo Rubro', hp: 3400, dmg: [32, 50], xp: 2000, gold: [180, 300], speed: 2.1, atk: 1700, aggro: 6, big: true, boss: true, dragon: true, rad: 3.6, trophy: 'dragonscale' },
  elderslime: { name: 'Lodo Ancião',     hp: 480, dmg: [10, 20], xp: 300, gold: [0, 0],   speed: 1.1, atk: 1600, aggro: 6, big: true, boss: true, base: 'slime', cs: 1.9, trophy: 'slimecore' },
};
for (const k in MON) MON[k].speed *= 0.75; // escala nova do mundo
const MON_TYPES = Object.keys(MON);

// Missões secundárias (repetíveis) dadas pela Capitã no pátio do castelo
const QUESTS = [
  { id: 'q_rat', name: 'Praga nos Celeiros', mon: 'rat', count: 8, xp: 80, gold: 30, desc: 'As ratazanas estão devorando as reservas de grãos. Elimine 8 delas nos Campos.' },
  { id: 'q_slime', name: 'Lodo nas Valas', mon: 'slime', count: 6, xp: 120, gold: 40, desc: 'Os lodos vivos estão entupindo as valas de irrigação. Destrua 6.' },
  { id: 'q_wolf', name: 'Uivos no Bosque', mon: 'wolf', count: 6, xp: 260, gold: 70, desc: 'Uma alcateia vem atacando os lenhadores no Bosque Sombrio. Abata 6 lobos.' },
  { id: 'q_spider', name: 'Teias na Trilha', mon: 'spider', count: 5, xp: 280, gold: 75, desc: 'Aranhas-tecelãs fecharam a trilha dos caçadores. Mate 5.' },
  { id: 'q_toad', name: 'O Brejo Inquieto', mon: 'toad', count: 6, xp: 300, gold: 80, desc: 'Os sapos-boi do pântano estão cada vez mais agressivos. Elimine 6.' },
  { id: 'q_goblin', name: 'Saque Interrompido', mon: 'goblin', count: 8, xp: 520, gold: 120, desc: 'Saqueadores goblins roubaram uma caravana. Derrube 8 deles no Acampamento Orc.' },
  { id: 'q_skeleton', name: 'Descanso aos Mortos', mon: 'skeleton', count: 8, xp: 600, gold: 130, desc: 'Os mortos das Colinas de Ossos se levantaram. Devolva 8 deles ao descanso.' },
  { id: 'q_orc', name: 'Lâminas do Oeste', mon: 'orc', count: 6, xp: 800, gold: 180, desc: 'Orcs guerreiros preparam um ataque. Enfraqueça as fileiras: 6 orcs.' },
  { id: 'q_troll', name: 'O Gigante da Montanha', mon: 'troll', count: 1, xp: 1000, gold: 250, desc: 'Um troll desceu da montanha da cachoeira. Derrube-o.' },
];
const MAX_ACTIVE_QUESTS = 3;

const ITEMS = {
  hp: { name: 'Poção de Vida', price: 20, desc: 'Recupera 35% da vida.' },
  mp: { name: 'Poção de Mana', price: 25, desc: 'Recupera 40% da mana.' },
  water: { name: 'Odre (5 goles)', price: 12, desc: 'Água para a viagem. Clique para beber; encha na água (F).' },
  band: { name: 'Bandagem', price: 8, desc: 'Estanca o sangramento da pior ferida. Tecla B (perto do fogo, sem bandagem, cauteriza).' },
};

// saque dos monstros (vai para o inventário; o mercador compra)
// agachar (C) e deslizar (C + Shift correndo)
// estados de vida: à beira da morte < 25%; de joelhos < 15% (anda 50% mais devagar, sem habilidades, ataque mais fraco)
const DYING_HP = 0.25, KNEEL_HP = 0.15, KNEEL_MUL = 0.5, AID_MS = 2000, AID_HEAL = 0.2;
const CROUCH_MUL = 0.5, SLIDE_MS = 600, SLIDE_COST = 22;
const LOOT = {
  axe:      { name: 'Machado de lenhador', price: 25, icon: '🪓', color: '#b8b0a0', desc: 'Para cortar árvores (segure F perto de uma). Não gasta.', tool: 1 },
  pickaxe:  { name: 'Picareta',          price: 25, icon: '⛏', color: '#a8a8b0', desc: 'Para quebrar pedras (segure F perto de uma). Não gasta.', tool: 1 },
  sickle:   { name: 'Foice',             price: 25, icon: '🌙', color: '#c8c0a8', desc: 'Para colher linho e plantas no mato alto (segure F). Não gasta.', tool: 1 },
  log:      { name: 'Tora de madeira',   price: 3,  icon: '🪵', color: '#a8784a', desc: 'Madeira cortada. Vende no Empório ou vai para uma carpintaria.' },
  hardwood: { name: 'Madeira nobre',     price: 12, icon: '🟫', color: '#7a4a2a', desc: 'Carvalho de veio fino. Rara e valiosa.' },
  ore:      { name: 'Minério',           price: 4,  icon: '🪨', color: '#8a8a90', desc: 'Pedra com metal. Vende no Empório ou vai para a forja.' },
  flaxraw:  { name: 'Linho cru',         price: 3,  icon: '🌾', color: '#d8c890', desc: 'Fibra para tecido e bandagens.' },
  entseed: { name: 'Semente da guardiã', price: 0, icon: '🌰', color: '#a87a40', desc: 'Deixada pela árvore guardiã ao secar. Um mago a planta fora da cidade (clique) e uma muda nova nasce.' },
  silverleaf: { name: 'Folha-de-prata',  price: 15, icon: '🍃', color: '#c8e0e8', desc: 'Erva rara que brilha ao luar. Boticários pagam bem.' },
  wheat: { name: 'Trigo', price: 2, icon: '🌾', color: '#e2c060', desc: 'Espigas da fazenda da Vila. Duas viram um pão no fogão; o moinho faz farinha.' },
  elixir_breath: { name: 'Elixir do Fôlego', price: 45, icon: '🧪', color: '#7ad8e8', desc: 'Por 3 minutos o fôlego não acaba. Da alquimista Morgana.' },
  elixir_warm: { name: 'Elixir da Brasa', price: 35, icon: '🧪', color: '#e8883a', desc: 'Por 10 minutos o frio não te pega. Da alquimista Morgana.' },
  elixir_swift: { name: 'Elixir dos Passos Ligeiros', price: 40, icon: '🧪', color: '#a8e86a', desc: 'Por 45 segundos você anda e ataca muito mais rápido.' },
  amulet_luck: { name: 'Amuleto da Sorte', price: 120, icon: '🧿', color: '#5aa8f0', desc: 'Na mochila: um pouco mais de chance de acerto crítico.' },
  wand:     { name: 'Varinha entalhada', price: 10, icon: '🪄', color: '#c8a070', desc: 'Pinho entalhado. Na mão do mago: +10% de dano mágico e +10 de mana.' },
  wand_fine: { name: 'Varinha de carvalho', price: 28, icon: '🪄', color: '#8a5a30', desc: 'Madeira nobre de veio fino. Na mão do mago: +20% de dano mágico e +20 de mana.' },
  wand_arcane: { name: 'Varinha arcana', price: 90, icon: '🪄', color: '#7ad0f0', desc: 'Carvalho com uma gema encravada na ponta. Na mão do mago: +30% de dano mágico e +35 de mana.' },
  map:      { name: 'Mapa da região',    price: 7,  icon: '🗺', color: '#e8d8a8', desc: 'Copiado à mão em Pergaminhos & Mapas. Vale no Empório.' },
  rattail:  { name: 'Rabo de Ratazana', price: 4,   icon: '〰', color: '#c8a090', desc: 'Fino e pelado. Alguém paga por isso.' },
  goo:      { name: 'Gosma Viva',       price: 6,   icon: '●', color: '#6ad84a', desc: 'Ainda se mexe um pouco.' },
  pelt:     { name: 'Pele de Lobo',     price: 22,  icon: '▰', color: '#9a9a9a', desc: 'Grossa e quente. Os alfaiates adoram.' },
  silk:     { name: 'Seda de Aranha',   price: 14,  icon: '❋', color: '#e8e8f0', desc: 'Fio resistente como corda.' },
  toadskin: { name: 'Couro de Sapo',    price: 13,  icon: '◆', color: '#7a9a4a', desc: 'Úmido e elástico.' },
  trinket:  { name: 'Bugiganga Goblin', price: 20,  icon: '✧', color: '#e8c040', desc: 'Roubada de alguém, com certeza.' },
  bone:     { name: 'Osso Antigo',      price: 18,  icon: '✕', color: '#e8dcc0', desc: 'Velho, mas ainda inteiro.' },
  tusk:     { name: 'Presa de Orc',     price: 28,  icon: '◣', color: '#f0e8d0', desc: 'Troféu de guerra.' },
  trollheart: { name: 'Coração de Troll', price: 120, icon: '♥', color: '#c83a3a', desc: 'Ainda quente. Raríssimo.' },
  hide:     { name: 'Couro de Cervo',   price: 16,  icon: '▰', color: '#b08050', desc: 'Couro macio, bom para botas e luvas.' },
  venison:  { name: 'Carne de Cervo',   price: 9,   icon: '◖', color: '#c85a4a', desc: 'Carne crua. Asse no fogo (F perto de uma fogueira) ou coma crua (pode passar mal).' },
  boartusk: { name: 'Presa de Javali',  price: 18,  icon: '◣', color: '#e8dcc0', desc: 'Curva e afiada como faca.' },
  pork:     { name: 'Carne de Javali',  price: 11,  icon: '◖', color: '#d87a6a', desc: 'Carne crua. Asse no fogo (F perto de uma fogueira) ou coma crua (pode passar mal).' },
  pouch:    { name: 'Bolsa Roubada',    price: 26,  icon: '◍', color: '#a8844a', desc: 'Moedas de algum viajante azarado.' },
  rustblade: { name: 'Lâmina Enferrujada', price: 24, icon: '⟋', color: '#a87a5a', desc: 'Espada de um soldado que fugiu da guerra.' },
  wispdust: { name: 'Pó Fantasma',      price: 32,  icon: '✺', color: '#8affd0', desc: 'Brilha fraquinho no escuro.' },
  orcbanner: { name: 'Estandarte de Grukk', price: 160, icon: '⚑', color: '#c83a2a', desc: 'Troféu do chefe do Acampamento Orc.' },
  cryptcrown: { name: 'Coroa do Senhor da Cripta', price: 180, icon: '♛', color: '#d8c070', desc: 'Ouro velho e frio, tirado de um morto.' },
  insignia: { name: 'Insígnia do Capitão', price: 170, icon: '✠', color: '#c8c8d0', desc: 'Prova de que Varrick caiu.' },
  slimecore: { name: 'Núcleo do Lodo Ancião', price: 130, icon: '◉', color: '#5ad84a', desc: 'Pulsa como um coração verde.' },
  trolltusk: { name: 'Presa do Troll',  price: 150, icon: '◣', color: '#f0e8d0', desc: 'Do tamanho de um braço.' },
  dragonscale: { name: 'Escama de Dragão', price: 420, icon: '⬢', color: '#c83a2a', desc: 'Dura como aço e ainda morna. O troféu mais raro de Nae.' },
  bread:    { name: 'Pão',              price: 4,   icon: '◒', color: '#d8a860', desc: 'Pão dormido da taverna. Mata a fome. Clique para comer.' },
  cookedmeat: { name: 'Carne Assada',   price: 12,  icon: '◖', color: '#a8582a', desc: 'Carne de caça assada no fogo. Alimenta bem. Clique para comer.' },
  stew:     { name: 'Ensopado', price: 18, icon: '♨', color: '#b8743a', desc: 'Ensopado quente de carne e ervas. Sacia, mata a sede e cura um pouco. Clique para comer.' },
  pie:      { name: 'Torta de Frutas', price: 14, icon: '◒', color: '#c8603a', desc: 'Torta doce de frutas silvestres e maçã. Clique para comer.' },
  firemead: { name: 'Hidromel de Fogo', price: 12, icon: '🔥', color: '#e86a20', desc: 'O hidromel do Ronco do Dragão: arde na garganta e solta uma faísca pela boca. Nada de frio por 5 minutos. Dois seguidos deixam tonto. Clique para beber.' },
  ale:      { name: 'Caneca de cerveja', price: 3, icon: '🍺', color: '#d8a040', desc: 'Cerveja do Ronco do Dragão, espumando. Mata a sede e dá fôlego; três seguidas deixam tonto. Clique para beber.' },
  tea:      { name: 'Chá de Ervas', price: 8, icon: '☕', color: '#8aa84a', desc: 'Mata a sede e baixa a febre. Clique para beber.' },
  rope:     { name: 'Corda', price: 15, icon: '➰', color: '#c8a870', desc: 'Para amarrar as mãos de alguém caído, rendido ou preso no mata-leão (H → Amarrar).' },
  lockpick: { name: 'Gazua', price: 40, icon: '⚷', color: '#9aa0a6', desc: 'Abre algemas (F perto de alguém algemado). Usar na cidade é crime.' },
  apple:    { name: 'Maçã', price: 3, icon: '●', color: '#c8302a', desc: 'Maçã docinha da feira. Mata um pouco a fome. Clique para comer.' },
  berries:  { name: 'Frutas Silvestres', price: 3, icon: '❀', color: '#c8283a', desc: 'Colhidas no mato. Matam um pouco a fome. Clique para comer.' },
  herb:     { name: 'Erva Medicinal',   price: 8,   icon: '❦', color: '#6aa84a', desc: 'Mastigue para baixar a febre e estancar sangramentos leves. Clique para usar.' },
  salve:    { name: 'Pomada de Elva',   price: 30,  icon: '⚗', color: '#6ad8a8', desc: 'Preparada na estufa da Elva: recupera os membros feridos e estanca o sangue. Clique para usar.' },
  ointment: { name: 'Unguento',         price: 25,  icon: '⚱', color: '#7ab86a', desc: 'Ervas e banha. Cura infecção. Clique para usar.' },
  firewood: { name: 'Lenha',            price: 5,   icon: '≡', color: '#8a6a3a', desc: 'Clique para acender uma fogueira à sua frente (dura 3 min).' },
  gem:      { name: 'Gema Bruta',       price: 55,  icon: '◈', color: '#5ad0f0', desc: 'Pedra preciosa sem lapidar.' },
};
// recursos de cada criatura: [item, chance]
// capas e mantos da Alfaiataria Real: vestir pelo inventário (muda a aparência para todos)
const CLOAKS = {
  1: { k: 'cape_plum', n: 'Capa ameixa', tone: '#5e2c52', price: 45 }, 2: { k: 'cape_night', n: 'Capa azul-noite', tone: '#1e2a4a', price: 45 },
  3: { k: 'cape_emerald', n: 'Capa esmeralda', tone: '#1e4a32', price: 45 }, 4: { k: 'cape_crimson', n: 'Capa carmim', tone: '#7a1a1c', price: 45 },
  5: { k: 'cape_ivory', n: 'Capa marfim', tone: '#e8e0cc', price: 60 },
  6: { k: 'robe_star', n: 'Manto das estrelas', tone: '#1a2040', trim: '#d8c070', pat: 'stars', robe: true, price: 120 },
  7: { k: 'robe_plum', n: 'Manto ameixa e ouro', tone: '#4a1a3a', trim: '#d4a94a', robe: true, price: 120 },
  8: { k: 'robe_forest', n: 'Manto da floresta', tone: '#1e3a24', trim: '#b8a060', pat: 'leaves', robe: true, price: 120 },
};
const CLOAK_BY_ITEM = {}; for (const id in CLOAKS) CLOAK_BY_ITEM[CLOAKS[id].k] = +id;
for (const id in CLOAKS) { const C = CLOAKS[id]; LOOT[C.k] = { name: C.n, price: C.price, icon: C.robe ? '🥻' : '🧥', color: C.tone, desc: (C.robe ? 'Manto longo costurado sob medida na Alfaiataria Real.' : 'Capa de tecido fino da Alfaiataria Real.') + ' Clique para vestir ou tirar.' }; }
// varinhas: cada uma escolhe o dono com uma madeira, um núcleo e um tamanho (pequenas diferenças)
const WAND_WOODS = [['Teixo', 0.02, 0], ['Azevinho', 0, 4], ['Carvalho', 0.01, 2], ['Salgueiro', -0.01, 6], ['Ébano', 0.03, -2], ['Freixo', 0.01, 3], ['Cerejeira', 0, 5], ['Videira', 0.02, 1], ['Nogueira', 0.015, 2], ['Faia', 0, 4]];
const WAND_CORES = [['pena de grifo', 0.02, 0], ['pelo de unicórnio', 0, 6], ['escama de dragão', 0.03, -3], ['fio de luar', 0.01, 4], ['seiva de árvore anciã', 0.01, 3], ['pluma de coruja branca', 0, 5]];
const WAND_FEEL = ['leve e ágil', 'firme', 'flexível', 'um pouco teimosa', 'muito obediente', 'quente ao toque'];
const MON_LOOT = {
  rat: [['rattail', 0.85]], deer: [['hide', 1], ['venison', 0.75]], boar: [['boartusk', 0.9], ['pork', 0.8]], wolf: [['pelt', 0.95]],
  bandit: [['pouch', 0.35]], deserter: [['rustblade', 0.4]], wisp: [['wispdust', 0.6]],
  spider: [['silk', 0.85]], toad: [['toadskin', 0.85]], slime: [['goo', 0.55]], goblin: [['trinket', 0.55]], skeleton: [['bone', 0.55]], orc: [['tusk', 0.55]], troll: [['trollheart', 1]],
};
const INV_SLOTS = 24;
// modo criador (O Tecelão): abrir com ?criador e digitar a senha. Aqui fica só o hash SHA-256 da senha.
const DEV_HASH = 'f1ee529ef49111208f1c1646c53c8c311c9f093fd7891c1b46d77e98210b018d';
// bastiões: cada monstro volta ~3 min depois de morrer (sem jogador perto); chefe ~10 min; o baú do chefe dura 2 min
const BASTION_RESPAWN = 90000, BOSS_RESPAWN = 300000, CHEST_MS = 120000, MAX_WILD = 200;
// ===== corpo: partes, feridas e sangramento (fase 1) =====
const BODY_PARTS = ['head', 'torso', 'armA', 'armB', 'legL', 'legR'];
const BODY_NAMES = { head: 'Cabeça', torso: 'Tronco', armA: 'Braço da arma', armB: 'Outro braço', legL: 'Perna esquerda', legR: 'Perna direita' };
const PART_STATE = h => h > 70 ? 0 : h > 40 ? 1 : h > 15 ? 2 : 3;   // 0 saudável · 1 ferido · 2 grave · 3 quebrado
const PART_STATE_NAMES = ['saudável', 'ferido', 'grave', 'quebrado'];
// onde cada porte de inimigo costuma acertar: [cabeça, tronco, braços, pernas]
const HIT_ZONES = { low: [0.04, 0.3, 0.16, 0.5], mid: [0.14, 0.42, 0.24, 0.2], high: [0.26, 0.46, 0.2, 0.08] };
const HIT_CAT = t => ['rat', 'wolf', 'spider', 'toad', 'boar', 'deer', 'slime', 'elderslime'].includes(t) ? 'low' : ['troll', 'orc', 'orcchief', 'dragon', 'deserterchief', 'cryptlord'].includes(t) ? 'high' : 'mid';
// mira com o mouse: cabeça erra mais e machuca mais; pernas deixam o alvo lento
const AIM_ACC = { head: 0.7, torso: 0.95, legs: 0.85 }, AIM_DMG = { head: 1.5, torso: 1, legs: 0.8 };
const BLEED_RATE = [0, 0.25, 0.6, 1.0];   // % da vida por segundo, por ferida (ferido / grave / quebrado)
const LEG_SPEED = [1, 0.85, 0.62, 0.38], ARM_DMG = [1, 0.85, 0.6, 0.35];
// ===== combate corpo a corpo direcional (estilo Chivalry) =====
// arma corpo a corpo de cada vocação: alcance, dano e velocidade (multiplicadores)
// armas do cavaleiro: espada (curta, mais dano, rápida) e alabarda (longa, menos dano, mais lenta, duas mãos)
const WEAPONS = { sword: { n: 'Espada', reach: 1.0, dmg: 1.0, spd: 1.0, arc: 1.0 }, halberd: { n: 'Alabarda', reach: 1.65, dmg: 0.78, spd: 1.22, arc: 0.85 } };
// uniformes de trabalho (código 1–7): o personagem veste ao começar um turno/bico e tira ao terminar; os funcionários NPC usam os mesmos
const UNIFORMS = {
  1: { n: 'avental de couro', body: '#5a4030', b2: '#8a6a48', trim: '#2a1a10' },          // forja, serraria, carpintaria
  2: { n: 'avental branco', body: '#e8e4da', b2: '#3a5a3a', trim: '#5a7a5a' },            // boticário, alambique
  3: { n: 'colete de loja', body: '#6a2a2a', b2: '#e8dcc0', trim: '#c9a24a' },            // lojas, taverna
  4: { n: 'bata de jardineiro', body: '#5a7a3a', b2: '#c8b890', trim: '#3a2a1a', head: 'hood' },
  5: { n: 'capa de mensageiro', body: '#3a6a8a', b2: '#d8c8a0', trim: '#c9a24a', head: 'hood' },
  6: { n: 'casaca de banqueiro', body: '#1e2a3a', b2: '#e8dcc0', trim: '#e2b74e' },
  7: { n: 'roupa de trabalho', body: '#7a6a4a', b2: '#c8b890', trim: '#3a2a1a' },          // horta, mina, carga
};
const HEAVY = 0.7;   // carga a partir da qual o golpe é "forte" (letal em parte vital)
const MELEE = { knight: { wpn: 'espada', reach: 1.0, dmg: 1.0, spd: 1.0 }, archer: { wpn: 'adaga', reach: 0.8, dmg: 0.7, spd: 0.82 }, mage: { wpn: 'cajado', reach: 1.15, dmg: 0.6, spd: 1.1 } };
// golpes: W preparação, R impacto, C recuperação (ms); alcance (tiles); arco (meio-ângulo, rad); dano; parte do corpo; fôlego
const STRIKES = {
  over:   { n: 'de cima',   W: 480, R: 150, C: 450, reach: 1.6,  arc: 0.45, mult: 1.4,  zone: 'head',  st: 12, bz: 'top' },   // lento e forte; fácil de prever
  under:  { n: 'de baixo',  W: 320, R: 140, C: 360, reach: 1.5,  arc: 0.55, mult: 0.75, zone: 'legs',  st: 7, bz: 'low', trip: 0.25 },   // rápido, pouco dano, pode derrubar
  slashL: { n: 'lateral',   W: 390, R: 170, C: 400, reach: 1.55, arc: 1.15, mult: 1.0,  zone: 'torso', st: 9, multi: 2 },
  slashR: { n: 'lateral',   W: 390, R: 170, C: 400, reach: 1.55, arc: 1.15, mult: 1.0,  zone: 'torso', st: 9, multi: 2 },
  stab:   { n: 'estocada',  W: 300, R: 120, C: 340, reach: 2.05, arc: 0.24, mult: 0.8,  zone: 'torso', st: 7, bz: 'side' },   // rápida e longa, pouco dano; fura bloqueio alto/baixo
  bite:   { n: 'mordida',   W: 340, R: 120, C: 480, reach: 1.25, arc: 0.6,  mult: 1.0,  zone: 'legs',  st: 0 },
};
const PARRY_PERFECT = 300, PARRY_ARC = 1.15, RIPOSTE_MS = 1300, FEINT_COST = 10, CST_MAX = 400, CST_REGEN = 34;
const DODGE = { dist: 1.4, ms: 230, iframe: 280, cost: 18, cd: 650 }, KICK = { reach: 1.35, arc: 0.6, W: 240, stun: 1000, cost: 12, push: 1.8 };
// monstros com arma: golpes que usam, chance de bloquear e quanto a preparação é mais lenta (dá tempo de reagir)
const MON_MELEE = {
  goblin: { s: ['slashL', 'slashR', 'stab'], blk: 0.1, W: 1.2 }, orc: { s: ['over', 'slashL', 'slashR'], blk: 0.2, W: 1.35 }, skeleton: { s: ['slashL', 'slashR', 'over', 'stab'], blk: 0.15, W: 1.25 },
  bandit: { s: ['stab', 'slashL', 'slashR', 'under'], blk: 0.15, W: 1.1 }, deserter: { s: ['over', 'under', 'slashL', 'slashR', 'stab'], blk: 0.3, W: 1.15 },
  deserterchief: { s: ['over', 'under', 'slashL', 'slashR', 'stab'], blk: 0.4, W: 1.05 }, orcchief: { s: ['over', 'slashL', 'slashR', 'under'], blk: 0.3, W: 1.3 },
  cryptlord: { s: ['over', 'under', 'slashL', 'slashR', 'stab'], blk: 0.35, W: 1.15 }, troll: { s: ['over', 'slashL', 'slashR'], blk: 0, W: 1.55 },
};
// membros perdidos (bits) — decepados por golpe crítico cortante na direção certa
const LOST = { head: 1, armA: 2, armB: 4, legL: 8, legR: 16 };
const LOST_NAMES = { head: 'a cabeça', armA: 'o braço da arma', armB: 'o outro braço', legL: 'a perna esquerda', legR: 'a perna direita' };
const SEVER_FROM = { slashL: [['head', 0.35], ['armA', 0.35], ['armB', 0.3]], slashR: [['head', 0.35], ['armA', 0.35], ['armB', 0.3]], over: [['head', 0.25], ['armA', 0.4], ['armB', 0.35]], under: [['legL', 0.5], ['legR', 0.5]] };
// ===== sobrevivência (fase 4) e morte permanente (fase 5) =====
const SURV = { foodMin: 45, waterMin: 30, coldMin: 5, infectChance: 0.12 };   // minutos até esvaziar / esfriar
const PERMADEATH = false;   // desligada por enquanto: quem morre acorda no Templo (perde metade do XP da fase). Antes: morrer (sangrar até o fim, desistir, decapitação) apaga o personagem; cair da conexão nunca mata
const FOOD = { bread: 28, cookedmeat: 40, venison: 22, pork: 22, berries: 12, apple: 15, stew: 55, pie: 45 };
// receitas do fogão (meat = carne crua de cervo ou javali)
const RECIPES = {
  roast: { name: 'Carne Assada', need: { meat: 1 }, out: 'cookedmeat', desc: 'Assa a carne crua. Sem risco de enjoo.' },
  stew:  { name: 'Ensopado', need: { meat: 1, herb: 1 }, out: 'stew', desc: 'Carne com ervas: sacia muito, mata a sede e cura um pouco.' },
  pie:   { name: 'Torta de Frutas', need: { berries: 3, apple: 1 }, out: 'pie', desc: 'Doce e farta.' },
  bread: { name: 'Pão caseiro', need: { wheat: 2 }, out: 'bread', desc: 'Duas espigas de trigo viram um pão quentinho.' },
  tea:   { name: 'Chá de Ervas', need: { herb: 1 }, out: 'tea', desc: 'Mata a sede e baixa a febre.' },
};
const KNOCK_MS = 1700, PROSTH_PRICE = 30, RITUAL_PRICE = 120;
const STRIKE_PART = { head: ['head', 'head', 'torso', 'armA'], legs: ['legL', 'legR', 'legL', 'torso'], torso: ['torso', 'torso', 'armA', 'armB'] };
const BUFF_NAMES = { luck: 'Sorte do Dragão', tipsy: 'Tonto (cerveja)', breath: 'Elixir do Fôlego', warm: 'Elixir da Brasa', weaver: 'Bênção do Tecelão', warcry: 'Grito de Guerra', wall: 'Muralha de Ferro', agile: 'Passo Ágil', bless: 'Bênção da Aurora', mead: 'Hidromel', whet: 'Lâmina Afiada', rested: 'Bem descansado', medgroup: 'Meditação em grupo', sapling: 'Sob a muda: cura, mana, fôlego, casca protetora (-15% de dano) e bichos calmos' };
const BUFF_BITS = { wall: 16, agile: 32, bless: 64, warcry: 128 };

const need = l => Math.floor(20 * Math.pow(l, 1.75));
const maxHpFor = (cls, l) => Math.floor(CLASSES[cls].hp[0] + CLASSES[cls].hp[1] * (l - 1));
const maxMpFor = (cls, l) => Math.floor(CLASSES[cls].mp[0] + CLASSES[cls].mp[1] * (l - 1));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ============================================================
//  ÁRVORE DE TALENTOS — 1 ponto por nível; 3 ramos por vocação.
//  Cada ramo: 4 talentos passivos (até 3 pontos) + 1 habilidade (teclas 5, 6, 7).
//  Um nó só libera com pontos suficientes já gastos no ramo (TREE_REQ).
// ============================================================
const TREE_REQ = [0, 2, 4, 6, 8, 10];
const TREE = {
  knight: [
    { name: 'Lâmina', icon: '⚔', nodes: [
      { id: 'k_dmg', name: 'Fio Afiado', max: 3, eff: { dmg: 0.05 }, desc: '+5% de dano por ponto.' },
      { id: 'k_crit', name: 'Golpe Certeiro', max: 3, eff: { crit: 0.03 }, desc: '+3% de chance de crítico por ponto.' },
      { id: 'k_cdm', name: 'Brutalidade', max: 3, eff: { critDmg: 0.12 }, desc: '+12% de dano crítico por ponto.' },
      { id: 'k_aspd', name: 'Mão Ligeira', max: 3, eff: { aspd: 0.05 }, desc: 'Ataca 5% mais rápido por ponto.' },
      { id: 'charge', name: 'Investida', skill: true, max: 1, mp: 10, cd: 10000, desc: 'Avança 4 passos na direção do mouse e atropela o primeiro inimigo: 180% de dano e atordoa por 1s.' }] },
    { name: 'Bastião', icon: '🛡', nodes: [
      { id: 'k_hp', name: 'Couro Duro', max: 3, eff: { hp: 0.06 }, desc: '+6% de vida máxima por ponto.' },
      { id: 'k_arm', name: 'Placas Reforçadas', max: 3, eff: { armor: 0.04 }, desc: '-4% de dano recebido por ponto.' },
      { id: 'k_parry', name: 'Olho de Esgrimista', max: 3, eff: { parry: 60 }, desc: 'A janela da defesa perfeita fica 0,06s maior por ponto.' },
      { id: 'k_stand', name: 'Pés Firmes', max: 3, eff: { knockRes: 0.25 }, desc: '25% menos chance de ser derrubado por ponto.' },
      { id: 'taunt', name: 'Provocação Inabalável', skill: true, max: 1, mp: 12, cd: 18000, desc: 'Atrai os inimigos em 6 passos; por 5s você recebe 40% menos dano e não pode ser derrubado.' }] },
    { name: 'Comando', icon: '⚑', nodes: [
      { id: 'k_cst', name: 'Fôlego de Guerra', max: 3, eff: { cst: 0.1 }, desc: '+10% de fôlego de combate por ponto.' },
      { id: 'k_regen', name: 'Sangue Forte', max: 3, eff: { regen: 0.15 }, desc: '+15% de recuperação de vida por ponto.' },
      { id: 'k_stam', name: 'Marcha Longa', max: 3, eff: { stam: 0.1 }, desc: '+10% de estamina para correr por ponto.' },
      { id: 'k_mreg', name: 'Disciplina', max: 3, eff: { mregen: 0.15 }, desc: '+15% de recuperação de mana por ponto.' },
      { id: 'banner', name: 'Estandarte de Guerra', skill: true, max: 1, mp: 20, cd: 30000, desc: 'Finca um estandarte por 12s: aliados por perto causam +15% de dano e recuperam vida.' }] },
  ],
  archer: [
    { name: 'Precisão', icon: '◎', nodes: [
      { id: 'a_crit', name: 'Mira Firme', max: 3, eff: { crit: 0.03 }, desc: '+3% de chance de crítico por ponto.' },
      { id: 'a_cdm', name: 'Ponto Fraco', max: 3, eff: { critDmg: 0.12 }, desc: '+12% de dano crítico por ponto.' },
      { id: 'a_range', name: 'Olho de Falcão', max: 3, eff: { range: 0.5 }, desc: '+0,5 de alcance por ponto.' },
      { id: 'a_dmg', name: 'Pontas de Aço', max: 3, eff: { dmg: 0.04 }, desc: '+4% de dano por ponto.' },
      { id: 'headshot', name: 'Tiro na Cabeça', skill: true, max: 1, mp: 14, cd: 12000, desc: 'Mira por um instante e acerta o alvo na cabeça: 350% de dano, sempre crítico.' }] },
    { name: 'Caça', icon: '🐾', nodes: [
      { id: 'a_beast', name: 'Caçador', max: 3, eff: { beast: 0.08 }, desc: '+8% de dano em feras por ponto.' },
      { id: 'a_speed', name: 'Passo Leve', max: 3, eff: { speed: 0.03 }, desc: 'Anda 3% mais rápido por ponto.' },
      { id: 'a_stam', name: 'Resistência', max: 3, eff: { stam: 0.1 }, desc: '+10% de estamina para correr por ponto.' },
      { id: 'a_aspd', name: 'Puxada Rápida', max: 3, eff: { aspd: 0.05 }, desc: 'Atira 5% mais rápido por ponto.' },
      { id: 'trap', name: 'Armadilha', skill: true, max: 1, mp: 10, cd: 15000, desc: 'Arma uma armadilha de ferro aos seus pés (30s): o primeiro inimigo que pisar leva 150% de dano e fica preso por 3s.' }] },
    { name: 'Sombra', icon: '☾', nodes: [
      { id: 'a_dodge', name: 'Rolamento', max: 3, eff: { dodgeCost: 0.12 }, desc: 'A esquiva gasta 12% menos fôlego por ponto.' },
      { id: 'a_stealth', name: 'Furtividade', max: 3, eff: { stealth: 0.15 }, desc: 'Agachado, os inimigos percebem você 15% mais perto por ponto.' },
      { id: 'a_evade', name: 'Reflexos', max: 3, eff: { evade: 0.03 }, desc: '3% de chance por ponto de escapar de um golpe sem esquivar.' },
      { id: 'a_cst', name: 'Respiração Calma', max: 3, eff: { cst: 0.08 }, desc: '+8% de fôlego de combate por ponto.' },
      { id: 'smoke', name: 'Bomba de Fumaça', skill: true, max: 1, mp: 12, cd: 20000, desc: 'Nuvem de fumaça: os inimigos perdem você de vista por 4s e você anda mais rápido.' }] },
  ],
  mage: [   // Pentagrama: Luz (em cima), Água, Fogo, Terra, Ar — a magia base fica na ponta; os talentos e evoluções descem para o centro
    { name: 'Luz', icon: '☀', el: 'holy', base: 'faith', nodes: [
      { id: 'w_grace', name: 'Graça', max: 3, eff: { holy: 0.1 }, desc: '+10% de cura por ponto.' },
      { id: 'w_well', name: 'Poço de Mana', max: 3, eff: { mp: 0.06 }, desc: '+6% de mana máxima por ponto.' },
      { id: 'w_handlight', name: 'Mão de Luz', evo: 1, need: 25, max: 0, mp: 12, cd: 8000, desc: 'Um raio de luz desce do céu onde está o mouse (até 7 casas): cega e atordoa os bichos ali por 2,5 s, cura 20% da vida de um aliado e põe de pé quem está de joelhos.' },
      { id: 'w_prayer', name: 'Poço de Luz', evo: 1, need: 45, max: 0, mp: 20, cd: 25000, desc: 'Um círculo de luz dourada no chão por 10 s: quem está dentro (3 casas) recupera 3,5% da vida por segundo.' },
      { id: 'w_restore', name: 'Escudo de Prece', evo: 1, need: 70, max: 0, mp: 18, cd: 30000, desc: 'Uma oração: você e os aliados em 4 casas ganham por 12 s um escudo de luz que absorve dano igual a 25% da vida.' }] },
    { name: 'Água', icon: '💧', el: 'water', base: 'spring', nodes: [
      { id: 'w_medit', name: 'Meditação', max: 3, eff: { mregen: 0.15 }, desc: '+15% de recuperação de mana por ponto.' },
      { id: 'w_serene', name: 'Bênção Serena', max: 3, eff: { regen: 0.12 }, desc: '+12% de recuperação de vida por ponto.' },
      { id: 'w_mist', name: 'Névoa', evo: 1, need: 25, max: 0, mp: 14, cd: 22000, desc: 'Uma nuvem fresca de 3 casas em volta de você por 10 s: os bichos perdem de vista quem está dentro (só enxergam quem encosta neles) e o fogo de quem entra se apaga.' },
      { id: 'w_tide', name: 'Correnteza', evo: 1, need: 45, max: 0, mp: 18, cd: 12000, desc: 'Uma onda de 6 casas na direção do mouse: arrasta os inimigos para longe, molha e derruba os menores, apaga o fogo do mato e de quem estiver no caminho.' },
      { id: 'w_frost', name: 'Gelo Eterno', evo: 1, need: 70, max: 0, mp: 24, cd: 28000, desc: 'A água congela onde está o mouse (até 7 casas): os inimigos em 2,5 casas ficam presos num bloco de gelo por 4 s (os grandes, 2 s) e levam dano do frio.' }] },
    { name: 'Fogo', icon: '🔥', el: 'fire', base: 'ember', nodes: [
      { id: 'w_flame', name: 'Chama Viva', max: 3, eff: { fire: 0.08 }, desc: '+8% de dano de fogo por ponto.' },
      { id: 'w_focus', name: 'Foco Arcano', max: 3, eff: { dmg: 0.04 }, desc: '+4% de dano por ponto.' },
      { id: 'w_sparks', name: 'Faíscas', evo: 1, need: 25, max: 0, mp: 10, cd: 5000, desc: 'Um leque de 5 faíscas na direção do mouse (até 7 casas): cada uma acerta o primeiro inimigo no caminho e o deixa ardendo; as que erram podem pôr fogo no mato.' },
      { id: 'w_fireball', name: 'Bola de Fogo Maior', evo: 1, need: 45, max: 0, mp: 28, cd: 16000, desc: 'Uma bola de fogo enorme e lenta voa até o mouse (até 9 casas) e explode em 3,5 casas: muito dano, derruba os menores e deixa o chão queimando por 6 s.' },
      { id: 'w_meteor', name: 'Chuva de Meteoros', evo: 1, need: 70, max: 0, mp: 36, cd: 32000, desc: 'Pedras em chamas caem do céu por 3 s numa área de 3,5 casas onde está o mouse (até 9 casas): cada uma explode e queima quem estiver perto.' }] },
    { name: 'Terra', icon: '🌿', el: 'earth', base: 'bloom', nodes: [
      { id: 'w_roots', name: 'Raízes Fundas', max: 3, eff: { hp: 0.05 }, desc: '+5% de vida máxima por ponto.' },
      { id: 'w_bark', name: 'Casca de Carvalho', max: 3, eff: { armor: 0.03 }, desc: '-3% de dano recebido por ponto.' },
      { id: 'w_stone', name: 'Pele de Pedra', evo: 1, need: 25, max: 0, mp: 14, cd: 22000, desc: 'A pele vira rocha por 8 s: você recebe 45% menos dano e nada empurra você, mas anda 15% mais devagar.' },
      { id: 'w_thorns', name: 'Espinheiro', evo: 1, need: 45, max: 0, mp: 18, cd: 12000, desc: 'Uma linha de espinhos rasga o chão até o mouse (7 casas), como uma onda: fere, prende por 2,5 s e faz sangrar quem estiver no caminho, e volta para a terra logo depois.' },
      { id: 'w_quake', name: 'Tremor', evo: 1, need: 70, max: 0, mp: 30, cd: 28000, desc: 'Você bate o cajado no chão e a terra treme em 4,5 casas em volta: dano em todos os inimigos, os menores caem e ficam tontos por 2 s (os grandes, 1 s), e o chão racha.' }] },
    { name: 'Ar', icon: '🌬', el: 'wind', base: 'windstep', nodes: [
      { id: 'w_feather', name: 'Pés de Pluma', max: 3, eff: { speed: 0.04 }, desc: 'Anda 4% mais rápido por ponto.' },
      { id: 'w_eye', name: 'Olho do Vento', max: 3, eff: { crit: 0.02 }, desc: '+2% de chance de crítico por ponto.' },
      { id: 'w_gust', name: 'Rajada', evo: 1, need: 25, max: 0, mp: 10, cd: 6000, desc: 'Um sopro forte em leque na direção do mouse (4 casas): empurra os inimigos para longe e derruba os menores por 1,5 s.' },
      { id: 'w_shield', name: 'Escudo de Vento', evo: 1, need: 45, max: 0, mp: 14, cd: 20000, desc: 'Um redemoinho em volta de você por 8 s: desvia as flechas, você recebe 30% menos dano e quem ataca de perto é jogado para trás.' },
      { id: 'w_glide', name: 'Voo da Pluma', evo: 1, need: 70, max: 0, mp: 16, cd: 12000, desc: 'Salta alto e plana até 6 casas na direção do mouse, por cima de muros, cercas e rios. Nada te acerta no ar.' }] },
  ],
};
const treePts = p => { let n = 0; for (const k in p.tree || {}) n += p.tree[k] | 0; return n; };
const branchPts = (p, b) => b.nodes.reduce((s, nd) => s + ((p.tree && p.tree[nd.id]) | 0), 0);
const treeHas = (p, id) => !!(p.tree && p.tree[id]);
function treeEff(p, key) { const T = TREE[p.cls]; if (!T || !p.tree) return 0; let v = 0; for (const b of T) for (const nd of b.nodes) if (nd.eff && nd.eff[key] && p.tree[nd.id]) v += nd.eff[key] * p.tree[nd.id]; return v; }
// valida uma árvore vinda de fora (save): nós da vocação, limite por nó, requisito do ramo e total de pontos
function cleanTree(cls, lvl, t) {
  const out = {}, T = TREE[cls]; if (!T || !t || typeof t !== 'object') return out;
  for (const b of T) b.nodes.forEach((nd, i) => { const r = clamp(t[nd.id] | 0, 0, nd.max); if (!r) return; if (branchPts({ tree: out }, b) < TREE_REQ[i]) return; out[nd.id] = r; });
  if (cls === 'mage') for (const C of MAGE_COMBOS) if (t[C.id]) out[C.id] = 1;   /* combinadas aprendidas (1 ponto cada) */
  return treePts({ tree: out }) <= Math.max(0, lvl - 1) ? out : {};
}

// ============================================================
//  PROGRESSÃO POR USO — cada habilidade vai de 0 a 100 conforme é usada
//  (sobe rápido no começo e devagar no fim). No 100: +15% no que ela melhora.
// ============================================================
const USE = {
  sword:  { name: 'Espada', cat: 'Armas', K: 450, desc: 'Golpes de espada: mais dano corpo a corpo.' },
  halberd: { name: 'Alabarda', cat: 'Armas', K: 450, desc: 'Golpes de alabarda: mais dano com a arma longa.' },
  dagger: { name: 'Adaga', cat: 'Armas', K: 450, desc: 'Golpes de adaga: mais dano corpo a corpo.' },
  staff:  { name: 'Cajado', cat: 'Armas', K: 450, desc: 'Golpes de cajado: mais dano corpo a corpo.' },
  bow:    { name: 'Arco', cat: 'Armas', K: 500, desc: 'Flechas disparadas: mais dano à distância.' },
  magic:  { name: 'Magia', cat: 'Armas', K: 500, desc: 'Feitiços lançados: mais dano das magias.' },
  el_fire:  { name: 'Fogo', cat: 'Magias', K: 300, desc: 'Chamas: mais alcance e mais dano do fogo.' },
  el_wind:  { name: 'Ar', cat: 'Magias', K: 300, desc: 'Passo do Vento: vai mais longe.' },
  el_earth: { name: 'Terra', cat: 'Magias', K: 300, desc: 'Florescer: mais flores e curam mais.' },
  el_holy:  { name: 'Luz', cat: 'Magias', K: 300, desc: 'Fé Inabalável: cura mais.' },
  el_water: { name: 'Água', cat: 'Magias', K: 300, desc: 'Fonte: alcança mais longe.' },
  fist:   { name: 'Punhos', cat: 'Armas', K: 400, desc: 'Socos e chutes (no dojô, no makiwara): mais dano de mão nua.' },
  parry:  { name: 'Aparar', cat: 'Defesa', K: 160, desc: 'Defesas bem-sucedidas: janela perfeita maior e menos fôlego gasto ao bloquear.' },
  dodge:  { name: 'Esquiva', cat: 'Defesa', K: 160, desc: 'Esquivas: gastam menos fôlego.' },
  vigor:  { name: 'Vigor', cat: 'Defesa', K: 700, desc: 'Apanhar endurece: mais vida máxima.' },
  run:    { name: 'Corrida', cat: 'Atletismo', K: 2500, desc: 'Distância corrida: mais estamina e um pouco mais de velocidade.' },
  breath: { name: 'Fôlego', cat: 'Atletismo', K: 900, desc: 'Fôlego gasto em combate: ele volta mais rápido.' },
  skin:   { name: 'Coleta', cat: 'Sobrevivência', K: 120, desc: 'Esfolar, revistar e colher: chance de achar mais e mais ouro.' },
  cook:   { name: 'Cozinha', cat: 'Sobrevivência', K: 60, desc: 'Cozinhar: a comida sacia mais.' },
  aid:    { name: 'Socorro', cat: 'Sobrevivência', K: 60, desc: 'Poções, bandagens e ervas: curam mais.' },
};
const USE_MAX_BONUS = 0.15;
// golpes de mão nua ensinados pelo sensei do Dojô do Punho de Ferro (qualquer vocação, com a arma guardada)
const SENSEI_MOVES = {
  combo: { n: 'Soco em sequência', p: 40, req: 0, d: 'Três socos rápidos seguidos: o terceiro sai mais forte e atordoa.' },
  sweep: { n: 'Rasteira', p: 60, req: 15, d: 'Esquiva (C) colado no oponente: um chute baixo que derruba.' },
  kamae: { n: 'Postura de defesa', p: 80, req: 30, d: 'Segurando o botão direito de mãos nuas: defesa perfeita mais fácil e um contragolpe quando acerta o tempo.' },
  throw: { n: 'Arremesso de quadril', p: 120, req: 45, d: 'Segurando o oponente (agarrão), aperte F: joga ele no chão por cima do quadril. No duelo basta estar colado nele.' },
};
const hasMove = (p, k) => !!(p && p.feats && p.feats.mv && p.feats.mv[k]);
const useLvl = (p, k) => Math.floor(100 * (1 - Math.exp(-((p.use && p.use[k]) || 0) / USE[k].K)));
const useBonus = (p, k) => useLvl(p, k) / 100 * USE_MAX_BONUS;
const meleeUseOf = p => p.cls === 'knight' && p.wpn === 'halberd' ? 'halberd' : MELEE_USE[p.cls];   /* a alabarda tem a sua própria perícia */
const MELEE_USE = { knight: 'sword', archer: 'dagger', mage: 'staff' }, RANGED_USE = { knight: 'sword', archer: 'bow', mage: 'magic' };
const maxHpOf = p => Math.floor(maxHpFor(p.cls, p.lvl) * (1 + treeEff(p, 'hp') + useBonus(p, 'vigor')));
// varinhas: o mago usa sozinho a melhor que carregar
const WANDS = { wand_arcane: { dmg: 0.3, mp: 35 }, wand_fine: { dmg: 0.2, mp: 20 }, wand: { dmg: 0.1, mp: 10 } };
const wandOf = p => p && p.cls === 'mage' && p.inv ? Object.keys(WANDS).find(k => p.inv[k] > 0) || null : null;
// entalhe à mão (precisa de um machado como faca)
const CARVE = {
  wand: { need: { log: 2 }, lv: 1, desc: 'Duas toras de pinho viram uma varinha simples.' },
  wand_fine: { need: { hardwood: 1, log: 1 }, lv: 3, desc: 'Madeira nobre: varinha melhor.' },
  wand_arcane: { need: { hardwood: 1, gem: 1 }, lv: 5, desc: 'Carvalho com uma gema na ponta: a melhor.' },
};
// reputação por grupo (-100 a 100), presentes que cada grupo gosta, títulos e vantagens
const REP_G = { cidade: 'Moradores da cidade', vila: 'Vila do Oeste', nobres: 'Nobreza', guarda: 'Guarda', comerc: 'Comerciantes' };
const REP_LIKES = { guarda: ['bread', 'cookedmeat', 'stew', 'venison'], nobres: ['wand', 'wand_fine', 'wand_arcane', 'gem', 'pie'], comerc: ['map', 'herb', 'gem', 'flaxraw'], vila: ['bread', 'apple', 'berries', 'stew'], cidade: ['pie', 'apple', 'bread', 'tea'],
  smith: ['ore', 'gem', 'hardwood'], innkeeper: ['venison', 'pork', 'berries'], fruit: ['apple', 'berries', 'herb'], priest: ['herb', 'tea', 'bread'], broker: ['map', 'gem'], tailor: ['flaxraw', 'gem'], st_witch: ['herb', 'silverleaf', 'gem'] };
const REP_TITLES = [[90, 'Herói de Nae'], [75, 'Honrado'], [60, 'Respeitado'], [45, 'Cidadão'], [30, 'Suspeito'], [15, 'Mal-visto'], [0, 'Odiado']];
const repTitle = r => (REP_TITLES.find(([m]) => r >= m) || REP_TITLES[REP_TITLES.length - 1])[1];
const REP_PERKS = [[30, 'abaixo de 30: tudo 15% mais caro e as sentinelas ficam de olho'], [60, 'Respeitado: 5% de desconto nas compras'], [75, 'Honrado: 10% de desconto, imóveis 10% mais baratos e as sentinelas dão um aviso a mais'], [90, 'Herói de Nae: 15% de desconto e metade da pena na cadeia']];
const repPriceMul = r => r >= 90 ? 0.85 : r >= 75 ? 0.9 : r >= 60 ? 0.95 : r < 30 ? 1.15 : 1;
const wandBonus = p => { const k = wandOf(p), I = p && p.wandInfo; return k && I && I.k === k ? I : null; };   // madeira e núcleo da varinha que está na mão
const maxMpOf = p => Math.floor(maxMpFor(p.cls, p.lvl) * (1 + treeEff(p, 'mp'))) + (wandOf(p) ? WANDS[wandOf(p)].mp + ((wandBonus(p) || {}).mp || 0) : 0);
// estamina única (corrida + combate): 400 + 5 por nível, mais os talentos e o uso de "Corrida"
const cstMaxOf = p => Math.round((CST_MAX + 5 * Math.max(0, (p.lvl || 1) - 1)) * (1 + treeEff(p, 'cst') + treeEff(p, 'stam') + (p.use ? useBonus(p, 'run') : 0)));

// arco: tempo de puxar, pegar flecha, soltar; segurar no máximo cansa e treme; velocidades em tiles/s
const BOW = { draw: 1000, nock: 800, loose: 350, holdSway: 2000, holdDrain: 16, maxRange: 18, vMin: 5, vMax: 13, g: 9.8 };
