// ============================================================
//  BISCATES DE PLEBEU (lista 15, 28/11): trabalhos novos no quadro de avisos, para quem acabou de chegar.
//  · Sacos no porto: do barco (ponta do cais) para os caixotes da margem, 3 viagens.
//  · Limpar o estábulo: 4 baias do Estábulo para limpar.
//  · Colheita nos olivais: 4 oliveiras e o cesto entregue no Empório.
//  · Levar um recado: de uma casa da cidade (castelo, catedral, casarões) para outra, e voltar com a resposta.
//  O plebeu vê os quatro no quadro; quem já tem guilda vê dois por vez.
// ============================================================
const BSC = { types: ['sacks', 'stable', 'olives', 'errand'] };
// ---------------- SERVIDOR ----------------
function bscSpots() { if (S.bscSp) return S.bscSp; const sp = S.bscSp = {};
  /* cais: primeiro trecho de ponte de madeira ao sul da muralha, na coluna do meio */
  for (let y = 236; y < MAP_H - 2; y++) if (WORLD.ground[y * MAP_W + CENTER] === T.BRIDGE) { let y1 = y; while (y1 < MAP_H - 2 && WORLD.ground[(y1 + 1) * MAP_W + CENTER] === T.BRIDGE) y1++; if (y1 - y >= 6) { sp.dock = [CENTER + 0.5, y1 - 0.5]; sp.shore = [CENTER - 2.5, y - 0.5]; break; } }
  /* oliveiras mais perto da cidade, com chão livre ao lado */
  const ol = []; for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (WORLD.obj[y * MAP_W + x] === O.OLIVE) { const d = dist(x, y, CENTER, CENTER); if (d < 120) ol.push([x, y, d]); }
  ol.sort((a, b) => a[2] - b[2]); sp.olives = []; for (const [x, y] of ol) { for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const tx = x + dx, ty = y + dy; if (walkableTile(tx, ty, 0)) { sp.olives.push([tx + 0.5, ty + 0.5]); break; } } if (sp.olives.length >= 16) break; }
  const st = BUILDINGS.findIndex(b => b.kind === 'stable'); sp.stableBi = st; sp.stable = st >= 0 ? bldFreeTiles(st).map(([x, y]) => [x + 0.5, y + 0.5]) : [];
  return sp; }
const bscPick = (a, n) => { const c = a.slice(), o = []; while (c.length && o.length < n) o.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return o; };
if (typeof jobOffer === 'function' && typeof S !== 'undefined') { const _joB = jobOffer; jobOffer = function (type, p) { if (!BSC.types.includes(type)) { const r = _joB.apply(this, arguments); if (r) { const fx = t => String(t).split('fruithouse').join('Casa da Fruteira'); r.title = fx(r.title); for (const st of r.steps || []) st.t = fx(st.t); } return r; }   /* a entrega mostrava "fruithouse" */
  const sp = bscSpots(), lv = k => profLv((p.prof || {})[k]), L = lv('biscateiro'), emp = doorOutPt(1);
  if (type === 'sacks' && sp.dock) return { type, title: 'Sacos de grão no porto', giver: 'Teodoro', prof: 'biscateiro', pay: 22 + L, xp: 24, carry: 1, steps: [0, 1, 2].flatMap(() => [{ x: sp.dock[0], y: sp.dock[1], k: 'pick', t: 'Pegar um saco no barco (ponta do cais)' }, { x: sp.shore[0], y: sp.shore[1], k: 'drop', t: 'Empilhar junto aos caixotes da margem' }]) };
  if (type === 'stable' && sp.stable.length) return { type, title: 'Limpar as baias do Estábulo', giver: 'Joana', prof: 'biscateiro', pay: 14 + L, xp: 16, steps: bscPick(sp.stable, 4).map(([x, y]) => ({ x, y, k: 'sweep', t: 'Limpar esta baia (palha suja fora, palha nova dentro)' })) };
  if (type === 'olives' && sp.olives.length >= 4) { const tr = bscPick(sp.olives.slice(0, 10), 4); return { type, title: 'Colheita nos olivais', giver: 'Olavo', prof: 'biscateiro', pay: 18 + L, xp: 20, steps: tr.map(([x, y]) => ({ x, y, k: 'gather', t: 'Colher as azeitonas desta oliveira' })).concat([{ x: emp[0], y: emp[1], k: 'drop', t: 'Entregar o cesto no Empório' }]) }; }
  if (type === 'errand') { const pl = BUILDINGS.map((b, bi) => ({ b, bi })).filter(o => ['manor', 'castle', 'temple', 'barracks', 'bank', 'kguard'].includes(o.b.kind)); if (pl.length < 2) return null; const [A, B] = bscPick(pl, 2), d = Math.round(dist(A.b.x, A.b.y, B.b.x, B.b.y)), nm = o => o.b.name || o.b.kind;
    return { type, title: 'Recado: ' + nm(A) + ' → ' + nm(B), giver: 'Pip', prof: 'mensageiro', pay: 10 + Math.round(d / 2) + lv('mensageiro') * 2, xp: 12 + Math.round(d / 2), steps: [{ x: doorOutPt(A.bi)[0], y: doorOutPt(A.bi)[1], k: 'talk', t: 'Ouvir o recado em ' + nm(A) }, { x: doorOutPt(B.bi)[0], y: doorOutPt(B.bi)[1], k: 'talk', t: 'Dar o recado em ' + nm(B) }, { x: doorOutPt(A.bi)[0], y: doorOutPt(A.bi)[1], k: 'talk', t: 'Voltar com a resposta a ' + nm(A) }] }; }
  return null; }; }
if (typeof jobMsg === 'function' && typeof S !== 'undefined') { const _jmB = jobMsg; jobMsg = function (p, m) {
  if (m && m.a === 'board') { const extra = p.voc === 0 ? BSC.types : bscPick(BSC.types, 2), offers = ['water', 'crates', 'sweep', 'delivery'].concat(extra).map(t => jobOffer(t, p)).filter(Boolean); p.jobOffers = offers;
    Net.toOne(p.id, { t: 'jobs', offers: offers.map(o => ({ title: o.title, giver: o.giver, pay: o.pay, prof: o.prof, n: o.steps.length })), job: p.job ? jobView(p) : null, prof: p.prof || {} }); return; }
  if (m && m.a === 'step' && p.job) { const st = p.job.steps[p.job.i]; if (st && dist(p.x, p.y, st.x, st.y) <= 1.8) { if (st.k === 'gather') near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'gather', ms: 1400 }); if (st.k === 'talk') near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'talk', ms: 1200 }); if (st.k === 'pick' && p.job.type === 'sacks') sfx(p.x, p.y, 'Uff!', '#d8c8a0', 0); } }
  return _jmB.apply(this, arguments); }; }
