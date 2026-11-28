// ============================================================
//  LISTA 15 (27/11)
//  · As funcionárias da Casa de Veludo (a Mirela principalmente) viram para quem está perto antes de falar.
// ============================================================

// ---------------- SERVIDOR ----------------
/* fala de NPC parado na Casa de Veludo: primeiro vira para o jogador mais perto (a Mirela, para quem ela está recebendo) */
if (typeof empSay === 'function' && typeof S !== 'undefined') { const _esL15 = empSay; empSay = function (n, txt) {
  try { if (n && /^vl_/.test(String(n.id)) && !n.walking && !n.sitting && !n.dz) { let w = null; const L = S.vl5 && S.vl5[n.id]; if (L && L.who && S.players[L.who]) w = S.players[L.who];
      if (!w) { let bd = 3; for (const id in S.players) { const p = S.players[id]; if ((p.fl || 0) !== (n.fl || 0)) continue; const d = Math.hypot(p.x - n.x, p.y - n.y); if (d < bd) { bd = d; w = p; } } }
      if (w && Math.hypot(w.x - n.x, w.y - n.y) < 4) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'face', tx: w.x, ty: w.y, ms: 4000 }); } } catch (e) { }
  return _esL15.apply(this, arguments); }; }
/* enquanto a Mirela atende a mesa, continua de frente para quem ela recebe (renova a cada 3 s) */
if (typeof affTick === 'function' && typeof S !== 'undefined') { const _atL15 = affTick; affTick = function (now) { _atL15.apply(this, arguments);
  try { const L = S.vl5 && S.vl5.vl_mirela, n = S.npcs.vl_mirela, w = L && L.who && S.players[L.who]; if (L && n && w && L.ph === 'do' && !n.walking && now - (L._l15 || 0) > 3000) { L._l15 = now; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'face', tx: w.x, ty: w.y, ms: 3600 }); } } catch (e) { } }; }

// ---------------- CLIENTE ----------------
/* a trava de "olhar para" vale já na chegada da mensagem (uma reverência logo depois apagava o 'face' antes de o quadro ver) */
if (typeof clientOnServer === 'function' && typeof G !== 'undefined') { const _coL15 = clientOnServer; clientOnServer = function (m) { const r = _coL15.apply(this, arguments);
  try { if (m && m.t === 'anim' && m.a === 'face' && m.w === 'n' && m.tx != null && (m.ms || 0) > 1000) { const e = G.npcs[m.id]; if (e) { const t = performance.now(); e._lk = { tx: m.tx, ty: m.ty, until: t + m.ms, t0: e.anim && e.anim.t0, s: t }; e.dir = dirFromVec(m.tx - (e.rx ?? e.x), m.ty - (e.ry ?? e.y), e.dir); } } } catch (e) { }
  return r; }; }

// ================= SEGURANÇA: BUSCAR DINHEIRO NO BANCO + SACOLINHA DE OURO =================
// ---------------- SERVIDOR ----------------
/* pedido: "buscar dinheiro" — vai ao banco, saca da conta do patrão e volta com a sacolinha na mão */
if (typeof segOrder === 'function' && typeof S !== 'undefined') { const _soL15 = segOrder; segOrder = function (p, key, m) {
  if (m && m.o === 'bankwd') { const r = segList(key).find(x => segNid(x) === m.id), n = r && S.npcs[segNid(r)]; if (!r || !n) return;
    if (r.jail || r.flee) { tell(p, r.n + (r.jail ? ' está preso.' : ' fugiu.')); return; } if ((n.fl || 0) !== (p.fl || 0) || dist(n.x, n.y, p.x, p.y) > 3) { tell(p, 'Chegue perto de ' + r.n + '.'); return; }
    if (r.carry || r.mode === 'bank') { tell(p, r.n + ' já está cuidando de dinheiro no banco.'); return; }
    const A = bankLoad().acc[key], bal = Math.floor(A ? A.g : 0), q = Math.min(bal, Math.max(0, Math.floor(+m.q || 0))); if (!q) { tell(p, bal > 0 ? 'Diga quanto ele deve buscar.' : 'Você não tem saldo no banco.'); return; }
    r.wd = q; r.bankRet = r.mode === 'bank' ? 'follow' : r.mode; r.mode = 'bank'; empSay(n, 'Vou buscar ' + q + ' de ouro no banco e já volto.'); segSend(key); return; }
  return _soL15.apply(this, arguments); }; }
