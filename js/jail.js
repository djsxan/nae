// ============================================================
//  CADEIA E GUILHOTINA NO CLIENTE — estado da guilhotina, execução animada com multidão,
//  anel do mata-leão, minijogo da fechadura, abrir cela de noite, passar itens, carcereiro.
// ============================================================
G.execS = null;
function guilState() {
  const X = G.execS; if (!X) return 0; const t = performance.now() - X.t0;
  if (t < X.T.lock) return 0; if (t < X.T.drop) return 1; if (t < X.T.drop + 30000) return 2; G.execS = null; return 0;
}
function onExec(m, now) {
  G.execS = { t0: now, T: m.T, id: m.id };
  const v = G.players[m.id]; if (v) v.exec = { t0: now, T: m.T };
  G.shake = Math.max(G.shake, 2);
  const ex = G.npcs.executioner; if (ex) { later(m.T.announce, () => { ex.bubble = { t: '⚖', until: performance.now() + 3500 }; ex.dir = dirFromVec(STAGE.x - ex.rx, STAGE.y + 1 - ex.ry, ex.dir); }); }
  // multidão: quem está perto vira para olhar e reage quando a lâmina cai
  for (const id in G.npcs) {
    const e = G.npcs[id]; if (e === ex || e.npDead || e.npDown || dist(e.rx, e.ry, STAGE.x, STAGE.y) > 15) continue;
    e.watch = { x: STAGE.x, y: STAGE.y, until: now + m.T.fall + 6000 };
    const r = Math.random(), k = r < 0.3 ? 'fear' : r < 0.55 ? 'sad' : r < 0.8 ? 'anger' : 'cheer';
    later(m.T.drop + 250 + Math.random() * 500, () => { e.anim = { a: k, t0: performance.now(), ms: ACT_MS[k] }; e.bubble = { t: { fear: '!', sad: '…', anger: '‼', cheer: '♪' }[k], until: performance.now() + 2200 }; });
  }
  later(m.T.drop, () => { G.shake = Math.max(G.shake, 5); const p = iso(STAGE.x, STAGE.y); for (let k = 0; k < 14; k++) spawnPart('ember', p.sx + (Math.random() - 0.5) * 8, p.sy - 14); });
}
function jailEvent(m, now) {
  if (m.t === 'exec') { onExec(m, now); return true; }
  if (m.t === 'execabort') { const v = G.players[m.id]; if (v) v.exec = null; G.execS = null; return true; }
  return false;
}
// preso deitado de bruços na prancha, com o pescoço na luneta
function drawExecVictim(ctx, e, sx, sy, now) {
  const X = e.exec; if (!X || now > X.t0 + X.T.fall + 3000) return false;
  const P = iso(STAGE.x, STAGE.y + 0.5), x = P.sx + G.view.ox, y = P.sy + G.view.oy;
  const s = heroSprite3D(e.cls, e.skin, e.color, { dir: EXEC_DIR, walk: -1, down: true, prone: true, lost: now > X.t0 + X.T.drop ? (e.lost || 0) | 1 : e.lost || 0 });
  ctx.imageSmoothingEnabled = true; pblit(ctx, woundOf(s, 2), x, y - 17); e._spr = null; return true;
}
let EXEC_DIR = 3;
// os NPCs da multidão olham para a guilhotina
function crowdLook(now) { for (const id in G.npcs) { const e = G.npcs[id]; if (e.watch && now < e.watch.until && !e.walking) e.dir = dirFromVec(e.watch.x - e.rx, e.watch.y - e.ry, e.dir); } }

