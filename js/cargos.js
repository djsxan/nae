// ============================================================
//  PENA E CARGOS (parte G, etapa 2b): quem matou alguém da realeza e foi descoberto vai à guilhotina,
//  a não ser que o novo rei tenha se beneficiado: aí ganha perdão e um cargo na corte (o vago ou o do
//  conselheiro menos leal). Cada cargo tem um poder: Mão (taxa das audiências nos dias ruins do rei),
//  Moeda (renda diária), Meistre (o consultório paga a ele) e Comandante (solta presos).
//  Ninguém além do rei senta no trono.
// ============================================================
const CG = { handFee: 20, handFavor: 2, coinDay: 100, consult: 30 };
const CG_ROLES = { hand: { id: 'k_hand', n: 'Mão do Rei', loyal: 20, stand: ['Escrivão da Mão', 'k_herald'] }, coin: { id: 'k_coin', n: 'Mestre da Moeda', loyal: 45, stand: ['Escrivão do Tesouro', 'k_herald'] }, cmd: { id: 'k_cmd', n: 'Comandante da Guarda Real', loyal: 60, stand: ['Tenente da Guarda Real', 'k_guard'] }, maester: { id: 'k_maester', n: 'Meistre', loyal: 75, stand: ['Aprendiz do Meistre', 'k_page'] } };

// ---------------- SERVIDOR ----------------
function cgRec() { const C = crownRec(); C.office = C.office || {}; C.crimes = C.crimes || []; return C; }
function cgHolder(role) { return cgRec().office[role] || null; }
function cgRoleOf(key) { const O = cgRec().office; return Object.keys(O).find(r => O[r] === key) || null; }
function cgPlayer(key) { return Object.values(S.players).find(p => estOwner(p) === key) || null; }
/* o NPC que deixou o cargo vira um ajudante (escrivão, tenente, aprendiz), que segue fazendo o trabalho em nome do jogador */
function cgApplyStand() { const O = cgRec().office; for (const r in CG_ROLES) { const R = CG_ROLES[r], def = COURT.find(d => d.id === R.id); if (!def) continue; if (O[r]) { if (def.name !== R.stand[0]) { def.name = R.stand[0]; def.kind = R.stand[1]; const n = S.npcs[R.id]; if (n) visGone(n); } } } }
function cgGrant(p) { const C = cgRec(), key = estOwner(p); if (cgRoleOf(key)) return null; const free = Object.keys(CG_ROLES).filter(r => !C.office[r]); if (!free.length) return null;
  const r = free.sort((a, b) => CG_ROLES[a].loyal - CG_ROLES[b].loyal)[0]; C.office[r] = key; cgApplyStand(); estateSave(); return r; }
/* o crime fica registrado: se o próximo rei se beneficiar, ele perdoa */
function cgCrime(payer, victim) { if (!payer) return; const U = sucRec(), C = cgRec(); let ben = null; if (victim === 'king') ben = U.next || sucLine()[0]; else if (victim === 'alaric' || victim === 'corwyn') ben = sucLine()[0]; if (ben) C.crimes.push({ payer, victim, ben, day: estDay() }); estateSave(); }
function cgPardon(key) { const p = cgPlayer(key); if (p) { p.wanted = 0; p.crimes = []; p.murderer = false; p.condemned && condemn(p, false); Net.toAll({ t: 'wanted', id: p.id, ms: 0 }); } const R = trRec(); if (R.later) delete R.later[key]; }
if (typeof sucApplyKing === 'function') { const _saC = sucApplyKing; sucApplyKing = function (k) { _saC(k); const C = cgRec();
  for (let i = C.crimes.length - 1; i >= 0; i--) { const c = C.crimes[i]; if (c.ben !== k) continue; C.crimes.splice(i, 1); const p = cgPlayer(c.payer), wanted = (p && (p.murderer || p.wanted > now_())) || (trRec().later && trRec().later[c.payer]); if (!wanted) continue;
    cgPardon(c.payer); const r = p ? cgGrant(p) : null; const nm = p ? p.name : c.payer.split('|')[0];
    hNews('O ' + sucKingName() + ' perdoou ' + nm + (r ? ' e o nomeou ' + CG_ROLES[r].n : '') + '. Ninguém ousa perguntar por quê.'); if (p) tell(p, 'O ' + sucKingName() + ' sabe o que você fez e se beneficiou disso: perdão total' + (r ? ' e o cargo de ' + CG_ROLES[r].n + '.' : '.') + (r ? ' ' + cgPowerTxt(r) : '')); }
  estateSave(); }; }