function l15Bag(n, on) { on = on ? 1 : 0; if ((n.goldH || 0) === on) return; n.goldH = on; near(n.x, n.y, { t: 'sgbag', id: n.id, on }); }
/* ida ao banco (depositar ou sacar) e, no saque, a volta até o patrão com o ouro */
if (typeof segBankTick === 'function' && typeof S !== 'undefined') { const _sbL15 = segBankTick; segBankTick = function (n, r, q, now, dt) {
  const key = n.seg, own = q || empOwnerP(key);
  if (r.wdBack) { l15Bag(n, 1);
    if (!own) { const B = bankLoad(), A = B.acc[key] || (B.acc[key] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += r.carry || 0; bankSave(); r.carry = 0; r.wdBack = 0; r.mode = r.bankRet || 'follow'; r.bankRet = null; l15Bag(n, 0); estateSave(); return; }   /* o patrão saiu do jogo: devolve à conta */
    const tgt = { x: own.x, y: own.y, fl: own.fl || 0, fb: own.fl ? own.fb : -1 }, arrived = ((n.fl || 0) === (own.fl || 0) && dist(n.x, n.y, own.x, own.y) < 1.3) || empGo(n, tgt, 1.2, dt); if (!arrived) return;
    const v = r.carry || 0; own.gold = (own.gold || 0) + v; sendStat(own); r.carry = 0; r.wdBack = 0; r.mode = r.bankRet || 'follow'; r.bankRet = null; n.walk = false;
    near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'offer', tx: own.x, ty: own.y, ms: 1200 }); empSay(n, 'Aqui está, patrão: ' + v + ' de ouro.'); tell(own, r.n + ' trouxe ' + v + ' de ouro do banco.'); setTimeout(() => l15Bag(n, 0), 900); estateSave(); segSend(key); return; }
  l15Bag(n, (r.carry || 0) > 0);
  if (!r.wd) { const had = r.carry; _sbL15.apply(this, arguments); if (had && !r.carry) l15Bag(n, 0); return; }
  /* saque: mesmo caminho até o banqueiro */
  const bk = Object.values(S.npcs).filter(o => /^banker\d?$/.test(o.kind) && !o.dead && !o.downed).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
  let tgt = null; if (bk) tgt = { x: bk.x + 0.9, y: bk.y + 0.9, fl: 0, fb: -1 }; else { const BP = PROPS.find(P => P.kind === 'bank'), D = BP && doorTiles()[BP.bi]; if (D) tgt = { x: D.x, y: D.y, fl: 0, fb: -1 }; }
  if (!tgt) { r.wd = 0; r.mode = r.bankRet || 'follow'; return; }
  const arrived = empGo(n, tgt, 1.6, dt) || ((n.fl || 0) === 0 && dist(n.x, n.y, tgt.x, tgt.y) < 1.5); if (!arrived) return;
  const B = bankLoad(), A = B.acc[key], v = Math.min(r.wd, Math.floor(A ? A.g : 0)); r.wd = 0;
  if (v <= 0) { empSay(n, 'Não havia saldo, patrão.'); r.mode = r.bankRet || 'follow'; r.bankRet = null; if (own) tell(own, r.n + ' voltou do banco sem nada: não havia saldo.'); segSend(key); return; }
  A.g -= v; bankSave(); r.carry = v; r.wdBack = 1; if (bk) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'gather', tx: bk.x, ty: bk.y, ms: 900 }); empSay(n, 'Sacado. Levo ao patrão.'); l15Bag(n, 1); if (own) tell(own, r.n + ' sacou ' + v + ' de ouro e está voltando com ele. Se cair no caminho, a bolsa fica no chão.'); estateSave(); segSend(key); }; }
/* quem chega perto depois também vê a sacolinha */
if (typeof affTick === 'function' && typeof S !== 'undefined') { const _atL15b = affTick; affTick = function (now) { _atL15b.apply(this, arguments);
  try { if (now - (S.l15bT || 0) > 3000) { S.l15bT = now; for (const id in S.npcs) { const n = S.npcs[id]; if (n.goldH && n.seg) { const r = segList(n.seg).find(x => segNid(x) === id); if (!r || (!r.carry && !r.wdBack) || n.dead) { n.goldH = 0; near(n.x, n.y, { t: 'sgbag', id, on: 0 }); } else near(n.x, n.y, { t: 'sgbag', id, on: 1 }); } } } } catch (e) { } }; }
