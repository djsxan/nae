// ============================================================
//  MENU DO JOGO (Esc) — tudo em abas: Personagem e inventário, Habilidades, Jornada, Mapa, Negócios,
//  Receitas e ofícios, Avisos, Configurações e (só para o criador) o painel do Tecelão.
//  O mundo não para: o personagem fica parado e os outros veem "no menu" sobre ele.
//  Os painéis antigos (inventário, árvore, jornada, mapa, negócios) são reaproveitados: entram na aba.
// ============================================================
const GM = { tab: 'char', on: false, built: false, biz: 'hub', notes: 'all', wv: null, wvTab: 'people', wvSel: null, wvT: 0, follow: null };
const GM_TABS = [['char', 'Personagem', '🛡'], ['skills', 'Habilidades', '✦'], ['prog', 'Progresso', '📈'], ['journal', 'Jornada', '📜'], ['map', 'Mapa', '🗺'], ['biz', 'Negócios', '🏛'], ['craft', 'Receitas e ofícios', '⚒'], ['houses', 'Casas', '⚜'], ['notes', 'Avisos', '✉'], ['opts', 'Configurações', '⚙'], ['weaver', 'Tecelão', '👁']];   /* a aba Configurações fica escondida: o conteúdo vai para o menu do Esc */
const GM_KEYS = { i: 'char', k: 'skills', j: 'journal', m: 'map', n: 'biz', l: 'biz' };
const gmEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const gmIsDev = () => !!G.dev;   // aba do Tecelão só no modo Tecelão (vocação normal joga como todo mundo)

