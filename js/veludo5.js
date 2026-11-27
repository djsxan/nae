// ============================================================
//  CASA VIVA (pedido de 26/11): a Casa de Veludo deixa de ser um quadro parado.
//  · As moças circulam: vão ao balcão, dançam na frente do palco, passam pelas mesas e sentam com os clientes da casa.
//  · Mesmo depois de uma recusa, de 3 a 5 minutos depois outra moça vem até a sua mesa, dança na sua frente e oferece a bebida.
//  · No show, as dançarinas descem do palco de vez em quando para dançar na frente de uma mesa.
//  · A Jade leva bebidas às mesas, a Mirela cumprimenta os reservados, o Long patrulha o salão, o Fei e o Lei rondam
//    as galerias, e o Tao (ou o Long) sai pela porta para fumar.
//  · Com a suíte alugada, o Bai, capanga da suíte, desce e fica de guarda junto ao elevador no térreo.
//  · Duas moças novas na casa: Íris e Yan (agora dá para ter três moças na mesa de verdade).
//  Todos andam por rotas que desviam dos móveis (grade de passos de 25 cm em cada andar da casa).
// ============================================================
const VL5 = { offerCd: [180000, 300000], firstWait: [40000, 80000], nextAfterYes: [60000, 120000], speed: 1.4, capSpeed: 1.2, danceShow: [150000, 260000], danceMs: 20000,
  smoke: [360000, 600000], smokeMs: 36000, jade: [150000, 260000], mirela: [220000, 360000], step: 0.25 };
VEL_STAFF.push(
  { id: 'vl_iris', b: 'velvet', kind: 'vl_comp3', name: 'Íris', at: [4.2, 7.6], dir: 1, menu: 'comp' },
  { id: 'vl_yan', b: 'velvet', kind: 'vl_comp4', name: 'Yan', at: [8.7, 7.6], dir: 5, menu: 'comp' });
const VL5_LINES = { hi: ['Oi, querido! Gostou da música?', 'Olha quem está aqui sozinho…', 'Essa mesa merece companhia.', 'Dança comigo daqui?'], bar: ['Jade, me serve um chá?', 'Hoje a casa está cheia!', 'Ouviu a banda? Que noite.'],
  table: ['Boa noite, senhores.', 'Precisando de alguma coisa?', 'Que mesa animada!'], dance: ['Essa é a minha música!', 'Olha só!', 'Uhu!'], mirela: ['Tudo do seu agrado?', 'Bem-vindos à Casa de Veludo.', 'Qualquer coisa, é só chamar.'],
  jade: ['Mais uma rodada para a mesa.', 'Com licença, a bebida.', 'Saúde, senhores!'], back: ['Fumar lá fora faz bem para a cabeça.', 'Já volto, fiquem de olho.'] };
const vl5Pick = L => L[Math.floor(Math.random() * L.length)], vl5Spot = (L, id) => { const T = (typeof S !== 'undefined' && S.vl5Tgt) || {}, ok = L.filter(P => !Object.keys(T).some(k => k !== id && Math.hypot(T[k][0] - P[0], T[k][1] - P[1]) < 0.8)); const P = vl5Pick(ok.length ? ok : L); if (typeof S !== 'undefined') { S.vl5Tgt = S.vl5Tgt || {}; S.vl5Tgt[id] = P; } return P; }, vl5R = ([a, b]) => a + Math.random() * (b - a);

// ---------------- SERVIDOR ----------------
/* grade de passos de cada andar (móveis e paredes da casa); guardada porque a mobília não muda */
const VL5G = {}, VL5_PASS = new Set(['vrug', 'vrunner', 'vlift', 'lift', 'lifttop', 'vstool', 'stairdown', 'stairup']);
function vl5Grid(fl) { if (VL5G[fl]) return VL5G[fl]; const b = velB('velvet'), bi = vlBi(); if (!b) return null; const st = VL5.step, W = Math.round((b.w - 1) / st) + 1, H = Math.round((b.h - 1) / st) + 1, ok = new Uint8Array(W * H);
  /* os móveis da casa quase não têm colisão para o jogador; para os NPCs andarem com naturalidade, só tapete, banqueta e elevador deixam passar */
  const occ = new Set(); for (const f of interiorLayout(b, fl).F) { if (VL5_PASS.has(f.t)) continue; for (let a = 0; a < (f.w || 1); a++) for (let c = 0; c < (f.h || 1); c++) occ.add((f.i + a) + ',' + (f.j + c)); }
  const furn = (u, v) => { for (const [du, dv] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) if (occ.has(Math.round(u + du) + ',' + Math.round(v + dv))) return true; return false; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const [x, y] = localToWorld(b, i * st, j * st); ok[j * W + i] = canStandFloor(x, y, bi, fl, 0.2) && !furn(i * st, j * st) ? 1 : 0; }
  return (VL5G[fl] = { W, H, ok }); }
