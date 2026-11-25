// ============================================================
//  CASARÕES DAS CASAS (parte A da invasão): rotinas que andam pela cidade de verdade,
//  guardas que só deixam entrar vassalos ou quem tem favor, porta dos fundos com gazua,
//  hera até a janela do 1º andar e a regra do cômodo: só é pego quem está no mesmo cômodo
//  que um morador acordado (2 s para sair; agachado, 4 s).
// ============================================================
const CS = { pickPrice: 25, pickMs: 4000, pickBreak: 0.2, backOpenMs: 60000, ivyMs: 5000, seenMs: 2000, seenCrouchMs: 4000, favorIn: 10, favorTalk: 30, bribe: 15, tellBribe: 0.2, tellFree: 0.1, caughtFavor: -10, toldFavor: -5, sleep: [23, 6], servSleep: [23, 5] };
const CS_SPOUSE = { mass: { h: [7, 9], n: 'a missa na Catedral' }, market: { h: [10, 12], n: 'o mercado' }, visit: { h: [14, 16], n: 'uma visita' } };
const CS_SERV = { market: [10, 12], letter: [20, 21] };
const CS_VENUE = { thermae: 'as Termas', club: 'o Clube do Cervo de Prata', velvet: 'a Casa de Veludo' };
const CS_PRIVATE = n => n !== 'salão' && n !== 'escada';
const csNa = r => (/^(cozinha|escada)/.test(r) ? 'na ' : 'no ') + r;   /* na cozinha, no salão */   /* visitante com permissão fica no salão; o resto da casa é privado */

// ---------------- SERVIDOR ----------------
function csHash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/* o dia de cada casa: para onde vão o lorde e o herdeiro (1 ou 2 lugares), a saída do cônjuge e para quem o criado leva a carta */
function csDay(hid, day) { const k = HOUSES.findIndex(h => h.id === hid); if (k < 0) return null; day = day == null ? estDay() : day;
  const r = q => csHash(day * 7 + q, k * 13 + 5), V = ['thermae', 'club', 'velvet'], a = Math.floor(r(1) * 3), two = r(2) < 0.5, venues = two ? [V[a], V[(a + 1 + Math.floor(r(3) * 2)) % 3]] : [V[a]];
  const others = HOUSES.filter(h => h.id !== hid).map(h => h.id), sp = ['mass', 'market', 'visit'][Math.floor(r(4) * 3)];
  return { venues: V.filter(v => venues.includes(v)), spouse: sp, visitTo: others[Math.floor(r(5) * others.length)], letterTo: others[Math.floor(r(6) * others.length)] }; }
