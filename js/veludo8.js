// ============================================================
//  CASA DE VELUDO 8 (lista 8, 28/11)
//  · Suíte com até 3 moças: pedir companhia com a suíte alugada leva junto as moças da sua mesa; subir sozinho pelo
//    elevador não deixa ninguém para trás (elas sobem atrás). Lá em cima elas seguem você: sentam perto quando você
//    senta, entram na banheira quando você entra, vão à varanda e fumam com você, deitam todas na cama; o carinho
//    se reveza entre as três e, paradas, elas trocam carinho entre si.
//  · A criada sobe pelo elevador, deixa a bandeja de bebidas na mesinha da sala e volta; no 🍾 Rodada ela vem
//    recolher a bandeja e trazer outra.
//  · Na mesa (reservado): ✋ (Saudar) sentado chama uma moça e a Jade, que anota o pedido e traz; falando com uma
//    moça dá para chamá-la para a sua mesa.
// ============================================================
const VL8 = { trayItems: ['firemead', 'firemead', 'ale', 'ale', 'tea', 'tea'], nnEvery: [25000, 45000], rotBed: 22000, wine: 15, tea: 8 };
const VL8_TEA = [1.5, 6.5], VL8_LIFT3 = [11.6, 3.4], VL8_BALC = [[5.3, 1.3], [6.5, 1.6], [7.7, 1.3]];   /* mesinha da sala, saída do elevador, lugares na varanda (v a partir da fachada) */

// ---------------- SERVIDOR ----------------
function vl8Party(p, girls) {   /* começa a festa (mesmo fluxo da veludo6) com as moças dadas, sem precisar estar sentado no reservado */
  const now = Date.now(), L = girls.filter((g, i) => S.npcs[g] && girls.indexOf(g) === i).slice(0, 3); if (!L.length) return false;
  const cost = vl6Cost(L.length); if ((p.gold || 0) < cost) { tell(p, 'Com ' + L.length + ' moças, a festa custa ' + cost + ' de ouro (a suíte já inclui uma companhia).'); return false; }
  p.gold -= cost; sendStat(p); for (const g of L) { if (S.vlTable && S.vlTable[g] && typeof vl4EndTable === 'function') vl4EndTable(g); if (S.vlOffer) delete S.vlOffer[g]; if (typeof vl5Drop === 'function') vl5Drop(g, true); }
  if (p.aff && typeof affEnd === 'function') affEnd(p); if (p.sit) { p.sit = null; Net.toOne(p.id, { t: 'velfx', k: 'stand' }); }
  p.vlVisit = { k: 'suite', until: now + VL6.partyMs }; S.vlParty = S.vlParty || {};
  const P = S.vlParty[p.id] = { girls: L, stage: 'walk', t: now, mv: {} };
  L.forEach((g, k) => { const n = S.npcs[g]; n.sitting = 0; vl6Hold(n, now); P.mv[g] = { pts: vl5Path(n, VL6_LIFT[k][0], VL6_LIFT[k][1], 0), i: 0 }; });
  empSay(S.npcs[L[0]], vl6Pick(VL6_LINES.up));
  tell(p, 'Para a suíte com ' + L.map(g => S.npcs[g].name).join(', ') + (cost ? ' (' + cost + ' de ouro)' : '') + '. Vá até o elevador, na parede leste: elas sobem com você.'); return true; }
const vl8Tgt = (P, n, u, v, sit, dir) => { const M = P.m8[n.id]; if (M && Math.hypot(M.u - u, M.v - v) < 0.3 && M.sit === sit) return; const b = velB('velvet'), D = bDims(b)[1]; let pts; if (v > D - 0.3) { pts = (vl5Path(n, u, D - 0.6, 3) || []).concat([localToWorld(b, u, D - 0.1), localToWorld(b, u, v)]); } else pts = vl5Path(n, u, v, 3) || [localToWorld(b, u, v)];   /* varanda: fora da grade de passos, vai reto da porta até o lugar */
  P.m8[n.id] = { u, v, sit, dir, pts, i: 0 }; n.sitting = 0; };
