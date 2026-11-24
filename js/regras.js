// ============================================================
//  PARTE J: mudanças em regras que já estavam no jogo.
//  51 prova da bastardia (cartas da Rainha Isolda ao amante, no aposento real) · 52 o Vesper, chefe do submundo
//  (proteção e capangas para o cerco) · 53 a Rainha Isolda e o temperamento do Corwyn · 54 título de
//  Lorde mais caro e incerto · 56 rotina do rei à tarde (conselho e jantar) · 57 invasão no castelo ·
//  58 todos os nobres envelhecem · 59 até cinco seguranças.
// ============================================================
const RG = { lordFee: 5000, lordRep: 50, lordChance: 0.6, lordWait: 5, protPct: 0.1, protMin: 10, mercPrice: 200, mercMax: 6, vesperGone: 3, searchMs: 3000, seeMs: 2000, seeCrouchMs: 4000, seeDist: 5, sickDay: 20, old: 60, sick: 0.05, warnDays: 2, corwynLoyal: 0.4,
  ages: { lord: [38, 55], spouse: [36, 54], heir: [18, 28] }, council: [12, 14], dinner: [19, 21], sleep: [22, 6] };
/* a Rainha Isolda é a mãe do Alaric e da Lyra (o segredo da bastardia é sobre ela) */
const RG_QUEEN = { id: 'k_queen', kind: 'k_queen', name: 'Rainha Isolda Aurenfell', role: 'queen', day: [0, 11.5, 3.6], off: [4, 11.5, 2.6] };
const RG_LETTER = [6.5, 1.4];   /* gaveta do aposento real (andar 4 do castelo) */
if (typeof COURT !== 'undefined' && !COURT.some(d => d.id === 'k_queen')) COURT.push(RG_QUEEN);
if (typeof CROWN_TITLES !== 'undefined' && CROWN_TITLES[3]) CROWN_TITLES[3].fee = RG.lordFee;
if (typeof LOOT !== 'undefined' && !LOOT.bproof) LOOT.bproof = { name: 'Cartas da Rainha Isolda', price: 0, icon: '✉', color: '#c9a24a', desc: 'Cartas de amor da Rainha Isolda a um homem da corte, com datas que não deixam dúvida: o Príncipe Alaric não é filho do Rei Edric. Leve ao Meistre Aldous ou à Irmã Lúmina.' };

// ---------------- SERVIDOR ----------------
function rgRec() { const E = S.estate; if (!E.regras) E.regras = { prot: {}, merc: {}, lordNo: {}, ages: null, sick: {}, widow: {} }; return E.regras; }
const rgIn = (h, w) => w[0] < w[1] ? h >= w[0] && h < w[1] : h >= w[0] || h < w[1];
/* ---- 53: a rainha vira rainha-mãe; o Corwyn tem um temperamento sorteado por reino ---- */
function rgCorwyn() { const U = sucRec(); if (!U.corwynT) U.corwynT = Math.random() < RG.corwynLoyal ? 'leal' : 'ambicioso'; return U.corwynT; }
if (typeof sucApplyKing === 'function') { const _saG = sucApplyKing; sucApplyKing = function (k) { const prev = sucRec().king; _saG(k); try {
  if (prev === 'edric') { const d = COURT.find(x => x.id === 'k_queen'); if (d && !/Mãe/.test(d.name)) { d.name = 'Isolda Aurenfell, a Rainha-Mãe'; const n = S.npcs.k_queen; if (n) visGone(n); } }
  if (k.startsWith('h:') && HOUSE_BY[k.slice(2)] && !HOUSE_BY[k.slice(2)].player) { const A = rgAges()[k.slice(2)]; if (A) sucRec().kage0 = rgAge(A.lord); } } catch (e) { } }; }