const csIn = (h, H) => h >= H[0] && h < H[1];
const csSleeping = (h, S0) => h >= S0[0] || h < S0[1];
/* os horários antigos continuam; só muda quais lugares cada casa visita no dia */
if (typeof thVisiting === 'function') thVisiting = function (house) { const D = csDay(house); return !!D && D.venues.includes('thermae') && csIn(empHour(), THERMAE_HOURS); };
if (typeof clubVisiting === 'function') clubVisiting = function (hid) { const D = csDay(hid); return !!D && D.venues.includes('club') && csIn(empHour(), CLUB_HOURS); };
if (typeof velVisiting === 'function') velVisiting = function (hid) { const D = csDay(hid); return !!D && D.venues.includes('velvet') && csIn(empHour(), VL_HOURS); };
function csSeat(hid) { return BUILDINGS.find(b => b.seat === hid); }
function csMarketPt(k, who) { return [CENTER - 6 + (k % 5) * 1.3 + who * 0.6, CENTER + 11.5 + who * 0.8]; }   /* barracas da praça do mercado */
function csTemplePt(k) { const bi = typeof templeBi === 'function' ? templeBi() : -1, T = bi >= 0 ? bldTiles(bi) : []; if (!T.length) return [CENTER + 12, CENTER + 15]; const t = T[(k * 7 + 3) % T.length]; return [t[0], t[1]]; }
function csAlert(hid) { return !!(S.csAlert && S.csAlert[hid] === estDay()); }
/* posto de agora para quem tem rotina nova (cônjuge, criado, guarda de sobreaviso, sono); o resto segue o posto de sempre */
function csPost(def, n) { const b = csSeat(n.house); if (!b) return null; const h = empHour(), D = csDay(n.house), k = HOUSES.findIndex(x => x.id === n.house), L = (fl, u, v) => { const [x, y] = seatPt(b, fl, u, v); return { x, y, fl }; };
  n.csSleep = false;
  if (n.hrole === 'spouse') { const O = CS_SPOUSE[D.spouse]; if (csIn(h, O.h)) { if (D.spouse === 'mass') { const [x, y] = csTemplePt(k); return { x, y, fl: 0, out: 1 }; } if (D.spouse === 'market') { const [x, y] = csMarketPt(k, 0); return { x, y, fl: 0, out: 1 }; } const o = csSeat(D.visitTo); if (o) { const [x, y] = seatPt(o, 0, 4.6, 6.2); return { x, y, fl: 0, out: 1 }; } }
    if (csSleeping(h, CS.sleep)) n.csSleep = true; return null; }
  if (n.hrole === 'serv') {
    if (csIn(h, CS_SERV.market)) { const [x, y] = csMarketPt(k, 1); return { x, y, fl: 0, out: 1 }; }
    if (csIn(h, CS_SERV.letter)) { const o = csSeat(D.letterTo); if (o) { const [x, y] = doorOutPt(BUILDINGS.indexOf(o)); return { x, y, fl: 0, out: 1, letter: 1 }; } }
    if (csSleeping(h, CS.servSleep)) { n.csSleep = true; return L(0, 4.3, 1.6); }
    const P = [[1.5, 1.5], [2.6, 5.4], [5.6, 6.6], [1.4, 1.2]], i = Math.floor((now_() / 25000 + k) % P.length); return L(0, P[i][0], P[i][1]); }   /* circula pelo térreo */
  if (n.hrole === 'guard' && csAlert(n.house) && /_5$/.test(n.id)) { const P = [[3.5, 4.4], [1.5, 1.6], [5.6, 4.2]], i = Math.floor((now_() / 15000) % P.length); return L(0, P[i][0], P[i][1]); }   /* de sobreaviso: ronda por dentro */
  if ((n.hrole === 'lord' || n.hrole === 'heir') && csSleeping(h, CS.sleep)) n.csSleep = true;
  return null; }
if (typeof hPost === 'function') { const _hpC = hPost; hPost = function (def, n) { const T = csPost(def, n); if (T) return T; const T2 = _hpC(def, n); if (T2 && n.csSleep && T2.out) n.csSleep = false; return T2; }; }
/* andar de verdade pela cidade (antes eles sumiam e reapareciam quando o destino estava longe) */
if (typeof hMove === 'function') { const _hmC = hMove; hMove = function (n, T, dt) { const b = hSeatB(n.house), bi = BUILDINGS.indexOf(b); n.sleeping = !!n.csSleep && dist(n.x, n.y, T.x, T.y) < 0.6;
  if ((n.fl || 0) !== (T.fl || 0)) {   /* troca de andar só dentro do casarão: a escada fica no térreo, no canto dos fundos */
    if (n.fl) { const [x, y] = seatPt(b, 0, 6.5, 1.5); n.x = x; n.y = y; n.fl = 0; n.fb = -1; n.legs = null; n.path = null; return; }
    if (WORLD.bld[tileAt(n.x, n.y)] === bi) { const [sx, sy] = seatPt(b, 0, 6.5, 1.5); if (dist(n.x, n.y, sx, sy) < 0.7) { n.x = T.x; n.y = T.y; n.fl = T.fl; n.fb = bi; n.walk = false; n.legs = null; n.path = null; return; } npcWalk(n, sx, sy, 1.1, dt); n.walk = true; return; }
    const [sx, sy] = seatPt(b, 0, 6.5, 1.5); npcWalk(n, sx, sy, 1.1, dt); n.walk = true; return; }
  if (T.fl) { _hmC(n, T, dt); return; }
  const d = dist(n.x, n.y, T.x, T.y); if (d < 0.2) { n.walk = false; n.legs = null; n.path = null; return; }
  if (d < 0.9 && WORLD.bld[tileAt(n.x, n.y)] === WORLD.bld[tileAt(T.x, T.y)]) { _hmC(n, T, dt); return; }
  if (d > 110) { n.x = T.x; n.y = T.y; n.walk = false; return; }   /* muito longe (o mundo acabou de abrir); a cidade cresceu (25/11): de um canto ao outro passa de 70 */
  if (npcWalk(n, T.x, T.y, 1.1, dt)) { n.walk = false; n.legs = null; n.path = null; } else n.walk = true; }; }

