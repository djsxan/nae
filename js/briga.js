// ============================================================
//  BRIGA DE RUA (lista 15, 28/11): empurrão, empurrão correndo, voadora, banda e corda no pé.
//  P empurra (correndo, empurra forte e derruba); correndo com a pessoa a alguns passos, P é a voadora; por trás de
//  alguém parado, P amarra uma corda no pé (gasta uma Corda) e a pessoa cai quando andar. Desarmado, C (esquiva) colado
//  em alguém dá a banda com a perna. (Até a 1.190 era o R, que é a tecla do ataque automático.)
//  Vale em jogadores e NPCs, com consequência: quem cai é "desordem" para as sentinelas que virem, os guardas
//  avisam no primeiro empurrão, e o povo xinga e às vezes revida.
// ============================================================
const BRG = { reach: { push: 1.5, kick: 2.8, trip: 1.45, rope: 1.25 }, cd: { push: 900, kick: 2600, trip: 1500, rope: 4000 }, d: { push: 1.0, run: 2.0, kick: 2.3, trip: 0.3 }, ko: 1700, revide: 0.35, notice: 0.25, ropeMs: 90000 };
const BRG_GUARD = /^(guard|captain|vl_cap|hh_guard|k_guard|sentinel|jailer)/;
const BRG_INSULT = ['Ei! Olha por onde anda!', 'Tá maluco?!', 'Encosta em mim de novo e você vai ver!', 'Que falta de educação!', 'Seu brutamontes!', 'Ai! Minha coluna!'];
const BRG_FALL = ['Ai! Você me derrubou!', 'Que covardia!', 'Guardas! Ele me derrubou!', 'Meu joelho… você vai pagar por isso!'];
const BRG_ROPE = ['Quem amarrou isso no meu pé?!', 'Mas o quê… uma corda?!', 'Muito engraçado. MUITO engraçado.'];

// ---------------- SERVIDOR ----------------
if (typeof CRIME_MS !== 'undefined') { CRIME_MS.brawl = 45000; CRIME_TXT.brawl = 'desordem'; }
function brgEnt(k, id) { return k === 'p' ? S.players[id] : S.npcs[id]; }
function brgFree(x, y, fl) { if (fl) return true; try { return typeof npcStand === 'function' ? npcStand(x, y, 0.2) : true; } catch (e) { return true; } }
/* desliza o NPC (com colisão) */
function brgShoveNpc(n, a, d) { const st = 0.1; let k = 0; for (; k < d; k += st) { const x = n.x + Math.cos(a) * st, y = n.y + Math.sin(a) * st; if (!brgFree(x, y, n.fl || 0)) break; n.x = x; n.y = y; } return k; }
function brgKoNpc(n, by, now) { const S0 = S.brKO || (S.brKO = {}); n.walk = false; S0[n.id] = { x: n.x, y: n.y, until: now + BRG.ko }; near(n.x, n.y, { t: 'knock', k: 'n', id: n.id, ax: by.x, ay: by.y, ms: BRG.ko });
  setTimeout(() => { try { if (S.npcs[n.id] && !n.dead) near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'getup', ms: 700 }); } catch (e) { } }, BRG.ko - 650); }
function brgIsGuard(n) { return n && (BRG_GUARD.test(String(n.kind || '')) || n.hrole === 'guard' || !!n.seg); }
/* reação do NPC: xinga, avisa (guarda) ou revida */
function brgReact(n, p, fell, now) { if (!n || n.dead) return; const say = t => { try { empSay(n, t); } catch (e) { near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'talk', txt: t, ms: 1 }); } };
  setTimeout(() => { try { if (!S.npcs[n.id] || n.dead || n.downed) return;
    if (brgIsGuard(n)) { if (fell || (p._brWarn || 0) > now) { say('Desordem! Você está preso!'); witnessCrime(p, p.x, p.y, 'brawl'); if (typeof n.aggro !== 'undefined' || true) { n.aggro = p.id; n.aggroT = now + 20000; } } else { p._brWarn = now + 60000; say('Mais um empurrão e você vai para a cadeia.'); } return; }
    say((fell ? BRG_FALL : BRG_INSULT)[Math.floor(Math.random() * (fell ? BRG_FALL : BRG_INSULT).length)]);
    if (Math.random() < BRG.revide && dist(n.x, n.y, p.x, p.y) < 2.6 && (n.fl || 0) === (p.fl || 0) && !p.downed) { const a = Math.atan2(p.y - n.y, p.x - n.x); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'shove', tx: p.x, ty: p.y, ms: 700 });
      setTimeout(() => { try { if (!S.players[p.id] || p.downed) return; Net.toOne(p.id, { t: 'push', a, d: 1.0 }); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'hurt', ms: 400 }); tell(p, (String(n.name || 'Ele').split(',')[0]) + ' revidou o empurrão!'); } catch (e) { } }, 260); } } catch (e) { } }, fell ? BRG.ko + 200 : 500); }
