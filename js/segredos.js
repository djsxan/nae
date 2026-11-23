// ============================================================
//  SEGREDOS EM USO — chantagem e boatos (primeira parte do sistema de segredos)
//  Chantagem: diante do lorde, com um segredo da casa dele. O peso do segredo define o teto;
//  o jogador escolhe quanto pedir (ouro ou favor). Perto do teto: mais recusa e mais reação
//  (capangas, simpatia perdida, denúncia à Guarda).
//  Boato: a Dama Ysolde espalha o segredo sem risco; derruba o apoio popular e o prestígio da casa
//  e gasta o segredo.
//  Ainda não feito: missões e campanhas da Ysolde e do Mestre Corvin.
// ============================================================
const SEC_W = { visit: 5, rel: 5, crown: 4, bet: 3, plan: 3, gold: 2, power: 2 };
const SEC_KN = { visit: 'frequenta a Casa de Veludo', rel: 'trama contra outra casa', crown: 'lealdade à coroa', bet: 'perde no jogo', plan: 'o plano da casa', gold: 'os cofres', power: 'os homens de armas' };
const BM_GOLD = 60, BM_FAVOR = 4, BM_STEPS = [0.25, 0.5, 0.75, 1], BM_STEP_N = ['Pouco', 'Metade', 'Muito', 'Tudo'], RUMOR_COST = 40;

// ---------------- SERVIDOR ----------------
function secWeight(s) { let w = SEC_W[s.k] || 2; if (s.k === 'crown' && typeof hRec === 'function' && hRec().st[s.h] && hRec().st[s.h].crown < 0) w = 5; return w; }   /* deslealdade à coroa pesa mais */
const bmClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function bmAccept(w, f) { return bmClamp(1.05 - 0.75 * f + 0.03 * (w - 3), 0.25, 0.95); }
function bmReact(f, ok) { return bmClamp((ok ? 0.08 : 0.3) + 0.45 * f, 0, 0.9); }
function bmCap(s) { const w = secWeight(s); return { w, gold: w * BM_GOLD, favor: w * BM_FAVOR }; }
function secPend() { const R = velRec(); return R.pend || (R.pend = []); }
function secBmMenu(p, n) { const L = secList(p), list = []; L.forEach((s, i) => { if (s.h !== n.house) return; const C = bmCap(s); list.push({ i, t: s.t, kn: SEC_KN[s.k] || '', w: C.w, gold: C.gold, favor: C.favor, used: s.bm ? 1 : 0 }); });
  Net.toOne(p.id, { t: 'secmenu', k: 'bm', id: n.id, house: n.house, name: n.name, list, steps: BM_STEPS, acc: list.map(x => BM_STEPS.map(f => Math.round(bmAccept(x.w, f) * 100))) }); }
