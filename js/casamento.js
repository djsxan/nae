// ============================================================
//  PARTE K, ETAPA 1: casamento. Pedir a mão de um nobre ao lorde da casa (favor 40, dote 500/1.500) ou de
//  alguém da família real ao rei na audiência (favor 40, dote 3.000); aceita com 50% + 10% a cada 500 a
//  mais. Cerimônia na Catedral às 17h do dia seguinte (falta uma vez: adia; duas: acaba). Casado, o
//  jogador entra na casa do cônjuge (favor alto, casarão aberto) e fica logo atrás dele na linha. O
//  cônjuge NPC mora onde o jogador escolher (e muda depois), tem rotina, humor e pode acompanhar.
//  Dormir na mesma casa: 20% de filho por noite (nasce 5 dias depois, até 3). Casamento entre jogadores.
// ============================================================
const MR = { limit: 3, favor: 40, crownFavor: 40, dote: { kid: 500, heir: 1500, lord: 1500, royal: 3000 }, base: 0.5, perExtra: 0.1, step: 500, hour: [17, 18], famFavor: 40, mood0: 70, gift: 30, followMs: 600000, birth: 0.2, pregDays: 5, maxKids: 3, refundFail: 0.5, failFavor: -10 };

// ---------------- SERVIDOR ----------------
function mrRec() { const E = S.estate; if (!E.casamento) E.casamento = { m: {}, eng: {}, taken: {}, seq: 0 }; return E.casamento; }
/* candidatos: herdeiros, filhos mais novos adultos, lordes viúvos e a família real */
function mrCandidates(hid) { const L = typeof lnRec === 'function' ? lnRec() : { kids: {}, married: {} }, R = mrRec(), out = [], free = id => !R.taken[id];
  if (hid === 'crown') { const U = sucRec(); if (U.alive.alaric && U.king !== 'alaric' && free('r:alaric')) out.push({ id: 'r:alaric', n: SUC_NAMES.alaric, tier: 'royal', kind: 'k_prince' }); if (U.alive.lyra && U.king !== 'lyra' && free('r:lyra')) out.push({ id: 'r:lyra', n: SUC_NAMES.lyra, tier: 'royal', kind: 'k_princess' });
    for (const k of (L.kids.crown || [])) if (!k.dead && lnAge(k) >= 20 && free('r:kid:' + k.id)) out.push({ id: 'r:kid:' + k.id, n: lnTitle(k, 'crown'), tier: 'royal', kind: 'k_ryoung' }); return out; }
  const h = HOUSE_BY[hid]; if (!h || h.player) return out; if (!L.married[hid] && free('h:' + hid + ':heir')) out.push({ id: 'h:' + hid + ':heir', n: h.heir, tier: 'heir', kind: 'hh_heir_' + hid });
  if (typeof rgRec === 'function' && rgRec().widow[hid] && free('h:' + hid + ':lord')) out.push({ id: 'h:' + hid + ':lord', n: h.lord + ' (viúvo)', tier: 'lord', kind: 'hh_lord_' + hid });
  for (const k of (L.kids[hid] || [])) if (lnAge(k) >= 20 && free('h:' + hid + ':kid:' + k.id)) out.push({ id: 'h:' + hid + ':kid:' + k.id, n: lnTitle(k, hid), tier: 'kid', kind: 'hh_young_' + hid }); return out; }
const mrHidOf = id => id.startsWith('r:') ? 'crown' : id.split(':')[1];
function mrChance(tier, dote) { return Math.min(0.95, MR.base + Math.floor(Math.max(0, dote - MR.dote[tier]) / MR.step) * MR.perExtra); }
function mrOf(key) { return mrRec().m[key] || null; }
/* casas do jogador onde o cônjuge pode morar */
function mrHomes(p) { const k = estOwner(p), E = estateLoad(), out = [];
  for (const pid of Object.keys(E.r)) { const r = E.r[pid], P = PROPS_BY[pid]; if (r.owner !== k || !P || P.kind !== 'house' || P.apt) continue; out.push({ id: 'p:' + pid, n: P.name }); }
  if (typeof hotelRoomOf === 'function' && hotelRoomOf(p) >= 0) out.push({ id: 'hotel', n: 'Quarto na Pousada do Javali Magro' });
  const M = mrOf(k); if (M && M.kind === 'npc') out.push({ id: 'fam', n: mrHidOf(M.who.id) === 'crown' ? 'O castelo (com a família real)' : 'O casarão da ' + (HOUSE_BY[mrHidOf(M.who.id)] || {}).n }); return out; }
function mrHomeSpot(M, key) { const h = M.home || 'fam';
  if (h.startsWith('p:')) { const P = PROPS_BY[h.slice(2)]; if (P) { const s = estHomeSpot(P); return { x: s.x + 0.3, y: s.y, fl: 0, bi: P.bi }; } }
  if (h === 'hotel') { const q = Object.values(S.players).find(o => estOwner(o) === key), k = q ? hotelRoomOf(q) : -1, C = k >= 0 && HOTEL_CABS[k]; if (C && C.spot) return { x: C.spot[0], y: C.spot[1], fl: 0, bi: C.bi }; }
  const hid = M.who ? mrHidOf(M.who.id) : null; if (hid === 'crown') { const b = castleB(); const [x, y] = localToWorld(b, 9.5, 8); return { x, y, fl: 2, bi: castleBi() }; }
  const b = hid && hSeatB(hid); if (b) { const [x, y] = seatPt(b, 0, 2.6, 5.4); return { x, y, fl: 0, bi: BUILDINGS.indexOf(b) }; } return null; }