/* efeito no alvo: empurra d casas e, se cair, derruba */
function brgHit(p, k, q, d, fall, now) { const a = Math.atan2(q.y - p.y, q.x - p.x) || 0;
  if (k === 'p') { if (q.dev) return; q._hitBy = { k: 'p', id: p.id, t: now }; if (d > 0) Net.toOne(q.id, { t: 'push', a, d }); if (fall) knockPlayer(q, p, now); else near(q.x, q.y, { t: 'anim', w: 'p', id: q.id, a: 'hurt', ms: 400 });
    tell(q, p.name + (fall ? ' derrubou você!' : ' empurrou você!')); if (fall && !(p.duel && p.duel === q.duel)) witnessCrime(p, p.x, p.y, 'brawl'); }
  else { if (d > 0) brgShoveNpc(q, a, d); if (fall) { brgKoNpc(q, p, now); witnessCrime(p, p.x, p.y, 'brawl'); } else near(q.x, q.y, { t: 'anim', w: 'n', id: q.id, a: 'hurt', ms: 400 }); q.faceT = null; brgReact(q, p, fall, now); } }
function brgMsg(p, m) { const now = now_(), a0 = String(m.a || ''); if (!BRG.cd[a0] || (a0 === 'trip' && !p.sheathed) || p.downed || p.sit || p.sleep != null || p.aff || now < (p.knockUntil || 0) || p.carrying || p.carriedBy) return;
  p._brCd = p._brCd || {}; if (now < (p._brCd[a0] || 0)) return; p._brCd[a0] = now + BRG.cd[a0];
  const run = !!m.run && !!p.running; if (a0 === 'kick' && !run) { p._brCd[a0] = 0; return; }
  const q = m.id != null ? brgEnt(m.k, m.id) : null, ok = q && q !== p && !q.dead && !q.downed && (q.fl || 0) === (p.fl || 0) && dist(p.x, p.y, q.x, q.y) <= BRG.reach[a0] + (run ? 0.5 : 0) && !(m.k === 'n' && (String(q.kind || '').startsWith('ent_') || q.sitting || q.sleeping || q.onBack || q.dz || /^vl_lift/.test(q.id)));
  const tx = q ? q.x : p.x + Math.cos(p.fa || 0), ty = q ? q.y : p.y + Math.sin(p.fa || 0);
  if (a0 === 'push') { near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'shove', tx, ty, ms: 650 }); if (ok) setTimeout(() => { try { brgHit(p, m.k, q, run ? BRG.d.run : BRG.d.push, run, now_()); if (run) sfx(q.x, q.y, 'Empurrão!', '#f0c060', 150); } catch (e) { } }, 200); return; }
  if (a0 === 'kick') { const dd = q ? Math.max(0.2, dist(p.x, p.y, q.x, q.y) - 0.5) : 1.6, a = Math.atan2(ty - p.y, tx - p.x); near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'flykick', tx, ty, ms: 760 }); Net.toOne(p.id, { t: 'push', a, d: dd });
    setTimeout(() => { try { if (ok) { brgHit(p, m.k, q, BRG.d.kick, true, now_()); sfx(q.x, q.y, 'Voadora!', '#ff9a40', 150, true); } knockPlayer(p, { x: p.x + Math.cos(a) * 2, y: p.y + Math.sin(a) * 2 }, now_()); } catch (e) { } }, 380); return; }   /* quem dá a voadora também vai ao chão */
  if (a0 === 'trip') { if (typeof hasMove === 'function' && hasMove(p, 'sweep')) return;   /* quem aprendeu a rasteira no dojô já derruba com a esquiva */
    near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'legsweep', tx, ty, ms: 650 }); if (!ok) return;
    const moving = m.k === 'p' ? !!q.walking : !!q.walk; setTimeout(() => { try { if (!moving && Math.random() < 0.4) { sfx(q.x, q.y, 'Firmou o pé!', '#c8c8c8', 150); if (m.k === 'n') brgReact(q, p, false, now_()); return; } brgHit(p, m.k, q, BRG.d.trip, true, now_()); sfx(q.x, q.y, 'Banda!', '#f0c060', 150); } catch (e) { } }, 260); return; }
  if (a0 === 'rope') { if (!ok) { tell(p, 'Chegue por trás de alguém parado.'); p._brCd[a0] = 0; return; } if (!(p.inv && p.inv.rope > 0)) { tell(p, 'Você precisa de uma Corda (o mercador vende).'); p._brCd[a0] = 0; return; }
    const moving = m.k === 'p' ? !!q.walking : !!q.walk, fd = (q.dir | 0) * Math.PI / 4, fx = Math.sin(fd) / 2 + Math.cos(fd), fy = Math.cos(fd) - Math.sin(fd) / 2;   /* para onde o alvo olha, no mapa (inverso do dirFromVec) */
    const behind = m.k === 'n' || ((p.x - q.x) * fx + (p.y - q.y) * fy) / (Math.hypot(fx, fy) * (dist(p.x, p.y, q.x, q.y) || 1)) < 0.2;   /* NPC: a direção que vale é a da tela (o servidor não manda a dos NPCs); quem confere é o cliente */
    if (moving || !behind) { tell(p, moving ? 'Só dá para laçar o pé de quem está parado.' : 'Chegue por trás, sem ser visto.'); p._brCd[a0] = 0; return; }
    near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'kneelput', tx: q.x, ty: q.y, ms: 1600 });
    setTimeout(() => { try { if (!S.players[p.id] || p.downed || dist(p.x, p.y, q.x, q.y) > BRG.reach.rope + 0.4) return; if (m.k === 'n' && Math.random() < BRG.notice) { brgReact(q, p, false, now_()); tell(p, 'Ele percebeu a corda e soltou o pé.'); return; }
      p.inv.rope--; if (p.inv.rope <= 0) delete p.inv.rope; sendStat(p); const R = S.brRope || (S.brRope = {}); R[m.k + ':' + q.id] = { k: m.k, id: q.id, by: p.id, x: q.x, y: q.y, until: now_() + BRG.ropeMs }; near(q.x, q.y, { t: 'brope', k: m.k, id: q.id, on: 1 }); tell(p, '➰ Pé amarrado. Agora é só esperar ele andar…'); } catch (e) { } }, 1500); return; } }
