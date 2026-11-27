// ============================================================
//  FESTA NA SUÍTE (pedido de 26/11): até 3 moças da mesa sobem com você para a suíte e a noite continua lá em cima.
//  · No menu da moça (F), com moças na mesa e a suíte sua: "Festa na suíte". Preço por moça: 1 = 60, 2 = 150, 3 = 270
//    (a suíte já inclui uma companhia, então desconta 60).
//  · Elas levam você até o elevador e sobem junto; na sala da suíte abre o painel da festa:
//    🍾 rodada de bebidas (a Xiu traz a bandeja, todos brindam), 🎶 música e dança (elas dançam em volta de você),
//    🛁 banheira de cobre (agora bem maior: todos dentro d'água, com carinho se revezando) e 🌙 cama (uma deita abraçada
//    com você e as outras deitam ao lado). Ao levantar da cama, o descanso; elas voltam para o salão.
// ============================================================
const VL6 = { price: [60, 150, 270], round: 40, danceMs: 45000, rot: 22000, layMs: 20000, partyMs: 1800000, waitMs: 120000 };
if (typeof AF2 !== 'undefined') { AF2.vtub = [11, 7]; AF2.vtubR = 1.9; }   /* banheira nova, 3 x 3 casas */
const VL6_LIFT = [[10.1, 3.7], [9.5, 3.9], [9.7, 3.2]], VL6_SALA = [[2.35, 4.7], [2.4, 6.0], [2.35, 7.3]], VL6_TUBP = [10.45, 7.4], VL6_TUBG = [[11.55, 6.65], [11.55, 7.55], [10.75, 6.55]], VL6_BEDG = [[5.35, 0.3], [6.65, 0.3], [6.0, 1.2]];
const VL6_LINES = { up: ['Vem, querido, a festa é lá em cima.', 'Ninguém nos incomoda na suíte.'], round: ['Saúde!', 'À nossa noite!', 'Mais uma!'], dance: ['Aumenta essa música!', 'Dança comigo!', 'Olha como eu giro!'], tub: ['A água está uma delícia.', 'Chega mais perto.', 'Hum, que quentinha.'], bed: ['Agora vem descansar com a gente.', 'Que noite…'] };
const vl6Pick = L => L[Math.floor(Math.random() * L.length)];

