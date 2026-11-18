// ============================================================
//  OBSERVATÓRIO DO TECELÃO (F9) — visão da cidade em tempo real, só no modo Tecelão.
//  Etapa 1: mapa ao vivo com filtros e camadas, fichas de pessoas e locais, alertas, pessoas, negócios,
//  linha do tempo e saúde técnica. Gráficos, relógio do dia e controles chegam nas próximas etapas.
// ============================================================
const OBS = { on: false, tab: 'map', data: null, sel: null, view: 'city', trails: {}, reqT: 0, built: false,
  people: { res: true, art: true, cou: true, grd: true, vis: true, ply: true }, layers: { names: true, houses: true, status: true, alerts: true, trails: true, cargo: true, gold: false, prod: false }, heat: 'none', evf: 'all', pf: 'all',
  hist: null, histT: 0, per: 'month', clk: 'game', cat: 'all', met: 'profit', dcRole: 'res', dcH: 19 };
const OBS_ROLES = { res: ['Moradores', '#3a6ad8'], art: ['Artesãos e balconistas', '#d89a1a'], cou: ['Mensageiros', '#c83a8a'], grd: ['Guardas', '#5a646e'], vis: ['Visitantes', '#2a9a7a'], ply: ['Jogadores', '#c8281e'] };
const OBS_KC = { house: '#9a7a5a', manor: '#7a4a8a', shop: '#2a6aa8', work: '#a8641e', pub: '#4a4a52' };
const OBS_STC = { ok: '#3e8a4e', warn: '#c08a20', bad: '#b84a34', idle: '#6e7680' };
const OBS_STT = { ok: 'lucro bom', warn: 'falta insumo', bad: 'prejuízo', idle: 'fechado' };
const OBS_VIEWS = { center: [128, 128, 66], city: [102, 130, 126], realm: [128, 128, 256] };
const obsEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const obsName = bi => { if (bi == null || bi < 0 || !BUILDINGS[bi]) return '—'; const P = PROPS.find(q => q.bi === bi); return (P && P.name) || BUILDINGS[bi].name || 'Casa'; };
const obsKind = bi => { const b = BUILDINGS[bi], P = PROPS.find(q => q.bi === bi); if (!b) return 'pub'; if (b.kind === 'manor') return 'manor'; if (b.kind === 'house' || b.kind === 'fruithouse') return P && P.kind !== 'house' ? (P.kind === 'workshop' ? 'work' : 'shop') : 'house'; if (b.kind === 'tavern' || b.kind === 'hotel' || b.kind === 'shop' || b.kind === 'boutique' || (P && P.kind === 'shop')) return 'shop'; if (b.kind === 'workshop' || b.kind === 'smith' || b.kind === 'stable' || (P && P.kind === 'workshop')) return 'work'; return 'pub'; };
function obsRole(n) { if (n[11] & 16) return 'vis'; if (n[3] === 'courier') return 'cou'; if (/^(guard|captain)/.test(n[2])) return 'grd'; if (/artisan|clerk|worker/.test(n[3]) || /^st_|smith|innkeeper|merchant|banker|tavmaid|hotelkeeper|fruit|tailor|broker/.test(n[2])) return 'art'; return 'res'; }
const OBS_ACT = { visit: 'visitando a cidade', bard: 'tocando na taverna', fight: 'brigando', dead: 'morto', work: 'trabalhando', home: 'em casa', sleep: 'dormindo', social: 'na taverna', eat: 'comendo', shop: 'comprando', walk: 'andando', bank: 'no banco', patrol: 'patrulhando', 'indo buscar': 'indo buscar mercadoria', levando: 'levando entrega', voltando: 'voltando da entrega' };
function obsEvCat(t) { t = String(t); if (/compr|vend|pagou|loja|balc/i.test(t)) return 'com'; if (/entreg|carro[çc]a|mensageir|trouxe/i.test(t)) return 'del'; if (/furt|roub|pres[oa]|procurad|crime|carrasco|guilhot|cadeia|fian/i.test(t)) return 'crime'; if (/morreu|morto|faleceu|caiu|herança/i.test(t)) return 'death'; if (/cheg|visit|viajante|mercador/i.test(t)) return 'vis'; if (/drag|monstr|goblin|orc|basti|troll|esqueleto|tonel/i.test(t)) return 'mon'; return 'other'; }
const OBS_EVC = { all: 'Tudo', com: 'Comércio', del: 'Entregas', crime: 'Crimes', death: 'Mortes', vis: 'Visitantes', mon: 'Monstros e eventos', other: 'Outros' };

