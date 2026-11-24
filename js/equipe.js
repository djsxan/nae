// ============================================================
//  EQUIPE (3.2): aba Funcionários no painel Negócios (tecla N)
//  todos os empregados do jogador (doméstica, seguranças e os contratados dos negócios),
//  onde cada um está, e os botões Localizar, Chamar e Dispensar
// ============================================================
const EQ_WAIT = 60000;   /* contratado de negócio chamado: espera 1 minuto perto do patrão e volta ao trabalho */
function eqDistrict(x, y) { const dx = x - CENTER, dy = y - CENTER; return dx < -45 ? 'Vila do Oeste' : dy < -14 ? 'Alto da Catedral' : dx > 12 ? (dy > 12 ? 'Bairro da Guarda' : 'Bairro Nobre') : dy > 12 ? 'Rua do Mercado' : dx < -12 ? 'Rua Nova' : 'Centro'; }
function eqBldName(bi) { const P = PROPS.find(q => q.bi === bi && !q.apt), b = BUILDINGS[bi]; return (P && P.name) || (b && b.name) || 'um prédio'; }
function eqWhere(n) { if (!n) return null; const fl = n.fl || 0; if (fl && n.fb != null && n.fb >= 0) return 'em ' + eqBldName(n.fb) + (fl > 0 ? ' (' + fl + 'º andar)' : ' (subsolo)');
  const i = tileAt(n.x, n.y), bi = WORLD.bld[i]; if (bi != null && bi >= 0) return 'em ' + eqBldName(bi); return 'na rua, ' + eqDistrict(n.x, n.y); }
function eqPos(n) { return n ? { x: +n.x.toFixed(1), y: +n.y.toFixed(1), fl: n.fl || 0, fb: n.fl ? n.fb : -1 } : null; }
function eqList(p) {
  const key = estOwner(p), E = S.estate || {}, out = [];
  const em = E.emp && E.emp[key]; if (em) { const n = S.npcs[empNid(em)], st = em.mode === 'follow' ? 'seguindo você' : em.mode === 'shop' ? 'fazendo compras' : em.mode === 'deliver' ? 'levando a carga para casa' : n && n.forage ? 'buscando comida' : 'cuidando da casa';
    out.push({ k: 'emp', id: empNid(em), n: em.n, grp: 'Casa', ro: em.g === 'f' ? 'Doméstica' : 'Doméstico', st, where: eqWhere(n) || 'em casa', pos: eqPos(n), w: em.w || 0 }); }
  for (const r of (typeof segList === 'function' ? segList(key) : [])) { const n = S.npcs[segNid(r)], st = r.jail ? 'preso' : r.flee ? 'fugiu' : r.mode === 'follow' ? 'acompanhando você' : r.mode === 'post' ? 'vigiando um ponto' : r.mode === 'home' ? 'guardando a sua porta' : r.mode === 'bank' ? 'levando ouro ao banco' : 'de serviço';
    out.push({ k: 'seg', id: segNid(r), n: r.n, grp: 'Segurança', ro: 'Segurança', st, where: eqWhere(n) || '—', pos: eqPos(n), w: r.w || 0 }); }
  for (const pid in (E.r || {})) { const rr = E.r[pid], P = PROPS_BY[pid]; if (!rr || rr.owner !== key || !rr.biz || !P) continue; const B = rr.biz; if (typeof staffNorm === 'function') staffNorm(P, B);
    (B.staff || []).forEach((s, i) => { const n = S.npcs[s.id], ro = s.ro ? STAFF_ROLE_N[s.ro] : 'Funcionário', st = !n ? 'em casa, de folga' : n.eqCall ? 'vindo até você' : n.collector ? (n.cst === 'back' ? 'voltando com a carga' : n.cst === 'work' ? 'coletando' : 'procurando o que coletar') : n.goingHome ? 'indo para casa' : WORLD.bld[tileAt(n.x, n.y)] === PROPS_BY[pid].bi ? 'trabalhando' : 'indo para o trabalho';
      out.push({ k: 'biz', id: s.id, pid, i, n: s.n, grp: P.name, ro, st, where: n ? eqWhere(n) : 'em casa (' + eqDistrict(...staffHome(s.id)) + ')', pos: n ? eqPos(n) : { x: staffHome(s.id)[0], y: staffHome(s.id)[1], fl: 0, fb: -1 }, w: s.w || 0 }); }); }
  return out;
}
function eqSend(p) { Net.toOne(p.id, { t: 'eqlist', l: eqList(p) }); }
function eqMsg(p, m) {
  const key = estOwner(p), E = S.estate || {};
  if (m.a === 'eqlist') { eqSend(p); return true; }
  if (m.a !== 'eqcall' && m.a !== 'eqfire') return false;
  const id = String(m.id || ''), L = eqList(p), it = L.find(x => x.id === id); if (!it) { tell(p, 'Esse funcionário não é mais seu.'); eqSend(p); return true; }
  if (m.a === 'eqfire') {
    if (it.k === 'emp') empMsg(p, { a: 'order', o: 'fire' });
    else if (it.k === 'seg') segOrder(p, key, { id, o: 'fire' });
    else bizMsg(p, { pid: it.pid, a: 'fire', i: it.i });
    eqSend(p); return true; }
  /* chamar */
  if (it.k === 'emp') { const r = E.emp[key], n = S.npcs[empNid(r)]; if (!n) { tell(p, it.n + ' não está por perto agora.'); return true; }
    if (r.mode === 'shop') { tell(p, it.n + ' está fazendo compras; espere voltar.'); return true; }
    r.mode = 'follow'; r.forageOn = 0; n.forage = null; n.goal = null; n.task = null; empSay(n, 'Já vou!'); estateSave(); empSend(r, key); tell(p, it.n + ' está vindo e vai seguir você.'); }
  else if (it.k === 'seg') { const r = segList(key).find(x => segNid(x) === id), n = r && S.npcs[segNid(r)]; if (!r || !n) return true; if (r.jail || r.flee) { tell(p, r.n + (r.jail ? ' está preso.' : ' fugiu.')); return true; }
    if (r.mode === 'bank') { tell(p, r.n + ' está levando ouro ao banco; volta logo.'); return true; }
    r.mode = 'follow'; r.post = null; empSay(n, 'A caminho, patrão.'); estateSave(); if (typeof segSend === 'function') segSend(key); tell(p, r.n + ' está vindo e vai acompanhar você.'); }
  else { const n = S.npcs[id]; if (!n || n.dead) { tell(p, it.n + ' está em casa, de folga (os contratados trabalham de dia).'); return true; }
    if (n.collector && S.collRes && S.collRes[n.ci] === n.id) delete S.collRes[n.ci];
    n.eqCall = { pid: p.id, until: 0 }; n.walkTo = null; if (n.collector) n.cst = null; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: 'Já vou, patrão!', ms: 1 }); tell(p, it.n + ' está vindo; espera 1 minuto perto de você e volta ao trabalho.'); }
  eqSend(p); return true;
}
/* contratado de negócio chamado: anda até o patrão, espera 1 minuto e volta */
function eqCallTick(n, now, dt) { const C = n.eqCall, q = S.players[C.pid];
  if (!q || (C.until && now > C.until)) { n.eqCall = null; if (n.bizWorker) { n.walkTo = [n.postX, n.postY]; n.act = null; } return; }
  let tx = q.x, ty = q.y; if ((q.fl || 0) && BUILDINGS[q.fb]) { const [dx, dy] = doorTile(BUILDINGS[q.fb]); tx = dx; ty = dy; }   /* patrão num andar de cima: espera na porta do prédio */
  if (dist(n.x, n.y, tx, ty) < 1.6) { n.walk = false; n.dir = dirFromVecS(q.x - n.x, q.y - n.y); if (!C.until) { C.until = now + EQ_WAIT; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: 'Às ordens!', ms: 1 }); } return; }
  if (dist(n.x, n.y, tx, ty) > 60) { n.x = tx - 1; n.y = ty; return; }
  npcWalk(n, tx, ty, 1.0, dt); }