/* ---- quem pode passar por onde: guardas na porta da frente, porta dos fundos aberta por gazua ---- */
function csGuardsUp(hid) { return Object.values(S.npcs).some(n => n.court === 'house' && n.house === hid && n.hrole === 'guard' && !n.dead && !n.downed && !(csAlert(hid) && /_5$/.test(n.id))); }
function csAllowed(p, hid) { const H = hRec(), k = estOwner(p); return H.vow[k] === hid || ((H.favor[k] || {})[hid] || 0) >= CS.favorIn; }
function csLocks() { const L = {}, now = now_(), back = S.csBack || (S.csBack = {});
  for (const h of HOUSES) { const b = csSeat(h.id); if (!b) continue; const bi = BUILDINGS.indexOf(b), B = back[bi] || {}; for (const nm in B) if (B[nm] < now) delete B[nm];
    L[bi] = { g: csGuardsUp(h.id) ? 1 : 0, f: Object.values(S.players).filter(p => csAllowed(p, h.id)).map(p => String(p.name).trim().toLowerCase()), b: Object.keys(B) }; }
  return L; }
function csSendLocks(force) { const L = csLocks(), j = JSON.stringify(L); S.seatL = L; if (force || j !== S.seatLJ) { S.seatLJ = j; Net.toAll({ t: 'seatL', L }); } }
function csTell(p, t) { tell(p, t); }
function csOut(b) { const [x, y] = doorOutPt(BUILDINGS.indexOf(b)); return [x, y]; }
function csTp(p, x, y, fl, fb) { p.x = x; p.y = y; p.z = 0; p.fl = fl; p.fb = fb; Net.toOne(p.id, { t: 'tp', x, y, z: 0, fl, fb }); }
/* pego: criado e nobres expulsam (a casa perde favor e fica de sobreaviso); guarda: crime de invasão */
function csCaught(p, n, b, how) { const hid = b.seat, h = HOUSE_BY[hid], nm = n ? n.name.split(',')[0] : 'Alguém'; S.csAlert = S.csAlert || {}; S.csAlert[hid] = estDay(); p.csSeen = null; p.csAct = null;
  if (n) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: n.hrole === 'guard' ? 'Ladrão! Pega!' : ['Quem é você? Fora da minha casa!', 'Guardas! Tem alguém aqui dentro!', 'Saia daqui agora!'][Math.floor(Math.random() * 3)], ms: 1 });
  const inside = (p.fl || 0) || WORLD.bld[tileAt(p.x, p.y)] === BUILDINGS.indexOf(b), guard = n && (n.hrole === 'guard' || n.kind === 'guard' || n.kind === 'captain');
  if (guard) { if (!CRIME_MS.trespass) { CRIME_MS.trespass = 120000; CRIME_TXT.trespass = 'invasão de casarão'; } p.wanted = now_() + 300000; crimeSentence(p, 'trespass'); Net.toAll({ t: 'wanted', id: p.id, ms: 300000 }); hFavor(p, hid, CS.caughtFavor, 'pego invadindo o casarão');
    if (inside) { const [x, y] = csOut(b); csTp(p, x, y, 0, -1); } csTell(p, nm + ' te pegou ' + (how || 'dentro do casarão') + (inside ? ' e te pôs para fora aos gritos' : '') + '. Você está sendo procurado por invasão.'); }
  else { hFavor(p, hid, CS.caughtFavor, 'pego onde não devia, no casarão'); if (inside) { const [x, y] = csOut(b); csTp(p, x, y, 0, -1); } csTell(p, nm + ' te pegou ' + (how || 'num cômodo da casa') + (inside ? ' e te pôs para fora' : ' e deu o alarme') + '. A ' + h.n + ' fica de sobreaviso hoje: um dos guardas da porta passa a rondar por dentro.'); }
  if (typeof csMissionFail === 'function') csMissionFail(p, hid);
  csSendLocks(true); if (typeof estateSave === 'function') estateSave(); }
