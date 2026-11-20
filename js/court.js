// ============================================================
//  A CORTE DO CASTELO: Rei Edric, o Velho (doente), a Mão do Rei,
//  arauto, meistre, mestre da moeda, comandante, família real,
//  criados, carcereiro, torturador e a Guarda Real; audiências,
//  contratos reais, favor da coroa, títulos e o calabouço.
// ============================================================
const AUD_H0 = 8, AUD_H1 = 12;   /* horário das audiências (horas do jogo) */
const CROWN_TITLES = [null, { n: 'Escudeiro', pre: 'Escudeiro', favor: 30, fee: 100 }, { n: 'Cavaleiro', pre: 'Sor', favor: 90, fee: 600 }, { n: 'Lorde', pre: 'Lorde', favor: 220, fee: 2500 }];
/* postos: [andar, u, v] no quadro do castelo (20 × 17); 'yard' = [x, y] relativo ao centro da cidade, no pátio */
const COURT = [
  { id: 'k_king', kind: 'k_king', name: 'Rei Edric, o Velho', role: 'king', day: [0, 'throne'], off: [4, 13, 3] },
  { id: 'k_hand', kind: 'k_hand', name: 'Lorde Osric Vane, a Mão do Rei', role: 'hand', day: [0, 7.4, 2.4], off: [2, 3.5, 15] },
  { id: 'k_herald', kind: 'k_herald', name: 'Mestre Bram, o Arauto', role: 'herald', day: [0, 10.5, 14.5], off: [0, 17.5, 12.5] },
  { id: 'k_maester', kind: 'k_maester', name: 'Meistre Aldous', role: 'maester', day: [2, 14.5, 3.5], off: [2, 14.5, 3.5] },
  { id: 'k_coin', kind: 'k_coin', name: 'Lorde Cassian Merrow, o Mestre da Moeda', role: 'coin', day: [2, 14.5, 8.5], off: [2, 14.5, 8.5] },
  { id: 'k_cmd', kind: 'k_cmd', name: 'Sor Gareth Holt, Comandante da Guarda Real', role: 'cmd', day: [0, 12.6, 2.6], off: [0, 2.5, 9.5] },
  { id: 'k_prince', kind: 'k_prince', name: 'Príncipe Alaric Aurenfell', role: 'prince', day: [0, 'yard', -1, -8], off: [4, 2.5, 3] },
  { id: 'k_princess', kind: 'k_princess', name: 'Princesa Lyra Aurenfell', role: 'princess', day: [2, 3.5, 9.5], off: [4, 6.5, 3] },
  { id: 'k_cook', kind: 'k_cook', name: 'Marga, a Cozinheira', role: 'servant', day: [1, 2.5, 3.5], off: [3, 13, 3] },
  { id: 'k_maid', kind: 'k_maid', name: 'Tessa, a Criada', role: 'servant', day: [1, 2.5, 12.5], off: [3, 12, 9] },
  { id: 'k_page', kind: 'k_page', name: 'Pip, o Copeiro', role: 'servant', day: [1, 17.5, 9.5], off: [3, 14, 9] },
  { id: 'k_jailer', kind: 'k_jailer', name: 'Grum, o Carcereiro', role: 'jailer', day: [-1, 7.5, 14.5], off: [-1, 7.5, 14.5] },
  { id: 'k_torturer', kind: 'k_torturer', name: 'Mestre Thorne', role: 'torturer', day: [-2, 14.5, 4.5], off: [-2, 14.5, 4.5] },
  { id: 'k_rg1', kind: 'k_guard', name: 'Guarda Real', role: 'guard', day: [0, 8.2, 3.6], off: [0, 9, 15.5], night: 1 },
  { id: 'k_rg2', kind: 'k_guard', name: 'Guarda Real', role: 'guard', day: [0, 11.8, 3.6], off: [0, 'patrol'], night: 1 },
  { id: 'k_rg3', kind: 'k_guard', name: 'Guarda Real', role: 'guard', day: [0, 'yard', -1.2, -1.8], off: [0, 'yard', -1.2, -1.8] },
  { id: 'k_rg4', kind: 'k_guard', name: 'Guarda Real', role: 'guard', day: [0, 'yard', 2.2, -1.8], off: [0, 'yard', 2.2, -1.8] },
  { id: 'k_rg5', kind: 'k_guard', name: 'Guarda Real', role: 'guard', day: [0, 17.5, 6.5], off: [0, 17.5, 6.5] },
  { id: 'k_rg6', kind: 'k_guard', name: 'Guarda Real', role: 'guard', day: [0, 2.5, 6.5], off: [0, 2.5, 6.5] },
  { id: 'k_rg7', kind: 'k_guard', name: 'Guarda Real (ronda)', role: 'guard', day: [0, 'ronda', 0], off: [0, 'ronda', 0] },
  { id: 'k_rg8', kind: 'k_guard', name: 'Guarda Real (ronda)', role: 'guard', day: [0, 'ronda', 1], off: [0, 'ronda', 1] },
];
const RONDA = [[-12, -13], [10, -13], [8, -4], [-10, -4]];   /* volta pelo pátio e pelos largos de dentro da muralha */
const HALL_PATROL = [[9.5, 15], [9.5, 6], [2.5, 8], [17.5, 10], [9.5, 15]];   /* à noite um guarda passa pelo salão de tempos em tempos */
const KJAIL_CELLS = [10, 13, 16];   /* celas do calabouço (u inicial, 3 casas de largura, v 6..8) */
function castleB() { return BUILDINGS.find(b => b.kind === 'castle'); }
function castleBi() { return BUILDINGS.indexOf(castleB()); }
function throneSeat() { const bi = castleBi(); return (WORLD.seats || []).find(s => s.bi === bi && s.h > 0.9); }
function crownRec() { S.estate.crown = S.estate.crown || { favor: {}, title: {}, vow: {}, con: {}, hp: 70, bad: 0, day: 0, paid: {} }; return S.estate.crown; }
function crownKey(p) { return estOwner(p); }
function crownFavor(p, n, why) { const C = crownRec(), k = crownKey(p); C.favor[k] = Math.max(0, (C.favor[k] || 0) + n); if (n && why) tell(p, (n > 0 ? '+' : '') + n + ' de favor da coroa (' + why + '). Total: ' + C.favor[k] + '.'); estateSave(); }
function audienceOpen() { const h = empHour(); return h >= AUD_H0 && h < AUD_H1; }
function presider() { const C = crownRec(); return C.bad ? S.npcs.k_hand : S.npcs.k_king; }
function courtPost(def, now) {   /* onde a pessoa deve estar agora */
  const h = empHour(), day = h >= 7 && h < 20, C = crownRec();
  let P = def.role === 'king' ? (audienceOpen() && !C.bad ? def.day : def.off) : def.role === 'hand' ? (audienceOpen() ? (C.bad ? [0, 'throne'] : def.day) : def.off) : def.role === 'maester' && C.bad ? [4, 12.5, 5] : day ? def.day : def.off;
  return P; }
