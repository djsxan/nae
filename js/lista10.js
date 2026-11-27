/* Lista 10 (28/11): defeitos da Casa de Veludo, quem dorme em casa de jogador, meditação que cresce com a habilidade, corpos que apodrecem e o enterro */

/* ---------- 4. NPC com cama numa casa que um jogador alugou ou comprou (ex.: a Irmã Lúmina na Casa 3): dorme no próprio local de trabalho ---------- */
if (typeof dormSlotOf === 'function' && typeof S !== 'undefined') {
  const _dsL10 = dormSlotOf; let BI_H = null, WORK = null;
  dormSlotOf = function (id) { const r = _dsL10.apply(this, arguments); if (!r || !S.estate) return r;
    if (!BI_H) { BI_H = {}; for (const P of PROPS) if (P.kind === 'house' && !P.apt) BI_H[P.bi] = P; WORK = {}; for (const d of NPCS) if (d.x != null) WORK[d.id] = WORLD.bld[tileAt(d.x, d.y)]; }
    const P = BI_H[r.bi]; if (!P || !(S.estate.r[P.id] || (S.estate.gone && S.estate.gone[P.id]))) return r;
    const wb = WORK[id]; if (wb == null || wb < 0 || wb === r.bi) return null; let L = []; try { L = dormSlots(wb, 0, false); } catch (e) { }
    if (L.length) { const s = L[Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % L.length]; return { ...s, bi: wb, fl: 0 }; }
    return null; };   /* sem cama no trabalho: passa a noite no posto */
}

/* ---------- 3. Casa de Veludo: a moça chamada vem mesmo com a "querida" livre; a querida tem prioridade só por 1 minuto ---------- */
if (typeof vl5OfferFor === 'function' && typeof S !== 'undefined') {
  /* a camada da afinidade (lista 9) é a de fora: marca quem foi chamada antes dela decidir */
  const _voL10 = vl5OfferFor;
  vl5OfferFor = function (g, now) {
    for (const p of Object.values(S.players)) { const W = p.vl8Want; if (W && W.g === g && now <= W.until && p.sit && !(p.fl || 0) && vlInside(p) && !p.vlOffer) { const s = vl4BoothSeat(p); if (s && vl5MyTable(p, s.vb)) { const fs = vl4FreeSeat(p, s.vb); if (fs >= 0) { p.vl8Want = null; return { p, c: s.vb, fs, called: 1 }; } } } }
    const O = _voL10.apply(this, arguments); return O; };
}
if (typeof l9VFav === 'function' && typeof S !== 'undefined') {
  const _fvL10 = l9VFav;
  l9VFav = function (p) { const f = _fvL10.apply(this, arguments); if (!f) return f; if (p.sit && p._vl5Sit && Date.now() - p._vl5Sit > 60000 && !Object.values(S.vlTable || {}).some(X => X.who === p.id)) return null; return f; };   /* a querida não veio em 1 minuto: as outras podem vir */
}
/* a Jade só vai anotar o pedido se estiver livre (não briga com a bandeja a caminho) */
if (typeof vl8Call === 'function' && typeof S !== 'undefined') { const _vcL10 = vl8Call; vl8Call = function (p, now) { const run = S.vlTrayRun; if (run) { const J = S.vl5 && S.vl5.vl_jade; const r = _vcL10.apply(this, arguments); if (S.vl5 && S.vl5.vl_jade && S.vl5.vl_jade.a === 'order8' && S.vl5.vl_jade !== J) delete S.vl5.vl_jade; return r; } return _vcL10.apply(this, arguments); }; }
/* a bandeja: a Jade vai pela grade de passos (desvia das mesas e do palco), não mais em linha reta */
if (typeof velMsg === 'function' && typeof S !== 'undefined') {
  const _vmL10 = velMsg;
  velMsg = function (p, m) {
    if (m && m.a === 'dismiss8') { const g = String(m.id || ''), T = S.vlTable && S.vlTable[g]; if (T && T.who === p.id) { vl4EndTable(g, ['Até mais, querido.', 'Me chama quando quiser.', 'Vou circular um pouco.'][Math.floor(Math.random() * 3)]); } return; }
    const had = !!S.vlTrayRun, r = _vmL10.apply(this, arguments);
    try { if (m && m.a === 'tray' && !had && S.vlTrayRun && typeof vl5Path === 'function') { const R = S.vlTrayRun, j = S.npcs.vl_jade, b = velB('velvet'); if (j && b) { const [au, av] = worldToLocal(b, R.at[0], R.at[1]), pts = vl5Path(j, au, av, 0); if (pts && pts.length) R.pts = pts.concat([R.at]); } } } catch (e) { console.warn('bandeja', e); }
    return r; };
}
/* ---------- 8. levantar da mesa não manda a moça embora: ela espera no reservado enquanto você está na casa; dispensar pelo menu dela ---------- */
if (typeof vl4Tick === 'function' && typeof S !== 'undefined') {
  const _v4L10 = vl4Tick;
  vl4Tick = function (now) { const fake = [];
    for (const g in S.vlTable || {}) { const T = S.vlTable[g]; if (T.npc) continue; const p = S.players[T.who]; if (p && !p.sit && !(p.fl || 0) && vlInside(p)) { const s = T.seat != null ? WORLD.seats[T.seat] : null; if (s && s.vb != null && vl5MyTable(p, s.vb)) { fake.push([p, p.sit, p.x, p.y]); const own = WORLD.seats.find(q => q.vb === s.vb && q.bi === s.bi && !(q.fl || 0) && Math.hypot(q.x - s.x, q.y - s.y) > 0.1) || s; p.sit = { x: own.x, y: own.y, chair: 1, _l10: 1 }; p.x = own.x; p.y = own.y; if (T.next < now + 4000) T.next = now + 4000; } } }
    try { return _v4L10.apply(this, arguments); } finally { for (const [p, sit, x, y] of fake) { p.sit = sit; p.x = x; p.y = y; } } };   /* finge que você continua sentado só para a mesa não acabar (os carinhos esperam você voltar) */
}
if (typeof affStart === 'function' && typeof S !== 'undefined') { const _asL10 = affStart; affStart = function (a, b) { if (a && a.sit && a.sit._l10) return; return _asL10.apply(this, arguments); }; }

