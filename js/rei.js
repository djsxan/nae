// ============================================================
//  O JOGADOR REI (parte I): quando a linha de sangue chega a uma casa de jogador, o dono dela é o rei.
//  Das 8h às 12h, no trono, governa por um painel: impostos (0–30% sobre aluguéis e negócios, para o
//  tesouro, de onde o rei saca), três casos do dia tirados do estado do mundo, justiça (perdoar,
//  declarar procurado, prender no calabouço), títulos, cargos da corte, herdeiro e abdicação.
//  Fora disso, ou ausente, a Mão governa: os casos sem resposta ao meio-dia a Mão nega, e o povo
//  comenta. Acima de 15% de imposto a legitimidade cai; abaixo de 5% o tesouro não paga os salários.
//  Perde a coroa como um rei NPC: a idade, as tramas e a rebelião; ou abdica. Herança: o herdeiro
//  escolhido; senão o vassalo de mais favor; senão o próximo da linha.
// ============================================================
const RK = { tax0: 10, taxMax: 30, taxHigh: 15, taxLow: 5, tr0: 1000, cityPer: 15, wages: 100, draw: 500, hours: [8, 12], cases: 3, unanswered: 1, jailMs: 300000, wantedMs: 600000, heirAge: 30 };

// ---------------- SERVIDOR ----------------
function rkRec() { const C = crownRec(); if (!C.rk) C.rk = { tax: RK.tax0, tr: RK.tr0, day: 0, cases: [], cday: 0, closed: 0, heir: null, log: [] }; return C.rk; }
function rkHouse() { if (!S.estate) return null; const U = sucRec(); return U.king && U.king.startsWith('h:') && PH_BY[U.king.slice(2)] ? PH_BY[U.king.slice(2)] : null; }
function rkPlayer() { const h = rkHouse(); return h ? Object.values(S.players).find(p => estOwner(p) === h.owner) || null : null; }
function rkIsKing(p) { const h = rkHouse(); return !!(h && p && estOwner(p) === h.owner); }
function rkLegitHit(n, why) { const h = rkHouse(); if (!h) return; const s = hRec().st[h.id]; if (s) s.prestige = clampH(s.prestige - n, 0, 100); if (typeof infAdd === 'function') for (const pl of INF_PLACES) infAdd(h.id, pl.id, -n); if (why) { const k = rkPlayer(); if (k) tell(k, 'A sua legitimidade caiu: ' + why + '.'); } }
function rkLegitUp(n, pl) { const h = rkHouse(); if (!h || typeof infAdd !== 'function') return; infAdd(h.id, pl || 'plaza', n); }
function rkTr(v) { const R = rkRec(); if (R.tr < v) return false; R.tr -= v; return true; }
function rkOpen() { const h = empHour(); return h >= RK.hours[0] && h < RK.hours[1]; }
function rkAtThrone(p) { const s = throneSeat(); return !!(s && !(p.fl || 0) && dist(p.x, p.y, s.x, s.y) < 3.2); }
/* impostos do dia: aluguéis pagos por jogadores e o faturamento dos negócios deles; a cidade NPC paga a parte dela */
function rkTaxDay() { const R = rkRec(), E = estateLoad(), t = R.tax / 100, h = rkHouse(), per = {}; let got = 0;
  for (const pid in E.r) { const r = E.r[pid], P = PROPS_BY[pid]; if (!P || r.owner === h.owner) continue; let base = 0; if (r.mode !== 'own') base += P.rent || 0; if (r.biz && r.biz.hist && r.biz.hist.length) base += Math.max(0, r.biz.hist[r.biz.hist.length - 1].rev || 0); const v = Math.floor(base * t); if (v > 0) (per[r.owner] = per[r.owner] || []).push([v, r]); }
  for (const key in per) { const q = Object.values(S.players).find(o => estOwner(o) === key) || null; let paid = 0; for (const [v, r] of per[key]) { if (debit(key, q, v, r.biz)) paid += v; } if (paid) { got += paid; if (q) { tell(q, 'Impostos do rei (' + R.tax + '%): −' + paid + ' de ouro dos seus aluguéis e negócios.'); sendStat(q); } } }
  const city = Math.round(R.tax * RK.cityPer); R.tr += got + city - RK.wages; R.log.unshift([estDay(), got + city, RK.wages]); R.log.length = Math.min(R.log.length, 7);
  if (R.tr < 0) { R.tr = 0; rkLegitHit(2, 'o tesouro não pagou os salários da corte e da guarda'); hNews('O tesouro real está vazio: a guarda e a corte ficaram sem salário.'); }
  if (R.tax > RK.taxHigh) rkLegitHit(1, 'impostos acima de ' + RK.taxHigh + '%'); }