function courtWorld(P, n, now) {
  const b = castleB(); if (!b) return null; const fl = P[0];
  if (P[1] === 'throne') { const s = throneSeat(); return s ? { x: s.x, y: s.y, fl: 0, sit: s.dir } : null; }
  if (P[1] === 'yard') return { x: CENTER + P[2] + 0.5, y: CENTER + P[3] + 0.5, fl: 0, out: 1 };
  if (P[1] === 'ronda') { const k = (Math.floor(now / 9000) + P[2] * 2) % RONDA.length, w = RONDA[k]; return { x: CENTER + w[0] + 0.5, y: CENTER + w[1] + 0.5, fl: 0, out: 1, walk: 1 }; }
  if (P[1] === 'patrol') { const k = Math.floor(now / 12000) % HALL_PATROL.length, w = HALL_PATROL[k]; const [x, y] = localToWorld(b, w[0], w[1]); return { x, y, fl: 0, walk: 1 }; }
  const [x, y] = localToWorld(b, P[1], P[2]); return { x, y, fl }; }
function courtSpawn(def) {
  const id = def.id; if (S.npcs[id]) return S.npcs[id]; const b = castleB(); if (!b) return null; const P = courtWorld(courtPost(def, now_()), null, now_()); if (!P) return null;
  const n = { id, kind: def.kind, name: def.name, transient: true, court: def.role, x: P.x, y: P.y, z: 0, fl: P.fl, fb: P.fl ? castleBi() : -1, hp: 400, maxHp: 400, downed: null, dead: false };
  S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n; }
function courtMove(n, T, dt) {   /* anda em linha reta pelo andar; se travar ou o andar mudar, some e reaparece no posto */
  const bi = castleBi(), d = dist(n.x, n.y, T.x, T.y);
  if ((n.fl || 0) !== T.fl || d > 14) { n.x = T.x; n.y = T.y; n.fl = T.fl; n.fb = T.fl ? bi : -1; n.walk = false; return true; }
  if (d < 0.15) { n.walk = false; return true; }
  const s = Math.min(d, (T.walk ? 1.2 : 1.6) * dt), nx = n.x + (T.x - n.x) / d * s, ny = n.y + (T.y - n.y) / d * s, ok = (x, y) => T.fl ? canStandFloor(x, y, bi, T.fl, 0.2) : canStand(x, y, 0, 0.2);
  if (ok(nx, ny)) { n.x = nx; n.y = ny; n._stk = 0; } else if (ok(nx, n.y)) n.x = nx; else if (ok(n.x, ny)) n.y = ny; else if (++n._stk > 20) { n.x = T.x; n.y = T.y; n._stk = 0; }
  n.dir = dirFromVecS(T.x - n.x, T.y - n.y); n.walk = true; return false; }