function vl8Free(b, bi, u, v) { const [x, y] = localToWorld(b, u, v); return typeof canStandFloor !== 'function' || canStandFloor(x, y, bi, 3, 0.22); }
function vl8OnBalc(b, p) { const [, v] = worldToLocal(b, p.x, p.y); return v > bDims(b)[1] - 0.3; }
function vl8Party3(p, P, G0, now, dt) {
  const b = velB('velvet'), bi = vlBi(), [pu, pv] = worldToLocal(b, p.x, p.y), D = bDims(b)[1]; P.m8 = P.m8 || {};
  /* entrou na banheira ou deitou na cama: as moças vão junto */
  const [tx, ty] = localToWorld(b, AF2.vtub[0], AF2.vtub[1]); if (dist(p.x, p.y, tx, ty) < AF2.vtubR - 0.2 && !p.sit) { vl6Msg(p, 'tub'); return; }
  const bed = BEDS.findIndex(q => q.vlRoom === 'suite'); if (bed >= 0 && p.sleep === bed) { P.stage = 'bed'; P.bed = bed; P.t3 = now; P.lay = now; P.li = 0; P.liT = 0; vl6Ui(p, P); return; }
  /* onde cada uma fica */
  const balc = vl8OnBalc(b, p); p.vl8Balc = balc ? 1 : 0; let spots;
  if (p.sit) { const seats = WORLD.seats.map((q, i) => [q, i]).filter(([q]) => q.bi === bi && (q.fl || 0) === 3 && dist(q.x, q.y, p.x, p.y) > 0.3 && dist(q.x, q.y, p.x, p.y) < 4).sort((a, c) => dist(a[0].x, a[0].y, p.x, p.y) - dist(c[0].x, c[0].y, p.x, p.y));
    spots = G0.map((n, k) => { const s = seats[k]; if (s) { const [u, v] = worldToLocal(b, s[0].x, s[0].y); return [u, v, 1, s[0].dir]; } return null; }); }
  else if (balc) spots = G0.map((n, k) => [VL8_BALC[k][0], D + VL8_BALC[k][1], 0, 2]);
  else { const moved = !P.anc || Math.hypot(P.anc[0] - pu, P.anc[1] - pv) > 1.1; if (moved) P.anc = [pu, pv];
    const off = [[-0.85, 0.55], [0.85, 0.55], [0, 1.05]], [au, av] = P.anc; spots = G0.map((n, k) => { for (const sc of [1, 1.5, 0.7]) { const u = au + off[k][0] * sc, v = av + off[k][1] * sc; if (vl8Free(b, bi, u, v)) return [u, v, 0, null]; } return [VL6_SALA[k][0], VL6_SALA[k][1], 0, null]; }); }
  G0.forEach((n, k) => { if (n.aff && n.aff.w === p.id) { vl6Hold(n, now); return; } if (S.affNP && (S.affNP[n.id] || Object.values(S.affNP).some(X => X.b === n.id))) return;   /* em carinho: fica parada */
    const sp = spots[k] || [VL6_SALA[k][0], VL6_SALA[k][1], 0, null]; vl8Tgt(P, n, sp[0], sp[1], sp[2], sp[3]); const M = P.m8[n.id];
    if (M.i < M.pts.length) { M.i = vl5Move(n, M.pts, M.i, dt); vl6Hold(n, now); }
    else { n.walk = false; vl6Pos(n, M.u, M.v, 3, M.sit && M.dir != null ? M.dir : n.dir, M.sit); if (!M.sit) vl5Face(n, balc ? n.x : p.x, balc ? n.y + 3 : p.y); } });
  /* música e dança, carinho com você (parado perto delas) e entre elas */
  if (P.dance > now) { if (now - (P.da || 0) > 3000) { P.da = now; for (const n of G0) if (!(n.aff && n.aff.w === p.id)) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'dance', ms: 3200 }); if (Math.random() < 0.3) empSay(G0[Math.floor(Math.random() * G0.length)], vl6Pick(VL6_LINES.dance)); } return; }
  const still = !P.lastP || Math.hypot(P.lastP[0] - p.x, P.lastP[1] - p.y) < 0.05; P.lastP = [p.x, p.y];
  if (still && !balc && G0.some(n => dist(n.x, n.y, p.x, p.y) < 1.5)) vl6Rot(p, P, p.sit ? ['sShoulder', 'sLean', 'sKiss', 'sHand'] : ['hug', 'kissF', 'hold'], now);
  if (G0.length >= 2 && still && now > (P.nnT || 0) && typeof af3Start === 'function') { P.nnT = now + VL8.nnEvery[0] + Math.random() * (VL8.nnEvery[1] - VL8.nnEvery[0]);
    const fr = G0.filter(n => !n.aff && !(S.affNP && (S.affNP[n.id] || Object.values(S.affNP).some(X => X.b === n.id))) && P.m8[n.id] && P.m8[n.id].i >= P.m8[n.id].pts.length);
    if (fr.length >= 2) { const [a, c] = fr; const k = p.sit ? 'hand' : ['hug', 'kissF', 'hand'][Math.floor(Math.random() * 3)]; if (af3Start(a, c, k, 9000, 1)) { if (typeof vl4SendNN === 'function') vl4SendNN(true); if (Math.random() < 0.5) empSay(a, ['Você é linda, sabia?', 'Vem cá, querida.', 'Que noite boa.'][Math.floor(Math.random() * 3)]); } } } }
