// ============================================================
//  PARTE M: o castelo por dentro. Acesso por zonas (o térreo aberto de dia; os andares de cima só com
//  cargo, trabalho no castelo ou convite; o subsolo só para guardas, carcereiro e torturador). O rei no
//  trono das 9h às 12h e das 14h às 17h, com a fila do arauto nos dois turnos. Trabalhos no castelo por
//  contrato de 3 dias com o chefe de cada ofício (guarda real, serviçal, escriba, carcereiro, torturador),
//  com turnos pagos, acesso à área e um poder de cada um. Presos no calabouço (crimes contra a coroa e
//  nobres; presos NPC: espiões, rebeldes, capangas) e tortura: 40% de arrancar um segredo por sessão,
//  ferimentos, e na terceira sessão o preso pode morrer (jogador só desmaia).
// ============================================================
const KC = { thr: [[9, 12], [14, 17]], contract: 3, shiftMs: 75000, inviteFavor: 30, torture: 0.4, deathAt: 3, deathChance: 0.5, scribeSec: 0.1, maxNpcPris: 2,
  jobs: { guard: { n: 'Guarda real', boss: 'k_cmd', pay: 40, fl: [-2, -1, 0, 1, 2, 3, 4], night: 1 }, serv: { n: 'Serviçal', boss: 'k_cook', pay: 30, fl: [0, 1, 3, 4] }, scribe: { n: 'Escriba', boss: 'k_maester', pay: 35, fl: [0, 2] }, jailer: { n: 'Carcereiro', boss: 'k_jailer', pay: 35, fl: [-2, -1, 0], night: 1 }, torturer: { n: 'Torturador', boss: 'k_jailer', pay: 45, fl: [-2, -1, 0] } },
  crownCrimes: /realeza|traição|rebeli|regic/i };

// ---------------- SERVIDOR ----------------
function kcRec() { const C = crownRec(); if (!C.castle) C.castle = { job: {}, inv: {}, pris: [], seq: 0 }; return C.castle; }
function kcJob(q) { const J = kcRec().job[crownKey(q)]; return J && estDay() <= J.until ? J : null; }
const kcIn = (h, w) => h >= w[0] && h < w[1];
function kcThrone(h) { return KC.thr.some(w => kcIn(h, w)); }
/* ---- 74: acesso por zonas ---- */
if (typeof rgCastleAllowed === 'function') { rgCastleAllowed = function (q) { const C = crownRec(), fl = q.fl || 0, h = empHour(), night = h >= 21 || h < 6, k = crownKey(q);
  if (q.dev || q.kjail || q.downed || (C.siege && C.siege.on) || (typeof rkIsKing === 'function' && rkIsKing(q)) || q.rgWorker) return true;
  { const M = typeof mrOf === 'function' ? mrOf(estOwner(q)) : null; if (M && M.kind === 'npc' && M.who && String(M.who.id).startsWith('r:') && !M.dead) return true; }   /* casado com a família real: mora no castelo, entra e sai a qualquer hora, subsolo incluído */
  const role = typeof cgRoleOf === 'function' ? cgRoleOf(k) : null; if (role) return fl >= 0 || role === 'cmd';
  const J = kcJob(q); if (J) { const D = KC.jobs[J.j]; if (D.fl.includes(Math.max(-2, Math.min(4, fl))) && (!night || D.night || J.j === 'serv')) return true; }
  if (night) return false; if (fl === 0) return true;
  if ((fl === 1 || fl === 2) && kcRec().inv[k] === estDay()) return true;
  return false; }; }
/* ---- 75/76: o rei no trono das 9h às 12h e das 14h às 17h; a fila do arauto nos dois turnos ---- */
if (typeof audienceOpen === 'function') audienceOpen = function () { return kcThrone(empHour()); };
if (typeof courtPost === 'function') { const _cpM = courtPost; courtPost = function (def, now) { const P = _cpM(def, now); try { if (!S.estate || def.role !== 'king' || def.id !== 'k_king') return P; const U = sucRec(), C = crownRec(), h = empHour();
  if ((C.siege && C.siege.on) || (U.stage && U.stage !== 'done') || !P || P[1] !== 'throne') return P; if (!kcThrone(h)) return def.off; } catch (e) { } return P; }; }
