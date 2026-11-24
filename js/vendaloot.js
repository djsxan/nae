// ============================================================
//  DOMÉSTICA VENDE O LOOT (lista 4, item 12): ordem "Vender o meu loot" com a lista do baú (e da cesta dela);
//  ela vende a pé a quem paga mais e, em casa, entrega o ouro a um segurança, que leva ao banco
//  (sem segurança, ela mesma deposita)
// ============================================================
function vlBuyers(k) { const out = []; for (const n of Object.values(S.npcs || {})) { if (n.dead || n.transient && !n.trader) continue; const C = tradeCat(n); if (!C || !(C.buys === 'all' || (C.buys || []).includes(k))) continue; out.push([n, tBuyPrice(n, {}, k)]); } return out.sort((a, b) => b[1] - a[1]); }
function vlStock(key, r) { const rec = S.estate.r[r.home] || {}, have = {}; for (const [k, v] of Object.entries(rec.chest || {})) if (v > 0) have[k] = (have[k] || 0) + v; for (const [k, v] of Object.entries(r.inv || {})) if (v > 0) have[k] = (have[k] || 0) + v; return have; }
function vlCatalog(key, r) { const have = vlStock(key, r), out = []; for (const [k, v] of Object.entries(have)) { if (!LOOT[k]) continue; const B = vlBuyers(k); if (!B.length) continue; out.push([k, tName(k), v, B[0][1], String(B[0][0].name).split(',')[0]]); } return out.sort((a, b) => b[3] * b[2] - a[3] * a[2]); }
function vlTake(r, k, q) { const rec = S.estate.r[r.home] || {}; let left = q; const fromInv = Math.min(left, r.inv[k] || 0); if (fromInv) { r.inv[k] -= fromInv; if (!r.inv[k]) delete r.inv[k]; left -= fromInv; } if (left && rec.chest) { const c = Math.min(left, rec.chest[k] || 0); rec.chest[k] -= c; if (!rec.chest[k]) delete rec.chest[k]; left -= c; } return q - left; }
if (typeof empMsg === 'function') { const _emV = empMsg; empMsg = function (p, m) {
  const key = estOwner(p), r = S.estate && S.estate.emp && S.estate.emp[key];
  if (m && m.a === 'sellcat') { if (!r) return; Net.toOne(p.id, { t: 'empsell', l: vlCatalog(key, r) }); return; }
  if (m && m.a === 'order' && m.o === 'sellloot') { if (!r) return; const n = S.npcs[empNid(r)]; if (!n) return; if (r.mode === 'shop' || r.mode === 'sell') { tell(p, r.n + ' já está fora, na rua.'); return; }
    const want = (Array.isArray(m.list) ? m.list : []).slice(0, 20).map(x => [String(x[0]), Math.max(1, Math.min(999, x[1] | 0))]).filter(x => LOOT[x[0]]), list = []; let tot = 0;
    for (const [k, q] of want) { const B = vlBuyers(k); if (!B.length) continue; const got = vlTake(r, k, q); if (got > 0) { list.push([B[0][0].id, k, got]); tot += got; } }
    if (!list.length) { tell(p, 'Nada da lista dá para vender (ou não está no baú).'); return; }
    r.forageOn = 0; n.forage = null; n.goal = null; n.task = null; r.sell = { list, i: 0, purse: 0, sold: {} }; r.mode = 'sell'; empSay(n, 'Vou vender ' + tot + ' coisas e volto com o ouro.'); estateSave(); empSend(r, key); return; }
  return _emV(p, m); }; }
function vlTick(n, r, now, dt) { const key = n.emp, H = empHome(r), q = empOwnerP(key), spd = r.tr === 'rapido' ? 1.4 : 1.05, S2 = r.sell; if (!S2) { r.mode = 'home'; return; }
  if (S2.i < S2.list.length) { const [tid, k, qty] = S2.list[S2.i], t = S.npcs[tid]; if (!t || t.dead) { r.inv[k] = (r.inv[k] || 0) + qty; S2.i++; return; }
    const tgt = { x: t.x + 0.8, y: t.y + 0.6, fl: t.fl || 0, fb: t.fl ? t.fb : -1 }; if (!(empGo(n, tgt, spd, dt) || ((n.fl || 0) === (t.fl || 0) && dist(n.x, n.y, t.x, t.y) < 1.6))) return;
    if (!n.task) { n.dir = dirFromVecS(t.x - n.x, t.y - n.y); const pay = tBuyPrice(t, q || {}, k) * qty, T = tradeStock(t); T.stock[k] = Math.min(40, (T.stock[k] || 0) + qty); S2.purse += pay; S2.sold[k] = (S2.sold[k] || 0) + qty;
      const rb = typeof npcBiz === 'function' ? npcBiz(t) : null; if (rb && rb.biz) rb.biz.cofre -= pay; empSay(n, 'Vendi ' + qty + 'x ' + tName(k) + ' por ' + pay + '.'); empAnim(n, 'gather', 900, t.x, t.y); n.task = { until: now + 1000, done: () => { S2.i++; } }; }
    return; }
  if (!empGo(n, empTgt(H), spd, dt)) return;   /* voltou para casa com a bolsa */
  const v = S2.purse, txt = Object.entries(S2.sold).map(([k, c]) => c + 'x ' + tName(k)).join(', ') || 'nada'; r.sell = null; r.mode = 'home';
  const seg = (typeof segList === 'function' ? segList(key) : []).find(x => !x.jail && !x.flee && !x.carry && S.npcs[segNid(x)] && !S.npcs[segNid(x)].dead);
  if (v > 0 && seg) { seg.carry = v; seg.bankRet = seg.mode === 'bank' ? 'follow' : seg.mode; seg.mode = 'bank'; empSay(S.npcs[segNid(seg)], 'Levo os ' + v + ' de ouro ao banco, patrão.'); if (q) tell(q, r.n + ' vendeu ' + txt + ' por ' + v + ' de ouro e entregou ao ' + seg.n + ', que está levando ao banco.'); }
  else if (v > 0) { const B = bankLoad(), A = B.acc[key] || (B.acc[key] = { g: 0, loan: 0, due: 0, wk: estDay() }); A.g += v; bankSave(); if (q) tell(q, r.n + ' vendeu ' + txt + ' por ' + v + ' de ouro e, sem segurança em casa, depositou ela mesma no banco.'); }
  empSay(n, 'Vendi tudo.'); estateSave(); empSend(r, key); }
