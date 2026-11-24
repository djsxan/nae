// ============================================================
//  PARTE L, ETAPA 2: casas caídas, tarefas de vassalos, herdeiro escolhido e casa parada.
//  Uma casa NPC cai quando fica sem sangue (o herdeiro morre sem filhos para tomar o lugar, a casa fica
//  sem herdeiro, e depois o lorde morre) ou quando lidera uma rebelião e perde o cerco (a família vai para o exílio). A família
//  some, a casa sai da linha, das tramas, dos casamentos e dos sequestros, e o casarão fica vago: um
//  Lorde com favor da coroa 50 pede ao rei na audiência (ou ao rei jogador, que decide) e o casarão vira
//  dele, servindo para fundar uma casa. O lorde jogador cria tarefas prontas para os vassalos (caçar,
//  entregar, montar guarda no casarão, acompanhar o lorde), conferidas pelo jogo, com recompensa em ouro
//  (pago na hora de criar) e favor. O herdeiro da casa fundada é escolhido pelo lorde entre os filhos
//  adultos, o cônjuge e os vassalos; sem escolha, o filho mais velho adulto, o cônjuge ou o vassalo de
//  mais favor. Casa de lorde que não aparece fica parada (sem renda) até ele voltar.
// ============================================================
const L2 = { gap: 3, grantFavor: 50, taskMax: 3, taskDays: 1, guardMs: 60000, escortMs: 90000, guardH: 2, escortR: 5, guardR: 6,
  mons: [['bandit', 'bandidos'], ['wolf', 'lobos'], ['goblin', 'goblins'], ['skeleton', 'esqueletos'], ['orc', 'orcs']], items: ['log', 'ore', 'flaxraw', 'wheat', 'firewood', 'cookedmeat', 'hardwood'],
  gold: [0, 50, 150, 300], favor: [0, 5, 10, 20] };

// ---------------- SERVIDOR ----------------
function fhRec() { const E = S.estate; if (!E.fallen) E.fallen = { h: {}, ld: {}, hd: {}, noHeir: {} }; if (!E.fallen.noHeir) E.fallen.noHeir = {}; return E.fallen; }
function fhIs(hid) { try { return !!(S.estate && fhRec().h[hid]); } catch (e) { return false; } }
function fhNoKids(hid) { return typeof lnRec !== 'function' || !(lnRec().kids[hid] || []).some(k => !k.dead); }
function fhPublic() { const R = fhRec(), l = {}; for (const hid of Object.keys(R.h)) { const f = R.h[hid], b = hSeatB(hid); l[hid] = { why: f.why, n: HOUSE_BY[hid].n, to: f.to || null, toN: f.toN || null, bi: b ? BUILDINGS.indexOf(b) : -1, d: f.d }; } return { t: 'fallen', l }; }
function fhFall(hid, why) { const R = fhRec(), h = HOUSE_BY[hid]; if (!h || h.player || R.h[hid]) return; R.h[hid] = { why, d: estDay() };
  const st = hRec().st[hid]; Object.assign(st, { power: 0, gold: 0, crown: 0, prestige: 0 }); if (typeof lnRec === 'function') lnRec().kids[hid] = [];
  for (const n of Object.values(S.npcs)) if (n.house === hid && (n.court === 'house' || n.court === 'housekid' || n.court === 'wedding')) visGone(n);
  for (const k of Object.keys(hRec().vow)) if (hRec().vow[k] === hid) delete hRec().vow[k];
  const txt = why === 'exiled' ? 'A ' + h.n + ' liderou a rebelião e perdeu: a família foi para o exílio e a coroa confiscou o casarão.' : 'A ' + h.n + ' se extinguiu: não sobrou ninguém do sangue dela. O casarão está vazio.';
  sys('🏚 ' + txt + ' O rei pode dá-lo a um Lorde que peça na audiência.'); hNews(txt); estateSave(); fhSync(); }
function fhSync() { const m = fhPublic(); fhApply(m); Net.toAll(m); }
/* extinção: o herdeiro morre sem filhos (a casa fica sem herdeiro; ninguém de fora assume) e depois o lorde morre */
if (typeof trLordDead === 'function') { const _tldL = trLordDead; trLordDead = function (hid, cause) { if (fhIs(hid)) return; const R = S.estate ? fhRec() : null, npc = HOUSE_BY[hid] && !HOUSE_BY[hid].player;
  if (R && npc && R.noHeir[hid]) { hNews(HOUSE_BY[hid].lord + ' morreu (' + cause + ') sem deixar herdeiro.'); fhFall(hid, 'extinct'); return; }
  const kids0 = R && npc ? !fhNoKids(hid) : true; const r = _tldL(hid, cause); if (R && npc && !kids0) fhNoHeir(hid, 'o novo lorde não tem filhos'); return r; }; }
