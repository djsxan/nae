/* ============================================================
   CASA DE VELUDO 9 (v1.173.0)
   1. Convite: a moça que você chamou senta direto com você (sem pedir taça antes).
   2. Reserva: o reservado é seu até você sair da casa (não acaba à meia-noite).
   3. Banquinhos perto do palco: sentado neles, ✋ chama a Jade para pedir vinho ou chá.
   4. Clientes a pé: os clientes dos reservados, os mercadores e os artistas do show vêm de casa pelas ruas
      e voltam para casa no fim (ninguém mais aparece ou some do nada).
   5. Pista: durante o show, clientes levantam da mesa para dançar perto do palco (ou em volta de quem dança).
   6. Mais movimento: passantes entram, vão ao balcão, dançam e vão embora.
   7. Comprar a casa: com a Dama Ysolde; ela passa a trabalhar para você, sua parte do que entra na casa
      fica guardada com ela e tudo lá dentro é por conta da casa para você.
   ============================================================ */
const VL9 = { price: 12000, share: 0.4, npcPay: 3, grace: 60000, walkSpd: 1.15, inSpd: 1.2, maxWalk: 240000, passN: 4, floorMax: 3 };
const VL9_PASS_KINDS = ['v_trav1', 'v_trav2', 'v_trav3', 'dealer', 'butler', 'v_segm'];
const VL9_FLOOR = [[5.2, 6.9], [6.5, 7.2], [7.8, 6.9], [4.6, 6.1], [8.4, 6.1], [6.0, 7.9], [7.0, 7.9]];
const VL9_SHOWIDS = /^vl_(d[12]|m[123])$/, VL9_WALKIDS = /^vl_(g\d|mc|w\d|d[12]|m[123])/;

/* ---------------- SERVIDOR ---------------- */
function vl9InBld(q) { const b = typeof velB === 'function' ? velB('velvet') : null; if (!b || !q) return false; return q.x >= b.x - 0.5 && q.x < b.x + b.w - 0.5 && q.y >= b.y - 0.5 && q.y < b.y + b.h - 0.5; }

/* 1. convite: quem foi chamada senta direto (a taça da chegada é por conta dela) */
if (typeof vl5OfferFor === 'function' && typeof S !== 'undefined') { const _of9 = vl5OfferFor; vl5OfferFor = function (g, now) { const r = _of9.apply(this, arguments); if (r && r.called) { S.vl9Called = S.vl9Called || {}; S.vl9Called[g] = r.p.id; } return r; }; }
if (typeof vl5GirlDo === 'function' && typeof S !== 'undefined') { const _gd9 = vl5GirlDo; vl5GirlDo = function (n, L, now) { const call = L && L.a === 'offer' && S.vl9Called && S.vl9Called[n.id] === L.pid; if (call) S._vl9Mute = n.id; let r; try { r = _gd9.apply(this, arguments); } finally { S._vl9Mute = null; }
  try { if (L && L.a === 'offer' && r === 'keep' && S.vl9Called && S.vl9Called[n.id] === L.pid && S.vlOffer && S.vlOffer[n.id] && S.vlOffer[n.id].who === L.pid) { delete S.vl9Called[n.id]; const p = S.players[L.pid];
    if (p) { p.gold = (p.gold || 0) + VL4.drink; S._vl9Mute = n.id; try { velMsg(p, { a: 'drink', id: n.id, ok: 1 }); } finally { S._vl9Mute = null; } Net.toOne(p.id, { t: 'vloffer', off: 1 }); empSay(n, ['Obrigada pelo convite, querido.', 'Você chamou, eu vim.', 'Guardou um lugar para mim?'][Math.floor(Math.random() * 3)]); } } } catch (e) { console.warn('convite', e); }
  return r; }; }

