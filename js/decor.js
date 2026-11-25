// ============================================================
//  DECORAR A CASA — o dono de um imóvel comprado arruma os móveis,
//  compra mobília no catálogo do Borin, pinta paredes e troca o piso.
//  Os móveis que já vêm com a casa podem mudar de lugar ou ser guardados
//  (cama e baú da casa nunca saem). Conforto ajuda a dormir; prestígio
//  faz a cidade comentar. Interface em js/decor_ui.js.
// ============================================================

/* ---------- catálogo (preço, conforto, prestígio, categoria, assento) ---------- */
const DECO_CAT = {
  bed: { n: 'Cama', p: 60, c: 4, pr: 1, g: 'camas' }, platbed: { n: 'Cama de casal', p: 220, c: 8, pr: 5, g: 'camas' }, futon: { n: 'Futon', p: 45, c: 3, pr: 1, g: 'camas' }, divan: { n: 'Divã', p: 120, c: 4, pr: 4, g: 'camas', seat: 1 }, cot: { n: 'Catre', p: 20, c: 1, pr: 0, g: 'camas' },
  table: { n: 'Mesa', p: 30, c: 1, pr: 1, g: 'mesas' }, chair: { n: 'Cadeira', p: 12, c: 1, pr: 0, g: 'mesas', seat: 1 }, armchair: { n: 'Poltrona', p: 70, c: 4, pr: 3, g: 'mesas', seat: 1 }, desk: { n: 'Escrivaninha', p: 55, c: 1, pr: 2, g: 'mesas' }, chesstable: { n: 'Mesa de xadrez', p: 90, c: 2, pr: 4, g: 'mesas' }, cardtable: { n: 'Mesa de cartas', p: 80, c: 2, pr: 3, g: 'mesas' },
  chabudai: { n: 'Mesa baixa', p: 40, c: 1, pr: 2, g: 'mesas' }, zaisu: { n: 'Cadeira sem pernas', p: 25, c: 2, pr: 1, g: 'mesas', seat: 1 }, kotatsu: { n: 'Kotatsu', p: 110, c: 5, pr: 3, g: 'mesas' }, cushion: { n: 'Almofada', p: 10, c: 1, pr: 0, g: 'mesas', seat: 1 }, waitbench: { n: 'Banco', p: 20, c: 1, pr: 0, g: 'mesas', seat: 1 }, sewtable: { n: 'Mesa de costura', p: 50, c: 0, pr: 1, g: 'mesas' },
  chest: { n: 'Baú', p: 35, c: 0, pr: 0, g: 'guardar' }, shelf: { n: 'Estante', p: 30, c: 0, pr: 1, g: 'guardar' }, drawers: { n: 'Gaveteiro', p: 60, c: 0, pr: 2, g: 'guardar' }, tansu: { n: 'Cômoda tansu', p: 75, c: 0, pr: 3, g: 'guardar' }, bookwall: { n: 'Estante de livros', p: 90, c: 1, pr: 4, g: 'guardar' },
  barrel: { n: 'Barril', p: 8, c: 0, pr: 0, g: 'guardar' }, crate: { n: 'Caixote', p: 6, c: 0, pr: 0, g: 'guardar' }, baskets: { n: 'Cestos', p: 12, c: 0, pr: 0, g: 'guardar' }, clothrack: { n: 'Arara de roupas', p: 40, c: 0, pr: 1, g: 'guardar' }, display: { n: 'Vitrine', p: 65, c: 0, pr: 3, g: 'guardar' },
  fireplace: { n: 'Lareira', p: 180, c: 6, pr: 4, g: 'fogo' }, stove: { n: 'Fogão', p: 90, c: 2, pr: 1, g: 'fogo' }, brazier: { n: 'Braseiro', p: 50, c: 2, pr: 1, g: 'fogo' },
  candles: { n: 'Velas', p: 8, c: 1, pr: 0, g: 'luz' }, chandelier: { n: 'Lustre', p: 150, c: 2, pr: 6, g: 'luz' }, andon: { n: 'Lanterna andon', p: 30, c: 1, pr: 1, g: 'luz' }, redlantern: { n: 'Lanterna vermelha', p: 25, c: 1, pr: 1, g: 'luz' }, glow: { n: 'Luz colorida', p: 45, c: 0, pr: 2, g: 'luz' }, orb: { n: 'Orbe', p: 200, c: 0, pr: 6, g: 'luz' },
  rug: { n: 'Tapete', p: 25, c: 2, pr: 1, g: 'deco' }, nrug: { n: 'Tapete nobre', p: 120, c: 3, pr: 5, g: 'deco' }, kilim: { n: 'Tapete kilim', p: 90, c: 2, pr: 4, g: 'deco' }, starrug: { n: 'Tapete de estrelas', p: 250, c: 2, pr: 8, g: 'deco' }, tapestry: { n: 'Tapeçaria', p: 80, c: 0, pr: 4, g: 'deco' }, mirror: { n: 'Espelho', p: 70, c: 0, pr: 3, g: 'deco' },
  mapframe: { n: 'Mapa emoldurado', p: 60, c: 0, pr: 3, g: 'deco' }, kakejiku: { n: 'Pergaminho pendurado', p: 55, c: 0, pr: 3, g: 'deco' }, ikebana: { n: 'Ikebana', p: 35, c: 1, pr: 2, g: 'deco' }, byobu: { n: 'Biombo', p: 85, c: 0, pr: 4, g: 'deco' }, plantpot: { n: 'Vaso de planta', p: 15, c: 1, pr: 1, g: 'deco' }, planter: { n: 'Canteiro', p: 40, c: 1, pr: 2, g: 'deco' },
  clock: { n: 'Relógio', p: 120, c: 0, pr: 4, g: 'deco' }, telescope: { n: 'Luneta', p: 300, c: 0, pr: 7, g: 'deco' }, pillar: { n: 'Coluna', p: 160, c: 0, pr: 5, g: 'deco' }, zengarden: { n: 'Jardim zen', p: 260, c: 4, pr: 7, g: 'deco' }, gown: { n: 'Vestido de gala', p: 90, c: 0, pr: 3, g: 'deco' }, mannequin: { n: 'Manequim', p: 60, c: 0, pr: 2, g: 'deco' }, bottles: { n: 'Garrafas', p: 40, c: 0, pr: 1, g: 'deco' },
};
const DECO_GROUPS = [['camas', 'Camas'], ['mesas', 'Mesas e assentos'], ['guardar', 'Guardar'], ['fogo', 'Fogo'], ['luz', 'Luz'], ['deco', 'Decoração'], ['pint', 'Pintura e piso']];
const DECO_PAINT = { floor: { wood: ['Piso de madeira', 20], dwood: ['Piso de madeira escura', 30], plank: ['Tábua velha', 15], stone: ['Piso de pedra', 40], dstone: ['Pedra escura', 40], marble: ['Mármore', 120], tatami: ['Tatame', 45], dirt: ['Terra batida', 5] },
  wall: { plaster: ['Reboco claro', 15], brick: ['Tijolo à vista', 35], dbrick: ['Tijolo escuro', 35], stone: ['Pedra', 40], wood: ['Tábuas de madeira', 30], paper: ['Papel de parede', 50], marble: ['Mármore', 120], shoji: ['Papel de arroz', 40] } };