/* morreu levando o dinheiro: a bolsa cai (segKilled já larga r.carry) e o serviço acaba */
if (typeof segKilled === 'function' && typeof S !== 'undefined') { const _skL15 = segKilled; segKilled = function (n, p) { try { const r = segList(n.seg).find(x => x.id === n.segId); if (r) { r.wdBack = 0; r.wd = 0; } n.goldH = 0; near(n.x, n.y, { t: 'sgbag', id: n.id, on: 0 }); } catch (e) { } return _skL15.apply(this, arguments); }; }

// ---------------- CLIENTE ----------------
if (typeof npcHeld === 'function' && typeof G !== 'undefined') { const _nhL15 = npcHeld; npcHeld = function (e) { if (e && e.goldH && !e.npDown && !e.npDead) { if (performance.now() - (e.goldT || 0) < 6500) return 'goldbag'; e.goldH = 0; } return _nhL15.apply(this, arguments); }; }
if (typeof holdPose === 'function') { const _hpL15 = holdPose; holdPose = function (Q, h, P) { if (h === 'goldbag') { Q.aA = [0.55, 0.18, 1.05]; Q.goldbag = 1; return; } return _hpL15.apply(this, arguments); }; }   /* a sacolinha um pouco à frente, na mão */
if (typeof holdProps === 'function') { const _hrL15 = holdProps; holdProps = function (R, Q) { _hrL15.apply(this, arguments);
  const on = (Q.goldbag || 0) > 0.5; if (on && !R.hp_goldbag) { const g = new THREE.Group(), lea = mat('#e0a828', 'metal', { emissive: 0x6a4a08, emissiveIntensity: 0.6, roughness: 0.35 }), cord = mat('#7a1a1a', 'cloth'), gold = mat('#ffd84a', 'gem', { emissiveIntensity: 1.2 });   /* sacola de cetim dourado, cordão vermelho, moedas aparecendo */
      const bag = mesh(sphG(0.085), lea, 0, -0.14, 0.04); bag.scale.set(1, 1.1, 0.9); g.add(bag); g.add(mesh(cylG(0.03, 0.05, 0.05, 8), lea, 0, -0.06, 0.04)); g.add(mesh(torG(0.033, 0.008), cord, 0, -0.07, 0.04));
      for (const [x, y, z] of [[0.01, -0.03, 0.05], [-0.02, -0.02, 0.03], [0.025, -0.015, 0.025], [0, -0.01, 0.02], [-0.01, -0.035, 0.06]]) { const c = mesh(cylG(0.018, 0.018, 0.005, 10), gold, x, y, z); c.rotation.x = 0.6; g.add(c); }   /* moedas reluzindo na boca da sacola */
      R.A.hand.add(g); R.hp_goldbag = g; }
  if (R.hp_goldbag) R.hp_goldbag.visible = on; }; }
if (typeof clientOnServer === 'function' && typeof G !== 'undefined') { const _coL15b = clientOnServer; clientOnServer = function (m) { if (m && m.t === 'sgbag') { const e = G.npcs[m.id]; if (e) { e.goldH = m.on ? 1 : 0; e.goldT = performance.now(); } return; } return _coL15b.apply(this, arguments); }; }
/* menu do segurança: "Buscar dinheiro no banco" */
if (typeof segMenu === 'function' && typeof G !== 'undefined') { const _smL15 = segMenu; segMenu = function (id) { const r = _smL15.apply(this, arguments);
  try { const s = (G.segs || []).find(x => x.id === id), d = document.getElementById('segmenu'), ls = d && d.querySelector('.lift-list'); if (s && ls && !s.carry && s.mode !== 'bank' && !ls.querySelector('[data-o="bankwd"]')) {
      ls.insertAdjacentHTML('beforeend', '<button class="lift-btn" data-o="bankwd"><span class="lift-n">👝</span><span><b>Buscar dinheiro no banco</b><br><small>Vai ao banco, saca da sua conta e volta com a sacolinha de ouro. Se cair no caminho, a bolsa fica no chão.</small></span></button>');
      ls.querySelector('[data-o="bankwd"]').onclick = ev => { ev.stopPropagation(); d.remove(); l15WdMenu(id); }; } } catch (e) { }
  return r; }; }
function l15WdMenu(id) { const s = (G.segs || []).find(x => x.id === id); if (!s) return;
  const d = staffPanel('segbankwd', s.n + ' · buscar no banco', '<div style="padding:10px 14px;font-size:14px">Quanto ele deve sacar da sua conta?<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><input id="segwd-q" type="number" min="1" value="100" style="width:110px">' + [50, 200, 500].map(v => '<button class="lift-btn" data-v="' + v + '" style="flex:0 0 auto">' + v + '</button>').join('') + '<button class="lift-btn" data-q="ok" style="flex:0 0 auto">Buscar</button></div></div>');
  d.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { document.getElementById('segwd-q').value = b.dataset.v; });
  d.querySelector('[data-q]').onclick = () => { const q = Math.floor(+document.getElementById('segwd-q').value || 0); if (q > 0) Net.send({ t: 'emp', a: 'sorder', id, o: 'bankwd', q }); d.remove(); }; }

