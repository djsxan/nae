// ============================================================
//  SUCESSÃO AO TRONO (parte G, etapa 1): linha de sangue sem votação, doença e morte do Rei Edric,
//  volta do irmão exilado (Lorde Corwyn), sino, cortejo fúnebre até a Catedral e coroação no salão.
//  Tramas, rebelião e cerco vêm nas próximas etapas.
// ============================================================
const SUC_AGE = { edric: 70, alaric: 24, corwyn: 58, house: 52 }, SUC_OLD = 60;   /* todo rei envelhece 1 ano por dia do jogo e, a partir dos 60, pode adoecer de vez */
const SUC = { sickDay: 20, deathChance: 0.05, warnDays: 2, buyPerDay: 3, buyMax: 70, buyBase: 20, coronFavor: 10, vassalFavor: 10, funeral: [7, 9], corona: [18, 19], deathHour: [6, 7] };
const SUC_NAMES = { edric: 'Rei Edric, o Velho', alaric: 'Príncipe Alaric Aurenfell', corwyn: 'Lorde Corwyn Aurenfell' };
const SUC_KINGNAME = { alaric: 'Rei Alaric Aurenfell', corwyn: 'Rei Corwyn Aurenfell' };
const SUC_COURT_SPOTS = [[7.5, 6], [11.5, 6], [7.5, 8.5], [11.5, 8.5], [7.5, 11], [11.5, 11], [7.5, 13.5], [11.5, 13.5]];   /* ao longo do tapete do salão do trono */

// ---------------- SERVIDOR ----------------
function sucRec() { const C = crownRec(); if (!C.suc) C.suc = { king: 'edric', alive: { alaric: 1, corwyn: 1 }, stage: null, buy: 0 }; return C.suc; }
function sucAge() { const U = sucRec(), per = typeof AGE_ADULT_DAYS !== 'undefined' ? AGE_ADULT_DAYS : 1; if (U.king === 'edric') return SUC_AGE.edric + Math.floor((sucRealmDay() - 1) / per); return (U.kage0 || SUC_AGE.house) + Math.floor((estDay() - (U.since || estDay())) / per); }   /* adultos: 1 ano a cada 3 dias */
function sucCanSicken() { const U = sucRec(); return U.king === 'edric' ? sucRealmDay() >= SUC.sickDay : sucAge() >= SUC_OLD; }
function sucRealmDay() { return typeof cpRec === 'function' ? estDay() - cpRec().born + 1 : 1; }
/* a linha de sangue: herdeiro, irmão do rei e as cinco casas na ordem sorteada do reino */
function sucLine() { const U = sucRec(), L = []; for (const k of ['alaric', 'corwyn']) if (U.alive[k] && U.king !== k) L.push(k); for (const h of (typeof cpRec === 'function' ? cpRec().line : HOUSES.map(x => x.id))) if (U.king !== 'h:' + h) L.push('h:' + h); return L; }
function sucName(k) { if (k.startsWith('h:')) { const h = HOUSE_BY[k.slice(2)]; return h ? h.lord + ' (' + h.n + ')' : k; } return SUC_NAMES[k] || k; }
function sucKingName() { const U = sucRec(); return U.king === 'edric' ? SUC_NAMES.edric : U.king.startsWith('h:') ? 'Rei ' + HOUSE_BY[U.king.slice(2)].lord.replace(/^(Lorde|Lady) /, '') : SUC_KINGNAME[U.king]; }
/* legitimidade: a antiga projeção (conselho 40%, povo 35%, Fé 25%) passa a medir o apoio de cada um */
function sucLegit(k) { const E = typeof infElection === 'function' ? infElection() : [], au = (E.find(e => e.h === 'aurenfell') || {}).score || 50;
  if (k === 'edric' || k === 'alaric') return au; if (k === 'corwyn') { const U = sucRec(); return Math.min(SUC.buyMax, SUC.buyBase + U.buy); } if (k.startsWith('h:')) return (E.find(e => e.h === k.slice(2)) || {}).score || 0; return 0; }
