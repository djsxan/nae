// ============================================================
//  A VOZ DO POVO: apoio popular de cada casa nos lugares de
//  influência (Catedral, taverna, dojô, quartel, mercado, banco,
//  praça e guilhotina), a Fé da Irmã Lúmina (missa diária com
//  sermão que abençoa ou condena casas), os Irmãos Descalços e
//  o pregoeiro da praça. Na sucessão: 40% conselho, 35% povo,
//  25% Fé.
// ============================================================
const INF_PLACES = [
  { id: 'temple', n: 'Catedral da Aurora', ic: '⛪', act: 'Doar à Catedral em nome da casa', cost: 100, g: 6, faith: 4, npc: ['priest'], b: 'Catedral da Aurora' },
  { id: 'tavern', n: 'Ronco do Dragão', ic: '🍺', act: 'Pagar uma rodada para toda a taverna', cost: 60, g: 5, npc: ['innkeeper', 'tavmaid'], b: 'Ronco do Dragão' },
  { id: 'dojo', n: 'Dojô do Punho de Ferro', ic: '🥋', act: 'Patrocinar um torneio no tatame', cost: 120, g: 6, npc: ['st_dojo'], b: 'Dojô do Punho de Ferro' },
  { id: 'barracks', n: 'Quartel da Guarda', ic: '🛡', act: 'Pagar cerveja e soldo extra à guarda', cost: 90, g: 5, npc: ['captain'], b: 'Quartel da Guarda' },
  { id: 'market', n: 'Praça do Mercado', ic: '🍞', act: 'Distribuir pão ao povo', cost: 50, g: 4, npc: ['merchant', 'fruit'], pt: [0.5, 13, 10] },
  { id: 'bank', n: 'Banco de Nae', ic: '🏦', act: 'Perdoar as dívidas de pequenos comerciantes', cost: 150, g: 6, npc: ['banker'], b: 'Banco de Nae' },
  { id: 'plaza', n: 'Praça do Castelo', ic: '📣', act: 'Pagar um pregão a favor da casa', cost: 40, g: 4, npc: ['crier'], rumor: 60 },
  { id: 'gallows', n: 'Guilhotina', ic: '⚖', act: 'Pagar uma execução pública de bandidos', cost: 80, g: 5, npc: ['executioner'] },
];
const INF_BY = Object.fromEntries(INF_PLACES.map(p => [p.id, p]));
const INF_HOUSES = ['aurenfell', 'valcarne', 'draemor', 'moranthe', 'thornvale', 'solmire'];
const INF_HN = { aurenfell: 'Casa Aurenfell' };
const infHN = id => INF_HN[id] || (typeof HOUSE_BY !== 'undefined' && HOUSE_BY[id] ? HOUSE_BY[id].n : id);
/* apoio de base de cada casa em cada lugar (o apoio volta devagar para cá) e os lugares preferidos de cada uma */
const INF_BASE = { aurenfell: { _: 28, temple: 35, plaza: 35, barracks: 32 }, valcarne: { _: 14, temple: 30, barracks: 28 }, draemor: { _: 10, barracks: 24, dojo: 30, gallows: 24 },
  moranthe: { _: 12, tavern: 26, plaza: 24 }, thornvale: { _: 12, dojo: 26, tavern: 24, gallows: 18 }, solmire: { _: 12, bank: 36, market: 30 } };
const INF_FAV = { valcarne: ['temple', 'barracks'], draemor: ['dojo', 'barracks'], moranthe: ['tavern', 'plaza'], thornvale: ['dojo', 'tavern'], solmire: ['bank', 'market'] };
const INF_FAITH0 = { aurenfell: 20, valcarne: 25, draemor: -15, moranthe: 0, thornvale: 5, solmire: -5 };
const INF_FAITH_DAY = { valcarne: 2, draemor: -2, solmire: -1 };   /* a cada dia: os Valcarne vão à missa, os Draemor pagam mercenários, os Solmire cobram juros */
const infBase = (h, pl) => (INF_BASE[h][pl] != null ? INF_BASE[h][pl] : INF_BASE[h]._);
function infRec() {
  S.estate.inf = S.estate.inf || { day: 0, sup: {}, faith: {}, done: {}, mass: {}, kills: {} }; const I = S.estate.inf;
  for (const pl of INF_PLACES) { I.sup[pl.id] = I.sup[pl.id] || {}; for (const h of INF_HOUSES) if (I.sup[pl.id][h] == null) I.sup[pl.id][h] = infBase(h, pl.id); }
  for (const h of INF_HOUSES) if (I.faith[h] == null) I.faith[h] = INF_FAITH0[h]; return I; }