if (typeof workerTick === 'function') { const _wkE = workerTick; workerTick = function (n, now, dt) { if (n.eqCall && !n.goingHome) { eqCallTick(n, now, dt); return; } return _wkE(n, now, dt); }; }
if (typeof collectorTick === 'function') { const _ctE = collectorTick; collectorTick = function (n, now, dt) { if (n.eqCall && !n.leavingC) { eqCallTick(n, now, dt); return; } return _ctE(n, now, dt); }; }
if (typeof phMsg === 'function') { const _phE = phMsg; phMsg = function (p, m) { if (m && typeof m.a === 'string' && m.a.startsWith('eq') && eqMsg(p, m)) return; return _phE(p, m); }; }

// ---------- lado do jogador ----------
if (typeof G !== 'undefined') { G.hubTab = 'neg'; G.equipe = []; G.locate = null; }
if (typeof progEvent === 'function') { const _peE = progEvent; progEvent = function (m, now) {
  if (m.t === 'eqlist') { G.equipe = m.l || []; if (G.locate) { const it = G.equipe.find(x => x.id === G.locate.id); if (it && it.pos) Object.assign(G.locate, it.pos); else if (!it) G.locate = null; } if (G.hubTab === 'equipe') hubRender(); return true; }
  return _peE(m, now); }; }