/* ---------- 6. noite fechada por um lorde de casa extinta: a casa abre normalmente ---------- */
if (typeof vlClosed === 'function' && typeof S !== 'undefined') { const _clL10 = vlClosed; vlClosed = function () { const C = _clL10.apply(this, arguments); if (C && C.by === 'l' && (!HOUSE_BY[C.hid] || (typeof fhIs === 'function' && fhIs(C.hid)))) return null; return C; }; }

/* ---------- 7. suíte alugada: o capanga da suíte fica de folga no porão (não guarda o elevador) ---------- */
if (typeof vlPost === 'function' && typeof S !== 'undefined') { const _vpL10 = vlPost; vlPost = function (T) { if (T && T.id === 'vl_c9' && S.estate && typeof vlSuiteRec === 'function' && (vlSuiteRec().own || (typeof vlSuiteLord === 'function' && vlSuiteLord()))) return { at: [5.0, 8.6], fl: -1, sit: 1, dir: 1 }; return _vpL10.apply(this, arguments); }; }

/* ---------- 9. festa na suíte: as moças da cena de grupo não aparecem de novo deitadas (dormindo) ao lado; painel no canto ---------- */
if (typeof drawNpcState === 'function' && typeof G !== 'undefined') { const _dnL10 = drawNpcState; drawNpcState = function (ctx, e, sx, sy, now) { const GR = G.vlGrp, LL = G.vlLap; if (e && ((GR && Object.values(GR).some(g => g.ids && g.ids.includes(e.id))) || (LL && Object.values(LL).some(l => l.g === e.id)))) return true; return _dnL10.apply(this, arguments); }; }
if (typeof document !== 'undefined' && typeof G !== 'undefined') { const st = document.createElement('style'); st.textContent = '#vl6-ui { left: calc(14px + env(safe-area-inset-left, 0px)) !important; right: auto !important; top: auto !important; bottom: calc(120px + env(safe-area-inset-bottom, 0px)) !important; transform: none !important; width: min(300px, calc(100vw - 28px)) !important; max-height: 46vh; overflow: auto; }'; document.head.appendChild(st); }
/* cliente: dispensar a moça pelo menu dela */
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peL10 = progEvent; progEvent = function (m, now) { const r = _peL10(m, now);
  if (m.t === 'velmenu' && m.k === 'comp') { try { const d = $('tequip'); if (d && d.classList.contains('vel-panel') && !d.querySelector('.vel10-dis')) { const box = document.createElement('div'); box.className = 'vel10-dis'; box.innerHTML = '<div class="tq-btns"><button class="est-btn ghost" data-d10>🙋 Dispensar<small>se ela estiver na sua mesa</small></button></div>'; d.appendChild(box); box.querySelector('[data-d10]').onclick = () => { Net.send({ t: 'vel', a: 'dismiss8', id: m.id }); d.classList.add('hidden'); }; } } catch (e) { } }
  return r; }; }

