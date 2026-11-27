/* ============================================================
   BAILE (v1.172.0)
   1. Barra no show: a Safira usa a barra de latão do centro do palco (gira em volta, sobe, desce de costas).
   2. Seu herói dança de verdade com o 💃 Dançar (até andar), no mesmo compasso de quem dança por perto;
      quem está à toa ao seu lado entra na dança, cada um do seu jeito.
   3. Pista no salão do Veludo: dançando no salão, as moças livres vêm dançar em volta de você.
   ============================================================ */
if (typeof DANCE_CHOREO !== 'undefined') DANCE_CHOREO.heroi = { n: 'Baile', bpm: 130, seq: [['fk_passinho', 8], ['fk_ombrinho', 4], ['fk_destravada', 4], ['fk_maosalto', 8], ['fk_quadradinho', 8], ['fk_rebolado', 4]] };
const BAILE = { joinR: 5, joinMax: 6, maxMs: 300000, poleX: 6.5, poleY: 4.5, girlSteps: ['fk_rebolado', 'fk_tremidinha', 'fk_ombrinho', 'fk_destravada', 'fk_sarrada'] };

/* ---------------- SERVIDOR ---------------- */
function bjPublic(p) { const d = p.dz; return d ? { ch: d.ch, t0: d.t0, mir: d.mir, ph: d.ph, k: d.k } : null; }
function bjStart(p) { if (p.downed || p.sit || p.aff || p.bath || p.thSit || p.dzl || p.dead) return false; const now = Date.now(); S.dzT0 = S.dzT0 || now;
  p.dz = { ch: 'heroi', t0: S.dzT0, mir: Math.random() < 0.5 ? 1 : 0, ph: 0, k: Math.round((0.9 + Math.random() * 0.25) * 100) / 100, x0: p.x, y0: p.y, until: now + BAILE.maxMs, js: [], re: now };
  near(p.x, p.y, { t: 'pdance', id: p.id, d: bjPublic(p) });
  /* quem está à toa por perto entra na dança, no mesmo compasso, cada um do seu jeito */
  const bi = WORLD.bld[tileAt(p.x, p.y)], staff = new Set((typeof VEL_STAFF !== 'undefined' ? VEL_STAFF : []).map(T => T.id)); let said = 0;
  for (const n of Object.values(S.npcs || {})) { if (p.dz.js.length >= BAILE.joinMax) break;
    if (n.dead || n.downed || n.sleeping || n.sitting || n.walk || n.dz || n.aggro || n.fight || n.bard || staff.has(n.id) || /^(guard|captain)/.test(n.kind || '')) continue;
    if (dist(n.x, n.y, p.x, p.y) > BAILE.joinR || WORLD.bld[tileAt(n.x, n.y)] !== bi || (n.fl || 0) !== (p.fl || 0) || Math.random() > 0.55) continue;
    n.dzBy = p.id; p.dz.js.push(n.id); dzSet(n, { ch: 'heroi', t0: S.dzT0, mir: Math.random() < 0.5 ? 1 : 0, ph: Math.round(Math.random() * 3) * 0.08, k: Math.round((0.8 + Math.random() * 0.35) * 100) / 100, j: 1 });
    if (!said && Math.random() < 0.6) { said = 1; empSay(n, ['Isso aí!', 'Bora!', 'Olha o passinho!', 'Hoje tem baile!'][Math.floor(Math.random() * 4)]); } }
  return true; }
function bjStop(p) { const d = p.dz; if (!d) return; for (const id of d.js) { const n = S.npcs[id]; if (n && n.dzBy === p.id) { n.dzBy = null; dzSet(n, null); } } p.dz = null; near(p.x, p.y, { t: 'pdance', id: p.id, d: null }); }
function bjTick(now) {
  for (const p of Object.values(S.players)) { const d = p.dz; if (!d) continue;
    if (dist(p.x, p.y, d.x0, d.y0) > 0.35 || p.sit || p.downed || p.aff || p.dzl || p.bath || now > d.until) { bjStop(p); continue; }
    d.js = d.js.filter(id => { const n = S.npcs[id]; if (!n || n.dzBy !== p.id) return false; if (n.walk || n.sitting || n.dead || n.downed || n.aggro || n.fight || n.sleeping) { n.dzBy = null; dzSet(n, null); return false; } return true; });
    if (now - d.re > 4000) { d.re = now; near(p.x, p.y, { t: 'pdance', id: p.id, d: bjPublic(p) }); } }
  /* quem dançava com alguém que saiu do jogo para */
  for (const n of Object.values(S.npcs || {})) if (n.dzBy && !(S.players[n.dzBy] && S.players[n.dzBy].dz)) { n.dzBy = null; dzSet(n, null); } }