const DECO_FIXED = new Set(['bed', 'cot', 'futon', 'platbed', 'chest']);   /* da casa: mudam de lugar, mas não se guardam */
const DECO_KEEP = new Set(['stairup', 'stairdown', 'ladder', 'laddertop', 'spiral', 'spiraltop', 'lift', 'lifttop', 'clift', 'clifttop', 'extdoor', 'blk']);
const DECO_SIZE = { bed: [1, 2], platbed: [2, 2], futon: [1, 2], divan: [1, 2], cot: [1, 2], desk: [2, 1], chesstable: [1, 1], cardtable: [2, 2], bookwall: [1, 2], fireplace: [2, 1], chandelier: [1, 1], rug: [2, 1], nrug: [2, 2], kilim: [2, 2], starrug: [2, 2], byobu: [1, 1], zengarden: [2, 2], planter: [1, 3], pillar: [1, 1], display: [1, 1] };
const decoSz = t => DECO_SIZE[t] || [1, 1];
const decoName = t => (DECO_CAT[t] && DECO_CAT[t].n) || (typeof NAMES_DECO !== 'undefined' && NAMES_DECO[t]) || t;

/* ---------- área do imóvel ---------- */
function decoRegion(P) { if (!P || typeof BUILDINGS === 'undefined') return null;
  if (P.apt) { const A = APTS.find(a => a.key === P.apt); if (!A) return null; const b = BUILDINGS[A.bi], D = b && bDims(b); return { bi: A.bi, fls: [A.fl], u0: A.u0, u1: A.u1, v0: A.v0, v1: A.v1, whole: !!D && A.u0 === 0 && A.v0 === 0 && A.u1 >= D[0] && A.v1 >= D[1] }; }
  const b = BUILDINGS[P.bi]; if (!b) return null; const [A, D] = bDims(b), fls = []; for (let f = minFl(b); f < floorsOf(b); f++) fls.push(f); return { bi: P.bi, fls, u0: 0, u1: A, v0: 0, v1: D, whole: true }; }