function eqRender() {
  const L = G.equipe || [], esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  if (!L.length) return '<div class="gp-note">Você ainda não tem funcionários. Contrate uma doméstica na Casa das Mãos de Ouro, seguranças com o Capitão dos Seguranças, ou funcionários na aba Funcionários de cada negócio.</div>';
  const grps = [...new Set(L.map(x => x.grp))];
  return grps.map(g => '<div class="gp-sub">' + esc(g) + '</div>' + L.filter(x => x.grp === g).map(x => '<div class="hub-card"><div class="hub-h"><b>' + esc(x.n) + '</b><span>' + esc(x.ro) + (x.w ? ' · ' + x.w + ' ouro/dia' : '') + '</span></div><div class="hub-row"><span>📍 ' + esc(x.where) + '</span><span>' + esc(x.st) + '</span></div><div class="hub-act"><button class="est-btn ghost" data-eqloc="' + esc(x.id) + '">' + (G.locate && G.locate.id === x.id ? 'Parar de localizar' : 'Localizar') + '</button><button class="est-btn" data-eqcall="' + esc(x.id) + '">Chamar</button><button class="est-btn ghost" data-eqfire="' + esc(x.id) + '">Dispensar</button></div></div>').join('')).join('') +
    '<div class="gp-note">Localizar põe uma seta na borda da tela até a pessoa. Chamar: a doméstica e os seguranças vêm e passam a seguir você; os contratados dos negócios vêm, esperam 1 minuto e voltam ao trabalho (à noite estão em casa, de folga).</div>';
}
function eqBind(d) {
  for (const b of d.querySelectorAll('[data-eqloc]')) b.onclick = () => { const id = b.dataset.eqloc; if (G.locate && G.locate.id === id) G.locate = null; else { const it = G.equipe.find(x => x.id === id); if (it && it.pos) G.locate = { id, ...it.pos, n: it.n }; } hubRender(); };
  for (const b of d.querySelectorAll('[data-eqcall]')) b.onclick = () => Net.send({ t: 'funda', a: 'eqcall', id: b.dataset.eqcall });
  for (const b of d.querySelectorAll('[data-eqfire]')) b.onclick = () => { const it = G.equipe.find(x => x.id === b.dataset.eqfire); gameAsk('Dispensar ' + (it ? it.n : 'este funcionário') + '?', { yes: 'Dispensar' }).then(ok => { if (ok) Net.send({ t: 'funda', a: 'eqfire', id: b.dataset.eqfire }); }); };
}
/* abas do painel Negócios */
if (typeof hubRender === 'function') { const _hrE = hubRender; hubRender = function () {
  const d = document.getElementById('bizhub'); if (!d || d.classList.contains('hidden') || !G.me) return _hrE();
  if (G.hubTab === 'equipe') { document.getElementById('hub-gold').textContent = G.me.gold; document.getElementById('hub-body').innerHTML = eqTabs() + eqRender(); eqBind(d); eqTabBind(d); return; }
  _hrE(); const body = document.getElementById('hub-body'); if (body) { body.insertAdjacentHTML('afterbegin', eqTabs()); eqTabBind(d); } }; }
function eqTabs() { return '<div class="est-tabs" style="margin-bottom:8px">' + [['neg', 'Negócios'], ['equipe', 'Funcionários']].map(([k, t]) => '<button class="' + (G.hubTab === k ? 'on' : '') + '" data-hubtab="' + k + '">' + t + '</button>').join('') + '</div>'; }
function eqTabBind(d) { for (const b of d.querySelectorAll('[data-hubtab]')) b.onclick = () => { G.hubTab = b.dataset.hubtab; if (G.hubTab === 'equipe') Net.send({ t: 'funda', a: 'eqlist' }); hubRender(); }; }
/* atualiza a lista enquanto a aba está aberta (e a posição de quem está sendo localizado) */
if (typeof setInterval === 'function' && typeof G !== 'undefined' && typeof document !== 'undefined') setInterval(() => { try { const d = document.getElementById('bizhub'), open = d && !d.classList.contains('hidden') && G.hubTab === 'equipe'; if ((open || G.locate) && typeof Net !== 'undefined' && G.started) Net.send({ t: 'funda', a: 'eqlist' }); } catch (e) { } }, 3000);
/* seta do Localizar: usa o mesmo marcador das entregas */
function eqMarkSpot() { const me = G.me, L = G.locate; if (!me || !L) return null; const e = G.npcs && G.npcs[L.id], x = e && e.rx != null ? e.rx : L.x, y = e && e.ry != null ? e.ry : L.y, fl = e ? (e.fl || 0) : L.fl, fb = e ? e.fb : L.fb;
  if (fl === (me.fl || 0) && (!fl || fb === me.fb) && Math.hypot(x - me.x, y - me.y) < 2) { G.locate = null; return null; }
  if (fl && BUILDINGS[fb] && !((me.fl || 0) && me.fb === fb)) { const [dx, dy] = doorTile(BUILDINGS[fb]); return { x: dx, y: dy }; }   /* está num andar de um prédio: leva até a porta */
  return { x, y }; }
if (typeof G !== 'undefined' && typeof addEventListener === 'function') addEventListener('load', () => { if (typeof drawJobsOverlay !== 'function') return; const _djE = drawJobsOverlay; drawJobsOverlay = function (ctx, now) { if (G.job && G.job.step) return _djE(ctx, now); let s = null; try { s = eqMarkSpot(); } catch (e) { } if (!s) return _djE(ctx, now); const J0 = G.job; G.job = { step: s, cp: 1 }; try { return _djE(ctx, now); } finally { G.job = J0; } }; });