function secMsg(p, m) {   /* devolve true quando a mensagem era daqui */
  if (m.a !== 'bmopen' && m.a !== 'bm' && m.a !== 'rumor' && m.a !== 'cv') return false; if (!S.estate || p.downed) return true; const now = now_();
  if (m.a === 'cv') { secCorvin(p, m); return true; }
  if (m.a === 'rumor') { const n = velStaffNear(p, 'vl_ysolde'), L = secList(p), i = m.i | 0, s = L[i]; if (!n || !s) return true;
    if ((p.gold || 0) < RUMOR_COST) { empSay(n, 'Espalhar custa ' + RUMOR_COST + ' de ouro. Bocas não se abrem de graça.'); return true; }
    p.gold -= RUMOR_COST; L.splice(i, 1); const w = secWeight(s), h = HOUSE_BY[s.h], st = hRec().st[s.h];
    if (typeof infAdd === 'function') for (const pl of INF_PLACES) infAdd(s.h, pl.id, -w * 1.2);
    st.prestige = clampH(st.prestige - w, 0, 100); if (typeof hNews === 'function') hNews('Corre pela cidade: ' + s.t);
    if (s.bm) hFavor(p, s.h, -15, 'recebeu pelo silêncio e falou mesmo assim');   /* a casa sabe de onde saiu */
    empSay(n, 'Amanhã a cidade inteira vai saber. E ninguém vai saber por quem.'); tell(p, 'Boato espalhado: o apoio popular da ' + h.n + ' caiu ' + (w * 1.2).toFixed(1).replace('.', ',') + ' em cada lugar e o prestígio caiu ' + w + '. O segredo foi gasto.');
    if (typeof estateSave === 'function') estateSave(); sendStat(p); velMenu(p, VEL_STAFF.find(t => t.id === 'vl_ysolde'), n); return true; }
  const n = S.npcs[m.id]; if (!n || n.court !== 'house' || n.hrole !== 'lord' || n.dead || n.downed) return true; if (dist(n.x, n.y, p.x, p.y) > 3 || (n.fl || 0) !== (p.fl || 0)) { tell(p, 'Chegue mais perto.'); return true; }
  if (m.a === 'bmopen') { secBmMenu(p, n); return true; }
  const L = secList(p), s = L[m.i | 0], f = BM_STEPS[m.f | 0], what = m.what === 'favor' ? 'favor' : 'gold'; if (!s || s.h !== n.house || !f) return true; const h = HOUSE_BY[n.house], C = bmCap(s);
  if (s.bm) { empSay(n, 'Essa história você já me vendeu uma vez.'); return true; }
  s.bm = estDay(); const ok = Math.random() < bmAccept(C.w, f), react = Math.random() < bmReact(f, ok);
  if (ok) { if (what === 'gold') { const g = Math.round(C.gold * f); p.gold = (p.gold || 0) + g; const st = hRec().st[h.id]; st.gold = clampH(st.gold - Math.ceil(g / 60), 0, 100); tell(p, h.lord + ' pagou ' + g + ' de ouro pelo seu silêncio.'); }
    else hFavor(p, h.id, Math.round(C.favor * f), 'favor arrancado com um segredo');
    empSay(n, ['Terá o que pede. E eu terei boa memória.', 'Tome. E reze para eu nunca saber de mais nada.', 'Pago. Desta vez.'][Math.floor(Math.random() * 3)]); }
  else { hFavor(p, h.id, -(5 + Math.round(10 * f)), 'tentou chantagear o lorde'); empSay(n, ['Saia da minha casa.', 'Você escolheu mal a quem ameaçar.', 'Ninguém acreditaria em você.'][Math.floor(Math.random() * 3)]); tell(p, h.lord + ' recusou. O segredo ainda serve para um boato ou para vender.'); }
  if (react) { const r = Math.random(), type = r < 0.4 ? 'thugs' : r < 0.7 ? 'guard' : 'cold';
    if (type === 'cold') hFavor(p, h.id, -10, 'a casa não esquece');
    else secPend().push({ o: estOwner(p), h: h.id, type, at: now + 45000 + Math.random() * 75000, n: f >= 0.75 ? 3 : 2 }); }
  if (typeof estateSave === 'function') estateSave(); sendStat(p); secBmMenu(p, n); return true; }
/* ---- rotina das casas: onde cada um vai estar hoje (é isto que permite entrar num casarão na hora certa) ---- */
const ROUTINE_COST = 30, CV_BUY = 80, CV_SELL = { crown: 55, rel: 55, plan: 55 }, CV_SELL0 = 30;
function secRoutine(hid) { const h = HOUSE_BY[hid], k = HOUSES.findIndex(x => x.id === hid), d = estDay(), L = [];
  L.push(h.lord + ': de dia no térreo do casarão, à noite no 1º andar.');
  if ((d + k) % 3 === 0) L.push('Hoje o lorde e o herdeiro vão às Termas das ' + THERMAE_HOURS[0] + 'h às ' + THERMAE_HOURS[1] + 'h.');
  if ((d + k) % 2 === 0) L.push('Hoje o lorde joga no Clube do Cervo de Prata das ' + CLUB_HOURS[0] + 'h às ' + CLUB_HOURS[1] + 'h.');
  if ((d + k) % 3 === 1) L.push('Hoje o lorde vai à Casa de Veludo das ' + VL_HOURS[0] + 'h à meia-noite.');
  L.push('O herdeiro passa o dia na praça do castelo e dorme no 2º andar. A esposa não sai do 1º andar. O criado fica no térreo; os dois guardas, na porta.');
  if (typeof tatClient === 'function') { const C = tatClient(), n = C && C.id && S.npcs[C.id]; if (n && n.house === hid && !C.done) L.push('Hoje ' + n.name.split(',')[0] + ' vai ao estúdio de tatuagem entre ' + TAT_NPC_H[0] + 'h e ' + TAT_NPC_H[1] + 'h.'); }
  return L; }
