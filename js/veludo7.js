// ============================================================
//  MESA DIVIDIDA, LORDES E MERCADORES (pedido de 26/11)
//  · Mesinhas abertas perto do palco (sem reserva): os reservados nas paredes ficam mais exclusivos.
//  · Mesa dividida: o dono do reservado convida outro jogador (👥 Mesa) ou o jogador pede à Mirela para sentar com
//    alguém; quem é convidado aceita ou recusa. O convidado senta, recebe as moças, paga as próprias bebidas, pede
//    bandeja e, se o dono der a festa na suíte, é chamado para subir junto.
//  · Lordes e mercadores ricos de outras mesas: convide para a sua mesa. O lorde aceita conforme o seu favor com a casa
//    dele (rival quase sempre recusa). Cada bebida (30) dá favor; depois da segunda ele pode soltar um segredo, mas quanto
//    mais você arranca, mais chance de ele perceber: ofendido, perde favor, levanta e o boato corre a cidade.
//    O mercador (20 por bebida) pode pagar uma comissão em ouro ou contar como andam os cofres de uma casa.
// ============================================================
const VL7 = { lordDrink: 30, mercDrink: 20, favor: 3, drunk: 6, gift: [60, 150], askMs: 30000, declMs: 600000 };
const VL7_MERC = [['Mestre Orlan, da guilda dos tecelões', 'tecelões'], ['Dona Severa, armadora do porto', 'armadores'], ['Mestre Bartolo, mercador de especiarias', 'especiarias'], ['Senhor Quill, cambista da Rua do Ouro', 'cambistas'], ['Dona Isaura, comerciante de sedas', 'sedas'], ['Mestre Hoban, mercador de vinhos', 'vinhos']];
const VL7_L = { lordYes: ['Por que não? Uma taça não ofende ninguém.', 'Aceito. Mas quem paga é você.', 'Vamos ver se a conversa vale o vinho.'], lordNo: ['Não me sento com qualquer um.', 'Esta noite não.', 'Eu sei de que lado você está. Não, obrigado.'],
  mercYes: ['Negócios e vinho combinam.', 'Com prazer, com prazer!'], mercNo: ['Estou fechando um acordo aqui. Outra hora.'], cheers: ['À sua saúde!', 'Bom vinho, este.', 'Hum, você sabe receber.'], angry: ['Você acha que eu não percebo o que está fazendo?', 'Chega. Conheço esse tipo de pergunta.', 'Boa noite. E cuidado com a língua.'] };
const vl7Pick = L => L[Math.floor(Math.random() * L.length)];

// ---------------- SERVIDOR ----------------
/* a mesa é minha: sou o dono ou fui aceito nela esta noite */
function vlBoothMine(p, c) { const B = vlBooths(); if (B.own[c] === estOwner(p)) return true; const Gs = B.guests && B.guests[c]; return !!(B.own[c] && Gs && Gs.includes(estOwner(p))); }
function vl7Guests(c) { const B = vlBooths(); B.guests = B.guests || {}; return B.guests[c] || (B.guests[c] = []); }
function vl7OwnerP(c) { const k = vlBooths().own[c]; return k ? Object.values(S.players).find(q => estOwner(q) === k) : null; }
function vl7SeatAt(p, c) { const fs = vl4FreeSeat(p, c) >= 0 ? vl4FreeSeat(p, c) : (() => { for (let k = 0; k < 4; k++) { const i = vlSeatOf(c, k); if (i >= 0 && !Object.values(S.players).some(o => dist(o.x, o.y, WORLD.seats[i].x, WORLD.seats[i].y) < 0.25)) return i; } return -1; })(); return fs; }
function vl7Sit(q, si) { const s = WORLD.seats[si]; if (!s) return; q.x = s.x; q.y = s.y; q.fl = 0; q.fb = -1; q.walking = false; Net.toOne(q.id, { t: 'tp', x: s.x, y: s.y, z: 0, fl: 0, fb: -1 }); Net.toOne(q.id, { t: 'velfx', k: 'sit', s: si }); }
/* convite (dono → jogador) e pedido (jogador → dono, pela Mirela) */
function vl7Ask(to, from, c, kind) { S.vl7Ask = S.vl7Ask || {}; S.vl7Ask[to.id] = { from: from.id, c, kind, t: Date.now() }; const Q = VL2.booths[c];
  Net.toOne(to.id, { t: 'vl7ask', kind, name: from.name, booth: Q ? Q.n : '', ms: VL7.askMs }); tell(from, kind === 'req' ? 'A Mirela leva o seu pedido a ' + to.name + '.' : 'Você convida ' + to.name + ' para o reservado ' + (Q ? Q.n : '') + '.'); }