// ---------------- SERVIDOR ----------------
const vl6Girls = p => Object.keys(S.vlTable || {}).filter(g => { const T = S.vlTable[g]; return T && !T.npc && T.who === p.id; });
function vl6Cost(n) { return Math.max(0, VL6.price[Math.min(3, n) - 1] - VL_COMPANY); }
const vl6Who = id => S.vlParty && Object.keys(S.vlParty).find(k => S.vlParty[k].girls.includes(id));   /* o afeto confere com quem a moça está */
function vl6Pos(n, u, v, fl, dir, sit) { S.vlAway = S.vlAway || {}; S.vlAway[n.id] = { at: [u, v], fl, sit: sit ? 1 : 0, dir: dir || 0, until: Date.now() + 5000, vl6: 1, who: vl6Who(n.id) }; }
function vl6Hold(n, now) { const b = velB('velvet'); S.vlAway = S.vlAway || {}; S.vlAway[n.id] = { at: worldToLocal(b, n.x, n.y), fl: n.fl || 0, sit: 0, dir: n.dir || 0, until: now + 5000, vl6: 1, who: vl6Who(n.id) }; }
function vl6Bath(e, on, w) { near(e.x, e.y, { t: 'vl6bath', id: e.id, w, on: on ? 1 : 0 }); e._vl6b = on ? 1 : 0; }
function vl6Ui(p, P) { Net.toOne(p.id, { t: 'vl6ui', on: P && P.stage !== 'walk' && P.stage !== 'up' ? 1 : 0, stage: P ? P.stage : '', round: VL6.round, n: P ? P.girls.length : 0 }); }
/* pode fazer a festa? (sentado no seu reservado, com moças na mesa e a suíte sua) */
function vl6Can(p) { const s = typeof vl4BoothSeat === 'function' && p.sit ? vl4BoothSeat(p) : null; if (!s || vlBooths().own[s.vb] !== estOwner(p)) return null; const L = vl6Girls(p); if (!L.length) return null; return { n: L.length, cost: vl6Cost(L.length), suite: vlSuiteOwn(p) }; }
function vl6Start(p) { const now = Date.now(), C = vl6Can(p); if (!C) { tell(p, 'A festa começa no seu reservado, com as moças na mesa.'); return; }
  if (!C.suite) { tell(p, 'A festa particular é na suíte: alugue a suíte com a Mirela (' + VL_SUITE.price + ' de ouro) e chame as moças.'); return; }
  if ((p.gold || 0) < C.cost) { tell(p, 'Com ' + C.n + (C.n > 1 ? ' moças' : ' moça') + ', a festa custa ' + C.cost + ' de ouro (a suíte já inclui uma companhia).'); return; }
  p.gold -= C.cost; sendStat(p); const L = vl6Girls(p); for (const g of L) { if (typeof vl4EndTable === 'function') vl4EndTable(g); }
  if (p.aff && typeof affEnd === 'function') affEnd(p); if (p.sit) { p.sit = null; Net.toOne(p.id, { t: 'velfx', k: 'stand' }); }
  p.vlVisit = { k: 'suite', until: now + VL6.partyMs }; S.vlParty = S.vlParty || {};
  const P = S.vlParty[p.id] = { girls: L, stage: 'walk', t: now, mv: {} };
  L.forEach((g, k) => { const n = S.npcs[g]; if (!n) return; n.sitting = 0; vl6Hold(n, now); P.mv[g] = { pts: vl5Path(n, VL6_LIFT[k][0], VL6_LIFT[k][1], 0), i: 0 }; });
  const n0 = S.npcs[L[0]]; if (n0) empSay(n0, vl6Pick(VL6_LINES.up));
  tell(p, 'Festa na suíte com ' + L.map(g => S.npcs[g] ? S.npcs[g].name : g).join(', ') + ' (' + C.cost + ' de ouro). Siga as moças até o elevador, na parede leste.'); }
function vl6End(pid, why) { const P = S.vlParty && S.vlParty[pid]; if (!P) return; const p = S.players[pid], now = Date.now();
  for (const g of P.girls) { const n = S.npcs[g]; if (!n) continue; if (n._vl6b) vl6Bath(n, 0, 'n'); n.sleeping = false; n.aff = null; if (S.vlAway && S.vlAway[g] && S.vlAway[g].vl6) S.vlAway[g].until = now + 45000; }   /* ficam um pouco e depois voltam ao salão */
  if (p) { if (p._vl6b) vl6Bath(p, 0, 'p'); if (p.aff && typeof affEnd === 'function') affEnd(p); vl6Ui(p, null); if (why) tell(p, why); }
  delete S.vlParty[pid]; }
/* gestos de carinho se revezando entre as moças */
function vl6Rot(p, P, keys, now) { if (now < (P.next || 0) || !affFree(p)) return; const g = P.girls[(P.k = ((P.k || 0) + 1) % P.girls.length)], n = S.npcs[g]; if (!n) return; affStart(p, n, keys[Math.floor(Math.random() * keys.length)]);
  if (p.aff && p.aff.w === g) { if (!p.aff.until) p.aff.until = now + 9000; if (n.aff) n.aff.until = p.aff.until; P.next = p.aff.until + 6000; } else P.next = now + 5000; }