function secCorvinMenu(p, n, rt) { const L = secList(p); Net.toOne(p.id, { t: 'secmenu', k: 'cv', name: n.name, gold: p.gold | 0, buy: CV_BUY, rc: ROUTINE_COST, sec: L.map(s => ({ h: s.h, t: s.t, v: CV_SELL[s.k] || CV_SELL0 })), houses: HOUSES.map(h => [h.id, h.n, h.ic]), rt: rt || null, max: SEC_MAX }); }
function secCorvin(p, m) { const n = S.npcs.k_whisper; if (!n || n.dead || n.downed || (n.fl || 0) !== (p.fl || 0) || dist(n.x, n.y, p.x, p.y) > 3.2) { tell(p, 'Chegue mais perto do Mestre Corvin.'); return; } const L = secList(p);
  if (m.op === 'buy') { if ((p.gold || 0) < CV_BUY) { empSay(n, 'Sussurros custam ' + CV_BUY + ' de ouro. A coroa não trabalha fiado.'); return; }
    const want = []; for (const h of HOUSES) for (const k of ['crown', 'rel', 'plan', 'power']) if (!L.some(s => s.h === h.id && s.k === k)) want.push([h.id, k]);   /* o que interessa a quem vigia o trono */
    if (!want.length) { empSay(n, 'Você já sabe o que eu sei. Curioso.'); return; } const pk = want[Math.floor(Math.random() * want.length)]; p.gold -= CV_BUY; secGive(p, pk[0], pk[1], 'comprado do Mestre Corvin'); empSay(n, 'Use com cuidado. Eu saberei como usou.'); sendStat(p); }
  else if (m.op === 'sell') { const s = L[m.i | 0]; if (!s) return; const v = CV_SELL[s.k] || CV_SELL0; L.splice(m.i | 0, 1); p.gold = (p.gold || 0) + v; empSay(n, v > CV_SELL0 ? 'Isto interessa à coroa. Muito.' : 'Fofoca de salão. Mas anoto.'); if (typeof estateSave === 'function') estateSave(); sendStat(p); }
  else if (m.op === 'rt') { const h = HOUSE_BY[m.h]; if (!h) return; if ((p.gold || 0) < ROUTINE_COST) { empSay(n, 'São ' + ROUTINE_COST + ' de ouro pela rotina de uma casa.'); return; } p.gold -= ROUTINE_COST; const R = secRoutine(h.id); for (const t of R) tell(p, t); sendStat(p); secCorvinMenu(p, n, { h: h.id, l: R }); return; }
  secCorvinMenu(p, n); }
function secThugSpot(p) { for (let k = 0; k < 24; k++) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 3, x = Math.round(p.x + Math.cos(a) * r), y = Math.round(p.y + Math.sin(a) * r); if (x > 2 && y > 2 && x < MAP_W - 3 && y < MAP_H - 3 && WORLD.bld[tileAt(x, y)] < 0 && monStand(x, y, { aggro: 1 })) return [x, y]; } return null; }
function secTick(now) {
  if (!S.estate || now - (S.secT || 0) < 1000) return; S.secT = now; const R = velRec(), P = R.pend; if (!P || !P.length) return;
  for (let i = P.length - 1; i >= 0; i--) { const e = P[i]; if (now < e.at) continue; const p = Object.values(S.players).find(q => estOwner(q) === e.o); if (!p) continue;   /* espera o jogador estar no reino */
    if (p.downed || p.jailUntil > now || (p.fl || 0) || (p.fb != null && p.fb >= 0)) { e.at = now + 15000; continue; }
    const h = HOUSE_BY[e.h];
    if (e.type === 'guard') { p.wanted = now + 300000; if (!CRIME_MS.extort) { CRIME_MS.extort = 150000; CRIME_TXT.extort = 'extorsão'; } crimeSentence(p, 'extort'); Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); tell(p, 'A ' + h.n + ' denunciou você à Guarda por extorsão. Você está sendo procurado.'); P.splice(i, 1); continue; }
    if (WORLD.bld[tileAt(Math.round(p.x), Math.round(p.y))] >= 0) { e.at = now + 15000; continue; }   /* os capangas esperam você sair para a rua */
    let made = 0; for (let k = 0; k < (e.n || 2); k++) { const sp = secThugSpot(p); if (!sp) continue; const id = S.nextMid++; S.monsters[id] = { id, type: 'bandit', zone: zoneAt(sp[0], sp[1]), x: sp[0], y: sp[1], homeX: sp[0], homeY: sp[1], hp: MON.bandit.hp, nextAtk: 0, stunUntil: 0, slowUntil: 0, taunt: null, aggro: p.id, returning: false, face: 1, path: null, pathT: 0, wander: null, waitUntil: 0, hired: e.h }   /* já vêm atrás do jogador: só assim um bandido entra na cidade */; made++; }
    if (!made) { e.at = now + 15000; continue; } tell(p, made + ' capangas da ' + h.n + ' vieram cobrar o seu atrevimento.'); P.splice(i, 1); }
  if (typeof estateSave === 'function') estateSave(); }