/* os casos do dia, tirados do estado do mundo */
function rkMakeCases() { const H = hRec(), U = sucRec(), L = [], R = rkRec(), kh = rkHouse(); const npcH = HOUSES.filter(h => U.king !== 'h:' + h.id);
  const poor = npcH.slice().sort((a, b) => H.st[a.id].gold - H.st[b.id].gold)[0]; if (poor && H.st[poor.id].gold < 40) L.push({ k: 'debt', h: poor.id, who: poor.lord, t: 'A ' + poor.n + ' está endividada e pede um empréstimo da coroa.', o: [['Emprestar 400 do tesouro', 400], ['Negar']], def: 1 });
  let feud = null; for (const a of npcH) for (const b of npcH) if (a.id < b.id && ((H.st[a.id].rel || {})[b.id] || 0) <= -20 && !feud) feud = [a, b]; if (feud) L.push({ k: 'feud', a: feud[0].id, b: feud[1].id, who: feud[0].lord, t: 'A ' + feud[0].n + ' e a ' + feud[1].n + ' brigam por terras e pedem o seu julgamento.', o: [['Dar razão à ' + feud[0].n], ['Dar razão à ' + feud[1].n], ['Mandar que façam as pazes']], def: 2 });
  if (U.corwynIn && U.alive.corwyn && U.king !== 'corwyn') L.push({ k: 'corwyn', who: 'Lorde Corwyn Aurenfell', t: 'Lorde Corwyn Aurenfell, o irmão exilado do velho rei, pede perdão e um lugar na corte.', o: [['Perdoar: ele para de comprar apoio'], ['Exilar de novo']], def: 0 });
  const thief = Object.values(S.players).find(p => p.wanted > now_() && !rkIsKing(p)); if (thief) L.push({ k: 'thief', pid: thief.id, pn: thief.name, who: 'Um mercador da praça', t: 'Um mercador acusa ' + thief.name + ' de crimes na cidade e pede justiça.', o: [['Dobrar a caçada: procurado por mais 10 min'], ['Perdoar ' + thief.name]], def: 0 });
  else L.push({ k: 'robbed', who: 'Um mercador da praça', t: 'Um mercador foi roubado por bandidos na estrada do oeste e pede que a guarda vá atrás deles.', o: [['Mandar a guarda (150 do tesouro)', 150], ['Negar']], def: 1 });
  const pris = Object.values(S.players).find(p => p.kjail); if (pris) L.push({ k: 'pris', pid: pris.id, pn: pris.name, who: 'Grum, o carcereiro', t: 'Grum pergunta o que fazer com ' + pris.name + ', preso no calabouço.', o: [['Soltar ' + pris.name], ['Manter preso']], def: 1 });
  L.push({ k: 'faith', who: 'Irmã Lúmina', t: 'A Irmã Lúmina pede ouro para consertar o telhado da Catedral da Aurora.', o: [['Doar 300 do tesouro', 300], ['Negar']], def: 1 });
  if (R.tax > RK.taxHigh) L.push({ k: 'tax', who: 'A guilda dos mercadores', t: 'A guilda dos mercadores pede que o rei baixe os impostos de ' + R.tax + '%.', o: [['Baixar para 10%'], ['Manter']], def: 1 });
  L.push({ k: 'harvest', who: 'Os camponeses da Vila do Oeste', t: 'Os camponeses da Vila do Oeste perderam a colheita para a geada e pedem ajuda.', o: [['Mandar 200 do tesouro', 200], ['Negar']], def: 1 });
  const pri = { corwyn: 0, debt: 1, feud: 2, thief: 3, pris: 4, tax: 5, robbed: 6, faith: 7, harvest: 8 }; L.sort((a, b) => (pri[a.k] - pri[b.k]) + (Math.random() - 0.5) * 3); return L.slice(0, RK.cases).map((c, i) => Object.assign(c, { i, done: null })); }
