// ============================================================
//  GUARDIÃ DO MAGO (ent): a muda desperta e vira uma árvore que anda, luta e cresce
//  Carvalho (Terra), Salgueiro (Água) ou Cerejeira (Ar); 3 estágios; membros que caem e rebrotam
// ============================================================
const ENT_KIND = { earth: 'ent_oak', water: 'ent_willow', wind: 'ent_cherry' };
const ENT_NAME = { earth: 'Carvalho', water: 'Salgueiro', wind: 'Cerejeira' };
const ENT_NEED = [0, 45, 70, 90];   /* força da Terra para cada estágio */
const ENT_HP = [0, 260, 520, 1000], ENT_DMG = [0, [14, 24], [26, 40], [44, 66]];
const ENT_LOST = { armA: 2, armB: 4, legL: 8, legR: 16 };

// ---------------- SERVIDOR ----------------
function entList() { S.estate.ents = S.estate.ents || {}; return S.estate.ents; }
function entStageOf(p) { if (typeof elemStrength !== 'function') return 0; const v = elemStrength(p, 'earth'); return v >= ENT_NEED[3] ? 3 : v >= ENT_NEED[2] ? 2 : v >= ENT_NEED[1] ? 1 : 0; }
function entNid(key) { return 'ent_' + String(key).replace(/[^a-z0-9]/gi, '').slice(0, 24); }
function entPublic(key, r) { const n = S.npcs[entNid(key)]; return { id: entNid(key), k: r.k, st: r.st, lost: r.lost || 0, tw: r.tw || 0, sl: n && n.sleepEnt ? 1 : 0, own: r.ownName, hp: Math.round(n ? n.hp : r.hp), max: r.maxHp, dry: r.dry ? 1 : 0, mode: r.mode, fi: n && n.entFight ? 1 : 0, rg: r.ranged ? 1 : 0, rd: n && n.riddenBy ? n.riddenBy : 0 }; }
function entsSend(to) { const L = entList(), m = { t: 'ents', l: Object.keys(L).map(k => entPublic(k, L[k])) }; if (to) Net.toOne(to, m); else Net.toAll(m); }
function entSpawn(key, r) {
  const id = entNid(key); if (S.npcs[id]) return S.npcs[id];
  const n = { id, kind: ENT_KIND[r.k], name: ENT_NAME[r.k] + ' de ' + r.ownName, transient: true, entOf: key, x: r.x, y: r.y, z: 0, fl: 0, fb: -1, hp: r.hp, maxHp: r.maxHp, downed: null, dead: !!r.dry };
  S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n;
}
function entMsg(p, m) {
  const key = estOwner(p), L = entList();
  if (m.a === 'log') { entLogTake(p, m.id); return; }   /* recolher um galho caído */
  if (m.a === 'ride' || m.a === 'unride' || m.a === 'ratk') { entRide(p, m); return; }
  if (m.a === 'wake') {   /* despertar a muda (ritual de 8 s) */
    const sp = (S.estate.saps || []).find(s => s.owner === key); if (!sp) { tell(p, 'Você não tem uma muda plantada.'); return; }
    if (dist(p.x, p.y, sp.x, sp.y) > 3.6) { tell(p, 'Chegue perto da sua muda.'); return; }
    if (L[key] && !L[key].dry) { tell(p, 'Sua guardiã já está desperta. Só uma por vez.'); return; }
    const st = entStageOf(p); if (!st) { tell(p, 'A muda ainda não ouve você: a força da Terra precisa chegar a ' + ENT_NEED[1] + ' (agora ' + Math.floor(elemStrength(p, 'earth')) + ').'); return; }
    if (S.entWaking && S.entWaking[key]) return; (S.entWaking = S.entWaking || {})[key] = 1;
    p.sit = null; anim('p', p, 'kneelput', sp.x, sp.y); near(sp.x, sp.y, { t: 'entcut', x: sp.x, y: sp.y, k: sp.k, st, by: p.id }, VIEW_RADIUS + 6);
    setTimeout(() => { delete S.entWaking[key]; S.estate.saps = (S.estate.saps || []).filter(s => s !== sp); if (typeof sapsSend === 'function') sapsSend();
      const hp = ENT_HP[st]; L[key] = { k: sp.k, st, x: sp.x, y: sp.y, hp, maxHp: hp, lost: 0, tw: 0, regrow: {}, mode: 'follow', ownName: p.name, born: Date.now() }; estateSave();
      entSpawn(key, L[key]); useGain(p, 'el_earth', 6); entsSend(); }, 8000);
    return; }
  const r = L[key]; if (!r || r.dry) return; const n = S.npcs[entNid(key)]; if (!n) return;
  if (m.a === 'order') {
    if (dist(p.x, p.y, n.x, n.y) > 4 && m.o !== 'attack') { tell(p, 'Chegue perto da sua guardiã.'); return; }
    if (m.o === 'follow') { r.mode = 'follow'; r.post = null; r.ranged = 0; empSay(n, 'Vou com você, meu mago.'); }
    else if (m.o === 'ranged') { r.ranged = r.ranged ? 0 : 1; if (r.mode !== 'guard') r.mode = 'follow'; empSay(n, r.ranged ? 'Fico de longe e arremesso.' : 'Volto a lutar de perto.'); }   /* de longe: longe do fogo do mago */
    else if (m.o === 'guard') { r.mode = 'guard'; r.post = [n.x, n.y]; empSay(n, 'Ninguém passa por aqui.'); }
    else if (m.o === 'rest') { r.mode = 'rest'; empSay(n, 'Vou cochilar entre as árvores. Me chame quando precisar.'); }
    else if (m.o === 'attack') { const t = S.monsters[m.id]; if (!t) { tell(p, 'Escolha um inimigo.'); return; } r.mode = r.mode === 'attack' ? r.prevMode || 'follow' : r.mode; r.prevMode = r.mode; r.mode = 'attack'; n.entT = t.id; empSay(n, 'Deixa comigo!'); }
    estateSave(); entsSend(); }
}
let ENT_GROVES = null;
function entGrove(x, y) {   /* um grupo de árvores fora da cidade, perto, para dormir */
  if (!ENT_GROVES) { ENT_GROVES = []; const TR = new Set([O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW]); for (let ty = 4; ty < MAP_H - 4; ty += 3) for (let tx = 4; tx < MAP_W - 4; tx += 3) { let c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (TR.has(WORLD.obj[(ty + dy) * MAP_W + tx + dx])) c++; if (c >= 5 && !entNearCity(tx, ty) && WORLD.obj[ty * MAP_W + tx] === O.NONE) ENT_GROVES.push([tx + 0.5, ty + 0.5]); } }
  let best = null, bd = 1e9; for (const g of ENT_GROVES) { const d = dist(g[0], g[1], x, y); if (d < bd) { bd = d; best = g; } } return best || [x, y];
}
function entNearCity(x, y) { if (inSafe(x, y)) return true; for (const g of visGates()) if (dist(g[0], g[1], x, y) < 14) return true; return false; }   /* nunca chega perto dos portões */
function entHurt(n, r, dmg, src) {   /* dano na guardiã: pode perder um galho; morre como tronco seco (ou cinzas, se foi o fogo do dono) */
  if (r.dry || n.dead) return; n.hp -= dmg; r.hp = n.hp; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 420 }); sfx(n.x, n.y, '-' + Math.round(dmg), src === 'fire' ? '#ff9a4a' : '#ff8a6a');
  if (dmg > n.maxHp * 0.1 && Math.random() < 0.3) { const free = Object.keys(ENT_LOST).filter(k => !(r.lost & ENT_LOST[k])); if (free.length) { const k = free[Math.floor(Math.random() * free.length)]; r.lost |= ENT_LOST[k]; r.regrow[k] = Date.now() + ESTATE_DAY_MS; near(n.x, n.y, { t: 'entbreak', id: n.id, part: k, x: n.x, y: n.y }); entLogDrop(n, r, k); entsSend(); } }   /* um galho arrancado; rebrota em um dia do jogo */
  if (n.hp > 0) return;
  const q = Object.values(S.players).find(pp => estOwner(pp) === n.entOf), betrayed = src === 'fire' && q && n._lastFire === q.id;
  n.dead = true; r.dry = 1; r.hp = 0; estateSave();
  if (betrayed) {   /* queimada pelo próprio mestre: lamento e cinzas, sem semente */
    const lines = ['Mestre...? Por que o fogo?', 'Eu bebi da sua água... eu cresci por você...', 'Lembre-se de mim quando vir uma flor.'];
    lines.forEach((t, i) => setTimeout(() => { if (S.npcs[n.id]) empSay(n, t); }, i * 1800)); near(n.x, n.y, { t: 'entdie', id: n.id, ash: 1 }, VIEW_RADIUS + 6);
    setTimeout(() => { delete entList()[n.entOf]; visGone(n); estateSave(); entsSend(); if (q) tell(q, 'Sua guardiã virou cinzas nas suas próprias chamas. Não restou semente.'); }, 6500);
  } else {
    empSay(n, 'Meus galhos... secam...'); near(n.x, n.y, { t: 'entdie', id: n.id, ash: 0 }, VIEW_RADIUS + 6);
    if (q) { q.inv.entseed = (q.inv.entseed || 0) + 1; sendStat(q); tell(q, 'Sua guardiã caiu e virou um tronco seco. Ela deixou uma semente: use-a para plantar uma nova muda.'); }
    setTimeout(() => { delete entList()[n.entOf]; visGone(n); estateSave(); entsSend(); }, 120000);
  }
  entsSend();
}
// ---------- montar na guardiã: o mago vai nas costas e controla a árvore (WASD anda, 1-4 golpes, F desce) ----------
const ENT_RCD = [0, 900, 2600, 6000, 9000];
function entRider(n) { return n && n.riddenBy ? S.players[n.riddenBy] : null; }
function entRide(p, m) {
  const key = estOwner(p), r = entList()[key], n = r && S.npcs[entNid(key)];
  if (m.a === 'unride') { if (p.riding && n) { n.riddenBy = null; p.riding = null; p.sit = null; near(p.x, p.y, { t: 'entride', id: n.id, pid: p.id, on: 0 }); entsSend(); } return; }
  if (m.a === 'ride') { if (!r || !n || r.dry || n.dead) return; if (p.cls !== 'mage') return; if ((r.st || 1) < 2) { tell(p, 'Ela ainda é um broto: espere ficar adulta para montar.'); return; } if (dist(p.x, p.y, n.x, n.y) > 3.5) { tell(p, 'Chegue perto da sua guardiã.'); return; } if (entNearCity(n.x, n.y)) { tell(p, 'Perto da cidade ela não deixa montar.'); return; }
    if (p.flame) flameStop(p); p.autoAtk = 0; p.medit = null; n.riddenBy = p.id; p.riding = key; p.x = n.x; p.y = n.y; r.mode = 'follow'; n.entT = null; near(p.x, p.y, { t: 'entride', id: n.id, pid: p.id, on: 1, st: r.st }); entsSend(); tell(p, 'Montado na guardiã: WASD anda, 1 soco, 2 arremesso, 3 golpe especial, 4 golpe forte (anciã), F desce.'); return; }
  if (m.a === 'ratk') { if (!p.riding || !n || n.riddenBy !== p.id) return; const i = m.n | 0, now = now_(); if (i < 1 || i > 4) return; n.rcd = n.rcd || {}; if (now < (n.rcd[i] || 0)) return; if (i === 4 && r.st < 3) { tell(p, 'O golpe forte é da guardiã anciã.'); return; }
    n.rcd[i] = now + ENT_RCD[i]; const a = isFinite(+m.ang) ? +m.ang : 0, [d0, d1] = ENT_DMG[r.st], kill = o => { if (o.hp <= 0) killMonster(o, p, 0); };
    const hit = (o, k, stun) => { const dmg = Math.round(rint(d0, d1) * k); o.hp -= dmg; o.aggro = o.aggro || p.id; near(o.x, o.y, { t: 'hit', k: 'm', id: o.id, x: o.x, y: o.y, dmg, ax: n.x, ay: n.y }); if (stun && !(MON[o.type] || {}).big) o.stunUntil = Math.max(o.stunUntil || 0, now_() + stun); kill(o); };
    n.dir = dirFromVecS(Math.cos(a), Math.sin(a)); const reach = 1.5 + r.st * 0.4;
    if (i === 1) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: r.k === 'water' ? 'atk_slashL' : 'atk_slashR', ms: 800, tx: n.x + Math.cos(a), ty: n.y + Math.sin(a) }); setTimeout(() => { for (const o of Object.values(S.monsters)) if (o.hp > 0 && inArc(n.x, n.y, a, o.x, o.y, reach, 1.0, (MON[o.type] || {}).rad || 0.3)) hit(o, 1, 0); }, 380); }   /* soco em arco */
    else if (i === 2) { let tg = null, bd = 9; for (const o of Object.values(S.monsters)) { if (o.hp <= 0) continue; const dd = dist(n.x, n.y, o.x, o.y); if (dd < bd && Math.abs(angDiff(Math.atan2(o.y - n.y, o.x - n.x), a)) < 0.6) { bd = dd; tg = o; } }   /* arremesso na direção do mouse */
      const tx = tg ? tg.x : n.x + Math.cos(a) * 6, ty = tg ? tg.y : n.y + Math.sin(a) * 6, d = dist(n.x, n.y, tx, ty), fl = Math.round(260 + d * 70), big = r.st === 3;
      near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_over', ms: 900, tx, ty }); near(n.x, n.y, { t: 'entthrow', id: n.id, x0: n.x, y0: n.y, x1: tx, y1: ty, ms: fl, big: big ? 1 : 0, log: r.k === 'wind' ? 2 : big ? 1 : 0, st: r.st });
      setTimeout(() => { for (const o of Object.values(S.monsters)) if (o.hp > 0 && dist(o.x, o.y, tx, ty) < (big ? 1.6 : 1.0)) hit(o, big ? 1.4 : 1, big ? 1200 : 0); }, fl + 500); }
    else if (i === 3) { if (r.k === 'earth') { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'kick', ms: 900 }); setTimeout(() => { near(n.x, n.y, { t: 'entstomp', x: n.x, y: n.y }); for (const o of Object.values(S.monsters)) if (o.hp > 0 && dist(o.x, o.y, n.x, n.y) < 2.5 + r.st * 0.4) hit(o, 0.8, 1600); }, 420); }   /* carvalho: pisão que derruba */
      else if (r.k === 'water') { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashL', ms: 900 }); setTimeout(() => { for (const o of Object.values(S.monsters)) if (o.hp > 0 && dist(o.x, o.y, n.x, n.y) < 3.5) { hit(o, 0.6, 0); o.slowUntil = Math.max(o.slowUntil || 0, now_() + 4000); } }, 420); }   /* salgueiro: laço de ramos que prende */
      else { for (let k = 0; k < 4; k++) setTimeout(() => { if (!S.npcs[n.id]) return; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: k % 2 ? 'atk_slashL' : 'atk_slashR', ms: 300 }); for (const o of Object.values(S.monsters)) if (o.hp > 0 && inArc(n.x, n.y, a, o.x, o.y, reach, 1.2, 0.3)) hit(o, 0.45, 0); }, k * 260); } }   /* cerejeira: rajada de golpes rápidos */
    else { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_over', ms: 1100 }); const tx = n.x + Math.cos(a) * 5, ty = n.y + Math.sin(a) * 5; near(n.x, n.y, { t: 'entthrow', id: n.id, x0: n.x, y0: n.y, x1: tx, y1: ty, ms: 700, big: 1, log: r.k === 'earth' ? 0 : 1, st: 3 });
      setTimeout(() => { near(tx, ty, { t: 'entstomp', x: tx, y: ty }); for (const o of Object.values(S.monsters)) if (o.hp > 0 && dist(o.x, o.y, tx, ty) < 2.4) hit(o, 2.2, 1800); }, 1200); }   /* anciã: rocha ou tronco enorme que esmaga em área */
    return; }
}
function entHealTick(n, r, q, now) {   /* de longe ela também cura o mestre e os amigos perto dela */
  if (now < (n.healT || 0)) return; n.healT = now + 3000; const R = 7, k = [0, 0.04, 0.055, 0.075][r.st] || 0.04; let any = false;
  for (const p of Object.values(S.players)) { if (p.downed || (p.fl || 0) !== 0 || dist(p.x, p.y, n.x, n.y) > R || p.hp >= p.maxHp) continue; const h = Math.max(2, Math.round(p.maxHp * k)); p.hp = Math.min(p.maxHp, p.hp + h); sfx(p.x, p.y, '+' + h, '#8ae070', 0); near(p.x, p.y, { t: 'evofx', id: p.id, x: p.x, y: p.y, k: 'enthl', fx: n.x, fy: n.y }); sendStat(p); any = true; }
  if (any) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'castup', ms: 700 }); }
