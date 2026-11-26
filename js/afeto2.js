// ============================================================
//  AFETO, versão 2 (respostas de 26/11): sentados, na água e na cama; cônjuge NPC e companhias da Casa de Veludo.
//  Sentados: os dois em lugares vizinhos, ou quem está sentado chama quem está em pé (senta no lugar livre ao lado).
//  Água: os dois no mesmo ofurô ou piscina (abraçados, beijo); na beira, cabeça no ombro. Banheira de cobre da suíte
//  da Casa de Veludo: com a companhia ou com outro jogador. Cama: qualquer cama, os dois juntinhos (abraçados, beijo).
//  Cônjuge NPC aparece na lista do Afeto e aceita conforme o humor (gesto aceito: humor +4, uma vez por dia).
//  A companhia paga fica no quarto (ou na suíte) durante toda a visita e aceita os gestos.
// ============================================================
const AF2 = { lap: [0.45, 0.1, 1.57, 0, 0], lapT: [0.5, 0.12, -0.04, 0, 0.66, 1, 1, 1], wLift: 9, seatR: 1.3, bedR: 2.6, vtub: [12, 7], vtubR: 1.6,
  K: { sShoulder: ['seat', 'Cabeça no ombro', 'quer encostar a cabeça no seu ombro', '😌'], sHug: ['seat', 'Abraçados', 'quer ficar abraçado com você', '💑'], sKiss: ['seat', 'Beijo', 'quer te beijar', '💋', 6500], sHand: ['seat', 'De mãos dadas', 'quer segurar a sua mão', '🤝'], sBelly: ['seat', 'Carinho na barriga', 'quer fazer carinho na sua barriga', '🤲'], wBelly: ['water', 'Carinho na barriga', 'quer fazer carinho na sua barriga na água', '🤲'], bBelly: ['bed', 'Carinho na barriga', 'quer fazer carinho na sua barriga', '🤲'], sLap: ['seat', 'Chamar para o colo', 'quer que você sente no colo dele', '😊'], sLapK: ['seat', 'Beijo no colo', 'quer que você sente no colo dele para um beijo', '💋', 6500], sLean: ['seat', 'Encostar no ombro dela', 'quer encostar a cabeça no seu ombro', '😌'], sKissF2: ['seat', 'Beijo no rosto', 'quer te dar um beijo no rosto', '😘', 4000],
    wHug: ['water', 'Abraçados na água', 'quer ficar abraçado com você na água', '💑'], wKiss: ['water', 'Beijo na água', 'quer te beijar', '💋', 6500], wEdge: ['edge', 'Cabeça no ombro', 'quer encostar a cabeça no seu ombro', '😌'],
    bHold: ['bed', 'Deitados abraçados', 'quer deitar abraçado com você', '💑'], bKiss: ['bed', 'Beijo', 'quer te beijar', '💋', 6500] } };
for (const k in AF2.K) { const [c, n, a, i, d] = AF2.K[k]; AFX.n[k] = n; AFX.ask[k] = a; AFX.i[k] = i; if (d) AFX.dur[k] = d; if (!AFF_KS.includes(k)) AFF_KS.push(k); }
AFX.sin.push('sKiss', 'wKiss', 'bKiss', 'bHold', 'sHug', 'wHug');
const AFF_CTX = { stand: ['hand', 'hug', 'hold', 'kissF', 'kissM', 'kissH'], seat: ['sHand', 'sShoulder', 'sHug', 'sKiss', 'sBelly', 'sLap', 'sLapK'], water: ['wHug', 'wKiss', 'wBelly'], edge: ['wEdge'], bed: ['bHold', 'bKiss', 'bBelly'], vtub: ['wHug', 'wKiss', 'wBelly', 'hug', 'hold', 'kissF', 'kissM', 'kissH'] };
const AFF_V2 = k => !!AF2.K[k];
/* contexto do gesto: pelo tipo e pelo estado de quem pede */
function affKCtx(k, p) { const c = AF2.K[k] ? AF2.K[k][0] : 'stand'; return c === 'water' && !affB(p) ? 'vtub' : c; }
/* banheira de cobre da suíte da Casa de Veludo (3º andar) */
function affVtub(p) { if (typeof velB !== 'function' || typeof localToWorld !== 'function') return null; const b = velB('velvet'); if (!b || (p.fl || 0) !== 3) return null; const bi = BUILDINGS.indexOf(b), fb = p.fb != null && p.fb >= 0 ? p.fb : bi; if (fb !== bi) return null;
  const [x, y] = localToWorld(b, AF2.vtub[0], AF2.vtub[1]), px = p.rx != null ? p.rx : p.x, py = p.ry != null ? p.ry : p.y; return Math.hypot(px - x, py - y) <= AF2.vtubR ? { x, y } : null; }

// ---------------- SERVIDOR ----------------
/* banho do ofurô (p.bath) ou das piscinas das Termas (p.thSit) */
const affB = p => p.bath || (p.thSit ? { bi: 'th', mode: p.thSit.mode } : null);
const affNpc = id => typeof S !== 'undefined' && !S.players[id] && S.npcs && S.npcs[id] ? S.npcs[id] : null;
const affPart = id => (typeof S !== 'undefined' && (S.players[id] || (S.npcs && S.npcs[id]))) || null;
/* NPCs que aceitam: o próprio cônjuge e a companhia paga da visita */
function affNpcKind(p, n) { if (!n || n.dead || n.downed) return null; if (n.court === 'spouse' && n.mrKey && typeof estOwner === 'function' && n.mrKey === estOwner(p)) return 'spouse';
  const A = S.vlAway && S.vlAway[n.id]; if (A && Date.now() < A.until && A.who === p.id && typeof vlVisitOk === 'function' && vlVisitOk(p)) return 'comp';
  const Tb = S.vlTable && S.vlTable[n.id]; if (Tb && Tb.who === p.id) return 'comp';   /* a moça que está com você na mesa */
  return null; }
affFree = function (p) { return !!p && !p.downed && !p.bound && !p.carriedBy && !p.dragBy && !p.gripBy && !p.surrendered && !p.tied && !(p.jailUntil > now_()) && now_() - (p.lastCombat || 0) > AFX.combat; };
/* o que cada um precisa estar fazendo para o gesto */
function affCan(p, c) { if (c === 'seat') return !!p.sit; if (c === 'water') return !!affB(p) && affB(p).mode !== 'edge'; if (c === 'edge') return !!affB(p) && affB(p).mode === 'edge'; if (c === 'bed') return p.sleep != null; if (c === 'vtub') return !affB(p) && p.sleep == null && !!affVtub(p); return !affB(p) && p.sleep == null; }
function affCanQ(p, q, c, npc) { const d = dist(p.x, p.y, q.x, q.y); if ((p.fl || 0) !== (q.fl || 0)) return false;
  if (npc) return ['stand', 'seat', 'bed', 'vtub'].includes(c) && d <= AFX.reach + (c === 'bed' ? 0.3 : 0);
  if (c === 'seat') return q.sit ? d <= AF2.seatR : (q.sleep == null && !affB(q) && d <= AFX.reach);
  if (c === 'water' || c === 'edge') return !!affB(q) && !!affB(p) && affB(q).bi === affB(p).bi && (affB(q).mode === 'edge') === (c === 'edge') && d <= 2.6;
  if (c === 'bed') return q.sleep == null && !affB(q) && d <= AF2.bedR;
  if (c === 'vtub') return !affB(q) && q.sleep == null && d <= AFX.reach;
  return !affB(q) && q.sleep == null && d <= AFX.reach; }
