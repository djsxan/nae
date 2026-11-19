// ============================================================
//  CLIENTE — roda em todo mundo (inclusive no anfitrião).
//  Movimento livre (sem tiles), interpolação suave dos outros
//  jogadores, animações, interface e tela inicial.
// ============================================================
const G = {
  myId: null, me: null, players: {}, monsters: {}, npcs: {},
  nums: [], effects: [], parts: [], lights: [], timers: [], shake: 0, throws: [], teles: [], fires: [], breaths: [], blood: [],
  target: null, hover: null, path: null, pathGoal: null, keys: new Set(), cdEnd: [0, 0, 0, 0, 0],
  started: false, view: { ox: 0, oy: 0 }, dialog: null, pendingNpc: null, reviving: null, zoomUser: false,
};
const INTERP_MS = 110;

function mkEnt(o) {
  return Object.assign({ rx: o.x || 0, ry: o.y || 0, z: 0, dir: 0, walking: false, walkDist: 0, buf: [], visible: false, flags: 0, idleT: performance.now(), idleWait: 3000 + Math.random() * 5000, idleAnim: null, anim: null }, o);
}
for (const n of NPCS) G.npcs[n.id] = mkEnt({ ...n, isNpc: true, visible: true, dir: 0 });

// 8 direções pelo ângulo na tela: 0 = baixo, 2 = direita, 4 = cima, 6 = esquerda
function dirFromVec(dx, dy, cur) {
  const sx = dx - dy, sy = (dx + dy) * 0.5;
  if (Math.abs(sx) < 0.001 && Math.abs(sy) < 0.001) return cur;
  return ((Math.round(Math.atan2(sx, sy) / (Math.PI / 4)) % 8) + 8) % 8;
}
const VIEW_DIR = { S: 0, E: 2, N: 4, W: 6 };
function anySprite(cls, skin, color, P, kind) {
  if (R3.ok) { const Q = { ...P, dir: P.dir != null ? P.dir : (VIEW_DIR[P.view] || 0) }; return kind ? npcSprite3D(kind, Q) : heroSprite3D(cls, skin, color, Q); }
  return kind ? npcSprite(kind, P) : heroSprite(cls, skin, color, P);
}
function later(ms, fn) { if (!ms || ms <= 0) fn(); else G.timers.push({ at: performance.now() + ms, fn }); }
const IDLE_SETS = {
  v_house3: ['look', 'wave', 'look'], v_house4: ['look', 'wave', 'look'], v_trav3: ['look', 'wave', 'look'], v_monk: ['look', 'wave', 'look'], v_noblef: ['look', 'wave', 'look'], v_noblem: ['look', 'wave', 'look'], v_peasm: ['look', 'wave', 'look'], v_peasf: ['look', 'wave', 'look'], v_elderm: ['look', 'wave', 'look'], v_elderf: ['look', 'wave', 'look'],
  v_house1: ['look', 'wave', 'look'], v_house2: ['look', 'look', 'wave'], v_trav1: ['stretch', 'look', 'yawn'], v_trav2: ['look', 'stretch'], v_vis1: ['look', 'wave'], v_vis2: ['look', 'wave', 'look'], v_thug1: ['look', 'look'], v_thug2: ['look', 'stretch'], supplier: ['look', 'stretch', 'yawn'],
  hotelkeeper: ['polish', 'look', 'yawn', 'look'], banker: ['look', 'polish', 'look'], banker2: ['polish', 'look'], banker3: ['look', 'polish'], banker4: ['read', 'polish', 'look'], banker5: ['polish', 'look', 'read'], banker6: ['look', 'polish', 'crossarms'], bankporter: ['handsback', 'look', 'salute'],
  st_saw: ['stretch', 'polish', 'look'], st_mine: ['stretch', 'look', 'polish'], st_farm: ['look', 'stretch', 'yawn'], st_carp: ['polish', 'look', 'polish'], st_alch: ['look', 'polish', 'look'],
  st_apoth: ['look', 'polish', 'wave'], st_arcane: ['look', 'yawn', 'polish'], st_tailor: ['polish', 'look', 'wave'], st_scroll: ['look', 'polish', 'yawn'],
  courier1: ['look', 'stretch', 'wave'], courier2: ['look', 'yawn', 'stretch'], courier3: ['stretch', 'look', 'yawn'],
  knight: ['look', 'stretch', 'polish', 'kick', 'sit', 'look'], archer: ['look', 'stretch', 'yawn', 'polish', 'sit', 'kick'], mage: ['look', 'yawn', 'polish', 'stretch', 'sit'],
  noble: ['look', 'wave', 'look'], noble2: ['look', 'salute', 'look'], gardener: ['polish', 'polish', 'look', 'stretch'], tailor: ['look', 'polish', 'look', 'salute'], agent: ['look', 'polish', 'look', 'wave'], broker: ['look', 'polish', 'look', 'wave'], jailer: ['look', 'yawn', 'look', 'polish'], fruit: ['look', 'wave', 'look', 'stretch'], executioner: ['look', 'polish', 'look', 'stretch'], priest: ['pray', 'read', 'look', 'pray'], merchant: ['look', 'wave', 'kick', 'look'], innkeeper: ['drink', 'look', 'wave', 'drink'], guard: ['salute', 'look', 'kick', 'look'], captain: ['look', 'salute', 'polish', 'look'],
};
// ---------- vida dos NPCs parados: conversa em dupla, gestos conforme o tipo e o lugar ----------
const npcHash = e => e._h ?? (e._h = [...String(e.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 7));
function npcHeld(e) {
  if (e.pkg || e.npDown || e.npDead || e.onBackBy || e.dragged) return null;
  const k = e.kind || '', h = npcHash(e), bi = WORLD.bld[tileAt(e.rx, e.ry)], B = bi >= 0 ? BUILDINGS[bi] : null;
  if (B && B.kind === 'tavern' && !e.walking && !/innkeeper|guard|captain/.test(k)) return 'mug';
  if (/^v_house/.test(k) || k === 'v_peasf') return h % 3 ? 'basket' : null;
  if (k === 'v_peasm' || /^v_trav/.test(k) || ((k === 'st_mine' || k === 'st_farm') && e.walking)) return 'sack';
  if (k === 'v_monk' || k === 'banker3' || (k === 'priest' && !e.walking)) return 'book';
  if (k === 'gardener') return 'bucket';
  return null;
}
const NPC_IDLE_POOL = {
  old: ['lookup', 'scratch', 'look', 'handsback', 'lean', 'yawn'], noble: ['handsback', 'handsback', 'look', 'crossarms', 'point'], hurry: ['look', 'stretch', 'scratch', 'shrug', 'point'],
  heavy: ['stretch', 'crossarms', 'scratch', 'look', 'kick', 'eatstand'], light: ['look', 'wave', 'lookup', 'shrug', 'eatstand', 'scratch'], calm: ['pray', 'look', 'lookup', 'read'], normal: ['look', 'scratch', 'lookup', 'crossarms', 'stretch', 'yawn', 'shrug'],
};
function npcIdlePick(e, now) {
  const g = NPC_GAIT[e.kind] || 'normal', worker = IDLE_SETS[e.kind];
  // alguém parado por perto: conversa em dupla (um fala e gesticula, o outro escuta e balança a cabeça; depois trocam)
  if (!e.npSleep && Math.random() < 0.6) for (const id in G.npcs) { const q = G.npcs[id]; if (q === e || q.walking || q.npDown || q.npDead || q.npSleep || q.idleAnim && q.idleAnim.k !== 'look') continue; const d = dist(e.rx, e.ry, q.rx, q.ry); if (d > 0.7 && d < 2.0) {
      const dur = 3500 + Math.random() * 2500, a = Math.random() < 0.85 ? 'talk' : 'laugh';
      e.idleAnim = { k: a, t0: now, dur }; q.idleAnim = { k: a === 'laugh' ? 'laugh' : 'listen', t0: now, dur }; q.idleT = now; q.idleWait = 1500 + Math.random() * 2500;
      e.dir = dirFromVec(q.rx - e.rx, q.ry - e.ry, e.dir || 0); q.dir = dirFromVec(e.rx - q.rx, e.ry - q.ry, q.dir || 0); return; } }
  let set = worker && Math.random() < 0.55 ? worker : NPC_IDLE_POOL[g];
  if (npcHeld(e)) set = set.filter(k => k !== 'crossarms' && k !== 'eatstand');
  const bi = WORLD.bld[tileAt(e.rx, e.ry)], B = bi >= 0 ? BUILDINGS[bi] : null;
  if (B && B.kind === 'tavern' && Math.random() < 0.5) set = ['drink', 'laugh', 'look', 'drink'];
  if (B && B.kind === 'temple' && Math.random() < 0.5) set = ['pray', 'look', 'pray'];
  const k = pick(set.length ? set : ['look']);
  e.idleAnim = { k, t0: now, dur: k === 'sit' ? 6000 + Math.random() * 4000 : /talk|listen|crossarms|handsback|lean|read|pray/.test(k) ? 3000 + Math.random() * 3000 : 1800 + Math.random() * 900 };
  if (Math.random() < 0.4) e.dir = pick([0, 0, 1, 3, 7]);
}
function updateIdle(e, now) {
  if (e.npDead || e.npDown) { e.idleAnim = null; return; }
  if (e.walking || (e.anim && now - e.anim.t0 < 700) || e.downed || (e.cast && e.cast.end > now)) { e.idleT = now; e.idleAnim = null; return; }
  if (e.idleAnim) { if (now - e.idleAnim.t0 > e.idleAnim.dur) { e.idleAnim = null; e.idleT = now; e.idleWait = e.isNpc ? 1200 + Math.random() * 3500 : 3500 + Math.random() * 6000; } return; }
  if (now - e.idleT > e.idleWait) {
    if (e.isNpc && e.kind !== 'guard' && e.kind !== 'fruit') { npcIdlePick(e, now); return; }
    const set = IDLE_SETS[e.isNpc ? e.kind : e.cls] || IDLE_SETS.knight;
    const k = pick(set);
    e.idleAnim = { k, t0: now, dur: k === 'sit' ? 6000 + Math.random() * 4000 : 1800 + Math.random() * 600 };
    if (e.isNpc && Math.random() < 0.5) e.dir = pick([0, 0, 1, 3]);
  }
}

// ---------------- mensagens do servidor ----------------
function setBuffs(e, list) { const now = performance.now(); e.buffs = {}; for (const [k, ms] of list || []) e.buffs[k] = now + ms; }

function clientOnServer(m) {
  const now = performance.now();
  if (typeof progEvent === 'function' && progEvent(m, now)) return;
  if (typeof bowEvent === 'function' && bowEvent(m, now)) return;
  if (typeof jailEvent === 'function' && jailEvent(m, now)) return;
  if (typeof estateEvent === 'function' && estateEvent(m)) return;
  if (typeof jobsEvent === 'function' && jobsEvent(m)) return;
  if (typeof visEvent === 'function' && visEvent(m)) return;
  if (m.t === 'blood') { for (let k = 0; k < (m.n || 8); k++) addBlood(m.x + (Math.random() - 0.5) * 1.2, m.y + (Math.random() - 0.5) * 1.2, 0, 0.2 + Math.random() * 0.35, 120000); const w = tileW(m.x, m.y, 0); sprayBlood(w.x, w.y - 18, Math.random() - 0.5, Math.random() - 0.5, m.n || 8); return; }
  if (typeof lawEvent === 'function' && lawEvent(m, now)) return;
  switch (m.t) {
    case 'welcome':
      if (G.started) { G.players = {}; G.monsters = {}; }   // reconectou (ou trocou de anfitrião): começa a lista do zero
      G.myId = m.you; setTimeout(() => Net.send({ t: 'duel', on: SET.duel ? 1 : 0 }), 500);
      for (const p of m.players) G.players[p.id] = mkEnt({ ...p });
      for (const i in m.objs || {}) WORLD.obj[+i] = m.objs[i];
      G.me = G.players[G.myId];
      Object.assign(G.me, { x: m.x, y: m.y, rx: m.x, ry: m.y, z: m.z || 0, fl: m.fl || 0, fb: m.fb ?? -1, visible: true, mp: 0, maxMp: 1, hp: 1, maxHp: 1, quests: {}, qdone: {}, pots: { hp: 0, mp: 0 }, inv: {}, gold: 0, buffs: {}, lastTile: tileAt(m.x, m.y), sendT: 0 });
      startGame();
      if (!G.prebaked) { G.prebaked = true; prebakeCity(); }
      break;
    case 'pinfo': { const e = G.players[m.p.id]; if (e) Object.assign(e, m.p); else G.players[m.p.id] = mkEnt({ ...m.p }); break; }
    case 'pleave': delete G.players[m.id]; break;
    case 's': applySnapshot(m, now); break;
    case 'pay': G.payFx = { v: m.v, own: !!m.own, t0: now }; break;
    case 'scene': G.shopScene = { k: m.k, t0: now, txt: m.txt || '' }; if (G.me) { G.me.say = m.k === 'wand' ? 'Hmm... vamos ver qual varinha escolhe você.' : 'Suba no banquinho, por favor. Vamos tirar as medidas.'; G.me.sayUntil = now + 2200; } break;
    case 'pstat': {
      const e = G.me; if (!e || m.id !== G.myId) break;
      const oldLvl = e.lvl; e.wi = m.wi || null; e.ck = m.ck || 0;
      { const sig = JSON.stringify(m.tree || {}); if (sig !== G._treeSig) { G._treeSig = sig; setTimeout(() => { if (G.started && typeof buildHotbar === 'function') buildHotbar(); }, 0); } }   // a árvore chegou (entrada/reconexão): mostra as habilidades equipadas
      if (m.slow) G.slowUntil = now + m.slow;
      if (m.knock) G.knockUntil = now + m.knock;
      G.cst = m.cst ?? CST_MAX; G.cstMax = m.cstMax || CST_MAX; if (G.stam == null || Math.abs(G.stam - G.cst) > 25 || G.cst < 1) G.stam = G.cst; /* a estamina segue o servidor (defesa e esquiva também gastam) */ e.arw = m.arw || []; e.esc = m.esc || 0; e.chk = m.chk || 0; e.bnd = m.bnd || ''; e.bndE = m.bndE || 0; e.jl = m.jl || 0; e.cell = m.cell ?? -1; if (m.tree) e.tree = m.tree; if (m.use) e.use = m.use; if (typeof onProgStat === 'function') onProgStat(); G.stunUntil = now + (m.stun || 0); G.ripUntil = now + (m.rip || 0);
      Object.assign(e, { hp: m.hp, maxHp: m.maxHp, mp: m.mp, maxMp: m.maxMp, lvl: m.lvl, xp: m.xp, gold: m.gold, pots: m.pots, food: m.food, water: m.water, cold: m.cold, infect: m.infect, sick: m.sick, hasSkin: m.hasSkin, body: m.body, bleed: m.bleed, lost: m.lost || 0, pro: m.pro || 0, inv: m.inv || {}, combat: m.combat, quests: m.quests, qdone: m.qdone });
      setBuffs(e, m.buffs); if (m.wpn) e.wpn = m.wpn; e.shea = !!m.shea; e.hroom = m.hroom ?? -1; e.shp = m.shp ?? 100; e.freeLimb = !!m.freeLimb; if (m.rep != null) e.rep = m.rep; if (m.feats) e.feats = m.feats; if (m.prof) e.prof = m.prof; if ('job' in m && typeof jobsTracker === 'function') { G.job = m.job; jobsTracker(); }
      G.cdEnd = m.cds.map(r => now + r);
      e.downed = m.downed > 0; e.downUntil = now + m.downed;
      saveChar(); updateHud(); updateQuests(); if (!$('inv').classList.contains('hidden')) updateInv();
      if (oldLvl && m.lvl > oldLvl) showBanner(`Nível ${m.lvl}`, 'Sua força cresce.');
      break;
    }
    case 'tp': if (G.me && G.climbing && G.climbing.sent) { G.me.fl = m.fl | 0; G.me.fb = m.fb ?? -1; break; } if (G.me) { G.me.sleep = null; G.me.sleepB = null; G.me.sit = null; G.floorWait = 0; G.climbing = null; G.me.lift = 0; Object.assign(G.me, { x: m.x, y: m.y, rx: m.x, ry: m.y, z: +m.z || 0, fl: m.fl | 0, fb: m.fb ?? -1 }); G.path = null; G.pathGoal = null; if (m.climb) G.climbArm = m.climb - 1; } break;
    case 'hit':
      later(m.d, () => {
        const t = performance.now();
        const e = m.k === 'm' ? G.monsters[m.id] : G.players[m.id];
        const pos = e ? tileW(e.rx, e.ry, (e.z || 0) * FLOOR_PX) : tileW(m.x, m.y);
        if (e) {
          e.hitAt = t; if (m.ax != null) e.lastHit = [m.x - m.ax, m.y - m.ay];
          if (!(m.k === 'm' && NO_BLOOD.has(e.type)) && Math.random() < 0.4) addBlood(e.rx + (Math.random() - 0.5) * 0.5, e.ry + (Math.random() - 0.5) * 0.5, e.z || 0, 0.28 + Math.random() * 0.2, 45000);
          // empurrão na direção oposta a quem bateu (em coordenadas de tela)
          const vx = (m.x - (m.ax ?? m.x)) - (m.y - (m.ay ?? m.y)), vy = ((m.x - (m.ax ?? m.x)) + (m.y - (m.ay ?? m.y))) * 0.5, vl = Math.hypot(vx, vy) || 1;
          e.knock = { t0: t, dx: vx / vl, dy: vy / vl, s: m.crit || m.hv ? 1.8 : 1 };
          if (m.k === 'm' && (m.crit || m.hv)) e.fallAt = t;
        }
        if (m.by === G.myId) G.shake = Math.max(G.shake, m.crit || m.hv ? 4 : 1.6);
        const mine = m.k === 'p' && m.id === G.myId;
        if (false) G.nums.push({ wx: pos.x, wy: pos.y, text: String(m.dmg), color: m.k === 'm' ? (m.crit ? '#f8d850' : '#ffffff') : (mine ? '#f05040' : '#f0a090'), crit: m.crit, big: m.crit, t0: t, vx: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6) });
        if (e && !(m.k === 'm' && NO_BLOOD.has(e.type)) && m.ax != null) { sprayBlood(pos.x, pos.y - 26, m.x - m.ax, m.y - m.ay, m.k === 'p' ? (m.crit ? 30 : 20) : (m.crit ? 18 : 9));
          if (m.k === 'p') { const dl = Math.hypot(m.x - m.ax, m.y - m.ay) || 1, ux = (m.x - m.ax) / dl, uy = (m.y - m.ay) / dl; for (let q = 0; q < 4; q++) { const d = 0.25 + q * 0.22 + Math.random() * 0.15; addBlood(e.rx + ux * d + (Math.random() - 0.5) * 0.25, e.ry + uy * d + (Math.random() - 0.5) * 0.25, e.z || 0, 0.07 + Math.random() * 0.1 - q * 0.012, 60000); } } }
        else for (let k = 0; k < 6; k++) spawnPart(m.k === 'p' ? 'blood' : 'spark', pos.x, pos.y - 26, { color: 'rgba(255,240,180,A)' });
        if (e && m.z && m.k === 'p' && !(e.anim && /^atk_/.test(e.anim.a) && t - e.anim.t0 < (e.anim.ms || 0))) e.anim = { a: m.z === 'head' ? 'hurt_head' : m.z === 'legs' ? 'hurt_leg' : 'hurt', t0: t, ms: 420 };
        if (mine) { G.shake = Math.max(G.shake, 2.5); flashDamage(); }
      });
      break;
    case 'fx': if (false) later(m.d, () => { const p = tileW(m.x, m.y); G.nums.push({ wx: p.x, wy: p.y - 24, text: m.text, color: m.color, small: !m.big, big: m.big, t0: performance.now(), vx: 0 }); }); break;
    case 'proj': later(m.delay || 0, () => { const e = G.players[m.id]; if (!e) return; const t = performance.now(), from = tileW(e.rx, e.ry, 20 + (e.z || 0) * FLOOR_PX); G.effects.push({ a: 'proj', kind: m.kind, from, tx: m.tx, ty: m.ty, x: m.tx, y: m.ty, t0: t, dur: Math.max(120, m.d) }); }); break;
    case 'emote': { const e = G.players[m.id]; if (e) { if (m.k === 'smoke') { e.smokeT = performance.now(); break; } e.emote = { k: m.k, t0: now }; e.anim = null; } break; }
    case 'anim': {
      const e = (m.w === 'p' ? G.players : m.w === 'n' ? G.npcs : G.monsters)[m.id];
      if (!e) break;
      if (!(m.a === 'talk' && e.anim && e.anim.a !== 'talk' && now - e.anim.t0 < (e.anim.ms || 0))) e.anim = { a: m.a, t0: now, tx: m.tx, ty: m.ty, ms: m.ms, W: m.W, ang: m.ang, reach: m.reach, arc: m.arc, tool: m.tool }; e.emote = null;   /* uma fala não interrompe a animação em andamento */
      if (m.tool && m.i) { const ti = m.i, tl = m.tool; if (m.w === 'p') e.dir = dirFromVec((ti % MAP_W) - e.rx, Math.floor(ti / MAP_W) - e.ry, e.dir); later(tl === 'sickle' ? 380 : 330, () => gatherFx(ti, tl)); }
      if (m.w === 'n') { if (m.a === 'adore' && m.ms > 3000) { e.bubble = { t: '✦', until: now + m.ms }; e.reactT = now + m.ms; if (m.tx != null) e.dir = dirFromVec(m.tx - e.rx, m.ty - e.ry, e.dir); } else if (m.a === 'look' && e.bubble && e.bubble.t === '✦') e.bubble = null; if (m.a === 'shout') { e.bubble = { t: m.txt || 'Guardas!', until: now + 2500 }; e.anim = null; } if (m.a === 'talk') { e.bubble = { t: m.txt || '...', until: now + 2600 + (m.txt || '').length * 60 }; if (!(e.anim && e.anim.a !== 'talk' && now - e.anim.t0 < (e.anim.ms || 0))) e.anim = null; } if (m.a === 'mercy') { e.bubble = { t: m.txt || 'Misericórdia!', until: now + 3000 }; e.anim = null; } }
      if (m.a === 'execute' && m.id === G.myId) later(380, () => { G.shake = Math.max(G.shake, 6); });
      if (m.tx != null && m.w === 'p' && m.a !== 'spin') e.dir = dirFromVec(m.tx - e.rx, m.ty - e.ry, e.dir);

      if (m.proj) {
        const rel = m.a === 'shoot' ? 230 : 130;
        for (let k = 0; k < (m.n || 1); k++) {
          const from = tileW(e.rx, e.ry, 34 + (e.z || 0) * FLOOR_PX);
          G.effects.push({ a: 'proj', kind: m.proj, from, tx: m.tx, ty: m.ty, x: m.tx, y: m.ty, t0: now + rel + k * 160, dur: Math.max(120, m.d - rel) });
        }
      }
      break;
    }
    case 'hp': Net.send({ t: 'hpr', t0: m.t0 }); break;   /* ping do anfitrião */
    case 'clk': if (!Net.isHost) simSet(m.g, m.rate, m.paused); break;   /* relógio do jogo vindo do anfitrião */
    case 'obs': if (typeof obsData === 'function') obsData(m); break;
    case 'obsh': if (typeof obsHist === 'function') obsHist(m); break;
    case 'tonelinv': G.tonelInv = { from: m.from, name: m.name, bet: m.bet, until: performance.now() + 60000 }; showToast('🍺 ' + m.name + ' te desafiou para o Tonel (aposta ' + m.bet + '). Fale com o Brom para aceitar.'); break;
    case 'aoe':
      if (m.a === 'boom' && m.big) { G.effects.push({ a: 'bigboom', x: m.x, y: m.y, t0: now, dur: 1100, seed: Math.floor(Math.random() * 1000) }); break; }   // explosão da Bola de Fogo
      G.effects.push({ a: m.a, x: m.x, y: m.y, x2: m.x2, y2: m.y2, k: m.k, id: m.id, t0: now + (m.d || 0), dur: { wind: 520, bloom: 1300, spring: 1400, whirl: 520, warcry: 800, wall: 600, agile: 600, potion: 500, pierce: 500, rain: 900, boom: 500, nova: 700, heal: 1000, lvlup: 1600, meteor: 1600 }[m.a] || 600, seed: Math.floor(Math.random() * 1000) });

      break;
    case 'cast': { const e = G.players[m.id]; if (e) { e.cast = { start: now, end: now + m.ms, el: m.el }; } break; }
    case 'castend': { const e = G.players[m.id]; if (e) e.cast = null; break; }
    case 'mdie': { const e = G.monsters[m.id]; if (e && e.arrows && G.corpseArrows) G.corpseArrows[m.id] = { arrows: e.arrows, dir: e.dir || 0 }; if (e) { e.dieAt = now + (m.d || 0); later(m.d || 0, () => beginMonsterFall(e)); } if (G.target === m.id) setTarget(null); break; }
    case 'chat': {
      addChat(m.name, m.text);
      const e = m.id && G.players[m.id];
      if (e) { e.say = m.text; e.sayUntil = now + 6000 + Math.min(4000, m.text.length * 60); }
      break;
    }
    case 'err': showToast(m.text); break;
    case 'info': showToast(m.text); addChat('', m.text); break;
    case 'offer': {   // oferta por um negócio: o dono aceita/recusa/contrapropõe; quem ofereceu responde à contraproposta
      if (m.mine) gameAsk(m.from + ' oferece ' + m.v + ' de ouro por ' + m.name + '. Aceitar? (mude o valor para fazer uma contraproposta)', { input: String(m.v), type: 'number', yes: 'Responder', no: 'Recusar' }).then(v => { if (v == null) Net.send({ t: 'estate', a: 'offerans', pid: m.pid, ans: 'no' }); else if (+v > m.v) Net.send({ t: 'estate', a: 'offerans', pid: m.pid, ans: 'counter', v: Math.floor(+v) }); else Net.send({ t: 'estate', a: 'offerans', pid: m.pid, ans: 'yes' }); });
      else gameAsk(m.owner + ' pede ' + m.counter + ' de ouro por ' + m.name + ' (você ofereceu ' + m.v + '). Aceitar?', { yes: 'Aceitar', no: 'Recusar' }).then(ok => Net.send({ t: 'estate', a: 'offerans', pid: m.pid, ans: ok ? 'yes' : 'no' }));
      break; }
    case 'wv': gmWvEvent(m); break;
    case 'coins': coinEvent(m, now); break;
    case 'pmap': G.pmap = m.l; break;
    case 'trade': tradeShow(m); break;
    case 'hotel': G.hotel = m; if (G.dialog && G.dialog.id === 'hotelkeeper') setDialogText(m.room >= 0 ? 'Sua cabine é a ' + (m.room + 1) + ', por mais ' + m.until + ' dia(s). O baú fica ao lado do catre.' : 'Você não tem cabine. Vagas agora: ' + m.free + ' de 6.'); if ($('hchest') && !$('hchest').classList.contains('hidden')) hotelChestShow(); break;
    case 'wt': WT.ph = m.ph ?? null; WT.rain = m.rain ?? null; break;
    case 'denied': if (m.why === 'ver') { if (verNum(m.ver) > verNum(VERSION)) { netMsg('O reino está numa versão mais nova. Atualizando o jogo…'); saveUpdPos(); setTimeout(() => location.replace(location.pathname + '?v=' + Date.now()), 1200); } else { netMsg('O anfitrião está numa versão antiga do jogo. Esperando ele atualizar…'); Net.reset(); setTimeout(worldTry, 8000); } break; } askRoomPw(m.why === 'pwbad'); break;
    case 'wsp': { const W = G.wsp || (G.wsp = {}), A = W[m.id] || (W[m.id] = []); A[m.i] = m.d; if (A.filter(x => x != null).length === m.n) { delete W[m.id]; for (const k in W) if (+k < m.id) delete W[k]; try { clientOnServer(JSON.parse(A.join(''))); } catch (e) { console.warn('cópia do mundo', e); } } break; }   /* cópia do mundo em pedaços */
    case 'wsnap': if (!Net.isHost) { try { const wp = worldPre(m.wid || 'legacy'); RLM.name = m.wname; worldTouch(m.wid || 'legacy', m.wname || 'Nae', m.host || '', null); localStorage.setItem(wp + 'nae-world-estate-v1', JSON.stringify(m.est || {})); localStorage.setItem(wp + 'nae-world-bank-v1', JSON.stringify(m.bank || {})); } catch (e) { } WN.succ = m.succ || []; } break;   // guarda a cópia do mundo
    case 'roompw': G.roomLocked = m.on; pzRoomRefresh(); break;
    case 'npc': if (G.dialog && G.dialog.id === m.n) { setDialogText(m.text); if (m.n === 'captain') later(50, () => G.dialog && buildDialogOptions('captain')); } break;
    case 'down': { const e = G.players[m.id]; if (e) { e.downed = true; e.downUntil = now + DOWNED_MS; } if (m.id === G.myId) { setTarget(null); G.path = null; } break; }
    case 'up': { const e = G.players[m.id]; if (e) { e.downed = false; e.revive = null; } if (m.id === G.myId) showBanner('De pé outra vez', ''); break; }
    case 'rv': { const e = G.players[m.id]; if (e) e.revive = m.by ? { by: m.by, t0: now } : null; break; }
    case 'carry': { const c = G.players[m.by]; if (c) c.carrying = m.id || null; break; }
    case 'respawned': showBanner('Capela da Aurora', 'Você despertou nas ruínas e perdeu metade da experiência do nível.', true); break;
    case 'chestopen': showBanner('Baú do chefe', '+' + m.gold + ' de ouro, 2 poções e ' + m.items.filter(k => LOOT[k]).map(k => LOOT[k].name).join(', ')); break;
    case 'dev': G.devAnswered = true; if (m.off) { G.dev = false; G.noclip = false; G.devTools = false; if (G.me) G.me.skin = m.skin || G.me.skin; const dp = $('devpanel'); if (dp) dp.classList.add('hidden'); showBanner('De volta ao herói', 'O Tecelão adormece'); break; } if (m.ok && m.mode === 'normal') { G.devTools = true; showBanner('Modo criador', 'Vocação normal · F2 abre o painel'); buildDevPanel(); $('devpanel').classList.add('hidden'); /* vocação normal: painel fechado até apertar F2 */ } else if (m.ok) { G.dev = true; G.noclip = true; G.me.skin = 'weaver'; showBanner('O Tecelão desperta', 'F2 abre o painel do criador'); buildDevPanel(); } else showToast('Senha do criador incorreta.'); break;
    case 'shake': G.shake = Math.max(G.shake, m.s || 6); break;
    case 'tele': G.teles.push({ ...m, t0: now }); break;
    case 'fireout': if (G.fires) G.fires = G.fires.filter(f => !m.l.some(([x, y]) => Math.abs(f.x - x) < 0.6 && Math.abs(f.y - y) < 0.6)); break;
    case 'fires': for (const [x, y, r, ms] of m.l) { const t = Math.round(y) * MAP_W + Math.round(x); G.fires.push({ x, y, r, z: m.z != null ? m.z : (WORLD.ground[t] === T.CLIFF && WORLD.fl1[t] > 0 ? 1 : 0), t0: now + (m.ms || 0), until: now + ms }); } if (!m.nb) G.breaths.push({ t0: now, ms: 650 }); break;

    case 'wanted': { const e = G.players[m.id]; if (e) e.wantedUntil = m.ms ? now + m.ms : 0; break; }
    case 'jet': { const e = G.monsters[m.id]; if (e) e.jet = { ...m, t0: now }; break; }
    case 'grab': { const e = G.players[m.id]; if (e) e.grab = { mid: m.mid, until: now + m.ms + 400 }; break; }
    case 'burn': { const e = G.players[m.id]; if (e) e.burnUntil = m.ms ? now + m.ms : 0; break; }
    case 'fling': {
      const e = G.players[m.id]; if (!e) break;
      e.grab = null; e.fling = { t0: now, ms: m.ms, fx: m.fx, fy: m.fy, fz: m.fz, tx: m.tx, ty: m.ty, tz: m.tz, spin: Math.random() < 0.5 ? -1 : 1 };
      if (m.id === G.myId) { G.path = null; G.pathGoal = null; G.climbing = null; G.shake = Math.max(G.shake, 8); flashDamage(); }
      break;
    }
    case 'obj': WORLD.obj[m.i] = m.o; break;
    case 'throwfx': G.throws.push({ ...m, t0: now }); break;
    case 'wound': showToast(BODY_NAMES[m.part] + ': ' + PART_STATE_NAMES[m.st] + (m.st >= 2 ? ' — está sangrando' : '')); flashDamage(); break;
    case 'banding': G.banding = performance.now() + m.ms; break;
    case 'sever': {
      const e = m.k === 'm' ? G.monsters[m.id] : G.players[m.id]; if (!e) break;
      e.lost = (e.lost || 0) | LOST[m.part]; spawnGib(e, m.k, m.part, m.x - m.ax, m.y - m.ay);
      const w = tileW(e.rx, e.ry, 30 + (e.z || 0) * FLOOR_PX); sprayBlood(w.x, w.y, m.x - m.ax, m.y - m.ay, 30); addBlood(e.rx, e.ry, e.z || 0, 0.7, 300000);
      if (dist(e.rx, e.ry, G.me.x, G.me.y) < 8) G.shake = Math.max(G.shake, 6);
      if (m.k === 'p' && m.id === G.myId) { G.me.lost = e.lost; flashDamage(); showBanner(m.part === 'head' ? 'Decapitado' : 'Você perdeu ' + LOST_NAMES[m.part], m.part === 'head' ? '' : 'Estanque o sangue com B. Prótese no ferreiro, ritual na catedral.', true); }
      break;
    }
    case 'knock': {
      const e = m.k === 'm' ? G.monsters[m.id] : G.players[m.id]; if (!e) break;
      e.knockUntil = now + m.ms; e.lastHit = [e.rx - m.ax, e.ry - m.ay]; const key = 'k' + m.k + m.id; delete FALLS[key];
      startFall({ key, type: e.type, hero: m.k === 'p' ? { cls: e.cls, skin: e.skin, color: e.color } : null, cls: e.cls || 'knight', x: e.rx, y: e.ry, dir: e.dir || 0, ix: e.lastHit[0], iy: e.lastHit[1], force: 0.85, lost: e.lost || 0, pro: e.pro || 0, stand: e._spr });
      if (m.k === 'p' && m.id === G.myId) { G.knockUntil = now + m.ms; G.shake = Math.max(G.shake, 7); }
      break;
    }
    case 'push': G.push = { t0: now, v: [Math.cos(m.a), Math.sin(m.a)], d: m.d }; G.shake = Math.max(G.shake, 4); break;
    case 'clang': { const w = tileW(m.x, m.y, 26); for (let k = 0; k < (m.perfect ? 26 : 12); k++) spawnPart('spark', w.x, w.y, { color: m.perfect ? 'rgba(255,230,120,A)' : 'rgba(255,240,200,A)' }); G.shake = Math.max(G.shake, m.perfect ? 5 : 2.5); if (m.blockBy) { const q = G.monsters[m.blockBy]; if (q) q.blockAt = now; } break; }
    case 'whiff': case 'swoosh': break;
    case 'miss': { const e = G.monsters[m.id]; if (e) { const w = tileW(e.rx, e.ry, 30); for (let k = 0; k < 5; k++) spawnPart('dust', w.x, w.y); } break; }
    case 'dead': {
      G.dead = true; $('downed-ui').classList.add('hidden'); $('hud').classList.add('hidden'); try { const all = loadChars(); delete all[charKey(G.me.name, G.me.cls)]; localStorage.setItem(SAVE_KEY, JSON.stringify(all)); } catch (e) { }
      const d = document.createElement('div'); d.id = 'deathscreen'; d.innerHTML = '<div class="ds-box"><div class="ds-title">Você morreu</div><div class="ds-sub">' + m.name + ', nível ' + m.lvl + ' — ' + m.reason + '</div><div class="ds-note">Em Nae a morte é para sempre. Seu personagem se foi.</div><button class="btn gold" onclick="G.leaving = true; location.reload()">Começar de novo</button></div>';
      document.body.appendChild(d); break;
    }
    case 'lootgold': showToast('+ ' + m.g + ' de ouro'); break;
    case 'gstop': G.gath = null; break;
    case 'tfx': { const now = performance.now(); G.tfx = G.tfx || []; if (m.k === 'sale') { if (m.s) G.tfx.push({ id: m.s, k: 'coin', plus: 1, t0: now }); if (m.b) G.tfx.push({ id: m.b, k: 'coin', t0: now + 120 }); } else if (m.k === 'ok') G.tfx.push({ id: m.id, k: 'ok', t0: now }); break; }
    case 'tfall': case 'crumble': fallStart(m); break;
    case 'loot': { const it = LOOT[m.k]; if (it) { showToast('+ ' + it.name); G.newLoot = m.k; } break; }
    case 'qprog': { const q = QUESTS.find(x => x.id === m.id); if (q) showToast(`${q.name}: ${m.n}/${q.count}`); break; }
    case 'qdone': { const q = QUESTS.find(x => x.id === m.id); if (q) showBanner('Contrato cumprido', `${q.name} — +${q.xp} xp, +${q.gold} ouro`); break; }
  }
}

