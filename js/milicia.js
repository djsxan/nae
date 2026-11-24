// ============================================================
//  PARTE P: milícias e Fé no cerco. Os seguranças do jogador lutam do lado que ele apoia (a casa a que
//  jurou lealdade, ou a coroa) e podem morrer. Com o rei abaixo de 15% de legitimidade, até 10 plebeus
//  armados (mais fracos) se juntam aos rebeldes; se passar dias sem cerco, o povo se levanta sozinho.
//  Os Irmãos Descalços só lutam contra um rei condenado pela Fé (legitimidade abaixo de 15% ou pecado
//  provado); cada Irmão de pé dá +10% de força aos soldados do lado deles. Quem derruba um Irmão é
//  procurado por sacrilégio, e a casa dele perde Fé e é condenada no sermão por 3 dias.
// ============================================================
const ML = { low: 15, pleb: 10, plebHp: 80, riseDays: 4, friarBonus: 0.1, sacFaith: 40, sacDays: 3, segDie: 0.5 };

// ---------------- SERVIDOR ----------------
function mlRec() { const C = crownRec(); if (!C.milicia) C.milicia = { low: 0, cond: {}, sac: {} }; return C.milicia; }
function mlKingLow() { const U = sucRec(); return U.king ? sucLegit(U.king) < ML.low : false; }
function mlKingCondemned() { const U = sucRec(); if (U.kingSin || mlKingLow()) return true; try { if (typeof pcRec === 'function' && U.king && U.king.startsWith('h:')) { const P = pcRec().proven, h = U.king.slice(2); if (P['affair:' + h] || P['incest:' + h]) return true; } if (typeof pcRec === 'function' && U.king === 'alaric' && pcRec().proven['incest:crown']) return true; } catch (e) { } return false; }
function mlJoin(side, i, name, kind, extra) { const [gx, gy] = sgGate(), n = sgSpawn(side, i, [gx + ((i % 3) - 1), gy + (side === 'r' ? 4 : -7)]); if (!n) return null; visGone(n); Object.assign(n, { name, kind, loyal: 100 }, extra || {}); S.npcs[n.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n; }
/* os seguranças, os plebeus e os Irmãos entram quando o cerco começa */
if (typeof sgStart === 'function') { const _ssM = sgStart; sgStart = function (R) { const r = _ssM(R); try { const S0 = sgRec(); if (!S0.on) return r; let i = 90; S0.segMap = {};
  const SL = typeof segLoad === 'function' ? segLoad() : {}; for (const key of Object.keys(SL)) { const side = hRec().vow[key] === S0.troop ? 'r' : 'd', q = Object.values(S.players).find(o => estOwner(o) === key), nm = q ? q.name : key.split('|')[0];
    for (const rr of SL[key]) { const o = S.npcs['seg_' + rr.id], kind = (o && o.kind) || rr.look || 'v_segm'; if (o) visGone(o); rr.sg = 1; const n = mlJoin(side, i++, rr.n + ' (segurança de ' + nm + ')', kind); if (n) S0.segMap[n.id] = [key, rr.id]; }
    if (SL[key].length && q) tell(q, 'Seus ' + SL[key].length + ' seguranças foram para o castelo lutar do lado ' + (side === 'r' ? 'rebelde' : 'da coroa') + '. Podem morrer.'); }
  if (mlKingLow()) { for (let k = 0; k < ML.pleb; k++) mlJoin('r', i++, 'Plebeu armado', 'st_farm', { hp: ML.plebHp, maxHp: ML.plebHp, pleb: 1 }); sys('✊ O povo de Nae pegou em forcados e porretes: ' + ML.pleb + ' plebeus marcham com os rebeldes.'); }
  if (mlKingCondemned()) { const B = typeof BAREFOOT !== 'undefined' ? BAREFOOT : []; for (const def of B) { const o = S.npcs[def.id]; if (o && o.dead) continue; if (o) visGone(o); mlJoin('r', i++, def.name, 'barefoot', { friar: def.id }); } S0.friars = 1; if (B.length) sys('⛪ Os Irmãos Descalços deixam a Catedral com seus cajados: a Fé luta contra o ' + sucKingName() + '.'); }
  estateSave(); } catch (e) { console.warn('milicia', e); } return r; }; }
if (typeof segSpawn === 'function') { const _spM = segSpawn; segSpawn = function (key, r, near0) { if (r && r.sg) return null; return _spM(key, r, near0); }; }
/* fim do cerco: os seguranças caídos podem ter morrido; os Irmãos voltam à Catedral */
if (typeof sgEnd === 'function') { const _seM2 = sgEnd; sgEnd = function (win, how) { const S0 = sgRec(), map = S0.on ? Object.assign({}, S0.segMap || {}) : {}, fate = {};
  for (const nid of Object.keys(map)) { const n = S.npcs[nid]; fate[nid] = !n || n.dead || (n.downed && Math.random() < ML.segDie); }
  _seM2(win, how); try { const SL = segLoad(); for (const nid of Object.keys(map)) { const [key, rid] = map[nid], L = SL[key] || [], rr = L.find(x => x.id === rid); if (!rr) continue; rr.sg = 0; const q = Object.values(S.players).find(o => estOwner(o) === key);
      if (fate[nid]) { L.splice(L.indexOf(rr), 1); if (q) tell(q, rr.n + ', seu segurança, morreu no cerco.'); } else if (q) tell(q, rr.n + ' voltou do cerco.'); }
    S0.segMap = {}; S0.friars = 0; estateSave(); } catch (e) { console.warn('milicia', e); } }; }
/* cada Irmão de pé: +10% de força para os soldados do lado dele */
if (typeof sgHitSoldier === 'function') { const _hsM = sgHitSoldier; sgHitSoldier = function (q, dmg, by) { try { if (by && by.side && !by.friar) { const k = Object.values(S.npcs).filter(n => n.friar && n.siege && n.side === by.side && !n.dead && !n.downed).length; if (k) dmg = Math.round(dmg * (1 + ML.friarBonus * k)); } } catch (e) { } return _hsM(q, dmg, by); }; }
/* sacrilégio: derrubar ou matar um Irmão Descalço */
function mlSacrilege(p, n) { if (!p || p.dev) return; const R = mlRec(), id = n.friar || n.id; if (R.sac[id + '|' + estOwner(p)] === estDay()) return; R.sac[id + '|' + estOwner(p)] = estDay();
  secCrime(p, 'sacrilege', 'sacrilégio', 300000); repAdd(p, 'cidade', -10, 'atacou um Irmão Descalço'); const k = estOwner(p), hid = hRec().vow[k] || (typeof phMine === 'function' && phMine(k) ? phMine(k).id : null);
  if (hid && typeof infFaithAdd === 'function' && INF_HOUSES.includes(hid)) { infFaithAdd(hid, -ML.sacFaith); R.cond[hid] = estDay() + ML.sacDays; }
  sys('⛪ ' + p.name + ' derrubou ' + n.name + '. A Catedral fala em sacrilégio' + (hid ? ', e a ' + HOUSE_BY[hid].n + ' será condenada no sermão.' : '.')); tell(p, 'Procurado por sacrilégio.'); estateSave(); }
if (typeof npcDamage === 'function') { const _ndM = npcDamage; npcDamage = function (n, dmg, p) { const bf = n && p && !n.dead && (n.kind === 'barefoot' || n.friar), was = bf && (n.downed || n.dead); _ndM(n, dmg, p); try { if (bf && !was && (n.downed || n.dead || n.hp <= 0)) mlSacrilege(p, n); } catch (e) { } }; }
if (typeof massSermon === 'function') { const _msM = massSermon; massSermon = function () { _msM(); try { const R = mlRec(), pr = S.npcs.priest; for (const hid of Object.keys(R.cond)) { if (estDay() > R.cond[hid]) { delete R.cond[hid]; continue; } infAdd(hid, 'temple', -8); for (const pl of INF_PLACES) if (pl.id !== 'temple') infAdd(hid, pl.id, -3); setTimeout(() => { if (pr) empSay(pr, 'A ' + infHN(hid) + ' derramou o sangue de um Irmão. Que a Aurora a julgue.'); }, 5000); } } catch (e) { } }; }
/* o povo se levanta sozinho: rei abaixo de 15% por dias seguidos, sem cerco */
function mlRise() { const U = sucRec(), next = sucLine()[0]; let troop = next && next.startsWith('h:') ? next.slice(2) : null; if (!troop || !HOUSE_BY[troop] || HOUSE_BY[troop].player) troop = HOUSES.filter(h => !h.player && !(typeof fhIs === 'function' && fhIs(h.id)) && sucRec().king !== 'h:' + h.id).sort((a, b) => hRec().st[a.id].crown - hRec().st[b.id].crown)[0]?.id;
  if (!troop || !next) return false; sys('✊ O povo de Nae não aguenta mais o ' + sucKingName() + ': uma multidão marcha ao castelo em nome de ' + sucName(next) + '!'); hNews('Levante do povo contra o ' + sucKingName() + '.'); sgStart({ rebel: next, troop, pow: 0, cp: sgCrownPow(troop), lg: 0 }); return true; }
function mlTick(now) { if (!S.estate || !castleB() || now - (S.mlT || 0) < 2000) return; S.mlT = now; const R = mlRec(), S0 = sgRec(), U = sucRec();
  if (S0.on || (U.stage && U.stage !== 'done')) { R.low = 0; return; } if (!mlKingLow()) { R.low = 0; return; } if (!R.low) R.low = estDay();
  if (estDay() - R.low >= ML.riseDays && estDay() >= (S0.next || 0)) { R.low = 0; mlRise(); estateSave(); } }
if (typeof housesTick === 'function') { const _htMl = housesTick; housesTick = function (now) { _htMl(now); mlTick(now); }; }
