// ============================================================
//  COROA: quem morre fica morto (lista 5). A princesa e a rainha-mãe morriam em luta
//  sem registro e voltavam; o cônjuge real (casado com um jogador) continuava vivo no
//  casarão mesmo depois de morrer no castelo ou de virar rainha.
// ============================================================
function c2Rec() { const U = sucRec(); if (U.alive.queen == null) U.alive.queen = 1; return U; }
function c2Queen(cause) { const U = c2Rec(); if (!U.alive.queen) return; U.alive.queen = 0; const i = COURT.findIndex(d => d.id === 'k_queen'); if (i >= 0) COURT.splice(i, 1); const n = S.npcs.k_queen; if (n && !n.dead) visGone(n);
  hNews('A Rainha Isolda Aurenfell morreu (' + cause + ').'); sys('Notícia: a Rainha Isolda morreu (' + cause + ').'); estateSave(); }
/* o cônjuge de um jogador que é da família real: a pessoa é a mesma */
function c2RoyalOf(M) { return M && M.kind === 'npc' && M.who ? (M.who.id === 'r:lyra' ? 'lyra' : M.who.id === 'r:alaric' ? 'alaric' : null) : null; }
if (typeof npcDie === 'function') { const _ndC2 = npcDie; npcDie = function (n, p) { _ndC2(n, p); try { if (!S.estate) return; const U = c2Rec(), cause = p ? 'morta em combate por ' + p.name : 'morta em combate';
  if (n.id === 'k_princess' && U.alive.lyra && U.king !== 'lyra') trKill('lyra', cause);
  else if (n.id === 'k_queen') c2Queen(p ? 'morta por ' + p.name : 'morta em combate');
  else if (n.court === 'spouse' && n.mrKey) { const M = mrRec().m[n.mrKey], who = c2RoyalOf(M); if (who === 'lyra' && U.alive.lyra) trKill('lyra', cause); else if (who === 'alaric' && U.alive.alaric) trKill('alaric', cause.replace('morta', 'morto')); if (M) M.dead = 1; } } catch (e) { console.warn('coroa2', e); } }; }
/* quem morreu não volta à corte; a rainha vira rainha-mãe quando o rei muda */
if (typeof courtSpawn === 'function') { const _csC2 = courtSpawn; courtSpawn = function (def) { try { if (S.estate && def) { const U = c2Rec();
  if (def.id === 'k_queen') { if (!U.alive.queen) return null; if (U.king !== 'edric' && !/Mãe/.test(def.name)) def.name = 'Isolda Aurenfell, a Rainha-Mãe'; }
  if (def.id === 'k_princess' && !U.alive.lyra) return null; if (def.id === 'k_prince' && !U.alive.alaric) return null; } } catch (e) { } return _csC2(def); }; }
/* cônjuge real morto (ou no trono): sai do casarão de quem casou com ele */
function c2Spouses() { const U = c2Rec(), R = mrRec(); for (const key of Object.keys(R.m)) { const M = R.m[key], who = c2RoyalOf(M); if (!who || M.dead) continue;
  const gone = !U.alive[who], throne = U.king === who; if (!gone && !throne) continue; const n = S.npcs[mrSpouseId(key)]; if (n) visGone(n);
  if (gone) { M.dead = 1; const p = Object.values(S.players).find(o => estOwner(o) === key); if (p) tell(p, (who === 'lyra' ? 'A Princesa Lyra' : 'O Príncipe Alaric') + ', com quem você casou, ' + (who === 'alaric' ? 'está morto' : 'está morta') + '. A casa fica de luto.'); estateSave(); } } }
if (typeof mrSpouses === 'function') { const _msC2 = mrSpouses; mrSpouses = function (dt) { try { if (S.estate) c2Spouses(); } catch (e) { } const U = S.estate && sucRec(), R = S.estate && mrRec(), hold = [];
  if (U && R) for (const key of Object.keys(R.m)) { const M = R.m[key], who = c2RoyalOf(M); if (who && U.king === who && !M.dead) { hold.push(M); M.dead = 1; } }   /* no trono: não aparece no casarão enquanto reina */
  try { return _msC2(dt); } finally { for (const M of hold) M.dead = 0; } }; }