if (typeof hostOnClient === 'function' && typeof S !== 'undefined') { const _hoBj = hostOnClient; hostOnClient = function (from, m) { const p = S.players && S.players[from]; const r = _hoBj.apply(this, arguments);
  try { if (p && m && m.t === 'emote') { if (m.k === 'dance') { if (!p.dz) bjStart(p); } else if (p.dz) bjStop(p); } } catch (e) { console.warn('baile', e); } return r; }; }
if (typeof hostOnLeave === 'function' && typeof S !== 'undefined') { const _hlBj = hostOnLeave; hostOnLeave = function (id) { try { const p = S.players && S.players[id]; if (p && p.dz) bjStop(p); } catch (e) { } return _hlBj.apply(this, arguments); }; }
if (typeof velTick === 'function' && typeof S !== 'undefined') { const _vtBj = velTick; velTick = function (now) { _vtBj(now); try { if (now - (S.bjT || 0) > 500) { S.bjT = now; bjTick(now); } } catch (e) { console.warn('baile', e); } }; }
/* quem chega depois vê quem já está dançando */
if (typeof empWelcome === 'function' && typeof S !== 'undefined') { const _ewBj = empWelcome; empWelcome = function (to) { const r = _ewBj.apply(this, arguments); try { for (const p of Object.values(S.players)) if (p.dz) Net.toOne(to, { t: 'pdance', id: p.id, d: bjPublic(p) }); } catch (e) { } return r; }; }

/* show: a Safira na barra enquanto a Âmbar dança no chão do palco */
if (typeof DZ_SHOW !== 'undefined' && !DZ_SHOW.includes('barra')) DZ_SHOW.push('barra');
if (typeof dzSet === 'function' && typeof S !== 'undefined') { const _dsBj = dzSet; dzSet = function (n, d) { if (d && d.ch === 'barra' && n && n.id !== 'vl_d1') d = Object.assign({}, d, { ch: 'palco' }); return _dsBj.call(this, n, d); }; }

/* pista: dançando no salão do Veludo, as moças livres vêm dançar em volta de você */
function bjVelDancer() { if (typeof vlBi !== 'function') return null; const bi = vlBi(); if (bi < 0) return null; const L = Object.values(S.players).filter(p => p.dz && !(p.fl | 0) && WORLD.bld[tileAt(p.x, p.y)] === bi); return L.length ? L[Math.floor(Math.random() * L.length)] : null; }
if (typeof vl5GirlNext === 'function' && typeof S !== 'undefined') { const _vgBj = vl5GirlNext; vl5GirlNext = function (n, T, now) { const L = _vgBj.apply(this, arguments);
  try { if (L && L.a !== 'offer' && Math.random() < 0.6) { const p = bjVelDancer(); if (p) { const b = velB('velvet'), [u0, v0] = worldToLocal(b, p.x, p.y), near0 = Object.values(S.vl5 || {}).filter(X => X && X.bj === p.id).length;
    if (near0 < 3) { const a = (near0 * 2.1 + (n.id.length % 3)) , u = u0 + Math.cos(a) * 0.85, v = v0 + Math.sin(a) * 0.85;
      return Object.assign(L, { a: 'stage', bj: p.id, pts: vl5Path(n, u, v), i: 0, dur: 20000 + Math.random() * 10000, dz: { step: BAILE.girlSteps[(n.id.charCodeAt(n.id.length - 1) + near0) % BAILE.girlSteps.length], t0: S.dzT0 || now, mir: near0 % 2, ph: near0 * 0.08, k: 0.95 + (near0 % 3) * 0.08 } }); } } } } catch (e) { console.warn('pista', e); }
  return L; }; }
/* na pista ela olha para você, não para o palco */
if (typeof vl5Face === 'function' && typeof S !== 'undefined') { const _vfBj = vl5Face; vl5Face = function (n, x, y) { const L = n && S.vl5 && S.vl5[n.id]; if (L && L.bj && L.a === 'stage') { const p = S.players[L.bj]; if (p && p.dz) return _vfBj.call(this, n, p.x, p.y); } return _vfBj.apply(this, arguments); }; }

/* ---------------- CLIENTE ---------------- */
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peBj = progEvent; progEvent = function (m, now) { if (m.t === 'pdance') { G.plDz = G.plDz || {}; if (m.d) G.plDz[m.id] = m.d; else delete G.plDz[m.id]; return true; } return _peBj(m, now); }; }
/* passo e quadro da batida certa */
function bjFrame(d) { const beat = (Date.now() - d.t0) / 60000 * dzBpm(d) - (d.ph || 0), [st, b0] = dzStepAt(d, beat); if (!st) return null; const nF = Math.min(16, Math.max(8, Math.round(st.len * 4))), f = Math.floor(((b0 % st.len) + st.len) % st.len / st.len * nF) % nF; return { st, f, nF }; }
/* seu herói dançando: o boneco com a roupa dele (sem arma), no passo da batida */
function bjHeroSprite(e, d) { const F = bjFrame(d); if (!F) return null; const dir = e.dir | 0, key = 'pdz|' + e.id + '|' + e.cls + e.skin + e.color + '|' + F.st.id + '|' + F.f + '|' + (d.mir ? 1 : 0) + '|' + dir;
  return cache3(key, () => { const R = dzlRig(e, 'PD'); rigReset(R); affPose(R, e, { dir }); rigReset(R); danceApply(R, danceStyleF(F.st, F.f, F.nF, { mir: d.mir, k: d.k }), null); return shoot3D(R, dir, 0); }, 'pdz|' + e.id); }
