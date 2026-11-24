// ============================================================
//  PARTE K, ETAPA 2: o lado escuro do casamento.
//  Na Catedral, durante a cerimônia: a família do noivo (lorde, cônjuge, herdeiro) e dois guardas da casa
//  assistem; mortes valem de verdade (atacar = procurado por assassinato e a casa vira inimiga). Uma casa
//  rival (relação muito ruim) pode mandar capangas. Quem guarda um segredo pesado (peso 4 ou 5) do noivo
//  ou da família dele pode "Revelar diante de todos": o lorde cancela e o dote volta pela metade.
//  Sequestro do cônjuge (casa inimiga ou o Vesper pago por outro jogador): resgate de 500 no Vesper em
//  2 dias ou invasão do esconderijo a oeste da muralha (4 capangas); passou o prazo, volta ferido e furioso.
//  Infidelidade (companhia na Casa de Veludo, noite com outro jogador) vira segredo sobre você: quem sabe
//  pode chantagear (pague ou ele conta ao cônjuge) ou contar pela Dama Ysolde. Cônjuge furioso trai:
//  passa os seus segredos a uma casa rival ou arruma um amante (um segredo sobre ele, peso 4).
// ============================================================
const MR2 = { vowMs: 120000, ceremonyMax: 210000, arrive: { guard: 0, lord: 20000, spouse: 20000, heir: 40000, groom: 80000 }, grudgeDays: 30, heirKid: 0.03, heirKidDays: 3, heirReward: 200, heirFavor: 30, thugs: 3, thugChance: 0.1, rivalRel: -40, kidDay: 0.04, ransom: 500, hire: 800, hireCut: 0.8, kidDays: 2, hideThugs: 4, bmAmt: 300, betrayMood: 20, betray: 0.25, discover: 0.05, houseLearn: 0.25, revW: 4, sinW: 4, sinMood: 50, sinFavor: 25, ysBuy: 60, ysTell: 40, bmFavor: 15 };
SEC_W.spaff = 4; SEC_KN.spaff = 'traição no casamento';

