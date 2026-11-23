// ============================================================
//  TRAMAS (parte G, etapa 2a): o contrabandista da viela (veneno e assassinos), veneno na cozinha do
//  castelo, pelo copeiro Pip, na cozinha de um casarão ou numa taça; tramas das casas desleais, que
//  aparecem como segredo um dia antes e podem ser denunciadas; o segredo do herdeiro bastardo; e o que
//  acontece quando morre alguém da linha (inclusive uma casa chegando ao trono).
// ============================================================
const TR = { poison: 150, hire: [[300, 0.3], [600, 0.5], [1000, 0.7]], betray: 0.3, trace: 0.2, pip: 100, smugH: [21, 4], dinner: [18, 19], cookAway: [18, 18.75], plotChance: 0.03, plotWin: 0.5, denGold: 200, denFavor: 15, denPrestige: -15, bastard: 25, bastardChance: 0.12, resolveH: [6, 7] };
const TR_HEIR2 = { valcarne: ['Lorde Kael Valcarne', 'Sor Edwyn Valcarne'], draemor: ['Lorde Daeron Draemor', 'Sor Rhaegon Draemor'], moranthe: ['Lady Elara Moranthe', 'Mira Moranthe'], thornvale: ['Lorde Garrick Thornvale', 'Sor Tobias Thornvale'], solmire: ['Lorde Lucan Solmire', 'Cassius Solmire'] };
const TR_STOVE_C = [2.5, 0.9], TR_STOVE_M = [2.5, 0.8];

// ---------------- SERVIDOR ----------------
function trRec() { const E = S.estate; return E.trama || (E.trama = { pend: [], plots: {}, names: {}, bastardOut: 0 }); }
function trTargets() { const U = sucRec(), L = [{ k: 'king', n: sucKingName() }]; if (U.alive.alaric && U.king !== 'alaric') L.push({ k: 'alaric', n: SUC_NAMES.alaric }); if (U.alive.corwyn && U.king !== 'corwyn' && U.corwynIn) L.push({ k: 'corwyn', n: SUC_NAMES.corwyn });
  for (const h of HOUSES) if (U.king !== 'h:' + h.id) L.push({ k: 'l:' + h.id, n: h.lord + ' (' + h.n + ')' }); return L; }
function trName(k) { const t = trTargets().find(x => x.k === k); return t ? t.n : k; }
/* nomes das casas depois que um lorde morre: o herdeiro vira lorde e há um herdeiro novo */
function trApplyNames() { const R = trRec(); for (const hid in R.names) { const h = HOUSE_BY[hid]; if (h) { h.lord = R.names[hid].lord; h.heir = R.names[hid].heir; } } }
function trLordDead(hid, cause) { const R = trRec(), h = HOUSE_BY[hid]; if (!h) return; const old = h.lord, idx = R.names[hid] ? (R.names[hid].gen || 1) : 0, L = TR_HEIR2[hid] || [];
  const lord = idx === 0 && L[0] ? L[0] : h.heir.replace(/^Sor /, 'Lorde '), heir = idx === 0 && L[1] ? L[1] : 'Sor Aldo ' + h.n.replace('Casa ', ''); R.names[hid] = { lord, heir, gen: idx + 1 }; trApplyNames();
  const st = hRec().st[hid]; st.prestige = clampH(st.prestige - 5, 0, 100); for (const id of ['h_' + hid + '_0', 'h_' + hid + '_2']) { const n = S.npcs[id]; if (n) visGone(n); }
  hNews(old + ' morreu (' + cause + '). ' + lord + ' agora lidera a ' + h.n + '.'); sys('Notícia: ' + old + ' morreu (' + cause + '). ' + lord + ' agora lidera a ' + h.n + '.'); estateSave(); }