/* a regra do cômodo, a cada 250 ms */
function csWatch(now) { if (now - (S.csWT || 0) < 250) return; S.csWT = now;
  for (const p of Object.values(S.players)) { if (p.dev || p.downed) { p.csSeen = null; continue; } const bi = (p.fl || 0) ? p.fb : WORLD.bld[tileAt(p.x, p.y)], b = bi >= 0 ? BUILDINGS[bi] : null;
    if (!b || b.deco !== 'seat') { p.csSeen = null; continue; } const R = seatRoom(b, p.fl || 0, p.x, p.y); if (!R) { p.csSeen = null; continue; }
    if (!(CS_PRIVATE(R.n) || !csAllowed(p, b.seat))) { p.csSeen = null; continue; }   /* visitante com permissão, no salão */
    const w = Object.values(S.npcs).find(n => n.court === 'house' && n.house === b.seat && !n.dead && !n.downed && !n.sleeping && (n.fl || 0) === (p.fl || 0) && ((n.fl || 0) ? n.fb === bi : WORLD.bld[tileAt(n.x, n.y)] === bi) && (seatRoom(b, n.fl || 0, n.x, n.y) || {}).i === R.i);
    if (!w) { if (p.csSeen) Net.toOne(p.id, { t: 'csseen', on: 0 }); p.csSeen = null; continue; }
    const lim = p.crouch ? CS.seenCrouchMs : CS.seenMs;
    if (!p.csSeen || p.csSeen.id !== w.id) { p.csSeen = { id: w.id, t0: now }; Net.toOne(p.id, { t: 'csseen', on: 1, who: w.name.split(',')[0], room: R.n, ms: lim }); continue; }
    if (now - p.csSeen.t0 >= lim) csCaught(p, w, b, csNa(R.n)); } }
/* ações demoradas: gazua (4 s) e hera (5 s); mexeu, perdeu */
function csActs(now) { for (const p of Object.values(S.players)) { const A = p.csAct; if (!A) continue; if (p.downed || dist(p.x, p.y, A.x, A.y) > 0.45 || (p.fl || 0) !== A.fl) { p.csAct = null; Net.toOne(p.id, { t: 'csact', on: 0 }); csTell(p, 'Você se mexeu e desistiu.'); continue; }
  const b = BUILDINGS[A.bi];
  if (A.k === 'ivy' && A.up && !A.checked && now - A.t0 > 1500) { A.checked = 1; const w = Object.values(S.npcs).find(n => !n.dead && !n.downed && !n.sleeping && !(n.fl || 0) && WORLD.bld[tileAt(n.x, n.y)] < 0 && dist(n.x, n.y, p.x, p.y) < 7 && ((n.court === 'house' && n.house === b.seat) || n.kind === 'guard' || n.kind === 'captain')); if (w) { Net.toOne(p.id, { t: 'csact', on: 0 }); csCaught(p, w, b, 'subindo pela hera'); continue; } }   /* quem está na rua de trás pode ver */
  if (now < A.until) continue; p.csAct = null; Net.toOne(p.id, { t: 'csact', on: 0 });
  if (A.k === 'pick') { const B = (S.csBack = S.csBack || {})[A.bi] || (S.csBack[A.bi] = {}); B[String(p.name).trim().toLowerCase()] = now + CS.backOpenMs; let msg = 'A fechadura cedeu: a porta dos fundos da ' + HOUSE_BY[b.seat].n + ' está aberta para você por 1 minuto.'; if (Math.random() < CS.pickBreak) { p.inv.lockpick = (p.inv.lockpick | 0) - 1; if (p.inv.lockpick <= 0) delete p.inv.lockpick; msg += ' A gazua entortou e não serve mais.'; sendStat(p); } csTell(p, msg); csSendLocks(true); }
  else if (A.k === 'ivy') { if (A.up) { const [x, y] = localToWorld(b, seatWin(b)[0], seatWin(b)[1]); csTp(p, x, y, 1, A.bi); csTell(p, 'Você passa pela janela e cai no corredor do 1º andar.'); } else { const [x, y] = localToWorld(b, ...seatIvyOut(b)); csTp(p, x, y, 0, -1); csTell(p, 'Você desce pela hera até a rua de trás.'); } } } }
