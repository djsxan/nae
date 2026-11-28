// ============================================================
//  CASA DE VELUDO, lista 13 (27/11)
//  · Térreo escuro como um salão de noite, a qualquer hora: quem ilumina são as lanternas dos reservados, o palco e o balcão.
// ============================================================
const VL11 = { dark: 0.78, room: 0.14 };
/* dentro do térreo do Veludo o dia vira noite (só no desenho) */
function vlDayFix(day) { try { const me = G.me; if (!me || (me.fl || 0) || !day) return day; const bi = WORLD.bld[tileAt(me.x, me.y)], b = BUILDINGS[bi]; if (!b || b.deco !== 'velvet') return day;
  if (day.dark >= VL11.dark) return day; return Object.assign({}, day, { dark: VL11.dark, night: true }); } catch (e) { return day; } }
if (typeof LUZ_ROOM !== 'undefined' && LUZ_ROOM.velvet) LUZ_ROOM.velvet = [VL11.room, '200,60,110'];   /* a luz geral do salão fica fraca e avermelhada */
if (typeof LUZ_T !== 'undefined') Object.assign(LUZ_T, { vbooth: 2.6, vbar: 3.4, vstage: 4.6, vtable: 2.6, vding: 1.8 });   /* as lanternas alcançam um pouco mais */
VL11.src = 0.75;
if (typeof luzInside === 'function') { const _liV11 = luzInside; luzInside = function (b, ox, oy, day) { const n0 = (G.lights || []).length, r = _liV11.apply(this, arguments);
  try { if (b && b.deco === 'velvet' && !((G.me && G.me.fl) || 0)) for (let i = n0; i < G.lights.length; i++) { const L = G.lights[i]; L._vl11 = 1; if (L.room) continue; L.a = (L.a == null ? 1 : L.a) * VL11.src; } } catch (e) { }   /* as lanternas são muitas: cada uma ilumina menos, a cor fica */
  return r; }; }
/* dentro do salão: só as luzes de dentro (os postes, as janelas e a fachada iluminada apareciam por cima do salão e estouravam tudo em branco) */
function vl11In() { const me = G.me; if (!me || (me.fl || 0)) return false; const b = BUILDINGS[WORLD.bld[tileAt(me.x, me.y)]]; return !!(b && b.deco === 'velvet'); }
if (typeof luzMapDraw === 'function') { const _lmV11 = luzMapDraw; luzMapDraw = function (ctx, vw, vh, day, now) { if (!vl11In()) return _lmV11.apply(this, arguments);
  G.lights = (G.lights || []).filter(L => L._vl11); const vb = velB; velB = () => null; try { return _lmV11.apply(this, arguments); } finally { velB = vb; } }; }
