// ============================================================
//  CASA DE VELUDO, lista 12 (27/11)
//  · Moças (e todo NPC) sentam viradas como o assento manda (o jogo virava pela última passada).
//  · A Mirela, nas boas-vindas, vem para o lado de quem está no reservado.
//  · A bandeja da Jade aparece em cima da mesa do reservado.
//  · Com a bandeja na mesa, as moças sentadas bebem com calma: copo na mão, um gole, e de vez em quando se servem.
//  · O botão de ataque automático em pessoas some enquanto você está sentado, deitado ou num gesto de afeto.
// ============================================================
const VL10 = { tab: [[1, 4], [1, 6], [12, 6], [12, 8], [3, 10], [10, 10]], trayH: 0.42, drinkMs: 4000, cyc: 750 };

// ---------------- SERVIDOR ----------------
/* bandeja: no centro da mesa do reservado */
if (typeof velMsg === 'function' && typeof S !== 'undefined') { const _vmV10 = velMsg; velMsg = function (p, m) { const r = _vmV10.apply(this, arguments);
  try { if (m && m.a === 'tray' && S.vlTrayRun && S.vlTrayRun.who === p.id && !S.vlTrayRun._v10) { const s = vl4BoothSeat(p), b = velB('velvet'), T = s && VL10.tab[s.vb]; if (T && b) { S.vlTrayRun.at = localToWorld(b, T[0], T[1]); S.vlTrayRun._v10 = 1; S.vlTrayRun.c = s.vb; } } } catch (e) { }
  return r; }; }
/* boas-vindas: a Mirela para ao lado de quem está sentado no reservado */
function vl10Beside(seat, c) { const b = velB('velvet'), F = VL5_BFRONT[c], T = VL10.tab[c]; if (!b || !F || !T) return null; const [su, sv] = worldToLocal(b, seat.x, seat.y), fu = F[0] - T[0], fv = F[1] - T[1], fl = Math.hypot(fu, fv) || 1, nu = fu / fl, nv = fv / fl;
  const fd = { 1: [1, 0], 3: [0, -1], 5: [-1, 0], 7: [0, 1] }[seat.dir] || [nu, nv], back = fd[0] * nu + fd[1] * nv > 0.7;   /* sofá do fundo (virado para a frente do reservado) ou sofá lateral */
  if (back) { const lu = su - T[0], lv = sv - T[1], side = (lu * -nv + lv * nu) >= 0 ? 1 : -1; return [su + nu * 0.72 + -nv * side * 0.1, sv + nv * 0.72 + nu * side * 0.1]; }
  return [su + nu * 0.8, sv + nv * 0.8]; }
if (typeof vl5ServeNext === 'function' && typeof S !== 'undefined') { const _vsV10 = vl5ServeNext; vl5ServeNext = function (n, T, now, kind) { const L = _vsV10.apply(this, arguments);
  try { if (L && kind === 'mirela') { const T0 = vl5Tables().find(x => x.c === L.c), w = T0 && T0.who; if (w && w.x != null) { const s = vl4BoothSeat(w), pt = s && vl10Beside(s, L.c), pts = pt && vl5Path(n, pt[0], pt[1]); if (pts) { L.pts = pts.concat([localToWorld(velB('velvet'), pt[0], pt[1])]); L.i = 0; L.who = w.id; } } } } catch (e) { }
  return L; }; }
/* com a bandeja na mesa: as moças do reservado bebem (o cliente anima) */
function vl10DrinkTick(now) { if (!S.vlTray) return; for (const pid in S.vlTray) { const tr = S.vlTray[pid], p = S.players[pid]; if (!p || now > tr.until) continue; const R = S.vlTrayRun, at = tr.at10; if (!at) continue;
  const ids = Object.keys(S.vlTable || {}).filter(g => { const T = S.vlTable[g], n = S.npcs[g]; return T.who === pid && n && n.sitting && !(p.aff && p.aff.w === g) && !(T.dance && now < T.dance); });
  if (ids.length) near(at[0], at[1], { t: 'vldrink', ids, x: at[0], y: at[1], ms: VL10.drinkMs + 1500 }); } }
if (typeof affTick === 'function' && typeof S !== 'undefined') { const _atV10 = affTick; affTick = function (now) { _atV10(now);
  try { const R = S.vlTrayRun; if (R && R._v10 && S.vlTray && S.vlTray[R.who] && !S.vlTray[R.who].at10) S.vlTray[R.who].at10 = R.at;
    { const L = S.vl5 && S.vl5.vl_mirela, n = S.npcs.vl_mirela, w = L && L.who && S.players[L.who]; if (L && n && w && L.ph === 'do' && !L._v10f) { L._v10f = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'face', tx: w.x, ty: w.y, ms: 6500 }); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'bow', tx: w.x, ty: w.y, ms: 1200 }); } }   /* a Mirela olha para quem está recebendo */
    if (now - (S.vl10T || 0) > VL10.drinkMs) { S.vl10T = now; vl10DrinkTick(now); } } catch (e) { console.warn('veludo10', e); } }; }