function vl8Bed(p, P, G0, now) {   /* as três deitam com você; o abraço se reveza entre elas */
  const b = velB('velvet'), B = BEDS[P.bed]; if (!B) { vl6End(p.id); return; }
  if (p.sleep !== P.bed) { if (P.lay) { const ok = now - P.lay >= VL6.layMs; if (ok) p.vlRest = { until: now, who: G0.map(n => n.name).join(', ') }; for (const n of G0) n.sleeping = false; vl6ToParty(p, P, G0, now); P.m8 = {}; tell(p, ok ? 'Você levanta descansado; elas levantam com você.' : 'Você levantou; elas levantam com você.'); } return; }
  if (now - (P.liT || 0) > VL8.rotBed || !p.aff) { P.liT = now; P.li = ((P.li == null ? -1 : P.li) + 1) % G0.length; if (p.aff && typeof affEnd === 'function') affEnd(p); const lead = G0[P.li]; if (lead) { lead.sleeping = false; affStart(p, lead, Math.random() < 0.3 ? 'bKiss' : 'bHold'); if (Math.random() < 0.4) empSay(lead, vl6Pick(VL6_LINES.bed)); } }
  let k2 = 0; G0.forEach(n => { if (n.aff && n.aff.w === p.id) { vl6Hold(n, now); return; } const [u, v] = VL6_BEDG[Math.min(k2++, VL6_BEDG.length - 1)]; const [x, y] = localToWorld(b, u, v); n.x = x; n.y = y; n.sleeping = true; n.walk = false; vl6Pos(n, u, v, 3, B.dir || 0); }); }
/* a criada: sobe pelo elevador, deixa a bandeja na mesinha e volta (recolhe a velha quando traz uma nova) */
function vl8MaidCall(p, P) { if (P.maid) { tell(p, 'A criada já está a caminho.'); return; } const b = velB('velvet'), bi = vlBi(), id = 'vl_maidS', [mx, my] = localToWorld(b, VL8_LIFT3[0], VL8_LIFT3[1]);
  if (S.npcs[id]) visGone(S.npcs[id]); const v = { id, kind: 'vl_maid', name: 'Xiu, a criada', transient: true, court: 'praz', x: mx, y: my, z: 0, fl: 3, fb: bi, hp: 100, maxHp: 100, downed: null, dead: false, dir: 5 }; S.npcs[id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) });
  P.maid = { ph: 'in', pts: vl5Path(v, VL8_TEA[0] + 0.7, VL8_TEA[1] + 0.2, 3) || [], i: 0 }; empSay(v, 'Com licença, a bandeja da suíte.'); }