const decoIn = (R, f) => f.i >= R.u0 && f.j >= R.v0 && f.i + (f.w || 1) <= R.u1 && f.j + (f.h || 1) <= R.v1;

/* ---------- o que está valendo em cada prédio (servidor e clientes) ---------- */
var DECO_RT = {};   /* bi → { fl: { pid, R, F, mat, ver } } */
function decoBi(b) { if (!b || typeof BUILDINGS === 'undefined') return -1; if (b.dbi != null && BUILDINGS[b.dbi] && BUILDINGS[b.dbi].name === b.name) return b.dbi; return BUILDINGS.indexOf(b); }
function decoKey(b, fl) { const bi = decoBi(b), D = bi >= 0 && DECO_RT && DECO_RT[bi] && DECO_RT[bi][fl]; return D ? 'D' + bi + '.' + D.ver : ''; }
function decoMat(b, fl, k) { const bi = decoBi(b), D = bi >= 0 && DECO_RT && DECO_RT[bi] && DECO_RT[bi][fl]; return D && D.mat && D.mat[k] || ''; }
function decoApply(b, fl, L) { const bi = decoBi(b), D = bi >= 0 && DECO_RT && DECO_RT[bi] && DECO_RT[bi][fl]; if (!D) return L;
  const keep = L.F.filter(f => !decoIn(D.R, f) || DECO_KEEP.has(f.t) || f.cab != null);
  return { F: keep.concat(D.F.map(q => { const o = Object.assign({}, q, { w: q.w || 1, h: q.h || 1, v: q.v || 0, block: !!q.b }); delete o.b; delete o.o; return o; })), npc: L.npc }; }
/* a planta original da área (sem a decoração), para o primeiro arranjo */
function decoBase(R, fl) { const b = BUILDINGS[R.bi]; return interiorLayout0(b, fl).F.filter(f => decoIn(R, f) && !DECO_KEEP.has(f.t) && f.cab == null).map(f => { const o = Object.assign({}, f, { o: 1 }); o.b = f.block ? 1 : undefined; delete o.block; if (!o.b) delete o.b; return o; }); }
function decoSet(pid, d) {   /* aplica (ou tira) a decoração de um imóvel e refaz o prédio */
  let bi = d ? d.bi : -1; if (!d) { for (const k in DECO_RT) for (const f in DECO_RT[k]) if (DECO_RT[k][f].pid === pid) { bi = +k; delete DECO_RT[k][f]; } }
  else { const R = d.R; DECO_RT[bi] = DECO_RT[bi] || {}; for (const f of Object.keys(DECO_RT[bi])) if (DECO_RT[bi][f].pid === pid) delete DECO_RT[bi][f]; for (const [fl, q] of Object.entries(d.fls)) DECO_RT[bi][fl] = { pid, R, F: q.F || [], mat: q.mat || {}, ver: d.ver || 1 }; }
  if (bi >= 0) decoRebuild(bi); }