function fhNoHeir(hid, why) { const R = fhRec(), h = HOUSE_BY[hid]; R.noHeir[hid] = estDay(); for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.house === hid && n.hrole === 'heir') visGone(n); hNews('A ' + h.n + ' está sem herdeiro (' + why + '). Se ' + h.lord + ' morrer, a casa se extingue.'); estateSave(); }
function fhHeirDied(hid) { if (!fhNoKids(hid)) return false; fhNoHeir(hid, 'o herdeiro morreu sem filhos'); return true; }
if (typeof mr2FamDead === 'function') { const _mfL = mr2FamDead; mr2FamDead = function (h, role, cause) { if (role === 'heir' && S.estate && fhHeirDied(h.id)) return; return _mfL(h, role, cause); }; }
if (typeof rgDie === 'function') { const _rdL = rgDie; rgDie = function (h, role) { if (fhIs(h.id)) return; if (role === 'heir' && S.estate && fhHeirDied(h.id)) return; return _rdL(h, role); }; }
/* exílio: a casa que liderou a rebelião perde o cerco */
if (typeof sgEnd === 'function') { const _seL = sgEnd; sgEnd = function (win, how) { const S0 = sgRec(), troop = S0.on ? S0.troop : null; _seL(win, how); try { if (win === 'd' && troop && HOUSE_BY[troop] && !HOUSE_BY[troop].player) fhFall(troop, 'exiled'); } catch (e) { console.warn('exilio', e); } }; }
/* a casa caída sai de tudo */
if (typeof hPost === 'function') { const _hpL2 = hPost; hPost = function (def, n) { if (fhIs(n.house)) return null; try { if (n.hrole === 'heir' && S.estate && fhRec().noHeir[n.house]) return null; } catch (e) { } return _hpL2(def, n); }; }
if (typeof sucLine === 'function') { const _slL2 = sucLine; sucLine = function () { const L = _slL2(); try { if (S.estate) return L.filter(k => !(String(k).startsWith('h:') && fhIs(k.slice(2)))); } catch (e) { } return L; }; }
if (typeof mrCandidates === 'function') { const _mcL2 = mrCandidates; mrCandidates = function (hid) { if (fhIs(hid)) return []; const L = _mcL2(hid); try { if (S.estate && fhRec().noHeir[hid]) return L.filter(c => c.tier !== 'heir'); } catch (e) { } return L; }; }
if (typeof trTargets === 'function') { const _ttL2 = trTargets; trTargets = function () { return _ttL2().filter(t => !(String(t.k).startsWith('l:') && fhIs(t.k.slice(2)))); }; }
if (typeof mr2GrudgeOf === 'function') { const _mgL2 = mr2GrudgeOf; mr2GrudgeOf = function (x, target) { if (fhIs(x) || fhIs(target)) return null; return _mgL2(x, target); }; }
if (typeof mr2HeirKidDaily === 'function') { const _mhL2 = mr2HeirKidDaily; mr2HeirKidDaily = function () { _mhL2(); const K = mr2HK(); for (const h of Object.keys(K)) if (fhIs(h) || fhIs(K[h].by) || (fhRec().noHeir[h] && K[h].d0 == null)) { delete K[h]; } }; }
if (typeof lnDaily === 'function') { const _ldL2 = lnDaily; lnDaily = function () { _ldL2(); try { for (const hid of Object.keys(fhRec().h)) lnRec().kids[hid] = []; } catch (e) { } }; }
if (typeof lnWedding === 'function') { const _lwL2 = lnWedding; lnWedding = function () { const M0 = JSON.stringify(lnRec().married); _lwL2(); try { const M = lnRec().married; for (const b of Object.keys(M)) if ((fhIs(b) || fhIs(M[b].from)) && !JSON.parse(M0)[b]) delete M[b]; } catch (e) { } }; }
if (typeof sgRebelNow === 'function') { const _srL2 = sgRebelNow; sgRebelNow = function () { const r = _srL2(); return r && fhIs(r.troop) ? null : r; }; }
if (typeof housePublic === 'function') { const _hpuL2 = housePublic; housePublic = function (p) { const o = _hpuL2(p); try { for (const h of o.l) if (fhIs(h.id)) { const f = fhRec().h[h.id]; h.fallen = f.why; h.lord = f.why === 'exiled' ? 'família no exílio' : 'casa extinta'; if (f.toN) h.lord += ' · casarão de ' + f.toN; } } catch (e) { } return o; }; }
/* o casarão vago: pedido ao rei */
function fhAsk(p, m) { const k = estOwner(p), R = fhRec(), f = R.h[m.h]; if (!f || f.to) { tell(p, 'Esse casarão não está vago.'); return; }
  if ((crownRec().title[k] | 0) < PH.title) { tell(p, 'O rei só dá um casarão a um Lorde.'); return; }
  if (Object.values(R.h).some(x => x.to === k)) { tell(p, 'O rei já lhe deu um casarão.'); return; }
  if (typeof rkHouse === 'function' && rkHouse()) { const kh = rkHouse(), kp = Object.values(S.players).find(o => estOwner(o) === kh.owner); if (kh.owner === k) { fhGrant(m.h, k, p.name); return; } if (!kp) { tell(p, 'O rei não está no reino agora.'); return; } R.req = { h: m.h, k, n: p.name }; Net.toOne(kp.id, { t: 'fhreq', n: p.name, house: HOUSE_BY[m.h].n }); tell(p, 'O pedido foi levado ao rei.'); estateSave(); return; }
  const fav = crownRec().favor[crownKey(p)] || 0; if (fav < L2.grantFavor) { tell(p, 'O rei só dá o casarão a quem tem favor da coroa ' + L2.grantFavor + ' (você tem ' + fav + ').'); return; }
  if (!(S.audCall && S.audCall.id === p.id)) { tell(p, 'Peça ao rei na audiência (fila do arauto, das 8h às 12h).'); return; }
  fhGrant(m.h, k, p.name); }