function applySnapshot(m, now) {
  G.chests = (m.ch || []).map(c => ({ id: c[0], x: c[1] / 100, y: c[2] / 100, open: !!c[3], mine: !!c[4] }));
  G.corpses = (m.co || []).map(c => ({ id: c[0], type: MON_TYPES[c[1]], x: c[2] / 100, y: c[3] / 100, z: c[4], looted: !!c[5], ix: c[6] / 10, iy: c[7] / 10, lost: c[8] || 0, onBack: c[9] || null }));
  const seenP = new Set();
  for (let [id, x100, y100, z, dir, fl, hpPct, carrying, lifted, bb, lp, tow, stb, flx] of m.p) {
    seenP.add(id);
    let e = G.players[id];
    if (!e) e = G.players[id] = mkEnt({ id, name: '...', cls: 'knight', skin: 'iron', color: '#888888', lvl: 1 });
    const x = x100 / 100, y = y100 / 100;
    e.flags = fl; e.visible = true; e.carrying = carrying || null; e.lifted = lifted || 0; if (id !== G.myId) { e.lost = (lp || 0) & 31; e.pro = ((lp || 0) >> 5) & 31; } e.parrying = !!((bb || 0) & 32); e.stunned = !!((bb || 0) & 64); e.duel = !!((bb || 0) & 128); e.limp = (bb || 0) & 3; e.armWeak = !!((bb || 0) & 4); e.dizzy = !!((bb || 0) & 8); e.bleeding = !!((bb || 0) & 16); e.carriedBy = !!(fl & 4); z = z / 100;
    e.stb = stb || 0; e.sheaS = !!(e.stb & 2048); e.tow = tow || null; e.tied = !!(fl & 16777216); e.dragged = !!(fl & 131072); e.prone = !!(fl & 262144); e.gripped = !!(fl & 8388608);
    e.dragMode = fl & 524288 ? 'arms' : fl & 1048576 ? 'foot' : fl & 2097152 ? 'back' : fl & 4194304 ? 'grip' : null;
    if (e === G.me && e.dragged) { e.cx = x; e.cy = y; if (e.rx == null || Math.hypot(x - e.rx, y - e.ry) > 4) { e.x = e.rx = x; e.y = e.ry = y; } G.path = null; }
    e.bound = !!(fl & 1073741824); e.jailed = !!(fl & 536870912); e.choked = !!(fl & 33554432); e.choking = !!(fl & 67108864); e.escorted = !!(fl & 134217728); e.pullHelp = !!(fl & 268435456);   // sendo puxado/agarrado: a posição vem do servidor
    const wasDown = e.downed; e.downed = !!(fl & 2);
    if (e.downed && !wasDown && !e.downUntil) e.downUntil = now + DOWNED_MS;
    if (id === G.myId) {
      if (e.carriedBy) { e.cx = x; e.cy = y; e.z = z; if (e.rx == null || Math.hypot(x - e.rx, y - e.ry) > 4) { e.x = e.rx = x; e.y = e.ry = y; } }
      continue;
    }
    e.hp = hpPct; e.maxHp = 100; e.z = z;
    e.srvDir = dir; e.srvWalk = !!(fl & 1); if (e !== G.me) { e.running = !!(fl & 256); e.fl = flx != null ? flx : ((fl >> 11) & 3) - 1; e.crouch = !!(fl & 8192); e.slide = !!(fl & 16384); e.sit = fl & 512 ? { chair: fl & 1024 ? 1 : 0 } : null; e.sleepB = fl & 32768 ? 1 : null; e.bowDrawT = fl & 65536 ? (e.bowDrawT || performance.now()) : 0; }
    e.buf.push({ t: now, x, y });
    if (e.buf.length > 6) e.buf.shift();
  }
  for (const id in G.players) if (!seenP.has(id) && id !== G.myId) G.players[id].visible = false;
  const seenM = new Set();
  if (typeof applyNpcRows === 'function') applyNpcRows(m.np, now);
  if (m.jc) G.cellOpen = m.jc;
  for (const [id, ti, x100, y100, hp, flags, face, dg, alt, carrying] of m.m) {
    seenM.add(id);
    const x = x100 / 100, y = y100 / 100;
    let e = G.monsters[id];
    if (!e) { const type = MON_TYPES[ti]; e = G.monsters[id] = mkEnt({ id, type, x, y, rx: x, ry: y, maxHp: MON[type].hp, visible: true }); }
    e.hp = hp; e.flags = flags; e.face = face; e.lost = (flags >> 5) & 31; if (dg != null && dg >= 0) e.dg = dg; e.altT = (alt || 0) / 10; e.carrying = carrying || null;
    { const t = Math.round(y) * MAP_W + Math.round(x); e.z = WORLD.ground[t] === T.CLIFF && WORLD.fl1[t] > 0 ? 1 : 0; }
    e.buf.push({ t: now, x, y });
    if (e.buf.length > 6) e.buf.shift();
  }
  for (const id in G.monsters) if (!seenM.has(+id) && !G.monsters[id].dieAt) delete G.monsters[id];
  if (G.target && (!G.monsters[G.target] || G.monsters[G.target].dieAt)) setTarget(null);
}

// posição suavizada (renderiza um pouco "no passado" e interpola)
function interp(e, now) {
  const b = e.buf;
  if (!b.length) return;
  const t = now - INTERP_MS;
  let x, y;
  if (t <= b[0].t) { x = b[0].x; y = b[0].y; }
  else if (t >= b[b.length - 1].t) { x = b[b.length - 1].x; y = b[b.length - 1].y; }
  else for (let k = 0; k < b.length - 1; k++) if (t >= b[k].t && t <= b[k + 1].t) { const u = (t - b[k].t) / (b[k + 1].t - b[k].t || 1); x = b[k].x + (b[k + 1].x - b[k].x) * u; y = b[k].y + (b[k + 1].y - b[k].y) * u; break; }
  const dx = x - e.rx, dy = y - e.ry, d = Math.hypot(dx, dy);
  if (d > 4) { e.rx = x; e.ry = y; return; }
  e.rx = x; e.ry = y;
  e.walkDist += d;
  e.speedEst = (e.speedEst || 0) * 0.8 + d * 60 * 0.2;
  e.walking = e.speedEst > 0.4;
  if (d > 0.004 && !e.bathing) e.dir = dirFromVec(dx, dy, e.dir); else if (e.srvDir != null && e !== G.me) e.dir = e.srvDir;   /* parado (ou no ofurô): a direção que o servidor manda */
}

// ---------------- movimento local ----------------
function monsterNear(x, y, r = 0.5) {
  for (const id in G.monsters) { const m = G.monsters[id]; if (!m.dieAt && dist(m.rx, m.ry, x, y) < r) return true; }
  return false;
}
function freeAt(x, y, z) { if (G.dev && G.noclip) return true; if (HOTEL_DOORS.size && G.me && !G.dev) { const q = HOTEL_DOORS.get(Math.round(y) * MAP_W + Math.round(x)); if (q != null && G.me.hroom !== q) return false; } if (typeof estLockedFor === 'function' && G.me && estLockedFor(G.me.x, G.me.y, x, y)) return false; if (typeof jailBlock === 'function' && JAILCELLS.length && jailBlock(x, y)) return false; const me = G.me; if (me && (me.fl || 0) !== 0) return canStandFloor(x, y, me.fb, me.fl, 0.22) && !(typeof aptBlocked === 'function' && G.est && aptBlocked(me.name, me.fb, me.fl, me.x, me.y, x, y, G.est.L)); return canStandZ(x, y, z, 0.22) && (z >= 0.5 || G.slide || !monsterNear(x, y)); }

function myInput() {
  const k = G.keys;
  let sx = 0, sy = 0;
  if (k.has('w') || k.has('arrowup')) sy -= 1;
  if (k.has('s') || k.has('arrowdown')) sy += 1;
  if (k.has('a') || k.has('arrowleft')) sx -= 1;
  if (k.has('d') || k.has('arrowright')) sx += 1;
  if (G.joy) { sx = G.joy[0]; sy = G.joy[1]; }
  if (!sx && !sy) return null;
  // direção na tela -> direção no mapa isométrico
  let dx = sx * 0.5 + sy, dy = -sx * 0.5 + sy;
  const L = Math.hypot(dx, dy); return [dx / L, dy / L];
}

function updateLocal(now, dt) {
  const me = G.me;
  if (me && (me.carriedBy || me.dragged) && me.cx != null) { const k = Math.min(1, dt * 9); me.rx += (me.cx - me.rx) * k; me.ry += (me.cy - me.ry) * k; me.x = me.rx; me.y = me.ry; G.towWalk = 0; if (me.escorted || me.gripped || me.bound || (me.stb & 8)) { const dd = Math.hypot(me.cx - me.rx, me.cy - me.ry); G.towSpd = (G.towSpd || 0) * 0.85 + dd * 0.15; G.towWalk = G.towSpd > 0.006 ? 1 : 0; me.walking = !!G.towWalk; if (me.walking) me.walkDist = (me.walkDist || 0) + dd * k; } } else G.towWalk = 0;
  if (!me || me.carriedBy) { if (me) { me.walking = false; } return; }
  if (now < (G.busyUntil || 0)) { me.walking = false; G.path = null; if (G.busyFace) me.dir = dirFromVec(G.busyFace.x - me.x, G.busyFace.y - me.y, me.dir); return; }   // cozinhando: parado de frente para o fogão
  if (G.climbing) { stepClimb(now); return; }
  if (me.grab && now < me.grab.until) { const d = G.monsters[me.grab.mid]; if (d) { me.x = me.rx = d.rx; me.y = me.ry = d.ry; } me.walking = false; G.path = null; return; }
  if (me.fling) { stepFling(me, now); return; }
  if (now < (G.floorWait || 0)) { me.walking = false; return; }
  if (document.activeElement && document.activeElement.tagName === 'INPUT') G.keys.clear();
  let v = myInput();
  if (me.sleep) { if (v || G.path) getUp(); else { v = null; } }
  if (me.sit) { if (v || G.path) standUp(); else { v = null; } }
  if (v) { G.path = null; G.pathGoal = null; G.pendingNpc = null; G.pendingSeat = null; }
  else if (G.path && G.path.length) {
    // segue o caminho, pulando pontos quando há linha livre
    while (G.path.length > 1 && lineFree(me.x, me.y, G.path[1][0], G.path[1][1], me.z)) G.path.shift();
    const [tx, ty] = G.path[0], dx = tx - me.x, dy = ty - me.y, d = Math.hypot(dx, dy);
    if (d < 0.12) { G.path.shift(); if (!G.path.length) { G.path = null; G.pathGoal = null; } }
    else v = [dx / d, dy / d];
  }
  if (me.cast && me.cast.end > now) v = null;
  if (G.pendingBed != null && !G.path) { const b = BEDS[G.pendingBed]; if (dist(me.x, me.y, b.x, b.y) <= 2) lieDown(G.pendingBed); G.pendingBed = null; }
  if (G.pendingSeat != null && !G.path) { const st = WORLD.seats[G.pendingSeat]; if (dist(me.x, me.y, st.x, st.y) <= 1.7) sitDown(G.pendingSeat); G.pendingSeat = null; }
  if (G.pendingNpc && !G.path) { const n = G.npcs[G.pendingNpc]; if (dist(me.x, me.y, n.x, n.y) <= 3) openDialog(n.id); G.pendingNpc = null; }
  // correr com SHIFT gasta estamina; ao esgotar, precisa recuperar um pouco antes de correr de novo
  if (G.stam == null) { G.stam = stamMax(); G.stamT = 0; G.tired = false; }
  const kneel = healthState(me) === 3;
  const crouchKey = !kneel && (G.keys.has('control') || G.crouchToggle) && !me.downed && !me.carrying && !me.sit && (me.z || 0) < 0.5;
  if (!(G.keys.has('control') && G.keys.has('shift'))) G.slideLatch = false;
  if (!G.slide && !kneel && v && G.keys.has('control') && G.keys.has('shift') && !G.slideLatch && !G.tired && G.stam >= SLIDE_COST && !me.downed && !me.carrying && (me.z || 0) < 0.5 && !((me.fl || 0) !== 0)) {
    G.slide = { t0: now, v: v.slice() }; G.slideLatch = true; G.stam -= SLIDE_COST; G.stamT = now;
  }
  if (G.slide && now - G.slide.t0 > SLIDE_MS) G.slide = null;
  if (G.slide) v = G.slide.v;
  me.slide = !!G.slide; me.crouch = crouchKey && !G.slide;
  if (now < (G.stunUntil || 0) || now < (G.knockUntil || 0)) v = null;   // atordoado / guarda quebrada / derrubado
  if (G.dodge) { const kd = (now - G.dodge.t0) / (G.dodge.ms || DODGE.ms); if (kd >= 1 && !(G.dodge.dist && (G.dodge.k || 0) < 1)) G.dodge = null; else v = G.dodge.v; }   /* o Passo do Vento termina o trajeto mesmo com poucos quadros */
  if (G.push) { const kp = (now - G.push.t0) / 260; if (kp >= 1) G.push = null; else v = G.push.v; }
  const running = !!v && !kneel && !((me.lost || 0) & 24) && !(me.body && Math.max(PART_STATE(me.body.legL), PART_STATE(me.body.legR)) >= 3) && G.keys.has('shift') && !crouchKey && !G.tired && !me.downed && !me.carrying && G.stam > 0;
  if (running) { G.stam = Math.max(0, G.stam - STAM_DRAIN * dt); G.stamT = now; if (G.stam <= 0) G.tired = true; }
  else if (now - G.stamT > STAM_DELAY) G.stam = Math.min(stamMax(), G.stam + STAM_REGEN * dt * (v ? 0.6 : me.sit ? 2.5 : 1) * ((me.food ?? 100) < 30 ? 0.6 : 1) * ((me.water ?? 100) < 30 ? 0.7 : 1) * ((me.cold || 0) > 50 ? 0.6 : 1));
  revealFog(me.x, me.y);
  if (G.tired && G.stam >= stamMax() * 0.3) G.tired = false;
  me.running = running;
  let moved = 0;
  if (v) {
    let sp = PLAYER_SPEED * (typeof speedMul === 'function' ? speedMul() : 1);
    if (me.buffs && me.buffs.agile > now) sp *= 1.6;
    if (running) sp *= RUN_MUL * (healthState(me) === 1 ? 0.75 : 1);   // cansado corre pesado e mais devagar
    if (me.crouch) sp *= CROUCH_MUL;
    if (kneel) sp *= KNEEL_MUL;
    if (me.body) {
      const lf = k => ((me.lost || 0) & LOST[k]) ? (((me.pro || 0) & LOST[k]) ? 0.72 : 0.28) : LEG_SPEED[PART_STATE(me.body[k])], a1 = lf('legL'), a2 = lf('legR');
      sp *= Math.min(a1, a2) * (a1 < 0.7 && a2 < 0.7 ? 0.55 : 1);
    }
    if (now < (G.slowUntil || 0)) sp *= 0.5;   // rugido do dragão
    if (me.anim && /^atk_/.test(me.anim.a) && now - me.anim.t0 < (me.anim.ms || 900)) sp *= 0.45;
    if (G.parrying) sp *= 0.55;
    if (G.dodge) sp = (G.dodge.dist || DODGE.dist) / ((G.dodge.ms || DODGE.ms) / 1000);
    if (G.push) sp = G.push.d / 0.26;
    if (G.dev) sp = PLAYER_SPEED * (G.keys.has('shift') ? 10 : 4);   // Tecelão: voo livre ultrarrápido
    if (G.slide) { const k = (now - G.slide.t0) / SLIDE_MS; sp = PLAYER_SPEED * RUN_MUL * 1.5 * (1 - k * 0.65); if (Math.random() < 0.5) { const w = tileW(me.x, me.y, 0); spawnPart('dust', w.x, w.y); } }
    if (me.carrying || me.lifted) sp *= 0.75;
    if (me.downed) sp *= 0.22;
    if (WORLD.ground[tileAt(me.x, me.y)] === T.SHALLOW) sp *= 0.65;
    if (stairH(me.x, me.y) >= 0) sp *= 0.8;
    if (me.buffs && me.buffs.tipsy > now && !G.dev) { const a = Math.sin(now / 420) * 0.55 + Math.sin(now / 170) * 0.15, c = Math.cos(a), s = Math.sin(a); v = [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; sp *= 0.85; }   /* tonto: anda em zigue-zague */
    const ox = me.x, oy = me.y;
    if (G.dodge && G.dodge.dist) {   /* Passo do Vento: anda pelo tempo real, em passinhos (não atravessa parede) */
      const k1 = Math.min(1, (now - G.dodge.t0) / G.dodge.ms); let left = Math.max(0, G.dodge.dist * (k1 - (G.dodge.k || 0))); G.dodge.k = k1;
      while (left > 0.0001) { const st = Math.min(0.2, left); left -= st; const nx = me.x + v[0] * st, ny = me.y + v[1] * st; if (freeAt(nx, ny, me.z)) { me.x = nx; me.y = ny; } else if (freeAt(nx, me.y, me.z)) me.x = nx; else if (freeAt(me.x, ny, me.z)) me.y = ny; else { G.dodge.k = 1; break; } }
    } else {
    const step = sp * dt, nx = me.x + v[0] * step, ny = me.y + v[1] * step;
    if (freeAt(nx, ny, me.z)) { me.x = nx; me.y = ny; }
    else if (freeAt(nx, me.y, me.z)) me.x = nx;
    else if (freeAt(me.x, ny, me.z)) me.y = ny; }
    moved = Math.hypot(me.x - ox, me.y - oy);
    if (!combatFacing()) me.dir = dirFromVec(v[0], v[1], me.dir);
    if (!moved && G.path) { G.path = null; G.pathGoal = null; }
  }
  me.walking = moved > 0.0005 || !!G.towWalk;
  me.walkDist += moved;
  if (me.walking && Math.random() < 0.08) { const w = tileW(me.x, me.y, me.z * FLOOR_PX); spawnPart('dust', w.x, w.y); }
  // escadas dentro dos prédios: pisar no degrau de baixo sobe andando; pisar no topo (andar de cima) desce
  if ((me.z || 0) < 0.5 && now >= (G.climbT || 0) && !me.downed && !me.carrying) {
    const fl = me.fl || 0, bi = fl !== 0 ? me.fb : bldAt(me.x, me.y), b = BUILDINGS[bi];
    if (b && b.kind !== 'stairtower') {
      const nF = floorsOf(b);
      if (fl < nF - 1) { const s = stairWorld(b, fl); if (s.kind !== 'ext' && s.kind !== 'lift' && Math.hypot(me.x - s.L[0], me.y - s.L[1]) < 0.42) { const [pts, md] = climbPts(s, true, me); startClimb(now, bi, fl, fl + 1, pts, s.arrive, false, md); } }
      if (!G.climbing && fl > minFl(b)) { const s = stairWorld(b, fl - 1); if (s.kind !== 'lift' && Math.hypot(me.x - s.trig[0], me.y - s.trig[1]) < 0.42) { const [pts, md] = climbPts(s, false, me); startClimb(now, bi, fl, fl - 1, pts, s.entry, true, md); } }
    }
    // escada externa: pisa no primeiro degrau, do lado de fora do prédio
    if (!G.climbing && fl === 0) for (const [ebi, s] of extStairs()) if (Math.hypot(me.x - s.L[0], me.y - s.L[1]) < 0.42) { const [pts, md] = climbPts(s, true, me); startClimb(now, ebi, 0, 1, pts, s.arrive, false, md); break; }
  }
  // torres-escada: pisar na escada sobe para a muralha; pisar no alçapão lá em cima desce
  for (let bi = 0; bi < BUILDINGS.length; bi++) {
    const b = BUILDINGS[bi]; if (b.kind !== 'stairtower') continue;
    const cx = b.x + 1, cy = b.y + 1, d = Math.hypot(me.x - cx, me.y - cy);
    if (d > 0.9) { if (G.climbArm === bi) G.climbArm = null; continue; }
    if (G.climbArm === bi || d > 0.42 || now < (G.climbT || 0)) continue;
    const up = (me.z || 0) < 0.5;
    if (up && bldAt(me.x, me.y) !== bi) continue;
    G.climbT = now + 900; G.climbArm = bi; G.path = null; G.pathGoal = null;
    fadeFlash(); Net.send({ t: 'climb', b: bi, up: up ? 1 : 0 });
    break;
  }
  // rampas: a altura acompanha a posição (sem teletransporte)
  me.z = heightAt(me.x, me.y, me.z);
  // na rampa, centraliza suavemente no degrau
  { const t = tileAt(me.x, me.y), d = WORLD.stair[t]; if (d && moved) { const k = Math.min(1, dt * 10); if (d <= 2) me.y += (Math.round(me.y) - me.y) * k; else me.x += (Math.round(me.x) - me.x) * k; } }
  me.rx = me.x; me.ry = me.y;
  if (me.walking && me.emote) me.emote = null;
  if (me.cls !== 'knight' && now - (G.autoT || 0) > 250 && !me.downed && !me.carrying && (me.z || 0) < 0.5 && !inSafe(me.x, me.y)) {
    G.autoT = now;
    const rng2 = CLASSES[me.cls].range, cur = G.target && G.monsters[G.target];
    const keep = cur && !cur.dieAt && dist(me.x, me.y, cur.rx, cur.ry) <= rng2 * 1.5;
    if (!keep) { let best = null, bd = rng2; for (const id in G.monsters) { const q = G.monsters[id]; if (q.dieAt || !q.visible || MON[q.type].beh) continue; const d = dist(me.x, me.y, q.rx, q.ry); if (d <= bd) { bd = d; best = q; } } if (best) setTarget(best.id); else if (cur && cur.dieAt) setTarget(null); }
  }
  const stF = (me.crouch ? 1 : 0) | (me.slide ? 2 : 0);
  if (G.mouseS) G.mouseW = screenToWorld(G.mouseS[0], G.mouseS[1]);   // o cursor parado continua apontando para o mesmo lugar da TELA quando a câmera anda
  if ((combatFacing() || G.parrying) && G.mouseW && !me.sit && !me.bathing && !G.training && me.sleep == null) { let a = Math.atan2(G.mouseW.y - me.y, G.mouseW.x - me.x);   /* sentado ou deitado: não gira com o mouse */
    { let best = null, bd = 3.4; for (const id in G.monsters) { const q = G.monsters[id]; if (q.dieAt || !q.visible || Math.abs((q.z || 0) - (me.z || 0)) > 0.5) continue; const d = dist(q.rx, q.ry, me.x, me.y), aq = Math.atan2(q.ry - me.y, q.rx - me.x); let df = Math.abs(aq - a) % (Math.PI * 2); if (df > Math.PI) df = Math.PI * 2 - df; if (d < bd && df < 0.95) { bd = d; best = aq; } }
      for (const id in G.players) { const q = G.players[id]; if (id === G.myId || !q.visible || q.downed || q.isNpc) continue; const d = dist(q.rx, q.ry, me.x, me.y), aq = Math.atan2(q.ry - me.y, q.rx - me.x); let df = Math.abs(aq - a) % (Math.PI * 2); if (df > Math.PI) df = Math.PI * 2 - df; if (d < bd && df < 0.95) { bd = d; best = aq; } }
      if (best != null) a = best; }   /* assistência de mira: o inimigo perto, na direção do cursor */
    me.fa = a; me.dir = dirFromVec(Math.cos(a), Math.sin(a), me.dir); if (G.parrying && now - (G.parryAT || 0) > 70) { G.parryAT = now; Net.send({ t: 'parrya', a }); } }
  if (now - me.sendT > 100 && (moved || me.walking !== me.sentWalk || stF !== me.sentSt || me.dir !== me.sentDir)) { me.sentDir = me.dir;
    me.sendT = now; me.sentWalk = me.walking; me.sentSt = stF;
    Net.send({ t: 'mv', x: Math.round(me.x * 100) / 100, y: Math.round(me.y * 100) / 100, z: Math.round(me.z * 100) / 100, d: me.dir, w: me.walking ? 1 : 0, r: running ? 1 : 0, c: me.crouch ? 1 : 0, sl: me.slide ? 1 : 0, ti: G.tired || (G.stam ?? STAM_MAX) < stamMax() * 0.3 ? 1 : 0 }, true);
  }
}
function lineFree(ax, ay, bx, by, z) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.3), L = z >= 0.5 ? 1 : 0;
  for (let k = 1; k <= n; k++) { const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t; if (stairH(x, y) >= 0 || !canStand(x, y, L, 0.26)) return false; }
  return true;
}
function findPath(sx, sy, tx, ty, z, near = 0) {
  z = z >= 0.5 ? 1 : 0;
  sx = Math.round(sx); sy = Math.round(sy);
  const key = (x, y) => y * MAP_W + x, start = key(sx, sy), prev = new Map([[start, -1]]), q = [[sx, sy]];
  for (let qi = 0; qi < q.length && qi < 6000; qi++) {
    const [x, y] = q[qi];
    if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= near && !(x === sx && y === sy && near)) {
      const path = []; let k = key(x, y);
      while (k !== start) { path.push([k % MAP_W, Math.floor(k / MAP_W)]); k = prev.get(k); }
      path.reverse();
      if (!near && path.length) path[path.length - 1] = [tx, ty];
      return path;
    }
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || !walkableTile(nx, ny, z)) continue;
      if (z === 0 && !edgeOk(x, y, nx, ny)) continue;
      if (dx && dy && (!walkableTile(x + dx, y, z) || !walkableTile(x, y + dy, z))) continue;
      if (z === 0 && WORLD.stair[k]) continue;
      prev.set(k, key(x, y)); q.push([nx, ny]);
    }
  }
  return null;
}

function setTarget(id) {
  if (G.target === id) return;
  G.target = id;
  Net.send({ t: 'target', id });
  updateTargetFrame();
}
// espaços com habilidade da árvore: salvos por herói neste navegador
function slotKey() { return 'nae-slots|' + (G.me ? charKey(G.me.name, G.me.cls) : ''); }
function slotTreeLoad() { try { G.slotTree = JSON.parse(localStorage.getItem(slotKey()) || 'null'); } catch (e) { G.slotTree = null; }
  if (!G.slotTree && G.me) { const sv = loadChars()[charKey(G.me.name, G.me.cls)]; if (sv && Array.isArray(sv.slots)) G.slotTree = sv.slots; }   // reserva: espaços guardados junto com o herói
  G.slotTree = G.slotTree || [null, null, null, null]; G.tcdEnd = G.tcdEnd || [0, 0, 0, 0]; }
function slotTreeSave() { try { localStorage.setItem(slotKey(), JSON.stringify(G.slotTree)); } catch (e) { } }
function slotTreeNode(i) { const s = G.slotTree && G.slotTree[i]; if (!s || !G.me) return null; const br = TREE[G.me.cls] && TREE[G.me.cls][s.b], nd = br && br.nodes[s.n === 5 ? 5 : 4]; return nd && nd.id === s.id && G.me.tree && G.me.tree[nd.id] ? { ...s, nd, br } : null; }
function slotEquip(i, b, n, id) { if (!G.slotTree) slotTreeLoad(); for (let k = 0; k < 4; k++) if (G.slotTree[k] && G.slotTree[k].id === id) G.slotTree[k] = null; G.slotTree[i] = id ? { b, n, id } : null; slotTreeSave(); buildHotbar(); }
function treeEquipMenu(nd, bi, i) {
  let d = $('tequip'); if (d) d.remove(); d = document.createElement('div'); d.id = 'tequip'; d.className = 'gpanel';
  const n = i === 5 ? 5 : 4, cur = (G.slotTree || []).findIndex(s => s && s.id === nd.id);
  d.innerHTML = '<div class="gp-head"><span>' + nd.name + '</span><button class="gp-x" data-x>✕</button></div><div class="est-cost">' + nd.desc + '<br>Mana ' + nd.mp + ' · Recarga ' + nd.cd / 1000 + 's</div><div class="tq-btns">' +
    [0, 1, 2, 3].map(k => '<button class="est-btn' + (cur === k ? ' on' : '') + '" data-k="' + k + '">Espaço ' + (k + 1) + '<small>' + (slotTreeNode(k) ? slotTreeNode(k).nd.name : SKILLS[G.me.cls][k].name) + '</small></button>').join('') + '</div>' +
    (cur >= 0 ? '<button class="est-btn ghost" data-off>Tirar da barra (volta ' + SKILLS[G.me.cls][cur].name + ')</button>' : '');
  document.body.appendChild(d);
  d.querySelector('[data-x]').onclick = () => d.remove();
  d.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { slotEquip(+b.dataset.k, bi, n, nd.id); d.remove(); showToast(nd.name + ' equipada no espaço ' + (+b.dataset.k + 1) + '.'); });
  const off = d.querySelector('[data-off]'); if (off) off.onclick = () => { G.slotTree[cur] = null; slotTreeSave(); buildHotbar(); d.remove(); };
}
function castSkill(i) {
  if (i === 0 && G.me && G.me.cls === 'mage' && typeof flameStart === 'function' && !slotTreeNode(0) && SKILLS.mage[0] && SKILLS.mage[0].id === 'ember') { flameStart(); setTimeout(() => flameStop(), 1200); return; }   /* clique no ícone: um jato curto */
  { const T = slotTreeNode(i); if (T) { const now = performance.now(); if (now < (G.tcdEnd[i] || 0) || G.me.downed) return; if (G.me.mp < T.nd.mp) { showToast('Mana insuficiente.'); return; }
    Net.send({ t: 'tskill', b: T.b, n: T.n === 5 ? 5 : undefined, a: G.me.fa ?? 0, id: G.target || 0 }); G.tcdEnd[i] = now + T.nd.cd; const slot = $('slot' + i); slot.classList.remove('pressed'); void slot.offsetWidth; slot.classList.add('pressed'); return; } }
  const me = G.me, sk = SKILLS[me.cls][i], now = performance.now();
  if (!sk || me.downed) return;
  if (now < G.cdEnd[i]) return;
  if (me.mp < sk.mp) { showToast('Mana insuficiente.'); return; }
  if (healthState(me) === 3) { showToast('De joelhos, sem forças para isso.'); return; }
  if (sk.tgt) {
    const t = G.target && G.monsters[G.target];
    if (!t) { showToast('Selecione um alvo (clique nele ou aperte Espaço).'); return; }
    if (dist(me.x, me.y, t.rx, t.ry) > sk.range + 0.3) { showToast(`Alvo fora de alcance (máx. ${sk.range} tiles).`); return; }
  }
  const slot = $('slot' + i);
  slot.classList.remove('pressed'); void slot.offsetWidth; slot.classList.add('pressed');
  if (sk.id === 'windstep') { const iv = myInput(), v = iv || (me.fa != null ? [Math.cos(me.fa), Math.sin(me.fa)] : [0, 1]), L = Math.hypot(v[0], v[1]) || 1; G.dodge = { t0: now, v: [v[0] / L, v[1] / L], dist: 3.5 * (1 + useBonus(me, 'el_wind')), ms: 320 }; G.cdEnd[i] = now + sk.cd; Net.send({ t: 'skill', i, a: Math.atan2(v[1], v[0]) }); return; }
  Net.send({ t: 'skill', i });
}
function drinkPot(k) {
  if (G.me.downed) return;
  if (!G.me.pots || G.me.pots[k] <= 0) { showToast(`Sem ${ITEMS[k].name}. Compre no Empório do Borin.`); return; }
  Net.send({ t: 'pot', k });
}
function nearestDowned() {
  let best = null, bd = 1.7;
  for (const id in G.players) { const e = G.players[id]; if (id === G.myId || !(e.downed || healthState(e) === 3) || !e.visible || e.carriedBy) continue; const d = dist(e.rx, e.ry, G.me.x, G.me.y); if (d < bd) { bd = d; best = e; } }
  return best;
}