/* a morte de alguém da linha */
function trKill(k, cause) { const U = sucRec();
  if (k === 'king') { if (U.stage === 'death' || U.stage === 'funeral' || U.stage === 'mourning') return; U.stage = 'death'; U.dead = sucKingName(); if (U.alive[U.king] != null) U.alive[U.king] = 0; U.next = sucLine()[0]; U.murder = cause; const kn = S.npcs.k_king; if (kn) visGone(kn);
    sys('🔔 O sino da praça toca sem parar: o ' + U.dead + ' foi encontrado morto (' + cause + '). Às ' + SUC.funeral[0] + 'h o cortejo leva o caixão à Catedral; às ' + SUC.corona[0] + 'h, ' + sucName(U.next) + ' será coroado.'); hNews('O ' + U.dead + ' morreu: ' + cause + '. ' + sucName(U.next) + ' é o próximo na linha de sangue.'); near(CENTER, CENTER, { t: 'shake', s: 1 }, 999); estateSave(); return; }
  if (k === 'alaric') { U.alive.alaric = 0; const i = COURT.findIndex(d => d.id === 'k_prince'); if (i >= 0) COURT.splice(i, 1); const n = S.npcs.k_prince; if (n) visGone(n); hNews('O Príncipe Alaric Aurenfell morreu (' + cause + '). ' + sucName(sucLine()[0]) + ' é agora o herdeiro.'); sys('Notícia: o Príncipe Alaric morreu (' + cause + ').'); estateSave(); return; }
  if (k === 'corwyn') { U.alive.corwyn = 0; U.corwynIn = 0; const n = S.npcs.k_corwyn; if (n) visGone(n); hNews('Lorde Corwyn Aurenfell morreu na pousada (' + cause + ').'); sys('Notícia: Lorde Corwyn morreu (' + cause + ').'); estateSave(); return; }
  if (k.startsWith('l:')) trLordDead(k.slice(2), cause); }
/* a coroa chegando a uma casa: a família inteira muda para o castelo */
const TR_ROYAL = ['k_qn', 'k_hr'];
function trHouseCourt(hid) { const h = HOUSE_BY[hid]; if (!h) return; for (const id of TR_ROYAL) { const i = COURT.findIndex(d => d.id === id); if (i >= 0) COURT.splice(i, 1); }
  COURT.push({ id: 'k_qn', kind: 'hh_spouse_' + hid, name: h.spouse, role: 'princess', day: [2, 3.5, 9.5], off: [4, 6.5, 3] }, { id: 'k_hr', kind: 'hh_heir_' + hid, name: h.heir, role: 'prince', day: [0, 'yard', -1, -8], off: [4, 2.5, 3] });
  const def = COURT.find(d => d.id === 'k_king'); if (def) { def.kind = 'hh_lord_' + hid; def.name = sucKingName(); }
  for (const r of [0, 1, 2]) { const n = S.npcs['h_' + hid + '_' + r]; if (n) visGone(n); } }
if (typeof hPost === 'function') { const _hpT = hPost; hPost = function (def, n) { const U = S.estate && sucRec(); if (U && U.king === 'h:' + n.house && (n.hrole === 'lord' || n.hrole === 'spouse' || n.hrole === 'heir')) return null; return _hpT(def, n); }; }
if (typeof sucKingName === 'function') { const _skT = sucKingName; sucKingName = function () { const U = sucRec(); if (U.king && U.king.startsWith('h:')) { const l = HOUSE_BY[U.king.slice(2)].lord; return (/^Lady /.test(l) ? 'Rainha ' : 'Rei ') + l.replace(/^(Lorde|Lady) /, ''); } return _skT(); }; }
if (typeof sucApplyKing === 'function') { const _saT = sucApplyKing; sucApplyKing = function (k) { _saT(k); if (k.startsWith('h:')) { trHouseCourt(k.slice(2)); hNews('A ' + HOUSE_BY[k.slice(2)].n + ' chega ao trono: a família inteira muda para o castelo.'); } }; }
if (typeof sucInitCourt === 'function') { const _siT = sucInitCourt; sucInitCourt = function () { trApplyNames(); _siT(); const U = sucRec(); if (U.king && U.king.startsWith('h:')) trHouseCourt(U.king.slice(2)); }; }
/* morte em combate (lâmina): o jogo já trata as testemunhas; aqui só a linha de sucessão */
if (typeof npcDie === 'function') { const _ndT = npcDie; npcDie = function (n, p) { _ndT(n, p); try { if (!S.estate) return; const U = sucRec();
  if (n.id === 'k_king') trKill('king', p ? 'morto por ' + p.name : 'assassinado'); else if (n.id === 'k_prince' && U.alive.alaric && U.king !== 'alaric') trKill('alaric', 'assassinado'); else if (n.id === 'k_corwyn') trKill('corwyn', 'assassinado');
  else if (n.court === 'house' && n.hrole === 'lord') trLordDead(n.house, p ? 'morto por ' + p.name : 'assassinado'); } catch (e) { console.warn('trama', e); } }; }