if (typeof sgRebelNow === 'function') { const _srG = sgRebelNow; sgRebelNow = function () { try { const nx = sucLine()[0]; if (nx === 'corwyn' && S.estate && rgCorwyn() === 'leal') return null; } catch (e) { } return _srG.apply(this, arguments); }; }   /* leal: nunca se rebela contra o herdeiro */
if (typeof secText === 'function') { const _stG = secText; secText = function (hid, k) { if (hid === 'crown' && k === 'corwynT') return rgCorwyn() === 'leal' ? 'Lorde Corwyn jurou pelo túmulo da mãe que nunca levantará a espada contra o sobrinho. Quer o trono, mas só se vier pela lei.' : 'Lorde Corwyn não voltou para servir: está esperando a primeira fraqueza do sobrinho para tomar o trono.';
  if (hid === 'crown' && k === 'bastard') return 'O Príncipe Alaric não é filho do Rei Edric: a Rainha Isolda teve um amante na corte. As cartas dela estariam escondidas no aposento real.'; return _stG(hid, k); }; }
if (typeof SEC_W !== 'undefined') { SEC_W.corwynT = 3; SEC_KN.corwynT = 'o temperamento de Lorde Corwyn'; } if (typeof CV_SELL !== 'undefined') CV_SELL.corwynT = 35;
if (typeof secRandom === 'function') { const _srnG = secRandom; secRandom = function (p, pref) { try { const R = rgRec(), U = sucRec(); if (!R.corwynOut && U.corwynIn && U.alive.corwyn && Math.random() < 0.25) { R.corwynOut = 1; rgCorwyn(); return ['crown', 'corwynT']; } } catch (e) { } return _srnG(p, pref); }; }
/* ---- 51: a prova da bastardia ---- */
function rgProof() { const U = sucRec(); return !!U.bastardProven; }
if (typeof sucLine === 'function') { const _slG = sucLine; sucLine = function () { const L = _slG(); try { if (rgProof()) return L.filter(k => k !== 'alaric'); } catch (e) { } return L; }; }
if (typeof infDaily === 'function') { const _idG = infDaily; infDaily = function () { const r = _idG.apply(this, arguments); try { if (rgProof()) { const I = infRec(); I.faith.aurenfell = Math.min(I.faith.aurenfell, -40); } } catch (e) { } return r; }; }   /* a Fé condena para sempre */
function rgLetterSpot() { const b = castleB(); return b ? localToWorld(b, RG_LETTER[0], RG_LETTER[1]) : null; }
function rgDeliver(p, who) { if (!(p.inv.bproof > 0)) return; const U = sucRec(); p.inv.bproof--; if (!p.inv.bproof) delete p.inv.bproof; sendStat(p); if (U.bastardProven) { tell(p, 'Todos já sabem. A carta não muda mais nada.'); return; }
  U.bastardProven = 1; trRec().bastard = 1; if (U.king === 'alaric') U.kingSin = 'bastardo';
  const I = infRec(); I.faith.aurenfell = Math.min(I.faith.aurenfell, -40); for (const pl of INF_PLACES) infAdd('aurenfell', pl.id, -10);
  sys('⛪ ' + who + ' leu as cartas da Rainha Isolda diante de testemunhas: o ' + (U.king === 'alaric' ? 'Rei' : 'Príncipe') + ' Alaric é bastardo. A Fé o condena para sempre' + (U.king === 'alaric' ? ', e os Irmãos Descalços já falam em apoiar quem se levantar contra ele.' : ', e ele sai da linha de sangue.'));
  hNews('Prova da bastardia: o Alaric não é filho do Rei Edric. ' + (U.king === 'alaric' ? 'Ele continua no trono, condenado pela Fé.' : 'A linha de sangue segue sem ele.')); repAdd(p, 'nobres', 5, 'revelou a verdade sobre o herdeiro'); estateSave(); }
