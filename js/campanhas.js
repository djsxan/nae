// ============================================================
//  CAMPANHAS DOS MESTRES (parte B): a Dama Ysolde quer ser nomeada Dama; o Mestre Corvin quer
//  escolher o próximo rei. Cada campanha começa sozinha (dia 3 a 6 do reino, sem aviso), dura 5 dias,
//  tem 1 missão por dia para o reino todo (quem cumprir recebe) e termina com o rei decidindo por sorteio.
// ============================================================
const CP = { start: [3, 6], gap: [3, 6], days: 5, auto: 0.4, base: 0.1, per: 0.08, max: 0.9, payY: [40, 60, 80, 100, 150], payC: [20, 30, 40, 50, 75], favC: 5, accomplice: 0.1, accMax: 0.5,
  listenS: 20, listenR: 3, drinks: 3, drinkPrice: 15, deskMs: 3000, safeMs: 4000, followSee: 3, followFar: 12, followSeenMs: 2000, closedDays: 3, damaPrestige: -10, damaSupport: -8, candPrestige: -8, cvFound: 0.25 };
const CP_MIS = { thermae: { n: 'Ouvir o lorde nas Termas', h: [16, 18] }, club: { n: 'Embebedar um conselheiro no Clube', h: [19, 21] }, office: { n: 'Roubar uma carta do escritório', h: [0, 24] }, letter: { n: 'Seguir o criado no recado da noite', h: [20, 21] }, safe: { n: 'Plantar uma prova no cofre', h: [0, 24] } };
const CP_ORDER = { y: ['thermae', 'club', 'office', 'letter', 'safe'], c: ['thermae', 'office', 'club', 'letter', 'safe'] };
const CP_COUNS = [['k_hand', 'a Mão do Rei'], ['k_coin', 'o Mestre da Moeda'], ['k_maester', 'o Meistre'], ['k_cmd', 'o Comandante da Guarda Real']];
const CP_DESK = [2, 5.5], CP_SAFE = [6.5, 7.5], CP_CLUBSPOT = [5.5, 3.5];

// ---------------- SERVIDOR ----------------
function cpRec() { const E = S.estate; if (!E.camp) { const L = HOUSES.map(h => h.id); for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } E.camp = { born: estDay(), line: L, y: null, c: null, dama: null, whisper: {}, lastFree: {}, pend: {}, acc: {} }; } return E.camp; }
const cpRand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const cpKey = p => estOwner(p);
function cpVoiceName(v) { if (v === 'king') return 'o Rei Edric'; if (v.startsWith('l:')) return (HOUSE_BY[v.slice(2)] || {}).lord || v; const c = CP_COUNS.find(x => x[0] === 'k_' + v.slice(2)); return c ? c[1] : v; }
const cpDe = n => /^a /.test(n) ? 'da ' + n.slice(2) : /^o /.test(n) ? 'do ' + n.slice(2) : 'de ' + n;   /* a voz da Mão do Rei, do Rei Edric, de Lorde Bram */
const cpLow = t => t.charAt(0).toLowerCase() + t.slice(1);
function cpVoices() { return HOUSES.map(h => 'l:' + h.id).concat(['c:hand', 'c:coin', 'c:maester', 'c:cmd', 'king']); }
function cpCounselor(day) { let i = Math.floor(csHash(day * 11 + 3, 77) * CP_COUNS.length); if (CP_COUNS[i][0] === 'k_hand' && typeof crownRec === 'function' && S.estate && crownRec().bad) i = 1 + Math.floor(csHash(day, 5) * 3); return CP_COUNS[i][0]; }   /* a Mão preside nos dias ruins do rei: vai outro */   /* quem vai ao Clube hoje */
function cpSecOf(p, hid, how) { if (typeof secGive !== 'function') return; const L = secList(p), ks = ['plan', 'gold', 'power', 'crown', 'rel'].filter(k => !L.some(s => s.h === hid && s.k === k)); if (ks.length) secGive(p, hid, ks[Math.floor(Math.random() * ks.length)], how); }   /* um segredo da casa alvo */
function cpServ(hid) { return Object.values(S.npcs).find(n => n.court === 'house' && n.house === hid && n.hrole === 'serv' && !n.dead); }
function cpLord(hid) { return Object.values(S.npcs).find(n => n.court === 'house' && n.house === hid && n.hrole === 'lord' && !n.dead); }
function cpStart(m, day) { const R = cpRec(), C = R[m]; C.st = 'run'; C.d0 = day; C.pts = 0; C.by = {}; C.last = null; C.mis = null; C.rolled = day - 1;
  if (m === 'y') { C.target = HOUSES.slice().sort((a, b) => hRec().st[b.id].prestige - hRec().st[a.id].prestige)[0].id; const V = cpVoices(); for (let i = V.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [V[i], V[j]] = [V[j], V[i]]; } C.voices = V.slice(0, 5); C.bent = []; C.closed = []; }
  else { C.target = R.line[0]; const o = R.line.filter(id => id !== C.target); C.cand = o[Math.floor(Math.random() * o.length)]; } }
function cpMission(m, C, day) { const i = day - C.d0; if (i < 0 || i >= CP.days) return null; if (C.mis && C.mis.day === day) return C.mis;
  return (C.mis = { day, i, k: CP_ORDER[m][i], voice: m === 'y' ? C.voices[i] : null, acc: [], st: 'open', by: null }); }