function vl7Answer(p, ok) { const A = S.vl7Ask && S.vl7Ask[p.id]; if (!A) return; delete S.vl7Ask[p.id]; if (Date.now() - A.t > VL7.askMs) return; const o = S.players[A.from]; if (!o) return;
  if (A.kind === 'party') { if (!ok) { tell(o, p.name + ' não vai subir.'); return; } const S0 = vlSuiteRec(), nm = String(p.name || '').trim().toLowerCase(); if (!S0.g.includes(nm)) S0.g.push(nm); const P = S.vlParty && S.vlParty[o.id]; if (P) { P.guests = P.guests || []; if (!P.guests.includes(p.id)) P.guests.push(p.id); } tell(p, 'Você vai à festa na suíte de ' + o.name + '. Vá junto até o elevador.'); tell(o, p.name + ' sobe com vocês.'); if (p.sit) { p.sit = null; Net.toOne(p.id, { t: 'velfx', k: 'stand' }); } return; }
  const guest = A.kind === 'inv' ? p : o, host = A.kind === 'inv' ? o : p; if (!ok) { tell(A.kind === 'inv' ? o : o, (A.kind === 'inv' ? p.name + ' recusou o convite.' : p.name + ' preferiu não dividir a mesa.')); return; }
  if (vlBooths().own[A.c] !== estOwner(host)) return; const Gs = vl7Guests(A.c), gk = estOwner(guest); if (!Gs.includes(gk)) Gs.push(gk); if (typeof estateSave === 'function') estateSave();
  const si = vl7SeatAt(host, A.c); if (si >= 0) vl7Sit(guest, si); const Q = VL2.booths[A.c]; tell(guest, 'Você senta no reservado ' + (Q ? Q.n : '') + ' com ' + host.name + '. As moças vêm à mesa, e as bebidas que você aceitar saem do seu bolso.'); tell(host, guest.name + ' senta com você.'); }