function vl6Tick(now) { if (!S.vlParty) return; const b = velB('velvet'), bi = vlBi(); if (!b) return; const dt = Math.min(0.5, (now - (S.vl6T || now)) / 1000); S.vl6T = now;
  for (const pid in S.vlParty) { const P = S.vlParty[pid], p = S.players[pid]; if (!p || p.downed) { vl6End(pid); continue; } if (now - P.t > VL6.partyMs) { vl6End(pid, 'A noite acabou; as moças descem para o salão.'); continue; }
    const G0 = P.girls.map(g => S.npcs[g]).filter(Boolean); if (!G0.length) { vl6End(pid); continue; }
    if (P.stage === 'walk') { let all = true; for (const n of G0) { const M = P.mv[n.id]; if (M && M.pts) { M.i = vl5Move(n, M.pts, M.i, dt); if (M.i < M.pts.length) all = false; else { n.walk = false; vl5Face(n, p.x, p.y); } } vl6Hold(n, now); }
      const [ex, ey] = localToWorld(b, 10, 3); if ((p.fl || 0) !== 0 || !vlInside(p)) { if (now - P.t > VL6.waitMs) vl6End(pid, 'As moças cansaram de esperar e voltaram ao salão.'); continue; }
      if (all && dist(p.x, p.y, ex, ey) < 2.2) { p.fl = 3; p.fb = bi; p.x = ex; p.y = ey; p.sit = null; Net.toOne(p.id, { t: 'tp', x: ex, y: ey, z: 0, fl: 3, fb: bi }); const Lf = S.npcs.vl_lift; if (Lf) empSay(Lf, 'Suíte, terceiro andar.');
        G0.forEach((n, k) => { const [u, v] = VL6_LIFT[k]; const [x, y] = localToWorld(b, u, v); n.x = x; n.y = y; n.fl = 3; n.fb = bi; vl6Hold(n, now); P.mv[n.id] = { pts: vl5Path(n, VL6_SALA[k][0], VL6_SALA[k][1], 3), i: 0 }; }); P.stage = 'up'; P.t1 = now; }
      else if (now - P.t > VL6.waitMs) vl6End(pid, 'As moças cansaram de esperar e voltaram ao salão.'); continue; }
    if ((p.fl || 0) !== 3 || p.fb !== bi) { vl6End(pid, 'Você deixou a suíte; as moças descem para o salão.'); continue; }
    if (P.stage === 'up') { let all = true; for (const n of G0) { const M = P.mv[n.id]; if (M && M.pts) { M.i = vl5Move(n, M.pts, M.i, dt); if (M.i < M.pts.length) all = false; else n.walk = false; } vl6Hold(n, now); }
      if (all || now - P.t1 > 15000) { P.stage = 'party'; P.t2 = now; G0.forEach((n, k) => { const [u, v] = VL6_SALA[k]; const [x, y] = localToWorld(b, u, v); n.x = x; n.y = y; n.walk = false; vl6Pos(n, u, v, 3, 2); });
        tell(p, 'Na sala da suíte, o painel da festa: bebidas, música e dança, a banheira de cobre e a cama.'); vl6Ui(p, P); } continue; }
    if (P.stage === 'party') { G0.forEach((n, k) => { const [u, v] = VL6_SALA[k]; vl6Pos(n, u, v, 3, n.dir); if (!(n.aff && n.aff.w === p.id)) vl5Face(n, p.x, p.y); });
      if (P.dance > now) { if (now - (P.da || 0) > 3000) { P.da = now; for (const n of G0) if (!(n.aff && n.aff.w === p.id)) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'dance', ms: 3200 }); if (Math.random() < 0.3) empSay(G0[Math.floor(Math.random() * G0.length)], vl6Pick(VL6_LINES.dance)); } }
      else if (G0.some(n => dist(n.x, n.y, p.x, p.y) < 1.4)) vl6Rot(p, P, ['hug', 'kissF', 'hold'], now);
      continue; }
    if (P.stage === 'tub') { const [cx, cy] = localToWorld(b, AF2.vtub[0], AF2.vtub[1]); if (dist(p.x, p.y, cx, cy) > AF2.vtubR + 0.2) { vl6ToParty(p, P, G0, now); tell(p, 'Você saiu da banheira.'); continue; }
      G0.forEach((n, k) => { if (n.aff && n.aff.w === p.id) { vl6Hold(n, now); return; } const [u, v] = VL6_TUBG[k]; const [x, y] = localToWorld(b, u, v); n.x = x; n.y = y; vl6Pos(n, u, v, 3, 6); vl5Face(n, p.x, p.y); if (!n._vl6b) vl6Bath(n, 1, 'n'); });
      if (!p.aff && !p._vl6b) vl6Bath(p, 1, 'p'); vl6Rot(p, P, ['wHug', 'wKiss', 'wBelly'], now); if (now - (P.say || 0) > 30000) { P.say = now; empSay(G0[Math.floor(Math.random() * G0.length)], vl6Pick(VL6_LINES.tub)); } continue; }
    if (P.stage === 'bed') { const B = BEDS[P.bed], lead = G0[0]; if (!B) { vl6End(pid); continue; }
      G0.forEach((n, k) => { if (k === 0) return; const [u, v] = VL6_BEDG[k - 1]; const [x, y] = localToWorld(b, u, v); n.x = x; n.y = y; n.sleeping = true; n.walk = false; vl6Pos(n, u, v, 3, B.dir || 0); });
      vl6Hold(lead, now);
      if (p.sleep === P.bed) { if (!P.lay) P.lay = now; const want = (Math.floor((now - P.lay) / 25000) % 3 === 2) ? 'bKiss' : 'bHold'; if (!p.aff || (p.aff.k !== want && !(p.aff.k === 'bKiss' && p.aff.until > now))) affStart(p, lead, want); }
      else if (P.lay) { const ok = now - P.lay >= VL6.layMs; if (ok) { p.vlRest = { until: now, who: G0.map(n => n.name).join(', ') }; } vl6End(pid, ok ? 'A festa termina; descansado, você levanta. As moças descem para o salão.' : 'Você levantou cedo; as moças descem para o salão.'); }
      else if (now - P.t3 > 60000) vl6End(pid, 'Você não deitou; as moças descem para o salão.'); continue; } } }