function vl5Cell(Gd, u, v) { const st = VL5.step, i0 = Math.round(u / st), j0 = Math.round(v / st); for (let r = 0; r < 10; r++) { let best = -1, bd = 1e9; for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) { if (i < 0 || j < 0 || i >= Gd.W || j >= Gd.H || !Gd.ok[j * Gd.W + i]) continue; const d = (i - u / st) ** 2 + (j - v / st) ** 2; if (d < bd) { bd = d; best = j * Gd.W + i; } } if (best >= 0) return best; } return -1; }
function vl5Los(Gd, a, c) { const ax = a % Gd.W, ay = (a / Gd.W) | 0, cx = c % Gd.W, cy = (c / Gd.W) | 0, n = Math.ceil(Math.hypot(cx - ax, cy - ay) * 2); for (let k = 1; k < n; k++) { const i = Math.round(ax + (cx - ax) * k / n), j = Math.round(ay + (cy - ay) * k / n); if (!Gd.ok[j * Gd.W + i]) return false; } return true; }
/* rota em coordenadas do mundo, do NPC até o ponto (u, v) da casa, no andar fl */
function vl5Path(n, u, v, fl) { const b = velB('velvet'); if (!b) return null; fl = fl == null ? (n.fl || 0) : fl; const Gd = vl5Grid(fl); if (!Gd) return null; const [su, sv] = worldToLocal(b, n.x, n.y), s = vl5Cell(Gd, su, sv), g = vl5Cell(Gd, u, v); if (s < 0 || g < 0) return null;
  const prev = new Int32Array(Gd.W * Gd.H).fill(-1), Q = [s]; prev[s] = s; let found = s === g;
  for (let qi = 0; qi < Q.length && !found; qi++) { const c = Q[qi], ci = c % Gd.W, cj = (c / Gd.W) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= Gd.W || j >= Gd.H) continue; const k = j * Gd.W + i; if (prev[k] >= 0 || !Gd.ok[k]) continue; if (di && dj && (!Gd.ok[cj * Gd.W + i] || !Gd.ok[j * Gd.W + ci])) continue; prev[k] = c; if (k === g) { found = true; break; } Q.push(k); } }
  if (!found) return null; const raw = []; for (let c = g; ; c = prev[c]) { raw.push(c); if (c === s) break; } raw.reverse();
  const keep = [raw[0]]; for (let k = 1; k < raw.length; k++) if (k === raw.length - 1 || !vl5Los(Gd, keep[keep.length - 1], raw[k + 1])) keep.push(raw[k]);
  const st = VL5.step; return keep.slice(1).map(c => localToWorld(b, (c % Gd.W) * st, ((c / Gd.W) | 0) * st)); }
