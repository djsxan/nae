// ============================================================
//  PARTE L, ETAPA 1: construir no lote vazio do bairro nobre. Um jogador com título de Lorde e 3.000 de ouro
//  encomenda a obra (escolhe a fachada: pedra clara, enxaimel ou tijolo); por 3 dias do jogo o lote
//  vira canteiro (chão batido, material, andaimes que crescem a cada dia, operários trabalhando de
//  dia); no fim o casarão aparece para todos e é do jogador (serve para fundar uma casa).
//  O mundo já nasce com as duas versões guardadas (lotPrepare em world.js); aqui só se troca uma
//  pela outra e se avisa os clientes.
// ============================================================
const LOT = { cost: 3000, days: 3, workH: [7, 19], styles: [['pedra', 'Pedra clara', '#e8e0cc', '#3a4252'], ['enxaimel', 'Enxaimel', '#efe2c2', '#7a3a26'], ['tijolo', 'Tijolo', '#a8553a', '#3e3a3a']] };
const LOT_BI = () => (typeof CITY_LOTS !== 'undefined' ? CITY_LOTS[0] : -1);

/* ---- os dois lados: aplicar o estado no mundo (idempotente) ---- */
function ltApply(m) { const bi = LOT_BI(), b = BUILDINGS[bi]; if (!b || typeof LOT_STASH === 'undefined' || !LOT_STASH[bi]) return; let ch = false;
  if (m.st === 'done') { if (b.lot) ch = lotBuild(bi, m.style, m.name); }
  else if (b.lot && (m.st === 'build' ? 'b' + m.stage : 'f') !== b._site) { lotSite(bi, m.st === 'build' ? m.stage : null); b._site = m.st === 'build' ? 'b' + m.stage : 'f'; ch = true; }
  if (ch && typeof chunks !== 'undefined' && chunks.clear) chunks.clear();   /* o chão daquela área precisa ser repintado */
  if (typeof G !== 'undefined') G.lote = m; }

// ---------------- SERVIDOR ----------------
function ltRec() { const E = S.estate; if (!E.lote) E.lote = { st: 'free' }; return E.lote; }
function ltStage() { const R = ltRec(); return R.st === 'build' ? Math.max(0, Math.min(2, estDay() - R.start)) : null; }
function ltPid() { const S0 = LOT_STASH[LOT_BI()]; return S0 && S0.props[0] ? S0.props[0].id : null; }
function ltPublic() { const R = ltRec(); return { t: 'lote', st: R.st, style: R.style || null, name: R.name || null, on: R.on || null, stage: ltStage(), end: R.end || null, cost: LOT.cost, days: LOT.days }; }
function ltOrder(p, m) { const R = ltRec(), k = estOwner(p), b = BUILDINGS[LOT_BI()]; if (!b) return;
  if (R.st !== 'free') { tell(p, R.st === 'build' ? 'A obra do lote já está em andamento.' : 'O lote já foi construído.'); return; }
  if (dist(p.x, p.y, ...doorTile(b)) > 4) { tell(p, 'Chegue perto do lote.'); return; }
  if ((crownRec().title[k] | 0) < PH.title) { tell(p, 'Só um Lorde pode construir um casarão no bairro nobre. O título é pedido ao rei na audiência.'); return; }
  const st = LOT.styles.find(s => s[0] === m.style); if (!st) return;
  if (!debit(k, p, LOT.cost)) { tell(p, 'A obra custa ' + LOT.cost + ' de ouro (banco, cofres e bolsa).'); return; } sendStat(p);
  Object.assign(R, { st: 'build', owner: k, on: p.name, style: st[0], start: estDay(), end: estDay() + LOT.days, name: 'Casarão de ' + p.name }); estateSave();
  sys('🏗 ' + p.name + ' encomendou um casarão de ' + st[1].toLowerCase() + ' no lote do bairro nobre. A obra leva ' + LOT.days + ' dias.'); if (typeof hNews === 'function') hNews(p.name + ' começou a construir um casarão no bairro nobre.');
  tell(p, 'Obra encomendada: em ' + LOT.days + ' dias o casarão fica pronto, e é seu.'); ltSync(); }
