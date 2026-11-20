// ============================================================
//  EMPREGADOS — Agência Mão Amiga e o empregado doméstico
//  (servidor: roda no anfitrião, chamado pelo server.js; lado do jogador: painéis, ordens e a cama desarrumada)
// ============================================================
const EMP_TR = {
  rapido: { n: 'rápido', d: 'anda e trabalha mais depressa', w: 3 },
  caprichoso: { n: 'caprichoso', d: 'a cama que ele arruma dá 15 min de bem descansado (em vez de 12)', w: 4 },
  forte: { n: 'forte', d: 'carrega 12 espaços na mochila (em vez de 8)', w: 2 },
  cozinheiro: { n: 'cozinheiro', d: 'faz ensopado quando há ervas no baú', w: 4 },
};
const EMP_NAMES = { f: ['Rosa', 'Benedita', 'Clara', 'Inês', 'Marta', 'Joana', 'Lúcia', 'Tereza', 'Aurora', 'Filomena', 'Graça', 'Helena'], m: ['Tobias', 'Bento', 'Joaquim', 'Simão', 'Afonso', 'Mateus', 'Rui', 'Gaspar', 'Vicente', 'Lauro', 'Teodoro', 'Caetano'] };
const EMP_LOOKS = { f: ['v_maidf', 'v_maidf2'], m: ['v_maidm', 'v_maidm2'] };
const EMP_FOOD = ['stew', 'pie', 'cookedmeat', 'bread', 'apple', 'berries'];
const SEG_TR = {
  valente: { n: 'valente', d: 'aguenta mais pancada (160 de vida em vez de 120)', w: 3 },
  veterano: { n: 'veterano', d: 'bate mais forte', w: 4 },
  atento: { n: 'atento', d: 'percebe ameaças de mais longe', w: 2 },
  leal: { n: 'leal', d: 'não recua quando está muito ferido', w: 2 },
};
const SEG_NAMES = { f: ['Brites', 'Guiomar', 'Isolda', 'Leonor', 'Matilde', 'Urraca'], m: ['Bruno', 'Duarte', 'Fernão', 'Gonçalo', 'Nuno', 'Rodrigo', 'Martim', 'Vasco'] };
const SEG_LOOKS = { f: ['v_segf'], m: ['v_segm', 'v_segm2'] };
const EMP_TEST = true;   /* versão de teste: uma doméstica e um segurança de salário 0 sempre disponíveis */
const empCap = r => r.tr === 'forte' ? 12 : 8;