function fhKingAnswer(p, m) { const R = fhRec(), q = R.req; if (!q || !(typeof rkIsKing === 'function' && rkIsKing(p))) return; R.req = null; const o = Object.values(S.players).find(x => estOwner(x) === q.k);
  if (m.yes) fhGrant(q.h, q.k, q.n); else { if (o) tell(o, 'O rei negou o seu pedido pelo casarão da antiga ' + HOUSE_BY[q.h].n + '.'); estateSave(); } }
function fhGrant(hid, k, nm) { const R = fhRec(), f = R.h[hid], b = hSeatB(hid); if (!f || !b) return; f.to = k; f.toN = nm; const pid = 'm' + BUILDINGS.indexOf(b); fhApply(fhPublic());
  estateLoad().r[pid] = { owner: k, ownerName: nm, mode: 'own', paid: estDay(), auth: [] }; estateSave(); fhSync();
  const p = Object.values(S.players).find(o => estOwner(o) === k); if (p) tell(p, 'O rei lhe deu o casarão da antiga ' + HOUSE_BY[hid].n + '. Ele é seu e serve para fundar a sua casa.');
  sys('🏛 O rei deu o casarão da antiga ' + HOUSE_BY[hid].n + ' a ' + nm + '.'); hNews(nm + ' recebeu do rei o casarão da antiga ' + HOUSE_BY[hid].n + '.'); }
if (typeof phManors === 'function') { const _pmL2 = phManors; phManors = function (key) { const L = _pmL2(key); try { const E = estateLoad(), used = new Set(phRec().l.map(h => h.bi)); for (const f of Object.values(fhRec().h)) { if (f.to !== key) continue; } for (const hid of Object.keys(fhRec().h)) { const f = fhRec().h[hid], b = hSeatB(hid); if (!b || f.to !== key) continue; const bi = BUILDINGS.indexOf(b), pid = 'm' + bi; if (E.r[pid] && E.r[pid].owner === key && !used.has(bi) && !L.some(x => x.bi === bi)) L.push({ pid, bi, n: PROPS_BY[pid] ? PROPS_BY[pid].name : b.name }); } } catch (e) { } return L; }; }

/* ---- tarefas para os vassalos ---- */
function vtRec() { const E = S.estate; if (!E.vtask) E.vtask = { l: {}, seq: 0, pend: {} }; return E.vtask; }
function vtList(hid) { const R = vtRec(); return R.l[hid] || (R.l[hid] = []); }
function vtText(t) { return t.k === 'hunt' ? 'Caçar ' + t.n + ' ' + (L2.mons.find(x => x[0] === t.mon) || [0, t.mon])[1] : t.k === 'deliver' ? 'Entregar ' + t.n + ' × ' + ((typeof LOOT !== 'undefined' && LOOT[t.item]) ? LOOT[t.item].name : t.item) + ' ao criado do casarão' : t.k === 'guard' ? 'Montar guarda no casarão das ' + t.h + 'h às ' + (t.h + L2.guardH) + 'h' : 'Acompanhar o lorde por ' + Math.round(L2.escortMs / 1000) + ' segundos'; }
function vtPub(t) { return { id: t.id, txt: vtText(t), gold: t.gold, favor: t.favor, taker: t.tn || null, prog: t.k === 'hunt' ? (t.got | 0) + '/' + t.n : (t.k === 'guard' || t.k === 'escort') ? Math.round((t.ms | 0) / 1000) + ' s' : '', mine: 0 }; }
function vtCreate(p, h, m) { const L = vtList(h.id), k = estOwner(p); if (L.length >= L2.taskMax) { tell(p, 'No máximo ' + L2.taskMax + ' tarefas abertas.'); return; }
  const gold = L2.gold[m.g | 0] || 0, favor = L2.favor[m.f | 0] || 0; if (!gold && !favor) { tell(p, 'Escolha uma recompensa.'); return; }
  const t = { id: ++vtRec().seq, k: m.k, gold, favor, d: estDay() };
  if (m.k === 'hunt') { t.mon = (L2.mons[m.i | 0] || L2.mons[0])[0]; t.n = [3, 5, 8][m.n | 0] || 5; } else if (m.k === 'deliver') { t.item = L2.items[m.i | 0] || L2.items[0]; t.n = [3, 5, 10][m.n | 0] || 5; } else if (m.k === 'guard') { t.h = [8, 12, 16, 20][m.i | 0] || 8; } else if (m.k === 'escort') { } else return;
  if (gold && !debit(k, p, gold)) { tell(p, 'A recompensa de ' + gold + ' de ouro sai do seu bolso agora (banco, cofres e bolsa).'); return; } sendStat(p);
  L.push(t); estateSave(); tell(p, 'Tarefa criada: ' + vtText(t) + '.'); for (const q of Object.values(S.players)) if (hRec().vow[estOwner(q)] === h.id && estOwner(q) !== h.owner) tell(q, 'A ' + h.n + ' tem uma tarefa nova para os vassalos: ' + vtText(t) + '. Fale com o criado do casarão.'); }