function sucPublic() { const U = sucRec(), L = sucLine(); return { king: sucKingName(), kl: sucLegit(U.king), line: L.slice(0, 7).map(k => ({ n: sucName(k), l: sucLegit(k), k })), stage: U.stage, dying: U.stage === 'dying', day: sucRealmDay(), corwyn: !!U.corwynIn, age: sucAge() }; }
if (typeof infSuccessor === 'function') { const _isS = infSuccessor; infSuccessor = function () { const o = _isS(); try { o.suc = sucPublic(); } catch (e) { } return o; }; }
/* o rei que está no trono hoje não adoece: só o velho Edric piora */
function sucCourtFix() { const U = sucRec(), C = crownRec(); if (U.king !== 'edric' && sucAge() < SUC_OLD) { C.hp = 100; if (!U.stage || U.stage === 'done') C.bad = 0; } if (U.stage && U.stage !== 'done' && U.stage !== 'dying') C.bad = 1; }
/* o rei morto sai do trono; o novo rei assume o lugar dele na corte */
function sucApplyKing(k) { const U = sucRec(), C = crownRec(), prev = U.king; U.king = k; U.since = estDay(); U.kage0 = k.startsWith('h:') ? SUC_AGE.house : (SUC_AGE[k] || SUC_AGE.house) + (k === 'corwyn' ? Math.floor(Math.max(0, sucRealmDay() - 1) / (typeof AGE_ADULT_DAYS !== 'undefined' ? AGE_ADULT_DAYS : 1)) : 0); const def = COURT.find(d => d.id === 'k_king');
  if (def) { def.name = sucKingName(); def.kind = k === 'alaric' ? 'k_prince' : k === 'corwyn' ? 'k_corwyn' : def.kind; }
  if (k === 'alaric') { const i = COURT.findIndex(d => d.id === 'k_prince'); if (i >= 0) COURT.splice(i, 1); const pn = S.npcs.k_prince; if (pn) visGone(pn); }
  if (k === 'corwyn') { const cn = S.npcs.k_corwyn; if (cn) visGone(cn); U.corwynIn = 0; }
  const old = S.npcs.k_king; if (old) visGone(old);   /* reaparece com o nome e o rosto novos */
  for (const key in C.favor) C.favor[key] = Math.floor(C.favor[key] / 2);   /* o novo rei não deve nada a ninguém */
  for (const p of Object.values(S.players)) { const key = estOwner(p), vowed = (k === 'alaric' || k === 'corwyn') ? !!C.vow[key] : (hRec().vow[key] === k.slice(2)); if (vowed) crownFavor(p, SUC.vassalFavor, 'jurou lealdade à casa do novo rei'); }
  C.hp = 100; C.bad = 0; estateSave(); }
