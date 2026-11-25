// ============================================================
//  RUA DOS PRAZERES — Termas de Aurora
//  entrada paga com a Lívia (de graça para quem tem título), piscina quente que cura,
//  piscinas frias que revigoram, e nobres que vêm ao banho e soltam boatos no vapor
// ============================================================
const THERMAE_FEE = 15, THERMAE_HOURS = [16, 18], TH_MASSAGE = 25, TH_WINE = 12;

// ---------------- SERVIDOR ----------------
function thermaeBi() { return BUILDINGS.findIndex(b => b.kind === 'baths'); }
/* piscinas pela planta (THERMAE, em world.js): quente, do pátio (morna) e fria */
function thermaePools() { return THERMAE.pools; }
function thermaePoolAt(x, y) { const b = BUILDINGS[thermaeBi()]; if (!b) return null; const [u, v] = worldToLocal(b, x, y); for (const q of THERMAE.pools) if (u > q.u0 + 0.1 && u < q.u1 - 0.1 && v > q.v0 + 0.1 && v < q.v1 - 0.1) return q; return null; }
function thPoolCenter(k) { const b = BUILDINGS[thermaeBi()], q = THERMAE.pools.find(z => z.k === k); return localToWorld(b, (q.u0 + q.u1) / 2, (q.v0 + q.v1) / 2); }
function thUnderFall(x, y) { const b = BUILDINGS[thermaeBi()]; if (!b) return false; const [u, v] = worldToLocal(b, x, y), f = THERMAE.fall; return u > f.u0 && u < f.u1 && v > f.v0 && v < f.v1; }
function pzRec() { S.estate.praz = S.estate.praz || { pass: {}, talk: {} }; return S.estate.praz; }
function thFree(p) { return typeof crownRec === 'function' && (crownRec().title[crownKey(p)] | 0) >= 1; }
function thPass(p) { return !!p.dev || thFree(p) || pzRec().pass[estOwner(p)] === estDay(); }
function thKeeperPos() { const b = BUILDINGS[thermaeBi()]; return b ? localToWorld(b, THERMAE.keeper[0], THERMAE.keeper[1]) : null; }
const TH_STAFF = { mass: { id: 'pz_dario', kind: 'masseur', name: 'Dario, o Massagista', at: [2.4, 9.6] }, wine: { id: 'pz_nico', kind: 'cupbearer', name: 'Nico, o Copeiro', at: [1.5, 13.6] } };
function thSpawn() { const b0 = BUILDINGS[thermaeBi()]; if (b0) for (const k in TH_STAFF) { const T = TH_STAFF[k]; if (S.npcs[T.id]) continue; const [x, y] = localToWorld(b0, T.at[0], T.at[1]), n = { id: T.id, kind: T.kind, name: T.name, transient: true, court: 'praz', x, y, z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false, dir: 0 }; S.npcs[n.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
  if (S.npcs.pz_livia) return; const P = thKeeperPos(); if (!P) return; const n = { id: 'pz_livia', kind: 'bathkeeper', name: 'Lívia, a Banhista', transient: true, court: 'praz', x: P[0], y: P[1], z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false, dir: 0 }; S.npcs[n.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
/* nobres no banho: o lorde e o herdeiro de uma ou duas casas por dia, das 16h às 18h, sentados na piscina quente */
function thVisiting(house) { const k = HOUSES.findIndex(h => h.id === house), h = empHour(); return k >= 0 && h >= THERMAE_HOURS[0] && h < THERMAE_HOURS[1] && (estDay() + k) % 3 === 0; }
function thNoblePost(n) {
  if (n.hrole !== 'lord' && n.hrole !== 'heir') return null; if (!thVisiting(n.house)) return null;
  const b = BUILDINGS[thermaeBi()], q = THERMAE.pools[0]; if (!b) return null; const k = HOUSES.findIndex(h => h.id === n.house), lord = n.hrole === 'lord';
  const W = q.u1 - q.u0, Hq = q.v1 - q.v0, [x, y] = W > Hq ? localToWorld(b, q.u0 + 0.9 + (k % 5) * (W - 1.8) / 4, lord ? q.v0 + 0.75 : q.v1 - 0.75) : localToWorld(b, lord ? q.u0 + 0.75 : q.u1 - 0.75, q.v0 + 0.9 + (k % 5) * (Hq - 2.6) / 4); return { x, y, fl: 0, out: 1 }; }   /* enfileirados na água: lordes de um lado, herdeiros do outro */
function thNoblesIn() { return Object.values(S.npcs).filter(n => n.court === 'house' && !n.dead && !n.downed && (n.hrole === 'lord' || n.hrole === 'heir') && thVisiting(n.house) && thermaePoolAt(n.x, n.y)); }
/* salas e portas das Termas (quadro local), para os atendentes andarem pelas passagens */
const TH_DOORS = { 'vest|morna': [1.5, 15], 'vest|patio': [5.5, 15], 'vest|fria': [10.5, 15], 'quente|morna': [1.5, 7], 'quente|patio': [5.5, 7], 'quente|fria': [10.5, 7], 'morna|patio': [3, 11], 'patio|fria': [8, 13] };
function thRoom(u, v) { return v < 7 ? 'quente' : v >= 15 ? 'vest' : u < 3 ? 'morna' : u < 8 ? 'patio' : 'fria'; }
function thRoute(u0, v0, u1, v1) { const a = thRoom(u0, v0), b = thRoom(u1, v1), pts = [];
  if (a !== b) { const prev = { [a]: null }, q = [a]; while (q.length) { const r = q.shift(); if (r === b) break; for (const k in TH_DOORS) { const [x, y] = k.split('|'), o = x === r ? y : y === r ? x : null; if (o && !(o in prev)) { prev[o] = [r, TH_DOORS[k]]; q.push(o); } } }
    const rev = []; let r = b; while (prev[r]) { rev.push(prev[r][1]); r = prev[r][0]; } rev.reverse().forEach(d => pts.push(d)); }
  pts.push([u1, v1]); return pts; }
function thSend(n, u1, v1, onArrive) { const b = BUILDINGS[thermaeBi()], [u0, v0] = worldToLocal(b, n.x, n.y); n.pzGo = { pts: thRoute(u0, v0, u1, v1).map(([u, v]) => localToWorld(b, u, v)), i: 0, onArrive }; }
function thStaffMove(now) { const dt = Math.min(0.5, (now - (S.pzMv || now)) / 1000); S.pzMv = now;
  for (const k in TH_STAFF) { const n = S.npcs[TH_STAFF[k].id], G0 = n && n.pzGo; if (!G0) continue; const [tx, ty] = G0.pts[G0.i], d = dist(n.x, n.y, tx, ty), st = 2.1 * dt;
    if (d <= st + 0.02) { n.x = tx; n.y = ty; if (++G0.i >= G0.pts.length) { n.pzGo = null; n.walk = false; if (G0.onArrive) G0.onArrive(); } } else { n.x += (tx - n.x) / d * st; n.y += (ty - n.y) / d * st; n.dir = dirFromVecS(tx - n.x, ty - n.y); n.walk = true; } } }
/* ponto no piso, na beira da piscina, mais perto do banhista */
function thEdgeNear(pl, n) { const b = BUILDINGS[thermaeBi()], [u, v] = worldToLocal(b, pl.x, pl.y), q = thermaePoolAt(pl.x, pl.y); if (!q) return null; const cu = clamp(u, q.u0 + 0.4, q.u1 - 0.4), cv = clamp(v, q.v0 + 0.4, q.v1 - 0.4);
  const cand = [[q.u0 - 0.45, cv], [q.u1 + 0.45, cv], [cu, q.v0 - 0.45], [cu, q.v1 + 0.45]].filter(([a, c]) => { const [x, y] = localToWorld(b, a, c); return canStand(x, y, 0, 0.2) && !thermaePoolAt(x, y); });
  const [nu, nv] = n ? worldToLocal(b, n.x, n.y) : [u, v], sc = ([a, c]) => { const R = thRoute(nu, nv, a, c), from = R.length > 1 ? R[R.length - 2] : [nu, nv]; return Math.hypot(a - u, c - v) + 0.7 * Math.hypot(a - from[0], c - from[1]); };   /* a beira perto do banhista e do lado por onde o atendente chega, para ele não atravessar a água */
  cand.sort((A, B) => sc(A) - sc(B)); return cand[0] || null; }
function thWineGive(p, now) { p.thWine = 0; p.food = Math.min(100, (p.food ?? 100) + 25); p.water = Math.min(100, (p.water ?? 100) + 20); p.buffs.warm = Math.max(p.buffs.warm || 0, now + 300000); p.buffs.tipsy = Math.max(p.buffs.tipsy || 0, now) + 45000; p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 60); tell(p, 'Vinho e frutas: fome e sede aliviadas, fôlego recuperado, e um calorzinho que sobe à cabeça.'); sendStat(p); }
function thStand(p) { if (!p.thSit) return; p.thSit = null; if (p.sit === 'g') p.sit = null; near(p.x, p.y, { t: 'bath', id: p.id, on: 0 }); }
function thLeave(p, W, now) {
  p.thw = null; thStand(p); if (!W.paid) return;
  if (W.k === 'hot' && W.n >= 15) { p.buffs.rested = now + 600000; p.buffs.warm = Math.max(p.buffs.warm || 0, now + 300000); tell(p, 'Banho tomado nas Termas: Bem descansado (10 min: recupera vida e mana mais rápido e ganha um pouco mais de experiência) e quentinho por 5 minutos.'); sendStat(p); } }
function prazTick(now) {
  if (!S.estate || thermaeBi() < 0) return; thStaffMove(now); if (now - (S.pzT || 0) < 250) return; S.pzT = now; thSpawn();
  for (const p of Object.values(S.players)) { const P = (p.fl || 0) === 0 && !p.downed ? thermaePoolAt(p.x, p.y) : null, W = p.thw;
    if (p.thSit && (!p.sit || !P)) thStand(p);   /* andou: levanta */
    if (p.thMass) { const M = p.thMass; if (!p.sit || p.downed) { p.thMass = null; { const b1 = BUILDINGS[thermaeBi()], [bx, by] = localToWorld(b1, 2.5, 9.6); p.x = bx; p.y = by; Net.toOne(p.id, { t: 'tp', x: bx, y: by, z: 0, fl: 0, fb: -1 }); } near(p.x, p.y, { t: 'pzfx', k: 'mass', id: p.id, on: 0 }); tell(p, 'Você se levantou e a massagem ficou pela metade.'); }
      else if (now >= M.until) { p.thMass = null; p.sit = null; p.buffs.rested = now + 600000; p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3)); p.cst = cstMaxOf(p); if (p.body) for (const k in p.body) p.body[k] = Math.min(100, p.body[k] + 30); if (p.bleed) for (const k in p.bleed) p.bleed[k] = 0;
        const b1 = BUILDINGS[thermaeBi()], [bx, by] = localToWorld(b1, 2.5, 9.6); p.x = bx; p.y = by; Net.toOne(p.id, { t: 'tp', x: bx, y: by, z: 0, fl: 0, fb: -1 }); near(p.x, p.y, { t: 'pzfx', k: 'mass', id: p.id, on: 0 }); tell(p, 'Massagem com óleo: Bem descansado por 10 minutos, fôlego cheio e os ferimentos do corpo aliviados.'); sendStat(p); } continue; }
    if (p.thWine && now >= p.thWine) { const nn = S.npcs.pz_nico; if (nn && typeof empSay === 'function' && !nn.pzGo) empSay(nn, 'Vinho de Solmire e figos frescos. Saúde!'); thWineGive(p, now); }   /* servido no balcão (ou, se o Nico não chegou em 30 s, entregue assim mesmo) */
    if (!P) { if (W) thLeave(p, W, now); continue; }
    if (!W || W.k !== P.k) { if (W) thLeave(p, W, now); const paid = thPass(p); p.thw = { k: P.k, t0: now, tick: now, n: 0, paid, talk: now + 8000 };
      if (!paid) tell(p, 'A água é para quem pagou a entrada: fale com a Lívia na porta (' + THERMAE_FEE + ' de ouro; quem tem título entra de graça).');
      if (p.burnUntil > now) extinguish(p, 'A água das Termas apagou o fogo da sua roupa.');
      if (paid && !p.sheathed && typeof sheatheToggle === 'function') sheatheToggle(p, true, true); continue; }
    if (now - W.tick < 1000) continue; W.tick = now; if (!W.paid) { if (thPass(p)) W.paid = true; else continue; } W.n++;
    const rest = p.thSit ? 1.5 : 1;   /* sentado no banco ou boiando, a água rende mais */
    if (W.k === 'sky') { p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * 0.01 * rest))); p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 8 * rest); if (p.thSit && p.thSit.mode === 'float' && (W.fl = (W.fl || 0) + 1) === 20) { p.buffs.rested = Math.max(p.buffs.rested || 0, now + 300000); tell(p, 'Você boiou sem pressa: Bem descansado por 5 minutos.'); } }   /* piscina do pátio: morna, para nadar e descansar o fôlego */
    else if (W.k === 'hot') { p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * 0.02 * rest))); p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 10 * rest); p.cold = 0;
      if (p.bleed) for (const k in p.bleed) p.bleed[k] = 0; if (p.infect === 1 && W.n > 5) { p.infect = 0; p.infT = 0; tell(p, 'A água quente limpou as feridas: a febre passou.'); }
      if (now >= W.talk) { W.talk = now + 20000; const L = thNoblesIn().filter(n => dist(n.x, n.y, p.x, p.y) < 6); if (L.length) thGossip(p, L[Math.floor(Math.random() * L.length)]); } }
    else { p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 6);
      if (!p.thSit && thUnderFall(p.x, p.y)) { W.fall = (W.fall || 0) + 1; if (p.body) for (const k in p.body) p.body[k] = Math.min(100, p.body[k] + 5); if (W.fall === 6) { p.buffs.loose = now + 300000; tell(p, 'A queda da cascata bate nos ombros e desfaz os nós: Corpo solto (5 min: você recebe 10% menos dano) e os membros machucados melhoram.'); } }   /* debaixo da cascata */
      if (W.n === 5) { p.cst = cstMaxOf(p); p.buffs.brisk = now + 300000; p.buffs.warm = 0; tell(p, 'A água fria desperta o corpo: Revigorado (5 min: fôlego cheio agora e você anda 8% mais rápido).'); } }
    sendStat(p); }
}
/* conversa no vapor: o nobre comenta uma notícia das casas; uma vez por dia por casa, a conversa rende um pouco de simpatia */
function thGossip(p, n) {
  const H = typeof hRec === 'function' ? hRec() : null, hs = HOUSES.find(h => h.id === n.house), news = H && H.news && H.news.length ? H.news[Math.floor(Math.random() * Math.min(6, H.news.length))][1] : null;
  const lines = news ? ['Soube da última? ' + news, 'Dizem pela cidade: ' + news, 'Aqui entre nós, no vapor: ' + news] : ['Nada como a água quente para esquecer a corte.', 'Aqui ninguém carrega espada. É o único lugar honesto da cidade.'];
  const say = lines[Math.floor(Math.random() * lines.length)]; if (typeof empSay === 'function') empSay(n, say); else tell(p, n.name + ': ' + say);
  const R = pzRec(), k = estOwner(p); R.talk[k] = R.talk[k] || {}; if (R.talk[k][n.house] !== estDay() && typeof hFavor === 'function') { R.talk[k][n.house] = estDay(); hFavor(p, n.house, 2, 'conversa nas Termas'); tell(p, 'A conversa no vapor agradou: +2 de simpatia com a ' + (hs ? hs.n : 'casa') + '.'); }
}
function thAct(p, m) {   /* dentro d'água: sentar, boiar, levantar, pedir vinho; fora: massagem e vinho com os atendentes */
  const now = now_(), P = (p.fl || 0) === 0 && !p.downed ? thermaePoolAt(p.x, p.y) : null, dario = S.npcs.pz_dario, nico = S.npcs.pz_nico;
  if (m.a === 'stand') { thStand(p); return; }
  if (m.a === 'sit' || m.a === 'float') { if (!P) return; if (!thPass(p)) { tell(p, 'Pague a entrada com a Lívia primeiro.'); return; } if (m.a === 'float' && P.k !== 'sky') { tell(p, 'Para boiar, vá à piscina grande do pátio.'); return; }
    const mode = m.a === 'float' ? 'float' : 'seat'; p.thSit = { mode }; p.sit = 'g'; p.walking = false; if (p.atk) p.atk = null; near(p.x, p.y, { t: 'bath', id: p.id, on: 1, x: p.x, y: p.y, mode, dir: p.dir }); return; }
  if (m.a === 'wine') { const inB = WORLD.bld[tileAt(p.x, p.y)] === thermaeBi(); if (!inB || !nico) return; if (!P && dist(p.x, p.y, nico.x, nico.y) > 3.5) { tell(p, 'Chegue perto do Nico, ou peça de dentro da piscina.'); return; }
    if (p.thWine) { tell(p, 'O Nico já está trazendo.'); return; } if ((p.gold || 0) < TH_WINE) { empSay(nico, 'O vinho custa ' + TH_WINE + ' de ouro, e fiado não sirvo.'); return; }
    if (P && nico.pzGo) { empSay(nico, 'Já vou! Estou servindo outro banhista.'); return; }
    p.gold -= TH_WINE; sendStat(p);
    const E = P ? thEdgeNear(p, nico) : null; if (!E) { p.thWine = now + 3500; empSay(nico, 'Um instante.'); return; }
    p.thWine = now + 30000; empSay(nico, 'Já levo à beira da piscina!'); const pid = p.id, home = TH_STAFF.wine.at;
    thSend(nico, E[0], E[1], () => { const q = S.players[pid], t2 = now_(), b2 = BUILDINGS[thermaeBi()], [tu, tv] = [E[0], E[1]], [wx, wy] = localToWorld(b2, tu, tv); near(wx, wy, { t: 'pzfx', k: 'tray', x: wx, y: wy, ms: 60000 }); empSay(nico, 'Vinho de Solmire e figos frescos. Saúde!'); if (q && q.thWine) thWineGive(q, t2);
      setTimeout(() => { if (S.npcs.pz_nico) thSend(S.npcs.pz_nico, home[0], home[1], null); }, 1800); }); return; }
  if (m.a === 'massage') { if (!dario || dist(p.x, p.y, dario.x, dario.y) > 3.5 || P) { tell(p, 'Chegue perto do Dario, na sala morna.'); return; } if (p.thMass) return;
    if (Object.values(S.players).some(q => q !== p && q.thMass)) { empSay(dario, 'Um de cada vez. Espere a mesa vagar.'); return; } if ((p.gold || 0) < TH_MASSAGE) { empSay(dario, 'A massagem custa ' + TH_MASSAGE + ' de ouro.'); return; }
    p.gold -= TH_MASSAGE; const b1 = BUILDINGS[thermaeBi()], [tx, ty] = localToWorld(b1, 1.4, 8.5), [hx, hy] = localToWorld(b1, 0.4, 8.5); p.x = tx; p.y = ty; p.dir = dirFromVecS(hx - tx, hy - ty); p.sit = 'g'; p.walking = false; if (!p.sheathed && typeof sheatheToggle === 'function') sheatheToggle(p, true, true);
    Net.toOne(p.id, { t: 'tp', x: tx, y: ty, z: 0, fl: 0, fb: -1 }); p.thMass = { until: now + 8000 }; near(p.x, p.y, { t: 'pzfx', k: 'mass', id: p.id, on: 1, ms: 8000, dir: p.dir }); empSay(dario, 'Deite-se. O óleo de oliva e o estrígil fazem o resto.'); sendStat(p);
    { const [sx, sy] = localToWorld(b1, 1.5, 9.1); dario.x = sx; dario.y = sy; dario.dir = dirFromVecS(tx - sx, ty - sy); const go = () => { if (S.players[p.id] && p.thMass) near(dario.x, dario.y, { t: 'anim', w: 'n', id: dario.id, a: 'massage', ms: 4000, tx, ty }); }; go(); setTimeout(go, 4000); setTimeout(() => { if (S.npcs.pz_dario) thSend(S.npcs.pz_dario, TH_STAFF.mass.at[0], TH_STAFF.mass.at[1], null); }, 8600); } return; }
  if (m.a === 'talk') { const who = m.who === 'mass' ? dario : nico; if (!who || dist(p.x, p.y, who.x, who.y) > 4) return; Net.toOne(p.id, { t: 'pzmenu', k: m.who === 'mass' ? 'mass' : 'wine', cost: m.who === 'mass' ? TH_MASSAGE : TH_WINE }); }
}
function prazMsg(p, m) {
  if (m.a !== 'open' && m.a !== 'pay') { thAct(p, m); return; }
  const n = S.npcs.pz_livia; if (!n || dist(p.x, p.y, n.x, n.y) > 4 || (p.fl || 0) !== 0) return;
  if (m.a === 'pay') { if (thPass(p)) { tell(p, 'Você já tem a entrada de hoje.'); }
    else if ((p.gold || 0) < THERMAE_FEE) { empSay(n, 'A entrada custa ' + THERMAE_FEE + ' de ouro, meu bem. Volte quando tiver.'); }
    else { p.gold -= THERMAE_FEE; pzRec().pass[estOwner(p)] = estDay(); if (typeof estateSave === 'function') estateSave(); empSay(n, 'Seja bem-vindo às Termas de Aurora. A sala quente fica de um lado, a fria do outro, e o pátio em frente.'); sendStat(p); } }
  const nob = HOUSES.filter(h => thVisiting(h.id)).map(h => h.n), next = HOUSES.filter(h => (estDay() + HOUSES.indexOf(h)) % 3 === 0).map(h => h.n);
  Net.toOne(p.id, { t: 'pzmenu', k: 'th', fee: THERMAE_FEE, pass: thPass(p), free: thFree(p), nob, today: next, h: THERMAE_HOURS });
}

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  NPC_LOOKS.bathkeeper = () => Object.assign(heroLook('mage', 'adept', '#efe9da'), { armor: 'robe', body: tone('#efe9da'), body2: tone('#7fb7c4'), accent: tone('#c9a24a'), trim: tone('#7fb7c4'), head: 'none', hair: tone('#5a3a22'), hairStyle: 'long', weapon: null, capeTone: null, cape: false, shield: null, barefoot: true });
  NPC_LOOKS.masseur = () => Object.assign(heroLook('knight', 'iron', '#efe9da'), { armor: 'bare', body: tone('#c8946a'), body2: tone('#c8946a'), legs: tone('#c8946a'), boots: tone('#c8946a'), skin: tone('#c8946a'), head: 'none', hair: tone('#2a1c12'), hairStyle: 'short', beard: tone('#2a1c12'), weapon: null, shield: null, cape: false, pauldron: null, trunks: '#efe9da' });
  NPC_LOOKS.cupbearer = () => Object.assign(heroLook('archer', 'scout', '#7a3a2a'), { armor: 'vest', body: tone('#efe9da'), body2: tone('#7a3a2a'), accent: tone('#c9a24a'), legs: tone('#efe9da'), head: 'none', hair: tone('#6a4a2a'), hairStyle: 'short', beard: null, weapon: null, quiver: false, shield: null, cape: false });
  if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { bathkeeper: 'mage', masseur: 'knight', cupbearer: 'archer' }); }