/* lugar livre vizinho do assento de quem pede */
function affFreeSeat(p) { let best = -1, bd = 1e9; (WORLD.seats || []).forEach((s, i) => { if ((s.fl || 0) !== (p.fl || 0)) return; const d = dist(s.x, s.y, p.x, p.y); if (d < 0.3 || d > AF2.seatR || d >= bd) return;
  if (Object.values(S.players).some(o => o !== p && dist(o.x, o.y, s.x, s.y) < 0.25)) return; if (Object.values(S.npcs || {}).some(n => !n.dead && dist(n.x, n.y, s.x, s.y) < 0.25)) return; bd = d; best = i; }); return best; }
function affSendX(p, x) { const A = p.aff; Net.toOne(p.id, A ? Object.assign({ t: 'affst', k: A.k, w: A.w, lead: A.lead, side: A.side, dir: A.dir, ctx: A.ctx || 'stand' }, x || {}) : { t: 'affst', k: null }); }
affSend = function (p) { if (p && S.players[p.id]) affSendX(p); };
affEnd = function (p, msg) { const A = p && p.aff; if (!A) return; const q = affPart(A.w); p.aff = null; affSend(p); if (!q) return;
  if (affNpc(A.w)) { q.aff = null; return; } if (q.aff && q.aff.w === p.id) { q.aff = null; affSend(q); if (msg) tell(q, msg); } };
const _asA1 = affStart;
affStart = function (a, b, k) { const npc = !!affNpc(b.id), c = affKCtx(k, a);
  if (!npc && c === 'stand') return _asA1(a, b, k);
  affEnd(a); affEnd(b); const now = now_(), until = AFX.dur[k] ? now + AFX.dur[k] : 0, x = {};
  let side = 1;
  if (c === 'stand') { if (k === 'hand') { tell(a, 'De mãos dadas, só com outro jogador por enquanto.'); return; } const sp = affSpot(b, a, k); if (!sp) { tell(a, 'Não há espaço aqui para isso.'); return; }
    a.x = sp.x; a.y = sp.y; a.z = b.z || 0; side = -sp.s; a.dir = side > 0 ? 2 : 6; b.dir = side > 0 ? 6 : 2; a.sit = null; a.walking = false; Net.toOne(a.id, { t: 'tp', x: a.x, y: a.y, z: a.z, fl: a.fl || 0, fb: a.fb ?? -1 }); }
  if (c === 'seat' && (npc || !b.sit) && !(npc && dist(a.x, a.y, b.x, b.y) <= AF2.seatR + 0.05 && (WORLD.seats || []).some(s => Math.hypot(s.x - b.x, s.y - b.y) < 0.06))) { const si = affFreeSeat(a); if (si < 0) { tell(a, 'Não há lugar livre ao seu lado.'); if (!npc) tell(b, 'Não há lugar livre ao lado.'); return; } const s = WORLD.seats[si];
    b.x = s.x; b.y = s.y; b.dir = s.dir; if (npc) b._affSit = s.low ? 'g' : 'c'; else { b.sit = s.low ? 'g' : 'c'; b.walking = false; x.seat = si; } }
  if (c === 'bed') { const B = BEDS[a.sleep]; if (!B) return; b.x = B.x; b.y = B.y; b.dir = a.dir; if (!npc) { b.sleep = a.sleep; b.sit = null; b.walking = false; x.bed = a.sleep; } }
  if (c === 'vtub') { const T = affVtub(a); if (!T) return; a.x = T.x - AFF_SR[0] * 0.22; a.y = T.y - AFF_SR[1] * 0.22; b.x = T.x + AFF_SR[0] * 0.22; b.y = T.y + AFF_SR[1] * 0.22; a.dir = 2; b.dir = 6; a.sit = null;
    Net.toOne(a.id, { t: 'tp', x: a.x, y: a.y, z: 0, fl: a.fl || 0, fb: a.fb ?? -1 }); if (!npc) { b.sit = null; Net.toOne(b.id, { t: 'tp', x: b.x, y: b.y, z: 0, fl: b.fl || 0, fb: b.fb ?? -1 }); } }
  a.aff = { k, w: b.id, lead: 1, side, dir: a.dir, ctx: c, t0: now, until, ax: a.x, ay: a.y };
  b.aff = { k, w: a.id, lead: 0, side: -side, dir: b.dir, ctx: c, t0: now, until, ax: b.x, ay: b.y, npc: npc ? 1 : 0, fl: b.fl, fb: b.fb };
  affSendX(a); if (!npc) affSendX(b, x);
  for (const p of npc ? [a] : [a, b]) { const had = buffOn(p, 'love'); p.buffs.love = now + AFX.buff; if (!had) tell(p, '💞 Apaixonado (20 min): vida, mana e fôlego voltam um pouco mais rápido.'); sendStat(p); }
  if (!npc) affSin(a, b, k); };
/* o NPC fica no lugar do gesto (as rotinas dele não puxam de volta) */
function affPin() { for (const p of Object.values(S.players)) { const A = p.aff; if (!A) continue; const n = affNpc(A.w); if (!n || !n.aff || n.aff.walk) continue; n.x = n.aff.ax; n.y = n.aff.ay; n.dir = n.aff.dir; if (n.aff.fl != null) n.fl = n.aff.fl; if (n.aff.fb != null) n.fb = n.aff.fb; n.walking = false; n.path = null; } }
/* o NPC responde ao pedido */
function affNpcAsk(p, n, k) { const kind = affNpcKind(p, n); if (!kind) { tell(p, n.name + ' não aceita esse tipo de gesto.'); return; }
  if (kind === 'spouse') { const M = mrOf(n.mrKey), mood = M ? (M.mood ?? MR.mood0) : 50, ch = mood >= 55 ? 1 : mood >= 30 ? 0.5 : 0.1;
    if (Math.random() >= ch) { const L = mood >= 30 ? ['Agora não, meu bem.', 'Hoje não, estou cansado.', 'Mais tarde, talvez.'] : ['Nem pense nisso.', 'Depois do que você fez? Não.', 'Me deixe em paz hoje.']; empSay(n, L[Math.floor(Math.random() * L.length)]); tell(p, n.name + ' recusou.'); return; }
    if (M && M.affD !== estDay()) { M.affD = estDay(); M.mood = Math.min(100, mood + 4); estateSave(); } empSay(n, ['Vem cá.', 'Senti a sua falta.', 'Com você, sempre.'][Math.floor(Math.random() * 3)]); }
  else empSay(n, ['Venha, querido.', 'Assim está melhor.', 'Fique mais um pouco.'][Math.floor(Math.random() * 3)]);
  affStart(p, n, k); }