// ================= CASA DE VELUDO: A NOITE INTEIRA =================
//  A casa abre às 18h e fecha ao meio-dia (VL_OPEN). Os lordes chegam às 21h; uns saem à 1h, outros às 2h e alguns varam
//  a madrugada até as 6h, saem bêbados e às vezes desmaiados, carregados nas costas por um guarda da casa deles.
//  O público da noite vai embora até as 6h; viajantes começam a chegar às 3h e ficam até o meio-dia.
//  Das 12h às 18h a casa fecha: todos são postos para fora, menos o dono e os amigos VIP dele.
const L15V = { late: 0.4, early1: 0.3, faint: 0.4, carryMs: 300000, travFrom: 3, eveTo: 6 };
function l15H(s, d) { let h = 2166136261; for (const ch of String(s) + ':' + d) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return (h % 10000) / 10000; }
function l15LeaveH(hid, d) { const r = l15H(hid, d); return r < L15V.late ? 6 : r < L15V.late + L15V.early1 ? 1 : 2; }   /* hora em que o lorde sai, na madrugada seguinte à visita */
function l15Phase(h) { return h >= 12 && h < 18 ? 'closed' : h >= 6 && h < 12 ? 'morn' : 'night'; }

// ---------------- SERVIDOR ----------------
if (typeof velVisiting === 'function' && typeof S !== 'undefined') { const _vvL15 = velVisiting; velVisiting = function (hid) { if (_vvL15.apply(this, arguments)) return true;
  const h = empHour(); if (h >= 7 || typeof csDay !== 'function') return false; const d = estDay() - 1, D = csDay(hid, d); if (!D || !D.venues.includes('velvet')) return false;
  return h < l15LeaveH(hid, d); }; }
/* de manhã só os viajantes; o resto da casa (reservados com clientes, mercadores) funciona das 18h às 6h */
function l15Night(fn) { return function () { if (l15Phase(empHour()) !== 'morn') return fn.apply(this, arguments); const o = VL_OPEN.slice(); VL_OPEN[0] = 18; VL_OPEN[1] = 6; try { return fn.apply(this, arguments); } finally { VL_OPEN[0] = o[0]; VL_OPEN[1] = o[1]; } }; }
if (typeof vlGuestsSpawn === 'function' && typeof S !== 'undefined') vlGuestsSpawn = l15Night(vlGuestsSpawn);
if (typeof vl9PassTick === 'function' && typeof S !== 'undefined') { const _vpL15 = vl9PassTick; vl9PassTick = function (now) { const h = empHour(), trav = h >= L15V.travFrom && h < 12, K = VL9_PASS_KINDS.slice();
  if (trav) { VL9_PASS_KINDS.length = 0; VL9_PASS_KINDS.push('v_trav1', 'v_trav2', 'v_trav3', 'v_trav2', 'v_trav1', 'v_trav3'); }   /* da madrugada em diante quem entra é viajante */
  try { return _vpL15.apply(this, arguments); } finally { VL9_PASS_KINDS.length = 0; VL9_PASS_KINDS.push(...K); } }; }
function l15Carrier(lord) { const hid = lord.house, g = Object.values(S.npcs).find(o => o.court === 'house' && o.house === hid && o.hrole === 'guard' && !o.dead), H = typeof HOUSE_BY !== 'undefined' ? HOUSE_BY[hid] : null, id = 'l15c_' + hid;
  if (S.npcs[id]) return S.npcs[id]; const v = { id, kind: g ? g.kind : 'guard', name: 'Guarda' + (H ? ' da ' + H.n : ''), transient: true, court: 'l15', x: lord.x - 0.3, y: lord.y, z: 0, fl: lord.fl || 0, fb: lord.fl ? lord.fb : -1, hp: 200, maxHp: 200, downed: null, dead: false, dir: 0, sitting: 0 };
  S.npcs[id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); return v; }