// ---------------- salvar no navegador ----------------
const SAVE_KEY = 'nae-chars-v4';
function loadChars() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
function charKey(name, cls) { return name.trim().toLowerCase() + '|' + cls; }
function saveChar() {
  if (G.dead) return;
  const me = G.me;
  try {
    const all = loadChars();
    all[charKey(me.name, me.cls)] = { slots: G.slotTree || undefined, uid: G.myUid || undefined, wandInfo: me.wi || undefined, cloak: me.ck || 0, name: me.name, cls: me.cls, skin: me.skin, color: me.color, lvl: me.lvl, xp: me.xp, gold: me.gold, pots: me.pots, food: me.food, water: me.water, infect: me.infect, hasSkin: me.hasSkin, tree: me.tree, prof: me.prof, feats: me.feats, freeLimb: me.freeLimb, shieldHp: me.shp, use: me.use, jailLeft: me.jl || 0, body: me.body, bleed: me.bleed, lost: (me.lost || 0) & 30, pro: me.pro || 0, inv: me.inv, quests: me.quests, qdone: me.qdone, t: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(all));
  } catch (e) { }
}

// ============================================================
//  INTERFACE
// ============================================================
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
// nota do computador: placa de vídeo, núcleos e memória (o FPS medido entra depois); serve para a qualidade inicial e para escolher o próximo anfitrião
function pcSpecs() {
  if (G.pcSpec) return G.pcSpec; let gpu = '';
  try { const c = document.createElement('canvas'), gl = c.getContext('webgl'); const ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; } catch (e) { }
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4, g = gpu.toLowerCase();
  let gs = /rtx|radeon rx|rx \d{4}|arc a|m1|m2|m3|m4|apple gpu/.test(g) ? 3 : /gtx|radeon|nvidia|iris xe/.test(g) ? 2 : /intel|uhd|hd graphics|mali|adreno|swiftshader|llvmpipe/.test(g) ? 1 : 1.5;
  if (/swiftshader|llvmpipe|basic render/.test(g)) gs = 0.3;
  const mobile = matchMedia('(pointer: coarse)').matches;
  return (G.pcSpec = { gpu: gpu.slice(0, 60), cores, mem, score: Math.round((gs * 30 + Math.min(16, cores) * 3 + Math.min(16, mem) * 2) * (mobile ? 0.5 : 1)) });
}
function qLevelNow() { if (SET.quality && SET.quality !== 'auto') return QFIXED[SET.quality] ?? 4; if (G.qLevel == null) { const s = pcSpecs().score; G.qLevel = s >= 110 ? 5 : s >= 85 ? 4 : s >= 65 ? 3 : s >= 45 ? 2 : 1; } return G.qLevel; }
// mede o FPS: abaixo de ~40 por 3 s desce um nível; acima de ~57 por 15 s sobe um (só no automático)
function qAutoTick(now) {
  const Q = G.qMon || (G.qMon = { t: now, n: 0, low: 0, high: 0, fps: 60 }); Q.n++;
  if (now - Q.t < 1000) return; Q.fps = Q.n * 1000 / (now - Q.t); Q.t = now; Q.n = 0; G.fps = Q.fps;
  if (!G.started || (SET.quality && SET.quality !== 'auto') || document.hidden) return;
  if (Q.fps < 40) { Q.low++; Q.high = 0; } else if (Q.fps > 57) { Q.high++; Q.low = 0; } else { Q.low = 0; Q.high = 0; }
  const L = qLevelNow();
  if (Q.low >= 3 && L > 0) { G.qLevel = L - 1; Q.low = 0; resize(); showToast('Qualidade gráfica: ' + QLEVELS[G.qLevel].n + ' (para rodar liso)'); }
  else if (Q.high >= 15 && L < 5) { G.qLevel = L + 1; Q.high = 0; resize(); showToast('Qualidade gráfica: ' + QLEVELS[G.qLevel].n); }
}
function resize() {
  DPR = Math.min(QLEVELS[qLevelNow()].dpr, Math.max(0.7, window.devicePixelRatio || 1));
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  G.baseScale = clamp(H / 425 * 1.45 * (SET.zoom || 1), 1.8, 6.5); if (!G.zoomUser) SCALE = G.baseScale;
}
window.addEventListener('resize', resize);
resize();

function bar(id, v, max, text) { $(id + '-fill').style.width = (100 * clamp(v / max, 0, 1)) + '%'; $(id + '-text').textContent = text; }
function updateHud() {
  const me = G.me; if (!me) return;
  $('hud-name').textContent = me.name;
  $('hud-class').textContent = CLASSES[me.cls].name; $('hud-lvl').textContent = me.lvl;
  bar('hp', me.hp, me.maxHp, `${me.hp} / ${me.maxHp}`);
  bar('mp', me.mp, me.maxMp, `${me.mp} / ${me.maxMp}`);
  if (typeof survLungUpdate === 'function') survLungUpdate(performance.now());
  bar('st', G.stam ?? stamMax(), stamMax(), 'Estamina'); $('st-fill').parentNode.classList.toggle('tired', !!G.tired);
  bar('xp', me.xp, need(me.lvl), `${me.xp} / ${need(me.lvl)} xp`);
  $('gold').textContent = me.gold;
  $('pot-hp-n').textContent = me.pots ? me.pots.hp : 0;
  $('pot-mp-n').textContent = me.pots ? me.pots.mp : 0; if ($('pot-band-n')) $('pot-band-n').textContent = me.pots ? (me.pots.band || 0) : 0;
  const st = $('combat-state');
  st.textContent = me.downed ? '✖ Caído' : me.combat ? '⚔ Em combate' : (me.hp < me.maxHp || me.mp < me.maxMp ? '✚ Recuperando' : '· Descansado');
  st.className = me.downed || me.combat ? 'combat' : 'rest';
  SKILLS[me.cls].forEach((sk, i) => $('slot' + i).classList.toggle('nomana', me.mp < sk.mp));
  const buffs = $('buffs'); buffs.innerHTML = '';
  const now = performance.now();
  for (const k in me.buffs) {
    if (me.buffs[k] <= now) continue;
    const d = document.createElement('div'); d.className = 'buff ' + k; d.dataset.tip = BUFF_NAMES[k] || k; d.dataset.end = me.buffs[k];
    buffs.appendChild(d);
  }
  $('downed-ui').classList.toggle('hidden', !me.downed || (G.condemned && G.condemned.has(G.myId)) || !!(me.exec && me.exec.T && performance.now() < me.exec.t0 + me.exec.T.fall + 3000));
  if (G.dialog) refreshDialogGold();
}
function updateQuests() {
  const box = $('quest-list'), done = $('quest-done'), me = G.me;
  box.innerHTML = ''; done.innerHTML = '';
  if (typeof profsHtml === 'function') { let pe = $('journal-profs'); if (!pe) { pe = document.createElement('div'); pe.id = 'journal-profs'; $('journal').appendChild(pe); } pe.innerHTML = profsHtml(); }
  const act = Object.entries(me.quests || {});
  const row = (q, html) => { const d = document.createElement('div'); d.className = 'jq'; d.innerHTML = html; return d; };
  for (const [id, n] of act) {
    const q = QUESTS.find(x => x.id === id); if (!q) continue;
    box.appendChild(row(q, `<b>${q.name}</b> <small>· ${n}/${q.count} ${MON[q.mon].name}</small><div class="jq-bar"><div style="width:${100 * n / q.count}%"></div></div><small>${q.desc} Recompensa: ${q.xp} xp e ${q.gold} de ouro.</small>`));
  }
  if (!act.length) box.innerHTML = '<div class="gp-note">Nenhum contrato ativo.</div>';
  const dn = QUESTS.filter(q => me.qdone && me.qdone[q.id]);
  for (const q of dn) done.appendChild(row(q, `<b>${q.name}</b> <small>· cumprido ${me.qdone[q.id]}x</small>`));
  if (!dn.length) done.innerHTML = '<div class="gp-note">Nada ainda.</div>';
}
// ---------- painéis: inventário (I) e jornada (J) ----------
function togglePanel(id, force) {
  if (typeof gmToggle === 'function') { const t = { inv: 'char', journal: 'journal', tree: 'skills' }[id]; if (force === false) { if (GM.on && GM.tab === t) gmClose(); } else if (force === true) gmOpen(t); else gmToggle(t); return; }
  const el = $(id), open = force != null ? force : el.classList.contains('hidden');
  for (const o of ['inv', 'journal', 'tree']) $(o).classList.add('hidden');
  if (!open) return;
  el.classList.remove('hidden');
  if (id === 'inv') updateInv(); else if (id === 'tree') updateTree(); else updateQuests();
}
function updateInv() {
  const me = G.me, grid = $('inv-grid'); if (!me) return;
  $('inv-gold').textContent = me.gold;
  const list = [];
  if (me.pots && me.pots.hp) list.push({ k: 'hp', n: me.pots.hp, name: ITEMS.hp.name, icon: '🧪', color: '#e85a5a', desc: ITEMS.hp.desc + ' Clique para beber (Q).', use: () => drinkPot('hp') });
  list.push({ k: 'water', n: '∞', name: 'Cantil', icon: '💧', color: '#6ab8ff', desc: 'Um cantil que nunca seca. Você bebe sozinho quando a sede aperta; ou aperte 0 (ou clique) para beber.', use: () => Net.send({ t: 'use', k: 'water' }) });
  if (me.pots && me.pots.mp) list.push({ k: 'mp', n: me.pots.mp, name: ITEMS.mp.name, icon: '🧪', color: '#5a8ae8', desc: ITEMS.mp.desc + ' Clique para beber (E).', use: () => drinkPot('mp') });
  for (const k in (me.inv || {})) { const it = LOOT[k]; if (it && me.inv[k] > 0) list.push({ k, n: me.inv[k], name: it.name, icon: it.icon, color: it.color, desc: it.desc + (WANDS[k] && me.wi && me.wi.k === k ? ' A sua: ' + me.wi.w + ', ' + me.wi.c + ', ' + me.wi.len + ' cm, ' + me.wi.feel + ' (dano ' + (me.wi.dmg >= 0 ? '+' : '') + Math.round(me.wi.dmg * 100) + '%, mana ' + (me.wi.mp >= 0 ? '+' : '') + me.wi.mp + ').' : '') + (CLOAK_BY_ITEM[k] && me.ck === CLOAK_BY_ITEM[k] ? ' (vestida)' : '') + ' Vale ' + it.price + ' de ouro cada no Empório.', use: FOOD[k] || k === 'ale' || k === 'firemead' || k === 'salve' || CLOAK_BY_ITEM[k] || k === 'ointment' || k === 'firewood' || k === 'herb' ? () => Net.send({ t: 'use', k }) : null }); }
  grid.innerHTML = '';
  for (let i = 0; i < INV_SLOTS; i++) {
    const s = document.createElement('div'), it = list[i]; s.className = 'inv-slot';
    if (it) {
      s.classList.add('full'); if (G.newLoot === it.k) s.classList.add('new');
      s.innerHTML = `<span style="color:${it.color};filter:${it.k === 'mp' ? 'hue-rotate(55deg) saturate(1.4)' : it.k === 'hp' ? 'hue-rotate(195deg) saturate(1.6)' : 'none'}">${it.icon}</span><span class="n">${it.n}</span>`;
      s.onmouseenter = () => { $('inv-info').innerHTML = `<b>${it.name}</b> ×${it.n}<br>${it.desc}`; };
      if (it.use || LOOT[it.k]) s.onclick = (ev) => { if (ev.shiftKey && LOOT[it.k] && typeof giveToPrisoner === 'function' && giveToPrisoner(it.k)) { setTimeout(updateInv, 300); return; } if (it.use) { it.use(); setTimeout(updateInv, 300); } };
    }
    grid.appendChild(s);
  }
  G.newLoot = null;
}
for (const b of document.querySelectorAll('.gp-x')) b.addEventListener('click', () => togglePanel(b.dataset.close, false));
$('btn-inv').addEventListener('click', () => togglePanel('inv'));
$('btn-journal').addEventListener('click', () => togglePanel('journal'));
// baú do chefe: abre ao chegar perto (ou F)
function openNearChest(r) {
  const me = G.me; if (!me || !G.chests) return false;
  for (const c of G.chests) if (c.mine && !c.open && dist(c.x, c.y, me.x, me.y) <= r && performance.now() > (G.chestT || 0)) { G.chestT = performance.now() + 1000; Net.send({ t: 'open', id: c.id }); return true; }
  return false;
}
// aviso ao chegar perto de um bastião
function checkBastion() {
  const me = G.me; if (!me) return;
  const B = BASTIONS.find(b => dist(b.x, b.y, me.x, me.y) < b.r + 5);
  if (B && G.bastShown !== B.id) { G.bastShown = B.id; showBanner(B.name, 'Bastião inimigo · cuidado', true); }
  else if (!B) G.bastShown = null;
}
// estado de saúde na tela: cansado = bordas escuras; à beira da morte = pulso vermelho e cores apagadas
function updateBodyDoll() {
  const me = G.me; if (!me || !me.body) return;
  let hurt = false, bleeding = false; const col = ['#7ab86a', '#d8c050', '#e07a30', '#c02a1a'];
  for (const k of BODY_PARTS) { const st = PART_STATE(me.body[k]), bl = (me.bleed && me.bleed[k]) > 0; if (st || bl) hurt = true; if (bl) bleeding = true; for (const el of document.querySelectorAll('.bd-' + k)) { el.style.fill = col[st]; el.classList.toggle('bleed', bl); } }
  $('bodydoll').classList.toggle('hidden', !hurt); $('bodydoll').classList.toggle('bleeding', bleeding);
  const lines = BODY_PARTS.map(k => '<div><b>' + BODY_NAMES[k] + '</b> ' + PART_STATE_NAMES[PART_STATE(me.body[k])] + ((me.bleed && me.bleed[k]) > 0 ? ' · <span class="bd-bl">sangrando</span>' : '') + '</div>').join('');
  if ($('pz-body')) $('pz-body').innerHTML = lines + '<div class="gp-note">B: bandagem (' + ((me.pots && me.pots.band) || 0) + ') · sem bandagem, perto do fogo, cauteriza · a sacerdotisa trata tudo</div>';
  document.body.classList.toggle('dizzy', PART_STATE(me.body.head) >= 2);
}
function updateHealthFx() {
  updateBodyDoll(); updateNeeds();
  const hs = G.me ? healthState(G.me) : 0;
  if (hs === G.hsShown) return; G.hsShown = hs;   // (o boneco do corpo atualiza sempre, acima)
  $('hstate').className = hs === 3 ? 'dying kneel' : hs === 2 ? 'dying' : hs === 1 ? 'tired' : '';
  document.body.classList.toggle('dying', hs >= 2); document.body.classList.toggle('tired', hs === 1);
}
function updateTargetFrame() {
  const f = $('target-frame'), t = G.target && G.monsters[G.target];
  if (true) { f.classList.add('hidden'); return; }   // tela limpa: sem quadro do alvo
  f.classList.remove('hidden');
  const z = ZONES[zoneAt(t.rx, t.ry)];
  $('tg-name').textContent = MON[t.type].name;
  $('tg-stars').textContent = '★'.repeat(Math.max(1, z.stars));
  bar('tg', t.hp, t.maxHp, `${Math.max(0, t.hp)} / ${t.maxHp}`);
  const d = dist(G.me.x, G.me.y, t.rx, t.ry), r = CLASSES[G.me.cls].range, safe = inSafe(G.me.x, G.me.y);
  const rs = $('tg-range');
  rs.textContent = safe ? 'Você está na cidadela (zona protegida)' : d <= r ? '⚔ Ao alcance' : `Fora de alcance (${d.toFixed(1)} / ${r})`;
  rs.className = !safe && d <= r ? 'ok' : 'far';
}
function updateSlots(now) {
  for (let i = 0; i < SKILLS[G.me.cls].length; i++) {
    const T = slotTreeNode(i), left = Math.max(0, T ? (G.tcdEnd[i] || 0) - now : G.cdEnd[i] - now), sk = T ? T.nd : SKILLS[G.me.cls][i], el = $('slot' + i);
    el.style.setProperty('--cd', left > 0 ? (left / sk.cd * 360) + 'deg' : '0deg');
    $('slot' + i + '-t').textContent = left > 0 ? (left / 1000).toFixed(left < 1000 ? 1 : 0) : '';
  }
  for (const b of document.querySelectorAll('.buff')) {
    const left = (+b.dataset.end - now) / 1000;
    b.textContent = left > 0 ? (left > 60 ? Math.ceil(left / 60) + 'm' : Math.ceil(left) + '') : '';
    if (left <= 0) b.remove();
  }
  const me = G.me;
  if (me.downed) { const left = Math.max(0, me.downUntil - now); $('downed-time').textContent = Math.ceil(left / 1000) + 's'; $('downed-fill').style.width = (left / DOWNED_MS * 100) + '%'; }
  // dica de interação (reanimar/carregar)
  const dn = !me.downed && nearestDowned();
  const pr = $('prompt');
  const sp = G.survPrompt || '';
  if (me.bound && sp) { if (pr.textContent !== sp) pr.textContent = sp; pr.classList.remove('hidden'); }
  else if (me.carrying) { pr.textContent = '[H] Soltar · leve até a Irmã Lúmina, na capela'; pr.classList.remove('hidden'); }
  else if (!me.downed && nearCorpse()) { /* updateLooting cuida */ }
  else if (sp && !dn) { if (pr.textContent !== sp) pr.textContent = sp; pr.classList.remove('hidden'); }
  else if (dn) { pr.textContent = `[F segurar] Reanimar ${dn.name} · [H] Carregar`; pr.classList.remove('hidden'); }
  else pr.classList.add('hidden');
}

// sem chat: avisos aparecem no canto e somem sozinhos; tudo fica guardado no histórico (aba Avisos do menu)
G.noteLog = [];
function noteLog(name, text, kind) { G.noteLog.push({ t: Date.now(), name: name || '', text: String(text), kind: kind || (name ? 'say' : 'sys') }); if (G.noteLog.length > 300) G.noteLog.shift(); if (typeof pauseNotesRefresh === 'function') pauseNotesRefresh(); }
// chat: fica no canto; parado, quase some (modo "Some quando parado"); Enter abre para digitar. Tudo fica também na aba Avisos.
function addChat(name, text) {
  noteLog(name, text);
  const log = $('chat-log'); if (!log) return; const line = document.createElement('div'); line.className = name ? 'say' : 'sys';
  if (name) { const b = document.createElement('b'); b.textContent = name + ': '; line.append(b, document.createTextNode(text)); } else line.textContent = text;
  log.appendChild(line); while (log.children.length > 60) log.firstChild.remove(); log.scrollTop = log.scrollHeight; chatWake();
}
function chatWake(ms = 7000) { const c = $('chat'); if (!c) return; c.classList.add('awake'); clearTimeout(G.chatT); G.chatT = setTimeout(() => { if (document.activeElement !== $('chat-input')) c.classList.remove('awake'); }, ms); }
// botão ⤢: alterna o chat entre o tamanho normal e o grande (fica salvo)
function chatSizeApply() { const c = $('chat'); if (c) c.classList.toggle('big', !!SET.chatBig); const b = $('chat-size'); if (b) b.textContent = SET.chatBig ? '⤡' : '⤢'; }
{ const go = () => { const b = $('chat-size'); if (b) b.onclick = e => { e.stopPropagation(); SET.chatBig = !SET.chatBig; saveSettings(); chatSizeApply(); chatWake(); }; chatSizeApply(); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); }
function chatOpen() { if (SET.chat === 'off') return; const i = $('chat-input'), c = $('chat'); c.classList.add('typing', 'awake'); i.focus(); }
function chatClose() { const i = $('chat-input'), c = $('chat'); i.blur(); c.classList.remove('typing'); chatWake(2500); }
let toastTimer = 0;
function showToast(text) { noteLog('', text, 'tip'); const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
let bannerTimer = 0;
function showBanner(title, sub, dark) {
  const b = $('banner'); $('banner-title').textContent = title; $('banner-sub').textContent = sub;
  b.className = dark ? 'show dark' : 'show'; clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.className = '', 3400);
}
function flashDamage() { const v = $('vignette'); v.classList.remove('hit'); void v.offsetWidth; v.classList.add('hit'); }