/* a cada quadro: quem caiu fica no chão; quem tem o pé amarrado e anda, cai */
function brgTick(now) {
  for (const id in S.brKO || {}) { const K = S.brKO[id], n = S.npcs[id]; if (!n || now > K.until) { delete S.brKO[id]; continue; } n.x = K.x; n.y = K.y; n.walk = false; }
  for (const key in S.brRope || {}) { const R = S.brRope[key], q = brgEnt(R.k, R.id), by = S.players[R.by] || { x: R.x, y: R.y };
    if (!q || q.dead || now > R.until) { delete S.brRope[key]; if (q) near(q.x, q.y, { t: 'brope', k: R.k, id: R.id, on: 0 }); continue; }
    if (dist(q.x, q.y, R.x, R.y) > 0.35 && !q.downed) { delete S.brRope[key]; near(q.x, q.y, { t: 'brope', k: R.k, id: R.id, on: 0 }); sfx(q.x, q.y, 'Tropeçou!', '#f0c060', 150);
      if (R.k === 'p') { knockPlayer(q, { x: q.x + (q.x - R.x) * 3, y: q.y + (q.y - R.y) * 3 }, now); tell(q, 'Alguém amarrou uma corda no seu pé! Você caiu de cara no chão.'); }
      else { brgKoNpc(q, { x: R.x - (q.x - R.x) * 3, y: R.y - (q.y - R.y) * 3 }, now); setTimeout(() => { try { empSay(q, BRG_ROPE[Math.floor(Math.random() * BRG_ROPE.length)]); } catch (e) { } }, BRG.ko); }
      const p = S.players[R.by]; if (p && dist(p.x, p.y, q.x, q.y) < 12) witnessCrime(p, q.x, q.y, 'brawl'); } } }