if (typeof empSay === 'function' && typeof S !== 'undefined') { const _es9 = empSay; empSay = function (n) { if (n && S._vl9Mute && n.id === S._vl9Mute) return; return _es9.apply(this, arguments); }; }   /* a convidada não pede a taça */
/* 2. reserva até sair da casa */
if (typeof vlBooths === 'function' && typeof S !== 'undefined') { const _vb9 = vlBooths; vlBooths = function () { const R = velRec(), d = estDay();
  if (R.booth && R.booth.d !== d) { const keep = {}; for (const c in R.booth.own) { const k = R.booth.own[c]; if (Object.values(S.players).some(q => estOwner(q) === k && vl9InBld(q))) keep[c] = k; } const B = _vb9(); Object.assign(B.own, keep); return B; }
  return _vb9(); }; }
function vl9BoothTick(now) { const B = vlBooths(); S.vl9Seen = S.vl9Seen || {};
  for (const c in B.own) { const k = B.own[c], p = Object.values(S.players).find(q => estOwner(q) === k); const key = c + '|' + k;
    if (p && vl9InBld(p)) { S.vl9Seen[key] = now; continue; } if (!S.vl9Seen[key]) { S.vl9Seen[key] = now; continue; }
    if (now - S.vl9Seen[key] > VL9.grace) { delete B.own[c]; delete S.vl9Seen[key]; if (typeof estateSave === 'function') estateSave(); if (p) tell(p, 'Você saiu da Casa de Veludo: o reservado ' + ((VL2.booths[c] || {}).n || '') + ' foi liberado.'); } } }
if (typeof velMsg === 'function' && typeof S !== 'undefined') { const _vmB9 = velMsg; velMsg = function (p, m) { const had = m && m.a === 'booth' ? vlMine(p) : null; const r = _vmB9.apply(this, arguments); if (m && m.a === 'booth' && had == null && vlMine(p) != null) tell(p, 'O reservado é seu até você sair da casa.'); return r; }; }

/* 3. banquinhos perto do palco: ✋ chama a Jade para anotar (vinho ou chá) */
function vl9Stool(p) { if (!p.sit || (p.fl || 0) || !vlInside(p)) return null; const bi = vlBi(); return WORLD.seats.find(s => s.bi === bi && s.vb == null && !(s.fl || 0) && Math.abs(s.x - p.x) < 0.3 && Math.abs(s.y - p.y) < 0.3) || null; }
if (typeof vl8Call === 'function' && typeof S !== 'undefined') { const _vc9 = vl8Call; vl8Call = function (p, now) { const st = vl9Stool(p); if (!st) return _vc9.apply(this, arguments);
  if (now - (p.vl8CallT || 0) < 8000) return; p.vl8CallT = now; const J = S.npcs.vl_jade, TJ = VEL_STAFF.find(t => t.id === 'vl_jade'); if (!J || !TJ) return;
  const L0 = S.vl5 && S.vl5.vl_jade; if (S.vlTrayRun || (L0 && L0.a === 'order8')) { tell(p, 'A Jade está ocupada com outro pedido; já, já ela vem. Levante a mão de novo daqui a pouco.'); return; }
  const b = velB('velvet'), [u, v] = worldToLocal(b, st.x, st.y); let pts = null; for (const [du, dv] of [[0, -0.65], [0, 0.65], [0.65, 0], [-0.65, 0]]) { pts = vl5Path(J, u + du, v + dv); if (pts) break; } if (!pts) return;
  S.vl5.vl_jade = { id: 'vl_jade', a: 'order8', pid: p.id, c: -1, stool: 1, asked: 1, ph: 'go', t: now, pts, i: 0, dur: 25000, home: TJ.at }; empSay(J, 'Já vou aí!'); }; }
if (typeof velTick === 'function' && typeof S !== 'undefined') { const _vtS9 = velTick; velTick = function (now) { const r = _vtS9.apply(this, arguments);
  try { const L = S.vl5 && S.vl5.vl_jade; if (L && L.stool && L.a === 'order8' && L.ph === 'do' && !L.stoolAsk) { L.stoolAsk = 1; const J = S.npcs.vl_jade, p = S.players[L.pid]; if (J && p) { vl5Face(J, p.x, p.y); empSay(J, 'O que vai ser?'); vl5Anim(J, 'bow', 1200); Net.toOne(p.id, { t: 'vl8order', l: VL8_MENU.filter(x => x[0] === 'wine' || x[0] === 'tea').map(x => [x[0], x[1], x[2]]) }); } } } catch (e) { }
  return r; }; }

