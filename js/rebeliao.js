// ============================================================
//  REBELIÃO LIDERADA POR JOGADOR (lista 4, item 8)
//  quem fundou uma casa fala com o criado da sede: "Marchar contra o rei". Os soldados saem do casarão
//  e marcham até o portão do castelo; o cerco começa quando chegam. O líder é o jogador: se ele cair,
//  a rebelião acaba e ele vai para a guilhotina; se ficar um minuto no trono, é coroado.
//  Do lado dele: os homens da casa, seus seguranças e capangas, os vassalos e as casas NPC amigas (favor 40+).
// ============================================================
const RB = { ally: 40, allyShare: 0.5, perMan: 5, marchMax: 150000, show: [4, 12] };
function rbHouseOf(key) { return typeof phRec === 'function' ? phRec().l.find(h => h.owner === key) : null; }
function rbPower(key, hid) { const H = hRec(), st = H.st[hid] || {}, segs = typeof segList === 'function' ? segList(key).filter(x => !x.jail && !x.flee).length : 0, merc = typeof rgRec === 'function' ? (rgRec().merc[key] | 0) : 0, fav = H.favor[key] || {};
  const allies = HOUSES.filter(h => h.id !== hid && !(typeof phRec === 'function' && phRec().l.some(x => x.id === h.id)) && (fav[h.id] || 0) >= RB.ally && sucRec().king !== 'h:' + h.id);
  const ally = allies.reduce((s, h) => s + (H.st[h.id] ? H.st[h.id].power : 0) * RB.allyShare, 0);
  return { pow: Math.round((st.power || 0) + RB.perMan * (segs + merc) + ally), allies: allies.map(h => h.n), segs, merc }; }
