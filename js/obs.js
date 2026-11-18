// ============================================================
//  OBSERVATÓRIO DO TECELÃO (F9) — visão da cidade em tempo real, só no modo Tecelão.
//  Etapa 1: mapa ao vivo com filtros e camadas, fichas de pessoas e locais, alertas, pessoas, negócios,
//  linha do tempo e saúde técnica. Gráficos, relógio do dia e controles chegam nas próximas etapas.
// ============================================================
const OBS = { on: false, tab: 'map', data: null, sel: null, view: 'city', trails: {}, reqT: 0, built: false,
  people: { res: true, art: true, cou: true, grd: true, vis: true, ply: true }, layers: { names: true, houses: true, status: true, alerts: true, trails: true, cargo: true, gold: false }, evf: 'all', pf: 'all' };
const OBS_ROLES = { res: ['Moradores', '#3a6ad8'], art: ['Artesãos e balconistas', '#d89a1a'], cou: ['Mensageiros', '#c83a8a'], grd: ['Guardas', '#5a646e'], vis: ['Visitantes', '#2a9a7a'], ply: ['Jogadores', '#c8281e'] };
const OBS_KC = { house: '#9a7a5a', manor: '#7a4a8a', shop: '#2a6aa8', work: '#a8641e', pub: '#4a4a52' };
const OBS_STC = { ok: '#3e8a4e', warn: '#c08a20', bad: '#b84a34', idle: '#6e7680' };
const OBS_STT = { ok: 'lucro bom', warn: 'falta insumo', bad: 'prejuízo', idle: 'fechado' };
const OBS_VIEWS = { center: [128, 128, 66], city: [102, 130, 126], realm: [128, 128, 256] };
const obsEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const obsName = bi => { if (bi == null || bi < 0 || !BUILDINGS[bi]) return '—'; const P = PROPS.find(q => q.bi === bi); return (P && P.name) || BUILDINGS[bi].name || 'Casa'; };
const obsKind = bi => { const b = BUILDINGS[bi], P = PROPS.find(q => q.bi === bi); if (!b) return 'pub'; if (b.kind === 'manor') return 'manor'; if (b.kind === 'house' || b.kind === 'fruithouse') return P && P.kind !== 'house' ? (P.kind === 'workshop' ? 'work' : 'shop') : 'house'; if (b.kind === 'tavern' || b.kind === 'hotel' || b.kind === 'shop' || b.kind === 'boutique' || (P && P.kind === 'shop')) return 'shop'; if (b.kind === 'workshop' || b.kind === 'smith' || b.kind === 'stable' || (P && P.kind === 'workshop')) return 'work'; return 'pub'; };
function obsRole(n) { if (n[11] & 16) return 'vis'; if (n[3] === 'courier') return 'cou'; if (/^(guard|captain)/.test(n[2])) return 'grd'; if (/artisan|clerk|worker/.test(n[3]) || /^st_|smith|innkeeper|merchant|banker|tavmaid|hotelkeeper|fruit|tailor|broker/.test(n[2])) return 'art'; return 'res'; }
const OBS_ACT = { work: 'trabalhando', home: 'em casa', sleep: 'dormindo', social: 'na taverna', eat: 'comendo', shop: 'comprando', walk: 'andando', bank: 'no banco', patrol: 'patrulhando', 'indo buscar': 'indo buscar mercadoria', levando: 'levando entrega', voltando: 'voltando da entrega' };
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
#obs .ob-tip { position: fixed; pointer-events: none; background: #0b0d10ee; border: 1px solid var(--line); padding: 5px 9px; border-radius: 5px; font-size: 12.5px; display: none; z-index: 71; }
@media (max-width: 1100px) { #obs .ob-mapv { grid-template-columns: 1fr; } }`;
  document.head.appendChild(st);
}
function obsBuild() {
  if (OBS.built) return; OBS.built = true; obsCss();
  const d = document.createElement('div'); d.id = 'obs'; d.className = 'hidden';
  const tabs = [['map', 'Mapa'], ['alerts', 'Alertas'], ['dayclock', 'Relógio do dia'], ['people', 'Pessoas'], ['biz', 'Negócios'], ['charts', 'Gráficos'], ['events', 'Linha do tempo'], ['tech', 'Saúde técnica'], ['ctrl', 'Controles']];
  d.innerHTML = `<div class="ob-wrap"><header><div class="ob-logo">Observatório<small>Tecelão · visão da cidade · F9 fecha</small></div><div class="ob-clock" id="ob-clock"></div>
    <nav id="ob-tabs">${tabs.map(([k, n]) => `<button data-ot="${k}">${n}${k === 'alerts' ? '<span class="badge" id="ob-abadge">0</span>' : ''}</button>`).join('')}<button class="ob-x" data-ot="close">Fechar</button></nav></header>
    <section class="ob-view ob-mapv" data-ov="map"><aside class="box"><h3 id="ob-ptot">Pessoas</h3><div class="flt" id="ob-fp"></div><h3>Camadas</h3><div class="flt" id="ob-fl"></div></aside>
      <div class="box"><div class="maphead"><div class="seg" id="ob-zoom"><button data-z="center">Cidadela</button><button data-z="city">Cidade inteira</button><button data-z="realm">Reino</button></div><span style="color:var(--muted)">Clique numa pessoa ou num prédio</span></div><canvas class="ob-map" id="ob-map" width="1000" height="1000"></canvas>
      <div class="legend"><b style="color:#e6e2d8">Locais:</b>${[['house', 'Casa'], ['manor', 'Casarão nobre'], ['shop', 'Loja, taverna e pousada'], ['work', 'Oficina, fazenda e mina'], ['pub', 'Serviço público']].map(([k, n]) => `<span><i style="border-color:${OBS_KC[k]};background:${OBS_KC[k]}"></i>${n}</span>`).join('')}</div>
      <div class="legend"><b style="color:#e6e2d8">Status dos negócios:</b><span><i style="border-color:var(--ok);background:rgba(92,191,116,.3)"></i>Lucro bom: vende mais do que gasta</span><span><i style="border-color:var(--warn);background:rgba(224,176,74,.3)"></i>Falta insumo: esperando mercadoria há 2 h ou mais</span><span><i style="border-color:var(--bad);background:rgba(224,96,74,.3)"></i>Prejuízo: gastou mais do que vendeu hoje</span><span><i style="border-color:var(--idle);background:rgba(141,147,156,.3)"></i>Fechado</span><span><b style="color:var(--bad)">!</b> tem alerta (aba Alertas)</span></div></div>
      <aside class="box" id="ob-card"></aside></section>
    <section class="ob-view" data-ov="alerts"><div class="box" id="ob-alerts"></div></section>
    <section class="ob-view" data-ov="dayclock"><div class="box soon">O relógio do dia precisa de alguns dias de dados guardados: chega na próxima etapa, junto com o registro de dados e os gráficos.</div></section>
    <section class="ob-view" data-ov="people"><div class="box tablebox" id="ob-people"></div></section>
    <section class="ob-view" data-ov="biz"><div class="box tablebox" id="ob-biz"></div></section>
    <section class="ob-view" data-ov="charts"><div class="box soon">Gráficos (desde o começo, 1 mês, 1 semana; tempo do jogo ou real), ranking por categoria e exportar CSV: próxima etapa. Os negócios de NPC ganham contabilidade nela também.</div></section>
    <section class="ob-view" data-ov="events"><div class="box" id="ob-events"></div></section>
    <section class="ob-view" data-ov="tech"><div class="box" id="ob-tech"></div></section>
    <section class="ob-view" data-ov="ctrl"><div class="box soon">Controles de simulação (pausar, acelerar o tempo, criar eventos): etapa 4.</div></section></div><div class="ob-tip" id="ob-tip"></div>`;
  document.body.appendChild(d);
  d.querySelector('#ob-tabs').onclick = e => { const b = e.target.closest('[data-ot]'); if (!b) return; if (b.dataset.ot === 'close') obsToggle(false); else obsTab(b.dataset.ot); };
  d.querySelector('#ob-zoom').onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; OBS.view = b.dataset.z; obsSegs(); };
  const fp = d.querySelector('#ob-fp'); fp.innerHTML = Object.entries(OBS_ROLES).map(([k, [n, c]]) => `<label><input type="checkbox" data-p="${k}" checked><span class="dot" style="background:${c}"></span>${n}<span class="n" data-pn="${k}">0</span></label>`).join('');
  fp.onchange = e => { OBS.people[e.target.dataset.p] = e.target.checked; };
  const LAY = { names: ['', 'Nomes dos locais'], houses: ['', 'Nomes das casas'], status: ['', 'Prédios por status'], alerts: ['!', 'Alertas no mapa'], trails: ['', 'Rastro e destino'], cargo: ['', 'Carga dos mensageiros'], gold: ['$', 'Ouro hoje por negócio'] };
  const fl = d.querySelector('#ob-fl'); fl.innerHTML = Object.entries(LAY).map(([k, [ic, n]]) => `<label><input type="checkbox" data-l="${k}" ${OBS.layers[k] ? 'checked' : ''}><span class="ic">${ic}</span>${n}</label>`).join('') + '<div style="color:var(--muted);font-size:11.5px;padding:4px">Produção de recursos por hora e mapa de calor chegam com o registro de dados (próxima etapa).</div>';
  fl.onchange = e => { OBS.layers[e.target.dataset.l] = e.target.checked; };
  const cv = d.querySelector('#ob-map'), tip = d.querySelector('#ob-tip');
  cv.onclick = e => { OBS.sel = obsPick(e); obsCard(); };
  cv.onmousemove = e => { const h = obsPick(e); if (!h) { tip.style.display = 'none'; return; } tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 10 + 'px'; tip.textContent = h.k === 'b' ? obsName(h.bi) : h.name; };
  cv.onmouseleave = () => tip.style.display = 'none';
  d.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) { OBS.sel = { k: 'b', bi: +g.dataset.goto }; obsTab('map'); obsCard(); }
    const tp = e.target.closest('[data-tp]'); if (tp) { const [kind, id] = tp.dataset.tp.split('|'); Net.send({ t: 'wv', a: 'act', op: 'tp', kind, id }); showToast('Teleportando…'); }
    const fo = e.target.closest('[data-fo]'); if (fo) { const [kind, id] = fo.dataset.fo.split('|'); if (typeof GM !== 'undefined') GM.follow = { kind, id }; obsToggle(false); showToast('Seguindo. Pare no painel do Tecelão (TAB).'); }
    const ef = e.target.closest('[data-ef]'); if (ef) { OBS.evf = ef.dataset.ef; obsEvents(); }
    const pf = e.target.closest('[data-pf]'); if (pf) { OBS.pf = pf.dataset.pf; obsPeople(); } });
  obsSegs(); obsTab(OBS.tab);
}
function obsSegs() { document.querySelectorAll('#ob-zoom [data-z]').forEach(b => b.classList.toggle('on', b.dataset.z === OBS.view)); }
function obsTab(t) { OBS.tab = t; document.querySelectorAll('#ob-tabs [data-ot]').forEach(b => b.classList.toggle('on', b.dataset.ot === t)); document.querySelectorAll('#obs .ob-view').forEach(v => v.classList.toggle('on', v.dataset.ov === t)); obsRender(); }
function obsToggle(on) {
  if (on == null) on = !OBS.on; if (on && !(G.dev || G.devTools)) { showToast('O Observatório é do modo Tecelão.'); return; }
  obsBuild(); OBS.on = on; document.getElementById('obs').classList.toggle('hidden', !on);
  if (on) { G.paused = true; G.keys.clear(); OBS.reqT = 0; obsReq(); Net.send({ t: 'menu', on: 1 }); requestAnimationFrame(obsLoop); }
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
function obsLoop() { if (!OBS.on) return; obsReq(); if (OBS.tab === 'map') obsDraw(performance.now()); requestAnimationFrame(obsLoop); }
// ---------- alertas (calculados com o retrato atual) ----------
function obsAlerts() {
  const D = OBS.data, A = []; if (!D) return A;
  for (const b of D.biz) { const [pid, name, kind, bi, owner, st, stock, td, wait, staff] = b;
    if (wait && wait[1] >= 2) A.push(['bad', `${name} esperando ${obsGood(wait[0])} há ${wait[1]} h do jogo`, `O pedido ainda não foi entregue. Confira se a oficina do mesmo dono tem ${obsGood(wait[0])} e se os mensageiros estão livres.`, bi]);
    if (st === 'bad' && td) A.push(['bad', `${name} com prejuízo hoje`, `Gastou ${td[1]} e vendeu ${td[0]}${td[2] ? ' (+' + td[2] + ' em mercadoria enviada)' : ''}.`, bi]);
    if (st === 'idle') A.push(['warn', `${name} fechado`, `O dono (${owner || '—'}) fechou o negócio.`, bi]);
    if (staff === 0 && kind === 'workshop' && owner) A.push(['warn', `${name} sem funcionário`, `Ninguém contratado: não produz nada sozinho.`, bi]); }
  const npcs = D.npcs; const down = npcs.filter(n => n[11] & 2 && !(n[11] & 4)), dead = npcs.filter(n => n[11] & 4);
  if (down.length) A.push(['bad', `${down.length} morador(es) caído(s)`, down.map(n => n[1].split(',')[0]).join(', '), npcs.find(n => n[11] & 2)[7]]);
  if (dead.length) A.push(['warn', `${dead.length} morador(es) morto(s)`, dead.map(n => n[1].split(',')[0]).join(', '), -1]);
  const hungry = npcs.filter(n => n[12] && n[12][0] < 20); if (hungry.length) A.push(['warn', `${hungry.length} morador(es) com fome`, hungry.slice(0, 6).map(n => n[1].split(',')[0]).join(', ') + (hungry.length > 6 ? '…' : ''), -1]);
  const tired = npcs.filter(n => n[12] && n[12][1] < 15); if (tired.length) A.push(['warn', `${tired.length} morador(es) exaustos`, tired.slice(0, 6).map(n => n[1].split(',')[0]).join(', '), -1]);
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
    <dl class="kv"><dt>Casa</dt><dd>${obsEsc(obsName(n[7]))}</dd><dt>Trabalho</dt><dd>${obsEsc(n[8] !== n[7] ? obsName(n[8]) : '—')}</dd><dt>Agora em</dt><dd>${obsEsc(obsName(WORLD.bld[tileAt(n[4], n[5])]) === '—' ? 'na rua' : obsName(WORLD.bld[tileAt(n[4], n[5])]))}</dd><dt>Indo para</dt><dd>${n[9] ? obsEsc(destB >= 0 ? obsName(destB) : 'rua') : '—'}</dd>${n[10] ? `<dt>Carregando</dt><dd>${obsEsc(Object.entries(n[10]).map(([g, q]) => q + ' ' + obsGood(g)).join(', '))}</dd>` : ''}</dl>
    <h3 style="margin-top:12px">Necessidades</h3>${nd ? `<div>Comida ${nd[0]}%</div>${bar(nd[0], 'var(--warn)')}<div>Descanso ${nd[1]}%</div>${bar(nd[1], '#7fb0e8')}<div>Convívio ${nd[2]}%</div>${bar(nd[2], '#e07ab8')}` : '<div style="color:var(--muted)">Sem rotina de necessidades (visitante, guarda ou funcionário).</div>'}
    <div style="color:var(--muted);font-size:12px;margin-top:6px">Humor e carteira chegam na etapa 3.</div>
    <div class="tools" style="margin-top:10px"><button class="btn" data-tp="n|${obsEsc(n[0])}">Teleportar até</button><button class="btn" data-fo="n|${obsEsc(n[0])}">Seguir no jogo</button></div>`;
}
// ---------- abas de lista ----------
function obsRender() {
  const D = OBS.data; if (!D || !OBS.on) return;
  const hh = Math.floor(D.hour), mm = Math.floor((D.hour - hh) * 60);
  document.getElementById('ob-clock').innerHTML = `<span>Dia <b>${D.day}</b> · <b>${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</b></span><span>Anfitrião <b>${obsEsc(D.host)}</b></span><span>Passo <b>${D.tech.tick} ms</b></span>`;
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
}
function obsPeople() {
  const D = OBS.data; if (!D) return; const rows = D.npcs.filter(n => OBS.pf === 'all' || obsRole(n) === OBS.pf);
  const tot = D.npcs.filter(n => !(n[11] & 4)).length;
  document.getElementById('ob-people').innerHTML = `<div class="tools"><div class="seg">${[['all', 'Todos'], ...Object.entries(OBS_ROLES).filter(([k]) => k !== 'ply').map(([k, v]) => [k, v[0]])].map(([k, n]) => `<button data-pf="${k}" class="${OBS.pf === k ? 'on' : ''}">${n}</button>`).join('')}</div><span style="color:var(--muted)">Total: <b style="color:#e6e2d8">${tot} NPCs</b> vivos${D.npcs.length > tot ? ' (+' + (D.npcs.length - tot) + ' mortos)' : ''} e ${D.players.length} jogador(es) online</span></div>
    <table><tr><th>Nome</th><th>Tipo</th><th>Fazendo</th><th>Casa</th><th>Trabalho</th><th>Agora em</th><th class="num">Comida</th><th class="num">Descanso</th><th class="num">Convívio</th></tr>${rows.map(n => `<tr class="click" data-sel="${obsEsc(n[0])}"><td>${obsEsc(n[1])}</td><td>${OBS_ROLES[obsRole(n)][0]}</td><td>${obsEsc(OBS_ACT[n[6]] || n[6] || '—')}${n[11] & 2 ? ' (caído)' : ''}</td><td>${obsEsc(obsName(n[7]))}</td><td>${obsEsc(n[8] !== n[7] ? obsName(n[8]) : '—')}</td><td>${obsEsc(obsName(WORLD.bld[tileAt(n[4], n[5])]))}</td><td class="num">${n[12] ? n[12][0] + '%' : '—'}</td><td class="num">${n[12] ? n[12][1] + '%' : '—'}</td><td class="num">${n[12] ? n[12][2] + '%' : '—'}</td></tr>`).join('')}</table>`;
  document.querySelectorAll('#ob-people [data-sel]').forEach(r => r.onclick = () => { OBS.sel = { k: 'n', id: r.dataset.sel }; obsTab('map'); });
}
function obsBiz() {
  const D = OBS.data; if (!D) return;
  document.getElementById('ob-biz').innerHTML = `<div class="tools"><span style="color:var(--muted)">Valores do dia atual do jogo. Negócios de NPC ainda sem contabilidade aparecem como “sem dados” (ganham contabilidade na próxima etapa). Clique para ver no mapa.</span></div>
    <table><tr><th>Negócio</th><th>Tipo</th><th>Dono</th><th>Status</th><th class="num">Estoque</th><th class="num">Funcionários</th><th class="num">Vendas</th><th class="num">Receita</th><th class="num">Enviado</th><th class="num">Custo</th><th class="num">Resultado</th><th class="num">Cofre</th><th>Esperando</th></tr>${D.biz.map(b => { const td = b[7], v = td ? td[0] + td[2] - td[1] : null; return `<tr class="click" data-goto="${b[3]}"><td>${obsEsc(b[1])}</td><td>${{ shop: 'Loja', workshop: 'Oficina' }[b[2]] || b[2]}</td><td>${obsEsc(b[4] || '—')}</td><td><span class="pill p-${b[5] || 'none'}">${b[5] ? OBS_STT[b[5]] : 'sem dados'}</span></td><td class="num">${b[6] ?? '—'}</td><td class="num">${b[9] ?? '—'}</td><td class="num">${td ? td[3] : '—'}</td><td class="num">${td ? '$ ' + td[0] : '—'}</td><td class="num">${td ? '$ ' + td[2] : '—'}</td><td class="num">${td ? '$ ' + td[1] : '—'}</td><td class="num" style="color:${v == null ? 'inherit' : v >= 0 ? 'var(--ok)' : 'var(--bad)'}">${v == null ? '—' : (v >= 0 ? '+' : '') + v}</td><td class="num">${b[10] != null ? '$ ' + b[10] : '—'}</td><td>${b[8] ? obsEsc(obsGood(b[8][0])) + ' · ' + b[8][1] + ' h' : '—'}</td></tr>`; }).join('')}</table>`;
}
function obsEvents() {
  const D = OBS.data; if (!D) return; const L = D.ev.slice().reverse().filter(e => OBS.evf === 'all' || obsEvCat(e[1]) === OBS.evf);
  const pc = { com: 'p-ok', del: 'p-warn', crime: 'p-bad', death: 'p-bad', vis: 'p-warn', mon: 'p-idle', other: 'p-idle' };
  document.getElementById('ob-events').innerHTML = `<div class="tools"><div class="seg">${Object.entries(OBS_EVC).map(([k, n]) => `<button data-ef="${k}" class="${OBS.evf === k ? 'on' : ''}">${n}</button>`).join('')}</div><span style="color:var(--muted)">Últimos ${D.ev.length} acontecimentos anunciados no reino</span></div>${L.length ? L.map(e => { const c = obsEvCat(e[1]), d = new Date(e[0]); return `<div class="ev"><span class="t">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span><span><span class="pill ${pc[c]}">${OBS_EVC[c]}</span></span><span>${obsEsc(e[1])}</span></div>`; }).join('') : '<div class="soon">Nada registrado nesta categoria ainda.</div>'}`;
}
function obsTech() {
  const D = OBS.data; if (!D) return; const T = D.tech, st = T.stalls;
  document.getElementById('ob-tech').innerHTML = `<h3>Servidor (computador do anfitrião: ${obsEsc(D.host)})</h3><div class="kpis"><div class="kpi"><div class="v">${T.tick} ms</div><div class="l">passo médio do servidor (ele roda 10 vezes por segundo)</div></div><div class="kpi"><div class="v">${T.max} ms</div><div class="l">passo mais lento recente</div></div><div class="kpi"><div class="v">${st.length}</div><div class="l">travadas acima de 1 s na última hora</div></div><div class="kpi"><div class="v">${T.npcN}</div><div class="l">NPCs simulados</div></div><div class="kpi"><div class="v">${T.mons}</div><div class="l">monstros no mundo</div></div></div>
    <h3 style="margin-top:14px">Jogadores conectados</h3><table><tr><th>Jogador</th><th class="num">Nível</th><th class="num">Ping</th><th class="num">Reconexões</th><th>Papel</th></tr>${D.players.map(p => `<tr><td>${obsEsc(p[1])}</td><td class="num">${p[4]}</td><td class="num">${p[8] ? 'local' : p[6] != null ? p[6] + ' ms' : '—'}</td><td class="num">${p[7]}</td><td>${p[8] ? '<span class="pill p-ok">anfitrião</span>' : '<span class="pill p-idle">jogador</span>'}</td></tr>`).join('')}</table>
    <h3 style="margin-top:14px">Travadas do servidor (última hora)</h3>${st.length ? '<table><tr><th>Quando</th><th class="num">Duração</th></tr>' + st.slice().reverse().map(q => { const d = new Date(q[0]); return `<tr><td>${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}</td><td class="num" style="color:${q[1] > 5000 ? 'var(--bad)' : 'var(--warn)'}">${(q[1] / 1000).toFixed(1)} s</td></tr>`; }).join('') + '</table>' : '<div style="color:var(--muted)">Nenhuma travada acima de 1 s. Ótimo.</div>'}
    <div style="color:var(--muted);font-size:12px;margin-top:10px">Dados enviados por segundo por jogador chegam na próxima etapa.</div>`;
}
