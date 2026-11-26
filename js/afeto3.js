// ============================================================
//  AFETO DOS NPCS E TESTEMUNHAS (pedido de 26/11)
//  Casais NPC demonstram afeto de vez em quando: os lordes e as damas das casas, e os casais do povo (quem trabalha
//  na mesma loja: vendedor e vendedora, artesão e artesã). O humor do casamento pesa (casal em crise quase não troca
//  carinho; quem tem amante dá menos carinho em casa). O cônjuge NPC do jogador toma a iniciativa sozinho.
//  Amantes secretos: em algumas noites um nobre encontra um amante (jardim do casarão, Termas, Casa de Veludo ou um
//  beco); quem vê ganha um segredo da casa dele (tem um amante).
//  Infidelidade do jogador casado só vira segredo se um NPC VIR. Criminosos chantageiam, gente de casa rival leva ao
//  lorde, a Ysolde e o Mestre Corvin compram, os outros espalham na fofoca (que pode chegar ao cônjuge).
//  A testemunha pode ser subornada ou ameaçada; às vezes vende o segredo à Ysolde. O jogador só percebe que foi visto
//  quando a testemunha está perto (até 4 casas).
// ============================================================
const AF3 = { every: 20000, chance: 0.18, dur: [12000, 18000], near: 4.5, trystP: 0.5, witR: 9, noticeR: 4, bribe: 40, threat: 0.5, crimDelay: [60000, 120000], rivalDelay: [120000, 300000], sellDelay: [180000, 400000], sellP: 0.3, revealP: 0.15, spouseCd: [240000, 360000], askR: 2.2 };
const AF3_STAND = ['hug', 'hold', 'kissF', 'kissM', 'hand'], AF3_SEAT = ['sShoulder', 'sHug', 'sKiss', 'sLean'];
const AF3_SEEN = ['Ora, ora…', 'Hum… eu vi isso.', 'Que coisa…', 'Olha só quem está aqui.'];
const af3R = (a, b) => a + Math.random() * (b - a);

