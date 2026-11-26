// ============================================================
//  CASA DE VELUDO (2): a casa nova (Prancheta 26/11, estética chinesa com toque de Xangai)
//  Moradores nos lugares novos (térreo e porão), a banda no estrado e os capangas da Dama Ysolde.
//  Reservados pagos: a Mirela leva até a mesa (frente do palco 80, fundo 40, com garrafa de vinho doce).
//  Casa fechada: um lorde aluga a casa algumas noites (só entra quem tem título ou favor com a casa dele);
//  quem tem título pode pagar para fechar uma noite para os amigos.
//  Capangas: leais só à Ysolde e às meninas. Arma sacada, briga, importunar as meninas ou entrar onde não
//  pode: aviso e depois posto para fora; quem bate em alguém é banido da casa por alguns dias.
//  A Dama fica no escritório do porão e sobe ao salão uma hora por noite; fora disso, só descendo com o capanga.
// ============================================================
const VL2 = { booths: [{ n: 'Vermelho', p: 80 }, { n: 'Jade', p: 80 }, { n: 'Âmbar', p: 80 }, { n: 'Violeta', p: 40 }, { n: 'Rosa', p: 40 }, { n: 'Laranja', p: 40 }], close: 1500, ban: 3, ysUp: [22, 23], fav: 30, guests: 8 };
const VL_BSEAT = [[0.45, 3.6], [0.45, 5.6], [12.55, 5.6], [12.55, 7.6], [2.6, 10.55], [9.6, 10.55]];
for (let i = 0; i < VL_SPOTS.length; i++) VL_SPOTS[i] = VL_BSEAT[i];   /* os lordes sentam nos reservados */
{ for (let i = VEL_STAFF.length - 1; i >= 0; i--) if (VEL_STAFF[i].b === 'velvet') VEL_STAFF.splice(i, 1);
  VEL_STAFF.push(
    { id: 'vl_ysolde', b: 'velvet', kind: 'ysolde', name: 'Dama Ysolde Verane', at: [3.5, 1.5], fl: -1, sit: 1, dir: 7, menu: 'ysolde' },
    { id: 'vl_mirela', b: 'velvet', kind: 'vl_host', name: 'Mirela, a Anfitriã', at: [5.2, 9.3], dir: 3, menu: 'host' },
    { id: 'vl_jade', b: 'velvet', kind: 'vl_barmaid', name: 'Jade, do Balcão', at: [2.0, 0.8], dir: 7, menu: 'bar' },
    { id: 'vl_lis', b: 'velvet', kind: 'vl_comp1', name: 'Lis', at: [3.6, 7.4], dir: 1, menu: 'comp' },
    { id: 'vl_dalia', b: 'velvet', kind: 'vl_comp2', name: 'Dália', at: [9.4, 7.2], dir: 5, menu: 'comp' },
    { id: 'vl_d1', b: 'velvet', kind: 'vl_dancer1', name: 'Safira, dançarina', at: [6.5, 4.35], z: 0.054, dir: 7, show: 1 },
    { id: 'vl_d2', b: 'velvet', kind: 'vl_dancer2', name: 'Âmbar, dançarina', at: [5.85, 4.9], z: 0.054, dir: 7, show: 1 },
    { id: 'vl_m1', b: 'velvet', kind: 'vl_mus1', name: 'Wen, do erhu', at: [5.45, 1.25], z: 0.032, sit: 1, dir: 7, show: 1 },
    { id: 'vl_m2', b: 'velvet', kind: 'vl_mus2', name: 'Mei, da pipa', at: [6.55, 1.05], z: 0.032, sit: 1, dir: 7, show: 1 },
    { id: 'vl_m3', b: 'velvet', kind: 'vl_mus3', name: 'Bao, do tambor', at: [7.65, 0.55], z: 0.032, dir: 7, show: 1 },
    { id: 'vl_c1', b: 'velvet', kind: 'vl_cap', name: 'Tao, capanga da escada', at: [1.5, 9.45], dir: 1, menu: 'cap', cap: 1 },
    { id: 'vl_c2', b: 'velvet', kind: 'vl_cap', name: 'Long, capanga do salão', at: [8.3, 7.7], dir: 5, cap: 1 },
    { id: 'vl_c3', b: 'velvet', kind: 'vl_cap', name: 'Shen, capanga da cela', at: [8.4, 8.3], fl: -1, dir: 1, cap: 1 },
    { id: 'vl_c4', b: 'velvet', kind: 'vl_cap', name: 'Hu, capanga do escritório', at: [3.5, 6.65], fl: -1, dir: 7, cap: 1 },
    { id: 'vl_c5', b: 'velvet', kind: 'vl_cap', name: 'Kang, capanga de folga', at: [3.7, 8.5], fl: -1, sit: 1, dir: 1, cap: 1 },
    { id: 'vl_c6', b: 'velvet', kind: 'vl_cap', name: 'Zhu, capanga de folga', at: [6.3, 8.5], fl: -1, sit: 1, dir: 5, cap: 1 },
    { id: 'vl_pr', b: 'velvet', kind: 'k_prisoner', name: 'Devedor da casa (preso)', at: [11.6, 9.9], fl: -1, sit: 1, dir: 3 }); }