const _amA1 = affMsg;
affMsg = function (p, m) { const now = now_();
  if (m.a === 'near') { const l = []; for (const n of Object.values(S.npcs || {})) if (affNpcKind(p, n) && dist(n.x, n.y, p.x, p.y) <= AFX.reach + 0.3 && (n.fl || 0) === (p.fl || 0)) l.push({ id: n.id, name: n.name }); let hint = ''; if (!l.length && typeof VEL_STAFF !== 'undefined' && VEL_STAFF.some(T => T.menu === 'comp' && S.npcs[T.id] && dist(S.npcs[T.id].x, S.npcs[T.id].y, p.x, p.y) <= AFX.reach + 0.5 && (S.npcs[T.id].fl || 0) === (p.fl || 0))) hint = 'As moças da casa só aceitam gestos de afeto durante a companhia paga: fale com ela e escolha a companhia; ela sobe com você para o quarto (ou a suíte) e fica 15 min.'; Net.toOne(p.id, { t: 'affnear', l, hint }); return; }
  if (m.a === 'ask') { const k = AFF_KS.includes(m.k) ? m.k : null, n = affNpc(m.id), q = n || S.players[m.id]; if (!k || !q || q === p) return; const c = affKCtx(k, p);
    if (!n && c === 'stand' && !affB(p) && p.sleep == null && !affB(q) && q.sleep == null) return _amA1(p, m);
    if (!affFree(p)) { tell(p, 'Agora não dá.'); return; } if (!affCan(p, c)) { tell(p, { seat: 'Sente-se primeiro.', water: 'Entre na água primeiro.', edge: 'Sente-se na beira primeiro.', bed: 'Deite-se primeiro.', vtub: 'Chegue perto da banheira.', stand: 'Levante-se primeiro.' }[c]); return; }
    if (!n && !affFree(q)) { tell(p, q.name + ' não pode agora.'); return; }
    if (!affCanQ(p, q, c, !!n)) { tell(p, n && (c === 'water' || c === 'edge') ? n.name + ' não está na água.' : 'Chegue mais perto de ' + q.name + '.'); return; }
    p._affAsk = p._affAsk || {}; if (now - (p._affAsk[q.id] || 0) < AFX.cd) { tell(p, 'Espere um pouco antes de pedir de novo.'); return; } p._affAsk[q.id] = now;
    if (n) { affNpcAsk(p, n, k); return; }
    q.affReq = { from: p.id, k, t: now }; Net.toOne(q.id, { t: 'affask', id: p.id, name: p.name, k }); tell(p, AFX.i[k] + ' Pedido enviado a ' + q.name + '.'); return; }
  if (m.a === 'ans') { const r = p.affReq; if (!r || r.from !== m.id || now - r.t > AFX.askMs + 3000) return; const a = S.players[r.from]; if (!a) { p.affReq = null; return; } const c = affKCtx(r.k, a);
    if (c === 'stand' && !affB(a) && a.sleep == null) return _amA1(p, m);
    p.affReq = null; if (!m.ok) { tell(a, m.off ? p.name + ' não está aceitando pedidos de afeto.' : p.name + ' recusou.'); return; }
    if (!affFree(a) || !affFree(p) || !affCan(a, c) || !affCanQ(a, p, c, false)) { tell(p, 'Não deu: algo mudou.'); tell(a, 'Não deu: algo mudou.'); return; }
    affStart(a, p, r.k); return; }
  return _amA1(p, m); };
affTick = function (now) { for (const p of Object.values(S.players)) { const A = p.aff; if (!A) continue; const n = affNpc(A.w), q = n || S.players[A.w];
  if (!q || (!n && (!q.aff || q.aff.w !== p.id)) || (n && !n.aff)) { p.aff = null; affSend(p); continue; }
  if (!A.lead) continue;
  if (A.until && now > A.until) { affEnd(p); continue; }
  if (!affFree(p) || (!n && !affFree(q)) || (n && !affNpcKind(p, n))) { affEnd(p, 'O gesto foi interrompido.'); tell(p, 'O gesto foi interrompido.'); continue; }
  const c = A.ctx || 'stand';
  if (c === 'seat' && (!p.sit || (!n && !q.sit))) { affEnd(p); continue; }
  if ((c === 'water' || c === 'edge') && (!affB(p) || !affB(q))) { affEnd(p); continue; }
  if (c === 'bed' && (p.sleep == null || (!n && q.sleep !== p.sleep))) { affEnd(p, (n ? '' : p.name + ' se levantou.') || null); continue; }
  if (A.k === 'hand' && (dist(p.x, p.y, q.x, q.y) > 2.2 || (p.fl || 0) !== (q.fl || 0))) { tell(p, 'Vocês soltaram as mãos.'); affEnd(p, 'Vocês soltaram as mãos.'); } }
  affPin(); };
/* a companhia paga fica no quarto (ou na suíte) a visita inteira, com quem pagou */
if (typeof VL_ROOM !== 'undefined') VL_ROOM.girlAway = VL_ROOM.visit;
if (typeof velMsg === 'function') { const _vmA2 = velMsg; velMsg = function (p, m) { const before = p.vlVisit ? p.vlVisit.until : 0; const r = _vmA2(p, m);
  try { if (m && m.a === 'company' && p.vlVisit && p.vlVisit.until !== before && S.vlAway) { const T = S.vlAway[m.id]; if (T) { T.who = p.id; T.until = p.vlVisit.until; } } } catch (e) { } return r; }; }

// ---------------- CLIENTE ----------------
/* contexto de quem está na tela */
function affCtxC() { const me = G.me; if (!me) return 'stand'; if (me.sleep) return 'bed'; if (me.bathing) return me.bathing.mode === 'edge' ? 'edge' : 'water'; if (me.sit) return 'seat'; if (affVtub(me)) return 'vtub'; return 'stand'; }
if (typeof progEvent === 'function') { const _peA2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'affnear') { if (G._affPick) { clearTimeout(G._affPick); G._affPick = 0; G._affHint = m.hint || ''; affPick2(m.l || []); } return true; }
  if (m.t === 'affst' && m.k && !m.lead && G.me) { const me = G.me;
    if (m.seat != null && !me.sit && typeof sitDown === 'function') { G.path = null; sitDown(m.seat); }
    if (m.bed != null && !me.sleep && BEDS[m.bed]) { const b = BEDS[m.bed]; if (me.sit && typeof standUp === 'function') standUp(); me.sleep = { bed: m.bed, ox: me.x, oy: me.y }; me.x = me.rx = b.x; me.y = me.ry = b.y; me.dir = typeof dirFromVec === 'function' ? dirFromVec(b.dx, b.dy, 0) : me.dir; me.sleepB = 1; G.path = null; G.pathGoal = null; me.walking = false; } }
  return _peA2(m, now); }; }