function csIvyBase(b) { return localToWorld(b, ...seatIvyOut(b)); }
function csBackOut(b) { const d2 = door2Of(b); return [d2.x + DOOR_V[d2.s][0] * 0.9, d2.y + DOOR_V[d2.s][1] * 0.9]; }
/* o que o criado (ou o Mestre Corvin) conta da rotina de hoje */
function csRoutine(hid) { const h = HOUSE_BY[hid], D = csDay(hid), L = [], nm = id => HOUSE_BY[id] ? HOUSE_BY[id].n : '';
  const vs = D.venues.map(v => CS_VENUE[v] + (v === 'thermae' ? ' (' + THERMAE_HOURS[0] + 'h–' + THERMAE_HOURS[1] + 'h)' : v === 'club' ? ' (' + CLUB_HOURS[0] + 'h–' + CLUB_HOURS[1] + 'h)' : ' (' + VL_HOURS[0] + 'h–meia-noite)'));
  L.push(h.lord + ': salão de dia; hoje sai para ' + vs.join(' e ') + '. Dorme no quarto do casal das ' + CS.sleep[0] + 'h às ' + CS.sleep[1] + 'h.');
  const O = CS_SPOUSE[D.spouse]; L.push(h.spouse + ': fica no quarto do casal; hoje sai para ' + (D.spouse === 'visit' ? 'visitar a ' + nm(D.visitTo) : O.n) + ' das ' + O.h[0] + 'h às ' + O.h[1] + 'h.');
  L.push(h.heir + ': na praça das Casas de dia' + (D.venues.includes('thermae') ? ', nas Termas com o pai das ' + THERMAE_HOURS[0] + 'h às ' + THERMAE_HOURS[1] + 'h' : '') + '; dorme no sótão.');
  L.push(h.serv + ', o criado: mercado das ' + CS_SERV.market[0] + 'h às ' + CS_SERV.market[1] + 'h; leva uma carta à ' + nm(D.letterTo) + ' das ' + CS_SERV.letter[0] + 'h às ' + CS_SERV.letter[1] + 'h; dorme no quarto dele das ' + CS.servSleep[0] + 'h às ' + CS.servSleep[1] + 'h; no resto do tempo anda pelo térreo.');
  L.push('Na porta da frente, dois guardas' + (csAlert(hid) ? ' (hoje um deles ronda por dentro: a casa está de sobreaviso)' : '') + '. Cartas e papéis no escritório do lorde; o cofre no quarto do casal.');
  if (typeof tatClient === 'function') { const C = tatClient(), n = C && C.id && S.npcs[C.id]; if (n && n.house === hid && !C.done) L.push('Hoje ' + n.name.split(',')[0] + ' vai ao estúdio de tatuagem entre ' + TAT_NPC_H[0] + 'h e ' + TAT_NPC_H[1] + 'h.'); }
  return L; }