function rbMarch(p) { const key = estOwner(p), h = rbHouseOf(key); if (!h) { tell(p, 'Só quem fundou uma casa pode levar a casa à guerra.'); return; }
  const S0 = sgRec(); if (S0.on || S.rbM) { tell(p, 'Já há um cerco (ou uma marcha) em andamento.'); return; } if (typeof rkIsKing === 'function' && rkIsKing(p)) { tell(p, 'Você é o rei. Não há contra quem marchar.'); return; }
  if (sucRec().king === 'h:' + h.id) { tell(p, 'A sua casa já está no trono.'); return; }
  const sv = Object.values(S.npcs).find(n => (n.court === 'house' || n.court === 'phouse') && n.house === h.id && n.hrole === 'serv' && !n.dead && dist(n.x, n.y, p.x, p.y) < 3.2 && (n.fl || 0) === (p.fl || 0)); if (!sv) { tell(p, 'Fale com o criado da sua sede.'); return; }
  const b = h.bi >= 0 ? BUILDINGS[h.bi] : null; if (!b) { tell(p, 'A sua casa precisa de uma sede para reunir os soldados.'); return; }
  const P0 = rbPower(key, h.id), [dx, dy] = doorOutPt(BUILDINGS.indexOf(b)), n0 = Math.max(RB.show[0], Math.min(RB.show[1], Math.round(P0.pow / RB.perMan))), ids = [];
  for (let i = 0; i < n0; i++) { const id = 'rb_m_' + i, n = { id, kind: 'hh_guard_' + h.id, name: 'Soldado da ' + h.n, transient: true, court: 'rbmarch', x: dx + ((i % 4) - 1.5) * 0.7, y: dy + Math.floor(i / 4) * 0.7, z: 0, fl: 0, fb: -1, hp: 140, maxHp: 140, downed: null, dead: false, dir: 0 }; S.npcs[id] = n; ids.push(id); Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
  S.rbM = { key, pid: p.id, hid: h.id, t0: now_(), ids, pow: P0.pow }; empSay(sv, 'Que a ' + h.n + ' vença, meu senhor.');
  sys('⚔ ' + p.name + ' e a ' + h.n + ' marcham contra o ' + sucKingName() + '! Os soldados saíram do casarão rumo ao castelo.' + (P0.allies.length ? ' Com eles, homens da ' + P0.allies.join(' e da ') + '.' : '')); hNews(p.name + ' levou a ' + h.n + ' à guerra contra a coroa.');
  for (const q of Object.values(S.players)) { const k = estOwner(q); if (k !== key && hRec().vow[k] === h.id) tell(q, '⚔ A sua casa, a ' + h.n + ', marcha contra o rei! Vá ao portão do castelo e lute do lado de ' + p.name + '.'); }
  estateSave(); }
function rbTick(now) { const M = S.rbM; if (!M) return; const [gx, gy] = sgGate(), alive = M.ids.map(id => S.npcs[id]).filter(n => n && !n.dead);
  let arrived = false; for (const n of alive) { if (dist(n.x, n.y, gx, gy) < 3) arrived = true; else n.walk = !npcWalk(n, gx + ((+n.id.slice(5)) % 4 - 1.5) * 0.8, gy + 1.5, 1.6, 0.2); }
  const lead = Object.values(S.players).find(q => estOwner(q) === M.key), here = lead && !lead.downed && !(lead.fl || 0) && dist(lead.x, lead.y, gx, gy) < 15;
  if (arrived && !here && now_() - M.t0 < RB.marchMax) { if (!M.told && lead) { M.told = 1; tell(lead, 'Os soldados da ' + HOUSE_BY[M.hid].n + ' chegaram ao portão do castelo e esperam por você. Vá até lá: o cerco começa quando você chegar.'); } return; }   /* esperam o líder no portão */
  if (!arrived && now_() - M.t0 < RB.marchMax) return;
  for (const n of alive) visGone(n); S.rbM = null;
  if (!here) { sys('A marcha da ' + HOUSE_BY[M.hid].n + ' esperou no portão do castelo, mas o líder não veio: os soldados se dispersaram.'); return; }
  const cp = sgCrownPow(M.hid), lg = sucLegit(sucRec().king) / 100, S0 = sgRec(); S0.plead = M.key;
  sgStart({ rebel: 'h:' + M.hid, troop: M.hid, pow: M.pow, cp, lg }); S0.sides = S0.sides || {}; S0.sides[M.key] = 'r'; Net.toOne(lead.id, { t: 'sgside', s: 'r' });
  for (const q of Object.values(S.players)) { const k = estOwner(q); if (k !== M.key && hRec().vow[k] === M.hid) { S0.sides[k] = 'r'; Net.toOne(q.id, { t: 'sgside', s: 'r' }); } }
  tell(lead, 'O cerco começou. Você é o líder: mate o rei, ou deixe-o com pouca vida para ele se render e ir para a guilhotina, e a coroa é sua. Se você cair, a guilhotina é a sua.'); estateSave(); }
/* o líder é o jogador: sem general NPC */
if (typeof sgLeader === 'function') { const _sgR = sgLeader; sgLeader = function () { const S0 = sgRec(); if (S0.plead) return; return _sgR(); }; }
function rbLeadP() { const S0 = S.estate && sgRec(); if (!S0 || !S0.plead) return null; return Object.values(S.players).find(q => estOwner(q) === S0.plead) || null; }
/* derrota: o líder vai para a guilhotina; a casa fica sem força nem ouro (e nada de general NPC para matar) */
if (typeof sgEnd === 'function') { const _seR = sgEnd; sgEnd = function (win, how) { const S0 = sgRec(), plead = S0.on && S0.plead, hid = S0.troop, P = plead ? rbLeadP() : null;
  if (!plead) return _seR(win, how);
  if (win === 'd') { const _tl = typeof trLordDead === 'function' ? trLordDead : null; if (_tl) trLordDead = function () { }; try { _seR(win, how); } finally { if (_tl) trLordDead = _tl; }
    const ts = throneSeat(), caught = P && (P.downed || (ts && dist(P.x, P.y, ts.x, ts.y) < SG.abstractR));   /* longe do castelo, o líder escapa */
    if (P && !caught) tell(P, 'A sua rebelião fracassou longe de você: você escapou, mas a casa perdeu quase toda a força e o ouro.');
    if (P && caught) { P.murderer = true; if (typeof secCrime === 'function') secCrime(P, 'treason', 'traição à coroa', 360000); const g = Object.values(S.npcs).filter(n => n.kind === 'guard' && !n.dead && !n.downed && !n.sleeping).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0];
      if (g && typeof startLead === 'function') { P.x = g.x + 0.8; P.y = g.y; P.fl = 0; P.fb = -1; Net.toOne(P.id, { t: 'tp', x: P.x, y: P.y, z: 0, fl: 0, fb: -1 }); startLead(g, P, 'stage', now_()); }
      sys('⚔ ' + P.name + ', líder da rebelião da ' + (HOUSE_BY[hid] || {}).n + ', foi capturado: vai para a guilhotina.'); } }
  else _seR(win, how);
  S0.plead = null; estateSave(); }; }