/* ---- mercadores ricos nas mesinhas ---- */
function vl7OpenSeats() { const b = velB('velvet'), bi = vlBi(); if (!b) return []; return WORLD.seats.map((s, i) => [s, i]).filter(([s]) => s.bi === bi && s.vb == null && !(s.fl || 0) && (() => { const [u, v] = worldToLocal(b, s.x, s.y); return v > 6.4 && v < 8.1 && u > 2.5 && u < 10.1; })()).map(q => q[1]); }
function vl7MercTonight() { const d = estDay(), n = 2 + (vlHash(d, 61) < 0.5 ? 1 : 0), out = []; for (let k = 0; k < n; k++) out.push((Math.floor(vlHash(d, 62 + k) * VL7_MERC.length) + k * 2) % VL7_MERC.length); return [...new Set(out)]; }
function vl7MercTick(now) { const b = velB('velvet'); if (!b) return; const want = {}; S.vl7At = S.vl7At || {};
  if (vlOpen() && !vlClosed()) { const seats = vl7OpenSeats(); vl7MercTonight().forEach((mi, k) => { const id = 'vl_mc' + mi, si = seats[k]; if (si == null) return; want[id] = 1; const A = S.vl7At[id], s = WORLD.seats[A ? A.seat : si]; if (!s) return;
      let n = S.npcs[id]; if (!n) { n = { id, kind: 'vl_merc' + (mi % 3), name: VL7_MERC[mi][0], transient: true, court: 'praz', merc: VL7_MERC[mi][1], x: s.x, y: s.y, z: 0, fl: 0, fb: -1, hp: 150, maxHp: 150, downed: null, dead: false, dir: s.dir, sitting: 1 }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
      if (!n.dead && !n.downed && (Math.abs(n.x - s.x) > 0.05 || Math.abs(n.y - s.y) > 0.05)) { n.x = s.x; n.y = s.y; n.dir = s.dir; n.sitting = 1; } }); }
  for (const id in S.npcs) if (/^vl_mc/.test(id) && !want[id]) { delete S.vl7At[id]; visGone(S.npcs[id]); } }
/* ---- lorde convidado senta à sua mesa ---- */
if (typeof velNoblePost === 'function') { const _vnpV7 = velNoblePost; velNoblePost = function (n) { const A = S.vl7At && S.vl7At[n.id]; if (A) { const s = WORLD.seats[A.seat]; if (s) return { x: s.x, y: s.y, fl: 0, out: 1 }; } return _vnpV7(n); }; }
/* quem está nas outras mesas (lordes nos reservados, mercadores nas mesinhas) e os jogadores da casa */
function vl7Cands(p) { const s = vl4BoothSeat(p), c = s ? s.vb : null, out = { players: [], npcs: [], mine: [] }; S.vl7At = S.vl7At || {};
  for (const q of Object.values(S.players)) { if (q === p || !vlInside(q) || (q.fl || 0)) continue; const qs = q.sit && vl4BoothSeat(q); if (qs && qs.vb === c) continue; out.players.push({ id: q.id, name: q.name }); }
  for (const n of Object.values(S.npcs)) { if (n.dead || n.downed || (n.fl || 0) || !vlInside(n)) continue; const lord = n.court === 'house' && n.hrole === 'lord', merc = /^vl_mc/.test(n.id); if (!lord && !merc) continue; const A = S.vl7At[n.id];
    if (A && A.pid === p.id) out.mine.push({ id: n.id, name: n.name, cost: lord ? VL7.lordDrink : VL7.mercDrink, drinks: A.drinks }); else if (!A) out.npcs.push({ id: n.id, name: n.name, lord: lord ? 1 : 0 }); }
  return out; }
function vl7InviteNpc(p, id) { const n = S.npcs[id], s = vl4BoothSeat(p), now = Date.now(); if (!n || !s || !vlBoothMine(p, s.vb)) return; S.vl7At = S.vl7At || {}; S.vl7Decl = S.vl7Decl || {}; if (S.vl7At[id]) return;
  if (now < (S.vl7Decl[id + ':' + p.id] || 0)) { tell(p, n.name + ' já recusou esta noite.'); return; }
  const lord = n.court === 'house' && n.hrole === 'lord'; let ch = 0.75;
  if (lord) { const F = ((hRec().favor[estOwner(p)] || {})[n.house]) || 0, vow = typeof infVow === 'function' ? infVow(p) : null, st = hRec().st[n.house], rel = vow && st && st.rel ? (st.rel[vow] || 0) : 0; ch = Math.max(0.08, Math.min(0.92, 0.3 + F / 120)); if (vow && vow !== n.house && rel < -25) ch *= 0.3; }
  if (Math.random() >= ch) { S.vl7Decl[id + ':' + p.id] = now + VL7.declMs; empSay(n, vl7Pick(lord ? VL7_L.lordNo : VL7_L.mercNo)); tell(p, n.name + ' recusa o convite.'); return; }
  const si = vl7SeatAt(p, s.vb); if (si < 0) { tell(p, 'Não há lugar livre no seu reservado.'); return; } S.vl7At[id] = { pid: p.id, c: s.vb, seat: si, drinks: 0, sus: 0, lord: lord ? 1 : 0, t: now };
  if (!lord) { const q = WORLD.seats[si]; n.x = q.x; n.y = q.y; n.dir = q.dir; n.sitting = 1; }
  empSay(n, vl7Pick(lord ? VL7_L.lordYes : VL7_L.mercYes)); tell(p, n.name + ' aceita e senta à sua mesa. Pague bebidas pelo botão 👥 Mesa: ' + (lord ? 'cada uma (' + VL7.lordDrink + ') dá favor com a casa dele, e depois da segunda ele pode soltar um segredo. Cuidado: quanto mais você arranca, mais ele desconfia.' : 'cada uma custa ' + VL7.mercDrink + '; mercador contente às vezes paga uma comissão ou conta como andam os cofres de uma casa.')); }
function vl7Leave(id, say) { const A = S.vl7At && S.vl7At[id], n = S.npcs[id]; if (!A) return; delete S.vl7At[id]; if (n && say) empSay(n, say); if (n && /^vl_mc/.test(id)) n.x += 0.001; }
function vl7Drink(p, id) { const A = S.vl7At && S.vl7At[id], n = S.npcs[id], now = Date.now(); if (!A || A.pid !== p.id || !n) return; const cost = A.lord ? VL7.lordDrink : VL7.mercDrink; if ((p.gold || 0) < cost) { tell(p, 'A bebida custa ' + cost + ' de ouro.'); return; } if (now < (A.next || 0)) { tell(p, n.name + ' ainda está com o copo cheio.'); return; }
  p.gold -= cost; A.drinks++; A.next = now + 8000; sendStat(p); empSay(n, vl7Pick(VL7_L.cheers)); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'cheer', ms: 1400 });
  if (A.lord) { const hid = n.house, H = HOUSE_BY[hid]; hFavor(p, hid, VL7.favor, 'bebida com ' + n.name);
    if (A.drinks >= 2) { const L = secList(p), left = ['plan', 'gold', 'power', 'crown', 'rel'].filter(k => !L.some(s => s.h === hid && s.k === k));
      if (A.sus > 0 && Math.random() < 0.12 * A.sus + 0.04 * (A.drinks - 2)) { hFavor(p, hid, -12, n.name + ' percebeu que você arrancava segredos'); vl7Leave(id, vl7Pick(VL7_L.angry)); if (typeof repAdd === 'function') repAdd(p, 'nobres', -2, 'tentou arrancar segredos de um lorde na Casa de Veludo');
        for (const q of Object.values(S.players)) if (q.id !== p.id) tell(q, 'Corre na cidade: ' + p.name + ' tentou arrancar segredos de ' + n.name + ' na Casa de Veludo.'); return; }
      if (left.length && Math.random() < 0.22 + 0.12 * (A.drinks - 2)) { A.sus++; secGive(p, hid, left[Math.floor(Math.random() * left.length)], 'com o vinho, ' + n.name + ' falou demais'); } }
    if (A.drinks >= VL7.drunk) vl7Leave(id, 'Bebi demais… boa noite.'); return; }
  if (A.drinks >= 2 && !A.gift && Math.random() < 0.45) { A.gift = 1; if (Math.random() < 0.35) { const h = HOUSES[Math.floor(Math.random() * HOUSES.length)]; secGive(p, h.id, 'gold', 'o mercador conta como andam os cofres'); } else { const g = Math.round(VL7.gift[0] + Math.random() * (VL7.gift[1] - VL7.gift[0])); p.gold += g; sendStat(p); tell(p, n.name + ' gostou da conversa e paga uma comissão por um negócio que você indicou: ' + g + ' de ouro.'); } }
  else if (A.drinks >= 3 && Math.random() < 0.08) vl7Leave(id, vl7Pick(VL7_L.angry));
  if (A.drinks >= VL7.drunk) vl7Leave(id, 'Chega por hoje. Boa noite!'); }
