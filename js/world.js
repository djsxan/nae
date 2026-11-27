// ============================================================
//  MUNDO — mapa gerado por código (igual para todos: usa sempre a
//  mesma semente). Tem 2 andares: 0 = chão, 1 = muralhas/torres.
// ============================================================
const TEST3D = typeof window !== 'undefined' && !!window.TEST3D;   // bairro de teste em 3D
const MAP_W = TEST3D ? 80 : 256, MAP_H = TEST3D ? 80 : 256, CENTER = TEST3D ? 40 : 128, SAFE_R = 38;
const C = CENTER;

const T = { WATER: 0, SAND: 1, GRASS: 2, FOREST: 3, STONE: 4, DIRT: 5, BRIDGE: 6, COBBLE: 7, SWAMP: 8, DEAD: 9, SHALLOW: 10, CLIFF: 11, FLOORSTONE: 12 };
const O = {
  NONE: 0, TREE: 1, PINE: 2, ROCK: 3, BUSH: 4, FLOWER: 5, FOUNTAIN: 6, LAMP: 7, TALLGRASS: 8, MUSHROOM: 9,
  REEDS: 10, LILY: 11, STUMP: 12, DEADTREE: 13, GRAVE: 14, BONES: 15, TENT: 16, CAMPFIRE: 17, FENCE: 18,
  TORCH: 19, BARREL: 20, CRATE: 21, HAY: 22, WELL: 23, STALL: 24, BENCH: 25, BANNER: 26, LOG: 27,
  FLOWERBED: 28, SPIKES: 29, WALL: 30, TOWER: 31, PART: 32, GATE: 33, STAIRS: 34, RUBBLE: 35, RUBBLEBIG: 36,
  STATUE: 37, BRAZIER: 38, DUMMY: 39, WATERFALL: 40, LOWWALL: 41, IVY: 42, ANVIL: 43, WEAPONRACK: 44, CART: 45, TABLE: 46, CAVE: 47, HOARD: 48, ARMORPILE: 49, RUINTOWER: 50, OAK: 51, BIRCH: 52, WILLOW: 53, FERN: 54, ROOTS: 55, SHROOMS: 56, BERRY: 57, HERB: 58, WHEAT: 67, WHEATSPROUT: 68, BOULDER: 59, GUILLOTINE: 60, STOOL: 61, STAGEFLOOR: 62, VITRINE: 63, FRUITCRATE: 64, WATERWHEEL: 65, NOTICEBOARD: 66,
};
O.SCAFFOLD = 69;   /* andaime das obras do lote */
const BLOCKING = new Set([O.SCAFFOLD, O.TREE, O.PINE, O.ROCK, O.FOUNTAIN, O.STUMP, O.DEADTREE, O.GRAVE, O.TENT,
  O.CAMPFIRE, O.FENCE, O.BARREL, O.CRATE, O.HAY, O.WELL, O.STALL, O.LOG, O.SPIKES,
  O.WALL, O.TOWER, O.PART, O.RUBBLEBIG, O.CAVE, O.HOARD, O.RUINTOWER, O.OAK, O.BIRCH, O.WILLOW, O.BOULDER, O.GUILLOTINE, O.STOOL, O.VITRINE, O.FRUITCRATE, O.WATERWHEEL, O.NOTICEBOARD, O.STATUE, O.BRAZIER, O.DUMMY, O.WATERFALL, O.LOWWALL, O.ANVIL, O.WEAPONRACK, O.CART, O.TABLE]);
// objetos soltos que dá para pegar e arremessar (dano base)
const THROWABLE = { [O.BARREL]: 18, [O.CRATE]: 20, [O.ROCK]: 26 };
// objetos rasteiros (vão direto para o chão pré-desenhado)
const FLAT = new Set([O.FLOWER, O.LILY, O.FLOWERBED, O.BONES, O.RUBBLE, O.IVY, O.STAGEFLOOR]);
const BEDS = [];
const KITCHENS = [];
const CHESTS = [];   // baús dentro das casas: { x, y, bi } (baú seguro de quem aluga)
const HOTEL_CABS = [];   // cabines da pousada: { k, bi, bedIdx, chest:{x,y}, door:[x,y], di, spot:[x,y], tiles:Set }
const APTS = [], APT_CHESTS = [], SUITE_OPEN = true;
/* Torre do Inventor (a antiga Casa Lorvan, Prancheta 24/11): 6 níveis com elevador redondo no meio; o 4º é o apartamento de luxo alugável */
const TOWER_FLOORS = ['Loja de invenções', 'Oficina das encomendas', 'Laboratório', 'Casa do Sxan', 'Apartamento de luxo', 'Observatório'], TOWER_APT_FL = 4, TOWER_APT = 'T501';
const isLiftK = k => k === 'lift' || k === 'clift';
/* editor de interiores: plantas editadas (INT_EDITS em js/interiores.js, carregado antes deste arquivo). Chave = índice do prédio; só vale se o nome bate */
const INT_E = typeof INT_EDITS !== 'undefined' && INT_EDITS ? INT_EDITS : {};
function intEditB(b) { if (!b || typeof BUILDINGS === 'undefined' || !Object.keys(INT_E).length) return null; if (BUILDINGS.length && BUILDINGS[BUILDINGS.length - 1].dbi !== BUILDINGS.length - 1) BUILDINGS.forEach((q, i) => { q.dbi = i; });
  let bi = b.dbi; if (bi == null || !BUILDINGS[bi] || BUILDINGS[bi].name !== b.name) bi = BUILDINGS.indexOf(b);   /* o desenho do interior recebe uma cópia do prédio, que carrega o índice (dbi) */
  const E = INT_E[bi]; return E && E.name === b.name ? E : null; }
function intEdit(b, fl) { const E = intEditB(b); return E && E.fls && E.fls[fl] || null; }
function intHasThin(b) { const E = intEditB(b); return !!E && !!E.fls && Object.values(E.fls).some(q => q.thin && q.thin.length); }
const vecDir8 = (dx, dy) => { const sx = dx - dy, sy = (dx + dy) * 0.5; return ((Math.round(Math.atan2(sx, sy) / (Math.PI / 4)) % 8) + 8) % 8; };   // apartamentos do prédio do dojô (a suíte fica destrancada por enquanto, para testar o ofurô)
function aptAt(bi, fl, x, y) { if (!fl) return null; const b = BUILDINGS[bi]; if (!b) return null; const [u, v] = worldToLocal(b, x, y); return APTS.find(a => a.bi === bi && a.fl === fl && u > a.u0 && u < a.u1 && v > a.v0 && v < a.v1) || null; }
function aptBlocked(name, bi, fl, ox, oy, x, y, L) {   /* entrar num apartamento trancado (de fora para dentro) */
  const A = aptAt(bi, fl, x, y); if (!A || (A.suite && SUITE_OPEN) || !L) return false; if (aptAt(bi, fl, ox, oy) === A) return false;
  const a = L['apt:' + A.key]; return !!a && !a.includes(String(name || '').trim().toLowerCase()); }
const DUMMIES = [];   // bonecos de treino: { x, y, bi, t: 'makiwara' | 'mokujin', fx, fy } (fx/fy: onde fica quem treina)
const DOJO_FEE = [3, 5, 8];   // diária: barata, justa, cara
const HOTEL_DOORS = new Map();   // índice do tile da porta → cabine
const JAILCELLS = [];   // celas da cadeia: { door:[x,y], spot:[x,y], tiles:Set(índice), bi }   // fogões (casas e taverna): { x, y, bi }
const FRUIT_STOOL = { x: -1, y: -1 };
const NOTICE = { x: -1, y: -1 };
// ---------- ofícios e coleta ----------
const PROFS = { lenhador: 'Lenhador', minerador: 'Minerador', herbalista: 'Herbalista', artesao: 'Artesão', comerciante: 'Comerciante', mensageiro: 'Mensageiro', biscateiro: 'Biscateiro' };
const profLv = xp => Math.min(10, 1 + Math.floor(Math.sqrt((xp || 0) / 25)));
// o que cada coisa do mapa dá: ferramenta, ofício, item, nível mínimo, chance de raro
const GATHER = {};
for (const o of ['TREE', 'PINE', 'BIRCH', 'WILLOW']) GATHER[o] = { tool: 'axe', prof: 'lenhador', item: 'log', min: 1, rare: 'hardwood', rp: 0.04, verb: 'cortar lenha' };
GATHER.OAK = { tool: 'axe', prof: 'lenhador', item: 'hardwood', min: 3, rare: 'hardwood', rp: 0.25, verb: 'cortar carvalho' };
GATHER.ROCK = { tool: 'pickaxe', prof: 'minerador', item: 'ore', min: 1, rare: 'gem', rp: 0.04, verb: 'quebrar pedra' };
GATHER.BOULDER = { tool: 'pickaxe', prof: 'minerador', item: 'ore', min: 3, rare: 'gem', rp: 0.14, verb: 'quebrar rocha' };
GATHER.TALLGRASS = { tool: 'sickle', prof: 'herbalista', item: 'flaxraw', min: 1, rare: 'silverleaf', rp: 0.04, verb: 'colher linho' };
GATHER.WHEAT = { tool: 'sickle', prof: 'herbalista', item: 'wheat', min: 1, rare: 'wheat', rp: 0.25, verb: 'ceifar o trigo' };
GATHER.FERN = { tool: 'sickle', prof: 'herbalista', item: 'flaxraw', min: 2, rare: 'silverleaf', rp: 0.1, verb: 'colher plantas' };
const gatherOf = o => { for (const k in GATHER) if (O[k] === o) return GATHER[k]; return null; };
const STAGE = { x: -1, y: -1 };   // cadafalso da guilhotina (centro do tablado 3x3)   // camas do térreo (onde dá para deitar e dormir): { x, y, dx, dy (travesseiro -> pés), bi }
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

const Z = { VILLAGE: 0, FIELDS: 1, FOREST: 2, SWAMP: 3, BONES: 4, ORCS: 5, WILD: 6, OUTSKIRTS: 7 };
const ZONES = [
  { name: 'Cidadela de Nae', stars: 0, mons: [] },
  { name: 'Campos de Nae', stars: 1, mons: ['rat', 'deer', 'deer', 'boar'] },
  { name: 'Bosque Sombrio', stars: 2, mons: ['wolf', 'wolf', 'spider', 'deer', 'boar'] },
  { name: 'Pântano Pútrido', stars: 2, mons: ['toad', 'toad', 'rat'] },
  { name: 'Colinas de Ossos', stars: 3, mons: ['spider', 'rat', 'wolf'] },
  { name: 'Terras do Oeste', stars: 3, mons: ['boar', 'wolf', 'deer'] },
  { name: 'Terras Selvagens', stars: 4, mons: ['wolf', 'boar', 'deer', 'spider'] },
  { name: 'Arredores de Nae', stars: 0, mons: [] },
];

function hash2(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(x - xi), v = smooth(y - yi);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) {
  let total = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < 4; i++) { total += vnoise(x * freq, y * freq, s + i * 17) * amp; norm += amp; amp *= 0.5; freq *= 2; }
  return total / norm;
}

function zoneOf(x, y) {
  const dx = x - CENTER, dy = y - CENTER;
  if (Math.max(Math.abs(dx - 0.5), Math.abs(dy - 0.5)) <= SAFE_R + 1.5) return Z.VILLAGE;
  if (!TEST3D && dx > 0 && dx - 0.5 <= SAFE_R + 1.5 + EAST_EXT && Math.abs(dy - 0.5) <= SAFE_R + 1.5) return Z.VILLAGE;   /* bairro das Casas Nobres */
  if (!TEST3D && dy > 0 && dy - 0.5 <= SAFE_R + 1.5 + SOUTH_EXT && dx >= -(SAFE_R + 1.5) && dx - 0.5 <= SAFE_R + 1.5 + EAST_EXT) return Z.VILLAGE;   /* faixa sul nova (Prancheta 25/11, 16h) */
  if (!TEST3D && dy < 0 && dy >= -(SAFE_R + 1.5 + NORTH_EXT) && dx >= -(SAFE_R + 1.5) && dx - 0.5 <= SAFE_R + 1.5 + EAST_EXT) return Z.VILLAGE;   /* faixa norte nova (Prancheta 25/11) */
  const d = Math.hypot(dx, dy) + (vnoise(x / 12, y / 12, 55) - 0.5) * 10;
  if (d < 62) return Z.OUTSKIRTS;
  if (d < 82) return Z.FIELDS;
  if (d > 106) return Z.WILD;
  const sx = dx - dy, sy = dx + dy;
  const a = Math.atan2(sy, sx) + (vnoise(x / 16, y / 16, 77) - 0.5) * 0.6;
  const q = Math.PI / 4;
  if (a >= -3 * q && a < -q) return Z.FOREST;
  if (a >= -q && a < q) return Z.SWAMP;
  if (a >= q && a < 3 * q) return Z.BONES;
  return Z.ORCS;
}

// ---------- cidade de Nae (coordenadas relativas ao centro) ----------
const NORTH_EXT = 12;   /* a muralha norte avançou mais 12 casas (Prancheta 25/11) */
const SOUTH_EXT = 4;   /* a muralha sul desceu 4 casas (Prancheta 25/11, 16h) */
const CASTLE = { x0: C - 36, y0: C - 36 - NORTH_EXT, x1: C + 37, y1: C + 37 + SOUTH_EXT };   /* muralha maior (Prancheta 24/11 e 25/11) */
const CASTLE_OLD = { x0: C - 32, y0: C - 32, x1: C + 33, y1: C + 33 };   /* contorno antigo: o sorteio das casas e a vila do oeste continuam usando, para os prédios não mudarem */   // muralha externa (o sorteio da cidade usa este contorno)
const EAST_EXT = 44, CITY_X1 = CASTLE.x1 + EAST_EXT;   // a muralha leste avançou 16 casas (Casas Nobres) e mais 15 (rua nova: Clube, Termas e Casa de Veludo)
const BANNER_HOUSE = {};   /* estandarte de casa: índice do tile -> casa */
const HOUSE_SEATS = [   /* sedes das casas rivais: casarões com jardim murado, de frente para a rua do bairro */
  { id: 'valcarne', name: 'Casa Valcarne', y: -28 }, { id: 'draemor', name: 'Casa Draemor', y: -18 }, { id: 'moranthe', name: 'Casa Moranthe', y: -10 },
  { id: 'thornvale', name: 'Casa Thornvale', y: 8 }, { id: 'solmire', name: 'Casa Solmire', y: 18 }];
/* replanejamento da cidade (Prancheta, 23/11): [prédio, x, y relativos ao centro, largura, profundidade, porta, coluna da porta] */
const CITY_RELAYOUT = [[0, 43, 7, 13, 13, 'S', 6], [3, -15, 10, 9, 7, 'E', 3], [4, 12, 7, 8, 6, 'E', 3], [5, -15, 25, 10, 5, 'S', 5], [7, -22, -8, 5, 5, 'S', 2], [8, -22, 10, 5, 4, 'E', 2], [11, -29, -45, 11, 20, 'S', 5], [12, 12, 14, 8, 5, 'S', 4], [13, -16, -8, 4, 12, 'S', 2], [14, -29, 16, 5, 4, 'S', 2], [15, 70, -34, 8, 8, 'S', 3], [16, 26, -21, 9, 15, 'E', 8], [17, 23, 26, 6, 5, 'S', 3], [18, 13, -19, 7, 10, 'E', 5], [20, -21, -14, 5, 4, 'S', 2], [21, 37, 26, 4, 5, 'S', 2], [22, 32, 26, 4, 5, 'S', 1], [23, 7, -45, 11, 9, 'S', 5], [24, 7, 22, 7, 6, 'S', 3], [25, 42, 26, 4, 5, 'S', 1], [35, -29, 22, 9, 9, 'E', 4], [37, 13, -32, 8, 8, 'E', 3], [38, 13, -5, 7, 7, 'S', 3], [39, 26, -5, 9, 7, 'S', 4], [42, -13, 19, 5, 4, 'E', 2], [45, 21, -45, 11, 9, 'S', 5], [46, 60, 25, 12, 9, 'S', 6], [47, 65, 10, 13, 8, 'S', 6], [48, 35, -45, 10, 9, 'S', 4], [49, 26, 7, 9, 12, 'S', 3], [50, 50, -45, 19, 9, 'S', 3], [51, 43, -21, 13, 20, 'S', 6], [52, 65, -21, 13, 11, 'S', 6], [53, 16, 22, 4, 6, 'S', 1]];
const CITY_LOTS = [16];   /* a Casa Aldren virou o lote vazio do bairro nobre */
const KEEP = { x0: C - 13, y0: C - 30, x1: C + 11, y1: C - 3, by: C - 12, yx0: C - 11, yx1: C + 9 };   // castelo: corpo ao norte (até by) e pátio mais estreito ao sul (yx0..yx1)
const KEEP_OLD = { x0: C - 9, y0: C - 22, x1: C + 10, y1: C - 3 };   // contorno antigo: só para o sorteio das casas continuar igual
const inKeep = (x, y) => y >= KEEP.y0 && y <= KEEP.y1 && (y <= KEEP.by ? x >= KEEP.x0 && x <= KEEP.x1 : x >= KEEP.yx0 && x <= KEEP.yx1);       // castelo central
const WALL_UNITS = 176 / (32 * Math.SQRT2 * Math.cos(Math.PI / 6));   // altura da muralha em tiles
const BH = (kind, w, h, H, RH, name, extra) => ({ kind, w, h, H, RH, floors: Math.max(1, Math.min(3, Math.round(H / 1.75))), name: name || '', wall: Math.round(H * 19.6), roof: Math.round(RH * 19.6), ...extra });
const BUILDINGS = TEST3D ? [] : [
  { x: C + 9, y: C + 8, ...BH('temple', 8, 9, 4.4, 1.6, 'Catedral da Aurora', { floors: 1, door: 'S', gen: { x: C - 21, y: C - 30, w: 8, h: 9, door: 'W' } }) },   // ao lado da praça do mercado, porta para o sul
  { x: C - 30, y: C - 1, ...BH('shop', 5, 5, 4.0, 2.8, 'Empório do Borin') },
  { x: C - 22, y: C - 1, ...BH('smith', 5, 5, 2.6, 2.6, 'Forja de Hrodgar') },
  { x: C - 15, y: C + 10, ...BH('tavern', 6, 7, 3.6, 3.0, 'Ronco do Dragão', { door: 'E', floors: 2 }) },   // taverna: térreo e mezanino   // de frente para a praça do mercado (só térreo)
  { x: C - 19, y: C + 24, ...BH('barracks', 8, 5, 4.0, 2.6, 'Quartel da Guarda', { door: 'E', gen: { x: C + 5, y: C + 22, w: 8, h: 5, door: 'S' } }) },   // no antigo lugar da pousada, porta para o leste
  { x: C - 7, y: C + 22, ...BH('stable', 5, 4, 2.6, 2.4, 'Estábulo', { floors: 1, gen: { x: C - 28, y: C + 24, w: 5, h: 4, door: 'S' } }) },   // no antigo lugar do quartel, junto ao portão sul
  { x: C - 29, y: C + 10, ...BH('shop', 5, 5, 2.5, 1.5, 'Boticário de Elva', { v: 1, door: 'N', floors: 1, deco: 'greenhouse' }) },   // pavilhão-estufa de vidro e ferro
  { x: C - 22, y: C - 8, ...BH('shop', 5, 5, 3.8, 2.4, 'Arcanos & Varinhas', { v: 2, door: 'W', floors: 1, deco: 'arcane' }) },   // alta, estreita e antiga
  { x: C - 22, y: C + 10, ...BH('shop', 5, 4, 3.2, 2.0, 'Alfaiataria Real', { v: 3, door: 'N', floors: 1, deco: 'tailor', gen: { x: C - 22, y: C + 10, w: 5, h: 5, door: 'N' } }) },   // uma linha mais curta: corredor até a loja de elixir   // roxo-ameixa e dourado
  { x: C - 30, y: C - 6, ...BH('shop', 5, 4, 3.6, 2.6, 'Pergaminhos & Mapas', { v: 4, door: 'E' }) },   // 5×4: desceu 2 casas para o Dojô do Punho de Ferro crescer
  { x: C - 10, y: C - 28, ...BH('castle', 20, 17, 16, 7, 'Castelo de Nae', { floors: 5, stairs: { 0: 'grand', 1: 'grand', 2: 'grand', 3: 'grand' }, gen: { x: C - 7, y: C - 20, w: 16, h: 9, door: 'S' } }) },   // torre de menagem: salão do trono no meio, corredor oeste (subsolos) e escadaria em vaivém a leste
  { x: C - 27, y: C - 30, ...BH('bank', 8, 12, 5.6, 2.4, 'Banco de Nae', { floors: 2, door: 'S', gen: { x: C - 31, y: C - 23, w: 6, h: 12, door: 'S' } }) },   // no fim da rua oeste, porta para o sul
  { x: C + 22, y: C + 20, ...BH('jail', 6, 8, 3.2, 2.4, 'Cadeia de Nae', { floors: 1, door: 'W' }) },
  { x: C - 16, y: C, ...BH('boutique', 5, 4, 4.2, 3.0, 'Ateliê Real de Nae', { floors: 1, door: 'S' }) },
  { x: C - 29, y: C + 17, ...BH('fruithouse', 5, 4, 2.9, 2.6, '', { floors: 1, door: 'S', gen: { x: C - 13, y: C + 18, w: 5, h: 4, door: 'E' } }) },   // atrás do Boticário, porta para a rua de baixo
  // bairro nobre (à direita do castelo): casarões de pedra clara com jardins murados
  { x: C + 26, y: C - 21, ...BH('manor', 6, 6, 4.8, 3.2, 'Casa Valmont', { door: 'W', gen: { x: C + 24, y: C - 18, w: 6, h: 6, door: 'W' } }) },
  { x: C + 26, y: C - 13, ...BH('manor', 6, 6, 4.6, 3.0, 'Casa Aldren', { door: 'W', v: 1, gen: { x: C + 24, y: C - 6, w: 6, h: 6, door: 'W' } }) },
  { x: C + 26, y: C + 8, ...BH('manor', 6, 5, 4.4, 3.0, 'Casa Morvane', { door: 'W', v: 2, gen: { x: C + 24, y: C + 8, w: 6, h: 5, door: 'W' } }) },
];
// portas: lado S (+y, padrão), N (-y), E (+x) ou W (-x). O layout interno usa um "quadro local":
// i = posição ao longo da parede da porta (largura A), j = profundidade (0 = fundo, D-1 = linha da porta)
const DOOR_V = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] };
// jeito de andar de cada tipo de NPC: idoso (curvado, devagar), nobre (empertigado, mãos para trás), apressado, pesado (trabalhador), leve, sereno (mãos juntas)
const NPC_GAIT = { v_elderm: 'old', v_elderf: 'old', jailer: 'old', noble: 'noble', noble2: 'noble', v_noblef: 'noble', v_noblem: 'noble', banker: 'noble', broker: 'noble', agent: 'noble', tailor: 'noble', banker2: 'light', banker3: 'calm',
  courier1: 'hurry', courier2: 'hurry', courier3: 'hurry', v_thug1: 'hurry', v_thug2: 'hurry', supplier: 'hurry', v_trav1: 'hurry', smith: 'heavy', st_saw: 'heavy', st_mine: 'heavy', st_carp: 'heavy', merchant: 'heavy', executioner: 'heavy', v_peasm: 'heavy',
  v_house1: 'light', v_house2: 'light', v_house3: 'light', v_house4: 'light', innkeeper: 'heavy', tavmaid: 'hurry', fruit: 'light', v_peasf: 'light', st_apoth: 'light', st_tailor: 'light', v_vis1: 'light', v_vis2: 'light', priest: 'calm', v_monk: 'calm', gardener: 'normal' };
const GAIT_SPD = { old: 0.62, noble: 0.85, hurry: 1.28, heavy: 0.95, light: 1.0, calm: 0.8, normal: 1, drunk: 0.75 };
const GAIT_CAD = { old: 14, noble: 10, hurry: 8.6, heavy: 8.8, light: 10.8, calm: 10.4, normal: 9.5, drunk: 10 };
const DOOR_ROT = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };
function bDims(b) { const s = b.door || 'S'; return s === 'S' || s === 'N' ? [b.w, b.h] : [b.h, b.w]; }
function bLocal(b, i, j) {
  const s = b.door || 'S', w = b.w, h = b.h;
  if (s === 'S') return [b.x + i, b.y + j];
  if (s === 'N') return [b.x + w - 1 - i, b.y + h - 1 - j];
  if (s === 'E') return [b.x + j, b.y + h - 1 - i];
  return [b.x + w - 1 - j, b.y + i];
}
// direção (1:+x 3:-y 5:-x 7:+y) do quadro local para o mundo
function bDir(b, d) {
  const lv = { 1: [1, 0], 3: [0, -1], 5: [-1, 0], 7: [0, 1] }[d], a = DOOR_ROT[b.door || 'S'];
  const x = lv[0] * Math.cos(a) + lv[1] * Math.sin(a), y = -lv[0] * Math.sin(a) + lv[1] * Math.cos(a);
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 1 : 5) : (y > 0 ? 7 : 3);
}
const doorCol = b => b.dcol != null ? b.dcol : Math.floor((bDims(b)[0] - 1) / 2);
// 10 modelos de casa (A = largura da fachada com a porta, D = profundidade)
const HOUSE_TYPES = [
  { A: 4, D: 4, H: 2.4, RH: 2.4, v: 1, floors: 1 }, { A: 5, D: 4, H: 2.4, RH: 2.6, v: 0, floors: 1 }, { A: 5, D: 5, H: 2.6, RH: 2.8, v: 3, floors: 1 }, { A: 6, D: 4, H: 2.4, RH: 2.6, v: 5, floors: 1 },
  { A: 4, D: 5, H: 4.0, RH: 2.6, v: 2, floors: 2 }, { A: 5, D: 4, H: 4.0, RH: 2.8, v: 4, floors: 2 }, { A: 6, D: 5, H: 4.0, RH: 3.0, v: 0, floors: 2 }, { A: 5, D: 5, H: 4.0, RH: 2.8, v: 3, floors: 2 },
  { A: 5, D: 5, H: 5.4, RH: 3.0, v: 1, floors: 3 }, { A: 6, D: 5, H: 5.4, RH: 3.2, v: 5, floors: 3 },
];
// chave do desenho: casas do mesmo modelo e lado de porta compartilham a mesma foto
function archKey(b) { return b.arch != null ? 'h' + b.arch : 'u' + b.x + '_' + b.y; }
// ponto contínuo do quadro local (u ao longo da fachada, v em profundidade) para o mundo
function localToWorld(b, u, v) {
  const s = b.door || 'S', X0 = b.x - 0.5, Y0 = b.y - 0.5;
  if (s === 'S') return [X0 + u, Y0 + v];
  if (s === 'N') return [X0 + b.w - u, Y0 + b.h - v];
  if (s === 'E') return [X0 + v, Y0 + b.h - u];
  return [X0 + b.w - v, Y0 + u];
}
function doorTile(b) { const [A, D] = bDims(b); return bLocal(b, doorCol(b), D - 1); }
const doorOf = b => { const [x, y] = doorTile(b), v = DOOR_V[b.door || 'S']; return { x: x + v[0] * 1.3, y: y + v[1] * 1.3 }; };
// mobília dos interiores (coordenadas locais em tiles: i = coluna, j = linha; a porta fica na linha h-1)
// direções de quem senta: 1 = olha +x, 3 = olha -y, 5 = olha -x, 7 = olha +y
// escadas: o andar f sobe pela escada STAIR_AT(b, f) e o andar f+1 desce pela mesma (canto do fundo, alternando)
// escada de 2 tiles encostada na parede: andar par = parede do fundo subindo para a direita; ímpar = parede esquerda subindo para o fundo
// L = degrau de baixo, U = topo, entry = de onde se entra embaixo, arrive = onde se chega em cima
// tipos: 'wall' (2 tiles encostada na parede do fundo), 'spiral' (caracol, 1 tile no canto), 'ladder' (escada de mão com alçapão, 1 tile),
// 'ext' (externa: sobe por fora, pela parede do lado que a câmera vê, até uma porta no andar de cima). trig = onde se pisa lá em cima para descer
function stairKind(b, f) { return (b.stairs && b.stairs[f]) || 'wall'; }
function stairSpec(b, f) {
  { const E = intEditB(b), o = E && E.st && E.st[f]; if (o && o.kind !== 'ext') { const lift = o.kind === 'lift' || o.kind === 'clift', one = lift || o.kind === 'ladder' || o.kind === 'spiral'; return { kind: o.kind, one: one ? 1 : undefined, lift: lift ? 1 : undefined, cab2: lift ? 1 : undefined, L: o.L, U: o.U, dv: [o.U[0] - o.L[0], o.U[1] - o.L[1]], entry: o.entry, arrive: o.arrive, trig: one ? o.L : o.U }; } }   /* escada movida no editor */
  const [A, D] = bDims(b), k = stairKind(b, f);
  if (b.kind === 'castle' && f < 0) return f === -1 ? { kind: 'wall', L: [1, 3], U: [1, 2], dv: [0, -1], entry: [1, 4], arrive: [1, 1], trig: [1, 2] } : { kind: 'wall', L: [3, 4], U: [3, 3], dv: [0, -1], entry: [3, 5], arrive: [3, 2], trig: [3, 3] };   /* corredor oeste: desce em vaivém até a cripta (chega no corredor aberto, não atrás da escada) */
  if (k === 'grand') return f % 2 === 0 ? { kind: 'wall', L: [17, 3], U: [17, 2], dv: [0, -1], entry: [17, 4], arrive: [17, 1], trig: [17, 2] } : { kind: 'wall', L: [18, 2], U: [18, 3], dv: [0, 1], entry: [18, 1], arrive: [18, 4], trig: [18, 3] };   /* escadaria do castelo: lances alternados com patamar em cada andar */
  if (f < 0 && b.deco === 'velvet') return { kind: 'wall', L: [0, 8], U: [0, 9], dv: [0, 1], entry: [0, 7], arrive: [0, 10], trig: [0, 9] };   /* Casa de Veludo: escada de pedra do porão, no canto sudoeste */
  if (f < 0) { const c = b.cellar; return { kind: 'ladder', one: 1, cellar: 1, L: c, U: c, dv: [0, 0], entry: [c[0], c[1] + 1], arrive: [c[0], c[1] + 1], trig: c }; }   // porão: escada de mão até o alçapão do térreo
  if (b.deco === 'velvet' && f >= 0) return { kind: 'lift', one: 1, lift: 1, cab2: 1, L: [11, 2], U: [11, 2], dv: [0, 0], entry: [10, 3], arrive: [10, 3], trig: [11, 2] };   /* Casa de Veludo: elevador de latão na parede leste, a grade abre para oeste */
  if (k === 'lift') return { kind: k, one: 1, lift: 1, cab2: 1, L: [6, 0], U: [6, 0], dv: [0, 0], entry: [7, 2], arrive: [7, 2], trig: [6, 0] };
  if (k === 'clift') return { kind: k, one: 1, lift: 1, cab2: 1, L: [3, 3], U: [3, 3], dv: [0, 0], entry: [3, 5], arrive: [3, 5], trig: [3, 3] };   /* elevador redondo de latão no centro da Torre do Inventor (planta circular 8 x 8) */   // elevador 2×2 do prédio japonês (corredor ao norte; a grade abre para o corredor)
  if (k === 'spiral') { let i = f % 2 === 0 ? A - 1 : 0; if (b.seatMirror) i = A - 1 - i; return { kind: k, one: 1, L: [i, 0], U: [i, 0], dv: [0, 0], entry: [i, 1], arrive: [i, 1], trig: [i, 0] }; }
  if (k === 'ladder') { let i = f % 2 === 0 ? A - 2 : 1; if (b.seatMirror) i = A - 1 - i; return { kind: k, one: 1, L: [i, 0], U: [i, 0], dv: [0, 0], entry: [i, 1], arrive: [i, 1], trig: [i, 0] }; }
  if (k === 'ext') { const R = b.extSide !== 'L', o = R ? A : -1; return { kind: k, ext: R ? 1 : -1, L: [o, D - 2], U: [o, D - 3], dv: [0, -1], entry: [o, D - 1], arrive: [R ? A - 2 : 1, D - 3], trig: [R ? A - 1 : 0, D - 3] }; }
  // o topo fica a 1 tile da parede: em cima, chega-se no tile em frente aos degraus (na direção da subida)
  if (f % 2 === 0) return { kind: 'wall', L: [A - 3, 0], U: [A - 2, 0], dv: [1, 0], entry: [A - 4, 0], arrive: [A - 1, 0], trig: [A - 2, 0] };
  return { kind: 'wall', L: [0, 3], U: [0, 2], dv: [0, -1], entry: [0, 4], arrive: [0, 1], trig: [0, 2] };
}
// paredes internas finas: [u0, v0, u1, v1] no quadro local; vãos de porta já ficam de fora
// Termas de Aurora (13 x 20, porta para o sul): planta no quadro local (u ao longo da fachada 0..13, v em profundidade: 0 = fundo, 20 = rua).
// Sala quente v 0..7 (de parede a parede; cresceu 2 casas no replanejamento de 24/11) · sala morna u 0..3, pátio u 3..8 e sala fria u 8..13 em v 7..15 · vestiário v 15..20
const THERMAE = { depth: 0.85,
  pools: [{ k: 'hot', u0: 2, v0: 1, u1: 11, v1: 6 }, { k: 'sky', u0: 4, v0: 8, u1: 7, v1: 12 }, { k: 'cold', u0: 9, v0: 9, u1: 12, v1: 12 }],
  casc: { u0: 9, v0: 8, u1: 12, v1: 9 }, cascFlip: 1, fall: { u0: 9, v0: 9, u1: 12, v1: 9.9 },   /* cascata no lado norte da piscina fria, caindo para o sul */ lions: [4, 6.5, 9], lionWall: 'back', labrum: [2, 18.6], keeper: [8.5, 18.4] };   /* leões jorrando da parede do fundo */
function thermaeWalls(b) {   /* vãos de 1,2 nas passagens */
  return [[0, 15, 0.9, 15], [2.1, 15, 4.9, 15], [6.1, 15, 9.9, 15], [11.1, 15, 13, 15], [0, 7, 0.9, 7], [2.1, 7, 4.9, 7], [6.1, 7, 9.9, 7], [11.1, 7, 13, 7], [3, 7, 3, 10.4], [3, 11.6, 3, 15], [8, 7, 8, 12.4], [8, 13.6, 8, 15]]; }
const hasIwalls = b => !!b && (b.deco === 'machiya' || b.kind === 'castle' || b.deco === 'thermae' || b.deco === 'seat' || b.deco === 'velvet' || intHasThin(b));
/* casarões das casas: cômodos por andar no quadro local (u ao longo da fachada 0..7, v em profundidade: 0 = fundos/leste, 8 = rua/oeste) e portas [linha, valor, posição] */
const SEAT_ROOMS = {
  0: { r: [[0, 3, 7, 8, 'salão'], [0, 0, 3, 3, 'cozinha'], [3, 0, 5, 3, 'quarto do criado'], [5, 0, 7, 3, 'escada']], d: [['v', 3, 1], ['v', 3, 4], ['v', 3, 5], ['v', 3, 6]] },
  1: { r: [[0, 0, 7, 2, 'corredor'], [0, 2, 3, 8, 'escritório'], [3, 2, 7, 8, 'quarto do casal']], d: [['v', 2, 1], ['v', 2, 5]] },
  2: { r: [[0, 0, 3, 8, 'depósito'], [3, 0, 7, 8, 'quarto do herdeiro']], d: [['u', 3, 5]] } };
const SEAT_WIN = [3.5, 0.75];   /* janela com hera no 1º andar: por dentro (u, v) na planta de 7 x 8; por fora fica na parede dos fundos */
/* a planta foi desenhada em 7 x 8 (fachada x fundo); cada casarão estica para o tamanho dele, cômodo por cômodo (cozinha, escritório e depósito à esquerda; fundos com 3 casas no térreo e corredor de 2 no 1º andar) */
function seatDims(b) { const [A, D] = bDims(b); return { A, D, ka: Math.max(3, Math.round(A * 3 / 7)) }; }
function seatMapU(b, u) { const { A, ka } = seatDims(b), m = u <= 3 ? u * ka / 3 : ka + (u - 3) * (A - ka) / 4; return b.seatMirror ? A - m : m; }   /* espelhado: a cozinha fica do lado direito da fachada */
function seatMapV(b, fl, v) { const { D } = seatDims(b), k = fl === 0 ? 3 : fl === 1 ? 2 : 0; return v <= k ? v : k + (v - k) * (D - k) / (8 - k); }
function seatPt(b, fl, u, v) { return localToWorld(b, seatMapU(b, u), seatMapV(b, fl | 0, v)); }
function seatWin(b) { const { A } = seatDims(b); return b.seatSide === 'R' ? [A - 0.75, 1] : b.seatSide === 'L' ? [0.75, 1] : [Math.floor(seatMapU(b, 3.5)) + 0.5, SEAT_WIN[1]]; }
function seatIvyOut(b) { const { A } = seatDims(b), wn = seatWin(b); return b.seatSide === 'R' ? [A + 0.7, wn[1]] : b.seatSide === 'L' ? [-0.7, wn[1]] : [wn[0], -0.7]; }   /* pé da hera, do lado de fora */
const SEAT_ROOM_MEMO = {};
function seatRoomsOf(b, fl) { const R = SEAT_ROOMS[fl]; if (!R) return null; const { A, D } = seatDims(b), key = A + 'x' + D + '|' + fl; if (SEAT_ROOM_MEMO[key]) return SEAT_ROOM_MEMO[key];
  const U = u => Math.round(seatMapU(b, u)), V = v => Math.round(seatMapV(b, fl, v)), r = R.r.map(([u0, v0, u1, v1, n]) => [Math.min(U(u0), U(u1)), V(v0), Math.max(U(u0), U(u1)), V(v1), n]);
  const d = R.d.map(([ax, val, pos]) => ax === 'v' ? ['v', V(val), Math.floor(seatMapU(b, pos + 0.5))] : ['u', U(val), Math.floor(seatMapV(b, fl, pos + 0.5))]);
  if (fl === 0) { const e = r.find(q => q[4] === 'escada'); if (e) for (let u = e[0]; u < e[2]; u++) d.push(['v', V(3), u]); }   /* a escada fica aberta para o salão */
  return (SEAT_ROOM_MEMO[key] = { r, d, A, D }); }
function roomsWalls(R, A, D) { const units = new Set();
  for (const [u0, v0, u1, v1] of R.r) { for (let u = u0; u < u1; u++) { if (v0 > 0) units.add('v,' + v0 + ',' + u); if (v1 < D) units.add('v,' + v1 + ',' + u); } for (let v = v0; v < v1; v++) { if (u0 > 0) units.add('u,' + u0 + ',' + v); if (u1 < A) units.add('u,' + u1 + ',' + v); } }
  for (const [ax, val, pos] of R.d) units.delete(ax + ',' + val + ',' + pos);
  const segs = []; for (const s of units) { const [ax, val, pos] = s.split(','), a = +val, p = +pos; segs.push(ax === 'u' ? [a, p, a, p + 1] : [p, a, p + 1, a]); } return segs; }
const SEAT_WALL_MEMO = {};
function seatWalls(fl, b) { const R = b ? seatRoomsOf(b, fl) : SEAT_ROOMS[fl]; if (!R) return null; const key = (R.A || 7) + 'x' + (R.D || 8) + '|' + fl; return SEAT_WALL_MEMO[key] || (SEAT_WALL_MEMO[key] = roomsWalls(R, R.A || 7, R.D || 8)); }
/* em que cômodo do casarão está este ponto? (null fora do casarão ou de outro andar sem planta) */
function seatRoom(b, fl, x, y) { if (!b || b.deco !== 'seat') return null; const R = seatRoomsOf(b, fl | 0); if (!R) return null; const [u, v] = worldToLocal(b, x, y);
  for (let i = 0; i < R.r.length; i++) { const [u0, v0, u1, v1, n] = R.r[i]; if (u >= u0 && u < u1 && v >= v0 && v < v1) return { i, n, fl: fl | 0 }; } return null; }
const VL_UPPER_WALLS = [[4, 0, 4, 2], [9, 0, 9, 2], [0, 2, 1, 2], [3, 2, 5, 2], [8, 2, 9, 2], [11, 2, 13, 2]];   /* Casa de Veludo, 1º e 2º andar: três quartos ao norte, com a entrada de cortina para a galeria */
const VL_CELLAR_WALLS = [[7, 0, 7, 2], [7, 3, 7, 6], [0, 6, 3, 6], [4, 6, 7, 6], [7, 6, 9, 6], [10, 6, 13, 6], [9, 7, 13, 7], [9, 7, 9, 8], [9, 9, 9, 11]];   /* Casa de Veludo, andar -1 */
function iwallsLocal(b, fl) {
  { const E = intEdit(b, fl); if (E && E.thin) return E.thin.length ? E.thin : null; }   /* paredes finas do editor */
  if (b.kind === 'castle') return castleWalls(fl);
  if (b.deco === 'thermae') return fl === 0 ? thermaeWalls(b) : null;
  if (b.deco === 'seat') return seatWalls(fl, b);
  if (b.deco === 'velvet') return fl === -1 ? VL_CELLAR_WALLS : fl > 0 && fl < 3 ? VL_UPPER_WALLS : null;
  if (b.deco !== 'machiya') return null; const [A, D] = bDims(b);
  // quadro local: u ao longo da fachada (0 = sul, A = norte), v em profundidade (0 = fundo/oeste, D = rua/leste). Corredor + elevador em u 6..8
  if (fl === 0) return [[6, 0, 6, D]];   // corredor do elevador (ponta norte) separado do dojô
  // andares 1–2: a cabine abre no patamar (i = 7) que vai até a varanda; apto A (com o antigo hall) e apto B com as portas para a varanda; a fachada (v = D) tem os vãos das portas
  if (fl < floorsOf(b) - 1) return [[6, 0, 6, D], [3, 0, 3, D], [0, D, 1, D], [2, D, 4, D], [5, D, 6, D]];   /* patamar de 2 casas (u 6..8) aberto até a varanda */
  // suíte: entra pelo hall (porta em u = 6, v 3..4); a porta de correr para a varanda (u 2..4) é só por dentro
  return [[6, 0, 6, 2], [6, 3, 6, D], [0, D, 2, D], [4, D, 8, D]];   /* porta para o hall em v 2..3 */
  // (o resto do andar da suíte é aberto; o ofurô fica no canto sudoeste)
}
// cômodos do castelo por andar: [u0, v0, u1, v1, nome] e portas [linha 'u' ou 'v', valor, posição]
const CASTLE_ROOMS = {
  '-2': { r: [[0, 0, 4, 17], [4, 0, 12, 9], [12, 0, 20, 9], [12, 9, 20, 17], [4, 9, 12, 17]], d: [['u', 4, 3], ['u', 4, 12], ['u', 12, 5], ['v', 9, 16]] },
  '-1': { r: [[0, 0, 4, 17], [4, 0, 10, 6], [4, 6, 10, 12], [4, 12, 10, 17], [10, 0, 16, 6], [10, 6, 20, 17], [16, 0, 20, 6]], d: [['u', 4, 3], ['u', 4, 9], ['u', 4, 14], ['v', 6, 13], ['u', 10, 14], ['u', 16, 3]] },
  0: { r: [[0, 0, 4, 17], [4, 0, 16, 17], [16, 0, 20, 17]], d: [['u', 4, 3], ['u', 4, 9], ['u', 4, 14], ['u', 16, 3], ['u', 16, 8], ['u', 16, 13]] },
  1: { r: [[0, 0, 4, 8], [0, 8, 4, 17], [4, 0, 16, 17], [16, 0, 20, 6], [16, 6, 20, 17]], d: [['u', 4, 3], ['u', 4, 12], ['v', 8, 2], ['u', 16, 3], ['u', 16, 9]] },
  2: { r: [[0, 0, 7, 6], [0, 6, 7, 13], [0, 13, 7, 17], [7, 0, 13, 17], [13, 0, 16, 6], [13, 6, 16, 11], [13, 11, 16, 17], [16, 0, 20, 17]], d: [['u', 7, 3], ['u', 7, 9], ['u', 7, 15], ['u', 13, 3], ['u', 13, 8], ['u', 13, 14], ['u', 16, 14], ['u', 16, 3]] },
  3: { r: [[0, 0, 5, 4], [5, 0, 10, 4], [0, 4, 5, 8], [5, 4, 10, 8], [10, 0, 16, 8], [0, 8, 16, 10], [0, 10, 8, 17], [8, 10, 12, 17], [12, 10, 16, 17], [16, 0, 20, 17]], d: [['v', 4, 2], ['v', 4, 7], ['v', 8, 2], ['v', 8, 7], ['v', 8, 13], ['v', 10, 4], ['v', 10, 10], ['v', 10, 14], ['u', 16, 9], ['u', 16, 4]] },
  4: { r: [[0, 0, 4, 6], [4, 0, 8, 6], [8, 0, 16, 6], [16, 0, 20, 6], [0, 6, 20, 8], [0, 8, 4, 11], [4, 8, 12, 11], [12, 8, 16, 11], [16, 8, 20, 11], [0, 11, 20, 17]], d: [['v', 6, 2], ['v', 6, 6], ['v', 6, 12], ['v', 6, 18], ['v', 8, 2], ['v', 8, 8], ['v', 8, 14], ['v', 8, 18], ['v', 11, 8], ['v', 11, 18]] },
};
const CASTLE_WALL_MEMO = {};
function castleWalls(fl) {
  if (CASTLE_WALL_MEMO[fl]) return CASTLE_WALL_MEMO[fl]; const R = CASTLE_ROOMS[fl]; if (!R) return null; const A = 20, D = 17, units = new Set();
  for (const [u0, v0, u1, v1] of R.r) { for (let u = u0; u < u1; u++) { if (v0 > 0) units.add('v,' + v0 + ',' + u); if (v1 < D) units.add('v,' + v1 + ',' + u); } for (let v = v0; v < v1; v++) { if (u0 > 0) units.add('u,' + u0 + ',' + v); if (u1 < A) units.add('u,' + u1 + ',' + v); } }
  for (const [ax, val, pos] of R.d) units.delete(ax + ',' + val + ',' + pos);
  const segs = []; for (const s of units) { const [ax, val, pos] = s.split(','), a = +val, p = +pos; segs.push(ax === 'u' ? [a, p, a, p + 1] : [p, a, p + 1, a]); }
  return (CASTLE_WALL_MEMO[fl] = segs); }
const IWALL_MEMO = new Map();
function iwallsWorld(bi, fl) { const k = bi * 8 + fl + 1; let L = IWALL_MEMO.get(k); if (L !== undefined) return L; const b = BUILDINGS[bi], loc = b && iwallsLocal(b, fl); L = loc ? loc.map(([u0, v0, u1, v1]) => [...localToWorld(b, u0, v0), ...localToWorld(b, u1, v1)]) : null; IWALL_MEMO.set(k, L); return L; }
function iwallHit(bi, fl, x, y, r) { const L = iwallsWorld(bi, fl); if (!L) return false; const t = 0.07;
  for (const [x0, y0, x1, y1] of L) { if (Math.abs(x0 - x1) < 0.01) { if (Math.abs(x - x0) < r + t && y > Math.min(y0, y1) - r * 0.3 && y < Math.max(y0, y1) + r * 0.3) return true; } else if (Math.abs(y - y0) < r + t && x > Math.min(x0, x1) - r * 0.3 && x < Math.max(x0, x1) + r * 0.3) return true; }
  return false; }
function iwallCross(bi, fl, ax, ay, bx, by) { const L = iwallsWorld(bi, fl); if (!L) return false;   /* passo de tile a tile atravessa uma parede fina? */
  for (const [x0, y0, x1, y1] of L) { if (Math.abs(x0 - x1) < 0.01) { if ((ax - x0) * (bx - x0) < 0 && Math.max(ay, by) > Math.min(y0, y1) && Math.min(ay, by) < Math.max(y0, y1)) return true; } else if ((ay - y0) * (by - y0) < 0 && Math.max(ax, bx) > Math.min(x0, x1) && Math.min(ax, bx) < Math.max(x0, x1)) return true; }
  return false; }
function ofuroOf(b) { if (!b || b.kind !== 'dojo') return null; const [x, y] = localToWorld(b, 1, 1);   // banheira da suíte de luxo (último andar): um lugar em cada canto, bem juntinhos
  const seats = [[0.6, 0.6], [1.4, 0.6], [0.6, 1.4], [1.4, 1.4]].map(([u, v]) => localToWorld(b, u, v));
  const edges = [{ a: [1.86, 0.45], b: [1.86, 1.55], face: [-1, 0] }, { a: [0.45, 1.86], b: [1.55, 1.86], face: [0, -1] }].map(E => ({ a: localToWorld(b, ...E.a), b: localToWorld(b, ...E.b), cin: localToWorld(b, 1, 1) }));
  return { x, y, fl: floorsOf(b) - 1, seats, edges, rack: localToWorld(b, 2.3, 1.45), water: [0.24, 1.76], lever: localToWorld(b, 2.5, 0.62) }; }
// água do ofurô: alavanca para baixo enche em 2 min, para cima esvazia em 1 min; T = { lv, mode: 'fill'|'drain'|'', lever, t }
const TUB_FILL = 120000, TUB_DRAIN = 60000;
function tubLv(T, now) { if (!T) return 0; const dt = Math.max(0, now - (T.t || 0)); return T.mode === 'fill' ? Math.min(1, T.lv + dt / TUB_FILL) : T.mode === 'drain' ? Math.max(0, T.lv - dt / TUB_DRAIN) : T.lv; }
function inOfuroWater(b, fl, x, y) { const O = ofuroOf(b); if (!O || fl !== O.fl) return false; const [u, v] = worldToLocal(b, x, y); return u > O.water[0] && u < O.water[1] && v > O.water[0] && v < O.water[1]; }
// varanda andável na fachada da rua (1 casa de fundo, fora do prédio), nos andares de cima: [u0, u1] no quadro local
function balconyOf(b, fl) { if (b && b.deco === 'velvet') return fl === 3 ? [4.5, 8.5, 2.5] : null;   /* varanda da suíte da Casa de Veludo, por cima do pórtico */
  if (!b || b.deco !== 'machiya' || fl < 1) return null; return fl < floorsOf(b) - 1 ? [0, bDims(b)[0]] : [0, 6]; }
function worldToLocal(b, x, y) { const s = b.door || 'S', X0 = b.x - 0.5, Y0 = b.y - 0.5; if (s === 'S') return [x - X0, y - Y0]; if (s === 'N') return [X0 + b.w - x, Y0 + b.h - y]; if (s === 'E') return [Y0 + b.h - y, x - X0]; return [y - Y0, X0 + b.w - x]; }
function door2Of(b) { if (!b.door2L) return null; if (!b._d2) { const [i, j, s] = b.door2L, [x, y] = bLocal(b, i, j); b._d2 = { x, y, s }; } return b._d2; }   // segunda porta (corredor do elevador)
function floorsOf(b) { return b.kind === 'stairtower' ? 1 : (b.floors || 1); }
function minFl(b) { return b && b.kind === 'castle' ? -2 : b && b.cellar ? -1 : 0; }   // prédio com porão: andar -1
/* 3.5: camas a mais por prédio (índice do prédio → andar → catres), para quem passa a morar ali */
const DORM_EXTRA = { 1: { 1: 1 }, 3: { 1: 2 }, 4: { 0: ['bunk'], 1: ['bunk'] }, 11: { 1: 1 }, 35: { 0: 1 }, 36: { 0: [{ t: 'cot', i: 7, j: 3 }] }, 40: { 0: 1 }, 41: { 0: 1 }, 22: { 0: 1 }, 25: { 0: 1 }, 26: { 0: ['bunk'] }, 27: { 0: ['bunk'] }, 30: { 0: ['bunk'] }, 31: { 0: 1 }, 15: { 0: 1 }, 17: { 0: 1, 1: 4 } };   /* número = catres; lista = tipos (beliche = 2 camas) */
function dormBi(b) { if (typeof BUILDINGS === 'undefined' || !b) return -1; if (BUILDINGS.length && BUILDINGS[BUILDINGS.length - 1].dbi !== BUILDINGS.length - 1) BUILDINGS.forEach((q, i) => { q.dbi = i; }); const i = BUILDINGS.indexOf(b); return i >= 0 ? i : (b.dbi != null ? b.dbi : -1); }   /* o desenho usa cópias do prédio: a cópia leva o dbi */
const dormExtraKey = (b, fl) => { const bi = dormBi(b), D = DORM_EXTRA[bi]; return D && D[fl] ? 'd' + bi : ''; };
/* prédios que cresceram na Prancheta de 25/11: área antiga (casas) → o andar ganha móveis do mesmo estilo na proporção do espaço novo */
const FILL_OLD = { 11: 176, 50: 117, 46: 70, 23: 45, 18: 56, 39: 49, 15: 80, 47: 80, 52: 132 };
const FILL_STYLE = { 46: [{ t: 'bokkenrack', w: 1, h: 1, v: 0 }, { t: 'brazier', w: 1, h: 1, v: 0 }] };   /* Casa Draemor: gente de armas (suportes de espadas e braseiros; só peças de chão) */
const FILL_SKIP = new Set(['stairup', 'stairdown', 'ladder', 'laddertop', 'spiral', 'spiraltop', 'lift', 'lifttop', 'clift', 'clifttop', 'extdoor', 'blk', 'rug', 'nrug', 'kilim', 'starrug', 'tatami', 'bed', 'cot', 'bunk', 'futon', 'platbed', 'chest', 'stove', 'fireplace', 'vault', 'bars', 'celldoor', 'cabindoor', 'clubbar', 'altar', 'counter', 'hpart', 'mezzrail', 'gvoid', 'ofuro', 'clock', 'ratesboard', 'goldbars', 'chandelier', 'spellbooks', 'mirror']);
function intFill(b, fl, L) { const bi = dormBi(b), old = FILL_OLD[bi]; if (!old || TEST3D) return L; const [w, h] = bDims(b), ratio = w * h / old; if (ratio < 1.15) return L;
  const thin = hasIwalls(b), pal = L.F.filter(f => !FILL_SKIP.has(f.t) && !f.cab && !f.dorm && (!thin || !FURN_SOLID.has(f.t)) && (f.w || 1) * (f.h || 1) <= 4); if (FILL_STYLE[bi]) pal.unshift(...FILL_STYLE[bi]); if (!pal.length) return L;
  const base = L.F.filter(f => !FILL_SKIP.has(f.t)).length, extra = Math.round(base * (ratio - 1)); if (extra <= 0) return L;
  const K = (i, j) => i + ',' + j, occ = new Set(), near = new Set(), dc = doorCol(b);
  for (const f of L.F) for (let a = 0; a < (f.w || 1); a++) for (let c = 0; c < (f.h || 1); c++) occ.add(K(f.i + a, f.j + c));
  if (L.npc) occ.add(K(L.npc.i, L.npc.j));
  for (const sf of [fl, fl - 1]) { if (sf < minFl(b) || sf >= floorsOf(b) - 1) continue; const sp = stairSpec(b, sf); for (const k0 of ['L', 'U', 'entry', 'arrive', 'trig']) if (sp[k0]) for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) occ.add(K(sp[k0][0] + a, sp[k0][1] + c)); }
  if (fl === 0) { for (let j = h - 3; j < h; j++) for (let i = dc - 1; i <= dc + 1; i++) occ.add(K(i, j)); if (b.door2L) for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) occ.add(K(b.door2L[0] + a, b.door2L[1] + c)); }
  const cand = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const wall = (i === 0 || i === w - 1 ? 1 : 0) + (j === 0 ? 1 : 0); cand.push([i, j, (wall ? 0 : 10) + ((i * 7 + j * 13 + bi * 5 + fl * 3) % 10)]); }
  cand.sort((a, c) => a[2] - c[2]);
  const F = L.F.slice(); let added = 0, k = 0;
  for (let tries = 0; tries < extra * 4 && added < extra; tries++) { const p = pal[k++ % pal.length], pw = p.w || 1, ph = p.h || 1;
    const spot = cand.find(([i, j]) => { if (i + pw > w || j + ph > h) return false; for (let a = 0; a < pw; a++) for (let c = 0; c < ph; c++) if (occ.has(K(i + a, j + c)) || near.has(K(i + a, j + c))) return false; return true; });
    if (!spot) continue; const [i, j] = spot, q = Object.assign({}, p, { i, j }); delete q.dorm; F.push(q); added++;
    for (let a = -1; a <= pw; a++) for (let c = -1; c <= ph; c++) { if (a >= 0 && a < pw && c >= 0 && c < ph) occ.add(K(i + a, j + c)); else near.add(K(i + a, j + c)); } }
  return { F, npc: L.npc }; }
function interiorLayout0(b, fl = 0) {
  const L = intEdit(b, fl) ? interiorLayoutBase(b, fl) : intFill(b, fl, interiorLayoutBase(b, fl)), bi = dormBi(b), D = DORM_EXTRA[bi], n = D && D[fl]; if (!n || intEdit(b, fl)) return L;   /* planta editada já traz as camas dos moradores */
  const [w, h] = bDims(b), occ = new Set(), K = (i, j) => i + ',' + j, dc = doorCol(b);
  for (const q of L.F) for (let a = 0; a < (q.w || 1); a++) for (let c = 0; c < (q.h || 1); c++) occ.add(K(q.i + a, q.j + c));
  if (L.npc) occ.add(K(L.npc.i, L.npc.j));
  const nF = floorsOf(b); for (const sf of [fl, fl - 1]) { if (sf < minFl(b) || sf >= nF - 1) continue; const sp = stairSpec(b, sf); for (const k0 of ['L', 'U', 'entry', 'arrive', 'trig']) if (sp[k0]) { occ.add(K(sp[k0][0], sp[k0][1])); for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) occ.add(K(sp[k0][0] + a, sp[k0][1] + c)); } }
  if (fl === 0) for (let j = h - 3; j < h; j++) for (let i = dc - 1; i <= dc + 1; i++) occ.add(K(i, j));   /* a entrada fica livre */
  if (fl === 0 && b.door2L) { const [di, dj] = b.door2L; for (const [a, c] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) occ.add(K(di + a, dj + c)); }   /* a segunda porta também (o catre do Dojô trancava o corredor do elevador) */
  const free = (i, j) => i >= 0 && j >= 0 && i < w && j < h && !occ.has(K(i, j)), F = L.F.slice(), types = Array.isArray(n) ? n.slice() : Array(n).fill('cot'); let left = types.length;
  const cand = []; for (let j = 0; j < h - 1; j++) for (let i = 0; i < w; i++) cand.push([i, j, (j === 0 ? 0 : 2) + (i === 0 || i === w - 1 ? 0 : 1)]);   /* encostado na parede primeiro */
  cand.sort((a, b2) => a[2] - b2[2]);
  for (let k = 0; k < types.length; k++) if (types[k] && typeof types[k] === 'object') { const q = types[k]; F.push({ t: q.t, i: q.i, j: q.j, w: 1, h: 2, block: true, dorm: 1 }); occ.add(K(q.i, q.j)); occ.add(K(q.i, q.j + 1)); left--; types.splice(k, 1); k--; }   /* catre com lugar fixo (Dojô: no corredor, sem tapar a segunda porta) */
  for (const [i, j] of cand) { if (!left) break; if (!free(i, j) || !free(i, j + 1)) continue; F.push({ t: types[types.length - left], i, j, w: 1, h: 2, block: true, dorm: 1 }); occ.add(K(i, j)); occ.add(K(i, j + 1)); left--; }
  return { F, npc: L.npc };
}
function interiorLayoutBase(b, fl = 0) {
  const [w, h] = bDims(b), F = [], taken = new Set(), key = (i, j) => i + ',' + j, dc = doorCol(b);
  const corridor = (i, j) => (fl === 0 && i === dc && j >= h - 2);
  const nF = floorsOf(b);
  // escadas deste andar (subir/descer) + o tile de chegada na frente delas ficam livres
  const stairs = [];
  if (fl < nF - 1) stairs.push(['stairup', stairSpec(b, fl)]);
  if (fl > minFl(b)) stairs.push(['stairdown', stairSpec(b, fl - 1)]);
  for (const [t, s] of stairs) {
    if (s.kind === 'ext') { if (t === 'stairdown') { taken.add(key(s.trig[0], s.trig[1])); taken.add(key(s.arrive[0], s.arrive[1])); F.push({ t: 'extdoor', i: s.trig[0], j: s.trig[1], w: 1, h: 1, block: false, ext: s.ext }); } continue; }   // externa: lá embaixo não ocupa nada dentro
    if (s.cab2) { for (let a = 0; a < 2; a++) for (let c2 = 0; c2 < 2; c2++) taken.add(key(s.L[0] + a, s.L[1] + c2)); taken.add(key(s.entry[0], s.entry[1])); F.push({ t: t === 'stairup' ? s.kind : s.kind + 'top', i: s.L[0], j: s.L[1], w: 2, h: 2, block: false }); continue; }   /* cabine 2×2 */
    if (s.one) { taken.add(key(s.L[0], s.L[1])); const e = t === 'stairup' ? s.entry : s.arrive; taken.add(key(e[0], e[1])); F.push({ t: t === 'stairup' ? s.kind : s.kind + 'top', i: s.L[0], j: s.L[1], w: 1, h: 1, block: false }); continue; }   // caracol e escada de mão: 1 tile (pisar nele sobe ou desce)
    for (const p of [s.L, s.U, t === 'stairup' ? s.entry : s.arrive]) taken.add(key(p[0], p[1]));
    F.push({ t, i: Math.min(s.L[0], s.U[0]), j: Math.min(s.L[1], s.U[1]), w: s.dv[0] ? 2 : 1, h: s.dv[1] ? 2 : 1, block: false, dv: s.dv });
    const bp = t === 'stairup' ? s.U : s.L;   // embaixo não se pisa sob o topo; em cima o vão da escada
    F.push({ t: 'blk', i: bp[0], j: bp[1], w: 1, h: 1, block: true });
  }
  const can = (i, j) => i >= 0 && j >= 0 && i < w && j < h && !taken.has(key(i, j)) && !corridor(i, j);
  const put = (t, i, j, o = {}) => {
    const tw = o.w || 1, th = o.h || 1;
    if (!o.force) for (let a = 0; a < tw; a++) for (let c = 0; c < th; c++) if (!can(i + a, j + c)) return false;
    for (let a = 0; a < tw; a++) for (let c = 0; c < th; c++) taken.add(key(i + a, j + c));
    F.push({ t, i, j, w: tw, h: th, block: o.block !== false, seat: o.seat, v: o.v || 0, cab: o.cab, inner: o.inner, adj: o.adj, wp: o.wp, ox: o.ox || 0, c: o.c, seats: o.seats });
    return true;
  };
  let npc = null;
  const npcAt = (i, j) => { for (const d of [0, -1, 1, -2, 2]) if (can(i + d, j)) { taken.add(key(i + d, j)); npc = { i: i + d, j }; return; } };
  { const E = intEdit(b, fl); if (E) { for (const q of E.F || []) { const o = Object.assign({}, q, { w: q.w || 1, h: q.h || 1, v: q.v || 0, block: q.t === 'iwall' || !!q.b }); delete o.b; delete o.lock; F.push(o); }   /* guarda os campos de mecânica (cab, adj, inner, wp, ox...) */ return { F, npc: E.npc ? { i: E.npc.i, j: E.npc.j } : null }; } }   /* planta do editor de interiores: as escadas já foram postas acima */
  const k = b.kind;
  if (k === 'castle') {   /* Castelo de Nae: cada andar com os seus cômodos */
    if (fl === 0) { put('swordthrone', 8, 0, { w: 3, h: 2, seat: 7 }); put('rug', 9, 2, { w: 2, h: 15, v: 9, block: false, force: true });
      for (const j of [2, 5, 8, 11, 14]) { put('hpillar', 5, j); put('hpillar', 14, j); }
      put('dskull', 6, 6, { block: false }); put('dskull', 13, 6, { block: false, flip: 1 }); put('dskull', 6, 12, { block: false }); put('dskull', 13, 12, { block: false, flip: 1 });
      put('tapestry', 6, 0, { block: false }); put('tapestry', 13, 0, { block: false }); put('tapestry', 7, 0, { block: false }); put('tapestry', 12, 0, { block: false });
      for (const j of [4, 8, 12]) { put('brazier', 8, j); put('brazier', 11, j); }
      put('glow', 6, 9, { block: false, v: 0 }); put('glow', 12, 3, { block: false, v: 1 }); put('glow', 7, 15, { block: false, v: 2 }); put('glow', 12, 10, { block: false, v: 0 });
      for (const j of [7, 11, 15]) put('candles', 0, j); put('rack', 19, 7); put('rack', 19, 11); put('candles', 19, 15); put('pew', 17, 9, { w: 2, seat: 1 }); }
    else if (fl === 1) { put('hearth', 0, 0, { w: 2 }); put('stove', 2, 0); put('shelf', 3, 0); put('cauldron', 1, 2); if (put('table', 1, 4, { w: 2 })) { } put('barrel', 3, 6); put('barrel', 0, 6);
      put('fireplace', 0, 9); if (put('table', 1, 10, { h: 5 })) for (let j = 10; j < 15; j++) { put('chair', 0, j, { seat: 1 }); put('chair', 2, j, { seat: 5 }); } put('candles', 3, 16);
      put('gvoid', 6, 0, { w: 8, h: 17, force: true });
      put('shelf', 19, 6); put('shelf', 19, 7); put('barrel', 19, 16); put('crate', 18, 16); if (put('table', 17, 11, { w: 2 })) { } }
    else if (fl === 2) { if (put('table', 2, 2, { w: 3, h: 2 })) { for (let i = 2; i < 5; i++) { put('chair', i, 1, { seat: 3 }); put('chair', i, 4, { seat: 7 }); } put('chair', 1, 2, { seat: 1 }); put('chair', 5, 2, { seat: 5 }); }
      for (let i = 0; i < 7; i++) put('shelf', i, 6); put('shelf', 0, 9); put('shelf', 0, 10); if (put('desk', 3, 10, { w: 2 })) put('chair', 3, 11, { seat: 7 });
      put('desk', 2, 14, { w: 2 }); put('chair', 2, 15, { seat: 7 }); put('chest', 6, 16);
      put('rug', 8, 2, { w: 4, h: 13, block: false }); put('fireplace', 7, 0); put('tapestry', 9, 0, { block: false }); put('tapestry', 11, 0, { block: false }); for (const j of [5, 10]) { put('chair', 8, j, { seat: 1 }); put('chair', 11, j, { seat: 5 }); }
      put('shelf', 14, 0); put('cauldron', 13, 2); put('desk', 14, 4); put('vault', 15, 6); put('desk', 13, 8); put('chest', 15, 9); }
    else if (fl === 3) { for (const [i, j] of [[0, 0], [5, 0], [0, 4], [5, 4]]) { put('bed', i, j, { h: 2 }); put('chest', i + 1, j); put('candles', i + 3, j); }
      for (let i = 10; i < 16; i += 2) { put('cot', i, 0, { h: 2 }); } put('chest', 15, 5);
      put('rug', 2, 12, { w: 4, h: 3, block: false }); put('pew', 0, 16, { w: 3, seat: 3 }); put('candles', 7, 10); put('cot', 8, 15, { h: 2 }); put('cot', 10, 15, { h: 2 }); put('bed', 12, 13, { h: 2 }); put('drawers', 14, 16); }
    else if (fl === 4) { put('bed', 0, 0, { h: 2 }); put('chest', 2, 0); put('bed', 4, 0, { h: 2 }); put('drawers', 6, 0); put('platbed', 10, 0, { w: 2, h: 2, block: false }); put('fireplace', 13, 0); put('tapestry', 9, 0, { block: false }); put('chest', 15, 4);
      put('rack', 0, 8); put('rack', 0, 9); if (put('table', 6, 9, { w: 2 })) { put('chair', 5, 9, { seat: 1 }); put('chair', 8, 9, { seat: 5 }); } put('barrel', 15, 10); put('drawers', 18, 10);
      for (const i of [1, 5, 10, 15, 18]) put('plantpot', i, 15, { block: false }); put('pew', 7, 13, { w: 3, seat: 3 }); }
    else if (fl === -1) { for (let i = 4; i < 10; i++) put('barrel', i, 0); for (let i = 4; i < 10; i++) put(i % 2 ? 'crate' : 'barrel', i, 6); put('table', 6, 14, { w: 2 }); put('chair', 6, 13, { seat: 3 }); put('rack', 9, 16);
      put('vault', 11, 0); put('chest', 13, 0); put('chest', 14, 0);
      for (const c of [10, 13, 16]) { put('cot', c, 7, { h: 2 }); put('bars', c, 9, { v: 0 }); put('celldoor', c + 1, 9, { v: 0, block: false }); put('bars', c + 2, 9, { v: 0 }); }
      for (const c of [10, 13, 16]) { put('bars', c, 13, { v: 0 }); put('celldoor', c + 1, 13, { v: 0, block: false }); put('bars', c + 2, 13, { v: 0 }); put('cot', c, 15, { h: 2 }); }
      put('crate', 17, 0); put('crate', 18, 0); put('rack', 19, 3); }
    else if (fl === -2) { put('altar', 7, 0, { w: 2 }); for (const i of [4, 6, 9, 11]) put('candles', i, 0); put('dskull', 8, 5, { block: false }); for (const j of [3, 6]) { put('chest', 5, j); put('chest', 10, j); }
      put('rack', 12, 0); put('rack', 13, 0); put('table', 16, 3, { w: 2 }); put('cauldron', 19, 0); put('candles', 19, 8);
      for (const c of [12, 16]) { put('bars', c, 11, { v: 0 }); put('celldoor', c + 1, 11, { v: 0, block: false }); put('bars', c + 2, 11, { v: 0 }); put('cot', c, 14, { h: 2 }); put('bucket', c + 1, 15, { block: false }); } for (const j of [10, 13, 16]) put('candles', 4, j); }
    return { F, npc: null };
  }
  if (k === 'manor' && b.deco === 'seat') {
    const sp = (t, i, j, o) => { const ow = (o && o.w) || 1, ii = b.seatMirror ? Math.floor(seatMapU(b, i + ow - 0.5)) : Math.floor(seatMapU(b, i + 0.5)), o2 = o && b.seatMirror && o.seat ? Object.assign({}, o, { seat: { 1: 5, 5: 1 }[o.seat] || o.seat }) : o; return put(t, ii, Math.floor(seatMapV(b, fl, j + 0.5)), o2); };   /* posição da planta de 7 x 8 */
    if (fl === 0 && b.door2L) { const [di, dj] = b.door2L; taken.add(key(di, dj)); taken.add(key(di + (di === 0 ? 1 : di >= seatDims(b).A - 1 ? -1 : 0), dj + (dj === 0 ? 1 : 0))); }   /* a porta dos fundos fica livre */   /* casarão de uma casa nobre: um salão, cozinha e quarto do criado no térreo; escritório e quarto do casal no 1º; herdeiro e depósito no sótão */
    if (fl === 0) { for (const q of [[1, 0], [1, 1], [1, 2]]) taken.add(key(Math.floor(seatMapU(b, q[0] + 0.5)), Math.floor(seatMapV(b, fl, q[1] + 0.5))));   /* passagem da porta dos fundos */
      sp('fireplace', 0, 4); if (sp('table', 5, 4, { h: 2 })) { sp('chair', 4, 4, { seat: 1 }); sp('chair', 4, 5, { seat: 1 }); sp('chair', 6, 4, { seat: 5 }); sp('chair', 6, 5, { seat: 5 }); }
      sp('shelf', 0, 6); sp('rug', 1, 4, { w: 2, h: 2, block: false }); sp('candles', 6, 7);
      sp('stove', 2, 0); sp('barrel', 0, 0); sp('crate', 0, 1); sp('table', 2, 2);   /* cozinha */
      sp('bed', 3, 0, { h: 2 }); sp('chest', 4, 0);   /* quarto do criado */
      sp('candles', 5, 0); }
    else if (fl === 1) { for (const q of [[3, 0], [3, 1]]) taken.add(key(Math.floor(seatMapU(b, q[0] + 0.5)), Math.floor(seatMapV(b, fl, q[1] + 0.5))));   /* debaixo da janela */
      sp('candles', 5, 0);
      sp('shelf', 0, 4); sp('shelf', 0, 5); if (sp('desk', 1, 5, { w: 2 })) sp('chair', 1, 6, { seat: 3 }); sp('fireplace', 0, 7); sp('rug', 1, 3, { w: 2, block: false });   /* escritório do lorde */
      sp('bed', 4, 5, { w: 2, h: 2, v: 1 }); sp('strongbox', 6, 7, { v: 1 }); sp('chest', 3, 7); sp('mirror', 6, 3, { block: false }); sp('rug', 4, 3, { w: 2, block: false }); }   /* quarto do casal com o cofre */
    else { sp('crate', 0, 0); sp('barrel', 2, 0); sp('crate', 0, 3); sp('barrel', 0, 4); sp('chest', 2, 6); sp('crate', 0, 7);   /* depósito */
      sp('bed', 5, 0, { h: 2 }); sp('chest', 6, 0); sp('rack', 6, 4); if (sp('table', 4, 6)) sp('chair', 5, 6, { seat: 5 }); sp('rug', 4, 2, { w: 2, block: false }); }   /* quarto do herdeiro */
    return { F, npc: null };
  }
  if (fl < 0 && k !== 'velvet') {   // porão: o cofre do banco (ouro, barras e baús) ou a adega (barris e caixotes); velas para iluminar
    if (k === 'bank') { put('goldsacks', 0, 0); put('goldbars', 1, 0); put('chest', 2, 0); put('goldbars', 4, 0); put('goldsacks', 5, 0); put('chest', 6, 0); put('goldsacks', 7, 0); for (let j = 3; j < h - 1; j += 2) { put('chest', 0, j); put('goldbars', w - 1, j); } put('goldsacks', 0, h - 1); put('goldbars', w - 1, h - 1); put('candles', 2, h - 1); put('candles', w - 3, h - 1); put('rug', 2, 4, { w: Math.max(1, w - 4), h: 3, block: false }); }
    else { for (let i = 0; i < w; i++) put('barrel', i, 0); for (let j = 2; j < h; j++) { put(j % 2 ? 'barrel' : 'crate', 0, j); put(j % 2 ? 'crate' : 'barrel', w - 1, j); } put('table', Math.floor(w / 2), h - 2); put('candles', Math.floor(w / 2) - 1, h - 1); put('hay', w - 2, h - 1); }
    return { F, npc: null };
  }
  if (fl > 0 && k === 'shop' && b.v === 6) {   // observatório da alquimista: telescópio, mapa celeste, orbe e livros
    if (!put('cot', w - 1, 0, { h: 2 })) if (!put('cot', w - 2, 0, { h: 2 })) put('cot', w - 1, 1, { h: 2 });   /* a cama da Morgana, num canto do observatório */
    put('orb', 0, 0); put('spellbooks', 1, 0); for (const i of [2, 3]) put('shelf', i, 0, { v: 7 }); put('telescope', w - 3, 2); put('starrug', 1, 1, { w: 3, h: 2, block: false }); put('still', 0, h - 1); put('cauldron', 0, 2);
    return { F, npc: null };
  }
  if (fl > 0 && k !== 'dojo' && k !== 'tower' && k !== 'velvet') {   /* o prédio do dojô tem os andares de apartamentos próprios */
    // andares de cima: quartos, depósitos e aposentos
    if (k === 'castle') { put('bed', 2, 0, { w: 2, h: 2, v: 1 }); put('chest', 4, 0); put('shelf', 5, 0); put('shelf', 6, 0); put('fireplace', w - 3, 0); if (put('table', 6, 4, { w: 2 })) { put('chair', 5, 4); put('chair', 8, 4); } put('banner', 0, 3); put('banner', 0, 6); put('candles', w - 1, 3); put('rug', 4, 3, { w: 4, h: 3, block: false }); }
    else if (k === 'tavern' && fl === 1) {   // mezanino: a sala de cima, com mesas, barris, garrafas nas paredes, réstias, lustres e o corrimão no lado aberto
      put('mezzrail', 0, h - 1, { w: w, block: false }); put('wheel', 3, 2, { block: false }); put('kilim', 1, 3, { w: 2, h: 2, block: false });
      put('barrel', 0, 0); put('barrel', 1, 0); put('crate', 2, 0); put('crate', 0, 1);
      put('table', 1, 1, { w: 2 }); put('pew', 1, 2, { w: 2, seat: 3 }); put('barrel', 0, 3); put('bottles', w - 1, 2);   /* entre as janelas */ put('table', 4, 3, { w: 2 }); put('pew', 4, 4, { w: 2, seat: 3 });
      if (h >= 8) { if (put('table', 1, 5)) { put('chair', 0, 5, { seat: 1 }); put('chair', 2, 5, { seat: 5 }); } put('table', 4, 6, { w: 2 }); put('pew', 4, 7, { w: 2, seat: 3 }); put('wheel', 3, 6, { block: false }); put('barrel', w - 1, 5); put('garlic', w - 1, h - 2, { block: false }); put('bottles', w - 1, 6); put('beamlamp', 5, 5, { block: false }); put('crate', 0, h - 3); }
      else { put('crate', 0, 3); put('barrel', 0, 4); } }
    else if (k === 'tavern') { for (const i of [1, 3, 5]) if (i < w - 1) { put('bed', i, 0, { h: 2 }); } put('chest', 2, 0); put('chest', 4, 0); if (put('table', 2, h - 2)) put('chair', 3, h - 2); put('barrel', w - 1, h - 1); put('rug', 2, 3, { w: 3, block: false }); }
    else if (k === 'barracks') { for (const i of [1, 2, w - 2]) put('bunk', i, 0, { h: 2 }); put('rack', 3, 0); put('chest', 1, h - 1); put('chest', w - 2, h - 1); }
    else if (k === 'bank') { for (let i = 0; i < Math.min(7, w); i++) put('cot', i, 0, { h: 2 }); put('chest', 0, 3); put('chest', w - 1, 3); if (put('table', 2, h - 3, { w: 2 })) { put('chair', 1, h - 3); put('chair', 4, h - 3); } put('shelf', w - 1, h - 1); put('rug', 2, 3, { w: Math.max(1, w - 4), block: false }); }   /* dormitório dos funcionários do banco */
    else if (k === 'shop') { for (let i = 1; i < w - 1; i++) put(i % 2 ? 'crate' : 'barrel', i, 0); put('shelf', 0, h - 2); put('shelf', w - 1, h - 2); put('crate', 1, h - 1); put('barrel', w - 2, h - 1); }
    else if (fl === 1) { put('bed', 1, 0, { h: 2 }); put('chest', 2, 0); put('shelf', 0, h - 1); if (put('table', w - 2, h - 2)) put('chair', w - 3, h - 2); put('rug', 2, 2, { w: Math.max(1, w - 4), block: false }); }
    else { put('crate', 1, 0); put('barrel', 2, 0); put('bed', 0, h - 2, { h: 2 }); put('crate', w - 1, h - 1); put('rug', 2, 2, { w: Math.max(1, w - 4), block: false }); }
    return { F, npc: null };
  }
  if (k === 'boutique') {
    put('mirror', 0, 0); put('clothrack', 1, 0); put('mannequin', w - 2, 0); put('mannequin', w - 1, 0);
    npcAt(w - 2, 1); put('counter', w - 3, 2, { w: 3, v: 9 }); put('chair', 0, 2, { seat: 1 });
    put('rug', 1, 1, { w: 2, h: 2, v: 9, block: false });
  } else if (k === 'manor') {
    put('bed', 0, 0, { w: 2, h: 2, v: 1 }); put('fireplace', w - 2, 0); put('shelf', 2, 0); put('chest', 3, 0);
    if (put('table', w - 3, 2, { w: 2 })) { put('chair', w - 4, 2, { seat: 1 }); put('chair', w - 1, 2, { seat: 5 }); }
    put('mirror', 0, 3, { block: false }); put('rug', 1, 2, { w: 2, h: 2, v: 9, block: false });
  } else if (k === 'fruithouse') {   // casa da fruteira: cestos e caixotes de fruta, mesa de separar, geleias, réstias penduradas, fogão com tacho de doce
    put('bed', 0, 0, { h: 2 }); put('stove', 2, 0); taken.add(key(2, 1)); put('jamshelf', 3, 0); put('fruitcrate', 4, 0, { v: 0 });
    put('baskets', 1, 0); put('sorttable', 3, 2, { w: 2 }); put('fruitcrate', 4, 3, { v: 1 }); put('baskets', 0, 3, { v: 1 });
    put('garlic', 1, 1, { block: false }); put('garlic', 4, 1, { block: false, v: 1 }); put('rug', 1, 2, { block: false });
  } else if (k === 'workshop' && b.wk === 'bakery' && w === 4) {   // padaria: dois fornos no fundo, padeiro atrás do balcão, vitrine de pães, sacos e cestos
    npcAt(2, 0); put('stove', 0, 0); put('stove', 1, 0); put('shelf', 3, 0); put('counter', 2, 1, { w: 2 }); put('display', 0, 3, { v: 0 }); put('barrel', 3, 3); put('crate', 0, 4); put('rug', 1, 2, { block: false });
  } else if (k === 'workshop') {   // oficina: o artesão no fundo, bancada, caixas e ferramentas do ofício
    npcAt(dc, 0); const wk = b.wk;
    put('table', 0, 1, { w: 2 }); put('crate', w - 1, 0); put('barrel', w - 1, 1); put('shelf', 0, 0);
    if (wk === 'bakery') { put('stove', w - 2, 0); put('stove', w - 3, 0); put('display', 1, 0, { v: 0 }); }
    else if (wk === 'mill' || wk === 'wheat') { put('crate', w - 2, 0); put('hay', 1, 0); }
    else if (wk === 'alch') { put('stove', w - 2, 0); put('shelf', 1, 0); } else if (wk === 'mine') { put('anvil', w - 2, 1); put('rack', 1, 0); } else if (wk === 'saw' || wk === 'carp') { put('rack', 1, 0); put('crate', w - 1, h - 1); } else { put('crate', 1, 0); put('barrel', w - 1, h - 1); }
  } else if (k === 'house' && b.office === 'tattoo') {   // estúdio de tatuagem: a cadeira, a mesa das tintas, o quadro de desenhos e o baú do velho marinheiro
    npcAt(1, 1); put('tatchair', 2, 1, { seat: 7 }); put('inktable', 3, 1); put('flashwall', 1, 0, { w: 2, block: false }); put('anchorprop', 0, 0, { block: false, force: true }); put('crate', w - 1, h - 1); put('barrel', 0, h - 1); put('rug', 1, 2, { w: 2, block: false, force: true });
  } else if (k === 'house' && b.office === 'agency') {   // agência de empregos: balcão com a agenciadora, quadro de candidatos com retratos e banco de espera junto à fachada
    npcAt(1, 1); put('cairocounter', 1, 2, { h: 2 }); put('niches', 0, 0, { h: 2, block: false, wp: 'left' }); put('jobboard', 0, h - 1, { w: 2, block: false, v: 1, wp: 'front' }); put('kilim', 2, 2, { w: 2, h: 2, block: false }); put('cushion', 3, 2, { block: false }); put('cushion', 3, 3, { block: false });   /* a câmera vê a parede norte e a da porta: Mestre Farid e o balcão ao norte, o quadro ao lado da porta, os candidatos nas almofadas ao sul */
  } else if (k === 'house' && b.office && w >= 5 && h >= 4) {   // escritório do corretor: escrivaninha com livros-razão, mapa emoldurado, quadro de chaves, arquivos, cadeira do cliente e a maquete da cidade
    put('keyboard', 0, 0); npcAt(1, 0); put('desk', 0, 1, { w: 2 }); put('chair', 1, 2, { seat: 3 }); put('filing', w - 1, 0); put('citymodel', w - 2, 2, { w: 2 }); put('filing', 0, h - 1, { v: 1 }); put('mapframe', w - 1, 1, { block: false });
  } else if (k === 'house' && b.office) {   // imobiliária: corretor atrás da mesa, estantes de pastas, mapa da cidade na parede
    npcAt(dc, 0); put('table', dc - 1, 1, { w: 3 }); put('shelf', 0, 0); put('shelf', w - 1, 0); put('banner', dc === 1 ? w - 2 : 1, 0); put('chair', 0, h - 2, { seat: 1 }); put('crate', w - 1, h - 1);
  } else if (k === 'house') {
    put('bed', 0, 0, { h: 2 }); put('fireplace', w - 2, 0);
    for (const i of [w - 1, w - 3, 2, 3]) if (i >= 1 && i < w && can(i, 0) && can(i, 1)) { put('stove', i, 0); taken.add(key(i, 1)); break; }   // a frente do fogão fica livre para cozinhar
    put('chest', 1, 0);
    if (put('table', w - 2, h - 3)) { put('chair', w - 1, h - 3, { seat: 5 }); put('chair', w - 3, h - 3, { seat: 1 }); }
    put('shelf', 0, h - 2); if (h >= 5) put('crate', 0, h - 1);
    put('rug', dc, 1, { block: false });
  } else if (k === 'tower') {   /* Torre do Inventor: planta circular (8 x 8, porta E na coluna 3); o que fica fora do círculo é bloqueado; elevador redondo no centro (3..4 x 3..4), chega-se em (3,5) */
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (Math.hypot(i + 0.5 - w / 2, j + 0.5 - h / 2) > w / 2 - 0.15 && !taken.has(key(i, j))) { taken.add(key(i, j)); F.push({ t: 'blk', i, j, w: 1, h: 1, block: true }); }
    if (fl === 0) {   /* loja de invenções: prateleiras na parede curva do fundo, vitrines, balcão e o Sxan */
      put('invshelf', 2, 0, { w: 2 }); put('invshelf', 4, 0, { w: 2 }); put('gearwall', 7, 4, { h: 2, v: 3, block: false }); put('display', 1, 1); put('display', 6, 1); put('steamclock', 7, 2, { v: 3 }); put('counter', 5, 5, { w: 2 }); npcAt(6, 6); put('display', 0, 4); put('plantpot', 1, 6, { block: false }); put('nrug', 1, 3, { w: 2, h: 2, block: false, force: true });
    } else if (fl === 1) {   /* oficina das encomendas: caldeira, bancadas, caixotes de peças */
      put('boiler', 1, 1, { w: 2, h: 2 }); put('tinkerbench', 4, 0, { w: 2 }); put('gearwall', 2, 0, { w: 2, block: false }); put('tinkerbench', 7, 2, { h: 2, v: 3 }); put('sorttable', 6, 5, { w: 2 }); put('anvil', 0, 4); put('crate', 0, 5); put('crate', 1, 6); put('barrel', 6, 6); put('crate', 2, 7);
    } else if (fl === 2) {   /* laboratório: bobina de faíscas, destilaria, livros */
      put('tesla', 1, 1, { w: 2, h: 2 }); put('distill', 4, 0, { w: 2 }); put('gearwall', 2, 0, { w: 2, block: false }); put('cauldron', 7, 3); put('spellbooks', 0, 4, { v: 1 }); put('orb', 0, 5); put('lab', 6, 5, { w: 2 }); put('crate', 2, 7);
    } else if (fl === 3) {   /* casa do Sxan: escrivaninha, cama, estante e projetos */
      put('desk', 2, 0, { w: 2 }); put('chest', 5, 0); put('bed', 6, 1, { h: 2 }); put('blueprints', 7, 2, { h: 2, v: 3, block: false }); put('bookwall', 7, 4, { h: 2, v: 3 }); put('armchair', 1, 5); put('steamclock', 2, 7, { v: 2 }); put('rug', 1, 3, { w: 2, h: 2, block: false, force: true });
    } else if (fl === 4) {   /* apartamento de luxo: cama grande, baú, lareira e poltronas */
      put('fireplace', 2, 0, { w: 2 }); put('chest', 4, 0); put('platbed', 5, 1, { w: 2, h: 2, block: false }); put('armchair', 1, 2); put('armchair', 1, 4); put('chandelier', 2, 5, { block: false }); put('mirror', 7, 3, { v: 3 }); put('plantpot', 6, 6, { block: false }); put('nrug', 5, 5, { w: 2, h: 1, block: false, force: true });
    } else {   /* observatório no telhado: o grande telescópio e o mapa do céu */
      put('bigscope', 5, 1, { w: 2, h: 2 }); put('starrug', 1, 3, { w: 2, h: 2, block: false }); put('orb', 2, 1); put('mapframe', 7, 4, { v: 3, block: false }); put('armchair', 6, 5); put('steamclock', 7, 3, { v: 3 });
    }
  } else if (k === 'dojo') {   // Dojô do Punho de Ferro (5×8): corredor + elevador ao norte (i 6..7); dojô 6×5 ao sul; andares 1–2 com 2 apartamentos; 3º andar suíte de luxo com ofurô
    const keep = (i, j) => taken.add(key(i, j));
    if (fl === 0) {
      keep(6, 4); put('umbrella', 7, 4, { block: false }); put('andon', 7, 2, { block: false }); put('plantpot', 7, 3, { block: false });
      put('kamiza', 2, 0, { w: 2 }); put('makiwara', 0, 1); put('makiwara', 0, 3); put('mokujin', 5, 1); put('mokujin', 5, 3); put('waitbench', 1, 0, { seat: 7, v: 1, block: false }); put('waitbench', 4, 0, { seat: 7, v: 1, block: false });   /* banquinhos na parede oeste, de frente para o tatame */
      F.push({ t: 'tatami', i: 1, j: 1, w: 4, h: 4, block: false, v: 0 }); put('bokkenrack', 5, 0);   /* tatame por baixo de tudo (pisável, inclusive o caminho da porta) */ put('andon', 0, 0, { block: false }); put('andon', 5, 4, { block: false }); put('andon', 0, 4, { block: false });
    } else if (fl < floorsOf(b) - 1) {
      for (const i of [6, 7]) for (const j of [2, 3, 4]) keep(i, j); keep(4, 4); keep(4, 3); keep(1, 4); keep(1, 3);   // patamar (2 casas) e portas para a varanda livres
      // apto A (i 3..5 e o antigo hall i 6, j 2..4)
      put('futon', 3, 0, { h: 2, block: false }); put('kakejiku', 4, 0, { block: false }); put('tansu', 5, 0); put('andon', 5, 1, { block: false }); put('irori', 4, 2, { block: false }); put('chabudai', 5, 3, { block: false }); put('ikebana', 3, 4, { block: false }); put('byobu', 3, 3, { block: false }); put('plantpot', 5, 4, { block: false });
      // apto B (i 0..2, j 0..4)
      put('futon', 0, 0, { h: 2, block: false }); put('kakejiku', 1, 0, { block: false }); put('tansu', 2, 0); put('andon', 1, 1, { block: false }); put('irori', 1, 2, { block: false }); put('chabudai', 2, 3, { block: false }); put('ikebana', 0, 4, { block: false }); put('byobu', 2, 2, { block: false });
    } else {   // suíte de luxo
      put('plantpot', 7, 4, { block: false }); put('andon', 7, 2, { block: false }); keep(6, 2); keep(5, 2); keep(2, 4); keep(3, 4); keep(2, 3); keep(3, 3);   // porta do hall e porta de correr da varanda livres
      put('ofuro', 0, 0, { w: 2, h: 2, block: false }); put('andon', 0, 2, { block: false });   /* ala do banho (a cortina separa da cama) */
      put('suitechest', 3, 0, { ox: -0.45 }); put('platbed', 4, 0, { w: 2, h: 2, block: false });   /* armário-baú laqueado ao lado da cama, do lado sul */
      put('kotatsu', 3, 2, { block: false, ox: -0.5 }); put('zaisu', 3, 1, { v: 0, block: false, ox: -0.5 }); put('zaisu', 3, 3, { v: 2, block: false, force: 1, ox: -0.5 }); put('zaisu', 2, 2, { v: 1, block: false, ox: -0.3 }); put('zaisu', 4, 2, { v: 3, block: false, ox: -0.7 });   /* meio tile ao sul: centralizado entre a cama e a banheira */   /* mesinha centralizada com quatro cadeiras baixas (zaisu) */ put('zengarden', 0, 3, { w: 2, h: 2 }); put('jkitchen', 4, 4, { w: 2 });   /* cozinha no canto perto da varanda */
    }
  } else if (k === 'shop' && b.deco === 'greenhouse') {   // Boticário de Elva: gavetinhas e potes no fundo, alambique, balcão com balança e almofariz, canteiros, plantas que brilham, vasos pendurados, ervas secando e o tanque
    if (w === 5 && h === 5 && (b.realDoor || b.door) === 'N') {   /* porta no fundo da vista: o alto fica na parede direita, o baixo do lado da câmera */
      put('drawers', w - 1, 0, { h: 3 }); npcAt(w - 2, 1); put('distill', w - 2, 0); put('apothcounter', w - 3, 2, { w: 2 });
      put('planter', 0, 0, { h: 3 }); put('pond', 1, 1, { block: false }); put('herbrack', 1, 0, { w: 2, block: false }); put('hangpot', 1, 3, { block: false }); put('glowplant', 0, h - 1); put('glowplant', w - 1, h - 1); put('glowplant', w - 1, 3);
    } else { npcAt(dc, 0); if (dc >= 1) put('drawers', 0, 0, { w: dc }); if (w - 2 - dc >= 1) put('drawers', dc + 1, 0, { w: w - 2 - dc }); put('distill', w - 1, 0);
      if (dc >= 1) put('apothcounter', 0, 1, { w: dc }); if (w - 1 - dc >= 1) put('apothcounter', dc + 1, 1, { w: w - 1 - dc });
      if (h >= 5) { put('herbrack', 1, 2, { w: w - 2, block: false }); put('planter', 0, 2, { h: 2 }); put('planter', w - 1, 2, { h: 2 }); put('hangpot', 1, 3, { block: false }); put('pond', w - 2, 3, { block: false }); put('glowplant', 0, h - 1); put('glowplant', w - 1, h - 1); } }
  } else if (k === 'shop' && b.deco === 'arcane') {   // Arcanos & Varinhas: paredes de caixinhas até o teto, escada de rodinhas, balcão de veludo e a bancada do artesão
    npcAt(dc, 0); for (let i = 0; i < w; i++) if (i !== dc) put('wandwall', i, 0); for (let j = 1; j < h - 1; j++) put('wandwall', 0, j);
    if (dc - 1 >= 1) put('wandcounter', 1, 1, { w: dc - 1 }); put('libladder', 1, 2, { block: false }); put('carvebench', w - 1, 2, { h: 2 }); if (w - 2 - dc >= 1) put('wandcounter', dc + 1, 1, { w: w - 2 - dc });
    put('chair', w - 2, 3, { seat: 1 }); put('crate', 0, h - 1);
  } else if (k === 'shop' && b.deco === 'tailor') {   // Alfaiataria Real: tecidos até o teto, mesa de costura mágica, banquinho de provas com espelhos, manequins e o vestido de baile
    npcAt(dc, 0); for (let i = 0; i < w; i++) if (i !== dc) put('fabricwall', i, 0); for (let j = 1; j < h - 1; j++) put('fabricwall', w - 1, j);
    if (dc - 1 >= 1) put('sewtable', 1, 1, { w: dc - 1 }); if (w - 2 - dc >= 1) put('counter', dc + 1, 1, { w: w - 2 - dc, v: 3 });
    if (h >= 5) { put('fitstool', dc, 2, { block: false }); put('gown', 0, 2); put('mannequin2', 0, 3, { v: 1 }); put('mannequin2', 1, 3, { v: 0 }); put('mannequin2', w - 2, 3, { v: 2 }); }
    else { put('gown', 0, 2); put('fitstool', 1, 2, { block: false }); put('mannequin2', w - 2, 2, { v: 1 }); }
  } else if (k === 'shop' && b.v === 6) {   // Elixires da Lua Prateada
    npcAt(dc, 0); for (let i = 0; i < w; i++) if (i !== dc) put('shelf', i, 0, { v: 7 });   // estantes de frascos brilhando
    put('counter', 1, 1, { w: dc - 1, v: 6 }); if (w - 2 - dc >= 1) put('counter', dc + 1, 1, { w: w - 2 - dc, v: 6 });
    put('still', 0, h - 2); put('orb', w - 1, h - 2); put('cauldron', w - 1, 2); put('spellbooks', 0, 2); put('garlic', 1, 2, { block: false, v: 2 }); put('starrug', dc - 1, 2, { w: 3, h: 2, block: false });
  } else if (k === 'shop' && b.blank) {   // loja vazia (à espera de um dono): prateleiras no fundo e um balcão
    for (let i = 0; i < w; i++) if (i !== dc) put('shelf', i, 0, { v: b.v });
  } else if (k === 'shop') {
    npcAt(dc, 0);
    for (let i = 0; i < w; i++) if (i !== dc) put('shelf', i, 0, { v: b.v });
    if (dc - 1 >= 1) put('counter', 1, 1, { w: dc - 1, v: b.v }); if (w - 2 - dc >= 1) put('counter', dc + 1, 1, { w: w - 2 - dc, v: b.v });   // balcão com passagem na frente do balconista
    put('display', 0, h - 2, { v: b.v }); put('display', w - 1, h - 2, { v: b.v });
    if (b.v === 3) put('mannequin', w - 1, 2); else if (b.v === 2) put('orb', w - 1, 2); else if (b.v === 1) put('cauldron', w - 1, 2); else put('crate', w - 1, 2);
  } else if (k === 'smith') {
    put('forge', 0, 0, { w: 2 }); npcAt(3, 1); put('anvil', 4, 1); put('barrel', 4, 0);
    for (let j = 0; j < 3; j++) put('rack', w - 1, j);
    put('trough', 0, 2, { w: 2 });
  } else if (k === 'tavern' && w === 7 && h >= 6) {   // taverna-celeiro: barris com torneiras e balcão, lareira enorme na parede da direita, palco do bardo, lustre de roda, mesas e bancos
    npcAt(1, 0); put('taps', 0, 0); put('bar', 0, 1, { w: 2 }); put('bottles', 6, 0); put('champs', 6, 1, { block: false });
    put('hearth', w - 1, 2, { h: 2 }); put('stage', w - 2, h - 1, { w: 2, block: false }); put('wheel', 3, 2, { block: false }); put('beamlamp', 5, 1, { block: false });
    if (put('table', 2, 2)) { put('chair', 2, 3, { seat: 3 }); }
    if (put('table', 1, 4)) { put('chair', 0, 4, { seat: 1 }); put('chair', 2, 4, { seat: 5 }); }
    put('table', 4, 3, { w: 2 }); put('pew', 4, 4, { w: 2, seat: 3 });
    if (h >= 9) { if (put('table', 1, 6)) { put('chair', 0, 6, { seat: 1 }); put('chair', 2, 6, { seat: 5 }); } put('table', 4, 6, { w: 2 }); put('pew', 4, 7, { w: 2, seat: 3 }); }   /* cidade nova: 3 casas a mais de fundo, mais duas mesas */
  } else if (k === 'tavern') {
    npcAt(1, 0); put('barrel', 0, 0); put('counter', 0, 1, { w: 2 }); put('barrel', 0, 2);   /* passagem atrás do balcão pelo lado */
    put('fireplace', w - 2, 0); put('shelf', 3, 0); for (const [i, j, fi, fj] of [[4, 0, 4, 1], [w - 1, 1, w - 2, 1], [w - 1, 2, w - 2, 2]]) if (can(i, j) && can(fi, fj)) { put('stove', i, j); taken.add(key(fi, fj)); break; }
    for (const [ti, tj] of [[5, 2], [1, 3], [5, 4]]) if (put('table', ti, tj)) { put('chair', ti - 1, tj, { seat: 1 }); put('chair', ti + 1, tj, { seat: 5 }); }
  } else if (k === 'hotel' && w === 7 && h === 7) {   // 3 cabines (2x2): duas no fundo, uma na frente; balcão da Ilsa junto à entrada, salinha com mesa
    put('cot', 0, 0, { h: 2, cab: 0 }); put('chest', 1, 0, { cab: 0 }); put('hpart', 0, 2, { v: 0, wp: 'nz' }); put('cabindoor', 1, 2, { v: 0, block: false, cab: 0, adj: [1, 3], inner: [[0, 0], [1, 0], [0, 1], [1, 1]] });
    put('cot', 3, 0, { h: 2, cab: 1 }); put('chest', 4, 0, { cab: 1 }); put('hpart', 3, 2, { v: 0, wp: 'nz' }); put('cabindoor', 4, 2, { v: 0, block: false, cab: 1, adj: [4, 3], inner: [[3, 0], [4, 0], [3, 1], [4, 1]] });
    put('hpart', 0, 4, { v: 0, wp: 'pz' }); put('cabindoor', 1, 4, { v: 0, block: false, cab: 2, adj: [1, 3], inner: [[0, 5], [1, 5], [0, 6], [1, 6]] }); put('cot', 0, 5, { h: 2, cab: 2 }); put('chest', 1, 6, { cab: 2 });
    for (const j of [0, 1]) { put('hpart', 2, j, { v: 1, wp: 'px nx' }); put('hpart', 5, j, { v: 1, wp: 'nx' }); } put('hpart', 2, 2, { v: 2 }); put('hpart', 5, 2, { v: 2 });
    put('hpart', 2, 4, { v: 2 }); put('hpart', 2, 5, { v: 1, wp: 'nx' }); put('hpart', 2, 6, { v: 1, wp: 'nx' });
    put('fireplace', 6, 0); npcAt(6, 1); put('counter', 6, 2); put('table', 3, 5, { w: 2 }); put('pew', 3, 6, { w: 2, seat: 3 }); put('barrel', 5, 6); put('rug', 3, 3, { w: 3, h: 2, block: false, v: 9 });
  } else if (k === 'hotel' && w === 9 && h === 9) {   // cidade nova: 5 cabines (3 no fundo, 2 nos cantos da frente), corredor no meio, balcão da Ilsa junto à entrada
    let ck = 0;
    for (const a of [0, 3, 6]) { const q = ck++, ww = a === 6 ? 3 : 2, inn = []; for (let i = a; i < a + ww; i++) for (let j = 0; j < 2; j++) inn.push([i, j]);
      put('cot', a, 0, { h: 2, cab: q }); put('chest', a + 1, 0, { cab: q }); for (let i = a; i < a + ww; i++) if (i !== a + 1) put('hpart', i, 2, { v: 0, wp: 'nz' }); put('cabindoor', a + 1, 2, { v: 0, block: false, cab: q, adj: [a + 1, 3], inner: inn }); }
    for (const a of [0, 7]) { const q = ck++, inn = [], dI = a === 0 ? 1 : 7; for (let i = a; i < a + 2; i++) for (let j = 6; j < 9; j++) inn.push([i, j]);
      put('hpart', a === 0 ? 0 : 8, 5, { v: 0, wp: 'pz' }); put('cabindoor', dI, 5, { v: 0, block: false, cab: q, adj: [dI, 4], inner: inn }); put('cot', a === 0 ? 0 : 8, 7, { h: 2, cab: q }); put('chest', a === 0 ? 1 : 7, 8, { cab: q }); }
    for (const j of [0, 1]) { put('hpart', 2, j, { v: 1, wp: 'px nx' }); put('hpart', 5, j, { v: 1, wp: 'px nx' }); } put('hpart', 2, 2, { v: 2 }); put('hpart', 5, 2, { v: 2 });
    for (const j of [6, 7, 8]) { put('hpart', 2, j, { v: 1, wp: 'px nx' }); put('hpart', 6, j, { v: 1, wp: 'px nx' }); } put('hpart', 2, 5, { v: 2 }); put('hpart', 6, 5, { v: 2 });
    npcAt(5, 6); put('counter', 5, 7); put('table', 3, 6); put('pew', 3, 7, { seat: 3 }); put('rug', 2, 3, { w: 5, h: 2, block: false, v: 9 });
  } else if (k === 'hotel' && w === 9 && h === 8 && b.dcol === 7) {   // 4 cabines compactas (2x2), corredor de 2 tiles, balcão na ponta norte
    let ck = 0;
    for (const a of [0, 3]) { const q = ck++, inn = [[a, 0], [a + 1, 0], [a, 1], [a + 1, 1]]; put('cot', a, 0, { h: 2, cab: q }); put('chest', a + 1, 0, { cab: q }); put('hpart', a, 2, { v: 0, wp: 'nz' }); put('cabindoor', a + 1, 2, { v: 0, block: false, cab: q, adj: [a + 1, 1], inner: inn }); }
    for (const a of [0, 3]) { const q = ck++, inn = [[a, 6], [a + 1, 6], [a, 7], [a + 1, 7]]; put('hpart', a, 5, { v: 0, wp: 'pz' }); put('cabindoor', a + 1, 5, { v: 0, block: false, cab: q, adj: [a + 1, 6], inner: inn }); put('cot', a, 6, { h: 2, cab: q }); put('chest', a + 1, 7, { cab: q }); }
    for (const c of [2, 5]) { const wp = c === 2 ? 'px nx' : 'nx'; put('hpart', c, 0, { v: 1, wp }); put('hpart', c, 1, { v: 1, wp }); put('hpart', c, 2, { v: 2 }); put('hpart', c, 5, { v: 2 }); put('hpart', c, 6, { v: 1, wp }); put('hpart', c, 7, { v: 1, wp }); }
    put('shelf', 8, 0); put('fireplace', 6, 0); npcAt(7, 0); put('counter', 7, 1); put('rug', 3, 3, { w: 4, h: 2, block: false, v: 9 });
  } else if (k === 'hotel' && w === 9 && h >= 10 && b.dcol === 7) {   // 4 cabines (2x3), corredor de 2 tiles, balcão e entrada na ponta norte
    let ck = 0;
    for (const a of [0, 3]) { const q = ck++, inn = []; for (let i = a; i < a + 2; i++) for (let j = 0; j < 3; j++) inn.push([i, j]);
      put('cot', a, 0, { h: 2, cab: q }); put('chest', a + 1, 0, { cab: q }); put('hpart', a, 3, { v: 0, wp: 'nz' }); put('cabindoor', a + 1, 3, { v: 0, block: false, cab: q, adj: [a + 1, 2], inner: inn }); }
    for (const a of [0, 3]) { const q = ck++, inn = []; for (let i = a; i < a + 2; i++) for (let j = 7; j < 10; j++) inn.push([i, j]);
      put('hpart', a, 6, { v: 0, wp: 'pz' }); put('cabindoor', a + 1, 6, { v: 0, block: false, cab: q, adj: [a + 1, 7], inner: inn }); put('cot', a, 8, { h: 2, cab: q }); put('chest', a + 1, 9, { cab: q }); }
    for (const c of [2, 5]) { const wp = c === 2 ? 'px nx' : 'nx'; for (const j of [0, 1, 2]) put('hpart', c, j, { v: 1, wp }); put('hpart', c, 3, { v: 2 }); put('hpart', c, 6, { v: 2 }); for (const j of [7, 8, 9]) put('hpart', c, j, { v: 1, wp }); }
    put('shelf', 8, 0); put('fireplace', 6, 0); npcAt(7, 0); put('counter', 7, 1);
    put('table', 8, 7, { h: 2 }); put('rug', 3, 4, { w: 4, h: 2, block: false, v: 9 });
  } else if (k === 'hotel' && w >= 11 && h >= 10 && w < 15 && b.dcol === 8) {   // 4 cabines grandes (3x3), corredor de 2 tiles, balcão e entrada na ponta norte
    let ck = 0;
    for (const a of [0, 4]) { const q = ck++, inn = []; for (let i = a; i < a + 3; i++) for (let j = 0; j < 3; j++) inn.push([i, j]);
      put('cot', a, 0, { h: 2, cab: q }); put('chest', a + 2, 0, { cab: q }); put('hpart', a, 3, { v: 0, wp: 'nz' }); put('hpart', a + 2, 3, { v: 0, wp: 'nz' }); put('cabindoor', a + 1, 3, { v: 0, block: false, cab: q, adj: [a + 1, 2], inner: inn }); }
    for (const a of [0, 4]) { const q = ck++, inn = []; for (let i = a; i < a + 3; i++) for (let j = 7; j < 10; j++) inn.push([i, j]);
      put('hpart', a, 6, { v: 0, wp: 'pz' }); put('hpart', a + 2, 6, { v: 0, wp: 'pz' }); put('cabindoor', a + 1, 6, { v: 0, block: false, cab: q, adj: [a + 1, 7], inner: inn }); put('cot', a, 8, { h: 2, cab: q }); put('chest', a + 2, 9, { cab: q }); }
    for (const c of [3, 7]) { const wp = c === 3 ? 'px nx' : 'nx'; for (const j of [0, 1, 2]) put('hpart', c, j, { v: 1, wp }); put('hpart', c, 3, { v: 2 }); put('hpart', c, 6, { v: 2 }); for (const j of [7, 8, 9]) put('hpart', c, j, { v: 1, wp }); }
    put('shelf', 10, 0); put('fireplace', 8, 0); npcAt(9, 0); put('counter', 9, 1);
    put('table', 10, 7, { h: 2 }); put('rug', 4, 4, { w: 4, h: 2, block: false, v: 9 });
  } else if (k === 'hotel' && w >= 11 && h >= 10 && w < 15) {   // 6 cabines (3 no fundo, 3 do outro lado do corredor), Ilsa no canto do fundo, sala comum na entrada
    let ck = 0; const wpP = c => 'px nx';
    for (const a of [0, 3, 6]) { const q = ck++; put('cot', a, 0, { h: 2, cab: q }); put('chest', a + 1, 0, { cab: q }); put('hpart', a, 2, { v: 0, wp: 'nz' }); put('cabindoor', a + 1, 2, { v: 0, block: false, cab: q, adj: [a + 1, 1], inner: [[a, 0], [a + 1, 0], [a, 1], [a + 1, 1]] }); }
    for (const c of [2, 5, 8]) { put('hpart', c, 0, { v: 1, wp: c === 8 ? 'nx' : wpP(c) }); put('hpart', c, 1, { v: 1, wp: c === 8 ? 'nx' : wpP(c) }); put('hpart', c, 2, { v: 2 }); }
    put('shelf', 10, 0); put('fireplace', 9, 0); npcAt(10, 1); put('counter', 10, 2);
    for (const a of [0, 6, 9]) { const q = ck++; put('hpart', a, 4, { v: 0, wp: 'pz' }); put('cabindoor', a + 1, 4, { v: 0, block: false, cab: q, adj: [a + 1, 5], inner: [[a, 5], [a + 1, 5], [a, 6], [a + 1, 6]] }); put('cot', a, 5, { h: 2, cab: q }); put('chest', a + 1, 6, { cab: q }); put('hpart', a, 7, { v: 0, wp: 'nz' }); put('hpart', a + 1, 7, { v: 0, wp: 'nz' }); }
    for (const c of [2, 5, 8]) { put('hpart', c, 4, { v: 2 }); put('hpart', c, 5, { v: 1, wp: c === 2 ? 'nx' : c === 5 ? 'px' : 'px nx' }); put('hpart', c, 6, { v: 1, wp: c === 2 ? 'nx' : c === 5 ? 'px' : 'px nx' }); put('hpart', c, 7, { v: 2 }); }
    put('table', 0, 8, { w: 3 }); put('pew', 0, 9, { w: 3, seat: 3 }); put('table', 7, 8, { w: 4 }); put('pew', 7, 9, { w: 4, seat: 3 }); put('rug', 3, 4, { w: 2, h: 4, block: false, v: 9 });
  } else if (k === 'hotel' && w >= 15 && h >= 10) {   // 8 cabines com porta (4 no fundo, 4 do outro lado do corredor), balcão da Ilsa no fim do corredor, sala comum na entrada
    const cabs = [0, 3, 10, 13], posts = [2, 5, 9, 12], wpPost = c => c === 5 ? 'nx' : c === 9 ? 'px' : 'px nx'; let ck = 0;
    for (const a of cabs) { const q = ck++; put('cot', a, 0, { h: 2, cab: q }); put('chest', a + 1, 0, { cab: q }); put('hpart', a, 2, { v: 0, wp: 'nz' }); put('cabindoor', a + 1, 2, { v: 0, block: false, cab: q, adj: [a + 1, 1], inner: [[a, 0], [a + 1, 0], [a, 1], [a + 1, 1]] }); }
    for (const c of posts) { put('hpart', c, 0, { v: 1, wp: wpPost(c) }); put('hpart', c, 1, { v: 1, wp: wpPost(c) }); put('hpart', c, 2, { v: 2 }); }
    for (const a of cabs) { const q = ck++; put('hpart', a, 4, { v: 0, wp: 'pz' }); put('cabindoor', a + 1, 4, { v: 0, block: false, cab: q, adj: [a + 1, 5], inner: [[a, 5], [a + 1, 5], [a, 6], [a + 1, 6]] }); put('cot', a, 5, { h: 2, cab: q }); put('chest', a + 1, 6, { cab: q }); put('hpart', a, 7, { v: 0, wp: 'nz' }); put('hpart', a + 1, 7, { v: 0, wp: 'nz' }); }
    for (const c of posts) { put('hpart', c, 4, { v: 2 }); put('hpart', c, 5, { v: 1, wp: wpPost(c) }); put('hpart', c, 6, { v: 1, wp: wpPost(c) }); put('hpart', c, 7, { v: 2 }); }
    put('shelf', 6, 0); npcAt(7, 0); put('fireplace', 8, 0); put('counter', 6, 1, { w: 2 });   // balcão no fim do corredor, lareira atrás
    put('table', 0, 8, { w: 4 }); put('pew', 0, 9, { w: 4, seat: 3 }); put('table', 11, 8, { w: 4 }); put('pew', 11, 9, { w: 4, seat: 3 });   // sala comum
    put('barrel', 5, 9); put('barrel', 9, 9); put('rug', 6, 4, { w: 3, h: 4, block: false, v: 9 });
  } else if (k === 'hotel') {   // (pousada antiga, se o prédio for pequeno)
    for (let r = 0; r < Math.floor(w / 2); r++) { put('cot', r * 2, 0, { h: 2 }); put('chest', r * 2 + 1, 0); }
    npcAt(w - 2, h - 1);
  } else if (k === 'bank' && w >= 8 && h >= 10) {   // salão de mármore: cofre redondo no fundo com o tesouro atrás das grades, balcões altos dos dois lados (banqueiros longe das paredes), sala de espera na entrada
    const R = w - 8;   /* cidade nova: 9 de largura e 11 de fundo */
    put('vault', 2, 0, { w: 4 + R }); put('goldsacks', 0, 0); put('goldbars', 1, 0); put('goldbars', 6 + R, 0); put('goldsacks', 7 + R, 0); for (const i of [0, 1, 6 + R, 7 + R]) put('bars', i, 1, { v: 0 });
    npc = { i: 1, j: 3 }; for (const [i, j] of [[6 + R, 3], [1, 6], [6 + R, 6], [1, 9], [6 + R, 9], [2, h - 1]]) taken.add(key(i, j));
    for (const j of [3, 6, 9]) { put('bankdesk', 2, j, { v: 1 }); put('bankdesk', 5 + R, j, { v: 2 }); }
    put('rug', 3, 2, { w: 2 + R, h: h - 3, block: false, v: 9 }); for (const j of [3, 6, 9]) put('chandelier', 3, j, { w: 2 + R, block: false });
    put('pillar', 0, h - 2); put('pillar', 7 + R, h - 2); put('pew', 6 + R, h - 1, { w: 2, seat: 3 }); put('clock', 0, 4, { block: false }); put('ratesboard', 7 + R, 4, { block: false });
  } else if (k === 'bank' && w >= 6 && h >= 10) {   // estilo Gringotes: corredor de mármore com balcões altos dos dois lados, banqueiros atrás, lustres, cofre redondo no fundo
    put('vault', 1, 0, { w: 4 }); put('rails', 0, 0); put('goldsacks', w - 1, 0);
    for (const j of [2, 3, 5, 6, 8, 9]) { put('bankdesk', 1, j, { v: 1 }); put('bankdesk', w - 2, j, { v: 2 }); }   // vãos em 4 e 7 para passar por trás
    npc = { i: 0, j: 3 }; for (const [i, j] of [[w - 1, 3], [0, 6], [w - 1, 6], [0, 9], [w - 1, 9], [w - 2, h - 2]]) taken.add(key(i, j));
    put('rug', 2, 1, { w: 2, h: h - 2, block: false, v: 9 }); for (const j of [2, 5, 8]) put('chandelier', 2, j, { w: 2, block: false });
    put('pillar', 1, h - 2);
  } else if (k === 'bank') {   // salão comprido: mesas altas dos banqueiros dos dois lados, tapete no meio e a porta redonda do cofre no fundo
    put('vault', dc - 1, 0, { w: 3 }); npcAt(dc, 1);
    if (h >= 7) { for (let j = 2; j < h - 2; j += 2) { put('bankdesk', 1, j, { v: 1 }); put('bankdesk', w - 2, j, { v: 2 }); } put('rug', dc, 2, { h: h - 4, block: false }); }
    else { for (let i = 1; i < w - 1; i++) if (Math.abs(i - dc) > 1) put('bankdesk', i, 2, { v: 1 }); put('rug', dc, 2, { h: h - 2, block: false }); }   /* salão largo: fila de mesas altas dos dois lados do corredor até o cofre */
    put('candles', 0, 1); put('candles', w - 1, 1);
  } else if (k === 'club') {   /* Clube do Cervo de Prata: lareira e poltronas, mesas de cartas, xadrez, estante e bar */
    const cc = Math.floor(w / 2);   /* a lareira no meio do fundo (a porta pode estar no canto) */
    put('fireplace', cc, 0); put('armchair', cc - 1, 2, { v: 2 }); put('armchair', cc + 1, 2, { v: 2 }); put('bookwall', 0, 0, { h: 3 }); put('clubbar', w - 1, 1, { h: 3 });
    put('cardtable', 1, 4, { w: 2, h: 2 }); put('cardtable', w - 3, 4, { w: 2, h: 2 }); put('chesstable', 1, h - 2); put('chesstable', w - 2, h - 2); put('nrug', cc - 1, 1, { w: 4, h: 3, block: false, force: true }); put('chandelier', cc, 4, { block: false, force: true });
  } else if (k === 'baths') {   /* Termas de Aurora: piscina quente com vapor, duas frias, colunas, bancos de mármore e perfumes */
    /* as piscinas, a cascata e as paredes vêm da planta (THERMAE); aqui só os móveis */
    put('tcascade', 9, 8, { w: 3 }); put('labrum', 1, 18, { w: 2 });
    put('tbench', 2, 19, { w: 2 }); put('tbench', 9, 19, { w: 2 }); put('tdesk', 8, 17, { block: false });
    put('tmassage', 0, 8, { w: 2 }); put('tmassage', 0, 11, { w: 2 }); put('winetable', 2, 13);
    put('tbench', 0, 1, { w: 1, h: 2, block: false }); put('tbench', 12, 1, { w: 1, h: 2, block: false }); put('tbench', 0, 4, { w: 1, h: 2, block: false }); put('tbench', 12, 4, { w: 1, h: 2, block: false });   /* sala quente maior: mais bancos de mármore */
    for (const [i, j] of [[0, 0], [12, 0], [12, 15], [0, 15], [0, 6], [12, 6]]) put('brazier', i, j);
  } else if (k === 'velvet' && fl === 3) {   /* Casa de Veludo, 3º andar: a suíte master (quarto ao norte, sala de estar a oeste, banho a leste, hall e a varanda para a rua ao sul) */
    put('vlift', 11, 2, { w: 2, h: 2, block: false, force: true }); put('vvoid', 3, 3, { w: 7, h: 6, force: true });
    put('vwardrobe', 0, 0, { w: 2, h: 1 }); put('vnight', 4, 0); put('vmoonbed', 5, 0, { w: 3, h: 2 }); put('vnight', 8, 0); put('vdivan', 9, 0, { w: 2, h: 1 }); put('vvanity', 12, 0);
    put('vgramo', 0, 3); put('vsofa', 0, 5, { h: 2, v: 1, seats: [[0.45, 5.6, 1], [0.45, 6.4, 1]] }); put('varm', 1, 4, { seat: 7 }); put('vtea', 1, 6, { c: 3 }); put('varm', 1, 8, { seat: 3 }); put('vplant', 0, 9);
    put('vscreen', 10, 5, { c: 3 }); put('vtub', 10, 6, { w: 3, h: 3 }); put('vwash', 12, 9); put('vplant', 12, 10); put('vside', 3, 10); put('vside', 9, 10);
    for (const [i, j, w, h, c] of [[5, 9, 3, 2, 0], [4, 0, 1, 1, 1]]) if (w > 1) put('vrug', i, j, { w, h, block: false, force: true, c });
  } else if (k === 'velvet' && fl > 0) {   /* Casa de Veludo, 1º e 2º andar: quartos 1 a 3 ao norte (cortina na entrada), galerias em volta do vão, elevador no leste */
    put('vlift', 11, 2, { w: 2, h: 2, block: false, force: true }); put('vvoid', 3, 3, { w: 7, h: 6, force: true });
    put('vbed', 0, 0, { w: 2, h: 2, c: fl }); put('vscreen', 3, 0, { c: fl }); put('vtea', 3, 1, { c: fl });
    put('vbed', 4, 0, { w: 2, h: 2, c: fl }); put('vscreen', 8, 0, { c: fl }); put('vtea', 8, 1, { c: fl });
    put('vbed', 11, 0, { w: 2, h: 2, c: fl }); put('vscreen', 9, 0, { c: fl }); put('vtea', 10, 0, { c: fl });
    put('vbench', 0, 5, { h: 2, v: 1, seats: [[0.4, 5.6, 1], [0.4, 6.4, 1]] }); put('vplant', 0, 8); put('vvase', 2, 10); put('vbench', 12, 6, { h: 2, v: 3, seats: [[12.6, 6.6, 5], [12.6, 7.4, 5]] }); put('vplant', 12, 10); put('vplant', 3, 10); put('vvase', 9, 10);
    for (const [i, j, c] of [[1, 3, 0], [11, 4, 2]]) put('vrug', i, j, { w: 1, h: 1, block: false, force: true, c });
  } else if (k === 'velvet' && fl === -1) {   /* Casa de Veludo, porão: escritório da Dama Ysolde (noroeste), adega (nordeste), sala dos capangas (sul) e a cela atrás de uma porta (sudeste) */
    put('vfiles', 0, 0, { w: 5, h: 1 }); put('vfiles', 0, 2, { w: 1, h: 3, v: 1 }); put('vsafe', 6, 0);
    put('vdesk', 2, 2, { w: 2, h: 1 }); put('vchairhi', 3, 1, { seat: 7 }); put('vchair', 2, 3, { seat: 3 }); put('vchair', 4, 3, { seat: 3 }); put('vincense', 5, 4); put('vbookdoor', 6, 2, { block: false, force: true, v: 3 }); put('vrug', 1, 1, { w: 5, h: 4, block: false, force: true, c: 0 });
    for (let i = 8; i < 13; i++) put('vjar', i, 0); put('vbarrels', 12, 1, { h: 4, v: 3 }); put('vtable', 9, 3); put('vjars', 11, 5); put('vjars', 8, 5);
    put('vtable', 4, 8, { w: 2, h: 1, seats: [[3.7, 8.5, 1], [6.3, 8.5, 5]] }); put('rack', 7, 10); put('vrug', 2, 7, { w: 6, h: 3, block: false, force: true, c: 3 });
    put('vdoor', 9, 8, { v: 1, force: true }); put('vstraw', 11, 9, { w: 2, h: 2, block: false }); put('bucket', 12, 7);
  } else if (k === 'velvet') {   /* Casa de Veludo, térreo (Prancheta 26/11, estética chinesa com toque de Xangai): balcão no noroeste, banda atrás do palco redondo, 6 reservados nas paredes, elevador na parede leste */
    put('vbar', 0, 0, { w: 4, h: 2 }); for (let i = 0; i < 4; i++) put('vstool', i, 2, { block: false, seat: 3 }); put('vrug', 0, 2, { w: 4, h: 1, block: false, force: true, c: 1 });
    put('vband', 4, 0, { w: 5, h: 2 }); put('vstage', 5, 3, { w: 3, h: 3 }); put('vrunner', 6, 6, { w: 1, h: 5, block: false, force: true });
    for (const [i, j] of [[2, 3], [10, 4], [2, 6], [10, 6], [2, 8], [10, 8]]) put('vcol', i, j, { force: true });
    const booth = (i, j, v, c, seats) => put('vbooth', i, j, { w: 2, h: 2, v, c, seats });
    booth(0, 3, 1, 0, [[0.45, 3.6, 1], [0.45, 4.4, 1], [1.25, 3.3, 7], [1.25, 4.7, 3]]); booth(0, 5, 1, 1, [[0.45, 5.6, 1], [0.45, 6.4, 1], [1.25, 5.3, 7], [1.25, 6.7, 3]]);
    booth(11, 5, 3, 2, [[12.55, 5.6, 5], [12.55, 6.4, 5], [11.75, 5.3, 7], [11.75, 6.7, 3]]); booth(11, 7, 3, 3, [[12.55, 7.6, 5], [12.55, 8.4, 5], [11.75, 7.3, 7], [11.75, 8.7, 3]]);
    booth(2, 9, 2, 4, [[2.6, 10.55, 3], [3.4, 10.55, 3], [2.3, 9.75, 1], [3.7, 9.75, 5]]); booth(9, 9, 2, 5, [[9.6, 10.55, 3], [10.4, 10.55, 3], [9.3, 9.75, 1], [10.7, 9.75, 5]]);
    put('vlift', 11, 2, { w: 2, h: 2, block: false, force: true }); put('vrug', 9, 2, { w: 2, h: 2, block: false, force: true, c: 2 });
    put('varm', 10, 0, { seat: 7 }); put('vplant', 11, 0); put('varm', 12, 0, { seat: 7 });
    put('vding', 4, 5); put('vding', 8, 5); put('vvase', 4, 10); put('vvase', 8, 10); put('vplant', 12, 10); put('vplant', 0, 7);
  } else if (k === 'temple') {
    put('altar', dc - 1, 0, { w: 3 }); npcAt(dc, 1); put('candles', 1, 0); put('candles', w - 2, 0);
    for (let j = 3; j <= Math.max(5, h - 3); j += 2) { put('pew', 1, j, { w: dc - 1, seat: 3 }); put('pew', dc + 1, j, { w: w - dc - 2, seat: 3 }); }   /* a nave inteira com bancos */
    if (h >= 10) for (const j of [3, 7, h - 3]) { put('candles', 0, j); put('candles', w - 1, j); }
  } else if (k === 'jail') {
    for (const c of [0, 3, 6]) { if (c + 2 > w || (w >= 8 && c === 6)) continue; put('cot', c, 0, { h: 2 }); put('bucket', c + 1, 0, { block: false }); put('bars', c, 2, { v: 0 }); put('celldoor', c + 1, 2, { v: 0, block: false }); }   /* cidade nova (6 de largura): duas celas */
    for (const i of [2, 5]) { if (i >= w) continue; put('bars', i, 0, { v: 1 }); put('bars', i, 1, { v: 1 }); put('bars', i, 2, { v: 2 }); }
    if (put('table', 0, 4)) put('chair', 1, 4, { seat: 3 });
    npcAt(1, 3); if (w >= 8) { put('pew', w - 3, 4, { w: 2, seat: 1 }); if (put('bunk', w - 1, 0, { h: 2 })) F[F.length - 1].dorm = 1; put('chest', w - 2, 0); } else put('pew', w - 2, 4, { w: 2, seat: 1 });   /* cadeia 8x5 (Prancheta 24/11): duas celas e, no canto direito, o beliche do carcereiro e do carrasco */
  } else if (k === 'barracks') {
    put('bunk', 0, 0, { h: 2 }); put('bunk', 1, 0, { h: 2 }); put('bunk', w - 1, 0, { h: 2 }); put('bunk', w - 2, 0, { h: 2 });
    npcAt(dc, 1); put('rack', 2, 0); put('rack', w - 3, 0);
    if (put('table', w - 3, 3)) { put('chair', w - 4, 3, { seat: 1 }); put('chair', w - 2, 3, { seat: 5 }); }
  } else if (k === 'stable') {
    put('hay', 0, 0); put('hay', w - 1, 0); put('trough', 1, 0, { w: w - 2 }); put('hay', 0, h - 2); put('crate', w - 1, h - 2);
  } else if (k === 'stairtower') {
    // escada interna: nenhuma mobília
  } else if (k === 'castle' && !CASTLE_INT) {   /* interior antigo, até os andares novos ficarem prontos */
    put('throne', dc, 0, { seat: 7 }); put('banner', dc - 2, 0); put('banner', dc + 2, 0); put('candles', dc - 4, 0); put('candles', dc + 4, 0);
    put('fireplace', 0, 1); put('fireplace', 0, h - 3);
    for (const ti of [2, w - 3]) if (put('table', ti, 3, { h: h - 5 })) for (let j = 3; j < h - 2; j++) { put('chair', ti - 1, j, { seat: 1 }); put('chair', ti + 1, j, { seat: 5 }); }
    put('rug', dc, 2, { block: false });
  } else if (k === 'castle') {   /* salão do trono (u 5..11), cozinha (0..4 × 0..3), jantar (0..4 × 5..8), guarda (13..15 × 0..3), antecâmara (13..15 × 5..8) */
    put('swordthrone', 7, 0, { w: 3, h: 2, seat: 7 }); put('rug', 8, 2, { h: 5, v: 9, block: false });
    for (const j of [1, 4]) { put('hpillar', 5, j); put('hpillar', 11, j); }
    put('dskull', 5, 2, { block: false }); put('dskull', 11, 2, { block: false, flip: 1 });
    put('tapestry', 6, 0, { block: false }); put('tapestry', 10, 0, { block: false });
    for (const [i, j] of [[7, 3], [9, 3], [7, 6], [9, 6]]) put('brazier', i, j);
    put('glow', 6, 5, { block: false, v: 0 }); put('glow', 10, 2, { block: false, v: 1 }); put('glow', 7, 7, { block: false, v: 2 });
    put('hearth', 0, 0, { w: 2 }); put('stove', 2, 0); put('shelf', 3, 0); put('shelf', 4, 0); put('cauldron', 1, 2); put('barrel', 4, 3); put('barrel', 0, 3); if (put('table', 2, 2, { w: 2 })) { }
    put('fireplace', 0, 6); if (put('table', 2, 5, { h: 3 })) for (let j = 5; j < 8; j++) { put('chair', 1, j, { seat: 1 }); put('chair', 3, j, { seat: 5 }); } put('candles', 4, 5);
    put('rack', 15, 1); put('rack', 15, 2); if (put('table', 14, 2)) put('chair', 13, 2, { seat: 1 });
    put('pew', 13, 8, { w: 3, seat: 1 }); put('pew', 13, 6, { w: 3, seat: 1 }); put('candles', 15, 5);
  }
  return { F, npc };
}
// layout final: descarta móveis que fechariam algum canto do cômodo (todo tile livre precisa ser alcançável)
const LAYOUT_MEMO = new Map();
// móveis que continuam sólidos: paredes e divisórias, balcões, lareiras e fogões, prateleiras e armários de parede, camas, grades e cofres.
// O resto (mesas, cadeiras, bancos, barris, caixotes, tapetes, decoração) não bloqueia a passagem.
const FURN_SOLID = new Set(['iwall', 'strongbox', 'tatchair', 'inktable', 'tcascade', 'labrum', 'tmassage', 'winetable', 'hpillar', 'brazier', 'drawers', 'apothcounter', 'distill', 'blk', 'hpart', 'counter', 'bar', 'bankdesk', 'wandcounter', 'vault', 'bars', 'celldoor', 'fireplace', 'hearth', 'stove', 'forge', 'shelf', 'wandwall', 'fabricwall', 'taps', 'bottles', 'filing', 'jamshelf', 'pillar', 'throne', 'altar', 'still', 'bed', 'bunk', 'cot']);
function interiorLayout(b, fl = 0) {
  const [w, h] = bDims(b), mk = [b.kind, w, h, b.v || 0, floorsOf(b), fl, dormExtraKey(b, fl), b.office || '', JSON.stringify(b.stairs || 0), b.extSide || '', b.cellar ? b.cellar.join(',') : '', b.deco || '', intEdit(b, fl) ? 'E' + dormBi(b) : '', typeof decoKey === 'function' ? decoKey(b, fl) : ''].join('|');
  let L = LAYOUT_MEMO.get(mk); if (L) return L;
  L = interiorLayout0(b, fl);
  if (typeof decoApply === 'function') L = decoApply(b, fl, L);   /* casa decorada pelo dono (js/decor.js) */
  const blk = new Uint8Array(w * h), id = (i, j) => j * w + i;
  if (L.npc) blk[id(L.npc.i, L.npc.j)] = 1;
  const s0 = fl === 0 ? [doorCol(b), h - 1] : fl < 0 ? stairSpec(b, fl).entry : stairSpec(b, fl - 1).arrive;
  // a escada que sobe deste andar não conta como passagem: a chegada lá embaixo precisa de saída sem ser pela escada (senão quem desce fica preso)
  const stc = new Set(); if (fl < floorsOf(b) - 1) { const sp = stairSpec(b, fl); for (const p of [sp.L, sp.U]) stc.add(id(p[0], p[1])); }
  const okAll = () => {
    const seen = new Uint8Array(w * h), q = [id(s0[0], s0[1])]; seen[q[0]] = 1; if (b.door2L && fl === 0) { const n2 = id(b.door2L[0], b.door2L[1]); if (!seen[n2]) { seen[n2] = 1; q.push(n2); } }
    for (let k = 0; k < q.length; k++) { const i = q[k] % w, j = (q[k] / w) | 0; for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + c; if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue; const n = id(ni, nj); if (!blk[n] && !seen[n] && !stc.has(n)) { seen[n] = 1; q.push(n); } } }
    for (let n = 0; n < w * h; n++) if (!blk[n] && !seen[n] && !stc.has(n)) return false; return true;
  };
  const F = [];
  for (const f of L.F) {
    if (f.block && !FURN_SOLID.has(f.t)) f.block = false;   /* menos colisão: só o que é estrutura continua sólido */
    if (!f.block || f.t === 'blk') { F.push(f); if (f.block) blk[id(f.i, f.j)] = 1; continue; }
    const cells = []; for (let a = 0; a < f.w; a++) for (let c = 0; c < f.h; c++) cells.push(id(f.i + a, f.j + c));
    for (const n of cells) blk[n] = 1;
    if (okAll()) F.push(f); else for (const n of cells) blk[n] = 0;
  }
  L = { F, npc: L.npc }; LAYOUT_MEMO.set(mk, L); return L;
}
const npcIn = (b, fb) => { const L = interiorLayout(b); if (!L.npc) return fb; const [x, y] = bLocal(b, L.npc.i, L.npc.j); return { x, y }; };
const BLD_BY = k => BUILDINGS.find(b => b.kind === k);
const NPCS = TEST3D ? [] : [
  { id: 'priest', name: 'Irmã Lúmina', kind: 'priest', ...npcIn(BUILDINGS[0]) },
  { id: 'merchant', name: 'Borin, o Mercador', kind: 'merchant', ...npcIn(BUILDINGS[1]) },
  { id: 'innkeeper', name: 'Brom Barbarruiva, o Taverneiro', kind: 'innkeeper', ...npcIn(BUILDINGS[3]) },
  { id: 'tavmaid', name: 'Lina Pé-Ligeiro, a Ajudante', kind: 'tavmaid', ...(([x, y]) => ({ x, y }))(bLocal(BUILDINGS[3], 2, 1)) },   // fica na ponta do balcão
  { id: 'smith', name: 'Hrodgar, o Ferreiro', kind: 'smith', ...npcIn(BUILDINGS[2]) },
  { id: 'captain', name: 'Capitã Mirela Varn', kind: 'captain', ...npcIn(BUILDINGS[4]) },
  { id: 'guard1', name: 'Sentinela Aldric', kind: 'guard', x: C - 0.7, y: C + 34.6 },   /* muralha maior (24/11): portões 4 casas para fora */
  { id: 'guard2', name: 'Sentinela Bren', kind: 'guard', x: C + 2.4, y: C + 34.6 },
  { id: 'guard3', name: 'Sentinela Odo', kind: 'guard', x: C - 1.4, y: CASTLE.y0 + 2.6 },
  { id: 'guard4', name: 'Sentinela Wyn', kind: 'guard', x: C + 2.4, y: CASTLE.y0 + 2.6 }   /* portão norte acompanha a muralha (25/11) */,
  { id: 'fruit', name: 'Marta, a Fruteira', kind: 'fruit', x: C - 3, y: C + 9, stall: [C - 3, C + 10] },
  { id: 'executioner', name: 'Mestre Corvo, o Carrasco', kind: 'executioner', x: C - 3.9, y: C + 4.05 },
  { id: 'tailor', name: 'Mestre Aurélio, o Alfaiate Real', kind: 'tailor', ...npcIn(BLD_BY('boutique'), { x: C - 12, y: C + 1 }) },
  { id: 'noble1', name: 'Lady Isaura Valmont', kind: 'noble', x: C + 23, y: C - 18, route: [[C + 23, C - 18], [C + 23, C - 12], [C + 21, C - 6], [C + 23, C + 2], [C + 23, C - 18]] },
  { id: 'noble2', name: 'Lorde Cassian Aldren', kind: 'noble2', x: C + 21, y: C + 2, route: [[C + 21, C + 2], [C + 21, C - 4], [C + 23, C - 11], [C + 21, C - 16], [C + 21, C + 2]] },
  { id: 'gardener', name: 'Tobias, o Jardineiro', kind: 'gardener', x: C + 20.5, y: C - 15.5 }   /* um passo para fora da Casa 18, que cresceu (25/11) */,
  { id: 'guard5', name: 'Sentinela Corin', kind: 'guard', x: C - 32.7, y: C + 4.3 },
  { id: 'guard6', name: 'Sentinela Lys', kind: 'guard', x: C - 32.7, y: C + 6.7 },
  // patrulhas em dupla nas duas ruas principais e a guarda da porta do castelo
  { id: 'guard7', name: 'Sentinela Tibério', kind: 'guard', x: C - 26, y: C + 5.2, patrol: [[C - 31, C + 5.2], [C + 1, C + 5.2], [C + 1, C + 32.5], [C + 1, C + 5.2], [C + 30, C + 5.2], [C + 1, C + 5.2]] },   // passa pelo portão sul no meio da ronda
  { id: 'guard8', name: 'Sentinela Rui', kind: 'guard', x: C - 26, y: C + 6.2, pairOf: 'guard7', pairOff: [0, 1] },
  { id: 'guard9', name: 'Sentinela Marcos', kind: 'guard', x: C + 0.3, y: C - 7, patrol: [[C + 0.3, C - 7.5], [C + 0.3, C + 32.5]] },
  { id: 'guard10', name: 'Sentinela Tadeu', kind: 'guard', x: C + 1.3, y: C - 7, pairOf: 'guard9', pairOff: [1, 0] },
  { id: 'guard11', name: 'Sentinela Hugo', kind: 'guard', x: C - 1.2, y: C - 8.6 },
  { id: 'guard12', name: 'Sentinela Inácio', kind: 'guard', x: C + 1.2, y: C - 8.6 },
  { id: 'jailer', name: 'Bruno, o Carcereiro', kind: 'jailer', ...npcIn(BLD_BY('jail'), { x: C + 25, y: C + 23 }) },
];
// ---------- bairro de teste ----------
if (TEST3D) {
  BUILDINGS.push(
    { x: 26, y: 22, ...BH('house', 6, 6, 5.9, 3.6, '', { v: 0, door: 'S' }) },
    { x: 44, y: 22, ...BH('house', 5, 6, 7.4, 3.2, '', { v: 3, door: 'S' }) },
    { x: 26, y: 34, ...BH('house', 6, 5, 4.4, 3.4, '', { v: 1, door: 'N' }) },
    { x: 44, y: 34, ...BH('house', 6, 5, 5.9, 4.0, '', { v: 2, door: 'N' }) },
    { x: 53, y: 41, ...BH('shop', 6, 6, 6.2, 3.6, 'Empório do Borin', { v: 0, door: 'W' }) },
    { x: 21, y: 41, ...BH('tavern', 6, 7, 6.4, 4.2, 'Taverna do Javali', { door: 'E' }) },
    { x: 55, y: 18, ...BH('stairtower', 3, STAIR_N + 1, 5.6, 0, '', { door: 'S' }) },
  );
  NPCS.push(
    { id: 'merchant', name: 'Borin, o Mercador', kind: 'merchant', ...npcIn(BUILDINGS[4]) },
    { id: 'innkeeper', name: 'Greta, a Taverneira', kind: 'innkeeper', ...npcIn(BUILDINGS[5]) },
    { id: 'captain', name: 'Capitã Mirela Varn', kind: 'captain', x: 35.5, y: 43.5 },
    { id: 'guard1', name: 'Sentinela Aldric', kind: 'guard', x: 36.6, y: 19.8 },
    { id: 'guard2', name: 'Sentinela Bren', kind: 'guard', x: 42.4, y: 19.8 },
  );
}
const TEMPLE_SPAWN = TEST3D ? { x: 40, y: 44 } : (() => { const b = BUILDINGS[0], [dx, dy] = doorTile(b), v = DOOR_V[b.door || 'S']; return { x: dx + v[0] * 2.2, y: dy + v[1] * 2.2 }; })();
const MOUNTAIN = TEST3D ? { x: -100, y: -100, r: 1 } : { x: 50, y: 52, r: 20 };
// ---------- bastiões: lugares onde os inimigos se concentram (o resto do mundo é da fauna) ----------
const bpos = (a, d) => { const r = d * Math.SQRT2; return { x: Math.round(CENTER + r * (Math.cos(a) + Math.sin(a)) / 2), y: Math.round(CENTER + r * (Math.sin(a) - Math.cos(a)) / 2) }; };
const CAVE_POS = (() => { const dx = CENTER - MOUNTAIN.x, dy = CENTER - MOUNTAIN.y, l = Math.hypot(dx, dy); return { x: Math.round(MOUNTAIN.x + dx / l * (MOUNTAIN.r + 1)), y: Math.round(MOUNTAIN.y + dy / l * (MOUNTAIN.r + 1)), ux: dx / l, uy: dy / l }; })();
const BASTIONS = TEST3D ? [] : [
  { id: 'orc', name: 'Acampamento Orc', kind: 'camp', ...bpos(Math.PI, 92), r: 9, mons: { orc: 5, goblin: 6 }, boss: 'orcchief', patrol: ['goblin', 'goblin', 'orc'] },
  { id: 'crypt', name: 'Cripta das Colinas', kind: 'crypt', ...bpos(Math.PI / 2, 92), r: 9, mons: { skeleton: 9 }, boss: 'cryptlord', patrol: ['skeleton', 'skeleton'] },
  { id: 'fort', name: 'Fortim dos Desertores', kind: 'fort', ...bpos(-Math.PI / 2 + 0.6, 90), r: 9, mons: { bandit: 6, deserter: 4 }, boss: 'deserterchief', patrol: ['bandit', 'bandit', 'deserter'] },
  { id: 'pools', name: 'Poças do Pântano', kind: 'pools', ...bpos(0, 92), r: 9, mons: { slime: 7 }, boss: 'elderslime', night: { wisp: 4 } },
  // TEMPORÁRIO (testes do combate): acampamento de bandidos logo depois do portão sul, repovoa rápido
  { id: 'test', name: 'Acampamento de Bandidos (teste)', kind: 'testcamp', x: CENTER + 12, y: CENTER + 45, r: 6, mons: { bandit: 6, goblin: 4 }, fast: 15000, temp: true },   // dobrado (pedido do jogador)
  { id: 'dragon', name: 'Covil do Dragão', kind: 'dragon', ...bpos(Math.PI / 4, 110), r: 9, mons: {}, boss: 'dragon', respawn: 1800000 },
  { id: 'cave', name: 'Caverna do Troll', kind: 'cave', x: CAVE_POS.x + Math.round(CAVE_POS.ux * 6), y: CAVE_POS.y + Math.round(CAVE_POS.uy * 6), r: 6, mons: {}, boss: 'troll' },
];
const RIVER_PTS = [[70, 74], [76, 100], [72, 128], [80, 172], [112, 198], [152, 214], [192, 234], [234, 254]];

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function generateWorld() {
  const N = MAP_W * MAP_H;
  const ground = new Uint8Array(N), obj = new Uint8Array(N), zone = new Uint8Array(N);
  const bld = new Int16Array(N).fill(-1);
  const fl1 = new Uint8Array(N);       // andar 1: 1 = muralha, 2 = assoalho, 3 = escada
  const stair = new Uint8Array(N);     // escadas: direção para onde sobem (1..4)
  const stairK = new Uint8Array(N);    // degrau da escada (0 = de baixo, 1 = de cima)
  const tvar = new Uint8Array(N);      // variação das torres (3 = torre alta com cone)
  const toff = new Uint8Array(N).fill(4); // torre centrada na linha da muralha: (ox+1)*3+(oz+1)
  const wdir = new Uint8Array(N);      // muralhas: lado de fora (1:+x 2:-x 3:+y 4:-y)
  const gateId = new Int8Array(N).fill(-1);
  const gates = [];
  const seats = [];
  const rdir = new Uint8Array(N);      // direção da estrada (1 = ao longo de x, 2 = de y)
  const height = new Uint8Array(N);    // altura dos penhascos (0..4)
  const flow = new Float32Array(N * 2); // direção da correnteza do rio
  const river = new Uint8Array(N);
  const R = (x, y, s) => hash2(x, y, s);
  const idx = (x, y) => y * MAP_W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;

  // terreno base
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const i = idx(x, y), dx = x - CENTER, dy = y - CENTER;
    const edge = Math.sqrt(dx * dx + dy * dy) / (MAP_W / 2);
    const h = fbm(x / 26, y / 26, 7) + 0.32 - edge * edge * 0.45;
    const z = zoneOf(x, y);
    zone[i] = z;
    const n1 = fbm(x / 12, y / 12, 99), n2 = fbm(x / 8, y / 8, 31);
    let g;
    if (h < 0.35 || x < 2 || y < 2 || x > MAP_W - 3 || y > MAP_H - 3) g = T.WATER;
    else if (h < 0.385) g = T.SAND;
    else switch (z) {
      case Z.OUTSKIRTS: g = vnoise(x / 6, y / 6, 333) > 0.68 ? T.DEAD : n1 > 0.7 ? T.FOREST : T.GRASS; break;
      case Z.FIELDS: g = n1 > 0.64 ? T.FOREST : T.GRASS; break;
      case Z.FOREST: g = n1 > 0.42 ? T.FOREST : T.GRASS; break;
      case Z.SWAMP: g = n2 > 0.68 ? T.WATER : n2 > 0.42 ? T.SWAMP : T.GRASS; break;
      case Z.BONES: g = n2 > 0.6 ? T.DIRT : T.DEAD; break;
      case Z.ORCS: g = n1 > 0.5 ? T.DIRT : (n2 > 0.5 ? T.DEAD : T.GRASS); break;
      case Z.WILD: g = n2 > 0.7 ? T.STONE : n1 > 0.55 ? T.FOREST : T.GRASS; break;
      default: g = T.GRASS;
    }
    if (z === Z.VILLAGE) g = T.GRASS;
    ground[i] = g;
  }

  // montanha
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const d = Math.hypot(x - MOUNTAIN.x, y - MOUNTAIN.y) + (vnoise(x / 4, y / 4, 400) - 0.5) * 6;
    if (d < MOUNTAIN.r) {
      const i = idx(x, y);
      ground[i] = T.CLIFF;
      height[i] = d < MOUNTAIN.r * 0.35 ? 4 : d < MOUNTAIN.r * 0.6 ? 3 : d < MOUNTAIN.r * 0.82 ? 2 : 1;
    }
  }

  // rio
  const P = RIVER_PTS;
  const pts = [];
  for (let k = 0; k < P.length - 1; k++) {
    const p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(P.length - 1, k + 2)];
    for (let t = 0; t < 1; t += 0.03) pts.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
  }
  pts.push(P[P.length - 1]);
  const fords = new Set([Math.floor(pts.length * 0.22), Math.floor(pts.length * 0.5), Math.floor(pts.length * 0.8)]);
  pts.forEach(([px, py], k) => {
    const nx = pts[Math.min(pts.length - 1, k + 1)], fx = nx[0] - px, fy = nx[1] - py, fl = Math.hypot(fx, fy) || 1;
    const w = 1.8 + vnoise(k / 6, 0, 81) * 1.2;
    let ford = false;
    for (const f of fords) if (Math.abs(k - f) <= 2) ford = true;
    for (let yy = Math.floor(py - 4); yy <= py + 4; yy++) for (let xx = Math.floor(px - 4); xx <= px + 4; xx++) {
      if (!inb(xx, yy) || Math.hypot(xx - px, yy - py) > w) continue;
      const i = idx(xx, yy);
      if (ground[i] === T.CLIFF) continue;
      ground[i] = ford ? T.SHALLOW : T.WATER;
      river[i] = 1;
      flow[i * 2] = fx / fl; flow[i * 2 + 1] = fy / fl;
      obj[i] = O.NONE;
    }
  });
  // lago aos pés da cachoeira
  const pool = RIVER_PTS[0];
  for (let yy = pool[1] - 5; yy <= pool[1] + 5; yy++) for (let xx = pool[0] - 5; xx <= pool[0] + 5; xx++) {
    if (Math.hypot(xx - pool[0], yy - pool[1]) < 4 && ground[idx(xx, yy)] !== T.CLIFF) { ground[idx(xx, yy)] = T.WATER; river[idx(xx, yy)] = 1; flow[idx(xx, yy) * 2] = 0.5; flow[idx(xx, yy) * 2 + 1] = 0.7; }
  }
  // cachoeira: anda do lago em direção à montanha; o primeiro penhasco vira a queda d'água
  {
    const dx = MOUNTAIN.x - pool[0], dy = MOUNTAIN.y - pool[1], L = Math.hypot(dx, dy);
    for (let s = 0; s < L; s += 0.5) {
      const x = Math.round(pool[0] + dx / L * s), y = Math.round(pool[1] + dy / L * s), i = idx(x, y);
      if (ground[i] !== T.CLIFF) { ground[i] = T.WATER; river[i] = 1; flow[i * 2] = 0.6; flow[i * 2 + 1] = 0.6; obj[i] = O.NONE; continue; }
      for (const [ax, ay] of [[0, 0], [1, -1], [-1, 1]]) {
        const j = idx(x + ax, y + ay);
        if (ground[j] !== T.CLIFF) continue;
        obj[j] = O.WATERFALL; height[j] = 3;
        for (const [fx, fy] of [[1, 0], [0, 1], [1, 1]]) { const k = idx(x + ax + fx, y + ay + fy); if (ground[k] !== T.CLIFF) { ground[k] = T.WATER; river[k] = 1; flow[k * 2] = 0.6; flow[k * 2 + 1] = 0.6; obj[k] = O.NONE; } }
        for (const [bx, by] of [[-1, 0], [0, -1], [-1, -1]]) { const k = idx(x + ax + bx, y + ay + by); if (ground[k] === T.CLIFF) height[k] = Math.max(height[k], 4); }
      }
      break;
    }
  }

  // vegetação e objetos por zona
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const i = idx(x, y), g = ground[i], z = zone[i], r = R(x, y, 4242);
    if (obj[i] !== O.NONE || g === T.CLIFF || z === Z.VILLAGE) continue;
    let o = O.NONE;
    if (g === T.WATER) { if (!river[i] && ((z === Z.SWAMP && r < 0.12) || (z === Z.FIELDS && r < 0.02))) o = O.LILY; }
    else if (g === T.SHALLOW) o = O.NONE;
    else if (g === T.SAND) { if (r < 0.025) o = O.ROCK; else if (r < 0.07) o = O.REEDS; }
    else if (z === Z.OUTSKIRTS) {
      if (g === T.DEAD) o = r < 0.55 ? O.TALLGRASS : r < 0.565 ? O.HAY : O.NONE;            // trigais
      else if (g === T.FOREST) o = r < 0.07 ? O.TREE : r < 0.13 ? O.BUSH : r < 0.25 ? O.TALLGRASS : O.NONE;
      else o = r < 0.02 ? O.TREE : r < 0.04 ? O.BUSH : r < 0.14 ? O.FLOWER : r < 0.22 ? O.TALLGRASS : r < 0.224 ? O.ROCK : O.NONE;
    } else if (z === Z.FIELDS) {
      if (g === T.FOREST) o = r < 0.07 ? O.TREE : r < 0.1 ? O.PINE : r < 0.15 ? O.BUSH : r < 0.18 ? O.MUSHROOM : r < 0.28 ? O.TALLGRASS : O.NONE;
      else o = r < 0.025 ? O.TREE : r < 0.06 ? O.BUSH : r < 0.075 ? O.ROCK : r < 0.17 ? O.FLOWER : r < 0.27 ? O.TALLGRASS : r < 0.275 ? O.LOG : O.NONE;
    } else if (z === Z.FOREST) {
      if (g === T.FOREST) o = r < 0.08 ? O.TREE : r < 0.13 ? O.PINE : r < 0.18 ? O.BUSH : r < 0.22 ? O.MUSHROOM : r < 0.235 ? O.STUMP : r < 0.32 ? O.TALLGRASS : r < 0.33 ? O.LOG : O.NONE;
      else o = r < 0.06 ? O.TREE : r < 0.1 ? O.BUSH : r < 0.25 ? O.TALLGRASS : r < 0.29 ? O.FLOWER : r < 0.3 ? O.STUMP : O.NONE;
    } else if (z === Z.SWAMP) {
      if (g === T.SWAMP) o = r < 0.05 ? O.DEADTREE : r < 0.17 ? O.REEDS : r < 0.21 ? O.MUSHROOM : r < 0.29 ? O.TALLGRASS : r < 0.3 ? O.LOG : O.NONE;
      else o = r < 0.08 ? O.REEDS : r < 0.11 ? O.TREE : r < 0.15 ? O.BUSH : r < 0.27 ? O.TALLGRASS : O.NONE;
    } else if (z === Z.BONES) {
      if (g === T.DEAD) o = r < 0.04 ? O.GRAVE : r < 0.08 ? O.BONES : r < 0.12 ? O.DEADTREE : r < 0.15 ? O.ROCK : r < 0.23 ? O.TALLGRASS : O.NONE;
      else o = r < 0.05 ? O.ROCK : r < 0.09 ? O.BONES : r < 0.1 ? O.GRAVE : O.NONE;
    } else if (z === Z.ORCS) {
      if (g === T.DIRT) o = r < 0.012 ? O.TENT : r < 0.02 ? O.CAMPFIRE : r < 0.035 ? O.SPIKES : r < 0.05 ? O.BONES : r < 0.07 ? O.ROCK : r < 0.077 ? O.CRATE : O.NONE;
      else o = r < 0.04 ? O.TREE : r < 0.08 ? O.BUSH : r < 0.18 ? O.TALLGRASS : r < 0.2 ? O.DEADTREE : O.NONE;
    } else if (z === Z.WILD) {
      if (g === T.STONE) o = r < 0.18 ? O.ROCK : r < 0.2 ? O.PINE : O.NONE;
      else if (g === T.FOREST) o = r < 0.09 ? O.PINE : r < 0.13 ? O.TREE : r < 0.17 ? O.BUSH : r < 0.2 ? O.MUSHROOM : O.NONE;
      else o = r < 0.06 ? O.TREE : r < 0.1 ? O.PINE : r < 0.14 ? O.ROCK : r < 0.18 ? O.BUSH : r < 0.3 ? O.TALLGRASS : r < 0.33 ? O.FLOWER : O.NONE;
    }
    obj[i] = o;
  }
  // espaça as árvores: nunca duas árvores/pinheiros vizinhos (sempre há caminho)
  for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
    const i = idx(x, y), o = obj[i];
    if (o !== O.TREE && o !== O.PINE && o !== O.DEADTREE && o !== O.ROCK) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { const j = idx(x + dx, y + dy), q = obj[j]; if (q === O.TREE || q === O.PINE || q === O.DEADTREE || q === O.ROCK || q === O.BUSH) obj[j] = O.TALLGRASS; }
  }
  // ---- natureza densa: florestas fechadas com clareiras e trilhas, bosques nos campos, salgueiros na água, riachos e poças ----
  {
    const TREES = new Set([O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW, O.DEADTREE]);
    for (let y = 2; y < MAP_H - 2; y++) for (let x = 2; x < MAP_W - 2; x++) {
      const i = idx(x, y), g = ground[i], z = zone[i];
      if (g === T.CLIFF || g === T.WATER || g === T.SHALLOW || g === T.SAND || g === T.BRIDGE || z === Z.VILLAGE || z === Z.OUTSKIRTS || river[i]) continue;
      if (Math.hypot(x - MOUNTAIN.x, y - MOUNTAIN.y) < MOUNTAIN.r + 1) continue;
      const clr = vnoise(x / 16, y / 16, 951), trail = Math.abs(vnoise(x / 24, y / 24, 952) - 0.5) < 0.022, grove = vnoise(x / 11, y / 11, 953), sp = vnoise(x / 9, y / 9, 954), r = R(x, y, 955), r2 = R(x, y, 956);
      let o = obj[i];
      if (trail && (z === Z.FOREST || z === Z.WILD || z === Z.FIELDS)) { obj[i] = O.NONE; ground[i] = T.DIRT; continue; }
      if (z === Z.FOREST || z === Z.WILD) {
        if (clr < 0.3) {   // clareira: grama, flores, frutas e ervas
          o = r < 0.05 ? O.FLOWER : r < 0.22 ? O.TALLGRASS : r < 0.235 ? O.BERRY : r < 0.245 ? O.HERB : r < 0.252 ? O.ROCK : O.NONE;
          if (g === T.FOREST) ground[i] = T.GRASS;
        } else {
          const dense = clr > 0.45, treeP = dense ? 0.3 : 0.16;
          if (r < treeP) o = z === Z.WILD ? (sp < 0.6 ? O.PINE : sp < 0.8 ? O.BIRCH : O.OAK) : (sp < 0.35 ? O.OAK : sp < 0.6 ? O.TREE : sp < 0.8 ? O.PINE : O.BIRCH);
          else if (r < treeP + 0.06) o = r2 < 0.22 ? O.BERRY : O.BUSH;
          else if (r < treeP + 0.17) o = O.FERN;
          else if (r < treeP + 0.19) o = r2 < 0.5 ? O.LOG : O.ROOTS;
          else if (r < treeP + 0.205) o = r2 < 0.4 ? O.SHROOMS : O.MUSHROOM;
          else if (r < treeP + 0.215) o = r2 < 0.5 ? O.BOULDER : O.ROCK;
          else if (r < treeP + 0.222) o = O.HERB;
          else if (r < treeP + 0.3) o = O.TALLGRASS; else o = O.NONE;
          if (dense) ground[i] = T.FOREST;
        }
      } else if (z === Z.FIELDS) {
        if (grove > 0.66) o = r < 0.28 ? (sp < 0.5 ? O.OAK : sp < 0.75 ? O.BIRCH : O.TREE) : r < 0.36 ? O.BUSH : r < 0.42 ? O.FERN : r < 0.45 ? O.BERRY : o;
        else if (r < 0.006) o = O.OAK; else if (r < 0.009) o = O.BOULDER; else if (r < 0.014) o = O.BERRY; else if (r < 0.017) o = O.HERB;
      } else if (z === Z.SWAMP) {
        let wet = false; for (const [dx, dy] of DIRS8) { const q = ground[idx(x + dx, y + dy)]; if (q === T.WATER || q === T.SHALLOW) wet = true; }
        if (wet && r < 0.08) o = O.WILLOW; else if (r < 0.008) o = O.WILLOW; else if (r < 0.032) o = O.HERB; else if (r < 0.06 && o === O.NONE) o = O.FERN;
      } else if (z === Z.BONES || z === Z.ORCS) { if (r < 0.006) o = O.BOULDER; }
      obj[i] = o;
    }
    // árvores e pedregulhos nunca encostados pelos lados (sempre dá para passar); nas diagonais pode
    for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) { const i = idx(x, y); if (!TREES.has(obj[i]) && obj[i] !== O.BOULDER) continue; for (const [dx, dy] of [[1, 0], [0, 1]]) { const j = idx(x + dx, y + dy); if (TREES.has(obj[j]) || obj[j] === O.BOULDER) obj[j] = O.FERN; } }
    // riachos sinuosos com juncos nas margens
    for (let c = 0; c < 9; c++) {
      let x = 20 + Math.floor(R(c, 1, 960) * (MAP_W - 40)), y = 20 + Math.floor(R(c, 2, 960) * (MAP_H - 40)), a = R(c, 3, 960) * 6.28;
      for (let s = 0; s < 70; s++) {
        a += (vnoise(x / 6, y / 6, 961 + c) - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a);
        const X = Math.round(x), Y = Math.round(y); if (X < 3 || Y < 3 || X >= MAP_W - 3 || Y >= MAP_H - 3) break;
        const i = idx(X, Y), z = zone[i]; if (z === Z.VILLAGE || z === Z.OUTSKIRTS || ground[i] === T.CLIFF || ground[i] === T.WATER) break;
        ground[i] = T.SHALLOW; obj[i] = O.NONE;
        for (const [dx, dy] of DIRS8) { const j = idx(X + dx, Y + dy); if (ground[j] !== T.SHALLOW && ground[j] !== T.WATER && ground[j] !== T.CLIFF && R(X + dx, Y + dy, 962) < 0.25) obj[j] = O.REEDS; }
      }
    }
    // poças
    for (let c = 0; c < 70; c++) { const X = 10 + Math.floor(R(c, 4, 963) * (MAP_W - 20)), Y = 10 + Math.floor(R(c, 5, 963) * (MAP_H - 20)), z = zone[idx(X, Y)]; if (z !== Z.FOREST && z !== Z.FIELDS && z !== Z.SWAMP && z !== Z.WILD) continue; const rr = 0.8 + R(c, 6, 963) * 1.2; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const i = idx(X + dx, Y + dy); if (Math.hypot(dx, dy) <= rr && ground[i] !== T.CLIFF && ground[i] !== T.WATER) { ground[i] = T.SHALLOW; obj[i] = O.NONE; } } }
  }
  // árvores ao pé da montanha
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const i = idx(x, y);
    if (ground[i] === T.CLIFF || ground[i] === T.WATER || zone[i] === Z.VILLAGE) continue;
    const d = Math.hypot(x - MOUNTAIN.x, y - MOUNTAIN.y);
    if (d < MOUNTAIN.r + 4 && obj[i] === O.NONE && R(x, y, 50) < 0.12) obj[i] = R(x, y, 51) < 0.6 ? O.PINE : O.ROCK;
  }

  // ---- bastiões: acampamento, cripta, fortim em ruínas, poças, caverna ----
  for (const B of BASTIONS) {
    const Rr = B.r, toC = Math.atan2(CENTER - B.y, CENTER - B.x);
    for (let y = B.y - Rr - 3; y <= B.y + Rr + 3; y++) for (let x = B.x - Rr - 3; x <= B.x + Rr + 3; x++) {
      if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
      const i = idx(x, y), d = Math.hypot(x - B.x, y - B.y); if (d > Rr + 2.5) continue;
      if (B.kind === 'cave' && ground[i] === T.CLIFF) continue;   // não come a montanha
      height[i] = 0; obj[i] = O.NONE; river[i] = 0;
      const n = hash2(x, y, 901);
      ground[i] = B.kind === 'camp' ? (n < 0.7 ? T.DIRT : T.GRASS) : B.kind === 'crypt' ? (n < 0.55 ? T.DEAD : T.DIRT) : B.kind === 'fort' ? (n < 0.5 ? T.DIRT : n < 0.8 ? T.COBBLE : T.GRASS) : B.kind === 'pools' ? (n < 0.75 ? T.SWAMP : T.GRASS) : (n < 0.6 ? T.STONE : T.DIRT);
    }
    const put = (dx, dy, o) => { const x = B.x + dx, y = B.y + dy; if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return; const i = idx(x, y); if (ground[i] !== T.WATER && ground[i] !== T.CLIFF) obj[i] = o; };
    const angGap = (a, c, w) => Math.abs(((a - c) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < w;
    // anel (paliçada / muro) com entrada virada para a cidade e outra nos fundos
    const ring = (rad, o, gapW, chance = 1, alt = O.NONE) => { for (let y = -rad - 1; y <= rad + 1; y++) for (let x = -rad - 1; x <= rad + 1; x++) { if (Math.abs(Math.hypot(x, y) - rad) > 0.5) continue; const a = Math.atan2(y, x); if (angGap(a, toC, gapW) || angGap(a, toC + Math.PI, gapW * 0.7)) continue; put(x, y, hash2(B.x + x, B.y + y, 905) < chance ? o : alt); } };
    const H = (dx, dy, s) => hash2(B.x + dx, B.y + dy, s);
    if (B.kind === 'camp') {
      ring(8, O.FENCE, 0.3); ring(10, O.SPIKES, 0.4, 0.3);
      for (const [x, y] of [[-4, -3], [3, -4], [-3, 4], [4, 3], [-5, 0]]) put(x, y, O.TENT);
      put(0, 0, O.CAMPFIRE); put(1, -2, O.BANNER); put(-1, 2, O.BANNER);
      for (const [x, y] of [[5, 0], [5, 1], [6, -1]]) put(x, y, O.CRATE); put(-2, -6, O.BARREL); put(0, -5, O.WEAPONRACK); put(2, 5, O.WEAPONRACK);
      for (let k = 0; k < 14; k++) { const x = Math.round((H(k, 1, 906) - 0.5) * 12), y = Math.round((H(k, 2, 906) - 0.5) * 12); if (Math.hypot(x, y) > 2 && Math.hypot(x, y) < 7 && obj[idx(B.x + x, B.y + y)] === O.NONE) put(x, y, O.BONES); }
    } else if (B.kind === 'crypt') {
      ring(8.5, O.LOWWALL, 0.3, 0.55, O.RUBBLE);
      for (let y = -7; y <= 7; y += 2) for (let x = -7; x <= 7; x += 2) { const d = Math.hypot(x, y); if (d < 3.6 || d > 7.4 || angGap(Math.atan2(y, x), toC, 0.35)) continue; put(x, y, H(x, y, 907) < 0.85 ? O.GRAVE : O.DEADTREE); }
      // mausoléu em ruínas: muro baixo 5x5 com entrada para a cidade, estátua no meio e braseiros na porta
      const hx = Math.abs(Math.cos(toC)) >= Math.abs(Math.sin(toC)), ex = hx ? Math.sign(Math.cos(toC)) * 2 : 0, ey = hx ? 0 : Math.sign(Math.sin(toC)) * 2;
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { if (Math.max(Math.abs(x), Math.abs(y)) !== 2) continue; if ((Math.abs(ex) === 2 && x === ex && Math.abs(y) <= 0) || (Math.abs(ey) === 2 && y === ey && Math.abs(x) <= 0)) continue; put(x, y, O.LOWWALL); }
      put(0, 0, O.STATUE);
      const px = Math.abs(ex) === 2 ? ex + Math.sign(ex) : 0, py = Math.abs(ey) === 2 ? ey + Math.sign(ey) : 0;
      if (px) { put(px, -1, O.BRAZIER); put(px, 1, O.BRAZIER); } else { put(-1, py, O.BRAZIER); put(1, py, O.BRAZIER); }
    } else if (B.kind === 'fort') {
      ring(8, O.LOWWALL, 0.28, 0.8, O.RUBBLEBIG);
      for (const [x, y] of [[-3, -3], [3, -3], [0, 4], [-4, 2]]) put(x, y, O.TENT);
      put(0, 0, O.CAMPFIRE); put(0, -2, O.BANNER); put(-5, 1, O.WEAPONRACK); put(5, 1, O.WEAPONRACK); put(2, 5, O.DUMMY); put(3, 5, O.DUMMY);
      for (const [x, y] of [[4, -5], [5, -4]]) put(x, y, O.CRATE); for (const [x, y] of [[-4, -5], [-5, -4]]) put(x, y, O.BARREL); put(5, -1, O.CART);
      for (let k = 0; k < 10; k++) { const x = Math.round((H(k, 3, 908) - 0.5) * 14), y = Math.round((H(k, 4, 908) - 0.5) * 14); if (Math.hypot(x, y) > 2 && Math.hypot(x, y) < 7 && obj[idx(B.x + x, B.y + y)] === O.NONE) put(x, y, O.RUBBLE); }
    } else if (B.kind === 'pools') {
      for (const [px, py, pr] of [[-4, -2, 2], [3, -4, 1.6], [4, 3, 2], [-2, 4, 1.5]]) for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
        const d = Math.hypot(x, y), X = B.x + px + x, Y = B.y + py + y, i = idx(X, Y);
        if (d <= pr) { ground[i] = T.WATER; obj[i] = H(px + x, py + y, 909) < 0.15 ? O.LILY : O.NONE; }
        else if (d <= pr + 1.3 && obj[i] === O.NONE && H(px + x, py + y, 910) < 0.4) obj[i] = O.REEDS;
      }
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.3; put(Math.round(Math.cos(a) * 7.5), Math.round(Math.sin(a) * 7.5), H(k, 5, 911) < 0.6 ? O.DEADTREE : O.MUSHROOM); }
    } else if (B.kind === 'testcamp') {
      for (const [x, y] of [[-2, -2], [2, -1]]) put(x, y, O.TENT); put(0, 1, O.CAMPFIRE); put(-3, 1, O.CRATE); put(3, 2, O.BARREL);
    } else if (B.kind === 'dragon') {
      // ruínas de fortaleza queimada: mesa de rocha (nível 1) com escadaria larga, chão chamuscado, árvores carbonizadas,
      // restos de cavaleiros, estrada com estandartes e tochas; no topo, torre de vigia em ruínas, muros caídos e o ninho com o tesouro
      const PR = 5.5, BIG = Rr + 8;
      for (let y = -BIG; y <= BIG; y++) for (let x = -BIG; x <= BIG; x++) {
        const X = B.x + x, Y = B.y + y; if (X < 1 || Y < 1 || X >= MAP_W - 1 || Y >= MAP_H - 1) continue;
        const i = idx(X, Y), d = Math.hypot(x, y) + (hash2(X, Y, 913) - 0.5) * 0.8;
        if (d <= PR) { ground[i] = T.CLIFF; height[i] = 5; fl1[i] = 1; obj[i] = O.NONE; continue; }
        if (d > BIG || ground[i] === T.WATER) continue;
        height[i] = 0; river[i] = 0;
        const h = hash2(X, Y, 914), n = hash2(X, Y, 915);
        ground[i] = d < Rr + 2 ? (n < 0.55 ? T.DEAD : T.DIRT) : (n < 0.35 ? T.DEAD : n < 0.6 ? T.DIRT : ground[i]);   // chão chamuscado
        obj[i] = d < Rr ? (h < 0.08 ? O.BONES : h < 0.11 ? O.ARMORPILE : h < 0.15 ? O.RUBBLE : h < 0.18 ? O.ROCK : O.NONE)
          : (h < 0.09 ? O.DEADTREE : h < 0.12 ? O.BONES : h < 0.135 ? O.ARMORPILE : h < 0.16 ? O.ROCK : O.NONE);   // árvores carbonizadas
      }
      // topo: torre de vigia em ruínas no fundo, muros caídos, entulho e o ninho com o tesouro
      const back = toC + Math.PI, put1 = (dx, dy, o) => { const i = idx(B.x + dx, B.y + dy); if (ground[i] === T.CLIFF && fl1[i]) obj[i] = o; };
      put1(Math.round(Math.cos(back) * 3.5), Math.round(Math.sin(back) * 3.5), O.RUINTOWER);
      for (let k = -4; k <= 4; k++) { const a = back + k * 0.22; if (Math.abs(k) === 1) continue; const dx = Math.round(Math.cos(a) * 4.6), dy = Math.round(Math.sin(a) * 4.6); put1(dx, dy, hash2(dx, dy, 916) < 0.6 ? O.LOWWALL : O.RUBBLEBIG); }
      for (const [dx, dy] of [[1, 2], [-2, 1], [2, -2], [-1, -2]]) put1(dx, dy, hash2(dx, dy, 917) < 0.5 ? O.RUBBLE : O.BONES);
      put1(Math.round(Math.cos(back) * 1.5), Math.round(Math.sin(back) * 1.5), O.HOARD);
      put1(Math.round(Math.cos(back + 0.9) * 2), Math.round(Math.sin(back + 0.9) * 2), O.ARMORPILE);
      const sx = Math.abs(Math.cos(toC)) >= Math.abs(Math.sin(toC)) ? Math.sign(Math.cos(toC)) : 0, sy = sx ? 0 : Math.sign(Math.sin(toC));
      const sdir = sx > 0 ? 2 : sx < 0 ? 1 : sy > 0 ? 4 : 3;   // a rampa sobe em direção à mesa
      for (let j = 0; j < STAIR_N; j++) for (let q = -1; q <= 1; q++) {
        const X = B.x + sx * (6 + j) + sy * q, Y = B.y + sy * (6 + j) + sx * q, i = idx(X, Y);
        ground[i] = T.FLOORSTONE; height[i] = 0; obj[i] = O.STAIRS; stair[i] = sdir; stairK[i] = STAIR_N - 1 - j; fl1[i] = 3;
      }
      for (let q = -2; q <= 2; q++) { const X = B.x + sx * 5 + sy * q, Y = B.y + sy * 5 + sx * q, i = idx(X, Y); if (Math.abs(q) <= 1 && !(ground[i] === T.CLIFF)) { ground[i] = T.CLIFF; height[i] = 5; fl1[i] = 1; } if (ground[i] === T.CLIFF) obj[i] = O.NONE; }   // o topo encosta na escada
      // estrada de pedra até a escada, com estandartes rasgados e tochas dos dois lados
      for (let j = 6 + STAIR_N; j < 6 + STAIR_N + 18; j++) for (let q = -1; q <= 1; q++) {
        const X = B.x + sx * j + sy * q, Y = B.y + sy * j + sx * q; if (X < 1 || Y < 1 || X >= MAP_W - 1 || Y >= MAP_H - 1) continue; const i = idx(X, Y);
        if (ground[i] === T.WATER) continue; ground[i] = hash2(X, Y, 918) < 0.8 ? T.COBBLE : T.DIRT; obj[i] = O.NONE; height[i] = 0;
        for (const side of [-2, 2]) { if (q !== 0) continue; const k2 = idx(X + sy * side, Y + sx * side); if (ground[k2] === T.WATER) continue; obj[k2] = (j - 6 - STAIR_N) % 4 === 1 ? ((j >> 2) % 2 ? O.TORCH : O.BANNER) : obj[k2] === O.DEADTREE ? O.NONE : obj[k2]; }
      }
    } else if (B.kind === 'cave') {
      { const i = idx(CAVE_POS.x, CAVE_POS.y); ground[i] = T.STONE; height[i] = 0; obj[i] = O.CAVE; }
      for (let y = -Rr; y <= Rr; y++) for (let x = -Rr; x <= Rr; x++) { const d = Math.hypot(x, y), i = idx(B.x + x, B.y + y); if (d < 2 || d > Rr || obj[i] !== O.NONE || ground[i] === T.CLIFF) continue; const h = H(x, y, 912); obj[i] = h < 0.12 ? O.BONES : h < 0.17 ? O.ROCK : h < 0.2 ? O.RUBBLE : O.NONE; }
    }
  }

  const set = (x, y, g, o) => { const i = idx(x, y); if (g != null) ground[i] = g; if (o != null) obj[i] = o; };
  const inBox = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const { x0, y0, x1, y1 } = CASTLE;
  const used = new Uint8Array(N);       // tiles reservados (ruas, praças, construções)
  const reserve = (ax, ay, bx, by) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) if (inb(x, y)) used[idx(x, y)] = 1; };

  // área da cidade: limpa e cria o fosso
  for (let y = Math.min(C - SAFE_R - 1, y0 - 6); y <= Math.max(C + SAFE_R + 2, y1 + 6); y++) for (let x = C - SAFE_R - 1; x <= C + SAFE_R + 2; x++) {   /* cobre a faixa norte nova (a muralha não é mais um quadrado) */
    const i = idx(x, y);
    obj[i] = O.NONE; river[i] = 0;
    ground[i] = T.GRASS;
    if (inBox(x, y, x0 - 4, y0 - 4, x1 + 4, y1 + 4) && !inBox(x, y, x0 - 2, y0 - 2, x1 + 2, y1 + 2)) ground[i] = T.WATER; // fosso
  }

  // estradas: anel em volta do fosso + saídas para os 4 lados; portões só no sul (principal) e no norte
  const road = (x, y, dir, wide) => {
    if (!inb(x, y)) return;
    const i = idx(x, y);
    if (ground[i] === T.CLIFF) return;
    const wet = ground[i] === T.WATER || ground[i] === T.SHALLOW;
    ground[i] = wet ? T.BRIDGE : (zone[i] === Z.VILLAGE || zone[i] === Z.OUTSKIRTS ? T.COBBLE : T.DIRT);
    if (!wet && zone[i] === Z.OUTSKIRTS && (x + y) % 3 === 0 && !wide) ground[i] = T.DIRT;
    obj[i] = O.NONE; rdir[i] = dir;
  };
  const clearSide = (x, y) => { if (inb(x, y) && BLOCKING.has(obj[idx(x, y)])) obj[idx(x, y)] = O.NONE; };
  const RG = 7; // distância do anel à muralha
  for (let k = x0 - RG; k <= x1 + RG; k++) for (let w = 0; w < 2; w++) { road(k, y0 - RG + w, 1); road(k, y1 + RG - w, 1); }
  for (let k = y0 - RG; k <= y1 + RG; k++) for (let w = 0; w < 2; w++) { road(x0 - RG + w, k, 2); road(x1 + RG - w, k, 2); }   /* as estradas dos lados seguem a altura da muralha */
  const lastLand = (sx, sy, dx, dy) => { let L = 0; for (let k = 0; k < 140; k++) { const x = sx + dx * k, y = sy + dy * k; if (!inb(x, y)) break; if (ground[idx(x, y)] !== T.WATER) L = k; } return L; };
  // sul: estrada larga (4) do portão principal até o mar
  { const L = lastLand(C, y1 + 1, 0, 1); for (let k = 1; k <= L; k++) for (let w = -1; w <= 2; w++) road(C + w, y1 + k, 2, 1); for (let k = 1; k <= L; k++) { clearSide(C - 2, y1 + k); clearSide(C + 3, y1 + k); } }
  // norte: portão secundário
  { const L = lastLand(C, y0 - 1, 0, -1); for (let k = 1; k <= L; k++) for (let w = 0; w <= 1; w++) road(C + w, y0 - k, 2); }
  // leste e oeste: saem do anel
  { const L = lastLand(x1 + RG, C, 1, 0); for (let k = 1; k <= L; k++) for (let w = 0; w <= 1; w++) road(x1 + RG + k, C + w, 1); }
  { const L = lastLand(x0 - RG, C, -1, 0); for (let k = 1; k <= L; k++) for (let w = 0; w <= 1; w++) road(x0 - RG - k, C + w, 1); }
  for (let x = x0 - RG; x < x0; x++) for (let y = C + 4; y <= C + 7; y++) road(x, y, 1, 1);

  // chão da cidade: calçamento com canteiros de grama
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, vnoise(x / 5, y / 5, 610) > 0.7 ? T.GRASS : T.COBBLE, O.NONE);

  // ---- muralha externa, torres e portões ----
  const towers = [];
  const sideT = [-21, -11, 12, 22];
  towers.push([x0, y0], [x1 - 1, y0], [x0, y1 - 1], [x1 - 1, y1 - 1]);
  for (const t of sideT) { towers.push([C + t, y0], [C + t, y1 - 1], [x0, C + t], [x1 - 1, C + t]); }
  for (const ty of [C - 32, C - 43]) if (ty > y0 + 2) towers.push([x0, ty], [x1 - 1, ty]);   /* torres no trecho novo dos lados */
  towers.push([C - 2, y0], [C + 2, y0]);                                   // portão norte (secundário)
  towers.push([x0, C + 2], [x0, C + 8]);                                   // portão oeste (rua nova)
  const gateTowers = [[C - 3, y1 - 1], [C + 3, y1 - 1]];                    // portão principal: torres altas (as duas encostadas no portão)
  towers.push(...gateTowers);
  const inTower = (x, y) => towers.some(([tx, ty]) => x >= tx && x <= tx + 1 && y >= ty && y <= ty + 1);
  const isGate = (x, y) => (y === y1 && x >= C - 1 && x <= C + 2) || (y === y0 && (x === C || x === C + 1)) || (x === x0 && y >= C + 4 && y <= C + 7);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!(x === x0 || x === x1 || y === y0 || y === y1) || inTower(x, y)) continue;
    const i = idx(x, y);
    wdir[i] = y === y0 ? 4 : y === y1 ? 3 : x === x0 ? 2 : 1;
    if (isGate(x, y)) { set(x, y, T.FLOORSTONE, O.GATE); continue; }
    set(x, y, null, O.WALL); fl1[i] = 1;
  }
  const addGate = (gx0, gx1, gy, out, kind) => { const gi = gates.length; gates.push({ x0: gx0, x1: gx1, y: gy, out, kind }); for (let x = gx0; x <= gx1; x++) gateId[idx(x, gy)] = gi; };
  addGate(C - 1, C + 2, y1, 1, 'main'); addGate(C, C + 1, y0, -1, 'small');
  { const gi = gates.length; gates.push({ x0, x1: x0, y0: C + 4, y: C + 7, out: 1, kind: 'west', vert: 1 }); for (let y = C + 4; y <= C + 7; y++) gateId[idx(x0, y)] = gi; }   // portão oeste (vertical)
  for (const [tx, ty] of towers) {
    for (let y = ty; y <= ty + 1; y++) for (let x = tx; x <= tx + 1; x++) { set(x, y, T.FLOORSTONE, O.PART); fl1[idx(x, y)] = 1; }
    obj[idx(tx + 1, ty + 1)] = O.TOWER;
    tvar[idx(tx + 1, ty + 1)] = Math.floor(R(tx, ty, 2) * 3);
    toff[idx(tx + 1, ty + 1)] = ((tx === x0 ? -1 : tx === x1 - 1 ? 1 : 0) + 1) * 3 + ((ty === y0 ? -1 : ty === y1 - 1 ? 1 : 0) + 1);
  }
  for (const [tx, ty] of [[x0, C + 2], [x0, C + 8]]) tvar[idx(tx + 1, ty + 1)] = 3;
  for (const [tx, ty] of gateTowers) { tvar[idx(tx + 1, ty + 1)] = 3; for (let y = ty; y <= ty + 1; y++) for (let x = tx; x <= tx + 1; x++) fl1[idx(x, y)] = 0; }
  reserve(x0, y0, x1, y0 + 1); reserve(x0, y1 - 1, x1, y1); reserve(x0, y0, x0 + 1, y1); reserve(x1 - 1, y0, x1, y1);

  // ---- castelo central (Hogwarts/Porto Real): muralha própria, salão no andar de cima ----
  reserve(KEEP_OLD.x0 - 2, KEEP_OLD.y0 - 2, KEEP_OLD.x1 + 2, KEEP_OLD.y1 + 2);   /* o sorteio das casas usa o contorno antigo: as casas da cidade continuam iguais */
  const drawKeep = () => {
  const kt = [[KEEP.x0, KEEP.y0, -1, -1], [KEEP.x1 - 1, KEEP.y0, 1, -1], [KEEP.x0, KEEP.by - 1, -1, 1], [KEEP.x1 - 1, KEEP.by - 1, 1, 1], [KEEP.yx0, KEEP.y1 - 1, -1, 1], [KEEP.yx1 - 1, KEEP.y1 - 1, 1, 1], [C - 3, KEEP.y1 - 1, 0, 1], [C + 3, KEEP.y1 - 1, 0, 1], [KEEP.x0, C - 21, -1, 0], [KEEP.x1 - 1, C - 21, 1, 0]];
  const inKT = (x, y) => kt.some(([tx, ty]) => x >= tx && x <= tx + 1 && y >= ty && y <= ty + 1);
  for (let y = KEEP.y0; y <= KEEP.y1; y++) for (let x = KEEP.x0; x <= KEEP.x1; x++) {
    if (!inKeep(x, y)) continue; const i = idx(x, y); rdir[i] = 0; const onWall = !inKeep(x - 1, y) || !inKeep(x + 1, y) || !inKeep(x, y - 1) || !inKeep(x, y + 1);
    set(x, y, vnoise(x / 3, y / 3, 620) > 0.62 ? T.GRASS : T.FLOORSTONE, O.NONE);
    if (inKT(x, y)) continue;
    if (onWall) {
      wdir[i] = !inKeep(x, y - 1) ? 4 : !inKeep(x, y + 1) ? 3 : !inKeep(x - 1, y) ? 2 : 1;
      if (y === KEEP.y1 && (x === C || x === C + 1)) { set(x, y, T.FLOORSTONE, O.GATE); continue; }
      set(x, y, null, O.WALL);
    }
  }
  addGate(C, C + 1, KEEP.y1, 1, 'keep');
  for (const [tx, ty, sxT, syT] of kt) {
    for (let y = ty; y <= ty + 1; y++) for (let x = tx; x <= tx + 1; x++) set(x, y, T.FLOORSTONE, O.PART);
    obj[idx(tx + 1, ty + 1)] = O.TOWER; tvar[idx(tx + 1, ty + 1)] = 3;
    toff[idx(tx + 1, ty + 1)] = (sxT + 1) * 3 + (syT + 1);
  }
  reserve(KEEP.x0 - 2, KEEP.y0 - 2, KEEP.x1 + 2, KEEP.y1 + 2);
  };

  // ---- escadas de 2 degraus (rampas) até a muralha ----
  // torres-escada 3x3 encostadas na muralha, porta virada para a cidade; por cima viram parte do caminho da muralha
  const stairTowers = [];   // torres-escada removidas por enquanto (pedido do jogador)
  for (const [tx, ty, door] of stairTowers) {
    BUILDINGS.push({ x: tx, y: ty, ...BH('stairtower', 3, 3, WALL_UNITS, 0, '', { door }) });
    for (let y = ty; y <= ty + 2; y++) for (let x = tx; x <= tx + 2; x++) { set(x, y, T.FLOORSTONE, O.NONE); fl1[idx(x, y)] = 1; }
    reserve(tx - 1, ty - 1, tx + 3, ty + 3);
  }

  // ---- ruas e praças da cidade ----
  const street = (ax, ay, bx, by) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) { set(x, y, T.COBBLE, O.NONE); rdir[idx(x, y)] = bx - ax > by - ay ? 1 : 2; } reserve(ax, ay, bx, by); };
  street(C - 1, KEEP.y1 + 1, C + 2, y1 - 1);              // avenida real (portão principal -> castelo)
  street(C, y0 + 1, C + 1, KEEP_OLD.y0 - 1);              // rua do portão norte
  street(KEEP_OLD.x0 - 2, KEEP_OLD.y0 - 2, KEEP_OLD.x1 + 2, KEEP_OLD.y0 - 1); street(KEEP_OLD.x0 - 2, KEEP_OLD.y1 + 1, KEEP_OLD.x1 + 2, KEEP_OLD.y1 + 2); // anel do castelo antigo (só para o sorteio das casas)
  street(KEEP_OLD.x0 - 2, KEEP_OLD.y0, KEEP_OLD.x0 - 1, KEEP_OLD.y1); street(KEEP_OLD.x1 + 1, KEEP_OLD.y0, KEEP_OLD.x1 + 2, KEEP_OLD.y1);
  street(x0 + 2, C + 5, x1 - 2, C + 6);                    // rua do mercado (leste-oeste)
  street(x0 + 1, C + 4, C - 8, C + 7);                     // rua nova (larga) até o portão oeste
  street(x0 + 2, C + 8, C - 8, C + 9);                     // ... com 6 tiles de largura depois do portão
  reserve(C - 18, C + 20, C - 8, C + 21); reserve(C + 7, C + 10, C + 17, C + 22);
  reserve(C + 12, C - 24, x1 - 2, C + 15);   // bairro nobre
  street(C + 17, C - 21, C + 20, C + 15);   // avenida arborizada (larga)
  street(C + 13, C - 5, C + 23, C + 1);    // praça do chafariz   // quintal da Marta; lado direito da feira sem casa
  street(C + 19, C - 20, C + 20, y1 - 3);                  // beco dos mercadores (estreito, como o Beco Diagonal)
  street(C - 7, C + 9, C + 8, C + 17);                     // praça do mercado
  street(C - 25, C - 16, KEEP_OLD.x0 - 3, C - 15);         // rua do templo (do banco ao castelo)
  street(C - 25, C - 30, C - 23, C + 3);                   // rua do Banco e da Catedral (a travessa do Empório, alargada até a muralha norte)
  street(C - 24, C - 20, C - 23, C + 5);
  street(C - 24, C + 19, C + 18, C + 20);                  // rua de baixo
  street(KEEP_OLD.x1 + 3, C - 24, x1 - 2, C - 23);
  for (const b0 of BUILDINGS) { const b = b0.gen ? { ...b0, ...b0.gen } : b0, d = doorOf(b); reserve(Math.floor(d.x) - 1, b.y + b.h, Math.ceil(d.x) + 1, b.y + b.h + 1); }

  // ---- construções fixas + casas geradas (cidade densa, com vielas entre elas) ----
  // a casa não pode ficar sobre ruas nem outros prédios; a margem de 1 tile em volta pode ser rua (vira a calçada), mas não outro prédio
  // faixa estreita entre a muralha norte e o castelo: margem de 1 tile
  const ox0 = CASTLE_OLD.x0, oy0 = CASTLE_OLD.y0, ox1 = CASTLE_OLD.x1, oy1 = CASTLE_OLD.y1;
  reserve(ox0, oy0, ox1, oy0 + 1); reserve(ox0, oy1 - 1, ox1, oy1); reserve(ox0, oy0, ox0 + 1, oy1); reserve(ox1 - 1, oy0, ox1, oy1);   /* a muralha antiga ainda conta para o sorteio */
  const freeNE = (ax, ay, w, h) => { for (let y = ay - 1; y <= ay + h; y++) for (let x = ax - 1; x <= ax + w; x++) { const inner = x >= ax && x < ax + w && y >= ay && y < ay + h; if (!inb(x, y) || bld[idx(x, y)] !== -1 || (used[idx(x, y)] && (inner || rdir[idx(x, y)] === 0))) return false; if (x <= ox0 + 1 || x >= ox1 - 1 || y <= oy0 + 1) return false; } return true; };
  const free = (ax, ay, w, h, mgO) => { const mg = mgO || (ax < C - 10 ? 4 : 3); for (let y = ay - mg; y <= ay + h + mg - 1; y++) for (let x = ax - mg; x <= ax + w + mg - 1; x++) { const inner = x >= ax && x < ax + w && y >= ay && y < ay + h; if (!inb(x, y) || bld[idx(x, y)] !== -1 || (inner && used[idx(x, y)])) return false; if (x <= ox0 + 1 || x >= ox1 - 1 || y <= oy0 + 1 || y >= oy1 - 1) return false; } return true; };
  // os prédios fixos ocupam a área deles (+1 de margem) antes de sortear as casas
  for (const b0 of BUILDINGS) { const b = b0.gen || b0; reserve(b.x - 1, b.y - 1, b.x + b.w, b.y + b.h); }
  reserve(C - 22, C + 21, C - 12, C + 29);   // pracinha do bairro sul-oeste (poço, árvores e bancos)
  const houses = [];
  const roadDist = (px, py) => { let best = 99; for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) { const xx = Math.round(px) + dx, yy = Math.round(py) + dy; if (inb(xx, yy) && rdir[idx(xx, yy)] && bld[idx(xx, yy)] < 0) best = Math.min(best, Math.abs(dx) + Math.abs(dy)); } return best; };
  // 1ª rodada: cidade toda (até 12 casas); 2ª rodada: até 3 casas extras no lado oeste (canto superior esquerdo da tela)
  for (let k = 0, cap = 12; k < 20000; k++) {
    if (k === 12000) cap = houses.length + 3;
    if (k === 16000) cap = houses.length + 5;
    if (houses.length >= cap) { if (k < 12000) { k = 11999; continue; } if (k < 16000) { k = 15999; continue; } break; }
    const west = k >= 12000 && k < 16000, ne = k >= 16000;
    const x = ne ? C - 14 + Math.floor(R(k, 3, 700) * 34) : west ? ox0 + 3 + Math.floor(R(k, 3, 700) * (C - 16 - ox0)) : ox0 + 3 + Math.floor(R(k, 3, 700) * (ox1 - ox0 - 10)), y = ne ? oy0 + 2 + Math.floor(R(k, 4, 700) * 3) : west ? C - 24 + Math.floor(R(k, 4, 700) * 30) : oy0 + 3 + Math.floor(R(k, 4, 700) * (oy1 - oy0 - 10));
    { const km = ne ? 1 : west ? 3 : 15; if (x + 6 > KEEP_OLD.x0 - km && x < KEEP_OLD.x1 + km && y + 6 > KEEP_OLD.y0 - km && y < KEEP_OLD.y1 + km) continue; }   // praça aberta em volta do castelo
    const sw = x < C - 4 && y > C + 12;   // bairro sul-oeste: no máximo 2 casas, bem espaçadas
    if (sw && houses.filter(hh => hh.x < C - 4 && hh.y > C + 12).length >= 2) continue;
    const nearKeep = x + 6 > KEEP_OLD.x0 - 19 && x < KEEP_OLD.x1 + 19 && y + 6 > KEEP_OLD.y0 - 19 && y < KEEP_OLD.y1 + 19, rr = R(k, 1, 700);
    const ai = nearKeep || rr < 0.55 ? Math.floor(R(k, 8, 700) * 4) : rr < 0.93 ? 4 + Math.floor(R(k, 8, 700) * 4) : 8 + Math.floor(R(k, 8, 700) * 2), T0 = HOUSE_TYPES[ai];
    let bestHb = null, bestD = 99;
    for (const door of ['S', 'N', 'E', 'W']) {
      const w = door === 'S' || door === 'N' ? T0.A : T0.D, h = door === 'S' || door === 'N' ? T0.D : T0.A;
      if (!(ne ? freeNE(x, y, w, h) : free(x, y, w, h, sw ? 5 : 0))) continue;
      const hb = { x, y, ...BH('house', w, h, T0.H, T0.RH, '', { v: T0.v, arch: ai, door, floors: T0.floors }) };
      { const [dtx, dty] = doorTile(hb), v = DOOR_V[door]; let okF = true; for (let q = 1; q <= 2; q++) { const fx = dtx + v[0] * q, fy = dty + v[1] * q; if (!inb(fx, fy) || bld[idx(fx, fy)] !== -1 || fx <= ox0 + 1 || fx >= ox1 - 1 || fy <= oy0 + 1 || fy >= oy1 - 1) okF = false; } if (!okF) continue; }
      const d0 = doorOf(hb), dd = roadDist(d0.x, d0.y);
      if (dd < bestD) { bestD = dd; bestHb = hb; }
    }
    if (!bestHb || bestD > (ne ? 40 : 9)) continue;
    const hb = bestHb, w = hb.w, h = hb.h;
    houses.push(hb);
    { const [dtx, dty] = doorTile(hb), v = DOOR_V[hb.door]; for (let q = 1; q <= 2; q++) used[idx(dtx + v[0] * q, dty + v[1] * q)] = 1; }
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) bld[idx(xx, yy)] = -2; // marcador temporário
  }
  BUILDINGS.push(...houses);
  { // escritório do corretor: a casa mais perto da rua nova e do mercado
    let ob = null, bd = 1e9; for (const hb of houses) { const d = Math.hypot(hb.x + hb.w / 2 - (C - 18), hb.y + hb.h / 2 - (C + 13)); if (d < bd) { bd = d; ob = hb; } }
    if (ob) { delete ob.arch; ob.kind = 'shop'; ob.name = 'Elixires da Lua Prateada'; ob.v = 6; ob.x = C - 22; ob.y = C + 15; ob.door = 'S'; ob.w = 6; ob.h = 4; ob.floors = 2; ob.H = 4.2; ob.RH = 2.2; ob.wall = Math.round(4.2 * 19.6); ob.roof = Math.round(2.2 * 19.6); } }   // loja da alquimista (antiga imobiliária)   // atrás da Alfaiataria, porta para a rua de baixo
  { const off = houses.find(q => q.x === C + 18 && q.y === C - 29); if (off) { delete off.arch; Object.assign(off, { office: 'estate', name: 'Imobiliária Chave de Bronze', door: 'S', floors: 2, H: 3.8, RH: 2.0, wall: Math.round(3.8 * 19.6), roof: Math.round(2.0 * 19.6) }); } }   // escritório do Mestre Anselmo (no lugar da Casa 6, porta para o sul)
  { const ag = houses.find(q => q.x === C - 21 && q.y === C - 14); if (ag) { delete ag.arch; Object.assign(ag, { office: 'agency', name: 'Casa das Mãos de Ouro', door: 'W', dcol: 2, deco: 'cairo', floors: 1, H: 3.3, RH: 0.4, wall: Math.round(3.3 * 19.6), roof: Math.round(0.4 * 19.6) }); } }   // agência de empregos em estilo de loja de feira do Cairo (no lugar da Casa 2), entrada para a rua do dojô
  { const h18 = houses.find(q => q.x === C + 15 && q.y === C + 23); if (h18) { h18.x = C + 14; h18.y = C - 13; h18.door = 'E'; h18.w = 4; h18.h = 6; h18.noble = 1; } }   // casa nobre, ao lado do castelo
  { const hitK = (hb, m) => { for (let yy = hb.y - m; yy < hb.y + hb.h + m; yy++) for (let xx = hb.x - m; xx < hb.x + hb.w + m; xx++) if (inKeep(xx, yy)) return true; return false; };
    for (const hb of houses) { if (!hitK(hb, 0)) continue; for (let yy = hb.y; yy < hb.y + hb.h; yy++) for (let xx = hb.x; xx < hb.x + hb.w; xx++) if (bld[idx(xx, yy)] === -2) bld[idx(xx, yy)] = -1;
      let done = false; for (let pass = 0; pass < 3 && !done; pass++) for (let yy = (pass < 2 ? oy0 + 3 : 12); yy < (pass < 2 ? oy1 - 6 : MAP_H - 12) && !done; yy++) for (let xx = (pass < 2 ? ox0 + 3 : 12); xx < (pass < 2 ? ox1 - 6 : MAP_W - 12) && !done; xx++) { const t = { ...hb, x: xx, y: yy }; if (hitK(t, 2)) continue; let ok = !BUILDINGS.some(o => o !== hb && [o, o.gen].some(g => g && xx - 2 < g.x + g.w && xx + hb.w + 2 > g.x && yy - 2 < g.y + g.h && yy + hb.h + 2 > g.y)) && !houses.some(o => o !== hb && xx - 2 < o.x + o.w && xx + hb.w + 2 > o.x && yy - 2 < o.y + o.h && yy + hb.h + 2 > o.y);
        for (let q = yy - 1; q <= yy + hb.h && ok; q++) for (let p = xx - 1; p <= xx + hb.w && ok; p++) { const i = idx(p, q); if (!inb(p, q) || bld[i] !== -1 || BLOCKING.has(obj[i]) || ((q >= yy && q < yy + hb.h && p >= xx && p < xx + hb.w) && (rdir[i] || used[i]))) ok = false; }
        if (!ok) continue; const [dtx, dty] = doorTile(t), v = DOOR_V[t.door], fx = dtx + v[0], fy = dty + v[1]; if (!inb(fx, fy) || bld[idx(fx, fy)] !== -1 || roadDist(fx, fy) > (pass ? 4 : 2)) continue;
        hb.x = xx; hb.y = yy; done = true; for (let q = yy; q < yy + hb.h; q++) for (let p = xx; p < xx + hb.w; p++) bld[idx(p, q)] = -2; } } }   /* a casa engolida pelo castelo vai para outro terreno livre da cidade */
  drawKeep();
  street(KEEP.x0 - 2, KEEP.y0 - 1, KEEP.x1 + 1, KEEP.y0 - 1); street(KEEP.x0 - 2, KEEP.y1 + 1, KEEP.x1 + 1, KEEP.y1 + 2); // anel do castelo (ao norte só 1 casa até a muralha da cidade)
  street(KEEP.x0 - 2, KEEP.y0, KEEP.x0 - 1, KEEP.y1); street(KEEP.x1 + 1, KEEP.y0, KEEP.x1 + 1, KEEP.y1);   /* a viela do leste fica com 1 casa */
  street(KEEP.x0, KEEP.by + 1, KEEP.yx0 - 1, KEEP.y1); street(KEEP.yx1 + 1, KEEP.by + 1, KEEP.x1, KEEP.y1);   /* largos dos dois lados do pátio */
  for (let i = 0; i < bld.length; i++) if (bld[i] === -2) bld[i] = -1;   // marcas temporárias que sobraram (a imobiliária muda de lugar depois de sorteada)
  // ---- vila do oeste (do outro lado do rio, na estrada que sai do portão oeste): casas espaçadas e oficinas ----
  const HAM = { x0: CASTLE_OLD.x0 - 58, y0: C - 22, x1: CASTLE_OLD.x0 - 27, y1: C + 19, road: C };
  if (!TEST3D) {
    const hb = (x, y, kind, w, h, H, RH, name, ex) => BUILDINGS.push({ x, y, ...BH(kind, w, h, H, RH, name, { floors: 1, ...ex }) });
    const X = d => CASTLE_OLD.x0 - d;   // x0 = 96 → vila entre x 38 e 69
    hb(X(52), C - 7, 'house', 4, 4, 2.3, 2.4, '', { v: 1, door: 'S', ham: 1 });
    hb(X(44), C - 7, 'house', 5, 4, 2.5, 2.5, '', { v: 3, door: 'S', ham: 1 });
    hb(X(38), C - 8, 'workshop', 6, 5, 2.6, 2.4, 'Carpintaria da Vila', { wk: 'carp', door: 'S' });
    hb(X(31), C - 8, 'workshop', 5, 5, 2.6, 2.6, 'Alambique do Rio', { wk: 'alch', door: 'S' });
    hb(X(52), C + 4, 'house', 4, 4, 2.3, 2.4, '', { v: 0, door: 'N', ham: 1 });
    hb(X(46), C + 4, 'house', 5, 4, 2.5, 2.5, '', { v: 2, door: 'N', ham: 1 });
    hb(X(32), C + 3, 'workshop', 5, 5, 2.8, 2.4, 'Serraria do Rio', { wk: 'saw', door: 'N' });
    hb(X(50), C + 11, 'workshop', 4, 3, 2.2, 2.2, 'Horta da Vila', { wk: 'farm', door: 'N' });
    hb(X(48), C - 17, 'workshop', 4, 4, 2.4, 2.2, 'Mina da Pedreira', { wk: 'mine', door: 'S' });
    for (let y = HAM.y0; y <= HAM.y1; y++) for (let x = HAM.x0; x <= HAM.x1; x++) { if (!inb(x, y)) continue; const i = idx(x, y); if (ground[i] === T.WATER || ground[i] === T.SHALLOW || ground[i] === T.CLIFF) continue; zone[i] = Z.VILLAGE; if (!rdir[i]) { obj[i] = O.NONE; if (ground[i] !== T.BRIDGE) ground[i] = T.GRASS; } }
    const lane = (ax, ay, bx, by) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) if (inb(x, y) && ground[idx(x, y)] !== T.WATER) { ground[idx(x, y)] = T.DIRT; rdir[idx(x, y)] = bx - ax > by - ay ? 1 : 2; } };
    lane(X(56), C - 1, X(29), C - 1);    // calçada de terra dos dois lados da estrada
    lane(X(56), C + 2, X(29), C + 2);
    lane(X(48), C - 13, X(47), C - 3);   // trilha da mina
    lane(X(40), C + 3, X(34), C + 7);    // pracinha
    lane(X(49), C + 8, X(48), C + 10);   // trilha da horta
  }
  // pousada do outro lado da rua, atrás das lojas da taverna, porta para a rua (no fim da lista: não muda o número dos prédios salvos)
  if (!TEST3D) BUILDINGS.push({ x: C - 29, y: C + 24, ...BH('hotel', 7, 7, 2.3, 1.25, 'Pousada do Javali Magro', { floors: 1, door: 'E', dcol: 6 }) });   // 7x7, bem baixa (3 cabines), um passo mais longe da loja de elixir
  if (!TEST3D) BUILDINGS.push({ x: C - 30, y: C - 15, ...BH('dojo', 5, 8, 9.6, 1.4, 'Dojô do Punho de Ferro', { door: 'E', dcol: 3, floors: 4, extra: 1, deco: 'machiya', stairs: ['lift', 'lift', 'lift'], door2L: [6, 4, 'E'] }) });   // a antiga Casa 12 virou o prédio japonês: dojô no térreo, elevador no corredor e 9 apartamentos
  if (!TEST3D) BUILDINGS.push(   // bairro nobre: casarões do lado do castelo (porta para a avenida) e mais um do lado leste
    { x: C + 13, y: C - 21, ...BH('manor', 6, 6, 4.6, 3.0, 'Casa Lorvan', { door: 'E', v: 1 }) },
    { x: C + 13, y: C - 5, ...BH('manor', 6, 6, 4.8, 3.2, 'Casa Brisane', { door: 'E', v: 2 }) },
    { x: C + 26, y: C - 5, ...BH('manor', 6, 6, 4.6, 3.0, 'Casa Eldren', { door: 'W' }) });
  if (!TEST3D) BUILDINGS.push(   // fazenda e moinho na Vila do Oeste; padaria junto à praça do mercado
    { x: C - 72, y: C - 21, ...BH('workshop', 5, 4, 2.6, 2.4, 'Fazenda do Trigo Dourado', { wk: 'wheat', door: 'S', floors: 1 }) },
    { x: C - 65, y: C - 21, ...BH('workshop', 4, 4, 3.6, 2.6, 'Moinho do Vento Leste', { wk: 'mill', door: 'S', floors: 1 }) },
    { x: C + 4, y: C + 21, ...BH('workshop', 5, 4, 2.6, 1.9, 'Padaria da Praça', { wk: 'bakery', door: 'E', dcol: 2, floors: 1 }) });   // porta para a avenida da catedral   // casa nova na rua do banco, alinhada com as lojas   // porta direto na rua principal
  if (!TEST3D) BUILDINGS.push(   // pátio interno do castelo (no fim da lista: não muda o número dos prédios salvos)
    { x: C - 8, y: C - 9, ...BH('kstable', 4, 5, 2.4, 2.0, 'Estábulo Real', { floors: 1, door: 'E' }) },
    { x: C + 4, y: C - 9, ...BH('kguard', 4, 5, 3.0, 1.8, 'Casa da Guarda', { floors: 1, door: 'W', gen: { x: C + 6, y: C - 9, w: 4, h: 5, door: 'W' } }) });
  if (!TEST3D) { /* ---- bairro das Casas Nobres: a muralha leste avança EAST_EXT casas ---- */
    const X0 = x1, X1 = CITY_X1, RGe = 7, gy0 = C - 1, gy1 = C + 2;
    for (let y = y0 - RGe - 1; y <= y1 + RGe + 1; y++) for (let x = X0 - 1; x <= X1 + RGe + 2; x++) { if (!inb(x, y)) continue; const i = idx(x, y); if (bld[i] >= 0) continue;
      const inside = x >= X0 && x <= X1 && y >= y0 && y <= y1, ring = (x >= X1 + RGe - 1 && x <= X1 + RGe) || ((y === y0 - RGe || y === y0 - RGe + 1 || y === y1 + RGe || y === y1 + RGe - 1) && x > X0), moat = !inside && ((x >= X1 + 3 && x <= X1 + 4 && y >= y0 - 4 && y <= y1 + 4) || ((y >= y0 - 4 && y <= y0 - 3) || (y >= y1 + 3 && y <= y1 + 4)) && x >= X0 && x <= X1 + 4);
      if (x < X0 && !(obj[i] === O.WALL || obj[i] === O.PART || obj[i] === O.TOWER)) continue;
      obj[i] = O.NONE; rdir[i] = 0; wdir[i] = 0; fl1[i] = 0; tvar[i] = 0; river[i] = 0; flow[i * 2] = 0; flow[i * 2 + 1] = 0; height[i] = 0;   /* sem rio nem lago antigo por baixo do bairro */
      if (inside) { ground[i] = vnoise(x / 5, y / 5, 611) > 0.72 ? T.GRASS : T.COBBLE; zone[i] = Z.VILLAGE; }
      else if (moat) ground[i] = T.WATER; else if (ring) { ground[i] = T.COBBLE; rdir[i] = x >= X1 + RGe - 1 ? 2 : 1; } else ground[i] = T.GRASS; }
    for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = X0 - 1; x <= X0; x++) { const i = idx(x, y); if (bld[i] < 0) { obj[i] = O.NONE; fl1[i] = 0; wdir[i] = 0; ground[i] = T.COBBLE; rdir[i] = 2; } }   /* a muralha velha vira rua */
    for (let x = X0 - 1; x <= X1; x++) for (const y of [y0, y1]) { const i = idx(x, y); obj[i] = O.WALL; fl1[i] = 1; wdir[i] = y === y0 ? 4 : 3; ground[i] = T.FLOORSTONE; }
    for (let y = y0; y <= y1; y++) { const i = idx(X1, y); if (y >= gy0 && y <= gy1) { obj[i] = O.GATE; fl1[i] = 0; ground[i] = T.FLOORSTONE; continue; } obj[i] = O.WALL; fl1[i] = 1; wdir[i] = 1; ground[i] = T.FLOORSTONE; }
    { const gi = gates.length; gates.push({ x0: X1, x1: X1, y0: gy0, y: gy1, out: -1, kind: 'east', vert: 1 }); for (let y = gy0; y <= gy1; y++) gateId[idx(X1, y)] = gi; }   /* portão leste */
    const tw = [[X1 - 1, y0, 1, -1], [X1 - 1, y1 - 1, 1, 1], [X1 - 1, gy0 - 2, 1, 0], [X1 - 1, gy1 + 1, 1, 0], [X1 - 1, C - 21, 1, 0], [X1 - 1, C + 12, 1, 0], [X1 - 1, C + 22, 1, 0], [X1 - 1, C - 11, 1, 0], [X0 + 7, y0, 0, -1], [X0 + 7, y1 - 1, 0, 1], [X0 + 21, y0, 0, -1], [X0 + 21, y1 - 1, 0, 1]];
    for (const [tx, ty, sx, sy] of tw) { for (let y = ty; y <= ty + 1; y++) for (let x = tx; x <= tx + 1; x++) { const i = idx(x, y); obj[i] = O.PART; fl1[i] = 1; ground[i] = T.FLOORSTONE; } obj[idx(tx + 1, ty + 1)] = O.TOWER; tvar[idx(tx + 1, ty + 1)] = (ty === gy0 - 2 || ty === gy1 + 1) ? 3 : Math.floor(R(tx, ty, 2) * 3); toff[idx(tx + 1, ty + 1)] = (sx + 1) * 3 + (sy + 1); }
    for (let x = X1 + 1; x <= X1 + RGe; x++) for (let y = C; y <= C + 1; y++) { const i = idx(x, y); ground[i] = ground[i] === T.WATER ? T.BRIDGE : T.COBBLE; rdir[i] = 1; obj[i] = O.NONE; }   /* estrada do portão até o anel */
    for (let x = X0 + 1; x < X1; x++) for (let y = C; y <= C + 1; y++) { const i = idx(x, y); ground[i] = T.FLOORSTONE; rdir[i] = 1; }   /* avenida das Casas: do portão até a rua da muralha velha */
    for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = X0 + 1; x <= X0 + 2; x++) { const i = idx(x, y); ground[i] = T.COBBLE; rdir[i] = 2; }   /* rua do bairro, ao longo das casas */
    for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = X0 + 15; x <= X0 + 16; x++) { const i = idx(x, y); ground[i] = T.COBBLE; rdir[i] = 2; }   /* rua nova, atrás dos casarões */
    for (let y = C - 3; y <= C + 4; y++) for (let x = X0 + 3; x <= X0 + 14; x++) { const i = idx(x, y); if (rdir[i]) continue; ground[i] = (x + y) % 3 ? T.FLOORSTONE : T.STONE; }   /* praça das Casas */
    for (const S1 of HOUSE_SEATS) BUILDINGS.push({ x: X0 + 6, y: C + S1.y, ...BH('manor', 8, 7, 5.2, 3.2, S1.name, { door: 'W', seat: S1.id, v: 1, deco: 'seat', stairs: { 0: 'spiral', 1: 'ladder' }, door2L: [1, 0, 'E'] }) });   /* com cômodos, porta dos fundos na cozinha e janela com hera no 1º andar */   /* casarões das casas (no fim da lista) */
    BUILDINGS.push({ x: X0 + 18, y: C - 28, ...BH('club', 9, 8, 4.2, 1.2, 'Clube do Cervo de Prata', { door: 'W', floors: 1, deco: 'club', noble: 1 }) },   /* rua nova: clube de cavalheiros, termas romanas e o palácio da Dama Ysolde (no fim da lista) */
      { x: X0 + 17, y: C - 19, ...BH('baths', 13, 18, 4.2, 1.0, 'Termas de Aurora', { door: 'W', floors: 1, deco: 'thermae' }) },   /* 13 x 18: do Clube até perto da Casa de Veludo */
      { x: X0 + 17, y: C + 7, ...BH('velvet', 13, 12, 9.33, 1.2, 'Casa de Veludo', { door: 'W', floors: 4, deco: 'velvet', stairs: { 0: 'lift', 1: 'lift', 2: 'lift' } }) });
    BUILDINGS.push({ x: C - 11, y: C + 22, ...BH('house', 4, 4, 3.4, 2.0, 'Estúdio Âncora & Tinta', { v: 1, door: 'S', office: 'tattoo', floors: 1 }) });   /* estúdio de tatuagem, no lote ao lado do Estábulo (no fim da lista) */
    for (let y = y0; y <= y1; y++) for (let x = X0; x <= X1; x++) used[idx(x, y)] = 1;
    HOUSE_SEATS.forEach((S1, k) => { const bx = X0 + 4 + k * 2.4 | 0, by = k % 2 ? C + 4 : C - 3; const i = idx(bx, by); if (bld[i] < 0) { obj[i] = O.BANNER; BANNER_HOUSE[i] = S1.id; } });   /* estandartes das casas na praça */
  }
  { const S0 = { 'Empório do Borin': { 0: 'ladder' }, 'Pergaminhos & Mapas': { 0: 'spiral' }, 'Imobiliária Chave de Bronze': { 0: 'ext' }, 'Casa Morvane': { 0: 'spiral', 1: 'ladder' }, 'Elixires da Lua Prateada': { 0: 'spiral' } };   // escadas: o resto usa a de parede
    for (const b of BUILDINGS) { if (S0[b.name]) b.stairs = S0[b.name]; else if (b.kind === 'manor' && !b.seat) b.stairs = { 1: 'ladder' }; }
    const CEL = { 'Ronco do Dragão': [2, 0], 'Banco de Nae': [3, 1], 'Casa de Veludo': [0, 8] }; for (const b of BUILDINGS) if (CEL[b.name]) b.cellar = CEL[b.name]; }   // porões: adega atrás do balcão da taverna, cofre embaixo do banco   // casarões: o sótão é pelo alçapão
  if (!TEST3D) { /* ruas do replanejamento: uma travessa para cada porta nova (x0, y0, x1, y1 relativos ao centro) */
    const L = [[33, -21, 62, -20], [50, -11, 57, -10], [33, 18, 62, 19], [21, 31, 46, 32], [3, 26, 19, 27], [24, 18, 33, 19], [-20, 21, -19, 31], [-20, 29, 0, 30], [-30, 20, -21, 21], [-17, 9, -16, 14], [-23, -3, -17, -2], [-23, -10, -17, -9]];
    for (const [ax, ay, bx, by] of L) for (let y = C + ay; y <= C + by; y++) for (let x = C + ax; x <= C + bx; x++) { if (!inb(x, y)) continue; const i = idx(x, y); if (obj[i] === O.WALL || obj[i] === O.PART || obj[i] === O.TOWER || obj[i] === O.GATE) continue; obj[i] = O.NONE; ground[i] = T.COBBLE; rdir[i] = bx - ax > by - ay ? 1 : 2; used[i] = 1; } }
  if (!TEST3D) for (const [bi, rx, ry, w, h, door, dc] of CITY_RELAYOUT) { const b = BUILDINGS[bi]; if (!b) continue; if (b.w !== w || b.h !== h) delete b.arch; delete b.gen; b._old = { x: b.x, y: b.y, w: b.w, h: b.h }; Object.assign(b, { x: C + rx, y: C + ry, w, h, door, dcol: dc }); if (b.deco === 'seat') { delete b._d2; b.seatMirror = door === 'S' ? 1 : 0; b.seatSide = door === 'S' ? 'R' : door === 'E' ? 'L' : null; const A2 = door === 'S' || door === 'N' ? w : h;   /* a porta dos fundos e a hera ficam numa parede que a câmera vê (leste ou sul) */
      b.door2L = door === 'S' ? [A2 - 1, 2, 'E'] : door === 'E' ? [0, 2, 'S'] : [Math.floor(seatMapU(b, 1.5)), 0, 'E']; } }
  if (!TEST3D) { const b = BUILDINGS.find(q => q.name === 'Casa Lorvan'); if (b) { delete b.arch; delete b.gen; delete b.seat; Object.assign(b, { kind: 'tower', deco: 'steam', name: 'Torre do Inventor', floors: 6, stairs: ['clift', 'clift', 'clift', 'clift', 'clift'], tower: 1, round: 1, H: 14.4, RH: 2.6, wall: Math.round(14.4 * 19.6), roof: Math.round(2.6 * 19.6) }); } }   /* a Casa Lorvan virou a Torre do Inventor (Sxan the Creator) */
  if (!TEST3D) for (const bi of CITY_LOTS) { const b = BUILDINGS[bi]; if (!b) continue; delete b.seat; b._lotPend = 1; }   /* o lote nasce construído (casarão comum) e vira terreno vazio no fim do arquivo: lotPrepare guarda as duas versões para a obra */   /* terreno vazio cercado: fica na lista (os índices dos prédios salvos não mudam), mas não é desenhado nem mobiliado */
  BUILDINGS.forEach((b, bi) => {
    if (b.lot) { const [dx, dy] = doorTile(b); for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const i = idx(x, y), edge = x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1; ground[i] = (x * 7 + y * 3) % 5 ? T.DIRT : T.GRASS; obj[i] = edge && !(Math.abs(x - dx) + Math.abs(y - dy) <= 1 && (x === dx || y === dy)) ? O.LOWWALL : O.NONE; used[i] = 1; rdir[i] = 0; } return; }
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { bld[idx(x, y)] = bi; obj[idx(x, y)] = O.NONE; ground[idx(x, y)] = T.COBBLE; }
  });
  // escadas externas: o pé e a frente ficam livres; debaixo do patamar de cima não se passa
  BUILDINGS.forEach(b => { for (let f = 0; f < floorsOf(b) - 1; f++) { if (stairKind(b, f) !== 'ext') continue; const s = stairSpec(b, f);
    for (const p of [s.entry, s.L]) { const [x, y] = bLocal(b, p[0], p[1]), i = idx(x, y); if (bld[i] < 0) { obj[i] = O.NONE; ground[i] = T.COBBLE; } }
    { const [x, y] = bLocal(b, s.U[0], s.U[1]), i = idx(x, y); if (bld[i] < 0) { obj[i] = O.PART; ground[i] = T.COBBLE; } } } });

  { const hb = BUILDINGS[BUILDINGS.length - 1]; if (hb && hb.kind === 'hotel') { const [dx, dy] = bLocal(hb, doorCol(hb), bDims(hb)[1] - 1); for (let ox = -1; ox <= 1; ox++) for (let oy = 1; oy <= 2; oy++) { const i = idx(dx + ox, dy - oy); if (bld[i] < 0) obj[i] = O.NONE; } } }
  // ---- interiores ----
  BUILDINGS.forEach((b, bi) => {
    if (b.lot) return; const L = interiorLayout(b);
    for (const f of L.F) {
      placeFurniture(b, bi, f, obj, seats, idx);
    }
  });
  BUILDINGS.forEach((b, bi) => { if (b.deco !== 'velvet' || b.lot) return; for (let fl = 1; fl < floorsOf(b); fl++) { let n = 0; for (const f of interiorLayout(b, fl).F.slice().sort((a, c) => a.i - c.i)) {   /* quartos da Casa de Veludo: camas com dono por noite, bancos das galerias */
    if (f.t === 'vmoonbed') { const [x, y] = localToWorld(b, f.i + 1.5, f.j + 1), [x0, y0] = localToWorld(b, f.i + 1.5, f.j + 0.3), [x1, y1] = localToWorld(b, f.i + 1.5, f.j + 1.7); BEDS.push({ x, y, dx: x1 - x0, dy: y1 - y0, bi, fl, vlRoom: 'suite' }); }
    if (f.t === 'vbed') { n++; const [x, y] = localToWorld(b, f.i + 1, f.j + 1), [x0, y0] = localToWorld(b, f.i + 1, f.j + 0.3), [x1, y1] = localToWorld(b, f.i + 1, f.j + 1.7); BEDS.push({ x, y, dx: x1 - x0, dy: y1 - y0, bi, fl, vlRoom: String(fl * 100 + n) }); }
    if (f.seats) for (const [u, v2, d] of f.seats) { const [x, y] = localToWorld(b, u, v2); seats.push({ x, y, dir: bDir(b, d), h: 0.3, bi, fl }); }
    if (f.seat) { const [x, y] = localToWorld(b, f.i + f.w / 2, f.j + f.h / 2); seats.push({ x, y, dir: bDir(b, f.seat), h: 0.3, bi, fl }); } }
    if (fl === 3) for (const [u, v2, d] of [[5.85, 12.3, 1], [7.15, 12.3, 5]]) { const [x, y] = localToWorld(b, u, v2); seats.push({ x, y, dir: bDir(b, d), h: 0.3, bi, fl }); } } });   /* cadeiras da varanda da suíte */
  BUILDINGS.forEach((b, bi) => { if (b.deco !== 'velvet' || b.lot) return; for (const f of interiorLayout(b, -1).F) {   /* porão da Casa de Veludo: assentos da sala dos capangas e do escritório */
    if (f.seats) for (const [u, v2, d] of f.seats) { const [x, y] = localToWorld(b, u, v2); seats.push({ x, y, dir: bDir(b, d), h: 0.3, bi, fl: -1 }); }
    if (f.seat) { const [x, y] = localToWorld(b, f.i + f.w / 2, f.j + f.h / 2); seats.push({ x, y, dir: bDir(b, f.seat), h: 0.45, bi, fl: -1 }); } } });
  if (!TEST3D && typeof NPCS !== 'undefined') { /* quem trabalhava num prédio que mudou de lugar vai junto (as posições foram calculadas com o lugar antigo) */
    const mv = BUILDINGS.filter(b => b._old && !b.lot), fix = (x, y, keep) => { for (const b of mv) { const o = b._old; if (x >= o.x - 0.5 && x < o.x + o.w - 0.5 && y >= o.y - 0.5 && y < o.y + o.h - 0.5) { if (keep) { const L = interiorLayout(b); if (L.npc) return bLocal(b, L.npc.i, L.npc.j); } const nx = Math.min(b.x + b.w - 1, b.x + (x - o.x) * b.w / o.w), ny = Math.min(b.y + b.h - 1, b.y + (y - o.y) * b.h / o.h); return [nx, ny]; } } return null; };
    for (const n of NPCS) { if (n.x != null) { const p = fix(n.x, n.y, true); if (p) { n.x = p[0]; n.y = p[1]; } } for (const k of ['route', 'patrol']) if (n[k]) n[k] = n[k].map(q => fix(q[0], q[1]) || q); if (n.stall) n.stall = fix(n.stall[0], n.stall[1]) || n.stall; } }
  BUILDINGS.forEach((b, bi) => { if (b.kind !== 'tower') return; const [A0, D0] = bDims(b), fl = TOWER_APT_FL; APTS.push({ key: TOWER_APT, name: 'Apartamento de luxo', bi, fl, u0: 0, u1: A0, v0: 0, v1: D0, tower: 1 });   /* o andar inteiro (o elevador abre dentro dele) */
    for (const f of interiorLayout(b, fl).F) { const cx = f.i + f.w / 2, cz = f.j + f.h / 2, [x, y] = localToWorld(b, cx, cz);
      if (f.t === 'platbed') { const [x0, y0] = localToWorld(b, cx, f.j + 0.3), [x1, y1] = localToWorld(b, cx, f.j + f.h - 0.3); BEDS.push({ x, y, dx: x1 - x0, dy: y1 - y0, bi, fl, apt: TOWER_APT }); }
      if (f.t === 'chest') APT_CHESTS.unshift({ x, y, bi, fl, apt: TOWER_APT }); } });
  BUILDINGS.forEach((b, bi) => { if (b.kind !== 'dojo') return; const nF = floorsOf(b);   /* apartamentos: futon/cama, tansu e irori dos andares de cima */
    for (let fl = 1; fl < nF; fl++) { const top = fl === nF - 1, list = top ? [{ key: fl + '01', name: 'Suíte ' + fl + '01', u0: 0, u1: 6, suite: 1 }] : [{ key: fl + '01', name: 'Apto ' + fl + '01', u0: 3, u1: 6 }, { key: fl + '02', name: 'Apto ' + fl + '02', u0: 0, u1: 3 }];
      for (const a of list) APTS.push({ ...a, bi, fl, v0: 0, v1: bDims(b)[1] });
      for (const f of interiorLayout(b, fl).F) { const cx = f.i + f.w / 2, cz = f.j + f.h / 2, [x, y] = localToWorld(b, cx, cz), A = aptAt(bi, fl, x, y); if (!A) continue;
        if (f.t === 'futon' || f.t === 'platbed') { const [x0, y0] = localToWorld(b, cx, f.j + 0.3), [x1, y1] = localToWorld(b, cx, f.j + f.h - 0.3); BEDS.push({ x, y, dx: x1 - x0, dy: y1 - y0, bi, fl, apt: A.key }); }
        if (f.t === 'tansu') APT_CHESTS.push({ x, y, bi, fl, apt: A.key }); if (f.t === 'chest' || f.t === 'suitechest') APT_CHESTS.unshift({ x, y, bi, fl, apt: A.key });   /* a suíte tem um armário-baú ao lado da cama */
        if (f.t === 'zaisu') { const R = [[0, 1], [1, 0], [0, -1], [-1, 0]][f.v || 0], [x, y] = localToWorld(b, cx + (f.ox || 0), cz), [tx, ty] = localToWorld(b, cx + (f.ox || 0) + R[0], cz + R[1]); seats.push({ x, y, dir: vecDir8(tx - x, ty - y), h: 0.1, bi, fl, low: 1 }); }   /* almofada: senta no chão, virado para a mesinha */
        if (f.t === 'irori' || f.t === 'jkitchen') { const [sx, sy] = localToWorld(b, cx, f.j - 0.5), [fx, fy] = localToWorld(b, cx, f.j + 0.2); KITCHENS.push({ x, y, bi, fl, sx, sy, fx, fy, k: f.t }); }   /* de pé do lado de dentro, de frente para a bancada */
        if (f.t === 'zengarden') { const [dx, dy] = localToWorld(b, f.i + 1.45, f.j + 0.6), [tx, ty] = localToWorld(b, f.i + 2.3, f.j + 0.6); DUMMIES.push({ x: dx, y: dy, bi, fl, t: 'makiwara', fx: tx, fy: ty, apt: A.key, priv: 1 }); } } } });
  // ---- chão da cidade: pedra gasta, terra nas vielas, grama nos cantos, lajes na avenida ----
  for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = x0 + 2; x <= x1 - 2; x++) {
    const i = idx(x, y);
    if (bld[i] >= 0 || fl1[i] || obj[i] === O.PART || obj[i] === O.GATE || obj[i] === O.STAIRS || inBox(x, y, KEEP.x0, KEEP.y0, KEEP.x1, KEEP.y1)) continue;
    const n = vnoise(x / 4, y / 4, 640), n2 = vnoise(x / 2.2, y / 2.2, 641);
    let nb = false; for (const [dx, dy] of DIRS8) if (bld[idx(x + dx, y + dy)] >= 0) nb = true;
    if (rdir[i] && Math.abs(x - C - 0.5) <= 2 && y > KEEP.y1) ground[i] = T.FLOORSTONE;              // avenida real em lajes
    else if (rdir[i]) ground[i] = n2 > 0.78 ? T.DIRT : T.COBBLE;
    else if (nb) ground[i] = n > 0.45 ? T.DIRT : n2 > 0.6 ? T.GRASS : T.COBBLE;                      // vielas entre casas
    else ground[i] = n > 0.62 ? T.GRASS : n > 0.42 ? T.DIRT : T.COBBLE;
    if (!rdir[i] && obj[i] === O.NONE && hash2(x, y, 642) < 0.05) obj[i] = O.RUBBLE;
  }
  // bancos ao ar livre também são assentos
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (obj[idx(x, y)] === O.BENCH) seats.push({ x, y, dir: 7, h: 0.45, bi: -1 });
  // ---- decoração ----
  const nearBld = (x, y) => { for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (bld[idx(xx, yy)] >= 0) return true; return false; };
  // a frente de cada porta fica sempre livre
  const doorFree = new Set(); for (const b of BUILDINGS) { const [dx, dy] = doorTile(b), v = DOOR_V[b.door || 'S']; for (let k = 1; k <= 2; k++) for (const s2 of [-1, 0, 1]) doorFree.add(idx(dx + v[0] * k + (v[1] ? s2 : 0), dy + v[1] * k + (v[0] ? s2 : 0))); }
  const deco = (x, y, o) => { const i = idx(x, y); if (doorFree.has(i)) return; if (bld[i] < 0 && !stair[i] && !fl1[i] && !nearBld(x, y)) obj[i] = o; };
  const decoAny = (x, y, o) => { const i = idx(x, y); if (doorFree.has(i)) return; if (bld[i] < 0 && !stair[i] && !fl1[i]) obj[i] = o; };
  // campo de trigo da fazenda (Vila do Oeste)
  for (let y = C - 16; y <= C - 11; y++) for (let x = C - 76; x <= C - 64; x++) { const i = idx(x, y); if (bld[i] >= 0 || rdir[i]) continue; ground[i] = T.DIRT; obj[i] = (x + y) % 7 === 0 ? O.WHEATSPROUT : O.WHEAT; }
  // avenida da Catedral: da porta (escadaria) até a praça do portão sul
  { const AX0 = C + 10, AX1 = C + 14, AY0 = C + 17, AY1 = C + 27, PX0 = C - 1, PX1 = C + 14, PY0 = C + 28, PY1 = C + 31, mid = C + 12;
    const pave = (x, y) => { const i = idx(x, y); if (bld[i] >= 0) return; obj[i] = O.NONE; if (rdir[i]) return; const d = Math.abs(x - mid); ground[i] = d === 0 ? T.FLOORSTONE : (d + y) % 2 ? T.STONE : T.FLOORSTONE; };
    { const BIG = new Set([O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW, O.DEADTREE, O.BUSH]); for (let y = C + 17; y <= C + 31; y++) for (let x = C + 2; x <= C + 15; x++) if (BIG.has(obj[idx(x, y)])) obj[idx(x, y)] = O.NONE; }   // sem árvores grandes na frente da catedral e à direita do portão
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) pave(x, y);
    for (let y = PY0; y <= PY1; y++) for (let x = PX0; x <= PX1; x++) { const i = idx(x, y); if (bld[i] >= 0 || rdir[i]) continue; obj[i] = O.NONE; ground[i] = (x + y) % 3 === 0 ? T.STONE : T.FLOORSTONE; }
    const bkB = BUILDINGS.find(b => b.wk === 'bakery'), bkY = bkB ? bLocal(bkB, doorCol(bkB), bDims(bkB)[1] - 1)[1] : -1;   // a frente da porta da padaria fica livre
    const side = (y, o) => { for (const x of [AX0, AX1]) { if (x === AX0 && y === bkY) continue; const i = idx(x, y); if (bld[i] < 0 && !rdir[i]) obj[i] = o; } };
    side(AY0 + 1, O.STATUE); side(AY0 + 4, O.BANNER); side(AY0 + 5, O.FLOWERBED); side(AY0 + 6, O.LAMP); side(AY0 + 7, O.FLOWERBED); side(AY0 + 8, O.STATUE); side(AY0 + 9, O.BANNER); side(AY0 + 10, O.FLOWERBED);
    for (const [x, y, o] of [[C + 6, C + 29, O.STATUE], [C + 9, C + 28, O.LAMP], [C + 9, C + 31, O.LAMP], [C + 4, C + 28, O.FLOWERBED], [C + 4, C + 31, O.FLOWERBED], [C + 13, C + 30, O.FLOWERBED], [C + 7, C + 31, O.BENCH], [C + 5, C + 31, O.BENCH]]) { const i = idx(x, y); if (bld[i] < 0 && !rdir[i]) obj[i] = o; } }
  // quintal da Marta na frente da casa: cerca com portãozinho, duas árvores frutíferas, canteiros e a barraquinha com toldo
  { const X0 = C - 31, X1 = C - 25, Y0 = C + 19, Y1 = C + 22, gx = C - 27;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const i = idx(x, y); if (bld[i] >= 0 || rdir[i]) continue; obj[i] = O.NONE; ground[i] = x === gx ? T.COBBLE : T.GRASS;
      if ((x === X0 || x === X1 || y === Y1) && x !== gx) obj[i] = O.FENCE; }
    for (const [x, y] of [[C - 30, C + 20], [C - 26, C + 21]]) obj[idx(x, y)] = O.BERRY;   // frutíferas
    for (const [x, y] of [[C - 29, C + 20], [C - 29, C + 21], [C - 28, C + 21]]) { ground[idx(x, y)] = T.DIRT; obj[idx(x, y)] = O.FLOWER; }   // canteiros
    obj[idx(C - 26, C + 19)] = O.STALL; }   // barraquinha com toldo ao lado da porta
  // praça do banco (do outro lado da rua, onde ficava a catedral antiga): chafariz no meio, bancos, flores e postes
  { const X0 = C - 21, X1 = KEEP.x0 - 3, Y0 = C - 30, Y1 = C - 20, fx = C - 18, fy = C - 25;   /* encolhida: o castelo agora vai até x0 */
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const i = idx(x, y); if (bld[i] >= 0 || rdir[i]) continue; obj[i] = O.NONE; const edge = x === X0 || x === X1 || y === Y0 || y === Y1; ground[i] = edge ? T.GRASS : T.FLOORSTONE; if (edge && (x + y) % 2 === 0) obj[i] = O.FLOWER; }
    decoAny(fx, fy, O.FOUNTAIN);
    for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) decoAny(fx + dx, fy + dy, O.BENCH);
    for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) decoAny(fx + dx, fy + dy, O.LAMP);
    for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0]]) decoAny(fx + dx, fy + dy, O.FLOWER); }
  // praça do mercado
  decoAny(C, C + 13, O.FOUNTAIN);
  for (const [dx, dy] of [[-6, 10], [-3, 10], [-6, 16], [-3, 16]]) decoAny(C + dx, C + dy, O.STALL);   // (as do lado da catedral saíram)
  for (const [dx, dy] of [[-3, 12], [4, 12], [-3, 14], [4, 14]]) decoAny(C + dx, C + dy, O.BENCH);
  for (const [dx, dy] of [[-7, 12], [8, 13], [-7, 17], [8, 17]]) decoAny(C + dx, C + dy, (dx + dy) % 2 ? O.BARREL : O.CRATE);
  decoAny(C - 6, C + 14, O.CART);
  // avenida real: postes de luz, estandartes e estátuas na frente do castelo
  for (let y = KEEP.y1 + 4; y < y1 - 2; y += 5) { decoAny(C - 2, y, O.LAMP); decoAny(C + 3, y, O.LAMP); }
  decoAny(C - 3, KEEP.y1 + 2, O.STATUE); decoAny(C + 4, KEEP.y1 + 2, O.STATUE);
  decoAny(C - 1, KEEP.y1 + 1, O.BRAZIER); decoAny(C + 2, KEEP.y1 + 1, O.BRAZIER);
  decoAny(C - 2, y1 - 2, O.BRAZIER); decoAny(C + 3, y1 - 2, O.BRAZIER);
  decoAny(C - 1, y0 + 1, O.BRAZIER); decoAny(C + 2, y0 + 1, O.BRAZIER);
  for (let y = C - 18; y < y1 - 4; y += 6) { decoAny(C + 18, y, O.LAMP); decoAny(C + 21, y + 3, O.LAMP); }
  for (let x = x0 + 5; x < x1 - 4; x += 7) { if (Math.abs(x - C) > 4 && x > C - 8) { decoAny(x, C + 4, O.LAMP); } }
  for (const [x, y] of [[C - 25, C + 3], [C - 16, C + 3], [C - 25, C + 10], [C - 17, C + 10], [C - 10, C + 10]]) decoAny(x, y, O.LAMP);
  decoAny(x0 + 1, C + 12, O.BARREL); decoAny(x0 + 1, C + 13, O.CRATE); decoAny(x0 + 2, C + 12, O.CRATE); decoAny(x0 + 2, C + 13, O.BARREL); decoAny(x0 + 2, C + 10, O.HAY); decoAny(x0 + 2, C + 11, O.BARREL); decoAny(x0 + 1, C + 10, O.CRATE); decoAny(x0 + 1, C + 11, O.BARREL);   // canto entre a loja e a muralha
  for (let y = C + 3; y <= C + 10; y++) for (let x = x0 + 2; x <= C - 4; x++) { const i = idx(x, y); if (obj[i] === O.RUBBLE || obj[i] === O.TREE || obj[i] === O.RUBBLEBIG) obj[i] = O.NONE; }   // rua nova limpa e organizada
  // Ateliê: vitrines no passeio da frente e no lado do largo
  { const ab = BUILDINGS.find(q => q.name === 'Ateliê Real de Nae'); if (ab) { const [ddx] = doorTile(ab), fy = ab.y + ab.h, ex = ab.x + ab.w; for (const [x, y] of [[ab.x, fy], [ab.x + ab.w - 1, fy], [ex, fy - 2], [ex, fy - 5], [ex, fy - 8]]) if (Math.abs(x - ddx) > 0 || y !== fy) decoAny(x, y, O.VITRINE); } }   /* coladas na loja, onde ela estiver (Prancheta 25/11, 20h31) */
  // casa da Marta: quintal cercado com macieira, floreiras e caixotes de fruta na porta
  // (o quintal da Marta agora fica na frente da casa nova, atrás do Boticário)
  // bandeiras do castelo e pátio interno
  for (const x of [KEEP.x0 + 4, KEEP.x1 - 4]) decoAny(x, KEEP.y1 + 2, O.BANNER);
  decoAny(C - 3, C - 7, O.WELL);   /* poço do pátio interno */
  // pracinha do sul-oeste
  { const px = C - 17, py = C + 25; for (let yy = py - 3; yy <= py + 3; yy++) for (let xx = px - 4; xx <= px + 4; xx++) { const i = idx(xx, yy); if (bld[i] < 0 && !BLOCKING.has(obj[i])) { obj[i] = O.NONE; if (Math.hypot(xx - px, (yy - py) * 1.3) < 3.2) ground[i] = T.COBBLE; } }
    for (const [x, y, o] of [[px, py, O.WELL], [px - 3, py - 2, O.TREE], [px + 3, py + 2, O.TREE], [px - 2, py + 2, O.BENCH], [px + 2, py - 2, O.BENCH], [px + 3, py - 1, O.FLOWERBED], [px - 3, py + 1, O.FLOWERBED], [px, py - 3, O.LAMP], [px, py + 3, O.LAMP]]) decoAny(x, y, o); }
  // cadafalso com guilhotina: em frente ao castelo, à esquerda da porta, diante da estátua e do estandarte (tablado 3x3 + 1 tile livre para a escada)
  { let best = null;
    for (let r = 0; r < 7 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) {
      const cx = C - 4 + dx, cy = KEEP.y1 + 6 + dy; let ok = true;
      for (let yy = cy - 1; yy <= cy + 1 && ok; yy++) for (let xx = cx - 2; xx <= cx + 1 && ok; xx++) { const i = idx(xx, yy); if (bld[i] !== -1 || BLOCKING.has(obj[i]) || ground[i] === T.WATER || rdir[i] && yy > cy) ok = false; }
      if (ok) best = [cx, cy];
    }
    if (best) { const [cx, cy] = best; obj[idx(cx, cy)] = O.GUILLOTINE; obj[idx(cx - 1, cy)] = O.PART; obj[idx(cx - 2, cy)] = O.NONE; STAGE.x = cx; STAGE.y = cy; } }
  for (const [x, y, o] of [[C - 4, KEEP.y1 - 3, O.FLOWERBED], [C + 5, KEEP.y1 - 3, O.FLOWERBED], [C - 1, KEEP.y1 - 2, O.BRAZIER], [C + 2, KEEP.y1 - 2, O.BRAZIER], [C - 6, KEEP.y1 - 2, O.BENCH], [C + 7, KEEP.y1 - 2, O.BENCH], [C - 4, KEEP.y1 - 6, O.STATUE], [C + 5, KEEP.y1 - 6, O.STATUE]]) decoAny(x, y, o);
  // catedral: cemitério e jardim
  // cemitério onde ficava a catedral (do outro lado da rua)
  for (let gy = C - 29; gy <= C - 24; gy += 2) for (const gx of [C - 30, C - 28]) deco(gx, gy, O.GRAVE);
  deco(C - 31, C - 29, O.TREE); deco(C - 27, C - 26, O.TREE);
  for (let gy = C - 30; gy <= C - 23; gy++) deco(C - 26, gy, gy === C - 26 ? O.NONE : O.LOWWALL);   // muro baixo do cemitério com portão
  // forja, quartel, estábulo, taverna
  const sm = BUILDINGS[2]; decoAny(sm.x + sm.w, sm.y + 1, O.BARREL);   // (a bigorna que ficava no meio da rua saiu)
  const bk = BUILDINGS[4]; for (let k = 0; k < 4; k++) decoAny(bk.x + 1 + k * 2, bk.y + bk.h + 3, O.DUMMY); decoAny(bk.x + bk.w, bk.y + bk.h + 1, O.WEAPONRACK);
  const st = BUILDINGS[5]; decoAny(st.x + st.w + 1, st.y, O.HAY); decoAny(st.x + st.w + 1, st.y + 2, O.HAY); decoAny(st.x, st.y + st.h + 2, O.CART);
  // (sem a cerca na frente do estábulo: ela fechava o portãozinho do quintal da Marta)
  const tv = BUILDINGS[3]; decoAny(tv.x - 1, tv.y + tv.h + 1, O.TABLE); decoAny(tv.x + tv.w, tv.y + tv.h + 1, O.TABLE); decoAny(tv.x + tv.w, tv.y + 1, O.BARREL); decoAny(tv.x + tv.w, tv.y + 2, O.BARREL);
  // beco: caixas, barris e lampiões junto às lojas
  for (let k = 0; k < 10; k++) { const y = C - 18 + k * 5; decoAny(C + 18, y + 1, k % 2 ? O.BARREL : O.CRATE); }
  // bairro nobre: chafariz com estátuas, árvores e lampiões na avenida, jardins murados com sebes
  decoAny(C + 7, C + 9, O.NOTICEBOARD); NOTICE.x = C + 7; NOTICE.y = C + 9;   // quadro de avisos (bicos e entregas) na praça do mercado
  { // bairro nobre: limpa a área (árvores, muretas, rua antiga) e monta a avenida
    const AX0 = C + 20, AX1 = C + 24, AM = C + 22, Y0 = C - 22, Y1 = C + 18;
    for (let y = Y0; y <= Y1; y++) for (let x = C + 13; x <= C + 32; x++) { const i = idx(x, y); if (bld[i] >= 0 || (y >= C + 5 && y <= C + 6)) continue; obj[i] = O.NONE; if (x >= AX0 && x <= AX1) { rdir[i] = 0; ground[i] = x === AM || x === AX0 || x === AX1 ? T.FLOORSTONE : T.COBBLE; } else { rdir[i] = 0; ground[i] = T.GRASS; } }
    const put2 = (x, y, o) => { const i = idx(x, y); if (bld[i] < 0) obj[i] = o; };
    // chafariz central com canteiros e bancos
    const fx = AM, fy = C - 9; put2(fx, fy, O.FOUNTAIN); for (const [dx, dy, o] of [[-1, -2, O.FLOWERBED], [1, -2, O.FLOWERBED], [-1, 2, O.FLOWERBED], [1, 2, O.FLOWERBED], [-2, 0, O.BENCH], [2, 0, O.BENCH]]) put2(fx + dx, fy + dy, o);
    // portão ornamental na entrada norte e na travessia da rua principal: estátuas e estandartes
    /* o portão ornamental (estátuas e estandartes) saiu: as estátuas foram para o Largo das Estátuas (Prancheta 25/11, 16h) */
    // lampiões ornamentados ao longo da avenida
    for (let y = Y0 + 3; y <= Y1; y += 4) if (Math.abs(y - fy) > 3 && (y < C + 4 || y > C + 7)) { put2(AX0, y, O.LAMP); put2(AX1, y, O.LAMP); }
    // casarões: jardim murado na frente (lado da porta), com canteiros e a passagem da porta livre
    for (const b of BUILDINGS.filter(q => q.kind === 'manor' || q.noble || q.office)) { const [dtx, dty] = doorTile(b), front = b.door === 'E' ? b.x + b.w : b.door === 'W' ? b.x - 1 : -1; if (front < 0) continue;
      for (let y = b.y - 1; y <= b.y + b.h; y++) { if (Math.abs(y - dty) <= 0) continue; put2(front, y, y === b.y - 1 || y === b.y + b.h ? O.LOWWALL : (y % 2 ? O.BUSH : O.FLOWERBED)); } }
    // jardins formais entre os casarões
    for (const gy of [C - 15, C - 14, C - 7, C - 6, C + 1, C + 2]) for (const [x0, x1] of [[C + 13, C + 18], [C + 26, C + 31]]) for (let x = x0; x <= x1; x++) put2(x, gy, x === Math.round((x0 + x1) / 2) && gy % 2 ? O.STATUE : (x + gy) % 2 ? O.FLOWERBED : O.BUSH);
  }
  if (false) { const fx = C + 18, fy = C - 2;
    for (const [x, y, o] of [[fx, fy, O.FOUNTAIN], [fx - 4, fy - 3, O.STATUE], [fx + 4, fy - 3, O.STATUE], [fx - 4, fy + 3, O.STATUE], [fx + 4, fy + 3, O.STATUE], [fx - 2, fy - 3, O.BENCH], [fx + 2, fy + 3, O.BENCH], [fx - 2, fy + 3, O.FLOWERBED], [fx + 2, fy - 3, O.FLOWERBED]]) decoAny(x, y, o);
    for (let y = C - 20; y <= C + 14; y += 6) { if (Math.abs(y - fy) < 5) continue; decoAny(C + 16, y, O.BIRCH); decoAny(C + 21, y + 3, O.BIRCH); decoAny(C + 16, y + 3, O.LAMP); decoAny(C + 21, y, O.LAMP); }
    for (const b of BUILDINGS.filter(q => q.kind === 'manor')) {
      const gx0 = b.x - 2, gx1 = b.x + b.w, gy0 = b.y - 1, gy1 = b.y + b.h, [dtx, dty] = doorTile(b);
      for (let x = gx0; x <= gx1; x++) for (const y of [gy0, gy1]) decoAny(x, y, O.LOWWALL);
      for (let y = gy0; y <= gy1; y++) { if (Math.abs(y - dty) <= 0) continue; decoAny(gx0, y, O.LOWWALL); }
      for (let y = gy0 + 1; y < gy1; y++) if (Math.abs(y - dty) > 1) decoAny(gx0 + 1, y, (y % 2) ? O.BUSH : O.FLOWERBED);
    }
    for (let y = C - 20; y <= C + 14; y += 3) if (Math.abs(y - fy) > 5) { decoAny(C + 13, y, O.BUSH); decoAny(C + 14, y + 1, O.FLOWERBED); } }
  // poços e árvores nos bairros
  for (const [dx, dy] of [[-18, -6], [24, -18], [-20, 14], [27, 26]]) decoAny(C + dx, C + dy, O.WELL);
  for (let k = 0; k < 160; k++) {
    const x = x0 + 3 + Math.floor(R(k, 1, 900) * (x1 - x0 - 5)), y = y0 + 3 + Math.floor(R(k, 2, 900) * (y1 - y0 - 5)), i = idx(x, y);
    if (used[i] || bld[i] >= 0 || obj[i] !== O.NONE || nearBld(x, y) || fl1[i] || doorFree.has(i)) continue;
    const r = R(k, 3, 900);
    if (ground[i] === T.GRASS) obj[i] = r < 0.25 ? O.TREE : r < 0.4 ? O.BUSH : r < 0.7 ? O.FLOWER : O.TALLGRASS;
    else if (r < 0.06) obj[i] = O.BARREL;
  }
  for (let y = C + 5; y <= C + 11; y++) for (let x = C - 11; x <= C - 4; x++) { const i = idx(x, y); if (obj[i] === O.TREE || obj[i] === O.OAK) obj[i] = (x + y) % 2 ? O.BUSH : O.FLOWERBED; }   // esquina da rua com a feira: só vegetação baixa
  // tochas na estrada fora dos portões
  for (const [x, y] of [[C - 2, y1 + 6], [C + 3, y1 + 6], [C - 2, y1 + 14], [C + 3, y1 + 14], [C - 1, y0 - 6], [C + 2, y0 - 6]]) if (ground[idx(x, y)] !== T.WATER) set(x, y, null, O.TORCH);
  // arredores: bosques e flores perto do fosso
  for (let y = C - SAFE_R - 1; y <= C + SAFE_R + 2; y++) for (let x = C - SAFE_R - 1; x <= C + SAFE_R + 2; x++) {
    const i = idx(x, y);
    if (inBox(x, y, x0 - 4, y0 - 4, x1 + 4, y1 + 4) || ground[i] !== T.GRASS || obj[i] !== O.NONE) continue;
    const r = R(x, y, 77);
    obj[i] = r < 0.025 ? O.TREE : r < 0.05 ? O.BUSH : r < 0.15 ? O.TALLGRASS : r < 0.22 ? O.FLOWER : O.NONE;
  }
  if (!TEST3D) { // decoração da vila do oeste (depois dos bosques em volta, para nada nascer em cima)
    const X = d => x0 - d, put = (x, y, o) => { if (!inb(x, y)) return; const i = idx(x, y); if (bld[i] >= 0 || doorFree.has(i) || ground[i] === T.WATER || ground[i] === T.SHALLOW) return; obj[i] = o; };
    for (let y = HAM.y0; y <= HAM.y1; y++) for (let x = HAM.x0; x <= HAM.x1; x++) { if (!inb(x, y)) continue; const i = idx(x, y); if (zone[i] === Z.VILLAGE && bld[i] < 0 && (obj[i] === O.TREE || obj[i] === O.BUSH || obj[i] === O.ROCK)) obj[i] = O.NONE; }
    put(X(37), C + 5, O.WELL); put(X(39), C + 3, O.BENCH); put(X(35), C + 7, O.BENCH);
    for (let x = X(56); x <= X(30); x += 6) { put(x, C - 3, O.LAMP); put(x + 3, C + 3, O.LAMP); }
    // quintais com cerca baixa e hortinhas atrás das casas
    for (const [bx, by, w, back] of [[X(52), C - 7, 4, -1], [X(44), C - 7, 5, -1], [X(52), C + 4, 4, 1], [X(46), C + 4, 5, 1]]) { const fy = back < 0 ? by - 2 : by + 5; for (let x = bx - 1; x <= bx + w; x++) put(x, fy, O.FENCE); put(bx, fy - back, O.FLOWERBED); put(bx + w - 1, fy - back, O.CRATE); }
    // serraria: toras empilhadas e a roda d'água no rio
    for (const [x, y] of [[X(33), C + 9], [X(32), C + 9], [X(30), C + 9], [X(34), C + 3]]) put(x, y, O.LOG); put(X(28), C + 2, O.CART); put(X(27), C + 5, O.WATERWHEEL);
    // carpintaria e alambique
    put(X(39), C - 3, O.CRATE); put(X(32), C - 3, O.BARREL); put(X(26), C - 6, O.BARREL); put(X(39), C - 9, O.LOG);
    // horta: canteiros cercados
    for (let x = X(54); x <= X(40); x++) { put(x, C + 9, x === X(48) || x === X(49) ? O.NONE : O.FENCE); put(x, C + 18, O.FENCE); }
    for (let y = C + 10; y <= C + 17; y++) { put(X(54), y, O.FENCE); put(X(40), y, O.FENCE); }
    for (let y = C + 15; y <= C + 16; y++) for (let x = X(53); x <= X(41); x++) put(x, y, (x + y) % 3 ? O.HERB : O.FLOWERBED);
    for (let x = X(46); x <= X(41); x++) put(x, C + 12, O.HERB);
    put(X(53), C + 12, O.HAY); put(X(53), C + 10, O.BARREL);
    // pedreira em volta da mina
    for (const [dx, dy] of [[-3, -2], [-2, -3], [5, -2], [6, 0], [-3, 1], [5, 3], [-4, 3], [1, -3], [3, -3]]) put(X(48) + dx, C - 17 + dy, O.BOULDER);
    put(X(46), C - 12, O.CART); put(X(49), C - 12, O.CRATE);
  }
  if (STAGE.x >= 0) for (let yy = STAGE.y - 3; yy <= STAGE.y + 4; yy++) for (let xx = STAGE.x - 3; xx <= STAGE.x + 3; xx++) { const i2 = idx(xx, yy); if (obj[i2] === O.LAMP && Math.hypot(xx - STAGE.x, yy - STAGE.y - 0.5) < 3.2) obj[i2] = O.NONE; }
  for (const n of NPCS) obj[idx(Math.round(n.x), Math.round(n.y))] = O.NONE;
  { const fr = NPCS.find(n => n.id === 'fruit'); if (fr) for (const [dx, dy] of [[1, -1], [-1, -1], [1, 1], [-1, 1], [2, -1]]) { const x = fr.stall[0] + dx, y = fr.stall[1] + dy, i = idx(x, y); if (bld[i] < 0 && obj[i] === O.NONE && !(x === Math.round(fr.x) && y === Math.round(fr.y))) { obj[i] = O.STOOL; FRUIT_STOOL.x = x; FRUIT_STOOL.y = y; break; } } }
  if (!TEST3D) { /* replanejamento 2 (Prancheta 24/11): caminhos de pedra até as portas novas; por último, porque o bairro nobre é limpo e ajardinado antes */
    const L2 = [[20, 9, 21, 10], [21, 7, 22, 9], [-10, 30, -10, 31], [54, -13, 55, -12], [23, -7, 24, -6], [22, -7, 23, -6], [21, -6, 22, 4], [25, 29, 25, 30], [20, -10, 21, -9], [21, -22, 21, -10], [32, 29, 32, 30], [15, -25, 15, -24], [3, 28, 10, 28], [44, 29, 44, 30], [20, -18, 21, -17], [21, -22, 21, -18], [16, 2, 17, 4], [26, 2, 27, 4], [-4, -7, 0, -6], [0, -7, 1, -3], [1, -7, 3, -6], [30, -30, 35, -29], [54, 30, 55, 31], [57, -1, 57, 0], [40, -25, 42, -24], [27, 19, 27, 20], [54, -25, 57, -24], [41, -1, 41, 0], [55, 16, 56, 17], [17, 28, 18, 29]];
    for (const [ax, ay, bx, by] of L2) for (let y = C + ay; y <= C + by; y++) for (let x = C + ax; x <= C + bx; x++) { if (!inb(x, y)) continue; const i = idx(x, y); if (bld[i] >= 0 || obj[i] === O.WALL || obj[i] === O.PART || obj[i] === O.TOWER || obj[i] === O.GATE || obj[i] === O.FOUNTAIN) continue; obj[i] = O.NONE; ground[i] = T.COBBLE; rdir[i] = bx - ax > by - ay ? 1 : 2; } }
  if (!TEST3D) { /* replanejamento 3 (Prancheta 25/11): Rua da Muralha Norte, travessas até as portas novas e praças nos espaços que ficaram livres */
    const L3 = [[-35, -36, 75, -35], [49, 20, 51, 21], [58, -25, 66, -24], [20, -15, 20, -14], [10, 28, 10, 29], [21, -28, 22, -25], [31, 2, 32, 4], [63, 18, 69, 19], [49, -1, 49, 0], [68, -10, 69, -1], [54, 34, 67, 35]];   /* a rua do norte e as travessas até as portas que ficaram longe */
    const solidO = o => o === O.WALL || o === O.PART || o === O.TOWER || o === O.GATE || o === O.FOUNTAIN;
    for (const [ax, ay, bx, by] of L3) for (let y = C + ay; y <= C + by; y++) for (let x = C + ax; x <= C + bx; x++) { if (!inb(x, y)) continue; const i = idx(x, y); if (bld[i] >= 0 || solidO(obj[i])) continue; ground[i] = T.COBBLE; obj[i] = O.NONE; rdir[i] = ax === bx ? 2 : ay === by ? 1 : (bx - ax >= by - ay ? 1 : 2); }
    const doorNear = new Set(); for (const b of BUILDINGS) { if (b.ham) continue; const [dx, dy] = doorTile(b); for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) doorNear.add(idx(dx + a, dy + c)); }
    const PLAZAS = [[-17, -46, -2, -33], [43, -34, 62, -23], [64, -9, 75, 8], [54, 20, 59, 33, 2], [54, 36, 80, 39, 2], [72, 21, 80, 33, 1]];   /* Praça do Portão Norte, Praça do Clube, Jardim Leste; jardins da Prancheta 25/11 16h: onde era a Draemor, ao sul da Draemor nova e no trecho leste novo */
    for (const [ax, ay, bx, by, gard] of PLAZAS) { const X0 = C + ax, Y0 = C + ay, X1 = C + bx, Y1 = C + by, free = (x, y) => { if (!inb(x, y)) return false; const i = idx(x, y); return bld[i] < 0 && !solidO(obj[i]) && !rdir[i]; };
      for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { if (!free(x, y)) continue; const i = idx(x, y), edge = x === X0 || y === Y0 || x === X1 || y === Y1; ground[i] = edge ? T.GRASS : ((x + y) % 2 ? T.FLOORSTONE : T.COBBLE); obj[i] = O.NONE; }
      const put = (x, y, o) => { if (!free(x, y) || doorNear.has(idx(x, y))) return false; obj[idx(x, y)] = o; if (o === O.BENCH) seats.push({ x, y, dir: 7, h: 0.45, bi: -1 }); return true; };
      const cx = Math.round((X0 + X1) / 2), cy = Math.round((Y0 + Y1) / 2), big = X1 - X0 >= 8 && Y1 - Y0 >= 8;
      if (big && put(cx, cy, O.FOUNTAIN)) { for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) put(cx + dx, cy + dy, O.BENCH); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(cx + dx, cy + dy, O.FLOWERBED); }
      else if (gard) { put(cx, cy, gard === 2 ? O.FLOWERBED : O.OAK); for (const [dx, dy] of [[-2, 0], [2, 0]]) put(cx + dx, cy + dy, O.BENCH); for (const [dx, dy] of [[0, -1], [0, 1]]) put(cx + dx, cy + dy, O.FLOWERBED); }
      else { put(cx, cy, O.STATUE); for (const [dx, dy] of [[-1, 0], [1, 0]]) put(cx + dx, cy + dy, O.BENCH); }
      for (const [x, y] of [[X0 + 1, Y0 + 1], [X1 - 1, Y0 + 1], [X0 + 1, Y1 - 1], [X1 - 1, Y1 - 1]]) put(x, y, O.LAMP);
      let k = 0; for (let x = X0; x <= X1; x += 3) for (const y of [Y0, Y1]) put(x, y, (k++ % 3) ? O.FLOWERBED : gard === 2 ? O.BUSH : (k % 2 ? O.OAK : O.BIRCH));   /* jardim tipo 2 (faixa estreita na frente de um prédio): sem árvores grandes */
      for (let y = Y0 + 3; y < Y1; y += 3) for (const x of [X0, X1]) put(x, y, (k++ % 2) ? O.FLOWERBED : O.BUSH); }
  }
  if (!TEST3D) { /* Largo das Estátuas (Prancheta 25/11, 16h): as cinco estátuas do antigo portão da avenida nobre, em cruz, com bancos virados para a do meio */
    const X0 = C + 41, Y0 = C + 31, X1 = C + 51, Y1 = C + 38, cx = C + 46, cy = C + 35, solidO = o => o === O.WALL || o === O.PART || o === O.TOWER || o === O.GATE;
    const dn = new Set(); for (const b of BUILDINGS) { if (b.ham) continue; const [dx, dy] = doorTile(b); for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) dn.add(idx(dx + a, dy + c)); }
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const i = idx(x, y); if (bld[i] >= 0 || solidO(obj[i])) continue; const r = Math.max(Math.abs(x - cx), Math.abs(y - cy)); ground[i] = r <= 1 ? T.STONE : r === 2 ? T.FLOORSTONE : ((x + y) % 2 ? T.FLOORSTONE : T.COBBLE); obj[i] = O.NONE; rdir[i] = 0; }
    const put = (x, y, o) => { const i = idx(x, y); if (bld[i] >= 0 || solidO(obj[i]) || dn.has(i)) return; obj[i] = o; if (o === O.BENCH) seats.push({ x, y, dir: 7, h: 0.45, bi: -1 }); };
    for (const [dx, dy] of [[0, 0], [-3, -2], [3, -2], [-3, 2], [3, 2]]) put(cx + dx, cy + dy, O.STATUE);
    for (const [dx, dy] of [[-1, -2], [1, -2], [-1, 2], [1, 2]]) put(cx + dx, cy + dy, O.BENCH);
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -1], [0, 1]]) put(cx + dx, cy + dy, O.FLOWERBED);
    for (const [x, y] of [[X0, Y0 + 2], [X1, Y0 + 2], [X0, Y1], [X1, Y1]]) put(x, y, O.LAMP);
    for (const x of [X0 + 1, X1 - 1]) for (const y of [Y0 + 4, Y0 + 5]) put(x, y, O.BUSH); }
  for (const b of BUILDINGS) { if (!b.lot) continue; const [dx, dy] = doorTile(b);   /* o lote vazio por último: as passagens de decoração do bairro limpam e enfeitam a área */
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const i = idx(x, y), edge = x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1; ground[i] = (x * 7 + y * 3) % 5 ? T.DIRT : T.GRASS; obj[i] = edge && !(Math.abs(x - dx) + Math.abs(y - dy) <= 1 && (x === dx || y === dy)) ? O.LOWWALL : O.NONE; rdir[i] = 0; } }
  if (!TEST3D) { /* árvores da cidade (Prancheta 25/11, 20h31): nenhuma árvore a menos de 2 casas de um prédio (a copa entra na fachada) nem na frente de uma porta */
    const TREES = new Set([O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW, O.DEADTREE]), X1c = Math.max(x1, CITY_X1), near = new Uint8Array(N), door = new Uint8Array(N);
    for (const b of BUILDINGS) { if (b.ham || b.x > X1c + 3 || b.x + b.w < x0 - 3 || b.y > y1 + 3 || b.y + b.h < y0 - 3) continue;
      for (let y = b.y - 2; y < b.y + b.h + 4; y++) for (let x = b.x - 2; x < b.x + b.w + 4; x++) if (inb(x, y)) near[idx(x, y)] = 1;   /* 4 casas nos lados sul e leste: é o lado que a câmera vê, onde a copa tampa a fachada */
      const [dx, dy] = doorTile(b); for (let y = dy - 3; y <= dy + 3; y++) for (let x = dx - 3; x <= dx + 3; x++) if (inb(x, y)) door[idx(x, y)] = 1; }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= X1c; x++) { const i = idx(x, y); if ((TREES.has(obj[i]) || obj[i] === O.BUSH) && (door[i] || near[i])) obj[i] = O.FLOWERBED; } }   /* vira canteiro (baixo): arbusto também tampava a porta */
  for (let k = seats.length - 1; k >= 0; k--) if (seats[k].bi < 0) seats.splice(k, 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (obj[idx(x, y)] === O.BENCH) seats.push({ x, y, dir: 7, h: 0.45, bi: -1 });
  { const tb = BUILDINGS.find(b => b.name === 'Alfaiataria Real'); if (tb) for (let x = tb.x; x < tb.x + tb.w; x++) { const i = idx(x, tb.y + tb.h); if (bld[i] < 0) obj[i] = O.NONE; } }   // corredor livre entre a Alfaiataria e a loja de elixir

  return { ground, obj, zone, bld, fl1, stair, stairK, tvar, toff, rdir, wdir, gateId, gates, seats, height, flow, river };
}

// mobília -> obstáculos (PART) e assentos, no quadro do mundo
function placeFurniture(b, bi, f, obj, seats, idx) {
  if (f.t === 'stairup' || f.t === 'stairdown' || f.t === 'spiral' || f.t === 'spiraltop' || f.t === 'ladder' || f.t === 'laddertop' || f.t === 'lift' || f.t === 'lifttop' || f.t === 'clift' || f.t === 'clifttop' || f.t === 'extdoor') return;
  if (f.t === 'celldoor') { const [dx, dy] = bLocal(b, f.i, f.j), [sx, sy] = bLocal(b, f.i, f.j - 1), tiles = new Set(); for (let a = f.i - 1; a <= f.i; a++) for (let c = 0; c <= 1; c++) { const [tx, ty] = bLocal(b, a, c); tiles.add(ty * MAP_W + tx); } JAILCELLS.push({ door: [dx, dy], spot: [sx, sy], tiles, bi }); }
  if (f.cab != null) {   // cabine da pousada
    const Q = HOTEL_CABS[f.cab] || (HOTEL_CABS[f.cab] = { k: f.cab, bi });
    if (f.t === 'cot') Q.bedIdx = BEDS.length;
    if (f.t === 'chest') { const [x, y] = bLocal(b, f.i, f.j); Q.chest = { x, y }; }
    if (f.t === 'cabindoor') { const [x, y] = bLocal(b, f.i, f.j); Q.door = [x, y]; Q.di = y * MAP_W + x; Q.spot = bLocal(b, f.adj[0], f.adj[1]); Q.tiles = new Set(f.inner.map(([i, j]) => { const [tx, ty] = bLocal(b, i, j); return ty * MAP_W + tx; })); HOTEL_DOORS.set(Q.di, f.cab); }
  }
  if (f.t === 'cot' || f.t === 'futon') { const [px, py] = bLocal(b, f.i, f.j), [fx, fy] = bLocal(b, f.i, f.j + f.h - 1); BEDS.push({ x: (px + fx) / 2, y: (py + fy) / 2, dx: fx - px, dy: fy - py, bi }); }
  if (f.t === 'stove') { const [x, y] = bLocal(b, f.i, f.j); KITCHENS.push({ x, y, bi, k: 'stove' }); }
  if (f.t === 'makiwara' || f.t === 'mokujin') { const [x, y] = bLocal(b, f.i, f.j), side = f.i === 0 ? 1 : -1, [fx, fy] = bLocal(b, f.i + side, f.j); DUMMIES.push({ x, y, bi, t: f.t, fx, fy }); }
  if (f.t === 'chest' && (b.kind === 'house' || b.kind === 'manor') && !b.office) { const [x, y] = bLocal(b, f.i, f.j); CHESTS.push({ x, y, bi }); }
  if (f.t === 'bed') { const [px, py] = bLocal(b, f.i + (f.w - 1) / 2, f.j), [fx, fy] = bLocal(b, f.i + (f.w - 1) / 2, f.j + f.h - 1); BEDS.push({ x: (px + fx) / 2, y: (py + fy) / 2, dx: fx - px, dy: fy - py, bi }); }
  for (let a = 0; a < f.w; a++) for (let c = 0; c < f.h; c++) { const [x, y] = bLocal(b, f.i + a, f.j + c); if (f.block) obj[idx(x, y)] = O.PART; }
  if (f.seats) for (const [u, v2, d] of f.seats) { const [x, y] = localToWorld(b, u, v2); seats.push({ x, y, dir: bDir(b, d), h: 0.3, bi, vb: f.c }); }   /* reservados da Casa de Veludo: lugares em volta da mesa */
  if (!f.seat) return;
  const dir = bDir(b, f.seat);
  if (f.t === 'pew') for (let a = 0; a < f.w; a++) { const [x, y] = bLocal(b, f.i + a, f.j); seats.push({ x, y, dir, h: 0.45, bi }); }
  else { const [x0, y0] = bLocal(b, f.i, f.j), [x1, y1] = bLocal(b, f.i + f.w - 1, f.j + f.h - 1); seats.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 - (f.t === 'swordthrone' ? 0.35 : 0), dir, h: f.t === 'throne' ? 0.6 : f.t === 'swordthrone' ? 0.95 : 0.45, bi }); }   /* o trono de espadas fica no alto de três degraus */
}
// ---------- gerador do bairro de teste ----------
function generateDistrict() {
  const N = MAP_W * MAP_H;
  const ground = new Uint8Array(N).fill(T.GRASS), obj = new Uint8Array(N), zone = new Uint8Array(N);
  const bld = new Int16Array(N).fill(-1), fl1 = new Uint8Array(N), stair = new Uint8Array(N), stairK = new Uint8Array(N);
  const tvar = new Uint8Array(N), toff = new Uint8Array(N).fill(4), rdir = new Uint8Array(N), wdir = new Uint8Array(N), gateId = new Int8Array(N).fill(-1);
  const height = new Uint8Array(N), flow = new Float32Array(N * 2), river = new Uint8Array(N);
  const gates = [], seats = [];
  const idx = (x, y) => y * MAP_W + x, R = (x, y, s) => hash2(x, y, s);
  const WY = 17;                                     // linha da muralha
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const i = idx(x, y);
    zone[i] = y < 14 ? Z.FIELDS : Z.VILLAGE;
    if (x < 3 || y < 2 || x > MAP_W - 4 || y > MAP_H - 4) ground[i] = T.WATER;
    else if (y === 14 || y === 15) ground[i] = x >= 38 && x <= 41 ? T.BRIDGE : T.WATER;   // fosso e ponte
    else if (y > WY) ground[i] = vnoise(x / 4, y / 4, 700) > 0.62 ? T.DIRT : T.GRASS;
    else if (y < 14 && vnoise(x / 6, y / 6, 701) > 0.66) ground[i] = T.FOREST;
    if (ground[i] === T.BRIDGE) rdir[i] = 2;
  }
  const street = (ax, ay, bx, by, dir, g = T.COBBLE) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) { ground[idx(x, y)] = g; rdir[idx(x, y)] = dir; } };
  street(38, 2, 41, 13, 2, T.DIRT);                  // estrada lá fora
  street(38, WY + 1, 41, 39, 2);                     // rua principal (portão -> praça)
  street(14, 30, 66, 31, 1);                         // rua das lanternas
  street(29, 40, 51, 54, 1);                         // praça
  for (let y = 41; y <= 53; y++) for (let x = 30; x <= 50; x++) if ((x + y) % 7 === 0 && vnoise(x / 3, y / 3, 702) > 0.5) ground[idx(x, y)] = T.FLOORSTONE;
  // muralha norte, torres e portão
  for (let x = 8; x <= 72; x++) { const i = idx(x, WY); obj[i] = O.WALL; fl1[i] = 1; wdir[i] = 4; ground[i] = T.FLOORSTONE; }
  const tower = (tx, ty, v, walk) => { for (let y = ty; y <= ty + 1; y++) for (let x = tx; x <= tx + 1; x++) { const i = idx(x, y); obj[i] = O.PART; fl1[i] = walk ? 1 : 0; ground[i] = T.FLOORSTONE; } const a = idx(tx + 1, ty + 1); obj[a] = O.TOWER; tvar[a] = v; toff[a] = (1) * 3 + 0; };
  tower(7, WY, 0, 1); tower(72, WY, 1, 1); tower(22, WY, 2, 1);
  tower(36, WY, 3, 0); tower(42, WY, 3, 0);          // torres altas do portão
  for (let x = 38; x <= 41; x++) { const i = idx(x, WY); obj[i] = O.GATE; fl1[i] = 0; gateId[i] = 0; }
  gates.push({ x0: 38, x1: 41, y: WY, out: -1, kind: 'main' });
  // construções
  BUILDINGS.forEach((b, bi) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { bld[idx(x, y)] = bi; obj[idx(x, y)] = O.NONE; ground[idx(x, y)] = T.COBBLE; } });
  // torre-escada: rampa no meio, laterais fechadas, sobe até a muralha
  BUILDINGS.forEach((b, bi) => {
    if (b.kind !== 'stairtower') return;
    const cx = b.x + 1;
    for (let j = 0; j < b.h; j++) { for (const x of [b.x, b.x + 2]) obj[idx(x, b.y + j)] = O.PART; }
    for (let j = 0; j < STAIR_N; j++) { const i = idx(cx, b.y + j); obj[i] = O.STAIRS; stair[i] = 4; stairK[i] = STAIR_N - 1 - j; fl1[i] = 3; ground[i] = T.FLOORSTONE; }
  });
  // mobília e assentos
  BUILDINGS.forEach((b, bi) => { const L = interiorLayout(b); for (const f of L.F) placeFurniture(b, bi, f, obj, seats, idx); });
  // decoração
  const put = (x, y, o) => { const i = idx(x, y); if (bld[i] < 0 && !fl1[i] && !stair[i]) obj[i] = o; };
  put(40, 47, O.FOUNTAIN);
  for (const [x, y] of [[32, 42], [48, 42], [32, 52], [48, 52]]) put(x, y, O.STALL);
  for (const [x, y] of [[37, 46], [43, 46], [37, 49], [43, 49]]) put(x, y, O.BENCH);
  for (const [x, y] of [[30, 41], [50, 41], [30, 53], [50, 53]]) put(x, y, O.TREE);
  for (let x = 16; x <= 64; x += 6) { put(x, 29, O.LAMP); put(x + 3, 32, O.LAMP); }
  for (let y = 20; y <= 38; y += 6) { put(37, y, O.LAMP); put(42, y + 3, O.LAMP); }
  put(36, 21, O.BRAZIER); put(43, 21, O.BRAZIER); put(34, 44, O.BARREL); put(46, 50, O.CRATE); put(33, 48, O.CART);
  put(20, 24, O.WELL); put(60, 26, O.TREE); put(18, 36, O.TREE); put(62, 36, O.TREE); put(52, 29, O.BANNER); put(28, 29, O.BANNER);
  for (let k = 0; k < 120; k++) { const x = 4 + Math.floor(R(k, 1, 703) * 72), y = 3 + Math.floor(R(k, 2, 703) * 10), i = idx(x, y); if (ground[i] === T.WATER || rdir[i]) continue; const r2 = R(k, 3, 703); obj[i] = r2 < 0.18 ? O.TREE : r2 < 0.3 ? O.BUSH : r2 < 0.38 ? O.ROCK : O.TALLGRASS; }
  for (let k = 0; k < 60; k++) { const x = 10 + Math.floor(R(k, 4, 704) * 60), y = WY + 3 + Math.floor(R(k, 5, 704) * 50), i = idx(x, y); if (ground[i] !== T.GRASS || obj[i] || bld[i] >= 0) continue; let near = false; for (const [dx, dy] of DIRS8) if (bld[idx(x + dx, y + dy)] >= 0) near = true; if (!near) obj[i] = R(k, 6, 704) < 0.5 ? O.FLOWER : O.TALLGRASS; }
  for (const n of NPCS) obj[idx(Math.round(n.x), Math.round(n.y))] = O.NONE;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (obj[idx(x, y)] === O.BENCH) seats.push({ x, y, dir: 7, h: 0.45, bi: -1 });
  return { ground, obj, zone, bld, fl1, stair, stairK, tvar, toff, rdir, wdir, gateId, gates, seats, height, flow, river };
}
const WORLD = TEST3D ? generateDistrict() : generateWorld();
// o carrasco fica ao lado do cadafalso, perto da alavanca
if (STAGE.x >= 0) { const ex = NPCS.find(n => n.id === 'executioner'); if (ex) { const c = [[0.1, 1.05], [0.1, -1.05], [1.1, 1.0]].find(([dx, dy]) => !BLOCKING.has(WORLD.obj[Math.round(STAGE.y + dy) * MAP_W + Math.round(STAGE.x + dx)])) || [0.1, 1.05]; ex.x = STAGE.x + c[0]; ex.y = STAGE.y + c[1]; } }
// corretor de imóveis (a casa do escritório só existe depois de gerar o mundo)
if (!TEST3D) { const ab = BUILDINGS.find(b => b.office === 'agency'); if (ab) { const [ax, ay] = bLocal(ab, 1, 1), [c1x, c1y] = bLocal(ab, 4, 1), [c2x, c2y] = bLocal(ab, 4, 2), [c3x, c3y] = bLocal(ab, 3, 2), [c4x, c4y] = bLocal(ab, 3, 3);   /* dois no banco de pedra lá fora (lado sul), dois nas almofadas */ NPCS.push({ id: 'agent', name: 'Mestre Farid, o agenciador', kind: 'agent', x: ax, y: ay }, { id: 'cand1', name: 'Rosa, candidata a doméstica', kind: 'v_candf', x: c1x, y: c1y, sitting: 1 }, { id: 'cand2', name: 'Tobias, candidato a doméstico', kind: 'v_maidm', x: c2x, y: c2y, sitting: 1 }, { id: 'cand3', name: 'Inês, candidata a doméstica', kind: 'v_maidf2', x: c3x, y: c3y, kneel: 1 }, { id: 'cand4', name: 'Nuno, candidato a segurança', kind: 'v_segm2', x: c4x, y: c4y, kneel: 1 }); } }
if (!TEST3D) { const tb = BUILDINGS.find(b => b.office === 'tattoo'); if (tb) NPCS.push({ id: 'tattooist', name: 'Velho Tibúrcio, o Tatuador', kind: 'tattooist', ...npcIn(tb, { x: tb.x + 1, y: tb.y + 1 }) }); }
if (!TEST3D) { const ob = BUILDINGS.find(b => b.office === 'estate'); if (ob) NPCS.push({ id: 'broker', name: 'Mestre Anselmo, o Corretor', kind: 'broker', ...npcIn(ob, { x: ob.x + 1, y: ob.y + 1 }) }); }
// ---------- gente dos negócios: artesãos das oficinas, balconistas das lojas vagas e mensageiros (os 12 primeiros moradores) ----------
if (!TEST3D) { const hb = BUILDINGS.find(b => b.kind === 'hotel'); if (hb) NPCS.push({ id: 'hotelkeeper', name: 'Dona Ilsa, a Estalajadeira', kind: 'hotelkeeper', ...npcIn(hb, { x: hb.x + hb.w - 2, y: hb.y + hb.h - 1 }) }); }
if (!TEST3D) { const bb = BUILDINGS.find(b => b.kind === 'bank'); if (bb) { NPCS.push({ id: 'banker', name: 'Mestre Varkas, o Banqueiro', kind: 'banker', ...npcIn(bb, { x: bb.x + 1, y: bb.y + 1 }) }); const [w, h] = bDims(bb); (w >= 8 && h >= 10 ? [['banker2', 'Edda, a Caixa', w - 2, 3], ['banker3', 'Osric, o Contador', 1, 6], ['banker4', 'Gorim, o Escriturário', w - 2, 6], ['banker5', 'Hilde, a Tesoureira', 1, 9], ['banker6', 'Brann, o Avaliador', w - 2, 9], ['bankporter', 'Tobb, o Porteiro', 2, h - 1]] : w >= 6 && h >= 10 ? [['banker2', 'Edda, a Caixa', w - 1, 3], ['banker3', 'Osric, o Contador', 0, 6], ['banker4', 'Gorim, o Escriturário', w - 1, 6], ['banker5', 'Hilde, a Tesoureira', 0, 9], ['banker6', 'Brann, o Avaliador', w - 1, 9], ['bankporter', 'Tobb, o Porteiro', w - 2, h - 2]] : [['banker2', 'Edda, a Caixa', 2, 1], ['banker3', 'Osric, o Contador', w - 3, 1]]).forEach(([id, name, i, j]) => { const [x, y] = bLocal(bb, i, j); NPCS.push({ id, name, kind: id, x, y }); }); } }
const STAFF_NAMES = {
  dojo: 'Mestre Tetsuo, o Sensei',
  saw: 'Bruno Serra, o Serrador', mine: 'Gunnar Pedrafunda, o Mineiro', farm: 'Rosa Quintal, a Hortelã', carp: 'Elias Plaina, o Carpinteiro', alch: 'Odila Varga, a Destiladora',
  wheat: 'Tonico Espiga, o Fazendeiro', mill: 'Dona Firmina, a Moleira', bakery: 'Mestre Bartolo, o Padeiro', witch: 'Morgana Vespertina, a Alquimista', apoth: 'Clara Malva, a Boticária', arcane: 'Silas Runa, o Balconista', tailor: 'Berta Agulha, a Costureira', scroll: 'Teodoro Tinta, o Copista',
};
const SHOP_TYPE_BY_NAME = { 'Elixires da Lua Prateada': 'witch', 'Boticário de Elva': 'apoth', 'Arcanos & Varinhas': 'arcane', 'Alfaiataria Real': 'tailor', 'Pergaminhos & Mapas': 'scroll' };
if (!TEST3D) {
  BUILDINGS.forEach((b, bi) => {
    if (b.kind === 'workshop') NPCS.push({ id: 'st_' + b.wk, kind: 'st_' + b.wk, role: 'artisan', bi, name: STAFF_NAMES[b.wk], ...npcIn(b, { x: b.x + 1, y: b.y + 1 }) });
    if (b.kind === 'tower') { const L0 = interiorLayout(b, 0).npc || { i: 4, j: 5 }, [x, y] = bLocal(b, L0.i, L0.j); NPCS.push({ id: 'sxan', kind: 'inventor', bi, name: 'Sxan the Creator', x, y }); }   /* o inventor, atrás do balcão da loja da torre */
    if (b.kind === 'dojo') { const [x, y] = bLocal(b, 3, 1); NPCS.push({ id: 'st_dojo', kind: 'st_dojo', role: 'artisan', bi, name: STAFF_NAMES.dojo, x, y }); }   // o sensei, na frente do kamiza
    const st = b.kind === 'shop' && SHOP_TYPE_BY_NAME[b.name]; if (st) { b.shopType = st; NPCS.push({ id: 'st_' + st, kind: 'st_' + st, role: 'clerk', bi, name: STAFF_NAMES[st], ...npcIn(b, { x: b.x + 1, y: b.y + 1 }) }); }
  });
  const sq = { x: CENTER - 32 - 37, y: CENTER + 4 };   // pracinha da vila do oeste (x0 - 37)
  NPCS.push({ id: 'supplier', kind: 'supplier', role: 'supplier', name: 'Jonas, o Entregador do Fornecedor', x: C + 3.6, y: C + 27 });   // espera as encomendas perto do portão principal
  [['courier1', 'Pip, o Mensageiro', -1.2, 0], ['courier2', 'Lia Ventura, a Mensageira', 1.2, -0.6], ['courier3', 'Tomé Passolargo, o Carroceiro', 1.6, 1.6]].forEach(([id, name, dx, dy]) => NPCS.push({ id, kind: id, role: 'courier', name, x: sq.x + dx, y: sq.y + dy }));
  [['courier4', 'courier1', 'Bento Pé-Ligeiro, o Mensageiro', -1.6, 1.4], ['courier5', 'courier2', 'Clara do Moinho, a Mensageira', 2.4, -0.2], ['courier6', 'courier3', 'Ruy Carreteiro, o Carroceiro', -2.2, -1.0]].forEach(([id, kind, name, dx, dy]) => NPCS.push({ id, kind, role: 'courier', name, x: sq.x + dx, y: sq.y + dy }));   // mais mensageiros
}
// ---------- economia dos negócios: mercadorias, o que cada loja vende e o que cada oficina faz ----------
const GOODS = {
  wood: { n: 'Madeira', p: 2, ic: '🪵' }, ore: { n: 'Minério', p: 3, ic: '🪨' }, crystal: { n: 'Cristais', p: 14, ic: '💎' }, herb: { n: 'Ervas', p: 3, ic: '🌿' }, flax: { n: 'Linho e tecidos', p: 4, ic: '🧵' },
  woodgoods: { n: 'Varinhas e artigos de madeira', p: 8, ic: '🪄' }, wheat: { n: 'Trigo', p: 2, ic: '🌾' }, fruit: { n: 'Frutas', p: 3, ic: '🍎' }, flour: { n: 'Farinha', p: 5, ic: '🥣' }, loaves: { n: 'Pães', p: 7, ic: '🍞' }, pies: { n: 'Tortas', p: 13, ic: '🥧' }, cakes: { n: 'Bolos', p: 18, ic: '🎂' }, tools: { n: 'Ferramentas', p: 16, ic: '⚒' }, serve: { n: 'Mesas servidas', p: 4, ic: '🍺' }, paper: { n: 'Papel e pergaminho', p: 7, ic: '📜' }, potion: { n: 'Poções e tônicos', p: 11, ic: '🧪' },
};
// o que a mercadoria vira quando um jogador compra no balcão
const GOOD_ITEM = { potion: { pot: 'hp' }, flax: { pot: 'band' }, herb: { loot: 'herb' }, crystal: { loot: 'gem' }, woodgoods: { loot: 'wand' }, paper: { loot: 'map' }, wood: { loot: 'firewood' }, ore: { loot: 'gem' } };
// item do inventário → mercadoria (para colocar no estoque da loja ou no depósito da oficina)
const ITEM_GOOD = { wheat: ['wheat', 1], apple: ['fruit', 1], berries: ['fruit', 1], log: ['wood', 1], hardwood: ['wood', 2], wand: ['woodgoods', 1], wand_fine: ['woodgoods', 2], wand_arcane: ['woodgoods', 4], gem: ['crystal', 1], herb: ['herb', 1], map: ['paper', 1], flaxraw: ['flax', 1], ore: ['ore', 1] };
const SHOP_GOODS = { witch: ['potion', 'crystal'], apoth: ['potion', 'herb'], arcane: ['crystal', 'woodgoods'], tailor: ['flax'], scroll: ['paper'] };
const WORKS = {
  saw: { n: 'Serraria', make: { wood: 2 } }, mine: { n: 'Mina', make: { ore: 2, crystal: 0.2 } }, farm: { n: 'Horta', make: { herb: 2, flax: 1 } },
  wheat: { n: 'Fazenda', make: { wheat: 2 } }, mill: { n: 'Moinho', recipes: { flour: { wheat: 2 } } }, bakery: { n: 'Padaria', recipes: { loaves: { flour: 1 }, pies: { flour: 1, fruit: 1 }, cakes: { flour: 2, fruit: 1 } } },
  forge: { n: 'Forja', recipes: { tools: { wood: 1, ore: 2 } } }, tavern: { n: 'Taverna', recipes: { serve: { flax: 1 } } },
  carp: { n: 'Carpintaria', recipes: { woodgoods: { wood: 2 }, paper: { wood: 2 } } }, alch: { n: 'Alambique', recipes: { potion: { herb: 2 } } },
  dojo: { n: 'Dojô' },   // serviço: diárias de quem treina e aulas do sensei
};
/* funções dos contratados: lojas 1 vendedor + 2 no estoque; oficinas que extraem 1 vendedor + 2 fabricando + 3 coletando; oficinas que transformam 1 vendedor + 2 fabricando (o dojô continua como era) */
const STAFF_ROLE_N = { sell: 'Vendedor', make: 'Fabricando', coll: 'Coletando', stock: 'No estoque' };
const COLL_OF = { saw: ['saw'], mine: ['mine'], farm: ['farm'], wheat: ['wheat'] };   /* só as oficinas que extraem têm coletores; as que transformam recebem a matéria-prima pelos mensageiros */
function staffCaps(P) { if (!P || P.wk === 'dojo') return null; if (P.kind === 'shop') return { sell: 1, stock: 2 }; if (P.kind === 'workshop') return COLL_OF[P.wk] ? { sell: 1, make: 2, coll: 3 } : { sell: 1, make: 2 }; return null; }
function staffNorm(P, B) { const C = staffCaps(P); if (!C || !B || !B.staff) return; const cnt = {}; for (const s of B.staff) if (s.ro && C[s.ro]) cnt[s.ro] = (cnt[s.ro] || 0) + 1;
  const ext = P.kind === 'workshop' && ['saw', 'mine', 'farm', 'wheat'].includes(P.wk), order = P.kind === 'shop' ? ['sell', 'stock'] : ext ? ['coll', 'make', 'sell'] : ['make', 'sell', 'coll'];
  for (const s of B.staff) if (!s.ro || !C[s.ro]) { s.ro = order.find(k => (cnt[k] || 0) < C[k]) || order[0]; cnt[s.ro] = (cnt[s.ro] || 0) + 1; } }
const MARGIN = [{ n: 'Barato', k: 1.25, p: 0.9 }, { n: 'Justo', k: 1.6, p: 0.7 }, { n: 'Caro', k: 2.1, p: 0.42 }];
const BIZ_UP = {   // melhorias: custo por nível (até 3)
  shelf: { n: 'Prateleiras e depósito', d: '+80 de estoque por nível', cost: [250, 600, 1200], for: 'shop' },
  vitrine: { n: 'Vitrine e letreiro', d: '+60% de clientes por nível e mais moradores passando', cost: [300, 700, 1500], for: 'shop' },
  tools: { n: 'Ferramentas', d: '+60% de produção por nível (na taverna, +60% de renda; na pedreira, mais cristais)', cost: [300, 700, 1500], for: 'workshop' },
  safe: { n: 'Trancas reforçadas', d: 'menos roubo de mercadoria à noite por nível', cost: [200, 500, 1000], for: 'both' },
};
// ---------- mercado imobiliário: imóveis da cidade (casas para alugar; lojas e oficinas por enquanto com donos NPC) ----------
const ESTATE_DAY_MS = 12 * 60 * 1000;   // um dia do jogo
// relógio do jogo: normalmente igual ao relógio real; o Tecelão pode pausar ou acelerar (o anfitrião manda para todos)
const SIMCLK = { base: 0, real: 0, rate: 1, paused: false };
function gameNow() { return SIMCLK.real ? SIMCLK.base + (SIMCLK.paused ? 0 : (Date.now() - SIMCLK.real) * SIMCLK.rate) : Date.now(); }
function simRate() { return SIMCLK.paused ? 0 : SIMCLK.rate; }
function simSet(g, rate, paused) { SIMCLK.base = g; SIMCLK.real = Date.now(); SIMCLK.rate = rate; SIMCLK.paused = !!paused; }
const BIZ_HOUR_MS = ESTATE_DAY_MS / 24;   // uma hora do jogo = 30 s
const RENT_DAYS = 7;   // o aluguel é cobrado por semana (7 dias do jogo)
// estações: cada uma dura 7 dias do jogo (84 min reais); o ano tem 4
const SEASONS = [{ k: 'spring', n: 'Primavera' }, { k: 'summer', n: 'Verão' }, { k: 'autumn', n: 'Outono' }, { k: 'winter', n: 'Inverno' }];
function seasonNow(t) { const day = Math.floor((t ?? gameNow()) / ESTATE_DAY_MS), i = Math.floor(day / 7) % 4; return { i, k: SEASONS[i].k, n: SEASONS[i].n, day: (day % 7) + 1 }; }
const PROPS = [], PROPS_BY = {};
(function buildProps() {
  if (TEST3D) return;
  const district = b => { const x = b.x + b.w / 2 - C, y = b.y + b.h / 2 - C; return x < -45 ? 'Vila do Oeste' : y < -14 ? 'Alto da Catedral' : x > 12 ? (y > 12 ? 'Bairro da Guarda' : 'Bairro Nobre') : y > 12 ? 'Rua do Mercado' : x < -12 ? 'Rua Nova' : 'Centro'; };
  const ownerOf = b => { const n = NPCS.find(q => !q.role && q.x >= b.x - 0.5 && q.x < b.x + b.w - 0.5 && q.y >= b.y - 0.5 && q.y < b.y + b.h - 0.5); return n ? n.name.split(',')[0] : null; };
  let n = 0;
  BUILDINGS.forEach((b, bi) => {
    const fl = b.floors || 1, area = b.w * b.h, base = { bi, area, w: b.w, h: b.h, floors: fl, district: district(b) };
    let P = null;
    if (b.kind === 'house' || b.kind === 'dojo') n++;   // conta o escritório (e o prédio do dojô, que era a Casa 12) também: os números das outras casas não mudam
    if (b.kind === 'house' && !b.office) { P = { ...base, id: 'h' + bi, kind: 'house', name: 'Casa ' + n, rent: (4 + Math.round(area * 0.3) + (fl - 1) * 4) * 2 }; }   // casas 2x mais caras: a pousada é o começo
    else if (b.kind === 'manor' && !b.seat) P = { ...base, id: 'm' + bi, kind: 'house', manor: true, name: b.name || 'Casarão', rent: Math.round((4 + Math.round(area * 0.3) + (fl - 1) * 4) * 2 * 1.4) };   // casarões do bairro nobre: aluguel e venda
    else if (b.kind === 'tavern') P = { ...base, id: 's' + bi, kind: 'workshop', wk: 'tavern', name: b.name, npcOwner: 'Brom', rent: 20 + Math.round(area * 0.8) };
    else if (b.kind === 'dojo') P = { ...base, id: 'w' + bi, kind: 'workshop', wk: 'dojo', name: b.name, npcOwner: 'Mestre Tetsuo', rent: 16 + Math.round(area * 0.7) };   // o dojô (os aluguéis dos apartamentos entram na etapa 4)
    else if (b.kind === 'smith') P = { ...base, id: 'w' + bi, kind: 'workshop', wk: 'forge', name: b.name, npcOwner: 'Hrodgar', rent: 16 + Math.round(area * 0.7) };
    else if (b.kind === 'shop' || b.kind === 'boutique') P = { ...base, id: 's' + bi, kind: 'shop', shopType: b.shopType, name: b.name || 'Loja', npc: b.shopType ? null : ownerOf(b), rent: 20 + Math.round(area * 0.8) + (fl - 1) * 6 };
    else if (b.kind === 'bank') P = { ...base, id: 'b' + bi, kind: 'bank', name: b.name, rent: 450, repMin: 70 };
    else if (b.kind === 'hotel') P = { ...base, id: 'b' + bi, kind: 'hotel', name: b.name, rent: 35 };
    else if (b.kind === 'workshop') P = { ...base, id: 'w' + bi, kind: 'workshop', wk: b.wk, name: b.name, rent: 16 + Math.round(area * 0.7) };
    else if (b.kind === 'smith' || b.kind === 'stable') P = { ...base, id: 'w' + bi, kind: 'workshop', name: b.name || (b.kind === 'stable' ? 'Estábulo' : 'Oficina'), npc: b.kind === 'stable' ? 'a Guarda' : ownerOf(b), rent: 16 + Math.round(area * 0.7) };
    if (P) { // localização: perto do castelo é área nobre (mais caro), na periferia e na vila é barato
      const d = Math.hypot(b.x + b.w / 2 - C, b.y + b.h / 2 - (C - 14)); P.loc = clamp(1.75 - d / 30, 0.55, 1.75); if (P.manor) P.loc = Math.max(P.loc, 1.5); P.locName = P.manor ? 'bairro nobre' : P.loc > 1.35 ? 'área nobre' : P.loc > 0.95 ? 'centro' : P.loc > 0.7 ? 'bairro' : 'periferia';
      P.rent = Math.max(3, Math.round(P.rent * P.loc)); P.week = P.rent * 7; P.buy = P.rent * 60; PROPS.push(P); PROPS_BY[P.id] = P; }
  });
  // todo negócio sem jogador tem um dono NPC (que vende o ponto; não aluga)
  const OWN = ['Mestre Aurélio Vaz', 'Dona Brígida Sal', 'Seu Custódio Pena', 'Dona Filomena Rocha', 'Mestre Gaspar Lume', 'Dona Henriqueta Mós', 'Seu Inácio Ferraz', 'Dona Joana Trigo', 'Mestre Lauro Brasa', 'Dona Matilde Cera', 'Seu Norberto Funil', 'Dona Odete Lã', 'Mestre Prudêncio Faia', 'Dona Quitéria Junco'];
  for (const A of APTS) { if (A.tower) { const b = BUILDINGS[A.bi], rent = 64, P = { bi: A.bi, area: (A.u1 - A.u0) * (A.v1 - A.v0), w: A.u1 - A.u0, h: A.v1 - A.v0, floors: 1, district: district(b), id: 'ap' + A.key, kind: 'house', apt: A.key, fl: A.fl, name: 'Apartamento de luxo · Torre do Inventor', rent, loc: 1.5, locName: 'bairro nobre' }; P.week = rent * 7; P.buy = rent * 60; PROPS.push(P); PROPS_BY[P.id] = P; continue; } const b = BUILDINGS[A.bi], rent = A.suite ? 0 : 23; const P = { bi: A.bi, area: (A.u1 - A.u0) * 5, w: A.u1 - A.u0, h: 5, floors: 1, district: district(b), id: 'ap' + A.key, kind: 'house', apt: A.key, fl: A.fl, suite: A.suite ? 1 : 0, name: A.name + ' · Punho de Ferro', rent, loc: 1, locName: A.suite ? 'suíte de luxo' : 'apartamento' }; P.week = rent * 7; P.buy = rent * 60; PROPS.push(P); PROPS_BY[P.id] = P; }   // apartamentos do prédio do dojô (aluguel vai para o dono do dojô)
  let oi = 0; for (const P of PROPS) if (P.npcOwner) continue; else if ((P.kind === 'shop' || P.kind === 'workshop') && !P.npc) P.npcOwner = OWN[oi++ % OWN.length]; else if (P.kind === 'hotel') P.npcOwner = 'Dona Ilsa';
})();
// ---------- moradores: cada um mora numa casa da cidade ou da vila (as casas com inquilino não ficam para alugar, mas podem ser compradas) ----------
const RES_HOME = {}, RES_LINES = {
  any: ['Que dia comprido...', 'Viu o preço do pão?', 'Dizem que o dragão voltou a voar.', 'A guarda anda nervosa.', 'Vai chover, minhas costas sabem.', 'Amanhã tem mais.', 'Nae já foi mais calma.', 'Ouvi um grito na floresta ontem.', 'Saúde!', 'Ha! Essa é boa.'],
  st_saw: ['A serra não para.', 'O rio subiu de novo.', 'Elias, madeira não é manteiga!'], st_mine: ['Achei um veio novo... talvez.', 'Lua cheia não é dia de cavar.', 'Bruno, mais uma rodada?'],
  st_farm: ['As ervas estão lindas.', 'Um dia ainda faço uma estufa.', 'Tomé passou por aqui hoje?'], st_carp: ['Fiz uma varinha nova!', 'O mestre Bruno só reclama.', 'Teodoro me mandou outra carta.'],
  st_alch: ['Fogo baixo, paciência.', 'Não pergunte do porto.', 'Rosa, as suas ervas são as melhores.'], st_apoth: ['Ninguém sabe da Elva...', 'O estoque está fraco.', 'Essa Odila não me engana.'],
  st_arcane: ['Já contei do arquimago?', 'Não encoste no que brilha.', 'Os magos do castelo me ignoram.'], st_tailor: ['Sabia que o Aurélio tinge com chá?', 'Vou vencer aquele Aurélio!', 'Pip, já comeu hoje?'],
  st_scroll: ['Um bom mapa vale mais que uma espada.', 'Há túneis sob o castelo...', 'Shh. Esqueça o que eu disse.'],
  courier1: ['Num pé só!', 'Quero botas de verdade.', 'Lia corre mais que eu... às vezes.'], courier2: ['Ninguém me alcança!', 'Um dia entro para a guarda.', 'Pip, cuidado na viela!'], courier3: ['Devagar se vai longe.', 'Saudade da minha mula.', 'Bom dia, Rosa...'],
};
if (!TEST3D) {
  const houses = PROPS.filter(P => P.kind === 'house' && !BUILDINGS[P.bi].extra), used = new Set();
  const take = (ids, P) => { if (!P) return; used.add(P.id); P.tenants = ids; for (const id of ids) RES_HOME[id] = P.bi; };
  const nearestTo = (x, y, pool) => pool.filter(P => !used.has(P.id)).sort((a, b) => Math.hypot(BUILDINGS[a.bi].x - x, BUILDINGS[a.bi].y - y) - Math.hypot(BUILDINGS[b.bi].x - x, BUILDINGS[b.bi].y - y))[0];
  const vila = houses.filter(P => P.district === 'Vila do Oeste'), city = houses.filter(P => P.district !== 'Vila do Oeste');
  const staffAt = id => { const n = NPCS.find(q => q.id === id); return n ? [n.x, n.y] : [C, C]; };
  for (const ids of [['st_saw', 'st_mine'], ['st_farm', 'courier2'], ['st_carp', 'courier1'], ['st_alch', 'courier3']]) { const [x, y] = staffAt(ids[0]); take(ids, nearestTo(x, y, vila)); }
  for (const id of ['st_apoth', 'st_arcane', 'st_tailor', 'st_scroll']) { const [x, y] = staffAt(id); take([id], nearestTo(x, y, city)); }
  for (const [id, bi] of [['courier4', 27], ['courier5', 30], ['courier6', 26]]) { const P = PROPS.find(q => q.bi === bi); if (P) { RES_HOME[id] = bi; P.tenants = (P.tenants || []).concat(id); } }   /* 3.5: os mensageiros novos moram com o parceiro de rota */
  for (const n of NPCS) if (RES_HOME[n.id] != null) n.home = RES_HOME[n.id];
}
// porta trancada: L = { bi: [nomes em minúsculas que podem entrar] }; só bloqueia ENTRAR (quem já está dentro sai)
/* casarões das casas: os guardas só deixam entrar pela frente quem a casa aceita; a porta dos fundos só abre com gazua (L vem do anfitrião) */
function seatBlocked(name, ox, oy, x, y, L) {
  if (!L) return false; const bi = WORLD.bld[tileAt(x, y)]; if (bi == null || bi < 0) return false; const b = BUILDINGS[bi]; if (!b || b.deco !== 'seat') return false;
  if (WORLD.bld[tileAt(ox, oy)] === bi) return false; const s = L[bi]; if (!s) return false; const nm = String(name || '').trim().toLowerCase(), d2 = door2Of(b);
  if (d2 && Math.round(x) === d2.x && Math.round(y) === d2.y) return !(s.b || []).includes(nm);
  return !!s.g && !(s.f || []).includes(nm); }
function estateBlocked(name, ox, oy, x, y, L) {
  if (!L) return false; const bi = WORLD.bld[tileAt(x, y)]; if (bi == null || bi < 0) return false;
  const a = L[bi]; if (!a) return false; if (WORLD.bld[tileAt(ox, oy)] === bi) return false;
  return !a.includes(String(name || '').trim().toLowerCase());
}
function npcGroup(id, kind) {
  const k = String(kind || ''), n = NPCS.find(q => q.id === id);
  if (/^(guard|captain|jailer|executioner)/.test(k)) return 'guarda';
  if (/noble|banker|bankporter|tailor|gardener/.test(k) || /noble/.test(id)) return 'nobres';
  if (n && n.home != null && BUILDINGS[n.home] && BUILDINGS[n.home].x < C - 52) return 'vila';
  if (/^(st_|merchant|innkeeper|smith|fruit|broker|hotelkeeper|supplier|courier)/.test(k) || /^st_/.test(id)) return 'comerc';
  return 'cidade';
}
const NPC_AT = new Set(NPCS.filter(n => WORLD.bld[Math.round(n.y) * MAP_W + Math.round(n.x)] >= 0 && !n.route && !n.patrol && !n.pairOf && n.kind !== 'guard').map(n => Math.round(n.y) * MAP_W + Math.round(n.x)));   // só quem fica parado dentro de um prédio (balconistas) bloqueia o tile; sentinelas e quem anda na rua não

function inBounds(x, y) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; }
// tile (inteiro) andável no andar z
function walkableTile(x, y, z = 0) {
  if (!inBounds(x, y)) return false;
  const i = y * MAP_W + x;
  if (z === 1) return WORLD.fl1[i] > 0;
  const g = WORLD.ground[i];
  return g !== T.WATER && g !== T.CLIFF && !BLOCKING.has(WORLD.obj[i]) && !NPC_AT.has(i);
}
// objetos redondos: colidem só no tamanho real (círculo), não no tile inteiro
const OBJ_R = { [O.NOTICEBOARD]: 0.3, [O.WATERWHEEL]: 0.45, [O.TREE]: 0.38, [O.PINE]: 0.34, [O.OAK]: 0.44, [O.BIRCH]: 0.26, [O.WILLOW]: 0.4, [O.ROCK]: 0.34, [O.STUMP]: 0.24, [O.DEADTREE]: 0.3, [O.GRAVE]: 0.28, [O.CAMPFIRE]: 0.3,
  [O.BARREL]: 0.28, [O.CRATE]: 0.32, [O.HOARD]: 0.5, [O.HAY]: 0.38, [O.BRAZIER]: 0.24, [O.DUMMY]: 0.22, [O.STATUE]: 0.4, [O.ANVIL]: 0.3, [O.WEAPONRACK]: 0.32, [O.WELL]: 0.46 };
function solidTile(x, y, L) {
  if (!inBounds(x, y)) return true;
  const i = y * MAP_W + x;
  const g = WORLD.ground[i], o = WORLD.obj[i];
  if (L === 1) return !(WORLD.fl1[i] > 0) || (g === T.CLIFF && BLOCKING.has(o) && !OBJ_R[o]);
  return g === T.WATER || g === T.CLIFF || (BLOCKING.has(o) && !OBJ_R[o]);
}
function roundHit(x, y, r, top = false) {
  const tx = Math.round(x), ty = Math.round(y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = tx + dx, yy = ty + dy; if (!inBounds(xx, yy)) continue;
    const i = yy * MAP_W + xx; if ((WORLD.ground[i] === T.CLIFF && WORLD.fl1[i] > 0) !== top) continue;
    const rr = OBJ_R[WORLD.obj[i]] || (NPC_AT.has(i) ? 0.3 : 0);
    if (rr && (x - xx) * (x - xx) + (y - yy) * (y - yy) < (rr + r) * (rr + r)) return true;
  }
  return false;
}
// posição livre (contínua) — testa um círculo de raio r
// paredes das construções (finas), com abertura na porta
/* prédio de planta circular (Torre do Inventor): parede redonda por dentro, com o vão da porta no térreo */
function roundWallHit(b, x, y, r, noDoor) { const cx = b.x - 0.5 + b.w / 2, cy = b.y - 0.5 + b.h / 2, R = Math.min(b.w, b.h) / 2 - 0.13, d = Math.hypot(x - cx, y - cy); if (d < R - r) return false;
  if (!noDoor) { const s = b.door || 'S', [dtx, dty] = doorTile(b), g = 0.62 - r; if ((s === 'E' && x > cx || s === 'W' && x < cx) && Math.abs(y - dty) <= g) return false; if ((s === 'S' && y > cy || s === 'N' && y < cy) && Math.abs(x - dtx) <= g) return false; }
  return true; }
function wallHit(x, y, r) {
  const tx = Math.round(x), ty = Math.round(y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!inBounds(tx + dx, ty + dy)) continue;
    const bi = WORLD.bld[(ty + dy) * MAP_W + tx + dx]; if (bi < 0) continue;
    const b = BUILDINGS[bi], X0 = b.x - 0.5, X1 = X0 + b.w, Y0 = b.y - 0.5, Y1 = Y0 + b.h, t = 0.12;
    if (x < X0 - r - t || x > X1 + r + t || y < Y0 - r - t || y > Y1 + r + t) continue;
    if (b.round && x > X0 && x < X1 && y > Y0 && y < Y1 && roundWallHit(b, x, y, r)) return true;
    const s = b.door || 'S', [dtx, dty] = doorTile(b), gap = 0.62 - r, d2 = door2Of(b);
    const nL = Math.abs(x - X0) < r + t, nR = Math.abs(x - X1) < r + t, nT = Math.abs(y - Y0) < r + t, nB = Math.abs(y - Y1) < r + t;
    const g2 = side => d2 && d2.s === side && (side === 'W' || side === 'E' ? Math.abs(y - d2.y) : Math.abs(x - d2.x)) <= gap;   /* segunda porta */
    if (nL && !(s === 'W' && Math.abs(y - dty) <= gap) && !g2('W')) return true;
    if (nR && !(s === 'E' && Math.abs(y - dty) <= gap) && !g2('E')) return true;
    if (nT && !(s === 'N' && Math.abs(x - dtx) <= gap) && !g2('N')) return true;
    if (nB && !(s === 'S' && Math.abs(x - dtx) <= gap) && !g2('S')) return true;
  }
  return false;
}
// passagem entre dois tiles vizinhos (para o caminho do clique): só entra/sai de construção pela porta
function edgeOk(ax, ay, bx, by) {
  const B = (x, y) => WORLD.bld[y * MAP_W + x];
  const a = B(ax, ay), c = B(bx, by);
  if (ax !== bx && ay !== by) return a === c && B(ax, by) === a && B(bx, ay) === a;
  if (a === c) return !(a >= 0 && (BUILDINGS[a].deco === 'machiya' || BUILDINGS[a].deco === 'thermae' || BUILDINGS[a].deco === 'seat' || intHasThin(BUILDINGS[a])) && iwallCross(a, 0, ax, ay, bx, by));
  const inB = a >= 0 ? a : c, ix = a >= 0 ? ax : bx, iy = a >= 0 ? ay : by, ox = a >= 0 ? bx : ax, oy = a >= 0 ? by : ay;
  if (a >= 0 && c >= 0) return false;
  const b = BUILDINGS[inB], [dtx, dty] = doorTile(b), v = DOOR_V[b.door || 'S'], d2 = door2Of(b);
  if (d2) { const v2 = DOOR_V[d2.s]; if (ix === d2.x && iy === d2.y && ox === ix + v2[0] && oy === iy + v2[1]) return true; }
  return ix === dtx && iy === dty && ox === ix + v[0] && oy === iy + v[1];
}
// andares de cima: só dentro do prédio, sem móveis, paredes fechadas (sem porta)
const FLOOR_BLOCK = new Map();
function floorBlocked(bi, fl) {
  const k = bi * 8 + fl + 1; let s = FLOOR_BLOCK.get(k); if (s) return s;
  s = new Set(); const b = BUILDINGS[bi];
  for (const f of interiorLayout(b, fl).F) if (f.block) for (let a = 0; a < f.w; a++) for (let c = 0; c < f.h; c++) { const [x, y] = bLocal(b, f.i + a, f.j + c); s.add(y * MAP_W + x); }
  FLOOR_BLOCK.set(k, s); return s;
}
function canStandFloor(x, y, bi, fl, r = 0.24) {
  const b = BUILDINGS[bi]; if (!b) return false;
  const t = 0.14, X0 = b.x - 0.5 + t + r, X1 = b.x - 0.5 + b.w - t - r, Y0 = b.y - 0.5 + t + r, Y1 = b.y - 0.5 + b.h - t - r;
  if (x < X0 || x > X1 || y < Y0 || y > Y1) { const bc = balconyOf(b, fl); if (!bc) return false;   /* varanda: fora da fachada, até o guarda-corpo */
    const [u, v] = worldToLocal(b, x, y), D = bDims(b)[1]; if (!(v > D - 0.45 && v < D + (bc[2] || 0.86) - r && u > bc[0] + 0.12 + r && u < bc[1] - 0.12 - r)) return false; return !iwallHit(bi, fl, x, y, r); }
  if (b.round && roundWallHit(b, x, y, r, fl !== 0)) return false;
  const bl = floorBlocked(bi, fl);
  for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (bl.has(Math.round(y + oy) * MAP_W + Math.round(x + ox))) return false;
  if (hasIwalls(b) && iwallHit(bi, fl, x, y, r)) return false;
  return true;
}
// tile da escada (mundo) e chegada (na frente dela)
// escada entre o andar f e f+1 em coordenadas do mundo
function stairWorld(b, f) { const s = stairSpec(b, f), w = p => bLocal(b, p[0], p[1]); return { kind: s.kind, one: s.one, ext: s.ext, L: w(s.L), U: w(s.U), entry: w(s.entry), arrive: w(s.arrive), trig: w(s.trig) }; }
function stairTile(b, f) { return stairWorld(b, f).L; }
function stairArrive(b, f, up = true) { const s = stairWorld(b, f); return up ? s.arrive : s.entry; }
function canStand(x, y, z = 0, r = 0.28) {
  if (z === 0 && (wallHit(x, y, r) || roundHit(x, y, r))) return false;
  for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (solidTile(Math.round(x + ox), Math.round(y + oy), z)) return false;
  return true;
}
function zoneAt(x, y) { x = Math.round(x); y = Math.round(y); return inBounds(x, y) ? WORLD.zone[y * MAP_W + x] : Z.WILD; }
function inSafe(x, y) { return zoneAt(x, y) === Z.VILLAGE; }
function tileAt(x, y) { return Math.round(y) * MAP_W + Math.round(x); }
// telhado/andar acima? (para esconder o andar 1 quando o jogador está embaixo)
function covered(x, y) { const i = tileAt(x, y); return WORLD.fl1[i] > 0; }
function bldAt(x, y) { const tx = Math.round(x), ty = Math.round(y); if (!inBounds(tx, ty)) return -1; const bi = WORLD.bld[ty * MAP_W + tx]; if (bi < 0) return -1; const b = BUILDINGS[bi]; return x > b.x - 0.5 && x < b.x + b.w - 0.5 && y > b.y - 0.5 && y < b.y + b.h - 0.5 ? bi : -1; }

// tiles alcançáveis a partir do templo (monstros só nascem nesses)
const REACH = (() => {
  const sx0 = Math.round(TEMPLE_SPAWN.x), sy0 = Math.round(TEMPLE_SPAWN.y), r = new Uint8Array(MAP_W * MAP_H), q = [[sx0, sy0]];
  r[sy0 * MAP_W + sx0] = 1;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy;
      if (walkableTile(nx, ny) && !r[ny * MAP_W + nx]) { r[ny * MAP_W + nx] = 1; q.push([nx, ny]); }
    }
  }
  return r;
})();

// ---------- escadas fluidas (rampas) ----------
// altura (0..1 andar) numa rampa, conforme a posição; -1 se não for escada
function stairH(x, y) {
  const tx = Math.round(x), ty = Math.round(y);
  if (!inBounds(tx, ty)) return -1;
  const d = WORLD.stair[ty * MAP_W + tx];
  if (!d) return -1;
  const along = d === 1 ? x - tx : d === 2 ? tx - x : d === 3 ? y - ty : ty - y;
  return clamp((WORLD.stairK[ty * MAP_W + tx] + 0.5 + along) / STAIR_N, 0, 1);
}
// posição livre para quem está na altura z (contínua, 0..1)
function canStandZ(x, y, z, r = 0.24, fl = 0, fb = -1) {
  if (fl !== 0 && fb >= 0) return canStandFloor(x, y, fb, fl, r);
  const h0 = stairH(x, y);
  if (h0 >= 0) return Math.abs(h0 - z) <= 0.4; // em cima da rampa só importa a altura
  const L = z >= 0.5 ? 1 : 0;
  for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    const tx = Math.round(x + ox), ty = Math.round(y + oy);
    if (!inBounds(tx, ty)) return false;
    const i = ty * MAP_W + tx;
    if (WORLD.stair[i]) continue;
    if (solidTile(tx, ty, L)) return false;
  }
  if (L === 0 && (wallHit(x, y, r) || roundHit(x, y, r))) return false;
  if (L === 0) { const bi = WORLD.bld[Math.round(y) * MAP_W + Math.round(x)]; if (bi >= 0 && hasIwalls(BUILDINGS[bi]) && iwallHit(bi, 0, x, y, r)) return false; }
  if (L === 1 && roundHit(x, y, r, true)) return false;
  const h = stairH(x, y);
  if (h >= 0 && Math.abs(h - z) > 0.4) return false; // não entra na rampa pela lateral
  return true;
}
// altura resultante depois de andar até (x, y)
function heightAt(x, y, z) { const h = stairH(x, y); return h >= 0 ? h : (z >= 0.5 ? 1 : 0); }
// ---------- o lote do bairro nobre: guarda o casarão pronto e o terreno vazio (a obra troca um pelo outro durante o jogo) ----------
const LOT_STASH = {};
function lotKeys() { const N = MAP_W * MAP_H; return Object.keys(WORLD).filter(k => WORLD[k] && ArrayBuffer.isView(WORLD[k]) && WORLD[k].length === N); }
function lotSnap(S0) { const o = {}; for (const k of S0.keys) { const a = []; for (let y = S0.y0; y <= S0.y1; y++) for (let x = S0.x0; x <= S0.x1; x++) a.push(WORLD[k][y * MAP_W + x]); o[k] = a; } return o; }
function lotPut(S0, T) { for (const k of S0.keys) { let n = 0; for (let y = S0.y0; y <= S0.y1; y++) for (let x = S0.x0; x <= S0.x1; x++) WORLD[k][y * MAP_W + x] = T[k][n++]; } }
const LOT_LISTS = () => [['seats', WORLD.seats], ['BEDS', BEDS], ['KITCHENS', KITCHENS], ['DUMMIES', DUMMIES], ['CHESTS', CHESTS], ['APT_CHESTS', APT_CHESTS]];
function lotPrepare() { if (TEST3D) return; for (const bi of CITY_LOTS) { const b = BUILDINGS[bi]; if (!b || !b._lotPend) continue; delete b._lotPend;
  const S0 = { bi, x0: b.x - 1, y0: b.y - 1, x1: b.x + b.w, y1: b.y + b.h, keys: lotKeys(), def: { kind: b.kind, name: b.name, floors: b.floors, stairs: b.stairs } };
  S0.built = lotSnap(S0); S0.lists = {};
  for (const [nm, L] of LOT_LISTS()) { if (!L) continue; S0.lists[nm] = L.filter(e => e && e.bi === bi); for (let i = L.length - 1; i >= 0; i--) if (L[i] && L[i].bi === bi) L.splice(i, 1); }
  S0.props = PROPS.filter(P => P.bi === bi); for (const P of S0.props) { PROPS.splice(PROPS.indexOf(P), 1); delete PROPS_BY[P.id]; }
  Object.assign(b, { kind: 'lot', name: 'Lote do bairro nobre', lot: 1, floors: 1 }); delete b.stairs; const [dx, dy] = doorTile(b);
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const i = y * MAP_W + x, edge = x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1;
    for (const k of S0.keys) if (k !== 'ground' && k !== 'obj' && k !== 'zone' && k !== 'height' && k !== 'river' && k !== 'flow') WORLD[k][i] = k === 'bld' ? -1 : 0;
    WORLD.ground[i] = (x * 7 + y * 3) % 5 ? T.DIRT : T.GRASS; WORLD.obj[i] = edge && !(Math.abs(x - dx) + Math.abs(y - dy) <= 1 && (x === dx || y === dy)) ? O.LOWWALL : O.NONE; }
  S0.lotT = lotSnap(S0); LOT_STASH[bi] = S0; } }
/* volta ao casarão pronto (fim da obra): tiles, móveis das listas, imóvel */
function lotBuild(bi, style, name) { const S0 = LOT_STASH[bi], b = BUILDINGS[bi]; if (!S0 || !b || !b.lot) return false; lotPut(S0, S0.built);
  Object.assign(b, S0.def, { lot: 0, mstyle: style || 'pedra', name: name || S0.def.name }); if (!S0.def.stairs) delete b.stairs;
  for (const [nm, L] of LOT_LISTS()) if (L && S0.lists[nm]) for (const e of S0.lists[nm]) if (!L.includes(e)) L.push(e);
  for (const P of S0.props) { P.name = b.name; if (!PROPS_BY[P.id]) { PROPS.push(P); PROPS_BY[P.id] = P; } } return true; }
/* terreno durante a obra: cerca, chão batido e o canteiro (material, andaimes) conforme o estágio */
function lotSite(bi, stage) { const S0 = LOT_STASH[bi], b = BUILDINGS[bi]; if (!S0 || !b || !b.lot) return; lotPut(S0, S0.lotT); if (stage == null) return;
  const put = (u, v, o) => { const x = b.x + u, y = b.y + v; if (x > b.x && y > b.y && x < b.x + b.w - 1 && y < b.y + b.h - 1) WORLD.obj[y * MAP_W + x] = o; };
  for (let y = b.y + 1; y < b.y + b.h - 1; y++) for (let x = b.x + 1; x < b.x + b.w - 1; x++) WORLD.ground[y * MAP_W + x] = stage >= 1 ? T.FLOORSTONE : T.DIRT;
  put(1, 1, O.LOG); put(2, 1, O.LOG); put(b.w - 2, b.h - 2, O.CRATE); put(b.w - 3, b.h - 2, O.ROCK);
  if (stage >= 1) { put(1, b.h - 2, O.SCAFFOLD); put(b.w - 2, 1, O.SCAFFOLD); put(3, 1, O.BARREL); }
  if (stage >= 2) { put(1, 3, O.SCAFFOLD); put(b.w - 2, 3, O.SCAFFOLD); put(3, b.h - 2, O.CRATE); } }
lotPrepare();