function courtTick(now) {
  if (!S.estate || !castleB() || now - (S.courtT || 0) < 150) return; const dt = Math.min(0.4, (now - (S.courtT || now)) / 1000) || 0.15; S.courtT = now; const C = crownRec();
  const dd = estDay(); if (C.day !== dd) { C.day = dd; C.hp = Math.max(5, C.hp - (1 + Math.floor(Math.random() * 3))); C.bad = Math.random() < (100 - C.hp) / 120 ? 1 : 0; estateSave();   /* a doença do rei piora com os dias */
    if (C.bad) sys('O Rei Edric amanheceu fraco demais para receber. A Mão do Rei preside as audiências hoje.');
    for (const q of Object.values(S.players)) { const k = crownKey(q); if ((C.title[k] | 0) >= 3 && C.paid[k] !== dd) { C.paid[k] = dd; q.gold = (q.gold || 0) + 60; sendStat(q); tell(q, 'Renda de Lorde: +60 de ouro da coroa.'); } } }
  for (const def of COURT) { const n = courtSpawn(def); if (!n || n.dead) continue; if (n.downed) continue;
    const T = courtWorld(courtPost(def, now), n, now); if (!T) continue; const at = courtMove(n, T, dt);
    n.sitting = !!(at && T.sit != null); if (n.sitting) n.dir = T.sit;
    if (at && !T.walk && !n.sitting && Math.random() < 0.004) n.dir = (n.dir + (Math.random() < 0.5 ? 1 : 7)) % 8; }
  /* fila das audiências */
  const Q = S.audQ = S.audQ || [];
  for (let i = Q.length - 1; i >= 0; i--) if (!S.players[Q[i]]) Q.splice(i, 1);
  if (!audienceOpen()) { if (Q.length || S.audCall) { for (const id of Q) { const q = S.players[id]; if (q) tell(q, 'As audiências de hoje terminaram. Volte amanhã de manhã.'); } Q.length = 0; S.audCall = null; } }
  else { const cur = S.audCall; if (cur && (now > cur.until || !S.players[cur.id])) { const q = S.players[cur.id]; if (q && !cur.done) tell(q, 'Você não se apresentou a tempo: perdeu a vez.'); S.audCall = null; }
    if (!S.audCall && Q.length && now > (S.audNext || 0)) { const id = Q.shift(), q = S.players[id]; if (q) { S.audCall = { id, until: now + 90000 }; const pr = presider(), h = S.npcs.k_herald; if (h) empSay(h, q.name + ', aproxime-se do trono!'); tell(q, 'O arauto chama você: vá até o trono e fale com ' + (pr ? pr.name : 'a coroa') + ' (F). Você tem 1 minuto e meio.'); } } }
  /* o trono de espadas: quem senta e é visto vai para o calabouço */
  const s = throneSeat(); if (s) for (const q of Object.values(S.players)) { if (q.dev || !q.sit || (q.fl || 0) !== 0 || dist(q.x, q.y, s.x, s.y) > 0.5 || q.kjail) continue;
    const seen = Object.values(S.npcs).some(o => o.court && !o.dead && !o.downed && (o.fl || 0) === 0 && o.id !== 'k_king' && WORLD.bld[tileAt(o.x, o.y)] === castleBi() && dist(o.x, o.y, q.x, q.y) < 11);
    if (seen && !q.thrT) q.thrT = now; if (seen && now - q.thrT > 1500) { q.thrT = 0; const g = Object.values(S.npcs).find(o => o.court === 'guard' && (o.fl || 0) === 0 && dist(o.x, o.y, q.x, q.y) < 11); if (g) empSay(g, 'Saia do trono, traidor! Para o calabouço!'); crownFavor(q, -25, 'sentou no Trono de Espadas'); kjailPut(q, 300000, 'por sentar no Trono de Espadas'); } if (!seen) q.thrT = 0; }
  /* prisioneiros do calabouço */
  for (const q of Object.values(S.players)) { const J = q.kjail; if (!J) continue; if (now > J.until) { kjailFree(q, 'Você cumpriu a pena no calabouço. Os guardas te soltam no portão do castelo.'); continue; } if (q.sleep != null) J.until -= dt * 1000; }
  /* títulos para os rótulos */
  if (now - (S.ttlT || 0) > 5000) { S.ttlT = now; const L = {}; for (const q of Object.values(S.players)) { const t = C.title[crownKey(q)] | 0; if (t) L[q.id] = CROWN_TITLES[t].pre; } const js = JSON.stringify(L); if (js !== S.ttlLast) { S.ttlLast = js; Net.toAll({ t: 'crownttl', l: L }); } }
}
function kjailCell(i) { const b = castleB(), u0 = KJAIL_CELLS[i]; return { u0, x: localToWorld(b, u0 + 1.5, 7.3) }; }
function kjailPut(q, ms, why) { const S2 = S.kjailUsed = S.kjailUsed || {}; let i = KJAIL_CELLS.findIndex((_, k) => !Object.values(S.players).some(o => o.kjail && o.kjail.cell === k)); if (i < 0) i = 0;
  const c = kjailCell(i), bi = castleBi(); q.kjail = { cell: i, until: now_() + ms }; q.sit = null; q.sleep = null; q.flame = null; q.x = c.x[0]; q.y = c.x[1]; q.fl = -1; q.fb = bi; q.z = 0; q.wanted = 0;
  Net.toOne(q.id, { t: 'tp', x: q.x, y: q.y, z: 0, fl: -1, fb: bi }); Net.toOne(q.id, { t: 'kjail', on: 1, cell: i, until: Date.now() + ms }); tell(q, 'Você foi jogado no calabouço do castelo ' + why + ' por ' + Math.ceil(ms / 60000) + ' min. Dormir no catre faz o tempo passar mais rápido; Grum, o carcereiro, aceita fiança.'); sys(q.name + ' foi jogado no calabouço do castelo ' + why + '.'); }