// ============================================================
//  · Quem recebeu um "virar" longo (a Mirela nas boas-vindas) fica virado para a pessoa até acabar, mesmo com outros gestos.
//  · Os botões da mesa (bandeja, lap dance, mesa, copinho) ficam no anel de dentro da roda de emojis.
//  · Copinho: com a bandeja na mesa, a Jade vem, serve o seu copo da garrafa e você bebe pela roda (três goles por copo).
// ============================================================
Object.assign(VL11, { pourMs: 4500, sips: 3, sipMs: 3600 });
// ---------------- SERVIDOR ----------------
function vl11Seat(p) { const s = p && p.sit && typeof vl4BoothSeat === 'function' ? vl4BoothSeat(p) : null; if (!s) return null; const mine = typeof vlBoothMine === 'function' ? vlBoothMine(p, s.vb) : vlBooths().own[s.vb] === estOwner(p); return mine ? s : null; }
function vl11CupAt(s) { const b = velB('velvet'), T = VL10.tab[s.vb]; if (!b || !T) return [s.x, s.y]; const [tx, ty] = localToWorld(b, T[0], T[1]); return [s.x + (tx - s.x) * 0.55, s.y + (ty - s.y) * 0.55]; }
function vl11Tray(p) { return S.vlTray && S.vlTray[p.id] && now_() < S.vlTray[p.id].until; }
function vl11CupSend(p, n) { const s = vl11Seat(p), at = s ? vl11CupAt(s) : [p.x, p.y]; near(p.x, p.y, { t: 'vl11cup', pid: p.id, n, cx: at[0], cy: at[1] }); }
if (typeof velMsg === 'function' && typeof S !== 'undefined') { const _vmV11 = velMsg; velMsg = function (p, m) {
  if (m && m.a === 'cup11') { const s = vl11Seat(p), j = S.npcs.vl_jade; if (!s || !vl11Tray(p)) { tell(p, 'O copinho vem da bandeja: peça uma bandeja sentado no seu reservado.'); return; } if ((p.vl11Cup || 0) > 0) { tell(p, 'Seu copo ainda tem vinho: 🥂 Beber, na roda de emojis.'); return; }
    if (!j) { tell(p, 'A Jade não está no salão agora.'); return; } if (S.vl11Pour || S.vlTrayRun || (S.vl5 && S.vl5.vl_jade && S.vl5.vl_jade.a === 'order8')) { tell(p, 'A Jade está atendendo. Já, já ela vem servir.'); return; }
    const pt = typeof vl10Beside === 'function' ? vl10Beside(s, s.vb) : null, b = velB('velvet'); if (S.vl5) delete S.vl5.vl_jade; S.vl5JadeT = now_() + 60000; const pts0 = pt && vl5Path(j, pt[0], pt[1]), pts = pts0 ? pts0.concat([localToWorld(b, pt[0], pt[1])]) : [[p.x + 0.6, p.y + 0.3]];
    S.vl11Pour = { pid: p.id, ph: 'go', pts, i: 0, t: now_(), home: [j.x, j.y], cup: vl11CupAt(s) }; empSay(j, ['Um copinho saindo!', 'Deixa que eu sirvo, querido.', 'Vinho da casa, para você.'][Math.floor(Math.random() * 3)]); return; }
  if (m && m.a === 'sip11') { if (!p.sit || !((p.vl11Cup || 0) > 0)) return; if (now_() - (p._vl11S || 0) < VL11.sipMs) return; p._vl11S = now_(); p.vl11Cup--; near(p.x, p.y, { t: 'vl11sip', pid: p.id, ms: VL11.sipMs }); vl11CupSend(p, p.vl11Cup);
    if (!p.vl11Cup) tell(p, '🍷 O copo acabou. Peça outro à Jade pela roda de emojis.'); Net.toOne(p.id, { t: 'vl11st', tray: vl11Tray(p) ? 1 : 0, cup: p.vl11Cup }); return; }
  return _vmV11.apply(this, arguments); }; }
/* a Jade não é puxada de volta para o balcão enquanto serve */
if (typeof vlPost === 'function' && typeof S !== 'undefined') { const _vpV11 = vlPost; vlPost = function (T) { if (T && T.id === 'vl_jade' && S.vl11Pour && S.npcs && S.npcs.vl_jade) { const n = S.npcs.vl_jade; return { at: vl4Loc(n.x, n.y), fl: 0, sit: 0, dir: n.dir || 0 }; } return _vpV11(T); }; }
function vl11Tick(now) { const P = S.vl11Pour, j = S.npcs.vl_jade; if (P) { const p = S.players[P.pid]; if (!p || !j || !vl11Seat(p)) { S.vl11Pour = null; if (j) j.walking = false; }
    else { const dt = Math.min(0.5, (now - P.t) / 1000); P.t = now; S.vl5JadeT = Math.max(S.vl5JadeT || 0, now + 20000);
      if (P.ph === 'go' || P.ph === 'back') { P.i = vl5Move(j, P.pts, P.i, dt, 1.4); if (P.i >= P.pts.length) { if (P.ph === 'go') { P.ph = 'pour'; P.t0 = now; j.walking = false; j.walk = false; near(j.x, j.y, { t: 'vl11pour', id: j.id, cx: P.cup[0], cy: P.cup[1], ms: VL11.pourMs }); near(j.x, j.y, { t: 'anim', w: 'n', id: j.id, a: 'face', tx: P.cup[0], ty: P.cup[1], ms: VL11.pourMs }); }
        else { S.vl11Pour = null; j.walking = false; j.walk = false; } } }
      else if (P.ph === 'pour' && now - P.t0 >= VL11.pourMs) { p.vl11Cup = VL11.sips; vl11CupSend(p, p.vl11Cup); Net.toOne(p.id, { t: 'vl11st', tray: 1, cup: p.vl11Cup }); tell(p, '🍷 A Jade serviu o seu copo. 🥂 Beber, na roda de emojis (três goles).'); empSay(j, 'Saúde, querido.'); P.ph = 'back'; P.pts = P.pts.slice().reverse().concat([P.home]); P.i = 0; } } }
  for (const p of Object.values(S.players)) { const s = vl11Seat(p), tr = !!(s && vl11Tray(p)); if (!tr && p.vl11Cup) { p.vl11Cup = 0; vl11CupSend(p, 0); } const k = (tr ? 1 : 0) + ':' + (p.vl11Cup || 0); if (k !== p._vl11k) { p._vl11k = k; Net.toOne(p.id, { t: 'vl11st', tray: tr ? 1 : 0, cup: p.vl11Cup || 0 }); } } }
