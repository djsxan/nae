// ============================================================
//  NOITES NO VELUDO (pedido de 26/11): mesas reservadas e ocupadas antes das 21h; as moças vêm às mesas
//  oferecer companhia (o cliente paga uma bebida para ela) e, aceitando, sentam e fazem sozinhas os gestos
//  de afeto (cabeça no ombro, abraçados, beijo no rosto, beijo, colo e beijo no colo). Também com os
//  clientes NPC dos reservados. Subir ao quarto sem tela escura: ela leva pela mão até o elevador, sobe
//  com a Lan e leva ao quarto; lá deitam abraçados, e ao levantar o cliente ganha o descanso.
// ============================================================
const VL4 = { drink: 20, drinkMs: 180000, rotMs: 20000, gapMs: 40000, talkN: 3, arrive: [60000, 120000], offerMs: 20000, declMs: 180000, speed: 1.8, guestUp: 0.25, guestUpMs: 180000, layMs: 15000, waitMs: 90000 };
const VL4_ROT = ['sLean', 'sHug', 'sKissF2', 'sLap', 'sKiss', 'sLapK'];
const VL4_LINES = { offer: ['Me paga uma bebida, querido?', 'Posso sentar com você? Uma bebida e eu fico.', 'Que mesa bonita. Me oferece uma taça?'], renew: ['Minha taça acabou… mais uma?', 'Mais uma bebida e eu fico mais um pouco.'], yes: ['Saúde, querido.', 'Hum, que gentil.', 'Assim eu gosto.'], no: ['Fica para outra hora.', 'Quem sabe mais tarde.', 'Tudo bem, querido.'] };
const vl4Pick = L => L[Math.floor(Math.random() * L.length)];

// ---------------- SERVIDOR ----------------
const vl4Girls = () => VEL_STAFF.filter(T => T.menu === 'comp' && T.b === 'velvet');
function vl4Busy(id) { return (S.vlTable && S.vlTable[id]) || (S.vlEsc && S.vlEsc[id]) || (S.vlOffer && S.vlOffer[id]) || (S.vlAway && S.vlAway[id] && Date.now() < S.vlAway[id].until); }
function vl4BoothSeat(e) { const bi = vlBi(); return WORLD.seats.find(q => q.bi === bi && q.vb != null && !(q.fl || 0) && Math.abs(q.x - e.x) < 0.06 && Math.abs(q.y - e.y) < 0.06) || null; }
/* lugar livre no mesmo reservado, o mais perto de quem está sentado */
function vl4FreeSeat(e, c) { let best = -1, bd = 1e9; for (let k = 0; k < 8; k++) { const i = vlSeatOf(c, k); if (i < 0) break; const s = WORLD.seats[i], d = dist(s.x, s.y, e.x, e.y); if (d < 0.1 || d >= bd) continue;
  if (Object.values(S.players).some(o => dist(o.x, o.y, s.x, s.y) < 0.25)) continue; if (Object.values(S.npcs).some(n => !n.dead && n !== e && dist(n.x, n.y, s.x, s.y) < 0.25)) continue; if (Object.values(S.vlTable || {}).some(T => T.seat === i)) continue; bd = d; best = i; } return best; }
const vl4Loc = (x, y) => worldToLocal(velB('velvet'), x, y);
/* a moça fica onde o roteiro manda (oferecendo, sentada na mesa ou andando) */
if (typeof vlPost === 'function') { const _vpV4 = vlPost; vlPost = function (T) { if (typeof S === 'undefined') return _vpV4(T); const n = S.npcs && S.npcs[T.id];
  if (S.vlEsc && S.vlEsc[T.id] && n) return { at: vl4Loc(n.x, n.y), fl: n.fl || 0, sit: 0, dir: n.dir || 0 };
  const Tb = S.vlTable && S.vlTable[T.id]; if (Tb && Tb.seat != null && WORLD.seats[Tb.seat]) { const s = WORLD.seats[Tb.seat], w = S.players[Tb.who] || S.npcs[Tb.who]; return { at: vl4Loc(s.x, s.y), fl: 0, sit: 1, dir: w ? dirFromVecS(w.x - s.x, w.y - s.y) : s.dir }; }   /* sentada virada para quem ela acompanha */
  const O = S.vlOffer && S.vlOffer[T.id]; if (O) return { at: O.at, fl: 0, sit: 0, dir: O.dir || 0 };
  return _vpV4(T); }; }