/* o rastro: veneno 20%; assassino que falha entrega quem pagou em 30% */
function trWanted(key, why) { const p = Object.values(S.players).find(q => estOwner(q) === key); if (p) { p.murderer = true; secCrime(p, 'regicide', 'atentado contra a realeza', 360000); tell(p, why); } else { const R = trRec(); R.later = R.later || {}; R.later[key] = why; } }
function trResolve(now) { const R = trRec(), h = empHour(); if (!csIn(h, TR.resolveH)) return; for (let i = R.pend.length - 1; i >= 0; i--) { const e = R.pend[i]; if (now < e.at) continue; R.pend.splice(i, 1);
  const alive = trTargets().some(t => t.k === e.target); if (!alive) continue;
  if (e.k === 'poison') { trKill(e.target, 'envenenado'); if (Math.random() < TR.trace) trWanted(e.payer, 'O veneno foi rastreado até você. Você é procurado por atentado contra a realeza: se te pegarem, é a guilhotina.'); }
  else if (e.k === 'hit') { if (Math.random() < TR.hire[e.tier][1]) trKill(e.target, 'um assassino na noite'); else { hNews('Um assassino tentou matar ' + trName(e.target) + ' à noite e fugiu.'); if (Math.random() < TR.betray) trWanted(e.payer, 'O assassino que você pagou foi pego e entregou o seu nome. Você é procurado por atentado contra a realeza.'); } }
  else if (e.k === 'plot') { const P = R.plots[e.hid]; delete R.plots[e.hid]; if (!P || P.denounced) continue; if (Math.random() < TR.plotWin) trKill(e.target, 'uma trama da ' + HOUSE_BY[e.hid].n); else hNews('Um atentado contra ' + trName(e.target) + ' falhou durante a noite. Ninguém sabe quem mandou.'); } }
  estateSave(); }
/* as casas desleais e próximas na linha tramam sozinhas */
function trPlots() { const R = trRec(), L = sucLine(), U = sucRec();
  for (const h of HOUSES) { if (R.plots[h.id] || U.king === 'h:' + h.id || hRec().st[h.id].crown >= 0) continue; const i = L.indexOf('h:' + h.id); if (i < 0 || i > 3) continue;
    if (Math.random() >= TR.plotChance) continue; const target = i === 0 ? 'king' : (L[i - 1].startsWith('h:') ? 'l:' + L[i - 1].slice(2) : L[i - 1]);
    R.plots[h.id] = { target, day: estDay() }; R.pend.push({ k: 'plot', hid: h.id, target, at: now_() + ESTATE_DAY_MS * 0.9 }); } }
/* segredos novos: a trama do dia e o herdeiro bastardo */
if (typeof secText === 'function') { const _stT = secText; secText = function (hid, k) { if (hid === 'crown' && k === 'bastard') return 'O Príncipe Alaric não é filho do Rei Edric: a falecida rainha teve um amante na corte.';
  if (k === 'plot') { const P = trRec().plots[hid]; return 'A ' + HOUSE_BY[hid].n + ' vai mandar matar ' + (P ? trName(P.target) : 'alguém da linha') + ' na próxima madrugada.'; } return _stT(hid, k); }; }
if (typeof SEC_W !== 'undefined') { SEC_W.plot = 5; SEC_W.bastard = 5; SEC_KN.plot = 'trama contra a linha'; SEC_KN.bastard = 'o herdeiro bastardo'; }
if (typeof CV_SELL !== 'undefined') { CV_SELL.plot = 55; CV_SELL.bastard = 55; }
if (typeof secRandom === 'function') { const _srT = secRandom; secRandom = function (p, pref) { const R = S.estate && trRec(), U = S.estate && sucRec(); if (R) { const L = secList(p);
  for (const hid in R.plots) if (!L.some(s => s.h === hid && s.k === 'plot') && Math.random() < 0.5) return [hid, 'plot'];
  if (!R.bastardOut && U.alive.alaric && sucRealmDay() >= 8 && Math.random() < TR.bastardChance) { R.bastardOut = 1; return ['crown', 'bastard']; } } return _srT(p, pref); }; }
