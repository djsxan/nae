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
  if (EMP_TEST) out.unshift({ i: 6, role: 'dom', n: 'Celina', g: 'f', tr: 'caprichoso', xp: 9, w: 0, look: 'v_maidf', test: 1 }, { i: 7, role: 'seg', n: 'Bartolomeu', g: 'm', tr: 'veterano', xp: 11, w: 0, look: 'v_segm', test: 1 });
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
function empSend(r, key) { const q = empOwnerP(key); if (q) Net.toOne(q.id, { t: 'empme', id: empNid(r), n: r.n, g: r.g, tr: r.tr, w: r.w, mode: r.mode, inv: r.inv, cap: empCap(r), messy: !!r.messy, warn: r.warn ? 1 : 0, home: (PROPS_BY[r.home] || {}).name || '' }); }
function empSpawn(key, r, atDoor) {
  const id = empNid(r); if (S.npcs[id]) return S.npcs[id]; const H = empHome(r); if (!H) return null;
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
  const key = estOwner(p), M = empLoad(), r = M[key];
  if (m.a === 'cands') { const home = rentalOf(p); Net.toOne(p.id, { t: 'empc', list: empCands(), tr: EMP_TR, str: SEG_TR, home: home ? PROPS_BY[home].name : '', have: r ? r.n : '', segs: segList(key).length }); return; }
  if (m.a === 'sorder') { segOrder(p, key, m); return; }
  if (m.a === 'hire') {
    const ag = S.npcs.agent; if (!ag || dist(p.x, p.y, ag.x, ag.y) > 4.5) { tell(p, 'Fale com a Dona Celeste, na Agência Mão Amiga.'); return; }
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
    if (!close && m.o !== 'fire') { tell(p, 'Chegue perto de ' + r.n + '.'); return; } const H = empHome(r), nm = r.n;
    if (m.o === 'follow') { r.mode = 'follow'; n.goal = null; n.task = null; empSay(n, ['Vou com você.', 'Pode ir na frente.', 'Estou logo atrás.'][Math.floor(Math.random() * 3)]); }
    else if (m.o === 'home') { r.mode = 'home'; n.goal = null; empSay(n, 'Vou cuidar da casa.'); }
    else if (m.o === 'deliver') { if (!Object.keys(r.inv).length) { tell(p, nm + ' não está carregando nada.'); return; } r.mode = 'deliver'; n.goal = null; empSay(n, 'Levo tudo para casa e guardo no baú.'); }
    else if (m.o === 'massage') { if (!empAtHome(p, H)) { tell(p, 'A massagem é em casa.'); return; } if (p.sleep == null) { tell(p, 'Deite-se na cama (clique nela) para a massagem.'); return; } r.mode = 'home'; const bd = BEDS[p.sleep]; n.goal = Object.assign(empTgt(H, bd.x + (H.x - bd.x) / (Math.hypot(H.x - bd.x, H.y - bd.y) || 1) * 1.2, bd.y + (H.y - bd.y) / (Math.hypot(H.x - bd.x, H.y - bd.y) || 1) * 1.2), { act: () => empMassage(n, r, p) }); empSay(n, 'Relaxe, eu cuido disso.'); }
    else if (m.o === 'fire') { empQuit(key, r, nm + ' foi dispensad' + (r.g === 'f' ? 'a' : 'o') + '.'); return; }
    estateSave(); empSend(r, key); return; }
  if (m.a === 'give' || m.a === 'take') {
    if (!close) { tell(p, 'Chegue perto de ' + r.n + '.'); return; } const k = String(m.k);
    if (m.a === 'give') { const q2 = Math.min(p.inv[k] || 0, Math.max(1, m.q | 0)); if (!q2 || !LOOT[k]) return; if (!r.inv[k] && Object.keys(r.inv).length >= empCap(r)) { tell(p, 'A mochila de ' + r.n + ' está cheia (' + empCap(r) + ' espaços).'); return; } p.inv[k] -= q2; if (!p.inv[k]) delete p.inv[k]; r.inv[k] = (r.inv[k] || 0) + q2; }
    else { const q2 = Math.min(r.inv[k] || 0, Math.max(1, m.q | 0)); if (!q2) return; if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'Sua mochila está cheia.'); return; } r.inv[k] -= q2; if (!r.inv[k]) delete r.inv[k]; p.inv[k] = (p.inv[k] || 0) + q2; }
    sendStat(p); empSend(r, key); estateSave(); }
}
function empSay(n, txt) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt, ms: 1 }); }
function empAnim(n, a, ms, tx, ty) { if (tx != null) n.dir = dirFromVecS(tx - n.x, ty - n.y); n.walk = false; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a, ms, tx, ty }); }
function empMassage(n, r, p) {
  if (p.sleep == null || !S.players[p.id]) { empSay(n, 'Ué, levantou?'); return; } empAnim(n, 'gather', 9000, p.x, p.y);
  n.task = { until: now_() + 9000, done: () => { if (p.sleep == null) return; p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3)); p.cst = cstMaxOf(p); if (p.bleed) for (const k in p.bleed) p.bleed[k] = 0; p.buffs.warm = Math.max(p.buffs.warm || 0, now_() + 300000); tell(p, 'Massagem de ' + r.n + ': fôlego cheio, vida recuperada, membros aliviados e quentinho por 5 minutos.'); sendStat(p); } };
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
function empGo(n, tgt, spd, dt) {
  const fl = n.fl || 0, tfl = tgt.fl || 0;
  if (fl === tfl && (fl === 0 || n.fb === tgt.fb)) {
    if (fl === 0) { const ok = npcWalk(n, tgt.x, tgt.y, spd, dt); return ok || dist(n.x, n.y, tgt.x, tgt.y) < 0.45; }
    const key = Math.round(tgt.x * 4) + ',' + Math.round(tgt.y * 4);
    if (n.frKey !== key) { const b = BUILDINGS[n.fb], A0 = aptAt(n.fb, fl, n.x, n.y), A1 = aptAt(n.fb, fl, tgt.x, tgt.y), pts = []; if (A0 !== A1) { if (A0) pts.push(...empAptPts(b, A0, true)); if (A1) pts.push(...empAptPts(b, A1, false)); } pts.push([tgt.x, tgt.y]); n.fr = pts; n.frKey = key; }
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
  const rec = S.estate.r[r.home], ch = rec ? (rec.chest = rec.chest || {}) : {}, qHome = q && empAtHome(q, H) && !q.downed;
  if (!qHome) r.tubDone = false;
  const hasFood = EMP_FOOD.some(f => ch[f] > 0); if (qHome && (q.food ?? 100) < 55 && !hasFood && now_() > (r.noFoodT || 0)) { r.noFoodT = now_() + 120000; empSay(n, 'Não tem comida no baú. Traga carne crua que eu cozinho.'); }
  if (qHome && q.sleep == null && (((q.food ?? 100) < 55 && hasFood) || (q.water ?? 100) < 55)) {   /* serve comida e água */
    n.goal = Object.assign(empTgt(H, q.x + 0.7, q.y + 0.3), { act: () => { empAnim(n, 'talk', 1, q.x, q.y); n.task = { until: now_() + 1500, done: () => {
      let txt = []; if ((q.water ?? 100) < 55) { q.water = 100; txt.push('água fresca'); }
      if ((q.food ?? 100) < 55) { const k = EMP_FOOD.find(f => ch[f] > 0); if (k) { ch[k]--; if (!ch[k]) delete ch[k]; q.inv[k] = (q.inv[k] || 0) + 1; useItem(q, k); txt.push(LOOT[k].name.toLowerCase()); } else if (now_() > (r.noFoodT || 0)) { r.noFoodT = now_() + 120000; empSay(n, 'Não tem comida no baú. Traga carne crua que eu cozinho.'); } }
      if (txt.length) { empSay(n, 'Aqui está: ' + txt.join(' e ') + '.'); tell(q, r.n + ' serviu ' + txt.join(' e ') + '.'); sendStat(q); estateSave(); } } }; } }); return; }
  if (qHome && H.P.suite && !r.tubDone && typeof tubRec === 'function') { const T = tubRec(H.bi); if (!T.lever && tubLv(T, Date.now()) < 0.05) { const O2 = ofuroOf(H.b); r.tubDone = true;   /* prepara o banho na suíte */
    n.goal = Object.assign(empTgt(H, O2.lever[0], O2.lever[1]), { act: () => { empAnim(n, 'lever', 1100, O2.lever[0], O2.lever[1] - 0.6); n.task = { until: now_() + 1200, done: () => { const T2 = tubRec(H.bi), t = Date.now(); T2.lv = tubLv(T2, t); T2.t = t; T2.lever = 1; T2.mode = 'fill'; T2.fullG = 0; T2.cold = false; Net.toAll(tubPayload(H.bi)); estateSave(); empSay(n, 'Preparei o seu banho.'); } }; } }); return; } }
  const bi = empBedIdx(H);
  if (r.messy && bi >= 0 && !Object.values(S.players).some(p2 => p2.sleep === bi)) { const bd = BEDS[bi];   /* arruma a cama */
    const vx = H.x - bd.x, vy = H.y - bd.y, vl = Math.hypot(vx, vy) || 1, sx = bd.x + vx / vl * 1.3, sy = bd.y + vy / vl * 1.3;   /* ao lado da cama, do lado do quarto */
    n.goal = Object.assign(empTgt(H, sx, sy), { act: () => { empAnim(n, 'sweep', 4200, bd.x, bd.y); n.task = { until: now_() + (r.tr === 'rapido' ? 3000 : 4300), done: () => { r.messy = false; Net.toAll({ t: 'bedmess', bed: bi, on: 0 }); estateSave(); empSend(r, n.emp); } }; } }); return; }
  const raw = ['venison', 'pork'].find(k => ch[k] > 0);
  if (raw) { const K = KITCHENS.find(k => k.bi === H.bi && (H.fl ? k.fl === H.fl && aptAt(H.bi, H.fl, k.x, k.y) === H.A : !k.fl));   /* cozinha a carne crua do baú */
    if (K) { n.goal = Object.assign(empTgt(H, K.x + 0.5, K.y + 0.8), { act: () => { empAnim(n, 'cook', 4500, K.x, K.y); n.task = { until: now_() + (r.tr === 'rapido' ? 3500 : 5000), done: () => {
      let made = 0, stew = 0; for (let t = 0; t < 2; t++) { const k = ['venison', 'pork'].find(z => ch[z] > 0); if (!k) break; const toStew = r.tr === 'cozinheiro' && ch.herb > 0, out = toStew ? 'stew' : 'cookedmeat'; if (!ch[out] && Object.keys(ch).length >= ESTATE_CHEST_SLOTS) break; ch[k]--; if (!ch[k]) delete ch[k]; if (toStew) { ch.herb--; if (!ch.herb) delete ch.herb; stew++; } ch[out] = (ch[out] || 0) + 1; made++; }
      if (made) { empSay(n, stew ? 'Fiz um ensopado cheiroso!' : 'A carne está assada, guardei no baú.'); estateSave(); } } }; } }); return; } }
  { let x, y; if (H.fl) { const [ux, uy] = localToWorld(H.b, H.A.u0 + 0.6 + Math.random() * (H.A.u1 - H.A.u0 - 1.2), 0.8 + Math.random() * 3); x = ux; y = uy; } else { const T = bldFreeTiles(H.bi), t = T[Math.floor(Math.random() * T.length)] || [H.x, H.y]; x = t[0]; y = t[1]; }   /* varre a casa */
    n.goal = Object.assign(empTgt(H, x, y), { act: () => { if (Math.random() < 0.6) { empAnim(n, 'sweep', 2800); n.task = { until: now_() + 2900 }; } } }); }
}
function empNpcTick(n, now, dt) {
  const M = empLoad(), r = M[n.emp]; if (!r || empNid(r) !== n.id) { visGone(n); return; }
  const H = empHome(r); if (!H) return; const q = empOwnerP(n.emp), spd = r.tr === 'rapido' ? 1.4 : 1.05;
  if (n.task) { if (now < (n.task.until || 0)) { n.walk = false; return; } const T = n.task; n.task = null; if (T.done) T.done(); }
  if (r.mode === 'follow') { if (!q) { r.mode = 'home'; return; } empFollow(n, r, q, dt); return; }
  if (r.mode === 'deliver') { if (empGo(n, empTgt(H), spd, dt)) { empDeposit(n.emp, r, q); r.mode = 'home'; empSend(r, n.emp); } return; }
  if (n.goal) { if (empGo(n, n.goal, spd, dt)) { const g = n.goal; n.goal = null; n.walk = false; if (g.act) g.act(); } return; }
  if (!empAtHome(n, H)) { n.goal = empTgt(H); return; }
  if (now < (n.nextT || 0)) return; n.nextT = now + (r.tr === 'rapido' ? 5000 : 8000) + Math.random() * 6000;
  empChoose(n, r, H, q, now);
}
function empTick(now) {   /* uma vez por segundo: garante o NPC no mundo e cobra o salário do dia */
  if (now - (S.empT || 0) < 1000) return; S.empT = now; const E = S.estate; if (!E) return; segTick(now); if (!E.emp) return; const day = estDay();
  for (const key of Object.keys(E.emp)) { const r = E.emp[key], rec = E.r[r.home];
    if (!rec || rec.owner !== key) { empQuit(key, r, r.n + ' foi embora: você não tem mais a casa.'); continue; }
    if (!S.npcs[empNid(r)]) empSpawn(key, r);
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
  if (!r.messy) { r.messy = true; const H = empHome(r), bi = H ? empBedIdx(H) : -1; if (bi >= 0) Net.toAll({ t: 'bedmess', bed: bi, on: 1 }); estateSave(); empSend(r, estOwner(p)); }
  return ms;
}

// ---------- lado do jogador ----------
if (typeof G !== 'undefined') { G.emp = null; G.bedMess = G.bedMess || {}; }
if (typeof progEvent === 'function') { const _peS = progEvent; progEvent = function (m, now) {
  if (m.t === 'empc') { agencyRender(m); return true; }
  if (m.t === 'empme') { G.emp = m.id ? m : null; if (document.getElementById('empmenu')) empMenu(); if (document.getElementById('empbag')) empBag(); return true; }
  if (m.t === 'bedmess') { if (m.on) G.bedMess[m.bed] = 1; else delete G.bedMess[m.bed]; return true; }
  return _peS(m, now);
}; }
function staffPanel(id, title, html) {
  let d = document.getElementById(id); if (d) d.remove(); d = document.createElement('div'); d.id = id; d.className = 'gpanel lift-panel'; d.style.width = 'min(560px, calc(100vw - 32px))'; d.style.maxHeight = '80vh'; d.style.overflowY = 'auto';
  d.innerHTML = '<div class="gp-head"><span>' + title + '</span><button class="gp-x" data-x>✕</button></div>' + html; document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove(); return d;
}
function agencyOpen() { Net.send({ t: 'emp', a: 'cands' }); }
function agencyRender(m) {
  const face = c => { const skin = ['#e8c49a', '#c89a74', '#a8764e', '#f0d0b0'][c.n.length % 4], cl = { v_maidf: '#6a4a5a', v_maidf2: '#3a4e6e', v_maidm: '#4a5a4a', v_maidm2: '#6a4a2e', v_segm: '#5a4030', v_segm2: '#3a4048', v_segf: '#4a3a40' }[c.look] || '#555';
    return '<span style="display:inline-block;width:38px;height:38px;border-radius:50%;background:' + cl + ';position:relative;flex:none"><span style="position:absolute;left:10px;top:5px;width:18px;height:18px;border-radius:50%;background:' + skin + '"></span>' + (c.g === 'f' ? '<span style="position:absolute;left:8px;top:2px;width:22px;height:8px;border-radius:8px 8px 2px 2px;background:#b84a3a"></span>' : '') + '<span style="position:absolute;left:12px;top:24px;width:14px;height:10px;background:#f4efe2;border-radius:2px"></span></span>'; };
  const head = '<div style="padding:10px 14px 4px;font-size:14px;opacity:.85">' + (m.home ? 'Sua casa: <b>' + m.home + '</b>. ' : '<b>Para um doméstico você precisa ter uma casa</b> (alugada ou comprada). ') + (m.have ? 'Doméstico: ' + m.have + '. ' : '') + 'Seguranças: ' + (m.segs || 0) + '/2. Na contratação a agência cobra um dia de salário.</div>';
  const rows = m.list.map(c => { const seg = c.role === 'seg', TR = seg ? m.str : m.tr, off = seg ? (m.segs || 0) >= 2 : (m.have || !m.home);
    return '<div style="display:flex;gap:10px;align-items:center;padding:8px 14px;border-top:1px solid rgba(255,255,255,.08);' + (c.gone ? 'opacity:.4;' : '') + (c.test ? 'background:rgba(200,170,80,.08);' : '') + '">' + face(c) + '<div style="flex:1;min-width:0"><b>' + c.n + '</b> · ' + (seg ? 'segurança' : c.g === 'f' ? 'doméstica' : 'doméstico') + ' · ' + c.xp + ' ano' + (c.xp > 1 ? 's' : '') + (seg ? ' de espada' : ' de casa') + (c.test ? ' · <b style="color:#e8c060">teste</b>' : '') + '<br><small><b>' + TR[c.tr].n + '</b>: ' + TR[c.tr].d + '</small></div><div style="text-align:right;flex:none"><b>' + (c.w || 'sem') + '</b> ' + (c.w ? 'ouro/dia' : 'salário') + '<br>' + (c.gone ? '<small>contratado</small>' : '<button class="lift-btn" style="padding:4px 10px;margin-top:4px" data-h="' + c.i + '"' + (off ? ' disabled' : '') + '>Contratar</button>') + '</div></div>'; }).join('');
  const d = staffPanel('agencymenu', 'Agência Mão Amiga · candidatos de hoje', head + rows + '<div style="padding:8px 14px 12px;font-size:13px;opacity:.7">Os candidatos mudam todo dia. O salário sai sozinho todo dia (primeiro do banco). Sem pagamento, o empregado avisa e vai embora no dia seguinte.</div>');
  d.querySelectorAll('[data-h]').forEach(b => b.onclick = () => Net.send({ t: 'emp', a: 'hire', i: +b.dataset.h }));
}
function empNear() { const E = G.emp, e = E && G.npcs[E.id], me = G.me; if (!e || !me || me.downed || me.bathing) return null; if ((e.fl || 0) !== (me.fl || 0)) return null; return Math.hypot((e.rx ?? e.x) - me.x, (e.ry ?? e.y) - me.y) < 2.4 ? e : null; }
function empPrompt() { const E = G.emp; return 'F: falar com ' + E.n + ' (' + (E.g === 'f' ? 'sua doméstica' : 'seu doméstico') + ')'; }
function empMenu() {
  const E = G.emp; if (!E) { const d = document.getElementById('empmenu'); if (d) d.remove(); return; }
  const n = Object.keys(E.inv || {}).length, opt = (o, ic, t, sub) => '<button class="lift-btn" data-o="' + o + '"><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  const html = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">' + E.n + ' · ' + EMP_TR[E.tr].n + ' · ' + E.w + ' ouro/dia · ' + E.home + (E.warn ? ' · <b style="color:#e88">salário atrasado</b>' : '') + '</div><div class="lift-list" style="padding-top:8px">' +
    (E.mode === 'follow' ? opt('home', '🏠', 'Fique em casa', 'Volta para casa e cuida das tarefas.') : opt('follow', '👣', 'Me siga', 'Anda atrás de você e coleta junto.')) +
    opt('bag', '🧺', 'Carregar (' + n + '/' + E.cap + ')', 'Passe itens para a mochila dele ou pegue de volta.') + opt('deliver', '📦', 'Leve isto para casa', 'Volta sozinho e guarda tudo no baú.') + opt('massage', '💆', 'Massagem', 'Em casa, deitado na cama: fôlego, vida e membros.') + opt('fire', '✋', 'Dispensar', 'Encerra o contrato.') + '</div>';
  const d = staffPanel('empmenu', E.n, html);
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; if (o === 'bag') { d.remove(); empBag(); return; } if (o === 'fire' && !confirm('Dispensar ' + E.n + '?')) return; d.remove(); Net.send({ t: 'emp', a: 'order', o }); });
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
function drawStaffFx(ctx, P, now) {
  const me = G.me; if (!me) return; const keys = Object.keys(G.bedMess || {}); if (!keys.length) return; const myFl = me.fl || 0, myB = myFl ? me.fb : bldAt(me.x, me.y);
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
function segSend(key) { const q = empOwnerP(key); if (!q) return; Net.toOne(q.id, { t: 'segme', list: segList(key).map(r => { const n = S.npcs[segNid(r)]; return { id: segNid(r), n: r.n, g: r.g, tr: r.tr, w: r.w, mode: r.mode, hp: Math.round(n ? n.hp : r.hp), maxHp: r.maxHp, warn: r.warn ? 1 : 0 }; }) }); }
function segQuit(key, r, why, dead) {
  const L = segLoad(), list = L[key] || [], i = list.indexOf(r); if (i >= 0) list.splice(i, 1); if (!list.length) delete L[key];
  const n = S.npcs[segNid(r)]; if (n) { if (dead) { n.dead = true; n.hp = 0; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 400 }); setTimeout(() => { if (S.npcs[n.id]) visGone(n); }, 25000); } else visGone(n); }
  estateSave(); const q = empOwnerP(key); if (q) { tell(q, why); segSend(key); }
}
function segOrder(p, key, m) {
  const r = segList(key).find(x => segNid(x) === m.id); if (!r) return; const n = S.npcs[segNid(r)]; if (!n) return;
  if (m.o !== 'fire' && ((n.fl || 0) !== (p.fl || 0) || dist(n.x, n.y, p.x, p.y) > 3)) { tell(p, 'Chegue perto de ' + r.n + '.'); return; }
  if (m.o === 'follow') { r.mode = 'follow'; r.post = null; empSay(n, 'Estou com você.'); }
  else if (m.o === 'post') { r.mode = 'post'; r.post = { x: n.x, y: n.y, fl: n.fl || 0, fb: n.fl ? n.fb : -1 }; empSay(n, 'Ninguém passa por aqui.'); }
  else if (m.o === 'home') { r.mode = 'home'; r.post = null; empSay(n, 'Vou guardar a sua porta.'); }
  else if (m.o === 'entrance') { const b = BUILDINGS.find(q2 => q2.door2L && stairKind(q2, 0) === 'lift'), d2 = b && door2Of(b); if (!d2) return; const dv = DOOR_V[d2.s] || [1, 0], sp = segDoorSpot(d2.x, d2.y, dv[0], dv[1], segList(key).indexOf(r)); r.mode = 'post'; r.post = { x: sp.x, y: sp.y, fl: 0, fb: -1, dir: sp.dir }; empSay(n, 'Fico na entrada do corredor do elevador.'); }
  else if (m.o === 'fire') { segQuit(key, r, r.n + ' foi dispensad' + (r.g === 'f' ? 'a' : 'o') + '.'); return; }
  n.goal = null; estateSave(); segSend(key);
}
function segDefend(attacker, victim) {   /* alguém bateu no seu patrão: os seguranças dele partem para cima */
  const L = S.estate && S.estate.seg, list = L && L[estOwner(victim)]; if (!list || !list.length) return;
  for (const r of list) { const n = S.npcs[segNid(r)]; if (!n || n.dead || (n.fl || 0) !== (attacker.fl || 0) || dist(n.x, n.y, attacker.x, attacker.y) > 12) continue; if (!n.fight) empSay(n, ['Tire as mãos do meu patrão!', 'Para trás!', 'Vai se ver comigo!'][Math.floor(Math.random() * 3)]); n.fight = { id: attacker.id, until: now_() + 20000 }; }
}
function segKilled(n, p) { const r = segList(n.seg).find(x => x.id === n.segId); n.fight = null; if (r) segQuit(n.seg, r, r.n + ' morreu lutando por você' + (p ? ' (golpe de ' + p.name + ')' : '') + '. O contrato acabou.', true); }
// posto ao lado da porta: no tile vizinho à porta, colado na parede, de costas para o prédio e de frente para a rua
function segDoorSpot(dx, dy, vx, vy, k) {
  const sx = -vy, sy = vx, side = k ? 1 : -1;
  for (const sd of [side, -side]) { const x = dx + vx * 1.0 + sx * sd * 1.0, y = dy + vy * 1.0 + sy * sd * 1.0; if (npcStand(x, y, 0.2)) return { x, y, dir: dirFromVecS(vx, vy) }; }
  return { x: dx + vx * 1.3 + sx * side * 0.6, y: dy + vy * 1.3 + sy * side * 0.6, dir: dirFromVecS(vx, vy) };
}
function segWatch(n, base, now) {   /* parado de guarda: olha para os lados de vez em quando */
  if (now > (n.glT || 0)) { n.glT = now + 4000 + Math.random() * 4000; n.glD = Math.random() < 0.5 ? -1 : 1; n.glUntil = now + 1400 + Math.random() * 800; }
  n.walk = false; n.dir = (base + (now < (n.glUntil || 0) ? n.glD : 0) + 8) % 8;
}
function segThreat(n, r, q) {   /* a fera mais perto que ameaça o patrão (ou o ponto vigiado) */
  const c = r.mode === 'post' && r.post ? r.post : r.mode === 'home' ? n : (q && !(q.fl || 0) ? q : n), R = r.tr === 'atento' ? 9 : 6; let best = null, bd = 1e9;
  for (const m of Object.values(S.monsters)) { if ((m.alt || 0) > 1 || m.hp <= 0) continue; const d0 = MON[m.type] || {}; const hostile = (q && m.aggro === q.id) || (m.aggro && d0.aggro > 0) || (d0.aggro > 0 && dist(m.x, m.y, c.x, c.y) < R * 0.7); if (!hostile) continue; const d = dist(m.x, m.y, c.x, c.y); if (d < R && d < bd) { bd = d; best = m; } }
  return best;
}
function segFightMonster(n, r, m, now, dt) {
  const d = dist(n.x, n.y, m.x, m.y); if (d > 1.4) { npcWalk(n, m.x, m.y, 2.5, dt); return; }
  n.dir = dirFromVecS(m.x - n.x, m.y - n.y); n.walk = false;
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
  if (n.hp < r.maxHp && now >= (n.regT || 0)) { n.regT = now + 1000; n.hp = Math.min(r.maxHp, n.hp + 1); }
  const low = n.hp < r.maxHp * 0.25 && r.tr !== 'leal';
  let m = n.monT && S.monsters[n.monT]; if (m && (m.hp <= 0 || dist(n.x, n.y, m.x, m.y) > 14)) m = null; if (!m && !low) { m = segThreat(n, r, q); if (m && n.monT !== m.id) empSay(n, ['Cuidado!', 'Deixa comigo!', 'Fique atrás de mim!'][Math.floor(Math.random() * 3)]); }
  n.monT = m ? m.id : null; if (m && !low) { segFightMonster(n, r, m, now, dt); return; }
  if (r.mode === 'post' && r.post) { if (!empGo(n, r.post, 1.2, dt)) return; n.walk = false; if (r.post.dir != null) segWatch(n, r.post.dir, now); return; }
  if (r.mode === 'home' || !q) { const home = Object.keys(S.estate.r).find(pid => S.estate.r[pid].owner === n.seg && PROPS_BY[pid] && PROPS_BY[pid].kind === 'house'), D = home ? doorTiles()[PROPS_BY[home].bi] : null; if (D) { const sp = segDoorSpot(D.x, D.y, (D.ox - D.x) / 1.3, (D.oy - D.y) / 1.3, L.indexOf(r)); if (npcWalk(n, sp.x, sp.y, 1.2, dt) || dist(n.x, n.y, sp.x, sp.y) < 0.4) segWatch(n, sp.dir, now); } return; }
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
  if (m.t === 'segme') { G.segs = m.list || []; const d = document.getElementById('segmenu'); if (d && d.dataset.id) segMenu(d.dataset.id); return true; }
  return _peG(m, now);
}; }
function segNear() { const me = G.me; if (!me || me.downed || !G.segs || !G.segs.length) return null; for (const s of G.segs) { const e = G.npcs[s.id]; if (e && !e.npDead && (e.fl || 0) === (me.fl || 0) && Math.hypot((e.rx ?? e.x) - me.x, (e.ry ?? e.y) - me.y) < 2.4) return s; } return null; }
function segPrompt() { const s = segNear(); return 'F: falar com ' + s.n + ' (segurança)'; }
function segMenu(id) {
  const s = (G.segs || []).find(x => x.id === id); if (!s) { const d = document.getElementById('segmenu'); if (d) d.remove(); return; }
  const opt = (o, ic, t, sub) => '<button class="lift-btn" data-o="' + o + '"><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  const html = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">' + s.n + ' · ' + SEG_TR[s.tr].n + ' · ' + (s.w ? s.w + ' ouro/dia' : 'teste, sem salário') + ' · vida ' + s.hp + '/' + s.maxHp + (s.warn ? ' · <b style="color:#e88">salário atrasado</b>' : '') + '</div><div class="lift-list" style="padding-top:8px">' +
    (s.mode !== 'follow' ? opt('follow', '🛡', 'Me acompanhe', 'Anda com você; quando você entra num prédio, vigia a porta.') : '') + (s.mode !== 'post' ? opt('post', '📍', 'Vigie aqui', 'Fica neste ponto e enfrenta quem chegar.') : '') + (s.mode !== 'home' ? opt('home', '🏠', 'Guarde a minha casa', 'Fica de guarda na porta de casa.') : '') + opt('entrance', '🚪', 'Vigie a entrada do elevador', 'Fica na porta do corredor do elevador do prédio do dojô.') + opt('fire', '✋', 'Dispensar', 'Encerra o contrato.') + '</div>';
  const d = staffPanel('segmenu', s.n + ' · segurança', html); d.dataset.id = id;
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; if (o === 'fire' && !confirm('Dispensar ' + s.n + '?')) return; d.remove(); Net.send({ t: 'emp', a: 'sorder', id, o }); });
}