/* ---- 52: o Vesper cobra proteção e aluga capangas; a Guarda pode tirá-lo da viela ---- */
function rgIncome(key) { const E = estateLoad(); let s = 0; for (const pid in E.r) { const r = E.r[pid]; if (r.owner !== key || !r.biz || !r.biz.hist || !r.biz.hist.length) continue; s += Math.max(0, r.biz.hist[r.biz.hist.length - 1].rev || 0); } return s; }
function rgProtCost(p) { const v = Math.max(RG.protMin, Math.round(rgIncome(estOwner(p)) * RG.protPct)); return typeof tatKnown === 'function' && tatHas(p, 'under') && tatRec(p)['under+'] ? Math.ceil(v / 2) : v; }
function rgProtDay() { const R = rgRec(); for (const key in R.prot) { const P = R.prot[key]; if (!P.on) continue; const q = Object.values(S.players).find(o => estOwner(o) === key) || null, v = P.cost || RG.protMin;
    if (debit(key, q, v)) { if (q) { tell(q, 'O Vesper recolheu a proteção: −' + v + ' de ouro. Os gatunos não mexem com você.'); sendStat(q); } } else { P.on = 0; if (q) tell(q, 'Você não pagou o Vesper. A proteção acabou: cuidado com a bolsa.'); } } }
if (typeof tatKnown === 'function') { const _tkG = tatKnown; tatKnown = function (p, f) { if (f === 'under' && p && S.estate) { const P = rgRec().prot[estOwner(p)]; if (P && P.on) return true; } return _tkG(p, f); }; }   /* pagar proteção = a marca do submundo reconhecida */
function rgVesperGone() { const R = rgRec(); return R.vesperBack && estDay() < R.vesperBack; }
if (typeof trMenu === 'function') { const _tmG = trMenu; trMenu = function (p) { _tmG(p); try { const P = rgRec().prot[estOwner(p)] || {}, M = rgRec().merc[estOwner(p)] || 0; Net.toOne(p.id, { t: 'rgvesper', prot: P.on ? 1 : 0, cost: rgProtCost(p), merc: M, price: RG.mercPrice, max: RG.mercMax, gold: p.gold | 0 }); } catch (e) { } }; }
if (typeof sgStart === 'function') { const _ssG = sgStart; sgStart = function (R) { const r = _ssG(R); try { const S0 = sgRec(), RR = rgRec(); let i = 70;   /* os capangas alugados entram do lado que o jogador apoia */
  for (const key in RR.merc) { const n = RR.merc[key] | 0; if (!n) continue; const side = hRec().vow[key] === S0.troop ? 'r' : 'd', [gx, gy] = sgGate(); for (let k = 0; k < n; k++) { const before = new Set(Object.keys(S.npcs)); sgSpawn(side, i++, [gx, gy + (side === 'r' ? 3 : -6)]); const nid = Object.keys(S.npcs).find(x => !before.has(x)); if (nid) { const m = S.npcs[nid]; m.name = 'Capanga do Vesper'; m.kind = 'v_thug'; m.loyal = 100; visGone(m); S.npcs[nid] = m; Net.toAll({ t: 'vspawn', v: visPublic(m) }); } }
    delete RR.merc[key]; const q = Object.values(S.players).find(o => estOwner(o) === key); if (q) tell(q, 'Os ' + n + ' capangas do Vesper chegaram ao castelo e lutam pelo lado ' + (side === 'r' ? 'rebelde' : 'da coroa') + '.'); } } catch (e) { } return r; }; }
/* ---- 54: o título de Lorde ---- */
function rgNobleRep(p) { return ((p.feats || {}).rg || {}).nobres || 0; }
if (typeof courtMsg === 'function') { const _cmG = courtMsg; courtMsg = function (p, m) { try { if (m && m.a === 'title' && S.audCall && S.audCall.id === p.id) { const C = crownRec(), k = crownKey(p), t = (C.title[k] | 0) + 1, R = rgRec();
    if (t === 3) { const dama = typeof cpRec === 'function' && cpRec().dama === k, n = S.npcs[m.id];
      if (R.lordNo[k] && estDay() < R.lordNo[k]) { tell(p, 'O rei já recusou o seu pedido. Volte daqui a ' + (R.lordNo[k] - estDay()) + ' dia(s).'); return; }
      if (!dama && rgNobleRep(p) < RG.lordRep) { tell(p, 'Para o título de Lorde é preciso reputação ' + RG.lordRep + ' com a Nobreza (você tem ' + Math.round(rgNobleRep(p)) + '). Tarefas e doações às casas, contratos reais e a presença nas coroações ajudam.'); return; }
      if ((C.favor[k] || 0) >= CROWN_TITLES[3].favor && (p.gold || 0) >= CROWN_TITLES[3].fee && !dama && Math.random() >= RG.lordChance) { R.lordNo[k] = estDay() + RG.lordWait; estateSave(); if (n) empSay(n, 'Ainda não. A coroa não faz Lordes à toa.'); tell(p, 'O rei recusou o título de Lorde. Você pode pedir de novo em ' + RG.lordWait + ' dias.'); return; }
      const r = _cmG(p, m); if (dama && (C.title[k] | 0) >= 3 && cpRec().dama === k) { cpRec().dama = null; tell(p, 'A Dama Ysolde falou por você: o pedido à Dama foi usado.'); } return r; } } } catch (e) { } return _cmG(p, m); }; }
