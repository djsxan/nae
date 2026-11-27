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

/* ---------- 5. mapa: sua doméstica e seus seguranças aparecem no mapa (posição a cada 2 s, de qualquer lugar do reino) ---------- */
if (typeof estateTick === 'function' && typeof S !== 'undefined') {
  const _etL8 = estateTick;
  estateTick = function (now) { const r0 = _etL8.apply(this, arguments);
    try { if (now - (S.l8mapT || 0) > 2000 && S.estate) { S.l8mapT = now;
      for (const p of Object.values(S.players)) { const key = estOwner(p), l = [], E = S.estate.emp && S.estate.emp[key];
        if (E && typeof empNid === 'function') { const n = S.npcs[empNid(E)]; if (n && !n.dead) l.push([n.id, Math.round(n.x * 2) / 2, Math.round(n.y * 2) / 2, E.n, E.g === 'm' ? 'empm' : 'emp']); }
        if (typeof segList === 'function') for (const r of segList(key)) { const n = S.npcs[segNid(r)]; if (n && !n.dead && !r.jail && !r.flee) l.push([n.id, Math.round(n.x * 2) / 2, Math.round(n.y * 2) / 2, (n.name || 'Segurança').split(',')[0], 'seg']); }
        if (l.length || p.l8had) { p.l8had = l.length > 0; Net.toOne(p.id, { t: 'staffmap', l }); } } } } catch (e) { }
    return r0; };
}
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peL8 = progEvent; progEvent = function (m, now) { if (m.t === 'staffmap') { G.staffMap = m.l || []; if (G.mapOpen && typeof drawWorldMap === 'function') drawWorldMap(); return true; } return _peL8(m, now); }; }
if (typeof drawWorldMap === 'function' && typeof G !== 'undefined') {
  const _dwL8 = drawWorldMap;
  drawWorldMap = function () { _dwL8.apply(this, arguments);
    try { if (!G.mapOpen || !G.me || !(G.staffMap || []).length) return; const cv = $('wm-canvas'), size = G.mapSize; if (!cv || !size) return;
      const dpr = cv.width / size, x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); const P = wmView(size).P; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const [id, sx, sy, name, k] of G.staffMap) { const e = G.npcs && G.npcs[id], wx = e && e.visible ? e.rx : sx, wy = e && e.visible ? e.ry : sy, [px, py] = P(wx, wy);
        x.save(); x.translate(px, py);
        if (k === 'emp' || k === 'empm') { x.beginPath(); x.moveTo(0, -6); x.lineTo(5, 0); x.lineTo(0, 6); x.lineTo(-5, 0); x.closePath(); x.fillStyle = '#2a8a5a'; }
        else { x.beginPath(); x.moveTo(-5, -5); x.lineTo(5, -5); x.lineTo(5, 0); x.quadraticCurveTo(5, 5, 0, 7); x.quadraticCurveTo(-5, 5, -5, 0); x.closePath(); x.fillStyle = '#4a4e5a'; }
        x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#f4e8c8'; x.stroke(); x.restore();
        x.font = '600 10px "Alegreya Sans SC", sans-serif'; x.fillStyle = k === 'seg' ? '#2a2a34' : '#1a4a2a'; x.fillText(name + (k === 'emp' ? ' (doméstica)' : k === 'empm' ? ' (doméstico)' : ' (segurança)'), px, py + 13); } } catch (e) { }
  };
}

/* ---------- 4. escolta: o segurança escalado avisa e acompanha a doméstica também nas compras e nas vendas do loot ---------- */
if (typeof empMsg === 'function' && typeof S !== 'undefined') {
  const _emL8 = empMsg;
  empMsg = function (p, m) { const r0 = _emL8.apply(this, arguments);
    try { if (m && m.a === 'order' && (m.o === 'shop' || m.o === 'sellloot')) { const key = estOwner(p), r = S.estate.emp && S.estate.emp[key];
      if (r && (r.mode === 'shop' || r.mode === 'sell') && typeof segList === 'function') { const g = segList(key).find(x => x.escort && !x.jail && !x.flee); const n = g && S.npcs[segNid(g)];
        if (n && !n.dead) { empSay(n, r.mode === 'shop' ? 'Vou com ela às compras, patrão.' : 'Vou junto nas vendas, a bolsa fica comigo de olho.'); } } } } catch (e) { }
    return r0; };
}