function cpPay(m, i) { return (m === 'y' ? CP.payY : CP.payC)[i]; }
function cpTellAcc(C, t) { for (const p of Object.values(S.players)) if (C.mis && C.mis.acc.includes(cpKey(p))) tell(p, t); }
function cpMasterName(m) { const R = cpRec(); return m === 'y' ? 'a Dama Ysolde' : R.cvGone ? 'a Mão do Rei' : 'o Mestre Corvin'; }
function cpDone(p, m, extra) { const R = cpRec(), C = R[m]; if (!C || C.st !== 'run' || !C.mis || C.mis.st !== 'open') return; const M = C.mis, k = cpKey(p); if (!M.acc.includes(k)) return;
  M.st = 'done'; M.by = k; C.pts++; if (m === 'y') C.bent.push(M.voice); C.by[k] = (C.by[k] || 0) + 1; C.last = k; const g = cpPay(m, M.i); p.gold = (p.gold || 0) + g;
  let t = 'Missão cumprida para ' + cpMasterName(m) + ': ' + cpLow(CP_MIS[M.k].n) + '. +' + g + ' de ouro' + (extra ? '. ' + extra : '') + '.';
  if (m === 'y') t += ' A voz ' + cpDe(cpVoiceName(M.voice)) + ' está dobrada.';
  if (m === 'c' && typeof crownFavor === 'function') crownFavor(p, CP.favC, 'trabalho discreto para a coroa');
  if (m === 'y' && (M.k === 'office' || M.k === 'safe')) cpSecOf(p, C.target, 'achado no casarão');
  tell(p, t); cpCross(p, m, C);
  for (const q of Object.values(S.players)) if (q !== p && M.acc.includes(cpKey(q))) tell(q, 'Outra pessoa cumpriu a missão de hoje para ' + cpMasterName(m) + '.'); sendStat(p); cpSendJ(); estateSave(); }
/* trair um mestre: a missão para um atingiu a casa que o outro favorece */
const CP_BETRAY = 0.3, CP_RECONCILE = 2000;
function cpCut(m, k) { const R = cpRec(); R.cut = R.cut || { y: {}, c: {} }; return !!R.cut[m][k]; }
function cpCross(p, m, C) { const R = cpRec(), k = cpKey(p), o = m === 'y' ? 'c' : 'y', O = R[o]; R.worked = R.worked || { y: {}, c: {} }; R.worked[m][k] = 1;
  if (!R.worked[o][k] || cpCut(o, k)) return; let cross = false;
  if (m === 'y' && O && O.st === 'run' && O.cand === C.target) cross = true;
  if (m === 'c' && R.y && R.y.st === 'run' && (R.y.bent || []).includes('l:' + C.target)) cross = true;
  if (!cross || Math.random() >= CP_BETRAY) return; R.cut[o][k] = 1; const who = o === 'y' ? 'A Dama Ysolde' : 'O Mestre Corvin', hid = C.target, h = HOUSE_BY[hid];
  if (Math.random() < 0.5) { hFavor(p, hid, -15, 'alguém contou o que você fez contra a casa'); secPend().push({ o: k, h: hid, type: 'thugs', at: now_() + Math.random() * SEC_HIT_DAYS * ESTATE_DAY_MS, n: secThugN(hid), kill: 1 }); tell(p, who + ' descobriu que você trabalhou contra ' + (o === 'y' ? 'ela' : 'ele') + ' e cortou relações. Contou tudo à ' + h.n + ', que agora quer a sua cabeça.'); }
  else { secCrime(p, 'spy', 'espionagem', 150000); tell(p, who + ' descobriu que você trabalhou contra ' + (o === 'y' ? 'ela' : 'ele') + ', cortou relações e te denunciou à Guarda por espionagem.'); }
  estateSave(); }
