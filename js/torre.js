// ============================================================
//  TORRE DO INVENTOR — Sxan the Creator (a antiga Casa Lorvan)
//  Loja de invenções (térreo), oficina das encomendas, laboratório,
//  casa do Sxan, apartamento de luxo e observatório no telhado.
//  Invenções só divertidas (efeitos visuais); encomendas com peças;
//  missões malucas; balão, autômato, fogos e explosões pela cidade.
// ============================================================

/* ---------- invenções (itens) ---------- */
const INV_TOYS = {
  t_fireworks: { name: 'Foguete de artifício', icon: '🎆', price: 18, fx: 'fireworks', desc: 'Um foguete do Sxan: sobe assobiando e estoura em cores no céu, para todo mundo ver.' },
  t_confetti: { name: 'Canhão de confete a vapor', icon: '🎉', price: 12, fx: 'confetti', desc: 'Puf! Uma nuvem de confete colorido em volta de você.' },
  t_smoke: { name: 'Bomba de fumaça colorida', icon: '💨', price: 10, fx: 'smoke', desc: 'Fumaça roxa, verde e laranja. Ótima para uma entrada dramática.' },
  t_bubbles: { name: 'Soprador de bolhas mecânico', icon: '🫧', price: 14, fx: 'bubbles', keep: 1, desc: 'Gira a manivela e sai uma chuva de bolhas de sabão. Não gasta.' },
  t_musicbox: { name: 'Caixinha de música de corda', icon: '🎶', price: 22, fx: 'notes', keep: 1, desc: 'Dá corda e as notinhas dançam no ar em volta de você. Não gasta.' },
  t_birdie: { name: 'Passarinho de corda', icon: '🐦', price: 26, fx: 'bird', keep: 1, desc: 'Um passarinho de latão que voa em volta da sua cabeça por um minuto. Não gasta.' },
  t_lantern: { name: 'Lanterna de mil cores', icon: '🏮', price: 20, fx: 'colors', keep: 1, desc: 'Uma luz que troca de cor em volta de você. Não gasta.' },
  /* só por encomenda */
  o_minibot: { name: 'Autômato de bolso', icon: '🤖', price: 60, fx: 'minibot', keep: 1, order: 1, desc: 'Um robozinho de latão que anda em volta de você por um minuto. Feito sob encomenda.' },
  o_balloon: { name: 'Balão a vapor de brinquedo', icon: '🎈', price: 40, fx: 'miniballoon', order: 1, desc: 'Um balãozinho que sobe soltando vapor até sumir no céu. Feito sob encomenda.' },
  o_stars: { name: 'Chuva de estrelas', icon: '✨', price: 50, fx: 'stars', order: 1, desc: 'Estrelinhas douradas caem do céu em volta de você. Feito sob encomenda.' },
  o_snow: { name: 'Globo de neve encantado', icon: '❄️', price: 45, fx: 'snow', keep: 1, order: 1, desc: 'Agita e começa a nevar em volta de você, até no verão. Feito sob encomenda. Não gasta.' },
  /* exclusivas das missões */
  x_propeller: { name: 'Chapéu-hélice', icon: '🧢', price: 80, fx: 'propeller', keep: 1, excl: 1, desc: 'Presente do Sxan: a hélice gira em cima da sua cabeça por um minuto. Só se ganha nas missões.' },
  x_rainbow: { name: 'Arco-íris de bolso', icon: '🌈', price: 80, fx: 'rainbow', keep: 1, excl: 1, desc: 'Presente do Sxan: um arco-íris abre por cima de você. Só se ganha nas missões.' },
  x_gears: { name: 'Engrenagem de ouro do Sxan', icon: '⚙️', price: 90, fx: 'gears', keep: 1, excl: 1, desc: 'Presente do Sxan: engrenagens douradas giram em volta de você. Só se ganha nas missões.' },
  x_proto: { name: 'Protótipo do Sxan', icon: '🔧', price: 0, fx: 'proto', desc: 'Uma engenhoca que o Sxan pediu para testar longe da torre. Use (clique) bem longe dela.' },
};
const SX_SHOP = ['t_fireworks', 't_confetti', 't_smoke', 't_bubbles', 't_musicbox', 't_birdie', 't_lantern'];
const SX_ORDERS = { o_minibot: { need: { ore: 3, gem: 1 }, gold: 40, days: 2 }, o_balloon: { need: { flaxraw: 3, log: 2 }, gold: 25, days: 1 }, o_stars: { need: { gem: 2, hardwood: 1 }, gold: 35, days: 2 }, o_snow: { need: { gem: 1, silk: 2 }, gold: 30, days: 1 } };
const SX_MISSIONS = {
  test: { name: 'Teste de campo', desc: 'Leve o Protótipo do Sxan para bem longe da torre (do outro lado da cidade) e use. Depois volte e conte como foi.', gold: 40 },
  parts: { name: 'Peças raras', desc: 'Traga 3 Minérios, 1 Gema Bruta e 2 Toras de madeira para o próximo invento.', need: { ore: 3, gem: 1, log: 2 }, gold: 60 },
  fix: { name: 'Conserto do laboratório', desc: 'A explosão abriu um rombo no laboratório! Traga 4 Toras de madeira e 2 Minérios para o conserto.', need: { log: 4, ore: 2 }, gold: 50, rep: 3 },
};
const SX_EXCL = ['x_propeller', 'x_rainbow', 'x_gears'];
const SX_FX_MS = { fireworks: 4200, confetti: 3500, smoke: 6000, bubbles: 9000, notes: 9000, bird: 60000, colors: 30000, minibot: 60000, miniballoon: 9000, stars: 8000, snow: 30000, propeller: 60000, rainbow: 15000, gears: 20000, proto: 4000 };
const SX_NAME = 'Sxan the Creator';
if (typeof LOOT !== 'undefined') for (const k in INV_TOYS) { const T = INV_TOYS[k]; LOOT[k] = { name: T.name, price: T.price, icon: T.icon, color: '#d9a03a', desc: T.desc }; }
function towerBi() { return typeof BUILDINGS !== 'undefined' ? BUILDINGS.findIndex(b => b && b.tower) : -1; }
function towerTop() { const bi = towerBi(), b = BUILDINGS[bi]; if (!b) return null; const [x, y] = localToWorld(b, bDims(b)[0] / 2, bDims(b)[1] / 2); return { x, y, bi }; }

/* ---------- servidor ---------- */
function sxState() { const E = estateLoad(); return (E.sxan = E.sxan || { orders: {}, mis: {}, last: {}, ev: {} }); }
function sxKey(p) { return String(p.name || '').trim().toLowerCase(); }
function sxNear(p) { const n = S.npcs && S.npcs.sxan; return !!n && (p.fl || 0) === (n.fl || 0) && dist(p.x, p.y, n.x, n.y) < 4.5; }
function sxHas(p, need) { for (const k in need) if ((p.inv[k] || 0) < need[k]) return false; return true; }
function sxTake(p, need) { for (const k in need) { p.inv[k] -= need[k]; if (p.inv[k] <= 0) delete p.inv[k]; } }
function sxGive(p, k, n = 1) { if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) return false; p.inv[k] = (p.inv[k] || 0) + n; return true; }
function sxNeedTxt(need) { return Object.entries(need).map(([k, n]) => n + ' ' + (LOOT[k] ? LOOT[k].name : k)).join(', '); }
function sxSend(p) { const X = sxState(), K = sxKey(p), M = X.mis[K];
  Net.toOne(p.id, { t: 'sxst', orders: (X.orders[K] || []).map(o => ({ k: o.k, ready: o.ready })), day: estDay(), mis: M ? { id: M.id, st: M.st } : null, cool: X.last[K] === estDay(), fix: !!X.ev.fixDay && X.ev.fixDay >= estDay() - 1 }); }