/* ---------- 6. casas nobres: extinção muito rara. Quando a linha principal acaba, um parente distante (primo, sobrinho ou bastardo legitimado) assume;
   a casa só fica sem herdeiro depois de 3 mortes do sangue em 12 dias (ou pelo exílio da rebelião perdida). Vale para todas as casas, no trono ou não ---------- */
const L8_KIN = [['primo distante', 'prima distante'], ['sobrinho criado no interior', 'sobrinha criada no interior'], ['bastardo legitimado', 'bastarda legitimada'], ['primo de segundo grau', 'prima de segundo grau']];
function l8Deaths(hid) { const E = S.estate; E.l8d = E.l8d || {}; return (E.l8d[hid] = (E.l8d[hid] || []).filter(d => estDay() - d <= 12)); }
function l8Death(hid) { if (!S.estate || !hid) return; l8Deaths(hid).push(estDay()); }
function l8DistantHeir(hid) {
  const h = HOUSE_BY[hid]; if (!h || h.player || typeof lnKid !== 'function' || typeof lnTakeHeir !== 'function') return false;
  const L = lnRec(); L.kids[hid] = L.kids[hid] || []; const k = lnKid(hid, 19 + Math.floor(Math.random() * 14)); L.kids[hid].push(k);
  const kin = L8_KIN[Math.floor(Math.random() * L8_KIN.length)][k.g === 'm' ? 0 : 1];
  if (!lnTakeHeir(h)) return false;
  const txt = (k.g === 'm' ? 'Sor ' : 'Lady ') + k.n + ', ' + kin + ', foi chamad' + (k.g === 'm' ? 'o' : 'a') + ' para herdar a ' + h.n + '. A casa segue viva.';
  if (typeof hNews === 'function') hNews(txt); if (typeof sys === 'function') sys('🕯 ' + txt); estateSave(); return true; }
if (typeof fhNoHeir === 'function' && typeof S !== 'undefined') {
  const _fnL8 = fhNoHeir;
  fhNoHeir = function (hid, why) { try { if (l8Deaths(hid).length < 3 && l8DistantHeir(hid)) return; } catch (e) { console.warn('herdeiro distante', e); } return _fnL8.apply(this, arguments); };
}
if (typeof trLordDead === 'function' && typeof S !== 'undefined') { const _tlL8 = trLordDead; trLordDead = function (hid, cause) { l8Death(hid); return _tlL8.apply(this, arguments); }; }
if (typeof mr2FamDead === 'function' && typeof S !== 'undefined') { const _mfL8 = mr2FamDead; mr2FamDead = function (h, role, cause) { if (h) l8Death(h.id); return _mfL8.apply(this, arguments); }; }
if (typeof rgDie === 'function' && typeof S !== 'undefined') { const _rdL8 = rgDie; rgDie = function (h, role) { if (h) l8Death(h.id); return _rdL8.apply(this, arguments); }; }
/* casas que já estavam sem herdeiro no mundo salvo: o parente distante aparece (a cada minuto confere) */
if (typeof housesTick === 'function' && typeof S !== 'undefined') {
  const _htL8 = housesTick;
  housesTick = function (now) { const r = _htL8.apply(this, arguments);
    try { if (S.estate && typeof fhRec === 'function' && now - (S.l8hT || 0) > 60000) { S.l8hT = now; const R = fhRec();
      for (const hid of Object.keys(R.noHeir || {})) { if (fhIs(hid)) continue; if (l8Deaths(hid).length < 3 && l8DistantHeir(hid)) { delete R.noHeir[hid]; estateSave(); } } } } catch (e) { }
    return r; };
}
/* mais filhos nas casas (pedido 28/11): nascem quase o dobro, até 5 por casal, 3 ficam na cidade; reino novo começa com 1 a 3 filhos por casa */
if (typeof LN !== 'undefined') Object.assign(LN, { birth: 0.055, maxKids: 5, limit: 3, startKids: [1, 3] });