/* refaz o prédio: memos, obstáculos do térreo e as listas (camas, baús, assentos, fogões) mantendo os índices */
function decoRebuild(bi) { const b = BUILDINGS[bi]; if (!b || typeof WORLD === 'undefined' || !WORLD.obj) return;
  LAYOUT_MEMO.clear(); for (let f = -3; f < 9; f++) { FLOOR_BLOCK.delete(bi * 8 + f + 1); IWALL_MEMO.delete(bi * 8 + f + 1); }
  const obj = WORLD.obj, idx = (x, y) => y * MAP_W + x;
  for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) { if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue; const i = idx(x, y); if (WORLD.bld[i] === bi && obj[i] === O.PART) obj[i] = 0; }
  const lists = [BEDS, CHESTS, WORLD.seats || [], KITCHENS, DUMMIES], lens = lists.map(L => L.length), old = lists.map(L => { const r = []; L.forEach((e, k) => { if (e && e.bi === bi && !e.cabK && (!e.apt || (L === BEDS && e.fl != null && DECO_RT[bi] && DECO_RT[bi][e.fl]))) r.push(k); }); return r; });   /* cama de apartamento decorado também é refeita */
  for (const f of interiorLayout(b, 0).F) { if (f.cab != null) continue; placeFurniture(b, bi, f, obj, WORLD.seats || [], idx); if (f.t === 'platbed' && DECO_RT[bi]) decoBed(b, bi, f, 0); }
  if (DECO_RT[bi]) for (let fl = 1; fl < floorsOf(b); fl++) if (DECO_RT[bi][fl]) { const D = DECO_RT[bi][fl], P = typeof PROPS_BY !== 'undefined' && PROPS_BY[D.pid], apt = P && P.apt; const L = interiorLayout(b, fl).F;
    for (const f of L) if ((f.t === 'bed' || f.t === 'cot' || f.t === 'futon' || f.t === 'platbed') && (!apt || decoIn(D.R, f))) decoBed(b, bi, f, fl, apt);
    if (apt && typeof APT_CHESTS !== 'undefined') { const ch = L.filter(f => decoIn(D.R, f) && (f.t === 'chest' || f.t === 'suitechest' || f.t === 'tansu')); APT_CHESTS.forEach(c => { if (c.apt === apt && c.bi === bi && ch.length) { const f = ch.shift(), [x, y] = bLocal(b, f.i, f.j); c.x = x; c.y = y; } }); } }   /* camas dos andares de cima servem para dormir; o baú do apartamento acompanha */
  lists.forEach((L, li) => { const add = L.splice(lens[li]); old[li].forEach((k, n) => { L[k] = add[n] || { x: -9999, y: -9999, dx: 0, dy: 1, bi, off: 1 }; }); for (let n = old[li].length; n < add.length; n++) L.push(add[n]); });
  if (typeof G !== 'undefined' && G.me && typeof invalidateInterior === 'function') invalidateInterior(bi); }