if (typeof sucLegit === 'function') { const _slT = sucLegit; sucLegit = function (k) { const v = _slT(k); return k === 'alaric' && S.estate && trRec().bastard ? Math.max(0, v - TR.bastard) : v; }; }
/* boato do bastardo: derruba muito a legitimidade do herdeiro, mas ele continua na linha */
if (typeof velMsg === 'function') { const _vmT = velMsg; velMsg = function (p, m) { if (m.a === 'rumor' && S.estate) { const L = secList(p), s = L[m.i | 0]; if (s && s.h === 'crown') { const n = velStaffNear(p, 'vl_ysolde'); if (!n) return; if ((p.gold || 0) < RUMOR_COST) { tell(p, 'Espalhar custa ' + RUMOR_COST + ' de ouro.'); return; } p.gold -= RUMOR_COST; L.splice(m.i | 0, 1); trRec().bastard = 1; hNews('Corre pela cidade: o Príncipe Alaric não seria filho do rei.'); tell(p, 'Boato espalhado: a legitimidade do Príncipe Alaric despencou (ele continua na linha).'); sendStat(p); estateSave(); velMenu(p, VEL_STAFF.find(t => t.id === 'vl_ysolde'), n); return; } }
  if (m.a === 'bm' && S.estate) { const s = secList(p)[m.i | 0]; if (s && s.h === 'crown') return; } return _vmT(p, m); }; }
/* o contrabandista da viela, só à noite */
function trSmugSpot() { const tb = BUILDINGS.find(b => b.kind === 'tavern'); if (!tb) return [CENTER - 18, CENTER + 12]; let best = null, bd = 1e9; for (let y = tb.y - 2; y <= tb.y + tb.h + 1; y++) for (let x = tb.x - 3; x < tb.x; x++) { if (WORLD.bld[tileAt(x, y)] >= 0 || !canStand(x, y, 0, 0.3)) continue; const d = dist(x, y, tb.x - 1.5, tb.y + tb.h / 2); if (d < bd) { bd = d; best = [x, y]; } } return best || [tb.x - 2, tb.y + 3]; }
function trSmug() { const h = empHour(), on = h >= TR.smugH[0] || h < TR.smugH[1], n = S.npcs.tr_smug;
  if (on && !n) { const [x, y] = trSmugSpot(), v = { id: 'tr_smug', kind: 'k_smug', name: 'Vesper, o Contrabandista', transient: true, court: 'smug', x, y, z: 0, fl: 0, fb: -1, hp: 200, maxHp: 200, downed: null, dead: false, dir: 0 }; S.npcs[v.id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); }
  else if (!on && n) visGone(n); }