/* 4–6. clientes, artistas e passantes andando de casa até a casa de Veludo e de volta */
function vl9Homes() { if (S._vl9H) return S._vl9H; const L = [], D = doorTiles(); for (const P of (typeof PROPS !== 'undefined' ? PROPS : [])) { if (P.kind !== 'house' || P.apt) continue; const d = D[P.bi]; if (d) L.push([d.ox, d.oy]); } const [ex, ey] = vl9Entry(); L.sort((a, c) => Math.hypot(a[0] - ex, a[1] - ey) - Math.hypot(c[0] - ex, c[1] - ey)); return (S._vl9H = L.length ? L.filter((h, i) => i < 4 || Math.hypot(h[0] - ex, h[1] - ey) < 80).slice(0, 9) : [[CENTER, CENTER + 6]]); }   /* as casas mais perto (nada do outro lado do rio) */
function vl9Home(id) { const H = vl9Homes(); let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return H[(h + estDay()) % H.length]; }
function vl9Entry() { const b = velB('velvet'); return localToWorld(b, 6.5, bDims(b)[1] - 0.8); }
function vl9Real(n) { S._vl9Real = 1; try { visGone(n); } finally { S._vl9Real = 0; } }
function vl9Go(n, goal, ph) { const W = n.vw || (n.vw = {}); W.ph = ph; W.goal = goal; W.pts = null; W.i = 0; W.door = 0; W.t = Date.now(); n.sitting = 0; if (n.dz && typeof dzSet === 'function') dzSet(n, null); }
function vl9Path(n, u, v) { let p = vl5Path(n, u, v); if (p) return p; const b = velB('velvet'), st = []; if (n.home && n.home.fu != null) st.push(localToWorld(b, n.home.fu, n.home.fv)); const [su, sv] = worldToLocal(b, n.x, n.y); for (const [du, dv] of [[0, -0.6], [0, 0.6], [0.6, 0], [-0.6, 0], [0.6, 0.6], [-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6]]) st.push(localToWorld(b, su + du, sv + dv));
  for (const q0 of st) { const q = vl5Path({ x: q0[0], y: q0[1], fl: n.fl || 0 }, u, v); if (q) return [q0].concat(q); } return null; }   /* saindo de dentro de um reservado: primeiro para a frente da mesa */
/* um passo: lá fora pelas ruas (npcWalk, entra pela porta), lá dentro pela grade da casa (vl5Path) */
function vl9Step(n, W, dt) { const b = velB('velvet'), g = W.goal; if (!b || !g) return true;
  if (g.inner) {
    if (!W.door && !vlInside(n)) { const [ex, ey] = vl9Entry(); if (dist(n.x, n.y, ex, ey) < 0.8) { n.x = ex; n.y = ey; W.door = 1; } else { npcWalk(n, ex, ey, VL9.walkSpd, dt); n.walk = true; n.walking = true; return false; } }
    W.door = 1; if (!W.pts) { const [u, v] = worldToLocal(b, g.x, g.y); let pts = vl9Path(n, u, v); if (!pts && g.fu != null) { const q = vl9Path(n, g.fu, g.fv); if (q) pts = q.concat([[g.x, g.y]]); } W.pts = pts || [[g.x, g.y]]; W.i = 0; }
    W.i = vl5Move(n, W.pts, W.i, dt, VL9.inSpd); return W.i >= W.pts.length; }
  if (!W.door && vlInside(n)) { if (!W.pts) { const [ex, ey] = vl9Entry(), [u, v] = worldToLocal(b, ex, ey); W.pts = vl9Path(n, u, v) || [[ex, ey]]; W.i = 0; } W.i = vl5Move(n, W.pts, W.i, dt, VL9.inSpd); if (W.i >= W.pts.length) { W.door = 1; W.pts = null; } return false; }
  W.door = 1; if (dist(n.x, n.y, g.x, g.y) < 0.9) return true; npcWalk(n, g.x, g.y, VL9.walkSpd, dt); n.walk = true; n.walking = true; return false; }