const clampI = (v, a, b) => Math.max(a, Math.min(b, v));
function infAdd(h, pl, d) { const I = infRec(); I.sup[pl][h] = clampI(Math.round((I.sup[pl][h] + d) * 10) / 10, 0, 100); }
function infPop(h) { const I = infRec(); let s = 0; for (const pl of INF_PLACES) s += I.sup[pl.id][h]; return Math.round(s / INF_PLACES.length); }
function infFaithAdd(h, d) { const I = infRec(); I.faith[h] = clampI(I.faith[h] + d, -100, 100); }
/* projeção da sucessão: conselho (prestígio) 40%, povo 35%, Fé 25% */
function infElection() {
  const I = infRec(), H = typeof hRec === 'function' ? hRec() : null, C = typeof crownRec === 'function' ? crownRec() : { hp: 70 };
  return INF_HOUSES.map(h => { const council = h === 'aurenfell' ? Math.round(50 + (C.hp || 0) / 4) : H ? H.st[h].prestige : 50, people = infPop(h), faith = Math.round((I.faith[h] + 100) / 2);
    return { h, n: infHN(h), council, people, faith, score: Math.round(council * 0.40 + people * 0.35 + faith * 0.25) }; }).sort((a, b) => b.score - a.score); }
/* herança: por padrão o trono passa ao filho mais velho do rei; uma casa rival só o tira no voto se passar a casa do trono por mais de INF_HEIR.margin pontos (ou à força) */
const INF_HEIR = { name: 'Príncipe Alaric Aurenfell', rel: 'filho mais velho do rei', house: 'aurenfell', margin: 10 };
function infHeirNow() { if (typeof sucRec !== 'function') return Object.assign({ king: 'Rei Edric, o Velho', kh: 'aurenfell' }, INF_HEIR); const U = sucRec(), kh = U.king && U.king.startsWith('h:') ? U.king.slice(2) : 'aurenfell', L = typeof sucLine === 'function' ? sucLine() : [], k = L[0];
  const rel = !k ? 'ninguém na linha' : k === 'alaric' ? (U.king === 'edric' ? 'filho mais velho do rei' : 'príncipe da casa real') : k === 'corwyn' ? (U.king === 'edric' ? 'irmão do rei' : U.king === 'alaric' ? 'tio do rei' : 'da casa real') : 'casa seguinte na linha';
  return { king: sucKingName(), kh, name: k ? sucName(k) : '—', rel, house: k ? (k.startsWith('h:') ? k.slice(2) : 'aurenfell') : kh, margin: INF_HEIR.margin }; }
function infSuccessor() { const Hn = infHeirNow(), E = infElection(), hh = Hn.house === 'aurenfell' || !E.some(e => e.h === Hn.house) ? 'aurenfell' : Hn.house, au = E.find(e => e.h === hh), top = E.find(e => e.h !== hh); const vote = top && au && top.score > au.score + Hn.margin;
  return { king: Hn.king, heir: Hn.name, rel: Hn.rel, margin: Hn.margin, hn: (au || {}).n || infHN(hh), winner: vote ? top.h : hh, wn: vote ? top.n : Hn.name, by: vote ? 'voto' : 'sangue', gap: top && au ? top.score - au.score : 0 }; }
function infVow(p) { const k = estOwner(p); const hv = typeof hRec === 'function' ? hRec().vow[k] : null; if (hv) return hv; return typeof crownRec === 'function' && crownRec().vow[k] ? 'aurenfell' : null; }
function infNews(t) { if (typeof hNews === 'function') hNews(t); }
function infDaily() {   /* as casas investem nos lugares preferidos; o apoio volta devagar para a base; a Fé muda com o que cada casa fez */
  const I = infRec();
  for (const pl of INF_PLACES) for (const h of INF_HOUSES) { const v = I.sup[pl.id][h], b = infBase(h, pl.id); I.sup[pl.id][h] = clampI(Math.round((v + (b - v) * 0.12) * 10) / 10, 0, 100); }
  for (const h in INF_FAV) { for (const pl of INF_FAV[h]) infAdd(h, pl, 2 + Math.random() * 2); infAdd(h, INF_PLACES[Math.floor(Math.random() * INF_PLACES.length)].id, 1); }
  { const C = typeof crownRec === 'function' ? crownRec() : null; if (C && C.bad) infAdd('aurenfell', 'plaza', -2); }   /* o povo sente quando o rei está fraco */
  for (const h of INF_HOUSES) { I.faith[h] = clampI(Math.round(I.faith[h] * 0.95 + (INF_FAITH_DAY[h] || 0)), -100, 100); }
  estateSave(); }