function entTick(now) {
  const L = (S.estate && S.estate.ents) || {}; if (now - (S.entT || 0) < 100) return; const dt = Math.min(0.25, (now - (S.entT || now)) / 1000) || 0.1; S.entT = now;
  for (const key in L) { const r = L[key]; let n = S.npcs[entNid(key)]; if (!n) { n = entSpawn(key, r); }
    if (r.dry || n.dead) { if (n.riddenBy) { const rp = S.players[n.riddenBy]; if (rp) { rp.riding = null; } n.riddenBy = null; } continue; } const q = Object.values(S.players).find(pp => estOwner(pp) === key && !pp.dev);
    if (n.riddenBy) { const rp = S.players[n.riddenBy]; if (!rp || rp.riding !== key || rp.downed || (rp.fl || 0) !== 0) { n.riddenBy = null; if (rp) rp.riding = null; entsSend(); }
      else if (entNearCity(rp.x, rp.y)) { entRide(rp, { a: 'unride' }); tell(rp, 'A guardiã para: ela não chega perto da cidade.'); }
      else { const bx = rp.x - 0.3, by = rp.y - 0.3, mv = dist(n.x, n.y, bx, by); if (mv > 0.02) { n.dir = dirFromVecS(bx - n.x, by - n.y); n.walk = true; } else n.walk = false; n.x = bx; n.y = by;   /* um pouco atrás: o mago aparece nas costas, na frente da copa */ n.sleepEnt = false; n.entFight = false; continue; } }
    // crescer com o dono e rebrotar galhos
    if (q && now - (r.chkT || 0) > 5000) { r.chkT = now; const st = Math.max(r.st, entStageOf(q)); if (st > r.st) { r.st = st; n.maxHp = r.maxHp = ENT_HP[st]; n.hp = Math.min(n.maxHp, n.hp + ENT_HP[st] * 0.5); empSay(n, ['', '', 'Sinto a seiva subir... estou mais forte!', 'Minhas raízes alcançam o fundo da terra!'][st]); entsSend(); estateSave(); }
      for (const k in r.regrow) if (Date.now() > r.regrow[k]) { delete r.regrow[k]; r.lost &= ~ENT_LOST[k]; r.tw = (r.tw || 0) | ENT_LOST[k]; empSay(n, 'Brotou um galho novo!'); entsSend(); estateSave(); }   /* volta com galhinhos e folhas novas */
      if (n.hp < n.maxHp && !n.entFight) { n.hp = Math.min(n.maxHp, n.hp + n.maxHp * 0.01); r.hp = n.hp; } }
    const spd = [0, 1.6, 1.8, 2.0][r.st] * ((r.lost & 24) ? 0.6 : 1);
    // inimigo: o que o dono atacou, o que ataca o dono ou a própria guardiã, ou o alvo da ordem
    let m = n.entT && S.monsters[n.entT]; if (m && (m.hp <= 0 || dist(n.x, n.y, m.x, m.y) > 14 || entNearCity(m.x, m.y))) { m = null; n.entT = null; if (r.mode === 'attack') r.mode = r.prevMode || 'follow'; }
    if (!m && r.mode !== 'rest') for (const o of Object.values(S.monsters)) { if (o.hp <= 0 || (o.alt || 0) > 1 || entNearCity(o.x, o.y)) continue; const d0 = MON[o.type] || {}; if (d0.beh === 'flee' && !(q && o.aggro === q.id)) continue; const d = dist(n.x, n.y, o.x, o.y); if ((q && o.aggro === q.id && d < 12) || (d < 5 && (d0.aggro || 0) > 0)) { m = o; n.entT = o.id; break; } }
    if (n.entFight !== !!m) { n.entFight = !!m; entsSend(); }   /* o rosto franze quando luta */
    if (m) { n.sleepEnt = false; const d = dist(n.x, n.y, m.x, m.y), reach = 1.3 + r.st * 0.35;
      if (r.ranged) {   /* ordem "de longe": mantém distância (perto do mago, fora do jato) e só arremessa */
        let gx = null, gy = null;   /* fica ATRÁS do mago (do lado oposto ao inimigo), bem longe do jato de fogo */
        if (q && !(q.fl || 0) && dist(q.x, q.y, n.x, n.y) < 14) { const qa = Math.atan2(q.y - m.y, q.x - m.x), back = 3.2 + r.st * 0.4; gx = q.x + Math.cos(qa) * back; gy = q.y + Math.sin(qa) * back;
          if (q.flame) { const fa = q.flame.a, dx = gx - q.x, dy = gy - q.y, al = dx * Math.cos(fa) + dy * Math.sin(fa); if (al > -0.5) { gx = q.x - Math.cos(fa) * back; gy = q.y - Math.sin(fa) * back; } } }
        else { const a = Math.atan2(n.y - m.y, n.x - m.x); gx = m.x + Math.cos(a) * 6.5; gy = m.y + Math.sin(a) * 6.5; }
        const inJet = q && q.flame && (() => { const fa = q.flame.a, dx = n.x - q.x, dy = n.y - q.y, al = dx * Math.cos(fa) + dy * Math.sin(fa); return al > -0.3 && al < 8 && Math.abs(-dx * Math.sin(fa) + dy * Math.cos(fa)) < 1.6 + al * 0.25; })();
        if (dist(n.x, n.y, gx, gy) > 0.8 || inJet) npcWalk(n, gx, gy, spd * (inJet ? 1.5 : 1), dt); else n.walk = false;
        entHealTick(n, r, q, now);
        if (d < 11 && now >= (n.throwT || 0)) { n.throwT = now + [0, 2600, 2300, 2000][r.st]; const big = r.st === 3 && Math.random() < 0.45, log = r.st >= 2 && (big ? r.k !== 'earth' : Math.random() < 0.4), fl = Math.round(260 + d * 70);   /* broto: pedrinhas; adulta: pedras e galhos; anciã: troncos e pedras grandes */
          n.dir = dirFromVecS(m.x - n.x, m.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_over', ms: 900, tx: m.x, ty: m.y }); near(n.x, n.y, { t: 'entthrow', id: n.id, x0: n.x, y0: n.y, x1: m.x, y1: m.y, ms: fl, big: big ? 1 : 0, log: log ? (r.k === 'wind' ? 2 : 1) : 0, st: r.st });
          setTimeout(() => { if (!S.monsters[m.id]) return; const [a, b] = ENT_DMG[r.st], dmg = Math.round(rint(a, b) * (big ? 1.4 : r.st === 1 ? 0.6 : 0.85)); m.hp -= dmg; near(m.x, m.y, { t: 'hit', k: 'm', id: m.id, x: m.x, y: m.y, dmg, ax: n.x, ay: n.y }); if (big && MON[m.type] && !MON[m.type].big) m.stunUntil = Math.max(m.stunUntil || 0, now_() + 1200); if (m.hp <= 0) { if (q) killMonster(m, q, 0); else { delete S.monsters[m.id]; near(m.x, m.y, { t: 'mdie', id: m.id, d: 0 }); } } }, fl + 500); }
        continue; }
      if (r.st >= 2 && d > reach + 0.5 && d < 8 && now >= (n.throwT || 0)) { n.throwT = now + (r.st === 3 ? 3600 : 4800); const big = r.st === 3 && Math.random() < 0.5, log = big && r.k !== 'earth', fl = Math.round(260 + d * 70);   /* arremessa pedras, galhos e, no topo, pedras grandes e troncos */
        n.dir = dirFromVecS(m.x - n.x, m.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_over', ms: 900, tx: m.x, ty: m.y }); near(n.x, n.y, { t: 'entthrow', id: n.id, x0: n.x, y0: n.y, x1: m.x, y1: m.y, ms: fl, big: big ? 1 : 0, log: log ? 1 : (r.k === 'wind' && !big ? 2 : 0), st: r.st });
        setTimeout(() => { if (!S.monsters[m.id]) return; const [a, b] = ENT_DMG[r.st], dmg = Math.round(rint(a, b) * (big ? 1.6 : 1)); m.hp -= dmg; near(m.x, m.y, { t: 'hit', k: 'm', id: m.id, x: m.x, y: m.y, dmg, ax: n.x, ay: n.y }); if (big && MON[m.type] && !MON[m.type].big) m.stunUntil = Math.max(m.stunUntil || 0, now_() + 1200); if (m.hp <= 0) { if (q) killMonster(m, q, 0); else { delete S.monsters[m.id]; near(m.x, m.y, { t: 'mdie', id: m.id, d: 0 }); } } }, 500 + fl); }
      else if (d > reach) npcWalk(n, m.x, m.y, spd, dt);
      else { n.walk = false; n.dir = dirFromVecS(m.x - n.x, m.y - n.y);
        if (now >= (n.nextAtk || 0)) { n.nextAtk = now + (r.k === 'wind' ? 1100 : r.k === 'water' ? 1400 : 1700); const stomp = r.st === 3 && r.k === 'earth' && Math.random() < 0.35;
          near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: stomp ? 'kick' : r.k === 'water' ? 'atk_slashL' : 'atk_slashR', ms: 900, tx: m.x, ty: m.y });
          setTimeout(() => { if (!S.monsters[m.id] || n.dead) return; const [a, b] = ENT_DMG[r.st]; const hitOne = (o, k) => { const dmg = Math.round(rint(a, b) * k); o.hp -= dmg; near(o.x, o.y, { t: 'hit', k: 'm', id: o.id, x: o.x, y: o.y, dmg, ax: n.x, ay: n.y }); if (o.hp <= 0) { if (q) killMonster(o, q, 0); else { delete S.monsters[o.id]; near(o.x, o.y, { t: 'mdie', id: o.id, d: 0 }); } } };
            if (stomp) { near(n.x, n.y, { t: 'entstomp', x: n.x, y: n.y }); for (const o of Object.values(S.monsters)) if (o.hp > 0 && dist(o.x, o.y, n.x, n.y) < 3) { hitOne(o, 0.8); if (!(MON[o.type] || {}).big) o.stunUntil = Math.max(o.stunUntil || 0, now_() + 1500); } }   /* pisão: o chão treme e derruba */
            else { hitOne(m, 1); if (r.k === 'water' && r.st >= 2 && S.monsters[m.id]) m.slowUntil = Math.max(m.slowUntil || 0, now_() + 2500); } }, 420); }   /* salgueiro: o laço de ramos prende */
        const d0 = MON[m.type] || {}; if (d0.dmg && d0.dmg[1] > 0 && now >= (n.hurtT || 0)) { n.hurtT = now + (d0.atk || 1500) + 200; entHurt(n, r, Math.round(rint(d0.dmg[0], d0.dmg[1]) * 0.7), 'mon'); } }
      continue; }
    // sem luta: o modo manda
    const tgt = r.mode === 'guard' && r.post ? r.post : r.mode === 'follow' && q && !(q.fl || 0) ? [q.x, q.y] : null;
    if (r.mode === 'rest' || !tgt || entNearCity(tgt[0], tgt[1]) || (q && (q.fl || 0))) {   /* dono na cidade (ou mandou descansar): dorme num bosque */
      const g = entGrove(n.x, n.y); if (dist(n.x, n.y, g[0], g[1]) > 0.8) { n.sleepEnt = false; npcWalk(n, g[0], g[1], spd, dt); } else { n.walk = false; if (!n.sleepEnt) { n.sleepEnt = true; entsSend(); } } continue; }
    if (n.sleepEnt) { n.sleepEnt = false; empSay(n, 'Hmm? Você voltou!'); entsSend(); }
    const d = dist(n.x, n.y, tgt[0], tgt[1]); if (d > (r.mode === 'guard' ? 0.6 : 2.4)) { const nx = n.x + (tgt[0] - n.x) * 0.3, ny = n.y + (tgt[1] - n.y) * 0.3; if (entNearCity(nx, ny)) { n.walk = false; continue; } npcWalk(n, tgt[0], tgt[1], spd * (d > 6 ? 1.4 : 1), dt); } else n.walk = false;
    r.x = n.x; r.y = n.y;
  }
  if (now - (S.entSendT || 0) > 4000) { S.entSendT = now; if (Object.keys(L).length) entsSend(); }
}
function entFlameHit(p, F, st, now) {   /* o jato de Chamas também queima a guardiã (e muito) */
  const L = (S.estate && S.estate.ents) || {}, ca = Math.cos(F.a), sa = Math.sin(F.a);
  for (const key in L) { const r = L[key], n = S.npcs[entNid(key)]; if (!n || n.dead || r.dry) continue; const dx = n.x - p.x, dy = n.y - p.y, al = dx * ca + dy * sa; if (al < 0.2 || al > st.R + 0.6 || Math.abs(-dx * sa + dy * ca) > 0.6 + al * 0.2) continue;
    n._lastFire = p.id; entHurt(n, r, Math.round(n.maxHp * 0.06 * st.F), 'fire'); near(n.x, n.y, { t: 'mburn', id: n.id, npc: 1, ms: 2000 }); if (Math.random() < 0.2) empSay(n, estOwner(p) === key ? ['Mestre, está me queimando!', 'Ai! O fogo não, mestre!'][Math.floor(Math.random() * 2)] : 'Fogo! FOGO!'); }
}