/* mesas antes das 21h: a Mirela aluga a qualquer hora em que estiver na entrada */
function vl4Early(fn) { const o = [VL_HOURS[0], VL_HOURS[1]]; VL_HOURS[0] = 0; VL_HOURS[1] = 24; try { return fn(); } finally { VL_HOURS[0] = o[0]; VL_HOURS[1] = o[1]; } }
if (typeof velMenu === 'function') { const _vmnV4 = velMenu; velMenu = function (p, T, n) { if (T && T.menu === 'host') return vl4Early(() => _vmnV4(p, T, n)); return _vmnV4(p, T, n); }; }
/* NPC com NPC (moça com cliente da casa): a lista vai para os clientes desenharem o par */
function vl4NN() { const l = []; for (const g in S.vlTable || {}) { const T = S.vlTable[g]; if (T.npc && T.k && Date.now() < (T.kUntil || 0)) l.push([T.who, g, T.k, 'seat']); }
  for (const g in S.vlEsc || {}) { const E = S.vlEsc[g]; if (E.npc && E.hand) l.push([E.who, g, 'hand', 'stand']); } return l; }
function vl4SendNN(force) { const l = vl4NN(), key = JSON.stringify(l); if (!force && key === S._vl4NN) return; S._vl4NN = key; Net.toAll({ t: 'affnn', l }); }
/* fim da companhia na mesa */
/* o clima avança: conversa, mãos dadas, ombro, abraço, beijo no rosto, beijo e por fim o colo; entre um e outro, conversa */
const VL4_STEPS = ['talk', 'sHand', 'sLean', 'sHug', 'sKissF2', 'sKiss', 'sLap', 'sLapK'], VL4_LATE = ['sLean', 'sKiss', 'sLap', 'sLapK', 'sHug'];
const VL4_TALK = ['E então, de onde você é?', 'Faz tempo que não vejo alguém tão bem-vestido aqui.', 'Conta uma história, querido.', 'Você vem sempre à Casa?', 'A banda está bonita hoje, não acha?', 'Gosto de quem sabe ouvir.', 'Hum… e o que mais?', 'Você tem um sorriso perigoso.'];
function vl4Step(T) { if (T.after) { T.after = 0; return 'talk'; } if (T.stage < VL4_STEPS.length) return VL4_STEPS[T.stage]; return VL4_LATE[(T.stage++) % VL4_LATE.length]; }
function vl4EndTable(g, say) { const T = S.vlTable && S.vlTable[g]; if (!T) return; delete S.vlTable[g]; const n = S.npcs[g], p = S.players[T.who]; if (p && p.aff && p.aff.w === g) affEnd(p); if (n) { n.aff = null; if (say) empSay(n, say); } }
/* subir ao quarto de mãos dadas */
function vl4Path0(n) { const [u, v] = vl4Loc(n.x, n.y), iu = u < 1.5 ? u + 1.3 : u > 11.5 ? u - 1.3 : u, iv = v > 9.8 ? v - 1.2 : v; return [[iu, iv], [iu, 9.2], [9.4, 9.2], [9.4, 3.3], [10, 3]].map(([a, b]) => localToWorld(velB('velvet'), a, b)); }
function vl4PathUp(k) { const b = velB('velvet'); if (k === 'suite') { const B = BEDS.find(q => q.vlRoom === 'suite'); return [localToWorld(b, 9, 3.5), [B.x, B.y]]; } const S0 = VL_RSPOT[+k % 100], B = BEDS.find(q => q.vlRoom === k); return [localToWorld(b, S0.p[0], 3), localToWorld(b, S0.p[0], 1.5), [B.x, B.y]]; }
function vl4Hand(p, n) { const now = now_(); p.aff = { k: 'hand', w: n.id, lead: 0, side: 1, ctx: 'stand', t0: now, until: 0 }; n.aff = { k: 'hand', w: p.id, lead: 1, walk: 1, side: -1, t0: now, ax: n.x, ay: n.y }; affSendX(p); }
function vl4Escort(p, n, k) { if (!S.vlEsc) S.vlEsc = {}; const T = S.vlTable && S.vlTable[n.id]; if (T) delete S.vlTable[n.id]; affEnd(p); if (p.sit) { p.sit = null; Net.toOne(p.id, { t: 'velfx', k: 'stand' }); }
  if (S.vlAway) delete S.vlAway[n.id]; n.fl = p.fl || 0; n.fb = -1; n.sitting = 0; const [ox, oy] = [p.x + AFF_SR[0] * 0.45, p.y + AFF_SR[1] * 0.45]; n.x = ox; n.y = oy;
  S.vlEsc[n.id] = { who: p.id, k, pts: vl4Path0(n), i: 0, stage: 'walk', t: now_(), hand: 1 }; vl4Hand(p, n); }
