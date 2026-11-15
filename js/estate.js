// ============================================================
//  MERCADO IMOBILIÁRIO E NEGÓCIOS NO CLIENTE — painel da Imobiliária (mapa, casas, lojas, oficinas; alugar ou comprar),
//  Meus imóveis (casa: aluguel, autorizados, baú; negócios: abrir a gestão), placas nas portas, porta trancada, tecla L,
//  e o menu de gestão de cada negócio (cofre, estoque, fornecedor, margem, receita, melhorias, mensageiros).
// ============================================================
G.est = { st: {}, L: {}, mine: null, biz: [], mineT: 0, tab: 'house', sel: null };
G.biz = { pid: null, d: null, tab: 'geral' };
const EST_KIND = { house: 'Casas', shop: 'Lojas', workshop: 'Oficinas', mine: 'Meus imóveis' };
const EST_PERKS = ['🔒 Porta trancada: só você e quem você autorizar entram', '🧰 Baú seguro dentro de casa (F)', '🛏 Acorda em casa quando entra no reino', '✨ Dormir na sua cama recupera mais rápido e dá "Bem descansado"'];
const SHOP_LABEL = { apoth: 'Boticário: poções e ervas', arcane: 'Arcanos: cristais e varinhas', tailor: 'Alfaiataria: linho e tecidos', scroll: 'Pergaminhos: papel e pergaminho' };
const WK_LABEL = { saw: 'Serraria: tira madeira sozinha', mine: 'Mina: tira minério (e às vezes cristais)', farm: 'Horta: dá ervas e linho', carp: 'Carpintaria: madeira → varinhas ou papel', alch: 'Alambique: ervas → poções' };

function estateEvent(m) {
  if (m.t === 'biz') { bizEvent(m); return true; }
  if (m.t === 'counter') { counterShow(m); return true; }
  if (m.t === 'bank') { bankShow(m); return true; }
  if (m.t === 'op') { if (G.dialog && G.dialog.id === m.id) { let el = document.getElementById('dlg-op'); if (!el) { el = document.createElement('div'); el.id = 'dlg-op'; const nm = document.getElementById('dlg-name'); nm.parentNode.insertBefore(el, nm.nextSibling); } el.className = 'op-' + m.lv; el.textContent = m.ln + ' — ' + m.why; } return true; }
  if (m.t !== 'estate') return false;
  if (m.st) G.est.st = m.st; if (m.L) G.est.L = m.L;
  if ('mine' in m) { G.est.mine = m.mine; G.est.mineT = performance.now(); }
  if (m.biz) G.est.biz = m.biz; if (m.ten) G.est.ten = m.ten; if (m.cour) G.est.cour = m.cour;
  if (typeof hubRender === 'function') hubRender();
  if (estOpen()) estRender();
  return true;
}
const estOpen = () => { const el = document.getElementById('estate'); return el && !el.classList.contains('hidden'); };
const estMine = pid => (G.est.mine && G.est.mine.pid === pid) || G.est.biz.some(b => b.pid === pid);
const isBizP = P => P && P.kind !== 'house' && !P.npc;
const tenOf = P => (P && P.tenants && P.tenants.length && !(G.est.ten && G.est.ten.gone && G.est.ten.gone[P.id])) ? P.tenants : [];
const tenNames = P => tenOf(P).map(id => (NPCS.find(n => n.id === id) || { name: id }).name.split(',')[0]).join(' e ');
function estStatus(P) {
  const who = G.est.st[P.id];
  if (estMine(P.id)) return { k: 'mine', t: tenOf(P).length ? 'Seu · inquilinos: ' + tenNames(P) : (who || '')[0] === '★' ? 'Seu (comprado)' : 'Seu (alugado)' };
  if (P.kind === 'house' && tenOf(P).length && !who) return { k: 'npc', t: 'Ocupada · mora ' + tenNames(P) };
  if (P.kind !== 'house' && P.npc) return { k: 'npc', t: 'Ocupado · ' + P.npc };
  if (who) return { k: 'rent', t: (who[0] === '★' ? 'Comprado · ' + who.slice(1) : 'Alugado · ' + who) };
  return { k: 'free', t: P.kind === 'house' ? 'Aluga-se / vende-se' : 'Vago · à venda' };
}
const EST_COL = { ten: '#9a6ab8', free: '#7cc35e', rent: '#8a7d6c', mine: '#e8c45a', npc: '#5f84c4', office: '#d8743a', other: '#4a4338' };

