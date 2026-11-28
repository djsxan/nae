// ============================================================
//  RUA DOS PRAZERES (2): Clube do Cervo de Prata e Casa de Veludo
//  Clube: taxa de sócio por dia (grátis com título), aposta rápida nos dados (20 a 300);
//         o lorde que perde paga com um segredo.
//  Casa de Veludo: só mulheres. Dama Ysolde Verane no balcão da escadaria (compra e vende segredos),
//         show das dançarinas à noite, taça no balcão, companhia a portas fechadas (a tela escurece).
//  Segredos: guardados por jogador em S.estate.vel.sec (até 12).
// ============================================================
const CLUB_FEE = 30, CLUB_BETS = [20, 50, 100, 200, 300], CLUB_MAXDAY = 12, CLUB_HOURS = [19, 21];
const VL_WINE = 15, VL_COMPANY = 60, VL_SECRET = 80, VL_SELL = 40, VL_SHOW = [20, 24], VL_HOURS = [21, 24], VL_OPEN = [18, 12], VL_SHOW_SECS = 20, SEC_MAX = 12;
const CLUB_SPOTS = [[4.5, 3.5], [2.5, 3.5], [5.5, 5.5], [4.5, 6.5], [6.5, 3.5]], VL_SPOTS = [[1.5, 3.0], [1.5, 6.0], [10.5, 3.0], [10.5, 6.0], [2.5, 6.5]];
const VEL_STAFF = [
  { id: 'cl_anselmo', b: 'club', kind: 'butler', name: 'Anselmo, o Mordomo do Clube', at: [2.5, 6.6], menu: 'club' },
  { id: 'cl_hugo', b: 'club', kind: 'dealer', name: 'Mestre Hugo, da Mesa dos Dados', at: [3.5, 4.6], menu: 'bet' },
  { id: 'vl_ysolde', b: 'velvet', kind: 'ysolde', name: 'Dama Ysolde Verane', at: [6, 0.75], menu: 'ysolde' },
  { id: 'vl_mirela', b: 'velvet', kind: 'vl_host', name: 'Mirela, a Anfitriã', at: [7.4, 9.5], menu: 'host' },
  { id: 'vl_jade', b: 'velvet', kind: 'vl_barmaid', name: 'Jade, do Balcão', at: [1.5, 7.2], menu: 'bar' },
  { id: 'vl_lis', b: 'velvet', kind: 'vl_comp1', name: 'Lis', at: [1.5, 4.5], menu: 'comp' },
  { id: 'vl_dalia', b: 'velvet', kind: 'vl_comp2', name: 'Dália', at: [10.5, 7.5], menu: 'comp' },
  { id: 'vl_d1', b: 'velvet', kind: 'vl_dancer1', name: 'Safira, dançarina', at: [8.9, 8.7], show: 1 },
  { id: 'vl_d2', b: 'velvet', kind: 'vl_dancer2', name: 'Ambar, dançarina', at: [10.1, 9.2], show: 1 },
];

// ---------------- SERVIDOR ----------------
function velB(k) { return BUILDINGS.find(b => b.kind === k); }
function velRec() { const E = S.estate; E.vel = E.vel || { pass: {}, bets: {}, sec: {}, skill: {}, show: {} }; return E.vel; }
function velFree(p) { return !!p.dev || (typeof crownRec === 'function' && (crownRec().title[crownKey(p)] | 0) >= 1); }
function clubPass(p) { return velFree(p) || velRec().pass[estOwner(p)] === estDay(); }
function velIn(p, k) { const b = velB(k); if (!b || (p.fl || 0) !== 0) return false; return p.x >= b.x - 0.5 && p.x < b.x + b.w - 0.5 && p.y >= b.y - 0.5 && p.y < b.y + b.h - 0.5; }
const CLUB_WIN = 0.3, CLUB_PAY = 3;   /* mesa dos dados: 30% de vitória, a vitória paga o triplo da aposta */
function clubVisiting(hid) { const k = HOUSES.findIndex(h => h.id === hid), h = empHour(); return k >= 0 && h >= CLUB_HOURS[0] && h < CLUB_HOURS[1] && (estDay() + k) % 2 === 0; }
function velVisiting(hid) { const k = HOUSES.findIndex(h => h.id === hid), h = empHour(); return k >= 0 && h >= VL_HOURS[0] && h < VL_HOURS[1] && (estDay() + k) % 3 === 1; }
function velNoblePost(n) {   /* o lorde no Clube das 19h às 21h; na Casa de Veludo das 21h à meia-noite */
  if (n.hrole !== 'lord') return null; const k = HOUSES.findIndex(h => h.id === n.house), club = clubVisiting(n.house), vel = !club && velVisiting(n.house); if (!club && !vel) return null;
  const b = velB(club ? 'club' : 'velvet'); if (!b) return null; const sp = (club ? CLUB_SPOTS : VL_SPOTS)[k % 5], [x, y] = localToWorld(b, sp[0], sp[1]); return { x, y, fl: 0, out: 1 }; }