/* cerco: vence quem matar ou capturar o rei (sem o minuto sentado no trono) */
if (typeof sgThrone === 'function') { sgThrone = function (now) { const S0 = sgRec(); if (S0.on && S0.kingOut) sgEnd('r', S0.kingOut); }; }
/* casa extinta ou no exílio: para de vez (não ganha influência, prestígio, força nem ouro, e sai da eleição) */
const c2Fallen = h => typeof fhIs === 'function' && fhIs(h);
if (typeof infAdd === 'function') { const _iaC2 = infAdd; infAdd = function (h, pl, d) { if (c2Fallen(h)) return; return _iaC2.apply(this, arguments); }; }
if (typeof infElection === 'function') { const _ieC2 = infElection; infElection = function () { return _ieC2.apply(this, arguments).filter(e => !c2Fallen(e.h)); }; }
function c2Freeze() { if (!S.estate || typeof fhRec !== 'function') return; const H = hRec(), I = typeof infRec === 'function' ? infRec() : null;
  for (const hid of Object.keys(fhRec().h)) { const s = H.st[hid]; if (s) Object.assign(s, { power: 0, gold: 0, crown: 0, prestige: 0 }); if (I) for (const pl in I.sup) if (I.sup[pl][hid] != null) I.sup[pl][hid] = 0; } }
if (typeof hDaily === 'function') { const _hdC2 = hDaily; hDaily = function () { const out = [], keep = HOUSES.slice(); try { if (S.estate && typeof fhRec === 'function') for (let i = HOUSES.length - 1; i >= 0; i--) if (c2Fallen(HOUSES[i].id)) out.push(HOUSES.splice(i, 1)[0]); } catch (e) { } let r; try { r = _hdC2.apply(this, arguments); } finally { if (out.length) { HOUSES.length = 0; HOUSES.push(...keep); } } try { c2Freeze(); } catch (e) { } return r; }; }   /* o dia das casas: a extinta não age nem é sorteada nas brigas */
if (typeof housesTick === 'function') { const _htC2 = housesTick; housesTick = function (now) { const r = _htC2.apply(this, arguments); try { if (!S.c2T || now - S.c2T > 10000) { S.c2T = now; c2Freeze(); } } catch (e) { } return r; }; }
/* guardas reais: lutam contra monstro que aparece no castelo ou perto dele (antes só as sentinelas da cidade lutavam) */
if (typeof courtMove === 'function' && typeof guardFightMonster === 'function') { const _cmC2 = courtMove; courtMove = function (n, T, dt) { try { if (n && n.kind === 'k_guard' && !n.siege && !(n.fl || 0) && !n.dead && !n.downed && guardFightMonster(n, now_(), dt)) return false; } catch (e) { } return _cmC2.apply(this, arguments); }; }
/* ---- cortejo fúnebre (lista 5): quatro carregadores presos ao caixão (antes os guardas ficavam para trás e o caixão "levitava"),
   o caixão não trava, e moradores acompanham conforme a popularidade do rei: amado, até 20 chorando; odiado, poucos, e alguns comemoram ---- */