/* ---------- 7. massagem: a doméstica sobe na cama e senta montada sobre o quadril de quem está de bruços, de frente para a cabeça; vale para qualquer jogador deitado numa cama da casa ---------- */
if (typeof ACTS !== 'undefined' && ACTS.massage && !ACTS.massride) {
  ACTS.massride = ACTS.massage.map(([t, q]) => [t, Object.assign({}, q, { lA: [1.3, -2.65, 0, -0.55], lB: [1.3, -2.65, 0, 0.55], tl: (q.tl || 0.45) + 0.32, ht: -0.12, aA: [q.aA[0] - 0.55, Math.max(0.02, q.aA[1] - 0.04), q.aA[2] + 0.05], aB: [q.aB[0] - 0.55, Math.max(0.02, q.aB[1] - 0.04), q.aB[2] + 0.05] })]);
  if (typeof ACT_MS !== 'undefined') ACT_MS.massride = ACT_MS.massage || 5000;
}
if (typeof empMassage === 'function' && typeof S !== 'undefined') {
  empMassage = function (n, r, p) {
    if (p.sleep == null || !S.players[p.id]) { empSay(n, 'Ué, levantou?'); return; }
    const bd = BEDS[p.sleep], H = empHome(r), len = Math.hypot(bd.dx, bd.dy) || 1, ux = bd.dx / len, uy = bd.dy / len;
    n.x = bd.x + ux * 0.16; n.y = bd.y + uy * 0.16; n.walk = false; n.legs = null; n.path = null; n.walkKey = null; n.dir = dirFromVecS(-ux, -uy);   /* sobre o quadril, olhando para a cabeça */
    const hh = (bd.apt ? (H && H.A && H.A.suite ? 0.2 : 0.07) : 0.24) + 0.13, lines = ['Relaxe os ombros…', 'Respire fundo…', 'Deixe o peso ir embora…', 'Só mais um pouquinho…', 'Aqui está bem tenso…'];
    near(n.x, n.y, { t: 'massage', pid: p.id, mid: n.id, on: 1, ms: 20000, h: hh }); const say1 = 1 + Math.floor(Math.random() * 2);
    for (let k = 0; k < 4; k++) setTimeout(() => { if (p.sleep == null || !S.npcs[n.id] || !n.task) return; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'massride', ms: 5000, tx: bd.x - ux, ty: bd.y - uy }); if (k === say1) empSay(n, lines[Math.floor(Math.random() * lines.length)]); }, k * 5000);
    n.task = { until: now_() + 20000, done: () => { near(n.x, n.y, { t: 'massage', pid: p.id, mid: n.id, on: 0 }); const off = [bd.x - uy * 0.9, bd.y + ux * 0.9]; if (WORLD.bld[tileAt(off[0], off[1])] === WORLD.bld[tileAt(bd.x, bd.y)]) { n.x = off[0]; n.y = off[1]; }   /* desce da cama pelo lado */
      if (p.sleep == null || !S.players[p.id]) { empSay(n, 'Levantou antes do fim!'); return; }
      p.hp = p.maxHp; p.cst = cstMaxOf(p); if (p.bleed) for (const k in p.bleed) p.bleed[k] = 0; if (p.body) for (const k in p.body) p.body[k] = Math.max(p.body[k], 100); const t = now_(); p.buffs.warm = Math.max(p.buffs.warm || 0, t + 600000); p.buffs.rested = Math.max(p.buffs.rested || 0, t + 900000);
      sendStat(p); tell(p, r.n + ' terminou a massagem: vida e fôlego cheios, membros recuperados, aquecido e bem descansado.'); empSay(n, 'Pronto. Como novo.'); } };
  };
}
if (typeof empMsg === 'function' && typeof S !== 'undefined') {   /* massagem para outro jogador deitado numa cama da casa */
  const _emM8 = empMsg;
  empMsg = function (p, m) {
    try { if (m && m.a === 'order' && m.o === 'massage' && p.sleep == null) { const key = estOwner(p), r = S.estate.emp && S.estate.emp[key], n = r && S.npcs[empNid(r)], H = r && empHome(r);
      if (r && n && H) { const T = Object.values(S.players).find(q => q.sleep != null && BEDS[q.sleep] && BEDS[q.sleep].bi === H.bi && (!H.A || BEDS[q.sleep].apt === H.A.key) && (q.fl || 0) === (H.fl || 0));
        if (T) { r.mode = 'home'; r.massage = 0; const bd = BEDS[T.sleep], vl = Math.hypot(H.x - bd.x, H.y - bd.y) || 1; n.goal = Object.assign(empTgt(H, bd.x + (H.x - bd.x) / vl * 1.2, bd.y + (H.y - bd.y) / vl * 1.2), { act: () => empMassage(n, r, T) });
          empSay(n, 'Vou cuidar de ' + T.name + '.'); if (T !== p) tell(T, r.n + ' vem fazer uma massagem em você.'); estateSave(); empSend(r, key); return; } } } } catch (e) { console.warn('massagem', e); }
    return _emM8.apply(this, arguments); };
}
/* ajoelhada (seiza, massagem, montada): a saia/manto encurta e se abre sobre as coxas em vez de atravessar a cama ou quem está deitado */
if (typeof applyPose === 'function' && typeof THREE !== 'undefined') {
  const _apL8 = applyPose;
  applyPose = function (R, Q, P, walkPh) { const r = _apL8.apply(this, arguments);
    try { if (R && R.robe && Q && Q.tuck > 0.5 && !(P && (P.sit || P.med))) { const rw = R.robeW || 1, S0 = R.robeS || 1, spread = Q.lA && Q.lA[3] ? 1.45 : 1.25; R.robe.scale.set(rw * spread, 0.34, 0.82 * rw * 1.35); R.robe.rotation.x = -0.25; R.robe.position.z = 0.04 * S0;
      if (R.hem) { R.hem.position.y = -0.04 * S0 - 0.82 * S0 * 0.34; R.hem.position.z = 0.1 * S0; R.hem.scale.set(rw * spread, 0.82 * rw * 1.35, 1); } } } catch (e) { }
    return r; };
}

