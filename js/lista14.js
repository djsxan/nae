// ============================================================
//  LISTA 14 (27/11)
//  · Corpos de monstro amontoados não pesam no servidor: a lista só vai quando muda (server.js) e os saqueados viram
//    só desenho no jogo de quem está perto (somem do servidor depois de 3 minutos, ou antes se houver mais de 150).
//  · Imobiliária: casas e negócios com cores diferentes no mapa e na lista.
//  · Danças: o corpo passeia um pouco em volta do lugar (passo para o lado e volta), nunca parado no mesmo ponto.
//  · Passeio com a doméstica: senta ao seu lado quando você senta, comenta o lugar, cumprimenta os outros, aponta,
//    e mostra que está feliz.
// ============================================================
const L14 = { decalAfter: 180000, cap: 150, decalMs: 1200000, maxDecals: 150, drift: [0.2, 0.08], driftMs: 4200 };

// ---------------- SERVIDOR ----------------
function l14CorpseTick(now) { const C = S.corpses; if (!C) return; const all = Object.values(C); for (const c of all) if (c.looted && !c.lootT) c.lootT = now;
  const free = all.filter(c => c.looted && !c.onBack && !c.dragBy).sort((a, b) => (a.lootT || 0) - (b.lootT || 0)); let over = Math.max(0, all.length - L14.cap);
  for (const c of free) { if (!(now - c.lootT > L14.decalAfter || over > 0)) continue; over--;
    near(c.x, c.y, { t: 'cdecal', row: [c.id, MON_TYPES.indexOf(c.type), Math.round(c.x * 100), Math.round(c.y * 100), c.z || 0, 1, Math.round((c.ix || 0) * 10), Math.round((c.iy || 0) * 10), c.lost || 0, 0], ms: Math.min(L14.decalMs, Math.max(60000, (c.until || now) - now)) }); delete C[c.id]; } }
/* passeio: senta perto, conversa com o lugar e com as pessoas */
const L14_PLACE = { tavern: ['Adoro o cheiro de pão e cerveja daqui.', 'Olha só quanta gente!', 'Será que o taverneiro conta uma história hoje?'], baths: ['Que água quentinha... dá para ver o vapor.', 'Nunca tinha entrado nas Termas!', 'Que lugar mais calmo.'],
  club: ['Nossa, que elegância.', 'Esses dados fazem um barulho bom.', 'Será que você ganha hoje?'], velvet: ['Que luzes bonitas...', 'Olha o palco!', 'Nunca imaginei vir aqui com você.'], market: ['Quanta coisa para ver!', 'Aquela fruta parece ótima.'], temple: ['Que silêncio bonito.', 'Vou acender uma vela depois.'], out: ['Que dia bom para passear.', 'Gosto de andar com você.', 'Olha aquilo ali!', 'A cidade fica linda assim.'] };
function l14Free(s, n) { for (const p of Object.values(S.players)) if ((p.fl || 0) === (s.fl || 0) && Math.hypot(p.x - s.x, p.y - s.y) < 0.25) return false; for (const q of Object.values(S.npcs)) if (q !== n && !q.dead && (q.fl || 0) === (s.fl || 0) && Math.hypot(q.x - s.x, q.y - s.y) < 0.25) return false; return true; }
function l14SeatNear(q, n) { let best = null, bd = 2.6; for (const s of WORLD.seats) { if ((s.fl || 0) !== (q.fl || 0)) continue; const d = Math.hypot(s.x - q.x, s.y - q.y); if (d < 0.2 || d >= bd) continue; if (!l14Free(s, n)) continue; bd = d; best = s; } return best; }
function l14Stroll(n, r, q, now, dt) { const L = r.stroll, same = (q.fl || 0) === (n.fl || 0);
  if (q.sit && same) { if (!L.seat || !l14Free(L.seat, n) && !(n.sitting && Math.hypot(n.x - L.seat.x, n.y - L.seat.y) < 0.05)) L.seat = l14SeatNear(q, n);
    if (L.seat) { const s = L.seat, d = Math.hypot(n.x - s.x, n.y - s.y); if (d > 0.08 && !n.sitting) { empGo(n, { x: s.x, y: s.y, fl: s.fl || 0, fb: (s.fl || 0) ? q.fb : -1 }, 1.3, dt); return true; }
      if (!n.sitting) { n.x = s.x; n.y = s.y; n.walk = false; n.walking = false; n.sitting = true; n.dir = s.dir; empSay(n, ['Que lugar gostoso.', 'Ah, que bom sentar um pouco.', 'Daqui dá para ver tudo.'][Math.floor(Math.random() * 3)]); } l14Chat(n, r, q, now); return true; } }
  if (n.sitting && (!q.sit || !same)) { n.sitting = false; L.seat = null; }
  if (!n.walk || Math.hypot(n.x - q.x, n.y - q.y) < 2) l14Chat(n, r, q, now); return false; }