if (typeof courtMsg === 'function') { const _cmM = courtMsg; courtMsg = function (p, m) { const n = m && m.id && S.npcs[m.id]; if (n && n.court === 'herald' && m.a === 'queue' && !audienceOpen()) { tell(p, 'As audiências são das 9h às 12h e das 14h às 17h, quando o rei está no trono.'); return; } return _cmM(p, m); }; }
/* ---- convite: a Mão do Rei dá um passe do dia para a ala do conselho (1º e 2º andares) ---- */
function kcInvite(p) { const n = S.npcs.k_hand, k = crownKey(p); if (!n || dist(n.x, n.y, p.x, p.y) > 3.5 || (n.fl || 0) !== (p.fl || 0)) { tell(p, 'Fale com a Mão do Rei.'); return; } const fav = crownRec().favor[k] || 0;
  if (fav < KC.inviteFavor) { empSay(n, 'A ala do conselho não é passeio. Volte quando a coroa o conhecer melhor (favor ' + KC.inviteFavor + ').'); return; }
  kcRec().inv[k] = estDay(); empSay(n, 'Tem o meu convite até o fim do dia. Não me faça arrepender.'); tell(p, 'Convite da Mão do Rei: hoje você pode subir ao 1º e ao 2º andar do castelo (cozinha, salão de jantar, conselho e biblioteca).'); estateSave(); }
/* ---- 78: trabalhos no castelo ---- */
function kcHire(p, m) { const D = KC.jobs[m.j], k = crownKey(p); if (!D) return; const boss = S.npcs[D.boss]; if (!boss || dist(boss.x, boss.y, p.x, p.y) > 3.5 || (boss.fl || 0) !== (p.fl || 0)) { tell(p, 'Fale com quem chefia esse ofício.'); return; }
  if (p.wanted > now_() || p.murderer) { empSay(boss, 'Procurado pela Guarda? Aqui não.'); return; } const J = kcJob(p); if (J && J.j !== m.j) { tell(p, 'Você já trabalha no castelo como ' + KC.jobs[J.j].n.toLowerCase() + ' até o dia ' + J.until + '.'); return; }
  kcRec().job[k] = { j: m.j, until: estDay() + KC.contract - 1, n: p.name }; estateSave(); empSay(boss, ['Começa hoje. Não se atrase.', 'Bem-vindo à casa do rei. Aqui as paredes têm ouvidos.', 'Três dias, e vemos se presta.'][Math.floor(Math.random() * 3)]);
  tell(p, 'Contrato no castelo: ' + D.n + ' por ' + KC.contract + ' dias. Acesso: ' + kcFloorsTxt(D) + '. Turnos de ' + Math.round(KC.shiftMs / 1000) + ' s pagam ' + D.pay + ' de ouro (fale com o chefe).' + kcPerkTxt(m.j)); kcMenu(p, boss); }
function kcFloorsTxt(D) { const N = { '-2': 'sala de tortura', '-1': 'calabouço', 0: 'térreo', 1: 'cozinha e jantar', 2: 'conselho e biblioteca', 3: 'quartos dos criados', 4: 'aposentos reais' }; return D.fl.map(f => N[f]).join(', '); }
function kcPerkTxt(j) { return j === 'serv' ? ' Você serve a comida do rei: ninguém estranha a sua mão perto da taça.' : j === 'scribe' ? ' Copiando as atas, às vezes se ouve um segredo da corte (10% por turno).' : j === 'jailer' || j === 'torturer' ? ' Você pode interrogar os presos na sala de tortura.' : ' A Guarda Real o trata como um dos seus.'; }
function kcShift(p) { const J = kcJob(p); if (!J) return; const D = KC.jobs[J.j], boss = S.npcs[D.boss]; if (p.kcShift) { tell(p, 'Você já está num turno.'); return; } if (!boss || dist(boss.x, boss.y, p.x, p.y) > 3.5) { tell(p, 'Fale com o chefe.'); return; }
  const h = empHour(); if ((h >= 21 || h < 6) && !D.night) { empSay(boss, 'O turno é de dia. Volte amanhã cedo.'); return; }
  p.kcShift = { until: now_() + KC.shiftMs, j: J.j }; Net.toOne(p.id, { t: 'shift', on: 1, ms: KC.shiftMs }); tell(p, 'Turno de ' + D.n.toLowerCase() + ' começou: fique no castelo, na sua área, até o fim.'); }
