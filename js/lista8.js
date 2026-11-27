/* Lista 8 (28/11): sineta da pousada, ex-moradores fora das casas desocupadas, doméstica cozinhando por dentro, refeição servida em todas as casas */

/* ---------- 1. sineta no balcão da pousada: à noite a Dona Ilsa desce sonolenta para atender ---------- */
if (typeof hotelMsg === 'function' && typeof S !== 'undefined') {
  const _hmL8 = hotelMsg;
  hotelMsg = function (p, m) {
    const k = S.npcs && S.npcs.hotelkeeper;
    if (m.a === 'bell') {
      if (!k || k.dead) { tell(p, 'Você toca a sineta, mas ninguém responde.'); return; }
      if (!k.dormSt || k.dormSt === 'back') { tell(p, 'Dona Ilsa já está no balcão.'); return; }
      const now = now_(); if (k.bellT > now) { tell(p, 'Ela já está descendo...'); return; }
      k.bellT = now + 90000; k.bellSaid = 0;
      tell(p, '🔔 Você toca a sineta do balcão. Lá de cima, uma voz sonolenta: "Já vai, já vai..."');
      return; }
    const r = _hmL8.apply(this, arguments);
    if (m.a === 'rent' && k && k.bellT) k.bellT = Math.min(k.bellT, now_() + 20000);   /* atendeu: volta para a cama logo depois */
    return r; };
}
if (typeof dormNight === 'function' && typeof S !== 'undefined') {
  const _dnL8 = dormNight;
  dormNight = function (n, hr) { if (n.bellT) { if (now_() < n.bellT) return false; n.bellT = 0; } return _dnL8.apply(this, arguments); };
}
if (typeof dormTick === 'function' && typeof S !== 'undefined') {
  const _dtL8 = dormTick;
  dormTick = function (n, now, dt) { const r = _dtL8.apply(this, arguments);
    if (n.bellT && !n.dormSt && !n.bellSaid && typeof empSay === 'function') { n.bellSaid = 1; empSay(n, '(bocejando) Pois não? Uma cabine a esta hora?'); }
    return r; };
}
/* cliente: dica e F perto do balcão quando a estalajadeira não está lá */
function l8BellNear() {
  if (typeof G === 'undefined' || !G.me || (G.me.fl | 0)) return false; const H0 = (typeof NPCS !== 'undefined' ? NPCS : []).find(q => q.id === 'hotelkeeper'); if (!H0) return false;
  if (Math.hypot(G.me.x - H0.x, G.me.y - H0.y) > 3) return false; const k = G.npcs && G.npcs.hotelkeeper;
  return !(k && !(k.fl | 0) && Math.hypot(k.x - H0.x, k.y - H0.y) < 3);
}
if (typeof csHint === 'function' && typeof G !== 'undefined') { const _chL8 = csHint; csHint = function () { const h = _chL8(); if (h) return h; return l8BellNear() ? 'F: tocar a sineta do balcão' : ''; }; }
if (typeof csF === 'function' && typeof G !== 'undefined') { const _cfL8 = csF; csF = function () { if (_cfL8()) return true; if (!l8BellNear()) return false; Net.send({ t: 'hotel', a: 'bell' }); return true; }; }

/* ---------- 3. casa desocupada (despejo/compra): o antigo morador não volta mais para ela (o aviso ficava só na memória e sumia ao recarregar) ---------- */
if (typeof residentTick === 'function' && typeof S !== 'undefined') {
  const _rtL8 = residentTick; let BI_P = null;
  residentTick = function (n, now, dt) {
    if (n.home != null && !n.homeless && S.estate && S.estate.gone) {
      if (!BI_P) { BI_P = {}; for (const P of PROPS) if (P.kind === 'house' && !P.apt) BI_P[P.bi] = P; }
      const P = BI_P[n.home]; if (P && S.estate.gone[P.id] && (P.tenants || []).includes(n.id)) n.homeless = true; }
    return _rtL8.apply(this, arguments); };
}

