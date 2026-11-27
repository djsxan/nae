/* Lista 9 (28/11): trocar de gesto de afeto sem parar, corpos que ficam, amizade com os donos, afinidade com as moças da Casa de Veludo */

/* ---------- 4. afeto: durante um gesto, a roda abre a lista de novo e o gesto escolhido substitui o atual (sem "Parar o gesto") ---------- */
if (typeof affMsg === 'function' && typeof S !== 'undefined') {
  const _amL9 = affMsg;
  affMsg = function (p, m) {
    try { if (m && m.a === 'ask' && p.aff && String(p.aff.w) === String(m.id) && AFF_KS.includes(m.k)) {
      const n = typeof affNpc === 'function' ? affNpc(m.id) : null, q = n || S.players[m.id];
      if (q) { const was = p.aff.k; affEnd(p); if (p._affAsk) p._affAsk[q.id] = 0;
        if (!n && q.aff == null && affFree(q) && affCan(p, affKCtx(m.k, p)) && affCanQ(p, q, affKCtx(m.k, p), false)) { affStart(p, q, m.k); return; }   /* entre jogadores: já estavam juntos, troca sem novo pedido */
        if (n) { affStart(p, n, m.k); if (!p.aff) affNpcAsk(p, n, m.k); return; }
        if (was) { } } } } catch (e) { console.warn('trocar gesto', e); }
    return _amL9.apply(this, arguments); };
}
if (typeof closeEmoteWheel === 'function' && typeof G !== 'undefined') {
  const _ceL9 = closeEmoteWheel;
  closeEmoteWheel = function (fire) { const wl = G.wheel; if (fire && wl && wl.sel >= 0 && G.aff) { const it = emoteList()[wl.sel]; if (it && it.k === 'aff') { G.wheel = null; $('emote-wheel').classList.add('hidden'); document.querySelectorAll('#emote-wheel .ew-opt').forEach(o => o.classList.remove('on')); affPick(); return; } } return _ceL9.apply(this, arguments); };
}
if (typeof emoteList === 'function' && typeof G !== 'undefined') { const _elL9 = emoteList; emoteList = function () { return _elL9().map(e => e.k === 'aff' && G.aff ? { k: 'aff', n: 'Trocar o gesto', i: '💞' } : e); }; }
if (typeof affPick2 === 'function' && typeof G !== 'undefined') {
  const _apL9 = affPick2;
  affPick2 = function () { const r = _apL9.apply(this, arguments);
    try { const d = document.getElementById('aff-box'); if (d && G.aff && !d.querySelector('[data-stop9]')) { const ft = d.querySelector('.aff-ft'); if (ft) ft.textContent = 'O gesto escolhido entra no lugar do atual, sem parar.'; const b = document.createElement('button'); b.type = 'button'; b.className = 'aff-x'; b.dataset.stop9 = 1; b.textContent = '💔 Parar o gesto'; b.style.marginRight = '6px';
      b.onclick = () => { Net.send({ t: 'aff', a: 'stop' }); G.aff = null; affCloseBox(); }; const x = d.querySelector('.aff-x'); if (x) x.parentNode.insertBefore(b, x); else d.appendChild(b); } } catch (e) { }
    return r; };
}

/* ---------- 5. corpos: o de NPC fica no chão até o coveiro recolher (pelo menos 20 min, e só de dia), monstros ficam 30 min (ver server.js) ---------- */
if (typeof estateTick === 'function' && typeof S !== 'undefined') {
  const _etL9 = estateTick;
  estateTick = function (now) { const r = _etL9.apply(this, arguments);
    try { if (now - (S.l9cT || 0) > 10000) { S.l9cT = now; const hr = typeof empHour === 'function' ? empHour() : 12;
      for (const n of Object.values(S.npcs || {})) { if (!n.dead) continue; if (!n.corpseT) { n.corpseT = now; continue; } if (n.dragBy || n.onBackBy) continue;
        if (now - n.corpseT > 1200000 && hr >= 7 && hr < 19 && /^(seg_|emp_)/.test(n.id)) { const nm = n.corpseName || (n.name || 'alguém').split(',')[0]; visGone(n); sys('⚰ O coveiro levou o corpo de ' + nm + ' ao cemitério.'); } } } } catch (e) { }
    return r; };
}

/* ---------- 2. freguês: quem frequenta um lugar vira amigo de quem trabalha lá (uma visita por dia do jogo, depois de 40 s dentro).
   Simpático (15+): cumprimenta pelo nome. Amigo (50+): às vezes oferece algo da casa; na pousada lotada a sua cabine fica guardada.
   Amigo próximo (70+): fiado (até 80 de ouro, acertado sozinho quando você tiver ouro) e, de vez em quando, um boato ou segredo do bairro ---------- */