/* entre a morte e a coroação ninguém senta no trono; e o rei de hoje continua no lugar ao reabrir o mundo */
if (typeof courtSpawn === 'function') { const _csS = courtSpawn; courtSpawn = function (def) { const U = S.estate && sucRec(); if (U && def.id === 'k_king' && (U.stage === 'death' || U.stage === 'funeral' || U.stage === 'mourning')) return null; return _csS(def); }; }
function sucInitCourt() { const U = sucRec(); if (U.king === 'edric') return; const def = COURT.find(d => d.id === 'k_king'); if (def) { def.name = sucKingName(); if (U.king === 'alaric') def.kind = 'k_prince'; if (U.king === 'corwyn') def.kind = 'k_corwyn'; } if (U.king === 'alaric' || !U.alive.alaric) { const i = COURT.findIndex(d => d.id === 'k_prince'); if (i >= 0) COURT.splice(i, 1); } }
/* cortejo fúnebre: o caixão sai do castelo e vai até a Catedral, com a corte e quatro guardas reais */
function sucCoffinStart() { const b = castleB(); if (!b || S.npcs.k_coffin) return; const [x, y] = localToWorld(b, 9.5, 15.5), v = { id: 'k_coffin', kind: 'coffin', name: 'O caixão do ' + (sucRec().dead || 'rei'), transient: true, court: 'coffin', x, y, z: 0, fl: 0, fb: -1, hp: 999, maxHp: 999, downed: null, dead: false, dir: 0 }; S.npcs[v.id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); }
function sucTempleIn() { const bi = typeof templeBi === 'function' ? templeBi() : -1, T = bi >= 0 ? bldTiles(bi) : []; if (!T.length) return [CENTER + 12, CENTER + 16]; const b = BUILDINGS[bi]; return T.slice().sort((a, c) => dist(a[0], a[1], b.x + b.w / 2, b.y + 1) - dist(c[0], c[1], b.x + b.w / 2, b.y + 1))[0]; }
const SUC_FOLLOW = ['k_rg1', 'k_rg2', 'k_rg3', 'k_rg4', 'k_hand', 'k_maester', 'k_coin', 'k_cmd', 'k_prince', 'k_princess', 'k_herald'];
if (typeof courtPost === 'function') { const _cpS = courtPost; courtPost = function (def, now) { const U = S.estate && sucRec(); if (U && U.stage === 'funeral' && SUC_FOLLOW.includes(def.id)) return [0, 'funeral', SUC_FOLLOW.indexOf(def.id)]; if (U && U.stage === 'coronation') { if (def.id === 'k_king') return [0, 'throne']; const i = SUC_FOLLOW.indexOf(def.id); if (i >= 0) return [0, 'corona', i]; } return _cpS(def, now); }; }
if (typeof courtWorld === 'function') { const _cwS = courtWorld; courtWorld = function (P, n, now) {
  if (P && P[1] === 'funeral') { const cf = S.npcs.k_coffin; if (cf) { const hx = cf.hx == null ? 0 : cf.hx, hy = cf.hy == null ? 1 : cf.hy, i = P[2]; if (i < 4) { const s = i % 2 ? 1 : -1, f = i < 2 ? 0.55 : -0.55; return { x: cf.x + hx * f - hy * s * 0.55, y: cf.y + hy * f + hx * s * 0.55, fl: 0, out: 1, walk: 1 }; } const back = 1.4 + Math.floor((i - 4) / 2) * 1.0, sd = (i % 2 ? 1 : -1) * 0.5; return { x: cf.x - hx * back - hy * sd, y: cf.y - hy * back + hx * sd, fl: 0, out: 1, walk: 1 }; } }
  if (P && P[1] === 'corona') { const b = castleB(); if (b) { const sp = SUC_COURT_SPOTS[P[2] % SUC_COURT_SPOTS.length], [x, y] = localToWorld(b, sp[0] + (P[2] >= 8 ? 1 : 0), sp[1] - (P[2] >= 8 ? 1.2 : 0)); return { x, y, fl: 0 }; } }
  return _cwS(P, n, now); }; }
/* os cinco lordes vão à coroação */
function sucNoblePost(n) { const U = S.estate && sucRec(); if (!U || U.stage !== 'coronation' || n.hrole !== 'lord') return null; const b = castleB(); if (!b) return null; const k = HOUSES.findIndex(h => h.id === n.house), sp = [[8.4, 4.6], [10.6, 4.6], [8.4, 16], [10.6, 16], [9.5, 16]][k % 5], [x, y] = localToWorld(b, sp[0], sp[1]); return { x, y, fl: 0, out: 1 }; }
if (typeof thNoblePost === 'function') { const _tnS = thNoblePost; thNoblePost = function (n) { return sucNoblePost(n) || _tnS(n); }; }
/* Lorde Corwyn: chega pelo portão quando o rei adoece e fica na pousada, comprando apoio */
function sucCorwynSpot() { const hb = BUILDINGS.findIndex(b => b.kind === 'hotel'), T = hb >= 0 ? bldTiles(hb) : []; return T.length ? T[Math.floor(T.length / 2)] : [CENTER - 26, CENTER + 27]; }
function sucCorwynTick(dt) { const U = sucRec(); if (!U.corwynIn || U.king === 'corwyn' || !U.alive.corwyn) return; let n = S.npcs.k_corwyn;
  if (!n) { const g = typeof visGates === 'function' ? visGates()[0] : [CENTER + 0.5, CENTER + 30.5], first = !U.corwynArr; U.corwynArr = 1; const [sx, sy] = first ? g : sucCorwynSpot(); n = { id: 'k_corwyn', kind: 'k_corwyn', name: SUC_NAMES.corwyn, transient: true, court: 'corwyn', x: sx, y: sy, z: 0, fl: 0, fb: -1, hp: 400, maxHp: 400, downed: null, dead: false, dir: 0 }; S.npcs[n.id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); }
  if (n.dead || n.downed) return; const [tx, ty] = sucCorwynSpot(); if (dist(n.x, n.y, tx, ty) > 0.4) { if (npcWalk(n, tx, ty, 1.0, dt)) n.walk = false; else n.walk = true; } else n.walk = false; }
