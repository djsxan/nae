// ============================================================
//  MERCADO IMOBILIÁRIO NO CLIENTE — painel da Imobiliária (mapa da cidade, lista de casas, lojas e oficinas,
//  minha casa: aluguel, autorizados, baú), placas "Aluga-se" nas portas, porta trancada, tecla L.
// ============================================================
G.est = { st: {}, L: {}, mine: null, mineT: 0, tab: 'house', sel: null };
const EST_KIND = { house: 'Casas', shop: 'Lojas', workshop: 'Oficinas', mine: 'Minha casa' };
const EST_PERKS = ['🔒 Porta trancada: só você e quem você autorizar entram', '🧰 Baú seguro dentro de casa (F)', '🛏 Acorda em casa quando entra no reino', '✨ Dormir na sua cama recupera mais rápido e dá "Bem descansado"'];

function estateEvent(m) {
  if (m.t !== 'estate') return false;
  if (m.st) G.est.st = m.st; if (m.L) G.est.L = m.L;
  if ('mine' in m) { G.est.mine = m.mine; G.est.mineT = performance.now(); }
  if (estOpen()) estRender();
  return true;
}
const estOpen = () => { const el = document.getElementById('estate'); return el && !el.classList.contains('hidden'); };
const estMe = () => G.me && G.me.name ? G.me.name.trim().toLowerCase() : '';
function estStatus(P) {
  const who = G.est.st[P.id], mine = G.est.mine && G.est.mine.pid === P.id;
  if (P.kind !== 'house') return P.npc ? { k: 'npc', t: 'Ocupado · ' + P.npc } : { k: 'vac', t: 'Vago · contratos em breve' };
  if (mine) return { k: 'mine', t: 'Sua casa' };
  if (who) return { k: 'rent', t: 'Alugado · ' + who };
  return { k: 'free', t: 'Aluga-se' };
}
const EST_COL = { free: '#7cc35e', rent: '#8a7d6c', mine: '#e8c45a', npc: '#5f84c4', vac: '#c08a4a', office: '#d8743a', other: '#4a4338' };