// ---------- servidor ----------
function empRng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function empCands() {   /* 6 candidatos por dia do jogo (os contratados somem do quadro) */
  const day = estDay(), R = empRng(day * 7 + 3), out = [], used = new Set(), taken = S.empTaken && S.empTaken.day === day ? S.empTaken.set : new Set();
  for (let k = 0; k < 6; k++) { const seg = k >= 4, g = R() < (seg ? 0.3 : 0.55) ? 'f' : 'm', NM = seg ? SEG_NAMES : EMP_NAMES, TR = seg ? SEG_TR : EMP_TR, LK = seg ? SEG_LOOKS : EMP_LOOKS; let n = ''; for (let t = 0; t < 30 && (!n || used.has(n)); t++) n = NM[g][Math.floor(R() * NM[g].length)]; used.add(n);
    const trs = Object.keys(TR), tr = trs[Math.floor(R() * trs.length)], xp = 1 + Math.floor(R() * 15), w = Math.max(6, Math.min(20, (seg ? 7 : 4) + TR[tr].w + Math.round(xp * 0.6) + Math.floor(R() * 3)));
    out.push({ i: k, role: seg ? 'seg' : 'dom', n, g, tr, xp, w, look: LK[g][Math.floor(R() * LK[g].length)], gone: taken.has(k) }); }
  if (EMP_TEST) out.unshift({ i: 6, role: 'dom', n: 'Miko', g: 'f', tr: 'caprichoso', xp: 9, w: 0, look: 'v_maiko', test: 1 }, { i: 7, role: 'seg', n: 'Bartolomeu', g: 'm', tr: 'veterano', xp: 11, w: 0, look: 'v_segm', test: 1 }, { i: 8, role: 'seg', n: 'Severino', g: 'm', tr: 'leal', xp: 7, w: 0, look: 'v_segm2', test: 1 });
  return out;
}
function empLoad() { const E = estateLoad(); return E.emp || (E.emp = {}); }
function segLoad() { const E = estateLoad(); return E.seg || (E.seg = {}); }
const segList = key => segLoad()[key] || [];
function empOwnerP(key) { return Object.values(S.players).find(q => estOwner(q) === key) || null; }
const empNid = r => 'emp_' + r.id;
function empHome(r) {   /* onde fica a casa: andar, apartamento e um ponto lá dentro */
  const P = PROPS_BY[r.home]; if (!P) return null; const b = BUILDINGS[P.bi];
  if (P.apt) { const A = APTS.find(a => a.key === P.apt && a.bi === P.bi); if (!A) return null; const [x, y] = localToWorld(b, (A.u0 + A.u1) / 2, 2.4); return { P, b, bi: P.bi, fl: A.fl, A, x, y }; }
  const T = bldFreeTiles(P.bi), t = T[Math.floor(T.length / 2)] || [b.x + 1, b.y + 1]; return { P, b, bi: P.bi, fl: 0, A: null, x: t[0], y: t[1] };
}
const empTgt = (H, x, y) => ({ x: x != null ? x : H.x, y: y != null ? y : H.y, fl: H.fl, fb: H.fl ? H.bi : -1 });
function empAtHome(o, H) { if (!o || !H) return false; if ((o.fl || 0) !== H.fl) return false; return H.fl ? o.fb === H.bi && aptAt(H.bi, H.fl, o.x, o.y) === H.A : WORLD.bld[tileAt(o.x, o.y)] === H.bi; }
function empBedIdx(H) { return BEDS.findIndex(bd => H.P.apt ? bd.apt === H.P.apt : (bd.bi === H.bi && !bd.fl)); }
function empSend(r, key) { const q = empOwnerP(key); if (q) Net.toOne(q.id, { t: 'empme', id: empNid(r), n: r.n, g: r.g, tr: r.tr, w: r.w, mode: r.mode, forageOn: r.forageOn ? 1 : 0, inv: r.inv, cap: empCap(r), messy: !!r.messy, warn: r.warn ? 1 : 0, home: (PROPS_BY[r.home] || {}).name || '' }); }
function empSpawn(key, r, atDoor) {
  const id = empNid(r); if (S.npcs[id]) return S.npcs[id]; const H = empHome(r); if (!H) return null; if ((r.n === 'Celina' || r.n === 'Miko') && !r.w) { r.n = 'Miko'; r.look = 'v_maiko'; }   /* a doméstica de teste agora é a maiko Miko */
  let x = H.x, y = H.y, fl = H.fl, fb = H.fl ? H.bi : -1; if (atDoor || H.fl) { const D = doorTiles()[H.bi]; if (D) { x = D.ox; y = D.oy; fl = 0; fb = -1; } }   /* chega pela porta da rua (no prédio do dojô, sobe de elevador) */
  const n = { id, kind: r.look, name: r.n + ', ' + (r.g === 'f' ? 'doméstica' : 'doméstico'), transient: true, emp: key, x, y, z: 0, fl, fb, postX: x, postY: y, hp: 70, maxHp: 70, downed: null, dead: false };
  S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n;
}
function empQuit(key, r, why) {
  const M = empLoad(), q = empOwnerP(key), n = S.npcs[empNid(r)]; delete M[key];
  if (Object.keys(r.inv || {}).length) { const rec = S.estate.r[r.home]; if (rec) { rec.chest = rec.chest || {}; for (const k in r.inv) rec.chest[k] = (rec.chest[k] || 0) + r.inv[k]; } else S.estate.lost[key] = Object.assign(S.estate.lost[key] || {}, r.inv); }   /* o que ele carregava fica no baú */
  if (r.messy) { const H = empHome(r), bi = H ? empBedIdx(H) : -1; if (bi >= 0) Net.toAll({ t: 'bedmess', bed: bi, on: 0 }); }
  if (n) visGone(n); estateSave(); if (q) { tell(q, why); Net.toOne(q.id, { t: 'empme', id: null }); }
}
function empWelcome(to) { const M = S.estate && S.estate.emp; if (!M) return; const p = S.players[to]; for (const key in M) { const r = M[key]; if (r.messy) { const H = empHome(r), bi = H ? empBedIdx(H) : -1; if (bi >= 0) Net.toOne(to, { t: 'bedmess', bed: bi, on: 1 }); } if (p && estOwner(p) === key) setTimeout(() => empSend(r, key), 800); } }
function empMsg(p, m) {
  if (m.a === 'shopcat') { Net.toOne(p.id, { t: 'empshop', l: shopCatalog(p) }); return; }
  if (m.a === 'purse') { const L = S.purses || [], u = L.find(x => x.id === m.id); if (!u || (u.fl || 0) !== (p.fl || 0) || dist(u.x, u.y, p.x, p.y) > 1.6) return; L.splice(L.indexOf(u), 1); p.gold = (p.gold || 0) + u.g; sendStat(p); tell(p, 'Você pegou uma bolsa com ' + u.g + ' de ouro.'); Net.toAll({ t: 'purses', l: L }); return; }
  const key = estOwner(p), M = empLoad(), r = M[key];
  if (m.a === 'cands') { const home = rentalOf(p); Net.toOne(p.id, { t: 'empc', list: empCands(), tr: EMP_TR, str: SEG_TR, home: home ? PROPS_BY[home].name : '', have: r ? r.n : '', segs: segList(key).length }); return; }
  if (m.a === 'sorder') { segOrder(p, key, m); return; }
  if (m.a === 'segans') { segAnswer(p, key, m); return; }
  if (m.a === 'dirty') { segDirty(p, key, m); return; }
  if (m.a === 'hire') {
    const ag = S.npcs.agent; if (!ag || dist(p.x, p.y, ag.x, ag.y) > 4.5) { tell(p, 'Fale com o Mestre Farid, na Casa das Mãos de Ouro.'); return; }
    const day = estDay(), C = empCands().find(c => c.i === (m.i | 0)); if (!C || C.gone) { tell(p, 'Esse candidato já foi contratado.'); return; }
    if (C.role === 'seg') { segHire(p, key, C); return; }
    if (r) { tell(p, 'Você já tem ' + r.n + ' (por enquanto, um doméstico por casa).'); return; }
    const home = rentalOf(p); if (!home) { tell(p, 'Você precisa ter uma casa (alugada ou comprada) para contratar.'); return; }
    const d = C.w ? debit(key, p, C.w) : { bank: 0, cofre: 0, gold: 0 }; if (!d) { tell(p, 'A taxa da agência é ' + C.w + ' de ouro (um dia de salário).'); return; }
    if (!C.test) { if (!S.empTaken || S.empTaken.day !== day) S.empTaken = { day, set: new Set() }; S.empTaken.set.add(C.i); }
    const nr = M[key] = { id: (S.estate.empN = (S.estate.empN || 0) + 1) + 'x' + (Date.now() % 100000), n: C.n, g: C.g, tr: C.tr, xp: C.xp, w: C.w, look: C.look, home, mode: 'home', inv: {}, paid: day, warn: 0, messy: false };
    estateSave(); empSpawn(key, nr, true); empSend(nr, key); sendStat(p);
    tell(p, C.n + ' foi contratad' + (C.g === 'f' ? 'a' : 'o') + (C.w ? ' (taxa de ' + C.w + ' de ouro, ' + debitTxt(d) + ')' : ' (de teste, sem salário)') + ' e já vai para ' + PROPS_BY[home].name + '. Fale com ' + (C.g === 'f' ? 'ela' : 'ele') + ' (F) para dar ordens.');
    near(ag.x, ag.y, { t: 'anim', w: 'n', id: 'agent', a: 'talk', txt: 'Ótima escolha! ' + C.n + ' começa hoje mesmo.', ms: 1 }); empMsg(p, { a: 'cands' }); return; }
  if (!r) return; const n = S.npcs[empNid(r)]; if (!n) return;
  const close = (n.fl || 0) === (p.fl || 0) && dist(n.x, n.y, p.x, p.y) < 3;
  if (m.a === 'order') {
    if (!close && m.o !== 'fire' && m.o !== 'massage') { tell(p, 'Chegue perto de ' + r.n + '.'); return; } const H = empHome(r), nm = r.n;
    if (m.o === 'follow') { r.mode = 'follow'; r.forageOn = 0; n.forage = null; n.goal = null; n.task = null; empSay(n, ['Vou com você.', 'Pode ir na frente.', 'Estou logo atrás.'][Math.floor(Math.random() * 3)]); }
    else if (m.o === 'home') { const was = r.forageOn; r.mode = 'home'; r.forageOn = 0; if (n.forage) { n.forage = null; n.goal = empTgt(H); } else n.goal = null; empSay(n, was ? 'Paro de buscar comida e fico cuidando da casa.' : 'Vou cuidar da casa.'); estateSave(); }
    else if (m.o === 'forage') { r.mode = 'home'; r.forageOn = 1; r.forageT = 0; n.goal = null; n.task = null; const hr = empHour(); estateSave();   /* modo contínuo: sai de dia até mandarem ficar em casa */
      if (dayInfoS().night || hr < 6 || hr >= 16) empSay(n, 'Combinado. Amanhã cedo saio para buscar comida, e todo dia até você mandar parar.'); else if (empFoodNeed(r) <= 0) empSay(n, 'O baú está cheio. Assim que abrir espaço, saio para buscar mais.'); else { n.forage = { t0: now_() }; r.forageT = now_() + 30000; empSay(n, 'Vou buscar comida. Volto antes de escurecer e saio de novo até você mandar parar.'); } }
    else if (m.o === 'shop') { const list = (Array.isArray(m.list) ? m.list : []).map(x => [String(x[0]), String(x[1]), Math.max(1, Math.min(20, x[2] | 0))]).filter(x => S.npcs[x[0]] && tradeCat(S.npcs[x[0]]) && LOOT[x[1]]).slice(0, 12); if (!list.length) { tell(p, 'A lista está vazia.'); return; }
      const est = list.reduce((a, x) => a + shopPrice(S.npcs[x[0]], p, x[1]) * x[2], 0), money = Math.min(p.gold || 0, Math.max(0, Math.floor(+m.money || est))); if (money <= 0) { tell(p, 'Entregue o dinheiro das compras (você não tem ouro na bolsa).'); return; }
      p.gold -= money; sendStat(p); r.forageOn = 0; n.forage = null; n.goal = null; n.task = null; r.shop = { list, i: 0, purse: money, got: {} }; r.mode = 'shop'; empSay(n, 'Vou às compras com ' + money + ' de ouro. Guardo tudo no baú e trago o troco.'); }   /* lista de compras */
    else if (m.o === 'deliver') { if (!Object.keys(r.inv).length) { tell(p, nm + ' não está carregando nada.'); return; } r.mode = 'deliver'; n.goal = null; empSay(n, 'Levo tudo para casa e guardo no baú.'); }
    else if (m.o === 'massage') { if (!empAtHome(p, H)) { tell(p, 'A massagem é em casa.'); return; } r.mode = 'home'; if (p.sleep == null) { r.massage = now_() + 90000; n.goal = null; empSay(n, 'Deite-se na cama que eu já vou.'); estateSave(); empSend(r, key); return; } r.massage = 0; const bd = BEDS[p.sleep]; n.goal = Object.assign(empTgt(H, bd.x + (H.x - bd.x) / (Math.hypot(H.x - bd.x, H.y - bd.y) || 1) * 1.2, bd.y + (H.y - bd.y) / (Math.hypot(H.x - bd.x, H.y - bd.y) || 1) * 1.2), { act: () => empMassage(n, r, p) }); empSay(n, 'Relaxe, eu cuido disso.'); }
    else if (m.o === 'fire') { empQuit(key, r, nm + ' foi dispensad' + (r.g === 'f' ? 'a' : 'o') + '.'); return; }
    estateSave(); empSend(r, key); return; }
  if (m.a === 'give' || m.a === 'take') {
    if (!close) { tell(p, 'Chegue perto de ' + r.n + '.'); return; } const k = String(m.k);
    if (m.a === 'give') { const q2 = Math.min(p.inv[k] || 0, Math.max(1, m.q | 0)); if (!q2 || !LOOT[k]) return; if (!r.inv[k] && Object.keys(r.inv).length >= empCap(r)) { tell(p, 'A mochila de ' + r.n + ' está cheia (' + empCap(r) + ' espaços).'); return; } p.inv[k] -= q2; if (!p.inv[k]) delete p.inv[k]; r.inv[k] = (r.inv[k] || 0) + q2; }
    else { const q2 = Math.min(r.inv[k] || 0, Math.max(1, m.q | 0)); if (!q2) return; if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; } r.inv[k] -= q2; if (!r.inv[k]) delete r.inv[k]; p.inv[k] = (p.inv[k] || 0) + q2; }
    sendStat(p); empSend(r, key); estateSave(); }
}
function empSmoke(n, ms, armed) { n.smoking = ms ? now_() + ms : 0; near(n.x, n.y, { t: 'npcsmoke', id: n.id, on: ms ? 1 : 0, ms, nowp: armed ? 1 : 0 }); if (ms) empSay(n, ['Hora de um cigarrinho.', 'Uma pausa rápida…', 'Que vista bonita daqui.'][Math.floor(Math.random() * 3)]); }
function empSay(n, txt) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt, ms: 1 }); }
function empAnim(n, a, ms, tx, ty) { if (tx != null) n.dir = dirFromVecS(tx - n.x, ty - n.y); n.walk = false; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a, ms, tx, ty }); }
function empMassage(n, r, p) {   /* sobe na cama em seiza ao lado do tronco e massageia as costas por 20 s */
  if (p.sleep == null || !S.players[p.id]) { empSay(n, 'Ué, levantou?'); return; }
  const bd = BEDS[p.sleep], H = empHome(r), len = Math.hypot(bd.dx, bd.dy) || 1, ux = bd.dx / len, uy = bd.dy / len; let px = -uy, py = ux; if (H && (H.x - bd.x) * px + (H.y - bd.y) * py < 0) { px = -px; py = -py; }
  n.x = bd.x + px * 0.42 - ux * 0.12; n.y = bd.y + py * 0.42 - uy * 0.12; n.walk = false; n.legs = null; n.path = null; n.walkKey = null; n.dir = dirFromVecS(-px, -py);
  const hh = bd.apt ? (H && H.A && H.A.suite ? 0.2 : 0.07) : 0.24, lines = ['Relaxe os ombros…', 'Respire fundo…', 'Deixe o peso ir embora…', 'Só mais um pouquinho…'];
  near(n.x, n.y, { t: 'massage', pid: p.id, mid: n.id, on: 1, ms: 20000, h: hh }); const say1 = 1 + Math.floor(Math.random() * 2);
  for (let k = 0; k < 4; k++) setTimeout(() => { if (p.sleep == null || !S.npcs[n.id] || !n.task) return; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'massage', ms: 5000, tx: bd.x, ty: bd.y }); if (k === say1) empSay(n, lines[Math.floor(Math.random() * lines.length)]); }, k * 5000);   /* fala uma vez só por massagem */
  n.task = { until: now_() + 20000, done: () => { near(n.x, n.y, { t: 'massage', pid: p.id, mid: n.id, on: 0 }); if (p.sleep == null || !S.players[p.id]) { empSay(n, 'Levantou antes do fim!'); return; }
    p.hp = p.maxHp; p.cst = cstMaxOf(p); if (p.bleed) for (const k in p.bleed) p.bleed[k] = 0; if (p.body) for (const k in p.body) p.body[k] = Math.max(p.body[k], 100); const t = now_(); p.buffs.warm = Math.max(p.buffs.warm || 0, t + 600000); p.buffs.rested = Math.max(p.buffs.rested || 0, t + 900000);
    tell(p, 'Massagem de ' + r.n + ': vida e fôlego cheios, membros curados, quentinho por 10 minutos e bem descansado por 15.'); sendStat(p); } };
}
// troca de andar no prédio do dojô: anda até a cabine do elevador e aparece no outro andar
function empAptPts(b, A, out) {
  const D = bDims(b)[1], top = A.suite, L = (u, v) => localToWorld(b, u, v);
  const pts = top ? [L(5.4, 2.5), L(6.6, 2.5)] : (() => { const du = A.u0 >= 3 ? 4.5 : 1.5; return [L(du, D - 0.8), L(du, D + 0.5), L(7, D + 0.5)]; })();
  return out ? pts : pts.reverse();
}
function empLine(n, spd, dt) {
  const P = n.fr; if (!P || !P.length) { n.walk = false; return true; }
  const [tx, ty] = P[0], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy), st = spd * dt;
  if (d <= st || d < 0.05) { n.x = tx; n.y = ty; P.shift(); if (!P.length) { n.walk = false; return true; } return false; }
  n.x += dx / d * st; n.y += dy / d * st; n.walk = true; n.dir = dirFromVecS(dx, dy); return false;
}
// ---------- suíte: contornar a mesa baixa (kotatsu e almofadas) ----------
const LOW_RECT = { u0: 2.42, u1: 4.3, v0: 1.2, v1: 4.05 };
function lowHit(a, c) { const R = LOW_RECT; for (let t = 0.04; t < 0.97; t += 0.04) { const u = a[0] + (c[0] - a[0]) * t, v = a[1] + (c[1] - a[1]) * t; if (u > R.u0 + 0.04 && u < R.u1 - 0.04 && v > R.v0 + 0.04 && v < R.v1 - 0.04) return true; } return false; }
function lowDetour(a, c) {
  if (!lowHit(a, c)) return []; const R = LOW_RECT, C = [[R.u0, R.v0], [R.u1, R.v0], [R.u1, R.v1], [R.u0, R.v1]], d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]); let best = null, bd = 1e9;
  for (const k of C) if (!lowHit(a, k) && !lowHit(k, c)) { const L = d(a, k) + d(k, c); if (L < bd) { bd = L; best = [k]; } }
  if (best) return best;
  for (let i = 0; i < 4; i++) for (const j of [(i + 1) % 4, (i + 3) % 4]) { const k = C[i], e = C[j]; if (!lowHit(a, k) && !lowHit(e, c)) { const L = d(a, k) + d(k, e) + d(e, c); if (L < bd) { bd = L; best = [k, e]; } } }
  return best || [];
}
function lowRoute(b, from, pts) {   /* refaz o trajeto em linha reta para dar a volta na área da mesa baixa */
  const out = []; let prev = worldToLocal(b, from[0], from[1]);
  for (const p of pts) { const q = worldToLocal(b, p[0], p[1]); for (const w of lowDetour(prev, q)) out.push(localToWorld(b, w[0], w[1])); out.push(p); prev = q; }
  return out;
}
function empSmokeSpot(H) {   /* varanda do apartamento ou a frente da casa; sem área externa, fuma dentro */
  if (H.fl) { const b = H.b, A = H.A, D = bDims(b)[1], um = A.suite ? 3 : (A.u0 + A.u1) / 2, top = H.fl === floorsOf(b) - 1;
    if (top && !A.suite) return null; const inP = localToWorld(b, um, D - 0.45), outP = localToWorld(b, um, D + 0.35), spot = localToWorld(b, um + (Math.random() < 0.5 ? -0.7 : 0.7), D + 0.55), st = localToWorld(b, um, D + 2);
    const here = worldToLocal(b, H.x, H.y); return { goal: { x: spot[0], y: spot[1], fl: H.fl, fb: H.bi }, fr: [inP, outP, spot], back: [outP, inP, localToWorld(b, here[0], here[1])], dir: dirFromVecS(st[0] - spot[0], st[1] - spot[1]) }; }
  const Dt = typeof doorTiles === 'function' ? doorTiles()[H.bi] : null; if (!Dt) return null;
  const vx = Dt.ox - Dt.x, vy = Dt.oy - Dt.y, vl = Math.hypot(vx, vy) || 1, px = -vy / vl, py = vx / vl;
  for (const sd of [1, -1]) { const x = Dt.ox + vx / vl * 0.6 + px * sd * 1.2, y = Dt.oy + vy / vl * 0.6 + py * sd * 1.2; if (npcStand(x, y, 0.25)) return { goal: { x, y, fl: 0, fb: -1 }, dir: dirFromVecS(vx, vy) }; }   /* ao lado da porta, de frente para a rua */
  return null;
}
function empGo(n, tgt, spd, dt) {
  const fl = n.fl || 0, tfl = tgt.fl || 0;
  if (fl === tfl && (fl === 0 || n.fb === tgt.fb)) {
    if (fl === 0) { const ok = npcWalk(n, tgt.x, tgt.y, spd, dt); return ok || dist(n.x, n.y, tgt.x, tgt.y) < 0.45; }
    const key = Math.round(tgt.x * 4) + ',' + Math.round(tgt.y * 4);
    if (n.frKey !== key) { const b = BUILDINGS[n.fb], A0 = aptAt(n.fb, fl, n.x, n.y), A1 = aptAt(n.fb, fl, tgt.x, tgt.y), pts = []; if (A0 !== A1) { if (A0) pts.push(...empAptPts(b, A0, true)); if (A1) pts.push(...empAptPts(b, A1, false)); } pts.push([tgt.x, tgt.y]); n.fr = (A0 && A0.suite) || (A1 && A1.suite) ? lowRoute(b, [n.x, n.y], pts) : pts; n.frKey = key; }
    return empLine(n, spd, dt);
  }
  if (fl > 0) {   /* sai do apartamento até a cabine e troca de andar */
    const b = BUILDINGS[n.fb], sw = stairWorld(b, 0);
    if (n.frKey !== 'out') { const A0 = aptAt(n.fb, fl, n.x, n.y); n.fr = [...(A0 ? empAptPts(b, A0, true) : []), sw.arrive]; n.frKey = 'out'; }
    if (empLine(n, spd, dt)) { n.frKey = null; n.legs = null; n.path = null; n.walkKey = null;
      if (tfl > 0 && tgt.fb === n.fb) { n.fl = tfl; } else { const [ex, ey] = sw.entry; n.x = ex; n.y = ey; n.fl = 0; n.fb = -1; } }
    return false;
  }
  const b = BUILDINGS[tgt.fb]; if (!b || stairKind(b, 0) !== 'lift') { n.walk = false; return false; }   /* andar de outro prédio: espera embaixo */
  const sw = stairWorld(b, 0), [ex, ey] = sw.entry;
  if (npcWalk(n, ex, ey, spd, dt) || dist(n.x, n.y, ex, ey) < 0.6) { const [ax, ay] = sw.arrive; n.x = ax; n.y = ay; n.fl = tfl; n.fb = tgt.fb; n.frKey = null; n.legs = null; n.path = null; n.walkKey = null; }   /* entra na cabine e aparece no andar */
  return false;
}
function empFollow(n, r, q, dt) {
  const qfl = q.fl || 0, qfb = qfl ? q.fb : -1, same = (n.fl || 0) === qfl && (qfl === 0 || n.fb === qfb), d = same ? dist(n.x, n.y, q.x, q.y) : 99;
  if (qfl > 0 && !(BUILDINGS[qfb] && stairKind(BUILDINGS[qfb], 0) === 'lift') && (n.fl || 0) === 0) { n.walk = false; return; }   /* subiu a escada de outro prédio: espera embaixo */
  if (same && qfl === 0 && d > 28) { n.x = q.x - 1; n.y = q.y; n.legs = null; n.path = null; n.walkKey = null; return; }
  if (d < 1.7) { n.walk = false; n.dir = dirFromVecS(q.x - n.x, q.y - n.y); return; }
  const a = Math.atan2(n.y - q.y, n.x - q.x), tx = q.x + Math.cos(a) * 1.1, ty = q.y + Math.sin(a) * 1.1;
  empGo(n, { x: tx, y: ty, fl: qfl, fb: qfb }, d > 6 ? 2.6 : (r.tr === 'rapido' ? 1.75 : 1.45), dt);
}
function empDeposit(key, r, q) {
  const rec = S.estate.r[r.home]; if (!rec) return; rec.chest = rec.chest || {}; let left = 0;
  for (const k of Object.keys(r.inv)) { if (!rec.chest[k] && Object.keys(rec.chest).length >= estChestSlots(r.home)) { left++; continue; } rec.chest[k] = (rec.chest[k] || 0) + r.inv[k]; delete r.inv[k]; }
  estateSave(); if (q) tell(q, r.n + ' guardou ' + (left ? 'o que coube' : 'tudo') + ' no baú de casa.' + (left ? ' O baú está cheio.' : ''));
}
function empChoose(n, r, H, q, now) {   /* escolhe a próxima tarefa da casa */
  if (sakeReturnTick(n, r, H)) return;   /* bandeja esquecida na borda volta para a cozinha */
  const rec = S.estate.r[r.home], ch = rec ? (rec.chest = rec.chest || {}) : {}, qHome = q && empAtHome(q, H) && !q.downed;
  if (!qHome) r.tubDone = false;
  const hasFood = EMP_FOOD.some(f => ch[f] > 0); if (qHome && (q.food ?? 100) < 55 && !hasFood && now_() > (r.noFoodT || 0)) { r.noFoodT = now_() + 120000; empSay(n, 'Não tem comida no baú. Traga carne crua que eu cozinho.'); }
  if (qHome && q.sleep == null && (((q.food ?? 100) < 55 && hasFood) || (q.water ?? 100) < 55)) {   /* serve comida e água */
    n.goal = Object.assign(empTgt(H, q.x + 0.7, q.y + 0.3), { act: () => { empAnim(n, 'talk', 1, q.x, q.y); n.task = { until: now_() + 1500, done: () => {
      let txt = []; if ((q.water ?? 100) < 55) { q.water = 100; txt.push('água fresca'); }
      if ((q.food ?? 100) < 55) { const k = EMP_FOOD.find(f => ch[f] > 0); if (k) { ch[k]--; if (!ch[k]) delete ch[k]; q.inv[k] = (q.inv[k] || 0) + 1; useItem(q, k); txt.push(LOOT[k].name.toLowerCase()); } else if (now_() > (r.noFoodT || 0)) { r.noFoodT = now_() + 120000; empSay(n, 'Não tem comida no baú. Traga carne crua que eu cozinho.'); } }
      if (txt.length) { empSay(n, 'Aqui está: ' + txt.join(' e ') + '.'); tell(q, r.n + ' serviu ' + txt.join(' e ') + '.'); sendStat(q); estateSave(); } } }; } }); return; }
  if (r.massage && qHome && q.sleep != null && now_() < r.massage) { r.massage = 0; const bd = BEDS[q.sleep], vl = Math.hypot(H.x - bd.x, H.y - bd.y) || 1;   /* você deitou: ela vem fazer a massagem */
    n.goal = Object.assign(empTgt(H, bd.x + (H.x - bd.x) / vl * 1.2, bd.y + (H.y - bd.y) / vl * 1.2), { act: () => empMassage(n, r, q) }); empSay(n, 'Relaxe, eu cuido disso.'); return; }
  if (r.massage && now_() > r.massage) r.massage = 0;
  if (H.P.suite && typeof tubRec === 'function') { const T = tubRec(H.bi), lv = tubLv(T, Date.now()), bathing = Object.values(S.players).some(p2 => p2.bath && p2.bath.bi === H.bi);   /* esvazia a banheira: água fria, ou cheia sem ninguém em casa */
    if (!r.awayT || qHome) r.awayT = qHome ? 0 : (r.awayT || now_());
    if (qHome && T.lever === 1 && lv >= 0.99 && !bathing && !T.cold && !r.tubOff) { const O2 = ofuroOf(H.b); r.tubOff = true;   /* banheira cheia: baixa a alavanca para desligar a água */
      n.goal = Object.assign(empTgt(H, O2.lever[0], O2.lever[1]), { act: () => { empAnim(n, 'lever', 1100, O2.lever[0], O2.lever[1] - 0.6); n.task = { until: now_() + 1200, done: () => { const T2 = tubRec(H.bi), t = Date.now(); if (T2.lever !== 1) return; T2.lv = tubLv(T2, t); T2.t = t; T2.lever = 2; T2.mode = ''; if (!T2.fullG) T2.fullG = gameNow(); Net.toAll(tubPayload(H.bi)); estateSave(); empSay(n, 'O banho está pronto, fechei a água.'); } }; } }); return; }
    if ((T.lever | 0) !== 0 && lv > 0.3 && !bathing && (T.cold || (!qHome && r.awayT && now_() - r.awayT > 90000))) { const O2 = ofuroOf(H.b);
      n.goal = Object.assign(empTgt(H, O2.lever[0], O2.lever[1]), { act: () => { empAnim(n, 'lever', 1100, O2.lever[0], O2.lever[1] - 0.6); n.task = { until: now_() + 1200, done: () => { const T2 = tubRec(H.bi), t = Date.now(); T2.lv = tubLv(T2, t); T2.t = t; T2.lever = 0; T2.mode = T2.lv > 0 ? 'drain' : ''; Net.toAll(tubPayload(H.bi)); estateSave(); r.tubDone = false; empSay(n, T2.cold ? 'A água esfriou, vou trocar.' : 'Esvaziei a banheira.'); } }; } }); return; } }
  if (qHome && H.P.suite && !r.tubDone && typeof tubRec === 'function') { const T = tubRec(H.bi); if (!(T.lever | 0) && tubLv(T, Date.now()) < 0.05) { r.tubOff = false; const O2 = ofuroOf(H.b); r.tubDone = true;   /* prepara o banho na suíte */
    n.goal = Object.assign(empTgt(H, O2.lever[0], O2.lever[1]), { act: () => { empAnim(n, 'lever', 1100, O2.lever[0], O2.lever[1] - 0.6); n.task = { until: now_() + 1200, done: () => { const T2 = tubRec(H.bi), t = Date.now(); T2.lv = tubLv(T2, t); T2.t = t; T2.lever = 1; T2.mode = 'fill'; T2.fullG = 0; T2.cold = false; Net.toAll(tubPayload(H.bi)); estateSave(); empSay(n, 'Preparei o seu banho.'); } }; } }); return; } }
  const bi = empBedIdx(H);
  if (r.messy && bi >= 0 && !Object.values(S.players).some(p2 => p2.sleep === bi)) { const bd = BEDS[bi];   /* arruma a cama */
    const vx = H.x - bd.x, vy = H.y - bd.y, vl = Math.hypot(vx, vy) || 1, sx = bd.x + vx / vl * 1.3, sy = bd.y + vy / vl * 1.3;   /* ao lado da cama, do lado do quarto */
    n.goal = Object.assign(empTgt(H, sx, sy), { act: () => { empAnim(n, 'sweep', 4200, bd.x, bd.y); n.task = { until: now_() + (r.tr === 'rapido' ? 3000 : 4300), done: () => { r.messy = false; Net.toAll({ t: 'bedmess', bed: bi, on: 0 }); estateSave(); empSend(r, n.emp); } }; } }); return; }
  const raw = ['venison', 'pork'].find(k => ch[k] > 0);
  if (raw) { const K = KITCHENS.find(k => k.bi === H.bi && (H.fl ? k.fl === H.fl && aptAt(H.bi, H.fl, k.x, k.y) === H.A : !k.fl));   /* cozinha a carne crua do baú */
    if (K) { n.goal = Object.assign(empTgt(H, K.sx ?? K.x + 0.5, K.sy ?? K.y + 0.8), { act: () => { const stewing = r.tr === 'cozinheiro' && ch.herb > 0; empAnim(n, 'cookfull', 6000, K.fx ?? K.x, K.fy ?? K.y); near(n.x, n.y, { t: 'cookfx', x: K.fx ?? K.x, y: K.fy ?? K.y, fl: H.fl || 0, fb: H.fl ? H.bi : -1, k: K.k || 'stove', kind: stewing ? 'pot' : 'pan', ms: 6000 }); n.task = { until: now_() + 6200, done: () => {
      let made = 0, stew = 0; for (let t = 0; t < 2; t++) { const k = ['venison', 'pork'].find(z => ch[z] > 0); if (!k) break; const toStew = r.tr === 'cozinheiro' && ch.herb > 0, out = toStew ? 'stew' : 'cookedmeat'; if (!ch[out] && Object.keys(ch).length >= ESTATE_CHEST_SLOTS) break; ch[k]--; if (!ch[k]) delete ch[k]; if (toStew) { ch.herb--; if (!ch.herb) delete ch.herb; stew++; } ch[out] = (ch[out] || 0) + 1; made++; }
      if (made) { empSay(n, stew ? 'Fiz um ensopado cheiroso!' : 'A carne está assada, vou guardar no baú.'); estateSave(); const C = H.P && H.P.apt ? APT_CHESTS.find(c => c.apt === H.P.apt) : null; n.plateH = 1; near(n.x, n.y, { t: 'skt', id: n.id, plate: 1 });   /* leva o prato até o baú */
        n.goal = Object.assign(empTgt(H, C ? C.x + 0.6 : H.x, C ? C.y + 0.6 : H.y), { act: () => { empAnim(n, 'gather', 900, C ? C.x : H.x, C ? C.y : H.y); n.task = { until: now_() + 1000, done: () => { n.plateH = 0; near(n.x, n.y, { t: 'skt', id: n.id, plate: 0 }); } }; } }); } } }; } }); return; } }
  if (r.forageOn && now > (r.forageT || 0) && !dayInfoS().night && empHour() >= 6 && empHour() < 16 && empFoodNeed(r) > 0 && !(q && q.bdrink)) { r.forageT = now + 30000; n.forage = { t0: now }; empSay(n, ['Vou buscar mais comida.', 'Saindo para a coleta.', 'Volto antes de escurecer.'][Math.floor(Math.random() * 3)]); return; }   /* modo buscar comida: sai de novo */
  if (now_() > (r.smokeT || (r.smokeT = now_() + 240000 + Math.random() * 360000))) { r.smokeT = now_() + 600000 + Math.random() * 300000;   /* pausa para um cigarro: de preferência lá fora */
    const sp = empSmokeSpot(H), puff = () => { if (sp) n.dir = sp.dir; empSmoke(n, 60000, false); n.task = { until: now_() + 60000, done: () => { empSmoke(n, 0); if (sp && sp.back) { const g = empTgt(H, sp.back[sp.back.length - 1][0], sp.back[sp.back.length - 1][1]); n.goal = g; n.fr = sp.back.slice(); n.frKey = Math.round(g.x * 4) + ',' + Math.round(g.y * 4); } } }; };
    if (sp) { n.goal = Object.assign(sp.goal, { act: puff }); if (sp.fr) { n.fr = sp.fr.slice(); n.frKey = Math.round(sp.goal.x * 4) + ',' + Math.round(sp.goal.y * 4); } return; }
    puff(); return; }
  { let x, y; if (H.fl) { const F = empFreeFloor(H), t = F[Math.floor(Math.random() * F.length)]; if (!t) return; const [ux, uy] = localToWorld(H.b, t[0], t[1]); x = ux; y = uy; } else { const T = bldFreeTiles(H.bi), t = T[Math.floor(Math.random() * T.length)] || [H.x, H.y]; x = t[0]; y = t[1]; }   /* varre a casa */
    n.goal = Object.assign(empTgt(H, x, y), { act: () => { if (Math.random() < 0.6) { empAnim(n, 'sweep', 2800); n.task = { until: now_() + 2900 }; } } }); }
}
function empFreeFloor(H) {   /* pontos de chão livre do apartamento: sem móveis em cima, fora da banheira e do deque */
  const key = H.bi + ':' + H.fl + ':' + H.A.key; EMP_FLOOR[key] = EMP_FLOOR[key] || (() => { const L = interiorLayout(H.b, H.fl).F, D = bDims(H.b)[1], out = [];
    for (let u = H.A.u0; u < H.A.u1; u++) for (let v = 0; v < D; v++) { if (L.some(f => f.t !== 'rug' && u >= f.i && u < f.i + f.w && v >= f.j && v < f.j + f.h)) continue; if (H.A.suite && u < 3 && v < 3) continue; if (H.A.suite && u + 0.5 > LOW_RECT.u0 && u + 0.5 < LOW_RECT.u1 && v + 0.5 > LOW_RECT.v0 && v + 0.5 < LOW_RECT.v1) continue; out.push([u + 0.5, v + 0.5]); }
    return out; })(); return EMP_FLOOR[key];
}
const EMP_FLOOR = {};
// ---------- coleta e caça: de dia, com pouca comida no baú, sai para colher frutas e ervas e caçar cervo ou javali ----------
const EMP_FOODS = ['bread', 'cookedmeat', 'venison', 'pork', 'berries', 'apple', 'stew', 'pie', 'herb'];
function empFoodNeed(r) { const rec = S.estate.r[r.home], ch = (rec && rec.chest) || {}, have = EMP_FOODS.reduce((a, k) => a + (ch[k] || 0), 0), cap = estChestSlots(r.home); return cap - have; }   /* busca comida até encher o baú */
function empForagePick(n, H) {
  const D = doorTiles()[H.bi], ox = D ? D.ox : H.x, oy = D ? D.oy : H.y; let best = null, bd = 1e9;
  for (const m of Object.values(S.monsters)) { if ((m.type !== 'deer' && m.type !== 'boar') || m.hp <= 0 || m.empT) continue; const d = dist(m.x, m.y, ox, oy); if (d < 75 && d < bd) { bd = d; best = { k: 'hunt', id: m.id }; } }
  for (let y = Math.round(oy) - 60; y <= Math.round(oy) + 60; y++) for (let x = Math.round(ox) - 60; x <= Math.round(ox) + 60; x++) { if (!inBounds(x, y)) continue; const i = y * MAP_W + x, o = WORLD.obj[i]; if (o !== O.BERRY && o !== O.HERB) continue; const d = dist(x, y, ox, oy) + 4; if (d < bd) { bd = d; best = { k: o === O.BERRY ? 'berry' : 'herb', i, x, y }; } }
  return best;
}
function empForageTick(n, r, H, now, dt) {
  const F = n.forage, back = () => { n.forage = null; n.goal = Object.assign(empTgt(H), { act: () => { const q = empOwnerP(n.emp); if (Object.keys(r.inv).length) { empDeposit(n.emp, r, null); empSay(n, 'Trouxe comida para o baú.'); if (q) tell(q, r.n + ' voltou da coleta e guardou comida no baú.'); } } }); };
  { const hr = empHour(); if (hr >= 17.5 || hr < 6 || dayInfoS().night) { if (!F.late) { F.late = 1; empSay(n, 'Está escurecendo, melhor voltar.'); } back(); return; } }   /* sempre volta antes de anoitecer */
  if (now - F.t0 > 240000 || (F.n || 0) >= 4 || empFoodNeed(r) - Object.keys(r.inv).reduce((a, k) => a + (EMP_FOODS.includes(k) ? r.inv[k] : 0), 0) <= 0) { back(); return; }
  if (!F.tgt) { F.tgt = empForagePick(n, H); if (!F.tgt) { back(); return; } F.hit = 0; }
  const T = F.tgt, spd = r.tr === 'rapido' ? 1.6 : 1.3;
  if ((n.fl || 0) > 0) { empGo(n, { x: H.x, y: H.y, fl: 0, fb: -1 }, spd, dt); return; }
  if (T.k === 'hunt') { const m = S.monsters[T.id]; if (!m || m.hp <= 0) { F.tgt = null; return; } const d = dist(n.x, n.y, m.x, m.y); if (d > 1.2) { npcWalk(n, m.x, m.y, d > 4 ? 2.2 : spd, dt); return; }
    n.walk = false; n.dir = dirFromVecS(m.x - n.x, m.y - n.y); if (now < (F.next || 0)) return; F.next = now + 900; m.empT = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'punch', ms: 520, tx: m.x, ty: m.y }); near(m.x, m.y, { t: 'hit', k: 'm', id: m.id, x: m.x, y: m.y, dmg: 15, ax: n.x, ay: n.y });
    if (++F.hit >= 3) { const k = m.type === 'deer' ? 'venison' : 'pork', q2 = 1 + (Math.random() < 0.5 ? 1 : 0); delete S.monsters[m.id]; near(m.x, m.y, { t: 'mdie', id: m.id, d: 0 }); if (r.inv[k] || Object.keys(r.inv).length < empCap(r)) r.inv[k] = (r.inv[k] || 0) + q2; F.n = (F.n || 0) + 1; F.tgt = null; empSay(n, m.type === 'deer' ? 'Um cervo! Vai virar um bom assado.' : 'Javali para o ensopado!'); }
    return; }
  const d = dist(n.x, n.y, T.x, T.y); if (WORLD.obj[T.i] !== (T.k === 'berry' ? O.BERRY : O.HERB)) { F.tgt = null; return; }
  if (d > 1.3) { npcWalk(n, T.x, T.y, spd, dt); return; }
  n.walk = false; n.dir = dirFromVecS(T.x - n.x, T.y - n.y); if (!F.g) { F.g = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'gather', ms: 1500, tx: T.x, ty: T.y }); return; } if (now - F.g < 1500) return; F.g = 0;
  const k = T.k === 'berry' ? 'berries' : 'herb', q2 = T.k === 'berry' ? 2 + (Math.random() < 0.5 ? 1 : 0) : 1; if (r.inv[k] || Object.keys(r.inv).length < empCap(r)) r.inv[k] = (r.inv[k] || 0) + q2;
  setObj(T.i, T.k === 'berry' ? O.BUSH : O.NONE); (S.objBack = S.objBack || []).push({ i: T.i, o: T.k === 'berry' ? O.BERRY : O.HERB, at: now_() + (T.k === 'berry' ? 240000 : 300000) }); F.n = (F.n || 0) + 1; F.tgt = null;
}
function bathDrinkStart(p) {
  const B = p.bath; if (!B) return; if (B.mode !== 'seat' || B.seat !== 3) { tell(p, 'Para beber saquê, sente no canto livre da banheira (o oposto às paredes).'); return; }
  if (p.bdrink) { tell(p, p.bdrink.tray ? 'Seu copinho já está na beirada.' : 'O saquê já está a caminho.'); return; }
  const r = S.estate && S.estate.emp && S.estate.emp[estOwner(p)]; if (!r) { tell(p, 'Não há quem sirva: contrate uma doméstica na Casa das Mãos de Ouro.'); return; }
  p.bdrink = { left: 0, next: 1e15, tray: S.skTray && S.skTray[p.fb] === 'rim' ? 1 : 0 }; near(p.x, p.y, { t: 'bdrink', id: p.id, left: 0, tray: p.bdrink.tray });
  if (p.bdrink.tray) { p.bdrink.emptyT = 0; tell(p, 'A bandeja já está na beirada.'); } else tell(p, r.n + ' vai buscar o saquê na cozinha.');
}
function bathDrinkTick(p, now) {
  const D = p.bdrink; if (!p.bath) { p.bdrink = null; near(p.x, p.y, { t: 'bdrink', id: p.id, off: 1 }); return; } if (D.pouring) return;
  if (!D.tray) { if (!D.fetching && now > (D.retry || 0)) { if (sakeFetch(p)) D.fetching = 1; else { D.retry = now + 5000; if (!D.told) { D.told = 1; tell(p, 'A doméstica traz o saquê assim que voltar para casa.'); } } } return; }   /* a bandeja ainda não chegou */
  if (D.left > 0 && now >= D.next) { D.left--; D.next = now + 32000; p.buffs.tipsy = Math.max(p.buffs.tipsy || 0, now) + 90000; p.buffs.warm = Math.max(p.buffs.warm || 0, now + 300000); near(p.x, p.y, { t: 'bdrink', id: p.id, left: D.left, sip: 1 }); sendStat(p); if (!D.left) D.emptyT = now + 7000; return; }
  if (!D.left && now > (D.emptyT || 0) && !D.asked) { if (sakeServe(p)) D.asked = 1; else { D.emptyT = now + 20000; if (!D.told) { D.told = 1; tell(p, 'O copinho esvaziou. Quando a doméstica estiver em casa, ela vem servir.'); } } }   /* tenta de novo quando ela voltar */
}
const SAKE_KNEEL = [2.3, 1.55], SAKE_CUP = [1.86, 1.55];   /* onde ela ajoelha (um passo atrás da borda) e o copinho na bandeja */
function sakeHome(p) { const key = estOwner(p), r = S.estate && S.estate.emp && S.estate.emp[key]; if (!r || r.mode !== 'home' || r.forageOn && false) return null; const n = S.npcs[empNid(r)], H = empHome(r); if (!n || n.dead || n.forage || !H || !empAtHome(n, H) || !H.fl || H.bi !== p.fb) return null; return { r, n, H }; }
function sakeKitchen(H) { const K = KITCHENS.find(k => k.bi === H.bi && k.fl === H.fl && k.k === 'jkitchen' && aptAt(H.bi, H.fl, k.x, k.y) === H.A) || KITCHENS.find(k => k.bi === H.bi && k.fl === H.fl && aptAt(H.bi, H.fl, k.x, k.y) === H.A); return K ? { x: K.sx ?? K.x, y: K.sy ?? K.y, fx: K.fx ?? K.x, fy: K.fy ?? K.y } : { x: H.x, y: H.y, fx: H.x, fy: H.y }; }
function skTraySet(bi, at, fl) { S.skTray = S.skTray || {}; if (at) S.skTray[bi] = at; else delete S.skTray[bi]; const b = BUILDINGS[bi]; Net.toAll({ t: 'sktray', bi, at: at || null }); }
function skCarry(n, on) { n.trayH = on ? 1 : 0; near(n.x, n.y, { t: 'skt', id: n.id, on: on ? 1 : 0 }); }
function sakeFetch(p) {   /* a doméstica pega a bandeja na bancada da cozinha e a leva até a borda da banheira */
  const M = sakeHome(p); if (!M) return false; const { r, n, H } = M, K = sakeKitchen(H), b = BUILDINGS[p.fb], [kx, ky] = localToWorld(b, SAKE_KNEEL[0], SAKE_KNEEL[1]), [cx, cy] = localToWorld(b, SAKE_CUP[0], SAKE_CUP[1]);
  n.task = null; empSay(n, 'Vou buscar o saquê.');
  n.goal = Object.assign(empTgt(H, K.x, K.y), { act: () => { empAnim(n, 'gather', 900, K.fx, K.fy); n.task = { until: now_() + 1000, done: () => { skCarry(n, 1);   /* pega a bandeja na bancada */
    n.goal = Object.assign(empTgt(H, kx, ky), { act: () => { n.dir = dirFromVecS(cx - n.x, cy - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'kneelput', ms: 1600, tx: cx, ty: cy }); n.task = { until: now_() + 1500, done: () => { skCarry(n, 0); skTraySet(p.fb, 'rim');   /* ajoelha e deixa a bandeja na borda */
      if (p.bdrink && p.bath) { p.bdrink.tray = 1; p.bdrink.fetching = 0; p.bdrink.left = 0; p.bdrink.asked = 0; p.bdrink.emptyT = 0; near(p.x, p.y, { t: 'bdrink', id: p.id, left: 0, tray: 1 }); } } }; } }); } }; } });
  return true;
}
function sakeReturnTick(n, r, H) {   /* banho acabou: leva a bandeja de volta para a bancada */
  if (!S.skTray || S.skTray[H.bi] !== 'rim' || !H.fl) return false; const q = empOwnerP(n.emp); if (q && q.bath && q.bdrink && q.fb === H.bi) return false;
  const b = BUILDINGS[H.bi], K = sakeKitchen(H), [kx, ky] = localToWorld(b, SAKE_KNEEL[0], SAKE_KNEEL[1]), [cx, cy] = localToWorld(b, SAKE_CUP[0], SAKE_CUP[1]);
  n.goal = Object.assign(empTgt(H, kx, ky), { act: () => { if (!S.skTray || S.skTray[H.bi] !== 'rim') return; n.dir = dirFromVecS(cx - n.x, cy - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'kneelput', ms: 1600, tx: cx, ty: cy }); n.task = { until: now_() + 1500, done: () => { skTraySet(H.bi, null); skCarry(n, 1);
    n.goal = Object.assign(empTgt(H, K.x, K.y), { act: () => { empAnim(n, 'gather', 900, K.fx, K.fy); n.task = { until: now_() + 1000, done: () => skCarry(n, 0) }; } }); } }; } });
  empSay(n, 'Vou guardar a bandeja.'); return true;
}
// ---------- compras da doméstica ----------
function shopPrice(t, p, k) { try { return tSellPrice(t, p || {}, k); } catch (e) { return Math.max(1, Math.ceil(tBase(k) * 1.2)); } }
function shopCatalog(p) {   /* lojas com vendedor e o que vendem agora */
  const out = []; for (const t of Object.values(S.npcs || {})) { if (t.dead || t.transient || t.trader || !tradeCat(t)) continue; const T = tradeStock(t), items = Object.entries(T.stock).filter(([k, q]) => q > 0 && LOOT[k] && !k.startsWith('pot_') && tBase(k)).map(([k, q]) => [k, tName(k), shopPrice(t, p, k), q]); if (items.length) out.push({ id: t.id, n: t.name.split(',')[0], items }); }
  return out;
}
function shopTick(n, r, H, q, now, dt, spd) {
  const S2 = r.shop; if (!S2) { r.mode = 'home'; return; }
  if (S2.i < S2.list.length) { const [tid, k, qty] = S2.list[S2.i], t = S.npcs[tid]; if (!t || t.dead) { S2.i++; return; }
    const tgt = { x: t.x + 0.8, y: t.y + 0.6, fl: 0, fb: -1 }; if (!(empGo(n, tgt, spd, dt) || ((n.fl || 0) === 0 && dist(n.x, n.y, t.x, t.y) < 1.6))) return;
    if (!n.task) { n.dir = dirFromVecS(t.x - n.x, t.y - n.y); const T = tradeStock(t), price = shopPrice(t, q, k), can = Math.min(qty, T.stock[k] || 0, Math.floor(S2.purse / price)), room = r.inv[k] || Object.keys(r.inv).length < Math.max(empCap(r), 8);
      if (can > 0 && room) { T.stock[k] -= can; S2.purse -= can * price; r.inv[k] = (r.inv[k] || 0) + can; S2.got[k] = (S2.got[k] || 0) + can; const rb = typeof npcBiz === 'function' ? npcBiz(t) : null; if (rb && rb.biz) { rb.biz.cofre += can * price; if (rb.biz.today) rb.biz.today.rev += can * price; } empSay(n, 'Comprei ' + can + 'x ' + tName(k) + '.'); }
      else empSay(n, can <= 0 ? (T.stock[k] > 0 ? 'Não deu o dinheiro para ' + tName(k) + '.' : tName(k) + ' estava em falta.') : 'A cesta está cheia.');
      empAnim(n, 'gather', 900, t.x, t.y); n.task = { until: now + 1000, done: () => { S2.i++; } }; }
    return; }
  if (!empGo(n, empTgt(H), spd, dt)) return;   /* volta para casa, guarda e devolve o troco */
  empDeposit(n.emp, r, q); const ch = S2.purse, got = Object.entries(S2.got).map(([k, v]) => v + 'x ' + tName(k)).join(', ') || 'nada';
  if (ch > 0) { if (q) { q.gold = (q.gold || 0) + ch; sendStat(q); } else { const B = bankLoad(), A = B.acc[n.emp] || (B.acc[n.emp] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += ch; bankSave(); } }
  if (q) tell(q, r.n + ' voltou das compras: ' + got + ' no baú.' + (ch > 0 ? ' Troco: ' + ch + ' de ouro' + (q ? '.' : ' (no banco).') : ''));
  empSay(n, 'Tudo guardado no baú.'); r.shop = null; r.mode = 'home'; estateSave(); empSend(r, n.emp);
}
function sakeServe(p) {   /* a doméstica vem até a beira, ajoelha e serve com a garrafinha */
  const key = estOwner(p), r = S.estate && S.estate.emp && S.estate.emp[key]; if (!r || r.mode !== 'home') return false; const n = S.npcs[empNid(r)]; if (!n || n.dead || (n.fl || 0) !== (p.fl || 0) || ((n.fl || 0) && n.fb !== p.fb)) return false;
  const b = BUILDINGS[p.fb], [sx2, sy2] = localToWorld(b, SAKE_KNEEL[0], SAKE_KNEEL[1]), [cx, cy] = localToWorld(b, SAKE_CUP[0], SAKE_CUP[1]);   /* ajoelha um passo atrás da borda, de frente para o copinho */
  n.task = null; n.forage = null; n.goal = { x: sx2, y: sy2, fl: p.fl || 0, fb: p.fl ? p.fb : -1, act: () => { if (!p.bdrink || !p.bath) return; n.dir = dirFromVecS(cx - n.x, cy - n.y); p.bdrink.pouring = 1; const t0 = now_();
    near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'pour', ms: 6000, tx: cx, ty: cy }); near(p.x, p.y, { t: 'bdrink', id: p.id, left: 0, pour: 1, mid: n.id });
    n.task = { until: t0 + 6300, done: () => { if (!p.bdrink) return; p.bdrink.pouring = 0; p.bdrink.left = 3; p.bdrink.asked = 0; p.bdrink.next = now_() + 9000; near(p.x, p.y, { t: 'bdrink', id: p.id, left: 3 }); } }; } };
  empSay(n, 'Já vou servir mais saquê.'); return true;
}
function empHour() { return typeof resHour === 'function' ? resHour() : 12; }
function empNpcTick(n, now, dt) {
  const M = empLoad(), r = M[n.emp]; if (!r || empNid(r) !== n.id) { visGone(n); return; }
  const H = empHome(r); if (!H) return; const q = empOwnerP(n.emp), spd = r.tr === 'rapido' ? 1.4 : 1.05;
  if (n.task) { if (now < (n.task.until || 0)) { n.walk = false; return; } const T = n.task; n.task = null; if (T.done) T.done(); }
  if (r.mode === 'follow') { if (!q) { r.mode = 'home'; return; } empFollow(n, r, q, dt); return; }
  if (r.mode === 'shop') { shopTick(n, r, H, q, now, dt, spd); return; }
  if (r.mode === 'deliver') { if (empGo(n, empTgt(H), spd, dt)) { empDeposit(n.emp, r, q); r.mode = 'home'; empSend(r, n.emp); } return; }
  if (n.forage) { empForageTick(n, r, H, now, dt); return; }
  if (n.goal) { if (empGo(n, n.goal, spd, dt)) { const g = n.goal; n.goal = null; n.walk = false; if (g.act) g.act(); } return; }
  if (!empAtHome(n, H)) { n.goal = empTgt(H); return; }
  if (now < (n.nextT || 0)) return; n.nextT = now + (r.tr === 'rapido' ? 5000 : 8000) + Math.random() * 6000;
  empChoose(n, r, H, q, now);
}
function empTick(now) {   /* uma vez por segundo: garante o NPC no mundo e cobra o salário do dia */
  if (now - (S.empT || 0) < 1000) return; S.empT = now; const E = S.estate; if (!E) return; segTick(now); if (!E.emp) return; const day = estDay();
  for (const key of Object.keys(E.emp)) { const r = E.emp[key], rec = E.r[r.home];
    if (!rec || rec.owner !== key) { empQuit(key, r, r.n + ' foi embora: você não tem mais a casa.'); continue; }
    if (r.n === 'Celina' && !r.w) { r.n = 'Miko'; r.look = 'v_maiko'; const o = S.npcs[empNid(r)]; if (o) visGone(o); empSend(r, key); estateSave(); }   /* Celina virou a maiko Miko (renasce com o visual novo) */
    if (!S.npcs[empNid(r)]) empSpawn(key, r);
    if (r.pendMessy) { const q = empOwnerP(key); if (!q || q.sleep == null) { r.pendMessy = 0; r.messy = true; const H = empHome(r), bi = H ? empBedIdx(H) : -1; if (bi >= 0) Net.toAll({ t: 'bedmess', bed: bi, on: 1 }); estateSave(); empSend(r, key); } }
    if ((r.paid || 0) < day && !r.w) r.paid = day;
    if ((r.paid || 0) < day) { const q = empOwnerP(key), d = debit(key, q, r.w);
      if (d) { r.paid = day; r.warn = 0; if (q) { tell(q, 'Salário de ' + r.n + ': -' + r.w + ' de ouro (' + debitTxt(d) + ').'); sendStat(q); empSend(r, key); } estateSave(); }
      else if (!r.warn) { r.warn = day; if (q) { tell(q, r.n + ': "Meu salário (' + r.w + ' de ouro) não foi pago. Se amanhã também faltar, vou embora."'); empSend(r, key); } estateSave(); }
      else if (day > r.warn) { if (q) repAdd(q, 'cidade', -3, r.n + ' foi embora sem receber'); empQuit(key, r, r.n + ' foi embora: dois dias sem salário.'); } }
  }
}
function segTickAll(now) { if (typeof segTick === 'function') segTick(now); }
function empGather(p, item, x, y, anim) {   /* seguindo você, o doméstico coleta junto (no recurso ao lado) */
  const M = S.estate && S.estate.emp, r = M && M[estOwner(p)]; if (!r || r.mode !== 'follow' || !LOOT[item]) return; const n = S.npcs[empNid(r)]; if (!n || (n.fl || 0) !== (p.fl || 0) || dist(n.x, n.y, p.x, p.y) > 4) return;
  if (!r.inv[item] && Object.keys(r.inv).length >= empCap(r)) { if (Math.random() < 0.3) empSay(n, 'Minha mochila está cheia.'); return; }
  r.inv[item] = (r.inv[item] || 0) + 1; empAnim(n, anim || 'gather', 750, x, y); if (Math.random() < 0.25) empSend(r, estOwner(p));
}
function empSlept(p) {   /* acordou depois de dormir em casa: a cama fica desarrumada; se estava arrumada pelo doméstico, descansa mais */
  const M = S.estate && S.estate.emp, r = M && M[estOwner(p)]; if (!r) return 600000; const ms = r.messy ? 600000 : (r.tr === 'caprichoso' ? 900000 : 720000);
  r.pendMessy = 1;   /* a cama fica desarrumada quando ele levantar */
  return ms;
}