function vl6ToParty(p, P, G0, now) { if (p._vl6b) vl6Bath(p, 0, 'p'); for (const n of G0) { if (n._vl6b) vl6Bath(n, 0, 'n'); n.sleeping = false; } if (p.aff && typeof affEnd === 'function') affEnd(p); P.stage = 'party'; P.next = now + 8000; vl6Ui(p, P); }
/* botões da festa */
function vl6Msg(p, k) { const P = S.vlParty && S.vlParty[p.id], now = Date.now(), b = velB('velvet'), bi = vlBi(); if (!P || P.stage === 'walk' || P.stage === 'up') return; const G0 = P.girls.map(g => S.npcs[g]).filter(Boolean);
  if (k === 'end') { vl6End(p.id, 'Você encerra a festa; as moças descem para o salão.'); return; }
  if (k === 'round') { if (now < (P.roundT || 0)) { tell(p, 'A Xiu ainda está trazendo a última rodada.'); return; } if ((p.gold || 0) < VL6.round) { tell(p, 'Uma rodada custa ' + VL6.round + ' de ouro.'); return; } p.gold -= VL6.round; P.roundT = now + 12000;
    const id = 'vl_maidS', [mx, my] = localToWorld(b, 2.3, 6.6); if (!S.npcs[id]) { const v = { id, kind: 'vl_maid', name: 'Xiu, a criada', transient: true, court: 'praz', x: mx, y: my, z: 0, fl: 3, fb: bi, hp: 100, maxHp: 100, downed: null, dead: false, dir: 5 }; S.npcs[id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); }
    setTimeout(() => { const n = S.npcs[id]; if (n) empSay(n, 'Uma rodada da adega da Dama. Com licença.'); for (const g of G0) { if (!g.dead) { near(g.x, g.y, { t: 'anim', w: 'n', id: g.id, a: 'cheer', ms: 1400 }); } } if (G0[0]) empSay(G0[0], vl6Pick(VL6_LINES.round));
      if (S.players[p.id]) { p.water = Math.min(100, (p.water ?? 100) + 20); p.cst = Math.min(cstMaxOf(p), (p.cst || 0) + 40); p.buffs.tipsy = Math.max(p.buffs.tipsy || 0, Date.now()) + 40000; p.buffs.warm = Math.max(p.buffs.warm || 0, Date.now() + 240000); tell(p, 'Brinde na suíte: sede, fôlego e o calor do vinho.'); sendStat(p); } }, 2500);
    setTimeout(() => { const n = S.npcs[id]; if (n) visGone(n); }, 9000); sendStat(p); return; }
  if (k === 'dance') { if (P.stage !== 'party') vl6ToParty(p, P, G0, now); P.dance = now + VL6.danceMs; P.da = 0; if (G0[0]) empSay(G0[0], vl6Pick(VL6_LINES.dance)); tell(p, 'A vitrola toca e as moças dançam em volta de você.'); return; }
  if (k === 'tub') { if (P.stage === 'tub') { vl6ToParty(p, P, G0, now); return; } if (p.aff && typeof affEnd === 'function') affEnd(p); const [x, y] = localToWorld(b, VL6_TUBP[0], VL6_TUBP[1]); p.x = x; p.y = y; p.sit = null; Net.toOne(p.id, { t: 'tp', x, y, z: 0, fl: 3, fb: bi }); P.stage = 'tub'; P.next = now + 6000; P.dance = 0;
    G0.forEach((n, k2) => { const [u, v] = VL6_TUBG[k2]; const [gx, gy] = localToWorld(b, u, v); n.x = gx; n.y = gy; n.sleeping = false; vl6Pos(n, u, v, 3, 6); vl6Bath(n, 1, 'n'); }); vl6Bath(p, 1, 'p'); if (G0[0]) empSay(G0[0], vl6Pick(VL6_LINES.tub)); tell(p, 'Todos na banheira de cobre. Andar para fora dela sai do banho.'); vl6Ui(p, P); return; }
  if (k === 'bed') { const bed = BEDS.findIndex(q => q.vlRoom === 'suite'); if (bed < 0) return; vl6ToParty(p, P, G0, now); P.stage = 'bed'; P.bed = bed; P.t3 = now; P.lay = 0; const lead = G0[0];
    const B = BEDS[bed]; p.x = B.x; p.y = B.y + 0.6; p.sit = null; Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: 3, fb: bi }); if (lead) { lead.x = B.x + 0.3; lead.y = B.y; vl6Hold(lead, now); empSay(lead, vl6Pick(VL6_LINES.bed)); } setTimeout(() => { if (S.players[p.id]) Net.toOne(p.id, { t: 'vlbed', b: bed }); }, 400); vl6Ui(p, P); return; } }