/* ---- pedido ---- */
function mrPropose(p, m) { const k = estOwner(p), R = mrRec(); if (mrOf(k)) { tell(p, 'Você já é casado. Só a morte desfaz o casamento.'); return; } if (R.eng[k]) { tell(p, 'Você já está noivo.'); return; }
  const id = String(m.c || ''), hid = mrHidOf(id), c = mrCandidates(hid).find(x => x.id === id); if (!c) { tell(p, 'Essa pessoa não está disponível.'); return; }
  const fav = hid === 'crown' ? (crownRec().favor[crownKey(p)] || 0) : ((hRec().favor[k] || {})[hid] || 0), need = hid === 'crown' ? MR.crownFavor : MR.favor;
  if (fav < need) { tell(p, (hid === 'crown' ? 'O rei' : HOUSE_BY[hid].lord) + ' só considera o pedido de quem tem favor ' + need + ' (você tem ' + fav + ').'); return; }
  if ((R.no || {})[k + '|' + hid] && estDay() < R.no[k + '|' + hid]) { tell(p, 'Já recusaram o seu pedido. Volte amanhã.'); return; }
  const dote = Math.max(MR.dote[c.tier], Math.round(+m.dote || 0)); if (!debit(k, p, dote)) { tell(p, 'O dote é de ' + dote + ' de ouro (banco, cofres e bolsa).'); return; } sendStat(p);
  if (Math.random() >= mrChance(c.tier, dote)) { const back = Math.round(dote * 0.9); p.gold = (p.gold || 0) + back; sendStat(p); (R.no = R.no || {})[k + '|' + hid] = estDay() + 1; tell(p, 'Recusado. O dote voltou (' + back + ' de ouro; a família ficou com um pouco pelo incômodo).'); estateSave(); return; }
  R.taken[id] = k; R.eng[k] = { kind: 'npc', who: c, dote, day: estDay(), until: estDay() + MR.limit, tries: 0 }; estateSave();
  sys('💍 Noivado: ' + p.name + ' vai casar com ' + c.n + ' na Catedral da Aurora.'); hNews(p.name + ' ficou noivo de ' + c.n + '.');
  tell(p, 'Aceito! Quando quiser casar, vá à Catedral e peça à Irmã Lúmina para começar a cerimônia (até o fim do dia ' + (estDay() + MR.limit) + ', daqui a ' + MR.limit + ' dias). Você espera no altar; os convidados chegam e ' + c.n + ' chega por último.'); mrEngSend(k); }
/* casamento entre jogadores: pedido e resposta */
function mrPropPlayer(p, m) { const q = S.players[m.to]; if (!q || q === p || dist(p.x, p.y, q.x, q.y) > 3) { tell(p, 'Chegue mais perto.'); return; } const k1 = estOwner(p), k2 = estOwner(q), R = mrRec();
  if (mrOf(k1) || mrOf(k2) || R.eng[k1] || R.eng[k2]) { tell(p, 'Um de vocês já é casado ou noivo.'); return; }
  q.mrAsk = { from: p.id, until: now_() + 60000 }; Net.toOne(q.id, { t: 'mrask', from: p.id, name: p.name }); tell(p, 'Você pediu ' + q.name + ' em casamento. Esperando a resposta…'); }
function mrAnswer(q, m) { const A = q.mrAsk; q.mrAsk = null; if (!A || now_() > A.until) return; const p = S.players[A.from]; if (!p) return; if (!m.yes) { tell(p, q.name + ' recusou o seu pedido.'); return; }
  const R = mrRec(), k1 = estOwner(p), k2 = estOwner(q), day = estDay(), until = day + MR.limit; R.eng[k1] = { kind: 'player', partner: k2, pname: q.name, day, until, tries: 0 }; R.eng[k2] = { kind: 'player', partner: k1, pname: p.name, day, until, tries: 0 }; estateSave(); mrEngSend(k1); mrEngSend(k2);
  sys('💍 Noivado: ' + p.name + ' e ' + q.name + ' vão se casar na Catedral da Aurora (qualquer um dos dois pede à Irmã Lúmina para começar, até o dia ' + until + ').'); }
/* ---- cerimônia ---- */
function mrInTemple(p) { const bi = templeBi(); return bi >= 0 && WORLD.bld[tileAt(p.x, p.y)] === bi && !(p.fl || 0); }
function mrWed(key, E, p) { const R = mrRec(); delete R.eng[key]; const M = { kind: E.kind, since: estDay(), mood: MR.mood0, kids: [], births: 0, home: null };
  if (E.kind === 'npc') { M.who = E.who; M.home = 'fam'; const hid = mrHidOf(E.who.id);
    if (hid === 'crown') { crownRec().vow[key] = 'Aurenfell'; if (hRec().vow[key]) delete hRec().vow[key]; crownFavor(p, MR.famFavor, 'casou com a família real'); }
    else { if (crownRec().vow[key]) delete crownRec().vow[key]; hRec().vow[key] = hid; hFavor(p, hid, MR.famFavor, 'casou com alguém da família'); }
    if (E.who.id.includes(':kid:') && typeof lnRec === 'function') { const kidId = +E.who.id.split(':').pop(), L = lnRec(), list = hid === 'crown' ? L.kids.crown : L.kids[hid], kk = (list || []).find(x => x.id === kidId); if (kk) kk.wed = key; } }
  else M.partner = E.partner;
  R.m[key] = M; estateSave(); return M; }