// ---------------- CLIENTE ----------------
if (typeof G !== 'undefined') G.ents = G.ents || {};
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peE = progEvent; progEvent = function (m, now) {
  if (m.t === 'ents') { const o = {}; for (const e of m.l || []) o[e.id] = e; G.ents = o; for (const id in G.entDeaths || {}) if (!o[id] || !o[id].dry) { delete G.entDeaths[id]; if (typeof FALLS !== 'undefined') delete FALLS['ent' + id]; } return true; }   /* nova guardiã com o mesmo nome: esquece a queda antiga */
  if (m.t === 'entcut') { G.entCut = { ...m, t0: now }; return true; }
  if (m.t === 'entthrow') { (G.entThrows = G.entThrows || []).push({ ...m, t0: now }); return true; }
  if (m.t === 'entstomp') { G.shake = Math.max(G.shake || 0, 10); if (G.view) { const p = iso(m.x, m.y); for (let k = 0; k < 30; k++) { const a = Math.random() * 6.28; spawnPart('dust', p.sx + Math.cos(a) * 20, p.sy + Math.sin(a) * 9, { vx: Math.cos(a) * 0.1, vy: -0.05 }); } } return true; }
  if (m.t === 'entbreak') { const e = G.npcs[m.id]; (G.entChips = G.entChips || []).push({ x: m.x, y: m.y, t0: now, part: m.part, k: e && e.kind }); return true; }
  if (m.t === 'entdie') { const e = G.npcs[m.id]; if (e) { e.entDie = { t0: now, ash: m.ash }; } return true; }
  return _peE(m, now); }; }
const ENT_LOOK = {
  ent_oak: { bark: '#5e4428', bark2: '#7a5a36', eye: '#ffc860', moss: '#4e7a2a', leaf: ['#2e6a1c', '#3e7e22', '#24561a'], P: { hipY: 1.0, legL: [0.55, 0.5], legR: [0.22, 0.17], legX: 0.42, torso: [1.5, 0.78], lean: 0.32, armL: [1.05, 0.95], armR: [0.22, 0.15], sh: 0.78, head: 0.42 } },
  ent_willow: { bark: '#5a5240', bark2: '#7a7058', eye: '#90e0ff', moss: '#7a9a78', leaf: ['#5e8a6c', '#76a080', '#4a7458'], P: { hipY: 2.1, legL: [1.1, 1.05], legR: [0.11, 0.07], legX: 0.2, torso: [2.0, 0.3], lean: 0.04, armL: [1.1, 1.1], armR: [0.08, 0.05], sh: 0.33, head: 0.28 } },
  ent_cherry: { bark: '#2a1c18', bark2: '#4a3028', eye: '#ffc0d8', leaf: ['#e07894', '#f098b0', '#c85a7a'], P: { hipY: 1.4, legL: [0.75, 0.7], legR: [0.12, 0.08], legX: 0.22, torso: [1.6, 0.34], lean: 0.12, armL: [0.8, 0.75], armR: [0.09, 0.06], sh: 0.36, head: 0.3 } } };