// ---------------- SERVIDOR ----------------
function mr2Rec() { const E = S.estate; if (!E.casamento2) E.casamento2 = { sins: {}, pk: {}, hostile: {}, bmq: {}, seq: 0 }; return E.casamento2; }
const mr2P = key => Object.values(S.players).find(o => estOwner(o) === key) || null;
const mr2Name = key => { const p = mr2P(key); return p ? p.name : String(key).split('|')[0]; };
function mr2Bank(key, v) { const BK = bankLoad(), A = BK.acc[key] || (BK.acc[key] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += v; bankSave(); }
function mr2SpouseN(M) { return M.kind === 'npc' ? M.who.n.split(' (')[0] : mr2Name(M.partner); }
function mr2SpHid(M) { return M && M.kind === 'npc' ? mrHidOf(M.who.id) : null; }
function mr2Hostile(key, hid) { const H = mr2Rec().hostile; return !!(H[key] && H[key][hid]); }
/* casas que odeiam a família do cônjuge (ou que viraram inimigas do jogador) */
function mr2Rivals(key, hid) { const out = []; for (const h of HOUSES) { if (h.player || h.id === hid) continue; const rel = hid && hid !== 'crown' ? ((hRec().st[h.id].rel || {})[hid] || 0) : 0; if (rel <= MR2.rivalRel || mr2Hostile(key, h.id)) out.push(h.id); } return out; }

/* ---- rancores: só eles levam uma casa a atacar um casamento ou a sequestrar (vingança de sangue, aliança quebrada) ---- */
function mr2Grudge(x, target, why) { if (!x || !HOUSE_BY[x] || x === target) return; const R = mr2Rec(), G = R.grudge || (R.grudge = {}); (G[x] = G[x] || {})[target] = { why, d: estDay() }; estateSave(); }
function mr2GrudgeOf(x, target) { const g = ((mr2Rec().grudge || {})[x] || {})[target]; return g && estDay() - g.d <= MR2.grudgeDays ? g : null; }
function mr2Grudgers(key, hid) { const out = []; for (const h of HOUSES) { if (h.player || h.id === hid) continue; const g = (hid && hid !== 'crown' && mr2GrudgeOf(h.id, hid)) || (key && mr2GrudgeOf(h.id, 'p:' + key)) || (key && mr2Hostile(key, h.id) ? { why: 'você atacou a família deles' } : null); if (g) out.push({ h: h.id, why: g.why }); } return out; }
function mr2Allied(a, b) { const M = typeof lnRec === 'function' ? lnRec().married : {}; return !!((M[a] && M[a].from === b) || (M[b] && M[b].from === a)); }
/* um lorde morto numa trama de outra casa: vingança de sangue (traição, se eram aliadas por casamento) */
if (typeof trKill === 'function') { const _tkK2 = trKill; trKill = function (k, cause) { _tkK2(k, cause); try { if (S.estate && String(k).startsWith('l:') && /trama da /.test(cause || '')) { const x = k.slice(2), by = HOUSES.find(h => cause.includes(h.n)); if (by && by.id !== x) mr2Grudge(x, by.id, mr2Allied(x, by.id) ? 'aliança quebrada: a ' + by.n + ' matou o lorde deles numa trama' : 'vingança de sangue: o lorde deles morreu numa trama da ' + by.n); } } catch (e) { } }; }
/* o noivo que falta duas vezes quebra a aliança com a família */
if (typeof hFavor === 'function') { const _hfK2 = hFavor; hFavor = function (p, id, n, why) { _hfK2(p, id, n, why); try { if (why === 'faltou ao próprio casamento') mr2Grudge(id, 'p:' + estOwner(p), 'aliança quebrada: ' + p.name + ' deixou a família esperando no altar'); } catch (e) { } }; }
function mr2Alliances() { if (typeof lnRec !== 'function') return; const M = lnRec().married; for (const b of Object.keys(M)) { const a = M[b].from; if (!a || M[b].broken || !hRec().st[a] || !hRec().st[b]) continue; if (((hRec().st[a].rel || {})[b] || 0) <= -40) { M[b].broken = estDay(); mr2Grudge(a, b, 'aliança quebrada com a ' + HOUSE_BY[b].n); mr2Grudge(b, a, 'aliança quebrada com a ' + HOUSE_BY[a].n); hNews('A aliança de casamento entre a ' + HOUSE_BY[a].n + ' e a ' + HOUSE_BY[b].n + ' acabou em ódio.'); } } }

/* ---- segredos sobre jogadores (infidelidade) ---- */
function mr2Sins(key) { const R = mr2Rec(); return R.sins[key] || (R.sins[key] = []); }
function mr2Known(holder) { const R = mr2Rec(); return R.pk[holder] || (R.pk[holder] = []); }
function mr2SinOf(o, id) { return mr2Sins(o).find(s => s.id === id) || null; }
function mr2AddSin(key, k, t, knower) { const R = mr2Rec(), s = { id: ++R.seq, k, t, d: estDay(), hk: [], rev: 0 }; mr2Sins(key).push(s);
  if (knower && knower !== key) mr2Known(knower).push({ o: key, id: s.id });
  const M = mrOf(key), rv = mr2Rivals(key, mr2SpHid(M)); if (rv.length && Math.random() < MR2.houseLearn) s.hk.push(rv[Math.floor(Math.random() * rv.length)]);
  estateSave(); mr2SendKnown(knower); return s; }
function mr2SendKnown(holder) { const q = holder && mr2P(holder); if (!q) return; const L = mr2Known(holder).filter(r => { const s = mr2SinOf(r.o, r.id); return s && !s.rev; }); Net.toOne(q.id, { t: 'mr2pk', l: L.map(r => ({ o: r.o, n: mr2Name(r.o), id: r.id, t: mr2SinOf(r.o, r.id).t, bm: r.bm ? 1 : 0 })) }); }
/* o cônjuge (ou a casa dele) descobre */
function mr2Reveal(key, s, how) { if (!s || s.rev) return; s.rev = estDay(); const M = mrOf(key), p = mr2P(key); if (!M) { estateSave(); return; }
  if (M.kind === 'npc') { M.mood = Math.max(0, (M.mood || MR.mood0) - MR2.sinMood); const hid = mr2SpHid(M);
    if (p) { if (hid === 'crown') crownFavor(p, -MR2.sinFavor, 'a família real soube da sua traição'); else hFavor(p, hid, -MR2.sinFavor, 'a família soube da sua traição'); }
    else { const F = hid === 'crown' ? null : (hRec().favor[key] = hRec().favor[key] || {}); if (F) F[hid] = Math.max(0, (F[hid] || 0) - MR2.sinFavor); }
    if (p) tell(p, '💔 ' + mr2SpouseN(M) + ' descobriu (' + how + '): ' + s.t + ' O humor despencou.'); }
  else { const q = mr2P(M.partner); if (q) tell(q, '💔 Você descobriu (' + how + '): ' + s.t); if (p) tell(p, '💔 ' + mr2SpouseN(M) + ' descobriu (' + how + ') o que você fez.'); }
  estateSave(); }
/* infidelidade: companhia na Casa de Veludo */
function mr2Velvet(p) { const key = estOwner(p), M = mrOf(key); if (!M || !p.vlRest || p._mr2Vl === p.vlRest.until) return; p._mr2Vl = p.vlRest.until;
  mr2AddSin(key, 'velvet', p.name + ', cônjuge de ' + mr2SpouseN(M) + ', procurou companhia (' + p.vlRest.who + ') na Casa de Veludo.', null); }
/* infidelidade: noite com outro jogador na mesma casa */
function mr2Nights() { const h = empHour(); if (!(h >= 21 || h < 5)) return; const R = mr2Rec(), day = estDay(), sl = Object.values(S.players).filter(o => o.sleep != null && BEDS[o.sleep]); R.nt = R.nt || {};
  for (let i = 0; i < sl.length; i++) for (let j = i + 1; j < sl.length; j++) { const a = sl[i], b = sl[j]; if (BEDS[a.sleep].bi !== BEDS[b.sleep].bi) continue; const ka = estOwner(a), kb = estOwner(b), Ma = mrOf(ka), Mb = mrOf(kb);
    if (Ma && Ma.partner === kb) continue; const pair = [ka, kb].sort().join('#'); if (R.nt[pair] === day || (!Ma && !Mb)) continue; R.nt[pair] = day; const where = (BUILDINGS[BEDS[a.sleep].bi] || {}).name || 'uma casa';
    for (const o of [a, b]) Net.toOne(o.id, { t: 'mrfade', who: o === a ? b.name : a.name, ms: 5000 });
    if (Ma) mr2AddSin(ka, 'night', a.name + ', cônjuge de ' + mr2SpouseN(Ma) + ', passou a noite com ' + b.name + ' (' + where + ').', kb);
    if (Mb) mr2AddSin(kb, 'night', b.name + ', cônjuge de ' + mr2SpouseN(Mb) + ', passou a noite com ' + a.name + ' (' + where + ').', ka); } }
/* chantagem de jogador: pague ou eu conto */
function mr2Blackmail(p, m) { const hk = estOwner(p), q = S.players[m.to]; if (!q || dist(p.x, p.y, q.x, q.y) > 3.5) { tell(p, 'Chegue mais perto.'); return; } const o = estOwner(q), r = mr2Known(hk).find(x => x.o === o && x.id === m.id), s = r && mr2SinOf(o, r.id);
  if (!s || s.rev) { tell(p, 'Você não sabe nada sobre ' + q.name + '.'); return; } if (r.bm) { tell(p, 'Você já usou esse segredo para chantagear.'); return; } r.bm = estDay();
  const amt = Math.max(50, Math.min(3000, Math.round(+m.amt || MR2.bmAmt))); q.mr2Bm = { from: hk, fromId: p.id, o, id: s.id, amt, until: now_() + 60000 };
  Net.toOne(q.id, { t: 'mr2bm', name: p.name, t2: s.t, amt, src: 'p' }); tell(p, 'Você ameaçou ' + q.name + ': ' + amt + ' de ouro, ou o cônjuge fica sabendo.'); estateSave(); }
function mr2BmAnswer(q, m) { const B = q.mr2Bm; if (B && now_() <= B.until) { q.mr2Bm = null; const p = mr2P(B.from), s = mr2SinOf(B.o, B.id);
    if (m.pay && debit(estOwner(q), q, B.amt)) { mr2Bank(B.from, B.amt); sendStat(q); tell(q, 'Você pagou ' + B.amt + ' de ouro pelo silêncio.'); if (p) tell(p, q.name + ' pagou ' + B.amt + ' de ouro (no seu banco). O segredo continua com você.'); }
    else { mr2Reveal(B.o, s, p ? p.name + ' contou' : 'alguém contou'); mr2Known(B.from).splice(mr2Known(B.from).findIndex(r => r.o === B.o && r.id === B.id), 1); if (p) tell(p, q.name + ' não pagou. Você contou tudo ao cônjuge.'); }
    mr2SendKnown(B.from); estateSave(); return; }
  const Q = mr2Rec().bmq[estOwner(q)]; if (!Q) return; delete mr2Rec().bmq[estOwner(q)]; const s = mr2SinOf(estOwner(q), Q.id), h = HOUSE_BY[Q.h];   /* carta de uma casa */
  if (m.pay && debit(estOwner(q), q, Q.amt)) { sendStat(q); if (s) s.hk = s.hk.filter(x => x !== Q.h); tell(q, 'Você pagou ' + Q.amt + ' de ouro à ' + h.n + '. Por enquanto, eles se calam.'); }
  else mr2Reveal(estOwner(q), s, 'a ' + h.n + ' mandou contar'); estateSave(); }
/* a Dama Ysolde: comprar um segredo de outro aventureiro e contar ao cônjuge */
function mr2Ys(p, m) { const n = velStaffNear(p, 'vl_ysolde'); if (!n) return; const hk = estOwner(p), K = mr2Known(hk);
  if (m.op === 'buy') { if ((p.gold || 0) < MR2.ysBuy) { empSay(n, 'Esse tipo de história custa ' + MR2.ysBuy + ' de ouro.'); return; } const pool = [];
    for (const o of Object.keys(mr2Rec().sins)) if (o !== hk) for (const s of mr2Sins(o)) if (!s.rev && !K.some(r => r.o === o && r.id === s.id)) pool.push([o, s]);
    for (const a of (mr2Rec().aff || [])) { const M = mrOf(a.key); if (M && M.affair && !secList(p).some(x => x.k === 'spaff' && x.h === a.h)) pool.push([null, a]); }
    if (!pool.length) { empSay(n, 'Ninguém andou pulando a cerca. Ainda.'); return; } const [o, s] = pool[Math.floor(Math.random() * pool.length)]; p.gold -= MR2.ysBuy; sendStat(p);
    if (!o) { if (s.key === hk) mr2AffairLearn(hk, mrOf(hk), 'a Dama Ysolde contou'); else { const L = secList(p); L.unshift({ h: s.h, k: 'spaff', d: estDay(), t: s.t }); L.length = Math.min(L.length, SEC_MAX); tell(p, 'Segredo da ' + HOUSE_BY[s.h].n + ' (peso 4): ' + s.t); } empSay(n, 'Casados são os mais descuidados.'); estateSave(); mr2YsMenu(p); return; }
    K.push({ o, id: s.id }); empSay(n, 'Casados são os mais descuidados.'); tell(p, 'Segredo de aventureiro: ' + s.t); }
  else if (m.op === 'tell') { const i = K.findIndex(r => r.o === m.o && r.id === m.id); if (i < 0) return; if ((p.gold || 0) < MR2.ysTell) { empSay(n, 'Contar custa ' + MR2.ysTell + ' de ouro.'); return; } p.gold -= MR2.ysTell; sendStat(p); const r = K.splice(i, 1)[0]; mr2Reveal(r.o, mr2SinOf(r.o, r.id), 'um bilhete sem assinatura'); empSay(n, 'O bilhete chega antes do jantar.'); }
  estateSave(); mr2SendKnown(hk); mr2YsMenu(p); }
function mr2YsMenu(p) { const hk = estOwner(p); Net.toOne(p.id, { t: 'mr2ys', buy: MR2.ysBuy, tell: MR2.ysTell, gold: p.gold | 0, l: mr2Known(hk).map(r => { const s = mr2SinOf(r.o, r.id); return s && !s.rev ? { o: r.o, id: r.id, t: s.t } : null; }).filter(Boolean) }); }

/* ---- a cerimônia com convidados ---- */
function mr2Live(E) { const now = now_(); return !!(E && E.st && now - E.st < MR2.ceremonyMax); }   /* a cerimônia vale do pedido à Irmã Lúmina até os votos */
function mr2WedOn() { const R = mrRec(), now = now_();
  return Object.keys(R.eng).map(key => ({ key, E: R.eng[key] })).filter(o => o.E && o.E.kind === 'npc' && mr2Live(o.E)).map(o => { if (!o.E.g0) o.E.g0 = now; return Object.assign(o, { hid: mrHidOf(o.E.who.id) }); }); }
/* casamentos entre jogadores em andamento (um registro por casal) */
function mr2PWedOn() { const R = mrRec(); return Object.keys(R.eng).filter(k => { const E = R.eng[k]; return E && E.kind === 'player' && k < E.partner && R.eng[E.partner] && mr2Live(E); }).map(k => ({ key: k, E: R.eng[k], hid: null, pair: [k, R.eng[k].partner] })); }
const mr2Due = (w, role) => now_() - (w.E.g0 || now_()) >= (MR2.arrive[role] || 0);   /* os convidados chegam aos poucos */
function mr2Door() { const T = BUILDINGS[templeBi()], [dx, dy] = doorTile(T), v = DOOR_V[T.door || 'S']; return [dx - v[0] * 1.2 + 0.5 * !v[0], dy - v[1] * 1.2 + 0.5 * !v[1]]; }
function mr2HN(hid) { if (hid === 'crown') return { n: 'família real', lord: sucKingName(), guard: 'k_guard', gn: 'Guarda Real' }; const h = HOUSE_BY[hid] || {}; return { n: h.n, lord: h.lord, guard: 'hh_guard_' + hid, gn: 'Guarda da ' + h.n }; }
/* a família real no casamento: rei, rainha e o irmão do noivo, em cópias que chegam pela porta (os originais somem do castelo enquanto dura) */
const MR2_ROYAL = [['k_king', 0], ['k_queen', 1], ['k_prince', 2], ['k_princess', 2]];
function mr2RoyalFamily(w) { const U = sucRec(), out = []; for (const [id, pew] of MR2_ROYAL) { if (w.E.who.id === (id === 'k_prince' ? 'r:alaric' : id === 'k_princess' ? 'r:lyra' : '')) continue; const def = COURT.find(d => d.id === id) || (id === 'k_queen' && typeof RG_QUEEN !== 'undefined' ? RG_QUEEN : null); if (!def) continue;
    if (id === 'k_prince' && (!U.alive.alaric || U.king === 'alaric')) continue; if (id === 'k_princess' && (!U.alive.lyra || U.king === 'lyra')) continue; if (id === 'k_king' && (U.stage && U.stage !== 'done')) continue;
    out.push({ id, pew, kind: def.kind, name: id === 'k_king' ? sucKingName() : def.name, role: id === 'k_king' ? 'groom_wait' : 'r' }); } return out; }
function mr2WedOf(hid) { return mr2WedOn().find(w => w.hid === hid) || null; }
function mr2Altar() { const pr = S.npcs.priest, bi = templeBi(), T = BUILDINGS[bi]; if (!pr || !T) return null; const cx = T.x + T.w / 2, cy = T.y + T.h / 2, d = dist(pr.x, pr.y, cx, cy) || 1; return { x: pr.x + (cx - pr.x) / d * 1.4, y: pr.y + (cy - pr.y) / d * 1.4, ux: (cx - pr.x) / d, uy: (cy - pr.y) / d, bi }; }
function mr2Pew(i) { const A = mr2Altar(); if (!A) return null; const px = -A.uy, py = A.ux, row = 2.2 + Math.floor(i / 2) * 1.3, side = i % 2 ? 1 : -1; return { x: A.x + A.ux * row + px * side * 1.1, y: A.y + A.uy * row + py * side * 1.1, fl: 0 }; }
function mr2GroomRole(E) { const p = E.who.id.split(':'); return p[2] === 'heir' || p[2] === 'lord' ? p[2] : 'kid'; }
/* a família vai para a Catedral durante a cerimônia */
if (typeof hPost === 'function') { const _hpK2 = hPost; hPost = function (def, n) { try { if (S.estate && (n.hrole === 'lord' || n.hrole === 'spouse' || n.hrole === 'heir')) { const W = mr2WedOf(n.house); if (W) { const A = mr2Altar(), groom = mr2GroomRole(W.E) === n.hrole; if (mr2Due(W, groom ? 'groom' : n.hrole)) { if (A && groom) return { x: A.x, y: A.y, fl: 0, wed: 1 };   /* o noivo da casa entra por último pela porta e anda até o altar */ const P = mr2Pew({ lord: 0, spouse: 1, heir: 2 }[n.hrole]); if (P) return Object.assign(P, { wed: 1, sit: 1 }); } } } } catch (e) { } return _hpK2(def, n); }; }
/* quem vai ao casamento aparece direto na Catedral (o casarão fica longe e as portas atrapalham) */
if (typeof hMove === 'function') { const _hmvK2 = hMove; hMove = function (n, T, dt) { if (!(T && T.wed)) { if (n._wedSit) { n._wedSit = 0; n.sitting = false; } return _hmvK2(n, T, dt); } n.csSleep = 0; n.sleeping = false;
  if (WORLD.bld[tileAt(n.x, n.y)] !== templeBi() || (n.fl || 0)) { const D = mr2Door(); n.x = D[0]; n.y = D[1]; n.fl = 0; n.fb = -1; n.walk = false; n.sitting = false; return; }   /* chega pela porta da Catedral */
  const d = dist(n.x, n.y, T.x, T.y); if (d > 0.12) { const st = Math.min(d, 1.1 * dt); n.x += (T.x - n.x) / d * st; n.y += (T.y - n.y) / d * st; n.dir = dirFromVecS(T.x - n.x, T.y - n.y); n.walk = true; n.sitting = false; return; }
  n.walk = false; const A = mr2Altar(); if (A) n.dir = dirFromVecS(A.x - n.x, A.y - n.y); if (T.sit) { n.sitting = true; n._wedSit = 1; } }; }
function mr2WedNpcs(dt, now) { const W = mr2WedOn(), want = {};
  for (const w of W) { const h = mr2HN(w.hid), A = mr2Altar(); if (!A || !h.n) continue;
    const D = mr2Door(); for (let i = 0; i < 2; i++) { const id = 'wg_' + w.hid + '_g' + i, P = mr2Pew(4 + i); want[id] = 1; if (!S.npcs[id]) { const n = { id, kind: h.guard, name: h.gn, transient: true, court: 'wedding', wed: w.key, house: w.hid, x: D[0] + i * 0.6, y: D[1], z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false, dir: 0, home: [P.x, P.y] }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); } }
    if (mr2GroomRole(w.E) === 'kid' && mr2Due(w, 'groom')) { const id = 'wg_' + w.hid + '_groom'; want[id] = 1; if (!S.npcs[id]) { const n = { id, kind: w.E.who.kind, name: w.E.who.n, transient: true, court: 'wedding', wed: w.key, house: w.hid, groom: 1, x: D[0], y: D[1], z: 0, fl: 0, fb: -1, hp: 250, maxHp: 250, downed: null, dead: false, dir: 0, home: [A.x, A.y] }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
      const kid = +w.E.who.id.split(':').pop(), o = S.npcs['hk_' + w.hid + '_' + kid]; if (o) visGone(o); const og = w.hid === 'crown' && S.npcs[w.E.who.id === 'r:alaric' ? 'k_prince' : w.E.who.id === 'r:lyra' ? 'k_princess' : 'rk_' + kid]; if (og && !og.wedCopy) visGone(og); }
    if (w.hid === 'crown') { const og = S.npcs[w.E.who.id === 'r:alaric' ? 'k_prince' : w.E.who.id === 'r:lyra' ? 'k_princess' : 'rk_' + w.E.who.id.split(':').pop()]; if (og && !og.wedCopy) visGone(og); }   /* a noiva (ou o noivo) real sai do castelo quando a cerimônia começa e chega por último */
    if (w.hid === 'crown') for (const R of mr2RoyalFamily(w)) { const id = 'wr_' + R.id; if (!mr2Due(w, R.pew === 0 ? 'lord' : R.pew === 1 ? 'spouse' : 'heir')) continue; want[id] = 1; const o = S.npcs[R.id]; if (o && !o.wedCopy) visGone(o);
      if (!S.npcs[id]) { const P = mr2Pew(R.pew), n = { id, kind: R.kind, name: R.name, transient: true, court: 'wedding', wed: w.key, house: 'crown', royal: R.id, pew: 1, wedCopy: 1, x: D[0], y: D[1], z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false, dir: 0, home: [P.x, P.y] }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); } } }
  for (const n of Object.values(S.npcs)) { if (n.court !== 'wedding' && n.court !== 'mr2thug') continue; if (n.court === 'wedding' && !want[n.id] && !n.dead) { visGone(n); continue; } if (n.dead) continue;
    if (n.downed) { if (now > n.downed.until) { n.downed = null; n.hp = Math.round(n.maxHp * 0.3); } continue; }
    if (n.court === 'mr2thug') { mr2ThugTick(n, now, dt); continue; }
    if (n.fight && S.players[n.fight.id]) { if (!npcFightTick(n, now, dt)) n.fight = null; continue; }
    const th = !n.groom && Object.values(S.npcs).find(t => t.court === 'mr2thug' && !t.dead && !t.downed && t.wedHid === n.house && dist(t.x, t.y, n.x, n.y) < 12);   /* os guardas defendem a família */
    if (th) { const d = dist(n.x, n.y, th.x, th.y); if (d > 1.3) npcWalk(n, th.x, th.y, 2, dt); else if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1300; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: th.x, ty: th.y }); npcDamage(th, rint(25, 40), null); } continue; }
    if (n.home && dist(n.x, n.y, n.home[0], n.home[1]) > 0.3) { npcWalk(n, n.home[0], n.home[1], 1.3, dt); n.sitting = false; } else { n.walk = false; if (n.pew) n.sitting = true; } }
  /* casas no chão voltam a si (ninguém mais cuida delas na Catedral) */
  for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.downed && now > n.downed.until) { n.downed = null; n.hp = Math.round(n.maxHp * 0.3); } }