/* a escolha: pede ao servidor os NPCs que aceitam (cônjuge, companhia) e mostra os gestos do lugar */
affPick = function () { affCloseBox(); if (G._affPick) clearTimeout(G._affPick); G._affPick = setTimeout(() => { G._affPick = 0; affPick2([]); }, 1500); Net.send({ t: 'aff', a: 'near' }); };   /* espera ANTES de perguntar: no anfitrião a resposta chega na hora */
function affPick2(npcs) { affCloseBox(); const c = affCtxC(), ks = AFF_CTX[c] || AFF_CTX.stand, me = G.me;
  const L = affNear().filter(q => c !== 'seat' || true).concat(npcs.map(n => Object.assign({}, G.npcs[n.id] || {}, { id: n.id, name: n.name, npc: 1 })));
  if (!L.length) { showToast(G._affHint || (c === 'water' || c === 'edge' ? 'Ninguém na água com você.' : 'Ninguém perto para um gesto de afeto.')); G._affHint = ''; return; } let who = L[0];
  const d = document.createElement('div'); d.id = 'aff-box'; d.className = 'aff-box'; const where = { seat: ' · sentados', water: ' · na água', edge: ' · na beira', bed: ' · na cama', vtub: ' · na banheira' }[c] || '';
  const draw = () => { const ksW = who.npc && (c === 'water' || c === 'edge') ? [] : ks.filter(k => !(who.npc && k === 'hand'));
    d.innerHTML = '<div class="aff-h">💞 Afeto' + where + '</div>' + (L.length > 1 ? '<div class="aff-who">' + L.slice(0, 6).map(q => '<button type="button" data-w="' + q.id + '" class="' + (q === who ? 'on' : '') + '">' + escAff(q.name) + '</button>').join('') + '</div>' : '<div class="aff-one">com ' + escAff(who.name) + '</div>') +
      '<div class="aff-gs">' + ksW.map(k => '<button type="button" data-k="' + k + '"><span>' + AFX.i[k] + '</span>' + AFX.n[k] + '</button>').join('') + '</div><div class="aff-ft">' + (who.npc ? 'O NPC responde na hora.' : 'A outra pessoa precisa aceitar.') + ' Para parar, levante-se, ande ou use 💔 na roda.</div><button type="button" class="aff-x">Fechar</button>';
    d.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { who = L.find(q => String(q.id) === b.dataset.w) || who; draw(); });
    d.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { Net.send({ t: 'aff', a: 'ask', id: who.id, k: b.dataset.k }); affCloseBox(); });
    d.querySelector('.aff-x').onclick = affCloseBox; };
  draw(); document.body.appendChild(d); }
/* a roda também no banho */
if (typeof emoteList === 'function') { const _elA2 = emoteList; emoteList = function () { const L = _elA2(); if (G.me && G.me.bathing && !L.some(x => x.k === 'aff')) return L.concat([G.aff ? { k: 'aff', n: 'Parar o gesto', i: '💔' } : { k: 'aff', n: 'Afeto', i: '💞' }]); return L; }; }
/* NPCs do gesto não se desenham sozinhos (quem conduz desenha o par) */
if (typeof applySnapshot === 'function') { const _asA2 = applySnapshot; applySnapshot = function (m, now) { _asA2(m, now); const H = new Set(); for (const id in G.players) { const e = G.players[id], A = e.aff; if (A && A.lead && G.npcs[A.w]) H.add(A.w); } G._affHide = H; }; }
/* esqueletos do par: jogadores e NPCs; roupa de banho para água e cama */
const affPartC = id => (G.players && G.players[id]) || (G.npcs && G.npcs[id]) || null;
const AFF_BATH = { knight: '#2a3a5a', archer: '#3a6a3a', mage: '#5a2a6a' };
function affLook(e, k, bath) { let L;
  if (e.isNpc) { const kind = e.kind; L = typeof npcLookOf === 'function' && NPC_LOOKS[kind] ? npcLookOf(kind, e.id) : NPC_LOOKS[kind] ? NPC_LOOKS[kind]() : heroLook('knight', 'iron', '#888888'); L = Object.assign({}, L, { weapon: null, shield: null, quiver: false }); }
  else { let skin = String(e.skin || 'iron'); const cas = (e.stb & 2097152) && typeof casOk === 'function' && casOk(e.cas); if (cas && !bath) skin += '~c' + e.cas; else if (!bath && typeof helmSkin === 'function' && helmSkin(e.cls, e.skin) && ((e.stb & 4194304) || /iss/.test(k))) skin += '~h'; L = heroLook(e.cls, skin, e.color); }
  if (bath) Object.assign(L, { hair: L.hair || tone('#4a3424'), armor: 'bare', body: L.skin, body2: L.skin, legs: L.skin, boots: L.skin, head: 'none', cape: false, weapon: null, shield: null, pauldron: null, quiver: false, extra: null, pattern: null, trunks: (typeof BATH_TRUNKS !== 'undefined' && BATH_TRUNKS[e.cls]) || AFF_BATH[e.cls] || '#8a2a4a', kimonoC: null, helmHand: null, furisode: false, braids: L.braids });
  return L; }
affRigOf = function (slot, e, k, bath) { const L = affLook(e, k, bath), lk = slot + '|' + (e.isNpc ? 'n:' + e.kind + '#' + e.id : e.cls + ':' + e.skin + ':' + e.color + ':' + ((e.stb & 2097152) ? e.cas : '') + ((e.stb & 4194304) || /iss/.test(k) ? 'h' : '')) + (bath ? ':bath' : '');
  let R = AFF_RIG.get(lk); if (!R) { R = buildHumanoid(L, e.isNpc && typeof NPC_SCALE !== 'undefined' && NPC_SCALE[e.kind] ? { scale: NPC_SCALE[e.kind] } : undefined); if (!e.isNpc && !bath && typeof epicHero === 'function') epicHero(R, L, 1, String(e.skin).split('~')[0]);
    if (e.isNpc && L.braids) R.root.scale.set(1.28, 1, 1.22); else if (e.isNpc && L.hS) R.root.scale.set(L.wS, L.hS, L.wS); R._fem = !!L.fem; AFF_RIG.set(lk, R); if (AFF_RIG.size > 30) AFF_RIG.delete(AFF_RIG.keys().next().value); } return { R, lk }; };
const affCls = e => e.isNpc ? ((typeof NPC_CLS !== 'undefined' && NPC_CLS[e.kind]) || 'knight') : e.cls;
affPose = function (R, e, P) { rigReset(R); const PP = Object.assign({ dir: 2, walk: -1, view: 'S', shea: 1, shb: 1, nowp: 1 }, P || {}); if (!e.isNpc && typeof applyLost === 'function') applyLost(R, e.lost || 0, e.pro || 0); const Q = buildPose(affCls(e), PP);
  if (P && P.tub) Object.assign(Q, { tl: 0, ht: 0, hw: 0, tw: 0, sway: 0, yaw: 0, lA: [2.2, -2.1], lB: [2.15, -2.05] });
  if (P && P.edge) Object.assign(Q, { tl: -0.05, ht: 0.05, hw: 0, tw: 0, aA: [-0.25, 0.35, 0.2], aB: [-0.25, 0.35, 0.2], lA: [1.45, -1.25], lB: [1.35, -1.05], sway: 0, yaw: 0 });
  applyPose(R, Q, PP, 0); return PP; };