/* ---------- 1. meditação: quanto mais habilidade no elemento, mais energia concentrada (círculo, chamas, gotas, pedras e feixe maiores) ---------- */
if (typeof meditMsg === 'function' && typeof S !== 'undefined') { const _mmL10 = meditMsg; meditMsg = function (p, m) { const r = _mmL10.apply(this, arguments); try { if (p.medit && m && m.on) { const lv = typeof useLvl === 'function' && typeof USE !== 'undefined' && USE['el_' + p.medit.el] ? useLvl(p, 'el_' + p.medit.el) : 0; p.medit.lv = lv; near(p.x, p.y, { t: 'medit', id: p.id, on: 1, el: p.medit.el, lv }); } } catch (e) { } return r; }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peM10 = progEvent; progEvent = function (m, now) { const r = _peM10(m, now); if (m.t === 'medit' && m.on && m.lv != null) { const e = G.players[m.id]; if (e && e.medit) e.medit.lv = m.lv; } return r; }; }
if (typeof drawMeditAura === 'function' && typeof G !== 'undefined') { const _maL10 = drawMeditAura; drawMeditAura = function (ctx, e, sx, sy, now, front) { const lv = e && e.medit && e.medit.lv != null ? e.medit.lv : 0, s = 1 + Math.min(1, lv / 100) * 1.1;   /* nível 0: como antes; nível 100: pouco mais que o dobro */
  if (s <= 1.01) return _maL10.apply(this, arguments); ctx.save(); ctx.translate(sx, sy); if (front) ctx.scale(s, 1 + (s - 1) * 0.35); else ctx.scale(s, s); ctx.translate(-sx, -sy);
  try { return _maL10.apply(this, arguments); } finally { ctx.restore(); } }; }

/* ---------- 2. corpos de NPC: apodrecem aos poucos (fresco → apodrecendo, com moscas → esqueleto) e qualquer um pode dar um enterro digno ---------- */
const L10C = { rot: 1200000, bone: 3600000, cityR: 72, digMs: 6000 };
if (typeof MEM_DELTA !== 'undefined') { MEM_DELTA.bury = 6; MEM_TXT.bury = 'deu um enterro digno a um morto'; }
function l10InCity(x, y) { return typeof CENTER !== 'undefined' ? Math.hypot(x - CENTER, y - CENTER) < L10C.cityR : true; }
function l10Graves() { return S.graves || (S.graves = []); }
function l10Bury(n, by, byName) { const g = { x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10, n: (n.corpseName || (n.name || 'alguém').split(',')[0]), t: Date.now(), by: byName || '' }; const L = l10Graves(); L.push(g); if (L.length > 60) L.shift();
  visGone(n); Net.toAll({ t: 'graves', l: L }); if (typeof sys === 'function') sys('⚰ ' + (byName || 'Alguém') + ' deu um enterro digno a ' + g.n + '.'); }
if (typeof estateTick === 'function' && typeof S !== 'undefined') {
  const _etC10 = estateTick;
  estateTick = function (now) { const r = _etC10.apply(this, arguments);
    try { if (now - (S.l10cT || 0) > 5000) { S.l10cT = now; const re = now - (S.l10cR || 0) > 12000; if (re) S.l10cR = now;
      for (const n of Object.values(S.npcs || {})) { if (!n.dead) continue; if (!n.corpseT) n.corpseT = now; const age = now - n.corpseT, st = age < L10C.rot ? 0 : age < L10C.bone ? 1 : 2;
        if (n.rotSt !== st || (re && st)) { n.rotSt = st; near(n.x, n.y, { t: 'nrot', id: n.id, st }); }
        /* fora da cidade: um NPC que passa perto às vezes enterra o morto */
        if (!l10InCity(n.x, n.y) && age > 600000 && !n.dragBy && Math.random() < 0.15) { const q = Object.values(S.npcs).find(o => o !== n && !o.dead && !o.downed && !o.aggro && !o.fight && !/^(guard|captain)/.test(o.kind || '') && Math.hypot(o.x - n.x, o.y - n.y) < 4); if (q) { near(q.x, q.y, { t: 'anim', w: 'n', id: q.id, a: 'reap', ms: 2600 }); empSay(q, 'Descanse em paz.'); l10Bury(n, q.id, (q.name || '').split(',')[0]); } } } } } catch (e) { console.warn('corpos', e); }
    return r; };
}
/* arrastar ou carregar o corpo até a cidade: o coveiro recolhe (vale para qualquer morto, não só seguranças e domésticas) */
if (typeof visGone === 'function' && typeof S !== 'undefined' && typeof estateTick === 'function') { const _etB10 = estateTick; estateTick = function (now) { const r = _etB10.apply(this, arguments);
  try { if (now - (S.l10bT || 0) > 15000) { S.l10bT = now; const hr = typeof empHour === 'function' ? empHour() : 12; if (hr >= 7 && hr < 19) for (const n of Object.values(S.npcs || {})) { if (!n.dead || !n.movedToCity || n.dragBy || n.onBackBy) continue; if (l10InCity(n.x, n.y)) { visGone(n); if (typeof sys === 'function') sys('⚰ O coveiro levou o corpo de ' + (n.corpseName || (n.name || 'alguém').split(',')[0]) + ' ao cemitério.'); } } } } catch (e) { }
  return r; }; }