function templeBi() { return BUILDINGS.findIndex(b => b.name === 'Catedral da Aurora'); }
function infAt(p, pl) {   /* o jogador está no lugar? */
  const P = INF_BY[pl]; if (!P) return false;
  if (P.b) { const bi = BUILDINGS.findIndex(b => b.name === P.b); if (bi < 0) return false; if (WORLD.bld[tileAt(p.x, p.y)] === bi || ((p.fl || 0) && p.fb === bi)) return true; const d = doorOf(BUILDINGS[bi]); return dist(p.x, p.y, d.x + 0.5, d.y + 0.5) < 4; }
  if (P.pt) return dist(p.x, p.y, CENTER + P.pt[0], CENTER + P.pt[1]) < P.pt[2];
  if (pl === 'plaza') { const c = S.npcs.inf_crier; return !!c && dist(p.x, p.y, c.x, c.y) < 4; }
  if (pl === 'gallows') return STAGE.x >= 0 && dist(p.x, p.y, STAGE.x, STAGE.y) < 6;
  return false; }
function infPublic(p, pl) { const I = infRec(), k = estOwner(p), vow = infVow(p);
  return { place: pl, sup: I.sup[pl], pop: Object.fromEntries(INF_HOUSES.map(h => [h, infPop(h)])), faith: I.faith, vow, done: !!(I.done[k] && I.done[k][pl] === estDay()), rumorDone: !!(I.done[k] && I.done[k]['rumor'] === estDay()), elec: infElection() }; }
function infMsg(p, m) {
  const I = infRec(), k = estOwner(p), pl = m.place, P = INF_BY[pl]; if (!P) return;
  if (!infAt(p, pl)) { tell(p, 'Você precisa estar em ' + P.n + '.'); return; }
  const send = () => Net.toOne(p.id, Object.assign({ t: 'infmenu' }, infPublic(p, pl)));
  if (m.a === 'open') { send(); return; }
  const vow = infVow(p); if (!vow) { tell(p, 'Jure lealdade a uma casa (ou à coroa) antes de trabalhar o povo em nome dela.'); send(); return; }
  I.done[k] = I.done[k] || {};
  if (m.a === 'act') { if (I.done[k][pl] === estDay()) { tell(p, 'Você já fez isso hoje aqui. O povo esquece rápido, mas não tão rápido: volte amanhã.'); send(); return; }
    const c0 = Math.round(P.cost * (pl === 'temple' && typeof tatKnown === 'function' && tatKnown(p, 'faith') ? 0.75 : 1));   /* quem a Fé reconhece pela marca doa com desconto */
    if ((p.gold || 0) < c0) { tell(p, 'Ouro insuficiente (' + c0 + ').'); return; } p.gold -= c0; sendStat(p); I.done[k][pl] = estDay();
    infAdd(vow, pl, P.g); if (P.faith) infFaithAdd(vow, P.faith); if (vow === 'aurenfell') { if (typeof crownFavor === 'function') crownFavor(p, 2, 'apoio do povo'); } else if (typeof hFavor === 'function') hFavor(p, vow, 2, 'apoio do povo');
    const say = { temple: 'A Aurora abençoa quem dá. A Fé lembrará da ' + infHN(vow) + '.', tavern: 'Uma rodada pra todo mundo, por conta da ' + infHN(vow) + '!', dojo: 'O torneio da ' + infHN(vow) + ' vai encher o tatame!', barracks: 'Os rapazes vão brindar à ' + infHN(vow) + ' hoje.', market: 'Pão para todos, em nome da ' + infHN(vow) + '!', bank: 'Dívidas perdoadas... a ' + infHN(vow) + ' tem bom coração. Ou boa memória.', plaza: 'Ouçam, ouçam! A ' + infHN(vow) + ' cuida do povo de Nae!', gallows: 'Mais bandidos na lâmina, por ordem e conta da ' + infHN(vow) + '!' }[pl];
    const who = Object.values(S.npcs).find(n => !n.dead && P.npc.some(kk => n.kind === kk || (kk === 'crier' && n.id === 'inf_crier')) && dist(n.x, n.y, p.x, p.y) < 8); if (who) empSay(who, say); else tell(p, say);
    near(p.x, p.y, { t: 'chat', name: '', text: p.name + ': ' + P.act.toLowerCase() + ' (' + infHN(vow) + ').' });
    if (Math.random() < 0.5) infNews(p.name + ' fez um gesto pela ' + infHN(vow) + ' em ' + P.n + ': ' + P.act.toLowerCase() + '.');
    estateSave(); send(); return; }
  if (m.a === 'rumor') { if (!P.rumor) return; const tgt = m.h; if (!INF_HOUSES.includes(tgt) || tgt === vow) return; if (I.done[k].rumor === estDay()) { tell(p, 'Um boato por dia já basta, ou vão desconfiar de você.'); send(); return; }
    if ((p.gold || 0) < P.rumor) { tell(p, 'Ouro insuficiente (' + P.rumor + ').'); return; } p.gold -= P.rumor; sendStat(p); I.done[k].rumor = estDay();
    infAdd(tgt, 'plaza', -5); infAdd(tgt, 'tavern', -3); infAdd(tgt, 'market', -2);
    if (Math.random() < 0.25) { infAdd(vow, 'plaza', -4); tell(p, 'O boato contra a ' + infHN(tgt) + ' pegou, mas alguém contou quem pagou o pregoeiro. A ' + infHN(vow) + ' perdeu apoio na praça.'); infNews('Descobriram que ' + p.name + ' (' + infHN(vow) + ') pagou boatos contra a ' + infHN(tgt) + '.'); if (tgt !== 'aurenfell' && typeof hRel === 'function' && vow !== 'aurenfell') hRel(vow, tgt, -6); }
    else { tell(p, 'O pregoeiro espalhou o boato. A ' + infHN(tgt) + ' perdeu apoio na praça, na taverna e no mercado.'); infNews('Corre pela cidade um boato feio sobre a ' + infHN(tgt) + '.'); }
    estateSave(); send(); return; } }
