// ============================================================
//  SERVIDOR — roda só no navegador do anfitrião.
//  Decide dano, vida, monstros, ouro, xp e missões.
//  Otimização: cada jogador só recebe o que está perto dele
//  (VIEW_RADIUS), em pacotes compactos 10x por segundo.
// ============================================================
const S = { players: {}, monsters: {}, nextMid: 1, nextSpawn: 0, lastRegen: 0, filled: false, lastTick: 0 };
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
function fullStat(p) {
  const now = now_();
  return {
    t: 'pstat', id: p.id, rep: repOf(p), feats: p.feats || {}, wpn: p.wpn || 'sword', prof: p.prof || {}, job: p.job ? jobView(p) : null, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, lvl: p.lvl, xp: p.xp, gold: p.gold,
    pots: { hp: p.pots.hp, mp: p.pots.mp, band: p.pots.band || 0 }, body: p.body, bleed: p.bleed, food: Math.round(p.food ?? 100), water: Math.round(p.water ?? 100), cold: Math.round(p.cold || 0), infect: p.infect || 0, sick: Math.max(0, (p.sickUntil || 0) - now), hasSkin: !!p.hasSkin, lost: p.lost || 0, pro: p.pro || 0, knock: Math.max(0, (p.knockUntil || 0) - now), inv: { ...p.inv }, quests: { ...p.quests }, qdone: { ...p.qdone },
    buffs: Object.entries(p.buffs).filter(([, u]) => u > now).map(([k, u]) => [k, u - now]),
    cds: [0, 1, 2, 3].map(i => Math.max(0, (p.cds[i] || 0) - now)),
    combat: now - p.lastCombat < OUT_OF_COMBAT_MS, cst: Math.round(p.cst ?? CST_MAX), cstMax: cstMaxOf(p), bnd: p.bound ? p.bound.kind : '', bndE: p.bound ? Math.round(p.bound.esc || 0) : 0, chk: p.choking ? +(p.chokeT || 0).toFixed(2) : 0, jl: p.jailUntil > now ? p.jailUntil - now : 0, cell: p.cell ?? -1, esc: (p.gripBy || p.tied) ? Math.round(p.esc || 0) : 0, arw: (p.arrows || []).map(a => a.part), tree: p.tree || {}, use: p.use || {}, stun: Math.max(0, (p.stunUntil || 0) - now), rip: Math.max(0, (p.ripUntil || 0) - now), slow: Math.max(0, (p.slowUntil || 0) - now), downed: p.downed ? p.downed.until - now : 0,
  };
}
function sendStat(p) { Net.toOne(p.id, fullStat(p)); }
// envia um evento só para quem está perto de (x, y)
function near(x, y, msg, r = VIEW_RADIUS + 4) {
  for (const id in S.players) { const q = S.players[id]; if (dist(q.x, q.y, x, y) <= r) Net.toOne(id, msg); }
}
function sfx(x, y, text, color, d = 0, big = false) { near(x, y, { t: 'fx', x, y, text: String(text), color, d, big }); }
function sys(text) { Net.toAll({ t: 'chat', name: '', text }); }
function tell(p, text) { Net.toOne(p.id, { t: 'err', text }); }
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
  for (const id in S.monsters) { const m = S.monsters[id]; if (m !== self && dist(m.x, m.y, x, y) < r) return true; }
  return false;
}
function monStand(x, y, m) {
  if (m && m.z) { if (!canStandZ(x, y, 1, 0.3) || stairH(x, y) >= 0) return false; }
  else if (!canStand(x, y, 0, 0.3) || inSafe(x, y)) return false;
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
  const night = dayInfo().night;
  for (const s of S.bslots) {
    const m = s.mid != null ? S.monsters[s.mid] : null;
    if (m) { if (s.night && !night) { delete S.monsters[s.mid]; near(m.x, m.y, { t: 'mdie', id: m.id, d: 0 }); s.mid = null; } continue; }
    if (s.mid != null) { s.mid = null; s.deadAt = now; }          // morreu
    if (s.night && !night) continue;
    if (s.deadAt && now - s.deadAt < (s.b.fast && !s.boss ? s.b.fast : s.b.respawn && s.boss ? s.b.respawn : s.boss ? BOSS_RESPAWN : BASTION_RESPAWN)) continue;
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
    const cls = CLASSES[m.cls] ? m.cls : 'knight';
    const lvl = clamp(m.lvl | 0 || 1, 1, 300);
    const si = SKINS[cls].findIndex(s => s.id === m.skin), skin = si >= 0 && lvl >= SKIN_LVL[si] ? m.skin : SKINS[cls][0].id;
    const s = townSpot();
    const np = {
      id: from, name: String(m.name || 'Aventureiro').slice(0, 16), cls, skin,
      color: /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : '#8b2e2e',
      x: s.x, y: s.y, z: 0, lvl, xp: clamp(m.xp | 0, 0, need(lvl) - 1), gold: clamp(m.gold | 0, 0, 1e7),
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
    np.feats = {}; if (m.feats && typeof m.feats === 'object') for (const k of ['thief', 'jobs', 'shifts', 'rent']) if (isFinite(m.feats[k])) np.feats[k] = clamp(+m.feats[k], 0, 1e5);
    np.prof = {}; if (m.prof && typeof m.prof === 'object') for (const k in PROFS) if (isFinite(m.prof[k])) np.prof[k] = clamp(+m.prof[k], 0, 1e6);
    np.tree = cleanTree(cls, lvl, m.tree); np.use = {}; if (m.use && typeof m.use === 'object') for (const k in USE) if (isFinite(m.use[k])) np.use[k] = clamp(+m.use[k], 0, 1e6);
    np.maxHp = maxHpOf(np); np.maxMp = maxMpOf(np);
    if (m.quests) for (const q of QUESTS) if (m.quests[q.id] != null) np.quests[q.id] = clamp(m.quests[q.id] | 0, 0, q.count);
    if (m.qdone) for (const q of QUESTS) if (m.qdone[q.id]) np.qdone[q.id] = m.qdone[q.id] | 0;
    np.hp = np.maxHp; np.mp = np.maxMp;
    if (!m.lvl) { np.gold = 30; np.pots.hp = 3; np.pots.mp = 2; np.pots.band = 3; } // kit inicial
    S.players[from] = np;
    estateJoin(np);
    if (m.dev && typeof crypto !== 'undefined' && crypto.subtle) crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(m.dev).trim().toUpperCase())).then(buf => {
      const h = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      if (h !== DEV_HASH || !S.players[from]) { Net.toOne(from, { t: 'dev', ok: 0 }); return; }
      if (m.devMode === 'normal') { np.devPowers = true; Net.toOne(from, { t: 'dev', ok: 1, mode: 'normal' }); return; }   // criador com a vocação normal (toma dano, monstros atacam), mas com o painel
      np.dev = true; np.skin = 'weaver'; np.devHidden = false; Net.toOne(from, { t: 'dev', ok: 1 }); Net.toAll({ t: 'pinfo', p: pinfo(np) });
    });
    Net.toOne(from, { t: 'welcome', you: from, x: np.x, y: np.y, players: Object.values(S.players).map(pinfo), objs: S.objMods || {} });
    Net.toOthers({ t: 'pinfo', p: pinfo(np) }, from);
    setTimeout(() => { if (S.players[from] && S.npcs) Net.toOne(from, { t: 'vlist', list: Object.values(S.npcs).filter(n => n.transient).map(visPublic) }); }, 600);
    sendStat(np);
    sys(`${np.name}, ${CLASSES[cls].name}, chegou à Cidadela de Sxan.`);
    return;
  }
  if (!p) return;
  if (p.bound && BOUND_BLOCK.has(m.t)) return;   // amarrado: não luta, não pega nada
  switch (m.t) {
    case 'mv': handleMove(p, m); break;
    case 'target': p.target = m.id && S.monsters[m.id] ? m.id : null; break;
    case 'tlearn': {
      const T = TREE[p.cls]; if (!T) break; let ok = false; p.tree = p.tree || {};
      T.forEach(b => b.nodes.forEach((nd, i) => { if (nd.id !== m.id) return; const r = p.tree[nd.id] | 0; if (r >= nd.max || treePts(p) >= p.lvl - 1 || branchPts(p, b) < TREE_REQ[i]) return; p.tree[nd.id] = r + 1; ok = true; }));
      if (!ok) { tell(p, 'Não dá para aprender isso agora.'); break; }
      { const rh = p.hp / Math.max(1, p.maxHp), rm = p.mp / Math.max(1, p.maxMp); p.maxHp = maxHpOf(p); p.maxMp = maxMpOf(p); if (!p.downed) { p.hp = Math.max(1, Math.round(p.maxHp * rh)); p.mp = Math.round(p.maxMp * rm); } }
      sendStat(p); break;
    }
    case 'tskill': treeSkill(p, m.b | 0, m); break;
    case 'draw': bowDraw(p, !!m.on); break;
    case 'loose': bowLoose(p, m); break;
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
    case 'shoot': {
      const now = now_(); if (p.cls === 'knight' || p.downed || p.carrying || p.lifted || p.atk || p.casting || p.grabbed || now < p.nextAtk) break;
      const rng = CLASSES[p.cls].range + treeEff(p, 'range'), a = +m.a || 0, ok = q => q && Math.abs((q.z || 0) - (p.z || 0)) < 0.5 && (q.alt || 0) < 1.2 && dist(p.x, p.y, q.x, q.y) <= rng + (MON[q.type].rad || 0);
      let q = S.monsters[m.id]; if (!ok(q)) q = null;
      if (!q) { let best = 1e9; for (const o of Object.values(S.monsters)) { if (!ok(o)) continue; const da = Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), a)); if (da > 0.5) continue; const sc = da * 4 + dist(p.x, p.y, o.x, o.y); if (sc < best) { best = sc; q = o; } } }
      if (!q) break;
      p.target = q.id; basicAttack(p, q, now); break;
    }
    case 'chat': { const text = String(m.text || '').slice(0, 140).trim(); if (text) Net.toAll({ t: 'chat', id: from, name: p.name, text }); break; }
    case 'skill': if (!p.downed) useSkill(p, m.i | 0); break;
    case 'pot': if (!p.downed) usePot(p, m.k); break;
    case 'npc': npcAction(p, m); break;
    case 'gather': gather(p, m); break;
    case 'gathering': near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: m.a === 'crouch' ? 'gather' : 'atk_slashR', ms: 700 }); break;
    case 'job': jobMsg(p, m); break;
    case 'bank': bankMsg(p, m); break;
    case 'shift': shiftMsg(p, m); break;
    case 'op': { const n = S.npcs && S.npcs[m.id]; if (n) Net.toOne(p.id, { t: 'op', id: n.id, ...opInfo(n, p) }); break; }
    case 'gift': { const n = S.npcs && S.npcs[m.id], k = String(m.k || ''); if (!n || n.dead || n.downed || dist(p.x, p.y, n.x, n.y) > 3.5 || !(p.inv[k] > 0) || !FOOD[k] && k !== 'herb' && k !== 'gem' && k !== 'wand' && k !== 'map') break;
      S.giftT = S.giftT || {}; const key = n.id + '|' + memKey(p); if (now_() - (S.giftT[key] || 0) < 600000) { tell(p, n.name.split(',')[0] + ' agradece, mas já ganhou presente seu há pouco.'); break; }
      S.giftT[key] = now_(); p.inv[k]--; if (!p.inv[k]) delete p.inv[k]; memAdd(n, p, 'gift'); sendStat(p); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Para mim? Obrigado!', 'Que gentileza!', 'Não precisava!'][Math.floor(Math.random() * 3)], ms: 1 }); Net.toOne(p.id, { t: 'op', id: n.id, ...opInfo(n, p) }); break; }
    case 'revive': {
      const t = S.players[m.id];
      if (m.on && t && !t.downed && t !== p && !p.downed && t.hp < t.maxHp * KNEEL_HP && dist(p.x, p.y, t.x, t.y) <= 1.8) { t.aid = { by: p.id, start: now_() }; near(t.x, t.y, { t: 'rv', id: t.id, by: p.id }); }
      else if (!m.on && t && t.aid && t.aid.by === p.id) { t.aid = null; near(t.x, t.y, { t: 'rv', id: t.id, by: null }); }
      else if (m.on && t && t.downed && !t.decap && !p.downed && dist(p.x, p.y, t.x, t.y) <= 1.8) { t.revive = { by: p.id, start: now_() }; near(t.x, t.y, { t: 'rv', id: t.id, by: p.id }); }
      else if (!m.on && t && t.revive && t.revive.by === p.id) { t.revive = null; near(t.x, t.y, { t: 'rv', id: t.id, by: null }); }
      break;
    }
    case 'carry': {
      if (p.carrying) { dropCarried(p); break; }
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
      const b = BUILDINGS[m.b | 0], to = m.to | 0, fl = p.fl || 0; if (!b || p.downed || p.carriedBy || Math.abs(to - fl) !== 1 || to < 0 || to >= floorsOf(b)) break;
      const sw = stairWorld(b, Math.min(fl, to)); if (dist(p.x, p.y, (sw.L[0] + sw.U[0]) / 2, (sw.L[1] + sw.U[1]) / 2) > 2.2) break;
      const [ax, ay] = to > fl ? sw.arrive : sw.entry; p.x = ax; p.y = ay; p.fl = to; p.fb = to > 0 ? (m.b | 0) : -1; p.lastMv = now_(); p.sit = null;
      if (p.carrying) { const t = S.players[p.carrying]; if (t) { t.x = p.x; t.y = p.y; t.fl = p.fl; t.fb = p.fb; } }
      Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: p.fl, fb: p.fb });
      break;
    }
    case 'lift': {
      const i = m.i | 0, o = WORLD.obj[i], tx = i % MAP_W, ty = Math.floor(i / MAP_W);
      if (!THROWABLE[o] || p.lifted || p.carrying || p.downed || p.z >= 0.5 || p.fl > 0 || dist(p.x, p.y, tx, ty) > 1.7) break;
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
    case 'parry': if (m.on) { if (p.atk && !p.atk.done && p.cst >= FEINT_COST) { p.cst -= FEINT_COST; p.atk = null; } if (!p.atk && !p.downed && now_() >= (p.stunUntil || 0)) p.parry = { t0: now_(), a: +m.a || 0 }; } else p.parry = null; break;
    case 'parrya': if (p.parry && isFinite(+m.a)) p.parry.a = +m.a; break;
    case 'dodge': { const now = now_(); const lg = (p.lost || 0) & ~(p.pro || 0) & 24; if (lg || now < (p.knockUntil || 0) || p.downed || now < (p.dodgeCd || 0) || p.cst < DODGE.cost * Math.max(0.4, 1 - treeEff(p, 'dodgeCost') - useBonus(p, 'dodge')) || now < (p.stunUntil || 0)) break; p.cst -= DODGE.cost * Math.max(0.4, 1 - treeEff(p, 'dodgeCost') - useBonus(p, 'dodge')); useGain(p, 'dodge', 1); p.dodgeCd = now + DODGE.cd; p.dodgeUntil = now + DODGE.iframe; p.dodgeAllow = now + DODGE.ms + 400; p.parry = null; if (p.atk && !p.atk.done) p.atk = null; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'dash', ms: DODGE.ms + 120 }); sendStat(p);
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
      Net.toOne(p.id, { t: 'loot', k }); sendStat(p); break;
    }
    case 'cook': cookOrDrink(p, 'cook'); break;
    case 'drinkw': cookOrDrink(p, 'drink'); break;
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
    case 'emote': { const k = ['salute', 'dance', 'point', 'cheer', 'surprise', 'adore', 'anger', 'fear', 'sad'].includes(m.k) ? m.k : null; if (k && !p.downed) near(p.x, p.y, { t: 'emote', id: p.id, k }); break; }
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
      const b = BEDS[m.b | 0]; if (!b || dist(p.x, p.y, b.x, b.y) > 2.6) break;
      p.x = b.x; p.y = b.y; p.dir = dirFromVec(b.dx, b.dy, 0); p.sleep = m.b | 0; p.sit = null; p.walking = false; break;
    }
    case 'sit': {
      if (!m.on || p.downed || p.carrying || p.carriedBy) { p.sit = null; break; }
      const st = m.s != null ? WORLD.seats[m.s | 0] : null;
      if (st) { if (dist(p.x, p.y, st.x, st.y) > 2.5) break; p.x = st.x; p.y = st.y; p.dir = st.dir; p.sit = 'c'; }
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
    if (!c && ti >= 0) { const k = JAILCELLS.findIndex(q => q.tiles.has(ti) || (q.door[1] * MAP_W + q.door[0]) === ti); if (k >= 0 && st[k].locked && (q => q.door[1] * MAP_W + q.door[0])(JAILCELLS[k]) === ti) { back(); return; } } }
  if (p.sleep != null && m.w) p.sleep = null;   // voando / derrubado
  if (p.dev) { const x = +m.x, y = +m.y; if (isFinite(x) && isFinite(y)) { p.x = clamp(x, 1, MAP_W - 2); p.y = clamp(y, 1, MAP_H - 2); p.z = +m.z || 0; p.dir = m.d | 0; p.walking = !!m.w; p.lastMv = now_(); } return; }
  const now = now_();
  const x = +m.x, y = +m.y;
  if (!isFinite(x) || !isFinite(y)) return;
  const z = heightAt(x, y, p.z);
  const dt = Math.min(1, (now - p.lastMv) / 1000);
  const maxStep = PLAYER_SPEED * (m.sl || now < (p.dodgeAllow || 0) ? RUN_MUL * 2.6 : m.r ? RUN_MUL * 1.5 : 1.7) * (dt + 0.25) + 0.4;
  const ok = dist(p.x, p.y, x, y) <= maxStep && canStandZ(x, y, z, 0.18, p.fl || 0, p.fb ?? -1) && Math.abs(z - (+m.z || 0)) < 0.45;
  if (!ok || estateBlocked(p.name, p.x, p.y, x, y, S.estateL)) { Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: p.z, fl: p.fl || 0, fb: p.fb ?? -1 }); return; }
  if (p.sit && dist(p.x, p.y, x, y) > 0.05) p.sit = null;
  p.x = x; p.y = y; p.z = z; p.dir = m.d | 0; p.walking = !!m.w; p.running = !!m.r; p.crouch = !!m.c; p.slide = !!m.sl; p.tired = !!m.ti; p.lastMv = now;
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