function vl5Move(n, pts, i, dt, sp) { if (!pts || i >= pts.length) return i; const [tx, ty] = pts[i], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy), s = (sp || VL5.speed) * dt; if (d <= s) { n.x = tx; n.y = ty; return i + 1; } n.x += dx / d * s; n.y += dy / d * s; n.dir = dirFromVecS(dx, dy); n.walk = true; n.walking = true; return i; }
/* quem está no roteiro da casa fica onde está (o laço da casa recolocava todos no posto a cada meio segundo) */
function vl5Hold(n, now) { const b = velB('velvet'); S.vlAway = S.vlAway || {}; const A = S.vlAway[n.id]; if (A && !A.vl5 && now < A.until) return false; S.vlAway[n.id] = { at: worldToLocal(b, n.x, n.y), fl: n.fl || 0, sit: 0, dir: n.dir || 0, until: now + 4000, vl5: 1 }; return true; }
function vl5Free(id, now) { const A = S.vlAway && S.vlAway[id]; return !(S.vlTable && S.vlTable[id]) && !(S.vlEsc && S.vlEsc[id]) && !(S.vlOffer && S.vlOffer[id]) && !(A && !A.vl5 && now < A.until) && !(id === 'vl_jade' && S.vlTrayRun); }
function vl5Drop(id, keep) { if (S.vl5) delete S.vl5[id]; if (!keep && S.vlAway && S.vlAway[id] && S.vlAway[id].vl5) delete S.vlAway[id]; const n = S.npcs[id]; if (n) { n.walk = false; n.walking = false; } }
function vl5Face(n, x, y) { n.dir = dirFromVecS(x - n.x, y - n.y); }
function vl5Anim(n, a, ms, txt) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a, ms, txt }); }
/* frente de cada reservado (onde quem passa para) e outros pontos do salão */
const VL5_BFRONT = [[2.15, 4.0], [2.15, 6.0], [10.35, 6.0], [10.35, 8.0], [3.0, 8.4], [10.0, 8.4]];
const VL5_SPOTS = { bar: [[0.9, 2.75], [1.9, 2.75], [2.9, 2.75], [3.6, 2.4]], stage: [[4.9, 6.4], [5.9, 6.6], [7.0, 6.6], [8.0, 6.4], [4.6, 4.3], [8.4, 4.3]], open: [[6.5, 8.6], [4.6, 9.4], [8.4, 9.4], [3.6, 2.9], [9.2, 3.3], [4.0, 8.2], [8.9, 8.2]] };
const VL5_PATROL = { 0: [[8.3, 7.7], [8.8, 3.4], [6.5, 2.7], [3.8, 2.9], [3.4, 7.4], [6.5, 8.8]], 1: [[1.5, 8.6], [1.6, 3.6], [6.5, 2.4], [10.6, 4.6], [11.4, 9.2], [6.5, 9.7]], 2: [[11.5, 9.2], [10.6, 4.6], [6.5, 2.4], [1.6, 3.6], [1.5, 8.6], [6.5, 9.7]] };
function vl5BoothPt(c, id) { const B = VL5_BFRONT[c]; if (!B) return VL5_SPOTS.open[0]; const ax = c < 4 ? [0, 1] : [1, 0]; return vl5Spot([B, [B[0] + ax[0] * 0.7, B[1] + ax[1] * 0.7], [B[0] - ax[0] * 0.7, B[1] - ax[1] * 0.7]], id); }
/* mesas com gente agora: reservados com jogador, lorde ou clientes da casa */
function vl5Tables() { const now = Date.now(); if (S._vl5Tab && now - S._vl5Tab.t < 900) return S._vl5Tab.l; const out = [], bi = vlBi(), b = velB('velvet'), inB = n => !(n.fl || 0) && b && n.x >= b.x - 0.5 && n.x < b.x + b.w - 0.5 && n.y >= b.y - 0.5 && n.y < b.y + b.h - 0.5, NN = Object.values(S.npcs).filter(n => !n.dead && inB(n) && (/^vl_g/.test(n.id) || (n.court === 'house' && n.hrole === 'lord'))).map(n => [n, vl4BoothSeat(n)]).filter(q => q[1]); for (let c = 0; c < 6; c++) { let who = null;
    for (const p of Object.values(S.players)) { if (!p.sit || (p.fl || 0) || !vlInside(p)) continue; const s = WORLD.seats.find(q => q.bi === bi && q.vb === c && Math.abs(q.x - p.x) < 0.06 && Math.abs(q.y - p.y) < 0.06); if (s) { who = p; break; } }
    const guests = NN.filter(q => /^vl_g/.test(q[0].id) && q[1].vb === c).map(q => q[0]), lord = (NN.find(q => q[0].court === 'house' && q[1].vb === c) || [])[0];
    if (who || guests.length || lord) out.push({ c, who, guests, lord }); } S._vl5Tab = { t: now, l: out }; return out; }
/* ---- oferta à mesa do jogador ---- */
function vl5OfferFor(g, now) { const B = vlBooths(); S.vl5Claim = S.vl5Claim || {};
  for (const p of Object.values(S.players)) { if (!p.sit || (p.fl || 0) || !vlInside(p)) { p._vl5Sit = 0; continue; } const s = vl4BoothSeat(p); if (!s || !vl5MyTable(p, s.vb)) { p._vl5Sit = 0; continue; }
    if (!p._vl5Sit) { p._vl5Sit = now; p._vl5Next = Math.max(p._vl5Next || 0, now + vl5R(VL5.firstWait)); }
    if (p.vlOffer || p.aff || p.vlRest || now < (p._vl5Next || 0) || now < (p._af4Next || 0)) continue;
    if (Object.values(S.vlTable || {}).filter(X => X.who === p.id).length >= (typeof AF4 !== 'undefined' ? AF4.girls : 1)) continue;
    if (p.vlDecl && p.vlDecl[g] > now) continue; if (S.vl5Claim[p.id] && S.vl5Claim[p.id] !== g && S.vl5 && S.vl5[S.vl5Claim[p.id]]) continue; const fs = vl4FreeSeat(p, s.vb); if (fs < 0) continue; return { p, c: s.vb, fs }; } return null; }