function mrCeremony(now) { const R = mrRec(), h = empHour(), day = estDay();
  for (const key of Object.keys(R.eng)) { const E = R.eng[key]; if (!E || day < E.day) continue; const p = Object.values(S.players).find(o => estOwner(o) === key);
    const live = !!(E.st && now - E.st < (typeof MR2 !== 'undefined' ? MR2.ceremonyMax : 240000));   /* a cerimônia começa quando o jogador pede à Irmã Lúmina */
    if (live) { if (E.kind === 'npc') { if (p && mrInTemple(p)) { const M = mrWed(key, E, p); sys('💒 Na Catedral da Aurora, diante da Irmã Lúmina, ' + p.name + ' e ' + E.who.n + ' se casaram!'); hNews(p.name + ' e ' + E.who.n + ' se casaram na Catedral.'); Net.toOne(p.id, { t: 'mrmenu', home: 1, homes: mrHomes(p), cur: M.home }); } }
      else { const q = Object.values(S.players).find(o => estOwner(o) === E.partner), E2 = R.eng[E.partner]; if (p && q && E2 && mrInTemple(p) && mrInTemple(q)) { mrWed(key, E, p); mrWed(E.partner, E2, q); sys('💒 Na Catedral da Aurora, ' + p.name + ' e ' + q.name + ' se casaram!'); hNews(p.name + ' e ' + q.name + ' se casaram na Catedral.'); mrJoinHouse(key, E.partner); for (const o of [p, q]) Net.toOne(o.id, { t: 'mrmenu', home: 1, homes: mrHomes(o).concat(mrHomes(o === p ? q : p)), cur: null }); } } }
    else if (E.st && R.eng[key]) { E.st = 0; E.g0 = 0; E.thugT = 0; E.toldT = 0; if (p) tell(p, 'A cerimônia não terminou (o noivo precisa ficar na Catedral até os votos). Peça de novo à Irmã Lúmina.'); estateSave(); }
    else if (day > (E.until != null ? E.until : E.day + 1) && R.eng[key] && !E.missed) { E.missed = 1; E.st = 0; E.g0 = 0; E.thugT = 0;
      if (false) { E.tries++; E.day = day + 1; E.missed = 0; if (p) tell(p, 'Você faltou à própria cerimônia! Ela foi adiada para amanhã às 17h. Faltar de novo acaba o noivado.'); if (E.kind === 'player' && R.eng[E.partner]) { R.eng[E.partner].tries = E.tries; R.eng[E.partner].day = E.day; } }
      else { delete R.eng[key]; if (E.kind === 'npc') { delete R.taken[E.who.id]; const back = Math.round(E.dote * MR.refundFail), hid = mrHidOf(E.who.id); const BK = bankLoad(), A = BK.acc[key] || (BK.acc[key] = { g: 0, loan: 0, due: 0, wk: day }); A.g += back; bankSave(); if (p) { if (hid === 'crown') crownFavor(p, MR.failFavor, 'faltou ao casamento real'); else hFavor(p, hid, MR.failFavor, 'faltou ao próprio casamento'); tell(p, 'O prazo acabou sem a cerimônia: o noivado terminou. Metade do dote (' + back + ') voltou para o banco.'); } hNews('O noivado de ' + (p ? p.name : 'um aventureiro') + ' com ' + E.who.n + ' acabou: o casamento nunca aconteceu.'); }
        else { delete R.eng[E.partner]; if (p) tell(p, 'O noivado acabou: a cerimônia não aconteceu duas vezes.'); } } estateSave(); } } }
/* começar a cerimônia: o jogador pede à Irmã Lúmina, na Catedral, quando quiser (até o prazo) */
function mrEngSend(key) { const p = Object.values(S.players).find(o => estOwner(o) === key), E = mrRec().eng[key]; if (p) Net.toOne(p.id, { t: 'mreng', on: E ? 1 : 0, who: E ? (E.kind === 'npc' ? E.who.n : E.pname) : '', until: E ? E.until : 0, st: E && E.st ? 1 : 0 }); }
function mrStart(p) { const k = estOwner(p), R = mrRec(), E = R.eng[k], pr = S.npcs.priest; if (!E) { tell(p, 'Você não está noivo.'); return; } if (E.st) { tell(p, 'A cerimônia já começou.'); return; }
  if (!pr || dist(pr.x, pr.y, p.x, p.y) > 4 || !mrInTemple0(p)) { tell(p, 'Peça à Irmã Lúmina, dentro da Catedral.'); return; }
  if (E.kind === 'player') { const q = Object.values(S.players).find(o => estOwner(o) === E.partner), E2 = R.eng[E.partner]; if (!q || !E2) { tell(p, E.pname + ' precisa estar no reino.'); return; } E2.st = now_(); E2.g0 = E2.st; Net.toOne(q.id, { t: 'mrfx', txt: p.name + ' começou a cerimônia: vá à Catedral da Aurora agora.' }); tell(q, p.name + ' começou a cerimônia: vá à Catedral da Aurora agora.'); }
  E.st = now_(); E.g0 = E.st; estateSave(); mrEngSend(k); sys('💒 Na Catedral da Aurora começa o casamento de ' + p.name + ' com ' + (E.kind === 'npc' ? E.who.n : E.pname) + '.');
  tell(p, 'A cerimônia começou: espere no altar. Os convidados vão chegando e ' + (E.kind === 'npc' ? E.who.n.split(' (')[0] : E.pname) + ' chega por último; os votos saem em cerca de 2 minutos.'); }