if (typeof hostOnClient === 'function' && typeof S !== 'undefined') { const _hoBrg = hostOnClient; hostOnClient = function (id, m) { if (m && m.t === 'brawl') { const p = S.players[id]; if (p) try { brgMsg(p, m); } catch (e) { console.warn('briga', e); } return; } return _hoBrg.apply(this, arguments); }; }
if (typeof npcFaceFix === 'function' && typeof S !== 'undefined') { const _nfBrg = npcFaceFix; npcFaceFix = function (now) { _nfBrg.apply(this, arguments); try { brgTick(now); } catch (e) { console.warn('briga tick', e); } }; }

// ---------------- CLIENTE ----------------
if (typeof ACTS !== 'undefined') {
  ACTS.flykick = [[0, {}], [0.18, { lA: [0.9, -1.7], lB: [0.95, -1.7], tl: -0.25, aA: [0.6, 0.9, 0.5], aB: [0.6, 0.9, 0.5] }], [0.42, { lA: [1.6, -0.05], lB: [1.4, -0.15], tl: -0.8, ht: 0.3, aA: [0.2, 1.4, 0.2], aB: [0.2, 1.4, 0.2] }], [0.72, { lA: [1.55, -0.05], lB: [1.35, -0.2], tl: -0.85, ht: 0.3, aA: [0.1, 1.5, 0.2], aB: [0.1, 1.5, 0.2] }], [1, { lA: [0.6, -0.9], lB: [0.6, -0.9], tl: -0.4 }]];   /* pula encolhido, estica as duas pernas para a frente com o corpo para trás */
  ACTS.legsweep = [[0, {}], [0.25, { tl: 0.3, kn: -0.45, lB: [0.55, -1.1], lA: [0.45, -0.1, 0, 0.95], aA: [0.5, 0.6, 0.6], aB: [0.6, 0.7, 0.5] }], [0.55, { tl: 0.38, kn: -0.5, lB: [0.6, -1.15], lA: [0.85, -0.05, 0, -0.35], aA: [0.4, 0.8, 0.5], aB: [0.7, 0.5, 0.6] }], [1, {}]];   /* agacha e varre a perna de lado, rente ao chão */
  if (typeof ACT_MS !== 'undefined') { ACT_MS.flykick = 760; ACT_MS.legsweep = 650; } }