function decoBed(b, bi, f, fl, apt) { const cx = f.i + f.w / 2, [x0, y0] = localToWorld(b, cx, f.j + 0.3), [x1, y1] = localToWorld(b, cx, f.j + f.h - 0.3); const e = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, dx: x1 - x0, dy: y1 - y0, bi }; if (fl) e.fl = fl; if (apt) e.apt = apt; BEDS.push(e); }
/* conforto e prestígio do arranjo */
function decoScore(fls) { let c = 0, pr = 0; for (const q of Object.values(fls || {})) for (const f of q.F || []) { const T = DECO_CAT[f.t]; if (T) { c += T.c || 0; pr += T.pr || 0; } } for (const q of Object.values(fls || {})) { const m = q.mat || {}; if (m.floor === 'marble') pr += 3; if (m.wall === 'marble') pr += 3; if (m.wall === 'paper') pr += 1; } return { c, pr }; }
const DECO_TIERS = [[0, 'simples'], [10, 'aconchegante'], [25, 'bem arrumada'], [45, 'elegante'], [70, 'luxuosa'], [100, 'digna de um nobre']];
const decoTier = pr => { let t = DECO_TIERS[0][1]; for (const [n, s] of DECO_TIERS) if (pr >= n) t = s; return t; };
/* caminho livre: da porta (ou da escada) até toda casa livre da área; degraus passam, móveis sólidos não */
function decoCheck(R, fl, F) { const b = BUILDINGS[R.bi], [A, D] = bDims(b), K = (i, j) => i + ',' + j, base = interiorLayout0(b, fl).F.filter(f => !decoIn(R, f) || DECO_KEEP.has(f.t) || f.cab != null), solid = new Set(), stc = new Set(), probs = [];
  const all = base.concat(F.map(q => Object.assign({}, q, { block: !!q.b })));
  const occ = {}; for (const f of all) { const sol = (f.block && FURN_SOLID.has(f.t)) || f.t === 'iwall' || f.t === 'blk'; for (let a = 0; a < (f.w || 1); a++) for (let c = 0; c < (f.h || 1); c++) { const k = K(f.i + a, f.j + c); if (sol) solid.add(k); if (DECO_KEEP.has(f.t) && f.t !== 'blk') stc.add(k); if (sol && !DECO_KEEP.has(f.t)) (occ[k] = occ[k] || []).push(f.t); } }
  for (const q of F) { if (!decoIn(R, q)) probs.push(decoName(q.t) + ' passa da parede'); for (let a = 0; a < (q.w || 1); a++) for (let c = 0; c < (q.h || 1); c++) if (stc.has(K(q.i + a, q.j + c))) { probs.push(decoName(q.t) + ' em cima da escada'); a = 99; break; } }
  for (const [k, ts] of Object.entries(occ)) if (ts.length > 1) { probs.push(ts.map(decoName).join(' e ') + ' no mesmo lugar'); break; }
  const iw = typeof iwallsLocal === 'function' ? iwallsLocal(b, fl) || [] : [], wallE = new Set();
  for (const [u0, v0, u1, v1] of iw) { if (Math.abs(u0 - u1) < 0.01) { for (let v = Math.floor(Math.min(v0, v1) + 0.01); v < Math.max(v0, v1) - 0.01; v++) wallE.add('u' + Math.round(u0) + ',' + v); } else for (let u = Math.floor(Math.min(u0, u1) + 0.01); u < Math.max(u0, u1) - 0.01; u++) wallE.add('v' + Math.round(v0) + ',' + u); }
  const cross = (i, j, ni, nj) => ni !== i ? wallE.has('u' + Math.max(i, ni) + ',' + j) : wallE.has('v' + Math.max(j, nj) + ',' + i);
  const starts = []; if (fl === 0) { starts.push([doorCol(b), D - 1]); if (b.door2L) starts.push([b.door2L[0], b.door2L[1]]); } else if (fl > minFl(b)) { const s = stairSpec(b, fl - 1); if (s && s.arrive) starts.push(s.arrive); } else { const s = stairSpec(b, fl); if (s && s.entry) starts.push(s.entry); }
  if (b.deco === 'machiya' && fl > 0) for (let i = 0; i < A; i++) starts.push([i, D - 1]);
  const ok = (i, j) => i >= 0 && j >= 0 && i < A && j < D && !solid.has(K(i, j)) && (!b.round || Math.hypot(i + 0.5 - A / 2, j + 0.5 - D / 2) <= A / 2 - 0.15);
  const seen = new Set(), q = starts.filter(p => ok(p[0], p[1])); q.forEach(p => seen.add(K(p[0], p[1])));
  if (!q.length && starts.length) probs.push(fl === 0 ? 'A porta está tapada' : 'A chegada da escada está tapada');
  while (q.length) { const [i, j] = q.shift(); for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + c; if (!ok(ni, nj) || seen.has(K(ni, nj)) || cross(i, j, ni, nj)) continue; seen.add(K(ni, nj)); q.push([ni, nj]); } }
  const bad = []; for (let j = R.v0; j < R.v1; j++) for (let i = R.u0; i < R.u1; i++) if (ok(i, j) && !stc.has(K(i, j)) && !seen.has(K(i, j))) bad.push([i, j]);
  if (bad.length) probs.push(bad.length + (bad.length > 1 ? ' casas ficaram sem caminho' : ' casa ficou sem caminho'));
  return { probs, bad }; }

