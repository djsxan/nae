// ============================================================
//  AS CASAS NOBRES: cinco famílias rivais nos casarões do bairro
//  novo (leste). Cada uma com lorde, cônjuge, herdeiro, criado e
//  dois guardas, personalidade e um plano que avança dia a dia.
//  Jogadores juram lealdade (uma casa por vez), fazem tarefas,
//  doam e acompanham o prestígio na aba "Casas" do menu.
// ============================================================
const HOUSES = [
  { id: 'valcarne', n: 'Casa Valcarne', motto: 'O Inverno Também Sangra', ic: '🐺', c1: '#1b2a3a', c2: '#d9dde2', lord: 'Lorde Rodric Valcarne', spouse: 'Lady Elinor Valcarne', heir: 'Sor Kael Valcarne', serv: 'Bertram', trait: 'honrado e leal à coroa, mas despreza a Mão do Rei', plan: 'Quer tirar Lorde Osric Vane do cargo de Mão do Rei e devolver o poder ao rei.', st: { prestige: 60, power: 55, gold: 40, crown: 30 } },
  { id: 'draemor', n: 'Casa Draemor', motto: 'Das Cinzas, a Coroa', ic: '🐉', c1: '#5a1712', c2: '#e8b44a', lord: 'Lorde Vaelor Draemor', spouse: 'Lady Morgaine Draemor', heir: 'Sor Daeron Draemor', serv: 'Hask', trait: 'orgulhoso, ambicioso e violento', plan: 'Quer o trono pela força: junta soldados e espera a morte do rei.', st: { prestige: 55, power: 65, gold: 45, crown: -20 } },
  { id: 'moranthe', n: 'Casa Moranthe', motto: 'Vemos no Escuro', ic: '🦉', c1: '#33295a', c2: '#c9c2e8', lord: 'Lady Selene Moranthe', spouse: 'Lorde Ivo Moranthe', heir: 'Elara Moranthe', serv: 'Quill', trait: 'paciente, sábia e cheia de segredos', plan: 'Coleciona segredos de todas as casas para governar por trás do trono.', st: { prestige: 50, power: 35, gold: 50, crown: 10 } },
  { id: 'thornvale', n: 'Casa Thornvale', motto: 'Nosso É o Espinho', ic: '🐗', c1: '#21492f', c2: '#e4dcc0', lord: 'Lorde Bram Thornvale', spouse: 'Lady Hilda Thornvale', heir: 'Sor Garrick Thornvale', serv: 'Nell', trait: 'guerreiro bruto e prático', plan: 'Vende o apoio da sua espada a quem pagar melhor; adora caçadas e torneios.', st: { prestige: 45, power: 60, gold: 30, crown: 5 } },
  { id: 'solmire', n: 'Casa Solmire', motto: 'Até o Sol se Põe', ic: '🌑', c1: '#4a3a22', c2: '#e8a33c', lord: 'Lorde Aurelian Solmire', spouse: 'Lady Corina Solmire', heir: 'Lucan Solmire', serv: 'Tobin', trait: 'riquíssimo, calculista e cobrador', plan: 'Empresta ouro a todos e compra votos: quando o rei morrer, todos lhe devem.', st: { prestige: 55, power: 40, gold: 80, crown: 15 } },
];
const HOUSE_BY = Object.fromEntries(HOUSES.map(h => [h.id, h]));
/* moradores: papel, posto de dia e de noite no casarão ([andar, u, v] no quadro local) ou 'door' (na frente da porta) / 'plaza' (na praça) */
const HROLES = [['lord', [0, 1.6, 4.8], [1, 6.5, 5]], ['spouse', [1, 3.5, 4], [1, 3.6, 5.5]], ['heir', ['plaza'], [2, 4.5, 3.5]], ['serv', [0, 1.5, 1.5], [0, 4.3, 1.6]], ['guard', ['door', -1], ['door', -1]], ['guard', ['door', 1], ['door', 1]]];   /* lorde no salão de dia e no quarto do casal à noite; cônjuge no quarto; herdeiro no sótão; criado na cozinha e no quarto dele */
function hSeatB(id) { return BUILDINGS.find(b => b.seat === id); }
function hRec() { S.estate.houses = S.estate.houses || { day: 0, st: {}, favor: {}, vow: {}, task: {}, news: [] }; const H = S.estate.houses; for (const h of HOUSES) if (!H.st[h.id]) H.st[h.id] = Object.assign({ rel: {} }, h.st); return H; }
function hNews(t) { const H = hRec(); H.news.unshift([estDay(), t]); H.news.length = Math.min(H.news.length, 20); }
const clampH = (v, a, b) => Math.max(a, Math.min(b, v));
function hRel(a, b, d) { const H = hRec(), A = H.st[a], B = H.st[b]; A.rel[b] = clampH((A.rel[b] || 0) + d, -100, 100); B.rel[a] = clampH((B.rel[a] || 0) + d, -100, 100); }
function hDaily() {   /* cada casa avança o seu plano */
  const H = hRec(), R = () => Math.random(), pickOther = id => { const o = HOUSES.filter(h => h.id !== id); return o[Math.floor(R() * o.length)]; };
  for (const h of HOUSES) { const s = H.st[h.id], o = pickOther(h.id);
    if (h.id === 'valcarne') { if (R() < 0.5) { s.crown = clampH(s.crown - 3, -100, 100); s.prestige += 2; hNews('Lorde Rodric Valcarne fez uma petição contra a Mão do Rei diante da corte.'); } else { s.power += 3; hNews('Os Valcarne treinaram os seus vassalos no pátio do casarão.'); } }
    else if (h.id === 'draemor') { s.power += 4; s.gold -= 3; s.crown = clampH(s.crown - 1, -100, 100); hRel(h.id, o.id, -2); hNews('A Casa Draemor contratou mercenários; a ' + o.n + ' não gostou nada disso.'); }
    else if (h.id === 'moranthe') { s.secrets = (s.secrets || 0) + 1; s.prestige += 1; if (R() < 0.4) { hRel(h.id, o.id, -3); hNews('Corre o boato de que a Casa Moranthe descobriu um segredo da ' + o.n + '.'); } else hNews('Corvos foram vistos entrando e saindo do casarão Moranthe a noite toda.'); }
    else if (h.id === 'thornvale') { s.prestige += 3; const rich = HOUSES.filter(x => x.id !== h.id).sort((a, b) => H.st[b.id].gold - H.st[a.id].gold)[0]; hRel(h.id, rich.id, 3); hNews('Os Thornvale fizeram uma grande caçada; a ' + rich.n + ' pagou o banquete.'); }
    else if (h.id === 'solmire') { s.gold += 5; const poor = HOUSES.filter(x => x.id !== h.id).sort((a, b) => H.st[a.id].gold - H.st[b.id].gold)[0]; H.st[poor.id].gold += 3; hRel(h.id, poor.id, 2); s.crown = clampH(s.crown + 1, -100, 100); hNews('A Casa Solmire emprestou ouro à ' + poor.n + '. Agora eles lhe devem.'); }
    for (const k of ['prestige', 'power', 'gold']) s[k] = clampH(Math.round(s[k] + (R() - 0.5) * 2), 0, 100); }
  const top = HOUSES.slice().sort((a, b) => H.st[b.id].prestige - H.st[a.id].prestige)[0]; sys('Notícias das Casas: ' + H.news[0][1] + ' (a mais prestigiada agora é a ' + top.n + ')'); estateSave(); }