if (typeof MEM_DELTA !== 'undefined') { MEM_DELTA.visit = 3; MEM_TXT.visit = 'é freguês da casa'; }
const L9_TREAT = { innkeeper: 'ale', tavmaid: 'ale', st_bakery: 'bread', fruit: 'apple', st_apoth: 'tea', merchant: 'bread', smith: null, hotelkeeper: 'tea' };
const L9_GREET = ['Bem-vindo de volta, %!', 'Olha quem voltou: %!', 'Que bom te ver, %.', '%! O de sempre?'];
let L9_POST = null;
function l9Workers(bi) { if (bi == null || bi < 0) return []; if (!L9_POST) { L9_POST = {}; for (const d of NPCS) { if (d.x == null || /^(guard|captain|courier)/.test(d.kind || '')) continue; const b0 = WORLD.bld[tileAt(d.x, d.y)]; if (b0 >= 0) (L9_POST[b0] = L9_POST[b0] || []).push(d.id); } }
  const L = (L9_POST[bi] || []).map(id => S.npcs[id]).filter(n => n && !n.dead && !n.transient); for (const n of Object.values(S.npcs || {})) if (!n.dead && n.bizWorker && PROPS_BY[n.bizWorker] && PROPS_BY[n.bizWorker].bi === bi && !L.includes(n)) L.push(n); return L; }
if (typeof estateTick === 'function' && typeof S !== 'undefined') {
  const _etF9 = estateTick;
  estateTick = function (now) { const r = _etF9.apply(this, arguments);
    try { if (now - (S.l9fT || 0) > 5000) { S.l9fT = now; const day = estDay(), E = S.estate; if (!E) return r; E.l9debt = E.l9debt || {};
      for (const p of Object.values(S.players)) { if (p.dev || p.downed) continue; const bi = WORLD.bld[tileAt(p.x, p.y)];
        /* fiado: acerta sozinho quando tiver ouro */
        const D = E.l9debt[memKey(p)]; if (D) for (const id in D) { if (p.gold >= D[id]) { p.gold -= D[id]; const n = S.npcs[id]; tell(p, 'Você acertou o fiado (' + D[id] + ' de ouro)' + (n ? ' com ' + n.name.split(',')[0] : '') + '.'); delete D[id]; sendStat(p); } }
        if (bi == null || bi < 0) { p.l9in = null; continue; } const b = BUILDINGS[bi]; if (!b || b.kind === 'house' || b.kind === 'manor') { p.l9in = null; continue; }
        if (!p.l9in || p.l9in.bi !== bi) { p.l9in = { bi, t: now, greet: 0 }; }
        const W = l9Workers(bi); if (!W.length) continue; const own = W[0];
        if (!p.l9in.greet) { p.l9in.greet = 1; const v = opOf(own, p); if (v >= 15 && dist(own.x, own.y, p.x, p.y) < 8) { const nm = p.name.split(' ')[0]; empSay(own, (v >= 70 ? ['%! Meu amigo, entre, entre!', 'Ah, %! A casa é sua.'] : L9_GREET)[Math.floor(Math.random() * (v >= 70 ? 2 : L9_GREET.length))].replace('%', nm)); } }
        if (now - p.l9in.t < 40000) continue; const VK = 'l9v' + bi; if (p[VK] === day) continue; p[VK] = day;
        for (const n of W) memAdd(n, p, 'visit');
        const v = opOf(own, p), k = L9_TREAT[own.kind] !== undefined ? L9_TREAT[own.kind] : L9_TREAT[own.id];
        if (v >= 50 && k && Math.random() < 0.3 && dist(own.x, own.y, p.x, p.y) < 6) { if (p.inv[k] || Object.keys(p.inv).length < INV_SLOTS) { p.inv[k] = (p.inv[k] || 0) + 1; sendStat(p); empSay(own, 'Essa é por conta da casa, ' + p.name.split(' ')[0] + '.'); tell(p, own.name.split(',')[0] + ' oferece ' + tName(k).toLowerCase() + ' por conta da casa.'); } }
        if (v >= 70 && Math.random() < 0.25 && typeof secRandom === 'function') { try { const s = secRandom(p, null); if (s && typeof secGive === 'function') { empSay(own, 'Chega mais perto... fiquei sabendo de uma coisa.'); secGive(p, s[0], s[1], own.name.split(',')[0] + ' contou, de amigo para amigo'); } } catch (e) { } }
        else if (v >= 70 && Math.random() < 0.25 && typeof hRec === 'function') { const N = (hRec().news || [])[Math.floor(Math.random() * Math.min(6, (hRec().news || []).length))]; if (N) tell(p, '💬 ' + own.name.split(',')[0] + ', baixinho: “Dizem por aí que ' + String(N[1]).replace(/\.$/, '').toLowerCase() + '.”'); } } } } catch (e) { S.l9err = String(e && e.stack || e); console.warn('freguês', e); }
    return r; };
}
/* fiado: amigo próximo deixa levar sem ouro (até 80, por dono) */
if (typeof tradeMsg === 'function' && typeof S !== 'undefined') {
  const _tmF9 = tradeMsg;
  tradeMsg = function (p, m) {
    try { if (m && m.a === 'buy') { const n = S.npcs && S.npcs[m.npc]; if (n && opOf(n, p) >= 70) { const T = tradeStock(n), k = String(m.k || ''), q = Math.max(1, Math.min(99, m.n | 0 || 1)); if (T.stock[k] > 0) { const cost = tSellPrice(n, p, k) * Math.min(q, T.stock[k]);
      if (!canPay(p, cost)) { const E = S.estate, D = (E.l9debt = E.l9debt || {})[memKey(p)] = (E.l9debt[memKey(p)] || {}), have = (p.gold || 0) + Math.floor(((typeof bankLoad === 'function' ? bankLoad().acc[estOwner(p)] : null) || { g: 0 }).g), need = cost - have;
        if (need > 0 && (D[n.id] || 0) + need <= 80) { p.gold = (p.gold || 0) + need; const g0 = p.gold; _tmF9.apply(this, arguments); if (p.gold < g0 || (p.inv[k] || 0) > 0) { D[n.id] = (D[n.id] || 0) + need; empSay(n, 'Leva, depois você me paga.'); tell(p, 'Fiado com ' + n.name.split(',')[0] + ': ' + need + ' de ouro (acerta sozinho quando você tiver ouro).'); estateSave(); } else p.gold -= need; return; } } } } } } catch (e) { console.warn('fiado', e); }
    return _tmF9.apply(this, arguments); };
}
/* prioridade: na pousada lotada, a Dona Ilsa tira um viajante para o amigo */
if (typeof hotelMsg === 'function' && typeof S !== 'undefined') {
  const _hmF9 = hotelMsg;
  hotelMsg = function (p, m) {
    try { if (m && m.a === 'rent' && hotelRoomOf(p) < 0 && hotelFree() < 0) { const k = S.npcs && S.npcs.hotelkeeper; if (k && opOf(k, p) >= 50) { const H = hotelData(); for (const r in H.rooms) { const x = H.rooms[r]; if (x && x.npc && !x.who) { delete H.rooms[r]; empSay(k, 'Para você eu sempre arrumo um lugar.'); break; } } } } } catch (e) { }
    return _hmF9.apply(this, arguments); };
}

