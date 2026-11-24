// ============================================================
//  PORTAL DE CHEGADA (lista 4, item 5)
//  quem entra no jogo sem casa sai de um anel de faíscas que se abre no meio da feira, em frente à Taverna
//  (um círculo de runas fica gravado nas pedras); quem tem casa acorda na própria cama;
//  numa queda rápida (reconexão), o personagem volta para onde estava
// ============================================================
let _ptSpot = null;
function portalSpot() { if (_ptSpot) return _ptSpot; if (typeof BUILDINGS === 'undefined') return null; const bi = BUILDINGS.findIndex(b => b.kind === 'tavern'), b = BUILDINGS[bi]; if (!b || typeof doorOutPt !== 'function') return null;
  const [dx, dy] = doorOutPt(bi), v = DOOR_V[b.door || 'S'];
  for (let d = 3.5; d <= 7; d += 0.5) for (const s of [0, 1, -1, 2, -2]) { const x = Math.round(dx + v[0] * d + (v[0] ? 0 : s)), y = Math.round(dy + v[1] * d + (v[1] ? 0 : s)); if (walkableTile(x, y, 0) && WORLD.bld[y * MAP_W + x] < 0 && walkableTile(x + 1, y, 0) && walkableTile(x, y + 1, 0)) return (_ptSpot = { x, y }); }
  return (_ptSpot = { x: Math.round(dx + v[0] * 4), y: Math.round(dy + v[1] * 4) }); }
function ptFront(P0) { for (const d of [1.3, 1.0, 0.7]) { const x = P0.x + d, y = P0.y + d; if (walkableTile(Math.round(x), Math.round(y), 0)) return { x, y }; } return { x: P0.x, y: P0.y }; }   /* em frente = na direção da câmera */
/* casa com cama: alugada ou comprada (casa, casarão ou apartamento) */
function ptHomeBed(np) { if (typeof recsOf !== 'function') return null; for (const pid of recsOf(np)) { const P = PROPS_BY[pid]; if (!P || P.kind !== 'house') continue; if (!P.apt && typeof tenantsOf === 'function' && tenantsOf(P).length) continue;
    const k = BEDS.findIndex(b => b.bi === P.bi && (P.apt ? b.apt === P.apt : !b.apt && !(b.fl || 0))); if (k >= 0) return { k, b: BEDS[k], P }; } return null; }
if (typeof estateJoin === 'function') { const _ejP = estateJoin; estateJoin = function (np) { const keep = np.hadPos ? { x: np.x, y: np.y, z: np.z, fl: np.fl, fb: np.fb } : null; const r = _ejP(np);
  if (keep) { Object.assign(np, keep); return r; }   /* queda rápida: volta para onde estava */
  if (np.jailUntil > now_() || np.cell != null) return r;
  const H = ptHomeBed(np);
  if (H) { np.x = H.b.x; np.y = H.b.y; np.z = 0; np.fl = H.b.fl || 0; np.fb = np.fl ? H.P.bi : -1; setTimeout(() => { if (S.players[np.id]) Net.toOne(np.id, { t: 'wakebed', k: H.k }); }, 1500); return r; }   /* acorda na própria cama */
  if (typeof hotelRoomOf === 'function' && hotelRoomOf(np) >= 0) return r;   /* cabine da pousada: como antes */
  const P0 = portalSpot(); if (!P0) return r; const Fr = ptFront(P0); np.x = Fr.x; np.y = Fr.y; np.z = 0; np.fl = 0; np.fb = -1;   /* para em frente ao portal */
  setTimeout(() => { if (S.players[np.id]) near(P0.x, P0.y, { t: 'portal', x: P0.x, y: P0.y, id: np.id }, VIEW_RADIUS + 10); }, 1300); return r; }; }