if (typeof secRoutine === 'function') secRoutine = csRoutine;   /* a rotina que o Corvin vende passa a ser a nova */
function csNote(p, hid) { p.csNotes = p.csNotes || {}; p.csNotes[hid] = { d: estDay(), l: csRoutine(hid) }; csSendNotes(p); }
function csSendNotes(p) { const day = estDay(), N = {}; for (const hid in p.csNotes || {}) if (p.csNotes[hid].d === day) N[hid] = p.csNotes[hid].l; Net.toOne(p.id, { t: 'csnotes', n: N }); }
if (typeof secCorvin === 'function') { const _scC = secCorvin; secCorvin = function (p, m) { const g0 = p.gold; _scC(p, m); if (m.op === 'rt' && p.gold < g0 && HOUSE_BY[m.h]) csNote(p, m.h); }; }
function csMsg(p, m) { if (!S.estate || p.downed) return; const now = now_();
  if (m.a === 'buypick') { const n = S.npcs[m.id]; if (!n || n.vtype !== 'thug' || n.dead || n.downed || dist(n.x, n.y, p.x, p.y) > 3) return; if ((p.gold || 0) < CS.pickPrice) { empSay(n, 'Gazua boa custa ' + CS.pickPrice + '. Some daqui.'); return; }
    if (!p.inv.lockpick && Object.keys(p.inv).length >= INV_SLOTS) { tell(p, 'A mochila está cheia.'); return; } p.gold -= CS.pickPrice; p.inv.lockpick = (p.inv.lockpick | 0) + 1; empSay(n, 'Ninguém te vendeu nada. Entendeu?'); tell(p, 'Você comprou uma gazua (' + CS.pickPrice + ' de ouro). Serve para a porta dos fundos dos casarões; às vezes entorta.'); sendStat(p); return; }
  const b = BUILDINGS[m.bi | 0]; if ((m.a === 'pick' || m.a === 'ivy') && (!b || b.deco !== 'seat')) return;
  if (m.a === 'pick') { if (p.csAct) return; const [ox, oy] = csBackOut(b); if ((p.fl || 0) || dist(p.x, p.y, ox, oy) > 1.4) return; if (!(p.inv.lockpick > 0)) { tell(p, 'A porta dos fundos está trancada. Os marginais da cidade vendem gazuas.'); return; }
    p.csAct = { k: 'pick', bi: m.bi | 0, t0: now, until: now + CS.pickMs, x: p.x, y: p.y, fl: 0 }; Net.toOne(p.id, { t: 'csact', on: 1, k: 'pick', ms: CS.pickMs }); return; }
  if (m.a === 'ivy') { if (p.csAct) return; const up = !!m.up, [bx, by] = csIvyBase(b), [wx, wy] = localToWorld(b, seatWin(b)[0], seatWin(b)[1]);
    if (up ? ((p.fl || 0) || dist(p.x, p.y, bx, by) > 1.3) : ((p.fl || 0) !== 1 || p.fb !== (m.bi | 0) || dist(p.x, p.y, wx, wy) > 1.3)) return;
    p.csAct = { k: 'ivy', up, bi: m.bi | 0, t0: now, until: now + CS.ivyMs, x: p.x, y: p.y, fl: p.fl || 0 }; Net.toOne(p.id, { t: 'csact', on: 1, k: 'ivy', up: up ? 1 : 0, ms: CS.ivyMs }); return; }
  if (m.a === 'serv') { const n = S.npcs[m.id]; if (!n || n.court !== 'house' || n.hrole !== 'serv' || n.dead || n.downed || n.sleeping || dist(n.x, n.y, p.x, p.y) > 3 || (n.fl || 0) !== (p.fl || 0)) return; const hid = n.house, H = hRec(), fav = ((H.favor[estOwner(p)] || {})[hid] || 0);
    let chance; if (m.how === 'free') { if (fav < CS.favorTalk) { empSay(n, 'Não sei de nada, não senhor.'); return; } chance = CS.tellFree; } else { if ((p.gold || 0) < CS.bribe) { empSay(n, 'Hm. Isso custa ' + CS.bribe + ' de ouro.'); return; } p.gold -= CS.bribe; sendStat(p); chance = CS.tellBribe; }
    empSay(n, m.how === 'free' ? 'Para o senhor eu conto. Mas não diga que fui eu.' : 'Fale baixo. Hoje é assim...'); csNote(p, hid); for (const t of csRoutine(hid)) tell(p, t); tell(p, 'Anotado na Jornada (J) até a meia-noite.');
    if (Math.random() < chance) setTimeout(() => { if (!S.players[p.id]) return; hFavor(p, hid, CS.toldFavor, 'o criado contou ao lorde que você perguntou da casa'); S.csAlert = S.csAlert || {}; S.csAlert[hid] = estDay(); tell(p, 'Mais tarde você percebe: ' + n.name.split(',')[0] + ' contou ao lorde. A ' + HOUSE_BY[hid].n + ' fica de sobreaviso hoje: um dos guardas da porta passa a rondar por dentro.'); csSendLocks(true); }, 20000);
    if (typeof estateSave === 'function') estateSave(); return; }
  if (m.a === 'notes') { csSendNotes(p); return; } }