function cpFail(m, why) { const R = cpRec(), C = R[m]; if (!C || !C.mis || C.mis.st !== 'open') return; C.mis.st = 'fail'; if (m === 'y') C.closed.push(C.mis.voice); cpTellAcc(C, 'A missão de hoje para ' + cpMasterName(m) + ' falhou: ' + why + '. Esse apoio está perdido.'); cpSendJ(); estateSave(); }
/* fim da campanha: o rei decide por sorteio */
function cpResolve(m, day) { const R = cpRec(), C = R[m], ch = Math.min(CP.max, CP.base + CP.per * C.pts), win = Math.random() < ch; C.st = 'over'; C.won = win; C.chance = ch;
  const accomplices = () => { for (const k in C.by) { const pr = Math.min(CP.accMax, CP.accomplice * C.by[k]); if (Math.random() < pr) R.pend[k] = 1; } };
  if (m === 'y') { const rv = HOUSE_BY[C.target];
    if (win) { R.ysDama = day; const st = hRec().st[C.target]; st.prestige = clampH(st.prestige + CP.damaPrestige, 0, 100); if (typeof infAdd === 'function') for (const pl of INF_PLACES) infAdd(C.target, pl.id, CP.damaSupport);
      const best = Object.keys(C.by).sort((a, b) => (C.by[b] - C.by[a]) || (b === C.last ? 1 : a === C.last ? -1 : 0))[0]; if (best) R.dama = best;
      hNews('O rei nomeou Ysolde Verane Dama da corte, com assento ao lado do trono. A ' + rv.n + ', que se opôs, sai menor.'); sys('Notícia: a antiga cortesã Ysolde Verane agora é Dama da corte. A ' + rv.n + ' perde prestígio e apoio do povo.');
      for (const p of Object.values(S.players)) if (cpKey(p) === best) tell(p, 'A Dama Ysolde lhe deve um pedido: vale o perdão total de uma condenação à guilhotina (e, quando existir, o apoio dela para você fundar uma casa).'); }
    else { const ban = C.pts >= 5 || Math.random() < 0.5; R.ysGone = day; R.velOpen = day + CP.closedDays; accomplices();
      hNews('Ysolde Verane foi presa e julgada por chantagear a corte: ' + (ban ? 'banida de Nae.' : 'condenada à guilhotina.')); sys('Notícia: a Dama Ysolde foi presa e ' + (ban ? 'banida da cidade.' : 'condenada à guilhotina.') + ' A Casa de Veludo fecha o comércio de segredos por ' + CP.closedDays + ' dias.'); } }
  else { const ch2 = HOUSE_BY[C.cand];
    if (win) { const i = R.line.indexOf(C.cand); if (i > 0) { [R.line[i - 1], R.line[i]] = [R.line[i], R.line[i - 1]]; } for (const k in C.by) R.whisper[k] = 1;
      hNews('Antigos registros da coroa revelam um parentesco esquecido: a ' + ch2.n + ' sobe na linha de sangue.');
      for (const p of Object.values(S.players)) if (C.by[cpKey(p)]) tell(p, 'O Mestre Corvin não esquece quem o ajudou: daqui em diante, um sussurro por dia é de graça para você.'); }
    else { const st = hRec().st[C.cand]; st.prestige = clampH(st.prestige + CP.candPrestige, 0, 100); hNews(ch2.heir + ' caiu em desgraça na corte; a ' + ch2.n + ' perde prestígio.');
      if (!R.cvGone && Math.random() < CP.cvFound) { R.cvGone = day; accomplices(); hNews('O rei descobriu as tramas do Mestre Corvin: ele foi julgado e preso. Lorde Osric Vane, a Mão do Rei, assume os sussurros.'); sys('Notícia: o Mestre Corvin foi descoberto e preso. A Mão do Rei assume os sussurros da corte.'); cpCorvinGone(); } } }
  R[m] = { st: 'wait', start: day + cpRand(CP.gap[0], CP.gap[1]) };   /* a próxima campanha */
  if (m === 'y') R.y.st = 'none';   /* a segunda campanha da Ysolde (fundar a sexta casa) ainda não existe */
  if (m === 'c' && R.cvGone) R.c.st = 'none';
  cpSendSt(); estateSave(); }
function cpCorvinGone() { const i = COURT.findIndex(d => d.id === 'k_whisper'); if (i >= 0) COURT.splice(i, 1); const n = S.npcs.k_whisper; if (n) visGone(n); }
function cpDaily(day) { const R = cpRec();
  for (const m of ['y', 'c']) { let C = R[m]; if (!C) C = R[m] = { st: 'wait', start: R.born + cpRand(CP.start[0], CP.start[1]) - 1 };
    if (m === 'c' && R.cvGone) continue;
    if (C.st === 'run') { for (let d = C.rolled + 1; d < day; d++) { if (d - C.d0 >= CP.days) break; if (C.mis && C.mis.day === d && C.mis.st === 'open' && C.mis.acc.length) cpFail(m, 'o dia acabou sem ela feita');
        if (Math.random() < CP.auto) { if (m === 'y') { const left = C.voices.filter(v => !C.bent.includes(v) && !C.closed.includes(v)).concat(cpVoices().filter(v => !C.voices.includes(v) && !C.bent.includes(v))); if (left.length) { C.bent.push(left[Math.floor(Math.random() * left.length)]); C.pts++; } } else C.pts++; } C.rolled = d; }
      if (day - C.d0 >= CP.days) { cpResolve(m, day); continue; } cpMission(m, C, day); }
    else if (C.st === 'wait' && day >= C.start) { cpStart(m, day); cpMission(m, R[m], day); } }
  if (R.ysGone && R.velOpen && day >= R.velOpen && !R.mirela) { R.mirela = day; hNews('Mirela, a anfitriã, assumiu a Casa de Veludo e o comércio de segredos.'); }
  cpSendSt(); estateSave(); }
/* o que o cliente precisa saber: estado dos mestres e a missão aceita (para dicas e Jornada) */
function cpState() { const R = cpRec(); return { t: 'campst', cvGone: !!R.cvGone, ysGone: !!R.ysGone, ysDama: !!R.ysDama, velClosed: !!(R.ysGone && !R.mirela), couns: cpCounselor(estDay()) }; }
function cpSendSt() { const j = JSON.stringify(cpState()); if (j !== S.cpStJ) { S.cpStJ = j; Net.toAll(JSON.parse(j)); } }
function cpJFor(p) { const R = cpRec(), k = cpKey(p), out = []; for (const m of ['y', 'c']) { const C = R[m]; if (!C || C.st !== 'run' || !C.mis || !C.mis.acc.includes(k)) continue; const M = C.mis, h = HOUSE_BY[C.target];
    out.push({ m, k: M.k, st: M.st, target: C.target, n: CP_MIS[M.k].n, h: CP_MIS[M.k].h, where: M.k === 'club' ? 'Clube do Cervo de Prata, com ' + (CP_COUNS.find(c => c[0] === cpCounselor(M.day)) || [0, ''])[1] : M.k === 'thermae' ? 'Termas de Aurora, perto de ' + h.lord : M.k === 'letter' ? 'o criado ' + h.serv + ', da ' + h.n : M.k === 'office' ? 'escritório do lorde, 1º andar do casarão da ' + h.n : 'cofre do quarto do casal, 1º andar do casarão da ' + h.n }); } return out; }