/* recém-criados: vêm de casa até o lugar deles */
function vl9Mark() { S.vl9Back = S.vl9Back || {}; for (const id in S.npcs) { if (!VL9_WALKIDS.test(id)) continue; const n = S.npcs[id]; if (n._v9) continue; n._v9 = 1; if (S.vl9Back[id]) { delete S.vl9Back[id]; continue; } if (n.fl || 0) continue;
  const h = vl9Home(id), seat = { x: n.x, y: n.y, dir: n.dir, sit: n.sitting ? 1 : 0, inner: 1 }, c = /^vl_g(\d)/.exec(id); if (c && typeof vl5BoothPt === 'function') { const fp = vl5BoothPt(+c[1], id); seat.fu = fp[0]; seat.fv = fp[1]; }
  n.home = seat; n.x = h[0]; n.y = h[1]; vl9Go(n, seat, 'in'); } }
/* quem deveria sumir vai embora a pé */
if (typeof visGone === 'function' && typeof S !== 'undefined') { const _vg9 = visGone; visGone = function (n) {
  if (n && !S._vl9Real && VL9_WALKIDS.test(n.id || '') && S.npcs[n.id] === n && !n.dead && !n.downed) { if (n.fl || 0) { S.vl9Back = S.vl9Back || {}; S.vl9Back[n.id] = 1; return _vg9.apply(this, arguments); }
    if (n.vw && n.vw.ph === 'out') return; const h = vl9Home(n.id); if (/^vl_mc/.test(n.id) && S.vl7At) delete S.vl7At[n.id]; vl9Go(n, { x: h[0], y: h[1] }, 'out'); return; }
  return _vg9.apply(this, arguments); }; }
/* os puxões para o lugar (mercadores e artistas) não atrapalham quem está andando */
function vl9Hold(fn) { return function () { const sv = []; for (const id in S.npcs) { const n = S.npcs[id]; if (n.vw && n.vw.ph !== 'sat' && n.home && VL9_WALKIDS.test(id)) { sv.push([n, n.x, n.y, n.sitting, n.dir, n.fl, n.fb]); } }
  try { return fn.apply(this, arguments); } finally { for (const [n, x, y, s, d, fl, fb] of sv) { n.x = x; n.y = y; n.sitting = s; n.dir = d; n.fl = fl; n.fb = fb; } try { vl9Mark(); } catch (e) { } } }; }
if (typeof vl7MercTick === 'function' && typeof S !== 'undefined') vl7MercTick = vl9Hold(vl7MercTick);
if (typeof vlGuestsSpawn === 'function' && typeof S !== 'undefined') vlGuestsSpawn = vl9Hold(vlGuestsSpawn);
if (typeof velSpawn === 'function' && typeof S !== 'undefined') velSpawn = vl9Hold(velSpawn);
/* passantes: entram, vão ao balcão ou à pista, ficam um tempo e vão embora */
function vl9PassTick(now) { S.vl9P = S.vl9P || {}; const open = vlOpen() && !vlClosed();
  for (let k = 0; k < VL9.passN; k++) { const id = 'vl_w' + k, n = S.npcs[id], P = S.vl9P[k] || (S.vl9P[k] = { next: now + 20000 + k * 45000 });
    if (!open) { if (n && !(n.vw && n.vw.ph === 'out')) visGone(n); continue; }
    if (!n && now > P.next) { const h = vl9Home(id + now), b = velB('velvet'), sp = Math.random() < 0.6 ? VL5_SPOTS.bar[(k + Math.floor(now / 60000)) % VL5_SPOTS.bar.length] : VL9_FLOOR[(k * 3 + Math.floor(now / 60000)) % VL9_FLOOR.length], [x, y] = localToWorld(b, sp[0] + (Math.random() - 0.5) * 0.4, sp[1] + (Math.random() - 0.5) * 0.3);
      const v = { id, kind: VL9_PASS_KINDS[(k + Math.floor(now / 90000)) % VL9_PASS_KINDS.length], name: 'Visitante', transient: true, court: 'praz', x: h[0], y: h[1], z: 0, fl: 0, fb: -1, hp: 120, maxHp: 120, downed: null, dead: false, dir: 0, sitting: 0, _v9: 1 };
      S.npcs[id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); v.home = { x, y, dir: 0, sit: 0, inner: 1 }; vl9Go(v, v.home, 'in'); P.stay = now + 180000 + Math.random() * 240000; continue; }
    if (n && n.vw && (n.vw.ph === 'sat' || n.vw.ph === 'dance') && now > (P.stay || 0)) { visGone(n); P.next = now + 60000 + Math.random() * 120000; } } }