function trMenu(p) { Net.toOne(p.id, { t: 'tramenu', targets: trTargets(), poison: TR.poison, hire: TR.hire.map(x => [x[0], Math.round(x[1] * 100)]), gold: p.gold | 0, has: p.inv.poison | 0 }); }
function trSeenCup(p) { return Object.values(S.npcs).some(n => !n.dead && !n.downed && !n.sleeping && (n.fl || 0) === (p.fl || 0) && dist(n.x, n.y, p.x, p.y) < 6 && (n.kind === 'guard' || n.kind === 'captain' || n.kind === 'k_guard' || (n.court === 'house' && n.hrole === 'guard'))); }
function trCastleKitchenEmpty() { const ck = S.npcs.k_cook, b = castleB(); if (!ck || ck.dead || !b) return true; if ((ck.fl || 0) !== 1) return true; const [u, v] = worldToLocal(b, ck.x, ck.y); return !(u >= 0 && u < 4 && v >= 0 && v < 8); }
function trMsg(p, m) { if (!S.estate || p.downed) return; const R = trRec(), now = now_(), key = estOwner(p), nextMorning = now + ESTATE_DAY_MS * 0.5;
  if (m.a === 'menu') { const n = S.npcs.tr_smug; if (!n || dist(n.x, n.y, p.x, p.y) > 3) return; trMenu(p); return; }
  if (m.a === 'buy') { const n = S.npcs.tr_smug; if (!n || dist(n.x, n.y, p.x, p.y) > 3) return; if ((p.gold || 0) < TR.poison) { empSay(n, 'Veneno bom é caro. ' + TR.poison + ' de ouro.'); return; } if (!p.inv.poison && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'A mochila está cheia.'); return; } p.gold -= TR.poison; p.inv.poison = (p.inv.poison | 0) + 1; empSay(n, 'Três gotas no vinho. Ele não acorda amanhã.'); sendStat(p); trMenu(p); return; }
  if (m.a === 'hire') { const n = S.npcs.tr_smug, T = TR.hire[m.tier | 0]; if (!n || !T || dist(n.x, n.y, p.x, p.y) > 3 || !trTargets().some(t => t.k === m.target)) return; if ((p.gold || 0) < T[0]) { empSay(n, 'Por menos de ' + T[0] + ', ninguém arrisca o pescoço.'); return; }
    p.gold -= T[0]; R.pend.push({ k: 'hit', target: m.target, tier: m.tier | 0, payer: key, at: nextMorning }); empSay(n, 'Antes do sol nascer. Não me procure de novo.'); tell(p, 'Você pagou ' + T[0] + ' de ouro por ' + trName(m.target) + '. Chance de dar certo: ' + Math.round(T[1] * 100) + '%. Se falhar, o assassino pode entregar você.'); sendStat(p); estateSave(); return; }
  const usePoison = (target, how) => { p.inv.poison--; if (p.inv.poison <= 0) delete p.inv.poison; R.pend.push({ k: 'poison', target, payer: key, at: nextMorning }); sendStat(p); estateSave(); tell(p, how + ' ' + trName(target) + ' não deve ver o próximo amanhecer.'); };
  if (!(p.inv.poison > 0) && (m.a === 'stove' || m.a === 'pip' || m.a === 'cup')) { tell(p, 'Você não tem veneno.'); return; }
  if (m.a === 'stove') { const h = empHour(); if (!csIn(h, TR.dinner)) { tell(p, 'Só na hora de preparar o jantar (' + TR.dinner[0] + 'h).'); return; }
    const cb = castleB(), cbi = BUILDINGS.indexOf(cb); if ((p.fl || 0) === 1 && p.fb === cbi) { const [x, y] = localToWorld(cb, TR_STOVE_C[0], TR_STOVE_C[1]); if (dist(p.x, p.y, x, y) > 1.4) return; if (!trCastleKitchenEmpty()) { tell(p, 'A Marga está na cozinha. Espere ela descer à adega.'); return; } usePoison('king', 'O veneno está na panela do jantar do rei.'); return; }
    const b = BUILDINGS[m.bi | 0]; if (!b || b.deco !== 'seat' || (p.fl || 0) || WORLD.bld[tileAt(p.x, p.y)] !== (m.bi | 0)) return; const [x, y] = localToWorld(b, TR_STOVE_M[0], TR_STOVE_M[1]); if (dist(p.x, p.y, x, y) > 1.4 || sucRec().king === 'h:' + b.seat) return; usePoison('l:' + b.seat, 'O veneno está no jantar da casa.'); return; }
  if (m.a === 'pip') { const n = S.npcs.k_page; if (!n || dist(n.x, n.y, p.x, p.y) > 3) return; if ((p.gold || 0) < TR.pip) { empSay(n, 'Eu? Envenenar o rei? Por menos de ' + TR.pip + ', nem pensar.'); return; } p.gold -= TR.pip; empSay(n, 'Eu sirvo o vinho às sete. Não vi o senhor, e o senhor não me viu.'); usePoison('king', 'O Pip vai servir o vinho do rei.'); return; }
  if (m.a === 'cup') { const t = trTargets().find(x => x.k === m.target); if (!t || !t.k.startsWith('l:')) return; const L = Object.values(S.npcs).find(n => n.court === 'house' && n.house === t.k.slice(2) && n.hrole === 'lord' && !n.dead); if (!L || dist(L.x, L.y, p.x, p.y) > 1.8) return;
    const bi = WORLD.bld[tileAt(L.x, L.y)], b = BUILDINGS[bi]; if (!b || !(b.kind === 'club' || b.kind === 'velvet' || b.kind === 'baths')) { tell(p, 'Só onde ele bebe: no Clube, na Casa de Veludo ou nas Termas.'); return; }
    if (trSeenCup(p)) { p.inv.poison--; if (p.inv.poison <= 0) delete p.inv.poison; p.murderer = true; secCrime(p, 'regicide', 'atentado contra a realeza', 360000); tell(p, 'Um guarda viu você mexer na taça de ' + t.n + '. Você é procurado por tentativa de assassinato.'); sendStat(p); return; }
    usePoison(t.k, 'Ninguém viu. A taça de'); return; }
  if (m.a === 'plots') { const L = secList(p).map((s, i) => ({ s, i })).filter(x => x.s.k === 'plot' && R.plots[x.s.h] && !R.plots[x.s.h].denounced).map(x => ({ i: x.i, hid: x.s.h, n: HOUSE_BY[x.s.h].n })); Net.toOne(p.id, { t: 'traplots', l: L, id: m.id }); return; }
  if (m.a === 'denounce') { const n = S.npcs[m.id]; if (!n || !(n.id === 'k_hand' || n.id === 'k_cmd' || n.id === 'k_king') || dist(n.x, n.y, p.x, p.y) > 3) return; const L = secList(p), s = L[m.i | 0]; if (!s || s.k !== 'plot' || !R.plots[s.h]) return; const hid = s.h, h = HOUSE_BY[hid];
    R.plots[hid].denounced = 1; L.splice(m.i | 0, 1); const st = hRec().st[hid]; st.prestige = clampH(st.prestige + TR.denPrestige, 0, 100); const line = cpRec().line, i = line.indexOf(hid); if (i >= 0) { line.splice(i, 1); line.push(hid); }
    p.gold = (p.gold || 0) + TR.denGold; crownFavor(p, TR.denFavor, 'denunciou a trama da ' + h.n); empSay(n, 'A coroa não esquece quem a protege.'); hNews(h.lord + ' foi levado a julgamento por tramar contra a coroa. A ' + h.n + ' perde prestígio e vai para o fim da linha de sangue.'); sys('Notícia: a trama da ' + h.n + ' foi descoberta. ' + h.lord + ' vai a julgamento.'); sendStat(p); estateSave(); return; } }