function cpSendJ() { for (const p of Object.values(S.players)) Net.toOne(p.id, { t: 'campj', l: cpJFor(p) }); }
function cpInfo(p, m) { const R = cpRec(), C = R[m], day = estDay(), k = cpKey(p), I = { t: 'campinfo', m, who: m === 'y' ? 'Dama Ysolde Verane' : R.cvGone ? 'Lorde Osric Vane, a Mão do Rei' : 'Mestre Corvin' };
  if (!C || C.st !== 'run') { I.idle = 1; I.over = C && C.st === 'none' ? 1 : 0; Net.toOne(p.id, I); return; }
  const M = cpMission(m, C, day), h = HOUSE_BY[C.target]; if (!M) { I.idle = 1; Net.toOne(p.id, I); return; } I.day = day - C.d0 + 1; I.days = CP.days; I.pts = C.pts; I.chance = Math.round(Math.min(CP.max, CP.base + CP.per * C.pts) * 100);
  I.goal = m === 'y' ? 'ser nomeada Dama da corte; a casa que mais se opõe é a ' + h.n : 'que a casa certa suba na linha de sangue; o alvo é a ' + h.n + ', que lidera a linha';
  if (m === 'y') I.voices = C.bent.map(cpVoiceName);
  I.mis = { k: M.k, n: CP_MIS[M.k].n, h: CP_MIS[M.k].h, st: M.st, pay: cpPay(m, M.i), voice: M.voice ? cpVoiceName(M.voice) : null, mine: M.acc.includes(k), byMe: M.by === k };
  const other = m === 'y' ? 'c' : 'y'; I.busy = R.acc[k] && R.acc[k][0] === day && R.acc[k][1] !== m ? 1 : 0;
  I.req = m === 'y' ? (() => { const H = hRec(), v = H.vow[k]; return v && ((H.favor[k] || {})[v] || 0) >= 10 ? '' : 'Ela só confia em quem jurou lealdade a uma casa e tem 10 de favor com ela.'; })() : '';
  Net.toOne(p.id, I); }
function cpMasterNear(p, m) { const R = cpRec(); if (m === 'y') { const n = S.npcs.vl_ysolde || S.npcs.k_dama; return n && dist(p.x, p.y, n.x, n.y) <= 4 && (n.fl || 0) === (p.fl || 0) ? n : null; } const n = R.cvGone ? S.npcs.k_hand : S.npcs.k_whisper; return n && dist(p.x, p.y, n.x, n.y) <= 4 && (n.fl || 0) === (p.fl || 0) ? n : null; }
function cpMsg(p, m) { if (!S.estate || p.downed) return; const R = cpRec(), day = estDay(), k = cpKey(p), now = now_(), mm = m.m === 'c' ? 'c' : 'y';
  if (m.a === 'open') { if (!cpMasterNear(p, mm)) return; if (cpCut(mm, k)) { Net.toOne(p.id, { t: 'campinfo', m: mm, who: mm === 'y' ? 'Dama Ysolde Verane' : 'Mestre Corvin', cut: 1, cost: CP_RECONCILE }); return; } cpInfo(p, mm); return; }
  if (m.a === 'reconcile') { const n = cpMasterNear(p, mm); if (!n || !cpCut(mm, k)) return; const got = secAvail(k, p); if (got < CP_RECONCILE) { empSay(n, 'São ' + CP_RECONCILE + ' de ouro. Nem uma moeda a menos.'); return; } debit(k, p, CP_RECONCILE); delete cpRec().cut[mm][k]; sendStat(p); empSay(n, 'Ouro apaga muita coisa. Não tudo. Não me faça arrepender.'); cpInfo(p, mm); estateSave(); return; }
  if (m.a === 'accept') { const n = cpMasterNear(p, mm), C = R[mm]; if (!n || !C || C.st !== 'run' || cpCut(mm, k)) return; const M = cpMission(mm, C, day); if (M.st !== 'open' || M.acc.includes(k)) { cpInfo(p, mm); return; }
    if (R.acc[k] && R.acc[k][0] === day && R.acc[k][1] !== mm) { empSay(n, 'Você já trabalha para outra pessoa hoje.'); return; }
    if (mm === 'y') { const H = hRec(), v = H.vow[k]; if (!v || ((H.favor[k] || {})[v] || 0) < 10) { empSay(n, 'Volte quando uma casa confiar em você.'); return; } }
    M.acc.push(k); R.acc[k] = [day, mm]; empSay(n, mm === 'y' ? 'Sabia que podia contar com você. Ninguém pode saber.' : 'A coroa agradece. Ou agradeceria, se soubesse.'); cpInfo(p, mm); cpSendJ(); estateSave(); return; }
  const J = cpJFor(p);
  if (m.a === 'drink') { const n = S.npcs[m.id], cid = cpCounselor(day); if (!n || n.id !== cid || dist(n.x, n.y, p.x, p.y) > 3 || !csIn(empHour(), CP_MIS.club.h)) return; if ((p.gold || 0) < CP.drinkPrice) { tell(p, 'Uma taça custa ' + CP.drinkPrice + ' de ouro.'); return; }
    p.gold -= CP.drinkPrice; sendStat(p); R.dr = R.dr || {}; const key = k + '|' + day; R.dr[key] = (R.dr[key] || 0) + 1; const c = R.dr[key];
    if (c < CP.drinks) { empSay(n, ['À sua saúde.', 'Generoso. Muito generoso.', 'Mais uma? Bem... só mais uma.'][Math.min(2, c - 1)]); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'drink', ms: 1500 }); return; }
    empSay(n, 'Vou te contar uma coisa... mas não diga a ninguém que fui eu.'); const Jc = J.find(j => j.k === 'club'); if (Jc) cpDone(p, Jc.m, mm === 'y' ? 'Ele soltou um segredo da corte' : 'Agora você sabe de que lado ele está');
    else tell(p, 'Ele fala, fala... mas nada que interesse hoje.'); return; }
  if (m.a === 'desk' || m.a === 'safe') { const kk = m.a === 'desk' ? 'office' : 'safe', Jo = J.find(j => j.k === kk); if (!Jo || p.cpAct) return; const b = csSeat(Jo.target), bi = BUILDINGS.indexOf(b), P0 = m.a === 'desk' ? CP_DESK : CP_SAFE, [x, y] = seatPt(b, 1, P0[0], P0[1]);
    if ((p.fl || 0) !== 1 || p.fb !== bi || dist(p.x, p.y, x, y) > 1.4 || (seatRoom(b, 1, p.x, p.y) || {}).n !== (m.a === 'desk' ? 'escritório' : 'quarto do casal')) return; const ms = m.a === 'desk' ? CP.deskMs : CP.safeMs; p.cpAct = { k: m.a, m: Jo.m, until: now + ms, x: p.x, y: p.y }; Net.toOne(p.id, { t: 'csact', on: 1, k: m.a, ms }); return; }
  if (m.a === 'pick') { const Jl = J.find(j => j.k === 'letter' && j.m === 'y'); if (!Jl) return; const n = cpServ(Jl.target); if (!n || dist(n.x, n.y, p.x, p.y) > 1.5) { tell(p, 'Longe demais.'); return; } const fc = cpFacing(n, p); if (fc > 0.3) { cpFail('y', n.name.split(',')[0] + ' viu a sua mão no bolso dele'); return; } if (fc > -0.2) { tell(p, 'Assim ele percebe. Chegue por trás.'); return; } cpDone(p, 'y', 'A carta que ele levava está com você'); return; } }