/* ---------- 3. afinidade com as moças da Casa de Veludo ---------- */
const L9V = { girl: 2, drink: 1, company: 4, dear: 10, fav: 25, jealous: 3 };
function l9VRec(p) { const E = S.estate; E.l9vel = E.l9vel || {}; return (E.l9vel[memKey(p)] = E.l9vel[memKey(p)] || { a: {}, j: {}, sulk: {}, sec: {} }); }
function l9VFav(p) { const R = l9VRec(p); let best = null, bv = 0; for (const g in R.a) if (R.a[g] > bv) { bv = R.a[g]; best = g; } return bv >= L9V.dear ? best : null; }
function l9VAdd(p, g, v) { if (!S.estate || !S.npcs[g]) return; const R = l9VRec(p), was = R.a[g] || 0; R.a[g] = Math.max(0, Math.min(100, was + v)); const n = S.npcs[g];
  if (was < L9V.dear && R.a[g] >= L9V.dear) { tell(p, '💗 ' + n.name + ' gosta de você: vai te dar prioridade na sua mesa e vem te receber quando você chegar.'); empSay(n, 'Você está virando o meu cliente preferido, sabia?'); }
  if (was < L9V.fav && R.a[g] >= L9V.fav) { tell(p, '💗 ' + n.name + ' agora é muito próxima de você: às vezes conta segredos dos clientes de graça.'); }
  estateSave(); }