// ---------------- SERVIDOR ----------------
try { SEC_W.love = 5; SEC_KN.love = 'tem um amante'; } catch (e) { }
try { MEM_DELTA.affair = -6; MEM_TXT.affair = 'foi visto aos beijos com outra pessoa'; } catch (e) { }
const af3Hash = (d, k) => { const x = Math.sin(d * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
/* pares NPC com NPC (desenhados pelos clientes; ficam presos no lugar) */
function af3Pairs() { return S.affNP || (S.affNP = {}); }
function af3InPair(id) { const P = af3Pairs(); if (P[id]) return true; for (const a in P) if (P[a].b === id) return true; return false; }
function af3Free(n) { return n && !n.dead && !n.downed && !n.sleeping && !n.fight && !n.aff && !n.dragBy && !af3InPair(n.id) && !(S.vlTable && S.vlTable[n.id]) && !(S.vlEsc && S.vlEsc[n.id]); }
function af3Start(a, b, k, ms, place) { const now = now_(), P = af3Pairs(), seat = AF3_SEAT.includes(k);
  if (!seat && k !== 'hand') { const sp = typeof affSpot === 'function' ? affSpot(a, b, k) : null; if (!sp && !place) return false; if (sp) { b.x = sp.x; b.y = sp.y; a.dir = sp.s > 0 ? 2 : 6; b.dir = sp.s > 0 ? 6 : 2; } }
  if (k === 'hand') { const g = AFX.gap.hand; b.x = a.x + AFF_SR[0] * g; b.y = a.y + AFF_SR[1] * g; b.dir = a.dir; }
  b.fl = a.fl; b.fb = a.fb; P[a.id] = { b: b.id, k, ctx: seat ? 'seat' : 'stand', until: now + (AFX.dur[k] || ms || af3R(AF3.dur[0], AF3.dur[1])), ax: a.x, ay: a.y, bx: b.x, by: b.y, ad: a.dir, bd: b.dir }; return true; }
function af3NN() { const now = now_(), l = [], P = af3Pairs(); for (const a in P) { const X = P[a]; if (now > X.until || !S.npcs[a] || !S.npcs[X.b]) { delete P[a]; continue; } l.push([a, X.b, X.k, X.ctx]); } return l; }
if (typeof vl4NN === 'function') { const _nnA3 = vl4NN; vl4NN = function () { return _nnA3().concat(af3NN()); }; }
if (typeof affPin === 'function') { const _apA3 = affPin; affPin = function () { _apA3(); const P = S.affNP; if (!P) return; for (const a in P) { const X = P[a], A = S.npcs[a], B = S.npcs[X.b]; if (!A || !B) continue; A.x = X.ax; A.y = X.ay; A.dir = X.ad; B.x = X.bx; B.y = X.by; B.dir = X.bd; A.walking = B.walking = false; A.path = B.path = null; } }; }
/* os casais */
function af3Couples() { const out = []; for (let i = 0; i < HOUSES.length; i++) { const h = HOUSES[i]; if (h.player || (typeof hRec === 'function' && hRec().st[h.id] && hRec().st[h.id].extinct)) continue; const a = S.npcs['h_' + h.id + '_0'], b = S.npcs['h_' + h.id + '_1']; if (a && b) out.push({ a, b, hid: h.id, mood: af3Hash(estDay(), i + 1) }); }
  const byShop = {}; for (const n of Object.values(S.npcs)) if (n.bizWorker) (byShop[n.bizWorker] = byShop[n.bizWorker] || []).push(n);
  for (const pid in byShop) { const L = byShop[pid]; const role = n => (n.name.split(',')[1] || '').trim(), f = L.find(n => /^(vendedora|artesã)$/.test(role(n))), m = L.find(n => /^(vendedor|artesão)$/.test(role(n))); if (f && m) out.push({ a: m, b: f, shop: pid, mood: 0.4 + 0.6 * af3Hash(estDay(), pid.length * 7 + pid.charCodeAt(0)) }); }
  /* quem trabalha no mesmo prédio: um homem e uma mulher (pelo 'o'/'a' do nome: 'o Taverneiro', 'a Ajudante') */
  const gen = n => { const m = /, (o|a) /.exec(n.name || ''); return m ? (m[1] === 'a' ? 'f' : 'm') : null; }, byB = {};
  for (const n of Object.values(S.npcs)) { if (n.transient || n.court || /candidat/.test(n.name || '') || !gen(n)) continue; const bi = n.bi != null ? n.bi : WORLD.bld[tileAt(n.x, n.y)]; if (bi == null || bi < 0) continue; (byB[bi] = byB[bi] || []).push(n); }
  for (const bi in byB) { const M = byB[bi].filter(n => gen(n) === 'm'), F = byB[bi].filter(n => gen(n) === 'f'); for (let i = 0; i < Math.min(M.length, F.length); i++) out.push({ a: M[i], b: F[i], work: +bi, mood: 0.4 + 0.6 * af3Hash(estDay(), +bi * 3 + i) }); }
  return out; }
function af3CoupleTick(now) { const T = S.af3T; for (const C of af3Couples()) { const { a, b } = C; if (!af3Free(a) || !af3Free(b) || (a.fl || 0) !== (b.fl || 0) || dist(a.x, a.y, b.x, b.y) > AF3.near) continue; if (a.walkTo || b.walkTo || a.goingHome || b.goingHome) continue;
  let mood = C.mood; if (T && T.active && (T.noble === a.id || T.noble === b.id)) mood *= 0.5; if (mood < 0.25) continue; if (Math.random() > AF3.chance * mood) continue;
  const seat = a.sitting && b.sitting && dist(a.x, a.y, b.x, b.y) <= 1.3, k = seat ? AF3_SEAT[Math.floor(Math.random() * AF3_SEAT.length)] : AF3_STAND[Math.floor(Math.random() * AF3_STAND.length)]; af3Start(a, b, k); } }
/* o cônjuge NPC do jogador toma a iniciativa (faz direto; andar desfaz) */
function af3SpouseTick(now) { if (typeof mrOf !== 'function') return; for (const p of Object.values(S.players)) { const key = estOwner(p), M = mrOf(key); if (!M || M.kind !== 'npc') continue; if (now < (p._af3Sp || 0) || p.aff || p.sleep != null || p.bath || p.thSit || !affFree(p)) continue;
  const n = Object.values(S.npcs).find(q => q.court === 'spouse' && q.mrKey === key); if (!n || !af3Free(n) || (n.fl || 0) !== (p.fl || 0) || dist(n.x, n.y, p.x, p.y) > 2.5) continue; const mood = M.mood ?? MR.mood0; p._af3Sp = now + af3R(AF3.spouseCd[0], AF3.spouseCd[1]); if (mood < 60) continue;
  const k = p.sit ? 'sLean' : ['hug', 'kissF', 'kissM', 'hold'][Math.floor(Math.random() * 4)]; affStart(p, n, k); if (p.aff && p.aff.w === n.id) { if (!p.aff.until) { p.aff.until = now + 12000; if (n.aff) n.aff.until = p.aff.until; } empSay(n, ['Vem cá, meu bem.', 'Senti a sua falta.', 'Fica um pouco comigo.'][Math.floor(Math.random() * 3)]); tell(p, '💞 ' + n.name + ' ' + { hug: 'te abraça', kissF: 'te dá um beijo no rosto', kissM: 'te beija', hold: 'fica abraçado com você', sLean: 'encosta a cabeça no seu ombro' }[k] + '. Andar desfaz.'); } } }
/* amantes secretos */
function af3FreeNear(x, y, r0, r1, outside, fl) { for (let k = 0; k < 60; k++) { const a = Math.random() * Math.PI * 2, r = af3R(r0, r1), tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r; if (outside && WORLD.bld[tileAt(tx, ty)] >= 0) continue; if (canStandZ(tx, ty, 0, 0.3, fl || 0, -1)) return [tx, ty]; } return null; }
function af3Place(kind, hid) { const now = now_();
  if (kind === 'garden') { const b = hSeatB(hid); if (b) { const P = af3FreeNear(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) / 2 + 1, Math.max(b.w, b.h) / 2 + 3, true); if (P) return { x: P[0], y: P[1], fl: 0, fb: -1, n: 'no jardim do casarão' }; } }
  if (kind === 'termas' && typeof thermaeBi === 'function') { const bi = thermaeBi(), b = BUILDINGS[bi]; if (b) { const [x, y] = localToWorld(b, 3.5, 13.2); return { x, y, fl: 0, fb: -1, n: 'nas Termas' }; } }
  if (kind === 'veludo' && typeof velB === 'function') { const b = velB('velvet'); if (b) { const [x, y] = localToWorld(b, VL_RSPOT[3].p[0], VL_RSPOT[3].p[1]); return { x, y, fl: 1, fb: BUILDINGS.indexOf(b), n: 'num quarto da Casa de Veludo' }; } }
  if (kind === 'beco' && typeof velB === 'function') { const b = velB('velvet'); if (b) { const P = af3FreeNear(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 3, b.w / 2 + 6, true); if (P) return { x: P[0], y: P[1], fl: 0, fb: -1, n: 'num beco perto da Rua dos Prazeres' }; } }
  return null; }
function af3TrystTick(now) { const h = empHour(), d = estDay(); let T = S.af3T; const night = h >= 22 || h < 1;
  if (!T || T.d !== d) { if (T && T.active) af3TrystEnd(T); if (h >= 12 && h < 22) { T = S.af3T = { d }; if (af3Hash(d, 77) < AF3.trystP) { const HS = HOUSES.filter(x => !x.player && !(hRec().st[x.id] && hRec().st[x.id].extinct)), hh = HS[Math.floor(af3Hash(d, 78) * HS.length)]; if (hh) { const role = Math.floor(af3Hash(d, 79) * 3); T.hid = hh.id; T.noble = 'h_' + hh.id + '_' + role; T.place = ['garden', 'termas', 'veludo', 'beco'][Math.floor(af3Hash(d, 80) * 4)]; } } } return; }
  if (!T.noble) return; const n = S.npcs[T.noble];
  if (night && !T.active && !T.done && n && !n.dead && !n.downed) { const P = af3Place(T.place, T.hid) || af3Place('beco', T.hid); if (!P) return; const id = 'af3_lover', L = { id, kind: ['v_segm', 'dealer', 'butler'][Math.floor(af3Hash(d, 81) * 3)], name: 'Um desconhecido', transient: true, court: 'praz', x: P.x + 0.4, y: P.y, z: 0, fl: P.fl, fb: P.fb, hp: 120, maxHp: 120, downed: null, dead: false, dir: 0 }; S.npcs[id] = L; Net.toAll({ t: 'vspawn', v: visPublic(L) });
    n.x = P.x; n.y = P.y; n.fl = P.fl; n.fb = P.fb; T.active = 1; T.pl = P; T.seen = {}; T.next = 0; }
  if (T.active) { const L = S.npcs.af3_lover; if (!night || !n || n.dead || n.downed || !L) { af3TrystEnd(T); return; }
    if (now >= (T.next || 0) && !af3InPair(n.id)) { n.x = T.pl.x; n.y = T.pl.y; n.fl = T.pl.fl; n.fb = T.pl.fb; af3Start(n, L, ['hug', 'kissM', 'hold', 'kissM'][Math.floor(Math.random() * 4)], 18000, 1); T.next = now + 21000; }
    for (const p of Object.values(S.players)) { if (T.seen[p.id] || (p.fl || 0) !== (T.pl.fl || 0) || dist(p.x, p.y, n.x, n.y) > 6) continue; const sameB = WORLD.bld[tileAt(p.x, p.y)] === WORLD.bld[tileAt(n.x, n.y)] && WORLD.bld[tileAt(n.x, n.y)] >= 0; if (!sameB && !sightClear(p.x, p.y, n.x, n.y)) continue;
      T.seen[p.id] = 1; if (typeof secGive === 'function') secGive(p, T.hid, 'love', 'você viu ' + T.pl.n); tell(p, '👀 Você viu ' + n.name + ' aos beijos com um desconhecido ' + T.pl.n + '. Um segredo da ' + (HOUSE_BY[T.hid] || {}).n + ': tem um amante. A Dama Ysolde e o Mestre Corvin compram segredos.'); } } }
function af3TrystEnd(T) { T.active = 0; T.done = 1; const L = S.npcs.af3_lover; if (L) { const P = af3Pairs(); for (const a in P) if (a === L.id || P[a].b === L.id) delete P[a]; visGone(L); } }
/* testemunhas da infidelidade do jogador */
function af3Wit() { return S.af3W || (S.af3W = []); }
function af3WType(n, M) { if (n.id === 'vl_ysolde' || n.id === 'k_whisper' || /^vl_c\d/.test(n.id)) return 'broker'; if (/thief|bandit|thug|cutpurse|smuggl|spy/.test(String(n.kind)) || /^(mt_|pz_spy)/.test(n.id) || n.crim) return 'crim';
  const sh = typeof mr2SpHid === 'function' ? mr2SpHid(M) : null; if (n.house && sh && n.house !== sh && n.house !== 'crown') return 'rival'; return 'gossip'; }
affSin = function (a, b, k) { if (!AFX.sin.includes(k) || typeof mrOf !== 'function' || typeof mr2AddSin !== 'function') return; const day = estDay(), now = now_();
  for (const [p, q] of [[a, b], [b, a]]) { if (!S.players[p.id]) continue; const kp = estOwner(p), M = mrOf(kp), kq = S.players[q.id] ? estOwner(q) : 'npc:' + q.id; if (!M || M.partner === kq || (M.kind === 'npc' && q.court === 'spouse' && q.mrKey === kp)) continue;
    p._affSin = p._affSin || {}; if (p._affSin[kq] === day) continue;
    const bi = WORLD.bld[tileAt(p.x, p.y)], W = Object.values(S.npcs).filter(n => n !== q && !n.dead && !n.downed && !n.sleeping && n.id !== 'af3_lover' && (n.fl || 0) === (p.fl || 0) && dist(n.x, n.y, p.x, p.y) <= AF3.witR && ((bi >= 0 && WORLD.bld[tileAt(n.x, n.y)] === bi) || sightClear(n.x, n.y, p.x, p.y))).sort((x, y) => dist(x.x, x.y, p.x, p.y) - dist(y.x, y.y, p.x, p.y)).slice(0, 3);
    if (!W.length) continue; p._affSin[kq] = day;
    const s = mr2AddSin(kp, 'affection', p.name + ', cônjuge de ' + mr2SpouseN(M) + ', foi visto aos beijos e abraços com ' + q.name + '.', null);
    for (const n of W) { const type = af3WType(n, M), d = { crim: AF3.crimDelay, rival: AF3.rivalDelay, broker: AF3.sellDelay, gossip: AF3.sellDelay }[type], noticed = dist(n.x, n.y, p.x, p.y) <= AF3.noticeR;
      af3Wit().push({ o: kp, sin: s.id, pid: p.id, n: n.id, nn: n.name, type, t: now, due: now + af3R(d[0], d[1]), state: 'pend', noticed, sell: type === 'gossip' && Math.random() < AF3.sellP });
      empSay(n, AF3_SEEN[Math.floor(Math.random() * AF3_SEEN.length)]); if (type === 'gossip' && typeof memAdd === 'function') memAdd(n, p, 'affair');
      if (noticed) tell(p, '👀 ' + n.name.split(',')[0] + ' viu vocês. Dá para ir atrás e subornar ou ameaçar.'); } } };
function af3Reveal(w, how) { const s = mr2SinOf(w.o, w.sin); for (const x of af3Wit()) if (x.o === w.o && x.sin === w.sin) x.state = 'done'; if (s && !s.rev) mr2Reveal(w.o, s, how); }
function af3WitTick(now) { const L = af3Wit(), d = estDay();
  for (const w of L) { if (w.state !== 'pend') continue; const n = S.npcs[w.n], s = mr2SinOf(w.o, w.sin); if (!s || s.rev) { w.state = 'done'; continue; } const p = Object.values(S.players).find(q => estOwner(q) === w.o);
    if (p && n && !w.noticed && (p.fl || 0) === (n.fl || 0) && dist(p.x, p.y, n.x, n.y) <= AF3.noticeR && Math.random() < 0.3) { w.noticed = 1; tell(p, '👀 Você percebe que ' + w.nn.split(',')[0] + ' te olha de um jeito… sabe o que viu.'); }
    if (p && n && w.noticed && (p.fl || 0) === (n.fl || 0) && dist(p.x, p.y, n.x, n.y) <= AF3.askR && now > (w.askT || 0)) { w.askT = now + 60000; Net.toOne(p.id, { t: 'afwit', n: w.n, name: w.nn }); }
    if (now < w.due) continue;
    if (w.type === 'crim') { if (!p) continue; const amt = 80 + Math.floor(Math.random() * 60); p.mr2Bm = { npc: w.n, o: w.o, id: w.sin, amt, until: now + 60000 }; w.state = 'bm'; Net.toOne(p.id, { t: 'mr2bm', name: w.nn, t2: s.t, amt, src: 'p' }); continue; }
    if (w.type === 'rival') { const hid = n && n.house; if (hid && !s.hk.includes(hid)) s.hk.push(hid); w.state = 'done'; if (Math.random() < 0.4) af3Reveal(w, 'gente da ' + ((HOUSE_BY[hid] || {}).n || 'outra casa') + ' contou'); else if (p) tell(p, '⚠ Gente da ' + ((HOUSE_BY[hid] || {}).n || 'outra casa') + ' sabe o que você fez.'); continue; }
    if (w.type === 'broker' || w.sell) { (S.ysSins = S.ysSins || []).push({ o: w.o, id: w.sin }); w.state = 'done'; continue; }
    w.state = 'gos'; w.gd = d; }
  /* a fofoca corre: uma vez por dia, uma chance de chegar ao cônjuge */
  for (const w of L) { if (w.state !== 'gos' || w.gd === d) continue; w.gd = d; const others = L.filter(x => x.o === w.o && x.sin === w.sin && x.state === 'gos').length; if (Math.random() < AF3.revealP + 0.05 * others) af3Reveal(w, 'a fofoca da taverna chegou'); }
  S.af3W = L.filter(w => w.state !== 'done' || now - w.t < 3600000); }
/* chantagem de testemunha criminosa */
if (typeof mr2BmAnswer === 'function') { const _bmA3 = mr2BmAnswer; mr2BmAnswer = function (q, m) { const B = q.mr2Bm; if (!B || !B.npc) return _bmA3(q, m); q.mr2Bm = null; const w = af3Wit().find(x => x.n === B.npc && x.o === B.o && x.sin === B.id);
  if (now_() <= B.until && m.pay && debit(estOwner(q), q, B.amt)) { sendStat(q); tell(q, 'Você pagou ' + B.amt + ' de ouro e ' + (w ? w.nn.split(',')[0] : 'a testemunha') + ' vai ficar calado.'); if (w) w.state = 'done'; estateSave(); return; }
  if (w) af3Reveal(w, (w.nn || 'a testemunha').split(',')[0] + ' contou'); estateSave(); }; }
/* comprar segredo da Ysolde: às vezes vem um pecado de jogador junto */
if (typeof velMsg === 'function') { const _vmA3 = velMsg; velMsg = function (p, m) { const g0 = p.gold; const r = _vmA3(p, m);
  try { if (m && m.a === 'buy' && p.gold < g0 && S.ysSins && S.ysSins.length && Math.random() < 0.5) { const k = estOwner(p), i = S.ysSins.findIndex(x => x.o !== k && !mr2Known(k).some(y => y.o === x.o && y.id === x.id)); if (i >= 0) { const x = S.ysSins.splice(i, 1)[0], s = mr2SinOf(x.o, x.id); if (s && !s.rev) { mr2Known(k).push({ o: x.o, id: x.id }); mr2SendKnown(k); tell(p, 'A Ysolde, baixinho: “E mais esta, de graça: ' + s.t + '”'); } } } } catch (e) { } return r; }; }
/* subornar ou ameaçar a testemunha */
function af3WitMsg(p, m) { const w = af3Wit().find(x => x.n === m.n && x.o === estOwner(p) && (x.state === 'pend' || x.state === 'gos')), n = S.npcs[m.n]; if (!w || !n || dist(p.x, p.y, n.x, n.y) > 3) return;
  if (m.opt === 'bribe') { const c = AF3.bribe + 50; if (!debit(estOwner(p), p, c)) { tell(p, 'O silêncio custa ' + c + ' de ouro.'); return; } sendStat(p); w.state = 'done'; empSay(n, 'Eu não vi nada.'); tell(p, 'Você pagou ' + c + ' de ouro. ' + w.nn.split(',')[0] + ' esqueceu o que viu.'); return; }
  if (m.opt === 'threat') { if (Math.random() < AF3.threat + Math.min(0.3, (p.lvl || 1) * 0.01)) { w.state = 'done'; empSay(n, 'T-tudo bem! Eu não vi nada!'); tell(p, w.nn.split(',')[0] + ' ficou com medo e vai calar a boca.'); } else { empSay(n, 'Ah, é assim? Pois todo mundo vai saber!'); af3Reveal(w, w.nn.split(',')[0] + ' contou, depois da ameaça'); } } }
if (typeof affMsg === 'function') { const _amA3 = affMsg; affMsg = function (p, m) { if (m && m.a === 'wit') return af3WitMsg(p, m); return _amA3(p, m); }; }
if (typeof affTick === 'function') { const _atA3 = affTick; affTick = function (now) { _atA3(now); if (now - (S.af3Tk || 0) < 2000) return; S.af3Tk = now; try { af3TrystTick(now); af3WitTick(now); if (now - (S.af3Ck || 0) >= AF3.every) { S.af3Ck = now; af3CoupleTick(now); af3SpouseTick(now); } } catch (e) { console.warn('afeto3', e); } }; }

// ---------------- CLIENTE ----------------
if (typeof progEvent === 'function') { const _peA3 = progEvent; progEvent = function (m, now) {
  if (m.t === 'afwit') { const old = document.getElementById('af-wit'); if (old) old.remove(); const d = document.createElement('div'); d.id = 'af-wit'; d.className = 'aff-box ask';
    d.innerHTML = '<div class="aff-h">👀 ' + escAff(m.name.split(',')[0]) + ' viu você com outra pessoa.</div><div class="aff-row"><button type="button" class="ok" data-o="bribe">Subornar (' + (AF3.bribe + 50) + ')</button><button type="button" data-o="threat">Ameaçar</button><button type="button" data-o="">Deixar</button></div><div class="aff-ft">Ameaçar pode dar errado: a testemunha conta tudo na hora.</div>';
    d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { if (b.dataset.o) Net.send({ t: 'aff', a: 'wit', n: m.n, opt: b.dataset.o }); d.remove(); }); document.body.appendChild(d); setTimeout(() => d.remove(), 20000); return true; }
  return _peA3(m, now); }; }
/* NPC com NPC em pé: quem conduz desenha o par no meio dos dois */
if (typeof drawHeroEntity === 'function') { const _dhA3 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) { const A = e && e.isNpc && G._affNN && G._affNN[e.id];
  if (A && A.ctx === 'stand' && A.k !== 'hand' && R3.ok) { if (!A.lead) { e._spr = null; return; } const o = G.npcs[A.w]; if (o && o.rx != null) { const pa = tileW(e.rx, e.ry, 0), pb = tileW(o.rx, o.ry, 0), s = affPairSprite(A.k, e, o, pb.x < pa.x); if (s) { ctx.imageSmoothingEnabled = true; const mx = sx + (pb.x - pa.x) / 2, my = sy + (pb.y - pa.y) / 2; softDab(ctx, mx, my, 16, '#000000', 0.35); pblit(ctx, s, mx, my); e._spr = s; e._sx = mx; e._sy = my; e._drawT = now; return; } } }
  return _dhA3(ctx, e, sx, sy, now); }; }