const ENT_SC = [0, 0.62, 0.95, 1.55], ENT_K = [1, 1.25, 1.9, 2.9];   /* tamanho do corpo e do quadro de cada estágio */
let _entBark = {};
function entBarkTex(c1, c2, kind, moss) {   /* casca: sulcos fundos com borda clara, nós, granulado e manchas de musgo */
  const key = c1 + c2 + kind + (moss || ''); if (_entBark[key]) return _entBark[key];
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const x = cv.getContext('2d'); let sd = 11; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  x.fillStyle = c1; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 1400; i++) { x.fillStyle = rn() < 0.55 ? 'rgba(0,0,0,.10)' : 'rgba(255,240,210,.06)'; x.fillRect(rn() * 256, rn() * 512, 1 + rn() * 5, 2 + rn() * 9); }
  if (kind === 'ent_cherry') { for (let i = 0; i < 70; i++) { const y = rn() * 512, x0 = rn() * 256, w = 10 + rn() * 26; x.fillStyle = 'rgba(210,170,140,.5)'; x.fillRect(x0, y, w, 1.5 + rn() * 1.5); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(x0, y + 2.5, w, 1); }
    for (let i = 0; i < 10; i++) { x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; const sx = rn() * 256; x.beginPath(); x.moveTo(sx, 0); for (let y = 0; y <= 512; y += 32) x.lineTo(sx + Math.sin(y / 50 + i) * 6, y); x.stroke(); } }   /* cerejeira: casca lisa com listras horizontais */
  else { const vert = kind === 'ent_willow', n = vert ? 34 : 24; for (let i = 0; i < n; i++) { const sx = rn() * 256, w = (vert ? 2 : 4) + rn() * (vert ? 4 : 8), ph = rn() * 6, path = []; for (let y = -16; y <= 528; y += 16) path.push([sx + Math.sin(y / (vert ? 80 : 30) + ph) * (vert ? 3 : 11) + (rn() - 0.5) * 3, y]);
      const line = (dx, c, lw) => { x.strokeStyle = c; x.lineWidth = lw; x.beginPath(); path.forEach(([px, py], j) => j ? x.lineTo(px + dx, py) : x.moveTo(px + dx, py)); x.stroke(); };
      line(0, 'rgba(0,0,0,.6)', w); line(w * 0.7, c2, w * 0.3); line(-w * 0.6, 'rgba(0,0,0,.25)', w * 0.25); }   /* sulco escuro com a borda iluminada */
    if (kind === 'ent_oak') for (let i = 0; i < 14; i++) { x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2; const y = rn() * 512, x0 = rn() * 256; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + 6 + rn() * 12, y + (rn() - 0.5) * 6); x.stroke(); } }   /* carvalho: placas partidas */
  for (let i = 0; i < (kind === 'ent_oak' ? 6 : 3); i++) { const kx = 20 + rn() * 216, ky = rn() * 512, r = 7 + rn() * 11; for (let j = 4; j > 0; j--) { x.strokeStyle = j % 2 ? 'rgba(0,0,0,.55)' : c2; x.lineWidth = 2; x.beginPath(); x.ellipse(kx, ky, r * j / 4, r * j / 4 * 1.5, 0, 0, 7); x.stroke(); } x.fillStyle = 'rgba(10,5,0,.8)'; x.beginPath(); x.ellipse(kx, ky, r * 0.3, r * 0.45, 0, 0, 7); x.fill(); }   /* nós */
  if (moss) for (let i = 0; i < 7; i++) { const mx = rn() * 256, my = rn() * 512, mr = 8 + rn() * 26; for (let j = 0; j < 70; j++) { const a = rn() * 6.28, d = Math.pow(rn(), 0.6) * mr; x.globalAlpha = 0.45 + rn() * 0.55; x.fillStyle = rn() < 0.6 ? moss : '#a8c45a'; x.beginPath(); x.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d * 1.4, 1 + rn() * 2.4, 0, 7); x.fill(); } x.globalAlpha = 1; }   /* musgo */
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); t.encoding = THREE.sRGBEncoding; return (_entBark[key] = t); }
const entV = (x, y, z) => new THREE.Vector3(x, y, z);
function entTaper(crv, N, ra, rb, m, RS = 6) {   /* tubo que afina (raiz, cipó, galho) */
  const fr = crv.computeFrenetFrames(N, false), pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) { const t = i / N, p = crv.getPointAt(t), r = ra + (rb - ra) * t, nn = fr.normals[i], bb = fr.binormals[i]; for (let j = 0; j <= RS; j++) { const a = j / RS * 6.2832, c = Math.cos(a), s = Math.sin(a); pos.push(p.x + r * (c * nn.x + s * bb.x), p.y + r * (c * nn.y + s * bb.y), p.z + r * (c * nn.z + s * bb.z)); uv.push(j / RS, t); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j, b = a + RS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const me = new THREE.Mesh(g, m); me.castShadow = true; return me; }
function entGnarl(g, a) {   /* deforma o cilindro: tronco torto e nodoso (mesma posição, mesmo desvio, sem rachar a costura) */
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + a * (Math.sin(y * 6 + x * 9) + Math.cos(z * 8 - y * 4)) * 0.5; p.setX(i, x * k); p.setZ(i, z * k); } g.computeVertexNormals(); return g; }
function buildEntRig(kind, st, twigs, dry) {   /* mesmas juntas dos personagens (A, B, LA, LB, spine, head, hips): todas as animações servem */
  const L = ENT_LOOK[kind], P = L.P, root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(ENT_SC[st] * 0.75);
  const tx = entBarkTex(dry ? '#6a6058' : L.bark, dry ? '#8a8078' : L.bark2, kind, dry ? '' : L.moss);
  const bm = new THREE.MeshStandardMaterial({ map: tx, bumpMap: tx, bumpScale: 0.035, roughness: 0.95, side: THREE.DoubleSide }), hole = mat('#120a04', 'cloth');
  let sd = 7 + kind.length * 13 + st; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const lm = c => mat(c, 'cloth', { flatShading: true });
  const cyl = (L0, r0, r1) => { const m = new THREE.Mesh(entGnarl(new THREE.CylinderGeometry(r1, r0, L0, 10, 4), 0.09), bm); m.position.y = -L0 / 2; m.castShadow = true; return m; };
  const hips = new THREE.Group(); hips.position.y = P.hipY; body.add(hips); const spine = new THREE.Group(); spine.rotation.x = P.lean; hips.add(spine);
  const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16, r = kind === 'ent_oak' ? P.torso[1] * (0.85 + 0.25 * Math.sin(t * Math.PI)) : P.torso[1] * (1 - 0.3 * t) + (kind === 'ent_cherry' ? 0.04 * Math.sin(t * 12) : 0); prof.push(new THREE.Vector2(r, t * P.torso[0])); }
  spine.add(new THREE.Mesh(entGnarl(new THREE.LatheGeometry(prof, 20), 0.07), bm));
  if (kind === 'ent_oak') { for (let i = 0; i < 3; i++) { const bu = new THREE.Mesh(entGnarl(new THREE.SphereGeometry(P.torso[1] * 0.28, 10, 8), 0.15), bm); const a = -1 + i * 0.9; bu.position.set(Math.sin(a) * P.torso[1] * 0.92, P.torso[0] * (0.25 + i * 0.22), Math.cos(a) * P.torso[1] * 0.92); spine.add(bu); }   /* calombos */
    const ho = new THREE.Mesh(new THREE.SphereGeometry(P.torso[1] * 0.2, 10, 8), hole); ho.scale.set(0.8, 1.3, 0.4); ho.position.set(P.torso[1] * 0.3, P.torso[0] * 0.42, P.torso[1] * 0.98); spine.add(ho); }   /* oco no peito */
  if (!dry && L.moss && kind !== 'ent_cherry') for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, mo = new THREE.Mesh(new THREE.IcosahedronGeometry(P.torso[1] * (0.12 + rnd() * 0.1), 0), lm(i % 2 ? L.moss : '#86a848')); mo.scale.y = 0.45; mo.position.set(Math.sin(a) * P.torso[1] * 0.85, P.torso[0] * (0.7 + rnd() * 0.3), Math.cos(a) * P.torso[1] * 0.85); spine.add(mo); }   /* tufos de musgo nos ombros */
  if (!dry && kind === 'ent_oak' && st >= 2) for (let i = 0; i < 3; i++) { const fu = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 12, 1, false, 0, Math.PI), mat(['#c89a5a', '#b07a3a', '#e0c080'][i], 'wood')); const a = 1.6 + i * 0.25; fu.position.set(Math.sin(a) * P.torso[1], P.torso[0] * (0.15 + i * 0.12), Math.cos(a) * P.torso[1]); fu.rotation.y = a - Math.PI / 2; spine.add(fu); }   /* orelhas-de-pau */
  const neckJ = new THREE.Group(); neckJ.position.y = P.torso[0]; spine.add(neckJ); const head = new THREE.Group(); neckJ.add(head);
  const h = P.head, oz = kind === 'ent_oak' ? 0.12 : 0;
  const hd = new THREE.Mesh(entGnarl(kind === 'ent_oak' ? new THREE.DodecahedronGeometry(h, 1) : new THREE.SphereGeometry(h, 16, 12), 0.08), bm); hd.scale.set(1, kind === 'ent_willow' ? 1.3 : 0.95, 0.9); hd.position.set(0, h * 0.7, oz); head.add(hd);
  const eyeM = mat('#000000', 'gem', { emissive: dry ? '#000000' : L.eye, emissiveIntensity: dry ? 0 : 1.3 }).clone(), F = { eyes: [], brows: [], eyeM, h };
  for (const s of [-1, 1]) {
    const so = new THREE.Mesh(new THREE.SphereGeometry(h * 0.23, 10, 8), hole); so.scale.set(1, 0.8, 0.5); so.position.set(s * h * 0.36, h * 0.8, h * 0.86 + oz); head.add(so);   /* órbita funda */
    const e = new THREE.Mesh(new THREE.SphereGeometry(h * 0.15, 12, 10), eyeM); e.position.set(s * h * 0.36, h * 0.8, h * 0.95 + oz); head.add(e); F.eyes.push(e);
    const br = new THREE.Group(); br.position.set(s * h * 0.38, h * 1.06, h * 0.7 + oz); br.userData = { s, y: h * 1.06 }; br.add(new THREE.Mesh(new THREE.BoxGeometry(h * 0.58, h * 0.15, h * 0.3), bm)); head.add(br); F.brows.push(br); }   /* sobrancelha de casca */
  { const mo = new THREE.Group(); mo.position.set(0, h * 0.36, h * 0.84 + oz); const m = new THREE.Mesh(new THREE.SphereGeometry(h * 0.2, 12, 8), hole); m.scale.set(1.5, 0.35, 0.5); mo.add(m); const gi = new THREE.Mesh(new THREE.SphereGeometry(h * 0.12, 8, 6), eyeM); gi.scale.set(1.6, 0.25, 0.3); gi.position.z = -h * 0.03; mo.add(gi); head.add(mo); F.mouth = mo; }   /* boca de casca, com brilho por dentro */
  { const nz = new THREE.Mesh(new THREE.ConeGeometry(h * (kind === 'ent_oak' ? 0.14 : 0.07), h * (kind === 'ent_willow' ? 0.5 : 0.3), 6), bm); nz.rotation.x = Math.PI / 2 + 0.35; nz.position.set(0, h * 0.6, h * 0.98 + oz); head.add(nz); }   /* nariz de nó */
  if (kind === 'ent_oak') for (let i = 0; i < 11; i++) { const bl = 0.2 + (i % 3) * 0.05, m = new THREE.Mesh(new THREE.ConeGeometry(0.05, bl, 5), lm(i % 2 ? '#5a7a30' : '#6e8a3a')); m.position.set((i - 5) * 0.06, h * 0.12 - bl / 2, h * 0.88 + oz - Math.abs(i - 5) * 0.02); m.rotation.x = Math.PI - 0.15; head.add(m); }   /* barba de musgo */
  if (kind === 'ent_willow' && !dry) for (let i = 0; i < 7; i++) { const x0 = (i - 3) * h * 0.13, crv = new THREE.CatmullRomCurve3([entV(x0, h * 0.2, h * 0.85), entV(x0 * 1.2, -h * 0.4, h * 0.95), entV(x0 * 1.4, -h * (1.2 + (i % 3) * 0.3), h * 0.9)]); head.add(entTaper(crv, 6, 0.018, 0.006, mat('#9aaa88', 'cloth'), 4)); }   /* barba de líquen */
  const twigLeaves = (parent, L0) => { for (let i = 0; i < 5; i++) { const sgn = i % 2 ? 1 : -1, y = -L0 * (0.25 + i * 0.14), crv = new THREE.CatmullRomCurve3([entV(0, y, 0), entV(sgn * 0.12, y + 0.06, 0.03), entV(sgn * 0.22, y + 0.16, 0.02)]); parent.add(entTaper(crv, 4, 0.02, 0.006, bm, 4)); for (let j = 0; j < 3; j++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), lm(['#7ad04a', '#9ae060', '#5ab83a'][j])); lf.scale.set(1.4, 0.45, 1); lf.position.set(sgn * (0.16 + j * 0.04), y + 0.12 + j * 0.03, (j - 1) * 0.04); parent.add(lf); } } };   /* membro que rebrotou: galhinhos com folhas novas, de verde-claro */
  const arm = s => { const sh = new THREE.Group(); sh.position.set(s * P.sh, P.torso[0] * 0.88, 0); spine.add(sh); sh.add(cyl(P.armL[0], P.armR[0], P.armR[0] * 0.8)); const el = new THREE.Group(); el.position.y = -P.armL[0]; sh.add(el); el.add(cyl(P.armL[1], P.armR[0] * 0.8, P.armR[1])); const hand = new THREE.Group(); hand.position.y = -P.armL[1]; el.add(hand);
    const nf = kind === 'ent_oak' ? 3 : kind === 'ent_willow' ? 5 : 4, fl = kind === 'ent_oak' ? 0.34 : kind === 'ent_willow' ? 0.7 : 0.38;
    for (let f = 0; f < nf; f++) { const o = (f - (nf - 1) / 2), crv = new THREE.CatmullRomCurve3([entV(o * P.armR[1] * 0.8, 0.02, 0), entV(o * P.armR[1] * 1.1, -fl * 0.5, 0.04), entV(o * P.armR[1] * 1.3, -fl, fl * 0.25)]); hand.add(entTaper(crv, 5, P.armR[1] * 0.42, P.armR[1] * 0.08, bm, 5)); }   /* dedos de galho, curvos como garras */
    if (!dry && kind === 'ent_willow') for (let v = 0; v < 3; v++) { const par = v ? hand : el, y0 = v ? 0 : -P.armL[1] * 0.4, len = 0.6 + v * 0.35, crv = new THREE.CatmullRomCurve3([entV((v - 1) * 0.05, y0, 0.03), entV((v - 1) * 0.09, y0 - len * 0.5, 0.1), entV((v - 1) * 0.06, y0 - len, 0.06)]); par.add(entTaper(crv, 6, 0.02, 0.008, mat('#4e7a48', 'cloth'), 4)); for (let j = 1; j < 5; j++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), lm(L.leaf[j % 3])); lf.scale.set(0.6, 1.5, 0.6); lf.position.copy(crv.getPointAt(j / 5)); par.add(lf); } }   /* cipós pendurados */
    if (!dry && st >= 2 && kind !== 'ent_willow') for (let j = 0; j < 3; j++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + j * 0.02, 1), lm(kind === 'ent_cherry' ? (j % 2 ? '#ffd0dc' : '#f4a0b8') : L.leaf[j % 3])); lf.scale.y = 0.6; lf.position.set(s * 0.1, -P.armL[0] * (0.25 + j * 0.2), 0.08); sh.add(lf); }   /* tufos de folha (ou flor) no braço */
    if (twigs & (s < 0 ? 2 : 4)) twigLeaves(el, P.armL[1]); return { sh, el, hand }; };
  const leg = s => { const hp = new THREE.Group(); hp.position.set(s * P.legX, 0, 0); hips.add(hp); hp.add(cyl(P.legL[0], P.legR[0], P.legR[0] * 0.85)); const kn = new THREE.Group(); kn.position.y = -P.legL[0]; hp.add(kn); kn.add(cyl(P.legL[1], P.legR[0] * 0.85, P.legR[1])); const ft = new THREE.Group(); ft.position.y = -P.legL[1]; kn.add(ft);
    const r0 = P.legR[1], nr = kind === 'ent_oak' ? 6 : 5; for (let q = 0; q < nr; q++) { const a = (q / nr) * Math.PI * 2 + 0.3 + s * 0.4, len = r0 * (2.4 + (q % 2) * 1.3) + 0.12, crv = new THREE.CatmullRomCurve3([entV(0, r0 * 0.9, 0), entV(Math.sin(a) * r0 * 0.9, r0 * 0.1, Math.cos(a) * r0 * 0.9), entV(Math.sin(a) * len * 0.65, -r0 * 0.05, Math.cos(a) * len * 0.65), entV(Math.sin(a + 0.35) * len, -r0 * 0.12, Math.cos(a + 0.35) * len)]); ft.add(entTaper(crv, 8, r0 * 0.42, r0 * 0.06, bm, 5)); }   /* raízes que se espalham pelo chão */
    if (twigs & (s < 0 ? 8 : 16)) twigLeaves(kn, P.legL[1]); return { hp, kn, ft }; };
  const A = arm(-1), B = arm(1), LA = leg(-1), LB = leg(1);
  const crown = new THREE.Group(); head.add(crown); const cy = h * { ent_oak: 1.5, ent_willow: 2.0, ent_cherry: 2.9 }[kind], cz = -h * { ent_oak: 1.3, ent_willow: 2.1, ent_cherry: 2.3 }[kind]; crown.position.set(0, cy, cz); let hang = null;
  if (!dry && kind !== 'ent_willow') for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.7, crv = new THREE.CatmullRomCurve3([entV(Math.sin(a) * h * 0.3, h * 0.9, -h * 0.1), entV(Math.sin(a) * h * 0.8, h * 1.4, -h * 0.6), entV(Math.sin(a) * h * 1.6, cy + h * 1.0, cz - h * 0.1)]); head.add(entTaper(crv, 6, h * 0.22, h * 0.08, bm, 6)); }   /* galhos grossos ligam a cabeça à copa */   /* a copa fica por cima e para trás: o rosto aparece */
  if (!dry) { if (kind === 'ent_oak') { for (const [n, r0, rr, ci, y0] of [[9, 0.62, 1.0, 2, 0.35], [18, 0.48, 1.5, 0, 0.45], [24, 0.32, 1.85, 1, 0.5]]) for (let i = 0; i < n; i++) { const a = rnd() * 6.28, r = rr * Math.sqrt(rnd()), c = rnd() < 0.03 ? '#6a6a22' : L.leaf[(ci + (rnd() < 0.3 ? 1 : 0)) % 3], l = new THREE.Mesh(new THREE.IcosahedronGeometry(r0 * (0.75 + rnd() * 0.5), 1), lm(c)); l.position.set(Math.cos(a) * r, y0 + rnd() * 0.5 - r * 0.15 + Math.max(0, Math.sin(a)) * r * 0.25, Math.sin(a) * r * 0.6 - 0.3); l.scale.y = 0.62; crown.add(l); }   /* copa em três camadas: escura por dentro, clara por fora */
      if (st >= 2) { for (let i = 0; i < 8; i++) { const ac = new THREE.Group(), nut = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat('#9a7a3a', 'wood')); nut.scale.y = 1.3; ac.add(nut); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 4, 0, 6.3, 0, 1.4), mat('#5a4020', 'wood')); cap.position.y = 0.04; ac.add(cap); ac.position.set((rnd() - 0.5) * 2.6, 0.2 + rnd() * 0.2, 0.2 + rnd() * 0.5); crown.add(ac); }   /* bolotas */
        const nest = new THREE.Group(), tr = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.07, 6, 14), lm('#6a4a24')); tr.rotation.x = Math.PI / 2; nest.add(tr); for (let i = 0; i < 3; i++) { const eg = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('#a8d8e8', 'cloth')); eg.scale.y = 1.3; eg.position.set((i - 1) * 0.07, 0.03, (i % 2) * 0.05); nest.add(eg); } nest.position.set(0.55, 1.15, 0.1); crown.add(nest); } }   /* ninho com ovos */
    else if (kind === 'ent_willow') { hang = new THREE.Group(); crown.add(hang); const nS = 44 + st * 8;
      for (const [n, rr, y, sz] of [[5, 0.12, 0.42, 0.3], [9, 0.38, 0.3, 0.3], [13, 0.62, 0.12, 0.26]]) for (let i = 0; i < n; i++) { const a = i / n * 6.28 + rr * 3, l = new THREE.Mesh(new THREE.IcosahedronGeometry(sz * (0.8 + rnd() * 0.4), 1), lm(L.leaf[(i + n) % 3])); l.scale.set(1, 0.7, 1); l.position.set(Math.cos(a) * rr, y + rnd() * 0.08, Math.sin(a) * rr); crown.add(l); }   /* topo da cabeleira, em cúpula */
      for (let i = 0; i < nS; i++) { let a = rnd() * 6.28; if (Math.sin(a) > 0.55 && Math.abs(Math.cos(a)) < 0.6) a += Math.PI * 0.42 * (Math.cos(a) >= 0 ? -1 : 1); const r = 0.15 + rnd() * 0.5, len = (1.4 + rnd() * 2.0) * (0.8 + st * 0.12), crv = new THREE.CatmullRomCurve3([entV(Math.cos(a) * r * 0.3, 0.12, Math.sin(a) * r * 0.3), entV(Math.cos(a) * r, 0.2, Math.sin(a) * r), entV(Math.cos(a) * r * 1.35, -len * 0.45, Math.sin(a) * r * 1.35), entV(Math.cos(a) * r * 1.45, -len, Math.sin(a) * r * 1.45)]); hang.add(entTaper(crv, 8, 0.03, 0.01, mat(L.leaf[i % 3], 'cloth'), 4));
        for (let j = 1; j <= 4; j++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), lm(L.leaf[(i + j) % 3])); lf.scale.set(0.5, 1.6, 0.5); lf.position.copy(crv.getPointAt(0.3 + j * 0.16)); hang.add(lf); } }   /* ramos caídos com folhinhas */
      if (st >= 2) for (let i = 0; i < 20; i++) { const dw = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), mat('#cff4ff', 'gem', { emissive: '#6ac8ff', emissiveIntensity: 0.8 })); dw.position.set((rnd() - 0.5) * 1.2, -rnd() * 2.5, (rnd() - 0.5) * 1.2); hang.add(dw); } }   /* gotas de orvalho que brilham */
    else { for (let tier = 0; tier < 3; tier++) { const y = 0.1 + tier * 0.55, R = 1.5 - tier * 0.35, ox = (tier - 1) * 0.35; for (let i = 0; i < 11; i++) { const a = i / 11 * 6.28 + tier, l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), lm(L.leaf[(i + tier) % 3])); l.scale.set(1.1 + rnd() * 0.35, 0.34 + rnd() * 0.12, 0.9 + rnd() * 0.3); l.position.set(ox + Math.cos(a) * R * 0.6, y + rnd() * 0.1, Math.sin(a) * R * 0.45); crown.add(l); }
        for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, rr = R * 0.65 * Math.sqrt(rnd()), bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), lm(rnd() < 0.5 ? '#fff0f4' : '#ffc4d4')); bl.position.set(ox + Math.cos(a) * rr, y + 0.13, Math.sin(a) * rr * 0.75); crown.add(bl); } }   /* camadas planas com cachos de flor */
      if (st >= 2) for (let i = 0; i < 4; i++) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat('#fff0d8', 'cloth', { emissive: '#ffb050', emissiveIntensity: 1.2 })); lamp.scale.y = 1.3; lamp.position.set((i - 1.5) * 0.7, -0.38, (i % 2 - 0.5) * 0.6); crown.add(lamp); const th = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 3), mat('#3a2a1a', 'cloth')); th.position.set((i - 1.5) * 0.7, -0.17, (i % 2 - 0.5) * 0.6); crown.add(th); } }   /* lanternas */
    if (st >= 3) { const glow = mat('#000', 'gem', { emissive: kind === 'ent_willow' ? '#6ad0ff' : kind === 'ent_cherry' ? '#ffd070' : '#ffb040', emissiveIntensity: 1.6 }); for (let i = 0; i < 7; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.02), glow); const a = -0.8 + i * 0.27; g.position.set(Math.sin(a) * P.torso[1] * 1.02, 0.4 + (i % 3) * 0.35, Math.cos(a) * P.torso[1] * 1.02); g.rotation.y = a; spine.add(g); } } }   /* runas acesas no ancião */
  else for (let i = 0; i < 6; i++) { const a = (i - 2.5) * 0.45, crv = new THREE.CatmullRomCurve3([entV(0, 0, 0), entV(Math.sin(a) * 0.25, 0.3, 0), entV(Math.sin(a) * 0.5, 0.55, (i % 2 - 0.5) * 0.2), entV(Math.sin(a + 0.4) * 0.6, 0.8, 0)]); crown.add(entTaper(crv, 6, 0.06, 0.008, bm, 5)); }   /* tronco seco: galhos pelados e retorcidos */
  return { root, hips, spine, chest: spine, head, neckJ, A, B, LA, LB, weapon: null, kind, entBody: body, face: F, crown, hang };
}
function entFace(R, md, blink, mo) {   /* expressão: olhos piscam, sobrancelha franze na raiva e cai na tristeza, a boca mexe ao falar */
  const F = R.face; if (!F) return; const shut = blink || md === 'sleep';
  for (const e of F.eyes) e.scale.y = shut ? 0.12 : md === 'sad' ? 0.6 : md === 'ang' ? 0.75 : 1;
  for (const b of F.brows) { const s = b.userData.s; b.rotation.z = s * (md === 'ang' ? 0.55 : md === 'sad' ? -0.45 : 0.1); b.position.y = b.userData.y + F.h * (md === 'ang' ? -0.07 : md === 'sad' ? 0.04 : 0); }
  F.mouth.scale.set(md === 'ang' ? 1.3 : 1, mo ? 3.2 : md === 'ang' ? 1.6 : md === 'sad' ? 0.6 : 1, 1); F.mouth.rotation.x = md === 'sad' ? 0.2 : 0; F.mouth.rotation.z = 0;
  if (F.eyeM.emissiveIntensity > 0) F.eyeM.emissiveIntensity = md === 'ang' ? 2.4 : md === 'sad' ? 0.6 : md === 'sleep' ? 0.35 : 1.3;
}
const _entRigs = new Map();
function entMood(I) { if (I.dry) return 'sad'; if (I.fi) return 'ang'; if (I.max && I.hp / I.max < 0.3) return 'sad'; return ''; }
function entRigFor(kind, st, tw, dry) { const key = kind + st + 't' + (tw || 0) + (dry ? 'd' : ''); let R = _entRigs.get(key); if (!R) { R = buildEntRig(kind, st, tw || 0, dry); _entRigs.set(key, R); } return R; }
function entSprite3D(e, P) {
  const I = G.ents[e.id] || { st: 1, lost: 0, tw: 0, dry: 0 }, st = I.st || 1, key = e.kind + st + 't' + (I.tw || 0) + (I.dry ? 'd' : ''), now = performance.now();
  let hs = 0; for (const ch of String(e.id)) hs += ch.charCodeAt(0);
  const md = I.sl ? 'sleep' : entMood(I), bl = !I.dry && !I.sl && (now + hs * 997) % 4300 < 150 ? 1 : 0, mo = e.bubble && e.bubble.until - now > 1600 ? Math.floor(now / 140) % 2 : 0, sw = I.dry ? 0 : Math.floor(now / 280) % 8;   /* piscar, falar e o vento na copa */
  return cache3('en3|' + key + '|' + (I.lost || 0) + '|' + (I.sl ? 's' : '') + md + bl + mo + sw + '|' + pose3Key(P), () => {
    const R = entRigFor(e.kind, st, I.tw, I.dry);
    R.A.el.visible = !(I.lost & 2); R.B.el.visible = !(I.lost & 4); R.LA.kn.visible = !(I.lost & 8); R.LB.kn.visible = !(I.lost & 16);
    entFace(R, md, bl, mo); const sa = Math.sin(sw / 8 * Math.PI * 2); R.crown.rotation.z = sa * (e.kind === 'ent_willow' ? 0.05 : 0.035); R.crown.rotation.x = Math.cos(sw / 8 * Math.PI * 2) * 0.02; if (R.hang) R.hang.rotation.x = sa * 0.07;
    const Q = buildPose('knight', P); if (I.sl) { Q.tl = 0.5; Q.ht = 0.5; Q.aA = [0.3, 0.2, 0.3]; Q.aB = [0.3, 0.2, 0.3]; Q.lA = [1.1, -1.6]; Q.lB = [1.1, -1.6]; }   /* dormindo: sentada e curvada */
    if (I.dry) { Q.tl = 0.15; Q.ht = 0.4; Q.aA = [-0.2, 0.6, 0.2]; Q.aB = [-0.2, 0.6, 0.2]; }
    applyPose(R, Q, P, P.walk >= 0 ? P.walk / 12 * Math.PI * 2 : 0); return entShoot(R, P.dir | 0, ENT_K[st]);
  }, 'en|' + e.id + (P.dir | 0));
}
function entShoot(R, dir, K) {   /* foto num quadro maior (como o dragão), apoiando os pés no chão */
  const { renderer, scene, cam } = R3; const a = dir * Math.PI / 4, yaw = Math.atan2(0.5 * Math.sin(a), Math.cos(a)); R.root.rotation.set(0, yaw, 0); R.root.position.set(0, 0, 0); R.root.updateMatrixWorld(true);
  let minY = Infinity; const v = new THREE.Vector3(); for (const f of [R.LA.ft, R.LB.ft, R.hips]) { f.getWorldPosition(v); minY = Math.min(minY, v.y); } if (minY !== Infinity) R.root.position.y = -Math.min(minY, 0.6) + 0.03; R.root.updateMatrixWorld(true);
  const sv = [cam.left, cam.right, cam.top, cam.bottom]; cam.left *= K; cam.right *= K; cam.top *= K; cam.bottom *= K; cam.updateProjectionMatrix();
  const W = Math.round(FRAME_W * PXU * K), H = Math.round(FRAME_H * PXU * K); renderer.setSize(W, H, false); scene.add(R.root); renderer.render(scene, cam); scene.remove(R.root);
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(renderer.domElement, 0, 0);   /* copia antes de voltar o tamanho (mudar o tamanho apaga a imagem) */
  [cam.left, cam.right, cam.top, cam.bottom] = sv; cam.updateProjectionMatrix(); renderer.setSize(R3.W, R3.H, false);
  return { c, w: FRAME_W * K, h: FRAME_H * K, ax: FRAME_W * K / 2, ay: FOOT_Y * K, painted: true, hd: true };
}
function entNear() { const me = G.me; if (!me || me.downed) return null; for (const id in G.ents) { const I = G.ents[id], e = G.npcs[id]; if (!e || I.own !== me.name || I.dry) continue; if (Math.hypot(e.rx - me.x, e.ry - me.y) < 2.6 + (I.st || 1) * 0.5) return e; } return null; }
function sapNearMine() { const me = G.me; if (!me) return null; for (const s of G.saps || []) if (s.own === me.name && Math.hypot(s.x - me.x, s.y - me.y) < 2) return s; return null; }
function entMenu(e) {
  const I = G.ents[e.id]; if (!I) return; const opt = (o, ic, t, sub) => '<button class="lift-btn" data-o="' + o + '"><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  const html = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">' + ['', 'Broto', 'Adulta', 'Anciã'][I.st] + ' · vida ' + I.hp + '/' + I.max + (I.lost ? ' · sem ' + Object.keys(ENT_LOST).filter(k => I.lost & ENT_LOST[k]).length + ' galho(s), rebrotando' : '') + '</div><div class="lift-list" style="padding-top:8px">' +
    (I.st >= 2 ? opt('ride', '🧙', 'Montar nas costas', 'Você sobe na guardiã e a controla: WASD anda, 1 a 4 são os golpes dela, F desce. Não entra perto da cidade.') : '') + opt('follow', '🌳', 'Me acompanhe', 'Anda com você fora da cidade e luta ao seu lado. Na cidade, ela espera dormindo num bosque.') + opt('guard', '📍', 'Guarde aqui', 'Fica neste ponto e enfrenta quem chegar.') + opt('rest', '💤', 'Descanse', 'Vai dormir no bosque mais perto até você chamar.') + opt('attack', '⚔', 'Ataque aquele alvo', 'Clique num inimigo para ela ir para cima.') + opt('ranged', '🪨', I.rg ? 'Voltar a lutar de perto' : 'Ataque de longe e cura', I.rg ? 'Ela volta a ir para cima dos inimigos.' : 'Fica atrás de você, longe dos inimigos e do seu fogo, arremessa pedras, galhos e troncos (conforme a sua Terra) e cura você e os amigos perto dela.') + '</div>';
  const d = staffPanel('entmenu', ENT_NAME[{ ent_oak: 'earth', ent_willow: 'water', ent_cherry: 'wind' }[e.kind]] + ' · guardiã', html);
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; d.remove(); if (o === 'ride') { Net.send({ t: 'ent', a: 'ride' }); return; } if (o === 'attack') { G.entPick = true; showToast('Clique no inimigo (Esc cancela).'); return; } Net.send({ t: 'ent', a: 'order', o }); });
}
function drawEntFx(ctx, now) {   /* ritual do despertar, arremessos e lascas */
  const ox = G.view.ox, oy = G.view.oy;
  const C = G.entCut; if (C) { const t = (now - C.t0) / 1000; if (t > 9.5) G.entCut = null; else { const p = iso(C.x, C.y), x = p.sx + ox, y = p.sy + oy;
    const rk = Math.max(0, Math.min(1, t / 0.6) * (1 - Math.max(0, Math.min(1, (t - 5) / 1.5)))); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,240,110,' + (0.8 * rk).toFixed(2) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y, 34, 15, 0, 0, 7); ctx.stroke(); for (let k = 0; k < 10; k++) { const a = now / 900 + k * 0.628; ctx.fillStyle = 'rgba(190,255,150,' + rk.toFixed(2) + ')'; ctx.font = '7px serif'; ctx.fillText('ᚱᚢᚾᛖᛋ'[k % 5], x + Math.cos(a) * 34 - 2, y + Math.sin(a) * 15 + 2); }   /* runas */
      const ck = t > 1 && t < 5.5 ? Math.min(1, (t - 1) / 0.6) * (1 - Math.max(0, (t - 4.5))) : 0; if (ck > 0) { ctx.strokeStyle = 'rgba(200,255,130,' + (0.7 * ck * (0.6 + 0.4 * Math.sin(now / 90))).toFixed(2) + ')'; ctx.lineWidth = 1.2; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 11); ctx.stroke(); } } ctx.restore();   /* rachaduras */
      if (t > 1 && t < 4.6) { G.shake = Math.max(G.shake || 0, 3); if (Math.random() < 0.5) spawnPart('dust', p.sx + (Math.random() - 0.5) * 30, p.sy - Math.random() * 6, { vx: (Math.random() - 0.5) * 0.08, vy: -0.08 }); }
      if (t > 2.5 && R3.ok) { const grow = Math.min(1, (t - 2.5) / 2), pull = Math.max(0, Math.min(1, (t - 4.5) / 1)), st = C.st || 1, fake = { id: '_cut', kind: ENT_KIND[C.k] }; G.ents._cut = { st, lost: 0, tw: 0, dry: 0, sl: 0 }; const s = entSprite3D(fake, { dir: 1, walk: t > 6.5 && t < 7.2 ? Math.floor((t - 6.5) * 16) % 12 : -1, view: 'S' });
        const sc = 0.15 + 0.85 * (1 - Math.pow(1 - grow, 3)), sink = (1 - pull) * s.h * 0.3 * sc; ctx.save(); ctx.beginPath(); ctx.rect(x - 400, y - 600, 800, 600 + 4); ctx.clip(); ctx.translate(x, y + sink); ctx.scale(sc, sc); ctx.imageSmoothingEnabled = true; ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore(); }   /* a muda cresce, sai da terra */
      /* a fala aparece no balão normal de NPC */ } }
  G.entThrows = (G.entThrows || []).filter(T => now - T.t0 < T.ms + 900);
  for (const T of G.entThrows) { const k = (now - T.t0 - 500) / T.ms; if (k < 0 || k > 1) continue; const a = iso(T.x0, T.y0), b = iso(T.x1, T.y1), x = a.sx + (b.sx - a.sx) * k + ox, y = a.sy + (b.sy - a.sy) * k + oy - 40 * (1 - k) - Math.sin(Math.PI * k) * 50;
    ctx.save(); ctx.translate(x, y); ctx.rotate(k * 9); if (T.log) { ctx.fillStyle = T.log === 2 ? '#3a2418' : '#6a4a2a'; ctx.fillRect(-(T.big ? 14 : 8), -2.5, T.big ? 28 : 16, 5); ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.arc(T.big ? 14 : 8, 0, 2.5, 0, 7); ctx.fill(); } else { const r = T.big ? 7 : 3.2; ctx.fillStyle = '#8a8478'; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(-r * 0.4, -r); ctx.lineTo(r * 0.8, -r * 0.6); ctx.lineTo(r, r * 0.3); ctx.lineTo(0, r); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(-r * 0.3, -r * 0.6, r * 0.5, r * 0.3); } ctx.restore();
    if (k > 0.95 && !T.hitFx) { T.hitFx = 1; G.shake = Math.max(G.shake || 0, T.big ? 8 : 3); for (let q = 0; q < (T.big ? 20 : 8); q++) spawnPart('dust', b.sx + (Math.random() - 0.5) * 20, b.sy - Math.random() * 8, { vx: (Math.random() - 0.5) * 0.12, vy: -0.06 }); } }
  entLogFlight(ctx, now, ox, oy); entLeafFx(ctx, now, ox, oy);
  G.entChips = (G.entChips || []).filter(c => now - c.t0 < 1500); for (const c of G.entChips) if (!c.fx) { c.fx = 1; const p = iso(c.x, c.y); for (let q = 0; q < 16; q++) spawnPart('spark', p.sx + (Math.random() - 0.5) * 16, p.sy - 30 - Math.random() * 20, { color: 'rgba(120,80,40,A)' }); }   /* lascas do galho arrancado */
}