/* ---------- servidor ---------- */
function decoEst() { const E = estateLoad(); E.deco = E.deco || {}; E.mob = E.mob || {}; return E; }
function decoPub(pid, D) { return D ? { bi: D.bi, R: D.R, fls: D.fls, ver: D.ver } : null; }
function decoMine(p) { const E = decoEst(), k = estOwner(p); return Object.keys(E.r || {}).filter(pid => { const r = E.r[pid], P = PROPS_BY[pid]; return r && r.owner === k && r.mode === 'own' && P && P.kind === 'house' && decoRegion(P); }); }
function decoSend(p) { const E = decoEst(), k = estOwner(p); Net.toOne(p.id, { t: 'decost', mob: E.mob[k] || {}, props: decoMine(p).map(pid => { const P = PROPS_BY[pid], R = decoRegion(P), D = E.deco[pid]; return { pid, name: P.name, R, deco: D ? decoPub(pid, D) : null, store: D ? D.store || [] : [] }; }) }); }
function decoNearBorin(p) { const n = S.npcs && S.npcs.merchant; return !!n && (p.fl || 0) === (n.fl || 0) && dist(p.x, p.y, n.x, n.y) < 4.5; }
const decoCount = (L, pred) => { const c = {}; for (const q of L) if (!pred || pred(q)) c[q.t] = (c[q.t] || 0) + 1; return c; };
function decoMsg(p, m) { const E = decoEst(), k = estOwner(p), a = m.a;
  if (a === 'dcopen') { decoSend(p); return true; }
  if (a === 'dcbuy') { if (!decoNearBorin(p)) { tell(p, 'O catálogo de móveis fica com o Borin, no Empório.'); return true; } const key = String(m.k || ''); let price = 0, nm = '';
    if (DECO_CAT[key]) { price = DECO_CAT[key].p; nm = DECO_CAT[key].n; } else { const [z, kind, v] = key.split(':'); const P0 = z === 'paint' && DECO_PAINT[kind] && DECO_PAINT[kind][v]; if (!P0) return true; price = P0[1]; nm = P0[0] + (kind === 'floor' ? ' (piso para um andar)' : ' (paredes de um andar)'); }
    const n = Math.max(1, Math.min(10, m.n | 0 || 1)), cost = price * n; if (!canPay(p, cost)) { tell(p, 'Você precisa de ' + cost + ' de ouro (banco + bolsa).'); return true; }
    payCity(p, cost); const M = E.mob[k] = E.mob[k] || {}; M[key] = (M[key] || 0) + n; estateSave(); sendStat(p); tell(p, 'Borin: — ' + (n > 1 ? n + '× ' : '') + nm + ', entregue na sua mobília. É só arrumar em casa!'); decoSend(p); return true; }
  if (a === 'dcsave') { const pid = String(m.pid || ''), P = PROPS_BY[pid], r = E.r && E.r[pid];
    if (!P || !r || r.owner !== k || r.mode !== 'own') { tell(p, 'Só dá para decorar um imóvel comprado por você.'); return true; }
    const R = decoRegion(P), b = BUILDINGS[R.bi], cur = E.deco[pid], fls = {}, oldPlaced = [];
    for (const fl of R.fls) { const q = cur && cur.fls[fl]; for (const f of q ? q.F : decoBase(R, fl)) oldPlaced.push(f); }
    const oldStore = cur ? (cur.store || []) : [], M = Object.assign({}, E.mob[k] || {});
    const newPlaced = [];
    for (const fl of R.fls) { const src = m.fls && m.fls[fl]; const F = (src && Array.isArray(src.F) ? src.F : (cur && cur.fls[fl] ? cur.fls[fl].F : decoBase(R, fl))).slice(0, 200).map(q => { const t = String(q.t), o = q.o ? 1 : 0, T = DECO_CAT[t], sz = [Math.max(1, Math.min(8, q.w | 0)), Math.max(1, Math.min(8, q.h | 0))];
        const f = { t, i: q.i | 0, j: q.j | 0, w: sz[0], h: sz[1] }; if (q.v) f.v = (q.v | 0) & 3; if (o) { f.o = 1; for (const x of ['seat', 'dorm', 'wp', 'ox']) if (q[x] != null) f[x] = q[x]; if (q.b) f.b = 1; } else { if (T && T.seat) f.seat = f.v | 0; if (FURN_SOLID.has(t)) f.b = 1; } return f; });
      let mat = (src && src.mat) || (cur && cur.fls[fl] && cur.fls[fl].mat) || {}; mat = { floor: DECO_PAINT.floor[mat.floor] ? mat.floor : '', wall: DECO_PAINT.wall[mat.wall] ? mat.wall : '' };
      if (!R.whole) mat = { floor: '', wall: '' };
      const old = (cur && cur.fls[fl] && cur.fls[fl].mat) || {}; for (const kind of ['floor', 'wall']) if (mat[kind] && mat[kind] !== old[kind]) { const pk = 'paint:' + kind + ':' + mat[kind]; if (!(M[pk] > 0)) { tell(p, 'Para trocar ' + (kind === 'floor' ? 'o piso' : 'as paredes') + ' compre ' + DECO_PAINT[kind][mat[kind]][0] + ' no Borin.'); return true; } M[pk]--; if (!M[pk]) delete M[pk]; }
      const chk = decoCheck(R, fl, F); if (chk.probs.length) { tell(p, 'Não deu para salvar (' + (fl === 0 ? 'térreo' : fl + 'º andar') + '): ' + chk.probs.slice(0, 2).join('; ') + '.'); Net.toOne(p.id, { t: 'decobad', fl, probs: chk.probs, bad: chk.bad }); return true; }
      fls[fl] = { F, mat }; newPlaced.push(...F); }
    /* contas: originais (o) vêm do que já estava + guardados; comprados vêm do que já estava + mobília */
    const oO = decoCount(oldPlaced.concat(oldStore), q => q.o), oB = decoCount(oldPlaced, q => !q.o), nO = decoCount(newPlaced, q => q.o), nB = decoCount(newPlaced, q => !q.o);
    for (const t in nO) if (nO[t] > (oO[t] || 0)) { tell(p, 'Móvel da casa a mais: ' + decoName(t) + '.'); return true; }
    for (const t in nB) if (nB[t] > (oB[t] || 0) + (M[t] || 0)) { tell(p, 'Você não tem ' + decoName(t) + ' na mobília.'); return true; }
    for (const t of DECO_FIXED) { const was = decoCount(oldPlaced.concat(oldStore), q => q.o && q.t === t)[t] || 0; if ((nO[t] || 0) < was) { tell(p, 'A ' + decoName(t).toLowerCase() + ' que veio com a casa não pode ser guardada: só mudar de lugar.'); return true; } }
    for (const t of new Set([...Object.keys(oB), ...Object.keys(nB)])) { const left = (oB[t] || 0) + (M[t] || 0) - (nB[t] || 0); if (left > 0) M[t] = left; else delete M[t]; }
    const store = []; const pool = oldPlaced.concat(oldStore).filter(q => q.o), need = Object.assign({}, nO); for (const q of pool) { if (need[q.t] > 0) { need[q.t]--; continue; } store.push(q); }
    for (const pl of Object.values(S.players)) if (pl.sleep != null && BEDS[pl.sleep] && BEDS[pl.sleep].bi === R.bi) pl.sleep = null;   /* quem dormia numa cama que pode ter mudado acorda */
    E.deco[pid] = { owner: k, ownerName: p.name, bi: R.bi, R, fls, store, ver: ((cur && cur.ver) || 0) + 1 }; E.mob[k] = M; estateSave();
    const pub = decoPub(pid, E.deco[pid]); decoSet(pid, pub); Net.toAll({ t: 'deco', pid, d: pub });
    const sc = decoScore(fls); tell(p, 'Casa arrumada! Conforto ' + sc.c + ' · prestígio ' + sc.pr + ' (' + decoTier(sc.pr) + ').'); decoSend(p); return true; }
  if (a === 'dcreset') { const pid = String(m.pid || ''), r = E.r && E.r[pid], D = E.deco[pid]; if (!D || !r || r.owner !== k) return true; decoUndo(pid, D); tell(p, 'A casa voltou ao arranjo original; os móveis comprados voltaram para a sua mobília.'); decoSend(p); return true; }
  return false; }