const C2_RG = ['k_rg1', 'k_rg2', 'k_rg3', 'k_rg4'], C2_MOURN_K = ['v_peasm', 'v_peasf', 'v_house1', 'v_house2', 'v_house3', 'v_house4'];
const C2_CRY = ['Que descanse em paz...', 'Era um bom rei.', '*soluça*', 'Que a Luz o receba.', 'Adeus, majestade.', '*chora baixinho*'], C2_JOY = ['Já vai tarde!', 'Ninguém vai sentir falta.', 'Finalmente!', 'Que o próximo seja melhor.'];
if (typeof courtPost === 'function') { const _cpC2 = courtPost; courtPost = function (def, now) { const U = S.estate && sucRec(); if (U && U.stage === 'funeral' && C2_RG.includes(def.id)) return [0, 'funeral', 11 + C2_RG.indexOf(def.id)]; return _cpC2(def, now); }; }   /* os guardas reais vão atrás, escoltando */
function c2Spawn(id, kind, name, x, y, extra) { const n = Object.assign({ id, kind, name, transient: true, court: 'cortejo', x, y, z: 0, fl: 0, fb: -1, hp: 120, maxHp: 120, downed: null, dead: false, dir: 0 }, extra || {}); S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n; }
function c2FuneralTick(now) { const U = sucRec(), cf = S.npcs.k_coffin, F = S.c2F;
  if (U.stage !== 'funeral' || !cf) { if (F) { for (const id of F.ids) if (S.npcs[id]) visGone(S.npcs[id]); S.c2F = null; } return; }
  if (!F) { const pop = Math.max(0, Math.min(100, Math.round(typeof sucLegit === 'function' ? sucLegit(U.king) : 50))), loved = pop >= 35, n0 = loved ? Math.min(20, Math.max(6, Math.round(pop / 4))) : Math.max(2, Math.round(pop / 12)), joy = loved ? 0 : Math.max(1, Math.round((35 - pop) / 10));
    const ids = []; for (let i = 0; i < 4; i++) { c2Spawn('k_pb' + i, 'k_guard', 'Guarda Real', cf.x, cf.y, { pb: i }); ids.push('k_pb' + i); }
    for (let i = 0; i < n0 + joy; i++) { const id = 'k_mn' + i; c2Spawn(id, C2_MOURN_K[i % C2_MOURN_K.length], i < n0 ? 'Morador de luto' : 'Morador', cf.x - 2 - i * 0.3, cf.y - 2, { mi: i, joy: i >= n0 ? 1 : 0 }); ids.push(id); }
    S.c2F = { ids, n0, joy, pop, lx: cf.x, ly: cf.y, st: now }; if (typeof sys === 'function') sys(loved ? '⚱ ' + n0 + ' moradores acompanham o caixão do ' + (U.dead || 'rei') + ', em silêncio.' : '⚱ Poucos acompanham o caixão do ' + (U.dead || 'rei') + '. Na praça, há quem comemore.'); return; }
  const hx = cf.hx == null ? 0 : cf.hx, hy = cf.hy == null ? 1 : cf.hy;
  /* o caixão destrava: parado 3 s longe da Catedral, avança um passo (é carregado, não precisa de caminho largo) */
  const [tx, ty] = sucTempleIn(), far = dist(cf.x, cf.y, tx, ty) > 0.8; if (dist(F.lx, F.ly, cf.x, cf.y) > 0.15) { F.lx = cf.x; F.ly = cf.y; F.st = now; } else if (far && now - F.st > 3000) { const nx = cf.path && cf.path[0]; if (now - F.st > 6000 && nx) { cf.x = nx[0]; cf.y = nx[1]; cf.path.shift(); } else { cf.legs = null; cf.walkKey = null; cf.path = null; } if (now - F.st > 6000) F.st = now; }   /* parado: refaz o caminho; se continuar parado, avança para o próximo ponto dele */
  for (const id of F.ids) { const n = S.npcs[id]; if (!n || n.dead) continue;
    if (n.pb != null) { const i = n.pb, s = i % 2 ? 1 : -1, f = i < 2 ? 0.55 : -0.55; n.x = cf.x + hx * f - hy * s * 0.55; n.y = cf.y + hy * f + hx * s * 0.55; n.walk = !!cf.walk || far; n.dir = dirFromVecS(hx, hy); continue; }   /* carregadores: presos ao caixão */
    const i = n.mi, row = Math.floor(i / 3), col = (i % 3) - 1, bx = cf.x - hx * (4.6 + row * 1.0) - hy * col * 0.9, by = cf.y - hy * (4.6 + row * 1.0) + hx * col * 0.9;
    if (dist(n.x, n.y, bx, by) > 10) { n.x = bx; n.y = by; } else if (dist(n.x, n.y, bx, by) > 0.4) n.walk = !npcWalk(n, bx, by, 1.4, 0.15); else n.walk = false;
    if (Math.random() < 0.004) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: (n.joy ? C2_JOY : C2_CRY)[Math.floor(Math.random() * (n.joy ? C2_JOY.length : C2_CRY.length))], ms: 1 }); } }
if (typeof housesTick === 'function') { const _htF2 = housesTick; housesTick = function (now) { const r = _htF2.apply(this, arguments); try { if (S.estate) c2FuneralTick(now); } catch (e) { console.warn('cortejo', e); } return r; }; }
/* ---- filho do rei jogador como herdeiro (lista 5b): os filhos adultos do casamento entram na lista; quando o reinado acaba,
   o filho vira rei NPC da casa; o jogador continua dono da casa, vira pai do rei e pode tentar voltar ao trono por golpe ---- */