// ---------- galhos que caem e viram lenha, folhas, pétalas, vagalumes e a queda ao morrer ----------
function entLogDrop(n, r, part) {   /* servidor: o galho arrancado cai perto e qualquer um pode pegar como lenha */
  S.entLogs = (S.entLogs || []).filter(u => Date.now() - u.t < 600000); const a = Math.random() * 6.28, d = 0.9 + Math.random() * 0.9;
  S.entLogs.push({ id: 'el' + Date.now() + Math.floor(Math.random() * 1000), x: n.x + Math.cos(a) * d, y: n.y + Math.sin(a) * d, x0: n.x, y0: n.y, k: r.k, st: r.st || 1, part, rot: Math.random() * 6.28, t: Date.now() });
  Net.toAll({ t: 'entlogs', l: S.entLogs }); }
function entLogTake(p, id) { const L = S.entLogs || [], u = L.find(x => x.id === id); if (!u || (p.fl || 0) !== 0 || dist(u.x, u.y, p.x, p.y) > 1.8) return; L.splice(L.indexOf(u), 1); const q = 2 + (u.st || 1); p.inv.log = (p.inv.log || 0) + q; sendStat(p); Net.toOne(p.id, { t: 'loot', k: 'log' }); tell(p, 'Você recolheu o galho: ' + q + ' toras de madeira.'); Net.toAll({ t: 'entlogs', l: L }); }
if (typeof G !== 'undefined') { G.entLogs = G.entLogs || []; G.entLeaves = G.entLeaves || []; G.entLogFall = G.entLogFall || {}; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peE2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'entride') { const pe = G.players[m.pid]; if (pe) pe.rideEnt = m.on ? m.id : null; if (m.pid === G.myId) { G.riding = m.on ? m.id : null; showToast(m.on ? 'Montado: WASD anda · 1 soco · 2 arremesso · 3 especial · 4 golpe forte · F desce' : 'Você desceu da guardiã.'); } return true; }
  if (m.t === 'entlogs') { const had = new Set((G.entLogs || []).map(u => u.id)); for (const u of m.l || []) if (!had.has(u.id) && Date.now() - u.t < 3000) G.entLogFall[u.id] = now; G.entLogs = m.l || []; return true; }
  if (m.t === 'entdie') { const e = G.npcs[m.id]; (G.entDeaths = G.entDeaths || {})[m.id] = { t0: now, ash: m.ash }; if (e) { const I = G.ents[m.id]; if (G.view && I) { const p = iso(e.rx, e.ry), K = ENT_K[I.st || 1], L0 = ENT_LOOK[e.kind]; for (let i = 0; i < 40; i++) G.entLeaves.push({ x: p.sx + (Math.random() - 0.5) * 30 * K, y: p.sy - FOOT_Y * K * (0.5 + Math.random() * 0.4), gy: p.sy + (Math.random() - 0.4) * 14 * K, t0: now + Math.random() * 900, ph: Math.random() * 6, c: e.kind === 'ent_cherry' ? '#f0a0b8' : ['#8a7a2a', '#6a5a24', L0.leaf[i % 3]][i % 3], pet: e.kind === 'ent_cherry' }); } } return true; }   /* as folhas secam e caem todas */
  return _peE2(m, now); }; }