/* no cerco, o líder caído encerra a rebelião (no lugar do general NPC) */
if (typeof sgTick === 'function') { const _stR = sgTick; sgTick = function (now) { const S0 = S.estate && sgRec(); if (S0 && S0.on && S0.plead) { const P = rbLeadP(); if (!P || P.downed) { sgEnd('d'); return; } } return _stR(now); }; }
if (typeof housesTick === 'function') { const _htR = housesTick; housesTick = function (now) { _htR(now); try { rbTick(now); } catch (e) { console.warn('marcha', e); } }; }
if (typeof phMsg === 'function') { const _phR = phMsg; phMsg = function (p, m) { if (m && m.a === 'rbmarch') { rbMarch(p); return; } return _phR(p, m); }; }

// ---------- lado do jogador: o botão no criado da sede ----------
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peR = progEvent; progEvent = function (m, now) { const r = _peR(m, now);
  if (m.t === 'phhouse' && m.own && m.role === 'serv') { const d = document.getElementById('tequip'); const L = d && (d.querySelector('.lift-list') || d.querySelector('.vel-body') || d);
    if (L && !L.querySelector('[data-rb]')) { const b = document.createElement('button'); b.className = 'lift-btn'; b.dataset.rb = 1; b.innerHTML = '<span class="lift-n">⚔</span><span><b>Marchar contra o rei</b><br><small>Os soldados da casa saem daqui e marcham até o castelo; o cerco começa quando chegam. Vence quem matar ou capturar o rei; se você cair, é a guilhotina.</small></span>';
      b.onclick = () => gameAsk('Levar a sua casa à guerra contra o rei? Se você cair no cerco, vai para a guilhotina.', { yes: 'Marchar' }).then(ok => { if (ok) { if (d && d.remove) d.remove(); Net.send({ t: 'funda', a: 'rbmarch' }); } }); L.appendChild(b); } }
  return r; }; }
/* cerco calculado à distância: sem general NPC, o líder conta como de pé enquanto o jogador não cair */
if (typeof sgDematerialize === 'function') { const _sdR = sgDematerialize; sgDematerialize = function () { const r = _sdR(); try { const S0 = sgRec(); if (S0.plead) { const P = rbLeadP(); S0.leadDown = !P || P.downed ? 1 : 0; } } catch (e) { } return r; }; }
/* ---- vitória da rebelião do jogador: matar o rei, ou capturá-lo e executá-lo na guilhotina (sem o minuto no trono) ---- */
const RB_CAPTURE = 0.2;   /* com 20% de vida ou menos, o rei se rende */
if (typeof sgHitSoldier === 'function') { const _shR = sgHitSoldier; sgHitSoldier = function (q, dmg, by) { const S0 = S.estate && sgRec();
  if (S0 && S0.on && S0.plead && q && q.sgKing && !S0.kingOut && q.hp - dmg > 0 && q.hp - dmg <= q.maxHp * RB_CAPTURE) {
    q.hp -= dmg; S0.kingOut = 'captured'; q.downed = { until: now_() + 600000 }; for (const d of sgSoldiers('d')) d.yield = 1;
    sys('👑 O ' + sucKingName() + ' caiu de joelhos e se rendeu: está capturado!'); near(q.x, q.y, { t: 'anim', w: 'n', id: q.id, a: 'talk', txt: 'Eu me rendo!', ms: 1 }); return; }
  return _shR(q, dmg, by); }; }