/* o NPC cliente também sobe com ela */
function vl4EscortNpc(c, n) { if (!S.vlEsc) S.vlEsc = {}; delete S.vlTable[n.id]; S.vlEsc[n.id] = { who: c.id, npc: 1, k: '101', pts: vl4Path0(n), i: 0, stage: 'walk', t: now_(), hand: 1 }; c.vlUp = 1; }
function vl4Move(e, pts, i, dt) { if (i >= pts.length) return i; const [tx, ty] = pts[i], dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), st = VL4.speed * dt; if (d <= st) { e.x = tx; e.y = ty; return i + 1; } e.x += dx / d * st; e.y += dy / d * st; e.dir = dirFromVecS(dx, dy); e.walking = true; return i; }
function vl4EscTick(now, dt) { const b = velB('velvet'), bi = vlBi(); if (!b) return;
  for (const g in S.vlEsc || {}) { const E = S.vlEsc[g], n = S.npcs[g]; if (!n) { delete S.vlEsc[g]; continue; }
    if (E.npc) { const c = S.npcs[E.who]; if (!c) { delete S.vlEsc[g]; continue; } const i0 = E.i; E.i = vl4Move(n, E.pts, E.i, dt); c.x = n.x - AFF_SR[0] * 0.45; c.y = n.y - AFF_SR[1] * 0.45; c.dir = n.dir; c.walking = true; c.sitting = 0;
      if (E.i >= E.pts.length) { delete S.vlEsc[g]; c.walking = n.walking = false; S.vlAway = S.vlAway || {}; S.vlAway[g] = { at: VL_RSPOT[1].g, fl: 1, sit: 0, dir: 7, until: now + VL4.guestUpMs }; S.vlGuestUp = S.vlGuestUp || {}; S.vlGuestUp[c.id] = now + VL4.guestUpMs; c.fl = 1; c.fb = bi; const [cx, cy] = localToWorld(b, VL_RSPOT[1].p[0], VL_RSPOT[1].p[1]); c.x = cx; c.y = cy; } continue; }
    const p = S.players[E.who]; if (!p || !vlVisitOk(p)) { delete S.vlEsc[g]; if (p && p.aff && p.aff.w === g) affEnd(p); n.aff = null; continue; }
    const holding = p.aff && p.aff.w === g && p.aff.k === 'hand';
    if (E.stage === 'walk' || E.stage === 'up') { if (!holding && E.hand) { E.hand = 0; E.waitT = now; empSay(n, 'Estou esperando no elevador, querido.'); }
      if (!holding && dist(p.x, p.y, n.x, n.y) < 1.3 && (p.fl || 0) === (n.fl || 0) && !p.sit && p.sleep == null) { E.hand = 1; vl4Hand(p, n); }
      if (!E.hand && now - (E.waitT || now) > VL4.waitMs) { delete S.vlEsc[g]; n.aff = null; empSay(n, 'Fica para outra vez.'); continue; }
      if (E.hand || E.i < E.pts.length - 1) E.i = vl4Move(n, E.pts, E.i, dt); if (n.aff) { n.aff.ax = n.x; n.aff.ay = n.y; }
      if (E.i >= E.pts.length) { n.walking = false;
        if (E.stage === 'walk' && E.hand && dist(p.x, p.y, n.x, n.y) < 1.8) { const fl = E.k === 'suite' ? 3 : +E.k[0], [ax, ay] = localToWorld(b, 10, 3); n.fl = fl; n.fb = bi; n.x = ax + AFF_SR[0] * 0.45; n.y = ay + AFF_SR[1] * 0.45;
          p.fl = fl; p.fb = bi; p.x = ax; p.y = ay; Net.toOne(p.id, { t: 'tp', x: ax, y: ay, z: 0, fl, fb: bi }); const L = S.npcs.vl_lift; if (L) empSay(L, fl === 3 ? 'Suíte, terceiro andar.' : fl + 'º andar.'); E.stage = 'up'; E.pts = vl4PathUp(E.k); E.i = 0; }
        else if (E.stage === 'up') { const bed = BEDS.findIndex(q => q.vlRoom === E.k); if (p.aff && p.aff.w === g) { p.aff = null; affSendX(p); } n.aff = null; E.stage = 'bed'; E.bed = bed; E.t = now; empSay(n, 'Deite comigo.'); Net.toOne(p.id, { t: 'vlbed', b: bed }); } } }
    else if (E.stage === 'bed') { if (p.sleep === E.bed) { if (!E.lay) E.lay = now; const want = (Math.floor((now - E.lay) / 25000) % 3 === 2) ? 'bKiss' : 'bHold'; if (!p.aff || (p.aff.k !== want && !(p.aff.k === 'bKiss' && p.aff.until > now))) affStart(p, n, want); }
      else if (E.lay) { const ok = now - E.lay >= VL4.layMs; delete S.vlEsc[g]; n.aff = null; const S0 = E.k === 'suite' ? VL_SUITE.spotG : VL_RSPOT[+E.k % 100].g; S.vlAway = S.vlAway || {}; S.vlAway[g] = { at: S0, fl: E.k === 'suite' ? 3 : +E.k[0], sit: 0, dir: 7, until: p.vlVisit.until, who: p.id };
        if (ok) p.vlRest = { until: now, who: n.name }; }
      else if (now - E.t > 60000) { delete S.vlEsc[g]; n.aff = null; } } } }