function ltSync() { const m = ltPublic(); ltApply(m); Net.toAll(m); }
function ltWorkers() { const R = ltRec(), h = empHour(), b = BUILDINGS[LOT_BI()], on = R.st === 'build' && h >= LOT.workH[0] && h < LOT.workH[1], spots = b ? [[1.6, 2.2], [b.w - 2.4, 2.4], [2.6, b.h - 2.6]] : [];
  spots.forEach((sp, i) => { const id = 'lt_w' + i, n = S.npcs[id];
    if (on && !n) { const [x, y] = [b.x + sp[0], b.y + sp[1]], v = { id, kind: 'st_carp', name: ['Mestre de obras Ulric', 'Pedreiro Bento', 'Carpinteiro Odo'][i], transient: true, court: 'lotwork', x, y, z: 0, fl: 0, fb: -1, hp: 200, maxHp: 200, downed: null, dead: false, dir: (i * 3) % 8 }; S.npcs[id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); }
    else if (!on && n) visGone(n); });
  if (on && now_() - (S.ltAnim || 0) > 2600) { S.ltAnim = now_(); for (let i = 0; i < 3; i++) { const n = S.npcs['lt_w' + i]; if (n) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: i === 1 ? 'gather' : 'atk_slashR', ms: 1200 }); } } }
function ltTick(now) { if (!S.estate || now - (S.ltT || 0) < 1000) return; S.ltT = now; const R = ltRec();
  if (!S.ltInit) { S.ltInit = 1; ltApply(ltPublic()); }
  if (R.st === 'build' && estDay() >= R.end) { R.st = 'done'; const pid = ltPid(), E = estateLoad(); ltSync();
    if (pid) { E.r[pid] = { owner: R.owner, ownerName: R.on, mode: 'own', paid: estDay(), auth: [] }; }
    estateSave(); sys('🏛 O ' + R.name + ' ficou pronto no bairro nobre.'); if (typeof hNews === 'function') hNews('O ' + R.name + ' ficou pronto.');
    const p = Object.values(S.players).find(o => estOwner(o) === R.owner); if (p) tell(p, 'O seu casarão ficou pronto! Ele é seu (aparece entre os seus imóveis) e serve para fundar uma casa.'); }
  else if (R.st === 'build' && S.ltStage !== ltStage()) { S.ltStage = ltStage(); ltSync(); }
  ltWorkers(); }
function ltMsg(p, m) { if (!S.estate || p.downed) return; if (m.a === 'lotopen') { Net.toOne(p.id, Object.assign(ltPublic(), { t: 'lotmenu', gold: p.gold | 0, lord: (crownRec().title[estOwner(p)] | 0) >= PH.title ? 1 : 0 })); return; } if (m.a === 'lotbuild') ltOrder(p, m); }
if (typeof phMsg === 'function') { const _pmL = phMsg; phMsg = function (p, m) { if (m && typeof m.a === 'string' && m.a.startsWith('lot')) { ltMsg(p, m); return; } return _pmL(p, m); }; }
if (typeof housesTick === 'function') { const _htL = housesTick; housesTick = function (now) { _htL(now); ltTick(now); }; }
if (typeof empWelcome === 'function') { const _ewL = empWelcome; empWelcome = function (to) { _ewL(to); try { if (S.estate) Net.toOne(to, ltPublic()); } catch (e) { } }; }
/* operário: conversa curta */
if (typeof courtMsg === 'function') { const _cmL = courtMsg; courtMsg = function (p, m) { const n = m && m.id && S.npcs[m.id]; if (n && n.court === 'lotwork') { const R = ltRec(); empSay(n, R.st === 'build' ? ['Mais ' + Math.max(1, R.end - estDay()) + ' dia(s) e o ' + R.name + ' fica de pé.', 'Pedra boa, viga boa. Vai durar cem anos.', 'Cuidado com o andaime!'][Math.floor(Math.random() * 3)] : 'Obra entregue.'); return; } return _cmL(p, m); }; }