/* a mesa é do jogador (ou ele foi convidado para ela: a versão da mesa dividida estende esta função) */
function vl5MyTable(p, c) { return typeof vlBoothMine === 'function' ? vlBoothMine(p, c) : vlBooths().own[c] === estOwner(p); }
/* ---- rotina de cada moça ---- */
function vl5GirlNext(n, T, now) { const L = { id: n.id, ph: 'go', t: now };
  const O = vl5OfferFor(n.id, now); if (O) { S.vl5Claim[O.p.id] = n.id; const [u, v] = vl5BoothPt(O.c, n.id); return Object.assign(L, { a: 'offer', pid: O.p.id, c: O.c, pts: vl5Path(n, u, v), i: 0, dur: 5500 }); }
  const tabs = vl5Tables(), r = Math.random(), show = empHour() >= VL_SHOW[0] && empHour() < VL_SHOW[1];
  if (tabs.length && r < 0.32) { const T0 = tabs[Math.floor(Math.random() * tabs.length)], [u, v] = vl5BoothPt(T0.c, n.id); return Object.assign(L, { a: 'table', c: T0.c, pts: vl5Path(n, u, v), i: 0, dur: 7000 + Math.random() * 5000 }); }
  if (r < (show ? 0.62 : 0.5)) { const P = vl5Spot(VL5_SPOTS.stage, n.id); return Object.assign(L, { a: 'stage', pts: vl5Path(n, P[0], P[1]), i: 0, dur: 14000 + Math.random() * 10000 }); }
  if (r < 0.82) { const P = vl5Spot(VL5_SPOTS.bar, n.id); return Object.assign(L, { a: 'bar', pts: vl5Path(n, P[0], P[1]), i: 0, dur: 15000 + Math.random() * 15000 }); }
  const P = vl5Spot(VL5_SPOTS.open, n.id); return Object.assign(L, { a: 'idle', pts: vl5Path(n, P[0], P[1]), i: 0, dur: 6000 + Math.random() * 8000 }); }
function vl5GirlDo(n, L, now) { const b = velB('velvet');
  if (L.a === 'offer') { const p = S.players[L.pid], s = p && vl4BoothSeat(p); if (!p || !s || !p.sit || p.vlOffer || p.aff) return true; vl5Face(n, p.x, p.y);
    if (!L.danced) { L.danced = 1; empSay(n, vl5Pick(VL5_LINES.hi)); vl5Anim(n, 'dance', 3200); return false; } if (now - L.t0 < L.dur) { if (now - (L.da || 0) > 3000) { L.da = now; vl5Anim(n, 'dance', 3200); } return false; }
    const fs = vl4FreeSeat(p, s.vb); if (fs < 0) return true; const S0 = WORLD.seats[fs]; S.vlOffer = S.vlOffer || {}; S.vlOffer[n.id] = { who: p.id, t: now, seat: fs, at: worldToLocal(b, n.x, n.y), dir: n.dir }; p.vlOffer = n.id;
    S.vl5Off = S.vl5Off || {}; S.vl5Off[n.id] = { who: p.id }; empSay(n, vl4Pick(VL4_LINES.offer)); Net.toOne(p.id, { t: 'vloffer', id: n.id, name: n.name, cost: VL4.drink }); return 'keep'; }
  if (L.a === 'table') { const T0 = vl5Tables().find(x => x.c === L.c); if (!T0) return true; const f = T0.who || T0.lord || T0.guests[0]; if (f) vl5Face(n, f.x, f.y);
    if (!L.said) { L.said = 1; if (Math.random() < 0.5) { empSay(n, vl5Pick(VL5_LINES.dance)); vl5Anim(n, 'dance', 3200); } else empSay(n, vl5Pick(VL5_LINES.table)); }
    if (now - L.t0 >= L.dur) { const c = T0.guests.find(q => !Object.values(S.vlTable || {}).some(X => X.who === q.id) && !(now < (q.vlDecl || 0)) && !q.vlUp); if (c && vlOpen() && Math.random() < 0.55) { const s = vl4BoothSeat(c), fs = s ? vl4FreeSeat(c, s.vb) : -1; if (fs >= 0) { S.vlTable = S.vlTable || {}; S.vlTable[n.id] = { who: c.id, npc: 1, seat: fs, until: now + VL4.drinkMs, next: now + 20000, gi: 0, stage: 0 }; return 'keep'; } } else if (c) c.vlDecl = now + VL4.declMs; return true; } return false; }
  if (L.a === 'stage') { vl5Face(n, ...localToWorld(b, 6.5, 4.2)); if (now - (L.da || 0) > 3000) { L.da = now; vl5Anim(n, 'dance', 3200); if (Math.random() < 0.12) empSay(n, vl5Pick(VL5_LINES.dance)); } return now - L.t0 >= L.dur; }
  if (L.a === 'bar') { vl5Face(n, ...localToWorld(b, n.x < b.x ? 1.5 : 1.8, 0.8)); if (!L.said && Math.random() < 0.3) { L.said = 1; vl5Anim(n, 'talk', 2600, vl5Pick(VL5_LINES.bar)); } return now - L.t0 >= L.dur; }
  return now - L.t0 >= L.dur; }