if (typeof affTick === 'function' && typeof S !== 'undefined') { const _atV11 = affTick; affTick = function (now) { _atV11(now); try { if (now - (S.vl11T || 0) > 200) { S.vl11T = now; vl11Tick(now); } } catch (e) { console.warn('veludo11', e); } }; }

// ---------------- CLIENTE ----------------
/* trava de direção: um "virar" longo vale até acabar */
if (typeof updateNpcMotion === 'function' && typeof G !== 'undefined') { const _umV11 = updateNpcMotion; updateNpcMotion = function (now, dt) { _umV11.apply(this, arguments); const t = performance.now();
  for (const id in G.npcs) { const e = G.npcs[id], A = e.anim; if (A && A.a === 'face' && A.tx != null && (A.ms || 0) > 1000 && (!e._lk || e._lk.t0 !== A.t0)) e._lk = { tx: A.tx, ty: A.ty, until: A.t0 + A.ms, t0: A.t0, s: t }; if (e._lk) { if (t > e._lk.until || (e.walking && t - (e._lk.s || 0) > 1800)) e._lk = null; else if (!e.walking) e.dir = dirFromVec(e._lk.tx - e.rx, e._lk.ty - e.ry, e.dir); } } }; }
/* botões da mesa → anel de dentro da roda */
if (typeof document !== 'undefined' && typeof G !== 'undefined') { const st = document.createElement('style'); st.textContent = 'button.vl-tray{display:none !important}'; document.head.appendChild(st); }
if (typeof emoteList === 'function' && typeof G !== 'undefined') { const _elV11 = emoteList; emoteList = function () { const L = _elV11.apply(this, arguments); if (typeof document === 'undefined') return L; const extra = [];
  for (const b of document.querySelectorAll('button.vl-tray[id]')) { const t = (b.textContent || '').trim(), sp = t.indexOf(' '), k = 'vlb:' + b.id; if (!EW_INNER.includes(k)) EW_INNER.push(k); extra.push({ k, i: sp > 0 ? t.slice(0, sp) : '•', n: sp > 0 ? t.slice(sp + 1) : t }); }
  return extra.length ? L.concat(extra) : L; }; }
if (typeof closeEmoteWheel === 'function' && typeof G !== 'undefined') { const _ceV11 = closeEmoteWheel; closeEmoteWheel = function (fire) { const wl = G.wheel; if (fire && wl && wl.sel >= 0) { const it = emoteList()[wl.sel]; if (it && /^vlb:/.test(it.k)) { _ceV11.call(this, false); const b = document.getElementById(it.k.slice(4)); if (b) b.click(); return; } } return _ceV11.apply(this, arguments); }; }
/* estado do copinho (só para você) e o botão escondido que a roda usa */
function vl11Btn(on, txt, fn) { let b = document.getElementById('vl11-cup'); if (!on) { if (b) b.remove(); return; } if (!b) { b = document.createElement('button'); b.id = 'vl11-cup'; b.className = 'vl-tray'; document.body.appendChild(b); } b.textContent = txt; b.onclick = fn; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV11 = progEvent; progEvent = function (m, now) {
  if (m.t === 'vl11st') { if (!m.tray) vl11Btn(false); else if (m.cup > 0) vl11Btn(true, '🥂 Beber um gole (' + m.cup + ')', () => Net.send({ t: 'vel', a: 'sip11' })); else vl11Btn(true, '🍷 Pedir um copinho à Jade', () => Net.send({ t: 'vel', a: 'cup11' })); return true; }
  if (m.t === 'vl11cup') { G.vl11Cups = G.vl11Cups || {}; if (m.n > 0) G.vl11Cups[m.pid] = { n: m.n, cx: m.cx, cy: m.cy }; else delete G.vl11Cups[m.pid]; return true; }
  if (m.t === 'vl11sip') { G.vl11Sip = G.vl11Sip || {}; G.vl11Sip[m.pid] = { t0: performance.now(), ms: m.ms || 3600 }; return true; }
  if (m.t === 'vl11pour') { G.vl11Pour = { id: m.id, cx: m.cx, cy: m.cy, t0: performance.now(), ms: m.ms || 4500 }; return true; }
  return _peV11(m, now); }; }