if (typeof drawHeroEntity === 'function' && typeof G !== 'undefined') { const _dhBj = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) { const d = e && !e.isNpc && G.plDz && G.plDz[e.id];
  if (d && R3.ok && !e.walking && !e.downed && !e.sit) { const s = bjHeroSprite(e, d); if (s) { ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy); e._spr = s; e._sx = sx; e._sy = sy; e._drawT = now; return; } }
  return _dhBj.apply(this, arguments); }; }
/* barra: a moça desenhada em volta da barra do palco (a barra fica no centro, ela ao lado) */
function bjPoleOff(nid) { const e = G.npcs && G.npcs[nid], b = typeof velB === 'function' ? velB('velvet') : null; if (!e || !b) return null; const [px, py] = localToWorld(b, BAILE.poleX, BAILE.poleY), dx = px - (e.rx != null ? e.rx : e.x), dy = py - (e.ry != null ? e.ry : e.y); if (Math.hypot(dx, dy) > 1.2) return null;
  return [Math.round((dx - dy) * 1.28 * 50) / 50, Math.round((dx + dy) * 1.28 * 50) / 50]; }   /* do mundo (tiles) para o quadro 3D: 32 px por meio tile, 25 px por metro */
function bjPoleSprite(kind, nid, F, d, dir, off) { const vk = kind + '#' + nid, L = lookFor('npc:' + vk, typeof npcLookOf === 'function' && NPC_LOOKS[kind] ? () => npcLookOf(kind, nid) : NPC_LOOKS[kind]), R = rigFor('npc:' + vk, L, NPC_SCALE[kind] ? { scale: NPC_SCALE[kind] } : undefined);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), Q = danceStyleF(F.st, F.f, F.nF, { mir: d.mir, k: d.k });
  affPose(R, { isNpc: true, kind, id: nid }, { dir: 2 }); rigReset(R);
  let rx = 0, rz = 0.3, ry = 0; if (Q.orbit != null) { const a = Q.orbit; rx = Math.sin(a) * 0.3; rz = Math.cos(a) * 0.3; ry = a + Math.PI / 2; } else if (Q.face) { rz = 0.32; ry = Math.PI; } else if (Q.back) rz = 0.18;
  R.root.rotation.set(0, ry, 0); R.root.position.set(rx, 0, rz); R.root.updateMatrixWorld(true); danceApply(R, Q, null); R.root.updateMatrixWorld(true);
  let m = 9; for (const j of Q.kneel ? [R.LA.kn, R.LB.kn] : [R.LA.ft, R.LB.ft]) m = Math.min(m, W(j).y); R.root.position.y += (Q.kneel ? 0.06 : 0.035) - m + (Q.air || 0); R.root.updateMatrixWorld(true);
  danceApply(R, Q, { pole: V(0, 0, 0) });
  const piv = new THREE.Group(); piv.rotation.y = affYaw(dir); piv.position.set(off[0], 0, off[1]); piv.add(R.root); piv.updateMatrixWorld(true);
  const { renderer, scene, cam } = R3; scene.add(piv); renderer.render(scene, cam); scene.remove(piv); piv.remove(R.root);
  const cv = document.createElement('canvas'); cv.width = R3.W; cv.height = R3.H; cv.getContext('2d').drawImage(renderer.domElement, 0, 0);
  return { c: cv, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; }
if (typeof npcSprite3D === 'function' && typeof G !== 'undefined') { const _nsBj = npcSprite3D; npcSprite3D = function (kind, P) { const nid = P && P.nid ? String(P.nid) : '', d = nid && G.npcDz && G.npcDz[nid];
  if (!d || !R3.ok || (P && (P.down || P.sit))) return _nsBj.apply(this, arguments);
  const e = G.npcs && G.npcs[nid];
  if (d.j && e && e.walking) { delete G.npcDz[nid]; try { return _nsBj.apply(this, arguments); } finally { G.npcDz[nid] = d; } }   /* quem entrou na dança e saiu andando anda normal */
  const F = bjFrame(d); if (F && F.st.pole) { const off = bjPoleOff(nid); if (off) { const dir = P.dir | 0; return cache3('dzp|' + nid + '|' + F.st.id + '|' + F.f + '|' + (d.mir ? 1 : 0) + '|' + dir + '|' + off.join(','), () => bjPoleSprite(kind, nid, F, d, dir, off), 'n|' + kind + '#' + nid + dir); } }
  return _nsBj.apply(this, arguments); }; }