// ---------- lado do jogador: o anel de faíscas, as runas no chão e o acordar na cama ----------
if (typeof G !== 'undefined') G.portals = [];
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peP2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'portal') { G.portals.push({ x: m.x, y: m.y, t0: performance.now(), id: m.id }); if (m.id === G.myId && G.me) G.ptWalk = { t0: performance.now(), x0: m.x, y0: m.y, x1: G.me.x, y1: G.me.y }; return true; }
  if (m.t === 'wakebed') { try { if (typeof lieDown === 'function') { lieDown(m.k); setTimeout(() => { if (G.me && G.me.sleep && typeof getUp === 'function') getUp(); }, 2600); } } catch (e) { } return true; }
  return _peP2(m, now); }; }
const PT_MS = { open: 900, walk0: 1100, walk1: 2300, hold: 2800, close: 3500 };
/* o personagem começa dentro do anel, sai andando e para em frente ao portal */
if (typeof updateLocal === 'function') { const _ulPT = updateLocal; updateLocal = function (now, dt) { const W = G.ptWalk, me = G.me; if (W && me) { const t = performance.now() - W.t0;
    if (t < PT_MS.walk0) { me.x = me.rx = W.x0; me.y = me.ry = W.y0; me.walking = false; me.dir = dirFromVec(W.x1 - W.x0, W.y1 - W.y0, me.dir); return; }
    if (t < PT_MS.walk1) { const k = (t - PT_MS.walk0) / (PT_MS.walk1 - PT_MS.walk0); me.x = me.rx = W.x0 + (W.x1 - W.x0) * k; me.y = me.ry = W.y0 + (W.y1 - W.y0) * k; me.walking = true; me.dir = dirFromVec(W.x1 - W.x0, W.y1 - W.y0, me.dir); return; }
    me.x = me.rx = W.x1; me.y = me.ry = W.y1; me.walking = false; G.ptWalk = null; } return _ulPT(now, dt); }; }
/* a dimensão paralela: o Nae espectral — cidade e castelo feitos de luz azul translúcida, com névoa e brilho */
function ptUniverse(ctx, cx, cy, R, A, now) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.95, 0, 7); ctx.clip(); ctx.globalAlpha = A;
  const g = ctx.createLinearGradient(cx, cy - R, cx, cy + R); g.addColorStop(0, '#040a1e'); g.addColorStop(0.55, '#0a2442'); g.addColorStop(1, '#0e3a52'); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.fillStyle = 'rgba(200,235,255,.9)'; for (let i = 0; i < 40; i++) { const a = i * 2.39996, rr = R * Math.sqrt((i * 0.61803) % 1); ctx.globalAlpha = A * (0.3 + 0.5 * Math.abs(Math.sin(now / 500 + i))); const y = cy + Math.sin(a) * rr * 0.9; if (y < cy) ctx.fillRect(cx + Math.cos(a) * rr, y, 0.9, 0.9); } ctx.globalAlpha = A;
  const base = cy + R * 0.42, glow = (c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(); };
  /* o castelo espectral ao fundo, com torres e ameias */
  const cw = R * 0.9, ch = R * 0.62, x0 = cx - cw / 2, top = base - ch; ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x0, top + ch * 0.35);
  const towers = [[0, 0.95], [0.18, 0.62], [0.38, 1.25], [0.5, 1.45], [0.62, 1.25], [0.82, 0.62], [1, 0.95]];
  for (const [u, hh] of towers) { const tx = x0 + u * cw, ty = base - ch * hh; ctx.lineTo(tx - cw * 0.05, top + ch * 0.35); ctx.lineTo(tx - cw * 0.05, ty); ctx.lineTo(tx - cw * 0.025, ty - ch * 0.08); ctx.lineTo(tx, ty - ch * 0.22); ctx.lineTo(tx + cw * 0.025, ty - ch * 0.08); ctx.lineTo(tx + cw * 0.05, ty); ctx.lineTo(tx + cw * 0.05, top + ch * 0.35); }
  ctx.lineTo(x0 + cw, base); ctx.closePath(); ctx.fillStyle = 'rgba(90,190,255,.18)'; ctx.fill(); glow('rgba(150,225,255,.85)', 1.1);
  for (let i = 0; i < 9; i++) { const wx = x0 + cw * (0.12 + i * 0.095), wy = base - ch * (0.35 + (i % 3) * 0.14); ctx.fillStyle = 'rgba(190,240,255,' + (0.5 + 0.5 * Math.sin(now / 400 + i)) + ')'; ctx.fillRect(wx, wy, 1.4, 2.2); }
  /* casas espectrais na frente */
  for (let i = 0; i < 6; i++) { const hw = R * 0.26, hx = cx - R * 0.95 + i * R * 0.36, hh = R * (0.18 + (i % 2) * 0.08), hy = base + R * 0.08; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy - hh); ctx.lineTo(hx + hw / 2, hy - hh - R * 0.12); ctx.lineTo(hx + hw, hy - hh); ctx.lineTo(hx + hw, hy); ctx.closePath(); ctx.fillStyle = 'rgba(70,170,240,.22)'; ctx.fill(); glow('rgba(140,220,255,.7)', 0.9); }
  /* névoa ondulando e luzes subindo */
  for (let i = 0; i < 3; i++) { const my = base + R * (0.12 + i * 0.12), mg = ctx.createLinearGradient(cx - R, my, cx + R, my); mg.addColorStop(0, 'rgba(160,220,255,0)'); mg.addColorStop(0.5, 'rgba(160,220,255,' + (0.22 - i * 0.05) + ')'); mg.addColorStop(1, 'rgba(160,220,255,0)'); ctx.fillStyle = mg; ctx.beginPath(); for (let x = -R; x <= R; x += 4) { const y = my + Math.sin(x / 11 + now / 900 + i * 2) * 3; x === -R ? ctx.moveTo(cx + x, y) : ctx.lineTo(cx + x, y); } ctx.lineTo(cx + R, cy + R); ctx.lineTo(cx - R, cy + R); ctx.closePath(); ctx.fill(); }
  ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 24; i++) { const life = ((now / 2600 + i * 0.137) % 1), x = cx - R * 0.8 + ((i * 0.61803) % 1) * R * 1.6 + Math.sin(now / 600 + i) * 2, y = base + R * 0.3 - life * R * 1.1; ctx.fillStyle = 'rgba(160,230,255,' + (1 - life) * 0.8 + ')'; ctx.fillRect(x, y, 1.2, 1.2); }
  ctx.restore(); }