/* ---------- 8. mimar a doméstica: carinho de 0 a 100 (presentes, folga, aumento, elogios e conversa, passeio); com 60 ou mais, a roda de afeto funciona com ela ---------- */
if (typeof LOOT !== 'undefined') Object.assign(LOOT, {
  buque: { name: 'Buquê de flores', price: 18, icon: '💐', color: '#e87aa8', desc: 'Flores do campo amarradas com fita. Um presente para alguém querido.' },
  doces: { name: 'Caixa de doces', price: 22, icon: '🍬', color: '#e8a050', desc: 'Bombons de mel e frutas cristalizadas da padaria. Um presente para alguém querido.' },
  vestido: { name: 'Vestido de seda', price: 90, icon: '👗', color: '#b05ac8', desc: 'Seda tingida da Alfaiataria, com bordado na barra. Um presente para alguém querido.' },
  colar: { name: 'Colar de prata', price: 140, icon: '📿', color: '#c8d0e0', desc: 'Corrente de prata com uma pedra polida. Um presente para alguém querido.' } });
if (typeof TRADE !== 'undefined') { const add = (k, o) => { if (TRADE[k]) Object.assign(TRADE[k].sell, o); }; add('fruit', { buque: 8 }); add('st_bakery', { doces: 6 }); add('st_tailor', { vestido: 3 }); add('st_arcane', { colar: 2 }); }
const L8_GIFT = { buque: 6, doces: 5, vestido: 14, colar: 18, pie: 3, tea: 2, firemead: 3, amulet_luck: 10, gem: 8, berries: 1, apple: 1 };
const L8_GIFT_LINES = { buque: ['Flores! Para mim? Que lindas...', 'Vou pôr num vaso na cozinha.'], doces: ['Hmm, doces! Vou guardar um para depois.', 'Você sabe me agradar.'], vestido: ['Um vestido de seda?! Eu... não sei o que dizer.', 'Vou usar no meu dia de folga.'], colar: ['Prata de verdade... é lindo demais.', 'Nunca ganhei nada assim.'] };
const L8_STROLL = ['tavern', 'baths', 'club', 'velvet'];
function l8Car(r) { if (r.car == null) r.car = 10; return r.car; }
function l8Sx(r, m, f) { return r.g === 'm' ? m : f; }
function l8CarAdd(r, v, n, key) { const before = l8Car(r); r.car = Math.max(0, Math.min(100, before + v));
  if (before < 60 && r.car >= 60) { const q = empOwnerP(key); if (q) tell(q, '💞 ' + r.n + ' gosta muito de você agora: a roda de afeto (💞) funciona com ' + l8Sx(r, 'ele', 'ela') + '.'); if (n) empSay(n, 'Sabe... gosto muito de trabalhar para você.'); }
  estateSave(); empSend(r, key); }