/* convidado deixa a mesa: levantou ou saiu da casa (o lorde/mercador volta ao lugar dele) */
function vl7Tick(now) { if (!S.estate) return; vl7MercTick(now); S.vl7At = S.vl7At || {};
  for (const id in S.vl7At) { const A = S.vl7At[id], p = S.players[A.pid], s = p && p.sit ? vl4BoothSeat(p) : null; if (!p || !s || s.vb !== A.c || !vlOpen()) vl7Leave(id, 'Bem, volto para a minha mesa.'); }
  /* botão 👥 Mesa para quem está sentado num reservado seu (dono ou convidado) */
  for (const p of Object.values(S.players)) { const s = p.sit && typeof vl4BoothSeat === 'function' ? vl4BoothSeat(p) : null, on = !!(s && vlBoothMine(p, s.vb)), own = !!(s && vlBooths().own[s.vb] === estOwner(p)); const key = on ? (own ? 2 : 1) : 0; if (key !== (p._vl7Seat | 0)) { p._vl7Seat = key; Net.toOne(p.id, { t: 'vl7seat', on: key ? 1 : 0, own: own ? 1 : 0 }); } } }
if (typeof velTick === 'function') { const _vtV7 = velTick; velTick = function (now) { _vtV7(now); if (!S.estate || now - (S.vl7T || 0) < 900) return; S.vl7T = now; try { vl7Tick(now); vl7PartyGuests(now); } catch (e) { console.warn('veludo7', e); } }; }
/* festa na suíte: os convidados da mesa são chamados e sobem junto */
function vl7PartyGuests(now) { for (const pid in S.vlParty || {}) { const P = S.vlParty[pid], o = S.players[pid]; if (!o) continue;
    if (!P.gAsk) { P.gAsk = 1; const B = vlBooths(); let c = null; for (const k in B.own) if (B.own[k] === estOwner(o)) c = +k; if (c == null) continue; for (const gk of vl7Guests(c)) { const q = Object.values(S.players).find(x => estOwner(x) === gk); if (q && q.id !== o.id && vlInside(q)) vl7Ask(q, o, c, 'party'); } }
    if (P.stage === 'up' && !P.gTp) { P.gTp = 1; const b = velB('velvet'), bi = vlBi(), [ex, ey] = localToWorld(b, 10, 3); for (const qid of P.guests || []) { const q = S.players[qid]; if (!q || (q.fl || 0) !== 0 || dist(q.x, q.y, ex, ey) > 3.2) continue; const [x, y] = localToWorld(b, 10.6, 3.4); q.fl = 3; q.fb = bi; q.x = x; q.y = y; q.sit = null; Net.toOne(q.id, { t: 'tp', x, y, z: 0, fl: 3, fb: bi }); tell(q, 'Você sobe com eles para a suíte.'); } } } }