if (typeof courtSpawn === 'function') { const _csK2 = courtSpawn; courtSpawn = function (def) { try { const W = S.estate && def && MR2_ROYAL.some(r => r[0] === def.id) && mr2WedOf('crown'); if (W && (S.npcs['wr_' + def.id] || (def.id === 'k_prince' && W.E.who.id === 'r:alaric') || (def.id === 'k_princess' && W.E.who.id === 'r:lyra'))) return null; } catch (e) { } return _csK2(def); }; }
/* capangas: de uma casa rival no casamento, ou guardando o cônjuge sequestrado */
function mr2SpawnThug(id, x, y, extra) { const n = Object.assign({ id, kind: 'v_thug1', name: 'Capanga', transient: true, court: 'mr2thug', wantedT: 9e15, x, y, z: 0, fl: 0, fb: -1, hp: 160, maxHp: 160, downed: null, dead: false, dir: 0 }, extra); S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n; }
function mr2ThugTick(n, now, dt) { let tg = null;
  if (n.wedHid) { const W = mr2WedOf(n.wedHid); if (!W) { visGone(n); return; } tg = Object.values(S.npcs).find(o => !o.dead && ((o.court === 'house' && o.house === n.wedHid && ['lord', 'spouse', 'heir'].includes(o.hrole) && mr2GroomRole(W.E) === o.hrole) || (o.court === 'wedding' && o.groom && o.house === n.wedHid))); }
  if (n.hide) { const q = Object.values(S.players).filter(o => !o.downed && !(o.fl || 0) && dist(o.x, o.y, n.x, n.y) < 14).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0]; if (q) n.aggro = q.id; }
  const pl = n.aggro && S.players[n.aggro]; if (n.hide && !(pl && !pl.downed && dist(pl.x, pl.y, n.x, n.y) < 14)) { if (n.home && dist(n.x, n.y, n.home[0], n.home[1]) > 0.3) npcWalk(n, n.home[0], n.home[1], 1.3, dt); return; }
  if (pl && !pl.downed && dist(pl.x, pl.y, n.x, n.y) < (tg ? 2.5 : 14)) { n.fight = { id: pl.id, until: now + 20000 }; if (npcFightTick(n, now, dt)) return; }
  if (!tg) return; const d = dist(n.x, n.y, tg.x, tg.y); if (d > 1.3) { npcWalk(n, tg.x, tg.y, 2, dt); return; }
  if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1400; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: tg.x, ty: tg.y }); npcDamage(tg, rint(30, 45), null); } }