const PT_RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
function ptGround(ctx, sx, sy, glow, now) { ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.5); const a = 0.18 + glow * 0.5;
  ctx.strokeStyle = 'rgba(232,190,110,' + a + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.stroke(); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, 0, 27, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(240,200,120,' + (a + 0.08) + ')'; ctx.font = '7px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 + now / 9000 * glow; ctx.save(); ctx.translate(Math.cos(an) * 30.5, Math.sin(an) * 30.5); ctx.rotate(an + Math.PI / 2); ctx.fillText(PT_RUNES[i], 0, 0); ctx.restore(); }
  if (glow > 0) { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 36); g.addColorStop(0, 'rgba(255,170,60,' + glow * 0.35 + ')'); g.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 36, 0, 7); ctx.fill(); }
  ctx.restore(); }
function ptRing(ctx, sx, sy, t, now, hole) {   /* t em ms desde a abertura; hole = retângulo do personagem saindo (fica à frente do anel) */
  const R0 = 48, k = t < PT_MS.open ? 1 - Math.pow(1 - t / PT_MS.open, 3) : t < PT_MS.hold ? 1 : Math.max(0, 1 - (t - PT_MS.hold) / (PT_MS.close - PT_MS.hold)), R = R0 * k; if (R < 0.5) return;
  const cx = sx, cy = sy - R0 - 2; ctx.save(); if (hole) { ctx.beginPath(); ctx.rect(cx - 400, cy - 400, 800, 800); ctx.ellipse(hole[0] + hole[2] / 2, hole[1] + hole[3] / 2, hole[2] / 2, hole[3] / 2, 0, 0, 7); ctx.clip('evenodd'); }   /* o anel encosta no chão; o personagem que saiu fica à frente */
  /* o outro lado: céu escuro de outra dimensão, que clareia para o personagem aparecer */
  const inA = t < PT_MS.walk0 ? 0.92 : t < PT_MS.walk1 ? 0.92 - (t - PT_MS.walk0) / (PT_MS.walk1 - PT_MS.walk0) * 0.62 : 0.3; ptUniverse(ctx, cx, cy, R, inA, now);   /* o outro universo clareia enquanto o personagem sai */
  ctx.globalCompositeOperation = 'lighter';
  /* o anel: faíscas laranja-douradas girando */
  for (let i = 0; i < 180; i++) { const a = i / 180 * Math.PI * 2 + now / 260 + (i % 3) * 0.07, w = 1 + Math.sin(i * 7.3 + now / 70) * 0.06, x = cx + Math.cos(a) * R * w, y = cy + Math.sin(a) * R * w, hot = (i * 13) % 5 === 0;
    ctx.fillStyle = hot ? 'rgba(255,240,190,0.95)' : 'rgba(255,' + (150 + (i * 37) % 70) + ',40,0.85)'; ctx.fillRect(x - 0.7, y - 0.7, hot ? 1.8 : 1.3, hot ? 1.8 : 1.3); }
  /* faíscas que escapam pela tangente e caem */
  for (let i = 0; i < 80; i++) { const a0 = i * 2.39996 + Math.floor(now / 900 + i) * 0.9, life = ((now / 600 + i * 0.37) % 1), a = a0 + now / 260, x0 = cx + Math.cos(a) * R, y0 = cy + Math.sin(a) * R, tx = -Math.sin(a), ty = Math.cos(a), d = life * 24 * k;
    ctx.fillStyle = 'rgba(255,' + (170 + (i * 29) % 70) + ',60,' + (1 - life) * 0.9 + ')'; ctx.fillRect(x0 + tx * d, y0 + ty * d + life * life * 18, 1.3, 1.3); }
  ctx.globalCompositeOperation = 'source-over';
  /* runas do Nae girando ao redor do anel */
  ctx.fillStyle = 'rgba(255,214,140,' + 0.75 * k + ')'; ctx.font = '9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 - now / 1400; ctx.save(); ctx.translate(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8)); ctx.rotate(a + Math.PI / 2); ctx.fillText(PT_RUNES[(i * 5) % 12], 0, 0); ctx.restore(); }
  ctx.restore(); }