/* fontes novas de reputação com a Nobreza */
if (typeof hFavor === 'function') { const _hfG = hFavor; hFavor = function (p, id, n, why) { const r = _hfG(p, id, n, why); try { if (why === 'tarefa cumprida') repAdd(p, 'nobres', 3, 'serviço a uma casa nobre'); else if (why === 'doação' && n > 0) repAdd(p, 'nobres', n >= 8 ? 2 : 1, 'doação a uma casa nobre'); } catch (e) { } return r; }; }
if (typeof crownFavor === 'function') { const _cfG = crownFavor; crownFavor = function (p, n, why) { const r = _cfG(p, n, why); try { if (why === 'contrato real cumprido') repAdd(p, 'nobres', 3, 'contrato da coroa'); else if (/^esteve na coroação/.test(why || '')) repAdd(p, 'nobres', 5, 'presença na coroação'); else if (why === 'doação ao tesouro') repAdd(p, 'nobres', 1); } catch (e) { } return r; }; }
/* ---- 56: a rotina do rei à tarde ---- */
const RG_COUNCIL = { king: [2, 1.5, 2.6], hand: [2, 5.5, 2.6], coin: [2, 2.5, 1.5], cmd: [2, 4.5, 1.5], maester: [2, 3.5, 4.5], whisper: [2, 7.6, 3.4] };
const RG_DINNER = { king: [1, 2.5, 10.5], queen: [1, 0.5, 10.5], prince: [1, 2.5, 11.5], princess: [1, 0.5, 11.5], hand: [1, 2.5, 12.5] };
if (typeof courtPost === 'function') { const _cpG = courtPost; courtPost = function (def, now) { const P = _cpG(def, now); try { if (!S.estate) return P; const U = sucRec(), C = crownRec(), h = empHour();
  if ((C.siege && C.siege.on) || (U.stage && U.stage !== 'done') || def.id.startsWith('cg_') || (P && typeof P[1] === 'string' && P[1] !== 'throne')) return P;   /* compromisso fora do castelo (o conselheiro do dia no Clube) vale mais */
  const role = def.id === 'k_queen' ? 'queen' : def.role, kingOk = !C.bad;
  if (rgIn(h, RG.council) && RG_COUNCIL[role] && (role !== 'king' || kingOk) && !(role === 'hand' && !kingOk)) return RG_COUNCIL[role];
  if (rgIn(h, RG.dinner) && RG_DINNER[role] && (role !== 'king' || kingOk)) return RG_DINNER[role];
  if (role === 'king' && rgIn(h, RG.sleep)) return def.off; } catch (e) { } return P; }; }
/* ---- 57: invasão no castelo ---- */
function rgCastleAllowed(q) { const C = crownRec(), t = C.title[crownKey(q)] | 0, fl = q.fl || 0, h = empHour(), night = h >= 21 || h < 6;
  if (q.dev || q.kjail || q.downed || (C.siege && C.siege.on) || t >= 3 || (typeof rkIsKing === 'function' && rkIsKing(q)) || (typeof cgRoleOf === 'function' && cgRoleOf(crownKey(q))) || (typeof cpRec === 'function' && cpRec().dama === crownKey(q) && false) || q.rgWorker) return true;
  if (night) return false; if (fl === 0) return true; if (fl === 1) return t >= 1; if (fl === 2) return t >= 2; return false; }