/* pista: no show, clientes levantam para dançar perto do palco (ou em volta de quem está dançando) */
function vl9FloorTick(now) { const h = empHour(), show = h >= VL_SHOW[0] && h < VL_SHOW[1] && vlOpen(); const b = velB('velvet'); if (!b) return;
  const all = Object.values(S.npcs).filter(n => n.vw && n.home && VL9_WALKIDS.test(n.id) && !VL9_SHOWIDS.test(n.id) && !n.dead && !n.downed), on = all.filter(n => n.vw.ph === 'floor' || n.vw.ph === 'dance');
  if (!show || on.length >= VL9.floorMax || Math.random() > 0.35) return;
  const busy = id => (S.vlTable && Object.values(S.vlTable).some(T => T.npc === id)) || (S.vl7At && S.vl7At[id]) || (S.vlGuestUp && S.vlGuestUp[id]);
  const cand = all.filter(n => n.vw.ph === 'sat' && now - (n.vw.satT || 0) > 45000 && !busy(n.id)); if (!cand.length) return; const n = cand[Math.floor(Math.random() * cand.length)];
  const p = typeof bjVelDancer === 'function' ? bjVelDancer() : null; let x, y; if (p) { const a = Math.random() * Math.PI * 2; x = p.x + Math.cos(a) * 1.1; y = p.y + Math.sin(a) * 1.1; } else { const sp = VL9_FLOOR[Math.floor(Math.random() * VL9_FLOOR.length)]; [x, y] = localToWorld(b, sp[0] + (Math.random() - 0.5) * 0.4, sp[1] + (Math.random() - 0.5) * 0.4); }
  vl9Go(n, { x, y, inner: 1 }, 'floor'); n.vw.until = 0; }
const VL9_STEPS = ['fk_passinho', 'fk_ombrinho', 'fk_destravada', 'fk_quadradinho', 'fk_maosalto'];
function vl9WalkTick(now, dt) { const b = velB('velvet');
  for (const n of Object.values(S.npcs)) { const W = n.vw; if (!W || !VL9_WALKIDS.test(n.id) || n.dead || n.downed || n.dragBy) continue;
    if (W.ph === 'sat') continue;
    if (W.ph === 'dance') { if (now > W.until) { dzSet(n, null); vl9Go(n, n.home, 'back'); } continue; }
    let done = false; try { done = vl9Step(n, W, dt); } catch (e) { done = true; }
    if (!done && now - W.t > VL9.maxWalk) { if (W.ph === 'out') { vl9Real(n); continue; } n.x = W.goal.x; n.y = W.goal.y; done = true; }   /* caminho travado: chega mesmo assim */
    if (!done) continue; n.walk = false; n.walking = false;
    if (W.ph === 'out') { vl9Real(n); continue; }
    if (W.ph === 'floor') { W.ph = 'dance'; W.until = now + 40000 + Math.random() * 50000; if (b) { const [sx, sy] = localToWorld(b, 6.5, 4.5), p = typeof bjVelDancer === 'function' ? bjVelDancer() : null; n.dir = p && dist(p.x, p.y, n.x, n.y) < 2 ? dirFromVecS(p.x - n.x, p.y - n.y) : dirFromVecS(sx - n.x, sy - n.y); }
      S.dzT0 = S.dzT0 || now; dzSet(n, { step: VL9_STEPS[Math.floor(Math.random() * VL9_STEPS.length)], t0: S.dzT0, mir: Math.random() < 0.5 ? 1 : 0, ph: 0, k: Math.round((0.8 + Math.random() * 0.3) * 100) / 100, j: 1 }); continue; }
    /* chegou ao lugar dele (reservado, banquinho, balcão ou palco) */
    const H = W.goal; n.x = H.x; n.y = H.y; if (H.dir != null) n.dir = H.dir; n.sitting = H.sit ? 1 : 0; W.ph = 'sat'; W.satT = now; } }