function vtTake(p, h, m) { const t = vtList(h.id).find(x => x.id === m.tid), k = estOwner(p); if (!t || t.taker) return; if (hRec().vow[k] !== h.id || h.owner === k) { tell(p, 'Só vassalos da ' + h.n + ' fazem as tarefas dela.'); return; }
  if (vtMine(k)) { tell(p, 'Termine a sua tarefa atual primeiro.'); return; } t.taker = k; t.tn = p.name; t.until = estDay() + L2.taskDays; t.got = 0; t.ms = 0; estateSave(); tell(p, 'Tarefa aceita: ' + vtText(t) + '. Prazo: amanhã.'); }
function vtMine(k) { const R = vtRec(); for (const hid of Object.keys(R.l)) for (const t of R.l[hid]) if (t.taker === k) return { hid, t }; return null; }
function vtDone(hid, t, p) { const h = PH_BY[hid], L = vtList(hid); L.splice(L.indexOf(t), 1);
  if (t.gold) { p.gold = (p.gold || 0) + t.gold; sendStat(p); } if (t.favor) hFavor(p, hid, t.favor, 'tarefa cumprida');
  tell(p, '✔ Tarefa cumprida: ' + vtText(t) + '.' + (t.gold ? ' +' + t.gold + ' de ouro.' : '')); const o = h && Object.values(S.players).find(q => estOwner(q) === h.owner); if (o) tell(o, p.name + ' cumpriu a tarefa: ' + vtText(t) + '.');
  if (h) { const s = hRec().st[hid]; if (s) s.prestige = clampH(s.prestige + 1, 0, 100); } estateSave(); }
function vtDeliver(p, h) { const M = vtMine(estOwner(p)); if (!M || M.hid !== h.id || M.t.k !== 'deliver') return false; const t = M.t; if ((p.inv[t.item] | 0) < t.n) { tell(p, 'Faltam itens: ' + (p.inv[t.item] | 0) + ' de ' + t.n + '.'); return true; }
  p.inv[t.item] -= t.n; if (p.inv[t.item] <= 0) delete p.inv[t.item]; const R = vtRec(); (R.pend[h.owner] = R.pend[h.owner] || []).push([t.item, t.n]); vtDone(h.id, t, p); return true; }
if (typeof killMonster === 'function') { const _kmL2 = killMonster; killMonster = function (m, p) { try { if (p && S.estate) { const M = vtMine(estOwner(p)); if (M && M.t.k === 'hunt' && M.t.mon === m.type) { M.t.got = (M.t.got | 0) + 1; tell(p, 'Tarefa: ' + M.t.got + '/' + M.t.n + '.'); if (M.t.got >= M.t.n) vtDone(M.hid, M.t, p); } } } catch (e) { } return _kmL2.apply(this, arguments); }; }
function vtTick(dt) { const R = vtRec(), day = estDay(), hr = empHour();
  for (const hid of Object.keys(R.l)) { const h = PH_BY[hid]; for (const t of R.l[hid].slice()) {
    if (t.taker && day > t.until) { const q = Object.values(S.players).find(o => estOwner(o) === t.taker); if (q) tell(q, 'O prazo da tarefa acabou: ' + vtText(t) + '.'); t.taker = null; t.tn = null; t.got = 0; t.ms = 0; continue; }
    if (!t.taker || !h) continue; const p = Object.values(S.players).find(o => estOwner(o) === t.taker); if (!p) continue;
    if (t.k === 'guard' && hr >= t.h && hr < t.h + L2.guardH) { const b = BUILDINGS[h.bi], [dx, dy] = b ? doorTile(b) : [0, 0]; if (b && (WORLD.bld[tileAt(p.x, p.y)] === h.bi || dist(p.x, p.y, dx, dy) < L2.guardR)) { t.ms = (t.ms | 0) + dt * 1000; if (t.ms >= L2.guardMs) vtDone(hid, t, p); } }
    if (t.k === 'escort') { const o = Object.values(S.players).find(q => estOwner(q) === h.owner); if (o && (o.fl || 0) === (p.fl || 0) && dist(o.x, o.y, p.x, p.y) < L2.escortR) { t.ms = (t.ms | 0) + dt * 1000; if (t.ms >= L2.escortMs) vtDone(hid, t, p); } } } }
  for (const key of Object.keys(R.pend)) { const o = Object.values(S.players).find(q => estOwner(q) === key); if (!o) continue; for (const [it, n] of R.pend[key]) { o.inv[it] = (o.inv[it] | 0) + n; tell(o, 'Seus vassalos entregaram ' + n + ' × ' + ((typeof LOOT !== 'undefined' && LOOT[it]) ? LOOT[it].name : it) + '.'); } delete R.pend[key]; sendStat(o); estateSave(); } }