function sxMsg(p, m) {
  const X = sxState(), K = sxKey(p), a = m.a;
  if (a === 'sxopen') { sxSend(p); return true; }
  if (!sxNear(p)) { tell(p, 'Fale com o Sxan, na loja da torre.'); return true; }
  if (a === 'sxbuy') { const k = String(m.k); if (!SX_SHOP.includes(k)) return true; const T = INV_TOYS[k]; if (p.gold < T.price) { tell(p, 'Ouro insuficiente: ' + T.name + ' custa ' + T.price + '.'); return true; }
    if (!sxGive(p, k)) { tell(p, 'Inventário cheio.'); return true; } p.gold -= T.price; Net.toOne(p.id, { t: 'loot', k }); tell(p, SX_NAME + ': — Ha! Excelente escolha. ' + T.name + '!'); sendStat(p); sxSend(p); return true; }
  if (a === 'sxorder') { const k = String(m.k), R = SX_ORDERS[k]; if (!R) return true; const L = X.orders[K] = X.orders[K] || []; if (L.length >= 3) { tell(p, SX_NAME + ': — Três encomendas de uma vez é o meu limite. Busque as prontas primeiro!'); return true; }
    if (!sxHas(p, R.need) || p.gold < R.gold) { tell(p, 'Para encomendar ' + INV_TOYS[k].name + ' faltam peças ou ouro: ' + sxNeedTxt(R.need) + ' e ' + R.gold + ' de ouro.'); return true; }
    sxTake(p, R.need); p.gold -= R.gold; L.push({ k, ready: estDay() + R.days }); estateSave(); sendStat(p); tell(p, SX_NAME + ': — Anotado! ' + INV_TOYS[k].name + ' fica pronto ' + (R.days === 1 ? 'amanhã' : 'em ' + R.days + ' dias') + '. Busque na oficina, comigo.'); sxSend(p); return true; }
  if (a === 'sxcollect') { const L = X.orders[K] || [], now = estDay(); let got = 0; for (let i = L.length - 1; i >= 0; i--) if (L[i].ready <= now && sxGive(p, L[i].k)) { Net.toOne(p.id, { t: 'loot', k: L[i].k }); L.splice(i, 1); got++; }
    if (!got) tell(p, SX_NAME + ': — Ainda não ficou pronto. Paciência é a mãe da invenção! (A outra mãe é a explosão.)'); else { tell(p, SX_NAME + ': — Prontinho, saído do forno!'); estateSave(); } sendStat(p); sxSend(p); return true; }
  if (a === 'sxmis') { if (X.mis[K]) { tell(p, 'Você já tem uma missão do Sxan.'); return true; } if (X.last[K] === estDay()) { tell(p, SX_NAME + ': — Por hoje chega de experimentos! Volte amanhã.'); return true; }
    const id = String(m.id), Q = SX_MISSIONS[id]; if (!Q || (id === 'fix' && !(X.ev.fixDay >= estDay() - 1))) return true;
    if (id === 'test' && !sxGive(p, 'x_proto')) { tell(p, 'Inventário cheio.'); return true; }
    X.mis[K] = { id, st: id === 'test' ? 'go' : 'bring', t0: Date.now() }; estateSave(); if (id === 'test') Net.toOne(p.id, { t: 'loot', k: 'x_proto' }); tell(p, SX_NAME + ': — ' + Q.desc); sendStat(p); sxSend(p); return true; }
  if (a === 'sxdone') { const M = X.mis[K]; if (!M) return true; const Q = SX_MISSIONS[M.id];
    if (M.id === 'test' && M.st !== 'used') { tell(p, SX_NAME + ': — Você ainda não testou o protótipo longe da torre!'); return true; }
    if (Q.need) { if (!sxHas(p, Q.need)) { tell(p, 'Faltam peças: ' + sxNeedTxt(Q.need) + '.'); return true; } sxTake(p, Q.need); }
    delete X.mis[K]; X.last[K] = estDay(); p.gold += Q.gold; let extra = ''; if (Math.random() < (M.id === 'fix' ? 0.4 : 0.32)) { const e = SX_EXCL[Math.floor(Math.random() * SX_EXCL.length)]; if (sxGive(p, e)) { Net.toOne(p.id, { t: 'loot', k: e }); extra = ' E leve isto: ' + INV_TOYS[e].name + '!'; } }
    if (typeof repAdd === 'function') repAdd(p, 'cidade', Q.rep || 2, 'ajudou o Sxan');
    if (M.id === 'fix') X.ev.fixDay = 0; estateSave(); sendStat(p); tell(p, SX_NAME + ': — Brilhante! Aqui estão ' + Q.gold + ' de ouro.' + extra); sxSend(p); return true; }
  return false;
}
if (typeof phMsg === 'function') { const _phSX = phMsg; phMsg = function (p, m) { if (m && typeof m.a === 'string' && m.a.startsWith('sx') && sxMsg(p, m)) return; return _phSX(p, m); }; }
/* usar uma invenção: efeito para quem está perto */
if (typeof useItem === 'function') { const _uiSX = useItem; useItem = function (p, k) { const T = INV_TOYS[k]; if (!T) return _uiSX.apply(this, arguments);
  if (!p.inv[k] || p.downed) return; const now = Date.now(); if (now < (p.toyT || 0)) { tell(p, 'Espere a engenhoca esfriar um pouco.'); return; } p.toyT = now + 2500;
  if (k === 'x_proto') { const X = sxState(), M = X.mis[sxKey(p)], tt = towerTop(); if (!M || M.id !== 'test') { tell(p, 'O protótipo faz um barulhinho e não acontece nada.'); return; } if (tt && dist(p.x, p.y, tt.x, tt.y) < 40) { tell(p, 'Muito perto da torre: o Sxan pediu para testar bem longe, do outro lado da cidade.'); return; }
    delete p.inv[k]; M.st = 'used'; estateSave(); tell(p, 'O protótipo zumbe, solta faíscas, dá três pulinhos… e funciona! Volte e conte ao Sxan.'); }
  else if (!T.keep) { p.inv[k]--; if (p.inv[k] <= 0) delete p.inv[k]; }
  near(p.x, p.y, { t: 'toyfx', fx: T.fx, id: p.id, x: p.x, y: p.y, fl: p.fl || 0 }); sendStat(p); }; }
/* o apartamento da torre alugado por outro: o elevador não para lá */
function towerFloorDenied(p, b, to) { if (!b || !b.tower || to !== TOWER_APT_FL) return false; const a = S.estateL && S.estateL['apt:' + TOWER_APT]; if (!a || a.includes(String(p.name || '').trim().toLowerCase())) return false; tell(p, 'O ascensorista balança a cabeça: — O apartamento de luxo está alugado. Só o morador desce lá.'); return true; }

/* invenções pela cidade: balão a vapor, autômato andarilho, fogos à noite e explosão no laboratório */
function sxEvTick(now) {
  if (typeof S === 'undefined' || !S.npcs || typeof estateLoad !== 'function') return; const X = sxState(), d = estDay(), h = typeof empHour === 'function' ? empHour() : 12, tt = towerTop(); if (!tt) return;
  const E = X.ev; if (E.day !== d) { E.day = d; const r = (d * 9301 + 49297) % 233280 / 233280; E.balloon = 10 + Math.floor(r * 6); E.fire = r < 0.45; E.boom = 9 + Math.floor(((r * 7) % 1) * 8); E.did = {}; }
  if (h === E.balloon && !E.did.b) { E.did.b = 1; Net.toAll({ t: 'sxballoon', x: tt.x, y: tt.y, t0: Date.now() }); if (typeof sys === 'function') sys('🎈 Um balão a vapor sobe da Torre do Inventor e passa por cima da cidade!'); }
  if (h === 21 && E.fire && !E.did.f) { E.did.f = 1; Net.toAll({ t: 'sxfire', x: tt.x, y: tt.y, t0: Date.now() }); if (typeof sys === 'function') sys('🎆 Fogos de artifício no alto da Torre do Inventor! Os moradores param para olhar o céu.'); }
  if (h === E.boom && !E.did.x) { E.did.x = 1; E.fixDay = d; Net.toAll({ t: 'sxboom', x: tt.x, y: tt.y, t0: Date.now() }); if (typeof sys === 'function') sys('💥 BUM! Uma explosão de fumaça colorida sai do laboratório da Torre do Inventor. O Sxan está procurando ajuda para o conserto.'); estateSave(); }
  /* autômato: anda pela cidade das 8h às 18h */
  const bot = S.npcs.sx_bot, day = h >= 8 && h < 18;
  if (day && !bot) { const r = sxBotRoute(); if (r) { const n = { id: 'sx_bot', kind: 'automaton', name: 'Autômato do Sxan', transient: true, x: r[0][0], y: r[0][1], z: 0, fl: 0, fb: -1, hp: 400, maxHp: 400, downed: null, dead: false, dir: 0, route: r, ri: 0, sxbot: 1 }; S.npcs[n.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); } }
  else if (!day && bot && typeof visGone === 'function') visGone(bot);
}
function sxBotRoute() { const b = BUILDINGS[towerBi()]; if (!b) return null; const d = doorOf(b), pts = [[d.x, d.y]]; for (const [rx, ry] of [[1, 6], [-10, 6], [-10, 12], [1, 20], [12, 6], [21, -2], [21, -12]]) pts.push([CENTER + rx + 0.5, CENTER + ry + 0.5]); return pts; }
if (typeof housesTick === 'function') { const _htSX = housesTick; housesTick = function (now) { _htSX(now); try { if (!S.sxT || now - S.sxT > 2000) { S.sxT = now; sxEvTick(now); } } catch (e) { console.warn('torre', e); } }; }
/* o autômato anda pela rota (não é visitante: não vai embora pelo portão) */
function sxBotTick(n, now, dt) { if (now < (n.pauseT || 0)) { n.walk = false; return; } const wp = n.route[n.ri % n.route.length]; if (!n.rpath || !n.rpath.length) n.rpath = typeof planRoute === 'function' ? planRoute(n, wp[0], wp[1]) : [wp]; const q = n.rpath[0]; if (!q) { n.ri++; return; } if (npcWalk(n, q[0], q[1], 0.8, dt) || dist(n.x, n.y, q[0], q[1]) < 0.5) { n.rpath.shift(); if (!n.rpath.length) { n.ri++; n.pauseT = now + 3500 + Math.random() * 3000; if (Math.random() < 0.35 && typeof near === 'function') near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['*bzzt* BOM DIA!', 'VARRENDO… *clank*', 'O MESTRE SXAN… MANDA… LEMBRANÇAS.', '*tic tic tic*', 'NÍVEL DE VAPOR: ÓTIMO.'][Math.floor(Math.random() * 5)], ms: 1 }); } } }
if (typeof visitorTick === 'function') { const _vtSX = visitorTick; visitorTick = function (n, now, dt) { if (n.sxbot) { sxBotTick(n, now, dt); return; } return _vtSX.apply(this, arguments); }; }
/* o Sxan fica na loja; à noite ainda está lá, mexendo em alguma coisa (inventor não dorme) */
if (typeof dormSlotOf === 'function') { const _dsSX = dormSlotOf; dormSlotOf = function (id) { if (id === 'sxan') return null; return _dsSX.apply(this, arguments); }; }