if (typeof sgThrone === 'function') { const _stnR = sgThrone; sgThrone = function (now) { const S0 = sgRec(); if (S0.plead) return; return _stnR(now); }; }
if (typeof sgTick === 'function') { const _st2R = sgTick; sgTick = function (now) { const S0 = S.estate && sgRec(); if (S0 && S0.on && S0.plead && S0.kingOut) { sgEnd('r', S0.kingOut); return; } return _st2R(now); }; }
function rbExecKing(name, kind) { if (STAGE.x < 0) return; const now = now_(), n = { id: 'k_exec', kind: kind || 'k_king', name: name + ' (condenado)', transient: true, court: 'rbexec', x: STAGE.x - 0.6, y: STAGE.y, z: 0, fl: 0, fb: -1, hp: 100, maxHp: 100, downed: { until: now + 120000 }, dead: false, dir: 0 };
  if (S.npcs.k_exec) visGone(S.npcs.k_exec); S.npcs[n.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) });
  const ex = S.npcs.executioner; if (ex && !ex.dead) { ex.walkTo = [STAGE.x - 0.9, STAGE.y + 1.9]; setTimeout(() => { if (!ex.dead) ex.walkTo = [STAGE.x + 0.1, STAGE.y + 1.05]; }, EXEC_T.pull - 3200); }
  near(STAGE.x, STAGE.y, { t: 'exec', id: n.id, x: STAGE.x, y: STAGE.y, T: EXEC_T, name: n.name, crimes: 'perder a coroa' }, VIEW_RADIUS + 12);
  S.exec = { id: n.id, key: 'npc:k_exec', name: n.name, tok: now, t0: now, drop: now + EXEC_T.drop, until: now + EXEC_T.fall + 7000 };
  sys('🔔 O sino da praça toca: ' + name + ', o rei deposto, é levado ao cadafalso.');
  for (const s of [10, 20]) setTimeout(() => { sys('🔔 O sino da praça toca (' + (30 - s) + ' segundos).'); near(STAGE.x, STAGE.y, { t: 'shake', s: 1 }, VIEW_RADIUS + 12); }, s * 1000);
  setTimeout(() => sys('Mestre Corvo: "' + name + ', que reinou e perdeu. Que Nae tenha piedade da sua alma."'), EXEC_T.announce);
  setTimeout(() => { sys('⚔ A lâmina caiu: ' + name + ' está morto.'); hNews(name + ' foi executado na guilhotina da praça.'); near(STAGE.x, STAGE.y, { t: 'shake', s: 2 }, VIEW_RADIUS + 12); }, EXEC_T.drop);
  setTimeout(() => { if (S.npcs.k_exec) visGone(S.npcs.k_exec); if (S.exec && S.exec.id === 'k_exec') S.exec = null; }, EXEC_T.fall + 6000); }
if (typeof sgEnd === 'function') { const _se2R = sgEnd; sgEnd = function (win, how) { const S0 = sgRec(), plead = S0.on && S0.plead, oldKing = sucKingName(), cap = (how || S0.kingOut) === 'captured';
  _se2R(win, how); if (!plead || win !== 'r' || !cap) return;
  S0.prisoner = null; if (S.npcs.k_oldking) visGone(S.npcs.k_oldking); const K0 = S.npcs.k_king; if (K0) visGone(K0);   /* o rei capturado não vai para o calabouço: vai para a guilhotina */
  setTimeout(() => rbExecKing(oldKing, 'k_king'), 4000); estateSave(); }; }