function trTick(now) { if (!S.estate || !castleB()) return; if (now - (S.trT || 0) < 1000) return; S.trT = now; const R = trRec(), day = estDay();
  if (!S.trInit) { S.trInit = 1; trApplyNames(); } if (R.dayT !== day) { R.dayT = day; trPlots(); }
  trSmug(); trResolve(now);
  if (R.later) for (const p of Object.values(S.players)) { const k = estOwner(p); if (R.later[k]) { const why = R.later[k]; delete R.later[k]; trWanted(k, why); } } }
if (typeof housesTick === 'function') { const _htT = housesTick; housesTick = function (now) { _htT(now); trTick(now); }; }
/* a cozinheira desce à adega antes do jantar (a cozinha fica vazia das 18h às 18h45) */
if (typeof courtPost === 'function') { const _cpT = courtPost; courtPost = function (def, now) { if (def.id === 'k_cook' && S.estate && csIn(empHour(), TR.cookAway)) return [-1, 12.5, 3]; return _cpT(def, now); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') { NPC_LOOKS.k_smug = () => Object.assign(heroLook('archer', 'scout', '#1e1e22'), { armor: 'leather', body: tone('#26242a'), body2: tone('#3a3028'), head: 'hood', headTone: tone('#1a1a1e'), hair: tone('#1a1a1a'), weapon: null, quiver: false, cape: true, capeTone: tone('#18161a'), scar: 1 }); if (typeof NPC_CLS !== 'undefined') NPC_CLS.k_smug = 'archer'; }
if (typeof COURT_LINES !== 'undefined') COURT_LINES.smug = ['Fala baixo.'];
if (typeof LOOT !== 'undefined' && !LOOT.poison) LOOT.poison = { name: 'Frasco de Veneno', price: TR.poison, icon: '☠', color: '#6a8a3a', desc: 'Três gotas e o alvo não vê o próximo amanhecer. Na cozinha do castelo ou de um casarão na hora do jantar, pelo copeiro Pip, ou numa taça onde o lorde bebe.' };
function trPanel(m) { const d = velPanel('Vesper, o Contrabandista', '<div class="est-cost">“Fala baixo. O que você quer?”</div><div class="vel-sub">Veneno</div><div class="tq-btns"><button class="est-btn" data-poison' + (m.gold < m.poison ? ' disabled' : '') + '>Um frasco de veneno<small>' + m.poison + ' de ouro · você tem ' + m.has + '</small></button></div><div class="vel-sub">Assassino de aluguel (age antes do amanhecer)</div><div class="est-cost">Alvo:</div><div class="vel-vs">' + m.targets.map((t, i) => '<button class="est-btn ghost" data-t="' + t.k + '"' + (i === 0 ? ' style="outline:2px solid #c9a24a"' : '') + '>' + t.n + '</button>').join('') + '</div><div class="vel-amt" style="grid-template-columns:repeat(3,1fr)">' + m.hire.map((h, i) => '<button class="est-btn" data-h="' + i + '"' + (m.gold < h[0] ? ' disabled' : '') + '>' + h[0] + '<small>' + h[1] + '% de chance</small></button>').join('') + '</div><div class="est-cost"><small>Se o assassino falhar, ele pode entregar o seu nome.</small></div>');
  let tgt = m.targets[0] && m.targets[0].k; d.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tgt = b.dataset.t; d.querySelectorAll('[data-t]').forEach(o => o.style.outline = o === b ? '2px solid #c9a24a' : ''); });
  d.querySelector('[data-poison]').onclick = () => Net.send({ t: 'trama', a: 'buy' }); d.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { if (b.dataset.sure) { d.remove(); Net.send({ t: 'trama', a: 'hire', target: tgt, tier: +b.dataset.h }); } else { b.dataset.sure = 1; b.innerHTML = 'Confirmar?<small>' + b.textContent + '</small>'; } }); }