if (typeof velTick === 'function' && typeof S !== 'undefined') { const _vtW9 = velTick; velTick = function (now) { _vtW9(now);
  try { if (!S.estate) return; const dt = Math.min(0.5, Math.max(0, (now - (S.vl9Last || now)) / 1000)); S.vl9Last = now; vl9WalkTick(now, dt);
    if (now - (S.vl9T || 0) > 3000) { S.vl9T = now; vl9Mark(); vl9PassTick(now); vl9FloorTick(now); vl9BoothTick(now); vl9OwnTick(now); } } catch (e) { console.warn('veludo9', e); } }; }

/* 7. comprar a casa: a Dama Ysolde passa a trabalhar para você */
function vl9Own() { return velRec().own || null; }
function vl9IsOwner(p) { const O = vl9Own(); return !!(O && p && O.k === estOwner(p)); }
function vl9OwnInfo(p) { const O = vl9Own(); return { t: 'vlown', price: VL9.price, share: Math.round(VL9.share * 100), owner: O ? O.name : null, mine: vl9IsOwner(p), bal: O && vl9IsOwner(p) ? O.bal | 0 : 0, tot: O && vl9IsOwner(p) ? O.tot | 0 : 0, today: O && vl9IsOwner(p) && O.day && O.day.d === estDay() ? O.day.v | 0 : 0 }; }
function vl9Earn(v) { const O = vl9Own(); if (!O || v <= 0) return; const s = Math.round(v * VL9.share * 100) / 100; O.bal = (O.bal || 0) + s; O.tot = (O.tot || 0) + s; if (!O.day || O.day.d !== estDay()) O.day = { d: estDay(), v: 0 }; O.day.v += s; S.vl9Dirty = 1; }
/* o que entra: o ouro gasto lá dentro pelos outros jogadores e o movimento dos clientes da casa; para o dono, tudo de graça */
function vl9OwnTick(now) { const O = vl9Own();
  for (const p of Object.values(S.players)) { const inn = vl9InBld(p) && !p.downed; if (!inn) { p._vlG = null; continue; } const g = p.gold || 0;
    if (p._vlG != null && g < p._vlG) { const spent = p._vlG - g; if (spent <= 3000) { if (O && O.k === estOwner(p)) { p.gold += spent; sendStat(p); if (now - (p._vl9FreeT || 0) > 60000) { p._vl9FreeT = now; tell(p, 'Por conta da casa: a Casa de Veludo é sua.'); } } else vl9Earn(spent); } }
    p._vlG = p.gold || 0; }
  if (O && vlOpen() && now - (S.vl9NpcT || 0) > 60000) { S.vl9NpcT = now; const b = velB('velvet'); const k = Object.values(S.npcs).filter(n => !n.dead && vl9InBld(n) && (VL9_WALKIDS.test(n.id) && !VL9_SHOWIDS.test(n.id) || (n.court === 'house' && n.hrole === 'lord'))).length; vl9Earn(k * VL9.npcPay / VL9.share); }
  if (S.vl9Dirty && now - (S.vl9SaveT || 0) > 60000) { S.vl9SaveT = now; S.vl9Dirty = 0; if (typeof estateSave === 'function') estateSave(); } }
if (typeof velMenu === 'function' && typeof S !== 'undefined') { const _vmn9 = velMenu; velMenu = function (p, T, n) { const r = _vmn9.apply(this, arguments);
  try { if (T && T.menu === 'ysolde') { Net.toOne(p.id, vl9OwnInfo(p)); const Y = S.npcs.vl_ysolde; if (Y && vl9IsOwner(p)) empSay(Y, ['Às suas ordens. A casa vai bem.', 'Bem-vindo de volta. A casa é sua, as moças sabem.', 'O cofre está em dia, como sempre.'][Math.floor(Math.random() * 3)]); } } catch (e) { }
  return r; }; }