function rkResolve(c, o, byHand) { const H = hRec(), U = sucRec(), opt = c.o[o]; if (!opt || c.done != null) return 'Esse caso já foi decidido.'; if (opt[1] && !rkTr(opt[1])) return 'O tesouro não tem ' + opt[1] + ' de ouro.';
  const st = id => H.st[id], kn = sucKingName();
  if (c.k === 'debt') { if (o === 0) { st(c.h).gold = clampH(st(c.h).gold + 10, 0, 100); st(c.h).crown = clampH(st(c.h).crown + 10, -100, 100); hNews('O ' + kn + ' emprestou ouro à ' + HOUSE_BY[c.h].n + '.'); } else { st(c.h).crown = clampH(st(c.h).crown - 6, -100, 100); } }
  else if (c.k === 'feud') { if (o === 2) { hRel(c.a, c.b, 10); st(c.a).crown = clampH(st(c.a).crown - 2, -100, 100); st(c.b).crown = clampH(st(c.b).crown - 2, -100, 100); } else { const w = o === 0 ? c.a : c.b, l = o === 0 ? c.b : c.a; st(w).crown = clampH(st(w).crown + 8, -100, 100); st(l).crown = clampH(st(l).crown - 8, -100, 100); hRel(c.a, c.b, -5); hNews('O ' + kn + ' deu razão à ' + HOUSE_BY[w].n + ' na briga com a ' + HOUSE_BY[l].n + '.'); } }
  else if (c.k === 'corwyn') { if (o === 0) { U.buy = 0; U.corwynIn = 0; U.corwynArr = 1; const n = S.npcs.k_corwyn; if (n) visGone(n); hNews('Lorde Corwyn ajoelhou diante do ' + kn + ' e foi perdoado. Ele não compra mais apoio.'); } else { U.corwynIn = 0; U.corwynArr = 1; const n = S.npcs.k_corwyn; if (n) visGone(n); rkLegitUp(2, 'plaza'); hNews('O ' + kn + ' mandou Lorde Corwyn de volta ao exílio.'); } }
  else if (c.k === 'thief') { const q = S.players[c.pid]; if (q) { if (o === 0) { q.wanted = Math.max(q.wanted || 0, now_()) + RK.wantedMs; Net.toAll({ t: 'wanted', id: q.id, ms: q.wanted - now_() }); tell(q, 'Por ordem do ' + kn + ', a caçada a você dobrou.'); rkLegitUp(2, 'market'); } else { q.wanted = 0; q.crimes = []; Net.toAll({ t: 'wanted', id: q.id, ms: 0 }); tell(q, 'O ' + kn + ' perdoou os seus crimes.'); rkLegitUp(-2, 'market'); } } }
  else if (c.k === 'robbed') { rkLegitUp(o === 0 ? 4 : -3, 'market'); }
  else if (c.k === 'pris') { const q = S.players[c.pid]; if (q && q.kjail && o === 0) kjailFree(q, 'O ' + kn + ' mandou soltar você.'); }
  else if (c.k === 'faith') { const h = rkHouse(); if (h && typeof infFaithAdd === 'function') infFaithAdd(h.id, o === 0 ? 12 : -6); }
  else if (c.k === 'tax') { if (o === 0) { rkRec().tax = 10; rkLegitUp(3, 'market'); } else rkLegitUp(-3, 'market'); }
  else if (c.k === 'harvest') { rkLegitUp(o === 0 ? 3 : -2, 'plaza'); }
  c.done = o; c.hand = byHand ? 1 : 0; estateSave(); return null; }
function rkDaily() { rkTaxDay(); estateSave(); }
/* às 6h chegam os casos da manhã; ao meio-dia a audiência fecha */
function rkMorning() { const R = rkRec(); R.cases = rkMakeCases(); R.open = 1; estateSave(); const k = rkPlayer(); if (k) tell(k, 'Hoje há ' + R.cases.length + ' casos para a audiência real, das ' + RK.hours[0] + 'h às ' + RK.hours[1] + 'h, no trono. Tesouro: ' + R.tr + ' de ouro.'); }
/* ao meio-dia, a Mão decide o que o rei não decidiu, e o povo comenta */
function rkNoon() { const R = rkRec(); R.open = 0; let n = 0; for (const c of R.cases) if (c.done == null) { rkResolve(c, c.def, true); n++; }
  if (n) { rkLegitHit(RK.unanswered * n, n + (n > 1 ? ' pedidos ficaram' : ' pedido ficou') + ' sem a resposta do rei (a Mão decidiu)'); hNews('O povo comenta que o ' + sucKingName() + ' não ouviu ' + n + (n > 1 ? ' pedidos' : ' pedido') + ' na audiência; a Mão decidiu por ele.'); } estateSave(); }