if (typeof velTick === 'function') { const _vtV6 = velTick; velTick = function (now) { _vtV6(now); if (!S.estate) return; try { vl6Tick(now); } catch (e) { console.warn('veludo6', e); } }; }
/* o laço das moças não mexe em quem está na festa */
if (typeof vl5Free === 'function') { const _vfV6 = vl5Free; vl5Free = function (id, now) { if (S.vlParty && Object.values(S.vlParty).some(P => P.girls.includes(id))) return false; return _vfV6(id, now); }; }
if (typeof velMenu === 'function') { const _vmV6 = velMenu; velMenu = function (p, T, n) { _vmV6(p, T, n); if (T && T.menu === 'comp') { const C = vl6Can(p); if (C) Net.toOne(p.id, { t: 'vl6can', n: C.n, cost: C.cost, suite: C.suite ? 1 : 0, price: VL_SUITE.price }); } }; }
if (typeof velMsg === 'function') { const _vmsV6 = velMsg; velMsg = function (p, m) { if (m && m.a === 'party') { vl6Start(p); return; } if (m && m.a === 'p6') { vl6Msg(p, String(m.k || '')); return; } return _vmsV6(p, m); }; }

// ---------------- CLIENTE ----------------
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV6 = progEvent; progEvent = function (m, now) {
  if (m.t === 'vl6can') { const d = $('tequip'); if (d && d.classList.contains('vel-panel')) { let box = d.querySelector('.vel-party'); if (box) box.remove(); box = document.createElement('div'); box.className = 'vel-party';
      box.innerHTML = '<div class="vel-sub">Festa na suíte</div><div class="est-cost">Leve as ' + m.n + (m.n > 1 ? ' moças' : ' moça') + ' da mesa para a suíte: bebidas, música e dança, a banheira de cobre e a cama. Por moça: 60, 150 ou 270 (a suíte já inclui uma companhia).' + (m.suite ? '' : ' <b>Precisa da suíte</b> (' + m.price + ' de ouro, com a Mirela).') + '</div><div class="tq-btns"><button class="est-btn" data-pt' + (m.suite ? '' : ' disabled') + '>🌙 Festa na suíte<small>' + m.cost + ' de ouro</small></button></div>';
      d.appendChild(box); velBtn(d, '[data-pt]', () => ({ a: 'party' })); } return true; }
  if (m.t === 'vl6ui') { let d = document.getElementById('vl6-ui'); if (!m.on) { if (d) d.remove(); return true; } if (!d) { d = document.createElement('div'); d.id = 'vl6-ui'; d.className = 'aff-box'; document.body.appendChild(d); }
    const inTub = m.stage === 'tub', inBed = m.stage === 'bed';
    d.innerHTML = '<div class="aff-h">🌙 Festa na suíte</div><div class="aff-row"><button type="button" data-k="round">🍾 Rodada (' + m.round + ')</button><button type="button" data-k="dance">🎶 Música e dança</button></div><div class="aff-row"><button type="button" data-k="tub">' + (inTub ? '🛁 Sair da banheira' : '🛁 Banheira') + '</button><button type="button" data-k="bed"' + (inBed ? ' disabled' : '') + '>🌙 Para a cama</button><button type="button" data-k="end">Encerrar</button></div><div class="aff-ft">' + (inBed ? 'Deitados juntos; levante quando quiser.' : inTub ? 'Na banheira de cobre. Andar para fora sai do banho.' : 'Na sala da suíte. O 💞 Afeto também funciona com elas.') + '</div>';
    d.querySelectorAll('[data-k]').forEach(b => b.onclick = () => Net.send({ t: 'vel', a: 'p6', k: b.dataset.k })); return true; }
  if (m.t === 'vl6bath') { const e = m.w === 'n' ? G.npcs[m.id] : G.players[m.id]; if (e) e.vl6Bath = m.on ? { t0: now, mode: 'seat' } : null; return true; }
  return _peV6(m, now); }; }
/* banho na banheira de cobre da suíte: o corpo aparece dentro d'água (fora dos gestos de casal, que já se desenham assim) */
if (typeof drawHeroEntity === 'function') { const _dhV6 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) {
  if (e && e.vl6Bath && !e._vl6In && typeof drawBath === 'function' && R3.ok) { const inPair = (e.aff && e.aff.w) || (G._affNN && G._affNN[e.id]) || Object.values(G.players).some(q => q.aff && q.aff.w === e.id);
    if (!inPair) { const old = e.bathing; e._vl6In = 1; e.bathing = e.vl6Bath; G._thb = 1; try { drawBath(ctx, e, sx, sy, now); } finally { G._thb = 0; e.bathing = old; e._vl6In = 0; } return; } }
  return _dhV6(ctx, e, sx, sy, now); }; }