if (typeof thNoblePost === 'function') { const _tnp = thNoblePost; thNoblePost = function (n) { return _tnp(n) || velNoblePost(n); }; }
function velNoblesIn(k) { const b = velB(k); return Object.values(S.npcs).filter(n => n.court === 'house' && n.hrole === 'lord' && !n.dead && !n.downed && (k === 'club' ? clubVisiting(n.house) : velVisiting(n.house)) && b && n.x >= b.x - 0.5 && n.x < b.x + b.w && n.y >= b.y - 0.5 && n.y < b.y + b.h); }
/* ---- segredos ---- */
function secList(p) { const R = velRec(), k = estOwner(p); return R.sec[k] || (R.sec[k] = []); }
function secText(hid, k) { const h = HOUSE_BY[hid], s = hRec().st[hid];
  if (k === 'visit') return h.lord + ' frequenta a Casa de Veludo à noite, às escondidas da família.';
  if (k === 'bet') return h.lord + ' perde alto nas mesas do Clube do Cervo de Prata.';
  if (k === 'gold') return 'Os cofres da ' + h.n + ' estão em ' + s.gold + ' de 100' + (s.gold < 35 ? ': a casa está endividada.' : s.gold > 65 ? ': a casa nada em ouro.' : '.');
  if (k === 'power') return 'A ' + h.n + ' tem ' + s.power + ' de 100 em homens de armas.';
  if (k === 'crown') return 'A lealdade verdadeira da ' + h.n + ' à coroa é ' + s.crown + ' (de -100 a 100).';
  if (k === 'rel') { const o = HOUSES.filter(x => x.id !== hid).sort((a, b) => ((s.rel || {})[a.id] || 0) - ((s.rel || {})[b.id] || 0))[0]; return 'A ' + h.n + ' trama em segredo contra a ' + o.n + '.'; }
  return 'O plano da ' + h.n + ': ' + h.plan; }
function secGive(p, hid, k, how) { const L = secList(p); if (L.some(s => s.h === hid && s.k === k)) k = ['plan', 'gold', 'power', 'crown', 'rel'].find(q => !L.some(s => s.h === hid && s.k === q)) || k;
  const s = { h: hid, k, d: estDay(), t: secText(hid, k) }; L.unshift(s); L.length = Math.min(L.length, SEC_MAX); if (typeof estateSave === 'function') estateSave(); tell(p, 'Segredo (' + how + '): ' + s.t + ' Fica guardado; a Dama Ysolde compra segredos.'); return s; }
function secRandom(p, pref) { const L = secList(p), all = []; for (const h of HOUSES) for (const k of ['plan', 'gold', 'power', 'crown', 'rel']) if (!L.some(s => s.h === h.id && s.k === k)) all.push([h.id, k]);
  if (pref && !L.some(s => s.h === pref[0] && s.k === pref[1])) return pref; return all.length ? all[Math.floor(Math.random() * all.length)] : null; }
/* ---- funcionárias e funcionários ---- */
function velSpawn() { const h = empHour(), show = h >= VL_SHOW[0] && h < VL_SHOW[1];
  for (const T of VEL_STAFF) { const b = velB(T.b), n = S.npcs[T.id], on = !T.show || show; if (!b) continue;
    if (on && !n) { const [x, y] = localToWorld(b, T.at[0], T.at[1]), v = { id: T.id, kind: T.kind, name: T.name, transient: true, court: 'praz', x, y, z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false, dir: 0 }; S.npcs[v.id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); }
    else if (!on && n) visGone(n); } return show; }