function hFavor(p, id, n, why) { const H = hRec(), k = estOwner(p); H.favor[k] = H.favor[k] || {}; H.favor[k][id] = Math.max(0, (H.favor[k][id] || 0) + n); if (n && why) tell(p, (n > 0 ? '+' : '') + n + ' de favor com a ' + HOUSE_BY[id].n + ' (' + why + ').'); estateSave(); }
function hPost(def, n) {   /* posição do morador agora */
  if (!(n.hrole === 'serv' && (n.callDoor || 0) > now_()) && typeof thNoblePost === 'function') { const T = thNoblePost(n); if (T) return T; }   /* hora do banho nas Termas (menos o criado chamado à porta) */
  const b = hSeatB(n.house); if (!b) return null; const h = empHour(); let P = h >= 7 && h < 21 ? def[1] : def[2]; if (n.hrole === 'serv' && (n.callDoor || 0) > now_()) P = ['door', 0];   /* chamado pelo guarda: espera na porta */
  if (P[0] === 'door') { const d = doorOf(b), [dx, dy] = doorTile(b), v = DOOR_V[b.door || 'S'], ox = v[0] ? 0 : P[1] * 1.2, oy = v[1] ? 0 : P[1] * 1.2; return { x: dx + v[0] * 1.6 + ox + 0.5, y: dy + v[1] * 1.6 + oy + 0.5, fl: 0, out: 1 }; }
  if (P[0] === 'plaza') { const k = HOUSES.findIndex(x => x.id === n.house); return { x: CASTLE.x1 + 8 + (k % 3) * 2.2, y: CENTER - 1.5 + Math.floor(k / 3) * 3.5, fl: 0, out: 1 }; }
  const fl = Math.min(P[0], floorsOf(b) - 1), [x, y] = b.deco === 'seat' ? seatPt(b, fl, P[1], P[2]) : localToWorld(b, P[1], P[2]); return { x, y, fl }; }