// ---------- lado do jogador ----------
if (typeof G !== 'undefined') { G.emp = null; G.bedMess = G.bedMess || {}; }
if (typeof progEvent === 'function') { const _peS = progEvent; progEvent = function (m, now) {
  if (m.t === 'empc') { agencyRender(m); return true; }
  if (m.t === 'empme') { G.emp = m.id ? m : null; if (document.getElementById('empmenu')) empMenu(); if (document.getElementById('empbag')) empBag(); return true; }
  if (m.t === 'massage') { const pl = G.players[m.pid]; if (pl) pl.massageUntil = m.on ? performance.now() + (m.ms || 20000) : 0; const md = G.npcs[m.mid]; if (md) md.z = m.on ? (m.h || 0) * HV / FLOOR_PX : 0; return true; }   /* de bruços, e ela em cima da cama */
  if (m.t === 'empshop') { empShopMenu(m.l || []); return true; }
  if (m.t === 'purses') { G.purses = m.l || []; return true; }
  if (m.t === 'skt') { const e = G.npcs[m.id]; if (e) { if (m.plate != null) e.plateH = m.plate; else e.trayH = m.on ? 1 : 0; } return true; }
  if (m.t === 'cookfx') { (G.cookFx = G.cookFx || []).push({ ...m, t0: performance.now() }); return true; }
  if (m.t === 'sktray') { G.skTray = G.skTray || {}; if (m.at) G.skTray[m.bi] = m.at; else delete G.skTray[m.bi]; return true; }
  if (m.t === 'pplauto') { G.pplAuto = !!m.on; if (!m.on) G.pTarget = null; pplBtnSync(); return true; }
  if (m.t === 'autoatk') { G.autoAtk = !!m.on; let el = document.getElementById('autoatk-ind'); if (!el) { el = document.createElement('div'); el.id = 'autoatk-ind'; el.style.cssText = 'position:fixed;left:50%;bottom:calc(118px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);padding:4px 12px;border-radius:12px;background:rgba(20,14,10,.78);color:#f0d890;font:600 13px Alegreya Sans,system-ui,sans-serif;border:1px solid #8a6a30;pointer-events:none;z-index:30'; el.textContent = '⟳ Ataque automático · R desliga'; document.body.appendChild(el); } el.hidden = !m.on; return true; }   /* aviso do ataque automático */
  if (m.t === 'bdrink') { const e = G.players[m.id]; if (e) { if (m.off) e.bdrink = null; else { e.bdrink = e.bdrink || {}; e.bdrink.left = m.left; if (m.sip) e.bdrink.sipT = performance.now(); if (m.pour) { e.bdrink.pourT = performance.now(); e.bdrink.mid = m.mid; } if (m.tray != null) e.bdrink.tray = m.tray; } } return true; }
  if (m.t === 'npcsmoke') { const e = G.npcs[m.id]; if (e) e.smokeN = m.on ? { t0: performance.now(), until: performance.now() + (m.ms || 60000), nowp: m.nowp } : null; if (e && !m.on && e.custP && e.custP.cig) e.custP = null; return true; }
  if (m.t === 'bedmess') { if (m.on) G.bedMess[m.bed] = 1; else delete G.bedMess[m.bed]; return true; }
  return _peS(m, now);
}; }
function staffPanel(id, title, html) {
  let d = document.getElementById(id); if (d) d.remove(); d = document.createElement('div'); d.id = id; d.className = 'gpanel lift-panel'; d.style.width = 'min(560px, calc(100vw - 32px))'; d.style.maxHeight = '80vh'; d.style.overflowY = 'auto';
  d.innerHTML = '<div class="gp-head"><span>' + title + '</span><button class="gp-x" data-x>✕</button></div>' + html; document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove(); return d;
}
function agencyOpen() { Net.send({ t: 'emp', a: 'cands' }); }
function agencyRender(m) {
  const face = c => { const skin = ['#e8c49a', '#c89a74', '#a8764e', '#f0d0b0'][c.n.length % 4], cl = { v_maiko: '#6a1420', v_maidf: '#6a4a5a', v_maidf2: '#3a4e6e', v_maidm: '#4a5a4a', v_maidm2: '#6a4a2e', v_segm: '#5a4030', v_segm2: '#3a4048', v_segf: '#4a3a40' }[c.look] || '#555';
    return '<span style="display:inline-block;width:38px;height:38px;border-radius:50%;background:' + cl + ';position:relative;flex:none"><span style="position:absolute;left:10px;top:5px;width:18px;height:18px;border-radius:50%;background:' + skin + '"></span>' + (c.g === 'f' ? '<span style="position:absolute;left:8px;top:2px;width:22px;height:8px;border-radius:8px 8px 2px 2px;background:#b84a3a"></span>' : '') + '<span style="position:absolute;left:12px;top:24px;width:14px;height:10px;background:#f4efe2;border-radius:2px"></span></span>'; };
  const head = '<div style="padding:10px 14px 4px;font-size:14px;opacity:.85">' + (m.home ? 'Sua casa: <b>' + m.home + '</b>. ' : '<b>Para um doméstico você precisa ter uma casa</b> (alugada ou comprada). ') + (m.have ? 'Doméstico: ' + m.have + '. ' : '') + 'Seguranças: ' + (m.segs || 0) + '/2. Na contratação a agência cobra um dia de salário.</div>';
  const rows = m.list.map(c => { const seg = c.role === 'seg', TR = seg ? m.str : m.tr, off = seg ? (m.segs || 0) >= 2 : (m.have || !m.home);
    return '<div style="display:flex;gap:10px;align-items:center;padding:8px 14px;border-top:1px solid rgba(255,255,255,.08);' + (c.gone ? 'opacity:.4;' : '') + (c.test ? 'background:rgba(200,170,80,.08);' : '') + '">' + face(c) + '<div style="flex:1;min-width:0"><b>' + c.n + '</b> · ' + (seg ? 'segurança' : c.g === 'f' ? 'doméstica' : 'doméstico') + ' · ' + c.xp + ' ano' + (c.xp > 1 ? 's' : '') + (seg ? ' de espada' : ' de casa') + (c.test ? ' · <b style="color:#e8c060">teste</b>' : '') + '<br><small><b>' + TR[c.tr].n + '</b>: ' + TR[c.tr].d + '</small></div><div style="text-align:right;flex:none"><b>' + (c.w || 'sem') + '</b> ' + (c.w ? 'ouro/dia' : 'salário') + '<br>' + (c.gone ? '<small>contratado</small>' : '<button class="lift-btn" style="padding:4px 10px;margin-top:4px" data-h="' + c.i + '"' + (off ? ' disabled' : '') + '>Contratar</button>') + '</div></div>'; }).join('');
  const d = staffPanel('agencymenu', 'Casa das Mãos de Ouro · candidatos de hoje', head + rows + '<div style="padding:8px 14px 12px;font-size:13px;opacity:.7">Os candidatos mudam todo dia. O salário sai sozinho todo dia (primeiro do banco). Sem pagamento, o empregado avisa e vai embora no dia seguinte.</div>');
  d.querySelectorAll('[data-h]').forEach(b => b.onclick = () => Net.send({ t: 'emp', a: 'hire', i: +b.dataset.h }));
}
function empNear() { const E = G.emp, e = E && G.npcs[E.id], me = G.me; if (!e || !me || me.downed || me.bathing) return null; if ((e.fl || 0) !== (me.fl || 0)) return null; return Math.hypot((e.rx ?? e.x) - me.x, (e.ry ?? e.y) - me.y) < 1.6 ? e : null; }
function empPrompt() { const E = G.emp; return 'F: falar com ' + E.n + ' (' + (E.g === 'f' ? 'sua doméstica' : 'seu doméstico') + ')'; }
function empMenu() {
  const E = G.emp; if (!E) { const d = document.getElementById('empmenu'); if (d) d.remove(); return; }
  const n = Object.keys(E.inv || {}).length, opt = (o, ic, t, sub) => '<button class="lift-btn" data-o="' + o + '"><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  const html = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">' + E.n + ' · ' + EMP_TR[E.tr].n + ' · ' + E.w + ' ouro/dia · ' + E.home + (E.warn ? ' · <b style="color:#e88">salário atrasado</b>' : '') + '</div><div class="lift-list" style="padding-top:8px">' +
    (E.mode === 'follow' ? opt('home', '🏠', 'Fique em casa', 'Volta para casa e cuida das tarefas.') : opt('follow', '👣', 'Me siga', 'Anda atrás de você e coleta junto.')) +
    opt('bag', '🧺', 'Carregar (' + n + '/' + E.cap + ')', 'Passe itens para a mochila dele ou pegue de volta.') + opt('deliver', '📦', 'Leve isto para casa', 'Volta sozinho e guarda tudo no baú.') + opt('massage', '💆', 'Massagem', 'Em casa, deitado na cama: fôlego, vida e membros.') + opt('shop', '🛒', 'Fazer compras', 'Monte uma lista nas lojas da cidade, entregue o dinheiro e ela compra, guarda no baú e devolve o troco.') + (E.forageOn ? opt('home', '🏠', 'Voltar para casa', 'Para de buscar comida e volta a cuidar da casa.') : opt('forage', '🍓', 'Buscar comida', 'Todo dia: sai para colher frutas e ervas e caçar cervo ou javali, volta antes de escurecer, guarda no baú e sai de novo. Continua até você mandar ficar em casa.')) + opt('fire', '✋', 'Dispensar', 'Encerra o contrato.') + '</div>';
  const d = staffPanel('empmenu', E.n, html);
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; if (o === 'bag') { d.remove(); empBag(); return; } if (o === 'shop') { d.remove(); Net.send({ t: 'emp', a: 'shopcat' }); return; } if (o === 'fire' && !confirm('Dispensar ' + E.n + '?')) return; d.remove(); Net.send({ t: 'emp', a: 'order', o }); });
}
function empShopMenu(L) {
  const cart = {}; const key = (s0, k) => s0 + '|' + k;
  const render = () => { let tot = 0; for (const c in cart) { const [sid, k] = c.split('|'), sh = L.find(x => x.id === sid), it = sh && sh.items.find(i => i[0] === k); if (it) tot += it[2] * cart[c]; }
    const h = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">Escolha os itens. Ela leva o dinheiro, compra loja por loja e guarda no baú.</div>' + L.map(sh => '<div style="padding:8px 14px 2px"><b>' + sh.n + '</b></div>' + sh.items.map(([k, nm, pr, q]) => '<div style="display:flex;align-items:center;gap:8px;padding:2px 14px"><span style="flex:1">' + nm + ' <small style="opacity:.7">' + pr + ' ouro · ' + q + ' em estoque</small></span><button class="est-btn ghost" data-m="' + key(sh.id, k) + '">−</button><b style="min-width:20px;text-align:center">' + (cart[key(sh.id, k)] || 0) + '</b><button class="est-btn ghost" data-p="' + key(sh.id, k) + '" data-max="' + q + '">+</button></div>').join('')).join('') +
      '<div style="padding:12px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span>Total: <b>' + tot + '</b> de ouro · na bolsa: ' + (G.me.gold || 0) + '</span><button class="lift-btn" data-go style="flex:0 0 auto"' + (tot && tot <= (G.me.gold || 0) ? '' : ' disabled') + '>Entregar ' + tot + ' e mandar</button></div>';
    const d = staffPanel('empshop', 'Lista de compras', h);
    d.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const c = b.dataset.p; cart[c] = Math.min(+b.dataset.max, (cart[c] || 0) + 1); render(); });
    d.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const c = b.dataset.m; cart[c] = Math.max(0, (cart[c] || 0) - 1); if (!cart[c]) delete cart[c]; render(); });
    const go = d.querySelector('[data-go]'); if (go) go.onclick = () => { const list = Object.entries(cart).map(([c, n]) => { const [sid, k] = c.split('|'); return [sid, k, n]; }); Net.send({ t: 'emp', a: 'order', o: 'shop', list, money: tot }); d.remove(); };
  };
  if (!L.length) { staffPanel('empshop', 'Lista de compras', '<div style="padding:14px">Nenhuma loja com vendedor agora.</div>'); return; } render();
}
function empBag() {
  const E = G.emp, me = G.me; if (!E || !me) { const d = document.getElementById('empbag'); if (d) d.remove(); return; }
  const item = (k, q, who) => '<button class="lift-btn" style="padding:4px 8px;margin:3px;display:inline-flex;gap:6px;align-items:center" data-' + who + '="' + k + '">' + ((LOOT[k] && LOOT[k].icon) || '•') + ' ' + ((LOOT[k] && LOOT[k].name) || k) + ' ×' + q + '</button>';
  const mine = Object.entries(me.inv || {}).filter(([k, q]) => q > 0 && LOOT[k]).map(([k, q]) => item(k, q, 'g')).join('') || '<small>Mochila vazia.</small>', his = Object.entries(E.inv || {}).map(([k, q]) => item(k, q, 't')).join('') || '<small>Nada ainda.</small>';
  const d = staffPanel('empbag', 'Mochila de ' + E.n, '<div style="padding:8px 14px"><b>Sua mochila</b> <small>(clique para passar; Shift = tudo)</small><div>' + mine + '</div><div style="margin-top:10px"><b>' + E.n + '</b> <small>(' + Object.keys(E.inv || {}).length + '/' + E.cap + ' espaços; clique para pegar)</small><div>' + his + '</div></div></div>');
  d.querySelectorAll('[data-g]').forEach(b => b.onclick = ev => { const k = b.dataset.g; Net.send({ t: 'emp', a: 'give', k, q: ev.shiftKey ? 999 : 1 }); });
  d.querySelectorAll('[data-t]').forEach(b => b.onclick = ev => { const k = b.dataset.t; Net.send({ t: 'emp', a: 'take', k, q: ev.shiftKey ? 999 : 1 }); });
}
// cama desarrumada: coberta puxada para o lado, amassada, e o travesseiro torto
function drawCookFx(ctx, P, now) {   /* panela ou frigideira no fogão, chamas, vapor e faíscas */
  const me = G.me; G.cookFx = (G.cookFx || []).filter(f => now - f.t0 < f.ms + 600); if (!me) return;
  for (const f of G.cookFx) { if ((f.fl || 0) !== (me.fl || 0) || ((f.fl || 0) && f.fb !== me.fb)) continue; const b = f.fb >= 0 ? BUILDINGS[f.fb] : null, raise = f.fl && b ? f.fl * (bldDims(b).H / floorsOf(b)) * HV : 0, top = f.k === 'irori' ? 0.12 : f.k === 'jkitchen' ? 0.42 : 0.5, q = P(f.x, f.y, 0), x = q[0], y = q[1] - raise - top * HV, t = (now - f.t0) / f.ms, step = Math.min(4, Math.floor(t * 5)), fade = Math.min(1, (f.ms + 600 - (now - f.t0)) / 600);
    ctx.save(); ctx.globalAlpha = fade; ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) { const fx = x + (k - 2) * 2.2, fh = 3 + Math.sin(now / 70 + k * 1.7) * 1.4 + (k === 2 ? 1.5 : 0), g = ctx.createRadialGradient(fx, y + 1.5, 0, fx, y + 1.5 - fh * 0.4, fh); g.addColorStop(0, 'rgba(255,230,150,0.9)'); g.addColorStop(0.5, 'rgba(255,120,40,0.55)'); g.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fx, y + 1.5 - fh * 0.35, 1.5, fh * 0.6, 0, 0, 7); ctx.fill(); }   /* chamas sob a panela */
    ctx.restore();
    if (R3.ok && typeof cookSprite === 'function') { const s2 = cookSprite(f.kind || 'pan', step); ctx.save(); ctx.globalAlpha = fade; ctx.imageSmoothingEnabled = true; pblit(ctx, s2, x, y); ctx.restore(); }
    if (G.view && Math.random() < 0.35 * fade) spawnPart('smoke', x + (Math.random() - 0.5) * 5 - G.view.ox, y - 4 - G.view.oy, { color: 'rgba(236,236,236,0.6)' });   /* vapor */
    if (G.view && t > 0.36 && t < 0.54 && Math.random() < 0.5) spawnPart('ember', x + (Math.random() - 0.5) * 6 - G.view.ox, y - 3 - G.view.oy, { vx: (Math.random() - 0.5) * 0.05, vy: -0.06 });   /* faíscas ao virar */
    if (G.view && t > 0.58 && t < 0.7 && Math.random() < 0.6) spawnPart('sparkle', x + (Math.random() - 0.5) * 4 - G.view.ox, y - 8 - G.view.oy, { color: 'rgba(250,250,240,A)', vx: 0, vy: 0.05, life: 500 });   /* o tempero caindo */
    if (f.kind === 'pot' && Math.random() < 0.4) { ctx.save(); ctx.globalAlpha = 0.7 * fade; ctx.fillStyle = 'rgba(200,150,90,0.8)'; ctx.beginPath(); ctx.arc(x + (Math.random() - 0.5) * 5, y - 5.5 + Math.random(), 0.5 + Math.random() * 0.5, 0, 7); ctx.fill(); ctx.restore(); }   /* borbulhas */
  }
}
function purseNear() { const me = G.me; if (!me) return null; let best = null, bd = 1.4; for (const u of G.purses || []) { if ((u.fl || 0) !== (me.fl || 0)) continue; const d = Math.hypot(u.x - me.x, u.y - me.y); if (d < bd) { bd = d; best = u; } } return best; }
function drawPurses(ctx, P, now) { const me = G.me; for (const u of G.purses || []) { if ((u.fl || 0) !== (me.fl || 0)) continue; const q = P(u.x, u.y, 0), x = q[0], y = q[1] - (u.fl ? u.fl * (bldDims(BUILDINGS[u.fb]).H / floorsOf(BUILDINGS[u.fb])) * HV : 0);
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 5, 2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6a4424'; ctx.beginPath(); ctx.ellipse(x, y - 3, 4.2, 3.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4a2e18'; ctx.fillRect(x - 1.6, y - 7.2, 3.2, 1.6); ctx.fillStyle = '#e8c060'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x + 3 + k * 1.6, y + 0.5 - k * 0.3, 1.3, 0.6, 0, 0, 7); ctx.fill(); }
  if (Math.sin(now / 300) > 0.6) { ctx.fillStyle = 'rgba(255,240,180,.9)'; ctx.fillRect(x - 0.5, y - 9, 1, 1); } ctx.restore(); } }