function vl8MaidTick(p, P, G0, now, dt) { const M = P.maid; if (!M) return; const n = S.npcs.vl_maidS; if (!n) { P.maid = null; return; } const b = velB('velvet'), bi = vlBi(), key = 'vl8|' + bi;
  if (M.ph === 'in' || M.ph === 'out') { M.i = vl5Move(n, M.pts, M.i, dt); if (M.i < M.pts.length) return; n.walk = false;
    if (M.ph === 'out') { visGone(n); P.maid = null; return; }
    M.ph = 'put'; M.t = now; const [tx, ty] = localToWorld(b, VL8_TEA[0], VL8_TEA[1]); n.dir = dirFromVecS(tx - n.x, ty - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'kneelput', ms: 1600, tx, ty }); return; }
  if (M.ph === 'put' && now - M.t > 1700) { const [tx, ty] = localToWorld(b, VL8_TEA[0], VL8_TEA[1]), old = S.fdTray && S.fdTray[key];
    fdTraySet(key, { items: VL8.trayItems.slice(), n0: VL8.trayItems.length, fl: 3, bi, x: tx, y: ty, low: 1 }); empSay(n, old ? 'Levo a bandeja vazia e deixo uma nova. Bom proveito.' : 'A bandeja fica na mesinha. Bom proveito.');
    for (const g of G0) if (!g.aff) near(g.x, g.y, { t: 'anim', w: 'n', id: g.id, a: 'cheer', ms: 1400 }); if (G0[0]) empSay(G0[0], vl6Pick(VL6_LINES.round));
    M.ph = 'out'; M.pts = vl5Path(n, VL8_LIFT3[0], VL8_LIFT3[1], 3) || []; M.i = 0; } }
if (typeof vl6Tick === 'function' && typeof S !== 'undefined') {
  const _v6T8 = vl6Tick;
  vl6Tick = function (now) { if (!S.vlParty) return _v6T8(now); const b = velB('velvet'), bi = vlBi(), dt = Math.min(0.5, (now - (S.vl8T || now)) / 1000); S.vl8T = now;
    const hold = {};
    for (const pid in S.vlParty) { const P = S.vlParty[pid], p = S.players[pid]; if (!p || !b) continue;
      /* subiu sozinho pelo elevador: as moças sobem atrás (antes ficavam esperando lá embaixo) */
      if (P.stage === 'walk' && (p.fl || 0) === 3 && p.fb === bi) { P.girls.forEach((g, k) => { const n = S.npcs[g]; if (!n) return; const [u, v] = VL6_LIFT[k], [x, y] = localToWorld(b, u, v); n.x = x; n.y = y; n.fl = 3; n.fb = bi; vl6Hold(n, now); P.mv[g] = { pts: vl5Path(n, VL6_SALA[k][0], VL6_SALA[k][1], 3), i: 0 }; }); P.stage = 'up'; P.t1 = now; tell(p, 'As moças sobem logo atrás de você.'); }
      if (P.stage === 'party' || P.stage === 'bed') { hold[pid] = P.stage; P.stage = 'p8'; } }
    _v6T8(now);
    for (const pid in hold) { const P = S.vlParty && S.vlParty[pid]; if (!P) continue; P.stage = hold[pid]; const p = S.players[pid]; if (!p) continue; const G0 = P.girls.map(g => S.npcs[g]).filter(Boolean); if (!G0.length) continue;
      if (P.stage === 'party') { if (!P.tray8) { P.tray8 = 1; vl8MaidCall(p, P); } vl8Party3(p, P, G0, now, dt); } else vl8Bed(p, P, G0, now);
      vl8MaidTick(p, P, G0, now, dt); }
    for (const pid in S.vlParty) { const P = S.vlParty[pid], p = S.players[pid]; if (p && P.stage === 'tub' && P.maid) vl8MaidTick(p, P, P.girls.map(g => S.npcs[g]).filter(Boolean), now, dt); } };
}
if (typeof vl6End === 'function' && typeof S !== 'undefined') { const _v6E8 = vl6End; vl6End = function (pid, why) { const P = S.vlParty && S.vlParty[pid]; if (P && P.maid && S.npcs.vl_maidS) visGone(S.npcs.vl_maidS); const p = S.players[pid]; if (p) p.vl8Balc = 0; return _v6E8.apply(this, arguments); }; }
/* 🍾 Rodada: agora a criada sobe com a bandeja (paga a rodada) */
if (typeof vl6Msg === 'function' && typeof S !== 'undefined') { const _v6M8 = vl6Msg; vl6Msg = function (p, k) { const P = S.vlParty && S.vlParty[p.id];
  if (k === 'round' && P && P.stage !== 'walk' && P.stage !== 'up') { if ((p.gold || 0) < VL6.round) { tell(p, 'Uma rodada custa ' + VL6.round + ' de ouro.'); return; } if (P.maid) { tell(p, 'A criada já está a caminho.'); return; } p.gold -= VL6.round; sendStat(p); vl8MaidCall(p, P); tell(p, 'A criada sobe pelo elevador com uma bandeja nova. Na mesinha da sala, F pega uma bebida.'); return; }
  if (k === 'bed' && P) { const r = _v6M8.apply(this, arguments); if (S.vlParty[p.id]) { S.vlParty[p.id].li = -1; S.vlParty[p.id].liT = 0; } return r; }
  return _v6M8.apply(this, arguments); }; }