// ---------------- CLIENTE ----------------
function ltNear() { const b = BUILDINGS[LOT_BI()], me = typeof G !== 'undefined' && G.me; if (!b || !b.lot || !me || (me.fl || 0)) return false; const [dx, dy] = doorTile(b); return Math.hypot(me.x - dx, me.y - dy) < 2.6; }
function ltPanel(m) { if (typeof velPanel !== 'function') return;
  if (m.st === 'build') { velPanel('Obra no lote', '<div class="est-cost">🏗 ' + (m.name || 'Casarão') + ', de ' + (LOT.styles.find(s => s[0] === m.style) || [0, ''])[1].toLowerCase() + ', encomendado por <b>' + m.on + '</b>.<br>Estágio ' + ((m.stage | 0) + 1) + ' de 3: ' + ['fundação e material', 'paredes e andaimes', 'telhado e acabamento'][m.stage | 0] + '.</div>'); return; }
  let sel = LOT.styles[0][0]; const sw = s => '<span style="display:inline-block;width:38px;height:26px;border-radius:4px;background:linear-gradient(180deg,' + s[3] + ' 0 38%,' + s[2] + ' 38%);border:1px solid #0006;vertical-align:middle;margin-right:8px"></span>';
  const d = velPanel('Lote do bairro nobre', '<div class="est-cost">Terreno vazio e cercado, pronto para um casarão. A obra custa <b>' + m.cost + '</b> de ouro e leva <b>' + m.days + ' dias</b>; durante a obra o lote vira canteiro, com operários trabalhando de dia. Pronto, o casarão é seu e serve para fundar uma casa.' + (m.lord ? '' : '<br><br><b>Só um Lorde pode construir aqui.</b> O título é pedido ao rei na audiência.') + '</div><div class="vel-sub">Fachada</div><div class="vel-vs">' + LOT.styles.map((s, i) => '<button class="est-btn ghost" data-s="' + s[0] + '"' + (i === 0 ? ' style="outline:2px solid #c9a24a"' : '') + '>' + sw(s) + s[1] + '</button>').join('') + '</div><div class="tq-btns"><button class="est-btn" data-go' + (m.lord ? '' : ' disabled') + '>Encomendar a obra<small>' + m.cost + ' de ouro (banco, cofres e bolsa)</small></button></div>');
  d.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sel = b.dataset.s; d.querySelectorAll('[data-s]').forEach(o => o.style.outline = o === b ? '2px solid #c9a24a' : ''); });
  const go = d.querySelector('[data-go]'); go.onclick = () => { if (!go.dataset.sure) { go.dataset.sure = 1; go.innerHTML = 'Confirmar: ' + m.cost + ' de ouro?'; return; } d.remove(); Net.send({ t: 'funda', a: 'lotbuild', style: sel }); }; }
if (typeof csHint === 'function' && typeof G !== 'undefined') { const _chL = csHint; csHint = function () { const h = _chL(); if (h) return h; return ltNear() ? 'F: ' + (G.lote && G.lote.st === 'build' ? 'ver a obra do lote' : 'construir no lote do bairro nobre') : ''; }; }
if (typeof csF === 'function' && typeof G !== 'undefined') { const _cfL = csF; csF = function () { if (_cfL()) return true; if (!ltNear()) return false; Net.send({ t: 'funda', a: 'lotopen' }); return true; }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peL = progEvent; progEvent = function (m, now) { if (m.t === 'lote') { ltApply(m); return true; } if (m.t === 'lotmenu') { ltPanel(m); return true; } return _peL(m, now); }; }