if (typeof velMenu === 'function') { const _vmV7 = velMenu; velMenu = function (p, T, n) { _vmV7(p, T, n); if (T && T.menu === 'host') { const B = vlBooths(), L = []; for (const c in B.own) { const o = vl7OwnerP(+c); if (o && o.id !== p.id && !vlBoothMine(p, +c)) L.push({ c: +c, n: VL2.booths[c].n, who: o.name }); } if (L.length) Net.toOne(p.id, { t: 'vl7booths', l: L }); } }; }
if (typeof velMsg === 'function') { const _vmsV7 = velMsg; velMsg = function (p, m) { const now = Date.now();
  if (m && m.a === 'vl7c') { if (p.sit && vl4BoothSeat(p) && vlBoothMine(p, vl4BoothSeat(p).vb)) Net.toOne(p.id, Object.assign({ t: 'vl7cands' }, vl7Cands(p))); return; }
  if (m && m.a === 'vl7p') { const q = S.players[m.id], s = p.sit ? vl4BoothSeat(p) : null; if (!q || !s || vlBooths().own[s.vb] !== estOwner(p) || !vlInside(q)) { tell(p, 'Só o dono do reservado convida jogadores.'); return; } vl7Ask(q, p, s.vb, 'inv'); return; }
  if (m && m.a === 'vl7n') { vl7InviteNpc(p, String(m.id || '')); return; }
  if (m && m.a === 'vl7d') { vl7Drink(p, String(m.id || '')); return; }
  if (m && m.a === 'vl7ans') { vl7Answer(p, !!m.ok); return; }
  if (m && m.a === 'vl7req') { const n = velStaffNear(p, 'vl_mirela'), o = vl7OwnerP(m.c | 0); if (!n || !o) return; empSay(n, 'Vou perguntar, querido. Um momento.'); vl7Ask(o, p, m.c | 0, 'req'); return; }
  /* bandeja pedida pelo convidado: vale como se a mesa fosse dele */
  if (m && m.a === 'tray') { const s = p.sit && vl4BoothSeat(p); if (s && vlBoothMine(p, s.vb) && vlBooths().own[s.vb] !== estOwner(p)) { const B = vlBooths(), o = B.own[s.vb]; B.own[s.vb] = estOwner(p); try { return _vmsV7(p, m); } finally { B.own[s.vb] = o; } } }
  return _vmsV7(p, m); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  const merc = (c1, c2, hair, skin, o) => () => Object.assign(heroLook('mage', 'adept', c1), { armor: 'robe', body: tone(c1), body2: tone(c2), accent: tone('#d4a94a'), trim: tone('#d4a94a'), head: 'none', hairStyle: 'short', hair: tone(hair), skin: tone(skin), weapon: null, cape: false, capeTone: null, shield: null }, o || {});
  NPC_LOOKS.vl_merc0 = merc('#3a2a5a', '#e8d8a8', '#5a4a3a', '#d8a880', { beard: tone('#5a4a3a') }); NPC_LOOKS.vl_merc1 = merc('#1e4a3a', '#f0e0b0', '#2a1a12', '#b8845a'); NPC_LOOKS.vl_merc2 = merc('#6a3a12', '#e8c890', '#b8b0a0', '#e0b890', { beard: tone('#b8b0a0') });
  if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { vl_merc0: 'mage', vl_merc1: 'mage', vl_merc2: 'mage' }); }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV7 = progEvent; progEvent = function (m, now) {
  if (m.t === 'vl7seat') { let b = document.getElementById('vl7-btn'); if (!m.on) { if (b) b.remove(); const p = document.getElementById('vl7-panel'); if (p) p.remove(); return true; } if (!b) { b = document.createElement('button'); b.id = 'vl7-btn'; b.className = 'vl-tray vl7-btn'; b.textContent = '👥 Mesa'; b.style.bottom = '166px'; b.onclick = () => Net.send({ t: 'vel', a: 'vl7c' }); document.body.appendChild(b); } return true; }
  if (m.t === 'vl7cands') { let d = document.getElementById('vl7-panel'); if (d) d.remove(); d = document.createElement('div'); d.id = 'vl7-panel'; d.className = 'aff-box';
    const row = (lab, a, id, small) => '<button type="button" data-a="' + a + '" data-id="' + id + '">' + lab + (small ? '<small> ' + small + '</small>' : '') + '</button>';
    d.innerHTML = '<div class="aff-h">👥 Sua mesa</div>' + (m.mine.length ? '<div class="aff-ft">À sua mesa:</div><div class="aff-row">' + m.mine.map(q => row('🍷 Bebida para ' + escAff(q.name.split(',')[0]), 'vl7d', q.id, '(' + q.cost + ')')).join('') + '</div>' : '') +
      (m.npcs.length ? '<div class="aff-ft">Nas outras mesas:</div><div class="aff-row">' + m.npcs.map(q => row((q.lord ? '👑 ' : '💰 ') + 'Convidar ' + escAff(q.name.split(',')[0]), 'vl7n', q.id)).join('') + '</div>' : '') +
      (m.players.length ? '<div class="aff-ft">Jogadores na casa:</div><div class="aff-row">' + m.players.map(q => row('Convidar ' + escAff(q.name), 'vl7p', q.id)).join('') + '</div>' : '') +
      (!m.mine.length && !m.npcs.length && !m.players.length ? '<div class="aff-ft">Ninguém para convidar agora.</div>' : '') + '<div class="aff-row"><button type="button" data-x>Fechar</button></div>';
    d.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { Net.send({ t: 'vel', a: b.dataset.a, id: b.dataset.id }); if (b.dataset.a !== 'vl7d') d.remove(); else setTimeout(() => Net.send({ t: 'vel', a: 'vl7c' }), 400); }); d.querySelector('[data-x]').onclick = () => d.remove(); document.body.appendChild(d); return true; }
  if (m.t === 'vl7ask') { const old = document.getElementById('vl7-ask'); if (old) old.remove(); const d = document.createElement('div'); d.id = 'vl7-ask'; d.className = 'aff-box ask';
    const txt = m.kind === 'inv' ? escAff(m.name) + ' convida você para o reservado ' + escAff(m.booth) + '.' : m.kind === 'req' ? escAff(m.name) + ' pede para sentar no seu reservado ' + escAff(m.booth) + '.' : escAff(m.name) + ' chama você para a festa na suíte.';
    d.innerHTML = '<div class="aff-h">👥 ' + txt + '</div><div class="aff-row"><button type="button" class="ok" data-a="1">Aceitar</button><button type="button" data-a="0">Recusar</button></div>';
    d.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { Net.send({ t: 'vel', a: 'vl7ans', ok: +b.dataset.a }); d.remove(); }); document.body.appendChild(d); setTimeout(() => d.remove(), m.ms || 30000); return true; }
  if (m.t === 'vl7booths') { const d = $('tequip'); if (d && d.classList.contains('vel-panel')) { let box = d.querySelector('.vel-share'); if (box) box.remove(); box = document.createElement('div'); box.className = 'vel-share';
      box.innerHTML = '<div class="vel-sub">Dividir uma mesa</div><div class="est-cost">A Mirela pergunta ao dono se você pode sentar com ele.</div><div class="tq-btns">' + m.l.map(q => '<button class="est-btn" data-rq="' + q.c + '">Sentar com ' + escAff(q.who) + '<small>reservado ' + escAff(q.n) + '</small></button>').join('') + '</div>';
      d.appendChild(box); velBtn(d, '[data-rq]', b => ({ a: 'vl7req', c: +b.dataset.rq })); } return true; }
  return _peV7(m, now); }; }