function velTick(now) {
  if (!S.estate || now - (S.velT || 0) < 500) return; S.velT = now; const show = velSpawn(), R = velRec(), day = estDay();
  if (show && now - (S.velDance || 0) > 3000) { S.velDance = now; for (const id of ['vl_d1', 'vl_d2']) { const n = S.npcs[id]; if (n) near(n.x, n.y, { t: 'anim', w: 'n', id, a: 'dance', ms: 3200 }); } }
  for (const p of Object.values(S.players)) {
    if (p.vlRest && now >= p.vlRest.until) { const C = p.vlRest; p.vlRest = null; if (p.sit === 'g') p.sit = null; p.buffs.rested = now + 600000; p.cst = cstMaxOf(p); p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3));
      tell(p, 'Você se levanta leve e descansado: Bem descansado por 10 minutos, fôlego cheio e 30% da vida de volta.'); if (typeof tatVelSeen === 'function') tatVelSeen(p, C.who);
      const vis = HOUSES.filter(h => velVisiting(h.id)); if (Math.random() < (vis.length ? 0.5 : 0.25)) { const pick = secRandom(p, vis.length ? [vis[0].id, 'visit'] : null); if (pick) secGive(p, pick[0], pick[1], C.who + ' contou baixinho'); } sendStat(p); }
    if (show && velIn(p, 'velvet') && !p.vlRest && R.show[estOwner(p)] !== day) { p.vlShow = (p.vlShow || 0) + 0.5;
      if (p.vlShow >= VL_SHOW_SECS) { p.vlShow = 0; R.show[estOwner(p)] = day; p.buffs.cheer = now + 600000; tell(p, 'O show das dançarinas levanta o ânimo: Animado por 10 minutos (+8% de experiência).'); sendStat(p); } }
    else if (!show || !velIn(p, 'velvet')) p.vlShow = 0;
  }
}
function velStaffNear(p, id) { const n = S.npcs[id]; return n && (p.fl || 0) === 0 && dist(p.x, p.y, n.x, n.y) <= 4 ? n : null; }
function velMenu(p, T, n) { const R = velRec(), k = estOwner(p), now = empHour();
  if (T.menu === 'club') Net.toOne(p.id, { t: 'velmenu', k: 'club', fee: CLUB_FEE, pass: clubPass(p), free: velFree(p), nob: velNoblesIn('club').map(x => HOUSE_BY[x.house].lord), today: HOUSES.filter(h => (estDay() + HOUSES.indexOf(h)) % 2 === 0).map(h => h.lord), h: CLUB_HOURS });
  else if (T.menu === 'bet') { if (!clubPass(p)) { empSay(n, 'As mesas são para os sócios. Fale com o Anselmo, na entrada.'); return; }
    Net.toOne(p.id, { t: 'velmenu', k: 'bet', bets: CLUB_BETS, left: CLUB_MAXDAY - ((R.bets[k] || [0, 0])[0] === estDay() ? R.bets[k][1] : 0), skill: Math.min(3, Math.floor((R.skill[k] || 0) / 8)), n: R.skill[k] || 0, nob: velNoblesIn('club').map(x => [x.house, HOUSE_BY[x.house].lord]), gold: p.gold | 0 }); }
  else if (T.menu === 'ysolde') Net.toOne(p.id, { t: 'velmenu', k: 'ysolde', sec: secList(p).map(s => ({ h: s.h, t: s.t, d: s.d })), buy: VL_SECRET, sell: VL_SELL, gold: p.gold | 0, day: estDay() });
  else if (T.menu === 'host') Net.toOne(p.id, { t: 'velmenu', k: 'host', show: VL_SHOW, on: now >= VL_SHOW[0] && now < VL_SHOW[1], wine: VL_WINE, comp: VL_COMPANY, seen: R.show[k] === estDay() });
  else if (T.menu === 'bar') Net.toOne(p.id, { t: 'velmenu', k: 'bar', wine: VL_WINE });
  else if (T.menu === 'comp') Net.toOne(p.id, { t: 'velmenu', k: 'comp', id: T.id, name: T.name, cost: VL_COMPANY }); }