if (typeof empMsg === 'function' && typeof S !== 'undefined') {
  const _emC8 = empMsg;
  empMsg = function (p, m) {
    if (!m || m.a !== 'mimo') return _emC8.apply(this, arguments);
    const key = estOwner(p), r = S.estate && S.estate.emp && S.estate.emp[key], n = r && S.npcs[empNid(r)]; if (!r || !n) return;
    const day = estDay(), close = (p.fl || 0) === (n.fl || 0) && dist(p.x, p.y, n.x, n.y) <= 3, ela = l8Sx(r, 'ele', 'ela'), oa = l8Sx(r, 'o', 'a'); l8Car(r);
    if (m.o === 'endstroll') { if (r.stroll) { r.stroll = null; n.goal = empTgt(empHome(r)); empSay(n, 'Foi um passeio ótimo. Vou para casa.'); empSend(r, key); } return; }
    if (!close) { tell(p, 'Chegue perto de ' + r.n + '.'); return; }
    r.mimo = r.mimo || {}; if (r.mimo.d !== day) r.mimo = { d: day, gift: 0, gk: {}, talk: {} };
    if (m.o === 'gift') { const k = String(m.k); if (!L8_GIFT[k] || !(p.inv[k] > 0)) return; p.inv[k]--; if (!p.inv[k]) delete p.inv[k]; sendStat(p);
      let v = L8_GIFT[k] * (r.mimo.gk[k] ? 0.4 : 1); v = Math.max(1, Math.round(Math.min(v, 30 - r.mimo.gift))); r.mimo.gift += v; r.mimo.gk[k] = 1;
      const L = L8_GIFT_LINES[k]; empSay(n, L ? L[Math.floor(Math.random() * L.length)] : 'Obrigad' + oa + ', que gentil!'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'adore', ms: 2600 });
      tell(p, 'Você deu ' + tName(k).toLowerCase() + ' a ' + r.n + '. Carinho +' + v + '.'); l8CarAdd(r, v, n, key); return; }
    if (m.o === 'off') { if (r.off === day) { tell(p, r.n + ' já está de folga hoje.'); return; } const v = day - (r.offLast == null ? -99 : r.offLast) >= 4 ? 8 : 3; r.off = day; r.offLast = day; n.goal = null; n.task = null;
      empSay(n, 'Folga? Obrigad' + oa + '! Vou descansar um pouco hoje.'); tell(p, r.n + ' está de folga até amanhã (não faz as tarefas da casa). Carinho +' + v + '.'); l8CarAdd(r, v, n, key); return; }
    if (m.o === 'raise') { const add = Math.max(2, Math.round((r.w | 0) * 0.15)), v = day - (r.raiseLast == null ? -99 : r.raiseLast) >= 6 ? 10 : 2; r.w = (r.w | 0) + add; r.raiseLast = day;
      empSay(n, 'Um aumento? Que generosidade!'); tell(p, 'O salário de ' + r.n + ' subiu ' + add + ' (agora ' + r.w + ' por dia). Carinho +' + v + '.'); l8CarAdd(r, v, n, key); return; }
    if (m.o === 'talk') { const s = ['food', 'thanks', 'chat'].includes(m.s) ? m.s : 'chat';
      const T = { food: ['Que bom que gostou da comida!', 'Fiz com carinho.'], thanks: ['Não precisa agradecer, é o meu trabalho.', 'Fico feliz em ajudar.'], chat: ['Hoje vi um gato enorme no mercado...', 'Minha mãe fazia um pão igual ao da padaria.', 'Gosto quando a casa fica quieta à noite.'] }[s];
      empSay(n, T[Math.floor(Math.random() * T.length)]); if (r.mimo.talk[s]) { tell(p, 'Vocês conversam um pouco (o carinho por isso já subiu hoje).'); return; } r.mimo.talk[s] = 1; tell(p, 'Carinho +2.'); l8CarAdd(r, 2, n, key); return; }
    if (m.o === 'stroll') { if (r.mode === 'shop' || r.mode === 'sell' || n.forage) { tell(p, r.n + ' está ocupad' + oa + ' na rua agora.'); return; }
      r.stroll = { by: p.id, t0: now_(), acc: 0, done: r.strollD === day }; n.goal = null; n.task = null; empSay(n, 'Passear com você? Vamos!');
      tell(p, r.n + ' vai com você. Leve ' + ela + ' à taverna, às Termas, ao Clube ou à Casa de Veludo e fiquem um pouco juntos lá dentro.'); empSend(r, key); return; }
  };
}
if (typeof empNpcTick === 'function' && typeof S !== 'undefined') {
  const _entC8 = empNpcTick;
  empNpcTick = function (n, now, dt) { const r = S.estate && S.estate.emp && S.estate.emp[n.emp];
    if (r && r.stroll) { const q = S.players[r.stroll.by];
      if (!q || now - r.stroll.t0 > 1800000) { r.stroll = null; n.goal = empTgt(empHome(r)); empSay(n, 'Vou voltando para casa.'); empSend(r, n.emp); return _entC8.apply(this, arguments); }
      const d = (q.fl || 0) === (n.fl || 0) ? dist(n.x, n.y, q.x, q.y) : 99; if (d > 1.6) empGo(n, { x: q.x - 0.7, y: q.y + 0.5, fl: q.fl || 0, fb: q.fl ? q.fb : -1 }, d > 5 ? 2.2 : 1.5, dt); else { n.walk = false; n.dir = dirFromVecS(q.x - n.x, q.y - n.y); }
      const bi = WORLD.bld[tileAt(q.x, q.y)], b = bi >= 0 ? BUILDINGS[bi] : null;
      if (b && L8_STROLL.includes(b.kind) && WORLD.bld[tileAt(n.x, n.y)] === bi && !r.stroll.done) { r.stroll.acc += dt;
        if (r.stroll.acc >= 90) { r.stroll.done = true; r.strollD = estDay(); empSay(n, ['Que lugar bonito... obrigado por me trazer.', 'Fazia tempo que eu não me divertia assim.', 'Podíamos vir mais vezes.'][Math.floor(Math.random() * 3)]); tell(q, 'O passeio com ' + r.n + ' foi um sucesso. Carinho +12.'); l8CarAdd(r, 12, n, n.emp); } }
      return; }
    if (r && r.off === estDay() && r.mode === 'home' && !r.meal && !r.massage && !n.task) { const H = empHome(r); if (H) { if ((n.fl || 0) !== (H.fl || 0) || dist(n.x, n.y, H.x, H.y) > 0.6) empGo(n, empTgt(H), 1.2, dt); else n.walk = false; } return; }   /* de folga: descansa em casa */
    return _entC8.apply(this, arguments); };
}
if (typeof empSend === 'function' && typeof S !== 'undefined') { const _esC8 = empSend; empSend = function (r, key) { const o = _esC8.apply(this, arguments); try { const q = empOwnerP(key); if (q) Net.toOne(q.id, { t: 'empcar', car: Math.round(l8Car(r)), off: r.off === estDay() ? 1 : 0, stroll: r.stroll ? 1 : 0, g: r.g }); } catch (e) { } return o; }; }
/* roda de afeto com a doméstica querida */
if (typeof affNpcKind === 'function' && typeof S !== 'undefined') { const _akC8 = affNpcKind; affNpcKind = function (p, n) { const k = _akC8.apply(this, arguments); if (k) return k; try { if (n && !n.dead && !n.downed && n.emp && n.emp === estOwner(p)) { const r = S.estate.emp && S.estate.emp[n.emp]; if (r && l8Car(r) >= 60) return 'emp'; } } catch (e) { } return null; }; }
if (typeof affNpcAsk === 'function' && typeof S !== 'undefined') { const _aaC8 = affNpcAsk; affNpcAsk = function (p, n, k) { if (affNpcKind(p, n) !== 'emp') return _aaC8.apply(this, arguments);
  const r = S.estate.emp[n.emp], c = l8Car(r), ch = c >= 85 ? 1 : c >= 70 ? 0.85 : 0.65;
  if (Math.random() >= ch) { empSay(n, ['Agora não... alguém pode ver.', 'Estou no meio do serviço.', 'Mais tarde, talvez.'][Math.floor(Math.random() * 3)]); tell(p, r.n + ' recusou desta vez.'); return; }
  if (r.affD !== estDay()) { r.affD = estDay(); r.car = Math.min(100, c + 2); estateSave(); } empSay(n, ['Vem cá...', 'Achei que você nunca ia pedir.', 'Só um pouquinho, então.'][Math.floor(Math.random() * 3)]); affStart(p, n, k); }; }