function mrInTemple0(p) { const bi = templeBi(); return bi >= 0 && WORLD.bld[tileAt(p.x, p.y)] === bi && !(p.fl || 0); }
/* casamento entre jogadores: quem tem casa própria recebe o outro como vassalo e herdeiro preferido */
function mrJoinHouse(k1, k2) { if (typeof phMine !== 'function') return; for (const [a, b] of [[k1, k2], [k2, k1]]) { const h = phMine(a); if (!h || phMine(b)) continue; hRec().vow[b] = h.id; h.heir = b; if (typeof rkHouse === 'function' && rkHouse() && rkHouse().id === h.id) rkRec().heir = b; phRec().names[b] = phRec().names[b] || b.split('|')[0]; } estateSave(); }
/* ---- o cônjuge NPC: rotina, humor, acompanhar ---- */
function mrSpouseId(key) { return 'mr_' + key.replace(/[^a-z0-9]/gi, '_'); }
function mrPost(M, key, p) { const h = empHour(), home = mrHomeSpot(M, key); if (!home) return null;
  if (M.follow && (!p || h >= 22 || h < 6)) { M.follow = 0; if (p) tell(p, (M.who ? M.who.n.split(' (')[0] : 'Seu cônjuge') + ' foi para casa dormir.'); }   /* segue até ser dispensado, sair do jogo ou a noite chegar */
  if (M.follow && p) return { x: p.x - 1, y: p.y + 0.6, fl: p.fl || 0, bi: p.fb, follow: 1 };
  if (h >= 10 && h < 12) { const [x, y] = csMarketPt(3, 1); return { x: x + 1, y, fl: 0, bi: -1 }; }
  if (h >= 7 && h < 9 && (estDay() % 2 === 0)) { const [x, y] = csTemplePt(5); return { x, y, fl: 0, bi: -1 }; }
  if (h >= 15 && h < 17 && M.home !== 'fam' && M.who) { const hid = mrHidOf(M.who.id), b = hid !== 'crown' && hSeatB(hid); if (b) { const [x, y] = seatPt(b, 0, 2.6, 5.4); return { x, y, fl: 0, bi: BUILDINGS.indexOf(b) }; } }
  return home; }
function mrSpouses(dt) { const R = mrRec();
  for (const key of Object.keys(R.m)) { const M = R.m[key]; if (M.kind !== 'npc' || M.dead) continue; const id = mrSpouseId(key), p = Object.values(S.players).find(o => estOwner(o) === key), T = mrPost(M, key, p); let n = S.npcs[id]; if (!T) continue;
    if (!n) { n = { id, kind: M.who.kind, name: M.who.n.replace(/ \(viúvo\)$/, ''), transient: true, court: 'spouse', mrKey: key, x: T.x, y: T.y, z: 0, fl: T.fl, fb: T.fl ? T.bi : -1, hp: 250, maxHp: 250, downed: null, dead: false, dir: 0 }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); continue; }
    { const parts = M.who.id.split(':'); if (parts[0] === 'h' && (parts[2] === 'heir' || parts[2] === 'lord')) for (const o of Object.values(S.npcs)) if (o.court === 'house' && o.house === parts[1] && o.hrole === parts[2]) visGone(o); }   /* o posto antigo no casarão fica vago */
    if (n.dead || n.downed) continue; const d = dist(n.x, n.y, T.x, T.y);
    if ((n.fl || 0) !== T.fl || d > (T.follow ? 8 : 14)) { n.x = T.x; n.y = T.y; n.fl = T.fl; n.fb = T.fl ? T.bi : -1; n.walk = false; continue; }
    if (d > 0.3) { const s = Math.min(d, (T.follow ? 2.6 : 1.3) * dt); n.x += (T.x - n.x) / d * s; n.y += (T.y - n.y) / d * s; n.dir = dirFromVecS(T.x - n.x, T.y - n.y); n.walk = true; } else n.walk = false;
    if (p && dist(p.x, p.y, n.x, n.y) < 4 && (p.fl || 0) === (n.fl || 0)) M.seen = estDay(); } }