function l9VSulk(p, g) { const R = l9VRec(p); return (R.sulk[g] || 0) > estDay(); }
if (typeof velMsg === 'function' && typeof S !== 'undefined') {
  const _vmL9 = velMsg;
  velMsg = function (p, m) {
    const had = m && m.id && S.vlTable && S.vlTable[m.id] && S.vlTable[m.id].who === p.id;
    if (m && m.a === 'drink' && m.ok && l9VSulk(p, m.id)) { const n = S.npcs[m.id]; if (n) empSay(n, 'Hoje não. Vai lá com a sua nova favorita.'); if (S.vlOffer) delete S.vlOffer[m.id]; p.vlOffer = null; return; }
    const r = _vmL9.apply(this, arguments);
    try { if (!S.estate || !m) return r; const R = l9VRec(p);
      if (m.a === 'drink' && m.ok && S.vlTable && S.vlTable[m.id] && S.vlTable[m.id].who === p.id) { l9VAdd(p, m.id, had ? L9V.drink : L9V.girl); R.j[m.id] = 0;
        const fav = l9VFav(p), F = fav && S.npcs[fav]; if (fav && fav !== m.id && F && !F.dead && !(F.fl || 0) && vlInside(F) && dist(F.x, F.y, p.x, p.y) < 12) { const d = estDay(); if (R.jd !== d) { R.jd = d; R.j[fav] = (R.j[fav] || 0) + 1; }
          if (R.j[fav] >= L9V.jealous) { R.sulk[fav] = estDay() + 1; R.j[fav] = 0; R.a[fav] = Math.max(0, (R.a[fav] || 0) - 3); empSay(F, 'Hmpf. Então é assim...'); near(F.x, F.y, { t: 'anim', w: 'n', id: F.id, a: 'anger', ms: 1400 }); tell(p, '😤 ' + F.name + ' viu você escolher outra de novo e ficou emburrada até amanhã.'); }
          else if (Math.random() < 0.5) empSay(F, ['Hm. Bom proveito.', 'Ela? Sério?', 'Não esqueça de mim, hein.'][Math.floor(Math.random() * 3)]); }
        if ((R.a[m.id] || 0) >= L9V.fav && R.sec[m.id] !== estDay() && typeof secRandom === 'function' && typeof secGive === 'function') { const s = secRandom(p, null); if (s) { R.sec[m.id] = estDay(); const n = S.npcs[m.id]; setTimeout(() => { if (S.players[p.id] && n) { empSay(n, 'Vem cá, deixa eu te contar uma coisa...'); secGive(p, s[0], s[1], n.name + ' contou, só para você'); } }, 8000); } } }
      if (m.a === 'company' && S.npcs[m.id]) l9VAdd(p, m.id, L9V.company); } catch (e) { console.warn('afinidade', e); }
    return r; };
}
if (typeof vl8Party === 'function' && typeof S !== 'undefined') { const _vpL9 = vl8Party; vl8Party = function (p, girls) { const ok = _vpL9.apply(this, arguments); if (ok) for (const g of girls.slice(0, 3)) l9VAdd(p, g, 3); return ok; }; }
/* prioridade: a querida vem primeiro (as outras dão a vez); emburrada, ela não vem */
if (typeof vl5OfferFor === 'function' && typeof S !== 'undefined') {
  const _voL9 = vl5OfferFor;
  vl5OfferFor = function (g, now) { const O = _voL9.apply(this, arguments); if (!O || !S.estate) return O;
    try { if (l9VSulk(O.p, g)) return null; const fav = l9VFav(O.p); if (fav && fav !== g && !l9VSulk(O.p, fav)) { const F = S.npcs[fav]; if (F && !F.dead && !(F.fl || 0) && vl5Free(fav, now) && !(S.vlTable && S.vlTable[fav])) return null; } } catch (e) { }
    return O; };
}
/* a querida vem receber você na entrada e fica feliz de te ver */
if (typeof velTick === 'function' && typeof S !== 'undefined') {
  const _vtL9 = velTick;
  velTick = function (now) { _vtL9(now); try { if (!S.estate || now - (S.l9vT || 0) < 1500) return; S.l9vT = now;
    for (const p of Object.values(S.players)) { const inside = !(p.fl || 0) && vlInside(p); if (!inside) { p.l9VIn = 0; continue; } if (p.l9VIn) continue; p.l9VIn = now;
      const fav = l9VFav(p), F = fav && S.npcs[fav], T = fav && VEL_STAFF.find(t => t.id === fav); if (!F || !T || F.dead || (F.fl || 0) || l9VSulk(p, fav) || !vl5Free(fav, now)) continue;
      const pts = vl5Path(F, ...worldToLocal(velB('velvet'), p.x, p.y)); if (!pts) continue; if (S.vl5[fav]) vl5Drop(fav, true); S.vl5[fav] = { id: fav, a: 'greet9', pid: p.id, ph: 'go', t: now, pts, i: 0, dur: 4500, home: T.at }; p.vl8Want = { g: fav, until: now + 180000 }; }
    for (const g in S.vl5 || {}) { const L = S.vl5[g]; if (L.a !== 'greet9' || L.ph !== 'do' || L.said) continue; L.said = 1; const n = S.npcs[g], p = S.players[L.pid]; if (!n || !p) continue; vl5Face(n, p.x, p.y); empSay(n, ['Você voltou! Senti sua falta.', 'Achei que não vinha hoje!', 'Oi, querido! Vem, eu te levo até a sua mesa.'][Math.floor(Math.random() * 3)]); vl5Anim(n, 'adore', 2600); } } catch (e) { } };
}
