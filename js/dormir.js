// ============================================================
//  3.5: CASAS E CAMAS DOS NPCs FIXOS
//  às 22h quem não tinha casa vai para a cama que a planta deu (subindo a escada se for em cima)
//  e às 6h volta ao posto; os sentinelas revezam (metade dorme 22h–2h, a outra 2h–6h)
// ============================================================
const DORM_BEDT = ['bed', 'cot', 'bunk', 'futon', 'platbed'];
const _dormSlots = {};
function dormSlots(bi, fl, onlyDorm) {   /* lugares de dormir de um andar: cada cama um lugar, beliche dois */
  const key = bi + '|' + fl + '|' + (onlyDorm ? 1 : 0); if (_dormSlots[key]) return _dormSlots[key];
  const b = BUILDINGS[bi], out = []; if (!b) return out;
  for (const f of interiorLayout(b, fl).F) { if (!DORM_BEDT.includes(f.t) || (onlyDorm && !f.dorm)) continue;
    const [px, py] = bLocal(b, f.i + ((f.w || 1) - 1) / 2, f.j), [fx, fy] = bLocal(b, f.i + ((f.w || 1) - 1) / 2, f.j + (f.h || 1) - 1), x = (px + fx) / 2, y = (py + fy) / 2;
    out.push({ x, y, dir: dirFromVecS(fx - px, fy - py) }); if (f.t === 'bunk') out.push({ x: x + 0.12, y: y + 0.12, dir: dirFromVecS(fx - px, fy - py), up: 1 }); }
  return (_dormSlots[key] = out);
}
/* a planta aprovada: quem dorme onde (prédio, andar, só as camas novas?) */
function dormPlan() {
  if (S.dormPlan) return S.dormPlan; const P = {}, put = (ids, bi, fl, only) => ids.forEach(id => { P[id] = { bi, fl, only: !!only }; });
  put(['captain', 'guard1', 'guard2', 'guard3', 'guard4', 'guard5', 'guard6', 'guard7'], 4, 0); put(['guard8', 'guard9', 'guard10', 'guard11', 'guard12'], 4, 1);
  put(['banker', 'banker2', 'banker3', 'banker4', 'banker5', 'banker6', 'bankporter'], 11, 1);
  put(['jailer', 'executioner'], 12, 0, true); put(['fruit'], 14, 0);
  put(['noble1', 'gardener'], 15, 0); put(['noble2'], 39, 0);
  put(['agent', 'cand1'], 17, 0); put(['cand2', 'cand3', 'cand4'], 17, 1); put(['supplier'], 17, 2);
  put(['priest'], 21, 0); put(['smith', 'st_bakery'], 22, 0); put(['tailor'], 25, 0); put(['tattooist'], 61, 0);   /* vila romana (28/11): a tatuadora mora na 4ª casa */
  put(['merchant'], 1, 1); put(['innkeeper', 'tavmaid'], 3, 1); put(['st_witch'], 19, 1); put(['broker'], 24, 1);
  put(['st_dojo'], 36, 0, true); put(['hotelkeeper'], 35, 0, true); put(['st_wheat'], 40, 0, true); put(['st_mill'], 41, 0, true);
  /* lugar de cada um: a ordem da lista dentro do mesmo andar */
  const seen = {}; for (const id of Object.keys(P)) { const q = P[id], k = q.bi + '|' + q.fl + '|' + q.only; q.k = seen[k] = seen[k] == null ? 0 : seen[k] + 1; }
  return (S.dormPlan = P);
}
function dormSlotOf(id) { if (id === 'st_dojo') { const P = PROPS.find(x => x.apt === '201'), E = S.estate && S.estate.r; if (P && E && !E[P.id]) { const B = BEDS.find(b => b.apt === '201'); if (B) return { x: B.x, y: B.y, dir: dirFromVecS(B.dx || 0, B.dy || 1), bi: P.bi, fl: B.fl }; } }   /* Tetsuo dorme no Apto 201; alugado por um jogador, volta ao catre do dojô */
  const q = dormPlan()[id]; if (!q) return null; const L = dormSlots(q.bi, q.fl, q.only), s = L[Math.min(q.k, L.length - 1)]; return s ? { ...s, bi: q.bi, fl: q.fl } : null; }
