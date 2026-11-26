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

// ============================================================
//  CASA DE VELUDO (versão 2): os quartos do 1º e do 2º andar e o elevador
//  Sobe-se pelo elevador de latão (a ascensorista leva ao andar). A subida é livre, mas quem é pego num andar
//  sem motivo (sem quarto ali, sem companhia) arruma problema com o capanga do andar.
//  Quarto por noite (100, com a Mirela): cama para dormir (descanso de pousada) e chá ou vinho servidos pela criada.
//  Companhia: Lis ou Dália sobem com o cliente e entram num quarto livre; com os 6 ocupados, ela pede para esperar.
// ============================================================
const VL_ROOM = { price: 100, tea: 10, wine: 15, visit: 900000, girlAway: 60000 };
const VL_RSPOT = { 1: { p: [2.5, 1.5], g: [2.5, 0.55], u: [0, 4] }, 2: { p: [6.5, 1.5], g: [7.5, 0.55], u: [4, 9] }, 3: { p: [9.5, 1.5], g: [10.5, 1.5], u: [9, 13] } };   /* onde o cliente e a moça ficam em cada quarto (1 a 3, da esquerda para a direita) */
VEL_STAFF.push(
  { id: 'vl_lift', b: 'velvet', kind: 'vl_liftg', name: 'Lan, a ascensorista', at: [9.6, 2.5], dir: 1 },
  { id: 'vl_c7', b: 'velvet', kind: 'vl_cap', name: 'Fei, capanga do 1º andar', at: [1.5, 8.6], fl: 1, dir: 1, cap: 1 },
  { id: 'vl_c8', b: 'velvet', kind: 'vl_cap', name: 'Lei, capanga do 2º andar', at: [11.5, 9.2], fl: 2, dir: 5, cap: 1 });
{ const _vpV = vlPost; vlPost = function (T) { const A = typeof S !== 'undefined' && S.vlAway && S.vlAway[T.id]; if (A && Date.now() < A.until) return A; return _vpV(T); }; }