/* esconde o NPC original de quem casou (ele passa a ser o cônjuge que vive com o jogador) */
if (typeof hPost === 'function') { const _hpM = hPost; hPost = function (def, n) { try { if (S.estate && (n.hrole === 'heir' || n.hrole === 'lord') && mrRec().taken['h:' + n.house + ':' + n.hrole] && mrRec().m[mrRec().taken['h:' + n.house + ':' + n.hrole]]) return null; } catch (e) { } return _hpM(def, n); }; }
if (typeof courtSpawn === 'function') { const _csM = courtSpawn; courtSpawn = function (def) { try { if (S.estate && ((def.id === 'k_prince' && mrRec().m[mrRec().taken['r:alaric']]) || (def.id === 'k_princess' && mrRec().m[mrRec().taken['r:lyra']]))) { const o = S.npcs[def.id]; if (o) visGone(o); return null; } } catch (e) { } return _csM(def); }; }
if (typeof lnNpcs === 'function') { const _lnM = lnNpcs; lnNpcs = function (dt) { _lnM(dt); try { const L = lnRec(); for (const hid of Object.keys(L.kids)) for (const k of (L.kids[hid] || [])) if (k.wed) { const n = S.npcs[(hid === 'crown' ? 'rk_' : 'hk_' + hid + '_') + k.id]; if (n) visGone(n); } } catch (e) { } }; }
/* ---- filhos: dormir na mesma casa ---- */
function mrNights() { const R = mrRec(), h = empHour(); if (!(h >= 21 || h < 5)) return;
  for (const key of Object.keys(R.m)) { const M = R.m[key]; if (M.night === estDay() || (M.births | 0) >= MR.maxKids || M.preg) continue; const p = Object.values(S.players).find(o => estOwner(o) === key); if (!p || p.sleep == null) continue; const B = BEDS[p.sleep]; if (!B) continue; let together = false, other = null;
    if (M.kind === 'npc') { const T = mrHomeSpot(M, key), n = S.npcs[mrSpouseId(key)]; together = !!(T && n && T.bi === B.bi && !M.follow); }
    else { other = Object.values(S.players).find(o => estOwner(o) === M.partner); const B2 = other && other.sleep != null ? BEDS[other.sleep] : null; together = !!(B2 && B2.bi === B.bi); }
    if (!together) continue; M.night = estDay(); if (other) { const M2 = R.m[M.partner]; if (M2) M2.night = estDay(); }
    const nm = M.kind === 'npc' ? M.who.n.split(' (')[0] : (other ? other.name : ''); for (const o of [p, other]) if (o) Net.toOne(o.id, { t: 'mrfade', who: o === p ? nm : p.name, ms: 5000 });
    M.mood = Math.min(100, (M.mood || MR.mood0) + 5); if (Math.random() < MR.birth) { M.preg = estDay() + MR.pregDays; if (other && R.m[M.partner]) R.m[M.partner].preg = M.preg; } estateSave(); } }
function mrBirths() { const R = mrRec(), day = estDay();
  for (const key of Object.keys(R.m)) { const M = R.m[key]; if (!M.preg || day < M.preg) continue; M.preg = 0; M.births = (M.births | 0) + 1; const p = Object.values(S.players).find(o => estOwner(o) === key), g = Math.random() < 0.5 ? 'm' : 'f', A = g === 'm' ? LN_M : LN_F;
    const sur = M.kind === 'npc' ? lnSur(mrHidOf(M.who.id)) : String(key.split('|')[0]).replace(/^./, c => c.toUpperCase()), kid = { n: A[Math.floor(Math.random() * A.length)] + ' ' + sur, g, a0: ageNow(0) }; M.kids.push(kid);
    if (M.kind === 'player') { const M2 = R.m[M.partner]; if (M2 && !M2.kids.some(k => k.n === kid.n)) { M2.kids.push(kid); M2.births = M.births; M2.preg = 0; } }
    sys('👶 Nasceu ' + kid.n + ', ' + (g === 'm' ? 'filho' : 'filha') + ' de ' + (p ? p.name : 'um aventureiro') + '.'); hNews('Nasceu ' + kid.n + ', ' + (g === 'm' ? 'filho' : 'filha') + ' de ' + (p ? p.name : 'um aventureiro') + (M.kind === 'npc' ? ' e ' + M.who.n.split(' (')[0] : '') + '.'); estateSave(); } }
function mrKidNpcs() { const R = mrRec(); for (const key of Object.keys(R.m)) { const M = R.m[key]; if (!M.kids || !M.kids.length) continue; const home = M.kind === 'npc' ? mrHomeSpot(M, key) : null; M.kids.forEach((k, i) => { const id = 'mk_' + key.replace(/[^a-z0-9]/gi, '_') + '_' + i, adult = ageOf(k.a0) >= 20, kind = adult ? 'mr_young' : 'mr_child'; let n = S.npcs[id]; if (!home) { if (n) visGone(n); return; } if (n && n.kind !== kind) { visGone(n); n = null; }
    if (!n) { n = { id, kind, name: k.n + (adult ? '' : ' (' + ageOf(k.a0) + ' anos)'), transient: true, court: 'mrkid', x: home.x + 0.8 + i * 0.6, y: home.y + 0.4, z: 0, fl: home.fl, fb: home.fl ? home.bi : -1, hp: 150, maxHp: 150, downed: null, dead: false, dir: 0 }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); } }); } }
/* ---- humor ---- */
function mrDaily() { const R = mrRec(); for (const key of Object.keys(R.m)) { const M = R.m[key]; if (M.kind !== 'npc') continue; M.mood = Math.max(0, Math.min(100, (M.mood || MR.mood0) + (M.seen >= estDay() - 1 ? 3 : -6))); } estateSave(); }
function mrMoodWord(v) { return v >= 80 ? 'apaixonado' : v >= 60 ? 'feliz' : v >= 40 ? 'distante' : v >= 20 ? 'magoado' : 'furioso'; }
function mrSpouseMenu(p, n) { const key = n.mrKey, M = mrOf(key); if (!M || estOwner(p) !== key) { empSay(n, 'Sou casado, sabia?'); return; }
  const lines = { apaixonado: 'Senti a sua falta. Fica um pouco?', feliz: 'Que bom te ver.', distante: 'Você quase não aparece em casa.', magoado: 'Lembra que tem família?', furioso: 'Nem sei por que ainda espero você.' };
  Net.toOne(p.id, { t: 'mrmenu', id: n.id, name: n.name, mood: Math.round(M.mood), word: mrMoodWord(M.mood), line: lines[mrMoodWord(M.mood)], follow: M.follow ? 1 : 0, homes: mrHomes(p), cur: M.home, gift: MR.gift, kids: (M.kids || []).map(k => k.n + ' (' + ageOf(k.a0) + ')') }); }