function hSpawnAll() {
  for (const h of HOUSES) { const b = hSeatB(h.id); if (!b) continue; HROLES.forEach((R0, i) => { const id = 'h_' + h.id + '_' + i; if (S.npcs[id]) return; const role = R0[0];
    const n = { id, kind: 'hh_' + (role === 'guard' ? 'guard' : role) + '_' + h.id, name: role === 'guard' ? 'Guarda da ' + h.n : h[role], transient: true, court: 'house', house: h.id, hrole: role, x: 0, y: 0, z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false };
    const P = hPost(R0, n); if (!P) return; n.x = P.x; n.y = P.y; n.fl = P.fl; n.fb = P.fl ? BUILDINGS.indexOf(b) : -1; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }); } }
function hMove(n, T, dt) { const bi = BUILDINGS.indexOf(hSeatB(n.house)), d = dist(n.x, n.y, T.x, T.y);
  if ((n.fl || 0) !== T.fl || d > 16) { n.x = T.x; n.y = T.y; n.fl = T.fl; n.fb = T.fl ? bi : -1; n.walk = false; return; }
  if (d < 0.15) { n.walk = false; return; } const s = Math.min(d, 1.4 * dt), nx = n.x + (T.x - n.x) / d * s, ny = n.y + (T.y - n.y) / d * s, ok = (x, y) => T.fl ? canStandFloor(x, y, bi, T.fl, 0.2) : canStand(x, y, 0, 0.2);
  if (ok(nx, ny)) { n.x = nx; n.y = ny; n._stk = 0; } else if (ok(nx, n.y)) n.x = nx; else if (ok(n.x, ny)) n.y = ny; else if (++n._stk > 20) { n.x = T.x; n.y = T.y; n._stk = 0; } n.dir = dirFromVecS(T.x - n.x, T.y - n.y); n.walk = true; }
function housesTick(now) {
  if (!S.estate || !HOUSES.length || !hSeatB('valcarne') || now - (S.hT || 0) < 200) return; const dt = Math.min(0.4, (now - (S.hT || now)) / 1000) || 0.2; S.hT = now; const H = hRec();
  hSpawnAll(); if (H.day !== estDay()) { const first = !H.day; H.day = estDay(); if (!first) hDaily(); }
  for (const n of Object.values(S.npcs)) { if (n.court !== 'house' || n.dead || n.downed) continue; const i = +n.id.split('_')[2], T = hPost(HROLES[i], n); if (T) hMove(n, T, dt); }
}
function hTaskOffer(p, id) { const d = estDay(), L = [{ mon: 'bandit', n: 4, g: 60, f: 8 }, { mon: 'wolf', n: 5, g: 50, f: 6 }, { mon: 'goblin', n: 5, g: 55, f: 7 }, { mon: 'skeleton', n: 5, g: 90, f: 10 }, { mon: 'orc', n: 3, g: 110, f: 12 }]; return L[(d * 3 + id.length + p.name.length) % L.length]; }
if (typeof killMonster === 'function') { const _kmH = killMonster; killMonster = function (m, p) { try { if (p && S.estate && S.estate.houses) { const t = hRec().task[estOwner(p)]; if (t && t.mon === m.type && t.got < t.n) { t.got++; tell(p, 'Tarefa da ' + HOUSE_BY[t.h].n + ': ' + t.got + '/' + t.n + '.' + (t.got >= t.n ? ' Volte ao casarão.' : '')); estateSave(); } } } catch (e) { } return _kmH.apply(this, arguments); }; }
function housePublic(p) { const H = hRec(), k = estOwner(p), fav = H.favor[k] || {}, crownVow = typeof crownRec === 'function' ? crownRec().vow[k] : null;
  return { l: HOUSES.map(h => { const s = H.st[h.id]; return { id: h.id, n: h.n, motto: h.motto, ic: h.ic, c1: h.c1, c2: h.c2, lord: h.lord, trait: h.trait, plan: h.plan, prestige: s.prestige, power: s.power, gold: s.gold, crown: s.crown, rel: s.rel, fav: fav[h.id] || 0, pop: typeof infPop === 'function' ? infPop(h.id) : null, faith: typeof infRec === 'function' ? infRec().faith[h.id] : null }; }), inf: typeof infRec === 'function' ? { elec: infElection(), succ: typeof infSuccessor === 'function' ? infSuccessor() : null, sup: infRec().sup, faith: infRec().faith, pop: infPop('aurenfell') } : null, news: H.news.slice(0, 12), today: estDay(), vow: H.vow[k] || (crownVow ? 'aurenfell' : null), task: H.task[k] || null, crownFav: typeof crownRec === 'function' ? (crownRec().favor[k] || 0) : 0 }; }