function decoUndo(pid, D) { const E = decoEst(), M = E.mob[D.owner] = E.mob[D.owner] || {}; for (const q of Object.values(D.fls)) for (const f of q.F) if (!f.o) M[f.t] = (M[f.t] || 0) + 1; delete E.deco[pid]; estateSave(); decoSet(pid, null); Net.toAll({ t: 'deco', pid, d: null }); }
/* vendeu, perdeu ou deixou de ser dono: a casa volta ao original e a mobília comprada volta para quem decorou */
function decoTick() { if (typeof S === 'undefined' || !S.estate) return; const E = decoEst(); for (const pid of Object.keys(E.deco)) { const D = E.deco[pid], r = E.r && E.r[pid]; if (!r || r.mode !== 'own' || r.owner !== D.owner) decoUndo(pid, D); }
  /* visitas: quem entra numa casa decorada de outra pessoa ouve o comentário */
  for (const pl of Object.values(S.players)) { const bi = (pl.fl || 0) ? pl.fb : bldAt(pl.x, pl.y); if (bi === pl.dcLastB) continue; pl.dcLastB = bi; if (bi == null || bi < 0) continue;
    for (const pid of Object.keys(E.deco)) { const D = E.deco[pid]; if (D.bi !== bi || D.owner === estOwner(pl)) continue; const sc = decoScore(D.fls); if (sc.pr >= 10) tell(pl, 'Casa de ' + D.ownerName + ': ' + decoTier(sc.pr) + '. ' + decoRemark(D, sc)); break; } } }