function l14Chat(n, r, q, now) { const L = r.stroll; if (now < (L.chatT || 0)) return; L.chatT = now + 14000 + Math.random() * 16000; const bi = WORLD.bld[tileAt(q.x, q.y)], b = bi >= 0 ? BUILDINGS[bi] : null, kind = b ? (b.kind === 'shop' || b.kind === 'fruithouse' ? 'market' : b.kind) : 'out';
  const roll = Math.random(), other = Object.values(S.npcs).find(o => o !== n && !o.dead && !o.downed && o.name && (o.fl || 0) === (n.fl || 0) && Math.hypot(o.x - n.x, o.y - n.y) < 4);
  if (roll < 0.3 && other) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'salute', tx: other.x, ty: other.y, ms: 1600 }); empSay(n, ['Boa noite, ' + other.name.split(/[ ,]/)[0] + '!', 'Oi! Tudo bem?', 'Que bom te ver por aqui.'][Math.floor(Math.random() * 3)]);
    if (Math.random() < 0.6 && typeof empSay === 'function') setTimeout(() => { if (S.npcs[other.id]) empSay(other, ['Boa noite!', 'Olá, moça!', 'Passeando, é?'][Math.floor(Math.random() * 3)]); }, 1400); return; }   /* cumprimenta quem está perto */
  if (roll < 0.5) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'point', tx: n.x + (Math.random() - 0.5) * 6, ty: n.y + (Math.random() - 0.5) * 6, ms: 1800 }); empSay(n, (L14_PLACE[kind] || L14_PLACE.out)[Math.floor(Math.random() * (L14_PLACE[kind] || L14_PLACE.out).length)]); return; }   /* aponta para o que viu */
  if (roll < 0.75) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: n.sitting ? 'talk' : 'cheer', txt: '😊', tx: q.x, ty: q.y, ms: 1800 }); empSay(n, ['Obrigada por me trazer!', 'Estou adorando o passeio.', 'Hoje está sendo um dia ótimo.', 'Que bom sair um pouco de casa.'][Math.floor(Math.random() * 4)]); return; }   /* feliz */
  near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: '♥', ms: 1600 }); empSay(n, (L14_PLACE[kind] || L14_PLACE.out)[Math.floor(Math.random() * (L14_PLACE[kind] || L14_PLACE.out).length)]); }
if (typeof empNpcTick === 'function' && typeof S !== 'undefined') { const _enL14 = empNpcTick; empNpcTick = function (n, now, dt) { const r = S.estate && S.estate.emp && S.estate.emp[n.emp];
  if (r && r.stroll) { const q = S.players[r.stroll.by]; if (q) { try { if (l14Stroll(n, r, q, now, dt)) return; } catch (e) { console.warn('passeio', e); } } } else if (n.sitting && r && !r.stroll && n._l14sat) { n.sitting = false; }
  if (r && r.stroll && n.sitting) n._l14sat = 1; return _enL14.apply(this, arguments); }; }
if (typeof affTick === 'function' && typeof S !== 'undefined') { const _atL14 = affTick; affTick = function (now) { _atL14(now); try { if (now - (S.l14T || 0) > 5000) { S.l14T = now; l14CorpseTick(now); } } catch (e) { console.warn('lista14', e); } }; }