/* clientes NPC que subiram somem do reservado por um tempo */
if (typeof vlGuestsSpawn === 'function') { const _vgV4 = vlGuestsSpawn; vlGuestsSpawn = function () { const U = S.vlGuestUp || {}, now = Date.now(); for (const id in U) if (now >= U[id]) { delete U[id]; if (S.npcs[id] && typeof visGone === 'function') visGone(S.npcs[id]); } _vgV4(); }; }   /* quem subiu volta ao reservado depois */
/* as moças oferecem companhia às mesas; com ela na mesa, os gestos se alternam */
function vl4Tick(now) { if (!S.vlTable) S.vlTable = {}; if (!S.vlOffer) S.vlOffer = {}; const B = vlBooths();
  for (const g in S.vlOffer) { const O = S.vlOffer[g]; if (now - O.t > VL4.offerMs) { const p = S.players[O.who]; delete S.vlOffer[g]; if (p) { p.vlOffer = null; p.vlDecl = p.vlDecl || {}; p.vlDecl[g] = now + VL4.declMs; Net.toOne(p.id, { t: 'vloffer', off: 1 }); } if (O.renew) vl4EndTable(g, vl4Pick(VL4_LINES.no)); } }
  for (const g in S.vlTable) { const T = S.vlTable[g], n = S.npcs[g];
    if (T.npc) { const c = S.npcs[T.who]; if (!c || !n || c.vlUp) { delete S.vlTable[g]; continue; } if (now >= T.next) { if (T.k && now < T.kUntil) continue; if (T.k) { T.k = null; T.next = now + VL4.gapMs; continue; }
        if (now > T.until) { if (Math.random() < VL4.guestUp) { vl4EscortNpc(c, n); continue; } if (Math.random() < 0.5) { delete S.vlTable[g]; continue; } T.until = now + VL4.drinkMs; }
        if (T.after) { T.after = 0; T.next = now + VL4.gapMs; continue; } const st = vl4Step(T); if (st === 'talk') { T.stage = (T.stage || 0) + 1; T.next = now + 30000; continue; } T.k = st; T.kUntil = now + (AFX.dur[T.k] || VL4.rotMs); T.after = 1; } continue; }
    if (n && T.seat != null) n.sitting = 1;   /* sentada no reservado entre um carinho e outro */
    const p = S.players[T.who], s = p && vl4BoothSeat(p); if (!p || !n || !p.sit || !s || !(typeof vlBoothMine === 'function' ? vlBoothMine(p, s.vb) : vlBooths().own[s.vb] === estOwner(p))) { vl4EndTable(g, 'Volto para o salão, então.'); continue; }
    if (now > T.until && !S.vlOffer[g]) { S.vlOffer[g] = { who: p.id, t: now, renew: 1, at: vl4Loc(n.x, n.y), dir: n.dir }; empSay(n, vl4Pick(VL4_LINES.renew)); Net.toOne(p.id, { t: 'vloffer', id: g, name: n.name, cost: VL4.drink, renew: 1 }); continue; }
    if (S.vlOffer[g]) continue;
    if (p.aff && p.aff.w !== g) { if (now >= T.next) { T.next = now + 12000 + Math.random() * 8000; near(n.x, n.y, { t: 'anim', w: 'n', id: g, a: 'talk', txt: vl4Pick(VL4_TALK), ms: 2800 }); } continue; }   /* outra moça está no carinho: esta conversa */
    const A = p.aff && p.aff.w === g ? p.aff : null; if (A && A.until && now < A.until) continue;
    if (now >= T.next && affFree(p)) { const st = vl4Step(T); if (st === 'talk') { empSay(n, vl4Pick(VL4_TALK)); near(n.x, n.y, { t: 'anim', w: 'n', id: g, a: 'talk', ms: 3000 }); T.next = now + 12000 + Math.random() * 6000; T.talkN = (T.talkN || 0) + 1; if (T.talkN >= VL4.talkN) { T.talkN = 0; T.stage++; } continue; }
      affStart(p, n, st); if (p.aff && p.aff.w === g) { if (!p.aff.until) p.aff.until = now + VL4.rotMs; if (n.aff) n.aff.until = p.aff.until; T.next = p.aff.until + VL4.gapMs; T.talkN = 0; T.stage++; T.after = 1; } else T.next = now + 5000; } }
  /* moças livres vão às mesas */
  for (const T of vl4Girls()) { const n = S.npcs[T.id]; if (!n || n.dead || n.downed || (n.fl || 0) || vl4Busy(T.id)) continue;
    let cand = null; for (const p of Object.values(S.players)) { if (!p.sit || (p.fl || 0) || p.vlOffer || p.aff) { if (!p.sit) p._vlSitAt = 0; continue; } const s = vl4BoothSeat(p); if (!s || !(typeof vlBoothMine === 'function' ? vlBoothMine(p, s.vb) : vlBooths().own[s.vb] === estOwner(p))) continue; if (!p._vlSitAt) { p._vlSitAt = now; p._vlWait = VL4.arrive[0] + Math.random() * (VL4.arrive[1] - VL4.arrive[0]); } if (now - p._vlSitAt < p._vlWait) continue; if (Object.values(S.vlTable).filter(X => X.who === p.id).length >= (typeof AF4 !== 'undefined' ? AF4.girls : 1) || (p._af4Next && now < p._af4Next)) continue;   /* até 3 moças; a próxima vem depois de um tempo */ if (p.vlDecl && p.vlDecl[T.id] > now) continue; const fs = vl4FreeSeat(p, s.vb); if (fs < 0) continue; cand = { p, fs }; break; }
    if (cand) { const s = WORLD.seats[cand.fs]; S.vlOffer[T.id] = { who: cand.p.id, t: now, seat: cand.fs, at: vl4Loc(s.x, s.y), dir: s.dir }; cand.p.vlOffer = T.id; empSay(n, vl4Pick(VL4_LINES.offer)); Net.toOne(cand.p.id, { t: 'vloffer', id: T.id, name: T.name, cost: VL4.drink }); continue; }
    if (!vlOpen()) continue; for (const c of Object.values(S.npcs)) { if (!/^vl_g/.test(c.id) || c.vlUp || (c.fl || 0)) continue; if (Object.values(S.vlTable).some(X => X.who === c.id) || now < (c.vlDecl || 0)) continue; const s = vl4BoothSeat(c); if (!s) continue; const fs = vl4FreeSeat(c, s.vb); if (fs < 0) continue;
      if (Math.random() < 0.7) S.vlTable[T.id] = { who: c.id, npc: 1, seat: fs, until: now + VL4.drinkMs, next: now + 20000, gi: 0, stage: 0 }; else c.vlDecl = now + VL4.declMs; break; } }
  vl4SendNN(false); }