// ---------- mata-leão: anel que enche enquanto aperta ----------
function drawChokeRing(ctx, now) {
  const me = G.me; if (!me || me.dragMode !== 'grip') { G.chkL = 0; return; }
  const dt = Math.min(0.1, (now - (G.chkT || now)) / 1000); G.chkT = now;
  if (G.choking) G.chkL = Math.min(10, (G.chkL || 0) + dt); else G.chkL = Math.max(0, (G.chkL || 0) - dt * 0.6);
  if (me.chk && Math.abs(me.chk - G.chkL) > 0.6) G.chkL = me.chk;
  const k = G.chkL / 10; if (k <= 0 && !G.choking) return;
  const p = iso(me.rx, me.ry), x = p.sx + G.view.ox + 22, y = p.sy + G.view.oy - 62, R = 9;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
  const a0 = -Math.PI / 2, mid = a0 + Math.PI;
  ctx.strokeStyle = '#e8c45a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R, a0, a0 + Math.min(k, 0.5) * Math.PI * 2); ctx.stroke();
  if (k > 0.5) { ctx.strokeStyle = '#d83a2a'; ctx.beginPath(); ctx.arc(x, y, R, mid, a0 + k * Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 0.6, y + R - 2, 1.2, 4);   // marca do desmaio (metade)
  ctx.font = 'bold 6px serif'; ctx.textAlign = 'center'; ctx.fillStyle = k > 0.5 ? '#ff8a7a' : '#fff2c0'; ctx.fillText(k < 0.5 ? 'sufocando' : 'desmaiado', x, y + R + 8);
  ctx.restore();
}

// ---------- celas: colisão no cliente, prompts, fechadura, abrir de noite ----------
function myCell() { const me = G.me; return me && me.jl > 0 && me.cell >= 0 ? JAILCELLS[me.cell] : null; }
function jailBlock(x, y) {
  const t = Math.round(y) * MAP_W + Math.round(x), c = myCell();
  if (c) return !c.tiles.has(t);
  for (const q of JAILCELLS) if (q.door[1] * MAP_W + q.door[0] === t) return true;
  return false;
}
function cellDoorNear(r = 1.6) { const me = G.me; for (let i = 0; i < JAILCELLS.length; i++) { const c = JAILCELLS[i]; if (dist(c.door[0], c.door[1], me.x, me.y) < r) return i; } return -1; }
function jailPrompt() {
  const me = G.me, c = myCell();
  if (c) return dist(c.door[0], c.door[1], me.x, me.y) < 1.6 ? 'F: tentar arrombar a fechadura · ' + Math.ceil(me.jl / 60000) + ' min de pena' : 'Preso: ' + Math.ceil(me.jl / 60000) + ' min · durma no catre para passar mais rápido';
  const i = cellDoorNear(); if (i >= 0) { for (const id in G.players) { const q = G.players[id]; if (q.jailed && dist(q.rx, q.ry, JAILCELLS[i].spot[0], JAILCELLS[i].spot[1]) < 1) return 'F: abrir a cela (só de noite, com o carcereiro dormindo) · Shift+clique num item do inventário passa pelas grades'; } }
  return '';
}
function jailKeyF() {
  const me = G.me, c = myCell();
  if (c) { if (dist(c.door[0], c.door[1], me.x, me.y) < 1.6) { startLockpick(); return true; } return false; }
  const i = cellDoorNear(); if (i >= 0) { Net.send({ t: 'opencell' }); return true; }
  return false;
}
// minijogo: um marcador vai e volta; aperte ESPAÇO dentro da faixa verde 3 vezes (errar quebra a gazua)
function startLockpick() {
  if (G.pick) return; Net.send({ t: 'pickstart' });
  G.pick = { t0: performance.now(), hits: 0, zone: 0.3 + Math.random() * 0.4, w: 0.16, sp: 0.9 };
}
function lockpickKey() {
  const L = G.pick; if (!L) return false; const pos = lockPos(L);
  if (Math.abs(pos - L.zone) < L.w / 2) { L.hits++; L.zone = 0.15 + Math.random() * 0.7; L.w *= 0.85; L.sp *= 1.2; if (L.hits >= 3) { const wait = Math.max(0, 3100 - (performance.now() - L.t0)); G.pick = null; later(wait, () => Net.send({ t: 'pick', ok: 1 })); } }
  else { const wait = Math.max(0, 3100 - (performance.now() - L.t0)); G.pick = null; later(wait, () => Net.send({ t: 'pick', ok: 0 })); showToast('A gazua escorregou...'); }
  return true;
}
const lockPos = L => { const t = (performance.now() - L.t0) / 1000 * L.sp; return 0.5 + 0.5 * Math.sin(t * Math.PI); };
function drawLockpick(ctx) {
  const L = G.pick; if (!L) return; const me = G.me, p = iso(me.rx, me.ry), x = p.sx + G.view.ox, y = p.sy + G.view.oy - 80, W2 = 60;
  ctx.save(); ctx.fillStyle = 'rgba(10,8,6,0.8)'; ctx.fillRect(x - W2 / 2 - 3, y - 9, W2 + 6, 20);
  ctx.fillStyle = '#3a3428'; ctx.fillRect(x - W2 / 2, y - 3, W2, 6);
  ctx.fillStyle = '#5ac85a'; ctx.fillRect(x - W2 / 2 + (L.zone - L.w / 2) * W2, y - 3, L.w * W2, 6);
  ctx.fillStyle = '#fff2c0'; ctx.fillRect(x - W2 / 2 + lockPos(L) * W2 - 1, y - 6, 2, 12);
  ctx.font = 'bold 6px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('ESPAÇO na faixa verde · ' + L.hits + '/3', x, y + 9); ctx.restore();
}
// passar item pelas grades: Shift+clique no item do inventário com um preso perto
function giveToPrisoner(k) {
  const me = G.me; let best = null, bd = 2.2; for (const id in G.players) { const q = G.players[id]; if (q === me || !q.jailed) continue; const d = dist(q.rx, q.ry, me.x, me.y); if (d < bd) { bd = d; best = q; } }
  if (!best) return false; Net.send({ t: 'give', to: best.id, k }); return true;
}
// carcereiro: cochila de noite
function jailerNight() { const e = G.npcs.jailer; if (!e || e.npDead || e.npDown || e.dragged) return; const night = dayInfo().night; e.custP = night ? { sit: 'g', doze: 1 } : null; }