function kjailFree(q, why) { q.kjail = null; const x = CENTER + 0.5, y = CENTER - 1.5; q.x = x; q.y = y; q.fl = 0; q.fb = -1; Net.toOne(q.id, { t: 'tp', x, y, z: 0, fl: 0, fb: -1 }); Net.toOne(q.id, { t: 'kjail', on: 0 }); tell(q, why); sendStat(q); }
function kjailBlocked(p, x, y) { const J = p.kjail; if (!J) return false; const b = castleB(), [u, v] = worldToLocal(b, x, y), u0 = KJAIL_CELLS[J.cell]; return !(u > u0 + 0.25 && u < u0 + 2.75 && v > 6.25 && v < 8.75); }
const kjailBail = q => Math.max(20, Math.ceil((q.kjail.until - now_()) / 60000) * 40);
function conOffers(p) {   /* contratos reais do dia: um fácil, um médio, um difícil */
  const d = estDay(), pick = (arr, k) => arr[(d * 7 + k * 13 + p.name.length) % arr.length];
  return [Object.assign({ t: 0 }, pick([{ mon: 'wolf', n: 6, g: 70, f: 10 }, { mon: 'goblin', n: 6, g: 80, f: 10 }, { mon: 'bandit', n: 5, g: 90, f: 12 }], 0)),
    Object.assign({ t: 1 }, pick([{ mon: 'skeleton', n: 8, g: 180, f: 18 }, { mon: 'orc', n: 5, g: 200, f: 20 }, { mon: 'deserter', n: 4, g: 190, f: 18 }], 1)),
    Object.assign({ t: 2 }, pick([{ mon: 'orcchief', n: 1, g: 420, f: 35 }, { mon: 'deserterchief', n: 1, g: 400, f: 32 }, { mon: 'cryptlord', n: 1, g: 450, f: 35 }], 2))]; }