if (typeof velTick === 'function') { const _vtV4 = velTick; velTick = function (now) { const run = S.estate && now - (S.vl4T || 0) >= 1000; _vtV4(now); if (!run) return; S.vl4T = now; try { vl4Tick(now); } catch (e) { console.warn('veludo4', e); } }; }
if (typeof affTick === 'function') { const _atV4 = affTick; affTick = function (now) { _atV4(now); try { const dt = Math.min(0.5, (now - (S.vl4E || now)) / 1000); S.vl4E = now; if (dt > 0) vl4EscTick(now, dt); } catch (e) { console.warn('veludo4 esc', e); } }; }
/* respostas do cliente: bebida e companhia (agora sem tela escura) */
if (typeof velMsg === 'function') { const _vmV4 = velMsg; velMsg = function (p, m) { const now = Date.now();
  if (m && m.a === 'booth') return vl4Early(() => _vmV4(p, m));
  if (m && m.a === 'drink') { const O = S.vlOffer && S.vlOffer[m.id], n = S.npcs[m.id]; if (!O || O.who !== p.id || !n) return; delete S.vlOffer[m.id]; p.vlOffer = null;
    if (!m.ok) { p.vlDecl = p.vlDecl || {}; p.vlDecl[m.id] = now + VL4.declMs; if (O.renew) vl4EndTable(m.id, vl4Pick(VL4_LINES.no)); else empSay(n, vl4Pick(VL4_LINES.no)); return; }
    if ((p.gold || 0) < VL4.drink) { empSay(n, 'Sem bebida, sem companhia, querido.'); if (O.renew) vl4EndTable(m.id); return; } p.gold -= VL4.drink; sendStat(p);
    if (O.renew && S.vlTable[m.id]) { const T0 = S.vlTable[m.id]; T0.until = now + VL4.drinkMs; T0.stage = Math.max(T0.stage || 0, 1) + 1; T0.talkN = 0; } else S.vlTable[m.id] = { who: p.id, seat: O.seat, until: now + VL4.drinkMs, next: now + 4000, gi: 0, stage: 0, talkN: 0 };
    empSay(n, vl4Pick(VL4_LINES.yes)); tell(p, n.name + ' senta com você. Fale com ela para subir ao quarto (' + VL_COMPANY + ' de ouro).'); return; }
  if (m && m.a === 'company') { if (p.downed || p.vlRest) return; const T = VEL_STAFF.find(t => t.id === m.id && t.menu === 'comp'), n = T && S.npcs[T.id]; if (!n || dist(p.x, p.y, n.x, n.y) > 4 || (p.fl || 0) !== (n.fl || 0)) return;
    if (S.vlEsc && S.vlEsc[T.id]) { empSay(n, 'Agora não, querido, estou acompanhando alguém.'); return; }
    { const C = vlClosed(); if (C && !vlAllowed(p, C)) { empSay(n, 'Esta noite a casa é de ' + C.name + '.'); return; } }
    const suite = typeof vlSuiteOwn === 'function' && vlSuiteOwn(p); let k = 'suite';
    if (!suite) { const own = vlRoomOf(p), r = own ? vlRooms().find(q => q.k === own) : vlRooms().find(q => vlRoomFree(q.k)); if (!r) { empSay(n, 'Os quartos estão todos ocupados. Espere um pouco comigo, querido.'); return; }
      if ((p.gold || 0) < VL_COMPANY) { empSay(n, 'São ' + VL_COMPANY + ' de ouro, querido.'); return; } p.gold -= VL_COMPANY; S.vlUse = S.vlUse || {}; S.vlUse[r.k] = now + VL_ROOM.visit; k = r.k; }
    p.vlVisit = { k, until: now + VL_ROOM.visit }; vl4Escort(p, n, k); empSay(n, suite ? 'A suíte? Que honra. Venha, querido, eu levo você.' : 'Venha. O quarto ' + k + ' está livre; eu levo você.');
    tell(p, n.name + ' pega você pela mão e leva até o elevador. Andar por conta própria solta a mão (ela espera no elevador).' + (suite ? ' A companhia está incluída na suíte.' : '')); sendStat(p); return; }
  return _vmV4(p, m); }; }