function l15LordsTick(now) { const h = empHour(), b = velB('velvet'); if (!b) return; S.l15C = S.l15C || {};
  for (const n of Object.values(S.npcs)) { if (n.court !== 'house' || n.hrole !== 'lord' || n.dead) continue; const inV = vl9InBld(n);
    if (inV && !velVisiting(n.house) && n._l15out !== estDay() && h < 7) { n._l15out = estDay(); const lh = l15LeaveH(n.house, estDay() - 1);
      if (lh >= 6) { n.drunkT = now + 360000; if (l15H(n.house + 'f', estDay()) < L15V.faint && !n.downed) { const c = l15Carrier(n); c.carrying = n.id; n.onBack = c.id; S.l15C[c.id] = { lord: n.id, t: now }; near(n.x, n.y, { t: 'anim', w: 'n', id: c.id, a: 'talk', txt: ['De novo, meu senhor? Vamos para casa.', 'Upa! Segura firme, milorde.', 'Ninguém viu nada. Para casa.'][Math.floor(Math.random() * 3)], ms: 1 }); }
        else near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: ['Hic… já amanheceu?', 'Mais uma… só mais uma… hic.', 'Onde fica a porta? Hic.'][Math.floor(Math.random() * 3)], ms: 1 }); }
      else if (Math.random() < 0.5) n.drunkT = now + 200000; } }
  /* o guarda leva o lorde desmaiado até a casa dele (o lorde anda escondido nas costas; o guarda vai junto) */
  for (const cid in S.l15C) { const C = S.l15C[cid], c = S.npcs[cid], n = S.npcs[C.lord]; const home = n && (typeof hSeatB === 'function' ? hSeatB(n.house) : null), atHome = n && home && WORLD.bld[tileAt(n.x, n.y)] === BUILDINGS.indexOf(home);
    if (!c || !n || n.dead || n.downed || atHome || now - C.t > L15V.carryMs) { if (n) n.onBack = 0; if (c) { c.carrying = 0; visGone(c); } delete S.l15C[cid]; continue; }
    c.x = n.x - 0.15; c.y = n.y + 0.1; c.fl = n.fl || 0; c.fb = n.fl ? n.fb : -1; c.walk = !!n.walk; } }
/* das 12h às 18h: todo mundo para fora (menos o dono e os amigos VIP); quem chega não entra */
function l15Vip(p) { const O = typeof vl9Own === 'function' ? vl9Own() : null; if (!O) return false; if (O.k === estOwner(p)) return true; return (O.vip || []).includes(String(p.name || '').trim().toLowerCase()); }
function l15CloseTick(now) { if (l15Phase(empHour()) !== 'closed') return;
  for (const p of Object.values(S.players)) { if (!vlInside(p) || p.dev || p.downed || l15Vip(p)) continue; if (p.aff && typeof affEnd === 'function') affEnd(p); vlEject(p, 'A casa fecha ao meio-dia, querido. Volte às 18h.'); } }
if (typeof affTick === 'function' && typeof S !== 'undefined') { const _atL15c = affTick; affTick = function (now) { _atL15c.apply(this, arguments);
  try { if (now - (S.l15vT || 0) > 1000) { S.l15vT = now; l15LordsTick(now); l15CloseTick(now);
      if (l15Phase(empHour()) === 'morn') for (const id in S.npcs) { const n = S.npcs[id]; if (/^vl_w\d/.test(id) && !/^v_trav/.test(n.kind) && !(n.vw && n.vw.ph === 'out')) { n.drunkT = now + 150000; visGone(n); } } } } catch (e) { console.warn('lista15 veludo', e); } }; }   /* o público da noite vai embora às 6h, bêbado */
/* amigos VIP: o dono escreve os nomes */
if (typeof vl9OwnInfo === 'function' && typeof S !== 'undefined') { const _voL15 = vl9OwnInfo; vl9OwnInfo = function (p) { const r = _voL15.apply(this, arguments); try { const O = vl9Own(); if (r.mine && O) r.vip = O.vip || []; } catch (e) { } return r; }; }
if (typeof velMsg === 'function' && typeof S !== 'undefined') { const _vmL15 = velMsg; velMsg = function (p, m) {
  if (m && m.a === 'vl15vip') { if (!vl9IsOwner(p)) return; const O = vl9Own(); O.vip = String(m.names || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 20); if (typeof estateSave === 'function') estateSave(); tell(p, O.vip.length ? '🏮 Amigos VIP: ' + O.vip.join(', ') + '. Eles podem ficar na casa mesmo fechada.' : '🏮 Nenhum amigo VIP.'); Net.toOne(p.id, vl9OwnInfo(p)); return; }
  return _vmL15.apply(this, arguments); }; }