function prazWho() { const me = G.me; if (!me || me.downed || (me.fl || 0)) return null; for (const [k, id] of [['mass', 'pz_dario'], ['wine', 'pz_nico']]) { const e = G.npcs[id]; if (e && !e.dead && Math.hypot(e.rx - me.x, e.ry - me.y) < 2.2) return k; } return null; }
function prazInPool() { const me = G.me; return !!(me && !me.downed && !(me.fl || 0) && thermaePoolAt(me.x, me.y)); }
function prazPanel(title, text, btns) { let d = $('tequip'); if (d) d.remove(); d = document.createElement('div'); d.id = 'tequip'; d.className = 'gpanel';
  d.innerHTML = '<div class="gp-head"><span>' + title + '</span><button class="gp-x" data-x>✕</button></div><div class="est-cost">' + text + '</div><div class="tq-btns">' + btns.map(([a, t, s], i) => '<button class="est-btn" data-i="' + i + '">' + t + '<small>' + s + '</small></button>').join('') + '</div>';
  document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove(); d.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const a = btns[+b.dataset.i][0]; d.remove(); G.path = null; G.pathGoal = null; Net.send({ t: 'praz', a }); }); }
function prazPoolMenu() { const me = G.me, q = thermaePoolAt(me.x, me.y); if (!q) return; if (me.bathing) { Net.send({ t: 'praz', a: 'stand' }); return; }
  const nm = { hot: 'Piscina quente', sky: 'Piscina do pátio', cold: 'Tanque frio' }[q.k], btns = [['sit', 'Sentar no banco', 'com a água no peito; a água rende mais']]; if (q.k === 'sky') btns.push(['float', 'Boiar', 'de costas, sem pressa; 20 s deixam você descansado']); btns.push(['wine', 'Pedir vinho e frutas', TH_WINE + ' de ouro; o Nico traz à beira']);
  prazPanel(nm, q.k === 'cold' ? 'Fique de pé debaixo da cascata por 6 s para soltar o corpo.' : 'Andar ou apertar F de novo faz você se levantar.', btns); }