// ---------------- CLIENTE ----------------
if (typeof progEvent === 'function') { const _peV4 = progEvent; progEvent = function (m, now) {
  if (m.t === 'vloffer') { const old = document.getElementById('vl-offer'); if (old) old.remove(); if (m.off) return true;
    const d = document.createElement('div'); d.id = 'vl-offer'; d.className = 'aff-box ask'; d.innerHTML = '<div class="aff-h">🍷 ' + escAff(m.name) + (m.renew ? ': “Minha taça acabou… mais uma?”' : ': “Me paga uma bebida?”') + '</div><div class="aff-row"><button type="button" class="ok" data-a="1">Pagar a bebida (' + m.cost + ')</button><button type="button" data-a="0">' + (m.renew ? 'Chega por hoje' : 'Recusar') + '</button></div><div class="aff-ft">Com ela na mesa, ela faz carinho sozinha enquanto a bebida dura.</div>';
    d.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { Net.send({ t: 'vel', a: 'drink', id: m.id, ok: +b.dataset.a }); d.remove(); }); document.body.appendChild(d); setTimeout(() => d.remove(), VL4.offerMs); return true; }
  if (m.t === 'vlbed') { if (typeof lieDown === 'function' && BEDS[m.b]) lieDown(m.b); return true; }
  if (m.t === 'affnn') { const M = {}; for (const [a, b, k, c] of m.l || []) { M[a] = { w: b, k, ctx: c, lead: 1 }; M[b] = { w: a, k, ctx: c, lead: 0 }; } G._affNN = M; return true; }
  return _peV4(m, now); }; }