/* ---------- cliente: aparência, conversa, loja ---------- */
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  NPC_LOOKS.inventor = () => Object.assign(heroLook('mage', 'adept', '#6a4a2a'), { armor: 'vest', body: tone('#5a3a22'), body2: tone('#c9a24a'), accent: tone('#c9a24a'), trim: tone('#d8b050'), head: 'none', hair: tone('#f2efe8'), hairStyle: 'curly', beard: tone('#e8e4dc'), beardStyle: 'mustache', brows: tone('#f2efe8'), weapon: null, shield: null, capeTone: null, cape: false, legs: tone('#3a3028'), boots: tone('#2a1e14'), skin: tone('#e8c3a0'), goggles: 1, mglove: 1 });   /* cientista maluco: cabelo branco arrepiado, óculos de solda na testa, avental de couro, luva mecânica */
  NPC_LOOKS.automaton = () => Object.assign(heroLook('knight', 'iron', '#c9a24a'), { armor: 'plate', body: tone('#c9a24a'), body2: tone('#8a6a2a'), headTone: tone('#d8b050'), head: 'greathelm', cape: false, weapon: null, shield: null, legs: tone('#b08a3a'), boots: tone('#6a4a1a'), trim: tone('#e8c060'), skin: tone('#c9a24a') });
}
if (typeof npcTraits === 'function') { const _ntSX = npcTraits; npcTraits = function (L, kind) { if (kind === 'inventor' || kind === 'automaton') { L.hS = kind === 'automaton' ? 1.02 : 0.97; L.wS = 1.0; return L; } return _ntSX.apply(this, arguments); }; }
if (typeof NPC_DIALOG !== 'undefined') {
  NPC_DIALOG.inventor = { greet: 'Ah! Um visitante! Cuidado com o fio, ele está… quase sempre desligado. Eu sou Sxan, o Criador! Inventos, engenhocas, maravilhas a vapor. O que vai ser?', opts: [['Como funciona a torre?', { local: 'Térreo: a loja. Em cima: a oficina das encomendas, o laboratório (não toque em nada que brilhe), a minha casa, um apartamento de luxo para alugar e, no topo, o observatório. O elevador redondo leva a todos!' }]] };
  NPC_DIALOG.automaton = { greet: '*bzzt* BOM… DIA… CIDADÃO. *clank* O MESTRE SXAN… MANDA… LEMBRANÇAS.', opts: [['Tudo bem?', { local: '*bzzt* NÍVEL DE VAPOR: ÓTIMO. NÍVEL DE ALEGRIA: 87%. *tic tic*' }]] };
}
if (typeof buildDialogOptions === 'function' && typeof G !== 'undefined') { const _bdSX = buildDialogOptions; buildDialogOptions = function (id) { const r = _bdSX.apply(this, arguments); try { if (id === 'sxan') { const box = $('dlg-opts'); for (const [t, fn] of [['🛒 Ver as invenções à venda', () => { closeDialog(); sxPanel('shop'); }], ['🔧 Encomendas (peças + ouro)', () => { closeDialog(); sxPanel('order'); }], ['🧪 Missões malucas', () => { closeDialog(); sxPanel('mis'); }]].reverse()) { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; b.className = 'active'; box.prepend(b); } } } catch (e) { } return r; }; }
function sxPanel(tab) { G.sxTab = tab; Net.send({ t: 'funda', a: 'sxopen' }); sxRender(); }
function sxRender() {
  let d = document.getElementById('sxpanel'); if (!G.sxTab) { if (d) d.remove(); return; } if (!d) { d = document.createElement('div'); d.id = 'sxpanel'; d.className = 'gpanel lift-panel sx-panel'; document.body.appendChild(d); }
  const S0 = G.sxSt || { orders: [], mis: null }, me = G.me, inv = (me && me.inv) || {}, tabs = [['shop', 'Loja'], ['order', 'Encomendas'], ['mis', 'Missões']];
  const row = (ic, t, sub, btn, dis, data) => '<div class="sx-row"><span class="sx-ic">' + ic + '</span><span class="sx-tx"><b>' + t + '</b><br><small>' + sub + '</small></span>' + (btn ? '<button class="sx-btn"' + (dis ? ' disabled' : '') + ' ' + data + '>' + btn + '</button>' : '') + '</div>';
  let body = '';
  if (G.sxTab === 'shop') body = '<div class="sx-note">— Tudo testado! Quase tudo. Só divertido, nada perigoso. Quase nada.</div>' + SX_SHOP.map(k => { const T = INV_TOYS[k]; return row(T.icon, T.name + ' · ' + T.price + ' ouro', T.desc, 'Comprar', me && me.gold < T.price, 'data-buy="' + k + '"'); }).join('');
  else if (G.sxTab === 'order') { const ready = (S0.orders || []).filter(o => o.ready <= S0.day).length;
    body = '<div class="sx-note">Traga as peças e um pouco de ouro; eu monto na oficina e fica pronto em 1 ou 2 dias. Até 3 encomendas por vez.</div>' + Object.keys(SX_ORDERS).map(k => { const R = SX_ORDERS[k], T = INV_TOYS[k], ok = Object.entries(R.need).every(([q, n]) => (inv[q] || 0) >= n) && me && me.gold >= R.gold; return row(T.icon, T.name, Object.entries(R.need).map(([q, n]) => n + ' ' + (LOOT[q] ? LOOT[q].name : q) + ' (' + (inv[q] || 0) + ')').join(' · ') + ' · ' + R.gold + ' ouro · ' + (R.days === 1 ? '1 dia' : R.days + ' dias'), 'Encomendar', !ok, 'data-order="' + k + '"'); }).join('')
      + '<div class="sx-sub">Suas encomendas</div>' + ((S0.orders || []).length ? S0.orders.map(o => row(INV_TOYS[o.k].icon, INV_TOYS[o.k].name, o.ready <= S0.day ? 'Pronta! Pode buscar.' : 'Fica pronta ' + (o.ready - S0.day === 1 ? 'amanhã' : 'em ' + (o.ready - S0.day) + ' dias') + '.', '', true, '')).join('') + (ready ? '<button class="sx-btn sx-wide" data-collect>Buscar as prontas (' + ready + ')</button>' : '') : '<div class="sx-note">Nenhuma encomenda ainda.</div>'); }
  else { const M = S0.mis; if (M) { const Q = SX_MISSIONS[M.id]; body = row('🧪', Q.name + (M.st === 'used' ? ' · protótipo testado!' : ''), Q.desc + ' Recompensa: ' + Q.gold + ' de ouro e, às vezes, uma invenção exclusiva.', 'Entregar', false, 'data-done'); }
    else if (S0.cool) body = '<div class="sx-note">— Por hoje chega de experimentos! Volte amanhã.</div>';
    else body = '<div class="sx-note">Uma missão por dia. Paga em ouro, reputação com os moradores e, às vezes, uma invenção que não se compra.</div>' + Object.entries(SX_MISSIONS).filter(([id]) => id !== 'fix' || S0.fix).map(([id, Q]) => row(id === 'fix' ? '💥' : id === 'test' ? '🔧' : '⚙️', Q.name + ' · ' + Q.gold + ' ouro', Q.desc, 'Aceitar', false, 'data-mis="' + id + '"')).join(''); }
  d.innerHTML = '<div class="gp-head"><span>⚙ Sxan the Creator</span><button class="gp-x" data-x>✕</button></div><div class="est-tabs sx-tabs">' + tabs.map(([k, t]) => '<button class="' + (G.sxTab === k ? 'on' : '') + '" data-tab="' + k + '">' + t + '</button>').join('') + '</div><div class="sx-body">' + body + '</div>';
  d.querySelector('[data-x]').onclick = () => { G.sxTab = null; d.remove(); };
  d.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { G.sxTab = b.dataset.tab; sxRender(); });
  d.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => Net.send({ t: 'funda', a: 'sxbuy', k: b.dataset.buy }));
  d.querySelectorAll('[data-order]').forEach(b => b.onclick = () => Net.send({ t: 'funda', a: 'sxorder', k: b.dataset.order }));
  d.querySelectorAll('[data-mis]').forEach(b => b.onclick = () => Net.send({ t: 'funda', a: 'sxmis', id: b.dataset.mis }));
  const c = d.querySelector('[data-collect]'); if (c) c.onclick = () => Net.send({ t: 'funda', a: 'sxcollect' }); const dn = d.querySelector('[data-done]'); if (dn) dn.onclick = () => Net.send({ t: 'funda', a: 'sxdone' });
}
if (typeof document !== 'undefined' && typeof G !== 'undefined') document.addEventListener('keydown', e => { if (e.key === 'Escape' && G.sxTab) { G.sxTab = null; sxRender(); } });
if (typeof openDialog === 'function' && typeof G !== 'undefined') { const _odSX = openDialog; openDialog = function (id) { const e = G.npcs && G.npcs[id]; if (e && e.kind === 'automaton') { showToast('Autômato do Sxan: *bzzt* BOM DIA, CIDADÃO! *clank clank*'); return; } return _odSX.apply(this, arguments); }; }
if (typeof progEvent === 'function') { const _peSX = progEvent; progEvent = function (m, now) {
  if (m.t === 'sxst') { G.sxSt = m; if (G.sxTab) sxRender(); return true; }
  if (m.t === 'toyfx') { (G.toyFx = G.toyFx || []).push({ fx: m.fx, id: m.id, x: m.x, y: m.y, fl: m.fl, t0: performance.now() }); return true; }
  if (m.t === 'sxballoon' || m.t === 'sxfire' || m.t === 'sxboom') { (G.sxEv = G.sxEv || []).push({ k: m.t, x: m.x, y: m.y, t0: performance.now() }); return true; }
  return _peSX(m, now);
}; }

