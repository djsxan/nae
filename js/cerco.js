// ============================================================
//  REBELIÃO E CERCO (partes G3 e H): o próximo da linha se rebela quando fica mais forte que a coroa
//  (poder da casa > média do poder das casas leais × legitimidade do rei). Sem aviso, as tropas aparecem
//  no portão do castelo; soldados de verdade (até 20 por lado) lutam até o salão; vence quem ficar 1 minuto
//  no trono sem ser derrubado, ou a defesa, se os rebeldes acabarem. Sem jogador por perto, a luta é calculada.
// ============================================================
const SG = { max: 20, min: 4, perSoldier: 5, hp: 140, dmg: [10, 18], atkMs: 1300, see: 14, throneMs: 60000, throneClear: 3, abstractR: 40, abstractMs: 30000, checkChance: 0.15, cooldownDays: 3, bribe: 3000, bribeTell: 0.3, execLegit: 15, guardShare: 0.5 };

// ---------------- SERVIDOR ----------------
function sgRec() { const C = crownRec(); return C.siege || (C.siege = { on: 0, next: 0, bribed: 0 }); }
function sgHousePow(hid) { return (hRec().st[hid] || {}).power || 0; }
function sgCrownPow(exclude) { const L = HOUSES.filter(h => h.id !== exclude && hRec().st[h.id].crown > 0 && sucRec().king !== 'h:' + h.id); if (!L.length) return 0; return L.reduce((s, h) => s + sgHousePow(h.id), 0) / L.length; }   /* a coroa é tão forte quanto os seus aliados */
function sgRebelNow() { const U = sucRec(), L = sucLine(), next = L[0]; if (!next) return null; let troop = null, pow = 0;
  if (next.startsWith('h:')) { troop = next.slice(2); pow = sgHousePow(troop); }
  else if (next === 'corwyn' && U.alive.corwyn) { const dis = HOUSES.filter(h => sucRec().king !== 'h:' + h.id).sort((a, b) => hRec().st[a.id].crown - hRec().st[b.id].crown)[0]; if (dis && hRec().st[dis.id].crown < 0) { troop = dis.id; pow = sgHousePow(troop); } }
  if (!troop) return null; const cp = sgCrownPow(troop), lg = sucLegit(U.king) / 100; return pow > cp * lg ? { rebel: next, troop, pow, cp, lg } : null; }
function sgGate() { return [CENTER + 1, KEEP.y1 + 3]; }
function sgYard() { return [CENTER + 1, Math.round((KEEP.by + KEEP.y1) / 2)]; }
const SG_LOYAL = { spread: 25, royal: 15, checkMs: 2000, rate: 0.35 };
function sgLoyalty(i) { const lg = sucLegit(sucRec().king); return Math.max(0, Math.min(100, Math.round(lg + (Math.random() * 2 - 1) * SG_LOYAL.spread + (i % 3 === 0 ? SG_LOYAL.royal : 0)))); }
function sgSpawn(side, i, at) { const S0 = sgRec(), h = HOUSE_BY[S0.troop], id = 'sg_' + side + '_' + (S0.seq = (S0.seq || 0) + 1), x = at[0] + ((i % 5) - 2) * 0.7, y = at[1] + Math.floor(i / 5) * 0.8 * (side === 'r' ? 1 : -1);
  const n = { loyal: side === 'd' ? (S0.loyal && S0.loyal[i] != null ? S0.loyal[i] : sgLoyalty(i)) : 100, id, kind: side === 'r' ? 'hh_guard_' + S0.troop : 'k_guard', name: side === 'r' ? 'Soldado da ' + h.n : 'Soldado da Coroa', transient: true, siege: 1, court: 'siege', side, x, y, z: 0, fl: 0, fb: -1, hp: SG.hp, maxHp: SG.hp, downed: null, dead: false, dir: 0 }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n; }
