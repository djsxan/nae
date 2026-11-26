// ============================================================
//  TERMAS COMO O DOJÔ (pedido de 26/11): sentar na beira das piscinas (pernas na água), emojis na água
//  (cachimbo e brinde também), vinho com bandeja e garrafa na beira e a taça na mão aos goles, e afeto
//  na água (o afeto já reconhece as piscinas: afeto2.js, affB).
// ============================================================
const TH2 = { cup: 4, sipMs: 30000, firstMs: 5000, inset: 0.18, trayMs: 160000 };

// ---------------- SERVIDOR ----------------
/* ponto da beira mais perto, um pouco para dentro da piscina, de frente para a água */
function thRim(p) { const bi = thermaeBi(), b = BUILDINGS[bi], q = b && thermaePoolAt(p.x, p.y); if (!q) return null; const [u, v] = worldToLocal(b, p.x, p.y);
  const side = [['u0', u - q.u0], ['u1', q.u1 - u], ['v0', v - q.v0], ['v1', q.v1 - v]].sort((x, y) => x[1] - y[1])[0][0];
  let ru = clamp(u, q.u0 + 0.4, q.u1 - 0.4), rv = clamp(v, q.v0 + 0.4, q.v1 - 0.4); if (side === 'u0') ru = q.u0 + TH2.inset; if (side === 'u1') ru = q.u1 - TH2.inset; if (side === 'v0') rv = q.v0 + TH2.inset; if (side === 'v1') rv = q.v1 - TH2.inset;
  const [x, y] = localToWorld(b, ru, rv), [cx, cy] = localToWorld(b, side === 'u0' ? ru + 1 : side === 'u1' ? ru - 1 : ru, side === 'v0' ? rv + 1 : side === 'v1' ? rv - 1 : rv); return { x, y, dir: dirFromVecS(cx - x, cy - y) }; }
if (typeof thAct === 'function') { const _taT2 = thAct; thAct = function (p, m) {
  if (m && m.a === 'cup') { const C = p.thCup; if (!C || !p.thSit) return; C.hand = C.hand ? 0 : 1; C.next = now_() + (C.hand ? 9000 : 1e12); near(p.x, p.y, { t: 'bdrink', id: p.id, left: C.left, tray: 1, wine: 1, hand: C.hand }); tell(p, C.hand ? 'Você pega a taça de vinho.' : 'Você devolve a taça à bandeja.'); return; }
  if (m && m.a === 'edge') { const P = (p.fl || 0) === 0 && !p.downed ? thermaePoolAt(p.x, p.y) : null; if (!P) { tell(p, 'Entre na piscina e chegue perto da beira.'); return; } if (!thPass(p)) { tell(p, 'Pague a entrada com a Lívia primeiro.'); return; }
    const E = thRim(p); if (!E) return; if (Object.values(S.players).some(o => o !== p && o.thSit && o.thSit.mode === 'edge' && dist(o.x, o.y, E.x, E.y) < 0.5)) { tell(p, 'Esse lugar na beira está ocupado.'); return; }
    p.x = E.x; p.y = E.y; p.dir = E.dir; Net.toOne(p.id, { t: 'tp', x: p.x, y: p.y, z: 0, fl: 0, fb: -1 }); p.thSit = { mode: 'edge' }; p.sit = 'g'; p.walking = false; if (p.atk) p.atk = null;
    near(p.x, p.y, { t: 'bath', id: p.id, on: 1, x: p.x, y: p.y, mode: 'edge', dir: p.dir }); tell(p, 'Você senta na beira, com as pernas na água.'); return; }
  return _taT2(p, m); }; }
/* o vinho chega: bandeja com a garrafa na beira e a taça; você bebe aos goles */
function thTrayPos(p) { const b = BUILDINGS[thermaeBi()], q = b && thermaePoolAt(p.x, p.y); if (!q) return null; const [u, v] = worldToLocal(b, p.x, p.y), side = [['u0', u - q.u0], ['u1', q.u1 - u], ['v0', v - q.v0], ['v1', q.v1 - v]].sort((x, y) => x[1] - y[1])[0][0];
  let tu = clamp(u, q.u0 + 0.3, q.u1 - 0.3), tv = clamp(v, q.v0 + 0.3, q.v1 - 0.3); if (side === 'u0') tu = q.u0 - 0.28; if (side === 'u1') tu = q.u1 + 0.28; if (side === 'v0') tv = q.v0 - 0.28; if (side === 'v1') tv = q.v1 + 0.28; return localToWorld(b, tu, tv); }
thWineGive = function (p, now) { p.thWine = 0; p.thCup = { left: TH2.cup, next: now + TH2.firstMs, hand: 0 };
  const T = thTrayPos(p); if (T) near(T[0], T[1], { t: 'pzfx', k: 'tray', x: T[0], y: T[1], ms: TH2.trayMs });
  near(p.x, p.y, { t: 'bdrink', id: p.id, left: TH2.cup, tray: 1, wine: 1, hand: 0 }); tell(p, 'O Nico deixou a garrafa e a taça na beira, ao seu lado. Aperte F para pegar a taça; com ela na mão, 🍻 na roda bebe um gole.'); };