/* fim do reinado: o herdeiro escolhido; senão o vassalo de mais favor; senão o próximo da linha */
function rkEnd(why) { const h = rkHouse(); if (!h) return; const U = sucRec(), R = rkRec(), H = hRec(), old = sucKingName(), oldKey = h.owner; let heir = (R.heir || h.heir) && (R.heir || h.heir) !== oldKey && H.vow[R.heir || h.heir] === h.id ? (R.heir || h.heir) : null;
  if (!heir) { let bv = -1; for (const k in H.vow) if (H.vow[k] === h.id && k !== oldKey) { const v = (H.favor[k] || {})[h.id] || 0; if (v > bv) { bv = v; heir = k; } } }
  R.heir = null; h.heir = null; U.stage = 'done';
  if (heir) { const nm = phRec().names[heir] || heir.split('|')[0]; h.owner = heir; h.lord = nm; H.vow[oldKey] = h.id; phReg(h); Net.toAll(phMsgAll()); sucApplyKing('h:' + h.id); U.kage0 = RK.heirAge; U.since = estDay();
    sys('👑 O reinado do ' + old + ' terminou (' + why + '). ' + nm + ', da ' + h.n + ', é o novo rei.'); hNews(nm + ' herdou a coroa e a ' + h.n + ' (' + why + ').'); const q = Object.values(S.players).find(o => estOwner(o) === heir); if (q) tell(q, 'Você herdou a ' + h.n + ' e a coroa de Nae! Das ' + RK.hours[0] + 'h às ' + RK.hours[1] + 'h, vá ao trono para governar (F).'); }
  else { const nx = sucLine().filter(k => k !== 'h:' + h.id)[0]; if (!nx) return; sucApplyKing(nx); sys('👑 O reinado do ' + old + ' terminou (' + why + '). Sem herdeiro na casa, a coroa passa a ' + sucKingName() + '.'); hNews('Sem herdeiro, a coroa saiu da ' + h.n + ' e foi para ' + sucKingName() + '.'); }
  const op = Object.values(S.players).find(o => estOwner(o) === oldKey); if (op) tell(op, 'Você não é mais o rei (' + why + ').'); estateSave(); }
function rkTick(now) { if (!S.estate || now - (S.rkT || 0) < 1000) return; S.rkT = now; const h = rkHouse(), kp = h ? rkPlayer() : null;
  const me = kp ? kp.id : null; if (S.rkMe !== me) { if (S.rkMe && S.players[S.rkMe]) Net.toOne(S.rkMe, { t: 'rkme', on: 0 }); if (me) Net.toOne(me, { t: 'rkme', on: 1, h: RK.hours }); S.rkMe = me; }
  { const hid = h ? h.id : null; if (S.rkHdSent !== hid) { S.rkHdSent = hid; Net.toAll({ t: 'rkherald', h: hid }); } }
  if (!h) return; const R = rkRec(), U = sucRec();
  if (R.day !== estDay()) { R.day = estDay(); rkDaily(); }
  { const hh = empHour(); if (!R.open && hh >= 6 && hh < RK.hours[1]) rkMorning(); else if (R.open && (hh >= RK.hours[1] || hh < 6)) rkNoon(); }
  if (U.stage === 'dying') { U.stage = 'pdying'; }   /* o rei jogador adoece, mas não morre na cama: a coroa passa adiante */
  if (U.stage === 'pdying' && now >= (U.dieAt || 0) && csIn(empHour(), SUC.deathHour)) rkEnd('a idade e a doença');
  const SG0 = typeof sgRec === 'function' ? sgRec() : null; if (SG0 && SG0.on) { if (kp) SG0.sides[estOwner(kp)] = 'd'; const inC = kp && ((kp.fl || 0) ? kp.fb === castleBi() : inKeep(Math.round(kp.x), Math.round(kp.y)));
    if (!kp || (kp.downed && inC)) { sgEnd('r', 'dead'); if (kp) tell(kp, 'Você caiu no cerco: o castelo e a coroa são dos rebeldes.'); } } }