if (typeof velMsg === 'function') { const _vmS = velMsg; velMsg = function (p, m) { if (secMsg(p, m)) return; return _vmS(p, m); }; }
if (typeof velTick === 'function') { const _vtS = velTick; velTick = function (now) { _vtS(now); secTick(now); }; }

// ---------------- CLIENTE ----------------
function secBmPanel(m) {   /* 1ª tela: os segredos que você tem desta casa */
  G.secM = m; const h = (typeof HOUSE_BY !== 'undefined' && HOUSE_BY[m.house]) || {};
  const d = velPanel('Chantagem: ' + (h.lord || m.name), '<div class="est-cost">“Fale baixo. O que você acha que sabe?”<br><br>Cada segredo serve para <b>uma</b> chantagem. O peso dele define o máximo que dá para arrancar; quanto mais perto do máximo, maior a chance de recusa e de troco: capangas na rua, a casa passar a detestar você, ou uma denúncia à Guarda.</div><div class="vel-secs">' +
    (m.list.length ? m.list.map((s, q) => '<div class="vel-sec"><span><b>' + s.kn + '</b> · peso ' + s.w + '<br>' + s.t + '</span><button class="est-btn' + (s.used ? ' ghost' : '') + '" data-q="' + q + '"' + (s.used ? ' disabled' : '') + '>' + (s.used ? 'Já usado' : 'Usar') + '<small>até ' + s.gold + ' de ouro</small></button></div>').join('') : '<div class="est-cost">Você não guarda nenhum segredo da ' + (h.n || 'casa') + '.</div>') + '</div>');
  d.querySelectorAll('[data-q]').forEach(b => b.onclick = () => secBmAsk(+b.dataset.q)); }
function secBmAsk(q) {   /* 2ª tela: o que pedir e quanto */
  const m = G.secM, s = m.list[q], acc = m.acc[q];
  const row = (what, unit, cap) => '<div class="vel-sub">' + (what === 'gold' ? 'Pedir ouro' : 'Pedir favor da casa') + '</div><div class="vel-amt" style="grid-template-columns:repeat(4,1fr)">' + m.steps.map((f, i) => '<button class="est-btn" data-w="' + what + '" data-f="' + i + '">' + '<b>' + Math.round(cap * f) + '</b><br><small>' + BM_STEP_N[i] + '<br>' + acc[i] + '% de aceitar</small></button>').join('') + '</div>';
  const d = velPanel('Quanto pedir', '<div class="est-cost"><b>' + s.kn + '</b> · peso ' + s.w + '<br>' + s.t + '</div>' + row('gold', 'ouro', s.gold) + row('favor', 'favor', s.favor) + '<button class="est-btn ghost" data-back style="margin-top:10px">← Voltar</button>');
  d.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { d.remove(); Net.send({ t: 'vel', a: 'bm', id: m.id, i: s.i, what: b.dataset.w, f: +b.dataset.f }); });
  d.querySelector('[data-back]').onclick = () => secBmPanel(m); }