if (typeof thiefCaught === 'function') { const _tcK2 = thiefCaught; thiefCaught = function (n, by) { if (n && n.court === 'mr2thug') { n.dead = true; visGone(n, (by ? by.name : 'Alguém') + ' derrubou um capanga.'); return; } return _tcK2(n, by); }; }
/* a cerimônia leva um tempo: os votos saem depois de MR2.vowMs com o noivo na Catedral */
if (typeof mrInTemple === 'function') { const _mitK2 = mrInTemple; mrInTemple = function (p) { const ok = _mitK2(p), now = now_(), E = mrRec().eng[estOwner(p)]; if (!ok || !E || !E.st) return false; const gr = E.kind === 'npc' ? Object.values(S.npcs).find(n => (n.court === 'wedding' && n.groom && n.wed === estOwner(p)) || (n.court === 'house' && n.house === mrHidOf(E.who.id) && mr2GroomRole(E) === n.hrole)) : null, A = mr2Altar();   /* os votos saem quando o noivo NPC chegou ao altar */
  if (E.kind === 'npc' && gr && A && dist(gr.x, gr.y, A.x, A.y) > 1.6) return false; return now - E.st >= MR2.vowMs; }; }
function mr2WedTick(now) { const R = mrRec(); for (const w of mr2WedOn()) { const p = mr2P(w.key), E = w.E; if (!w.hid || !p || !E.st) continue;
    if (E.thugT === E.st || now - Math.max(E.st, E.g0 || 0) < MR2.arrive.groom + 8000) continue; E.thugT = E.st;   /* sabotagem: só por rancor, quando todos já estão sentados */
    const rv = mr2Grudgers(w.key, w.hid); if (!rv.length || Math.random() >= MR2.thugChance) continue; const by = HOUSE_BY[rv[0].h], why = rv[0].why, T = BUILDINGS[templeBi()], [dx, dy] = doorTile(T), v = DOOR_V[T.door || 'S'];
    for (let i = 0; i < MR2.thugs; i++) mr2SpawnThug('mt_w_' + w.hid + '_' + i, dx - v[0] * 1.2 + (i - 1) * 0.7, dy - v[1] * 1.2, { wedHid: w.hid, aggro: p.id, name: 'Capanga da ' + by.n });
    sys('⚔ Capangas da ' + by.n + ' invadiram a Catedral da Aurora no meio do casamento (' + why + ')!'); hNews('A ' + by.n + ' mandou capangas ao casamento na Catedral: ' + why + '.'); }
  /* convidados para quem pode revelar algo */
  for (const w of mr2WedOn().concat(mr2PWedOn())) for (const q of Object.values(S.players)) { const qk = estOwner(q); if (qk === w.key || (w.pair && w.pair.includes(qk)) || q._mr2Rev === w.key + w.E.day || !_mitK2q(q)) continue; const L = mr2Revealables(q, w); if (!L.length) continue; q._mr2Rev = w.key + w.E.day; Net.toOne(q.id, { t: 'mr2rev', key: w.key, who: mr2Name(w.key), groom: w.pair ? mr2Name(w.pair[1]) : w.E.who.n, pl: w.pair ? 1 : 0, l: L }); } }
function _mitK2q(q) { const bi = templeBi(); return bi >= 0 && WORLD.bld[tileAt(q.x, q.y)] === bi && !(q.fl || 0); }
function mr2Revealables(q, w) { const hk = estOwner(q), out = [];
  if (w.hid) secList(q).forEach((s, i) => { if (s.h === w.hid && secWeight(s) >= MR2.revW) out.push({ src: 'h', i, t: s.t }); });
  const who = w.pair || [w.key]; mr2Known(hk).forEach(r => { const s = who.includes(r.o) && mr2SinOf(r.o, r.id); if (s && !s.rev && MR2.sinW >= MR2.revW) out.push({ src: 'p', o: r.o, id: s.id, t: s.t }); }); return out; }
function mr2DoReveal(q, m) { const w = mr2WedOn().concat(mr2PWedOn()).find(x => x.key === m.key); if (!w || !_mitK2q(q)) return; const L = mr2Revealables(q, w), it = L.find(x => (m.src === 'h' && x.src === 'h' && x.i === (m.i | 0)) || (m.src === 'p' && x.src === 'p' && x.id === m.id)); if (!it) return; const h = mr2HN(w.hid);
  if (w.pair) { const s = mr2SinOf(it.o, it.id); s.rev = estDay(); const K = mr2Known(estOwner(q)); K.splice(K.findIndex(r => r.o === it.o && r.id === it.id), 1); mr2SendKnown(estOwner(q)); const R = mrRec(); for (const k of w.pair) { delete R.eng[k]; const o = mr2P(k); if (o) tell(o, 'O casamento foi cancelado.'); }
    const why = q.name + ' se levantou na Catedral e disse diante de todos: “' + it.t + '” O casamento de ' + mr2Name(w.pair[0]) + ' e ' + mr2Name(w.pair[1]) + ' foi cancelado.'; sys('💔 ' + why); hNews(why); estateSave(); return; }
  if (it.src === 'h') { const s = secList(q).splice(it.i, 1)[0], st = hRec().st[w.hid]; st.prestige = clampH(st.prestige - secWeight(s), 0, 100); if (typeof infAdd === 'function') for (const pl of INF_PLACES) infAdd(w.hid, pl.id, -secWeight(s)); }
  else { const s = mr2SinOf(w.key, it.id); s.rev = estDay(); const K = mr2Known(estOwner(q)); K.splice(K.findIndex(r => r.o === w.key && r.id === it.id), 1); mr2SendKnown(estOwner(q)); const p = mr2P(w.key); if (p) hFavor(p, w.hid, -20, 'a sua vergonha foi dita diante do altar'); }
  mr2Cancel(w, 'half', q.name + ' se levantou na Catedral e disse diante de todos: “' + it.t + '” ' + h.lord + ' cancelou o casamento.'); }