/* ---- dançarina desce do palco para dançar numa mesa ---- */
function vl5DancerNext(n, T, now) { const tabs = vl5Tables().filter(x => x.who || x.lord || x.guests.length); if (!tabs.length) return null; const T0 = tabs[Math.floor(Math.random() * tabs.length)], [u, v] = vl5BoothPt(T0.c, n.id); return { id: n.id, a: 'tdance', c: T0.c, ph: 'go', t: now, pts: vl5Path(n, u, v), i: 0, dur: VL5.danceMs, home: T.at }; }
/* ---- Jade leva bebida a uma mesa da casa; Mirela cumprimenta os reservados ---- */
function vl5ServeNext(n, T, now, kind) { const tabs = vl5Tables().filter(x => x.guests.length || x.lord || (kind === 'mirela' && x.who)); if (!tabs.length) return null; const T0 = tabs[Math.floor(Math.random() * tabs.length)], [u, v] = vl5BoothPt(T0.c, n.id); return { id: n.id, a: kind, c: T0.c, ph: 'go', t: now, pts: vl5Path(n, u, v), i: 0, dur: kind === 'jade' ? 4000 : 6000, home: T.at }; }
/* ---- capangas ---- */
function vl5CapPatrol(n, T, fl, now) { const W = VL5_PATROL[fl]; const L = S.vl5[n.id]; const k = L && L.k != null ? (L.k + 1) % W.length : Math.floor(Math.random() * W.length); return { id: n.id, a: 'patrol', k, ph: 'go', t: now, pts: vl5Path(n, W[k][0], W[k][1], fl), i: 0, dur: 6000 + Math.random() * 7000 }; }
function vl5SmokeNext(n, T, now) { const b = velB('velvet'), dc = doorCol(b) + 0.5, pin = vl5Path(n, dc, b.h - 1.3, 0); if (!pin) return null; const side = Math.random() < 0.5 ? -1 : 1, out = [localToWorld(b, dc, b.h - 0.5), localToWorld(b, dc, b.h + 0.5), localToWorld(b, dc + side * 1.1, b.h + 0.75)];
  return { id: n.id, a: 'smoke', ph: 'go', t: now, pts: pin.concat(out), i: 0, dur: VL5.smokeMs, home: T.at, side }; }