function cgPowerTxt(r) { return r === 'hand' ? 'Nos dias em que o rei não recebe, o escrivão atende as audiências em seu nome: estando no salão do trono, você ganha ' + CG.handFee + ' de ouro e ' + CG.handFavor + ' de favor por audiência.' : r === 'coin' ? 'Você recebe ' + CG.coinDay + ' de ouro por dia como parte dos impostos.' : r === 'maester' ? 'Quem se trata no consultório do meistre paga ' + CG.consult + ' de ouro a você; você se trata de graça.' : 'Você pode mandar soltar qualquer preso (fale com o carcereiro Grum).'; }
/* registra os crimes das tramas e da lâmina */
if (typeof trKill === 'function') { const _tkC = trKill; trKill = function (k, cause) { const r = _tkC(k, cause), payer = S.cgDue && S.cgDue[k]; if (payer) cgCrime(payer, k); return r; }; }
if (typeof trResolve === 'function') { const _trC = trResolve; trResolve = function (now) { const R = trRec(); S.cgDue = {}; for (const e of R.pend) if (now >= e.at && e.payer && (e.k === 'poison' || e.k === 'hit')) S.cgDue[e.target] = e.payer; try { _trC(now); } finally { S.cgDue = null; } }; }
if (typeof npcDie === 'function') { const _ndC = npcDie; npcDie = function (n, p) { const U = S.estate && sucRec(), was = U && p ? (n.id === 'k_king' ? 'king' : n.id === 'k_prince' && U.alive.alaric && U.king !== 'alaric' ? 'alaric' : n.id === 'k_corwyn' ? 'corwyn' : null) : null; _ndC(n, p); if (was) cgCrime(estOwner(p), was); }; }
/* ninguém além do rei senta no trono: nos dias ruins, quem preside fica de pé ao lado */
if (typeof courtPost === 'function') { const _cpC = courtPost; courtPost = function (def, now) { const P = _cpC(def, now); if (def.id !== 'k_king' && P && P[1] === 'throne') return def.day && def.day[1] !== 'throne' ? def.day : [0, 7.4, 2.4]; return P; }; }
/* poderes: taxa da Mão, consultório do Meistre, soltura pelo Comandante */
if (typeof courtMsg === 'function') { const _cmC = courtMsg; courtMsg = function (p, m) { const n = S.npcs[m.id]; if (!n || !S.estate) return _cmC(p, m); const C = cgRec(), key = estOwner(p);
  if (n.court === 'maester' && m.a === 'heal' && C.office.maester) { const holder = C.office.maester; if (holder === key) { p.gold = (p.gold || 0) + 30; _cmC(p, m); tell(p, 'Como Meistre, você se trata de graça.'); return; } const g0 = p.gold; _cmC(p, m); if (p.gold < g0) { const A = bankLoad().acc[holder] || (bankLoad().acc[holder] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += CG.consult; bankSave(); const hp = cgPlayer(holder); if (hp) tell(hp, p.name + ' se tratou no consultório: +' + CG.consult + ' de ouro no seu banco.'); } return; }
  if ((n.court === 'hand' || n.court === 'king') && S.audCall && S.audCall.id === p.id && crownRec().bad && C.office.hand && ['con', 'title', 'pardon', 'free', 'turnin'].includes(m.a) && !S.audCall.cgPaid) { const before = JSON.stringify([p.gold, (C.con || {})[key], (C.title || {})[key], p.wanted]); _cmC(p, m); const after = JSON.stringify([p.gold, (C.con || {})[key], (C.title || {})[key], p.wanted]);
    if (before !== after && S.audCall) { S.audCall.cgPaid = 1; const hp = cgPlayer(C.office.hand), cb = castleB(); if (hp && hp !== p && !(hp.fl || 0) && WORLD.bld[tileAt(hp.x, hp.y)] === BUILDINGS.indexOf(cb)) { hp.gold = (hp.gold || 0) + CG.handFee; sendStat(hp); crownFavor(hp, CG.handFavor, 'audiência atendida em seu nome'); tell(hp, 'Audiência de ' + p.name + ' atendida em seu nome: +' + CG.handFee + ' de ouro.'); } } return; }
  return _cmC(p, m); }; }
function cgMsg(p, m) { if (!S.estate || p.downed) return; const key = estOwner(p);
  if (m.a === 'release') { if (cgRoleOf(key) !== 'cmd') return; const gr = S.npcs.k_jailer; if (!gr || dist(gr.x, gr.y, p.x, p.y) > 3.5) return; const q = S.players[m.who]; if (!q || q === p) return; if (q.kjail) kjailFree(q, 'O Comandante ' + p.name + ' mandou soltar você.'); else if (q.jailUntil > now_()) releasePlayer(q, 'O Comandante ' + p.name + ' mandou soltar você.'); else return; tell(p, 'Você mandou soltar ' + q.name + '.'); empSay(gr, 'Ordens são ordens, Comandante.'); return; }
  if (m.a === 'jailed') { if (cgRoleOf(key) !== 'cmd') return; const L = Object.values(S.players).filter(q => q !== p && (q.kjail || q.jailUntil > now_())).map(q => [q.id, q.name]); Net.toOne(p.id, { t: 'cgjailed', l: L }); return; } }
function cgTick(now) { if (!S.estate || !castleB()) return; if (now - (S.cgT || 0) < 2000) return; S.cgT = now; const C = cgRec(), day = estDay();
  if (!S.cgInit) { S.cgInit = 1; cgApplyStand(); }
  if (C.cgDay !== day) { C.cgDay = day; if (C.office.coin) { const A = bankLoad().acc[C.office.coin] || (bankLoad().acc[C.office.coin] = { g: 0, loan: 0, due: 0, wk: day }); A.g += CG.coinDay; bankSave(); const hp = cgPlayer(C.office.coin); if (hp) tell(hp, 'Parte dos impostos do dia: +' + CG.coinDay + ' de ouro no seu banco.'); } estateSave(); }
  for (const p of Object.values(S.players)) { const r = cgRoleOf(estOwner(p)); if (r && p.cgRole !== r) { p.cgRole = r; Net.toOne(p.id, { t: 'cgrole', r, n: CG_ROLES[r].n }); } } }
if (typeof housesTick === 'function') { const _htC2 = housesTick; housesTick = function (now) { _htC2(now); cgTick(now); }; }

// ---------------- CLIENTE ----------------
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peC = progEvent; progEvent = function (m, now) {
  if (m.t === 'cgrole') { G.cgRole = m.r; showToast('Seu cargo na corte: ' + m.n); return true; }
  if (m.t === 'cgjailed') { const d = document.getElementById('courtmenu'); if (d) for (const [id, nm] of m.l) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">🔓</span><span><b>Mandar soltar ' + nm + '</b><br><small>Ordem do Comandante, sem fiança.</small></span>'; bt.onclick = () => { bt.remove(); Net.send({ t: 'cargo', a: 'release', who: id }); }; d.appendChild(bt); } return true; }
  const r = _peC(m, now);
  if (m.t === 'courtmenu' && m.id === 'k_jailer' && G.cgRole === 'cmd') Net.send({ t: 'cargo', a: 'jailed' });
  if (m.t === 'courtmenu' && G.cgRole) { const d = document.getElementById('courtmenu'), hd = d && d.querySelector('div'); if (hd && !d.querySelector('.cg-tag')) { const s = document.createElement('div'); s.className = 'cg-tag'; s.style.cssText = 'padding:4px 14px 0;font-size:13px;color:#f1cf6a'; s.textContent = 'Seu cargo: ' + CG_ROLES[G.cgRole].n; d.insertBefore(s, d.children[1] || null); } }
  return r; }; }