function brgFwd(dir) { const a = (dir | 0) * Math.PI / 4, sx = Math.sin(a), sy = Math.cos(a), dx = (sx + 2 * sy) / 2, dy = (2 * sy - sx) / 2, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
/* alvo: o mais perto à frente (ou o mais perto de todos, se ninguém estiver à frente) */
function brgPick(reach) { const me = G.me; if (!me) return null; const [fx, fy] = brgFwd(me.dir), C = [];
  for (const id in G.players) { const e = G.players[id]; if (e === me || !e.visible || e.downed || (e.fl || 0) !== (me.fl || 0)) continue; C.push(['p', id, e]); }
  for (const id in G.npcs) { const e = G.npcs[id]; if (!e.visible && e.visible !== undefined) continue; if (e.npDead || e.npDown || e.onBackBy || e.custP || e.sleepB || (e.fl || 0) !== (me.fl || 0)) continue; C.push(['n', id, e]); }
  let best = null, bs = -1e9; for (const [k, id, e] of C) { const dx = (e.rx ?? e.x) - me.x, dy = (e.ry ?? e.y) - me.y, d = Math.hypot(dx, dy); if (d > reach || d < 0.05) continue; const dot = (dx * fx + dy * fy) / d, s = dot * 2 - d; if (dot < -0.2) continue; if (s > bs) { bs = s; best = { k, id }; } }
  return best; }
/* teclado: só desarmado. R empurra / voadora / corda conforme a situação; C (esquiva) colado em alguém dá a banda */
if (typeof window !== 'undefined' && typeof G !== 'undefined') window.addEventListener('keydown', ev => {
  try { const k = (ev.key || '').toLowerCase(); if ((k !== 'p' && k !== 'c') || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return; const t = ev.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!G.started || !G.me || (k === 'c' && !G.me.shea) || G.me.downed || G.me.sit || G.me.sleep || G.me.aff || G.training || G.me.bathing || G.me.medit) return; if (document.querySelector('.gpanel.lift-panel, .vel-panel, #gmenu.on')) return;
    const run = !!(G.me.running && G.me.walking);
    if (k === 'c') { const tg = brgPick(BRG.reach.trip); if (tg) Net.send({ t: 'brawl', a: 'trip', run: 0, k: tg.k, id: tg.id }); return; }   /* a esquiva continua; a banda vai junto */
    let a = 'push', tg = brgPick(run ? BRG.reach.kick + 0.5 : BRG.reach.push);
    if (tg) { const e = tg.k === 'p' ? G.players[tg.id] : G.npcs[tg.id], ex = e.rx ?? e.x, ey = e.ry ?? e.y, d = Math.hypot(ex - G.me.x, ey - G.me.y);
      if (run && d > 1.6) a = 'kick';   /* correndo e com espaço: voadora */
      else if (!run && d > BRG.reach.push) tg = null;
      else if (!run && !e.walking && d <= BRG.reach.rope) { const [fx, fy] = brgFwd(e.dir), dx = G.me.x - ex, dy = G.me.y - ey; if ((dx * fx + dy * fy) / (d || 1) < 0.2 && (G.me.inv || {}).rope > 0) a = 'rope'; } }   /* por trás de alguém parado, com corda: laço no pé */
    ev.stopImmediatePropagation(); ev.preventDefault(); Net.send({ t: 'brawl', a, run: run ? 1 : 0, k: tg && tg.k, id: tg && tg.id }); } catch (e) { } }, true);
/* NPC derrubado: queda com o boneco de física, igual aos jogadores */
if (typeof clientOnServer === 'function' && typeof G !== 'undefined') { const _coBrg = clientOnServer; clientOnServer = function (m) {
  if (m && m.t === 'knock' && m.k === 'n') { const e = G.npcs[m.id], now = performance.now(); if (!e) return; try { e.knockUntil = now + m.ms; const key = 'kp' + m.id; delete FALLS[key]; npcSprite3D(e.kind, { dir: 0, walk: -1, nid: e.id }); const R = _rigs.get('npc:' + e.kind + '#' + e.id) || _rigs.get('npc:' + e.kind);
      if (R) startFall({ key, entRig: R, mode: 'rag', cls: NPC_CLS[e.kind] || 'knight', x: e.rx, y: e.ry, dir: e.dir || 0, ix: e.rx - m.ax, iy: e.ry - m.ay, force: 0.85, stand: e._spr }); } catch (er) { } return; }
  if (m && m.t === 'brope') { G.brRope = G.brRope || {}; if (m.on) G.brRope[m.k + ':' + m.id] = 1; else delete G.brRope[m.k + ':' + m.id]; return; }
  return _coBrg.apply(this, arguments); }; }
/* voadora: o corpo sobe no ar; corda: o laço no tornozelo com a ponta solta no chão */
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhBrg = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) {
  try { const A = e && e.anim; if (A && A.a === 'flykick') { const k = Math.min(1, (performance.now() - A.t0) / (A.ms || 760)); sy -= Math.sin(Math.min(1, k / 0.85) * Math.PI) * 13; } } catch (er) { }
  const r = _dhBrg.call(this, ctx, e, sx, sy, now);
  try { if (G.brRope && e && G.brRope[(e.isNpc ? 'n:' : 'p:') + e.id]) { ctx.save(); ctx.strokeStyle = '#c8a870'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(sx - 1.5, sy - 2, 3.2, 1.4, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx + 1.5, sy - 2); ctx.quadraticCurveTo(sx + 7, sy + 1, sx + 12, sy - 0.5); ctx.stroke(); ctx.restore(); } } catch (er) { }
  return r; }; }