function csTick(now) { if (!S.estate || !HOUSES.length || !csSeat('valcarne')) return; csWatch(now); csActs(now);
  if (now - (S.csLT || 0) > 1000) { S.csLT = now; csSendLocks(now - (S.csLF || 0) > 10000); if (now - (S.csLF || 0) > 10000) S.csLF = now; } }
if (typeof housesTick === 'function') { const _htC = housesTick; housesTick = function (now) { _htC(now); csTick(now); }; }

// ---------------- CLIENTE ----------------
if (typeof LOOT !== 'undefined' && !LOOT.lockpick) LOOT.lockpick = { name: 'Gazua', price: CS.pickPrice, icon: '🗝', color: '#9a9aa2', desc: 'Ferro torto de abrir fechadura. Abre a porta dos fundos dos casarões das casas (F, 4 s); às vezes entorta. Os marginais vendem.' };
function csSeatNear(r) { const me = G.me; if (!me || me.downed) return null; let best = null, bd = r; for (const b of BUILDINGS) { if (b.deco !== 'seat') continue; const d = dist(me.x, me.y, b.x + b.w / 2, b.y + b.h / 2); if (d < bd) { bd = d; best = b; } } return best; }   /* o casarão mais perto */
function csSpot() { const me = G.me, b = csSeatNear(9); if (!b) return null; const bi = BUILDINGS.indexOf(b);
  if (!(me.fl || 0)) { const d2 = door2Of(b), ox = d2.x + DOOR_V[d2.s][0] * 0.9, oy = d2.y + DOOR_V[d2.s][1] * 0.9; if (dist(me.x, me.y, ox, oy) < 1.1) { const open = G.seatL && G.seatL[bi] && G.seatL[bi].b.includes(String(me.name).trim().toLowerCase()); if (open) return null; return { k: 'pick', bi, has: !!(me.inv && me.inv.lockpick > 0) }; }
    const [bx, by] = localToWorld(b, ...seatIvyOut(b)); if (dist(me.x, me.y, bx, by) < 1.0) return { k: 'ivy', bi, up: 1 }; }
  else if (me.fl === 1 && me.fb === bi) { const [wx, wy] = localToWorld(b, seatWin(b)[0], seatWin(b)[1]); if (dist(me.x, me.y, wx, wy) < 1.0) return { k: 'ivy', bi, up: 0 }; }
  return null; }
function csHint() { if (G.csAct) return G.csAct.k === 'pick' ? 'Forçando a fechadura… não se mexa' : 'Escalando a hera… não se mexa'; const s = csSpot(); if (!s) return ''; if (s.k === 'pick') return s.has ? 'F: forçar a porta dos fundos com a gazua (4 s)' : 'Porta dos fundos trancada: precisa de uma gazua (os marginais vendem)'; return s.up ? 'F: subir pela hera até a janela (5 s; quem passar na rua de trás vê)' : 'F: descer pela hera até a rua de trás (5 s)'; }
function csF() { if (G.csAct) return true; const s = csSpot(); if (!s) return false; if (s.k === 'pick') { if (!s.has) { showToast('A porta dos fundos está trancada. Os marginais da cidade vendem gazuas.'); return true; } Net.send({ t: 'casa', a: 'pick', bi: s.bi }); return true; } Net.send({ t: 'casa', a: 'ivy', bi: s.bi, up: s.up }); return true; }
function csBlockedMsg(x, y) { const bi = WORLD.bld[tileAt(x, y)], b = BUILDINGS[bi]; if (!b || b.deco !== 'seat') return; const now = performance.now(); if (now - (G.csMsgT || 0) < 3000) return; G.csMsgT = now; const h = HOUSE_BY[b.seat] || {}, d2 = door2Of(b);
  showToast(d2 && Math.round(x) === d2.x && Math.round(y) === d2.y ? 'A porta dos fundos da ' + (h.n || 'casa') + ' está trancada.' : 'Os guardas da ' + (h.n || 'casa') + ' barram a porta: só entram vassalos da casa ou quem tem ' + CS.favorIn + ' de favor com ela.'); }