const vlYsUp = () => { const h = empHour(); return h >= VL2.ysUp[0] && h < VL2.ysUp[1]; };
const vlOpen = () => { const h = empHour(); return h >= VL_HOURS[0] && h < VL_HOURS[1]; };
const vlHash = (d, s) => { let x = (d * 374761393 + s * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
function vlPost(T) { if (T.id === 'vl_ysolde' && vlYsUp()) return { at: [4.6, 2.6], fl: 0, sit: 0, dir: 7 }; return T; }

// ---------------- SERVIDOR ----------------
function vlBi() { const b = velB('velvet'); return b ? BUILDINGS.indexOf(b) : -1; }
function vlInside(p) { const b = velB('velvet'); if (!b) return false; const fl = p.fl || 0; if (fl !== 0 && !(fl === -1 && p.fb === vlBi())) return false; return p.x >= b.x - 0.5 && p.x < b.x + b.w - 0.5 && p.y >= b.y - 0.5 && p.y < b.y + b.h - 0.5; }
velSpawn = function () { const h = empHour(), show = h >= VL_SHOW[0] && h < VL_SHOW[1];
  for (const T of VEL_STAFF) { const b = velB(T.b); if (!b) continue; const bi = BUILDINGS.indexOf(b), n = S.npcs[T.id], on = !T.show || show, P = vlPost(T), fl = P.fl || 0, [x, y] = localToWorld(b, P.at[0], P.at[1]);
    if (on && !n) { const v = { id: T.id, kind: T.kind, name: T.name, transient: true, court: 'praz', x, y, z: 0, fl, fb: fl ? bi : -1, hp: 300, maxHp: 300, downed: null, dead: false, dir: P.dir || 0, sitting: P.sit ? 1 : 0, vlCap: T.cap ? 1 : 0 }; S.npcs[v.id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); }
    else if (on && n && !n.downed && !n.dead && !n.dragBy && ((n.fl || 0) !== fl || Math.abs(n.x - x) > 0.05 || Math.abs(n.y - y) > 0.05)) { n.x = x; n.y = y; n.fl = fl; n.fb = fl ? bi : -1; n.sitting = P.sit ? 1 : 0; }
    else if (!on && n) visGone(n); }
  vlGuestsSpawn(); return show; };
velStaffNear = function (p, id) { const n = S.npcs[id]; if (!n || n.downed || n.dead) return null; if ((p.fl || 0) !== (n.fl || 0) || ((n.fl || 0) && p.fb !== n.fb)) return null; return dist(p.x, p.y, n.x, n.y) <= 4 ? n : null; };
/* ---- reservados ---- */
function vlBooths() { const R = velRec(), d = estDay(); if (!R.booth || R.booth.d !== d) R.booth = { d, own: {} }; return R.booth; }
function vlLordBooth() { const m = {}; HOUSES.forEach((h, k) => { if (velVisiting(h.id)) m[k % VL_SPOTS.length] = h.id; }); return m; }
function vlGuestBooths() { const d = estDay(), B = vlBooths(), L = vlLordBooth(), out = []; for (let c = 0; c < 6; c++) if (!B.own[c] && !L[c] && vlHash(d, 40 + c) < 0.3) out.push(c); return out; }
function vlBoothSt(c, p) { const B = vlBooths(), L = vlLordBooth(); if (B.own[c]) return p && B.own[c] === estOwner(p) ? 'seu' : 'ocupado'; if (L[c]) return 'lorde'; if (vlGuestBooths().includes(c)) return 'ocupado'; return 'livre'; }
function vlMine(p) { const B = vlBooths(), k = estOwner(p); for (const c in B.own) if (B.own[c] === k) return +c; return null; }
function vlSeatOf(c, k) { const bi = vlBi(); let n = 0; for (let i = 0; i < WORLD.seats.length; i++) { const s = WORLD.seats[i]; if (s.bi === bi && s.vb === c && !(s.fl || 0)) { if (n === k) return i; n++; } } return -1; }
/* clientes nos reservados ocupados (só nas horas da casa) */
const VL_GKINDS = ['dealer', 'butler', 'v_segm', 'dealer'];
function vlGuestsSpawn() { const want = {}; if (vlOpen()) for (const c of vlGuestBooths()) for (const k of [0, 2]) { const si = vlSeatOf(c, k); if (si < 0) continue; const s = WORLD.seats[si], id = 'vl_g' + c + k; want[id] = 1;
    if (!S.npcs[id]) { const v = { id, kind: VL_GKINDS[(c + k + estDay()) % VL_GKINDS.length], name: 'Cliente da casa', transient: true, court: 'praz', x: s.x, y: s.y, z: 0, fl: 0, fb: -1, hp: 150, maxHp: 150, downed: null, dead: false, dir: s.dir, sitting: 1 }; S.npcs[id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); } }
  for (const id in S.npcs) if (id.startsWith('vl_g') && !want[id]) visGone(S.npcs[id]); }
/* ---- casa fechada ---- */
function vlClosed() { const R = velRec(), d = estDay(); if (R.close && R.close.d === d) return { by: 'p', key: R.close.k, name: R.close.n, guests: R.close.g || [] };
  if (vlHash(d, 91) < 1 / 6) { const h = HOUSES[Math.floor(vlHash(d, 92) * HOUSES.length)]; if (h && (!hRec().st[h.id] || !hRec().st[h.id].extinct)) return { by: 'l', hid: h.id, name: h.lord }; } return null; }
function vlAllowed(p, C) { if (!C || p.dev) return true; if (C.by === 'p') return estOwner(p) === C.key || C.guests.includes(String(p.name || '').trim().toLowerCase());
  const fav = ((hRec().favor || {})[estOwner(p)] || {})[C.hid] || 0; return velFree(p) || fav >= VL2.fav; }
/* ---- capangas ---- */
function vlCapNear(p) { let best = null, bd = 1e9; for (const T of VEL_STAFF) { if (!T.cap) continue; const n = S.npcs[T.id]; if (!n || n.downed || n.dead) continue; const d = dist(p.x, p.y, n.x, n.y) + ((n.fl || 0) === (p.fl || 0) ? 0 : 50); if (d < bd) { bd = d; best = n; } } return best; }
function vlSay(p, txt) { const n = vlCapNear(p); if (n && (n.fl || 0) === (p.fl || 0)) empSay(n, txt); tell(p, (n ? n.name.split(',')[0] : 'O capanga') + ': “' + txt + '”'); }
function vlEject(p, txt, ban) { const b = velB('velvet'); if (!b) return; const [x, y] = localToWorld(b, doorCol(b) + 0.5, b.h + 0.9); vlSay(p, txt); p.sit = null; p.walking = false; if (p.atk) p.atk = null; p.x = x; p.y = y; p.fl = 0; p.fb = -1; p.vlDown = 0; p.vlW = null;
  Net.toOne(p.id, { t: 'tp', x, y, z: 0, fl: 0, fb: -1 }); if (ban) { velRec().ban = velRec().ban || {}; velRec().ban[estOwner(p)] = estDay() + VL2.ban; tell(p, 'Você foi banido da Casa de Veludo por ' + VL2.ban + ' dias.'); } if (typeof estateSave === 'function') estateSave(); }
function vlWarn(p, k, now, lines, txtOut) { const W = p.vlW && p.vlW.k === k && now - p.vlW.t < 20000 ? p.vlW : (p.vlW = { k, n: 0, t: now, next: 0 }); if (now < W.next) return; W.t = now;
  if (W.n >= lines.length) { vlEject(p, txtOut); return; } vlSay(p, lines[W.n]); W.n++; W.next = now + 4000; }
function vlZone(p) { const b = velB('velvet'), [u, v] = worldToLocal(b, p.x, p.y); if (u < 7 && v < 6) return 'office'; if (v >= 6 && u < 9) return 'guard'; return 'off'; }
const VL_LINES = { weapon: ['Guarde essa arma. Aqui dentro ninguém anda armado.', 'Último aviso: guarde a arma ou sai pela porta.'], down: ['Ei! Ninguém desce sem ser chamado.', 'Volte para o salão. Agora.'], off: ['Aí você não pode ficar. Volte.', 'Estou mandando: fora daí.'], girls: ['Deixe a moça em paz.', 'Mais uma e você sai pela porta.'] };
function vlGuard(now) { const b = velB('velvet'); if (!b) return; const R = velRec(), d = estDay(), C = vlOpen() ? vlClosed() : null, hitT = S.vlHitT || 0; S.vlHitT = now;
  /* quem bate em alguém dentro da casa é posto para fora e banido */
  const hurt = []; for (const q of Object.values(S.players)) if (vlInside(q)) hurt.push(q); for (const n of Object.values(S.npcs)) if (n.id.startsWith('vl_') && !n.dead) hurt.push(n);
  for (const q of hurt) { const H = q._hitBy; if (H && H.k === 'p' && H.t > hitT) { const a = S.players[H.id]; if (a && !a.dev && vlInside(a)) vlEject(a, 'Aqui ninguém levanta a mão para ninguém. Fora, e não volte.', 1); } }
  for (const p of Object.values(S.players)) { if (!vlInside(p) || p.downed || p.dev) { if (p.vlW && !vlInside(p)) p.vlW = null; continue; }
    if (R.ban && R.ban[estOwner(p)] > d) { vlEject(p, 'Você não é bem-vindo nesta casa. Ordem da Dama.'); continue; }
    if (C && !vlAllowed(p, C)) { vlEject(p, C.by === 'l' ? 'Esta noite a casa é d' + (C.name.startsWith('Lady') || C.name.startsWith('Dama') ? 'a ' : 'o ') + C.name + '. Só entra convidado.' : 'Esta noite a casa está fechada para os convidados de ' + C.name + '.'); continue; }
    if (!p.sheathed && !p.sheT) { vlWarn(p, 'weapon', now, VL_LINES.weapon, 'Avisei. Lá fora você brinca com a sua arma.'); continue; }
    if ((p.fl || 0) === -1) { const z = vlZone(p); if (!(now < (p.vlDown || 0)) && z !== 'guard') { vlWarn(p, 'down', now, VL_LINES.down, 'Quem desce sem ser chamado sai pela porta da frente.'); continue; }
      if (z === 'off') { vlWarn(p, 'off', now, VL_LINES.off, 'Curioso demais. Fora.'); continue; }
      if (!(now < (p.vlDown || 0)) && z === 'guard' && dist(p.x, p.y, ...localToWorld(b, 0.5, 7.5)) > 2.2) { vlWarn(p, 'down', now, VL_LINES.down, 'Quem desce sem ser chamado sai pela porta da frente.'); continue; } }
    if (p.vlW && p.vlW.k !== 'girls' && now - p.vlW.t > 6000) p.vlW = null; } }
/* ---- reservado: garrafa, sentar e levantar quem sentou no reservado dos outros ---- */
function vlBoothTick(now) { const bi = vlBi(), B = vlBooths(); for (const p of Object.values(S.players)) { if (!p.sit || (p.fl || 0) || !vlInside(p)) continue; const s = WORLD.seats.find(q => q.bi === bi && q.vb != null && Math.abs(q.x - p.x) < 0.05 && Math.abs(q.y - p.y) < 0.05); if (!s) continue;
    if (B.own[s.vb] === estOwner(p)) { if (now - (p.vlBT || 0) > 2000) { p.vlBT = now; p.cst = Math.min(cstMaxOf(p), (p.cst || 0) + 6); } continue; }
    if (now - (p.vlSitW || 0) < 6000) continue; p.vlSitW = now; const m = S.npcs.vl_mirela; if (m) empSay(m, 'Esse reservado é pago, querido. Fale comigo na entrada.'); tell(p, 'Mirela: “Os reservados são pagos. Fale comigo na entrada.”'); p.sit = null; Net.toOne(p.id, { t: 'velfx', k: 'stand' }); } }
if (typeof velTick === 'function') { const _vtV = velTick; velTick = function (now) { const run = S.estate && now - (S.velT || 0) >= 500; _vtV(now); if (!run) return; try { vlGuard(now); vlBoothTick(now); } catch (e) { console.warn('veludo2', e); } }; }
if (typeof velMenu === 'function') { const _vmV = velMenu; velMenu = function (p, T, n) {
  if (T.menu === 'host') { const R = velRec(), k = estOwner(p), C = vlClosed(), B = VL2.booths.map((q, c) => ({ c, n: q.n, p: q.p, st: vlBoothSt(c, p) }));
    Net.toOne(p.id, { t: 'velmenu', k: 'host2', show: VL_SHOW, on: empHour() >= VL_SHOW[0] && empHour() < VL_SHOW[1], open: vlOpen(), hours: VL_HOURS, wine: VL_WINE, comp: VL_COMPANY, seen: R.show[k] === estDay(), booths: B, full: B.every(x => x.st !== 'livre' && x.st !== 'seu'), mine: vlMine(p), closed: C ? { by: C.by, name: C.name, mine: C.by === 'p' && C.key === k, guests: C.by === 'p' && C.key === k ? C.guests : undefined } : null, canClose: velFree(p) && !C, closeCost: VL2.close, gold: p.gold | 0, ys: vlYsUp(), ysH: VL2.ysUp }); return; }
  if (T.menu === 'cap') { Net.toOne(p.id, { t: 'velmenu', k: 'cap', name: T.name, up: vlYsUp(), ok: Date.now() < (p.vlDown || 0), ysH: VL2.ysUp }); return; }
  return _vmV(p, T, n); }; }
if (typeof velMsg === 'function') { const _vmsV = velMsg; velMsg = function (p, m) { const now = Date.now(), R = velRec(), k = estOwner(p); if (p.downed || p.vlRest) return;
  if (m.a === 'booth') { const n = velStaffNear(p, 'vl_mirela'), c = m.c | 0, Q = VL2.booths[c]; if (!n || !Q) return; if (!vlOpen()) { empSay(n, 'Os reservados abrem às ' + VL_HOURS[0] + 'h, querido.'); return; }
    { const C = vlClosed(); if (C && !vlAllowed(p, C)) { empSay(n, C.by === 'l' ? 'Esta noite a casa é de ' + C.name + ', querido. Só para convidados.' : 'Esta noite a casa está fechada para os convidados de ' + C.name + '.'); return; } }
    if (vlMine(p) != null) { empSay(n, 'O reservado ' + VL2.booths[vlMine(p)].n + ' já é seu esta noite.'); return; } if (vlBoothSt(c, p) !== 'livre') { empSay(n, 'Esse já está tomado esta noite.'); return; }
    if ((p.gold || 0) < Q.p) { empSay(n, 'O reservado ' + Q.n + ' custa ' + Q.p + ' de ouro, com a garrafa.'); return; }
    p.gold -= Q.p; vlBooths().own[c] = k; p.water = Math.min(100, (p.water ?? 100) + 30); p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 60); p.buffs.tipsy = Math.max(p.buffs.tipsy || 0, now) + 60000; p.buffs.warm = Math.max(p.buffs.warm || 0, now + 300000);
    if (typeof estateSave === 'function') estateSave(); empSay(n, 'Por aqui, por favor. O reservado ' + Q.n + ' é seu esta noite, com a garrafa da casa.');
    const si = vlSeatOf(c, 0); if (si >= 0) { const s = WORLD.seats[si]; p.x = s.x; p.y = s.y; p.fl = 0; p.fb = -1; p.walking = false; Net.toOne(p.id, { t: 'tp', x: s.x, y: s.y, z: 0, fl: 0, fb: -1 }); Net.toOne(p.id, { t: 'velfx', k: 'sit', s: si }); }
    tell(p, 'Mirela leva você ao reservado ' + Q.n + ' (' + Q.p + ' de ouro). Na mesa, uma garrafa de vinho doce: mata a sede, aquece e devolve fôlego; sentado no seu reservado, o fôlego volta mais rápido.'); sendStat(p); return; }
  if (m.a === 'close') { const n = velStaffNear(p, 'vl_mirela'); if (!n) return; if (!velFree(p)) { empSay(n, 'Fechar a casa é só para quem tem título, querido.'); return; } if (vlClosed()) { empSay(n, 'Esta noite a casa já está fechada.'); return; }
    if ((p.gold || 0) < VL2.close) { empSay(n, 'Fechar a casa por uma noite custa ' + VL2.close + ' de ouro.'); return; }
    const g = String(m.g || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, VL2.guests); p.gold -= VL2.close; R.close = { d: estDay(), k, n: p.name, g };
    if (typeof estateSave === 'function') estateSave(); empSay(n, 'Está feito. Esta noite a Casa de Veludo é sua e dos seus convidados.'); tell(p, 'Você fechou a Casa de Veludo esta noite (' + VL2.close + ' de ouro). Entram só você' + (g.length ? ' e: ' + g.join(', ') : '') + '.'); sendStat(p); velMenu(p, VEL_STAFF.find(t => t.id === 'vl_mirela'), n); return; }
  if (m.a === 'guests') { const n = velStaffNear(p, 'vl_mirela'); if (!n || !R.close || R.close.d !== estDay() || R.close.k !== k) return; R.close.g = String(m.g || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, VL2.guests); if (typeof estateSave === 'function') estateSave(); empSay(n, 'Anotado. Os capangas já sabem quem entra.'); return; }
  if (m.a === 'down') { const n = velStaffNear(p, 'vl_c1'); if (!n) return; if (vlYsUp()) { empSay(n, 'A Dama está no salão agora. Procure por ela perto do balcão.'); return; }
    p.vlDown = now + 600000; empSay(n, 'Vou avisar a Dama. Pode descer, e não se perca pelo caminho.'); tell(p, 'O capanga deixa você descer ao escritório da Dama Ysolde (pela escada do canto sudoeste) pelos próximos 10 minutos. Só o escritório.'); return; }
  if ((m.a === 'company' || m.a === 'talk') && /^vl_(lis|dalia)$/.test(m.id || '')) { const L = (p.vlGirl || []).filter(t => now - t < 60000); L.push(now); p.vlGirl = L;
    if (m.a === 'company' && (p.gold || 0) < VL_COMPANY) L.push(now); if (L.length >= 9) { vlEject(p, 'A moça já disse o que tinha para dizer. Fora.'); p.vlGirl = []; return; } if (L.length >= 6) vlSay(p, VL_LINES.girls[L.length >= 7 ? 1 : 0]); }
  return _vmsV(p, m); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  NPC_LOOKS.vl_cap = () => Object.assign(heroLook('archer', 'scout', '#14141a'), { armor: 'vest', body: tone('#14141a'), body2: tone('#5a0a14'), accent: tone('#b08a3a'), trim: tone('#b08a3a'), legs: tone('#14141a'), boots: tone('#0e0e10'), head: 'none', hair: tone('#121212'), hairStyle: 'short', beard: null, weapon: null, quiver: false, shield: null, cape: false, capeTone: null, wS: 1.08 });
  NPC_LOOKS.vl_mus1 = () => Object.assign(heroLook('mage', 'adept', '#1a2a5a'), { armor: 'robe', body: tone('#1a2a5a'), body2: tone('#c8a040'), accent: tone('#c8a040'), trim: tone('#c8a040'), head: 'none', hair: tone('#1a1414'), hairStyle: 'short', beard: tone('#1a1414'), weapon: null, cape: false, capeTone: null, shield: null });
  NPC_LOOKS.vl_mus2 = () => Object.assign(heroLook('mage', 'adept', '#1e5a4a'), { armor: 'robe', body: tone('#1e5a4a'), body2: tone('#e8d0a0'), accent: tone('#e2b74e'), trim: tone('#e8d0a0'), head: 'none', hair: tone('#121010'), hairStyle: 'bun', skin: tone('#e8c4a4'), weapon: null, cape: false, capeTone: null, shield: null });
  NPC_LOOKS.vl_mus3 = () => Object.assign(heroLook('archer', 'scout', '#7a1a14'), { armor: 'vest', body: tone('#7a1a14'), body2: tone('#e8d0a0'), accent: tone('#c8a040'), legs: tone('#1a1414'), head: 'none', hair: tone('#1a1414'), hairStyle: 'short', beard: null, weapon: null, quiver: false, shield: null });
  if (typeof FEM_KINDS !== 'undefined') FEM_KINDS.add('vl_mus2');
  if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { vl_cap: 'archer', vl_mus1: 'mage', vl_mus2: 'mage', vl_mus3: 'archer' }); }
velNear = function () { const me = G.me; if (!me || me.downed) return null; const mf = me.fl || 0; let best = null, bd = 2.4;
  for (const T of VEL_STAFF) { if (!T.menu) continue; const e = G.npcs[T.id]; if (!e || e.dead || e.npDead || e.npDown) continue; if ((e.fl || 0) !== mf || (mf && e.fb !== me.fb)) continue; const d = Math.hypot(e.rx - me.x, e.ry - me.y); if (d < bd) { bd = d; best = T; } } return best; };
velHint = function () { const T = velNear(); if (!T) return null; return 'F: ' + ({ club: 'falar com o Anselmo (sócios)', bet: 'apostar nos dados', ysolde: 'falar com a Dama Ysolde (segredos)', host: 'falar com a Mirela (reservados)', bar: 'pedir uma taça', comp: 'falar com ' + T.name, cap: 'falar com o capanga (ver a Dama)' }[T.menu]); };
/* altura e direção de quem fica parado (palco, estrado da banda, reservados) */
if (typeof G !== 'undefined') setInterval(() => { if (!G.npcs) return; for (const T of VEL_STAFF) { if (T.b !== 'velvet') continue; const e = G.npcs[T.id]; if (!e) continue; if (T.z) e.z = T.z; if (T.dir != null && !e.npWalk) e.dir = T.id === 'vl_ysolde' && (e.fl || 0) === 0 ? 7 : T.dir; } }, 400);
VL_YSOLDE_Z = 0;
function vlHostMenu(m) { const st = { livre: 'livre', seu: '<b>seu</b>', ocupado: 'ocupado', lorde: 'de um lorde' };
  const rows = m.booths.map(q => '<button class="est-btn" data-bo="' + q.c + '"' + (q.st !== 'livre' || !m.open || m.mine != null ? ' disabled' : '') + '><span style="color:' + VL_BC[q.c] + '">●</span> ' + q.n + ' (' + (q.c < 3 ? 'frente do palco' : 'fundo') + ')<small>' + q.p + ' de ouro · ' + st[q.st] + '</small></button>').join('');
  const cl = m.closed ? (m.closed.by === 'l' ? '<div class="est-cost"><b>Esta noite a casa é de ' + m.closed.name + '.</b> Só entra quem tem título ou é bem-visto pela casa dele.</div>' : '<div class="est-cost"><b>Esta noite a casa está fechada para os convidados de ' + m.closed.name + '.</b></div>') : '';
  const own = m.closed && m.closed.mine ? '<div class="vel-sub">Seus convidados (nomes separados por vírgula)</div><input id="vl-g" class="vel-in" maxlength="160" value="' + (m.closed.guests || []).join(', ').replace(/"/g, '') + '"><div class="tq-btns"><button class="est-btn" data-gs>Atualizar a lista</button></div>' : '';
  const close = m.canClose ? '<div class="vel-sub">Fechar a casa esta noite</div><div class="est-cost">Com título, a casa pode ser sua por uma noite: só entram você e os convidados.</div><input id="vl-g" class="vel-in" maxlength="160" placeholder="Convidados: nomes separados por vírgula"><div class="tq-btns"><button class="est-btn" data-cl>Fechar a casa<small>' + m.closeCost + ' de ouro</small></button></div>' : '';
  const d = velPanel('Casa de Veludo', '<div class="est-cost">“Seja bem-vindo. Aqui dentro o mundo lá fora não entra.”<br><br>A casa recebe das ' + m.hours[0] + 'h à meia-noite. <b>Show</b> das dançarinas das ' + m.show[0] + 'h à meia-noite' + (m.on ? ' (agora)' : '') + ': quem assiste ' + VL_SHOW_SECS + ' s sai <b>Animado</b>' + (m.seen ? ' (você já viu hoje)' : '') + '. A Dama Ysolde sobe ao salão das ' + m.ysH[0] + 'h às ' + m.ysH[1] + 'h' + (m.ys ? ' (está aqui agora)' : '') + '; nos outros horários, fale com o capanga da escada. Taça no balcão: ' + m.wine + ' de ouro; companhia: ' + m.comp + '.</div>' + cl +
    '<div class="vel-sub">Reservados' + (m.full ? ' (casa cheia)' : '') + (m.open ? '' : ' (abrem às ' + m.hours[0] + 'h)') + '</div><div class="tq-btns vel-booths">' + rows + '</div>' + own + close);
  velBtn(d, '[data-bo]', b => ({ a: 'booth', c: +b.dataset.bo })); velBtn(d, '[data-cl]', () => ({ a: 'close', g: ($('vl-g') || {}).value || '' })); velBtn(d, '[data-gs]', () => ({ a: 'guests', g: ($('vl-g') || {}).value || '' })); }
function vlCapMenu(m) { const d = velPanel(m.name, '<div class="est-cost">“A Dama não recebe qualquer um.”<br><br>' + (m.up ? 'A Dama Ysolde está no salão agora (das ' + m.ysH[0] + 'h às ' + m.ysH[1] + 'h).' : m.ok ? 'Você já tem licença para descer ao escritório.' : 'O escritório da Dama fica no porão. O capanga pode avisá-la e deixar você descer (só o escritório, por 10 minutos).') + '</div>' + (m.up || m.ok ? '' : '<div class="tq-btns"><button class="est-btn" data-dn>Pedir para ver a Dama</button></div>')); velBtn(d, '[data-dn]', { a: 'down' }); }
if (typeof velShowMenu === 'function') { const _vsmV = velShowMenu; velShowMenu = function (m) { if (m.k === 'host2') return vlHostMenu(m); if (m.k === 'cap') return vlCapMenu(m); return _vsmV(m); }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'velfx' && m.k === 'sit') { setTimeout(() => { if (typeof sitDown === 'function' && WORLD.seats[m.s]) sitDown(m.s); }, 250); return true; }
  if (m.t === 'velfx' && m.k === 'stand') { if (typeof standUp === 'function' && G.me && G.me.sit) standUp(); return true; }
  return _peV2(m, now); }; }