/* ---- herdeiro da casa fundada: filhos adultos, cônjuge ou vassalos ---- */
function phHeirOptions(h) { const H = hRec(), R = phRec(), out = [], M = typeof mrOf === 'function' ? mrOf(h.owner) : null;
  if (M) { (M.kids || []).forEach((k, i) => { if (!k.dead && ageOf(k.a0) >= 20) out.push({ k: 'kid:' + i, n: k.n + ' (filho, ' + ageOf(k.a0) + ')', a: ageOf(k.a0) }); }); if (M.kind === 'npc' && !M.dead) out.push({ k: 'sp', n: mr2SpouseN(M) + ' (cônjuge)' }); else if (M.kind === 'player') out.push({ k: M.partner, n: (R.names[M.partner] || M.partner.split('|')[0]) + ' (cônjuge)' }); }
  for (const x of Object.keys(H.vow)) if (H.vow[x] === h.id && x !== h.owner && !out.some(o => o.k === x)) out.push({ k: x, n: (R.names[x] || x.split('|')[0]) + ' (vassalo, favor ' + ((H.favor[x] || {})[h.id] || 0) + ')', f: (H.favor[x] || {})[h.id] || 0 }); return out; }
function phHeirNow(h) { const O = phHeirOptions(h); if (h.heirSel && O.some(o => o.k === h.heirSel)) return O.find(o => o.k === h.heirSel); if (h.heir && O.some(o => o.k === h.heir)) return O.find(o => o.k === h.heir);
  const kids = O.filter(o => o.k.startsWith('kid:')).sort((a, b) => b.a - a.a); if (kids.length) return kids[0]; const sp = O.find(o => /\(cônjuge\)$/.test(o.n)); if (sp) return sp; return O.filter(o => o.f != null).sort((a, b) => b.f - a.f)[0] || null; }

/* ---- casa parada: sem o lorde, sem renda ---- */
if (typeof phDaily === 'function') { const _pdL2 = phDaily; phDaily = function () { const R = phRec(), skip = R.l.filter(h => (h.seen || 0) < estDay() - 1), keep = R.l; R.l = R.l.filter(h => !skip.includes(h)); try { _pdL2(); } finally { R.l = keep; } }; }