/* metros do modelo a partir de uma diferença no mapa (pela câmera dos sprites) */
let _affW2M = null;
function affW2M(dx, dy) { if (!_affW2M) { const pr = v => { const t = v.clone().project(R3.cam); return [(t.x + 1) / 2 * FRAME_W, (1 - t.y) / 2 * FRAME_H]; }, o = pr(new THREE.Vector3(0, 0, 0)), u = pr(new THREE.Vector3(1, 0, 0)), w = pr(new THREE.Vector3(0, 0, 1));
    _affW2M = { a: u[0] - o[0], b: w[0] - o[0], c: u[1] - o[1], d: w[1] - o[1] }; }
  const M = _affW2M, sx = (dx - dy) * HTW, sy = (dx + dy) * HTH, det = M.a * M.d - M.b * M.c; return { x: (sx * M.d - M.b * sy) / det, z: (M.a * sy - M.c * sx) / det }; }
const affYaw = dir => { const a = dir * Math.PI / 4; return Math.atan2(0.5 * Math.sin(a), Math.cos(a)); };
function affPut(R, dir, x, z, ground) { const t = new THREE.Vector3(); R.root.quaternion.identity(); R.root.rotation.set(0, affYaw(dir), 0); R.root.position.set(0, 0, 0); R.root.updateMatrixWorld(true);
  let minY = Infinity; for (const f of [R.LA.ft, R.LB.ft]) { f.getWorldPosition(t); minY = Math.min(minY, t.y); } if (ground) { R.hips.getWorldPosition(t); minY = Math.min(minY, t.y - 0.13); } R.root.position.set(x, -minY + 0.035 * R.root.scale.y, z); R.root.updateMatrixWorld(true); }
function affLie(R, yaw, roll, hx, hz) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, roll, 0)));
  R.root.quaternion.copy(q); R.root.position.set(0, 0, 0); R.root.updateMatrixWorld(true); const t = R.hips.getWorldPosition(new THREE.Vector3()); R.root.position.set(hx - t.x, 0.3 - t.y, hz - t.z); R.root.updateMatrixWorld(true); }
/* dobra coluna (frente e lado), peito e pescoço até um ponto da cabeça chegar ao alvo */
function affBend(R, pt, target, lim) { const set = q => { R.spine.rotation.x = q[0] * 0.55; R.chest.rotation.x = q[0] * 0.45; R.spine.rotation.z = q[1]; R.chest.rotation.y = q[2]; if (R.neckJ) { R.neckJ.rotation.x = q[3]; R.neckJ.rotation.z = q[4]; } };
  const L = lim || [[-0.3, 0.7], [-0.45, 0.45], [-0.9, 0.9], [-0.35, 0.6], [-0.5, 0.5]], err = () => { R.root.updateMatrixWorld(true); return pt(R).distanceToSquared(target); };
  let p = [R.spine.rotation.x + R.chest.rotation.x, R.spine.rotation.z, R.chest.rotation.y, R.neckJ ? R.neckJ.rotation.x : 0, R.neckJ ? R.neckJ.rotation.z : 0], best = (set(p), err()), st = 0.25;
  for (let it = 0; it < 90 && st > 0.003; it++) { let imp = false; for (let i = 0; i < 5; i++) for (const d of [st, -st]) { const q = p.slice(); q[i] = Math.max(L[i][0], Math.min(L[i][1], q[i] + d)); set(q); const e = err(); if (e < best) { best = e; p = q; imp = true; } } if (!imp) st *= 0.55; } set(p); }
const affMouth = R => { R.root.updateMatrixWorld(true); return R.head.localToWorld(new THREE.Vector3(0, -0.05, 0.1)); };
const affWP = (o, x, y, z) => { o.updateMatrixWorld(true); return o.localToWorld(new THREE.Vector3(x, y, z)); };
const affNear2 = (R, a, b, P) => a.getWorldPosition(new THREE.Vector3()).distanceTo(P) < b.getWorldPosition(new THREE.Vector3()).distanceTo(P);
function affLap(RA, RB, k) { const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0));
  const hipsA = W(RA.hips), knA = W(RA.LA.kn).add(W(RA.LB.kn)).multiplyScalar(0.5), seat = hipsA.clone().lerp(knA, AF2.lap[0]); seat.y = Math.max(W(RA.LA.hp).y, W(RA.LB.hp).y) + AF2.lap[1];
  const yA = RA.root.rotation.y, fwd = s => { RB.root.rotation.set(0, yA + s * AF2.lap[2], 0); RB.root.updateMatrixWorld(true); return affWP(RB.hips, 0, 0, 1).sub(W(RB.hips)); }, prof = AF2.lapT[5] !== 0, score = s => { const f = fwd(s); return prof ? Math.abs(f.x) * 2 + f.z : f.z; }, sg0 = score(1) >= score(-1) ? 1 : -1, sg = AF2.lapT[3] ? -sg0 : sg0;   /* de perfil para a câmera: as pernas atravessam o colo para o lado */
  RB.root.rotation.set(0, yA + sg * AF2.lap[2], 0); RB.root.position.set(0, 0, 0); RB.root.updateMatrixWorld(true); const hb = W(RB.hips), rtA = affWP(RA.hips, 1, 0, 0).sub(hipsA).normalize().multiplyScalar(AF2.lap[3] * (AF2.lap[4] ? -sg : sg)); RB.root.position.set(seat.x - hb.x + rtA.x, seat.y - hb.y, seat.z - hb.z + rtA.z); RB.root.updateMatrixWorld(true);
  RB.LA.hp.rotation.set(-1.45, 0, AF2.lapT[7] ? 0.06 : 0); RB.LB.hp.rotation.set(-1.35, 0, AF2.lapT[7] ? -0.06 : 0); RB.LA.kn.rotation.x = 1.35; RB.LB.kn.rotation.x = AF2.lapT[7] ? 1.45 : 1.25;   /* joelhos juntos; com lapT[7] os tornozelos se cruzam */   /* coxas para a frente dela, joelhos dobrados: as pernas caem para o lado dele */
  const T2 = AF2.lapT; RB.spine.rotation.set(T2[2], sg * T2[0] * 0.4, -sg * T2[1]); RB.chest.rotation.set(0, sg * T2[0] * 0.6, 0);   /* o tronco gira NA DIREÇÃO dele (lombar 40%, peito 60%), quase sem tombar de lado; inclina um pouco para trás, no braço dele */
  const hA = W(RA.head), nape = affWP(RA.neckJ || RA.head, 0, 0.02, -0.06), nearB = affNear2(RB, RB.A.sh, RB.B.sh, hA) ? 'A' : 'B', farB = nearB === 'A' ? 'B' : 'A', nearA = affNear2(RA, RA.A.sh, RA.B.sh, W(RB.spine)) ? 'A' : 'B', farA = nearA === 'A' ? 'B' : 'A';
  if (k === 'sLapK') { for (let r = 0; r < 4; r++) { const mid = affMouth(RA).add(affMouth(RB)).multiplyScalar(0.5); lookAtP(RA, affMouth(RB), 0.25); lookAtP(RB, affMouth(RA), -0.3); affBend(RA, affMouth, mid, [[-0.05, 0.35], [-0.25, 0.25], [-0.5, 0.5], [-0.15, 0.35], [-0.35, 0.35]]); affBend(RB, affMouth, mid, [[-0.1, 0.3], [-0.3, 0.3], [-0.8, 0.8], [-0.2, 0.35], [-0.4, 0.4]]); } }
  else { const keep = [RB.spine.rotation.x, RB.spine.rotation.z, RB.chest.rotation.y], clN = (affNear2(RA, RA.A.sh, RA.B.sh, W(RB.head)) ? RA.A.clav : RA.B.clav) || RA.chest, tgt = AF2.lapT[6] ? affWP(clN, 0, 0.1, 0.03) : W(RA.chest).lerp(hA, AF2.lapT[4]).add(V(0, 0.02, 0)); affBend(RB, R => R.head.localToWorld(V(0, 0, 0.07)), tgt, [[keep[0] - 0.05, keep[0] + 0.15], [keep[1] - 0.08, keep[1] + 0.08], [keep[2] - 0.2, keep[2] + 0.2], [-0.15, 0.3], [-0.35, 0.35]]); lookAtP(RB, hA, sg * 0.15); if (AF2.lapT[6]) lookAtP(RA, W(RB.head), -sg * 0.15); }
  ikArm(RB, nearB, nape, [1.6, -0.9, 0.4, 1.6]); ikArm(RB, farB, affWP(RA.chest, 0, 0.12, 0.15), [0.9, -0.3, 0, 1.4]);
  ikArm(RA, nearA, affWP(RB.spine, 0, 0.12, -0.14), [0.8, -0.8, 0.2, 1.4]); ikArm(RA, farA, W(RB.LA.kn).add(W(RB.LB.kn)).multiplyScalar(0.5).add(V(0, 0.05, 0)), [0.5, -0.2, 0, 0.9]); }