function cpFacing(n, p) { let hx = n.hx, hy = n.hy; if (hx == null) { const a = (n.dir | 0) * Math.PI / 4; hx = Math.cos(a); hy = Math.sin(a); } const dx = p.x - n.x, dy = p.y - n.y, d = Math.hypot(dx, dy) || 1; return (hx * dx + hy * dy) / d; }   /* 1 = olhando para o jogador, -1 = de costas */
var csMissionFail = function (p, hid) { const R = cpRec(), k = cpKey(p); for (const m of ['y', 'c']) { const C = R[m]; if (!C || C.st !== 'run' || !C.mis || C.mis.st !== 'open' || C.target !== hid) continue; if ((C.mis.k === 'office' || C.mis.k === 'safe') && C.mis.acc.includes(k)) cpFail(m, p.name + ' foi pego dentro do casarão'); } };
/* a casa alvo vai às Termas no dia da missão das Termas */
if (typeof csDay === 'function') { const _cdC = csDay; csDay = function (hid, day) { const D = _cdC(hid, day); if (!D || !S.estate || !S.estate.camp) return D; const R = S.estate.camp, today = estDay(); if (day != null && day !== today) return D;
  for (const m of ['y', 'c']) { const C = R[m]; if (C && C.st === 'run' && C.mis && C.mis.day === today && C.mis.k === 'thermae' && C.target === hid && !D.venues.includes('thermae')) D.venues = ['thermae'].concat(D.venues).slice(0, 2); } return D; }; }
/* conselheiro do dia no Clube, das 19h às 21h */
if (typeof courtPost === 'function') { const _cpP = courtPost; courtPost = function (def, now) { if (S.estate && def.id === cpCounselor(estDay()) && csIn(empHour(), CP_MIS.club.h) && !(def.id === 'k_hand' && crownRec().bad)) return [0, 'club']; return _cpP(def, now); }; }
if (typeof courtWorld === 'function') { const _cpW = courtWorld; courtWorld = function (P, n, now) { if (P && P[1] === 'club') { const b = velB('club'); if (b) { const [x, y] = localToWorld(b, CP_CLUBSPOT[0], CP_CLUBSPOT[1]); return { x, y, fl: 0, out: 1 }; } } return _cpW(P, n, now); }; }
/* perdão da Dama: quem tem o pedido escapa da guilhotina */
if (typeof startLead === 'function') { const _slC = startLead; startLead = function (n, q, dest, now) { if (dest === 'stage' && q && S.estate && S.estate.camp && S.estate.camp.dama === estOwner(q) && !q.dev) { S.estate.camp.dama = null; n.goFetch = null; n.aggro = null; n.arrest = null; q.wanted = 0; q.sentence = 0; q.crimes = []; q.murderer = false; Net.toAll({ t: 'wanted', id: q.id, ms: 0 }); sys('A Dama Ysolde intercede por ' + q.name + ': perdão total da coroa. O pedido à Dama foi usado.'); tell(q, 'Você gastou o seu pedido à Dama Ysolde: perdão total.'); estateSave(); return; } return _slC(n, q, dest, now); }; }
/* o sussurro grátis do dia para quem ajudou o Corvin a vencer; e a Mão do Rei no lugar dele, se ele cair */
if (typeof secCorvin === 'function') { const _scP = secCorvin; secCorvin = function (p, m) { const R = S.estate && S.estate.camp; if (R && R.cvGone) { const real = S.npcs.k_whisper; S.npcs.k_whisper = S.npcs.k_hand; try { _scP(p, m); } finally { if (real) S.npcs.k_whisper = real; else delete S.npcs.k_whisper; } return; }
  const k = cpKey(p), free = R && m.op === 'buy' && R.whisper[k] && R.lastFree[k] !== estDay(); if (!free) { _scP(p, m); return; } const n0 = secList(p).length; p.gold = (p.gold || 0) + CV_BUY; _scP(p, m); if (secList(p).length > n0) { R.lastFree[k] = estDay(); tell(p, 'Este foi de graça: o sussurro do dia que o Corvin lhe deve.'); } else p.gold -= CV_BUY; sendStat(p); }; }