function sgLeader() { const S0 = sgRec(), [gx, gy] = sgGate(), kind = S0.rebel === 'corwyn' ? 'k_corwyn' : 'hh_lord_' + S0.troop, name = (S0.rebel === 'corwyn' ? SUC_NAMES.corwyn : HOUSE_BY[S0.troop].lord) + ' (rebelde)';
  const n = { id: 'sg_lead', kind, name, transient: true, siege: 1, court: 'siege', side: 'r', lead: 1, x: gx, y: gy + 2, z: 0, fl: 0, fb: -1, hp: SG.hp * 1.5, maxHp: SG.hp * 1.5, downed: null, dead: false, dir: 0 }; S.npcs[n.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
function sgSoldiers(side) { return Object.values(S.npcs).filter(n => n.siege && n.side === side && !n.dead && !n.downed && !n.yield); }
/* render-se: quando a defesa fica em desvantagem, os soldados pouco leais largam as armas (os muito leais lutam até o fim) */
function sgSurrender(now) { const S0 = sgRec(); if (now - (S0.t0 || 0) < 30000 || now - (S0.yT || 0) < SG_LOYAL.checkMs) return;   /* ninguém se rende nos primeiros 30 s */ S0.yT = now; const D = sgSoldiers('d').filter(n => !n.sgKing), r = sgSoldiers('r').length, ratio = D.length / Math.max(1, r); if (ratio >= 1) return; let k = 0;
  for (const n of D) if (Math.random() < (1 - ratio) * (1 - n.loyal / 100) * SG_LOYAL.rate) { n.yield = 1; n.walk = true; k++; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Eu me rendo!', 'Chega! Não morro por ele.', 'Larguei a espada!'][Math.floor(Math.random() * 3)], ms: 1 }); }
  if (k) sys(k === 1 ? 'Um soldado da coroa se rendeu e deixa o castelo.' : k + ' soldados da coroa se renderam e deixam o castelo.'); }
function sgStart(R) { const S0 = sgRec(), U = sucRec(), C = crownRec(); S0.loyal = null; Object.assign(S0, { on: 1, rebel: R.rebel, troop: R.troop, t0: now_(), sides: {}, throne: null, seq: 0, abstract: 0, lastAbs: 0, kingOut: null, leadDown: 0 });
  let rc = Math.max(SG.min, Math.min(SG.max, Math.round(R.pow / SG.perSoldier))), dc = Math.max(SG.min, Math.min(SG.max, Math.round(R.cp / SG.perSoldier)) + 4);   /* + a Guarda da cidade */
  const turned = S0.bribed || sucLegit(R.rebel) > sucLegit(U.king); if (turned) { const g = Math.round(dc * SG.guardShare); dc -= g; rc = Math.min(SG.max, rc + g); } S0.turned = turned ? 1 : 0; S0.bribed = 0; S0.rc = rc; S0.dc = dc;
  const lord = Object.values(S.npcs).find(n => n.court === 'house' && n.house === R.troop && n.hrole === 'lord'); if (lord && R.rebel !== 'corwyn') visGone(lord); if (R.rebel === 'corwyn' && S.npcs.k_corwyn) visGone(S.npcs.k_corwyn);
  sgKingJoin(); sgMaterialize(); const who = R.rebel === 'corwyn' ? 'Lorde Corwyn, com as tropas da ' + HOUSE_BY[R.troop].n : HOUSE_BY[R.troop].lord + ' e a ' + HOUSE_BY[R.troop].n;
  sys('⚔ ' + (S0.plead ? who + ' chegaram ao portão e' : 'Sem aviso, ' + who) + ' cercam o castelo! Vence quem ficar um minuto no Trono de Espadas. Bata num soldado e você luta do outro lado.' + (turned ? ' A Guarda da cidade mudou de lado.' : '')); hNews(who + ' se rebelaram contra o ' + sucKingName() + ' e cercaram o castelo.'); near(CENTER, CENTER, { t: 'shake', s: 1 }, 999); estateSave(); }
function sgKingJoin() { const k = S.npcs.k_king; if (!k || k.dead) return; if ((k.fl || 0) !== 0) { const ts = throneSeat(); if (ts) { k.x = ts.x; k.y = ts.y + 1.2; k.fl = 0; k.fb = -1; } } k.siege = 1; k.side = 'd'; k.sgKing = 1; k.hp = Math.max(k.hp || 0, 400); k.maxHp = Math.max(k.maxHp || 0, 400); k.downed = null; sgRec().kingOut = null; }
function sgKingLeave() { const k = S.npcs.k_king; if (k) { k.siege = 0; k.side = null; k.sgKing = 0; } }
function sgMaterialize() { const S0 = sgRec(); if (!S0.loyal) { S0.loyal = []; for (let i = 0; i < 40; i++) S0.loyal.push(sgLoyalty(i)); } for (const n of Object.values(S.npcs)) if (n.siege && !n.sgKing) visGone(n); for (let i = 0; i < S0.rc; i++) sgSpawn('r', i, sgGate()); for (let i = 0; i < S0.dc; i++) sgSpawn('d', i, sgYard()); if (!S0.leadDown) sgLeader(); S0.abstract = 0; }
function sgDematerialize() { const S0 = sgRec(); S0.rc = sgSoldiers('r').filter(n => !n.lead).length; S0.dc = sgSoldiers('d').filter(n => !n.sgKing).length; S0.leadDown = !S.npcs.sg_lead || S.npcs.sg_lead.dead || S.npcs.sg_lead.downed ? 1 : 0; for (const n of Object.values(S.npcs)) if (n.siege && !n.sgKing) visGone(n); S0.abstract = 1; S0.lastAbs = now_(); }
function sgSide(p) { const S0 = sgRec(); return S0.on && S0.sides ? S0.sides[estOwner(p)] || null : null; }
function sgEnemyOf(n) { if (n.yield) return null; const ps = Object.values(S.players).filter(p => !p.downed && !(p.fl || 0) && sgSide(p) && sgSide(p) !== 'out' && sgSide(p) !== n.side);
  let best = null, bd = SG.see; for (const q of Object.values(S.npcs)) { if (!q.siege || q.dead || q.downed || q.yield || q.side === n.side) continue; const d = dist(n.x, n.y, q.x, q.y); if (d < bd) { bd = d; best = { k: 'n', o: q }; } }
  for (const p of ps) { const d = dist(n.x, n.y, p.x, p.y), inside = n.side === 'd' && (inKeep(Math.round(p.x), Math.round(p.y)) || WORLD.bld[tileAt(p.x, p.y)] === castleBi()); if (d < bd || (inside && !best)) { bd = d; best = { k: 'p', o: p }; } } return best; }   /* a defesa caça quem entrou no castelo */
function sgHitSoldier(q, dmg, by) { if (q.yield) return; q.hp -= dmg; if (q.sgKing && q.hp <= 0) { q.hp = 0; const S0 = sgRec(); S0.kingOut = 'dead'; if (by && by.id && S.players[by.id]) npcDie(q, by); else { q.dead = true; sys('O ' + sucKingName() + ' morreu lutando junto ao trono!'); } for (const d of sgSoldiers('d')) d.yield = 1; sgEnd('r', 'dead'); return; } sfx(q.x, q.y, '-' + dmg, '#ff8a6a'); near(q.x, q.y, { t: 'anim', w: 'n', id: q.id, a: 'hurt', ms: 300 }); if (q.hp <= 0) { q.hp = 0; q.downed = { until: now_() + 600000 }; near(q.x, q.y, { t: 'anim', w: 'n', id: q.id, a: 'hurt', ms: 600 }); if (!q.sgKing) setTimeout(() => { if (S.npcs[q.id]) visGone(q); }, 8000); if (q.lead) sys(q.name + ' caiu!'); } }
function sgAI(now, dt) { const S0 = sgRec(), ts = throneSeat();
  sgSurrender(now);
  for (const n of Object.values(S.npcs)) { if (!n.siege || n.dead || n.downed) continue; if (n.yield) { const [gx, gy] = sgGate(); if (dist(n.x, n.y, gx + 4, gy + 6) < 1.2) visGone(n); else n.walk = !npcWalk(n, gx + 4, gy + 6, 1.4, dt); continue; } const E = sgEnemyOf(n);
    if (E) { const o = E.o, d = dist(n.x, n.y, o.x, o.y); if (d > 1.3) { n.walk = !npcWalk(n, o.x, o.y, 2.2, dt); continue; } n.walk = false;
      if (now >= (n.nextAtk || 0)) { n.nextAtk = now + SG.atkMs; n.dir = dirFromVecS(o.x - n.x, o.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: o.x, ty: o.y }); const dmg = rint(SG.dmg[0], SG.dmg[1]);
        if (E.k === 'n') sgHitSoldier(o, dmg, n); else damagePlayer(o, dmg, { npc: 1, id: n.id, x: n.x, y: n.y, type: 'bandit' }); } continue; }
    if (n.sgKing && ts) { if ((n.fl || 0) || dist(n.x, n.y, ts.x, ts.y + 1.2) > 0.6) n.walk = !npcWalk(n, ts.x, ts.y + 1.2, 1.6, dt); else n.walk = false; continue; }   /* o rei fica junto ao trono */
    if (n.side === 'r' && ts) { const KK = S.npcs.k_king, kx = KK && !KK.dead ? KK.x : ts.x, ky = KK && !KK.dead ? KK.y : ts.y, tx = kx + ((n.id.length % 3) - 1) * 1.2, ty = ky + 1.5; if (dist(n.x, n.y, tx, ty) > 0.4) n.walk = !npcWalk(n, tx, ty, 1.8, dt); else n.walk = false; }
    else if (n.side === 'd') { const toThrone = ts && (S0.throne || (+n.id.split('_').pop()) % 2 === 1), [yx, yy] = toThrone ? [ts.x + ((+n.id.split('_').pop()) % 3 - 1) * 1.2, ts.y + 2] : sgYard(); if (dist(n.x, n.y, yx, yy) > (toThrone ? 0.6 : 3)) n.walk = !npcWalk(n, yx, yy, S0.throne ? 2.4 : 1.8, dt); else n.walk = false; } } }   /* metade guarda o pátio, metade o salão; se alguém senta no trono, todos correm para lá */
/* o trono: o líder rebelde (ou um jogador do lado rebelde, sentado) fica 1 minuto sem defensor por perto */
function sgThrone(now) { const S0 = sgRec(), ts = throneSeat(); if (!ts) return; const L = S.npcs.sg_lead; let who = null;
  if (L && !L.dead && !L.downed && !(L.fl || 0) && dist(L.x, L.y, ts.x, ts.y) < 0.7) who = L.name; for (const p of Object.values(S.players)) if (sgSide(p) === 'r' && p.sit && !(p.fl || 0) && dist(p.x, p.y, ts.x, ts.y) < 0.6 && !p.downed) who = p.name;
  const guarded = sgSoldiers('d').some(n => dist(n.x, n.y, ts.x, ts.y) < SG.throneClear) || Object.values(S.players).some(p => sgSide(p) === 'd' && !p.downed && !(p.fl || 0) && dist(p.x, p.y, ts.x, ts.y) < SG.throneClear);
  if (!who || guarded || !S0.kingOut) { if (S0.throne) { S0.throne = null; } return; } if (!S0.throne || S0.throne.who !== who) { S0.throne = { who, t0: now }; sys('👑 ' + who + ' está no Trono de Espadas! Mais um minuto e o castelo cai.'); return; }
  if (now - S0.throne.t0 >= SG.throneMs) sgEnd('r'); }
function sgAbstract(now) { const S0 = sgRec(); if (now - S0.lastAbs < SG.abstractMs) return; S0.lastAbs = now; const r = S0.rc + (S0.leadDown ? 0 : 2), d = S0.dc;
  const ratio = d / Math.max(1, r), avgL = (S0.loyal || []).slice(0, Math.max(1, d)).reduce((s, v) => s + v, 0) / Math.max(1, Math.min(d, (S0.loyal || []).length || 1)), yielded = ratio < 1 ? Math.round(d * (1 - ratio) * (1 - avgL / 100) * SG_LOYAL.rate) : 0; S0.dc = Math.max(0, S0.dc - yielded);
  const kr = Math.round(Math.random() * 0.3 * S0.dc), kd = Math.round(Math.random() * 0.3 * r); S0.rc = Math.max(0, S0.rc - kr); S0.dc = Math.max(0, S0.dc - kd); if (S0.rc === 0 && Math.random() < 0.5) S0.leadDown = 1;
  if (S0.leadDown) sgEnd('d'); else if (S0.dc === 0) sgEnd('r', 'dead'); }
function sgEnd(win, how) { const S0 = sgRec(); if (!S0.on) return; S0.on = 0; how = how || S0.kingOut || 'captured'; S0.next = estDay() + SG.cooldownDays; const U = sucRec(), oldKing = sucKingName(), hid = S0.troop, h = HOUSE_BY[hid];
  for (const n of Object.values(S.npcs)) if (n.siege && !n.sgKing) visGone(n); sgKingLeave(); const K0 = S.npcs.k_king; if (K0) { K0.flee = 0; if (K0.downed && win === 'd') { K0.downed = null; K0.hp = K0.maxHp; } }
  const losers = win === 'd' ? [] : Object.values(S.players).filter(p => { const s = sgSide(p); return s && s !== 'out' && s !== win && (inKeep(Math.round(p.x), Math.round(p.y)) || p.fl); });   /* rebeldes que sobram fogem; defensores de pé são presos */
  if (win === 'r') { const lg = sucLegit(U.king); const exec = false, kdef = COURT.find(d => d.id === 'k_king'); if (how === 'captured' && !exec && kdef) { S0.prisoner = { kind: kdef.kind, name: oldKing + ' (preso)' }; const op = S.npcs.k_oldking; if (op) visGone(op); } if (U.alive[U.king] != null) U.alive[U.king] = 0; U.stage = 'done'; sucApplyKing(S0.rebel);
    const fate = how === 'captured' ? oldKing + (S0.plead ? ' foi capturado e vai para a guilhotina.' : ' foi capturado e está preso no calabouço do castelo.') : oldKing + ' morreu lutando pelo trono.';   /* capturado não morreu lutando */
    sys('⚔ O castelo caiu. ' + fate + ' Viva o ' + sucKingName() + '!'); hNews('O castelo caiu: ' + sucKingName() + ' tomou o trono. ' + fate); }
  else { sys('⚔ O líder rebelde caiu: a rebelião acabou, os rebeldes que sobraram fugiram e o ' + sucKingName() + ' continua no trono.'); const st = hRec().st[hid]; st.power = 5; st.gold = 5;
    if (S0.rebel === 'corwyn') trKill('corwyn', 'levado à guilhotina depois de se rebelar'); else trLordDead(hid, 'levado à guilhotina depois de se rebelar'); hNews('A rebelião da ' + h.n + ' fracassou: a casa perdeu quase todo o poder e o ouro.'); }
  for (const p of losers) { p.murderer = true; secCrime(p, 'treason', 'traição à coroa', 360000); tell(p, 'Você foi capturado do lado que perdeu. É a guilhotina.'); }
  S0.sides = {}; S0.throne = null; estateSave(); }
/* o rei derrotado fica preso numa cela do calabouço do castelo */
function sgPrisoner() { const S0 = sgRec(), b = castleB(); if (!S0.prisoner || !b || S.npcs.k_oldking) return; const [x, y] = localToWorld(b, KJAIL_CELLS[2] + 1.5, 7.6), n = { id: 'k_oldking', kind: S0.prisoner.kind, name: S0.prisoner.name, transient: true, court: 'prisoner', x, y, z: 0, fl: -1, fb: castleBi(), hp: 300, maxHp: 300, downed: null, dead: false, dir: 4 }; S.npcs[n.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
function sgTick(now) { if (!S.estate || !castleB()) return; const S0 = sgRec(), dt = Math.min(0.4, (now - (S.sgT || now)) / 1000) || 0.2; if (now - (S.sgT || 0) < 200) return; S.sgT = now;
  sgPrisoner(); if (!S0.on) { const hh = Math.floor(empHour()); if (S.sgH !== hh) { S.sgH = hh; const U = sucRec(); if ((!U.stage || U.stage === 'done') && estDay() >= (S0.next || 0)) { const R = sgRebelNow(); if (R && Math.random() < SG.checkChance) sgStart(R); } } return; }
  if (!S0.kingOut) { const kk = S.npcs.k_king; if (kk && !kk.sgKing && !kk.dead) sgKingJoin(); }   /* o rei que acabou de aparecer também luta */
  for (const p of Object.values(S.players)) if (p.downed && sgSide(p) && sgSide(p) !== 'out') { S0.sides[estOwner(p)] = 'out'; tell(p, 'Você caiu no cerco: fica fora dele até o fim.'); }
  const ts = throneSeat(), anyone = Object.values(S.players).some(p => ts && dist(p.x, p.y, ts.x, ts.y) < SG.abstractR);
  if (!anyone) { if (!S0.abstract) sgDematerialize(); sgAbstract(now); return; } if (S0.abstract) sgMaterialize();
  sgAI(now, dt); if (!S0.on) return; const L = S.npcs.sg_lead, PL = S0.plead ? Object.values(S.players).find(q => estOwner(q) === S0.plead) : null, leadOut = S0.plead ? (!PL || PL.downed) : (!L || L.dead || L.downed);   /* rebelião de jogador: o líder é o jogador */
  if (sgSoldiers('d').length === 0 && !Object.values(S.players).some(p => sgSide(p) === 'd' && !p.downed && inKeep(Math.round(p.x), Math.round(p.y)))) { /* sem defensor: o trono fica livre para quem chegar */ }
  if (leadOut) sgEnd('d'); }
if (typeof trKill === 'function') { const _tkG = trKill; trKill = function (k, cause) { const S0 = S.estate && sgRec(); if (S0 && S0.on && k === 'king') { S0.kingOut = 'dead'; sys('O ' + sucKingName() + ' morreu na luta pelo castelo!'); return; } return _tkG(k, cause); }; }
if (typeof courtMove === 'function') { const _cmG = courtMove; courtMove = function (n, T, dt) { if (n.sgKing) return true; return _cmG(n, T, dt); }; }
if (typeof housesTick === 'function') { const _htG = housesTick; housesTick = function (now) { _htG(now); sgTick(now); }; }
/* bater num soldado: o primeiro golpe escolhe o lado; não é crime */
if (typeof npcDamage === 'function') { const _ndG = npcDamage; npcDamage = function (n, dmg, p) { if (!n || !n.siege) return _ndG(n, dmg, p); if (n.dead || n.downed || !p) return; const S0 = sgRec(), k = estOwner(p);
  if (!S0.sides[k]) { S0.sides[k] = n.side === 'r' ? 'd' : 'r'; tell(p, 'Você entrou no cerco do lado ' + (S0.sides[k] === 'r' ? 'rebelde' : 'da coroa') + '.'); Net.toOne(p.id, { t: 'sgside', s: S0.sides[k] }); }
  if (S0.sides[k] === 'out' || S0.sides[k] === n.side) return; sgHitSoldier(n, dmg, p); }; }
if (typeof hPost === 'function') { const _hpG = hPost; hPost = function (def, n) { const S0 = S.estate && sgRec(); if (S0 && S0.on && n.house === S0.troop && n.hrole === 'lord' && S0.rebel !== 'corwyn') return null; return _hpG(def, n); }; }
/* subornar o comandante: a Guarda da cidade muda de lado no próximo cerco */
function sgMsg(p, m) { if (!S.estate || p.downed) return; const S0 = sgRec(), n = S.npcs.k_cmd; if (m.a !== 'bribe' || !n || dist(n.x, n.y, p.x, p.y) > 3) return; if (S0.bribed) { empSay(n, 'Já estou comprado. Não abuse.'); return; }
  if (secAvail(estOwner(p), p) < SG.bribe) { empSay(n, 'Por menos de ' + SG.bribe + ' de ouro, eu sou leal.'); return; } debit(estOwner(p), p, SG.bribe); sendStat(p);
  if (Math.random() < SG.bribeTell) { secCrime(p, 'treason', 'traição à coroa', 360000); empSay(n, 'Guardas! Este aqui quer comprar a Guarda!'); tell(p, 'O comandante ficou com o ouro e te denunciou. Você é procurado por traição.'); return; }
  S0.bribed = 1; estateSave(); empSay(n, 'No dia em que as tropas chegarem, a Guarda vai estar olhando para o outro lado.'); }

// ---------------- CLIENTE ----------------
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peG = progEvent; progEvent = function (m, now) {
  if (m.t === 'sgside') { G.sgSide = m.s; showToast('Você luta do lado ' + (m.s === 'r' ? 'rebelde' : 'da coroa') + '.'); return true; }
  const r = _peG(m, now);
  if (m.t === 'courtmenu' && m.id === 'k_cmd' && G.cgRole !== 'cmd') { const d = document.getElementById('courtmenu'); if (d) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">💰</span><span><b>Subornar o comandante (' + SG.bribe + ' de ouro)</b><br><small>No próximo cerco, a Guarda da cidade muda de lado. Ele pode te denunciar.</small></span>'; bt.onclick = () => { if (bt.dataset.sure) { d.remove(); Net.send({ t: 'cerco', a: 'bribe' }); } else { bt.dataset.sure = 1; bt.querySelector('b').textContent = 'Confirmar o suborno?'; } }; d.appendChild(bt); } }
  return r; }; }