/* quem faz o carinho: a mulher do par (senão, quem chegou) */
function affFem(RA, RB) { return RB._fem && !RA._fem ? RB : RA._fem && !RB._fem ? RA : RB; }
/* carinho na barriga: a mão de F na barriga de M, num círculo lento (4 quadros) */
function affCaress(F, M, fr) { const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), h = W(M.hips), c = W(M.chest), fwd = affWP(M.hips, 0, 0, 1).sub(h).normalize(), rt = affWP(M.hips, 1, 0, 0).sub(h).normalize();
  const a = (fr % 4) * Math.PI / 2, bp = h.clone().lerp(c, 0.42).add(fwd.multiplyScalar(0.15)).add(rt.multiplyScalar(0.035 * Math.cos(a))).add(V(0, 0.025 * Math.sin(a), 0));
  const arm = affNear2(F, F.A.sh, F.B.sh, bp) ? 'A' : 'B'; ikArm(F, arm, bp, [0.9, -0.5, 0, 1.2]); }
/* cabeça de RA no ombro de RB; RB passa o braço de perto pelos ombros de RA */
function affShoulder(RA, RB) { const hA = RA.head.getWorldPosition(new THREE.Vector3()), nearB = affNear2(RB, RB.A.sh, RB.B.sh, hA) ? 'A' : 'B', cl = RB[nearB].clav || RB.chest, pB = cl.getWorldPosition(new THREE.Vector3()), sideA = affNear2(RA, RA.A.sh, RA.B.sh, pB) ? -1 : 1;
  affBend(RA, R => R.head.localToWorld(new THREE.Vector3(sideA * 0.09, 0.02, 0)), affWP(cl, 0, 0.08, 0), [[-0.05, 0.2], [-0.22, 0.22], [-0.25, 0.25], [-0.1, 0.3], [-0.6, 0.6]]); RA.head.rotation.z = sideA * -0.3;
  const farA = affNear2(RA, RA.A.sh, RA.B.sh, pB) ? 'B' : 'A'; ikArm(RB, nearB, affWP(RA[farA].clav || RA.chest, 0, 0.06, -0.04), [1.4, -1.0, 0.3, 1.2]); }