if (typeof housesTick === 'function') { const _htR = housesTick; housesTick = function (now) { _htR(now); rkTick(now); }; }
/* sem rei NPC enquanto um jogador reina; a Mão preside as audiências dos jogadores e nunca senta no trono */
if (typeof courtSpawn === 'function') { const _csR = courtSpawn; courtSpawn = function (def) { if (def.id === 'k_king' && rkHouse()) { const o = S.npcs.k_king; if (o && !o.sgKing) visGone(o); return null; } return _csR(def); }; }
if (typeof presider === 'function') { const _prR = presider; presider = function () { if (rkHouse()) return S.npcs.k_hand; return _prR(); }; }
if (typeof courtPost === 'function') { const _cpR = courtPost; courtPost = function (def, now) { const P = _cpR(def, now); if (def.role === 'hand' && P && P[1] === 'throne' && S.estate && rkHouse()) return def.day; return P; }; }
/* a família NPC não vai para o castelo quando a coroa chega a uma casa de jogador */
if (typeof trHouseCourt === 'function') { const _thR = trHouseCourt; trHouseCourt = function (hid) { if (PH_BY[hid]) { for (const id of TR_ROYAL) { const i = COURT.findIndex(d => d.id === id); if (i >= 0) COURT.splice(i, 1); const n = S.npcs[id]; if (n) visGone(n); } return; } return _thR(hid); }; }
/* veneno ou punhal: o rei jogador perde a coroa */
if (typeof trKill === 'function') { const _tkR = trKill; trKill = function (k, cause) { if (k === 'king' && S.estate && rkHouse()) { rkEnd(cause || 'assassinado'); return; } return _tkR(k, cause); }; }
/* nunca há rebelião contra um rei jogador que não está no jogo */
if (typeof sgRebelNow === 'function') { const _srR = sgRebelNow; sgRebelNow = function () { if (S.estate && rkHouse() && !rkPlayer()) return null; return _srR.apply(this, arguments); }; }
if (typeof sucApplyKing === 'function') { const _saR = sucApplyKing; sucApplyKing = function (k) { const was = rkHouse(); _saR(k); const h = rkHouse(); if (h && (!was || was.id !== h.id)) { const R = rkRec(); R.tr = Math.max(R.tr, RK.tr0); R.tax = R.tax || RK.tax0; R.day = estDay(); R.open = 0; R.cases = []; R.heir = h.heir || null; const q = rkPlayer(); if (q) tell(q, 'Você é o rei de Nae! Das ' + RK.hours[0] + 'h às ' + RK.hours[1] + 'h, vá ao trono e aperte F para governar: impostos, casos do dia, justiça, títulos e corte.'); } }; }
function rkPanelData(p) { const R = rkRec(), C = crownRec(), H = hRec(), h = rkHouse(), O = typeof cgRec === 'function' ? cgRec().office : {}, nm = k => phRec().names[k] || (typeof cgPlayer === 'function' && cgPlayer(k) ? cgPlayer(k).name : k.split('|')[0]);
  const pl = Object.values(S.players).filter(q => q !== p).map(q => ({ id: q.id, n: q.name, t: C.title[estOwner(q)] | 0, w: q.wanted > now_() ? 1 : 0, j: q.kjail ? 1 : 0, inC: (q.fl || 0) ? (q.fb === castleBi() ? 1 : 0) : (inKeep(Math.round(q.x), Math.round(q.y)) ? 1 : 0), off: typeof cgRoleOf === 'function' ? cgRoleOf(estOwner(q)) : null }));
  const cp = typeof cpRec === 'function' ? cpRec() : {};
  return { t: 'reimenu', king: sucKingName(), tax: R.tax, tr: R.tr, log: R.log.slice(0, 3), cases: R.cases.map(c => ({ i: c.i, who: c.who, t: c.t, o: c.o.map(x => x[0]), done: c.done, hand: c.hand })), pl, off: Object.fromEntries(Object.keys(typeof CG_ROLES !== 'undefined' ? CG_ROLES : {}).map(r => [r, O[r] ? nm(O[r]) : null])),
    vas: Object.keys(H.vow).filter(k => H.vow[k] === h.id && k !== h.owner).map(k => ({ k, n: nm(k) })), heir: R.heir ? nm(R.heir) : null, ys: !cp.ysDama && !cp.ysGone ? 1 : 0, legit: Math.round(sucLegit('h:' + h.id)), max: RK.taxMax, high: RK.taxHigh, low: RK.taxLow, draw: RK.draw }; }