if (typeof freeAt === 'function' && typeof G !== 'undefined') { const _faCs = freeAt; freeAt = function (x, y, z) { if (!_faCs(x, y, z)) return false; const me = G.me; if (me && !G.dev && G.seatL && typeof seatBlocked === 'function' && seatBlocked(me.name, me.x, me.y, x, y, G.seatL)) { csBlockedMsg(x, y); return false; } return true; }; }
function csNotesHtml() { const N = G.csNotes || {}, ks = Object.keys(N); if (!ks.length) return ''; return '<div class="gp-sub">Rotinas anotadas (só hoje)</div>' + ks.map(hid => '<div class="cs-note"><b>' + ((HOUSE_BY[hid] || {}).ic || '') + ' ' + ((HOUSE_BY[hid] || {}).n || hid) + '</b><ul>' + N[hid].map(t => '<li>' + t + '</li>').join('') + '</ul></div>').join(''); }
if (typeof updateQuests === 'function' && typeof G !== 'undefined') { const _uqC = updateQuests; updateQuests = function () { _uqC.apply(this, arguments); let d = $('journal-notes'); if (!d) { d = document.createElement('div'); d.id = 'journal-notes'; $('journal').appendChild(d); } d.innerHTML = csNotesHtml(); }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peCs = progEvent; progEvent = function (m, now) {
  if (m.t === 'seatL') { G.seatL = m.L; return true; }
  if (m.t === 'csnotes') { G.csNotes = m.n; try { updateQuests(); } catch (e) { } return true; }
  if (m.t === 'csseen') { if (m.on) showToast('⚠ ' + m.who + ' está ' + csNa(m.room) + '! Saia em ' + Math.round(m.ms / 1000) + ' s' + (m.ms <= CS.seenMs ? ' (agachado, ' + CS.seenCrouchMs / 1000 + ' s)' : '') + '.'); return true; }
  if (m.t === 'csact') { G.csAct = m.on ? { k: m.k, until: performance.now() + m.ms } : null; return true; }
  return _peCs(m, now); }; }
/* marginais vendem gazua; criado da casa conta a rotina */
if (typeof buildDialogOptions === 'function' && typeof G !== 'undefined') { const _bdC = buildDialogOptions; buildDialogOptions = function (id) { _bdC(id); const e = G.npcs[id]; if (!e || !/^v_thug/.test(e.kind || '')) return; const box = $('dlg-opts'), b = document.createElement('button'); b.textContent = 'Psiu… tem gazua? (' + CS.pickPrice + ' de ouro)'; b.onclick = () => Net.send({ t: 'casa', a: 'buypick', id }); box.appendChild(b); }; }
if (typeof houseMenu === 'function' && typeof G !== 'undefined') { const _hmCs = houseMenu; houseMenu = function (m) { _hmCs(m); if (m.role !== 'serv') return; const d = document.getElementById('housemenu'); if (!d) return; const h = (m.l || []).find(x => x.id === m.house) || {}, fav = h.fav || 0, first = m.name.split(',')[0];
  const box = document.createElement('div'); box.className = 'lift-list'; box.innerHTML = '<button class="lift-btn" data-cs="bribe"><span class="lift-n">🪙</span><span><b>Subornar ' + first + ' (' + CS.bribe + ' de ouro)</b><br><small>Ele conta a rotina da casa hoje. Pode contar ao lorde que você perguntou.</small></span></button>' +
    '<button class="lift-btn" data-cs="free"' + (fav < CS.favorTalk ? ' disabled' : '') + '><span class="lift-n">🤝</span><span><b>Perguntar pela rotina da casa</b><br><small>' + (fav < CS.favorTalk ? 'Precisa de ' + CS.favorTalk + ' de favor com a casa (você tem ' + fav + ').' : 'De graça: você tem a confiança da casa.') + '</small></span></button>';
  d.appendChild(box); box.querySelectorAll('[data-cs]').forEach(b => b.onclick = () => { d.remove(); Net.send({ t: 'casa', a: 'serv', id: m.id, how: b.dataset.cs }); }); }; }