const ENT_BARKC = { earth: ['#5e4428', '#7a5a36'], water: ['#5a5240', '#7a7058'], wind: ['#2a1c18', '#4a3028'] };
function entLogPaint(ctx, u, sc) {   /* um galho de verdade: tronco que afina, forquilhas, folhas da espécie (ou raízes, se era perna) */
  const C = ENT_BARKC[u.k] || ENT_BARKC.earth, leaf = (ENT_LOOK[ENT_KIND[u.k]] || ENT_LOOK.ent_oak).leaf, len = (16 + (u.st || 1) * 6) * sc, leg = u.part === 'legL' || u.part === 'legR';
  ctx.lineCap = 'round'; ctx.strokeStyle = C[0]; ctx.lineWidth = (2.6 + (u.st || 1) * 0.9) * sc; ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -1.5 * sc, len / 2, 0.5 * sc); ctx.stroke();
  ctx.strokeStyle = C[1]; ctx.lineWidth = 0.7 * sc; ctx.beginPath(); ctx.moveTo(-len / 2, -0.8 * sc); ctx.quadraticCurveTo(0, -2.2 * sc, len / 2, -0.3 * sc); ctx.stroke();
  ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.ellipse(-len / 2, 0, 1.1 * sc, (1.4 + (u.st || 1) * 0.45) * sc, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 0.4 * sc; ctx.beginPath(); ctx.ellipse(-len / 2, 0, 0.6 * sc, 0.8 * sc, 0, 0, 7); ctx.stroke();   /* a ponta arrancada, clara */
  ctx.strokeStyle = C[0]; ctx.lineWidth = 1.1 * sc; const forks = leg ? [[0.5, 1], [0.62, -1], [0.75, 1], [0.85, -1]] : [[0.2, -1], [0.45, 1], [0.7, -1]];
  for (const [t, s] of forks) { const x0 = -len / 2 + len * t; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.quadraticCurveTo(x0 + 3 * sc, s * 3 * sc, x0 + 6 * sc, s * (leg ? 3.5 : 5) * sc); ctx.stroke();
    if (!leg) for (let j = 0; j < 3; j++) { ctx.fillStyle = u.k === 'wind' ? ['#f0a0b8', '#ffd0dc', '#e07894'][j] : leaf[j % 3]; ctx.beginPath(); ctx.ellipse(x0 + (5 + j * 1.6) * sc, s * (4 + j) * sc, 2 * sc, 1.1 * sc, s * 0.6 + j, 0, 7); ctx.fill(); } }
  if (u.k === 'water' && !leg) { ctx.strokeStyle = leaf[0]; ctx.lineWidth = 0.6 * sc; for (let j = 0; j < 4; j++) { const x0 = -len / 4 + j * len / 6; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.quadraticCurveTo(x0 + 1.5 * sc, 4 * sc, x0 + 0.5 * sc, 8 * sc); ctx.stroke(); } }   /* salgueiro: ramos pendentes */
}
function entLogNear() { const me = G.me; if (!me || (me.fl || 0) !== 0) return null; let best = null, bd = 1.5; for (const u of G.entLogs || []) { const d = Math.hypot(u.x - me.x, u.y - me.y); if (d < bd) { bd = d; best = u; } } return best; }
function drawEntLogs(ctx, P, now) {   /* chão: galhos já caídos */
  if (!G.me || (G.me.fl || 0) !== 0) return; for (const u of G.entLogs || []) { const ft = G.entLogFall[u.id]; if (ft && now - ft < 1100) continue; const q = P(u.x, u.y, 0); ctx.save(); ctx.translate(q[0], q[1]); softDab(ctx, 0, 1, 12, '#000000', 0.25); ctx.scale(1, 0.55); ctx.rotate(u.rot); entLogPaint(ctx, u, 1); ctx.restore(); } }