function prazNear() { const me = G.me; if (!me || me.downed) return null; const e = G.npcs.pz_livia; if (!e || e.dead || (me.fl || 0)) return null; return Math.hypot(e.rx - me.x, e.ry - me.y) < 2.4 ? e : null; }
function prazMenu(m) {
  let d = $('tequip'); if (d) d.remove(); d = document.createElement('div'); d.id = 'tequip'; d.className = 'gpanel';
  const who = m.nob.length ? 'Agora no banho: <b>' + m.nob.join('</b> e <b>') + '</b>.' : m.today.length ? 'Hoje, das ' + m.h[0] + 'h às ' + m.h[1] + 'h, vêm ao banho: <b>' + m.today.join('</b> e <b>') + '</b>.' : 'Hoje nenhuma casa nobre marcou banho.';
  d.innerHTML = '<div class="gp-head"><span>Termas de Aurora</span><button class="gp-x" data-x>✕</button></div><div class="est-cost">“A quente cura e descansa; as frias despertam. Deixe as armas e as mágoas na porta.”<br><br><b>Sala quente</b>: a piscina funda recupera vida e fôlego, estanca o sangue e limpa feridas. Fique 15 s para sair Bem descansado.<br><b>Sala fria</b>: 5 s no tanque da cascata deixam você Revigorado.<br><b>Pátio</b>: a piscina grande, morna, para nadar.<br>' + who + ' Quem divide o banho com um nobre ouve boatos e ganha a simpatia da casa.</div>' +
    '<div class="tq-btns">' + (m.pass ? '<button class="est-btn on" disabled>' + (m.free ? 'Entrada livre<small>cortesia para quem tem título</small>' : 'Entrada paga<small>vale até o fim do dia</small>') + '</button>' : '<button class="est-btn" data-pay>Pagar a entrada<small>' + m.fee + ' de ouro · vale o dia todo</small></button>') + '</div>';
  document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove(); const b = d.querySelector('[data-pay]'); if (b) b.onclick = () => Net.send({ t: 'praz', a: 'pay' });
}
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _pePz = progEvent; progEvent = function (m, now) {
  if (m.t === 'pzmenu') { if (m.k === 'mass') prazPanel('Dario, o Massagista', '“Óleo de oliva, mãos firmes e o estrígil para raspar o cansaço.”<br><br>A massagem leva 8 s na mesa de mármore. Deixa você <b>Bem descansado</b> por 10 minutos, enche o fôlego, recupera 30% da vida e alivia os ferimentos do corpo.', [['massage', 'Deitar na mesa', m.cost + ' de ouro']]); else if (m.k === 'wine') prazPanel('Nico, o Copeiro', '“Vinho de Solmire, figos e uvas. Sirvo aqui ou à beira da piscina.”<br><br>Mata a fome e a sede, recupera fôlego e aquece. O vinho sobe um pouco à cabeça.', [['wine', 'Vinho e frutas', m.cost + ' de ouro']]); else prazMenu(m); return true; }
  if (m.t === 'pzfx' && m.k === 'tray') { G.thTrays = (G.thTrays || []).filter(t => t.until > performance.now()); G.thTrays.push({ x: m.x, y: m.y, t0: performance.now(), until: performance.now() + (m.ms || 60000) }); return true; }
  if (m.t === 'pzfx' && m.k === 'mass') { const e = G.players[m.id]; if (e) { e.thMass = m.on ? { until: performance.now() + (m.ms || 8000), t0: performance.now(), dir: m.dir | 0 } : null; if (e === G.me && m.on) { G.path = null; G.pathGoal = null; } } return true; }
  return _pePz(m, now); }; }