function rgInCastle(q) { const bi = castleBi(); return (q.fl || 0) ? q.fb === bi : WORLD.bld[tileAt(q.x, q.y)] === bi; }
function rgCastleWatch(now) { const bi = castleBi(); for (const q of Object.values(S.players)) { if (!rgInCastle(q) || rgCastleAllowed(q)) { q.rgSeen = null; continue; }
    const w = Object.values(S.npcs).find(n => n.court && n.court !== 'siege' && !n.dead && !n.downed && !n.sleeping && (n.fl || 0) === (q.fl || 0) && ((n.fl || 0) ? n.fb === bi : WORLD.bld[tileAt(n.x, n.y)] === bi) && dist(n.x, n.y, q.x, q.y) < RG.seeDist);
    if (!w) { if (q.rgSeen) { q.rgSeen = null; Net.toOne(q.id, { t: 'csseen', on: 0 }); } continue; }
    if (!q.rgSeen) { q.rgSeen = { t: now, n: w.id }; Net.toOne(q.id, { t: 'csseen', on: 1, ms: q.crouch ? RG.seeCrouchMs : RG.seeMs, name: w.name.split(',')[0] }); continue; }
    if (now - q.rgSeen.t >= (q.crouch ? RG.seeCrouchMs : RG.seeMs)) { q.rgSeen = null; Net.toOne(q.id, { t: 'csseen', on: 0 }); empSay(w, ['Invasor! Guardas!', 'O que você faz aqui? Fora!', 'Ninguém entra aqui sem permissão!'][Math.floor(Math.random() * 3)]);
      const x = CENTER + 0.5, y = CENTER - 1.4; q.x = x; q.y = y; q.z = 0; q.fl = 0; q.fb = -1; q.sit = null; q.sleep = null; Net.toOne(q.id, { t: 'tp', x, y, z: 0, fl: 0, fb: -1 });
      q.wanted = now_() + 300000; crimeSentence(q, 'trespass'); Net.toAll({ t: 'wanted', id: q.id, ms: 300000 }); tell(q, w.name.split(',')[0] + ' viu você onde não devia: posto para fora do castelo e procurado por invasão.'); sendStat(q); } } }
/* ---- 58: todos os nobres envelhecem ---- */
const rgR = (a) => a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1));
function rgAges() { const R = rgRec(), born = typeof cpRec === 'function' ? cpRec().born : 0; if (!R.ages || R.agesBorn !== born) { R.ages = {}; R.agesBorn = born; for (const h of HOUSES) R.ages[h.id] = { lord: rgR(RG.ages.lord), spouse: rgR(RG.ages.spouse), heir: rgR(RG.ages.heir) }; R.sick = {}; R.widow = {}; } return R.ages; }
/* idade: adultos envelhecem 1 ano a cada 3 dias do jogo; crianças 1 ano por dia até os 20. Um número é a idade no 1º dia do reino; {a, d} é a idade a no dia d */
const AGE_ADULT_DAYS = 3, AGE_ADULT = 20;
function ageOf(v, rd) { rd = rd == null ? (typeof sucRealmDay === 'function' ? sucRealmDay() : 1) : rd; const a = typeof v === 'number' ? v : (v && v.a) || 0, d0 = typeof v === 'number' ? 1 : (v && v.d) || 1, dd = Math.max(0, rd - d0);
  if (a < AGE_ADULT) { const k = Math.min(dd, AGE_ADULT - a); return a + k + Math.floor((dd - k) / AGE_ADULT_DAYS); } return a + Math.floor(dd / AGE_ADULT_DAYS); }