if (typeof killMonster === 'function') { const _kmC = killMonster; killMonster = function (m, p) { try { if (p && S.estate && S.estate.crown) { const c = crownRec().con[crownKey(p)]; if (c && c.mon === m.type && c.got < c.n) { c.got++; tell(p, 'Contrato real: ' + c.got + '/' + c.n + ' ' + ((MON[c.mon] || {}).name || c.mon) + '.' + (c.got >= c.n ? ' Volte ao castelo para receber a recompensa.' : '')); estateSave(); } } } catch (e) { } return _kmC.apply(this, arguments); }; }
if (typeof featAdd === 'function') { const _faC = featAdd; featAdd = function (p, k, n) { const r = _faC.apply(this, arguments); try { if (k === 'rent' && p && S.estate) crownFavor(p, 2 * (n || 1), 'impostos em dia'); } catch (e) { } return r; }; }
if (typeof jailPlayer === 'function') { const _jpC = jailPlayer; jailPlayer = function (q) { const r = _jpC.apply(this, arguments); try { const hb = q && q._hitBy; if (r && hb && hb.k === 'p' && now_() - hb.t < 180000) { const h = S.players[hb.id]; if (h && h !== q && !(h.wanted > now_())) crownFavor(h, 8, 'ajudou a prender um criminoso'); } } catch (e) { } return r; }; }
function courtNearRole(p, role, r = 2.6) { const n = Object.values(S.npcs).find(o => o.court === role && !o.dead && (o.fl || 0) === (p.fl || 0) && dist(o.x, o.y, p.x, p.y) < r); return n; }
function courtState(p) { const C = crownRec(), k = crownKey(p), t = C.title[k] | 0; return { favor: C.favor[k] || 0, title: t, next: CROWN_TITLES[t + 1] || null, vow: !!C.vow[k], con: C.con[k] || null, hp: C.hp, bad: C.bad, open: audienceOpen(), h0: AUD_H0, h1: AUD_H1, queue: (S.audQ || []).indexOf(p.id), called: S.audCall && S.audCall.id === p.id ? 1 : 0, wanted: p.wanted > now_() ? 1 : 0, jailed: Object.values(S.players).filter(o => o.kjail || o.jailUntil > now_()).map(o => [o.id, o.name, o.kjail ? kjailBail(o) : bailPrice(o), o.kjail ? 1 : 0]) }; }
function courtMsg(p, m) {
  const C = crownRec(), k = crownKey(p), n = S.npcs[m.id]; if (!n || !n.court) return; if (dist(n.x, n.y, p.x, p.y) > 3 || (n.fl || 0) !== (p.fl || 0)) { tell(p, 'Chegue mais perto.'); return; }
  const send = () => Net.toOne(p.id, { t: 'courtmenu', id: n.id, role: n.court, name: n.name, s: courtState(p), offers: (n.court === 'king' || n.court === 'hand') ? conOffers(p) : null });
  const pres = presider(); const inAud = S.audCall && S.audCall.id === p.id && pres && pres.id === n.id;
  if (m.a === 'open') { send(); return; }
  if (n.court === 'herald') { if (m.a === 'queue') { if (!audienceOpen()) { tell(p, 'As audiências são das ' + AUD_H0 + 'h às ' + AUD_H1 + 'h.'); return; } const Q = S.audQ = S.audQ || []; if (!Q.includes(p.id) && !(S.audCall && S.audCall.id === p.id)) Q.push(p.id); empSay(n, 'Anotado, ' + p.name + '. Aguarde ser chamado.'); }
    if (m.a === 'leave') { S.audQ = (S.audQ || []).filter(x => x !== p.id); } send(); return; }
  if (n.court === 'king' || n.court === 'hand') {
    if (!inAud) { empSay(n, audienceOpen() ? 'Fale com o arauto e espere a sua vez.' : 'Volte no horário das audiências.'); return; }
    S.audCall.done = 1;
    if (m.a === 'con') { const o = conOffers(p)[m.i | 0]; if (!o) return; if (C.con[k] && C.con[k].got < C.con[k].n) { tell(p, 'Termine o contrato que já tem.'); return; } C.con[k] = Object.assign({}, o, { got: 0 }); estateSave(); empSay(n, 'Que seja feito. Traga-me a prova: ' + o.n + ' ' + ((MON[o.mon] || {}).name || o.mon) + '.'); }
    else if (m.a === 'turnin') { const c = C.con[k]; if (!c || c.got < c.n) return; delete C.con[k]; p.gold = (p.gold || 0) + c.g; sendStat(p); crownFavor(p, c.f, 'contrato real cumprido'); empSay(n, 'A coroa não esquece quem a serve. ' + c.g + ' de ouro para você.'); }
    else if (m.a === 'title') { const t = (C.title[k] | 0) + 1, T = CROWN_TITLES[t]; if (!T) return; if ((C.favor[k] || 0) < T.favor) { tell(p, 'Favor insuficiente: precisa de ' + T.favor + '.'); return; } if ((p.gold || 0) < T.fee) { tell(p, 'A taxa do título é ' + T.fee + ' de ouro.'); return; } p.gold -= T.fee; C.title[k] = t; estateSave(); sendStat(p); empSay(n, 'Ajoelhe-se. Levante-se, ' + T.pre + ' ' + p.name + '!'); sys(p.name + ' recebeu o título de ' + T.n + ' da Casa Aurenfell.'); }
    else if (m.a === 'pardon') { if (!(p.wanted > now_())) return; const fee = 150; if ((p.gold || 0) < fee) { tell(p, 'O perdão custa ' + fee + ' de ouro.'); return; } p.gold -= fee; p.wanted = 0; p.crimes = []; Net.toAll({ t: 'wanted', id: p.id, ms: 0 }); sendStat(p); crownFavor(p, -5, 'pediu perdão'); empSay(n, 'Está perdoado. Não me faça arrepender.'); }
    else if (m.a === 'free') { const q = S.players[m.who]; if (!q || q === p) return; const price = q.kjail ? kjailBail(q) : (q.jailUntil > now_() ? bailPrice(q) : 0); if (!price) return; if ((p.gold || 0) < price) { tell(p, 'A fiança é ' + price + ' de ouro.'); return; } p.gold -= price; sendStat(p); if (q.kjail) kjailFree(q, p.name + ' pagou a sua fiança na audiência real.'); else releasePlayer(q, p.name + ' pagou a sua fiança na audiência real.'); empSay(n, 'Concedido. Que o preso seja solto.'); }
    else if (m.a === 'vow') { if (C.vow[k]) return; if (S.estate.houses && S.estate.houses.vow[k]) { const ph = S.estate.houses.vow[k]; delete S.estate.houses.vow[k]; if (typeof hFavor === 'function') hFavor(p, ph, -20, 'você abandonou a casa'); } C.vow[k] = 'Aurenfell'; estateSave(); crownFavor(p, 5, 'jurou lealdade'); empSay(n, 'A Casa Aurenfell aceita a sua lealdade. A luz não se curva.'); sys(p.name + ' jurou lealdade à Casa Aurenfell.'); }
    else if (m.a === 'end') { S.audCall = null; S.audNext = now_() + 4000; empSay(n, 'Pode ir.'); return; }
    send(); return; }
  if (n.court === 'coin' && m.a === 'donate') { const v = [50, 200, 1000][m.i | 0] || 0; if (!v || (p.gold || 0) < v) { tell(p, 'Ouro insuficiente.'); return; } p.gold -= v; sendStat(p); crownFavor(p, Math.round(v / 22), 'doação ao tesouro'); empSay(n, 'O tesouro agradece a sua generosidade.'); send(); return; }
  if (n.court === 'maester') { if (m.a === 'heal') { if ((p.gold || 0) < 30) { tell(p, 'O tratamento custa 30 de ouro.'); return; } p.gold -= 30; p.hp = p.maxHp; if (p.bleed) for (const b2 in p.bleed) p.bleed[b2] = 0; p.infect = 0; sendStat(p); empSay(n, 'Pronto. Beba bastante água.'); }
    if (m.a === 'herbs') { const have = (p.inv.herb | 0) + (p.inv.silverleaf | 0); if (have < 3) { tell(p, 'Traga 3 ervas (erva comum ou folha-de-prata).'); return; } let need = 3; for (const h of ['silverleaf', 'herb']) { const t = Math.min(need, p.inv[h] | 0); p.inv[h] -= t; if (!p.inv[h]) delete p.inv[h]; need -= t; } C.hp = Math.min(100, C.hp + 10); estateSave(); sendStat(p); crownFavor(p, 6, 'ervas para o rei'); empSay(n, 'Isto vai aliviar Sua Majestade por um tempo.'); }
    send(); return; }
  if (n.court === 'jailer' && m.a === 'bail') { const q = S.players[m.who]; if (!q || !q.kjail) return; const price = kjailBail(q); if ((p.gold || 0) < price) { tell(p, 'A fiança é ' + price + ' de ouro.'); return; } p.gold -= price; sendStat(p); kjailFree(q, (q === p ? 'Você pagou' : p.name + ' pagou') + ' a fiança. Grum abre a cela.'); send(); return; }
  send();
}
// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  const robe = (c1, c2, acc, extra) => Object.assign(heroLook('mage', 'adept', c1), { armor: 'robe', body: tone(c1), body2: tone(c2), accent: tone(acc), trim: tone(acc), head: 'none', weapon: null, shield: null, cape: false }, extra || {});
  Object.assign(NPC_LOOKS, {
    k_king: () => robe('#7a1a1c', '#4a0e10', '#e2b74e', { head: 'circlet', hair: tone('#e8e4dc'), beard: tone('#f0ece4'), beardLong: 1, brows: tone('#f0ece4'), cape: true, capeTone: tone('#5a0e10'), weapon: 'staff' }),
    k_hand: () => robe('#2a2a34', '#14141a', '#c9a24a', { hair: tone('#5a4a3a'), beard: tone('#4a3a2a'), hairStyle: 'short' }),
    k_herald: () => robe('#9a2a1c', '#e2b74e', '#f1cf6a', { head: 'cap', hair: tone('#3a2a1e') }),
    k_maester: () => robe('#5a5a5e', '#3a3a3e', '#a8a8b0', { hair: tone('#9a9890'), beard: tone('#b8b6ae'), beardLong: 1, bald: 1 }),
    k_coin: () => robe('#2c4a3a', '#1a2c22', '#e2b74e', { hair: tone('#2a1e14'), hairStyle: 'short', beard: tone('#2a1e14') }),
    k_cmd: () => Object.assign(heroLook('knight', 'iron', '#e8e4d8'), { head: 'none', hair: tone('#6a5a4a'), hairStyle: 'short', beard: tone('#7a6a5a'), cape: true, capeTone: tone('#9a2a1c'), weapon: 'sword', shield: null, pauldron: 'round', scar: true }),
    k_prince: () => Object.assign(heroLook('knight', 'iron', '#9a2a1c'), { head: 'circlet', hair: tone('#c8a060'), hairStyle: 'short', beard: null, cape: true, capeTone: tone('#9a2a1c'), weapon: 'sword', shield: null }),
    k_princess: () => robe('#c8708a', '#9a3a5a', '#f1cf6a', { head: 'circlet', hair: tone('#d8b070'), hairStyle: 'long', beard: null }),
    k_cook: () => Object.assign(heroLook('archer', 'scout', '#e8e0d0'), { armor: 'vest', body: tone('#e8e0d0'), body2: tone('#8a6a4a'), head: 'cap', hair: tone('#5a3a22'), hairStyle: 'long', beard: null, weapon: null, quiver: false }),
    k_maid: () => Object.assign(heroLook('archer', 'scout', '#3a3a4a'), { armor: 'vest', body: tone('#3a3a4a'), body2: tone('#f0ece4'), head: 'none', hair: tone('#4a2a1a'), hairStyle: 'long', beard: null, weapon: null, quiver: false }),
    k_page: () => Object.assign(heroLook('archer', 'scout', '#9a2a1c'), { armor: 'vest', body: tone('#9a2a1c'), body2: tone('#e2b74e'), head: 'none', hair: tone('#c89a5a'), hairStyle: 'short', beard: null, weapon: null, quiver: false }),
    k_jailer: () => Object.assign(heroLook('knight', 'iron', '#4a3a2a'), { armor: 'vest', body: tone('#4a3a2a'), head: 'none', hair: tone('#2a2018'), bald: 1, beard: tone('#3a2a1a'), weapon: 'hammer', shield: null, cape: false }),
    k_torturer: () => Object.assign(heroLook('knight', 'iron', '#1a1a1a'), { armor: 'vest', body: tone('#1a1a1a'), head: 'hood', hair: tone('#1a1a1a'), beard: null, weapon: 'axe', shield: null, cape: false }),
    k_guard: () => Object.assign(heroLook('knight', 'iron', '#e8d8a8'), { head: 'helm', cape: true, capeTone: tone('#9a2a1c'), weapon: 'spear', shield: null, beard: tone('#5a4a3a') }),
  });
  if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { k_king: 'mage', k_hand: 'mage', k_herald: 'mage', k_maester: 'mage', k_coin: 'mage', k_princess: 'mage', k_cmd: 'knight', k_prince: 'knight', k_jailer: 'knight', k_torturer: 'knight', k_guard: 'knight', k_cook: 'archer', k_maid: 'archer', k_page: 'archer' });
}
if (typeof G !== 'undefined') G.crownTtl = G.crownTtl || {};
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peC = progEvent; progEvent = function (m, now) {
  if (m.t === 'courtmenu') { courtMenu(m); return true; }
  if (m.t === 'crownttl') { G.crownTtl = m.l || {}; return true; }
  if (m.t === 'kjail') { G.kjail = m.on ? { cell: m.cell } : null; return true; }
  return _peC(m, now); }; }