/* nobres no banho trocam a roupa pela sunga na cor da casa (só o desenho; vale enquanto estão dentro da piscina) */
if (typeof NPC_LOOKS !== 'undefined' && typeof HOUSES !== 'undefined' && typeof G !== 'undefined') {
  for (const h of HOUSES) for (const role of ['lord', 'heir']) { const k0 = 'hh_' + role + '_' + h.id; NPC_LOOKS['hb_' + role + '_' + h.id] = () => { const L = NPC_LOOKS[k0] ? NPC_LOOKS[k0]() : heroLook('knight', 'iron', h.c1), sk = L.skin || tone('#d8a47a'); return Object.assign(L, { armor: 'bare', body: sk, body2: sk, legs: sk, boots: sk, head: 'none', cape: false, capeTone: null, weapon: null, shield: null, pauldron: null, quiver: false, extra: null, pattern: null, trunks: h.c1 }); }; if (typeof NPC_CLS !== 'undefined' && NPC_CLS[k0]) NPC_CLS['hb_' + role + '_' + h.id] = NPC_CLS[k0]; }
  setInterval(() => { if (!G.npcs || !G.started) return; for (const id in G.npcs) { const e = G.npcs[id], k = e.kind || ''; if (!/^h[hb]_(lord|heir)_/.test(k)) continue; const inP = !(e.fl || 0) && thermaePoolAt(e.rx, e.ry), want = (inP ? 'hb_' : 'hh_') + k.slice(3); if (want !== k) e.kind = want; } }, 400);
}
/* piscina funda: o corpo desce até o fundo e a linha d'água corta na cintura */
function thSinkPx() { return 21; }   /* em pontos do desenho: o corpo tem perto de 46 de altura, então a linha d'água fica na cintura */
function thWadeNpc(ctx, e, sx, sy, now) { const sink = thSinkPx(), wy = sy + 2;
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 60, sy - 160, 120, 160 + 2); ctx.clip(); drawHeroEntity(ctx, e, sx, sy + sink, now); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 60, wy, 120, 80); ctx.clip(); ctx.globalAlpha = 0.3; drawHeroEntity(ctx, e, sx, sy + sink, now); ctx.restore();
  ctx.save(); ctx.lineWidth = 0.4; const ph = (now / 1500 + (e.rx || 0)) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - ph)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sx, wy + 1, 5 + ph * 9, 1.8 + ph * 3, 0, 0, 7); ctx.stroke(); ctx.restore(); }