const ageNow = a => ({ a, d: typeof sucRealmDay === 'function' ? sucRealmDay() : 1 });
function rgAge(a0) { return ageOf(a0); }
function rgDaily() { const A = rgAges(), R = rgRec(), day = estDay(), rd = sucRealmDay();
  for (const h of HOUSES) { const a = A[h.id]; if (!a) continue; if (sucRec().king === 'h:' + h.id) continue;   /* o rei da casa já envelhece pela sucessão */
    for (const role of ['lord', 'spouse', 'heir']) { const key = h.id + ':' + role, sk = R.sick[key]; if (role === 'spouse' && R.widow[h.id]) continue;
      if (sk) { if (day >= sk) { delete R.sick[key]; rgDie(h, role); } continue; }
      if (rd >= RG.sickDay && rgAge(a[role]) >= RG.old && Math.random() < RG.sick) { R.sick[key] = day + RG.warnDays; const nm = role === 'lord' ? h.lord : role === 'spouse' ? h.spouse : h.heir; hNews(nm + ' (' + rgAge(a[role]) + ' anos) adoeceu: o meistre da casa diz que não passa de dois dias.'); } } } estateSave(); }
function rgDie(h, role) { const A = rgAges()[h.id], R = rgRec();
  if (role === 'lord') { const heirAge = A.heir; trLordDead(h.id, 'a idade e a doença'); if (typeof lnTakeHeir !== 'function') { A.lord = heirAge; A.heir = ageNow(rgR(RG.ages.heir)); } return; }   /* com as linhagens, o trLordDead já cuida das idades e do herdeiro */
  if (role === 'spouse') { const nm = h.spouse; R.widow[h.id] = 1; for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.house === h.id && n.hrole === 'spouse') visGone(n); hNews(nm + ' morreu de velhice. ' + h.lord + ' está viúvo.'); sys('Notícia: ' + nm + ' morreu.'); return; }
  if (typeof lnTakeHeir === 'function') { const old0 = h.heir; if (lnTakeHeir(h)) { hNews(old0 + ' morreu de doença. ' + h.heir + ' é o novo herdeiro da ' + h.n + '.'); sys('Notícia: ' + old0 + ' morreu.'); return; } }
  const old = h.heir, L = (typeof TR_HEIR2 !== 'undefined' && TR_HEIR2[h.id]) || [], used = trRec().names[h.id] ? (trRec().names[h.id].gen || 0) : 0, nn = L[Math.min(L.length - 1, used + 1)] || ('Herdeiro da ' + h.n);
  h.heir = nn.replace(/^Lorde |^Lady /, ''); A.heir = ageNow(rgR(RG.ages.heir)); for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.house === h.id && n.hrole === 'heir') visGone(n);
  hNews(old + ' morreu de doença. ' + h.heir + ' é o novo herdeiro da ' + h.n + '.'); sys('Notícia: ' + old + ' morreu.'); }
if (typeof hPost === 'function') { const _hpG = hPost; hPost = function (def, n) { try { if (n.hrole === 'spouse' && S.estate && rgRec().widow[n.house]) return null; } catch (e) { } return _hpG(def, n); }; }
if (typeof housePublic === 'function') { const _hpuG = housePublic; housePublic = function (p) { const o = _hpuG(p); try { const A = rgAges(); for (const h of o.l) { const a = A[h.id]; if (a && !h.player) h.lord = h.lord + ' · ' + rgAge(a.lord) + ' anos' + (rgRec().widow[h.id] ? ' · viúvo' : ''); } } catch (e) { } return o; }; }
/* ---- tick e mensagens ---- */
function rgTick(now) { if (!S.estate || !castleB() || now - (S.rgT || 0) < 250) return; S.rgT = now; const R = rgRec();
  if (R.day !== estDay()) { const first = !R.day; R.day = estDay(); rgAges(); if (!first) { rgProtDay(); rgDaily(); } }
  rgCastleWatch(now);
  for (const q of Object.values(S.players)) { const A = q.rgAct; if (!A) continue; if (dist(q.x, q.y, A.x, A.y) > 0.6 || q.downed) { q.rgAct = null; Net.toOne(q.id, { t: 'csact', on: 0 }); tell(q, 'Você se mexeu e largou a busca.'); continue; }
    if (now >= A.until) { q.rgAct = null; Net.toOne(q.id, { t: 'csact', on: 0 }); const U = sucRec(), TRr = trRec(); if (TRr.bastardOut && !U.proofTaken && !U.bastardProven) { U.proofTaken = 1; q.inv.bproof = (q.inv.bproof || 0) + 1; sendStat(q); tell(q, 'No fundo falso da gaveta: um maço de cartas da Rainha Isolda. A prova da bastardia está com você. Leve ao Meistre Aldous ou à Irmã Lúmina.'); estateSave(); } else tell(q, 'Só roupas e lenços. Nada que interesse.'); } } }