/* o casamento acaba antes dos votos */
function mr2Cancel(w, money, why) { const R = mrRec(), E = R.eng[w.key]; if (!E) return; delete R.eng[w.key]; delete R.taken[E.who.id]; const p = mr2P(w.key);
  const back = money === 'all' ? E.dote : money === 'half' ? Math.round(E.dote / 2) : 0; if (back) mr2Bank(w.key, back);
  sys('💔 ' + why); hNews(why); if (p) { p._mr2In = 0; tell(p, 'O casamento foi cancelado.' + (back ? ' Do dote, ' + back + ' de ouro voltaram para o seu banco.' : ' O dote ficou perdido.')); }
  for (const n of Object.values(S.npcs)) if ((n.court === 'wedding' && n.wed === w.key) || (n.court === 'mr2thug' && n.wedHid === w.hid)) { if (n.fight) continue; visGone(n); } estateSave(); }
/* atacar alguém do casamento: procurado por assassinato, a casa vira inimiga */
function mr2Assault(n, p) { const hid = n.house; if (!hid || !p || p.dev) return; const W = mr2WedOf(hid); if (!W) return; const k = estOwner(p), H = mr2Rec().hostile;
  for (const g of Object.values(S.npcs)) if (g.court === 'wedding' && g.house === hid && !g.groom && !g.dead && !g.downed) { g.fight = { id: p.id, until: now_() + 60000 }; g.flee = null; }
  if (H[k] && H[k][hid] === estDay() && p.murderer) return; (H[k] = H[k] || {})[hid] = estDay(); p.murderer = true; secCrime(p, 'wedkill', 'assassinato no casamento', 360000);
  if (hid === 'crown') { crownRec().favor[k] = 0; if (crownRec().vow[k]) delete crownRec().vow[k]; } else { const F = hRec().favor[k] = hRec().favor[k] || {}; F[hid] = 0; if (hRec().vow[k] === hid) delete hRec().vow[k]; } tell(p, 'Você atacou a ' + mr2HN(hid).n + ' na Catedral: procurado por assassinato, e a casa agora é sua inimiga.');
  if (W.key === k) mr2Cancel(W, 'none', p.name + ' atacou a família do noivo no próprio casamento!'); estateSave(); }
if (typeof npcDamage === 'function') { const _ndK2 = npcDamage; npcDamage = function (n, dmg, p) { const wed = n && !n.dead && p && ((n.court === 'house' && ['lord', 'spouse', 'heir'].includes(n.hrole)) || n.court === 'wedding') && S.estate && mr2WedOf(n.house); _ndK2(n, dmg, p); if (wed) { mr2Assault(n, p); if (n.court === 'wedding') n.flee = null; } }; }
/* mortes de verdade */
function mr2FamDead(h, role, cause) { if (role === 'spouse') { const nm = h.spouse; rgRec().widow[h.id] = 1; for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.house === h.id && n.hrole === 'spouse') visGone(n); hNews(nm + ' morreu (' + cause + '). ' + h.lord + ' está viúvo.'); sys('Notícia: ' + nm + ' morreu (' + cause + ').'); return; }
  if (role === 'heir') { const old = h.heir; for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.house === h.id && n.hrole === 'heir') visGone(n);
    if (typeof lnTakeHeir === 'function' && lnTakeHeir(h)) { hNews(old + ' morreu (' + cause + '). ' + h.heir + ' é o novo herdeiro da ' + h.n + '.'); sys('Notícia: ' + old + ' morreu (' + cause + ').'); return; }
    const L = (typeof TR_HEIR2 !== 'undefined' && TR_HEIR2[h.id]) || [], used = trRec().names[h.id] ? (trRec().names[h.id].gen || 0) : 0, nn = L[Math.min(L.length - 1, used + 1)] || ('Herdeiro da ' + h.n); h.heir = nn.replace(/^Lorde |^Lady /, ''); const A = rgAges()[h.id]; if (A) A.heir = ageNow(28);
    hNews(old + ' morreu (' + cause + '). ' + h.heir + ' é o novo herdeiro da ' + h.n + '.'); sys('Notícia: ' + old + ' morreu (' + cause + ').'); } }
if (typeof npcDie === 'function') { const _ndieK2 = npcDie; npcDie = function (n, p) { const hid = n && n.house, W = hid && S.estate && mr2WedOf(hid); _ndieK2(n, p); try { if (p && S.estate && n.court === 'house' && ['lord', 'spouse', 'heir'].includes(n.hrole)) mr2Grudge(hid, 'p:' + estOwner(p), 'vingança de sangue: ' + p.name + ' matou ' + n.name.split(',')[0]); } catch (e) { } if (!W) return; try {
  const cause = p ? 'morto por ' + p.name + ' no casamento' : 'morto por capangas no casamento', h = HOUSE_BY[hid];
  if (n.royal) { if (n.royal === 'k_king') trKill('king', cause); else if (n.royal === 'k_prince') trKill('alaric', cause); else if (n.royal === 'k_princess') { sucRec().alive.lyra = 0; hNews('A Princesa Lyra morreu (' + cause + ').'); } else if (n.royal === 'k_queen' && typeof lnRec === 'function') { lnRec().queen = 0; hNews('A Rainha Isolda morreu (' + cause + ').'); } }
  if (n.court === 'wedding' && n.groom && hid === 'crown') { if (W.E.who.id === 'r:alaric') trKill('alaric', cause); else if (W.E.who.id === 'r:lyra') { sucRec().alive.lyra = 0; hNews('A Princesa Lyra morreu (' + cause + ').'); } }
  const fam = (n.court === 'house' && ['lord', 'spouse', 'heir'].includes(n.hrole)) || !!n.royal; if (n.court === 'house' && (n.hrole === 'spouse' || n.hrole === 'heir')) mr2FamDead(h, n.hrole, cause);
  if (n.court === 'wedding' && n.groom && typeof lnRec === 'function') { const kid = +W.E.who.id.split(':').pop(), list = lnRec().kids[hid] || [], i = list.findIndex(x => x.id === kid); if (i >= 0) list.splice(i, 1); visGone(n); }
  if (fam || n.groom) { const self = p && estOwner(p) === W.key; mr2Cancel(W, self ? 'none' : 'all', 'O casamento na Catedral virou um massacre: ' + n.name + ' morreu.'); } estateSave(); } catch (e) { console.warn('casamento2', e); } }; }

/* ---- sequestro do cônjuge ---- */
/* o esconderijo dos sequestradores: um acampamento pequeno a oeste da muralha (posto no mundo ao carregar, igual em todos) */
const MR2_HIDE = (function () { if (typeof WORLD === 'undefined' || !WORLD.obj || (typeof TEST3D !== 'undefined' && TEST3D)) return null; const free = (x, y) => { if (x < 3 || y < 3 || x >= MAP_W - 3 || y >= MAP_H - 3) return false; const i = y * MAP_W + x, g = WORLD.ground[i]; return g !== T.WATER && g !== T.CLIFF && g !== T.SHALLOW && !BLOCKING.has(WORLD.obj[i]) && WORLD.bld[i] < 0 && WORLD.zone[i] !== Z.VILLAGE; };
  const area = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (!free(x + dx, y + dy) && Math.hypot(dx, dy) < 3) return false; return true; };
  for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) { const x = CENTER - SAFE_R - 12 - r, y = CENTER + 4 + dy; if (!area(x, y)) continue;
    for (const [dx, dy2, o] of [[-3, -2, O.TENT], [3, -2, O.TENT], [0, -3, O.CAMPFIRE], [-3, 2, O.CRATE], [3, 2, O.CRATE], [2, 3, O.BARREL]]) if (free(x + dx, y + dy2)) WORLD.obj[(y + dy2) * MAP_W + x + dx] = o;
    return [x + 0.5, y + 0.5]; } return null; })();