// ---------------- CLIENTE ----------------
/* quem senta vira como o assento manda */
if (typeof applyNpcRows === 'function' && typeof G !== 'undefined') { const _anV10 = applyNpcRows; applyNpcRows = function (rows, now) { _anV10.apply(this, arguments);
  for (const r of rows || []) { const e = G.npcs[r[0]]; if (!e || !e.custP || !e.custP.sit) { if (e) e._v10s = null; continue; } const k = r[1] + ',' + r[2]; if (e._v10s && e._v10s.k === k) { e.dir = e._v10s.d; continue; }
    const x = r[1] / 100, y = r[2] / 100, fl = e.fl || 0; let best = null, bd = 0.16; for (const s of WORLD.seats) { if ((s.fl || 0) !== fl) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
    e._v10s = { k, d: best ? best.dir : e.dir }; if (best) e.dir = best.dir; } }; }
/* a bandeja em cima da mesa (na Casa de Veludo) */
function vl10TrayPaint(ctx, x, y, al) { ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 1.5, 9, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c9c4b8'; ctx.beginPath(); ctx.ellipse(x, y, 8.5, 3.8, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 0.6; ctx.stroke();
  for (const [bx, c] of [[-4.6, '#3a5a2a'], [-1.8, '#7a3a2a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + bx, y - 0.5); ctx.lineTo(x + bx - 0.6, y - 6.5); ctx.lineTo(x + bx + 0.6, y - 8.5); ctx.lineTo(x + bx + 2.2, y - 8.5); ctx.lineTo(x + bx + 3.2, y - 6.5); ctx.lineTo(x + bx + 2.6, y - 0.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#2a140c'; ctx.fillRect(x + bx + 0.6, y - 10.2, 1.6, 1.8); }   /* duas garrafas */
  for (const cx2 of [2.2, 4.6, 6.2]) { ctx.fillStyle = 'rgba(230,224,208,0.9)'; ctx.beginPath(); ctx.moveTo(x + cx2 - 1.1, y - 3.6); ctx.lineTo(x + cx2 + 1.1, y - 3.6); ctx.lineTo(x + cx2 + 0.8, y - 0.8); ctx.lineTo(x + cx2 - 0.8, y - 0.8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#7a1424'; ctx.fillRect(x + cx2 - 0.8, y - 2.4, 1.6, 1.4); }   /* copinhos */
  ctx.fillStyle = '#6a3a82'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - 1 + i * 1.2, y + 2.2 - (i % 2) * 0.8, 0.9, 0, 7); ctx.fill(); } ctx.restore(); }
function drawVlTrays(ctx, b, now) { if (!b || b.deco !== 'velvet' || (G.me && (G.me.fl || 0))) return; const now0 = performance.now(), lift = VL10.trayH * HV * (typeof CAMA !== 'undefined' ? CAMA.hk : 0.57);
  for (const t of G.thTrays || []) { const left = t.until - now0; if (left <= 0) continue; if (!(t.x >= b.x - 0.5 && t.x < b.x + b.w - 0.5 && t.y >= b.y - 0.5 && t.y < b.y + b.h - 0.5)) continue; const al = Math.min(1, (now0 - t.t0) / 300) * Math.min(1, left / 800), q = iso(t.x, t.y);
    vl10TrayPaint(ctx, q.sx + G.view.ox, q.sy + G.view.oy - lift, al); } }
/* moças bebendo */
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV10 = progEvent; progEvent = function (m, now) { if (m.t === 'vldrink') { G.vlDrink = G.vlDrink || {}; const until = performance.now() + (m.ms || 5000); for (const id of m.ids || []) G.vlDrink[id] = { x: m.x, y: m.y, until }; return true; } return _peV10(m, now); }; }
const VL10_SPR = new Map();
function vl10Cup(R, arm) { if (!R._v10cup) { const g = new THREE.Group(), gl = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }), wine = new THREE.MeshStandardMaterial({ color: 0x7a1424, roughness: 0.3 });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.07, 10), gl); bowl.position.y = 0.035; g.add(bowl); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.04, 10), wine); w.position.y = 0.03; g.add(w); R._v10cup = g; }
  if (R._v10cupArm !== arm) { R[arm].hand.add(R._v10cup); R._v10cupArm = arm; } R._v10cup.visible = true; return R._v10cup; }