// ---------- diálogos com NPCs ----------
const GUARD_TEXT = 'Além do fosso: os Campos (★) logo além da paliçada; o Bosque Sombrio (★★) ao norte; o Pântano Pútrido (★★) a leste; as Colinas de Ossos (★★★) ao sul; o Acampamento Orc (★★★) a oeste. Perto do mar, as Terras Selvagens (★★★★). A cachoeira fica na montanha, a noroeste.';
const NPC_DIALOG = {
  v_house3: { greet: "Preciso de linho e ervas para casa.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_house4: { greet: "No meu tempo o pão era mais barato.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_trav3: { greet: "Uma moeda para uma canção, senhor?", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_monk: { greet: "Que a Aurora ilumine o seu caminho.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_noblef: { greet: "Hm. Nae é... pitoresca.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_noblem: { greet: "Vim ver o Lorde Cassian. Negócios.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_peasm: { greet: "Trouxe batata da roça para vender.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_peasf: { greet: "A colheita foi boa este ano.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_elderm: { greet: "Eu lembro quando o dragão queimou a ponte velha.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  v_elderf: { greet: "Cuidado com a viela à noite, criança.", opts: [['Tudo bem?', { local: 'Tudo, tudo. Bom dia para você.' }]] },
  banker: { greet: 'Bem-vindo ao Banco de Nae. Aqui o seu ouro dorme tranquilo atrás de uma porta que nem um dragão abre.', opts: [['Minha conta', { open: 'bank' }], ['Como funciona o banco?', { local: 'Você deposita e o ouro rende 2% por semana. Ninguém rouba, nem quando você cai. Emprestamos também, a 10% por semana, por duas semanas... e quem não paga conhece as sentinelas.' }], ['E se eu morrer?', { local: 'Então, com todo o respeito, o seu saldo fica com o banco. Ouro não tem herdeiro por aqui.' }], ['Posso comprar o banco?', { local: 'Só quem o Conselho respeita: reputação 70 ou mais, e uma fortuna. Fale com Mestre Anselmo, na Imobiliária.' }]] },
  banker2: { greet: 'Caixa aberto! Depósito ou saque?', opts: [['Minha conta', { open: 'bank' }]] },
  banker3: { greet: 'Os números nunca mentem. As pessoas, sim.', opts: [['Minha conta', { open: 'bank' }]] },
  hotelkeeper: { greet: 'Pousada do Javali Magro! Cama de palha, baú com tranca e silêncio depois das dez. Três de ouro por dia, pago na hora.', opts: [['Alugar uma cabine: 1 dia (3 ouro)', { hotel: 1 }], ['Alugar por 3 dias (9 ouro)', { hotel: 3 }], ['Alugar por 7 dias (21 ouro)', { hotel: 7 }], ['Minha cabine', { hotel: 'view' }], ['Como funciona?', { local: 'Cada cabine tem porta própria, um catre e um baú pequeno, de doze espaços, que só você abre. Dormindo no seu catre você descansa de verdade, e se não tiver casa acorda aqui. De noite chegam viajantes, então nem sempre tem vaga.' }]] },
  banker4: { greet: 'Assine aqui. E aqui. E aqui também.', opts: [['Minha conta', { open: 'bank' }]] },
  banker5: { greet: 'O tesouro de Nae está em boas mãos. As minhas.', opts: [['Minha conta', { open: 'bank' }]] },
  banker6: { greet: 'Ouro verdadeiro tem um som. O falso, outro. Eu escuto os dois.', opts: [['Minha conta', { open: 'bank' }]] },
  bankporter: { greet: 'Bem-vindo ao Banco de Nae. Os banqueiros atendem nos balcões. O cofre... só com acompanhamento.', opts: [['Tudo bem?', { local: 'Ninguém passa daquela porta redonda sem permissão. Ninguém.' }]] },
  v_house1: { greet: "Bom dia! Vim fazer as compras da semana.", opts: [['Tudo bem?', { local: "Tudo tão caro hoje em dia..." }]] },
  v_house2: { greet: "Bom dia! Vim fazer as compras da semana.", opts: [['Tudo bem?', { local: "Tudo tão caro hoje em dia..." }]] },
  v_trav1: { greet: "Acabei de chegar de longe. Onde fica a taverna?", opts: [['Tudo bem?', { local: "Estrada perigosa, essa até Nae." }]] },
  v_trav2: { greet: "Acabei de chegar de longe. Onde fica a taverna?", opts: [['Tudo bem?', { local: "Estrada perigosa, essa até Nae." }]] },
  v_vis1: { greet: "Que cidade bonita! Já viu o chafariz?", opts: [['Tudo bem?', { local: "Estou só de passagem." }]] },
  v_vis2: { greet: "Que cidade bonita! Já viu o chafariz?", opts: [['Tudo bem?', { local: "Estou só de passagem." }]] },
  v_thug1: { greet: "Tá olhando o quê?", opts: [['Tudo bem?', { local: "Circulando, circulando." }]] },
  v_thug2: { greet: "Tá olhando o quê?", opts: [['Tudo bem?', { local: "Circulando, circulando." }]] },
  supplier: { greet: 'Sou o Jonas, entregador do fornecedor. Faça a encomenda no menu do seu negócio (tecla N) e eu levo até a sua loja!', opts: [['Quanto tempo demora?', { local: 'Saio do portão principal uma hora depois do pedido e vou andando. Se ninguém me atacar no caminho, chego rapidinho.' }]] },

  st_wheat: { greet: "Trigo dourado até onde a vista alcança! Pegue a foice, se quiser ajudar na colheita.", opts: [['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_mill: { greet: "O vento gira, a pedra mói, e o trigo vira farinha fininha. Cuidado com a poeira!", opts: [['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_bakery: { greet: "Pão saindo do forno! Sinta o cheiro. Tortas e bolos sob encomenda.", opts: [['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_saw: { greet: "A serra não para enquanto o rio corre! Toras de pinho e carvalho, cortadas e empilhadas.", opts: [['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_mine: { greet: "Pedra, minério e, se a sorte ajudar, um cristal que brilha no escuro. Cuidado com a cabeça.", opts: [['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_farm: { greet: "Ervas para o alambique, linho para o tear. A terra daqui é boa, só falta mão.", opts: [['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_carp: { greet: "Madeira boa vira varinha, cabo, caixa ou papel. Me dê toras e eu faço o resto.", opts: [['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_alch: { greet: "Cuidado com o caldeirão! Erva certa, fogo baixo, paciência… e sai um tônico que levanta defunto.", opts: [['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_apoth: { greet: "Bem-vinda, bem-vindo à estufa! Cuidado com o tanque. Ervas, remédios, chás... e eu mesma examino suas feridas.", opts: [['🩺 Consulta de ferimentos — 5 ouro', { a: 'consult' }], ['🍵 Chá medicinal — 4 ouro (cura, fôlego, sem frio)', { a: 'tea' }], ['⚗ Encomendar Pomada de Elva — 2 ervas + 10 ouro (2 h)', { a: 'order', k: 'salve' }], ['⚗ Encomendar 2 Poções de vida — 3 ervas + 12 ouro (3 h)', { a: 'order', k: 'elixir' }], ['📦 Buscar minha encomenda', { a: 'pickup' }], ['Comprar no balcão', { counter: 1 }], ['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_arcane: { greet: "Cristais, varinhas, coisas que zumbem. Não encoste no que brilha.", opts: [['Comprar no balcão', { counter: 1 }], ['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_tailor: { greet: "Linho, lã e linha. Se o patrão mandar tecido, eu deixo a loja cheia de cor.", opts: [['Comprar no balcão', { counter: 1 }], ['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_witch: { greet: "Bem-vindo à Lua Prateada. Cada frasco aqui foi destilado sob a lua cheia. Não toque no que borbulha.", opts: [['Comprar no balcão', { counter: 1 }], ['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_dojo: { greet: "Bem-vindo ao Punho de Ferro. O corpo aprende pela repetição: mil socos no makiwara antes de um no inimigo.", opts: [['🥋 Como funciona o treino?', { local: 'Pague a diária e aperte F perto de um makiwara ou de um mokujin: você treina sozinho até cansar, descansa e volta. Só o cavaleiro aprende com os bonecos (espada e punhos). Com fome, o treino para.' }], ['Aulas de golpes (em breve)', { local: 'Logo vou ensinar o arremesso de quadril, a rasteira, o soco em sequência e a postura de defesa. Volte em breve.' }], ['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_scroll: { greet: "Papel, pergaminho, tinta. Um bom mapa vale mais que uma espada, acredite.", opts: [['Comprar no balcão', { counter: 1 }], ['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  courier1: { greet: "Pip, mensageiro! Levo e trago o que for, da vila até a Rua Nova, num pé só.", opts: [['Tem alguma entrega para mim?', { job: 'delivery' }], ['O que você faz?', { local: 'Quando alguém tem oficina e loja, eu levo a produção de uma para a outra. Se me atacarem no caminho, a carga se perde… então trate bem os mensageiros.' }]] },
  courier2: { greet: "Lia Ventura. Conheço cada viela daqui até o rio. Ninguém me alcança.", opts: [['O que você faz?', { local: 'Quando alguém tem oficina e loja, eu levo a produção de uma para a outra. Se me atacarem no caminho, a carga se perde… então trate bem os mensageiros.' }]] },
  courier3: { greet: "Tomé, carroceiro. Devagar, mas a carga chega inteira. Quase sempre.", opts: [['O que você faz?', { local: 'Quando alguém tem oficina e loja, eu levo a produção de uma para a outra. Se me atacarem no caminho, a carga se perde… então trate bem os mensageiros.' }]] },
  agent: { greet: 'Salam! Bem-vindo à Casa das Mãos de Ouro. Sente-se, aceita um chá? Aqui você acha as mãos mais honestas de Nae: quem cozinha, arruma, carrega… e quem protege. Os candidatos mudam todo dia.', opts: [
    ['Ver os candidatos de hoje', { open: 'agency' }],
    ['Como funciona?', { local: 'Você precisa ter uma casa (alugada ou comprada). Escolha um candidato no quadro: cada um tem um jeito e um salário por dia. Na contratação eu cobro um dia de salário. Depois o salário sai sozinho todo dia, primeiro do banco. Sem dinheiro, o empregado avisa e, no dia seguinte, vai embora. Por enquanto, um doméstico por casa.' }],
    ['O que um doméstico faz?', { local: 'Em casa: cozinha com o que tiver no baú, arruma a cama (dormir em cama arrumada descansa mais), serve comida e água quando você chega com fome ou sede e, na suíte, prepara o banho. Fale com ele (F) para mandar seguir você, carregar coisas, levar tudo para casa ou fazer uma massagem. Seguindo você, ele coleta junto.' }]] },
  broker: { greet: 'Bem-vindo à Imobiliária Chave de Bronze! Casas, lojas, oficinas: se tem porta em Nae, eu sei de quem é a chave. Quer ver o que está livre?', opts: [
    ['Ver imóveis (mapa e lista)', { open: 'estate' }],
    ['Como funciona o aluguel?', { local: 'Simples: você paga a primeira semana e uma caução, e a chave é sua. Depois o aluguel sai sozinho da sua bolsa uma vez por semana (7 dias do jogo). Se faltar ouro por duas semanas, a casa volta para mim e o baú vai para a sua mochila. Devolveu a chave? A caução volta. E lembre: perto do castelo é caro, na periferia é barato.' }],
    ['E o que ganho com uma casa?', { local: 'Porta trancada (só entra quem você autorizar), um baú seguro, você acorda lá quando chega ao reino e dorme muito melhor na sua própria cama. Nada como estar em casa.' }],
    ['Posso ter uma loja ou oficina?', { local: 'Pode! Os pontos vagos da Rua Nova e as oficinas da Vila do Oeste estão à venda e para alugar. Cada um vem com um funcionário. As oficinas produzem, os mensageiros levam para as suas lojas e as lojas vendem sozinhas. O lucro fica no cofre: vá buscar!' }],
    ['Comprar ou alugar?', { local: 'Alugar sai barato para começar, mas cobra todo dia. Comprar custa 60 dias de aluguel de uma vez, e depois só 1 ouro de imposto por dia. Se cansar, a Coroa compra de volta pela metade.' }]] },
  noble: { greet: 'Oh. Um aventureiro, aqui? Que... pitoresco. Cuidado com as botas no calçamento.', opts: [['Que bairro é este?', { local: 'O Bairro Nobre, querido. As melhores famílias de Nae vivem aqui, longe do cheiro da feira.' }]] },
  noble2: { greet: 'Lorde Cassian Aldren. Se veio pedir favores, marque uma audiência como todo mundo.', opts: [['Só estou de passagem.', { local: 'Então passe. E não pise nos canteiros.' }]] },
  gardener: { greet: 'Bom dia! Essas sebes não se podam sozinhas, sabe? A Lady Valmont quer tudo perfeito.', opts: [['Precisa de ajuda? (varrer a praça)', { job: 'sweep' }], ['Belo jardim.', { local: 'Trinta anos de tesoura! A roseira do chafariz fui eu que plantei.' }]] },
  tailor: { greet: 'Bem-vindo ao Ateliê Real. Aqui só entra o que há de mais fino em Nae: armaduras de gala, mantos de seda e couro trabalhado à mão. Admire as vitrines.', opts: [
    ['O que está nas vitrines?', { local: 'As peças mais raras do reino, vestidas nos manequins lá fora. Elas trocam de tempos em tempos. Em breve poderão ser encomendadas, mas não serão baratas.' }],
    ['Como estou vestido?', { local: 'Hmm... o corte é honesto, mas o tecido já viu dias melhores. Volte quando quiser algo à altura do seu nome.' }]] },
  jailer: { greet: 'Cadeia de Nae. Quem entra, cumpre a pena — ou paga a fiança.', opts: [['Pagar a fiança do meu segurança (40 de ouro)', { a: 'segbail' }]] },
  executioner: { greet: 'A justiça de Nae é rápida e limpa. Traga o condenado caído até o cadafalso — carregue-o e aperte F aqui perto — e eu cuido do resto.', opts: [] },
  fruit: { greet: 'Frutas fresquinhas do pomar, colhidas hoje cedo! Maçã docinha, amora do mato... leva uma?', opts: [
    ['Tudo fresquinho?', { local: 'Colhido hoje cedo, juro pela minha avó!' }]] },
  merchant: { greet: 'Bem-vindo ao Empório. Não é muito, mas o que vendo funciona.', opts: [
    ['Precisa de ajuda? (carregar caixas)', { job: 'crates' }],
    ['Odre cheio — 12 ouro', { a: 'buy', item: 'water' }], ['Vender todo o saque (rápido)', { a: 'sell' }]] },
  priest: { greet: 'Paz, viajante. A capela é pequena, mas a Aurora ainda escuta quem pede. Traga aqui os que caírem; eu cuido deles.', opts: [['Receber a bênção (grátis)', { a: 'bless' }], ['Doar 25 de ouro à capela (reputação)', { a: 'donate' }], ['Ritual de restauração dos membros — 120 ouro (o primeiro é de graça)', { a: 'ritual' }]] },
  innkeeper: { greet: 'Bem-vindo ao Ronco do Dragão! Eu vi o bicho com estes olhos: esvaziou nosso tonel e dormiu no telhado. Senta e pede uma!', opts: [['Precisa de ajuda? (água do poço)', { job: 'water' }],
    ['🔥 Hidromel de Fogo — 12 ouro (sem frio por 5 min)', { a: 'firemead' }], ['Ensopado da casa — 10 ouro (recupera tudo)', { a: 'stew' }], ['🍺 Desafio do Tonel — 10 ouro (5 canecas sem cair: prêmio de 40)', { a: 'tonel' }],
    ['🏆 Ver o quadro de campeões', { a: 'champs' }], ['🐉 A lenda do dragão', { a: 'legend' }], ['Ouvir as conversas da taverna', { a: 'rumor' }]] },
  tavmaid: { greet: 'Oi! Sou a Lina, levo as canecas. Se quiser beber, pede ao Brom no balcão, que ele é ciumento das torneiras!', opts: [['Como é o Desafio do Tonel?', { local: 'A cada rodada o Brom serve uma caneca para cada um. Quem cair primeiro perde! Contra ele, é aguentar cinco. Quem vence vai para o quadro na parede.' }]] },
  guard: { greet: 'Fique atento lá fora. Quanto mais longe da cidadela, mais o mundo tenta te matar.', opts: [['Quais são as regiões?', { local: GUARD_TEXT }]] },
  smith: { greet: 'Hrodgar. Ferreiro da cidadela. Se a lâmina está cega, eu resolvo.', opts: [['Afiar a arma — 25 ouro (+15% de dano por 4 min)', { a: 'whet' }], ['Consertar o escudo — 15 ouro', { a: 'repair' }], ['Prótese (perna de pau / gancho) — 30 ouro', { a: 'prosth' }], ['Conversar', { a: 'talk' }]] },
  captain: { greet: 'Sou a Capitã Varn. Temos poucos braços e muitas ameaças. Aceite um contrato e eu pago pelo serviço.', opts: [] },
};
function npcUnderMouse(mx, my) {
  const S = SCALE;
  for (const n of NPCS) {
    const e = G.npcs[n.id]; if (e.npDead || e.npDown || e.onBackBy) continue; const p = iso(e.rx, e.ry), sx = (p.sx + G.view.ox) * S, sy = (p.sy + G.view.oy) * S;
    if (mx > sx - 16 * S && mx < sx + 16 * S && my > sy - 72 * S && my < sy + 6 * S) return n;
  }
  return null;
}
function openDialog(id) {
  { const e = G.npcs[id]; if (e && (e.npDead || e.npDown)) { showToast(e.npDead ? e.name + ' está morto.' : e.name + ' está caído.'); return; } }
  const n = NPCS.find(q => q.id === id) || G.npcs[id]; if (!n) return; const def = NPC_DIALOG[n.id === 'captain' ? 'captain' : n.kind];
  if (!def) { showToast((n.name || 'Essa pessoa').split(',')[0] + ' não quer conversar agora.'); return; }
  G.dialog = { id };
  $('dlg-name').textContent = n.name; G.dlgOp = null; if (n.kind !== 'guard' && n.kind !== 'captain') Net.send({ t: 'op', id: n.id });
  setDialogText(n.id === 'fruit' && !LIFE.atStall ? LIFE.busyText : def.greet);
  buildDialogOptions(id);
  const pc = $('dlg-portrait'), pctx = pc.getContext('2d');
  pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, pc.width, pc.height); pctx.imageSmoothingEnabled = false;
  R3.budget = Math.max(R3.budget || 0, 1);   // foto nova (não a última do mundo, que pode estar de costas)
  const spr = anySprite(null, null, null, { view: 'S', dir: 1, walk: -1 }, n.kind), kk = R3.ok ? 2.4 : 1.6;
  pctx.imageSmoothingEnabled = true;
  // 3D: a cabeça fica ~15 unidades abaixo do topo do quadro; enquadra o corpo inteiro (cabeça perto do topo, pés perto da base)
  pctx.drawImage(spr.c, pc.width / 2 - spr.ax * kk, R3.ok ? 6 - 30 * kk : pc.height - spr.ay * kk + 46, spr.w * kk, spr.h * kk);
  refreshDialogGold();
  $('dialog').classList.remove('hidden');
}
function buildDialogOptions(id) {
  const n = NPCS.find(q => q.id === id), box = $('dlg-opts');
  box.innerHTML = '';
  const add = (label, fn, cls) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; if (cls) b.className = cls; box.appendChild(b); };
  if (id === 'fruit' && !LIFE.atStall) return;
  if (id === 'captain') {
    const me = G.me;
    for (const q of QUESTS) {
      const active = me.quests && me.quests[q.id] != null;
      const done = (me.qdone && me.qdone[q.id]) || 0;
      if (active) add(`✦ ${q.name} — ${me.quests[q.id]}/${q.count} (cancelar)`, () => Net.send({ t: 'npc', n: id, a: 'abandon', id: q.id }), 'active');
      else add(`${q.name} — ${q.count} ${MON[q.mon].name} · ${q.xp} xp${done ? ` · feito ${done}x` : ''}`, () => { setDialogText(q.desc); Net.send({ t: 'npc', n: id, a: 'quest', id: q.id }); });
    }
  } else if (id === 'jailer') {
    const me = G.me;
    if (me.jl > 0) add('Pagar minha fiança — ' + Math.max(10, Math.ceil(me.jl / 60000) * 30) + ' ouro', () => Net.send({ t: 'npc', n: id, a: 'bail' }));
    for (const pid in G.players) { const q = G.players[pid]; if (q !== me && q.jailed) add('Pagar a fiança de ' + q.name + ' (30 ouro por minuto restante)', () => Net.send({ t: 'npc', n: id, a: 'bail', who: pid })); }
    add('Como funciona a cadeia?', () => setDialogText('Quem é pego pelas sentinelas fica aqui o tempo da pena: agressão 2 minutos, ataque à traição 3, assassinato 6. Dormir no catre faz o tempo passar mais rápido. Fiança: 30 de ouro por minuto que falta. E nada de mexer nas fechaduras, ouviu?'));
  } else {
    const def = NPC_DIALOG[n.kind];
    { const ent = G.npcs[id], P0 = n.bi != null ? PROPS.find(q => q.bi === n.bi) : null, playerShop = P0 && G.est && G.est.st && G.est.st[P0.id] && def && def.opts && def.opts.some(o => o[1] && o[1].counter);   /* só some quando a loja tem balcão próprio (padaria, forja, taverna continuam negociando) */
      if ((TRADE_KINDS.has(n.kind) || (ent && ent.trader)) && !playerShop) add(ent && ent.trader ? '🧳 Ver as mercadorias do viajante' : '⚖ Negociar (comprar e vender)', () => { closeDialog(); Net.send({ t: 'trade', a: 'open', npc: id }); }, 'active'); }
    if (typeof shiftHere === 'function' && shiftHere() && !(G.shiftUntil > performance.now()) && !(typeof estInBiz === 'function' && estInBiz())) add('Trabalhar um turno aqui (1 min e 15 s)', () => { closeDialog(); Net.send({ t: 'shift', a: 'start' }); });
    if (id === 'innkeeper') {   /* Desafio do Tonel contra pessoas */
      if (G.tonelInv && performance.now() < G.tonelInv.until) add('🍺 Aceitar o desafio de ' + G.tonelInv.name + ' (aposta ' + G.tonelInv.bet + ')', () => { Net.send({ t: 'npc', n: id, a: 'tonelok' }); G.tonelInv = null; }, 'active');
      for (const pid in G.players) { const q = G.players[pid]; if (q !== G.me && !q.isNpc && Math.hypot(q.rx - G.me.rx, q.ry - G.me.ry) < 6) add('🍺 Desafiar ' + q.name + ' no Tonel (aposta 20)', () => Net.send({ t: 'npc', n: id, a: 'tonelp', who: pid, bet: 20 })); }
      add('🍺 Desafiar um freguês no Tonel (aposta 20)', () => Net.send({ t: 'npc', n: id, a: 'toneln', bet: 20 })); add('🍺 Desafiar um freguês no Tonel (aposta 50)', () => Net.send({ t: 'npc', n: id, a: 'toneln', bet: 50 }));
    }
    for (const [label, act] of def.opts) add(label, () => { const P = n.bi != null ? PROPS.find(q => q.bi === n.bi) : null; if (act.open === 'biz') { if (P && estMine(P.id)) { closeDialog(); bizOpen(P.id); } else setDialogText('Só o dono pode mexer nos livros. ' + (P && G.est.st[P.id] ? 'Este ponto é de ' + G.est.st[P.id].replace('★', '') + '.' : 'Este ponto é de ' + ((P && P.npcOwner) || 'um comerciante') + ', que vende por ' + (P ? P.buy : '?') + ' de ouro: fale com Mestre Anselmo, na Imobiliária.')); } else if (act.open === 'bank') { closeDialog(); bankOpen(); } else if (act.hotel) { if (act.hotel === 'view') Net.send({ t: 'hotel', a: 'view' }); else { Net.send({ t: 'hotel', a: 'rent', d: act.hotel }); closeDialog(); } } else if (act.job) { closeDialog(); Net.send({ t: 'job', a: 'take', type: act.job }); } else if (act.counter) { if (P) counterOpen(P.id); } else if (act.owner) setDialogText(P && G.est.st[P.id] ? 'Trabalho para ' + G.est.st[P.id].replace('★', '') + '. Paga em dia… quase sempre.' : (P && P.npcOwner ? 'Trabalho para ' + P.npcOwner + ', que vende o ponto por ' + P.buy + ' de ouro (fale com Mestre Anselmo). E eu venho junto!' : 'Ninguém, por enquanto.')); else if (act.open === 'estate') { closeDialog(); estToggle(true, 'house'); } else if (act.open === 'agency') { closeDialog(); if (typeof agencyOpen === 'function') agencyOpen(); } else if (act.local) setDialogText(act.local); else Net.send({ t: 'npc', n: id, ...act }); });
  }
  if (!String(n.id).startsWith('v_')) { const grp = npcGroup(id, n.kind), likes = REP_LIKES[id] || REP_LIKES[n.kind] || REP_LIKES[grp] || [], inv = G.me.inv || {}, ok = k => inv[k] > 0 && LOOT[k] && (FOOD[k] || Object.values(REP_LIKES).some(l => l.includes(k)));
    const ks = Object.keys(inv).filter(ok).sort((a, b) => (likes.includes(b) ? 1 : 0) - (likes.includes(a) ? 1 : 0)).slice(0, 3);
    for (const gk of ks) add('Dar ' + LOOT[gk].name + ' de presente' + (likes.includes(gk) ? ' ♥' : ''), () => Net.send({ t: 'gift', id, k: gk })); }
  add('Até logo', closeDialog, 'ghost');
}
function setDialogText(t) { $('dlg-text').textContent = t; }
function refreshDialogGold() { $('dlg-gold').textContent = G.me ? G.me.gold : 0; }
function closeDialog() { G.dialog = null; $('dialog').classList.add('hidden'); }

// ---------- mouse e teclado ----------
function screenToWorld(mx, my) {
  let z = G.me ? (G.me.z || 0) * FLOOR_PX : 0;
  { const me = G.me, b = me && me.fl && BUILDINGS[me.fb]; if (b && typeof bldDims === 'function') z += me.fl * (bldDims(b).H / floorsOf(b)) * HV; }   /* andar de cima: o chão dele está mais alto na tela */
  return unIso(mx / SCALE - G.view.ox, my / SCALE - G.view.oy + z);
}
function monsterUnderMouse(mx, my) {
  let found = null, bestD = -Infinity;
  const S = SCALE;
  for (const id in G.monsters) {
    const e = G.monsters[id]; if (e.dieAt || !e.visible) continue;
    const h = MON_H[e.type] || 60, p = iso(e.rx, e.ry), sx = (p.sx + G.view.ox) * S, sy = (p.sy + G.view.oy - (e.z || 0) * FLOOR_PX) * S;
    const hw = Math.max(18, h * 0.42) * S;
    if (mx > sx - hw && mx < sx + hw && my > sy - h * S && my < sy + 6 * S) { const d = e.rx + e.ry; if (d > bestD) { found = e; bestD = d; } }
  }
  return found;
}
canvas.addEventListener('mousemove', e => {
  if (G.started && G.target) {
    const t = G.monsters[G.target], mon = t && monsterUnderMouse(e.clientX, e.clientY);
    if (t && mon && mon.id === t.id) {
      const p = iso(t.rx, t.ry), footY = (p.sy + G.view.oy - (t.z || 0) * FLOOR_PX) * SCALE, hgt = (MON_H[t.type] || 60) * SCALE, rel = (footY - e.clientY) / hgt;
      const z = rel > 0.74 ? 'head' : rel > 0.36 ? 'torso' : 'legs';
      if (z !== G.aim) { G.aim = z; Net.send({ t: 'aim', z }); }
    }
  }
  if (!G.started) return;
  const w = screenToWorld(e.clientX, e.clientY);
  G.hover = { x: Math.round(w.x), y: Math.round(w.y) };
  canvas.style.cursor = monsterUnderMouse(e.clientX, e.clientY) ? 'crosshair' : npcUnderMouse(e.clientX, e.clientY) ? 'help' : 'pointer';
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
// assento sob o mouse (bancos e cadeiras)
function seatUnderMouse(cx, cy) {
  const S = SCALE, w = screenToWorld(cx, cy);
  let best = -1, bd = 1.2;
  const mfl = (G.me && G.me.fl) || 0; WORLD.seats.forEach((st, k) => { if ((st.fl || 0) !== mfl || (st.fl && G.me.fb !== st.bi)) return; const d = Math.hypot(st.x - w.x, st.y - w.y); if (d < bd) { bd = d; best = k; } });
  return best;
}
// sentar: no chão (C) ou num assento
function sitDown(seat) {
  const me = G.me; if (!me || me.downed || me.carrying || me.carriedBy) return;
  if (seat != null && seat >= 0) {
    const st = WORLD.seats[seat];
    me.sit = { seat, chair: st.low ? 0 : 1, ox: me.x, oy: me.y }; me.x = me.rx = st.x; me.y = me.ry = st.y; me.dir = st.dir;
    Net.send({ t: 'sit', on: 1, s: seat });
  } else { me.sit = { chair: 0 }; Net.send({ t: 'sit', on: 1 }); }
  G.path = null; G.pathGoal = null; me.walking = false;
}
function standUp() {
  const me = G.me; if (!me || !me.sit) return;
  const s = me.sit; me.sit = null;
  if (s.chair) {
    // sai do assento para o lugar livre mais perto
    let spot = null;
    for (const rr of [0.8, 1.0, 1.3]) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = me.x + Math.cos(a) * rr, y = me.y + Math.sin(a) * rr; if (canStandZ(x, y, 0) && edgeOk(Math.round(me.x), Math.round(me.y), Math.round(x), Math.round(y))) spot = [x, y]; }
    if (!spot && s.ox != null) spot = [s.ox, s.oy];
    if (spot) { me.x = me.rx = spot[0]; me.y = me.ry = spot[1]; }
  }
  Net.send({ t: 'sit', on: 0 });
  Net.send({ t: 'mv', x: Math.round(me.x * 100) / 100, y: Math.round(me.y * 100) / 100, z: Math.round(me.z * 100) / 100, d: me.dir, w: 0 }, true);
}
canvas.addEventListener('mousedown', e => {
  if (!G.started) return;
  if (G.pickTarget && typeof staffPick === 'function' && e.button === 0) { staffPick(e); return; }   /* escolhendo o alvo de um trabalho sujo */
  if (inCombatZone() && !((G.dev || G.devTools) && G.devPlace) && !interactHere(e)) {
    const me = G.me;
    if (e.button === 3 || e.button === 4) { e.preventDefault(); strike('under'); return; }
    if (e.button === 2) { G.parrying = true; G.parryT0 = performance.now(); const w = screenToWorld(e.clientX, e.clientY), a = Math.atan2(w.y - me.y, w.x - me.x); me.fa = a; Net.send({ t: 'parry', on: 1, a }); return; }
    if (e.button === 0) G.mouse0 = true;
    if (e.button === 0 && me.dragMode === 'grip') { Net.send({ t: 'choke', on: 1 }); G.choking = true; return; }
    if (e.button === 0 && me.cls === 'archer' && !me.shea) { const mon = monsterUnderMouse(e.clientX, e.clientY); if (mon) setTarget(mon.id); bowPress(); return; }   // arco: segurar puxa
    if (e.button === 2 && me.cls === 'archer' && G.bow.st === 'drawing') { bowCancel(); return; }                          // botão direito relaxa a corda
    if (e.button === 0 && me.cls !== 'knight') {   // mago: clique esquerdo dispara (segure para continuar)
      const mon = monsterUnderMouse(e.clientX, e.clientY); if (mon) setTarget(mon.id);
      G.shootHeld = true; G.shootT = performance.now(); Net.send({ t: 'shoot', a: me.fa ?? 0, id: mon ? mon.id : (G.target || 0) }); return;
    }
    if (e.button === 0) {
      const mon = monsterUnderMouse(e.clientX, e.clientY); if (mon) setTarget(mon.id);
      const h = G.mouseHist || [], dx = h.length > 1 ? h[h.length - 1].x - h[0].x : 0, p = iso(me.rx, me.ry), mx = (p.sx + G.view.ox) * SCALE;
      G.melee = { k: dx < -4 ? 'slashL' : dx > 4 ? 'slashR' : e.clientX < mx ? 'slashL' : 'slashR', t0: performance.now() }; return;   // segure para carregar; solte para golpear
    }
  }
  if ((G.dev || G.devTools) && G.devPlace) { if (e.button === 2) { G.devPlace = null; return; } const w = screenToWorld(e.clientX, e.clientY); Net.send({ t: 'dev', a: 'summon', kind: G.devPlace.kind, v: G.devPlace.v, x: w.x, y: w.y }); return; }
  const me = G.me;
  const mon = monsterUnderMouse(e.clientX, e.clientY);
  if (mon) {
    setTarget(G.target === mon.id ? null : mon.id);
    if (G.target && dist(me.x, me.y, mon.rx, mon.ry) > CLASSES[me.cls].range) showToast('Fora de alcance: aproxime-se para atacar.');
    return;
  }
  const seat = seatUnderMouse(e.clientX, e.clientY);
  if (seat >= 0 && !npcUnderMouse(e.clientX, e.clientY)) {
    const st = WORLD.seats[seat];
    if (dist(me.x, me.y, st.x, st.y) <= 1.7) sitDown(seat);
    else { G.path = findPath(me.x, me.y, st.x, st.y, me.z, 1); G.pathGoal = G.path ? { x: st.x, y: st.y } : null; G.pendingSeat = G.path ? seat : null; }
    return;
  }
  const bed = !npcUnderMouse(e.clientX, e.clientY) && typeof bedUnderMouse === 'function' ? bedUnderMouse(e.clientX, e.clientY) : -1;
  if (bed >= 0 && e.button === 0) {
    const b = BEDS[bed];
    if (dist(me.x, me.y, b.x, b.y) <= 2) lieDown(bed);
    else { G.path = (me.fl || 0) !== 0 ? [[b.x, b.y]] : findPath(me.x, me.y, b.x, b.y, me.z, 1); G.pathGoal = G.path ? { x: Math.round(b.x), y: Math.round(b.y) } : null; G.pendingBed = G.path ? bed : null; }   /* andar de cima: vai reto até a cama */
    return;
  }
  if (e.button !== 0 || me.carriedBy) return;
  const w = screenToWorld(e.clientX, e.clientY), tx = Math.round(w.x), ty = Math.round(w.y);
  if (!walkableTile(tx, ty, me.z)) return;
  G.pendingNpc = null;
  if ((me.fl || 0) !== 0) { const w2 = screenToWorld(e.clientX, e.clientY); G.path = [[w2.x, w2.y]]; G.pathGoal = { x: Math.round(w2.x), y: Math.round(w2.y) }; return; }
  G.path = findPath(me.x, me.y, w.x, w.y, me.z, 0);
  if (G.path && G.path.length) G.path[G.path.length - 1] = [w.x, w.y];
  G.pathGoal = G.path ? { x: tx, y: ty } : null;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (G.started && inCombatZone()) { if (performance.now() - (G.wheelT || 0) > 220) { G.wheelT = performance.now(); strike(e.deltaY < 0 ? 'over' : 'stab'); } return; }
  SCALE = clamp(SCALE * (e.deltaY < 0 ? 1.1 : 0.9), 1.4, 7);
  G.zoomUser = true;
}, { passive: false });
// ---------- combate direcional (estilo Chivalry) ----------
// clique esquerdo = lateral (lado pelo movimento do mouse) · roda: cima = de cima, baixo = estocada · botão lateral ou Z = de baixo
// botão direito = aparar · Espaço = esquiva · F (sem nada para interagir) = chute · trocar de golpe na preparação = finta
function inCombatZone() { const me = G.me; return me && !G.paused && !G.dialog && !G.mapOpen; }   // combate em todo lugar
// clique em NPC, assento ou cama por perto: conversa/senta/deita em vez de golpear
function interactHere(e) {
  const me = G.me; if (e.button !== 0 || !me) return false; const ok = (x, y) => dist(me.x, me.y, x, y) <= 3;
  const s = seatUnderMouse(e.clientX, e.clientY); if (s >= 0 && WORLD.seats[s] && ok(WORLD.seats[s].x, WORLD.seats[s].y)) return true;
  const b = typeof bedUnderMouse === 'function' ? bedUnderMouse(e.clientX, e.clientY) : -1; if (b >= 0 && ok(BEDS[b].x, BEDS[b].y)) return true;
  return false;
}
function combatFacing() { return inCombatZone() && !G.me.running && !G.climbing; }
function strike(k, c = 0) {
  const me = G.me; if (!me || me.downed || me.carrying || me.lifted || performance.now() < (G.stunUntil || 0)) return;
  const a = me.fa ?? 0; Net.send({ t: 'atk', k, a, c });
}
canvas.addEventListener('mousemove', e => { if (G.started) { G.mouseS = [e.clientX, e.clientY]; G.mouseW = screenToWorld(e.clientX, e.clientY); G.mouseHist = (G.mouseHist || []).filter(q => performance.now() - q.t < 180).concat([{ t: performance.now(), x: e.clientX }]); } });
canvas.addEventListener('mouseup', e => { if (e.button === 0 && G.melee) { const M = G.melee; G.melee = null; const held = performance.now() - M.t0; strike(M.k, held < 150 ? 0 : Math.min(1, (held - 150) / 650)); }
  if (e.button === 0 && G.choking) { G.choking = false; Net.send({ t: 'choke', on: 0 }); } if (e.button === 0) { G.shootHeld = false; G.mouse0 = false; if (isArcher()) bowRelease(); } if (e.button === 3 || e.button === 4) e.preventDefault(); if (e.button === 2 && G.parrying) { G.parrying = false; Net.send({ t: 'parry', on: 0 }); } });
window.addEventListener('auxclick', e => { if (e.button === 3 || e.button === 4) e.preventDefault(); });
window.addEventListener('mouseup', e => { if (e.button === 2 && G.parrying) { G.parrying = false; Net.send({ t: 'parry', on: 0 }); } });

window.addEventListener('beforeunload', e => { if (G.started && !G.leaving) { e.preventDefault(); e.returnValue = ''; } });   /* evita fechar a aba sem querer */
window.addEventListener('keydown', e => {
  if (!G.started) return;
  if (e.ctrlKey && /^[a-z]$/i.test(e.key) && !/^[cvxa]$/i.test(e.key)) e.preventDefault();   /* agachado (Ctrl): sem atalhos do navegador como Ctrl+F e Ctrl+S */
  if (document.activeElement === $('chat-input')) { if (e.key === 'Enter') { const i = $('chat-input'), t = i.value.trim(); if (t) Net.send({ t: 'chat', text: t }); i.value = ''; chatClose(); e.preventDefault(); } else if (e.key === 'Escape') chatClose(); return; }
  if (/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) return;
  if (e.key === 'Enter' && !G.paused && !G.dialog) { chatOpen(); e.preventDefault(); return; }
  const k = e.key.toLowerCase();
  if (typeof obsKey === 'function' && obsKey(k, e)) { e.preventDefault(); return; }
  if (G.paused) { if (typeof gmKey === 'function' && gmKey(k, e)) e.preventDefault(); return; }
  if (k === 'escape') { if (G.dialog) { closeDialog(); return; } for (const id of ['chestp', 'bankp', 'biz', 'jobboard', 'counterp', 'estate', 'bizhub', 'roompw-ask', 'tradep']) { const el = $(id); if (el && !el.classList.contains('hidden') && el.parentNode === document.body && getComputedStyle(el).display !== 'none') { if (id === 'biz' && typeof bizClose === 'function') bizClose(); else if (id === 'estate') estToggle(false); else if (id === 'bizhub') hubToggle(false); else el.classList.add('hidden'); return; } } if (typeof emToggle === 'function') emToggle(); else togglePause(); return; }
  if (k === '1' && typeof flameKey === 'function' && flameKey(e)) return;   /* mago: segurar a tecla 1 = Chamas */
  if (k >= '1' && k <= '4') { castSkill(+k - 1); return; }
  if (k === '5' && G.me && SKILLS[G.me.cls].length > 4) { if (!e.repeat) castSkill(4); return; }
  if (k === 'q') { drinkPot('hp'); return; }
  if (k === 'e') { drinkPot('mp'); return; }
  if (k === 'r' && !G.me.downed && !e.repeat) { if (G.me.cls === 'knight') Net.send({ t: 'sbash', a: G.me.fa ?? 0 }); return; }
  if (k === 'r' && G.me.downed) { if (!PERMADEATH) { Net.send({ t: 'giveup' }); return; } gameAsk('Desistir é MORTE PERMANENTE: seu personagem será apagado. Tem certeza?', { yes: 'Desistir', no: 'Continuar lutando' }).then(ok => { if (ok) Net.send({ t: 'giveup' }); }); return; }
  if (k === 'f' && !e.repeat && typeof empNear === 'function' && empNear()) { empMenu(); return; }
  if (k === 'f' && !e.repeat && typeof segNear === 'function' && segNear()) { segMenu(segNear().id); return; }
  if (k === 'f' && !e.repeat && typeof dojoF === 'function' && dojoF()) return;
  if (k === 'f' && !e.repeat && typeof liftNear === 'function' && liftNear()) { liftMenu(); return; }
  if (k === 'f' && !e.repeat && typeof leverNear === 'function' && leverNear()) { Net.send({ t: 'tub' }); return; }
  if (k === 'f' && !e.repeat && typeof ofuroNear === 'function' && ofuroNear()) { bathEnter(); return; }
  if (k === 'f' && !e.repeat && typeof dummyNear === 'function' && dummyNear() && !G.training) { Net.send({ t: 'train', a: 'start' }); return; }
  if (k === 'f' && !e.repeat && openNearChest(1.8)) return;
  if (k === 'f' && !e.repeat && G.me && (G.me.carrying || G.me.dragMode === 'arms' || G.me.dragMode === 'foot') && STAGE.x >= 0 && dist(G.me.x, G.me.y, STAGE.x, STAGE.y) < 3.4) { Net.send({ t: 'exec' }); return; }
  if (k === 'y' && !e.repeat && G.me && G.me.wantedUntil > performance.now()) { Net.send({ t: 'surrender' }); return; }
  if (k === 'h' && !e.repeat) { const me = G.me; if (me && (me.lifted || me.carrying)) { liftOrThrow(); return; } if (typeof grabKeyDown === 'function' && grabKeyDown()) return; liftOrThrow(); return; }   // H: toque pega/carrega; segurar abre o menu de agarrar   // segurar H: menu radial (puxar / carregar / agarrar / soltar)
  if (k === 'f' && !e.repeat && !nearestDowned()) { const c = nearCorpse(); if (c) { G.loot = { id: c.id, t0: performance.now() }; G.keys.add('f'); return; } }
  if (k === 'f' && !e.repeat && G.appleOffer && performance.now() < G.appleOffer.until) { Net.send({ t: 'appleoffer' }); G.appleOffer = null; if (G.npcs.fruit) G.npcs.fruit.bubble = { t: '♥', until: performance.now() + 1500 }; return; }
  if (k === 'f' && !e.repeat && typeof boundNear === 'function') { const q = boundNear(); if (q) { Net.send({ t: 'untie', id: q.id }); return; } }
  if (k === 'f' && !e.repeat && typeof jailKeyF === 'function' && jailKeyF()) return;
  if (k === 'f' && !e.repeat && typeof nearStove === 'function' && nearStove() && !nearestDowned()) { openCook(); return; }
  if (k === 'f' && !e.repeat && !nearestDowned() && !nearCorpse() && typeof jobsF === 'function' && jobsF(e)) return;
  if (k === 'f' && !e.repeat && !nearestDowned() && hotelChestF()) return;
  if (k === 'f' && !e.repeat && !nearestDowned() && talkF()) return;
  if (k === 'f' && !e.repeat && !nearestDowned() && !nearCorpse() && typeof estateF === 'function' && estateF()) return;
  if (k === 'f' && !e.repeat && !nearestDowned() && !nearCorpse() && survivalAction()) return;
  if (k === 'f' && !e.repeat && (G.me.arw || []).length && !nearestDowned() && !nearCorpse()) { Net.send({ t: 'pullarrow' }); return; }   // arrancar flecha cravada
  if (k === 'f' && !e.repeat && inCombatZone() && !nearestDowned() && !nearCorpse() && !(G.chests || []).some(c => c.mine && !c.open && dist(c.x, c.y, G.me.x, G.me.y) < 1.8)) { Net.send({ t: 'kick', a: G.me.fa ?? 0 }); return; }
  if (k === 'f' && !e.repeat) { const d = nearestDowned(); if (d) { G.reviving = d.id; Net.send({ t: 'revive', id: d.id, on: true }); } return; }
  if (k === 'u' && !e.repeat && G.dev) { wvAct('coins', '0', 'w', GM.lastCoins || 50); return; }
  if (k === 'g' && !e.repeat) { if (G.me && !G.me.downed && !G.dev) Net.send({ t: 'sheathe' }); return; }
  if (k === 'x') { attackNearest(); return; }
  if (k === 'o' && !e.repeat && G.me && G.me.cls === 'knight') { Net.send({ t: 'wpn' }); return; }
  if (k === '0' && !e.repeat) { Net.send({ t: 'use', k: 'water' }); return; }
  if (k === 'v' && !e.repeat) { if (G.me.sleep) { getUp(); return; } if (G.me.sit) standUp(); else if (!G.me.walking) sitDown(null); return; }
  if (k === 'i' && !e.repeat) { togglePanel('inv'); return; }
  if (k === 'b' && !e.repeat) { Net.send({ t: 'band' }); return; }
  if (k === 'f2' && (G.dev || G.devTools)) { e.preventDefault(); $('devpanel').classList.toggle('hidden'); return; }
  if (k === 'escape' && G.devPlace) { G.devPlace = null; showToast('Colocação cancelada.'); return; }
  if (k === 'j' && !e.repeat) { togglePanel('journal'); return; }
  if (k === 'k' && !e.repeat) { togglePanel('tree'); return; }
  if (k === 'l' && !e.repeat) { GM.biz = 'est'; gmToggle('biz'); return; }
  if (k === 'n' && !e.repeat) { const ib = typeof estInBiz === 'function' && estInBiz(); if (ib) { if (GM.on) gmClose(); bizOpen(ib.pid); return; } GM.biz = 'hub'; gmToggle('biz'); return; }
  if ((k === '5' || k === '6' || k === '7' || k === '8') && G.me && G.me.cls === 'mage') return;
  if ((k === '5' || k === '6' || k === '7') && !e.repeat) { Net.send({ t: 'tskill', b: +k - 5, a: G.me.fa ?? 0, id: G.target || 0 }); return; }
  if (k === '8' && !e.repeat) { Net.send({ t: 'tskill', b: 2, n: 5, a: G.me.fa ?? 0 }); return; }
  if (k === 'm' && !e.repeat) { toggleWorldMap(); return; }
  if (k === 't') { if (!e.repeat) openEmoteWheel(); return; }
  if (k === ' ' && G.pick) { e.preventDefault(); if (!e.repeat) lockpickKey(); return; }
  if (k === ' ' && G.me && G.me.bound) { e.preventDefault(); if (!e.repeat) Net.send({ t: 'struggle' }); return; }
  if (k === ' ' && G.me && (G.me.gripped || G.me.tied)) { e.preventDefault(); Net.send({ t: 'struggle' }); return; }   // agarrado: martelar espaço
  if (k === ' ') { e.preventDefault(); if (!e.repeat) cycleTarget(); return; }   /* Espaço: próximo monstro mais perto */
  if (k === 'c' && inCombatZone()) { e.preventDefault(); if (!e.repeat) { const me = G.me, iv = myInput(); const v = iv || (me.fa != null ? [-Math.cos(me.fa), -Math.sin(me.fa)] : [0, 1]); G.dodge = { t0: performance.now(), v }; Net.send({ t: 'dodge' }); } return; }
  if (k === 'z' && !e.repeat && inCombatZone()) { strike('under'); return; }
  if ((k === '+' || k === '=') ) { SCALE = clamp(SCALE * 1.1, 1.4, 7); G.zoomUser = true; return; }
  if (k === '-') { SCALE = clamp(SCALE * 0.9, 1.4, 7); G.zoomUser = true; return; }
  if (k === 'tab') { e.preventDefault(); if (!e.repeat && typeof gmToggle === 'function') gmToggle(); return; }   /* TAB: painel de gameplay */
  if (k.startsWith('arrow')) e.preventDefault();
  if (k === 'shift') e.preventDefault();
  G.keys.add(k);
});
window.addEventListener('keyup', e => {
  if (!e.key) return; const k = e.key.toLowerCase();
  if (k === '1' && typeof flameStop === 'function') flameStop();   /* soltou a tecla: as chamas param */
  G.keys.delete(k);
  if (k === 't' && G.wheel) closeEmoteWheel(true);
  if (k === 'h' && typeof grabKeyUp === 'function' && grabKeyUp()) return;
  if (typeof jobsKeyUp === 'function') jobsKeyUp(k);
  if (k === 'f' && G.reviving && !G.reviveSticky) { Net.send({ t: 'revive', id: G.reviving, on: false }); G.reviving = null; }
});
window.addEventListener('blur', () => G.keys.clear());

// ---------- laço de desenho ----------
let lastMini = 0, lastHud = 0, lastT = performance.now();
const lobbyCam = { x: CENTER, y: CENTER, z: 0 };
function frame() {
  const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; qAutoTick(now);
  if (G.timers.length) { const due = G.timers.filter(t => t.at <= now); G.timers = G.timers.filter(t => t.at > now); for (const t of due) t.fn(); }
  R3.budget = G.started ? 3 : 2;
  S3.budget = G.started ? 2 : 5;
  let cam = lobbyCam;
  if (G.started) {
    updateLocal(now, dt); updateFalls(now); updateLooting(now); if (typeof updateLife === 'function') updateLife(now);
    bowUpdate(now);
    if (G.me.dragMode === 'arms') { let t = null, bd = 2.2; for (const id in G.players) { const q = G.players[id]; if (q !== G.me && q.dragged && q.downed) { const d = dist(q.rx, q.ry, G.me.x, G.me.y); if (d < bd) { bd = d; t = q; } } } for (const id in G.npcs) { const q = G.npcs[id]; if (q.dragged) { const d = dist(q.rx, q.ry, G.me.x, G.me.y); if (d < bd) { bd = d; t = q; } } } if (t) G.me.dir = dirFromVec(t.rx - G.me.x, t.ry - G.me.y, G.me.dir); }   // anda de costas olhando o corpo
    if (typeof updateNpcMotion === 'function') updateNpcMotion(now, dt);
    if (typeof npcReactions === 'function') npcReactions(now);
    if (typeof martaApple === 'function') martaApple(now);
    if (typeof updateTows === 'function') updateTows(now);
    if (typeof jobsTickC === 'function') jobsTickC(now);
    if (typeof crowdLook === 'function') { crowdLook(now); jailerNight(); }
    if (G.reviveSticky && (G.me.walking || !G.reviving)) { if (G.reviving) Net.send({ t: 'revive', id: G.reviving, on: false }); G.reviving = null; G.reviveSticky = false; }
    if (G.shootHeld && inCombatZone() && now - (G.shootT || 0) > 220) { G.shootT = now; Net.send({ t: 'shoot', a: G.me.fa ?? 0, id: G.target || 0 }); }
    for (const id in G.players) { const e = G.players[id]; if (id !== G.myId) { if (e.fling) stepFling(e, now); else interp(e, now); } updateIdle(e, now); bleed(e, now); }
    for (const id in G.monsters) { const q = G.monsters[id]; if (q.dieAt && !q._pool && now > q.dieAt && !NO_BLOOD.has(q.type)) { q._pool = 1; addBlood(q.rx, q.ry, q.z || 0, MON[q.type].big ? 1.3 : 0.8, 60000); } }
    for (const id in G.monsters) { const m = G.monsters[id]; interp(m, now); if (m.dieAt && now > m.dieAt + 650) delete G.monsters[id]; }
    for (const id in G.npcs) updateIdle(G.npcs[id], now);
    { // câmera acompanha a altura do andar (e a subida na escada), como um elevador curto
      const me = G.me, c = G.climbing, bi = c ? c.bi : ((me.fl || 0) !== 0 ? me.fb : -1), b = bi != null && bi >= 0 ? BUILDINGS[bi] : null;
      const per = b && typeof bldDims === 'function' && typeof HV !== 'undefined' ? (bldDims(b).H / floorsOf(b)) * HV : 0;
      const tgt = b ? ((me.fl || 0) + (me.lift || 0)) * per / FLOOR_PX : 0;   // altura em andares: o andar atual + quanto já subiu nos degraus
      G.camLift = G.camLift == null ? tgt : G.camLift + (tgt - G.camLift) * Math.min(1, dt / 0.11);
      cam = { x: G.me.rx, y: G.me.ry, z: G.me.z + G.camLift };
      if (G.dev && G.camAt) cam = { x: G.camAt[0], y: G.camAt[1], z: 0 };   /* só para fotos de teste */
    }
    updateGates(dt);
    if (G.mapOpen && now - (G.mapT || 0) > 300) { G.mapT = now; drawWorldMap(); }
  } else {
    const t = now / 11000;
    lobbyCam.x = CENTER + Math.cos(t) * 7; lobbyCam.y = CENTER + Math.sin(t) * 7;
    for (const id in G.npcs) updateIdle(G.npcs[id], now);
  }
  const labels = renderWorld(ctx, now, cam, W, H, DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.started) {
    drawLabels(ctx, labels, now);
    drawNumbers(ctx, now);
    updateSlots(now);
    if (now - lastMini > 200) {
      lastMini = now;
      // sem minimapa: ao entrar numa região nova, aparece o nome dela
      const zi = zoneAt(G.me.x, G.me.y);
      if (G.zoneShown == null) G.zoneShown = zi;
      else if (zi !== G.zoneShown) G.zoneShown = zi;   // sem nomes de lugares na tela
      updateHealthFx();
      openNearChest(1.1);
      updateTargetFrame();
    }
    if (now - lastHud > 1000) { lastHud = now; updateHud(); }
    if (typeof survLungUpdate === 'function' && now - (G.lungT || 0) > 50) { G.lungT = now; survLungUpdate(now); }   // o pulmão respira suave
    if (G.dialog) { const n = G.npcs[G.dialog.id]; if (dist(G.me.x, G.me.y, n.x, n.y) > 4.5) closeDialog(); }
  } else drawClassPreviews(now);
  requestAnimationFrame(frame);
}

function cycleTarget() {   /* Espaço: passa para o próximo monstro mais perto (até 9 tiles) */
  const L = Object.values(G.monsters).filter(m => !m.dieAt && dist(m.rx, m.ry, G.me.x, G.me.y) <= 9).sort((a, b) => dist(a.rx, a.ry, G.me.x, G.me.y) - dist(b.rx, b.ry, G.me.x, G.me.y));
  if (!L.length) { showToast('Nenhum monstro por perto.'); return; }
  const i = L.findIndex(m => m.id === G.target); setTarget(L[(i + 1) % L.length].id);   /* percorre do mais perto ao mais longe */
}
function attackNearest() {
  let best = null, bd = 99;
  for (const id in G.monsters) { const m = G.monsters[id]; if (m.dieAt) continue; const d = dist(m.rx, m.ry, G.me.x, G.me.y); if (d < bd) { bd = d; best = m; } }
  if (best && bd <= 10) setTarget(best.id); else showToast('Nenhum inimigo por perto.');
  const b = $('btn-attack'); b.classList.remove('pressed'); void b.offsetWidth; b.classList.add('pressed');
}
function setupJoystick() {
  const joy = $('joystick'), knob = $('joy-knob');
  let id = null, cx = 0, cy = 0;
  joy.addEventListener('pointerdown', e => { id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joy.setPointerCapture(id); move(e); });
  const move = e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy; const L = Math.hypot(dx, dy), max = 46;
    if (L > max) { dx = dx / L * max; dy = dy / L * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    G.joy = L > 10 ? [dx / max, dy / max] : null;
  };
  joy.addEventListener('pointermove', move);
  const end = e => { if (e.pointerId !== id) return; id = null; G.joy = null; knob.style.transform = ''; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}
function buildHotbar() {
  const cls = G.me.cls;
  const iconTo = (cv, id) => { const c2 = cv.getContext('2d'); c2.imageSmoothingEnabled = false; c2.clearRect(0, 0, cv.width, cv.height); const ic = iconSprite(id); c2.drawImage(ic.c, 0, 0, ic.w, ic.h, 0, 0, cv.width, cv.height); };
  if (!G.slotTree) slotTreeLoad();
  SKILLS[cls].forEach((sk, i) => {
    const el = $('slot' + i), T = slotTreeNode(i);
    if (T) { const cv = el.querySelector('canvas'), c2 = cv.getContext('2d'); c2.clearRect(0, 0, cv.width, cv.height); c2.fillStyle = '#2a1e3a'; c2.beginPath(); c2.arc(cv.width / 2, cv.height / 2, cv.width / 2, 0, 7); c2.fill(); c2.font = Math.round(cv.width * 0.62) + 'px serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(T.br.icon || '✦', cv.width / 2, cv.height / 2 + 1);
      el.querySelector('.cost').textContent = T.nd.mp; el.dataset.tip = T.nd.name + ' (árvore)\n' + T.nd.desc + '\nMana ' + T.nd.mp + ' · Recarga ' + T.nd.cd / 1000 + 's'; el.classList.add('tree-slot'); }
    else { iconTo(el.querySelector('canvas'), sk.id); el.querySelector('.cost').textContent = sk.mp; el.classList.remove('tree-slot');
      el.dataset.tip = `${sk.name}\n${sk.desc}\nMana ${sk.mp} · Recarga ${sk.cd / 1000}s${sk.cast ? ` · Conjuração ${sk.cast / 1000}s` : ''}${sk.range ? ` · Alcance ${sk.range}` : ''}`; }
    el.onclick = () => castSkill(i);
  });
  iconTo($('pot-hp').querySelector('canvas'), 'hp'); iconTo($('pot-mp').querySelector('canvas'), 'mp');
  if (typeof medalize === 'function') { SKILLS[cls].forEach((sk, i) => { const T = slotTreeNode(i); medalize($('slot' + i), T ? 'tree|' + T.nd.id + '|' + (T.br.icon || '✦') : sk.id); }); medalize($('pot-hp'), 'hp'); medalize($('pot-mp'), 'mp'); medalize($('pot-band'), 'band'); if (!$('btn-attack').querySelector('.medal')) $('btn-attack').insertAdjacentHTML('beforeend', medalSVG('attack')); }
  if ($('pot-band')) $('pot-band').onclick = () => Net.send({ t: 'band' });
  $('pot-hp').onclick = () => drinkPot('hp'); $('pot-mp').onclick = () => drinkPot('mp');
  const p = CLASSES[cls].passive;
  $('passive').dataset.tip = `Aptidão: ${p.name}\n${p.desc}`; $('passive').textContent = p.name;
  const pc = $('portrait'), pctx = pc.getContext('2d');
  pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, pc.width, pc.height); pctx.imageSmoothingEnabled = false;
  const spr = anySprite(cls, G.me.skin, G.me.color, { view: 'S', dir: 1, walk: -1 });
  pctx.imageSmoothingEnabled = true;
  if (R3.ok) { const f = spr.c.width / spr.w; pctx.drawImage(spr.c, 42 * f, 28 * f, 36 * f, 38 * f, 0, 0, pc.width, pc.height); }
  else pctx.drawImage(spr.c, 22, 28, 44, 46, 0, 0, pc.width, pc.height);
}
function startGame() {
  if (G.started) return;
  G.started = true;
  $('lobby').classList.add('hidden');
  $('hud').classList.remove('hidden');
  buildHotbar(); updateHud(); updateQuests(); setupJoystick();
  $('btn-attack').onclick = attackNearest;
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  if (!$('btn-crouch')) { const b = document.createElement('button'); b.id = 'btn-crouch'; b.textContent = '⤓'; b.title = 'Agachar'; document.body.appendChild(b); b.addEventListener('click', () => { G.crouchToggle = !G.crouchToggle; b.classList.toggle('on', G.crouchToggle); }); }
  addChat('', `Bem-vindo a Nae, ${G.me.name}. Chegue perto dos moradores e aperte F para falar. Enter abre o chat, Esc abre o menu.`);

}

// tooltips
const tip = $('tooltip');
document.addEventListener('mouseover', e => {
  if (document.body.classList.contains('touch') || (e.pointerType && e.pointerType !== 'mouse') || matchMedia('(hover: none)').matches) { tip.classList.add('hidden'); return; }
  const el = e.target.closest('[data-tip]');
  if (!el) { tip.classList.add('hidden'); return; }
  const [title, ...rest] = el.dataset.tip.split('\n');
  tip.innerHTML = '';
  const h = document.createElement('b'); h.textContent = title; tip.appendChild(h);
  for (const r of rest) { const d = document.createElement('div'); d.textContent = r; tip.appendChild(d); }
  tip.classList.remove('hidden');
  const r = el.getBoundingClientRect();
  tip.style.left = clamp(r.left + r.width / 2 - 135, 8, window.innerWidth - 278) + 'px';
  tip.style.top = Math.max(8, r.top - tip.offsetHeight - 10) + 'px';
});

// ============================================================
//  LOBBY
// ============================================================
const HERALDRY = ['#8b2e2e', '#2c4a7a', '#3a6b3a', '#5e3a7a', '#8a5a24', '#2a6a64', '#7a2a5a', '#3a3a40'];
let chosenClass = 'knight', chosenSkin = { knight: 'iron', archer: 'scout', mage: 'adept' }, chosenColor = HERALDRY[0];
function randomCode() { const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += ch[Math.floor(Math.random() * ch.length)]; return s; }
function setStatus(text, err) { const s = $('status'); s.textContent = text; s.className = err ? 'err' : ''; }
function lockLobby(b) { for (const el of document.querySelectorAll('#lobby button, #lobby input')) el.disabled = b; }
function helloMsg() {
  const name = $('name').value.trim() || 'Aventureiro';
  const saved = loadChars()[charKey(name, chosenClass)] || {};
  G.myUid = saved.t ? (saved.uid || '') : (G.myUid && G.myUidFor === charKey(name, chosenClass) ? G.myUid : Math.random().toString(36).slice(2, 10)); G.myUidFor = charKey(name, chosenClass);   // herói novo: código único (não herda nada de um herói antigo com o mesmo nome)
  let me = G.started && G.me && !G.me.downed ? G.me : null;   /* reconectando: conta onde estava */
  if (!me) try { const u = JSON.parse(sessionStorage.getItem('nae-upd-pos') || 'null'); sessionStorage.removeItem('nae-upd-pos'); if (u && Date.now() - u.t < 180000 && u.n === name) me = u; } catch (e) { }   /* voltou de uma atualização automática: mesmo lugar */
  return { t: 'hello', ver: VERSION, ...(me ? { px: me.x, py: me.y, pz: me.z || 0, pfl: me.fl || 0, pfb: me.fb ?? -1 } : {}), uid: G.myUid || undefined, wandInfo: saved.wandInfo, cloak: saved.cloak, pw: G.roomPw || undefined, dev: G.devPw || undefined, devMode: G.devMode || 'weaver', name, color: chosenColor, cls: chosenClass, skin: chosenSkin[chosenClass], lvl: saved.lvl, xp: saved.xp, gold: saved.gold, pots: saved.pots, food: saved.food, water: saved.water, infect: saved.infect, tree: saved.tree, prof: saved.prof, feats: saved.feats, freeLimb: saved.freeLimb, shieldHp: saved.shieldHp, use: saved.use, jailLeft: saved.jailLeft || 0, hasSkin: saved.hasSkin, body: saved.body, bleed: saved.bleed, lost: saved.lost, pro: saved.pro, inv: saved.inv, quests: saved.quests, qdone: saved.qdone };
}
// reino trancado: pede a senha e manda o hello de novo pela mesma conexão
function askRoomPw(bad) {
  let d = $('roompw-ask'); if (!d) { d = document.createElement('div'); d.id = 'roompw-ask'; d.className = 'gpanel'; document.body.appendChild(d); }
  d.innerHTML = '<div class="gp-head"><span>🔒 Reino trancado</span></div><div class="est-cost">' + (bad ? '<b style="color:#ff8a7a">Senha errada.</b> ' : '') + 'O anfitrião trancou este reino. Digite a senha para entrar.</div><div class="bk-row"><input id="rpw-in" type="password" maxlength="24" autocomplete="off" placeholder="Senha do reino"><button class="est-btn" id="rpw-ok">Entrar</button><button class="est-btn ghost" id="rpw-no">Voltar</button></div>';
  d.classList.remove('hidden'); const inp = d.querySelector('#rpw-in'); inp.focus();
  const ok = () => { G.roomPw = inp.value.trim(); if (!G.roomPw) return; d.remove(); Net.send(helloMsg()); };
  d.querySelector('#rpw-ok').onclick = ok; inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
  d.querySelector('#rpw-no').onclick = () => { G.leaving = true; location.reload(); };
}
function pzRoomRefresh() {
  const box = $('pz-roompw'); if (!box) return; box.style.display = Net.isHost && !Net.offline ? '' : 'none';
  const st = $('pz-rpw-st'); if (st) st.textContent = G.roomLocked ? '🔒 Trancado: quem chegar precisa da senha.' : '🔓 Aberto: qualquer um entra.';
}
// botão grande da tela inicial: entra no reino aberto (mesma versão, sem senha); se não houver, abre um com você de anfitrião
// ============================================================
//  REINO ÚNICO — todos no mesmo mundo. Quem chega primeiro hospeda; se o anfitrião cair, quem tem o PC mais forte
//  assume (com a última cópia do mundo) e os outros reconectam sozinhos. Tenta entrar para sempre, sem desistir.
// ============================================================
const WN = { tries: 0, lostT: 0, rank: -1, succ: [], busy: false, id: (new URLSearchParams(location.search).get('mundo') || ('W' + String(VERSION).replace(/[^0-9]/g, ''))).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'WORLD' };   // (?mundo=XYZ só para testes)
const myHostScore = () => (typeof pcSpecs === 'function' ? pcSpecs().score : 60) + Math.min(60, G.fps || 30);
function netMsg(t) { let d = $('netbar'); if (!d) { d = document.createElement('div'); d.id = 'netbar'; document.body.appendChild(d); } d.textContent = t; d.classList.toggle('on', !!t); if (!G.started) setStatus(t); }
function enterWorld() {
  if (!$('name').value.trim()) { setStatus('Crie ou escolha um herói em Personagens.', true); return; }
  lockLobby(true); WN.tries = 0; WN.rank = -1; worldTry();
}
function worldRetry() { const ms = Math.min(15000, 1000 * Math.pow(2, Math.min(4, WN.tries - 1))) + Math.random() * 500; netMsg('Sem conexão com o reino. Tentando de novo em ' + Math.round(ms / 1000) + ' s… (tentativa ' + WN.tries + ')'); setTimeout(worldTry, ms); }
function worldTry() {
  if (WN.busy || Net.isHost) return;   /* já é o anfitrião (ou já está tentando): não derruba nada */
  WN.busy = true; WN.tries++; netMsg(G.started ? 'Reconectando ao reino… (tentativa ' + WN.tries + ')' : 'Entrando no reino de Nae…' + (WN.tries > 1 ? ' (tentativa ' + WN.tries + ')' : ''));
  Net.reset(); Net.onServer = m => { WN.lastMsg = Date.now(); clientOnServer(m); }; Net.onDisconnected = worldLost;
  Net.join(WN.id, err => {
    WN.busy = false;
    if (!err) { WN.tries = 0; WN.unav = 0; WN.lastMsg = Date.now(); WN.inWorld = true; netMsg(''); showRoom('Nae'); Net.send(helloMsg()); setTimeout(() => Net.send({ t: 'pcs', s: myHostScore() }), 1500); return; }
    const mayHost = !G.started || Date.now() - WN.lostT >= WN.rank * 4000;   // na migração, cada um espera a sua vez (o PC mais forte primeiro)
    if (err.type === 'peer-unavailable' && mayHost) { if (G.started && ++WN.unav < 3) { netMsg('Procurando o anfitrião… (' + WN.unav + ')'); setTimeout(worldTry, 2500); return; } WN.unav = 0; worldHost(); return; }   /* só assume se o anfitrião sumir de verdade (3 tentativas) */
    worldRetry();
  });
}
// versão publicada no site (lida do index.html): quem estiver com uma versão velha atualiza antes de virar anfitrião, e todos conferem a cada 3 min
function liveVersion(cb) { if (location.protocol === 'file:') { cb(null); return; } fetch('index.html?nv=' + Date.now(), { cache: 'no-store' }).then(r => r.text()).then(t => { const m = new RegExp('[?]v=([0-9]+[.][0-9]+[.][0-9]+)').exec(t); cb(m ? 'v' + m[1] : null); }).catch(() => cb(null)); }
function saveUpdPos() { try { const me = G.me; if (G.started && me && !me.downed) sessionStorage.setItem('nae-upd-pos', JSON.stringify({ x: me.x, y: me.y, z: me.z || 0, fl: me.fl || 0, fb: me.fb ?? -1, n: $('name').value.trim(), t: Date.now() })); } catch (e) { } G.leaving = true; }
function updateNow(v) { saveUpdPos(); netMsg('Nova versão do jogo (' + v + '). Atualizando…'); if (Net.isHost && typeof worldBroadcast === 'function') worldBroadcast(); try { if (typeof saveChar === 'function' && G.me) saveChar(); } catch (e) { } setTimeout(() => location.replace(location.pathname + '?v=' + Date.now()), 1500); }
setInterval(() => liveVersion(v => { if (v && verNum(v) > verNum(VERSION)) updateNow(v); }), 180000);
// tarefas longas da página (mais de 200 ms): o desenho e o carregamento de regiões travam também o servidor e a rede
const LONGT = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.duration >= 200) { LONGT.push([Date.now(), Math.round(e.duration)]); if (LONGT.length > 200) LONGT.shift(); } }).observe({ entryTypes: ['longtask'] }); } catch (e) { }
function worldHost() {
  if (!WN.verOk) { WN.busy = true; liveVersion(v => { WN.busy = false; WN.verOk = true; setTimeout(() => { WN.verOk = false; }, 60000); if (v && verNum(v) > verNum(VERSION)) { updateNow(v); return; } worldHost(); }); return; }   /* confere a versão antes de cada vez que vira anfitrião */
  WN.busy = true; Net.reset(); Net.onClient = hostOnClient; Net.onServer = clientOnServer; Net.onPeerLeave = hostOnLeave;
  Net.host(WN.id, err => {
    WN.busy = false;
    if (err) { if (err.type === 'unavailable-id') { setTimeout(worldTry, 400 + Math.random() * 600); return; } worldRetry(); return; }   // alguém foi mais rápido: entra no reino dele
    if (G.started) { S.players = {}; S.monsters = {}; S.filled = false; S.estate = null; S.bank = null; S.npcs = null; S.arrows = []; HOTEL_R = null; G.players = {}; G.monsters = {}; }   // assume com a última cópia do mundo
    Net.infoFn = () => ({ name: (S.players[Net.myId] || {}).name || 'Nae', n: Object.keys(S.players).length, ver: VERSION, lock: !!S.roomPw });
    WN.inWorld = true; startHostLoop(); hostTick(); showRoom('Nae'); netMsg(''); Net.send(helloMsg());
    if (G.started) showToast('O anfitrião saiu: agora o reino roda no seu computador.');
  });
}
// vigia: o aviso de conexão fechada às vezes não chega; se o anfitrião ficar 6 s sem mandar nada, ele caiu
// se o próprio jogo travou (gerando terreno longe da cidade, aba em segundo plano), não conta como queda; antes de desistir, pergunta ao anfitrião e espera a resposta
setInterval(() => {
  const now = Date.now(), gap = now - (WN.wdT || now); WN.wdT = now;
  if (gap > 2500) { WN.lastMsg = now; WN.pingT = 0; return; }
  if (!WN.inWorld || !G.started || Net.isHost || WN.busy || !WN.lastMsg) return;
  const q = now - WN.lastMsg; if (q < 5000) { WN.pingT = 0; return; }
  if (!WN.pingT) { WN.pingT = now; Net.send({ t: 'ping' }); return; }
  if (q > 12000 && now - WN.pingT > 6000 && now - WN.lostT > 8000) { WN.pingT = 0; worldLost(); }
}, 1000);
function worldLost() {
  if (RLM.code) { realmLost(); return; }   /* reinos: sem troca de anfitrião */
  if (Net.isHost || WN.busy || (Date.now() - WN.lostT < 3000)) return; const i = WN.succ.indexOf(Net.myId); WN.rank = i < 0 ? 12 : i; WN.lostT = Date.now(); WN.tries = 0;
  netMsg('O anfitrião saiu. Reconectando…'); setTimeout(worldTry, 600 + Math.random() * 600);
}
function verNum(v) { return String(v || '').replace(/^v/, '').split('.').map(x => +x || 0).reduce((a, x) => a * 1000 + x, 0); }
function quickEnter(btn) {
  if (!$('name').value.trim()) { setStatus('Crie ou escolha um herói em Personagens.', true); return; }
  { const b = document.getElementById('nae-contb'); if (b) { b.click(); return; } }   /* abre a tela de Reinos Online */
  devGate(() => realmCreate({})); return;
  const old = btn.textContent; btn.disabled = true; btn.textContent = 'Procurando o reino...';
  const go = list => { btn.disabled = false; btn.textContent = old; const s = (list || []).find(r => !r.lock && (!r.ver || r.ver === VERSION)); if (s) { $('code').value = s.code; devGate(joinRoom); } else devGate(() => createRoom()); };
  const L = typeof LIFE !== 'undefined' && LIFE.lastScan; if (L && Date.now() - L.t < 15000) go(L.list); else Net.scan(list => { if (typeof LIFE !== 'undefined') LIFE.lastScan = { t: Date.now(), list }; go(list); });
}
// ============================================================
//  REINOS — cada anfitrião abre o seu (nome, senha opcional, mundo novo ou um mundo guardado).
//  Se o anfitrião sair, o reino fecha e todos voltam para a lista; o mundo fica guardado com quem jogava.
// ============================================================
const RLM = { code: null, tries: 0, closing: false, name: '' };
const WORLDS_KEY = 'nae-worlds-v1';
function worldsIndex() { try { return JSON.parse(localStorage.getItem(WORLDS_KEY) || '{}'); } catch (e) { return {}; } }
function worldsSave(ix) { try { localStorage.setItem(WORLDS_KEY, JSON.stringify(ix)); } catch (e) { } }
function worldPre(id) { return id === 'legacy' ? '' : 'nae-w-' + id + ':'; }
function worldTouch(id, name, host, own) { const ix = worldsIndex(), o = ix[id] || {}; ix[id] = { n: name || o.n || 'Nae', t: Date.now(), h: host || o.h || '', own: own == null ? !!o.own : !!own || !!o.own }; worldsSave(ix); }
function worldsList() { const ix = worldsIndex(), L = Object.entries(ix).map(([id, w]) => ({ id, ...w })); try { if (!ix.legacy && localStorage.getItem('nae-world-estate-v1')) L.push({ id: 'legacy', n: 'Mundo do reino único (até a v1.66)', t: 0, h: '', own: true }); } catch (e) { } return L.sort((a, b) => b.t - a.t); }
function worldDelete(id) { try { const pre = worldPre(id); if (pre) for (const k of Object.keys(localStorage)) if (k.startsWith(pre)) localStorage.removeItem(k); const ix = worldsIndex(); delete ix[id]; worldsSave(ix); } catch (e) { } }
function realmCreate(opt) {   /* opt: { name, pw, wid } — wid vazio = mundo novo */
  if (!$('name').value.trim()) { setStatus('Escolha um herói ou crie um novo.', true); return; }
  const hero = $('name').value.trim(), wid = opt.wid || ('w' + Date.now().toString(36) + randomCode().toLowerCase());
  S.wid = wid; S.wname = (opt.name || '').trim().slice(0, 28) || 'Reino de ' + hero; HOSTSTORE.pre = worldPre(wid); RLM.name = S.wname;
  S.estate = null; S.bank = null; S.obsH = null; S.heat = null; S.roomPw = opt.pw ? String(opt.pw).trim().toUpperCase().slice(0, 24) : null;
  worldTouch(wid, S.wname, hero, true);
  liveVersion(v => { if (v && verNum(v) > verNum(VERSION)) { updateNow(v); return; } createRoom('S1'); });
}
function realmJoin(code) { RLM.code = String(code || '').trim().toUpperCase(); if (!RLM.code) { setStatus('Digite o código do reino.', true); return; } $('code').value = RLM.code; joinRoom(); }
function realmLost() {
  if (RLM.closing || Net.isHost) return; if (RLM.busy) return; RLM.busy = true; RLM.tries = 0; WN.lostT = Date.now(); netMsg('A conexão com o reino caiu. Tentando voltar…'); setTimeout(realmRetry, 800);
}
function realmRetry() {
  RLM.tries++; Net.reset(); Net.onServer = m => { WN.lastMsg = Date.now(); clientOnServer(m); }; Net.onDisconnected = realmLost;
  Net.join(RLM.code, err => {
    if (!err) { RLM.busy = false; RLM.tries = 0; WN.lastMsg = Date.now(); netMsg(''); Net.send(helloMsg()); return; }
    if (RLM.tries < 4) { netMsg('A conexão com o reino caiu. Tentando voltar… (' + RLM.tries + ')'); setTimeout(realmRetry, 2500 * RLM.tries); return; }
    realmClosed();
  });
}
function realmClosed() {
  RLM.closing = true; try { if (typeof saveChar === 'function') saveChar(); } catch (e) { }
  try { sessionStorage.setItem('nae-realm-msg', 'O reino ' + (RLM.name ? '“' + RLM.name + '” ' : '') + 'fechou: o anfitrião saiu. O mundo ficou guardado com você: dá para reabri-lo em “Criar reino”.'); } catch (e) { }
  G.leaving = true; location.reload();
}
function showRoom(code) { $('room-code').textContent = Net.offline ? 'offline' : code; pzRoomRefresh(); }
function createRoom(code = 'S1', tries = 0) {
  if (!$('name').value.trim()) { setStatus('Escolha um nome para seu herói.', true); $('name').focus(); return; }
  lockLobby(true); setStatus('Erguendo o reino...');
  Net.onClient = hostOnClient; Net.onServer = clientOnServer; Net.onPeerLeave = hostOnLeave;
  Net.host(code, err => {
    if (err) {
      if (err.type === 'unavailable-id' && tries < Net.SLOTS + 3) { const sl = /^S(\d+)$/.exec(code); createRoom(sl && +sl[1] < Net.SLOTS ? 'S' + (+sl[1] + 1) : randomCode(), tries + 1); return; }
      setStatus('Não foi possível criar a sala: ' + (err.type || err), true); lockLobby(false); return;
    }
    Net.infoFn = () => ({ name: (S.players[Net.myId] || {}).name || $('name').value.trim() || 'Aventureiro', realm: S.wname || '', n: Object.keys(S.players).length, ver: VERSION, lock: !!S.roomPw });
    startHostLoop(); hostTick(); showRoom(code); Net.send(helloMsg()); RLM.code = code; RLM.host = true;
    if (G.devPw) setTimeout(() => { if (!G.devAnswered) showToast('O pedido de criador não foi respondido. Recarregue a página (Ctrl+F5) e tente de novo.'); }, 6000);
  });
}
function joinRoom() {
  if (!$('name').value.trim()) { setStatus('Escolha um nome para seu herói.', true); $('name').focus(); return; }
  const code = $('code').value.trim().toUpperCase();
  if (!code) { setStatus('Digite o código da sala.', true); return; }
  lockLobby(true); setStatus('Cavalgando até o reino ' + code + '...'); RLM.code = code;
  Net.onServer = m => { WN.lastMsg = Date.now(); clientOnServer(m); }; WN.inWorld = true; WN.lastMsg = Date.now();
  Net.onDisconnected = realmLost;
  Net.join(code, err => {
    if (err) {
      const msg = err.type === 'peer-unavailable' ? 'Sala não encontrada. Confira o código (quem criou precisa estar com o jogo aberto).'
        : err.type === 'timeout' ? 'Tempo esgotado. A rede pode estar bloqueando a conexão direta.'
        : err.type === 'no-peerjs' ? 'Não foi possível carregar a biblioteca de rede (sem internet?).' : 'Erro: ' + (err.type || err);
      setStatus(msg, true); lockLobby(false); return;
    }
    showRoom(code); Net.send(helloMsg());
  });
}

const previews = [];
function drawClassPreviews(now) {
  for (const { cls, c } of previews) {
    const pctx = c.getContext('2d');
    pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, c.width, c.height); pctx.imageSmoothingEnabled = false;
    const sel = cls === chosenClass, cyc = (now / 1000) % 8;
    const dirs = ['S', 'E', 'N', 'W'], view = sel ? dirs[Math.floor(cyc / 2) % 4] : 'S';
    const atkK = { knight: ['swing', 'bash', 'warcry'], archer: ['shoot', 'pierce', 'rain'], mage: ['bolt', 'fireball', 'meteor'] }[cls][Math.floor(now / 8000) % 3];
    const inAtk = sel && (cyc % 2) > 1.4;
    const P = { view: view === 'W' ? 'E' : view, dir: R3.ok ? (sel ? Math.floor(now / 1000) % 8 : 1) : undefined, walk: sel && !inAtk ? Math.floor(now / 70) % 12 : -1, act: inAtk ? { k: atkK, f: Math.min(11, Math.floor(((cyc % 2) - 1.4) / 0.6 * 12)) } : null };
    const spr = anySprite(cls, chosenSkin[cls], chosenColor, P);
    const k = R3.ok ? 1.0 : 1.3;
    pctx.imageSmoothingEnabled = !!R3.ok;
    pctx.save();
    pctx.translate(c.width / 2, c.height - 4);
    if (view === 'W' && !R3.ok) pctx.scale(-1, 1);
    pctx.drawImage(spr.c, -spr.ax * k, -spr.ay * k, spr.w * k, spr.h * k);
    pctx.restore();
  }
}
// nível do personagem salvo com este nome e vocação (para liberar skins)
function lobbyLvl(cls) { const nm = ($('name').value || '').trim().toLowerCase(); let l = 1; for (const ch of Object.values(loadChars())) if (ch.cls === cls && (ch.name || '').toLowerCase() === nm) l = Math.max(l, ch.lvl | 0); return l; }
function refreshSkinLocks() {
  document.querySelectorAll('.class-card').forEach(card => {
    const cls = card.dataset.cls, lv = lobbyLvl(cls);
    card.querySelectorAll('.skin').forEach(el => { const si = +el.dataset.si; el.classList.toggle('locked', lv < SKIN_LVL[si]); });
    const cur = SKINS[cls].findIndex(s => s.id === chosenSkin[cls]); if (cur > 0 && lv < SKIN_LVL[cur]) { chosenSkin[cls] = SKINS[cls][0].id; card.querySelectorAll('.skin').forEach((el, i) => el.classList.toggle('sel', i === 0)); }
  });
}
function buildLobby() {
  $('version').textContent = `${GAME_NAME} ${VERSION} · ${VERSION_NAME}`;
  const box = $('classes');
  for (const [cls, c] of Object.entries(CLASSES)) {
    const card = document.createElement('div');
    card.className = 'class-card' + (cls === chosenClass ? ' sel' : ''); card.dataset.cls = cls;
    const cv = document.createElement('canvas'); cv.width = 132; cv.height = 150; previews.push({ cls, c: cv });
    const h = document.createElement('h3'); h.textContent = c.name;
    const role = document.createElement('div'); role.className = 'role'; role.textContent = c.role;
    const skins = document.createElement('div'); skins.className = 'skins';
    for (const s of SKINS[cls]) {
      const b = document.createElement('button');
      b.className = 'skin ' + s.rarity.toLowerCase().replace('á', 'a').replace('ê', 'e') + (chosenSkin[cls] === s.id ? ' sel' : '');
      const si = SKINS[cls].indexOf(s); b.dataset.si = si; b.dataset.lvl = 'nv. ' + SKIN_LVL[si];
      b.textContent = s.name; b.dataset.tip = `${s.name}\nRaridade: ${s.rarity}${si ? `\nLibera no nível ${SKIN_LVL[si]}` : ''}`;
      b.onclick = ev => { ev.stopPropagation(); if (lobbyLvl(cls) < SKIN_LVL[si]) { showToast(`Esta skin libera no nível ${SKIN_LVL[si]}.`); return; } chosenSkin[cls] = s.id; chosenClass = cls; for (const el of skins.children) el.classList.toggle('sel', el === b); selectClass(cls); };
      skins.appendChild(b);
    }
    const desc = document.createElement('p'); desc.textContent = c.desc;
    const stats = document.createElement('div'); stats.className = 'stats';
    for (const [k, v] of Object.entries(c.stats)) {
      const row = document.createElement('div'), lab = document.createElement('span'), pips = document.createElement('i');
      lab.textContent = k;
      for (let n = 0; n < 5; n++) { const s2 = document.createElement('b'); if (n < v) s2.className = 'on'; pips.appendChild(s2); }
      row.append(lab, pips); stats.appendChild(row);
    }
    const sk = document.createElement('div'); sk.className = 'skills';
    for (const s of SKILLS[cls]) {
      const ic = document.createElement('canvas'); ic.width = 36; ic.height = 36;
      const ictx = ic.getContext('2d'); ictx.imageSmoothingEnabled = false; { const ic = iconSprite(s.id); ictx.drawImage(ic.c, 0, 0, ic.w, ic.h, 0, 0, 36, 36); }
      ic.dataset.tip = `${s.name}\n${s.desc}\nMana ${s.mp} · Recarga ${s.cd / 1000}s`;
      sk.appendChild(ic);
    }
    const pas = document.createElement('div'); pas.className = 'passive-line';
    pas.textContent = '✦ ' + c.passive.name; pas.dataset.tip = `Aptidão: ${c.passive.name}\n${c.passive.desc}`;
    card.append(cv, h, role, skins, desc, stats, sk, pas);
    card.onclick = () => selectClass(cls);
    box.appendChild(card);
  }
  const sw = $('swatches');
  for (const col of HERALDRY) {
    const b = document.createElement('button');
    b.className = 'swatch' + (col === chosenColor ? ' sel' : ''); b.style.background = col; b.title = 'Cor do brasão'; b.dataset.col = col;
    b.onclick = () => { chosenColor = col; for (const el of sw.children) el.classList.toggle('sel', el === b); };
    sw.appendChild(b);
  }
  renderSavedChars();
  const chars = Object.values(loadChars()).sort((a, b) => (b.t || 0) - (a.t || 0));
  $('name').addEventListener('input', () => { updateSavedInfo(); refreshSkinLocks(); });
  refreshSkinLocks();
  const urlCode = new URLSearchParams(location.search).get('sala');
  if (urlCode) $('code').value = urlCode.toUpperCase();
  $('btn-create').onclick = () => devGate(() => realmCreate({}));
  $('pz-rpw-lock').onclick = () => { const v = $('pz-rpw').value.trim(); if (!v) { showToast('Digite uma senha para trancar.'); return; } Net.send({ t: 'roompw', pw: v }); };
  $('pz-rpw-open').onclick = () => { $('pz-rpw').value = ''; Net.send({ t: 'roompw', pw: '' }); };
  $('btn-join').onclick = () => devGate(() => realmJoin($('code').value));
  $('code').addEventListener('keydown', e => { if (e.key === 'Enter') devGate(joinRoom); });
  $('btn-copy').onclick = () => { const link = location.origin + location.pathname + '?sala=' + Net.room; navigator.clipboard.writeText(link).then(() => showToast('Convite copiado. Mande para seus amigos.'), () => showToast(link)); };
  $('btn-help').onclick = () => $('help').classList.toggle('hidden');
  if (chars[0]) pickChar(chars[0]);   // abre com o último herói (nome, classe e cor)
  updateSavedInfo();
}
function selectClass(cls) {
  chosenClass = cls;
  for (const el of document.querySelectorAll('.class-card')) el.classList.toggle('sel', el.dataset.cls === cls);
  updateSavedInfo();
}
// lista de heróis salvos: todos, com escolher, apagar (confirma na própria linha) e "Novo personagem"
function pickChar(ch) {
  $('name').value = ch.name; if (ch.skin) chosenSkin[ch.cls] = ch.skin; chosenColor = ch.color || chosenColor;
  for (const el of $('swatches').children) el.classList.toggle('sel', el.dataset.col === chosenColor);
  selectClass(ch.cls);
  document.querySelectorAll('.class-card').forEach(card => { if (card.dataset.cls === ch.cls) card.querySelectorAll('.skin').forEach((el, i) => el.classList.toggle('sel', SKINS[ch.cls][i].id === chosenSkin[ch.cls])); });
  refreshSkinLocks(); updateSavedInfo(); if (window.naeQuick) window.naeQuick();
}
function renderSavedChars() {
  const sv = $('saved'); if (!sv) return; sv.innerHTML = ''; sv.classList.remove('hidden');
  const nb = document.createElement('button'); nb.className = 'saved-new'; nb.textContent = '＋ Novo personagem';
  nb.onclick = () => { $('name').value = ''; chosenColor = HERALDRY[0]; for (const el of $('swatches').children) el.classList.toggle('sel', el.dataset.col === chosenColor); selectClass('knight'); refreshSkinLocks(); updateSavedInfo(); if (window.naeQuick) window.naeQuick(); $('name').focus(); };
  sv.appendChild(nb);
  const all = loadChars(), list = Object.entries(all).filter(([, ch]) => CLASSES[ch.cls]).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
  for (const [key, ch] of list) {
    const row = document.createElement('div'); row.className = 'saved-row';
    const b = document.createElement('button'); b.className = 'saved-char'; b.textContent = `${ch.name} · ${CLASSES[ch.cls].name} nv. ${ch.lvl || 1}`; b.onclick = () => pickChar(ch);
    const del = document.createElement('button'); del.className = 'saved-del'; del.title = 'Apagar este herói'; del.textContent = '🗑';
    del.onclick = () => {
      row.innerHTML = ''; const q = document.createElement('span'); q.className = 'saved-ask'; q.textContent = 'Apagar ' + ch.name + ' para sempre?';
      const yes = document.createElement('button'); yes.className = 'saved-del yes'; yes.textContent = 'Apagar';
      const no = document.createElement('button'); no.className = 'saved-del'; no.textContent = 'Cancelar';
      yes.onclick = () => { const A = loadChars(); delete A[key]; try { localStorage.setItem(SAVE_KEY, JSON.stringify(A)); } catch (e) { } if ($('name').value.trim().toLowerCase() === ch.name.trim().toLowerCase()) $('name').value = ''; renderSavedChars(); updateSavedInfo(); if (window.naeQuick) window.naeQuick(); };
      no.onclick = () => renderSavedChars();
      row.append(q, yes, no);
    };
    row.append(b, del); sv.appendChild(row);
  }
}
function updateSavedInfo() {
  const name = $('name').value.trim(), s = name && loadChars()[charKey(name, chosenClass)];
  $('saved-info').textContent = s ? `Continuar: ${s.name}, ${CLASSES[s.cls].name} nível ${s.lvl} (${s.gold || 0} ouro)` : name ? `Novo herói: ${name}, ${CLASSES[chosenClass].name}` : '';
}

buildLobby();
requestAnimationFrame(frame);

// ============================================================
//  NÉVOA DO MAPA (o que você já explorou) e MAPA DO MUNDO (M)
// ============================================================
const FOG_R = 13;
function fogKey() { return 'nae-fog-' + MAP_W + '-' + ((G.me && G.me.name) || 'x'); }
function loadFog() {
  G.fog = new Uint8Array(MAP_W * MAP_H);
  try { const s = localStorage.getItem(fogKey()); if (s) { const bin = atob(s); for (let i = 0; i < MAP_W * MAP_H; i++) if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) G.fog[i] = 1; } } catch (e) { }
  G.fogDirty = true; G.fogT = 0;
}
function saveFog() {
  try { const bytes = new Uint8Array(MAP_W * MAP_H / 8); for (let i = 0; i < MAP_W * MAP_H; i++) if (G.fog[i]) bytes[i >> 3] |= 1 << (i & 7); let s = ''; for (const b of bytes) s += String.fromCharCode(b); localStorage.setItem(fogKey(), btoa(s)); } catch (e) { }
}
function revealFog(x, y) {
  if (!G.fog || G.fogKeyName !== fogKey()) { G.fogKeyName = fogKey(); loadFog(); }
  const tx = Math.round(x), ty = Math.round(y);
  if (tx === G.fogTx && ty === G.fogTy) return;
  G.fogTx = tx; G.fogTy = ty;
  for (let dy = -FOG_R; dy <= FOG_R; dy++) for (let dx = -FOG_R; dx <= FOG_R; dx++) {
    if (dx * dx + dy * dy > FOG_R * FOG_R || !inBounds(tx + dx, ty + dy)) continue;
    const i = (ty + dy) * MAP_W + tx + dx; if (!G.fog[i]) { G.fog[i] = 1; G.fogDirty = true; }
  }
  const now = performance.now();
  if (G.fogDirty && now - G.fogT > 4000) { G.fogT = now; saveFog(); }
}
// camada de névoa (pergaminho onde não foi explorado), com bordas suaves
function fogLayer() {
  if (!G.fog) return null;
  if (G.fogCanvas && !G.fogDirty) return G.fogCanvas;
  const c = G.fogCanvas || (G.fogCanvas = document.createElement('canvas')); c.width = MAP_W; c.height = MAP_H;
  const x = c.getContext('2d'), img = x.createImageData(MAP_W, MAP_H);
  for (let i = 0; i < MAP_W * MAP_H; i++) { const n = hash2(i % MAP_W, i / MAP_W | 0, 9) * 18; img.data[i * 4] = 196 + n; img.data[i * 4 + 1] = 176 + n; img.data[i * 4 + 2] = 134 + n; img.data[i * 4 + 3] = G.fog[i] ? 0 : 255; }
  x.putImageData(img, 0, 0);
  G.fogDirty = false;
  return c;
}
// nomes das regiões no mapa: setores pelo centro; anéis em 4 pontos ao redor da cidade
const ZONE_LABELS = (() => {
  const acc = {}, out = [];
  for (let y = 0; y < MAP_H; y += 2) for (let x = 0; x < MAP_W; x += 2) { const z = WORLD.zone[y * MAP_W + x], g = WORLD.ground[y * MAP_W + x]; if (g === T.WATER) continue; const a = acc[z] || (acc[z] = [0, 0, 0]); a[0] += x; a[1] += y; a[2]++; }
  const ring = { [Z.OUTSKIRTS]: 50, [Z.FIELDS]: 72, [Z.WILD]: 114 };
  for (const [z, a] of Object.entries(acc)) {
    if (+z === Z.VILLAGE) continue;
    if (ring[z]) for (let k = 0; k < 4; k++) { const an = Math.PI / 4 + k * Math.PI / 2 + 0.35, x = C + Math.cos(an) * ring[z], y = C + Math.sin(an) * ring[z]; if (inBounds(Math.round(x), Math.round(y)) && WORLD.zone[Math.round(y) * MAP_W + Math.round(x)] === +z) out.push({ z: +z, x, y }); }
    else out.push({ z: +z, x: a[0] / a[2], y: a[1] / a[2] });
  }
  return out;
})();
function toggleWorldMap() {
  if (typeof gmToggle === 'function') { gmToggle('map'); return; }
  G.mapOpen = !G.mapOpen;
  $('worldmap').classList.toggle('hidden', !G.mapOpen);
  if (G.mapOpen) drawWorldMap();
}
function drawWorldMap() {
  if (!G.mapOpen || !G.me) return;
  const cv = $('wm-canvas'), size = Math.min(innerWidth, innerHeight) * 0.86, dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = size * dpr; cv.height = size * dpr; cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const V = wmView(size), s = V.s, P = V.P; G.mapSize = size;
  x.save(); x.translate(size / 2, size / 2); x.rotate(Math.PI / 4); x.scale(s, s); x.translate(-V.cx, -V.cy);
  x.imageSmoothingEnabled = false; x.drawImage(MINI, 0, 0);
  x.imageSmoothingEnabled = true; const f = fogLayer(); if (f) { x.filter = 'blur(1.5px)'; x.drawImage(f, 0, 0); x.filter = 'none'; }
  x.restore();
  // tom de pergaminho por cima de tudo
  x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(230,205,160,0.55)'; x.fillRect(0, 0, size, size); x.globalCompositeOperation = 'source-over';
  const seen = (wx, wy) => G.fog && G.fog[Math.round(wy) * MAP_W + Math.round(wx)];
  x.textAlign = 'center'; x.textBaseline = 'middle';
  // sem nomes: pontos de interesse já descobertos ganham um "X" (bastiões, covil do dragão, lojas e serviços, portões)
  const mark = (wx, wy, big) => { const [px, py] = P(wx, wy), r = big ? 7 : 5; x.lineCap = 'round'; for (const [w, c] of [[big ? 6 : 5, 'rgba(240,226,190,0.9)'], [big ? 3 : 2.4, big ? '#8a1a10' : '#4a2e14']]) { x.lineWidth = w; x.strokeStyle = c; x.beginPath(); x.moveTo(px - r, py - r); x.lineTo(px + r, py + r); x.moveTo(px + r, py - r); x.lineTo(px - r, py + r); x.stroke(); } };
  for (const B of BASTIONS) if (seen(B.x, B.y)) mark(B.x, B.y, true);
  // lugares da cidade: ícones pequenos e simples na porta (passe o mouse para ver o nome)
  G.mapIcons = []; const R = V.z >= 2.5 ? 7 : V.z >= 1.5 ? 5.5 : 4;
  BUILDINGS.forEach((b, bi) => { const ic = mapIconOf(b, bi); if (!ic) return; const [dx, dy] = doorTile(b); if (!seen(dx, dy) && !G.dev) return; const [px, py] = P(dx, dy); if (px < -10 || py < -10 || px > size + 10 || py > size + 10) return; mapIcon(x, ic, px, py, R); G.mapIcons.push({ px, py, name: (b.name || (ic === 'home' ? 'Sua casa' : '')) }); });
  if (G.mapHover) { const h = G.mapHover; x.font = '700 12px "Alegreya Sans SC", sans-serif'; const w = x.measureText(h.name).width + 12; x.fillStyle = 'rgba(42,26,10,0.88)'; x.fillRect(h.px - w / 2, h.py - R - 22, w, 17); x.fillStyle = '#f4e4b8'; x.fillText(h.name, h.px, h.py - R - 13); }
  for (const gt of WORLD.gates) { const gx = (gt.x0 + gt.x1) / 2, gy = gt.vert ? (gt.y0 + gt.y) / 2 : gt.y; if (gt.kind !== 'keep' && seen(gx, gy)) mark(gx, gy, false); }
  // jogadores: todos do reino (os longe vêm da lista que o anfitrião manda a cada 2 s)
  const pl = {}; for (const [id, x, y, name, dv] of G.pmap || []) if (!dv || G.dev) pl[id] = { rx: x, ry: y, name };
  for (const id in G.players) { const e = G.players[id]; if (e.visible || id === G.myId) pl[id] = e; }
  for (const id in pl) {
    const e = pl[id];
    const [px, py] = P(e.rx, e.ry), me = id === G.myId;
    x.beginPath(); x.arc(px, py, me ? 6 : 4.5, 0, 7); x.fillStyle = me ? '#c8281e' : '#2a5ab8'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#f4e8c8'; x.stroke();
    x.font = '600 11px "Alegreya Sans SC", sans-serif'; x.fillStyle = '#2a1a0a'; x.fillText(e.name, px, py - 12);
  }
}

// portões: abrem sozinhos quando alguém se aproxima e fecham depois
function updateGates(dt) {
  G.gateF = G.gateF || WORLD.gates.map(() => 0);
  WORLD.gates.forEach((gt, k) => {
    const cx = (gt.x0 + gt.x1) / 2, cy = gt.vert ? (gt.y0 + gt.y) / 2 : gt.y, hx = gt.vert ? 4.5 : 4 + (gt.x1 - gt.x0) / 2, hy = gt.vert ? 4 + (gt.y - gt.y0) / 2 : 4.5;
    let near = false;
    for (const id in G.players) { const e = G.players[id]; if ((e.visible || id === G.myId) && (e.z || 0) < 0.5 && Math.abs(e.rx - cx) < hx && Math.abs(e.ry - cy) < hy) near = true; }
    const tgt = near ? 1 : 0;
    G.gateF[k] = clamp(G.gateF[k] + Math.sign(tgt - G.gateF[k]) * dt / 0.9, 0, 1);
  });
}

// ============================================================
//  MENU DE PAUSA E CONFIGURAÇÕES
// ============================================================
function applySettings() {
  canvas.style.filter = SET.bright !== 1 ? 'brightness(' + SET.bright + ')' : '';
  { const c = $('chat'), m = SET.chat || 'fade'; if (c) { c.classList.toggle('fade', m === 'fade'); c.classList.toggle('off', m === 'off'); } for (const b of document.querySelectorAll('#pz-chat button')) b.classList.toggle('on', b.dataset.c === m); }
  { G.intMode = SET.intMode || 'fade'; for (const b of document.querySelectorAll('#pz-int button')) b.classList.toggle('on', b.dataset.i === G.intMode); }
  if (typeof S3 !== 'undefined' && S3.ok) S3.renderer.shadowMap.enabled = qLevelNow() >= 2;
  for (const b of document.querySelectorAll('#pz-quality button')) b.classList.toggle('on', b.dataset.q === SET.quality);
  $('pz-bright').value = SET.bright; $('pz-bright-v').textContent = Math.round(SET.bright * 100) + '%';
  $('pz-zoom').value = SET.zoom; $('pz-zoom-v').textContent = Math.round(SET.zoom * 100) + '%';
  for (const b of document.querySelectorAll('#pz-phys button')) b.classList.toggle('on', b.dataset.p === (SET.phys || 'ragdoll'));
  for (const b of document.querySelectorAll('#pz-tele button')) b.classList.toggle('on', b.dataset.t === (SET.tele || 'soft'));
  for (const b of document.querySelectorAll('#pz-duel button')) b.classList.toggle('on', (b.dataset.d === '1') === !!SET.duel);
  if ($('duelicon')) $('duelicon').classList.toggle('hidden', !SET.duel);
  document.documentElement.style.setProperty('--pad', SET.pad); $('pz-pad').value = SET.pad; $('pz-pad-v').textContent = Math.round(SET.pad * 100) + '%';
}
for (const b of document.querySelectorAll('#pz-tele button')) b.addEventListener('click', () => { SET.tele = b.dataset.t; saveSettings(); applySettings(); });
for (const b of document.querySelectorAll('#pz-duel button')) b.addEventListener('click', () => { SET.duel = b.dataset.d === '1'; saveSettings(); applySettings(); Net.send({ t: 'duel', on: SET.duel ? 1 : 0 }); showToast(SET.duel ? 'Modo duelo LIGADO: outros jogadores em duelo podem te atingir fora da cidade.' : 'Modo duelo desligado.'); });
for (const b of document.querySelectorAll('#pz-phys button')) b.addEventListener('click', () => { SET.phys = b.dataset.p; saveSettings(); applySettings(); });
for (const b of document.querySelectorAll('#pz-chat button')) b.addEventListener('click', () => { SET.chat = b.dataset.c; saveSettings(); applySettings(); });
for (const b of document.querySelectorAll('#pz-int button')) b.addEventListener('click', () => { SET.intMode = b.dataset.i; saveSettings(); applySettings(); });
$('pz-pad').addEventListener('input', e => { SET.pad = +e.target.value; saveSettings(); applySettings(); });
function togglePause(force) {
  if (typeof gmToggle === 'function') { if (force === false) gmClose(); else if (force === true) gmOpen(); else gmToggle(); return; }
  G.paused = force != null ? force : !G.paused;
  $('pause').classList.toggle('hidden', !G.paused);
  if (G.paused) { applySettings(); G.keys.clear(); updateHud(); }
}
$('btn-menu').addEventListener('click', () => { if (typeof emToggle === 'function') emToggle(); else togglePause(); });
$('pz-resume').addEventListener('click', () => togglePause(false));
for (const b of document.querySelectorAll('#pz-quality button')) b.addEventListener('click', () => {
  if (SET.quality === b.dataset.q) return;
  SET.quality = b.dataset.q; if (SET.quality === 'auto') G.qLevel = null; saveSettings(); resize();
  if (typeof SC3 !== 'undefined') { SC3.clear(); S3.px = 0; }   // refaz o cenário na qualidade nova
  applySettings();
});
$('pz-bright').addEventListener('input', e => { SET.bright = +e.target.value; saveSettings(); applySettings(); });
$('pz-zoom').addEventListener('input', e => { SET.zoom = +e.target.value; saveSettings(); G.zoomUser = false; resize(); applySettings(); });
$('pz-full').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else (document.documentElement.requestFullscreen || (() => { })).call(document.documentElement); });
$('pz-quit').addEventListener('click', () => { G.leaving = true; try { saveChar(); saveFog && G.fog && saveFog(); } catch (e) { } location.reload(); });
applySettings();

// ---------- modo criador: O Tecelão ----------
// a senha fica salva nas Configurações (localStorage 'nae-dev'); ao entrar no reino, pergunta como entrar
function devGate(go) {
  G.devPw = null; go(); return;   /* sem a escolha antes de entrar: o modo Tecelão é ligado no jogo, pelo comando */
  let pw = null; try { pw = localStorage.getItem('nae-dev'); } catch (e) { }
  if (!pw) { G.devPw = null; go(); return; }
  const old = document.getElementById('devask'); if (old) old.remove();
  const d = document.createElement('div'); d.id = 'devask';
  d.innerHTML = '<div class="devask-box"><h3>Entrar como</h3><button class="btn gold" data-m="weaver">✦ O Tecelão</button><button class="btn" data-m="normal">Criador com a vocação escolhida</button><button class="btn ghost" data-m="none">Herói comum</button></div>';
  document.body.appendChild(d);
  d.querySelectorAll('button').forEach(b => b.onclick = () => { const m = b.dataset.m; d.remove(); if (m === 'none') G.devPw = null; else { G.devPw = pw; G.devMode = m; } go(); });
}
if (false && /[?&]criador\b/.test(location.search)) { const pw = window.prompt('Senha do Tecelão:'); if (pw) { G.devPw = pw.trim().toUpperCase(); G.devMode = 'weaver';
  const box = document.createElement('div'); box.id = 'devmode'; box.style.cssText = 'margin:10px 0;display:flex;gap:8px;align-items:center;justify-content:center';
  box.innerHTML = '<b>Entrar como:</b><button class="btn gold" data-m="weaver">O Tecelão</button><button class="btn" data-m="normal">Vocação escolhida</button>';
  const set = m => { G.devMode = m; box.querySelectorAll('button').forEach(b => b.className = 'btn' + (b.dataset.m === m ? ' gold' : '')); };
  box.querySelectorAll('button').forEach(b => b.onclick = () => set(b.dataset.m));
  const st = document.getElementById('status'); if (st) st.parentNode.insertBefore(box, st); } }
function buildDevPanel() {
  if ($('devpanel')) return;
  const d = document.createElement('div'); d.id = 'devpanel'; d.className = 'gpanel';
  const monOpts = MON_TYPES.map(k => '<option value="' + k + '">' + MON[k].name + '</option>').join('');
  const OBJS = [['BARREL', 'Barril'], ['CRATE', 'Caixa'], ['ROCK', 'Pedra'], ['TREE', 'Árvore'], ['PINE', 'Pinheiro'], ['DEADTREE', 'Árvore morta'], ['CAMPFIRE', 'Fogueira'], ['TENT', 'Tenda'], ['TORCH', 'Tocha'], ['LAMP', 'Poste'], ['BANNER', 'Estandarte'], ['STATUE', 'Estátua'], ['BONES', 'Ossos'], ['HOARD', 'Tesouro'], ['ARMORPILE', 'Restos de cavaleiro'], ['NONE', '— apagar objeto —']];
  const goto = [['Cidadela', CENTER, CENTER + 6]].concat(BASTIONS.map(b => [b.name, b.x, b.y]));
  d.innerHTML = '<div class="gp-head"><span>O Tecelão</span><button class="gp-x" data-close="devpanel">✕</button></div>' +
    '<div class="gp-sub">Poderes</div><div class="dv-row"><label><input type="checkbox" id="dv-noclip" checked> Atravessar paredes</label><label><input type="checkbox" id="dv-hide"> Invisível</label></div>' +
    '<div class="dv-row"><button id="dv-fog">Revelar mapa</button><button id="dv-heal">Curar</button><button id="dv-clear">Limpar área</button><button id="dv-drag">Dragão voar</button></div>' +
    '<div class="dv-row">Hora: <button data-t="">Real</button><button data-t="day">Dia</button><button data-t="night">Noite</button></div>' +
    '<div class="gp-sub">Ir para</div><div class="dv-row dv-wrap">' + goto.map((g2, i) => '<button data-g="' + i + '">' + g2[0] + '</button>').join('') + '</div>' +
    '<div class="gp-sub">Invocar</div><div class="dv-row"><select id="dv-mon">' + monOpts + '</select><button id="dv-pmon">Colocar monstro</button></div>' +
    '<div class="dv-row"><select id="dv-obj">' + OBJS.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select><button id="dv-pobj">Colocar objeto</button></div>' +
    '<div class="gp-note">Clique no chão para colocar (vários seguidos) · botão direito ou Esc cancela · Shift voa mais rápido · clique no mapa (M) para viajar · F2 fecha</div>';
  document.body.appendChild(d);
  d.querySelector('.gp-x').onclick = () => d.classList.add('hidden');
  $('dv-noclip').onchange = e => { G.noclip = e.target.checked; };
  $('dv-hide').onchange = e => Net.send({ t: 'dev', a: 'hide', on: e.target.checked });
  $('dv-fog').onclick = () => { if (G.fog) { G.fog.fill(1); showToast('Mapa revelado.'); } };
  $('dv-heal').onclick = () => Net.send({ t: 'dev', a: 'heal' });
  $('dv-clear').onclick = () => Net.send({ t: 'dev', a: 'clear' });
  $('dv-drag').onclick = () => { Net.send({ t: 'dev', a: 'dragon' }); showToast('O dragão levantou voo para patrulhar.'); };
  d.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { G.devTime = b.dataset.t || null; });
  d.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g2 = goto[+b.dataset.g]; devTp(g2[1], g2[2] + 3); });
  $('dv-pmon').onclick = () => { G.devPlace = { kind: 'mon', v: $('dv-mon').value }; showToast('Clique no chão para colocar.'); };
  $('dv-pobj').onclick = () => { G.devPlace = { kind: 'obj', v: $('dv-obj').value }; showToast('Clique no chão para colocar.'); };
  // viajar clicando no mapa
  $('wm-canvas').addEventListener('click', e => {
    if (!G.dev && !G.devTools) return;
    const cv = $('wm-canvas'), r = cv.getBoundingClientRect(), V = wmView(r.width), w = V.inv(e.clientX - r.left, e.clientY - r.top);
    devTp(w[0], w[1]); toggleWorldMap();
  });
}
function devTp(x, y) { const me = G.me; Object.assign(me, { x, y, rx: x, ry: y, z: 0, fl: 0, fb: -1 }); Net.send({ t: 'dev', a: 'tp', x, y, z: 0 }); }
// ---------- sobrevivência: assar, beber, ícones das necessidades ----------
function nearObjKinds(r, test) { const me = G.me; for (let y = Math.round(me.y) - 2; y <= Math.round(me.y) + 2; y++) for (let x = Math.round(me.x) - 2; x <= Math.round(me.x) + 2; x++) { if (!inBounds(x, y)) continue; const i = y * MAP_W + x; if (test(WORLD.ground[i], WORLD.obj[i]) && dist(x, y, me.x, me.y) < r) return true; } return false; }
const nearFireC = () => nearObjKinds(1.9, (g, o) => o === O.CAMPFIRE || o === O.BRAZIER || o === O.TORCH) || (G.fires || []).some(f => dist(f.x, f.y, G.me.x, G.me.y) < 1.9);
const nearWaterC = () => nearObjKinds(1.9, (g, o) => g === T.WATER || g === T.SHALLOW || o === O.WELL || o === O.FOUNTAIN);
function nearHarvest() { const me = G.me; let best = -1, bd = 1.7; for (let y = Math.round(me.y) - 2; y <= Math.round(me.y) + 2; y++) for (let x = Math.round(me.x) - 2; x <= Math.round(me.x) + 2; x++) { if (!inBounds(x, y)) continue; const i = y * MAP_W + x, o = WORLD.obj[i]; if (o !== O.BERRY && o !== O.HERB) continue; const d = dist(x, y, me.x, me.y); if (d < bd) { bd = d; best = i; } } return best; }
function survivalAction() {
  const me = G.me, raw = me.inv && (me.inv.venison || me.inv.pork), hv = nearHarvest();
  if (hv >= 0) { Net.send({ t: 'harvest', i: hv }); return true; }
  if (raw && nearFireC()) { Net.send({ t: 'cook' }); return true; }
  if (((me.water ?? 100) < 98 || (me.hasSkin && (me.pots.water || 0) < 5)) && drinkGo()) return true;
  return false;
}
function updateNeeds() {
  const me = G.me, el = $('needs'); if (!me || !el) return;
  const out = [];
  if ((me.food ?? 100) < 35) out.push(['🍖', me.food <= 0 ? 'Faminto' : 'Com fome', me.food <= 0 ? 3 : me.food < 15 ? 2 : 1]);
  if ((me.water ?? 100) < 35) out.push(['💧', me.water <= 0 ? 'Desidratado' : 'Com sede', me.water <= 0 ? 3 : me.water < 15 ? 2 : 1]);
  if ((me.cold || 0) > 40) out.push(['❄', me.cold >= 100 ? 'Congelando' : 'Com frio', me.cold >= 100 ? 3 : me.cold > 70 ? 2 : 1]);
  if (me.infect) out.push(['☣', me.infect === 2 ? 'Infecção grave' : 'Febre', me.infect + 1]);
  if (me.sick > 0) out.push(['🤢', 'Enjoado', 1]);
  el.innerHTML = out.map(([i, t, s]) => '<span class="nd s' + s + '" title="' + t + '">' + i + '</span>').join('');
  document.body.classList.toggle('cold', (me.cold || 0) > 50); document.body.classList.toggle('fever', !!me.infect);
  if (typeof survMedalsUpdate === 'function') survMedalsUpdate(me);
  const pr = $('prompt'); if (!G.loot && !nearCorpse()) { const raw = me.inv && (me.inv.venison || me.inv.pork); const stN = typeof nearStove === 'function' && nearStove(), hv = nearHarvest(), exN = me.carrying && STAGE.x >= 0 && dist(me.x, me.y, STAGE.x, STAGE.y) < 3.4; const jp = typeof jailPrompt === 'function' ? jailPrompt() : '';
  const bq = typeof boundNear === 'function' ? boundNear() : null;
  const txt = me.bound ? (me.bnd === 'rope' ? 'Mãos amarradas com corda: martele ESPAÇO para se soltar (' + (me.bndE || 0) + '%)' : 'Algemado: só uma gazua ou o carcereiro abrem') : bq ? (bq.bound ? 'F: soltar ' + bq.name : '') : jp ? jp : (typeof empNear === 'function' && empNear()) ? empPrompt() : (typeof segNear === 'function' && segNear()) ? segPrompt() : (typeof dojoPrompt === 'function' && dojoPrompt()) ? dojoPrompt() : (typeof liftNear === 'function' && liftNear()) ? 'F: elevador (escolher o andar)' : (typeof leverNear === 'function' && leverNear()) ? leverPrompt() : (typeof ofuroNear === 'function' && ofuroNear()) ? ofuroPrompt() : G.training ? 'Treinando no boneco · ande para parar (sem limite de tempo)' : (typeof dummyNear === 'function' && dummyNear()) ? 'F: treinar no ' + dummyNear().t + (dummyNear().priv ? ' (seu boneco particular, de graça)' : ' (diária, uma vez por dia)') : G.me && G.me.bathing ? 'Relaxando no ofurô · ande para sair' : (typeof jobsPrompt === 'function' && jobsPrompt()) ? jobsPrompt() : (typeof estatePrompt === 'function' && estatePrompt()) ? estatePrompt() : me.wantedUntil > performance.now() && !me.escorted ? 'Y: render-se às sentinelas' : me.dragMode === 'grip' ? 'Segure o clique esquerdo: apertar o pescoço · H solta' : exN ? 'F: entregar ao carrasco (execução)' : stN ? 'F: cozinhar' : hv >= 0 ? (WORLD.obj[hv] === O.BERRY ? 'F: colher frutas' : 'F: colher erva') : raw && nearFireC() ? 'F: assar a carne' : nearWaterC() && (me.water ?? 100) < 98 ? 'F: beber' : ''; G.survPrompt = txt; } else G.survPrompt = '';
  if ($('pz-use') && typeof useHtml === 'function') $('pz-use').innerHTML = useHtml();
  if ($('pz-surv')) $('pz-surv').innerHTML = '<div><b>Fome</b> ' + Math.round(100 - (me.food ?? 100)) + '% · <b>Sede</b> ' + Math.round(100 - (me.water ?? 100)) + '% · <b>Frio</b> ' + Math.round(me.cold || 0) + '%</div><div><b>Infecção</b> ' + ['nenhuma', 'febre', 'grave'][me.infect || 0] + (me.sick > 0 ? ' · <b>enjoado</b>' : '') + '</div><div class="gp-note">Coma e beba, fique perto do fogo à noite, trate feridas graves com bandagem. A morte é permanente.</div>';
}
// ---------- sangue em jato e pedaços decepados ----------
function sprayBlood(x, y, dx, dy, n) {
  const sx = dx - dy, sy = (dx + dy) * 0.5, l = Math.hypot(sx, sy) || 1;
  for (let k = 0; k < n; k++) { if (G.parts.length > 400) break; const s = 0.03 + Math.random() * 0.08, sp = (Math.random() - 0.5) * 1.1, c = Math.cos(sp), si = Math.sin(sp), ux = (sx / l) * c - (sy / l) * si, uy = (sx / l) * si + (sy / l) * c, big = Math.random();
    G.parts.push({ kind: 'blood', x: x - G.view.ox + (Math.random() - 0.5) * 3, y: y - G.view.oy + (Math.random() - 0.5) * 3, vx: ux * s, vy: uy * s - 0.03 - Math.random() * 0.04, t0: performance.now(), life: 650 + Math.random() * 450, seed: Math.random() * 100, sz: big < 0.5 ? 1.6 + Math.random() : big < 0.85 ? 2.6 + Math.random() * 1.2 : 4 + Math.random() * 1.5 }); }
  // névoa fina no ponto do impacto
  for (let k = 0; k < Math.ceil(n / 3); k++) { if (G.parts.length > 400) break; const a = Math.random() * Math.PI * 2, s = 0.01 + Math.random() * 0.02; G.parts.push({ kind: 'blood', x: x - G.view.ox, y: y - G.view.oy, vx: Math.cos(a) * s + sx / l * 0.015, vy: Math.sin(a) * s * 0.6 - 0.01, t0: performance.now(), life: 300 + Math.random() * 200, seed: Math.random() * 100, sz: 1.2 }); }
}
function spawnGib(e, k, part, dx, dy) {
  const s = gibSprite(e, k, part); if (!s) return;
  const l = Math.hypot(dx, dy) || 1; G.gibs = (G.gibs || []).filter(g => performance.now() < g.until).slice(-40);
  G.gibs.push({ s, x: e.rx, y: e.ry, z: e.z || 0, dx: dx / l, dy: dy / l, d: 1 + Math.random() * 1.2, t0: performance.now(), spin: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4), until: performance.now() + 300000, rot: Math.random() * 6 });
}
// ---------- quedas: monstros e jogadores caídos ----------
function beginMonsterFall(e) {
  if (e.type === 'wisp' || FALLS['m' + e.id]) return;
  const h = e.lastHit || [Math.random() - 0.5, Math.random() - 0.5];
  const stand = e._spr || null;
  startFall({ lost: e.lost || 0, key: 'm' + e.id, type: e.type, x: e.rx, y: e.ry, z: e.z || 0, dir: e.dg ?? e.dir ?? 0, ix: h[0], iy: h[1], cls: 'knight', big: MON[e.type].big, force: MON[e.type].big ? 0.7 : 1, stand });
}
function updateFalls(now) {
  for (const id in G.players) {
    const e = G.players[id];
    if (e.downed && !e._fell && e.visible) { e._fell = true; const h = e.lastHit || [Math.random() - 0.5, Math.random() - 0.5]; startFall({ key: 'p' + id, hero: { cls: e.cls, skin: e.skin, color: e.color }, cls: e.cls, x: e.rx, y: e.ry, dir: e.dir || 0, ix: h[0], iy: h[1], stand: e._spr, lost: e.lost || 0, pro: e.pro || 0 }); }
    if (e.knockUntil && performance.now() > e.knockUntil) { e.knockUntil = 0; delete FALLS['kp' + id]; }
    else if (!e.downed && e._fell) { e._fell = false; delete FALLS['p' + id]; }
  }
  for (const k in FALLS) if (k[0] === 'm' && !(G.corpses || []).some(c => 'm' + c.id === k) && now - FALLS[k].t0 > 4000) delete FALLS[k];
}
// revistar / esfolar: segurar F perto de um corpo
function nearCorpse(r = 1.6) { const me = G.me; let best = null, bd = r; for (const c of G.corpses || []) { if (c.looted) continue; const d = dist(c.x, c.y, me.x, me.y); if (d < bd) { bd = d; best = c; } } return best; }
function updateLooting(now) {
  const me = G.me, c = nearCorpse(), pr = $('prompt');
  if (c && !me.downed) { pr.textContent = (MON[c.type].beh ? 'Segure F para esfolar' : 'Segure F para revistar'); pr.classList.remove('hidden'); }
  if (G.loot) {
    const lc = (G.corpses || []).find(q => q.id === G.loot.id);
    if (!G.keys.has('f') || !lc || lc.looted || dist(lc.x, lc.y, me.x, me.y) > 1.9 || me.walking) { G.loot = null; me.crouch = false; return; }
    me.crouch = true; me.walking = false;
    if (Math.random() < 0.2) { const w = tileW(lc.x, lc.y, 0); spawnPart('dust', w.x, w.y); }
    if (now - G.loot.t0 > 1300) { Net.send({ t: 'skin', id: lc.id }); G.loot = null; me.crouch = false; }
  }
}
// ---------- pegar e arremessar objetos (G) ----------
function liftOrThrow() {
  const me = G.me; if (!me || me.downed) return;
  if (me.lifted) {
    const t = G.target && G.monsters[G.target];
    let tx, ty;
    if (t && dist(t.rx, t.ry, me.x, me.y) < 8) { tx = t.rx; ty = t.ry; }
    else { const th = (me.dir || 0) * Math.PI / 4, sx = Math.sin(th), sy = Math.cos(th), v = [(sx + 2 * sy) / 2, (2 * sy - sx) / 2], l = Math.hypot(v[0], v[1]) || 1; tx = me.x + v[0] / l * 5; ty = me.y + v[1] / l * 5; }
    me.dir = dirFromVec(tx - me.x, ty - me.y, me.dir); me.anim = { a: 'swing', t0: performance.now() };
    Net.send({ t: 'throw', tx, ty }); return;
  }
  if (me.carrying) { Net.send({ t: 'carry' }); return; }
  const d = nearestDowned(); if (d) { Net.send({ t: 'carry', id: d.id }); return; }
  let best = -1, bd = 1.6;
  for (let y = Math.round(me.y) - 2; y <= Math.round(me.y) + 2; y++) for (let x = Math.round(me.x) - 2; x <= Math.round(me.x) + 2; x++) { if (!inBounds(x, y)) continue; const i = y * MAP_W + x; if (!THROWABLE[WORLD.obj[i]]) continue; const dd = dist(me.x, me.y, x, y); if (dd < bd) { bd = dd; best = i; } }
  if (best >= 0) Net.send({ t: 'lift', i: best }); else showToast('Nada para pegar aqui.');
}
// ---------- sangue no chão: respingos, pingos de quem sangra e rastro de quem se arrasta caído (5 min) ----------
const NO_BLOOD = new Set(['skeleton', 'cryptlord', 'slime', 'elderslime', 'wisp', 'spider']);   // aranhas e insetos não sangram
function addBlood(x, y, z, r, ms) { G.blood.push({ x, y, z, r, t0: performance.now(), until: performance.now() + ms, seed: Math.random() * 1000 }); if (G.blood.length > 500) G.blood.shift(); }
function bleed(e, now) {
  if (!e.visible) return;
  const bleedingNow = e === G.me ? (e.bleed && BODY_PARTS.some(k => e.bleed[k] > 0)) : e.bleeding;
  if (bleedingNow && now > (e._bdT || 0)) { e._bdT = now + 1800; addBlood(e.rx + (Math.random() - 0.5) * 0.3, e.ry + (Math.random() - 0.5) * 0.3, e.z || 0, 0.12 + Math.random() * 0.08, 90000); }
  const hs = e.downed ? 4 : Math.max(healthState(e), bleedingNow ? 2 : 0); if (hs < 2) { e._bx = e.rx; e._by = e.ry; return; }
  if (e._bx == null) { e._bx = e.rx; e._by = e.ry; }
  const d = Math.hypot(e.rx - e._bx, e.ry - e._by), step = hs === 4 ? 0.3 : hs === 3 ? 0.6 : 0.9;
  if (d >= step) { e._bx = e.rx; e._by = e.ry; addBlood(e.rx, e.ry, e.z || 0, hs === 4 ? 0.34 : 0.16 + Math.random() * 0.1, hs === 4 ? 300000 : 90000); }
}
// arremessado pela cauda do dragão: voa em arco girando e fica caído um instante
function stepFling(e, now) {
  const f = e.fling, k = Math.min(1, (now - f.t0) / f.ms);
  e.x = e.rx = f.fx + (f.tx - f.fx) * k; e.y = e.ry = f.fy + (f.ty - f.fy) * k;
  e.z = k < 1 ? f.fz + (f.tz - f.fz) * k : f.tz; e.walking = false;
  if (now - f.t0 > f.ms + 900) { e.fling = null; if (e === G.me) { me_sync(); } }
}
function me_sync() { const me = G.me; me.sendT = 0; Net.send({ t: 'mv', x: Math.round(me.x * 100) / 100, y: Math.round(me.y * 100) / 100, z: Math.round(me.z * 100) / 100, d: me.dir, w: 0, r: 0 }, true); }
// subir/descer andando pelos degraus: segue os pontos (x, y, altura em andares) e no fim troca de andar com um esmaecimento cruzado
// escadas externas (prédio, escada do térreo ao 1º andar), calculadas uma vez
let EXT_ST = null;
function extStairs() { if (EXT_ST) return EXT_ST; EXT_ST = []; BUILDINGS.forEach((b, bi) => { for (let f = 0; f < floorsOf(b) - 1; f++) if (stairKind(b, f) === 'ext') EXT_ST.push([bi, stairWorld(b, f)]); }); return EXT_ST; }
// pontos (x, y, altura em andares) do caminho de cada tipo de escada; devolve [pontos, duração mínima]
function climbPts(s, up, me) {
  const L = s.L, U = s.U, E = s.entry, A = s.arrive;
  let pts, md = 600;
  if (s.kind === 'spiral') {   // caracol: dá uma volta e um quarto em torno do poste
    const a0 = Math.atan2((up ? me.y : A[1]) - L[1], (up ? me.x : A[0]) - L[0]), c = []; for (let k = 0; k <= 10; k++) { const a = a0 + k / 10 * Math.PI * 2.5; c.push([L[0] + Math.cos(a) * 0.22, L[1] + Math.sin(a) * 0.22, k / 10]); }
    pts = up ? [[me.x, me.y, 0], ...c, [A[0], A[1], 1]] : [...c.reverse(), [E[0], E[1], 0]]; md = 1500;
  } else if (s.kind === 'ladder') {   // escada de mão: encosta na escada e sobe reto
    const bx = (L[0] - E[0]) * 0.2, by = (L[1] - E[1]) * 0.2;
    pts = up ? [[me.x, me.y, 0], [L[0], L[1], 0.02], [L[0] + bx, L[1] + by, 0.06], [L[0] + bx, L[1] + by, 0.96], [A[0], A[1], 1]] : [[L[0] + bx, L[1] + by, 1], [L[0] + bx, L[1] + by, 0.06], [L[0], L[1], 0.02], [E[0], E[1], 0]]; md = 1500;
  } else if (s.kind === 'ext') {   // externa: sobe pelos degraus de fora até o patamar e entra pela porta de cima
    const tx = U[0] + (U[0] - L[0]) * 0.4, ty = U[1] + (U[1] - L[1]) * 0.4, T = s.trig;
    pts = up ? [[me.x, me.y, 0], [L[0], L[1], 0.3], [U[0], U[1], 0.85], [tx, ty, 1], [T[0], T[1], 1], [A[0], A[1], 1]] : [[T[0], T[1], 1], [tx, ty, 1], [U[0], U[1], 0.85], [L[0], L[1], 0.3], [E[0], E[1], 0]]; md = 1200;
  } else {   // de parede: sobe ao longo da parede
    const ux = U[0] + (U[0] - L[0]) * 0.45, uy = U[1] + (U[1] - L[1]) * 0.45;
    pts = up ? [[me.x, me.y, 0], [L[0], L[1], 0.25], [U[0], U[1], 0.75], [ux, uy, 1]] : [[ux, uy, 1], [U[0], U[1], 0.75], [L[0], L[1], 0.25], [E[0], E[1], 0]];
  }
  return [pts, md];
}
function startClimb(now, bi, from, to, pts, dest, pre = false, minDur = 600) {
  let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  G.climbing = { t0: now, dur: Math.max(minDur, len / (PLAYER_SPEED * 0.6) * 1000), bi, from, to, pts, len, dest, pre };
  G.flFade = { b: bi, from, to, t0: now + (pre ? 60 : 0), dur: G.climbing.dur * 0.9 };   // os andares trocam aos poucos enquanto ele anda pelos degraus (a câmera sobe/desce junto)
  G.path = null; G.pathGoal = null; if (G.me.sit) standUp(); G.me.emote = null;
}
function stepClimb(now) {
  const c = G.climbing, me = G.me;
  if (c.pre) {
    me.walking = false;
    if (now - c.t0 < 60) return;   // descer: já fica no andar de baixo, no alto dos degraus, e desce andando
    c.pre = false; c.sent = true; c.t0 = now; me.fl = c.to; me.fb = c.to !== 0 ? c.bi : -1;
    Net.send({ t: 'floor', b: c.bi, to: c.to });
  }
  const k = Math.min(1, (now - c.t0) / c.dur);
  let d = k * c.len, p = c.pts[c.pts.length - 1];
  for (let i = 1; i < c.pts.length; i++) { const a = c.pts[i - 1], b = c.pts[i], sl = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= sl || i === c.pts.length - 1) { const t = sl ? Math.min(1, d / sl) : 1; p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; if (sl > 0.01) me.dir = dirFromVec(b[0] - a[0], b[1] - a[1], me.dir); break; } d -= sl; }
  const ox = me.x, oy = me.y; me.x = me.rx = p[0]; me.y = me.ry = p[1]; me.lift = p[2]; me.walking = true; me.walkDist += Math.hypot(me.x - ox, me.y - oy);
  if (k < 1) return;
  me.walking = false;
  if (c.sent) { G.climbing = null; me.lift = 0; G.climbT = now + 500; return; }   // descida termina na entrada
  // no topo: já está no outro andar (os andares misturaram durante a subida); aparece em frente aos degraus
  G.climbing = null; me.lift = 0; me.fl = c.to; me.fb = c.to !== 0 ? c.bi : -1;
  me.x = me.rx = c.dest[0]; me.y = me.ry = c.dest[1];
  G.climbT = now + 500; G.floorWait = now + 1200;
  Net.send({ t: 'floor', b: c.bi, to: c.to });
}
// escurece a tela rapidinho (subir/descer a torre)
function fadeFlash() {
  let f = document.getElementById('fade'); if (!f) { f = document.createElement('div'); f.id = 'fade'; f.style.cssText = 'position:fixed;inset:0;z-index:20;background:#000;opacity:0;pointer-events:none;transition:opacity .25s'; document.body.appendChild(f); }
  f.style.opacity = 1; setTimeout(() => { f.style.opacity = 0; }, 330);
}
// ============================================================
//  PREPARAR A CIDADE (tela de carregamento): fotografa todos os
//  prédios, muralhas e torres uma vez só; depois nada trava.
// ============================================================
function prebakeCity(done) {
  if (typeof S3 === 'undefined' || !S3.ok) { done && done(); return; }
  const jobs = [], seen = new Set(), X0 = CASTLE.x0 - 6, X1 = CASTLE.x1 + 6, Y0 = CASTLE.y0 - 6, Y1 = CASTLE.y1 + 6;
  for (const b of BUILDINGS) { const k = archKey(b) + (b.door || 'S'); if (!seen.has(k)) { seen.add(k); jobs.push(() => { const sp = buildingSprite(b, false); if (sp) { maskOf(sp); silhouette(sp); } }); } }
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    if (!inBounds(x, y)) continue;
    const i = y * MAP_W + x, o = WORLD.obj[i];
    if (o === O.TOWER) jobs.push(() => { const sp = towerSprite(WORLD.tvar[i], WORLD.toff[i]); if (sp) { maskOf(sp); silhouette(sp); } });
    else if (o !== O.NONE && o !== O.PART && !FLAT.has(o)) jobs.push(() => { const sp = objSprite(o, x, y); if (sp && sp.h > 60) { maskOf(sp); silhouette(sp); } });
  }
  WORLD.gates.forEach((gt, gi) => { for (let q = 0; q <= 4; q++) jobs.push(() => scen3('gh|' + gi + '|' + q, () => mGateHouse(gt, q / 4))); });
  const ov = document.createElement('div'); ov.id = 'prebake';
  ov.innerHTML = '<div class="pb-box"><div class="pb-title">Preparando Nae</div><div class="pb-bar"><div id="pb-fill"></div></div><div class="pb-txt" id="pb-txt">0%</div></div>';
  document.body.appendChild(ov);
  const total = jobs.length; let k = 0, skip = false; const T0 = performance.now();
  setTimeout(() => { const t = document.getElementById('pb-txt'); if (t && ov.isConnected) { const bt = document.createElement('button'); bt.className = 'est-btn'; bt.style.marginTop = '10px'; bt.textContent = 'Pular e entrar (prepara aos poucos)'; bt.onclick = () => { skip = true; }; t.parentNode.appendChild(bt); } }, 15000);
  S3.pinning = true;
  (function step() {
    const t0 = performance.now();
    while (k < total && performance.now() - t0 < 30) { S3.budget = 1e9; try { jobs[k](); } catch (e) { console.warn(e); } k++; }
    const pc = Math.round(k / total * 100); document.getElementById('pb-fill').style.width = pc + '%'; document.getElementById('pb-txt').textContent = pc + '%';
    if (k < total && !skip) requestAnimationFrame(step);
    else { S3.pinning = false; ov.style.opacity = 0; setTimeout(() => ov.remove(), 400); done && done(); }
  })();
}

// ============================================================
//  RODA DE EMOJIS (segurar T, soltar sobre um): saudar, dançar, apontar
// ============================================================
const EMOTES = [{ k: 'toast', n: 'Brindar', i: '🍻' }, { k: 'salute', n: 'Saudar', i: '✋' }, { k: 'dance', n: 'Dançar', i: '💃' }, { k: 'point', n: 'Apontar', i: '👉' }, { k: 'cheer', n: 'Ânimo', i: '🙌' }, { k: 'surprise', n: 'Surpresa', i: '😮' }, { k: 'adore', n: 'Adoração', i: '🙏' }, { k: 'anger', n: 'Raiva', i: '😠' }, { k: 'fear', n: 'Medo', i: '😨' }, { k: 'sad', n: 'Tristeza', i: '😢' }];
(function () {
  const w = document.createElement('div'); w.id = 'emote-wheel'; w.className = 'hidden';
  w.innerHTML = EMOTES.map((e, i) => '<div class="ew-opt" data-i="' + i + '" style="--a:' + (i * 360 / EMOTES.length - 90) + 'deg"><span>' + e.i + '</span><b>' + e.n + '</b></div>').join('') + '<div class="ew-hint">solte sobre um emoji</div>';
  document.body.appendChild(w);
  const st = document.createElement('style');
  st.textContent = '#emote-wheel{position:fixed;left:50%;top:50%;width:0;height:0;z-index:30}#emote-wheel.hidden{display:none}#emote-wheel .ew-opt{position:absolute;width:86px;height:86px;margin:-43px;border-radius:50%;transform:rotate(var(--a)) translate(105px) rotate(calc(-1 * var(--a)));background:radial-gradient(#3a2e22ee,#14100cee);box-shadow:0 0 0 2px #8a6a2a;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f0d890;font:700 12px Cinzel,serif;cursor:pointer;transition:transform .1s,box-shadow .1s}#emote-wheel .ew-opt span{font-size:30px}#emote-wheel .ew-opt.on{box-shadow:0 0 0 3px #f0d890,0 0 18px #f0c060;transform:rotate(var(--a)) translate(105px) rotate(calc(-1 * var(--a))) scale(1.12)}#emote-wheel .ew-hint{position:absolute;left:-90px;width:180px;top:150px;text-align:center;font:italic 13px Alegreya,serif;color:#e8dcc0;text-shadow:0 1px 3px #000}#btn-emote{position:fixed;top:316px;right:12px;z-index:5;width:36px;height:36px;border-radius:50%;border:0;font-size:18px;cursor:pointer;background:radial-gradient(#3a302a,#141010);box-shadow:0 0 0 1px #000,0 0 0 3px #8a6a2a;display:none}body.touch #btn-emote{display:block}';
  document.head.appendChild(st);
  const btn = document.createElement('button'); btn.id = 'btn-emote'; btn.textContent = '☺'; btn.title = 'Emojis (T)'; document.body.appendChild(btn);
  btn.addEventListener('click', () => { if (G.wheel) closeEmoteWheel(false); else { openEmoteWheel(); G.wheel.tap = true; } });
  w.querySelectorAll('.ew-opt').forEach(o => o.addEventListener('click', () => { G.wheel && (G.wheel.sel = +o.dataset.i); closeEmoteWheel(true); }));
  window.addEventListener('mousemove', e => {
    if (!G.wheel) return;
    const dx = e.clientX - innerWidth / 2, dy = e.clientY - innerHeight / 2;
    const N = w.querySelectorAll('.ew-opt').length; if (Math.hypot(dx, dy) < 40) { G.wheel.sel = -1; } else { const a = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360; G.wheel.sel = Math.round(a / (360 / N)) % N; }
    w.querySelectorAll('.ew-opt').forEach(o => o.classList.toggle('on', +o.dataset.i === G.wheel.sel));
  });
})();
function openEmoteWheel() { if (!G.started || G.me.downed) return; G.wheel = { sel: -1 }; const w = $('emote-wheel'), L = emoteList();
  w.innerHTML = L.map((e, i) => '<div class="ew-opt" data-i="' + i + '" style="--a:' + (i * 360 / L.length - 90) + 'deg"><span>' + e.i + '</span><b>' + e.n + '</b></div>').join('') + '<div class="ew-hint">solte sobre um emoji</div>';
  w.querySelectorAll('.ew-opt').forEach(o => o.addEventListener('click', () => { G.wheel && (G.wheel.sel = +o.dataset.i); closeEmoteWheel(true); })); w.classList.remove('hidden'); }
function emoteList() { return G.me && G.me.bathing ? [{ k: 'smoke', n: 'Fumar', i: '🚬' }].concat(EMOTES.filter(e => ['toast', 'salute', 'cheer', 'surprise', 'adore', 'sad'].includes(e.k))) : EMOTES; }
function closeEmoteWheel(fire) {
  const wl = G.wheel; G.wheel = null; $('emote-wheel').classList.add('hidden');
  document.querySelectorAll('#emote-wheel .ew-opt').forEach(o => o.classList.remove('on'));
  if (fire && wl && wl.sel >= 0) { const k = emoteList()[wl.sel].k; if (k === 'smoke') { G.me.smokeT = performance.now(); Net.send({ t: 'emote', k }); return; } if (G.me.bathing) { Net.send({ t: 'emote', k }); return; } if (G.me.sit) standUp(); G.me.emote = { k, t0: performance.now() }; Net.send({ t: 'emote', k }); }
}

// ---------- mapa: zoom (roda do mouse / botões) e ícones minimalistas dos lugares ----------
G.mapZ = 1;
function wmView(size) {
  const z = G.mapZ || 1, s = size / (MAP_W * Math.SQRT2) * 1.02 * z, k = Math.min(1, (z - 1) / 1.5);
  const fx = G.mapCity ? CENTER : (G.me ? G.me.x : MAP_W / 2), fy = G.mapCity ? CENTER : (G.me ? G.me.y : MAP_H / 2), cx = MAP_W / 2 + (fx - MAP_W / 2) * k, cy = MAP_H / 2 + (fy - MAP_H / 2) * k;
  const P = (wx, wy) => { const dx = (wx - cx) * s, dy = (wy - cy) * s; return [size / 2 + (dx - dy) * Math.SQRT1_2, size / 2 + (dx + dy) * Math.SQRT1_2]; };
  const inv = (px, py) => { const a = (px - size / 2) / Math.SQRT1_2, b = (py - size / 2) / Math.SQRT1_2; return [(a + b) / 2 / s + cx, (b - a) / 2 / s + cy]; };
  return { z, s, cx, cy, P, inv };
}
function mapIconOf(b, bi) {
  if (b.office) return 'key';
  const mine = G.est && G.est.mine && typeof PROPS_BY !== 'undefined' && PROPS_BY[G.est.mine.pid] && PROPS_BY[G.est.mine.pid].bi === bi;
  if (mine) return 'home';
  const t = { hotel: 'bed', tavern: 'mug', smith: 'anvil', temple: 'sun', bank: 'coin', boutique: 'needle', jail: 'bars', barracks: 'shield', castle: 'crown', fruithouse: 'apple', workshop: 'saw' }[b.kind];
  if (t) return t;
  if (b.kind === 'shop') return ({ apoth: 'potion', arcane: 'wand', tailor: 'needle', scroll: 'scroll' })[SHOP_TYPE_BY_NAME[b.name]] || 'bag';
  return null;
}
function mapIcon(x, ic, px, py, R) {
  x.save(); x.translate(px, py);
  x.beginPath(); x.arc(0, 0, R + 1.5, 0, 7); x.fillStyle = 'rgba(244,232,200,0.95)'; x.fill(); x.lineWidth = 1.2; x.strokeStyle = '#4a2e14'; x.stroke();
  const k = R / 6; x.scale(k, k); x.strokeStyle = '#3a2410'; x.fillStyle = '#3a2410'; x.lineWidth = 1.3; x.lineCap = 'round'; x.lineJoin = 'round';
  const L = (...p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.stroke(); };
  switch (ic) {
    case 'bag': L(-3, -1, 3, -1, 3.5, 4, -3.5, 4, -3, -1); L(-1.5, -1, -1.5, -3, 1.5, -3, 1.5, -1); break;
    case 'mug': L(-3, -3, -3, 3.5, 2, 3.5, 2, -3); L(2, -1.5, 3.8, -1.5, 3.8, 1.5, 2, 1.5); break;
    case 'anvil': L(-4, -1.5, 4, -1.5, 2, 0.5, -2, 0.5, -4, -1.5); L(-1, 0.5, -1, 3); L(1, 0.5, 1, 3); L(-2.5, 3, 2.5, 3); break;
    case 'sun': x.beginPath(); x.arc(0, 0, 1.8, 0, 7); x.stroke(); for (let a = 0; a < 8; a++) { const c = Math.cos(a * Math.PI / 4), s = Math.sin(a * Math.PI / 4); L(c * 3, s * 3, c * 4.3, s * 4.3); } break;
    case 'coin': x.beginPath(); x.arc(0, 0, 3.5, 0, 7); x.stroke(); L(0, -2, 0, 2); L(-1.2, -1, 1, -1); L(-1, 1, 1.2, 1); break;
    case 'needle': L(-3.5, 3.5, 3, -3); x.beginPath(); x.arc(2.4, -2.4, 0.9, 0, 7); x.stroke(); L(3, -3, 1, 1, -2, 2.5); break;
    case 'bars': L(-3, -3.5, -3, 3.5); L(0, -3.5, 0, 3.5); L(3, -3.5, 3, 3.5); L(-4, -3.5, 4, -3.5); break;
    case 'shield': L(-3, -3, 3, -3, 3, 0, 0, 4, -3, 0, -3, -3); break;
    case 'crown': L(-3.5, 2.5, -3.5, -2, -1.5, 0, 0, -3, 1.5, 0, 3.5, -2, 3.5, 2.5, -3.5, 2.5); break;
    case 'apple': x.beginPath(); x.arc(0, 1, 3, 0, 7); x.stroke(); L(0, -2, 0.8, -3.8); break;
    case 'saw': L(-4, 0, 3, 0); L(-4, 0, -4, 2, 3, 2); L(3, -1, 4.2, -1, 4.2, 1, 3, 1); break;
    case 'potion': L(-1, -4, 1, -4); L(-1, -4, -1, -1.5, -3, 1, -2, 3.5, 2, 3.5, 3, 1, 1, -1.5, 1, -4); break;
    case 'wand': L(-3.5, 3.5, 2, -2); for (const [a, b] of [[3, -3], [2, -4.2], [4.2, -2]]) L(2.5, -2.5, a, b); break;
    case 'scroll': L(-3, -3, 3, -3, 3, 3, -3, 3, -3, -3); L(-1.5, -1, 1.5, -1); L(-1.5, 1, 1.5, 1); break;
    case 'key': x.beginPath(); x.arc(-2, 0, 1.6, 0, 7); x.stroke(); L(-0.4, 0, 4, 0); L(2.5, 0, 2.5, 1.5); L(3.8, 0, 3.8, 1.5); break;
    case 'bed': L(-4, 2, -4, -2); L(-4, 0, 4, 0, 4, 2); x.fillRect(-3.4, -1.6, 2, 1.4); break;
    case 'home': L(-3.5, 0, 0, -3.5, 3.5, 0); L(-2.5, -0.5, -2.5, 3.5, 2.5, 3.5, 2.5, -0.5); x.fillStyle = '#c8281e'; x.fillRect(-0.8, 1, 1.6, 2.5); break;
  }
  x.restore();
}
(function wmControls() {
  const cv = document.getElementById('wm-canvas'); if (!cv) return;
  cv.addEventListener('wheel', e => { e.preventDefault(); G.mapZ = Math.max(1, Math.min(7, (G.mapZ || 1) * (e.deltaY < 0 ? 1.25 : 0.8))); if (G.mapZ <= 1.01) G.mapCity = false; drawWorldMap(); }, { passive: false });
  cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(), k = (G.mapSize || r.width) / r.width, mx = (e.clientX - r.left) * k, my = (e.clientY - r.top) * k; let best = null, bd = 12; for (const ic of G.mapIcons || []) { const d = Math.hypot(ic.px - mx, ic.py - my); if (d < bd && ic.name) { bd = d; best = ic; } } if ((best && best.name) !== (G.mapHover && G.mapHover.name)) { G.mapHover = best; drawWorldMap(); } });
  const fr = cv.parentNode, bar = document.createElement('div'); bar.className = 'wm-zoom';
  bar.innerHTML = '<button data-z="1">Reino</button><button data-z="city">Cidade</button><button data-z="me">Perto de mim</button><span>Roda do mouse aproxima · passe o mouse nos ícones</span>';
  fr.insertBefore(bar, cv);
  bar.querySelectorAll('button').forEach(b => b.onclick = () => { const z = b.dataset.z; if (z === '1') { G.mapZ = 1; G.mapCity = false; } else if (z === 'city') { G.mapZ = 4.2; G.mapCity = true; } else { G.mapZ = 5.5; G.mapCity = false; } drawWorldMap(); });
})();

// ---------- beber água de verdade: anda até a beira (se longe), vira de frente para a água e só então se abaixa ----------
const isWaterAt = (x, y) => { if (!inBounds(x, y)) return false; const i = y * MAP_W + x, gr = WORLD.ground[i], o = WORLD.obj[i]; return gr === T.WATER || gr === T.SHALLOW || o === O.WELL || o === O.FOUNTAIN; };
function drinkFace(w) { const me = G.me; me.dir = dirFromVec(w.x - me.x, w.y - me.y, me.dir); me.walking = false; G.busyUntil = performance.now() + 1700; G.busyFace = { x: w.x, y: w.y }; Net.send({ t: 'drinkw', dir: me.dir, fa: Math.atan2(w.y - me.y, w.x - me.x) }); }
function drinkGo() {
  const me = G.me; if (!me) return false; let best = null, bd = 4.6;
  for (let y = Math.round(me.y) - 4; y <= Math.round(me.y) + 4; y++) for (let x = Math.round(me.x) - 4; x <= Math.round(me.x) + 4; x++) if (isWaterAt(x, y)) { const d = dist(me.x, me.y, x, y); if (d < bd) { bd = d; best = { x, y }; } }
  if (!best) return false;
  const big = WORLD.obj[best.y * MAP_W + best.x] === O.FOUNTAIN || WORLD.obj[best.y * MAP_W + best.x] === O.WELL, reach = big ? 2.3 : 1.45;
  if (bd <= reach) { drinkFace(best); return true; }
  let spot = null, sd = 1e9;
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; for (const r of (big ? [1.4, 1.8, 2.2] : [0.95, 1.2, 1.5])) { const px = best.x + Math.cos(a) * r, py = best.y + Math.sin(a) * r; if (isWaterAt(Math.round(px), Math.round(py)) || !freeAt(px, py, 0)) continue; const d = dist(me.x, me.y, px, py); if (d < sd) { sd = d; spot = [px, py]; } } }
  if (!spot) return false;
  let path = findPath(me.x, me.y, spot[0], spot[1], 0, 0); if (!path) { path = findPath(me.x, me.y, spot[0], spot[1], 0, 1); if (path) path.push(spot); } if (!path) path = sd < 4 ? [spot] : null; if (!path) return false;
  G.path = path.length ? path : [spot]; G.pathGoal = spot; G.drinkAt = best; showToast('Indo até a água...'); return true;
}
function drinkTick() {
  const w = G.drinkAt, me = G.me; if (!w || !me) return;
  if (G.path && G.path.length) return;   // ainda andando
  G.drinkAt = null; if (dist(me.x, me.y, w.x, w.y) <= 2.4) drinkFace(w);
}

// lascas de madeira e a árvore balançando; lascas de pedra e poeira; pedaços de mato
// ---------- confirmação e pergunta no estilo do jogo ----------
function gameAsk(msg, opts = {}) {
  return new Promise(res => {
    let d = $('gask'); if (!d) { d = document.createElement('div'); d.id = 'gask'; document.body.appendChild(d); }
    const inp = opts.input != null;
    d.innerHTML = '<div class="gpanel gask-box"><div class="gask-msg"></div>' + (inp ? '<input class="gask-in" type="' + (opts.type || 'text') + '">' : '') + '<div class="gask-btns"><button class="est-btn" data-ok>' + (opts.yes || 'Sim') + '</button><button class="est-btn ghost" data-no>' + (opts.no || 'Cancelar') + '</button></div></div>';
    d.querySelector('.gask-msg').textContent = msg; d.classList.remove('hidden'); G.asking = true;
    const inEl = d.querySelector('.gask-in'); if (inEl) { inEl.value = opts.input; setTimeout(() => { inEl.focus(); inEl.select(); }, 30); }
    const done = v => { d.classList.add('hidden'); d.innerHTML = ''; G.asking = false; document.removeEventListener('keydown', key, true); res(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(inp ? null : false); } else if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); done(inp ? inEl.value : true); } else e.stopPropagation(); };
    document.addEventListener('keydown', key, true);
    d.querySelector('[data-ok]').onclick = () => done(inp ? inEl.value : true); d.querySelector('[data-no]').onclick = () => done(inp ? null : false);
  });
}
// ---------- portas das cabines da pousada (abrem quando alguém passa) ----------
G.cabAng = [];
function cabinDoorItems(items, inB, now) {
  if (!HOTEL_CABS.length || inB !== HOTEL_CABS[0].bi) return;
  const dt = Math.min(0.1, (now - (G.cabT || now)) / 1000); G.cabT = now;
  const ents = [G.me, ...Object.values(G.players || {}), ...Object.values(G.npcs || {})].filter(Boolean);
  HOTEL_CABS.forEach((Q, i) => { if (!Q.door) return;
    const open = ents.some(e => dist(e.rx ?? e.x, e.ry ?? e.y, Q.door[0], Q.door[1]) < 0.85) ? 1 : 0; G.cabAng[i] = (G.cabAng[i] || 0) + (open - (G.cabAng[i] || 0)) * Math.min(1, dt * 6);
    const p = iso(Q.door[0], Q.door[1]); items.push({ d: Q.door[0] + Q.door[1] + 0.05, k: 10, cab: i, sx: p.sx + G.view.ox, sy: p.sy + G.view.oy, inside: true }); });
}
function drawCabinDoor(ctx, it) {   // cortina de pano: pendurada num varão; quando alguém passa, corre e se junta num canto
  const Q = HOTEL_CABS[it.cab], op = G.cabAng[it.cab] || 0, now = performance.now();
  const ax = Q.door[0] - Q.spot[0], ay = Q.door[1] - Q.spot[1], ux = -ay, uy = ax;
  const hx = Q.door[0] + ux * 0.46, hy = Q.door[1] + uy * 0.46, ox = hx - ux * 0.92, oy = hy - uy * 0.92;   // varão de ponta a ponta do vão
  const wv = 1 - 0.78 * op, ex = hx - ux * 0.92 * wv, ey = hy - uy * 0.92 * wv;                            // largura do pano (junta no canto da dobradiça)
  const P0 = (x, y) => { const q = iso(x, y); return [q.sx + G.view.ox, q.sy + G.view.oy]; }, HVv = typeof HV !== 'undefined' ? HV : 25, H = 1.9 * HVv, top = 2.02 * HVv;
  const [rx0, ry0] = P0(hx, hy), [rx1, ry1] = P0(ox, oy), [x0, y0] = P0(hx, hy), [x1, y1] = P0(ex, ey);
  const COL = [['#8a2a26', '#a8423a'], ['#2e5a3a', '#44784e'], ['#2e3e6a', '#46588a'], ['#9a7a2a', '#b8963e']][it.cab % 4];
  ctx.save();
  // varão de ferro com argolas
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(rx0, ry0 - top); ctx.lineTo(rx1, ry1 - top); ctx.stroke();
  // pano em gomos (dobras claras e escuras); a barra de baixo balança de leve
  const n = Math.max(3, Math.round(7 * wv)), sway = Math.sin(now / 700 + it.cab) * 0.8 * (1 - op);
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n, ax0 = x0 + (x1 - x0) * t0, ay0 = y0 + (y1 - y0) * t0, ax1 = x0 + (x1 - x0) * t1, ay1 = y0 + (y1 - y0) * t1;
    const b0 = H * (0.04 + 0.03 * Math.sin(k * 1.7)), b1 = H * (0.04 + 0.03 * Math.sin((k + 1) * 1.7));
    ctx.beginPath(); ctx.moveTo(ax0, ay0 - top + 1); ctx.lineTo(ax1, ay1 - top + 1); ctx.lineTo(ax1 + sway, ay1 - b1); ctx.lineTo(ax0 + sway, ay0 - b0); ctx.closePath();
    ctx.fillStyle = COL[k % 2]; ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20,10,6,0.45)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x0, y0 - top + 1); ctx.lineTo(x0 + sway, y0 - H * 0.04); ctx.lineTo(x1 + sway, y1 - H * 0.04); ctx.lineTo(x1, y1 - top + 1); ctx.stroke();
  for (let k = 0; k <= n; k++) { const t = k / n; ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - top + 0.5, 0.9, 0, 7); ctx.fill(); }   // argolas
  if (op < 0.5) { const nx = x0 + (x1 - x0) * 0.5, ny = y0 + (y1 - y0) * 0.5 - H * 0.72; ctx.fillStyle = 'rgba(240,226,190,0.85)'; ctx.font = 'bold 7px serif'; ctx.textAlign = 'center'; ctx.fillText(String(it.cab + 1), nx, ny); }   // número da cabine bordado
  ctx.restore();
}
// ---------- árvore caindo / pedra se desfazendo ----------
G.falls = [];
function fallStart(m) {
  const x = m.i % MAP_W, y = Math.floor(m.i / MAP_W), sp = objSprite(m.o, x, y); if (!sp) return;
  const a = m.a || 0, q = iso(x + Math.cos(a), y + Math.sin(a)), p = iso(x, y), vx = q.sx - p.sx, vy = q.sy - p.sy, l = Math.hypot(vx, vy) || 1;
  G.falls.push({ x, y, o: m.o, sp, tree: m.t === 'tfall', vx: vx / l, vy: vy / l, t0: performance.now(), hit: false });
  if (m.t === 'crumble') { for (let k = 0; k < 18; k++) spawnPart('chip', p.sx + (Math.random() - 0.5) * 22, p.sy - 4 - Math.random() * 14, { color: ['#9a9690', '#c8c4bc', '#6a665e', '#8a7a68'][k % 4] }); for (let k = 0; k < 10; k++) spawnPart('dust', p.sx + (Math.random() - 0.5) * 26, p.sy - 2); }
  else for (let k = 0; k < 6; k++) spawnPart('chip', p.sx + (Math.random() - 0.5) * 8, p.sy - 14, { color: ['#8a5a2a', '#c89858'][k % 2] });
}
function drawObjFall(ctx, it, now) {
  const F = it.f, t = now - F.t0, s = F.sp;
  if (!F.tree) {   // pedra: encolhe e afunda em pedaços
    const k = Math.min(1, t / 380); ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(it.sx, it.sy + k * 4); ctx.scale(1 + k * 0.25, 1 - k * 0.8); ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore(); return;
  }
  // árvore: tomba acelerando (até 90°), quica de leve, fica deitada e some
  const T1 = 1100, k = Math.min(1, t / T1); let ph = (Math.PI / 2) * k * k;
  if (t > T1) { const b = (t - T1) / 260; ph = Math.PI / 2 - (b < 1 ? Math.sin(b * Math.PI) * 0.07 : 0); if (!F.hit) { F.hit = true; const gx = it.sx - G.view.ox + F.vx * s.ay * 0.7, gy = it.sy - G.view.oy + F.vy * s.ay * 0.35; for (let n = 0; n < 14; n++) spawnPart('dust', gx + (Math.random() - 0.5) * s.ay * 0.8, gy + (Math.random() - 0.5) * 10); for (let n = 0; n < 12; n++) spawnPart('chip', gx + (Math.random() - 0.5) * s.ay * 0.6, gy - Math.random() * 10, { color: ['#4a7a32', '#6a9a42', '#8a5a2a'][n % 3] }); G.shake = Math.max(G.shake || 0, 3); } }
  const fade = t > T1 + 900 ? Math.max(0, 1 - (t - T1 - 900) / 700) : 1;
  const Ux = F.vx * Math.sin(ph), Uy = -Math.cos(ph) + F.vy * 0.5 * Math.sin(ph);
  ctx.save(); ctx.globalAlpha = fade; ctx.transform(1, 0, -Ux, -Uy, it.sx, it.sy); ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore();
}
function gatherFx(i, tool) {
  const x = i % MAP_W, y = Math.floor(i / MAP_W), p = iso(x, y), col = tool === 'axe' ? ['#8a5a2a', '#c89858', '#6a4020'] : tool === 'pickaxe' ? ['#9a9690', '#c8c4bc', '#6a665e'] : ['#6a9a42', '#9ac060', '#c8b060'];
  const h = tool === 'axe' ? 16 : tool === 'pickaxe' ? 6 : 3;
  for (let k = 0; k < (tool === 'sickle' ? 6 : 8); k++) spawnPart('chip', p.sx + (Math.random() - 0.5) * 8, p.sy - h - Math.random() * 6, { color: col[k % 3] });
  if (tool === 'pickaxe') for (let k = 0; k < 4; k++) spawnPart('dust', p.sx + (Math.random() - 0.5) * 10, p.sy - 2);
  if (tool === 'axe') { G.objShake = G.objShake || {}; G.objShake[i] = performance.now() + 450; }
}

// ---------- F: conversar com o NPC mais perto (ou doar para o jogador mais perto) ----------
function talkTarget() {
  const me = G.me; if (!me || me.downed) return null; if (typeof estChestHere === 'function' && estChestHere()) return null;   // perto do baú de casa: o F abre o baú
  let best = null, bd = 2.3;
  for (const id in G.npcs) { const e = G.npcs[id]; if (e.npDead || e.npDown || e.onBackBy || e.dragged || (e.fl || 0) !== (me.fl || 0)) continue; { const bn = bldAt(e.rx ?? e.x, e.ry ?? e.y), bm = bldAt(me.x, me.y); if (bn >= 0 && bm >= 0 && bn !== bm) continue; }   /* só quem está no mesmo andar e no mesmo prédio (não fala através da parede) */ const d = dist(me.x, me.y, e.rx ?? e.x, e.ry ?? e.y); if (d < bd) { bd = d; best = { k: 'n', id, name: (e.name || '').split(',')[0] }; } }
  if (!best && me.jl > 0 && G.npcs.jailer) best = { k: 'n', id: 'jailer', name: 'Bruno' };   // preso fala com o carcereiro de dentro da cela
  for (const id in G.players) { const q = G.players[id]; if (q === me || q.downed || !q.visible || (q.fl || 0) !== (me.fl || 0)) continue; const d = dist(me.x, me.y, q.rx, q.ry); if (d < Math.min(bd, 1.9)) { bd = d; best = { k: 'p', id, name: q.name }; } }
  return best;
}
function talkF() { const t = talkTarget(); if (!t) return false; if (t.k === 'n') openDialog(t.id); else giveOpen(t.id); return true; }
// doar ouro e itens para outro jogador (chega na hora)
function giveOpen(pid) {
  const q = G.players[pid], me = G.me; if (!q) return;
  let d = $('givep'); if (!d) { d = document.createElement('div'); d.id = 'givep'; d.className = 'gpanel'; document.body.appendChild(d); }
  const items = Object.entries(me.inv || {}).filter(([k, n]) => n > 0 && LOOT[k]);
  d.innerHTML = '<div class="gp-head"><span>Dar para ' + q.name.replace(/</g, '') + '</span><span class="gp-gold"><span class="coin"></span><b>' + me.gold + '</b></span><button class="gp-x" id="gv-x">✕</button></div>' +
    '<div class="gp-sub">Ouro</div><div class="bk-row"><input id="gv-q" type="number" min="1" ' + (G.dev ? '' : 'max="' + me.gold + '"') + ' placeholder="Quantia"><button class="est-btn" id="gv-gold">Dar ouro</button></div>' +
    '<div class="gp-sub">Itens</div><div class="gv-items">' + (items.length ? items.map(([k, n]) => '<button class="gv-it" data-k="' + k + '" title="' + LOOT[k].name + ' (clique: 1 · Shift+clique: todos)"><span style="color:' + LOOT[k].color + '">' + LOOT[k].icon + '</span><small>' + n + '</small></button>').join('') : '<div class="gp-note">Mochila vazia.</div>') + '</div>' +
    '<div class="gp-note">Clique num item para dar 1 (Shift+clique dá todos). Chega na hora; os dois recebem o aviso.</div>';
  d.classList.remove('hidden');
  d.querySelector('#gv-x').onclick = () => d.classList.add('hidden');
  d.querySelector('#gv-gold').onclick = () => { const v = Math.floor(+d.querySelector('#gv-q').value || 0); if (v > 0) Net.send({ t: 'pgive', to: pid, gold: v }); setTimeout(() => giveOpen(pid), 350); };
  d.querySelectorAll('.gv-it').forEach(b => b.onclick = ev => { const k = b.dataset.k; Net.send({ t: 'pgive', to: pid, k, n: ev.shiftKey ? (me.inv[k] || 1) : 1 }); setTimeout(() => giveOpen(pid), 350); });
}

// baú da cabine da pousada (12 espaços): F perto do baú da sua cabine
function hotelChestNear() { const me = G.me, bi = BUILDINGS.findIndex(b => b.kind === 'hotel'); if (!me || bi < 0 || WORLD.bld[tileAt(me.x, me.y)] !== bi) return false; const b = BUILDINGS[bi], L = interiorLayout(b, 0); return L.F.some(f => { if (f.t !== 'chest') return false; const [x, y] = bLocal(b, f.i, f.j); return dist(me.x, me.y, x, y) < 1.6; }); }
function hotelChestF() { if (!hotelChestNear()) return false; if (G.me.hroom >= 0 && (!G.hotel || G.hotel.room < 0)) { Net.send({ t: 'hotel', a: 'view' }); setTimeout(hotelChestShow, 300); return true; } if (!G.hotel || G.hotel.room < 0) { Net.send({ t: 'hotel', a: 'view' }); showToast('Esse baú é de um hóspede. Alugue uma cabine com Dona Ilsa.'); return true; } hotelChestShow(); return true; }
function hotelChestShow() {
  let d = $('hchest'); if (!d) { d = document.createElement('div'); d.id = 'hchest'; d.className = 'gpanel'; document.body.appendChild(d); }
  const H = G.hotel || { items: {} }, inv = Object.entries(G.me.inv || {}).filter(([k, n]) => n > 0 && LOOT[k]), box = Object.entries(H.items || {});
  const cell = (k, n, a) => '<button class="gv-it" data-a="' + a + '" data-k="' + k + '" title="' + LOOT[k].name + '"><span style="color:' + LOOT[k].color + '">' + LOOT[k].icon + '</span><small>' + n + '</small></button>';
  d.innerHTML = '<div class="gp-head"><span>Baú da cabine ' + ((H.room ?? -1) + 1) + '</span><button class="gp-x" id="hc-x">✕</button></div><div class="gp-sub">No baú (' + box.length + '/4)</div><div class="gv-items">' + (box.length ? box.map(([k, n]) => cell(k, n, 'take')).join('') : '<div class="gp-note">Vazio.</div>') + '</div><div class="gp-sub">Sua mochila</div><div class="gv-items">' + inv.map(([k, n]) => cell(k, n, 'put')).join('') + '</div><div class="gp-note">Clique para guardar ou tirar 1 (Shift+clique: todos).</div>';
  d.classList.remove('hidden'); d.querySelector('#hc-x').onclick = () => d.classList.add('hidden');
  d.querySelectorAll('[data-a]').forEach(b => b.onclick = ev => { const k = b.dataset.k, a = b.dataset.a, all = a === 'put' ? G.me.inv[k] : (H.items || {})[k]; Net.send({ t: 'hotel', a, k, n: ev.shiftKey ? all : 1 }); });
}

// ---------- janela de troca com os NPCs: abas Comprar / Vender ----------
const TRADE_KINDS = new Set(['st_bakery', 'st_witch', 'merchant', 'innkeeper', 'fruit', 'smith', 'st_apoth', 'st_arcane', 'st_tailor', 'st_scroll']);
G.tradeTab = 'buy';
function tradeShow(m) {
  if (!G.trade || G.trade.npc !== m.npc) G.tradeAt = { x: G.me.x, y: G.me.y }; G.trade = m; let d = $('tradep'); if (!d) { d = document.createElement('div'); d.id = 'tradep'; d.className = 'gpanel'; document.body.appendChild(d); }
  const icon = k => k.startsWith('pot_') ? { i: '🧪', c: k === 'pot_hp' ? '#e85a5a' : k === 'pot_mp' ? '#5a8ae8' : '#e8dcc0' } : { i: (LOOT[k] || {}).icon || '?', c: (LOOT[k] || {}).color || '#ccc' };
  const row = (k, name, price, q, a) => { const ic = icon(k); return '<div class="tr-row"><span class="tr-ic" style="color:' + ic.c + '">' + ic.i + '</span><span class="tr-nm">' + name + '<small>' + (a === 'buy' ? q + ' em estoque' : 'você tem ' + q) + '</small></span><span class="tr-pr"><span class="coin"></span>' + price + '</span><button class="est-btn" data-a="' + a + '" data-k="' + k + '" data-n="1">' + (a === 'buy' ? 'Comprar' : 'Vender') + '</button>' + (q > 1 ? '<button class="est-btn ghost" data-a="' + a + '" data-k="' + k + '" data-n="' + (a === 'buy' ? Math.min(5, q) : q) + '">' + (a === 'buy' ? '×' + Math.min(5, q) : 'Todos') + '</button>' : '') + '</div>'; };
  const list = G.tradeTab === 'buy' ? (m.sell.length ? m.sell.map(([k, nm, pr, q]) => row(k, nm, pr, q, 'buy')).join('') : '<div class="gp-note">Nada à venda agora. O estoque volta com o tempo.</div>') : (m.buys.length ? m.buys.map(([k, nm, pr, q]) => row(k, nm, pr, q, 'sell')).join('') : '<div class="gp-note">Você não tem nada que interesse aqui.</div>');
  d.innerHTML = '<div class="gp-head"><span>' + m.name.split(',')[0] + '</span><span class="gp-gold"><span class="coin"></span><b>' + m.gold + '</b></span><button class="gp-x" id="tr-x">✕</button></div>' +
    '<div class="gm-sub tr-tabs"><button data-tt="buy"' + (G.tradeTab === 'buy' ? ' class="on"' : '') + '>Comprar</button><button data-tt="sell"' + (G.tradeTab === 'sell' ? ' class="on"' : '') + '>Vender</button></div>' +
    (m.hate ? '<div class="gp-note" style="color:#ff8a7a">Não quer negociar com você (é seu inimigo).</div>' : '') + '<div class="tr-list">' + list + '</div>' +
    '<div class="gp-note">Preço melhor com quem gosta de você. O que você vende fica à venda para os outros.</div>';
  d.classList.remove('hidden');
  d.querySelector('#tr-x').onclick = () => d.classList.add('hidden');
  d.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { G.tradeTab = b.dataset.tt; tradeShow(G.trade); });
  d.querySelectorAll('[data-a]').forEach(b => b.onclick = () => Net.send({ t: 'trade', a: b.dataset.a, npc: m.npc, k: b.dataset.k, n: +b.dataset.n }));
}

// ---------- bloqueio direcional: segurando o botão direito, um peteleco do mouse escolhe alto / esquerda / direita / baixo ----------
G.pz = 'top';
window.addEventListener('mousemove', e => {
  return;   // (antigo: peteleco do mouse escolhia a zona; agora o escudo só aponta para o mouse)
  if (!G.parrying || !G.me) return; const M = G.pzMv || (G.pzMv = { x: e.clientX, y: e.clientY, t: performance.now() }), now = performance.now();
  if (now - M.t > 450) { M.x = e.clientX; M.y = e.clientY; M.t = now; return; }
  const dx = e.clientX - M.x, dy = e.clientY - M.y; if (Math.hypot(dx, dy) < 26) return;
  let z; if (Math.abs(dy) > Math.abs(dx) * 1.15) z = dy < 0 ? 'top' : 'low';
  else { const wx = (dx / 32 + dy / 16) / 2, wy = (dy / 16 - dx / 32) / 2, f = G.me.fa ?? 0, cr = Math.cos(f) * wy - Math.sin(f) * wx; z = cr > 0 ? 'L' : 'R'; }
  M.x = e.clientX; M.y = e.clientY; M.t = now;
  if (z !== G.pz) { G.pz = z; Net.send({ t: 'parrya', a: G.me.fa ?? 0, z }); }
});
// indicador em volta do personagem: as quatro direções, a ativa acesa
// sinais minimalistas sobre os NPCs: moedinha nas vendas, ✓ nas entregas
function drawTradeFx(ctx, now) {
  if (!G.tfx || !G.tfx.length) return; G.tfx = G.tfx.filter(f => now - f.t0 < 1100); const ox = G.view.ox, oy = G.view.oy;
  for (const f of G.tfx) { const e = G.npcs[f.id] || G.players[f.id]; if (!e) continue; const t = (now - f.t0) / 1100; if (t < 0) continue; const p = iso(e.rx, e.ry), x = p.sx + ox, y = p.sy + oy - 44 - t * 12, a = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    if (f.k === 'coin') { const w = Math.abs(Math.cos(t * 9)) * 3.2 + 0.6; ctx.fillStyle = '#e8c45a'; ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(x, y, w, 3.2, 0, 0, 7); ctx.fill(); ctx.stroke(); if (f.plus) { ctx.fillStyle = '#7ad870'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', x + 6, y + 2.5); } }
    else { ctx.strokeStyle = '#7ad870'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 0.8, y + 2.4); ctx.lineTo(x + 3.4, y - 2.6); ctx.stroke(); }
    ctx.restore(); }
}
// cenas das lojas: a escolha da varinha (faíscas que falham, um vaso que estoura, até a varinha certa brilhar) e a prova de roupa (fita métrica dourada girando)
function drawShopScene(ctx, now) {
  const S0 = G.shopScene, me = G.me; if (!S0 || !me) return; const t = now - S0.t0, P0 = iso(me.rx, me.ry), x = P0.sx + G.view.ox, y = P0.sy + G.view.oy - 30;
  if (S0.k === 'wand') {
    if (t > 4200) { G.shopScene = null; return; }
    if (t < 1300) { if (Math.random() < 0.6) spawnPart('chip', x - G.view.ox + 8 + (Math.random() - 0.5) * 20, y - G.view.oy - 8, { color: ['#ff5a3a', '#ffa83a', '#8a8aff'][Math.floor(Math.random() * 3)] }); }   // faíscas erradas
    else if (t < 2300) { if (!S0.pop) { S0.pop = 1; for (let k = 0; k < 16; k++) spawnPart('chip', x - G.view.ox + 30 + (Math.random() - 0.5) * 18, y - G.view.oy + 6, { color: ['#c8d8e0', '#9ab0c0', '#e8e0d0'][k % 3] }); G.shake = Math.max(G.shake || 0, 3); } }   // um vaso estoura
    else { const k = Math.min(1, (t - 2300) / 500), a = (t < 3700 ? 1 : 1 - (t - 3700) / 500); ctx.save(); ctx.globalAlpha = Math.max(0, a); const gr = ctx.createRadialGradient(x, y, 2, x, y, 34 * k); gr.addColorStop(0, 'rgba(255,240,180,0.9)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 34 * k, 0, 7); ctx.fill();
      for (let q = 0; q < 8; q++) { const an = q / 8 * Math.PI * 2 + t / 400, r = 14 + 10 * k; ctx.fillStyle = '#fff4c8'; ctx.fillRect(x + Math.cos(an) * r - 1, y + Math.sin(an) * r * 0.6 - 1, 2, 2); } ctx.restore();
      if (!S0.ok) { S0.ok = 1; me.say = 'Esta! A varinha escolheu você.'; me.sayUntil = now + 2600; } }
  } else if (S0.k === 'fit') {
    if (t > 3000) { G.shopScene = null; return; }
    const k = t / 3000; ctx.save(); ctx.strokeStyle = 'rgba(232,200,74,0.95)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let q = 0; q <= 40; q++) { const an = q / 40 * Math.PI * 2 + t / 260, hh = 30 - k * 46 + Math.sin(an * 2) * 2; const px = x + Math.cos(an) * 13, py = y + 24 - (1 - k) * 4 - (q / 40) * 2 + Math.sin(an) * 5 - hh * 0.0 - k * 26; q ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); for (let q = 0; q < 3; q++) { const an = t / 300 + q * 2.1; ctx.fillStyle = 'rgba(255,248,220,0.9)'; ctx.fillRect(x + Math.cos(an) * 18 - 1, y + 10 - k * 26 + Math.sin(an) * 6, 2, 2); } ctx.restore();
  }
}
function drawBlockHud(ctx, now) {
  drawTradeFx(ctx, now); drawShopScene(ctx, now); if (typeof drawFlameFx === 'function') drawFlameFx(ctx, now);
  if (G.tradeAt) { const tp = $('tradep'); if (!tp || tp.classList.contains('hidden')) { G.tradeAt = null; G.trade = null; } else if (dist(G.me.x, G.me.y, G.tradeAt.x, G.tradeAt.y) > 4) { tp.classList.add('hidden'); G.tradeAt = null; G.trade = null; } }   // longe do vendedor: fecha a troca
  const me = G.me; if (!me || !G.parrying) return; const ox = G.view.ox, oy = G.view.oy, P = iso(me.rx, me.ry), cx = P.sx + ox, cy = P.sy + oy - 26, f = me.fa ?? 0;
  const sh = me.cls === 'knight' && (me.shp ?? 100) > 0 && me.wpn !== 'halberd' && !me.shea;
  // arco no chão na direção do escudo; nos primeiros instantes (janela da defesa perfeita) ele brilha forte
  { const k = Math.max(0, 1 - (now - (G.parryT0 || 0)) / (PARRY_PERFECT + 120)), gx = P.sx + ox, gy = P.sy + oy, pts = [];
    for (let i = 0; i <= 16; i++) { const a = f - PARRY_ARC + i / 16 * PARRY_ARC * 2, q = iso(me.rx + Math.cos(a) * 1.05, me.ry + Math.sin(a) * 1.05); pts.push([q.sx + ox, q.sy + oy]); }
    ctx.save(); ctx.beginPath(); ctx.moveTo(gx, gy); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.closePath();
    const col = sh ? '240,200,110' : '220,225,235'; ctx.fillStyle = 'rgba(' + col + ',' + (0.24 + 0.36 * k) + ')'; ctx.fill();
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.lineCap = 'round'; ctx.lineWidth = 4.4 + 2.4 * k; ctx.strokeStyle = 'rgba(40,24,8,0.6)'; ctx.stroke();   // contorno escuro (aparece no chão claro)
    ctx.lineWidth = 2.2 + 2.4 * k; ctx.strokeStyle = 'rgba(' + (sh ? '255,214,120' : '235,240,250') + ',' + (0.85 + 0.15 * k) + ')'; ctx.stroke(); ctx.restore(); }
  ctx.save();
  if (false) for (const z of ['top', 'L', 'R', 'low']) { const [x, y] = spots[z], on = G.pz === z; ctx.beginPath(); ctx.arc(x, y, on ? 5.5 : 3.5, 0, 7); ctx.fillStyle = on ? (sh ? 'rgba(240,210,120,0.95)' : 'rgba(220,220,230,0.9)') : 'rgba(30,24,16,0.45)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = on ? 'rgba(80,50,10,0.9)' : 'rgba(240,226,190,0.5)'; ctx.stroke(); }
  if (sh) { const hp = me.shp ?? 100; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 14, cy + 34, 28, 3); ctx.fillStyle = hp > 50 ? '#c8a050' : hp > 20 ? '#d8803a' : '#d84a3a'; ctx.fillRect(cx - 14, cy + 34, 28 * hp / 100, 3); }
  ctx.restore();
}