function mr2Hide() { return MR2_HIDE || [CENTER - SAFE_R - 12, CENTER + 4]; }
function mr2Kidnap(key, by, byName) { const M = mrOf(key); if (!M || M.kind !== 'npc' || M.kid || M.dead) return false; M.kid = { by, until: estDay() + MR2.kidDays, ransom: MR2.ransom }; M.follow = 0; const n = S.npcs[mrSpouseId(key)]; if (n) visGone(n);
  const p = mr2P(key), txt = 'Sequestraram ' + mr2SpouseN(M) + (byName ? ' (' + byName + ')' : '') + '. Um bilhete: “' + MR2.ransom + ' de ouro ao Vesper, na viela da taverna, em ' + MR2.kidDays + ' dias. Ou nunca mais.” O esconderijo fica a oeste da muralha.';
  if (p) { tell(p, '⛓ ' + txt); Net.toOne(p.id, { t: 'mr2note', txt, hide: mr2Hide() }); } hNews(mr2SpouseN(M) + ', cônjuge de ' + mr2Name(key) + ', desapareceu.'); estateSave(); return true; }
function mr2KidFree(key, how) { const M = mrOf(key); if (!M || !M.kid) return; const K = M.kid; M.kid = null; for (const n of Object.values(S.npcs)) if ((n.court === 'mr2thug' && n.kidOf === key) || n.id === 'mr2cap_' + mrSpouseId(key)) visGone(n);
  const p = mr2P(key); if (how === 'ransom') { M.mood = Math.max(0, (M.mood || MR.mood0) - 10); if (K.by && K.by.includes('|')) { mr2Bank(K.by, Math.round(K.ransom * MR2.hireCut)); const q = mr2P(K.by); if (q) tell(q, 'O resgate de ' + mr2SpouseN(M) + ' foi pago: ' + Math.round(K.ransom * MR2.hireCut) + ' de ouro no seu banco (o Vesper ficou com a parte dele).'); } if (p) tell(p, 'Soltaram ' + mr2SpouseN(M) + ', que voltou para casa em choque.'); }
  else if (how === 'rescue') { M.mood = Math.min(100, (M.mood || MR.mood0) + 20); M.follow = 1; if (p) tell(p, 'Você libertou ' + mr2SpouseN(M) + '! Agora vem com você.'); sys('⚔ ' + (p ? p.name : 'Um aventureiro') + ' invadiu o esconderijo dos sequestradores e libertou ' + mr2SpouseN(M) + '.'); }
  else { M.mood = Math.min(M.mood || 0, 10); M.hurt = estDay() + 2; if (p) tell(p, 'O prazo passou. Largaram ' + mr2SpouseN(M) + ' na porta de casa, com ferimentos e furor contra você.'); }
  estateSave(); }
function mr2KidTick(now, dt) { const R = mrRec(), [hx, hy] = mr2Hide();
  for (const key of Object.keys(R.m)) { const M = R.m[key]; if (!M.kid) continue; if (estDay() > M.kid.until) { mr2KidFree(key, 'late'); continue; }
    const p = mr2P(key), cid = 'mr2cap_' + mrSpouseId(key); if (!p) continue; const near0 = dist(p.x, p.y, hx, hy) < 30;
    if (near0 && !S.npcs[cid]) { const c = { id: cid, kind: M.who.kind, name: mr2SpouseN(M) + ' (amarrado)', transient: true, court: 'mr2cap', kidOf: key, x: hx, y: hy, z: 0, fl: 0, fb: -1, hp: 200, maxHp: 200, downed: null, dead: false, dir: 0, sit: 1 }; S.npcs[cid] = c; Net.toAll({ t: 'vspawn', v: visPublic(c) });
      for (let i = 0; i < MR2.hideThugs; i++) { const a = i / MR2.hideThugs * Math.PI * 2, x = hx + Math.cos(a) * 2.2, y = hy + Math.sin(a) * 2.2; mr2SpawnThug('mt_k_' + mrSpouseId(key) + '_' + i, x, y, { kidOf: key, hide: 1, aggro: p.id, home: [x, y], name: 'Sequestrador' }); } }
    const left = Object.values(S.npcs).filter(n => n.court === 'mr2thug' && n.kidOf === key && !n.dead && !n.downed).length, C = S.npcs[cid];
    if (C && !left && dist(p.x, p.y, C.x, C.y) < 2.5) mr2KidFree(key, 'rescue'); } }
/* ---- sequestro de herdeiros das casas: uma casa rival leva o herdeiro; qualquer jogador pode resgatar ---- */
function mr2HK() { const R = mr2Rec(); return R.hkid || (R.hkid = {}); }
function mr2HeirKidDaily() { const K = mr2HK(), day = estDay();
  for (const H of Object.keys(K)) if (day > K[H].until) { const k = K[H], h = HOUSE_BY[H], by = HOUSE_BY[k.by]; delete K[H]; hRec().st[H].gold = clampH(hRec().st[H].gold - 8, 0, 100); hRel(H, k.by, -20); mr2Grudge(H, k.by, 'vingança: a ' + by.n + ' sequestrou o herdeiro deles'); hNews('A ' + h.n + ' pagou o resgate de ' + k.n + ' à ' + by.n + '. Ninguém esquece.'); sys('Notícia: a ' + h.n + ' pagou o resgate do herdeiro.'); mr2HKClean(H); }
  if (Object.keys(K).length) return; const R = mrRec();
  for (const x of HOUSES) for (const h of HOUSES) { if (x.id === h.id || x.player || h.player || R.taken['h:' + h.id + ':heir']) continue; const rel = (hRec().st[x.id].rel || {})[h.id] || 0, g = mr2GrudgeOf(x.id, h.id); if (!g && rel > -60) continue;
    if (Math.random() >= MR2.heirKid) continue; K[h.id] = { by: x.id, n: h.heir, until: day + MR2.heirKidDays, why: g ? g.why : 'a rivalidade entre as casas' };
    for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.house === h.id && n.hrole === 'heir') visGone(n);
    hNews(h.heir + ', herdeiro da ' + h.n + ', foi sequestrado. Dizem que foi a mando da ' + x.n + '. O esconderijo fica a oeste da muralha.'); sys('⛓ ' + h.heir + ', herdeiro da ' + h.n + ', foi sequestrado. Quem o trouxer de volta (esconderijo a oeste da muralha) terá a gratidão da casa.'); estateSave(); return; } }
function mr2HKClean(H) { for (const n of Object.values(S.npcs)) if ((n.court === 'mr2thug' && n.kidOf === 'h:' + H) || n.id === 'mr2hcap_' + H) visGone(n); }
function mr2HeirKidTick() { const K = mr2HK(), [hx, hy] = mr2Hide();
  for (const H of Object.keys(K)) { const k = K[H], cid = 'mr2hcap_' + H, cx = hx + 1.6, cy = hy + 0.4, near0 = Object.values(S.players).find(o => !(o.fl || 0) && dist(o.x, o.y, cx, cy) < 30);
    for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.house === H && n.hrole === 'heir') visGone(n);
    if (near0 && !S.npcs[cid]) { const c = { id: cid, kind: 'hh_heir_' + H, name: k.n + ' (amarrado)', transient: true, court: 'mr2cap', hk: H, x: cx, y: cy, z: 0, fl: 0, fb: -1, hp: 200, maxHp: 200, downed: null, dead: false, dir: 0 }; S.npcs[cid] = c; Net.toAll({ t: 'vspawn', v: visPublic(c) });
      for (let i = 0; i < MR2.hideThugs; i++) { const a = (i + 0.5) / MR2.hideThugs * Math.PI * 2, x = cx + Math.cos(a) * 2.2, y = cy + Math.sin(a) * 2.2; mr2SpawnThug('mt_h_' + H + '_' + i, x, y, { kidOf: 'h:' + H, hide: 1, aggro: near0.id, home: [x, y], name: 'Capanga da ' + HOUSE_BY[k.by].n }); } }
    const C = S.npcs[cid], left = Object.values(S.npcs).filter(n => n.court === 'mr2thug' && n.kidOf === 'h:' + H && !n.dead && !n.downed).length, hero = C && !left && Object.values(S.players).find(o => !(o.fl || 0) && dist(o.x, o.y, C.x, C.y) < 2.5);
    if (hero) { const h = HOUSE_BY[H], by = HOUSE_BY[k.by]; delete K[H]; mr2HKClean(H); hFavor(hero, H, MR2.heirFavor, 'trouxe ' + k.n + ' de volta'); hero.gold = (hero.gold || 0) + MR2.heirReward; sendStat(hero); tell(hero, 'A ' + h.n + ' pagou ' + MR2.heirReward + ' de ouro pelo resgate do herdeiro.'); hRel(H, k.by, -20); mr2Grudge(H, k.by, 'vingança: a ' + by.n + ' sequestrou o herdeiro deles');
      sys('⚔ ' + hero.name + ' invadiu o esconderijo e libertou ' + k.n + ', herdeiro da ' + h.n + '.'); hNews(hero.name + ' resgatou ' + k.n + ' dos capangas da ' + by.n + '.'); estateSave(); } } }