// ---------- painel da Imobiliária ----------
function estBuild() {
  if (document.getElementById('estate')) return;
  const d = document.createElement('div'); d.id = 'estate'; d.className = 'gpanel hidden';
  d.innerHTML = '<div class="gp-head"><span>Imobiliária · Nae</span><span class="gp-gold"><span class="coin"></span><b id="est-gold">0</b></span><button class="gp-x" id="est-x">✕</button></div>' +
    '<div class="est-tabs">' + Object.keys(EST_KIND).map(k => '<button data-tab="' + k + '">' + EST_KIND[k] + '</button>').join('') + '</div>' +
    '<div class="est-main"><div class="est-mapbox"><canvas id="est-map" width="380" height="280"></canvas><div class="est-legend">' +
    [['free', 'Livre'], ['mine', 'Seu'], ['rent', 'De outro jogador'], ['npc', 'Comerciante'], ['ten', 'Morador'], ['office', 'Imobiliária']].map(([k, t]) => '<span><i style="background:' + EST_COL[k] + '"></i>' + t + '</span>').join('') +
    '</div></div><div class="est-side"><div id="est-list"></div></div></div><div id="est-detail"></div>';
  document.body.appendChild(d);
  d.querySelector('#est-x').onclick = () => estToggle(false);
  for (const b of d.querySelectorAll('.est-tabs button')) b.onclick = () => { G.est.tab = b.dataset.tab; estRender(); };
  const cv = d.querySelector('#est-map');
  cv.onclick = ev => { const r = cv.getBoundingClientRect(), mx = (ev.clientX - r.left) * cv.width / r.width, my = (ev.clientY - r.top) * cv.height / r.height; const P = estPick(mx, my); if (P) { G.est.sel = P.id; if (G.est.tab !== 'mine') G.est.tab = P.kind; estRender(); } };
}
function estToggle(on, tab, sel) {
  estBuild(); const el = document.getElementById('estate'), open = on != null ? on : el.classList.contains('hidden');
  el.classList.toggle('hidden', !open);
  if (open) { if (tab) G.est.tab = tab; if (sel) G.est.sel = sel; Net.send({ t: 'estate', a: 'open' }); estRender(); }
  else Net.send({ t: 'estate', a: 'close' });
}
function estRender() {
  const E = G.est, me = G.me; if (!me) return;
  document.getElementById('est-gold').textContent = me.gold;
  for (const b of document.querySelectorAll('#estate .est-tabs button')) b.classList.toggle('on', b.dataset.tab === E.tab);
  estDrawMap();
  const list = document.getElementById('est-list'), det = document.getElementById('est-detail');
  if (E.tab === 'mine') { list.innerHTML = estMineHtml(); det.innerHTML = estChestHtml(); estWire(); return; }
  const items = PROPS.filter(P => P.kind === E.tab || (E.tab === 'shop' && P.kind === 'bank'));
  list.innerHTML = items.length ? items.map(P => { const s = estStatus(P); return '<div class="est-row' + (E.sel === P.id ? ' sel' : '') + '" data-pid="' + P.id + '"><i style="background:' + EST_COL[s.k] + '"></i><div><b>' + P.name + '</b><small>' + P.district + ' · ' + P.locName + ' · ' + P.w + '×' + P.h + (P.floors > 1 ? ' · ' + P.floors + ' andares' : '') + '</small></div><div class="est-r"><b>' + P.week + '</b><small>ouro/semana</small><em>' + s.t + '</em></div></div>'; }).join('') : '<div class="gp-note">Nenhum imóvel nesta categoria ainda.</div>';
  const P = PROPS_BY[E.sel];
  if (!P || P.kind !== E.tab) det.innerHTML = '<div class="gp-note">' + (E.tab === 'house' ? 'Escolha uma casa na lista ou no mapa. Alugando, o aluguel sai sozinho uma vez por semana do jogo (7 dias = 84 minutos); comprando, paga uma vez e só 7 ouro de imposto por semana. Perto do castelo é área nobre (caro); na periferia e na vila, barato.' : 'Lojas vendem sozinhas o que você abastece; oficinas produzem e os mensageiros levam a produção para as suas lojas. O lucro fica no cofre de cada negócio: vá buscar. Até ' + 3 + ' negócios por personagem.') + '</div>';
  else det.innerHTML = estDetailHtml(P);
  estWire();
}
function estDetailHtml(P) {
  const s = estStatus(P), cost = P.rent * 9, hasHouse = !!G.est.mine, nBiz = G.est.biz.length;
  let h = '<div class="est-det"><div class="est-dh"><b>' + P.name + '</b><span>' + P.district + ' · ' + P.area + ' m² de chão · ' + P.floors + (P.floors > 1 ? ' andares' : ' andar') + '</span></div>';
  if (P.kind === 'house') h += '<ul class="est-perks">' + EST_PERKS.map(t => '<li>' + t + '</li>').join('') + '</ul>';
  else if (isBizP(P)) h += '<div class="est-cost">' + (P.kind === 'shop' ? '🛒 ' + (SHOP_LABEL[P.shopType] || '') : '⚒ ' + (WK_LABEL[P.wk] || '')) + ' · funcionário incluso (salário ' + (P.kind === 'shop' ? 6 : 8) + ' ouro/dia, pago do cofre)</div>';
  h += '<div class="est-cost">Localização: <b>' + P.locName + '</b> · Alugar: <b>' + P.week + '</b> ouro/semana (entrada ' + cost + ': 1ª semana + caução) · Comprar: <b>' + P.buy + '</b> ouro (imposto 7/semana; vende de volta pela metade)</div>';
  if (P.kind === 'house' && tenOf(P).length && !G.est.st[P.id]) {   // casa com inquilino: só dá para comprar (e receber o aluguel)
    h += '<div class="est-cost">🏠 Mora aqui: <b>' + tenNames(P) + '</b>. Quem comprar recebe <b>' + P.week + '</b> ouro/semana de aluguel (menos 7 de imposto). Dá para despejar com 1 dia de aviso.</div>';
    h += G.est.biz.length >= 3 ? '<button class="est-btn" disabled>Limite de 3 negócios/investimentos</button>' : '<button class="est-btn" data-buy="' + P.id + '"' + (G.me.gold < P.buy ? ' disabled' : '') + '>Comprar com inquilino por ' + P.buy + '</button>';
    return h + '</div>';
  }
  if (s.k === 'free' && (P.kind === 'house' || isBizP(P))) {
    const block = P.kind === 'house' ? (hasHouse ? 'Você já tem uma casa' : '') : (nBiz >= 3 ? 'Limite de 3 negócios' : '');
    if (P.kind === 'bank') h += '<div class="est-cost">🏛 Só se compra, e o Conselho exige <b>reputação ' + (P.repMin || 70) + '</b> (a sua: ' + (G.me.rep ?? '?') + '). O dono fica com os juros dos empréstimos e com o saldo de quem morre.</div>';
    h += block ? '<button class="est-btn" disabled>' + block + '</button>' : (P.kind === 'bank' ? '' : '<button class="est-btn" data-rent="' + P.id + '"' + (G.me.gold < cost ? ' disabled' : '') + '>Alugar por ' + cost + '</button>') + '<button class="est-btn" data-buy="' + P.id + '"' + (G.me.gold < P.buy || (P.kind === 'bank' && (G.me.rep || 0) < (P.repMin || 70)) ? ' disabled' : '') + '>Comprar por ' + P.buy + '</button>';
    h += '<button class="est-btn ghost" data-go="' + P.id + '">Mostrar no mapa</button>';
  } else if (s.k === 'mine') { const info = (P.kind === 'house' ? G.est.mine : G.est.biz.find(b => b.pid === P.id)) || {}; if (info.mode !== 'own') h += '<button class="est-btn" data-buy="' + P.id + '"' + (G.me.gold < P.buy - (info.dep || 0) ? ' disabled' : '') + '>Comprar de vez por ' + (P.buy - (info.dep || 0)) + '</button>'; if (P.kind !== 'house') h += '<button class="est-btn" data-manage="' + P.id + '">Abrir a gestão</button>'; }
  else h += '<div class="est-cost">' + s.t + '</div>';
  return h + '</div>';
}
const estClock = info => { const left = Math.max(0, info.next - (performance.now() - G.est.mineT)), h = Math.floor(left / 3600000), m = Math.floor(left / 60000) % 60; return (h ? h + 'h ' : '') + m + 'min'; };
function estMineHtml() {
  const M = G.est.mine; let h = '';
  if (!M) h += '<div class="gp-note">Você ainda não tem casa. Procure as placas nas portas ou fale com Mestre Anselmo, na Imobiliária Chave de Bronze.</div>';
  else {
    const P = PROPS_BY[M.pid], late = M.day > M.paid, own = M.mode === 'own';
    h += '<div class="est-det"><div class="est-dh"><b>🏠 ' + P.name + '</b><span>' + P.district + ' · ' + (own ? 'comprada · imposto 7 ouro/semana' : 'alugada · ' + P.week + ' ouro/semana · caução ' + (M.dep || 0)) + '</span></div>' +
      '<div class="est-cost">' + (late ? '<b style="color:#ff8a7a">Pagamento atrasado!</b> Junte ' + M.due + ' de ouro.' : 'Em dia · próxima cobrança em <b class="est-next">' + estClock(M) + '</b>') + '</div>' +
      '<div class="gp-sub">Quem pode entrar</div><div class="est-auth">' + (M.auth.length ? M.auth.map(a => '<span>' + a + ' <button data-unauth="' + a + '" data-upid="' + M.pid + '">✕</button></span>').join('') : '<small>Só você.</small>') + '</div>' +
      '<div class="est-addauth"><input id="est-name" maxlength="16" placeholder="Nome do personagem"><button class="est-btn" id="est-add" data-apid="' + M.pid + '">Autorizar</button></div>' +
      (own ? '' : '<button class="est-btn" data-buy="' + M.pid + '">Comprar de vez por ' + (P.buy - (M.dep || 0)) + '</button>') + '<button class="est-btn ghost" data-leave="' + M.pid + '" data-own="' + (own ? 1 : 0) + '">' + (own ? 'Vender à Coroa (' + Math.floor(P.buy / 2) + ')' : 'Devolver a chave') + '</button></div>';
  }
  if (G.est.biz.length) h += '<div class="gp-sub">Negócios e investimentos</div>' + G.est.biz.map(b => { const P = PROPS_BY[b.pid], own = b.mode === 'own';
    if (P.kind === 'house') return '<div class="est-row biz"><i style="background:' + EST_COL.mine + '"></i><div><b>🏘 ' + P.name + '</b><small>' + P.district + ' · inquilinos: ' + tenNames(P) + ' · renda ' + P.week + '/semana · caixa ' + (b.box || 0) + (b.ev ? ' · <b style="color:#ff9a8a">despejo em andamento</b>' : '') + '</small></div><div class="est-r">' + (b.box ? '<button class="est-btn" data-tcol="' + b.pid + '">Receber ' + b.box + '</button>' : '') + (b.ev ? '' : '<button class="est-btn ghost" data-evict="' + b.pid + '">Despejar</button>') + '<button class="est-btn ghost" data-leave="' + b.pid + '" data-own="1">Vender</button></div></div>';
    return '<div class="est-row biz"><i style="background:' + EST_COL.mine + '"></i><div><b>' + (P.kind === 'shop' ? '🛒 ' : '⚒ ') + P.name + '</b><small>' + P.district + ' · ' + (own ? 'comprado' : 'alugado ' + P.week + '/semana') + ' · cofre ' + (b.cofre || 0) + '</small></div><div class="est-r"><button class="est-btn" data-manage="' + b.pid + '">Gestão</button><button class="est-btn ghost" data-leave="' + b.pid + '" data-own="' + (own ? 1 : 0) + '">' + (own ? 'Vender' : 'Devolver') + '</button></div></div>'; }).join('');
  else h += '<div class="gp-note">Nenhum negócio ainda: veja as abas Lojas e Oficinas.</div>';
  return h;
}
function estInHome() { const M = G.est.mine, me = G.me; if (!M || !me) return false; return WORLD.bld[tileAt(me.x, me.y)] === PROPS_BY[M.pid].bi; }
function estInBiz() { const me = G.me; if (!me) return null; const bi = WORLD.bld[tileAt(me.x, me.y)]; return G.est.biz.find(b => PROPS_BY[b.pid].bi === bi) || null; }
function estChestHtml() {
  const M = G.est.mine; if (!M) return '';
  if (!estInHome()) return '<div class="gp-note">🧰 O baú fica dentro de casa: entre e aperte F (ou abra este painel lá dentro).</div>';
  const it = (k, n, act) => { const L = LOOT[k]; return L ? '<button class="est-item" data-' + act + '="' + k + '" title="' + L.name + '"><span style="color:' + L.color + '">' + L.icon + '</span><b>' + n + '</b></button>' : ''; };
  const ch = Object.keys(M.chest || {}).map(k => it(k, M.chest[k], 'take')).join(''), inv = Object.keys(G.me.inv || {}).filter(k => LOOT[k] && G.me.inv[k] > 0).map(k => it(k, G.me.inv[k], 'put')).join('');
  return '<div class="est-chest"><div><div class="gp-sub">🧰 Baú (clique para pegar · SHIFT pega tudo)</div><div class="est-grid">' + (ch || '<small>Vazio.</small>') + '</div></div><div><div class="gp-sub">Mochila (clique para guardar · SHIFT guarda tudo)</div><div class="est-grid">' + (inv || '<small>Nada para guardar.</small>') + '</div></div></div>';
}
function estWire() {
  const root = document.getElementById('estate');
  for (const r of root.querySelectorAll('.est-row:not(.biz)')) r.onclick = () => { G.est.sel = r.dataset.pid; estRender(); };
  for (const b of root.querySelectorAll('[data-rent]')) b.onclick = () => Net.send({ t: 'estate', a: 'rent', pid: b.dataset.rent });
  for (const b of root.querySelectorAll('[data-buy]')) b.onclick = () => { const P = PROPS_BY[b.dataset.buy]; if (confirm('Comprar ' + P.name + '? Fica seu para sempre (imposto de 1 ouro por dia).')) Net.send({ t: 'estate', a: 'buy', pid: b.dataset.buy }); };
  for (const b of root.querySelectorAll('[data-tcol]')) b.onclick = ev => { ev.stopPropagation(); Net.send({ t: 'estate', a: 'collect', pid: b.dataset.tcol }); };
  for (const b of root.querySelectorAll('[data-evict]')) b.onclick = ev => { ev.stopPropagation(); const P = PROPS_BY[b.dataset.evict]; if (confirm('Despejar ' + tenNames(P) + ' de ' + P.name + '? Eles saem em 1 dia do jogo e vão guardar rancor (podem te atacar se você entrar).')) Net.send({ t: 'estate', a: 'evict', pid: b.dataset.evict }); };
  for (const b of root.querySelectorAll('[data-manage]')) b.onclick = ev => { ev.stopPropagation(); bizOpen(b.dataset.manage); };
  for (const b of root.querySelectorAll('[data-go]')) b.onclick = () => { G.est.sel = b.dataset.go; G.est.flash = performance.now(); estDrawMap(); };
  for (const b of root.querySelectorAll('[data-unauth]')) b.onclick = () => Net.send({ t: 'estate', a: 'unauth', name: b.dataset.unauth, pid: b.dataset.upid });
  for (const b of root.querySelectorAll('[data-take]')) b.onclick = ev => Net.send({ t: 'estate', a: 'take', k: b.dataset.take, q: ev.shiftKey ? 999 : 1 });
  for (const b of root.querySelectorAll('[data-put]')) b.onclick = ev => Net.send({ t: 'estate', a: 'put', k: b.dataset.put, q: ev.shiftKey ? 999 : 1 });
  const add = root.querySelector('#est-add'); if (add) add.onclick = () => { const v = root.querySelector('#est-name').value.trim(); if (v) Net.send({ t: 'estate', a: 'auth', name: v, pid: add.dataset.apid }); };
  for (const b of root.querySelectorAll('[data-leave]')) b.onclick = ev => { ev.stopPropagation(); const P = PROPS_BY[b.dataset.leave], own = b.dataset.own === '1'; if (confirm(own ? 'Vender ' + P.name + ' de volta à Coroa por ' + Math.floor(P.buy / 2) + ' de ouro?' : 'Devolver ' + P.name + '? A caução volta' + (P.kind === 'house' ? ' e o baú vai para a mochila.' : ' e o cofre vai para a bolsa (o estoque fica).'))) Net.send({ t: 'estate', a: 'leave', pid: b.dataset.leave }); };
}
// ---------- mapa da cidade (isométrico, igual à câmera do jogo) ----------
function estBounds() {
  if (G.est.bb) return G.est.bb; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const b of BUILDINGS) { const P = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]; for (const [x, y] of P) { const u = x - y, v = (x + y) / 2; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); } }
  return (G.est.bb = { x0: x0 - 3, y0: y0 - 3, x1: x1 + 3, y1: y1 + 3 });
}
function estProj(cv) { const B = estBounds(), k = Math.min(cv.width / (B.x1 - B.x0), cv.height / (B.y1 - B.y0)), ox = (cv.width - (B.x1 - B.x0) * k) / 2, oy = (cv.height - (B.y1 - B.y0) * k) / 2; return (x, y) => [ox + (x - y - B.x0) * k, oy + ((x + y) / 2 - B.y0) * k]; }
function estBldColor(b, bi) { if (b.office) return EST_COL.office; { const P = PROPS.find(q => q.bi === bi); if (P && tenOf(P).length && !estMine(P.id)) return '#9a6ab8'; } const P = PROPS.find(q => q.bi === bi); if (!P) return EST_COL.other; return EST_COL[estStatus(P).k]; }
function estDrawMap() {
  const cv = document.getElementById('est-map'); if (!cv) return; const c = cv.getContext('2d'), pr = estProj(cv);
  c.clearRect(0, 0, cv.width, cv.height); c.fillStyle = '#17130e'; c.fillRect(0, 0, cv.width, cv.height);
  if (!G.est.bg) {   // ruas, água e muralha não mudam: desenha uma vez
    const bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; const g = bg.getContext('2d');
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { const i = y * MAP_W + x, o = WORLD.obj[i], gr = WORLD.ground[i]; const [u, v] = pr(x, y); if (u < 0 || v < 0 || u > cv.width || v > cv.height) continue;
      if (gr === T.WATER || gr === T.SHALLOW) { g.fillStyle = 'rgba(70,110,150,0.35)'; g.fillRect(u - 0.8, v - 0.5, 1.6, 1); }
      else if (o === O.WALL || o === O.TOWER) { g.fillStyle = 'rgba(200,190,170,0.35)'; g.fillRect(u - 1, v - 0.6, 2, 1.2); }
      else if (WORLD.rdir[i]) { g.fillStyle = 'rgba(200,180,140,0.12)'; g.fillRect(u - 0.8, v - 0.5, 1.6, 1); } }
    G.est.bg = bg;
  }
  c.drawImage(G.est.bg, 0, 0);
  const sel = PROPS_BY[G.est.sel], fl = G.est.flash && performance.now() - G.est.flash < 1500;
  BUILDINGS.forEach((b, bi) => {
    const pts = [[b.x - 0.5, b.y - 0.5], [b.x + b.w - 0.5, b.y - 0.5], [b.x + b.w - 0.5, b.y + b.h - 0.5], [b.x - 0.5, b.y + b.h - 0.5]].map(([x, y]) => pr(x, y));
    c.beginPath(); pts.forEach(([u, v], k) => k ? c.lineTo(u, v) : c.moveTo(u, v)); c.closePath();
    c.fillStyle = estBldColor(b, bi); c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
    c.strokeStyle = sel && sel.bi === bi ? '#fff' : 'rgba(0,0,0,0.5)'; c.lineWidth = sel && sel.bi === bi ? 2 + (fl ? Math.sin(performance.now() / 90) + 1 : 0) : 1; c.stroke();
  });
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
function estFreeSigns() { return PROPS.filter(P => (P.kind === 'house' || isBizP(P)) && !G.est.st[P.id] && !tenOf(P).length); }
function estNearSign() { const me = G.me; if (!me) return null; let best = null, bd = 2.6; for (const P of estFreeSigns()) { const o = estDoorOut(P), d = dist(me.x, me.y, o.x, o.y); if (d < bd) { bd = d; best = P; } } return best; }
function estatePrompt() {
  if (estInHome()) return 'F: abrir o baú · L: seus imóveis';
  const b = estInBiz(); if (b) return 'F: gestão de ' + PROPS_BY[b.pid].name;
  const P = estNearSign(); if (P) return 'F: ' + (P.kind === 'house' ? 'Aluga-se' : 'À venda') + ' — ' + P.name + ' (' + P.week + ' ouro/semana · compra ' + P.buy + ')';
  return '';
}
function estateF() {
  if (estInHome()) { estToggle(true, 'mine'); return true; }
  const b = estInBiz(); if (b) { bizOpen(b.pid); return true; }
  const P = estNearSign(); if (P) { estToggle(true, P.kind, P.id); return true; }
  return false;
}
function estLockedFor(ox, oy, x, y) { if (G.dev) return false; return estateBlocked(G.me && G.me.name, ox, oy, x, y, G.est.L); }
// placa de madeira fincada ao lado da porta ("ALUGA-SE" nas casas, "À VENDA" nos pontos de negócio)
function drawRentSign(ctx, sx, sy, now, txt) {
  ctx.save(); ctx.translate(sx, sy); const sw = Math.sin(now / 900 + sx) * 0.04; ctx.rotate(sw);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 1, 5, 1.6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a2f17'; ctx.fillRect(-0.8, -15, 1.6, 16);
  ctx.fillStyle = '#c8a46a'; ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.rect(-9, -19, 18, 7.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a1e0e'; ctx.font = 'bold 4.2px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt || 'ALUGA-SE', 0, -15.1);
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
  for (const P of estFreeSigns()) { const { x, y } = estSignSpot(P), p = iso(x, y), b = BUILDINGS[P.bi], front = b.door === 'E' || b.door === 'S'; items.push({ d: front ? Math.max(x + y + 0.3, b.x + b.w + b.y + b.h - 1.4) : x + y + 0.3, k: 0, rsign: P.kind === 'house' ? 'ALUGA-SE' : 'À VENDA', sx: p.sx + ox, sy: p.sy + oy }); }
}
setInterval(() => { if (!estOpen()) return; for (const el of document.querySelectorAll('#estate .est-next')) if (G.est.mine) el.textContent = estClock(G.est.mine); }, 1000);

// ============================================================
//  GESTÃO DE UM NEGÓCIO
// ============================================================
const BIZ_TABS = { geral: 'Visão geral', estoque: 'Estoque', melhorias: 'Melhorias', diario: 'Diário' };
function bizBuild() {
  if (document.getElementById('biz')) return;
  const d = document.createElement('div'); d.id = 'biz'; d.className = 'gpanel hidden';
  d.innerHTML = '<div class="gp-head"><span id="biz-name">Negócio</span><span class="gp-gold"><span class="coin"></span><b id="biz-gold">0</b></span><button class="gp-x" id="biz-x">✕</button></div><div class="est-tabs" id="biz-tabs">' + Object.keys(BIZ_TABS).map(k => '<button data-btab="' + k + '">' + BIZ_TABS[k] + '</button>').join('') + '</div><div id="biz-body"></div>';
  document.body.appendChild(d);
  d.querySelector('#biz-x').onclick = () => bizClose();
  for (const b of d.querySelectorAll('[data-btab]')) b.onclick = () => { G.biz.tab = b.dataset.btab; bizRender(); };
}
function bizOpen(pid) { bizBuild(); G.biz.pid = pid; G.biz.d = null; document.getElementById('biz').classList.remove('hidden'); document.getElementById('biz-body').innerHTML = '<div class="gp-note">Abrindo o livro-caixa…</div>'; Net.send({ t: 'biz', a: 'open', pid }); }
function bizClose() { const el = document.getElementById('biz'); if (el) el.classList.add('hidden'); Net.send({ t: 'biz', a: 'close' }); G.biz.pid = null; }
function bizEvent(m) { if (m.pid !== G.biz.pid) return; if (m.none) { bizClose(); return; } G.biz.d = m; bizRender(); }
const bsend = (a, x) => Net.send({ t: 'biz', a, pid: G.biz.pid, ...x });
const gIc = g => '<span class="biz-gi">' + GOODS[g].ic + '</span>';
function bizRender() {
  const m = G.biz.d, el = document.getElementById('biz'); if (!m || !el || el.classList.contains('hidden')) return;
  const P = PROPS_BY[m.pid], B = m.b, shop = P.kind === 'shop', cap = 500 * (1 + (B.up.safe || 0));
  document.getElementById('biz-name').textContent = (shop ? '🛒 ' : '⚒ ') + P.name;
  document.getElementById('biz-gold').textContent = G.me.gold;
  for (const b of el.querySelectorAll('[data-btab]')) b.classList.toggle('on', b.dataset.btab === G.biz.tab);
  let h = '<div class="biz-top"><div class="biz-cofre"><small>Cofre</small><b>' + Math.floor(B.cofre) + '</b><small>/ ' + cap + '</small></div>' +
    '<div class="biz-st ' + (B.closed ? 'off' : 'on') + '">' + (B.closed ? '⛔ Parado: falta ouro para o salário' : '✅ Funcionando') + '</div>' +
    '<div class="biz-btns"><button class="est-btn" data-bcol' + (m.at ? '' : ' disabled title="Só com você no negócio"') + '>Tirar o ouro' + (m.at ? '' : ' (vá até lá)') + '</button><button class="est-btn ghost" data-bdep="50">Depositar 50</button><button class="est-btn ghost" data-bdep="200">Depositar 200</button></div></div>';
  if (G.biz.tab === 'geral') {
    const hist = [...B.hist, { rev: Math.round(B.today.rev), cost: Math.round(B.today.cost), sold: B.today.sold, now: 1 }], mx = Math.max(10, ...hist.map(d => Math.max(d.rev, d.cost)));
    h += '<div class="gp-sub">Últimos dias (receita × gastos)</div><div class="biz-chart">' + hist.map(d => '<div class="biz-day' + (d.now ? ' now' : '') + '"><i class="r" style="height:' + Math.round(d.rev / mx * 60) + 'px" title="receita ' + d.rev + '"></i><i class="c" style="height:' + Math.round(d.cost / mx * 60) + 'px" title="gastos ' + d.cost + '"></i><small>' + (d.now ? 'hoje' : d.sold + ' un') + '</small></div>').join('') + '</div>';
    h += '<div class="est-cost">' + (shop ? 'Hoje: ' + B.today.sold + ' vendas · ' + Math.round(B.today.rev) + ' de ouro entraram' : 'Hoje: ' + Math.round(B.today.rev) + ' de ouro com excedente vendido ao fornecedor') + ' · salário ' + (shop ? 6 : 8) + '/dia · ' + (m.mode === 'own' ? 'imposto 1/dia' : 'aluguel ' + P.rent + '/dia (da sua bolsa)') + '</div>';
    if (m.cour && m.cour.length) h += '<div class="gp-sub">Mensageiros na rua</div>' + m.cour.map(c => '<div class="est-cost">🏃 ' + c.name + ' · ' + c.st + ' · ' + Object.keys(c.g).map(g => c.g[g] + ' ' + GOODS[g].n).join(', ') + ' → ' + c.to + '</div>').join('');
    h += '<div class="gp-note">' + (shop ? 'A loja vende sozinha para os moradores. Abasteça pelo fornecedor (aba Estoque) ou tenha uma oficina que produza o que ela vende: os mensageiros trazem de graça.' : 'A oficina trabalha sozinha. A produção vai para as suas lojas (ou para outra oficina sua que transforme), levada pelos mensageiros; o que sobra pode ser vendido ao fornecedor.') + '</div>';
  } else if (G.biz.tab === 'estoque' && P.kind === 'bank') {
    h += '<div class="gp-note">O banco não tem estoque: ele ganha com os juros dos empréstimos (9% do que é pago vai para o cofre) e com as heranças de quem morre com saldo. Os juros de 2% dos depósitos saem deste cofre: mantenha ouro aqui.</div>';
  } else if (G.biz.tab === 'estoque') {
    if (shop) {
      const capS = 40 + 40 * (B.up.shelf || 0), used = Object.values(B.stock).reduce((a, b) => a + b, 0), ord = B.orders.reduce((a, o) => a + o.q, 0);
      h += '<div class="est-cost">Prateleiras: <b>' + used + '</b> / ' + capS + (ord ? ' · ' + ord + ' a caminho na carroça' : '') + '</div><table class="biz-tab"><tr><th></th><th>Mercadoria</th><th>Estoque</th><th>Preço</th><th>Fornecedor</th></tr>' +
        (SHOP_GOODS[P.shopType] || []).map(g => { const mg = B.margin[g] ?? 1, M = MARGIN[mg]; return '<tr><td>' + gIc(g) + '</td><td>' + GOODS[g].n + '</td><td><b>' + (B.stock[g] || 0) + '</b></td><td><select data-bmar="' + g + '">' + MARGIN.map((q, i) => '<option value="' + i + '"' + (i === mg ? ' selected' : '') + '>' + q.n + ' (' + (GOODS[g].p * q.k).toFixed(1) + ')</option>').join('') + '</select><small>' + Math.round(M.p * 100) + '% compram</small></td><td><button class="est-btn ghost" data-bord="' + g + '" data-q="10">+10 (' + Math.ceil(GOODS[g].p * 10) + ')</button><button class="est-btn ghost" data-bord="' + g + '" data-q="25">+25 (' + Math.ceil(GOODS[g].p * 25) + ')</button></td></tr>'; }).join('') + '</table>' +
        '<div class="gp-note">Preço de atacado: o que você paga ao fornecedor (da sua bolsa). A carroça chega em 1 hora do jogo (30 s). Margem cara lucra mais por venda, mas menos gente compra.</div>';
    } else {
      const W = WORKS[P.wk], used = Object.values(B.store).reduce((a, b) => a + b, 0);
      h += '<div class="est-cost">' + (W.make ? 'Produz por hora: ' + Object.keys(W.make).map(g => gIc(g) + ' ' + (W.make[g] * (1 + 0.5 * (B.up.tools || 0))).toFixed(1) + ' ' + GOODS[g].n).join(' · ') : 'Receita: <select data-brec>' + Object.keys(W.recipes).map(r => '<option value="' + r + '"' + (r === B.recipe ? ' selected' : '') + '>' + Object.keys(W.recipes[r]).map(g => W.recipes[r][g] + ' ' + GOODS[g].n).join(' + ') + ' → 1 ' + GOODS[r].n + '</option>').join('') + '</select> · ' + (1 + 0.5 * (B.up.tools || 0)).toFixed(1) + ' por hora') + '</div>';
      h += '<div class="est-cost">Depósito: <b>' + Math.floor(used) + '</b> / 120</div><div class="biz-store">' + (Object.keys(B.store).filter(g => B.store[g] >= 1).map(g => '<span>' + gIc(g) + ' <b>' + Math.floor(B.store[g]) + '</b> ' + GOODS[g].n + '</span>').join('') || '<small>Vazio.</small>') + '</div>';
      if (W.recipes) h += '<label class="biz-tg"><input type="checkbox" data-btog="autobuy"' + (B.autobuy ? ' checked' : '') + '> Comprar matéria-prima do fornecedor com o ouro do cofre quando faltar (só se você não tiver a oficina que a produz)</label>';
      h += '<label class="biz-tg"><input type="checkbox" data-btog="sell"' + (B.sell ? ' checked' : '') + '> Vender ao fornecedor o que passar de 50 de cada coisa (70% do preço, vai para o cofre)</label>';
    }
  } else if (G.biz.tab === 'melhorias') {
    h += '<div class="biz-ups">' + Object.keys(BIZ_UP).filter(k => BIZ_UP[k].for === 'both' || BIZ_UP[k].for === P.kind).map(k => { const U = BIZ_UP[k], lv = B.up[k] || 0, c = U.cost[lv]; return '<div class="biz-up"><b>' + U.n + '</b><small>' + U.d + '</small><div class="biz-lv">' + [0, 1, 2].map(i => '<i class="' + (i < lv ? 'on' : '') + '"></i>').join('') + '</div>' + (lv >= 3 ? '<em>Máximo</em>' : '<button class="est-btn" data-bup="' + k + '"' + (G.me.gold < c ? ' disabled' : '') + '>Nível ' + (lv + 1) + ' · ' + c + '</button>') + '</div>'; }).join('') + '</div><div class="gp-note">As melhorias são pagas da sua bolsa e ficam no ponto enquanto ele for seu.</div>';
  } else {
    h += '<div class="biz-log">' + (B.log.map(l => '<div><small>' + new Date(l.at).toLocaleTimeString().slice(0, 5) + '</small> ' + l.t + '</div>').join('') || '<small>Nada ainda.</small>') + '</div>';
  }
  document.getElementById('biz-body').innerHTML = h;
  const body = document.getElementById('biz-body');
  for (const b of body.querySelectorAll('[data-bcol]')) b.onclick = () => bsend('collect');
  for (const b of body.querySelectorAll('[data-bdep]')) b.onclick = () => bsend('deposit', { q: +b.dataset.bdep });
  for (const b of body.querySelectorAll('[data-bord]')) b.onclick = () => bsend('order', { g: b.dataset.bord, q: +b.dataset.q });
  for (const s of body.querySelectorAll('[data-bmar]')) s.onchange = () => bsend('margin', { g: s.dataset.bmar, v: +s.value });
  for (const s of body.querySelectorAll('[data-brec]')) s.onchange = () => bsend('recipe', { v: s.value });
  for (const c of body.querySelectorAll('[data-btog]')) c.onchange = () => bsend('toggle', { k: c.dataset.btog });
  for (const b of body.querySelectorAll('[data-bup]')) b.onclick = () => bsend('up', { k: b.dataset.bup });
}

// ---------- balcão (na conversa com o balconista) ----------
function counterOpen(pid) { G.counterPid = pid; Net.send({ t: 'biz', a: 'counter', pid }); }
function counterShow(m) {
  if (!G.dialog || m.pid !== G.counterPid) return; const box = document.getElementById('dlg-opts'); if (!box) return;
  if (m.none) { setDialogText('Esta loja ainda não tem dono, não tenho nada para vender.'); return; }
  if (m.refuse) { setDialogText('Com você eu não faço negócio. Saia da minha loja.'); return; }
  setDialogText(m.own ? 'Patrão! Pode levar do estoque pelo preço de custo (o ouro fica no cofre).' : m.closed ? 'Desculpe, a loja está fechada: o patrão não pagou meu salário.' : (m.items.length ? 'Loja de ' + m.owner + '. O que vai levar?' : 'Acabou tudo! O patrão precisa reabastecer.'));
  box.innerHTML = '';
  const add = (label, fn, cls) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; if (cls) b.className = cls; box.appendChild(b); };
  for (const it of m.items) { const G2 = GOODS[it.g], I = GOOD_ITEM[it.g], what = I.pot ? (I.pot === 'hp' ? 'Poção de vida' : 'Bandagem') : LOOT[I.loot].name;
    add(G2.ic + ' ' + what + ' · ' + it.price + ' ouro' + (m.own ? ' (custo)' : '') + ' (' + it.q + ' no estoque)', () => Net.send({ t: 'biz', a: 'cbuy', pid: m.pid, g: it.g, q: 1 }));
    if (it.q >= 5) add('   ×5 · ' + it.price * 5 + ' ouro', () => Net.send({ t: 'biz', a: 'cbuy', pid: m.pid, g: it.g, q: 5 }), 'ghost'); }
  add('Voltar', () => buildDialogOptions(G.dialog.id), 'ghost');
  refreshDialogGold();
}