if (typeof trSmug === 'function') { const _tsG = trSmug; trSmug = function () { if (S.estate && rgVesperGone()) { if (S.npcs.tr_smug) visGone(S.npcs.tr_smug); return; } return _tsG.apply(this, arguments); }; }   /* a batida da Guarda tira o Vesper da viela por uns dias */
if (typeof housesTick === 'function') { const _htG = housesTick; housesTick = function (now) { _htG(now); rgTick(now); }; }
/* a regra antiga da noite (aviso e expulsão) dá lugar à invasão */
function rgMsg(p, m) { const R = rgRec(), k = estOwner(p);
  if (m.a === 'search') { const s = rgLetterSpot(); if (!s || (p.fl || 0) !== 4 || p.fb !== castleBi() || dist(p.x, p.y, s[0], s[1]) > 1.4 || p.rgAct) return; p.rgAct = { until: now_() + RG.searchMs, x: p.x, y: p.y }; Net.toOne(p.id, { t: 'csact', on: 1, k: 'rgsearch', ms: RG.searchMs }); return; }
  if (m.a === 'deliver') { const n = S.npcs[m.id] || S.npcs.priest; if (!n || dist(n.x, n.y, p.x, p.y) > 3) return; rgDeliver(p, n.name.split(',')[0]); return; }
  const vs = S.npcs.tr_smug, nearV = vs && dist(vs.x, vs.y, p.x, p.y) <= 3;
  if (m.a === 'prot' && nearV) { const P = R.prot[k] || (R.prot[k] = {}); if (P.on) { P.on = 0; empSay(vs, 'Você que sabe. A cidade é perigosa.'); } else { const c = rgProtCost(p); if ((p.gold || 0) < c) { tell(p, 'A primeira parcela é ' + c + ' de ouro.'); return; } p.gold -= c; sendStat(p); P.on = 1; P.cost = c; P.since = estDay(); empSay(vs, 'Fechado. Ninguém mexe com quem paga.'); tell(p, 'Proteção do Vesper: ' + c + ' de ouro por dia (10% da renda dos seus negócios). Os gatunos não roubam você.'); } estateSave(); trMenu(p); return; }
  if (m.a === 'merc' && nearV) { const n = Math.max(1, Math.min(RG.mercMax - (R.merc[k] | 0), m.n | 0)), v = n * RG.mercPrice; if (n <= 0) return; if ((p.gold || 0) < v) { tell(p, n + ' capangas custam ' + v + ' de ouro.'); return; } p.gold -= v; sendStat(p); R.merc[k] = (R.merc[k] | 0) + n; estateSave(); empSay(vs, 'Quando o castelo pegar fogo, eles aparecem do seu lado.'); trMenu(p); return; }
  if (m.a === 'denounce') { const c = S.npcs.captain || Object.values(S.npcs).find(n => n.kind === 'captain'); if (!c || dist(c.x, c.y, p.x, p.y) > 3.5) return; if (rgVesperGone()) { tell(p, 'A Guarda já espantou o Vesper da viela.'); return; } R.vesperBack = estDay() + RG.vesperGone; estateSave(); if (S.npcs.tr_smug) visGone(S.npcs.tr_smug); empSay(c, 'Vamos fazer uma visita àquela viela.'); sys('A Guarda fez uma batida na viela da taverna: o Vesper sumiu por uns dias.'); repAdd(p, 'guarda', 4, 'denunciou o submundo'); return; } }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') { NPC_LOOKS.k_queen = () => Object.assign(heroLook('mage', 'adept', '#5a1a2a'), { armor: 'robe', body: tone('#6a1a2a'), body2: tone('#3a0e18'), accent: tone('#f1cf6a'), trim: tone('#f1cf6a'), head: 'crown', headTone: tone('#f1cf6a'), hair: tone('#8a6a4a'), hairStyle: 'long', beard: null, weapon: null, orb: null, cape: true, capeTone: tone('#4a0e18') });
  if (typeof FEM_KINDS !== 'undefined' && FEM_KINDS.add) FEM_KINDS.add('k_queen'); if (typeof NPC_CLS !== 'undefined') NPC_CLS.k_queen = 'mage'; }