/* ---- mensagens no criado da casa (phNpcMsg) ---- */
if (typeof phNpcMsg === 'function') { const _pnL2 = phNpcMsg; phNpcMsg = function (p, n, m) { const h = PH_BY[n.house]; if (!h || dist(n.x, n.y, p.x, p.y) > 3) return _pnL2(p, n, m); const own = h.owner === estOwner(p);
  if (m.a === 'vtnew' && own) { vtCreate(p, h, m); return phHouseSend(p, n); }
  if (m.a === 'vtdel' && own) { const L = vtList(h.id), i = L.findIndex(t => t.id === m.tid); if (i >= 0 && !L[i].taker) { const t = L.splice(i, 1)[0]; if (t.gold) { const A = bankLoad().acc[h.owner] || (bankLoad().acc[h.owner] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += t.gold; bankSave(); } tell(p, 'Tarefa retirada' + (t.gold ? ' (o ouro voltou para o banco).' : '.')); estateSave(); } return phHouseSend(p, n); }
  if (m.a === 'vttake') { vtTake(p, h, m); return phHouseSend(p, n); }
  if (m.a === 'vtgive') { vtDeliver(p, h); return phHouseSend(p, n); }
  if (m.a === 'heir2' && own) { const O = phHeirOptions(h), o = O.find(x => x.k === m.k); h.heirSel = o ? o.k : null; h.heir = o && !o.k.startsWith('kid:') && o.k !== 'sp' ? o.k : null; if (typeof rkHouse === 'function' && rkHouse() && rkHouse().id === h.id) rkRec().heir = h.heir; tell(p, o ? 'Herdeiro da ' + h.n + ': ' + o.n.replace(/ \(.*$/, '') + '.' : 'Herdeiro: o jogo escolhe (filho mais velho adulto, cônjuge ou vassalo de mais favor).'); estateSave(); return phHouseSend(p, n); }
  return _pnL2(p, n, m); }; }
if (typeof phHouseSend === 'function') { const _phsL2 = phHouseSend; phHouseSend = function (p, n) { _phsL2(p, n); try { const h = PH_BY[n.house], k = estOwner(p), own = h.owner === k, M = vtMine(k), hn = phHeirNow(h);
  Net.toOne(p.id, { t: 'phhouse2', id: n.id, own: own ? 1 : 0, vow: hRec().vow[k] === h.id ? 1 : 0, tasks: vtList(h.id).map(t => Object.assign(vtPub(t), { mine: t.taker === k ? 1 : 0 })), busy: M ? 1 : 0, mineDeliver: M && M.hid === h.id && M.t.k === 'deliver' ? 1 : 0,
    heirOpts: own ? phHeirOptions(h).map(o => ({ k: o.k, n: o.n })) : [], heirNow: hn ? hn.n.replace(/ \(.*$/, '') : null, heirSel: h.heirSel || h.heir || null, max: L2.taskMax }); } catch (e) { console.warn('casa2', e); } }; }
function fhMsg(p, m) { if (m.a === 'fhask') { fhAsk(p, m); return true; } if (m.a === 'fhans') { fhKingAnswer(p, m); return true; } return false; }
if (typeof phMsg === 'function') { const _pmL3 = phMsg; phMsg = function (p, m) { if (m && (m.a === 'fhask' || m.a === 'fhans')) { if (S.estate) fhMsg(p, m); return; } return _pmL3(p, m); }; }
function l2Tick(now) { if (!S.estate || now - (S.l2T || 0) < 1000) return; const dt = Math.min(2, (now - (S.l2T || now)) / 1000) || 1; S.l2T = now;
  if (!S.l2Init) { S.l2Init = 1; fhApply(fhPublic()); }
  for (const h of phRec().l) if (Object.values(S.players).some(o => estOwner(o) === h.owner)) h.seen = estDay();
  for (const hid of Object.keys(fhRec().h)) for (const n of Object.values(S.npcs)) if (n.house === hid && n.court === 'house') visGone(n);
  for (const hid of Object.keys(fhRec().noHeir)) { if (fhIs(hid)) { delete fhRec().noHeir[hid]; continue; } if (!fhNoKids(hid) && typeof lnTakeHeir === 'function') { const h = HOUSE_BY[hid]; if (lnTakeHeir(h)) { delete fhRec().noHeir[hid]; hNews(h.heir + ' é o novo herdeiro da ' + h.n + '.'); estateSave(); } } }
  vtTick(dt); }
if (typeof housesTick === 'function') { const _htL2 = housesTick; housesTick = function (now) { _htL2(now); l2Tick(now); }; }
if (typeof empWelcome === 'function') { const _ewL2 = empWelcome; empWelcome = function (to) { _ewL2(to); try { if (S.estate && Object.keys(fhRec().h).length) Net.toOne(to, fhPublic()); } catch (e) { } }; }

/* ---- os dois lados: casarão dado vira imóvel do jogador ---- */
function fhApply(m) { if (typeof G !== 'undefined') G.fallen = m.l; for (const hid of Object.keys(m.l || {})) { const f = m.l[hid]; if (f.bi < 0) continue; const b = BUILDINGS[f.bi], pid = 'm' + f.bi; b.fallen = f.why;
  if (f.to && !PROPS_BY[pid]) { const P = { bi: f.bi, area: b.w * b.h, w: b.w, h: b.h, floors: b.floors || 1, district: 'Bairro Nobre', id: pid, kind: 'house', manor: true, name: 'Casarão da antiga ' + f.n, rent: 60, loc: 1.5, locName: 'bairro nobre' }; P.week = P.rent * 7; P.buy = P.rent * 60; PROPS.push(P); PROPS_BY[pid] = P; } } }

// ---------------- CLIENTE ----------------
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peL2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'fallen') { fhApply(m); return true; }
  if (m.t === 'fhreq') { const d = velPanel('Pedido ao rei', '<div class="est-cost"><b>' + m.n + '</b> pede o casarão da antiga ' + m.house + '.</div><div class="tq-btns"><button class="est-btn" data-y>Dar o casarão</button><button class="est-btn ghost" data-n>Negar</button></div>'); d.querySelector('[data-y]').onclick = () => { d.remove(); Net.send({ t: 'funda', a: 'fhans', yes: 1 }); }; d.querySelector('[data-n]').onclick = () => { d.remove(); Net.send({ t: 'funda', a: 'fhans', yes: 0 }); }; return true; }
  if (m.t === 'phhouse2') { const d = document.getElementById('tequip'); if (!d) return true; const box = document.createElement('div'), send = o => Net.send(Object.assign({ t: 'house', id: m.id }, o));
    let html = '<div class="vel-sub">Tarefas para os vassalos (' + m.tasks.length + ' de ' + m.max + ')</div><div class="vel-secs">' + (m.tasks.length ? m.tasks.map(t => '<div class="vel-sec"><span>' + t.txt + '<br><small>' + [t.gold ? t.gold + ' de ouro' : '', t.favor ? '+' + t.favor + ' de favor' : ''].filter(Boolean).join(' e ') + (t.taker ? ' · com ' + t.taker + (t.prog ? ' (' + t.prog + ')' : '') : '') + '</small></span>' + (m.own ? (t.taker ? '' : '<button class="est-btn ghost" data-del="' + t.id + '">Retirar</button>') : (m.vow && !t.taker && !m.busy ? '<button class="est-btn" data-take="' + t.id + '">Aceitar</button>' : t.mine && m.mineDeliver ? '<button class="est-btn" data-give>Entregar</button>' : '')) + '</div>').join('') : '<div class="est-cost"><small>Nenhuma tarefa aberta.</small></div>') + '</div>';
    if (m.own) { html += '<div class="vel-sub">Criar tarefa</div><div class="vel-amt" style="grid-template-columns:repeat(2,1fr)"><select data-k class="est-btn ghost"><option value="hunt">Caçar</option><option value="deliver">Entregar itens</option><option value="guard">Montar guarda no casarão</option><option value="escort">Acompanhar o lorde</option></select><select data-i class="est-btn ghost"></select><select data-n class="est-btn ghost"></select><select data-r class="est-btn ghost"><option value="1|0">50 de ouro</option><option value="2|0">150 de ouro</option><option value="3|0">300 de ouro</option><option value="0|1">+5 de favor</option><option value="0|2">+10 de favor</option><option value="0|3">+20 de favor</option><option value="1|1">50 de ouro e +5 de favor</option><option value="2|2">150 de ouro e +10 de favor</option></select></div><div class="tq-btns"><button class="est-btn" data-new>Criar tarefa</button></div>';
      html += '<div class="vel-sub">Herdeiro da casa</div><div class="est-cost"><small>Agora: <b>' + (m.heirNow || 'ninguém') + '</b>' + (m.heirSel ? ' (escolhido por você)' : ' (sem escolha: filho mais velho adulto, cônjuge ou vassalo de mais favor)') + '</small></div><div class="vel-vs">' + m.heirOpts.map(o => '<button class="est-btn ghost" data-h2="' + o.k + '"' + (o.k === m.heirSel ? ' style="outline:2px solid #c9a24a"' : '') + '>' + o.n + '</button>').join('') + (m.heirSel ? '<button class="est-btn ghost" data-h2="">Deixar o jogo escolher</button>' : '') + '</div>'; }
    box.innerHTML = html; d.appendChild(box); d.querySelectorAll('[data-heir]').forEach(b => b.closest('.est-cost, div') && b.remove());
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => send({ a: 'vtdel', tid: +b.dataset.del })); box.querySelectorAll('[data-take]').forEach(b => b.onclick = () => send({ a: 'vttake', tid: +b.dataset.take })); const g = box.querySelector('[data-give]'); if (g) g.onclick = () => send({ a: 'vtgive' });
    box.querySelectorAll('[data-h2]').forEach(b => b.onclick = () => send({ a: 'heir2', k: b.dataset.h2 }));
    const sk = box.querySelector('[data-k]'), si = box.querySelector('[data-i]'), sn = box.querySelector('[data-n]');
    if (sk) { const fill = () => { const k = sk.value; si.innerHTML = k === 'hunt' ? L2.mons.map((x, i) => '<option value="' + i + '">' + x[1] + '</option>').join('') : k === 'deliver' ? L2.items.map((x, i) => '<option value="' + i + '">' + ((typeof LOOT !== 'undefined' && LOOT[x]) ? LOOT[x].name : x) + '</option>').join('') : k === 'guard' ? [8, 12, 16, 20].map((x, i) => '<option value="' + i + '">das ' + x + 'h às ' + (x + L2.guardH) + 'h</option>').join('') : '<option value="0">perto do lorde</option>'; sn.innerHTML = k === 'hunt' ? '<option value="0">3</option><option value="1" selected>5</option><option value="2">8</option>' : k === 'deliver' ? '<option value="0">3</option><option value="1" selected>5</option><option value="2">10</option>' : '<option value="0">—</option>'; }; sk.onchange = fill; fill();
      box.querySelector('[data-new]').onclick = () => { const [gg, ff] = box.querySelector('[data-r]').value.split('|').map(Number); send({ a: 'vtnew', k: sk.value, i: +si.value, n: +sn.value, g: gg, f: ff }); }; }
    return true; }
  const r = _peL2(m, now);
  if (m.t === 'courtmenu' && (m.id === 'k_king' || m.id === 'k_hand') && G.fallen) { const d = document.getElementById('courtmenu'), vac = Object.keys(G.fallen).filter(h => !G.fallen[h].to && G.fallen[h].bi >= 0); if (d && vac.length) for (const hid of vac) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">🏚</span><span><b>Pedir o casarão da antiga ' + G.fallen[hid].n + '</b><br><small>Para um Lorde com favor da coroa ' + L2.grantFavor + ', na audiência.</small></span>'; bt.onclick = () => { d.remove(); Net.send({ t: 'funda', a: 'fhask', h: hid }); }; d.appendChild(bt); } }
  return r; }; }