/* água em movimento por cima do desenho parado: jorros das bocas de leão, cortina da cascata, espuma, brilho nas piscinas e vapor */
function drawThermaeFx(ctx, b, now) {
  const now0 = performance.now(), T = now / 1000, U = 25, S2 = (u, v, hgt) => { const [x, y] = localToWorld(b, u, v), q = iso(x, y); return [q.sx + G.view.ox, q.sy + G.view.oy - (hgt || 0) * U]; }, PL = THERMAE.pools, hot = PL[0];
  for (const t of G.thTrays || []) { const left = t.until - now0, al = Math.min(1, (now0 - t.t0) / 300) * Math.min(1, left / 800); if (left <= 0) continue; const q0 = iso(t.x, t.y), x = q0.sx + G.view.ox, y = q0.sy + G.view.oy - 2;   /* bandeja de prata com a jarra, duas taças e as frutas */
    ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 1.5, 9, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c9c4b8'; ctx.beginPath(); ctx.ellipse(x, y, 8.5, 3.8, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(x - 4.6, y - 0.5); ctx.lineTo(x - 5.2, y - 6.5); ctx.lineTo(x - 4, y - 8.5); ctx.lineTo(x - 2.4, y - 8.5); ctx.lineTo(x - 1.4, y - 6.5); ctx.lineTo(x - 2, y - 0.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5a2418'; ctx.fillRect(x - 4, y - 9.4, 1.6, 1.2);
    for (const cx2 of [0.6, 3.4]) { ctx.fillStyle = '#d4a94a'; ctx.beginPath(); ctx.moveTo(x + cx2 - 1.3, y - 4.2); ctx.lineTo(x + cx2 + 1.3, y - 4.2); ctx.lineTo(x + cx2 + 0.5, y - 1.8); ctx.lineTo(x + cx2 - 0.5, y - 1.8); ctx.closePath(); ctx.fill(); ctx.fillRect(x + cx2 - 0.3, y - 1.8, 0.6, 1.4); ctx.fillStyle = '#6a1a2a'; ctx.fillRect(x + cx2 - 1, y - 4.2, 2, 0.7); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#5a2a6a' : '#6a3a82'; ctx.beginPath(); ctx.arc(x + 5 + (i % 3) * 1.3 - 1, y - 0.6 - Math.floor(i / 3) * 1.2 + 1.2, 0.9, 0, 7); ctx.fill(); } ctx.fillStyle = '#c8802a'; ctx.beginPath(); ctx.arc(x + 1.6, y + 1.6, 1.2, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.lineCap = 'round';
  for (const q of PL) { const n = Math.round((q.u1 - q.u0) * (q.v1 - q.v0) / 2.2); for (let i = 0; i < n; i++) { const ph = (T * 0.22 + i * 0.37) % 1, u = q.u0 + 0.4 + ((i * 53) % 100) / 100 * (q.u1 - q.u0 - 0.8), v = q.v0 + 0.4 + ((i * 29) % 100) / 100 * (q.v1 - q.v0 - 0.8) + Math.sin(T * 0.6 + i) * 0.12, [x, y] = S2(u, v, -0.1); ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 * Math.sin(ph * Math.PI)).toFixed(2) + ')'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(x, y, 3 + ph * 5, 1 + ph * 1.6, 0, 0.3, 2.8); ctx.stroke(); } }   /* brilhos correndo na água */
  const LB = THERMAE.lionWall === 'back', LS = (d, z, hh) => LB ? S2(z, d, hh) : S2(d, z, hh);   /* leões na parede do fundo: a distância da parede corre em v */
  for (const z of THERMAE.lions) { const x0 = 0.44, y0 = 0.98, x1 = (LB ? hot.v0 : hot.u0) + 0.75, y1 = -0.1; for (let i = 0; i < 6; i++) { const a = ((T * 1.5 + i / 6 + z) % 1), [x, y] = LS(x0 + (x1 - x0) * a, z, y0 + (y1 - y0) * a * a); ctx.fillStyle = 'rgba(255,255,255,' + (0.9 - a * 0.3).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(x, y, 1.3, 2.2 + a * 1.5, 0, 0, 7); ctx.fill(); }
    for (let i = 0; i < 2; i++) { const ph = (T * 1.2 + i * 0.5 + z) % 1, [x, y] = LS(x1, z, -0.1); ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x, y, 2 + ph * 9, 0.8 + ph * 3.6, 0, 0, 7); ctx.stroke(); } }
  { const CF = !!THERMAE.cascFlip, c0 = THERMAE.casc, c = CF ? { u0: c0.u0, u1: c0.u1, v0: c0.v1, v1: c0.v1 + 1 } : c0, SC = (u, v, hh) => CF ? S2((c.u0 + c.u1) - u, 2 * c0.v1 - v, hh) : S2(u, v, hh), W = c.u1 - c.u0, cx = (c.u0 + c.u1) / 2, zb = c.v1 - 0.1, L = [[1.45, 0.3, 0.7], [0.95, 0.56, 0.9], [0.45, 0.82, 1.0]];   /* cortina da cascata: fios brancos descendo de cada patamar */
    L.forEach(([yt, adv, wr], k) => { const yb = k < 2 ? L[k + 1][0] : -0.1, v = zb - adv - 0.2, ww = W * wr - 0.7, mx = cx + (k - 1) * 0.12; for (let i = 0; i < 16; i++) { const ph = (T * (1.6 + (i % 3) * 0.3) + i * 0.173) % 1, u = mx - ww / 2 + ((i * 61) % 100) / 100 * ww, [x, y] = SC(u, v, yt - (yt - yb) * ph), len = 3 + (i % 3) * 2; ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 - ph * 0.3).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke(); } });
    for (let i = 0; i < 12; i++) { const ph = (T * 0.9 + i * 0.29) % 1, u = cx - 1.1 + ((i * 47) % 100) / 100 * 2.2, [x, y] = SC(u, c.v0 - 0.25 - ph * 0.5, -0.1); ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * (1 - ph)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(x, y, 2.5 + ph * 4, 1.2 + ph * 1.6, 0, 0, 7); ctx.fill(); }   /* espuma no tanque */
    for (let i = 0; i < 6; i++) { const ph = (T * 0.35 + i * 0.17) % 1, [x, y] = SC(cx - 1 + i * 0.4, c.v0 - 0.2, 0.1 + ph * 0.9), g2 = ctx.createRadialGradient(x, y, 1, x, y, 13 + ph * 8); g2.addColorStop(0, 'rgba(235,246,252,' + (0.22 * (1 - ph)).toFixed(2) + ')'); g2.addColorStop(1, 'rgba(235,246,252,0)'); ctx.fillStyle = g2; ctx.fillRect(x - 22, y - 22, 44, 44); } }   /* névoa da queda */
  { const [lu, lv] = THERMAE.labrum; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, ph = (T * 1.3 + i * 0.21) % 1, [x, y] = S2(lu + Math.cos(a) * 0.62, lv + Math.sin(a) * 0.62, 0.85 - ph * 0.8); ctx.fillStyle = 'rgba(255,255,255,' + (0.8 - ph * 0.4).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(x, y, 0.9, 1.8, 0, 0, 7); ctx.fill(); } }   /* a bacia transbordando */
  for (let i = 0; i < 14; i++) { const ph = (T * 0.11 + i * 0.071) % 1, u = hot.u0 + 0.5 + ((i * 37) % 100) / 100 * (hot.u1 - hot.u0 - 1), v = hot.v0 + 0.5 + ((i * 59) % 100) / 100 * (hot.v1 - hot.v0 - 1), [x, y] = S2(u + Math.sin(T * 0.3 + i) * 0.3, v, 0.1 + ph * 1.5), R = 14 + ph * 16, g2 = ctx.createRadialGradient(x, y, 1, x, y, R); g2.addColorStop(0, 'rgba(255,255,255,' + (0.2 * Math.sin(ph * Math.PI)).toFixed(2) + ')'); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.fillRect(x - R, y - R, R * 2, R * 2); }   /* vapor da piscina quente */
  ctx.restore();
}
/* deitado de bruços na mesa de mármore, com o brilho do óleo */
function thMassDraw(ctx, e, sx, sy, now) { const s = massageSprite(e, e.thMass.dir, true), y0 = sy - s.ay - 17, t = (now - e.thMass.t0) / 1000;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(s.c, sx - s.ax, y0, s.w, s.h);
  for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i * 0.25) % 1; ctx.fillStyle = 'rgba(255,236,170,' + (0.7 * Math.sin(ph * Math.PI)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(sx - 8 + i * 5 + Math.sin(t + i) * 2, sy - 24 - (i % 2) * 3, 1.1, 0, 7); ctx.fill(); } ctx.restore(); }