/* atos visíveis: caçar monstros perto da cidade conta pontos com a guarda */
if (typeof killMonster === 'function') { const _kmI = killMonster; killMonster = function (m, p) { try { if (p && m && S.estate && dist(m.x, m.y, CENTER, CENTER) < 75) { const v = infVow(p); if (v) infAdd(v, 'barracks', 0.3); } } catch (e) { } return _kmI.apply(this, arguments); }; }
// ---------------- MISSA, IRMÃOS DESCALÇOS E PREGOEIRO ----------------
const MASS_H0 = 8, MASS_SERMON = 8.5, MASS_H1 = 9;
const FAITHFUL_KINDS = ['v_peasm', 'v_peasf', 'v_elderm', 'v_elderf', 'v_noblef', 'v_maidf', 'v_peasm', 'v_elderf'];
const BAREFOOT = [{ id: 'inf_bf1', name: 'Irmão Descalço Anselmo' }, { id: 'inf_bf2', name: 'Irmão Descalço Benedito' }, { id: 'inf_bf3', name: 'Irmã Descalça Clara' }, { id: 'inf_bf4', name: 'Irmão Descalço Damião' }];
const BF_ROUTE = () => { const tb = BUILDINGS[templeBi()], d = tb ? doorOf(tb) : { x: CENTER + 12, y: CENTER + 17 }; return [[d.x + 0.5, d.y + 2.5], [CENTER + 0.5, CENTER + 13], [CENTER + 2.5, CENTER + 4.5], [STAGE.x >= 0 ? STAGE.x + 2.2 : CENTER - 3, STAGE.y >= 0 ? STAGE.y + 2.5 : CENTER + 5], [CENTER - 4, CENTER + 14]]; };
const BF_LINES = ['Arrependam-se! A Aurora vê todos os pecados.', 'Os pobres de Nae não comem promessas de lordes.', 'A Fé não se curva à coroa. A coroa se curva à Fé.', 'Missa amanhã de manhã. Não faltem.', 'Ouro de agiota não compra o céu.'];
const CRIER_POS = () => [CENTER + 4.5, CENTER + 3.5];
function infSpawn(id, kind, name, x, y) { if (S.npcs[id]) return S.npcs[id]; const n = { id, kind, name, transient: true, court: 'inf', x, y, z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n; }
function infMove(n, T, dt, sp) {   /* entra e sai da Catedral pela porta: lá fora, na frente da porta; depois a porta; depois o lugar */
  { const tb = templeBi(), b = BUILDINGS[tb]; if (b) { const inT = WORLD.bld[tileAt(T.x, T.y)] === tb, inN = WORLD.bld[tileAt(n.x, n.y)] === tb; if (inT !== inN) { const [dx, dy] = doorTile(b), dv = DOOR_V[b.door || 'S'], ox = dx + 0.5 + dv[0] * 1.6, oy = dy + 0.5 + dv[1] * 1.6, ix = dx + 0.5 - dv[0] * 0.6, iy = dy + 0.5 - dv[1] * 0.6;
    const W = inN ? (dist(n.x, n.y, ix, iy) > 0.25 ? { x: ix, y: iy } : { x: ox, y: oy, thru: 1 }) : (dist(n.x, n.y, ox, oy) > 0.25 ? { x: ox, y: oy } : { x: ix, y: iy, thru: 1 }); if (W.thru) { n.x = W.x; n.y = W.y; n.dir = dirFromVecS(W.x - n.x, W.y - n.y); n.walk = true; return false; } T = Object.assign({}, T, { x: W.x, y: W.y, snap: 0 }); } } }
  const d = dist(n.x, n.y, T.x, T.y);
  if (d > 30 || (T.snap && d < 1.3)) { n.x = T.x; n.y = T.y; n.walk = false; return true; } if (d < 0.15) { n.walk = false; return true; }
  const s = Math.min(d, (sp || 1.3) * dt), nx = n.x + (T.x - n.x) / d * s, ny = n.y + (T.y - n.y) / d * s, ok = (x, y) => canStand(x, y, 0, 0.2);
  if (ok(nx, ny)) { n.x = nx; n.y = ny; n._stk = 0; } else { if (ok(nx, n.y)) n.x = nx; else if (ok(n.x, ny)) n.y = ny; if (++n._stk > 25) { n.x = T.x; n.y = T.y; n._stk = 0; } }
  n.dir = dirFromVecS(T.x - n.x, T.y - n.y); n.walk = true; return false; }
function infFreeNear(x, y) { if (canStand(x, y, 0, 0.25)) return [x, y]; for (let r = 1; r <= 3; r++) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a / 8 * Math.PI * 2) * r * 0.7, py = y + Math.sin(a / 8 * Math.PI * 2) * r * 0.7; if (canStand(px, py, 0, 0.25)) return [px, py]; } return [x, y]; }
function massSermon() {   /* Lúmina abençoa a casa mais devota e condena a menos devota */
  const I = infRec(), pr = S.npcs.priest, L = INF_HOUSES.slice().sort((a, b) => I.faith[b] - I.faith[a]), best = L[0], worst = L[L.length - 1], out = [];
  if (I.faith[best] >= 20) { infAdd(best, 'temple', 8); for (const pl of INF_PLACES) if (pl.id !== 'temple') infAdd(best, pl.id, 2); out.push('abençoou a ' + infHN(best)); if (pr) empSay(pr, 'A Aurora sorri para a ' + infHN(best) + ', que não esquece os pobres nem o altar.'); }
  if (I.faith[worst] <= -20) { infAdd(worst, 'temple', -8); for (const pl of INF_PLACES) if (pl.id !== 'temple') infAdd(worst, pl.id, -3); out.push('condenou a ' + infHN(worst)); setTimeout(() => { if (pr) empSay(pr, 'E a ' + infHN(worst) + '? Ouro sujo, espadas de aluguel. Que se arrependa, ou a Fé se levantará.'); }, 2500); }
  if (!out.length && pr) empSay(pr, 'Rezemos pelo Rei Edric, e para que os lordes lembrem que a coroa é emprestada pela Aurora.');
  const tb = templeBi(); for (const q of Object.values(S.players)) { if (WORLD.bld[tileAt(q.x, q.y)] !== tb) continue; const v = infVow(q); const k = estOwner(q); I.done[k] = I.done[k] || {}; if (I.done[k].mass === estDay()) continue; I.done[k].mass = estDay();
    if (v) { infFaithAdd(v, 2); infAdd(v, 'temple', 2); } q.hp = q.maxHp; sendStat(q); tell(q, 'Você assistiu à missa da Irmã Lúmina. Sua vida foi restaurada' + (v ? ' e a Fé lembrará da ' + infHN(v) + ' (+2 de fé).' : '.')); }
  infNews('Na missa da manhã, a Irmã Lúmina ' + (out.length ? out.join(' e ') : 'rezou pelo rei') + '.'); sys('Missa na Catedral da Aurora: a Irmã Lúmina ' + (out.length ? out.join(' e ') : 'rezou pelo rei') + '.'); estateSave(); }