/* ---- laço da casa viva ---- */
function vl5Tick(now) { const b = velB('velvet'); if (!b) return; S.vl5 = S.vl5 || {}; S.vl5Claim = S.vl5Claim || {}; const dt = Math.min(0.5, (now - (S.vl5T || now)) / 1000); S.vl5T = now; const decide = now - (S.vl5D || 0) >= 900; if (decide) S.vl5D = now;
  /* quem recebeu a oferta: aceitou (próxima moça em 1 a 2 min) ou recusou/deixou passar (outra vem em 3 a 5 min) */
  for (const g in S.vl5Off || {}) { if (S.vlOffer && S.vlOffer[g]) continue; const p = S.players[S.vl5Off[g].who]; if (p) p._vl5Next = now + vl5R(S.vlTable && S.vlTable[g] && S.vlTable[g].who === p.id ? VL5.nextAfterYes : VL5.offerCd); delete S.vl5Off[g]; if (p && S.vl5Claim[p.id] === g) delete S.vl5Claim[p.id]; }
  for (const T of VEL_STAFF) { if (T.b !== 'velvet') continue; const n = S.npcs[T.id]; let L = S.vl5[T.id];
    if (!n || n.dead || n.downed || n.dragBy) { if (L) vl5Drop(T.id); continue; }
    if (!vl5Free(T.id, now)) { if (L) { delete S.vl5[T.id]; n.walk = false; } continue; }
    const girl = T.menu === 'comp', dancer = T.show && /^vl_d/.test(T.id), cap = T.cap, fl = n.fl || 0;
    if (!L) { if (!decide) continue;
      if (girl && fl === 0) L = vl5GirlNext(n, T, now);
      else if (dancer && !(typeof vlSerpOn === 'function' && vlSerpOn()) && now > (S.vl5DanceT || 0) && !Object.values(S.vl5).some(x => x.a === 'tdance')) { L = vl5DancerNext(n, T, now); S.vl5DanceT = now + (L ? vl5R(VL5.danceShow) : 20000); }
      else if (T.id === 'vl_jade' && now > (S.vl5JadeT || 0)) { L = vl5ServeNext(n, T, now, 'jade'); S.vl5JadeT = now + (L ? vl5R(VL5.jade) : 20000); }
      else if (T.id === 'vl_mirela' && now > (S.vl5MirT || 0) && !Object.values(S.players).some(p => vlInside(p) && dist(p.x, p.y, ...localToWorld(b, T.at[0], T.at[1])) < 2.2)) { L = vl5ServeNext(n, T, now, 'mirela'); S.vl5MirT = now + (L ? vl5R(VL5.mirela) : 20000); }
      else if ((T.id === 'vl_c1' || T.id === 'vl_c2') && fl === 0 && now > (S.vl5SmokeT || 0) && !Object.values(S.vl5).some(x => x.a === 'smoke') && (T.id === 'vl_c1') === !S.vl5SmokeC2) { S.vl5SmokeT = now + vl5R(VL5.smoke); S.vl5SmokeC2 = T.id === 'vl_c1'; L = vl5SmokeNext(n, T, now); }
      else if (T.id === 'vl_c2' || T.id === 'vl_c7' || T.id === 'vl_c8') { if (VL5_PATROL[fl]) L = vl5CapPatrol(n, T, fl, now); }
      if (!L || !L.pts) { if (L && !L.pts) L = null; if (!L) continue; } S.vl5[T.id] = L; }
    if (!vl5Hold(n, now)) { delete S.vl5[T.id]; continue; }
    if (L.ph === 'go') { L.i = vl5Move(n, L.pts, L.i, dt, cap ? VL5.capSpeed : VL5.speed); if (L.i >= L.pts.length) { L.ph = 'do'; L.t0 = now; n.walk = false; n.walking = false; if (L.a === 'smoke') { vl5Face(n, ...localToWorld(b, doorCol(b) + 0.5 + L.side * 3, b.h + 3)); empSmoke(n, VL5.smokeMs); } } continue; }
    if (L.ph === 'back') { L.i = vl5Move(n, L.pts, L.i, dt, cap ? VL5.capSpeed : VL5.speed); if (L.i >= L.pts.length) vl5Drop(T.id, girl); continue; }
    /* no lugar: cada tarefa */
    let done = false;
    if (girl) { const r = vl5GirlDo(n, L, now); if (r === 'keep') { delete S.vl5[T.id]; if (S.vlAway && S.vlAway[T.id] && S.vlAway[T.id].vl5) delete S.vlAway[T.id]; continue; } done = r; }
    else if (L.a === 'tdance') { const T0 = vl5Tables().find(x => x.c === L.c), f = T0 && (T0.who || T0.lord || T0.guests[0]); if (f) vl5Face(n, f.x, f.y); if (now - (L.da || 0) > 3000) { L.da = now; vl5Anim(n, 'dance', 3200); if (!L.said) { L.said = 1; empSay(n, vl5Pick(VL5_LINES.dance)); } } done = !T0 || now - L.t0 >= L.dur; }
    else if (L.a === 'jade' || L.a === 'mirela') { const T0 = vl5Tables().find(x => x.c === L.c), f = T0 && (T0.who || T0.lord || T0.guests[0]); if (f) vl5Face(n, f.x, f.y); if (!L.said) { L.said = 1; empSay(n, vl5Pick(L.a === 'jade' ? VL5_LINES.jade : VL5_LINES.mirela)); vl5Anim(n, L.a === 'jade' ? 'offer' : 'bow', 1200); } done = now - L.t0 >= L.dur; }
    else if (L.a === 'smoke') { done = now - L.t0 >= L.dur + 1500; if (done) { const back = [localToWorld(b, doorCol(b) + 0.5, b.h + 0.5), localToWorld(b, doorCol(b) + 0.5, b.h - 0.5)]; n.x = back[0][0]; n.y = back[0][1]; const rest = vl5Path({ x: back[1][0], y: back[1][1], fl: 0 }, L.home[0], L.home[1], 0) || []; L.ph = 'back'; L.pts = back.concat(rest); L.i = 0; empSmoke(n, 0); continue; } }
    else if (L.a === 'patrol') { if (!L.look && now - L.t0 > 2500) { L.look = 1; n.dir = (n.dir + 2 + Math.floor(Math.random() * 5)) % 8; } done = now - L.t0 >= L.dur; }
    else done = now - L.t0 >= (L.dur || 5000);
    if (done) { if (L.home) { const pts = vl5Path(n, L.home[0], L.home[1], fl); if (pts) { L.ph = 'back'; L.pts = pts; L.i = 0; continue; } } if (L.a === 'patrol') { const NL = vl5CapPatrol(n, T, fl, now); if (NL.pts) { S.vl5[T.id] = NL; continue; } } vl5Drop(T.id, girl); } } }