if (typeof empNpcTick === 'function') { const _entV = empNpcTick; empNpcTick = function (n, now, dt) { const r = S.estate && S.estate.emp && S.estate.emp[n.emp]; if (r && r.mode === 'sell') { if (n.task) { if (now < (n.task.until || 0)) { n.walk = false; return; } const T = n.task; n.task = null; if (T.done) T.done(); } try { vlTick(n, r, now, dt); } catch (e) { console.warn('venda', e); r.mode = 'home'; } return; } return _entV(n, now, dt); }; }

// ---------- lado do jogador ----------
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV = progEvent; progEvent = function (m, now) { if (m.t === 'empsell') { vlMenu(m.l || []); return true; } return _peV(m, now); }; }
function vlMenu(L) {
  if (!L.length) { staffPanel('empsell', 'Vender o meu loot', '<div style="padding:14px">Nada para vender: o baú de casa e a cesta estão vazios (ou ninguém na cidade compra o que tem lá).</div>'); return; }
  let h = '<div style="padding:6px 14px 0;font-size:13px;opacity:.85">Marque o que ela leva. Cada item vai para quem paga mais.</div><div style="max-height:52vh;overflow:auto;padding:6px 14px">' + L.map(([k, n, v, pr, who], i) => '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(201,162,74,.2)"><input type="checkbox" data-vk="' + i + '"><span style="flex:1"><b>' + n + '</b> <small style="opacity:.75">× ' + v + ' · ' + pr + ' cada · ' + who + '</small></span><input type="number" min="1" max="' + v + '" value="' + v + '" data-vq="' + i + '" style="width:58px"></label>').join('') + '</div>';
  h += '<div style="padding:8px 14px;display:flex;gap:8px;align-items:center"><button class="est-btn ghost" data-vall>Marcar tudo</button><span style="flex:1;font-size:13px" id="vl-tot"></span><button class="est-btn" data-vgo>Vender</button></div>';
  const d = staffPanel('empsell', 'Vender o meu loot', h), tot = () => { let s = 0; d.querySelectorAll('[data-vk]').forEach(c => { if (c.checked) { const i = +c.dataset.vk, qv = +d.querySelector('[data-vq="' + i + '"]').value || 0; s += Math.min(qv, L[i][2]) * L[i][3]; } }); d.querySelector('#vl-tot').textContent = s ? 'cerca de ' + s + ' de ouro' : ''; };
  d.querySelectorAll('input').forEach(x => x.oninput = tot); d.querySelector('[data-vall]').onclick = () => { d.querySelectorAll('[data-vk]').forEach(c => { c.checked = true; }); tot(); };
  d.querySelector('[data-vgo]').onclick = () => { const list = []; d.querySelectorAll('[data-vk]').forEach(c => { if (c.checked) { const i = +c.dataset.vk; list.push([L[i][0], Math.min(L[i][2], +d.querySelector('[data-vq="' + i + '"]').value || 0)]); } }); if (!list.length) return; d.remove(); Net.send({ t: 'emp', a: 'order', o: 'sellloot', list }); };
}
if (typeof empMenu === 'function' && typeof G !== 'undefined') { const _emnV = empMenu; empMenu = function () { _emnV(); try { const d = document.getElementById('empmenu'), L = d && d.querySelector('.lift-list'); if (!L || L.querySelector('[data-vsell]')) return; const b = document.createElement('button'); b.className = 'lift-btn'; b.dataset.vsell = 1; b.innerHTML = '<span class="lift-n">💰</span><span><b>Vender o meu loot</b><br><small>Leva o que você marcar (do baú e da cesta) a quem paga mais; o ouro vai para o banco pelo seu segurança.</small></span>'; b.onclick = () => { d.remove(); Net.send({ t: 'emp', a: 'sellcat' }); }; L.appendChild(b); } catch (e) { } }; }