function mrMsg(p, m) { const k = estOwner(p), M = mrOf(k);
  if (m.a === 'cands') { const hid = m.h === 'crown' ? 'crown' : m.h; Net.toOne(p.id, { t: 'mrcands', h: hid, n: hid === 'crown' ? 'a família real' : HOUSE_BY[hid].n, list: mrCandidates(hid).map(c => ({ id: c.id, n: c.n, dote: MR.dote[c.tier] })), gold: p.gold | 0, step: MR.step }); return; }
  if (m.a === 'propose') { const hid = mrHidOf(String(m.c || '')); if (hid === 'crown') { const pr = presider(); if (!(S.audCall && S.audCall.id === p.id && pr && dist(pr.x, pr.y, p.x, p.y) < 3.5)) { tell(p, 'Peça ao rei na audiência (fila do arauto, das 8h às 12h).'); return; } } else { const lord = Object.values(S.npcs).find(n => n.court === 'house' && n.house === hid && n.hrole === 'lord'); if (!lord || dist(lord.x, lord.y, p.x, p.y) > 3.5) { tell(p, 'Fale com quem governa a casa.'); return; } } mrPropose(p, m); return; }
  if (m.a === 'start') { mrStart(p); return; } if (m.a === 'engq') { mrEngSend(estOwner(p)); return; }
  if (m.a === 'askp') { mrPropPlayer(p, m); return; } if (m.a === 'answer') { mrAnswer(p, m); return; }
  if (!M) return; const n = S.npcs[mrSpouseId(k)];
  if (m.a === 'home') { const H = mrHomes(p).concat(M.kind === 'player' ? (() => { const q = Object.values(S.players).find(o => estOwner(o) === M.partner); return q ? mrHomes(q) : []; })() : []); if (!H.some(x => x.id === m.home)) return; M.home = m.home; if (M.kind === 'player' && mrRec().m[M.partner]) mrRec().m[M.partner].home = m.home; estateSave(); if (n) empSay(n, 'Combinado, vou para lá.'); tell(p, 'Agora vocês moram em: ' + H.find(x => x.id === m.home).n + '.'); return; }
  if (!n || dist(n.x, n.y, p.x, p.y) > 3.5) { tell(p, 'Chegue mais perto.'); return; }
  if (m.a === 'follow') { M.follow = M.follow ? 0 : 1; empSay(n, M.follow ? 'Vou com você.' : 'Vou para casa, então.'); estateSave(); }
  else if (m.a === 'gift') { if ((p.gold || 0) < MR.gift) { tell(p, 'Um presente custa ' + MR.gift + ' de ouro.'); return; } p.gold -= MR.gift; sendStat(p); M.mood = Math.min(100, (M.mood || MR.mood0) + 10); M.lastGift = estDay(); empSay(n, ['Para mim? Você lembrou!', 'É lindo. Obrigado.', 'Você sabe me agradar.'][Math.floor(Math.random() * 3)]); estateSave(); }
  mrSpouseMenu(p, n); }
if (typeof houseMsg === 'function') { const _hmM = houseMsg; houseMsg = function (p, m) { const n = m && m.id && S.npcs[m.id]; if (n && n.court === 'spouse') { if (dist(n.x, n.y, p.x, p.y) <= 3) mrSpouseMenu(p, n); return; } return _hmM(p, m); }; }
if (typeof courtMsg === 'function') { const _cmM = courtMsg; courtMsg = function (p, m) { const n = m && m.id && S.npcs[m.id]; if (n && n.court === 'spouse') { if (dist(n.x, n.y, p.x, p.y) <= 3) mrSpouseMenu(p, n); return; } return _cmM(p, m); }; }
/* ---- a linha de sucessão: o jogador casado com a família real fica logo atrás do cônjuge (pela casa dele, se tiver) ---- */
if (typeof sucLine === 'function') { const _slM = sucLine; sucLine = function () { const L = _slM(); try { if (!S.estate) return L; const R = mrRec(); for (const key of Object.keys(R.m)) { const M = R.m[key]; if (M.kind !== 'npc' || !M.who.id.startsWith('r:')) continue; const sk = M.who.id === 'r:alaric' ? 'alaric' : M.who.id === 'r:lyra' ? 'lyra' : 'rk:' + M.who.id.split(':').pop(), h = typeof phMine === 'function' ? phMine(key) : null; if (!h) continue; const hk = 'h:' + h.id, i = L.indexOf(sk); if (i < 0 || !L.includes(hk)) continue; L.splice(L.indexOf(hk), 1); L.splice(L.indexOf(sk) + 1, 0, hk); } } catch (e) { } return L; }; }
/* ---- tick ---- */
function mrTick(now) { if (!S.estate || now - (S.mrT || 0) < 400) return; const dt = Math.min(0.5, (now - (S.mrT || now)) / 1000) || 0.4; S.mrT = now; const R = mrRec();
  if (R.day !== estDay()) { const first = !R.day; R.day = estDay(); if (!first) mrDaily(); }
  mrCeremony(now); mrSpouses(dt); mrNights(); mrBirths(); mrKidNpcs(); }