/* fumar na varanda: as moças por perto fumam junto */
function vl8Smoke(p) { const P = S.vlParty && S.vlParty[p.id]; if (!P || !p.vl8Balc) return; for (const g of P.girls) { const n = S.npcs[g]; if (n && dist(n.x, n.y, p.x, p.y) < 3 && typeof empSmoke === 'function') setTimeout(() => { if (S.npcs[g]) empSmoke(n, 9000); }, 400 + Math.random() * 1500); } }
/* pedir companhia com a suíte alugada: vão todas as da sua mesa (e a que você chamou) */
if (typeof velMsg === 'function' && typeof S !== 'undefined') { const _vmV8 = velMsg; velMsg = function (p, m) { const now = Date.now();
  if (m && m.a === 'company' && typeof vlSuiteOwn === 'function' && vlSuiteOwn(p) && !(S.vlParty && S.vlParty[p.id])) { const T = VEL_STAFF.find(t => t.id === m.id && t.menu === 'comp'), n = T && velStaffNear(p, T.id); if (n) { const L = [m.id].concat(vl6Girls(p)); if (vl8Party(p, L)) return; return; } }
  if (m && m.a === 'call8g') { vl8CallGirl(p, String(m.id || ''), now); return; }
  if (m && m.a === 'call8') { vl8Call(p, now); return; }
  if (m && m.a === 'order8') { vl8Order(p, String(m.k || ''), now); return; }
  return _vmV8.apply(this, arguments); }; }
/* chamar à mesa: falando com a moça (ela vai até o seu reservado) ou com ✋ sentado (a mais perto vem, e a Jade vem anotar o pedido) */
function vl8MyBooth(p) { const B = vlBooths(); for (const c in B.own) if (typeof vl5MyTable === 'function' ? vl5MyTable(p, +c) : B.own[c] === estOwner(p)) return +c; return -1; }
function vl8CallGirl(p, g, now) { const n = S.npcs[g], T = VEL_STAFF.find(t => t.id === g && t.menu === 'comp'); if (!n || !T) return; if (vl8MyBooth(p) < 0) { empSay(n, 'Você não tem mesa, querido. Fale com a Mirela para reservar uma.'); return; }
  if (S.vlTable && S.vlTable[g]) { empSay(n, S.vlTable[g].who === p.id ? 'Já estou com você, querido.' : 'Estou com outro cliente agora. Mais tarde?'); return; }
  p.vl8Want = { g, until: now + 150000 }; p._vl5Next = now; if (p.vlDecl) delete p.vlDecl[g]; if (S.vl5 && S.vl5[g] && S.vl5[g].a !== 'offer') vl5Drop(g, true);
  empSay(n, p.sit ? 'Já vou, querido.' : 'Sente-se no seu reservado, eu já vou.'); }