function infTick(now) {
  if (!S.estate || !S.npcs || TEST3D || now - (S.infT || 0) < 200) return; const dt = Math.min(0.4, (now - (S.infT || now)) / 1000) || 0.2; S.infT = now; const I = infRec();
  if (I.day !== estDay()) { const first = !I.day; I.day = estDay(); if (!first) infDaily(); else estateSave(); }
  const hh = empHour(), tb = templeBi(), b = BUILDINGS[tb]; if (!b) return; const M = I.mass;
  const seats = (WORLD.seats || []).filter(s => s.bi === tb), massOn = hh >= MASS_H0 - 0.4 && hh < MASS_H1;
  if (hh >= MASS_H0 - 0.5 && hh < MASS_H0 && M.bell !== estDay()) { M.bell = estDay(); sys('Os sinos da Catedral da Aurora chamam para a missa da manhã.'); }
  if (hh >= MASS_SERMON && hh < MASS_H1 && M.sermon !== estDay()) { M.sermon = estDay(); massSermon(); }
  /* fiéis: chegam pela porta, sentam nos bancos e vão embora no fim */
  const d = doorOf(b), dv = DOOR_V[b.door || 'S'], ox = d.x + 0.5 + dv[0] * 2, oy = d.y + 0.5 + dv[1] * 2;
  FAITHFUL_KINDS.forEach((kind, i) => { const id = 'inf_ff' + i; let n = S.npcs[id]; const s = seats[i % Math.max(1, seats.length)];
    if (massOn && s) { if (!n) n = infSpawn(id, kind, 'Fiel da Catedral', ox + (i % 3) * 0.5 - 0.5, oy + Math.floor(i / 3) * 0.5); if (n.dead || n.downed) return; const at = infMove(n, { x: s.x, y: s.y, snap: 1 }, dt, 1.1); n.sitting = !!at; if (at) n.dir = s.dir; }
    else if (n && !n.dead) { n.sitting = false; if (infMove(n, { x: ox, y: oy }, dt, 1.2)) visGone(n); } });
  /* Irmãos Descalços: ronda pela cidade de dia, ao lado do altar na missa, dormem na Catedral */
  const R = BF_ROUTE(), alt = localToWorld(b, doorCol(b) + 0.5, 1.6);
  BAREFOOT.forEach((def, i) => { let n = S.npcs[def.id]; if (!n) { const [x, y] = infFreeNear(ox + i * 0.6 - 0.9, oy + 0.5); n = infSpawn(def.id, 'barefoot', def.name, x, y); } if (n.dead || n.downed) return;
    let T; if (massOn) { const [x, y] = localToWorld(b, doorCol(b) + 0.5 + (i < 2 ? -1.6 - i * 0.7 : 1.6 + (i - 2) * 0.7), 1.4); T = { x, y }; }
    else if (hh >= 7 && hh < 20) { const k = (Math.floor(now / 25000) + i) % R.length, w = R[k], [x, y] = infFreeNear(w[0] + (i % 2) * 0.9, w[1] + (i >> 1) * 0.9); T = { x, y, walk: 1 }; }
    else { const [x, y] = localToWorld(b, 1.5 + i * 1.6, b.h - 1.6); T = { x, y }; }
    const at = infMove(n, T, dt, T.walk ? 1.0 : 1.3); if (at && massOn) n.dir = dirFromVecS(alt[0] - n.x, alt[1] - n.y);
    if (!massOn && hh >= 7 && hh < 20 && Math.random() < 0.0015) { const bad = Object.values(S.players).find(q => now < (q.wanted || 0) && dist(q.x, q.y, n.x, n.y) < 7); empSay(n, bad ? bad.name + ', pecador! Ajoelhe-se e confesse, ou a guarda virá por você!' : BF_LINES[Math.floor(Math.random() * BF_LINES.length)]); } });
  /* pregoeiro da praça do castelo: de dia grita as notícias das casas */
  { const [cx, cy] = CRIER_POS(); let n = S.npcs.inf_crier; if (!n) { const [x, y] = infFreeNear(cx, cy); n = infSpawn('inf_crier', 'crier', 'Tomé, o Pregoeiro', x, y); n.home = [x, y]; }
    if (!n.dead && !n.downed) { infMove(n, { x: n.home[0], y: n.home[1] }, dt); if (hh >= 7 && hh < 21 && now - (n.cryT || 0) > 70000) { n.cryT = now; const H = typeof hRec === 'function' ? hRec() : null, nw = H && H.news[Math.floor(Math.random() * Math.min(4, H.news.length))]; empSay(n, 'Ouçam, ouçam! ' + (nw ? nw[1] : 'Que a Aurora guarde o Rei Edric!')); } } }
}
// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  NPC_LOOKS.barefoot = () => Object.assign(heroLook('mage', 'adept', '#5e5850'), { armor: 'robe', body: tone('#5e5850'), body2: tone('#4a453e'), accent: tone('#c8b070'), trim: tone('#3a3630'), head: 'none', hair: tone('#4a3a2a'), hairStyle: 'short', beard: tone('#5a4a3a'), weapon: 'staff', capeTone: null, cape: false, shield: null, skin: tone('#c8946a'), barefoot: true });
  NPC_LOOKS.crier = () => Object.assign(heroLook('archer', 'scout', '#9a2a1c'), { armor: 'vest', body: tone('#9a2a1c'), body2: tone('#f1cf6a'), accent: tone('#f1cf6a'), trim: tone('#6e1d14'), head: 'none', hair: tone('#7a5a3a'), hairStyle: 'short', beard: tone('#7a5a3a'), weapon: null, quiver: false, shield: null, cape: false });
  if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { barefoot: 'mage', crier: 'archer' }); }