if (typeof velMsg === 'function' && typeof S !== 'undefined') { const _vmO9 = velMsg; velMsg = function (p, m) {
  if (m && m.a === 'vl9buy') { const n = velStaffNear(p, 'vl_ysolde'); if (!n) return; const O = vl9Own(); if (O) { empSay(n, O.k === estOwner(p) ? 'A casa já é sua.' : 'A casa já tem dono, querido.'); return; }
    if ((p.gold || 0) < VL9.price) { empSay(n, 'A Casa de Veludo vale ' + VL9.price + ' de ouro. Nem uma moeda a menos.'); return; }
    p.gold -= VL9.price; p._vlG = p.gold; velRec().own = { k: estOwner(p), name: p.name, since: estDay(), bal: 0, tot: 0, day: { d: estDay(), v: 0 } }; sendStat(p); if (typeof estateSave === 'function') estateSave();
    empSay(n, 'Então está feito. Eu cuido da casa como sempre cuidei, só que agora para você.'); tell(p, '🏮 A Casa de Veludo é sua. A Dama Ysolde cuida dela para você: ' + Math.round(VL9.share * 100) + '% do que entra fica guardado com ela (fale com ela para recolher), e tudo lá dentro é por conta da casa para você.');
    if (typeof sys === 'function') sys('🏮 ' + p.name + ' comprou a Casa de Veludo.'); Net.toOne(p.id, vl9OwnInfo(p)); return; }
  if (m && m.a === 'vl9take') { const n = velStaffNear(p, 'vl_ysolde'); if (!n || !vl9IsOwner(p)) return; const O = vl9Own(), v = Math.floor(O.bal || 0); if (v < 1) { empSay(n, 'Ainda não entrou nada desde a última vez.'); return; }
    O.bal -= v; p.gold = (p.gold || 0) + v; p._vlG = p.gold; sendStat(p); if (typeof estateSave === 'function') estateSave(); empSay(n, 'Aqui está a sua parte: ' + v + ' de ouro. Conte, se quiser.'); Net.toOne(p.id, vl9OwnInfo(p)); return; }
  return _vmO9.apply(this, arguments); }; }
/* a casa é do dono mesmo nas noites fechadas por uma família */
if (typeof vlAllowed === 'function' && typeof S !== 'undefined') { const _va9 = vlAllowed; vlAllowed = function (p, C) { if (vl9IsOwner(p)) return true; return _va9.apply(this, arguments); }; }

/* ---------------- CLIENTE ---------------- */
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _pe9 = progEvent; progEvent = function (m, now) {
  if (m.t === 'vlown') { const d = typeof $ === 'function' ? $('tequip') : null; if (!d || !d.classList.contains('vel-panel')) return true; let box = d.querySelector('.vl9-own'); if (!box) { box = document.createElement('div'); box.className = 'vl9-own'; d.appendChild(box); }
    if (m.mine) box.innerHTML = '<div class="est-cost">🏮 <b>A casa é sua.</b> Sua parte (' + m.share + '% do que entra) fica com a Dama Ysolde.<br>Hoje: <b>' + m.today + '</b> · desde a compra: <b>' + m.tot + '</b><br>Para recolher agora: <b>' + m.bal + '</b> de ouro.</div><div class="tq-btns"><button class="est-btn" data-v9="take">💰 Recolher a minha parte<small>' + m.bal + ' de ouro</small></button></div>';
    else if (m.owner) box.innerHTML = '<div class="est-cost">🏮 A casa pertence a <b>' + escAff(m.owner) + '</b>.</div>';
    else box.innerHTML = '<div class="tq-btns"><button class="est-btn" data-v9="buy">🏮 Comprar a Casa de Veludo<small>' + m.price + ' de ouro · ' + m.share + '% do que entra é seu e tudo lá dentro é de graça para você</small></button></div>';
    box.querySelectorAll('[data-v9]').forEach(b => b.onclick = () => Net.send({ t: 'vel', a: b.dataset.v9 === 'buy' ? 'vl9buy' : 'vl9take' })); return true; }
  return _pe9(m, now); }; }