if (typeof housesTick === 'function') { const _htM = housesTick; housesTick = function (now) { _htM(now); mrTick(now); }; }
/* a aba Casas mostra o casamento do jogador */
if (typeof housePublic === 'function') { const _hpM2 = housePublic; housePublic = function (p) { const o = _hpM2(p); try { const M = mrOf(estOwner(p)), E = mrRec().eng[estOwner(p)]; o.mar = M ? { n: M.kind === 'npc' ? M.who.n : M.partner.split('|')[0], mood: M.kind === 'npc' ? mrMoodWord(M.mood) : null, kids: (M.kids || []).map(k => k.n + ' (' + ageOf(k.a0) + ')') } : E ? { eng: E.kind === 'npc' ? E.who.n : E.pname } : null; } catch (e) { } return o; }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function' && typeof tone === 'function') {
  NPC_LOOKS.mr_child = () => Object.assign(heroLook('archer', 'scout', '#6a5a4a'), { armor: 'vest', body: tone('#7a6a52'), body2: tone('#4a5a6a'), head: 'none', hair: tone('#6a4a2a'), hairStyle: 'short', beard: null, weapon: null, quiver: false });
  NPC_LOOKS.mr_young = () => Object.assign(heroLook('knight', 'iron', '#5a6a7a'), { armor: 'leather', body: tone('#5a6a7a'), head: 'none', hair: tone('#6a4a2a'), hairStyle: 'short', beard: null, weapon: 'sword', shield: null });
  if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { mr_child: 'archer', mr_young: 'knight' }); if (typeof NPC_SCALE !== 'undefined') NPC_SCALE.mr_child = 0.6; }
function mrCandsPanel(m) { if (typeof velPanel !== 'function') return; let sel = m.list[0] && m.list[0].id, extra = 0;
  const html = m.list.length ? '<div class="est-cost">' + (m.h === 'crown' ? 'O rei ouve o pedido. Quem você quer?' : 'O lorde ouve o pedido. Quem você quer?') + '</div><div class="vel-vs">' + m.list.map((c, i) => '<button class="est-btn ghost" data-c="' + c.id + '" data-d="' + c.dote + '"' + (i === 0 ? ' style="outline:2px solid #c9a24a"' : '') + '>' + c.n + '<small> · dote ' + c.dote + '</small></button>').join('') + '</div><div class="est-cost">Dote a mais aumenta a chance (50% + 10% a cada ' + m.step + '):</div><div class="vel-amt" style="grid-template-columns:repeat(3,1fr)">' + [0, 1, 2].map(i => '<button class="est-btn" data-x="' + i + '">' + (i ? '+' + i * m.step : 'Dote base') + '<small> · ' + (50 + i * 10) + '% de chance</small></button>').join('') + '</div><div class="tq-btns"><button class="est-btn" data-go>Pedir a mão</button></div>' : '<div class="est-cost">Ninguém dessa família está livre para casar agora.</div>';
  const d = velPanel('Pedir a mão · ' + m.n, html); d.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { sel = b.dataset.c; d.querySelectorAll('[data-c]').forEach(o => o.style.outline = o === b ? '2px solid #c9a24a' : ''); });
  d.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { extra = +b.dataset.x; d.querySelectorAll('[data-x]').forEach(o => o.style.outline = o === b ? '2px solid #c9a24a' : ''); });
  const go = d.querySelector('[data-go]'); if (go) go.onclick = () => { const c = m.list.find(x => x.id === sel); if (!c) return; if (!go.dataset.sure) { go.dataset.sure = 1; go.innerHTML = 'Confirmar: ' + (c.dote + extra * m.step) + ' de ouro de dote?'; return; } d.remove(); Net.send({ t: 'casar', a: 'propose', c: sel, dote: c.dote + extra * m.step }); }; }
function mrMenuPanel(m) { if (typeof velPanel !== 'function') return; const homeSel = '<div class="vel-sub">Onde vocês moram</div><div class="vel-vs">' + (m.homes || []).map(h => '<button class="est-btn ghost" data-home="' + h.id + '"' + (h.id === m.cur ? ' style="outline:2px solid #c9a24a"' : '') + '>' + h.n + '</button>').join('') + '</div>';
  if (m.home && !m.id) { const d = velPanel('Recém-casados!', '<div class="est-cost">Escolha onde vocês vão morar (dá para mudar depois, falando com o cônjuge).</div>' + homeSel); d.querySelectorAll('[data-home]').forEach(b => b.onclick = () => { d.remove(); Net.send({ t: 'casar', a: 'home', home: b.dataset.home }); }); return; }
  const d = velPanel(m.name, '<div class="est-cost">“' + m.line + '”<br><small>Humor: ' + m.word + ' (' + m.mood + ')' + (m.kids && m.kids.length ? ' · filhos: ' + m.kids.join(', ') : '') + '</small></div><div class="tq-btns"><button class="est-btn" data-f>' + (m.follow ? 'Pode ir para casa' : 'Vem comigo um pouco') + '</button><button class="est-btn ghost" data-g>Dar um presente<small>' + m.gift + ' de ouro</small></button></div>' + homeSel);
  d.querySelector('[data-f]').onclick = () => Net.send({ t: 'casar', a: 'follow' }); d.querySelector('[data-g]').onclick = () => Net.send({ t: 'casar', a: 'gift' }); d.querySelectorAll('[data-home]').forEach(b => b.onclick = () => Net.send({ t: 'casar', a: 'home', home: b.dataset.home })); }