function kcShiftTick(now) { for (const p of Object.values(S.players)) { const T = p.kcShift; if (!T) continue; const D = KC.jobs[T.j], inside = typeof rgInCastle === 'function' && rgInCastle(p) && D.fl.includes(Math.max(-2, Math.min(4, p.fl || 0)));
    if (!inside) { p.kcShift = null; Net.toOne(p.id, { t: 'shift', on: 0 }); tell(p, 'Você saiu do posto: o turno foi perdido.'); continue; } if (now < T.until) continue;
    p.kcShift = null; Net.toOne(p.id, { t: 'shift', on: 0 }); p.gold = (p.gold || 0) + D.pay; sendStat(p); tell(p, 'Turno cumprido: +' + D.pay + ' de ouro.');
    if (T.j === 'scribe' && Math.random() < KC.scribeSec && typeof secRandom === 'function') { const pk = secRandom(p, null); if (pk) secGive(p, pk[0], pk[1], 'ouvido enquanto copiava as atas do conselho'); }
    if (T.j === 'guard') { const C = crownRec(), k = crownKey(p); C.favor[k] = (C.favor[k] || 0) + 1; } } }
/* serviçal: põe veneno na taça sem ser visto (é ele quem serve) */
if (typeof trSeenCup === 'function') { const _tsM = trSeenCup; trSeenCup = function (p) { const J = S.estate && kcJob(p); if (J && J.j === 'serv') return false; return _tsM(p); }; }
/* ---- 80: calabouço para crimes contra a coroa e presos nobres ---- */
if (typeof jailPlayer === 'function') { const _jpM = jailPlayer; jailPlayer = function (q, ms, opt) { try { if (S.estate && q && !q.dev && typeof kjailPut === 'function' && castleB()) { const k = crownKey(q), noble = (crownRec().title[k] | 0) >= 1 || (typeof phMine === 'function' && phMine(estOwner(q))), crown = (q.crimes || []).some(c => KC.crownCrimes.test(c));
  if (crown || noble) { q.wanted = 0; Net.toAll({ t: 'wanted', id: q.id, ms: 0 }); kjailPut(q, Math.max(ms || 0, q.sentence || 0, 120000), crown ? 'crime contra a coroa' : 'preso nobre'); q.sentence = 0; return true; } } } catch (e) { console.warn('calabouco', e); } return _jpM(q, ms, opt); }; }
/* ---- presos NPC no calabouço ---- */
const KC_PKIND = [['spy', 'Espião da '], ['rebel', 'Rebelde da '], ['thug', 'Capanga a serviço da ']];
function kcPrisAdd(kind, hid, name) { const R = kcRec(); if (R.pris.length >= KC.maxNpcPris) return null; const pr = { id: ++R.seq, kind, h: hid, n: name, s: 0, d: estDay() }; R.pris.push(pr); estateSave(); return pr; }
function kcPrisDaily() { const R = kcRec(); if (R.pris.length >= KC.maxNpcPris || Math.random() > 0.5) return; const L = HOUSES.filter(h => !h.player && !(typeof fhIs === 'function' && fhIs(h.id))); if (!L.length) return; const h = L[Math.floor(Math.random() * L.length)], K = KC_PKIND[Math.floor(Math.random() * KC_PKIND.length)];
  const fn = ['Edrin', 'Mael', 'Tomas', 'Ulf', 'Garet', 'Hob', 'Corin', 'Vane'][Math.floor(Math.random() * 8)]; kcPrisAdd(K[0], h.id, fn + ', ' + K[1].toLowerCase() + h.n); }