/* a Ysolde some (presa) ou ganha um lugar na corte das 8h às 12h; quando a Mirela assume, ela fica no patamar */
if (typeof velSpawn === 'function') { const _vsC = velSpawn; velSpawn = function () { const r = _vsC.apply(this, arguments); const R = S.estate && S.estate.camp; if (!R) return r; const ys = S.npcs.vl_ysolde, h = empHour();
  if (R.ysGone && !R.mirela) { if (ys) visGone(ys); }
  else if (R.ysGone && R.mirela) { const T = VEL_STAFF.find(t => t.id === 'vl_ysolde'); if (T && T.name !== 'Mirela, a Dama da Casa') { T.name = 'Mirela, a Dama da Casa'; T.kind = (VEL_STAFF.find(t => t.id === 'vl_mirela') || {}).kind || T.kind; if (ys) visGone(ys); } const mi = S.npcs.vl_mirela; if (mi) visGone(mi); const iM = VEL_STAFF.findIndex(t => t.id === 'vl_mirela'); if (iM >= 0) VEL_STAFF.splice(iM, 1); }
  else if (R.ysDama) { const atCourt = h >= 8 && h < 12, dm = S.npcs.k_dama; if (atCourt) { if (ys) visGone(ys); if (!dm && typeof castleB === 'function' && castleB()) { const s = typeof throneSeat === 'function' ? throneSeat() : null; if (s) { const v = { id: 'k_dama', kind: 'ysolde', name: 'Dama Ysolde Verane', transient: true, court: 'dama', x: s.x + 1.6, y: s.y + 1.2, z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false, dir: 0 }; S.npcs[v.id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); } } } else if (dm) visGone(dm); }
  return r; }; }
if (typeof velMsg === 'function') { const _vmP = velMsg; velMsg = function (p, m) { const R = S.estate && S.estate.camp; if (R && R.ysGone && !R.mirela && (m.a === 'buy' || m.a === 'sell' || m.a === 'rumor')) { tell(p, 'A Casa de Veludo não compra nem vende segredos por enquanto.'); return; }
  if (R && !R.ysGone && (m.a === 'buy' || m.a === 'sell' || m.a === 'rumor') && cpCut('y', estOwner(p))) { tell(p, 'A Dama Ysolde não negocia mais com você. Pergunte a ela como voltar às boas.'); return; }
  if (R && !R.cvGone && m.a === 'cv' && ['buy', 'sell', 'rt'].includes(m.op) && cpCut('c', estOwner(p))) { tell(p, 'O Mestre Corvin não fala mais com você. Pergunte a ele como voltar às boas.'); return; } return _vmP(p, m); }; }
function cpTick(now) { if (!S.estate || !HOUSES.length) return; const R = cpRec(), day = estDay(); if (R.dayT !== day) { R.dayT = day; cpDaily(day); cpSendJ(); }
  if (R.cvGone && COURT.some(d => d.id === 'k_whisper')) cpCorvinGone();   /* mundo reaberto: o Corvin continua preso */
  S.cpSeenP = S.cpSeenP || {}; for (const id in S.players) if (!S.cpSeenP[id]) { S.cpSeenP[id] = 1; const st = cpState(); Net.toOne(id, st); Net.toOne(id, { t: 'campj', l: cpJFor(S.players[id]) }); }
  for (const id in S.cpSeenP) if (!S.players[id]) delete S.cpSeenP[id];
  if (now - (S.cpT || 0) < 250) return; const dt = (now - (S.cpT || now)) / 1000 || 0.25; S.cpT = now; const h = empHour();
  for (const p of Object.values(S.players)) { const k = cpKey(p); if (R.pend[k] && !p.dev) { delete R.pend[k]; p.wanted = now + 300000; crimeSentence(p, 'assault'); Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); tell(p, 'Os seus trabalhos para quem caiu vieram à tona: você é procurado como cúmplice.'); estateSave(); }
    const A = p.cpAct; if (A) { if (p.downed || dist(p.x, p.y, A.x, A.y) > 0.45) { p.cpAct = null; Net.toOne(p.id, { t: 'csact', on: 0 }); tell(p, 'Você se mexeu e desistiu.'); } else if (now >= A.until) { p.cpAct = null; Net.toOne(p.id, { t: 'csact', on: 0 }); cpDone(p, A.m, A.k === 'desk' ? 'A carta está com você' : 'A prova falsa está no cofre'); } } }
  for (const m of ['y', 'c']) { const C = R[m]; if (!C || C.st !== 'run' || !C.mis || C.mis.st !== 'open' || !C.mis.acc.length) continue; const M = C.mis, accP = Object.values(S.players).filter(p => M.acc.includes(cpKey(p)));
    if (M.k === 'thermae' && csIn(h, CP_MIS.thermae.h)) { const L = cpLord(C.target); if (!L || !thermaePoolAt(L.x, L.y)) continue; const tb = thermaeBi(); for (const p of accP) { if ((p.fl || 0) || WORLD.bld[tileAt(p.x, p.y)] !== tb || dist(p.x, p.y, L.x, L.y) > CP.listenR) continue; p.cpL = (p.cpL && p.cpL.d === M.day ? p.cpL : { d: M.day, s: 0 }); p.cpL.s += dt; if (p.cpL.s >= CP.listenS) { cpDone(p, m, 'Você ouviu o bastante'); if (m === 'y') cpSecOf(p, C.target, 'ouvido no vapor das Termas'); break; } } }
    else if (M.k === 'letter' && csIn(h, CP_MIS.letter.h)) { const sv = cpServ(C.target); if (!sv) continue; for (const p of accP) { const d = dist(p.x, p.y, sv.x, sv.y); if ((p.fl || 0) !== (sv.fl || 0)) continue; p.cpF = p.cpF && p.cpF.d === M.day ? p.cpF : { d: M.day, seen: 0, near: 0 }; if (d <= CP.followFar) p.cpF.near = now;
        if (d < CP.followSee && cpFacing(sv, p) > 0.3) { p.cpF.seen += dt * 1000; if (p.cpF.seen >= CP.followSeenMs) { cpFail(m, sv.name.split(',')[0] + ' percebeu que estava sendo seguido'); break; } } }
      if (M.st !== 'open') continue; const D = csDay(C.target), o = csSeat(D.letterTo), [ox, oy] = o ? doorOutPt(BUILDINGS.indexOf(o)) : [0, 0];
      if (o && dist(sv.x, sv.y, ox, oy) < 1.2) { if (m === 'y') cpFail('y', 'ele entregou a carta antes'); else { const f = accP.find(p => p.cpF && p.cpF.d === M.day && now - p.cpF.near < 3000); if (f) { cpDone(f, 'c', 'A carta foi para a ' + HOUSE_BY[D.letterTo].n + ': ela é aliada da ' + HOUSE_BY[C.target].n); } else cpFail('c', 'ninguém viu para onde ele levou a carta'); } } } }
  cpSendSt(); }