// ---------------- CLIENTE ----------------
/* corpos que viraram desenho: ficam no chão só no seu jogo */
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peL14 = progEvent; progEvent = function (m, now) { if (m.t === 'cdecal' && m.row) { const c = m.row, d = { id: c[0], type: MON_TYPES[c[1]], x: c[2] / 100, y: c[3] / 100, z: c[4], looted: true, ix: c[6] / 10, iy: c[7] / 10, lost: c[8] || 0, onBack: null, decal: 1, until: performance.now() + (m.ms || 600000) };
  G.corpseDecals = (G.corpseDecals || []).filter(q => q.id !== d.id); G.corpseDecals.push(d); if (G.corpseDecals.length > L14.maxDecals) G.corpseDecals.shift(); G.corpses = (G.corpses || []).filter(q => q.id !== d.id).concat([d]); return true; } return _peL14(m, now); }; }
/* imobiliária: negócios com outra paleta */
const EST_COL_BIZ = { free: '#3fb4c8', mine: '#f09a3a', rent: '#5e6a80' };
function l14EstCol(P, k) { return P && typeof isBizP === 'function' && isBizP(P) && EST_COL_BIZ[k] ? EST_COL_BIZ[k] : EST_COL[k]; }
if (typeof estBldColor === 'function' && typeof G !== 'undefined') { const _ebL14 = estBldColor; estBldColor = function (b, bi) { const c = _ebL14.apply(this, arguments); try { const P = PROPS.find(q => q.bi === bi); if (P && isBizP(P)) { const k = estStatus(P).k; if (EST_COL_BIZ[k] && c === EST_COL[k]) return EST_COL_BIZ[k]; } } catch (e) { } return c; }; }
if (typeof estRender === 'function' && typeof G !== 'undefined') { const _erL14 = estRender; estRender = function () { _erL14.apply(this, arguments); try {
  const lg = document.querySelector('#estate .est-legend'); if (lg && !lg.dataset.l14) { lg.dataset.l14 = 1; const sw = (c, t) => '<span><i style="background:' + c + '"></i>' + t + '</span>';
    lg.innerHTML = '<div class="l14-lg"><b>Casas</b> ' + sw(EST_COL.free, 'Livre') + sw(EST_COL.mine, 'Sua') + sw(EST_COL.rent, 'De outro jogador') + sw(EST_COL.ten, 'Morador') + '</div><div class="l14-lg"><b>Negócios</b> ' + sw(EST_COL_BIZ.free, 'Livre') + sw(EST_COL_BIZ.mine, 'Seu') + sw(EST_COL_BIZ.rent, 'De outro jogador') + sw(EST_COL.npc, 'Comerciante') + '</div><div class="l14-lg">' + sw(EST_COL.office, 'Imobiliária') + '</div>'; }
  for (const row of document.querySelectorAll('#estate .est-row[data-pid]')) { const P = PROPS_BY[row.dataset.pid], i = row.querySelector('i'); if (P && i) i.style.background = l14EstCol(P, estStatus(P).k); } } catch (e) { } }; }
if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = '.l14-lg{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:2px 0}.l14-lg b{font-size:11px;opacity:.8;margin-right:2px}'; document.head.appendChild(st); }
/* danças: um passeio leve em volta do lugar (só no desenho) */
function l14Drift(id, now) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0; const T = L14.driftMs * (0.85 + (Math.abs(h) % 30) / 100), a = (now / T) * Math.PI * 2 + (Math.abs(h) % 628) / 100;
  const dx = L14.drift[0] * Math.sin(a), dy = L14.drift[1] * Math.sin(a * 2 + 1); return { x: (dx - dy) * HTW, y: (dx + dy) * HTH }; }   /* um oito no chão: passo para o lado, volta, e um pouco para a frente e para trás */
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhL14 = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) {
  try { if (e && !e.walking && !e.sit && !e.custP) { let on = false; if (e.isNpc) { const d = G.npcDz && G.npcDz[e.id]; on = !!(d && !(d.ch === 'barra' || d.step === 'barra') && !(typeof G.vlLap !== 'undefined' && G.vlLap && Object.values(G.vlLap).some(L => L.g === e.id))); } else on = !!(G.plDz && G.plDz[e.id]);
    if (on) { const o = l14Drift(e.id, performance.now()); sx += o.x; sy += o.y; } } } catch (er) { }
  return _dhL14.call(this, ctx, e, sx, sy, now); }; }