/* ---------- cliente: efeitos desenhados por cima do mundo ---------- */
const SX_COLS = ['#ff5a5a', '#ffb43a', '#ffe85a', '#5aff7a', '#5ad8ff', '#8a7aff', '#ff6ae0'];
function sxRand(i, k) { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); }
function sxDrawFx(ctx, F, now) {
  const e = F.id === G.myId ? G.me : (G.players && G.players[F.id]) || (G.npcs && G.npcs[F.id]), wx = e ? (e.rx != null ? e.rx : e.x) : F.x, wy = e ? (e.ry != null ? e.ry : e.y) : F.y, p = iso(wx, wy), ox = G.view.ox, oy = G.view.oy, X = p.sx + ox, Y = p.sy + oy - 30, t = (now - F.t0) / 1000, dur = (SX_FX_MS[F.fx] || 5000) / 1000, fade = Math.max(0, Math.min(1, (dur - t) / 0.8)), k = F.fx;
  ctx.save(); ctx.globalAlpha = fade;
  if (k === 'confetti' || k === 'gears' && false) { for (let i = 0; i < 60; i++) { const a = sxRand(i, 1) * 6.28, v = 40 + sxRand(i, 2) * 70, tx = X + Math.cos(a) * v * Math.min(1, t * 2), ty = Y - 20 + Math.sin(a) * v * 0.5 * Math.min(1, t * 2) + t * t * 30; ctx.fillStyle = SX_COLS[i % 7]; ctx.save(); ctx.translate(tx, ty); ctx.rotate(t * 6 + i); ctx.fillRect(-3, -1.5, 6, 3); ctx.restore(); } }
  else if (k === 'fireworks' || k === 'stars') { const top = Y - 160; if (k === 'fireworks' && t < 0.9) { ctx.strokeStyle = '#ffd890'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, Y - 10); ctx.lineTo(X + Math.sin(t * 9) * 3, Y - 10 - (Y - 10 - top) * t / 0.9); ctx.stroke(); }
    else { const tt = k === 'fireworks' ? t - 0.9 : t; for (let b = 0; b < (k === 'stars' ? 1 : 3); b++) { const bx = X + (b - 1) * 50 * (k === 'stars' ? 0 : 1), by = top + b % 2 * 30, bt = tt - b * 0.35; if (bt < 0) continue; for (let i = 0; i < 36; i++) { const a = i / 36 * 6.28, r = (k === 'stars' ? 20 + bt * 25 : bt * 90) * (0.7 + sxRand(i, b) * 0.3), sx = bx + Math.cos(a) * r, sy = by + Math.sin(a) * r * (k === 'stars' ? 2 : 1) + bt * bt * (k === 'stars' ? 40 : 18); ctx.fillStyle = k === 'stars' ? '#ffe28a' : SX_COLS[(i + b * 2) % 7]; ctx.beginPath(); ctx.arc(sx, sy, k === 'stars' ? 2.6 : 2.2, 0, 6.28); ctx.fill(); } } } }
  else if (k === 'smoke' || k === 'proto') { for (let i = 0; i < 26; i++) { const a = sxRand(i, 3) * 6.28, r = 10 + t * (18 + sxRand(i, 4) * 20), sx = X + Math.cos(a) * r, sy = Y + 6 - t * 14 + Math.sin(a) * r * 0.45; ctx.fillStyle = k === 'proto' ? (i % 3 ? '#ffe070' : '#7ad8ff') : ['#a05ae0', '#5ae07a', '#ff9a3a'][i % 3]; ctx.globalAlpha = fade * 0.35; ctx.beginPath(); ctx.arc(sx, sy, k === 'proto' ? 3 : 10 + t * 3, 0, 6.28); ctx.fill(); } }
  else if (k === 'bubbles') { for (let i = 0; i < 24; i++) { const ph = (t * 0.35 + sxRand(i, 5)) % 1, sx = X + (sxRand(i, 6) - 0.5) * 70 + Math.sin(t * 2 + i) * 6, sy = Y - ph * 110; ctx.globalAlpha = fade * (1 - ph) * 0.8; ctx.strokeStyle = '#d8f4ff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(sx, sy, 4 + sxRand(i, 7) * 6, 0, 6.28); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(sx - 2, sy - 3, 2, 2); } }
  else if (k === 'notes') { ctx.font = '700 15px serif'; for (let i = 0; i < 10; i++) { const ph = (t * 0.4 + i / 10) % 1, sx = X + Math.sin(ph * 6 + i) * 26, sy = Y - 10 - ph * 70; ctx.globalAlpha = fade * (1 - ph); ctx.fillStyle = SX_COLS[i % 7]; ctx.fillText(i % 2 ? '♪' : '♫', sx, sy); } }
  else if (k === 'bird' || k === 'minibot' || k === 'propeller') { if (k === 'bird') { const a = t * 2.4, bx = X + Math.cos(a) * 26, by = Y - 34 + Math.sin(a) * 9, fl = Math.sin(t * 22) * 5; ctx.fillStyle = '#d8a83a'; ctx.beginPath(); ctx.ellipse(bx, by, 6, 4, 0, 0, 6.28); ctx.fill(); ctx.strokeStyle = '#a07a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 1, by); ctx.lineTo(bx - 6, by - 4 - fl); ctx.moveTo(bx + 1, by); ctx.lineTo(bx + 6, by - 4 - fl); ctx.stroke(); ctx.fillStyle = '#ff8a3a'; ctx.fillRect(bx + (Math.cos(a + 1.6) > 0 ? 5 : -8), by - 1, 3, 2); }
    else if (k === 'minibot') { const a = t * 0.9, bx = X + Math.cos(a) * 22, by = Y + 22 + Math.sin(a) * 10, st = Math.sin(t * 10) * 2; ctx.fillStyle = '#c9a24a'; ctx.fillRect(bx - 5, by - 14, 10, 10); ctx.fillStyle = '#e8c060'; ctx.fillRect(bx - 4, by - 21, 8, 7); ctx.fillStyle = '#6ad8ff'; ctx.fillRect(bx - 3, by - 19, 2, 2); ctx.fillRect(bx + 1, by - 19, 2, 2); ctx.fillStyle = '#8a6a2a'; ctx.fillRect(bx - 4, by - 4, 3, 4 + st); ctx.fillRect(bx + 1, by - 4, 3, 4 - st); ctx.strokeStyle = '#8a6a2a'; ctx.beginPath(); ctx.moveTo(bx, by - 21); ctx.lineTo(bx, by - 26); ctx.stroke(); }
    else { const hx = X, hy = Y - 40, s = Math.cos(t * 30); ctx.fillStyle = '#d83a3a'; ctx.beginPath(); ctx.ellipse(hx, hy + 4, 8, 4, 0, 3.14, 6.28); ctx.fill(); ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy - 6); ctx.stroke(); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(hx, hy - 6, 11 * Math.abs(s) + 1, 2, 0, 0, 6.28); ctx.fill(); } }
  else if (k === 'colors') { const c = SX_COLS[Math.floor(t * 2) % 7], g = ctx.createRadialGradient(X, Y + 10, 2, X, Y + 10, 60); g.addColorStop(0, c + 'aa'); g.addColorStop(1, c + '00'); ctx.globalAlpha = fade * 0.7; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X, Y + 10, 60, 32, 0, 0, 6.28); ctx.fill(); }
  else if (k === 'miniballoon') { const by = Y - 30 - t * 22, bx = X + Math.sin(t * 1.4) * 10; ctx.fillStyle = '#d84a3a'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 6.28); ctx.fill(); ctx.fillStyle = '#ffd84a'; ctx.fillRect(bx - 9, by - 1, 18, 2); ctx.strokeStyle = '#6a4a2a'; ctx.beginPath(); ctx.moveTo(bx - 4, by + 8); ctx.lineTo(bx - 3, by + 15); ctx.moveTo(bx + 4, by + 8); ctx.lineTo(bx + 3, by + 15); ctx.stroke(); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(bx - 4, by + 15, 8, 5); for (let i = 0; i < 4; i++) { ctx.globalAlpha = fade * 0.3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx - 2 + i * 1.5, by + 22 + i * 6, 3 + i, 0, 6.28); ctx.fill(); } }
  else if (k === 'snow') { for (let i = 0; i < 40; i++) { const ph = (t * 0.25 + sxRand(i, 8)) % 1, sx = X + (sxRand(i, 9) - 0.5) * 120 + Math.sin(t + i) * 5, sy = Y - 90 + ph * 120; ctx.globalAlpha = fade * Math.min(1, (1 - ph) * 3); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, 6.28); ctx.fill(); } }
  else if (k === 'rainbow') { ctx.lineWidth = 4; for (let i = 0; i < 7; i++) { ctx.strokeStyle = SX_COLS[i]; ctx.globalAlpha = fade * 0.75 * Math.min(1, t); ctx.beginPath(); ctx.arc(X, Y + 10, 70 - i * 4, Math.PI, 0); ctx.stroke(); } }
  else if (k === 'gears') { for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.09, gx = X + Math.cos(a) * 30, gy = Y - 10 + Math.sin(a) * 12, r = 6 + i * 2; ctx.fillStyle = '#e8c060'; ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * (i % 2 ? -4 : 4)); for (let q = 0; q < 8; q++) { ctx.rotate(0.785); ctx.fillRect(-2, -r - 3, 4, 4); } ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill(); ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 6.28); ctx.fill(); ctx.restore(); } }
  ctx.restore();
}
function sxDrawEv(ctx, E, now) {
  const p = iso(E.x, E.y), ox = G.view.ox, oy = G.view.oy, X = p.sx + ox, top = p.sy + oy - 330, t = (now - E.t0) / 1000;
  ctx.save();
  if (E.k === 'sxballoon') { if (t > 70) { ctx.restore(); return false; } const bx = X + t * 14 - 60 * Math.max(0, 1 - t / 4), by = top - 30 - Math.min(t, 6) * 9 + Math.sin(t * 0.8) * 6; ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.ellipse(bx, by, 30, 36, 0, 0, 6.28); ctx.fill(); for (let i = -2; i <= 2; i++) { ctx.fillStyle = i % 2 ? '#c9a24a' : '#9a4a32'; ctx.beginPath(); ctx.ellipse(bx + i * 9, by, 4, 35, 0, 0, 6.28); ctx.fill(); } ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - 20, by + 26); ctx.lineTo(bx - 9, by + 52); ctx.moveTo(bx + 20, by + 26); ctx.lineTo(bx + 9, by + 52); ctx.stroke(); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(bx - 10, by + 52, 20, 11); ctx.fillStyle = '#c9a24a'; ctx.fillRect(bx - 11, by + 51, 22, 3);
    for (let i = 0; i < 5; i++) { const ph = (t * 0.6 + i / 5) % 1; ctx.globalAlpha = 0.35 * (1 - ph); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx + 12 + ph * 20, by + 50 - ph * 30, 4 + ph * 8, 0, 6.28); ctx.fill(); } }
  else if (E.k === 'sxfire') { if (t > 40) { ctx.restore(); return false; } for (let b = 0; b < 14; b++) { const bt = t - b * 2.7; if (bt < 0 || bt > 3.2) continue; const bx = X + (sxRand(b, 1) - 0.5) * 240, by = top + 10 - sxRand(b, 2) * 70; if (bt < 0.7) { ctx.strokeStyle = '#ffd890'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, top); ctx.lineTo(X + (bx - X) * bt / 0.7, top + (by - top) * bt / 0.7); ctx.stroke(); continue; } const tt = bt - 0.7; ctx.globalAlpha = Math.max(0, 1 - tt / 2.5); for (let i = 0; i < 56; i++) { const a = i / 56 * 6.28, r = (1 - Math.pow(1 - Math.min(1, tt / 1.2), 2)) * 95 * (0.7 + sxRand(i, b) * 0.3); ctx.fillStyle = SX_COLS[(i + b) % 7]; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * r, by + Math.sin(a) * r + tt * tt * 16, 3.2, 0, 6.28); ctx.fill(); ctx.globalAlpha *= 0.999; } { const gl = ctx.createRadialGradient(bx, by, 2, bx, by, 60); gl.addColorStop(0, 'rgba(255,240,200,' + (0.35 * Math.max(0, 1 - tt)) + ')'); gl.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx, by, 60, 0, 6.28); ctx.fill(); } } }
  else if (E.k === 'sxboom') { if (t > 45) { ctx.restore(); return false; } if (t < 0.6) { ctx.globalAlpha = 1 - t / 0.6; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(X, top + 60, 30 + t * 120, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; } for (let i = 0; i < 30; i++) { const ph = (t * 0.12 + i / 30) % 1, sx = X + 18 + Math.sin(i * 1.7 + t * 0.4) * (10 + ph * 40) + ph * 30, sy = top + 70 - ph * 150; ctx.globalAlpha = 0.4 * (1 - ph) * Math.min(1, (45 - t) / 8); ctx.fillStyle = ['#a05ae0', '#5ae07a', '#ff9a3a', '#5ab4ff'][i % 4]; ctx.beginPath(); ctx.arc(sx, sy, 10 + ph * 18, 0, 6.28); ctx.fill(); } }
  ctx.restore(); return true;
}
if (typeof G !== 'undefined' && typeof addEventListener === 'function') addEventListener('load', () => { if (typeof drawJobsOverlay !== 'function') return; const _djSX = drawJobsOverlay; drawJobsOverlay = function (ctx, now) { try {
  const pn = performance.now(), me = G.me; if (me) {
    if (G.toyFx && G.toyFx.length) { G.toyFx = G.toyFx.filter(F => pn - F.t0 < (SX_FX_MS[F.fx] || 5000)); for (const F of G.toyFx) if ((F.fl || 0) === (me.fl || 0) && Math.hypot(F.x - me.x, F.y - me.y) < 30) sxDrawFx(ctx, F, pn); }
    if (G.sxEv && G.sxEv.length) G.sxEv = G.sxEv.filter(E => !(me.fl || 0) && Math.hypot(E.x - me.x, E.y - me.y) < 60 ? sxDrawEv(ctx, E, pn) : pn - E.t0 < 70000);
  } } catch (e) { } return _djSX(ctx, now); }; });