function courtNear() { const me = G.me; if (!me) return null; let best = null, bd = 2.4; for (const id in G.npcs) { const e = G.npcs[id]; if (!e.kind || !e.kind.startsWith('k_') || e.dead) continue; if ((e.fl || 0) !== (me.fl || 0)) continue; const d = Math.hypot(e.rx - me.x, e.ry - me.y); if (d < bd) { bd = d; best = e; } } return best; }
function courtPrompt() { const e = courtNear(); return e ? 'F: falar com ' + e.name : ''; }
const COURT_LINES = { prince: ['Um dia esse trono será meu... se meu pai deixar.', 'Treino todo dia. A Mão do Rei diz que é perda de tempo.'], princess: ['A biblioteca é o único lugar quieto deste castelo.', 'Meu pai piora a cada dia. O meistre não diz nada.'], servant: ['Com licença, tenho muito o que fazer.', 'A cozinha não para nunca.', 'Se a governanta me pega parada...'], torturer: ['Ninguém mente aqui embaixo por muito tempo.', 'Saia, antes que eu ache um uso para você.'], guard: ['Circulando.', 'Arma guardada perto do rei.', 'A luz não se curva.'], cmd: [] };
function courtMenu(m) {
  if (!m.role) return; const s = m.s || {}, opt = (o, ic, t, sub, extra) => '<button class="lift-btn" data-o="' + o + '"' + (extra || '') + '><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  const tt = s.title ? CROWN_TITLES[s.title].n : 'sem título', head = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">Favor da coroa: <b>' + s.favor + '</b> · ' + tt + (s.vow ? ' · vassalo Aurenfell' : '') + '</div>';
  let body = '', lines = COURT_LINES[m.role];
  if (m.role === 'herald') body = '<div style="padding:6px 14px;font-size:14px">Audiências das ' + s.h0 + 'h às ' + s.h1 + 'h. ' + (s.bad ? 'Hoje quem preside é a Mão do Rei: Sua Majestade está fraco.' : 'Sua Majestade recebe no trono.') + (s.called ? '<br><b>Você foi chamado! Vá até o trono.</b>' : s.queue >= 0 ? '<br>Você é o ' + (s.queue + 1) + 'º da fila.' : '') + '</div><div class="lift-list">' + (s.queue >= 0 || s.called ? opt('leave', '🚶', 'Sair da fila', 'Desistir da audiência de hoje.') : opt('queue', '📜', 'Pedir audiência', s.open ? 'Entrar na fila; o arauto chama a sua vez.' : 'Fora do horário das audiências.')) + '</div>';
  else if (m.role === 'king' || m.role === 'hand') {
    if (!s.called) body = '<div style="padding:10px 14px">' + (m.role === 'king' ? '“Fale com o arauto e espere a sua vez.”' : '“A coroa recebe no horário das audiências.”') + '</div>';
    else { const c = s.con, nm = k => (typeof MON !== 'undefined' && MON[k] ? MON[k].name : k);
      body = '<div class="lift-list">' + (c ? (c.got >= c.n ? opt('turnin', '💰', 'Entregar o contrato', c.n + ' ' + nm(c.mon) + ' · ' + c.g + ' ouro e ' + c.f + ' de favor') : opt('x', '⏳', 'Contrato em andamento', c.got + '/' + c.n + ' ' + nm(c.mon), ' disabled')) : (m.offers || []).map((o, i) => opt('con' + i, ['⚔', '🛡', '👑'][o.t], 'Contrato real: ' + o.n + ' ' + nm(o.mon), o.g + ' ouro e ' + o.f + ' de favor')).join('')) +
        (s.next ? opt('title', '🎖', 'Pedir o título de ' + s.next.n, 'Precisa de ' + s.next.favor + ' de favor e ' + s.next.fee + ' de ouro.') : '') + (s.wanted ? opt('pardon', '⚖', 'Pedir perdão dos seus crimes', '150 de ouro e um pouco de favor.') : '') +
        (s.jailed || []).map(([id, n2, pr, kj]) => opt('free:' + id, '🔓', 'Pedir a soltura de ' + n2, (kj ? 'Calabouço do castelo' : 'Cadeia da cidade') + ' · fiança ' + pr + ' ouro')).join('') +
        (s.vow ? '' : opt('vow', '🤝', 'Jurar lealdade à Casa Aurenfell', 'Vira vassalo da casa no poder (+5 de favor).')) + opt('end', '🚪', 'Encerrar a audiência', 'Dá a vez ao próximo da fila.') + '</div>'; } }
  else if (m.role === 'coin') body = '<div style="padding:6px 14px;font-size:14px">Doações ao tesouro aumentam o favor da coroa (1 por 22 de ouro). Impostos em dia também contam.</div><div class="lift-list">' + [50, 200, 1000].map((v, i) => opt('don' + i, '🪙', 'Doar ' + v + ' de ouro', '+' + Math.round(v / 22) + ' de favor')).join('') + '</div>';
  else if (m.role === 'maester') body = '<div style="padding:6px 14px;font-size:14px">Saúde do rei: <b>' + s.hp + '/100</b>' + (s.bad ? ' · hoje está de cama.' : '') + '</div><div class="lift-list">' + opt('heal', '🩹', 'Tratamento completo', '30 de ouro: vida cheia, sangramentos e infecção.') + opt('herbs', '🌿', 'Entregar 3 ervas para o rei', 'Alivia Sua Majestade (+10 de saúde) e dá 6 de favor.') + '</div>';
  else if (m.role === 'jailer') { const kj = (s.jailed || []).filter(j => j[3]); body = '<div class="lift-list">' + (kj.length ? kj.map(([id, n2, pr]) => opt('bail:' + id, '🔑', 'Pagar a fiança de ' + n2, pr + ' de ouro')).join('') : '<div style="padding:10px 14px">“Ninguém no calabouço agora. Por enquanto.”</div>') + '</div>'; }
  else if (m.role === 'cmd') body = '<div style="padding:10px 14px;line-height:1.45">“Os títulos da coroa: <b>Escudeiro</b> (30 de favor) entra no 1º andar; <b>Cavaleiro</b> (90) no 2º, e a guarda o trata como aliado; <b>Lorde</b> (220) tem assento no conselho e renda diária. Sentar no trono é calabouço, e arma sacada perto do rei é crime.”</div>';
  else body = '<div style="padding:10px 14px">“' + (lines && lines.length ? lines[Math.floor(Math.random() * lines.length)] : '...') + '”</div>';
  const d = staffPanel('courtmenu', m.name, head + body);
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o, send = (a, extra) => Net.send(Object.assign({ t: 'court', id: m.id, a }, extra || {}));
    if (o === 'x') return; if (o.startsWith('con')) send('con', { i: +o.slice(3) }); else if (o.startsWith('don')) send('donate', { i: +o.slice(3) }); else if (o.startsWith('free:')) send('free', { who: o.slice(5) }); else if (o.startsWith('bail:')) send('bail', { who: o.slice(5) }); else { if (o === 'end') d.remove(); send(o); } });
}