// ---------------- CLIENTE ----------------
/* o guarda com o lorde desmaiado nos ombros */
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhL15c = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) { const r = _dhL15c.apply(this, arguments);
  try { if (e && e.isNpc && e.carrying && G.npcs[e.carrying] && typeof npcSprite3D === 'function') { const L = G.npcs[e.carrying], s = npcSprite3D(L.kind, { dir: ((e.dir | 0) + 2) % 8, walk: -1, down: true, nid: L.id }); if (s) { ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy - 25); } } } catch (er) { }
  return r; }; }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peL15 = progEvent; progEvent = function (m, now) { const r = _peL15.apply(this, arguments);
  try { if (m.t === 'vlown' && m.mine) { const d = $('tequip'), box = d && d.querySelector('.vl9-own'); if (box && !box.querySelector('.l15-vip')) { box.insertAdjacentHTML('beforeend', '<div class="est-cost l15-vip" style="margin-top:8px">🥂 <b>Amigos VIP</b>: podem ficar quando a casa fecha (12h às 18h). Nomes separados por vírgula.<div style="display:flex;gap:6px;margin-top:6px"><input id="l15-vip" style="flex:1" value="' + escAff((m.vip || []).join(', ')) + '"><button class="est-btn" id="l15-vipok" style="flex:0 0 auto">Salvar</button></div></div>');
      box.querySelector('#l15-vipok').onclick = () => Net.send({ t: 'vel', a: 'vl15vip', names: box.querySelector('#l15-vip').value }); } } } catch (e) { }
  return r; }; }

// ================= CASA FECHADA (12h–18h): AS MOÇAS DORMEM, OS CAPANGAS FOFOCAM =================
const L15_GIRLS = ['vl_lis', 'vl_dalia', 'vl_iris', 'vl_yan', 'vl_d1', 'vl_d2', 'vl_jade', 'vl_mirela'], L15_CAPS = ['vl_c1', 'vl_c2', 'vl_c3', 'vl_c4'], L15_TABLE = 2;
// ---------------- SERVIDOR ----------------
/* o que aconteceu na noite (para a fofoca do dia seguinte) */
function l15Night() { const h = empHour(), d = h >= 18 ? estDay() : estDay() - 1; if (!S.l15N || S.l15N.d !== d) { if (S.l15N && S.l15N.d === d - 1) S.l15Prev = S.l15N; S.l15N = { d, lords: {}, faint: [], players: {}, eject: [], late: [] }; } return S.l15N; }
function l15NightTick() { const ph = l15Phase(empHour()); if (ph === 'closed') return; const N = l15Night();
  for (const n of Object.values(S.npcs)) if (n.court === 'house' && n.hrole === 'lord' && !n.dead && vl9InBld(n)) { const nm = String(n.name || '').split(',')[0]; N.lords[nm] = 1; if (empHour() >= 4 && empHour() < 7 && !N.late.includes(nm)) N.late.push(nm); }
  for (const p of Object.values(S.players)) if (vlInside(p)) N.players[String(p.name || '')] = (N.players[String(p.name || '')] || 0) + 1; }
if (typeof vlEject === 'function' && typeof S !== 'undefined') { const _veL15 = vlEject; vlEject = function (p, txt) { try { if (l15Phase(empHour()) !== 'closed') { const N = l15Night(); N.eject.push(String(p.name || '')); } } catch (e) { } return _veL15.apply(this, arguments); }; }
function l15Gossip() { const N = S.l15Phase === 'closed' ? (S.l15N || {}) : {}, L = [], pk = a => a[Math.floor(Math.random() * a.length)];
  for (const f of N.faint || []) L.push(pk(['Viram o ' + f + '? Saiu daqui às seis, apagado nas costas do guarda!', 'O ' + f + ' bebeu até desmaiar. O guarda dele já nem reclama.', 'Carregaram o ' + f + ' como um saco de batatas. Ha!']));
  for (const l of (N.late || []).filter(x => !(N.faint || []).includes(x))) L.push(pk(['O ' + l + ' só foi embora com o sol nascendo. Mal parava em pé.', 'O ' + l + ' cantou a noite toda. Desafinado.']));
  for (const l of Object.keys(N.lords || {}).filter(x => !(N.late || []).includes(x))) L.push(pk(['O ' + l + ' apareceu, pagou bem e saiu cedo. Esse é dos bons.', 'O ' + l + ' passou por aqui ontem. Olhou muito para a Íris.']));
  for (const e of N.eject || []) L.push(pk(['Pus ' + e + ' para fora ontem. Achou que mandava aqui.', e + ' saiu pela porta voando. Merecido.']));
  const pl = Object.entries(N.players || {}).sort((a, b) => b[1] - a[1]); for (const [nm] of pl.slice(0, 3)) L.push(pk([nm + ' ficou a noite inteira aqui dentro.', 'De novo ' + nm + ' por aqui. Já é de casa.', nm + ' gastou ouro como se não houvesse amanhã.']));
  if (!L.length) L.push(pk(['Noite calma. Só vinho e música.', 'A Safira dançou como nunca ontem.', 'Dizem que a Dama lucrou bem esta semana.', 'Os viajantes de manhã bebem mais que os lordes.']));
  return L; }