function houseMsg(p, m) {
  const H = hRec(), k = estOwner(p);
  if (m.a === 'list') { Net.toOne(p.id, Object.assign({ t: 'houses' }, housePublic(p))); return; }
  const n = S.npcs[m.id]; if (!n || n.court !== 'house') return; if (dist(n.x, n.y, p.x, p.y) > 3 || (n.fl || 0) !== (p.fl || 0)) { tell(p, 'Chegue mais perto.'); return; }
  const h = HOUSE_BY[n.house], send = () => Net.toOne(p.id, Object.assign({ t: 'housemenu', id: n.id, role: n.hrole, name: n.name, house: h.id, offer: hTaskOffer(p, h.id) }, housePublic(p)));
  if (m.a === 'open') { send(); return; }
  if (n.hrole === 'guard' && m.a === 'callserv') { const sv = S.npcs['h_' + h.id + '_3']; if (!sv || sv.dead || sv.downed) { empSay(n, 'O criado não pode vir agora.'); return; } if (H.vow[k] === h.id) { empSay(n, 'Você já é da casa. Pode entrar.'); return; } sv.callDoor = now_() + 120000; empSay(n, 'Espere aqui. Vou chamar o ' + String(sv.name).split(',')[0] + '.'); tell(p, 'O guarda foi chamar o criado da ' + h.n + '. Ele vem até a porta: fale com ele para jurar lealdade.'); return; }
  if (n.hrole !== 'lord' && !(n.hrole === 'serv' && m.a === 'vow')) { send(); return; }   /* o criado aceita o juramento em nome do lorde */
  if (m.a === 'vow') { if (H.vow[k] === h.id) return; const prev = H.vow[k]; H.vow[k] = h.id; if (typeof crownRec === 'function' && crownRec().vow[k]) { delete crownRec().vow[k]; crownFavor(p, -10, 'trocou a lealdade da coroa por uma casa'); } if (prev) hFavor(p, prev, -20, 'você abandonou a casa'); hFavor(p, h.id, 5, 'jurou lealdade'); H.st[h.id].prestige = clampH(H.st[h.id].prestige + 1, 0, 100); hNews(p.name + ' jurou lealdade à ' + h.n + '.'); sys(p.name + ' jurou lealdade à ' + h.n + '.'); empSay(n, h.motto + '. Bem-vindo à nossa casa.'); }
  else if (m.a === 'task') { if (H.task[k] && H.task[k].got < H.task[k].n) { tell(p, 'Termine a tarefa que já tem.'); return; } H.task[k] = Object.assign({ h: h.id, got: 0 }, hTaskOffer(p, h.id)); estateSave(); empSay(n, 'Faça isso pela casa e será lembrado.'); }
  else if (m.a === 'turnin') { const t = H.task[k]; if (!t || t.h !== h.id || t.got < t.n) return; delete H.task[k]; p.gold = (p.gold || 0) + t.g; sendStat(p); hFavor(p, h.id, t.f, 'tarefa cumprida'); H.st[h.id].prestige = clampH(H.st[h.id].prestige + 1, 0, 100); estateSave(); empSay(n, 'Bom trabalho. ' + t.g + ' de ouro, como combinado.'); }
  else if (m.a === 'donate') { const v = [50, 200][m.i | 0] || 0; if (!v || (p.gold || 0) < v) { tell(p, 'Ouro insuficiente.'); return; } p.gold -= v; sendStat(p); H.st[h.id].gold = clampH(H.st[h.id].gold + Math.round(v / 50), 0, 100); hFavor(p, h.id, Math.round(v / 25), 'doação'); empSay(n, 'A casa não esquece um amigo generoso.'); }
  send(); }