/* ---------- 2. fogão encostado na parede: a doméstica fica de pé do lado de dentro (antes o ponto caía fora e ela dava a volta pela rua) ---------- */
function l8FixKitchens() {
  if (typeof KITCHENS === 'undefined' || typeof WORLD === 'undefined' || !WORLD.bld || typeof npcStand !== 'function') return false;
  for (const K of KITCHENS) { if (K.fl || K.l8) continue; K.l8 = 1; const sx0 = K.sx != null ? K.sx : K.x + 0.5, sy0 = K.sy != null ? K.sy : K.y + 0.8;
    if (WORLD.bld[tileAt(sx0, sy0)] === K.bi && npcStand(sx0, sy0, 0.24)) continue;
    for (const [dx, dy] of [[0, -0.9], [0, 0.9], [-0.9, 0], [0.9, 0], [-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8], [0, -1.6], [-1.6, 0], [1.6, 0], [0, 1.6]]) { const x = K.x + dx, y = K.y + dy;
      if (WORLD.bld[tileAt(x, y)] === K.bi && npcStand(x, y, 0.24)) { K.sx = x; K.sy = y; if (K.fx == null) { K.fx = K.x; K.fy = K.y; } break; } } }
  return true;
}
(function l8Retry(k) { if (!l8FixKitchens() && k < 60) setTimeout(() => l8Retry(k + 1), 500); })(0);