const L15_REPLY = ['Ha! Ninguém viu nada.', 'Não conta para a Dama.', 'Esta casa não dorme.', 'E eu é que limpo o chão depois.', 'Verdade. Eu estava lá.', 'Quero ver hoje à noite.', 'Shh… as moças estão dormindo lá em cima.'];
/* camas dos quartos de cima (sem a suíte e sem quarto alugado hoje); duas moças por cama */
function l15BedSpots() { const bi = vlBi(), own = (typeof vlRoomRec === 'function' ? vlRoomRec().own : {}) || {}, out = [];
  for (const b of BEDS) { if (b.bi !== bi || !b.vlRoom || b.vlRoom === 'suite' || own[b.vlRoom]) continue; const dx = b.dx || 0, dy = b.dy || 0, ln = Math.hypot(dx, dy) || 1, px = -dy / ln, py = dx / ln, two = (b.w || 1) >= 2;
    out.push({ x: b.x + (two ? px * 0.28 : 0), y: b.y + (two ? py * 0.28 : 0), fl: b.fl, d: dirFromVecS ? dirFromVecS(dx, dy) : 0 }); if (two) out.push({ x: b.x - px * 0.28, y: b.y - py * 0.28, fl: b.fl, d: dirFromVecS ? dirFromVecS(dx, dy) : 0 }); }
  return out; }
function l15Pin(now) { const ph = l15Phase(empHour()), was = S.l15Phase; S.l15Phase = ph; const b = velB('velvet'), bi = vlBi(); if (!b) return;
  if (ph !== 'closed') { if (was === 'closed') for (const id of L15_GIRLS.concat(L15_CAPS)) { const n = S.npcs[id]; if (!n || !n._l15o) continue; Object.assign(n, n._l15o); n._l15o = null; n.sleeping = false; n.sitting = 0; } return; }
  const beds = l15BedSpots(); let k = 0;
  for (const id of L15_GIRLS) { const n = S.npcs[id], s = beds[k++]; if (!n || n.dead || !s) continue; if (!n._l15o) n._l15o = { x: n.x, y: n.y, fl: n.fl || 0, fb: n.fl ? n.fb : -1 }; n.x = s.x; n.y = s.y; n.fl = s.fl; n.fb = bi; n.sleeping = true; n.sitting = 0; n.walk = false; n.vw = null; n.dir = s.d; }
  for (let i = 0; i < L15_CAPS.length; i++) { const n = S.npcs[L15_CAPS[i]], si = vlSeatOf(L15_TABLE, i), s = WORLD.seats[si]; if (!n || n.dead || n.downed || !s || n.fightN || n.fight) continue; if (!n._l15o) n._l15o = { x: n.x, y: n.y, fl: n.fl || 0, fb: n.fl ? n.fb : -1 }; n.x = s.x; n.y = s.y; n.fl = 0; n.fb = -1; n.sitting = 1; n.walk = false; n.dir = s.dir; }
  /* a conversa: um conta, outro responde */
  if (now > (S.l15GT || 0)) { const G0 = S.l15G || (S.l15G = { q: [], i: 0 }); if (!G0.q.length || G0.d !== estDay()) { G0.q = l15Gossip(); G0.d = estDay(); G0.i = 0; }
    const sp = S.npcs[L15_CAPS[G0.i % L15_CAPS.length]], rp = S.npcs[L15_CAPS[(G0.i + 1 + Math.floor(Math.random() * 3)) % L15_CAPS.length]];
    if (sp) { empSay(sp, G0.q[G0.i % G0.q.length]); if (rp && rp !== sp) setTimeout(() => { try { empSay(rp, L15_REPLY[Math.floor(Math.random() * L15_REPLY.length)]); } catch (e) { } }, 3200); }
    G0.i++; S.l15GT = now + 9000; } }
