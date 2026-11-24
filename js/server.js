// ============================================================
//  SERVIDOR — roda só no navegador do anfitrião.
//  Decide dano, vida, monstros, ouro, xp e missões.
//  Otimização: cada jogador só recebe o que está perto dele
//  (VIEW_RADIUS), em pacotes compactos 10x por segundo.
// ============================================================
const S = { players: {}, monsters: {}, nextMid: 1, nextSpawn: 0, lastRegen: 0, filled: false, lastTick: 0 };
// ambiente do servidor: tudo o que ele usa de fora passa por aqui (permite rodar num Web Worker ou num servidor dedicado)
const HOSTSTORE = { mem: {}, onSet: null, pre: '',   /* pre: prefixo do mundo aberto (cada mundo guardado tem o seu) */
  get(k) { k = this.pre + k; try { if (typeof localStorage !== 'undefined') return localStorage.getItem(k); } catch (e) { } return this.mem[k] ?? null; },
  set(k, v) { k = this.pre + k; try { if (typeof localStorage !== 'undefined') { localStorage.setItem(k, v); this.fail = 0; return; } } catch (e) { this.fail = Date.now(); } this.mem[k] = v; if (this.onSet) this.onSet(k, v); } };
const hsGet = k => { try { return JSON.parse(HOSTSTORE.get(k) || 'null'); } catch (e) { return null; } }, hsSet = (k, o) => HOSTSTORE.set(k, JSON.stringify(o));
function weatherS() {   /* chuva igual à que os jogadores veem (mesma fórmula), com o ajuste do Tecelão */
  const ov = (typeof WTs === 'function' ? WTs().rain : null); if (ov != null) return { rain: ov };
  const t = Date.now() / 1000; return { rain: Math.max(0, Math.min(1, (Math.sin(t / 260) + Math.sin(t / 97) * 0.4 - 0.75) * 2.2)) };
}
const MAX_MON = typeof TEST3D !== 'undefined' && TEST3D ? 10 : 320;

const RUMORS = [
  'Os lenhadores evitam o Bosque Sombrio depois do pôr do sol. Os lobos de lá caçam em bando.',
  'Dizem que algo grande vive na montanha da cachoeira. As pegadas na lama têm o tamanho de um escudo.',
  'O pântano a leste engoliu duas carroças este mês. Os sapos de lá não têm medo de ninguém.',
  'Ao sul ficam as Colinas de Ossos. Os mortos que não foram enterrados direito não descansam.',
  'Os orcs a oeste estão se organizando. Alguém está pagando os goblins para saquear as estradas.',
  'Um Cavaleiro na frente, um Atirador atrás e um Mago curando. É assim que se volta vivo.',
  'Se um companheiro cair, não o abandone. Levante-o, ou carregue-o até a capela.',
  'A cidadela foi reconstruída pedra por pedra depois da última guerra. Ainda há quem jure ouvir os mortos nas muralhas.',
];

const now_ = () => Date.now();
function buffOn(p, b) { return (p.buffs[b] || 0) > now_(); }
function pinfo(p) { return { id: p.id, name: p.name, color: p.color, cls: p.cls, skin: p.skin, lvl: p.lvl }; }
// sorteia a madeira, o núcleo e o tamanho de uma varinha
function wandRoll(k) { const W = WAND_WOODS[Math.floor(Math.random() * WAND_WOODS.length)], C = WAND_CORES[Math.floor(Math.random() * WAND_CORES.length)], len = 20 + Math.floor(Math.random() * 16);
  return { k, w: W[0], c: C[0], len, feel: WAND_FEEL[Math.floor(Math.random() * WAND_FEEL.length)], dmg: Math.round((W[1] + C[1] + (len - 27) * 0.002) * 1000) / 1000, mp: W[2] + C[2] }; }
const wandTxt = I => I.w + ', ' + I.c + ', ' + I.len + ' cm, ' + I.feel + ' (dano ' + (I.dmg >= 0 ? '+' : '') + Math.round(I.dmg * 100) + '%, mana ' + (I.mp >= 0 ? '+' : '') + I.mp + ')';
function fullStat(p) {
  const now = now_();
  if (wandOf(p) && !wandBonus(p)) p.wandInfo = wandRoll(wandOf(p));   // varinha nova na mão (achada, entalhada ou de save antigo): ela escolhe a madeira e o núcleo
  if (p.cloak && !(CLOAKS[p.cloak] && p.inv[CLOAKS[p.cloak].k] > 0)) p.cloak = 0;   // vendeu ou perdeu a capa: tira
  return {
    t: 'pstat', id: p.id, wi: p.wandInfo || null, ck: p.cloak || 0, hroom: typeof hotelRoomOf === 'function' && S.estate ? hotelRoomOf(p) : -1, shp: Math.round(p.shieldHp ?? 100), shea: p.sheathed ? 1 : 0, freeLimb: p.freeLimb ? 1 : 0, rep: repOf(p), feats: p.feats || {}, wpn: p.wpn || 'sword', prof: p.prof || {}, job: p.job ? jobView(p) : null, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, lvl: p.lvl, xp: p.xp, gold: p.gold,
    pots: { hp: p.pots.hp, mp: p.pots.mp, band: p.pots.band || 0 }, body: p.body, bleed: p.bleed, food: Math.round(p.food ?? 100), water: Math.round(p.water ?? 100), cold: Math.round(p.cold || 0), infect: p.infect || 0, sick: Math.max(0, (p.sickUntil || 0) - now), hasSkin: !!p.hasSkin, lost: p.lost || 0, pro: p.pro || 0, knock: Math.max(0, (p.knockUntil || 0) - now), inv: { ...p.inv }, quests: { ...p.quests }, qdone: { ...p.qdone },
    buffs: Object.entries(p.buffs).filter(([, u]) => u > now).map(([k, u]) => [k, u - now]),
    cds: [0, 1, 2, 3, 4].map(i => Math.max(0, (p.cds[i] || 0) - now)),
    combat: now - p.lastCombat < OUT_OF_COMBAT_MS, cst: Math.round(p.cst ?? CST_MAX), cstMax: cstMaxOf(p), bnd: p.bound ? p.bound.kind : '', bndE: p.bound ? Math.round(p.bound.esc || 0) : 0, chk: p.choking ? +(p.chokeT || 0).toFixed(2) : 0, jl: p.jailUntil > now ? p.jailUntil - now : 0, cell: p.cell ?? -1, esc: (p.gripBy || p.tied) ? Math.round(p.esc || 0) : 0, arw: (p.arrows || []).map(a => a.part), tree: p.tree || {}, use: p.use || {}, stun: Math.max(0, (p.stunUntil || 0) - now), rip: Math.max(0, (p.ripUntil || 0) - now), slow: Math.max(0, (p.slowUntil || 0) - now), downed: p.downed ? p.downed.until - now : 0,
  };
}
function sendStat(p) { if (p.cls === 'mage' && p.lvl) { const mm = maxMpOf(p); if (mm !== p.maxMp) { p.maxMp = mm; p.mp = Math.min(p.mp, mm); } } Net.toOne(p.id, fullStat(p)); }
// envia um evento só para quem está perto de (x, y)
function near(x, y, msg, r = VIEW_RADIUS + 4) {
  for (const id in S.players) { const q = S.players[id]; if (dist(q.x, q.y, x, y) <= r) Net.toOne(id, msg); }
}
function sfx(x, y, text, color, d = 0, big = false) { near(x, y, { t: 'fx', x, y, text: String(text), color, d, big }); }
function sys(text) { if (typeof S !== 'undefined') { (S.events = S.events || []).push([Date.now(), text]); if (S.events.length > 80) S.events.shift(); } Net.toAll({ t: 'chat', name: '', text }); }
function tell(p, text) { Net.toOne(p.id, { t: 'err', text }); }
function info(p, text) { Net.toOne(p.id, { t: 'info', text }); }   // aviso rápido + fica no chat
function anim(w, e, a, tx, ty, extra) { near(e.x, e.y, { t: 'anim', w, id: e.id, a, tx, ty, ...extra }); }
function aoe(a, x, y, extra) { near(x, y, { t: 'aoe', a, x, y, ...extra }); }

function townSpot() {
  for (let i = 0; i < 100; i++) {
    const x = TEMPLE_SPAWN.x + (Math.random() - 0.5) * 3, y = TEMPLE_SPAWN.y + (Math.random() - 0.5) * 2;
    if (canStand(x, y, 0)) return { x, y };
  }
  return { x: TEMPLE_SPAWN.x, y: TEMPLE_SPAWN.y };
}

function monsterAtPos(x, y, self, r = 0.62) {
  const Gd = S.mgrid; if (Gd && now_() - S.mgridAt < 250) {   // grade espacial (células de 2 tiles): só olha as vizinhas
    const r2 = r * r; for (let cx = Math.floor((x - r) / 2); cx <= Math.floor((x + r) / 2); cx++) for (let cy = Math.floor((y - r) / 2); cy <= Math.floor((y + r) / 2); cy++) { const L = Gd.get(cx * 4096 + cy); if (L) for (const m of L) if (m !== self && (m.x - x) * (m.x - x) + (m.y - y) * (m.y - y) < r2) return true; }
    return false;
  }
  for (const id in S.monsters) { const m = S.monsters[id]; if (m !== self && dist(m.x, m.y, x, y) < r) return true; }
  return false;
}
function monGridBuild(now) { const Gd = new Map(); for (const id in S.monsters) { const m = S.monsters[id], k = Math.floor(m.x / 2) * 4096 + Math.floor(m.y / 2); let L = Gd.get(k); if (!L) Gd.set(k, L = []); L.push(m); } S.mgrid = Gd; S.mgridAt = now; }
function monStand(x, y, m) {
  if (m && m.z) { if (!canStandZ(x, y, 1, 0.3) || stairH(x, y) >= 0) return false; }
  else if (!canStand(x, y, 0, 0.3) || (inSafe(x, y) && !(m && m.aggro))) return false;   // perseguindo, entra na cidade
  if (monsterAtPos(x, y, m)) return false;
  for (const id in S.players) { const p = S.players[id]; if (p.z < 0.5 && !p.downed && dist(p.x, p.y, x, y) < 0.55) return false; }
  return true;
}

function spawnAt(type, x, y, extra) {
  const id = S.nextMid++;
  S.monsters[id] = { id, type, zone: zoneAt(x, y), x, y, homeX: x, homeY: y, hp: MON[type].hp, nextAtk: 0, stunUntil: 0, slowUntil: 0, taunt: null, aggro: null, returning: false, face: 1, path: null, pathT: 0, wander: null, waitUntil: 0, ...extra };
  return id;
}
// ---------------- bastiões: vagas fixas de monstros, patrulhas, chefe e baú ----------------
function initBastions() {
  S.bslots = []; S.chests = S.chests || {};
  for (const B of BASTIONS) {
    if (B.kind === 'dragon') { const a = Math.atan2(CENTER - B.y, CENTER - B.x); S.bslots.push({ b: B, type: B.boss, pos: [B.x + Math.cos(a) * 0.8, B.y + Math.sin(a) * 0.8], boss: true, z: 1 }); continue; }
    const spots = [];
    for (let k = 0; k < 800 && spots.length < 40; k++) { const a = Math.random() * 6.28, r = 1 + Math.random() * (B.r - 1.5), x = B.x + Math.cos(a) * r, y = B.y + Math.sin(a) * r; if (monStand(x, y, null) && REACH[Math.round(y) * MAP_W + Math.round(x)]) spots.push([x, y]); }
    if (!spots.length) continue;
    let si = 0; const take = () => spots[(si++) % spots.length];
    for (const [type, n] of Object.entries(B.mons)) for (let i = 0; i < n; i++) S.bslots.push({ b: B, type, pos: take() });
    if (B.boss) S.bslots.push({ b: B, type: B.boss, pos: take(), boss: true });
    if (B.night) for (const [type, n] of Object.entries(B.night)) for (let i = 0; i < n; i++) S.bslots.push({ b: B, type, pos: take(), night: true });
    if (B.patrol) {
      const pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, x = B.x + Math.cos(a) * (B.r + 5), y = B.y + Math.sin(a) * (B.r + 5); if (monStand(x, y, null) && REACH[Math.round(y) * MAP_W + Math.round(x)]) pts.push([x, y]); }
      if (pts.length >= 3) B.patrol.forEach((type, i) => S.bslots.push({ b: B, type, pos: pts[0], patrol: pts, off: i }));
    }
  }
}
function tickBastions(now) {
  const night = dayInfoS().night;
  for (const s of S.bslots) {
    const m = s.mid != null ? S.monsters[s.mid] : null;
    if (m) { if (s.night && !night) { delete S.monsters[s.mid]; near(m.x, m.y, { t: 'mdie', id: m.id, d: 0 }); s.mid = null; } continue; }
    if (s.mid != null) { s.mid = null; s.deadAt = now; }          // morreu
    if (s.night && !night) continue;
    if (s.deadAt && now - s.deadAt < (s.b.fast && !s.boss ? s.b.fast : s.b.respawn && s.boss ? s.b.respawn / 2 : s.boss ? BOSS_RESPAWN : BASTION_RESPAWN)) continue;
    const [x, y] = s.pos;
    if (s.deadAt && !s.b.fast) { let busy = false; for (const id in S.players) if (dist(S.players[id].x, S.players[id].y, x, y) < 12) busy = true; if (busy) continue; }
    const ox = s.patrol ? (s.off - 1) * 0.7 : 0;
    if (MON[s.type].dragon && s.deadAt) { sys('Um rugido ecoa das Terras Selvagens... o dragão voltou ao covil.'); Net.toAll({ t: 'shake', s: 3 }); }
    s.mid = spawnAt(s.type, x + ox, y, { bs: s.b.id, patrol: s.patrol ? { pts: s.patrol, i: 0 } : null, z: s.z || 0, sleep: !!MON[s.type].dragon, ang: Math.PI * 0.75 }); s.deadAt = 0;
  }
  for (const id in S.chests) if (now > S.chests[id].until) delete S.chests[id];
  for (const id in S.corpses || {}) if (now > S.corpses[id].until) delete S.corpses[id];
  // objetos quebrados voltam ao lugar depois de 3 min (se ninguém estiver em cima)
  if (S.objBack && S.objBack.length) S.objBack = S.objBack.filter(q => { if (now < q.at) return true; const x = q.i % MAP_W, y = Math.floor(q.i / MAP_W); for (const id in S.players) if (dist(S.players[id].x, S.players[id].y, x, y) < 0.9) return true; for (const id in S.monsters) if (dist(S.monsters[id].x, S.monsters[id].y, x, y) < 0.9) return true; setObj(q.i, q.o); return false; });
}
// objetos do cenário que mudaram (levantados/quebrados) — todos os clientes recebem
function bodyBits(p) {
  const extra = (p.parry ? 32 : 0) | (now_() < (p.stunUntil || 0) ? 64 : 0) | (p.duel ? 128 : 0);
  if (!p.body) return extra; const leg = Math.max(PART_STATE(p.body.legL), PART_STATE(p.body.legR));
  let bl = 0; for (const k of BODY_PARTS) bl += p.bleed[k] || 0;
  return extra | leg | (PART_STATE(p.body.armA) >= 2 ? 4 : 0) | (PART_STATE(p.body.head) >= 2 ? 8 : 0) | (bl > 0 ? 16 : 0);
}
function setObj(i, o) { WORLD.obj[i] = o; (S.objMods = S.objMods || {})[i] = o; Net.toAll({ t: 'obj', i, o }); }
function spawnChest(m) {
  const id = S.nextChest = (S.nextChest || 0) + 1, who = new Set();
  for (const pid in S.players) if (dist(S.players[pid].x, S.players[pid].y, m.x, m.y) <= 14) who.add(pid);
  S.chests[id] = { id, x: m.x, y: m.y, until: now_() + CHEST_MS, who, opened: new Set(), boss: m.type };
  sys('Um baú surgiu onde ' + MON[m.type].name + ' caiu.');
}
function wildCount() { let n = 0; for (const id in S.monsters) if (!S.monsters[id].bs) n++; return n; }
function spawnMonster() {
  const x = rint(2, MAP_W - 3), y = rint(2, MAP_H - 3), z = zoneAt(x, y);
  if (!ZONES[z].mons.length || !REACH[y * MAP_W + x] || !monStand(x, y, null)) return false;
  for (const id in S.players) if (dist(x, y, S.players[id].x, S.players[id].y) < 11) return false;
  const type = pick(ZONES[z].mons), id = S.nextMid++;
  S.monsters[id] = { id, type, zone: z, x, y, homeX: x, homeY: y, hp: MON[type].hp, nextAtk: 0, stunUntil: 0, slowUntil: 0, taunt: null, aggro: null, returning: false, face: 1, path: null, pathT: 0, wander: null, waitUntil: 0 };
  return true;
}

// ---------------- mensagens dos jogadores ----------------
function hostOnClient(from, m) {
  const p = S.players[from];
  if (m.t === 'hello') {
    if (p) return;
    if (m.ver && m.ver !== VERSION && from !== Net.myId) { Net.toOne(from, { t: 'denied', why: 'ver', ver: VERSION });
      if (typeof verNum === 'function' && verNum(m.ver) > verNum(VERSION) && Date.now() - (S.verWarnT || 0) > 60000 && typeof showToast === 'function') { S.verWarnT = Date.now(); showToast((m.name ? String(m.name).slice(0, 20) : 'Alguém') + ' não conseguiu entrar: já existe a versão ' + m.ver + ' do jogo. Quando puder, saia e reabra o reino para todos entrarem.'); }   /* o anfitrião não é mais recarregado sozinho no meio da partida */
      return; }
    if (S.roomPw && from !== Net.myId && String(m.pw || '').trim().toUpperCase() !== S.roomPw) { Net.toOne(from, { t: 'denied', why: m.pw ? 'pwbad' : 'pw' }); return; }
    if (WTs().ph != null || WTs().rain != null) setTimeout(() => Net.toOne(from, { t: 'wt', ph: WTs().ph, rain: WTs().rain }), 1500);
    const cls = CLASSES[m.cls] ? m.cls : 'knight';
    const lvl = clamp(m.lvl | 0 || 1, 1, 300);
    const SPk = skinParts(m.skin), sk0 = SPk.base, si = SKINS[cls].findIndex(s => s.id === sk0), skin = skinJoin(si >= 0 && lvl >= SKIN_LVL[si] ? sk0 : SKINS[cls][0].id, SPk.fem, SPk.tats);   /* ~f = corpo feminino, ~t = tatuagens */
    let s = townSpot(), sz = 0, sfl = 0, sfb = -1;   /* reconexão: volta para onde estava (não para o Templo) */
    const ghost = /^[a-z0-9]{4,12}$/.test(m.uid || '') ? Object.values(S.players).find(q => q.uid === m.uid && q.id !== from && q.id !== Net.myId) : null;
    if (ghost && !ghost.downed && !ghost.jailUntil) { m.px = ghost.x; m.py = ghost.y; m.pz = ghost.z || 0; m.pfl = ghost.fl || 0; m.pfb = ghost.fb ?? -1; }
    if (ghost) { m._recon = (ghost.recon || 0) + 1; hostOnLeave(ghost.id, true); try { if (Net.rel[ghost.id]) Net.rel[ghost.id].close(); } catch (e) { } delete Net.rel[ghost.id]; delete Net.fast[ghost.id]; }
    if (isFinite(m.px) && isFinite(m.py) && !(+m.jailLeft > 0)) { const z0 = isFinite(m.pz) ? +m.pz : 0, f0 = m.pfl | 0, b0 = isFinite(m.pfb) ? m.pfb | 0 : -1; try { if (canStandZ(+m.px, +m.py, z0, 0.18, f0, b0)) { s = { x: +m.px, y: +m.py }; sz = z0; sfl = f0; sfb = b0; } } catch (e) { } }
    const np = {
      wandInfo: m.wandInfo && typeof m.wandInfo === 'object' && WANDS[m.wandInfo.k] ? { k: m.wandInfo.k, w: String(m.wandInfo.w || '').slice(0, 20), c: String(m.wandInfo.c || '').slice(0, 30), len: clamp(m.wandInfo.len | 0, 15, 40), feel: String(m.wandInfo.feel || '').slice(0, 24), dmg: clamp(+m.wandInfo.dmg || 0, -0.05, 0.08), mp: clamp(m.wandInfo.mp | 0, -5, 12) } : null,
      cloak: CLOAKS[m.cloak | 0] ? m.cloak | 0 : 0,
      id: from, name: String(m.name || 'Aventureiro').slice(0, 16), cls, skin, uid: /^[a-z0-9]{4,12}$/.test(m.uid || '') ? m.uid : '',
      color: /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : '#8b2e2e',
      x: s.x, y: s.y, z: sz, fl: sfl, fb: sfb, lvl, xp: clamp(m.xp | 0, 0, need(lvl) - 1), gold: clamp(m.gold | 0, 0, 1e7),
      pots: { hp: clamp((m.pots && m.pots.hp) | 0, 0, 999), mp: clamp((m.pots && m.pots.mp) | 0, 0, 999), band: clamp((m.pots && m.pots.band) | 0, 0, 999) },
      food: clamp(isFinite(m.food) ? +m.food : 100, 0, 100), water: clamp(isFinite(m.water) ? +m.water : 100, 0, 100), infect: clamp(m.infect | 0, 0, 2), cold: 0, hasSkin: !!m.hasSkin,
      lost: (m.lost | 0) & 30, pro: (m.pro | 0) & 30, cst: CST_MAX, body: Object.fromEntries(BODY_PARTS.map(k => [k, clamp(m.body && isFinite(m.body[k]) ? +m.body[k] : 100, 0, 100)])),
      bleed: Object.fromEntries(BODY_PARTS.map(k => [k, clamp(m.bleed && isFinite(m.bleed[k]) ? +m.bleed[k] : 0, 0, 2)])), aim: 'torso',
      maxHp: maxHpFor(cls, lvl), maxMp: maxMpFor(cls, lvl), hp: 0, mp: 0,
      target: null, nextAtk: 0, cds: {}, buffs: {}, casting: null, lastCombat: 0, potCd: 0, lastMv: now_(),
      downed: null, carriedBy: null, carrying: null, revive: null, quests: {}, qdone: {}, inv: {},
    };
    if (m.inv) for (const k in LOOT) if (m.inv[k] > 0) np.inv[k] = clamp(m.inv[k] | 0, 0, 999);
    if (+m.jailLeft > 0) setTimeout(() => { if (S.players[np.id]) jailPlayer(np, Math.min(900000, +m.jailLeft)); }, 1500);
    np.sheathed = true;   // nasce com a arma guardada (sentinelas não implicam)
    np.freeLimb = !!m.freeLimb; np.shieldHp = isFinite(m.shieldHp) ? clamp(+m.shieldHp, 0, 100) : 100;
    np.feats = {}; if (m.feats && typeof m.feats === 'object' && m.feats.mv && typeof m.feats.mv === 'object') { np.feats.mv = {}; for (const k in SENSEI_MOVES) if (m.feats.mv[k]) np.feats.mv[k] = 1; } if (m.feats && typeof m.feats === 'object') { for (const k of ['thief', 'jobs', 'shifts', 'rent']) if (isFinite(m.feats[k])) np.feats[k] = clamp(+m.feats[k], 0, 1e5); if (m.feats.rg && typeof m.feats.rg === 'object') { np.feats.rg = {}; for (const g in REP_G) if (isFinite(m.feats.rg[g])) np.feats.rg[g] = clamp(+m.feats.rg[g], -100, 100); } }
    np.prof = {}; if (m.prof && typeof m.prof === 'object') for (const k in PROFS) if (isFinite(m.prof[k])) np.prof[k] = clamp(+m.prof[k], 0, 1e6);
    np.tree = cleanTree(cls, lvl, m.tree); if (cls === 'mage' && m.tree && typeof m.tree === 'object' && Object.keys(m.tree).some(k => m.tree[k] && !String(k).startsWith('w_'))) setTimeout(() => { if (S.players[np.id]) info(np, 'O mago mudou: agora você estuda o Pentagrama dos cinco elementos (Fogo, Ar, Terra, Luz e Água), com uma magia de cada nas teclas 1 a 5. Seus pontos de talento voltaram: abra o Grimório (K) para gastar de novo.'); }, 5000); np.use = {}; if (m.use && typeof m.use === 'object') for (const k in USE) if (isFinite(m.use[k])) np.use[k] = clamp(+m.use[k], 0, 1e6);
    np.maxHp = maxHpOf(np); np.maxMp = maxMpOf(np);
    if (m.quests) for (const q of QUESTS) if (m.quests[q.id] != null) np.quests[q.id] = clamp(m.quests[q.id] | 0, 0, q.count);
    if (m.qdone) for (const q of QUESTS) if (m.qdone[q.id]) np.qdone[q.id] = m.qdone[q.id] | 0;
    np.hp = np.maxHp; np.mp = np.maxMp;
    if (!m.lvl) { np.gold = 30; np.pots.hp = 3; np.pots.mp = 2; np.pots.band = 3; } // kit inicial
    np.joinT = Date.now(); np.recon = m._recon || 0; S.players[from] = np; if (S.blooms && S.blooms.length) setTimeout(() => { if (S.players[from]) bloomsSend(false, from); }, 3000); setTimeout(() => { if (S.players[from] && S.estate && (S.estate.saps || []).length) sapsSend(from); if (S.players[from] && typeof entsSend === 'function' && S.estate && S.estate.ents) entsSend(from); }, 3200);
    estateJoin(np);
    if (m.dev && typeof crypto !== 'undefined' && crypto.subtle) crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(m.dev).trim().toUpperCase())).then(buf => {
      const h = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      if (h !== DEV_HASH || !S.players[from]) { Net.toOne(from, { t: 'dev', ok: 0 }); return; }
      if (m.devMode === 'normal') { np.devPowers = true; Net.toOne(from, { t: 'dev', ok: 1, mode: 'normal' }); return; }   // criador com a vocação normal (toma dano, monstros atacam), mas com o painel
      np.dev = true; np.skin = 'weaver'; np.devHidden = false; Net.toOne(from, { t: 'dev', ok: 1 }); Net.toAll({ t: 'pinfo', p: pinfo(np) });
    });
    Net.toOne(from, { t: 'clk', g: gameNow(), rate: SIMCLK.rate, paused: SIMCLK.paused });
    Net.toOne(from, { t: 'welcome', you: from, x: np.x, y: np.y, z: np.z || 0, fl: np.fl || 0, fb: np.fb ?? -1, players: Object.values(S.players).map(pinfo), objs: S.objMods || {} });
    tubSendAll(from); if (typeof empWelcome === 'function') empWelcome(from);
    Net.toOthers({ t: 'pinfo', p: pinfo(np) }, from);
    setTimeout(() => { if (S.players[from] && S.npcs) Net.toOne(from, { t: 'vlist', list: Object.values(S.npcs).filter(n => n.transient).map(visPublic) }); if (S.players[from] && S.estate && typeof tatNpcAll === 'function') Net.toOne(from, tatNpcAll()); if (S.players[from] && S.seatL) Net.toOne(from, { t: 'seatL', L: S.seatL }); if (S.npSent) delete S.npSent[from];   /* agora que ele conhece todos os NPCs, as linhas vão todas de novo */ }, 600);
    sendStat(np);
    sys(`${np.name}, ${CLASSES[cls].name}, chegou à Cidadela de Nae.`);
    if (S.coins && Object.keys(S.coins).length) setTimeout(() => Net.toOne(from, { t: 'coins', add: Object.values(S.coins).map(c => ({ ...c, d: 0 })) }), 1200);
    return;
  }
  if (!p) return;
  if (p.bound && BOUND_BLOCK.has(m.t)) return;   // amarrado: não luta, não pega nada
  switch (m.t) {
    case 'mv': handleMove(p, m); break;
    case 'target': p.target = m.id && S.monsters[m.id] ? m.id : null; break;
    case 'tlearn': {
      const T = TREE[p.cls]; if (!T) break; let ok = false; p.tree = p.tree || {};
      T.forEach(b => b.nodes.forEach((nd, i) => { if (nd.id !== m.id || nd.soon) return; const r = p.tree[nd.id] | 0; if (r >= nd.max || treePts(p) >= p.lvl - 1 || branchPts(p, b) < TREE_REQ[i]) return; p.tree[nd.id] = r + 1; ok = true; }));
      if (!ok) { tell(p, 'Não dá para aprender isso agora.'); break; }
      { const rh = p.hp / Math.max(1, p.maxHp), rm = p.mp / Math.max(1, p.maxMp); p.maxHp = maxHpOf(p); p.maxMp = maxMpOf(p); if (!p.downed) { p.hp = Math.max(1, Math.round(p.maxHp * rh)); p.mp = Math.round(p.maxMp * rm); } }
      sendStat(p); break;
    }
    case 'tskill': if (!p.duel) { if (m.c != null) comboSkill(p, m); else treeSkill(p, m.b | 0, m); } break;
    case 'clearn': {   /* aprender uma combinada: força nos dois elementos + 1 ponto livre */
      const C = MAGE_COMBOS[m.i | 0]; if (!C || p.cls !== 'mage') break; p.tree = p.tree || {}; if (p.tree[C.id]) break;
      if (elemStrength(p, C.a) < COMBO_NEED || elemStrength(p, C.b) < COMBO_NEED) { tell(p, C.n + ': precisa de força ' + COMBO_NEED + ' nos dois elementos.'); break; }
      if (treePts(p) >= p.lvl - 1) { tell(p, 'Sem pontos livres: suba de nível.'); break; }
      p.tree[C.id] = 1; tell(p, 'Você aprendeu ' + C.n + '. Escolha a tecla no grimório.'); sendStat(p); break; }
    case 'flame': flameMsg(p, m); break;
    case 'draw': if (p.sheathed) { if (m.on) tell(p, 'Saque o arco primeiro (G).'); break; } bowDraw(p, !!m.on); break;
    case 'loose': if (p.sheathed) break; bowLoose(p, m); break;
    case 'pullarrow': pullArrow(p); break;
    case 'grab': startGrab(p, m); break;
    case 'estate': estateMsg(p, m); break;
    case 'biz': bizMsg(p, m); break;
    case 'appleoffer': { const n = S.npcs && S.npcs.fruit, now = now_(); if (!n || n.dead || n.downed || dist(p.x, p.y, n.x, n.y) > 5 || (p.food ?? 100) >= 45 || now < (p.appleT || 0)) break; if (!p.inv.apple && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); break; } p.appleT = now + 600000; p.inv.apple = (p.inv.apple || 0) + 1; Net.toOne(p.id, { t: 'loot', k: 'apple' }); tell(p, 'Marta te dá uma maçã vermelhinha.'); sendStat(p); break; }
    case 'pickstart': case 'pick': case 'opencell': case 'give': jailMsg(p, m); break;
    case 'surrender': if (now_() < (p.wanted || 0) && !p.downed && !p.escortBy && !(p.jailUntil > now_())) { p.surrendered = true; p.atk = null; tell(p, 'Você se rendeu. Fique parado: uma sentinela vem te buscar.'); sys(p.name + ' se rendeu às sentinelas.'); } break;
    case 'choke': p.choking = !!m.on && !!(p.drag && p.drag.mode === 'grip'); break;
    case 'cookat': cookAt(p, String(m.r)); break;
    case 'release': stopDrag(p); break;
    case 'struggle': if (p.bound) { boundStruggle(p); break; } if (!tiedStruggle(p)) struggle(p); break;
    case 'lastwords': case 'execbail': lawMsg(p, m); break;
    case 'untie': untie(p, m); break;
    case 'shoot': { if (p.duel || (p.sheathed && p.cls === 'archer')) break;
      const now = now_(); if (p.cls === 'knight' || p.cls === 'mage' || p.downed || p.carrying || p.lifted || p.atk || p.casting || p.grabbed || now < p.nextAtk) break;
      const rng = CLASSES[p.cls].range + treeEff(p, 'range'), a = +m.a || 0, ok = q => q && Math.abs((q.z || 0) - (p.z || 0)) < 0.5 && (q.alt || 0) < 1.2 && dist(p.x, p.y, q.x, q.y) <= rng + (MON[q.type].rad || 0);
      let q = S.monsters[m.id]; if (!ok(q)) q = null;
      if (!q) { let best = 1e9; for (const o of Object.values(S.monsters)) { if (!ok(o)) continue; const da = Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), a)); if (da > 0.5) continue; const sc = da * 4 + dist(p.x, p.y, o.x, o.y); if (sc < best) { best = sc; q = o; } } }
      if (!q) break;
      p.target = q.id; basicAttack(p, q, now); break;
    }
    case 'ping': Net.toOne(p.id, { t: 'pong' }); break;   /* o cliente quer saber se o anfitrião está vivo */
    case 'pcs': p.hs = Math.max(0, Math.min(500, +m.s || 0)); break;   // nota do computador (para escolher o próximo anfitrião)
    case 'chat': { const text = String(m.text || '').slice(0, 140).trim();
      if (text.toLowerCase() === '/resetmundo' && (p.dev || p.devPowers)) { worldReset(p); break; }
      { const mb = text.match(/^\/banco\s+(\d{1,9})\s+(\S+)$/i); if (mb) { let h = 2166136261; for (const ch of mb[2].toUpperCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } if (h === BANK_CHEAT_H) { const A = bankAcc(p); A.g = +mb[1]; bankSave(); tell(p, 'Conta no banco ajustada para ' + A.g + ' de ouro.'); sendStat(p); } else tell(p, 'Comando desconhecido.'); break; } }   /* comando de teste: /banco <valor> <código> (não aparece no chat) */
      if (text.toUpperCase() === '1515NAE') {   // palavra secreta: vira e desvira o Tecelão (não aparece no chat)
        if (!p.dev) { p._skin0 = p.skin; p.dev = true; p.skin = 'weaver'; p.devHidden = false; Net.toOne(from, { t: 'dev', ok: 1 }); }
        else { p.dev = false; p.devHidden = false; p.skin = p._skin0 && p._skin0 !== 'weaver' ? p._skin0 : SKINS[p.cls][0].id; Net.toOne(from, { t: 'dev', off: 1, skin: p.skin }); }
        Net.toAll({ t: 'pinfo', p: pinfo(p) }); sendStat(p); break; }
      if (text) Net.toAll({ t: 'chat', id: from, name: p.name, text }); break; }
    case 'skill': if (p.duel) break; if (p.sheathed && p.cls !== 'mage') { tell(p, 'Saque a arma (G) para usar habilidades.'); break; } if (!p.downed) useSkill(p, m.i | 0, m); break;
    case 'pot': if (!p.downed) usePot(p, m.k); break;
    case 'npc': npcAction(p, m); break;
    case 'gather': sheatheToggle(p, true, true); gather(p, m); break;
    case 'gathering': { const tool = ['axe', 'pickaxe', 'sickle'].includes(m.tool) ? m.tool : 'axe'; p.taskT = now_(); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: tool === 'axe' ? 'chop' : tool === 'pickaxe' ? 'pickswing' : 'reap', ms: 750, tool, i: m.i | 0 }); break; }
    case 'job': jobMsg(p, m); break;
    case 'wv': wvMsg(p, m); break;
    case 'obs': if (p.dev || p.devPowers) Net.toOne(p.id, obsSnap()); break;   /* Observatório do Tecelão */
    case 'obsc': if (p.dev || p.devPowers) obsControl(p, m); break;   /* controles de simulação */
    case 'obsh': if (p.dev || p.devPowers) { const H = obsLoadH(); Net.toOne(p.id, { t: 'obsh', hr: H.hr, dy: H.dy, heat: S.heat || obsHeatLoad(), names: Object.fromEntries(PROPS.filter(q => q.kind !== 'house').map(q => [q.id, [q.name, q.kind, q.wk || q.shopType || '', q.npcOwner && !(S.estate && S.estate.r[q.id]) ? 1 : 0]])) }); } break;
    case 'hpr': if (isFinite(m.t0)) p.ping = Math.max(0, Date.now() - m.t0); break;   /* resposta do ping do anfitrião */
    case 'sheathe': if (p.duel) { tell(p, 'No duelo é só de mãos nuas.'); break; } p.autoShea = false; sheatheToggle(p); break;
    case 'hotel': hotelMsg(p, m); break;
    case 'trade': if (m.a === 'open') { const n = S.npcs && S.npcs[m.npc]; if (n && tradeCat(n) && dist(n.x, n.y, p.x, p.y) <= 3.6) Net.toOne(p.id, tradeView(n, p)); } else tradeMsg(p, m); break;
    case 'pgive': {   // doar ouro/itens para outro jogador por perto
      const q = S.players[m.to]; if (!q || q === p || p.downed || dist(p.x, p.y, q.x, q.y) > 3) { tell(p, 'Chegue mais perto para dar.'); break; }
      if (m.gold) { const wv = p.dev || p.devPowers, v = wv ? Math.min(Math.floor(+m.gold || 0), 1e9) : Math.min(Math.floor(+m.gold || 0), p.gold); if (v <= 0) break; if (!wv) p.gold -= v;   // o Tecelão tem ouro infinito
        q.gold += v; tell(p, 'Você deu ' + v + ' de ouro para ' + q.name + '.'); tell(q, p.name + ' te deu ' + v + ' de ouro.'); }
      else { const k = String(m.k), n = Math.min(Math.floor(+m.n || 1), p.inv[k] || 0); if (!LOOT[k] || n <= 0) break; if (!q.inv[k] && Object.keys(q.inv).length >= INV_SLOTS) { tell(p, 'A mochila de ' + q.name + ' está cheia.'); break; }
        p.inv[k] -= n; if (!p.inv[k]) delete p.inv[k]; q.inv[k] = (q.inv[k] || 0) + n; tell(p, 'Você deu ' + n + 'x ' + LOOT[k].name + ' para ' + q.name + '.'); tell(q, p.name + ' te deu ' + n + 'x ' + LOOT[k].name + '.'); }
      near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'offer', ms: 900, tx: q.x, ty: q.y }); sendStat(p); sendStat(q); break;
    }
    case 'menu': p.inMenu = !!m.on; break;
    case 'roompw': if (from === Net.myId) { S.roomPw = String(m.pw || '').trim().toUpperCase().slice(0, 24) || null; tell(p, S.roomPw ? 'Reino trancado: quem chegar agora precisa da senha.' : 'Reino aberto: qualquer um pode entrar.'); Net.toOne(from, { t: 'roompw', on: !!S.roomPw }); } break;
    case 'bank': bankMsg(p, m); break;
    case 'shift': shiftMsg(p, m); break;
    case 'op': { const n = S.npcs && S.npcs[m.id]; if (n) Net.toOne(p.id, { t: 'op', id: n.id, ...opInfo(n, p) }); break; }
    case 'gift': { const n = S.npcs && S.npcs[m.id], k = String(m.k || ''); if (!n || n.dead || n.downed || dist(p.x, p.y, n.x, n.y) > 3.5 || !(p.inv[k] > 0) || !LOOT[k] || !(FOOD[k] || Object.values(REP_LIKES).some(l => l.includes(k)))) break;
      S.giftT = S.giftT || {}; const key = n.id + '|' + memKey(p); if (now_() - (S.giftT[key] || 0) < 600000) { tell(p, n.name.split(',')[0] + ' agradece, mas já ganhou presente seu há pouco.'); break; }
      S.giftT[key] = now_(); p.inv[k]--; if (!p.inv[k]) delete p.inv[k]; memAdd(n, p, 'gift');
      { const g = npcGroup(n.id, n.kind), liked = (REP_LIKES[n.id] || REP_LIKES[n.kind] || REP_LIKES[g] || []).includes(k); S.giftN = S.giftN || {}; const rk = n.id + '|' + memKey(p) + '|' + k, c = S.giftN[rk] = (S.giftN[rk] || 0) + 1;
        const v = Math.max(0.5, (liked ? 5 : 2) * (1 + Math.min(1, (LOOT[k].price || 5) / 40)) / c); repAdd(p, g, v, (liked ? n.name.split(',')[0] + ' adorou o presente' : 'presente para ' + n.name.split(',')[0]) + (c > 1 ? ', mas já ganhou isso antes' : '')); }
      sendStat(p); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Para mim? Obrigado!', 'Que gentileza!', 'Não precisava!'][Math.floor(Math.random() * 3)], ms: 1 }); Net.toOne(p.id, { t: 'op', id: n.id, ...opInfo(n, p) }); break; }
    case 'revive': {
      const t = S.players[m.id];
      if (m.on && t && !t.downed && t !== p && !p.downed && t.hp < t.maxHp * KNEEL_HP && dist(p.x, p.y, t.x, t.y) <= 1.8) { t.aid = { by: p.id, start: now_() }; near(t.x, t.y, { t: 'rv', id: t.id, by: p.id }); }
      else if (!m.on && t && t.aid && t.aid.by === p.id) { t.aid = null; near(t.x, t.y, { t: 'rv', id: t.id, by: null }); }
      else if (m.on && t && t.downed && !t.decap && !p.downed && dist(p.x, p.y, t.x, t.y) <= 1.8) { t.revive = { by: p.id, start: now_() }; near(t.x, t.y, { t: 'rv', id: t.id, by: p.id }); }
      else if (!m.on && t && t.revive && t.revive.by === p.id) { t.revive = null; near(t.x, t.y, { t: 'rv', id: t.id, by: null }); }
      break;
    }
    case 'carry': {
      if (p.carrying) { dropCarried(p); break; } sheatheToggle(p, true, true);
      const t = S.players[m.id];
      if (t && t.downed && !t.carriedBy && !p.downed && dist(p.x, p.y, t.x, t.y) <= 1.8) {
        p.carrying = t.id; t.carriedBy = p.id; t.revive = null;
        near(p.x, p.y, { t: 'carry', by: p.id, id: t.id });
      }
      break;
    }
    case 'giveup': if (p.downed) respawnTemple(p); break;
    case 'climb': {
      const b = BUILDINGS[m.b | 0]; if (!b || b.kind !== 'stairtower' || p.downed || p.carriedBy) break;
      const cx = b.x + 1, cy = b.y + 1; if (dist(p.x, p.y, cx, cy) > 1.3) break;
      if (m.up) { p.x = cx; p.y = cy; p.z = 1; }
      else { const [dx, dy] = doorTile(b); p.x = (dx + cx) / 2; p.y = (dy + cy) / 2; p.z = 0; }
      p.lastMv = now_(); p.sit = null;
      if (p.carrying) { const t = S.players[p.carrying]; if (t) { t.x = p.x; t.y = p.y; t.z = p.z; } }
      Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: p.z, climb: (m.b | 0) + 1 });
      break;
    }
    case 'floor': {
      const b = BUILDINGS[m.b | 0], to = m.to | 0, fl = p.fl || 0, lift = b && stairKind(b, 0) === 'lift'; if (!b || p.downed || p.carriedBy || p.kjail || (lift ? to === fl : Math.abs(to - fl) !== 1) || to < minFl(b) || to >= floorsOf(b)) break;   /* elevador: qualquer andar */
      if (lift && fl === 0 && WORLD.bld[tileAt(p.x, p.y)] !== (m.b | 0)) break;
      const sw = stairWorld(b, lift ? 0 : Math.min(fl, to)); if (dist(p.x, p.y, (sw.L[0] + sw.U[0]) / 2, (sw.L[1] + sw.U[1]) / 2) > 2.2) break;
      const [ax, ay] = to > fl ? sw.arrive : sw.entry; p.x = ax; p.y = ay; p.fl = to; p.fb = to !== 0 ? (m.b | 0) : -1; p.lastMv = now_(); p.sit = null;
      if (p.carrying) { const t = S.players[p.carrying]; if (t) { t.x = p.x; t.y = p.y; t.fl = p.fl; t.fb = p.fb; } }
      Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: p.fl, fb: p.fb });
      break;
    }
    case 'lift': {
      const i = m.i | 0, o = WORLD.obj[i], tx = i % MAP_W, ty = Math.floor(i / MAP_W);
      if (!THROWABLE[o] || p.lifted || p.carrying || p.downed || p.z >= 0.5 || (p.fl || 0) !== 0 || dist(p.x, p.y, tx, ty) > 1.7) break;
      p.lifted = o; setObj(i, O.NONE); (S.objBack = S.objBack || []).push({ i, o, at: now_() + 180000 });
      break;
    }
    case 'throw': {
      if (!p.lifted || p.downed) break;
      const o = p.lifted; p.lifted = null;
      let tx = +m.tx, ty = +m.ty; if (!isFinite(tx) || !isFinite(ty)) break;
      const d0 = dist(p.x, p.y, tx, ty); if (d0 > 7) { tx = p.x + (tx - p.x) / d0 * 7; ty = p.y + (ty - p.y) / d0 * 7; }
      const ms = 260 + dist(p.x, p.y, tx, ty) * 70;
      near(p.x, p.y, { t: 'throwfx', o, fx: p.x, fy: p.y, tx, ty, ms, by: p.id });
      setTimeout(() => {
        const dmg = THROWABLE[o] + p.lvl * 2;
        for (const q of Object.values(S.monsters)) {
          if (q.z || dist(q.x, q.y, tx, ty) > 1.3 + (MON[q.type].rad || 0) * 0.5) continue;
          q.stunUntil = Math.max(q.stunUntil, now_() + 900); hitRolled(p, q, dmg, false, 0, 1);
        }
      }, ms);
      break;
    }
    case 'dev': {
      if (!p.dev && !p.devPowers) break;
      const x = +m.x, y = +m.y;
      if (m.a === 'summon' && isFinite(x) && isFinite(y) && inBounds(Math.round(x), Math.round(y))) {
        const t = Math.round(y) * MAP_W + Math.round(x), top = WORLD.ground[t] === T.CLIFF && WORLD.fl1[t] > 0;
        if (m.kind === 'mon' && MON[m.v]) spawnAt(m.v, x, y, { z: top ? 1 : 0, sleep: !!MON[m.v].dragon, ang: 0 });
        else if (m.kind === 'obj' && O[m.v] != null && WORLD.bld[t] < 0) setObj(t, O[m.v]);
      } else if (m.a === 'clear') { for (const id in S.monsters) { const q = S.monsters[id]; if (dist(q.x, q.y, p.x, p.y) < 12) { delete S.monsters[id]; near(q.x, q.y, { t: 'mdie', id: q.id, d: 0 }); } } }
      else if (m.a === 'heal') { p.hp = p.maxHp; p.mp = p.maxMp; sendStat(p); }
      else if (m.a === 'hide') p.devHidden = !!m.on;
      else if (m.a === 'dragon') { const dm = Object.values(S.monsters).find(q => MON[q.type].dragon); if (dm) { dm.sleep = false; dm.aggro = null; startPatrol(dm, now_()); } }
      else if (m.a === 'tp' && isFinite(x) && isFinite(y)) { p.x = clamp(x, 1, MAP_W - 2); p.y = clamp(y, 1, MAP_H - 2); p.z = +m.z || 0; p.fl = 0; p.fb = -1; Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: p.z, fl: 0, fb: -1 }); }
      break;
    }
    case 'atk': playerStrike(p, m.k, +m.a, now_(), +m.c); break;
    case 'wpn': if (p.cls === 'knight' && !p.atk && !p.downed) { p.wpn = p.wpn === 'halberd' ? 'sword' : 'halberd'; tell(p, (p.wpn === 'halberd' ? 'Você empunha a alabarda (alcance longo, duas mãos).' : 'Você volta para espada e escudo.')); anim('p', p, 'nock', p.x, p.y, { ms: 500 }); sendStat(p); } break;
    case 'parry': if (m.on) { if (p.atk && !p.atk.done && p.cst >= FEINT_COST) { p.cst -= FEINT_COST; p.atk = null; } if (PZ.includes(m.z)) p.pz = m.z; if (!p.atk && !p.downed && now_() >= (p.stunUntil || 0)) p.parry = { t0: now_(), a: +m.a || 0, z: p.pz || 'top' }; } else p.parry = null; break;
    case 'parrya': if (p.parry && isFinite(+m.a)) p.parry.a = +m.a; break;   // virar o escudo não reinicia o tempo da defesa perfeita
    case 'sbash': shieldBash(p, +m.a || 0, now_()); break;
    case 'dodge': { const now = now_(); const lg = (p.lost || 0) & ~(p.pro || 0) & 24; if (lg || now < (p.knockUntil || 0) || p.downed || now < (p.dodgeCd || 0) || p.cst < DODGE.cost * Math.max(0.4, 1 - treeEff(p, 'dodgeCost') - useBonus(p, 'dodge')) || now < (p.stunUntil || 0)) break; p.cst -= DODGE.cost * Math.max(0.4, 1 - treeEff(p, 'dodgeCost') - useBonus(p, 'dodge')); useGain(p, 'dodge', 1); p.dodgeCd = now + DODGE.cd; p.dodgeUntil = now + DODGE.iframe; p.dodgeAllow = now + DODGE.ms + 400; p.parry = null; if (p.atk && !p.atk.done) p.atk = null; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'dash', ms: DODGE.ms + 120 }); sendStat(p);
      if ((p.sheathed || p.duel) && hasMove(p, 'sweep')) dojoSweep(p, now);
      if (p.burnUntil > now) { p.burnUntil -= 3000; if (p.burnUntil <= now + 400) extinguish(p, 'Você rola no chão e apaga o fogo.'); else near(p.x, p.y, { t: 'burn', id: p.id, ms: p.burnUntil - now }); }
      break; }
    case 'kick': playerKick(p, +m.a || 0, now_()); break;
    case 'duel': p.duel = !!m.on; break;
    case 'aim': if (['head', 'torso', 'legs'].includes(m.z)) p.aim = m.z; break;
    case 'band': bandage(p); break;
    case 'use': useItem(p, String(m.k)); break;
    case 'harvest': {
      const i = m.i | 0, o = WORLD.obj[i], x = i % MAP_W, y = Math.floor(i / MAP_W); if (p.downed || dist(p.x, p.y, x, y) > 1.8 || (o !== O.BERRY && o !== O.HERB)) break;
      const k = o === O.BERRY ? 'berries' : 'herb', n = o === O.BERRY ? 2 + (Math.random() < 0.5 ? 1 : 0) : 1;
      if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Inventário cheio.'); break; }
      p.inv[k] = (p.inv[k] || 0) + n + (Math.random() < useBonus(p, 'skin') * 2 ? 1 : 0); useGain(p, 'skin', 1); profGain(p, 'herbalista', 3); gainXp(p, 2); setObj(i, o === O.BERRY ? O.BUSH : O.NONE); (S.objBack = S.objBack || []).push({ i, o, at: now_() + (o === O.BERRY ? 240000 : 300000) });
      Net.toOne(p.id, { t: 'loot', k }); if (typeof empGather === 'function') empGather(p, k, x, y, 'gather'); sendStat(p); break;
    }
    case 'cook': cookOrDrink(p, 'cook'); break;
    case 'carve': carve(p, String(m.k)); break;
    case 'drinkw': if (isFinite(m.dir)) p.dir = m.dir | 0; if (isFinite(m.fa)) p.fa = +m.fa; cookOrDrink(p, 'drink'); break;
    case 'skin': {
      const c = S.corpses && S.corpses[m.id]; if (!c || c.looted || p.downed || dist(p.x, p.y, c.x, c.y) > 1.9) break;
      lootCorpse(p, c); break;
    }
    case 'open': {
      const c = S.chests && S.chests[m.id]; if (!c || p.downed || dist(p.x, p.y, c.x, c.y) > 2) break;
      if (!c.who.has(p.id)) { tell(p, 'Este baú não é seu: você não lutou contra o chefe.'); break; }
      if (c.opened.has(p.id)) break;
      c.opened.add(p.id);
      const gold = rint(90, 160); p.gold += gold; p.pots.hp += 2;
      const items = [MON[c.boss].trophy]; if (Math.random() < 0.5) items.push('gem');
      for (const k of items) if (k && LOOT[k]) { p.inv[k] = Math.min(999, (p.inv[k] || 0) + 1); Net.toOne(p.id, { t: 'loot', k }); }
      Net.toOne(p.id, { t: 'chestopen', id: c.id, gold, items }); sendStat(p);
      break;
    }
    case 'emote': if (m.k === 'toast' && p.bath && typeof bathDrinkStart === 'function') { bathDrinkStart(p); break; }   /* na banheira: um copinho de saquê */
      if (m.k === 'toast' && !p.downed) { const bi = WORLD.bld[tileAt(p.x, p.y)]; for (const q of Object.values(S.players)) { if (q.downed || dist(q.x, q.y, p.x, p.y) > 3.5 || WORLD.bld[tileAt(q.x, q.y)] !== bi) continue; near(q.x, q.y, { t: 'emote', id: q.id, k: 'cheer' }); }
        for (const n of Object.values(S.npcs || {})) if (!n.dead && !n.downed && dist(n.x, n.y, p.x, p.y) < 3.5 && WORLD.bld[tileAt(n.x, n.y)] === bi && bi >= 0) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: 'Saúde! 🍻', ms: 1 });
        near(p.x, p.y, { t: 'chat', id: p.id, name: p.name, text: '🍻 Saúde!' }); break; }
      if (m.k === 'smoke') { if (p.bath) near(p.x, p.y, { t: 'emote', id: p.id, k: 'smoke' }); break; }
      { const k = ['salute', 'dance', 'point', 'cheer', 'surprise', 'adore', 'anger', 'fear', 'sad'].includes(m.k) ? m.k : null; if (k && !p.downed) near(p.x, p.y, { t: 'emote', id: p.id, k });
      if (k === 'adore' && !p.dev && Object.values(S.players).some(w => w.dev && w.skin === 'weaver' && w !== p && dist(w.x, w.y, p.x, p.y) < 6)) { const had = now_() < (p.buffs.weaver || 0); p.buffs.weaver = now_() + 3600000; p.food = Math.max(p.food ?? 100, 80); p.water = Math.max(p.water ?? 100, 80); p.cold = 0; if (!had) tell(p, 'O Tecelão aceita a sua devoção: por 1 hora você não sente fome, sede nem frio.'); sendStat(p); }
      break; }
    case 'exec': {   // entrega o condenado caído ao carrasco: deita na guilhotina, a lâmina cai e a cabeça rola (morte permanente)
      const v = S.players[p.carrying] || (p.drag && p.drag.k === 'p' && p.drag.mode !== 'grip' ? S.players[p.drag.id] : null); if (!v || !v.downed || STAGE.x < 0 || v.execAt || dist(p.x, p.y, STAGE.x, STAGE.y) > 3.4) break;
      if (!npcAlive('executioner')) { tell(p, 'Não há carrasco para executar ninguém.'); break; }
      if (p.carrying) dropCarried(p); else stopDrag(p); startExecution(v, p.name); break; const now = now_(); v.x = STAGE.x; v.y = STAGE.y; v.z = 0; v.execAt = now + 2600; v.downed.until = Math.max(v.downed.until, now + 12000);
      near(STAGE.x, STAGE.y, { t: 'exec', id: v.id, x: STAGE.x, y: STAGE.y, ms: 2600 }); sys(p.name + ' levou ' + v.name + ' ao cadafalso!');
      setTimeout(() => { const q = S.players[v.id]; if (!q) return; q.execAt = 0; if (!q.downed) return; q.downed = null; severPlayer(q, 'head', { x: STAGE.x, y: STAGE.y + 1, name: 'o Carrasco' }); }, 2600);
      break;
    }
    case 'sleep': {
      if (!m.on || p.downed || p.carrying || p.carriedBy) { p.sleep = null; break; }
      const b = BEDS[m.b | 0]; if (!b || dist(p.x, p.y, b.x, b.y) > 2.6 || (b.fl || 0) !== (p.fl || 0)) break;
      if (b.apt) { const AP = PROPS_BY['ap' + b.apt], r = AP && estateLoad().r[AP.id]; if (!(AP.suite && SUITE_OPEN) && (!r || (r.owner !== estOwner(p) && !(r.auth || []).includes(p.name.trim().toLowerCase())))) { tell(p, 'Esse futon é de quem mora aqui.'); break; } }
      if (BUILDINGS[b.bi] && BUILDINGS[b.bi].kind === 'hotel' && hotelBedOf(p) !== (m.b | 0)) { tell(p, 'Essa cabine não é sua. Fale com Dona Ilsa, no balcão, para alugar um (3 de ouro por dia).'); break; }
      p.x = b.x; p.y = b.y; p.dir = dirFromVecS(b.dx, b.dy); p.sleep = m.b | 0; p.sit = null; p.walking = false; break;
    }
    case 'bath': bathMsg(p, m); break;
    case 'tub': tubMsg(p, m); break;
    case 'emp': if (typeof empMsg === 'function') empMsg(p, m); break;
    case 'ent': if (typeof entMsg === 'function') entMsg(p, m); break;
    case 'court': if (typeof courtMsg === 'function') courtMsg(p, m); break;
    case 'house': if (typeof houseMsg === 'function') houseMsg(p, m); break;
    case 'inf': if (typeof infMsg === 'function') infMsg(p, m); break;
    case 'praz': if (typeof prazMsg === 'function') prazMsg(p, m); break;
    case 'tat': if (typeof tatMsg === 'function') tatMsg(p, m); break;
    case 'vel': if (typeof velMsg === 'function') velMsg(p, m); break;
    case 'casa': if (typeof csMsg === 'function') csMsg(p, m); break;
    case 'camp': if (typeof cpMsg === 'function') cpMsg(p, m); break;
    case 'trama': if (typeof trMsg === 'function') trMsg(p, m); break;
    case 'cargo': if (typeof cgMsg === 'function') cgMsg(p, m); break;
    case 'cerco': if (typeof sgMsg === 'function') sgMsg(p, m); break;
    case 'funda': if (typeof phMsg === 'function') phMsg(p, m); break;
    case 'rei': if (typeof reiMsg === 'function') reiMsg(p, m); break;
    case 'regras': if (typeof rgMsg === 'function') rgMsg(p, m); break;
    case 'linha': if (typeof lnMsg === 'function') lnMsg(p, m); break;
    case 'casar': if (typeof mrMsg === 'function') mrMsg(p, m); break;
    case 'duel': duelMsg(p, m); break;
    case 'hipthrow': hipThrow(p); break;
    case 'train': trainMsg(p, m); break;
    case 'auto': if (m.ppl != null) pplMsg(p, m); else autoMsg(p, m); break;
    case 'ptarget': if (m.k === 'p' && S.players[m.id] && m.id !== p.id) p.pTgt = { k: 'p', id: m.id }; else if (m.k === 'n' && S.npcs[m.id]) p.pTgt = { k: 'n', id: m.id }; else p.pTgt = null; break;
    case 'medit': meditMsg(p, m); break;
    case 'sit': {
      if (!m.on || p.downed || p.carrying || p.carriedBy) { p.sit = null; break; }
      const st = m.s != null ? WORLD.seats[m.s | 0] : null;
      if (st) { if (dist(p.x, p.y, st.x, st.y) > 2.5 || (st.fl || 0) !== (p.fl || 0)) break; p.x = st.x; p.y = st.y; p.dir = st.dir; p.sit = st.low ? 'g' : 'c'; }
      else p.sit = 'g';
      p.walking = false;
      break;
    }
  }
}

function handleMove(p, m) {
  if (p.carriedBy) return;
  if (p.grabbed || p.dragBy || p.gripBy || p.surrendered || now_() < (p.flungUntil || 0) || now_() < (p.knockUntil || 0)) return;
  { const tx = +m.x, ty = +m.y, ti = isFinite(tx) && isFinite(ty) ? tileAt(tx, ty) : -1, c = jailOf(p), st = cellsState();
    const back = () => Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: p.z, fl: p.fl || 0, fb: p.fb ?? -1 });
    if (c && p.dev) releasePlayer(p, 'O Tecelão atravessa as grades.');
    else if (c && ti >= 0 && !c.tiles.has(ti)) { back(); return; }                                                     // preso só anda dentro da cela
    if (ti >= 0 && !p.dev && HOTEL_DOORS.has(ti) && hotelRoomOf(p) !== HOTEL_DOORS.get(ti)) { back(); return; }   // cabine de outro hóspede
    if (!c && ti >= 0) { const k = JAILCELLS.findIndex(q => q.tiles.has(ti) || (q.door[1] * MAP_W + q.door[0]) === ti); if (k >= 0 && st[k].locked && (q => q.door[1] * MAP_W + q.door[0])(JAILCELLS[k]) === ti) { back(); return; } } }
  if (p.sleep != null && m.w) p.sleep = null;   // voando / derrubado
  if (p.dev) { const x = +m.x, y = +m.y; if (isFinite(x) && isFinite(y)) { p.x = clamp(x, 1, MAP_W - 2); p.y = clamp(y, 1, MAP_H - 2); p.z = +m.z || 0; p.dir = m.d | 0; p.walking = !!m.w; p.lastMv = now_(); } return; }
  const now = now_();
  const x = +m.x, y = +m.y;
  if (!isFinite(x) || !isFinite(y)) return;
  const z = heightAt(x, y, p.z);
  const dt = Math.min(3, (now - p.lastMv) / 1000);   /* tolera até 3 s de atraso da rede */
  const maxStep = PLAYER_SPEED * (m.sl || now < (p.dodgeAllow || 0) ? RUN_MUL * 2.6 : m.r ? RUN_MUL * 1.5 : 1.7) * (dt + 0.25) + 0.4;
  const ok = dist(p.x, p.y, x, y) <= maxStep && canStandZ(x, y, z, 0.18, p.fl || 0, p.fb ?? -1) && Math.abs(z - (+m.z || 0)) < 0.45 && !(p.kjail && typeof kjailBlocked === 'function' && kjailBlocked(p, x, y));
  if (!ok || estateBlocked(p.name, p.x, p.y, x, y, S.estateL) || (!p.dev && typeof seatBlocked === 'function' && seatBlocked(p.name, p.x, p.y, x, y, S.seatL)) || ((p.fl || 0) !== 0 && p.fb >= 0 && !p.dev && aptBlocked(p.name, p.fb, p.fl, p.x, p.y, x, y, S.estateL))) {
    const far = dist(p.x, p.y, x, y), lagOnly = far > maxStep && far < 10 && canStandZ(x, y, z, 0.18, p.fl || 0, p.fb ?? -1) && Math.abs(z - (+m.z || 0)) < 0.45 && !estateBlocked(p.name, p.x, p.y, x, y, S.estateL);
    if (lagOnly) return;   /* passo longo só por atraso: ignora (o próximo, com mais tempo passado, é aceito) em vez de puxar o jogador de volta */
    Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: p.z, fl: p.fl || 0, fb: p.fb ?? -1 }); return; }
  if (p.sit && dist(p.x, p.y, x, y) > 0.05) p.sit = null;
  p.x = x; p.y = y; p.z = z; if (!p.sit || p.walking || m.w) p.dir = m.d | 0; p.walking = !!m.w; p.running = !!m.r; p.crouch = !!m.c; if (m.sl && !p.slide) { p.cst = Math.max(0, (p.cst ?? 0) - SLIDE_COST); p.cstT = now; } p.slide = !!m.sl; p.tired = !!m.ti; p.lastMv = now;
  if (p.casting && dist(p.x, p.y, p.castX, p.castY) > 0.3) { p.casting = null; near(p.x, p.y, { t: 'castend', id: p.id }); }
  if (p.carrying) { const t = S.players[p.carrying]; if (t) { t.x = p.x; t.y = p.y; t.z = p.z; } }
}

function dropCarried(p) {
  const t = S.players[p.carrying];
  p.carrying = null;
  if (!t) return;
  t.carriedBy = null;
  for (const [dx, dy] of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6], [0, 0]]) if (canStandZ(p.x + dx, p.y + dy, p.z)) { t.x = p.x + dx; t.y = p.y + dy; break; }
  t.z = p.z;
  near(p.x, p.y, { t: 'carry', by: p.id, id: null });
  t.fl = p.fl || 0; t.fb = p.fb ?? -1;
  Net.toOne(t.id, { t: 'tp', x: t.x, y: t.y, z: t.z, fl: t.fl, fb: t.fb });
}

function hostOnLeave(id, quiet) {
  const p = S.players[id];
  if (!p) return;
  if (p.carrying) dropCarried(p);
  if (p.carriedBy && S.players[p.carriedBy]) S.players[p.carriedBy].carrying = null;
  delete S.players[id];
  Net.toAll({ t: 'pleave', id });
  if (!quiet) sys(`${p.name} deixou a cidadela.`);
}

// ---------------- combate ----------------
function roll(p, mult = 1, tgt = null) {
  const c = CLASSES[p.cls], l = p.lvl;
  let dmg = rint(Math.floor(c.dmg[0][0] + c.dmg[0][1] * l), Math.floor(c.dmg[1][0] + c.dmg[1][1] * l)) * mult;
  if (buffOn(p, 'mead')) dmg *= 1.1;
  if (p.hp < p.maxHp * KNEEL_HP) dmg *= 0.7;   // de joelhos: golpes fracos
  if (p.body) dmg *= ((p.lost || 0) & LOST.armA) ? (((p.pro || 0) & LOST.armA) ? 0.6 : 0.3) : ARM_DMG[PART_STATE(p.body.armA)];   // braço da arma ferido / perdido (gancho ajuda)
  dmg *= p._aimMul || 1;
  if (buffOn(p, 'whet')) dmg *= 1.15;
  if (!p._melee && wandOf(p)) dmg *= 1 + WANDS[wandOf(p)].dmg + ((wandBonus(p) || {}).dmg || 0);
  if (!p._melee && p.cls === 'mage' && !p.sheathed) dmg *= 1.5;   // cajado na mão (sacado com G): magia +50%   // varinha do mago (+ madeira e núcleo)
  dmg *= 1 + treeEff(p, 'dmg') + (p._el === 'fire' ? treeEff(p, 'fire') : p._el === 'ice' ? treeEff(p, 'ice') : 0) + useBonus(p, p._melee ? meleeUseOf(p) : RANGED_USE[p.cls]);
  if (tgt && MON[tgt.type] && MON[tgt.type].beh) dmg *= 1 + treeEff(p, 'beast');
  if (buffOn(p, 'banner')) dmg *= 1.15;
  const crit = p._forceCrit || Math.random() < c.crit + (p.inv && p.inv.amulet_luck ? 0.05 : 0) + treeEff(p, 'crit') + (buffOn(p, 'agile') ? 0.1 : 0);
  if (crit) dmg *= 1.8 + treeEff(p, 'critDmg');
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}

function hitRolled(p, m, dmg, crit, delay, hv) {
  if (!S.monsters[m.id]) return;
  m.hp -= dmg; m.aggro = p.id; m.returning = false;
  p.lastCombat = now_();
  near(m.x, m.y, { t: 'hit', k: 'm', id: m.id, x: m.x, y: m.y, dmg, crit, d: delay, by: p.id, ax: p.x, ay: p.y, hv, z: m._hz }); m._hz = null;
  if (m.hp <= 0) killMonster(m, p, delay);
}
function hitMonster(p, m, mult, delay = 0) {
  if (!S.monsters[m.id]) return;
  const { dmg, crit } = roll(p, mult, m);
  m.hp -= dmg; m.aggro = p.id; m.returning = false;
  p.lastCombat = now_();
  near(m.x, m.y, { t: 'hit', k: 'm', id: m.id, x: m.x, y: m.y, dmg, crit, d: delay, by: p.id, ax: p.x, ay: p.y, hv: mult >= 2 ? 1 : 0 });
  if (m.hp <= 0) killMonster(m, p, delay);
}

function lootCorpse(p, c, auto) {
  c.looted = true; useGain(p, 'skin', 1);
  if (c.gold) { const g = Math.round(c.gold * (1 + useBonus(p, 'skin')) * (now_() < ((p.buffs || {}).luck || 0) ? 1.15 : 1)); p.gold += g; Net.toOne(p.id, { t: 'lootgold', g }); }
  for (const k of c.items) { if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Inventário cheio.'); c.looted = false; c.gold = 0; c.items = c.items.slice(c.items.indexOf(k)); break; } p.inv[k] = Math.min(999, (p.inv[k] || 0) + 1); Net.toOne(p.id, { t: 'loot', k }); }
  if (c.looted) c.items = [];
  if (!auto && !c.gold && !c.items.length && c.looted) tell(p, 'Nada de útil aqui.');
  sendStat(p);
}
function killMonster(m, p, delay) {
  delete S.monsters[m.id]; obsCount('mon', m.x, m.y);
  near(m.x, m.y, { t: 'mdie', id: m.id, d: delay });
  for (const id in S.players) if (S.players[id].target === m.id) S.players[id].target = null;
  const def = MON[m.type];
  // o corpo fica no chão (até o monstro voltar) com o ouro e os recursos dentro: é preciso revistar/esfolar (segurar F)
  const gold = rint(def.gold[0], def.gold[1]), drops = [];
  for (const [k, ch] of MON_LOOT[m.type] || []) if (Math.random() < ch) drops.push(k);
  if (Math.random() < 0.03) drops.push('gem');
  if (m.type !== 'wisp') (S.corpses = S.corpses || {})[m.id] = { lost: m.lost || 0, id: m.id, type: m.type, x: m.x, y: m.y, z: m.z || 0, gold, items: drops, looted: !gold && !drops.length, until: now_() + (m.bs && (BASTIONS.find(b => b.id === m.bs) || {}).fast ? 20000 : def.dragon ? (BASTIONS.find(b => b.id === 'dragon') || {}).respawn || BOSS_RESPAWN : def.boss ? BOSS_RESPAWN : BASTION_RESPAWN), ix: m.x - p.x, iy: m.y - p.y };
  { const c = S.corpses && S.corpses[m.id]; if (c && !c.looted && p && S.players[p.id] && !p.downed && dist(p.x, p.y, c.x, c.y) < 16) setTimeout(() => { if (!c.looted && S.players[p.id]) lootCorpse(p, c, true); }, (delay || 0) + 250); }
  if (def.boss) spawnChest(m);
  const group = Object.values(S.players).filter(q => !q.downed && dist(q.x, q.y, m.x, m.y) <= 10);
  if (!group.includes(p)) group.push(p);
  const share = Math.ceil(def.xp * (group.length > 1 ? 0.7 : 1));
  for (const q of group) { gainXp(q, share, delay + 400); questCredit(q, m.type); }
}

function questCredit(p, type) {
  for (const q of QUESTS) {
    if (q.mon !== type || p.quests[q.id] == null) continue;
    p.quests[q.id]++;
    if (p.quests[q.id] >= q.count) {
      delete p.quests[q.id];
      p.qdone[q.id] = (p.qdone[q.id] || 0) + 1;
      p.gold += q.gold;
      Net.toOne(p.id, { t: 'qdone', id: q.id });
      gainXp(p, q.xp, 600);
    } else Net.toOne(p.id, { t: 'qprog', id: q.id, n: p.quests[q.id] });
    sendStat(p);
  }
}

function gainXp(p, amount, delay = 0) {
  if (buffOn(p, 'cheer') && amount > 0) amount = Math.round(amount * 1.08);   /* animado pelo show da Casa de Veludo */
  if (buffOn(p, 'rested') && amount > 0) amount = Math.round(amount * 1.1);   // bem descansado: +10% de experiência
  p.xp += amount;
  sfx(p.x, p.y, `+${amount} xp`, '#b9a8f0', delay);
  let up = false;
  while (p.xp >= need(p.lvl)) { p.xp -= need(p.lvl); p.lvl++; up = true; }
  if (up) {
    p.maxHp = maxHpOf(p); p.maxMp = maxMpOf(p);
    if (!p.downed) { p.hp = p.maxHp; p.mp = p.maxMp; }
    aoe('lvlup', p.x, p.y, { id: p.id, d: delay });
    sys(`${p.name} alcançou o nível ${p.lvl}.`);
    Net.toAll({ t: 'pinfo', p: pinfo(p) });
  }
  sendStat(p);
}

// ---------- corpo: qual parte foi atingida e o que isso causa ----------
function pickPart(m) {
  const z = HIT_ZONES[m ? HIT_CAT(m.type) : 'mid'], r = Math.random();
  if (r < z[0]) return 'head'; if (r < z[0] + z[1]) return 'torso';
  if (r < z[0] + z[1] + z[2]) return Math.random() < 0.55 ? 'armA' : 'armB';
  return Math.random() < 0.5 ? 'legL' : 'legR';
}
function woundPart(p, part, dmg) {
  if (!p.body) return;
  const before = PART_STATE(p.body[part]);
  p.body[part] = Math.max(0, p.body[part] - dmg / p.maxHp * 100 * 2.2);
  const after = PART_STATE(p.body[part]);
  if (after > before || (dmg >= p.maxHp * 0.12 && Math.random() < 0.5)) p.bleed[part] = Math.min(2, Math.max(p.bleed[part] || 0, BLEED_RATE[Math.max(1, after)]));
  if (after > before) Net.toOne(p.id, { t: 'wound', part, st: after });
}
// ---------- sobrevivência: fome, sede, frio, infecção ----------
function nearFire(p, r = 3.2) {
  if (S.fires && S.fires.some(f => dist(f.x, f.y, p.x, p.y) < r)) return true;
  for (let y = Math.round(p.y) - 3; y <= Math.round(p.y) + 3; y++) for (let x = Math.round(p.x) - 3; x <= Math.round(p.x) + 3; x++) { if (!inBounds(x, y)) continue; const o = WORLD.obj[y * MAP_W + x]; if ((o === O.CAMPFIRE || o === O.BRAZIER || o === O.TORCH) && dist(x, y, p.x, p.y) < r) return true; }
  return false;
}
function survFactor(p) { return ((p.food ?? 100) < 30 ? 0.6 : 1) * ((p.water ?? 100) < 30 ? 0.7 : 1) * ((p.cold || 0) > 50 ? 0.6 : 1) * (p.infect ? 0.7 : 1); }
function survivalTick(p, now, dt) {
  if (p.dev || p.downed) return;
  if (now < ((p.buffs || {}).weaver || 0)) { p.cold = Math.max(0, (p.cold || 0) - dt * 5); return; }   // bênção do Tecelão
  const busy = (p.running && p.walking) || now - p.lastCombat < 4000 ? 1.5 : 1, sick = now < (p.sickUntil || 0);
  if (now < (p.buffs.breath || 0)) p.cst = cstMaxOf(p);   // Elixir do Fôlego
  if (now - (p._homeT || 0) > 2000) { p._homeT = now; const pid = typeof rentalOf === 'function' && S.estate ? rentalOf(p) : null, r = pid && S.estate.r[pid]; p._atHome = !!(r && r.mode === 'own' && WORLD.bld[tileAt(p.x, p.y)] === PROPS_BY[pid].bi); }
  if (!p._atHome) {   // dentro da casa própria (comprada) não dá fome nem sede
  p.food = Math.max(0, (p.food ?? 100) - dt * 100 / (SURV.foodMin * 60) * busy);
  p.water = Math.max(0, (p.water ?? 100) - dt * 100 / (SURV.waterMin * 60) * busy * (sick ? 2.5 : 1));
  }
  if (p.water < 25 && !p.atk && !p.parry) drinkCanteen(p, now);   // bebe sozinho do cantil quando a sede aperta
  if (!p.atk && !p.parry && now - p.lastCombat > 4000 && now > (p.autoEatT || 0)) {
    if (p.food < 30) { const k = Object.keys(FOOD).filter(f => p.inv[f] > 0 && f !== 'tea').sort((a, b) => FOOD[a] - FOOD[b])[0]; if (k) { p.autoEatT = now + 4000; p.useT = 0; useItem(p, k); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'eatstand', ms: 1600 }); info(p, 'Você comeu ' + LOOT[k].name.toLowerCase() + ' (estava com fome).'); } }
    else if (p.water < 30 && p.inv.tea > 0) { p.autoEatT = now + 4000; p.useT = 0; useItem(p, 'tea'); info(p, 'Você bebeu um chá (estava com sede).'); }
  }
  // frio: à noite, fora da cidade, longe do fogo e fora de casa
  const night = dayInfoS().night, indoor = (p.fl || 0) !== 0 || bldAt(p.x, p.y) >= 0, warm = !night || indoor || nearFire(p) || now < (p.buffs.warm || 0);
  const sk = seasonNow().k, cm = sk === 'winter' ? 1.8 : sk === 'autumn' ? 1.2 : sk === 'summer' ? 0.6 : 1;
  p.cold = clamp((p.cold || 0) + dt * (warm ? -2.5 : inSafe(p.x, p.y) ? (sk === 'winter' ? 0.6 : 0.2) : 100 / (SURV.coldMin * 60) * cm), 0, 100);
  // infecção: ferida grave sem bandagem pode infeccionar; piora com o tempo
  p.band = p.band || {};
  for (const k of BODY_PARTS) if (p.band[k] && p.body[k] >= 70) delete p.band[k];
  if (now > (p.infCheck || 0)) { p.infCheck = now + 30000; if (!p.infect && BODY_PARTS.some(k => !((p.lost || 0) & (LOST[k] || 0)) && PART_STATE(p.body[k]) >= 2 && !p.band[k]) && Math.random() < SURV.infectChance) { p.infect = 1; p.infT = 0; tell(p, 'Uma ferida infeccionou. Você está com febre. Use unguento ou procure a sacerdotisa.'); } }
  if (p.infect) { p.infT = (p.infT || 0) + dt; if (p.infect === 1 && p.infT > 300) { p.infect = 2; tell(p, 'A infecção piorou.'); } }
  // dano por fome, sede, frio extremo e infecção (acumulado)
  const drain = ((p.food <= 0 ? 0.1 : 0) + (p.water <= 0 ? 0.17 : 0) + (p.cold >= 100 ? 0.125 : 0) + (p.infect === 1 ? 0.05 : p.infect === 2 ? 0.2 : 0)) / 100 * p.maxHp * dt;
  if (drain > 0) { p.survAcc = (p.survAcc || 0) + drain; if (p.survAcc >= 1) { const h = Math.floor(p.survAcc); p.survAcc -= h; p.hp -= h; if (p.hp <= 0) { p.hp = 0; goDown(p, null); } } }
}
function drinkCanteen(p, now, manual) {
  if (p.downed || p.grabbed || now < (p.drinkT || 0)) return;
  if ((p.water ?? 100) >= 99) { if (manual) tell(p, 'Você não está com sede.'); return; }
  p.drinkT = now + 2600; p.water = Math.min(100, (p.water ?? 100) + 45);
  near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'drinkb', ms: 1600 }); sendStat(p);
}
function useItem(p, k) {
  const now = now_(); if (p.downed || now < (p.useT || 0)) return; p.useT = now + 600;
  if (k === 'water') { drinkCanteen(p, now, true); return; }
  if (!p.inv[k]) return;
  if (k === 'entseed') {   /* semente da guardiã: planta uma muda nova aos seus pés */
    if (p.cls !== 'mage') { tell(p, 'Só um mago faz a semente brotar.'); return; } if ((p.fl || 0) || WORLD.bld[tileAt(p.x, p.y)] >= 0 || inSafe(p.x, p.y)) { tell(p, 'Plante fora da cidade, em terra aberta.'); return; }
    const key = estOwner(p); if ((S.estate.saps || []).some(s => s.owner === key)) { tell(p, 'Você já tem uma muda plantada.'); return; }
    p.inv.entseed--; if (!p.inv.entseed) delete p.inv.entseed; (S.estate.saps = S.estate.saps || []).push({ id: 'sap' + now, x: Math.round(p.x), y: Math.round(p.y), owner: key, ownName: p.name, by: p.id, k: strongestEl(p, ['earth', 'water', 'wind']), t: Date.now() }); estateSave(); sapsSend(); near(p.x, p.y, { t: 'sapborn', x: Math.round(p.x), y: Math.round(p.y), k: 'earth' }); tell(p, 'A semente brotou: uma muda nova, pronta para crescer de novo.'); sendStat(p); return; }
  if (CLOAK_BY_ITEM[k]) { const id = CLOAK_BY_ITEM[k]; p.cloak = p.cloak === id ? 0 : id; tell(p, p.cloak ? 'Você vestiu: ' + CLOAKS[id].n + '.' : 'Você tirou: ' + CLOAKS[id].n + '.'); sendStat(p); return; }   // vestir/tirar capa ou manto
  const take = () => { if (--p.inv[k] <= 0) delete p.inv[k]; };
  if (FOOD[k]) { p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 40 + FOOD[k]); take(); p.food = Math.min(100, p.food + FOOD[k] * (1 + useBonus(p, 'cook'))); if (k === 'stew') { p.water = Math.min(100, (p.water ?? 100) + 20); p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.15)); } if (k === 'cookedmeat') p.water = Math.max(0, p.water - 5); if ((k === 'venison' || k === 'pork') && Math.random() < 0.3) { p.sickUntil = now + 120000; tell(p, 'A carne crua caiu mal. Você está enjoado (sede dobrada por 2 min).'); } else tell(p, 'Você comeu ' + LOOT[k].name.toLowerCase() + '.'); }
  else if (k === 'elixir_breath') { take(); p.buffs.breath = now + 180000; p.cst = cstMaxOf(p); tell(p, 'Um frescor sobe pelo peito: o fôlego não acaba por 3 minutos.'); }
  else if (k === 'elixir_warm') { take(); p.buffs.warm = now + 600000; p.cold = 0; tell(p, 'Um calor de brasa corre nas veias: nada de frio por 10 minutos.'); }
  else if (k === 'elixir_swift') { take(); p.buffs.agile = now + 45000; tell(p, 'As pernas ficam leves: passos ligeiros por 45 segundos.'); }
  else if (k === 'salve') { take(); if (p.body) for (const bp of BODY_PARTS) { if ((p.lost || 0) & (LOST[bp] || 0)) continue; p.body[bp] = Math.min(100, p.body[bp] + 45); if (p.bleed) p.bleed[bp] = 0; } near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'drinkb', ms: 1200 }); tell(p, 'A pomada da Elva esfria a pele: os ferimentos fecham e o sangue para.'); }
  else if (k === 'ointment') { take(); p.infect = 0; p.infT = 0; tell(p, 'O unguento arde, mas a febre baixa.'); }
  else if (k === 'ale') { take(); p.water = Math.min(100, (p.water ?? 100) + 20); p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 60);
    if (!aleDrink(p, now, 1)) tell(p, ['Gelada e espumante!', 'Desce bem.', 'Ahh, que cerveja!'][Math.min(2, p.aleT.length - 1)]); }
  else if (k === 'firemead') { take(); fireMead(p, now); }
  else if (k === 'tea') { take(); p.water = Math.min(100, (p.water ?? 100) + 35); p.infect = Math.max(0, (p.infect || 0) - 1); tell(p, 'O chá quente acalma e mata a sede.'); }
  else if (k === 'herb') { take(); useGain(p, 'aid', 1); p.infect = Math.max(0, (p.infect || 0) - 1); p.infT = 0; for (const b of BODY_PARTS) if (p.bleed[b] > 0 && p.bleed[b] <= 0.6) p.bleed[b] = 0; tell(p, 'A erva amarga acalma a febre e estanca os cortes leves.'); }
  else if (k === 'firewood') {
    const tx = Math.round(p.x + Math.cos(p.fa || 0)), ty = Math.round(p.y + Math.sin(p.fa || 0)), t = ty * MAP_W + tx;
    if (!inBounds(tx, ty) || WORLD.obj[t] !== O.NONE || WORLD.bld[t] >= 0 || WORLD.ground[t] === T.WATER || WORLD.ground[t] === T.CLIFF) { tell(p, 'Não dá para acender a fogueira aí.'); return; }
    take(); setObj(t, O.CAMPFIRE); (S.objBack = S.objBack || []).push({ i: t, o: O.NONE, at: now + 180000 }); tell(p, 'Fogueira acesa. Dura uns 3 minutos.');
  }
  sendStat(p);
}
function cookOrDrink(p, what) {
  if (p.downed) return;
  if (what === 'cook') {
    if (!nearFire(p, 1.9)) return; let n = 0;
    for (const k of ['venison', 'pork']) { n += p.inv[k] || 0; delete p.inv[k]; }
    if (!n) { tell(p, 'Nada para assar.'); return; }
    if (!p.inv.cookedmeat && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Inventário cheio.'); return; }
    p.inv.cookedmeat = (p.inv.cookedmeat || 0) + n; useGain(p, 'cook', n); tell(p, n + ' carne' + (n > 1 ? 's assadas' : ' assada') + '.'); sendStat(p);
  } else if (what === 'drink') {
    let ok = false; for (let y = Math.round(p.y) - 2; y <= Math.round(p.y) + 2 && !ok; y++) for (let x = Math.round(p.x) - 2; x <= Math.round(p.x) + 2; x++) { if (!inBounds(x, y)) continue; const i = y * MAP_W + x, g = WORLD.ground[i], o = WORLD.obj[i]; if ((g === T.WATER || g === T.SHALLOW || o === O.WELL || o === O.FOUNTAIN) && dist(x, y, p.x, p.y) < (o === O.WELL || o === O.FOUNTAIN ? 2.6 : 1.9)) { ok = { x, y }; break; } }
    if (!ok) return; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'scoop', ms: 1500, tx: ok.x, ty: ok.y }); p.water = 100; if (p.hasSkin) p.pots.water = 5; tell(p, p.hasSkin ? 'Você bebeu e encheu o odre.' : 'Você bebeu até matar a sede.'); sendStat(p);
  }
}
// morte permanente: o personagem acaba
function permaDeath(p, reason) {
  { const B = bankLoad(), k = estOwner(p), A = B.acc[k]; if (A) { const O = bankOwnerRec(); if (A.g > 0) { if (O && O.biz) { O.biz.cofre += A.g; bizLog(O.biz, 'Herança: ' + Math.floor(A.g) + ' de ouro de ' + p.name + ', que morreu, ficou com o banco.'); } } delete B.acc[k]; bankSave(); } }
  Net.toOne(p.id, { t: 'dead', reason, lvl: p.lvl, name: p.name });
  sys(`${p.name} morreu ${reason}. Que a Aurora o receba.`);
  if (p.carrying) dropCarried(p);
  if (p.carriedBy && S.players[p.carriedBy]) S.players[p.carriedBy].carrying = null;
  delete S.players[p.id]; Net.toAll({ t: 'pleave', id: p.id });
}
function bodyTick(p, now, dt) {
  if (!p.body || p.downed || p.dev) return;
  let tot = 0; for (const k of BODY_PARTS) tot += p.bleed[k] || 0;
  tot = Math.min(2.5, tot);
  if (tot > 0) {
    p.bleedAcc = (p.bleedAcc || 0) + p.maxHp * tot / 100 * dt;
    if (p.bleedAcc >= 1) { const h = Math.floor(p.bleedAcc); p.bleedAcc -= h; p.hp -= h; if (p.hp <= 0) { p.hp = 0; goDown(p, null); return; } }
    for (const k of BODY_PARTS) if (p.bleed[k] > 0 && p.bleed[k] <= 0.3) p.bleed[k] = Math.max(0, p.bleed[k] - 0.006 * dt);   // feridas leves estancam sozinhas
  } else if (now - p.lastCombat > 8000) {
    if (p.infect !== 2) for (const k of BODY_PARTS) { if ((p.lost || 0) & (LOST[k] || 0)) continue; const h = p.body[k]; p.body[k] = h >= 40 ? Math.min(100, h + 0.4 * dt) : Math.min(40, h + 0.08 * dt); }   // grave só cicatriza até "ferido" (o resto, só com a sacerdotisa)
  }
  if (now - (p.bodySent || 0) > 2000) { p.bodySent = now; sendStat(p); }
}
function bandage(p) {
  const now = now_(); if (p.downed || now < (p.bandT || 0)) return;
  const worst = BODY_PARTS.slice().sort((a, b) => (p.bleed[b] - p.bleed[a]) || (p.body[a] - p.body[b]))[0];
  if (p.pots.band > 0) {
    p.bandT = now + 1800; const x0 = p.x, y0 = p.y;
    Net.toOne(p.id, { t: 'banding', ms: 1500 });
    setTimeout(() => { if (p.downed || dist(p.x, p.y, x0, y0) > 0.4) { tell(p, 'Você se mexeu: a bandagem soltou.'); return; } p.pots.band--; p.bleed[worst] = 0; if (p.arrows && p.arrows.some(a => a.part === worst)) { p.arrows = p.arrows.filter(a => a.part !== worst); near(p.x, p.y, { t: 'unstick', k: 'p', id: p.id, part: worst }); } (p.band = p.band || {})[worst] = true; p.body[worst] = Math.min(100, p.body[worst] + 12); tell(p, 'Bandagem em ' + BODY_NAMES[worst].toLowerCase() + '.'); sendStat(p); }, 1500);
    return;
  }
  const fire = S.fires && S.fires.some(f => dist(f.x, f.y, p.x, p.y) < 1.8);
  let nearFire = fire; for (let y = Math.round(p.y) - 2; y <= Math.round(p.y) + 2 && !nearFire; y++) for (let x = Math.round(p.x) - 2; x <= Math.round(p.x) + 2; x++) { const o = WORLD.obj[y * MAP_W + x]; if ((o === O.CAMPFIRE || o === O.TORCH || o === O.BRAZIER) && dist(x, y, p.x, p.y) < 1.8) { nearFire = true; break; } }
  if (!nearFire) { tell(p, 'Sem bandagem e sem fogo por perto para cauterizar.'); return; }
  p.bandT = now + 2000; p.band = p.band || {}; for (const k of BODY_PARTS) { p.bleed[k] = 0; if (PART_STATE(p.body[k]) >= 2) p.band[k] = true; }
  const h = Math.round(p.maxHp * 0.1); p.hp -= h; near(p.x, p.y, { t: 'hit', k: 'p', id: p.id, x: p.x, y: p.y, dmg: h, d: 0 });
  tell(p, 'Você cauterizou as feridas no fogo. Dói, mas o sangue parou.'); if (p.hp <= 0) { p.hp = 0; goDown(p, null); } sendStat(p);
}
function damagePlayer(p, raw, m, delay = 0, zone = null, exactPart = null) {
  if (p.dev) return;   // o Tecelão não se fere
  if (p.riding && typeof entRide === 'function' && S.estate.ents && S.estate.ents[p.riding]) { const n = S.npcs[entNid(p.riding)]; if (n && !n.dead) { entHurt(n, S.estate.ents[p.riding], Math.round(raw * 0.8), 'mon'); return; } }   /* montado: quem leva o golpe é a guardiã */
  p._hitT = now_(); if (m && m.npc && typeof segDefendNpc === 'function') segDefendNpc(m.id, p); if (m && m.npc && S.npcs[m.id]) p._hitBy = { k: 'n', id: m.id, t: now_() };   /* os seguranças defendem de sentinelas e moradores */
  if (p.sleep != null) p.sleep = null;
  if (p.downed) {
    // lobos atacam quem está caído: a pessoa sangra mais rápido
    if (m && MON[m.type] && MON[m.type].beh === 'pred' && m.id != null && S.monsters[m.id] && !m.dragging && !p.dragBy && !p.carriedBy && !p.tied && Math.random() < 0.5) { m.dragging = p.id; m.dragUntil = now_() + 6000; p.dragBy = 'w:' + m.id; p.dragMode = 'foot'; }
    if (m && MON[m.type] && MON[m.type].beh === 'pred' && now_() > (p.downed.wolfT || 0)) { p.downed.wolfT = now_() + 1500; p.downed.until -= 800;   /* mordida em quem está caído: no máximo uma a cada 1,5 s, mesmo com a matilha toda (antes 2,5 s por mordida acabava o sangramento em segundos) */  near(p.x, p.y, { t: 'hit', k: 'p', id: p.id, x: p.x, y: p.y, dmg: 0, d: delay, ax: m.x, ay: m.y }); }
    return;
  }
  const c = CLASSES[p.cls];
  let mult = 1 - c.armor;
  if (buffOn(p, 'wall')) mult *= 0.4;
  if (buffOn(p, 'warcry')) mult *= 0.8;
  if (buffOn(p, 'bless')) mult *= 0.9;
  if ((p._sapT || 0) > now_()) mult *= 0.85;   /* casca protetora da muda */
  if ((p.stoneSk || 0) > now_()) mult *= 0.55;   /* Pele de Pedra */
  if (buffOn(p, 'loose')) mult *= 0.9;   /* Corpo solto (cascata das Termas): 10% menos dano */
  if (m && S.monsters[m.id] && m.sandUntil > now_() && Math.random() < 0.5) { sfx(p.x, p.y, 'errou', '#d8c890'); return; }   /* Tempestade de Areia: metade dos golpes erra */
  if (S.cfields && S.cfields.length && fieldAt(p, 'c_dome')) { if (m && m.cls === 'archer' && S.players[m.id]) { near(p.x, p.y, { t: 'evofx', id: p.id, x: p.x, y: p.y, k: 'deflect' }); return; } mult *= 0.6; }   /* Campo de Defesa */
  mult *= Math.max(0.4, 1 - treeEff(p, 'armor')); if (buffOn(p, 'iron')) mult *= 0.6; if (buffOn(p, 'sanct')) mult *= 0.75;
  if ((p.windSh || 0) > now_()) { if (m && m.cls === 'archer' && S.players[m.id]) { near(p.x, p.y, { t: 'evofx', id: p.id, x: p.x, y: p.y, k: 'deflect' }); return; } mult *= 0.7; if (m && S.monsters[m.id] && dist(m.x, m.y, p.x, p.y) < 2.2 && !(MON[m.type] && MON[m.type].big)) knockMon(m, p, now_()); }   /* Escudo de Vento: flechas desviam, menos dano, quem bate é jogado longe */
  useGain(p, 'vigor', 0.5);
  if (p.body && PART_STATE(p.body.armB) >= 2) mult = Math.min(1, mult * 1.25);
  const part = exactPart || (zone ? pick(STRIKE_PART[zone]) : pickPart(m)), headK = part === 'head' ? 1.25 : 1;
  let dmg = Math.max(1, Math.round(raw * mult * headK));
  if ((p.prayShield || 0) > 0 && (p.prayUntil || 0) > now_()) { const ab = Math.min(p.prayShield, dmg); p.prayShield -= ab; dmg -= ab; if (dmg <= 0) { sfx(p.x, p.y, 'escudo', '#f0d878', delay); near(p.x, p.y, { t: 'evofx', id: p.id, x: p.x, y: p.y, k: 'pshit' }); return; } }   /* Escudo de Prece absorve o golpe */
  woundPart(p, part, dmg);
  p.hp -= dmg;
  p.lastCombat = now_();
  near(p.x, p.y, { t: 'hit', k: 'p', id: p.id, x: p.x, y: p.y, dmg, d: delay, ax: m ? m.x : p.x, ay: m ? m.y : p.y - 1 });
  if (p.hp > 0) { sendStat(p); return; }
  goDown(p, m);
}

// ---------------- caído (downed) ----------------
function goDown(p, m) {
  if (p.execTok) { p.hp = Math.max(1, p.hp); return; }   // deitado na guilhotina: nada derruba de novo (o corpo fica na prancha)
  if (p.drag) stopDrag(p);
  if (m && m.id != null && m.type && CAPTORS.has(m.type) && S.monsters[m.id] && !p.dev && !inSafe(p.x, p.y) && Math.random() < 0.7) setTimeout(() => { if (S.monsters[m.id] && p.downed) S.monsters[m.id].carryWant = p.id; }, 1200);
  p.lifted = null;
  p.hp = 0; p.downed = { until: now_() + DOWNED_MS }; p.target = null; p.casting = null; p.revive = null;
  if (p.carrying) dropCarried(p);
  for (const id in S.monsters) { const q = S.monsters[id]; if (q.aggro === p.id) q.aggro = null; if (q.taunt && q.taunt.pid === p.id) q.taunt = null; }
  near(p.x, p.y, { t: 'down', id: p.id });
  sys(`${p.name} caiu diante de ${m ? (m.name || (MON[m.type] && MON[m.type].name) || 'um inimigo') : 'um inimigo'}. Ajude-o!`);
  sendStat(p);
}
function revivePlayer(p, frac, by) {
  if (!p.downed) return;
  p.downed = null; p.revive = null;
  if (p.carriedBy && S.players[p.carriedBy]) { const c = S.players[p.carriedBy]; c.carrying = null; near(c.x, c.y, { t: 'carry', by: c.id, id: null }); }
  p.carriedBy = null;
  p.hp = Math.max(1, Math.round(p.maxHp * frac));
  p.lastCombat = 0;
  near(p.x, p.y, { t: 'up', id: p.id });
  aoe('heal', p.x, p.y, { id: p.id });
  sys(by ? `${by} reanimou ${p.name}.` : `${p.name} foi reanimado.`);
  Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: p.z, fl: p.fl || 0, fb: p.fb ?? -1 });
  sendStat(p);
}
function respawnTemple(p) {
  if (p.arrows && p.arrows.length) { p.arrows = []; near(p.x, p.y, { t: 'unstick', k: 'p', id: p.id, all: 1 }); }
  if (PERMADEATH && !p.dev && !p.devPowers) { permaDeath(p, p.decap ? 'decapitado' : 'sangrando no chão'); return; }
  if (p.carriedBy && S.players[p.carriedBy]) S.players[p.carriedBy].carrying = null;
  p.carriedBy = null; p.downed = null; p.revive = null;
  p.xp = Math.floor(p.xp / 2);
  p.hp = p.maxHp; p.mp = p.maxMp; p.lastCombat = 0; p.atk = null; p.parry = null; p.cst = cstMaxOf(p); p.lost = (p.lost || 0) & ~LOST.head; p.decap = false; p.knockUntil = 0;
  if (p.body) for (const k of BODY_PARTS) { if (p.lost & (LOST[k] || 0)) { p.body[k] = 0; p.bleed[k] = 0; continue; } p.body[k] = 100; p.bleed[k] = 0; }
  const s = townSpot(); p.x = s.x; p.y = s.y; p.z = 0; p.fl = 0; p.fb = -1;
  Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0 });
  Net.toOne(p.id, { t: 'respawned' });
  near(p.x, p.y, { t: 'up', id: p.id });
  sendStat(p);
}

const flight = (ax, ay, bx, by) => 120 + Math.hypot(ax - bx, ay - by) * 55;

// monstro atrás do jogador (para os giros de 180°)
function monBehind(p, m, range) {
  const fx = m.x - p.x, fy = m.y - p.y, fl = Math.hypot(fx, fy) || 1;
  let best = null, bd = 1e9;
  for (const id in S.monsters) { const q = S.monsters[id]; if (q === m) continue; const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d > range || d < 0.3) continue; if ((dx * fx + dy * fy) / (d * fl) > -0.5) continue; if (d < bd) { bd = d; best = q; } }
  return best;
}
function shot(p, kind, tx, ty, d, delay) { near(p.x, p.y, { t: 'proj', id: p.id, kind, tx, ty, d, delay }); }
function basicAttack(p, m, now) {
  const z = p.aim || 'torso';
  if (Math.random() > AIM_ACC[z]) { p.nextAtk = now + CLASSES[p.cls].atkMs; anim('p', p, p.cls === 'knight' ? 'swing' : p.cls === 'archer' ? 'shoot' : 'bolt', m.x, m.y); near(m.x, m.y, { t: 'miss', id: m.id }); return; }   // errou
  p._aimMul = AIM_DMG[z];
  try { basicAttack0(p, m, now); } finally { p._aimMul = 1; }
  if (p.cls !== 'knight') useGain(p, RANGED_USE[p.cls], 1);
  if (p.body && PART_STATE(p.body.armA) >= 2) p.nextAtk += CLASSES[p.cls].atkMs * (PART_STATE(p.body.armA) === 3 ? 0.5 : 0.2);
  if (S.monsters[m.id]) { if (z === 'legs') m.slowUntil = Math.max(m.slowUntil, now + 2500); else if (z === 'head' && Math.random() < 0.15) m.stunUntil = Math.max(m.stunUntil, now + 700); }
}
function basicAttack0(p, m, now) {
  const c = CLASSES[p.cls], r = Math.random();
  const kneel = p.hp < p.maxHp * KNEEL_HP;
  p.nextAtk = now + c.atkMs * (buffOn(p, 'agile') ? 0.5 : 1) * (kneel ? 1.5 : 1) * (1 - Math.min(0.4, treeEff(p, 'aspd')));
  if (kneel) { if (p.cls === 'knight') { const { dmg, crit } = roll(p, 1); anim('p', p, 'swing', m.x, m.y); hitRolled(p, m, dmg, crit, 180, 0); } else { const kind = p.cls === 'archer' ? 'arrow' : 'bolt', d = flight(p.x, p.y, m.x, m.y) + 180; anim('p', p, p.cls === 'archer' ? 'shoot' : 'bolt', m.x, m.y, { proj: kind, d }); hitMonster(p, m, 1, d); } return; }
  if (p.cls === 'knight') {
    const { dmg, crit } = roll(p, 1);
    if (dmg >= m.hp && r < 0.6) { anim('p', p, 'execute', m.x, m.y); hitRolled(p, m, Math.max(dmg, m.hp), true, 380, 1); return; }   // golpe na cabeça: termina o inimigo
    if (r < 0.25 && dist(p.x, p.y, m.x, m.y) < 1.25) {                                                                              // chute: empurra 1 tile
      anim('p', p, 'kick', m.x, m.y); hitRolled(p, m, dmg, crit, 260, 0);
      const dx = m.x - p.x, dy = m.y - p.y, l = Math.hypot(dx, dy) || 1, nx = m.x + dx / l, ny = m.y + dy / l;
      if (S.monsters[m.id] && monStand(nx, ny, m)) { m.x = nx; m.y = ny; m.stunUntil = Math.max(m.stunUntil, now + 500); }
      return;
    }
    anim('p', p, 'swing', m.x, m.y); hitRolled(p, m, dmg, crit, 180, 0); return;
  }
  const kind = p.cls === 'archer' ? 'arrow' : 'bolt', base = p.cls === 'archer' ? 'shoot' : 'bolt', d = flight(p.x, p.y, m.x, m.y) + (p.cls === 'archer' ? 200 : 150);
  if (r < 0.25) {
    if (p.cls === 'archer') { anim('p', p, 'quiver', m.x, m.y, { proj: kind, d: d + 260 }); hitMonster(p, m, 1.25, d + 260); return; }     // flecha do quiver: +25%
    const n = Object.values(S.monsters).filter(q => q !== m && dist(q.x, q.y, m.x, m.y) <= 1.8).sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y))[0];
    anim('p', p, 'dualcast', m.x, m.y, { proj: kind, d }); hitMonster(p, m, 1, d);                                                          // duas mãos: acerta um vizinho
    if (n) { shot(p, kind, n.x, n.y, d, 60); hitMonster(p, n, 0.6, d + 60); }
    return;
  }
  if (r < 0.5) {
    const back = monBehind(p, m, c.range);
    if (back) {                                                                                                                            // giro de 180°: segundo alvo atrás
      const a = p.cls === 'archer' ? 'turnshot' : 'turncast', ms = 950;
      anim('p', p, a, m.x, m.y, { proj: kind, d }); hitMonster(p, m, 1, d);
      const d2 = flight(p.x, p.y, back.x, back.y) + 120; shot(p, kind, back.x, back.y, d2, ms * 0.62); hitMonster(p, back, 0.8, ms * 0.62 + d2);
      return;
    }
  }
  anim('p', p, base, m.x, m.y, { proj: kind, d }); hitMonster(p, m, 1, d);
}

// ---------------- habilidades ----------------
function useSkill(p, i, msg) {
  const sk = SKILLS[p.cls][i], now = now_();
  p._el = sk.el; setTimeout(() => { p._el = null; }, 0); if (p.cls === 'mage') useGain(p, 'magic', 2);
  if (!sk || p.casting || p.carrying) return;
  if (now < (p.cds[i] || 0)) return;
  if (p.mp < sk.mp) { tell(p, 'Mana insuficiente.'); return; }
  if (p.hp < p.maxHp * KNEEL_HP) { tell(p, 'De joelhos, sem forças para isso.'); return; }
  let m = null;
  if (sk.tgt) {
    m = S.monsters[p.target];
    if (!m) { tell(p, 'Selecione um alvo.'); return; }
    if (dist(p.x, p.y, m.x, m.y) > sk.range + (MON[m.type].rad || 0)) { tell(p, 'Alvo fora de alcance.'); return; }
  }
  const offensive = !['heal', 'wall', 'agile', 'windstep', 'bloom', 'faith', 'spring'].includes(sk.id);

  p.mp -= sk.mp; p.cds[i] = now + sk.cd;
  if (sk.cast) {
    p.casting = { i, until: now + sk.cast * (1 - Math.min(0.5, treeEff(p, 'castSpeed'))), tid: m && m.id }; p.castX = p.x; p.castY = p.y;
    near(p.x, p.y, { t: 'cast', id: p.id, ms: sk.cast, s: sk.name, el: sk.el });
  } else if (execSkill(p, i, m, msg) === false) { p.mp += sk.mp; p.cds[i] = 0; }   /* a magia não pegou (ex.: sem grama): devolve a mana */
  sendStat(p);
}
// ---------- magias base do Pentagrama ----------
// ---------- Chamas: lança-chamas contínuo (segurando a tecla 1); alcance e dano crescem em curva acelerada com teto ----------
function flameStats(p) {
  const T = p.tree || {}, pts = (T.w_flame || 0) + (T.w_focus || 0), L = (p.lvl || 1) + pts * 2 + (typeof useBonus === 'function' ? useBonus(p, 'el_fire') : 0) * 20;
  const sig = x => 1 / (1 + Math.exp(-(x - 15) / 5)), k = Math.min(1.15, Math.max(0, (sig(L) - sig(1)) / (sig(30) - sig(1))));
  return { R: 2.5 + 3.5 * k, F: 1 + 5 * k, k };
}
function flameStop(p, why) { if (!p.flame) return; p.flame = null; near(p.x, p.y, { t: 'flamefx', id: p.id, on: 0 }); if (why) tell(p, why); }
function flameMsg(p, m) {
  if (p.cls !== 'mage' || p.downed || p.carriedBy || p.bound || p.bath) { flameStop(p); return; }
  if (!m.on) { flameStop(p); return; }
  const now = now_(); if (!p.flame) { if ((p.mp || 0) < 2) { tell(p, 'Mana insuficiente.'); return; } p.flame = { t0: now, tick: now, hit: now - 300, fx: 0 }; useGain(p, 'el_fire', 1); anim('p', p, 'castup', p.x, p.y, { s: 'Chamas!' }); }
  p.flame.a = +m.a || 0; p.flame.last = now; p.dir = dirFromVecS(Math.cos(p.flame.a), Math.sin(p.flame.a));
}
function flameTick(now) {
  for (const p of Object.values(S.players)) { const F = p.flame; if (!F) continue;
    if (p.downed || p.cls !== 'mage' || now - (F.last || 0) > 700) { flameStop(p); continue; }
    const dt = (now - F.tick) / 1000; if (dt < 0.1) continue; F.tick = now;
    p.mp -= 6 * Math.min(dt, 0.4); if (p.mp <= 0) { p.mp = 0; flameStop(p, 'Sem mana: as chamas se apagam.'); sendStat(p); continue; }
    const st = flameStats(p), ca = Math.cos(F.a), sa = Math.sin(F.a);
    if (now - F.fx > 260) { F.fx = now; near(p.x, p.y, { t: 'flamefx', id: p.id, on: 1, a: +F.a.toFixed(3), r: +st.R.toFixed(2), fs: Math.round(elemStrength(p, 'fire')) }); }   /* força do Fogo: a cor passa do azul ao verde e ao roxo */
    if (now - F.hit >= 450) { F.hit = now; if (typeof entFlameHit === 'function') entFlameHit(p, F, st, now);
      for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || (m.alt || 0) > 1) continue; const d0 = MON[m.type] || {}, dx = m.x - p.x, dy = m.y - p.y, along = dx * ca + dy * sa; if (along < 0.2 || along > st.R + (d0.rad || 0)) continue; if (Math.abs(-dx * sa + dy * ca) > 0.35 + along * 0.18 + (d0.rad || 0) * 0.5) continue;
        p._el = 'fire'; hitMonster(p, m, 0.12 * st.F * (1 + treeEff(p, 'fire')), 0); p._el = null; useGain(p, 'el_fire', 0.25);
        if (!(m._burnT > now) && S.monsters[m.id]) { m._burnT = now + 3000; emberBurn(p, m); }   /* fica ardendo */
        if (d0.beh === 'flee' || d0.beh === 'pred' || d0.beh === 'retal') { m.flee = { from: p.id, until: now + 2500 }; if (m.aggro === p.id) m.aggro = null; m.atk = null; } }   /* animais fogem do fogo */
      if (p.pplAuto) { const inJet = q => { const dx = q.x - p.x, dy = q.y - p.y, al = dx * ca + dy * sa; return al > 0.2 && al < st.R + 0.3 && Math.abs(-dx * sa + dy * ca) < 0.55 + al * 0.18; };
        for (const q of Object.values(S.players)) { if (!pvpOk(p, q) || (q.duel && q.duel !== p.duel) || !inJet(q)) continue; if (inSafe(q.x, q.y)) witnessCrime(p, p.x, p.y); q._hitBy = { k: 'p', id: p.id, t: now }; damagePlayer(q, Math.max(1, Math.round(roll(p, 0.35).dmg * 0.6)), { x: p.x, y: p.y, name: p.name }, 0, null, null); if (!(q.burnUntil > now)) q.burnUntil = now + 2500; sendStat(q); }
        for (const q of Object.values(S.npcs)) { if (q.dead || q.downed || q.entOf || (q.fl || 0) !== (p.fl || 0) || !inJet(q)) continue; npcDamage(q, Math.max(1, Math.round(roll(p, 0.35).dmg * 0.6)), p); near(q.x, q.y, { t: 'mburn', id: q.id, npc: 1, ms: 1500 }); } }
      for (const d of (S.doused || []).slice()) { const ddx = d.x - p.x, ddy = d.y - p.y, al = ddx * ca + ddy * sa; if (al > 0 && al < st.R && Math.abs(-ddx * sa + ddy * ca) < 0.7 && WORLD.obj[d.i] === O.NONE) { setObj(d.i, O.CAMPFIRE); (S.objBack = S.objBack || []).push({ i: d.i, o: O.NONE, at: now + 180000 }); S.doused.splice(S.doused.indexOf(d), 1); tell(p, 'As chamas acenderam a fogueira.'); } }
      if (Math.random() < 0.35) { const tx = p.x + ca * st.R * 0.9, ty = p.y + sa * st.R * 0.9, list = []; igniteTile(tx, ty, now, list, false); if (list.length) near(tx, ty, { t: 'fires', l: list }); }   /* o mato pode pegar fogo */
      sendStat(p); }
  }
}
// ---------- evoluções do Ar e da Luz (liberadas pela força do elemento; trocam a magia base na tecla) ----------
function douseTile(x, y, list) { const i = y * MAP_W + x; if (!S.burn || !S.burn[i]) return; delete S.burn[i]; S.burnN = Math.max(0, (S.burnN || 1) - 1); S.burnt = S.burnt || {}; S.burnt[i] = now_() + 90000; S.fires = (S.fires || []).filter(f => !(Math.round(f.x) === x && Math.round(f.y) === y)); list.push([x, y]); }
/* Névoa: quem está dentro some da vista dos bichos (menos de quem encosta) e o fogo da roupa apaga */
function inMist(q, m) { if (!q) return false; const now = now_(); if (m && m.sandUntil > now && dist(m.x, m.y, q.x, q.y) > 2) return true;   /* Tempestade de Areia: o bicho não enxerga longe */
  if (!S.mists || !S.mists.length) return false; for (const w of S.mists) { if (w.until < now || (q.fl || 0) !== w.fl || dist(q.x, q.y, w.x, w.y) > w.r) continue; return !m || dist(m.x, m.y, q.x, q.y) > 1.4; } return false; }
// ---------- magias combinadas (centro do Pentagrama): campos no chão que agem a cada instante ----------
const isUndead = m => { const d = MON[m.type] || {}; return m.type === 'skeleton' || d.base === 'skeleton'; };
function fieldAt(q, k) { const L = S.cfields; if (!L || !L.length || !q) return null; const now = now_(); for (const f of L) if (f.k === k && f.until > now && (q.fl || 0) === f.fl && dist(q.x, q.y, f.x, f.y) <= f.r) return f; return null; }
function comboSkill(p, msg) {
  const ci = msg.c | 0, C = MAGE_COMBOS[ci]; if (!C || p.cls !== 'mage') return;
  if (!treeHas(p, C.id)) { tell(p, 'Aprenda ' + C.n + ' no centro do Pentagrama (K).'); return; }
  if (elemStrength(p, C.a) < COMBO_NEED || elemStrength(p, C.b) < COMBO_NEED) { tell(p, C.n + ': precisa de força ' + COMBO_NEED + ' nos dois elementos.'); return; }
  const now = now_(), key = 'c' + ci; p.tcd = p.tcd || {};
  if (p.downed || p.carrying || p.lifted || p.grabbed || now < (p.stunUntil || 0) || now < (p.knockUntil || 0)) return;
  if (now < (p.tcd[key] || 0)) { tell(p, C.n + ': recarregando (' + Math.ceil((p.tcd[key] - now) / 1000) + 's).'); return; }
  if (p.mp < C.mp) { tell(p, 'Mana insuficiente.'); return; }
  const a = isFinite(+msg.a) ? +msg.a : (p.fa || 0), fl = p.fl || 0, B = (useBonus(p, 'el_' + C.a) + useBonus(p, 'el_' + C.b)) / 2, shout = { s: C.n + '!' };
  let tx = +msg.tx, ty = +msg.ty; if (!isFinite(tx) || !isFinite(ty) || dist(p.x, p.y, tx, ty) > 8.5) { tx = p.x + Math.cos(a) * 4; ty = p.y + Math.sin(a) * 4; }
  const F = o => { const f = Object.assign({ k: C.id, x: tx, y: ty, fl, by: p.id, B, t: now, until: now + o.ms }, o); S.cfields = (S.cfields || []).filter(q => !(q.by === p.id && q.k === C.id)); S.cfields.push(f); return f; };   /* lançar de novo troca o campo antigo */
  const douse = (x, y, r) => { const put = []; for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) if (dist(xx, yy, x, y) <= r) douseTile(xx, yy, put); if (put.length) near(x, y, { t: 'fireout', l: put }); };
  switch (C.id) {
    case 'c_tornado': { const sx = p.x + Math.cos(a) * 1.2, sy = p.y + Math.sin(a) * 1.2; F({ x: sx, y: sy, a, v: 1.3, r: 2.5, ms: 6000 }); anim('p', p, 'cast', sx, sy, shout); evoFx(p, { k: C.id, sx, sy, a, v: 1.3, ms: 6000 }); break; }
    case 'c_dome': F({ x: p.x, y: p.y, r: 3.5 + B, ms: 8000 }); anim('p', p, 'castup', p.x, p.y, shout); evoFx(p, { k: C.id, r: 3.5 + B, ms: 8000 }); break;
    case 'c_steam': F({ r: 3 + B, ms: 8000 }); S.mists = (S.mists || []).filter(w => w.until > now); S.mists.push({ x: tx, y: ty, fl, r: 3 + B, until: now + 8000, by: p.id }); anim('p', p, 'cast', tx, ty, shout); evoFx(p, { k: C.id, tx, ty, r: 3 + B, ms: 8000 }); break;
    case 'c_embers': F({ r: 3 + B, ms: 10000 }); anim('p', p, 'cast', tx, ty, shout); evoFx(p, { k: C.id, tx, ty, r: 3 + B, ms: 10000 }); break;
    case 'c_sflame': F({ fol: 1, x: p.x, y: p.y, r: 3 + B, ms: 8000 }); anim('p', p, 'castup', p.x, p.y, shout); evoFx(p, { k: C.id, r: 3 + B, ms: 8000 }); break;
    case 'c_mud': F({ r: 3.5 + B, ms: 10000, seen: {} }); douse(tx, ty, 3.5 + B); anim('p', p, 'cast', tx, ty, shout); evoFx(p, { k: C.id, tx, ty, r: 3.5 + B, ms: 10000 }); break;
    case 'c_storm': F({ r: 4 + B, ms: 8000 }); douse(tx, ty, 4 + B); anim('p', p, 'castup', tx, ty, shout); evoFx(p, { k: C.id, tx, ty, r: 4 + B, ms: 8000 }); break;
    case 'c_hwater': { const R = 4 + B, hb = 1 + treeEff(p, 'holy') + useBonus(p, 'el_holy');
      for (const q of Object.values(S.players)) { if ((q.fl || 0) !== fl || dist(q.x, q.y, p.x, p.y) > R || q.downed) continue; const had = q.infect || BODY_PARTS.some(k => q.bleed && q.bleed[k] > 0); q.infect = 0; q.infT = 0; if (q.bleed) for (const k in q.bleed) q.bleed[k] = 0; if (q.burnUntil > now) extinguish(q, 'A Água Benta apagou o fogo da sua roupa.');
        const h = Math.round(q.maxHp * 0.15 * hb); q.hp = Math.min(q.maxHp, q.hp + h); sfx(q.x, q.y, '+' + h, '#bfe6ff', 150); if (had) tell(q, 'A Água Benta limpou as suas feridas.'); sendStat(q); }
      for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || !isUndead(m) || dist(m.x, m.y, p.x, p.y) > R + (MON[m.type].rad || 0)) continue; p._el = 'holy'; hitMonster(p, m, 1.5 * (1 + B), 150); p._el = null; }
      douse(p.x, p.y, R); anim('p', p, 'castup', p.x, p.y, shout); evoFx(p, { k: C.id, r: R, ms: 1600 }); break; }
    case 'c_sand': F({ fol: 1, x: p.x, y: p.y, r: 4 + B, ms: 8000 }); anim('p', p, 'castup', p.x, p.y, shout); evoFx(p, { k: C.id, r: 4 + B, ms: 8000 }); break;
    case 'c_grove': F({ x: p.x, y: p.y, r: 3.5 + B, ms: 20000 }); anim('p', p, 'kneelput', p.x, p.y, shout); evoFx(p, { k: C.id, r: 3.5 + B, ms: 20000 }); break;
    default: return;
  }
  p.mp -= C.mp; p.tcd[key] = now + C.cd; p.lastCombat = now; useGain(p, 'magic', 2); useGain(p, 'el_' + C.a, 2); useGain(p, 'el_' + C.b, 2); sendStat(p);
}
function comboTick(now) {
  const L = S.cfields; if (!L || !L.length) return; S.cfields = L.filter(f => f.until > now && S.players[f.by]);
  for (const f of S.cfields) { const p = S.players[f.by]; if (f.fol) { f.x = p.x; f.y = p.y; f.fl = p.fl || 0; }
    const dt = Math.min(0.3, (now - (f.lt || now)) / 1000); f.lt = now;
    const mons = (r) => Object.values(S.monsters).filter(m => m.hp > 0 && (m.alt || 0) <= 1 && dist(m.x, m.y, f.x, f.y) <= (r || f.r) + (MON[m.type].rad || 0));
    const hit = (m, mult, el) => { p._el = el; hitMonster(p, m, mult * (1 + f.B), 0); p._el = null; return !!S.monsters[m.id]; };
    const burn = m => { if (!(m._burnT > now)) { m._burnT = now + 3000; emberBurn(p, m); } };
    const allies = () => Object.values(S.players).filter(q => (q.fl || 0) === f.fl && !q.downed && dist(q.x, q.y, f.x, f.y) <= f.r);
    if (f.k === 'c_tornado') { f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt;   /* anda e puxa para o olho */
      for (const m of mons()) { if (MON[m.type].big) continue; const d = dist(m.x, m.y, f.x, f.y); if (d < 0.5) continue; const st = Math.min(d - 0.4, 2.4 * dt), ux = (f.x - m.x) / d, uy = (f.y - m.y) / d; for (let s = 0; s < 4; s++) { const nx = m.x + ux * st / 4, ny = m.y + uy * st / 4; if (!monStand(nx, ny, m)) break; m.x = nx; m.y = ny; } } }
    if (f.k === 'c_dome') for (const m of mons(f.r - 0.3)) { if (MON[m.type].big || now < (m._domeT || 0)) continue; m._domeT = now + 900; const d = dist(m.x, m.y, f.x, f.y) || 0.01, ux = (m.x - f.x) / d, uy = (m.y - f.y) / d, push = f.r + 0.8 - d; for (let s = 0; s < 12; s++) { const nx = m.x + ux * push / 12, ny = m.y + uy * push / 12; if (!monStand(nx, ny, m)) break; m.x = nx; m.y = ny; } knockMon(m, { x: f.x, y: f.y }, now); m.atk = null; }
    if (now < f.t) continue;
    switch (f.k) {
      case 'c_tornado': f.t = now + 500; for (const m of mons(1.3)) { if (hit(m, 0.5, 'fire')) burn(m); } if (Math.random() < 0.5) { const list = []; igniteTile(f.x, f.y, now, list, false); if (list.length) near(f.x, f.y, { t: 'fires', l: list }); } break;
      case 'c_steam': f.t = now + 1000; for (const m of mons()) { if (hit(m, 0.35, 'fire')) m.wetUntil = now + 8000; } break;
      case 'c_embers': f.t = now + 1000; for (const m of mons()) { m.fslowUntil = now + 1300; m.fslowK = 0.6; if (hit(m, 0.3, 'fire')) burn(m); } break;
      case 'c_sflame': { f.t = now + 1000; const hb = 1 + treeEff(p, 'holy') + useBonus(p, 'el_holy');
        for (const q of allies()) { const h = Math.round(q.maxHp * 0.04 * hb); if (q.hp < q.maxHp) { q.hp = Math.min(q.maxHp, q.hp + h); sfx(q.x, q.y, '+' + h, '#f0d878', 0); } q.cold = Math.max(0, (q.cold || 0) - 15); sendStat(q); }
        for (const m of mons()) hit(m, isUndead(m) ? 0.8 : 0.4, 'holy'); break; }
      case 'c_mud': f.t = now + 400; for (const m of mons()) { const big = MON[m.type].big; if (!f.seen[m.id]) { f.seen[m.id] = 1; if (!big) { m.stunUntil = Math.max(m.stunUntil || 0, now + 3000); m.atk = null; m.nextAtk = Math.max(m.nextAtk || 0, now + 3200); near(m.x, m.y, { t: 'mmud', id: m.id, ms: 3000 }); } }
          m.fslowUntil = now + 900; m.fslowK = 0.4; m.wetUntil = now + 8000; if (m._burnT > now) m._burnT = 0; }
        for (const q of allies()) if (q.burnUntil > now) extinguish(q, 'A lama apagou o fogo da sua roupa.'); break;
      case 'c_storm': { f.t = now + 1000; const ms = mons();
        if (ms.length) { const m = ms[Math.floor(Math.random() * ms.length)], wet = m.wetUntil > now; near(m.x, m.y, { t: 'evofx', id: p.id, x: m.x, y: m.y, k: 'bolt', ms: 450 }, VIEW_RADIUS + 4); if (hit(m, 1.2 * (wet ? 1.5 : 1), 'water')) { m.stunUntil = Math.max(m.stunUntil || 0, now + 1000); m.atk = null; m.nextAtk = Math.max(m.nextAtk || 0, now + 1200); } }
        else if (Math.random() < 0.5) { const an = Math.random() * 6.283, rr = Math.random() * f.r; near(f.x, f.y, { t: 'evofx', id: p.id, x: f.x + Math.cos(an) * rr, y: f.y + Math.sin(an) * rr, k: 'bolt', ms: 450 }, VIEW_RADIUS + 4); }
        for (const m of ms) { if (S.monsters[m.id]) { m.wetUntil = now + 8000; if (m._burnT > now) m._burnT = 0; } } for (const q of allies()) if (q.burnUntil > now) extinguish(q, 'A chuva apagou o fogo da sua roupa.'); break; }
      case 'c_sand': f.t = now + 400; for (const m of mons()) { m.sandUntil = now + 900; const q = m.aggro && S.players[m.aggro]; if (q && dist(m.x, m.y, q.x, q.y) > 2) { m.aggro = null; m.atk = null; m.lostAt = 0; } } break;
      case 'c_grove': { f.t = now + 1000; const hb = 1 + treeEff(p, 'holy') + useBonus(p, 'el_holy');
        for (const q of allies()) { if (q.walking && !q.sit) continue; const h = Math.round(q.maxHp * 0.05 * hb); if (q.hp < q.maxHp) { q.hp = Math.min(q.maxHp, q.hp + h); sfx(q.x, q.y, '+' + h, '#bfe59a', 0); } q.cst = Math.min(cstMaxOf(q), (q.cst ?? 0) + cstMaxOf(q) * 0.05); sendStat(q); }
        for (const m of mons(f.r + 1)) { const d = MON[m.type]; if (!d || !d.beh) continue; m.calmUntil = now + 2600; m.aggro = null; m.atk = null; m.flee = null; } break; }
      default: f.t = now + 1000;
    }
  }
}
function mistTick(now) { if (!S.mists || !S.mists.length) return; S.mists = S.mists.filter(w => w.until > now); for (const q of Object.values(S.players)) if (q.burnUntil > now && inMist(q)) extinguish(q, 'A Névoa fresca apagou o fogo da sua roupa.'); }
function evoFx(p, m) { near(p.x, p.y, Object.assign({ t: 'evofx', id: p.id, x: p.x, y: p.y }, m), VIEW_RADIUS + 4); }
function mageEvo(p, nd, msg, now) {
  const a = isFinite(+msg.a) ? +msg.a : (p.fa || 0), shout = { s: nd.name + '!' }, fl = p.fl || 0;
  if (nd.id === 'w_gust') { const R = 4 + useBonus(p, 'el_wind') * 3; let n = 0;   /* Rajada: leque que empurra e derruba */
    spellNpcs(p, n => { const dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy); return d <= R && d >= 0.01 && Math.abs(angDiff(Math.atan2(dy, dx), a)) <= 0.62; }, 0.4, 'air');
    for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || (m.alt || 0) > 1) continue; const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy); if (d > R || d < 0.01 || Math.abs(angDiff(Math.atan2(dy, dx), a)) > 0.62) continue;
      const big = MON[m.type] && MON[m.type].big, push = (big ? 0.8 : 2.6) * (1 - d / R * 0.5), pa = Math.atan2(dy, dx); for (let s = 0; s < 12; s++) { const nx = m.x + Math.cos(pa) * push / 12, ny = m.y + Math.sin(pa) * push / 12; if (!monStand(nx, ny, m)) break; m.x = nx; m.y = ny; }
      if (!big) knockMon(m, p, now); hitMonster(p, m, 0.4, 150); n++; }
    anim('p', p, 'castup', p.x + Math.cos(a), p.y + Math.sin(a), shout); evoFx(p, { k: 'gust', a, r: R }); useGain(p, 'el_wind', 2 + Math.min(3, n)); return true; }
  /* evoluções da Terra */
  if (nd.id === 'w_stone') { p.stoneSk = now + 8000; anim('p', p, 'castup', p.x, p.y, shout); evoFx(p, { k: 'stone', ms: 8000 }); useGain(p, 'el_earth', 2); return true; }
  if (nd.id === 'w_thorns') { const B = useBonus(p, 'el_earth'), L = 7 + B * 2, ca = Math.cos(a), sa = Math.sin(a); let n = 0;
    spellNpcs(p, n => { const dx = n.x - p.x, dy = n.y - p.y, al = dx * ca + dy * sa; return al >= 0.3 && al <= L && Math.abs(-dx * sa + dy * ca) <= 0.8; }, 1.0, 'earth');
    for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || (m.alt || 0) > 1) continue; const dx = m.x - p.x, dy = m.y - p.y, al = dx * ca + dy * sa; if (al < 0.3 || al > L || Math.abs(-dx * sa + dy * ca) > 0.8 + (MON[m.type].rad || 0)) continue;
      n++; const id = m.id; setTimeout(() => { const q = S.monsters[id], pp = S.players[p.id]; if (!q || !pp || q.hp <= 0) return; const big = MON[q.type] && MON[q.type].big, ms = big ? 1200 : 2500, t2 = now_(); q.stunUntil = Math.max(q.stunUntil || 0, t2 + ms); q.atk = null; q.nextAtk = Math.max(q.nextAtk || 0, t2 + ms + 200);
        pp._el = 'earth'; hitMonster(pp, q, 1.0 * (1 + B), 0); pp._el = null; if (S.monsters[id]) near(q.x, q.y, { t: 'mroot', id, ms });
        for (let k = 1; k <= 3; k++) setTimeout(() => { const r = S.monsters[id], p2 = S.players[p.id]; if (!r || !p2 || r.hp <= 0) return; p2._el = 'earth'; hitMonster(p2, r, 0.15 * (1 + B), 0); p2._el = null; }, k * 900); }, Math.round(al * 85)); }
    anim('p', p, 'cast', p.x + ca, p.y + sa, shout); evoFx(p, { k: 'thorns', a, r: L, ms: Math.round(L * 85) + 1300 }); useGain(p, 'el_earth', 2 + Math.min(3, n)); return true; }
  if (nd.id === 'w_quake') { const B = useBonus(p, 'el_earth'), R = 4.5 + B * 1.5; let n = 0;
    spellNpcs(p, n => dist(n.x, n.y, p.x, p.y) <= R, 1.8, 'earth');
    for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || (m.alt || 0) > 1) continue; const d = dist(m.x, m.y, p.x, p.y); if (d > R + (MON[m.type].rad || 0)) continue; const big = MON[m.type] && MON[m.type].big, ms = big ? 1000 : 2000;
      p._el = 'earth'; hitMonster(p, m, 1.8 * (1 + B) * (1 - Math.min(1, d / R) * 0.4), 0); p._el = null; if (!S.monsters[m.id]) continue; if (!big) knockMon(m, p, now); m.stunUntil = Math.max(m.stunUntil || 0, now + ms); m.atk = null; m.nextAtk = Math.max(m.nextAtk || 0, now + ms + 200); n++; }
    for (const q of Object.values(S.players)) { if (q === p || q.downed || q.dev || (q.fl || 0) !== (p.fl || 0) || dist(q.x, q.y, p.x, p.y) > R) continue; if (pvpOk(p, q)) { if (inSafe(q.x, q.y)) witnessCrime(p, p.x, p.y); damagePlayer(q, Math.round(p.lvl * 1.5 + 10), { x: p.x, y: p.y, name: p.name }, 0, 'legL'); sendStat(q); } }
    anim('p', p, 'castup', p.x, p.y, shout); near(p.x, p.y, { t: 'shake', s: 12 }, R + 10); evoFx(p, { k: 'quake', r: R, ms: 2600 }); useGain(p, 'el_earth', 3 + Math.min(3, n)); return true; }
  /* evoluções do Fogo */
  if (nd.id === 'w_sparks') { const B = useBonus(p, 'el_fire'), R = 7 + B * 2, N = 5 + Math.round(B * 2), ends = []; let n = 0;
    for (let i = 0; i < N; i++) { const aa = a + (i / (N - 1) - 0.5) * 0.7, ca = Math.cos(aa), sa = Math.sin(aa); let tgt = null, best = 1e9;
      for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || (m.alt || 0) > 1) continue; const dx = m.x - p.x, dy = m.y - p.y, al = dx * ca + dy * sa; if (al < 0.3 || al > R || al >= best) continue; if (Math.abs(-dx * sa + dy * ca) > 0.45 + (MON[m.type].rad || 0)) continue; best = al; tgt = m; }
      if (!tgt) spellNpcs(p, n => { const dx = n.x - p.x, dy = n.y - p.y, al = dx * ca + dy * sa; return al >= 0.3 && al <= R && Math.abs(-dx * sa + dy * ca) <= 0.5; }, 0.7, 'fire', null, 1);   /* sem monstro na linha: a faísca acerta o NPC mais perto */
      const ex = tgt ? tgt.x : p.x + ca * R, ey = tgt ? tgt.y : p.y + sa * R, dl = Math.round(dist(p.x, p.y, ex, ey) * 60); ends.push([+ex.toFixed(2), +ey.toFixed(2)]);
      if (tgt) { n++; const id = tgt.id; setTimeout(() => { const m = S.monsters[id], pp = S.players[p.id]; if (!m || !pp || m.hp <= 0) return; pp._el = 'fire'; hitMonster(pp, m, 0.7 * (1 + B), 0); pp._el = null; if (S.monsters[id] && !(m._burnT > now_())) { m._burnT = now_() + 3000; emberBurn(pp, m); } }, dl); }
      else if (Math.random() < 0.5) setTimeout(() => { const list = []; igniteTile(ex, ey, now_(), list, false); if (list.length) near(ex, ey, { t: 'fires', l: list }); }, dl); }
    anim('p', p, 'cast', p.x + Math.cos(a), p.y + Math.sin(a), shout); evoFx(p, { k: 'sparks', l: ends, ms: 900 }); useGain(p, 'el_fire', 1 + Math.min(3, n)); return true; }
  if (nd.id === 'w_fireball') { let tx = +msg.tx, ty = +msg.ty; if (!isFinite(tx) || !isFinite(ty) || dist(p.x, p.y, tx, ty) > 9.5) { tx = p.x + Math.cos(a) * 7; ty = p.y + Math.sin(a) * 7; } const d = Math.round(500 + dist(p.x, p.y, tx, ty) * 170), R = 3.5 + useBonus(p, 'el_fire');
    anim('p', p, 'castup', tx, ty, shout); evoFx(p, { k: 'bigball', tx, ty, d, ms: d + 150 }); setTimeout(() => bigFireBoom(p, tx, ty, R), d); useGain(p, 'el_fire', 3); return true; }
  if (nd.id === 'w_meteor') { let tx = +msg.tx, ty = +msg.ty; if (!isFinite(tx) || !isFinite(ty) || dist(p.x, p.y, tx, ty) > 9.5) { tx = p.x + Math.cos(a) * 5; ty = p.y + Math.sin(a) * 5; } const B = useBonus(p, 'el_fire'), R = 3.5 + B, N = 9 + Math.round(B * 3), l = [];
    for (let i = 0; i < N; i++) { const an = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * R, mx = +(tx + Math.cos(an) * rr).toFixed(2), my = +(ty + Math.sin(an) * rr).toFixed(2), dl = 300 + i * Math.round(2700 / N); l.push([mx, my, dl]); setTimeout(() => meteorHit(p, mx, my, B), dl + 650); }
    anim('p', p, 'castup', tx, ty, shout); evoFx(p, { k: 'meteor', tx, ty, r: R, l, ms: 300 + 2700 + 1300 }); useGain(p, 'el_fire', 3); return true; }
  /* evoluções da Água */
  if (nd.id === 'w_mist') { S.mists = (S.mists || []).filter(w => w.until > now); const r = 3 + useBonus(p, 'el_water') * 1.5; S.mists.push({ x: p.x, y: p.y, fl, r, until: now + 10000, by: p.id }); for (const m of Object.values(S.monsters)) { if (m.aggro && S.players[m.aggro] && inMist(S.players[m.aggro], m)) { m.aggro = null; m.atk = null; m.lostAt = 0; } }
    anim('p', p, 'castup', p.x, p.y, shout); evoFx(p, { k: 'mist', r, ms: 10000 }); useGain(p, 'el_water', 2); return true; }
  if (nd.id === 'w_tide') { const L = 6 + useBonus(p, 'el_water') * 2, W = 1.3, ca = Math.cos(a), sa = Math.sin(a); let n = 0;
    spellNpcs(p, n => { const dx = n.x - p.x, dy = n.y - p.y, al = dx * ca + dy * sa; return al >= 0.2 && al <= L && Math.abs(-dx * sa + dy * ca) <= W; }, 0.5, 'water');
    for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || (m.alt || 0) > 1) continue; const dx = m.x - p.x, dy = m.y - p.y, al = dx * ca + dy * sa, side = Math.abs(-dx * sa + dy * ca); if (al < 0.2 || al > L || side > W + (MON[m.type].rad || 0)) continue;
      const big = MON[m.type] && MON[m.type].big, push = big ? 0.9 : 3.2; for (let s = 0; s < 16; s++) { const nx = m.x + ca * push / 16, ny = m.y + sa * push / 16; if (!monStand(nx, ny, m)) break; m.x = nx; m.y = ny; }
      if (!big) knockMon(m, p, now); m.wetUntil = now + 8000; if (m._burnT > now) m._burnT = 0; p._el = 'water'; hitMonster(p, m, 0.5 * (1 + useBonus(p, 'el_water')), 200); p._el = null; n++; }
    for (const q of Object.values(S.players)) { if ((q.fl || 0) !== fl) continue; const dx = q.x - p.x, dy = q.y - p.y, al = dx * ca + dy * sa; if (al < -0.5 || al > L || Math.abs(-dx * sa + dy * ca) > W) continue; if (q.burnUntil > now) extinguish(q, 'A Correnteza apagou o fogo da sua roupa.'); }
    { const put = []; for (let d = 0.5; d <= L; d += 0.5) for (const o of [-1, 0, 1]) { const tx = Math.round(p.x + ca * d - sa * o), ty = Math.round(p.y + sa * d + ca * o); if (typeof douseTile === 'function') douseTile(tx, ty, put); } if (put.length) near(p.x, p.y, { t: 'fireout', l: put }); }
    anim('p', p, 'cast', p.x + ca, p.y + sa, shout); evoFx(p, { k: 'tide', a, r: L }); useGain(p, 'el_water', 2 + Math.min(3, n)); return true; }
  if (nd.id === 'w_frost') { let tx = +msg.tx, ty = +msg.ty; if (!isFinite(tx) || !isFinite(ty) || dist(p.x, p.y, tx, ty) > 7.5) { tx = p.x + Math.cos(a) * 4; ty = p.y + Math.sin(a) * 4; } const R = 2.5 + useBonus(p, 'el_water'); let n = 0;
    spellNpcs(p, n => dist(n.x, n.y, tx, ty) <= R, 0.6, 'water', n => { n.stunUntil = now + 3000; });
    for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || dist(m.x, m.y, tx, ty) > R + (MON[m.type].rad || 0)) continue; const big = MON[m.type] && MON[m.type].big, ms = big ? 2000 : 4000; m.stunUntil = Math.max(m.stunUntil || 0, now + ms); m.frozenUntil = now + ms; m.atk = null; m.nextAtk = Math.max(m.nextAtk || 0, now + ms + 200); if (m._burnT > now) m._burnT = 0;
      p._el = 'water'; hitMonster(p, m, 0.6 * (1 + useBonus(p, 'el_water')) * (m.wetUntil > now ? 1.5 : 1), 0); p._el = null; if (S.monsters[m.id]) near(m.x, m.y, { t: 'mfrost', id: m.id, ms }); n++; }
    anim('p', p, 'cast', tx, ty, shout); evoFx(p, { k: 'frost', tx, ty, r: R, ms: 4200 }); useGain(p, 'el_water', 2 + Math.min(3, n)); return true; }
  if (nd.id === 'w_shield') { p.windSh = now + 8000; anim('p', p, 'castup', p.x, p.y, shout); evoFx(p, { k: 'wshield', ms: 8000 }); useGain(p, 'el_wind', 2); return true; }
  if (nd.id === 'w_glide') { p.dodgeUntil = now + 1150; p.dodgeAllow = now + 1500; p.parry = null; if (p.atk && !p.atk.done) p.atk = null; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'glide', ms: 1100 }); evoFx(p, { k: 'glide', a, ms: 1100 }); useGain(p, 'el_wind', 2); if (p.burnUntil > now) extinguish(p, 'O vento do voo apagou o fogo da sua roupa.'); return true; }
  if (nd.id === 'w_handlight') { let tx = +msg.tx, ty = +msg.ty; if (!isFinite(tx) || !isFinite(ty) || dist(p.x, p.y, tx, ty) > 7.5) { tx = p.x + Math.cos(a) * 4; ty = p.y + Math.sin(a) * 4; }   /* Mão de Luz: raio do céu */
    let ally = null, bd = 1.8; for (const q of Object.values(S.players)) { if (q === p || (q.fl || 0) !== fl) continue; const d = dist(q.x, q.y, tx, ty); if (d < bd) { bd = d; ally = q; } }
    if (ally) { tx = ally.x; ty = ally.y; if (ally.downed) revivePlayer(ally, 0.3, p.name); else { const h = Math.round(ally.maxHp * 0.2 * (1 + treeEff(p, 'holy') + useBonus(p, 'el_holy'))); ally.hp = Math.min(ally.maxHp, ally.hp + h); sfx(ally.x, ally.y, '+' + h, '#f0d878', 150); sendStat(ally); } tell(ally, p.name + ' tocou você com a Mão de Luz.'); }
    for (const m of Object.values(S.monsters)) { if (m.hp <= 0 || dist(m.x, m.y, tx, ty) > 2.2) continue; m.stunUntil = Math.max(m.stunUntil || 0, now + 2500); m.atk = null; m.nextAtk = Math.max(m.nextAtk || 0, now + 2600); m.blindUntil = now + 2500; near(m.x, m.y, { t: 'knock', k: 'm', id: m.id, ax: tx, ay: ty - 0.01, ms: 600 }); }
    anim('p', p, 'cast', tx, ty, shout); evoFx(p, { k: 'hand', tx, ty }); useGain(p, 'el_holy', 2); return true; }
  if (nd.id === 'w_prayer') { S.lightWells = (S.lightWells || []).filter(w => w.until > now); S.lightWells.push({ x: p.x, y: p.y, fl, until: now + 10000, by: p.id, k: 1 + treeEff(p, 'holy') + useBonus(p, 'el_holy') }); anim('p', p, 'castup', p.x, p.y, shout); evoFx(p, { k: 'well', ms: 10000 }); useGain(p, 'el_holy', 2); return true; }
  if (nd.id === 'w_restore') { for (const q of Object.values(S.players)) { if (q.downed || (q.fl || 0) !== fl || dist(q.x, q.y, p.x, p.y) > 4) continue; q.prayShield = Math.round(q.maxHp * 0.25 * (1 + useBonus(p, 'el_holy'))); q.prayUntil = now + 12000; evoFx(q, { k: 'pshield', ms: 12000 }); if (q !== p) tell(q, p.name + ' rezou por você: um escudo de luz absorve dano por 12 s.'); }
    anim('p', p, 'heal', p.x, p.y, shout); useGain(p, 'el_holy', 2); return true; }
  return false;
}
function lightWellTick(now) {   /* Poço de Luz: cura quem está dentro, a cada segundo */
  const L = S.lightWells; if (!L || !L.length || now - (S.lwT || 0) < 1000) return; S.lwT = now;
  for (const w of L) { if (w.until < now) continue; for (const q of Object.values(S.players)) { if (q.downed || (q.fl || 0) !== w.fl || dist(q.x, q.y, w.x, w.y) > 3 || q.hp >= q.maxHp) continue; const h = Math.max(1, Math.round(q.maxHp * 0.035 * w.k)); q.hp = Math.min(q.maxHp, q.hp + h); sfx(q.x, q.y, '+' + h, '#f0d878', 0); sendStat(q); } }
  S.lightWells = L.filter(w => w.until > now); }
function mageSpell(p, sk, msg, now) {
  const shout = { s: sk.name + '!' };
  if (sk.id === 'ember') {
    const ms = 12000; p.buffs.ember = now + ms; useGain(p, 'el_fire', 2); anim('p', p, 'castup', p.x, p.y, shout); near(p.x, p.y, { t: 'ember', id: p.id, ms });
    let lit = 0; for (const d of (S.doused || []).slice()) if (dist(p.x, p.y, d.x, d.y) <= 2.6 && WORLD.obj[d.i] === O.NONE) { setObj(d.i, O.CAMPFIRE); (S.objBack = S.objBack || []).push({ i: d.i, o: O.NONE, at: now + 180000 }); S.doused.splice(S.doused.indexOf(d), 1); lit++; }
    if (lit) tell(p, 'A brasa da sua mão acendeu ' + (lit > 1 ? lit + ' fogueiras' : 'a fogueira') + '.');
    return true;
  }
  if (sk.id === 'windstep') {
    const D = 3.5 * (1 + useBonus(p, 'el_wind')), a = isFinite(+msg.a) ? +msg.a : (p.fa || 0);
    p.dodgeUntil = now + 420; p.dodgeAllow = now + 900; p.parry = null; if (p.atk && !p.atk.done) p.atk = null; useGain(p, 'el_wind', 2);
    near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'dash', ms: 380 }); aoe('wind', p.x, p.y, { id: p.id, x2: p.x + Math.cos(a) * D, y2: p.y + Math.sin(a) * D });
    if (p.burnUntil > now) extinguish(p, 'O vento apagou o fogo da sua roupa.');
    return true;
  }
  if (sk.id === 'bloom') {
    const R = 1.6 + useBonus(p, 'el_earth') * 4, cx = Math.round(p.x), cy = Math.round(p.y), tiles = [], grow = [];
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) { if (!inBounds(x, y) || Math.hypot(x - p.x, y - p.y) > R) continue; const i = y * MAP_W + x, g = WORLD.ground[i]; if (WORLD.bld[i] >= 0 || (g !== T.GRASS && g !== T.FOREST)) continue; if (WORLD.obj[i] === O.FLOWER) { tiles.push(i); continue; } if (WORLD.obj[i] !== O.NONE || (S.burn && S.burn[i])) continue; tiles.push(i); grow.push(i); }
    if (!tiles.length) { tell(p, 'Aqui não tem grama para as flores brotarem.'); return false; }
    const until = now + 180000; for (const i of grow) { setObj(i, O.FLOWER); (S.objBack = S.objBack || []).push({ i, o: O.NONE, at: until, bloom: 1 }); }
    (S.blooms = S.blooms || []).push({ x: p.x, y: p.y, r: R + 0.6, until, wet: 0, tiles: grow, by: p.id }); if (S.blooms.length > 40) S.blooms.shift();
    bloomsSend(true); useGain(p, 'el_earth', 2); anim('p', p, 'nova', p.x, p.y, shout); aoe('bloom', p.x, p.y, { id: p.id, k: Math.round(R * 10) });
    if (typeof entMsg === 'function') { const sp = sapList().find(s => s.owner === estOwner(p) && dist(s.x, s.y, p.x, p.y) < 3.5); if (sp && !(S.estate.ents && S.estate.ents[estOwner(p)] && !S.estate.ents[estOwner(p)].dry) && entStageOf(p) >= 1) entMsg(p, { a: 'wake' }); }   /* a magia da Terra perto da muda desperta a guardiã */
    return true;
  }
  if (sk.id === 'faith') {
    const h0 = 0.08 * (1 + treeEff(p, 'holy') + useBonus(p, 'el_holy')); let ally = null, bd = 3.01;
    for (const q of Object.values(S.players)) { if (q === p || q.downed || (q.fl || 0) !== (p.fl || 0)) continue; const d = dist(p.x, p.y, q.x, q.y); if (d < bd && q.hp < q.maxHp) { bd = d; ally = q; } }
    anim('p', p, 'heal', p.x, p.y, shout); useGain(p, 'el_holy', 2);
    for (const q of ally ? [p, ally] : [p]) { const h = Math.max(1, Math.round(q.maxHp * h0)); q.hp = Math.min(q.maxHp, q.hp + h); aoe('heal', q.x, q.y, { id: q.id }); sfx(q.x, q.y, '+' + h, '#f0d878', 150); sendStat(q); if (q !== p) tell(q, p.name + ' cura você com a Fé Inabalável.'); }
    return true;
  }
  if (sk.id === 'spring') {
    const R = 3 + useBonus(p, 'el_water') * 6; let filled = 0, doused = 0; useGain(p, 'el_water', 2);
    anim('p', p, 'cast', p.x, p.y, shout); aoe('spring', p.x, p.y, { id: p.id, k: Math.round(R * 10) });
    for (const q of Object.values(S.players)) { if (q.downed || dist(p.x, p.y, q.x, q.y) > R || (q.fl || 0) !== (p.fl || 0)) continue;
      if (q.hasSkin && (q.pots.water | 0) < 5) { q.pots.water = 5; filled++; } q.water = Math.min(100, (q.water ?? 100) + 25);
      if (q.burnUntil > now) { extinguish(q, 'A água de ' + p.name + ' apagou o fogo.'); doused++; } if (q !== p) tell(q, p.name + ' fez brotar água: ' + (q.hasSkin ? 'seu odre está cheio e ' : '') + 'você bebe um gole.'); sendStat(q); }
    const cx = Math.round(p.x), cy = Math.round(p.y), list = [];
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) { if (!inBounds(x, y) || Math.hypot(x - p.x, y - p.y) > R) continue; const i = y * MAP_W + x;
      if (S.burn && S.burn[i]) { delete S.burn[i]; S.burnN = Math.max(0, (S.burnN || 0) - 1); (S.burnt = S.burnt || {})[i] = now + 60000; list.push([x, y]); doused++; }
      if (WORLD.obj[i] === O.CAMPFIRE) { setObj(i, O.NONE); (S.doused = S.doused || []).push({ i, x, y, t: now }); if (S.doused.length > 30) S.doused.shift(); doused++; } }
    if (list.length && S.fires) S.fires = S.fires.filter(f => !list.some(([x, y]) => Math.abs(f.x - x) < 0.6 && Math.abs(f.y - y) < 0.6));
    if (list.length) near(p.x, p.y, { t: 'fireout', l: list });
    let wet = 0; for (const b of S.blooms || []) if (b.until > now && dist(p.x, p.y, b.x, b.y) <= R + b.r) { b.wet = 1; b.until += 90000; wet++; sapTryWater(p, b, now); for (const o of S.objBack || []) if (o.bloom && b.tiles.includes(o.i)) o.at = b.until; }
    if (wet) bloomsSend(false);
    tell(p, 'A água brota das suas mãos' + (filled ? ': ' + filled + (filled > 1 ? ' odres cheios' : ' odre cheio') : '') + (doused ? ', fogo apagado' : '') + (wet ? ', flores regadas' : '') + '.');
    return true;
  }
}
function bloomsSend(fresh, to) {   /* flores do Florescer para os jogadores (o terreno delas é desenhado por cima) */
  const now = now_(), l = (S.blooms || []).filter(b => b.until > now && b.tiles.length).map(b => [b.tiles, b.until - now, b.wet]), msg = { t: 'blooms', l, fresh: fresh ? 1 : 0 };
  if (to) Net.toOne(to, msg); else Net.toAll(msg);
}
function emberBurn(p, q) {   /* o golpe com a mão em brasa deixa o alvo queimando por 3 s */
  if (!S.monsters[q.id]) return; near(q.x, q.y, { t: 'mburn', id: q.id, ms: 3000 });
  for (let k = 1; k <= 3; k++) setTimeout(() => { const m = S.monsters[q.id], pp = S.players[p.id]; if (!m || !pp) return; pp._el = 'fire'; hitMonster(pp, m, 0.18 * (1 + treeEff(pp, 'fire')), 0); pp._el = null; }, k * 1000);
}
// ---------- ofurô da suíte: aquece, recupera vida e fôlego, limpa feridas; ao sair (depois de 15 s), "bem descansado" ----------
function bathMsg(p, m) {
  const now = now_();
  if (!m.on) { if (p.bath) bathEnd(p); return; }
  const b = BUILDINGS[p.fb], O2 = ofuroOf(b); if (!O2 || (p.fl || 0) !== O2.fl || p.downed || p.carrying || p.bath) return;
  if (dist(p.x, p.y, O2.x, O2.y) > 2.4) { tell(p, 'Chegue perto do ofurô.'); return; }
  { const lv = tubLv(tubRec(p.fb), Date.now()); if (lv < 0.5) { tell(p, lv < 0.02 ? 'O ofurô está vazio: baixe a alavanca na parede para encher.' : 'A água ainda está baixa: espere encher pelo menos até a metade.'); return; } }
  const others = Object.values(S.players).filter(q => q !== p && q.bath && q.bath.bi === p.fb);
  if (m.mode === 'float') {   /* boiar de barriga para cima no meio: só sozinho na água */
    if (others.some(q => q.bath.mode !== 'edge')) { tell(p, 'Para boiar no meio, você precisa estar sozinho na banheira.'); return; }
    p.x = O2.x; p.y = O2.y; Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: p.fl, fb: p.fb }); bathBegin(p, O2, { mode: 'float', seat: -1 }, now); return; }
  if (m.mode === 'edge') {   /* sentar na beira, no ponto escolhido de um dos dois lados livres */
    let best = null, bd = 1e9; O2.edges.forEach((E, k) => { const ax = E.b[0] - E.a[0], ay = E.b[1] - E.a[1], L2 = ax * ax + ay * ay, t = clamp(((p.x - E.a[0]) * ax + (p.y - E.a[1]) * ay) / L2, 0, 1), x = E.a[0] + ax * t, y = E.a[1] + ay * t, d = dist(p.x, p.y, x, y); if (d < bd) { bd = d; best = { x, y, k, E }; } });
    if (!best || bd > 1.6) { tell(p, 'Chegue perto da beira do ofurô.'); return; }
    if (others.some(q => q.bath.mode === 'edge' && dist(q.x, q.y, best.x, best.y) < 0.5)) { tell(p, 'Esse lugar na beira está ocupado.'); return; }
    p.x = best.x; p.y = best.y; Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: p.fl, fb: p.fb }); p.dir = dirFromVecS(best.E.cin[0] - best.x, best.E.cin[1] - best.y); bathBegin(p, O2, { mode: 'edge', seat: -2 - best.k }, now); return; }
  for (const q of others) if (q.bath.mode === 'float') { const [sx3, sy3] = O2.seats[0]; q.x = sx3; q.y = sy3; q.bath.mode = 'seat'; q.bath.seat = 0; Net.toOne(q.id, { t: 'tp', x: q.x, y: q.y, z: 0, fl: q.fl, fb: q.fb }); near(q.x, q.y, { t: 'bath', id: q.id, on: 1, x: q.x, y: q.y, mode: 'seat', rx: O2.rack[0], ry: O2.rack[1], dir: dirFromVecS(O2.x - sx3, O2.y - sy3) }); tell(q, p.name + ' entrou na banheira: você para de boiar e senta num canto.'); }
  const used = new Set(Object.values(S.players).filter(q => q.bath && q.bath.bi === p.fb).map(q => q.bath.seat)), free = O2.seats.map((s0, k) => k).filter(k => !used.has(k)).sort((a, c) => dist(p.x, p.y, O2.seats[a][0], O2.seats[a][1]) - dist(p.x, p.y, O2.seats[c][0], O2.seats[c][1]));
  if (!free.length) { tell(p, 'O ofurô está cheio (4 pessoas).'); return; } const seat = free[0], [sx2, sy2] = O2.seats[seat];
  p.x = sx2; p.y = sy2; p.dir = dirFromVecS(O2.x - sx2, O2.y - sy2); Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: p.fl, fb: p.fb }); bathBegin(p, O2, { mode: 'seat', seat }, now);
}
function bathBegin(p, O2, B, now) {
  p.sit = 'g'; p.walking = false; p.bath = { t0: now, bi: p.fb, tick: now, seat: B.seat, mode: B.mode }; if (p.atk) p.atk = null; if (!p.sheathed) sheatheToggle(p, true, true);   /* a arma vai para o cabideiro */
  const k = Math.max(0, B.seat); near(p.x, p.y, { t: 'bath', id: p.id, on: 1, x: p.x, y: p.y, mode: B.mode, rx: O2.rack[0] + (k % 2) * 0.3, ry: O2.rack[1] - (k >> 1) * 0.3, dir: p.dir });
  tell(p, B.mode === 'float' ? 'Você boia de barriga para cima no meio do ofurô.' : B.mode === 'edge' ? 'Você senta na beira do ofurô, com as pernas na água quente.' : 'Banho no ofurô: recupera vida e fôlego, tira o frio e limpa as feridas. Fique 15 s para sair bem descansado.');
}
// ---------- água do ofurô: alavanca na parede (baixo = enche em 2 min com as bicas correndo; cima = fecha as bicas e esvazia em 1 min); esfria depois de 1 dia do jogo ----------
function tubRec(bi) { const E = estateLoad(), M = E.tub || (E.tub = {}); return M[bi] || (M[bi] = { lv: 0, mode: '', lever: 0, t: 0, fullG: 0, cold: false }); }
function tubPayload(bi) { const T = tubRec(bi); return { t: 'tub', bi, lv: +tubLv(T, Date.now()).toFixed(4), mode: T.mode, lever: T.lever, cold: !!T.cold }; }
function tubSendAll(to) { for (let bi = 0; bi < BUILDINGS.length; bi++) if (ofuroOf(BUILDINGS[bi])) Net.toOne(to, tubPayload(bi)); }
function tubMsg(p, m) {
  const b = BUILDINGS[p.fb], O2 = ofuroOf(b); if (!O2 || (p.fl || 0) !== O2.fl || p.downed || p.bath) return;
  if (dist(p.x, p.y, O2.lever[0], O2.lever[1]) > 1.3) { tell(p, 'Chegue perto da alavanca na parede.'); return; }
  const T = tubRec(p.fb), now = Date.now(), lv = tubLv(T, now);
  const nx = ((T.lever | 0) + 1) % 3; T.lv = lv; T.t = now; T.lever = nx;   /* cima (vazia) > meio (enchendo) > baixo (água desligada, mantém) > cima */
  if (nx === 1) { T.mode = 'fill'; if (lv < 1) { T.fullG = 0; T.cold = false; } info(p, lv < 1 ? 'Alavanca no meio: a cascata corre e o ofurô começa a encher (2 min).' : 'Alavanca no meio: a cascata volta a correr.'); }
  else if (nx === 2) { T.mode = ''; if (lv >= 1 && !T.fullG) T.fullG = gameNow(); info(p, 'Alavanca para baixo: a água desliga e o ofurô fica ' + (lv >= 0.99 ? 'cheio' : 'com a água que tem') + '.'); }
  else { T.mode = lv > 0 ? 'drain' : ''; info(p, lv > 0 ? 'Alavanca para cima: o ralo abre e o ofurô esvazia (1 min).' : 'Alavanca para cima: tudo desligado.'); }
  p.dir = dirFromVecS(O2.lever[0] - p.x, O2.lever[1] - p.y + 0.4); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'lever', tx: O2.lever[0], ty: O2.lever[1] - 0.5, ms: 1100 });
  Net.toAll(tubPayload(p.fb)); estateSave();
}
function tubTick(now) {
  if (now - (S.tubT || 0) < 1000) return; S.tubT = now; const E = S.estate; if (!E || !E.tub) return; const t = Date.now();
  for (const bi in E.tub) { const T = E.tub[bi], lv = tubLv(T, t); let ch = false;
    if (T.mode === 'fill' && lv >= 1 && !T.fullG) { T.lv = 1; T.t = t; T.fullG = gameNow(); T.cold = false; ch = true; }
    if (T.mode === 'drain' && lv <= 0) { T.lv = 0; T.t = t; T.mode = ''; ch = true; }
    const cold = !!(T.fullG && lv >= 1 && gameNow() - T.fullG > ESTATE_DAY_MS); if (cold !== !!T.cold) { T.cold = cold; ch = true; }
    if (ch) { Net.toAll(tubPayload(+bi)); estateSave(); } }
}
// ---------- Dojô do Punho de Ferro: diária e treino AFK nos bonecos (só o cavaleiro aprende) ----------
function dojoRec() { const P = PROPS.find(q => q.wk === 'dojo'); if (!P) return null; const r = S.estate && S.estate.r[P.id]; return { P, r, B: r && r.biz, N: (!r && S.estate) ? npcbAll()[P.id] : null }; }
function dojoFee() { const D = dojoRec(); return DOJO_FEE[(D && D.B && D.B.fee != null) ? D.B.fee : 1]; }
function dojoEarn(v, txt) { const D = dojoRec(); if (!D || !v) return; if (D.B) { D.B.cofre += v; D.B.today.rev += v; D.B.today.sold = (D.B.today.sold || 0) + 1; if (txt) bizLog(D.B, txt); } else if (D.N) { D.N.cofre += v; D.N.today.rev += v; D.N.today.sold = (D.N.today.sold || 0) + 1; D.N.today.pl = (D.N.today.pl || 0) + v; } }
function dojoPaid(p) {   // diária: uma vez por dia do jogo (o dono e quem ele autorizou não pagam)
  const D = dojoRec(); if (!D) return false; if (p.dev) return true; if (D.r && (D.r.owner === estOwner(p) || (D.r.auth || []).includes(p.name))) return true;
  if (p.dojoDay === estDay()) return true; const fee = dojoFee();
  if (!canPay(p, fee)) { tell(p, 'A diária do dojô é ' + fee + ' de ouro.'); return false; }
  payCity(p, fee); p.dojoDay = estDay(); dojoEarn(fee, p.name + ' pagou a diária (' + fee + ').'); tell(p, 'Diária do dojô paga: ' + fee + ' de ouro. Pode treinar o dia todo.'); sendStat(p); return true;
}
// ---------- ataque automático: arqueiro e mago atiram sozinhos em todos os monstros à vista (tecla R) ----------
const AUTO_R = 8.5;   /* o que cabe na tela */
// ---------- ataque automático em pessoas (ligado na tela): bate no alvo clicado e revida em quem atacar ----------
function pplMsg(p, m) { p.pplAuto = m.ppl ? 1 : 0; if (!p.pplAuto) p.pTgt = null; Net.toOne(p.id, { t: 'pplauto', on: p.pplAuto }); tell(p, p.pplAuto ? 'Ataque em pessoas ligado: clique num jogador ou morador para ser o alvo; também revida em quem te atacar. Cuidado: na cidade é crime.' : 'Ataque em pessoas desligado.'); }
function pplTarget(p, now) {   /* o alvo clicado, ou quem atacou nos últimos 10 s */
  const ok = (k, id) => { const q = k === 'p' ? S.players[id] : S.npcs[id]; if (!q || q === p || q.dead || q.downed || (q.fl || 0) !== (p.fl || 0) || dist(q.x, q.y, p.x, p.y) > 12 || q.dev) return null; return q; };
  if (p.pTgt) { const q = ok(p.pTgt.k, p.pTgt.id); if (q) return { k: p.pTgt.k, q }; p.pTgt = null; }
  if (p._hitBy && now - p._hitBy.t < 10000) { const q = ok(p._hitBy.k, p._hitBy.id); if (q) return { k: p._hitBy.k, q }; }
  return null; }
function autoMsg(p, m) {
  if (p.cls !== 'archer' && p.cls !== 'mage') return;
  if (!m.on) { if (p.autoAtk) { p.autoAtk = 0; if (p.flame && p.flame.auto) flameStop(p); Net.toOne(p.id, { t: 'autoatk', on: 0 }); tell(p, 'Ataque automático desligado.'); } return; }
  if (p.cls === 'archer' && p.sheathed) { tell(p, 'Saque o arco primeiro (G).'); Net.toOne(p.id, { t: 'autoatk', on: 0 }); return; }
  if (Array.isArray(m.slots)) p.autoSlots = m.slots.slice(0, 5).map(s => s && s.c != null ? { c: s.c | 0 } : { b: s.b | 0, n: s.n | 0 }); if (p.autoAtk) return;   /* só atualizou as teclas */
  p.autoAtk = 1; Net.toOne(p.id, { t: 'autoatk', on: 1 }); tell(p, 'Ataque automático ligado: ' + (p.cls === 'archer' ? 'flechas em todo monstro à vista' : 'usa tudo o que está nas suas teclas (ataques, defesas e curas quando fizerem falta) e as Chamas no intervalo; sem mana, espera e volta') + '. R desliga.');
}
function autoTick(now) {
  for (const p of Object.values(S.players)) { if (!p.autoAtk) continue;
    if (p.downed || p.cls === 'knight' || (p.cls === 'archer' && p.sheathed)) { p.autoAtk = 0; if (p.flame && p.flame.auto) flameStop(p); Net.toOne(p.id, { t: 'autoatk', on: 0 }); continue; }
    if (p.cls === 'mage') { autoMage(p, now); continue; }   /* mago: rotação das magias dos botões */
    if (p.duel || p.bath || p.sleep != null || p.carrying || p.lifted || p.grabbed || p.bound || p.atk || p.casting || p.flame || p.train || now < (p.nextAtk || 0) || inSafe(p.x, p.y)) continue;
    if (p.cls === 'mage' && (p.mp || 0) < 2) { if (now > (p._autoMpT || 0)) { p._autoMpT = now + 8000; tell(p, 'Sem mana para o ataque automático: ele volta quando a mana encher.'); } continue; }
    const rng = Math.max(AUTO_R, CLASSES[p.cls].range + treeEff(p, 'range')); let q = null, best = 1e9;
    if (p.pplAuto && p.cls === 'archer') { const T = pplTarget(p, now); if (T && dist(p.x, p.y, T.q.x, T.q.y) <= rng + 1) { if (now < (p.nockReady || 0)) continue; const Q = T.q; p.dir = dirFromVecS(Q.x - p.x, Q.y - p.y); p.drawT = now - BOW.draw * 0.8; bowLoose(p, { a: Math.atan2(Q.y - p.y, Q.x - p.x), tx: Q.x, ty: Q.y, pow: 0.8 }); p.nextAtk = now + BOW.loose + BOW.nock + 200; continue; } }
    for (const o of Object.values(S.monsters)) { if (o.hp <= 0 || (o.alt || 0) >= 1.2 || Math.abs((o.z || 0) - (p.z || 0)) >= 0.5) continue; const d0 = MON[o.type] || {}, game = p.cls === 'archer' && !p.sheathed && o.type === 'deer'; if (d0.beh === 'flee' && o.aggro !== p.id && !game) continue;   /* bichos mansos ficam em paz, a não ser que ataquem; o arqueiro de arco sacado caça cervos */
      const d = dist(p.x, p.y, o.x, o.y); if (d > rng + (d0.rad || 0)) continue; const sc = d + (o.id === p.target ? -2 : 0) + (o.aggro === p.id ? -1.5 : 0) + (game && o.aggro !== p.id ? 6 : 0); if (sc < best) { best = sc; q = o; } }
    if (!q) continue; p.target = q.id; p.dir = dirFromVecS(q.x - p.x, q.y - p.y);
    if (p.cls === 'archer' && autoArcherSkill(p, q, now)) continue;   /* habilidades na hora certa */
    if (p.cls === 'archer') { if (now < (p.nockReady || 0)) continue; const lead = Math.min(0.6, dist(p.x, p.y, q.x, q.y) / 14), tx = q.x + (q.vx || 0) * lead, ty = q.y + (q.vy || 0) * lead; p.drawT = now - BOW.draw * 0.8; bowLoose(p, { a: Math.atan2(ty - p.y, tx - p.x), tx, ty, pow: 0.8 }); p.nextAtk = now + BOW.loose + BOW.nock + 200; continue; }   /* a mesma flecha do tiro manual */
    if (p.cls === 'mage') { p.mp -= 2; sendStat(p); } basicAttack(p, q, now);
  }
}
// ---------- meditação do mago: senta em lótus e se concentra num elemento ----------
const MEDIT_EL = { fire: { n: 'Fogo', near: 'perto do fogo (fogueira, forja, lareira)' }, water: { n: 'Água', near: 'perto da água (rio, lago, mar ou o ofurô)' }, earth: { n: 'Terra', near: 'na grama ou na floresta, ao ar livre' }, wind: { n: 'Ar', near: 'no alto (andares de cima, penhascos) ou em campo aberto' }, holy: { n: 'Luz', near: 'ao sol, de dia e ao ar livre' } };
function meditDanger(p) { for (const o of Object.values(S.monsters)) { if (o.hp <= 0) continue; const d0 = MON[o.type] || {}; if (d0.beh === 'flee' && o.aggro !== p.id) continue; const d = dist(p.x, p.y, o.x, o.y); if (o.aggro === p.id || (d < 7 && (d0.aggro || 0) > 0)) return o; } return null; }
function meditBoost(p, el) {
  const R = 4, cx = Math.round(p.x), cy = Math.round(p.y), fl = p.fl || 0, out = fl === 0 && WORLD.bld[tileAt(p.x, p.y)] < 0;
  const any = f => { for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) { if (!inBounds(x, y)) continue; if (f(y * MAP_W + x, x, y)) return true; } return false; };
  if (el === 'fire') return any(t => WORLD.obj[t] === O.CAMPFIRE) || BUILDINGS.some(b => b.kind === 'forge' && dist(b.x + b.w / 2, b.y + b.h / 2, p.x, p.y) < 5) || (typeof KITCHENS !== 'undefined' && KITCHENS.some(k => (k.fl || 0) === fl && dist(k.x, k.y, p.x, p.y) < 3));
  if (el === 'water') return (fl && typeof ofuroOf === 'function' && BUILDINGS[p.fb] && ofuroOf(BUILDINGS[p.fb]) && dist(ofuroOf(BUILDINGS[p.fb]).x, ofuroOf(BUILDINGS[p.fb]).y, p.x, p.y) < 3) || (!fl && any(t => WORLD.ground[t] === T.WATER || WORLD.ground[t] === T.SHALLOW));
  if (el === 'earth') return out && any(t => WORLD.ground[t] === T.FOREST || WORLD.ground[t] === T.GRASS);
  if (el === 'wind') return fl >= 2 || (out && (WORLD.fl1 && WORLD.fl1[tileAt(p.x, p.y)] > 0 || !any(t => WORLD.bld[t] >= 0 || WORLD.obj[t] === O.TREE)));
  if (el === 'holy') return out && !dayInfoS().night;
  return false;
}
function meditStop(p, why) { if (!p.medit) return; const M = p.medit; p.medit = null; near(p.x, p.y, { t: 'medit', id: p.id, on: 0 }); if (why) tell(p, why + (M.gain >= 1 ? ' (+' + M.gain.toFixed(1) + ' em ' + MEDIT_EL[M.el].n + ')' : '')); sendStat(p); }
function meditMsg(p, m) {
  if (!m.on) { meditStop(p, 'Você encerra a meditação.'); return; }
  if (p.cls !== 'mage') return; const el = MEDIT_EL[m.el] ? m.el : 'fire';
  if (p.downed || p.bath || p.carrying || p.lifted || p.bound || p.train || p.duel || p.sleep != null) return;
  const dg = meditDanger(p); if (dg) { tell(p, 'Não dá para meditar com perigo por perto (' + ((MON[dg.type] || {}).name || 'inimigo') + ').'); return; }
  if (p.flame) flameStop(p); if (p.autoAtk) { p.autoAtk = 0; Net.toOne(p.id, { t: 'autoatk', on: 0 }); } p.sit = null;
  const now = now_(), bo = meditBoost(p, el); p.medit = { el, t0: now, tick: now, x: p.x, y: p.y, gain: 0, bo };
  near(p.x, p.y, { t: 'medit', id: p.id, on: 1, el });
  tell(p, 'Você medita sobre ' + (el === 'water' || el === 'earth' || el === 'holy' ? 'a ' : 'o ') + MEDIT_EL[el].n + '.' + (bo ? ' Este lugar ajuda: rende mais.' : ' Rende mais ' + MEDIT_EL[el].near + '.') + ' Ande para parar.');
}
function meditTick(now) {
  for (const p of Object.values(S.players)) { const M = p.medit; if (!M) continue;
    if (p.downed || p.bath || p.carrying || p.lifted || p.bound || p.cls !== 'mage' || dist(p.x, p.y, M.x, M.y) > 0.3 || p.atk || p.casting) { meditStop(p, 'Você parou de meditar.'); continue; }
    if (now - M.tick < 1000) continue; M.tick = now;
    const dg = meditDanger(p); if (dg && dist(p.x, p.y, dg.x, dg.y) < 5) { meditStop(p, 'Um perigo interrompe a meditação!'); continue; }
    if (now - (M.boT || 0) > 10000) { M.boT = now; M.bo = meditBoost(p, M.el); }
    let grp = 0; for (const q of Object.values(S.players)) if (q !== p && q.medit && (q.fl || 0) === (p.fl || 0) && dist(q.x, q.y, p.x, p.y) <= 4) grp++;   /* magos meditando juntos se ajudam */
    if (grp && !M.grpT) { M.grpT = 1; tell(p, 'Meditação em grupo: ' + (grp + 1) + ' magos juntos, o progresso sobe mais rápido.'); } if (!grp) M.grpT = 0; p.buffs.medgroup = grp ? now + 1500 : 0;
    const deep = Math.min(1, (now - M.t0) / 20000), tr = now - M.t0 >= 60000, g = (0.22 + 0.18 * deep) * (M.bo ? 1.6 : 1) * (tr ? 1.5 : 1) * (1 + Math.min(3, grp) * 0.25);   /* quanto mais tempo, mais fundo; depois de 1 minuto, o transe profundo */
    if (tr && !M.trance) { M.trance = 1; tell(p, 'Transe profundo: a aura dobra, a perícia sobe 50% mais rápido e o corpo se recupera mais.'); }
    useGain(p, 'el_' + M.el, g); M.gain += g;
    { const rk = tr ? 1.5 : 1; p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * 0.025 * rk))); p.mp = Math.min(p.maxMp, (p.mp || 0) + Math.max(1, p.maxMp * 0.05 * rk)); p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 12 * rk); }
    p.food = Math.max(0, (p.food ?? 100) - 0.09); p.water = Math.max(0, (p.water ?? 100) - 0.08);
    if (p.food <= 0 || p.water <= 0) { meditStop(p, p.food <= 0 ? 'A fome tira a concentração.' : 'A sede tira a concentração.'); continue; }
    if (Math.floor((now - M.t0) / 1000) % 2 === 0) sendStat(p);
  }
}
function autoArcherSkill(p, q, now) {   /* arqueiro: Chuva em grupo, Perfurante em fila, Passo Ágil quando cercado, Tiro Duplo no resto */
  if (p.sheathed || now < (p._autoSkT || 0)) return false; const SK = SKILLS.archer, idx = id => SK.findIndex(s => s.id === id), ready = i => i >= 0 && now >= (p.cds[i] || 0) && (p.mp || 0) >= SK[i].mp;
  const hostile = o => o.hp > 0 && (o.alt || 0) < 1.2 && ((MON[o.type] || {}).beh !== 'flee' || o.aggro === p.id), mons = Object.values(S.monsters).filter(o => hostile(o) && dist(p.x, p.y, o.x, o.y) <= 7.2), d = dist(p.x, p.y, q.x, q.y);
  const use = (id, tg) => { p.target = tg.id; p.dir = dirFromVecS(tg.x - p.x, tg.y - p.y); useSkill(p, idx(id), { a: Math.atan2(tg.y - p.y, tg.x - p.x) }); p._autoSkT = now + 700; return true; };
  const close = mons.filter(o => dist(p.x, p.y, o.x, o.y) < 2.2).length; if (close >= 2 && ready(idx('agile'))) return use('agile', q);
  if (ready(idx('rain'))) { let best = null, bc = 0; for (const o of mons) { if (dist(p.x, p.y, o.x, o.y) > 6.5) continue; const c = mons.filter(z => dist(z.x, z.y, o.x, o.y) <= 1.6).length; if (c > bc) { bc = c; best = o; } } if (best && bc >= 3) return use('rain', best); }
  if (ready(idx('pierce')) && d <= 7) { const a0 = Math.atan2(q.y - p.y, q.x - p.x), ca = Math.cos(a0), sa = Math.sin(a0), inLine = mons.filter(o => { const dx = o.x - p.x, dy = o.y - p.y, al = dx * ca + dy * sa; return al > 0 && al < 7 && Math.abs(-dx * sa + dy * ca) < 0.6; }).length; if (inLine >= 2) return use('pierce', q); }
  if (ready(idx('double')) && d <= 6.5 && (p.mp || 0) >= SK[idx('double')].mp + 12) return use('double', q);   /* guarda mana para as outras */
  return false;
}
/* mago no automático: evoluções e combinadas que estão nas teclas. Curas e defesas primeiro (quando fazem falta), depois as combinadas e as evoluções de ataque */
function autoMageKeys(p, now) {
  const hostile = o => o.hp > 0 && (o.alt || 0) < 1.2 && Math.abs((o.z || 0) - (p.z || 0)) < 0.5 && ((MON[o.type] || {}).beh !== 'flee' || o.aggro === p.id), nearM = r => Object.values(S.monsters).filter(o => hostile(o) && dist(p.x, p.y, o.x, o.y) <= r);
  const M7 = nearM(7), M4 = nearM(4), M3 = nearM(3), hpK = p.hp / Math.max(1, p.maxHp); let T = null, bc = -1; for (const o of M7) { let n = 0; for (const q of M7) if (dist(o.x, o.y, q.x, q.y) < 2.5) n++; if (n > bc) { bc = n; T = o; } }
  const aT = T ? Math.atan2(T.y - p.y, T.x - p.x) : (p.fa || 0), dT = T ? dist(p.x, p.y, T.x, T.y) : 99, at = T ? { a: aT, tx: T.x, ty: T.y } : null;
  const want = id => { switch (id) {
    case 'w_sparks': case 'w_tide': case 'w_thorns': return T && dT <= 6 ? { a: aT } : null;
    case 'w_gust': return T && dT <= 3.5 ? { a: aT } : null;
    case 'w_fireball': return T && dT >= 4.2 ? at : null;   /* longe o bastante para a explosão não pegar o próprio mago */
    case 'w_meteor': return T && dT >= 3.2 ? at : null;
    case 'w_frost': return at;
    case 'w_quake': return M4.length ? {} : null;
    case 'w_shield': return M3.length && !((p.windSh || 0) > now) ? {} : null;
    case 'w_stone': return M3.length && hpK < 0.75 && !((p.stoneSk || 0) > now) ? {} : null;
    case 'w_mist': return M7.length && hpK < 0.5 ? {} : null;
    case 'w_glide': return M3.length >= 2 && hpK < 0.5 ? { a: aT + Math.PI } : null;
    case 'w_prayer': return hpK < 0.7 ? {} : null;
    case 'w_restore': return hpK < 0.6 ? {} : null;
    case 'w_handlight': { const al = Object.values(S.players).find(q => q !== p && (q.fl || 0) === (p.fl || 0) && dist(q.x, q.y, p.x, p.y) < 7 && (q.downed || q.hp < q.maxHp * 0.6)); return al ? { tx: al.x, ty: al.y } : T && dT <= 7 ? { a: aT, tx: T.x, ty: T.y } : null; }
    case 'c_tornado': return T ? { a: aT } : null;
    case 'c_steam': case 'c_embers': case 'c_mud': case 'c_storm': return at;
    case 'c_sand': return M3.length ? {} : null;
    case 'c_dome': return M7.length && hpK < 0.7 ? {} : null;
    case 'c_sflame': return (M7.length && hpK < 0.8) || M3.length >= 2 ? {} : null;
    case 'c_hwater': return hpK < 0.6 || (p.burnUntil || 0) > now || p.infect ? {} : null;
    case 'c_grove': return hpK < 0.6 ? {} : null; } return null; };
  const PRI = id => /^(w_prayer|w_restore|c_hwater|c_grove|c_dome|w_stone|w_mist|w_shield|w_glide)$/.test(id) ? 0 : id[0] === 'c' ? 1 : 2;
  const list = p.autoSlots.map(s => { if (s.c != null) { const C = MAGE_COMBOS[s.c]; return C && { id: C.id, c: s.c, mp: C.mp, key: 'c' + s.c, ok: treeHas(p, C.id) && elemStrength(p, C.a) >= COMBO_NEED && elemStrength(p, C.b) >= COMBO_NEED }; }
    const br = TREE.mage[s.b], nd = br && br.nodes[s.n]; return nd && nd.evo ? { id: nd.id, b: s.b, n: s.n, mp: nd.mp, key: s.b + 20 + s.n * 10, ok: elemStrength(p, br.el) >= nd.need } : null; }).filter(Boolean).sort((a, b) => PRI(a.id) - PRI(b.id));
  p.tcd = p.tcd || {};
  for (const s of list) { if (!s.ok || now < (p.tcd[s.key] || 0) || (p.mp || 0) < s.mp) continue; const m = want(s.id); if (!m) continue; if (p.flame) flameStop(p); const mp0 = p.mp;
    if (s.c != null) comboSkill(p, Object.assign({ c: s.c }, m)); else treeSkill(p, s.b, Object.assign({ n: s.n }, m)); if (p.mp < mp0 || (p.tcd[s.key] || 0) > now) return true; }
  return false; }
function autoMage(p, now) {
  if (p.duel || p.bath || p.sleep != null || p.carrying || p.lifted || p.grabbed || p.bound || p.casting || p.train || p.medit || inSafe(p.x, p.y)) { if (p.flame && p.flame.auto) flameStop(p); return; }
  if (p.autoSlots && p.autoSlots.length && now >= (p._autoCast || 0) && now >= (p.stunUntil || 0) && now >= (p.knockUntil || 0)) { if (autoMageKeys(p, now)) { p._autoCast = now + 900; return; } }
  const SK = SKILLS.mage, idx = id => SK.findIndex(s => s.id === id), ready = i => i >= 0 && now >= (p.cds[i] || 0) && (p.mp || 0) >= SK[i].mp, hostile = o => o.hp > 0 && (o.alt || 0) < 1.2 && Math.abs((o.z || 0) - (p.z || 0)) < 0.5 && ((MON[o.type] || {}).beh !== 'flee' || o.aggro === p.id);
  const cast = (id, msg) => { if (p.flame) flameStop(p); useSkill(p, idx(id), msg || {}); };
  const close = Object.values(S.monsters).find(o => hostile(o) && dist(p.x, p.y, o.x, o.y) < 1.1);
  if (close && ready(idx('windstep')) && now > (p._autoWs || 0)) { p._autoWs = now + 3500; cast('windstep', { a: Math.atan2(p.y - close.y, p.x - close.x) }); return; }   /* um monstro encostou: recua com o vento */
  if (p.hp < p.maxHp * 0.55 && ready(idx('faith'))) { cast('faith'); return; }   /* vida baixa: cura */
  if (p.hp < p.maxHp * 0.8 && ready(idx('bloom')) && now > (p._autoBl || 0)) { p._autoBl = now + 20000; cast('bloom'); return; }   /* ferido: flores que curam */
  if ((p.burnUntil || 0) > now && ready(idx('spring'))) { cast('spring'); return; }   /* pegando fogo: a fonte apaga */
  if (p.pplAuto) { const T = pplTarget(p, now), st0 = flameStats(p); if (T && dist(p.x, p.y, T.q.x, T.q.y) <= st0.R + 0.3 && (p.mp || 0) >= 2) { const a = Math.atan2(T.q.y - p.y, T.q.x - p.x); if (!p.flame) { flameMsg(p, { on: 1, a }); if (p.flame) p.flame.auto = 1; } else { p.flame.a = a; p.flame.last = now; p.dir = dirFromVecS(Math.cos(a), Math.sin(a)); } return; } }
  const st = flameStats(p), mons = Object.values(S.monsters).filter(o => hostile(o) && dist(p.x, p.y, o.x, o.y) <= st.R + ((MON[o.type] || {}).rad || 0) + 0.3);
  if (p._autoLow && (p.mp || 0) >= (p.maxMp || 50) * 0.35) p._autoLow = 0;
  if (!mons.length || p._autoLow || (p.mp || 0) < 2) { if (p.flame && p.flame.auto) flameStop(p); if ((p.mp || 0) < 2 && !p._autoLow) { p._autoLow = 1; if (mons.length) tell(p, 'Sem mana: o ataque automático espera a mana voltar.'); } return; }
  let best = 0, bc = -1, bd = 1e9; for (const o of mons) { const a0 = Math.atan2(o.y - p.y, o.x - p.x), ca = Math.cos(a0), sa = Math.sin(a0); let c = 0; for (const q of mons) { const dx = q.x - p.x, dy = q.y - p.y, al = dx * ca + dy * sa; if (al > 0.2 && Math.abs(-dx * sa + dy * ca) <= 0.35 + al * 0.18) c++; } const d = dist(p.x, p.y, o.x, o.y); if (c > bc || (c === bc && d < bd)) { bc = c; bd = d; best = a0; } }   /* o ângulo do jato que pega mais monstros */
  if (!p.flame) { flameMsg(p, { on: 1, a: best }); if (p.flame) p.flame.auto = 1; } else { p.flame.a = best; p.flame.last = now; p.dir = dirFromVecS(Math.cos(best), Math.sin(best)); }
}
function trainMsg(p, m) {
  if (m.a === 'stop') { if (p.train) trainEnd(p, 'Você parou de treinar.'); return; }
  if (p.train || p.downed || p.carrying || p.bath) return;
  let best = -1, bd = 1.9, free = false; DUMMIES.forEach((d, i) => { if ((d.fl || 0) !== (p.fl || 0)) return; const dd = dist(p.x, p.y, d.x, d.y); if (dd < bd) { bd = dd; best = i; } });
  if (p.cls === 'archer' && !p.sheathed && Number.isInteger(m.i) && DUMMIES[m.i]) { const d = DUMMIES[m.i], myB = (p.fl || 0) ? p.fb : WORLD.bld[tileAt(p.x, p.y)]; if ((d.fl || 0) === (p.fl || 0) && d.bi === myB && dist(p.x, p.y, d.x, d.y) <= 9.5) { best = m.i; free = true; } }   /* arqueiro: atira de onde está, no mesmo cômodo */
  if (best < 0) { tell(p, 'Chegue perto de um boneco de treino.'); return; }
  if (Object.values(S.players).some(q => q !== p && q.train && q.train.i === best) || Object.values(S.npcs).some(n => n.dojoDummy === best)) { tell(p, 'Esse boneco está ocupado.'); return; }
  const d = DUMMIES[best];
  if (d.priv) { const AP = PROPS_BY['ap' + d.apt], r = AP && estateLoad().r[AP.id]; if (!(AP.suite && SUITE_OPEN) && (!r || r.owner !== estOwner(p))) { tell(p, 'Esse boneco é particular da suíte.'); return; } }
  else if (!dojoPaid(p)) return; if (!free) { p.x = d.fx; p.y = d.fy; }
  if (!free && p.cls === 'archer' && !p.sheathed && !(d.fl || 0)) { const ux = d.fx - d.x, uy = d.fy - d.y, ul = Math.hypot(ux, uy) || 1; for (const k of [3, 2.5, 2]) { const x = d.x + ux / ul * k, y = d.y + uy / ul * k; if (npcStand(x, y, 0.25) && WORLD.bld[tileAt(x, y)] === WORLD.bld[tileAt(d.x, d.y)]) { p.x = x; p.y = y; break; } } }   /* arqueiro: recua alguns passos para atirar */ p.sit = null; p.dir = dirFromVecS(d.x - d.fx, d.y - d.fy); p.train = { i: best, t0: now_(), next: now_() + 900, rest: false, x: p.x, y: p.y, hits: 0, gain: 0 };
  if (!free) Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: p.fl || 0, fb: p.fb ?? -1 }); Net.toOne(p.id, { t: 'train', on: 1, i: best, free: free ? 1 : 0 });
  const wk = trainKind(p, d); tell(p, (wk === 'bow' ? 'Flechas no boneco' : wk === 'fist' ? (d.t === 'makiwara' ? 'Socos no makiwara' : 'Socos e chutes no mokujin') : 'Golpes de ' + USE[wk].name.toLowerCase() + ' no boneco') + ': o personagem treina sem parar e descansa quando cansa. Ande para parar.' + (p.cls === 'mage' ? ' (O mago não aprende com os bonecos.)' : ''));
}
function trainKind(p, d) { if (p.sheathed || p.cls === 'mage') return 'fist'; if (p.cls === 'archer') return 'bow'; return p.wpn === 'halberd' ? 'halberd' : 'sword'; }   /* com a arma sacada treina a arma; guardada, os punhos */
function trainEnd(p, why) { const T = p.train; if (!T) return; p.train = null; Net.toOne(p.id, { t: 'train', on: 0 }); if (why) tell(p, why + (T.gain ? ' Treino: ' + T.hits + ' golpes.' : '')); sendStat(p); }
function trainTick(now) {
  for (const p of Object.values(S.players)) { const T = p.train; if (!T) continue;
    if (p.downed || p.bath || dist(p.x, p.y, T.x, T.y) > 0.6 || (p.fl || 0) !== (DUMMIES[T.i].fl || 0)) { trainEnd(p, 'Você parou de treinar.'); continue; }
    if (now < T.next) continue; const d = DUMMIES[T.i];
    if (T.rest) { if ((p.cst ?? 0) >= cstMaxOf(p) * 0.6) { T.rest = false; tell(p, 'Fôlego de volta: o treino continua.'); } T.next = now + 1000; continue; }
    if ((p.cst ?? 0) < 14) { T.rest = true; T.next = now + 1000; tell(p, 'Sem fôlego: o personagem para um pouco para respirar.'); continue; }
    const wk = trainKind(p, d), fist = wk === 'fist', bow = wk === 'bow';
    p.cst -= bow ? 5 : 7; p.food = Math.max(0, (p.food ?? 100) - 0.12); p.water = Math.max(0, (p.water ?? 100) - 0.1); T.hits++; T.next = now + (bow ? 1500 : fist ? 1100 : wk === 'halberd' ? 1500 : 1350);
    if (bow) { p.dir = dirFromVecS(d.x - p.x, d.y - p.y); const tt = Math.max(0.18, dist(p.x, p.y, d.x, d.y) / 9); anim('p', p, 'loose', d.x, d.y); near(p.x, p.y, { t: 'tarrow', i: T.i, x: p.x, y: p.y, tx: d.x, ty: d.y, fl: d.fl || 0, fb: d.bi ?? -1, T: +tt.toFixed(3), s: Math.random() }); near(d.x, d.y, { t: 'dummyhit', i: T.i, d: Math.round(tt * 1000) }); setTimeout(() => { if (S.players[p.id] && p.train) anim('p', p, 'nock', d.x, d.y); }, BOW.loose); }   /* flecha no boneco: voa em arco e crava */
    else { const a = fist ? (T.hits % 3 === 2 ? 'kick' : 'punch') : wk === 'halberd' ? 'swing' : (T.hits % 2 ? 'swing' : 'bash'); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a, tx: d.x, ty: d.y, ms: 700 }); near(d.x, d.y, { t: 'dummyhit', i: T.i, d: 260 }); }
    const partner = Object.values(S.npcs).some(o => o.task === 'partner' && o.partnerOf === p.id && dist(o.x, o.y, p.x, p.y) < 2.4);
    if (p.cls !== 'mage') { const k = wk; useGain(p, k, 0.3 * (partner ? 1.5 : 1)); if (d.t === 'mokujin' && p.cls === 'knight') useGain(p, 'parry', 0.12); T.gain++; if (T.hits % 10 === 0) sfx(p.x, p.y, '+ ' + USE[k].name, '#e8c060', 0); }
    if (T.hits % 4 === 0) sendStat(p);
  }
}
function bathEnd(p) {
  const B = p.bath; if (!B) return; p.bath = null; if (p.sit === 'g') p.sit = null; const now = now_(), secs = (now - B.t0) / 1000; if (p.bdrink) { p.bdrink = null; near(p.x, p.y, { t: 'bdrink', id: p.id, off: 1 }); }
  near(p.x, p.y, { t: 'bath', id: p.id, on: 0 });
  if ((B.full || 0) >= 15) { p.buffs.rested = now + 600000; p.buffs.warm = Math.max(p.buffs.warm || 0, now + 300000); tell(p, 'Banho tomado: Bem descansado (10 min: recupera vida e mana mais rápido e ganha um pouco mais de experiência) e quentinho por 5 minutos.'); sendStat(p); }
}
function bathTick(now) {
  for (const p of Object.values(S.players)) { const B = p.bath; if (!B) continue;
    if (!p.sit || p.downed || (p.fl || 0) === 0) { bathEnd(p); continue; }
    if (now - B.tick < 1000) continue; B.tick = now; if (p.bdrink && typeof bathDrinkTick === 'function') bathDrinkTick(p, now);
    { const T = tubRec(B.bi), lv = tubLv(T, Date.now()); if (lv < 0.25) { bathEnd(p); tell(p, 'A água escoou: você sai do ofurô.'); continue; } if (lv < 1 || T.cold) continue; B.full = (B.full || 0) + 1; }   /* os efeitos só com a banheira cheia e quente */
    const kk = B.mode === 'edge' ? 0.5 : 1; p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * 0.02 * kk))); p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 10 * kk); p.cold = 0;
    if (p.bleed) for (const k in p.bleed) p.bleed[k] = 0; if (p.infect === 1 && now - B.t0 > 5000) { p.infect = 0; p.infT = 0; tell(p, 'A água quente limpou as feridas: a febre passou.'); }
    sendStat(p); }
}
// ---------- elementos do mago e a muda ----------
const EL_BRANCH = { holy: 'Luz', water: 'Água', fire: 'Fogo', earth: 'Terra', wind: 'Ar' };
function elemStrength(p, el) { const br = (TREE.mage || []).find(b => b.name === EL_BRANCH[el]), T = p.tree || {}; const pts = br ? br.nodes.reduce((a, n) => a + (T[n.id] || 0), 0) : 0; return useLvl(p, 'el_' + el) + pts * 10; }   /* perícia (0-100) + 10 por ponto na árvore */
function strongestEl(p, among) { let best = among[0], bv = -1; for (const el of among) { const v2 = elemStrength(p, el); if (v2 > bv) { bv = v2; best = el; } } return best; }
const SAP_NEED = 25;   /* força de Terra para a água fazer nascer a muda */
function sapList() { S.estate.saps = S.estate.saps || []; return S.estate.saps; }
function sapsSend(to) { const m = { t: 'saps', l: sapList().map(s => ({ id: s.id, x: s.x, y: s.y, k: s.k, t: s.t, own: s.ownName, g: s.g || 0.2 })) }; if (to) Net.toOne(to, m); else Net.toAll(m); }
function sapTryWater(p, b, now) {   /* a Fonte sobre as flores do próprio mago faz nascer a muda */
  if (p.cls !== 'mage' || b.by !== p.id || b.sapDone) return false; if (elemStrength(p, 'earth') < SAP_NEED) return false;
  const key = estOwner(p), L = sapList(); if (L.some(s => s.owner === key)) { if (!p._sapWarn) { p._sapWarn = 1; tell(p, 'Você já tem uma muda plantada. Só uma por vez.'); } return false; }
  let x = Math.round(b.x), y = Math.round(b.y); { const T0 = (b.tiles || []).filter(i => WORLD.bld[i] < 0 && WORLD.ground[i] !== T.WATER); if (T0.length) { const cx = T0.reduce((a2, i) => a2 + i % MAP_W, 0) / T0.length, cy = T0.reduce((a2, i) => a2 + Math.floor(i / MAP_W), 0) / T0.length; T0.sort((i, j) => Math.hypot(i % MAP_W - cx, Math.floor(i / MAP_W) - cy) - Math.hypot(j % MAP_W - cx, Math.floor(j / MAP_W) - cy)); x = T0[0] % MAP_W; y = Math.floor(T0[0] / MAP_W); } }   /* nasce no meio do campo de flores */
  const k = strongestEl(p, ['earth', 'water', 'wind']); b.sapDone = 1;
  L.push({ id: 'sap' + now, x, y, owner: key, ownName: p.name, by: p.id, k, t: Date.now() }); estateSave(); sapsSend();
  near(x, y, { t: 'sapborn', x, y, k }); info(p, 'A água encontra as flores e uma muda rompe a terra! ' + ({ earth: 'Um pequeno carvalho', water: 'Um pequeno salgueiro', wind: 'Uma pequena cerejeira' })[k] + ' agora cura, devolve mana, protege e acalma os bichos em volta.'); useGain(p, 'el_earth', 3); return true;
}
function sapTick(now) {   /* a cada 2 s: bônus para quem está perto da muda */
  const L = (S.estate && S.estate.saps) || []; if (!L.length || now - (S.sapT || 0) < 2000) return; S.sapT = now;
  for (const s of L) { const R = 3.2; if (typeof sapGrowth === 'function') { const g = sapGrowth(s); if (g - (s.g || 0.2) >= 0.04) { s.g = g; sapsSend(); estateSave(); } }   /* a muda cresce */
    for (const q of Object.values(S.players)) { if (q.downed || (q.fl || 0) !== 0 || dist(q.x, q.y, s.x, s.y) > R) continue; let any = false;
      if (q.hp < q.maxHp) { const h = Math.max(2, Math.round(q.maxHp * 0.03)); q.hp = Math.min(q.maxHp, q.hp + h); sfx(q.x, q.y, '+' + h, '#7ad860', 60); any = true; }
      if ((q.mp || 0) < (q.maxMp || 0)) { q.mp = Math.min(q.maxMp, q.mp + Math.max(1, q.maxMp * 0.04)); any = true; }
      q.cst = Math.min(cstMaxOf(q), (q.cst ?? 0) + 15); q._sapT = now + 2600; q.buffs.sapling = now + 2600; if (any || 1) sendStat(q); }
    for (const m of Object.values(S.monsters)) { const d = MON[m.type]; if (!d || !d.beh || dist(m.x, m.y, s.x, s.y) > R + 1.5) continue; m.calmUntil = now + 2600; m.aggro = null; m.atk = null; m.flee = null; } }
}
function mageTick(now) {   /* brasa (animais recuam), flores (curam e acalmam) */
  bathTick(now); flameTick(now); autoTick(now); meditTick(now); sapTick(now); lightWellTick(now); mistTick(now); comboTick(now); if (typeof prazTick === 'function') prazTick(now); if (typeof tatTick === 'function') tatTick(now); if (typeof velTick === 'function') velTick(now); if (typeof courtTick === 'function') courtTick(now); if (typeof housesTick === 'function') housesTick(now); if (typeof infTick === 'function') infTick(now); if (typeof entTick === 'function') entTick(now); kneelTick(now); tubTick(now); if (typeof empTick === 'function') empTick(now); trainTick(now); dojoVisTick(now); dojoSenseiTick(now); duelTick(now);
  for (const p of Object.values(S.players)) {
    if (p.cls !== 'mage' || !buffOn(p, 'ember') || p.downed) continue;
    for (const m of Object.values(S.monsters)) { const d = MON[m.type]; if (!d || !d.beh || dist(p.x, p.y, m.x, m.y) > 3.5) continue; m.flee = { from: p.id, until: now + 1800 }; if (m.aggro === p.id) m.aggro = null; m.atk = null; }
  }
  if (S.blooms && S.blooms.length) {
    S.blooms = S.blooms.filter(b => b.until > now); if (now - (S.bloomT || 0) < 2000) return; S.bloomT = now;
    for (const b of S.blooms) {
      const by = S.players[b.by], k = (b.wet ? 2 : 1) * (1 + (by ? useBonus(by, 'el_earth') : 0));
      for (const q of Object.values(S.players)) { if (q.downed || (q.fl || 0) !== 0 || dist(q.x, q.y, b.x, b.y) > b.r) continue; const h = Math.max(1, Math.round(q.maxHp * 0.012 * k)); if (q.hp < q.maxHp) { q.hp = Math.min(q.maxHp, q.hp + h); sfx(q.x, q.y, '+' + h, '#9ad870', 60); } q.cst = Math.min(cstMaxOf(q), (q.cst ?? 0) + 6 * k); sendStat(q); }
      for (const m of Object.values(S.monsters)) { const d = MON[m.type]; if (!d || !d.beh || dist(m.x, m.y, b.x, b.y) > b.r + 1) continue; m.calmUntil = now + 2600; m.aggro = null; m.atk = null; m.flee = null; }
    }
  }
}
function monstersNear(x, y, r) { return Object.values(S.monsters).filter(m => dist(m.x, m.y, x, y) <= r); }

function execSkill(p, i, m, msg) {
  const sk = SKILLS[p.cls][i], now = now_();
  p._el = sk.el; setTimeout(() => { p._el = null; }, 0); if (p.cls === 'mage') useGain(p, 'magic', 2);
  if (sk.tgt && (!m || !S.monsters[m.id])) return;
  const tx = m ? m.x : p.x, ty = m ? m.y : p.y;
  const shout = { s: sk.name + '!' };
  switch (sk.id) {
    case 'bash': anim('p', p, 'bash', tx, ty, shout); hitMonster(p, m, 2.2, 220); m.stunUntil = now + 1400; break;
    case 'warcry':
      anim('p', p, 'warcry', tx, ty, shout); aoe('warcry', p.x, p.y); p.buffs.warcry = now + 6000;
      for (const q of monstersNear(p.x, p.y, 5)) { q.taunt = { pid: p.id, until: now + 6000 }; q.returning = false; }
      p.lastCombat = now; break;
    case 'whirl': anim('p', p, 'spin', tx, ty, shout); aoe('whirl', p.x, p.y, { id: p.id }); for (const q of monstersNear(p.x, p.y, 1.8)) hitMonster(p, q, 1.6, 250); break;
    case 'wall': anim('p', p, 'block', tx, ty, shout); aoe('wall', p.x, p.y, { id: p.id }); p.buffs.wall = now + 6000; break;
    case 'double': { const d = flight(p.x, p.y, m.x, m.y) + 180; anim('p', p, 'double', tx, ty, { ...shout, proj: 'arrow', d, n: 2 }); hitMonster(p, m, 1, d); hitMonster(p, m, 1, d + 160); break; }
    case 'pierce': {
      const dx = m.x - p.x, dy = m.y - p.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      anim('p', p, 'pierce', tx, ty, shout); aoe('pierce', p.x, p.y, { x2: p.x + ux * 8, y2: p.y + uy * 8 });
      for (const q of Object.values(S.monsters)) {
        const rx = q.x - p.x, ry = q.y - p.y, along = rx * ux + ry * uy;
        if (along < 0 || along > 8) continue;
        if (Math.abs(rx * uy - ry * ux) < 0.7) hitMonster(p, q, 1.8, 150 + along * 40);
      }
      break;
    }
    case 'rain': anim('p', p, 'rain', tx, ty, shout); aoe('rain', tx, ty); for (const q of monstersNear(tx, ty, 1.6)) hitMonster(p, q, 1.3, 650); break;
    case 'agile': anim('p', p, 'dash', tx, ty, shout); aoe('agile', p.x, p.y, { id: p.id }); p.buffs.agile = now + 6000; break;
    case 'ember': case 'windstep': case 'bloom': case 'faith': case 'spring': return mageSpell(p, sk, msg || {}, now);
    case 'fireball': { const d = flight(p.x, p.y, m.x, m.y) + 100; anim('p', p, 'fireball', tx, ty, { ...shout, proj: 'fire', d }); hitMonster(p, m, 2.6, d); setTimeout(() => fireballBoom(p, tx, ty, m.id), d); break; }
    case 'nova': anim('p', p, 'nova', tx, ty, shout); aoe('nova', p.x, p.y); for (const q of monstersNear(p.x, p.y, 2.5)) { q.slowUntil = now + 4000 * (1 + treeEff(p, 'slowDur')); hitMonster(p, q, 1.4, 200); } break;
    case 'heal':
      anim('p', p, 'heal', tx, ty, shout);
      for (const q of Object.values(S.players)) {
        if (dist(q.x, q.y, p.x, p.y) > 4) continue;
        if (q.downed) { revivePlayer(q, 0.25, p.name); continue; }
        const h = Math.min(q.maxHp - q.hp, Math.round((20 + p.lvl * 5 + q.maxHp * 0.15) * (1 + treeEff(p, 'holy'))));
        q.hp += h; aoe('heal', q.x, q.y, { id: q.id }); sfx(q.x, q.y, `+${h}`, '#7ad87a', 150); sendStat(q);
      }
      break;
    case 'meteor': anim('p', p, 'meteor', tx, ty, shout); aoe('meteor', tx, ty); for (const q of monstersNear(tx, ty, 2.5)) hitMonster(p, q, 3.2, 750); break;
  }
}

function usePot(p, k) {
  const now = now_();
  if (!ITEMS[k] || p.pots[k] <= 0 || now < p.potCd) return;
  p.potCd = now + 1000; p.pots[k]--;
  useGain(p, 'aid', 1);
  if (k === 'hp') { const h = Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * 0.35 * (1 + useBonus(p, 'aid')))); p.hp += h; sfx(p.x, p.y, `+${h}`, '#7ad87a'); }
  else { const h = Math.min(p.maxMp - p.mp, Math.ceil(p.maxMp * 0.4)); p.mp += h; sfx(p.x, p.y, `+${h}`, '#6a9ae8'); }
  aoe('potion', p.x, p.y, { id: p.id, k });
  sendStat(p);
}

// ---------------- NPCs ----------------
function npcAction(p, m) {
  if (m.duel) { duelMsg(p, { a: 'invite', id: m.n, bet: m.duel }); return; }
  if (m.n === 'st_dojo' && m.a === 'learn') { const M = SENSEI_MOVES[m.k], sen = S.npcs && S.npcs.st_dojo; if (!M || !sen || dist(p.x, p.y, sen.x, sen.y) > 3.5) return; p.feats = p.feats || {}; p.feats.mv = p.feats.mv || {};
    if (p.feats.mv[m.k]) { tell(p, 'Você já sabe ' + M.n + '.'); return; } if (useLvl(p, 'fist') < M.req) { tell(p, 'Mestre Tetsuo: "Seus punhos ainda não estão prontos. Treine no makiwara (Punhos ' + M.req + ')."'); return; } if (!canPay(p, M.p)) { tell(p, 'A aula custa ' + M.p + ' de ouro.'); return; }
    payCity(p, M.p); p.feats.mv[m.k] = 1; dojoEarn(M.p, p.name + ' aprendeu ' + M.n + ' (' + M.p + ').'); near(sen.x, sen.y, { t: 'anim', w: 'n', id: 'st_dojo', a: 'kata', ms: 2600 }); near(sen.x, sen.y, { t: 'anim', w: 'n', id: 'st_dojo', a: 'talk', txt: 'Observe... e repita mil vezes.', ms: 1 }); tell(p, 'Você aprendeu ' + M.n + ': ' + M.d); sendStat(p); return; }
  const n = NPCS.find(q => q.id === m.n);
  { const sn = S.npcs && S.npcs[m.n]; if (sn && (sn.dead || sn.downed)) { tell(p, sn.dead ? sn.name + ' está morto.' : sn.name + ' está caído e não responde.'); return; } }
  const inJail = n && n.id === 'jailer' && WORLD.bld[tileAt(p.x, p.y)] === BUILDINGS.findIndex(b => b.kind === 'jail');
  if (!n || (!inJail && dist(p.x, p.y, (S.npcs && S.npcs[n.id] ? S.npcs[n.id].x : n.x), (S.npcs && S.npcs[n.id] ? S.npcs[n.id].y : n.y)) > 3.5)) { tell(p, 'Chegue mais perto para conversar.'); return; }
  if (n.id === 'jailer' && m.a === 'segbail') { Net.toOne(p.id, { t: 'npc', n: n.id, text: typeof segBail === 'function' ? segBail(p) : 'Hoje não.' }); return; }
  if (n.id === 'jailer' && m.a === 'bail') {
    const q = S.players[m.who || p.id]; if (!q || !(q.jailUntil > now_())) { Net.toOne(p.id, { t: 'npc', n: n.id, text: 'Esse aí não está preso.' }); return; }
    const price = bailPrice(q); if (!canPay(p, price)) { Net.toOne(p.id, { t: 'npc', n: n.id, text: 'A fiança é ' + price + ' de ouro. Você não tem o bastante.' }); return; }
    payCity(p, price); releasePlayer(q, (q === p ? 'Você pagou' : p.name + ' pagou') + ' a fiança de ' + price + ' de ouro. Está livre.'); Net.toOne(p.id, { t: 'npc', n: n.id, text: 'Fiança paga: ' + price + ' de ouro. Pode ir.' }); sendStat(p); return;
  }
  const say = text => Net.toOne(p.id, { t: 'npc', n: n.id, text });
  const pay = cost => { if (!canPay(p, cost)) { say('Você não tem ouro suficiente (banco + bolsa).'); return false; } payCity(p, cost); { const NB = !npcBiz(S.npcs && S.npcs[n.id]) && npcbOfNpc(S.npcs && S.npcs[n.id]); if (NB) { NB.cofre += cost; NB.today.rev += cost; NB.today.sold++; NB.today.pl = (NB.today.pl || 0) + cost; } } const rb = npcBiz(S.npcs && S.npcs[n.id]); if (rb && rb.owner !== estOwner(p)) { rb.biz.cofre += cost; rb.biz.today.rev += cost; bizLog(rb.biz, p.name + ' pagou ' + cost + ' de ouro a ' + n.name.split(',')[0] + '.'); } return true; };
  const now = now_();
  if (m.a === 'buyl' && LOOT[m.item] && ((n.id === 'merchant' && ['bread', 'ointment', 'firewood', 'rope', 'lockpick', 'axe', 'pickaxe', 'sickle'].includes(m.item)) || (n.id === 'fruit' && ['apple', 'berries'].includes(m.item)))) {
    const qty = m.qty === 5 ? 5 : 1; if (!p.inv[m.item] && Object.keys(p.inv).length >= INV_SLOTS) { say('Sua mochila está cheia.'); return; }
    if (!pay(LOOT[m.item].price * qty)) return; p.inv[m.item] = (p.inv[m.item] || 0) + qty; say(qty + 'x ' + LOOT[m.item].name + '. Bom proveito.');
  } else if (n.id === 'priest' && m.a === 'treset') {
    if (!treePts(p)) { say('Você ainda não aprendeu nenhum talento.'); return; }
    if (!pay(20 * p.lvl)) return; p.tree = {}; p.maxHp = maxHpOf(p); p.maxMp = maxMpOf(p); p.hp = Math.min(p.hp, p.maxHp); p.mp = Math.min(p.mp, p.maxMp);
    say('Respire fundo e esqueça... Seus pontos de talento voltaram para você.');
  } else if (n.id === 'merchant' && m.a === 'buy' && m.item === 'water') {
    if (!pay(ITEMS.water.price)) return; p.hasSkin = true; p.pots.water = 5; say('Um odre cheio. Encha em rios, poços e fontes.');
  } else if (n.id === 'merchant' && m.a === 'buy' && ITEMS[m.item]) {
    const qty = m.qty === 5 ? 5 : 1;
    if (!pay(ITEMS[m.item].price * qty)) return;
    p.pots[m.item] += qty;
    say(`${qty}x ${ITEMS[m.item].name}. Boa caçada, e volte inteiro.`);
  } else if (n.id === 'merchant' && m.a === 'sell') {
    let total = 0, n2 = 0;
    for (const k in p.inv) { if (!LOOT[k] || (m.item && m.item !== k) || (!m.item && ['bread', 'cookedmeat', 'ointment', 'firewood', 'berries', 'herb', 'apple', 'stew', 'pie', 'tea'].includes(k))) continue; total += LOOT[k].price * p.inv[k]; n2 += p.inv[k]; delete p.inv[k]; }
    if (!n2) { say('Você não tem nada que me interesse agora.'); return; }
    p.gold += total;
    say(`Fechado: ${n2} ${n2 > 1 ? 'itens' : 'item'} por ${total} de ouro. Traga mais quando puder.`);
  } else if (n.id === 'priest' && m.a === 'donate') {
    if (!pay(25)) return; repAdd(p, 'cidade', 3, 'doou à capela'); repAdd(p, 'nobres', 1); say('Que a Aurora retribua sua bondade. A cidade não esquece quem ajuda.');
  } else if (n.id === 'smith' && m.a === 'repair') {
    if ((p.shieldHp ?? 100) >= 100) { say('Esse escudo está inteiro. Volte quando ele apanhar.'); return; }
    if (!pay(15)) return; p.shieldHp = 100; say('Tábuas novas, rebites no lugar e o aro desamassado. Pronto para mais.');
  } else if (n.id === 'smith' && m.a === 'prosth') {
    const part = ['legL', 'legR', 'armA', 'armB'].find(k => (p.lost || 0) & LOST[k] && !((p.pro || 0) & LOST[k]));
    if (!part) { say('Você está inteiro. Volte se precisar de mim.'); return; }
    if (!pay(PROSTH_PRICE)) return;
    p.pro = (p.pro || 0) | LOST[part]; p.bleed[part] = 0;
    say(part.startsWith('leg') ? 'Perna de pau de carvalho, presa com couro e ferro. Não vai correr, mas anda.' : 'Um gancho de ferro bem preso. Não segura espada, mas fere.');
  } else if (n.id === 'priest' && m.a === 'ritual') {
    if (!(p.lost & 30)) { say('A Aurora vê que você está inteiro.'); return; }
    if (!p.freeLimb) { p.freeLimb = true; say('A primeira vez a Aurora concede de graça. Da próxima, ' + RITUAL_PRICE + ' de ouro para o templo.'); } else if (!pay(RITUAL_PRICE)) return;
    p.lost = 0; p.pro = 0; for (const k of BODY_PARTS) { p.body[k] = 100; p.bleed[k] = 0; } aoe('heal', p.x, p.y, { id: p.id });
    say('Pelo fogo da Aurora, o que foi tirado volta a ser seu. Não desperdice este milagre.');
  } else if (n.id === 'priest' && m.a === 'bless') {
    p.hp = p.maxHp; p.mp = p.maxMp; p.buffs.bless = now + 180000;
    if (p.body) for (const k of BODY_PARTS) { if ((p.lost || 0) & (LOST[k] || 0)) continue; p.body[k] = 100; p.bleed[k] = 0; }   // a sacerdotisa trata todas as feridas
    p.infect = 0; p.infT = 0; p.cold = 0;
    aoe('heal', p.x, p.y, { id: p.id });
    say('Que a Aurora guarde seus passos. Suas feridas estão fechadas, e a bênção reduz o dano que você recebe por algum tempo.' + ((p.lost || 0) & 30 ? ' O que foi arrancado do seu corpo, só o Ritual da Aurora devolve: peça a mim.' : '')); sendStat(p);   /* o corpo volta ao normal na hora */
  } else if (n.id === 'st_apoth' && m.a === 'consult') {   /* Boticário de Elva: consulta, chá e encomendas */
    if (!pay(5)) return; const out = [];
    for (const bp of BODY_PARTS) { if ((p.lost || 0) & (LOST[bp] || 0)) { out.push(BODY_NAMES[bp] + ': perdido' + ((p.pro || 0) & LOST[bp] ? ' (com prótese)' : ' — o ferreiro faz próteses')); continue; } const st = PART_STATE(p.body ? p.body[bp] : 100); if (st > 0 || (p.bleed && p.bleed[bp])) out.push(BODY_NAMES[bp] + ': ' + PART_STATE_NAMES[st] + (p.bleed && p.bleed[bp] ? ', sangrando' : '')); }
    const tips = []; if (BODY_PARTS.some(bp => p.bleed && p.bleed[bp])) tips.push('estanque o sangue com bandagem (B) ou com a minha pomada'); if (BODY_PARTS.some(bp => PART_STATE(p.body ? p.body[bp] : 100) >= 1)) tips.push('a Pomada de Elva recupera os membros (encomende aqui)'); if (BODY_PARTS.some(bp => PART_STATE(p.body ? p.body[bp] : 100) >= 3)) tips.push('osso quebrado: descanse na cama ou peça à sacerdotisa'); if (p.infect) tips.push('você está com infecção: tome unguento ou chá'); if ((p.cold || 0) > 40) tips.push('está gelado: um chá quente resolve');
    say(out.length || p.infect ? 'Deixa eu ver... ' + (out.join('; ') || 'nenhum ferimento') + (p.infect ? '; infecção' : '') + '. ' + (tips.length ? 'Meu conselho: ' + tips.join('; ') + '.' : '') : 'Você está inteiro! Volte quando a caça apertar.');
  } else if (n.id === 'st_apoth' && m.a === 'tea') {
    if (!pay(4)) return; p.infect = Math.max(0, (p.infect || 0) - 1); p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.2)); p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 80); p.cold = 0; p.buffs.warm = Math.max(p.buffs.warm || 0, now + 180000); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'drinkb', ms: 1600 });
    say('Camomila, sálvia e um tantinho de gengibre da estufa. Esquenta o corpo e acalma as feridas.');
  } else if (n.id === 'st_apoth' && m.a === 'order') {
    const R = { salve: { herb: 2, gold: 10, h: 2, n: 'Pomada de Elva', q: 2 }, elixir: { herb: 3, gold: 12, h: 3, n: 'Poções de vida', q: 2 } }[m.k]; if (!R) return; const E = estateLoad(), O = E.apoth || (E.apoth = {}), key = estOwner(p);
    if (O[key]) { say('Já tenho uma encomenda sua no fogo: ' + O[key].n + '. Volte para buscar.'); return; } if ((p.inv.herb || 0) < R.herb) { say('Preciso de ' + R.herb + ' ervas medicinais para isso. A Horta da Vila tem, ou você colhe no mato.'); return; } if (!pay(R.gold)) return;
    p.inv.herb -= R.herb; if (!p.inv.herb) delete p.inv.herb; O[key] = { k: m.k, n: R.n, q: R.q, at: gameNow() + R.h * BIZ_HOUR_MS }; estateSave(); sendStat(p);
    say('Combinado! ' + R.n + ' fica pronto em ' + R.h + ' horas do jogo. Pode passear que eu cuido da destilação.');
  } else if (n.id === 'st_apoth' && m.a === 'pickup') {
    const E = estateLoad(), O = E.apoth || (E.apoth = {}), key = estOwner(p), J = O[key]; if (!J) { say('Não tenho nenhuma encomenda sua.'); return; }
    if (gameNow() < J.at) { say('Ainda está no alambique: falta mais ou menos ' + Math.max(1, Math.ceil((J.at - gameNow()) / BIZ_HOUR_MS)) + ' hora(s) do jogo.'); return; }
    if (J.k === 'salve') { if (!p.inv.salve && Object.keys(p.inv).length >= INV_SLOTS) { say('Sua mochila está cheia.'); return; } p.inv.salve = (p.inv.salve || 0) + J.q; } else p.pots.hp = (p.pots.hp || 0) + J.q;
    delete O[key]; estateSave(); sendStat(p); say('Aqui está: ' + J.q + ' ' + J.n + '. Use com sabedoria!');
  } else if (n.id === 'innkeeper' && (m.a === 'mead' || m.a === 'firemead')) {
    if (!pay(12)) return; fireMead(p, now);
    say('Hidromel de Fogo! Feito com pimenta das montanhas, igual ao que o dragão bebeu. Segura a faísca!');
  } else if (n.id === 'innkeeper' && m.a === 'stew') {
    if (!pay(10)) return;
    p.hp = p.maxHp; p.mp = p.maxMp; p.food = 100; p.water = 100; p.cold = 0;
    say('Ensopado da casa, receita da minha avó anã. Coma com calma.');
  } else if (n.id === 'innkeeper' && m.a === 'tonel') {
    if (tonelBusy(p.id)) { say('Você já está num desafio! Beba!'); return; } if (!pay(10)) return; tonelStart(p, null, 0, true);
    say('Cinco canecas, uma a cada rodada. Se ficar de pé até a quinta, leva 40 de ouro e o nome no quadro. Se cair... eu conto para todo mundo.');
  } else if (n.id === 'innkeeper' && m.a === 'toneln') {
    const bet = [20, 50].includes(m.bet) ? m.bet : 20, tav = TAV_BI();
    const opp = Object.values(S.npcs).filter(q => q.transient && !q.bard && !q.dead && !q.downed && WORLD.bld[tileAt(q.x, q.y)] === tav && !(q.drunkT > now) && !tonelBusy(q.id)).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
    if (!opp) { say('Não tem freguês sóbrio o bastante para te encarar agora. Volte à noite, quando a casa enche.'); return; }
    if (tonelBusy(p.id)) { say('Você já está num desafio! Beba!'); return; } if (!pay(bet)) return; tonelStart(p, { k: 'n', id: opp.id }, bet, false);
    say(opp.name.split(',')[0] + ' aceitou! Aposta de ' + bet + ' de ouro. Quem cair primeiro perde.');
  } else if (n.id === 'innkeeper' && m.a === 'tonelp') {
    const q = S.players[m.who], bet = [20, 50].includes(m.bet) ? m.bet : 20;
    if (!q || q === p || dist(q.x, q.y, p.x, p.y) > 6) { say('Essa pessoa não está aqui.'); return; } if (!canPay(p, bet)) { say('Você não tem ' + bet + ' de ouro para apostar.'); return; }
    S.tonelInv = S.tonelInv || {}; S.tonelInv[q.id] = { from: p.id, bet, until: now + 60000 }; Net.toOne(q.id, { t: 'tonelinv', from: p.id, name: p.name, bet });
    tell(q, '🍺 ' + p.name + ' te desafiou para o Tonel (aposta de ' + bet + ' de ouro). Fale com o Brom para aceitar.'); say('Desafio mandado para ' + q.name + '. Se aceitar, começamos.');
  } else if (n.id === 'innkeeper' && m.a === 'tonelok') {
    const I = S.tonelInv && S.tonelInv[p.id], A = I && S.players[I.from]; if (!I || now > I.until || !A) { say('Esse desafio já esfriou.'); return; } delete S.tonelInv[p.id];
    if (tonelBusy(p.id) || tonelBusy(A.id)) { say('Um de vocês já está num desafio.'); return; } if (!canPay(p, I.bet) || !canPay(A, I.bet)) { say('Alguém aqui não tem o ouro da aposta.'); return; }
    payCity(p, I.bet); payCity(A, I.bet); sendStat(p); sendStat(A); tonelStart(A, { k: 'p', id: p.id }, I.bet, false); say('Apostado! Sentem-se e bebam.');
  } else if (n.id === 'innkeeper' && m.a === 'champs') {
    const T = (S.estate && S.estate.tonel) || []; say(T.length ? 'Campeões do Tonel: ' + T.map((e, i) => (i + 1) + '. ' + e.n + ' (' + e.r + ' canecas)').join(' · ') : 'O quadro ainda está vazio. Quer ser o primeiro?');
  } else if (n.id === 'innkeeper' && m.a === 'legend') {
    say('Faz muitos invernos, um dragão verde desceu sobre Nae. Em vez de fogo, sentiu o cheiro do nosso tonel de hidromel... bebeu tudo, deitou no telhado e dormiu. Ronca até hoje, juro pela minha barba! Venha ouvir o bardo cantar a lenda inteira à noite: dizem que dá sorte.');
  } else if (n.id === 'innkeeper' && m.a === 'rumor') {
    say(pick(RUMORS));
  } else if (n.id === 'smith' && m.a === 'whet') {
    if (!pay(25)) return;
    p.buffs.whet = now + 240000;
    say('Pronto. Fio de navalha. Vai cortar como se fosse nova por uns quatro minutos (+15% de dano).');
  } else if (n.id === 'smith' && m.a === 'talk') {
    say(pick(['Aço bom não se apressa. Nem guerreiro bom.', 'Os orcs a oeste usam ferro ruim, mas batem forte. Mantenha o escudo alto.', 'Essa cidadela já caiu uma vez. Não vai cair de novo enquanto eu tiver carvão.']));
  } else if (n.id === 'captain' && m.a === 'quest') {
    const q = QUESTS.find(x => x.id === m.id);
    if (!q) return;
    if (p.quests[q.id] != null) { say(`Você já está nessa: ${p.quests[q.id]}/${q.count}.`); return; }
    if (Object.keys(p.quests).length >= MAX_ACTIVE_QUESTS) { say(`Uma coisa de cada vez. No máximo ${MAX_ACTIVE_QUESTS} contratos ao mesmo tempo.`); return; }
    p.quests[q.id] = 0;
    say(`Contrato aceito: ${q.name}. Recompensa de ${q.xp} xp e ${q.gold} de ouro quando terminar.`);
  } else if (n.id === 'captain' && m.a === 'abandon') {
    delete p.quests[m.id];
    say('Contrato cancelado. Sem ressentimentos.');
  }
  sendStat(p);
}

// ---------------- monstros (movimento livre) ----------------
function moveToward(m, tx, ty, step) {
  const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
  if (d < 0.02) return true;
  const s = Math.min(d, step), nx = m.x + dx / d * s, ny = m.y + dy / d * s;
  const sdx = (nx - m.x) - (ny - m.y);
  if (Math.abs(sdx) > 0.001) m.face = sdx > 0 ? 1 : -1;
  if (monStand(nx, ny, m)) { m.x = nx; m.y = ny; return true; }
  if (monStand(nx, m.y, m)) { m.x = nx; return true; }
  if (monStand(m.x, ny, m)) { m.y = ny; return true; }
  return false;
}
function clearLine(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.4);
  for (let k = 1; k < n; k++) { const t = k / n; if (!canStand(ax + (bx - ax) * t, ay + (by - ay) * t, 0, 0.25)) return false; }
  return true;
}
function tilePath(sx, sy, tx, ty, maxNodes = 400) {
  sx = Math.round(sx); sy = Math.round(sy); tx = Math.round(tx); ty = Math.round(ty);
  const key = (x, y) => y * MAP_W + x, start = key(sx, sy), prev = new Map([[start, -1]]), q = [[sx, sy]];
  for (let qi = 0; qi < q.length && qi < maxNodes; qi++) {
    const [x, y] = q[qi];
    if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= 1) {
      const path = []; let k = key(x, y);
      while (k !== start) { path.push([k % MAP_W, Math.floor(k / MAP_W)]); k = prev.get(k); }
      return path.reverse();
    }
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || !walkableTile(nx, ny) || inSafe(nx, ny)) continue;
      if (dx && dy && (!walkableTile(x + dx, y) || !walkableTile(x, y + dy))) continue;
      prev.set(k, key(x, y)); q.push([nx, ny]);
    }
  }
  return null;
}
function chase(m, tx, ty, step, now) {
  if (clearLine(m.x, m.y, tx, ty)) { m.path = null; moveToward(m, tx, ty, step); return; }
  if (!m.path || now > m.pathT) { m.path = tilePath(m.x, m.y, tx, ty); m.pathT = now + 700; }
  if (m.path && m.path.length) {
    const [wx, wy] = m.path[0];
    moveToward(m, wx, wy, step);
    if (dist(m.x, m.y, wx, wy) < 0.25) m.path.shift();
  }
}

function monsterThink(m, players, now, dt) {
  const d = MON[m.type];
  if (m.atk) { const A = m.atk; if (!A.done && now >= A.t0 + A.W) { A.done = true; resolveMonStrike(m, A, now); } if (now >= A.t0 + A.W + A.R + A.C) m.atk = null; else return; }
  if (d.dragon) return dragonThink(m, players, now, dt);
  if (m.gripBy) { const g = S.players[m.gripBy]; if (!g || !g.drag || g.drag.id !== m.id || now > m.escAt) { m.gripBy = null; m.dragBy = null; if (g && g.drag && g.drag.id === m.id) stopDrag(g, MON[m.type].name + ' se soltou!'); m.stunUntil = 0; } else return; }
  if (now < m.stunUntil) return;
  if (m.dragging && wolfDragTick(m, now, dt)) return;
  if ((m.carrying || m.carryWant || m.leadP) && captorTick(m, now, dt)) return;
  const speed = d.speed * (now < m.slowUntil ? 0.5 : 1) * (now < (m.fslowUntil || 0) ? m.fslowK || 0.5 : 1) * ((m.lost || 0) & 24 ? 0.4 : 1), step = speed * dt;
  const homeDist = dist(m.x, m.y, m.homeX, m.homeY);
  const reach = d.big ? 1.7 : 1.3;
  if (m.returning) {
    if (homeDist <= 1.5) { m.returning = false; m.aggro = null; }
    else chase(m, m.homeX, m.homeY, step * 1.1, now);
    return;
  }
  // fauna que foge: ao ser atacada, corre para longe de quem atacou
  if (d.beh === 'flee' && m.aggro) { m.flee = { from: m.aggro, until: now + 4500 }; m.aggro = null; }
  if (m.flee && m.flee.until > now) {
    const pl = S.players[m.flee.from];
    if (pl) { const ax = m.x - pl.x, ay = m.y - pl.y, l = Math.hypot(ax, ay) || 1; if (!moveToward(m, m.x + ax / l * 2, m.y + ay / l * 2, step * 1.35)) { const a = Math.random() * 6.28; moveToward(m, m.x + Math.cos(a), m.y + Math.sin(a), step); } }
    m.wander = null; return;
  }
  let tgt = null;
  const pred = d.beh === 'pred';
  const valid = p => p && !p.dev && !buffOn(p, 'smoke') && (!p.downed || (pred && !p.carriedBy)) && p.z < 0.5 && !inSafe(p.x, p.y);
  // lobo: sempre caça quem está de joelhos ou caído; quem está cansado, 50% de chance (sorteio renovado a cada 8 s)
  const prey = p => {
    if (!pred) return true;
    if (p.downed || p.hp < p.maxHp * KNEEL_HP) return true;
    if (p.hp < p.maxHp * 0.6 || p.tired) { m.prey = m.prey || {}; let r = m.prey[p.id]; if (!r || now > r.t) r = m.prey[p.id] = { ok: Math.random() < 0.5, t: now + 8000 }; return r.ok; }
    return false;
  };
  if (m.taunt && m.taunt.until > now && valid(S.players[m.taunt.pid])) tgt = S.players[m.taunt.pid];
  if (!tgt && m.aggro) { const q = S.players[m.aggro], ok = q && !q.dev && !buffOn(q, 'smoke') && !inMist(q, m) && (!q.downed || (pred && !q.carriedBy)) && q.z < 0.5;
    if (ok) { const dq = dist(m.x, m.y, q.x, q.y), sees = dq <= 16 && (dq < 4 || sightClear(m.x, m.y, q.x, q.y)); if (sees) m.lostAt = 0; else m.lostAt = m.lostAt || now; if (sees || now - m.lostAt < 5000) tgt = q; else { m.aggro = null; m.lostAt = 0; m.returning = true; } } else m.aggro = null; }
  if (!tgt) {
    let best = 99;
    if (d.aggro > 0 && !(m.calmUntil > now)) for (const p of players) { if (!valid(p) || !prey(p) || inMist(p, m)) continue; const dd = dist(m.x, m.y, p.x, p.y); if (dd <= d.aggro * (p.crouch ? 0.5 * (1 - treeEff(p, 'stealth')) : 1) && dd < best) { best = dd; tgt = p; } }
  }
  if (tgt) {
    if (homeDist > 13 && !m.aggro) { m.returning = true; m.taunt = null; return; }   // só volta à toca quem não está perseguindo ninguém
    const dd = dist(m.x, m.y, tgt.x, tgt.y);
    const sdx = (tgt.x - m.x) - (tgt.y - m.y); if (Math.abs(sdx) > 0.05) m.face = sdx > 0 ? 1 : -1;
    if (d.thrower && dd > 2.6 && dd < 7 && now >= (m.cdThrow || 0) && now >= m.nextAtk) {
      m.cdThrow = now + 6500 + Math.random() * 4000; m.nextAtk = now + 1200;
      const tx = tgt.x, ty = tgt.y, ms = 320 + dd * 75;
      anim('m', m, 'bite', tx, ty); near(m.x, m.y, { t: 'throwfx', o: O.ROCK, fx: m.x, fy: m.y, tx, ty, ms, big: d.big ? 1 : 0 });
      setTimeout(() => { if (!S.monsters[m.id] || tgt.downed || dist(tgt.x, tgt.y, tx, ty) > 1.1) return; damagePlayer(tgt, Math.round(rint(d.dmg[0], d.dmg[1]) * 1.15), m, 0); }, ms);
    } else if (pred && tgt.downed && dd <= reach + 0.5) {
      if (now >= m.nextAtk) { m.nextAtk = now + 1600; anim('m', m, 'bite', tgt.x, tgt.y); damagePlayer(tgt, 0, m, 0); }
    } else if (dd <= reach + 0.25) {
      if (now >= m.nextAtk && now >= (m.stunUntil || 0)) startMonStrike(m, tgt, now);
    } else {
      chase(m, tgt.x, tgt.y, step, now);
      m.nextAtk = Math.max(m.nextAtk, now + 300);
    }
    m.wander = null;
  } else {
    // patrulha: anda em volta do bastião, de ponto em ponto
    if (m.patrol) { const P = m.patrol, t = P.pts[P.i]; if (!moveToward(m, t[0], t[1], step * 0.5) || dist(m.x, m.y, t[0], t[1]) < 0.6) P.i = (P.i + 1) % P.pts.length; m.homeX = m.x; m.homeY = m.y; return; }
    if (now < m.waitUntil) return;
    if (!m.wander) {
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 4;
      const wx = m.homeX + Math.cos(a) * r, wy = m.homeY + Math.sin(a) * r;
      if (zoneAt(wx, wy) === m.zone && canStand(wx, wy, 0, 0.3)) m.wander = [wx, wy]; else { m.waitUntil = now + 1000; return; }
    }
    const ok = moveToward(m, m.wander[0], m.wander[1], step * 0.45);
    if (!ok || dist(m.x, m.y, m.wander[0], m.wander[1]) < 0.1) { m.wander = null; m.waitUntil = now + 1500 + Math.random() * 4000; }
  }
}

// ---------------- DESMEMBRAMENTO E QUEDAS ----------------
function severPart(k, lost) { const c = (SEVER_FROM[k] || []).filter(([pt]) => !(lost & LOST[pt])); if (!c.length) return null; let r = Math.random() * c.reduce((s, x) => s + x[1], 0); for (const [pt, w] of c) { if ((r -= w) <= 0) return pt; } return c[0][0]; }
function severPlayer(q, part, by) {
  if (!part || q.dev || q.downed) return;
  q.lost = (q.lost || 0) | LOST[part]; q.pro = (q.pro || 0) & ~LOST[part];
  if (part !== 'head') { q.body[part] = 0; q.bleed[part] = 2; }
  near(q.x, q.y, { t: 'sever', k: 'p', id: q.id, part, x: q.x, y: q.y, ax: by.x, ay: by.y });
  if (part === 'head') { q.decap = true; goDown(q, by); q.downed.until = now_() + 1500; tell(q, 'Você foi decapitado.'); }
  else tell(q, 'Você perdeu ' + LOST_NAMES[part] + '! Estanque o sangue (B) ou morra.');
  sendStat(q);
}
function knockPlayer(p, by, now) {
  if (p.dev || p.downed || now < (p.knockUntil || 0) || buffOn(p, 'iron')) return;
  p.knockUntil = now + KNOCK_MS; p.parry = null; p.atk = null; p.stunUntil = now + KNOCK_MS;
  near(p.x, p.y, { t: 'knock', k: 'p', id: p.id, ax: by.x, ay: by.y, ms: KNOCK_MS }); sendStat(p);
}
function knockMon(q, by, now) {
  q.stunUntil = Math.max(q.stunUntil, now + 1500); q.atk = null; q.nextAtk = now + 1700;
  near(q.x, q.y, { t: 'knock', k: 'm', id: q.id, ax: by.x, ay: by.y, ms: 1500 });
}
// ---------------- COMBATE DIRECIONAL ----------------
const inArc = (ox, oy, a, x, y, reach, arc, rad = 0) => { const d = Math.hypot(x - ox, y - oy); return d <= reach + rad && Math.abs(angDiff(Math.atan2(y - oy, x - ox), a)) <= arc + (rad > 0 ? Math.atan2(rad, Math.max(0.3, d)) : 0); };
function startMonStrike(m, tgt, now) {
  const d = MON[m.type], MM = MON_MELEE[m.type], k = MM ? pick(MM.s) : 'bite', B = STRIKES[k];
  const W = Math.round(B.W * (MM ? MM.W : 1)), reach = (MM ? B.reach : B.reach) + (d.big ? 0.5 : 0), a = Math.atan2(tgt.y - m.y, tgt.x - m.x);
  m.atk = { k, t0: now, a, W, R: B.R, C: B.C, reach, arc: B.arc, tgt: tgt.id };
  m.nextAtk = now + W + B.R + B.C + d.atk * 0.35;
  anim('m', m, MM ? 'atk_' + k : 'bite', tgt.x, tgt.y, { ms: W + B.R + B.C, W, ang: a, reach, arc: B.arc });
}
function resolveMonStrike(m, A, now) {
  const d = MON[m.type];
  for (const p of Object.values(S.players)) {
    if (p.dev || p.downed || Math.abs((p.z || 0) - (m.z || 0)) >= 0.5 || !inArc(m.x, m.y, A.a, p.x, p.y, A.reach, A.arc)) continue;
    if (now < (p.dodgeUntil || 0)) { near(p.x, p.y, { t: 'whiff', id: p.id }); continue; }       // esquivou
    if (Math.random() < treeEff(p, 'evade')) { near(p.x, p.y, { t: 'whiff', id: p.id }); continue; }   // reflexos (talento)
    const toM = Math.atan2(m.y - p.y, m.x - p.x);
    const BK = blockEval(p, A.k, m.x, m.y, A.a, now, A.W);
    if (BK && BK.okZ) {
      const perfect = BK.perfect; useGain(p, 'parry', perfect ? 3 : 1); if (BK.shield) shieldWear(p, d.big ? 9 : 3);
      if (perfect) { m.stunUntil = now + 850; m.nextAtk = Math.max(m.nextAtk, now + 900); p.ripUntil = now + RIPOSTE_MS; p.cst = Math.min(cstMaxOf(p), p.cst + 5); near(p.x, p.y, { t: 'clang', x: (p.x + m.x) / 2, y: (p.y + m.y) / 2, perfect: 1, id: m.id }); }
      else { p.cst -= (BK.shield ? 4 + (d.big ? 9 : 2) : 10 + (d.big ? 18 : 6)) * ((p.lost || 0) & LOST.armB ? 1.6 : 1) * (1 - useBonus(p, 'parry')); near(p.x, p.y, { t: 'clang', x: (p.x + m.x) / 2, y: (p.y + m.y) / 2 }); if (p.cst <= 0) guardBreak(p, now); }
      sendStat(p); continue;
    }
    const partial = BK && BK.shield ? 0.75 : 1;   // escudo na direção errada ainda amortece um pouco
    const crit = MON_MELEE[m.type] && A.k !== 'stab' && A.k !== 'bite' && Math.random() < (d.big ? 0.12 : 0.07);
    damagePlayer(p, Math.round(rint(d.dmg[0], d.dmg[1]) * STRIKES[A.k].mult * ((m.lost || 0) & 6 ? 0.4 : 1) * (crit ? 1.6 : 1) * partial), m, 0, STRIKES[A.k].zone);
    const svp = crit && !p.downed ? severPart(A.k, p.lost || 0) : null;
    if (svp && svp !== 'head' && (p.body[svp] ?? 100) <= 30 && Math.random() < 0.5) severPlayer(p, svp, m);
    else if (d.big && !p.downed && Math.random() < 0.35 * Math.max(0, 1 - treeEff(p, 'knockRes'))) knockPlayer(p, m, now);
    if (d.drain && !p.downed) { p.mp = Math.max(0, p.mp - d.drain); sendStat(p); }
    if (p.atk && !p.atk.done) { p.atk = null; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'hurt' }); }   // levar golpe interrompe a preparação
    if (A.k !== 'stab' && A.k !== 'bite') break;   // golpes de arma acertam um alvo
  }
}
function guardBreak(p, now) { p.parry = null; p.cst = 0; p.stunUntil = now + 950; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'hurt', ms: 950 }); tell(p, 'Sua guarda quebrou!'); sendStat(p); }
// golpe do jogador: começa a preparação; o impacto é resolvido no laço principal
function playerStrike(p, k, a, now, c = 0) {
  const B = STRIKES[k]; if (!B || k === 'bite' || p.downed || p.carrying || p.lifted || p.casting || now < (p.stunUntil || 0) || now < (p.knockUntil || 0) || (p.fl || 0) !== 0) return;
  if (p.atk) {
    if (!p.atk.done && now < p.atk.t0 + p.atk.W && p.atk.k !== k && p.cst >= FEINT_COST) { p.cst -= FEINT_COST; }   // finta: troca de golpe no meio da preparação
    else return;
  } else if (p.cst < B.st) { tell(p, 'Sem fôlego.'); return; }
  else { p.cst -= B.st; useGain(p, 'breath', B.st / 10); }
  if (now < (p.sheT || 0)) return;
  const fist = (p.sheathed && p.cls !== 'mage') || !!p.duel;
  const M = MELEE[p.cls] || MELEE.knight, rip = now < (p.ripUntil || 0);
  const WP = fist ? FIST : p.cls === 'knight' ? WEAPONS[p.wpn || 'sword'] : WEAPONS.sword, ch = isFinite(c) ? clamp(c, 0, 1) : 0;
  let comboHit = false; if (fist && hasMove(p, 'combo')) { p.combo = (p.combo || []).filter(t => now - t < 1400); p.combo.push(now); if (p.combo.length >= 3) { comboHit = true; p.combo = []; sfx(p.x, p.y, 'Sequência!', '#f0c060', 200); } }
  const W = Math.round(B.W * M.spd * WP.spd * (rip ? 0.55 : 1) * (ch > 0.05 ? 0.55 : 1)), R = B.R, C = Math.round(B.C * M.spd * WP.spd);   // o golpe carregado já foi preparado segurando o botão
  p.atk = { k, t0: now, a: isFinite(a) ? a : 0, W, R, C, reach: B.reach * M.reach * WP.reach, arc: B.arc * WP.arc, rip, c: comboHit ? Math.max(ch, HEAVY) : ch, wdmg: WP.dmg, wpn: fist ? 'fist' : p.cls === 'knight' ? (p.wpn || 'sword') : 'other' }; p.parry = null; p.ripUntil = 0; p.lastCombat = now;
  anim('p', p, fist ? 'punch' : 'atk_' + k, p.x + Math.cos(p.atk.a), p.y + Math.sin(p.atk.a), { ms: W + R + C, W, ang: p.atk.a, reach: p.atk.reach, arc: B.arc });
  sendStat(p);
}
// duelo: só vale se os dois ligaram o modo duelo e estão fora da cidade
// PvP liberado em todo lugar (cidade e dentro das casas também), entre quem está no mesmo andar
const pvpOk = (a, b) => a !== b && !a.dev && !b.dev && !b.downed && Math.abs((a.z || 0) - (b.z || 0)) < 0.5 && (a.fl || 0) === (b.fl || 0);
// crime na cidade: se uma sentinela vê (até 10 passos, sem parede no meio), o agressor fica procurado por 5 minutos
function sightClear(ax, ay, bx, by) { const n = Math.ceil(dist(ax, ay, bx, by) * 2); for (let i = 1; i < n; i++) { const t = tileAt(ax + (bx - ax) * i / n, ay + (by - ay) * i / n); if (WORLD.bld[t] >= 0 || WORLD.obj[t] === O.WALL || WORLD.obj[t] === O.TOWER || WORLD.ground[t] === T.CLIFF) return false; } return true; }
function witnessCrime(p, x, y, kind) {
  if (!p || p.dev || !inSafe(x, y)) return false;
  const guards = S.npcs ? Object.values(S.npcs).filter(n => n.kind === 'guard' && !n.dead && !n.downed) : NPCS.filter(n => n.kind === 'guard');
  const seen = guards.some(n => dist(n.x, n.y, x, y) <= 10 && sightClear(n.x, n.y, x, y));
  if (!seen) return false;
  if (kind !== 'npcvictim' && (!p._memT || now_() - p._memT > 3000)) { p._memT = now_(); memEvent(p, x, y, kind === 'murder' ? 'murder' : 'assault'); }
  const now = now_(), was = now < (p.wanted || 0); p.wanted = now + 300000; if (!p._crimeT || now - p._crimeT > 4000 || kind === 'murder') { p._crimeT = now; crimeSentence(p, kind || 'assault'); }
  if (!was) { sys(p.name + ' foi visto cometendo um crime na cidade! As sentinelas estão atrás dele.'); tell(p, 'Uma sentinela viu: você está PROCURADO por 5 minutos (sair da cidade limpa a ficha).'); }
  Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); return true;
}
function pvpHit(p, q, A, now) { q._hitBy = { k: 'p', id: p.id, t: now };
  const duel = p.duel && p.duel === q.duel; if (!duel) witnessCrime(p, p.x, p.y); if (!duel && typeof segDefend === 'function') segDefend(p, q);
  if (q.duel && !duel) return;   /* ninguém de fora atrapalha o duelo */
  if (now < (q.dodgeUntil || 0)) { near(q.x, q.y, { t: 'whiff', id: q.id }); return; }
  const toP = Math.atan2(p.y - q.y, p.x - q.x);
  const BK = blockEval(q, A.k, p.x, p.y, A.a, now, A.W);
  if (BK && BK.okZ && !BK.shield && (A.c || 0) >= HEAVY && !BK.perfect) { guardBreak(q, now); near(q.x, q.y, { t: 'clang', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }); }   // sem escudo, golpe carregado fora do tempo quebra a guarda
  else if (BK && BK.okZ) {
    if (BK.shield) shieldWear(q, (A.c || 0) >= HEAVY ? 8 : 3);
    if (BK.perfect && q.sheathed && hasMove(q, 'kamae')) { const d = Math.max(1, Math.min(rint(4, 8), Math.floor(p.hp) - 1)); damagePlayer(p, d, { x: q.x, y: q.y, name: q.name }, 120, 'torso'); near(q.x, q.y, { t: 'anim', w: 'p', id: q.id, a: 'punch', tx: p.x, ty: p.y, ms: 520 }); sfx(q.x, q.y, 'Contragolpe!', '#f0c060', 0); }
    if (BK.perfect) { p.stunUntil = now + 750; q.ripUntil = now + RIPOSTE_MS; q.cst = Math.min(cstMaxOf(q), q.cst + 5); near(q.x, q.y, { t: 'clang', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, perfect: 1 }); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'hurt', ms: 750 }); sendStat(p); }
    else { q.cst -= BK.shield ? 6 : 14; near(q.x, q.y, { t: 'clang', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }); if (q.cst <= 0) guardBreak(q, now); }
    sendStat(q); return;
  }
  const partial = BK && BK.shield ? 0.75 : (BK && BK.okZ ? 0.5 : 1);
  const B = STRIKES[A.k], M = MELEE[p.cls] || MELEE.knight, { dmg } = roll(p, B.mult * M.dmg * (A.wdmg || 1) * (1 + 0.6 * (A.c || 0)) * (A.rip ? 1.25 : 1));
  const crit = roll(p, 1).crit;
  if (A.wpn === 'fist') { const d = Math.min(Math.round(dmg), Math.max(0, Math.floor(q.hp) - 1)); if (d > 0) damagePlayer(q, d, { x: p.x, y: p.y, name: p.name }, 0, B.zone); if (q.hp <= 1.5 || A.c >= HEAVY) { q.stunUntil = Math.max(q.stunUntil || 0, now + 1400); knockPlayer(q, { x: p.x, y: p.y }, now); } sendStat(q); return; }
  if (lethalHit(p, q, A, 'p')) return;
  damagePlayer(q, Math.round(dmg * (crit ? 1.6 : 1) * partial), { x: p.x, y: p.y, name: p.name }, 0, B.zone);
  if (crit && A.k !== 'stab' && !q.downed) severPlayer(q, severPart(A.k, q.lost || 0), { x: p.x, y: p.y, name: p.name });
  if (B.trip && !q.downed && Math.random() < B.trip) knockPlayer(q, { x: p.x, y: p.y }, now);   // golpe de baixo pode derrubar
  if (q.atk && !q.atk.done) { q.atk = null; near(q.x, q.y, { t: 'anim', w: 'p', id: q.id, a: 'hurt' }); }
}
function resolvePlayerStrike(p, A, now) { p._melee = true; try { resolvePlayerStrike0(p, A, now); } finally { p._melee = false; } }
function resolvePlayerStrike0(p, A, now) {
  { const B0 = STRIKES[A.k]; let n = 0; for (const q of Object.values(S.players)) { if (n >= (B0.multi || 1) || !pvpOk(p, q) || !inArc(p.x, p.y, A.a, q.x, q.y, A.reach, A.arc, 0.3)) continue; pvpHit(p, q, A, now); n++; } if (n) return; }
  for (const n of Object.values(S.npcs || {})) { if (n.dead || n.onBack || n.carriedBy || !inArc(p.x, p.y, A.a, n.x, n.y, A.reach, A.arc, 0.3)) continue;
    if (n.duel || p.duel) { if (n.duel && n.duel === p.duel) duelNpcHit(n, p, rint(7, 12) + ((A.c || 0) >= HEAVY ? 8 : 0), A.c >= HEAVY); continue; }
    if (A.wpn === 'fist') { if (!n.downed) npcDamage(n, rint(3, 7) + (A.c >= HEAVY ? 6 : 0), p); continue; }   /* a soco ninguém morre: caído não toma mais */ const B1 = STRIKES[A.k], M1 = MELEE[p.cls] || MELEE.knight; if ((A.c || 0) >= HEAVY && B1.zone === 'head' && Math.random() < 0.85) { npcDamage(n, 9999, p); if (!n.dead) npcDamage(n, 9999, p); near(n.x, n.y, { t: 'blood', x: n.x, y: n.y, n: 14 }); continue; } npcDamage(n, roll(p, B1.mult * M1.dmg * (A.wdmg || 1) * (1 + 0.6 * (A.c || 0))).dmg, p); break; }
  const B = STRIKES[A.k], M = MELEE[p.cls] || MELEE.knight;
  const targets = Object.values(S.monsters).filter(q => Math.abs((q.z || 0) - (p.z || 0)) < 0.5 && (q.alt || 0) < 1.2 && inArc(p.x, p.y, A.a, q.x, q.y, A.reach, A.arc, MON[q.type].rad || 0.3)).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y)).slice(0, B.multi || 1);
  for (const q of targets) {
    const MM = MON_MELEE[q.type], facing = Math.abs(angDiff(Math.atan2(p.y - q.y, p.x - q.x), q.atk ? q.atk.a : Math.atan2(p.y - q.y, p.x - q.x))) < 1.2;
    if (MM && MM.blk && !q.atk && facing && now > (q.guardBreak || 0) && now >= (q.stunUntil || 0) && Math.random() < MM.blk) {   // o inimigo bloqueou
      near(q.x, q.y, { t: 'clang', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, blockBy: q.id }); p.atk.C += 220; continue;
    }
    const emb = p.cls === 'mage' && buffOn(p, 'ember'); if (emb) p._el = 'fire';
    const { dmg, crit } = roll(p, B.mult * M.dmg * (A.wdmg || 1) * (1 + 0.6 * (A.c || 0)) * (A.rip ? 1.25 : 1) * (emb ? 1.4 * (1 + useBonus(p, 'el_fire')) : 1)); if (emb) { p._el = null; emberBurn(p, q); }
    const heavyHead = (A.c || 0) >= HEAVY && B.zone === 'head' && MON_LOOK[q.type] && !MON[q.type].big && Math.random() < 0.7;
    const sev = heavyHead ? 'head' : crit && A.k !== 'stab' && MON_LOOK[q.type] ? severPart(A.k, q.lost || 0) : null;
    if (sev) { q.lost = (q.lost || 0) | LOST[sev]; near(q.x, q.y, { t: 'sever', k: 'm', id: q.id, part: sev, x: q.x, y: q.y, ax: p.x, ay: p.y }); }
    q._hz = B.zone; hitRolled(p, q, sev === 'head' ? q.hp + 9999 : dmg, crit, 0, crit ? 1 : 0); useGain(p, meleeUseOf(p), 1);
    if (!S.monsters[q.id]) continue;
    if (sev && sev.startsWith('arm')) q.flee = { from: p.id, until: now + 7000 };
    if (crit && A.k === 'over' && !sev && !MON[q.type].big) knockMon(q, p, now);
    if (q.atk && !q.atk.done && A.k !== 'stab') { q.atk = null; q.nextAtk = now + 600; }   // golpe pesado interrompe o inimigo
    if (A.k === 'over' && Math.random() < 0.18) q.stunUntil = Math.max(q.stunUntil, now + 650);
    if (A.k === 'under') { q.slowUntil = Math.max(q.slowUntil, now + 2500); if (!MON[q.type].big && Math.random() < (STRIKES.under.trip || 0)) knockMon(q, p, now); }
  }
  if (!targets.length) near(p.x, p.y, { t: 'swoosh', id: p.id });
}
function playerKick(p, a, now) {
  if (p.downed || now < (p.stunUntil || 0) || p.atk || p.cst < KICK.cost || now < (p.kickT || 0)) return;
  p.cst -= KICK.cost; p.kickT = now + 900; p.parry = null;
  anim('p', p, 'kick', p.x + Math.cos(a), p.y + Math.sin(a), { ms: 520 });
  setTimeout(() => {
    for (const q of Object.values(S.monsters)) {
      if (!inArc(p.x, p.y, a, q.x, q.y, KICK.reach, KICK.arc, MON[q.type].rad || 0.3) || MON[q.type].dragon) continue;
      q.guardBreak = now_() + 1600; q.stunUntil = Math.max(q.stunUntil, now_() + (MON[q.type].big ? 350 : KICK.stun)); if (q.atk && !q.atk.done) q.atk = null;
      if (!MON[q.type].big) for (let s = 1; s <= 6; s++) setTimeout(() => { if (!S.monsters[q.id]) return; const nx = q.x + Math.cos(a) * KICK.push / 6, ny = q.y + Math.sin(a) * KICK.push / 6; if (monStand(nx, ny, q)) { q.x = nx; q.y = ny; } }, s * 35);   // empurrão longo
      hitRolled(p, q, Math.max(1, Math.round(p.lvl * 1.5 + 3)), false, 0, 0);
    }
    for (const q of Object.values(S.players)) {   // duelo: o chute quebra a guarda e empurra o outro jogador
      if (!pvpOk(p, q) || !inArc(p.x, p.y, a, q.x, q.y, KICK.reach, KICK.arc, 0.3)) continue;
      if (q.parry) { q.parry = null; q.stunUntil = now_() + 700; near(q.x, q.y, { t: 'anim', w: 'p', id: q.id, a: 'hurt', ms: 700 }); }
      q.dodgeAllow = now_() + 700; Net.toOne(q.id, { t: 'push', a, d: KICK.push }); damagePlayer(q, Math.max(1, Math.round(p.lvl + 3)), { x: p.x, y: p.y, name: p.name }, 0, 'torso'); sendStat(q);
    }
  }, KICK.W);
  sendStat(p);
}
function combatTick(p, now, dt) {
  if (p.atk) { const A = p.atk; if (!A.done && now >= A.t0 + A.W) { A.done = true; resolvePlayerStrike(p, A, now); } if (p.atk && now >= A.t0 + A.W + A.R + A.C) p.atk = null; }
  if (p.running && p.walking && !p.dev) { p.cst = Math.max(0, (p.cst ?? cstMaxOf(p)) - STAM_DRAIN * dt); p.cstT = now; }   // correr gasta a mesma estamina do combate
  if (now - (p._stT || 0) > 700 && ((p.running && p.walking) || (p.cst ?? 0) < cstMaxOf(p) - 1)) { p._stT = now; sendStat(p); }   // a barra no cliente acompanha
  if (!p.atk && !p.parry && now - (p.cstT || 0) > 900) p.cst = Math.min(cstMaxOf(p), (p.cst ?? cstMaxOf(p)) + CST_REGEN * dt * survFactor(p) * (1 + useBonus(p, 'breath')));
  if (p.parry) p.cst = Math.max(0, p.cst - 2 * dt);
}

// ---------------- DRAGÃO ----------------
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function dragonDir(m) { const dx = Math.cos(m.ang), dy = Math.sin(m.ang); return typeof dirFromVec === "function" ? dirFromVec(dx, dy, 0) : dirFromVecS(dx, dy); }
const DRG_MS = { bite: 700, breath: 2000, tail: 900, roar: 1300, takeoff: 1100, land: 800 };
const DRG = { bite: 5.4, tail: 7.2, bMin: 3.6, bMax: 12.5, bLen: 11.5, mouth: 2.8, circR: 8, altAir: 5, altStrafe: 2.4, fly: 7, strafe: 10, altPatrol: 6.5 };
// o dragão caça qualquer um fora da cidade — inclusive o Tecelão, a não ser que esteja invisível
const dragonCan = p => p && !p.downed && !p.grabbed && !(p.dev && p.devHidden) && !inSafe(p.x, p.y) && !((p.fl || 0) !== 0) && now_() >= (p.flungUntil || 0);
function flyTo(m, x, y, alt, speed, dt) {
  const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy), s = Math.min(d, speed * dt);
  if (d > 0.01) { m.x += dx / d * s; m.y += dy / d * s; const want = Math.atan2(dy, dx); m.ang += Math.max(-dt * 3, Math.min(dt * 3, angDiff(want, m.ang))); }
  m.alt += Math.max(-dt * 4.5, Math.min(dt * 4.5, alt - m.alt));
  return d < 0.6 && Math.abs(m.alt - alt) < 0.15;
}
function dragonAnim(m, a, tx, ty) { anim('m', m, a, tx, ty); m.busyUntil = now_() + DRG_MS[a]; }
function landedZ(m) { const t = tileAt(m.x, m.y); m.z = WORLD.ground[t] === T.CLIFF && WORLD.fl1[t] > 0 ? 1 : 0; }
function dragonThink(m, players, now, dt) {
  const d = MON[m.type]; m.alt = m.alt || 0;
  const tg = players.filter(p => dragonCan(p) && dist(p.x, p.y, m.x, m.y) < 24);
  if (m.sleep) {
    if (!m.patrolAt) m.patrolAt = now + 1200000 + Math.random() * 600000;   // primeiro voo: 20–30 min
    if (now >= m.patrolAt) { startPatrol(m, now); return; }
    const noisy = p => (p.running && p.walking) || now - p.lastCombat < 2500;
    const wake = m.aggro || tg.some(p => dist(p.x, p.y, m.x, m.y) < (p.crouch ? 3.2 : 6.5)) || tg.some(p => !p.crouch && noisy(p) && dist(p.x, p.y, m.x, m.y) < 14);
    if (!wake) return;
    m.sleep = false; m.mode = 'ground'; m.groundSince = now; m.nextRoar = now + 300; m.busyUntil = now + 300; m.airHp = [0.75, 0.5, 0.25];
  }
  if (!m.mode) m.mode = 'ground';
  const fury = m.hp < d.hp * 0.3; if (fury && !m.fury) { m.fury = true; near(m.x, m.y, { t: 'shake', s: 10 }); sys(d.name + ' entra em fúria!'); }
  const cdk = fury ? 0.6 : 1;
  if (m.mode === 'patrol') return dragonPatrol(m, players, tg, now, dt);
  if (m.mode === 'home') {
    if (m.aggro && tg.some(p => p.id === m.aggro)) { m.mode = 'air'; m.airUntil = now + 2500; return; }
    const back = dist(m.x, m.y, m.homeX, m.homeY) < 0.6;
    if (!back) { flyTo(m, m.homeX, m.homeY, DRG.altAir, DRG.fly, dt); return; }
    if (!flyTo(m, m.homeX, m.homeY, 0, DRG.fly, dt)) return;
    m.alt = 0; landedZ(m); m.mode = null; m.sleep = true; m.hp = d.hp; m.aggro = null; m.fury = false; m.idleSince = 0;
    if (!m.patrolAt || m.patrolAt < now) m.patrolAt = now + 2100000 + Math.random() * 900000; return;
  }
  if (m.mode !== 'ground') return dragonAir(m, tg, now, dt, cdk);
  // ---------- no chão ----------
  if (now < (m.busyUntil || 0)) return;
  if (!tg.length) { m.idleSince = m.idleSince || now; if (now - m.idleSince > 12000) { m.mode = 'home'; dragonAnim(m, 'takeoff', m.x, m.y); } return; }
  m.idleSince = 0;
  const tgt = tg.find(p => p.id === m.aggro) || tg.slice().sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y))[0];
  m.aggro = tgt.id;
  const dd = dist(m.x, m.y, tgt.x, tgt.y), want = Math.atan2(tgt.y - m.y, tgt.x - m.x), sameZ = Math.abs((tgt.z || 0) - (m.z || 0)) < 0.5;
  const turn = angDiff(want, m.ang); m.ang += Math.max(-dt * 1.8, Math.min(dt * 1.8, turn));
  // levanta voo: de tempos em tempos, quando perde vida (75/50/25%) ou quando não alcança o alvo (em cima/embaixo da rocha, longe)
  const hpCross = m.airHp && m.airHp.length && m.hp < d.hp * m.airHp[0];
  if (hpCross || now - m.groundSince > 17000 + (m.id % 5) * 1000 || (!sameZ && dd > 3) || dd > 16) {
    if (hpCross) m.airHp.shift();
    m.mode = 'takeoff'; m.airActs = 0; dragonAnim(m, 'takeoff', tgt.x, tgt.y); near(m.x, m.y, { t: 'shake', s: 4 });
    for (const p of players) if (!p.downed && dist(p.x, p.y, m.x, m.y) < 5 && Math.abs((p.z || 0) - (m.z || 0)) < 0.5) { p.slowUntil = now + 1200; sendStat(p); }
    return;
  }
  // rugido: assusta (lentidão) e treme a tela
  if (now >= (m.nextRoar || 0)) {
    m.nextRoar = now + 16000 + Math.random() * 6000; dragonAnim(m, 'roar', tgt.x, tgt.y);
    for (const p of tg) if (dist(p.x, p.y, m.x, m.y) < 11) { p.slowUntil = now + 2500; sendStat(p); }
    near(m.x, m.y, { t: 'shake', s: 9 }); return;
  }
  // golpe de cauda: quem está atrás ou dos lados voa longe
  const flank = tg.filter(p => sameZ && dist(p.x, p.y, m.x, m.y) < DRG.tail && Math.abs(angDiff(Math.atan2(p.y - m.y, p.x - m.x), m.ang)) > 1.5);
  if (flank.length && now >= (m.cdTail || 0)) {
    m.cdTail = now + 5500 * cdk; dragonAnim(m, 'tail', flank[0].x, flank[0].y);
    setTimeout(() => { if (!S.monsters[m.id]) return; for (const p of Object.values(S.players)) { if (p.downed || Math.abs((p.z || 0) - (m.z || 0)) > 0.5 || dist(p.x, p.y, m.x, m.y) > DRG.tail + 0.3 || Math.abs(angDiff(Math.atan2(p.y - m.y, p.x - m.x), m.ang)) < 1.1) continue; damagePlayer(p, rint(24, 38), m, 0); if (!p.downed) flingPlayer(p, m.x, m.y, 7); } }, 430);
    return;
  }
  // sopro: inspira, depois um jato que VARRE na frente (de um lado para o outro), incendiando o mato
  if (dd > DRG.bMin && dd < DRG.bMax && Math.abs(turn) < 0.5 && now >= (m.cdBreath || 0)) { m.cdBreath = now + 9000 * cdk; m.ang = want; dragonBreath(m, want, fury); return; }
  // mordida
  if (dd <= DRG.bite) {
    if (sameZ && now >= m.nextAtk && Math.abs(turn) < 0.8) { m.nextAtk = now + 1800 * cdk; dragonAnim(m, 'bite', tgt.x, tgt.y); m.busyUntil = now + 500; setTimeout(() => { if (S.monsters[m.id] && !tgt.downed && dist(tgt.x, tgt.y, m.x, m.y) < DRG.bite + 0.4) damagePlayer(tgt, rint(d.dmg[0], d.dmg[1]), m, 0); }, 380); }
    return;
  }
  moveToward(m, tgt.x, tgt.y, d.speed * dt * (fury ? 1.35 : 1));
}
function dragonBreath(m, a, fury) {
  dragonAnim(m, 'breath', 0, 0); m.busyUntil = now_() + DRG_MS.breath;
  const side = Math.random() < 0.5 ? 1 : -1, sw = fury ? 0.95 : 0.75, a0 = a - side * sw, a1 = a + side * sw, wind = 700, ms = 1300;
  const x0 = m.x + Math.cos(a) * DRG.mouth, y0 = m.y + Math.sin(a) * DRG.mouth;
  near(m.x, m.y, { t: 'tele', x: x0, y: y0, z: m.z || 0, a, len: DRG.bLen, w: sw, ms: wind, nf: 1 });
  setTimeout(() => {
    if (!S.monsters[m.id]) return;
    near(m.x, m.y, { t: 'jet', id: m.id, a0, a1, ms, d0: DRG.mouth, len: DRG.bLen });
    const hitAt = {};
    for (let k = 0; k <= 13; k++) setTimeout(() => {
      if (!S.monsters[m.id]) return;
      const now = now_(), ang = a0 + (a1 - a0) * (k / 13); m.ang = ang;
      const mx = m.x + Math.cos(ang) * DRG.mouth, my = m.y + Math.sin(ang) * DRG.mouth;
      for (const p of Object.values(S.players)) {
        if (p.downed || now < (hitAt[p.id] || 0)) continue;
        const ax = p.x - mx, ay = p.y - my, l = Math.hypot(ax, ay); if (l > DRG.bLen || Math.abs(angDiff(Math.atan2(ay, ax), ang)) > 0.22 + 0.6 / (l + 1)) continue;
        hitAt[p.id] = now + 350; damagePlayer(p, rint(12, 18), m, 0); ignitePlayer(p, now);
      }
      const list = []; igniteTile(mx + Math.cos(ang) * DRG.bLen * (0.4 + Math.random() * 0.6), my + Math.sin(ang) * DRG.bLen * (0.4 + Math.random() * 0.6), now, list, true); if (list.length) near(m.x, m.y, { t: 'fires', l: list, nb: 1 });
    }, k * 100);
  }, wind);
}
// ---------- no ar ----------
function dragonAir(m, tg, now, dt, cdk) {
  const tgt = tg.find(p => p.id === m.aggro) || tg[0];
  if (m.mode === 'takeoff') { flyTo(m, m.x, m.y, DRG.altAir, 0, dt); if (m.alt > DRG.altAir - 0.3) { m.mode = 'air'; m.airUntil = now + 3500 + Math.random() * 1500; m.circA = Math.atan2(m.y - (tgt ? tgt.y : m.y), m.x - (tgt ? tgt.x : m.x)); } return; }
  if (m.mode === 'carry') return dragonCarry(m, now, dt);
  if (!tgt && m.mode !== 'strafe') { m.lostT = m.lostT || now; if (now - m.lostT > 6000) { m.mode = 'home'; m.lostT = 0; } else flyTo(m, m.x + Math.cos(m.ang) * 3, m.y + Math.sin(m.ang) * 3, DRG.altAir, DRG.fly * 0.6, dt); return; }
  m.lostT = 0; if (tgt) m.aggro = tgt.id;
  if (m.mode === 'air') {
    // circula em volta do alvo, com a sombra passando por cima dele
    m.circA = (m.circA || 0) + dt * (DRG.fly / DRG.circR) * 0.8;
    flyTo(m, tgt.x + Math.cos(m.circA) * DRG.circR, tgt.y + Math.sin(m.circA) * DRG.circR, DRG.altAir, DRG.fly, dt);
    if (now < m.airUntil) return;
    m.airActs = (m.airActs || 0) + 1;
    if (m.airActs > 2 + (m.fury ? 1 : 0)) return dragonStartLand(m, tgt, now);
    if (Math.random() < 0.62) dragonStartStrafe(m, tgt, now, 'air'); else dragonStartDive(m, tgt, now);
    return;
  }
  if (m.mode === 'strafe') {
    const R = m.run, done = flyTo(m, R.x1, R.y1, DRG.altStrafe, now < R.go ? DRG.fly : DRG.strafe, dt);
    if (now >= R.go) {
      if (!R.jet) { R.jet = true; near(m.x, m.y, { t: 'jet', id: m.id, a0: R.a, a1: R.a, ms: Math.round(R.len / DRG.strafe * 1000) + 300, d0: 2.6, len: 2.6, air: 1 }); }
      const fx = m.x + Math.cos(R.a) * 4, fy = m.y + Math.sin(R.a) * 4, along = (fx - R.sx) * Math.cos(R.a) + (fy - R.sy) * Math.sin(R.a);
      if (along > 0 && along < R.len) {
        const list = []; igniteTile(fx, fy, now, list, true); (S.fires = S.fires || []).push({ x: fx, y: fy, r: 1.1, until: now + 3500 }); list.push([fx, fy, 1.2, 3500]); near(fx, fy, { t: 'fires', l: list, nb: 1 });
        for (const p of Object.values(S.players)) { if (p.downed || R.hit[p.id] || dist(p.x, p.y, fx, fy) > 1.6) continue; if (now < (p.dodgeUntil || 0)) { near(p.x, p.y, { t: 'whiff', id: p.id }); continue; } R.hit[p.id] = 1; damagePlayer(p, rint(28, 40), m, 0); ignitePlayer(p, now); }
      }
    }
    if (done || now > R.until) { m.mode = R.after; m.airUntil = now + 2500 + Math.random() * 1500; if (R.after === 'patrol') m.pi = Math.min(m.pi, m.route.length - 1); }
    return;
  }
  if (m.mode === 'dive') {
    const D = m.dive, k = Math.min(1, (now - D.t0) / D.ms);
    m.x = D.fx + (D.tx - D.fx) * k; m.y = D.fy + (D.ty - D.fy) * k; m.alt = DRG.altAir + (0.9 - DRG.altAir) * k; m.ang = Math.atan2(D.ty - D.fy, D.tx - D.fx);
    if (k < 1) return;
    const p = S.players[D.id];
    if (p && dragonCan(p) && dist(p.x, p.y, D.tx, D.ty) < 1.7 && now >= (p.dodgeUntil || 0)) {
      if (p.carrying) dropCarried(p); p.grabbed = m.id; p.sit = null; m.mode = 'carry'; m.carry = { id: p.id, until: now + 2300 };
      near(m.x, m.y, { t: 'grab', id: p.id, mid: m.id, ms: 2300 }); damagePlayer(p, rint(10, 16), m, 0); tell(p, 'O dragão te agarrou!');
    } else { if (p) near(p.x, p.y, { t: 'whiff', id: p.id }); m.mode = 'air'; m.airUntil = now + 2000; near(m.x, m.y, { t: 'shake', s: 3 }); }
    return;
  }
  if (m.mode === 'land') {
    const L = m.landAt; if (!flyTo(m, L.x, L.y, dist(m.x, m.y, L.x, L.y) < 2.5 ? 0 : 1.5, DRG.fly, dt)) return;
    m.alt = 0; landedZ(m); m.mode = 'ground'; m.groundSince = now; dragonAnim(m, 'land', tgt ? tgt.x : m.x, tgt ? tgt.y : m.y);
    near(m.x, m.y, { t: 'shake', s: 12 });
    for (const p of Object.values(S.players)) { if (p.downed || p.grabbed || Math.abs((p.z || 0) - (m.z || 0)) > 0.5 || dist(p.x, p.y, m.x, m.y) > 4.8) continue; damagePlayer(p, rint(18, 28), m, 0); if (!p.downed) knockPlayer(p, { x: m.x, y: m.y }, now); }
  }
}
function dragonStartStrafe(m, tgt, now, after) {
  const a = Math.atan2(tgt.y - m.y, tgt.x - m.x), sx = tgt.x - Math.cos(a) * 5, sy = tgt.y - Math.sin(a) * 5, len = 14;
  m.mode = 'strafe'; m.run = { a, sx, sy, len, x1: tgt.x + Math.cos(a) * 11, y1: tgt.y + Math.sin(a) * 11, go: now + 900, until: now + 5000, hit: {}, after };
  near(tgt.x, tgt.y, { t: 'tele', k: 'strip', x: sx, y: sy, a, len, w: 1.5, ms: 1100, z: 0 });
}
function dragonStartDive(m, tgt, now) {
  m.mode = 'dive'; m.dive = { id: tgt.id, t0: now, ms: 1200, fx: m.x, fy: m.y, tx: tgt.x, ty: tgt.y };
  near(tgt.x, tgt.y, { t: 'tele', k: 'ring', x: tgt.x, y: tgt.y, r: 1.7, ms: 1200, z: tgt.z || 0 });
}
function dragonStartLand(m, tgt, now) {
  let L = null;
  if ((tgt.z || 0) >= 0.5 && dist(tgt.x, tgt.y, m.homeX, m.homeY) < 10) L = { x: m.homeX, y: m.homeY };
  else for (let k = 0; k < 12 && !L; k++) { const a = Math.atan2(m.y - tgt.y, m.x - tgt.x) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5, x = tgt.x + Math.cos(a) * 6.5, y = tgt.y + Math.sin(a) * 6.5, t = tileAt(x, y); if (inBounds(Math.round(x), Math.round(y)) && WORLD.ground[t] !== T.WATER && WORLD.ground[t] !== T.CLIFF && !inSafe(x, y)) L = { x, y }; }
  m.mode = 'land'; m.landAt = L || { x: tgt.x, y: tgt.y };
  near(m.landAt.x, m.landAt.y, { t: 'tele', k: 'ring', x: m.landAt.x, y: m.landAt.y, r: 4.8, ms: 1300, z: 0 });
}
function dragonCarry(m, now, dt) {
  const C = m.carry, p = S.players[C.id];
  flyTo(m, m.x + Math.cos(m.ang) * 4, m.y + Math.sin(m.ang) * 4, 6, 5.5, dt);
  if (!m._edge) { const nx = m.x + Math.cos(m.ang) * 3, ny = m.y + Math.sin(m.ang) * 3; if (!inBounds(Math.round(nx), Math.round(ny)) || inSafe(nx, ny)) m.ang += Math.PI * 0.6; }
  if (p) { p.x = m.x; p.y = m.y; p.lastMv = now; }
  if (now < C.until && p && p.grabbed === m.id) return;
  if (p && p.grabbed === m.id) dragonDrop(p, m.alt);
  m.mode = 'air'; m.airUntil = now + 2500; m.carry = null;
}
// solta quem estava nas garras: cai do alto, se machuca e fica no chão
function dragonDrop(p, alt) {
  p.grabbed = null;
  let best = null;
  for (let r = 0; r < 6 && !best; r += 0.5) for (let k = 0; k < 8 && !best; k++) { const a = k * Math.PI / 4, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (!inBounds(Math.round(x), Math.round(y))) continue; const t = tileAt(x, y), top = WORLD.ground[t] === T.CLIFF && WORLD.fl1[t] > 0; if (top && canStandZ(x, y, 1, 0.22)) best = [x, y, 1]; else if (!top && WORLD.ground[t] !== T.CLIFF && canStand(x, y, 0, 0.22)) best = [x, y, 0]; }
  const [tx, ty, tz] = best || [p.x, p.y, 0], ms = 750, fz = Math.max(1, (alt || 4) / 4);   // altura de voo (ALT_PX 44) em andares (176 px)
  near(p.x, p.y, { t: 'fling', id: p.id, fx: p.x, fy: p.y, fz, tx, ty, tz, ms });
  p.x = tx; p.y = ty; p.z = tz; p.flungUntil = now_() + ms + 900; p.lastMv = now_();
  setTimeout(() => { if (!S.players[p.id] || p.downed) return; const wet = WORLD.ground[tileAt(p.x, p.y)] === T.WATER || WORLD.ground[tileAt(p.x, p.y)] === T.SHALLOW; damagePlayer(p, Math.round(p.maxHp * (wet ? 0.08 : 0.22)), null, 0); if (!p.downed && !wet) knockPlayer(p, { x: p.x + 0.5, y: p.y }, now_()); }, ms);
}
// ---------- patrulha: de tempos em tempos sobrevoa o mundo e ataca quem estiver no caminho, fora da cidade ----------
function startPatrol(m, now) {
  const a0 = Math.atan2(m.homeY - CENTER, m.homeX - CENTER), dir = Math.random() < 0.5 ? 1 : -1;
  m.route = []; for (let k = 1; k <= 7; k++) { const a = a0 + dir * k * Math.PI * 2 / 8, r = 64 + Math.random() * 22; m.route.push([CENTER + Math.cos(a) * r, CENTER + Math.sin(a) * r]); }
  m.pi = 0; m.patrolHit = {}; m.sleep = false; m.mode = 'patrol'; m.alt = 0; m.patrolAt = now + 2100000 + Math.random() * 900000;
  dragonAnim(m, 'takeoff', m.x, m.y); sys('Uma sombra imensa cruza o céu... ' + MON[m.type].name + ' saiu do covil para caçar.'); Net.toAll({ t: 'shake', s: 2 });
}
function dragonPatrol(m, players, tg, now, dt) {
  if (now < (m.busyUntil || 0)) { flyTo(m, m.x, m.y, 2, 0, dt); return; }
  if (m.aggro) { const a = tg.find(p => p.id === m.aggro); if (a) { m.mode = 'air'; m.airUntil = now + 2000; m.airActs = 0; return; } }
  const wp = m.route[m.pi];
  if (!wp) { m.mode = 'home'; return; }
  if (flyTo(m, wp[0], wp[1], DRG.altPatrol, DRG.fly * 0.85, dt) || dist(m.x, m.y, wp[0], wp[1]) < 1.2) m.pi++;
  const prey = tg.find(p => !m.patrolHit[p.id] && dist(p.x, p.y, m.x, m.y) < 10 && WORLD.zone[tileAt(p.x, p.y)] !== Z.OUTSKIRTS);
  if (prey) { m.patrolHit[prey.id] = 1; dragonStartStrafe(m, prey, now, 'patrol'); }
}

// ---------- fogo: no corpo (role ou entre na água) e no mato (espalha) ----------
function ignitePlayer(p, now) {
  if (p.downed || !S.players[p.id]) return;
  const was = now < (p.burnUntil || 0); p.burnUntil = now + 6000;
  near(p.x, p.y, { t: 'burn', id: p.id, ms: 6000 });
  if (!was) tell(p, 'Você está pegando fogo! Role (esquiva) ou entre na água.');
}
function extinguish(p, msg) { p.burnUntil = 0; near(p.x, p.y, { t: 'burn', id: p.id, ms: 0 }); if (msg) tell(p, msg); }
const FLAMMABLE = new Set([O.TALLGRASS, O.BUSH, O.FERN, O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW, O.BERRY, O.HERB, O.LOG, O.ROOTS, O.FLOWER, O.REEDS, O.DEADTREE]);
const BIG_FUEL = new Set([O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW, O.DEADTREE]);
const raining = () => weatherS().rain > 0.3;
function igniteTile(x, y, now, list, force) {
  x = Math.round(x); y = Math.round(y); if (!inBounds(x, y)) return;
  const i = y * MAP_W + x; S.burn = S.burn || {}; S.burnt = S.burnt || {};
  if (S.burn[i] || (S.burnt[i] || 0) > now || (S.burnN || 0) > 180) return;
  const z = WORLD.zone[i], g = WORLD.ground[i], o = WORLD.obj[i];
  if (z === Z.VILLAGE || z === Z.OUTSKIRTS || g === T.WATER || g === T.SHALLOW || g === T.SAND || WORLD.bld[i] >= 0) return;
  const fuel = FLAMMABLE.has(o) ? (BIG_FUEL.has(o) ? 2 : 1) : (g === T.GRASS || g === T.FOREST) ? (force ? 0.6 : 0.4) : 0;
  if (!fuel || (raining() && !force)) return;
  const ms = (2500 + fuel * 3000) * (raining() ? 0.5 : 1);
  S.burn[i] = { until: now + ms, spreadAt: now + 1200 + Math.random() * 1800, o }; S.burnN = (S.burnN || 0) + 1;
  S.fires = S.fires || []; S.fires.push({ x, y, r: fuel >= 2 ? 1.2 : 0.8, until: now + ms });
  list.push([x, y, fuel >= 2 ? 1.7 : fuel >= 1 ? 1.1 : 0.7, ms]);
}
function fireTick(now, players) {
  if (S.burnN) {
    const list = [], wet = raining();
    for (const k in S.burn) {
      const b = S.burn[k], i = +k, x = i % MAP_W, y = Math.floor(i / MAP_W);
      if (!b.spread && now >= b.spreadAt) { b.spread = true; if (!wet) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = i + dy * MAP_W + dx; if (Math.random() < (FLAMMABLE.has(WORLD.obj[j]) ? 0.3 : 0.1)) igniteTile(x + dx, y + dy, now, list); } }
      if (now < b.until) continue;
      delete S.burn[k]; S.burnN--; S.burnt[i] = now + 600000;
      if (b.o === WORLD.obj[i] && BIG_FUEL.has(b.o) && b.o !== O.DEADTREE) { setObj(i, O.DEADTREE); (S.objBack = S.objBack || []).push({ i, o: b.o, at: now + 600000 }); }
      else if (b.o === WORLD.obj[i] && FLAMMABLE.has(b.o) && b.o !== O.DEADTREE) { setObj(i, O.NONE); (S.objBack = S.objBack || []).push({ i, o: b.o, at: now + 360000 }); }
    }
    if (list.length) { const [x, y] = list[0]; near(x, y, { t: 'fires', l: list, nb: 1 }, VIEW_RADIUS + 14); }
  }
  for (const p of players) {
    if (p.grabbed && !S.monsters[p.grabbed]) dragonDrop(p, 4);
    if (!p.burnUntil) continue;
    if (p.downed || now >= p.burnUntil) { extinguish(p, p.downed ? null : 'O fogo se apagou.'); continue; }
    const g = WORLD.ground[tileAt(p.x, p.y)]; if (g === T.WATER || g === T.SHALLOW) { extinguish(p, 'Você apaga o fogo na água.'); continue; }
    if (now >= (p.burnDmgT || 0)) { p.burnDmgT = now + 650; damagePlayer(p, Math.max(3, Math.round(p.maxHp * 0.03)), null, 0); }
  }
}
// arremesso realista: a pessoa voa em arco para longe e cai (pode cair da mesa)
function flingPlayer(p, fx, fy, D) {
  if (p.carrying) dropCarried(p);
  const dx = p.x - fx, dy = p.y - fy, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  let best = [p.x, p.y, p.z];
  for (let s = 0.25; s <= D; s += 0.25) {
    const x = p.x + ux * s, y = p.y + uy * s, t = tileAt(x, y), top = WORLD.ground[t] === T.CLIFF && WORLD.fl1[t] > 0;
    if (top) { if (canStandZ(x, y, 1, 0.22)) best = [x, y, 1]; continue; }
    if (WORLD.ground[t] === T.CLIFF || WORLD.ground[t] === T.WATER) continue;      // passa por cima da borda da rocha
    if (!canStand(x, y, 0, 0.22)) { if (BLOCKING.has(WORLD.obj[t]) || wallHit(x, y, 0.22)) break; continue; }
    best = [x, y, 0];
  }
  const fz = p.z, [tx, ty, tz] = best, ms = 600 + Math.hypot(tx - p.x, ty - p.y) * 45;
  near(p.x, p.y, { t: 'fling', id: p.id, fx: p.x, fy: p.y, fz, tx, ty, tz, ms });
  p.x = tx; p.y = ty; p.z = tz; p.flungUntil = now_() + ms + 900; p.lastMv = now_(); p.sit = null;
  if (fz >= 0.5 && tz < 0.5) setTimeout(() => damagePlayer(p, Math.round(p.maxHp * 0.08), null, 0), ms);   // queda da mesa
}

// ---------------- arco (estilo caçada): puxar, soltar, flecha com voo real, fincar no corpo ----------------
const MON_HT = { rat: 0.4, slime: 0.6, toad: 0.5, spider: 0.7, wolf: 0.95, boar: 0.9, deer: 1.5, goblin: 1.15, skeleton: 1.8, bandit: 1.8, deserter: 1.85, deserterchief: 1.95, orc: 2.05, orcchief: 2.4, troll: 3.0, cryptlord: 2.1, wisp: 1.2, elderslime: 1.3, dragon: 5 };
const OBST_H = o => [O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW, O.DEADTREE].includes(o) ? 6 : [O.WALL, O.TOWER, O.GATE, O.RUINTOWER].includes(o) ? 7 : [O.ROCK, O.BOULDER, O.BARREL, O.CRATE, O.HAY, O.STUMP, O.LOG, O.BUSH, O.BERRY].includes(o) ? 1.1 : 2.2;
const groundH = (x, y) => { const t = tileAt(x, y); return WORLD.ground[t] === T.CLIFF && WORLD.fl1[t] > 0 ? 3.5 : 0; };
let _arrowId = 1;
function bowDraw(p, on) {
  const now = now_();
  if (!on) { p.drawT = null; return; }
  if (p.cls !== 'archer' || p.downed || p.carrying || p.lifted || p.grabbed || now < (p.nockReady || 0) || now < (p.stunUntil || 0) || now < (p.knockUntil || 0)) return;
  p.drawT = now; p.parry = null; p.lastCombat = now;
}
function bowLoose(p, m) {
  const now = now_(); if (!p.drawT) return;
  const held = now - p.drawT, powS = clamp(held / BOW.draw, 0, 1); p.drawT = null;
  const pow = isFinite(+m.pow) ? clamp(Math.min(+m.pow, powS + 0.2), 0, 1) : powS;   // o cliente manda a força que mostrou na mira (o servidor limita)
  if (pow < 0.15) return;   // mal puxou: relaxa sem atirar
  const a = isFinite(+m.a) ? +m.a : 0;   // sem dispersão aleatória: o tremor já aparece na trajetória que o jogador vê
  let tx = +m.tx, ty = +m.ty; if (!isFinite(tx) || !isFinite(ty)) { tx = p.x + Math.cos(a) * 8; ty = p.y + Math.sin(a) * 8; }
  const D = clamp(dist(p.x, p.y, tx, ty), 0.5, BOW.maxRange) * 2;   // metros (1 tile = 2 m)
  const v = (BOW.vMin + (BOW.vMax - BOW.vMin) * pow) * 2, g = BOW.g;  // m/s
  // altura de chegada: o meio do corpo de quem está sob o cursor (bicho baixo, gente, troll); senão 1 m
  let aimH = 0.05, bd = 1.3;
  for (const q of Object.values(S.monsters)) { const d = dist(q.x, q.y, tx, ty); if (d < bd && (q.alt || 0) < 1.2) { bd = d; aimH = (MON_HT[q.type] || 1.6) * 0.62; } }
  for (const q of Object.values(S.players)) { if (q === p) continue; const d = dist(q.x, q.y, tx, ty); if (d < bd) { bd = d; aimH = q.downed ? 0.3 : 1.15; } }
  const z0 = (p.z >= 0.5 ? 3.5 : 0), h0 = z0 + 1.45, dh = (groundH(tx, ty) + aimH) - h0;
  const disc = v ** 4 - g * (g * D * D + 2 * dh * v * v);
  const th = isFinite(+m.th) ? clamp(+m.th, -0.7, 1.25) : disc >= 0 ? Math.atan((v * v - Math.sqrt(disc)) / (g * D)) : Math.PI / 4;
  const A = { id: _arrowId++, by: p.id, x: p.x + Math.cos(a) * 0.45, y: p.y + Math.sin(a) * 0.45, h: h0, vx: Math.cos(a) * v * Math.cos(th) / 2, vy: Math.sin(a) * v * Math.cos(th) / 2, vz: v * Math.sin(th), t0: now, pow, a };
  (S.arrows = S.arrows || []).push(A);
  anim('p', p, 'loose', p.x + Math.cos(a), p.y + Math.sin(a));
  near(p.x, p.y, { t: 'arrow', id: A.id, x: A.x, y: A.y, h: A.h, vx: A.vx, vy: A.vy, vz: A.vz, g }, VIEW_RADIUS + 10);
  p.nockReady = now + BOW.loose + BOW.nock; p.lastCombat = now;
  setTimeout(() => { if (S.players[p.id] && !p.downed) anim('p', p, 'nock', p.x + Math.cos(a), p.y + Math.sin(a)); }, BOW.loose);
}
// parte do corpo pela altura relativa e pelo lado em que a flecha passou
function arrowPart(rel, lat) {
  if (rel > 0.84) return 'head';
  if (rel > 0.5) return Math.abs(lat) > 0.55 ? (lat > 0 ? 'armA' : 'armB') : 'torso';
  return lat > 0 ? 'legR' : 'legL';
}
function arrowTick(now, dt) {
  if (!S.arrows || !S.arrows.length) return;
  const SUB = 0.025, steps = Math.ceil(dt / SUB);
  for (const A of S.arrows.slice()) {
    const shooter = S.players[A.by]; let done = false;
    for (let s = 0; s < steps && !done; s++) {
      A.x += A.vx * SUB; A.y += A.vy * SUB; A.vz -= BOW.g * SUB; A.h += A.vz * SUB;
      const fa = Math.atan2(A.vy, A.vx);
      if (!inBounds(Math.round(A.x), Math.round(A.y)) || now - A.t0 > 5000) { done = true; break; }
      // corpos: jogadores (inclusive aliados) e monstros
      const tgts = [];
      for (const q of Object.values(S.players)) { if (q.dev || (q.id === A.by && now - A.t0 < 250) || (q.fl || 0) !== 0) continue; tgts.push({ q, k: 'p', r: 0.32, H: q.downed ? 0.45 : 1.8, base: q.z >= 0.5 ? 3.5 : 0 }); }
      for (const q of Object.values(S.npcs || {})) { if (q.dead || q.onBack) continue; tgts.push({ q, k: 'n', r: 0.32, H: q.downed ? 0.45 : 1.8, base: 0 }); }
      for (const q of Object.values(S.monsters)) { if ((q.alt || 0) > 1.2) continue; tgts.push({ q, k: 'm', r: Math.max(0.3, Math.min(1.6, MON[q.type].rad || 0.35)), H: MON_HT[q.type] || 1.6, base: (q.z || 0) >= 0.5 ? 3.5 : 0 }); }
      for (const T0 of tgts) {
        const q = T0.q, dx = A.x - q.x, dy = A.y - q.y; if (dx * dx + dy * dy > T0.r * T0.r) continue;
        const rel = (A.h - T0.base) / T0.H; if (rel < 0 || rel > 1.05) continue;
        const lat = (-dx * Math.sin(fa) + dy * Math.cos(fa)) / T0.r, part = T0.k === 'p' && q.downed ? 'torso' : arrowPart(rel, lat);
        arrowHit(A, shooter, q, T0.k, part, A.h - T0.base, dx, dy, fa); done = true; break;
      }
      if (done) break;
      // obstáculos, paredes e chão
      const t = tileAt(A.x, A.y), o = WORLD.obj[t], gh = groundH(A.x, A.y);
      const wall = WORLD.bld[t] >= 0 && A.h < gh + 5.5, obst = BLOCKING.has(o) && A.h < gh + OBST_H(o);
      if (wall || obst || A.h <= gh) {
        const h = Math.max(gh + 0.05, Math.min(A.h, gh + 3));
        near(A.x, A.y, { t: 'astick', id: A.id, x: A.x, y: A.y, h, a: fa, pitch: Math.atan2(A.vz, Math.hypot(A.vx, A.vy) * 2), ms: 60000 }, VIEW_RADIUS + 10);
        done = true;
      }
    }
    if (done) { S.arrows = S.arrows.filter(z => z !== A); near(A.x, A.y, { t: 'arrowend', id: A.id }, VIEW_RADIUS + 10); }
  }
}
function arrowHit(A, p, q, k, part, h, dx, dy, fa) {
  const now = now_(), pow = A.pow, mult = 3 * (0.6 + 1.9 * Math.pow(pow, 1.5)) * (part === 'head' ? 2 : part.startsWith('leg') ? 0.75 : part.startsWith('arm') ? 0.85 : 1);
  const src = p || { id: A.by, x: A.x, y: A.y, cls: 'archer', lvl: 1, buffs: {}, body: null };
  const stick = { k, id: q.id, part, h, lx: dx, ly: dy, a: fa };
  if (k === 'n') { const r = p ? roll(p, mult) : { dmg: Math.round(12 * mult) }; npcDamage(q, r.dmg, p); }
  else if (k === 'p') { if (p) q._hitBy = { k: 'p', id: p.id, t: now };
    if (now < (q.dodgeUntil || 0)) { near(q.x, q.y, { t: 'whiff', id: q.id }); return; }
    if (hasShield(q) && q.parry && q.parry.z !== 'low' && Math.abs(angDiff(q.parry.a, fa + Math.PI)) <= PARRY_ARC) { shieldWear(q, 3); near(q.x, q.y, { t: 'clang', x: q.x + Math.cos(fa + Math.PI) * 0.4, y: q.y + Math.sin(fa + Math.PI) * 0.4 }); sendStat(q); return; }   // flecha cravada no escudo
    if (p && inSafe(q.x, q.y)) witnessCrime(p, p.x, p.y);
    const r = p ? roll(p, mult) : { dmg: Math.round(12 * mult), crit: false };
    damagePlayer(q, Math.round(r.dmg * (part === 'head' ? 1 : 1)), { x: A.x - Math.cos(fa), y: A.y - Math.sin(fa), name: p ? p.name : '' }, 0, null, part);
    if (S.players[q.id]) { (q.arrows = q.arrows || []).push({ part, t: now }); if (q.arrows.length > 14) q.arrows.shift(); if (q.bleed && part !== 'head') q.bleed[part] = Math.max(q.bleed[part] || 0, 0.6); sendStat(q); }
  } else {
    if (!S.monsters[q.id]) return;
    const r = p ? roll(p, mult, q) : { dmg: Math.round(12 * mult), crit: false };
    q.arrows = (q.arrows || 0) + 1; q.arrowBy = A.by;
    if (part.startsWith('leg')) q.slowUntil = Math.max(q.slowUntil || 0, now + 600000);
    if (p) { hitRolled(p, q, r.dmg, part === 'head' || r.crit, 0, part === 'head' ? 1 : 0); useGain(p, 'bow', 1); }
  }
  near(q.x, q.y, Object.assign({ t: 'stick' }, stick), VIEW_RADIUS + 10);
}
// arrancar uma flecha (dói e sangra); a bandagem tira as do lugar sem dor
function pullArrow(p) {
  if (!p.arrows || !p.arrows.length || p.downed) return;
  const a = p.arrows.pop(); damagePlayer(p, Math.max(2, Math.round(p.maxHp * 0.03)), null, 0, null, a.part);
  if (p.bleed && a.part !== 'head') p.bleed[a.part] = Math.max(p.bleed[a.part] || 0, 0.8);
  tell(p, 'Você arranca a flecha com um puxão. Arde.'); near(p.x, p.y, { t: 'unstick', k: 'p', id: p.id, n: 1 }); sendStat(p);
}
function bowTick(p, now, dt) {
  if (p.drawT && now - p.drawT > BOW.draw) { p.cst = (p.cst ?? CST_MAX) - BOW.holdDrain * dt; p.cstT = now; if (p.cst <= 0) { p.cst = 0; p.drawT = null; tell(p, 'O braço cansou e a corda relaxou.'); Net.toOne(p.id, { t: 'bowrelax' }); } }
}
function arrowBleedTick(now) {
  if (now - (S.arrowBleedT || 0) < 1000) return; S.arrowBleedT = now;
  for (const m of Object.values(S.monsters)) if (m.arrows) { m.hp -= m.arrows; if (m.hp <= 0) { const p = S.players[m.arrowBy]; if (p) killMonster(m, p, 0); else delete S.monsters[m.id]; } }
}

// ---------------- puxar (braços / pé), carregar nas costas e agarrão ----------------
// peso: 0-1 vai em qualquer forma; 2 (gente, orc, cervo) nas costas só com fôlego; 3 (troll, chefes, dragão) não se move
const WEIGHT = { rat: 0, toad: 0, slime: 0, spider: 0, wisp: 0, wolf: 1, goblin: 1, boar: 1, deer: 2, skeleton: 2, bandit: 2, deserter: 2, orc: 2, troll: 3, orcchief: 3, cryptlord: 3, deserterchief: 3, elderslime: 3, dragon: 3 };
const dirVec = d => { const th = (d || 0) * Math.PI / 4, sx = Math.sin(th), sy = Math.cos(th), vx = (sx + 2 * sy) / 2, vy = (2 * sy - sx) / 2, l = Math.hypot(vx, vy) || 1; return [vx / l, vy / l]; };
const dragTarget = (k, id) => k === 'p' ? S.players[id] : k === 'c' ? (S.corpses || {})[id] : k === 'n' ? (S.npcs || {})[id] : k === 'm' ? S.monsters[id] : null;
const weightOf = (k, t) => k === 'c' || k === 'm' ? (WEIGHT[t.type] ?? 2) : 2;
const GRIP_HUMANOID = new Set(['bandit', 'deserter', 'skeleton', 'orc']);
function startGrab(p, m) {
  if (p.downed || p.drag || p.carrying || p.lifted || p.carriedBy || p.gripBy || p.dragBy) return;
  const k = m.k, mode = m.mode, t = dragTarget(k, m.id);
  if (!t || t === p || !['arms', 'foot', 'back', 'grip', 'tie', 'lead'].includes(mode) || dist(p.x, p.y, t.x, t.y) > 2.1) return;
  const w = weightOf(k, t); if (w >= 3) { tell(p, 'Pesado demais para mover.'); return; }
  const now = now_();
  if (mode === 'lead') {
    if (k !== 'p' || t === p || !t.bound || t.downed || t.dragBy) return;
    p.drag = { k, id: t.id, mode: 'lead', w }; t.dragBy = p.id; t.dragMode = 'lead'; if (inSafe(p.x, p.y)) witnessCrime(p, p.x, p.y, 'grab');
    near(p.x, p.y, { t: 'drag', by: p.id, k, id: t.id, mode: 'lead' }); tell(t, p.name + ' te segura pelo braço e te conduz.'); return;
  }
  if (mode === 'tie') {
    if (k !== 'p' || t === p || t.bound || !(t.downed || t.surrendered || t.gripBy === p.id)) return;
    if (!(p.inv.rope > 0)) { tell(p, 'Você precisa de uma corda (Empório).'); return; }
    p.inv.rope--; if (!p.inv.rope) delete p.inv.rope; if (p.drag && p.drag.id === t.id) stopDrag(p); bindPlayer(t, 'rope'); if (inSafe(p.x, p.y)) witnessCrime(p, p.x, p.y, 'grab');
    tell(t, p.name + ' amarrou suas mãos com uma corda. Martele ESPAÇO para se soltar.'); tell(p, 'Você amarrou ' + t.name + '.'); sendStat(p); return;
  }
  if (mode === 'grip' && (k === 'm' || k === 'n')) {   // agarrar bicho pequeno, humanoide atordoado ou NPC em pé
    if (t.gripBy || t.dragBy || t.dead || t.downed || t.carrying) return;
    if (k === 'm') { const small = (WEIGHT[t.type] ?? 2) <= 1, weak = now < (t.stunUntil || 0) || t.sleep; if (!(small && !t.atk) && !(GRIP_HUMANOID.has(t.type) && weak)) { tell(p, small ? 'Ele está atacando: espere a brecha.' : 'Só dá para agarrar esse inimigo atordoado.'); return; } }
    if ((p.cst ?? 0) < 30) { tell(p, 'Sem fôlego para agarrar.'); return; }
    p.cst -= 20; t.gripBy = p.id; t.dragBy = p.id; t.atk = null; t.escAt = now + (k === 'm' ? ((WEIGHT[t.type] ?? 2) <= 1 ? 2600 : 3600) : 5000);
    p.drag = { k, id: t.id, mode, w, a: Math.atan2(t.y - p.y, t.x - p.x) };
    near(p.x, p.y, { t: 'drag', by: p.id, k, id: t.id, mode }); if (k === 'n') witnessCrime(p, p.x, p.y, 'grab'); sendStat(p); return;
  }
  if (mode === 'grip') {   // agarrão em quem está de pé: só pelas costas ou em quem está atordoado/sem fôlego
    if (k !== 'p' || t.downed || t.dev || t.gripBy || t.carriedBy) return;
    const [fx, fy] = dirVec(t.dir), behind = (fx * (p.x - t.x) + fy * (p.y - t.y)) / (dist(p.x, p.y, t.x, t.y) || 1) < -0.25;
    const weak = now < (t.stunUntil || 0) || now < (t.knockUntil || 0) || (t.cst ?? 99) < 25;
    if (!behind && !weak) { tell(p, 'Só dá para agarrar pelas costas (ou quem está atordoado ou exausto).'); return; }
    if ((p.cst ?? 0) < 40) { tell(p, 'Sem fôlego para agarrar.'); return; }
    p.cst -= 25; t.gripBy = p.id; t.esc = 0; t.dragBy = p.id; t.atk = null; t.parry = null; t.drawT = null;
    p.drag = { k, id: t.id, mode, w, a: Math.atan2(t.y - p.y, t.x - p.x) };
    near(p.x, p.y, { t: 'drag', by: p.id, k, id: t.id, mode }); tell(t, 'Você foi agarrado! Aperte ESPAÇO várias vezes para se soltar.'); witnessCrime(p, p.x, p.y); sendStat(p); sendStat(t); return;
  }
  if ((mode === 'arms' || mode === 'foot') && t.dragBy && !t.dragBy2 && !String(t.dragBy).includes(':')) {
    const pr = S.players[t.dragBy];
    if (pr && pr.drag && pr.drag.id === t.id && (pr.drag.mode === 'arms' || pr.drag.mode === 'foot')) {
      const other = pr.drag.mode === 'arms' ? 'foot' : 'arms';
      p.drag = { k, id: t.id, mode: other, w, helper: true }; t.dragBy2 = p.id; near(p.x, p.y, { t: 'drag', by: p.id, k, id: t.id, mode: other }); tell(p, 'Você pegou a outra ponta.'); return;
    }
  }
  if (k === 'p' && (!t.downed || t.carriedBy || t.dragBy || t.execAt || t.tied)) return;
  if (k === 'n' && ((!t.downed && !t.dead) || t.dragBy)) return;
  if (k === 'c' && t.dragBy) return;
  if (k === 'n' && (t.dead ? false : !t.downed)) return;
  if (mode === 'back') {
    if (w >= 2 && (p.cst ?? 0) < cstMaxOf(p) * 0.4) { tell(p, 'Sem fôlego para levantar esse peso.'); return; }
    if (k === 'p') { p.carrying = t.id; t.carriedBy = p.id; t.revive = null; near(p.x, p.y, { t: 'carry', by: p.id, id: t.id }); return; }   // gente nas costas: o carregar de sempre
  }
  p.drag = { k, id: t.id, mode, w }; t.dragBy = p.id; t.dragMode = mode; if (k === 'p') t.revive = null; if ((k === 'c' || k === 'n') && mode === 'back') t.onBack = p.id;
  near(p.x, p.y, { t: 'drag', by: p.id, k, id: t.id, mode });
}
function stopDrag(p, why) {
  const d = p.drag; if (!d) return; p.drag = null;
  const t = dragTarget(d.k, d.id);
  if (t && d.helper) { t.dragBy2 = null; near(p.x, p.y, { t: 'drag', by: p.id, k: d.k, id: d.id, mode: null }); if (why) tell(p, why); return; }
  if (t && t.dragBy2 && S.players[t.dragBy2] && S.players[t.dragBy2].drag) { const h = S.players[t.dragBy2]; t.dragBy = h.id; t.dragBy2 = null; h.drag.helper = false; t.dragMode = h.drag.mode; near(p.x, p.y, { t: 'drag', by: p.id, k: d.k, id: d.id, mode: null }); if (why) tell(p, why); return; }
  if (t) {
    t.dragBy = null; t.dragMode = null;
    if (d.mode === 'grip') { t.gripBy = null; t.esc = 0; t.choked = false; t.faintAt = 0; p.choking = false; p.chokeT = 0; if (d.k === 'p') sendStat(t); }
    if ((d.k === 'c' || d.k === 'n') && d.mode === 'back') { t.onBack = null; for (const [dx, dy] of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7], [0, 0]]) if (canStand(p.x + dx, p.y + dy, p.z || 0, 0.2)) { t.x = p.x + dx; t.y = p.y + dy; break; } }
  }
  near(p.x, p.y, { t: 'drag', by: p.id, k: d.k, id: d.id, mode: null });
  if (why) tell(p, why);
}
function struggle(p) {
  if (!p.gripBy) return; const g = S.players[p.gripBy]; if (!g) { p.gripBy = null; p.dragBy = null; return; }
  p.esc = (p.esc || 0) + (6 + 6 * clamp((p.cst ?? 0) / cstMaxOf(p), 0, 1)) * (p.choked ? 0.45 : 1); p.cst = Math.max(0, (p.cst ?? 0) - 2); g.cst = Math.max(0, (g.cst ?? 0) - 2.5);
  if (p.esc >= 100) { stopDrag(g, p.name + ' se soltou!'); tell(p, 'Você se soltou!'); near(p.x, p.y, { t: 'anim', w: 'p', id: g.id, a: 'hurt', ms: 500 }); g.stunUntil = now_() + 500; }
  else sendStat(p);
}
function dragTick(p, now, dt) {
  const d = p.drag; if (!d) return;
  const t = dragTarget(d.k, d.id);
  if (d.mode === 'lead') {   // conduzindo: a pessoa amarrada anda na frente, no seu ritmo
    if (!t || !t.bound || t.downed || p.downed) { stopDrag(p); return; }
    const [fx, fy] = dirVec(p.dir), nx = p.x + fx * 0.55, ny = p.y + fy * 0.55; if (canStand(nx, ny, p.z || 0, 0.15)) { t.x = nx; t.y = ny; }
    t.walking = !!p.walking; t.dir = p.dir; t.lastMv = now; return;
  }
  if (!t || p.downed || p.carriedBy || (d.k === 'p' && d.mode !== 'grip' && !t.downed) || (d.k === 'n' && d.mode !== 'grip' && !t.downed && !t.dead) || (d.mode === 'grip' && t.downed && !t.downed.faint && !t.faintAt) || (d.k === 'p' && t.carriedBy)) { stopDrag(p); return; }
  if (d.helper) { const pr = S.players[t.dragBy]; if (!pr || !pr.drag || pr.drag.id !== t.id) { d.helper = false; t.dragBy = p.id; t.dragBy2 = null; } else { if (dist(p.x, p.y, t.x, t.y) > 3) stopDrag(p, 'A ponta escapou da sua mão.'); return; } }
  if (t.dragBy2) { const h = S.players[t.dragBy2]; if (h && h.drag && h.drag.id === t.id) { t.x = (p.x + h.x) / 2; t.y = (p.y + h.y) / 2; t.z = p.z; t.lastMv = now; return; } t.dragBy2 = null; }
  if (p._lx != null) { const mx = p.x - p._lx, my = p.y - p._ly; if (mx * mx + my * my > 0.0004) p._dragA = Math.atan2(my, mx); } p._lx = p.x; p._ly = p.y;
  const a = p._dragA ?? Math.atan2(t.y - p.y, t.x - p.x) + Math.PI;
  if (d.mode === 'back') { t.x = p.x; t.y = p.y; t.z = p.z; p.cst -= (d.w >= 2 ? 8 : 2) * dt; p.cstT = now; if (p.cst <= 0) { p.cst = 0; stopDrag(p, 'O peso venceu: você largou.'); } return; }
  if (d.mode === 'grip') {   // a vítima fica presa na frente de quem agarra
    const [fx, fy] = dirVec(p.dir), nx = p.x + fx * 0.48, ny = p.y + fy * 0.48;
    if (canStand(nx, ny, p.z || 0, 0.15)) { t.x = nx; t.y = ny; } t.lastMv = now; t.walking = !!p.walking; t.dir = p.dir;
    t.choked = !!p.choking;
    if (p.choking) {   // apertando o pescoço: a vítima perde o fôlego, desmaia em ~5s e morre se continuar mais ~5s
      p.chokeT = (p.chokeT || 0) + dt; if (inSafe(p.x, p.y)) witnessCrime(p, p.x, p.y, p.chokeT > 9.5 ? 'murder' : 'grab');
      if (d.k === 'p') { t.cst = Math.max(0, (t.cst ?? 0) - 40 * dt); t.esc = Math.max(0, (t.esc || 0) - 12 * dt); }
      if (d.k === 'n') t.escAt = Math.max(t.escAt || 0, now + 1500);
      if (d.k === 'm') { t.escAt = Math.max(t.escAt || 0, now + 1500); if (p.chokeT > 5) { killMonster(t, p, 0); stopDrag(p); return; } }
      if (p.chokeT > 5 && !t.faintAt) {
        t.faintAt = now;
        if (d.k === 'p') { goDown(t, { x: p.x, y: p.y, name: p.name }); if (t.downed) { t.downed.faint = true; t.downed.until = now + 30000; } tell(t, 'Tudo escurece... você desmaiou.'); }
        else if (d.k === 'n') { t.downed = { until: now + 30000 }; sys(t.name + ' desmaiou.'); }
      }
      if (p.chokeT > 10) {
        if (d.k === 'p') { if (t.downed) t.downed.faint = false; if (PERMADEATH && !t.dev && !t.devPowers) permaDeath(t, 'estrangulado'); else respawnTemple(t); }
        else if (d.k === 'n') npcDie(t, p);
        stopDrag(p); return;
      }
    } else { p.chokeT = Math.max(0, (p.chokeT || 0) - dt * 0.6); if (t.faintAt && !(t.downed && t.downed.faint)) t.faintAt = 0; }
    p.cst -= (p.choking ? 5 : 9) * dt; p.cstT = now; if (p.cst <= 0) { p.cst = 0; stopDrag(p, 'Sem fôlego: você soltou.'); if (d.k === 'p') tell(t, 'Você se soltou!'); }
    return;
  }
  const back = d.mode === 'arms' ? 1.0 : 1.2, nx = p.x - Math.cos(a) * back, ny = p.y - Math.sin(a) * back;
  if (canStand(nx, ny, p.z || 0, 0.15) || dist(nx, ny, p.x, p.y) < 0.5) { t.x = nx; t.y = ny; }
  if (dist(t.x, t.y, p.x, p.y) > 2.5) { t.x = nx; t.y = ny; }   // não deixa o corpo ficar para trás preso numa quina
  t.z = p.z; t.lastMv = now;
}
function dragCleanup() {
  for (const L of [Object.values(S.players), Object.values(S.corpses || {}), Object.values(S.npcs || {})]) for (const q of L) if (q.dragBy2 && (!S.players[q.dragBy2] || !S.players[q.dragBy2].drag || S.players[q.dragBy2].drag.id !== q.id)) q.dragBy2 = null;
  for (const q of Object.values(S.players)) if (q.dragBy && !/^(w:|n:|m:|exec)/.test(String(q.dragBy)) && (!S.players[q.dragBy] || !S.players[q.dragBy].drag || S.players[q.dragBy].drag.id !== q.id)) { q.dragBy = null; q.gripBy = null; q.dragMode = null; q.esc = 0; }
  for (const c of Object.values(S.npcs || {})) if (c.dragBy && (!S.players[c.dragBy] || !S.players[c.dragBy].drag || S.players[c.dragBy].drag.id !== c.id)) { c.dragBy = null; c.dragMode = null; c.onBack = null; }
  for (const c of Object.values(S.corpses || {})) if (c.dragBy && (!S.players[c.dragBy] || !S.players[c.dragBy].drag || S.players[c.dragBy].drag.id !== c.id)) { c.dragBy = null; c.dragMode = null; c.onBack = null; }
}

// ---------------- NPCs vulneráveis, sentinelas que agem, prisioneiros e lobos que arrastam ----------------
const NPC_HP = { guard: 260, executioner: 220, captain: 240 };
function initNpcs() {
  if (S.npcs) return; S.npcs = {};
  for (const n of NPCS) S.npcs[n.id] = { id: n.id, kind: n.kind, role: n.role, bi: n.bi, home: n.home, name: n.name, route: n.route, ri: 0, patrol: n.patrol, sitting: n.sitting ? true : undefined, kneel: n.kneel ? true : undefined, pairOf: n.pairOf, pairOff: n.pairOff, x: n.x, y: n.y, z: 0, postX: n.x, postY: n.y, hp: NPC_HP[n.kind] || 90, maxHp: NPC_HP[n.kind] || 90, downed: null, dead: false };
}
const npcAlive = id => { const n = S.npcs && S.npcs[id]; return !n || (!n.dead && !n.downed); };
/* magias de área também atingem NPCs (antes só monstros). one: só o mais perto (faíscas). Devolve quantos acertou. */
function spellNpcs(p, inArea, mult, el, extra, one) { if (!p || !S.npcs) return 0; let hit = 0, best = null, bd = 1e9;
  for (const n of Object.values(S.npcs)) { if (n.dead || n.entOf || n.siege || (n.fl || 0) !== (p.fl || 0) || n.seg && n.seg === estOwner(p) || n.emp && n.emp === estOwner(p) || !inArea(n)) continue;
    if (one) { const d = dist(n.x, n.y, p.x, p.y); if (d < bd) { bd = d; best = n; } continue; }
    p._el = el; npcDamage(n, Math.max(1, roll(p, mult).dmg), p); p._el = null; if (extra) extra(n); hit++; }
  if (one && best) { p._el = el; npcDamage(best, Math.max(1, roll(p, mult).dmg), p); p._el = null; if (extra) extra(best); hit = 1; }
  return hit; }
function npcDamage(n, dmg, p) {
  if (!n || n.dead) return; const now = now_();
  if (n.transient && n.wantedT > now) { n.hp -= dmg; sfx(n.x, n.y, '-' + dmg, '#ff8a6a'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 300 }); if (n.hp <= 0) thiefCaught(n, p); return; }
  if (p && !p.dev) { memEvent(p, n.x, n.y, n.downed ? 'murder' : 'assault', n); p._memT = now; }
  if (p) witnessCrime(p, n.x, n.y, n.downed ? 'murder' : 'assault');
  if (n.carrying) { npcDropCarried(n); n.mission = null; sys(n.name + ' largou o preso!'); }   // resgate: atacar o guarda que leva alguém
  if (n.kind === 'executioner') abortExecution('O carrasco foi atacado! A execução foi interrompida.');
  if (n.seg) { if (n.downed) { if (typeof segKilled === 'function') segKilled(n, p); return; } n.hp -= dmg; sfx(n.x, n.y, '-' + dmg, '#ff8a6a'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 300 }); if (n.hp <= 0) { n.hp = 0; n.downed = { until: now + 90000 }; n.fight = null; n.fightN = null; n.monT = null; n.kill = null; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 500 }); const q2 = typeof empOwnerP === 'function' && empOwnerP(n.seg); if (q2) tell(q2, n.name.split(',')[0] + ' caiu! Socorra ou ele morre.'); return; } if (p && !n.fight) n.fight = { id: p.id, until: now + 20000 }; return; }   /* segurança atacado: revida (e pode morrer) */
  if (n.downed) { npcDie(n, p); return; }
  n.hp -= dmg; sfx(n.x, n.y, '-' + dmg, '#ff8a6a'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 300 });
  if (n.kind === 'guard' && p) { n.aggro = p.id; p.wanted = Math.max(p.wanted || 0, now + 300000); Net.toAll({ t: 'wanted', id: p.id, ms: p.wanted - now }); }
  if (n.hp <= 0) { n.hp = 0; n.downed = { until: now + 45000 }; n.fight = null; n.flee = null; n.carrying && npcDropCarried(n); if (n.role === 'courier') courierRobbed(n); if (n.role === 'supplier' && n.job) { if (n.job.st === 'levando') { delete n.job.o.queued; } n.job = null; } sys(n.name + ' caiu ferido!'); }
  else if (p && n.kind !== 'guard' && n.kind !== 'captain') npcReact(n, p, now);
}
// morador atacado: os corajosos revidam, os outros fogem gritando pela guarda; em todo caso a guarda é chamada
const BRAVE = new Set(['smith', 'executioner', 'jailer', 'st_saw', 'st_mine', 'courier3', 'st_carp', 'innkeeper']);
const SHOUTS = ['Guardas! Socorro!', 'Socorro! Guardas!', 'Me ajudem!', 'Assassino! Guardas!'];
function npcReact(n, p, now) {
  if (p.dev) return;
  if (!(now < (p.wanted || 0))) { p.wanted = now + 300000; Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); if (!p._crimeT || now - p._crimeT > 4000) { p._crimeT = now; crimeSentence(p, 'assault'); } }
  const guards = Object.values(S.npcs).filter(g => g.kind === 'guard' && !g.dead && !g.downed && !g.lead && !g.carrying).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y)).slice(0, 2);
  for (const g of guards) if (dist(g.x, g.y, n.x, n.y) < 40) { g.aggro = p.id; g.arrest = p.id; g.alert = { x: n.x, y: n.y, until: now + 25000 }; }
  if (BRAVE.has(n.kind) || BRAVE.has(n.id)) { if (!n.fight) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt: 'Vai pagar por isso!', ms: 1 }); n.fight = { id: p.id, until: now + 15000 }; n.flee = null; }
  else { if (!n.flee || now - (n.shoutT || 0) > 3000) { n.shoutT = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt: SHOUTS[Math.floor(Math.random() * SHOUTS.length)], ms: 1 }, VIEW_RADIUS + 6); } n.flee = { id: p.id, until: now + 9000 }; }
}
function npcFightTick(n, now, dt) {
  const q = S.players[n.fight.id]; if (!q || q.downed || q.dev || now > n.fight.until || dist(n.x, n.y, q.x, q.y) > 14) { n.fight = null; n.goHome = true; return false; }
  const d = dist(n.x, n.y, q.x, q.y); { const [sx, sy] = attackSlot(n, q), ds = dist(n.x, n.y, sx, sy); if (d > 1.6 || (ds > 0.35 && d > 0.7 && (sx !== q.x || sy !== q.y))) { npcWalk(n, sx, sy, d > 3 ? 2.1 : 1.5, dt); if (d > 1.6) return true; } }
  n.dir = dirFromVecS(q.x - n.x, q.y - n.y);
  if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1500; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: q.x, ty: q.y });
    setTimeout(() => { if (n.dead || n.downed || !S.players[q.id] || q.downed || dist(n.x, n.y, q.x, q.y) > 1.8) return; if (now_() < (q.dodgeUntil || 0)) { near(q.x, q.y, { t: 'whiff', id: q.id }); return; } if (q.parry) { q.cst -= 10; near(q.x, q.y, { t: 'clang', x: (n.x + q.x) / 2, y: (n.y + q.y) / 2 }); sendStat(q); return; } damagePlayer(q, rint(7, 13), { x: n.x, y: n.y, name: n.name, id: n.id, npc: 1 }, 0, 'torso'); }, 480); }
  return true;
}
function npcFleeTick(n, now, dt) {
  const q = S.players[n.flee.id]; if (!q || now > n.flee.until) { n.flee = null; n.goHome = true; return false; }
  const dx = n.x - q.x, dy = n.y - q.y, L = Math.hypot(dx, dy) || 1; npcWalk(n, n.x + dx / L * 4, n.y + dy / L * 4, 2.5, dt); return true;
}
// caído: se arrasta para longe de quem está perto, implorando, e deixa rastro de sangue (o cliente desenha)
function npcCrawl(n, now, dt) {
  n.crawl = false; if (n.dragBy || n.onBack || n.gripBy) return;
  let q = null, bd = 5; for (const p of Object.values(S.players)) { if (p.dev || p.downed) continue; const d = dist(n.x, n.y, p.x, p.y); if (d < bd) { bd = d; q = p; } }
  if (!q) return;
  const base = Math.atan2(n.y - q.y, n.x - q.x), s = 0.28 * dt;
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) { const ang = base + off, nx = n.x + Math.cos(ang) * s, ny = n.y + Math.sin(ang) * s; if (canStand(nx, ny, 0, 0.2) || canStand(n.x + Math.cos(ang) * 0.7, n.y + Math.sin(ang) * 0.7, 0, 0.2)) { n.x = nx; n.y = ny; n.crawl = true; n.dir = dirFromVecS(Math.cos(ang), Math.sin(ang)); break; } }
  if (now - (n.mercyT || 0) > 4500) { n.mercyT = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'mercy', txt: ['Misericórdia!', 'Por favor... não!', 'Tenho família!', 'Piedade...', 'Eu imploro!'][Math.floor(Math.random() * 5)], ms: 1 }); }
}
function npcDie(n, p) {
  n.dead = true; n.downed = null; n.hp = 0; if (n.carrying) npcDropCarried(n);
  if (n.dragBy && S.players[n.dragBy]) stopDrag(S.players[n.dragBy]);
  sys(n.name + ' morreu' + (p ? ' pelas mãos de ' + p.name : '') + '. A cidade não o terá de volta tão cedo.');
}
// carregar jogador (sentinelas e monstros levam nas costas)
function entCarry(c, q, tag) { c.carrying = q.id; q.carriedBy = tag; q.revive = null; if (q.dragBy && S.players[q.dragBy]) stopDrag(S.players[q.dragBy]); }
function npcDropCarried(c) { const q = S.players[c.carrying]; c.carrying = null; if (!q) return; q.carriedBy = null; q.x = c.x + 0.5; q.y = c.y; q.z = 0; return q; }
// movimento simples de NPC (sem a regra de "monstro não entra na cidade"), seguindo um caminho quando o anfitrião tem o pathfinder
function npcWalkOld(n, tx, ty, speed, dt) {
  if (n.path && n.path.length && (n.pathTo[0] !== Math.round(tx) || n.pathTo[1] !== Math.round(ty))) n.path = null;
  if (!n.path && typeof findPath === 'function' && dist(n.x, n.y, tx, ty) > 2) { try { n.path = findPath(n.x, n.y, tx, ty, 0, 0) || findPath(n.x, n.y, tx, ty, 0, 1) || []; } catch (e) { n.path = []; } n.pathTo = [Math.round(tx), Math.round(ty)]; }
  let gx = tx, gy = ty; if (n.path && n.path.length) { [gx, gy] = n.path[0]; if (dist(n.x, n.y, gx, gy) < 0.35) n.path.shift(); }
  const dx = gx - n.x, dy = gy - n.y, d = Math.hypot(dx, dy); if (d < 0.05) return dist(n.x, n.y, tx, ty) < 0.6;
  const s = Math.min(d, speed * dt), nx = n.x + dx / d * s, ny = n.y + dy / d * s;
  const px = n.x, py = n.y;
  if (canStand(nx, ny, 0, 0.22)) { n.x = nx; n.y = ny; } else if (Math.abs(nx - n.x) > 0.002 && canStand(nx, n.y, 0, 0.22)) n.x = nx; else if (Math.abs(ny - n.y) > 0.002 && canStand(n.x, ny, 0, 0.22)) n.y = ny; else { n.x = nx; n.y = ny; }
  if (Math.hypot(n.x - px, n.y - py) < s * 0.3) { n._stuck = (n._stuck || 0) + 1; if (n._stuck > 8) { n._stuck = 0; n.path = null; n.x = nx; n.y = ny; } } else n._stuck = 0;   // travou numa quina: refaz o caminho
  n.walk = true; return dist(n.x, n.y, tx, ty) < 0.6;
}
const JAIL_MS = 120000;
const dirFromVecS = (dx, dy) => { const sx = dx - dy, sy = (dx + dy) * 0.5; return ((Math.round(Math.atan2(sx, sy) / (Math.PI / 4)) % 8) + 8) % 8; };
function jailSpotOld() {
  if (S.jail !== undefined) return S.jail; S.jail = null;
  const bi = BUILDINGS.findIndex(b => b.kind === 'barracks'); if (bi < 0) return null; const b = BUILDINGS[bi];
  for (let y = b.y + 1; y < b.y + b.h - 1 && !S.jail; y++) for (let x = b.x + 1; x < b.x + b.w - 1 && !S.jail; x++) if (WORLD.bld[y * MAP_W + x] === bi && canStand(x, y, 0, 0.25)) S.jail = { x, y, bi };
  return S.jail;
}
// execução (versão térrea abaixo)
function startExecutionOld(v, by) {
  if (!npcAlive('executioner') || v.execAt) return false;
  if (v.wanted) { v.wanted = 0; Net.toAll({ t: 'wanted', id: v.id, ms: 0 }); }
  const now = now_(); v.x = STAGE.x; v.y = STAGE.y; v.z = 0; v.execAt = now + 2600; v.downed.until = Math.max(v.downed.until, now + 12000);
  near(STAGE.x, STAGE.y, { t: 'exec', id: v.id, x: STAGE.x, y: STAGE.y, ms: 2600 }); sys(by + ' levou ' + v.name + ' ao cadafalso!');
  setTimeout(() => { const q = S.players[v.id]; if (!q) return; q.execAt = 0; if (!q.downed) return; q.downed = null; severPlayer(q, 'head', { x: STAGE.x, y: STAGE.y + 1, name: 'o Carrasco' }); }, 2600);
  return true;
}
function guardsOn(pid, self) { let c = 0; for (const o of Object.values(S.npcs)) if (o !== self && o.kind === 'guard' && !o.dead && !o.downed && (o.arrest === pid || o.aggro === pid || o.goFetch === pid || (o.lead && o.lead.id === pid) || o.carrying === pid)) c++; return c; }   /* quantas sentinelas já cuidam desse jogador */
// lugar em volta do alvo para cada atacante (não se amontoam: cada um ataca de um lado)
function attackSlot(n, tgt) {
  const crew = Object.values(S.npcs).filter(o => !o.dead && !o.downed && (o.arrest === tgt.id || o.aggro === tgt.id || (o.fight && o.fight.id === tgt.id)) && dist(o.x, o.y, tgt.x, tgt.y) < 6).sort((a, b) => (a.id < b.id ? -1 : 1));
  const k = Math.max(0, crew.indexOf(n)), N = Math.max(1, crew.length); if (N < 2) return [tgt.x, tgt.y];
  const base = Math.atan2(crew[0].y - tgt.y, crew[0].x - tgt.x), a = base + k * (Math.PI * 2 / N), r = 1.0;
  const x = tgt.x + Math.cos(a) * r, y = tgt.y + Math.sin(a) * r; return npcStand(x, y, 0.2) ? [x, y] : [tgt.x, tgt.y];
}
function guardThink(n, now, dt) {
  n.walk = false;
  if (n.lead) { leadTick(n, now, dt); return; }
  if (n.fightSeg) { const t = S.npcs[n.fightSeg]; if (!t || t.dead || now > (n.fightSegT || 0)) n.fightSeg = null; else { const d = dist(n.x, n.y, t.x, t.y); if (d > 1.3) { npcWalk(n, t.x, t.y, 2.3, dt); return; } n.dir = dirFromVecS(t.x - n.x, t.y - n.y); if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1400; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: t.x, ty: t.y }); setTimeout(() => { if (!n.dead && !n.downed && S.npcs[t.id] && !t.dead && dist(n.x, n.y, t.x, t.y) < 1.9) npcDamage(t, rint(14, 22), null); }, 420); } return; } }   /* briga com um segurança contratado */
  if (n.escort) {   // (antigo) escoltando um preso até a cela
    const q = S.players[n.escort]; if (!q || q.downed) { if (q) { q.escortBy = null; q.dragBy = null; } n.escort = null; return; }
    const J = jailSpot(); if (!J) { n.escort = null; q.escortBy = null; q.dragBy = null; return; }
    const ox = n.x, oy = n.y, arrived = npcWalk(n, J.x, J.y, 1.5, dt), mx = n.x - ox, my = n.y - oy, ml = Math.hypot(mx, my);
    if (ml > 0.001) { const nx = n.x - mx / ml * 0.8, ny = n.y - my / ml * 0.8; if (canStand(nx, ny, 0, 0.2)) { q.x = nx; q.y = ny; } q.dir = n.dir = dirFromVecS(mx, my); }
    q.lastMv = now;
    if (arrived) { q.escortBy = null; q.dragBy = null; n.escort = null; jailPlayer(q, q.sentence || CRIME_MS.assault); sys(q.name + ' foi preso na cadeia.'); }
    return;
  }
  for (const q of Object.values(S.players)) {   // procurado que se rendeu: vai buscar
    if (!q.surrendered || q.escortBy || q.downed) continue; if (Object.values(S.npcs).some(o => o !== n && o.escort === q.id)) continue;
    const d = dist(n.x, n.y, q.x, q.y); if (d > 22) continue;
    if (d < 1.2) { if (Object.values(S.npcs).some(o => o.lead && o.lead.id === q.id)) return; startLead(n, q, 'jail', now); }
    else npcWalk(n, q.x, q.y, 2.0, dt);
    return;
  }
  // carregando alguém: procurado vai ao cadafalso; ferido inocente vai à sacerdotisa
  if (n.carrying) {
    const q = S.players[n.carrying]; if (!q || !q.downed) { if (q) npcDropCarried(n); else n.carrying = null; return; }
    n.carryT = n.carryT || now; if (now - n.carryT > 70000) { n.carryT = 0; const v = npcDropCarried(n); if (v) { if (n.mission === 'stage' && STAGE.x >= 0) { v.x = STAGE.x - 1.6; v.y = STAGE.y + 1.2; if (!startExecution(v, n.name)) tell(v, 'Sem carrasco, a sentinela te larga no cadafalso.'); } else { v.x = TEMPLE_SPAWN.x; v.y = TEMPLE_SPAWN.y; if (npcAlive('priest')) revivePlayer(v, 0.35, 'Irmã Lúmina'); } Net.toOne(v.id, { t: 'tp', x: v.x, y: v.y, z: 0, fl: 0, fb: -1 }); } n.mission = null; return; }   /* caminho travado: chega de qualquer jeito */
    q.x = n.x; q.y = n.y; q.downed.until = Math.max(q.downed.until, now + 4000);
    if (n.mission === 'stage' && STAGE.x >= 0) { if (npcWalk(n, STAGE.x - 1.6, STAGE.y + 1.2, 1.7, dt)) { const v = npcDropCarried(n); if (v && !startExecution(v, n.name)) tell(v, 'Sem carrasco, a sentinela te larga no cadafalso.'); n.mission = null; } }
    else { const tx = TEMPLE_SPAWN.x, ty = TEMPLE_SPAWN.y; if (npcWalk(n, tx, ty, 1.7, dt)) { const v = npcDropCarried(n); n.mission = null; if (v && npcAlive('priest')) { revivePlayer(v, 0.35, 'Irmã Lúmina'); tell(v, 'A sentinela te trouxe até a Irmã Lúmina.'); } } }
    return;
  }
  // procurados à vista: persegue e ataca; caído, carrega
  let tgt = null, bd = 14;
  for (const q of Object.values(S.players)) { if (q.dev || q.carriedBy || q.execAt || q.condemned || q.bound || q.jailUntil > now || q.escortBy || q.surrendered || !(now < (q.wanted || 0) || n.aggro === q.id || n.arrest === q.id)) continue; if (n.arrest !== q.id && n.aggro !== q.id && guardsOn(q.id, n) >= 2) continue; const d = dist(n.x, n.y, q.x, q.y), mine = n.arrest === q.id && now < (q.wanted || 0); if ((d < bd && (d < 3 || sightClear(n.x, n.y, q.x, q.y))) || (mine && d < 40)) { bd = mine ? -1 : d; tgt = q; } }
  if (tgt) bd = dist(n.x, n.y, tgt.x, tgt.y);
  if (tgt && n.arrest !== tgt.id && !tgt.downed) { n.arrest = tgt.id; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt: ['Pare! Em nome de Nae!', 'Alto lá! Largue a arma!', 'Renda-se!'][Math.floor(Math.random() * 3)], ms: 1 }); }
  if (!tgt && n.arrest) { const q = S.players[n.arrest]; if (!q || !(now < (q.wanted || 0)) || q.jailUntil > now) n.arrest = null; }
  if (!tgt) for (const q of Object.values(S.players)) {   // procurado caído por perto (mesmo sem linha de visão): vai buscar
    if (!q.downed || q.dev || q.carriedBy || q.execAt || q.condemned || q.jailUntil > now || q.dragBy || !(now < (q.wanted || 0))) continue;
    if (Object.values(S.npcs).some(o => o !== n && (o.lead && o.lead.id === q.id || o.goFetch === q.id))) continue;
    const d = dist(n.x, n.y, q.x, q.y); if (d < 20 && d < bd + 6) { tgt = q; bd = d; n.goFetch = q.id; }
  }
  if (tgt) {
    if (tgt.downed) { if (dist(n.x, n.y, tgt.x, tgt.y) < 1.3) { if (Object.values(S.npcs).some(o => o.lead && o.lead.id === tgt.id)) return; n.aggro = null; n.arrest = null; startLead(n, tgt, tgt.murderer ? 'stage' : 'jail', now); } else npcWalk(n, tgt.x, tgt.y, 2.3, dt); return; }
    { const [sx, sy] = attackSlot(n, tgt), ds = dist(n.x, n.y, sx, sy); if (bd > 1.6 || (ds > 0.35 && bd > 0.7 && (sx !== tgt.x || sy !== tgt.y))) { npcWalk(n, sx, sy, bd > 3 ? 2.3 : 1.6, dt); if (bd > 1.6) return; } }
    if (now >= (n.nextAtk || 0)) {
      n.nextAtk = now + 1400; n.face = Math.atan2(tgt.y - n.y, tgt.x - n.x);
      near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: tgt.x, ty: tgt.y });
      setTimeout(() => { if (n.dead || n.downed || !S.players[tgt.id] || tgt.downed || dist(n.x, n.y, tgt.x, tgt.y) > 1.8) return; if (now_() < (tgt.dodgeUntil || 0)) { near(tgt.x, tgt.y, { t: 'whiff', id: tgt.id }); return; } if (tgt.parry) { tgt.cst -= 16; near(tgt.x, tgt.y, { t: 'clang', x: (n.x + tgt.x) / 2, y: (n.y + tgt.y) / 2 }); if (tgt.cst <= 0) guardBreak(tgt, now_()); sendStat(tgt); return; } damagePlayer(tgt, rint(16, 26), { x: n.x, y: n.y, name: n.name, id: n.id, npc: 1 }, 0, 'torso'); }, 480);
    }
    return;
  }
  n.aggro = null; n.goFetch = null;
  if (n.chaseNpc) { const t = S.npcs[n.chaseNpc]; if (!t || !(t.wantedT > now)) n.chaseNpc = null; else { if (dist(n.x, n.y, t.x, t.y) < 1.3) { n.chaseNpc = null; thiefCaught(t, null); } else npcWalk(n, t.x, t.y, 2.7, dt); return; } }
  if (guardFightMonster(n, now, dt)) return;
  if (guardThreat(n, now, dt)) return;
  if (n.alert && now < n.alert.until) { if (npcWalk(n, n.alert.x, n.alert.y, 2.3, dt)) n.alert = null; return; } else n.alert = null;   // chamado por um morador: corre até lá
  // socorro: jogador caído (não procurado) dentro da cidade, sem ninguém cuidando
  for (const q of Object.values(S.players)) {
    if (!q.downed || q.downed.faint || q.carriedBy || q.dragBy || q.tied || q.execAt || !inSafe(q.x, q.y) || now < (q.wanted || 0)) continue;
    if (Object.values(S.npcs).some(o => o !== n && o.carrying === q.id)) continue;
    const d = dist(n.x, n.y, q.x, q.y); if (d > 16 || now - (q.downed.until - DOWNED_MS) < 4000) continue;
    if (d < 1.3) { entCarry(n, q, 'n:' + n.id); n.mission = 'temple'; tell(q, 'Uma sentinela te pegou para levar à sacerdotisa.'); } else npcWalk(n, q.x, q.y, 2.2, dt);
    return;
  }
  if (n.patrol) { const R = n.patrol, w = R[(n.pi || 0) % R.length]; if (now < (n.pauseT || 0)) return; if (npcWalk(n, w[0], w[1], 0.85, dt)) { n.pi = (n.pi || 0) + 1; n.pauseT = now + 3500 + Math.random() * 3000; } return; }
  if (n.pairOf) { const L = S.npcs[n.pairOf]; if (L && !L.dead && !L.downed && L.patrol) { const tx = L.x + n.pairOff[0], ty = L.y + n.pairOff[1]; if (dist(n.x, n.y, tx, ty) > 0.35) npcWalk(n, tx, ty, dist(n.x, n.y, tx, ty) > 2 ? 1.3 : 0.85, dt); else n.dir = L.dir; return; } }
  if (dist(n.x, n.y, n.postX, n.postY) > 0.5) npcWalk(n, n.postX, n.postY, 1.6, dt);
}
// o Tecelão por perto: os moradores largam o que fazem, seguem a poucos passos e, quando ele para, ajoelham em adoração por 15 s
function weaverFollow(n, now, dt) {
  if (n.lead || n.carrying || n.dragBy || n.gripBy || n.job || n.walkTo || n.aggro || n.flee || n.fight || n.id === 'fruit' || n.sleeping) { if (n.follow) n.follow = null; return false; }
  let W = null, bd = 12; for (const p of Object.values(S.players)) { if (!p.dev || p.devHidden || (p.z || 0) >= 0.5) continue; const d = dist(n.x, n.y, p.x, p.y); if (d < bd) { bd = d; W = p; } }
  if (!W) { if (n.follow) { n.follow = null; n.adoreT = 0; n.goHome = true; } return false; }
  if (!n.follow) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'surprise', ms: 900 });
  n.follow = W.id; const h = [...n.id].reduce((a, c) => a + c.charCodeAt(0), 0), ang = (h % 12) / 12 * Math.PI * 2, rr = 1.6 + (h % 3) * 0.35;
  const tx = W.x + Math.cos(ang) * rr, ty = W.y + Math.sin(ang) * rr, still = now - (W.lastMv || 0) > 1200;
  if (dist(n.x, n.y, tx, ty) > 0.55 && !(still && n.adoreT)) { npcWalk(n, tx, ty, still ? 1.3 : 1.8, dt); if (n.adoreT) { n.adoreT = 0; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'look', ms: 200 }); } return true; }
  n.dir = dirFromVecS(W.x - n.x, W.y - n.y);
  if (still && !n.adoreT) { n.adoreT = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'adore', ms: 15000, tx: W.x, ty: W.y }); }
  if (!still && n.adoreT) { n.adoreT = 0; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'look', ms: 200 }); }
  return true;
}
function npcTick(now, dt) {
  initNpcs(); tavernTick(now); collectorSync(now); try { tonelTick(now); } catch (e) { console.warn('tonel', e); }
  if (now - (S.dispT || 0) > 3000) { S.dispT = now; try { dispatchCouriers(); } catch (e) { console.warn('entregas', e); } }   // mensageiros saem assim que ficam livres
  if (now - (S.visT || 0) > 1500) { S.visT = now; const night = typeof dayInfoS === 'function' ? dayInfoS().night : false, want = night ? 5 : 15, have = Object.values(S.npcs).filter(n => n.transient && !n.bizWorker && !n.bard && !n.collector && !n.emp && !n.seg && !n.court && !n.entOf).length; if (have < want && Math.random() < 0.5 && Object.keys(S.players).length) visSpawn(now); for (const n of Object.values(S.npcs)) if (n.transient && (n.dead || now - n.born > 600000) && !n.dragBy) visGone(n); }
  for (const n of Object.values(S.npcs)) {
    if (n.dead || n.entOf || n.court) continue;   /* a guardiã anda no entTick; a corte do castelo no courtTick */
    if (n.downed && n.seg && typeof segDownTick === 'function') { segDownTick(n, now, dt); continue; }
    if (n.downed) { npcCrawl(n, now, dt); if (now > n.downed.until && !n.dragBy) { n.downed = null; n.hp = Math.round(n.maxHp * 0.3); n.goHome = n.id !== 'fruit'; sys(n.name + ' se levantou, ferido.'); } continue; }
    if (n.fight && npcFightTick(n, now, dt)) continue;
    if (n.flee && npcFleeTick(n, now, dt)) continue;
    if (weaverFollow(n, now, dt)) continue;
    if (S.exec && crowdTick(n, now, dt)) continue;
    if (n.collector) { collectorTick(n, now, dt); continue; }
    if (n.bizWorker) { workerTick(n, now, dt); continue; }
    if (n.bard) continue;   // o bardo fica tocando no canto
    if (n.emp && typeof empNpcTick === 'function') { empNpcTick(n, now, dt); continue; }
    if (n.seg && typeof segNpcTick === 'function') { segNpcTick(n, now, dt); if (typeof segSeparate === 'function') segSeparate(n, dt); continue; }   /* segurança contratado */   /* empregado doméstico */
    if (n.transient) { visitorTick(n, now, dt); continue; }
    if (n.goHome && !n.dragBy && !n.gripBy) { if (npcWalk(n, n.postX, n.postY, 1.3, dt)) { n.goHome = false; n.x = n.postX; n.y = n.postY; } continue; }
    if (n.route && !n.dragBy && !n.gripBy) { if (now >= (n.pauseT || 0)) { const wp = n.route[n.ri % n.route.length]; if (npcWalk(n, wp[0], wp[1], 0.9, dt)) { n.ri++; n.pauseT = now + 3000 + Math.random() * 5000; } } continue; }
    if (n.walkTo && !n.dragBy) { if (npcWalk(n, n.walkTo[0], n.walkTo[1], 1.1, dt)) { n.x = n.walkTo[0]; n.y = n.walkTo[1]; n.walkTo = null; } }
    if (n.gripBy && !n.downed) { const g = S.players[n.gripBy]; if (!g || !g.drag || g.drag.id !== n.id || now > n.escAt) { n.gripBy = null; n.dragBy = null; if (g && g.drag && g.drag.id === n.id) stopDrag(g, n.name + ' se soltou!'); } continue; }
    if (n.dragBy) continue;
    if (n.kind === 'guard') { guardThink(n, now, dt); continue; }
    if (n.id === 'tavmaid' && gretaServe(n, now, dt)) continue;   /* Lina leva canecas às mesas */
    if (n.role && n.home != null && !(n.role === 'courier' && n.job)) { residentTick(n, now, dt); continue; }
    if (n.role === 'courier') { courierTick(n, now, dt); continue; }
    if (n.role === 'supplier') { supplierTick(n, now, dt); continue; }
    if (n.id === 'fruit' && typeof G !== 'undefined' && G.npcs && G.npcs.fruit) { n.x = G.npcs.fruit.x; n.y = G.npcs.fruit.y; }
  }
}
// ---------- monstros: orcs/bandidos levam prisioneiros, lobos arrastam a presa ----------
const CAPTORS = new Set(['orc', 'bandit', 'deserter', 'goblin', 'orcchief', 'deserterchief', 'troll']);
function captorTick(m, now, dt) {
  const d = MON[m.type];
  if (m.leadP) {   // levando o prisioneiro amarrado, andando na frente
    const q = S.players[m.leadP];
    if (!q || !q.bound || q.dragBy !== 'm:' + m.id) { if (q && q.dragBy === 'm:' + m.id) q.dragBy = null; m.leadP = null; if (q) m.aggro = q.id; return false; }
    const B = BASTIONS.find(b => b.id === m.bs), hx = B ? B.x : m.homeX, hy = B ? B.y : m.homeY, ox = m.x, oy = m.y;
    if (dist(m.x, m.y, hx, hy) < 1.6) { m.leadP = null; q.dragBy = null; goDown(q, null); if (q.downed) { q.bound = null; q.tied = { until: now + 300000, by: m.type }; q.esc = 0; q.x = hx + 0.8; q.y = hy + 0.3; tell(q, 'Você foi amarrado num poste do acampamento! Martele ESPAÇO para se soltar, ou espere ajuda (F perto solta). Em 5 minutos o chefe vai te executar.'); sys(q.name + ' foi feito prisioneiro.'); } return true; }
    { const dx = hx - m.x, dy = hy - m.y, dl = Math.hypot(dx, dy) || 1, st = d.speed * 0.55 * dt, nx = m.x + dx / dl * st, ny = m.y + dy / dl * st; if (canStand(nx, ny, 0, 0.2)) { m.x = nx; m.y = ny; } else if (Math.abs(dx) > 0.01 && canStand(nx, m.y, 0, 0.2)) m.x = nx; else if (Math.abs(dy) > 0.01 && canStand(m.x, ny, 0, 0.2)) m.y = ny; else { m.x = nx; m.y = ny; } m.face = dx - dy > 0 ? 1 : -1; }   // ignora o próprio prisioneiro à frente
    const mx = m.x - ox, my = m.y - oy, ml = Math.hypot(mx, my);
    if (ml > 0.0005) { const nx = m.x + mx / ml * 0.6, ny = m.y + my / ml * 0.6; if (canStand(nx, ny, 0, 0.15)) { q.x = nx; q.y = ny; } q.dir = dirFromVecS(mx, my); q.walking = true; } else q.walking = false;
    q.lastMv = now; return true;
  }
  if (m.carrying) {
    const q = S.players[m.carrying]; if (!q || !q.downed) { if (q) npcDropCarried(m); else m.carrying = null; return true; }
    q.x = m.x; q.y = m.y; q.downed.until = Math.max(q.downed.until, now + 4000);
    const B = BASTIONS.find(b => b.id === m.bs), hx = B ? B.x : m.homeX, hy = B ? B.y : m.homeY;
    if (dist(m.x, m.y, hx, hy) < 1.5) { const v = npcDropCarried(m); if (v) { v.tied = { until: now + 300000, by: m.type }; v.esc = 0; v.x = hx + 0.8; v.y = hy + 0.3; tell(v, 'Você foi amarrado num poste do acampamento! Martele ESPAÇO para se soltar, ou espere ajuda (F perto solta). Em 5 minutos o chefe vai te executar.'); sys(v.name + ' foi feito prisioneiro.'); } }
    else moveToward(m, hx, hy, d.speed * 0.75 * dt) || (m.x += (hx - m.x) * 0.02, m.y += (hy - m.y) * 0.02);
    return true;
  }
  if (m.carryWant) {
    const q = S.players[m.carryWant]; if (!q || !q.downed || q.carriedBy || q.dragBy || q.tied) { m.carryWant = null; return false; }
    if (dist(m.x, m.y, q.x, q.y) < 1.3) {
      m.carryWant = null;
      if (m.type === 'troll') { entCarry(m, q, 'm:' + m.id); tell(q, 'O troll te joga no ombro e te leva para o acampamento!'); }
      else { q.downed = null; q.revive = null; q.hp = Math.max(1, Math.round(q.maxHp * 0.15)); bindPlayer(q, 'rope'); q.dragBy = 'm:' + m.id; m.leadP = q.id; tell(q, 'Um ' + MON[m.type].name.toLowerCase() + ' amarrou suas mãos e te leva andando para o acampamento! Martele ESPAÇO para soltar a corda.'); sendStat(q); }
    }
    else chase(m, q.x, q.y, d.speed * dt, now);
    return true;
  }
  return false;
}
function wolfDragTick(m, now, dt) {
  const q = S.players[m.dragging];
  if (!q || !q.downed || q.carriedBy || now > m.dragUntil) { if (q && q.dragBy === 'w:' + m.id) { q.dragBy = null; q.dragMode = null; } m.dragging = null; return false; }
  // puxa para longe dos outros jogadores
  let ax = 0, ay = 0; for (const o of Object.values(S.players)) { if (o === q || o.downed) continue; const dd = dist(o.x, o.y, m.x, m.y); if (dd < 14) { ax += (m.x - o.x) / (dd + 0.5); ay += (m.y - o.y) / (dd + 0.5); } }
  if (Math.hypot(ax, ay) < 0.05) { m.dragA = m.dragA ?? Math.random() * Math.PI * 2; ax = Math.cos(m.dragA); ay = Math.sin(m.dragA); } const l = Math.hypot(ax, ay) || 1;
  moveToward(m, m.x + ax / l * 2, m.y + ay / l * 2, MON[m.type].speed * 0.55 * dt);
  const a = Math.atan2(ay, ax), nx = m.x - Math.cos(a) * 1.0, ny = m.y - Math.sin(a) * 1.0; if (canStand(nx, ny, 0, 0.15)) { q.x = nx; q.y = ny; }
  return true;
}
function tiedTick(p, now) {
  if (!p.tied) return;
  if (!p.downed) { p.tied = null; return; }
  p.downed.until = Math.max(p.downed.until, now + 5000);   // amarrado não sangra até morrer
  if (now > p.tied.until) { p.tied = null; sys(p.name + ' foi executado pelo chefe do acampamento.'); p.downed = null; severPlayer(p, 'head', { x: p.x + 1, y: p.y, name: 'o chefe' }); }
}
function untie(p, m) {
  { const q = S.players[m.id]; if (q && q.bound && q !== p && dist(p.x, p.y, q.x, q.y) <= 2 && !String(q.dragBy || '').startsWith('n:')) {
    if (q.bound.kind === 'rope') { q.bound = null; tell(q, p.name + ' cortou a corda das suas mãos.'); tell(p, 'Você cortou a corda.'); sendStat(q); return; }
    if (p.inv.lockpick > 0) { p.inv.lockpick--; if (!p.inv.lockpick) delete p.inv.lockpick; q.bound = null; tell(q, p.name + ' abriu suas algemas.'); tell(p, 'Clique! A gazua abriu as algemas.'); if (inSafe(p.x, p.y)) witnessCrime(p, p.x, p.y, 'grab'); sendStat(q); sendStat(p); return; }
    tell(p, 'Algemas de ferro: só com uma gazua (Empório).'); return; } }
  const q = S.players[m.id]; if (!q || !q.tied || dist(p.x, p.y, q.x, q.y) > 2) return;
  q.tied = null; q.esc = 0; q.downed.until = now_() + DOWNED_MS; tell(q, p.name + ' cortou suas cordas!'); tell(p, 'Você soltou ' + q.name + '. Reanime-o!');
}
function tiedStruggle(p) {
  if (!p.tied) return false;
  p.esc = (p.esc || 0) + 2.5; if (p.esc >= 100) { p.tied = null; p.esc = 0; revivePlayer(p, 0.15, 'você mesmo'); tell(p, 'Você se livrou das cordas! Fuja!'); } else sendStat(p);
  return true;
}

// ---------------- cozinha ----------------
function cookAt(p, r) {
  const rc = RECIPES[r], now = now_(); if (!rc || p.downed || now < (p.cookT || 0)) return;
  const st = KITCHENS.find(k => dist(k.x, k.y, p.x, p.y) < 1.9 && (k.fl || 0) === (p.fl || 0)); if (!st) { tell(p, 'Precisa estar perto de um fogão.'); return; }
  const has = () => Object.entries(rc.need).every(([k, n]) => k === 'meat' ? (p.inv.venison || 0) + (p.inv.pork || 0) >= n : (p.inv[k] || 0) >= n);
  if (!has()) { tell(p, 'Faltam ingredientes.'); return; }
  p.cookT = now + 6200; const x0 = p.x, y0 = p.y;
  near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'cookfull', ms: 6000, tx: st.x, ty: st.y }); near(p.x, p.y, { t: 'cookfx', x: st.fx ?? st.x, y: st.fy ?? st.y, fl: st.fl || 0, fb: st.fl ? st.bi : -1, k: st.k || 'stove', kind: rc.out === 'stew' || /stew|soup|sopa/.test(rc.out) ? 'pot' : 'pan', ms: 6000 });   /* mexe, vira, tempera, prova e serve */
  setTimeout(() => {
    if (!S.players[p.id] || p.downed || dist(p.x, p.y, x0, y0) > 0.6) { tell(p, 'Você saiu do fogão e a comida passou do ponto.'); return; }
    if (!has()) return;
    for (const [k, n] of Object.entries(rc.need)) { if (k === 'meat') { let left = n; for (const mk of ['venison', 'pork']) { const t = Math.min(left, p.inv[mk] || 0); p.inv[mk] -= t; left -= t; if (!p.inv[mk]) delete p.inv[mk]; } } else { p.inv[k] -= n; if (!p.inv[k]) delete p.inv[k]; } }
    p.inv[rc.out] = (p.inv[rc.out] || 0) + 1; useGain(p, 'cook', 2); Net.toOne(p.id, { t: 'loot', k: rc.out }); tell(p, rc.name + ' pronto!'); sendStat(p);
  }, 6000);
}

// ---------------- cadeia: celas, pena por crime, fiança, fuga, visitas ----------------
const CRIME_MS = { assault: 120000, grab: 180000, murder: 360000 }, CRIME_TXT = { assault: 'agressão', grab: 'ataque à traição', murder: 'assassinato' };
const cellsState = () => S.cells || (S.cells = JAILCELLS.map(() => ({ locked: true, who: null })));
const jailOf = p => p.jailUntil > now_() && p.cell != null ? JAILCELLS[p.cell] : null;
function jailSpot() { const st = cellsState(); const i = st.findIndex(c => !c.who); if (i < 0) return null; const c = JAILCELLS[i]; return { x: c.spot[0], y: c.spot[1], bi: c.bi, cell: i }; }
function jailPlayer(q, ms, opt = {}) {
  if (q.dev) { q.wanted = 0; q.sentence = 0; return false; }
  const st = cellsState(); let i = opt.cell != null ? opt.cell : st.findIndex(c => !c.who); if (i < 0) i = 0;
  const c = JAILCELLS[i]; if (!c) return false; const now = now_();
  if (st[i].who && S.players[st[i].who] && st[i].who !== q.id) releasePlayer(S.players[st[i].who], 'A cela foi esvaziada para um novo preso.');
  st[i].who = q.id; st[i].locked = true; st[i].open = 0; q.cell = i; q.jailUntil = now + Math.max(30000, ms); if (!opt.noTp) { q.x = c.spot[0]; q.y = c.spot[1]; } q.z = 0; q.fl = 0; q.fb = -1; q.bound = null; q.dragBy = null; if (q.condemned) condemn(q, false);
  q.wanted = 0; q.sentence = 0; q.crimes = []; q.surrendered = false; Net.toAll({ t: 'wanted', id: q.id, ms: 0 });
  if (!q.inv.bread && Object.keys(q.inv).length < INV_SLOTS) q.inv.bread = 1;
  if (!opt.noTp) Net.toOne(q.id, { t: 'tp', x: q.x, y: q.y, z: 0, fl: 0, fb: -1 });
  tell(q, 'Você está preso por ' + Math.ceil((q.jailUntil - now) / 60000) + ' min. Dormir no catre faz o tempo passar 2x mais rápido; fale com o carcereiro para pagar fiança; F na porta da cela tenta arrombar.'); sendStat(q); return true;
}
function releasePlayer(q, why) { q.murderer = false; q.sleep = null; q.sit = null;
  const st = cellsState(), i = q.cell; if (i != null && st[i] && st[i].who === q.id) { st[i].who = null; st[i].locked = true; }
  const c = i != null ? JAILCELLS[i] : null; q.jailUntil = 0; q.cell = null;
  if (c) { const b = BUILDINGS[c.bi], d0 = doorOf(b), [dtx, dty] = doorTile(b); let best = null, bd = 1e9; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { if (WORLD.bld[y * MAP_W + x] !== c.bi || !canStand(x, y, 0, 0.25) || JAILCELLS.some(z => z.tiles.has(y * MAP_W + x) || (z.door[0] === x && z.door[1] === y))) continue; const jl = S.npcs && S.npcs.jailer; if (jl && dist(jl.x, jl.y, x, y) < 1.2) continue; const dd = dist(x, y, dtx, dty); if (dd < bd) { bd = dd; best = [x, y]; } } if (best) { q.x = best[0]; q.y = best[1]; } else { q.x = d0.x; q.y = d0.y; } Net.toOne(q.id, { t: 'tp', x: q.x, y: q.y, z: 0, fl: 0, fb: -1 }); }
  tell(q, why || 'Você está livre.'); sendStat(q);
}
function jailTick(p, now, dt) {
  if (!p.jailUntil) return;
  if (p.sleep != null) p.jailUntil -= dt * 1000;   // dormindo no catre o tempo passa 2x
  if (now > p.jailUntil) releasePlayer(p, 'Você cumpriu a pena. A porta da cela se abre: está livre.');
}
const bailPrice = q => Math.max(10, Math.ceil((q.jailUntil - now_()) / 60000) * 30);
// fechadura: o preso arromba com o minijogo; um amigo abre de noite com o carcereiro dormindo
function escapeCell(q, by) {
  const st = cellsState(), i = q.cell; if (i == null) return; q.sleep = null; q.sit = null; st[i].who = null; st[i].locked = true; q.jailUntil = 0; q.cell = null;
  const c = JAILCELLS[i]; q.x = c.door[0] + (c.door[0] - c.spot[0]); q.y = c.door[1] + (c.door[1] - c.spot[1]); Net.toOne(q.id, { t: 'tp', x: q.x, y: q.y, z: 0, fl: 0, fb: -1 });
  q.wanted = now_() + 300000; q.sentence = (q.sentence || 0) + 180000; Net.toAll({ t: 'wanted', id: q.id, ms: 300000 });
  sys(q.name + ' fugiu da cadeia' + (by ? ' com a ajuda de ' + by : '') + '! As sentinelas estão atrás dele.'); sendStat(q);
}
function jailMsg(p, m) {
  const now = now_(), st = cellsState();
  if (m.t === 'pickstart') { const c = jailOf(p); if (!c || dist(p.x, p.y, c.door[0], c.door[1]) > 1.6) return; p.pickT = now; return; }
  if (m.t === 'pick') {
    const c = jailOf(p); if (!c || !p.pickT || now - p.pickT < 3000) return; p.pickT = 0;
    if (m.ok) { tell(p, 'Clique! A fechadura cedeu.'); escapeCell(p); }
    else { p.jailUntil += 60000; tell(p, 'A gazua quebrou e o carcereiro ouviu: +1 minuto de pena.'); sendStat(p); }
    return;
  }
  if (m.t === 'opencell') {   // amigo de fora, de noite, com o carcereiro dormindo
    const i = JAILCELLS.findIndex(c => dist(p.x, p.y, c.door[0], c.door[1]) < 1.6); if (i < 0 || !st[i].who) return;
    const q = S.players[st[i].who]; if (!q) return;
    const night = dayInfoS().night, jl = S.npcs && S.npcs.jailer, asleep = night || !jl || jl.dead || jl.downed;
    if (!asleep) { tell(p, 'O carcereiro está acordado e de olho. Volte de noite.'); return; }
    escapeCell(q, p.name); p.wanted = now + 300000; p.sentence = (p.sentence || 0) + 180000; Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); return;
  }
  if (m.t === 'give') {   // passar item pelas grades
    const q = S.players[m.to], k = String(m.k); if (!q || q === p || !(q.jailUntil > now) || dist(p.x, p.y, q.x, q.y) > 2.2 || !LOOT[k] || !(p.inv[k] > 0)) return;
    if (!q.inv[k] && Object.keys(q.inv).length >= INV_SLOTS) { tell(p, 'A mochila do preso está cheia.'); return; }
    p.inv[k]--; if (!p.inv[k]) delete p.inv[k]; q.inv[k] = (q.inv[k] || 0) + 1; tell(p, 'Você passou ' + LOOT[k].name + ' pelas grades.'); tell(q, p.name + ' te passou ' + LOOT[k].name + '.'); sendStat(p); sendStat(q);
  }
}
function crimeSentence(p, kind) { obsCount('crime', p.x, p.y); if (kind === 'murder') p.murderer = true; repAdd(p, 'guarda', kind === 'murder' ? -15 : -8, CRIME_TXT[kind] || 'crime'); repAdd(p, 'cidade', kind === 'murder' ? -8 : -4); p.sentence = Math.min(900000, (p.sentence || 0) + (CRIME_MS[kind] || CRIME_MS.assault) * (repOf(p) >= 90 ? 0.5 : 1)); (p.crimes = p.crimes || []).push(CRIME_TXT[kind] || 'agressão'); if (p.crimes.length > 4) p.crimes.shift(); }

// execução na guilhotina: deitar na prancha, fechar a luneta, anúncio, alavanca, lâmina, cabeça no cesto
const EXEC_T = { lock: 1400, announce: 3000, pull: 28400, drop: 30000, fall: 33500 };
function startExecution(v, by) {
  if (!npcAlive('executioner') || v.execAt || STAGE.x < 0) return false;
  const now = now_(), tok = now + Math.random(), crimes = (v.crimes && v.crimes.length ? v.crimes.join(', ') : 'crimes contra Nae');
  if (v.wanted) { v.wanted = 0; Net.toAll({ t: 'wanted', id: v.id, ms: 0 }); }
  if (v.carriedBy) v.carriedBy = null; if (v.dragBy && S.players[v.dragBy]) stopDrag(S.players[v.dragBy]);
  v.x = STAGE.x - 0.6; v.y = STAGE.y; v.z = 0; v.execAt = now + EXEC_T.drop; v.execTok = tok; v.downed = null; v.revive = null; v.hp = Math.max(1, Math.round(v.maxHp * 0.1)); v.bleedT = 0; if (v.bleed) for (const k in v.bleed) v.bleed[k] = 0; v.dragBy = 'exec'; if (!v.condemned) condemn(v, true);
  const ex = S.npcs && S.npcs.executioner; if (ex) { ex.walkTo = [STAGE.x - 0.9, STAGE.y + 1.9]; setTimeout(() => { if (v.execTok === tok && ex && !ex.dead) ex.walkTo = [STAGE.x + 0.1, STAGE.y + 1.05]; }, EXEC_T.pull - 3200); }
  for (const s of [10, 20]) setTimeout(() => { if (v.execTok !== tok) return; sys('🔔 O sino da praça toca (' + (30 - s) + ' segundos).'); near(STAGE.x, STAGE.y, { t: 'shake', s: 1 }, VIEW_RADIUS + 12); }, s * 1000);
  near(STAGE.x, STAGE.y, { t: 'exec', id: v.id, x: STAGE.x, y: STAGE.y, T: EXEC_T, name: v.name, crimes }, VIEW_RADIUS + 12); memEvent(v, STAGE.x, STAGE.y, 'executed');
  S.exec = { id: v.id, key: memKey(v), name: v.name, tok, t0: now, drop: now + EXEC_T.drop, until: now + EXEC_T.fall + 7000 };
  sys('🔔 O sino da praça toca: ' + by + ' entregou ' + v.name + ' ao carrasco.');
  setTimeout(() => { if (v.execTok !== tok) return; sys('Mestre Corvo: "' + v.name + ', condenado por ' + crimes + '. Que Nae tenha piedade da sua alma."'); }, EXEC_T.announce);
  setTimeout(() => { if (v.execTok !== tok || !S.npcs || !S.npcs.executioner || !npcAlive('executioner')) return; near(STAGE.x, STAGE.y, { t: 'anim', w: 'n', id: 'executioner', a: 'lever', ms: 1100 }); }, EXEC_T.pull);
  setTimeout(() => { const q = S.players[v.id]; if (!q || q.execTok !== tok) return; q.execAt = 0; q.execTok = 0; q.downed = null; q.dragBy = null; q.bound = null; q.lost = (q.lost || 0) & ~LOST.head; Net.toAll({ t: 'condemned', id: q.id, on: 0 }); severPlayer(q, 'head', { x: STAGE.x + 0.6, y: STAGE.y, name: 'o Carrasco' }); if (q.downed) q.downed.until = now_() + 3500; }, EXEC_T.drop);
  return true;
}
function abortExecution(why) {
  for (const q of Object.values(S.players)) if (q.execTok) { q.execTok = 0; q.execAt = 0; q.dragBy = null; if (q.downed) q.downed.until = now_() + DOWNED_MS; q.x = STAGE.x - 1.6; q.y = STAGE.y + 1.3; near(STAGE.x, STAGE.y, { t: 'execabort', id: q.id }, VIEW_RADIUS + 12); sys(why); }
}


// ---------------- amarrar (algemas das sentinelas, corda dos jogadores) ----------------
const BOUND_BLOCK = new Set(['atk', 'skill', 'tskill', 'kick', 'dodge', 'shoot', 'draw', 'loose', 'grab', 'carry', 'lift', 'throw', 'cookat', 'use']);
function bindPlayer(q, kind) { q.bound = { kind, esc: 0 }; q.atk = null; q.parry = null; q.drawT = null; q.casting = null; if (q.carrying) dropCarried(q); if (q.drag) stopDrag(q); sendStat(q); }
function boundStruggle(p) {
  if (!p.bound || p.bound.kind !== 'rope' || String(p.dragBy || '').startsWith('n:')) { if (p.bound && p.bound.kind === 'cuffs') tell(p, 'Algemas de ferro: não dá para soltar sozinho.'); return; }
  p.bound.esc += 2.5; if (p.bound.esc >= 100) { p.bound = null; tell(p, 'Você se livrou da corda!'); } sendStat(p);
}
// ---------------- sentinelas conduzindo presos (algemar, levar andando, cena da cela, cadafalso) ----------------
function condemn(q, on) { q.condemned = !!on; if (!on) q.saidLast = false; Net.toAll({ t: 'condemned', id: q.id, on: on ? 1 : 0 }); }
function startLead(n, q, dest, now) {
  n.goFetch = null;
  n.lead = { id: q.id, dest, phase: 'cuff', t: now + 2000 }; q.dragBy = 'n:' + n.id; q.surrendered = false; q.atk = null;
  if (dest === 'stage') { q.downed = null; q.revive = null; q.hp = Math.max(1, Math.round(q.maxHp * 0.15)); condemn(q, true); tell(q, n.name + ' te levanta e algema. Você será levado à guilhotina. Escreva suas últimas palavras, ou alguém pode pagar a fiança de 1000 ouro.'); sys(n.name + ' algemou ' + q.name + ' e o leva à guilhotina.'); }
  else { if (q.downed) { q.downed = null; q.revive = null; q.hp = Math.max(1, Math.round(q.maxHp * 0.15)); tell(q, n.name + ' te levanta e algema: você vai para a cadeia por agressão.'); } const c = jailSpot(); n.lead.cell = c ? c.cell : 0; cellsState()[n.lead.cell].who = 'res:' + q.id; tell(q, n.name + ' algema suas mãos.'); }
  near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'cuff', ms: 1900, tx: q.x, ty: q.y }); n.dir = dirFromVecS(q.x - n.x, q.y - n.y);
}
function leadTick(n, now, dt) {
  const L = n.lead, q = S.players[L.id];
  if (q && L.phase === 'walk') { L.t0 = L.t0 || now; if (now - L.t0 > 90000) { if (L.dest === 'stage') { n.lead = null; q.dragBy = null; q.x = STAGE.x - 1.6; q.y = STAGE.y + 1.2; Net.toOne(q.id, { t: 'tp', x: q.x, y: q.y, z: 0, fl: 0, fb: -1 }); startExecution(q, n.name); return; } const c = JAILCELLS[L.cell]; if (c) { n.x = c.door[0]; n.y = c.door[1]; q.x = c.spot[0]; q.y = c.spot[1]; Net.toOne(q.id, { t: 'tp', x: q.x, y: q.y, z: 0, fl: 0, fb: -1 }); } } }   /* escolta travada no caminho: chega de qualquer jeito */
  if (!q || (q.downed && L.dest === 'jail')) { if (q) q.dragBy = null; if (L.cell != null && cellsState()[L.cell] && String(cellsState()[L.cell].who).startsWith('res:')) cellsState()[L.cell].who = null; n.lead = null; return; }
  q.lastMv = now; q.walking = false;
  if (L.phase === 'cuff') { if (now >= L.t) { bindPlayer(q, 'cuffs'); L.phase = 'walk'; } return; }
  if (L.phase === 'scene') return;
  let tx, ty, sp;
  if (L.dest === 'stage') { tx = STAGE.x - 1.6; ty = STAGE.y + 1.2; sp = 1.25; }
  else { const c = JAILCELLS[L.cell], ax = c.door[0] - c.spot[0], ay = c.door[1] - c.spot[1]; tx = c.door[0] + ax * 1.6; ty = c.door[1] + ay * 1.6; sp = 1.1; }
  const ox = n.x, oy = n.y, arrived = npcWalk(n, tx, ty, sp, dt), mx = n.x - ox, my = n.y - oy, ml = Math.hypot(mx, my);
  if (ml > 0.0005) { n.dir = dirFromVecS(mx, my); const nx = n.x + mx / ml * 0.55, ny = n.y + my / ml * 0.55; if (canStand(nx, ny, 0, 0.15)) { q.x = nx; q.y = ny; } q.dir = n.dir; q.walking = true; }
  if (!arrived) return;
  if (L.dest === 'stage') { n.lead = null; q.dragBy = null; startExecution(q, n.name); return; }
  cellScene(n, q, L, now);
}
// cena da cela: o carcereiro abre com a chave, a sentinela empurra o preso, tira as algemas, fecha e tranca
function cellScene(n, q, L, now) {
  L.phase = 'scene'; const i = L.cell, c = JAILCELLS[i], st = cellsState(), tok = now + Math.random(); L.tok = tok;
  const ax = c.door[0] - c.spot[0], ay = c.door[1] - c.spot[1], jl = S.npcs && S.npcs.jailer, alive = jl && !jl.dead && !jl.downed;
  if (alive) { jl.x = c.door[0] + ax * 0.9 + ay * 0.85; jl.y = c.door[1] + ay * 0.9 + ax * 0.85; jl.dir = dirFromVecS(c.door[0] - jl.x, c.door[1] - jl.y); near(jl.x, jl.y, { t: 'anim', w: 'n', id: 'jailer', a: 'key', ms: 1100 }); }
  q.x = c.door[0] + ax * 0.9; q.y = c.door[1] + ay * 0.9; q.dir = dirFromVecS(-ax, -ay);
  const ok = () => n.lead && n.lead.tok === tok && S.players[q.id];
  setTimeout(() => { if (!ok()) return; st[i].open = 1; }, 1100);
  setTimeout(() => { if (!ok()) return; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shove', ms: 700, tx: c.spot[0], ty: c.spot[1] }); q.x = c.spot[0]; q.y = c.spot[1]; q.knockUntil = 0; Net.toOne(q.id, { t: 'tp', x: q.x, y: q.y, z: 0, fl: 0, fb: -1 }); near(q.x, q.y, { t: 'anim', w: 'p', id: q.id, a: 'hurt', ms: 600 }); tell(q, 'A sentinela te empurra para dentro da cela.'); }, 1800);
  setTimeout(() => { if (!ok()) return; q.bound = null; sendStat(q); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'cuff', ms: 900, tx: c.spot[0], ty: c.spot[1] }); }, 2900);
  setTimeout(() => { if (!ok()) return; st[i].open = 0; if (alive) near(jl.x, jl.y, { t: 'anim', w: 'n', id: 'jailer', a: 'key', ms: 1100 }); }, 3800);
  setTimeout(() => { if (!ok()) return; q.dragBy = null; n.lead = null; st[i].who = null; jailPlayer(q, q.sentence || CRIME_MS.assault, { noTp: true, cell: i }); sys(q.name + ' foi trancado na cadeia.'); if (alive) { jl.x = jl.postX; jl.y = jl.postY; } }, 4700);
}
function lawMsg(p, m) {
  if (m.t === 'lastwords') { if (!p.condemned || p.saidLast) return; const tx = String(m.text || '').replace(/[<>]/g, '').trim().slice(0, 120); if (!tx) return; p.saidLast = true; sys('Últimas palavras de ' + p.name + ': "' + tx + '"'); near(p.x, p.y, { t: 'pbubble', id: p.id, text: tx }, VIEW_RADIUS + 12); return; }
  if (m.t === 'execbail') {
    const q = S.players[m.who || p.id]; if (!q || !q.condemned) return; if (p !== q && dist(p.x, p.y, q.x, q.y) > 14) { tell(p, 'Chegue mais perto para pagar a fiança.'); return; }
    if (!canPay(p, 1000)) { tell(p, 'A fiança da execução é 1000 de ouro. Você não tem o bastante.'); return; }
    payCity(p, 1000); sendStat(p);
    if (q.execTok) { q.execTok = 0; q.execAt = 0; near(STAGE.x, STAGE.y, { t: 'execabort', id: q.id }, VIEW_RADIUS + 12); }
    for (const n of Object.values(S.npcs || {})) if (n.lead && n.lead.id === q.id) n.lead = null;
    q.dragBy = null; q.bound = null; condemn(q, false); sys((p === q ? q.name + ' pagou' : p.name + ' pagou') + ' a fiança de 1000 ouro: ' + q.name + ' escapa da guilhotina e vai para a cadeia.');
    jailPlayer(q, q.sentence || CRIME_MS.murder);
  }
}

// ---------------- progressão por uso e habilidades da árvore ----------------
function useGain(p, k, amt) {
  if (!USE[k] || !p || p.dev || !(amt > 0)) return; p.use = p.use || {};
  const l0 = useLvl(p, k); p.use[k] = (p.use[k] || 0) + amt; const l1 = useLvl(p, k);
  if (l1 > l0) { if (k === 'vigor') { const r = p.hp / Math.max(1, p.maxHp); p.maxHp = maxHpOf(p); if (!p.downed) p.hp = Math.max(1, Math.round(p.maxHp * r)); } if (l1 % 5 === 0) Net.toOne(p.id, { t: 'usel', k, l: l1 }); Net.toOne(p.id, { t: 'chat', name: '', text: '📈 ' + USE[k].name + ' subiu para ' + l1 + ' (+' + (useBonus(p, k) * 100).toFixed(1).replace('.', ',') + '%)' }); }   /* progresso da perícia no chat, a cada ponto inteiro */
}
function treeSkill(p, b, msg) {
  const nI = msg.n >= 2 && msg.n <= 5 ? msg.n | 0 : 4, br = TREE[p.cls] && TREE[p.cls][b], nd = br && br.nodes[nI]; if (!nd || !(nd.skill || nd.evo)) return; if (nI === 5) b = b + 10; else if (nd.evo) b = b + 20 + nI * 10;   // segunda habilidade do ramo e as evoluções do mago (recarga própria)
  if (nd.evo ? !(p.cls === 'mage' && elemStrength(p, br.el) >= nd.need) : !treeHas(p, nd.id)) { tell(p, nd.evo ? nd.name + ': precisa de força ' + nd.need + ' em ' + br.name + '.' : 'Aprenda ' + nd.name + ' na árvore de talentos (K).'); return; }
  const now = now_(); p.tcd = p.tcd || {};
  if (p.downed || p.carrying || p.lifted || p.grabbed || now < (p.stunUntil || 0) || now < (p.knockUntil || 0)) return;
  if (now < (p.tcd[b] || 0)) { tell(p, nd.name + ': recarregando (' + Math.ceil((p.tcd[b] - now) / 1000) + 's).'); return; }
  if (p.mp < nd.mp) { tell(p, 'Mana insuficiente.'); return; }
  const a = isFinite(+msg.a) ? +msg.a : 0, shout = { s: nd.name + '!' };
  const sameLvl = q => Math.abs((q.z || 0) - (p.z || 0)) < 0.5 && (q.alt || 0) < 1.2;
  const pickTgt = rng => { let q = S.monsters[msg.id]; if (q && sameLvl(q) && dist(p.x, p.y, q.x, q.y) <= rng) return q; let best = null, bs = 1e9; for (const o of Object.values(S.monsters)) { if (!sameLvl(o)) continue; const d = dist(p.x, p.y, o.x, o.y); if (d > rng) continue; const da = Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), a)); if (da > 0.7) continue; const sc = d + da * 4; if (sc < bs) { bs = sc; best = o; } } return best; };
  switch (nd.id) {
    case 'w_gust': case 'w_shield': case 'w_glide': case 'w_handlight': case 'w_prayer': case 'w_restore': case 'w_mist': case 'w_tide': case 'w_frost': case 'w_sparks': case 'w_fireball': case 'w_meteor': case 'w_stone': case 'w_thorns': case 'w_quake': if (!mageEvo(p, nd, msg, now)) return; break;   /* evoluções do Ar e da Luz */
    case 'charge': {
      let d = 0; for (let s = 0.25; s <= 4; s += 0.25) { if (!canStand(p.x + Math.cos(a) * s, p.y + Math.sin(a) * s, p.z || 0, 0.25)) break; d = s; }
      anim('p', p, 'dash', p.x + Math.cos(a), p.y + Math.sin(a), shout); Net.toOne(p.id, { t: 'push', a, d });
      const hit = Object.values(S.monsters).filter(sameLvl).map(q => { const ax = q.x - p.x, ay = q.y - p.y; return { q, t: ax * Math.cos(a) + ay * Math.sin(a), perp: Math.abs(-ax * Math.sin(a) + ay * Math.cos(a)) }; }).filter(o => o.t > 0 && o.t < d + 1.3 && o.perp < 0.9 + (MON[o.q.type].rad || 0.3)).sort((x, y) => x.t - y.t)[0];
      if (hit) setTimeout(() => { const q = S.monsters[hit.q.id]; if (!q) return; p._melee = true; hitMonster(p, q, 1.8, 0); p._melee = false; if (S.monsters[q.id]) { q.stunUntil = Math.max(q.stunUntil, now_() + 1000); q.atk = null; if (!MON[q.type].big) knockMon(q, p, now_()); } }, 220);
      break;
    }
    case 'taunt': anim('p', p, 'warcry', p.x, p.y, shout); aoe('warcry', p.x, p.y); p.buffs.iron = now + 5000; for (const q of monstersNear(p.x, p.y, 6)) { q.taunt = { pid: p.id, until: now + 5000 }; q.returning = false; q.aggro = p.id; } break;
    case 'banner': anim('p', p, 'warcry', p.x, p.y, shout); addZone(p, 'banner', p.x + Math.cos(a) * 0.8, p.y + Math.sin(a) * 0.8, 0, 12000); break;
    case 'headshot': {
      const q = pickTgt(CLASSES[p.cls].range + treeEff(p, 'range') + 1); if (!q) { tell(p, 'Nenhum alvo na mira.'); return; }
      anim('p', p, 'pierce', q.x, q.y, shout); const id = q.id;
      setTimeout(() => { const t = S.monsters[id]; if (!t) return; const d = flight(p.x, p.y, t.x, t.y); shot(p, 'arrow', t.x, t.y, d, 0); p._forceCrit = true; const r = roll(p, 3.5, t); p._forceCrit = false; hitRolled(p, t, r.dmg, true, d, 1); }, 650);
      break;
    }
    case 'trap': { const mine = (S.zones || []).filter(z => z.k === 'trap' && z.by === p.id); if (mine.length >= 2) removeZone(mine[0]); anim('p', p, 'quiver', p.x, p.y, shout); addZone(p, 'trap', p.x, p.y, 0, 30000); break; }
    case 'smoke':
      near(p.x, p.y, { t: 'smokebomb', x: p.x, y: p.y }); p.buffs.smoke = now + 4000; p.buffs.agile = Math.max(p.buffs.agile || 0, now + 4000);
      for (const q of Object.values(S.monsters)) if ((q.aggro === p.id || (q.taunt && q.taunt.pid === p.id)) && dist(q.x, q.y, p.x, p.y) < 14) { q.aggro = null; q.taunt = null; q.atk = null; q.returning = true; }
      break;
    case 'firewall': { const cx = p.x + Math.cos(a) * 3, cy = p.y + Math.sin(a) * 3; anim('p', p, 'fireball', cx, cy, shout); addZone(p, 'firewall', cx, cy, a, 5000); break; }
    case 'icejail': {
      const q = pickTgt(CLASSES[p.cls].range + 1); if (!q) { tell(p, 'Nenhum alvo na mira.'); return; }
      anim('p', p, 'bolt', q.x, q.y, shout); p._el = 'ice'; hitMonster(p, q, 1.5, 250); p._el = null;
      if (S.monsters[q.id]) { q.stunUntil = Math.max(q.stunUntil, now + 3000); q.atk = null; } near(q.x, q.y, { t: 'icejail', id: q.id, ms: 3000 }); break;
    }
    case 'sanct': anim('p', p, 'heal', p.x, p.y, shout); addZone(p, 'sanct', p.x, p.y, 0, 8000); break;
    case 'restore': {   // devolve um membro perdido; custa toda a mana e deixa exausto por 1 minuto
      const lostOf = q => ['armA', 'armB', 'legL', 'legR'].find(k => (q.lost || 0) & LOST[k]);
      let q = Object.values(S.players).filter(o => o !== p && !o.dev && dist(o.x, o.y, p.x, p.y) < 2.2 && lostOf(o)).sort((a, b2) => dist(a.x, a.y, p.x, p.y) - dist(b2.x, b2.y, p.x, p.y))[0] || (lostOf(p) ? p : null);
      if (!q) { tell(p, 'Ninguém por perto (nem você) perdeu um membro.'); return; }
      if (p.mp < p.maxMp * 0.5) { tell(p, 'É preciso pelo menos metade da mana para a Restauração.'); return; }
      const part = lostOf(q); q.lost &= ~LOST[part]; q.pro = (q.pro || 0) & ~LOST[part]; if (q.body) q.body[part] = 100; if (q.bleed) q.bleed[part] = 0;
      p.mp = 0; p.cst = 0; p.exhaustUntil = now + 60000; p.slowUntil = Math.max(p.slowUntil || 0, now + 60000); p.lastCombat = now;
      anim('p', p, 'heal', q.x, q.y, shout); aoe('heal', q.x, q.y, { id: q.id }); near(q.x, q.y, { t: 'restore', id: q.id, part });
      tell(p, 'A luz atravessa você e devolve ' + (LOST_NAMES[part] || 'o membro') + (q === p ? '.' : ' a ' + q.name + '.') + ' Você fica exausto por 1 minuto.'); if (q !== p) tell(q, p.name + ' restaurou ' + (LOST_NAMES[part] || 'seu membro') + ' com a Luz!');
      sendStat(q); break;
    }
  }
  p.mp -= nd.mp; p.tcd[b] = now + nd.cd; p.lastCombat = now; if (p.cls === 'mage') useGain(p, 'magic', 2); sendStat(p);
}
// explosão da Bola de Fogo: dano em volta (cheio perto, menos longe), empurra monstros e jogadores (o próprio mago também) e deixa o chão em chamas
const BOOM_R = 2.1;
function fireballBoom(p, x, y, skipId) {
  if (!S.players[p.id]) return; const now = now_();
  aoe('boom', x, y, { big: 1 }); near(x, y, { t: 'shake', s: 6 }, 14);
  spellNpcs(p, n => n.id !== skipId && dist(n.x, n.y, x, y) <= BOOM_R, 1.2, 'fire');
  for (const q of Object.values(S.monsters)) { if (q.id === skipId || q.dead) continue; const d = dist(q.x, q.y, x, y); if (d > BOOM_R + (MON[q.type].rad || 0.3) * 0.5) continue;
    const f = 1 - Math.min(1, d / BOOM_R) * 0.6; p._el = 'fire'; hitMonster(p, q, 1.5 * f, 0); p._el = null; if (S.monsters[q.id] && !MON[q.type].big) knockMon(q, { x, y }, now); }
  for (const q of Object.values(S.players)) { if (q.downed || q.dev || (q.fl || 0) !== (p.fl || 0) || Math.abs((q.z || 0) - (p.z || 0)) > 0.5) continue; const d = dist(q.x, q.y, x, y); if (d > BOOM_R) continue;
    const f = 1 - d / BOOM_R * 0.6, raw = Math.round((p.lvl * 2.2 + 12) * f * (q === p ? 0.6 : 1)); if (q !== p && inSafe(q.x, q.y)) witnessCrime(p, p.x, p.y);
    damagePlayer(q, raw, { x, y, name: p.name }, 0, 'torso'); if (S.players[q.id] && !q.downed) { const a = Math.atan2(q.y - y, q.x - x) || 0; Net.toOne(q.id, { t: 'push', a, d: 1.2 * f + 0.4 }); } sendStat(q); }
  const z = addZone(p, 'burn', x, y, 0, 3000); z.t = now + 300;
}
/* Bola de Fogo Maior: explosão grande, derruba os menores, chão queimando por 6 s */
function bigFireBoom(p, x, y, R) {
  if (!S.players[p.id]) return; const now = now_(), B = useBonus(p, 'el_fire');
  aoe('bigboom', x, y, {}); near(x, y, { t: 'shake', s: 10 }, 16);
  spellNpcs(p, n => dist(n.x, n.y, x, y) <= R, 3.2 * 0.75, 'fire');
  for (const q of Object.values(S.monsters)) { if (q.dead || q.hp <= 0) continue; const d = dist(q.x, q.y, x, y); if (d > R + (MON[q.type].rad || 0.3) * 0.5) continue;
    const f = 1 - Math.min(1, d / R) * 0.5; p._el = 'fire'; hitMonster(p, q, 3.2 * f * (1 + B), 0); p._el = null; if (!S.monsters[q.id]) continue; if (!MON[q.type].big) knockMon(q, { x, y }, now); if (!(q._burnT > now)) { q._burnT = now + 3000; emberBurn(p, q); } }
  for (const q of Object.values(S.players)) { if (q.downed || q.dev || (q.fl || 0) !== (p.fl || 0) || Math.abs((q.z || 0) - (p.z || 0)) > 0.5) continue; const d = dist(q.x, q.y, x, y); if (d > R) continue;
    const f = 1 - d / R * 0.5, raw = Math.round((p.lvl * 3 + 18) * f * (q === p ? 0.5 : 1)); if (q !== p && inSafe(q.x, q.y)) witnessCrime(p, p.x, p.y);
    damagePlayer(q, raw, { x, y, name: p.name }, 0, 'torso'); if (S.players[q.id] && !q.downed) { const an = Math.atan2(q.y - y, q.x - x) || 0; Net.toOne(q.id, { t: 'push', a: an, d: 1.6 * f + 0.4 }); ignitePlayer(q, now); } sendStat(q); }
  for (let k = 0; k < 7; k++) { const an = k / 6 * Math.PI * 2, r = k ? R * 0.5 : 0, z = addZone(p, 'burn', x + Math.cos(an) * r, y + Math.sin(an) * r, 0, 6000); z.t = now + 300; }
  { const list = []; for (let k = 0; k < 10; k++) { const an = Math.random() * 6.283, r = Math.random() * R; igniteTile(x + Math.cos(an) * r, y + Math.sin(an) * r, now, list, true); } if (list.length) near(x, y, { t: 'fires', l: list }); }
}
/* Chuva de Meteoros: cada pedra explode onde cai */
function meteorHit(p, x, y, B) {
  if (!S.players[p.id]) return; const now = now_();
  aoe('boom', x, y, {}); near(x, y, { t: 'shake', s: 3 }, 12);
  spellNpcs(p, n => dist(n.x, n.y, x, y) <= 1.5, 1.3, 'fire');
  for (const q of Object.values(S.monsters)) { if (q.dead || q.hp <= 0 || dist(q.x, q.y, x, y) > 1.5 + (MON[q.type].rad || 0.3) * 0.5) continue; p._el = 'fire'; hitMonster(p, q, 1.3 * (1 + B), 0); p._el = null; if (!S.monsters[q.id]) continue; if (!MON[q.type].big) knockMon(q, { x, y }, now); if (!(q._burnT > now)) { q._burnT = now + 3000; emberBurn(p, q); } }
  for (const q of Object.values(S.players)) { if (q.downed || q.dev || (q.fl || 0) !== (p.fl || 0) || dist(q.x, q.y, x, y) > 1.3) continue; if (q !== p && inSafe(q.x, q.y)) witnessCrime(p, p.x, p.y); damagePlayer(q, Math.round((p.lvl * 1.4 + 8) * (q === p ? 0.5 : 1)), { x, y, name: p.name }, 0, 'torso'); if (S.players[q.id] && !q.downed) ignitePlayer(q, now); sendStat(q); }
  const list = []; igniteTile(x, y, now, list, true); if (list.length) near(x, y, { t: 'fires', l: list });
}
function addZone(p, k, x, y, a, ms) {
  const z = { k, x, y, a, by: p.id, until: now_() + ms, t: 0 }; (S.zones = S.zones || []).push(z);
  near(x, y, { t: 'zone', k, x, y, a, ms, z: p.z || 0 });
  if (k === 'firewall') { const l = []; for (let s = -2; s <= 2.01; s += 0.5) l.push([x - Math.sin(a) * s, y + Math.cos(a) * s, 1.1, ms]); near(x, y, { t: 'fires', l, nb: 1 }); }
  if (k === 'burn') { const l = []; for (let k2 = 0; k2 < 9; k2++) { const an = k2 / 9 * Math.PI * 2 + Math.random(), r = k2 ? 0.5 + Math.random() * 1.1 : 0; l.push([x + Math.cos(an) * r, y + Math.sin(an) * r, 0.6 + Math.random() * 0.4, ms]); } near(x, y, { t: 'fires', l, nb: 1 }); }   // chão em chamas
  return z;
}
function removeZone(z) { S.zones = (S.zones || []).filter(q => q !== z); near(z.x, z.y, { t: 'zoneoff', k: z.k, x: z.x, y: z.y }); }
function zoneTick(now) {
  if (!S.zones || !S.zones.length) return;
  for (const z of S.zones.slice()) {
    const p = S.players[z.by];
    if (now >= z.until || !p) { removeZone(z); continue; }
    if (now < z.t) continue;
    if (z.k === 'trap') { z.t = now + 100; const q = Object.values(S.monsters).find(o => (o.alt || 0) < 1 && dist(o.x, o.y, z.x, z.y) < 0.75 + (MON[o.type].rad || 0.3) * 0.5); if (q) { hitMonster(p, q, 1.5, 0); if (S.monsters[q.id]) { q.stunUntil = Math.max(q.stunUntil, now + 3000); q.atk = null; } removeZone(z); } continue; }
    spellNpcs(p, n => { const ax = n.x - z.x, ay = n.y - z.y; return Math.abs(-ax * Math.sin(z.a) + ay * Math.cos(z.a)) < 2.6 && Math.abs(ax * Math.cos(z.a) + ay * Math.sin(z.a)) < 0.9; }, 0.6, 'fire');   /* NPCs também queimam */
    if (z.k === 'firewall') { z.t = now + 500; for (const q of Object.values(S.monsters)) { const ax = q.x - z.x, ay = q.y - z.y; if (Math.abs(-ax * Math.sin(z.a) + ay * Math.cos(z.a)) < 2.6 && Math.abs(ax * Math.cos(z.a) + ay * Math.sin(z.a)) < 0.9) { p._el = 'fire'; hitMonster(p, q, 0.6, 0); p._el = null; } } continue; }
    if (z.k === 'burn') { z.t = now + 600; for (const q of Object.values(S.monsters)) if (!q.dead && dist(q.x, q.y, z.x, z.y) < 1.4) { p._el = 'fire'; hitMonster(p, q, 0.25, 0); p._el = null; }
      for (const q of Object.values(S.players)) if (!q.downed && !q.dev && dist(q.x, q.y, z.x, z.y) < 1.1 && (q.fl || 0) === 0) { damagePlayer(q, Math.max(1, Math.round(p.lvl * 0.4 + 2)), { x: z.x, y: z.y, name: p.name }, 0, 'legL'); sendStat(q); } }
    if (z.k === 'banner' || z.k === 'sanct') {
      z.t = now + 1000; const r = z.k === 'banner' ? 4.5 : 4;
      for (const q of Object.values(S.players)) { if (q.downed || dist(q.x, q.y, z.x, z.y) > r) continue; q.buffs[z.k] = now + 1500; const h = Math.round(q.maxHp * (z.k === 'sanct' ? 0.03 * (1 + treeEff(p, 'holy')) : 0.015)); if (q.hp < q.maxHp) { q.hp = Math.min(q.maxHp, q.hp + h); sendStat(q); } }
    }
  }
}

// ---------------- laço principal (10x por segundo) ----------------
function hostTickTimed() {
  const pn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), a = pn(), now = Date.now();
  if (S.lastWall && now - S.lastWall > 1000) { (S.stalls = S.stalls || []).push([now, now - S.lastWall]); if (S.stalls.length > 200) S.stalls.shift(); }
  S.lastWall = now;
  hostTick();
  const d = pn() - a; S.tickMs = S.tickMs == null ? d : S.tickMs * 0.95 + d * 0.05; S.tickMax = Math.max((S.tickMax || 0) * 0.999, d);
  if (now - (S.heatT || 0) > 10000) { S.heatT = now; try { for (const n of Object.values(S.npcs || {})) if (!n.dead) obsHeatAdd('time', n.x, n.y, 1); if (now - (S.heatSaveT || 0) > 300000) { S.heatSaveT = now; obsHeatSave(); } } catch (e) { } }
  if (now - (S.pingT || 0) > 5000) { S.pingT = now; for (const id in S.players) if (id !== Net.myId) Net.toOne(id, { t: 'hp', t0: now }); }
}
// ============================================================
//  NEGÓCIOS DE NPC — economia própria (mesmas regras dos de jogador): caixa, produção, compra de insumos
//  (primeiro de outros negócios de NPC pelo preço justo; se faltar, do fornecedor, 30% mais caro), vendas,
//  salários e manutenção. Fecha só depois de 3 dias seguidos no vermelho e reabre com empréstimo do banco.
// ============================================================
const NPCB_SUP = 1.3, NPCB_KEEP = 30, NPCB_START = 400, NPCB_LOAN = 300, NPCB_EXTRACT = 1.3, NPCB_SHOP_K = 1.5, NPCB_SHOP_BASE = 0.9;
function npcbInputs() { const set = new Set(); for (const P of PROPS) if (npcbSim(P)) { if (P.kind === 'shop') for (const g of SHOP_GOODS[P.shopType]) set.add(g); else if (WORKS[P.wk] && WORKS[P.wk].recipes) for (const r in WORKS[P.wk].recipes) for (const g in WORKS[P.wk].recipes[r]) set.add(g); } return set; }   /* mercadorias que outros negócios de NPC compram */
function npcbSim(P) { return !!(P && P.kind !== 'house' && P.npcOwner && (P.kind === 'hotel' || (P.kind === 'shop' && SHOP_GOODS[P.shopType]) || (P.kind === 'workshop' && WORKS[P.wk]))); }
const npcbDay = () => ({ rev: 0, cost: 0, sold: 0, buy: 0, wage: 0, up: 0, sup: 0, pl: 0, mk: {} });
function npcbAll() {
  const E = estateLoad(), N = E.npcb || (E.npcb = {});
  for (const P of PROPS) if (npcbSim(P) && !E.r[P.id] && !N[P.id]) N[P.id] = { cofre: NPCB_START, store: {}, today: npcbDay(), hist: [], closed: 0, loss: 0, debt: 0, short: 0, log: [] };
  for (const pid in N) if (E.r[pid] || !npcbSim(PROPS_BY[pid])) delete N[pid];   /* comprado por um jogador: passa a usar a economia dele */
  return N;
}
function npcbOfNpc(n) { if (!n || !S.estate) return null; const bi = n.bi != null ? n.bi : WORLD.bld[tileAt(n.postX ?? n.x, n.postY ?? n.y)], P = PROPS.find(q => q.bi === bi && q.kind !== 'house'); return P ? npcbAll()[P.id] || null : null; }
function npcbLog(B, t) { B.log.unshift({ t, at: Date.now() }); if (B.log.length > 12) B.log.length = 12; }
function npcbBuy(pid, B, g, q) {
  const N = npcbAll(); let got = 0;
  for (const sp in N) { if (sp === pid || got >= q || PROPS_BY[sp].kind !== 'workshop') continue; const X = N[sp]; if (X.closed) continue;   /* só quem produz vende para os outros negócios */ const have = Math.floor(X.store[g] || 0) - 2; if (have <= 0) continue;
    const t = Math.min(q - got, have, Math.floor(Math.max(0, B.cofre) / GOODS[g].p)); if (t <= 0) break; const v = t * GOODS[g].p;
    X.store[g] -= t; X.cofre += v; X.today.rev += v; X.today.sold += t; B.cofre -= v; B.today.cost += v; B.today.buy += v; B.store[g] = (B.store[g] || 0) + t; got += t; }
  const supK = NPCB_SUP * (S.simEv && S.simEv.short && S.simEv.short.g === g && S.simEv.short.until > gameNow() ? 2.5 : 1);
  if (got < q) { const t = Math.min(q - got, Math.floor(Math.max(0, B.cofre) / (GOODS[g].p * supK))); if (t > 0) { const v = Math.ceil(t * GOODS[g].p * supK); B.cofre -= v; B.today.cost += v; B.today.buy += v; B.today.sup += t; B.store[g] = (B.store[g] || 0) + t; got += t; } }
  if (got < q) { B.shortH = (B.shortH || 0) + 1; B.shortG = g; } return got;
}
function npcbStaffHere(P) { return Object.values(S.npcs || {}).some(n => !n.dead && !n.downed && !n.transient && n.bi === P.bi && WORLD.bld[tileAt(n.x, n.y)] === P.bi); }
function npcbHour() {
  const N = npcbAll(), hr = resHour(), open = hr >= 7 && hr < 20, sk = seasonNow().k;
  for (const pid in N) { const B = N[pid], P = PROPS_BY[pid]; if (B.closed) continue; B.frac = B.frac || {};
    if (P.kind === 'hotel') { const H = hotelData(), d0 = estDay(), occ = Object.values(H.rooms || {}).filter(x => x && ((x.who && x.until > d0) || (x.npc && S.npcs && S.npcs[x.npc]))).length; const v = occ * 2 + 1; B.cofre += v; B.today.rev += v; B.today.sold += occ; continue; }   /* hóspedes + viajantes de passagem (refeições, banho) */
    const tav = P.wk === 'tavern'; if (tav ? !(hr >= 10) : !open) continue;   /* a taverna abre às 10 e vai até a meia-noite */
    const k = npcbStaffHere(P) ? 1.2 * npcbMoodMul(P) : 0.7;
    if (P.kind === 'workshop') { const W = WORKS[P.wk];
      if (W.make) for (const g in W.make) { if (S.simEv && S.simEv.short && S.simEv.short.g === g && S.simEv.short.until > gameNow()) continue;   /* falta (evento) */
        B.frac[g] = (B.frac[g] || 0) + W.make[g] * k * NPCB_EXTRACT * ((P.wk === 'wheat' || P.wk === 'farm') ? (sk === 'winter' ? 0.4 : sk === 'summer' ? 1.25 : 1) : 1); const q = Math.floor(B.frac[g]); B.frac[g] -= q; if (q) { B.store[g] = (B.store[g] || 0) + q; B.today.mk[g] = (B.today.mk[g] || 0) + q; } }
      if (W.recipes) { const rk = Object.keys(W.recipes).sort((a, b) => (B.store[a] || 0) - (B.store[b] || 0))[0], rec = W.recipes[rk]; B.frac._b = (B.frac._b || 0) + k * 1.5; let nb = Math.floor(B.frac._b); B.frac._b -= nb;
        while (nb-- > 0) { if ((B.store[rk] || 0) >= (rk === 'serve' ? 20 : NPCB_KEEP)) break; for (const g in rec) { const miss = rec[g] - Math.floor(B.store[g] || 0); if (miss > 0) npcbBuy(pid, B, g, rec[g] * 3); } if (Object.keys(rec).some(g => (B.store[g] || 0) < rec[g])) break; for (const g in rec) B.store[g] -= rec[g]; B.store[rk] = (B.store[rk] || 0) + 1; B.today.mk[rk] = (B.today.mk[rk] || 0) + 1; } }
      if (P.wk === 'tavern') { const pat = Object.values(S.npcs).filter(q => !q.dead && !/^(guard|captain)/.test(q.kind) && WORLD.bld[tileAt(q.x, q.y)] === P.bi && q.role !== 'clerk' && q.kind !== 'innkeeper' && q.kind !== 'tavmaid').length, served = Math.min(pat, Math.floor(B.store.serve || 0)), v = npcbTavernTake(P) + 3 + served * 4; B.store.serve = (B.store.serve || 0) - served; if (v) { B.cofre += v; B.today.rev += v; B.today.sold += pat; } }
      { const IN = S.npcbIn || (S.npcbIn = npcbInputs()); for (const g in B.store) { if (g === 'serve') continue; const fin = !IN.has(g), ex = Math.floor(B.store[g] - (fin ? 0 : NPCB_KEEP)); if (ex > 0) { const v = ex * GOODS[g].p * (fin ? 1 : SELL_K); B.store[g] -= ex; B.cofre += v; B.today.rev += v; B.today.sold += ex; } } }   /* produto final: vendido aos moradores no balcão; insumo: guarda 30 para os outros negócios e o excesso vai para as caravanas */
    } else if (P.kind === 'shop') { const GS = SHOP_GOODS[P.shopType];
      for (const g of GS) { const have = Math.floor(B.store[g] || 0); if (have < 6) npcbBuy(pid, B, g, 12 - have); }
      const vis = Object.values(S.npcs).filter(q => q.transient && !q.dead && WORLD.bld[tileAt(q.x, q.y)] === P.bi).length; B.fr = (B.fr || 0) + (NPCB_SHOP_BASE + vis * 0.8) * k; let n = Math.floor(B.fr); B.fr -= n;
      while (n-- > 0) { const gs = GS.filter(g => (B.store[g] || 0) >= 1); if (!gs.length) break; const g = gs[Math.floor(Math.random() * gs.length)], v = GOODS[g].p * NPCB_SHOP_K; B.store[g]--; B.cofre += v; B.today.rev += v; B.today.sold++; } }
  }
}
function npcbDayEnd() {
  try { aptNpcDay(); } catch (e) { console.warn('aptos', e); }
  const N = npcbAll();
  try { npcDayEnd(); } catch (e) { console.warn('moradores', e); }
  for (const pid in N) { const B = N[pid], P = PROPS_BY[pid], td = B.today;
    if (!B.closed) { const wage = SALARY[P.kind] || 6, up = Math.max(2, Math.round((P.rent || 10) * 0.25)); B.cofre -= wage + up; td.cost += wage + up; td.wage = wage; td.up = up;
      { const gs = Object.keys(B.store).filter(g => B.store[g] >= 3); if (gs.length && Math.random() < THEFT[0]) { const g = gs[Math.floor(Math.random() * gs.length)], lost = Math.max(1, Math.floor(B.store[g] * 0.2)); B.store[g] -= lost; npcbLog(B, 'Ladrões levaram ' + lost + ' ' + GOODS[g].n + ' durante a noite.'); } }
      if (B.debt > 0 && B.cofre > NPCB_START) { const pay = Math.min(B.debt, Math.floor(B.cofre - NPCB_START)); B.cofre -= pay; B.debt -= pay; td.cost += pay; npcbLog(B, 'Pagou ' + pay + ' do empréstimo.'); } }
    for (const w of Object.values(S.npcs || {})) if (!w.transient && !w.dead && w.bi === P.bi && w.home !== P.bi) { if (!B.closed) { w.gold = (w.gold || 0) + (td.wage || SALARY[P.kind] || 6); moodAdd(w, 2); } else moodAdd(w, -8); }   /* quem trabalha aqui recebe o salário (fechado: sem salário) */
    B.short = (B.shortH || 0) >= 3 ? (B.short || 0) + 1 : 0; B.shortH = 0;
    if (B.hist.length >= 14) B.hist.splice(0, B.hist.length - 13); B.hist.push({ d: estDay() - 1, rev: Math.round(td.rev), cost: Math.round(td.cost), sold: td.sold, buy: Math.round(td.buy), wage: td.wage, up: td.up, sup: td.sup, pl: Math.round(td.pl), mk: td.mk, cofre: Math.round(B.cofre) }); if (B.hist.length > 60) B.hist.shift();
    if (B.closed) { if (--B.closed <= 0) { B.closed = 0; B.loss = 0; B.cofre += NPCB_LOAN; B.debt += NPCB_LOAN; npcbLog(B, 'Reabriu com um empréstimo de ' + NPCB_LOAN + ' do banco.'); sys('🔓 ' + P.name + ' reabriu as portas com um empréstimo do banco.'); } }
    else { B.loss = B.cofre < 0 ? (B.loss || 0) + 1 : 0; if (B.loss >= 3) { B.closed = 2; npcbLog(B, 'Fechou: 3 dias seguidos no vermelho.'); sys('🔒 ' + P.name + ' fechou as portas por dívidas (3 dias no vermelho).'); } }
    B.today = npcbDay(); }
}
// ============================================================
//  HUMOR E CARTEIRA DOS MORADORES — o dinheiro circula: salário sai do caixa do negócio e volta quando o morador gasta
//  (almoço na Padaria, bebida na taverna, compras nas lojas). O humor sobe e desce com o que acontece e muda o comportamento.
// ============================================================
const MOOD_SAD = ['Que fase...', 'Hoje não estou bem.', 'Nada dá certo ultimamente.', 'Ando tão cansado de tudo.', 'Preciso de uma folga.'];
const MOOD_HAPPY = ['Que dia bonito!', 'As coisas estão indo bem!', 'Hoje eu pago a rodada!', 'Ganhei bem essa semana.'];
const MOOD_BROKE = ['O dinheiro não dá para nada.', 'Tô sem um tostão.', 'Vou ter que comer em casa de novo.'];
function npcMoodInit(n) { const M = (estateLoad().npcm || {})[n.id]; if (M) { n.mood = M[0]; n.gold = M[1]; } else { n.mood = 55 + Math.random() * 15; n.gold = Math.round(30 + Math.random() * 50); } }
function moodAdd(n, d) { if (!n || n.transient) return; if (n.mood == null) npcMoodInit(n); n.mood = Math.max(0, Math.min(100, n.mood + d)); }
function npcSpend(n, kindOrWk, v) {   /* paga um negócio de NPC aberto (pelo tipo de oficina ou loja) */
  const N = npcbAll(); const pid = Object.keys(N).find(id => { const Pq = PROPS_BY[id]; return !N[id].closed && (Pq.wk === kindOrWk || Pq.shopType === kindOrWk || id === kindOrWk); }); if (!pid || (n.gold || 0) < v) return false;
  const B = N[pid]; n.gold -= v; B.cofre += v; B.today.rev += v; B.today.sold++; B.today.res = (B.today.res || 0) + v; return true;
}
function npcbTavernTake(P) {   /* cada freguês na taverna paga 3 da própria carteira por hora */
  let v = 0; for (const q of Object.values(S.npcs || {})) { if (q.dead || /^(guard|captain)/.test(q.kind) || q.role === 'clerk' || q.kind === 'innkeeper' || q.kind === 'tavmaid' || WORLD.bld[tileAt(q.x, q.y)] !== P.bi) continue;
    if (q.transient) { v += 3; continue; } if ((q.gold || 0) >= 3) { q.gold -= 3; v += 3; moodAdd(q, 1.5); } } return v;
}
function npcbMoodMul(P) { const W = Object.values(S.npcs || {}).filter(n => !n.dead && !n.transient && n.bi === P.bi && n.mood != null); if (!W.length) return 1; const m = W.reduce((a, n) => a + n.mood, 0) / W.length; return m < 30 ? 0.8 : m > 75 ? 1.1 : 1; }
function npcMoodHour() {   /* uma vez por hora do jogo */
  const E = estateLoad(), M = E.npcm || (E.npcm = {}), rain = weatherS().rain || 0;
  const NB = npcbAll();
  for (const n of Object.values(S.npcs || {})) { if (n.transient || n.dead || /^(guard|captain)/.test(n.kind || '') || n.bizWorker || n.collector) continue; if (n.mood == null) npcMoodInit(n);
    const own = n.bi != null && Object.keys(NB).find(id => PROPS_BY[id].bi === n.bi), B = own && NB[own];   /* donos e balconistas fixos: o humor segue a saúde do negócio */
    const N = n.need || { food: 60, rest: 60, social: 60 }, avg = (N.food + N.rest + N.social) / 3; let d = (n.need ? (avg - 50) / 25 : 0) + (60 - n.mood) * 0.03 + (B ? (B.closed ? -2 : B.loss ? -1 : B.cofre > 600 ? 0.4 : 0) : 0);
    if ((n.gold || 0) < 10) d -= 0.6; if (rain > 0.5 && WORLD.bld[tileAt(n.x, n.y)] < 0) d -= 0.5; if (n.downed) d -= 3;
    n.mood = Math.max(0, Math.min(100, n.mood + d)); M[n.id] = [Math.round(n.mood), Math.round(n.gold || 0)]; }
}
function npcDayEnd() {   /* fim do dia: decisão de faltar amanhã, compras nas lojas, salário dos mensageiros */
  const today = estDay() + 0, shops = Object.keys(npcbAll()).filter(id => PROPS_BY[id].kind === 'shop');
  for (const n of Object.values(S.npcs || {})) { if (n.transient || n.dead || !n.role || n.home == null) continue; if (n.mood == null) npcMoodInit(n);
    if (n.role === 'courier') { n.gold = (n.gold || 0) + 6; moodAdd(n, 1); }
    n.skipDay = n.mood < 25 && Math.random() < 0.35 ? today : -1;
    const want = n.mood > 75 ? 0.8 : n.mood < 30 ? 0.2 : 0.5; if ((n.gold || 0) > 40 && shops.length && Math.random() < want) { const id = shops[Math.floor(Math.random() * shops.length)], B = npcbAll()[id], GS = (SHOP_GOODS[PROPS_BY[id].shopType] || []).filter(g => (B.store[g] || 0) >= 1);
      if (GS.length && !B.closed) { const g = GS[Math.floor(Math.random() * GS.length)], v = Math.round(GOODS[g].p * NPCB_SHOP_K); if (n.gold >= v) { n.gold -= v; B.store[g]--; B.cofre += v; B.today.rev += v; B.today.sold++; B.today.res = (B.today.res || 0) + v; moodAdd(n, 2); } } } }
}
// ============================================================
//  CONTROLES DE SIMULAÇÃO (Observatório, só o Tecelão) — afetam todos no reino e são avisados no chat
// ============================================================
function simBroadcast() { const E = estateLoad(); E.clk = Math.round(gameNow() - Date.now()); estateSave(); Net.toAll({ t: 'clk', g: gameNow(), rate: SIMCLK.rate, paused: SIMCLK.paused }); }
function obsControl(p, m) {
  const E = estateLoad(), N = npcbAll(), ev = S.simEv || (S.simEv = {}), H = BIZ_HOUR_MS;
  if (m.a === 'rate') { const v = [1, 2, 5, 10].includes(+m.v) ? +m.v : 1; simSet(gameNow(), v, false); simBroadcast(); sys(v === 1 ? '⏳ O Tecelão devolveu o tempo ao ritmo normal.' : '⏩ O Tecelão acelerou o tempo: ' + v + '× mais rápido.'); }
  else if (m.a === 'pause') { const pz = !SIMCLK.paused; simSet(gameNow(), SIMCLK.rate, pz); simBroadcast(); sys(pz ? '⏸ O Tecelão parou o tempo: o sol fica parado e a cidade não avança.' : '▶ O tempo voltou a correr.'); }
  else if (m.a === 'ev') {
    if (m.k === 'party') { ev.party = gameNow() + 3 * H; for (const n of Object.values(S.npcs || {})) if (!n.transient) moodAdd(n, 8); sys('🎉 Festa na cidade! Os moradores largaram tudo e foram para o Ronco do Dragão (3 horas do jogo).'); }
    else if (m.k === 'short') { const g = ['wheat', 'wood', 'ore', 'herb', 'flax'].includes(m.g) ? m.g : 'wheat'; ev.short = { g, until: gameNow() + 24 * H }; for (const pid in N) if (N[pid].store[g]) N[pid].store[g] = 0; sys('⚠ Falta de ' + GOODS[g].n + ' na região: ninguém produz por um dia e o fornecedor cobra 2,5× mais.'); }
    else if (m.k === 'attack') { const types = Object.keys(MON).filter(t => /goblin|orc|bandit|skeleton/.test(t)); let n0 = 0; for (let k = 0; k < 60 && n0 < 8; k++) { const x = C + (Math.random() - 0.5) * 10, y = C + 42 + Math.random() * 5; if (REACH[Math.round(y) * MAP_W + Math.round(x)] && monStand(x, y, null)) { spawnAt(pick(types.length ? types : ['goblin']), x, y); n0++; } } sys('⚔ Ataque! ' + n0 + ' monstros apareceram diante do portão sul.'); }
    else if (m.k === 'caravan') { for (let k = 0; k < 6; k++) visSpawn(now_(), 'trav'); for (const pid in N) if (PROPS_BY[pid].kind === 'shop' && !N[pid].closed) { const v = 40 + Math.round(Math.random() * 60); N[pid].cofre += v; N[pid].today.rev += v; N[pid].today.sold += 4; } sys('🐪 Uma caravana de mercadores chegou: seis viajantes nas ruas e as lojas venderam bem.'); }
    else if (m.k === 'fire') { const ids = Object.keys(N).filter(id => PROPS_BY[id].kind === 'workshop' && !N[id].closed); if (!ids.length) return; const id = pick(ids), B = N[id], P0 = PROPS_BY[id]; for (const g in B.store) B.store[g] = Math.floor(B.store[g] * 0.4); B.cofre -= 120; B.today.cost += 120; B.closed = 1; npcbLog(B, 'Incêndio! Perdeu boa parte do estoque e pagou 120 de reparos.'); for (const n of Object.values(S.npcs || {})) if (n.bi === P0.bi) moodAdd(n, -15); sys('🔥 Incêndio na ' + P0.name + '! Fechada por um dia para reparos.'); }
    estateSave();
  }
  Net.toOne(p.id, obsSnap());
}
// ============================================================
//  HISTÓRICO DO OBSERVATÓRIO — uma linha por hora do jogo (7 dias) e um resumo por dia (para sempre)
// ============================================================
const OBS_HKEY = 'nae-world-obs-v1', OBS_HEATKEY = 'nae-world-heat-v1', HEAT_N = 64;
function obsLoadH() { if (!S.obsH) S.obsH = { hr: [], dy: [] }; return S.obsH; }   /* dados do Observatório: só desta sessão do anfitrião */
function obsSaveH() { }
function obsCount(k, x, y) { S.obsCnt = S.obsCnt || {}; S.obsCnt[k] = (S.obsCnt[k] || 0) + 1; if (x != null) obsHeatAdd(k, x, y, 1); }
function obsHeatLoad() { if (!S.heat) S.heat = {}; return S.heat; }
function obsHeatAdd(k, x, y, v) { const H = obsHeatLoad(), a = H[k] || (H[k] = new Array(HEAT_N * HEAT_N).fill(0)), cx = Math.max(0, Math.min(HEAT_N - 1, Math.floor(x / MAP_W * HEAT_N))), cy = Math.max(0, Math.min(HEAT_N - 1, Math.floor(y / MAP_H * HEAT_N))); a[cy * HEAT_N + cx] += v; }
function obsHeatSave() { }
function obsRoleS(n) { if (n.transient) return 'vis'; if (n.role === 'courier') return 'cou'; if (/^(guard|captain)/.test(n.kind)) return 'grd'; if (/artisan|clerk/.test(n.role || '') || n.bizWorker || /^st_|smith|innkeeper|merchant|banker|tavmaid|hotelkeeper|fruit|tailor|broker/.test(n.kind)) return 'art'; return 'res'; }
function obsRecord(newDay) {
  const H = obsLoadH(), E = estateLoad(), N = npcbAll(), now = Date.now(), prev = S.obsPrev || (S.obsPrev = {}), row = { t: now, d: estDay(), h: Math.floor(resHour()), b: {}, g: [], c: {}, pop: {} };
  const take = (pid, td, stock, npc) => { const p0 = prev[pid] && prev[pid].d === row.d && !newDay ? prev[pid] : { rev: 0, cost: 0, sold: 0, mk: 0 }, mkT = Object.values(td.mk || {}).reduce((a, v) => a + v, 0);
    row.b[pid] = [Math.round(td.rev - p0.rev), Math.round(td.cost - p0.cost), td.sold - p0.sold, Math.round(stock), mkT - p0.mk, npc ? 1 : 0]; prev[pid] = { d: row.d, rev: td.rev, cost: td.cost, sold: td.sold, mk: mkT }; };
  for (const pid in N) { const B = N[pid]; take(pid, B.today, Object.values(B.store).reduce((a, v) => a + Math.max(0, v), 0), true); }
  for (const pid in E.r) { const B = E.r[pid].biz, P = PROPS_BY[pid]; if (!B || !B.today) continue; take(pid, { rev: (B.today.rev || 0) + (B.today.xfer || 0), cost: B.today.cost || 0, sold: B.today.sold || 0, mk: B.today.mk || {} }, Object.values((P.kind === 'shop' ? B.stock : B.store) || {}).reduce((a, v) => a + v, 0), false); }
  const BK = bankLoad(); row.g = [Math.round(Object.values(S.players).reduce((a, p) => a + (p.gold || 0), 0)), Math.round(Object.values(BK.acc).reduce((a, A) => a + Math.max(0, A.g || 0), 0)), Math.round(Object.values(N).reduce((a, B) => a + B.cofre, 0))];
  row.c = Object.assign({}, S.obsCnt || {}); S.obsCnt = {};
  { const R = Object.values(S.npcs || {}).filter(n => !n.transient && !n.dead && n.mood != null); row.m = R.length ? [Math.round(R.reduce((a, n) => a + n.mood, 0) / R.length), Math.round(R.reduce((a, n) => a + (n.gold || 0), 0)), R.filter(n => n.mood < 30).length] : null; }
  for (const n of Object.values(S.npcs || {})) { if (n.dead) continue; const r = obsRoleS(n), bi = WORLD.bld[tileAt(n.x, n.y)], Pq = bi >= 0 ? PROPS.find(q => q.bi === bi) : null; const place = n.sleeping || (bi >= 0 && bi === n.home) ? 0 : bi >= 0 && bi === n.bi ? 1 : BUILDINGS[bi] && BUILDINGS[bi].kind === 'tavern' ? 2 : Pq && Pq.kind !== 'house' ? 3 : 4; const a = row.pop[r] || (row.pop[r] = [0, 0, 0, 0, 0]); a[place]++; }
  for (const pid in row.b) { const Pq = PROPS_BY[pid], b = BUILDINGS[Pq.bi]; if (b && row.b[pid][2] > 0) obsHeatAdd('sale', b.x + b.w / 2, b.y + b.h / 2, row.b[pid][2]); }
  H.hr.push(row);
  if (newDay) { const yd = row.d - 1, rows = H.hr.filter(q => q.d === yd); if (rows.length) { const dd = { t: rows[rows.length - 1].t, d: yd, b: {}, g: rows[rows.length - 1].g, c: {}, pop: {} };
      for (const q of rows) { for (const pid in q.b) { const a = dd.b[pid] || (dd.b[pid] = [0, 0, 0, 0, 0, q.b[pid][5]]); a[0] += q.b[pid][0]; a[1] += q.b[pid][1]; a[2] += q.b[pid][2]; a[3] = q.b[pid][3]; a[4] += q.b[pid][4]; } for (const k in q.c) dd.c[k] = (dd.c[k] || 0) + q.c[k]; }
      { const ms = rows.filter(q => q.m); dd.m = ms.length ? [Math.round(ms.reduce((a, q) => a + q.m[0], 0) / ms.length), ms[ms.length - 1].m[1], Math.max(...ms.map(q => q.m[2]))] : null; }
      H.dy.push(dd); } }
  const cut = row.d - 7; H.hr = H.hr.filter(q => q.d > cut); obsSaveH(newDay);
}
// retrato da cidade para o Observatório (só o Tecelão pede, uma vez por segundo)
function obsSnap() {
  const E = (S.estate && S.estate.r) || {}, now = now_();
  const staffHomeBi = id => { const H = PROPS.filter(P => P.kind === 'house' && P.district !== 'Vila do Oeste' && !BUILDINGS[P.bi].extra); if (!H.length) return -1; const h = [...String(id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0; return H[h % H.length].bi; };
  const workOf = n => n.bi != null ? n.bi : (n.transient ? -1 : WORLD.bld[tileAt(n.postX ?? n.x, n.postY ?? n.y)] ?? -1);
  const bk = k => BUILDINGS.findIndex(b => b.kind === k), nearest = (n, k) => { let bi = -1, bd = 1e9; BUILDINGS.forEach((b, i) => { if (b.kind !== k) return; const d = dist(n.x, n.y, b.x + b.w / 2, b.y + b.h / 2); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const OUT_WORK = n => /^(guard|captain)/.test(n.kind) ? 'Patrulha da cidade' : n.kind === 'fruit' ? 'Banca de frutas da praça' : n.kind === 'executioner' ? 'Cadafalso da praça' : n.kind === 'supplier' ? 'Portão principal (fornecedor)' : n.role === 'courier' ? 'Entregas pela cidade' : n.kind === 'gardener' ? 'Jardins do bairro nobre' : /^noble/.test(n.kind) ? 'Bairro nobre (vida de nobre)' : '';
  const homeOf = n => { if (n.home != null) return n.home; if (n.transient) return -1; if (/^(guard|captain)/.test(n.kind)) return bk('barracks'); if (n.kind === 'fruit') return bk('fruithouse'); if (/^noble/.test(n.kind)) return nearest(n, 'manor'); if (n.kind === 'executioner' || n.kind === 'jailer') return bk('jail');
    if (n.bizWorker || n.collector || n.role === 'courier' || n.kind === 'supplier' || n.kind === 'gardener') return staffHomeBi(n.id); return workOf(n); };   /* fixos moram onde trabalham; funcionários, na casa sorteada */
  const actOf = (n, J) => n.act || (J ? J.st : '') || (n.dead ? 'dead' : n.transient ? (n.bard ? 'bard' : 'visit') : /^(guard|captain)/.test(n.kind) ? 'patrol' : n.sleeping ? 'sleep' : n.fight ? 'fight' : (WORLD.bld[tileAt(n.x, n.y)] === workOf(n) && workOf(n) >= 0 ? 'work' : 'walk'));
  const npcs = Object.values(S.npcs || {}).map(n => { const J = n.job; const dest = n.walkTo || (J && J.wp && J.wp[J.i]) || (n.route && n.route.length ? n.route[(n.ri || 0) % n.route.length] : null);
    return [n.id, n.name, n.kind, n.role || (n.bizWorker ? 'worker' : ''), +n.x.toFixed(1), +n.y.toFixed(1), actOf(n, J), homeOf(n), workOf(n), dest ? [+(+dest[0]).toFixed(1), +(+dest[1]).toFixed(1)] : null, J && J.goods ? J.goods : null,
      (n.sleeping ? 1 : 0) | (n.downed ? 2 : 0) | (n.dead ? 4 : 0) | (n.drunkT > now ? 8 : 0) | (n.transient ? 16 : 0) | (n.sitting ? 32 : 0) | (n.bard ? 64 : 0) | (n.skipDay === estDay() ? 128 : 0), n.need ? [Math.round(n.need.food), Math.round(n.need.rest), Math.round(n.need.social)] : null, n.mood != null ? Math.round(n.mood) : null, n.gold != null ? Math.round(n.gold) : null, workOf(n) < 0 ? OUT_WORK(n) || (n.transient ? 'Visitante' : '') : '']; });
  const players = Object.values(S.players).map(p => [p.id, p.name, +p.x.toFixed(1), +p.y.toFixed(1), p.lvl, p.dev ? 1 : 0, p.ping ?? null, p.recon || 0, p.id === Net.myId ? 1 : 0, p.downed ? 1 : 0, S.bw && S.bw[p.id] ? +S.bw[p.id].kb.toFixed(1) : null]);
  const NBs = npcbAll(), lastH = (obsLoadH().hr || []).slice(-1)[0];
  const biz = PROPS.filter(P => P.kind !== 'house').map(P => { const r = E[P.id], NB = !r && NBs[P.id]; if (NB) { const td = NB.today, yd = NB.hist[NB.hist.length - 1], st = NB.closed ? 'idle' : NB.loss >= 1 || NB.cofre < 0 || (yd && yd.cost > yd.rev) ? 'bad' : NB.short >= 2 ? 'warn' : 'ok';   /* status pelo resultado de ontem */
      return [P.id, P.name, P.kind, P.bi, P.npcOwner + ' (NPC)', st, Math.round(Object.values(NB.store).reduce((a, v) => a + Math.max(0, v), 0)), [Math.round(td.rev), Math.round(td.cost), 0, td.sold], NB.short >= 2 ? [NB.shortG || '', NB.short] : null, null, Math.floor(NB.cofre), lastH && lastH.b[P.id] ? lastH.b[P.id][4] : null, NB.loss, NB.debt, NB.closed, td.sup || 0]; }
    const B = r && r.biz; let st = null, wait = null;
    if (B) { const w = Object.entries(B.wait || {}).sort((a, b) => a[1] - b[1]); if (w.length) wait = [w[0][0].replace(/r$/, ''), Math.round((gameNow() - w[0][1]) / BIZ_HOUR_MS * 10) / 10];
      const td = B.today || {}; st = B.closed ? 'idle' : wait && wait[1] >= 2 ? 'warn' : (td.cost || 0) > (td.rev || 0) + (td.xfer || 0) && (td.cost || 0) > 30 ? 'bad' : 'ok'; }
    const st0 = B ? (P.kind === 'shop' ? B.stock : B.store) || {} : null;
    return [P.id, P.name, P.kind, P.bi, r ? r.ownerName : (P.npcOwner || ''), st, st0 ? Math.round(Object.values(st0).reduce((a, v) => a + v, 0)) : null, B && B.today ? [Math.round(B.today.rev || 0), Math.round(B.today.cost || 0), Math.round(B.today.xfer || 0), B.today.sold || 0] : null, wait, B ? (B.staff || []).length : null, B ? Math.floor(B.cofre || 0) : null, lastH && lastH.b[P.id] ? lastH.b[P.id][4] : null]; });
  const se = S.simEv || {}, gn = gameNow();
  return { t: 'obs', at: Date.now(), clk: { rate: SIMCLK.rate, paused: SIMCLK.paused, ev: { party: se.party > gn ? Math.ceil((se.party - gn) / BIZ_HOUR_MS) : 0, short: se.short && se.short.until > gn ? [se.short.g, Math.ceil((se.short.until - gn) / BIZ_HOUR_MS)] : null } }, hour: resHour(), day: estDay() - (S.day0 ?? (S.day0 = estDay())) + 1, host: (S.players[Net.myId] || {}).name || '', npcs, players, biz, ev: (S.events || []).slice(-120),
    tech: { long: typeof LONGT !== 'undefined' ? LONGT.filter(q => Date.now() - q[0] < 3600000) : [], tick: +(S.tickMs || 0).toFixed(2), max: +(S.tickMax || 0).toFixed(1), stalls: (S.stalls || []).filter(q => Date.now() - q[0] < 3600000), mons: Object.keys(S.monsters).length, npcN: Object.keys(S.npcs || {}).length } };
}
function hostTick() {
  const now = now_();
  const dt = S.lastTick ? Math.min(0.25, (now - S.lastTick) / 1000) : 0.1;
  S.lastTick = now;
  const players = Object.values(S.players);
  estateTick(now); jobsTick(now); coinTick(now);
  if (now - (S.pmapT || 0) > 2000) { S.pmapT = now; const l = Object.values(S.players).filter(p => !p.devHidden).map(p => [p.id, Math.round(p.x), Math.round(p.y), p.name, p.dev ? 1 : 0]); if (l.length > 1) Net.toAll({ t: 'pmap', l }); }   /* posição de todos no mapa */
  if (now - (S.bankT || 0) > 5000) { S.bankT = now; try { bankTick(now); } catch (e) { console.warn('banco', e); } }

  if (!S.filled) {
    for (let i = 0; i < 8000 && wildCount() < MAX_WILD; i++) spawnMonster();
    S.filled = true;
  } else if (now >= S.nextSpawn && wildCount() < MAX_WILD) {
    for (let i = 0; i < 40; i++) if (spawnMonster()) break;
    S.nextSpawn = now + 1500;
  }

  for (const p of players) { if (p.wanted && (now > p.wanted || !inSafe(p.x, p.y))) { p.wanted = 0; Net.toAll({ t: 'wanted', id: p.id, ms: 0 }); }
    bodyTick(p, now, dt); survivalTick(p, now, dt); combatTick(p, now, dt); bowTick(p, now, dt); dragTick(p, now, dt); tiedTick(p, now); jailTick(p, now, dt); if (p.running && p.walking) { const d = dist(p._rx ?? p.x, p._ry ?? p.y, p.x, p.y); if (d < 3) useGain(p, 'run', d); } p._rx = p.x; p._ry = p.y; }
  if (!S.bslots) initBastions();
  tickBastions(now);
  if (S.fires && S.fires.length) { S.fires = S.fires.filter(f => f.until > now); for (const p of players) { if (p.downed || now < (p.burnT || 0)) continue; if (S.fires.some(f => dist(f.x, f.y, p.x, p.y) < f.r)) { p.burnT = now + 500; damagePlayer(p, 6, null, 0); if (Math.random() < 0.25) ignitePlayer(p, now); } } }
  npcTick(now, dt); dragCleanup(); fireTick(now, players); zoneTick(now); arrowTick(now, dt); arrowBleedTick(now);

  for (const p of players) {
    if (p.downed) {
      // reanimação em andamento
      if (p.revive) {
        const r = S.players[p.revive.by];
        if (!r || r.downed || dist(r.x, r.y, p.x, p.y) > 1.9) { p.revive = null; near(p.x, p.y, { t: 'rv', id: p.id, by: null }); }
        else if (now - p.revive.start >= REVIVE_MS) revivePlayer(p, 0.3, r.name);
      }
      // levado até a capela: a Irmã Lúmina reanima
      if (p.downed) { const pr = NPCS[0]; if (dist(p.x, p.y, pr.x, pr.y) <= 2.6) { revivePlayer(p, 1); near(p.x, p.y, { t: 'chat', name: '', text: 'A Irmã Lúmina reanimou ' + p.name + '.' }); } }
      if (p.downed && now >= p.downed.until) { if (p.downed.faint) { revivePlayer(p, 0.3, 'você mesmo'); tell(p, 'Você recupera os sentidos, tossindo.'); } else respawnTemple(p); }
      continue;
    }
    if (p.aid) {
      const r = S.players[p.aid.by];
      if (!r || r.downed || dist(r.x, r.y, p.x, p.y) > 1.9 || p.hp >= p.maxHp * KNEEL_HP) { p.aid = null; near(p.x, p.y, { t: 'rv', id: p.id, by: null }); }
      else if (now - p.aid.start >= AID_MS) { p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * AID_HEAL)); p.aid = null; near(p.x, p.y, { t: 'rv', id: p.id, by: null }); aoe('heal', p.x, p.y, { id: p.id }); tell(p, r.name + ' te ajudou a levantar.'); sendStat(p); }
    }
    if (p.casting && now >= p.casting.until) { const c = p.casting; p.casting = null; execSkill(p, c.i, S.monsters[c.tid]); }
    if (!p.target) continue;
    const m = S.monsters[p.target];
    if (!m) { p.target = null; continue; }
    if (false && p.cls !== 'knight' && dist(p.x, p.y, m.x, m.y) > 2.2 && !p.atk && !p.parry && !p.casting && !p.carrying && !p.lifted && now >= p.nextAtk && !inSafe(p.x, p.y) && Math.abs(p.z - (m.z || 0)) < 0.5 && dist(p.x, p.y, m.x, m.y) <= CLASSES[p.cls].range + (MON[m.type].rad || 0)) basicAttack(p, m, now);
  }

  // monstros: grade espacial para a colisão; os que estão longe de todo mundo (e calmos) pensam 1 vez a cada 4
  monGridBuild(now); S.mtick = (S.mtick || 0) + 1;
  for (const m of Object.values(S.monsters)) {
    if (!m.aggro && !m.atk && !m.carrying && !m.dragging && !m.leadP && !m.gripBy && players.every(p => Math.abs(p.x - m.x) > 45 || Math.abs(p.y - m.y) > 45)) { if ((S.mtick + (m._h ?? (m._h = [...String(m.id)].reduce((a, c) => a + c.charCodeAt(0), 0)))) % 4) continue; monsterThink(m, players, now, dt * 4); }
    else monsterThink(m, players, now, dt);
  }

  // regeneração fora de combate
  if (now - S.lastRegen >= 1000) {
    S.lastRegen = now;
    for (const p of players) {
      if (p.downed || now - p.lastCombat < OUT_OF_COMBAT_MS) continue;
      if (p.hp >= p.maxHp && p.mp >= p.maxMp) continue;
      let hr = Math.ceil(p.maxHp * 0.04) + 1, mr = now < (p.exhaustUntil || 0) ? 0 : Math.ceil(p.maxMp * 0.05) + 1;
      if (p.cls === 'mage') mr *= 2;
      hr = Math.ceil(hr * (1 + treeEff(p, 'regen'))); mr = Math.ceil(mr * (1 + treeEff(p, 'mregen')));
      if (buffOn(p, 'mead')) { hr = Math.ceil(hr * 1.5); mr = Math.ceil(mr * 1.5); }
      if (inSafe(p.x, p.y)) { hr *= 2; mr *= 2; }
      if (p.sit) { hr = Math.ceil(hr * 2.5); mr = Math.ceil(mr * 2.5); }
      if (p.sleep != null) { const k = estHomeBed(p) ? 6 : 4; hr = Math.ceil(hr * k); mr = Math.ceil(mr * k); }   // na própria cama descansa melhor
      if (buffOn(p, 'rested')) { hr = Math.ceil(hr * 1.3); mr = Math.ceil(mr * 1.3); }
      p.hp = Math.min(p.maxHp, p.hp + hr); p.mp = Math.min(p.maxMp, p.mp + mr);
      sendStat(p);
    }
  }

  // pacotes de estado: cada jogador recebe só o que está perto
  if (S.npSent) for (const id in S.npSent) if (!S.players[id]) delete S.npSent[id];
  const mons = Object.values(S.monsters);
  for (const r of players) {
    const pl = [], ml = [];
    for (const p of players) {
      if (dist(p.x, p.y, r.x, r.y) > VIEW_RADIUS) continue;
      if (p.devHidden && p.id !== r.id) continue;
      let fl = (p.walking ? 1 : 0) | (p.downed ? 2 : 0) | (p.carriedBy ? 4 : 0) | (p.carrying ? 8 : 0) | (p.running && p.walking ? 256 : 0) | (p.sit ? 512 : 0) | (p.sit === 'c' ? 1024 : 0) | (p.sleep != null ? 32768 : 0) | (p.drawT ? 65536 : 0) | (p.dragBy ? 131072 : 0) | (p.dragMode === 'foot' ? 262144 : 0) | (p.drag && p.drag.mode === 'arms' ? 524288 : 0) | (p.drag && p.drag.mode === 'foot' ? 1048576 : 0) | (p.drag && p.drag.mode === 'back' ? 2097152 : 0) | (p.drag && p.drag.mode === 'grip' ? 4194304 : 0) | (p.gripBy ? 8388608 : 0) | (p.tied ? 16777216 : 0) | (p.choked ? 33554432 : 0) | (p.choking ? 67108864 : 0) | (p.escortBy || p.surrendered ? 134217728 : 0) | (p.jailUntil > now ? 536870912 : 0) | (p.bound ? 1073741824 : 0) | (p.drag && (p.drag.helper || ((dragTarget(p.drag.k, p.drag.id) || {}).dragBy2)) ? 268435456 : 0) | ((((p.fl || 0) + 1) & 3) << 11) | (p.crouch ? 8192 : 0) | (p.slide ? 16384 : 0);
      for (const b in BUFF_BITS) if (buffOn(p, b)) fl |= BUFF_BITS[b];
      pl.push([p.id, Math.round(p.x * 100), Math.round(p.y * 100), Math.round(p.z * 100), p.dir | 0, fl, Math.round(p.hp / p.maxHp * 100), p.carrying || 0, p.lifted || 0, bodyBits(p), (p.lost || 0) | ((p.pro || 0) << 5), p.drag ? p.drag.k + ':' + p.drag.id : 0, (p.surrendered ? 1 : 0) | (p.bound && p.bound.kind === 'rope' ? 2 : 0) | (p.bound && p.bound.kind === 'cuffs' ? 4 : 0) | (p.dragBy && (/^(n:|m:)/.test(String(p.dragBy)) || p.dragMode === 'lead') && !p.downed ? 8 : 0) | (p.pkg ? 16 : 0) | (p.shift ? 32 : 0) | (p.wpn === 'halberd' ? 64 : 0) | ((p.uni || 0) << 7) | (((p.cloak || 0) & 15) << 16) | (p.inMenu ? 1024 : 0) | (p.sheathed ? 2048 : 0) | (p.parry ? (PZ.indexOf(p.parry.z) + 1) << 12 : 0) | ((p.shieldHp ?? 100) <= 0 && p.cls === 'knight' ? 32768 : 0) | (p.buffs && p.buffs.tipsy > now_() ? 1048576 : 0), p.fl || 0]);   /* andar exato no fim (o campo de bits só cabe até o 2º andar) */
    }
    for (const m of mons) {
      if (Math.abs(m.x - r.x) > VIEW_RADIUS || Math.abs(m.y - r.y) > VIEW_RADIUS) continue;
      ml.push([m.id, MON_TYPES.indexOf(m.type), Math.round(m.x * 100), Math.round(m.y * 100), m.hp, (m.slowUntil > now ? 1 : 0) | (m.stunUntil > now ? 2 : 0) | (m.sleep ? 4 : 0) | (m.fury ? 8 : 0) | ((m.lost || 0) << 5), m.face, MON[m.type].dragon ? dragonDir(m) : -1, Math.round((m.alt || 0) * 10), m.carrying || 0]);
    }
    const ch = []; for (const id in S.chests) { const c = S.chests[id]; if (Math.abs(c.x - r.x) <= VIEW_RADIUS && Math.abs(c.y - r.y) <= VIEW_RADIUS) ch.push([c.id, Math.round(c.x * 100), Math.round(c.y * 100), c.opened.has(r.id) ? 1 : 0, c.who.has(r.id) ? 1 : 0]); }
    const co = []; for (const id in S.corpses || {}) { const c = S.corpses[id]; if (Math.abs(c.x - r.x) <= VIEW_RADIUS && Math.abs(c.y - r.y) <= VIEW_RADIUS) co.push([c.id, MON_TYPES.indexOf(c.type), Math.round(c.x * 100), Math.round(c.y * 100), c.z, c.looted ? 1 : 0, Math.round(c.ix * 10), Math.round(c.iy * 10), c.lost || 0, c.onBack || 0]); }
    const np = [], NS = S.npSent || (S.npSent = {}), sent = NS[r.id] || (NS[r.id] = { k: 0, m: {} }), sm0 = sent.m; let ni = 0; sent.k++;   /* NPCs: só vai a linha que mudou (duas vezes, porque o canal rápido pode perder pacote) e um reenvio de segurança a cada 2 s */
    for (const n of Object.values(S.npcs || {})) { if (Math.abs(n.x - r.x) > VIEW_RADIUS + 4 || Math.abs(n.y - r.y) > VIEW_RADIUS + 4) continue; ni++; const row = [n.id, Math.round(n.x * 100), Math.round(n.y * 100), (n.downed ? 1 : 0) | (n.dead ? 2 : 0) | (n.dragBy && n.dragMode !== 'back' ? 4 : 0) | (n.dragMode === 'foot' ? 8 : 0) | (n.walk ? 32 : 0) | (n.lead && n.lead.phase === 'walk' ? 64 : 0) | (n.crawl ? 128 : 0) | (n.sleeping ? 256 : 0) | (n.job && n.job.st === 'levando' ? 512 : 0) | (n.drunkT > now ? 1024 : 0) | (n.arrest || n.aggro || n.fight || n.threat || n.chaseNpc || n.goFetch ? 2048 : 0) | (n.sitting ? 4096 : 0) | (n.sitting && n.doze ? 8192 : 0), n.onBack || 0, n.carrying || 0, n.fl || 0, n.fl ? n.fb : -1];
      const key = row.join(','), q = sm0[n.id]; if (!q || q.k !== key) { sm0[n.id] = { k: key, c: 1 }; np.push(row); } else if (q.c < 2) { q.c++; np.push(row); } else if ((sent.k + ni) % 20 === 0) np.push(row); }
    const sm = { t: 's', p: pl, m: ml, ch, co, np, jc: (S.cells || []).map(c => c.open ? 1 : 0) }; S.bw = S.bw || {}; if (r.id !== Net.myId && Date.now() - ((S.bw[r.id] || {}).t || 0) > 2000) S.bw[r.id] = { t: Date.now(), kb: JSON.stringify(sm).length * 10 / 1024 };
    Net.toOne(r.id, sm, true);
  }
}

// ---------- mundo único: cópia para todos (para quem assumir se o anfitrião cair) e recomeço pelo Tecelão ----------
function worldSnap() { estateLoad(); bankLoad(); const succ = Object.values(S.players).filter(q => q.id !== Net.myId).sort((a, b) => (a.joinT || 0) - (b.joinT || 0)).map(q => q.id);   /* quem chegou primeiro assume */ return { t: 'wsnap', est: S.estate, bank: S.bank, succ, ver: VERSION, wid: S.wid || 'legacy', wname: S.wname || 'Nae', host: (S.players[Net.myId] || {}).name || '' }; }
function worldBroadcast() { if (!Net.isHost || Net.offline) return; try { if (S.wid && typeof worldTouch === 'function') worldTouch(S.wid, S.wname, (S.players[Net.myId] || {}).name || '', true);
    const txt = JSON.stringify(worldSnap(), (k, v) => k === 'log' ? undefined : v), N = 16000, parts = Math.ceil(txt.length / N), id = Date.now();   /* em pedaços de 16 KB: mensagem grande demais trava ou derruba a conexão */
    for (const pid in Net.rel) { const c = Net.rel[pid]; if (!c.open) continue; for (let i = 0; i < parts; i++) c.send({ t: 'wsp', id, i, n: parts, d: txt.slice(i * N, (i + 1) * N) }); } } catch (e) { console.warn('wsnap', e); } }
function worldReset(p) {
  S.estate = { r: {}, lost: {}, hotel: {}, npcb: {}, npcm: {} }; estateSave(); S.bank = { acc: {} }; bankSave(); HOTEL_R = null; S.obsH = { hr: [], dy: [] }; S.heat = null; obsSaveH(true);
  for (const id of Object.keys(S.npcs || {})) { const q = S.npcs[id]; if (q && (q.bizWorker || q.collector)) visGone(q); }
  sys('O Tecelão recomeçou o mundo: imóveis, negócios e contas do banco voltaram ao zero.'); estateChanged(); worldBroadcast();
}
function startHostLoop() {
  if (S.loopOn) return; S.loopOn = true;
  setInterval(worldBroadcast, 60000);   /* a cópia do mundo só serve para reabri-lo depois: a cada minuto basta */
  if (typeof addEventListener === 'function') addEventListener('beforeunload', worldBroadcast);
  try {
    const src = 'setInterval(() => postMessage(0), 100);';
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = hostTickTimed;
  } catch (e) { setInterval(hostTickTimed, 100); }
}

// ============================================================
//  MERCADO IMOBILIÁRIO E NEGÓCIOS — alugar ou comprar casas, lojas e oficinas; porta trancada, baú, acordar em casa;
//  negócios automáticos: oficinas produzem, mensageiros levam até as suas lojas, lojas vendem sozinhas e o lucro
//  fica no cofre do negócio (vá buscar). Tudo guardado neste reino (no navegador de quem hospeda).
// ============================================================
const ESTATE_KEY = 'nae-world-estate-v1', ESTATE_AUTH_MAX = 6, ESTATE_CHEST_SLOTS = 48, ESTATE_ABANDON_DAYS = 30, BIZ_MAX = 9999, BIZ_OFFLINE_MS = 2 * ESTATE_DAY_MS;
const SALARY = { shop: 6, workshop: 8, bank: 30, hotel: 6 }, SAFE_CAP = 500, WS_CAP = 400, SHOP_CAP = 120, THEFT = [0.06, 0.04, 0.02, 0.01];
const estOwner = p => String(p.name || '').trim().toLowerCase() + '|' + p.cls + (p.uid ? '#' + p.uid : '');   // heróis novos têm código único: não herdam casa, negócios nem banco de um herói antigo
const estDay = () => Math.floor(gameNow() / ESTATE_DAY_MS);
const isBizProp = P => P && (P.kind === 'shop' || P.kind === 'workshop' || P.kind === 'bank' || P.kind === 'hotel') && P.npc !== 'a Guarda' && !(P.kind === 'workshop' && P.npc && !P.wk);
function estateLoad() {
  if (S.estate) return S.estate; S.estate = { r: {}, lost: {} };
  try { const j = hsGet(ESTATE_KEY); if (j && j.r) { S.estate = Object.assign({}, j, { r: j.r, lost: j.lost || {}, hotel: j.hotel || {}, npcb: j.npcb || {}, npcm: j.npcm || {}, tub: j.tub || {}, emp: j.emp || {}, seg: j.seg || {}, empN: j.empN || 0, clk: j.clk || 0 });   /* tudo o que foi salvo volta (casas, coroa, casamentos, linhagens, segredos...); antes só estes campos voltavam */ if (j.clk && !SIMCLK.real) simSet(Date.now() + j.clk, 1, false); for (const pid in S.estate.r) { const P = PROPS_BY[pid]; if (!P || (P.kind !== 'house' && !isBizProp(P))) { const r0 = S.estate.r[pid]; if (r0 && r0.owner && r0.chest && Object.keys(r0.chest).length) S.estate.lost[r0.owner] = Object.assign(S.estate.lost[r0.owner] || {}, r0.chest); delete S.estate.r[pid]; } }   /* imóvel que deixou de existir (a Casa 2 virou a agência): o baú volta para o dono */ } } catch (e) { }
  for (const pid in S.estate.r) bizLinkBank(S.estate.r[pid]);
  S.estateL = estateLocks(); return S.estate;
}
const BANK_CHEAT_H = 529268606;   /* impressão do código do comando de teste /banco */
function estChestSlots(pid) { const P = PROPS_BY[pid]; return P && P.suite ? ESTATE_CHEST_SLOTS * 2 : ESTATE_CHEST_SLOTS; }   /* o armário-baú da suíte guarda o dobro */
function estateSave() { try { hsSet(ESTATE_KEY, S.estate); } catch (e) { HOSTSTORE.fail = Date.now(); }
  if (HOSTSTORE.fail && Date.now() - (S.saveWarn || 0) > 300000) { S.saveWarn = Date.now(); try { sys('⚠ O mundo não pôde ser salvo no navegador do anfitrião (espaço cheio). Libere espaço ou o progresso deste reino pode se perder ao fechar.'); } catch (e) { } } }
/* autosave do mundo: a cada 30 s e ao fechar a aba (o que muda sem gravar na hora também fica guardado) */
if (typeof setInterval === 'function' && typeof addEventListener === 'function') { setInterval(() => { try { if (S.estate && typeof Net !== 'undefined' && Net.isHost) estateSave(); } catch (e) { } }, 30000); addEventListener('pagehide', () => { try { if (S.estate && typeof Net !== 'undefined' && Net.isHost) estateSave(); } catch (e) { } }); }
function estateLocks() { const E = S.estate, L = {}; if (!E) return L; for (const P of PROPS) if (tenantsOf(P).length && !P.apt) L[P.bi] = []; for (const pid in E.r) { const P = PROPS_BY[pid]; if (P && P.kind === 'house' && !P.apt) L[P.bi] = [E.r[pid].ownerName.trim().toLowerCase(), ...E.r[pid].auth]; }
  for (const P of PROPS) if (P.apt) { const r = E.r[P.id]; if (r) L['apt:' + P.apt] = [r.ownerName.trim().toLowerCase(), ...(r.auth || [])]; else if (aptNpc(P)) L['apt:' + P.apt] = []; }   /* apartamentos: do morador (ou do morador NPC) */
  return L; }
// morador NPC dos apartamentos vagos (a suíte fica vaga); paga o aluguel ao dono do dojô e se muda quando um jogador aluga
const APT_NPC_NAMES = ['Seu Hideo, o relojoeiro', 'Dona Yumi, a costureira', 'Seu Kenji, o escriba', 'Dona Aiko, a florista'];
function aptNpc(P) { if (!P || !P.apt || P.suite) return null; const E = estateLoad(); if (E.r[P.id]) return null; const k = APTS.findIndex(a => a.key === P.apt); return APT_NPC_NAMES[k % APT_NPC_NAMES.length]; }
function aptPayOwner(v, why) { const D = dojoRec(); if (!D || !D.r || !v) return; const BK = bankLoad(), A = BK.acc[D.r.owner] || (BK.acc[D.r.owner] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += v; bankSave(); if (D.B && why) bizLog(D.B, why); }
function aptNpcDay() { for (const P of PROPS) { const nm = P.apt && aptNpc(P); if (nm) aptPayOwner(P.rent, nm.split(',')[0] + ' pagou ' + P.rent + ' de aluguel do ' + P.name.split(' ·')[0] + '.'); } }
function tenantsOf(P) { const E = S.estate; if (!P || !P.tenants || !P.tenants.length) return []; if (E && E.gone && E.gone[P.id]) return []; return P.tenants; }
function estatePublic() { const E = estateLoad(), st = {}; for (const pid in E.r) st[pid] = (E.r[pid].mode === 'own' ? '★' : '') + E.r[pid].ownerName; return st; }
const estTen = () => { const E = estateLoad(); return { gone: E.gone || {}, evict: E.evict || {} }; };
function recsOf(p) { const E = estateLoad(), k = estOwner(p); return Object.keys(E.r).filter(pid => E.r[pid].owner === k); }
function rentalOf(p) { return recsOf(p).find(pid => PROPS_BY[pid].kind === 'house' && !tenantsOf(PROPS_BY[pid]).length) || null; }
function bizOf(p) { return recsOf(p).filter(pid => PROPS_BY[pid].kind !== 'house' || tenantsOf(PROPS_BY[pid]).length); }
function bizSummary(r, P) { if (!r.biz) return null; const B = r.biz, st = P.kind === 'shop' ? B.stock : B.store, n = Object.values(st).reduce((a, b) => a + b, 0); return { closed: !!B.closed, n: Math.floor(n), cap: P.kind === 'shop' ? shopCap(B) : WS_CAP, rev: Math.round(B.today.rev), week: B.hist.reduce((a, d) => a + d.rev + (d.xfer || 0) - d.cost, 0) + Math.round(B.today.rev + (B.today.xfer || 0) - B.today.cost), orders: (B.orders || []).reduce((a, o) => a + (o.raw ? 0 : o.q), 0) }; }
function recInfo(pid) { const r = S.estate.r[pid], P = PROPS_BY[pid]; return { pid, sum: bizSummary(r, P), ten: tenantsOf(P), ev: ((S.estate.evict || {})[pid] || {}).day || 0, mode: r.mode || 'rent', paid: r.paid, day: estDay(), next: (r.paid + RENT_DAYS) * ESTATE_DAY_MS - gameNow()   /* o relógio do reino (não o do computador) */, due: (r.mode === 'own' ? 1 : P.rent) * RENT_DAYS, box: r.box || 0, evict: r.evict || 0, auth: r.auth, dep: r.dep, chest: P.kind === 'house' ? r.chest : undefined, cofre: r.biz ? Math.floor(r.biz.cofre) : undefined, sellv: r.biz ? bizSellValue(r, P) : undefined, upv: r.biz ? upInvest(r.biz) : undefined }; }
function estateMine(p) { const h = rentalOf(p); return h ? recInfo(h) : null; }
function estateSend(p) { Net.toOne(p.id, { t: 'estate', rs: Object.fromEntries(Object.entries(estateLoad().resale || {}).map(([k, v]) => [k, v.extra || 0])), st: estatePublic(), L: S.estateL || {}, ten: estTen(), mine: estateMine(p), biz: bizOf(p).map(recInfo), cour: courierJobs(estOwner(p)), bank: Math.floor(bankAcc(p).g) }); }
function estateChanged() { S.estateL = estateLocks(); estateSave(); Net.toAll({ t: 'estate', st: estatePublic(), L: S.estateL, ten: estTen() }); for (const q of Object.values(S.players)) { if (q.estOpen) estateSend(q); if (q.bizOpen) bizSend(q); } }
function estChestSpot(P) { return CHESTS.find(c => c.bi === P.bi) || BEDS.find(b => b.bi === P.bi) || null; }
function estHomeSpot(P) {   // tile livre dentro da casa mais perto da cama (ou do baú)
  const b = BUILDINGS[P.bi], ref = BEDS.find(q => q.bi === P.bi) || estChestSpot(P); let best = null, bd = 1e9;
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { if (WORLD.bld[tileAt(x, y)] !== P.bi || !canStand(x, y, 0, 0.2)) continue; const d = ref ? dist(x, y, ref.x, ref.y) : 0; if (d < bd) { bd = d; best = { x, y }; } }
  if (best) return best; const [dx, dy] = doorTile(b); return { x: dx, y: dy };
}
function estGive(p, items) {   // devolve itens; o que não cabe fica guardado no corretor
  const left = {};
  for (const k in items) { if (!LOOT[k] || !(items[k] > 0)) continue; if (p.inv[k] || Object.keys(p.inv).length < INV_SLOTS) p.inv[k] = (p.inv[k] || 0) + items[k]; else left[k] = items[k]; }
  return left;
}
function ownerOnline(r) { return Object.values(S.players).find(o => estOwner(o) === r.owner) || null; }
// vende o negócio de volta à cidade pelo que foi investido; as melhorias ficam no imóvel e quem comprar depois paga por elas
function bizSellBack(p, pid) {
  const E = estateLoad(), r = E.r[pid], PP = PROPS_BY[pid]; if (!r || !r.biz || r.owner !== estOwner(p)) return;
  const v = bizSellValue(r, PP), ex = upInvest(r.biz);
  if (ex > 0) { E.resale = E.resale || {}; E.resale[pid] = { up: { ...r.biz.up }, extra: ex }; }
  if (E.offers && E.offers[pid]) offerClose(PP, false, 'O dono vendeu ' + PP.name + ' à cidade. Sua oferta foi cancelada e o dinheiro voltou para o banco.');
  estateEnd(pid, 'Você vendeu ' + PP.name + ' por ' + v + ' de ouro (' + (r.mode === 'own' ? 'o que pagou' : 'a caução') + (ex ? ' + ' + ex + ' das melhorias, que ficam no negócio para o próximo dono' : '') + ').', v);
}
function estateEnd(pid, why, refund = 0) {
  const E = estateLoad(), r = E.r[pid]; if (!r) return; delete E.r[pid];
  const q = ownerOnline(r), gold = refund + (r.biz && !r.biz._vc ? Math.floor(r.biz.cofre) : 0);   // o lucro já está no banco
  for (const s of (r.biz && r.biz.staff) || []) if (S.npcs && S.npcs[s.id]) visGone(S.npcs[s.id]);
  if (q) { q.gold += gold; const left = estGive(q, r.chest || {}); if (Object.keys(left).length) E.lost[r.owner] = Object.assign(E.lost[r.owner] || {}, left); if (why) tell(q, why); sendStat(q); }
  else { if (Object.keys(r.chest || {}).length) E.lost[r.owner] = Object.assign(E.lost[r.owner] || {}, r.chest); if (gold) E.lost[r.owner] = Object.assign(E.lost[r.owner] || {}, { _gold: ((E.lost[r.owner] || {})._gold || 0) + gold }); }
  estateChanged();
}
function estateJoin(np) {
  const E = estateLoad(), k = estOwner(np);
  if (E.lost[k]) { const L = E.lost[k], g = L._gold || 0; delete L._gold; np.gold += g; const left = estGive(np, L); if (Object.keys(left).length) E.lost[k] = left; else delete E.lost[k]; estateSave(); setTimeout(() => { if (S.players[np.id]) tell(np, 'O corretor devolveu o que era seu' + (g ? ' (' + g + ' de ouro)' : '') + '.'); }, 2500); }
  const pid = rentalOf(np); if (pid && !PROPS_BY[pid].apt) { const s = estHomeSpot(PROPS_BY[pid]); np.x = s.x; np.y = s.y; }
  else { const k = hotelRoomOf(np); if (k >= 0) { const R = hotelRooms()[k]; const sp = HOTEL_CABS[k] && HOTEL_CABS[k].spot; if (sp) { np.x = sp[0]; np.y = sp[1]; } else { np.x = R.bed.x + 0.6; np.y = R.bed.y + 1.0; } setTimeout(() => { if (S.players[np.id]) tell(np, 'Você acorda na sua cabine da Pousada do Javali Magro.'); }, 1300); } }
  for (const b of bizOf(np)) E.r[b].seen = Date.now();
  setTimeout(() => { if (!S.players[np.id] || !E.offers) return; const k2 = estOwner(np); for (const pid in E.offers) { const O = E.offers[pid], r = E.r[pid]; if (!r) { offerClose(PROPS_BY[pid], false); continue; } if ((r.owner === k2 && !O.counter) || (O.from === k2 && O.counter)) offerNotify(np, pid); } }, 2500);
  setTimeout(() => { if (S.players[np.id]) { estateSend(np); if (pid) tell(np, 'Você acorda em casa: ' + PROPS_BY[pid].name + ' (' + PROPS_BY[pid].district + ').'); } }, 1200);
}
function offerNotify(q, pid) { const O = ((S.estate || {}).offers || {})[pid], P = PROPS_BY[pid], r = S.estate.r[pid]; if (!O || !P || !r) return; Net.toOne(q.id, { t: 'offer', pid, name: P.name, v: O.v, counter: O.counter || 0, from: O.fromName, owner: r.ownerName, mine: r.owner === estOwner(q) }); }
function offerClose(P, ok, why) {
  const E = S.estate, O = E.offers[P.id], r = E.r[P.id]; delete E.offers[P.id]; if (!O) return; const buyer = Object.values(S.players).find(q => estOwner(q) === O.from), seller = r && ownerOnline(r);
  if (ok && r) { const A = bankLoad().acc[r.owner] || (bankLoad().acc[r.owner] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += O.v; bankSave(); const oldName = r.ownerName;
    r.owner = O.from; r.ownerName = O.fromName; r.mode = 'own'; r.paid = estDay(); r.auth = []; if (r.biz) bizLog(r.biz, O.fromName + ' comprou o negócio de ' + oldName + ' por ' + O.v + ' de ouro.');
    if (seller) info(seller, 'Você vendeu ' + P.name + ' a ' + O.fromName + ' por ' + O.v + ' de ouro (no seu banco).'); if (buyer) info(buyer, P.name + ' agora é seu! (' + O.v + ' de ouro)'); estateChanged(); }
  else { const A = bankLoad().acc[O.from] || (bankLoad().acc[O.from] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += O.v; bankSave(); if (buyer && why) info(buyer, why); else if (seller && why && !buyer) {} }
  estateSave();
}
function nearBroker(p) { const n = S.npcs && S.npcs.broker; return !!n && !n.dead && !n.downed && dist(p.x, p.y, n.x, n.y) < 4.5; }
function nearPropDoor(p, P) { const [dx, dy] = doorTile(BUILDINGS[P.bi]); return dist(p.x, p.y, dx, dy) < 3.4 || WORLD.bld[tileAt(p.x, p.y)] === P.bi; }
function bizRecipes(B, W) { if (!W || !W.recipes) return []; if (B.recipeUser && W.recipes[B.recipe]) return [B.recipe]; return Object.keys(W.recipes).sort((a, b) => (B.store[a] || 0) - (B.store[b] || 0)); }   /* receitas que a oficina faz agora */
function bizInit(P) {
  if (P.kind === 'hotel') return { cofre: 0, up: { safe: 0 }, hist: [], today: { rev: 0, sold: 0, cost: 0 }, closed: false, log: [], store: {} };
  if (P.kind === 'shop') return { cofre: 0, stock: {}, margin: Object.fromEntries((SHOP_GOODS[P.shopType] || []).map(g => [g, 1])), up: { shelf: 0, vitrine: 0, safe: 0 }, orders: [], hist: [], today: { rev: 0, sold: 0, cost: 0 }, closed: false, frac: 0, log: [] };
  const W = WORKS[P.wk] || {}; return { cofre: 0, store: {}, recipe: W.recipes ? Object.keys(W.recipes)[0] : null, autobuy: true, sell: true, up: { tools: 0, safe: 0 }, hist: [], today: { rev: 0, sold: 0, cost: 0 }, closed: false, frac: {}, log: [] };
}
function debit(key, q, amt, B) {   // banco → cofre do negócio (sem negócio: cofres dos negócios do dono) → bolsa
  const A = key && bankLoad().acc[key], Bs = (B ? [B] : key ? Object.values(estateLoad().r).filter(r => r.owner === key && r.biz).map(r => r.biz) : []).filter(b => !b._vc);
  const bk = A ? Math.max(0, Math.floor(A.g)) : 0, cf = Bs.reduce((s, b) => s + Math.max(0, Math.floor(b.cofre)), 0), gd = q ? Math.max(0, Math.floor(q.gold)) : 0;
  if (bk + cf + gd < amt) return null;
  let left = amt; const r = { bank: Math.min(left, bk) }; left -= r.bank; r.cofre = Math.min(left, cf); left -= r.cofre; r.gold = left;
  if (r.bank) { A.g -= r.bank; bankSave(); } let c = r.cofre; for (const b of Bs) { const t = Math.min(c, Math.max(0, Math.floor(b.cofre))); b.cofre -= t; c -= t; } if (r.gold) q.gold -= r.gold; return r;
}
const debitTxt = r => [r.bank && r.bank + ' do banco', r.cofre && r.cofre + ' do cofre', r.gold && r.gold + ' da bolsa'].filter(Boolean).join(', ');
// o "cofre" de cada negócio é a conta do dono no banco: vendas entram direto nela e as despesas saem dela
let BANK_SOON = 0;
function bankSaveSoon() { if (BANK_SOON) return; BANK_SOON = setTimeout(() => { BANK_SOON = 0; bankSave(); }, 1500); }
function bizLinkBank(r) {
  if (!r || !r.biz || r.biz._vc || !r.owner) return; const B = r.biz, old = Math.max(0, +B.cofre || 0); delete B.cofre;
  const acc = () => { const BK = bankLoad(); return BK.acc[r.owner] || (BK.acc[r.owner] = { g: 0, loan: 0, due: 0, wk: estDay() }); };
  if (old > 0) { acc().g += old; bankSaveSoon(); }   // saves antigos: o que estava no cofre vai para o banco
  Object.defineProperty(B, 'cofre', { get: () => acc().g, set: v => { acc().g = v; bankSaveSoon(); }, enumerable: false, configurable: true });
  Object.defineProperty(B, '_vc', { value: true, enumerable: false, configurable: true });
}
// funcionários contratados: até 3 por negócio
const STAFF_MAX = 3, STAFF_TR = { fast: { n: 'rápido', d: '+15% a mais de produção/vendas' }, nice: { n: 'simpático', d: 'clientes compram mais' }, honest: { n: 'honesto', d: 'metade do roubo à noite' } };
const staffMul = B => { const s = B.staff || []; return 1 + 0.4 * s.length + 0.15 * s.filter(q => q.tr === 'fast').length + 0.1 * s.filter(q => q.tr === 'nice').length; };
function staffCands() { const out = []; for (let k = 0; k < 3; k++) { const g = Math.random() < 0.5 ? 'f' : 'm', tr = ['fast', 'nice', 'honest'][Math.floor(Math.random() * 3)]; out.push({ n: VIS_NAMES[g][Math.floor(Math.random() * VIS_NAMES[g].length)], g, tr, w: 5 + (tr === 'fast' ? 2 : 1) + Math.floor(Math.random() * 3), kind: g === 'f' ? pick(['v_peasf', 'v_house1', 'v_house3']) : pick(['v_peasm', 'v_trav1']) }); } return out; }
const BLD_FREE = {};
function bldFreeTiles(bi) { if (BLD_FREE[bi]) return BLD_FREE[bi]; const b = BUILDINGS[bi], out = []; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (WORLD.bld[y * MAP_W + x] === bi && !WORLD.stair[y * MAP_W + x] && walkableTile(x, y, 0)) out.push([x, y]); return (BLD_FREE[bi] = out); }
function staffSync(pid, r) {   // de dia os funcionários estão no negócio; à noite vão embora
  if (!S.npcs) return;
  if (COLL_TOOL[(PROPS_BY[pid] || {}).wk]) return;   // nas oficinas que extraem, os contratados são coletores (collectorSync)
  const P = PROPS_BY[pid], B = r.biz, hr = resHour(), day = hr >= 7 && hr < 20, want = day ? (B.staff || []) : [];
  for (const id of Object.keys(S.npcs || {})) { const n = S.npcs[id]; if (n.bizWorker === pid && !want.some(s => s.id === id)) { n.goingHome = true; n.walkTo = null; } }
  for (const s of want) { if (S.npcs[s.id]) { S.npcs[s.id].goingHome = false; continue; } const T = bldFreeTiles(P.bi); if (!T.length) continue; const [x, y] = T[Math.floor(Math.random() * T.length)], home = staffHome(s.id);
    const n = { id: s.id, kind: s.kind, name: s.n + ', ' + (P.kind === 'shop' ? 'balconista' : 'ajudante'), transient: true, bizWorker: pid, bi: P.bi, x: home[0], y: home[1], z: 0, postX: x, postY: y, home: null, homeAt: home, hp: 60, maxHp: 60, downed: null, dead: false, wt: 0, walkTo: [x, y] };
    S.npcs[s.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
}
function staffHome(id) {   // cada funcionário mora numa casa da cidade (sempre a mesma)
  const H = PROPS.filter(P => P.kind === 'house' && P.district !== 'Vila do Oeste' && !BUILDINGS[P.bi].extra); if (!H.length) return [CENTER, CENTER + 12];
  const h = [...String(id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0, P = H[h % H.length], b = BUILDINGS[P.bi], [dx, dy] = doorTile(b), v = DOOR_V[b.door || 'S']; return [dx + v[0] * 1.2, dy + v[1] * 1.2];
}
function workerTick(n, now, dt) {
  if (!n.goingHome && BUILDINGS[n.bi] && BUILDINGS[n.bi].kind === 'dojo' && !n.walkTo0 && WORLD.bld[tileAt(n.x, n.y)] === n.bi) { dojoWorkerTick(n, now, dt); return; }   /* já dentro do dojô */
  if (n.goingHome) { if (npcWalk(n, n.homeAt[0], n.homeAt[1], 1.0, dt) || dist(n.x, n.y, n.homeAt[0], n.homeAt[1]) < 0.8) visGone(n); return; }   // volta para casa e some porta adentro
  if (n.walkTo) { if (npcWalk(n, n.walkTo[0], n.walkTo[1], 0.7, dt)) { n.walkTo = null; n.wt = now + 5000 + Math.random() * 9000; n.act = 'work'; } return; }
  if (now > n.wt) { const T = bldFreeTiles(n.bi); if (T.length) { const t = T[Math.floor(Math.random() * T.length)]; n.walkTo = [t[0], t[1]]; n.act = null; } else n.wt = now + 8000; }
}
// ---------- coletores das oficinas que extraem: saem, coletam de verdade (a árvore cai, a pedra quebra) e enchem o depósito ----------
const COLL_TOOL = { saw: 'axe', mine: 'pickaxe', farm: 'sickle', wheat: 'sickle' }, COLL_ANIM = { axe: 'chop', pickaxe: 'pickswing', sickle: 'reap' };
const COLL_BASE = { wheat: ['Lino, o ceifeiro', 'v_peasm'], saw: ['Elias, o lenhador', 'v_peasm'], mine: ['Rufo, o mineiro', 'v_peasm'], farm: ['Dora, a colhedora', 'v_peasf'] };
function collectorSync(now) {
  if (now - (S.collT || 0) < 2000) return; S.collT = now; const hr = resHour(), day = hr >= 7 && hr < 19;
  for (const P of PROPS) { if (P.kind !== 'workshop' || !COLL_TOOL[P.wk]) continue; const r = S.estate && S.estate.r[P.id];
    const want = !day ? [] : [{ id: 'col_' + P.id, n: COLL_BASE[P.wk][0], kind: COLL_BASE[P.wk][1] }, ...((r && r.biz && r.biz.staff) || []).slice(0, 2).map(s => ({ id: s.id, n: s.n + ', ' + (P.wk === 'saw' ? 'lenhador' : P.wk === 'mine' ? 'mineiro' : 'colhedor' + (s.g === 'f' ? 'a' : '')), kind: s.kind }))];
    for (const n of Object.values(S.npcs)) if (n.collector === P.id && !want.some(w => w.id === n.id)) n.leavingC = true;
    for (const w of want) { if (S.npcs[w.id]) { S.npcs[w.id].leavingC = false; continue; } const [x, y] = bizDoorOut(P);
      const n = { id: w.id, kind: w.kind, name: w.n, transient: true, collector: P.id, x, y, z: 0, postX: x, postY: y, hp: 70, maxHp: 70, downed: null, dead: false, carry: 0, load: {} };
      S.npcs[w.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); } }
}
function collFind(n, P, tool) {
  const [dx, dy] = bizDoorOut(P), R = 24; let best = null, bd = 1e9; S.collRes = S.collRes || {};
  for (let y = Math.round(dy) - R; y <= Math.round(dy) + R; y++) for (let x = Math.round(dx) - R; x <= Math.round(dx) + R; x++) {
    if (!inBounds(x, y)) continue; const i = y * MAP_W + x, G0 = gatherOf(WORLD.obj[i]); if (!G0 || G0.tool !== tool || WORLD.bld[i] >= 0 || (S.collRes[i] && S.collRes[i] !== n.id) || (P.wk === 'wheat') !== (WORLD.obj[i] === O.WHEAT)) continue;
    const d = dist(x, y, dx, dy); if (d >= bd) continue;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (walkableTile(x + ax, y + ay, 0)) { bd = d; best = { i, sp: [x + ax * 0.95, y + ay * 0.95] }; break; } }
  return best;
}
function collHit(n, P) {   // um golpe no recurso: devolve o que rendeu
  const i = n.ci, o = WORLD.obj[i], x = i % MAP_W, y = (i - x) / MAP_W, now = now_(); let g = null, q = 2;
  if (P.wk === 'wheat') { setObj(i, O.WHEATSPROUT); (S.objBack = S.objBack || []).push({ i, o, at: now + 150000 }); g = Math.random() < 0.15 ? 'fruit' : 'wheat'; }
  else if (P.wk === 'farm') { setObj(i, O.NONE); (S.objBack = S.objBack || []).push({ i, o, at: now + 120000 }); g = Math.random() < 0.66 ? 'herb' : 'flax'; }
  else { S.nodeHits = S.nodeHits || {}; const hits = (S.nodeHits[i] || 0) + 1, max = o === O.OAK || o === O.BOULDER ? 4 : 3, tree = P.wk === 'saw';
    if (hits >= max) { delete S.nodeHits[i]; near(x, y, { t: tree ? 'tfall' : 'crumble', i, o, a: Math.atan2(y - n.y, x - n.x) }); setObj(i, tree ? O.STUMP : O.NONE); (S.objBack = S.objBack || []).push({ i, o, at: now + (tree ? 300000 : 240000) }); } else S.nodeHits[i] = hits;
    if (tree) { g = 'wood'; if (o === O.OAK) q = 3; } else { const Bt = S.estate && S.estate.r[P.id] && S.estate.r[P.id].biz; g = Math.random() < 0.25 + 0.05 * ((Bt && Bt.up.tools) || 0) ? 'crystal' : 'ore'; } }   // cristal: 25% (+5% por nível de ferramentas)
  n.load[g] = (n.load[g] || 0) + q; n.carry += q; return q;
}
function collectorTick(n, now, dt) {
  const P = PROPS_BY[n.collector]; if (!P) { visGone(n); return; } const tool = COLL_TOOL[P.wk], door = bizDoorOut(P), r = S.estate && S.estate.r[P.id], B = r && r.biz;
  const release = () => { if (S.collRes && S.collRes[n.ci] === n.id) delete S.collRes[n.ci]; };
  if (n.leavingC && n.cst !== 'back') { release(); if (npcWalk(n, door[0], door[1], 1.0, dt) || dist(n.x, n.y, door[0], door[1]) < 0.9) visGone(n); return; }
  if (n.cst === 'back') {
    if (npcWalk(n, door[0], door[1], 1.0, dt) || dist(n.x, n.y, door[0], door[1]) < 0.9) {
      if (B) { const txt = []; for (const g in n.load) { const room = Math.max(0, WS_CAP - stockSum(B.store)), v = Math.min(room, n.load[g]); if (v > 0) { B.store[g] = (B.store[g] || 0) + v; txt.push(v + ' ' + GOODS[g].n); } } if (txt.length) bizLog(B, n.name.split(',')[0] + ' trouxe ' + txt.join(', ') + '.'); }
      near(n.x, n.y, { t: 'tfx', k: 'ok', id: n.id }); n.load = {}; n.carry = 0; n.cst = null; n.job = null; n.wt = now + 2500;
    } return; }
  if (n.cst === 'work') {
    const G0 = gatherOf(WORLD.obj[n.ci]); if (!G0 || G0.tool !== tool) { release(); n.cst = n.carry > 0 ? 'back' : null; if (n.cst) n.job = { st: 'levando' }; return; }
    n.dir = dirFromVecS((n.ci % MAP_W) - n.x, Math.floor(n.ci / MAP_W) - n.y);
    if (now > (n.animT || 0)) { n.animT = now + 760; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: COLL_ANIM[tool], ms: 750, tool, i: n.ci }); }
    if (now >= n.hitAt) { collHit(n, P); n.hitAt = now + 4200 / (1 + 0.5 * ((B && B.up.tools) || 0)); if (n.carry >= 8 || !gatherOf(WORLD.obj[n.ci])) { release(); n.cst = n.carry >= 8 ? 'back' : null; if (n.cst) n.job = { st: 'levando' }; } }
    return; }
  if (n.cst === 'walk') { const G0 = gatherOf(WORLD.obj[n.ci]); if (!G0) { release(); n.cst = null; return; }
    if (npcWalk(n, n.sp[0], n.sp[1], 0.95, dt) || dist(n.x, n.y, n.sp[0], n.sp[1]) < 0.5) { n.cst = 'work'; n.hitAt = now + 4200; } return; }
  if (now < (n.wt || 0)) return;
  const t = collFind(n, P, tool); if (!t) { if (n.carry > 0) { n.cst = 'back'; n.job = { st: 'levando' }; } else n.wt = now + 8000; return; }
  n.ci = t.i; n.sp = t.sp; S.collRes[t.i] = n.id; n.cst = 'walk';
}
// negócio de jogador onde um NPC trabalha (forja do Hrodgar, taverna do Brom…): o dinheiro do balcão vai para o dono
function npcBiz(n) { if (!n || !S.estate) return null; const bi = n.bi != null ? n.bi : WORLD.bld[tileAt(n.postX ?? n.x, n.postY ?? n.y)]; if (bi == null || bi < 0) return null; const P = PROPS.find(q => q.bi === bi), r = P && S.estate.r[P.id]; return r && r.biz ? r : null; }
const SELL_K = 0.85;
function recipeGain(rk) { const W = Object.values(WORKS).find(w => w.recipes && w.recipes[rk]); if (!W) return 0; const rec = W.recipes[rk]; let c = 0; for (const g in rec) c += GOODS[g].p * 1.2 * rec[g]; return (rk === 'serve' ? 5 : GOODS[rk].p * SELL_K) - c; }
const canPay = (p, amt) => Math.floor((bankLoad().acc[estOwner(p)] || { g: 0 }).g) + Math.floor(p.gold || 0) >= amt;
const payCity = (p, amt) => !!debit(estOwner(p), p, amt);
// preço de compra de um imóvel: negócio de NPC custa 50% a mais (o NPC continua trabalhando); Honrado paga 10% menos
const buyPrice = (P, p) => Math.round(P.buy * (P.npc ? 1.5 : 1) * (p && repOf(p) >= 75 ? 0.9 : 1));
// quanto já foi gasto em melhorias neste negócio (soma dos níveis comprados)
const upInvest = B => { let t = 0; for (const k in (B && B.up) || {}) { const U = BIZ_UP[k]; if (U) for (let i = 0; i < Math.min(3, B.up[k] | 0); i++) t += U.cost[i]; } return t; };
const resaleExtra = pid => { const R = (estateLoad().resale || {})[pid]; return R ? R.extra || 0 : 0; };
// valor de venda: o que pagou (ou a caução, se alugado) + as melhorias
const bizSellValue = (r, P) => (r.mode === 'own' ? (r.price != null ? r.price : buyPrice(P)) : (r.dep || 0)) + upInvest(r.biz);
function bizLog(B, t) { B.log.unshift({ t, at: Date.now() }); if (B.log.length > 12) B.log.length = 12; }
function canAcquire(p, P, how) {
  if (P.kind === 'house' && tenantsOf(P).length) { if (how !== 'buy') return 'Essa casa tem inquilino: dá para comprar (e receber o aluguel), não para alugar.'; if (bizOf(p).length >= BIZ_MAX) return 'No máximo ' + BIZ_MAX + ' negócios/investimentos por personagem.'; return null; }
  if (P.kind === 'house') { if (rentalOf(p)) return 'Você já tem uma casa. Devolva ou venda antes.'; return null; }
  if (P.kind === 'bank') { if (how !== 'buy') return 'O banco não se aluga: só se compra.'; if (repOf(p) < (P.repMin || 70)) return 'O Conselho só vende o banco a quem tem reputação ' + (P.repMin || 70) + ' ou mais (a sua: ' + repOf(p) + ').'; if (bizOf(p).length >= bizMax(p)) return 'Limite de negócios para a sua reputação.'; return null; }
  if (!isBizProp(P)) return 'Esse ponto tem dono e não está à venda.';
  if (how === 'rent') return (P.npcOwner || 'O dono') + ' não aluga: vende o ponto por ' + P.buy + ' de ouro.';
  // sem limite de negócios por jogador
  return null;
}
function estateMsg(p, m) {
  const E = estateLoad(), P = PROPS_BY[m.pid];
  switch (m.a) {
    case 'open': p.estOpen = true; estateSend(p); return;
    case 'payrent': { const r = E.r[m.pid]; if (!r || r.owner !== estOwner(p) || !P) return; const due = (r.mode === 'own' ? 1 : P.rent) * RENT_DAYS; let paid = 0; while (estDay() - r.paid >= RENT_DAYS) { if (!debit(r.owner, p, due, r.biz)) break; r.paid += RENT_DAYS; paid++; }
      if (paid) { r.warned = 0; sendStat(p); tell(p, 'Pago: ' + (due * paid) + ' de ouro de ' + (r.mode === 'own' ? 'imposto' : 'aluguel') + ' de ' + P.name + '.'); estateSave(); } else tell(p, estDay() - r.paid >= RENT_DAYS ? 'Faltam ' + due + ' de ouro no banco ou na bolsa.' : 'Está tudo em dia.'); estateSend(p); return; }
    case 'close': p.estOpen = false; return;
    case 'rent': case 'buy': {
      if (!P) return; const mine = E.r[P.id] && E.r[P.id].owner === estOwner(p);
      if (E.r[P.id] && !(mine && m.a === 'buy' && E.r[P.id].mode !== 'own')) { tell(p, 'Esse imóvel já tem dono.'); return; }
      // compra e aluguel valem de qualquer lugar (painel da imobiliária, menu de negócios ou o Mestre Anselmo)
      if (!mine) { const why = canAcquire(p, P, m.a); if (why) { tell(p, why); return; } }
      const RS = !mine && P.kind !== 'house' ? (E.resale || {})[P.id] : null;   // melhorias deixadas pelo dono anterior: quem compra paga por elas também
      const cost = m.a === 'buy' ? buyPrice(P, p) + (RS ? RS.extra || 0 : 0) - (mine ? E.r[P.id].dep || 0 : 0) : P.rent * (RENT_DAYS + 2);   // 1ª semana + caução de 2 dias
      if (!debit(estOwner(p), p, cost)) { tell(p, 'Você precisa de ' + cost + ' de ouro (banco + bolsa).'); return; }   // paga com o banco e completa com a bolsa
      if (P.apt) { const nm = aptNpc(P); aptPayOwner(cost, p.name + (m.a === 'buy' ? ' comprou o ' : ' alugou o ') + P.name.split(' ·')[0] + ' (' + cost + ').'); if (nm) tell(p, nm.split(',')[0] + ' arrumou as malas e se mudou: o ' + P.name.split(' ·')[0] + ' é seu.'); }
      if (mine) { const r = E.r[P.id]; r.mode = 'own'; r.price = cost + (r.dep || 0); r.dep = 0; r.paid = estDay(); tell(p, 'Escritura assinada: ' + P.name + ' agora é sua para sempre (imposto de 1 ouro por dia).'); }
      else { E.r[P.id] = { owner: estOwner(p), ownerName: p.name, mode: m.a === 'buy' ? 'own' : 'rent', paid: estDay(), auth: [], chest: {}, dep: m.a === 'buy' ? 0 : P.rent * 2, since: Date.now(), seen: Date.now(), price: m.a === 'buy' ? cost - (RS ? RS.extra || 0 : 0) : undefined };   // as melhorias contam à parte (upInvest)
        if (P.kind !== 'house') { E.r[P.id].biz = bizInit(P); bizLinkBank(E.r[P.id]); bizLog(E.r[P.id].biz, 'O lucro cai direto na sua conta do banco, e os salários e a reposição saem dela. Mantenha ouro no banco.');
          if (RS) { const B = E.r[P.id].biz; B.up = Object.assign(B.up || {}, RS.up || {}); delete E.resale[P.id]; bizLog(B, 'As melhorias do dono anterior continuam aqui (' + Object.keys(RS.up || {}).filter(k => RS.up[k] > 0 && BIZ_UP[k]).map(k => BIZ_UP[k].n + ' ' + RS.up[k]).join(', ') + ').'); } }
        tell(p, (m.a === 'buy' ? 'Escritura assinada! ' + P.name + ' é sua (imposto de 7 ouro por semana).' : 'Contrato assinado! ' + P.name + ' (' + P.district + '). Aluguel: ' + P.week + ' de ouro por semana, debitado sozinho.') + (P.kind !== 'house' ? ' Abra a gestão para abastecer e melhorar.' : '')); }
      sendStat(p); estateChanged(); return;
    }
    case 'offer': {   // oferecer um valor pelo negócio de outro jogador
      const r = E.r[P && P.id]; if (!P || !r || P.kind === 'house' && !r.biz) { tell(p, 'Só dá para fazer oferta por negócios de outros jogadores.'); return; } if (r.owner === estOwner(p)) return;
      const v = Math.floor(+m.v || 0); if (v < 1) return; E.offers = E.offers || {}; const old = E.offers[P.id]; if (old && old.from === estOwner(p)) { tell(p, 'Você já tem uma oferta por ' + P.name + ' esperando resposta.'); return; }
      if (old) { tell(p, 'Já existe outra oferta por ' + P.name + ' esperando resposta. Tente mais tarde.'); return; }
      if (!payCity(p, v)) { tell(p, 'Você precisa de ' + v + ' de ouro (banco + bolsa) para oferecer.'); return; }
      E.offers[P.id] = { from: estOwner(p), fromName: p.name, v, day: estDay() }; estateSave(); info(p, 'Oferta de ' + v + ' de ouro por ' + P.name + ' enviada a ' + r.ownerName + '. O dinheiro fica reservado até a resposta (1 dia do jogo).');
      const o = ownerOnline(r); if (o) offerNotify(o, P.id); sendStat(p); return;
    }
    case 'offerans': {   // dono responde: aceitar, recusar ou contrapropor; quem ofereceu responde à contraproposta
      E.offers = E.offers || {}; const O = E.offers[P && P.id], r = E.r[P && P.id]; if (!O || !r) return; const me = estOwner(p);
      if (r.owner === me && !O.counter) {
        if (m.ans === 'yes') offerClose(P, true); else if (m.ans === 'counter' && +m.v > O.v) { O.counter = Math.floor(+m.v); estateSave(); info(p, 'Contraproposta de ' + O.counter + ' enviada a ' + O.fromName + '.'); const b = Object.values(S.players).find(q => estOwner(q) === O.from); if (b) offerNotify(b, P.id); }
        else offerClose(P, false, r.ownerName + ' recusou a sua oferta por ' + P.name + '. O dinheiro voltou para o banco.');
      } else if (O.from === me && O.counter) {
        if (m.ans === 'yes') { const extra = O.counter - O.v; if (!payCity(p, extra)) { tell(p, 'Você precisa de mais ' + extra + ' de ouro.'); return; } O.v = O.counter; offerClose(P, true); }
        else offerClose(P, false, 'Você recusou a contraproposta. O dinheiro voltou para o banco.');
      }
      return;
    }
    case 'leave': {   // devolver (alugado) ou vender de volta à Coroa pela metade (comprado)
      const pid = m.pid && E.r[m.pid] && E.r[m.pid].owner === estOwner(p) ? m.pid : rentalOf(p); if (!pid) return; const r = E.r[pid], PP = PROPS_BY[pid];
      if (r.biz) { bizSellBack(p, pid); return; }   // negócio: devolve tudo o que foi investido
      const refund = r.mode === 'own' ? Math.floor(PP.buy / 2) : (r.dep || 0);
      estateEnd(pid, (r.mode === 'own' ? 'Você vendeu ' + PP.name + ' de volta à Coroa por ' + refund + ' de ouro.' : 'Você devolveu a chave de ' + PP.name + '. A caução de ' + refund + ' de ouro voltou.') + (r.biz ? ' O cofre foi para a sua bolsa.' : ' O baú foi para a sua mochila.'), refund); return;
    }
    case 'auth': case 'unauth': {
      const pid = m.pid && E.r[m.pid] && E.r[m.pid].owner === estOwner(p) ? m.pid : rentalOf(p); if (!pid) return; const r = E.r[pid], nm = String(m.name || '').trim().toLowerCase().slice(0, 16);
      if (!nm || nm === p.name.trim().toLowerCase()) return;
      if (m.a === 'auth') { if (r.auth.includes(nm)) return; if (r.auth.length >= ESTATE_AUTH_MAX) { tell(p, 'No máximo ' + ESTATE_AUTH_MAX + ' pessoas autorizadas.'); return; } r.auth.push(nm); tell(p, nm + ' agora pode entrar em ' + PROPS_BY[pid].name + '.'); }
      else r.auth = r.auth.filter(a => a !== nm);
      estateChanged(); return;
    }
    case 'evict': {   // despejar os inquilinos: aviso de 1 dia do jogo, eles ficam com raiva
      const r = E.r[m.pid], PP = PROPS_BY[m.pid]; if (!r || r.owner !== estOwner(p) || !tenantsOf(PP).length) return;
      E.evict = E.evict || {}; if (E.evict[m.pid]) return; E.evict[m.pid] = { day: estDay() + 1, owner: p.name };
      for (const id of tenantsOf(PP)) { const n = S.npcs && S.npcs[id]; if (n) { memAdd(n, p, 'evict'); n.angryAt = p.name.trim().toLowerCase(); near(n.x, n.y, { t: 'anim', w: 'n', id, a: 'talk', txt: 'Despejo?! Depois de tudo?', ms: 1 }); } }
      repAdd(p, 'cidade', -10, 'despejou inquilinos');
      tell(p, 'Aviso de despejo entregue em ' + PP.name + '. Os inquilinos saem em 1 dia do jogo (12 min) e depois a casa é sua para morar... mas a cidade não gostou: você perde reputação com os moradores e os comerciantes.'); estateChanged(); sendStat(p); return;
    }
    case 'collect': { const r = E.r[m.pid]; if (!r || r.owner !== estOwner(p) || !(r.box > 0)) return; p.gold += r.box; tell(p, 'Você recebeu ' + r.box + ' de ouro de aluguel dos inquilinos.'); r.box = 0; sendStat(p); estateChanged(); return; }
    case 'put': case 'take': {
      const pid = rentalOf(p); if (!pid) { tell(p, 'Você não tem casa.'); return; }
      const PP = PROPS_BY[pid], r = E.r[pid], k = String(m.k || '');
      if (PP.apt) { const c = APT_CHESTS.find(q => q.apt === PP.apt); if (!c || (p.fl || 0) !== c.fl || dist(p.x, p.y, c.x, c.y) > 2.4) { tell(p, 'O tansu fica dentro do seu apartamento.'); return; } }
      else if (WORLD.bld[tileAt(p.x, p.y)] !== PP.bi) { tell(p, 'O baú fica dentro da sua casa.'); return; }
      if (!LOOT[k]) return;
      if (m.a === 'put') { const q = Math.min(p.inv[k] || 0, Math.max(1, m.q | 0)); if (!q) return; if (!r.chest[k] && Object.keys(r.chest).length >= estChestSlots(pid)) { tell(p, 'O baú está cheio (' + estChestSlots(pid) + ' tipos de item).'); return; } p.inv[k] -= q; if (!p.inv[k]) delete p.inv[k]; r.chest[k] = (r.chest[k] || 0) + q; }
      else { const q = Math.min(r.chest[k] || 0, Math.max(1, m.q | 0)); if (!q) return; if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; } r.chest[k] -= q; if (!r.chest[k]) delete r.chest[k]; p.inv[k] = (p.inv[k] || 0) + q; }
      estateSave(); sendStat(p); estateSend(p); return;
    }
  }
}
// ---------- gestão de um negócio (menu) ----------
const shopCap = B => SHOP_CAP + 80 * (B.up.shelf || 0), safeCap = B => SAFE_CAP * (1 + (B.up.safe || 0)), stockSum = o => Object.values(o).reduce((a, b) => a + b, 0);
function atBiz(p, P) { if (WORLD.bld[tileAt(p.x, p.y)] === P.bi) return true; const st = S.npcs && Object.values(S.npcs).find(n => n.bi === P.bi && n.role); return !!st && dist(p.x, p.y, st.x, st.y) < 4; }
function bizSend(p) { const pid = p.bizOpen, r = pid && S.estate && S.estate.r[pid]; if (!r || r.owner !== estOwner(p) || !r.biz) { Net.toOne(p.id, { t: 'biz', pid, none: 1 }); return; } Net.toOne(p.id, { t: 'biz', pid, b: { ...r.biz, cofre: Math.floor(r.biz.cofre) }, staffTr: STAFF_TR, mode: r.mode || 'rent', at: atBiz(p, PROPS_BY[pid]), info: recInfo(pid), cour: courierJobs(r.owner) }); }
function bizMsg(p, m) {
  const E = estateLoad(), pid = String(m.pid || ''), r = E.r[pid], P = PROPS_BY[pid];
  if (m.a === 'counter' || m.a === 'cbuy') { counterMsg(p, m, E, pid); return; }
  if (m.a === 'open') { p.bizOpen = pid; bizSend(p); return; }
  if (m.a === 'close') { p.bizOpen = null; return; }
  if (!r || !r.biz || r.owner !== estOwner(p)) return; const B = r.biz; r.seen = Date.now();
  switch (m.a) {
    case 'order': {   // comprar mercadoria do fornecedor (chega numa carroça em 1 hora do jogo)
      const g = String(m.g), q = clamp(m.q | 0, 1, 100); if (P.kind !== 'shop' || !(SHOP_GOODS[P.shopType] || []).includes(g)) return;
      const room = shopCap(B) - stockSum(B.stock) - B.orders.reduce((a, o) => a + (o.raw ? 0 : o.q), 0), n = Math.min(q, room); if (n <= 0) { tell(p, 'Não cabe mais nada nas prateleiras.'); return; }
      const cost = Math.ceil(GOODS[g].p * n); if (!debit(r.owner, p, cost)) { tell(p, 'Você precisa de ' + cost + ' de ouro (banco + bolsa).'); return; }
      B.orders.push({ g, q: n, at: Date.now() + BIZ_HOUR_MS }); B.today.cost += cost; bizLog(B, 'Encomenda: ' + n + ' ' + GOODS[g].n + ' (' + cost + ' ouro). A carroça chega em 1 hora.'); sendStat(p); break;
    }
    case 'put': {
      if (!atBiz(p, P)) { tell(p, 'Leve até o negócio para guardar.'); return; }
      const k = String(m.k), IG = ITEM_GOOD[k]; if (!IG || !(p.inv[k] > 0)) return; const [g, per] = IG; let n = clamp(m.n | 0, 1, p.inv[k]), put = 0;
      if (P.kind === 'shop') {
        if (g === 'wood' && P.shopType === 'arcane') { B.raw = B.raw || {}; n = Math.min(n, Math.floor((BENCH_CAP - (B.raw.wood || 0)) / per)); if (n <= 0) { tell(p, 'A bancada está cheia de madeira.'); return; } B.raw.wood = (B.raw.wood || 0) + n * per; put = n; bizLog(B, p.name + ' deixou ' + (n * per) + ' de madeira na bancada.'); }
        else if ((SHOP_GOODS[P.shopType] || []).includes(g)) { n = Math.min(n, Math.floor((shopCap(B) - stockSum(B.stock)) / per)); if (n <= 0) { tell(p, 'Não cabe mais nada nas prateleiras.'); return; } B.stock[g] = (B.stock[g] || 0) + n * per; put = n; bizLog(B, p.name + ' pôs ' + (n * per) + ' ' + GOODS[g].n + ' nas prateleiras.'); }
      } else if (P.kind === 'workshop') {
        const W = WORKS[P.wk] || {}, ok = (W.make && g in W.make) || (W.recipes && Object.values(W.recipes).some(r => g in r)) || (W.recipes && g in W.recipes);
        if (ok) { n = Math.min(n, Math.floor((WS_CAP - stockSum(B.store)) / per)); if (n <= 0) { tell(p, 'O depósito está cheio.'); return; } B.store[g] = (B.store[g] || 0) + n * per; put = n; bizLog(B, p.name + ' guardou ' + (n * per) + ' ' + GOODS[g].n + ' no depósito.'); }
      }
      if (!put) { tell(p, 'Este negócio não usa ' + LOOT[k].name.toLowerCase() + '.'); return; }
      p.inv[k] -= put; if (!p.inv[k]) delete p.inv[k]; sendStat(p); break;
    }
    case 'takeg': {   // pegar mercadoria do depósito (oficina) ou das prateleiras (loja) para a mochila
      if (!atBiz(p, P)) { tell(p, 'Para pegar do depósito, venha até o negócio.'); return; }
      const g = String(m.g), it = GOOD_TAKE[g], st = P.kind === 'shop' ? B.stock : B.store; if (!it || !st) { tell(p, 'Isso não dá para levar na mochila.'); return; }
      let n = Math.min(clamp(m.n | 0, 1, 99), Math.floor(st[g] || 0)); if (n <= 0) return;
      if (it === 'pot_hp') p.pots.hp = (p.pots.hp || 0) + n; else { if (!p.inv[it] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; } p.inv[it] = (p.inv[it] || 0) + n; }
      st[g] -= n; if (st[g] <= 0) delete st[g]; bizLog(B, p.name + ' pegou ' + n + ' ' + GOODS[g].n + (P.kind === 'shop' ? ' das prateleiras.' : ' do depósito.')); tell(p, 'Você pegou ' + n + ' ' + GOODS[g].n + '.'); sendStat(p); break;
    }
    case 'rs': { if (P.kind !== 'shop') return; const g = String(m.g); if (!(SHOP_GOODS[P.shopType] || []).includes(g)) return; B.rs = B.rs || {}; const mn = clamp(m.mn | 0, 0, 200), mx = clamp(m.mx | 0, mn + 1, 300); B.rs[g] = [mn, mx]; break; }
    case 'rson': { B.rsOn = !B.rsOn; bizLog(B, B.rsOn ? 'Reposição automática ligada (paga pelo banco).' : 'Reposição automática desligada.'); break; }
    case 'cands': { B.cands = staffCands(); break; }
    case 'hire': { const c = (B.cands || [])[m.i | 0]; B.staff = B.staff || []; if (!c) return; { const mx = COLL_TOOL[P.wk] ? 2 : STAFF_MAX; if (B.staff.length >= mx) { tell(p, COLL_TOOL[P.wk] ? 'No máximo 2 coletores contratados (mais o da casa).' : 'No máximo ' + STAFF_MAX + ' funcionários por negócio.'); return; } }
      B.staff.push({ ...c, id: 'wk_' + pid + '_' + (B.staffN = (B.staffN || 0) + 1) }); B.cands.splice(m.i | 0, 1); bizLog(B, c.n + ' foi contratad' + (c.g === 'f' ? 'a' : 'o') + ' (' + STAFF_TR[c.tr].n + ', ' + c.w + ' ouro/dia).'); staffSync(pid, r); break; }
    case 'fire': { B.staff = B.staff || []; const s = B.staff[m.i | 0]; if (!s) return; B.staff.splice(m.i | 0, 1); bizLog(B, s.n + ' foi dispensad' + (s.g === 'f' ? 'a' : 'o') + '.'); staffSync(pid, r); break; }
    case 'margin': { const g = String(m.g); if (P.kind !== 'shop' || !(g in B.margin)) return; B.margin[g] = clamp(m.v | 0, 0, 2); break; }
    case 'recipe': { const W = WORKS[P.wk]; if (!W || !W.recipes) return; if (m.v === 'all') { B.recipeUser = false; break; } if (!W.recipes[m.v]) return; B.recipe = m.v; B.recipeUser = true; break; }
    case 'fee': { if (P.wk !== 'dojo') return; B.fee = clamp(m.v | 0, 0, 2); bizLog(B, 'Diária: ' + ['barata', 'justa', 'cara'][B.fee] + ' (' + DOJO_FEE[B.fee] + ' ouro).'); break; }
    case 'keep': { if (P.kind !== 'workshop') return; B.keep = m.v == null || m.v === '' ? null : clamp(m.v | 0, 0, 100); break; }
    case 'toggle': { if (P.kind !== 'workshop' || !['autobuy', 'sell'].includes(m.k)) return; B[m.k] = !B[m.k]; break; }
    case 'sell': { bizSellBack(p, pid); return; }   // vender pelo menu de gestão
    case 'up': {
      const k = String(m.k), U = BIZ_UP[k]; if (!U || (U.for !== 'both' && U.for !== P.kind)) return; const lv = B.up[k] || 0; if (lv >= 3) return;
      const cost = U.cost[lv]; if (!debit(r.owner, p, cost)) { tell(p, 'Você precisa de ' + cost + ' de ouro (banco + bolsa).'); return; }
      B.up[k] = lv + 1; bizLog(B, U.n + ' nível ' + (lv + 1) + ' (' + cost + ' ouro).'); sendStat(p); break;
    }
    case 'collect': {   // o cofre do negócio é a sua conta do banco: dá para sacar para a bolsa estando no negócio
      tell(p, 'O lucro fica na sua conta do banco. Para sacar, fale com um banqueiro no Banco de Nae.'); break;   // sacar só no banco
    }
    case 'deposit': {
      if (!nearBanker(p)) { tell(p, 'Para depositar, vá ao Banco de Nae, ou peça a um segurança (F) que leve o dinheiro.'); return; }   /* dinheiro da bolsa só entra no banco em pessoa */
      const g = clamp(m.q | 0, 1, 100000); if (p.gold < g) return; p.gold -= g; B.cofre += g; if (B.closed) { B.closed = false; bizLog(B, 'Conta abastecida: o negócio voltou a funcionar.'); } tell(p, 'Depositado no banco: ' + g + ' de ouro.'); sendStat(p); break;
    }
    default: return;
  }
  estateSave(); bizSend(p);
}
// ---------- balcão: qualquer jogador compra a mercadoria da loja de outro (o ouro vai para o cofre da loja) ----------
const counterPrice = (B, g, mul = 1) => Math.ceil(GOODS[g].p * MARGIN[B.margin[g] ?? 1].k * mul);
function counterMsg(p, m, E, pid) {
  const r = E.r[pid], P = PROPS_BY[pid]; if (!r || !r.biz || !P || P.kind !== 'shop') { Net.toOne(p.id, { t: 'counter', pid, none: 1 }); return; }
  if (!atBiz(p, P)) { tell(p, 'Chegue perto do balcão.'); return; }
  const B = r.biz, own = r.owner === estOwner(p), clerk = Object.values(S.npcs).find(n => n.bi === P.bi && n.role === 'clerk'), mul = own || !clerk ? 1 : opPriceMul(clerk, p);
  if (!own && mul === 0) { Net.toOne(p.id, { t: 'counter', pid, refuse: 1, name: P.name }); return; }
  if (m.a === 'cbuy') {
    const g = String(m.g), have = Math.floor(B.stock[g] || 0), q = Math.min(have, clamp(m.q | 0, 1, 20)), it = GOOD_ITEM[g]; if (!q || !it) return;
    const each = own ? Math.ceil(GOODS[g].p) : counterPrice(B, g, mul), cost = each * q; if (B.closed && !own) { tell(p, 'A loja está fechada (sem salário para o balconista).'); return; }
    if (!canPay(p, cost)) { tell(p, 'Você precisa de ' + cost + ' de ouro.'); return; }
    if (it.loot && !p.inv[it.loot] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; }
    payCity(p, cost); B.stock[g] -= q; if (!B.stock[g]) delete B.stock[g];
    if (it.pot) p.pots[it.pot] = (p.pots[it.pot] || 0) + q; else p.inv[it.loot] = (p.inv[it.loot] || 0) + q;
    if (own) { B.cofre += cost; bizLog(B, 'Você tirou ' + q + ' ' + GOODS[g].n + ' a preço de custo (' + cost + ' ouro no cofre).'); }
    if (!own) { const cl = Object.values(S.npcs).find(n => n.bi === P.bi && n.role === 'clerk'); if (cl) memAdd(cl, p, 'buy'); }
    if (!own) { B.cofre += cost; B.today.rev += cost; B.today.sold += q; bizLog(B, p.name + ' comprou ' + q + ' ' + GOODS[g].n + ' no balcão (' + cost + ' ouro).'); const o = ownerOnline(r); if (o && o !== p) tell(o, p.name + ' comprou ' + q + ' ' + GOODS[g].n + ' em ' + P.name + ' (+' + cost + ' no cofre).'); }
    tell(p, own ? 'Você tirou ' + q + ' ' + GOODS[g].n + ' a preço de custo (' + cost + ' ouro foram para o cofre).' : 'Você comprou ' + q + ' ' + GOODS[g].n + ' por ' + cost + ' de ouro.'); sendStat(p); estateSave();
  }
  Net.toOne(p.id, { t: 'counter', pid, name: P.name, owner: r.ownerName, own, closed: !!B.closed, items: Object.keys(B.stock).filter(g => B.stock[g] >= 1).map(g => ({ g, q: Math.floor(B.stock[g]), price: own ? Math.ceil(GOODS[g].p) : counterPrice(B, g, mul) })), mul });
}
// ---------- mensageiros: levam a produção das oficinas para as lojas (ou outra oficina) do mesmo dono ----------
const COURIER_WP = () => { const x0 = CENTER - 32; return { sq: [x0 - 37, CENTER + 4], road: [x0 - 37, CENTER + 0.5], bridge: [x0 - 18, CENTER + 0.5], ring: [x0 - 7, CENTER + 5.5], gate: [x0 + 3, CENTER + 5.5] }; };
function bizDoorOut(P) { const b = BUILDINGS[P.bi], [dx, dy] = doorTile(b), v = DOOR_V[b.door || 'S']; return [dx + v[0] * 1.2, dy + v[1] * 1.2]; }
const inVillage = P => BUILDINGS[P.bi].x < CENTER - 52;
function routeBetween(A, B) {   // pontos de passagem curtos (o pathfinding não precisa varrer o mapa todo)
  const W = COURIER_WP(), a = bizDoorOut(A), b = bizDoorOut(B), out = [a];
  if (inVillage(A) && !inVillage(B)) out.push(W.sq, W.road, W.bridge, W.ring, W.gate); else if (!inVillage(A) && inVillage(B)) out.push(W.gate, W.ring, W.bridge, W.road, W.sq); else out.push(W.sq);
  out.push(b); const tb = BUILDINGS[B.bi], st = S.npcs && Object.values(S.npcs).find(n => n.bi === B.bi && n.role && n.role !== 'courier'); out.push(doorTile(tb)); if (st) out.push(clerkFront(tb, st)); return out;   /* na frente da balconista, do lado da porta */
}
function courierJobs(owner) { return Object.values(S.npcs || {}).filter(n => n.role === 'courier' && n.job && n.job.owner === owner).map(n => ({ name: n.name.split(',')[0], g: n.job.goods, to: PROPS_BY[n.job.to].name, st: n.job.st })); }
const BENCH_CAP = 150;
// mercadoria → item da mochila (o que dá para pegar dos depósitos)
const GOOD_TAKE = { wood: 'log', ore: 'ore', crystal: 'gem', herb: 'herb', flax: 'flaxraw', woodgoods: 'wand', wheat: 'wheat', fruit: 'apple', loaves: 'bread', pies: 'pie', paper: 'map', potion: 'pot_hp' };   // madeira que cabe na bancada de entalhe
function bizNeeds(owner) {   // o que cada negócio do dono precisa receber
  const E = S.estate, out = [];
  for (const pid in E.r) { const r = E.r[pid]; if (r.owner !== owner || !r.biz) continue; const P = PROPS_BY[pid], B = r.biz;
    if (P.kind === 'shop') { const room = shopCap(B) - stockSum(B.stock); for (const g of SHOP_GOODS[P.shopType] || []) if (room > 0) out.push({ pid, g, room });
      if (P.shopType === 'arcane') { const rr = BENCH_CAP - Math.floor((B.raw || {}).wood || 0); if (rr >= 4) out.push({ pid, g: 'wood', room: rr, raw: 1 }); } }   // madeira para a bancada de entalhe
    else { const W = WORKS[P.wk]; if (W && W.recipes) { const want = new Set(); for (const r0 in W.recipes) for (const g in W.recipes[r0]) want.add(g);   // ingredientes de todas as receitas (a padaria também recebe frutas)
      for (const g of want) { const room = WS_CAP - stockSum(B.store), mine = Math.floor(B.store[g] || 0); if (room > 0 && mine < WS_CAP / 3) out.push({ pid, g, room: Math.min(room, WS_CAP / 3 - mine, 40) }); } } } }
  return out.sort((x, y) => (PROPS_BY[x.pid].kind === 'workshop' ? 0 : 1) - (PROPS_BY[y.pid].kind === 'workshop' ? 0 : 1));   // oficinas que transformam primeiro
}
function ownMaker(owner, g) { for (const pid in S.estate.r) { const r = S.estate.r[pid], P = PROPS_BY[pid]; if (r.owner === owner && r.biz && P.kind === 'workshop' && WORKS[P.wk] && WORKS[P.wk].make && WORKS[P.wk].make[g]) return true; } return false; }   // tem oficina própria que extrai isso? então espera o mensageiro
function dispatchCouriers() {
  const E = S.estate; if (!E || !S.npcs) return; const now = gameNow();
  const busy = Object.values(S.npcs).filter(n => n.role === 'courier' && n.job), pair = new Set(busy.map(n => n.job.from + '>' + n.job.to + (n.job.raw ? 'r' : '')));
  const free = Object.values(S.npcs).filter(n => n.role === 'courier' && !n.job && !n.dead && !n.downed && !n.sleeping && (n.act === 'work' || n.act == null));
  // pedidos de todos os donos, com a fonte (oficina do mesmo dono que tem a mercadoria)
  const owners = new Set(Object.values(E.r).filter(r => r.biz).map(r => r.owner)), cands = [];
  for (const ow of owners) for (const need of bizNeeds(ow)) {
    const DB = E.r[need.pid] && E.r[need.pid].biz; if (!DB) continue; DB.wait = DB.wait || {}; const wk = need.g + (need.raw ? 'r' : '');
    let best = null; for (const sp in E.r) { const r = E.r[sp], SP = PROPS_BY[sp]; if (sp === need.pid || r.owner !== ow || !r.biz || !SP || SP.kind !== 'workshop') continue; const have = Math.floor(r.biz.store[need.g] || 0); if (have >= 1 && (!best || have > best.have)) best = { sp, have }; }
    if (!best) { delete DB.wait[wk]; continue; } if (!DB.wait[wk]) DB.wait[wk] = now;
    if (!pair.has(best.sp + '>' + need.pid + (need.raw ? 'r' : ''))) cands.push({ ...need, owner: ow, from: best.sp, since: DB.wait[wk] });
  }
  cands.sort((x, y) => x.since - y.since);   // quem espera há mais tempo primeiro
  for (const c of cands) {
    if (!free.length) break; const key = c.from + '>' + c.pid + (c.raw ? 'r' : ''); if (pair.has(key)) continue;
    const SB = E.r[c.from].biz, goods = {}; let tot = 0;
    for (const o of cands) if (o.from === c.from && o.pid === c.pid && !!o.raw === !!c.raw && tot < 60) { const q = Math.min(Math.floor(SB.store[o.g] || 0), o.room, 60 - tot); if (q > 0) { goods[o.g] = (goods[o.g] || 0) + q; tot += q; } }   // leva tudo o que esse destino precisa dessa oficina
    if (!tot) continue;
    { let roomTot = 0; for (const o of cands) if (o.from === c.from && o.pid === c.pid && !!o.raw === !!c.raw) roomTot += o.room; if (tot < Math.min(20, roomTot)) continue; }   /* leva no mínimo 20 (ou tudo o que o destino ainda cabe): espera a oficina juntar */
    const n = free.sort((a, b) => dist(a.x, a.y, BUILDINGS[PROPS_BY[c.from].bi].x, BUILDINGS[PROPS_BY[c.from].bi].y) - dist(b.x, b.y, BUILDINGS[PROPS_BY[c.from].bi].x, BUILDINGS[PROPS_BY[c.from].bi].y)).shift();   // o mensageiro mais perto da oficina
    n.job = { owner: c.owner, from: c.from, to: c.pid, goods, raw: c.raw ? 1 : 0, wp: [[n.x, n.y], ...routeBetween(PROPS_BY[c.from], PROPS_BY[c.pid])], i: 1, st: 'indo buscar', back: [] }; pair.add(key);
  }
}
// carroça de reserva: quem espera há mais de 3 horas do jogo recebe direto da oficina do mesmo dono (sem depender dos mensageiros)
function cartReserve() {
  const E = S.estate; if (!E) return; const now = gameNow(), owners = new Set(Object.values(E.r).filter(r => r.biz).map(r => r.owner));
  for (const ow of owners) for (const need of bizNeeds(ow)) {
    const DR = E.r[need.pid], DB = DR && DR.biz; if (!DB || !DB.wait) continue; const wk = need.g + (need.raw ? 'r' : ''); if (!DB.wait[wk] || now - DB.wait[wk] < BIZ_HOUR_MS * 3) continue;
    for (const sp in E.r) { const r = E.r[sp], SP = PROPS_BY[sp]; if (sp === need.pid || r.owner !== ow || !r.biz || !SP || SP.kind !== 'workshop') continue; const q = Math.min(Math.floor(r.biz.store[need.g] || 0), need.room, 30); if (q < Math.min(20, need.room)) continue;
      r.biz.store[need.g] -= q; r.biz.today.xfer = (r.biz.today.xfer || 0) + q * GOODS[need.g].p * SELL_K;
      const tgt = need.raw ? (DB.raw = DB.raw || {}) : PROPS_BY[need.pid].kind === 'shop' ? DB.stock : DB.store; tgt[need.g] = (tgt[need.g] || 0) + q; delete DB.wait[wk];
      bizLog(DB, 'A carroça da vila trouxe ' + q + ' ' + GOODS[need.g].n + ' de ' + SP.name + ' (os mensageiros estavam ocupados).'); break; }
  }
}
function courierTick(n, now, dt) {
  const J = n.job; if (!J) { if (dist(n.x, n.y, n.postX, n.postY) > 0.5) npcWalk(n, n.postX, n.postY, 1.4, dt); return; }
  const E = S.estate, wp = J.wp[J.i]; if (!wp) { n.job = null; return; }
  if (J.wi !== J.i) { J.wi = J.i; J.wt = now; }
  if (npcWalk(n, wp[0], wp[1], 1.7, dt) || dist(n.x, n.y, wp[0], wp[1]) < 0.6 || (now - J.wt > 9000 && dist(n.x, n.y, wp[0], wp[1]) < 2.5)) {   // ponto inalcançável há 9 s mas perto: conta como alcançado
    if (J.i === 1 && J.st === 'indo buscar') {   // pegou na oficina
      const r = E.r[J.from]; if (!r || !r.biz) { n.job = null; return; } for (const g in J.goods) { const q = Math.min(J.goods[g], Math.floor(r.biz.store[g] || 0)); J.goods[g] = q; r.biz.store[g] -= q; r.biz.today.xfer = (r.biz.today.xfer || 0) + q * GOODS[g].p * SELL_K; } for (const g in J.goods) if (!J.goods[g]) delete J.goods[g]; if (!Object.keys(J.goods).length) { n.job = null; return; } J.st = 'levando';   // valor do que foi para os seus negócios
    }
    J.i++;
    if (J.i >= J.wp.length) {
      if (J.st === 'levando') { const r = E.r[J.to]; if (r && r.biz) { const B = r.biz, tgt = J.raw ? (B.raw = B.raw || {}) : PROPS_BY[J.to].kind === 'shop' ? B.stock : B.store; let txt = []; for (const g in J.goods) { tgt[g] = (tgt[g] || 0) + J.goods[g]; txt.push(J.goods[g] + ' ' + GOODS[g].n); if (B.wait) delete B.wait[g + (J.raw ? 'r' : '')]; } obsCount('del'); bizLog(B, n.name.split(',')[0] + ' entregou ' + txt.join(', ') + (J.raw ? ' para a bancada' : '') + '.'); near(n.x, n.y, { t: 'tfx', k: 'ok', id: n.id }); } J.st = 'voltando'; J.wp = [...J.wp.slice().reverse().slice(1), [n.postX, n.postY]]; J.i = 0; estateSave(); }
      else n.job = null;
    }
  }
}
// Jonas, o entregador do fornecedor: pega a encomenda no portão principal e leva andando até dentro da loja
function supplierTick(n, now, dt) {
  const J = n.job;
  if (!J) { const q = (S.supplyQ || []).shift(); if (!q) { if (dist(n.x, n.y, n.postX, n.postY) > 0.5) npcWalk(n, n.postX, n.postY, 1.3, dt); return; }
    const P = PROPS_BY[q.pid], b = BUILDINGS[P.bi], st = Object.values(S.npcs).find(o => o.bi === P.bi && o.role === 'clerk');
    n.job = { pid: q.pid, o: q.o, st: 'levando', i: 0, wp: [[CENTER + 0.5, CENTER + 22], [CENTER + 0.5, CENTER + 12], [CENTER - 8, CENTER + 6.5], bizDoorOut(P), doorTile(b), st ? clerkFront(b, st) : doorTile(b)] }; return; }
  const wp = J.wp[J.i]; if (!wp) { n.job = null; return; }
  if (J.wi !== J.i) { J.wi = J.i; J.wt = now; }
  if (npcWalk(n, wp[0], wp[1], 1.6, dt) || dist(n.x, n.y, wp[0], wp[1]) < 0.6 || (now - J.wt > 9000 && dist(n.x, n.y, wp[0], wp[1]) < 2.5)) {   // ponto inalcançável há 9 s mas perto: conta como alcançado
    J.i++;
    if (J.i >= J.wp.length) {
      if (J.st === 'levando') { const r = S.estate.r[J.pid]; if (r && r.biz) { const B = r.biz, o = J.o; if (o.raw) { B.raw = B.raw || {}; B.raw[o.g] = Math.min(BENCH_CAP, (B.raw[o.g] || 0) + o.q); } else B.stock[o.g] = (B.stock[o.g] || 0) + o.q; const k = B.orders.indexOf(o); if (k >= 0) B.orders.splice(k, 1); bizLog(B, 'Jonas, o entregador, trouxe ' + o.q + ' ' + GOODS[o.g].n + (o.raw ? ' para a bancada' : '') + '.'); estateSave(); near(n.x, n.y, { t: 'tfx', k: 'ok', id: n.id }); } J.st = 'voltando'; J.wp = J.wp.slice(0, -1).reverse().concat([[n.postX, n.postY]]); J.i = 0; }
      else n.job = null;
    }
  }
}
function courierRobbed(n) { const J = n.job; if (!J || J.st !== 'levando') return; const r = S.estate.r[J.to] || S.estate.r[J.from]; if (r && r.biz) bizLog(r.biz, 'Assalto! ' + n.name.split(',')[0] + ' foi derrubado e a carga se perdeu.'); const q = r && ownerOnline(r); if (q) tell(q, 'Seu mensageiro ' + n.name.split(',')[0] + ' foi atacado e perdeu a carga!'); n.job = null; }
// ---------- uma hora do jogo: produção, entregas, vendas; virada do dia: salários, roubos, histórico ----------
function bizHour(now) {
  try { npcLoansHour(); } catch (e) { }
  const E = estateLoad(), day = estDay(), newDay = S.bizDay != null && S.bizDay !== day; S.bizDay = day;
  try { npcMoodHour(); npcbHour(); if (newDay) npcbDayEnd(); } catch (e) { console.warn('negócios de NPC', e); }
  try { obsRecord(newDay); } catch (e) { console.warn('histórico', e); }
  for (const pid in E.r) {
    const r = E.r[pid], P = PROPS_BY[pid], B = r.biz; if (!B) continue;
    const on = ownerOnline(r); if (on) r.seen = Date.now(); if (Date.now() - (r.seen || 0) > BIZ_OFFLINE_MS) continue;   // dono sumido há 2 dias: portas fechadas, nada acontece
    if (P.kind === 'bank') { /* o banco ganha com os juros dos empréstimos, as heranças e as taxas dos moradores */ }
    else if (P.kind === 'hotel') {   // pousada: cada hóspede da noite rende um pouco por hora (café, lenha, roupa lavada)
      if (!B.closed) { const H = hotelData(), d0 = estDay(), occ = Object.values(H.rooms || {}).filter(x => x && ((x.who && x.until > d0) || (x.npc && S.npcs && S.npcs[x.npc]))).length; if (occ) { B.cofre += occ; B.today.rev += occ; } }
    }
    else if (P.kind === 'shop') {
      if (B.rsOn) { const GS = SHOP_GOODS[P.shopType] || [], ord = g => B.orders.filter(o => o.g === g).reduce((a, o) => a + o.q, 0), share = Math.floor(shopCap(B) / Math.max(1, GS.length)); for (const g of GS) { const have = (B.stock[g] || 0) + ord(g); if (have >= share) continue;
          const room = shopCap(B) - stockSum(B.stock) - B.orders.reduce((a, o) => a + (o.raw ? 0 : o.q), 0), q = Math.min(share - have, room); if (q < 3) continue; const cost = Math.ceil(GOODS[g].p * q);
          if (debit(r.owner, null, cost, B)) { B.orders.push({ g, q, at: Date.now() + BIZ_HOUR_MS / 2 });   /* a encomenda sai do fornecedor em meia hora do jogo */ B.today.cost += cost; bizLog(B, 'Reposição automática: ' + q + ' ' + GOODS[g].n + ' (' + cost + ' ouro do banco).'); } else { bizLog(B, 'Reposição automática: sem ouro no banco para ' + GOODS[g].n + '.'); break; } } }
      if (P.shopType === 'arcane' && B.rsOn && !ownMaker(r.owner, 'wood')) {   // bancada de entalhe: com a reposição ligada (e sem serraria própria), compra madeira quando passa da metade
        B.raw = B.raw || {}; const pend = B.orders.filter(o => o.raw).reduce((a, o) => a + o.q, 0), have = Math.floor(B.raw.wood || 0) + pend;
        if (have < BENCH_CAP / 2) { const q = BENCH_CAP - have, cost = Math.ceil(GOODS.wood.p * q); if (debit(r.owner, null, cost, B)) { B.orders.push({ g: 'wood', q, raw: 1, at: Date.now() + BIZ_HOUR_MS }); B.today.cost += cost; bizLog(B, 'Reposição automática: ' + q + ' Madeira para a bancada (' + cost + ' ouro do banco).'); } else bizLog(B, 'Reposição automática: sem ouro no banco para a madeira da bancada.'); }
      }
      if (P.shopType === 'arcane' && !B.closed && B.raw && B.raw.wood >= 2) { B.frac2 = (B.frac2 || 0) + (workerAt(P.bi) ? 1.5 : 1); let nb = Math.floor(B.frac2); B.frac2 -= nb; let made = 0;
        while (nb-- > 0 && B.raw.wood >= 2 && stockSum(B.stock) < shopCap(B)) { B.raw.wood -= 2; B.stock.woodgoods = (B.stock.woodgoods || 0) + 1; made++; } if (made) bizLog(B, 'O atendente entalhou ' + made + ' varinha' + (made > 1 ? 's' : '') + ' na bancada.'); }
      for (const o of B.orders) if (Date.now() >= o.at && !o.queued) { o.queued = 1; (S.supplyQ = S.supplyQ || []).push({ pid, o }); }
      if (!B.closed) {
        B.frac += 0.4 * (1 + 0.6 * (B.up.vitrine || 0)) * (0.7 + Math.random() * 0.6) * (workerAt(P.bi) ? 1.5 : 1) * ownerWorkMul(r, P) / (ownerWorkMul(r, P) > 1 ? 1.5 : 1) * staffMul(B); let n = Math.floor(B.frac); B.frac -= n;
        while (n-- > 0) { const gs = Object.keys(B.stock).filter(g => B.stock[g] >= 1); if (!gs.length) break;
          const g = gs[Math.floor(Math.random() * gs.length)], M = MARGIN[B.margin[g] ?? 1]; if (Math.random() > M.p) continue;
          const price = GOODS[g].p * M.k; B.stock[g]--; if (!B.stock[g]) delete B.stock[g]; B.cofre += price; B.today.rev += price; B.today.sold++; B.fullWarn = 0; saleFx(clerkOf(P.bi), null); }
      }
    } else {
      const sk = seasonNow().k, W = WORKS[P.wk] || {}, k = (workerAt(P.bi) ? 1.5 : 1) * ownerWorkMul(r, P) / (ownerWorkMul(r, P) > 1 ? 1.5 : 1) * staffMul(B) * (1 + 0.6 * (B.up.tools || 0)) * (P.wk === 'farm' ? (sk === 'winter' ? 0.4 : sk === 'summer' ? 1.25 : 1) : 1);
      if (!B.closed) {
        if (W.make && !COLL_TOOL[P.wk]) for (const g in W.make) { B.frac[g] = (B.frac[g] || 0) + W.make[g] * k; const q = Math.floor(B.frac[g]); B.frac[g] -= q; if (stockSum(B.store) + q <= WS_CAP) { B.store[g] = (B.store[g] || 0) + q; if (q) { const mk = B.today.mk || (B.today.mk = {}); mk[g] = (mk[g] || 0) + q; } } }
        if (W.recipes) { B.frac._b = (B.frac._b || 0) + k; let nb = Math.floor(B.frac._b); B.frac._b -= nb;   /* todas as receitas: a que tiver menos estoque primeiro (ou só a fixada pelo dono) */
          while (nb-- > 0 && stockSum(B.store) < WS_CAP) { let made = null;
            for (const rk of bizRecipes(B, W)) { const rec = W.recipes[rk]; let ok = true;
              for (const g in rec) if ((B.store[g] || 0) < rec[g]) { const miss = rec[g] - (B.store[g] || 0), cost = Math.ceil(GOODS[g].p * 1.2 * miss), worth = recipeGain(rk) > 0; if (B.autobuy && worth && B.cofre >= cost && !ownMaker(r.owner, g)) { B.cofre -= cost; B.today.cost += cost; B.store[g] = (B.store[g] || 0) + miss; } else { ok = false; break; } }
              if (!ok) continue; for (const g in rec) B.store[g] -= rec[g]; B.store[rk] = (B.store[rk] || 0) + 1; { const mk = B.today.mk || (B.today.mk = {}); mk[rk] = (mk[rk] || 0) + 1; } made = rk; break; }
            if (!made) break; } }
        if (P.wk === 'bakery') { S.trade = S.trade || {}; const give = (npc, k, g) => { const n0 = S.npcs && S.npcs[npc]; if (!n0) return; const T = tradeStock(n0), have = Math.floor(B.store[g] || 0), room = Math.max(0, 40 - (T.stock[k] || 0)), q = Math.min(have - 5, room); if (q > 0) { B.store[g] -= q; T.stock[k] = (T.stock[k] || 0) + q; const v = Math.round(q * GOODS[g].p * 0.9); B.cofre += v; B.today.rev += v; B.today.sold += q; bizLog(B, q + ' ' + GOODS[g].n + ' entregues a ' + n0.name.split(',')[0] + ' (' + v + ' ouro).'); } }; give('merchant', 'bread', 'loaves'); give('innkeeper', 'pie', 'pies'); give('innkeeper', 'bread', 'loaves'); }
        if (B.sell) { const need = new Set(bizNeeds(r.owner).filter(x => x.pid !== pid).map(x => x.g)); for (const g in B.store) { if (g === 'serve') continue; const keep = B.keep != null ? B.keep : need.has(g) ? 40 : 10; if (B.store[g] > keep) { const ex = Math.floor(B.store[g] - keep), v = GOODS[g].p * SELL_K * ex; B.store[g] -= ex; B.cofre += v; B.today.rev += v; B.today.sold += ex; } } }
        if (P.wk === 'tavern') {   // taverna: cada freguês lá dentro gasta; mesas servidas (com linho) rendem mais
          const pat = 1 + Object.values(S.npcs).filter(q => !q.dead && q.kind !== 'guard' && WORLD.bld[tileAt(q.x, q.y)] === P.bi && q.role !== 'clerk').length, served = Math.min(pat, Math.floor(B.store.serve || 0));
          const v = Math.round((pat * 4 + served * 7) * staffMul(B) * (1 + 0.6 * (B.up.tools || 0)) * ownerWorkMul(r, P) / (ownerWorkMul(r, P) > 1 ? 1.5 : 1));   /* melhorias de ferramentas e o dono no turno também valem na taverna */ B.store.serve = (B.store.serve || 0) - served; B.cofre += v; B.today.rev += v; B.today.sold += pat; }
      }
    }
    if (newDay) {
      const sal = SALARY[P.kind]; if (debit(r.owner, null, sal, B)) { B.today.cost += sal; if (B.closed) B.closed = false; } else if (!B.closed) { B.closed = true; bizLog(B, 'Sem ouro no banco nem no cofre para o salário (' + sal + '): o negócio parou. Deposite no banco ou no cofre.'); if (on) tell(on, P.name + ' parou: falta ouro no cofre para o salário.'); }
      for (const s of [...(B.staff || [])]) { if (debit(r.owner, null, s.w, B)) B.today.cost += s.w; else { B.staff = B.staff.filter(q => q !== s); bizLog(B, s.n + ' foi embora: não recebeu o salário (' + s.w + ').'); } }
      { const st = P.kind === 'shop' ? B.stock : B.store, gs = Object.keys(st || {}).filter(g => st[g] >= 3), hon = (B.staff || []).some(s => s.tr === 'honest') ? 0.5 : 1;
        if (gs.length && Math.random() < THEFT[B.up.safe || 0] * hon) { const g = gs[Math.floor(Math.random() * gs.length)], lost = Math.max(1, Math.floor(st[g] * 0.2)); st[g] -= lost; bizLog(B, 'Ladrões levaram ' + lost + ' ' + GOODS[g].n + ' durante a noite!'); if (on) tell(on, 'Roubaram ' + lost + ' ' + GOODS[g].n + ' de ' + P.name + '!'); } }
      { const D = typeof dojoRec === 'function' ? dojoRec() : null, isDojo = !!(D && D.B === B), isTav = P.wk === 'tavern';   /* dojô e taverna dão reputação ao dono pelo movimento do dia */
        if ((isDojo || isTav) && !B.closed) { const sold = B.today.sold || 0, rev = B.today.rev || 0, amt = isDojo ? (sold >= 6 ? 3 : sold >= 3 ? 2 : sold >= 1 ? 1 : 0) : (rev >= 150 ? 3 : rev >= 70 ? 2 : rev > 0 ? 1 : 0);
          if (amt) { r.repPend = (r.repPend || 0) + amt; const op = Object.values(S.players).find(q => estOwner(q) === r.owner); if (op) { repAdd(op, 'cidade', r.repPend, 'movimento do ' + (isDojo ? 'dojô' : 'taverna') + ' de ontem'); r.repPend = 0; } } } }
      B.hist.push({ rev: Math.round(B.today.rev), cost: Math.round(B.today.cost), sold: B.today.sold, xfer: Math.round(B.today.xfer || 0) }); if (B.hist.length > 7) B.hist.shift(); B.today = { rev: 0, sold: 0, cost: 0, xfer: 0 };
    }
  }
  for (const pid in E.r) if (E.r[pid].biz && (E.r[pid].biz.staff || []).length || Object.values(S.npcs || {}).some(n => n.bizWorker === pid)) staffSync(pid, E.r[pid]);
  try { cartReserve(); } catch (e) { console.warn('carroça', e); } estateSave();
  for (const q of Object.values(S.players)) if (q.bizOpen) bizSend(q);
}
// débito diário + descanso em casa (roda a cada ~2 s); uma vez por hora do jogo, os negócios
function estateTick(now) {
  if (!S.npcs) return;   // o mundo ainda está abrindo: os moradores (e os funcionários dos negócios) nascem no primeiro passo dos NPCs
  if (now - (S.estT || 0) < 2000) return;
  { const E0 = estateLoad(); if (E0.offers) for (const pid in E0.offers) if (estDay() - E0.offers[pid].day >= 1) offerClose(PROPS_BY[pid], false, 'Sua oferta por ' + (PROPS_BY[pid] || {}).name + ' venceu sem resposta. O dinheiro voltou para o banco.'); } const dt = S.estT ? (now - S.estT) / 1000 : 2; S.estT = now;
  const E = estateLoad(), day = estDay();
  if (gameNow() - (S.bizT || 0) >= BIZ_HOUR_MS || gameNow() < (S.bizT || 0)) { S.bizT = gameNow(); bizHour(now); }
  for (const pid of Object.keys(E.r)) {
    const r = E.r[pid], P = PROPS_BY[pid]; if (!P) { estateEnd(pid, 'O imóvel que era seu deixou de existir na reforma da cidade. O que você pagou voltou para a sua bolsa.', (r.price || 0) + (r.dep || 0)); continue; } const owed = Math.floor((day - r.paid) / RENT_DAYS); if (owed <= 0) continue;   // semanas vencidas
    const due = (r.mode === 'own' ? 1 : P.rent) * RENT_DAYS, q = ownerOnline(r);
    if (r.mode === 'own' && tenantsOf(P).length && !(E.evict || {})[pid] && r.tenPaid !== r.paid) { r.tenPaid = r.paid; const v = P.week * owed, BK = bankLoad(), A = BK.acc[r.owner] || (BK.acc[r.owner] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += v; bankSave(); if (q) tell(q, 'Os inquilinos de ' + P.name + ' pagaram ' + v + ' de ouro de aluguel: foi direto para a sua conta no banco.'); }   /* aluguel dos inquilinos vai para o banco */
    if (!q) {   // dono fora do jogo: paga do banco e do cofre do negócio
      let pd = false; while (day - r.paid >= RENT_DAYS) { if (!debit(r.owner, null, due, r.biz)) break; r.paid += RENT_DAYS; pd = true; if (P.apt && r.mode !== 'own') aptPayOwner(due, r.ownerName + ' pagou o aluguel do ' + P.name.split(' ·')[0] + ' (' + due + ').'); } if (pd) estateSave();
      if (r.mode !== 'own' && day - r.paid > ESTATE_ABANDON_DAYS) estateEnd(pid, ''); continue; }

    let paid = 0; const sum = { bank: 0, cofre: 0, gold: 0 }; while (day - r.paid >= RENT_DAYS) { const d = debit(r.owner, q, due, r.biz); if (!d) break; for (const k in sum) sum[k] += d[k]; r.paid += RENT_DAYS; paid++; if (P.apt && r.mode !== 'own') aptPayOwner(due, r.ownerName + ' pagou o aluguel do ' + P.name.split(' ·')[0] + ' (' + due + ').'); }
    if (paid) { featAdd(q, 'rent', paid); sendStat(q); tell(q, (r.mode === 'own' ? 'Imposto' : 'Aluguel') + ' semanal de ' + P.name + ': -' + (due * paid) + ' de ouro' + (paid > 1 ? ' (' + paid + ' semanas)' : '') + ' — ' + debitTxt(sum) + '.'); estateSave(); if (q.estOpen) estateSend(q); }
    const still = Math.floor((day - r.paid) / RENT_DAYS);
    if (still >= 2 && r.mode !== 'own') estateEnd(pid, 'Sem ouro para o aluguel, você perdeu ' + P.name + '. A caução cobriu a dívida' + (r.biz ? ' e o cofre veio para a sua bolsa.' : ' e o baú voltou para a sua mochila.'));
    else if (still >= 1 && !r.warned && r.mode !== 'own') { r.warned = day; tell(q, 'Aluguel atrasado em ' + P.name + ': deixe ' + due + ' de ouro no banco (ou na bolsa) antes da próxima semana ou perde o imóvel.'); }
    else if (!still) r.warned = 0;
  }
  if (E.evict) for (const pid of Object.keys(E.evict)) if (day >= E.evict[pid].day) { E.gone = E.gone || {}; E.gone[pid] = true; const ev = E.evict[pid]; delete E.evict[pid]; const P = PROPS_BY[pid]; for (const id of P.tenants || []) { const n = S.npcs && S.npcs[id]; if (n) { n.homeless = true; near(n.x, n.y, { t: 'anim', w: 'n', id, a: 'talk', txt: 'Vou dormir na taverna, então...', ms: 1 }); } } const q = Object.values(S.players).find(o => o.name === ev.owner); if (q) tell(q, 'Os inquilinos deixaram ' + P.name + '. A casa agora está vazia.'); estateChanged(); }
  for (const p of Object.values(S.players)) {
    if (p.sleep == null || !(estHomeBed(p) || hotelBedOf(p) === p.sleep)) { p.homeSleep = 0; continue; }
    p.homeSleep = (p.homeSleep || 0) + dt;
    if (p.homeSleep >= 20 && !buffOn(p, 'rested')) { const ms = typeof empSlept === 'function' ? empSlept(p) : 600000; p.buffs.rested = now + ms; tell(p, 'Você dormiu bem na sua cama: Bem descansado (' + Math.round(ms / 60000) + ' min' + (ms > 600000 ? ', a cama estava arrumada' : '') + '; recupera vida e mana mais rápido).'); sendStat(p); }
  }
}
function estHomeBed(p) { if (p.sleep == null) return false; const b = BEDS[p.sleep], pid = rentalOf(p); if (!b || !pid) return false; const P = PROPS_BY[pid]; return P.apt ? b.apt === P.apt : (P.bi === b.bi && !b.fl); }

// ============================================================
//  ROTINA DOS MORADORES — dormem em casa (22h–6h), tomam café, trabalham, almoçam (taverna ou casa), trabalham,
//  à noite vão à taverna/pracinha conversar; fome, cansaço e vontade de conversar mudam a ordem. Andam pelas portas.
// ============================================================
const resHour = () => (((gameNow() % ESTATE_DAY_MS) / ESTATE_DAY_MS) * 24 + 12) % 24;   // fase 0 do dia = meio-dia
const VILLAGE_SQ = () => [CENTER - 32 - 37, CENTER + 4];
function bldTiles(bi) { const b = BUILDINGS[bi], out = []; if (!b) return out; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (WORLD.bld[tileAt(x, y)] === bi && canStand(x, y, 0, 0.2) && !doorTile(b).every((v, k) => v === [x, y][k])) out.push([x, y]); return out; }
const _resSpots = {};
function resHomeSpot(n, bi) {   // cada morador da casa tem o seu canto (perto da cama)
  const key = n.id + '|' + bi; if (_resSpots[key]) return _resSpots[key];
  const bed = BEDS.find(b => b.bi === bi), tiles = bldTiles(bi).sort((a, b) => bed ? dist(a[0], a[1], bed.x, bed.y) - dist(b[0], b[1], bed.x, bed.y) : 0);
  const mates = Object.values(S.npcs).filter(o => o.home === bi).map(o => o.id).sort(), k = Math.max(0, mates.indexOf(n.id));
  const t = tiles[Math.min(tiles.length - 1, k * 2)] || doorTile(BUILDINGS[bi]); return (_resSpots[key] = [t[0], t[1]]);
}
function doorOutPt(bi) { const b = BUILDINGS[bi], [dx, dy] = doorTile(b), v = DOOR_V[b.door || 'S']; return [dx + v[0] * 1.3, dy + v[1] * 1.3]; }
function planRoute(n, tx, ty) {
  const here = WORLD.bld[tileAt(n.x, n.y)], there = WORLD.bld[tileAt(tx, ty)], r = [];
  if (here >= 0 && here !== there) { r.push(doorTile(BUILDINGS[here]), doorOutPt(here)); }
  if (there >= 0 && there !== here) { r.push(doorOutPt(there), doorTile(BUILDINGS[there])); }
  r.push([tx, ty]); return r;
}
const TAV_BI = () => BUILDINGS.findIndex(b => b.kind === 'tavern');
function tavSeat(n) {   // cadeira livre na taverna
  S.seatTaken = S.seatTaken || {}; const tav = TAV_BI(); let best = -1;
  WORLD.seats.forEach((s, k) => { if (best < 0 && s.bi === tav && !S.seatTaken[k]) best = k; });
  if (best < 0) return null; S.seatTaken[best] = n.id; n.seatK = best; return WORLD.seats[best];
}
function seatFree(n) { if (n.seatK != null) { if (S.seatTaken && S.seatTaken[n.seatK] === n.id) delete S.seatTaken[n.seatK]; n.seatK = null; } n.sitting = false; n.doze = false; }
function resSpot(n, act) {
  const village = BUILDINGS[n.home] && BUILDINGS[n.home].x < CENTER - 52, tav = BUILDINGS.findIndex(b => b.kind === 'tavern');
  const homeBi = n.homeless && tav >= 0 ? tav : n.home, day = Math.floor(gameNow() / ESTATE_DAY_MS), h = [...n.id].reduce((a, c) => a + c.charCodeAt(0), 0) + day * 7;
  if (act === 'sleep' || act === 'home') return resHomeSpot(n, homeBi);
  if (act === 'work') return [n.postX, n.postY];
  const sq = VILLAGE_SQ();
  if ((act === 'eat' || act === 'social') && !village && (act === 'eat' || h % 3)) { const s = tavSeat(n); if (s) return [s.x, s.y]; }
  if (act === 'eat') return village ? resHomeSpot(n, homeBi) : (() => { const t = bldTiles(tav); return t.length ? t[h % t.length] : resHomeSpot(n, homeBi); })();
  if (act === 'social') { if (village) { const a = (h % 12) / 12 * Math.PI * 2; return [sq[0] + Math.cos(a) * 1.8, sq[1] + Math.sin(a) * 1.4]; } const t = bldTiles(tav); return t.length && h % 3 ? t[(h >> 2) % t.length] : [CENTER + (h % 5) - 2, CENTER + 12 + (h % 3)]; }
  return [n.postX, n.postY];
}
const TAV_LINES = ['Saúde!', 'À nossa!', 'Mais uma rodada!', 'Seis! Ganhei de novo!', 'Esses dados estão viciados...', 'Sua vez de jogar.', 'Truco!', 'Ninguém blefa como eu.', 'Essa cerveja do Brom é a melhor de Nae.', 'Dobro ou nada?', 'Hahaha! Essa é boa!', 'Pago a próxima.'];
// ---------- bebida: cada gole conta; 3 em 6 minutos deixam tonto ----------
function aleDrink(p, now, units) {
  p.aleT = (p.aleT || []).filter(t => now - t < 360000); for (let k = 0; k < units; k++) p.aleT.push(now);
  near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'drinkb', ms: 1600 });
  if (p.aleT.length >= 3) { const had = (p.buffs.tipsy || 0) > now; p.buffs.tipsy = Math.max(p.buffs.tipsy || 0, now + 120000); if (!had) tell(p, 'Hic! A bebida subiu: você está tonto por uns minutos.'); return true; }
  return false;
}
function fireMead(p, now) {   // Hidromel de Fogo: faísca pela boca, nada de frio por 5 min, vale por duas canecas
  p.buffs.warm = Math.max(p.buffs.warm || 0, now + 300000); p.cold = 0; p.water = Math.min(100, (p.water ?? 100) + 10);
  const tipsy = aleDrink(p, now, 2), da = (p.dir | 0) * Math.PI / 4, d = [Math.cos(da) + Math.sin(da) / 2, Math.cos(da) - Math.sin(da) / 2];
  setTimeout(() => { if (S.players[p.id]) aoe('breath', p.x, p.y, { x2: p.x + d[0] * 1.6, y2: p.y + d[1] * 1.6 }); }, 1300);
  if (!tipsy) tell(p, 'Arde! Uma faísca escapa da sua boca. Nada de frio por 5 minutos.'); else tell(p, 'Arde! Uma faísca escapa da sua boca... e o mundo começa a girar.');
  sendStat(p);
}
// ---------- Desafio do Tonel: uma rodada a cada 4 s servida pelo Brom; quem cair primeiro perde ----------
const TONEL_MS = 4000;
function tonelTol(x, isNpc) { return isNpc ? (x.tonTol ?? (x.tonTol = Math.random() * 0.3)) : Math.min(0.35, (x.lvl || 1) / 120) + ((x.food ?? 100) > 60 ? 0.08 : 0); }
function tonelBusy(id) { return (S.tonel || []).some(M => !M.done && (M.a === id || (M.o && M.o.id === id))); }
function tonelStart(p, o, bet, solo) {
  const now = now_(); S.tonel = S.tonel || []; const M = { a: p.id, o, bet, solo: !!solo, r: 0, next: now + 2500 }; S.tonel.push(M);
  const brom = S.npcs && S.npcs.innkeeper, oname = solo ? 'Brom' : o.k === 'p' ? (S.players[o.id] || {}).name : (S.npcs[o.id] || {}).name.split(',')[0];
  if (brom) near(brom.x, brom.y, { t: 'anim', w: 'n', id: 'innkeeper', a: 'talk', txt: solo ? 'Cinco canecas, ' + p.name + '! Sem cair!' : 'Desafio do Tonel: ' + p.name + ' contra ' + oname + '!', ms: 1 });
  sys('🍺 Desafio do Tonel no Ronco do Dragão: ' + p.name + (solo ? ' tenta aguentar 5 canecas.' : ' contra ' + oname + (bet ? ' (aposta de ' + bet + ' de ouro).' : '.')));
}
function tonelPassOut(x, isNpc, now) {
  if (isNpc) { x.drunkT = now + 180000; near(x.x, x.y, { t: 'anim', w: 'n', id: x.id, a: 'talk', txt: 'Hic... zzz... *caiu da cadeira*', ms: 1 }); return; }
  x.knockUntil = now + 7000; x.stunUntil = now + 7000; x.buffs.tipsy = Math.max(x.buffs.tipsy || 0, now + 180000);
  near(x.x, x.y, { t: 'knock', k: 'p', id: x.id, ax: x.x - 0.5, ay: x.y - 0.5, ms: 7000 }); tell(x, 'O mundo gira... você desaba no chão da taverna.'); sendStat(x);
}
function tonelBoard(name, r) { const E = S.estate; if (!E) return; E.tonel = (E.tonel || []).concat([{ n: name, r, d: estDay() }]).sort((a, b) => b.r - a.r || b.d - a.d).slice(0, 8); estateSave(); }
function tonelTick(now) {
  const L = S.tonel; if (!L || !L.length) return; const tav = TAV_BI(), brom = S.npcs && S.npcs.innkeeper;
  for (const M of L) {
    if (M.done || now < M.next) continue; M.next = now + TONEL_MS; M.r++;
    const A = S.players[M.a], O = M.solo ? null : M.o.k === 'p' ? S.players[M.o.id] : S.npcs && S.npcs[M.o.id];
    const inT = x => x && !x.downed && !x.dead && WORLD.bld[tileAt(x.x, x.y)] === tav;
    if (!inT(A)) { M.done = true; if (O && M.o.k === 'p') { O.gold += M.bet * 2; tell(O, (A ? A.name : 'O adversário') + ' fugiu do Tonel: o pote de ' + M.bet * 2 + ' de ouro é seu.'); sendStat(O); } continue; }
    if (!M.solo && !inT(O)) { M.done = true; A.gold += M.bet * 2; tell(A, 'Seu adversário saiu da taverna: o pote de ' + M.bet * 2 + ' de ouro é seu.'); sendStat(A); continue; }
    if (brom) near(brom.x, brom.y, { t: 'anim', w: 'n', id: 'innkeeper', a: 'talk', txt: 'Rodada ' + M.r + '!', ms: 1 });
    aleDrink(A, now, 1); if (O) { if (M.o.k === 'p') aleDrink(O, now, 1); else near(O.x, O.y, { t: 'anim', w: 'n', id: O.id, a: 'talk', txt: '🍺 *gole*', ms: 1 }); }
    const fall = (x, npc) => Math.random() < Math.max(0, M.r - 2) * 0.09 * (1 - tonelTol(x, npc));
    let fa = fall(A, false), fo = O ? fall(O, M.o.k === 'n') : false;
    if (M.solo) {
      if (fa) { M.done = true; tonelPassOut(A, false, now); sys('🍺 ' + A.name + ' caiu na rodada ' + M.r + ' do Desafio do Tonel. O Brom ri alto.'); }
      else if (M.r >= 5) { M.done = true; A.gold += 40; tonelBoard(A.name, 5); tell(A, 'Cinco canecas e de pé! Prêmio de 40 de ouro e seu nome no quadro de campeões.'); sys('🏆 ' + A.name + ' venceu o Desafio do Tonel no Ronco do Dragão!'); if (brom) near(brom.x, brom.y, { t: 'anim', w: 'n', id: 'innkeeper', a: 'talk', txt: 'Esse aí tem estômago de dragão!', ms: 1 }); sendStat(A); }
      continue;
    }
    if (fa && fo) { if (Math.random() < 0.5) fa = false; else fo = false; }
    const end = (W, Lo, loNpc) => { M.done = true; tonelPassOut(Lo, loNpc, now); const wn = W.name.split(',')[0], ln = Lo.name.split(',')[0]; if (W === A || M.o.k === 'p') { W.gold += M.bet * 2; tonelBoard(W.name, M.r); tell(W, 'Você venceu o Tonel na rodada ' + M.r + '! +' + M.bet * 2 + ' de ouro.'); sendStat(W); } sys('🏆 ' + wn + ' venceu ' + ln + ' no Desafio do Tonel (rodada ' + M.r + ').'); };
    if (fa) end(O, A, false); else if (fo) end(A, O, M.o.k === 'n');
    else if (M.r >= 12) { M.done = true; A.gold += M.bet; if (M.o.k === 'p') { O.gold += M.bet; sendStat(O); } sendStat(A); sys('🍺 Doze rodadas e ninguém caiu: empate no Tonel! Cada um leva a aposta de volta.'); }
  }
  S.tonel = L.filter(M => !M.done);
}
// Lina leva canecas às mesas de vez em quando
function gretaServe(n, now, dt) {
  const tav = TAV_BI(), hr0 = resHour(); if (hr0 < 7 || hr0 >= 23 || n.sleeping || WORLD.bld[tileAt(n.postX, n.postY)] !== tav) return false;
  if (n.serve) { const t = S.npcs[n.serve.id]; if (!t || !t.sitting) { n.serve = null; n.serveBack = true; return true; }
    if (npcWalk(n, t.x + n.serve.ox, t.y + n.serve.oy, 1.1, dt) || dist(n.x, n.y, t.x, t.y) < 1.3) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Aqui está!', 'Mais uma, saindo!', 'Cuidado que está cheia!', 'Essa é por conta da casa... brincadeira!'][Math.floor(Math.random() * 4)], ms: 1 }); setTimeout(() => { if (S.npcs[t.id]) near(t.x, t.y, { t: 'anim', w: 'n', id: t.id, a: 'talk', txt: ['Obrigado, Lina!', 'Saúde!', 'Você é um anjo.', 'Põe na conta!'][Math.floor(Math.random() * 4)], ms: 1 }); }, 1500); n.serve = null; n.serveBack = true; n.nextServe = now + 18000 + Math.random() * 25000; }
    return true; }
  if (n.serveBack) { if (npcWalk(n, n.postX, n.postY, 1.1, dt)) { n.serveBack = false; n.x = n.postX; n.y = n.postY; } return true; }
  if (now > (n.nextServe || 0)) { n.nextServe = now + 15000 + Math.random() * 20000; const pts = Object.values(S.npcs).filter(q => q.sitting && WORLD.bld[tileAt(q.x, q.y)] === tav); if (pts.length) { const t = pts[Math.floor(Math.random() * pts.length)], a = Math.random() * Math.PI * 2; n.serve = { id: t.id, ox: Math.cos(a) * 0.9, oy: Math.sin(a) * 0.9 }; return true; } }
  return false;
}
// bardo: toca na taverna à noite (19h às 23h); quem está em pé dança, os sentados aplaudem
const LEGEND = ['♪ Escutem a lenda do Ronco do Dragão... ♪', '♪ Desceu do norte, verde como o musgo, faminto de fogo... ♪', '♪ Mas sentiu o cheiro do tonel de hidromel e bebeu até a última gota! ♪', '♪ Deitou no nosso telhado e dormiu, e ronca até hoje... ♪', '♪ Quem ouve o ronco inteiro leva a sorte do dragão! ♪'];
const BARD_LINES = ['♪ Lá vem o javali, magro de dar dó... ♪', '♪ Ó Nae, cidade das torres... ♪', '♪ Bebe, bebe, que a noite é longa! ♪', '♪ O dragão voou e o rei correu... ♪', '♪ Tralalá, tralalá! ♪'];
function tavernTick(now) {
  if (now - (S.tavT || 0) < 2000) return; S.tavT = now; const tav = TAV_BI(); if (tav < 0) return; const hr = resHour(), night = hr >= 19 && hr < 23;
  let bard = Object.values(S.npcs).find(n => n.bard);
  if (night && !bard) { const T = bldTiles(tav).filter(([x, y]) => !WORLD.seats.some(s => Math.round(s.x) === x && Math.round(s.y) === y)); if (!T.length) return; let [x, y] = T[T.length - 1];
    { const tb = BUILDINGS[tav], st = interiorLayout(tb, 0).F.find(f => f.t === 'stage'); if (st) { const [sx, sy] = bLocal(tb, st.i + st.w - 1, st.j); x = sx; y = sy; } }   // no palco
    bard = { id: 'bard', kind: 'v_trav3', name: 'Filipe, o Bardo', transient: true, bard: true, bi: tav, x, y, z: 0, postX: x, postY: y, hp: 60, maxHp: 60, downed: null, dead: false, nextSong: 0 }; S.npcs.bard = bard; Net.toAll({ t: 'vspawn', v: visPublic(bard) }); }
  if (!night && bard) { visGone(bard); return; }
  if (bard && !bard.dead && !bard.downed && now > bard.nextSong) { bard.nextSong = now + 7000 + Math.random() * 5000; bard.song = (bard.song || 0) + 1; const li = bard.song % 8;   /* 5 versos da lenda, depois 3 músicas */
    near(bard.x, bard.y, { t: 'anim', w: 'n', id: bard.id, a: 'talk', txt: li < 5 ? LEGEND[li] : BARD_LINES[Math.floor(Math.random() * BARD_LINES.length)], ms: 1 });
    if (li < 5) for (const p of Object.values(S.players)) { if (WORLD.bld[tileAt(p.x, p.y)] !== tav) continue; p.legN = li === 0 ? 1 : p.legN === li ? li + 1 : 0; if (p.legN === 5) { p.legN = 0; p.buffs.luck = now_() + 600000; tell(p, '🐉 Você ouviu a lenda inteira: a sorte do dragão te acompanha por 10 minutos (+15% de ouro dos monstros).'); sendStat(p); } }
    const inside = Object.values(S.npcs).filter(q => q !== bard && !q.dead && !q.sleeping && q.kind !== 'innkeeper' && WORLD.bld[tileAt(q.x, q.y)] === tav);
    for (const q of inside) { const r = Math.random(); if (!q.sitting && !q.walk && r < 0.35) near(q.x, q.y, { t: 'anim', w: 'n', id: q.id, a: 'dance', ms: 3200 }); else if (q.sitting && r < 0.25) near(q.x, q.y, { t: 'anim', w: 'n', id: q.id, a: 'talk', txt: ['👏', 'Bravo!', 'Toca outra!', 'Essa é das boas!'][Math.floor(Math.random() * 4)], ms: 1 }); }
    for (const p of Object.values(S.players)) if (WORLD.bld[tileAt(p.x, p.y)] === tav && now - (p.danceHintT || 0) > 600000) { p.danceHintT = now; tell(p, '🎵 O bardo está tocando! Aperte T e escolha Dançar (ou Brindar 🍻 com quem está perto).'); } }   /* dica de dança, uma vez a cada 10 min */
}
function residentTick(n, now, dt) {
  if (now - (n.meetT || 0) > 1000) { n.meetT = now; memMeet(n, now); bodyReact(n, now); }
  const hr = resHour(), N = n.need || (n.need = { food: 70 + Math.random() * 30, rest: 90, social: 40 + Math.random() * 40 }), perDay = 24 / (ESTATE_DAY_MS / 1000);
  if (n.mood == null) npcMoodInit(n);
  dt *= simRate();   /* relógio do jogo */
  N.food = Math.max(0, N.food - dt * perDay * 4); N.social = Math.max(0, N.social - dt * perDay * 3); if (!n.sleeping) N.rest = Math.max(0, N.rest - dt * perDay * 5);
  let act = hr >= 22 || hr < 6 ? 'sleep' : N.rest < 12 ? 'sleep' : N.food < 25 ? 'eat' : hr < 7 ? 'home' : hr < 12 ? 'work' : hr < 13 ? 'eat' : hr < 18 ? 'work' : N.social < 75 ? 'social' : 'home';
  if (n.role === 'courier' && act === 'work') act = 'work';
  if (act === 'work' && n.role !== 'courier' && n.skipDay === estDay()) act = 'social';   /* triste: faltou ao trabalho e foi para a taverna */
  if (act === 'social' && n.gold < 3) act = 'home';   /* sem dinheiro, nada de taverna */
  if (S.simEv && S.simEv.party > gameNow() && act !== 'sleep') act = 'social';   /* festa: todo mundo na taverna */
  if (act !== n.act) { if (n.act === 'social' && (act === 'home' || act === 'sleep') && hr >= 20.5 && Math.random() < 0.4) n.drunkT = now + 150000; seatFree(n); n.act = act; n.sleeping = false; const [tx, ty] = resSpot(n, act); n.rpath = planRoute(n, tx, ty); n.arrived = false; }
  if (n.rpath && n.rpath.length) { const [wx, wy] = n.rpath[0], seatNear = n.seatK != null && n.rpath.length === 1 && dist(n.x, n.y, wx, wy) < 1.3; if (seatNear || npcWalk(n, wx, wy, 1.15, dt) || dist(n.x, n.y, wx, wy) < 0.45) { n.rpath.shift(); if (!n.rpath.length) { n.arrived = true; if (n.seatK != null || dist(n.x, n.y, wx, wy) < 0.25) { n.x = wx; n.y = wy; } if (n.seatK != null) { const s = WORLD.seats[n.seatK]; n.x = s.x; n.y = s.y; n.dir = s.dir; n.sitting = true; } } } return; }
  if (n.sitting) n.doze = n.drunkT > now && hr >= 21;   // bêbado cochila na mesa
  // chegou: efeito da atividade
  if (act === 'sleep') { n.sleeping = true; N.rest = Math.min(100, N.rest + dt * perDay * 14); }
  if (act === 'eat' || act === 'home') N.food = Math.min(100, N.food + dt * perDay * 60);
  if (act === 'eat' && hr >= 11 && hr < 14 && n.mealDay !== estDay()) { n.mealDay = estDay(); if (n.gold >= 3 && npcSpend(n, 'bakery', 3)) moodAdd(n, 1); else moodAdd(n, -1); }   /* almoço comprado na Padaria (sem dinheiro: marmita de casa) */
  if (act === 'social') N.social = Math.min(100, N.social + dt * perDay * 18);
  // conversa: quem está junto (taverna, pracinha, almoço) troca umas palavras de vez em quando
  if ((act === 'social' || act === 'eat') && now > (n.talkT || 0)) {
    n.talkT = now + 9000 + Math.random() * 16000;
    let mate = Object.values(S.npcs).find(o => o !== n && o.role && o.arrived && (o.act === 'social' || o.act === 'eat') && !o.sleeping && dist(o.x, o.y, n.x, n.y) < 3);
    if (mate) { const own = RES_LINES[n.id] || [], pool = n.sitting && Math.random() < 0.6 ? TAV_LINES : Math.random() < 0.55 && own.length ? own : RES_LINES.any; let txt = pool[Math.floor(Math.random() * pool.length)];
      { const X = S.execGossip; if (X && now < X.until && Math.random() < 0.4) { const o = S.op && S.op[n.id] && S.op[n.id][X.key], v = o ? o.v : 0, nm = X.name.split(' ')[0]; txt = (v >= 15 ? ['Ainda não acredito no que fizeram com ' + nm + '.', 'Pobre ' + nm + '... não merecia.', 'Chorei na execução de ' + nm + '.'] : v <= -15 ? [nm + ' teve o que mereceu.', 'Viu a cabeça de ' + nm + ' rolar? Bem feito.', 'A cidade está melhor sem ' + nm + '.'] : ['Viu a execução de ' + nm + '?', 'Não consigo tirar a guilhotina da cabeça.', 'Dizem que ' + nm + ' nem chorou.', 'Que dia aquele da praça...'])[Math.floor(Math.random() * 3)]; } }
      if (n.mood < 30 && Math.random() < 0.5) txt = pick(MOOD_SAD); else if (n.mood > 80 && Math.random() < 0.3) txt = pick(MOOD_HAPPY); else if (n.gold < 5 && Math.random() < 0.4) txt = pick(MOOD_BROKE);
      n.dir = dirFromVecS(mate.x - n.x, mate.y - n.y); mate.dir = dirFromVecS(n.x - mate.x, n.y - mate.y);
      const T0 = S.op[n.id]; let gossip = null; if (T0 && Math.random() < 0.6) { let b2 = null; for (const k in T0) if (!T0[k].heard && T0[k].kind && (!b2 || T0[k].mag > b2.mag)) { b2 = T0[k]; gossip = k; } if (b2) { memGossip(n, mate); const who = gossip.charAt(0).toUpperCase() + gossip.slice(1); txt = MEM_DELTA[b2.kind] > 0 ? ['Sabe ' + who + '? Gente boa.', who + ' ' + MEM_TXT[b2.kind] + '!', 'Gostei de ' + who + '.'][Math.floor(Math.random() * 3)] : ['Cuidado com ' + who + '...', who + ' ' + MEM_TXT[b2.kind] + '!', 'Não confio em ' + who + '.'][Math.floor(Math.random() * 3)]; } }
      near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt, ms: 1 });
      if (Math.random() < 0.5) setTimeout(() => { if (!mate.sleeping) near(mate.x, mate.y, { t: 'anim', w: 'n', id: mate.id, a: 'talk', txt: ['Pois é.', 'Nem me fale!', 'Hahaha!', 'Verdade...', 'Será?', 'É mesmo?'][Math.floor(Math.random() * 6)], ms: 1 }); }, 2200); }
  }
  // dono que despejou entrando na casa: o inquilino reage
  if (n.angryAt && now > (n.angryT || 0)) { const q = Object.values(S.players).find(p => p.name.trim().toLowerCase() === n.angryAt && dist(p.x, p.y, n.x, n.y) < 3.5 && WORLD.bld[tileAt(p.x, p.y)] === WORLD.bld[tileAt(n.x, n.y)]);
    if (q) { n.angryT = now + 8000; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: 'Saia da minha casa!', ms: 1 }); if (BRAVE.has(n.kind) || BRAVE.has(n.id)) n.fight = { id: q.id, until: now + 8000 }; } }
}

// ============================================================
//  MEMÓRIA DOS MORADORES — cada NPC com nome tem uma opinião (−100 a +100) sobre cada jogador; muda com o que ele VIU
//  e com a fofoca da noite (pela metade). Fica só na memória do reino: zera quando um reino novo é criado.
// ============================================================
const MEM_DELTA = { body: -12, buy: 2, gift: 8, rescue: 15, assault_me: -40, assault: -15, murder: -40, jailed: -10, executed: -10, evict: -60, thief: 12 };
const MEM_TXT = { body: 'arrastava um corpo pela cidade', buy: 'comprou na loja', gift: 'deu um presente', rescue: 'salvou alguém', assault_me: 'me agrediu', assault: 'agrediu alguém', murder: 'matou alguém', jailed: 'foi preso', executed: 'foi levado à guilhotina', evict: 'me despejou', thief: 'pegou um ladrão' };
S.op = S.op || {};
const memKey = p => String(p.name || '').trim().toLowerCase();
function opOf(n, p) { const o = S.op[n.id] && S.op[n.id][memKey(p)]; return o ? o.v : 0; }
function opLevel(v) { return v >= 50 ? { k: 'amigo', n: 'Amigo' } : v >= 15 ? { k: 'simpatico', n: 'Simpático' } : v > -15 ? { k: 'neutro', n: 'Neutro' } : v > -50 ? { k: 'desconfiado', n: 'Desconfiado' } : { k: 'inimigo', n: 'Inimigo' }; }
function memAdd(n, p, kind, heard, from) {
  if (!n || n.kind === 'guard' || n.kind === 'captain' || n.transient || !p || p.dev) return; const k = memKey(p);
  if (!heard && /^(assault|assault_me|murder|body|executed)$/.test(kind)) moodAdd(n, kind === 'murder' || kind === 'assault_me' ? -8 : -4);
  const T = (S.op[n.id] = S.op[n.id] || {}), o = T[k] || (T[k] = { v: 0, why: '', mag: 0, heard: false });
  if (!heard && o.lk === kind && now_() - (o.lt || 0) < 6000) return; if (!heard) { o.lk = kind; o.lt = now_(); }   // vários golpes seguidos contam como uma vez
  const d = (MEM_DELTA[kind] || 0) * (heard ? 0.5 : 1); o.v = clamp(o.v + d, -100, 100); repAdd(p, npcGroup(n.id, n.kind), d * (heard ? 0.1 : 0.2));
  if (Math.abs(d) >= o.mag * 0.6 || !o.why) { const me1 = n.name.split(',')[0], pers = { assault_me: 'atacou ', evict: 'despejou ' };
    o.why = heard ? 'ouviu de ' + from + ' que você ' + (pers[kind] ? pers[kind] + from : MEM_TXT[kind]) : pers[kind] ? 'você ' + pers[kind] + me1 : 'viu você: ' + MEM_TXT[kind]; o.mag = Math.abs(d); o.kind = kind; o.heard = !!heard; }
}
// todo mundo com nome que viu (perto e com linha de visão, ou dentro do mesmo prédio)
function memEvent(p, x, y, kind, victim) {
  if (!p || p.dev || !S.npcs) return; const bi = WORLD.bld[tileAt(x, y)];
  const seen = [];
  for (const n of Object.values(S.npcs)) { if (n.dead || n.sleeping || n === victim) continue; const d = dist(n.x, n.y, x, y); if (d > 9) continue; const nb = WORLD.bld[tileAt(n.x, n.y)]; if (!(nb === bi && bi >= 0) && !sightClear(n.x, n.y, x, y)) continue; memAdd(n, p, kind); seen.push(n.id); }
  if ((kind === 'murder' || kind === 'assault') && seen.length) { const W = (S.wit = S.wit || {})[memKey(p)] = (S.wit[memKey(p)] || []).filter(w => now_() - w.t < 1800000); W.push({ kind, t: now_(), vic: victim ? victim.id : null, seen }); }
  if (victim) memAdd(victim, p, kind === 'assault' ? 'assault_me' : kind);
}
// fofoca: quem conversa passa adiante a lembrança mais forte que tem (pela metade)
function memGossip(a, b) {
  const T = S.op[a.id]; if (!T) return; let best = null, bk = null; for (const k in T) if (!T[k].heard && T[k].kind && (!best || T[k].mag > best.mag)) { best = T[k]; bk = k; }
  if (!best || !best.kind) return; const Tb = (S.op[b.id] = S.op[b.id] || {}); if (Tb[bk] && Tb[bk]._from === a.id + best.kind) return;
  const fake = { name: bk }; memAdd(b, fake, best.kind, true, a.name.split(',')[0]); Tb[bk]._from = a.id + best.kind;
}
function opInfo(n, p) { const o = S.op[n.id] && S.op[n.id][memKey(p)], v = o ? o.v : 0, L = opLevel(v); return { lv: L.k, ln: L.n, why: o ? o.why : 'nunca ouviu falar de você' }; }
function opPriceMul(n, p) { const v = opOf(n, p), b = v >= 50 ? 0.85 : v >= 15 ? 0.95 : v > -15 ? 1 : v > -50 ? 1.2 : 0; return b ? b * repPriceMul(repOf(p)) : 0; }
// reações ao encontrar: amigo cumprimenta pelo nome (e às vezes dá um presentinho); inimigo chama a guarda
function memMeet(n, now) {
  if (n.dead || n.downed || n.sleeping || n.kind === 'guard' || n.transient) return;
  for (const p of Object.values(S.players)) {
    if (p.dev || dist(n.x, n.y, p.x, p.y) > 3.2) continue; const v = opOf(n, p), key = n.id + '|' + memKey(p); S.meetT = S.meetT || {};
    if (now - (S.meetT[key] || 0) < 120000) continue;
    if (v >= 15) { S.meetT[key] = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: (v >= 50 ? ['Olá, ', 'Que bom te ver, ', 'Salve, ', 'Ei, '] : ['Bom dia, ', 'Olá, ']).sort(() => Math.random() - 0.5)[0] + p.name + '!', ms: 1 });
      if (v >= 50 && Math.random() < 0.15 && (p.inv.apple || Object.keys(p.inv).length < INV_SLOTS)) { const it = Math.random() < 0.5 ? 'apple' : 'bread'; if (p.inv[it] || Object.keys(p.inv).length < INV_SLOTS) { p.inv[it] = (p.inv[it] || 0) + 1; tell(p, n.name.split(',')[0] + ' te deu ' + (it === 'apple' ? 'uma maçã' : 'um pão') + ', de presente.'); sendStat(p); } } }
    else if (v <= -50) { S.meetT[key] = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt: 'É ele! Guardas!', ms: 1 }); const g = Object.values(S.npcs).filter(q => q.kind === 'guard' && !q.dead && !q.downed && !q.lead && !q.carrying).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0]; if (g && dist(g.x, g.y, n.x, n.y) < 35) g.alert = { x: p.x, y: p.y, until: now + 15000 }; }
    else if (v <= -15 && Math.random() < 0.3) { S.meetT[key] = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Hmpf.', 'Fique longe.', 'Já ouvi falar de você.'][Math.floor(Math.random() * 3)], ms: 1 }); }
  }
}

// ============================================================
//  TRABALHOS — coleta com ferramenta (lenhador, minerador, herbalista), bicos (água, caixas, varrer), entregas,
//  turnos nos negócios. Tudo dá ouro, XP do personagem (menos que caçar) e XP de ofício (nível 1 a 10).
// ============================================================
function profGain(p, k, amt) { p.prof = p.prof || {}; const before = profLv(p.prof[k]); p.prof[k] = (p.prof[k] || 0) + amt; const after = profLv(p.prof[k]); if (after > before) tell(p, PROFS[k] + ' subiu para o nível ' + after + '!'); }
function carve(p, k) {
  const R = CARVE[k], now = now_(); if (!R || p.downed || p.bound || p.jailUntil > now || now < (p.carveT || 0)) return;
  if (!p.inv.axe) { tell(p, 'Precisa de um machado para entalhar (Empório do Borin).'); return; }
  const lv = profLv((p.prof || {}).artesao); if (lv < R.lv) { tell(p, 'Precisa de Artesão nível ' + R.lv + ' para essa varinha.'); return; }
  for (const g in R.need) if ((p.inv[g] || 0) < R.need[g]) { tell(p, 'Falta ' + (R.need[g] - (p.inv[g] || 0)) + 'x ' + LOOT[g].name.toLowerCase() + '.'); return; }
  p.carveT = now + 2600; sheatheToggle(p, true, true);
  near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'gather', ms: 2400 });
  setTimeout(() => {
    if (!S.players[p.id] || p.downed) return;
    for (const g in R.need) if ((p.inv[g] || 0) < R.need[g]) return;
    if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; }
    for (const g in R.need) { p.inv[g] -= R.need[g]; if (!p.inv[g]) delete p.inv[g]; }
    p.inv[k] = (p.inv[k] || 0) + 1; profGain(p, 'artesao', 8 + R.lv * 2); gainXp(p, 2 + R.lv);
    Net.toOne(p.id, { t: 'loot', k }); tell(p, 'Você entalhou: ' + LOOT[k].name + '.'); sendStat(p);
  }, 2500);
}
function gather(p, m) {
  const i = m.i | 0, o = WORLD.obj[i], x = i % MAP_W, y = Math.floor(i / MAP_W), G0 = gatherOf(o), now = now_();
  const stop = t => { if (t) tell(p, t); Net.toOne(p.id, { t: 'gstop' }); };
  if (!G0 || p.downed || p.bound || dist(p.x, p.y, x, y) > 1.9) return stop();
  if (now < (p.gatherT || 0)) return; p.taskT = now;
  if (!p.inv[G0.tool]) return stop('Você precisa de ' + LOOT[G0.tool].name.toLowerCase() + ' (Empório do Borin).');
  const lv = profLv((p.prof || {})[G0.prof]); if (lv < G0.min) return stop('Precisa de ' + PROFS[G0.prof] + ' nível ' + G0.min + ' para isso.');
  const rare = Math.random() < G0.rp + lv * 0.012, item = rare ? G0.rare : G0.item, n = 1 + (lv >= 5 && Math.random() < 0.3 ? 1 : 0);
  if (!p.inv[item] && Object.keys(p.inv).length >= INV_SLOTS) return stop('Sua mochila está cheia.');
  p.gatherT = now + 1200; p.inv[item] = (p.inv[item] || 0) + n; if (typeof empGather === 'function') empGather(p, item, x, y, COLL_ANIM[G0.tool]);
  if (o === O.TALLGRASS || o === O.FERN) { setObj(i, O.NONE); (S.objBack = S.objBack || []).push({ i, o, at: now + 120000 }); }
  else if (o === O.WHEAT) { setObj(i, O.WHEATSPROUT); (S.objBack = S.objBack || []).push({ i, o, at: now + 150000 }); }   // o trigo volta a crescer
  else {   // árvore e pedra aguentam alguns golpes; no último a árvore cai (vira toco) e a pedra se desfaz
    S.nodeHits = S.nodeHits || {}; const hits = (S.nodeHits[i] || 0) + 1, max = o === O.OAK || o === O.BOULDER ? 4 : 3;
    if (hits >= max) {
      delete S.nodeHits[i]; const tree = G0.tool === 'axe';
      near(x, y, { t: tree ? 'tfall' : 'crumble', i, o, a: Math.atan2(y - p.y, x - p.x) });
      setObj(i, tree ? O.STUMP : O.NONE); (S.objBack = S.objBack || []).push({ i, o, at: now + (tree ? 300000 : 240000) });
      Net.toOne(p.id, { t: 'gstop' }); tell(p, tree ? 'Madeira! A árvore caiu.' : 'A pedra se desfez.');
    } else S.nodeHits[i] = hits;
  }
  profGain(p, G0.prof, 6); gainXp(p, 3 + lv); Net.toOne(p.id, { t: 'loot', k: item }); if (rare) tell(p, 'Raro! Você achou ' + LOOT[item].name.toLowerCase() + '.'); sendStat(p);
}
// ---------- bicos e entregas: uma tarefa com passos (pegar/levar/varrer); ofertas no quadro de avisos e com quem oferece ----------
function jobSpots() {
  if (S.jspots) return S.jspots; const sp = S.jspots = {};
  const tav = BUILDINGS.find(b => b.kind === 'tavern'), emp = BUILDINGS[1];
  let well = null, bd = 1e9; for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (WORLD.obj[y * MAP_W + x] === O.WELL && inSafe(x, y)) { const d = dist(x, y, tav.x, tav.y); if (d < bd) { bd = d; well = [x + 0.9, y + 0.9]; } }
  sp.well = well || [CENTER, CENTER + 12]; sp.tav = doorOutPt(BUILDINGS.indexOf(tav)); sp.emp = doorOutPt(1); sp.crates = [CENTER - 30.3, CENTER + 9.6];
  sp.sweep = [[CENTER + 16, CENTER - 4], [CENTER + 20, CENTER - 4], [CENTER + 20, CENTER], [CENTER + 16, CENTER]];
  return sp;
}
function jobOffer(type, p) {
  const sp = jobSpots(), lv = k => profLv((p.prof || {})[k]);
  if (type === 'water') return { type, title: 'Água para a taverna', giver: 'Brom', prof: 'biscateiro', pay: 10 + lv('biscateiro'), xp: 14, carry: 1, steps: [0, 1, 2].flatMap(() => [{ x: sp.well[0], y: sp.well[1], k: 'pick', t: 'Encher o balde no poço' }, { x: sp.tav[0], y: sp.tav[1], k: 'drop', t: 'Levar à porta da taverna' }]) };
  if (type === 'crates') return { type, title: 'Caixas para o Empório', giver: 'Borin', prof: 'biscateiro', pay: 12 + lv('biscateiro'), xp: 16, carry: 1, steps: [0, 1, 2].flatMap(() => [{ x: sp.crates[0], y: sp.crates[1], k: 'pick', t: 'Pegar uma caixa no armazém (junto à muralha)' }, { x: sp.emp[0], y: sp.emp[1], k: 'drop', t: 'Levar à porta do Empório' }]) };
  if (type === 'sweep') return { type, title: 'Varrer a praça do chafariz', giver: 'Tobias', prof: 'biscateiro', pay: 9 + lv('biscateiro'), xp: 12, steps: sp.sweep.map(([x, y]) => ({ x, y, k: 'sweep', t: 'Varrer este canto da praça' })) };
  if (type === 'delivery') {   // de um prédio com gente para outro; mais longe = paga mais (nível alto libera as longas)
    const places = BUILDINGS.map((b, bi) => ({ b, bi })).filter(o => ['shop', 'smith', 'tavern', 'workshop', 'boutique', 'jail', 'barracks', 'temple', 'manor', 'fruithouse'].includes(o.b.kind));
    const L = lv('mensageiro'), maxD = 30 + L * 8; let A = null, B = null;
    for (let k = 0; k < 40 && !B; k++) { A = places[Math.floor(Math.random() * places.length)]; const C2 = places[Math.floor(Math.random() * places.length)]; const d = dist(A.b.x, A.b.y, C2.b.x, C2.b.y); if (C2 !== A && d > 12 && d < maxD) B = C2; }
    if (!B) return null; const d = Math.round(dist(A.b.x, A.b.y, B.b.x, B.b.y)), nm = o => o.b.name || ({ house: 'casa', workshop: 'oficina' })[o.b.kind] || o.b.kind;
    return { type, title: 'Entrega: ' + nm(A) + ' → ' + nm(B), giver: 'Pip', prof: 'mensageiro', pay: 8 + Math.round(d / 2.5) + L * 2, xp: 10 + Math.round(d / 2), carry: 1, steps: [{ x: doorOutPt(A.bi)[0], y: doorOutPt(A.bi)[1], k: 'pick', t: 'Pegar o pacote em ' + nm(A) }, { x: doorOutPt(B.bi)[0], y: doorOutPt(B.bi)[1], k: 'drop', t: 'Entregar em ' + nm(B) }] };
  }
  return null;
}
function jobMsg(p, m) {
  const now = now_();
  if (m.a === 'board') { const offers = ['water', 'crates', 'sweep', 'delivery', 'delivery'].map(t => jobOffer(t, p)).filter(Boolean); p.jobOffers = offers; Net.toOne(p.id, { t: 'jobs', offers: offers.map(o => ({ title: o.title, giver: o.giver, pay: o.pay, prof: o.prof, n: o.steps.length })), job: p.job ? jobView(p) : null, prof: p.prof || {} }); return; }
  if (m.a === 'take') { if (p.job) { tell(p, 'Termine (ou desista) do trabalho atual primeiro.'); return; } const o = m.type ? jobOffer(String(m.type), p) : (p.jobOffers || [])[m.k | 0]; if (!o) return; p.job = { ...o, i: 0, t0: now }; p.pkg = false; p.uni = ({ sweep: 4, delivery: 5 })[o.type] || 7; tell(p, 'Trabalho aceito: ' + o.title + ' (' + o.pay + ' ouro). Siga o marcador.'); Net.toOne(p.id, { t: 'job', job: jobView(p) }); return; }
  if (m.a === 'quit') { if (!p.job) return; p.job = null; p.pkg = false; if (!p.shift) p.uni = 0; tell(p, 'Você desistiu do trabalho.'); Net.toOne(p.id, { t: 'job', job: null }); return; }
  if (m.a === 'step') {
    const J = p.job; if (!J || p.downed) return; const st = J.steps[J.i]; if (!st || dist(p.x, p.y, st.x, st.y) > 1.8) { tell(p, 'Chegue mais perto do marcador.'); return; }
    if (st.k === 'pick') p.pkg = true; if (st.k === 'drop') p.pkg = false;
    if (st.k === 'sweep') near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'sweep', ms: 1500 });
    J.i++;
    if (J.i >= J.steps.length) { featAdd(p, 'jobs'); p.gold += J.pay; profGain(p, J.prof, 8 + J.steps.length); gainXp(p, J.xp); tell(p, 'Trabalho feito: +' + J.pay + ' de ouro. ' + J.giver + ' agradece!'); const giver = Object.values(S.npcs).find(n => n.name.startsWith(J.giver)); if (giver) memAdd(giver, p, 'gift'); p.job = null; p.pkg = false; if (!p.shift) p.uni = 0; sendStat(p); Net.toOne(p.id, { t: 'job', job: null }); return; }
    Net.toOne(p.id, { t: 'job', job: jobView(p) }); return;
  }
}
function jobView(p) { const J = p.job; return J ? { title: J.title, pay: J.pay, i: J.i, n: J.steps.length, step: J.steps[J.i], carry: !!p.pkg } : null; }
// ---------- turno num negócio: F no balcão/bancada, fica 1 hora do jogo (30 s) trabalhando; sair no meio paga a parte feita ----------
const SHIFT_MS = BIZ_HOUR_MS * 2.5;   // turno: 2,5 horas do jogo (1 min e 15 s)
function shiftMsg(p, m) {
  const now = now_();
  if (m.a === 'start') {
    const bi = WORLD.bld[tileAt(p.x, p.y)], b = BUILDINGS[bi]; if (bi < 0 || !b || p.shift || p.downed || p.bound) return; sheatheToggle(p, true, true);
    const st = Object.values(S.npcs).find(n => (n.bi === bi || WORLD.bld[tileAt(n.postX, n.postY)] === bi) && n.kind !== 'guard'); const P = PROPS.find(q => q.bi === bi);
    if (!st && !(P && S.estate && S.estate.r[P.id])) { tell(p, 'Aqui não tem trabalho.'); return; }
    const shop = ['shop', 'tavern', 'boutique', 'fruithouse'].includes(b.kind), prof = shop ? 'comerciante' : 'artesao';
    p.uni = b.kind === 'bank' ? 6 : b.kind === 'smith' ? 1 : b.kind === 'workshop' ? ({ saw: 1, carp: 1, mine: 7, farm: 7, alch: 2 })[b.wk] || 1 : b.shopType === 'apoth' ? 2 : 3;
    p.shift = { bi, t0: now, until: now + SHIFT_MS, prof, pid: P && S.estate && S.estate.r[P.id] ? P.id : null, x: p.x, y: p.y, rev0: P && S.estate && S.estate.r[P.id] && S.estate.r[P.id].biz ? S.estate.r[P.id].biz.today.rev : 0 };
    tell(p, 'Você começou um turno em ' + (b.name || 'um negócio') + '. Fique por aqui até o fim (1 min e 15 s).'); Net.toOne(p.id, { t: 'shift', on: 1, ms: SHIFT_MS }); return;
  }
  if (m.a === 'stop') shiftEnd(p, false);
}
function ownerShiftMake(r, P, frac, lv) {   /* o dono no turno ajuda a produzir: oficina faz a produção extra, loja faz itens da prateleira (matéria-prima paga pelo cofre) */
  const B = r.biz, W = WORKS[P.wk], k = frac * (1 + 0.1 * (lv || 0)), out = {}, add = (g, q) => { if (q > 0) out[g] = (out[g] || 0) + q; };
  if (P.kind === 'shop') { const GS = SHOP_GOODS[P.shopType] || []; let n = Math.round(3 * k);
    while (n-- > 0 && GS.length && stockSum(B.stock) < shopCap(B)) { const g = GS.slice().sort((a, b) => (B.stock[a] || 0) - (B.stock[b] || 0))[0], c = Math.ceil(GOODS[g].p * 0.5); if (B.cofre < c) break; B.cofre -= c; B.today.cost += c; B.stock[g] = (B.stock[g] || 0) + 1; add(g, 1); } }
  else if (W && W.make) { for (const g in W.make) { const q = Math.floor(W.make[g] * 2.5 * k + Math.random()); const room = Math.max(0, WS_CAP - stockSum(B.store)); const v = Math.min(q, room); if (v > 0) { B.store[g] = (B.store[g] || 0) + v; add(g, v); } } }
  else if (W && W.recipes) { let n = Math.round(4 * k);
    while (n-- > 0 && stockSum(B.store) < WS_CAP) { let mk = null; for (const rk of bizRecipes(B, W)) { const rec = W.recipes[rk]; if (Object.keys(rec).every(g => (B.store[g] || 0) >= rec[g])) { for (const g in rec) B.store[g] -= rec[g]; B.store[rk] = (B.store[rk] || 0) + 1; mk = rk; break; } } if (!mk) break; add(mk, 1); } }
  const txt = Object.entries(out).map(([g, q]) => q + ' ' + (GOODS[g] ? GOODS[g].n : g)).join(', ');
  if (txt) bizLog(B, 'Você trabalhou um turno e fez ' + txt + '.'); return txt;
}
function shiftEnd(p, done) {
  const S0 = p.shift; if (!S0) return; p.shift = null; if (!p.job) p.uni = 0; const now = now_(), frac = Math.min(1, (now - S0.t0) / (S0.until - S0.t0)), lv = profLv((p.prof || {})[S0.prof]);
  let pay = Math.floor((8 + lv * 2) * 4 * frac); const r = S0.pid && S.estate.r[S0.pid];
  if (r && r.biz && r.owner !== estOwner(p)) { pay = Math.min(pay, Math.floor(r.biz.cofre)); r.biz.cofre -= pay; bizLog(r.biz, p.name + ' trabalhou um turno (' + pay + ' ouro do cofre).'); }
  else if (r && r.owner === estOwner(p)) pay = 0;   // trabalhar no próprio negócio: sem salário, mas produz mais
  if (done) featAdd(p, 'shifts'); p.gold += pay; if (frac > 0.2) { profGain(p, S0.prof, Math.round(10 * frac)); gainXp(p, Math.round((8 + lv) * frac)); }
  if (r && r.owner === estOwner(p)) { const got = Math.max(0, Math.round((r.biz.today.rev || 0) - (S0.rev0 || 0))), made = frac > 0.2 && r.biz ? ownerShiftMake(r, PROPS_BY[S0.pid], frac, lv) : ''; info(p, (done ? 'Turno completo' : 'Você saiu do turno') + ' no seu negócio: sem salário (o dinheiro já é seu)' + (made ? '. Com as suas mãos você fez ' + made : '') + '; o negócio rendeu +' + got + ' de ouro para o banco enquanto você trabalhava (+80% de vendas e produção).'); }
  else info(p, done ? 'Turno completo: +' + pay + ' de ouro.' : 'Você saiu no meio do turno: +' + pay + ' de ouro.');
  { const v = r && r.owner === estOwner(p) ? Math.max(0, Math.round((r.biz.today.rev || 0) - (S0.rev0 || 0))) : pay; if (done && v > 0) Net.toOne(p.id, { t: 'pay', v, own: r && r.owner === estOwner(p) ? 1 : 0 }); }   // o salário sobe em cima do personagem
  sendStat(p); Net.toOne(p.id, { t: 'shift', on: 0 });
}
function jobsTick(now) {
  try { mageTick(now); } catch (e) { console.warn('magia', e); }
  for (const p of Object.values(S.players)) {
    if (p.autoShea && p.sheathed && !p.sheT && now - (p.taskT || 0) > 3500 && !p.carrying && !p.drag && !p.shift && !p.downed && !p.bound) { p.autoShea = false; sheatheToggle(p, false); }
    if (p.shift) { const out = WORLD.bld[tileAt(p.x, p.y)] !== p.shift.bi; if (out || p.downed) shiftEnd(p, false); else if (now >= p.shift.until) { shiftEnd(p, true); shiftMsg(p, { a: 'start' }); } }   // turno seguido: só para quando sair do prédio
    if (p.job && p.downed && p.pkg) { tell(p, 'Você caiu e o pacote se perdeu. Trabalho perdido.'); p.job = null; p.pkg = false; p.uni = 0; Net.toOne(p.id, { t: 'job', job: null }); }
  }
}
// quem trabalha num negócio de jogador faz a loja vender e a oficina produzir 50% a mais naquela hora
const workerAt = bi => Object.values(S.players).some(p => p.shift && p.shift.bi === bi);
const ownerWorkMul = (r, P) => Object.values(S.players).some(p => p.shift && p.shift.bi === P.bi && r.owner === estOwner(p)) ? 1.8 : 1;   // o dono trabalhando no próprio negócio: +80%

// ============================================================
//  POPULAÇÃO FLUTUANTE — donas de casa, viajantes e visitantes entram pelos portões, circulam, compram de verdade
//  nas lojas dos jogadores e vão embora; raramente aparece um marginal que pode cometer um crime casual.
// ============================================================
function dayInfoS() { const ph = (gameNow() % ESTATE_DAY_MS) / ESTATE_DAY_MS, sun = Math.cos(ph * Math.PI * 2); return { night: sun < -0.25 }; }
const VIS_NAMES = { f: ['Ana', 'Beatriz', 'Celeste', 'Dália', 'Eva', 'Flora', 'Glória', 'Helena', 'Inês', 'Joana', 'Lúcia', 'Marina', 'Nádia', 'Olga', 'Rita', 'Sara', 'Teresa', 'Vera'], m: ['Abel', 'Bento', 'Caio', 'Davi', 'Edgar', 'Fábio', 'Gil', 'Hugo', 'Ivo', 'Júlio', 'Lauro', 'Mauro', 'Nico', 'Otávio', 'Paulo', 'Rui', 'Saulo', 'Tito', 'Vasco'] };
const VIS_TYPES = { gym: { n: 'praticante', looksF: ['v_gymf'], looksM: ['v_gymm'], g: 'x' }, offg: { n: 'sentinela de folga', looks: ['v_offguard'], g: 'm' }, house: { n: 'dona de casa', looks: ['v_house1', 'v_house2', 'v_house3', 'v_house4'], g: 'f' }, trav: { n: 'viajante', looks: ['v_trav1', 'v_trav2', 'v_trav3', 'v_monk'], g: 'm' }, vis: { n: 'visitante', looksF: ['v_vis2', 'v_noblef', 'v_peasf', 'v_elderf'], looksM: ['v_vis1', 'v_noblem', 'v_peasm', 'v_elderm'], g: 'x' }, thug: { n: 'marginal', looks: ['v_thug1', 'v_thug2'], g: 'm' } };
const VIS_TITLE = { v_monk: 'peregrino', v_noblef: 'dama da corte', v_noblem: 'nobre de passagem', v_peasm: 'camponês', v_peasf: 'camponesa', v_elderm: 'ancião', v_elderf: 'anciã', v_trav3: 'menestrel' };
const visGates = () => { const x0 = CENTER - 32; return [[CENTER + 0.5, CENTER + 30.5], [x0 + 3, CENTER + 5.5], [CENTER + 0.5, CENTER - 30.5], [CITY_X1 - 2.5, CENTER + 0.5]]; };
const VIS_HUB = [CENTER + 0.5, CENTER + 12];
function visPublic(n) { return { id: n.id, kind: n.kind, name: n.name, x: n.x, y: n.y, trader: n.trader ? 1 : 0, bard: n.bard ? 1 : 0 }; }
function visSpawn(now, force) {
  const night = typeof dayInfoS === 'function' ? dayInfoS().night : false, r = Math.random();
  const type = force || (r < 0.07 ? 'thug' : r < 0.42 ? 'house' : r < 0.7 ? 'trav' : 'vis'), T = VIS_TYPES[type];
  if (type === 'house' && night && !force) return;   // compras são de dia
  const gk = Math.floor(Math.random() * 4), gate = visGates()[gk], g = T.g === 'x' ? (Math.random() < 0.5 ? 'f' : 'm') : T.g;
  const nm = VIS_NAMES[g][Math.floor(Math.random() * VIS_NAMES[g].length)], id = 'v_' + (S.visN = (S.visN || 0) + 1), pool = T.looks || (g === 'f' ? T.looksF : T.looksM), kind = pool[Math.floor(Math.random() * pool.length)];
  const n = { id, kind, name: nm + ', ' + (VIS_TITLE[kind] || T.n), transient: true, vtype: type, x: gate[0] + (Math.random() - 0.5), y: gate[1], z: 0, postX: gate[0], postY: gate[1], hp: 60, maxHp: 60, downed: null, dead: false, gate: gk, stops: visPlan(type), si: 0, wait: 0, born: now };
  if (type === 'trav' && (force || Math.random() < 0.35)) { n.trader = true; n.name = nm + ', mercador viajante'; }   // alguns viajantes trazem coisas raras
  S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) });
}
// parada no banco: na frente de um banqueiro (o ponto livre mais próximo; quem chega depois espera atrás, formando fila)
function bankStop() {
  const bks = Object.values(S.npcs || {}).filter(q => /^banker\d?$/.test(q.kind) && !q.dead && !q.downed && !q.sleeping); if (!bks.length) return null;
  const b = bks[Math.floor(Math.random() * bks.length)], bb = BUILDINGS.find(q => q.kind === 'bank'), [dx, dy] = bb ? doorTile(bb) : [b.x, b.y + 2], d = Math.hypot(dx - b.x, dy - b.y) || 1;
  return { x: b.x + (dx - b.x) / d * 1.6, y: b.y + (dy - b.y) / d * 1.6, w: 9000 + Math.random() * 7000, bank: b.id };
}
function bankBook(v, txt) { const O = bankOwnerRec(); if (O && O.biz) { O.biz.cofre += v; O.biz.today.rev += v; O.biz.today.sold++; if (txt) bizLog(O.biz, txt); } }
function npcBankVisit(n, bid) {   // o que o morador faz no balcão (o banco ganha uma taxa ou juros)
  const bk = S.npcs[bid], nm = n.name.split(',')[0], r = Math.random(), E = estateLoad(); E.npcLoans = E.npcLoans || [];
  let fee = 0, txt = '', say = '';
  if (r < 0.4) { fee = 1 + Math.floor(Math.random() * 3); txt = nm + (Math.random() < 0.5 ? ' depositou' : ' sacou') + ' economias (taxa ' + fee + ').'; say = ['Quero guardar isto aqui.', 'Vou sacar um pouco.', 'Meu saldo, por favor.'][Math.floor(Math.random() * 3)]; }
  else if (r < 0.6) { fee = 2 + Math.floor(Math.random() * 4); txt = nm + ' trocou moedas estrangeiras (taxa ' + fee + ').'; say = 'Moedas do sul, quanto valem?'; }
  else if (r < 0.75) { fee = 3 + Math.floor(Math.random() * 4); txt = nm + ' guardou um objeto de valor no cofre (taxa ' + fee + ').'; say = 'Guarde isto com cuidado.'; }
  else if (r < 0.9 && E.npcLoans.length < 12) { const amt = 40 + Math.floor(Math.random() * 120); E.npcLoans.push({ n: nm, left: Math.round(amt * 1.12), amt, day: estDay(), bad: Math.random() < 0.12 }); txt = nm + ' pegou um empréstimo de ' + amt + ' (vai pagar ' + Math.round(amt * 1.12) + ' com juros).'; say = 'Preciso de um empréstimo...'; }
  else { say = 'Só vim conferir meu saldo.'; }
  if (fee || txt) bankBook(fee, txt);
  near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: say, ms: 1 });
  if (bk) setTimeout(() => { if (S.npcs[bk.id]) near(bk.x, bk.y, { t: 'anim', w: 'n', id: bk.id, a: 'talk', txt: ['Certamente.', 'Assine aqui, por favor.', 'Pronto, está feito.', 'O próximo!'][Math.floor(Math.random() * 4)], ms: 1 }); }, 1600);
  estateSave();
}
// a cada hora do jogo, os moradores pagam parcelas dos empréstimos (alguns atrasam; poucos somem sem pagar)
function npcLoansHour() {
  const E = estateLoad(), L = E.npcLoans || []; if (!L.length) return;
  for (let i = L.length - 1; i >= 0; i--) { const x = L[i];
    if (x.bad && Math.random() < 0.04) { L.splice(i, 1); const O = bankOwnerRec(); if (O && O.biz) bizLog(O.biz, x.n + ' sumiu sem pagar o empréstimo (' + x.left + ' perdidos).'); continue; }
    if (Math.random() < (x.bad ? 0.08 : 0.25)) { const v = Math.min(x.left, Math.max(5, Math.round(x.amt * 0.2))); x.left -= v; bankBook(v * 0.25, null); if (x.left <= 0) { L.splice(i, 1); bankBook(0, x.n + ' quitou o empréstimo.'); } } }   // o banco fica com os juros (parte da parcela)
}
function kneelTick(now) {   /* candidatos ajoelhados nas almofadas da agência (pose seiza repetida) */
  if (now - (S.kneelT || 0) < 8500) return; S.kneelT = now;
  for (const n of Object.values(S.npcs || {})) if (n.kneel && !n.dead && !n.downed) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'seiza', ms: 9000 });
}
function dojoVisTick(now) {   /* de manhã (6–9 h) moradores; no fim da tarde (17–20 h) sentinelas de folga */
  if (now - (S.dojoVT || 0) < 15000 || !Object.keys(S.players).length || !DUMMIES.length) return; S.dojoVT = now; const hr = resHour();
  const morning = hr >= 6 && hr < 10, evening = hr >= 17 && hr < 21; if (!morning && !evening) return;
  const D = dojoRec(); if (D && D.B && D.B.closed) return; const fee = D && D.B ? D.B.fee ?? 1 : 1, want = [3, 2, 1][fee];
  const have = Object.values(S.npcs).filter(n => n.transient && (n.vtype === 'gym' || n.vtype === 'offg')).length; if (have >= want || Math.random() < 0.4) return;
  visSpawn(now, evening && Math.random() < 0.7 ? 'offg' : 'gym');
}
function tatamiSpots() { const b = BUILDINGS.find(q => q.kind === 'dojo'); if (!b) return []; return [bLocal(b, 2, 2), bLocal(b, 3, 3), bLocal(b, 1, 3), bLocal(b, 2, 4)].map(([x, y], k) => ({ x, y, k })); }   /* duas duplas no tatame */
function tatamiTaken() { const t = new Set(); for (const n of Object.values(S.npcs)) { const st = n.stops && n.stops[n.si]; if (st && st.dojo === -1 && st.tk != null) t.add(st.tk); if (n.spar != null) t.add(n.spar); } return t; }
function dojoStop() {   /* um boneco livre, ou o tatame (lutar com outro praticante) */
  { const T = tatamiSpots(), taken = tatamiTaken(), free = T.filter(q => !taken.has(q.k)); if (free.length && (Math.random() < 0.45 || taken.size === 1)) { const q = free[0]; return { x: q.x, y: q.y, w: 40000 + Math.random() * 20000, dojo: -1, tk: q.k }; } }
  const used = new Set(Object.values(S.npcs).map(n => n.dojoDummy != null ? n.dojoDummy : (n.stops && n.stops[n.si] && n.stops[n.si].dojo)).filter(v => v != null && v >= 0));   /* também os que estão a caminho */ for (const p of Object.values(S.players)) if (p.train) used.add(p.train.i);
  const free = DUMMIES.map((d, i) => i).filter(i => !used.has(i) && !DUMMIES[i].priv); const i = free.length ? free[Math.floor(Math.random() * free.length)] : -1;
  if (i >= 0) { const d = DUMMIES[i]; return { x: d.fx, y: d.fy, w: 35000 + Math.random() * 25000, dojo: i }; }
  const b = BUILDINGS.find(q => q.kind === 'dojo'), [x, y] = bLocal(b, 2, 2); return { x: x + Math.random(), y: y + Math.random(), w: 30000, dojo: -1 };
}
function dojoNpcTrain(n, st, now) {   /* o visitante treina: paga a diária ao chegar e bate no boneco */
  if (!n.dojoPaid) { n.dojoPaid = 1; n.dojoDummy = st.dojo >= 0 ? st.dojo : null; const D = dojoRec(); if (D && D.B && !dojoReception() && Math.random() < 0.3) bizLog(D.B, n.name.split(',')[0] + ' entrou sem pagar (não havia ninguém na recepção).'); else dojoEarn(dojoFee(), n.name.split(',')[0] + ' pagou a diária para treinar.'); }
  if (now < (n.dojoT || 0)) return; n.dojoT = now + 1200 + Math.random() * 500; const d = DUMMIES[st.dojo];
  if (d) { n.dir = dirFromVecS(d.x - n.x, d.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'punch', tx: d.x, ty: d.y, ms: 700 }); near(d.x, d.y, { t: 'dummyhit', i: st.dojo, d: 260 }); }
  else dojoSpar(n, now);
}
// ============================================================
//  DUELOS NO TATAME (convite, mãos nuas, apostas dos lutadores, da plateia e dos moradores) e GOLPES DO SENSEI
// ============================================================
const DUEL_BETS = [10, 25, 50, 100, 200];
const dojoBi = () => BUILDINGS.findIndex(b => b.kind === 'dojo');
function onTatami(x, y) { const b = BUILDINGS[dojoBi()]; if (!b) return false; const [u, v] = worldToLocal(b, x, y); return u >= 0.9 && u <= 5.1 && v >= 0.9 && v <= 5.1; }
const inDojo = o => o && !(o.fl) && WORLD.bld[tileAt(o.x, o.y)] === dojoBi();
const duelEnt = r => r.k === 'p' ? S.players[r.id] : S.npcs && S.npcs[r.id];
const duelName = r => { const e = duelEnt(r); return e ? e.name.split(',')[0] : '?'; };
function duelMsg(p, m) {
  const now = now_(); S.duels = S.duels || {}; S.duelInv = S.duelInv || {};
  if (m.a === 'invite') {
    if (p.duel || p.downed || !inDojo(p)) { tell(p, 'Duelos só no tatame do Dojô do Punho de Ferro.'); return; }
    const bet = DUEL_BETS.includes(m.bet | 0) ? m.bet | 0 : 10; if (p.gold < bet) { tell(p, 'Você precisa de ' + bet + ' de ouro na bolsa para apostar.'); return; }
    const q = S.players[m.id], n = !q && S.npcs && S.npcs[m.id];
    if (q) { if (q === p || q.duel || q.downed || !inDojo(q)) { tell(p, 'Essa pessoa não pode duelar agora.'); return; } S.duelInv[q.id] = { from: p.id, bet, until: now + 20000 }; Net.toOne(q.id, { t: 'duelinv', from: p.id, name: p.name, bet }); tell(p, 'Desafio enviado a ' + q.name + ' (aposta ' + bet + ').'); return; }
    if (n && (n.vtype === 'gym' || n.vtype === 'offg') && !n.duel && inDojo(n)) { const busy = Object.values(S.duels).length; if (busy) { tell(p, 'Já tem uma luta no tatame. Espere terminar.'); return; } near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Aceito! ' + bet + ' de ouro.', 'Vamos ver do que é capaz!', 'Pode vir!'][Math.floor(Math.random() * 3)], ms: 1 }); duelStart({ k: 'p', id: p.id }, { k: 'n', id: n.id }, bet); return; }
    tell(p, 'Só dá para desafiar jogadores e praticantes no dojô.'); return;
  }
  if (m.a === 'accept' || m.a === 'decline') { const I = S.duelInv[p.id]; delete S.duelInv[p.id]; const q = I && S.players[I.from]; if (!I || !q || now > I.until) return;
    if (m.a === 'decline') { tell(q, p.name + ' recusou o duelo.'); return; }
    if (Object.values(S.duels).length) { tell(p, 'Já tem uma luta no tatame.'); tell(q, 'Já tem uma luta no tatame.'); return; }
    if (p.gold < I.bet || q.gold < I.bet) { tell(p, 'Alguém não tem ouro para a aposta.'); tell(q, 'Alguém não tem ouro para a aposta.'); return; }
    if (!inDojo(p) || !inDojo(q)) return; duelStart({ k: 'p', id: q.id }, { k: 'p', id: p.id }, I.bet); return; }
  if (m.a === 'bet') { const D = S.duels[m.id]; if (!D || D.st !== 'bow' || !inDojo(p) || p.duel) return; const v = [10, 25, 50].includes(m.v | 0) ? m.v | 0 : 10, side = m.side === 'b' ? 'b' : 'a';
    if (D.bets.some(x => x.who === p.id)) { tell(p, 'Você já apostou nesta luta.'); return; } if (p.gold < v) { tell(p, 'Ouro insuficiente.'); return; }
    p.gold -= v; D.bets.push({ who: p.id, name: p.name, side, v }); sendStat(p); duelSend(D); tell(p, 'Aposta de ' + v + ' em ' + duelName(D[side]) + '.'); return; }
}
function duelStart(a, b, bet) {
  const now = now_(), id = 'du' + (S.duelN = (S.duelN || 0) + 1), T = tatamiSpots(), D = { id, a, b, bet, st: 'bow', t0: now, bets: [], hp0: {} };
  for (const [r, sp] of [[a, T[0]], [b, T[1]]]) { const e = duelEnt(r); e.duel = id; e.x = sp.x; e.y = sp.y; if (r.k === 'p') { D.hp0[e.id] = e.hp; e.sit = null; e.train && trainEnd(e); if (!e.sheathed) sheatheToggle(e, true, true); e.gold -= bet; Net.toOne(e.id, { t: 'tp', x: e.x, y: e.y, z: 0, fl: 0, fb: -1 }); sendStat(e); } else { e.duelHp = 100; e.stops && (e.wait = now + 600000); } }
  const A = duelEnt(a), B = duelEnt(b); A.dir = dirFromVecS(B.x - A.x, B.y - A.y); B.dir = dirFromVecS(A.x - B.x, A.y - B.y);
  S.duels[id] = D; for (const r of [a, b]) { const e = duelEnt(r); near(e.x, e.y, { t: 'anim', w: r.k === 'p' ? 'p' : 'n', id: e.id, a: 'bow', ms: 1600 }); }
  // moradores presentes apostam e torcem
  for (const n of Object.values(S.npcs)) { if (n.duel || !inDojo(n) || n.id === 'st_dojo' || Math.random() < 0.3) continue; const side = Math.random() < 0.5 ? 'a' : 'b', v = 5 + Math.floor(Math.random() * 4) * 5; D.bets.push({ who: n.id, name: n.name.split(',')[0], side, v, npc: 1 }); setTimeout(() => { if (S.npcs[n.id]) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: v + ' em ' + duelName(D[side]) + '!', ms: 1 }); }, 400 + Math.random() * 2500); }
  const sen = S.npcs.st_dojo; if (sen && inDojo(sen)) near(sen.x, sen.y, { t: 'anim', w: 'n', id: 'st_dojo', a: 'talk', txt: 'Rei! Saudação... e em guarda.', ms: 1 });
  sys('Duelo no Dojô do Punho de Ferro: ' + duelName(a) + ' × ' + duelName(b) + ' (aposta ' + bet + '). Apostas abertas por 8 segundos!'); duelSend(D);
}
function duelSend(D) { const pot = D.bet * 2, sa = D.bets.filter(x => x.side === 'a').reduce((s0, x) => s0 + x.v, 0), sb = D.bets.filter(x => x.side === 'b').reduce((s0, x) => s0 + x.v, 0);
  const A = duelEnt(D.a), B = duelEnt(D.b), hp = (r, e) => !e ? 0 : r.k === 'p' ? Math.max(0, Math.round((e.hp / e.maxHp - KNEEL_HP) / (1 - KNEEL_HP) * 100)) : Math.max(0, Math.round(e.duelHp));
  const msg = { t: 'duelst', id: D.id, st: D.st, a: duelName(D.a), b: duelName(D.b), ai: D.a.id, bi: D.b.id, bet: D.bet, pot, sa, sb, ha: hp(D.a, A), hb: hp(D.b, B), left: D.st === 'bow' ? Math.max(0, Math.ceil((D.t0 + 8000 - now_()) / 1000)) : Math.max(0, Math.ceil((D.t0 + 98000 - now_()) / 1000)) };
  for (const q of Object.values(S.players)) if (inDojo(q) || q.duel === D.id) Net.toOne(q.id, msg); }
function duelEnd(D, winner, why) {
  if (D.st === 'end') return; D.st = 'end'; const W = winner ? D[winner] : null, Lr = winner ? D[winner === 'a' ? 'b' : 'a'] : null;
  for (const r of [D.a, D.b]) { const e = duelEnt(r); if (!e) continue; e.duel = null; if (r.k === 'p') { e.hp = Math.max(e.hp, D.hp0[e.id] || e.hp); e.stunUntil = 0; e.knockUntil = 0; sendStat(e); } else { e.duelHp = null; e.wait = now_() + 15000; } }
  const cut = x => Math.floor(x * 0.95); let house = 0;
  if (W) { const we = duelEnt(W); if (W.k === 'p' && we) { we.gold += cut(D.bet * 2); sendStat(we); } house += D.bet * 2 - cut(D.bet * 2); }
  else for (const r of [D.a, D.b]) { const e = duelEnt(r); if (r.k === 'p' && e) { e.gold += D.bet; sendStat(e); } }
  const win = D.bets.filter(x => winner && x.side === winner), lose = D.bets.filter(x => !winner || x.side !== winner), lt = lose.reduce((s0, x) => s0 + x.v, 0), wt = win.reduce((s0, x) => s0 + x.v, 0);
  if (!winner) for (const x of D.bets) { const q = S.players[x.who]; if (q) { q.gold += x.v; sendStat(q); } }
  else if (!wt) { house += Math.round(lt * 0.05); for (const x of lose) { const q = S.players[x.who]; if (q) { q.gold += cut(x.v); sendStat(q); } } }
  else { house += Math.round(lt * 0.05); for (const x of win) { const q = S.players[x.who], v = x.v + Math.floor(lt * 0.95 * x.v / wt); if (q) { q.gold += v; tell(q, 'Sua aposta em ' + duelName(W) + ' rendeu ' + v + ' de ouro!'); sendStat(q); } else if (S.npcs[x.who]) near(S.npcs[x.who].x, S.npcs[x.who].y, { t: 'anim', w: 'n', id: x.who, a: 'cheer', ms: 1400 }); }
    for (const x of lose) { const q = S.players[x.who]; if (q) tell(q, 'Você perdeu a aposta de ' + x.v + '.'); } }
  if (house > 0) dojoEarn(house, 'Taxa das apostas do duelo (' + house + ').');
  for (const r of [D.a, D.b]) { const e = duelEnt(r); if (e) near(e.x, e.y, { t: 'anim', w: r.k === 'p' ? 'p' : 'n', id: e.id, a: 'bow', ms: 1600 }); }
  const sen = S.npcs.st_dojo; if (sen && inDojo(sen)) near(sen.x, sen.y, { t: 'anim', w: 'n', id: 'st_dojo', a: 'talk', txt: W ? 'Vitória de ' + duelName(W) + '!' : 'Empate. Bom combate.', ms: 1 });
  sys(W ? duelName(W) + ' venceu ' + duelName(Lr) + ' no tatame do Punho de Ferro' + (why ? ' (' + why + ')' : '') + '.' : 'O duelo no Punho de Ferro terminou empatado.');
  D.st = 'end'; duelSend(D); delete S.duels[D.id];
}
function duelNpcHit(n, by, dmg, heavy) {
  const D = S.duels && S.duels[n.duel]; if (!D || D.st !== 'fight') return; n.duelHp -= dmg; sfx(n.x, n.y, '-' + dmg, '#ff8a6a'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: heavy ? 'hurt_head' : 'hurt', ms: 400 }); if (heavy) n.duelStun = now_() + 1200; duelSend(D);
}
function duelTick(now) {
  for (const D of Object.values(S.duels || {})) {
    const A = duelEnt(D.a), B = duelEnt(D.b);
    if (!A || !B) { duelEnd(D, A ? 'a' : B ? 'b' : null, 'o oponente saiu'); continue; }
    if (D.st === 'bow') { if (now - D.t0 >= 8000) { D.st = 'fight'; D.t0 = now - 8000; sys('Hajime! Começa o duelo: ' + duelName(D.a) + ' × ' + duelName(D.b) + '.'); duelSend(D); } continue; }
    const lost = (r, e) => r.k === 'p' ? (e.hp < e.maxHp * KNEEL_HP || e.downed || !onTatami(e.x, e.y) || (e.fl || 0) !== 0) : e.duelHp <= 0;
    const la = lost(D.a, A), lb = lost(D.b, B);
    if (la || lb) { duelEnd(D, la && lb ? null : la ? 'b' : 'a', (la ? (D.a.k === 'p' && !onTatami(A.x, A.y) ? 'saiu do tatame' : 'caiu de joelhos') : (D.b.k === 'p' && !onTatami(B.x, B.y) ? 'saiu do tatame' : 'caiu de joelhos'))); continue; }
    if (now - D.t0 > 98000) { const pa = D.a.k === 'p' ? A.hp / A.maxHp : A.duelHp / 100, pb = D.b.k === 'p' ? B.hp / B.maxHp : B.duelHp / 100; duelEnd(D, Math.abs(pa - pb) < 0.05 ? null : pa > pb ? 'a' : 'b', 'tempo esgotado'); continue; }
    for (const [r, e, o] of [[D.a, A, B], [D.b, B, A]]) if (r.k === 'n') duelNpcAi(e, o, now);
    if (now - (D.sendT || 0) > 700) { D.sendT = now; duelSend(D); }
  }
}
function duelNpcAi(n, foe, now) {   /* o praticante luta: chega perto, soca, chuta, às vezes derruba */
  if (now < (n.duelStun || 0) || now < (n.duelT || 0)) return; const d = dist(n.x, n.y, foe.x, foe.y); n.dir = dirFromVecS(foe.x - n.x, foe.y - n.y);
  if (d > 1.1) { const k = Math.min(1, 0.09 / d); const nx = n.x + (foe.x - n.x) * k, ny = n.y + (foe.y - n.y) * k; if (onTatami(nx, ny)) { n.x = nx; n.y = ny; } n.duelT = now + 60; return; }
  const r = Math.random(), a = r < 0.55 ? 'punch' : r < 0.85 ? 'kick' : 'shove'; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a, tx: foe.x, ty: foe.y, ms: 560 }); n.duelT = now + 1200 + Math.random() * 700;
  setTimeout(() => { if (!S.players[foe.id] || !foe.duel || foe.duel !== n.duel) return; const t = now_();
    if (t < (foe.dodgeUntil || 0)) { near(foe.x, foe.y, { t: 'whiff', id: foe.id }); return; }
    if (foe.parry && Math.abs(angDiff(foe.parry.a, Math.atan2(n.y - foe.y, n.x - foe.x))) < PARRY_ARC) { const perfect = t - foe.parry.t0 < (hasMove(foe, 'kamae') ? 900 : 300); near(foe.x, foe.y, { t: 'clang', x: (n.x + foe.x) / 2, y: (n.y + foe.y) / 2, perfect: perfect ? 1 : 0 }); foe.cst = Math.max(0, foe.cst - 8);
      if (perfect && hasMove(foe, 'kamae')) { duelNpcHit(n, foe, rint(6, 10), false); near(foe.x, foe.y, { t: 'anim', w: 'p', id: foe.id, a: 'punch', tx: n.x, ty: n.y, ms: 520 }); sfx(foe.x, foe.y, 'Contragolpe!', '#f0c060', 0); } sendStat(foe); return; }
    if (a === 'shove' && Math.random() < 0.5) { knockPlayer(foe, n, t); }
    const dmg = Math.min(rint(4, 7) + Math.floor(foe.lvl * 0.4), Math.max(0, Math.floor(foe.hp) - 1)); if (dmg > 0) damagePlayer(foe, dmg, { x: n.x, y: n.y, name: n.name }, 0, a === 'kick' ? 'legs' : 'torso'); }, 300);
}
// rasteira: na esquiva, colado no oponente
function dojoSweep(p, now) {
  const a = p.fa || 0; let best = null, bd = 1.45;
  for (const q of Object.values(S.players)) { if (!pvpOk(p, q) || (q.duel && q.duel !== p.duel)) continue; const d = dist(p.x, p.y, q.x, q.y); if (d < bd) { bd = d; best = { k: 'p', e: q }; } }
  for (const n of Object.values(S.npcs || {})) { if (n.dead || n.downed) continue; const d = dist(p.x, p.y, n.x, n.y); if (d < bd && (n.duel ? n.duel === p.duel : !p.duel)) { bd = d; best = { k: 'n', e: n }; } }
  for (const q of Object.values(S.monsters)) { const d = dist(p.x, p.y, q.x, q.y); if (d < bd && !p.duel && !MON[q.type].big) { bd = d; best = { k: 'm', e: q }; } }
  if (!best) return; const e = best.e; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'kick', tx: e.x, ty: e.y, ms: 520 }); sfx(p.x, p.y, 'Rasteira!', '#f0c060', 150);
  setTimeout(() => { const t = now_(); if (best.k === 'p') { if (!(p.duel && p.duel === e.duel)) witnessCrime(p, p.x, p.y); knockPlayer(e, p, t); }
    else if (best.k === 'n') { if (e.duel) duelNpcHit(e, p, 14, true); else { npcDamage(e, 2, p); near(e.x, e.y, { t: 'anim', w: 'n', id: e.id, a: 'getup', ms: 900 }); } }
    else if (S.monsters[e.id]) knockMon(e, p, t); }, 220);
}
// arremesso de quadril: segurando o oponente (ou colado nele, no duelo), F
function hipThrow(p) {
  if (!hasMove(p, 'throw') || p.downed || !(p.sheathed || p.duel)) return; const now = now_(); if (now < (p.throwT || 0)) return;
  let t = null, k = null;
  if (p.drag && p.drag.mode === 'grip') { k = p.drag.k; t = dragTarget(k, p.drag.id); stopDrag(p); }
  else if (p.duel) { const D = S.duels[p.duel]; if (D && D.st === 'fight') { const r = D.a.id === p.id ? D.b : D.a, e = duelEnt(r); if (e && dist(p.x, p.y, e.x, e.y) < 1.35) { t = e; k = r.k; } } }
  if (!t) return; p.throwT = now + 3000; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'shove', tx: t.x, ty: t.y, ms: 700 }); sfx(p.x, p.y, 'Arremesso!', '#f0c060', 0);
  setTimeout(() => { if (k === 'p' && S.players[t.id]) { if (!(p.duel && p.duel === t.duel)) witnessCrime(p, p.x, p.y); const d = Math.min(rint(8, 14), Math.max(0, Math.floor(t.hp) - 1)); flingPlayer(t, p.x, p.y, 1.4); if (d > 0) damagePlayer(t, d, { x: p.x, y: p.y, name: p.name }, 0, 'torso'); }
    else if (k === 'n' && S.npcs[t.id]) { if (t.duel) duelNpcHit(t, p, 25, true); else npcDamage(t, 4, p); near(t.x, t.y, { t: 'anim', w: 'n', id: t.id, a: 'hurt', ms: 600 }); setTimeout(() => { if (S.npcs[t.id]) near(t.x, t.y, { t: 'anim', w: 'n', id: t.id, a: 'getup', ms: 900 }); }, 700); } }, 350);
}
// luta no tatame: dois em volta se encaram e trocam golpes; de vez em quando um derruba o outro
function dojoSpar(n, now) {
  const b = BUILDINGS.find(q => q.kind === 'dojo'), foe = Object.values(S.npcs).find(o => o !== n && !o.dead && WORLD.bld[tileAt(o.x, o.y)] === (b && BUILDINGS.indexOf(b)) && ((o.stops && o.stops[o.si] && o.stops[o.si].dojo === -1) || o.sparring) && dist(o.x, o.y, n.x, n.y) < 3.2);
  if (!foe) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: Math.random() < 0.5 ? 'kata' : 'guard', ms: 2400 }); n.dojoT = now + 2600; return; }   /* sem parceiro: treina a forma sozinho */
  n.dir = dirFromVecS(foe.x - n.x, foe.y - n.y); const r = Math.random();
  if (r < 0.08 && now > (S.sparWin || 0)) { S.sparWin = now + 9000; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shove', tx: foe.x, ty: foe.y, ms: 700 }); setTimeout(() => { if (S.npcs[foe.id]) { near(foe.x, foe.y, { t: 'anim', w: 'n', id: foe.id, a: 'hurt', ms: 600 }); setTimeout(() => { if (S.npcs[foe.id]) near(foe.x, foe.y, { t: 'anim', w: 'n', id: foe.id, a: 'getup', ms: 900 }); }, 700); } if (S.npcs[n.id]) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Ippon!', 'Derrubei!', 'De novo?'][Math.floor(Math.random() * 3)], ms: 1 }); const sen = S.npcs.st_dojo; if (sen && dist(sen.x, sen.y, n.x, n.y) < 7) setTimeout(() => { if (S.npcs.st_dojo) near(sen.x, sen.y, { t: 'anim', w: 'n', id: 'st_dojo', a: 'talk', txt: ['Bom golpe!', 'Mais quadril!', 'Levante a guarda!'][Math.floor(Math.random() * 3)], ms: 1 }); }, 1200); }, 400); n.dojoT = now + 3200; return; }
  near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: r < 0.45 ? 'punch' : r < 0.7 ? 'kick' : r < 0.85 ? 'parry' : 'guard', tx: foe.x, ty: foe.y, ms: r < 0.7 ? 600 : 900 }); n.dojoT = now + 1100 + Math.random() * 600;
}
// o sensei: kata, meditação, reverência e conselhos a quem treina
function dojoSenseiTick(now) {
  const n = S.npcs && S.npcs.st_dojo; if (!n || n.dead || n.downed || n.sleeping || now < (n.dojoT || 0)) return; const b = BUILDINGS.findIndex(q => q.kind === 'dojo'); if (WORLD.bld[tileAt(n.x, n.y)] !== b) return;
  const pupils = Object.values(S.npcs).filter(o => o !== n && WORLD.bld[tileAt(o.x, o.y)] === b).length + Object.values(S.players).filter(p => WORLD.bld[tileAt(p.x, p.y)] === b && !(p.fl)).length, r = Math.random();
  if (pupils && r < 0.3) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Respire pelo ventre.', 'De novo. Mais devagar.', 'O golpe nasce no pé.', 'Olhos no oponente!', 'Mil vezes. Depois mais mil.'][Math.floor(Math.random() * 5)], ms: 1 }); n.dojoT = now + 6000; return; }
  if (r < 0.55) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'kata', ms: 2600 }); n.dojoT = now + 4500; return; }
  if (r < 0.75) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'seiza', ms: 9000 }); n.dojoT = now + 10500; return; }
  near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'bow', ms: 1600 }); n.dojoT = now + 3500;
}
// funcionários do dojô: varrem o chão, lutam no tatame entre si ou descansam
function dojoReception() { const D = dojoRec(), st = D && D.B && D.B.staff; if (!st || !st.length) return null; const n = S.npcs[st[0].id]; return n && !n.dead && WORLD.bld[tileAt(n.x, n.y)] === D.P.bi ? n : null; }
function dojoWorkerTick(n, now, dt) {
  if (n.walkTo) { if (npcWalk(n, n.walkTo[0], n.walkTo[1], 0.8, dt)) { n.walkTo = null; } return; }
  if (now < (n.dojoT || 0)) return;
  const D = dojoRec(), b = BUILDINGS[n.bi];
  if (D && D.B && D.B.staff && D.B.staff[0] && D.B.staff[0].id === n.id) {   /* recepção: fica na entrada, cumprimenta quem chega e cobra a diária */
    const [rx, ry] = bLocal(b, 4, 4); if (dist(n.x, n.y, rx, ry) > 0.4) { n.walkTo = [rx, ry]; return; }
    n.greeted = n.greeted || {}; const who = Object.values(S.npcs).concat(Object.values(S.players)).find(o => o !== n && !(o.fl) && WORLD.bld[tileAt(o.x, o.y)] === n.bi && dist(o.x, o.y, n.x, n.y) < 2.2 && !n.greeted[o.id]);
    if (who) { n.greeted[who.id] = now; n.dir = dirFromVecS(who.x - n.x, who.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'bow', ms: 1600 }); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Bem-vindo ao Punho de Ferro!', 'A diária é na recepção.', 'Tire as sandálias, por favor.'][Math.floor(Math.random() * 3)], ms: 1 }); n.dojoT = now + 2500; }
    else n.dojoT = now + 1500; for (const k in n.greeted) if (now - n.greeted[k] > 300000) delete n.greeted[k]; return; }
  if (!n.task || now > n.taskUntil) { const trainee = Object.values(S.players).find(p => p.train && !Object.values(S.npcs).some(o => o !== n && o.task === 'partner' && o.partnerOf === p.id)), r = Math.random();
    n.task = trainee && r < 0.5 ? 'partner' : r < 0.25 ? 'sweep' : r < 0.45 ? 'spar' : r < 0.62 ? 'tea' : r < 0.8 ? 'demo' : 'rest';
    if (n.task === 'partner') { n.partnerOf = trainee.id; const d = DUMMIES[trainee.train.i]; n.walkTo = [d.x + (d.fx - d.x) * 0.2 + (d.fy - d.y) * 0.8, d.y + (d.fy - d.y) * 0.2 - (d.fx - d.x) * 0.8]; n.taskUntil = now + 40000; return; }
    if (n.task === 'demo') { const [x, y] = bLocal(b, 3, 3); n.walkTo = [x, y]; n.taskUntil = now + 30000; return; }
    if (n.task === 'tea') { const tgt = Object.values(S.players).concat(Object.values(S.npcs)).filter(o => o !== n && !(o.fl) && WORLD.bld[tileAt(o.x, o.y)] === n.bi && o.id !== 'st_dojo').sort(() => Math.random() - 0.5)[0]; if (!tgt) n.task = 'rest'; else { n.teaFor = tgt.id; n.walkTo = [tgt.x + 0.6, tgt.y + 0.3]; n.taskUntil = now + 15000; return; } }
    if (n.task === 'tea' || n.task === 'rest') { n.taskUntil = now + 15000; } else { n.taskUntil = now + 20000 + Math.random() * 15000; } if (n.task !== 'sweep' && n.task !== 'spar') return;
    n.sparring = n.task === 'spar'; n.spar = null; n.taskUntil = now + 20000 + Math.random() * 15000; n.sparring = n.task === 'spar'; n.spar = null;
    if (n.task === 'spar') { const T = tatamiSpots(), taken = tatamiTaken(), q = T.find(t => !taken.has(t.k)); if (q) { n.spar = q.k; n.walkTo = [q.x, q.y]; } else n.task = 'sweep'; }
    if (n.task === 'sweep') { const F = bldFreeTiles(n.bi); if (F.length) { const t = F[Math.floor(Math.random() * F.length)]; n.walkTo = [t[0], t[1]]; } }
    return; }
  if (n.task === 'sweep') { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'sweep', ms: 2800 }); n.dojoT = now + 3000; if (Math.random() < 0.35) { const F = bldFreeTiles(n.bi); if (F.length) { const t = F[Math.floor(Math.random() * F.length)]; n.walkTo = [t[0], t[1]]; } } return; }
  if (n.task === 'spar') { dojoSpar(n, now); return; }
  if (n.task === 'partner') { const p = S.players[n.partnerOf]; if (!p || !p.train) { n.task = null; return; } n.dir = dirFromVecS(p.x - n.x, p.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: Math.random() < 0.7 ? 'guard' : 'talk', txt: ['Mais forte!', 'Isso!', 'Respira!', 'Gire o quadril!'][Math.floor(Math.random() * 4)], ms: 1500 }); n.dojoT = now + 1700; return; }
  if (n.task === 'demo') { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'kata', ms: 2600 }); n.dojoT = now + 3000; if (now - (S.dojoDemoT || 0) > 15000) { S.dojoDemoT = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Venham treinar no Punho de Ferro!', 'Corpo forte, mente calma!', 'Primeira aula com desconto!'][Math.floor(Math.random() * 3)], ms: 1 }); const hr = resHour(); if (hr >= 7 && hr < 20 && Math.random() < 0.5 && Object.values(S.npcs).filter(o => o.vtype === 'gym' || o.vtype === 'offg').length < 4) visSpawn(now, 'gym'); } return; }
  if (n.task === 'tea') { const o = S.players[n.teaFor] || S.npcs[n.teaFor]; n.task = null; if (!o) return; n.dir = dirFromVecS(o.x - n.x, o.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'offer', ms: 1400 }); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: 'Um chá verde?', ms: 1 });
    if (S.players[o.id]) { o.cst = Math.min(cstMaxOf(o), (o.cst ?? 0) + 60); o.water = Math.min(100, (o.water ?? 100) + 20); tell(o, 'Um funcionário do dojô serviu chá verde: +fôlego e mata a sede (2 de ouro para o dojô).'); if (canPay(o, 2)) { payCity(o, 2); dojoEarn(2, o.name + ' tomou chá (2).'); } sendStat(o); } else dojoEarn(1, null); n.dojoT = now + 3000; return; }
  near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: Math.random() < 0.5 ? 'seiza' : 'bow', ms: Math.random() < 0.5 ? 7000 : 1600 }); n.dojoT = now + 7500;
}
function visPlan(type) {
  if (type === 'gym' || type === 'offg') return [dojoStop()];
  const shops = PROPS.filter(P => P.kind === 'shop'), owned0 = shops.filter(P => S.estate && S.estate.r[P.id] && S.estate.r[P.id].biz && Object.keys(S.estate.r[P.id].biz.stock).length), owned = [];
  for (const P of owned0) { const L = (S.estate.r[P.id].biz.up || {}).vitrine || 0; for (let k = 0; k <= L; k++) owned.push(P); }   // cada nível de vitrine faz a loja ser escolhida mais vezes
  const pick = a => a[Math.floor(Math.random() * a.length)], tav = BUILDINGS.findIndex(b => b.kind === 'tavern'), spot = (x, y, w) => ({ x: x + (Math.random() - 0.5) * 2, y: y + (Math.random() - 0.5) * 2, w });
  const shopStop = P => { const st = Object.values(S.npcs).find(q => q.bi === P.bi && q.role === 'clerk'); const t = bldTiles(P.bi); const c = st ? clerkFront(BUILDINGS[P.bi], st) : t[0] || doorTile(BUILDINGS[P.bi]); return { x: c[0], y: c[1], w: 6000 + Math.random() * 6000, shop: P.id }; };
  const plaza = () => spot(CENTER + 0.5, CENTER + 13, 8000 + Math.random() * 10000), fountain = () => spot(CENTER + 18, CENTER + 1, 9000), tavern = () => { const t = bldTiles(tav); const c = t.length ? pick(t) : [CENTER, CENTER + 12]; return { x: c[0], y: c[1], w: 20000 + Math.random() * 25000 }; };
  const withBank = L => { if (Math.random() < 0.35) { const B = bankStop(); if (B) L.splice(Math.min(L.length, 1 + Math.floor(Math.random() * L.length)), 0, B); } return L; };   // às vezes passam no banco
  if (type === 'house') { const L = []; const pool = owned.length ? owned.concat(owned, shops) : shops; for (let k = 0; k < 2 + Math.floor(Math.random() * 2); k++) L.push(shopStop(pick(pool))); L.splice(1, 0, plaza()); return withBank(L); }
  if (type === 'trav') return withBank([plaza(), tavern(), Math.random() < 0.5 ? shopStop(pick(owned.length ? owned : shops)) : fountain()]);
  if (type === 'vis') return withBank([plaza(), fountain(), shopStop(pick(owned.length ? owned : shops)), plaza()]);
  return [plaza(), tavern(), plaza(), spot(CENTER - 12, CENTER + 7, 15000)];   // marginal: zanza pela praça e pela taverna
}
const clerkOf = bi => Object.values(S.npcs || {}).find(c => c.bi === bi && c.role === 'clerk' && !c.dead && !c.downed);
function saleFx(seller, buyer) { const a = seller || buyer; if (!a) return; near(a.x, a.y, { t: 'tfx', k: 'sale', s: seller ? seller.id : null, b: buyer ? buyer.id : null }); }
function visBuy(n, pid) {   // comprar de verdade numa loja de jogador (o ouro vai para o banco do dono); loja de NPC: compra simbólica
  const r = S.estate && S.estate.r[pid], P0 = PROPS_BY[pid];
  if (P0 && (!r || !r.biz)) { if (Math.random() < 0.6) { saleFx(clerkOf(P0.bi), n); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Vou levar!', 'Obrigada!', 'Isso aqui serve.'][Math.floor(Math.random() * 3)], ms: 1 }); } return; }
  if (!r || !r.biz || r.biz.closed) return; const B = r.biz, P = PROPS_BY[pid];
  let bought = 0; for (let k = 0; k < 1 + Math.floor(Math.random() * 3); k++) { const gs = Object.keys(B.stock).filter(g => B.stock[g] >= 1); if (!gs.length) break; const g = gs[Math.floor(Math.random() * gs.length)], M = MARGIN[B.margin[g] ?? 1]; if (Math.random() > M.p + 0.15) continue; const price = GOODS[g].p * M.k; B.stock[g]--; if (!B.stock[g]) delete B.stock[g]; B.cofre += price; B.today.rev += price; B.today.sold++; bought++; }
  if (bought) { saleFx(clerkOf(P.bi), n); bizLog(B, n.name.split(',')[0] + ' comprou ' + bought + (bought > 1 ? ' itens' : ' item') + '.'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Vou levar!', 'Obrigada!', 'Ótimo preço.', 'Isso aqui serve.'][Math.floor(Math.random() * 4)], ms: 1 }); }
  else near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Caro demais...', 'Não tem o que eu queria.', 'Hmm, outro dia.'][Math.floor(Math.random() * 3)], ms: 1 });
}
function visGone(n, why) { delete S.npcs[n.id]; Net.toAll({ t: 'vgone', id: n.id }); if (why) sys(why); }
function visitorTick(n, now, dt) {
  if (n.duel) return;   /* lutando no tatame */
  if (hotelNight(n, now, dt)) return;
  if (n.wantedT > now) { // fugindo para o portão mais próximo
    const g = visGates().sort((a, b) => dist(a[0], a[1], n.x, n.y) - dist(b[0], b[1], n.x, n.y))[0]; if (npcWalk(n, g[0], g[1], 2.6, dt)) visGone(n, n.name.split(',')[0] + ' fugiu da cidade com o que roubou.'); return; }
  if (n.leaving) { const g = visGates()[n.gate]; if (!n.rpath || !n.rpath.length) n.rpath = planRoute(n, g[0], g[1]); const [wx, wy] = n.rpath[0]; if (npcWalk(n, wx, wy, 1.1, dt) || dist(n.x, n.y, wx, wy) < 0.5) { n.rpath.shift(); if (!n.rpath.length) visGone(n); } return; }
  const st = n.stops[n.si]; if (!st) { n.leaving = true; n.rpath = null; return; }
  if (!n.rpath) n.rpath = (dist(n.x, n.y, VIS_HUB[0], VIS_HUB[1]) > 14 ? [VIS_HUB] : []).concat(planRoute({ x: dist(n.x, n.y, VIS_HUB[0], VIS_HUB[1]) > 14 ? VIS_HUB[0] : n.x, y: dist(n.x, n.y, VIS_HUB[0], VIS_HUB[1]) > 14 ? VIS_HUB[1] : n.y }, st.x, st.y));
  if (n.rpath.length) { const [wx, wy] = n.rpath[0]; if (npcWalk(n, wx, wy, 1.05, dt) || dist(n.x, n.y, wx, wy) < 0.5) n.rpath.shift(); if (!n.rpath.length) { n.wait = now + st.w; if (st.shop) setTimeout(() => { if (S.npcs[n.id]) visBuy(n, st.shop); }, 2500); if (st.bank) setTimeout(() => { if (S.npcs[n.id]) npcBankVisit(n, st.bank); }, 2200); } return; }
  if (n.duel) return;
  if (st.dojo != null) dojoNpcTrain(n, st, now);
  if (n.vtype === 'thug') thugTick(n, now);
  if (now > n.wait) { if (n.dojoDummy != null) n.dojoDummy = null; n.si++; n.rpath = null; }
  else if (Math.random() < 0.004 && n.vtype !== 'thug') { const mate = Object.values(S.npcs).find(o => o !== n && !o.sleeping && dist(o.x, o.y, n.x, n.y) < 2.5); if (mate) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: RES_LINES.any[Math.floor(Math.random() * RES_LINES.any.length)], ms: 1 }); }
}
// crimes raros e casuais do marginal (no máximo um a cada 4 minutos na cidade toda)
function thugTick(n, now) {
  if (now < (n.crimeCk || 0)) return; n.crimeCk = now + 40000; if (now < (S.crimeT || 0) || n.wantedT) return;
  const night = typeof dayInfoS === 'function' ? dayInfoS().night : false, r = Math.random(), flee = (txt) => { n.wantedT = now + 180000; S.crimeT = now + 240000; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt, ms: 1 }); const g = Object.values(S.npcs).filter(q => q.kind === 'guard' && !q.dead && !q.downed && !q.lead).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0]; if (g) g.chaseNpc = n.id; };
  const victim = Object.values(S.players).find(p => !p.dev && !p.downed && p.gold > 20 && dist(p.x, p.y, n.x, n.y) < 2.2 && now - (p.lastMv || 0) > 4000 && !(typeof tatKnown === 'function' && tatKnown(p, 'under')));   /* quem o submundo reconhece não é roubado */
  if (victim && r < 0.35) { const st = Math.min(50, Math.max(5, Math.floor(victim.gold * 0.08))); victim.gold -= st; n.loot = { id: victim.id, g: st }; sendStat(victim); tell(victim, 'Alguém mexeu na sua bolsa! ' + n.name.split(',')[0] + ' levou ' + st + ' de ouro. Pegue o ladrão!'); flee('Hehe...'); return; }
  const shop = PROPS.find(P => P.kind === 'shop' && S.estate && S.estate.r[P.id] && S.estate.r[P.id].biz && WORLD.bld[tileAt(n.x, n.y)] === P.bi);
  if (shop && r < 0.12) { const B = S.estate.r[shop.id].biz; let st = 0; for (let k = 0; k < 3; k++) { const gs = Object.keys(B.stock).filter(g => B.stock[g] >= 1); if (!gs.length) break; const g = gs[Math.floor(Math.random() * gs.length)]; B.stock[g]--; if (!B.stock[g]) delete B.stock[g]; st += Math.round(GOODS[g].p * 1.4); } if (!st) { flee('Ninguém viu nada!'); return; } n.loot = { owner: S.estate.r[shop.id].owner, g: st }; bizLog(B, 'Roubo! ' + n.name.split(',')[0] + ' fugiu com mercadoria (' + st + ' de ouro).'); const o = ownerOnline(S.estate.r[shop.id]); if (o) tell(o, 'Roubaram mercadoria de ' + shop.name + ' (' + st + ' de ouro)! O ladrão está fugindo.'); flee('Ninguém viu nada!'); return; }
  if (night && r < 0.08) { const t = Object.values(S.npcs).find(q => q.role && !q.sleeping && !q.dead && !q.downed && WORLD.bld[tileAt(q.x, q.y)] < 0 && dist(q.x, q.y, n.x, n.y) < 10); if (t) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: t.x, ty: t.y }); t.hp -= 18; if (t.hp <= 0) { t.hp = 0; t.downed = { until: now + 45000 }; if (t.role === 'courier') courierRobbed(t); } else { t.flee = { id: '_', until: now + 6000 }; near(t.x, t.y, { t: 'anim', w: 'n', id: t.id, a: 'shout', txt: 'Socorro! Ladrão!', ms: 1 }); } flee('Passa a bolsa!'); return; } }
  const tav = BUILDINGS.findIndex(b => b.kind === 'tavern');
  if (night && WORLD.bld[tileAt(n.x, n.y)] === tav && r < 0.1) { const o = Object.values(S.npcs).find(q => q !== n && q.transient && dist(q.x, q.y, n.x, n.y) < 4); if (o) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt: 'Tá olhando o quê?!', ms: 1 }); setTimeout(() => { if (S.npcs[o.id]) near(o.x, o.y, { t: 'anim', w: 'n', id: o.id, a: 'shout', txt: 'Briga! Briga!', ms: 1 }); }, 1500); for (let k = 0; k < 4; k++) setTimeout(() => { if (S.npcs[n.id] && S.npcs[o.id]) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: o.x, ty: o.y }); near(o.x, o.y, { t: 'anim', w: 'n', id: o.id, a: 'atk_slashR', ms: 900, tx: n.x, ty: n.y }); } }, 2500 + k * 1600); flee('Isso não acaba aqui!'); } }
}
// pegou o ladrão: recompensa, devolve o roubado, os moradores gostam
function thiefCaught(n, by) {
  const L = n.loot; if (L) { const v = L.id ? S.players[L.id] : Object.values(S.players).find(o => estOwner(o) === L.owner); if (v) { v.gold += L.g; tell(v, 'Você recuperou ' + L.g + ' de ouro que tinham roubado.'); sendStat(v); } }
  if (by) { featAdd(by, 'thief'); const bounty = 20 + Math.floor(Math.random() * 25); by.gold += bounty; tell(by, 'Recompensa da guarda por pegar o ladrão: +' + bounty + ' de ouro.'); sendStat(by); memEvent(by, n.x, n.y, 'thief'); }
  visGone(n, (by ? by.name : 'A guarda') + ' pegou ' + n.name.split(',')[0] + ', o ladrão. Ele vai para a cadeia.');
}

// ============================================================
//  GOLPES LETAIS — golpe forte (carregado) numa parte vital mata; no tronco abre sangramento grave; nos membros
//  deixa ferida feia e pode decepar. Elmo/armadura de placas do cavaleiro reduz a chance pela metade.
// ============================================================
function lethalHit(p, q, A, k) {
  if ((A.c || 0) < HEAVY && !A.rip) return false;
  const B = STRIKES[A.k], blade = A.wpn === 'sword' || A.wpn === 'halberd', armor = q.cls === 'knight' ? 0.5 : 1;
  let part = B.zone === 'head' ? 'head' : B.zone === 'legs' ? (Math.random() < 0.5 ? 'legL' : 'legR') : (A.k !== 'stab' && Math.random() < 0.3 ? (Math.random() < 0.5 ? 'armA' : 'armB') : 'torso');
  const who = { x: p.x, y: p.y, name: p.name };
  if (part === 'head') {
    if (Math.random() < 0.85 * armor) { if (blade && A.k !== 'stab') { severPlayer(q, 'head', who); } else { damagePlayer(q, q.hp + 999, who, 0, 'head'); } near(q.x, q.y, { t: 'blood', x: q.x, y: q.y, n: 18 }); sys(p.name + ' acertou um golpe fatal em ' + q.name + '.'); return true; }
    damagePlayer(q, Math.round(q.maxHp * 0.45), who, 0, 'head'); return true;
  }
  if (part === 'torso') { damagePlayer(q, Math.round(q.maxHp * 0.35), who, 0, 'torso'); if (q.bleed) q.bleed.torso = 2; tell(q, 'Um corte fundo no tronco! Você está sangrando muito: use uma bandagem (B) rápido.'); sendStat(q); return true; }
  // braço/perna: ferida grave e visível; com lâmina pode decepar
  if (q.body) q.body[part] = Math.max(0, (q.body[part] ?? 100) - 70); if (q.bleed) q.bleed[part] = 2;
  damagePlayer(q, Math.round(q.maxHp * 0.2), who, 0, part.startsWith('leg') ? 'legs' : 'torso');
  if (blade && !q.downed && Math.random() < 0.35 * armor) severPlayer(q, part, who);
  sendStat(q); return true;
}

// ============================================================
//  REPUTAÇÃO — 0 a 100: média do que os moradores acham de você (50 = neutro) + feitos − crimes
// ============================================================
function repAdd(p, g, amt, why) {   // reputação com um grupo (-100 a 100); avisa no chat quando muda de verdade
  if (!p || p.dev || !REP_G[g] || !amt) return; const F = p.feats = p.feats || {}, R = F.rg = F.rg || {}; const before = repOf(p);
  R[g] = clamp((R[g] || 0) + amt, -100, 100);
  if (why && Math.abs(amt) >= 1) info(p, 'Reputação com ' + REP_G[g] + ' ' + (amt > 0 ? '+' : '') + Math.round(amt) + ' (' + why + ').');
  const after = repOf(p); if (repTitle(after) !== repTitle(before)) info(p, 'Agora a cidade te vê como: ' + repTitle(after) + '.');
}
function repOf(p) {
  let sum = 0, n = 0; const k = memKey(p); for (const id in S.op) { const o = S.op[id][k]; if (o) { sum += o.v; n++; } }
  const RG = (p.feats || {}).rg || {}, gAvg = Object.keys(REP_G).reduce((a, g) => a + (RG[g] || 0), 0) / 5;
  const base = 50 + (n ? sum / n : 0) / 2 + gAvg * 0.3, F = p.feats || {}, owned = typeof bizOf === 'function' ? bizOf(p).length : 0;
  const feats = (F.thief || 0) * 5 + Math.min(30, (F.jobs || 0)) + Math.min(15, (F.shifts || 0)) + owned * 3 + Math.min(10, (F.rent || 0));
  return Math.round(clamp(base + feats - ((p.crimes || []).length) * 5, 0, 100));
}
function featAdd(p, k, n = 1) { p.feats = p.feats || {}; p.feats[k] = (p.feats[k] || 0) + n;
  if (k === 'thief') { repAdd(p, 'guarda', 5, 'pegou um ladrão'); repAdd(p, 'comerc', 3, 'pegou um ladrão'); }
  else if (k === 'jobs') repAdd(p, 'cidade', 0.6 * n); else if (k === 'shifts') repAdd(p, 'comerc', 0.6 * n); else if (k === 'rent') repAdd(p, 'cidade', 0.4 * n); }
// ============================================================
//  BANCO DE NAE — guardar ouro (não se perde nem é furtado), juros de 2% por semana, empréstimos (10%/semana, 2 semanas),
//  e quem morre de vez deixa o saldo para o dono do banco (ou para a Coroa). Guardado neste reino.
// ============================================================
const BANK_KEY = 'nae-world-bank-v1', BANK_INT = 0.02, LOAN_INT = 0.10, LOAN_WEEKS = 2;
function bankLoad() { if (S.bank) return S.bank; S.bank = { acc: {} }; try { const j = hsGet(BANK_KEY); if (j && j.acc) S.bank = j; } catch (e) { } return S.bank; }
function bankSave() { try { hsSet(BANK_KEY, S.bank); } catch (e) { } }
const bankAcc = p => { const B = bankLoad(), k = estOwner(p); return B.acc[k] || (B.acc[k] = { g: 0, loan: 0, due: 0, wk: estDay() }); };
const bankProp = () => PROPS.find(P => P.kind === 'bank');
function bankOwnerRec() { const P = bankProp(); return P && S.estate && S.estate.r[P.id]; }
const loanMax = p => 100 + repOf(p) * 4;
function bankView(p) { const A = bankAcc(p), O = bankOwnerRec(); return { t: 'bank', g: Math.floor(A.g), loan: Math.ceil(A.loan), due: A.due ? (A.due * ESTATE_DAY_MS - Date.now()) : 0, max: loanMax(p), rep: repOf(p), owner: O ? O.ownerName : 'a Coroa' }; }
function nearBanker(p) { return Object.values(S.npcs || {}).some(n => /^banker\d?$/.test(n.kind) && !n.dead && !n.downed && dist(n.x, n.y, p.x, p.y) < 4.5); }
function bankMsg(p, m) {
  const A = bankAcc(p), q = Math.max(0, Math.floor(+m.q || 0));
  if (m.a !== 'open' && !nearBanker(p)) { tell(p, m.a === 'dep' ? 'Para depositar, vá ao Banco de Nae, ou peça a um segurança (F) que leve o dinheiro.' : 'Fale com um dos banqueiros, no Banco de Nae.'); return; }   // depositar, sacar e empréstimos só no banco (ou pelo segurança)
  if (m.a === 'dep') { const v = Math.min(q, p.gold); if (!v) return; p.gold -= v; A.g += v; tell(p, 'Depositado: ' + v + ' de ouro. Saldo: ' + Math.floor(A.g) + '.'); }
  else if (m.a === 'wd') { const v = Math.min(q, Math.floor(A.g)); if (!v) return; A.g -= v; p.gold += v; tell(p, 'Sacado: ' + v + ' de ouro.'); }
  else if (m.a === 'loan') { if (A.loan > 0) { tell(p, 'Você já tem um empréstimo. Pague antes de pedir outro.'); return; } const v = Math.min(q, loanMax(p)); if (!v) return; A.loan = Math.ceil(v * (1 + LOAN_INT)); A.due = estDay() + LOAN_WEEKS * RENT_DAYS; p.gold += v; tell(p, 'Empréstimo de ' + v + ' de ouro. Você deve ' + A.loan + ' (juros de 10% por semana) em até 2 semanas.'); }
  else if (m.a === 'repay') { const v = Math.min(q || A.loan, A.loan, p.gold); if (!v) return; p.gold -= v; A.loan -= v; const O = bankOwnerRec(); if (O && O.biz) O.biz.cofre += Math.round(v * 0.09); if (A.loan <= 0) { A.loan = 0; A.due = 0; tell(p, 'Dívida quitada. O banco agradece.'); } else tell(p, 'Pago: ' + v + '. Ainda deve ' + A.loan + '.'); }
  bankSave(); sendStat(p); Net.toOne(p.id, bankView(p));
}
// semanal: juros sobre o saldo e sobre a dívida; dívida vencida é cobrada do saldo, senão a guarda vai atrás
function bankTick(now) {
  const B = bankLoad(), day = estDay(), O = bankOwnerRec(); let ch = false;
  for (const k in B.acc) { const A = B.acc[k]; if (day - A.wk < RENT_DAYS) continue; const wks = Math.min(1, Math.floor((day - A.wk) / RENT_DAYS)); A.wk = day; ch = true;   /* no máximo uma semana de juros por vez (o banco ficou semanas sem calcular) */
    const pay = Math.floor(A.g * BANK_INT * wks); if (pay > 0) { if (O && O.biz) { const v = Math.min(pay, Math.floor(O.biz.cofre)); O.biz.cofre -= v; A.g += v; } else A.g += pay; }
    if (A.loan > 0) A.loan = Math.ceil(A.loan * Math.pow(1 + LOAN_INT, wks)); }
  for (const p of Object.values(S.players)) { const A = B.acc[estOwner(p)]; if (!A || !A.loan || !A.due || day < A.due) continue;
    const take = Math.min(A.loan, Math.floor(A.g)); if (take) { A.g -= take; A.loan -= take; ch = true; tell(p, 'O banco tirou ' + take + ' do seu saldo para cobrir a dívida vencida.'); }
    if (A.loan > 0 && !(now < (p.wanted || 0)) && now > (p.debtT || 0)) { p.debtT = now + 600000; p.wanted = now + 300000; crimeSentence(p, 'assault'); Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); tell(p, 'Dívida vencida com o Banco de Nae: as sentinelas foram chamadas para te levar!'); } }
  if (ch) bankSave();
}

// ============================================================
//  PAINEL DO TECELÃO — retrato do reino (pessoas, negócios, banco, mundo) e ações de criador
// ============================================================
const WTs = () => typeof WT !== 'undefined' ? WT : (globalThis.__WT || (globalThis.__WT = { ph: null, rain: null }));
function wvSnap() {
  const plist = Object.values(S.players), B = bankLoad(), bldName = bi => { if (bi == null || bi < 0 || !BUILDINGS[bi]) return ''; const P = PROPS.find(q => q.bi === bi); return (P && P.name) || BUILDINGS[bi].name || 'Casa'; };
  const owned = {}; const E = S.estate && S.estate.r || {}; for (const id in E) { const r = E[id], P = PROPS_BY[id]; if (P) (owned[r.ownerName] = owned[r.ownerName] || []).push(P.name); }
  const players = plist.map(p => { const A = B.acc[estOwner(p)] || {}; return { id: p.id, name: p.name, cls: CLASSES[p.cls] ? CLASSES[p.cls].name : p.cls, lvl: p.lvl, hp: Math.round(p.hp), maxHp: p.maxHp, gold: p.gold, bank: Math.floor(A.g || 0), debt: Math.ceil(A.loan || 0), x: +p.x.toFixed(1), y: +p.y.toFixed(1), food: Math.round(p.food ?? 100), water: Math.round(p.water ?? 100), rep: repOf(p), crimes: p.crimes || [], wanted: now_() < (p.wanted || 0), jailed: p.jailUntil > now_(), downed: !!p.downed, dev: !!p.dev, menu: !!p.inMenu, prof: p.prof || {}, props: owned[p.name] || [] }; });
  const npcs = Object.values(S.npcs || {}).map(n => { const ops = []; for (const p of plist) { const o = S.op && S.op[n.id] && S.op[n.id][memKey(p)]; if (o && Math.round(o.v)) ops.push([p.name, Math.round(o.v), o.why || '']); } return { id: n.id, name: n.name, kind: n.kind, role: n.role || '', act: n.act || '', hp: Math.round(n.hp), maxHp: n.maxHp || 90, x: +n.x.toFixed(1), y: +n.y.toFixed(1), downed: !!n.downed, dead: !!n.dead, sleeping: !!n.sleeping, transient: !!n.transient, need: n.need ? { food: Math.round(n.need.food), rest: Math.round(n.need.rest), social: Math.round(n.need.social) } : null, home: bldName(n.home), work: n.bi !== n.home ? bldName(n.bi) : '', ops }; });
  const props = PROPS.map(P => { const r = E[P.id], b = r && r.biz, ten = P.tenants && P.tenants.length ? P.tenants.map(t => ((S.npcs || {})[t] || {}).name || t).join(', ') : ''; return { name: P.name, kind: P.kind, owner: r ? r.ownerName : '', mode: r ? r.mode : '', npc: P.npc ? 'dono morador' : '', tenants: ten, cofre: b ? Math.floor(b.cofre) : null, stock: b ? Math.round(Object.values(b.stock || b.store || {}).reduce((a, v) => a + v, 0)) : null, rev: b && b.today ? Math.round(b.today.rev) : null }; });
  const bank = Object.entries(B.acc).map(([k, A]) => ({ who: k.split('|')[0], g: Math.floor(A.g), loan: Math.ceil(A.loan || 0) })).filter(a => a.g || a.loan);
  const O = bankOwnerRec(), pop = { jogadores: plist.length, moradores: 0, visitantes: 0, guardas: 0, caídos: 0, mortos: 0 };
  for (const n of Object.values(S.npcs || {})) { if (n.dead) pop.mortos++; else if (n.downed) pop.caídos++; if (n.transient) pop.visitantes++; else if (n.kind === 'guard' || n.kind === 'captain') pop.guardas++; else pop.moradores++; }
  const mons = {}; for (const m of Object.values(S.monsters)) mons[m.type] = (mons[m.type] || 0) + 1;
  const bast = BASTIONS.map(b => ({ name: b.name, n: Object.values(S.monsters).filter(m => dist(m.x, m.y, b.x, b.y) < b.r + 6).length }));
  const se = typeof seasonNow === 'function' ? seasonNow() : { n: '' }, wx = weatherS() || { rain: 0 };
  return { t: 'wv', players, npcs, props, bank, bankOwner: O ? O.ownerName : 'a Coroa', world: { day: estDay() - (S.day0 ?? (S.day0 = estDay())) + 1, hour: resHour(), season: se.n + (se.day != null ? ' · dia ' + (se.day + 1) : ''), rain: wx.rain, ph: WTs().ph, rainSet: WTs().rain, pop, mons, bast, events: (S.events || []).slice(-40) } };
}
function wvMsg(p, m) {
  if (!p.dev && !p.devPowers) return;
  if (m.a === 'snap') { Net.toOne(p.id, wvSnap()); return; }
  if (m.a !== 'act') return;
  const q = m.kind === 'p' ? S.players[m.id] : m.kind === 'n' ? S.npcs && S.npcs[m.id] : null, v = m.v;
  if (m.op === 'coins') { coinRain(p, clamp(+v || 10, 1, 1e7)); return; }
  if (m.op === 'time' || m.op === 'rain') { if (m.op === 'time') WTs().ph = v == null ? null : clamp(+v, 0, 1); else WTs().rain = v == null ? null : clamp(+v, 0, 1); Net.toAll({ t: 'wt', ph: WTs().ph, rain: WTs().rain }); }
  else if (!q) return;
  else if (m.op === 'tp') { p.x = clamp(q.x + 1.2, 1, MAP_W - 2); p.y = clamp(q.y + 0.6, 1, MAP_H - 2); p.z = 0; p.fl = 0; p.fb = -1; Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: 0, fb: -1 }); }
  else if (m.op === 'heal') {
    if (m.kind === 'p') { if (q.downed) revivePlayer(q, 1, 'O Tecelão'); q.hp = q.maxHp; q.mp = q.maxMp; if (q.body) for (const k in q.body) q.body[k] = 100; if (q.bleed) for (const k in q.bleed) q.bleed[k] = 0; q.food = 100; q.water = 100; tell(q, 'Uma luz dourada te envolve: o Tecelão te curou.'); sendStat(q); }
    else { q.dead = false; q.downed = null; q.hp = q.maxHp || 90; q.fight = null; q.flee = null; }
  }
  else if (m.op === 'jail' && m.kind === 'p') { if (!(q.jailUntil > now_())) { q.sentence = Math.max(30000, +v || 120000); jailPlayer(q, q.sentence); sys(q.name + ' foi levado à cadeia pelo Tecelão.'); } }
  else if (m.op === 'free' && m.kind === 'p') { if (q.jailUntil > now_()) releasePlayer(q, 'O Tecelão abriu a sua cela.'); if (q.condemned) condemn(q, false); q.wanted = 0; q.sentence = 0; q.crimes = []; q.murderer = false; q.bound = null; q.surrendered = false; Net.toAll({ t: 'wanted', id: q.id, ms: 0 }); sendStat(q); }
  else if (m.op === 'rain') {}
  else if (m.op === 'gold' && m.kind === 'p') { const g = Math.round(+v || 0); q.gold = Math.max(0, q.gold + g); tell(q, g >= 0 ? 'O Tecelão te deu ' + g + ' de ouro.' : 'O Tecelão tirou ' + (-g) + ' de ouro de você.'); sendStat(q); }
  Net.toOne(p.id, wvSnap());
}

// ============================================================
//  ANDAR DOS NPCs — caminho A* pelo mapa todo (preferindo as ruas), sempre pela porta (vai até a frente, entra reto),
//  fila na porta, desvio de quem está na frente, curvas suaves, cada um no seu ritmo e na sua "faixa". Nunca atravessa parede.
// ============================================================
const ROAD_T = new Set([T.COBBLE, T.STONE, T.BRIDGE, T.DIRT, T.FLOORSTONE]);
function npcPath(sx, sy, tx, ty, maxN = 16000) {
  const W = MAP_W; sx = Math.round(sx); sy = Math.round(sy); const gx = Math.round(tx), gy = Math.round(ty);
  if (!inBounds(sx, sy) || !inBounds(gx, gy)) return null;
  const start = sy * W + sx, goal = gy * W + gx; if (start === goal) return [[tx, ty]];
  const g = new Map([[start, 0]]), prev = new Map([[start, -1]]), closed = new Set(), H = [];
  const hf = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  const push = (k, f) => { H.push([f, k]); let i = H.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top[1]; };
  let goalOk = walkableTile(gx, gy, 0);   // destino ocupado (balcão, posto): chegar ao lado já basta, sem varrer o mapa
  if (!goalOk && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => walkableTile(gx + a, gy + c, 0) && edgeOk(gx + a, gy + c, gx, gy))) {   // fechado por móveis: troca pelo chão livre mais perto (mesmo prédio)
    let bd = 9, bx = -1, by = -1; const bi = WORLD.bld[goal];
    for (let yy = gy - 2; yy <= gy + 2; yy++) for (let xx = gx - 2; xx <= gx + 2; xx++) { if (!inBounds(xx, yy) || WORLD.bld[yy * W + xx] !== bi || !walkableTile(xx, yy, 0)) continue; const d = (xx - tx) * (xx - tx) + (yy - ty) * (yy - ty); if (d < bd) { bd = d; bx = xx; by = yy; } }
    if (bx < 0) return null; return npcPath(sx, sy, bx, by, maxN);
  }
  const cabIn = k => HOTEL_CABS.findIndex(Q => Q.tiles && (Q.tiles.has(k) || Q.di === k)), sCab = HOTEL_DOORS.size ? cabIn(start) : -1, gCab = HOTEL_DOORS.size ? cabIn(goal) : -1;
  push(start, hf(sx, sy)); let n = 0, best = start, bestH = hf(sx, sy), found = false, nearK = -1;
  while (H.length && n++ < maxN) {
    const k = pop(); if (closed.has(k)) continue; closed.add(k); if (k === goal) { found = true; break; }
    if (!goalOk) { const kx = k % W, ky = (k - kx) / W; if (Math.max(Math.abs(kx - gx), Math.abs(ky - gy)) <= 1 && (kx === gx || ky === gy) && edgeOk(kx, ky, gx, gy)) { nearK = k; break; } }
    const x = k % W, y = (k - x) / W, gk = g.get(k);
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny)) continue; const nk = ny * W + nx; if (closed.has(nk)) continue;
      if (nk !== goal && !walkableTile(nx, ny, 0)) continue;
      if (HOTEL_DOORS.has(nk)) { const q = HOTEL_DOORS.get(nk); if (q !== sCab && q !== gCab) continue; }
      if (!edgeOk(x, y, nx, ny)) continue;
      if (dx && dy && (!walkableTile(x + dx, y, 0) || !walkableTile(x, y + dy, 0))) continue;
      if (WORLD.stair[nk]) continue;
      const c = gk + (dx && dy ? 1.414 : 1) * (ROAD_T.has(WORLD.ground[nk]) || WORLD.bld[nk] >= 0 || WORLD.rdir[nk] ? 1 : (WORLD.zone[nk] === Z.VILLAGE || inSafe(nx, ny)) ? 2.6 : 1.3);   /* como gente de verdade: na cidade anda pelas ruas, só corta pela grama se for muito mais perto */
      if (c < (g.get(nk) ?? 1e9)) { g.set(nk, c); prev.set(nk, k); const h = hf(nx, ny); push(nk, c + h * 0.9); if (h < bestH) { bestH = h; best = nk; } }
    }
  }
  let end = found ? goal : nearK >= 0 ? nearK : (bestH <= 1.5 ? best : -1); if (end < 0) return null;
  const path = []; for (let k = end; k !== start && k !== -1; k = prev.get(k)) path.push([k % W, Math.floor(k / W)]);
  path.reverse(); if (found && path.length) path[path.length - 1] = [tx, ty]; return path.length ? path : [[tx, ty]];
}
// espaço livre para NPC: paredes, tiles sólidos e objetos redondos (sem contar os postos fixos de outros NPCs)
function npcStand(x, y, r) {
  if (wallHit(x, y, r)) return false;
  for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (solidTile(Math.round(x + ox), Math.round(y + oy), 0)) return false;
  const tx = Math.round(x), ty = Math.round(y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = tx + dx, yy = ty + dy; if (!inBounds(xx, yy)) continue; const i = yy * MAP_W + xx; if (WORLD.ground[i] === T.CLIFF && WORLD.fl1[i] > 0) continue; const rr = OBJ_R[WORLD.obj[i]]; if (rr && (x - xx) * (x - xx) + (y - yy) * (y - yy) < (rr + r) * (rr + r)) return false; }
  return true;
}
const npcLine = (ax, ay, bx, by) => { const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.3); for (let k = 1; k <= n; k++) { const t = k / n; if (!npcStand(ax + (bx - ax) * t, ay + (by - ay) * t, 0.24)) return false; } return true; };
let DOOR_TILES = null;
const doorTiles = () => DOOR_TILES || (DOOR_TILES = BUILDINGS.map((b, bi) => { const [x, y] = doorTile(b), v = DOOR_V[b.door || 'S']; return { bi, x, y, k: y * MAP_W + x, ox: x + v[0] * 1.3, oy: y + v[1] * 1.3 }; }));
function npcLegs(n, tx, ty) {   // pontos de passagem: sai pela porta de onde está e entra pela porta de onde vai (de frente)
  const D = doorTiles(), ti = tileAt(tx, ty), here = WORLD.bld[tileAt(n.x, n.y)], onDoor = D.find(d => d.k === ti), there = onDoor ? -1 : WORLD.bld[ti], L = [];
  if (here >= 0 && here !== there && D[here]) L.push([D[here].x, D[here].y, 1], [D[here].ox, D[here].oy, 1]);
  if (there >= 0 && there !== here && D[there]) L.push([D[there].ox, D[there].oy, 1], [D[there].x, D[there].y, 1]);
  L.push([tx, ty, 0]); return L;
}
function npcPace(n) {
  if (n._pace == null) { let h = 7; for (const c of String(n.id)) h = (h * 31 + c.charCodeAt(0)) & 0xffff; n._pace = (GAIT_SPD[NPC_GAIT[n.kind] || 'normal'] || 1) * (0.92 + (h % 17) / 100); n._lane = ((h >> 4) % 7 - 3) * 0.07; }
  return n._pace * (n.drunkT > now_() ? GAIT_SPD.drunk : 1);
}
// destino em cima de algo sólido (chafariz, poço, parede): vai até o ponto livre mais próximo (senão o NPC rodeia e trava)
const FREE_SPOT = new Map();
function npcFreeSpot(tx, ty) {
  const k = Math.round(tx * 4) + ',' + Math.round(ty * 4); let r = FREE_SPOT.get(k); if (r) return r;
  r = [tx, ty]; if (!npcStand(tx, ty, 0.24)) { let best = null, bd = 1e9; for (let rad = 0.5; rad <= 2.5 && !best; rad += 0.5) for (let a = 0; a < 16; a++) { const x = tx + Math.cos(a / 16 * Math.PI * 2) * rad, y = ty + Math.sin(a / 16 * Math.PI * 2) * rad; if (npcStand(x, y, 0.24) && WORLD.bld[tileAt(x, y)] === WORLD.bld[tileAt(tx, ty)]) { const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; best = [x, y]; } } } if (best) r = best; }
  if (FREE_SPOT.size > 4000) FREE_SPOT.clear(); FREE_SPOT.set(k, r); return r;
}
function npcWalk(n, tx, ty, speed, dt) {
  const now = now_(), calm = speed < 1.8; if (calm) speed *= npcPace(n);
  if (calm && !n.fight && !n.flee) [tx, ty] = npcFreeSpot(tx, ty);   // só passeio/trabalho: perseguições continuam mirando o alvo
  const key = Math.round(tx * 4) + ',' + Math.round(ty * 4);
  if (n.walkKey !== key) {   // alvo andando (perseguição): só refaz o caminho se ele se afastou mais de 1,5 tile ou mudou de prédio
    const far = !n.walkT || dist(n.walkT[0], n.walkT[1], tx, ty) > 1.5 || WORLD.bld[tileAt(tx, ty)] !== WORLD.bld[tileAt(n.walkT[0], n.walkT[1])] || !n.legs || !n.legs.length; n.walkKey = key;
    if (far) { n.walkT = [tx, ty]; n.legs = npcLegs(n, tx, ty); n.path = null; n._stuck = 0; n.doorWait = 0; }
    else { const L = n.legs[n.legs.length - 1]; L[0] = tx; L[1] = ty; if (n.path && n.path.length && n.legs.length === 1) n.path[n.path.length - 1] = [tx, ty]; }
  }
  if (!n.legs || !n.legs.length) n.legs = [[tx, ty, 0]];
  let leg = n.legs[0];
  if (n.legs.length > 1 && dist(n.x, n.y, leg[0], leg[1]) < 0.4) { n.legs.shift(); leg = n.legs[0]; n.path = null; }
  if (!n.path) {   // caminho até o próximo ponto (limite de buscas por instante para não pesar)
    if (npcLine(n.x, n.y, leg[0], leg[1])) n.path = [[leg[0], leg[1]]];
    else { S.pathWin = S.pathWin || { t: 0, n: 0 }; if (now - S.pathWin.t > 100) S.pathWin = { t: now, n: 0 }; if (S.pathWin.n >= 4) { n.walk = false; return false; } S.pathWin.n++; n.path = npcPath(n.x, n.y, leg[0], leg[1]) || [[leg[0], leg[1]]]; }
  }
  if (!n.path.length) n.path = [[leg[0], leg[1]]];
  // corta caminho quando a linha está livre (vira diagonal suave em vez de zigue-zague de tiles)
  while (n.path.length > 1 && npcLine(n.x, n.y, n.path[1][0], n.path[1][1])) n.path.shift();
  let [gx, gy] = n.path[0]; const last = n.path.length === 1 && n.legs.length === 1;
  if (!last && dist(n.x, n.y, gx, gy) < 0.35) { n.path.shift(); if (!n.path.length) { if (n.legs.length > 1) { n.legs.shift(); n.path = null; } else n.path = [[tx, ty]]; } return false; }
  let dx = gx - n.x, dy = gy - n.y, d = Math.hypot(dx, dy);
  if (d < 0.05) { n.walk = false; const dt0 = dist(n.x, n.y, tx, ty); return dt0 < 0.6 || (n.legs.length === 1 && dt0 < 1.3); }
  let ux = dx / d, uy = dy / d;
  if (calm && !leg[2] && d > 1.2) { const ox = gx - uy * n._lane, oy = gy + ux * n._lane; if (npcStand(ox, oy, 0.24)) { dx = ox - n.x; dy = oy - n.y; d = Math.hypot(dx, dy); ux = dx / d; uy = dy / d; } }   // cada um na sua faixa
  // desvia de quem está logo à frente (gente parada ou vindo de frente)
  if (calm) { let ax = 0, ay = 0; const near = q => { const ex = q.x - n.x, ey = q.y - n.y, dd = Math.hypot(ex, ey); if (dd < 0.05 || dd > 1.0) return; const ahead = (ex * ux + ey * uy) / dd; if (ahead < 0.35) return; const side = (ex * -uy + ey * ux) >= 0 ? -1 : 1, w = (1.0 - dd) * ahead * 1.6; ax += -uy * side * w; ay += ux * side * w; };
    for (const q of Object.values(S.npcs)) if (q !== n && !q.dead && Math.abs(q.x - n.x) < 1.1 && Math.abs(q.y - n.y) < 1.1) near(q);
    for (const q of Object.values(S.players)) if (Math.abs(q.x - n.x) < 1.1 && Math.abs(q.y - n.y) < 1.1) near(q);
    if (ax || ay) { ux += ax; uy += ay; const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l; } }
  // curvas suaves: o rumo gira para o desejado (não vira de uma vez)
  if (n.hx == null) { n.hx = ux; n.hy = uy; } { const k = Math.min(1, dt * (calm ? 7 : 14)); let hx = n.hx + (ux - n.hx) * k, hy = n.hy + (uy - n.hy) * k; const l = Math.hypot(hx, hy) || 1; n.hx = hx / l; n.hy = hy / l; if (n.hx * ux + n.hy * uy < 0.2) { n.hx = ux; n.hy = uy; } }
  const st = Math.min(d, speed * dt), nx = n.x + n.hx * st, ny = n.y + n.hy * st;
  // fila na porta: se alguém está passando pela porta, espera a vez (no máximo uns 3 s)
  let nearDoor = false; if (calm) { const D = doorTiles(); for (const dr of D) { if (Math.abs(dr.x - nx) > 1.3 || Math.abs(dr.y - ny) > 1.3) continue; const dd = dist(nx, ny, dr.x, dr.y); if (dd > 1.05) continue; nearDoor = true;
      S.doorQ = S.doorQ || {}; const c = S.doorQ[dr.k], other = c && c.id !== n.id && now - c.t < 500 && S.npcs[c.id] && dist(S.npcs[c.id].x, S.npcs[c.id].y, dr.x, dr.y) < 1.1;
      const pl = Object.values(S.players).some(p => !p.dragBy && !p.carriedBy && !(n.lead && n.lead.id === p.id) && n.carrying !== p.id && dist(p.x, p.y, dr.x, dr.y) < 0.6);
      if ((other || pl) && (n.doorWait || 0) < 3) { n.doorWait = (n.doorWait || 0) + dt; n.walk = false; return false; }
      S.doorQ[dr.k] = { id: n.id, t: now }; } }
  const px = n.x, py = n.y, free = npcStand(n.x, n.y, 0.2);
  if (npcStand(nx, ny, 0.22) || !free) { n.x = nx; n.y = ny; }
  else if (Math.abs(nx - n.x) > 0.002 && npcStand(nx, n.y, 0.22)) n.x = nx;
  else if (Math.abs(ny - n.y) > 0.002 && npcStand(n.x, ny, 0.22)) n.y = ny;
  const moved = Math.hypot(n.x - px, n.y - py);
  if (moved < st * 0.3) {   // travou: refaz o caminho; depois tenta um passo de lado; nunca atravessa parede
    n._stuck = (n._stuck || 0) + 1;
    if (n._stuck === 6 || n._stuck === 20) n.path = null;
    if (n._stuck > 30 && n._stuck % 10 === 0) { const a = Math.random() * Math.PI * 2, sx = n.x + Math.cos(a) * 0.3, sy = n.y + Math.sin(a) * 0.3; if (npcStand(sx, sy, 0.22)) { n.x = sx; n.y = sy; } }
    if (n._stuck > 120) { n._stuck = 0; n.walkKey = null; }
    if (n._stuck > 8 && n.legs.length === 1 && dist(n.x, n.y, tx, ty) < 1.25) { n.walk = false; return true; }   // destino exato bloqueado (grade, balcão): chegou perto o bastante
  } else { n._stuck = 0; if (!nearDoor) n.doorWait = 0; }
  n.walk = moved > 0.001; return dist(n.x, n.y, tx, ty) < 0.6;
}

// ============================================================
//  GUARDAR A ARMA (G) — leva meio segundo (espada) ou um pouco mais (alabarda, arco, cajado); guardada: soco que não mata
// ============================================================
const FIST = { reach: 0.62, dmg: 0.22, spd: 0.8, arc: 0.7 };
const bizMax = p => 9999;   // sem limite de negócios
function sheatheToggle(p, force, quiet) {
  const now = now_(); if (!p || p.downed || p.bound || p.dev || now < (p.sheT || 0)) return;
  const want = force != null ? !!force : !p.sheathed; if (want === !!p.sheathed) return;
  const long = p.cls !== 'knight' || p.wpn === 'halberd', ms = long ? 750 : 500;
  p.sheT = now + ms; p.atk = null; p.parry = null; if (want && p.drawT) p.drawT = 0;
  anim('p', p, (want ? 'sheathe' : 'drawwp') + (long ? 'B' : 'H'), p.x, p.y, { ms });
  if (quiet && want) { p.autoShea = true; p.taskT = now; }
  setTimeout(() => { if (!S.players[p.id]) return; p.sheathed = want; p.sheT = 0; sendStat(p); }, quiet ? 120 : ms);
}

// ============================================================
//  SENTINELAS AMEAÇANDO — sacam a arma e mandam: guardar a arma, sair de lugar proibido, explicar o corpo, ou ficam de olho
//  (suspeito). Três avisos; desobedeceu, fica procurado por 1 minuto e ela ataca.
// ============================================================
const THREAT_LINES = { weapon: ['Guarde essa arma!', 'Estou mandando: guarde a arma!', 'Último aviso! Guarde a arma!'], trespass: ['Você não pode ficar aqui!', 'Saia agora, ou eu te tiro!', 'Último aviso! Fora daqui!'] };
const bodyOf = q => { if (q.carrying) { const v = S.players[q.carrying]; return v ? { k: 'p', id: v.id, e: v, dead: false } : null; } if (q.drag) { const t = dragTarget(q.drag.k, q.drag.id); if (t && (q.drag.k === 'c' || t.downed || t.dead)) return { k: q.drag.k, id: q.drag.id, e: t, dead: q.drag.k === 'c' || !!t.dead }; } return null; };
function trespassAt(q) {
  const bi = WORLD.bld[tileAt(q.x, q.y)], b = BUILDINGS[bi]; if (!b) return false;
  if (b.kind === 'castle') { if (CASTLE_OPEN || q.kjail) return false; const t = typeof crownRec === 'function' ? (crownRec().title[estOwner(q)] | 0) : 0, fl = q.fl || 0; if (fl === 0) return !(audienceOpen() || t >= 1); if (fl === 1) return t < 1; if (fl === 2) return t < 2; return t < 3; }   /* térreo no horário das audiências; 1º Escudeiro, 2º Cavaleiro, acima e subsolos só Lorde */   /* por enquanto o castelo está aberto para conferir os andares */
  if (b.kind === 'bank') { const [dx, dy] = doorTile(b); return dist(q.x, q.y, dx, dy) > Math.max(b.w, b.h) - 2.6; }   // perto do cofre
  return false;
}
function threatWhy(q, now) {
  if (q.dev || q.downed || q.jailUntil > now || q.bound || q.escortBy || q.carriedBy || q.condemned || now < (q.wanted || 0)) return null;
  if (bodyOf(q) && !(now < (q.bodyOk || 0))) return 'body';
  if (trespassAt(q)) return 'trespass';
  if (!q.sheathed && !q.sheT && inSafe(q.x, q.y)) return 'weapon';
  if (!(now < (q.suspectT || 0)) && repOf(q) < 20) return 'suspect';
  return null;
}
function guardThreat(n, now, dt) {
  const shout = txt => near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt, ms: 1 }, VIEW_RADIUS + 4);
  if (n.threat) {
    const T = n.threat, q = S.players[T.id], d = q ? dist(n.x, n.y, q.x, q.y) : 99, why = q && d < 18 ? threatWhy(q, now) : null;
    if (!why || (T.why !== why && T.why !== 'suspect')) { if (q && T.warn > 0 && d < 12 && T.why !== 'suspect') shout(T.why === 'weapon' ? 'Assim está melhor.' : 'Bom. Ande na linha.'); n.threat = null; return false; }
    T.why = why; n.face = Math.atan2(q.y - n.y, q.x - n.x);
    if (d > (why === 'body' ? 1.4 : 2.4)) npcWalk(n, q.x, q.y, why === 'body' ? 2.2 : 1.7, dt); else n.walk = false;
    if (why === 'body') { if (!T.called) { T.called = 1; shout('Pare aí! O que é isso que você está carregando?'); } if (d < 1.6) { bodyInquiry(n, q, now); n.threat = null; } return true; }
    if (why === 'suspect') { if (!T.said) { T.said = 1; shout(['Estou de olho em você.', 'Andando na linha, ouviu?', 'Nada de gracinha na minha cidade.'][Math.floor(Math.random() * 3)]); } if (now - T.t0 > 14000) { q.suspectT = now + 180000; n.threat = null; } return true; }
    if (now >= T.t && d < 10) {
      if (T.warn >= (repOf(q) >= 75 || (((q.feats || {}).rg || {}).guarda || 0) >= 40 ? 4 : 3)) { q.wanted = Math.max(q.wanted || 0, now + 60000); Net.toAll({ t: 'wanted', id: q.id, ms: q.wanted - now }); tell(q, 'Você desobedeceu a sentinela: procurado por 1 minuto!'); shout('Você pediu por isso!'); n.arrest = q.id; n.aggro = q.id; n.threat = null; return false; }
      shout(THREAT_LINES[why][Math.min(T.warn, THREAT_LINES[why].length - 1)]); T.warn++; T.t = now + 3800; if (T.warn === 1) tell(q, why === 'weapon' ? 'A sentinela manda guardar a arma (G). São três avisos.' : 'A sentinela manda você sair daqui. São três avisos.');
    }
    return true;
  }
  if (!inSafe(n.x, n.y)) return false;
  for (const q of Object.values(S.players)) {
    if (dist(n.x, n.y, q.x, q.y) > 7 || (q.fl || 0) !== 0 && (q.fl || 0) !== (n.fl || 0)) continue;
    const why = threatWhy(q, now); if (!why) continue; if (why === 'weapon' && dist(n.x, n.y, q.x, q.y) > 7 * 2 / 3) continue;   /* arma empunhada: a sentinela só nota de mais perto (um terço a menos) */
    if (WORLD.bld[tileAt(q.x, q.y)] !== WORLD.bld[tileAt(n.x, n.y)] && !sightClear(n.x, n.y, q.x, q.y)) continue;
    if (Object.values(S.npcs).some(o => o !== n && o.threat && o.threat.id === q.id)) continue;   // outra sentinela já está cuidando
    n.threat = { id: q.id, why, warn: 0, t: now + 700, t0: now }; return true;
  }
  return false;
}
// interrogatório: as testemunhas decidem. Alguém viu você atacar/matar? Preso. Ninguém viu? Aviso e segue.
function bodyInquiry(n, q, now) {
  const B = bodyOf(q), W = ((S.wit || {})[memKey(q)] || []).filter(w => now - w.t < 1800000 && w.seen.some(id => S.npcs[id] && !S.npcs[id].dead));
  const hit = W.find(w => B && w.vic === B.id) || W.find(w => w.kind === 'murder') || W[0];
  const say = txt => near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt, ms: 1 }, VIEW_RADIUS + 4);
  if (hit) {
    const wn = S.npcs[hit.seen.find(id => S.npcs[id] && !S.npcs[id].dead)], who = wn ? wn.name.split(',')[0] : 'uma testemunha';
    say(who + ' viu tudo. Você está preso!'); if (q.drag) stopDrag(q); if (q.carrying) dropCarried(q);
    q.wanted = now + 300000; crimeSentence(q, hit.kind === 'murder' || (B && B.dead) ? 'murder' : 'assault'); Net.toAll({ t: 'wanted', id: q.id, ms: 300000 });
    tell(q, who + ' contou à sentinela o que você fez. Renda-se (Y) ou lute.'); sys(n.name + ' prendeu ' + q.name + ': ' + who + ' testemunhou.'); n.arrest = q.id; n.aggro = q.id;
  } else {
    say(B && B.dead ? 'Ninguém viu nada... Leve esse corpo ao templo. E não me apareça com outro.' : 'Leve-o à Irmã Lúmina, na capela. Rápido.');
    q.bodyOk = now + 180000; tell(q, 'A sentinela te liberou: ninguém testemunhou nada contra você.');
  }
}
// moradores vendo alguém arrastar/carregar um corpo: desmaiado = oferecem ajuda; morto = espanto, fuga (os corajosos mandam largar),
// chamam a guarda e ficam com má impressão (que vira fofoca na taverna)
function bodyReact(n, now) {
  if (n.dead || n.downed || n.sleeping || n.kind === 'guard' || n.kind === 'captain' || n.fight) return;
  for (const p of Object.values(S.players)) {
    if (p.dev) continue; const B = bodyOf(p); if (!B) continue; const d = dist(n.x, n.y, p.x, p.y); if (d > 7) continue;
    if (WORLD.bld[tileAt(n.x, n.y)] !== WORLD.bld[tileAt(p.x, p.y)] && !sightClear(n.x, n.y, p.x, p.y)) continue;
    S.bodyT = S.bodyT || {}; const key = n.id + '|' + p.id; if (now - (S.bodyT[key] || 0) < 25000) continue; S.bodyT[key] = now;
    const sh = (a, txt) => near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a, txt, ms: 1 }, VIEW_RADIUS + 4);
    if (!B.dead) { sh('talk', ['Ele está bem? A capela fica perto da praça.', 'Precisa de ajuda com ele?', 'Coitado... leve-o à Irmã Lúmina.'][Math.floor(Math.random() * 3)]); continue; }
    memAdd(n, p, 'body');
    if (BRAVE.has(n.kind) || BRAVE.has(n.id)) sh('shout', ['Largue esse corpo!', 'O que você fez?!', 'Alguém chame a guarda!'][Math.floor(Math.random() * 3)]);
    else { sh('shout', ['Um corpo!', 'Socorro! Assassino!', 'Meu Deus... Guardas!'][Math.floor(Math.random() * 3)]); n.flee = { id: p.id, until: now + 7000 }; }
    const g = Object.values(S.npcs).filter(q => q.kind === 'guard' && !q.dead && !q.downed && !q.lead && !q.carrying).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
    if (g && dist(g.x, g.y, n.x, n.y) < 35) g.alert = { x: p.x, y: p.y, until: now + 20000 };
  }
}

// ============================================================
//  CHUVA DE OURO DO TECELÃO — moedas brotam em volta dele; qualquer jogador pega passando por cima; somem em 10 min
// ============================================================
const COIN_MS = 600000;
function coinRain(w, amount) {
  S.coins = S.coins || {}; const n = clamp(Math.round(amount / 5), 6, 48), add = []; let left = Math.round(amount);
  for (let k = 0; k < n && left > 0; k++) {
    const v = k === n - 1 ? left : Math.max(1, Math.round(amount / n * (0.6 + Math.random() * 0.8))); left -= v;
    let x = w.x, y = w.y; for (let t = 0; t < 12; t++) { const a = Math.random() * Math.PI * 2, r = 1.1 + Math.random() * 2.6; x = w.x + Math.cos(a) * r; y = w.y + Math.sin(a) * r; if (canStand(x, y, 0, 0.15) && WORLD.bld[tileAt(x, y)] === WORLD.bld[tileAt(w.x, w.y)]) break; x = w.x; y = w.y; }
    const id = 'c' + (S.coinN = (S.coinN || 0) + 1), c = { id, x: +x.toFixed(2), y: +y.toFixed(2), v, t: now_(), d: Math.round(k * 55 + Math.random() * 120) }; S.coins[id] = c; add.push(c);
  }
  Net.toAll({ t: 'coins', add, from: w.id }); near(w.x, w.y, { t: 'anim', w: 'p', id: w.id, a: 'cast', ms: 900 });
}
function coinTick(now) {
  const C = S.coins; if (!C) return; const del = [];
  for (const id in C) { const c = C[id]; if (now - c.t > COIN_MS) { delete C[id]; del.push([id, null]); continue; } if (now - c.t < (c.d || 0) + 650) continue;
    for (const p of Object.values(S.players)) { if (p.downed || p.carriedBy || (p.fl || 0) !== 0 || Math.abs(p.x - c.x) > 0.7 || Math.abs(p.y - c.y) > 0.7 || dist(p.x, p.y, c.x, c.y) > 0.62) continue; p.gold += c.v; delete C[id]; del.push([id, p.id, c.v]); sendStat(p); break; } }
  if (del.length) Net.toAll({ t: 'coins', del });
}

// ============================================================
//  POUSADA DO JAVALI MAGRO — 8 cabines com porta (catre + baú de 12 espaços) a 3 de ouro por dia, pagos na hora, sem caução.
//  Quem aluga dorme lá (Bem descansado) e acorda lá se não tiver casa. De noite, viajantes também se hospedam.
//  Pode ser comprada como negócio: as diárias vão para o cofre do dono.
// ============================================================
const HOTEL_PRICE = 3, HOTEL_SLOTS = 12;
let HOTEL_R = null;
function hotelRooms() {
  if (HOTEL_R) return HOTEL_R; const bi = BUILDINGS.findIndex(b => b.kind === 'hotel'); if (bi < 0) return (HOTEL_R = []);
  if (HOTEL_CABS.length) return (HOTEL_R = HOTEL_CABS.map(Q => ({ k: Q.k, bi, bed: { ...BEDS[Q.bedIdx], i: Q.bedIdx }, bedIdx: Q.bedIdx, chest: Q.chest || null, door: Q.door })));
  const b = BUILDINGS[bi], L = interiorLayout(b, 0), beds = BEDS.map((B, i) => ({ ...B, i })).filter(B => B.bi === bi), chests = L.F.filter(f => f.t === 'chest').map(f => { const [x, y] = bLocal(b, f.i, f.j); return { x, y, i: f.i }; }).sort((a, c) => a.i - c.i);
  beds.sort((a, c) => (a.x - c.x) || (a.y - c.y));
  return (HOTEL_R = beds.map((B, k) => ({ k, bi, bed: B, bedIdx: B.i, chest: chests[k] || null })));
}
const hotelData = () => { const E = estateLoad(); E.hotel = E.hotel || {}; E.hotel.rooms = E.hotel.rooms || {}; return E.hotel; };
function hotelRoomOf(p) { const H = hotelData(), k = estOwner(p), day = estDay(); for (const r in H.rooms) { const R = H.rooms[r]; if (R.who === k && R.until > day && +r < hotelRooms().length) return +r; } return -1; }   // cabine que deixou de existir não conta
function hotelBedOf(p) { const k = hotelRoomOf(p); return k >= 0 && hotelRooms()[k] ? hotelRooms()[k].bedIdx : -1; }
function hotelFree() { const H = hotelData(), day = estDay(), R = hotelRooms(); for (let k = 0; k < R.length; k++) { const x = H.rooms[k]; if (!x || (x.who && !(x.until > day)) || (x.npc && !(S.npcs || {})[x.npc])) return k; } return -1; }
function hotelPay(v, who) { const P = PROPS.find(q => q.kind === 'hotel'), r = P && S.estate && S.estate.r[P.id]; if (r && r.biz) { r.biz.cofre += v; r.biz.today = r.biz.today || { rev: 0, sold: 0, cost: 0 }; r.biz.today.rev += v; bizLog(r.biz, who + ' pagou ' + v + ' de diária.'); } }
function hotelView(p) { const k = hotelRoomOf(p), H = hotelData(), day = estDay(); return { t: 'hotel', room: k, until: k >= 0 ? H.rooms[k].until - day : 0, free: hotelRooms().filter((R, i) => { const x = H.rooms[i]; return !x || (x.who && !(x.until > day)); }).length, items: k >= 0 ? (H.rooms[k].items || {}) : {} }; }
function hotelMsg(p, m) {
  const H = hotelData(), day = estDay(), keeper = S.npcs && S.npcs.hotelkeeper;
  if (m.a === 'rent') {
    if (keeper && (keeper.dead || keeper.downed || dist(keeper.x, keeper.y, p.x, p.y) > 4)) { tell(p, 'Fale com Dona Ilsa, no balcão da pousada.'); return; }
    const d = [1, 3, 7].includes(m.d | 0) ? m.d | 0 : 1, cost = HOTEL_PRICE * d; if ((Math.floor((bankLoad().acc[estOwner(p)] || { g: 0 }).g) + p.gold) < cost) { tell(p, 'A diária é ' + HOTEL_PRICE + ' de ouro. Você não tem ' + cost + ' (banco + bolsa).'); return; }
    let k = hotelRoomOf(p); if (k < 0) { k = hotelFree(); if (k < 0) { tell(p, 'Lotado! Todas as cabines estão ocupadas. Volte mais tarde.'); return; } H.rooms[k] = { who: estOwner(p), name: p.name, until: day, items: (H.rooms[k] && H.rooms[k].who === estOwner(p) && H.rooms[k].items) || {} }; }
    debit(estOwner(p), p, cost); H.rooms[k].until = Math.max(H.rooms[k].until, day) + d; hotelPay(cost, p.name); estateSave(); sendStat(p);
    tell(p, 'A cabine ' + (k + 1) + ' é sua por ' + (H.rooms[k].until - day) + ' dia(s). O catre e o baú (12 espaços) são só seus; você acorda aqui se não tiver casa.'); Net.toOne(p.id, hotelView(p)); return;
  }
  if (m.a === 'view') { Net.toOne(p.id, hotelView(p)); return; }
  const k = hotelRoomOf(p), R = k >= 0 ? hotelRooms()[k] : null; if (!R || !R.chest) { tell(p, 'Esse baú é de outro hóspede.'); return; }
  if (dist(p.x, p.y, R.chest.x, R.chest.y) > 2.2) { tell(p, 'Chegue perto do baú da sua cabine.'); return; }
  const it = H.rooms[k].items = H.rooms[k].items || {}, key = String(m.k);
  if (m.a === 'put') { if (!LOOT[key] || !(p.inv[key] > 0)) return; if (!it[key] && Object.keys(it).length >= HOTEL_SLOTS) { tell(p, 'O baú da cabine só tem 4 espaços.'); return; } const n = Math.min(p.inv[key], Math.max(1, m.n | 0)); p.inv[key] -= n; if (!p.inv[key]) delete p.inv[key]; it[key] = (it[key] || 0) + n; }
  else if (m.a === 'take') { if (!(it[key] > 0)) return; if (!p.inv[key] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Mochila cheia.'); return; } const n = Math.min(it[key], Math.max(1, m.n | 0)); it[key] -= n; if (!it[key]) delete it[key]; p.inv[key] = (p.inv[key] || 0) + n; }
  estateSave(); sendStat(p); Net.toOne(p.id, hotelView(p));
}
// viajantes e visitantes que estão na cidade à noite se hospedam (pagam a diária ao dono) e vão embora de manhã
function hotelNight(n, now, dt) {
  if (!/^v_(trav|vis|monk|peas)/.test(n.kind) || n.thief || n.wantedT > now) return false;
  const hr = resHour(), night = hr >= 21.5 || hr < 6, H = hotelData();
  if (n.hroom == null) { if (!night || n.leaving) return false; const k = hotelFree(); if (k < 0) return false; n.hroom = k; H.rooms[k] = { npc: n.id, name: n.name }; hotelPay(HOTEL_PRICE, n.name.split(',')[0]); }
  const R = hotelRooms()[n.hroom];
  if (!night || !R) { if (H.rooms[n.hroom] && H.rooms[n.hroom].npc === n.id) delete H.rooms[n.hroom]; n.hroom = null; n.sleeping = false; n.leaving = true; n.rpath = null; return false; }
  if (dist(n.x, n.y, R.bed.x, R.bed.y) > 1.5) { n.sleeping = false; npcWalk(n, R.bed.x, R.bed.y, 1.0, dt); } else { n.x = R.bed.x; n.y = R.bed.y; n.sleeping = true; n.walk = false; }
  return true;
}

// ============================================================
//  PLATEIA NAS EXECUÇÕES — quem está perto vai até o cadafalso e forma uma roda; reage conforme o que acha do condenado
//  (quem gosta pede clemência e chora, quem não gosta comemora; os outros rezam, cobrem os olhos, cochicham);
//  na hora da lâmina, espanto e gritos. Depois a cidade comenta por um dia.
// ============================================================
const CROWD_SKIP = new Set(['guard', 'captain', 'executioner', 'jailer', 'banker', 'banker2', 'banker3', 'banker4', 'banker5', 'banker6', 'bankporter']);
function crowdTick(n, now, dt) {
  const E = S.exec; if (!E) return false;
  if (now > E.until || (S.players[E.id] && S.players[E.id].execTok !== E.tok && now < E.drop - 500)) { if (now > E.until) { S.execGossip = { name: E.name, key: E.key, until: now + ESTATE_DAY_MS }; S.exec = null; } else S.exec = null; for (const o of Object.values(S.npcs)) if (o.crowd) { o.crowd = null; o.goHome = !o.transient && !o.role; o.rpath = null; o.act = null; } return false; }
  if (CROWD_SKIP.has(n.kind) || n.sleeping || n.lead || n.carrying || n.dragBy || n.gripBy || n.fight || n.flee || n.job || n.thief || n.wantedT > now) return false;
  if (!n.crowd) { if (dist(n.x, n.y, STAGE.x, STAGE.y) > 34) return false; let h = 7; for (const c of String(n.id)) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    const a = (h % 360) / 360 * Math.PI * 2, r = 3.4 + (h % 7) * 0.4; let tx = STAGE.x + Math.cos(a) * r, ty = STAGE.y + Math.sin(a) * r;
    for (let k = 0; k < 8 && !npcStand(tx, ty, 0.24); k++) { const a2 = a + k * 0.45; tx = STAGE.x + Math.cos(a2) * (r + k * 0.3); ty = STAGE.y + Math.sin(a2) * (r + k * 0.3); }
    const v = S.players[E.id], op = v ? opOf(n, v) : 0; n.crowd = { x: tx, y: ty, op, t: now + 1500 + Math.random() * 3000, said: 0, dropped: false }; }
  const C = n.crowd;
  if (dist(n.x, n.y, C.x, C.y) > 0.5) { npcWalk(n, C.x, C.y, 1.5, dt); return true; }
  n.walk = false; n.dir = dirFromVecS(STAGE.x - n.x, STAGE.y - n.y);
  const sh = (a, txt) => near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a, txt, ms: txt ? 1 : 1600, tx: STAGE.x, ty: STAGE.y }, VIEW_RADIUS + 10);
  if (now >= E.drop && !C.dropped) { C.dropped = true;   // a lâmina cai
    if (C.op >= 15) sh(Math.random() < 0.5 ? 'sad' : 'fear'); else if (C.op <= -15) sh('cheer'); else sh(Math.random() < 0.5 ? 'surprise' : 'fear');
    if (Math.random() < 0.35) setTimeout(() => near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt: C.op >= 15 ? ['Não!', 'Que horror...', 'Pobre alma...'][Math.floor(Math.random() * 3)] : C.op <= -15 ? ['Bem feito!', 'Justiça!', 'Já vai tarde!'][Math.floor(Math.random() * 3)] : ['Meu Deus!', 'Ugh...', 'Não consigo olhar!'][Math.floor(Math.random() * 3)], ms: 1 }, VIEW_RADIUS + 10), 400 + Math.random() * 600);
    return true; }
  if (now > C.t && now < E.drop - 800 && C.said < 3) { C.t = now + 3500 + Math.random() * 5000; C.said++;
    if (C.op >= 15) { if (Math.random() < 0.5) sh('shout', ['Piedade!', 'Soltem ' + E.name.split(' ')[0] + '!', 'Clemência, por favor!', 'Isso é injusto!'][Math.floor(Math.random() * 4)]); else sh('sad'); }
    else if (C.op <= -15) { if (Math.random() < 0.6) sh('shout', ['Corta logo!', 'Justiça para Nae!', 'Assassino!', 'Que sirva de exemplo!'][Math.floor(Math.random() * 4)]); else sh('anger'); }
    else { const r = Math.random(); if (r < 0.3) sh('pray'); else if (r < 0.55) sh('fear'); else if (r < 0.8) sh('talk', ['Que coisa...', 'O que será que fez?', 'Não gosto de ver isso.', 'Coitado.'][Math.floor(Math.random() * 4)]); else sh('look'); } }
  return true;
}

// ponto de entrega: na frente da balconista, do lado da porta (qualquer orientação de loja)
function clerkFront(b, st) { const v = DOOR_V[b.door || 'S']; return [st.postX + v[0] * 0.9, st.postY + v[1] * 0.9]; }

// monstro dentro da cidade: a sentinela mais perto vai lutar (o crédito vai para o jogador mais perto)
function guardFightMonster(n, now, dt) {
  let m = n.monT && S.monsters[n.monT]; if (m && (!inSafe(m.x, m.y) || dist(n.x, n.y, m.x, m.y) > 18)) m = null;
  if (!m) { n.monT = null; let bd = 14; for (const q of Object.values(S.monsters)) { if (!inSafe(q.x, q.y) || (q.alt || 0) > 1) continue; const d = dist(n.x, n.y, q.x, q.y); if (d < bd) { bd = d; m = q; } } if (!m) return false; n.monT = m.id; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt: 'Fera na cidade! Às armas!', ms: 1 }); }
  const d = dist(n.x, n.y, m.x, m.y); n.fight = n.fight || null;
  if (d > 1.4) { npcWalk(n, m.x, m.y, 2.4, dt); return true; }
  if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1300; n.face = Math.atan2(m.y - n.y, m.x - n.x); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: m.x, ty: m.y });
    setTimeout(() => { if (!S.monsters[m.id] || n.dead || n.downed || dist(n.x, n.y, m.x, m.y) > 2) return; const dmg = rint(14, 24); m.hp -= dmg; near(m.x, m.y, { t: 'hit', k: 'm', id: m.id, x: m.x, y: m.y, dmg, ax: n.x, ay: n.y });
      if (m.hp <= 0) { const pp = Object.values(S.players).filter(q => !q.downed).sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y))[0]; if (pp && dist(pp.x, pp.y, m.x, m.y) < 14) killMonster(m, pp, 0); else { delete S.monsters[m.id]; near(m.x, m.y, { t: 'mdie', id: m.id, d: 0 }); } n.monT = null; } }, 450); }
  return true;
}

// ============================================================
//  TROCA COM AS LOJAS (NPCs) — abas Comprar / Vender, estoque que acaba e repõe com o tempo;
//  o que o jogador vende fica à venda para os outros. A opinião do NPC muda o preço; inimigo não negocia.
// ============================================================
const FOODS = ['bread', 'cookedmeat', 'ointment', 'firewood', 'berries', 'herb', 'apple', 'stew', 'pie', 'tea', 'venison', 'pork'];
const TRADE = {
  merchant: { sell: { bread: 20, ointment: 6, firewood: 15, rope: 6, lockpick: 4, axe: 3, pickaxe: 3, sickle: 3, pot_hp: 10, pot_mp: 8, pot_band: 15 }, buys: 'all' },
  innkeeper: { sell: { ale: 30, firemead: 12, bread: 15, cookedmeat: 10, stew: 6, pie: 4, tea: 8 }, buys: ['venison', 'pork', 'berries', 'apple', 'herb', 'cookedmeat'] },
  fruit: { sell: { apple: 20, berries: 20 }, buys: ['apple', 'berries', 'herb'] },
  smith: { sell: { axe: 4, pickaxe: 4, sickle: 4, lockpick: 3 }, buys: ['ore', 'gem', 'hardwood', 'log'] },
  st_apoth: { sell: { pot_hp: 8, pot_band: 12, herb: 12, ointment: 5, tea: 6 }, buys: ['herb', 'silverleaf', 'flaxraw'] },
  st_bakery: { sell: { bread: 12, pie: 4 }, buys: ['wheat', 'apple', 'berries'] },
  st_witch: { fast: 1, sell: { elixir_breath: 6, elixir_warm: 8, elixir_swift: 6, amulet_luck: 2, pot_mp: 12, pot_hp: 12, silverleaf: 8 }, buys: ['herb', 'silverleaf', 'gem', 'goo', 'toadskin', 'wispdust', 'slimecore', 'trollheart', 'dragonscale', 'rattail', 'bone'] },
  st_arcane: { sell: { wand: 4, wand_fine: 2, gem: 3, pot_mp: 8 }, buys: ['gem', 'hardwood', 'silverleaf', 'log', 'wand', 'wand_fine', 'wand_arcane'] },
  st_tailor: { sell: { pot_band: 15, rope: 5, cape_plum: 3, cape_night: 3, cape_emerald: 3, cape_crimson: 3, cape_ivory: 2, robe_star: 2, robe_plum: 2, robe_forest: 2 }, buys: ['flaxraw', 'pelt'] },
  st_scroll: { sell: { map: 6 }, buys: ['log', 'hardwood'] },
};
const TRADER_POOL = ['gem', 'silverleaf', 'hardwood', 'wand', 'map', 'lockpick', 'ointment', 'pot_hp', 'pot_mp'];
const tBase = k => k.startsWith('pot_') ? (ITEMS[k.slice(4)] || {}).price || 10 : (LOOT[k] || {}).price || 0;
const tName = k => k.startsWith('pot_') ? (ITEMS[k.slice(4)] || {}).name || k : (LOOT[k] || {}).name || k;
function tradeCat(n) {
  if (n.trader) { if (!n.tcat) { const sell = {}; for (let i = 0; i < 4; i++) { const k = TRADER_POOL[Math.floor(Math.random() * TRADER_POOL.length)]; sell[k] = 1 + Math.floor(Math.random() * 3); } n.tcat = { sell, buys: 'all', mark: 1.3, pay: 0.7 }; } return n.tcat; }
  return TRADE[n.kind] || TRADE[n.id];
}
function tradeStock(n) {
  const C = tradeCat(n); S.trade = S.trade || {}; let T = S.trade[n.id]; const now = now_();
  if (!T) T = S.trade[n.id] = { stock: { ...C.sell }, t: now };
  { const rb = npcBiz(n); if (rb && rb.biz.store && n.id === 'smith') { for (const k of ['axe', 'pickaxe', 'sickle']) while ((T.stock[k] || 0) < (C.sell[k] || 0) + 2 && (rb.biz.store.tools || 0) >= 1) { T.stock[k] = (T.stock[k] || 0) + 1; rb.biz.store.tools -= 1; } } }   // forja de jogador: ferramentas da produção vão para o balcão
  const per = BIZ_HOUR_MS * (C.fast ? 1 : 2), steps = Math.floor((now - T.t) / per); if (steps > 0 && !n.trader) { T.t += steps * per;   /* a Morgana repõe a cada hora do jogo */ for (const k in C.sell) T.stock[k] = Math.min(C.sell[k], (T.stock[k] || 0) + steps); }   // repõe 1 de cada a cada 2 horas do jogo
  return T;
}
const tOwnBiz = (n, p) => { const rb = npcBiz(n); return !!(rb && p && rb.owner === estOwner(p)); };   /* o dono compra do próprio negócio a preço de custo */
const tSellPrice = (n, p, k) => { if (tOwnBiz(n, p)) return Math.max(1, Math.ceil(tBase(k))); const C = tradeCat(n), own = C.sell && k in C.sell, glut = (k === 'bread' || k === 'pie') && ((S.trade || {})[n.id] || { stock: {} }).stock[k] > 25 ? 0.75 : 1; return Math.max(1, Math.round(tBase(k) * (C.mark || 1) * (own ? 1 : 1.3) * glut * (opPriceMul(n, p) || 1))); };
const tBuyPrice = (n, p, k) => { const C = tradeCat(n), own = C.sell && k in C.sell; return Math.max(1, Math.floor(tBase(k) * (C.pay || 1) * (own || FOODS.includes(k) ? 0.5 : C.buys === 'all' ? 1 : 0.8))); };
function tradeView(n, p) {
  const C = tradeCat(n), T = tradeStock(n), bankG = Math.floor((bankLoad().acc[estOwner(p)] || { g: 0 }).g);
  const sell = Object.entries(T.stock).filter(([k, q]) => q > 0 && tBase(k)).map(([k, q]) => [k, tName(k), tSellPrice(n, p, k), q]);
  const buys = Object.keys(p.inv).filter(k => p.inv[k] > 0 && LOOT[k] && LOOT[k].price && (C.buys === 'all' || C.buys.includes(k))).map(k => [k, tName(k), tBuyPrice(n, p, k), p.inv[k]]);
  return { t: 'trade', npc: n.id, name: n.name + (tOwnBiz(n, p) ? ' — seu negócio: preço de custo' : ''), sell, buys, gold: p.gold + bankG, hate: opPriceMul(n, p) === 0 };
}
function tradeMsg(p, m) {
  const n = S.npcs && S.npcs[m.npc]; if (!n || n.dead || n.downed || !tradeCat(n) || p.downed) return;
  if (dist(n.x, n.y, p.x, p.y) > 3.6) { tell(p, 'Chegue mais perto de ' + n.name.split(',')[0] + '.'); return; }
  if (opPriceMul(n, p) === 0 && m.a !== 'open') { tell(p, n.name.split(',')[0] + ' não quer negociar com você.'); return; }
  const T = tradeStock(n), k = String(m.k || ''), q = Math.max(1, Math.min(99, m.n | 0 || 1));
  if (m.a === 'buy') {
    { const NB = npcbOfNpc(n); if (NB && NB.closed) { tell(p, n.name.split(',')[0] + ': estamos fechados por dívidas. Volte em alguns dias.'); return; } }
    if (!(T.stock[k] > 0)) { tell(p, 'Acabou. Volte mais tarde.'); return; } const n2 = Math.min(q, T.stock[k]), cost = tSellPrice(n, p, k) * n2;
    if (!canPay(p, cost)) { tell(p, 'Você precisa de ' + cost + ' de ouro.'); return; }
    if (k.startsWith('pot_')) p.pots[k.slice(4)] = (p.pots[k.slice(4)] || 0) + n2; else { if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; } p.inv[k] = (p.inv[k] || 0) + n2; }
    payCity(p, cost); T.stock[k] -= n2; if (!T.stock[k] && !(tradeCat(n).sell && k in tradeCat(n).sell)) delete T.stock[k]; memAdd(n, p, 'buy');
    if (n.kind === 'st_arcane' && WANDS[k]) { if (wandOf(p) === k) p.wandInfo = wandRoll(k); const I = wandOf(p) === k ? p.wandInfo : wandRoll(k); Net.toOne(p.id, { t: 'scene', k: 'wand', txt: wandTxt(I) }); setTimeout(() => { if (S.players[p.id]) tell(p, 'A varinha escolheu você: ' + wandTxt(I) + '.'); }, 3300); }   // a escolha da varinha
    if (n.kind === 'st_tailor' && CLOAK_BY_ITEM[k]) { Net.toOne(p.id, { t: 'scene', k: 'fit' }); setTimeout(() => { if (S.players[p.id]) tell(p, 'Medidas tiradas e ajustes feitos: ' + LOOT[k].name + ' cai perfeitamente. Clique nela no inventário para vestir.'); }, 2800); }   // prova de roupa
    { const rb = npcBiz(n); if (rb && rb.owner === estOwner(p)) { rb.biz.cofre += cost; bizLog(rb.biz, 'Você levou ' + n2 + 'x ' + tName(k) + ' a preço de custo (' + cost + ' ouro no cofre).'); } else if (rb) { rb.biz.cofre += cost; rb.biz.today.rev += cost; rb.biz.today.sold += n2; bizLog(rb.biz, p.name + ' comprou ' + n2 + 'x ' + tName(k) + ' de ' + n.name.split(',')[0] + ' (' + cost + ' ouro).'); } else if (!rb) { const NB = npcbOfNpc(n); if (NB) { NB.cofre += cost; NB.today.rev += cost; NB.today.sold += n2; NB.today.pl = (NB.today.pl || 0) + cost; } } }
  } else if (m.a === 'sell') {
    const C = tradeCat(n); if (!(p.inv[k] > 0) || !LOOT[k] || !(C.buys === 'all' || C.buys.includes(k))) return; const n2 = Math.min(q, p.inv[k]), pay = tBuyPrice(n, p, k) * n2;
    p.inv[k] -= n2; if (!p.inv[k]) delete p.inv[k]; p.gold += pay; T.stock[k] = Math.min(40, (T.stock[k] || 0) + n2);   // fica à venda para os outros
  }
  sendStat(p); Net.toOne(p.id, tradeView(n, p));
}

// ============================================================
//  BLOQUEIO DIRECIONAL — segurando o botão direito, o jogador escolhe a direção: alto, esquerda, direita ou baixo.
//  De cima pede alto; de baixo pede baixo; lateral pede o lado de onde vem a lâmina; estocada pede um dos lados.
//  Escudo: bloqueia na direção certa gastando pouco fôlego, aguenta golpe carregado, para flechas e se desgasta.
// ============================================================
const PZ = ['top', 'L', 'R', 'low'];
const hasShield = p => p && p.cls === 'knight' && (p.wpn || 'sword') !== 'halberd' && !p.sheathed && (p.shieldHp ?? 100) > 0;
function reqZone(k, ax, ay, aa, def) {
  const B = STRIKES[k]; if (!B) return null;
  if (B.bz === 'top') return ['top']; if (B.bz === 'low') return ['low']; if (B.bz === 'side') return ['L', 'R'];
  if (k === 'slashR' || k === 'slashL') { const o = aa + (k === 'slashR' ? Math.PI / 2 : -Math.PI / 2), ox = ax + Math.cos(o) * 0.7 - def.x, oy = ay + Math.sin(o) * 0.7 - def.y, f = def.parry.a, cr = Math.cos(f) * oy - Math.sin(f) * ox; return [cr > 0 ? 'L' : 'R']; }
  return null;   // mordida e golpes sem direção: qualquer bloqueio serve
}
function blockEval(def, k, ax, ay, aa, now, W) {
  if (def.parry && def.sheathed && hasMove(def, 'kamae')) W = (W || 400) + 900;   /* postura de defesa: janela perfeita maior */
  if (!def.parry || Math.abs(angDiff(def.parry.a, Math.atan2(ay - def.y, ax - def.x))) > PARRY_ARC) return null;
  const okZ = true, shield = hasShield(def);   // só a direção importa: o escudo aponta para o mouse (sem as zonas alto/esquerda/direita/baixo)
  const perfect = okZ && now - def.parry.t0 <= PARRY_PERFECT + (W || 400) * 0.25 + treeEff(def, 'parry') + useLvl(def, 'parry') * 0.6 + (k === 'over' ? 80 : 0);
  return { okZ, shield, perfect };
}
function shieldWear(p, n) { if (!hasShield(p)) return; p.shieldHp = Math.max(0, (p.shieldHp ?? 100) - n); if (p.shieldHp <= 0) { tell(p, 'Seu escudo rachou e não segura mais! Hrodgar, na forja, conserta por 15 de ouro.'); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'hurt', ms: 500 }); } }
// empurrão de escudo (R): empurra e desequilibra quem está na frente
function shieldBash(p, a, now) {
  if (!hasShield(p) || p.downed || p.atk || now < (p.bashT || 0) || now < (p.stunUntil || 0)) return;
  if (p.cst < 25) { tell(p, 'Sem fôlego.'); return; } p.cst -= 25; p.bashT = now + 2500; p.parry = null; p.lastCombat = now;
  anim('p', p, 'sbash', p.x + Math.cos(a), p.y + Math.sin(a), { ms: 600 });
  setTimeout(() => {
    if (!S.players[p.id] || p.downed) return; const t = now_();
    for (const q of Object.values(S.players)) if (pvpOk(p, q) && inArc(p.x, p.y, a, q.x, q.y, 1.4, 0.8, 0.3)) { if (q.parry) { q.parry = null; } q.atk = null; q.stunUntil = Math.max(q.stunUntil || 0, t + 700); damagePlayer(q, rint(3, 7), { x: p.x, y: p.y, name: p.name }, 0, 'torso'); near(q.x, q.y, { t: 'anim', w: 'p', id: q.id, a: 'hurt', ms: 700 }); Net.toOne(q.id, { t: 'push', a, d: 0.9 }); if (inSafe(q.x, q.y)) witnessCrime(p, p.x, p.y); }
    for (const m of Object.values(S.monsters)) if (inArc(p.x, p.y, a, m.x, m.y, 1.5, 0.8, MON[m.type].rad || 0.3)) { m.atk = null; m.stunUntil = Math.max(m.stunUntil, t + 900); if (!MON[m.type].big) knockMon(m, p, t); hitRolled(p, m, rint(2, 5), false, 0); }
    for (const n of Object.values(S.npcs || {})) if (!n.dead && !n.downed && inArc(p.x, p.y, a, n.x, n.y, 1.4, 0.8, 0.3)) npcDamage(n, rint(2, 5), p);
    sendStat(p);
  }, 220);
}