function trSpot() { const me = G.me; if (!me || me.downed || !(me.inv && me.inv.poison > 0)) return null; const h = typeof clientHour === 'function' ? clientHour() : null;
  const cb = typeof castleB === 'function' ? castleB() : null; if (cb && me.fl === 1 && me.fb === BUILDINGS.indexOf(cb)) { const [x, y] = localToWorld(cb, TR_STOVE_C[0], TR_STOVE_C[1]); if (dist(me.x, me.y, x, y) < 1.3) return { k: 'stove' }; }
  if (!(me.fl || 0)) { const bi = WORLD.bld[tileAt(me.x, me.y)], b = BUILDINGS[bi]; if (b && b.deco === 'seat') { const [x, y] = localToWorld(b, TR_STOVE_M[0], TR_STOVE_M[1]); if (dist(me.x, me.y, x, y) < 1.3) return { k: 'stove', bi }; }
    if (b && (b.kind === 'club' || b.kind === 'velvet' || b.kind === 'baths')) for (const id in G.npcs) { const e = G.npcs[id]; if (!/^h[hb]_lord_/.test(e.kind || '') || e.npDead) continue; if (Math.hypot(e.rx - me.x, e.ry - me.y) < 1.6) return { k: 'cup', target: 'l:' + e.kind.replace(/^h[hb]_lord_/, ''), n: e.name }; } }
  return null; }
function trHint() { const s = trSpot(); if (!s) return ''; return s.k === 'stove' ? 'F: pôr veneno no jantar (só às 18h, sem ninguém na cozinha)' : 'F: pôr veneno na taça de ' + s.n.split(',')[0] + ' (sem guarda por perto)'; }
function trF() { const s = trSpot(); if (!s) return false; Net.send(Object.assign({ t: 'trama', a: s.k }, s.bi != null ? { bi: s.bi } : {}, s.target ? { target: s.target } : {})); return true; }
if (typeof csHint === 'function') { const _chT = csHint; csHint = function () { return trHint() || _chT(); }; }
if (typeof csF === 'function') { const _cfT = csF; csF = function () { if (!G.csAct && trF()) return true; return _cfT(); }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peT2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'courtmenu' && m.role === 'smug') { Net.send({ t: 'trama', a: 'menu' }); return true; }
  if (m.t === 'tramenu') { trPanel(m); return true; }
  if (m.t === 'traplots') { const d = document.getElementById('courtmenu'); if (d && m.l.length) for (const x of m.l) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">⚖</span><span><b>Denunciar a trama da ' + x.n + '</b><br><small>O lorde vai a julgamento; você ganha ' + TR.denGold + ' de ouro e favor da coroa.</small></span>'; bt.onclick = () => { d.remove(); Net.send({ t: 'trama', a: 'denounce', id: m.id, i: x.i }); }; d.appendChild(bt); } return true; }
  const r = _peT2(m, now);
  if (m.t === 'courtmenu' && (m.id === 'k_hand' || m.id === 'k_cmd' || m.id === 'k_king')) Net.send({ t: 'trama', a: 'plots', id: m.id });
  if (m.t === 'courtmenu' && m.id === 'k_page' && G.me && G.me.inv && G.me.inv.poison > 0) { const d = document.getElementById('courtmenu'); if (d) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">🍷</span><span><b>Subornar o Pip (' + TR.pip + ' de ouro e o veneno)</b><br><small>Ele põe o veneno no vinho do rei, no jantar.</small></span>'; bt.onclick = () => { d.remove(); Net.send({ t: 'trama', a: 'pip' }); }; d.appendChild(bt); } }
  return r; }; }