if (typeof npcFaceFix === 'function' && typeof S !== 'undefined') { const _nfL15 = npcFaceFix; npcFaceFix = function (now) { _nfL15.apply(this, arguments); try { l15Pin(now); if (now - (S.l15ntT || 0) > 5000) { S.l15ntT = now; l15NightTick(); } } catch (e) { console.warn('lista15 fechada', e); } }; }   /* depois de todo mundo andar, antes do envio */
/* quando abre de novo, guarda a noite para a fofoca de amanhã */
if (typeof l15LordsTick === 'function') { const _llL15 = l15LordsTick; l15LordsTick = function (now) { const before = S.l15C ? Object.keys(S.l15C).length : 0; _llL15.apply(this, arguments); try { for (const cid in S.l15C || {}) { const C = S.l15C[cid]; if (C._n) continue; C._n = 1; const n = S.npcs[C.lord]; if (n) l15Night().faint.push(String(n.name || '').split(',')[0]); } } catch (e) { } }; }

// ---------------- CLIENTE ----------------
/* as moças dormindo nas camas: desenho da cama (cabeça no travesseiro) */
if (typeof applyNpcRows === 'function' && typeof G !== 'undefined') { const _anL15 = applyNpcRows; applyNpcRows = function (rows, now) { _anL15.apply(this, arguments);
  for (const r of rows || []) { const e = G.npcs[r[0]]; if (!e || !L15_GIRLS.includes(e.id)) continue; if (e.npSleep && e.fl >= 1) { e.npSleep = false; e.sleepB = 1; e.x = e.rx = e.tx; e.y = e.ry = e.ty; } else if (e.sleepB && !(r[3] & 256)) e.sleepB = null; } }; }
// ================= DANÇA: O CORPO SE MOVE COM OS PASSOS =================
/* antes era um "oito" contínuo, sem relação com a batida (os pés patinavam). Agora: parado e plantado durante cada passo;
   na troca de passo da coreografia, uma batida para ir até um ponto novo perto dali; no passinho e no shuffle, um passo
   para o lado a cada 2 batidas, no tempo. */
const L15D = { rx: 0.2, ry: 0.11, lat: 0.07, side: { fk_passinho: 2, tw_shuffle: 1 } };
function l15Spot(id, c, i) { const a = l15H(id + ':' + c, i) * Math.PI * 2, r = 0.45 + 0.55 * l15H(id + 'r' + c, i); return [Math.cos(a) * L15D.rx * r, Math.sin(a) * L15D.ry * r]; }
const l15Ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
if (typeof l14Drift === 'function') l14Drift = function (id, now) {
  try { const d = (G.npcDz && G.npcDz[id]) || (G.plDz && G.plDz[id]); if (!d || typeof dzBpm !== 'function') return { x: 0, y: 0 }; const beat = (Date.now() - d.t0) / 60000 * dzBpm(d) - (d.ph || 0);
    let dx = 0, dy = 0, stId = d.step, b = beat, lx = 0, ly = 0;
    if (d.ch && DANCE_CHOREO[d.ch]) { const C = DANCE_CHOREO[d.ch], tot = C.seq.reduce((a, s) => a + s[1], 0), cyc = Math.floor(beat / tot); let r = beat - cyc * tot, i = 0; while (i < C.seq.length - 1 && r >= C.seq[i][1]) { r -= C.seq[i][1]; i++; }
      const prev = i > 0 ? l15Spot(id, cyc, i - 1) : l15Spot(id, cyc - 1, C.seq.length - 1), cur = l15Spot(id, cyc, i), k = l15Ease(r / 1);   /* vai para o ponto novo na 1ª batida do passo */
      dx = prev[0] + (cur[0] - prev[0]) * k; dy = prev[1] + (cur[1] - prev[1]) * k; stId = C.seq[i][0]; b = r; }
    const per = L15D.side[stId]; if (per) { const blk = Math.floor(b / per), t = (b - blk * per) / Math.min(0.5, per / 2), s0 = blk % 2 ? 1 : -1, s1 = -s0, k = l15Ease(t); const lat = L15D.lat * (s1 + (s0 - s1) * k);   /* passo para o lado no tempo, e fica */
      const dir = (G.npcs[id] || G.players[id] || {}).dir | 0, ang = dir * Math.PI / 4; lx = Math.cos(ang) * lat * HTW * 2; ly = -Math.sin(ang) * lat * HTH * 2; }   /* de lado em relação a para onde olha (na tela) */
    return { x: (dx - dy) * HTW + lx, y: (dx + dy) * HTH + ly }; } catch (e) { return { x: 0, y: 0 }; } };