// ============================================================
//  PAINEL NEGÓCIOS (tecla N): todos os seus negócios e investimentos num lugar só
// ============================================================
function hubToggle(on) {
  let d = document.getElementById('bizhub');
  if (!d) { d = document.createElement('div'); d.id = 'bizhub'; d.className = 'gpanel hidden'; d.innerHTML = '<div class="gp-head"><span>Negócios</span><span class="gp-gold"><span class="coin"></span><b id="hub-gold">0</b></span><button class="gp-x" id="hub-x">✕</button></div><div id="hub-body"></div>'; document.body.appendChild(d); d.querySelector('#hub-x').onclick = () => hubToggle(false); }
  const open = on != null ? on : d.classList.contains('hidden'); d.classList.toggle('hidden', !open);
  if (open) { Net.send({ t: 'estate', a: 'open' }); hubRender(); } else if (!estOpen()) Net.send({ t: 'estate', a: 'close' });
}
function hubRender() {
  const d = document.getElementById('bizhub'); if (!d || d.classList.contains('hidden') || !G.me) return;
  document.getElementById('hub-gold').textContent = G.me.gold;
  const L = G.est.biz || [], totCofre = L.reduce((a, b) => a + (b.cofre || b.box || 0), 0), totWeek = L.reduce((a, b) => a + ((b.sum && b.sum.week) || 0), 0);
  let h = '<div class="hub-top"><div><small>Nos cofres</small><b>' + totCofre + '</b></div><div><small>Lucro da semana</small><b class="' + (totWeek < 0 ? 'neg' : '') + '">' + totWeek + '</b></div><div><small>Negócios</small><b>' + L.length + ' / 3</b></div></div>';
  if (!L.length) h += '<div class="gp-note">Você ainda não tem negócios. Fale com Mestre Anselmo na Imobiliária ou procure as placas "À VENDA" (lojas na Rua Nova, oficinas na Vila do Oeste).</div>';
  h += L.map(b => { const P = PROPS_BY[b.pid], S0 = b.sum;
    if (P.kind === 'house') return '<div class="hub-card"><div class="hub-h"><b>🏘 ' + P.name + '</b><span>' + P.district + ' · inquilinos</span></div><div class="hub-row"><span>Caixa de aluguel: <b>' + (b.box || 0) + '</b></span><span>Renda: ' + P.week + '/semana</span></div><div class="hub-act"><button class="est-btn ghost" data-hest="1">Ver no painel de imóveis</button></div></div>';
    const alerts = []; if (S0) { if (S0.closed) alerts.push('⛔ parado: sem ouro p/ salário'); if (S0.full) alerts.push('💰 cofre cheio: venha buscar'); if (P.kind === 'shop' && S0.n === 0 && !S0.orders) alerts.push('📦 sem estoque'); }
    return '<div class="hub-card' + (alerts.length ? ' warn' : '') + '"><div class="hub-h"><b>' + (P.kind === 'shop' ? '🛒 ' : '⚒ ') + P.name + '</b><span>' + P.district + ' · ' + (b.mode === 'own' ? 'comprado' : 'alugado') + '</span></div>' +
      '<div class="hub-row"><span>Cofre <b>' + (b.cofre || 0) + '</b></span><span>' + (P.kind === 'shop' ? 'Prateleiras' : 'Depósito') + ' <b>' + (S0 ? S0.n + '/' + S0.cap : '?') + '</b></span><span>Hoje <b>' + (S0 ? S0.rev : 0) + '</b></span><span>Semana <b>' + (S0 ? S0.week : 0) + '</b></span>' + (S0 && S0.orders ? '<span>🚚 ' + S0.orders + ' a caminho</span>' : '') + '</div>' +
      (alerts.length ? '<div class="hub-alert">' + alerts.join(' · ') + '</div>' : '') + '<div class="hub-act"><button class="est-btn" data-hman="' + b.pid + '">Gerenciar</button></div></div>'; }).join('');
  const C2 = G.est.cour || []; if (C2.length) h += '<div class="gp-sub">Mensageiros na rua</div>' + C2.map(c => '<div class="est-cost">🏃 ' + c.name + ' · ' + c.st + ' · ' + Object.keys(c.g).map(g => c.g[g] + ' ' + GOODS[g].n).join(', ') + ' → ' + c.to + '</div>').join('');
  document.getElementById('hub-body').innerHTML = h;
  for (const b of d.querySelectorAll('[data-hman]')) b.onclick = () => bizOpen(b.dataset.hman);
  for (const b of d.querySelectorAll('[data-hest]')) b.onclick = () => { hubToggle(false); estToggle(true, 'mine'); };
}