function rkMsg(p, m) { if (!rkIsKing(p)) { tell(p, 'Só o rei governa daqui.'); return; } if (!rkAtThrone(p)) { tell(p, 'Vá até o trono para governar.'); return; } if (!rkOpen()) { tell(p, 'O rei governa do trono das ' + RK.hours[0] + 'h às ' + RK.hours[1] + 'h. Agora, a Mão cuida do reino.'); return; }
  const R = rkRec(), C = crownRec(), q = m.who ? S.players[m.who] : null, kn = sucKingName(); let err = null;
  if (m.a === 'case') { const c = R.cases[m.i | 0]; err = c ? rkResolve(c, m.o | 0, false) : 'Caso desconhecido.'; if (!err) tell(p, 'Decidido: ' + c.o[m.o | 0][0] + '.'); }
  else if (m.a === 'tax') { const v = Math.max(0, Math.min(RK.taxMax, Math.round(+m.v || 0))); if (v !== R.tax) { R.tax = v; sys('📜 Decreto do ' + kn + ': os impostos sobre aluguéis e negócios agora são de ' + v + '%.'); } }
  else if (m.a === 'draw') { if (!rkTr(RK.draw)) err = 'O tesouro não tem ' + RK.draw + ' de ouro.'; else { p.gold = (p.gold || 0) + RK.draw; sendStat(p); hNews('O ' + kn + ' sacou ' + RK.draw + ' de ouro do tesouro real.'); } }
  else if (m.a === 'just' && q) { if (m.k === 'pardon') { q.wanted = 0; q.crimes = []; q.murderer = false; if (q.condemned) condemn(q, false); Net.toAll({ t: 'wanted', id: q.id, ms: 0 }); if (q.kjail) kjailFree(q, 'Por ordem do ' + kn + ', você está livre.'); else tell(q, 'O ' + kn + ' perdoou você.'); }
    else if (m.k === 'wanted') { q.wanted = Math.max(q.wanted || 0, now_()) + RK.wantedMs; Net.toAll({ t: 'wanted', id: q.id, ms: q.wanted - now_() }); tell(q, 'O ' + kn + ' declarou você procurado!'); sys('📜 Decreto do ' + kn + ': ' + q.name + ' está sendo procurado pela guarda.'); }
    else if (m.k === 'jail') { const inC = (q.fl || 0) ? q.fb === castleBi() : inKeep(Math.round(q.x), Math.round(q.y)); if (!inC) err = q.name + ' precisa estar no castelo para ser preso.'; else kjailPut(q, RK.jailMs, 'por ordem do ' + kn); } }
  else if (m.a === 'title' && q) { const k = estOwner(q), t = Math.max(0, Math.min(3, (C.title[k] | 0) + (m.d > 0 ? 1 : -1))); if (t !== (C.title[k] | 0)) { C.title[k] = t; sys(t > 0 ? '📜 O ' + kn + ' fez de ' + q.name + ' ' + CROWN_TITLES[t].n + '.' : '📜 O ' + kn + ' tirou os títulos de ' + q.name + '.'); } }
  else if (m.a === 'ysolde') { const cp = cpRec(); if (!cp.ysDama && !cp.ysGone) { cp.ysDama = estDay(); sys('📜 O ' + kn + ' nomeou Ysolde Verane Dama da corte.'); hNews('Ysolde Verane, da Casa de Veludo, agora é Dama da corte, por decreto do ' + kn + '.'); if (typeof cpSendJ === 'function') cpSendJ(); } }
  else if (m.a === 'office' && typeof CG_ROLES !== 'undefined' && CG_ROLES[m.r]) { const O = cgRec().office; if (!q) { delete O[m.r]; } else { const k = estOwner(q); for (const r in O) if (O[r] === k) delete O[r]; O[m.r] = k; cgApplyStand(); tell(q, 'O ' + kn + ' nomeou você ' + CG_ROLES[m.r].n + '. ' + cgPowerTxt(m.r)); sys('📜 ' + q.name + ' é agora ' + CG_ROLES[m.r].n + '.'); } }
  else if (m.a === 'heir') { const H = hRec(), h = rkHouse(), k = String(m.k || ''); if (k && H.vow[k] !== h.id) return; R.heir = k || null; h.heir = R.heir; }
  else if (m.a === 'abdicate') { rkEnd('abdicou'); return; }
  if (err) tell(p, err); estateSave(); Net.toOne(p.id, rkPanelData(p)); }
if (typeof empWelcome === 'function') { const _ewR = empWelcome; empWelcome = function (to) { _ewR(to); try { const h = S.estate && rkHouse(); if (h) Net.toOne(to, { t: 'rkherald', h: h.id }); } catch (e) { } }; }
function reiMsg(p, m) { if (m.a === 'panel') { if (!rkIsKing(p)) return; if (!rkAtThrone(p)) { tell(p, 'Vá até o trono para governar.'); return; } if (!rkOpen()) { tell(p, 'O rei governa do trono das ' + RK.hours[0] + 'h às ' + RK.hours[1] + 'h. Agora, a Mão cuida do reino.'); return; } Net.toOne(p.id, rkPanelData(p)); return; } rkMsg(p, m); }