/* na loja da torre não tem turno de trabalho (o Sxan trabalha sozinho) */
if (typeof G !== 'undefined' && typeof addEventListener === 'function') addEventListener('load', () => { if (typeof shiftHere !== 'function') return; const _shSX = shiftHere; shiftHere = function () { try { const me = G.me, bi = me && ((me.fl || 0) ? me.fb : bldAt(me.x, me.y)); if (bi >= 0 && BUILDINGS[bi] && BUILDINGS[bi].tower) return false; } catch (e) { } return _shSX.apply(this, arguments); }; });

/* ---------- cliente 3D: a torre steampunk e os móveis novos ---------- */
/* torre cilíndrica (planta circular 8 x 8): o nome não pode ser mTower, que é o das torres da muralha em scene3d.js */
function mInvTower(b, night) {
  const w = b.w, h = b.h, o = grp(), cx = w / 2, cz = h / 2, dX = doorCol(b) + 0.5, FH = 2.4, NF = 6, H = FH * (NF - 1), R0 = Math.min(w, h) / 2 - 0.12, R1 = R0 - 0.12;
  const stone = smat('stoneblock', '#8a8274', { bump: 1.2 }), pave = smat('stoneblock', '#77705f', { bump: 1.3 }), brick = smat('brick', '#6a3a2a', { bump: 1.1 }), brass = smat(null, '#c9a24a', { metal: 0.85, rough: 0.32 }), copper = smat(null, '#b8693a', { metal: 0.8, rough: 0.35 }), verd = smat(null, '#5a9a86', { metal: 0.5, rough: 0.45 }), iron = smat(null, '#2e2a26', { metal: 0.7, rough: 0.5 }), wood = smat('wood', '#4a2e1a', { bump: 0.8 });
  const glow = smat(null, '#ffcf7a', { emissive: '#ffa040', ei: night ? 1.5 : 0.25, rough: 0.4 }), red = smat(null, '#c83a2a', { rough: 0.5 });
  const at = (r, a) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r], face = (g, r, a, y) => { const [x, z] = at(r, a); g.position.set(x, y, z); g.rotation.y = Math.PI / 2 - a; o.add(g); return g; };
  const aDoor = Math.atan2(Math.sqrt(Math.max(0, R0 * R0 - (dX - cx) * (dX - cx))), dX - cx);   /* ângulo da porta (lado da frente, +z) */
  /* calçada de pedra no quadrado todo e o corpo: térreo de pedra, tijolo em cima */
  o.add(wbox(w, 0.12, h, cx, 0.06, cz, pave, 1.4));
  o.add(mk(cylUV(new THREE.CylinderGeometry(R0 + 0.12, R0 + 0.16, 0.4, 48).translate(cx, 0.2, cz), 10, 1), stone));
  o.add(mk(cylUV(new THREE.CylinderGeometry(R0, R0, FH, 48, 1, true).translate(cx, FH / 2, cz), 9, 0.9), stone));
  o.add(mk(cylUV(new THREE.CylinderGeometry(R1, R1, H - FH, 48, 4, true).translate(cx, FH + (H - FH) / 2, cz), 12, 0.9), brick));
  for (let f = 1; f < NF; f++) o.add(mk(new THREE.TorusGeometry(f === 1 ? R0 + 0.02 : R1 + 0.03, 0.08, 6, 56).rotateX(Math.PI / 2).translate(cx, f * FH, cz), brass));   /* cintas de latão em cada andar */
  /* escotilhas redondas: oito por andar, desencontradas */
  const port = () => { const g = grp(); g.add(mk(new THREE.TorusGeometry(0.32, 0.07, 8, 18), brass)); g.add(mk(new THREE.CircleGeometry(0.3, 18), glow)); for (let q = 0; q < 6; q++) { const a = q / 6 * 6.28; g.add(mk(new THREE.SphereGeometry(0.035, 6, 4).translate(Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0.05), brass)); } return g; };
  for (let f = 1; f < NF - 1; f++) for (let q = 0; q < 8; q++) { const a = (q + (f % 2) * 0.5) / 8 * Math.PI * 2; face(port(), R1 + 0.02, a, f * FH + 1.25); }
  /* térreo: portal de pedra com a porta de latão, e duas vitrines curvas */
  { const g = grp(); g.add(wbox(1.7, 2.6, 0.5, 0, 1.3, 0, stone, 1)); g.add(wbox(1.9, 0.2, 0.6, 0, 2.7, 0.02, brass, 1)); face(g, R0 - 0.05, aDoor, 0); }
  { const [x, z] = at(R0 + 0.26, aDoor); NB.door(o, x, z, Math.PI / 2 - aDoor, 1.1, 2.0, wood, brass); }
  for (const s of [-1, 1]) { const a = aDoor + s * 0.62, g = grp(); g.add(wbox(1.4, 1.2, 0.06, 0, 1.2, 0, glow, 1)); g.add(wbox(1.56, 0.1, 0.14, 0, 0.56, 0.03, brass, 1)); g.add(wbox(1.56, 0.1, 0.14, 0, 1.84, 0.03, brass, 1)); g.add(wbox(0.06, 1.3, 0.1, 0, 1.2, 0.04, brass, 1)); face(g, R0 + 0.03, a, 0); }
  for (const s of [-1, 1]) { const [x, z] = at(R0 + 0.22, aDoor + s * 0.3); NB.lantern(o, x, 2.2, z, -(aDoor + s * 0.3), '#ffc070', night); }
  /* engrenagens na parede (do lado que a câmera vê) e uma como placa sobre a porta */
  const gear = (r, th, m) => { const g = grp(); g.add(mk(new THREE.CylinderGeometry(r, r, th, 24).rotateX(Math.PI / 2), m)); const n = Math.max(8, Math.round(r * 14)); for (let q = 0; q < n; q++) { const a = q / n * 6.28, t = mk(new THREE.BoxGeometry(r * 0.22, r * 0.24, th), m); t.position.set(Math.cos(a) * (r + r * 0.1), Math.sin(a) * (r + r * 0.1), 0); t.rotation.z = a; g.add(t); } g.add(mk(new THREE.CylinderGeometry(r * 0.28, r * 0.28, th + 0.04, 12).rotateX(Math.PI / 2), iron)); return g; };
  face(gear(0.55, 0.1, brass), R0 + 0.32, aDoor, 3.05);
  face(gear(1.1, 0.16, brass), R1 + 0.1, aDoor + 1.2, FH * 2.3); face(gear(0.7, 0.14, copper), R1 + 0.12, aDoor + 1.45, FH * 2.3 + 1.4); face(gear(0.85, 0.16, brass), R1 + 0.1, aDoor - 1.1, FH * 3.6); face(gear(0.6, 0.14, copper), R1 + 0.12, aDoor + 0.55, FH * 4.3);
  /* canos de cobre subindo pela parede, com luvas de latão e uma válvula vermelha */
  for (const a of [aDoor + 0.95, aDoor - 0.75, aDoor + 2.4]) { const [x, z] = at(R1 + 0.14, a); o.add(mk(new THREE.CylinderGeometry(0.09, 0.09, H + 0.6, 10).translate(x, (H + 0.6) / 2, z), copper)); for (let f = 1; f < NF; f++) o.add(mk(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 10).translate(x, f * FH + 0.3, z), brass)); }
  { const v = grp(); v.add(mk(new THREE.TorusGeometry(0.16, 0.04, 6, 12), red)); face(v, R1 + 0.3, aDoor + 0.95, FH * 1.6); }
  /* cantos do quadrado (fora do círculo): maquinário */
  const boiler = (x, z, s) => { o.add(mk(new THREE.CylinderGeometry(0.42 * s, 0.42 * s, 1.1 * s, 16).translate(x, 0.12 + 0.55 * s, z), copper)); for (const y of [0.3, 0.7, 1.05]) o.add(mk(new THREE.TorusGeometry(0.43 * s, 0.035, 6, 18).rotateX(Math.PI / 2).translate(x, 0.12 + y * s, z), brass)); o.add(mk(new THREE.SphereGeometry(0.42 * s, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0.12 + 1.1 * s, z), copper)); o.add(mk(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8).translate(x, 0.12 + 1.6 * s, z), iron));
    for (let k = 0; k < 3; k++) o.add(mk(new THREE.SphereGeometry(0.16 + k * 0.08, 8, 6).translate(x + k * 0.1, 0.12 + 2.1 * s + k * 0.3, z), smat(null, '#f0f0f0', { transparent: true, opacity: 0.4, rough: 1, depthWrite: false }))); };
  const pipeIn = (x, z, y) => { const a = Math.atan2(z - cz, x - cx), d = Math.hypot(x - cx, z - cz) - R0 + 0.05, p = mk(new THREE.CylinderGeometry(0.08, 0.08, d, 8).rotateZ(Math.PI / 2), copper); const [mx, mz] = at(R0 + d / 2 - 0.05, a); p.position.set(mx, y, mz); p.rotation.y = -a; o.add(p); const [ex, ez] = at(R0 + 0.02, a); o.add(mk(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 10).rotateZ(Math.PI / 2).rotateY(-a).translate(ex, y, ez), brass)); };
  const crate = (x, z, y, s, r) => { const m = wbox(0.5 * s, 0.5 * s, 0.5 * s, 0, 0, 0, smat('wood', '#7a5a34', { bump: 1 }), 1.2); m.position.set(x, 0.12 + y + 0.25 * s, z); m.rotation.y = r; o.add(m); };
  const C = [[0.75, 0.75], [w - 0.75, 0.75], [0.75, h - 0.75], [w - 0.75, h - 0.75]];
  for (let q = 0; q < 4; q++) { const [x, z] = C[q]; if (Math.hypot(x - cx, z - cz) < R0 + 0.35) continue;
    if (q === 0) { boiler(x, z, 1); pipeIn(x, z, 1.0); }
    else if (q === 1) { crate(x - 0.15, z, 0, 1, 0.2); crate(x + 0.2, z + 0.25, 0, 0.8, -0.3); crate(x, z + 0.05, 0.5, 0.7, 0.6); o.add(mk(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12).translate(x - 0.35, 0.4, z + 0.35), smat('wood', '#5a3a20', { bump: 0.8 }))); }
    else if (q === 2) { const g = gear(0.55, 0.12, brass); g.position.set(x, 0.75, z); g.rotation.y = Math.PI / 4; o.add(g); o.add(wbox(0.3, 0.3, 0.6, x, 0.27, z, iron, 1)); boiler(x + 0.25, z - 0.3, 0.55); }
    else { boiler(x, z, 0.8); pipeIn(x, z, 0.8); const wv = mk(new THREE.TorusGeometry(0.18, 0.035, 6, 14), red); wv.position.set(x - 0.35, 0.8, z - 0.1); wv.rotation.y = 0.8; o.add(wv); } }
  /* telhado: laje redonda com guarda-corpo, observatório de vidro e latão, cúpula de cobre verde e o telescópio */
  o.add(mk(cylUV(new THREE.CylinderGeometry(R1 + 0.25, R1 + 0.2, 0.22, 48).translate(cx, H + 0.11, cz), 10, 1), stone));
  for (let q = 0; q < 40; q++) { const [x, z] = at(R1 + 0.15, q / 40 * Math.PI * 2); o.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6).translate(x, H + 0.55, z), iron)); }
  o.add(mk(new THREE.TorusGeometry(R1 + 0.15, 0.04, 6, 56).rotateX(Math.PI / 2).translate(cx, H + 0.9, cz), brass));
  const RO = R1 - 1.2;
  o.add(mk(new THREE.CylinderGeometry(RO, RO, FH, 24, 1, true).translate(cx, H + FH / 2 + 0.2, cz), smat(null, '#bfe4f0', { rough: 0.05, metal: 0.3, transparent: true, opacity: 0.45, emissive: '#6ab4d8', ei: night ? 0.6 : 0.1, side: THREE.DoubleSide })));
  for (let q = 0; q < 12; q++) { const [x, z] = at(RO, q / 12 * 6.28); o.add(mk(new THREE.CylinderGeometry(0.05, 0.05, FH, 6).translate(x, H + FH / 2 + 0.2, z), brass)); }
  o.add(mk(new THREE.TorusGeometry(RO, 0.07, 6, 28).rotateX(Math.PI / 2).translate(cx, H + 0.25, cz), brass)); o.add(mk(new THREE.TorusGeometry(RO, 0.08, 6, 28).rotateX(Math.PI / 2).translate(cx, H + FH + 0.2, cz), brass));
  o.add(mk(new THREE.SphereGeometry(RO + 0.05, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(cx, H + FH + 0.2, cz), verd));
  for (let q = 0; q < 8; q++) { const rib = mk(new THREE.TorusGeometry(RO + 0.07, 0.035, 4, 16, Math.PI / 2), brass); rib.rotation.y = q / 8 * 6.28; rib.position.set(cx, H + FH + 0.2, cz); o.add(rib); }
  { const sc = grp(); sc.add(mk(new THREE.CylinderGeometry(0.22, 0.32, 3.0, 14).translate(0, 1.5, 0), brass)); sc.add(mk(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 14).translate(0, 3.0, 0), copper)); sc.add(mk(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 14).translate(0, 0.2, 0), iron)); sc.rotation.z = -0.75; sc.rotation.y = 0.6; sc.position.set(cx + 0.3, H + FH + 0.6, cz); o.add(sc); }
  o.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6).translate(cx, H + FH + RO + 0.85, cz), iron)); o.add(mk(new THREE.SphereGeometry(0.1, 8, 6).translate(cx, H + FH + RO + 1.55, cz), brass));
  /* chaminés de ferro na borda da laje, soltando vapor */
  const puff = smat(null, '#f0f0f0', { transparent: true, opacity: 0.45, rough: 1, depthWrite: false });
  for (const a of [aDoor + Math.PI * 0.85, aDoor - Math.PI * 0.7]) { const [x, z] = at(R1 - 0.5, a); o.add(mk(new THREE.CylinderGeometry(0.2, 0.24, 2.2, 10).translate(x, H + 1.1, z), iron)); o.add(mk(new THREE.CylinderGeometry(0.3, 0.2, 0.25, 10).translate(x, H + 2.3, z), brass)); for (let k = 0; k < 4; k++) o.add(mk(new THREE.SphereGeometry(0.25 + k * 0.12, 8, 6).translate(x + k * 0.18, H + 2.65 + k * 0.42, z - k * 0.1), puff)); }
  return o;
}
/* interior da torre redonda: parede em círculo (baixa do lado da câmera, alta no fundo), escotilhas, cano de cobre e cinta de latão */
function roundShell(o, b, fl, P) {
  const { w, h, hw, t, knee, KH, wallM, capM, dx } = P, cx = w / 2, cz = h / 2, R = Math.min(w, h) / 2, N = 48, seg = 2 * Math.PI * R / N + 0.04;
  const brass = smat(null, '#c9a24a', { metal: 0.85, rough: 0.32 }), copper = smat(null, '#b8693a', { metal: 0.8, rough: 0.35 }), glow = smat(null, '#ffcf7a', { emissive: '#ffa040', ei: 0.8, rough: 0.4 });
  const KV = [0, 0]; for (const f of knee) { const d = { front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0] }[f]; KV[0] += d[0]; KV[1] += d[1]; } const kl = Math.hypot(KV[0], KV[1]) || 1;
  const zDoor = cz + Math.sqrt(Math.max(0, R * R - (dx - cx) * (dx - cx)));
  for (let q = 0; q < N; q++) { const a = (q + 0.5) / N * Math.PI * 2, nx = Math.cos(a), nz = Math.sin(a), x = cx + nx * (R - t / 2), z = cz + nz * (R - t / 2);
    if (fl === 0 && Math.hypot(x - dx, z - zDoor) < 0.62) continue;   /* vão da porta */
    const low = (nx * KV[0] + nz * KV[1]) / kl > 0.2, hh = low ? KH : hw, m = mk(wuv(new THREE.BoxGeometry(seg, hh, t), 0.7), wallM); m.position.set(x, hh / 2, z); m.rotation.y = Math.PI / 2 - a; o.add(m);
    if (low) { const c = mk(new THREE.BoxGeometry(seg + 0.02, 0.05, t + 0.04), capM); c.position.set(x, KH + 0.025, z); c.rotation.y = Math.PI / 2 - a; o.add(c); }
    else { if (q % 6 === 3) { const g = grp(); g.add(mk(new THREE.TorusGeometry(0.26, 0.06, 8, 18), brass)); g.add(mk(new THREE.CircleGeometry(0.24, 18), glow)); g.position.set(cx + nx * (R - t - 0.01), Math.min(hw * 0.6, 1.45), cz + nz * (R - t - 0.01)); g.rotation.y = -Math.PI / 2 - a; o.add(g); }
      if (hw > 1.6) { const p = mk(new THREE.BoxGeometry(seg, 0.1, 0.1), copper); p.position.set(cx + nx * (R - t - 0.06), hw - 0.35, cz + nz * (R - t - 0.06)); p.rotation.y = Math.PI / 2 - a; o.add(p); }
      const bnd = mk(new THREE.BoxGeometry(seg, 0.06, 0.05), brass); bnd.position.set(cx + nx * (R - t - 0.03), 0.9, cz + nz * (R - t - 0.03)); bnd.rotation.y = Math.PI / 2 - a; o.add(bnd); } }
  { const pl = new THREE.PointLight(0xffb060, 0.55, R * 2.2); pl.position.set(cx - R * 0.5 * (KV[0] / kl), 1.8, cz - R * 0.5 * (KV[1] / kl)); o.add(pl); }
}
function towerFurn(g, f, C) {
  const brass = smat(null, '#c9a24a', { metal: 0.85, rough: 0.32 }), copper = smat(null, '#b8693a', { metal: 0.8, rough: 0.35 }), iron = smat(null, '#2e2a26', { metal: 0.7, rough: 0.5 }), wood = smat('wood', '#5a3a20', { bump: 0.8 }), night = typeof R3 !== 'undefined' && R3.night;
  const glowB = smat(null, '#9ad8ff', { emissive: '#4ab4ff', ei: 1.2, rough: 0.3 }), glowA = smat(null, '#ffcf7a', { emissive: '#ffa040', ei: 0.9, rough: 0.4 }), sub = grp(), rot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][f.v | 0];
  const gearM = (r, th, m) => { const gg = grp(); gg.add(mk(new THREE.CylinderGeometry(r, r, th, 20).rotateX(Math.PI / 2), m)); const n = Math.max(8, Math.round(r * 16)); for (let q = 0; q < n; q++) { const a = q / n * 6.28, t = mk(new THREE.BoxGeometry(r * 0.24, r * 0.26, th), m); t.position.set(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1, 0); t.rotation.z = a; gg.add(t); } gg.add(mk(new THREE.CylinderGeometry(r * 0.3, r * 0.3, th + 0.03, 10).rotateX(Math.PI / 2), iron)); return gg; };
  switch (f.t) {
    case 'clift': case 'clifttop': {   /* elevador redondo: gaiola de latão com barras, piso de ferro e cúpula */
      const R = 0.88, top = 2.3; sub.add(mk(new THREE.CylinderGeometry(R, R, 0.08, 24).translate(0, 0.04, 0), iron)); sub.add(mk(new THREE.TorusGeometry(R, 0.05, 6, 28).rotateX(Math.PI / 2).translate(0, 0.1, 0), brass)); sub.add(mk(new THREE.TorusGeometry(R, 0.05, 6, 28).rotateX(Math.PI / 2).translate(0, top, 0), brass)); sub.add(mk(new THREE.TorusGeometry(R, 0.03, 6, 28).rotateX(Math.PI / 2).translate(0, 1.1, 0), brass));
      for (let q = 0; q < 18; q++) { const a = q / 18 * 6.28; if (a > 0.9 && a < 2.2) continue; sub.add(mk(new THREE.CylinderGeometry(0.02, 0.02, top - 0.1, 5).translate(Math.cos(a) * R, top / 2 + 0.05, Math.sin(a) * R), brass)); }   /* vão da grade virado para a chegada */
      { const dm = mk(new THREE.SphereGeometry(R, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), copper); dm.scale.set(1, 0.32, 1); dm.position.y = top; sub.add(dm); } sub.add(mk(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6).translate(0, top + 0.45, 0), iron));
      { const dial = grp(); dial.add(mk(new THREE.CircleGeometry(0.16, 16), smat(null, '#f4ecd8'))); dial.add(mk(new THREE.TorusGeometry(0.16, 0.025, 6, 16), brass)); dial.position.set(0, top - 0.25, -R + 0.04); sub.add(dial); }
      sub.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6).translate(R * 0.55, 1.0, R * 0.55), brass)); sub.add(mk(new THREE.SphereGeometry(0.06, 8, 6).translate(R * 0.55, 1.32, R * 0.55), smat(null, '#c83a2a')));   /* alavanca */
      sub.position.set(0, 0, 0); break; }
    case 'invshelf': { const L = Math.max(f.w, f.h); sub.add(wbox(L - 0.1, 2.0, 0.4, 0, 1.0, -0.28, wood, 1)); for (const y of [0.55, 1.05, 1.55]) { sub.add(wbox(L - 0.15, 0.04, 0.42, 0, y, -0.24, brass, 1)); for (let k = 0; k < 5; k++) { const x = -L / 2 + 0.3 + k * (L - 0.6) / 4, c = ['#d83a3a', '#3a8ad8', '#e8c060', '#5ac85a', '#c9a24a'][(k + Math.round(y * 3)) % 5]; if (k % 3 === 0) sub.add(mk(new THREE.SphereGeometry(0.1, 10, 8).translate(x, y + 0.13, -0.22), smat(null, c, { metal: 0.4, rough: 0.4 }))); else if (k % 3 === 1) { const gg = gearM(0.1, 0.04, brass); gg.position.set(x, y + 0.15, -0.22); sub.add(gg); } else sub.add(mk(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 10).translate(x, y + 0.13, -0.22), smat(null, c, { metal: 0.5, rough: 0.35 }))); } } break; }
    case 'gearwall': { for (const [x, y, r, m] of [[-0.5, 1.5, 0.45, brass], [0.25, 1.9, 0.3, copper], [0.55, 1.2, 0.36, brass], [-0.1, 0.9, 0.22, copper]]) { const gg = gearM(r, 0.06, m); gg.position.set(x, y, -0.46); sub.add(gg); } break; }
    case 'steamclock': { sub.add(wbox(0.5, 1.9, 0.36, 0, 0.95, -0.2, wood, 1)); const gg = gearM(0.18, 0.04, brass); gg.position.set(0, 1.5, -0.01); sub.add(gg); sub.add(mk(new THREE.CircleGeometry(0.15, 16).translate(0, 1.5, 0.02), smat(null, '#f4ecd8'))); sub.add(mk(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6).translate(0, 0.75, -0.01), brass)); sub.add(mk(new THREE.SphereGeometry(0.07, 8, 6).translate(0, 0.5, -0.01), brass)); break; }
    case 'boiler': { sub.add(mk(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 18).translate(0, 0.95, 0), copper)); for (const y of [0.4, 0.95, 1.5]) sub.add(mk(new THREE.TorusGeometry(0.63, 0.04, 6, 20).rotateX(Math.PI / 2).translate(0, y, 0), brass)); sub.add(mk(new THREE.SphereGeometry(0.62, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.7, 0), copper)); sub.add(wbox(0.5, 0.35, 0.1, 0, 0.45, 0.6, iron, 1)); sub.add(wbox(0.36, 0.22, 0.02, 0, 0.45, 0.66, glowA, 1));
      sub.add(mk(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8).translate(0.3, 2.6, -0.2), iron)); { const ga = grp(); ga.add(mk(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14).rotateX(Math.PI / 2), brass)); ga.add(mk(new THREE.CircleGeometry(0.11, 14).translate(0, 0, 0.035), smat(null, '#f4ecd8'))); ga.position.set(-0.3, 1.25, 0.6); sub.add(ga); } break; }
    case 'tinkerbench': { const L = Math.max(f.w, f.h); sub.add(wbox(L - 0.1, 0.08, 0.7, 0, 0.82, 0, wood, 1)); for (const s of [-1, 1]) sub.add(wbox(0.08, 0.8, 0.6, s * (L / 2 - 0.15), 0.4, 0, wood, 1)); sub.add(wbox(0.2, 0.18, 0.2, -L / 2 + 0.35, 0.95, 0.15, iron, 1)); for (let k = 0; k < 4; k++) { const gg = gearM(0.07 + k * 0.02, 0.03, k % 2 ? copper : brass); gg.rotation.x = -Math.PI / 2; gg.position.set(-0.2 + k * 0.25, 0.88, -0.1 + (k % 2) * 0.15); sub.add(gg); }
      sub.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6).rotateZ(Math.PI / 2).translate(0.35, 0.88, 0.2), iron)); sub.add(wbox(L - 0.2, 0.9, 0.04, 0, 1.4, -0.36, smat('wood', '#7a5a3a', { bump: 0.6 }), 1)); for (let k = 0; k < 5; k++) sub.add(wbox(0.04, 0.3, 0.03, -L / 2 + 0.3 + k * 0.3, 1.55, -0.33, iron, 1)); break; }
    case 'tesla': { sub.add(mk(new THREE.CylinderGeometry(0.45, 0.55, 0.3, 16).translate(0, 0.15, 0), iron)); sub.add(mk(new THREE.CylinderGeometry(0.2, 0.2, 1.6, 14).translate(0, 1.1, 0), copper)); for (let y = 0.4; y < 1.85; y += 0.08) sub.add(mk(new THREE.TorusGeometry(0.21, 0.018, 4, 14).rotateX(Math.PI / 2).translate(0, y, 0), copper)); sub.add(mk(new THREE.TorusGeometry(0.36, 0.12, 8, 20).rotateX(Math.PI / 2).translate(0, 2.0, 0), brass)); sub.add(mk(new THREE.SphereGeometry(0.14, 12, 8).translate(0, 2.15, 0), glowB));
      if (typeof THREE.PointLight === 'function') { const l = new THREE.PointLight(0x6ab4ff, night ? 0.9 : 0.4, 4); l.position.set(0, 2.2, 0); sub.add(l); } break; }
    case 'lab': { const L = Math.max(f.w, f.h); sub.add(wbox(L - 0.1, 0.07, 0.65, 0, 0.84, 0, wood, 1)); for (const s of [-1, 1]) sub.add(wbox(0.07, 0.82, 0.55, s * (L / 2 - 0.12), 0.41, 0, wood, 1)); const cols = ['#5ae07a', '#e05ab4', '#5ab4ff', '#ffb43a', '#a05ae0']; for (let k = 0; k < 6; k++) { const x = -L / 2 + 0.3 + k * (L - 0.6) / 5, c = cols[k % 5]; sub.add(mk(new THREE.SphereGeometry(0.09, 10, 8).translate(x, 0.98, -0.05 + (k % 2) * 0.15), smat(null, c, { transparent: true, opacity: 0.8, emissive: c, ei: 0.5, rough: 0.1 }))); sub.add(mk(new THREE.CylinderGeometry(0.025, 0.03, 0.14, 8).translate(x, 1.12, -0.05 + (k % 2) * 0.15), smat(null, '#e8f4f8', { transparent: true, opacity: 0.5, rough: 0.1 }))); } break; }
    case 'blueprints': { const L = Math.max(f.w, f.h); sub.add(wbox(L - 0.2, 1.0, 0.04, 0, 1.5, -0.46, smat(null, '#2a5a9a', { rough: 0.7 }), 1)); for (let k = 0; k < 6; k++) sub.add(wbox(0.3 + (k % 3) * 0.2, 0.012, 0.01, -L / 2 + 0.5 + (k % 3) * 0.45, 1.2 + Math.floor(k / 3) * 0.45, -0.43, smat(null, '#e8f0ff'), 1)); for (let k = 0; k < 2; k++) { const gg = gearM(0.12, 0.01, smat(null, '#e8f0ff')); gg.position.set(L / 2 - 0.4, 1.3 + k * 0.4, -0.43); sub.add(gg); } break; }
    case 'bigscope': { sub.add(mk(new THREE.CylinderGeometry(0.5, 0.65, 0.4, 16).translate(0, 0.2, 0), iron)); sub.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10).translate(0, 0.8, 0), brass)); const sc = grp(); sc.add(mk(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 16).translate(0, 1.0, 0), brass)); sc.add(mk(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 16).translate(0, 2.2, 0), copper)); sc.add(mk(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8).translate(0, -0.3, 0), iron)); sc.rotation.x = -0.8; sc.position.set(0, 1.25, 0.2); sub.add(sc); break; }
    default: return false;
  }
  if (rot && f.t !== 'clift' && f.t !== 'clifttop') sub.rotation.y = rot;
  g.add(sub); return true;
}
if (typeof furnX === 'function') { const _fxSX = furnX; furnX = function (g, f, C) { if (typeof THREE !== 'undefined' && towerFurn(g, f, C)) return; return _fxSX.apply(this, arguments); }; }
if (typeof mBuilding === 'function') { const _mbSX = mBuilding; mBuilding = function (b, night) { if (b && b.deco === 'steam' && typeof THREE !== 'undefined') return mInvTower(b, night); return _mbSX.apply(this, arguments); }; }