/* nenhuma moça aparece sozinha na mesa: só quem foi andando até lá oferece (o laço antigo fazia a moça surgir sentada) */
if (typeof vl4Tick === 'function') { const _vl4T5 = vl4Tick; vl4Tick = function (now) { try { const b = velB('velvet'); if (b) for (const T of vl4Girls()) { const n = S.npcs[T.id]; if (n && !n.dead && !n.downed && vl5Free(T.id, now)) vl5Hold(n, now); } } catch (e) { } return _vl4T5(now); }; }
if (typeof velTick === 'function') { const _vtV5 = velTick; velTick = function (now) { _vtV5(now); if (!S.estate) return; try { vl5Tick(now); } catch (e) { console.warn('veludo5', e); } }; }
/* com a suíte alugada, o capanga dela desce e fica de guarda junto ao elevador no térreo */
if (typeof vlPost === 'function') { const _vpV5 = vlPost; vlPost = function (T) { if (T.id === 'vl_c9' && typeof vlSuiteRec === 'function' && typeof S !== 'undefined' && S.estate && (vlSuiteRec().own || (typeof vlSuiteLord === 'function' && vlSuiteLord()))) return { at: [10.3, 4.7], fl: 0, sit: 0, dir: 3 }; return _vpV5(T); }; }
/* recusar a bebida: a próxima moça só vem de 3 a 5 minutos depois */
if (typeof velMsg === 'function') { const _vmV5 = velMsg; velMsg = function (p, m) { if (m && m.a === 'drink' && !m.ok) { p._vl5Next = Date.now() + vl5R(VL5.offerCd); } return _vmV5(p, m); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  const lady5 = (c1, c2, hair, skin, o) => () => Object.assign(heroLook('mage', 'adept', c1), { armor: 'robe', body: tone(c1), body2: tone(c2), accent: tone('#e2b74e'), trim: tone(c2), head: 'none', hairStyle: 'long', hair: tone(hair), skin: tone(skin), weapon: null, cape: false, capeTone: null, shield: null }, o || {});
  NPC_LOOKS.vl_comp3 = lady5('#1e6a5a', '#f0e6c8', '#0e0c0c', '#e8c8a8', { hairStyle: 'bun', eyes: '#3a6a4a' });     /* Íris: jade e marfim, coque preto */
  NPC_LOOKS.vl_comp4 = lady5('#c8a020', '#3a1a2a', '#6a2a1a', '#9a6a48', { hairStyle: 'tail' });                       /* Yan: ouro e vinho, rabo de cavalo ruivo-escuro */
  if (typeof FEM_KINDS !== 'undefined') { FEM_KINDS.add('vl_comp3'); FEM_KINDS.add('vl_comp4'); } if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { vl_comp3: 'mage', vl_comp4: 'mage' }); }