/* ---------- 10. refeição servida em todas as casas: na mesa da casa (ou na mesa baixa da suíte), com o fogão da casa ---------- */
const L8_TABLES = ['table', 'lowtable', 'chabudai', 'kotatsu', 'winetable', 'dtable', 'teatable'];
function l8MealKey(H) { return H.bi + '|' + (H.fl || 0) + '|' + (H.A ? H.A.key : ''); }
function l8MealSpot(H) {
  if (!H || !H.b) return null;
  if (typeof mealSuite === 'function' && H.fl && H.b.deco === 'machiya' && H.fl === floorsOf(H.b) - 1) { const [tx, ty] = localToWorld(H.b, MEAL_TABLE[0], MEAL_TABLE[1]), [kx, ky] = localToWorld(H.b, MEAL_KNEEL[0], MEAL_KNEEL[1]); return { tx, ty, kx, ky, low: 1 }; }
  let F = []; try { F = interiorLayout(H.b, H.fl || 0).F || []; } catch (e) { return null; }
  for (const f of F) { if (!L8_TABLES.includes(f.t)) continue; const cx = f.i + f.w / 2, cz = f.j + f.h / 2, [tx, ty] = localToWorld(H.b, cx, cz);
    if (H.fl && aptAt(H.bi, H.fl, tx, ty) !== H.A) continue;
    const low = f.t === 'lowtable' || f.t === 'chabudai' || f.t === 'kotatsu' ? 1 : 0;
    for (const [u, v] of [[0, f.h / 2 + 0.6], [0, -f.h / 2 - 0.6], [f.w / 2 + 0.6, 0], [-f.w / 2 - 0.6, 0]]) { const [kx, ky] = localToWorld(H.b, cx + u, cz + v);
      if (!H.fl ? (WORLD.bld[tileAt(kx, ky)] === H.bi && npcStand(kx, ky, 0.24)) : aptAt(H.bi, H.fl, kx, ky) === H.A) return { tx, ty, kx, ky, low }; }
    return { tx, ty, kx: tx, ky: ty + 0.8, low }; }
  return null;
}
function l8MealKitchen(H) {
  if (H.fl) return sakeKitchen(H);
  const K = KITCHENS.find(k => k.bi === H.bi && !k.fl); return K ? { x: K.sx != null ? K.sx : K.x, y: K.sy != null ? K.sy : K.y + 0.8, fx: K.fx != null ? K.fx : K.x, fy: K.fy != null ? K.fy : K.y } : { x: H.x, y: H.y, fx: H.x, fy: H.y };
}
if (typeof mealOrder === 'function' && typeof S !== 'undefined') {
  mealOrder = function (p, r, n, H, list) {
    const rec = S.estate.r[r.home]; if (!rec) return; const ch = rec.chest = rec.chest || {};
    const M = l8MealSpot(H); if (!M) { tell(p, 'Esta casa não tem mesa para servir a refeição.'); return; }
    const key = l8MealKey(H); if (S.fdTray && S.fdTray[key]) { tell(p, 'Já tem uma bandeja na mesa.'); return; }
    const items = []; let cooked = 0;
    for (const [k0, q0] of list) { const k = String(k0); let q = Math.max(0, Math.min(MEAL_MAX - items.length, q0 | 0)); if (!MEAL_FOODS.includes(k)) continue;
      while (q > 0) { if ((ch[k] | 0) > 0) { ch[k]--; if (!ch[k]) delete ch[k]; items.push(k); q--; continue; }
        const rc = Object.values(RECIPES).find(x => x.out === k); if (!rc || Object.keys(rc.need).some(i => (ch[i] | 0) < rc.need[i])) break;
        for (const i in rc.need) { ch[i] -= rc.need[i]; if (!ch[i]) delete ch[i]; } items.push(k); cooked++; q--; } }
    if (!items.length) { tell(p, 'Não tem ingredientes para isso no baú.'); return; }
    estateSave(); r.meal = { items, cooked, by: p.id }; n.goal = null; n.task = null; empSay(n, cooked ? 'Vou preparar e já sirvo.' : 'Já trago a bandeja.');
    const K = l8MealKitchen(H), put = M.low ? 'kneelput' : 'gather';
    n.goal = Object.assign(empTgt(H, K.x, K.y), { act: () => { empAnim(n, cooked ? 'cookfull' : 'gather', cooked ? 2600 + cooked * 600 : 900, K.fx, K.fy); n.task = { until: now_() + (cooked ? 2700 + cooked * 600 : 1000), done: () => { skCarry(n, 1);
      n.goal = Object.assign(empTgt(H, M.kx, M.ky), { act: () => { n.dir = dirFromVecS(M.tx - n.x, M.ty - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: put, ms: 1600, tx: M.tx, ty: M.ty }); n.task = { until: now_() + 1500, done: () => { skCarry(n, 0);
        fdTraySet(key, { items: r.meal.items.slice(), n0: r.meal.items.length, fl: H.fl || 0, bi: H.bi, x: M.tx, y: M.ty, low: M.low }); r.meal = null; empSay(n, 'A mesa está servida.'); } }; } }); } }; } });
  };
  mealEat = function (p) {
    if (!S.fdTray) return; let key = null, T = null;
    for (const k in S.fdTray) { const t = S.fdTray[k]; if (!t || !t.items.length || (p.fl || 0) !== (t.fl || 0)) continue; if (t.fl && p.fb !== t.bi) continue; if (t.x == null || dist(p.x, p.y, t.x, t.y) > 1.9) continue; key = k; T = t; break; }
    if (!T) return; const k = T.items.shift(); p.inv[k] = (p.inv[k] || 0) + 1; p.useT = 0; useItem(p, k);
    tell(p, 'Você come ' + (LOOT[k] ? LOOT[k].name.toLowerCase() : k) + ' da bandeja.' + (T.items.length ? ' Restam ' + T.items.length + '.' : ' A bandeja está vazia.'));
    near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'eat', ms: 1400 }); fdTraySet(key, T); };
  mealReturnTick = function (n, r, H) {
    const key = l8MealKey(H), T = S.fdTray && S.fdTray[key]; if (!T || T.items.length) return false;
    const K = l8MealKitchen(H), M = l8MealSpot(H) || { kx: T.x, ky: T.y + 0.8 }, put = T.low ? 'kneelput' : 'gather';
    n.goal = Object.assign(empTgt(H, M.kx, M.ky), { act: () => { const T2 = S.fdTray && S.fdTray[key]; if (!T2 || T2.items.length) return; n.dir = dirFromVecS(T.x - n.x, T.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: put, ms: 1600, tx: T.x, ty: T.y }); n.task = { until: now_() + 1500, done: () => { fdTraySet(key, null); skCarry(n, 1);
      n.goal = Object.assign(empTgt(H, K.x, K.y), { act: () => { empAnim(n, 'gather', 900, K.fx, K.fy); n.task = { until: now_() + 1000, done: () => skCarry(n, 0) }; } }); } }; } });
    empSay(n, 'Vou tirar a mesa.'); return true; };
}
if (typeof empWelcome === 'function' && typeof S !== 'undefined') {   /* quem entra recebe as bandejas com a chave nova (texto) */
  const _ewL8 = empWelcome;
  empWelcome = function (to) { const T = S.fdTray; S.fdTray = null; try { _ewL8.apply(this, arguments); } finally { S.fdTray = T; } if (T) for (const k in T) Net.toOne(to, { t: 'fdtray', bi: k, T: T[k] }); };
}
/* cliente: comer e desenhar a bandeja em qualquer mesa */
if (typeof mealNear === 'function' && typeof G !== 'undefined') {
  mealNear = function () { const me = G.me; if (!me || !G.fdTray) return null;
    for (const k in G.fdTray) { const T = G.fdTray[k]; if (!T || !T.items.length || (me.fl || 0) !== (T.fl || 0)) continue; if (T.fl && me.fb !== T.bi) continue;
      let x = T.x, y = T.y; if (x == null) { if (!me.fl || +k !== me.fb) continue; [x, y] = localToWorld(BUILDINGS[me.fb], MEAL_TABLE[0], MEAL_TABLE[1]); }
      if (Math.hypot(me.x - x, me.y - y) < 1.9) return T; }
    return null; };
  drawMealTray = function (ctx, P, now) {
    const me = G.me; if (!me || !G.fdTray) return;
    for (const key in G.fdTray) { const T = G.fdTray[key]; if (!T || (T.fl || 0) !== (me.fl || 0)) continue; if (T.fl && me.fb !== T.bi) continue;
      const bi = T.bi != null ? T.bi : +key, b = BUILDINGS[bi]; if (!b) continue; let x0 = T.x, y0 = T.y; if (x0 == null) [x0, y0] = localToWorld(b, MEAL_TABLE[0], MEAL_TABLE[1]);
      const raise = T.fl ? T.fl * (bldDims(b).H / floorsOf(b)) * HV : 0, q = P(x0, y0, 0), x = q[0], y = q[1] - raise - (T.low !== 0 && T.x == null || T.low ? 0.34 : 0.74) * HV;
      ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4); ctx.translate(-x, -y); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 1.5, 13, 5.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a2214'; ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.lineTo(x, y - 6); ctx.lineTo(x + 13, y); ctx.lineTo(x, y + 6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5a3620'; ctx.beginPath(); ctx.moveTo(x - 11.5, y); ctx.lineTo(x, y - 5); ctx.lineTo(x + 11.5, y); ctx.lineTo(x, y + 5); ctx.closePath(); ctx.fill();
      const n0 = T.n0 || T.items.length, eaten = n0 - T.items.length;
      for (let i = 0; i < n0; i++) { const cols = 3, cx = (i % cols) - 1, cy = Math.floor(i / cols) - (n0 > 3 ? 0.5 : 0), bx = x + cx * 6 - cy * 3, by = y + cx * 1.6 + cy * 3.2 - 1, full = i >= eaten, k = full ? T.items[i - eaten] : null, C = k && MEAL_COL[k] || ['#ddd', '#bbb'];
        ctx.fillStyle = '#e8e2d4'; ctx.beginPath(); ctx.ellipse(bx, by, 2.6, 1.3, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#b8b0a0'; ctx.beginPath(); ctx.ellipse(bx, by + 0.6, 2.6, 1.1, 0, 0, Math.PI); ctx.fill();
        if (full) { ctx.fillStyle = C[0]; ctx.beginPath(); ctx.ellipse(bx, by - 0.3, 2.0, 0.9, 0, 0, 7); ctx.fill(); ctx.fillStyle = C[1]; ctx.beginPath(); ctx.arc(bx - 0.5, by - 0.6, 0.6, 0, 7); ctx.fill(); if ((k === 'stew' || k === 'tea') && Math.random() < 0.05 && G.view) spawnPart('smoke', bx - G.view.ox, by - 3 - G.view.oy, { color: 'rgba(240,240,240,0.5)' }); }
        else { ctx.fillStyle = 'rgba(120,90,60,.35)'; ctx.beginPath(); ctx.ellipse(bx, by - 0.2, 1.6, 0.6, 0, 0, 7); ctx.fill(); } }
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + 7, y - 3, 4, 0.6); ctx.fillRect(x + 7.4, y - 2, 4, 0.6);
      ctx.restore(); } };
}

/* ---------- 11. mesa da Casa de Veludo: o botão de ataque automático em pessoas não aparece junto dos botões da mesa e dos painéis de afeto ---------- */
if (typeof document !== 'undefined' && typeof G !== 'undefined') {
  const st = document.createElement('style'); st.textContent = 'body:has(.vl-tray) #pplbtn, body:has(.aff-box) #pplbtn, body:has(#vl7-panel) #pplbtn { display: none !important; }'; document.head.appendChild(st);
  if (typeof pplBtnSync === 'function') { const _pbL8 = pplBtnSync; pplBtnSync = function () { _pbL8.apply(this, arguments); const b = document.getElementById('pplbtn'); if (b && document.querySelector('.vl-tray, .aff-box, #vl7-panel')) b.hidden = true; }; }
}