function c2Kids(owner) { const M = typeof mrRec === 'function' && mrRec().m[owner]; if (!M || !M.kids) return []; return M.kids.map((k, i) => ({ k: 'kid:' + i, i, n: k.n, g: k.g, a0: k.a0 })).filter(x => typeof ageOf !== 'function' || ageOf(x.a0) >= (typeof AGE_ADULT !== 'undefined' ? AGE_ADULT : 20)); }
const c2Npc = () => { const C = S.estate && crownRec(); return C && C.rk && C.rk.npcKing || null; };
if (typeof rkHouse === 'function') { const _rhC2 = rkHouse; rkHouse = function () { if (c2Npc()) return null; return _rhC2.apply(this, arguments); }; }   /* filho NPC no trono: a casa reina, mas não pelo painel do jogador */
if (typeof sucKingName === 'function') { const _skC2 = sucKingName; sucKingName = function () { const N = c2Npc(); if (N && sucRec().king === 'h:' + N.hid) return (N.g === 'f' ? 'Rainha ' : 'Rei ') + String(N.n).split(' ')[0]; return _skC2.apply(this, arguments); }; }
if (typeof sucApplyKing === 'function') { const _saC2 = sucApplyKing; sucApplyKing = function (k) { const C = crownRec(); if (C.rk && C.rk.npcKing && !S.c2Keep) delete C.rk.npcKing; return _saC2.apply(this, arguments); }; }
if (typeof courtSpawn === 'function') { const _csK2 = courtSpawn; courtSpawn = function (def) { try { const N = c2Npc(); if (N && def && def.id === 'k_king') { def.name = sucKingName(); def.kind = 'mr_young'; } } catch (e) { } return _csK2(def); }; }
if (typeof rkPanelData === 'function') { const _rpC2 = rkPanelData; rkPanelData = function (p) { const o = _rpC2.apply(this, arguments); try { const h = PH_BY[sucRec().king.slice(2)], R = rkRec(); for (const x of c2Kids(h.owner)) o.vas.push({ k: x.k, n: x.n + (x.g === 'f' ? ' (sua filha)' : ' (seu filho)') }); if (R.heir && R.heir.startsWith('kid:')) { const x = c2Kids(h.owner).find(q => q.k === R.heir); o.heir = x ? x.n + (x.g === 'f' ? ' (sua filha)' : ' (seu filho)') : null; } } catch (e) { } return o; }; }
if (typeof rkMsg === 'function') { const _rmC2 = rkMsg; rkMsg = function (p, m) { if (m && m.a === 'heir' && String(m.k || '').startsWith('kid:') && rkIsKing(p)) { const h = PH_BY[sucRec().king.slice(2)], R = rkRec(); if (!c2Kids(h.owner).some(x => x.k === m.k)) return; R.heir = m.k; h.heir = m.k; estateSave(); tell(p, 'Herdeiro escolhido: ' + c2Kids(h.owner).find(x => x.k === m.k).n + '.'); Net.toOne(p.id, rkPanelData(p)); return; } return _rmC2.apply(this, arguments); }; }
if (typeof rkEnd === 'function') { const _reC2 = rkEnd; rkEnd = function (why) { const h = rkHouse(), R = h && rkRec(), hk = R && (R.heir || h.heir); if (!h || !hk || !String(hk).startsWith('kid:')) return _reC2.apply(this, arguments);
  const x = c2Kids(h.owner).find(q => q.k === hk); if (!x) { R.heir = null; h.heir = null; return _reC2.apply(this, arguments); }
  const U = sucRec(), old = sucKingName(), C = crownRec(); R.heir = null; h.heir = null; U.stage = 'done'; C.rk.npcKing = { n: x.n, g: x.g, hid: h.id, owner: h.owner, since: estDay() }; U.kage0 = typeof ageOf === 'function' ? ageOf(x.a0) : 20; U.since = estDay();
  const def = COURT.find(d => d.id === 'k_king'); if (def) { def.name = sucKingName(); def.kind = 'mr_young'; } const kk = S.npcs.k_king; if (kk) visGone(kk);
  C.favor[h.owner] = Math.max(C.favor[h.owner] || 0, 80);   /* o pai do rei */
  sys('👑 O reinado do ' + old + ' terminou (' + why + '). ' + (x.g === 'f' ? 'A filha' : 'O filho') + ' dele, ' + x.n + ', é ' + (x.g === 'f' ? 'a nova rainha' : 'o novo rei') + ' de Nae.'); hNews(x.n + ' herdou a coroa do pai (' + why + ').');
  const op = Object.values(S.players).find(o => estOwner(o) === h.owner); if (op) tell(op, 'Você não é mais o rei (' + why + '). ' + x.n + ' reina agora: você continua dono da ' + h.n + ', é ' + (x.g === 'f' ? 'pai da rainha' : 'pai do rei') + ' e tem o favor da coroa. Se quiser o trono de volta, só com um golpe.');
  estateSave(); }; }
/* golpe contra o próprio filho: liberado (antes dizia que a casa já estava no trono) */
if (typeof rbMarch === 'function') { const _rbC2 = rbMarch; rbMarch = function (p) { const N = c2Npc(), U = sucRec(), k0 = U.king; if (N && N.owner === estOwner(p) && k0 === 'h:' + N.hid) { U.king = 'npc:' + N.hid; try { return _rbC2.apply(this, arguments); } finally { U.king = k0; } } return _rbC2.apply(this, arguments); }; }
/* ---- casarão da casa fundada pelo jogador (e o do Lote construído) vira casarão de casa nobre (lista 5, item 13):
   cômodos das casas nobres, porta dos fundos (com gazua) e hera até a janela do 1º andar; a decoração feita volta para a mobília ---- */