if (typeof COURT_LINES !== 'undefined') COURT_LINES.queen = ['O rei confia em poucos. Eu também.', 'Esta corte sorri de dia e afia facas à noite.', 'Cuido do que o rei esquece de cuidar.'];
function rgLetterNear() { const me = G.me; if (!me || (me.fl || 0) !== 4 || typeof castleB !== 'function') return false; const b = castleB(); if (!b || me.fb !== BUILDINGS.indexOf(b)) return false; const [x, y] = localToWorld(b, RG_LETTER[0], RG_LETTER[1]); return dist(me.x, me.y, x, y) < 1.3; }
if (typeof csHint === 'function') { const _chG = csHint; csHint = function () { if (G.csAct && G.csAct.k === 'rgsearch') return 'Revirando a gaveta… não se mexa'; if (rgLetterNear()) return 'F: revirar a gaveta do aposento real'; return _chG(); }; }
if (typeof csF === 'function') { const _cfG = csF; csF = function () { if (!G.csAct && rgLetterNear()) { Net.send({ t: 'regras', a: 'search' }); return true; } return _cfG(); }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peG2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'rgvesper') { const d = document.getElementById('tequip'); if (d) { const box = document.createElement('div'); box.innerHTML = '<div class="vel-sub">O chefe do submundo</div><div class="tq-btns"><button class="est-btn" data-rgp>' + (m.prot ? 'Parar de pagar proteção' : 'Pagar proteção') + '<small>' + (m.prot ? 'os gatunos voltam a mexer com você' : m.cost + ' de ouro por dia: os gatunos não roubam você') + '</small></button><button class="est-btn ghost" data-rgm' + (m.merc >= m.max || m.gold < m.price ? ' disabled' : '') + '>Alugar um capanga para o próximo cerco<small>' + m.price + ' de ouro · contratados: ' + m.merc + ' de ' + m.max + '</small></button></div>';
      d.appendChild(box); box.querySelector('[data-rgp]').onclick = () => Net.send({ t: 'regras', a: 'prot' }); box.querySelector('[data-rgm]').onclick = () => Net.send({ t: 'regras', a: 'merc', n: 1 }); } return true; }
  const r = _peG2(m, now);
  if (m.t === 'courtmenu' && m.id === 'k_maester' && G.me && G.me.inv && G.me.inv.bproof > 0) { const d = document.getElementById('courtmenu'); if (d) { const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">✉</span><span><b>Mostrar as cartas da Rainha Isolda</b><br><small>A prova de que o Alaric não é filho do rei.</small></span>'; bt.onclick = () => { d.remove(); Net.send({ t: 'regras', a: 'deliver', id: m.id }); }; d.appendChild(bt); } }
  return r; }; }
if (typeof buildDialogOptions === 'function' && typeof G !== 'undefined') { const _bdG = buildDialogOptions; buildDialogOptions = function (id) { const r = _bdG.apply(this, arguments); try { const e = G.npcs[id], box = $('dlg-opts'); if (!e || !box) return r;
  if (e.kind === 'priest' && G.me && G.me.inv && G.me.inv.bproof > 0) { const b = document.createElement('button'); b.textContent = '✉ Mostrar as cartas da Rainha Isolda'; b.onclick = () => { closeDialog(); Net.send({ t: 'regras', a: 'deliver', id }); }; box.appendChild(b); }
  if (e.kind === 'captain') { const b = document.createElement('button'); b.textContent = '⚖ Denunciar o Vesper, da viela da taverna'; b.onclick = () => { closeDialog(); Net.send({ t: 'regras', a: 'denounce' }); }; box.appendChild(b); } } catch (er) { } return r; }; }