function drawStaffFx(ctx, P, now) {
  const me = G.me; if (!me) return; drawPurses(ctx, P, now); if (typeof drawEntLogs === 'function') drawEntLogs(ctx, P, now); drawCookFx(ctx, P, now); if (typeof drawFurnFire === 'function') drawFurnFire(ctx, P, now);
  if (G.skTray && me.fl) for (const bi in G.skTray) { if (+bi !== me.fb || G.skTray[bi] !== 'rim') continue; if (Object.values(G.players).some(e => e.bdrink && e.bathing && e.fb === +bi)) continue; const b = BUILDINGS[+bi], raise = me.fl * (bldDims(b).H / floorsOf(b)) * HV, [x0, y0] = localToWorld(b, SAKE_RIM[0], SAKE_RIM[1]), q = P(x0, y0, 0), s2 = sakeTraySprite(sakeTrayYaw({ fb: +bi }), { bottle: true, cup: true, lvl: 0 }); ctx.save(); ctx.imageSmoothingEnabled = true; pblit(ctx, s2, q[0], q[1] - raise - 0.32 * HV); ctx.restore(); }   /* bandeja esperando a doméstica buscar */
  const keys = Object.keys(G.bedMess || {}); if (!keys.length) return; const myFl = me.fl || 0, myB = myFl ? me.fb : bldAt(me.x, me.y);
  for (const k of keys) { const bd = BEDS[+k]; if (!bd || bd.bi !== myB || (bd.fl || 0) !== myFl) continue; const b = BUILDINGS[bd.bi], raise = myFl * (bldDims(b).H / floorsOf(b)) * HV;
    const len = Math.hypot(bd.dx, bd.dy) || 1, ux = bd.dx / len, uy = bd.dy / len, px = -uy, py = ux, L = len + 0.75, h = bd.apt ? (bd.fl === floorsOf(b) - 1 ? 0.2 : 0.07) : 0.24, W = bd.apt && bd.fl === floorsOf(b) - 1 ? 1.4 : 0.8;
    const at = (t, s, dh) => { const x = bd.x + ux * (t - 0.5) * L + px * s, y = bd.y + uy * (t - 0.5) * L + py * s, q = P(x, y, 0); return [q[0], q[1] - raise - (h + (dh || 0)) * HV]; };
    ctx.save();
    const edge = [[0.36, -0.42], [0.52, -0.46], [0.72, -0.4], [0.95, -0.42], [0.99, -0.1], [0.97, 0.3], [0.9, 0.5], [0.72, 0.56], [0.55, 0.52], [0.42, 0.42], [0.33, 0.1]].map(([t, s2]) => [t, s2 * W]);   /* coberta embolada, caindo para um lado */
    ctx.beginPath(); edge.forEach(([t, s], i) => { const [x, y] = at(t, s, 0.03 + (s > 0.45 ? -0.05 : 0)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
    ctx.fillStyle = 'rgba(232,224,206,0.97)'; ctx.fill(); ctx.strokeStyle = 'rgba(150,135,110,0.9)'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(140,124,98,0.75)'; ctx.lineWidth = 0.45; for (const [t0, s0, t1, s1] of [[0.4, -0.3, 0.8, 0.2], [0.5, -0.36, 0.9, -0.05], [0.42, 0.1, 0.75, 0.45], [0.62, -0.2, 0.68, 0.35], [0.8, -0.33, 0.92, 0.25]].map(([a, b2, c, d]) => [a, b2 * W, c, d * W])) { const a = at(t0, s0, 0.05), c = at(t1, s1, 0.05), m2 = at((t0 + t1) / 2 + 0.05, (s0 + s1) / 2 - 0.08, 0.1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m2[0], m2[1], c[0], c[1]); ctx.stroke(); }   /* dobras */
    { const [cx, cy] = at(0.14, 0.12 * W, 0.06), [ax, ay] = at(0.14, 0.5 * W, 0.06); ctx.fillStyle = '#f6f2ea'; ctx.strokeStyle = 'rgba(150,135,110,0.8)'; ctx.beginPath(); ctx.ellipse(cx, cy, 5, 2.4, Math.atan2(ay - cy, ax - cx) + 0.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 3, cy); ctx.quadraticCurveTo(cx, cy - 1.5, cx + 3, cy + 0.5); ctx.stroke(); }   /* travesseiro torto */
    ctx.restore(); }
}

// ============================================================
//  SEGURANÇAS — acompanham, vigiam a porta quando você entra num prédio, guardam um ponto ou a casa, lutam e podem morrer
// ============================================================
const segNid = r => 'seg_' + r.id;
function segHire(p, key, C) {
  const L = segLoad(), list = L[key] || (L[key] = []); if (list.length >= 2) { tell(p, 'No máximo dois seguranças.'); return; }
  const d = C.w ? debit(key, p, C.w) : { bank: 0, cofre: 0, gold: 0 }; if (!d) { tell(p, 'A taxa da agência é ' + C.w + ' de ouro (um dia de salário).'); return; }
  const day = estDay(); if (!C.test) { if (!S.empTaken || S.empTaken.day !== day) S.empTaken = { day, set: new Set() }; S.empTaken.set.add(C.i); }
  const mx = C.tr === 'valente' ? 160 : 120, r = { id: (S.estate.empN = (S.estate.empN || 0) + 1) + 's' + (Date.now() % 100000), n: C.n, g: C.g, tr: C.tr, xp: C.xp, w: C.w, look: C.look, mode: 'follow', hp: mx, maxHp: mx, paid: day, warn: 0 };
  list.push(r); estateSave(); const n = segSpawn(key, r, p); segSend(key); sendStat(p);
  tell(p, C.n + ' foi contratad' + (C.g === 'f' ? 'a' : 'o') + ' como segurança' + (C.w ? ' (taxa de ' + C.w + ' de ouro, ' + debitTxt(d) + ')' : ' (de teste, sem salário)') + ' e já está com você. Fale com ' + (C.g === 'f' ? 'ela' : 'ele') + ' (F) para dar ordens.');
  const ag = S.npcs.agent; if (ag) near(ag.x, ag.y, { t: 'anim', w: 'n', id: 'agent', a: 'talk', txt: C.n + ' é de confiança. Boa sorte lá fora!', ms: 1 }); empMsg(p, { a: 'cands' });
}
function segSpawn(key, r, near0) {
  const id = segNid(r); if (S.npcs[id]) return S.npcs[id]; const q = near0 || empOwnerP(key); let x, y, fl = 0, fb = -1;
  if (q && !(q.fl || 0)) { x = q.x + 0.8; y = q.y + 0.4; } else { const home = (estateLoad().r && Object.keys(estateLoad().r).find(pid => estateLoad().r[pid].owner === key && PROPS_BY[pid] && PROPS_BY[pid].kind === 'house')); const D = home ? doorTiles()[PROPS_BY[home].bi] : null; if (D) { x = D.ox; y = D.oy; } else { x = CENTER; y = CENTER + 12; } }
  const n = { id, kind: r.look, name: r.n + ', segurança', transient: true, seg: key, segId: r.id, x, y, z: 0, fl, fb, postX: x, postY: y, hp: r.hp, maxHp: r.maxHp, downed: null, dead: false };
  S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n;
}
function segSend(key) { const q = empOwnerP(key); if (!q) return; Net.toOne(q.id, { t: 'segme', list: segList(key).map(r => { const n = S.npcs[segNid(r)]; return { id: segNid(r), escort: r.escort ? 1 : 0, carry: r.carry || 0, job: r.job ? r.job.k : '', n: r.n, g: r.g, tr: r.tr, w: r.w, mode: r.mode, hp: Math.round(n ? n.hp : r.hp), maxHp: r.maxHp, warn: r.warn ? 1 : 0, jail: r.jail && Date.now() < r.jail ? Math.ceil((r.jail - Date.now()) / 1000) : 0 }; }) }); }
function segQuit(key, r, why, dead) {
  const L = segLoad(), list = L[key] || [], i = list.indexOf(r); if (i >= 0) list.splice(i, 1); if (!list.length) delete L[key];
  const n = S.npcs[segNid(r)]; if (n) { if (dead) { n.dead = true; n.hp = 0; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 400 }); setTimeout(() => { if (S.npcs[n.id]) visGone(n); }, 300000); } else visGone(n); }   /* o corpo fica no chão 5 minutos */
  estateSave(); const q = empOwnerP(key); if (q) { tell(q, why); segSend(key); }
}
function segOrder(p, key, m) {
  const r = segList(key).find(x => segNid(x) === m.id); if (!r) return; const n = S.npcs[segNid(r)]; if (!n) return;
  if (m.o !== 'fire' && (r.jail || r.flee)) { tell(p, r.n + (r.jail ? ' está preso.' : ' fugiu.')); return; }
  if (m.o !== 'fire' && ((n.fl || 0) !== (p.fl || 0) || dist(n.x, n.y, p.x, p.y) > 3)) { tell(p, 'Chegue perto de ' + r.n + '.'); return; }
  if (m.o === 'follow') { r.mode = 'follow'; r.post = null; empSay(n, 'Estou com você.'); }
  else if (m.o === 'post') { r.mode = 'post'; r.post = { x: n.x, y: n.y, fl: n.fl || 0, fb: n.fl ? n.fb : -1 }; empSay(n, 'Ninguém passa por aqui.'); }
  else if (m.o === 'home') { r.mode = 'home'; r.post = null; r.homePid = segPickHome(n.seg, p); empSay(n, 'Vou guardar a sua porta.'); }
  else if (m.o === 'entrance') { const b = BUILDINGS.find(q2 => q2.door2L && stairKind(q2, 0) === 'lift'), d2 = b && door2Of(b); if (!d2) return; if (!Object.keys(S.estate.r).some(pid => S.estate.r[pid].owner === key && PROPS_BY[pid] && PROPS_BY[pid].apt)) { tell(p, 'Só quem mora num apartamento do prédio do dojô.'); return; } const dv = DOOR_V[d2.s] || [1, 0], sp = segDoorSpot(d2.x, d2.y, dv[0], dv[1], segList(key).indexOf(r)); r.mode = 'post'; r.post = { x: sp.x, y: sp.y, fl: 0, fb: -1, dir: sp.dir }; empSay(n, 'Fico na entrada do corredor do elevador.'); }
  else if (m.o === 'escort') { if (!(S.estate.emp && S.estate.emp[key])) { tell(p, 'Você não tem doméstica para escoltar.'); return; } for (const x of segList(key)) x.escort = 0; r.escort = 1; empSay(n, 'Quando a doméstica sair para buscar comida, eu vou junto.'); }   /* um segurança por vez */
  else if (m.o === 'noescort') { r.escort = 0; empSay(n, 'Certo, volto ao meu posto.'); }
  else if (m.o === 'bank') { const q = Math.min(p.gold || 0, Math.max(0, Math.floor(+m.q || 0))); if (!q) { tell(p, 'Diga quanto ele deve levar.'); return; } if (r.carry) { tell(p, r.n + ' já está levando dinheiro ao banco.'); return; } p.gold -= q; sendStat(p); r.carry = q; r.bankRet = r.mode === 'bank' ? 'follow' : r.mode; r.mode = 'bank'; empSay(n, 'Levo ' + q + ' de ouro ao banco e volto.'); }   /* o segurança leva o ouro ao banco */
  else if (m.o === 'fire') { segQuit(key, r, r.n + ' foi dispensad' + (r.g === 'f' ? 'a' : 'o') + '.'); return; }
  n.goal = null; estateSave(); segSend(key);
}
function segDefend(attacker, victim) {   /* alguém bateu no seu patrão: os seguranças dele partem para cima */
  const L = S.estate && S.estate.seg, list = L && L[estOwner(victim)]; if (!list || !list.length) return;
  for (const r of list) { const n = S.npcs[segNid(r)]; if (!n || n.dead || (n.fl || 0) !== (attacker.fl || 0) || dist(n.x, n.y, attacker.x, attacker.y) > 12) continue; if (r.jail || r.flee) continue; if (!n.fight) empSay(n, ['Tire as mãos do meu patrão!', 'Para trás!', 'Vai se ver comigo!'][Math.floor(Math.random() * 3)]); n.fight = { id: attacker.id, until: now_() + 20000 }; n.foe = attacker.id; n.foeK = 'p'; }
}
function segKilled(n, p) { const r = segList(n.seg).find(x => x.id === n.segId); n.fight = null; if (r && r.carry) { purseDrop(n.x, n.y, n.fl, n.fb, r.carry, r.n); r.carry = 0; }   /* morreu levando o dinheiro: a bolsa cai */ if (r) segQuit(n.seg, r, r.n + ' morreu lutando por você' + (p ? ' (golpe de ' + p.name + ')' : '') + '. O contrato acabou.', true); }
// posto ao lado da porta: no tile vizinho à porta, colado na parede, de costas para o prédio e de frente para a rua
function segPickHome(key, p) {   /* qual casa guardar: a do andar/prédio onde o patrão está; senão a mais perto dele */
  const L = Object.keys(S.estate.r).filter(pid => S.estate.r[pid].owner === key && PROPS_BY[pid] && PROPS_BY[pid].kind === 'house'); if (!L.length) return null;
  const pfl = p.fl || 0, pb = pfl ? p.fb : WORLD.bld[tileAt(p.x, p.y)];
  const here = L.find(pid => { const H = PROPS_BY[pid]; if (H.apt) return pfl && H.bi === pb && H.fl === pfl; return !pfl && H.bi === pb; }); if (here) return here;
  const d = pid => { const b = BUILDINGS[PROPS_BY[pid].bi]; return b ? dist(p.x, p.y, b.x + b.w / 2, b.y + b.h / 2) : 1e9; }; return L.sort((a, b) => d(a) - d(b))[0];
}
function segDoorSpot(dx, dy, vx, vy, k) {
  const sx = -vy, sy = vx, side = k ? 1 : -1;
  for (const sd of [side, -side]) { const x = dx + vx * 1.0 + sx * sd * 1.0, y = dy + vy * 1.0 + sy * sd * 1.0; if (npcStand(x, y, 0.2)) return { x, y, dir: dirFromVecS(vx, vy) }; }
  return { x: dx + vx * 1.3 + sx * side * 0.6, y: dy + vy * 1.3 + sy * side * 0.6, dir: dirFromVecS(vx, vy) };
}
function segWatch(n, base, now) {   /* parado de guarda: olha para os lados de vez em quando */
  if (now > (n.glT || 0)) { n.glT = now + 4000 + Math.random() * 4000; n.glD = Math.random() < 0.5 ? -1 : 1; n.glUntil = now + 1400 + Math.random() * 800; }
  n.walk = false; n.dir = (base + (now < (n.glUntil || 0) ? n.glD : 0) + 8) % 8;
}
// ---------- crimes do segurança: matar quem já caiu (só por ordem); visto por alguém, a guarda reage ----------
const segFoe = (id, k) => k === 'n' ? S.npcs[id] : S.players[id];
const foeName = (o, k) => k === 'n' ? String(o.name || '').split(',')[0] : o.name;
function segAnswer(p, key, m) {
  const r = segList(key).find(x => segNid(x) === m.id); if (!r || !r.ask) return; const n = S.npcs[segNid(r)], fk = r.ask.k, f = segFoe(r.ask.foe, fk); r.ask = null; Net.toOne(p.id, { t: 'segask', id: null });
  if (!n || !f || !f.downed) return; if (!m.kill) { empSay(n, 'Ele aprendeu a lição.'); n.foe = null; return; }
  n.kill = { id: f.id, k: fk, t0: now_() }; empSay(n, 'Como quiser.');
}
function segKillTick(n, r, q, now, dt) {
  const fk = n.kill.k, f = segFoe(n.kill.id, fk); if (!f || !f.downed || f.dead || now - n.kill.t0 > 15000) { n.kill = null; n.foe = null; return; }
  if (dist(n.x, n.y, f.x, f.y) > 1.2) { npcWalk(n, f.x, f.y, 2.2, dt); return; }
  n.walk = false; n.dir = dirFromVecS(f.x - n.x, f.y - n.y); if (n.kill.hit) return; n.kill.hit = 1;   /* finalização: para sobre o caído, uma frase, ergue a espada com as duas mãos e desce o golpe devagar */
  empSay(n, ['Fim da linha.', 'Devia ter ficado longe do meu patrão.', 'Que os deuses te recebam.'][Math.floor(Math.random() * 3)]);
  setTimeout(() => { if (S.npcs[n.id] && !n.dead) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'execute', ms: 1700, tx: f.x, ty: f.y }); }, 900);
  setTimeout(() => { n.kill = null; n.foe = null; if (!segFoe(f.id, fk) || !f.downed || f.dead || n.dead) return; near(f.x, f.y, { t: 'hit', k: fk === 'n' ? 'n' : 'p', id: f.id, x: f.x, y: f.y, dmg: 99, ax: n.x, ay: n.y }); near(f.x, f.y, { t: 'blood', x: f.x, y: f.y, n: 16 }); near(f.x, f.y, { t: 'finisher', x: f.x, y: f.y });
    if (fk === 'n') npcDie(f, null); else { if (f.downed) f.downed.faint = false; if (PERMADEATH && !f.dev && !f.devPowers) permaDeath(f, 'pelas mãos de ' + r.n + ', segurança de ' + (q ? q.name : 'alguém')); else respawnTemple(f); }
    const wit = segWitnesses(n, f.id); if (wit) segCrime(n, r, q, wit); else if (q) tell(q, r.n + ' acabou com ' + foeName(f, fk) + '. Ninguém viu.'); }, 900 + 850);
}
function segWitnesses(n, victimId, R = 9) {   /* alguém viu? (moradores, visitantes, sentinelas ou outros jogadores por perto) */
  const fl = n.fl || 0;
  for (const o of Object.values(S.npcs)) { if (o === n || o.dead || o.downed || o.seg || o.emp || o.sleeping || (o.fl || 0) !== fl) continue; if (dist(o.x, o.y, n.x, n.y) < R) return o.name.split(',')[0]; }
  for (const o of Object.values(S.players)) { if (o.id === victimId || estOwner(o) === n.seg || o.downed || (o.fl || 0) !== fl) continue; if (dist(o.x, o.y, n.x, n.y) < R) return o.name; }
  return null;
}
function segCrime(n, r, q, wit, what) {
  const fine = 30; if (q) { repAdd(q, 'cidade', -4, 'seu segurança matou alguém'); repAdd(q, 'guarda', -4, 'seu segurança matou alguém'); const d = debit(n.seg, q, fine); if (!d) { const g = Math.min(q.gold || 0, fine); q.gold -= g; } tell(q, wit + ' viu ' + r.n + ' ' + (what ? what.replace(/^(\S+)/, m0 => m0) : 'matar') + '. A guarda cobrou de você uma multa de ' + fine + ' de ouro.'); sendStat(q); }
  sys(r.n + ', segurança de ' + (q ? q.name : 'alguém') + ', ' + (what || 'matou um homem caído') + '. ' + wit + ' chamou a guarda!');
  if (r.tr === 'leal') { r.jail = Date.now() + 240000; empSay(n, 'Eu me entrego. Fiz o que o patrão mandou.'); if (q) tell(q, r.n + ' se entregou e vai ficar 4 minutos preso. A fiança com o carcereiro solta antes.'); }
  else if (Math.random() < 0.5) { const G = visGates(), g = G.sort((a, b) => dist(a[0], a[1], n.x, n.y) - dist(b[0], b[1], n.x, n.y))[0]; r.flee = g; empSay(n, 'Não vão me pegar!'); if (q) tell(q, r.n + ' fugiu da guarda!'); }
  else { r.jail = Date.now() + 240000; empSay(n, 'Me pegaram!'); if (q) tell(q, r.n + ' tentou fugir, mas a guarda pegou: 4 minutos preso. A fiança com o carcereiro solta antes.'); }
  n.fight = null; n.monT = null; estateSave(); segSend(n.seg);
}
function segJailSpot(r) { const jb = BUILDINGS.findIndex(b => b.kind === 'jail'); if (jb < 0) return null; const T = bldFreeTiles(jb); if (!T.length) return null; const t = T[(parseInt(r.id, 10) || 0) % T.length]; return [t[0], t[1]]; }
function segBail(p) {
  const r = segList(estOwner(p)).find(x => x.jail && Date.now() < x.jail); if (!r) return 'Nenhum segurança seu está preso.';
  const price = 40, d = debit(estOwner(p), p, price); if (!d) return 'A fiança do seu segurança é ' + price + ' de ouro. Você não tem o bastante.';
  r.jail = 0; estateSave(); segSend(estOwner(p)); sendStat(p); const n = S.npcs[segNid(r)]; if (n) empSay(n, 'Obrigado, patrão. Não vai se repetir.'); return 'Fiança paga: ' + price + ' de ouro. ' + r.n + ' está livre.';
}
const DIRTY = {
  intim: { n: 'Intimidar alguém', c: 15, tgt: 'who', d: 'Vai até a pessoa e ameaça: ela pode pagar, fugir ou chamar a guarda.' },
  surra: { n: 'Dar uma surra', c: 25, tgt: 'who', d: 'Bate até a pessoa cair, sem matar. Depois pergunta se acaba com ela.' },
  roubo: { n: 'Roubar uma casa ou loja', c: 50, tgt: 'bld', d: 'Só à noite: arromba a porta e traz parte do baú ou do cofre.' },
  sabot: { n: 'Sabotar um negócio', c: 40, tgt: 'bld', d: 'Estraga parte do estoque de um negócio rival.' },
};
function segDirty(p, key, m) {
  const r = segList(key).find(x => segNid(x) === m.id), J = DIRTY[m.job]; if (!r || !J) return; const n = S.npcs[segNid(r)]; if (!n) return;
  if (r.jail || r.flee) { tell(p, r.n + (r.jail ? ' está preso.' : ' fugiu.')); return; } if (r.job) { tell(p, r.n + ' já está num serviço.'); return; }
  let tgt = null;
  if (J.tgt === 'who') { if (m.tk === 'n') { const o = S.npcs[m.tid]; if (!o || o.dead || o.seg || o.emp) { tell(p, 'Escolha uma pessoa.'); return; } if (/^(guard|captain)/.test(o.kind)) { tell(p, r.n + ': "Contra a guarda eu não vou."'); return; } if (o.downed && m.job === 'surra') { tell(p, 'Essa pessoa já está caída.'); return; } tgt = { k: 'n', id: o.id, nm: foeName(o, 'n') }; }
    else if (m.tk === 'p') { const o = S.players[m.tid]; if (!o || o === p || o.downed) { tell(p, 'Escolha uma pessoa.'); return; } tgt = { k: 'p', id: o.id, nm: o.name }; } else { tell(p, 'Clique numa pessoa.'); return; } }
  else { const bi = m.bi | 0, b = BUILDINGS[bi], PP = b && PROPS.find(q2 => q2.bi === bi && !q2.apt); if (!PP) { tell(p, 'Esse prédio não serve para isso.'); return; } const E = estateLoad(), rec = E.r[PP.id];
    if (rec && rec.owner === key) { tell(p, 'Esse imóvel é seu.'); return; }
    if (m.job === 'sabot' && !(PP.kind === 'shop' || PP.kind === 'workshop')) { tell(p, 'Só dá para sabotar um negócio (loja ou oficina).'); return; }
    if (m.job === 'roubo' && !dayInfoS().night) { tell(p, r.n + ': "Roubo, só de noite, patrão."'); return; }
    tgt = { k: 'b', bi, pid: PP.id, nm: PP.name }; }
  const cost = r.w ? J.c : 0; if (cost) { const d = debit(key, p, cost); if (!d) { tell(p, r.n + ' cobra ' + cost + ' de ouro por esse serviço.'); return; } sendStat(p); }
  r.job = { k: m.job, tgt, ph: 'go', t0: now_() }; n.fight = null; n.goal = null; empSay(n, ['Deixa comigo.', 'Considere feito.', 'Volto já.'][Math.floor(Math.random() * 3)]);
  tell(p, r.n + ' foi ' + ({ intim: 'intimidar', surra: 'dar uma surra em', roubo: 'roubar', sabot: 'sabotar' })[m.job] + ' ' + tgt.nm + (cost ? ' (' + cost + ' de ouro).' : ' (de teste, sem cobrar).')); estateSave(); segSend(key);
}
function segJobPos(t) { if (t.k === 'b') { const D = doorTiles()[t.bi]; return D ? { x: D.ox, y: D.oy, fl: 0 } : null; } const o = segFoe(t.id, t.k); return o && !(o.dead) ? { x: o.x, y: o.y, fl: o.fl || 0, o } : null; }
function segJobEnd(n, r, q, msg, say) { r.job = null; if (say) empSay(n, say); if (q && msg) tell(q, msg); estateSave(); segSend(n.seg); }
function segJobTick(n, r, q, now, dt) {
  const J = r.job, T = J.tgt, pos = segJobPos(T);
  if (!pos || now - J.t0 > 150000) { segJobEnd(n, r, q, r.n + ' não conseguiu fazer o serviço em ' + T.nm + '.', 'Não deu, patrão.'); return; }
  if ((pos.fl || 0) !== 0 && T.k !== 'b') { segJobEnd(n, r, q, r.n + ': "' + T.nm + ' está lá em cima, não alcanço."'); return; }
  if (J.ph === 'go') { if ((n.fl || 0) > 0) { empGo(n, { x: pos.x, y: pos.y, fl: 0, fb: -1 }, 2.0, dt); return; } const d = dist(n.x, n.y, pos.x, pos.y); if (d > (T.k === 'b' ? 0.7 : 1.3)) { npcWalk(n, pos.x, pos.y, d > 6 ? 2.4 : 1.6, dt); return; } J.ph = 'do'; J.t1 = now; J.step = 0; }
  n.walk = false; if (T.k !== 'b') n.dir = dirFromVecS(pos.x - n.x, pos.y - n.y); else { const D = doorTiles()[T.bi]; n.dir = dirFromVecS(D.x - n.x, D.y - n.y); }
  const o = pos.o, el = now - J.t1;
  if (J.k === 'intim') {
    if (J.step === 0) { J.step = 1; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'point', ms: 1300, tx: pos.x, ty: pos.y }); empSay(n, ['Meu patrão mandou um recado.', 'Escuta aqui, ' + T.nm + '.', 'Vamos conversar, ' + T.nm + '?'][Math.floor(Math.random() * 3)]); if (o && T.k === 'n') { o.walkTo = null; o.goal = null; } }
    if (J.step === 1 && el > 2200) { J.step = 2; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shove', ms: 700, tx: pos.x, ty: pos.y }); empSay(n, ['Seria uma pena se algo acontecesse com você.', 'Da próxima vez não vou só falar.', 'Pague, e fica tudo bem.'][Math.floor(Math.random() * 3)]); }
    if (J.step === 2 && el > 4200) { J.step = 3;
      if (T.k === 'p') { tell(o, r.n + ', segurança de ' + (q ? q.name : 'alguém') + ', te ameaçou. Cuidado.'); const wit = segWitnesses(n, o.id, 6); if (wit && Math.random() < 0.5) { segCrime(n, r, q, wit, 'ameaçou ' + T.nm); r.job = null; return; } segJobEnd(n, r, q, r.n + ' deixou o recado para ' + T.nm + '.', 'Recado dado.'); return; }
      const roll = Math.random(); if (roll < 0.45) { const amt = Math.max(3, Math.min(o.gold != null ? Math.floor(o.gold) : 20, 5 + Math.floor(Math.random() * 16))); if (o.gold != null) o.gold -= amt; if (q) { q.gold = (q.gold || 0) + amt; sendStat(q); } near(o.x, o.y, { t: 'anim', w: 'n', id: o.id, a: 'talk', txt: ['Tá bom, tá bom! Leve isto.', 'Não me machuque! Tome.'][Math.floor(Math.random() * 2)], ms: 1 }); segJobEnd(n, r, q, T.nm + ' pagou ' + amt + ' de ouro para ' + r.n + ' ir embora.', 'Bom negócio.'); }
      else if (roll < 0.8) { o.flee = { from: n.id, until: now + 12000 }; near(o.x, o.y, { t: 'anim', w: 'n', id: o.id, a: 'fear', ms: 1600 }); segJobEnd(n, r, q, T.nm + ' fugiu apavorado.', 'Correu, o covarde.'); }
      else { near(o.x, o.y, { t: 'anim', w: 'n', id: o.id, a: 'talk', txt: 'Guardas! Socorro!', ms: 1 }); segCrime(n, r, q, T.nm, 'ameaçou ' + T.nm); r.job = null; }
      return; }
    return; }
  if (J.k === 'surra') {
    if (T.k === 'p') { n.fight = { id: o.id, until: now + 25000 }; n.foe = o.id; n.foeK = 'p'; r.job = null; empSay(n, 'Hora da lição.'); if (!J.seen) { const wit = segWitnesses(n, o.id, 6); if (wit) segCrime(n, r, q, wit, 'espancou ' + T.nm); } segSend(n.seg); return; }
    if (o.downed) { n.foe = o.id; n.foeK = 'n'; segJobEnd(n, r, q, r.n + ' deu uma surra em ' + T.nm + '.', null); return; }
    if (J.step === 0) { J.step = 1; empSay(n, 'Hora da lição.'); const wit = segWitnesses(n, o.id, 6); if (wit) { segCrime(n, r, q, wit, 'espancou ' + T.nm); r.job = null; return; } }
    if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1100; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: Math.random() < 0.5 ? 'punch' : 'kick', ms: 520, tx: o.x, ty: o.y }); setTimeout(() => { if (!o.dead && !o.downed && dist(n.x, n.y, o.x, o.y) < 2) { const was = o.hp; npcDamage(o, 8 + Math.floor(Math.random() * 8), null); if (o.hp <= 0 && !o.downed) { o.hp = 0; o.downed = { until: now_() + 45000 }; o.fight = null; o.flee = null; } } }, 260); }
    return; }
  if (J.k === 'roubo' || J.k === 'sabot') {
    if (J.step === 0) { J.step = 1; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: J.k === 'roubo' ? 'key' : 'kick', ms: J.k === 'roubo' ? 5500 : 3800 }); const wit = segWitnesses(n, null, 6); if (wit) { segCrime(n, r, q, wit, J.k === 'roubo' ? 'tentou arrombar ' + T.nm : 'sabotou ' + T.nm); r.job = null; return; } }
    if (J.step === 1 && el > (J.k === 'roubo' ? 5800 : 4000)) { J.step = 2; const E = estateLoad(), rec = E.r[T.pid], N = !rec ? (npcbAll()[T.pid] || null) : null, PP = PROPS_BY[T.pid];
      if (J.k === 'roubo') { let gold = 0, items = [];
        if (rec && rec.biz) { gold = Math.min(150, Math.floor((rec.biz.cofre || 0) * 0.3)); rec.biz.cofre -= gold; bizLog(rec.biz, 'Arrombaram a porta à noite e levaram ' + gold + ' de ouro do cofre.'); }
        else if (rec) { const ch = rec.chest || {}; for (const k of Object.keys(ch).slice(0, 3)) { const t2 = Math.max(1, Math.floor(ch[k] * 0.3)); ch[k] -= t2; if (ch[k] <= 0) delete ch[k]; items.push([k, t2]); } }
        else if (N) { gold = Math.min(120, Math.floor((N.cofre || 0) * 0.3)); N.cofre -= gold; if (N.log) npcbLog(N, 'Arrombaram a porta à noite e levaram ' + gold + ' de ouro.'); }
        else gold = 5 + Math.floor(Math.random() * 20);
        if (q) { if (gold) q.gold = (q.gold || 0) + gold; for (const [k, t2] of items) { if (!q.inv[k] && Object.keys(q.inv).length >= INV_SLOTS) { (E.lost[n.seg] = E.lost[n.seg] || {})[k] = ((E.lost[n.seg] || {})[k] || 0) + t2; continue; } q.inv[k] = (q.inv[k] || 0) + t2; } sendStat(q); }
        if (rec) { const vic = Object.values(S.players).find(x => estOwner(x) === rec.owner); if (vic) tell(vic, 'Arrombaram ' + PP.name + ' durante a noite!'); }
        estateSave(); segJobEnd(n, r, q, r.n + ' roubou ' + T.nm + ': ' + (gold ? gold + ' de ouro' : '') + (items.length ? (gold ? ' e ' : '') + items.map(([k, t2]) => t2 + ' ' + LOOT[k].name.toLowerCase()).join(', ') : '') + (!gold && !items.length ? 'não havia nada de valor' : '') + '.', 'Serviço feito.'); return; }
      const B = rec && rec.biz; let lost = 0; const ruin = st => { if (!st) return; for (const g of Object.keys(st)) { const t2 = Math.floor(st[g] * 0.3); st[g] -= t2; lost += t2; if (st[g] <= 0) delete st[g]; } };
      if (B) { ruin(B.stock); ruin(B.store); bizLog(B, 'Alguém estragou parte do estoque (' + lost + ' unidades).'); const vic = Object.values(S.players).find(x => estOwner(x) === rec.owner); if (vic) tell(vic, 'Sabotaram ' + PP.name + '!'); }
      else if (N) { ruin(N.store); if (N.log) npcbLog(N, 'Alguém estragou parte do estoque (' + lost + ' unidades).'); }
      estateSave(); segJobEnd(n, r, q, r.n + ' sabotou ' + T.nm + (lost ? ': ' + lost + ' unidades de estoque perdidas.' : ' (não havia estoque para estragar).'), 'Ninguém viu nada.'); return; }
    return; }
}
// ---------- seguranças: defendem de sentinelas e moradores, caem e se levantam entre si, levantam o patrão ----------
function segDefendNpc(aid, victim) {
  const L = S.estate && S.estate.seg, list = L && L[estOwner(victim)]; if (!list || !list.length) return; const a = S.npcs[aid]; if (!a || a.dead || a.seg || a.emp) return;
  for (const r of list) { const n = S.npcs[segNid(r)]; if (!n || n.dead || n.downed || r.jail || r.flee || (n.fl || 0) !== (victim.fl || 0) || dist(n.x, n.y, a.x, a.y) > 14) continue; if (n.fightN !== aid) empSay(n, ['Ninguém encosta no meu patrão!', 'Para trás, ' + String(a.name || '').split(',')[0] + '!', 'Vai ter que passar por mim!'][Math.floor(Math.random() * 3)]); n.fightN = aid; n.fightNT = now_() + 30000; }
}
function segBankTick(n, r, q, now, dt) {   /* vai até o banqueiro, deposita na conta do patrão e volta ao que fazia */
  const bk = Object.values(S.npcs).filter(o => /^banker\d?$/.test(o.kind) && !o.dead && !o.downed).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
  let tgt = null; if (bk) tgt = { x: bk.x + 0.9, y: bk.y + 0.9, fl: 0, fb: -1 }; else { const BP = PROPS.find(P => P.kind === 'bank'), D = BP && doorTiles()[BP.bi]; if (D) tgt = { x: D.x, y: D.y, fl: 0, fb: -1 }; }
  if (!tgt) { r.mode = r.bankRet || 'follow'; return; }
  const arrived = empGo(n, tgt, 1.6, dt) || ((n.fl || 0) === 0 && dist(n.x, n.y, tgt.x, tgt.y) < 1.5); if (!arrived) return;
  const B = bankLoad(), A = B.acc[n.seg] || (B.acc[n.seg] = { g: 0, loan: 0, due: 0, wk: estDay() }), v = r.carry || 0; A.g += v; bankSave(); r.carry = 0; r.mode = r.bankRet || 'follow'; r.bankRet = null;
  empSay(n, 'Depositado.'); const own = empOwnerP(n.seg); if (own) tell(own, r.n + ' depositou ' + v + ' de ouro na sua conta. Saldo: ' + Math.floor(A.g) + '.'); estateSave(); segSend(n.seg);
}
function purseDrop(x, y, fl, fb, g, who) { S.purses = (S.purses || []).filter(u => Date.now() - u.t < 600000); S.purses.push({ id: 'pu' + Date.now() + Math.floor(Math.random() * 1000), x, y, fl: fl || 0, fb: fl ? fb : -1, g, t: Date.now(), who }); Net.toAll({ t: 'purses', l: S.purses }); }   /* a bolsa cai no chão e qualquer um pode pegar */
function segSlot(n, t, k) {   /* cada segurança cerca o alvo por um lado, sem se amontoar */
  const crew = Object.values(S.npcs).filter(o => o.seg && !o.dead && !o.downed && (k === 'm' ? o.monT === t.id : o.fightN === t.id) && dist(o.x, o.y, t.x, t.y) < 6).sort((a, b) => (a.id < b.id ? -1 : 1));
  const d = dist(n.x, n.y, t.x, t.y) || 1, R = k === 'm' ? Math.max(0.95, ((MON[t.type] || {}).rad || 0) + 0.8) : 0.95; if (crew.length < 2) return [t.x + (n.x - t.x) / d * R, t.y + (n.y - t.y) / d * R];
  const i = Math.max(0, crew.indexOf(n)), base = Math.atan2(crew[0].y - t.y, crew[0].x - t.x), a = base + i * Math.PI * 2 / crew.length;
  for (const rr of [R, R * 0.85, R * 1.15]) { const x = t.x + Math.cos(a) * rr, y = t.y + Math.sin(a) * rr; if (npcStand(x, y, 0.2)) return [x, y]; }
  return [t.x + (n.x - t.x) / d * R, t.y + (n.y - t.y) / d * R];
}
function segSeparate(n, dt) {   /* colisão leve entre seguranças (e com o patrão) */
  if (n.dead || n.downed || n.onBack) return; const q = empOwnerP(n.seg);
  for (const o of Object.values(S.npcs)) { if (o === n || !o.seg || o.dead || (o.fl || 0) !== (n.fl || 0)) continue; const dx = n.x - o.x, dy = n.y - o.y, d = Math.hypot(dx, dy); if (d >= 0.55 || d < 1e-4) continue;
    const push = Math.min(0.06, (0.55 - d) * 0.5) * Math.min(1, dt * 10), nx = n.x + dx / d * push, ny = n.y + dy / d * push; if ((n.fl || 0) || npcStand(nx, ny, 0.2)) { n.x = nx; n.y = ny; } }
  if (q && (q.fl || 0) === (n.fl || 0)) { const dx = n.x - q.x, dy = n.y - q.y, d = Math.hypot(dx, dy); if (d < 0.45 && d > 1e-4) { const nx = n.x + dx / d * 0.04, ny = n.y + dy / d * 0.04; if ((n.fl || 0) || npcStand(nx, ny, 0.2)) { n.x = nx; n.y = ny; } } }
}
function segFightNpc(n, r, now, dt) {   /* luta contra uma sentinela ou morador que atacou o patrão */
  const t = S.npcs[n.fightN]; if (!t || t.dead || t.downed || now > (n.fightNT || 0)) { n.fightN = null; return false; }
  const d = dist(n.x, n.y, t.x, t.y), sp = segSlot(n, t, 'n'); if (dist(n.x, n.y, sp[0], sp[1]) > 0.3) npcWalk(n, sp[0], sp[1], 2.5, dt); if (d > 1.45) return true;
  n.dir = dirFromVecS(t.x - n.x, t.y - n.y); n.walk = false;
  if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1200; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: t.x, ty: t.y }); setTimeout(() => { if (n.dead || n.downed || !S.npcs[t.id] || t.dead || dist(n.x, n.y, t.x, t.y) > 1.9) return; npcDamage(t, r.tr === 'veterano' ? rint(18, 28) : rint(12, 20), null); if (t.kind === 'guard' || t.kind === 'captain') { t.fightSeg = n.id; t.fightSegT = now_() + 30000; } else if (!t.fight && !t.flee) { t.fightSeg = n.id; t.fightSegT = now_() + 15000; } }, 420); }
  return true;
}
function segDownTick(n, now, dt) {   /* caído: sangra; fera ou inimigo por perto acaba com ele; um colega pode levantá-lo */
  n.walk = false; const r = segList(n.seg).find(x => x.id === n.segId); if (!r) { if (!n.dead) visGone(n); return; } r.hp = 0;
  if (now > n.downed.until) { segKilled(n, null); return; }
  if (now >= (n.downHitT || 0)) { n.downHitT = now + 1600; for (const m of Object.values(S.monsters)) { const d0 = MON[m.type] || {}; if (m.hp > 0 && (m.alt || 0) < 1 && d0.dmg && d0.dmg[1] > 0 && dist(m.x, m.y, n.x, n.y) < 1.6 && (m.aggro || d0.aggro > 0) && Math.random() < 0.6) { segKilled(n, null); return; } } }
}
function segReviveTick(n, r, q, now, dt) {   /* levanta o patrão caído ou um colega caído (se não houver briga) */
  if (n.rev) { const T = n.rev.k === 'p' ? S.players[n.rev.id] : S.npcs[n.rev.id]; if (!T || !T.downed || T.dead || T.carriedBy || T.dragBy) { n.rev = null; return false; }
    if (dist(n.x, n.y, T.x, T.y) > 1.1) { if ((n.fl || 0) !== (T.fl || 0)) { n.rev = null; return false; } npcWalk(n, T.x, T.y, 2.3, dt); return true; }
    n.walk = false; n.dir = dirFromVecS(T.x - n.x, T.y - n.y); if (!n.rev.t) { n.rev.t = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'gather', ms: 4200, tx: T.x, ty: T.y }); empSay(n, n.rev.k === 'p' ? 'Aguenta firme, patrão!' : 'Levanta, companheiro!'); }
    if (now - n.rev.t > 4200) { if (n.rev.k === 'p') { revivePlayer(T, 0.3, r.n); tell(T, r.n + ' te levantou.'); } else { T.downed = null; T.hp = Math.round(T.maxHp * 0.35); const r2 = segList(T.seg).find(x => x.id === T.segId); if (r2) r2.hp = T.hp; empSay(T, 'Valeu. Vamos nessa.'); segSend(T.seg); } n.rev = null; } return true; }
  if (q && q.downed && !q.carriedBy && !q.dragBy && !q.execAt && (q.fl || 0) === (n.fl || 0) && dist(n.x, n.y, q.x, q.y) < 20) { n.rev = { k: 'p', id: q.id }; return true; }
  for (const r2 of segList(n.seg)) { if (r2 === r) continue; const o = S.npcs[segNid(r2)]; if (o && o.downed && !o.dead && (o.fl || 0) === (n.fl || 0) && dist(n.x, n.y, o.x, o.y) < 20) { n.rev = { k: 'n', id: o.id }; return true; } }
  return false;
}
function segThreat(n, r, q) {   /* a fera mais perto que ameaça o patrão (ou o ponto vigiado) */
  const c = r.mode === 'post' && r.post ? r.post : r.mode === 'home' ? n : (q && !(q.fl || 0) ? q : n), R = r.tr === 'atento' ? 9 : 6; let best = null, bd = 1e9;
  for (const m of Object.values(S.monsters)) { if ((m.alt || 0) > 1 || m.hp <= 0) continue; const d0 = MON[m.type] || {}; const hostile = (q && m.aggro === q.id) || (m.aggro && d0.aggro > 0) || (d0.aggro > 0 && dist(m.x, m.y, c.x, c.y) < R * 0.7); if (!hostile) continue; const d = dist(m.x, m.y, c.x, c.y); if (d < R && d < bd) { bd = d; best = m; } }
  return best;
}
function segFightMonster(n, r, m, now, dt) {
  const d = dist(n.x, n.y, m.x, m.y), sp = segSlot(n, m, 'm'), far = dist(n.x, n.y, sp[0], sp[1]) > 0.3; if (far) npcWalk(n, sp[0], sp[1], 2.5, dt); if (d > 1.45 + ((MON[m.type] || {}).rad || 0)) return;   /* vai para o seu lado do alvo */
  n.dir = dirFromVecS(m.x - n.x, m.y - n.y); if (!far) n.walk = false;
  if (now >= (n.nextAtk || 0)) { n.nextAtk = now + 1200; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_slashR', ms: 900, tx: m.x, ty: m.y });
    setTimeout(() => { if (!S.monsters[m.id] || n.dead || dist(n.x, n.y, m.x, m.y) > 2) return; const dmg = r.tr === 'veterano' ? rint(18, 28) : rint(12, 20); m.hp -= dmg; near(m.x, m.y, { t: 'hit', k: 'm', id: m.id, x: m.x, y: m.y, dmg, ax: n.x, ay: n.y });
      if (m.hp <= 0) { const q = empOwnerP(n.seg), pp = q && dist(q.x, q.y, m.x, m.y) < 16 ? q : null; if (pp) killMonster(m, pp, 0); else { delete S.monsters[m.id]; near(m.x, m.y, { t: 'mdie', id: m.id, d: 0 }); } n.monT = null; empSay(n, ['Está feito.', 'Uma a menos.', 'Pode seguir, patrão.'][Math.floor(Math.random() * 3)]); } }, 420); }
  const d0 = MON[m.type] || {}; if (d0.dmg && d0.dmg[1] > 0 && now >= (n.hurtT || 0)) { n.hurtT = now + (d0.atk || 1500) + 300; const dmg = Math.round(rint(d0.dmg[0], d0.dmg[1]) * 0.8); if (dmg > 0) { n.hp -= dmg; sfx(n.x, n.y, '-' + dmg, '#ff8a6a'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 300 }); } }   /* a fera revida */
}
function segNpcTick(n, now, dt) {
  const L = segList(n.seg), r = L.find(x => x.id === n.segId); if (!r) { if (!n.dead) visGone(n); return; } if (n.dead) return;
  n.goHome = false; r.hp = n.hp;
  if (n.hp <= 0) { segQuit(n.seg, r, r.n + ' morreu lutando por você. O contrato acabou.', true); return; }
  const q = empOwnerP(n.seg);
  if (r.flee) { const [gx, gy] = r.flee; if (npcWalk(n, gx, gy, 3.0, dt) || dist(n.x, n.y, gx, gy) < 1.5) segQuit(n.seg, r, r.n + ' fugiu da cidade. O contrato acabou.'); return; }
  if (r.jail) { if (Date.now() < r.jail) { const sp = segJailSpot(r); if (sp && (npcWalk(n, sp[0], sp[1], 1.4, dt) || dist(n.x, n.y, sp[0], sp[1]) < 0.6)) n.walk = false; return; } r.jail = 0; empSay(n, 'Cumpri a pena. De volta ao trabalho.'); if (q) tell(q, r.n + ' cumpriu a pena e voltou ao trabalho.'); estateSave(); segSend(n.seg); }
  if (n.kill) { segKillTick(n, r, q, now, dt); return; }
  if (n.foe && !n.fight && !r.job) { const f = segFoe(n.foe, n.foeK); if (f && f.downed && !f.dead && !r.ask && q) { r.ask = { foe: f.id, k: n.foeK, until: now + 20000 }; n.dir = dirFromVecS(q.x - n.x, q.y - n.y); empSay(n, 'Patrão, ' + (n.foeK === 'n' ? foeName(f, 'n') : 'ele') + ' caiu. Acabo com ' + (n.foeK === 'n' ? 'isso' : 'ele') + '?'); Net.toOne(q.id, { t: 'segask', id: segNid(r), n: r.n, foe: foeName(f, n.foeK) }); } else if (!f || !f.downed) { n.foe = null; } }
  if (r.job) { segJobTick(n, r, q, now, dt); return; }
  if (r.ask) { const f = segFoe(r.ask.foe, r.ask.k); if (!f || !f.downed || now > r.ask.until) { if (now > r.ask.until && f && f.downed) empSay(n, 'Deixo ele ir, então.'); r.ask = null; n.foe = null; if (q) Net.toOne(q.id, { t: 'segask', id: null }); } else { n.walk = false; if (q) n.dir = dirFromVecS(q.x - n.x, q.y - n.y); return; } }
  if (n.hp < r.maxHp && now >= (n.regT || 0)) { n.regT = now + 1000; n.hp = Math.min(r.maxHp, n.hp + 1); }
  if (n.fightN) { if (n.smoking) empSmoke(n, 0); if (segFightNpc(n, r, now, dt)) return; }
  const underAttack = q && now - (q._hitT || 0) < 15000, low = n.hp < r.maxHp * 0.25 && r.tr !== 'leal' && !underAttack;   /* com o patrão apanhando, ninguém recua */
  let m = n.monT && S.monsters[n.monT]; if (m && (m.hp <= 0 || dist(n.x, n.y, m.x, m.y) > 14)) m = null; if (!m && !low) { m = segThreat(n, r, q); if (m && n.monT !== m.id) empSay(n, ['Cuidado!', 'Deixa comigo!', 'Fique atrás de mim!'][Math.floor(Math.random() * 3)]); }
  n.monT = m ? m.id : null; if (m && !low) { if (n.smoking) empSmoke(n, 0); segFightMonster(n, r, m, now, dt); return; }
  if (segReviveTick(n, r, q, now, dt)) return;
  if (r.mode === 'bank') { segBankTick(n, r, q, now, dt); return; }
  if (r.escort && !n.smoking) { const em = S.estate.emp && S.estate.emp[n.seg], md = em && S.npcs[empNid(em)]; if (md && !md.dead && (md.forage || !empAtHome(md, empHome(em)))) { const d = (n.fl || 0) === (md.fl || 0) ? dist(n.x, n.y, md.x, md.y) : 99; if (d > 1.7) empGo(n, { x: md.x, y: md.y, fl: md.fl || 0, fb: md.fl ? md.fb : -1 }, md.forage ? 2.3 : 1.6, dt); else { n.walk = false; n.dir = dirFromVecS(md.x - n.x, md.y - n.y); } return; } }   /* escoltando a doméstica enquanto ela está fora */
  if (n.smoking) { if (now > n.smoking || (q && !(q.fl || 0) && !(n.fl || 0) && dist(n.x, n.y, q.x, q.y) > 5 && r.mode === 'follow')) { empSmoke(n, 0); } else { n.walk = false; return; } }   /* fumando: fica parado; se o patrão se afasta, apaga */
  if (!n.smoking && now > (r.joinT || 0) && (!q || r.mode !== 'follow' || !q.walking)) {   /* viu a doméstica fumando: dá vontade e vai fumar junto dela */
    const md = Object.values(S.npcs).find(o => o.emp && o.smoking > now + 8000 && (o.fl || 0) === (n.fl || 0) && dist(o.x, o.y, n.x, n.y) < 9);
    if (md) { const tgt = { x: md.x + 0.9, y: md.y + 0.35, fl: md.fl || 0, fb: md.fb }; if (dist(n.x, n.y, tgt.x, tgt.y) > 1.1) { r.joining = md.id; if (!empGo(n, tgt, 0.9, dt)) return; }
      r.joining = null; r.joinT = now + 900000; r.smokeT = now + 600000; n.dir = dirFromVecS(md.x - n.x, md.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'sheatheH', ms: 500 }); empSmoke(n, Math.max(15000, md.smoking - now), true); empSay(n, ['Me dá um desses?', 'Boa ideia, vou te acompanhar.', 'Também quero um.'][Math.floor(Math.random() * 3)]); return; } }
  if (now > (r.smokeT || (r.smokeT = now + 240000 + Math.random() * 360000)) && !L.some(x => x !== r && S.npcs[segNid(x)] && S.npcs[segNid(x)].smoking > now) && (!q || r.mode !== 'follow' || (!q.walking && dist(n.x, n.y, q.x, q.y) < 3))) { r.smokeT = now + 600000 + Math.random() * 300000; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'sheatheH', ms: 500 }); empSmoke(n, 60000, true); return; }   /* um segurança por vez guarda a espada e fuma */
  if (r.mode === 'post' && r.post) { if (!empGo(n, r.post, 1.2, dt)) return; n.walk = false; if (r.post.dir != null) segWatch(n, r.post.dir, now); return; }
  if (r.mode === 'home' || !q) { const home = (r.homePid && S.estate.r[r.homePid] && S.estate.r[r.homePid].owner === n.seg) ? r.homePid : Object.keys(S.estate.r).find(pid => S.estate.r[pid].owner === n.seg && PROPS_BY[pid] && PROPS_BY[pid].kind === 'house'), HP = home && PROPS_BY[home];
    if (HP && HP.apt) { const A = APTS.find(a => a.key === HP.apt && a.bi === HP.bi), b = BUILDINGS[HP.bi], k = L.indexOf(r), vv = k ? 4.5 : 3.7, [wx, wy] = localToWorld(b, 7.55, vv), [fx, fy] = localToWorld(b, 6.55, vv); if (A && empGo(n, { x: wx, y: wy, fl: A.fl, fb: HP.bi }, 1.4, dt)) segWatch(n, dirFromVecS(fx - wx, fy - wy), now); return; }   /* apartamento: guarda o corredor do andar */
    const D = home ? doorTiles()[PROPS_BY[home].bi] : null; if (D) { const sp = segDoorSpot(D.x, D.y, (D.ox - D.x) / 1.3, (D.oy - D.y) / 1.3, L.indexOf(r)); if (npcWalk(n, sp.x, sp.y, 1.2, dt) || dist(n.x, n.y, sp.x, sp.y) < 0.4) segWatch(n, sp.dir, now); } return; }
  const qfl = q.fl || 0, qb = qfl ? q.fb : WORLD.bld[tileAt(q.x, q.y)];
  if (qfl > 0 && BUILDINGS[qb] && stairKind(BUILDINGS[qb], 0) === 'lift') {   /* subiu de elevador: vai junto; com o patrão num apartamento, espera no corredor do elevador daquele andar */
    const b = BUILDINGS[qb], k = L.indexOf(r), A = aptAt(qb, qfl, q.x, q.y); let tgt;
    if (A) { const vv = k ? 4.5 : 3.7, [wx, wy] = localToWorld(b, 7.55, vv), [fx, fy] = localToWorld(b, 6.55, vv); tgt = { x: wx, y: wy, fl: qfl, fb: qb, dir: dirFromVecS(fx - wx, fy - wy) }; }
    else { const d2 = (n.fl || 0) === qfl && n.fb === qb ? dist(n.x, n.y, q.x, q.y) : 99; if (d2 < 1.8) { n.walk = false; return; } const a = Math.atan2(n.y - q.y, n.x - q.x) + (k ? 0.6 : -0.6); tgt = { x: q.x + Math.cos(a) * 1.2, y: q.y + Math.sin(a) * 1.2, fl: qfl, fb: qb }; }
    if (empGo(n, tgt, 1.6, dt) && A) segWatch(n, tgt.dir, now); return; }
  if (qb >= 0 && !((n.fl || 0) === qfl && qfl > 0)) {   /* o patrão entrou num prédio: vigia a porta, olhando para a rua */
    const D = doorTiles()[qb]; if (D) { const sp = segDoorSpot(D.x, D.y, (D.ox - D.x) / 1.3, (D.oy - D.y) / 1.3, L.indexOf(r));
      if ((n.fl || 0) > 0) { empGo(n, { x: sp.x, y: sp.y, fl: 0, fb: -1 }, 1.6, dt); return; }
      if (npcWalk(n, sp.x, sp.y, dist(n.x, n.y, sp.x, sp.y) > 6 ? 2.4 : 1.5, dt) || dist(n.x, n.y, sp.x, sp.y) < 0.4) segWatch(n, sp.dir, now); return; } }
  const d = (n.fl || 0) === qfl ? dist(n.x, n.y, q.x, q.y) : 99; if (!(n.fl || 0) && !qfl && d > 30) { n.x = q.x - 1; n.y = q.y + 0.5; n.legs = null; n.path = null; n.walkKey = null; return; }
  if (d < 2.0) { n.walk = false; return; }
  const k = L.indexOf(r), a = Math.atan2(n.y - q.y, n.x - q.x) + (k ? 0.6 : -0.6), tx = q.x + Math.cos(a) * 1.5, ty = q.y + Math.sin(a) * 1.5;
  empGo(n, { x: tx, y: ty, fl: qfl, fb: qfl ? q.fb : -1 }, d > 6 ? 2.6 : 1.5, dt);
}
function segTick(now) {   /* uma vez por segundo (chamado pelo empTick): garante os NPCs e cobra o salário */
  const L = S.estate && S.estate.seg; if (!L) return; const day = estDay();
  for (const key of Object.keys(L)) for (const r of [...L[key]]) {
    if (!S.npcs[segNid(r)]) segSpawn(key, r);
    if ((r.paid || 0) < day && !r.w) r.paid = day;
    if ((r.paid || 0) < day) { const q = empOwnerP(key), d = debit(key, q, r.w);
      if (d) { r.paid = day; r.warn = 0; if (q) { tell(q, 'Salário de ' + r.n + ' (segurança): -' + r.w + ' de ouro (' + debitTxt(d) + ').'); sendStat(q); } estateSave(); }
      else if (!r.warn) { r.warn = day; if (q) tell(q, r.n + ': "Sem o meu pagamento (' + r.w + ' de ouro) eu não fico. Amanhã vou embora."'); estateSave(); }
      else if (day > r.warn) { if (q) repAdd(q, 'cidade', -3, r.n + ' foi embora sem receber'); segQuit(key, r, r.n + ' foi embora: dois dias sem salário.'); } }
  }
  if (now - (S.segST || 0) > 3000) { S.segST = now; for (const key of Object.keys(L)) segSend(key); }
}