function gmBuild() {
  if (GM.built) return; GM.built = true;
  const box = document.querySelector('#pause .pz-box'), cols = box.querySelectorAll('.pz-col'), left = cols[0], right = cols[1];
  { // a seção Sala (código, convite e senha do anfitrião) vai para Configurações
    const sec = [...left.querySelectorAll('.pz-sec')].find(e => /Sala/.test(e.textContent)), quit = right.querySelector('#pz-quit');
    if (sec) { const mv = [sec]; let n = sec.nextElementSibling; while (n) { mv.push(n); n = n.nextElementSibling; } for (const el of mv) right.insertBefore(el, quit); }
  }
  box.classList.add('gm'); box.innerHTML = '';
  box.insertAdjacentHTML('beforeend', '<div class="gm-head"><span class="gm-title">Nae</span><span class="gm-hint">TAB ou Esc fecha · o mundo continua</span><a class="gm-guide" href="guia.html" target="_blank" rel="noopener">📖 Guia do jogo</a> <a class="gm-guide" href="roadmap.html" target="_blank" rel="noopener">🗺 Roadmap</a><span class="gp-gold"><span class="coin"></span><b id="gm-gold">0</b></span><button class="gm-x" title="Fechar (Esc)">✕</button></div>' +
    '<nav class="gm-tabs">' + GM_TABS.map(([k, n, ic]) => '<button data-gt="' + k + '"' + (k === 'weaver' ? ' class="gm-dev"' : '') + '><i>' + ic + '</i><span>' + n + '</span></button>').join('') + '</nav><div class="gm-body" id="gm-body"></div>');
  const body = box.querySelector('#gm-body');
  for (const [k] of GM_TABS) { const p = document.createElement('div'); p.className = 'gm-pane'; p.dataset.pane = k; body.appendChild(p); }
  const pane = k => body.querySelector('[data-pane="' + k + '"]');
  // Personagem: ficha + corpo + sobrevivência + habilidades por uso, ao lado do inventário
  const ch = pane('char'); ch.innerHTML = '<div class="gm-cols"><div class="gm-c1"></div><div class="gm-c2"></div></div>';
  ch.querySelector('.gm-c1').appendChild(left); ch.querySelector('.gm-c2').appendChild($('inv'));
  pane('opts').appendChild(right);
  { // habilidades por uso: aba própria
    const sec = [...left.querySelectorAll('.pz-sec')].find(e => /Habilidades por uso/.test(e.textContent)), use = left.querySelector('#pz-use'), P = pane('prog');
    P.innerHTML = '<div class="gp-note">Cada habilidade sobe com o uso: quanto mais você golpeia, apara, corre, cozinha ou lança magia, melhor fica. O bônus aparece à direita.</div>';
    if (sec) P.appendChild(sec); if (use) P.appendChild(use);
    const io = document.createElement('div'); io.innerHTML = '<div class="pz-sec">Seu herói neste navegador</div><div class="gp-note">O herói fica salvo neste navegador. Exporte para guardar uma cópia ou levar para outro computador; importe o arquivo lá.</div><div class="wv-acts"><button class="est-btn" id="hero-exp">Exportar herói</button><label class="est-btn" style="cursor:pointer">Importar herói<input type="file" id="hero-imp" accept=".json,application/json" style="display:none"></label></div>';
    P.appendChild(io); heroIOWire(io);
  }
  pane('skills').appendChild($('tree')); pane('journal').appendChild($('journal'));
  const wm = document.querySelector('#worldmap .wm-frame'); if (wm) pane('map').appendChild(wm);
  pane('biz').innerHTML = '<div class="gm-sub"><button data-gb="hub">Meus negócios</button><button data-gb="est">Imóveis e mapa da cidade</button></div><div class="gm-bizbox"></div>';
  for (const el of [$('inv'), $('tree'), $('journal')]) el.classList.remove('hidden');
  box.querySelector('.gm-x').onclick = () => gmClose();
  box.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => gmShow(b.dataset.gt));
  pane('biz').querySelectorAll('[data-gb]').forEach(b => b.onclick = () => { GM.biz = b.dataset.gb; gmShow('biz'); });
  $('pause').addEventListener('mousedown', e => { if (e.target.id === 'pause') gmClose(); });
}
// ---------- menu do Esc: Continuar, Configurações, Guia, Roadmap, Sair para o menu inicial ----------
const EM = { on: false, opts: false };
function emBuild() {
  if ($('escmenu')) return; gmBuild();
  const d = document.createElement('div'); d.id = 'escmenu'; d.className = 'hidden';
  d.innerHTML = '<div class="em-veil"></div><div class="em-left"><div class="nae-logo">NAE<small>Pausa · o mundo continua</small></div><nav class="nae-nav nae-nav2">'
    + [['resume', 'Continuar'], ['opts', 'Configurações'], ['guide', 'Guia do jogo'], ['road', 'Roadmap'], ['quit', 'Sair para o menu inicial']].map(([k, n]) => '<button data-em="' + k + '">' + n + '</button>').join('')
    + '</nav><div class="em-keys">TAB · personagem, habilidades, jornada, mapa e negócios</div></div><section class="em-opts hidden"><div class="em-opts-head"><h2>Configurações</h2><button class="em-back" data-em="back">Voltar</button></div><div class="em-opts-body"></div></section>';
  document.body.appendChild(d);
  const op = gmPane('opts'), body = d.querySelector('.em-opts-body'); if (op) while (op.firstChild) body.appendChild(op.firstChild);   /* as configurações passam a morar aqui */
  for (const id of ['pz-quit', 'pz-resume']) { const q = body.querySelector('#' + id); if (q) q.style.display = 'none'; }   /* sair e continuar ficam na lista da esquerda */
  d.addEventListener('click', ev => { const b = ev.target.closest('[data-em]'); if (!b) return; const k = b.dataset.em;
    if (k === 'resume') emClose(); else if (k === 'opts') emOpts(!EM.opts); else if (k === 'back') emOpts(false);
    else if (k === 'guide') window.open('guia.html', '_blank', 'noopener'); else if (k === 'road') window.open('roadmap.html', '_blank', 'noopener');
    else if (k === 'quit') { quitToMenu(); } });
}
function emOpts(on) { EM.opts = !!on; const d = $('escmenu'); d.querySelector('.em-opts').classList.toggle('hidden', !EM.opts); d.querySelector('[data-em="opts"]').classList.toggle('on', EM.opts); if (EM.opts && typeof applySettings === 'function') applySettings(); }
function emOpen() {
  if (!G.started) return; if (GM.on) gmClose(); emBuild();
  EM.on = true; G.paused = true; G.keys.clear(); $('escmenu').classList.remove('hidden'); document.body.classList.add('em-on'); emOpts(false); Net.send({ t: 'menu', on: 1 });
}
function emClose() { if (!EM.on) return; EM.on = false; G.paused = false; $('escmenu').classList.add('hidden'); document.body.classList.remove('em-on'); Net.send({ t: 'menu', on: 0 }); }
function emToggle() { if (EM.on) emClose(); else emOpen(); }
function gmPane(k) { return document.querySelector('#gm-body [data-pane="' + k + '"]'); }
// painéis de negócios voltam para fora quando a aba fecha (o corretor e o banco abrem eles sozinhos)
function gmParkBiz() {
  for (const id of ['bizhub', 'estate']) { const el = $(id); if (el && el.parentNode !== document.body) { document.body.appendChild(el); } }
  if ($('bizhub') && !$('bizhub').classList.contains('hidden') && typeof hubToggle === 'function') hubToggle(false);
  if ($('estate') && !$('estate').classList.contains('hidden') && typeof estToggle === 'function') estToggle(false);
}
function gmShow(tab) {
  gmBuild(); if (tab === 'weaver' && !gmIsDev()) tab = 'char';
  if (GM.tab === 'biz' && tab !== 'biz') gmParkBiz();
  GM.tab = tab;
  document.querySelectorAll('#pause [data-gt]').forEach(b => b.classList.toggle('on', b.dataset.gt === tab));
  document.querySelectorAll('#gm-body .gm-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === tab));
  document.querySelector('#pause .gm-dev').style.display = gmIsDev() ? '' : 'none';
  if ($('gm-gold') && G.me) $('gm-gold').textContent = G.me.gold;
  G.mapOpen = tab === 'map';
  if (tab === 'char') { if (typeof updateInv === 'function') updateInv(); if (typeof updateHud === 'function') updateHud(); }
  else if (tab === 'skills') { if (typeof updateTree === 'function') updateTree(); }
  else if (tab === 'prog') { if (typeof updateHud === 'function') updateHud(); }
  else if (tab === 'journal') { if (typeof updateQuests === 'function') updateQuests(); }
  else if (tab === 'map') { if (typeof drawWorldMap === 'function') drawWorldMap(); }
  else if (tab === 'biz') gmBiz();
  else if (tab === 'craft') { gmPane('craft').innerHTML = gmCraftHtml(); gmPane('craft').querySelectorAll('[data-carve]').forEach(b => b.onclick = () => { Net.send({ t: 'carve', k: b.dataset.carve }); setTimeout(() => GM.tab === 'craft' && gmShow('craft'), 2800); }); }
  else if (tab === 'notes') gmNotes();
  else if (tab === 'houses') { if (typeof gmHouses === 'function') gmHouses(); }
  else if (tab === 'weaver') { gmWeaver(); Net.send({ t: 'wv', a: 'snap' }); }
  const b = $('gm-body'); if (b) b.scrollTop = 0;
}
function gmBiz() {
  const P = gmPane('biz'), box = P.querySelector('.gm-bizbox');
  P.querySelectorAll('[data-gb]').forEach(b => b.classList.toggle('on', b.dataset.gb === GM.biz));
  if (GM.biz === 'hub') { if ($('estate') && !$('estate').classList.contains('hidden')) estToggle(false); if (typeof hubToggle === 'function') { hubToggle(true); box.appendChild($('bizhub')); } }
  else { if ($('bizhub') && !$('bizhub').classList.contains('hidden')) hubToggle(false); if (typeof estToggle === 'function') { estToggle(true, 'mine'); box.appendChild($('estate')); } }
}
function gmOpen(tab) {
  if (!G.started) return; gmBuild();
  if (!GM.on) { GM.on = true; G.paused = true; $('pause').classList.remove('hidden'); G.keys.clear(); if (typeof applySettings === 'function') applySettings(); Net.send({ t: 'menu', on: 1 }); }
  gmShow(tab || GM.tab || 'char');
}
function gmClose() {
  if (!GM.on) return; GM.on = false; G.paused = false; G.mapOpen = false;
  $('pause').classList.add('hidden'); gmParkBiz(); Net.send({ t: 'menu', on: 0 });
}
function gmToggle(tab) { if (GM.on && (!tab || tab === GM.tab)) gmClose(); else gmOpen(tab); }
// tecla com o menu aberto: as letras trocam de aba (I, K, J, M, N, L), Esc fecha
function gmKey(k, e) {
  if (EM.on) { if (k === 'escape') { if (EM.opts) emOpts(false); else emClose(); } return true; }   /* menu do Esc aberto */
  if (k === 'escape' || k === 'tab') { e.preventDefault(); gmClose(); return true; }
  if ((k === 'q' || k === 'e') && !e.repeat && GM.on) { const L = GM_TABS.map(t => t[0]).filter(t => t !== 'weaver' || gmIsDev()); let i = L.indexOf(GM.tab); i = (i + (k === 'e' ? 1 : -1) + L.length) % L.length; gmShow(L[i]); return true; }   /* Q e E passam de uma aba para a outra */
  const t = GM_KEYS[k]; if (t && !e.repeat) { if (k === 'n' && typeof estInBiz === 'function' && estInBiz()) { gmClose(); bizOpen(estInBiz().pid); return true; } if (k === 'l') GM.biz = 'est'; else if (k === 'n') GM.biz = 'hub'; gmToggle(t); return true; }
  return false;
}
// ---------- Receitas e ofícios ----------
function gmCraftHtml() {
  const nm = k => k === 'meat' ? 'Carne crua (cervo ou javali)' : (LOOT[k] ? LOOT[k].name : (GOODS[k] ? GOODS[k].n : k));
  const P0 = (G.me && G.me.prof) || {};
  let h = '<div class="gm-cols"><div>';
  h += '<div class="gp-sub">Cozinha (F perto do fogão ou da fogueira)</div>';
  for (const k in RECIPES) { const R = RECIPES[k]; h += '<div class="gm-rec"><b>' + R.name + '</b><small>' + Object.entries(R.need).map(([g, n]) => n + '× ' + nm(g)).join(' + ') + '</small><em>' + R.desc + '</em></div>'; }
  h += '<div class="gp-sub">Entalhe à mão (com um machado)</div>';
  { const inv = (G.me && G.me.inv) || {}, lvA = profLv(P0.artesao); for (const k in CARVE) { const R = CARVE[k], has = Object.entries(R.need).every(([g, n]) => (inv[g] || 0) >= n) && inv.axe > 0, lock = lvA < R.lv; h += '<div class="gm-rec' + (lock ? ' lock' : '') + '"><b>' + LOOT[k].name + '</b><small>' + Object.entries(R.need).map(([g, n]) => n + '× ' + nm(g)).join(' + ') + ' · Artesão ' + R.lv + '</small><em>' + R.desc + ' ' + LOOT[k].desc.split('. ').slice(1).join('. ') + '</em>' + (lock ? '' : '<button class="est-btn" data-carve="' + k + '"' + (has ? '' : ' disabled') + '>Entalhar</button>') + '</div>'; } }
  h += '<div class="gp-sub">Oficinas (produzem sozinhas se você for o dono)</div>';
  for (const k in WORKS) { const W = WORKS[k]; h += '<div class="gm-rec"><b>' + W.n + '</b>' + (W.make ? '<small>Produz ' + Object.entries(W.make).map(([g, n]) => (n < 1 ? 'às vezes ' : n + '× ') + GOODS[g].n).join(', ') + ' por hora</small>' : '') + (W.recipes ? '<small>' + Object.entries(W.recipes).map(([g, rec]) => GOODS[g].n + ' ← ' + Object.entries(rec).map(([a, n]) => n + '× ' + GOODS[a].n).join(' + ')).join('<br>') + '</small>' : '') + '</div>'; }
  h += '</div><div><div class="gp-sub">Coleta (segure F com a ferramenta do Empório)</div>';
  const seen = {}; for (const o in GATHER) { const g = GATHER[o], key = g.verb; if (seen[key]) continue; seen[key] = 1; const lv = profLv(P0[g.prof]); h += '<div class="gm-rec' + (lv < g.min ? ' lock' : '') + '"><b>' + g.verb[0].toUpperCase() + g.verb.slice(1) + '</b><small>' + LOOT[g.tool].name + ' · ' + PROFS[g.prof] + ' nível ' + g.min + (lv < g.min ? ' (você: ' + lv + ')' : '') + '</small><em>Dá ' + LOOT[g.item].name + '; às vezes ' + LOOT[g.rare].name + ' (' + Math.round(g.rp * 100) + '%).</em></div>'; }
  h += '<div class="gp-sub">Seus ofícios</div><div class="jb-profs">' + Object.keys(PROFS).map(k => { const xp = P0[k] || 0, lv = profLv(xp), a = 25 * (lv - 1) ** 2, b = 25 * lv ** 2; return '<div><span>' + PROFS[k] + ' <b>' + lv + '</b></span><i><em style="width:' + (lv >= 10 ? 100 : Math.round((xp - a) / (b - a) * 100)) + '%"></em></i></div>'; }).join('') + '</div>';
  h += '<div class="gp-note">Cada nível de coleta deixa o trabalho 6% mais rápido. Lenhador 3 corta carvalho, Minerador 3 quebra rochas grandes, Herbalista 2 colhe samambaias. Artesão e Comerciante sobem nos turnos; Mensageiro nas entregas; Biscateiro nos bicos do quadro de avisos.</div></div></div>';
  return h;
}
// ---------- Avisos (o que antes ia para o chat) ----------
function gmNotes() {
  const P = gmPane('notes'); if (!P) return;
  const F = { all: 'Tudo', sys: 'Avisos do reino', say: 'Falas', tip: 'Mensagens para você' };
  const L = (G.noteLog || []).filter(n => GM.notes === 'all' || n.kind === GM.notes).slice(-200).reverse();
  P.innerHTML = '<div class="gm-sub">' + Object.entries(F).map(([k, n]) => '<button data-gn="' + k + '"' + (GM.notes === k ? ' class="on"' : '') + '>' + n + '</button>').join('') + '</div>' +
    '<div class="gm-notes">' + (L.length ? L.map(n => { const d = new Date(n.t); return '<div class="gm-note ' + n.kind + '"><time>' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + '</time>' + (n.name ? '<b>' + gmEsc(n.name) + ':</b> ' : '') + gmEsc(n.text) + '</div>'; }).join('') : '<div class="gp-note">Nada por aqui ainda.</div>') + '</div>';
  P.querySelectorAll('[data-gn]').forEach(b => b.onclick = () => { GM.notes = b.dataset.gn; gmNotes(); });
}
function pauseNotesRefresh() { if (GM.on && GM.tab === 'notes') gmNotes(); }

// ============================================================
//  PAINEL DO TECELÃO — pessoas, negócios, banco e o mundo, com ações de criador
// ============================================================
function gmWvEvent(m) { if (m.t !== 'wv') return false; GM.wv = m; GM.wvT = performance.now(); if (GM.on && GM.tab === 'weaver') gmWeaver(); return true; }
function wvAct(op, id, kind, v) { if (op === 'coins') GM.lastCoins = v; Net.send({ t: 'wv', a: 'act', op, id, kind, v }); }
function gmWeaver() {
  const P = gmPane('weaver'); if (!P) return; const D = GM.wv;
  const tabs = { people: 'Pessoas', biz: 'Negócios e banco', world: 'Mundo' };
  let h = '<div class="gm-sub">' + Object.entries(tabs).map(([k, n]) => '<button data-wt="' + k + '"' + (GM.wvTab === k ? ' class="on"' : '') + '>' + n + '</button>').join('') + (GM.follow ? '<button data-wfoll="" class="warn">Parar de seguir</button>' : '') + '</div>';
  if (!D) h += '<div class="gp-note">Lendo o reino...</div>';
  else if (GM.wvTab === 'people') h += wvPeopleHtml(D);
  else if (GM.wvTab === 'biz') h += wvBizHtml(D);
  else h += wvWorldHtml(D);
  P.innerHTML = h;
  P.querySelectorAll('[data-wt]').forEach(b => b.onclick = () => { GM.wvTab = b.dataset.wt; gmWeaver(); });
  P.querySelectorAll('[data-wsel]').forEach(b => b.onclick = () => { GM.wvSel = GM.wvSel === b.dataset.wsel ? null : b.dataset.wsel; gmWeaver(); });
  P.querySelectorAll('[data-wa]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const [op, kind, id, v] = b.dataset.wa.split('|'); if (op === 'follow') { GM.follow = { kind, id }; showToast('Seguindo. Pare no painel do Tecelão.'); gmWeaver(); return; } if (op === 'coins' && v === 'ask') { gameAsk('Quanto ouro na chuva?', { input: '1000', type: 'number', yes: 'Chover' }).then(q => { if (q != null && +q > 0) wvAct('coins', id, kind, Math.round(+q)); }); return; } if (op === 'gold') { gameAsk('Quanto ouro dar? (negativo tira)', { input: '100', type: 'number', yes: 'Dar' }).then(q => { if (q != null && q !== '' && isFinite(+q)) wvAct('gold', id, kind, +q); }); return; } wvAct(op, id, kind, v === undefined ? undefined : (v === 'null' ? null : +v)); });
  P.querySelectorAll('[data-wfoll]').forEach(b => b.onclick = () => { GM.follow = null; gmWeaver(); });
  const f = P.querySelector('#wv-filter'); if (f) { f.value = GM.wvFilter || ''; f.oninput = () => { GM.wvFilter = f.value; const pos = f.selectionStart; gmWeaver(); const g = gmPane('weaver').querySelector('#wv-filter'); g.focus(); g.setSelectionRange(pos, pos); }; }
}
const wvBar = (v, max, col) => '<i class="wv-bar"><em style="width:' + Math.max(0, Math.min(100, Math.round(v / (max || 1) * 100))) + '%;background:' + col + '"></em></i>';
const WV_KIND = { priest: 'sacerdotisa', merchant: 'mercador', innkeeper: 'taverneiro', tavmaid: 'ajudante', smith: 'ferreiro', fruit: 'fruteira', executioner: 'carrasco', tailor: 'alfaiate', broker: 'corretor', jailer: 'carcereiro', guard: 'sentinela', captain: 'capitã', noble: 'nobre', noble2: 'nobre', gardener: 'jardineiro', banker: 'banqueiro', banker2: 'caixa', banker3: 'contador', supplier: 'fornecedor', courier: 'mensageiro', resident: 'morador', visitor: 'visitante', thug: 'marginal', child: 'criança' };
const wvKind = n => WV_KIND[n.kind] || WV_KIND[n.role] || (/^st_/.test(n.kind) ? 'funcionário' : /^v_/.test(n.kind) ? 'visitante' : /^r_|^res/.test(n.kind) ? 'morador' : '');
const WV_ACT = { sleep: 'dormindo', home: 'em casa', work: 'trabalhando', eat: 'comendo', social: 'conversando' };
function wvPeopleHtml(D) {
  const q = (GM.wvFilter || '').toLowerCase(), ok = r => !q || (r.name + ' ' + (r.kind || '') + ' ' + (r.cls || '')).toLowerCase().includes(q);
  let h = '<input id="wv-filter" class="wv-filter" placeholder="Filtrar por nome ou tipo...">';
  h += '<div class="gp-sub">Jogadores (' + D.players.length + ')</div>';
  for (const r of D.players.filter(ok)) {
    const sel = GM.wvSel === 'p:' + r.id, st = [r.dev ? '✦ Tecelão' : '', r.downed ? 'caído' : '', r.jailed ? 'preso' : '', r.wanted ? 'procurado' : '', r.menu ? 'no menu' : ''].filter(Boolean).join(' · ');
    h += '<div class="wv-row' + (sel ? ' sel' : '') + '" data-wsel="p:' + r.id + '"><div class="wv-main"><b>' + gmEsc(r.name) + '</b><small>' + r.cls + ' nv ' + r.lvl + (st ? ' · ' + st : '') + '</small></div><div class="wv-stats">' + wvBar(r.hp, r.maxHp, '#c8402a') + '<span><span class="coin"></span> ' + r.gold + (r.bank ? ' (+' + r.bank + ' no banco)' : '') + '</span><span>Rep ' + r.rep + '</span></div></div>';
    if (sel) h += '<div class="wv-det"><div>Vida ' + r.hp + '/' + r.maxHp + ' · Fome ' + Math.round(100 - r.food) + '% · Sede ' + Math.round(100 - r.water) + '% · Posição ' + r.x + ', ' + r.y + '</div><div>Crimes: ' + (r.crimes.length ? r.crimes.join(', ') : 'nenhum') + (r.debt ? ' · Dívida no banco: ' + r.debt : '') + '</div><div>Ofícios: ' + (Object.entries(r.prof || {}).map(([k, x]) => PROFS[k] + ' ' + profLv(x)).join(', ') || 'nenhum') + '</div><div>Imóveis: ' + (r.props.join(', ') || 'nenhum') + '</div>' + wvBtns('p', r.id, true) + '</div>';
  }
  const groups = [['Moradores e trabalhadores', D.npcs.filter(n => !n.transient && n.kind !== 'guard' && n.kind !== 'captain')], ['Visitantes e viajantes', D.npcs.filter(n => n.transient)], ['Guarda', D.npcs.filter(n => n.kind === 'guard' || n.kind === 'captain')]];
  for (const [title, L] of groups) {
    const F = L.filter(ok); if (!F.length) continue; h += '<div class="gp-sub">' + title + ' (' + L.length + ')</div>';
    for (const n of F) {
      const sel = GM.wvSel === 'n:' + n.id, st = n.dead ? 'morto' : n.downed ? 'caído' : n.sleeping ? 'dormindo' : (WV_ACT[n.act] || n.doing || '');
      h += '<div class="wv-row' + (sel ? ' sel' : '') + (n.dead ? ' dead' : '') + '" data-wsel="n:' + n.id + '"><div class="wv-main"><b>' + gmEsc(n.name) + '</b><small>' + [wvKind(n), st].filter(Boolean).join(' · ') + '</small></div><div class="wv-stats">' + wvBar(n.hp, n.maxHp, '#c8402a') + (n.need ? '<span title="fome · descanso · social">🍞' + n.need.food + ' 💤' + n.need.rest + ' 💬' + n.need.social + '</span>' : '') + '</div></div>';
      if (sel) h += '<div class="wv-det"><div>Vida ' + n.hp + '/' + n.maxHp + ' · Posição ' + n.x + ', ' + n.y + (n.home ? ' · Mora em ' + gmEsc(n.home) : '') + (n.work ? ' · Trabalha em ' + gmEsc(n.work) : '') + '</div>' + (n.ops.length ? '<div>Opiniões: ' + n.ops.map(o => '<b>' + gmEsc(o[0]) + '</b> ' + (o[1] > 0 ? '+' : '') + o[1] + (o[2] ? ' (' + gmEsc(o[2]) + ')' : '')).join(' · ') + '</div>' : '<div>Ainda não tem opinião sobre ninguém.</div>') + wvBtns('n', n.id, false) + '</div>';
    }
  }
  return h;
}
function wvBtns(kind, id, isP) {
  const b = (op, label, v) => '<button class="est-btn" data-wa="' + op + '|' + kind + '|' + id + (v !== undefined ? '|' + v : '') + '">' + label + '</button>';
  return '<div class="wv-acts">' + b('tp', 'Ir até') + b('follow', 'Seguir') + b('heal', 'Curar') + (isP ? b('jail', 'Prender', 120000) + b('free', 'Soltar') + b('gold', 'Dar ouro') : '') + '</div>';
}
function wvBizHtml(D) {
  let h = '<div class="gp-sub">Imóveis (' + D.props.length + ')</div><table class="wv-tab"><tr><th>Imóvel</th><th>Tipo</th><th>Dono / inquilino</th><th>Cofre</th><th>Estoque</th><th>Hoje</th></tr>';
  const K = { house: 'Casa', shop: 'Loja', workshop: 'Oficina', bank: 'Banco' };
  for (const r of D.props) h += '<tr' + (r.owner ? ' class="own"' : '') + '><td>' + gmEsc(r.name) + '</td><td>' + (K[r.kind] || r.kind) + '</td><td>' + (r.owner ? gmEsc(r.owner) + ' <small>(' + (r.mode === 'own' ? 'dono' : 'aluga') + ')</small>' : r.npc ? '<small>' + gmEsc(r.npc) + '</small>' : r.tenants ? '<small>' + gmEsc(r.tenants) + '</small>' : '<small>livre</small>') + '</td><td>' + (r.cofre != null ? r.cofre : '') + '</td><td>' + (r.stock != null ? r.stock : '') + '</td><td>' + (r.rev != null ? '+' + r.rev : '') + '</td></tr>';
  h += '</table><div class="gp-sub">Banco de Nae · dono: ' + gmEsc(D.bankOwner) + '</div><table class="wv-tab"><tr><th>Conta</th><th>Saldo</th><th>Dívida</th></tr>' + (D.bank.length ? D.bank.map(a => '<tr><td>' + gmEsc(a.who) + '</td><td>' + a.g + '</td><td>' + (a.loan || '') + '</td></tr>').join('') : '<tr><td colspan="3"><small>Nenhuma conta aberta.</small></td></tr>') + '</table>';
  return h;
}
function wvWorldHtml(D) {
  const W = D.world, hh = Math.floor(W.hour), mm = Math.round((W.hour - hh) * 60);
  let h = '<div class="hub-top"><div><small>Dia do reino</small><b>' + W.day + '</b></div><div><small>Hora</small><b>' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + '</b></div><div><small>Estação</small><b>' + gmEsc(W.season) + '</b></div><div><small>Clima</small><b>' + (W.rain > 0.3 ? 'chuva' : 'limpo') + '</b></div></div>';
  h += '<div class="gp-sub">Hora e clima do reino (para todos)</div><div class="wv-acts">' + [['Manhã', 0.88], ['Meio-dia', 0.0], ['Tarde', 0.17], ['Noite', 0.5], ['Natural', 'null']].map(([n, v]) => '<button class="est-btn' + ((W.ph === v || (W.ph == null && v === 'null')) ? ' on' : '') + '" data-wa="time|w|0|' + v + '">' + n + '</button>').join('') + '</div><div class="wv-acts">' + [['Sem chuva', 0], ['Chuva', 1], ['Natural', 'null']].map(([n, v]) => '<button class="est-btn' + ((W.rainSet === v || (W.rainSet == null && v === 'null')) ? ' on' : '') + '" data-wa="rain|w|0|' + v + '">' + n + '</button>').join('') + '</div><div class="gp-note">A hora escolhida fica parada até voltar para Natural. Os aluguéis e as semanas continuam contando normalmente.</div>';
  h += '<div class="gp-sub">Chuva de ouro em volta de você</div><div class="wv-acts">' + [10, 50, 100, 500, 1000, 5000, 20000].map(v => '<button class="est-btn" data-wa="coins|w|0|' + v + '">' + v + ' ouro</button>').join('') + '<button class="est-btn" data-wa="coins|w|0|ask">Outro valor…</button></div><div class="gp-note">As moedas brotam em volta do Tecelão e qualquer jogador pega passando por cima. Somem em 10 minutos. Fora do menu, a tecla U repete a última chuva.</div>';
  h += '<div class="gp-sub">População</div><div class="wv-kv">' + Object.entries(W.pop).map(([k, v]) => '<span>' + k + ' <b>' + v + '</b></span>').join('') + '</div>';
  h += '<div class="gp-sub">Monstros</div><div class="wv-kv">' + (Object.entries(W.mons).map(([k, v]) => '<span>' + (MON[k] ? MON[k].name : k) + ' <b>' + v + '</b></span>').join('') || '<span>nenhum</span>') + '</div>';
  h += '<div class="gp-sub">Bastiões</div><div class="wv-kv">' + W.bast.map(b => '<span>' + gmEsc(b.name) + ' <b>' + b.n + '</b></span>').join('') + '</div>';
  h += '<div class="gp-sub">Acontecimentos recentes</div><div class="gm-notes">' + (W.events.length ? W.events.slice().reverse().map(e => { const d = new Date(e[0]); return '<div class="gm-note sys"><time>' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + '</time>' + gmEsc(e[1]) + '</div>'; }).join('') : '<div class="gp-note">Nada ainda.</div>') + '</div>';
  return h;
}
// seguir alguém: o Tecelão vai junto (some se estiver escondido)
setInterval(() => {
  if (!G.started || !gmIsDev()) return;
  if (GM.on && GM.tab === 'weaver' && performance.now() - GM.wvT > 2500) { GM.wvT = performance.now(); Net.send({ t: 'wv', a: 'snap' }); }
  const F = GM.follow; if (!F || !G.me) return;
  let e = F.kind === 'p' ? G.players[F.id] : G.npcs[F.id], x, y;
  if (e && e !== G.me) { x = e.rx ?? e.x; y = e.ry ?? e.y; } else if (GM.wv) { const r = (F.kind === 'p' ? GM.wv.players : GM.wv.npcs).find(q => q.id === F.id); if (r) { x = r.x; y = r.y; } if (!GM.on && performance.now() - GM.wvT > 2000) { GM.wvT = performance.now(); Net.send({ t: 'wv', a: 'snap' }); } }
  if (x == null) return; if (dist(G.me.x, G.me.y, x, y) > 2.2 && typeof devTp === 'function') devTp(x + 1.2, y + 0.6);
}, 400);

// exportar / importar o herói (arquivo .json): cópia de segurança ou levar para outro navegador
function heroIOWire(root) {
  const ex = root.querySelector('#hero-exp'), im = root.querySelector('#hero-imp');
  if (ex) ex.onclick = () => { try { if (typeof saveChar === 'function') saveChar(); const all = loadChars(), k = charKey(G.me.name, G.me.cls), data = { nae: 1, at: Date.now(), heroes: { [k]: all[k] } }; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })); a.download = 'nae-' + G.me.name.replace(/[^\wÀ-ÿ-]+/g, '_') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); showToast('Herói exportado.'); } catch (e) { showToast('Não foi possível exportar.'); } };
  if (im) im.onchange = () => { const f = im.files && im.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !d.heroes) throw 0; const all = loadChars(); let n = 0; for (const k in d.heroes) if (d.heroes[k] && d.heroes[k].name) { all[k] = d.heroes[k]; n++; } localStorage.setItem(SAVE_KEY, JSON.stringify(all)); showToast(n + ' herói(s) importado(s). Saia e entre de novo com o mesmo nome e vocação para usar.'); } catch (e) { showToast('Arquivo inválido.'); } }; r.readAsText(f); };
}