if (typeof hPost === 'function') { const _hpHK = hPost; hPost = function (def, n) { try { if (S.estate && n.hrole === 'heir' && mr2HK()[n.house]) return null; } catch (e) { } return _hpHK(def, n); }; }
if (typeof mrCandidates === 'function') { const _mcHK = mrCandidates; mrCandidates = function (hid) { const L = _mcHK(hid); try { if (S.estate && mr2HK()[hid]) return L.filter(c => c.tier !== 'heir'); } catch (e) { } return L; }; }
/* o cônjuge sequestrado some; ferido não acompanha */
if (typeof mrPost === 'function') { const _mpK2 = mrPost; mrPost = function (M, key, p) { if (M.kid) return null; if (M.hurt && estDay() <= M.hurt) { M.follow = 0; return mrHomeSpot(M, key); } return _mpK2(M, key, p); }; }
/* o Vesper: pagar o resgate, contratar um sequestro */
function mr2Vesper(p, m) { const vs = S.npcs.tr_smug; if (!vs || dist(vs.x, vs.y, p.x, p.y) > 3.2) { tell(p, 'Chegue mais perto do Vesper.'); return; } const key = estOwner(p), M = mrOf(key);
  if (m.op === 'ransom') { if (!M || !M.kid) return; if (!debit(key, p, M.kid.ransom)) { tell(p, 'O resgate é de ' + M.kid.ransom + ' de ouro (banco, cofres e bolsa).'); return; } sendStat(p); empSay(vs, 'Negócio é negócio. Já está voltando para casa.'); mr2KidFree(key, 'ransom'); }
  else if (m.op === 'hire') { const o = String(m.o || ''), T = mrOf(o); if (!T || T.kind !== 'npc' || T.kid || o === key) { tell(p, 'Esse alvo não serve.'); return; } if (!debit(key, p, MR2.hire)) { tell(p, 'Um sequestro custa ' + MR2.hire + ' de ouro.'); return; } sendStat(p); mr2Kidnap(o, key, null); empSay(vs, 'Amanhã cedo o bilhete chega. O resgate vem para você, menos a minha parte.'); }
  mr2VesperMenu(p); }
function mr2VesperMenu(p) { const key = estOwner(p), M = mrOf(key), R = mrRec(); Net.toOne(p.id, { t: 'mr2vesper', kid: M && M.kid ? { n: mr2SpouseN(M), v: M.kid.ransom, left: M.kid.until - estDay() } : null, hire: MR2.hire, gold: p.gold | 0, targets: Object.keys(R.m).filter(o => o !== key && R.m[o].kind === 'npc' && !R.m[o].kid && !R.m[o].dead).map(o => ({ o, n: mr2Name(o) + ' (' + mr2SpouseN(R.m[o]) + ')' })) }); }
if (typeof trMenu === 'function') { const _tmK2 = trMenu; trMenu = function (p) { _tmK2(p); try { mr2VesperMenu(p); } catch (e) { } }; }

/* ---- o cônjuge: traição, descobertas, cartas de chantagem das casas, sequestro pelas casas inimigas ---- */
function mr2Daily() { const R = mrRec(), R2 = mr2Rec();
  for (const key of Object.keys(R.m)) { const M = R.m[key], p = mr2P(key), hid = mr2SpHid(M);
    for (const s of mr2Sins(key)) if (!s.rev && Math.random() < MR2.discover) mr2Reveal(key, s, 'ouviu falar na cidade');
    const s1 = mr2Sins(key).find(s => !s.rev && s.hk.length); if (s1 && !R2.bmq[key] && p) { const h = HOUSE_BY[s1.hk[0]]; R2.bmq[key] = { h: h.id, id: s1.id, amt: MR2.bmAmt, until: estDay() + 1 }; Net.toOne(p.id, { t: 'mr2bm', name: h.lord + ' (' + h.n + ')', t2: s1.t, amt: MR2.bmAmt, src: 'h' }); }
    const Q = R2.bmq[key]; if (Q && estDay() > Q.until) { delete R2.bmq[key]; mr2Reveal(key, mr2SinOf(key, Q.id), 'a ' + HOUSE_BY[Q.h].n + ' mandou contar'); }
    if (M.kind !== 'npc' || M.kid || M.dead) continue;
    if ((M.mood || 0) < MR2.betrayMood && Math.random() < MR2.betray) mr2Betray(key, M, p, hid);
    if (M.affair && !M.affairKnown && Math.random() < 0.15) mr2AffairLearn(key, M, 'um criado contou');
    const rv = mr2Grudgers(key, hid); if (rv.length && Math.random() < MR2.kidDay) mr2Kidnap(key, rv[0].h, 'a mando da ' + HOUSE_BY[rv[0].h].n + ': ' + rv[0].why); }
  mr2Alliances(); mr2HeirKidDaily();
  estateSave(); }
function mr2Betray(key, M, p, hid) { const rv = mr2Rivals(key, hid).concat(HOUSES.filter(h => !h.player && h.id !== hid).map(h => h.id)), to = HOUSE_BY[rv[0]], L = p ? secList(p) : (velRec().sec[key] || []);
  if (L.length && Math.random() < 0.5) { const s = L.splice(Math.floor(Math.random() * L.length), 1)[0], sh = HOUSE_BY[s.h]; if (sh && p) hFavor(p, sh.id, -MR2.bmFavor, 'soube pelo seu cônjuge que você guardava um segredo dela'); for (const x of mr2Sins(key)) if (!x.rev && !x.hk.includes(to.id)) x.hk.push(to.id); if (p) tell(p, 'Algo mudou: um dos seus segredos sumiu da gaveta. Alguém da sua casa anda conversando com a ' + to.n + '.'); return; }
  if (!M.affair) { M.affair = { d: estDay() }; if (hid && hid !== 'crown') { const R = mr2Rec(); R.aff = R.aff || []; R.aff.push({ h: hid, k: 'spaff', key, t: mr2SpouseN(M) + ', cônjuge de ' + mr2Name(key) + ', tem um amante às escondidas.' }); } } }
function mr2AffairLearn(key, M, how) { if (!M.affair || M.affairKnown) return; M.affairKnown = estDay(); const p = mr2P(key), hid = mr2SpHid(M);
  if (p && hid && hid !== 'crown') { const L = secList(p); if (!L.some(s => s.k === 'spaff' && s.h === hid)) { L.unshift({ h: hid, k: 'spaff', d: estDay(), t: mr2SpouseN(M) + ', cônjuge de ' + p.name + ', tem um amante às escondidas.' }); L.length = Math.min(L.length, SEC_MAX); } }
  if (p) tell(p, '💔 ' + how + ': ' + mr2SpouseN(M) + ' tem um amante. Vale como segredo da ' + ((HOUSE_BY[hid] || {}).n || 'família') + ' (peso 4); fale com o cônjuge para confrontar.'); estateSave(); }
/* a Dama Ysolde também vende o caso do cônjuge (para quem quiser) */
if (typeof velMenu === 'function') { const _vmK2 = velMenu; velMenu = function (p, T, n) { _vmK2(p, T, n); try { if (T && T.menu === 'ysolde') mr2YsMenu(p); } catch (e) { } }; }
function mr2SpouseExtra(p) { const M = mrOf(estOwner(p)); if (!M) return; Net.toOne(p.id, { t: 'mr2sp', aff: M.affair && M.affairKnown ? 1 : 0, hurt: M.hurt && estDay() <= M.hurt ? 1 : 0 }); }
if (typeof mrSpouseMenu === 'function') { const _smK2 = mrSpouseMenu; mrSpouseMenu = function (p, n) { _smK2(p, n); try { if (estOwner(p) === n.mrKey) mr2SpouseExtra(p); } catch (e) { } }; }
function mr2Confront(p) { const key = estOwner(p), M = mrOf(key), n = S.npcs[mrSpouseId(key)]; if (!M || !M.affair || !M.affairKnown || !n || dist(n.x, n.y, p.x, p.y) > 3.5) return; M.affair = null; M.affairKnown = 0; mr2Rec().aff = (mr2Rec().aff || []).filter(a => a.key !== key); M.mood = Math.max(M.mood || 0, 40); empSay(n, 'Você quase não estava aqui… Acabou. Eu juro que acabou.'); tell(p, 'Você confrontou ' + mr2SpouseN(M) + ': o caso acabou.'); estateSave(); }

/* ---- mensagens (pelo tipo 'casar', com a: 'k2…') ---- */
function mr2Msg(p, m) { if (!S.estate || p.downed) return;
  if (m.a === 'k2rev') mr2DoReveal(p, m); else if (m.a === 'k2bm') mr2Blackmail(p, m); else if (m.a === 'k2bmans') mr2BmAnswer(p, m); else if (m.a === 'k2ys') mr2Ys(p, m); else if (m.a === 'k2vs') mr2Vesper(p, m); else if (m.a === 'k2conf') mr2Confront(p); else if (m.a === 'k2pk') mr2SendKnown(estOwner(p)); }