/* ---- a coroa passa a um filho ou ao cônjuge NPC: ele vira rei e o lorde jogador governa por ele ---- */
function rkNpcHeir(h) { const hn = phHeirNow(h); return hn && (hn.k.startsWith('kid:') || hn.k === 'sp') ? hn : null; }
if (typeof rkEnd === 'function') { const _reL2 = rkEnd; rkEnd = function (why) { const h = rkHouse(); if (!h || !S.estate) return _reL2(why); const R = rkRec(), M = typeof mrOf === 'function' ? mrOf(h.owner) : null, old = sucKingName();
  if (R.npcKing && M && !/cerco/.test(why || '')) { const nk = R.npcKing; if (nk.src === 'sp') M.dead = 1; else { const kid = M.kids[+nk.src.split(':')[1]]; if (kid) kid.dead = 1; } }   /* o rei NPC morreu (idade, veneno, punhal) */
  R.npcKing = null; const hn = rkNpcHeir(h);
  if (!hn || !M) return _reL2(why);
  const src = hn.k, kid = src === 'sp' ? null : M.kids[+src.split(':')[1]], name = kid ? kid.n : mr2SpouseN(M), kind = kid ? 'mr_young' : M.who.kind, fem = kid ? kid.g === 'f' : /^(Lady|Princesa|Rainha)/.test(M.who.n) || /princess|_f$/.test(kind);
  R.npcKing = { n: name, kind, src, fem: fem ? 1 : 0 }; const U = sucRec(); U.stage = 'done'; sucApplyKing('h:' + h.id); U.kage0 = kid ? ageOf(kid.a0) : 40; U.since = estDay(); rkApplyNpcKing();
  const lordN = h.lord, nk = sucKingName(); sys('👑 O reinado do ' + old + ' terminou (' + why + '). ' + nk + ', da ' + h.n + ', sobe ao trono; ' + lordN + ' governa em nome ' + (fem ? 'dela' : 'dele') + '.'); hNews(nk + ' é o novo monarca; ' + lordN + ' governa por ' + (fem ? 'ela' : 'ele') + ' (' + why + ').');
  const op = Object.values(S.players).find(o => estOwner(o) === h.owner); if (op) tell(op, nk + ' é o novo monarca, e você governa em nome ' + (fem ? 'dela' : 'dele') + ': continue indo ao trono das ' + RK.hours[0] + 'h às ' + RK.hours[1] + 'h.'); estateSave(); }; }