function affBuild2(k, e, o, A) { const c = A.ctx || 'stand', bath = c === 'water' || c === 'edge' || c === 'vtub' || c === 'bed', a = affRigOf('A', e, k, bath), b = affRigOf('B', o, k, bath), RA = a.R, RB = b.R, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rel = affW2M((o.rx ?? o.x) - (e.rx ?? e.x), (o.ry ?? o.y) - (e.ry ?? e.y)), dA = e.dir | 0, dB = o.dir | 0; { const L0 = Math.hypot(rel.x, rel.z); if (c === 'seat' && L0 > 0.44) { rel.x *= 0.44 / L0; rel.z *= 0.44 / L0; } }   /* no banco, chegam ombro a ombro */
  const kiss = () => { for (let r = 0; r < 4; r++) { const mA = affMouth(RA), mB = affMouth(RB), mid = mA.clone().add(mB).multiplyScalar(0.5); lookAtP(RA, mB, 0.35); lookAtP(RB, mA, -0.35); affBend(RA, affMouth, mid); affBend(RB, affMouth, mid); } };
  if (c === 'seat') { const sitOf = x => x.isNpc ? 'c' : x === G.me ? (G.me.sit && G.me.sit.chair === 0 ? 'g' : 'c') : ((x.flags & 1024) ? 'c' : 'g');
    affPose(RA, e, { sit: sitOf(e), dir: dA }); affPose(RB, o, { sit: sitOf(o), dir: dB }); affPut(RA, dA, 0, 0); affPut(RB, dB, rel.x, rel.z);
    if (k === 'sShoulder') affShoulder(RA, RB);
    else if (k === 'sLean') { affShoulder(RB, RA); affCaress(RB, RA, A.fr || 0); }   /* encostada no ombro, a mão na barriga dele */   /* quem chega encosta a cabeça no ombro de quem conduz */
    else if (k === 'sKissF2') { const hB = RB.head.getWorldPosition(V(0, 0, 0)), sA = affNear2(RA, RA.A.sh, RA.B.sh, hB) ? -1 : 1, ck = () => affWP(RA.head, sA * 0.075, -0.02, 0.04); for (let r = 0; r < 3; r++) { lookAtP(RB, ck(), -0.3); affBend(RB, affMouth, ck()); } ikArm(RB, affNear2(RB, RB.A.sh, RB.B.sh, hB) ? 'A' : 'B', affWP(RA.chest, -sA * 0.02, 0.15, 0.1).lerp(RA.head.getWorldPosition(V(0, 0, 0)), 0.1), [1.0, -0.6, 0, 1.2]); }
    else if (k === 'sLap' || k === 'sLapK') affLap(RA, RB, k);
    else if (k === 'sHand') { const W = j => j.getWorldPosition(V(0, 0, 0)), hA = W(RA.hips), hB = W(RB.hips), mid = hA.clone().lerp(hB, 0.5), fw = affWP(RA.hips, 0, 0, 1).sub(hA).normalize(); mid.y += 0.12; mid.add(fw.multiplyScalar(0.16));   /* sentados lado a lado, as mãos juntas entre os dois */
      ikArm(RA, affNear2(RA, RA.A.sh, RA.B.sh, hB) ? 'A' : 'B', mid.clone().lerp(hA, 0.06), [0.6, -0.3, 0, 0.9]); ikArm(RB, affNear2(RB, RB.A.sh, RB.B.sh, hA) ? 'A' : 'B', mid.clone().lerp(hB, 0.06), [0.6, -0.3, 0, 0.9]); RB.head.rotation.y = 0; lookAtP(RB, W(RA.head), -0.15); }
    else if (k === 'sBelly') { const F = affFem(RA, RB), M = F === RA ? RB : RA; affShoulder(F, M); affCaress(F, M, A.fr || 0); }
    else if (k === 'sHug') { for (const [R, P] of [[RA, RB], [RB, RA]]) { const me = R.hips.getWorldPosition(V(0, 0, 0)), to = P.hips.getWorldPosition(V(0, 0, 0)).sub(me), f = affWP(R.hips, 0, 0, 1).sub(me); let ang = Math.atan2(to.x, to.z) - Math.atan2(f.x, f.z); while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI; const tw = Math.max(-0.8, Math.min(0.8, ang * 0.7)); R.chest.rotation.y = tw; R.spine.rotation.y = tw * 0.5; rigExtra(R, { clavA: [0.12, 0.3], clavB: [0.12, 0.3], tlc: 0.1, twc: tw }); R.spine.rotation.y = tw * 0.5; }
      RB.head.rotation.z = 0.3; for (const [R, P] of [[RA, RB], [RB, RA]]) { const ph = P.chest.getWorldPosition(V(0, 0, 0)), near = affNear2(R, R.A.sh, R.B.sh, ph) ? 'A' : 'B', far = near === 'A' ? 'B' : 'A'; ikArm(R, near, affWP(P.chest, 0, 0.1, -0.17), [1.2, -0.8, 0.2, 1.4]); ikArm(R, far, affWP(P.spine, 0, 0.08, 0.16), [1.0, -0.7, 0, 1.3]); } }
    else { kiss(); const near = affNear2(RA, RA.A.sh, RA.B.sh, RB.head.getWorldPosition(V(0, 0, 0))) ? 'A' : 'B'; ikArm(RA, near, affWP(RB.head, 0, -0.05, 0.02).lerp(RB.chest.getWorldPosition(V(0, 0, 0)), 0.15), [1.3, -0.8, 0, 1.4]); } }
  else if (c === 'water' || c === 'vtub') { const tub = c === 'water', LW = [[-0.1, 0.5], [-0.12, 0.12], [-0.25, 0.25], [-0.2, 0.35], [-0.35, 0.35]];
    affPose(RA, e, { sit: tub ? 'g' : undefined, tub, dir: 2 }); affPose(RB, o, { sit: tub ? 'g' : undefined, tub, dir: 6 }); affPut(RA, 2, -0.24, 0, tub); affPut(RB, 6, 0.24, 0, tub);   /* sentados retos, joelhos dobrados (as pernas não se cruzam) */
    if (k === 'wHug' || k === 'wBelly') { rigExtra(RA, { tlc: 0.08, clavA: [0.12, 0.3], clavB: [0.12, 0.3] }); rigExtra(RB, { tlc: 0.08, clavA: [0.15, 0.3], clavB: [0.15, 0.3] }); RA.spine.rotation.x = 0.1; RB.spine.rotation.x = 0.12;
      const cl = RA.B.clav || RA.chest; affBend(RB, R => R.head.localToWorld(V(-0.07, 0.0, 0.05)), affWP(cl, 0.02, 0.12, 0.02), [[-0.1, 0.4], [-0.1, 0.1], [-0.25, 0.25], [-0.15, 0.25], [-0.18, 0.18]]); RB.head.rotation.z = 0.12;
      ikArm(RA, 'A', affWP(RB.chest, 0.06, 0, -0.17)); ikArm(RA, 'B', affWP(RB.spine, -0.08, 0.04, -0.16)); ikArm(RB, 'A', affWP(RA.chest, -0.1, 0.14, -0.13)); ikArm(RB, 'B', affWP(RA.chest, 0.12, 0.12, -0.13)); if (k === 'wBelly') { const F = affFem(RA, RB); affCaress(F, F === RA ? RB : RA, A.fr || 0); } }
    else { rigExtra(RA, { clavA: [0.05, 0.22], clavB: [0.05, 0.25], roll: 0.3 }); rigExtra(RB, { clavA: [0.2, 0.2], clavB: [0.2, 0.2], roll: -0.3 });
      for (let r = 0; r < 3; r++) { const mid = affMouth(RA).add(affMouth(RB)).multiplyScalar(0.5); affBend(RA, affMouth, mid, LW); affBend(RB, affMouth, mid, LW); }
      ikArm(RA, 'A', affWP(RB.head, 0.07, -0.05, 0.02)); ikArm(RA, 'B', affWP(RB.spine, -0.05, 0.02, -0.16)); ikArm(RB, 'A', affWP(RA.chest, -0.06, 0.16, -0.14)); ikArm(RB, 'B', affWP(RA.chest, 0.12, 0.15, -0.06)); }
    if (rel.x < 0) for (const R of [RA, RB]) { R.root.position.x = -R.root.position.x; R.root.rotation.y = -R.root.rotation.y; R.root.updateMatrixWorld(true); } }
  else if (c === 'edge') { const y = affYaw(dA), right = V(Math.cos(y), 0, -Math.sin(y)), s = (rel.x * right.x + rel.z * right.z) < 0 ? -1 : 1; affPose(RA, e, { sit: 'c', edge: 1, dir: dA }); affPose(RB, o, { sit: 'c', edge: 1, dir: dA });
    affPut(RA, dA, 0, 0); affPut(RB, dA, right.x * 0.4 * s, right.z * 0.4 * s); affShoulder(RB, RA); }
  else if (c === 'bed') { const yaw = affYaw(dA), right = V(Math.cos(yaw), 0, -Math.sin(yaw)); affPose(RA, e, { down: true, bed: 1, dir: dA }); affPose(RB, o, { down: true, bed: 1, dir: dA });
    const pa = right.clone().multiplyScalar(-0.15), pb = right.clone().multiplyScalar(0.15), face = (R, roll, hp, other) => { affLie(R, yaw, roll, hp.x, hp.z); const f = affWP(R.head, 0, 0, 1).sub(R.head.getWorldPosition(V(0, 0, 0))); return f.x * (other.x - hp.x) + f.z * (other.z - hp.z); };
    const rollTo = (R, hp, other) => face(R, 1.3, hp, other) > face(R, -1.3, hp, other) ? 1.3 : -1.3;
    if (k === 'bHold' || k === 'bBelly') { affLie(RA, yaw, 0, pa.x, pa.z); const r = rollTo(RB, pb, pa); affLie(RB, yaw, r, pb.x, pb.z);
      affBend(RB, R => R.head.localToWorld(V(0, 0, 0)), affWP(RA.B.clav || RA.chest, 0.05, 0.1, 0.06), [[-0.3, 0.5], [-0.45, 0.45], [-0.4, 0.4], [-0.3, 0.5], [-0.5, 0.5]]);
      affCaress(RB, RA, A.fr || 0); RB.LA.kn.rotation.x = 0.5; }   /* deitada de lado, a mão na barriga dele */
    else { const ra = rollTo(RA, pa, pb), rb = rollTo(RB, pb, pa); affLie(RA, yaw, ra, pa.x, pa.z); affLie(RB, yaw, rb, pb.x, pb.z);
      for (let r = 0; r < 4; r++) { const mA = affMouth(RA), mB = affMouth(RB), mid = mA.clone().add(mB).multiplyScalar(0.5); affBend(RA, affMouth, mid); affBend(RB, affMouth, mid); lookAtP(RA, mB, 0.2); lookAtP(RB, mA, -0.2); }
      for (const R of [RA, RB]) { R.LA.kn.rotation.x = 0.45; R.LB.kn.rotation.x = 0.2; } }
    let minY = Infinity; for (const R of [RA, RB]) { R.root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(R.root); minY = Math.min(minY, bb.min.y); } for (const R of [RA, RB]) { R.root.position.y += 0.01 - minY; R.root.updateMatrixWorld(true); } }
  return [RA, RB, a.lk, b.lk]; }