function decoRemark(D, sc) { const all = Object.values(D.fls).flatMap(q => q.F.filter(f => !f.o)).map(f => f.t), top = all.sort((a, b) => ((DECO_CAT[b] || {}).pr || 0) - ((DECO_CAT[a] || {}).pr || 0))[0];
  return top ? 'Repare n' + (decoName(top).match(/^[AEIOUÁÉ]/i) || decoName(top).endsWith('a') ? 'a ' : 'o ') + decoName(top).toLowerCase() + '!' : 'Bem cuidada.'; }
/* reputação: uma vez por dia, uma casa bonita faz a cidade falar bem do dono */
function decoDaily(p) { const E = decoEst(), k = estOwner(p); E.dcRep = E.dcRep || {}; if (E.dcRep[k] === estDay() || p.dcDay === estDay()) return; p.dcDay = estDay(); let best = 0; for (const pid of decoMine(p)) { const D = E.deco[pid]; if (D) best = Math.max(best, decoScore(D.fls).pr); } const n = best >= 70 ? 3 : best >= 45 ? 2 : best >= 25 ? 1 : 0; if (n && typeof repAdd === 'function') { E.dcRep[k] = estDay(); estateSave(); repAdd(p, 'cidade', n, 'casa ' + decoTier(best)); tell(p, 'A cidade comenta sobre a sua casa ' + decoTier(best) + ' (+' + n + ' de reputação).'); } }
if (typeof phMsg === 'function') { const _phDC = phMsg; phMsg = function (p, m) { if (m && typeof m.a === 'string' && m.a.startsWith('dc') && decoMsg(p, m)) return; return _phDC(p, m); }; }
if (typeof housesTick === 'function') { const _htDC = housesTick; housesTick = function (now) { _htDC(now); try { if (!S.dcBoot) { S.dcBoot = 1; decoBoot(); } if (!S.dcT || now - S.dcT > 3000) { S.dcT = now; decoTick(); for (const pl of Object.values(S.players)) decoDaily(pl); } } catch (e) { console.warn('decor', e); } }; }
/* quem entra no reino recebe as casas decoradas */
if (typeof hostOnClient === 'function') { const _hoDC = hostOnClient; hostOnClient = function (from, m) { const r = _hoDC.apply(this, arguments); try { if (m && m.t === 'hello' && S.players[from]) { const E = decoEst(), d = {}; for (const pid in E.deco) d[pid] = decoPub(pid, E.deco[pid]); Net.toOne(from, { t: 'decoall', d }); } } catch (e) { } return r; }; }
/* conforto: dormir na própria casa decorada rende mais tempo de Bem descansado (até +5 min) */
function decoComfortOf(p) { const E = decoEst(); let c = 0; for (const pid of decoMine(p)) { const D = E.deco[pid]; if (D) c = Math.max(c, decoScore(D.fls).c); } return c; }
if (typeof empSlept === 'function') { const _esDC = empSlept; empSlept = function (p) { const ms = _esDC.apply(this, arguments); try { return ms + Math.min(300000, Math.floor(decoComfortOf(p) / 8) * 60000); } catch (e) { return ms; } }; }
/* o anfitrião aplica as decorações guardadas quando o mundo abre */
function decoBoot() { try { const E = decoEst(); for (const pid in E.deco) decoSet(pid, decoPub(pid, E.deco[pid])); } catch (e) { console.warn('decor boot', e); } }

/* ---------- cliente: recebe e aplica ---------- */
if (typeof progEvent === 'function') { const _peDC = progEvent; progEvent = function (m, now) {
  if (m.t === 'decoall') { for (const pid in m.d) decoSet(pid, m.d[pid]); return true; }
  if (m.t === 'deco') { decoSet(m.pid, m.d); return true; }
  if (m.t === 'decost') { G.dcSt = m; if (typeof dcUiUpdate === 'function') dcUiUpdate(); return true; }
  if (m.t === 'decobad') { if (typeof dcUiBad === 'function') dcUiBad(m); return true; }
  return _peDC(m, now); }; }