if (typeof stopDrag === 'function' && typeof S !== 'undefined') { const _sdC10 = stopDrag; stopDrag = function (p) { const d = p && p.drag, t = d && typeof dragTarget === 'function' ? dragTarget(d.k, d.id) : null; const r = _sdC10.apply(this, arguments); try { if (t && t.dead && d.k === 'n' && !l10InCity(d.x0 || 0, d.y0 || 0) && l10InCity(t.x, t.y)) t.movedToCity = 1; } catch (e) { } return r; }; }
/* enterro pelo jogador: perto do corpo, F; cava a cova ao lado (6 s) */
if (typeof empMsg === 'function' && typeof S !== 'undefined') { const _emB10 = empMsg; empMsg = function (p, m) { if (!m || m.a !== 'bury') return _emB10.apply(this, arguments);
  const n = S.npcs[String(m.id || '')]; if (!n || !n.dead || p.downed || dist(p.x, p.y, n.x, n.y) > 2.2) return; if (p.burying) return; p.burying = n.id; p.walking = false;
  near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'reap', ms: L10C.digMs }); tell(p, 'Você cava uma cova ao lado de ' + (n.corpseName || (n.name || 'alguém').split(',')[0]) + '...');
  setTimeout(() => { p.burying = null; if (!S.npcs[n.id] || !S.players[p.id] || dist(p.x, p.y, n.x, n.y) > 2.6) { tell(p, 'O enterro ficou pela metade.'); return; }
    for (const q of Object.values(S.npcs)) if (!q.dead && q !== n && Math.hypot(q.x - p.x, q.y - p.y) < 7) memAdd(q, p, 'bury');
    l10Bury(n, p.id, p.name); tell(p, 'Você deu um enterro digno. Quem viu passou a gostar mais de você.'); }, L10C.digMs); }; }
if (typeof empWelcome === 'function' && typeof S !== 'undefined') { const _ewC10 = empWelcome; empWelcome = function (to) { const r = _ewC10.apply(this, arguments); try { if (S.graves && S.graves.length) Net.toOne(to, { t: 'graves', l: S.graves }); for (const n of Object.values(S.npcs || {})) if (n.dead && n.rotSt) Net.toOne(to, { t: 'nrot', id: n.id, st: n.rotSt }); } catch (e) { } return r; }; }
/* cliente: apodrecendo (escuro e moscas), esqueleto, covas e o F de enterrar */
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peC10 = progEvent; progEvent = function (m, now) { if (m.t === 'nrot') { G.npcRot = G.npcRot || {}; G.npcRot[m.id] = m.st; return true; } if (m.t === 'graves') { G.graves = m.l || []; return true; } return _peC10(m, now); }; }
if (typeof drawNpcState === 'function' && typeof G !== 'undefined') { const _dnC10 = drawNpcState; drawNpcState = function (ctx, e, sx, sy, now) { const st = e && e.npDead && G.npcRot ? G.npcRot[e.id] : 0;
  if (st === 2 && R3.ok && typeof MON_LOOK !== 'undefined' && MON_LOOK.skeleton) { const dir = e.dir | 0, s = cache3('skelc|' + dir, () => { const L = lookFor('mon:skeleton', MON_LOOK.skeleton), R = rigFor('skelcorpse', L, { scale: 0.98 }); const P2 = { dir, walk: -1, down: true, nowp: 1 }; applyPose(R, buildPose('knight', P2), P2, 0); if (R.weapon && R.weapon.obj) R.weapon.obj.visible = false; return shoot3D(R, dir, -Math.PI / 2); }, null); ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy); return true; }
  const r = _dnC10.apply(this, arguments);
  if (st === 1) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#2a3a14'; ctx.beginPath(); ctx.ellipse(sx, sy - 3, 16, 6, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#111'; for (let i = 0; i < 5; i++) { const a = now / 260 + i * 1.3, rr = 6 + (i % 3) * 3; ctx.fillRect(sx + Math.cos(a) * rr, sy - 10 + Math.sin(a * 1.7) * 4, 1.2, 1.2); } ctx.restore(); }   /* apodrecendo: escuro e moscas */
  return r; }; }