if (typeof mrMsg === 'function') { const _mmK2 = mrMsg; mrMsg = function (p, m) { if (m && typeof m.a === 'string' && m.a.startsWith('k2')) { mr2Msg(p, m); return; } return _mmK2(p, m); }; }
/* ---- tick ---- */
function mr2Tick(now) { if (!S.estate || now - (S.mr2T || 0) < 400) return; const dt = Math.min(0.5, (now - (S.mr2T || now)) / 1000) || 0.4; S.mr2T = now; const R2 = mr2Rec();
  if (R2.day !== estDay()) { const first = !R2.day; R2.day = estDay(); if (!first) mr2Daily(); }
  for (const p of Object.values(S.players)) { if (p.vlRest) mr2Velvet(p); if (!p._mr2pk) { p._mr2pk = 1; mr2SendKnown(estOwner(p)); } }
  mr2Nights(); mr2WedTick(now); mr2WedNpcs(dt, now); mr2KidTick(now, dt); mr2HeirKidTick();
  for (const key of Object.keys(mrRec().m)) { const M = mrRec().m[key]; if (M.kid) { const n = S.npcs[mrSpouseId(key)]; if (n) visGone(n); } } }
if (typeof housesTick === 'function') { const _htK2 = housesTick; housesTick = function (now) { _htK2(now); mr2Tick(now); }; }

// ---------------- CLIENTE ----------------
function mr2Panel(title, html) { return typeof velPanel === 'function' ? velPanel(title, html) : null; }
function mr2Add(html) { const d = document.getElementById('tequip'); if (!d) return null; const box = document.createElement('div'); box.innerHTML = html; d.appendChild(box); return box; }
const mr2Send = o => Net.send(Object.assign({ t: 'casar' }, o));
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peK2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'mr2pk') { G.mr2pk = m.l; return true; }
  if (m.t === 'mr2rev') { const d = mr2Panel('Revelar diante de todos', '<div class="est-cost">A Irmã Lúmina pergunta se alguém conhece algum impedimento ao casamento de <b>' + m.who + '</b> com <b>' + m.groom + '</b>. Você sabe de algo pesado:</div><div class="vel-secs">' + m.l.map((s, i) => '<div class="vel-sec"><span>' + s.t + '</span><button class="est-btn" data-r="' + i + '">Revelar<small>o lorde cancela</small></button></div>').join('') + '</div><div class="est-cost"><small>' + (m.pl ? 'O segredo é gasto e o casamento é cancelado.' : 'O segredo é gasto. O dote volta pela metade para o noivo.') + '</small></div>');
    if (d) d.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { const s = m.l[+b.dataset.r]; if (!b.dataset.sure) { b.dataset.sure = 1; b.innerHTML = 'Confirmar?<small>todos vão ouvir</small>'; return; } d.remove(); mr2Send({ a: 'k2rev', key: m.key, src: s.src, i: s.i, id: s.id, o: s.o }); }); return true; }
  if (m.t === 'mr2bm') { const d = mr2Panel('Chantagem', '<div class="est-cost">' + (m.src === 'h' ? 'Uma carta lacrada de <b>' + m.name + '</b>:' : '<b>' + m.name + '</b> chega perto e fala baixo:') + '<br><br>“Eu sei: ' + m.t2 + '”<br><br>“' + m.amt + ' de ouro e eu me calo. Se não, ' + (m.src === 'h' ? 'até amanhã' : 'agora mesmo') + ' o seu cônjuge fica sabendo.”</div><div class="tq-btns"><button class="est-btn" data-y>Pagar ' + m.amt + '</button><button class="est-btn ghost" data-n>Recusar</button></div>');
    if (d) { d.querySelector('[data-y]').onclick = () => { d.remove(); mr2Send({ a: 'k2bmans', pay: 1 }); }; d.querySelector('[data-n]').onclick = () => { d.remove(); mr2Send({ a: 'k2bmans', pay: 0 }); }; } return true; }
  if (m.t === 'mr2note') { mr2Panel('Um bilhete', '<div class="est-cost">⛓ ' + m.txt + '</div><div class="est-cost"><small>Pague ao Vesper (viela da taverna) ou invada o esconderijo: 4 sequestradores guardam o refém. Chegue perto do refém depois de derrubar todos.</small></div>'); G.mr2hide = m.hide; return true; }
  const r = _peK2(m, now);
  if (m.t === 'mr2vesper') { const box = mr2Add('<div class="vel-sub">Sequestros</div><div class="tq-btns">' + (m.kid ? '<button class="est-btn" data-kr' + (m.gold < m.kid.v ? '' : '') + '>Pagar o resgate de ' + m.kid.n + '<small>' + m.kid.v + ' de ouro · ' + (m.kid.left > 0 ? m.kid.left + ' dia(s) de prazo' : 'último dia') + '</small></button>' : '') + '</div>' + (m.targets.length ? '<div class="est-cost"><small>Sequestrar o cônjuge de outro aventureiro: ' + m.hire + ' de ouro; o resgate (menos a parte do Vesper) vem para você.</small></div><div class="vel-vs">' + m.targets.map(t => '<button class="est-btn ghost" data-kh="' + t.o + '"' + (m.gold < m.hire ? ' disabled' : '') + '>' + t.n + '</button>').join('') + '</div>' : ''));
    if (box) { const kr = box.querySelector('[data-kr]'); if (kr) kr.onclick = () => mr2Send({ a: 'k2vs', op: 'ransom' }); box.querySelectorAll('[data-kh]').forEach(b => b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.innerHTML = 'Confirmar: ' + m.hire + ' de ouro?'; return; } mr2Send({ a: 'k2vs', op: 'hire', o: b.dataset.kh }); }); } return true; }
  if (m.t === 'mr2ys') { const box = mr2Add('<div class="vel-sub">Segredos de aventureiros</div><div class="vel-secs">' + (m.l.length ? m.l.map((s, i) => '<div class="vel-pk"><span>' + s.t + '</span> <button class="est-btn ghost" data-yt="' + i + '"' + (m.gold < m.tell ? ' disabled' : '') + '>Contar ao cônjuge<small>−' + m.tell + '</small></button></div>').join('') : '<div class="est-cost"><small>Você não sabe nada da vida de outros casados.</small></div>') + '</div><div class="tq-btns"><button class="est-btn ghost" data-yb' + (m.gold < m.buy ? ' disabled' : '') + '>Comprar um segredo de aventureiro<small>' + m.buy + ' de ouro</small></button></div>');
    if (box) { box.querySelector('[data-yb]').onclick = () => mr2Send({ a: 'k2ys', op: 'buy' }); box.querySelectorAll('[data-yt]').forEach(b => b.onclick = () => { const s = m.l[+b.dataset.yt]; mr2Send({ a: 'k2ys', op: 'tell', o: s.o, id: s.id }); }); } return true; }
  if (m.t === 'mr2sp') { const box = mr2Add((m.hurt ? '<div class="est-cost"><small>Ainda se recupera do sequestro: não sai de casa.</small></div>' : '') + (m.aff ? '<div class="tq-btns"><button class="est-btn" data-cf>Confrontar: eu sei do seu amante</button></div>' : '')); if (box && m.aff) box.querySelector('[data-cf]').onclick = () => mr2Send({ a: 'k2conf' }); return true; }
  return r; }; }
/* F perto de outro jogador: chantagear com um segredo dele */
if (typeof csF === 'function' && typeof G !== 'undefined') { const _cfK2 = csF; csF = function () { const r = _cfK2(); try { const q = typeof mrPlayerNear === 'function' ? mrPlayerNear() : null, d = document.getElementById('tequip'), L = (G.mr2pk || []).filter(s => s.n === (q && q.name) && !s.bm);
  if (r && q && d && L.length) { const box = document.createElement('div'); box.innerHTML = '<div class="vel-sub">Você sabe de algo</div>' + L.map((s, i) => '<div class="est-cost"><small>' + s.t + '</small></div><div class="tq-btns"><button class="est-btn ghost" data-bm="' + i + '">🗝 Chantagear: ' + MR2.bmAmt + ' de ouro ou conto ao cônjuge</button></div>').join(''); d.appendChild(box); box.querySelectorAll('[data-bm]').forEach(b => b.onclick = () => { d.remove(); mr2Send({ a: 'k2bm', to: q.id, id: L[+b.dataset.bm].id, amt: MR2.bmAmt }); }); } } catch (e) { } return r; }; }