// ---------------- CLIENTE ----------------
/* armaduras dos guardas de cada casa (referências de Game of Thrones) */
const HGUARD_LOOK = typeof tone === 'function' ? {
  valcarne: () => ({ armor: 'leather', body: tone('#6a6e72'), body2: tone('#3a3e44'), accent: tone('#2a2e34'), trim: tone('#c8ccd2'), head: 'wolfhelm', headTone: tone('#9aa0a8'), furTone: tone('#8a8478'), capeTone: tone('#7a746a'), weapon: 'sword', beard: tone('#4a3a2a') }),   /* Stark: malha, couro cinza e pele de lobo */
  draemor: () => ({ armor: 'plate', pattern: 'scales', body: tone('#1e1a1c'), body2: tone('#3a1010'), accent: tone('#7a1410'), trim: tone('#a8281a'), head: 'wyvernhelm', headTone: tone('#2a2224'), capeTone: tone('#7a1410'), weapon: 'halberd', beard: null }),   /* Targaryen: escamas negras, elmo de serpe, capa vermelha */
  moranthe: () => ({ armor: 'plate', body: tone('#4a3a7a'), body2: tone('#2a2050'), accent: tone('#c9c2e8'), trim: tone('#c9c2e8'), head: 'owlhelm', headTone: tone('#5a4a8a'), plume: tone('#e8e2f0'), capeTone: tone('#c9c2e8'), weapon: 'spear', beard: null }),   /* Arryn: placas violeta lisas, máscara de coruja */
  thornvale: () => ({ armor: 'leather', body: tone('#5a4028'), body2: tone('#2e4a2e'), accent: tone('#3a2a1a'), trim: tone('#e4dcc0'), head: 'boarhelm', headTone: tone('#6a5a4a'), capeTone: tone('#2a4a2a'), weapon: 'axe', beard: tone('#3a2a1a') }),   /* Baratheon/Mormont: couro fervido, peles, presas de javali */
  solmire: () => ({ armor: 'plate', body: tone('#c89a3a'), body2: tone('#8a5a1a'), accent: tone('#4a3a22'), trim: tone('#f0c050'), head: 'sunhelm', headTone: tone('#e8b84a'), capeTone: tone('#8a5a1a'), weapon: 'spear', beard: null }),   /* Lannister/Martell: placas douradas, disco de sol */
} : {};
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  for (const h of HOUSES) { const robe = (c1, c2, extra) => Object.assign(heroLook('mage', 'adept', c1), { armor: 'robe', body: tone(c1), body2: tone(c2), accent: tone(h.c2), trim: tone(h.c2), head: 'none', weapon: null, shield: null, cape: false }, extra || {});
    NPC_LOOKS['hh_lord_' + h.id] = () => robe(h.c1, h.c1, { cape: true, capeTone: tone(h.c1), hair: tone(h.id === 'moranthe' ? '#1a1a2a' : '#5a4a3a'), hairStyle: h.id === 'moranthe' ? 'long' : 'short', beard: h.id === 'moranthe' ? null : tone('#4a3a2a') });
    NPC_LOOKS['hh_spouse_' + h.id] = () => robe(h.c2, h.c1, { hair: tone(h.id === 'moranthe' ? '#4a3a2a' : '#c8a060'), hairStyle: h.id === 'moranthe' ? 'short' : 'long', beard: h.id === 'moranthe' ? tone('#4a3a2a') : null });
    NPC_LOOKS['hh_heir_' + h.id] = () => Object.assign(heroLook('knight', 'iron', h.c1), { head: 'none', hair: tone('#8a6a3a'), hairStyle: 'short', beard: null, cape: true, capeTone: tone(h.c1), weapon: 'sword', shield: null });
    NPC_LOOKS['hh_serv_' + h.id] = () => Object.assign(heroLook('archer', 'scout', '#6a5a4a'), { armor: 'vest', body: tone('#6a5a4a'), body2: tone(h.c1), head: 'none', hair: tone('#4a3424'), hairStyle: 'short', beard: null, weapon: null, quiver: false });
    NPC_LOOKS['hh_guard_' + h.id] = () => Object.assign(heroLook('knight', 'iron', h.c2), { head: 'helm', cape: true, capeTone: tone(h.c1), weapon: 'spear', shield: null, beard: tone('#5a4a3a') }, HGUARD_LOOK[h.id] ? HGUARD_LOOK[h.id]() : {});
    if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { ['hh_lord_' + h.id]: 'mage', ['hh_spouse_' + h.id]: 'mage', ['hh_heir_' + h.id]: 'knight', ['hh_serv_' + h.id]: 'archer', ['hh_guard_' + h.id]: 'knight' }); } }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peH = progEvent; progEvent = function (m, now) {
  if (m.t === 'houses') { G.houses = m; if (typeof GM !== 'undefined' && GM.tab === 'houses') gmHousesDraw(); return true; }
  if (m.t === 'housemenu') { G.houses = m; houseMenu(m); return true; }
  return _peH(m, now); }; }