// ---------------- CLIENTE ----------------
/* com um jogador no trono, o castelo leva o brasão da casa dele */
const RK_HERALD0 = typeof HERALD !== 'undefined' ? Object.assign({}, HERALD) : null;
function rkSetHerald(id) { if (!RK_HERALD0) return; const hd = id && typeof HERALDS !== 'undefined' ? HERALDS[id] : null; G.rkHd = hd ? id : null; for (const k of ['house', 'field', 'field2', 'metal', 'charge', 'emoji']) delete HERALD[k]; Object.assign(HERALD, RK_HERALD0, hd ? { house: hd.house, field: hd.field, field2: hd.field2, metal: hd.metal, charge: hd.charge, emoji: hd.emoji } : {}); }
function rkNear() { if (!G.rkKing || !G.me || (G.me.fl || 0)) return false; const s = typeof throneSeat === 'function' ? throneSeat() : null; return !!(s && Math.hypot(G.me.x - s.x, G.me.y - s.y) < 2.6); }
if (typeof csHint === 'function') { const _chR = csHint; csHint = function () { if (rkNear()) return 'F: governar o reino (das ' + G.rkKing[0] + 'h às ' + G.rkKing[1] + 'h)'; return _chR(); }; }
if (typeof csF === 'function') { const _cfR = csF; csF = function () { if (!G.csAct && rkNear()) { Net.send({ t: 'rei', a: 'panel' }); return true; } return _cfR(); }; }
function rkPanel(m) { if (typeof velPanel !== 'function') return; const old = document.getElementById('tequip'), sc = old ? (old.querySelector('.rk-body') || {}).scrollTop || 0 : 0;
  const btn = (attrs, t, sub, ghost, dis) => '<button class="est-btn' + (ghost ? ' ghost' : '') + '" ' + attrs + (dis ? ' disabled' : '') + '>' + t + (sub ? '<small>' + sub + '</small>' : '') + '</button>', TT = ['sem título', 'Escudeiro', 'Cavaleiro', 'Lorde'];
  let html = '<div class="rk-body" style="max-height:68vh;overflow:auto;padding-right:4px"><div class="est-cost">Legitimidade: <b>' + m.legit + '</b> · Tesouro: <b>' + m.tr.toLocaleString('pt-BR') + '</b> de ouro' + (m.log.length ? ' · ontem +' + m.log[0][1] + ' de impostos, −' + m.log[0][2] + ' de salários' : '') + '</div>';
  html += '<div class="vel-sub">Audiência de hoje</div>' + (m.cases.length ? m.cases.map(c => '<div style="border:1px solid rgba(255,255,255,.15);border-radius:9px;padding:8px 10px;margin:6px 0"><div style="font-size:13px;line-height:1.4"><b>' + c.who + '</b>: ' + c.t + '</div>' + (c.done != null ? '<div style="font-size:12px;opacity:.8;margin-top:4px">✔ ' + c.o[c.done] + (c.hand ? ' (a Mão decidiu)' : '') + '</div>' : '<div class="tq-btns" style="margin-top:6px">' + c.o.map((o, i) => btn('data-case="' + c.i + '" data-o="' + i + '"', o, '', i > 0)).join('') + '</div>') + '</div>').join('') : '<div style="opacity:.7;font-size:13px">Nenhum caso hoje.</div>');
  html += '<div class="vel-sub">Impostos sobre aluguéis e negócios</div><div style="display:flex;align-items:center;gap:10px;font-size:13px"><input id="rk-tax" type="range" min="0" max="' + m.max + '" value="' + m.tax + '" style="flex:1"><b id="rk-tv" style="min-width:38px">' + m.tax + '%</b>' + btn('data-tax', 'Decretar', '') + '</div><div style="font-size:11.5px;opacity:.75;margin:2px 0 6px">Acima de ' + m.high + '% a legitimidade cai a cada dia; abaixo de ' + m.low + '% o tesouro não paga os salários.</div><div class="tq-btns">' + btn('data-draw', 'Sacar ' + m.draw + ' do tesouro', 'vai para a sua bolsa', true, m.tr < m.draw) + '</div>';
  html += '<div class="vel-sub">Justiça e títulos</div>' + (m.pl.length ? m.pl.map(q => '<div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:5px 0;font-size:13px"><b style="min-width:92px">' + q.n + '</b><small style="opacity:.7">' + TT[q.t] + (q.w ? ' · procurado' : '') + (q.j ? ' · preso' : '') + '</small><span style="margin-left:auto;display:flex;gap:4px;flex-wrap:wrap">' + ['pardon:Perdoar', 'wanted:Procurado', 'jail:Prender'].map(s => { const [k, t] = s.split(':'); return '<button class="est-btn ghost" style="padding:3px 8px;font-size:12px" data-just="' + k + '" data-who="' + q.id + '"' + (k === 'jail' && !q.inC ? ' disabled title="só no castelo"' : '') + '>' + t + '</button>'; }).join('') + '<button class="est-btn ghost" style="padding:3px 8px;font-size:12px" data-title="1" data-who="' + q.id + '"' + (q.t >= 3 ? ' disabled' : '') + '>+ título</button><button class="est-btn ghost" style="padding:3px 8px;font-size:12px" data-title="-1" data-who="' + q.id + '"' + (q.t <= 0 ? ' disabled' : '') + '>− título</button></span></div>').join('') : '<div style="opacity:.7;font-size:13px">Nenhum outro jogador no reino agora.</div>') + (m.ys ? '<div class="tq-btns">' + btn('data-ys', 'Nomear Ysolde Verane Dama da corte', 'é a vitória da campanha dela', true) + '</div>' : '');
  const RN = { hand: 'Mão do Rei', coin: 'Mestre da Moeda', cmd: 'Comandante', maester: 'Meistre' };
  html += '<div class="vel-sub">A corte</div>' + Object.keys(m.off).map(r => '<div style="display:flex;gap:6px;align-items:center;margin:5px 0;font-size:13px"><b style="min-width:120px">' + (RN[r] || r) + '</b><span style="opacity:.8">' + (m.off[r] || 'o conselheiro de sempre') + '</span><select data-offsel="' + r + '" style="margin-left:auto;padding:4px;border-radius:6px;background:rgba(0,0,0,.35);color:inherit"><option value="">— nomear —</option>' + m.pl.map(q => '<option value="' + q.id + '">' + q.n + '</option>').join('') + '</select>' + (m.off[r] ? '<button class="est-btn ghost" style="padding:3px 8px;font-size:12px" data-offx="' + r + '">Dispensar</button>' : '') + '</div>').join('');
  html += '<div class="vel-sub">Herdeiro</div><div style="font-size:13px">' + (m.vas.length ? '<select id="rk-heir" style="padding:5px;border-radius:6px;background:rgba(0,0,0,.35);color:inherit"><option value="">— ninguém (o vassalo de mais favor) —</option>' + m.vas.map(v => '<option value="' + v.k + '"' + (m.heir === v.n ? ' selected' : '') + '>' + v.n + '</option>').join('') + '</select>' : '<span style="opacity:.75">Nenhum vassalo na sua casa: sem herdeiro, a coroa vai para o próximo da linha.</span>') + '</div>';
  html += '<div class="tq-btns" style="margin-top:12px">' + btn('data-abd', 'Abdicar', 'a coroa passa ao herdeiro', true) + '</div></div>';
  const d = velPanel('👑 ' + m.king + ' — o trono', html), body = d.querySelector('.rk-body'); if (body) body.scrollTop = sc;
  d.querySelectorAll('[data-case]').forEach(b => b.onclick = () => Net.send({ t: 'rei', a: 'case', i: +b.dataset.case, o: +b.dataset.o }));
  const tx = d.querySelector('#rk-tax'); if (tx) tx.oninput = () => { d.querySelector('#rk-tv').textContent = tx.value + '%'; }; const tb = d.querySelector('[data-tax]'); if (tb) tb.onclick = () => Net.send({ t: 'rei', a: 'tax', v: +tx.value });
  const db = d.querySelector('[data-draw]'); if (db) db.onclick = () => Net.send({ t: 'rei', a: 'draw' });
  d.querySelectorAll('[data-just]').forEach(b => b.onclick = () => Net.send({ t: 'rei', a: 'just', k: b.dataset.just, who: b.dataset.who }));
  d.querySelectorAll('[data-title]').forEach(b => b.onclick = () => Net.send({ t: 'rei', a: 'title', d: +b.dataset.title, who: b.dataset.who }));
  const ys = d.querySelector('[data-ys]'); if (ys) ys.onclick = () => Net.send({ t: 'rei', a: 'ysolde' });
  d.querySelectorAll('[data-offsel]').forEach(s => s.onchange = () => { if (s.value) Net.send({ t: 'rei', a: 'office', r: s.dataset.offsel, who: s.value }); });
  d.querySelectorAll('[data-offx]').forEach(b => b.onclick = () => Net.send({ t: 'rei', a: 'office', r: b.dataset.offx, who: null }));
  const hs = d.querySelector('#rk-heir'); if (hs) hs.onchange = () => Net.send({ t: 'rei', a: 'heir', k: hs.value });
  const ab = d.querySelector('[data-abd]'); if (ab) ab.onclick = () => { if (!ab.dataset.sure) { ab.dataset.sure = 1; ab.innerHTML = 'Tem certeza?<small>clique de novo para abdicar</small>'; return; } d.remove(); Net.send({ t: 'rei', a: 'abdicate' }); }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peR = progEvent; progEvent = function (m, now) {
  if (m.t === 'rkherald') { rkSetHerald(m.h); return true; }
  if (m.t === 'rkme') { G.rkKing = m.on ? m.h : null; return true; }
  if (m.t === 'reimenu') { rkPanel(m); return true; }
  return _peR(m, now); }; }