const VL11_SPR = new Map();
function vl11Bottle(R) { if (!R._v11b) { const g = new THREE.Group(), gm = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.25, metalness: 0.1 }), lb = new THREE.MeshStandardMaterial({ color: 0xe8d8b0, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), gm); body.position.y = 0.08; g.add(body); const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.06, 12), lb); lab.position.y = 0.08; g.add(lab);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.09, 10), gm); neck.position.y = 0.205; g.add(neck); const mo = new THREE.Object3D(); mo.position.y = 0.25; g.add(mo); g.userData.mo = mo; R.B.hand.add(g); R._v11b = g; } R._v11b.visible = true; return R._v11b; }
const vl11Pr = v => { const t = v.clone().project(R3.cam); return [(t.x + 1) / 2 * FRAME_W, (1 - t.y) / 2 * FRAME_H]; };
const vl11TableY = () => VL10.trayH * (typeof CAMA !== 'undefined' ? CAMA.hk : 0.57) * (typeof camaYM === 'function' ? camaYM() : 1.8);
/* a Jade servindo: em pé, a garrafa inclinada sobre o copo */
function vl11PourSprite(e, P, now) { const u = Math.min(1, (now - P.t0) / P.ms), f = u < 0.15 ? 0 : u < 0.25 ? 1 : u < 0.8 ? 2 : u < 0.9 ? 1 : 0, dir = dirFromVec(P.cx - e.rx, P.cy - e.ry, e.dir | 0), key = 'p|' + e.id + '|' + f + '|' + dir + '|' + Math.round((P.cx - e.rx) * 10) + ',' + Math.round((P.cy - e.ry) * 10);
  let s = VL11_SPR.get(key); if (s) return s; const r = affRigOf('J', e, 'pour11', false), R = r.R, V = (x, y, z) => new THREE.Vector3(x, y, z); affPose(R, e, { dir }); affPut(R, dir, 0, 0);
  const tp = affW2M(P.cx - e.rx, P.cy - e.ry), cup = V(tp.x, vl11TableY() + 0.04, tp.z), to = cup.clone().setY(0).normalize();
  const hand = cup.clone().add(V(0, f === 2 ? 0.2 : 0.28, 0)).sub(to.clone().multiplyScalar(f === 2 ? 0.07 : 0.16)); R.spine.rotation.x = f === 2 ? 0.25 : 0.12; R.root.updateMatrixWorld(true); ikArm(R, 'B', hand, [1.0, -0.3, 0, 0.8]); ikArm(R, 'A', affWP(R.hips, 0.12, 0.08, 0.06), [0.3, -0.3, 0, 1.2]);
  const bt = vl11Bottle(R); bt.rotation.set(f === 2 ? 2.1 : f === 1 ? 1.2 : 0.3, 0, 0); R.root.updateMatrixWorld(true); const mo = bt.userData.mo.getWorldPosition(V(0, 0, 0)); lookAtP(R, cup, 0);
  s = camaRender([R]); bt.visible = false; s.mouth = vl11Pr(mo); s.pour = f === 2; VL11_SPR.set(key, s); if (VL11_SPR.size > 60) VL11_SPR.delete(VL11_SPR.keys().next().value); return s; }
/* você bebendo: pega o copo da mesa, leva à boca, um gole e devolve */
function vl11SipSprite(e, Sp, C, now) { const u = Math.min(0.999, (now - Sp.t0) / Sp.ms), f = Math.floor(u * 8), dir = e.dir | 0, key = 's|' + (e.cls + e.skin + e.color) + '|' + f + '|' + dir + '|' + (C ? Math.round((C.cx - e.rx) * 10) + ',' + Math.round((C.cy - e.ry) * 10) : '');
  let s = VL11_SPR.get(key); if (s) return s; const r = affRigOf('D', e, 'sip11', false), R = r.R, V = (x, y, z) => new THREE.Vector3(x, y, z); affPose(R, e, { sit: 'c', dir }); affPut(R, dir, 0, 0);
  const ch = R.chest.getWorldPosition(V(0, 0, 0)), fw = affWP(R.chest, 0, 0, 1).sub(ch).normalize(), mouth = affMouth(R).add(fw.clone().multiplyScalar(0.06)).add(V(0, -0.03, 0));
  const tp = C ? affW2M(C.cx - e.rx, C.cy - e.ry) : { x: fw.x * 0.35, z: fw.z * 0.35 }, cup = V(tp.x, vl11TableY() + 0.03, tp.z), path = [cup, cup.clone().lerp(mouth, 0.5), mouth, mouth, mouth, cup.clone().lerp(mouth, 0.5), cup, cup];
  const nr = affNear2(R, R.A.sh, R.B.sh, cup) ? 'A' : 'B'; ikArm(R, nr, path[f], [1.0, -0.3, 0, 1.4]); vl10Cup(R, nr); if (f >= 2 && f <= 4) { if (R.neckJ) R.neckJ.rotation.x -= 0.2; R.head.rotation.x -= 0.12; } R.root.updateMatrixWorld(true);
  s = camaRender([R]); if (R._v10cup) R._v10cup.visible = false; VL11_SPR.set(key, s); if (VL11_SPR.size > 60) VL11_SPR.delete(VL11_SPR.keys().next().value); return s; }