// ============================================================
//  BANCO: conta (depositar, sacar), empréstimo e reputação
// ============================================================
function bankOpen() { Net.send({ t: 'bank', a: 'open' }); }
function bankShow(m) {
  let d = document.getElementById('bankp'); if (!d) { d = document.createElement('div'); d.id = 'bankp'; d.className = 'gpanel'; document.body.appendChild(d); }
  const dueTxt = m.loan ? (m.due > 0 ? 'vence em ' + Math.max(1, Math.round(m.due / 60000)) + ' min' : '<b style="color:#ff8a7a">VENCIDA</b>') : '';
  d.innerHTML = '<div class="gp-head"><span>🏛 Banco de Nae</span><span class="gp-gold"><span class="coin"></span><b>' + G.me.gold + '</b></span><button class="gp-x" id="bk-x">✕</button></div>' +
    '<div class="hub-top"><div><small>Saldo guardado</small><b>' + m.g + '</b></div><div><small>Dívida</small><b class="' + (m.loan ? 'neg' : '') + '">' + m.loan + '</b></div><div><small>Reputação</small><b>' + m.rep + '</b></div></div>' +
    '<div class="bk-row"><input id="bk-q" type="number" min="1" placeholder="Quantia"><button class="est-btn" data-bk="dep">Depositar</button><button class="est-btn" data-bk="wd">Sacar</button><button class="est-btn ghost" data-bk="depall">Depositar tudo</button></div>' +
    '<div class="gp-sub">Empréstimo</div><div class="est-cost">' + (m.loan ? 'Você deve <b>' + m.loan + '</b> · ' + dueTxt : 'Pode pegar até <b>' + m.max + '</b> de ouro (cresce com a reputação). Juros de 10% por semana; prazo de 2 semanas.') + '</div>' +
    '<div class="bk-row">' + (m.loan ? '<button class="est-btn" data-bk="repay">Pagar com a quantia</button><button class="est-btn ghost" data-bk="repayall">Quitar tudo</button>' : '<button class="est-btn" data-bk="loan">Pedir empréstimo da quantia</button>') + '</div>' +
    '<div class="gp-note">O ouro no banco rende 2% por semana, não é furtado e não cai no chão. Se você morrer de vez, o saldo fica com o dono do banco (hoje: ' + m.owner + '). Dívida vencida vira caso de polícia.</div>';
  d.classList.remove('hidden');
  d.querySelector('#bk-x').onclick = () => d.classList.add('hidden');
  const q = () => Math.max(0, Math.floor(+d.querySelector('#bk-q').value || 0));
  for (const b of d.querySelectorAll('[data-bk]')) b.onclick = () => { const a = b.dataset.bk; if (a === 'depall') Net.send({ t: 'bank', a: 'dep', q: G.me.gold }); else if (a === 'repayall') Net.send({ t: 'bank', a: 'repay', q: m.loan }); else Net.send({ t: 'bank', a, q: q() }); };
}