function vl8Call(p, now) { if (!p.sit || !vlInside(p) || (p.fl || 0)) return; const s = vl4BoothSeat(p); if (!s || !vl5MyTable(p, s.vb)) return;
  if (now - (p.vl8CallT || 0) < 8000) return; p.vl8CallT = now; const mine = Object.values(S.vlTable || {}).filter(X => X.who === p.id).length;
  if (mine < (typeof AF4 !== 'undefined' ? AF4.girls : 3)) { const free = VEL_STAFF.filter(t => t.menu === 'comp' && S.npcs[t.id] && !(S.npcs[t.id].fl || 0) && !(S.vlTable && S.vlTable[t.id]) && !(S.vlOffer && S.vlOffer[t.id]) && !(S.vlEsc && S.vlEsc[t.id]) && !vl6Who(t.id)).map(t => S.npcs[t.id]).sort((a, c) => dist(a.x, a.y, p.x, p.y) - dist(c.x, c.y, p.x, p.y));
    if (free[0]) { p.vl8Want = { g: free[0].id, until: now + 150000 }; p._vl5Next = now; if (p.vlDecl) delete p.vlDecl[free[0].id]; if (S.vl5 && S.vl5[free[0].id] && S.vl5[free[0].id].a !== 'offer') vl5Drop(free[0].id, true); empSay(free[0], 'Estou indo!'); } }
  const J = S.npcs.vl_jade, TJ = VEL_STAFF.find(t => t.id === 'vl_jade'); if (J && TJ && !(S.vl5[TJ.id] && S.vl5[TJ.id].a === 'order8')) { const [u, v] = vl5BoothPt(s.vb, 'vl_jade'), pts = vl5Path(J, u, v); if (pts) { S.vl5.vl_jade = { id: 'vl_jade', a: 'order8', pid: p.id, c: s.vb, ph: 'go', t: now, pts, i: 0, dur: 25000, home: TJ.at }; empSay(J, 'Já vou até a sua mesa!'); } } }
if (typeof vl5OfferFor === 'function' && typeof S !== 'undefined') { const _voF8 = vl5OfferFor; vl5OfferFor = function (g, now) {   /* quem foi chamada vai direto até quem chamou */
  for (const p of Object.values(S.players)) { const W = p.vl8Want; if (!W || W.g !== g) continue; if (now > W.until) { p.vl8Want = null; continue; } if (!p.sit || (p.fl || 0) || !vlInside(p) || p.vlOffer) continue; const s = vl4BoothSeat(p); if (!s || !vl5MyTable(p, s.vb)) continue; const fs = vl4FreeSeat(p, s.vb); if (fs < 0) continue; p.vl8Want = null; return { p, c: s.vb, fs }; }
  return _voF8.apply(this, arguments); }; }
const VL8_MENU = [['wine', '🍷 Taça de vinho doce', VL8.wine], ['tea', '🍵 Chá de jasmim', VL8.tea], ['girls', '🥂 Bebida para as moças da mesa', 0], ['tray', '🍾 Bandeja para a mesa', 0]];
function vl8Order(p, k, now) { const J = S.npcs.vl_jade, L = S.vl5 && S.vl5.vl_jade; if (!J || !L || L.a !== 'order8' || L.pid !== p.id) return; L.dur = 0; const it = VL8_MENU.find(x => x[0] === k); if (!it) { empSay(J, 'Qualquer coisa, é só levantar a mão.'); return; }
  if (k === 'tray') { velMsg(p, { a: 'tray' }); return; }
  if (k === 'girls') { const mine = Object.keys(S.vlTable || {}).filter(g => S.vlTable[g].who === p.id); if (!mine.length) { empSay(J, 'Ainda não tem moça na sua mesa.'); return; } const cost = VL4.drink * mine.length; if ((p.gold || 0) < cost) { empSay(J, 'São ' + cost + ' de ouro, querido.'); return; } p.gold -= cost; sendStat(p);
    setTimeout(() => { for (const g of mine) { const T0 = S.vlTable && S.vlTable[g]; if (!T0) continue; T0.until = Date.now() + VL4.drinkMs; T0.stage = Math.max(T0.stage || 0, 1) + 1; T0.talkN = 0; const n = S.npcs[g]; if (n) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'cheer', ms: 1400 }); } empSay(J, 'Para as moças. Saúde!'); }, 6000); return; }
  if ((p.gold || 0) < it[2]) { empSay(J, 'São ' + it[2] + ' de ouro, querido.'); return; } p.gold -= it[2]; sendStat(p); empSay(J, 'Já trago.');
  setTimeout(() => { if (!S.players[p.id]) return; const t = Date.now(); if (k === 'wine') { p.water = Math.min(100, (p.water ?? 100) + 15); p.buffs.warm = Math.max(p.buffs.warm || 0, t + 180000); if (typeof aleDrink === 'function') aleDrink(p, t, 1); tell(p, 'A Jade traz a taça de vinho doce: sede, calor do vinho.'); }
    else { p.water = Math.min(100, (p.water ?? 100) + 25); p.cst = Math.min(cstMaxOf(p), (p.cst || 0) + 30); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'drinkb', ms: 1600 }); tell(p, 'A Jade traz o chá de jasmim: sede e fôlego.'); } sendStat(p); if (S.npcs.vl_jade) empSay(S.npcs.vl_jade, vl5Pick(VL5_LINES.jade)); }, 6000); }