function thSip(p, now) { const C = p.thCup; if (!C || C.left <= 0) return; C.left--; C.next = now + TH2.sipMs;
  p.food = Math.min(100, (p.food ?? 100) + 6); p.water = Math.min(100, (p.water ?? 100) + 5); p.buffs.warm = Math.max(p.buffs.warm || 0, now + 300000); p.buffs.tipsy = Math.max(p.buffs.tipsy || 0, now) + 15000; p.cst = Math.min(cstMaxOf(p), (p.cst ?? 0) + 15);
  near(p.x, p.y, { t: 'bdrink', id: p.id, left: C.left, sip: 1, wine: 1, hand: C.hand ? 1 : 0 }); if (!C.left) { C.endT = now + 7000; tell(p, 'A taça e a garrafa ficaram vazias.'); } sendStat(p); }
function thToast(p) { const C = p.thCup; if (C && C.left > 0 && !C.hand) { tell(p, 'Pegue a taça primeiro (F na piscina).'); return; } if (C && C.left > 0) { thSip(p, now_()); return; } tell(p, 'Peça vinho e frutas ao Nico (menu da piscina, F).'); }
function thCupTick(now) { for (const p of Object.values(S.players)) { const C = p.thCup; if (!C) continue;
  if (!p.thSit) { p.thCup = null; near(p.x, p.y, { t: 'bdrink', id: p.id, off: 1 }); continue; }
  if (C.left > 0 && C.hand && now >= C.next) thSip(p, now); else if (!C.left && now >= (C.endT || 0)) { p.thCup = null; near(p.x, p.y, { t: 'bdrink', id: p.id, off: 1 }); } } }
if (typeof prazTick === 'function') { const _ptT2 = prazTick; prazTick = function (now) { _ptT2(now); try { thCupTick(now); } catch (e) { console.warn('termas2', e); } }; }

// ---------------- CLIENTE ----------------
if (typeof progEvent === 'function') { const _peT2 = progEvent; progEvent = function (m, now) { if (m.t === 'bdrink' && !m.off && typeof G !== 'undefined' && G.players) { const e = G.players[m.id]; if (e) { e.bdrink = e.bdrink || {}; if (m.hand != null) e.bdrink.hand = !!m.hand; if (m.wine) e.bdrink.wine = 1; } } return _peT2(m, now); }; }
if (typeof bathGest === 'function') { const _bgT2 = bathGest; bathGest = function (e, now) { const g = _bgT2(e, now); if (g) return g; return e && e.bdrink && e.bdrink.hand && e.bdrink.left > 0 ? { k: 'hold', f: 0, t: 0 } : null; }; }
if (typeof gestArm === 'function') { const _gaT2 = gestArm; gestArm = function (g) { if (g && g.k === 'hold') return { aB: [1.15, 0.7, 1.4], cup: 1 }; return _gaT2(g); }; }
/* nas piscinas das Termas a água está sempre cheia (a beira usa o nível da água) */
if (typeof tubLvC === 'function') { const _tlT2 = tubLvC; tubLvC = function (bi) { if (typeof G !== 'undefined' && G._thb) return 1; return _tlT2(bi); }; }
/* menu da piscina: sentar no banco, na beira, boiar, vinho */
if (typeof prazPoolMenu === 'function') prazPoolMenu = function () { const me = G.me, q = thermaePoolAt(me.x, me.y); if (!q) return; if (me.bathing) { const D = me.bdrink; if (D && D.wine && D.left > 0) { prazPanel('Na água', 'A garrafa e a taça estão na beira, ao seu lado.', [['cup', D.hand ? 'Devolver a taça' : 'Pegar a taça', D.hand ? 'deixa na bandeja' : 'com ela na mão, 🍻 bebe um gole'], ['stand', 'Levantar', 'sair da água']]); return; } Net.send({ t: 'praz', a: 'stand' }); return; }
  const nm = { hot: 'Piscina quente', sky: 'Piscina do pátio', cold: 'Tanque frio' }[q.k], btns = [['sit', 'Sentar no banco', 'com a água no peito; a água rende mais'], ['edge', 'Sentar na beira', 'na borda mais perto, com as pernas na água']];
  if (q.k === 'sky') btns.push(['float', 'Boiar', 'de costas, sem pressa; 20 s deixam você descansado']); btns.push(['wine', 'Pedir vinho e frutas', TH_WINE + ' de ouro; o Nico deixa a garrafa e a taça na beira']);
  prazPanel(nm, q.k === 'cold' ? 'Fique de pé debaixo da cascata por 6 s para soltar o corpo.' : 'Andar ou apertar F de novo faz você se levantar. Na água, a roda de emojis tem brinde (bebe um gole), cachimbo e o 💞 Afeto.', btns); };