function mrFade(m) { const d0 = $('tequip'); if (d0) d0.remove(); let o = $('vel-fade'); if (o) o.remove(); o = document.createElement('div'); o.id = 'vel-fade'; o.innerHTML = '<div>A noite é só de vocês.<br><small>' + m.who + ' apaga a vela.</small></div>'; document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on')); setTimeout(() => { o.classList.remove('on'); setTimeout(() => o.remove(), 900); }, m.ms || 5000); }
/* pedir um jogador em casamento: F perto de outro jogador, sem NPC por perto */
function mrPlayerNear() { const me = G.me; if (!me) return null; for (const id in G.npcs) { const e = G.npcs[id]; if (!e.dead && (e.fl || 0) === (me.fl || 0) && Math.hypot(e.rx - me.x, e.ry - me.y) < 2.4) return null; } let best = null, bd = 1.8; for (const id in G.players) { const q = G.players[id]; if (q === G.me || q.isNpc || (q.fl || 0) !== (me.fl || 0)) continue; const d = Math.hypot(q.rx - me.x, q.ry - me.y); if (d < bd) { bd = d; best = q; } } return best; }
if (typeof csHint === 'function') { const _chM = csHint; csHint = function () { const h = _chM(); if (h) return h; const q = mrPlayerNear(); return q ? 'F: falar com ' + q.name : ''; }; }
if (typeof csF === 'function') { const _cfM = csF; csF = function () { if (_cfM()) return true; const q = mrPlayerNear(); if (!q) return false; const d = velPanel(q.name, '<div class="tq-btns"><button class="est-btn" data-p>💍 Pedir ' + q.name + ' em casamento</button></div>'); d.querySelector('[data-p]').onclick = () => { d.remove(); Net.send({ t: 'casar', a: 'askp', to: q.id }); }; return true; }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peM = progEvent; progEvent = function (m, now) {
  if (m.t === 'mrcands') { mrCandsPanel(m); return true; } if (m.t === 'mrmenu') { mrMenuPanel(m); return true; } if (m.t === 'mrfade') { mrFade(m); return true; }
  if (m.t === 'mrask') { const d = velPanel('Pedido de casamento', '<div class="est-cost">' + m.name + ' pediu você em casamento. Depois, qualquer um dos dois pede à Irmã Lúmina para começar a cerimônia, na Catedral, em até ' + MR.limit + ' dias.</div><div class="tq-btns"><button class="est-btn" data-y>Aceito</button><button class="est-btn ghost" data-n>Recusar</button></div>'); d.querySelector('[data-y]').onclick = () => { d.remove(); Net.send({ t: 'casar', a: 'answer', yes: 1 }); }; d.querySelector('[data-n]').onclick = () => { d.remove(); Net.send({ t: 'casar', a: 'answer', yes: 0 }); }; return true; }
  const r = _peM(m, now);
  if (m.t === 'housemenu' && m.role === 'lord') { const d = document.getElementById('housemenu'); if (d) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">💍</span><span><b>Pedir a mão de alguém da família</b><br><small>Favor ' + MR.favor + ' com a casa; dote de ' + MR.dote.kid + ' (filho mais novo) ou ' + MR.dote.heir + ' (herdeiro).</small></span>'; bt.onclick = () => { d.remove(); Net.send({ t: 'casar', a: 'cands', h: m.house }); }; d.appendChild(bt); } }
  if (m.t === 'courtmenu' && (m.id === 'k_king' || m.id === 'k_hand') && m.s && m.s.called) { const d = document.getElementById('courtmenu'); if (d) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">💍</span><span><b>Pedir a mão de alguém da família real</b><br><small>Favor da coroa ' + MR.crownFavor + '; dote de ' + MR.dote.royal + '.</small></span>'; bt.onclick = () => { d.remove(); Net.send({ t: 'casar', a: 'cands', h: 'crown' }); }; d.appendChild(bt); } }
  return r; }; }
if (typeof gmHousesDraw === 'function') { const _ghM = gmHousesDraw; gmHousesDraw = function () { _ghM(); try { const D = G.houses || {}, pane = typeof gmPane === 'function' ? gmPane('houses') : null; if (!pane || !D.mar || pane.querySelector('[data-mar]')) return; const el = document.createElement('div'); el.dataset.mar = 1; el.style.cssText = 'padding:4px 4px 10px;font-size:13px';
  el.innerHTML = D.mar.eng ? '💍 Noivo de <b>' + D.mar.eng + '</b>: a cerimônia é às 17h, na Catedral.' : '💍 Casado com <b>' + D.mar.n + '</b>' + (D.mar.mood ? ' (' + D.mar.mood + ')' : '') + (D.mar.kids.length ? ' · filhos: ' + D.mar.kids.join(', ') : '') + '.'; pane.insertBefore(el, pane.children[1] || null); } catch (e) { } }; }
/* noivado: a Irmã Lúmina oferece começar a cerimônia */
if (typeof empWelcome === 'function') { const _ewMr = empWelcome; empWelcome = function (to) { _ewMr(to); try { const p = S.players[to]; if (S.estate && p && mrRec().eng[estOwner(p)]) mrEngSend(estOwner(p)); } catch (e) { } }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peMr2 = progEvent; progEvent = function (m, now) { if (m.t === 'mreng') { G.mrEng = m.on ? m : null; return true; } if (m.t === 'mrfx') return true; return _peMr2(m, now); }; }
if (typeof buildDialogOptions === 'function' && typeof G !== 'undefined') { const _bdMr = buildDialogOptions; buildDialogOptions = function (id) { const r = _bdMr.apply(this, arguments); try { const e = G.npcs[id], box = $('dlg-opts'); if (e && box && e.kind === 'priest' && G.mrEng && !G.mrEng.st) { const b = document.createElement('button'); b.textContent = '💍 Começar a cerimônia do meu casamento (com ' + G.mrEng.who + ')'; b.onclick = () => { closeDialog(); Net.send({ t: 'casar', a: 'start' }); }; box.prepend(b); } } catch (er) { } return r; }; }