const INF_NPC_PLACE = (() => { const o = {}; for (const P of INF_PLACES) for (const k of P.npc) o[k] = P.id; return o; })();
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peI = progEvent; progEvent = function (m, now) {
  if (m.t === 'infmenu') { G.inf = m; infMenu(m); return true; }
  return _peI(m, now); }; }
function infNear() { const me = G.me; if (!me) return null; const e = G.npcs.inf_crier; if (!e || e.dead || (me.fl || 0)) return null; return Math.hypot(e.rx - me.x, e.ry - me.y) < 2.4 ? e : null; }
if (typeof buildDialogOptions === 'function') { const _bdoI = buildDialogOptions; buildDialogOptions = function (id) { _bdoI(id);
  try { const n = (typeof NPCS !== 'undefined' && NPCS.find(q => q.id === id)) || G.npcs[id], pl = n && INF_NPC_PLACE[n.kind]; if (!pl) return; const box = document.getElementById('dlg-opts'); if (!box || (id === 'fruit' && !box.children.length)) return;
    const bt = document.createElement('button'); bt.textContent = '⚜ Influência das casas aqui (' + INF_BY[pl].n + ')'; bt.onclick = () => { closeDialog(); Net.send({ t: 'inf', a: 'open', place: pl }); }; box.appendChild(bt); } catch (e) { } }; }