// ---------- painel ----------
function estBuild() {
  if (document.getElementById('estate')) return;
  const d = document.createElement('div'); d.id = 'estate'; d.className = 'gpanel hidden';
  d.innerHTML = '<div class="gp-head"><span>Imobiliária · Sxan</span><span class="gp-gold"><span class="coin"></span><b id="est-gold">0</b></span><button class="gp-x" id="est-x">✕</button></div>' +
    '<div class="est-tabs">' + Object.keys(EST_KIND).map(k => '<button data-tab="' + k + '">' + EST_KIND[k] + '</button>').join('') + '</div>' +
    '<div class="est-main"><div class="est-mapbox"><canvas id="est-map" width="380" height="280"></canvas><div class="est-legend">' +
    [['free', 'Aluga-se'], ['mine', 'Sua'], ['rent', 'Alugado'], ['npc', 'Comerciante'], ['vac', 'Vago'], ['office', 'Imobiliária']].map(([k, t]) => '<span><i style="background:' + EST_COL[k] + '"></i>' + t + '</span>').join('') +
    '</div></div><div class="est-side"><div id="est-list"></div></div></div><div id="est-detail"></div>';
  document.body.appendChild(d);
  d.querySelector('#est-x').onclick = () => estToggle(false);
  for (const b of d.querySelectorAll('.est-tabs button')) b.onclick = () => { G.est.tab = b.dataset.tab; if (b.dataset.tab === 'mine' && G.est.mine) G.est.sel = G.est.mine.pid; estRender(); };
  const cv = d.querySelector('#est-map');
  cv.onclick = ev => { const r = cv.getBoundingClientRect(), mx = (ev.clientX - r.left) * cv.width / r.width, my = (ev.clientY - r.top) * cv.height / r.height; const P = estPick(mx, my); if (P) { G.est.sel = P.id; if (P.kind !== G.est.tab && G.est.tab !== 'mine') G.est.tab = P.kind; estRender(); } };
}
function estToggle(on, tab, sel) {
  estBuild(); const el = document.getElementById('estate'), open = on != null ? on : el.classList.contains('hidden');
  el.classList.toggle('hidden', !open);
  if (open) { if (tab) G.est.tab = tab; if (sel) G.est.sel = sel; if (G.est.tab === 'mine' && G.est.mine && !sel) G.est.sel = G.est.mine.pid; Net.send({ t: 'estate', a: 'open' }); estRender(); }
  else Net.send({ t: 'estate', a: 'close' });
}
function estRender() {
  const E = G.est, me = G.me; if (!me) return;
  document.getElementById('est-gold').textContent = me.gold;
  for (const b of document.querySelectorAll('#estate .est-tabs button')) b.classList.toggle('on', b.dataset.tab === E.tab);
  estDrawMap();
  const list = document.getElementById('est-list'), det = document.getElementById('est-detail');
  if (E.tab === 'mine') { list.innerHTML = estMineHtml(); det.innerHTML = estChestHtml(); estWire(); return; }
  const items = PROPS.filter(P => P.kind === E.tab);
  list.innerHTML = items.length ? items.map(P => { const s = estStatus(P); return '<div class="est-row' + (E.sel === P.id ? ' sel' : '') + '" data-pid="' + P.id + '"><i style="background:' + EST_COL[s.k] + '"></i><div><b>' + P.name + '</b><small>' + P.district + ' · ' + P.w + '×' + P.h + (P.floors > 1 ? ' · ' + P.floors + ' andares' : '') + '</small></div><div class="est-r"><b>' + P.rent + '</b><small>ouro/dia</small><em>' + s.t + '</em></div></div>'; }).join('') : '<div class="gp-note">Nenhum imóvel nesta categoria ainda.</div>';
  const P = PROPS_BY[E.sel];
  if (!P || P.kind !== E.tab) det.innerHTML = '<div class="gp-note">' + (E.tab === 'house' ? 'Escolha uma casa na lista ou no mapa. O aluguel é cobrado sozinho a cada dia do jogo (12 minutos), enquanto houver ouro na bolsa.' : 'Lojas e oficinas da cidade: por enquanto todas têm dono ou esperam contrato. Em breve você poderá alugar um ponto, contratar ajudantes e vender pela cidade.') + '</div>';
  else det.innerHTML = estDetailHtml(P);
  estWire();
}
function estDetailHtml(P) {
  const s = estStatus(P), cost = P.rent * 2;
  let h = '<div class="est-det"><div class="est-dh"><b>' + P.name + '</b><span>' + P.district + ' · ' + P.area + ' m² de chão · ' + P.floors + (P.floors > 1 ? ' andares' : ' andar') + '</span></div>';
  if (P.kind === 'house') {
    h += '<ul class="est-perks">' + EST_PERKS.map(t => '<li>' + t + '</li>').join('') + '</ul>';
    h += '<div class="est-cost">Aluguel <b>' + P.rent + '</b> ouro/dia · para entrar: <b>' + cost + '</b> (1º dia + caução devolvida ao sair)</div>';
    if (s.k === 'free') h += '<button class="est-btn" data-rent="' + P.id + '"' + (G.me.gold < cost || G.est.mine ? ' disabled' : '') + '>' + (G.est.mine ? 'Você já aluga uma casa' : G.me.gold < cost ? 'Ouro insuficiente' : 'Alugar por ' + cost + ' ouro') + '</button><button class="est-btn ghost" data-go="' + P.id + '">Mostrar no mapa</button>';
    else h += '<div class="est-cost">' + s.t + '</div>';
  } else h += '<div class="est-cost">' + s.t + ' · aluguel de referência ' + P.rent + ' ouro/dia</div><div class="gp-note">Contratos de negócio (lojas, oficinas, funcionários e estoque) chegam numa próxima versão.</div>';
  return h + '</div>';
}
function estMineHtml() {
  const M = G.est.mine; if (!M) return '<div class="gp-note">Você ainda não aluga nenhuma casa. Veja as casas com placa <b>Aluga-se</b> ou feche contrato com Mestre Anselmo, na Imobiliária Chave de Bronze (Rua do Mercado).</div>';
  const P = PROPS_BY[M.pid], left = Math.max(0, M.next - (performance.now() - G.est.mineT)), late = M.day > M.paid;
  const mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60;
  return '<div class="est-det"><div class="est-dh"><b>' + P.name + '</b><span>' + P.district + ' · aluguel ' + P.rent + ' ouro/dia · caução ' + (M.dep || 0) + '</span></div>' +
    '<div class="est-cost">' + (late ? '<b style="color:#ff8a7a">Aluguel atrasado!</b> Junte ' + P.rent + ' de ouro.' : 'Pago até o fim do dia · próxima cobrança em <b id="est-next">' + mm + ':' + String(ss).padStart(2, '0') + '</b>') + '</div>' +
    '<div class="gp-sub">Quem pode entrar</div><div class="est-auth">' + (M.auth.length ? M.auth.map(a => '<span>' + a + ' <button data-unauth="' + a + '">✕</button></span>').join('') : '<small>Só você.</small>') + '</div>' +
    '<div class="est-addauth"><input id="est-name" maxlength="16" placeholder="Nome do personagem"><button class="est-btn" id="est-add">Autorizar</button></div>' +
    '<button class="est-btn ghost" id="est-leave">Devolver a chave</button></div>';
}
function estInHome() { const M = G.est.mine, me = G.me; if (!M || !me) return false; return WORLD.bld[tileAt(me.x, me.y)] === PROPS_BY[M.pid].bi; }
function estChestHtml() {
  const M = G.est.mine; if (!M) return '';
  if (!estInHome()) return '<div class="gp-note">🧰 O baú fica dentro de casa: entre e aperte F (ou abra este painel lá dentro).</div>';
  const it = (k, n, act) => { const L = LOOT[k]; return L ? '<button class="est-item" data-' + act + '="' + k + '" title="' + L.name + '"><span style="color:' + L.color + '">' + L.icon + '</span><b>' + n + '</b></button>' : ''; };
  const ch = Object.keys(M.chest || {}).map(k => it(k, M.chest[k], 'take')).join(''), inv = Object.keys(G.me.inv || {}).filter(k => LOOT[k] && G.me.inv[k] > 0).map(k => it(k, G.me.inv[k], 'put')).join('');
  return '<div class="est-chest"><div><div class="gp-sub">🧰 Baú (clique para pegar · SHIFT pega tudo)</div><div class="est-grid">' + (ch || '<small>Vazio.</small>') + '</div></div><div><div class="gp-sub">Mochila (clique para guardar · SHIFT guarda tudo)</div><div class="est-grid">' + (inv || '<small>Nada para guardar.</small>') + '</div></div></div>';
}
function estWire() {
  const root = document.getElementById('estate');
  for (const r of root.querySelectorAll('.est-row')) r.onclick = () => { G.est.sel = r.dataset.pid; estRender(); };
  for (const b of root.querySelectorAll('[data-rent]')) b.onclick = () => Net.send({ t: 'estate', a: 'rent', pid: b.dataset.rent });
  for (const b of root.querySelectorAll('[data-go]')) b.onclick = () => { G.est.sel = b.dataset.go; G.est.flash = performance.now(); estDrawMap(); };
  for (const b of root.querySelectorAll('[data-unauth]')) b.onclick = () => Net.send({ t: 'estate', a: 'unauth', name: b.dataset.unauth });
  for (const b of root.querySelectorAll('[data-take]')) b.onclick = ev => Net.send({ t: 'estate', a: 'take', k: b.dataset.take, q: ev.shiftKey ? 999 : 1 });
  for (const b of root.querySelectorAll('[data-put]')) b.onclick = ev => Net.send({ t: 'estate', a: 'put', k: b.dataset.put, q: ev.shiftKey ? 999 : 1 });
  const add = root.querySelector('#est-add'); if (add) add.onclick = () => { const v = root.querySelector('#est-name').value.trim(); if (v) Net.send({ t: 'estate', a: 'auth', name: v }); };
  const lv = root.querySelector('#est-leave'); if (lv) lv.onclick = () => { if (confirm('Devolver a chave? O baú vai para a sua mochila e a caução volta.')) Net.send({ t: 'estate', a: 'leave' }); };
}
// ---------- mapa da cidade (isométrico, igual à câmera do jogo) ----------
function estBounds() {
  if (G.est.bb) return G.est.bb; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const b of BUILDINGS) { const P = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]; for (const [x, y] of P) { const u = x - y, v = (x + y) / 2; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); } }
  return (G.est.bb = { x0: x0 - 3, y0: y0 - 3, x1: x1 + 3, y1: y1 + 3 });
}
function estProj(cv) { const B = estBounds(), k = Math.min(cv.width / (B.x1 - B.x0), cv.height / (B.y1 - B.y0)), ox = (cv.width - (B.x1 - B.x0) * k) / 2, oy = (cv.height - (B.y1 - B.y0) * k) / 2; return (x, y) => [ox + (x - y - B.x0) * k, oy + ((x + y) / 2 - B.y0) * k]; }
function estBldColor(b, bi) {
  if (b.office) return EST_COL.office; const P = PROPS.find(q => q.bi === bi); if (!P) return EST_COL.other; return EST_COL[estStatus(P).k];
}
function estDrawMap() {
  const cv = document.getElementById('est-map'); if (!cv) return; const c = cv.getContext('2d'), pr = estProj(cv);
  c.clearRect(0, 0, cv.width, cv.height); c.fillStyle = '#17130e'; c.fillRect(0, 0, cv.width, cv.height);
  // ruas (pontilhado claro) e muralha
  c.fillStyle = 'rgba(200,180,140,0.10)';
  const B = estBounds();
  for (let y = 0; y < MAP_H; y += 1) for (let x = 0; x < MAP_W; x += 1) { const i = y * MAP_W + x; if (!WORLD.rdir[i]) continue; const [u, v] = pr(x, y); if (u < 0 || v < 0 || u > cv.width || v > cv.height) continue; c.fillRect(u - 0.8, v - 0.5, 1.6, 1); }
  c.fillStyle = 'rgba(200,190,170,0.35)';
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { const o = WORLD.obj[y * MAP_W + x]; if (o !== O.WALL && o !== O.TOWER) continue; const [u, v] = pr(x, y); if (u < 0 || v < 0 || u > cv.width || v > cv.height) continue; c.fillRect(u - 1, v - 0.6, 2, 1.2); }
  const sel = PROPS_BY[G.est.sel], fl = G.est.flash && performance.now() - G.est.flash < 1500;
  BUILDINGS.forEach((b, bi) => {
    const pts = [[b.x - 0.5, b.y - 0.5], [b.x + b.w - 0.5, b.y - 0.5], [b.x + b.w - 0.5, b.y + b.h - 0.5], [b.x - 0.5, b.y + b.h - 0.5]].map(([x, y]) => pr(x, y));
    c.beginPath(); pts.forEach(([u, v], k) => k ? c.lineTo(u, v) : c.moveTo(u, v)); c.closePath();
    c.fillStyle = estBldColor(b, bi); c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
    c.strokeStyle = sel && sel.bi === bi ? '#fff' : 'rgba(0,0,0,0.5)'; c.lineWidth = sel && sel.bi === bi ? 2 + (fl ? Math.sin(performance.now() / 90) + 1 : 0) : 1; c.stroke();
  });
  // você e o corretor
  const me = G.me; if (me) { const [u, v] = pr(me.x, me.y); c.fillStyle = '#ff4a3a'; c.beginPath(); c.arc(u, v, 3, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); }
  const br = NPCS.find(n => n.id === 'broker'); if (br) { const [u, v] = pr(br.x, br.y); c.fillStyle = '#fff'; c.font = 'bold 10px serif'; c.textAlign = 'center'; c.fillText('🔑', u, v - 4); }
  if (fl) requestAnimationFrame(estDrawMap);
}
function estPick(mx, my) {
  const cv = document.getElementById('est-map'), pr = estProj(cv);
  for (const P of PROPS) { const b = BUILDINGS[P.bi], pts = [[b.x - 0.5, b.y - 0.5], [b.x + b.w - 0.5, b.y - 0.5], [b.x + b.w - 0.5, b.y + b.h - 0.5], [b.x - 0.5, b.y + b.h - 0.5]].map(([x, y]) => pr(x, y)); let ins = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > my) !== (yj > my) && mx < (xj - xi) * (my - yi) / (yj - yi) + xi) ins = !ins; } if (ins) return P; }
  return null;
}
// ---------- no mundo: placas, F, porta trancada ----------
function estDoorOut(P) { const b = BUILDINGS[P.bi], [dx, dy] = doorTile(b), v = DOOR_V[b.door || 'S']; return { x: dx + v[0] * 0.9, y: dy + v[1] * 0.9, side: [v[1], -v[0]] }; }
function estFreeSigns() { return PROPS.filter(P => P.kind === 'house' && !G.est.st[P.id]); }
function estNearSign() { const me = G.me; if (!me) return null; let best = null, bd = 2.6; for (const P of estFreeSigns()) { const o = estDoorOut(P), d = dist(me.x, me.y, o.x, o.y); if (d < bd) { bd = d; best = P; } } return best; }
function estatePrompt() {
  if (estInHome()) return 'F: abrir o baú · L: sua casa';
  const P = estNearSign(); if (P) return 'F: Aluga-se — ' + P.name + ' (' + P.rent + ' ouro/dia)';
  return '';
}
function estateF() {
  if (estInHome()) { estToggle(true, 'mine'); return true; }
  const P = estNearSign(); if (P) { estToggle(true, 'house', P.id); return true; }
  return false;
}
// trancada para mim? (cliente; o servidor confere de novo)
function estLockedFor(ox, oy, x, y) { if (G.dev) return false; return estateBlocked(G.me && G.me.name, ox, oy, x, y, G.est.L); }
// placa de madeira "ALUGA-SE" fincada ao lado da porta
function drawRentSign(ctx, sx, sy, now) {
  ctx.save(); ctx.translate(sx, sy); const sw = Math.sin(now / 900 + sx) * 0.04; ctx.rotate(sw);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 1, 5, 1.6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a2f17'; ctx.fillRect(-0.8, -15, 1.6, 16);
  ctx.fillStyle = '#c8a46a'; ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.rect(-9, -19, 18, 7.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a1e0e'; ctx.font = 'bold 4.2px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ALUGA-SE', 0, -15.1);
  ctx.restore();
}
function estSignSpot(P) {   // lado da porta que está livre (sem parede nem prédio vizinho na frente)
  if (P._sign) return P._sign; const o = estDoorOut(P), v = DOOR_V[BUILDINGS[P.bi].door || 'S'];
  let best = null, bs = -1;
  for (const s of [1, -1]) for (const out of [0.5, 0.9]) { const x = o.x + v[0] * out + o.side[0] * 0.9 * s, y = o.y + v[1] * out + o.side[1] * 0.9 * s; let sc = canStand(x, y, 0, 0.25) ? 2 : 0; if (WORLD.bld[tileAt(x + 1, y + 1)] < 0) sc++; if (sc > bs) { bs = sc; best = { x, y }; } }
  return (P._sign = best);
}
function estSignItems(items, ox, oy) {
  if (!G.started || !PROPS.length) return;
  for (const P of estFreeSigns()) { const { x, y } = estSignSpot(P), p = iso(x, y), b = BUILDINGS[P.bi], front = b.door === 'E' || b.door === 'S'; items.push({ d: front ? Math.max(x + y + 0.3, b.x + b.w + b.y + b.h - 1.4) : x + y + 0.3, k: 0, rsign: 1, sx: p.sx + ox, sy: p.sy + oy }); }
}
// contagem regressiva no painel
setInterval(() => { const el = document.getElementById('est-next'); if (!el || !G.est.mine || !estOpen()) return; const M = G.est.mine, left = Math.max(0, M.next - (performance.now() - G.est.mineT)); el.textContent = Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'); if (left <= 0) Net.send({ t: 'estate', a: 'open' }); }, 1000);