if (typeof G !== 'undefined' && typeof addEventListener === 'function') addEventListener('load', () => { if (typeof drawJobsOverlay !== 'function') return; const _djPT = drawJobsOverlay; drawJobsOverlay = function (ctx, now) { try {
    const me = G.me, P0 = portalSpot(); if (me && P0 && !(me.fl || 0) && Math.hypot(P0.x - me.x, P0.y - me.y) < 26) { const ox = G.view.ox, oy = G.view.oy, pn = performance.now(); G.portals = (G.portals || []).filter(q => q.fz != null || pn - q.t0 < PT_MS.close + 200);   /* fz: instante congelado (fotos) */
      const act = G.portals.find(q => Math.hypot(q.x - P0.x, q.y - P0.y) < 2), t = act ? (act.fz != null ? act.fz : pn - act.t0) : -1, glow = act ? (t < PT_MS.hold ? Math.min(1, t / 400) : Math.max(0, 1 - (t - PT_MS.hold) / 900)) : 0;
      const p = iso(P0.x, P0.y); ptGround(ctx, p.sx + ox, p.sy + oy, glow, pn); for (const q of G.portals) { const pq = iso(q.x, q.y), tq = q.fz != null ? q.fz : pn - q.t0, e = q.id === G.myId ? G.me : (G.players && G.players[q.id]); let hole = null; if (e && tq >= PT_MS.walk0 + 300) { const pe = iso(e.rx != null ? e.rx : e.x, e.ry != null ? e.ry : e.y); hole = [pe.sx + ox - 12, pe.sy + oy - 52, 24, 56]; } ptRing(ctx, pq.sx + ox, pq.sy + oy, tq, pn, hole); } }
  } catch (e) { } return _djPT(ctx, now); }; });