function hostOnLeave(id) {
  const p = S.players[id];
  if (!p) return;
  if (p.carrying) dropCarried(p);
  if (p.carriedBy && S.players[p.carriedBy]) S.players[p.carriedBy].carrying = null;
  delete S.players[id];
  Net.toAll({ t: 'pleave', id });
  sys(`${p.name} deixou a cidadela.`);
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
  dmg *= 1 + treeEff(p, 'dmg') + (p._el === 'fire' ? treeEff(p, 'fire') : p._el === 'ice' ? treeEff(p, 'ice') : 0) + useBonus(p, p._melee ? MELEE_USE[p.cls] : RANGED_USE[p.cls]);
  if (tgt && MON[tgt.type] && MON[tgt.type].beh) dmg *= 1 + treeEff(p, 'beast');
  if (buffOn(p, 'banner')) dmg *= 1.15;
  const crit = p._forceCrit || Math.random() < c.crit + treeEff(p, 'crit') + (buffOn(p, 'agile') ? 0.1 : 0);
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
  if (c.gold) { const g = Math.round(c.gold * (1 + useBonus(p, 'skin'))); p.gold += g; Net.toOne(p.id, { t: 'lootgold', g }); }
  for (const k of c.items) { if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Inventário cheio.'); c.looted = false; c.gold = 0; c.items = c.items.slice(c.items.indexOf(k)); break; } p.inv[k] = Math.min(999, (p.inv[k] || 0) + 1); Net.toOne(p.id, { t: 'loot', k }); }
  if (c.looted) c.items = [];
  if (!auto && !c.gold && !c.items.length && c.looted) tell(p, 'Nada de útil aqui.');
  sendStat(p);
}
function killMonster(m, p, delay) {
  delete S.monsters[m.id];
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
  const busy = (p.running && p.walking) || now - p.lastCombat < 4000 ? 1.5 : 1, sick = now < (p.sickUntil || 0);
  p.food = Math.max(0, (p.food ?? 100) - dt * 100 / (SURV.foodMin * 60) * busy);
  p.water = Math.max(0, (p.water ?? 100) - dt * 100 / (SURV.waterMin * 60) * busy * (sick ? 2.5 : 1));
  if (p.water < 25 && !p.atk && !p.parry) drinkCanteen(p, now);   // bebe sozinho do cantil quando a sede aperta
  // frio: à noite, fora da cidade, longe do fogo e fora de casa
  const night = dayInfo().night, indoor = p.fl > 0 || bldAt(p.x, p.y) >= 0, warm = !night || indoor || nearFire(p);
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
  const take = () => { if (--p.inv[k] <= 0) delete p.inv[k]; };
  if (FOOD[k]) { take(); p.food = Math.min(100, p.food + FOOD[k] * (1 + useBonus(p, 'cook'))); if (k === 'stew') { p.water = Math.min(100, (p.water ?? 100) + 20); p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.15)); } if (k === 'cookedmeat') p.water = Math.max(0, p.water - 5); if ((k === 'venison' || k === 'pork') && Math.random() < 0.3) { p.sickUntil = now + 120000; tell(p, 'A carne crua caiu mal. Você está enjoado (sede dobrada por 2 min).'); } else tell(p, 'Você comeu ' + LOOT[k].name.toLowerCase() + '.'); }
  else if (k === 'ointment') { take(); p.infect = 0; p.infT = 0; tell(p, 'O unguento arde, mas a febre baixa.'); }
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
    let ok = false; for (let y = Math.round(p.y) - 2; y <= Math.round(p.y) + 2 && !ok; y++) for (let x = Math.round(p.x) - 2; x <= Math.round(p.x) + 2; x++) { if (!inBounds(x, y)) continue; const i = y * MAP_W + x, g = WORLD.ground[i], o = WORLD.obj[i]; if ((g === T.WATER || g === T.SHALLOW || o === O.WELL || o === O.FOUNTAIN) && dist(x, y, p.x, p.y) < 1.9) { ok = true; break; } }
    if (!ok) return; near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'scoop', ms: 1500 }); p.water = 100; if (p.hasSkin) p.pots.water = 5; tell(p, p.hasSkin ? 'Você bebeu e encheu o odre.' : 'Você bebeu até matar a sede.'); sendStat(p);
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
  if (p.sleep != null) p.sleep = null;
  if (p.downed) {
    // lobos atacam quem está caído: a pessoa sangra mais rápido
    if (m && MON[m.type] && MON[m.type].beh === 'pred' && m.id != null && S.monsters[m.id] && !m.dragging && !p.dragBy && !p.carriedBy && !p.tied && Math.random() < 0.5) { m.dragging = p.id; m.dragUntil = now_() + 6000; p.dragBy = 'w:' + m.id; p.dragMode = 'foot'; }
    if (m && MON[m.type] && MON[m.type].beh === 'pred') { p.downed.until -= 2500; near(p.x, p.y, { t: 'hit', k: 'p', id: p.id, x: p.x, y: p.y, dmg: 0, d: delay, ax: m.x, ay: m.y }); }
    return;
  }
  const c = CLASSES[p.cls];
  let mult = 1 - c.armor;
  if (buffOn(p, 'wall')) mult *= 0.4;
  if (buffOn(p, 'warcry')) mult *= 0.8;
  if (buffOn(p, 'bless')) mult *= 0.9;
  mult *= Math.max(0.4, 1 - treeEff(p, 'armor')); if (buffOn(p, 'iron')) mult *= 0.6; if (buffOn(p, 'sanct')) mult *= 0.75;
  useGain(p, 'vigor', 0.5);
  if (p.body && PART_STATE(p.body.armB) >= 2) mult = Math.min(1, mult * 1.25);
  const part = exactPart || (zone ? pick(STRIKE_PART[zone]) : pickPart(m)), headK = part === 'head' ? 1.25 : 1;
  const dmg = Math.max(1, Math.round(raw * mult * headK));
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
  p.hp = p.maxHp; p.mp = p.maxMp; p.lastCombat = 0; p.atk = null; p.parry = null; p.cst = CST_MAX; p.lost = (p.lost || 0) & ~LOST.head; p.decap = false; p.knockUntil = 0;
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
function useSkill(p, i) {
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
  const offensive = sk.id !== 'heal' && sk.id !== 'wall' && sk.id !== 'agile';

  p.mp -= sk.mp; p.cds[i] = now + sk.cd;
  if (sk.cast) {
    p.casting = { i, until: now + sk.cast * (1 - Math.min(0.5, treeEff(p, 'castSpeed'))), tid: m && m.id }; p.castX = p.x; p.castY = p.y;
    near(p.x, p.y, { t: 'cast', id: p.id, ms: sk.cast, s: sk.name, el: sk.el });
  } else execSkill(p, i, m);
  sendStat(p);
}
function monstersNear(x, y, r) { return Object.values(S.monsters).filter(m => dist(m.x, m.y, x, y) <= r); }

function execSkill(p, i, m) {
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
    case 'fireball': { const d = flight(p.x, p.y, m.x, m.y) + 100; anim('p', p, 'fireball', tx, ty, { ...shout, proj: 'fire', d }); hitMonster(p, m, 2.6, d); aoe('boom', tx, ty, { d }); break; }
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
  const n = NPCS.find(q => q.id === m.n);
  { const sn = S.npcs && S.npcs[m.n]; if (sn && (sn.dead || sn.downed)) { tell(p, sn.dead ? sn.name + ' está morto.' : sn.name + ' está caído e não responde.'); return; } }
  const inJail = n && n.id === 'jailer' && WORLD.bld[tileAt(p.x, p.y)] === BUILDINGS.findIndex(b => b.kind === 'jail');
  if (!n || (!inJail && dist(p.x, p.y, (S.npcs && S.npcs[n.id] ? S.npcs[n.id].x : n.x), (S.npcs && S.npcs[n.id] ? S.npcs[n.id].y : n.y)) > 3.5)) { tell(p, 'Chegue mais perto para conversar.'); return; }
  if (n.id === 'jailer' && m.a === 'bail') {
    const q = S.players[m.who || p.id]; if (!q || !(q.jailUntil > now_())) { Net.toOne(p.id, { t: 'npc', n: n.id, text: 'Esse aí não está preso.' }); return; }
    const price = bailPrice(q); if (p.gold < price) { Net.toOne(p.id, { t: 'npc', n: n.id, text: 'A fiança é ' + price + ' de ouro. Você não tem o bastante.' }); return; }
    p.gold -= price; releasePlayer(q, (q === p ? 'Você pagou' : p.name + ' pagou') + ' a fiança de ' + price + ' de ouro. Está livre.'); Net.toOne(p.id, { t: 'npc', n: n.id, text: 'Fiança paga: ' + price + ' de ouro. Pode ir.' }); sendStat(p); return;
  }
  const say = text => Net.toOne(p.id, { t: 'npc', n: n.id, text });
  const pay = cost => { if (p.gold < cost) { say('Você não tem ouro suficiente.'); return false; } p.gold -= cost; return true; };
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
  } else if (n.id === 'smith' && m.a === 'prosth') {
    const part = ['legL', 'legR', 'armA', 'armB'].find(k => (p.lost || 0) & LOST[k] && !((p.pro || 0) & LOST[k]));
    if (!part) { say('Você está inteiro. Volte se precisar de mim.'); return; }
    if (!pay(PROSTH_PRICE)) return;
    p.pro = (p.pro || 0) | LOST[part]; p.bleed[part] = 0;
    say(part.startsWith('leg') ? 'Perna de pau de carvalho, presa com couro e ferro. Não vai correr, mas anda.' : 'Um gancho de ferro bem preso. Não segura espada, mas fere.');
  } else if (n.id === 'priest' && m.a === 'ritual') {
    if (!(p.lost & 30)) { say('A Aurora vê que você está inteiro.'); return; }
    if (!pay(RITUAL_PRICE)) return;
    p.lost = 0; p.pro = 0; for (const k of BODY_PARTS) { p.body[k] = 100; p.bleed[k] = 0; } aoe('heal', p.x, p.y, { id: p.id });
    say('Pelo fogo da Aurora, o que foi tirado volta a ser seu. Não desperdice este milagre.');
  } else if (n.id === 'priest' && m.a === 'bless') {
    p.hp = p.maxHp; p.mp = p.maxMp; p.buffs.bless = now + 180000;
    if (p.body) for (const k of BODY_PARTS) { if ((p.lost || 0) & (LOST[k] || 0)) continue; p.body[k] = 100; p.bleed[k] = 0; }   // a sacerdotisa trata todas as feridas
    p.infect = 0; p.infT = 0; p.cold = 0;
    aoe('heal', p.x, p.y, { id: p.id });
    say('Que a Aurora guarde seus passos. Suas feridas estão fechadas, e a bênção reduz o dano que você recebe por algum tempo.');
  } else if (n.id === 'innkeeper' && m.a === 'mead') {
    if (!pay(15)) return;
    p.buffs.mead = now + 180000;
    say('Hidromel da casa. Aquece o sangue: +10% de dano e recuperação mais rápida por 3 minutos.');
  } else if (n.id === 'innkeeper' && m.a === 'stew') {
    if (!pay(10)) return;
    p.hp = p.maxHp; p.mp = p.maxMp; p.food = 100; p.water = 100; p.cold = 0;
    say('Ensopado de javali, como minha mãe fazia. Coma com calma.');
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
  const speed = d.speed * (now < m.slowUntil ? 0.5 : 1) * ((m.lost || 0) & 24 ? 0.4 : 1), step = speed * dt;
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
  if (!tgt && m.aggro && valid(S.players[m.aggro]) && dist(m.x, m.y, S.players[m.aggro].x, S.players[m.aggro].y) <= 11) tgt = S.players[m.aggro];
  if (!tgt) {
    let best = 99;
    if (d.aggro > 0) for (const p of players) { if (!valid(p) || !prey(p)) continue; const dd = dist(m.x, m.y, p.x, p.y); if (dd <= d.aggro * (p.crouch ? 0.5 * (1 - treeEff(p, 'stealth')) : 1) && dd < best) { best = dd; tgt = p; } }
  }
  if (tgt) {
    if (homeDist > 13) { m.returning = true; m.aggro = null; m.taunt = null; return; }
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
    if (p.parry && Math.abs(angDiff(p.parry.a, toM)) <= PARRY_ARC) {
      const perfect = now - p.parry.t0 <= PARRY_PERFECT + A.W * 0.25 + treeEff(p, 'parry') + useLvl(p, 'parry') * 0.6; useGain(p, 'parry', perfect ? 3 : 1);
      if (perfect) { m.stunUntil = now + 850; m.nextAtk = Math.max(m.nextAtk, now + 900); p.ripUntil = now + RIPOSTE_MS; p.cst = Math.min(CST_MAX, p.cst + 5); near(p.x, p.y, { t: 'clang', x: (p.x + m.x) / 2, y: (p.y + m.y) / 2, perfect: 1, id: m.id }); }
      else { p.cst -= (10 + (d.big ? 18 : 6)) * ((p.lost || 0) & LOST.armB ? 1.6 : 1) * (1 - useBonus(p, 'parry')); near(p.x, p.y, { t: 'clang', x: (p.x + m.x) / 2, y: (p.y + m.y) / 2 }); if (p.cst <= 0) guardBreak(p, now); }
      sendStat(p); continue;
    }
    const crit = MON_MELEE[m.type] && A.k !== 'stab' && A.k !== 'bite' && Math.random() < (d.big ? 0.12 : 0.07);
    damagePlayer(p, Math.round(rint(d.dmg[0], d.dmg[1]) * STRIKES[A.k].mult * ((m.lost || 0) & 6 ? 0.4 : 1) * (crit ? 1.6 : 1)), m, 0, STRIKES[A.k].zone);
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
  const B = STRIKES[k]; if (!B || k === 'bite' || p.downed || p.carrying || p.lifted || p.casting || now < (p.stunUntil || 0) || now < (p.knockUntil || 0) || p.fl > 0) return;
  if (p.atk) {
    if (!p.atk.done && now < p.atk.t0 + p.atk.W && p.atk.k !== k && p.cst >= FEINT_COST) { p.cst -= FEINT_COST; }   // finta: troca de golpe no meio da preparação
    else return;
  } else if (p.cst < B.st) { tell(p, 'Sem fôlego.'); return; }
  else { p.cst -= B.st; useGain(p, 'breath', B.st / 10); }
  const M = MELEE[p.cls] || MELEE.knight, rip = now < (p.ripUntil || 0);
  const WP = p.cls === 'knight' ? WEAPONS[p.wpn || 'sword'] : WEAPONS.sword, ch = isFinite(c) ? clamp(c, 0, 1) : 0;
  const W = Math.round(B.W * M.spd * WP.spd * (rip ? 0.55 : 1) * (ch > 0.05 ? 0.55 : 1)), R = B.R, C = Math.round(B.C * M.spd * WP.spd);   // o golpe carregado já foi preparado segurando o botão
  p.atk = { k, t0: now, a: isFinite(a) ? a : 0, W, R, C, reach: B.reach * M.reach * WP.reach, arc: B.arc * WP.arc, rip, c: ch, wdmg: WP.dmg, wpn: p.cls === 'knight' ? (p.wpn || 'sword') : 'other' }; p.parry = null; p.ripUntil = 0; p.lastCombat = now;
  anim('p', p, 'atk_' + k, p.x + Math.cos(p.atk.a), p.y + Math.sin(p.atk.a), { ms: W + R + C, W, ang: p.atk.a, reach: p.atk.reach, arc: B.arc });
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
function pvpHit(p, q, A, now) {
  witnessCrime(p, p.x, p.y);
  if (now < (q.dodgeUntil || 0)) { near(q.x, q.y, { t: 'whiff', id: q.id }); return; }
  const toP = Math.atan2(p.y - q.y, p.x - q.x);
  if (q.parry && Math.abs(angDiff(q.parry.a, toP)) <= PARRY_ARC) {
    if (now - q.parry.t0 <= PARRY_PERFECT + A.W * 0.25) { p.stunUntil = now + 750; q.ripUntil = now + RIPOSTE_MS; q.cst = Math.min(CST_MAX, q.cst + 5); near(q.x, q.y, { t: 'clang', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, perfect: 1 }); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'hurt', ms: 750 }); sendStat(p); }
    else { q.cst -= 14; near(q.x, q.y, { t: 'clang', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }); if (q.cst <= 0) guardBreak(q, now); }
    sendStat(q); return;
  }
  const B = STRIKES[A.k], M = MELEE[p.cls] || MELEE.knight, { dmg } = roll(p, B.mult * M.dmg * (A.wdmg || 1) * (1 + 0.6 * (A.c || 0)) * (A.rip ? 1.25 : 1));
  const crit = roll(p, 1).crit;
  if (lethalHit(p, q, A, 'p')) return;
  damagePlayer(q, Math.round(dmg * (crit ? 1.6 : 1)), { x: p.x, y: p.y, name: p.name }, 0, B.zone);
  if (crit && A.k !== 'stab' && !q.downed) severPlayer(q, severPart(A.k, q.lost || 0), { x: p.x, y: p.y, name: p.name });
  if (q.atk && !q.atk.done) { q.atk = null; near(q.x, q.y, { t: 'anim', w: 'p', id: q.id, a: 'hurt' }); }
}
function resolvePlayerStrike(p, A, now) { p._melee = true; try { resolvePlayerStrike0(p, A, now); } finally { p._melee = false; } }
function resolvePlayerStrike0(p, A, now) {
  { const B0 = STRIKES[A.k]; let n = 0; for (const q of Object.values(S.players)) { if (n >= (B0.multi || 1) || !pvpOk(p, q) || !inArc(p.x, p.y, A.a, q.x, q.y, A.reach, A.arc, 0.3)) continue; pvpHit(p, q, A, now); n++; } if (n) return; }
  for (const n of Object.values(S.npcs || {})) { if (n.dead || n.onBack || n.carriedBy || !inArc(p.x, p.y, A.a, n.x, n.y, A.reach, A.arc, 0.3)) continue; const B1 = STRIKES[A.k], M1 = MELEE[p.cls] || MELEE.knight; if ((A.c || 0) >= HEAVY && B1.zone === 'head' && Math.random() < 0.85) { npcDamage(n, 9999, p); if (!n.dead) npcDamage(n, 9999, p); near(n.x, n.y, { t: 'blood', x: n.x, y: n.y, n: 14 }); continue; } npcDamage(n, roll(p, B1.mult * M1.dmg * (A.wdmg || 1) * (1 + 0.6 * (A.c || 0))).dmg, p); break; }
  const B = STRIKES[A.k], M = MELEE[p.cls] || MELEE.knight;
  const targets = Object.values(S.monsters).filter(q => Math.abs((q.z || 0) - (p.z || 0)) < 0.5 && (q.alt || 0) < 1.2 && inArc(p.x, p.y, A.a, q.x, q.y, A.reach, A.arc, MON[q.type].rad || 0.3)).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y)).slice(0, B.multi || 1);
  for (const q of targets) {
    const MM = MON_MELEE[q.type], facing = Math.abs(angDiff(Math.atan2(p.y - q.y, p.x - q.x), q.atk ? q.atk.a : Math.atan2(p.y - q.y, p.x - q.x))) < 1.2;
    if (MM && MM.blk && !q.atk && facing && now > (q.guardBreak || 0) && now >= (q.stunUntil || 0) && Math.random() < MM.blk) {   // o inimigo bloqueou
      near(q.x, q.y, { t: 'clang', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, blockBy: q.id }); p.atk.C += 220; continue;
    }
    const { dmg, crit } = roll(p, B.mult * M.dmg * (A.wdmg || 1) * (1 + 0.6 * (A.c || 0)) * (A.rip ? 1.25 : 1));
    const heavyHead = (A.c || 0) >= HEAVY && B.zone === 'head' && MON_LOOK[q.type] && !MON[q.type].big && Math.random() < 0.7;
    const sev = heavyHead ? 'head' : crit && A.k !== 'stab' && MON_LOOK[q.type] ? severPart(A.k, q.lost || 0) : null;
    if (sev) { q.lost = (q.lost || 0) | LOST[sev]; near(q.x, q.y, { t: 'sever', k: 'm', id: q.id, part: sev, x: q.x, y: q.y, ax: p.x, ay: p.y }); }
    q._hz = B.zone; hitRolled(p, q, sev === 'head' ? q.hp + 9999 : dmg, crit, 0, crit ? 1 : 0); useGain(p, MELEE_USE[p.cls], 1);
    if (!S.monsters[q.id]) continue;
    if (sev && sev.startsWith('arm')) q.flee = { from: p.id, until: now + 7000 };
    if (crit && A.k === 'over' && !sev && !MON[q.type].big) knockMon(q, p, now);
    if (q.atk && !q.atk.done && A.k !== 'stab') { q.atk = null; q.nextAtk = now + 600; }   // golpe pesado interrompe o inimigo
    if (A.k === 'over' && Math.random() < 0.18) q.stunUntil = Math.max(q.stunUntil, now + 650);
    if (A.k === 'under') q.slowUntil = Math.max(q.slowUntil, now + 2500);
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
  if (!p.atk && !p.parry && now - (p.cstT || 0) > 600) p.cst = Math.min(cstMaxOf(p), (p.cst ?? cstMaxOf(p)) + CST_REGEN * dt * survFactor(p) * (1 + useBonus(p, 'breath')));
  if (p.parry) p.cst = Math.max(0, p.cst - 2 * dt);
}