function velMsg(p, m) {
  const now = now_(), R = velRec(), k = estOwner(p); if (p.downed || p.vlRest) return;
  if (m.a === 'talk') { const T = VEL_STAFF.find(t => t.id === m.id && t.menu), n = T && velStaffNear(p, T.id); if (n) velMenu(p, T, n); return; }
  if (m.a === 'pay') { const n = velStaffNear(p, 'cl_anselmo'); if (!n) return; if (clubPass(p)) { tell(p, 'Você já é sócio por hoje.'); return; }
    if ((p.gold || 0) < CLUB_FEE) { empSay(n, 'A taxa de sócio é de ' + CLUB_FEE + ' de ouro por dia, senhor.'); return; }
    p.gold -= CLUB_FEE; R.pass[k] = estDay(); if (typeof estateSave === 'function') estateSave(); empSay(n, 'Bem-vindo ao Cervo de Prata. As mesas de dados ficam à esquerda; o Mestre Hugo cuida das apostas.'); sendStat(p); velMenu(p, VEL_STAFF[0], n); return; }
  if (m.a === 'bet') { const n = velStaffNear(p, 'cl_hugo'), amt = m.amt | 0; if (!n || p.vlBet || !CLUB_BETS.includes(amt)) return; if (!clubPass(p)) { empSay(n, 'As mesas são para os sócios.'); return; }
    const B = R.bets[k] && R.bets[k][0] === estDay() ? R.bets[k] : (R.bets[k] = [estDay(), 0]); if (B[1] >= CLUB_MAXDAY) { empSay(n, 'Chega por hoje. A casa não gosta de ver ninguém sair sem as botas.'); return; }
    if ((p.gold || 0) < amt) { empSay(n, 'Aqui se aposta o que se tem na bolsa.'); return; }
    const lord = m.vs ? velNoblesIn('club').find(x => x.house === m.vs) : null; if (m.vs && !lord) { empSay(n, 'O lorde não está à mesa agora.'); return; }
    const d = () => 1 + Math.floor(Math.random() * 6), sk = Math.min(3, Math.floor((R.skill[k] || 0) / 8)), ob = lord ? 2 : 1; let a = [d(), d()], b = [d(), d()], guard = 0;
    const win = Math.random() < CLUB_WIN; while ((a[0] + a[1] + sk > b[0] + b[1] + ob) !== win || a[0] + a[1] + sk === b[0] + b[1] + ob) { if (guard++ > 200) break; a = [d(), d()]; b = [d(), d()]; }   /* 30% de vitória; os dados mostram um resultado coerente */ B[1]++; R.skill[k] = (R.skill[k] || 0) + 1; p.vlBet = 1; p.gold -= amt; sendStat(p);   /* a aposta vai para a mesa */
    Net.toOne(p.id, { t: 'velfx', k: 'dice', a, b, sk, ob, win, amt, vs: lord ? HOUSE_BY[lord.house].lord : 'a mesa', ms: 2600 }); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: 'Dados na mesa!', ms: 1 });
    setTimeout(() => { p.vlBet = 0; if (!S.players[p.id]) return;
      if (win) { p.gold += amt * CLUB_PAY; tell(p, 'Você ganhou nos dados (' + (a[0] + a[1] + sk) + ' contra ' + (b[0] + b[1] + ob) + '): recebeu ' + (amt * CLUB_PAY) + ' de ouro (' + CLUB_PAY + ' vezes a aposta de ' + amt + ').');
        if (lord && Math.random() < 0.3) { const s = secRandom(p, [lord.house, 'bet']); if (s) secGive(p, s[0], s[1], HOUSE_BY[lord.house].lord + ' perdeu, bebeu demais e falou'); } }   /* contra o lorde: paga em ouro e, às vezes, solta um segredo */
      else { tell(p, 'Você perdeu ' + amt + ' de ouro nos dados (' + (a[0] + a[1] + sk) + ' contra ' + (b[0] + b[1] + ob) + ').'); if (lord) hFavor(p, lord.house, 2, 'o lorde gosta de ganhar'); }
      if (typeof estateSave === 'function') estateSave(); sendStat(p); }, 2600); return; }
  if (m.a === 'wine') { const n = velStaffNear(p, 'vl_jade'); if (!n) return; if ((p.gold || 0) < VL_WINE) { empSay(n, 'A taça custa ' + VL_WINE + ' de ouro, querido.'); return; }
    p.gold -= VL_WINE; p.water = Math.min(100, (p.water ?? 100) + 20); p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 40); p.buffs.tipsy = Math.max(p.buffs.tipsy || 0, now) + 30000; p.buffs.warm = Math.max(p.buffs.warm || 0, now + 180000); empSay(n, 'Vinho doce de Solmire, com cravo e mel. Devagar, que ele engana.'); tell(p, 'Uma taça de vinho doce: sede aliviada, fôlego de volta e um calor bom.'); sendStat(p); return; }
  if (m.a === 'company') { const T = VEL_STAFF.find(t => t.id === m.id && t.menu === 'comp'), n = T && velStaffNear(p, T.id); if (!n) return; if ((p.gold || 0) < VL_COMPANY) { empSay(n, 'Outra noite, então. São ' + VL_COMPANY + ' de ouro.'); return; }
    p.gold -= VL_COMPANY; p.vlRest = { until: now + 6000, who: T.name }; p.walking = false; if (p.atk) p.atk = null; empSay(n, 'Venha. Lá em cima ninguém nos incomoda.'); Net.toOne(p.id, { t: 'velfx', k: 'fade', who: T.name, ms: 6000 }); sendStat(p); return; }
  if (m.a === 'buy') { const n = velStaffNear(p, 'vl_ysolde'); if (!n) return; if ((p.gold || 0) < VL_SECRET) { empSay(n, 'Segredo bom custa ' + VL_SECRET + ' de ouro. Os ruins eu dou de graça, e não valem nada.'); return; }
    const vis = HOUSES.filter(h => velVisiting(h.id) || (estDay() + HOUSES.indexOf(h)) % 3 === 1), pick = secRandom(p, vis.length ? [vis[0].id, 'visit'] : null); if (!pick) { empSay(n, 'Você já sabe tudo o que eu sei. Por enquanto.'); return; }
    p.gold -= VL_SECRET; secGive(p, pick[0], pick[1], 'comprado da Dama Ysolde'); empSay(n, 'Guarde bem. Um segredo vale mais na mão do que na boca.'); sendStat(p); velMenu(p, VEL_STAFF[2], n); return; }
  if (m.a === 'sell') { const n = velStaffNear(p, 'vl_ysolde'), L = secList(p), i = m.i | 0; if (!n || !L[i]) return; L.splice(i, 1); p.gold += VL_SELL; if (typeof estateSave === 'function') estateSave(); empSay(n, 'Esse eu ainda não tinha. Foi um prazer.'); sendStat(p); velMenu(p, VEL_STAFF[2], n); return; }
}