function kcPrisNpcs() { const b = castleB(); if (!b) return; const R = kcRec(), want = {}; R.pris.forEach((pr, i) => { const id = 'kp_' + pr.id; want[id] = 1; if (S.npcs[id]) return; const u0 = KJAIL_CELLS[(KJAIL_CELLS.length - 1 - i) % KJAIL_CELLS.length], [x, y] = localToWorld(b, u0 + 0.8, 7.6);
    const n = { id, kind: pr.kind === 'thug' ? 'v_thug1' : 'k_prisoner', name: pr.n + ' (preso)', transient: true, court: 'prisoner', pr: pr.id, x, y, z: 0, fl: -1, fb: castleBi(), hp: 120, maxHp: 120, downed: null, dead: false, dir: 4, sit: 1 }; S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); });
  for (const n of Object.values(S.npcs)) if (n.court === 'prisoner' && !want[n.id]) visGone(n); }
/* rebeldes capturados depois de um cerco perdido */
if (typeof sgEnd === 'function') { const _seM = sgEnd; sgEnd = function (win, how) { const S0 = sgRec(), troop = S0.on ? S0.troop : null; _seM(win, how); try { if (win === 'd' && troop && HOUSE_BY[troop]) kcPrisAdd('rebel', troop, ['Sor Bertram', 'Sor Aldwin', 'Sor Merek'][Math.floor(Math.random() * 3)] + ', rebelde da ' + HOUSE_BY[troop].n); } catch (e) { } }; }
/* ---- 79: tortura ---- */
function kcTortureMenu(p) { const J = kcJob(p); if (!J || (J.j !== 'jailer' && J.j !== 'torturer')) { tell(p, 'Só o carcereiro e o torturador interrogam os presos.'); return; }
  const R = kcRec(), L = R.pris.map(pr => ({ id: 'n' + pr.id, n: pr.n, s: pr.s })).concat(Object.values(S.players).filter(q => q.kjail && q !== p).map(q => ({ id: 'p' + q.id, n: q.name + ' (jogador)', s: q.kjS || 0 })));
  Net.toOne(p.id, { t: 'cmtort', l: L, chance: Math.round(KC.torture * 100), death: KC.deathAt }); }
const KC_LIMBS = () => BODY_PARTS.filter(k => /arm|leg|braco|perna|hand|foot/i.test(k));
function kcTorture(p, m) { const J = kcJob(p), th = S.npcs.k_torturer; if (!J || (J.j !== 'jailer' && J.j !== 'torturer')) return; if (!th || (p.fl || 0) !== -2 || dist(th.x, th.y, p.x, p.y) > 5) { tell(p, 'A tortura é na sala de baixo, com o Mestre Thorne.'); return; }
  if (now_() - (p.kcTortT || 0) < 20000) { tell(p, 'Dê um tempo ao preso (e ao seu estômago).'); return; } p.kcTortT = now_(); const id = String(m.id || ''); let got = null, dead = false, who = '';
  if (id[0] === 'n') { const R = kcRec(), pr = R.pris.find(x => 'n' + x.id === id); if (!pr) return; pr.s++; who = pr.n.split(',')[0];
    if (Math.random() < KC.torture) { const pk = secRandom(p, [pr.h, ['plan', 'rel', 'crown', 'power', 'gold'][Math.floor(Math.random() * 5)]]); if (pk) got = secGive(p, pk[0], pk[1], 'arrancado de ' + who); }
    if (pr.s >= KC.deathAt && Math.random() < KC.deathChance) { R.pris.splice(R.pris.indexOf(pr), 1); dead = true; } }
  else { const q = S.players[id.slice(1)]; if (!q || !q.kjail) return; q.kjS = (q.kjS || 0) + 1; who = q.name; for (const L of KC_LIMBS()) q.body[L] = Math.max(5, (q.body[L] || 100) - 25);
    if (Math.random() < KC.torture) { const S1 = secList(q), K = typeof mr2Sins === 'function' ? mr2Sins(estOwner(q)).filter(s => !s.rev) : []; if (S1.length) { const s = S1[Math.floor(Math.random() * S1.length)], L0 = secList(p); if (!L0.some(x => x.h === s.h && x.k === s.k)) L0.unshift(Object.assign({}, s, { bm: 0 })); got = s; tell(p, 'Segredo arrancado de ' + q.name + ': ' + s.t); }
      else if (K.length) { const s = K[Math.floor(Math.random() * K.length)]; mr2Known(estOwner(p)).push({ o: estOwner(q), id: s.id }); mr2SendKnown(estOwner(p)); got = s; tell(p, 'Segredo arrancado de ' + q.name + ': ' + s.t); } }
    if (q.kjS >= KC.deathAt && Math.random() < KC.deathChance) { q.hp = 1; dead = true; tell(q, 'A dor foi demais: você desmaiou na sala de tortura.'); q.kjS = 0; } else tell(q, 'Você foi levado à sala de tortura. ' + (got ? 'Acabou falando.' : 'Aguentou calado.')); sendStat(q);
    Net.toOne(q.id, { t: 'cmfade', ms: 4000, txt: 'A porta de ferro se fecha atrás de você.' }); }
  Net.toOne(p.id, { t: 'cmfade', ms: 4000, txt: 'Os gritos não chegam lá em cima.' });
  if (!got) tell(p, who + ' não disse nada que preste.'); if (dead) { tell(p, id[0] === 'n' ? who + ' não aguentou a terceira sessão e morreu.' : who + ' desmaiou.'); if (id[0] === 'n') hNews('Um preso morreu no calabouço do castelo.'); }
  estateSave(); kcTortureMenu(p); }