// ---------------- DRAGÃO ----------------
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function dragonDir(m) { const dx = Math.cos(m.ang), dy = Math.sin(m.ang); return dirFromVec(dx, dy, 0); }
const DRG_MS = { bite: 700, breath: 2000, tail: 900, roar: 1300, takeoff: 1100, land: 800 };
const DRG = { bite: 5.4, tail: 7.2, bMin: 3.6, bMax: 12.5, bLen: 11.5, mouth: 2.8, circR: 8, altAir: 5, altStrafe: 2.4, fly: 7, strafe: 10, altPatrol: 6.5 };
// o dragão caça qualquer um fora da cidade — inclusive o Tecelão, a não ser que esteja invisível
const dragonCan = p => p && !p.downed && !p.grabbed && !(p.dev && p.devHidden) && !inSafe(p.x, p.y) && !(p.fl > 0) && now_() >= (p.flungUntil || 0);
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
    if (!m.patrolAt) m.patrolAt = now + 360000 + Math.random() * 300000;
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
    if (!m.patrolAt || m.patrolAt < now) m.patrolAt = now + 720000 + Math.random() * 360000; return;
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
  m.pi = 0; m.patrolHit = {}; m.sleep = false; m.mode = 'patrol'; m.alt = 0; m.patrolAt = now + 720000 + Math.random() * 360000;
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
const raining = () => typeof weatherNow === 'function' && weatherNow().rain > 0.3;
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
      for (const q of Object.values(S.players)) { if (q.dev || (q.id === A.by && now - A.t0 < 250) || q.fl > 0) continue; tgts.push({ q, k: 'p', r: 0.32, H: q.downed ? 0.45 : 1.8, base: q.z >= 0.5 ? 3.5 : 0 }); }
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
  else if (k === 'p') {
    if (now < (q.dodgeUntil || 0)) { near(q.x, q.y, { t: 'whiff', id: q.id }); return; }
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
  for (const n of NPCS) S.npcs[n.id] = { id: n.id, kind: n.kind, role: n.role, bi: n.bi, home: n.home, name: n.name, route: n.route, ri: 0, x: n.x, y: n.y, z: 0, postX: n.x, postY: n.y, hp: NPC_HP[n.kind] || 90, maxHp: NPC_HP[n.kind] || 90, downed: null, dead: false };
}
const npcAlive = id => { const n = S.npcs && S.npcs[id]; return !n || (!n.dead && !n.downed); };
function npcDamage(n, dmg, p) {
  if (!n || n.dead) return; const now = now_();
  if (n.transient && n.wantedT > now) { n.hp -= dmg; sfx(n.x, n.y, '-' + dmg, '#ff8a6a'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 300 }); if (n.hp <= 0) thiefCaught(n, p); return; }
  if (p && !p.dev) { memEvent(p, n.x, n.y, n.downed ? 'murder' : 'assault', n); p._memT = now; }
  if (p) witnessCrime(p, n.x, n.y, n.downed ? 'murder' : 'assault');
  if (n.carrying) { npcDropCarried(n); n.mission = null; sys(n.name + ' largou o preso!'); }   // resgate: atacar o guarda que leva alguém
  if (n.kind === 'executioner') abortExecution('O carrasco foi atacado! A execução foi interrompida.');
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
  const d = dist(n.x, n.y, q.x, q.y); if (d > 1.3) { npcWalk(n, q.x, q.y, 2.1, dt); return true; }
  n.dir = dirFromVecS(q.x - n.x, q.y - n.y);
  if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1500; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: q.x, ty: q.y });
    setTimeout(() => { if (n.dead || n.downed || !S.players[q.id] || q.downed || dist(n.x, n.y, q.x, q.y) > 1.8) return; if (now_() < (q.dodgeUntil || 0)) { near(q.x, q.y, { t: 'whiff', id: q.id }); return; } if (q.parry) { q.cst -= 10; near(q.x, q.y, { t: 'clang', x: (n.x + q.x) / 2, y: (n.y + q.y) / 2 }); sendStat(q); return; } damagePlayer(q, rint(7, 13), { x: n.x, y: n.y, name: n.name }, 0, 'torso'); }, 480); }
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
function npcWalk(n, tx, ty, speed, dt) {
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
function guardThink(n, now, dt) {
  n.walk = false;
  if (n.lead) { leadTick(n, now, dt); return; }
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
    q.x = n.x; q.y = n.y; q.downed.until = Math.max(q.downed.until, now + 4000);
    if (n.mission === 'stage' && STAGE.x >= 0) { if (npcWalk(n, STAGE.x - 1.6, STAGE.y + 1.2, 1.7, dt)) { const v = npcDropCarried(n); if (v && !startExecution(v, n.name)) tell(v, 'Sem carrasco, a sentinela te larga no cadafalso.'); n.mission = null; } }
    else { const tx = TEMPLE_SPAWN.x, ty = TEMPLE_SPAWN.y; if (npcWalk(n, tx, ty, 1.7, dt)) { const v = npcDropCarried(n); n.mission = null; if (v && npcAlive('priest')) { revivePlayer(v, 0.35, 'Irmã Lúmina'); tell(v, 'A sentinela te trouxe até a Irmã Lúmina.'); } } }
    return;
  }
  // procurados à vista: persegue e ataca; caído, carrega
  let tgt = null, bd = 14;
  for (const q of Object.values(S.players)) { if (q.dev || q.carriedBy || q.execAt || q.condemned || q.bound || q.jailUntil > now || q.escortBy || q.surrendered || !(now < (q.wanted || 0) || n.aggro === q.id || n.arrest === q.id)) continue; const d = dist(n.x, n.y, q.x, q.y), mine = n.arrest === q.id && now < (q.wanted || 0); if ((d < bd && (d < 3 || sightClear(n.x, n.y, q.x, q.y))) || (mine && d < 40)) { bd = mine ? -1 : d; tgt = q; } }
  if (tgt) bd = dist(n.x, n.y, tgt.x, tgt.y);
  if (tgt && n.arrest !== tgt.id && !tgt.downed) { n.arrest = tgt.id; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shout', txt: ['Pare! Em nome de Sxan!', 'Alto lá! Largue a arma!', 'Renda-se!'][Math.floor(Math.random() * 3)], ms: 1 }); }
  if (!tgt && n.arrest) { const q = S.players[n.arrest]; if (!q || !(now < (q.wanted || 0)) || q.jailUntil > now) n.arrest = null; }
  if (!tgt) for (const q of Object.values(S.players)) {   // procurado caído por perto (mesmo sem linha de visão): vai buscar
    if (!q.downed || q.dev || q.carriedBy || q.execAt || q.condemned || q.jailUntil > now || q.dragBy || !(now < (q.wanted || 0))) continue;
    if (Object.values(S.npcs).some(o => o !== n && (o.lead && o.lead.id === q.id || o.goFetch === q.id))) continue;
    const d = dist(n.x, n.y, q.x, q.y); if (d < 20 && d < bd + 6) { tgt = q; bd = d; n.goFetch = q.id; }
  }
  if (tgt) {
    if (tgt.downed) { if (dist(n.x, n.y, tgt.x, tgt.y) < 1.3) { if (Object.values(S.npcs).some(o => o.lead && o.lead.id === tgt.id)) return; n.aggro = null; n.arrest = null; startLead(n, tgt, tgt.murderer ? 'stage' : 'jail', now); } else npcWalk(n, tgt.x, tgt.y, 2.3, dt); return; }
    if (bd > 1.3) { npcWalk(n, tgt.x, tgt.y, 2.3, dt); return; }
    if (now >= (n.nextAtk || 0)) {
      n.nextAtk = now + 1400; n.face = Math.atan2(tgt.y - n.y, tgt.x - n.x);
      near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: tgt.x, ty: tgt.y });
      setTimeout(() => { if (n.dead || n.downed || !S.players[tgt.id] || tgt.downed || dist(n.x, n.y, tgt.x, tgt.y) > 1.8) return; if (now_() < (tgt.dodgeUntil || 0)) { near(tgt.x, tgt.y, { t: 'whiff', id: tgt.id }); return; } if (tgt.parry) { tgt.cst -= 16; near(tgt.x, tgt.y, { t: 'clang', x: (n.x + tgt.x) / 2, y: (n.y + tgt.y) / 2 }); if (tgt.cst <= 0) guardBreak(tgt, now_()); sendStat(tgt); return; } damagePlayer(tgt, rint(16, 26), { x: n.x, y: n.y, name: n.name }, 0, 'torso'); }, 480);
    }
    return;
  }
  n.aggro = null; n.goFetch = null;
  if (n.chaseNpc) { const t = S.npcs[n.chaseNpc]; if (!t || !(t.wantedT > now)) n.chaseNpc = null; else { if (dist(n.x, n.y, t.x, t.y) < 1.3) { n.chaseNpc = null; thiefCaught(t, null); } else npcWalk(n, t.x, t.y, 2.7, dt); return; } }
  if (n.alert && now < n.alert.until) { if (npcWalk(n, n.alert.x, n.alert.y, 2.3, dt)) n.alert = null; return; } else n.alert = null;   // chamado por um morador: corre até lá
  // socorro: jogador caído (não procurado) dentro da cidade, sem ninguém cuidando
  for (const q of Object.values(S.players)) {
    if (!q.downed || q.downed.faint || q.carriedBy || q.dragBy || q.tied || q.execAt || !inSafe(q.x, q.y) || now < (q.wanted || 0)) continue;
    if (Object.values(S.npcs).some(o => o !== n && o.carrying === q.id)) continue;
    const d = dist(n.x, n.y, q.x, q.y); if (d > 16 || now - (q.downed.until - DOWNED_MS) < 4000) continue;
    if (d < 1.3) { entCarry(n, q, 'n:' + n.id); n.mission = 'temple'; tell(q, 'Uma sentinela te pegou para levar à sacerdotisa.'); } else npcWalk(n, q.x, q.y, 2.2, dt);
    return;
  }
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
  initNpcs();
  if (now - (S.visT || 0) > 1500) { S.visT = now; const night = typeof dayInfoS === 'function' ? dayInfoS().night : false, want = night ? 5 : 15, have = Object.values(S.npcs).filter(n => n.transient).length; if (have < want && Math.random() < 0.5 && Object.keys(S.players).length) visSpawn(now); for (const n of Object.values(S.npcs)) if (n.transient && (n.dead || now - n.born > 600000) && !n.dragBy) visGone(n); }
  for (const n of Object.values(S.npcs)) {
    if (n.dead) continue;
    if (n.downed) { npcCrawl(n, now, dt); if (now > n.downed.until && !n.dragBy) { n.downed = null; n.hp = Math.round(n.maxHp * 0.3); n.goHome = n.id !== 'fruit'; sys(n.name + ' se levantou, ferido.'); } continue; }
    if (n.fight && npcFightTick(n, now, dt)) continue;
    if (n.flee && npcFleeTick(n, now, dt)) continue;
    if (weaverFollow(n, now, dt)) continue;
    if (n.transient) { visitorTick(n, now, dt); continue; }
    if (n.goHome && !n.dragBy && !n.gripBy) { if (npcWalk(n, n.postX, n.postY, 1.3, dt)) { n.goHome = false; n.x = n.postX; n.y = n.postY; } continue; }
    if (n.route && !n.dragBy && !n.gripBy) { if (now >= (n.pauseT || 0)) { const wp = n.route[n.ri % n.route.length]; if (npcWalk(n, wp[0], wp[1], 0.9, dt)) { n.ri++; n.pauseT = now + 3000 + Math.random() * 5000; } } continue; }
    if (n.walkTo && !n.dragBy) { if (npcWalk(n, n.walkTo[0], n.walkTo[1], 1.1, dt)) { n.x = n.walkTo[0]; n.y = n.walkTo[1]; n.walkTo = null; } }
    if (n.gripBy && !n.downed) { const g = S.players[n.gripBy]; if (!g || !g.drag || g.drag.id !== n.id || now > n.escAt) { n.gripBy = null; n.dragBy = null; if (g && g.drag && g.drag.id === n.id) stopDrag(g, n.name + ' se soltou!'); } continue; }
    if (n.dragBy) continue;
    if (n.kind === 'guard') { guardThink(n, now, dt); continue; }
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
  const st = KITCHENS.find(k => dist(k.x, k.y, p.x, p.y) < 1.9); if (!st) { tell(p, 'Precisa estar perto de um fogão.'); return; }
  const has = () => Object.entries(rc.need).every(([k, n]) => k === 'meat' ? (p.inv.venison || 0) + (p.inv.pork || 0) >= n : (p.inv[k] || 0) >= n);
  if (!has()) { tell(p, 'Faltam ingredientes.'); return; }
  p.cookT = now + 3200; const x0 = p.x, y0 = p.y;
  near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'cook', ms: 3000, tx: st.x, ty: st.y });
  setTimeout(() => {
    if (!S.players[p.id] || p.downed || dist(p.x, p.y, x0, y0) > 0.6) { tell(p, 'Você saiu do fogão e a comida passou do ponto.'); return; }
    if (!has()) return;
    for (const [k, n] of Object.entries(rc.need)) { if (k === 'meat') { let left = n; for (const mk of ['venison', 'pork']) { const t = Math.min(left, p.inv[mk] || 0); p.inv[mk] -= t; left -= t; if (!p.inv[mk]) delete p.inv[mk]; } } else { p.inv[k] -= n; if (!p.inv[k]) delete p.inv[k]; } }
    p.inv[rc.out] = (p.inv[rc.out] || 0) + 1; useGain(p, 'cook', 2); Net.toOne(p.id, { t: 'loot', k: rc.out }); tell(p, rc.name + ' pronto!'); sendStat(p);
  }, 3000);
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
function releasePlayer(q, why) { q.murderer = false;
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
  const st = cellsState(), i = q.cell; if (i == null) return; st[i].who = null; st[i].locked = true; q.jailUntil = 0; q.cell = null;
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
    const night = typeof dayInfo === 'function' && dayInfo().night, jl = S.npcs && S.npcs.jailer, asleep = night || !jl || jl.dead || jl.downed;
    if (!asleep) { tell(p, 'O carcereiro está acordado e de olho. Volte de noite.'); return; }
    escapeCell(q, p.name); p.wanted = now + 300000; p.sentence = (p.sentence || 0) + 180000; Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); return;
  }
  if (m.t === 'give') {   // passar item pelas grades
    const q = S.players[m.to], k = String(m.k); if (!q || q === p || !(q.jailUntil > now) || dist(p.x, p.y, q.x, q.y) > 2.2 || !LOOT[k] || !(p.inv[k] > 0)) return;
    if (!q.inv[k] && Object.keys(q.inv).length >= INV_SLOTS) { tell(p, 'A mochila do preso está cheia.'); return; }
    p.inv[k]--; if (!p.inv[k]) delete p.inv[k]; q.inv[k] = (q.inv[k] || 0) + 1; tell(p, 'Você passou ' + LOOT[k].name + ' pelas grades.'); tell(q, p.name + ' te passou ' + LOOT[k].name + '.'); sendStat(p); sendStat(q);
  }
}
function crimeSentence(p, kind) { if (kind === 'murder') p.murderer = true; p.sentence = Math.min(900000, (p.sentence || 0) + (CRIME_MS[kind] || CRIME_MS.assault)); (p.crimes = p.crimes || []).push(CRIME_TXT[kind] || 'agressão'); if (p.crimes.length > 4) p.crimes.shift(); }