// ---------------- CLIENTE ----------------
if (typeof BUFF_NAMES !== 'undefined') BUFF_NAMES.cheer = 'Animado (+8% de experiência)';
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function' && typeof tone === 'function') {
  const lady = (c1, c2, hair, skin, o) => () => Object.assign(heroLook('mage', 'adept', c1), { armor: 'robe', body: tone(c1), body2: tone(c2), accent: tone('#e2b74e'), trim: tone(c2), head: 'none', hairStyle: 'long', hair: tone(hair), skin: tone(skin), weapon: null, cape: false, capeTone: null, shield: null }, o || {});
  NPC_LOOKS.ysolde = lady('#6a1230', '#d8a83a', '#1a1014', '#e8c4a4', { hairStyle: 'bun', hS: 1.04, wS: 0.96, capeTone: tone('#3a0a1c'), cape: true });   /* ex-cortesã que venceu: vinho e ouro */
  NPC_LOOKS.vl_host = lady('#8a2a4a', '#f0d8b0', '#5a2a14', '#d8a880');
  NPC_LOOKS.vl_barmaid = lady('#2a4a3a', '#d8c090', '#2a1a10', '#b8845a', { hairStyle: 'braid' });
  NPC_LOOKS.vl_comp1 = lady('#b03a5a', '#f4e0c8', '#c8903a', '#f0d0b8', { hairStyle: 'curly' });
  NPC_LOOKS.vl_comp2 = lady('#4a2a6a', '#e8c8e0', '#1a1418', '#c8946a');
  NPC_LOOKS.vl_dancer1 = lady('#1a5a8a', '#e2b74e', '#1a1014', '#c8946a', { hairStyle: 'tail', barefoot: true });
  NPC_LOOKS.vl_dancer2 = lady('#c87a1a', '#f0e0a0', '#7a3a14', '#e8c4a4', { hairStyle: 'braid', barefoot: true });
  NPC_LOOKS.butler = () => Object.assign(heroLook('archer', 'scout', '#1e1e24'), { armor: 'vest', body: tone('#1e1e24'), body2: tone('#e8e4da'), accent: tone('#b9c0c8'), legs: tone('#1e1e24'), boots: tone('#121214'), head: 'none', hair: tone('#b8b4ac'), hairStyle: 'short', beard: null, weapon: null, quiver: false, shield: null, cape: false, hS: 1.05, wS: 0.92 });
  NPC_LOOKS.dealer = () => Object.assign(heroLook('archer', 'scout', '#1e5a32'), { armor: 'vest', body: tone('#e8e4da'), body2: tone('#1e5a32'), accent: tone('#c9a24a'), legs: tone('#2a2a30'), boots: tone('#1a1410'), head: 'none', hair: tone('#3a2a1a'), hairStyle: 'short', beard: tone('#3a2a1a'), weapon: null, quiver: false, shield: null, cape: false });
  if (typeof FEM_KINDS !== 'undefined') for (const k of ['ysolde', 'vl_host', 'vl_barmaid', 'vl_comp1', 'vl_comp2', 'vl_dancer1', 'vl_dancer2']) FEM_KINDS.add(k);
  if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { ysolde: 'mage', vl_host: 'mage', vl_barmaid: 'mage', vl_comp1: 'mage', vl_comp2: 'mage', vl_dancer1: 'mage', vl_dancer2: 'mage', butler: 'archer', dealer: 'archer' }); }