if (typeof housesTick === 'function') { const _htP = housesTick; housesTick = function (now) { _htP(now); cpTick(now); }; }

// ---------------- CLIENTE ----------------
if (typeof COURT_LINES !== 'undefined') COURT_LINES.dama = ['A corte é só uma Casa de Veludo com tronos.', 'Quem diria. Eu, aqui. Sente-se, se a Mão deixar.'];
function cpPanel(I) { const who = I.who, M = I.mis; let html = '<div class="est-cost">';
  if (I.cut) { const d = velPanel(who, '<div class="est-cost">“Você trabalhou contra mim. Não tenho mais nada para você.”<br><br>Para voltar às boas: <b>' + I.cost + ' de ouro</b> (do banco, do cofre ou da bolsa).</div><div class="tq-btns"><button class="est-btn" data-rec>Pagar ' + I.cost + ' de ouro</button></div>'); d.querySelector('[data-rec]').onclick = () => Net.send({ t: 'camp', a: 'reconcile', m: I.m }); return; }
  if (I.idle) html += I.over ? '“Por enquanto, nada. Volte outro dia.”' : '“Não tenho trabalho para você agora.”';
  else { html += '<b>Objetivo</b>: ' + I.goal + '.<br><b>Dia ' + I.day + ' de ' + I.days + '</b> · apoios conseguidos: <b>' + I.pts + '</b> · chance hoje: <b>' + I.chance + '%</b>' + (I.voices && I.voices.length ? '<br><b>Vozes dobradas</b>: ' + I.voices.join(', ') : '') + '</div>';
    html += '<div class="vel-sub">Missão de hoje</div><div class="est-cost"><b>' + M.n + '</b>' + (M.h[0] || M.h[1] < 24 ? ' (das ' + M.h[0] + 'h às ' + M.h[1] + 'h)' : ' (a qualquer hora)') + (M.voice ? '<br>Voz que ela vai dobrar: <b>' + M.voice + '</b>' : '') + '<br>Pagamento: <b>' + M.pay + ' de ouro</b>' + (I.m === 'c' ? ' e favor da coroa' : '') + '<br>' + (M.st === 'done' ? (M.byMe ? 'Cumprida por você.' : 'Já foi cumprida hoje.') : M.st === 'fail' ? 'Falhou hoje.' : M.mine ? '<b>Aceita.</b> Veja os detalhes na Jornada (J).' : 'Aberta: quem cumprir primeiro recebe.') + (I.req ? '<br><i>' + I.req + '</i>' : '') + (I.busy ? '<br><i>Você já aceitou a missão do outro mestre hoje.</i>' : ''); }
  html += '</div>'; const d = velPanel(who, html + (!I.idle && M.st === 'open' && !M.mine && !I.req && !I.busy ? '<div class="tq-btns"><button class="est-btn" data-acc>Aceitar a missão</button></div>' : ''));
  const b = d.querySelector('[data-acc]'); if (b) b.onclick = () => Net.send({ t: 'camp', a: 'accept', m: I.m }); }