/* cliente: seção "Mimar" no menu de ordens */
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peC8 = progEvent; progEvent = function (m, now) { if (m.t === 'empcar') { G.empCar = m; return true; } return _peC8(m, now); }; }
if (typeof empMenu === 'function' && typeof G !== 'undefined') { const _emnC8 = empMenu; empMenu = function () { _emnC8(); try {
  const d = document.getElementById('empmenu'), L = d && d.querySelector('.lift-list'); if (!L || L.querySelector('[data-mimo]')) return; const C = G.empCar || { car: 10 }, ela = C.g === 'm' ? 'ele' : 'ela', Ela = C.g === 'm' ? 'Ele' : 'Ela';
  const btn = (ic, t, sub, f) => { const b = document.createElement('button'); b.className = 'lift-btn'; b.dataset.mimo = 1; b.innerHTML = '<span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span>'; b.onclick = f; L.appendChild(b); };
  const hd = document.createElement('div'); hd.dataset.mimo = 1; hd.style.cssText = 'padding:8px 6px 2px;font:700 14px Cinzel,serif;color:#e8a0b8';
  hd.textContent = '💗 Mimar · carinho ' + C.car + '/100' + (C.car >= 60 ? ' · 💞 afeto liberado' : ' · com 60, a roda de afeto funciona com ' + ela) + (C.off ? ' · de folga hoje' : ''); L.appendChild(hd);
  const send = (o, x) => { d.remove(); Net.send(Object.assign({ t: 'emp', a: 'mimo', o }, x || {})); };
  btn('🎁', 'Dar um presente', 'Flores, doces, vestido ou colar (à venda na fruteira, na padaria, na Alfaiataria e na loja arcana).', () => { const gifts = Object.keys(L8_GIFT).filter(k => (G.me.inv || {})[k] > 0); d.remove(); const box = document.createElement('div'); box.className = 'aff-box'; box.id = 'l8gift';
    box.innerHTML = '<div class="aff-h">🎁 Presente</div>' + (gifts.length ? '<div class="aff-row">' + gifts.map(k => '<button type="button" data-k="' + k + '">' + (LOOT[k].icon || '') + ' ' + LOOT[k].name + ' <small>(' + G.me.inv[k] + ')</small></button>').join('') + '</div>' : '<div class="aff-ft">Você não tem nada que sirva de presente. Compre flores na fruteira, doces na padaria, um vestido na Alfaiataria ou um colar na loja arcana.</div>') + '<div class="aff-row"><button type="button" data-x>Fechar</button></div>';
    box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { box.remove(); Net.send({ t: 'emp', a: 'mimo', o: 'gift', k: b.dataset.k }); }); box.querySelector('[data-x]').onclick = () => box.remove(); document.body.appendChild(box); });
  btn('🌴', 'Dar folga hoje', 'Não faz as tarefas até amanhã e descansa em casa.', () => send('off'));
  btn('💰', 'Dar aumento', 'Salário 15% maior (pelo menos +2 por dia).', () => send('raise'));
  btn('🍲', 'Elogiar a comida', 'Uma vez por dia.', () => send('talk', { s: 'food' }));
  btn('🙏', 'Agradecer o trabalho', 'Uma vez por dia.', () => send('talk', { s: 'thanks' }));
  btn('☕', 'Conversar um pouco', 'Uma vez por dia.', () => send('talk', { s: 'chat' }));
  if (C.stroll) btn('🏠', 'Encerrar o passeio', Ela + ' volta para casa.', () => send('endstroll'));
  else btn('🚶', 'Levar para passear', 'Vem com você: na taverna, nas Termas, no Clube ou na Casa de Veludo, depois de um tempo juntos o carinho sobe (uma vez por dia).', () => send('stroll'));
} catch (e) { console.warn('mimar', e); } }; }