function entLogFlight(ctx, now, ox, oy) {   /* no ar: o galho gira, cai e quica duas vezes */
  for (const u of G.entLogs || []) { const ft = G.entLogFall[u.id]; if (!ft) continue; const t = now - ft; if (t >= 1100) { delete G.entLogFall[u.id]; continue; }
    const a = iso(u.x0, u.y0), b = iso(u.x, u.y), H = 26 + (u.st || 1) * 14; let x, y, rot, sq;
    if (t < 650) { const k = t / 650; x = a.sx + (b.sx - a.sx) * k; y = a.sy + (b.sy - a.sy) * k - H * (1 - k * k) - Math.sin(Math.PI * k) * 10; rot = u.rot * k + k * 8; sq = 1 - k * 0.45; }
    else { const k = (t - 650) / 450, hop = k < 0.6 ? Math.sin(Math.PI * k / 0.6) * 7 : Math.sin(Math.PI * (k - 0.6) / 0.4) * 2.5; x = b.sx; y = b.sy - hop; rot = u.rot + (1 - k) * 0.6; sq = 0.55;
      if (!u._thud && G.view) { u._thud = 1; for (let q = 0; q < 6; q++) spawnPart('dust', b.sx + (Math.random() - 0.5) * 14, b.sy - 2, { vx: (Math.random() - 0.5) * 0.08, vy: -0.04 }); } }
    ctx.save(); ctx.translate(x + ox, y + oy); ctx.scale(1, sq); ctx.rotate(rot); entLogPaint(ctx, u, 1); ctx.restore(); } }