function obsCss() {
  if (document.getElementById('obs-css')) return;
  const st = document.createElement('style'); st.id = 'obs-css';
  st.textContent = `
#obs { position: fixed; inset: 0; z-index: 70; background: #0f1114; color: #e6e2d8; font: 13px/1.45 'Alegreya Sans', system-ui, sans-serif; overflow: auto; --line: #2b3038; --panel: #171a1f; --panel2: #1e2228; --muted: #8d939c; --accent: #c9a24a; --ok: #5cbf74; --warn: #e0b04a; --bad: #e0604a; --idle: #8d939c; }
#obs.hidden { display: none; }
#obs .ob-wrap { padding: 12px 16px 24px; display: grid; gap: 10px; max-width: 1700px; margin: 0 auto; }
#obs header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
#obs .ob-logo { font: 26px 'IM Fell English SC', 'Cinzel', serif; color: #a99ae8; letter-spacing: .06em; line-height: 1; }
#obs .ob-logo small { font: 600 10px 'Alegreya Sans', sans-serif; letter-spacing: .2em; color: var(--muted); display: block; text-transform: uppercase; margin-top: 3px; }
#obs .ob-clock { font: 600 12px ui-monospace, monospace; color: var(--muted); display: flex; gap: 14px; flex-wrap: wrap; } #obs .ob-clock b { color: #e6e2d8; }
#obs nav { display: flex; gap: 2px; flex-wrap: wrap; margin-left: auto; align-items: center; }
#obs nav button, #obs .seg button { all: unset; cursor: pointer; padding: 6px 11px; border-radius: 5px; color: var(--muted); font-weight: 700; font-size: 13px; }
#obs nav button:hover, #obs .seg button:hover { color: #e6e2d8; background: var(--panel2); }
#obs nav button.on { color: #14110a; background: var(--accent); }
#obs nav .ob-x { margin-left: 8px; border: 1px solid var(--line); }
#obs .badge { display: inline-block; min-width: 17px; padding: 0 5px; margin-left: 5px; border-radius: 9px; background: var(--bad); color: #fff; font: 700 10.5px/17px sans-serif; text-align: center; }
#obs .ob-view { display: none; } #obs .ob-view.on { display: grid; }
#obs .ob-mapv { grid-template-columns: 230px minmax(0, 1fr) 300px; gap: 10px; }
#obs .box { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; min-width: 0; }
#obs .box h3 { margin: 0 0 8px; font: 700 11px 'Alegreya Sans', sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
#obs .flt { display: grid; gap: 1px; margin-bottom: 12px; }
#obs .flt label { display: flex; align-items: center; gap: 8px; padding: 3px 4px; border-radius: 4px; cursor: pointer; }
#obs .flt label:hover { background: var(--panel2); } #obs .flt input { accent-color: var(--accent); }
#obs .flt .ic { width: 14px; text-align: center; font: 700 12px monospace; color: var(--accent); }
#obs .flt .n { margin-left: auto; font: 11px monospace; color: var(--muted); }
#obs .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; display: inline-block; }
#obs canvas.ob-map { width: 100%; aspect-ratio: 1 / 1; max-height: calc(100vh - 210px); display: block; background: #2b4a6a; border-radius: 6px; cursor: crosshair; }
#obs .maphead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; flex-wrap: wrap; }
#obs .seg { display: inline-flex; flex-wrap: wrap; background: var(--panel2); border-radius: 6px; padding: 2px; gap: 2px; } #obs .seg button.on { background: var(--line); color: #e6e2d8; }
#obs .legend { display: flex; gap: 4px 14px; flex-wrap: wrap; font-size: 12px; color: var(--muted); margin-top: 6px; } #obs .legend span { display: flex; align-items: center; gap: 5px; }
#obs .legend i { width: 12px; height: 12px; border-radius: 2px; border: 2px solid; display: inline-block; }
#obs .who { font: 700 17px 'Alegreya Sans', sans-serif; } #obs .role { color: var(--muted); margin-bottom: 10px; }
#obs .kv { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; margin: 0; } #obs .kv dt { color: var(--muted); } #obs .kv dd { margin: 0; text-align: right; }
#obs .meter { height: 6px; background: var(--panel2); border-radius: 3px; overflow: hidden; margin: 2px 0 6px; } #obs .meter i { display: block; height: 100%; }
#obs .pill { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11.5px; font-weight: 700; }
#obs .p-ok { background: rgba(92,191,116,.15); color: var(--ok); } #obs .p-warn { background: rgba(224,176,74,.15); color: var(--warn); } #obs .p-bad { background: rgba(224,96,74,.15); color: var(--bad); } #obs .p-idle, #obs .p-none { background: rgba(141,147,156,.15); color: var(--idle); }
#obs .tablebox { overflow-x: auto; } #obs table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
#obs th, #obs td { text-align: left; padding: 6px 9px; border-bottom: 1px solid var(--line); white-space: nowrap; }
#obs th { color: var(--muted); font: 700 11px 'Alegreya Sans', sans-serif; letter-spacing: .06em; text-transform: uppercase; } #obs td.num, #obs th.num { text-align: right; }
#obs tr.click { cursor: pointer; } #obs tr:hover td { background: var(--panel2); }
#obs .tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
#obs .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; } #obs .kpi { background: var(--panel2); border-radius: 6px; padding: 10px 12px; }
#obs .kpi .v { font: 700 20px ui-monospace, monospace; } #obs .kpi .l { color: var(--muted); font-size: 12px; }
#obs .ev { display: grid; grid-template-columns: 70px 140px 1fr; gap: 8px; padding: 6px 4px; border-bottom: 1px solid var(--line); } #obs .ev .t { font: 11px monospace; color: var(--muted); }
#obs .alert { display: grid; grid-template-columns: 6px 1fr auto; gap: 12px; padding: 9px 6px; border-bottom: 1px solid var(--line); align-items: center; } #obs .alert .bar { align-self: stretch; border-radius: 3px; } #obs .alert b { display: block; } #obs .alert small { color: var(--muted); }
#obs .btn { all: unset; cursor: pointer; padding: 6px 11px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel2); font-weight: 700; } #obs .btn:hover { border-color: var(--accent); }
#obs .soon { color: var(--muted); padding: 30px; text-align: center; font-size: 15px; }
#obs .ob-cgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(520px, 1fr)); gap: 10px; } #obs canvas.chart { width: 100%; height: 280px; display: block; }
#obs .ob-tip { position: fixed; pointer-events: none; background: #0b0d10ee; border: 1px solid var(--line); padding: 5px 9px; border-radius: 5px; font-size: 12.5px; display: none; z-index: 71; }
@media (max-width: 1100px) { #obs .ob-mapv { grid-template-columns: 1fr; } }`;
  document.head.appendChild(st);
}
function obsBuild() {
  if (OBS.built) return; OBS.built = true; obsCss();
  const d = document.createElement('div'); d.id = 'obs'; d.className = 'hidden';
  const tabs = [['map', 'Mapa'], ['alerts', 'Alertas'], ['dayclock', 'Relógio do dia'], ['people', 'Pessoas'], ['biz', 'Negócios'], ['items', 'Itens'], ['charts', 'Gráficos'], ['events', 'Linha do tempo'], ['tech', 'Saúde técnica'], ['ctrl', 'Controles']];
  d.innerHTML = `<div class="ob-wrap"><header><div class="ob-logo">Observatório<small>Tecelão · visão da cidade · F9 fecha</small></div><div class="ob-clock" id="ob-clock"></div>
    <nav id="ob-tabs">${tabs.map(([k, n]) => `<button data-ot="${k}">${n}${k === 'alerts' ? '<span class="badge" id="ob-abadge">0</span>' : ''}</button>`).join('')}<button class="ob-x" data-ot="close">Fechar</button></nav></header>
    <section class="ob-view ob-mapv" data-ov="map"><aside class="box"><h3 id="ob-ptot">Pessoas</h3><div class="flt" id="ob-fp"></div><h3>Camadas</h3><div class="flt" id="ob-fl"></div></aside>
      <div class="box"><div class="maphead"><div class="seg" id="ob-zoom"><button data-z="center">Cidadela</button><button data-z="city">Cidade inteira</button><button data-z="realm">Reino</button></div><span style="color:var(--muted)">Clique numa pessoa ou num prédio</span></div><canvas class="ob-map" id="ob-map" width="1000" height="1000"></canvas>
      <div class="legend"><b style="color:#e6e2d8">Locais:</b>${[['house', 'Casa'], ['manor', 'Casarão nobre'], ['shop', 'Loja, taverna e pousada'], ['work', 'Oficina, fazenda e mina'], ['pub', 'Serviço público']].map(([k, n]) => `<span><i style="border-color:${OBS_KC[k]};background:${OBS_KC[k]}"></i>${n}</span>`).join('')}</div>
      <div class="legend"><b style="color:#e6e2d8">Status dos negócios:</b><span><i style="border-color:var(--ok);background:rgba(92,191,116,.3)"></i>Lucro bom: vende mais do que gasta</span><span><i style="border-color:var(--warn);background:rgba(224,176,74,.3)"></i>Falta insumo: esperando mercadoria há 2 h ou mais</span><span><i style="border-color:var(--bad);background:rgba(224,96,74,.3)"></i>Prejuízo: gastou mais do que vendeu (hoje; nos de NPC, ontem)</span><span><i style="border-color:var(--idle);background:rgba(141,147,156,.3)"></i>Fechado</span><span><b style="color:var(--bad)">!</b> tem alerta (aba Alertas)</span></div></div>
      <aside class="box" id="ob-card"></aside></section>
    <section class="ob-view" data-ov="alerts"><div class="box" id="ob-alerts"></div></section>
    <section class="ob-view" data-ov="dayclock"><div class="box" id="ob-dc"></div></section>
    <section class="ob-view" data-ov="people"><div class="box tablebox" id="ob-people"></div></section>
    <section class="ob-view" data-ov="biz"><div class="box tablebox" id="ob-biz"></div></section>
    <section class="ob-view" data-ov="charts" style="gap:10px"><div class="box" id="ob-ctools"></div><div class="ob-cgrid" id="ob-charts"></div></section>
    <section class="ob-view" data-ov="items"><div class="box tablebox" id="ob-items"></div></section>
    <section class="ob-view" data-ov="events"><div class="box" id="ob-events"></div></section>
    <section class="ob-view" data-ov="tech"><div class="box" id="ob-tech"></div></section>
    <section class="ob-view" data-ov="ctrl"><div class="box" id="ob-ctrl"></div></section></div><div class="ob-tip" id="ob-tip"></div>`;
  document.body.appendChild(d);
  d.querySelector('#ob-tabs').onclick = e => { const b = e.target.closest('[data-ot]'); if (!b) return; if (b.dataset.ot === 'close') obsToggle(false); else obsTab(b.dataset.ot); };
  d.querySelector('#ob-zoom').onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; OBS.view = b.dataset.z; obsSegs(); };
  const fp = d.querySelector('#ob-fp'); fp.innerHTML = Object.entries(OBS_ROLES).map(([k, [n, c]]) => `<label><input type="checkbox" data-p="${k}" checked><span class="dot" style="background:${c}"></span>${n}<span class="n" data-pn="${k}">0</span></label>`).join('');
  fp.onchange = e => { OBS.people[e.target.dataset.p] = e.target.checked; };
  const LAY = { names: ['', 'Nomes dos locais'], houses: ['', 'Nomes das casas'], status: ['', 'Prédios por status'], alerts: ['!', 'Alertas no mapa'], trails: ['', 'Rastro e destino'], cargo: ['', 'Carga dos mensageiros'], gold: ['$', 'Ouro hoje por negócio'], prod: ['⚒', 'Produção na última hora'] };
  const fl = d.querySelector('#ob-fl'); fl.innerHTML = Object.entries(LAY).map(([k, [ic, n]]) => `<label><input type="checkbox" data-l="${k}" ${OBS.layers[k] ? 'checked' : ''}><span class="ic">${ic}</span>${n}</label>`).join('') + '<h3 style="margin-top:10px">Mapa de calor</h3>' + [['none', 'Desligado'], ['time', 'Onde passam mais tempo'], ['sale', 'Vendas'], ['crime', 'Crimes'], ['mon', 'Monstros mortos']].map(([k, n]) => `<label><input type="radio" name="ob-heat" data-h="${k}" ${k === 'none' ? 'checked' : ''}>${n}</label>`).join('');
  fl.onchange = e => { if (e.target.dataset.h) { OBS.heat = e.target.dataset.h; obsReqH(true); } else OBS.layers[e.target.dataset.l] = e.target.checked; };
  const cv = d.querySelector('#ob-map'), tip = d.querySelector('#ob-tip');
  cv.onclick = e => { OBS.sel = obsPick(e); obsCard(); };
  cv.onmousemove = e => { const h = obsPick(e); if (!h) { tip.style.display = 'none'; return; } tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 10 + 'px'; tip.textContent = h.k === 'b' ? obsName(h.bi) : h.name; };
  cv.onmouseleave = () => tip.style.display = 'none';
  d.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) { OBS.sel = { k: 'b', bi: +g.dataset.goto }; obsTab('map'); obsCard(); }
    const tp = e.target.closest('[data-tp]'); if (tp) { const [kind, id] = tp.dataset.tp.split('|'); Net.send({ t: 'wv', a: 'act', op: 'tp', kind, id }); showToast('Teleportando…'); }
    const fo = e.target.closest('[data-fo]'); if (fo) { const [kind, id] = fo.dataset.fo.split('|'); if (typeof GM !== 'undefined') GM.follow = { kind, id }; obsToggle(false); showToast('Seguindo. Pare no painel do Tecelão (TAB).'); }
    const ef = e.target.closest('[data-ef]'); if (ef) { OBS.evf = ef.dataset.ef; obsEvents(); }
    const pf = e.target.closest('[data-pf]'); if (pf) { OBS.pf = pf.dataset.pf; obsPeople(); }
    const cs = e.target.closest('[data-cs]'); if (cs) { const [k, v] = cs.dataset.cs.split('|'); OBS[k] = v; if (k === 'dcRole') obsDayClock(); else obsCharts(); }
    if (e.target.closest('[data-csv]')) obsCsv();
    const ic = e.target.closest('[data-icat]'); if (ic) { OBS.icat = ic.dataset.icat; obsItems(); }
    const oc = e.target.closest('[data-oc]'); if (oc) { const [a, v, g2] = oc.dataset.oc.split('|'); Net.send({ t: 'obsc', a, v, k: v, g: g2 }); } });
  d.addEventListener('input', e => { if (e.target.id === 'ob-isearch') { OBS.iq = e.target.value; obsItems(true); return; } if (e.target.id === 'ob-dch') { OBS.dcH = +e.target.value; obsDayClock(); } });
  obsSegs(); obsTab(OBS.tab);
}
function obsSegs() { document.querySelectorAll('#ob-zoom [data-z]').forEach(b => b.classList.toggle('on', b.dataset.z === OBS.view)); }
function obsTab(t) { OBS.tab = t; document.querySelectorAll('#ob-tabs [data-ot]').forEach(b => b.classList.toggle('on', b.dataset.ot === t)); document.querySelectorAll('#obs .ob-view').forEach(v => v.classList.toggle('on', v.dataset.ov === t)); obsRender(); }
function obsToggle(on) {
  if (on == null) on = !OBS.on; if (on && !(G.dev || G.devTools)) { showToast('O Observatório é do modo Tecelão.'); return; }
  obsBuild(); OBS.on = on; document.getElementById('obs').classList.toggle('hidden', !on);
  if (on) { G.paused = true; G.keys.clear(); OBS.reqT = 0; obsReq(); obsReqH(true); Net.send({ t: 'menu', on: 1 }); requestAnimationFrame(obsLoop); }
  else { G.paused = !!((typeof GM !== 'undefined' && GM.on) || (typeof EM !== 'undefined' && EM.on)); Net.send({ t: 'menu', on: 0 }); }
}
function obsKey(k, e) {
  if (k === 'f9') { if (!e.repeat) obsToggle(); return true; }
  if (!OBS.on) return false;
  if (k === 'escape') { obsToggle(false); return true; }
  return true;   /* com o Observatório aberto, o jogo não recebe teclas */
}
function obsReq() { const now = performance.now(); if (now - OBS.reqT < 1000) return; OBS.reqT = now; Net.send({ t: 'obs' }); }
function obsData(m) {
  OBS.data = m; const t = m.at;
  for (const n of m.npcs) { const T = OBS.trails[n[0]] || (OBS.trails[n[0]] = []); const L = T[T.length - 1]; if (!L || Math.hypot(L[0] - n[4], L[1] - n[5]) > 0.2) T.push([n[4], n[5]]); if (T.length > 60) T.shift(); }
  for (const p of m.players) { const T = OBS.trails['p' + p[0]] || (OBS.trails['p' + p[0]] = []); T.push([p[2], p[3]]); if (T.length > 60) T.shift(); }
  if (OBS.on) obsRender();
}
function obsReqH(force) { const now = performance.now(); if (!force && now - OBS.histT < 30000) return; OBS.histT = now; Net.send({ t: 'obsh' }); }
function obsHist(m) { OBS.hist = m; if (OBS.on && (OBS.tab === 'charts' || OBS.tab === 'dayclock')) obsRender(); }
function obsLoop() { if (!OBS.on) return; obsReq(); obsReqH(); if (OBS.tab === 'map') obsDraw(performance.now()); requestAnimationFrame(obsLoop); }
// ---------- alertas (calculados com o retrato atual) ----------
function obsAlerts() {
  const D = OBS.data, A = []; if (!D) return A;
  for (const b of D.biz) { const [pid, name, kind, bi, owner, st, stock, td, wait, staff] = b;
    if (/\(NPC\)$/.test(owner)) { if (b[14]) A.push(['bad', `${name} fechado por dívidas`, `Reabre em ${b[14]} dia(s) com empréstimo do banco. Dívida atual: ${b[13]}.`, bi]); else if (b[12] >= 1) A.push(['bad', `${name} no vermelho há ${b[12]} dia(s)`, `Caixa ${b[10]}. Com 3 dias seguidos no vermelho, fecha.`, bi]); else if (wait) A.push(['warn', `${name} sem ${obsGood(wait[0])} há ${wait[1]} dia(s)`, `Nenhum negócio de NPC tinha o insumo: comprou do fornecedor (30% mais caro) ou ficou sem produzir.`, bi]); if (b[13] > 0 && !b[14]) A.push(['warn', `${name} pagando empréstimo`, `Dívida de ${b[13]} com o banco.`, bi]); continue; }
    if (wait && wait[1] >= 2) A.push(['bad', `${name} esperando ${obsGood(wait[0])} há ${wait[1]} h do jogo`, `O pedido ainda não foi entregue. Confira se a oficina do mesmo dono tem ${obsGood(wait[0])} e se os mensageiros estão livres.`, bi]);
    if (st === 'bad' && td) A.push(['bad', `${name} com prejuízo hoje`, `Gastou ${td[1]} e vendeu ${td[0]}${td[2] ? ' (+' + td[2] + ' em mercadoria enviada)' : ''}.`, bi]);
    if (st === 'idle') A.push(['warn', `${name} fechado`, `O dono (${owner || '—'}) fechou o negócio.`, bi]);
    if (staff === 0 && kind === 'workshop' && owner) A.push(['warn', `${name} sem funcionário`, `Ninguém contratado: não produz nada sozinho.`, bi]); }
  const npcs = D.npcs; const down = npcs.filter(n => n[11] & 2 && !(n[11] & 4)), dead = npcs.filter(n => n[11] & 4);
  if (down.length) A.push(['bad', `${down.length} morador(es) caído(s)`, down.map(n => n[1].split(',')[0]).join(', '), npcs.find(n => n[11] & 2)[7]]);
  if (dead.length) A.push(['warn', `${dead.length} morador(es) morto(s)`, dead.map(n => n[1].split(',')[0]).join(', '), -1]);
  const hungry = npcs.filter(n => n[12] && n[12][0] < 20); if (hungry.length) A.push(['warn', `${hungry.length} morador(es) com fome`, hungry.slice(0, 6).map(n => n[1].split(',')[0]).join(', ') + (hungry.length > 6 ? '…' : ''), -1]);
  const tired = npcs.filter(n => n[12] && n[12][1] < 15); if (tired.length) A.push(['warn', `${tired.length} morador(es) exaustos`, tired.slice(0, 6).map(n => n[1].split(',')[0]).join(', '), -1]);
  const sad = npcs.filter(n => n[13] != null && n[13] < 30 && !(n[11] & 4)); if (sad.length) A.push([sad.length >= 5 ? 'bad' : 'warn', `${sad.length} morador(es) triste(s)`, sad.slice(0, 6).map(n => n[1].split(',')[0] + ' (' + n[13] + '%)').join(', ') + (sad.length > 6 ? '…' : '') + '. Triste trabalha devagar e às vezes falta ao trabalho.', -1]);
  const broke = npcs.filter(n => n[14] != null && n[14] < 5 && !(n[11] & 4)); if (broke.length) A.push(['warn', `${broke.length} morador(es) sem dinheiro`, broke.slice(0, 6).map(n => n[1].split(',')[0]).join(', ') + (broke.length > 6 ? '…' : '') + '. Não almoçam fora nem vão à taverna.', -1]);
  const skip = npcs.filter(n => n[11] & 128); if (skip.length) A.push(['warn', `${skip.length} faltaram ao trabalho hoje`, skip.map(n => n[1].split(',')[0]).join(', '), -1]);
  const cou = npcs.filter(n => n[3] === 'courier'), busy = cou.filter(n => n[10]).length, waits = D.biz.filter(b => b[8]).length; if (cou.length && busy === cou.length && waits >= 3) A.push(['warn', 'Todos os mensageiros ocupados', `${waits} negócios esperando entrega. Talvez falte mensageiro.`, -1]);
  const st = D.tech.stalls.filter(q => D.at - q[0] < 600000); if (st.length) A.push([st.some(q => q[1] > 5000) ? 'bad' : 'warn', `Servidor travou ${st.length} vez(es) nos últimos 10 min`, `A maior travada durou ${(Math.max(...st.map(q => q[1])) / 1000).toFixed(1)} s. Os outros jogadores sentem isso como engasgos.`, -1]);
  for (const p of D.players) { if (p[7] >= 2) A.push(['warn', `${p[1]} reconectou ${p[7]} vez(es)`, `Ping atual: ${p[6] != null ? p[6] + ' ms' : '—'}.`, -1]); if (p[6] > 400) A.push(['warn', `Ping alto de ${p[1]}`, `${p[6]} ms: atrasos e engasgos para esse jogador.`, -1]); }
  return A;
}
const obsGood = g => (typeof GOODS !== 'undefined' && GOODS[g] ? GOODS[g].n : g);
// ---------- mapa ----------
function obsP(wx, wy) { const V = OBS_VIEWS[OBS.view], cv = document.getElementById('ob-map'), S = cv.width / V[2]; return [cv.width / 2 + (wx - V[0]) * S, cv.height / 2 + (wy - V[1]) * S]; }
function obsInv(px, py) { const V = OBS_VIEWS[OBS.view], cv = document.getElementById('ob-map'), S = cv.width / V[2]; return [V[0] + (px - cv.width / 2) / S, V[1] + (py - cv.height / 2) / S]; }
function obsPick(e) {
  const cv = document.getElementById('ob-map'), r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * cv.width, py = (e.clientY - r.top) / r.height * cv.height, D = OBS.data; if (!D) return null;
  let best = null, bd = 12;
  for (const n of D.npcs) { if (!OBS.people[obsRole(n)]) continue; const q = obsP(n[4], n[5]), d = Math.hypot(q[0] - px, q[1] - py); if (d < bd) { bd = d; best = { k: 'n', id: n[0], name: n[1] }; } }
  for (const p of D.players) { if (!OBS.people.ply) continue; const q = obsP(p[2], p[3]), d = Math.hypot(q[0] - px, q[1] - py); if (d < bd) { bd = d; best = { k: 'p', id: p[0], name: p[1] }; } }
  if (best) return best; const [wx, wy] = obsInv(px, py), bi = BUILDINGS.findIndex(b => wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h); return bi >= 0 ? { k: 'b', bi } : null;
}
function obsDraw(now) {
  const cv = document.getElementById('ob-map'); if (!cv) return; const x = cv.getContext('2d'), SZ = cv.width, V = OBS_VIEWS[OBS.view], S = SZ / V[2], D = OBS.data;
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#2b4a6a'; x.fillRect(0, 0, SZ, SZ);
  x.save(); x.translate(SZ / 2, SZ / 2); x.scale(S, S); x.translate(-V[0], -V[1]); x.imageSmoothingEnabled = false; if (typeof MINI !== 'undefined') x.drawImage(MINI, 0, 0);
  const bst = {}; if (D) for (const b of D.biz) if (b[3] != null) bst[b[3]] = b;
  BUILDINGS.forEach((b, bi) => { if (b.kind === 'stairtower') return; const kc = OBS_KC[obsKind(bi)], st = OBS.layers.status && bst[bi] && bst[bi][5]; x.fillStyle = (st ? OBS_STC[st] : kc) + 'cc'; x.fillRect(b.x, b.y, b.w, b.h); x.strokeStyle = kc; x.lineWidth = 0.45; x.strokeRect(b.x + 0.2, b.y + 0.2, b.w - 0.4, b.h - 0.4); });
  if (OBS.sel && OBS.sel.k === 'b') { const b = BUILDINGS[OBS.sel.bi]; if (b) { x.strokeStyle = '#fff'; x.lineWidth = 0.6; x.strokeRect(b.x - 0.4, b.y - 0.4, b.w + 0.8, b.h + 0.8); } }
  x.restore();
  x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(230,205,160,0.5)'; x.fillRect(0, 0, SZ, SZ); x.globalCompositeOperation = 'source-over';
  if (OBS.heat !== 'none' && OBS.hist && OBS.hist.heat && OBS.hist.heat[OBS.heat]) { const A = OBS.hist.heat[OBS.heat], N = 64, mx = Math.max(1, ...A), c = { time: '230,150,20', sale: '40,160,70', crime: '210,40,30', mon: '120,80,210' }[OBS.heat];
    for (let i = 0; i < A.length; i++) { if (!A[i]) continue; const cx = (i % N + 0.5) * 256 / N, cy = (Math.floor(i / N) + 0.5) * 256 / N, [px, py] = obsP(cx, cy), r = 256 / N * S * 1.4, a = Math.min(0.75, 0.15 + 0.6 * Math.log(1 + A[i]) / Math.log(1 + mx)); const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, 'rgba(' + c + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)'); x.fillStyle = gr; x.fillRect(px - r, py - r, 2 * r, 2 * r); } }
  const rects = [], fits = (cx, cy, w, h) => !rects.some(r => cx - w / 2 < r[0] + r[2] / 2 && cx + w / 2 > r[0] - r[2] / 2 && cy - h / 2 < r[1] + r[3] / 2 && cy + h / 2 > r[1] - r[3] / 2);
  const label = (t, cx, cy, size, col, bg, avoid) => { x.font = `700 ${size}px "Alegreya Sans SC", "Alegreya Sans", sans-serif`; const w = x.measureText(t).width + 12, h = size + 8;
    if (avoid) { let ok = false; for (const [dx, dy] of [[0, 0], [0, h + 2], [0, -h - 2], [w * 0.55, 0], [-w * 0.55, 0]]) if (fits(cx + dx, cy + dy, w, h)) { cx += dx; cy += dy; ok = true; break; } if (!ok) return; rects.push([cx, cy, w, h]); }
    x.textAlign = 'center'; x.textBaseline = 'middle'; if (bg) { x.fillStyle = bg; x.beginPath(); if (x.roundRect) x.roundRect(cx - w / 2, cy - h / 2, w, h, 4); else x.rect(cx - w / 2, cy - h / 2, w, h); x.fill(); } else { x.lineWidth = 3; x.strokeStyle = 'rgba(244,232,200,.85)'; x.strokeText(t, cx, cy); } x.fillStyle = col; x.fillText(t, cx, cy); };
  const big = S > 14, alerts = D ? obsAlerts() : [], abi = new Set(alerts.map(a => a[3]).filter(b => b >= 0));
  const order = BUILDINGS.map((b, bi) => bi).filter(bi => BUILDINGS[bi].kind !== 'stairtower').sort((a, b) => { const ha = /house|manor/.test(obsKind(a)) ? 1 : 0, hb = /house|manor/.test(obsKind(b)) ? 1 : 0; return ha - hb || BUILDINGS[b].w * BUILDINGS[b].h - BUILDINGS[a].w * BUILDINGS[a].h; });
  for (const bi of order) { const b = BUILDINGS[bi], [mx, my] = obsP(b.x + b.w / 2, b.y + b.h / 2), house = /house|manor/.test(obsKind(bi)), nm = obsName(bi);
    if (mx < -50 || my < -50 || mx > SZ + 50 || my > SZ + 50) continue;
    if ((house && OBS.layers.houses) || (!house && OBS.layers.names)) label(nm.length > 24 ? nm.slice(0, 23) + '…' : nm, mx, my, house ? (big ? 13 : 11) : (big ? 15 : 12.5), house ? '#f4ead8' : '#fff', house ? 'rgba(60,44,28,.82)' : 'rgba(22,18,14,.86)', true);
    const B = bst[bi]; if (OBS.layers.gold && B && B[7]) { const v = B[7][0] + B[7][2] - B[7][1]; label(`$ ${v >= 0 ? '+' : ''}${v} hoje`, mx, my - 20, 11.5, v >= 0 ? '#e8f8e0' : '#ffe0d8', v >= 0 ? 'rgba(46,110,58,.92)' : 'rgba(150,50,36,.92)', true); }
    if (OBS.layers.prod && B && B[11] != null) label(`⚒ +${B[11]}/h`, mx, my + 20, 11.5, '#fff4d8', 'rgba(110,80,30,.92)', true);
    if (OBS.layers.alerts && abi.has(bi)) { const [ax, ay] = obsP(b.x + b.w / 2, b.y), pulse = 1 + Math.sin(now / 250) * 0.15; x.fillStyle = '#c8281e'; x.beginPath(); x.arc(ax, ay - 6, 9 * pulse, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '800 13px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', ax, ay - 6); } }
  if (!D) { label('Lendo a cidade…', SZ / 2, 30, 15, '#fff', 'rgba(20,20,24,.85)'); return; }
  const dot = (id, role, wx, wy, dest, cargo, name, selK, selId) => { if (!OBS.people[role]) return; const c = OBS_ROLES[role][1], [px, py] = obsP(wx, wy), sel = OBS.sel && OBS.sel.k === selK && OBS.sel.id === selId;
    if (OBS.layers.trails && (sel || role === 'cou')) { const T = OBS.trails[id] || []; x.strokeStyle = c + 'aa'; x.lineWidth = 2; x.beginPath(); T.forEach(([a, b], i) => { const q = obsP(a, b); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.stroke(); if (dest) { const q = obsP(dest[0], dest[1]); x.setLineDash([5, 5]); x.beginPath(); x.moveTo(px, py); x.lineTo(q[0], q[1]); x.stroke(); x.setLineDash([]); } }
    x.beginPath(); x.arc(px, py, sel ? 7 : role === 'ply' ? 6 : 4.5, 0, 7); x.fillStyle = c; x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#f4e8c8'; x.stroke();
    if (sel) { x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, 12, 0, 7); x.stroke(); }
    if (role === 'ply') label(name, px, py - 14, 11.5, '#2a1a0a');
    if (OBS.layers.cargo && cargo) { const t = Object.entries(cargo).map(([g, q]) => q + ' ' + obsGood(g)).join(', '); if (t) label(t, px + 30, py - 10, 11, '#fff', 'rgba(150,40,100,.9)'); } };
  for (const n of D.npcs) if (!(n[11] & 4)) dot(n[0], obsRole(n), n[4], n[5], n[9], n[10], n[1], 'n', n[0]);
  for (const p of D.players) dot('p' + p[0], 'ply', p[2], p[3], null, null, p[1], 'p', p[0]);
}
// ---------- fichas ----------
function obsCard() {
  const c = document.getElementById('ob-card'); if (!c) return; const D = OBS.data, s = OBS.sel;
  if (!s || !D) { c.innerHTML = '<h3>Ficha</h3><p style="color:var(--muted)">Clique numa pessoa ou num prédio no mapa.</p>'; return; }
  const bar = (v, col) => `<div class="meter"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${col}"></i></div>`;
  if (s.k === 'b') { const B = D.biz.find(b => b[3] === s.bi), kind = obsKind(s.bi), here = D.npcs.filter(n => typeof WORLD !== 'undefined' && WORLD.bld[tileAt(n[4], n[5])] === s.bi), live = D.npcs.filter(n => n[7] === s.bi), work = D.npcs.filter(n => n[8] === s.bi && n[7] !== s.bi);
    const al = obsAlerts().filter(a => a[3] === s.bi);
    c.innerHTML = `<h3>Local</h3><div class="who">${obsEsc(obsName(s.bi))}</div><div class="role">${{ house: 'Casa', manor: 'Casarão nobre', shop: 'Loja, taverna ou pousada', work: 'Oficina, fazenda ou mina', pub: 'Serviço público' }[kind]}${B ? ' · <span class="pill p-' + (B[5] || 'none') + '">' + (B[5] ? OBS_STT[B[5]] : 'sem contabilidade ainda') + '</span>' : ''}</div>
      ${al.map(a => `<div class="alert" style="border:0;padding:4px 0"><span class="bar" style="background:var(--${a[0]})"></span><div><b>${obsEsc(a[1])}</b><small>${obsEsc(a[2])}</small></div><span></span></div>`).join('')}
      <dl class="kv">${B ? `<dt>Dono</dt><dd>${obsEsc(B[4] || 'a Coroa')}</dd>${B[9] != null ? `<dt>Funcionários</dt><dd>${B[9]}</dd>` : ''}${B[6] != null ? `<dt>Estoque</dt><dd>${B[6]}</dd>` : ''}${B[7] ? `<dt>Vendas hoje</dt><dd>${B[7][3]}</dd><dt>Receita hoje</dt><dd>$ ${B[7][0]}</dd><dt>Mercadoria enviada</dt><dd>$ ${B[7][2]}</dd><dt>Custo hoje</dt><dd>$ ${B[7][1]}</dd><dt>Resultado hoje</dt><dd>$ ${B[7][0] + B[7][2] - B[7][1]}</dd>` : ''}${B[10] != null ? `<dt>Cofre</dt><dd>$ ${B[10]}</dd>` : ''}${B[8] ? `<dt>Esperando</dt><dd>${obsGood(B[8][0])} · ${B[8][1]} h</dd>` : ''}` : ''}
      <dt>Pessoas aqui agora</dt><dd>${here.length}</dd><dt>Moram aqui</dt><dd>${live.length ? obsEsc(live.map(n => n[1].split(',')[0]).join(', ')) : '—'}</dd><dt>Trabalham aqui</dt><dd>${work.length ? obsEsc(work.map(n => n[1].split(',')[0]).join(', ')) : '—'}</dd></dl>`; return; }
  if (s.k === 'p') { const p = D.players.find(q => q[0] === s.id); if (!p) { c.innerHTML = '<h3>Ficha</h3><p style="color:var(--muted)">Saiu do reino.</p>'; return; }
    c.innerHTML = `<h3>Jogador</h3><div class="who">${obsEsc(p[1])}</div><div class="role">nível ${p[4]}${p[8] ? ' · anfitrião' : ''}${p[5] ? ' · Tecelão' : ''}</div><dl class="kv"><dt>Ping</dt><dd>${p[6] != null ? p[6] + ' ms' : p[8] ? 'local' : '—'}</dd><dt>Reconexões</dt><dd>${p[7]}</dd><dt>Local</dt><dd>${obsEsc(obsName(WORLD.bld[tileAt(p[2], p[3])]))}</dd></dl><div class="tools" style="margin-top:10px"><button class="btn" data-tp="p|${obsEsc(p[0])}">Teleportar até</button><button class="btn" data-fo="p|${obsEsc(p[0])}">Seguir no jogo</button></div>`; return; }
  const n = D.npcs.find(q => q[0] === s.id); if (!n) { c.innerHTML = '<h3>Ficha</h3><p style="color:var(--muted)">Não está mais na cidade.</p>'; return; }
  const role = obsRole(n), fl = n[11], st = fl & 4 ? 'morto' : fl & 2 ? 'caído' : fl & 1 ? 'dormindo' : fl & 8 ? 'bêbado' : fl & 32 ? 'sentado' : '';
  const destB = n[9] && typeof WORLD !== 'undefined' ? WORLD.bld[tileAt(n[9][0], n[9][1])] : -1, nd = n[12];
  c.innerHTML = `<h3>Ficha</h3><div class="who">${obsEsc(n[1])}</div><div class="role">${OBS_ROLES[role][0]} · <b style="color:#e6e2d8">${obsEsc(OBS_ACT[n[6]] || n[6] || 'parado')}</b>${st ? ' · ' + st : ''}</div>
    <dl class="kv"><dt>Casa</dt><dd>${obsEsc(n[7] >= 0 ? obsName(n[7]) : n[11] & 16 ? 'de fora da cidade' : '—')}</dd><dt>Trabalho</dt><dd>${obsEsc(n[15] || (n[8] >= 0 ? (n[8] === n[7] ? obsName(n[8]) + ' (mora lá)' : obsName(n[8])) : '—'))}</dd><dt>Agora em</dt><dd>${obsEsc(obsName(WORLD.bld[tileAt(n[4], n[5])]) === '—' ? 'na rua' : obsName(WORLD.bld[tileAt(n[4], n[5])]))}</dd><dt>Indo para</dt><dd>${n[9] ? obsEsc(destB >= 0 ? obsName(destB) : 'rua') : '—'}</dd>${n[10] ? `<dt>Carregando</dt><dd>${obsEsc(Object.entries(n[10]).map(([g, q]) => q + ' ' + obsGood(g)).join(', '))}</dd>` : ''}</dl>
    <h3 style="margin-top:12px">Necessidades</h3>${nd ? `<div>Comida ${nd[0]}%</div>${bar(nd[0], 'var(--warn)')}<div>Descanso ${nd[1]}%</div>${bar(nd[1], '#7fb0e8')}<div>Convívio ${nd[2]}%</div>${bar(nd[2], '#e07ab8')}` : '<div style="color:var(--muted)">Sem rotina de necessidades (visitante, guarda ou funcionário).</div>'}
    ${n[13] != null ? `<h3 style="margin-top:12px">Humor e carteira</h3><div>Humor ${n[13]}% · ${n[13] < 30 ? 'triste' : n[13] > 75 ? 'feliz' : 'normal'}${fl & 128 ? ' · <b style="color:var(--warn)">faltou ao trabalho hoje</b>' : ''}</div>${bar(n[13], n[13] < 30 ? 'var(--bad)' : n[13] > 75 ? 'var(--ok)' : 'var(--accent)')}<dl class="kv"><dt>Carteira</dt><dd>$ ${n[14]}${n[14] < 5 ? ' (sem dinheiro)' : ''}</dd></dl>` : '<div style="color:var(--muted);font-size:12px;margin-top:6px">Visitantes e guardas não têm humor nem carteira.</div>'}
    <div class="tools" style="margin-top:10px"><button class="btn" data-tp="n|${obsEsc(n[0])}">Teleportar até</button><button class="btn" data-fo="n|${obsEsc(n[0])}">Seguir no jogo</button></div>`;
}
// ---------- abas de lista ----------
function obsRender() {
  const D = OBS.data; if (!D || !OBS.on) return;
  const hh = Math.floor(D.hour), mm = Math.floor((D.hour - hh) * 60);
  const ck = D.clk || { rate: 1 };
  document.getElementById('ob-clock').innerHTML = `<span>Dia <b>${D.day}</b> · <b>${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</b></span><span>Tempo <b style="color:${ck.paused ? 'var(--bad)' : ck.rate > 1 ? 'var(--warn)' : 'inherit'}">${ck.paused ? 'pausado' : ck.rate + '×'}</b></span><span>Anfitrião <b>${obsEsc(D.host)}</b></span><span>Passo <b>${D.tech.tick} ms</b></span>`;
  const A = obsAlerts(); document.getElementById('ob-abadge').textContent = A.length; document.getElementById('ob-abadge').style.display = A.length ? '' : 'none';
  const cnt = {}; for (const n of D.npcs) if (!(n[11] & 4)) cnt[obsRole(n)] = (cnt[obsRole(n)] || 0) + 1; cnt.ply = D.players.length;
  document.querySelectorAll('#ob-fp [data-pn]').forEach(e => e.textContent = cnt[e.dataset.pn] || 0);
  const tot = D.npcs.filter(n => !(n[11] & 4)).length; document.getElementById('ob-ptot').textContent = `Pessoas · ${tot} NPCs + ${D.players.length} jogador${D.players.length === 1 ? '' : 'es'}`;
  if (OBS.tab === 'map') obsCard();
  else if (OBS.tab === 'alerts') document.getElementById('ob-alerts').innerHTML = A.length ? A.map(a => `<div class="alert"><span class="bar" style="background:var(--${a[0]})"></span><div><b>${obsEsc(a[1])}</b><small>${obsEsc(a[2])}</small></div>${a[3] >= 0 ? `<button class="btn" data-goto="${a[3]}">Ver no mapa</button>` : '<span></span>'}</div>`).join('') : '<div class="soon">Nenhum alerta agora. A cidade está em ordem.</div>';
  else if (OBS.tab === 'people') obsPeople();
  else if (OBS.tab === 'biz') obsBiz();
  else if (OBS.tab === 'events') obsEvents();
  else if (OBS.tab === 'tech') obsTech();
  else if (OBS.tab === 'charts') obsCharts();
  else if (OBS.tab === 'ctrl') obsCtrl();
  else if (OBS.tab === 'items') { if (!OBS.itemsDone) obsItems(); }
  else if (OBS.tab === 'dayclock') obsDayClock();
}
// ---------- gráficos ----------
const OBS_PER = { all: 'Desde o começo', month: '1 mês', week: '1 semana' }, OBS_CLK = { game: 'Tempo do jogo', real: 'Tempo real' };
const OBS_CAT = { all: 'Todos', shop: 'Lojas', workshop: 'Oficinas', inn: 'Taverna e pousada', npc: 'Só de NPC', pl: 'Só de jogadores' };
const OBS_MET = { profit: ['Lucro', b => b[0] - b[1]], rev: ['Receita', b => b[0]], cost: ['Custo', b => b[1]], sold: ['Vendas', b => b[2]], prod: ['Produção', b => b[4]], stock: ['Estoque', b => b[3]] };
function obsSeries() {   /* devolve [{label, t, b:{pid:[...]}, g, c}] conforme período e relógio */
  const H = OBS.hist; if (!H) return []; const now = Date.now();
  const base = Math.min(...H.dy.map(r => r.d), ...H.hr.map(r => r.d)), dn = d => d - base + 1;   /* dias contados a partir do primeiro registro */
  let rows = OBS.per === 'week' && OBS.clk === 'game' ? H.hr.map(r => ({ ...r, label: 'd' + dn(r.d) + ' ' + String(r.h).padStart(2, '0') + 'h' })) : H.dy.map(r => ({ ...r, label: 'dia ' + dn(r.d) }));
  if (OBS.clk === 'game' && OBS.per === 'month') rows = rows.slice(-28);
  if (OBS.clk === 'real') { const span = OBS.per === 'week' ? 7 * 864e5 : OBS.per === 'month' ? 30 * 864e5 : Infinity, src = (OBS.per === 'week' ? H.dy.concat(H.hr.filter(r => !H.dy.some(d => d.d === r.d))) : H.dy).filter(r => now - r.t <= span), bucket = OBS.per === 'week' ? 36e5 : 864e5, M = new Map();
    for (const r of src) { const k = Math.floor(r.t / bucket); const a = M.get(k) || { t: k * bucket, b: {}, g: r.g, c: {}, label: '' }; for (const pid in r.b) { const x = a.b[pid] || (a.b[pid] = [0, 0, 0, 0, 0, r.b[pid][5]]); for (let i = 0; i < 5; i++) x[i] = i === 3 ? r.b[pid][3] : x[i] + r.b[pid][i]; } for (const kk in r.c || {}) a.c[kk] = (a.c[kk] || 0) + r.c[kk]; a.g = r.g; M.set(k, a); }
    rows = [...M.values()].sort((p, q) => p.t - q.t).map(r => { const d = new Date(r.t); return { ...r, label: OBS.per === 'week' ? d.getDate() + '/' + (d.getMonth() + 1) + ' ' + d.getHours() + 'h' : d.getDate() + '/' + (d.getMonth() + 1) }; }); }
  return rows;
}
function obsCatOk(pid) { const N = OBS.hist && OBS.hist.names && OBS.hist.names[pid]; if (!N) return false; const [nm, kind, wk, npc] = N; return OBS.cat === 'all' || (OBS.cat === 'shop' && kind === 'shop') || (OBS.cat === 'workshop' && kind === 'workshop' && wk !== 'tavern') || (OBS.cat === 'inn' && (wk === 'tavern' || kind === 'hotel')) || (OBS.cat === 'npc' && npc) || (OBS.cat === 'pl' && !npc); }
function obsCharts() {
  const tb = document.getElementById('ob-ctools'), box = document.getElementById('ob-charts'); if (!tb) return;
  const seg = (k, opts) => '<div class="seg">' + Object.entries(opts).map(([v, n]) => `<button data-cs="${k}|${v}" class="${OBS[k] === v ? 'on' : ''}">${Array.isArray(n) ? n[0] : n}</button>`).join('') + '</div>';
  tb.innerHTML = `<div class="tools">${seg('per', OBS_PER)}${seg('clk', OBS_CLK)}${seg('cat', OBS_CAT)}${seg('met', OBS_MET)}<button class="btn" data-csv="1">Exportar CSV</button></div>`;
  const R = obsSeries(); if (!OBS.hist) { box.innerHTML = '<div class="box soon">Lendo o histórico…</div>'; return; }
  if (R.length < 2) { box.innerHTML = `<div class="box soon">Ainda há pouco histórico para este período (${R.length} ponto). O jogo guarda uma linha por hora do jogo (30 s) e um resumo por dia do jogo (12 min). Experimente "1 semana" em tempo do jogo.</div>`; return; }
  const last = R[R.length - 1], tot = {}; for (const r of R) for (const pid in r.b) if (obsCatOk(pid)) tot[pid] = (tot[pid] || 0) + (OBS.met === 'stock' ? 0 : OBS_MET[OBS.met][1](r.b[pid])); if (OBS.met === 'stock') for (const pid in last.b) if (obsCatOk(pid)) tot[pid] = last.b[pid][3];
  const top = Object.entries(tot).sort((a, b) => b[1] - a[1]), nm = pid => (OBS.hist.names[pid] || [pid])[0], COL = ['#c9a24a', '#5cbf74', '#7fb0e8', '#e07ab8', '#e0604a', '#a99ae8', '#9ae0c0', '#d8d2c4'];
  box.innerHTML = '<div class="box"><h3 id="ob-c1h"></h3><canvas class="chart" id="ob-c1"></canvas></div><div class="box"><h3 id="ob-c2h"></h3><canvas class="chart" id="ob-c2"></canvas></div><div class="box"><h3>Ouro na cidade</h3><canvas class="chart" id="ob-c3"></canvas></div><div class="box"><h3>Produção × vendas (soma da categoria)</h3><canvas class="chart" id="ob-c4"></canvas></div><div class="box"><h3>Entregas, crimes e monstros mortos</h3><canvas class="chart" id="ob-c5"></canvas></div><div class="box"><h3>Humor e carteira dos moradores</h3><canvas class="chart" id="ob-c6"></canvas></div>';
  const met = OBS_MET[OBS.met][0]; document.getElementById('ob-c1h').textContent = met + ' por negócio (os 6 maiores)'; document.getElementById('ob-c2h').textContent = 'Ranking: ' + met.toLowerCase() + ' no período';
  const labels = R.map(r => r.label);
  obsLine('ob-c1', top.slice(0, 6).map(([pid], i) => ({ n: nm(pid), c: COL[i], d: R.map(r => r.b[pid] ? OBS_MET[OBS.met][1](r.b[pid]) : 0) })), labels);
  obsBars('ob-c2', top.slice(0, 10).map(([pid, v]) => [nm(pid), Math.round(v)]));
  obsLine('ob-c3', [{ n: 'Jogadores online', c: '#c8281e', d: R.map(r => (r.g || [])[0] || 0) }, { n: 'Banco', c: '#5cbf74', d: R.map(r => (r.g || [])[1] || 0) }, { n: 'Caixa dos negócios de NPC', c: '#7fb0e8', d: R.map(r => (r.g || [])[2] || 0) }], labels);
  const sum = (r, i) => Object.entries(r.b).filter(([pid]) => obsCatOk(pid)).reduce((a, [, b]) => a + b[i], 0);
  obsLine('ob-c4', [{ n: 'Produzido', c: '#e0b04a', d: R.map(r => sum(r, 4)) }, { n: 'Vendido', c: '#a99ae8', d: R.map(r => sum(r, 2)) }], labels);
  obsLine('ob-c6', [{ n: 'Humor médio (%)', c: '#5cbf74', d: R.map(r => (r.m || [0])[0]) }, { n: 'Tristes (humor < 30)', c: '#e0604a', d: R.map(r => (r.m || [0, 0, 0])[2]) }, { n: 'Ouro nas carteiras ÷ 10', c: '#c9a24a', d: R.map(r => Math.round(((r.m || [0, 0])[1]) / 10)) }], labels);
  obsLine('ob-c5', [{ n: 'Entregas', c: '#c83a8a', d: R.map(r => (r.c || {}).del || 0) }, { n: 'Crimes', c: '#e0604a', d: R.map(r => (r.c || {}).crime || 0) }, { n: 'Monstros', c: '#a99ae8', d: R.map(r => (r.c || {}).mon || 0) }], labels);
}
function obsCanvas(id) { const c = document.getElementById(id); if (!c) return null; const dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight; if (!w) return null; c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr); return [g, w, h]; }
function obsLine(id, series, labels) {
  const C = obsCanvas(id); if (!C) return; const [g, w, h] = C, L = 56, Rr = 12, T = 22, B = 24, all = series.flatMap(s => s.d).concat([0]), mx0 = Math.max(...all), mn0 = Math.min(...all), pad = (mx0 - mn0) * 0.08 || 1, mx = mx0 + pad, mn = Math.min(0, mn0 - (mn0 < 0 ? pad : 0));
  const X = i => L + i * (w - L - Rr) / Math.max(1, labels.length - 1), Y = v => T + (1 - (v - mn) / (mx - mn)) * (h - T - B);
  g.font = '11px sans-serif'; g.strokeStyle = '#2b3038'; g.fillStyle = '#8d939c'; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const v = mn + (mx - mn) * k / 4, y = Y(v); g.beginPath(); g.moveTo(L, y); g.lineTo(w - Rr, y); g.stroke(); g.textAlign = 'right'; g.fillText(Math.round(v).toLocaleString('pt-BR'), L - 6, y + 4); }
  if (mn < 0) { g.strokeStyle = '#5a6068'; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(w - Rr, Y(0)); g.stroke(); }
  g.textAlign = 'center'; g.fillStyle = '#8d939c'; const stepL = Math.ceil(labels.length / 7); labels.forEach((l, i) => { if (i % stepL === 0 || i === labels.length - 1) g.fillText(l, X(i), h - 6); });
  let lx = L; g.textAlign = 'left'; for (const s of series) { g.fillStyle = s.c; g.fillRect(lx, 5, 10, 10); g.fillStyle = '#e6e2d8'; const t = s.n.length > 22 ? s.n.slice(0, 21) + '…' : s.n; g.fillText(t, lx + 14, 14); lx += g.measureText(t).width + 30; if (lx > w - 60) break; }
  for (const s of series) { g.strokeStyle = s.c; g.lineWidth = 2; g.beginPath(); s.d.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke(); const i = s.d.length - 1; g.fillStyle = s.c; g.beginPath(); g.arc(X(i), Y(s.d[i]), 3, 0, 7); g.fill(); }
}
function obsBars(id, items) {
  const C = obsCanvas(id); if (!C) return; const [g, w, h] = C; if (!items.length) return; const mx = Math.max(1, ...items.map(i => Math.abs(i[1]))), L = 170, bh = (h - 10) / items.length;
  g.font = '12px sans-serif'; items.forEach(([n, v], k) => { const y = 5 + k * bh, bw = (w - L - 80) * Math.abs(v) / mx; g.fillStyle = '#8d939c'; g.textAlign = 'right'; g.fillText(n.length > 24 ? n.slice(0, 23) + '…' : n, L - 8, y + bh / 2 + 4); g.fillStyle = v < 0 ? '#e0604a' : k === 0 ? '#c9a24a' : '#5a6470'; g.fillRect(L, y + 3, bw, bh - 8); g.fillStyle = '#e6e2d8'; g.textAlign = 'left'; g.fillText((v > 0 ? '+' : '') + v.toLocaleString('pt-BR'), L + bw + 6, y + bh / 2 + 4); });
}
function obsCsv() {
  const H = OBS.hist; if (!H) return; const lines = ['tipo;dia_do_jogo;hora_do_jogo;data_real;negocio;categoria;npc;receita;custo;vendas;estoque;producao'];
  const put = (kind, r) => { for (const pid in r.b) { const N = H.names[pid] || [pid, '', '', 0], b = r.b[pid]; lines.push([kind, r.d, r.h ?? '', new Date(r.t).toISOString(), N[0], N[1], N[3] ? 'sim' : 'nao', b[0], b[1], b[2], b[3], b[4]].join(';')); } };
  for (const r of H.dy) put('dia', r); for (const r of H.hr) put('hora', r);
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nae-observatorio-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
// ---------- itens do jogo (lista pronta, sai dos dados do próprio jogo) ----------
function obsItemRows() {
  const rows = [], has = (k, o2) => o2 && Object.prototype.hasOwnProperty.call(o2, k), fmt = v => v == null ? '—' : '$ ' + v;
  const makers = g => { const out = []; for (const wk in WORKS) { const W = WORKS[wk]; if (W.make && g in W.make) out.push(W.n + ' (' + W.make[g] + '/h)'); if (W.recipes && g in W.recipes) out.push(W.n + ' (' + Object.entries(W.recipes[g]).map(([a, q]) => q + ' ' + GOODS[a].n).join(' + ') + ')'); } return out; };
  const shops = g => Object.entries(SHOP_GOODS).filter(([, L]) => L.includes(g)).map(([t]) => ({ witch: 'Elixires da Lua Prateada', apoth: 'Boticário de Elva', arcane: 'Arcanos & Varinhas', tailor: 'Alfaiataria Real', scroll: 'Pergaminhos & Mapas' })[t] || t);
  const used = g => { const out = []; for (const wk in WORKS) { const W = WORKS[wk]; if (W.recipes) for (const r in W.recipes) if (g in W.recipes[r]) out.push(GOODS[r].n + ' (' + W.n + ')'); } return out; };
  for (const k in LOOT) { const L = LOOT[k]; let cat = 'loot', eff = L.desc || '';
    if (L.tool) cat = 'tool'; else if (has(k, FOOD) || ['ale', 'firemead', 'tea'].includes(k)) cat = 'food'; else if (/^(herb|salve|ointment|elixir_)/.test(k)) cat = 'med'; else if (/^wand/.test(k)) cat = 'wand'; else if (typeof CLOAK_BY_ITEM !== 'undefined' && CLOAK_BY_ITEM[k]) cat = 'wear'; else if (['log', 'hardwood', 'ore', 'flaxraw', 'silverleaf', 'wheat', 'firewood', 'gem', 'apple', 'berries'].includes(k)) cat = 'raw'; else if (['map', 'amulet_luck', 'pouch', 'trinket'].includes(k)) cat = 'special';
    const extra = []; if (has(k, FOOD)) extra.push('+' + FOOD[k] + ' de comida'); if (typeof WANDS !== 'undefined' && WANDS[k]) extra.push('+' + Math.round(WANDS[k].dmg * 100) + '% de magia, +' + WANDS[k].mp + ' de mana'); if (typeof ITEM_GOOD !== 'undefined' && ITEM_GOOD[k]) extra.push('vira ' + ITEM_GOOD[k][1] + ' ' + GOODS[ITEM_GOOD[k][0]].n + ' nos negócios');
    rows.push({ cat, k, ic: L.icon || '•', n: L.name, eff: eff + (extra.length ? ' · ' + extra.join(' · ') : ''), buy: L.price, from: '' }); }
  for (const k in ITEMS) { const I = ITEMS[k]; rows.push({ cat: 'med', k: 'pot_' + k, ic: k === 'hp' ? '❤' : k === 'mp' ? '✦' : k === 'band' ? '🩹' : '💧', n: I.name, eff: I.desc, buy: I.price, from: 'Empório do Borin' }); }
  for (const g in GOODS) { const G2 = GOODS[g], mk = makers(g), sh = shops(g), us = used(g); rows.push({ cat: 'good', k: g, ic: G2.ic || '▪', n: G2.n, eff: (mk.length ? 'Feito em: ' + mk.join(', ') : 'Comprado do fornecedor') + (us.length ? ' · usado para: ' + us.join(', ') : '') + (sh.length ? ' · vendido em: ' + sh.join(', ') : ''), buy: G2.p, from: 'venda ao fornecedor: $ ' + (G2.p * 0.85).toFixed(1) }); }
  if (typeof WEAPONS !== 'undefined') for (const k in WEAPONS) { const Wp = WEAPONS[k]; rows.push({ cat: 'weapon', k, ic: k === 'halberd' ? '🔱' : '⚔', n: Wp.n, eff: 'Dano ' + Math.round(Wp.dmg * 100) + '% · alcance ' + Wp.reach + ' · velocidade ' + Math.round(Wp.spd * 100) + '% · arco ' + Math.round(Wp.arc * 100) + '%' + (k === 'halberd' ? ' · cavaleiro troca com a tecla da arma' : ''), buy: null, from: 'arma do cavaleiro' }); }
  return rows;
}
const OBS_ICAT = { all: 'Todos', food: 'Comida e bebida', med: 'Remédios e poções', tool: 'Ferramentas', raw: 'Matérias-primas', good: 'Mercadorias dos negócios', wand: 'Varinhas', wear: 'Roupas e capas', weapon: 'Armas', special: 'Especiais', loot: 'Saque de monstros' };
function obsItems(keepInput) {
  const box = document.getElementById('ob-items'); if (!box) return; OBS.itemsDone = true; const cat = OBS.icat || 'all', q = (OBS.iq || '').trim().toLowerCase();
  const all = obsItemRows(), rows = all.filter(r => (cat === 'all' || r.cat === cat) && (!q || (r.n + ' ' + r.eff + ' ' + r.k).toLowerCase().includes(q)));
  const counts = {}; for (const r of all) counts[r.cat] = (counts[r.cat] || 0) + 1;
  const head = `<div class="tools"><div class="seg">${Object.entries(OBS_ICAT).map(([k, n]) => `<button data-icat="${k}" class="${cat === k ? 'on' : ''}">${n}${k === 'all' ? ' (' + all.length + ')' : counts[k] ? ' (' + counts[k] + ')' : ''}</button>`).join('')}</div><input id="ob-isearch" placeholder="Procurar item…" value="${obsEsc(OBS.iq || '')}" style="background:#0f1114;border:1px solid var(--line);border-radius:6px;color:#e6e2d8;padding:6px 10px;min-width:220px"></div>`;
  const table = `<table><tr><th></th><th>Item</th><th>Tipo</th><th>Efeito / uso</th><th class="num">Preço base</th><th>Onde / observação</th></tr>${rows.map(r => `<tr><td style="font-size:18px">${obsEsc(r.ic)}</td><td><b>${obsEsc(r.n)}</b><br><small style="color:var(--muted)">${obsEsc(r.k)}</small></td><td>${OBS_ICAT[r.cat]}</td><td style="white-space:normal;max-width:520px">${obsEsc(r.eff)}</td><td class="num">${r.buy != null ? '$ ' + r.buy : '—'}</td><td style="white-space:normal;color:var(--muted)">${obsEsc(r.from)}</td></tr>`).join('')}</table>${rows.length ? '' : '<div class="soon">Nenhum item com esse filtro.</div>'}`;
  if (keepInput && document.getElementById('ob-isearch')) { const tb = box.querySelector('table'), next = document.createElement('div'); next.innerHTML = table; if (tb) tb.replaceWith(...next.childNodes); else box.insertAdjacentHTML('beforeend', table); return; }
  box.innerHTML = head + `<div style="color:var(--muted);font-size:12px;margin-bottom:8px">Preço base: o valor de referência do item (lojas e moradores aplicam a margem e a opinião deles por cima). Mercadorias: o que os negócios produzem, compram e vendem.</div>` + table;
}
// ---------- controles de simulação ----------
function obsCtrl() {
  const box = document.getElementById('ob-ctrl'), D = OBS.data; if (!box || !D) return; const ck = D.clk || { rate: 1, paused: false, ev: {} }, ev = ck.ev || {};
  const b = (a, v, label, on, extra) => `<button class="btn" data-oc="${a}|${v}${extra ? '|' + extra : ''}" style="${on ? 'border-color:var(--accent);color:var(--accent)' : ''}">${label}</button>`;
  box.innerHTML = `<h3>Tempo</h3><div class="tools">${b('pause', 0, ck.paused ? '▶ Voltar a correr' : '⏸ Pausar a cidade', ck.paused)}${[1, 2, 5, 10].map(v => b('rate', v, v + '×', !ck.paused && ck.rate === v)).join('')}</div>
    <p style="color:var(--muted)">Afeta todos no reino e o chat avisa. Pausado: o sol para, as necessidades e a economia param (as pessoas ainda andam). Acelerado: horas, necessidades, produção, vendas e salários andam mais rápido; os moradores podem não chegar a tempo nos lugares. Se outro jogador assumir o reino, o tempo volta a 1×.</p>
    <h3 style="margin-top:14px">Criar evento</h3><div class="tools">${b('ev', 'party', '🎉 Festa na taverna (3 h)')}${b('ev', 'caravan', '🐪 Caravana de mercadores')}${b('ev', 'attack', '⚔ Ataque no portão sul')}${b('ev', 'fire', '🔥 Incêndio numa oficina')}</div>
    <div class="tools"><span style="color:var(--muted)">Falta de insumo por 1 dia:</span>${['wheat', 'wood', 'ore', 'herb', 'flax'].map(g => b('ev', 'short', obsGood(g), false, g)).join('')}</div>
    <h3 style="margin-top:14px">Eventos ativos</h3><div style="color:var(--muted)">${[ev.party ? `🎉 Festa: mais ${ev.party} h do jogo` : '', ev.short ? `⚠ Falta de ${obsGood(ev.short[0])}: mais ${ev.short[1]} h do jogo` : ''].filter(Boolean).join(' · ') || 'Nenhum.'}</div>
    <p style="color:var(--muted);margin-top:12px">Dica: acelere o tempo e acompanhe as abas Negócios, Alertas e Gráficos para ver como a cidade reage a cada evento.</p>`;
}
// ---------- relógio do dia ----------
function obsDayClock() {
  const box = document.getElementById('ob-dc'); if (!box) return; const H = OBS.hist, PL = [['Em casa', '#3a6ad8'], ['Trabalhando', '#d89a1a'], ['Taverna', '#c83a3a'], ['Lojas e oficinas', '#2a9a7a'], ['Na rua', '#8d939c']];
  const roles = { res: 'Moradores', art: 'Artesãos e balconistas', cou: 'Mensageiros', grd: 'Guardas', vis: 'Visitantes' };
  const acc = Array.from({ length: 24 }, () => [0, 0, 0, 0, 0]), days = new Set(); for (const r of (H && H.hr) || []) { const a = r.pop && r.pop[OBS.dcRole]; if (!a) continue; days.add(r.d); for (let i = 0; i < 5; i++) acc[r.h][i] += a[i]; }
  box.innerHTML = `<div class="tools"><span style="color:var(--muted)">Onde cada tipo de morador costuma estar em cada hora (média de ${days.size} dia(s) do jogo registrados)</span><div class="seg">${Object.entries(roles).map(([k, n]) => `<button data-cs="dcRole|${k}" class="${OBS.dcRole === k ? 'on' : ''}">${n}</button>`).join('')}</div></div><canvas class="chart" id="ob-dcc" style="height:320px"></canvas>
    <div class="tools" style="margin-top:10px"><span style="color:var(--muted)">Hora</span><input type="range" id="ob-dch" min="0" max="23" value="${OBS.dcH}" style="flex:1;accent-color:#c9a24a"><b id="ob-dchl" style="font-family:monospace">${String(OBS.dcH).padStart(2, '0')}:00</b></div><div id="ob-dcinfo" style="color:var(--muted)"></div>`;
  const C = obsCanvas('ob-dcc'); if (!C) return; const [g, w, h] = C, L = 44, T = 26, B = 22, bw = (w - L - 10) / 24;
  g.font = '11px sans-serif'; g.fillStyle = '#8d939c'; g.textAlign = 'right'; for (const v of [0, 50, 100]) g.fillText(v + '%', L - 6, T + (1 - v / 100) * (h - T - B) + 4);
  acc.forEach((col, i) => { const t = col.reduce((a, b) => a + b, 0); let y = h - B; if (t) col.forEach((v, k) => { const hg = v / t * (h - T - B); g.fillStyle = PL[k][1]; g.fillRect(L + i * bw + 1, y - hg, bw - 2, hg); y -= hg; }); else { g.fillStyle = '#1e2228'; g.fillRect(L + i * bw + 1, T, bw - 2, h - T - B); } g.fillStyle = i === OBS.dcH ? '#e6e2d8' : '#8d939c'; g.textAlign = 'center'; if (i % 2 === 0 || i === OBS.dcH) g.fillText(String(i).padStart(2, '0'), L + i * bw + bw / 2, h - 6); });
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(L + OBS.dcH * bw, T - 2, bw, h - T - B + 2);
  let lx = L; g.textAlign = 'left'; PL.forEach(([n, c]) => { g.fillStyle = c; g.fillRect(lx, 6, 10, 10); g.fillStyle = '#e6e2d8'; g.fillText(n, lx + 14, 15); lx += g.measureText(n).width + 34; });
  const col = acc[OBS.dcH], t = col.reduce((a, b) => a + b, 0); document.getElementById('ob-dcinfo').textContent = t ? 'Às ' + String(OBS.dcH).padStart(2, '0') + ':00: ' + PL.map(([n], k) => n.toLowerCase() + ' ' + Math.round(col[k] / t * 100) + '%').join(' · ') : 'Ainda sem registros nessa hora.';
}
function obsPeople() {
  const D = OBS.data; if (!D) return; const rows = D.npcs.filter(n => OBS.pf === 'all' || obsRole(n) === OBS.pf);
  const tot = D.npcs.filter(n => !(n[11] & 4)).length;
  document.getElementById('ob-people').innerHTML = `<div class="tools"><div class="seg">${[['all', 'Todos'], ...Object.entries(OBS_ROLES).filter(([k]) => k !== 'ply').map(([k, v]) => [k, v[0]])].map(([k, n]) => `<button data-pf="${k}" class="${OBS.pf === k ? 'on' : ''}">${n}</button>`).join('')}</div><span style="color:var(--muted)">Total: <b style="color:#e6e2d8">${tot} NPCs</b> vivos${D.npcs.length > tot ? ' (+' + (D.npcs.length - tot) + ' mortos)' : ''} e ${D.players.length} jogador(es) online</span></div>
    <table><tr><th>Nome</th><th>Tipo</th><th>Fazendo</th><th>Casa</th><th>Trabalho</th><th>Agora em</th><th class="num">Comida</th><th class="num">Descanso</th><th class="num">Convívio</th><th class="num">Humor</th><th class="num">Carteira</th></tr>${rows.map(n => `<tr class="click" data-sel="${obsEsc(n[0])}"><td>${obsEsc(n[1])}</td><td>${OBS_ROLES[obsRole(n)][0]}</td><td>${obsEsc(OBS_ACT[n[6]] || n[6] || '—')}${n[11] & 2 ? ' (caído)' : ''}</td><td>${obsEsc(n[7] >= 0 ? obsName(n[7]) : n[11] & 16 ? 'de fora da cidade' : '—')}</td><td>${obsEsc(n[15] || (n[8] >= 0 ? (n[8] === n[7] ? obsName(n[8]) + ' (mora lá)' : obsName(n[8])) : '—'))}</td><td>${obsEsc(obsName(WORLD.bld[tileAt(n[4], n[5])]))}</td><td class="num">${n[12] ? n[12][0] + '%' : '—'}</td><td class="num">${n[12] ? n[12][1] + '%' : '—'}</td><td class="num">${n[12] ? n[12][2] + '%' : '—'}</td><td class="num" style="color:${n[13] == null ? 'inherit' : n[13] < 30 ? 'var(--bad)' : n[13] > 75 ? 'var(--ok)' : 'inherit'}">${n[13] != null ? n[13] + '%' : '—'}</td><td class="num">${n[14] != null ? '$ ' + n[14] : '—'}</td></tr>`).join('')}</table>`;
  document.querySelectorAll('#ob-people [data-sel]').forEach(r => r.onclick = () => { OBS.sel = { k: 'n', id: r.dataset.sel }; obsTab('map'); });
}
function obsBiz() {
  const D = OBS.data; if (!D) return;
  const npcN = D.biz.filter(b => /\(NPC\)$/.test(b[4] || '')).length;
  document.getElementById('ob-biz').innerHTML = `<div class="tools"><span style="color:var(--muted)">Valores do dia atual do jogo. ${npcN} negócios de NPC com economia própria (compram insumos dos outros negócios de NPC ou do fornecedor, pagam salário e manutenção; 3 dias seguidos no vermelho = fecha por 2 dias e reabre com empréstimo). Clique para ver no mapa.</span></div>
    <table><tr><th>Negócio</th><th>Tipo</th><th>Dono</th><th>Status</th><th class="num">Estoque</th><th class="num">Produção/h</th><th class="num">Vendas</th><th class="num">Receita</th><th class="num">Custo</th><th class="num">Resultado</th><th class="num">Caixa</th><th class="num">Dias no vermelho</th><th class="num">Dívida</th><th class="num">Do fornecedor</th><th>Falta</th></tr>${D.biz.map(b => { const td = b[7], v = td ? td[0] + td[2] - td[1] : null, npc = /\(NPC\)$/.test(b[4] || ''); return `<tr class="click" data-goto="${b[3]}"><td>${obsEsc(b[1])}</td><td>${{ shop: 'Loja', workshop: 'Oficina', hotel: 'Pousada', bank: 'Banco' }[b[2]] || b[2]}</td><td>${obsEsc(b[4] || '—')}</td><td><span class="pill p-${b[5] || 'none'}">${b[5] ? OBS_STT[b[5]] : 'sem dados'}</span></td><td class="num">${b[6] ?? '—'}</td><td class="num">${b[11] ?? '—'}</td><td class="num">${td ? td[3] : '—'}</td><td class="num">${td ? '$ ' + (td[0] + td[2]) : '—'}</td><td class="num">${td ? '$ ' + td[1] : '—'}</td><td class="num" style="color:${v == null ? 'inherit' : v >= 0 ? 'var(--ok)' : 'var(--bad)'}">${v == null ? '—' : (v >= 0 ? '+' : '') + v}</td><td class="num">${b[10] != null ? '$ ' + b[10] : '—'}</td><td class="num">${npc ? b[12] : '—'}</td><td class="num">${npc ? b[13] : '—'}</td><td class="num">${npc ? b[15] : '—'}</td><td>${b[8] ? obsEsc(obsGood(b[8][0])) + ' · ' + b[8][1] + (npc ? ' dia(s)' : ' h') : '—'}</td></tr>`; }).join('')}</table>`;
}
function obsEvents() {
  const D = OBS.data; if (!D) return; const L = D.ev.slice().reverse().filter(e => OBS.evf === 'all' || obsEvCat(e[1]) === OBS.evf);
  const pc = { com: 'p-ok', del: 'p-warn', crime: 'p-bad', death: 'p-bad', vis: 'p-warn', mon: 'p-idle', other: 'p-idle' };
  document.getElementById('ob-events').innerHTML = `<div class="tools"><div class="seg">${Object.entries(OBS_EVC).map(([k, n]) => `<button data-ef="${k}" class="${OBS.evf === k ? 'on' : ''}">${n}</button>`).join('')}</div><span style="color:var(--muted)">Últimos ${D.ev.length} acontecimentos anunciados no reino</span></div>${L.length ? L.map(e => { const c = obsEvCat(e[1]), d = new Date(e[0]); return `<div class="ev"><span class="t">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span><span><span class="pill ${pc[c]}">${OBS_EVC[c]}</span></span><span>${obsEsc(e[1])}</span></div>`; }).join('') : '<div class="soon">Nada registrado nesta categoria ainda.</div>'}`;
}
function obsTech() {
  const D = OBS.data; if (!D) return; const T = D.tech, st = T.stalls;
  document.getElementById('ob-tech').innerHTML = `<h3>Servidor (computador do anfitrião: ${obsEsc(D.host)})</h3><div class="kpis"><div class="kpi"><div class="v">${T.tick} ms</div><div class="l">passo médio do servidor (ele roda 10 vezes por segundo)</div></div><div class="kpi"><div class="v">${T.max} ms</div><div class="l">passo mais lento recente</div></div><div class="kpi"><div class="v">${st.length}</div><div class="l">travadas acima de 1 s na última hora</div></div><div class="kpi"><div class="v">${T.npcN}</div><div class="l">NPCs simulados</div></div><div class="kpi"><div class="v">${T.mons}</div><div class="l">monstros no mundo</div></div></div>
    <h3 style="margin-top:14px">Jogadores conectados</h3><table><tr><th>Jogador</th><th class="num">Nível</th><th class="num">Ping</th><th class="num">KB/s recebidos</th><th class="num">Reconexões</th><th>Papel</th></tr>${D.players.map(p => `<tr><td>${obsEsc(p[1])}</td><td class="num">${p[4]}</td><td class="num">${p[8] ? 'local' : p[6] != null ? p[6] + ' ms' : '—'}</td><td class="num">${p[8] ? '—' : p[10] != null ? p[10] : '—'}</td><td class="num">${p[7]}</td><td>${p[8] ? '<span class="pill p-ok">anfitrião</span>' : '<span class="pill p-idle">jogador</span>'}</td></tr>`).join('')}</table>
    <h3 style="margin-top:14px">Tarefas longas da página do anfitrião (última hora)</h3>${(T.long || []).length ? `<div style="margin-bottom:6px">${T.long.length} tarefa(s) acima de 0,2 s · total ${(T.long.reduce((a, q) => a + q[1], 0) / 1000).toFixed(1)} s · maior ${(Math.max(...T.long.map(q => q[1])) / 1000).toFixed(1)} s</div><div style="color:var(--muted);font-size:12px">São momentos em que a página do anfitrião ficou ocupada (desenhando, carregando regiões, montando prédios) e não conseguiu rodar o servidor nem mandar pacotes.</div>` : '<div style="color:var(--muted)">Nenhuma. (Só aparece no computador do anfitrião.)</div>'}
    <h3 style="margin-top:14px">Travadas do servidor (última hora)</h3>${st.length ? '<table><tr><th>Quando</th><th class="num">Duração</th></tr>' + st.slice().reverse().map(q => { const d = new Date(q[0]); return `<tr><td>${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}</td><td class="num" style="color:${q[1] > 5000 ? 'var(--bad)' : 'var(--warn)'}">${(q[1] / 1000).toFixed(1)} s</td></tr>`; }).join('') + '</table>' : '<div style="color:var(--muted)">Nenhuma travada acima de 1 s. Ótimo.</div>'}
    <div style="color:var(--muted);font-size:12px;margin-top:10px">KB/s: estimativa do estado do mundo que o anfitrião manda para cada jogador (10 vezes por segundo).</div>`;
}