/* um ciclo de 12 quadros: copo no colo, leva à boca, um gole, desce; de vez em quando se serve da bandeja */
function vl10DrinkSprite(e, D, now) { const id = String(e.id), h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0), f = (Math.floor(now / VL10.cyc) + h) % 12, serve = ((Math.floor((now / VL10.cyc + h) / 12)) % 3) === 1, dir = e.dir | 0;
  const key = id + '|' + f + '|' + (serve ? 1 : 0) + '|' + dir + '|' + Math.round((D.x - e.rx) * 10) + ',' + Math.round((D.y - e.ry) * 10); let s = VL10_SPR.get(key); if (s) return s; if (R3.budget != null && R3.budget <= 0) return null; if (R3.budget != null) R3.budget--;
  const r = affRigOf('D', e, 'vldrink', false), R = r.R, V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)); affPose(R, e, { sit: 'c', dir }); affPut(R, dir, 0, 0);
  const hd = W(R.head), ch = W(R.chest), fw = affWP(R.chest, 0, 0, 1).sub(ch).normalize(), rt = affWP(R.chest, 1, 0, 0).sub(ch).normalize(), mouth = affMouth(R), lap = W(R.hips).add(fw.clone().multiplyScalar(0.2)).add(V(0, 0.06, 0)), arm = 'B', other = 'A';
  const tp = affW2M(D.x - e.rx, D.y - e.ry), tray = V(tp.x, VL10.trayH * (typeof CAMA !== 'undefined' ? CAMA.hk : 0.57) * (typeof camaYM === 'function' ? camaYM() : 1.8) + 0.05, tp.z);
  let hand, lift = 0; const rest = lap.clone().add(rt.clone().multiplyScalar(0.06)).add(V(0, 0.08, 0)), sip = mouth.clone().add(fw.clone().multiplyScalar(0.06)).add(V(0, -0.03, 0));
  if (serve && f >= 8) { hand = f <= 10 ? rest.clone().lerp(tray, f === 9 ? 0.95 : 0.6) : rest; } else if (f >= 4 && f <= 6) { hand = f === 5 ? sip : rest.clone().lerp(sip, 0.6); lift = f === 5 ? 1 : 0.4; } else if (f === 7) hand = rest.clone().lerp(sip, 0.3); else hand = rest;
  ikArm(R, arm, hand, [0.9, -0.3, 0, 1.6]); vl10Cup(R, arm); ikArm(R, other, lap.clone().add(rt.clone().multiplyScalar(-0.08)), [0.5, -0.2, 0, 1.0]);
  if (R.neckJ) R.neckJ.rotation.x -= 0.18 * lift; R.head.rotation.x -= 0.12 * lift; R.root.updateMatrixWorld(true);
  s = typeof camaRender === 'function' ? camaRender([R]) : null; if (R._v10cup) R._v10cup.visible = false; if (s) { VL10_SPR.set(key, s); if (VL10_SPR.size > 80) VL10_SPR.delete(VL10_SPR.keys().next().value); } return s; }
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhV10 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) {
  const D = e && e.isNpc && G.vlDrink && G.vlDrink[e.id]; if (D && D.until > performance.now() && e.custP && e.custP.sit && !e.walking && R3.ok && !(G._affHide && G._affHide.has(e.id))) { const s = vl10DrinkSprite(e, D, performance.now()); if (s) { ctx.imageSmoothingEnabled = true; softDab(ctx, sx, sy, 10, '#000000', 0.3); pblit(ctx, s, sx, sy); e._spr = s; e._sx = sx; e._sy = sy; e._drawT = now; return; } }
  return _dhV10.apply(this, arguments); }; }
/* o botão de ataque automático em pessoas some sentado, deitado ou num gesto */
if (typeof document !== 'undefined' && typeof setInterval === 'function' && typeof G !== 'undefined') setInterval(() => { try { const b = document.getElementById('pplbtn'); if (!b || !G.me) return; const busy = !!(G.me.sit || G.me.sleep || G.me.aff || G.me.bathing); b.style.display = busy ? 'none' : ''; } catch (e) { } }, 400);
if (typeof updateNpcMotion === 'function' && typeof G !== 'undefined') { const _umV10 = updateNpcMotion; updateNpcMotion = function (now, dt) { _umV10.apply(this, arguments); for (const id in G.npcs) { const e = G.npcs[id]; if (e._v10s && e.custP && e.custP.sit) e.dir = e._v10s.d; } }; }