const AFF_PAIR2 = new Map(), AFF_CARESS = ['sBelly', 'wBelly', 'bBelly', 'bHold', 'sLean'];
function affPairSprite2(e, o, A) { const rel = [Math.round(((o.rx ?? o.x) - (e.rx ?? e.x)) * 20), Math.round(((o.ry ?? o.y) - (e.ry ?? e.y)) * 20)], c = A.ctx || 'stand', bath = c !== 'seat';
  const fr = AFF_CARESS.includes(A.k) ? Math.floor(performance.now() / 650) % 4 : 0; A = Object.assign({}, A, { fr }); const key = A.k + '|' + fr + '|' + c + '|' + (e.dir | 0) + (o.dir | 0) + '|' + (c === 'seat' || c === 'edge' || c === 'water' || c === 'vtub' ? rel.join(',') : '') + '|' + affRigOf('A', e, A.k, bath).lk + '|' + affRigOf('B', o, A.k, bath).lk;
  let s = AFF_PAIR2.get(key); if (s) return s; if (!R3.ok) return null; const [RA, RB] = affBuild2(A.k, e, o, A), { renderer, scene, cam, W, H } = R3;
  for (const R of [RA, RB]) { for (const X of [R.A, R.B]) if (X && X.slv && typeof hangWorld === 'function') hangWorld(X.slv, R, 0); scene.add(R.root); R.root.updateMatrixWorld(true); }
  renderer.render(scene, cam); scene.remove(RA.root); scene.remove(RB.root);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(renderer.domElement, 0, 0);
  s = { c: cv, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; AFF_PAIR2.set(key, s); if (AFF_PAIR2.size > 60) AFF_PAIR2.delete(AFF_PAIR2.keys().next().value); return s; }
/* corte da água: por baixo transparente, por cima inteiro */
function affWaterBlit(ctx, s, x0, y0, wy, a) { ctx.save(); ctx.imageSmoothingEnabled = true; ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, wy, s.w + 4, s.h); ctx.clip(); ctx.globalAlpha = a; ctx.drawImage(s.c, x0, y0, s.w, s.h); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y0 - 4, s.w + 4, wy - y0 + 4); ctx.clip(); ctx.drawImage(s.c, x0, y0, s.w, s.h); ctx.restore(); ctx.restore(); }
if (typeof drawHeroEntity === 'function') { const _dhA2 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) {
  if (e && e.isNpc && G._affHide && G._affHide.has(e.id)) { e._spr = null; return; }
  const A = e && !e.isNpc && e.aff; if (!A || !R3.ok || e.downed) return _dhA2(ctx, e, sx, sy, now); const o = affPartC(A.w); if (!o) return _dhA2(ctx, e, sx, sy, now);
  if (!o.isNpc && !(o.aff && o.aff.w === e.id)) return _dhA2(ctx, e, sx, sy, now);
  const c = affKCtxC(A, e, o);
  if (c === 'stand' && A.k !== 'hand' && o.isNpc) { if (!A.lead) return; const pa = tileW(e.rx, e.ry, 0), pb = tileW(o.rx, o.ry, 0), s = affPairSprite(A.k, e, o, A.side < 0); if (s) { ctx.imageSmoothingEnabled = true; const mx = sx + (pb.x - pa.x) / 2, my = sy + (pb.y - pa.y) / 2; softDab(ctx, mx, my, 16, '#000000', 0.35); pblit(ctx, s, mx, my); e._spr = s; e._sx = mx; e._sy = my; e._drawT = now; return; } }
  if (c === 'seat' || c === 'bed' || c === 'vtub') { if (!A.lead) { e._spr = null; return; } const s = affPairSprite2(e, o, Object.assign({}, A, { ctx: c })); if (!s) return _dhA2(ctx, e, sx, sy, now); ctx.imageSmoothingEnabled = true;
    if (c === 'bed') pblit(ctx, s, sx, sy - 11); else if (c === 'vtub') affWaterBlit(ctx, s, sx - s.ax, sy - s.ay + 0.22 * HV, sy - 0.3 * HV, 0.35); else pblit(ctx, s, sx, sy);
    e._spr = s; e._sx = sx; e._sy = sy; e._drawT = now; return; }
  return _dhA2(ctx, e, sx, sy, now); }; }
/* o contexto do gesto no cliente: pelo tipo e pelo estado de quem conduz */
function affKCtxC(A, e) { const c = AF2.K[A.k] ? AF2.K[A.k][0] : 'stand'; if (c === 'water') return e.bathing ? 'water' : 'vtub'; return c; }
if (typeof drawBath === 'function') { const _dbA2 = drawBath; drawBath = function (ctx, e, sx, sy, now) { const A = e && e.aff, o = A && affPartC(A.w);
  if (A && o && R3.ok && (A.k === 'wHug' || A.k === 'wKiss' || A.k === 'wBelly' || A.k === 'wEdge') && o.bathing) { if (!A.lead) return; const c = A.k === 'wEdge' ? 'edge' : 'water', s = affPairSprite2(e, o, Object.assign({}, A, { ctx: c })); if (s) {
    if (c === 'edge') { const wy = sy - Math.max(0.04, 0.22 - 0.28 * (1 - tubLvC(e.fb))) * HV; affWaterBlit(ctx, s, sx - s.ax, sy - s.ay - 0.3 * HV, wy, 0.4); }
    else { const lift = (typeof BATH_POSES !== 'undefined' && BATH_POSES.A && BATH_POSES.A.lift) || 0, wy = sy - tubH(e.fb) * HV; affWaterBlit(ctx, s, sx - s.ax, sy - s.ay + 0.25 * HV - lift - AF2.wLift, wy, 0.32); }
    e._spr = s; return; } }
  return _dbA2(ctx, e, sx, sy, now); }; }