// ---------------- SERVIDOR ----------------
function vlRooms() { const bi = vlBi(), out = []; BEDS.forEach((b, i) => { if (b.vlRoom && b.bi === bi) out.push({ k: b.vlRoom, fl: b.fl, n: +b.vlRoom % 100, bed: i }); }); return out; }
function vlRoomRec() { const R = velRec(), d = estDay(); if (!R.rooms || R.rooms.d !== d) R.rooms = { d, own: {} }; return R.rooms; }
function vlRoomOf(p) { const O = vlRoomRec().own, k = estOwner(p); for (const r in O) if (O[r] === k) return r; return null; }
function vlRoomFree(k) { return !vlRoomRec().own[k] && !(S.vlUse && Date.now() < (S.vlUse[k] || 0)); }
function vlRoomAt(p) { const fl = p.fl || 0; if (fl < 1 || p.fb !== vlBi()) return null; const b = velB('velvet'), [u, v] = worldToLocal(b, p.x, p.y); if (v > 2) return null; for (const n of [1, 2, 3]) { const R = VL_RSPOT[n].u; if (u >= R[0] && u < R[1]) return String(fl * 100 + n); } return null; }
function vlVisitOk(p, k) { return !!p.vlVisit && Date.now() < p.vlVisit.until && (k == null || p.vlVisit.k === k); }
function vlBedOk(p, bed) { return !!p.dev || bed.vlRoom === vlRoomOf(p) || vlVisitOk(p, bed.vlRoom); }
function vlBedRest(p) { const b = BEDS[p.sleep]; return !!b && !!b.vlRoom && vlBedOk(p, b); }
function vlToRoom(p, k) { const b = velB('velvet'), bi = vlBi(), fl = +k[0], S0 = VL_RSPOT[+k % 100], [x, y] = localToWorld(b, S0.p[0], S0.p[1]); p.x = x; p.y = y; p.fl = fl; p.fb = bi; p.sit = null; p.walking = false; if (p.atk) p.atk = null; Net.toOne(p.id, { t: 'tp', x, y, z: 0, fl, fb: bi }); }
/* andares de cima: quem não tem motivo arruma problema com o capanga do andar */
const VL_LINES2 = { up: ['Ei, você. Este andar é só para quem tem quarto aqui.', 'Desça agora, ou eu desço você.'], room: ['Esse quarto não é seu.', 'Fora do quarto alheio. Já.'] };
function vlUpGuard(p, now) { const fl = p.fl || 0; if (fl < 1 || p.dev) return false; const b = velB('velvet'), mine = vlRoomOf(p), vis = vlVisitOk(p) ? p.vlVisit.k : null, here = vlRoomAt(p);
  if (here && here !== mine && here !== vis) { vlWarn(p, 'room', now, VL_LINES2.room, 'Quem entra no quarto dos outros sai pela porta da frente.'); return true; }
  const reason = (mine && +mine[0] === fl) || (vis && +vis[0] === fl); if (reason) return false;
  const [ax, ay] = localToWorld(b, 10.5, 3.5); if (dist(p.x, p.y, ax, ay) < 1.6) return false;   /* saindo do elevador: ainda dá para voltar */
  vlWarn(p, 'up', now, VL_LINES2.up, 'Curioso demais. Lá fora você passeia.'); return true; }
{ const _vgV = vlGuard; vlGuard = function (now) { _vgV(now); for (const p of Object.values(S.players)) if (vlInside2(p) && !p.downed) vlUpGuard(p, now); }; }
function vlInside2(p) { const b = velB('velvet'); return !!b && (p.fl || 0) > 0 && p.fb === vlBi() && p.x >= b.x - 0.5 && p.x < b.x + b.w - 0.5 && p.y >= b.y - 0.5 && p.y < b.y + b.h - 0.5; }
{ const _viV2 = vlInside; vlInside = function (p) { return _viV2(p) || vlInside2(p); }; }
/* a moça volta ao salão depois de um tempo */
function vlAwayTick(now) { if (!S.vlAway) return; for (const id in S.vlAway) if (now >= S.vlAway[id].until) delete S.vlAway[id]; }
{ const _vtV2 = velTick; velTick = function (now) { _vtV2(now); try { vlAwayTick(now); } catch (e) { } }; }
{ const _vmV2 = velMenu; velMenu = function (p, T, n) { if (T.menu !== 'host') return _vmV2(p, T, n); _vmV2(p, T, n);
  const mine = vlRoomOf(p); Net.toOne(p.id, { t: 'velrooms', price: VL_ROOM.price, mine, rooms: vlRooms().map(r => ({ k: r.k, fl: r.fl, st: r.k === mine ? 'seu' : vlRoomFree(r.k) ? 'livre' : 'ocupado' })) }); }; }
{ const _vmsV2 = velMsg; velMsg = function (p, m) { const now = Date.now(); if (p.downed || p.vlRest) return;
  if (m.a === 'room') { const n = velStaffNear(p, 'vl_mirela'); if (!n) return; { const C = vlClosed(); if (C && !vlAllowed(p, C)) { empSay(n, 'Esta noite a casa é de ' + C.name + '. Só para convidados.'); return; } }
    if (vlRoomOf(p)) { empSay(n, 'O quarto ' + vlRoomOf(p) + ' já é seu até o meio-dia.'); return; } const r = vlRooms().find(q => (m.k ? q.k === m.k : true) && vlRoomFree(q.k)); if (!r) { empSay(n, 'Os quartos estão todos ocupados esta noite.'); return; }
    if ((p.gold || 0) < VL_ROOM.price) { empSay(n, 'O quarto custa ' + VL_ROOM.price + ' de ouro por noite.'); return; }
    p.gold -= VL_ROOM.price; vlRoomRec().own[r.k] = estOwner(p); if (typeof estateSave === 'function') estateSave(); empSay(n, 'O quarto ' + r.k + ' é seu até o meio-dia. A Lan leva você no elevador; peça chá ou vinho na mesinha do quarto.');
    tell(p, 'Quarto ' + r.k + ' (' + r.fl + 'º andar) alugado por ' + VL_ROOM.price + ' de ouro, até o meio-dia. Suba pelo elevador de latão, na parede leste. Dormir na cama dá Bem descansado, como na pousada.'); sendStat(p); velMenu(p, VEL_STAFF.find(t => t.id === 'vl_mirela'), n); return; }
  if (m.a === 'company') { const T = VEL_STAFF.find(t => t.id === m.id && t.menu === 'comp'), n = T && velStaffNear(p, T.id); if (!n) return;
    const L = (p.vlGirl || []).filter(t => now - t < 60000); if (L.length >= 9) return _vmsV2(p, m);
    if ((p.gold || 0) < VL_COMPANY) return _vmsV2(p, m);
    const own = vlRoomOf(p), r = own ? vlRooms().find(q => q.k === own) : vlRooms().find(q => vlRoomFree(q.k)); if (!r) { empSay(n, 'Os quartos estão todos ocupados. Espere um pouco comigo, querido.'); return; }
    p.gold -= VL_COMPANY; S.vlUse = S.vlUse || {}; S.vlUse[r.k] = now + 90000; p.vlVisit = { k: r.k, until: now + VL_ROOM.visit };
    const b = velB('velvet'), S0 = VL_RSPOT[r.n]; S.vlAway = S.vlAway || {}; S.vlAway[T.id] = { at: S0.g, fl: r.fl, sit: 0, dir: 7, until: now + VL_ROOM.girlAway };
    { const [gx, gy] = localToWorld(b, S0.g[0], S0.g[1]); n.x = gx; n.y = gy; n.fl = r.fl; n.fb = vlBi(); n.sitting = 0; }
    vlToRoom(p, r.k); p.vlRest = { until: now + 6000, who: T.name }; empSay(n, 'Venha. O quarto ' + r.k + ' está livre, lá em cima ninguém nos incomoda.');
    Net.toOne(p.id, { t: 'velfx', k: 'fade', who: T.name, ms: 6000 }); sendStat(p); return; }
  if (m.a === 'talk' && m.id === 'vl_tea') { const k = vlRoomAt(p); if (!k || (k !== vlRoomOf(p) && !vlVisitOk(p, k))) { tell(p, 'Só quem está no próprio quarto pode pedir à criada.'); return; } Net.toOne(p.id, { t: 'velmenu', k: 'tea', room: k, tea: VL_ROOM.tea, wine: VL_ROOM.wine }); return; }
  if (m.a === 'tea') { const k = vlRoomAt(p), w = m.w === 'wine' ? 'wine' : 'tea', cost = VL_ROOM[w]; if (!k || (k !== vlRoomOf(p) && !vlVisitOk(p, k)) || p.vlTeaT > now) return; if ((p.gold || 0) < cost) { tell(p, 'A bandeja custa ' + cost + ' de ouro.'); return; }
    p.gold -= cost; p.vlTeaT = now + 9000; const b = velB('velvet'), S0 = VL_RSPOT[+k % 100], [mx, my] = localToWorld(b, S0.p[0] + 0.6, 2.6), id = 'vl_maid' + k;
    if (!S.npcs[id]) { const v = { id, kind: 'vl_maid', name: 'Xiu, a criada', transient: true, court: 'praz', x: mx, y: my, z: 0, fl: +k[0], fb: vlBi(), hp: 100, maxHp: 100, downed: null, dead: false, dir: 3 }; S.npcs[id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); }
    setTimeout(() => { const n = S.npcs[id]; if (n) empSay(n, w === 'tea' ? 'Chá de jasmim, bem quente. Com licença.' : 'Vinho de arroz da adega da Dama. Com licença.'); if (S.players[p.id]) { if (w === 'tea') { p.cst = Math.min(cstMaxOf(p), (p.cst || 0) + 60); p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.1)); p.buffs.warm = Math.max(p.buffs.warm || 0, Date.now() + 180000); tell(p, 'A criada serve o chá de jasmim: fôlego e um pouco de vida de volta, e o corpo aquecido.'); }
      else { p.water = Math.min(100, (p.water ?? 100) + 20); p.cst = Math.min(cstMaxOf(p), (p.cst || 0) + 40); p.buffs.tipsy = Math.max(p.buffs.tipsy || 0, Date.now()) + 30000; p.buffs.warm = Math.max(p.buffs.warm || 0, Date.now() + 180000); tell(p, 'A criada serve o vinho de arroz: mata a sede, devolve fôlego e sobe um pouco à cabeça.'); } sendStat(p); } }, 2500);
    setTimeout(() => { const n = S.npcs[id]; if (n) visGone(n); }, 9000); tell(p, 'Você toca a sineta. A criada já sobe com a bandeja (' + cost + ' de ouro).'); sendStat(p); return; }
  return _vmsV2(p, m); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  NPC_LOOKS.vl_liftg = () => Object.assign(heroLook('mage', 'adept', '#8a1418'), { armor: 'robe', body: tone('#8a1418'), body2: tone('#d4a94a'), accent: tone('#d4a94a'), trim: tone('#d4a94a'), head: 'none', hair: tone('#121010'), hairStyle: 'bun', skin: tone('#e8c4a4'), weapon: null, cape: false, capeTone: null, shield: null });
  NPC_LOOKS.vl_maid = () => Object.assign(heroLook('mage', 'adept', '#1a1a1e'), { armor: 'robe', body: tone('#1a1a1e'), body2: tone('#f0ece4'), accent: tone('#f0ece4'), trim: tone('#f0ece4'), head: 'none', hair: tone('#1a1414'), hairStyle: 'braid', skin: tone('#d8a880'), weapon: null, cape: false, capeTone: null, shield: null });
  if (typeof FEM_KINDS !== 'undefined') { FEM_KINDS.add('vl_liftg'); FEM_KINDS.add('vl_maid'); } if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { vl_liftg: 'mage', vl_maid: 'mage' }); }
{ const _vnV = velNear; velNear = function () { const T = _vnV(); if (T) return T; const me = G.me; if (!me || me.downed || !(me.fl > 0)) return null; const b = BUILDINGS[me.fb]; if (!b || b.deco !== 'velvet') return null;
  for (const f of interiorLayout(b, me.fl).F) if (f.t === 'vtea') { const [x, y] = localToWorld(b, f.i + 0.5, f.j + 0.5); if (Math.hypot(x - me.x, y - me.y) < 1.4) return { id: 'vl_tea', menu: 'tea', name: 'a sineta' }; } return null; }; }
{ const _vhV = velHint; velHint = function () { const T = velNear(); if (T && T.menu === 'tea') return 'F: tocar a sineta (chá ou vinho)'; return _vhV(); }; }
if (typeof liftFloorName === 'function') { const _lfV = liftFloorName; liftFloorName = function (b, f) { if (b.deco === 'velvet') return f === 0 ? 'Térreo — salão, palco e saída' : f + 'º andar — quartos ' + (f * 100 + 1) + ' a ' + (f * 100 + 3); return _lfV(b, f); }; }
function vlTeaMenu(m) { const d = velPanel('Quarto ' + m.room, '<div class="est-cost">Uma sineta de latão na mesinha chama a criada.</div><div class="tq-btns"><button class="est-btn" data-tw="tea">Chá de jasmim<small>' + m.tea + ' de ouro · fôlego, um pouco de vida, aquece</small></button><button class="est-btn" data-tw="wine">Vinho de arroz<small>' + m.wine + ' de ouro · mata a sede, fôlego, sobe à cabeça</small></button></div>'); velBtn(d, '[data-tw]', b => ({ a: 'tea', w: b.dataset.tw })); }
function vlRoomsBox(m) { const d = $('tequip'); if (!d || !d.classList.contains('vel-panel')) return; let box = d.querySelector('.vel-rooms'); if (box) box.remove(); box = document.createElement('div'); box.className = 'vel-rooms';
  const st = { livre: 'livre', seu: '<b>seu</b>', ocupado: 'ocupado' };
  box.innerHTML = '<div class="vel-sub">Quartos (até o meio-dia)</div><div class="est-cost">Cama para dormir (Bem descansado, como na pousada) e chá ou vinho servidos no quarto. Suba pelo elevador. As companhias também usam os quartos.</div><div class="tq-btns vel-booths">' + m.rooms.map(r => '<button class="est-btn" data-rm="' + r.k + '"' + (r.st !== 'livre' || m.mine ? ' disabled' : '') + '>Quarto ' + r.k + ' (' + r.fl + 'º andar)<small>' + m.price + ' de ouro · ' + st[r.st] + '</small></button>').join('') + '</div>';
  d.appendChild(box); velBtn(d, '[data-rm]', b => ({ a: 'room', k: b.dataset.rm })); }
if (typeof velShowMenu === 'function') { const _vsmV2 = velShowMenu; velShowMenu = function (m) { if (m.k === 'tea') return vlTeaMenu(m); return _vsmV2(m); }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV3 = progEvent; progEvent = function (m, now) { if (m.t === 'velrooms') { vlRoomsBox(m); return true; } return _peV3(m, now); }; }