/* ---- menus nos chefes ---- */
function kcMenu(p, n) { const J = kcJob(p), jobs = Object.keys(KC.jobs).filter(j => KC.jobs[j].boss === n.id); Net.toOne(p.id, { t: 'cmjobs', id: n.id, jobs: jobs.map(j => ({ j, n: KC.jobs[j].n, pay: KC.jobs[j].pay, fl: kcFloorsTxt(KC.jobs[j]), perk: kcPerkTxt(j).trim() })), cur: J ? { j: J.j, n: KC.jobs[J.j].n, until: J.until } : null, shift: p.kcShift ? 1 : 0, tort: n.id === 'k_jailer' && J && (J.j === 'jailer' || J.j === 'torturer') ? 1 : 0, days: KC.contract }); }
function kcMsg(p, m) { if (!S.estate || p.downed) return; if (m.a === 'cmhire') kcHire(p, m); else if (m.a === 'cmshift') kcShift(p); else if (m.a === 'cminv') kcInvite(p); else if (m.a === 'cmtort') kcTortureMenu(p); else if (m.a === 'cmtorture') kcTorture(p, m); else if (m.a === 'cmjobs') { const n = S.npcs[m.id]; if (n && dist(n.x, n.y, p.x, p.y) <= 3.5) kcMenu(p, n); } }
if (typeof phMsg === 'function') { const _pmM = phMsg; phMsg = function (p, m) { if (m && typeof m.a === 'string' && m.a.startsWith('cm')) { kcMsg(p, m); return; } return _pmM(p, m); }; }
function kcTick(now) { if (!S.estate || !castleB() || now - (S.kcT || 0) < 1000) return; S.kcT = now; const R = kcRec(); if (R.day !== estDay()) { const first = !R.day; R.day = estDay(); if (!first) kcPrisDaily(); for (const k of Object.keys(R.job)) if (estDay() > R.job[k].until) delete R.job[k]; }
  kcShiftTick(now); kcPrisNpcs(); }