// ---------- segurança: lado do jogador ----------
if (typeof G !== 'undefined') G.segs = [];
if (typeof progEvent === 'function') { const _peG = progEvent; progEvent = function (m, now) {
  if (m.t === 'finisher') { const me = G.me; if (me && Math.hypot(me.x - m.x, me.y - m.y) < 12) G.shake = Math.max(G.shake || 0, 7); return true; }   /* o chão treme com o golpe final */
  if (m.t === 'segask') { const d = document.getElementById('segask'); if (d) d.remove(); if (m.id) { const p2 = staffPanel('segask', m.n + ' pergunta', '<div style="padding:10px 14px">"Patrão, ' + m.foe + ' caiu. Acabo com ele?"<div style="font-size:13px;opacity:.75;margin-top:6px">Se alguém vir, a guarda reage: você paga multa e perde um pouco de reputação, e ele vai preso ou foge.</div></div><div class="lift-list" style="padding-top:4px"><button class="lift-btn" data-k="1"><span class="lift-n">🗡</span><span><b>Acabe com ele</b></span></button><button class="lift-btn" data-k="0"><span class="lift-n">✋</span><span><b>Poupe</b></span></button></div>'); p2.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { p2.remove(); Net.send({ t: 'emp', a: 'segans', id: m.id, kill: +b.dataset.k }); }); } return true; }
  if (m.t === 'segme') { G.segs = m.list || []; const d = document.getElementById('segmenu'); if (d && d.dataset.id) segMenu(d.dataset.id); return true; }
  return _peG(m, now);
}; }
function segNear() { const me = G.me; if (!me || me.downed || !G.segs || !G.segs.length) return null; for (const s of G.segs) { const e = G.npcs[s.id]; if (e && !e.npDead && (e.fl || 0) === (me.fl || 0) && Math.hypot((e.rx ?? e.x) - me.x, (e.ry ?? e.y) - me.y) < 1.6) return s; } return null; }
function segPrompt() { const s = segNear(); return 'F: falar com ' + s.n + ' (segurança)'; }
function segMenu(id) {
  const s = (G.segs || []).find(x => x.id === id); if (!s) { const d = document.getElementById('segmenu'); if (d) d.remove(); return; }
  const opt = (o, ic, t, sub) => '<button class="lift-btn" data-o="' + o + '"><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  const html = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">' + s.n + ' · ' + SEG_TR[s.tr].n + ' · ' + (s.w ? s.w + ' ouro/dia' : 'teste, sem salário') + ' · vida ' + s.hp + '/' + s.maxHp + (s.warn ? ' · <b style="color:#e88">salário atrasado</b>' : '') + (s.jail ? ' · <b style="color:#e88">preso (' + s.jail + ' s; fiança com o carcereiro)</b>' : '') + '</div><div class="lift-list" style="padding-top:8px">' +
    (s.mode !== 'follow' ? opt('follow', '🛡', 'Me acompanhe', 'Anda com você; quando você entra num prédio, vigia a porta.') : '') + (s.mode !== 'post' ? opt('post', '📍', 'Vigie aqui', 'Fica neste ponto e enfrenta quem chegar.') : '') + (s.mode !== 'home' ? opt('home', '🏠', 'Guarde a minha casa', 'Fica de guarda na porta de casa.') : '') + (G.est && G.est.mine && PROPS_BY[G.est.mine.pid] && PROPS_BY[G.est.mine.pid].apt ? opt('entrance', '🚪', 'Vigie a entrada do elevador', 'Fica na porta do corredor do elevador do prédio do dojô.') : '') + opt('dirty', '🗡', 'Trabalho sujo' + (s.job ? ' (em andamento)' : ''), 'Intimidar, dar uma surra, roubar ou sabotar.') + opt('fire', '✋', 'Dispensar', 'Encerra o contrato.') + '</div>';
  const d = staffPanel('segmenu', s.n + ' · segurança', html); d.dataset.id = id;
  { const ls = d.querySelector('.lift-list'); if (ls) ls.insertAdjacentHTML('beforeend', (G.emp ? (s.escort ? opt('noescort', '🏠', 'Voltar ao posto', 'Para de acompanhar a doméstica nas saídas.') : opt('escort', '🧺', 'Escoltar a doméstica', 'Acompanha a doméstica quando ela sai para buscar comida e volta com ela, todos os dias.')) : '') + (s.carry ? '' : opt('bank', '💰', 'Depositar no banco', 'Leva o ouro da sua bolsa ao banco e volta. Se morrer no caminho, o dinheiro cai com ele.'))); }
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; if (o === 'dirty') { d.remove(); segDirtyMenu(id); return; } if (o === 'bank') { d.remove(); segBankMenu(id); return; } if (o === 'fire' && !confirm('Dispensar ' + s.n + '?')) return; d.remove(); Net.send({ t: 'emp', a: 'sorder', id, o }); });
}
function segBankMenu(id) {
  const s = (G.segs || []).find(x => x.id === id); if (!s) return; const g = G.me.gold || 0;
  const d = staffPanel('segbank', s.n + ' · depositar no banco', '<div style="padding:10px 14px;font-size:14px">Na bolsa: <b>' + g + '</b> de ouro.<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><input id="segbank-q" type="number" min="1" max="' + g + '" value="' + g + '" style="width:110px"><button class="lift-btn" data-q="half" style="flex:0 0 auto">Metade</button><button class="lift-btn" data-q="ok" style="flex:0 0 auto">Entregar</button></div></div>');
  d.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const inp = document.getElementById('segbank-q'); if (b.dataset.q === 'half') { inp.value = Math.floor(g / 2); return; } const q = Math.floor(+inp.value || 0); if (q > 0) Net.send({ t: 'emp', a: 'sorder', id, o: 'bank', q }); d.remove(); });
}
function segDirtyMenu(id) {
  const s = (G.segs || []).find(x => x.id === id); if (!s) return; const opt = (k, ic) => '<button class="lift-btn" data-j="' + k + '"><span class="lift-n">' + ic + '</span><span><b>' + DIRTY[k].n + '</b> · ' + (s.w ? DIRTY[k].c + ' de ouro' : 'de graça (teste)') + '<br><small>' + DIRTY[k].d + '</small></span></button>';
  const d = staffPanel('segdirty', s.n + ' · trabalho sujo', '<div style="padding:8px 14px 0;font-size:13px;opacity:.8">Escolha o serviço e depois clique no alvo. Se alguém vir, a guarda reage como num crime.</div><div class="lift-list" style="padding-top:8px">' + opt('intim', '😠') + opt('surra', '👊') + opt('roubo', '🔓') + opt('sabot', '🔥') + '</div>');
  d.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { d.remove(); G.pickTarget = { id, job: b.dataset.j }; showToast(DIRTY[b.dataset.j].tgt === 'bld' ? 'Clique no prédio alvo (Esc cancela).' : 'Clique na pessoa alvo (Esc cancela).'); });
}
function staffPick(e) {   /* o próximo clique escolhe o alvo do trabalho sujo */
  const T = G.pickTarget; G.pickTarget = null; if (!T) return false; const w = screenToWorld(e.clientX, e.clientY), J = DIRTY[T.job];
  if (J.tgt === 'bld') { const bi = bldAt(w.x, w.y); if (bi < 0) { showToast('Nenhum prédio aí.'); return true; } Net.send({ t: 'emp', a: 'dirty', id: T.id, job: T.job, bi }); return true; }
  let best = null, bd = 1.5; const mine = new Set([...(G.segs || []).map(s => s.id), G.emp && G.emp.id]), pts = [w, screenToWorld(e.clientX, e.clientY + 14 * SCALE), screenToWorld(e.clientX, e.clientY + 28 * SCALE)];   /* vale clicar nos pés, no corpo ou na cabeça */
  const dd = (x, y) => Math.min(...pts.map(q2 => Math.hypot(x - q2.x, y - q2.y)));
  for (const id in G.npcs) { const o = G.npcs[id]; if (!o || mine.has(id) || o.npDead) continue; const d = dd(o.rx ?? o.x, o.ry ?? o.y); if (d < bd) { bd = d; best = { tk: 'n', tid: id }; } }
  for (const id in G.players) { if (id === G.myId) continue; const o = G.players[id]; const d = dd(o.rx, o.ry); if (d < bd - 0.2) { bd = d; best = { tk: 'p', tid: id }; } }
  if (!best) { showToast('Ninguém aí. Clique em cima da pessoa.'); return true; } Net.send({ t: 'emp', a: 'dirty', id: T.id, job: T.job, ...best }); return true;
}
if (typeof document !== 'undefined') document.addEventListener('keydown', e => { if (e.key === 'Escape' && typeof G !== 'undefined' && G.pickTarget) { G.pickTarget = null; showToast('Trabalho sujo cancelado.'); } });

// ---------- a cada quadro: empregados fumando (pose do cigarro, fumaça, olhar em volta) ----------
function staffFrame(now) {
  for (const id in G.npcs) { const e = G.npcs[id], S2 = e.smokeN; if (!S2) continue; if (now > S2.until) { e.smokeN = null; if (e.custP && e.custP.cig) e.custP = null; continue; }
    const ph = ((now - S2.t0) / 7000) % 1; e.custP = { smk: ph, cig: 1, nowp: S2.nowp ? 1 : 0 };
    if (ph > 0.3 && ph < 0.36 && G.view && Math.random() < 0.35) { const p = iso(e.rx, e.ry); spawnPart('smoke', p.sx + 3, p.sy - 34 - (e.fl ? e.fl * (bldDims(BUILDINGS[e.fb]).H / floorsOf(BUILDINGS[e.fb])) * HV : 0), { color: '#d8d4cc' }); }
    if (now > (e._lookT || 0)) { e._lookT = now + 4500 + Math.random() * 3000; e.dir = ((e.dir | 0) + (Math.random() < 0.5 ? 1 : 7)) % 8; } }   /* contempla os arredores */
}