function vl11Glass(ctx, x, y, k) { ctx.save(); ctx.fillStyle = 'rgba(232,226,210,0.9)'; ctx.beginPath(); ctx.moveTo(x - 1.2, y - 4); ctx.lineTo(x + 1.2, y - 4); ctx.lineTo(x + 0.9, y - 0.8); ctx.lineTo(x - 0.9, y - 0.8); ctx.closePath(); ctx.fill(); if (k > 0) { ctx.fillStyle = '#7a1424'; ctx.fillRect(x - 0.95, y - 0.8 - 2.4 * k, 1.9, 2.4 * k); } ctx.restore(); }
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhV11 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) { const t = performance.now();
  if (e && e.isNpc && G.vl11Pour && G.vl11Pour.id === e.id && t - G.vl11Pour.t0 < G.vl11Pour.ms && !e.walking && R3.ok) { const P = G.vl11Pour, s = vl11PourSprite(e, P, t); if (s) { ctx.imageSmoothingEnabled = true; softDab(ctx, sx, sy, 10, '#000000', 0.3); pblit(ctx, s, sx, sy); e._spr = s; e._sx = sx; e._sy = sy; e._drawT = now;
      if (s.pour) { const ax = sx - s.ax + s.mouth[0], ay = sy - s.ay + s.mouth[1], q0 = iso(P.cx, P.cy), q1 = iso(e.rx, e.ry), lift = VL10.trayH * HV * (typeof CAMA !== 'undefined' ? CAMA.hk : 0.57), bx = sx + q0.sx - q1.sx, by = sy + q0.sy - q1.sy - lift - 3; ctx.save(); ctx.strokeStyle = 'rgba(140,20,40,0.85)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ax + (bx - ax) * 0.2, ay + (by - ay) * 0.1, bx, by); ctx.stroke(); ctx.restore(); }   /* o fio de vinho até o copo */
      return; } }
  if (e && !e.isNpc && G.vl11Sip && G.vl11Sip[e.id] && t - G.vl11Sip[e.id].t0 < G.vl11Sip[e.id].ms && e.sit && R3.ok && !e.aff) { const s = vl11SipSprite(e, G.vl11Sip[e.id], G.vl11Cups && G.vl11Cups[e.id], t); if (s) { ctx.imageSmoothingEnabled = true; softDab(ctx, sx, sy, 10, '#000000', 0.35); pblit(ctx, s, sx, sy); e._spr = s; e._sx = sx; e._sy = sy; e._drawT = now; return; } }
  return _dhV11.apply(this, arguments); }; }
/* o copo de cada um em cima da mesa (e o que a Jade está enchendo) */
if (typeof drawVlTrays === 'function' && typeof G !== 'undefined') { const _dvV11 = drawVlTrays; drawVlTrays = function (ctx, b, now) { _dvV11.apply(this, arguments); if (!b || b.deco !== 'velvet' || (G.me && (G.me.fl || 0))) return; const t = performance.now(), lift = VL10.trayH * HV * (typeof CAMA !== 'undefined' ? CAMA.hk : 0.57);
  for (const pid in G.vl11Cups || {}) { const C = G.vl11Cups[pid], Sp = G.vl11Sip && G.vl11Sip[pid]; if (Sp && t - Sp.t0 < Sp.ms) continue; const q = iso(C.cx, C.cy); vl11Glass(ctx, q.sx + G.view.ox, q.sy + G.view.oy - lift, Math.min(3, C.n) / 3); }
  const P = G.vl11Pour; if (P && t - P.t0 < P.ms) { const q = iso(P.cx, P.cy); vl11Glass(ctx, q.sx + G.view.ox, q.sy + G.view.oy - lift, Math.max(0, Math.min(1, ((t - P.t0) / P.ms - 0.25) / 0.55))); } }; }