function dormNight(n, hr) { if (/^guard\d+$/.test(n.id)) { const k = +n.id.slice(5); return k <= 6 ? (hr >= 22 || hr < 2) : (hr >= 2 && hr < 6); } return hr >= 22 || hr < 6; }
function dormBusy(n) { if (n.dead || n.downed || n.dragBy || n.gripBy || n.onBackBy) return true; if (S.exec) return true; if (n.arrest || n.aggro || n.fight || n.threat || n.chaseNpc || n.goFetch) return true;
  if (n.id === 'priest' && S.estate && typeof mrRec === 'function') { const now = now_(); if (Object.values(mrRec().eng || {}).some(E => E && E.st && now - E.st < 600000)) return true; }
  return false; }
function dormStairIn(bi) { const b = BUILDINGS[bi]; try { const e = stairSpec(b, 0).entry; return bLocal(b, e[0], e[1]); } catch (er) { return doorTile(b); } }
/* a rotina da noite; devolve true enquanto cuida do NPC (indo, dormindo ou voltando) */
function dormTick(n, now, dt) {
  const S0 = dormSlotOf(n.id); if (!S0) return false; const st = n.dormSt; if (!st && dormBusy(n)) return false;
  const hr = resHour(), night = dormNight(n, hr);
  if (!st) { if (!night) return false; n.dormPost = [n.x, n.y]; n.dormSt = 'go'; n.sitting = false; const tgt = S0.fl ? dormStairIn(S0.bi) : [S0.x, S0.y]; n.dormPath = planRoute(n, tgt[0], tgt[1]); }
  if (n.dormSt === 'go') {
    if (!night) { n.dormSt = 'back'; n.dormPath = planRoute(n, n.dormPost[0], n.dormPost[1]); return true; }
    const P = n.dormPath; if (P && P.length) { const [wx, wy] = P[0]; if (npcWalk(n, wx, wy, 1.1, dt) || dist(n.x, n.y, wx, wy) < 0.45) P.shift(); return true; }
    if (S0.fl) { n.fl = S0.fl; n.fb = S0.bi; }   /* subiu a escada */
    n.x = S0.x; n.y = S0.y; n.dir = S0.dir; n.walk = false; n.sleeping = true; n.dormSt = 'sleep'; return true; }
  if (n.dormSt === 'sleep') {
    if (night) { if (dist(n.x, n.y, S0.x, S0.y) > 1 && !(n.fl || 0) === !S0.fl) { n.x = S0.x; n.y = S0.y; } n.sleeping = true; n.walk = false; return true; }
    n.sleeping = false; if (n.fl) { const [sx, sy] = dormStairIn(S0.bi); n.fl = 0; n.fb = -1; n.x = sx; n.y = sy; }   /* desceu a escada */
    n.dormSt = 'back'; n.dormPath = planRoute(n, n.dormPost[0], n.dormPost[1]); return true; }
  if (n.dormSt === 'back') { const P = n.dormPath; if (P && P.length) { const [wx, wy] = P[0]; if (npcWalk(n, wx, wy, 1.1, dt) || dist(n.x, n.y, wx, wy) < 0.45) P.shift(); return true; }
    n.x = n.dormPost[0]; n.y = n.dormPost[1]; n.dormSt = null; n.dormPath = null; n.walk = false; return false; }
  return false;
}
/* moradores (rotina casa/trabalho): cada um deita numa cama da casa, em vez de num canto */
if (typeof resHomeSpot === 'function') { const _rhD = resHomeSpot; resHomeSpot = function (n, bi) { try { const L = dormSlots(bi, 0, false); if (L.length) { const mates = Object.values(S.npcs).filter(o => o.home === bi).map(o => o.id).sort(), k = Math.max(0, mates.indexOf(n.id)); if (k < L.length) return [L[k].x, L[k].y]; } } catch (e) { } return _rhD(n, bi); }; }