if (typeof drawMealTray === 'function' && typeof G !== 'undefined') { const _dmC10 = drawMealTray; drawMealTray = function (ctx, P, now) { _dmC10.apply(this, arguments); const L = G.graves; if (!L || !L.length || !G.me || (G.me.fl | 0)) return;
  for (const g of L) { const q = P(g.x, g.y, 0), x = q[0], y = q[1]; ctx.save(); ctx.fillStyle = 'rgba(60,40,24,0.85)'; ctx.beginPath(); ctx.ellipse(x, y, 11, 4.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(90,64,40,0.9)'; ctx.beginPath(); ctx.ellipse(x, y - 1.5, 8, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a5a44'; ctx.fillRect(x - 0.9, y - 16, 1.8, 13); ctx.fillRect(x - 4.5, y - 13, 9, 1.8); ctx.restore(); } }; }   /* cova: monte de terra e uma cruz de madeira */
function l10CorpseNear() { if (typeof G === 'undefined' || !G.me || !G.npcs) return null; let best = null, bd = 1.7; for (const id in G.npcs) { const e = G.npcs[id]; if (!e.npDead || !e.visible) continue; const d = Math.hypot(e.rx - G.me.rx, e.ry - G.me.ry); if (d < bd) { bd = d; best = e; } } return best; }
if (typeof csHint === 'function' && typeof G !== 'undefined') { const _chC10 = csHint; csHint = function () { const h = _chC10(); if (h) return h; const e = l10CorpseNear(); return e ? 'F: dar um enterro digno a ' + (e.name || 'este morto').split(',')[0] : ''; }; }
if (typeof csF === 'function' && typeof G !== 'undefined') { const _cfC10 = csF; csF = function () { if (_cfC10()) return true; const e = l10CorpseNear(); if (!e) return false; Net.send({ t: 'emp', a: 'bury', id: e.id }); return true; }; }

/* a bandeja anda a cada instante (antes era 1 vez por segundo, aos trancos) e pela grade de passos */
if (typeof affTick === 'function' && typeof S !== 'undefined') { const _atL10 = affTick; affTick = function (now) { const R = S.vlTrayRun; S.vlTrayRun = null; try { return _atL10.apply(this, arguments); } finally { if (!S.vlTrayRun) S.vlTrayRun = R; } }; }
if (typeof velTick === 'function' && typeof S !== 'undefined') { const _vtT10 = velTick; velTick = function (now) { _vtT10(now);
  try { const R = S.vlTrayRun, j = S.npcs && S.npcs.vl_jade; if (!R || !j) return; const p = S.players[R.who]; if (!p) { S.vlTrayRun = null; return; } const dt = Math.min(0.25, (now - (R.t8 || now)) / 1000); R.t8 = now;
    R.i = vl5Move(j, R.pts, R.i, dt, 1.5); j.walking = R.i < R.pts.length;
    if (R.i >= R.pts.length) { if (!R.back) { S.vlTray = S.vlTray || {}; S.vlTray[p.id] = { until: now + AF4.trayMs, at: [j.x, j.y] }; near(j.x, j.y, { t: 'pzfx', k: 'tray', x: R.at[0], y: R.at[1], ms: AF4.trayMs }); near(j.x, j.y, { t: 'skt', id: 'vl_jade', on: 0 }); empSay(j, 'Uma bandeja para a mesa! Bebam devagar, meninas.'); tell(p, '🍾 A bandeja chegou: 15 minutos de bebida na mesa. As moças ficam, bebem e atraem mais companhia.');
        const T0 = VEL_STAFF.find(t => t.id === 'vl_jade'), back = T0 ? vl5Path(j, T0.at[0], T0.at[1], 0) : null; R.back = 1; R.pts = back && back.length ? back : R.pts.slice().reverse(); R.i = 0; }
      else { S.vlTrayRun = null; j.walking = false; } } } catch (e) { console.warn('bandeja', e); } }; }