// execução na guilhotina: deitar na prancha, fechar a luneta, anúncio, alavanca, lâmina, cabeça no cesto
const EXEC_T = { lock: 1400, announce: 3000, pull: 28400, drop: 30000, fall: 33500 };
function startExecution(v, by) {
  if (!npcAlive('executioner') || v.execAt || STAGE.x < 0) return false;
  const now = now_(), tok = now + Math.random(), crimes = (v.crimes && v.crimes.length ? v.crimes.join(', ') : 'crimes contra Sxan');
  if (v.wanted) { v.wanted = 0; Net.toAll({ t: 'wanted', id: v.id, ms: 0 }); }
  if (v.carriedBy) v.carriedBy = null; if (v.dragBy && S.players[v.dragBy]) stopDrag(S.players[v.dragBy]);
  v.x = STAGE.x - 0.6; v.y = STAGE.y; v.z = 0; v.execAt = now + EXEC_T.drop; v.execTok = tok; v.downed = null; v.revive = null; v.hp = Math.max(1, Math.round(v.maxHp * 0.1)); v.bleedT = 0; if (v.bleed) for (const k in v.bleed) v.bleed[k] = 0; v.dragBy = 'exec'; if (!v.condemned) condemn(v, true);
  const ex = S.npcs && S.npcs.executioner; if (ex) { ex.walkTo = [STAGE.x - 0.9, STAGE.y + 1.9]; setTimeout(() => { if (v.execTok === tok && ex && !ex.dead) ex.walkTo = [STAGE.x + 0.1, STAGE.y + 1.05]; }, EXEC_T.pull - 3200); }
  for (const s of [10, 20]) setTimeout(() => { if (v.execTok !== tok) return; sys('🔔 O sino da praça toca (' + (30 - s) + ' segundos).'); near(STAGE.x, STAGE.y, { t: 'shake', s: 1 }, VIEW_RADIUS + 12); }, s * 1000);
  near(STAGE.x, STAGE.y, { t: 'exec', id: v.id, x: STAGE.x, y: STAGE.y, T: EXEC_T, name: v.name, crimes }, VIEW_RADIUS + 12); memEvent(v, STAGE.x, STAGE.y, 'executed');
  sys('🔔 O sino da praça toca: ' + by + ' entregou ' + v.name + ' ao carrasco.');
  setTimeout(() => { if (v.execTok !== tok) return; sys('Mestre Corvo: "' + v.name + ', condenado por ' + crimes + '. Que Sxan tenha piedade da sua alma."'); }, EXEC_T.announce);
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
  setTimeout(() => { if (!ok()) return; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shove', ms: 700, tx: c.spot[0], ty: c.spot[1] }); q.x = c.spot[0]; q.y = c.spot[1]; knockPlayer(q, { x: c.door[0] + ax, y: c.door[1] + ay }, now_()); tell(q, 'A sentinela te empurra para dentro da cela.'); }, 1800);
  setTimeout(() => { if (!ok()) return; q.bound = null; sendStat(q); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'cuff', ms: 900, tx: c.spot[0], ty: c.spot[1] }); }, 2900);
  setTimeout(() => { if (!ok()) return; st[i].open = 0; if (alive) near(jl.x, jl.y, { t: 'anim', w: 'n', id: 'jailer', a: 'key', ms: 1100 }); }, 3800);
  setTimeout(() => { if (!ok()) return; q.dragBy = null; n.lead = null; st[i].who = null; jailPlayer(q, q.sentence || CRIME_MS.assault, { noTp: true, cell: i }); sys(q.name + ' foi trancado na cadeia.'); if (alive) { jl.x = jl.postX; jl.y = jl.postY; } }, 4700);
}
function lawMsg(p, m) {
  if (m.t === 'lastwords') { if (!p.condemned || p.saidLast) return; const tx = String(m.text || '').replace(/[<>]/g, '').trim().slice(0, 120); if (!tx) return; p.saidLast = true; sys('Últimas palavras de ' + p.name + ': "' + tx + '"'); near(p.x, p.y, { t: 'pbubble', id: p.id, text: tx }, VIEW_RADIUS + 12); return; }
  if (m.t === 'execbail') {
    const q = S.players[m.who || p.id]; if (!q || !q.condemned) return; if (p !== q && dist(p.x, p.y, q.x, q.y) > 14) { tell(p, 'Chegue mais perto para pagar a fiança.'); return; }
    if (p.gold < 1000) { tell(p, 'A fiança da execução é 1000 de ouro. Você não tem o bastante.'); return; }
    p.gold -= 1000; sendStat(p);
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
  if (l1 > l0) { if (k === 'vigor') { const r = p.hp / Math.max(1, p.maxHp); p.maxHp = maxHpOf(p); if (!p.downed) p.hp = Math.max(1, Math.round(p.maxHp * r)); } if (l1 % 5 === 0) Net.toOne(p.id, { t: 'usel', k, l: l1 }); }
}
function treeSkill(p, b, msg) {
  const br = TREE[p.cls] && TREE[p.cls][b], nd = br && br.nodes[4]; if (!nd) return;
  if (!treeHas(p, nd.id)) { tell(p, 'Aprenda ' + nd.name + ' na árvore de talentos (K).'); return; }
  const now = now_(); p.tcd = p.tcd || {};
  if (p.downed || p.carrying || p.lifted || p.grabbed || now < (p.stunUntil || 0) || now < (p.knockUntil || 0)) return;
  if (now < (p.tcd[b] || 0)) { tell(p, nd.name + ': recarregando (' + Math.ceil((p.tcd[b] - now) / 1000) + 's).'); return; }
  if (p.mp < nd.mp) { tell(p, 'Mana insuficiente.'); return; }
  const a = isFinite(+msg.a) ? +msg.a : 0, shout = { s: nd.name + '!' };
  const sameLvl = q => Math.abs((q.z || 0) - (p.z || 0)) < 0.5 && (q.alt || 0) < 1.2;
  const pickTgt = rng => { let q = S.monsters[msg.id]; if (q && sameLvl(q) && dist(p.x, p.y, q.x, q.y) <= rng) return q; let best = null, bs = 1e9; for (const o of Object.values(S.monsters)) { if (!sameLvl(o)) continue; const d = dist(p.x, p.y, o.x, o.y); if (d > rng) continue; const da = Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), a)); if (da > 0.7) continue; const sc = d + da * 4; if (sc < bs) { bs = sc; best = o; } } return best; };
  switch (nd.id) {
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
  }
  p.mp -= nd.mp; p.tcd[b] = now + nd.cd; p.lastCombat = now; if (p.cls === 'mage') useGain(p, 'magic', 2); sendStat(p);
}
function addZone(p, k, x, y, a, ms) {
  const z = { k, x, y, a, by: p.id, until: now_() + ms, t: 0 }; (S.zones = S.zones || []).push(z);
  near(x, y, { t: 'zone', k, x, y, a, ms, z: p.z || 0 });
  if (k === 'firewall') { const l = []; for (let s = -2; s <= 2.01; s += 0.5) l.push([x - Math.sin(a) * s, y + Math.cos(a) * s, 1.1, ms]); near(x, y, { t: 'fires', l, nb: 1 }); }
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
    if (z.k === 'firewall') { z.t = now + 500; for (const q of Object.values(S.monsters)) { const ax = q.x - z.x, ay = q.y - z.y; if (Math.abs(-ax * Math.sin(z.a) + ay * Math.cos(z.a)) < 2.6 && Math.abs(ax * Math.cos(z.a) + ay * Math.sin(z.a)) < 0.9) { p._el = 'fire'; hitMonster(p, q, 0.6, 0); p._el = null; } } continue; }
    if (z.k === 'banner' || z.k === 'sanct') {
      z.t = now + 1000; const r = z.k === 'banner' ? 4.5 : 4;
      for (const q of Object.values(S.players)) { if (q.downed || dist(q.x, q.y, z.x, z.y) > r) continue; q.buffs[z.k] = now + 1500; const h = Math.round(q.maxHp * (z.k === 'sanct' ? 0.03 * (1 + treeEff(p, 'holy')) : 0.015)); if (q.hp < q.maxHp) { q.hp = Math.min(q.maxHp, q.hp + h); sendStat(q); } }
    }
  }
}