/* NPC com NPC: quem conduz desenha o par; de mãos dadas, cada um no seu desenho */
if (typeof drawHeroEntity === 'function') { const _dhV4 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) { const A = e && e.isNpc && G._affNN && G._affNN[e.id];
  if (A && A.k !== 'hand' && R3.ok) { if (!A.lead) { e._spr = null; return; } const o = G.npcs[A.w]; if (o && typeof affPairSprite2 === 'function') { const s = affPairSprite2(e, o, A); if (s) { ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy); e._spr = s; e._sx = sx; e._sy = sy; e._drawT = now; return; } } }
  return _dhV4(ctx, e, sx, sy, now); }; }
if (typeof heroPoseFor === 'function') { const _hpV4 = heroPoseFor; heroPoseFor = function (e, now) { const P = _hpV4(e, now); if (!e || !e.isNpc || P.sit || P.act) return P;
  let o = null; const A = G._affNN && G._affNN[e.id]; if (A && A.k === 'hand') o = G.npcs[A.w]; else for (const id in G.players) { const q = G.players[id]; if (q.aff && q.aff.k === 'hand' && q.aff.w === e.id) { o = q; break; } }
  if (o && o.rx != null) { const d = (e.dir || 0) * Math.PI / 4, sxv = Math.sin(d), syv = Math.cos(d), fx = syv + sxv / 2, fy = syv - sxv / 2; P.hand = ((o.rx - e.rx) * -fy + (o.ry - e.ry) * fx) > 0 ? 'A' : 'B'; } return P; }; }