function sucDaily(day) { const U = sucRec(), rd = sucRealmDay();
  if (U.alive.corwyn && U.king !== 'corwyn' && rd >= SUC.sickDay && !U.corwynIn && !U.corwynArr) { U.corwynIn = 1; hNews('Lorde Corwyn Aurenfell, irmão do rei banido há anos, voltou a Nae e se hospedou na Pousada do Javali Magro. Dizem que veio comprar amigos.'); sys('Notícia: o irmão exilado do rei, Lorde Corwyn Aurenfell, voltou à cidade.'); }
  if (U.corwynIn) U.buy = Math.min(SUC.buyMax - SUC.buyBase, U.buy + SUC.buyPerDay);
  if ((!U.stage || U.stage === 'done') && sucCanSicken() && Math.random() < SUC.deathChance) { U.stage = 'dying'; U.dieAt = now_() + SUC.warnDays * ESTATE_DAY_MS; hNews('O ' + sucKingName() + ' piorou muito: o meistre diz que ele não passa de dois dias.'); sys('Notícia: o ' + sucKingName() + ' está à beira da morte.'); }
  estateSave(); }
function sucTick(now) { if (!S.estate || !castleB()) return; const U = sucRec(), day = estDay(), h = empHour(), dt = Math.min(0.4, (now - (S.sucT || now)) / 1000) || 0.15; S.sucT = now;
  if (!S.sucInit) { S.sucInit = 1; sucInitCourt(); }
  if (U.dayT !== day) { U.dayT = day; sucDaily(day); }
  sucCourtFix(); sucCorwynTick(dt);
  if (U.stage === 'dying' && now >= U.dieAt && csIn(h, SUC.deathHour)) { U.stage = 'death'; U.dead = sucKingName(); if (U.alive[U.king] != null) U.alive[U.king] = 0; U.next = sucLine()[0]; const kn = S.npcs.k_king; if (kn) visGone(kn); U.edricDead = 1;
    sys('🔔 O sino da praça toca sem parar: o ' + U.dead + ' morreu esta noite. Hoje às ' + SUC.funeral[0] + 'h o cortejo leva o caixão do castelo à Catedral; às ' + SUC.corona[0] + 'h, ' + sucName(U.next) + ' será coroado no salão do trono.'); hNews('Morreu o ' + U.dead + '. ' + sucName(U.next) + ' é o próximo na linha de sangue.'); near(CENTER, CENTER, { t: 'shake', s: 1 }, 999); estateSave(); }
  if (U.stage === 'death' && csIn(h, SUC.funeral)) { U.stage = 'funeral'; sucCoffinStart(); }
  if (U.stage === 'funeral') { const cf = S.npcs.k_coffin, [tx, ty] = sucTempleIn(); if (cf) { if (dist(cf.x, cf.y, tx, ty) > 0.5) { cf.walk = !npcWalk(cf, tx, ty, 0.7, dt); } else cf.walk = false; }
    if (!csIn(h, SUC.funeral)) { U.stage = 'mourning'; if (cf) visGone(cf); sys('O ' + (U.dead || 'rei') + ' foi sepultado na cripta da Catedral da Aurora.'); } }
  if ((U.stage === 'mourning' || U.stage === 'death') && csIn(h, SUC.corona)) { U.stage = 'coronation'; U.cTold = {}; sucApplyKing(U.next || sucLine()[0]); sys('👑 No salão do trono, ' + sucKingName() + ' é coroado diante da corte e dos cinco lordes. Quem estiver lá ganha o favor da coroa.'); hNews(sucKingName() + ' foi coroado.'); }
  if (U.stage === 'coronation') { const b = castleB(), bi = BUILDINGS.indexOf(b);
    for (const p of Object.values(S.players)) { const key = estOwner(p); if (U.cTold[key] || (p.fl || 0) || WORLD.bld[tileAt(p.x, p.y)] !== bi) continue; const [u] = worldToLocal(b, p.x, p.y); if (u < 4 || u > 16) continue; U.cTold[key] = 1; crownFavor(p, SUC.coronFavor, 'esteve na coroação de ' + sucKingName()); }
    if (!csIn(h, SUC.corona)) { U.stage = 'done'; estateSave(); } } }