function velNear() { const me = G.me; if (!me || me.downed || (me.fl || 0)) return null; let best = null, bd = 2.4; for (const T of VEL_STAFF) { if (!T.menu) continue; const e = G.npcs[T.id]; if (!e || e.dead) continue; const d = Math.hypot(e.rx - me.x, e.ry - me.y) - (T.id === 'vl_ysolde' ? 1.4 : 0); if (d < bd) { bd = d; best = T; } } return best; }
function velHint() { const T = velNear(); if (!T) return null; return 'F: ' + ({ club: 'falar com o Anselmo (sócios)', bet: 'apostar nos dados', ysolde: 'falar com a Dama Ysolde (segredos)', host: 'falar com a Mirela', bar: 'pedir uma taça', comp: 'falar com ' + T.name }[T.menu]); }
function velPanel(title, html) { let d = $('tequip'); if (d) d.remove(); d = document.createElement('div'); d.id = 'tequip'; d.className = 'gpanel vel-panel'; d.innerHTML = '<div class="gp-head"><span>' + title + '</span><button class="gp-x" data-x>✕</button></div>' + html; document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove(); return d; }
function velBtn(d, sel, msg, keep) { d.querySelectorAll(sel).forEach(b => b.onclick = () => { if (!keep) d.remove(); G.path = null; G.pathGoal = null; Net.send(Object.assign({ t: 'vel' }, typeof msg === 'function' ? msg(b) : msg)); }); }
function velShowMenu(m) {
  if (m.k === 'club') { const who = m.nob.length ? 'Agora nas mesas: <b>' + m.nob.join('</b> e <b>') + '</b>.' : m.today.length ? 'Hoje, das ' + m.h[0] + 'h às ' + m.h[1] + 'h, jogam aqui: <b>' + m.today.join('</b>, <b>') + '</b>.' : 'Hoje nenhum lorde marcou mesa.';
    const d = velPanel('Clube do Cervo de Prata', '<div class="est-cost">“Casa aberta a quem paga a taxa do dia. Quem tem título entra por cortesia.”<br><br><b>Mesa dos dados</b>: aposta de 20 a 300 de ouro com o Mestre Hugo, resolvida em segundos. ' + who + ' Contra um lorde, se ele perde, paga com um <b>segredo</b> da casa.</div><div class="tq-btns">' + (m.pass ? '<button class="est-btn on" disabled>' + (m.free ? 'Entrada livre<small>cortesia para quem tem título</small>' : 'Sócio por hoje<small>vale até o fim do dia</small>') + '</button>' : '<button class="est-btn" data-pay>Pagar a taxa de sócio<small>' + m.fee + ' de ouro · vale o dia todo</small></button>') + '</div>'); velBtn(d, '[data-pay]', { a: 'pay' }); }
  else if (m.k === 'bet') { G.velBet = m; const d = velPanel('Mesa dos dados', '<div class="est-cost">Dois dados para cada lado. Você ganha <b>3 em cada 10</b> partidas, e a vitória paga <b>o triplo</b> da aposta. Restam <b>' + m.left + '</b> apostas hoje.</div><div class="vel-sub">Contra quem</div><div class="tq-btns vel-vs"><button class="est-btn on" data-vs="">A mesa<small>ganha ou perde ouro</small></button>' + m.nob.map(([h, n]) => '<button class="est-btn" data-vs="' + h + '">' + n + '<small>paga em ouro; às vezes solta um segredo</small></button>').join('') + '</div><div class="vel-sub">Aposta</div><div class="tq-btns vel-amt">' + m.bets.map(a => '<button class="est-btn" data-amt="' + a + '"' + (a > m.gold || m.left <= 0 ? ' disabled' : '') + '>' + a + '<small>de ouro</small></button>').join('') + '</div>');
    let vs = ''; d.querySelectorAll('[data-vs]').forEach(b => b.onclick = () => { vs = b.dataset.vs; d.querySelectorAll('[data-vs]').forEach(o => o.classList.toggle('on', o === b)); }); velBtn(d, '[data-amt]', b => ({ a: 'bet', amt: +b.dataset.amt, vs: vs || undefined })); }
  else if (m.k === 'ysolde') { const d = velPanel('Dama Ysolde Verane', '<div class="est-cost">“Nesta casa os homens falam demais. Eu só escuto, e cobro.”<br><br>Um segredo novo custa <b>' + m.buy + '</b> de ouro. Os que você trouxer, ela compra por <b>' + m.sell + '</b>.</div><div class="vel-sub">Seus segredos (' + m.sec.length + ' de ' + SEC_MAX + ')</div><div class="vel-secs">' + (m.sec.length ? m.sec.map((s, i) => '<div class="vel-sec"><span><b>' + ((HOUSE_BY[s.h] || {}).ic || '') + ' ' + ((HOUSE_BY[s.h] || {}).n || '') + '</b><br>' + s.t + '</span><button class="est-btn ghost" data-sell="' + i + '">Vender<small>+' + m.sell + '</small></button></div>').join('') : '<div class="est-cost">Você ainda não guarda nenhum segredo.</div>') + '</div><div class="tq-btns"><button class="est-btn" data-buy' + (m.gold < m.buy ? ' disabled' : '') + '>Comprar um segredo<small>' + m.buy + ' de ouro</small></button></div>');
    velBtn(d, '[data-buy]', { a: 'buy' }, true); velBtn(d, '[data-sell]', b => ({ a: 'sell', i: +b.dataset.sell }), true); }
  else if (m.k === 'host') velPanel('Casa de Veludo', '<div class="est-cost">“Seja bem-vindo. Aqui dentro o mundo lá fora não entra.”<br><br><b>Show</b>: as dançarinas sobem ao palco das ' + m.show[0] + 'h à meia-noite' + (m.on ? ' (está acontecendo agora)' : '') + '. Quem assiste por ' + VL_SHOW_SECS + ' s sai <b>Animado</b> por 10 minutos' + (m.seen ? ' (você já assistiu hoje)' : '') + '.<br><b>Balcão</b>: taça de vinho doce com a Jade, ' + m.wine + ' de ouro.<br><b>Companhia</b>: a Lis e a Dália recebem a portas fechadas, ' + m.comp + ' de ouro.<br><b>Dama Ysolde</b>: no balcão da escadaria, compra e vende segredos.</div>');
  else if (m.k === 'bar') { const d = velPanel('Jade, do Balcão', '<div class="est-cost">“Vinho doce de Solmire, com cravo e mel.”<br><br>Mata a sede, devolve fôlego e aquece. Sobe um pouco à cabeça.</div><div class="tq-btns"><button class="est-btn" data-w>Uma taça<small>' + m.wine + ' de ouro</small></button></div>'); velBtn(d, '[data-w]', { a: 'wine' }); }
  else if (m.k === 'comp') { const d = velPanel(m.name, '<div class="est-cost">“Fica um pouco comigo? Lá em cima é mais quieto.”<br><br>A portas fechadas: a tela escurece por alguns segundos. Você volta <b>Bem descansado</b> por 10 minutos, com o fôlego cheio e 30% da vida de volta. Às vezes ela conta um segredo que ouviu.</div><div class="tq-btns"><button class="est-btn" data-c>Subir com ' + m.name + '<small>' + m.cost + ' de ouro</small></button></div>'); velBtn(d, '[data-c]', { a: 'company', id: m.id }); }
}
function velDice(m) {   /* os dados rolam por um instante e param no resultado */
  const d = velPanel('Mesa dos dados', '<div class="vel-dice"><div><small>Você' + (m.sk ? ' (+' + m.sk + ')' : '') + '</small><div class="vel-d" data-a></div></div><div class="vel-x">×</div><div><small>' + m.vs + ' (+' + m.ob + ')</small><div class="vel-d" data-b></div></div></div><div class="est-cost vel-res">Os dados rolam…</div>');
  const A = d.querySelector('[data-a]'), B = d.querySelector('[data-b]'), R = d.querySelector('.vel-res'), face = n => '<span class="vel-die">' + '⚀⚁⚂⚃⚄⚅'[n - 1] + '</span>', rnd = () => 1 + Math.floor(Math.random() * 6), t0 = performance.now();
  const tick = () => { if (!d.isConnected) return; const el = performance.now() - t0; if (el < m.ms - 500) { A.innerHTML = face(rnd()) + face(rnd()); B.innerHTML = face(rnd()) + face(rnd()); setTimeout(tick, 90); return; }
    A.innerHTML = face(m.a[0]) + face(m.a[1]); B.innerHTML = face(m.b[0]) + face(m.b[1]); const sa = m.a[0] + m.a[1] + m.sk, sb = m.b[0] + m.b[1] + m.ob; R.innerHTML = '<b>' + sa + ' contra ' + sb + '</b>: ' + (m.win ? 'você ganhou e recebeu ' + (m.amt * 3) + ' de ouro (o triplo da aposta)' + (m.vs === 'a mesa' ? '.' : '; às vezes o lorde também solta um segredo.') : 'você perdeu ' + m.amt + ' de ouro.'); d.classList.add(m.win ? 'win' : 'lose'); };
  tick(); }
function velFade(m) {   /* a portas fechadas: só a tela escura e uma frase */
  { const d0 = $('tequip'); if (d0) d0.remove(); } let o = $('vel-fade'); if (o) o.remove(); o = document.createElement('div'); o.id = 'vel-fade'; o.innerHTML = '<div>A porta se fecha atrás de vocês.<br><small>' + m.who + ' apaga as velas, uma a uma.</small></div>'; document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on'));
  setTimeout(() => { o.classList.remove('on'); setTimeout(() => o.remove(), 1200); }, Math.max(1500, (m.ms || 6000) - 900)); }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV = progEvent; progEvent = function (m, now) {
  if (m.t === 'velmenu') { if (m.k === 'bet') m.sk_ = m.skill; velShowMenu(m); return true; }
  if (m.t === 'velfx') { if (m.k === 'dice') velDice(m); else if (m.k === 'fade') velFade(m); return true; }
  return _peV(m, now); }; }
/* a Dama Ysolde fica no alto da escadaria dupla */
if (typeof G !== 'undefined') setInterval(() => { const e = G.npcs && G.npcs.vl_ysolde; if (e) e.z = VL_YSOLDE_Z; }, 400);
var VL_YSOLDE_Z = 0.2;
