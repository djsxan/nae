// ============================================================
//  PARTE Q, ETAPA 2: cores dos nobres. Cada nobre de uma casa veste as cores dela, mas com tom e detalhes
//  próprios (sorteados pelo id de cada um, sempre iguais para a mesma pessoa): o tecido um pouco mais claro
//  ou mais escuro, o acabamento dourado, prateado ou na segunda cor da casa, gola, diadema e capa. Os
//  guardas das casas já vestem a armadura e as cores da casa; aqui eles ganham só a segunda cor na gola.
// ============================================================
function corShift(hex, k) { const h = String(hex || '#888888').replace('#', ''); if (h.length !== 6) return hex; const n = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)), f = v => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return '#' + n.map(v => f(v).toString(16).padStart(2, '0')).join(''); }
function corSat(hex) { const h = String(hex || '').replace('#', ''); if (h.length !== 6) return 1; const n = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(...n), mn = Math.min(...n); return mx ? (mx - mn) / mx : 0; }   /* casas de cor apagada (cinza) variam mais no tom */
const COR_METAL = { ouro: '#d8b45a', prata: '#c8ccd2' };
function corHouseOf(kind) { const m = /^hh_(lord|spouse|heir|young|child|guard)_(.+)$/.exec(kind || ''); return m ? { role: m[1], h: (typeof HOUSE_BY !== 'undefined' && HOUSE_BY[m[2]]) || null } : null; }
function corVary(L, kind, nid) { const H = corHouseOf(kind); if (!H || !H.h || !H.h.c1 || typeof tone !== 'function') return L; const h = H.h, R = typeof npcSeedRng === 'function' ? npcSeedRng(npcSeedOf(kind + '|' + (nid || '') + '|cor')) : Math.random, r = []; for (let i = 0; i < 8; i++) r.push(R());
  if (H.role === 'guard') { L.collar = h.c2; return L; }
  const sat = corSat(h.c1), s = (r[0] - 0.5) * (sat < 0.2 ? 0.7 : 0.36), c1 = corShift(h.c1, s), c2 = corShift(h.c2, (r[1] - 0.5) * 0.3), main = H.role === 'spouse' && r[2] < 0.5 ? c2 : c1, sec = main === c1 ? c2 : c1;
  L.body = tone(main); L.body2 = tone(corShift(sec, -0.15));
  const metal = r[3] < 0.4 ? COR_METAL.ouro : r[3] < 0.75 ? COR_METAL.prata : h.c2; L.trim = tone(metal); L.accent = tone(r[4] < 0.5 ? metal : corShift(h.c2, 0.1));
  L.collar = r[5] < 0.3 ? null : r[5] < 0.6 ? corShift(h.c2, 0.15) : r[5] < 0.8 ? '#e8e2d0' : corShift(h.c1, -0.35);
  if (H.role === 'lord' || H.role === 'spouse') { if (r[6] < (H.role === 'lord' ? 0.55 : 0.35) && (!L.head || L.head === 'none')) L.head = 'circlet'; }
  if (H.role === 'heir' || H.role === 'young') { L.cape = r[6] < 0.7; if (L.cape) L.capeTone = tone(r[7] < 0.5 ? c1 : corShift(c2, -0.2)); }
  else if (L.cape) L.capeTone = tone(corShift(main, -0.12 + r[7] * 0.1));
  return L; }
if (typeof npcLookOf === 'function') { const _nlCor = npcLookOf; npcLookOf = function (kind, nid) { const L = _nlCor(kind, nid); try { return corVary(L, kind, nid); } catch (e) { return L; } }; }