function houseNear() { const me = G.me; if (!me) return null; let best = null, bd = 2.4; for (const id in G.npcs) { const e = G.npcs[id]; if (!e.kind || !e.kind.startsWith('hh_') || e.dead || (e.fl || 0) !== (me.fl || 0)) continue; const d = Math.hypot(e.rx - me.x, e.ry - me.y); if (d < bd) { bd = d; best = e; } } return best; }
const HLINES = { spouse: ['Meu marido cuida da política; eu cuido de quem é leal a ele.', 'Visitas são bem-vindas, se vierem com boas intenções.'], heir: ['Um dia esta casa será minha.', 'Treino todo dia: nunca se sabe quando a guerra vem.'], serv: ['Com licença, a casa não se limpa sozinha.', 'O lorde está de mau humor hoje.'], guard: ['Circulando.', 'Ninguém entra sem ser convidado.'] };
function houseMenu(m) {
  const h = (m.l || []).find(x => x.id === m.house); if (!h) return; const opt = (o, ic, t, sub, extra) => '<button class="lift-btn" data-o="' + o + '"' + (extra || '') + '><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  let body = '<div style="padding:8px 14px 0;font-size:14px;line-height:1.4"><b style="color:' + h.c2 + '">' + h.ic + ' ' + h.n + '</b> · “' + h.motto + '”<br>Prestígio ' + h.prestige + ' · seu favor ' + h.fav + (m.vow === h.id ? ' · <b>você é vassalo desta casa</b>' : '') + '</div>';
  if (m.role === 'lord') { const t = m.task, nm = k => (typeof MON !== 'undefined' && MON[k] ? MON[k].name : k);
    body += '<div style="padding:4px 14px;font-size:13px;opacity:.85">' + h.lord + ': ' + h.trait + '.</div><div class="lift-list">' +
      (m.vow === h.id ? '' : opt('vow', '🤝', 'Jurar lealdade à ' + h.n, (m.vow ? 'Você deixa a sua lealdade atual (perde favor com ela).' : 'Você vira vassalo desta casa.'))) +
      (t && t.h === h.id ? (t.got >= t.n ? opt('turnin', '💰', 'Entregar a tarefa', t.n + ' ' + nm(t.mon) + ' · ' + t.g + ' ouro e ' + t.f + ' de favor') : opt('x', '⏳', 'Tarefa em andamento', t.got + '/' + t.n + ' ' + nm(t.mon), ' disabled')) : opt('task', '⚔', 'Pedir uma tarefa: ' + m.offer.n + ' ' + nm(m.offer.mon), m.offer.g + ' ouro e ' + m.offer.f + ' de favor')) +
      opt('don0', '🪙', 'Doar 50 de ouro', '+2 de favor') + opt('don1', '🪙', 'Doar 200 de ouro', '+8 de favor') + '</div>'; }
  else { const L = HLINES[m.role] || ['...']; body += '<div style="padding:10px 14px">“' + L[Math.floor(Math.random() * L.length)] + '”</div>';
    if (m.role === 'guard' && m.vow !== h.id) body += '<div class="lift-list">' + opt('callserv', '🤝', 'Quero jurar lealdade à ' + h.n, 'O guarda chama o criado até a porta; o juramento é feito com ele.') + '</div>';
    if (m.role === 'serv' && m.vow !== h.id) body += '<div class="lift-list">' + opt('vow', '🤝', 'Jurar lealdade à ' + h.n, 'O criado recebe o juramento em nome do ' + h.lord + '. ' + (m.vow ? 'Você deixa a sua lealdade atual (perde favor com ela).' : 'Você vira vassalo desta casa.')) + '</div>'; }
  const d = staffPanel('housemenu', m.name, body);
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; if (o === 'x') return; if (o.startsWith('don')) Net.send({ t: 'house', a: 'donate', id: m.id, i: +o.slice(3) }); else Net.send({ t: 'house', a: o, id: m.id }); });
}
function gmHouses() { if (typeof gmPane !== 'function') return; gmPane('houses').innerHTML = '<div style="padding:20px;opacity:.7">Carregando as casas…</div>'; Net.send({ t: 'house', a: 'list' }); }
function gmHousesDraw() {
  const D = G.houses; if (!D || !D.l) return; const word = v => v >= 40 ? 'aliados' : v >= 10 ? 'amistosos' : v > -10 ? 'neutros' : v > -40 ? 'tensos' : 'inimigos', bar = (v, c) => '<div style="height:6px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + v + '%;background:' + c + '"></div></div>';
  const card = h => '<div style="border:1px solid ' + h.c2 + '55;border-radius:10px;padding:10px 12px;background:linear-gradient(135deg,' + h.c1 + 'cc,rgba(0,0,0,.35))">' +
    '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:26px">' + h.ic + '</span><div><b style="color:' + h.c2 + '">' + h.n + '</b><br><small style="opacity:.8">“' + h.motto + '”</small></div>' + (D.vow === h.id ? '<span style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:9px;background:' + h.c2 + ';color:#111">sua casa</span>' : '') + '</div>' +
    '<div style="font-size:12px;margin:6px 0 4px;opacity:.85">' + h.lord + ' · ' + h.trait + '</div><div style="font-size:12px;margin-bottom:6px;font-style:italic;opacity:.75">' + h.plan + '</div>' +
    '<div style="display:grid;grid-template-columns:70px 1fr;gap:4px 8px;font-size:12px;align-items:center">' + [['Prestígio', h.prestige, '#e8c060'], ['Força', h.power, '#d86a4a'], ['Ouro', h.gold, '#e8d070']].concat(h.pop != null ? [['Povo', h.pop, '#7ab8e8']] : []).map(([n, v, c]) => '<span>' + n + '</span>' + bar(v, c)).join('') + '</div>' +
    '<div style="font-size:12px;margin-top:6px">Com a coroa: <b>' + word(h.crown) + '</b>' + (h.faith != null && typeof faithWord === 'function' ? ' · Fé: <b>' + faithWord(h.faith) + '</b>' : '') + ' · seu favor: <b>' + h.fav + '</b></div></div>';
  const au = { id: 'aurenfell', n: 'Casa Aurenfell (no trono)', motto: 'A Luz Não se Curva', ic: '🗼', c1: '#6e1d14', c2: '#f1cf6a', lord: 'Rei Edric, o Velho', trait: 'doente; a Mão do Rei governa', plan: 'Manter o trono enquanto o rei vive.', prestige: 80, power: 70, gold: 70, crown: 100, fav: D.crownFav, pop: D.inf ? D.inf.pop : null, faith: D.inf ? D.inf.faith.aurenfell : null };
  gmPane('houses').innerHTML = '<div style="padding:4px 4px 10px;font-size:13px;opacity:.85">As famílias que disputam o poder em Nae. Jure lealdade falando com o lorde de cada casa (casarões do bairro leste) ou, para a coroa, numa audiência no castelo.</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">' + card(au) + D.l.map(card).join('') + '</div>' +
    (typeof infTabHtml === 'function' ? infTabHtml(D) : '') + '<h3 style="margin:16px 4px 6px;font-size:15px">Notícias das Casas</h3><div style="font-size:13px;line-height:1.5;padding:0 4px">' + (D.news.length ? D.news.map(([d, t]) => { const a = (D.today || d) - d; return '<div>· <small style="opacity:.6">' + (a <= 0 ? 'hoje' : a === 1 ? 'ontem' : 'há ' + a + ' dias') + '</small> ' + t + '</div>'; }).join('') : '<div style="opacity:.7">Nada ainda. As casas agem a cada novo dia.</div>') + '</div>';
}
