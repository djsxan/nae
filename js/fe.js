// ============================================================
//  FÉ (pedido de 26/11): presença na Catedral da Aurora aumenta a reputação do jogador com a Fé.
//  Missa da manhã (8h–9h, com o sermão da Irmã Lúmina): +4. Rezar sentado nos bancos da Catedral fora da missa:
//  +0,5 por minuto, até +3 por dia.
// ============================================================
const FE = { mass: 4, prayMs: 60000, pray: 0.5, prayMax: 3 };
if (typeof REP_G !== 'undefined') REP_G.fe = 'Fé (Catedral da Aurora)';

// ---------------- SERVIDOR ----------------
if (typeof massSermon === 'function') { const _msF = massSermon; massSermon = function () { const tb = templeBi(), I = infRec(), d = estDay(), go = [];
  for (const q of Object.values(S.players)) { if (WORLD.bld[tileAt(q.x, q.y)] !== tb || (q.fl || 0)) continue; const k = estOwner(q); if (I.done[k] && I.done[k].mass === d) continue; go.push(q); }
  _msF(); for (const q of go) repAdd(q, 'fe', FE.mass, 'assistiu à missa da Irmã Lúmina'); }; }
function feTick(now) { const tb = typeof templeBi === 'function' ? templeBi() : -1; if (tb < 0) return; const hh = empHour(), mass = hh >= MASS_H0 - 0.4 && hh < MASS_H1, d = estDay();
  for (const p of Object.values(S.players)) { if (!p.sit || (p.fl || 0) || WORLD.bld[tileAt(p.x, p.y)] !== tb || mass) { p.feT = 0; continue; }
    const st = (WORLD.seats || []).some(s => s.bi === tb && Math.abs(s.x - p.x) < 0.06 && Math.abs(s.y - p.y) < 0.06); if (!st) { p.feT = 0; continue; }
    const R = p.feRec && p.feRec.d === d ? p.feRec : (p.feRec = { d, n: 0 }); if (R.n >= FE.prayMax) continue; if (!p.feT) { p.feT = now; continue; }
    if (now - p.feT >= FE.prayMs) { p.feT = now; R.n = Math.min(FE.prayMax, R.n + FE.pray); repAdd(p, 'fe', FE.pray, R.n >= FE.prayMax ? 'rezou na Catedral (o máximo de hoje)' : 'rezou na Catedral'); } } }
if (typeof infTick === 'function') { const _itF = infTick; infTick = function (now) { _itF(now); if (now - (S.feT || 0) < 5000) return; S.feT = now; try { feTick(now); } catch (e) { console.warn('fe', e); } }; }