function cpJHtml() { const L = G.campJ || []; if (!L.length) return ''; return '<div class="gp-sub">Missão secreta de hoje</div>' + L.map(j => '<div class="cs-note"><b>' + (j.m === 'y' ? 'Para a Dama Ysolde' : 'Para o Mestre Corvin') + ': ' + j.n + '</b>' + (j.h[0] || j.h[1] < 24 ? ' (das ' + j.h[0] + 'h às ' + j.h[1] + 'h)' : '') + '<br>Onde: ' + j.where + '. ' + ({ thermae: 'Fique perto dele, nas Termas, enquanto ele estiver na piscina (uns 20 s).', club: 'Pague taças a ele (F) até ele soltar a língua.', office: 'Entre sem ser visto e aperte F na escrivaninha (3 s).', letter: j.m === 'y' ? 'Siga de longe; chegando por trás, F tira a carta. Se ele te vir de perto por 2 s, acabou.' : 'Siga de longe até ele entregar a carta. Se ele te vir de perto por 2 s, acabou.', safe: 'Entre sem ser visto e aperte F no cofre (4 s).' })[j.k] + (j.st === 'done' ? ' <b>Cumprida.</b>' : j.st === 'fail' ? ' <b>Falhou.</b>' : '') + '</div>').join(''); }
if (typeof updateQuests === 'function' && typeof G !== 'undefined') { const _uqP = updateQuests; updateQuests = function () { _uqP.apply(this, arguments); let d = $('journal-camp'); if (!d) { d = document.createElement('div'); d.id = 'journal-camp'; $('journal').appendChild(d); } d.innerHTML = cpJHtml(); }; }
function cpSpot() { const me = G.me, L = G.campJ || []; if (!me || me.downed || !L.length) return null;
  for (const j of L) { if (j.st !== 'open') continue; const b = BUILDINGS.find(q => q.seat === j.target); if (!b) continue; const bi = BUILDINGS.indexOf(b);
    if ((j.k === 'office' || j.k === 'safe') && me.fl === 1 && me.fb === bi) { const P0 = j.k === 'office' ? CP_DESK : CP_SAFE, [x, y] = seatPt(b, 1, P0[0], P0[1]); if (dist(me.x, me.y, x, y) < 1.3) return { k: j.k === 'office' ? 'desk' : 'safe', bi }; }
    if (j.k === 'letter' && j.m === 'y') { const sv = Object.values(G.npcs).find(e => e.kind === 'hh_serv_' + j.target && !e.npDead); if (sv && Math.hypot(sv.rx - me.x, sv.ry - me.y) < 1.4) return { k: 'pick' }; } }
  return null; }
function cpHint() { const s = cpSpot(); if (!s) return ''; return s.k === 'desk' ? 'F: procurar a carta na escrivaninha (3 s)' : s.k === 'safe' ? 'F: plantar a prova falsa no cofre (4 s)' : 'F: tirar a carta do bolso dele (só por trás)'; }
function cpF() { const s = cpSpot(); if (!s) return false; Net.send({ t: 'camp', a: s.k, bi: s.bi }); return true; }
if (typeof csHint === 'function') { const _chP = csHint; csHint = function () { if (G.csAct && (G.csAct.k === 'desk' || G.csAct.k === 'safe')) return G.csAct.k === 'desk' ? 'Procurando a carta… não se mexa' : 'Escondendo a prova no cofre… não se mexa'; return cpHint() || _chP(); }; }
if (typeof csF === 'function') { const _cfP = csF; csF = function () { if (!G.csAct && cpF()) return true; return _cfP(); }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peP = progEvent; progEvent = function (m, now) {
  if (m.t === 'campinfo') { cpPanel(m); return true; }
  if (m.t === 'campj') { G.campJ = m.l; try { updateQuests(); } catch (e) { } return true; }
  if (m.t === 'campst') { G.campSt = m; return true; }
  const r = _peP(m, now);
  if (m.t === 'velmenu' && m.k === 'ysolde' && G.campSt && G.campSt.ysGone) { const hd = document.querySelector('#tequip .gp-head span'); if (hd) hd.textContent = 'Mirela, a Dama da Casa'; }
  if (m.t === 'velmenu' && m.k === 'ysolde' && !(G.campSt && G.campSt.ysGone)) { const d = document.getElementById('tequip'); if (d) { const box = document.createElement('div'); box.className = 'tq-btns'; box.innerHTML = '<button class="est-btn ghost" data-cp>Algum trabalho para mim?<small>a campanha da Dama</small></button>'; d.appendChild(box); box.querySelector('[data-cp]').onclick = () => Net.send({ t: 'camp', a: 'open', m: 'y' }); } }
  if (m.t === 'secmenu' && m.k === 'cv') { const d = document.getElementById('tequip'); if (d) { const box = document.createElement('div'); box.className = 'tq-btns'; box.innerHTML = '<button class="est-btn ghost" data-cp>Algum trabalho para mim?<small>os planos do Mestre</small></button>'; d.appendChild(box); box.querySelector('[data-cp]').onclick = () => Net.send({ t: 'camp', a: 'open', m: 'c' }); } }
  if (m.t === 'courtmenu') { const d = document.getElementById('courtmenu'); if (d && G.campSt && G.campSt.couns === m.id && typeof velB === 'function') { const b = velB('club'), me = G.me; if (b && me && me.x >= b.x - 0.5 && me.x < b.x + b.w - 0.5 && me.y >= b.y - 0.5 && me.y < b.y + b.h - 0.5) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">🍷</span><span><b>Pagar uma taça a ele (' + CP.drinkPrice + ' de ouro)</b><br><small>Algumas taças e ele solta a língua.</small></span>'; bt.onclick = () => Net.send({ t: 'camp', a: 'drink', id: m.id }); d.appendChild(bt); } }
    if (d && m.role === 'hand' && G.campSt && G.campSt.cvGone) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">🕯</span><span><b>Ouvir os sussurros</b><br><small>Agora é a Mão do Rei quem vende os segredos da corte</small></span>'; bt.onclick = () => { d.remove(); Net.send({ t: 'vel', a: 'cv', op: 'open' }); }; d.appendChild(bt); } }
  return r; }; }