if (typeof housesTick === 'function') { const _htM = housesTick; housesTick = function (now) { _htM(now); kcTick(now); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function' && typeof tone === 'function') { NPC_LOOKS.k_prisoner = () => Object.assign(heroLook('archer', 'scout', '#5a5048'), { armor: 'vest', body: tone('#6a5e50'), body2: tone('#4a4038'), head: 'none', hair: tone('#3a3028'), hairStyle: 'short', beard: tone('#3a3028'), weapon: null, quiver: false }); if (typeof NPC_CLS !== 'undefined') NPC_CLS.k_prisoner = 'archer'; }
function kcFade(m) { let o = $('vel-fade'); if (o) o.remove(); o = document.createElement('div'); o.id = 'vel-fade'; o.innerHTML = '<div>' + m.txt + '</div>'; document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on')); setTimeout(() => { o.classList.remove('on'); setTimeout(() => o.remove(), 900); }, m.ms || 4000); }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peM = progEvent; progEvent = function (m, now) {
  const send = o => Net.send(Object.assign({ t: 'funda' }, o));
  if (m.t === 'cmfade') { kcFade(m); return true; }
  if (m.t === 'cmjobs') { const d = velPanel('Trabalhar no castelo', (m.cur ? '<div class="est-cost">Seu contrato: <b>' + m.cur.n + '</b> até o dia ' + m.cur.until + '.</div><div class="tq-btns"><button class="est-btn" data-sh' + (m.shift ? ' disabled' : '') + '>Começar um turno<small>fique no seu posto até o fim</small></button>' + (m.tort ? '<button class="est-btn ghost" data-to>Interrogar um preso<small>na sala de tortura, com o Mestre Thorne</small></button>' : '') + '</div>' : '') +
      '<div class="vel-secs">' + m.jobs.map(j => '<div class="vel-sec"><span><b>' + j.n + '</b> · ' + j.pay + ' de ouro por turno<br><small>Acesso: ' + j.fl + '. ' + j.perk + '</small></span><button class="est-btn' + (m.cur && m.cur.j === j.j ? ' ghost' : '') + '" data-j="' + j.j + '"' + (m.cur ? ' disabled' : '') + '>' + (m.cur && m.cur.j === j.j ? 'Contratado' : 'Contrato de ' + m.days + ' dias') + '</button></div>').join('') + '</div>');
    d.querySelectorAll('[data-j]').forEach(b => b.onclick = () => send({ a: 'cmhire', j: b.dataset.j })); const sh = d.querySelector('[data-sh]'); if (sh) sh.onclick = () => { d.remove(); send({ a: 'cmshift' }); }; const to = d.querySelector('[data-to]'); if (to) to.onclick = () => send({ a: 'cmtort' }); return true; }
  if (m.t === 'cmtort') { const d = velPanel('Sala de tortura', '<div class="est-cost">Cada sessão tem ' + m.chance + '% de arrancar um segredo e deixa ferimentos. Na ' + m.death + 'ª sessão o preso pode morrer (um jogador só desmaia).</div><div class="vel-secs">' + (m.l.length ? m.l.map(x => '<div class="vel-sec"><span>' + x.n + '<br><small>' + x.s + ' sessão(ões)</small></span><button class="est-btn" data-p="' + x.id + '">Interrogar</button></div>').join('') : '<div class="est-cost"><small>O calabouço está vazio.</small></div>') + '</div>'); d.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { d.remove(); send({ a: 'cmtorture', id: b.dataset.p }); }); return true; }
  const r = _peM(m, now);
  if (m.t === 'courtmenu') { const d = document.getElementById('courtmenu'), add = (ic, t, s, f) => { if (!d) return; const bt = document.createElement('button'); bt.className = 'lift-btn'; bt.style.margin = '0 14px 12px'; bt.innerHTML = '<span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + s + '</small></span>'; bt.onclick = () => { d.remove(); f(); }; d.appendChild(bt); };
    if (['k_cmd', 'k_cook', 'k_maester', 'k_jailer'].includes(m.id)) add('🛠', 'Trabalhar no castelo', { k_cmd: 'Guarda real', k_cook: 'Serviçal', k_maester: 'Escriba', k_jailer: 'Carcereiro ou torturador' }[m.id] + ': contrato de ' + KC.contract + ' dias, turnos pagos', () => send({ a: 'cmjobs', id: m.id }));
    if (m.id === 'k_hand') add('✉', 'Pedir um convite para a ala do conselho', 'Favor da coroa ' + KC.inviteFavor + ': passe de um dia para o 1º e o 2º andar', () => send({ a: 'cminv' }));
    if (m.id === 'k_torturer') add('⛓', 'Interrogar um preso', 'Só para o carcereiro e o torturador', () => send({ a: 'cmtort' })); }
  return r; }; }