function c2MakeSeat(bi) { const b = BUILDINGS[bi]; if (!b || b.deco === 'seat' || b.kind !== 'manor' || b.lot) return false;
  try { if (typeof S !== 'undefined' && S.estate && typeof decoEst === 'function') { const E = decoEst(), pid = 'm' + bi, D = E.deco && E.deco[pid]; if (D && typeof decoUndo === 'function') decoUndo(pid, D); } } catch (e) { }
  const door = b.door || 'S', A2 = door === 'S' || door === 'N' ? b.w : b.h; Object.assign(b, { deco: 'seat', stairs: { 0: 'spiral', 1: 'ladder' }, floors: Math.max(3, b.floors || 3), c2seat: 1 }); delete b._d2; delete b.arch;
  b.seatMirror = door === 'S' ? 1 : 0; b.seatSide = door === 'S' ? 'R' : door === 'E' ? 'L' : null; b.door2L = door === 'S' ? [A2 - 1, 2, 'E'] : door === 'E' ? [0, 2, 'S'] : [Math.floor(seatMapU(b, 1.5)), 0, 'E'];
  if (typeof SEAT_ROOM_MEMO !== 'undefined') for (const k in SEAT_ROOM_MEMO) delete SEAT_ROOM_MEMO[k]; if (typeof SEAT_WALL_MEMO !== 'undefined') for (const k in SEAT_WALL_MEMO) delete SEAT_WALL_MEMO[k];
  if (typeof decoRebuild === 'function') decoRebuild(bi); else if (typeof LAYOUT_MEMO !== 'undefined') LAYOUT_MEMO.clear();
  if (typeof G !== 'undefined' && typeof SC3 !== 'undefined' && SC3.clear) { SC3.clear(); if (typeof S3 !== 'undefined') S3.px = 0; }
  return true; }
if (typeof phReg === 'function') { const _prC2 = phReg; phReg = function (h) { const r = _prC2.apply(this, arguments); try { if (h && h.bi >= 0) c2MakeSeat(h.bi); } catch (e) { console.warn('casarão nobre', e); } return r; }; }
if (typeof lotBuild === 'function') { const _lbC2 = lotBuild; lotBuild = function (bi) { const r = _lbC2.apply(this, arguments); try { if (r) c2MakeSeat(bi); } catch (e) { } return r; }; }
/* tranca da porta dos fundos dos casarões de jogador: os de casa (dono, vassalos e autorizados) passam; quem arrombou passa por um tempo */
if (typeof csLocks === 'function') { const _clC2 = csLocks; csLocks = function () { const L = _clC2.apply(this, arguments); try { const back = S.csBack || (S.csBack = {}), now = now_(), H = hRec(), E = estateLoad();
  BUILDINGS.forEach((b, bi) => { if (!b.c2seat || L[bi]) return; const r = E.r['m' + bi], B = back[bi] || {}; for (const nm in B) if (B[nm] < now) delete B[nm]; const h = typeof phRec === 'function' ? phRec().l.find(q => q.bi === bi) : null;
    const f = Object.values(S.players).filter(p => r && (r.owner === estOwner(p) || (r.auth || []).includes(String(p.name).trim().toLowerCase()) || (h && H.vow[estOwner(p)] === h.id))).map(p => String(p.name).trim().toLowerCase());
    L[bi] = { g: h ? (Object.values(S.npcs).some(n => n.court === 'phouse' && n.house === h.id && n.hrole === 'guard' && !n.dead && !n.downed) ? 1 : 0) : 0, f, b: Object.keys(B).concat(f) }; }); } catch (e) { } return L; }; }
if (typeof estateBlocked === 'function') { const _ebC2 = estateBlocked; estateBlocked = function (name, ox, oy, x, y, L) { if (!_ebC2.apply(this, arguments)) return false; try { const bi = WORLD.bld[tileAt(x, y)], b = BUILDINGS[bi], SL = (typeof S !== 'undefined' && S.seatL) || (typeof G !== 'undefined' && G.seatL); if (b && b.c2seat && SL && SL[bi]) { const d2 = door2Of(b), nm = String(name || '').trim().toLowerCase(); if (d2 && Math.round(x) === d2.x && Math.round(y) === d2.y && (SL[bi].b || []).includes(nm)) return false; if (WORLD.bld[tileAt(ox, oy)] === bi) return false; } } catch (e) { } return true; }; }   /* arrombou a porta dos fundos: entra por ela */