if (typeof velTick === 'function' && typeof S !== 'undefined') { const _vtV8 = velTick; velTick = function (now) { _vtV8(now); try { const L = S.vl5 && S.vl5.vl_jade; if (L && L.a === 'order8' && L.ph === 'do' && !L.asked) { L.asked = 1; const J = S.npcs.vl_jade, p = S.players[L.pid]; if (J && p) { vl5Face(J, p.x, p.y); empSay(J, 'O que vai ser, querido?'); vl5Anim(J, 'bow', 1200); Net.toOne(p.id, { t: 'vl8order', l: VL8_MENU.map(x => [x[0], x[1], x[0] === 'girls' ? VL4.drink : x[0] === 'tray' ? (typeof AF4 !== 'undefined' && AF4.tray) || 150 : x[2]]) }); } } } catch (e) { } }; }

// ---------------- CLIENTE ----------------
/* ✋ sentado no seu reservado: chama sem levantar */
function vl8SeatCall() { if (typeof G === 'undefined' || !G.me || !G.me.sit || (G.me.fl | 0)) return false; const bi = WORLD.bld[tileAt(G.me.x, G.me.y)], b = BUILDINGS[bi]; if (!b || b.deco !== 'velvet') return false; Net.send({ t: 'vel', a: 'call8' }); G.me.emote = { k: 'salute', t0: performance.now() }; return true; }
function vl8BalcNear() { if (typeof G === 'undefined' || !G.me || (G.me.fl | 0) !== 3) return false; const b = BUILDINGS[G.me.fb]; if (!b || b.deco !== 'velvet') return false; const [, v] = worldToLocal(b, G.me.x, G.me.y); return v > bDims(b)[1] - 0.3; }
if (typeof emoteList === 'function' && typeof G !== 'undefined') { const _elV8 = emoteList; emoteList = function () { const L = _elV8(); if (vl8BalcNear() && !L.some(e => e.k === 'smoke')) return [{ k: 'smoke', n: 'Fumar', i: '🚬' }].concat(L); return L; }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV8 = progEvent; progEvent = function (m, now) {
  if (m.t === 'vl8order') { let d = document.getElementById('vl8-order'); if (d) d.remove(); d = document.createElement('div'); d.id = 'vl8-order'; d.className = 'aff-box';
    d.innerHTML = '<div class="aff-h">🍶 Pedido para a Jade</div><div class="aff-row">' + m.l.map(([k, nm, c]) => '<button type="button" data-k="' + k + '">' + nm + (c ? ' <small>(' + c + ')</small>' : '') + '</button>').join('') + '</div><div class="aff-row"><button type="button" data-k="none">Nada, obrigado</button></div>';
    d.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { d.remove(); Net.send({ t: 'vel', a: 'order8', k: b.dataset.k }); }); document.body.appendChild(d); setTimeout(() => { if (d.parentNode) d.remove(); }, 25000); return true; }
  const r = _peV8(m, now);
  if (m.t === 'velmenu' && m.k === 'comp') { try { const d = $('tequip'); if (d && d.classList.contains('vel-panel') && !d.querySelector('.vel8-call')) { const box = document.createElement('div'); box.className = 'vel8-call';
      box.innerHTML = '<div class="tq-btns"><button class="est-btn" data-c8>🪑 Venha sentar comigo<small>ela vai até o seu reservado</small></button></div>'; d.appendChild(box); box.querySelector('[data-c8]').onclick = () => { Net.send({ t: 'vel', a: 'call8g', id: m.id }); d.classList.add('hidden'); }; } } catch (e) { } }
  return r; }; }