function secCorvinPanel(m) { const hb = id => (typeof HOUSE_BY !== 'undefined' && HOUSE_BY[id]) || {};
  const d = velPanel('Mestre Corvin', '<div class="est-cost">“Eu vendo o que ouço, compro o que você ouviu, e sei onde cada lorde vai estar hoje.”<br><br>Um sussurro da corte custa <b>' + m.buy + '</b> de ouro (lealdade à coroa, tramas, planos e tropas). Ele paga mais pelo que toca o trono.</div>' +
    (m.rt ? '<div class="est-cost"><b>Rotina de hoje · ' + (hb(m.rt.h).n || '') + '</b><br>' + m.rt.l.join('<br>') + '</div>' : '') +
    '<div class="vel-sub">Rotina de uma casa hoje (' + m.rc + ' de ouro)</div><div class="vel-vs">' + m.houses.map(h => '<button class="est-btn ghost" data-rt="' + h[0] + '"' + (m.gold < m.rc ? ' disabled' : '') + '>' + h[2] + ' ' + h[1] + '</button>').join('') + '</div>' +
    '<div class="vel-sub">Seus segredos (' + m.sec.length + ' de ' + m.max + ')</div><div class="vel-secs">' + (m.sec.length ? m.sec.map((s, i) => '<div class="vel-sec"><span><b>' + (hb(s.h).ic || '') + ' ' + (hb(s.h).n || '') + '</b><br>' + s.t + '</span><button class="est-btn ghost" data-sell="' + i + '">Vender<small>+' + s.v + '</small></button></div>').join('') : '<div class="est-cost">Você ainda não guarda nenhum segredo.</div>') + '</div>' +
    '<div class="tq-btns"><button class="est-btn" data-buy' + (m.gold < m.buy ? ' disabled' : '') + '>Comprar um sussurro<small>' + m.buy + ' de ouro</small></button></div>');
  const send = o => Net.send(Object.assign({ t: 'vel', a: 'cv' }, o)); d.querySelector('[data-buy]').onclick = () => send({ op: 'buy' });
  d.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => send({ op: 'sell', i: +b.dataset.sell })); d.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => send({ op: 'rt', h: b.dataset.rt })); }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peS = progEvent; progEvent = function (m, now) {
  if (m.t === 'secmenu') { if (m.k === 'bm') secBmPanel(m); else if (m.k === 'cv') secCorvinPanel(m); return true; }
  if (m.t === 'courtmenu' && m.role === 'whisper') { const r0 = _peS(m, now), d = document.getElementById('courtmenu'); if (d) { const b = document.createElement('button'); b.className = 'lift-btn'; b.style.margin = '0 14px 12px'; b.innerHTML = '<span class="lift-n">🕯</span><span><b>Ouvir os sussurros</b><br><small>Segredos da corte, rotina das casas, vender o que você sabe</small></span>'; b.onclick = () => { d.remove(); Net.send({ t: 'vel', a: 'cv', op: 'open' }); }; d.appendChild(b); } return r0; }
  const r = _peS(m, now);
  if (m.t === 'velmenu' && m.k === 'ysolde') { const d = document.getElementById('tequip'); if (d) d.querySelectorAll('.vel-sec').forEach((row, i) => { const b = document.createElement('button'); b.className = 'est-btn ghost'; b.innerHTML = 'Espalhar<small>−' + RUMOR_COST + '</small>'; b.title = 'Vira boato sem risco: derruba o apoio popular e o prestígio da casa. Gasta o segredo.'; if (m.gold < RUMOR_COST) b.disabled = true; b.onclick = () => { if (b.dataset.sure) Net.send({ t: 'vel', a: 'rumor', i }); else { b.dataset.sure = 1; b.innerHTML = 'Confirmar?<small>gasta o segredo</small>'; } }; row.appendChild(b); }); }
  return r; }; }
if (typeof houseMenu === 'function' && typeof G !== 'undefined') { const _hmS = houseMenu; houseMenu = function (m) { _hmS(m);
  if (m.role !== 'lord') return; const d = document.getElementById('housemenu') || document.querySelector('.lift-list') && document.querySelector('.lift-list').closest('div[id]'); const list = d && d.querySelector('.lift-list'); if (!list) return;
  const b = document.createElement('button'); b.className = 'lift-btn'; b.innerHTML = '<span class="lift-n">🗝</span><span><b>Tenho algo que o senhor vai querer ouvir</b><br><small>Chantagem com um segredo desta casa</small></span>'; b.onclick = () => { if (d.remove) d.remove(); Net.send({ t: 'vel', a: 'bmopen', id: m.id }); }; list.appendChild(b); }; }