const INF_COL = { aurenfell: ['#6e1d14', '#f1cf6a', '🗼'] };
const infCol = h => INF_COL[h] || (typeof HOUSE_BY !== 'undefined' && HOUSE_BY[h] ? [HOUSE_BY[h].c1, HOUSE_BY[h].c2, HOUSE_BY[h].ic] : ['#444', '#ccc', '⚜']);
const faithWord = v => v >= 40 ? 'abençoada' : v >= 15 ? 'devota' : v > -15 ? 'morna' : v > -40 ? 'suspeita' : 'condenada';
function infMenu(m) {
  const P = INF_BY[m.place]; if (!P) return; const bar = (v, c) => '<div style="height:7px;background:rgba(255,255,255,.12);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + Math.round(v) + '%;background:' + c + '"></div></div>';
  const rows = INF_HOUSES.slice().sort((a, b) => m.sup[b] - m.sup[a]).map(h => { const [c1, c2, ic] = infCol(h); return '<span style="white-space:nowrap">' + ic + ' ' + infHN(h).replace('Casa ', '') + (m.vow === h ? ' ★' : '') + '</span>' + bar(m.sup[h], c2) + '<span style="text-align:right">' + Math.round(m.sup[h]) + '</span>'; }).join('');
  let body = '<div style="padding:8px 14px 0;font-size:13px;opacity:.85">Quem o povo daqui apoia. O apoio sobe com patrocínios, atos e boatos, e volta devagar ao normal com os dias.</div><div style="display:grid;grid-template-columns:auto 1fr 28px;gap:5px 8px;align-items:center;padding:8px 14px;font-size:13px">' + rows + '</div>';
  if (m.place === 'temple') body += '<div style="padding:0 14px 6px;font-size:12.5px;opacity:.9"><b>A Fé da Irmã Lúmina</b>: ' + INF_HOUSES.map(h => infHN(h).replace('Casa ', '') + ' <i>' + faithWord(m.faith[h]) + '</i>').join(' · ') + '<br><small>Missa todo dia às 8h: ela abençoa a casa mais devota e condena a menos devota. Quem assiste ganha fé para a sua casa.</small></div>';
  const opt = (o, ic, t, sub, dis) => '<button class="lift-btn" data-o="' + o + '"' + (dis ? ' disabled' : '') + '><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  body += '<div class="lift-list">' + (m.vow ? opt('act', P.ic, P.act, P.cost + ' de ouro · +' + P.g + ' de apoio para a ' + infHN(m.vow) + (P.faith ? ' e +' + P.faith + ' de fé' : '') + (m.done ? ' · já feito hoje' : ' · uma vez por dia'), m.done) : '<div style="padding:6px 14px;font-size:13px;opacity:.8">Jure lealdade a uma casa (ou à coroa) para trabalhar o povo em nome dela.</div>');
  if (P.rumor && m.vow) body += '<div style="padding:6px 14px 2px;font-size:12.5px;opacity:.85">Espalhar um boato contra outra casa (' + P.rumor + ' de ouro, um por dia; às vezes descobrem quem pagou):</div><div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 8px">' + INF_HOUSES.filter(h => h !== m.vow).map(h => '<button class="lift-btn" style="flex:0 0 auto;padding:6px 10px" data-o="r_' + h + '"' + (m.rumorDone ? ' disabled' : '') + '>' + infCol(h)[2] + ' ' + infHN(h).replace('Casa ', '') + '</button>').join('') + '</div>';
  body += '</div>';
  const d = staffPanel('infmenu', P.ic + ' ' + P.n, body);
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; if (o.startsWith('r_')) Net.send({ t: 'inf', a: 'rumor', place: m.place, h: o.slice(2) }); else Net.send({ t: 'inf', a: o, place: m.place }); });
}
/* aba Casas: apoio do povo, Fé e a projeção da sucessão */
function infTabHtml(D) { const I = D && D.inf; if (!I) return ''; const bar = (v, c) => '<div style="height:6px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + Math.round(v) + '%;background:' + c + '"></div></div>';
  const el = I.elec.map((e, i) => { const [c1, c2, ic] = infCol(e.h); return '<div style="display:grid;grid-template-columns:22px 1fr 42px;gap:6px;align-items:center;font-size:13px"><b>' + (i + 1) + 'º</b><span>' + ic + ' <b style="color:' + c2 + '">' + e.n + '</b> <small style="opacity:.75">conselho ' + e.council + ' · povo ' + e.people + ' · fé ' + e.faith + '</small></span><b style="text-align:right">' + e.score + '</b></div>'; }).join('');
  const hd = '<tr><th style="text-align:left;padding:3px 6px">Lugar</th>' + INF_HOUSES.map(h => '<th title="' + infHN(h) + '" style="padding:3px 4px">' + infCol(h)[2] + '</th>').join('') + '</tr>';
  const tr = INF_PLACES.map(P => { const mx = Math.max(...INF_HOUSES.map(h => I.sup[P.id][h])); return '<tr><td style="padding:3px 6px;white-space:nowrap">' + P.ic + ' ' + P.n + '</td>' + INF_HOUSES.map(h => { const v = Math.round(I.sup[P.id][h]); return '<td style="text-align:center;padding:3px 4px;' + (I.sup[P.id][h] === mx ? 'font-weight:700;color:' + infCol(h)[1] : 'opacity:.75') + '">' + v + '</td>'; }).join('') + '</tr>'; }).join('');
  const sc = I.succ, sl = sc ? '<div style="font-size:13px;padding:0 4px 8px;line-height:1.45">Por direito de sangue, o trono passa ao <b>' + sc.rel + '</b>: <b style="color:#f1cf6a">' + sc.heir + '</b>. Uma casa rival só o tira no voto se passar a ' + (sc.hn || 'Casa Aurenfell') + ' por mais de ' + sc.margin + ' pontos, ou à força.<br>Hoje o trono ficaria com <b>' + sc.wn + '</b>' + (sc.by === 'voto' ? ' (pelo voto do conselho, do povo e da Fé)' : sc.gap > 0 ? ' (a casa rival mais forte está ' + sc.gap + ' pontos à frente, mas não basta)' : ' (por direito de sangue)') + '.</div>' : '';
  return '<h3 style="margin:16px 4px 6px;font-size:15px">Se o ' + ((sc && sc.king) || 'Rei Edric').replace(/, o Velho$/, '') + ' morresse hoje</h3>' + sl + '<div style="font-size:12px;opacity:.75;padding:0 4px 6px">Conselho 40% (prestígio) · Povo 35% (apoio nos lugares) · Fé 25% (Irmã Lúmina). Uma casa ainda pode tentar tomar o trono à força.</div><div style="display:grid;gap:5px;padding:0 4px">' + el + '</div>' +
    '<h3 style="margin:16px 4px 6px;font-size:15px">Apoio do povo por lugar</h3><div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12.5px;width:100%">' + hd + tr + '</table></div>' +
    '<div style="font-size:12px;opacity:.75;padding:6px 4px">Fale com quem cuida de cada lugar (⚜ Influência): Irmã Lúmina, o taverneiro, o sensei, a capitã, o mercador, o banqueiro, Tomé, o Pregoeiro (praça do castelo), e o carrasco.</div>'; }