function entLeafFx(ctx, now, ox, oy) {   /* folhas de carvalho e salgueiro, pétalas da cerejeira, vagalumes do salgueiro */
  const dt = Math.min(60, now - (G._entLfT || now)); G._entLfT = now; const night = typeof WT !== 'undefined' && WT.ph != null ? (WT.ph < 0.22 || WT.ph > 0.78) : false;
  for (const id in G.ents) { const I = G.ents[id], e = G.npcs[id]; if (!e || I.dry || (G.entDeaths && G.entDeaths[id]) || id === '_cut' || G.entLeaves.length > 180) continue; const st = I.st || 1, K = ENT_K[st], p = iso(e.rx, e.ry), top = FOOT_Y * K, busy = I.fi || e.walking ? 2.5 : 1;
    const rate = ({ ent_cherry: 2.4, ent_oak: 0.45, ent_willow: 0.4 }[e.kind] || 0.4) * busy * (0.6 + st * 0.3) * dt / 1000;
    if (Math.random() < rate) { const L0 = ENT_LOOK[e.kind], cherry = e.kind === 'ent_cherry'; G.entLeaves.push({ x: p.sx + (Math.random() - 0.5) * 26 * K, y: p.sy - top * (0.62 + Math.random() * 0.25), gy: p.sy + (Math.random() - 0.4) * 12 * K, t0: now, ph: Math.random() * 6, c: cherry ? ['#f6b0c4', '#ffd8e4', '#e88aa6'][Math.floor(Math.random() * 3)] : Math.random() < 0.25 ? '#a08a30' : L0.leaf[Math.floor(Math.random() * 3)], pet: cherry }); }
    if (e.kind === 'ent_willow' && Math.random() < (night ? 2.2 : 0.7) * dt / 1000 * (0.5 + st * 0.5)) G.entLeaves.push({ ff: 1, x: p.sx + (Math.random() - 0.5) * 34 * K, y: p.sy - top * Math.random() * 0.7, t0: now, ph: Math.random() * 6, life: 3500 + Math.random() * 2500, glow: night ? 1 : 0.55 }); }
  G.entLeaves = G.entLeaves.filter(l => { const a = now - l.t0; if (a < 0) return true; if (l.ff) return a < l.life; return a < 9000 && !(l.rest && now - l.rest > 1800); });
  for (const l of G.entLeaves) { const a = now - l.t0; if (a < 0) continue; ctx.save();
    if (l.ff) { const k = a / l.life, al = Math.sin(Math.PI * k) * (0.5 + 0.5 * Math.sin(now / 180 + l.ph)) * l.glow, x = l.x + Math.sin(a / 900 + l.ph) * 9, y = l.y + Math.cos(a / 1300 + l.ph * 2) * 6 - a * 0.004; ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, 4); g.addColorStop(0, 'rgba(230,255,150,' + al.toFixed(2) + ')'); g.addColorStop(1, 'rgba(160,255,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + ox, y + oy, 4, 0, 7); ctx.fill(); ctx.restore(); continue; }
    if (!l.rest) { l.y += dt * (l.pet ? 0.011 : 0.016); l.x += Math.sin(a / (l.pet ? 300 : 420) + l.ph) * dt * 0.02 + dt * 0.004; if (l.y >= l.gy) { l.y = l.gy; l.rest = now; } }
    const rot = l.rest ? l.ph : a / (l.pet ? 260 : 380) + l.ph, al = l.rest ? Math.max(0, 1 - (now - l.rest) / 1800) : 1, flip = l.rest ? 0.5 : Math.abs(Math.sin(a / 200 + l.ph)) * 0.8 + 0.2;
    ctx.globalAlpha = al; ctx.translate(l.x + ox, l.y + oy); ctx.rotate(rot); ctx.fillStyle = l.c; ctx.beginPath(); if (l.pet) { ctx.ellipse(0, 0, 1.6, 1.1 * flip, 0, 0, 7); } else { ctx.ellipse(0, 0, 2.1, 1.2 * flip, 0, 0, 7); } ctx.fill(); if (!l.pet) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.stroke(); } ctx.restore(); } }
function entDrawDeath(ctx, e, sx, sy, now) {   /* morte: o corpo desaba em partes (ragdoll); se foi o fogo do mestre, escurece e vira cinzas */
  const I = G.ents[e.id] || { st: 1 }, D = (G.entDeaths || {})[e.id], st = I.st || 1; if (!D || !R3.ok || typeof startFall !== 'function') return false;
  let f = FALLS['ent' + e.id]; if (!f) { const R = entRigFor(e.kind, st, I.tw, 1); R.A.el.visible = !(I.lost & 2); R.B.el.visible = !(I.lost & 4); R.LA.kn.visible = !(I.lost & 8); R.LB.kn.visible = !(I.lost & 16); const a = Math.random() * 6.28; f = startFall({ key: 'ent' + e.id, entRig: R, entK: ENT_K[st], mode: 'rag', cls: 'knight', x: e.rx, y: e.ry, dir: e.dir || 0, ix: Math.cos(a), iy: Math.sin(a), force: 1.4 + st * 0.5 }); if (!f) return false; }
  const t = now - D.t0; if (!D.ash) { drawFall(ctx, f, sx, sy, now, 1, 0); return true; }
  const burn = Math.min(1, t / 3000), gone = Math.max(0, Math.min(1, (t - 3800) / 2200)); ctx.save(); ctx.filter = 'brightness(' + (1 - burn * 0.8).toFixed(2) + ') saturate(' + (1 - burn).toFixed(2) + ')'; drawFall(ctx, f, sx, sy, now, 1 - gone, 0); ctx.restore();
  const K = ENT_K[st]; ctx.save(); ctx.fillStyle = 'rgba(60,56,52,' + (0.85 * Math.min(1, t / 4000)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sx, sy, 10 * K * (0.4 + gone * 0.6), 4 * K * (0.4 + gone * 0.6), 0, 0, 7); ctx.fill(); ctx.restore();   /* monte de cinzas */
  if (G.view && Math.random() < 0.5 * (1 - gone * 0.7)) spawnPart('spark', sx - G.view.ox + (Math.random() - 0.5) * 20 * K, sy - G.view.oy - Math.random() * 14 * K, { color: 'rgba(255,' + (120 + Math.floor(Math.random() * 80)) + ',40,A)' });   /* brasas */
  return true; }

// ---------- muda em 3D: cresce com os dias e com a força da Terra do mago ----------
function sapGrowth(s) { const q = Object.values(S.players).find(pp => estOwner(pp) === s.owner), str = q && typeof elemStrength === 'function' ? elemStrength(q, 'earth') : 0, age = (Date.now() - (s.t || Date.now())) / ESTATE_DAY_MS;
  return Math.max(s.g || 0.2, Math.min(1, 0.2 + 0.4 * Math.min(1, age / 3) + 0.4 * Math.max(0, Math.min(1, (str - 25) / 20)))); }
function sapBuild3D(k, g) {
  const kind = ENT_KIND[k] || 'ent_oak', L = ENT_LOOK[kind], root = new THREE.Group(); let sd = 3 + kind.length * 7 + Math.round(g * 10); const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const tx = entBarkTex(L.bark, L.bark2, kind, ''), bm = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.95, side: THREE.DoubleSide }), lm = c => mat(c, 'cloth', { flatShading: true });
  const H = 0.32 + g * 0.6, r0 = 0.022 + g * 0.03, lean = kind === 'ent_cherry' ? 0.12 : 0.03, bloom = kind === 'ent_cherry' && g > 0.45;
  const trunk = new THREE.CatmullRomCurve3([entV(0, 0, 0), entV(lean, H * 0.4, 0), entV(-lean * 0.5, H * 0.75, 0.02), entV(lean * 0.3, H, 0)]); root.add(entTaper(trunk, 8, r0, r0 * 0.3, bm, 6));
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.4; root.add(entTaper(new THREE.CatmullRomCurve3([entV(0, 0.03, 0), entV(Math.cos(a) * r0 * 2, 0.006, Math.sin(a) * r0 * 2), entV(Math.cos(a) * r0 * 4.5, -0.01, Math.sin(a) * r0 * 4.5)]), 4, r0 * 0.6, r0 * 0.1, bm, 4)); }   /* raízes */
  const leafAt = (p, n, sz) => { for (let j = 0; j < n; j++) { const c = bloom ? (rnd() < 0.5 ? '#ffd0dc' : '#f4a0b8') : kind === 'ent_cherry' && !bloom ? ['#6aa848', '#80b858', '#5a9a3a'][j % 3] : L.leaf[j % 3], l = new THREE.Mesh(new THREE.IcosahedronGeometry(sz * (0.7 + rnd() * 0.6), 0), lm(c)); l.scale.y = kind === 'ent_cherry' ? 0.45 : 0.6; l.position.set(p.x + (rnd() - 0.5) * sz * 3, p.y + (rnd() - 0.3) * sz * 1.6, p.z + (rnd() - 0.5) * sz * 3); root.add(l); } };
  const strands = (p, n, len) => { for (let j = 0; j < n; j++) { const a = rnd() * 6.28, rr = 0.02 + rnd() * 0.04, crv = new THREE.CatmullRomCurve3([p.clone(), entV(p.x + Math.cos(a) * rr * 2, p.y - len * 0.3, p.z + Math.sin(a) * rr * 2), entV(p.x + Math.cos(a) * rr * 2.6, p.y - len, p.z + Math.sin(a) * rr * 2.6)]); root.add(entTaper(crv, 5, 0.008, 0.004, mat(L.leaf[j % 3], 'cloth'), 3)); for (let q = 1; q < 4; q++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 3), lm(L.leaf[(j + q) % 3])); lf.scale.set(0.6, 1.6, 0.6); lf.position.copy(crv.getPointAt(q / 4)); root.add(lf); } } };
  const nb = 2 + Math.round(g * 4); for (let i = 0; i < nb; i++) { const t = 0.42 + i / nb * 0.5, p = trunk.getPointAt(t), a = i * 2.4 + 0.5, bl = (0.09 + g * 0.17) * (1 - t * 0.35), up = kind === 'ent_willow' ? 0.1 : kind === 'ent_cherry' ? 0.25 : 0.55, end = entV(p.x + Math.cos(a) * bl, p.y + bl * up + 0.02, p.z + Math.sin(a) * bl);
    root.add(entTaper(new THREE.CatmullRomCurve3([p, entV((p.x + end.x) / 2, p.y + bl * 0.3, (p.z + end.z) / 2), end]), 4, r0 * 0.45, r0 * 0.1, bm, 4));   /* galhinhos */
    if (kind === 'ent_willow') strands(end, 2 + Math.round(g * 3), 0.12 + g * 0.28); else leafAt(end, 2 + Math.round(g * 4), 0.03 + g * 0.025); }
  const top = trunk.getPointAt(1); if (kind === 'ent_willow') { leafAt(top, 3 + Math.round(g * 3), 0.035 + g * 0.02); strands(top, 3 + Math.round(g * 4), 0.15 + g * 0.3); } else leafAt(top, 3 + Math.round(g * 5), 0.035 + g * 0.03);   /* broto do topo */
  return root; }
const _sapRigs = new Map();
function sapSprite3D(s, now) {
  const gq = Math.round((s.g || 0.2) * 10) / 10, sw = Math.floor(now / 320) % 6, key = s.k + gq;
  return cache3('sap3|' + key + '|' + sw, () => { let R = _sapRigs.get(key); if (!R) { R = sapBuild3D(s.k, gq); _sapRigs.set(key, R); }
    const { renderer, scene, cam } = R3; R.rotation.set(0, 0.6, Math.sin(sw / 6 * Math.PI * 2) * 0.05); R.position.set(0, 0.03, 0); R.updateMatrixWorld(true);   /* balança com o vento */
    renderer.setSize(Math.round(FRAME_W * PXU), Math.round(FRAME_H * PXU), false); scene.add(R); renderer.render(scene, cam); scene.remove(R);
    const W = Math.round(FRAME_W * PXU), Hh = Math.round(FRAME_H * PXU), c = document.createElement('canvas'); c.width = W; c.height = Hh; c.getContext('2d').drawImage(renderer.domElement, 0, 0); renderer.setSize(R3.W, R3.H, false);
    return { c, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; }, 'sap|' + s.id); }
function entRideLift(e) { const id = e.rideEnt || (e === G.me && G.riding); if (!id) return 0; const I = G.ents[id], n = G.npcs[id]; if (!I || !n) return 0; const L0 = ENT_LOOK[n.kind]; if (!L0) return 0; return (L0.P.hipY + L0.P.torso[0] * 0.92) * ENT_SC[I.st || 2] * 0.75 * 25; }   /* altura das costas da guardiã, em px */