function rkApplyNpcKing() { const R = rkRec(), def = COURT.find(d => d.id === 'k_king'); if (!R.npcKing || !def) return; def.kind = R.npcKing.kind; def.name = sucKingName(); const n = S.npcs.k_king; if (n && n.kind !== def.kind) visGone(n); }
if (typeof sucKingName === 'function') { const _skL2 = sucKingName; sucKingName = function () { try { const U = sucRec(), R = crownRec().rk; if (R && R.npcKing && U.king && U.king.startsWith('h:') && PH_BY[U.king.slice(2)]) return (R.npcKing.fem ? 'Rainha ' : 'Rei ') + R.npcKing.n.replace(/^(Sor|Lady|Lorde) /, ''); } catch (e) { } return _skL2(); }; }
if (typeof sucApplyKing === 'function') { const _saL2 = sucApplyKing; sucApplyKing = function (k) { const R = crownRec().rk; if (R && R.npcKing && !(k.startsWith('h:') && PH_BY[k.slice(2)])) R.npcKing = null; _saL2(k); try { rkApplyNpcKing(); } catch (e) { } }; }
/* o rei NPC da casa do jogador aparece no trono (com rei jogador, ninguém aparece: é o próprio jogador) */
if (typeof courtSpawn === 'function') { const _csL2 = courtSpawn; courtSpawn = function (def) { try { if (def.id === 'k_king' && S.estate && crownRec().rk && crownRec().rk.npcKing && typeof rkHouse === 'function' && rkHouse()) { rkApplyNpcKing(); const rh = rkHouse; rkHouse = () => null; try { return _csL2(def); } finally { rkHouse = rh; } } } catch (e) { } return _csL2(def); }; }