if (typeof housesTick === 'function') { const _htS = housesTick; housesTick = function (now) { _htS(now); sucTick(now); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  NPC_LOOKS.k_corwyn = () => Object.assign(heroLook('mage', 'adept', '#3a3a44'), { armor: 'robe', body: tone('#3c3a40'), body2: tone('#24222a'), trim: tone('#9a7a3a'), head: 'none', hair: tone('#8a8478'), hairStyle: 'long', beard: tone('#8a8478'), beardStyle: 'goatee', scar: 1, weapon: null, orb: null, cape: true, capeTone: tone('#5a2a24') });   /* o irmão exilado: viajante gasto, capa vinho desbotada */
  NPC_LOOKS.coffin = () => Object.assign(heroLook('knight', 'iron', '#222'), { weapon: null, shield: null });
  if (typeof NPC_SCALE !== 'undefined') NPC_SCALE.coffin = 0.05; if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { k_corwyn: 'mage', coffin: 'knight' }); }
if (typeof COURT_LINES !== 'undefined') COURT_LINES.corwyn = ['Meu irmão me baniu. A morte dele não vai me banir de novo.', 'Nae tem memória curta. Ótimo para quem volta.', 'O sobrinho é um menino. Um reino precisa de um homem.'];
/* o caixão é desenhado à mão: tampo escuro, cruz dourada e um pano roxo */
if (typeof drawNpcState === 'function' && typeof G !== 'undefined') { const _dnS = drawNpcState; drawNpcState = function (ctx, e, sx, sy, now) { if (e.kind !== 'coffin') return _dnS(ctx, e, sx, sy, now); const k = typeof SCALE !== 'undefined' ? SCALE / 3 : 1;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(sx, sy, 34 * k, 11 * k, 0, 0, 7); ctx.fill(); ctx.translate(sx, sy - 66 * k); ctx.scale(k * 1.15, k * 1.15);   /* comprido e estreito, nos ombros dos guardas */
  const P = (a, b) => [a * 1 + b * 1, -a * 0.5 + b * 0.5], poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); }, dn = (q, h) => [q[0], q[1] + h];
  const p1 = P(-28, -8), p2 = P(28, -8), p3 = P(28, 8), p4 = P(-28, 8); poly([p1, p4, dn(p4, 9), dn(p1, 9)], '#3e2618'); poly([p4, p3, dn(p3, 9), dn(p4, 9)], '#4e3020'); poly([p1, p2, p3, p4], '#2a1a12');
  poly([P(-16, -5), P(16, -5), P(16, 5), P(-16, 5)], '#5a2a6a'); ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 2.2; ctx.beginPath(); let a = P(-12, 0), b2 = P(12, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); a = P(5, -4); b2 = P(5, 4); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke(); ctx.restore(); return true; }; }
/* aba Casas: a linha de sangue no lugar da votação */
function sucHtml(S0) { if (!S0) return ''; return '<div style="font-size:13px;padding:0 4px 8px;line-height:1.5">No trono: <b style="color:#f1cf6a">' + S0.king + '</b> · legitimidade <b>' + S0.kl + '</b>' + (S0.dying ? ' · <b style="color:#ff8a7a">à beira da morte</b>' : '') + '<br>Linha de sangue (sem votação: o próximo é coroado no dia da morte):<ol style="margin:4px 0 0 18px;padding:0">' + S0.line.map(l => '<li>' + l.n + ' <small style="opacity:.75">· legitimidade ' + l.l + '</small></li>').join('') + '</ol><small style="opacity:.75">A legitimidade mede o apoio do conselho (40%), do povo (35%) e da Fé (25%). Dia ' + S0.day + ' do reino' + '; o rei tem ' + S0.age + ' anos' + (S0.age >= SUC_OLD ? ' e já pode adoecer de vez' : '') + '.</small></div>'; }
if (typeof infTabHtml === 'function') { const _itS = infTabHtml; infTabHtml = function (D) { let h = _itS(D); const I = D && D.inf; if (!I || !I.succ || !I.succ.suc) return h; const i0 = h.indexOf('<div style="font-size:13px;padding:0 4px 8px;line-height:1.45">Por direito de sangue'); if (i0 < 0) return h + sucHtml(I.succ.suc); const i1 = h.indexOf('</div>', i0) + 6; return h.slice(0, i0) + sucHtml(I.succ.suc) + h.slice(i1); }; }