// ---------------- laço principal (10x por segundo) ----------------
function hostTick() {
  const now = now_();
  const dt = S.lastTick ? Math.min(0.25, (now - S.lastTick) / 1000) : 0.1;
  S.lastTick = now;
  const players = Object.values(S.players);
  estateTick(now); jobsTick(now); if (now - (S.bankT || 0) > 5000) { S.bankT = now; bankTick(now); }

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

  for (const m of Object.values(S.monsters)) monsterThink(m, players, now, dt);

  // regeneração fora de combate
  if (now - S.lastRegen >= 1000) {
    S.lastRegen = now;
    for (const p of players) {
      if (p.downed || now - p.lastCombat < OUT_OF_COMBAT_MS) continue;
      if (p.hp >= p.maxHp && p.mp >= p.maxMp) continue;
      let hr = Math.ceil(p.maxHp * 0.04) + 1, mr = Math.ceil(p.maxMp * 0.05) + 1;
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
  const mons = Object.values(S.monsters);
  for (const r of players) {
    const pl = [], ml = [];
    for (const p of players) {
      if (dist(p.x, p.y, r.x, r.y) > VIEW_RADIUS) continue;
      if (p.devHidden && p.id !== r.id) continue;
      let fl = (p.walking ? 1 : 0) | (p.downed ? 2 : 0) | (p.carriedBy ? 4 : 0) | (p.carrying ? 8 : 0) | (p.running && p.walking ? 256 : 0) | (p.sit ? 512 : 0) | (p.sit === 'c' ? 1024 : 0) | (p.sleep != null ? 32768 : 0) | (p.drawT ? 65536 : 0) | (p.dragBy ? 131072 : 0) | (p.dragMode === 'foot' ? 262144 : 0) | (p.drag && p.drag.mode === 'arms' ? 524288 : 0) | (p.drag && p.drag.mode === 'foot' ? 1048576 : 0) | (p.drag && p.drag.mode === 'back' ? 2097152 : 0) | (p.drag && p.drag.mode === 'grip' ? 4194304 : 0) | (p.gripBy ? 8388608 : 0) | (p.tied ? 16777216 : 0) | (p.choked ? 33554432 : 0) | (p.choking ? 67108864 : 0) | (p.escortBy || p.surrendered ? 134217728 : 0) | (p.jailUntil > now ? 536870912 : 0) | (p.bound ? 1073741824 : 0) | (p.drag && (p.drag.helper || ((dragTarget(p.drag.k, p.drag.id) || {}).dragBy2)) ? 268435456 : 0) | ((p.fl || 0) << 11) | (p.crouch ? 8192 : 0) | (p.slide ? 16384 : 0);
      for (const b in BUFF_BITS) if (buffOn(p, b)) fl |= BUFF_BITS[b];
      pl.push([p.id, Math.round(p.x * 100), Math.round(p.y * 100), Math.round(p.z * 100), p.dir | 0, fl, Math.round(p.hp / p.maxHp * 100), p.carrying || 0, p.lifted || 0, bodyBits(p), (p.lost || 0) | ((p.pro || 0) << 5), p.drag ? p.drag.k + ':' + p.drag.id : 0, (p.surrendered ? 1 : 0) | (p.bound && p.bound.kind === 'rope' ? 2 : 0) | (p.bound && p.bound.kind === 'cuffs' ? 4 : 0) | (p.dragBy && (/^(n:|m:)/.test(String(p.dragBy)) || p.dragMode === 'lead') && !p.downed ? 8 : 0) | (p.pkg ? 16 : 0) | (p.shift ? 32 : 0) | (p.wpn === 'halberd' ? 64 : 0) | ((p.uni || 0) << 7)]);
    }
    for (const m of mons) {
      if (Math.abs(m.x - r.x) > VIEW_RADIUS || Math.abs(m.y - r.y) > VIEW_RADIUS) continue;
      ml.push([m.id, MON_TYPES.indexOf(m.type), Math.round(m.x * 100), Math.round(m.y * 100), m.hp, (m.slowUntil > now ? 1 : 0) | (m.stunUntil > now ? 2 : 0) | (m.sleep ? 4 : 0) | (m.fury ? 8 : 0) | ((m.lost || 0) << 5), m.face, MON[m.type].dragon ? dragonDir(m) : -1, Math.round((m.alt || 0) * 10), m.carrying || 0]);
    }
    const ch = []; for (const id in S.chests) { const c = S.chests[id]; if (Math.abs(c.x - r.x) <= VIEW_RADIUS && Math.abs(c.y - r.y) <= VIEW_RADIUS) ch.push([c.id, Math.round(c.x * 100), Math.round(c.y * 100), c.opened.has(r.id) ? 1 : 0, c.who.has(r.id) ? 1 : 0]); }
    const co = []; for (const id in S.corpses || {}) { const c = S.corpses[id]; if (Math.abs(c.x - r.x) <= VIEW_RADIUS && Math.abs(c.y - r.y) <= VIEW_RADIUS) co.push([c.id, MON_TYPES.indexOf(c.type), Math.round(c.x * 100), Math.round(c.y * 100), c.z, c.looted ? 1 : 0, Math.round(c.ix * 10), Math.round(c.iy * 10), c.lost || 0, c.onBack || 0]); }
    const np = []; for (const n of Object.values(S.npcs || {})) { if (Math.abs(n.x - r.x) > VIEW_RADIUS + 4 || Math.abs(n.y - r.y) > VIEW_RADIUS + 4) continue; np.push([n.id, Math.round(n.x * 100), Math.round(n.y * 100), (n.downed ? 1 : 0) | (n.dead ? 2 : 0) | (n.dragBy && n.dragMode !== 'back' ? 4 : 0) | (n.dragMode === 'foot' ? 8 : 0) | (n.walk ? 32 : 0) | (n.lead && n.lead.phase === 'walk' ? 64 : 0) | (n.crawl ? 128 : 0) | (n.sleeping ? 256 : 0) | (n.job && n.job.st === 'levando' ? 512 : 0), n.onBack || 0, n.carrying || 0]); }
    Net.toOne(r.id, { t: 's', p: pl, m: ml, ch, co, np, jc: (S.cells || []).map(c => c.open ? 1 : 0) }, true);
  }
}

function startHostLoop() {
  try {
    const src = 'setInterval(() => postMessage(0), 100);';
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = hostTick;
  } catch (e) { setInterval(hostTick, 100); }
}

// ============================================================
//  MERCADO IMOBILIÁRIO E NEGÓCIOS — alugar ou comprar casas, lojas e oficinas; porta trancada, baú, acordar em casa;
//  negócios automáticos: oficinas produzem, mensageiros levam até as suas lojas, lojas vendem sozinhas e o lucro
//  fica no cofre do negócio (vá buscar). Tudo guardado neste reino (no navegador de quem hospeda).
// ============================================================
const ESTATE_KEY = 'nae-estate-v1', ESTATE_AUTH_MAX = 6, ESTATE_CHEST_SLOTS = 16, ESTATE_ABANDON_DAYS = 30, BIZ_MAX = 3, BIZ_OFFLINE_MS = 2 * ESTATE_DAY_MS;
const SALARY = { shop: 6, workshop: 8, bank: 30 }, SAFE_CAP = 500, WS_CAP = 120, SHOP_CAP = 40, THEFT = [0.06, 0.04, 0.02, 0.01];
const estOwner = p => String(p.name || '').trim().toLowerCase() + '|' + p.cls;
const estDay = () => Math.floor(Date.now() / ESTATE_DAY_MS);
const isBizProp = P => P && (P.kind === 'shop' || P.kind === 'workshop' || P.kind === 'bank') && !P.npc;
function estateLoad() {
  if (S.estate) return S.estate; S.estate = { r: {}, lost: {} };
  try { const j = typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem(ESTATE_KEY) || 'null'); if (j && j.r) { S.estate = { r: j.r, lost: j.lost || {} }; for (const pid in S.estate.r) { const P = PROPS_BY[pid]; if (!P || (P.kind !== 'house' && !isBizProp(P))) delete S.estate.r[pid]; } } } catch (e) { }
  S.estateL = estateLocks(); return S.estate;
}
function estateSave() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(ESTATE_KEY, JSON.stringify(S.estate)); } catch (e) { } }
function estateLocks() { const E = S.estate, L = {}; if (!E) return L; for (const P of PROPS) if (tenantsOf(P).length) L[P.bi] = []; for (const pid in E.r) { const P = PROPS_BY[pid]; if (P && P.kind !== 'shop') L[P.bi] = [E.r[pid].ownerName.trim().toLowerCase(), ...E.r[pid].auth]; } return L; }
function tenantsOf(P) { const E = S.estate; if (!P || !P.tenants || !P.tenants.length) return []; if (E && E.gone && E.gone[P.id]) return []; return P.tenants; }
function estatePublic() { const E = estateLoad(), st = {}; for (const pid in E.r) st[pid] = (E.r[pid].mode === 'own' ? '★' : '') + E.r[pid].ownerName; return st; }
const estTen = () => { const E = estateLoad(); return { gone: E.gone || {}, evict: E.evict || {} }; };
function recsOf(p) { const E = estateLoad(), k = estOwner(p); return Object.keys(E.r).filter(pid => E.r[pid].owner === k); }
function rentalOf(p) { return recsOf(p).find(pid => PROPS_BY[pid].kind === 'house' && !tenantsOf(PROPS_BY[pid]).length) || null; }
function bizOf(p) { return recsOf(p).filter(pid => PROPS_BY[pid].kind !== 'house' || tenantsOf(PROPS_BY[pid]).length); }
function bizSummary(r, P) { if (!r.biz) return null; const B = r.biz, st = P.kind === 'shop' ? B.stock : B.store, n = Object.values(st).reduce((a, b) => a + b, 0); return { closed: !!B.closed, n: Math.floor(n), cap: P.kind === 'shop' ? shopCap(B) : WS_CAP, rev: Math.round(B.today.rev), week: B.hist.reduce((a, d) => a + d.rev - d.cost, 0) + Math.round(B.today.rev - B.today.cost), orders: (B.orders || []).reduce((a, o) => a + o.q, 0), full: B.cofre >= safeCap(B) }; }
function recInfo(pid) { const r = S.estate.r[pid], P = PROPS_BY[pid]; return { pid, sum: bizSummary(r, P), ten: tenantsOf(P), ev: ((S.estate.evict || {})[pid] || {}).day || 0, mode: r.mode || 'rent', paid: r.paid, day: estDay(), next: (r.paid + RENT_DAYS) * ESTATE_DAY_MS - Date.now(), due: (r.mode === 'own' ? 1 : P.rent) * RENT_DAYS, box: r.box || 0, evict: r.evict || 0, auth: r.auth, dep: r.dep, chest: P.kind === 'house' ? r.chest : undefined, cofre: r.biz ? Math.floor(r.biz.cofre) : undefined }; }
function estateMine(p) { const h = rentalOf(p); return h ? recInfo(h) : null; }
function estateSend(p) { Net.toOne(p.id, { t: 'estate', st: estatePublic(), L: S.estateL || {}, ten: estTen(), mine: estateMine(p), biz: bizOf(p).map(recInfo), cour: courierJobs(estOwner(p)) }); }
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
function estateEnd(pid, why, refund = 0) {
  const E = estateLoad(), r = E.r[pid]; if (!r) return; delete E.r[pid];
  const q = ownerOnline(r), gold = refund + (r.biz ? Math.floor(r.biz.cofre) : 0);
  if (q) { q.gold += gold; const left = estGive(q, r.chest || {}); if (Object.keys(left).length) E.lost[r.owner] = Object.assign(E.lost[r.owner] || {}, left); if (why) tell(q, why); sendStat(q); }
  else { if (Object.keys(r.chest || {}).length) E.lost[r.owner] = Object.assign(E.lost[r.owner] || {}, r.chest); if (gold) E.lost[r.owner] = Object.assign(E.lost[r.owner] || {}, { _gold: ((E.lost[r.owner] || {})._gold || 0) + gold }); }
  estateChanged();
}
function estateJoin(np) {
  const E = estateLoad(), k = estOwner(np);
  if (E.lost[k]) { const L = E.lost[k], g = L._gold || 0; delete L._gold; np.gold += g; const left = estGive(np, L); if (Object.keys(left).length) E.lost[k] = left; else delete E.lost[k]; estateSave(); setTimeout(() => { if (S.players[np.id]) tell(np, 'O corretor devolveu o que era seu' + (g ? ' (' + g + ' de ouro)' : '') + '.'); }, 2500); }
  const pid = rentalOf(np); if (pid) { const s = estHomeSpot(PROPS_BY[pid]); np.x = s.x; np.y = s.y; }
  for (const b of bizOf(np)) E.r[b].seen = Date.now();
  setTimeout(() => { if (S.players[np.id]) { estateSend(np); if (pid) tell(np, 'Você acorda em casa: ' + PROPS_BY[pid].name + ' (' + PROPS_BY[pid].district + ').'); } }, 1200);
}
function nearBroker(p) { const n = S.npcs && S.npcs.broker; return !!n && !n.dead && !n.downed && dist(p.x, p.y, n.x, n.y) < 4.5; }
function nearPropDoor(p, P) { const [dx, dy] = doorTile(BUILDINGS[P.bi]); return dist(p.x, p.y, dx, dy) < 3.4 || WORLD.bld[tileAt(p.x, p.y)] === P.bi; }
function bizInit(P) {
  if (P.kind === 'shop') return { cofre: 0, stock: {}, margin: Object.fromEntries((SHOP_GOODS[P.shopType] || []).map(g => [g, 1])), up: { shelf: 0, vitrine: 0, safe: 0 }, orders: [], hist: [], today: { rev: 0, sold: 0, cost: 0 }, closed: false, frac: 0, log: [] };
  const W = WORKS[P.wk] || {}; return { cofre: 0, store: {}, recipe: W.recipes ? Object.keys(W.recipes)[0] : null, autobuy: true, sell: true, up: { tools: 0, safe: 0 }, hist: [], today: { rev: 0, sold: 0, cost: 0 }, closed: false, frac: {}, log: [] };
}
function bizLog(B, t) { B.log.unshift({ t, at: Date.now() }); if (B.log.length > 12) B.log.length = 12; }
function canAcquire(p, P, how) {
  if (P.kind === 'house' && tenantsOf(P).length) { if (how !== 'buy') return 'Essa casa tem inquilino: dá para comprar (e receber o aluguel), não para alugar.'; if (bizOf(p).length >= BIZ_MAX) return 'No máximo ' + BIZ_MAX + ' negócios/investimentos por personagem.'; return null; }
  if (P.kind === 'house') { if (rentalOf(p)) return 'Você já tem uma casa. Devolva ou venda antes.'; return null; }
  if (P.kind === 'bank') { if (how !== 'buy') return 'O banco não se aluga: só se compra.'; if (repOf(p) < (P.repMin || 70)) return 'O Conselho só vende o banco a quem tem reputação ' + (P.repMin || 70) + ' ou mais (a sua: ' + repOf(p) + ').'; if (bizOf(p).length >= BIZ_MAX) return 'Limite de negócios.'; return null; }
  if (!isBizProp(P)) return 'Esse ponto tem dono e não está à venda.';
  if (bizOf(p).length >= BIZ_MAX) return 'No máximo ' + BIZ_MAX + ' negócios por personagem por enquanto.';
  return null;
}
function estateMsg(p, m) {
  const E = estateLoad(), P = PROPS_BY[m.pid];
  switch (m.a) {
    case 'open': p.estOpen = true; estateSend(p); return;
    case 'close': p.estOpen = false; return;
    case 'rent': case 'buy': {
      if (!P) return; const mine = E.r[P.id] && E.r[P.id].owner === estOwner(p);
      if (E.r[P.id] && !(mine && m.a === 'buy' && E.r[P.id].mode !== 'own')) { tell(p, 'Esse imóvel já tem dono.'); return; }
      if (!nearBroker(p) && !nearPropDoor(p, P)) { tell(p, 'O contrato se fecha com o corretor, na Imobiliária, ou na porta do imóvel.'); return; }
      if (!mine) { const why = canAcquire(p, P, m.a); if (why) { tell(p, why); return; } }
      const cost = m.a === 'buy' ? P.buy - (mine ? E.r[P.id].dep || 0 : 0) : P.rent * (RENT_DAYS + 2);   // 1ª semana + caução de 2 dias
      if ((p.gold || 0) < cost) { tell(p, 'Você precisa de ' + cost + ' de ouro.'); return; }
      p.gold -= cost;
      if (mine) { const r = E.r[P.id]; r.mode = 'own'; r.dep = 0; r.paid = estDay(); tell(p, 'Escritura assinada: ' + P.name + ' agora é sua para sempre (imposto de 1 ouro por dia).'); }
      else { E.r[P.id] = { owner: estOwner(p), ownerName: p.name, mode: m.a === 'buy' ? 'own' : 'rent', paid: estDay(), auth: [], chest: {}, dep: m.a === 'buy' ? 0 : P.rent * 2, since: Date.now(), seen: Date.now() };
        if (P.kind !== 'house') { E.r[P.id].biz = bizInit(P); E.r[P.id].biz.cofre = SALARY[P.kind] * 3; bizLog(E.r[P.id].biz, 'O ponto vem com 3 dias de salário no cofre. Mantenha ouro aqui para pagar o funcionário.'); }
        tell(p, (m.a === 'buy' ? 'Escritura assinada! ' + P.name + ' é sua (imposto de 7 ouro por semana).' : 'Contrato assinado! ' + P.name + ' (' + P.district + '). Aluguel: ' + P.week + ' de ouro por semana, debitado sozinho.') + (P.kind !== 'house' ? ' Abra a gestão para abastecer e melhorar.' : '')); }
      sendStat(p); estateChanged(); return;
    }
    case 'leave': {   // devolver (alugado) ou vender de volta à Coroa pela metade (comprado)
      const pid = m.pid && E.r[m.pid] && E.r[m.pid].owner === estOwner(p) ? m.pid : rentalOf(p); if (!pid) return; const r = E.r[pid], PP = PROPS_BY[pid];
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
      tell(p, 'Aviso de despejo entregue em ' + PP.name + '. Os inquilinos saem em 1 dia do jogo (12 min)... e não vão gostar de você.'); estateChanged(); return;
    }
    case 'collect': { const r = E.r[m.pid]; if (!r || r.owner !== estOwner(p) || !(r.box > 0)) return; p.gold += r.box; tell(p, 'Você recebeu ' + r.box + ' de ouro de aluguel dos inquilinos.'); r.box = 0; sendStat(p); estateChanged(); return; }
    case 'put': case 'take': {
      const pid = rentalOf(p); if (!pid) { tell(p, 'Você não tem casa.'); return; }
      const PP = PROPS_BY[pid], r = E.r[pid], k = String(m.k || '');
      if (WORLD.bld[tileAt(p.x, p.y)] !== PP.bi) { tell(p, 'O baú fica dentro da sua casa.'); return; }
      if (!LOOT[k]) return;
      if (m.a === 'put') { const q = Math.min(p.inv[k] || 0, Math.max(1, m.q | 0)); if (!q) return; if (!r.chest[k] && Object.keys(r.chest).length >= ESTATE_CHEST_SLOTS) { tell(p, 'O baú está cheio.'); return; } p.inv[k] -= q; if (!p.inv[k]) delete p.inv[k]; r.chest[k] = (r.chest[k] || 0) + q; }
      else { const q = Math.min(r.chest[k] || 0, Math.max(1, m.q | 0)); if (!q) return; if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; } r.chest[k] -= q; if (!r.chest[k]) delete r.chest[k]; p.inv[k] = (p.inv[k] || 0) + q; }
      estateSave(); sendStat(p); estateSend(p); return;
    }
  }
}
// ---------- gestão de um negócio (menu) ----------
const shopCap = B => SHOP_CAP + 40 * (B.up.shelf || 0), safeCap = B => SAFE_CAP * (1 + (B.up.safe || 0)), stockSum = o => Object.values(o).reduce((a, b) => a + b, 0);
function atBiz(p, P) { if (WORLD.bld[tileAt(p.x, p.y)] === P.bi) return true; const st = S.npcs && Object.values(S.npcs).find(n => n.bi === P.bi && n.role); return !!st && dist(p.x, p.y, st.x, st.y) < 4; }
function bizSend(p) { const pid = p.bizOpen, r = pid && S.estate && S.estate.r[pid]; if (!r || r.owner !== estOwner(p) || !r.biz) { Net.toOne(p.id, { t: 'biz', pid, none: 1 }); return; } Net.toOne(p.id, { t: 'biz', pid, b: r.biz, mode: r.mode || 'rent', at: atBiz(p, PROPS_BY[pid]), info: recInfo(pid), cour: courierJobs(r.owner) }); }
function bizMsg(p, m) {
  const E = estateLoad(), pid = String(m.pid || ''), r = E.r[pid], P = PROPS_BY[pid];
  if (m.a === 'counter' || m.a === 'cbuy') { counterMsg(p, m, E, pid); return; }
  if (m.a === 'open') { p.bizOpen = pid; bizSend(p); return; }
  if (m.a === 'close') { p.bizOpen = null; return; }
  if (!r || !r.biz || r.owner !== estOwner(p)) return; const B = r.biz; r.seen = Date.now();
  switch (m.a) {
    case 'order': {   // comprar mercadoria do fornecedor (chega numa carroça em 1 hora do jogo)
      const g = String(m.g), q = clamp(m.q | 0, 1, 100); if (P.kind !== 'shop' || !(SHOP_GOODS[P.shopType] || []).includes(g)) return;
      const room = shopCap(B) - stockSum(B.stock) - B.orders.reduce((a, o) => a + o.q, 0), n = Math.min(q, room); if (n <= 0) { tell(p, 'Não cabe mais nada nas prateleiras.'); return; }
      const cost = Math.ceil(GOODS[g].p * n); if (p.gold < cost) { tell(p, 'Você precisa de ' + cost + ' de ouro.'); return; }
      p.gold -= cost; B.orders.push({ g, q: n, at: Date.now() + BIZ_HOUR_MS }); B.today.cost += cost; bizLog(B, 'Encomenda: ' + n + ' ' + GOODS[g].n + ' (' + cost + ' ouro). A carroça chega em 1 hora.'); sendStat(p); break;
    }
    case 'margin': { const g = String(m.g); if (P.kind !== 'shop' || !(g in B.margin)) return; B.margin[g] = clamp(m.v | 0, 0, 2); break; }
    case 'recipe': { const W = WORKS[P.wk]; if (!W || !W.recipes || !W.recipes[m.v]) return; B.recipe = m.v; break; }
    case 'toggle': { if (P.kind !== 'workshop' || !['autobuy', 'sell'].includes(m.k)) return; B[m.k] = !B[m.k]; break; }
    case 'up': {
      const k = String(m.k), U = BIZ_UP[k]; if (!U || (U.for !== 'both' && U.for !== P.kind)) return; const lv = B.up[k] || 0; if (lv >= 3) return;
      const cost = U.cost[lv]; if (p.gold < cost) { tell(p, 'Você precisa de ' + cost + ' de ouro.'); return; }
      p.gold -= cost; B.up[k] = lv + 1; bizLog(B, U.n + ' nível ' + (lv + 1) + ' (' + cost + ' ouro).'); sendStat(p); break;
    }
    case 'collect': {
      if (!atBiz(p, P)) { tell(p, 'O cofre só abre com você no negócio.'); return; }
      const g = Math.floor(B.cofre); if (g <= 0) return; B.cofre -= g; p.gold += g; tell(p, 'Você tirou ' + g + ' de ouro do cofre de ' + P.name + '.'); sendStat(p); break;
    }
    case 'deposit': {
      const g = clamp(m.q | 0, 1, 100000); if (p.gold < g) return; p.gold -= g; B.cofre += g; if (B.closed) { B.closed = false; bizLog(B, 'Cofre abastecido: o negócio voltou a funcionar.'); } sendStat(p); break;
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
    if (p.gold < cost) { tell(p, 'Você precisa de ' + cost + ' de ouro.'); return; }
    if (it.loot && !p.inv[it.loot] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; }
    p.gold -= cost; B.stock[g] -= q; if (!B.stock[g]) delete B.stock[g];
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
  out.push(b); const tb = BUILDINGS[B.bi], st = S.npcs && Object.values(S.npcs).find(n => n.bi === B.bi && n.role && n.role !== 'courier'); out.push(doorTile(tb)); if (st) out.push([st.postX + (st.postY > doorTile(tb)[1] ? 0 : 0), st.postY + 0.9]); return out;
}
function courierJobs(owner) { return Object.values(S.npcs || {}).filter(n => n.role === 'courier' && n.job && n.job.owner === owner).map(n => ({ name: n.name.split(',')[0], g: n.job.goods, to: PROPS_BY[n.job.to].name, st: n.job.st })); }
function bizNeeds(owner) {   // o que cada negócio do dono precisa receber
  const E = S.estate, out = [];
  for (const pid in E.r) { const r = E.r[pid]; if (r.owner !== owner || !r.biz) continue; const P = PROPS_BY[pid], B = r.biz;
    if (P.kind === 'shop') { const room = shopCap(B) - stockSum(B.stock); for (const g of SHOP_GOODS[P.shopType] || []) if (room > 0) out.push({ pid, g, room }); }
    else { const W = WORKS[P.wk]; if (W.recipes && B.recipe) for (const g in W.recipes[B.recipe]) { const room = WS_CAP - stockSum(B.store); if (room > 0) out.push({ pid, g, room: Math.min(room, 20) }); } } }
  return out.sort((x, y) => (PROPS_BY[x.pid].kind === 'workshop' ? 0 : 1) - (PROPS_BY[y.pid].kind === 'workshop' ? 0 : 1));   // oficinas que transformam primeiro
}
function ownMaker(owner, g) { for (const pid in S.estate.r) { const r = S.estate.r[pid], P = PROPS_BY[pid]; if (r.owner === owner && r.biz && P.kind === 'workshop' && WORKS[P.wk].make && WORKS[P.wk].make[g]) return true; } return false; }   // tem oficina própria que extrai isso? então espera o mensageiro
function dispatchCouriers() {
  const E = S.estate, free = Object.values(S.npcs || {}).filter(n => n.role === 'courier' && !n.job && !n.dead && !n.downed && !n.sleeping && (n.act === 'work' || n.act == null)); if (!free.length) return;
  for (const pid in E.r) {
    if (!free.length) return; const r = E.r[pid], P = PROPS_BY[pid]; if (!r.biz || P.kind !== 'workshop') continue; const B = r.biz;
    if (Object.values(S.npcs).some(n => n.job && n.job.from === pid)) continue;
    for (const need of bizNeeds(r.owner)) { if (need.pid === pid) continue; if (Object.values(S.npcs).some(n => n.job && n.job.to === need.pid)) continue; const have = Math.floor(B.store[need.g] || 0); if (have < 1) continue;
      const q = Math.min(have, need.room, 15), n = free.shift(), wp = routeBetween(P, PROPS_BY[need.pid]);
      n.job = { owner: r.owner, from: pid, to: need.pid, goods: { [need.g]: q }, wp: [[n.x, n.y], ...wp], i: 1, st: 'indo buscar', back: [] };
      break; }
  }
}
function courierTick(n, now, dt) {
  const J = n.job; if (!J) { if (dist(n.x, n.y, n.postX, n.postY) > 0.5) npcWalk(n, n.postX, n.postY, 1.4, dt); return; }
  const E = S.estate, wp = J.wp[J.i]; if (!wp) { n.job = null; return; }
  if (npcWalk(n, wp[0], wp[1], 1.7, dt) || dist(n.x, n.y, wp[0], wp[1]) < 0.6) {
    if (J.i === 1 && J.st === 'indo buscar') {   // pegou na oficina
      const r = E.r[J.from]; if (!r || !r.biz) { n.job = null; return; } for (const g in J.goods) { const q = Math.min(J.goods[g], Math.floor(r.biz.store[g] || 0)); J.goods[g] = q; r.biz.store[g] -= q; } J.st = 'levando';
    }
    J.i++;
    if (J.i >= J.wp.length) {
      if (J.st === 'levando') { const r = E.r[J.to]; if (r && r.biz) { const B = r.biz, tgt = PROPS_BY[J.to].kind === 'shop' ? B.stock : B.store; let txt = []; for (const g in J.goods) { tgt[g] = (tgt[g] || 0) + J.goods[g]; txt.push(J.goods[g] + ' ' + GOODS[g].n); } bizLog(B, n.name.split(',')[0] + ' entregou ' + txt.join(', ') + '.'); } J.st = 'voltando'; J.wp = [...J.wp.slice().reverse().slice(1), [n.postX, n.postY]]; J.i = 0; estateSave(); }
      else n.job = null;
    }
  }
}
// Jonas, o entregador do fornecedor: pega a encomenda no portão principal e leva andando até dentro da loja
function supplierTick(n, now, dt) {
  const J = n.job;
  if (!J) { const q = (S.supplyQ || []).shift(); if (!q) { if (dist(n.x, n.y, n.postX, n.postY) > 0.5) npcWalk(n, n.postX, n.postY, 1.3, dt); return; }
    const P = PROPS_BY[q.pid], b = BUILDINGS[P.bi], st = Object.values(S.npcs).find(o => o.bi === P.bi && o.role === 'clerk');
    n.job = { pid: q.pid, o: q.o, st: 'levando', i: 0, wp: [[CENTER + 0.5, CENTER + 22], [CENTER + 0.5, CENTER + 12], [CENTER - 8, CENTER + 6.5], bizDoorOut(P), doorTile(b), st ? [st.postX, st.postY + 0.9] : doorTile(b)] }; return; }
  const wp = J.wp[J.i]; if (!wp) { n.job = null; return; }
  if (npcWalk(n, wp[0], wp[1], 1.6, dt) || dist(n.x, n.y, wp[0], wp[1]) < 0.6) {
    J.i++;
    if (J.i >= J.wp.length) {
      if (J.st === 'levando') { const r = S.estate.r[J.pid]; if (r && r.biz) { const B = r.biz, o = J.o; B.stock[o.g] = (B.stock[o.g] || 0) + o.q; const k = B.orders.indexOf(o); if (k >= 0) B.orders.splice(k, 1); bizLog(B, 'Jonas, o entregador, trouxe ' + o.q + ' ' + GOODS[o.g].n + '.'); estateSave(); } J.st = 'voltando'; J.wp = J.wp.slice(0, -1).reverse().concat([[n.postX, n.postY]]); J.i = 0; }
      else n.job = null;
    }
  }
}
function courierRobbed(n) { const J = n.job; if (!J || J.st !== 'levando') return; const r = S.estate.r[J.to] || S.estate.r[J.from]; if (r && r.biz) bizLog(r.biz, 'Assalto! ' + n.name.split(',')[0] + ' foi derrubado e a carga se perdeu.'); const q = r && ownerOnline(r); if (q) tell(q, 'Seu mensageiro ' + n.name.split(',')[0] + ' foi atacado e perdeu a carga!'); n.job = null; }
// ---------- uma hora do jogo: produção, entregas, vendas; virada do dia: salários, roubos, histórico ----------
function bizHour(now) {
  const E = estateLoad(), day = estDay(), newDay = S.bizDay != null && S.bizDay !== day; S.bizDay = day;
  for (const pid in E.r) {
    const r = E.r[pid], P = PROPS_BY[pid], B = r.biz; if (!B) continue;
    const on = ownerOnline(r); if (on) r.seen = Date.now(); if (Date.now() - (r.seen || 0) > BIZ_OFFLINE_MS) continue;   // dono sumido há 2 dias: portas fechadas, nada acontece
    if (P.kind === 'bank') { /* o banco ganha com os juros dos empréstimos e as heranças; os juros dos depósitos saem daqui */ }
    else if (P.kind === 'shop') {
      for (const o of B.orders) if (Date.now() >= o.at && !o.queued) { o.queued = 1; (S.supplyQ = S.supplyQ || []).push({ pid, o }); }
      if (!B.closed) {
        B.frac += 0.4 * (1 + 0.5 * (B.up.vitrine || 0)) * (0.7 + Math.random() * 0.6) * (workerAt(P.bi) ? 1.5 : 1); let n = Math.floor(B.frac); B.frac -= n;
        while (n-- > 0) { const gs = Object.keys(B.stock).filter(g => B.stock[g] >= 1); if (!gs.length) break; if (B.cofre >= safeCap(B)) { if (!B.fullWarn) { B.fullWarn = 1; bizLog(B, 'Cofre cheio! Venha buscar o ouro: as vendas pararam.'); } break; }
          const g = gs[Math.floor(Math.random() * gs.length)], M = MARGIN[B.margin[g] ?? 1]; if (Math.random() > M.p) continue;
          const price = GOODS[g].p * M.k; B.stock[g]--; if (!B.stock[g]) delete B.stock[g]; B.cofre += price; B.today.rev += price; B.today.sold++; B.fullWarn = 0; }
      }
    } else {
      const sk = seasonNow().k, W = WORKS[P.wk], k = (workerAt(P.bi) ? 1.5 : 1) * (1 + 0.5 * (B.up.tools || 0)) * (P.wk === 'farm' ? (sk === 'winter' ? 0.4 : sk === 'summer' ? 1.25 : 1) : 1);
      if (!B.closed) {
        if (W.make) for (const g in W.make) { B.frac[g] = (B.frac[g] || 0) + W.make[g] * k; const q = Math.floor(B.frac[g]); B.frac[g] -= q; if (stockSum(B.store) + q <= WS_CAP) B.store[g] = (B.store[g] || 0) + q; }
        if (W.recipes && B.recipe) { const rec = W.recipes[B.recipe]; B.frac._b = (B.frac._b || 0) + k; let nb = Math.floor(B.frac._b); B.frac._b -= nb;
          while (nb-- > 0) { let ok = true; for (const g in rec) if ((B.store[g] || 0) < rec[g]) { const miss = rec[g] - (B.store[g] || 0), cost = Math.ceil(GOODS[g].p * 1.2 * miss); if (B.autobuy && B.cofre >= cost && !ownMaker(r.owner, g)) { B.cofre -= cost; B.today.cost += cost; B.store[g] = (B.store[g] || 0) + miss; } else ok = false; }
            if (!ok || stockSum(B.store) >= WS_CAP) break; for (const g in rec) B.store[g] -= rec[g]; B.store[B.recipe] = (B.store[B.recipe] || 0) + 1; } }
        if (B.sell) for (const g in B.store) { const keep = 50; if (B.store[g] > keep) { const ex = Math.floor(B.store[g] - keep), v = GOODS[g].p * 0.7 * ex; B.store[g] -= ex; B.cofre = Math.min(safeCap(B), B.cofre + v); B.today.rev += v; B.today.sold += ex; } }
      }
    }
    if (newDay) {
      const sal = SALARY[P.kind]; if (B.cofre >= sal) { B.cofre -= sal; B.today.cost += sal; if (B.closed) B.closed = false; } else if (!B.closed) { B.closed = true; bizLog(B, 'Sem ouro no cofre para o salário (' + sal + '): o negócio parou. Deposite no cofre.'); if (on) tell(on, P.name + ' parou: falta ouro no cofre para o salário.'); }
      if (B.cofre > 20 && Math.random() < THEFT[B.up.safe || 0]) { const lost = Math.floor(B.cofre * 0.2); B.cofre -= lost; bizLog(B, 'Ladrões levaram ' + lost + ' de ouro do cofre durante a noite!'); if (on) tell(on, 'Roubaram ' + lost + ' de ouro do cofre de ' + P.name + '!'); }
      B.hist.push({ rev: Math.round(B.today.rev), cost: Math.round(B.today.cost), sold: B.today.sold }); if (B.hist.length > 7) B.hist.shift(); B.today = { rev: 0, sold: 0, cost: 0 };
    }
  }
  dispatchCouriers(); estateSave();
  for (const q of Object.values(S.players)) if (q.bizOpen) bizSend(q);
}
// débito diário + descanso em casa (roda a cada ~2 s); uma vez por hora do jogo, os negócios
function estateTick(now) {
  if (now - (S.estT || 0) < 2000) return; const dt = S.estT ? (now - S.estT) / 1000 : 2; S.estT = now;
  const E = estateLoad(), day = estDay();
  if (Date.now() - (S.bizT || 0) >= BIZ_HOUR_MS) { S.bizT = Date.now(); bizHour(now); }
  for (const pid of Object.keys(E.r)) {
    const r = E.r[pid], P = PROPS_BY[pid], owed = Math.floor((day - r.paid) / RENT_DAYS); if (owed <= 0) continue;   // semanas vencidas
    const due = (r.mode === 'own' ? 1 : P.rent) * RENT_DAYS, q = ownerOnline(r);
    if (!q) { if (r.mode !== 'own' && day - r.paid > ESTATE_ABANDON_DAYS) estateEnd(pid, ''); continue; }
    if (r.mode === 'own' && tenantsOf(P).length && !(E.evict || {})[pid]) { r.box = (r.box || 0) + P.week * owed; tell(q, 'Os inquilinos de ' + P.name + ' pagaram ' + (P.week * owed) + ' de ouro de aluguel (receba no painel, L).'); }
    let paid = 0; while (day - r.paid >= RENT_DAYS && q.gold >= due) { q.gold -= due; r.paid += RENT_DAYS; paid++; }
    if (paid) { featAdd(q, 'rent', paid); sendStat(q); tell(q, (r.mode === 'own' ? 'Imposto' : 'Aluguel') + ' semanal de ' + P.name + ': -' + (due * paid) + ' de ouro' + (paid > 1 ? ' (' + paid + ' semanas)' : '') + '.'); estateSave(); if (q.estOpen) estateSend(q); }
    const still = Math.floor((day - r.paid) / RENT_DAYS);
    if (still >= 2 && r.mode !== 'own') estateEnd(pid, 'Sem ouro para o aluguel, você perdeu ' + P.name + '. A caução cobriu a dívida' + (r.biz ? ' e o cofre veio para a sua bolsa.' : ' e o baú voltou para a sua mochila.'));
    else if (still >= 1 && !r.warned && r.mode !== 'own') { r.warned = day; tell(q, 'Aluguel atrasado em ' + P.name + ': junte ' + due + ' de ouro antes da próxima semana ou perde o imóvel.'); }
    else if (!still) r.warned = 0;
  }
  if (E.evict) for (const pid of Object.keys(E.evict)) if (day >= E.evict[pid].day) { E.gone = E.gone || {}; E.gone[pid] = true; const ev = E.evict[pid]; delete E.evict[pid]; const P = PROPS_BY[pid]; for (const id of P.tenants || []) { const n = S.npcs && S.npcs[id]; if (n) { n.homeless = true; near(n.x, n.y, { t: 'anim', w: 'n', id, a: 'talk', txt: 'Vou dormir na taverna, então...', ms: 1 }); } } const q = Object.values(S.players).find(o => o.name === ev.owner); if (q) tell(q, 'Os inquilinos deixaram ' + P.name + '. A casa agora está vazia.'); estateChanged(); }
  for (const p of Object.values(S.players)) {
    if (p.sleep == null || !estHomeBed(p)) { p.homeSleep = 0; continue; }
    p.homeSleep = (p.homeSleep || 0) + dt;
    if (p.homeSleep >= 20 && !buffOn(p, 'rested')) { p.buffs.rested = now + 600000; tell(p, 'Você dormiu bem na sua cama: Bem descansado (10 min, recupera vida e mana mais rápido).'); sendStat(p); }
  }
}
function estHomeBed(p) { if (p.sleep == null) return false; const b = BEDS[p.sleep], pid = rentalOf(p); return !!(b && pid && PROPS_BY[pid].bi === b.bi); }

// ============================================================
//  ROTINA DOS MORADORES — dormem em casa (22h–6h), tomam café, trabalham, almoçam (taverna ou casa), trabalham,
//  à noite vão à taverna/pracinha conversar; fome, cansaço e vontade de conversar mudam a ordem. Andam pelas portas.
// ============================================================
const resHour = () => (((Date.now() % ESTATE_DAY_MS) / ESTATE_DAY_MS) * 24 + 12) % 24;   // fase 0 do dia = meio-dia
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
function resSpot(n, act) {
  const village = BUILDINGS[n.home] && BUILDINGS[n.home].x < CENTER - 52, tav = BUILDINGS.findIndex(b => b.kind === 'tavern');
  const homeBi = n.homeless && tav >= 0 ? tav : n.home, day = Math.floor(Date.now() / ESTATE_DAY_MS), h = [...n.id].reduce((a, c) => a + c.charCodeAt(0), 0) + day * 7;
  if (act === 'sleep' || act === 'home') return resHomeSpot(n, homeBi);
  if (act === 'work') return [n.postX, n.postY];
  const sq = VILLAGE_SQ();
  if (act === 'eat') return village ? resHomeSpot(n, homeBi) : (() => { const t = bldTiles(tav); return t.length ? t[h % t.length] : resHomeSpot(n, homeBi); })();
  if (act === 'social') { if (village) { const a = (h % 12) / 12 * Math.PI * 2; return [sq[0] + Math.cos(a) * 1.8, sq[1] + Math.sin(a) * 1.4]; } const t = bldTiles(tav); return t.length && h % 3 ? t[(h >> 2) % t.length] : [CENTER + (h % 5) - 2, CENTER + 12 + (h % 3)]; }
  return [n.postX, n.postY];
}
function residentTick(n, now, dt) {
  if (now - (n.meetT || 0) > 1000) { n.meetT = now; memMeet(n, now); }
  const hr = resHour(), N = n.need || (n.need = { food: 70 + Math.random() * 30, rest: 90, social: 40 + Math.random() * 40 }), perDay = 24 / (ESTATE_DAY_MS / 1000);
  N.food = Math.max(0, N.food - dt * perDay * 4); N.social = Math.max(0, N.social - dt * perDay * 3); if (!n.sleeping) N.rest = Math.max(0, N.rest - dt * perDay * 5);
  let act = hr >= 22 || hr < 6 ? 'sleep' : N.rest < 12 ? 'sleep' : N.food < 25 ? 'eat' : hr < 7 ? 'home' : hr < 12 ? 'work' : hr < 13 ? 'eat' : hr < 18 ? 'work' : N.social < 75 ? 'social' : 'home';
  if (n.role === 'courier' && act === 'work') act = 'work';
  if (act !== n.act) { n.act = act; n.sleeping = false; const [tx, ty] = resSpot(n, act); n.rpath = planRoute(n, tx, ty); n.arrived = false; }
  if (n.rpath && n.rpath.length) { const [wx, wy] = n.rpath[0]; if (npcWalk(n, wx, wy, 1.15, dt) || dist(n.x, n.y, wx, wy) < 0.45) { n.rpath.shift(); if (!n.rpath.length) { n.arrived = true; n.x = wx; n.y = wy; } } return; }
  // chegou: efeito da atividade
  if (act === 'sleep') { n.sleeping = true; N.rest = Math.min(100, N.rest + dt * perDay * 14); }
  if (act === 'eat' || act === 'home') N.food = Math.min(100, N.food + dt * perDay * 60);
  if (act === 'social') N.social = Math.min(100, N.social + dt * perDay * 18);
  // conversa: quem está junto (taverna, pracinha, almoço) troca umas palavras de vez em quando
  if ((act === 'social' || act === 'eat') && now > (n.talkT || 0)) {
    n.talkT = now + 9000 + Math.random() * 16000;
    let mate = Object.values(S.npcs).find(o => o !== n && o.role && o.arrived && (o.act === 'social' || o.act === 'eat') && !o.sleeping && dist(o.x, o.y, n.x, n.y) < 3);
    if (mate) { const own = RES_LINES[n.id] || [], pool = Math.random() < 0.55 && own.length ? own : RES_LINES.any; let txt = pool[Math.floor(Math.random() * pool.length)];
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
const MEM_DELTA = { buy: 2, gift: 8, rescue: 15, assault_me: -40, assault: -15, murder: -40, jailed: -10, executed: -10, evict: -60, thief: 12 };
const MEM_TXT = { buy: 'comprou na loja', gift: 'deu um presente', rescue: 'salvou alguém', assault_me: 'me agrediu', assault: 'agrediu alguém', murder: 'matou alguém', jailed: 'foi preso', executed: 'foi levado à guilhotina', evict: 'me despejou', thief: 'pegou um ladrão' };
S.op = S.op || {};
const memKey = p => String(p.name || '').trim().toLowerCase();
function opOf(n, p) { const o = S.op[n.id] && S.op[n.id][memKey(p)]; return o ? o.v : 0; }
function opLevel(v) { return v >= 50 ? { k: 'amigo', n: 'Amigo' } : v >= 15 ? { k: 'simpatico', n: 'Simpático' } : v > -15 ? { k: 'neutro', n: 'Neutro' } : v > -50 ? { k: 'desconfiado', n: 'Desconfiado' } : { k: 'inimigo', n: 'Inimigo' }; }
function memAdd(n, p, kind, heard, from) {
  if (!n || n.kind === 'guard' || n.kind === 'captain' || n.transient || !p || p.dev) return; const k = memKey(p);
  const T = (S.op[n.id] = S.op[n.id] || {}), o = T[k] || (T[k] = { v: 0, why: '', mag: 0, heard: false });
  if (!heard && o.lk === kind && now_() - (o.lt || 0) < 6000) return; if (!heard) { o.lk = kind; o.lt = now_(); }   // vários golpes seguidos contam como uma vez
  const d = (MEM_DELTA[kind] || 0) * (heard ? 0.5 : 1); o.v = clamp(o.v + d, -100, 100);
  if (Math.abs(d) >= o.mag * 0.6 || !o.why) { const me1 = n.name.split(',')[0], pers = { assault_me: 'atacou ', evict: 'despejou ' };
    o.why = heard ? 'ouviu de ' + from + ' que você ' + (pers[kind] ? pers[kind] + from : MEM_TXT[kind]) : pers[kind] ? 'você ' + pers[kind] + me1 : 'viu você: ' + MEM_TXT[kind]; o.mag = Math.abs(d); o.kind = kind; o.heard = !!heard; }
}
// todo mundo com nome que viu (perto e com linha de visão, ou dentro do mesmo prédio)
function memEvent(p, x, y, kind, victim) {
  if (!p || p.dev || !S.npcs) return; const bi = WORLD.bld[tileAt(x, y)];
  for (const n of Object.values(S.npcs)) { if (n.dead || n.sleeping || n === victim) continue; const d = dist(n.x, n.y, x, y); if (d > 9) continue; const nb = WORLD.bld[tileAt(n.x, n.y)]; if (!(nb === bi && bi >= 0) && !sightClear(n.x, n.y, x, y)) continue; memAdd(n, p, kind); }
  if (victim) memAdd(victim, p, kind === 'assault' ? 'assault_me' : kind);
}
// fofoca: quem conversa passa adiante a lembrança mais forte que tem (pela metade)
function memGossip(a, b) {
  const T = S.op[a.id]; if (!T) return; let best = null, bk = null; for (const k in T) if (!T[k].heard && T[k].kind && (!best || T[k].mag > best.mag)) { best = T[k]; bk = k; }
  if (!best || !best.kind) return; const Tb = (S.op[b.id] = S.op[b.id] || {}); if (Tb[bk] && Tb[bk]._from === a.id + best.kind) return;
  const fake = { name: bk }; memAdd(b, fake, best.kind, true, a.name.split(',')[0]); Tb[bk]._from = a.id + best.kind;
}
function opInfo(n, p) { const o = S.op[n.id] && S.op[n.id][memKey(p)], v = o ? o.v : 0, L = opLevel(v); return { lv: L.k, ln: L.n, why: o ? o.why : 'nunca ouviu falar de você' }; }
function opPriceMul(n, p) { const v = opOf(n, p); return v >= 50 ? 0.85 : v >= 15 ? 0.95 : v > -15 ? 1 : v > -50 ? 1.2 : 0; }
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
function gather(p, m) {
  const i = m.i | 0, o = WORLD.obj[i], x = i % MAP_W, y = Math.floor(i / MAP_W), G0 = gatherOf(o), now = now_();
  if (!G0 || p.downed || p.bound || dist(p.x, p.y, x, y) > 1.9 || now < (p.gatherT || 0)) return;
  if (!p.inv[G0.tool]) { tell(p, 'Você precisa de ' + LOOT[G0.tool].name.toLowerCase() + ' (Empório do Borin).'); return; }
  const lv = profLv((p.prof || {})[G0.prof]); if (lv < G0.min) { tell(p, 'Precisa de ' + PROFS[G0.prof] + ' nível ' + G0.min + ' para isso.'); return; }
  S.nodeT = S.nodeT || {}; if (now < (S.nodeT[i] || 0)) { tell(p, o === O.TALLGRASS || o === O.FERN ? 'Já colheram aqui. Volta a crescer daqui a pouco.' : 'Já tiraram tudo daqui por enquanto. Volte mais tarde.'); return; }
  const rare = Math.random() < G0.rp + lv * 0.012, item = rare ? G0.rare : G0.item, n = 1 + (lv >= 5 && Math.random() < 0.3 ? 1 : 0);
  if (!p.inv[item] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; }
  p.gatherT = now + 1200; p.inv[item] = (p.inv[item] || 0) + n; S.nodeT[i] = now + (o === O.TALLGRASS || o === O.FERN ? 120000 : 240000);
  if (o === O.TALLGRASS || o === O.FERN) { setObj(i, O.NONE); (S.objBack = S.objBack || []).push({ i, o, at: now + 120000 }); }
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
  if (type === 'water') return { type, title: 'Água para a taverna', giver: 'Greta', prof: 'biscateiro', pay: 10 + lv('biscateiro'), xp: 14, carry: 1, steps: [0, 1, 2].flatMap(() => [{ x: sp.well[0], y: sp.well[1], k: 'pick', t: 'Encher o balde no poço' }, { x: sp.tav[0], y: sp.tav[1], k: 'drop', t: 'Levar à porta da taverna' }]) };
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
const SHIFT_MS = BIZ_HOUR_MS * 5;   // turno: 5 horas do jogo (2,5 min)
function shiftMsg(p, m) {
  const now = now_();
  if (m.a === 'start') {
    const bi = WORLD.bld[tileAt(p.x, p.y)], b = BUILDINGS[bi]; if (bi < 0 || !b || p.shift || p.downed || p.bound) return;
    const st = Object.values(S.npcs).find(n => (n.bi === bi || WORLD.bld[tileAt(n.postX, n.postY)] === bi) && n.kind !== 'guard'); const P = PROPS.find(q => q.bi === bi);
    if (!st && !(P && S.estate && S.estate.r[P.id])) { tell(p, 'Aqui não tem trabalho.'); return; }
    const shop = ['shop', 'tavern', 'boutique', 'fruithouse'].includes(b.kind), prof = shop ? 'comerciante' : 'artesao';
    p.uni = b.kind === 'bank' ? 6 : b.kind === 'smith' ? 1 : b.kind === 'workshop' ? ({ saw: 1, carp: 1, mine: 7, farm: 7, alch: 2 })[b.wk] || 1 : b.shopType === 'apoth' ? 2 : 3;
    p.shift = { bi, t0: now, until: now + SHIFT_MS, prof, pid: P && S.estate && S.estate.r[P.id] ? P.id : null, x: p.x, y: p.y };
    tell(p, 'Você começou um turno em ' + (b.name || 'um negócio') + '. Fique por aqui até o fim (2 min e meio).'); Net.toOne(p.id, { t: 'shift', on: 1, ms: SHIFT_MS }); return;
  }
  if (m.a === 'stop') shiftEnd(p, false);
}
function shiftEnd(p, done) {
  const S0 = p.shift; if (!S0) return; p.shift = null; if (!p.job) p.uni = 0; const now = now_(), frac = Math.min(1, (now - S0.t0) / (S0.until - S0.t0)), lv = profLv((p.prof || {})[S0.prof]);
  let pay = Math.floor((8 + lv * 2) * 4 * frac); const r = S0.pid && S.estate.r[S0.pid];
  if (r && r.biz && r.owner !== estOwner(p)) { pay = Math.min(pay, Math.floor(r.biz.cofre)); r.biz.cofre -= pay; bizLog(r.biz, p.name + ' trabalhou um turno (' + pay + ' ouro do cofre).'); }
  else if (r && r.owner === estOwner(p)) pay = 0;   // trabalhar no próprio negócio: sem salário, mas produz mais
  if (done) featAdd(p, 'shifts'); p.gold += pay; if (frac > 0.2) { profGain(p, S0.prof, Math.round(10 * frac)); gainXp(p, Math.round((8 + lv) * frac)); }
  tell(p, done ? 'Turno completo: +' + pay + ' de ouro.' : 'Você saiu no meio do turno: +' + pay + ' de ouro.'); sendStat(p); Net.toOne(p.id, { t: 'shift', on: 0 });
}
function jobsTick(now) {
  for (const p of Object.values(S.players)) {
    if (p.shift) { const out = WORLD.bld[tileAt(p.x, p.y)] !== p.shift.bi; if (out || p.downed) shiftEnd(p, false); else if (now >= p.shift.until) shiftEnd(p, true); }
    if (p.job && p.downed && p.pkg) { tell(p, 'Você caiu e o pacote se perdeu. Trabalho perdido.'); p.job = null; p.pkg = false; p.uni = 0; Net.toOne(p.id, { t: 'job', job: null }); }
  }
}
// quem trabalha num negócio de jogador faz a loja vender e a oficina produzir 50% a mais naquela hora
const workerAt = bi => Object.values(S.players).some(p => p.shift && p.shift.bi === bi);

// ============================================================
//  POPULAÇÃO FLUTUANTE — donas de casa, viajantes e visitantes entram pelos portões, circulam, compram de verdade
//  nas lojas dos jogadores e vão embora; raramente aparece um marginal que pode cometer um crime casual.
// ============================================================
function dayInfoS() { const ph = (Date.now() % ESTATE_DAY_MS) / ESTATE_DAY_MS, sun = Math.cos(ph * Math.PI * 2); return { night: sun < -0.25 }; }
const VIS_NAMES = { f: ['Ana', 'Beatriz', 'Celeste', 'Dália', 'Eva', 'Flora', 'Glória', 'Helena', 'Inês', 'Joana', 'Lúcia', 'Marina', 'Nádia', 'Olga', 'Rita', 'Sara', 'Teresa', 'Vera'], m: ['Abel', 'Bento', 'Caio', 'Davi', 'Edgar', 'Fábio', 'Gil', 'Hugo', 'Ivo', 'Júlio', 'Lauro', 'Mauro', 'Nico', 'Otávio', 'Paulo', 'Rui', 'Saulo', 'Tito', 'Vasco'] };
const VIS_TYPES = { house: { n: 'dona de casa', looks: ['v_house1', 'v_house2', 'v_house3', 'v_house4'], g: 'f' }, trav: { n: 'viajante', looks: ['v_trav1', 'v_trav2', 'v_trav3', 'v_monk'], g: 'm' }, vis: { n: 'visitante', looksF: ['v_vis2', 'v_noblef', 'v_peasf', 'v_elderf'], looksM: ['v_vis1', 'v_noblem', 'v_peasm', 'v_elderm'], g: 'x' }, thug: { n: 'marginal', looks: ['v_thug1', 'v_thug2'], g: 'm' } };
const VIS_TITLE = { v_monk: 'peregrino', v_noblef: 'dama da corte', v_noblem: 'nobre de passagem', v_peasm: 'camponês', v_peasf: 'camponesa', v_elderm: 'ancião', v_elderf: 'anciã', v_trav3: 'menestrel' };
const visGates = () => { const x0 = CENTER - 32; return [[CENTER + 0.5, CENTER + 30.5], [x0 + 3, CENTER + 5.5], [CENTER + 0.5, CENTER - 30.5]]; };
const VIS_HUB = [CENTER + 0.5, CENTER + 12];
function visPublic(n) { return { id: n.id, kind: n.kind, name: n.name, x: n.x, y: n.y }; }
function visSpawn(now) {
  const night = typeof dayInfoS === 'function' ? dayInfoS().night : false, r = Math.random();
  const type = r < 0.07 ? 'thug' : r < 0.42 ? 'house' : r < 0.7 ? 'trav' : 'vis', T = VIS_TYPES[type];
  if (type === 'house' && night) return;   // compras são de dia
  const gk = Math.floor(Math.random() * 3), gate = visGates()[gk], g = T.g === 'x' ? (Math.random() < 0.5 ? 'f' : 'm') : T.g;
  const nm = VIS_NAMES[g][Math.floor(Math.random() * VIS_NAMES[g].length)], id = 'v_' + (S.visN = (S.visN || 0) + 1), pool = T.looks || (g === 'f' ? T.looksF : T.looksM), kind = pool[Math.floor(Math.random() * pool.length)];
  const n = { id, kind, name: nm + ', ' + (VIS_TITLE[kind] || T.n), transient: true, vtype: type, x: gate[0] + (Math.random() - 0.5), y: gate[1], z: 0, postX: gate[0], postY: gate[1], hp: 60, maxHp: 60, downed: null, dead: false, gate: gk, stops: visPlan(type), si: 0, wait: 0, born: now };
  S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) });
}
function visPlan(type) {
  const shops = PROPS.filter(P => P.kind === 'shop'), owned = shops.filter(P => S.estate && S.estate.r[P.id] && S.estate.r[P.id].biz && Object.keys(S.estate.r[P.id].biz.stock).length);
  const pick = a => a[Math.floor(Math.random() * a.length)], tav = BUILDINGS.findIndex(b => b.kind === 'tavern'), spot = (x, y, w) => ({ x: x + (Math.random() - 0.5) * 2, y: y + (Math.random() - 0.5) * 2, w });
  const shopStop = P => { const st = Object.values(S.npcs).find(q => q.bi === P.bi && q.role === 'clerk'); const t = bldTiles(P.bi); const c = st ? [st.postX, st.postY + 1] : t[0] || doorTile(BUILDINGS[P.bi]); return { x: c[0], y: c[1], w: 6000 + Math.random() * 6000, shop: P.id }; };
  const plaza = () => spot(CENTER + 0.5, CENTER + 13, 8000 + Math.random() * 10000), fountain = () => spot(CENTER + 18, CENTER + 1, 9000), tavern = () => { const t = bldTiles(tav); const c = t.length ? pick(t) : [CENTER, CENTER + 12]; return { x: c[0], y: c[1], w: 20000 + Math.random() * 25000 }; };
  if (type === 'house') { const L = []; const pool = owned.length ? owned.concat(owned, shops) : shops; for (let k = 0; k < 2 + Math.floor(Math.random() * 2); k++) L.push(shopStop(pick(pool))); L.splice(1, 0, plaza()); return L; }
  if (type === 'trav') return [plaza(), tavern(), Math.random() < 0.5 ? shopStop(pick(owned.length ? owned : shops)) : fountain()];
  if (type === 'vis') return [plaza(), fountain(), shopStop(pick(owned.length ? owned : shops)), plaza()];
  return [plaza(), tavern(), plaza(), spot(CENTER - 12, CENTER + 7, 15000)];   // marginal: zanza pela praça e pela taverna
}
function visBuy(n, pid) {   // comprar de verdade numa loja de jogador (o ouro vai para o cofre)
  const r = S.estate && S.estate.r[pid]; if (!r || !r.biz || r.biz.closed) return; const B = r.biz, P = PROPS_BY[pid];
  let bought = 0; for (let k = 0; k < 1 + Math.floor(Math.random() * 3); k++) { const gs = Object.keys(B.stock).filter(g => B.stock[g] >= 1); if (!gs.length || B.cofre >= safeCap(B)) break; const g = gs[Math.floor(Math.random() * gs.length)], M = MARGIN[B.margin[g] ?? 1]; if (Math.random() > M.p + 0.15) continue; const price = GOODS[g].p * M.k; B.stock[g]--; if (!B.stock[g]) delete B.stock[g]; B.cofre += price; B.today.rev += price; B.today.sold++; bought++; }
  if (bought) { bizLog(B, n.name.split(',')[0] + ' comprou ' + bought + (bought > 1 ? ' itens' : ' item') + '.'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Vou levar!', 'Obrigada!', 'Ótimo preço.', 'Isso aqui serve.'][Math.floor(Math.random() * 4)], ms: 1 }); }
  else near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Caro demais...', 'Não tem o que eu queria.', 'Hmm, outro dia.'][Math.floor(Math.random() * 3)], ms: 1 });
}
function visGone(n, why) { delete S.npcs[n.id]; Net.toAll({ t: 'vgone', id: n.id }); if (why) sys(why); }
function visitorTick(n, now, dt) {
  if (n.wantedT > now) { // fugindo para o portão mais próximo
    const g = visGates().sort((a, b) => dist(a[0], a[1], n.x, n.y) - dist(b[0], b[1], n.x, n.y))[0]; if (npcWalk(n, g[0], g[1], 2.6, dt)) visGone(n, n.name.split(',')[0] + ' fugiu da cidade com o que roubou.'); return; }
  if (n.leaving) { const g = visGates()[n.gate]; if (!n.rpath || !n.rpath.length) n.rpath = planRoute(n, g[0], g[1]); const [wx, wy] = n.rpath[0]; if (npcWalk(n, wx, wy, 1.1, dt) || dist(n.x, n.y, wx, wy) < 0.5) { n.rpath.shift(); if (!n.rpath.length) visGone(n); } return; }
  const st = n.stops[n.si]; if (!st) { n.leaving = true; n.rpath = null; return; }
  if (!n.rpath) n.rpath = (dist(n.x, n.y, VIS_HUB[0], VIS_HUB[1]) > 14 ? [VIS_HUB] : []).concat(planRoute({ x: dist(n.x, n.y, VIS_HUB[0], VIS_HUB[1]) > 14 ? VIS_HUB[0] : n.x, y: dist(n.x, n.y, VIS_HUB[0], VIS_HUB[1]) > 14 ? VIS_HUB[1] : n.y }, st.x, st.y));
  if (n.rpath.length) { const [wx, wy] = n.rpath[0]; if (npcWalk(n, wx, wy, 1.05, dt) || dist(n.x, n.y, wx, wy) < 0.5) n.rpath.shift(); if (!n.rpath.length) { n.wait = now + st.w; if (st.shop) setTimeout(() => { if (S.npcs[n.id]) visBuy(n, st.shop); }, 2500); } return; }
  if (n.vtype === 'thug') thugTick(n, now);
  if (now > n.wait) { n.si++; n.rpath = null; }
  else if (Math.random() < 0.004 && n.vtype !== 'thug') { const mate = Object.values(S.npcs).find(o => o !== n && !o.sleeping && dist(o.x, o.y, n.x, n.y) < 2.5); if (mate) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: RES_LINES.any[Math.floor(Math.random() * RES_LINES.any.length)], ms: 1 }); }
}
// crimes raros e casuais do marginal (no máximo um a cada 4 minutos na cidade toda)
function thugTick(n, now) {
  if (now < (n.crimeCk || 0)) return; n.crimeCk = now + 40000; if (now < (S.crimeT || 0) || n.wantedT) return;
  const night = typeof dayInfoS === 'function' ? dayInfoS().night : false, r = Math.random(), flee = (txt) => { n.wantedT = now + 180000; S.crimeT = now + 240000; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt, ms: 1 }); const g = Object.values(S.npcs).filter(q => q.kind === 'guard' && !q.dead && !q.downed && !q.lead).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0]; if (g) g.chaseNpc = n.id; };
  const victim = Object.values(S.players).find(p => !p.dev && !p.downed && p.gold > 20 && dist(p.x, p.y, n.x, n.y) < 2.2 && now - (p.lastMv || 0) > 4000);
  if (victim && r < 0.35) { const st = Math.min(50, Math.max(5, Math.floor(victim.gold * 0.08))); victim.gold -= st; n.loot = { id: victim.id, g: st }; sendStat(victim); tell(victim, 'Alguém mexeu na sua bolsa! ' + n.name.split(',')[0] + ' levou ' + st + ' de ouro. Pegue o ladrão!'); flee('Hehe...'); return; }
  const shop = PROPS.find(P => P.kind === 'shop' && S.estate && S.estate.r[P.id] && S.estate.r[P.id].biz && WORLD.bld[tileAt(n.x, n.y)] === P.bi);
  if (shop && r < 0.12) { const B = S.estate.r[shop.id].biz, st = Math.min(80, Math.floor(B.cofre * 0.15)); B.cofre -= st; n.loot = { owner: S.estate.r[shop.id].owner, g: st }; bizLog(B, 'Roubo! ' + n.name.split(',')[0] + ' fugiu com ' + st + ' de ouro do cofre.'); const o = ownerOnline(S.estate.r[shop.id]); if (o) tell(o, 'Roubaram ' + st + ' de ouro de ' + shop.name + '! O ladrão está fugindo.'); flee('Ninguém viu nada!'); return; }
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
function repOf(p) {
  let sum = 0, n = 0; const k = memKey(p); for (const id in S.op) { const o = S.op[id][k]; if (o) { sum += o.v; n++; } }
  const base = 50 + (n ? sum / n : 0) / 2, F = p.feats || {}, owned = typeof bizOf === 'function' ? bizOf(p).length : 0;
  const feats = (F.thief || 0) * 5 + Math.min(30, (F.jobs || 0)) + Math.min(15, (F.shifts || 0)) + owned * 3 + Math.min(10, (F.rent || 0));
  return Math.round(clamp(base + feats - ((p.crimes || []).length) * 5, 0, 100));
}
function featAdd(p, k, n = 1) { p.feats = p.feats || {}; p.feats[k] = (p.feats[k] || 0) + n; }
// ============================================================
//  BANCO DE SXAN — guardar ouro (não se perde nem é furtado), juros de 2% por semana, empréstimos (10%/semana, 2 semanas),
//  e quem morre de vez deixa o saldo para o dono do banco (ou para a Coroa). Guardado neste reino.
// ============================================================
const BANK_KEY = 'nae-bank-v1', BANK_INT = 0.02, LOAN_INT = 0.10, LOAN_WEEKS = 2;
function bankLoad() { if (S.bank) return S.bank; S.bank = { acc: {} }; try { const j = typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem(BANK_KEY) || 'null'); if (j && j.acc) S.bank = j; } catch (e) { } return S.bank; }
function bankSave() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(BANK_KEY, JSON.stringify(S.bank)); } catch (e) { } }
const bankAcc = p => { const B = bankLoad(), k = estOwner(p); return B.acc[k] || (B.acc[k] = { g: 0, loan: 0, due: 0, wk: estDay() }); };
const bankProp = () => PROPS.find(P => P.kind === 'bank');
function bankOwnerRec() { const P = bankProp(); return P && S.estate && S.estate.r[P.id]; }
const loanMax = p => 100 + repOf(p) * 4;
function bankView(p) { const A = bankAcc(p), O = bankOwnerRec(); return { t: 'bank', g: Math.floor(A.g), loan: Math.ceil(A.loan), due: A.due ? (A.due * ESTATE_DAY_MS - Date.now()) : 0, max: loanMax(p), rep: repOf(p), owner: O ? O.ownerName : 'a Coroa' }; }
function nearBanker(p) { return Object.values(S.npcs || {}).some(n => (n.kind === 'banker' || n.kind === 'banker2' || n.kind === 'banker3') && !n.dead && !n.downed && dist(n.x, n.y, p.x, p.y) < 4.5); }
function bankMsg(p, m) {
  const A = bankAcc(p), q = Math.max(0, Math.floor(+m.q || 0));
  if (m.a !== 'open' && !nearBanker(p)) { tell(p, 'Fale com um dos banqueiros, no Banco de Sxan.'); return; }
  if (m.a === 'dep') { const v = Math.min(q, p.gold); if (!v) return; p.gold -= v; A.g += v; tell(p, 'Depositado: ' + v + ' de ouro. Saldo: ' + Math.floor(A.g) + '.'); }
  else if (m.a === 'wd') { const v = Math.min(q, Math.floor(A.g)); if (!v) return; A.g -= v; p.gold += v; tell(p, 'Sacado: ' + v + ' de ouro.'); }
  else if (m.a === 'loan') { if (A.loan > 0) { tell(p, 'Você já tem um empréstimo. Pague antes de pedir outro.'); return; } const v = Math.min(q, loanMax(p)); if (!v) return; A.loan = Math.ceil(v * (1 + LOAN_INT)); A.due = estDay() + LOAN_WEEKS * RENT_DAYS; p.gold += v; tell(p, 'Empréstimo de ' + v + ' de ouro. Você deve ' + A.loan + ' (juros de 10% por semana) em até 2 semanas.'); }
  else if (m.a === 'repay') { const v = Math.min(q || A.loan, A.loan, p.gold); if (!v) return; p.gold -= v; A.loan -= v; const O = bankOwnerRec(); if (O && O.biz) O.biz.cofre += Math.round(v * 0.09); if (A.loan <= 0) { A.loan = 0; A.due = 0; tell(p, 'Dívida quitada. O banco agradece.'); } else tell(p, 'Pago: ' + v + '. Ainda deve ' + A.loan + '.'); }
  bankSave(); sendStat(p); Net.toOne(p.id, bankView(p));
}
// semanal: juros sobre o saldo e sobre a dívida; dívida vencida é cobrada do saldo, senão a guarda vai atrás
function bankTick(now) {
  const B = bankLoad(), day = estDay(), O = bankOwnerRec(); let ch = false;
  for (const k in B.acc) { const A = B.acc[k]; if (day - A.wk < RENT_DAYS) continue; const wks = Math.floor((day - A.wk) / RENT_DAYS); A.wk += wks * RENT_DAYS; ch = true;
    const pay = Math.floor(A.g * BANK_INT * wks); if (pay > 0) { if (O && O.biz) { const v = Math.min(pay, Math.floor(O.biz.cofre)); O.biz.cofre -= v; A.g += v; } else A.g += pay; }
    if (A.loan > 0) A.loan = Math.ceil(A.loan * Math.pow(1 + LOAN_INT, wks)); }
  for (const p of Object.values(S.players)) { const A = B.acc[estOwner(p)]; if (!A || !A.loan || !A.due || day < A.due) continue;
    const take = Math.min(A.loan, Math.floor(A.g)); if (take) { A.g -= take; A.loan -= take; ch = true; tell(p, 'O banco tirou ' + take + ' do seu saldo para cobrir a dívida vencida.'); }
    if (A.loan > 0 && !(now < (p.wanted || 0)) && now > (p.debtT || 0)) { p.debtT = now + 600000; p.wanted = now + 300000; crimeSentence(p, 'assault'); Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); tell(p, 'Dívida vencida com o Banco de Sxan: as sentinelas foram chamadas para te levar!'); } }
  if (ch) bankSave();
}
