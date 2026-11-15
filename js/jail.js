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
  const P = iso(STAGE.x, STAGE.y + 0.65), x = P.sx + G.view.ox, y = P.sy + G.view.oy - 12;
  const s = heroSprite3D(e.cls, e.skin, e.color, { dir: 2, walk: -1, down: true, prone: true, lost: now > X.t0 + X.T.drop ? (e.lost || 0) | 1 : e.lost || 0 });
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); ctx.rotate(-0.4636); const w = woundOf(s, 2); ctx.drawImage(w.c, -w.ax, -w.ay + 8, w.w, w.h); ctx.restore(); e._spr = null; return true;
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

// ---------- portas das celas que giram (desenhadas à parte, por cima do interior) ----------
G.cellAng = [];
function cellDoorItems(items, inB, now) {
  if (!JAILCELLS.length || inB !== JAILCELLS[0].bi) return;
  const dt = Math.min(0.1, (now - (G.cellT || now)) / 1000); G.cellT = now;
  JAILCELLS.forEach((c, i) => {
    const want = (G.cellOpen && G.cellOpen[i]) ? 1 : 0; G.cellAng[i] = (G.cellAng[i] || 0) + (want - (G.cellAng[i] || 0)) * Math.min(1, dt * 5);
    const p = iso(c.door[0], c.door[1]); items.push({ d: c.door[0] + c.door[1] + 0.05, k: 6, cell: i, sx: p.sx + G.view.ox, sy: p.sy + G.view.oy, inside: true });
  });
}
function drawCellDoor(ctx, it) {
  const c = JAILCELLS[it.cell], a = (G.cellAng[it.cell] || 0) * 1.45;
  const ax = c.door[0] - c.spot[0], ay = c.door[1] - c.spot[1], ux = -ay, uy = ax;                       // ao longo da grade
  const hx = c.door[0] + ux * 0.47, hy = c.door[1] + uy * 0.47;                                          // dobradiça
  const ex = hx - (Math.cos(a) * ux - Math.sin(a) * ax) * 0.94, ey = hy - (Math.cos(a) * uy - Math.sin(a) * ay) * 0.94;   // abre para o corredor
  const P = (x, y) => { const q = iso(x, y); return [q.sx + G.view.ox, q.sy + G.view.oy]; }, [x0, y0] = P(hx, hy), [x1, y1] = P(ex, ey), H = 2.05 * (typeof HV !== 'undefined' ? HV : 25);
  ctx.save(); ctx.lineCap = 'round';
  for (let k = 0; k <= 6; k++) { const t = k / 6, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; ctx.strokeStyle = '#1e1c1a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - H); ctx.stroke(); ctx.strokeStyle = '#5a5652'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - 0.4, y); ctx.lineTo(x - 0.4, y - H); ctx.stroke(); }
  for (const hh of [0.05, 0.5, 0.97]) { ctx.strokeStyle = '#2a2826'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x0, y0 - H * hh); ctx.lineTo(x1, y1 - H * hh); ctx.stroke(); }
  const lx = x0 + (x1 - x0) * 0.82, ly = y0 + (y1 - y0) * 0.82 - H * 0.5; ctx.fillStyle = '#6a5a32'; ctx.fillRect(lx - 3, ly - 4, 6, 8); ctx.fillStyle = '#1a1410'; ctx.fillRect(lx - 0.7, ly - 1.5, 1.4, 3);
  ctx.restore();
}
// ---------- condenado: últimas palavras e fiança na hora ----------
G.condemned = new Set();
function lawEvent(m, now) {
  if (m.t === 'condemned') { if (m.on) G.condemned.add(m.id); else G.condemned.delete(m.id); updateLawUI(); return true; }
  if (m.t === 'pbubble') { const e = G.players[m.id]; if (e) e.bubble = { t: '“' + m.text + '”', until: now + 7000 }; return true; }
  return false;
}
function updateLawUI() {
  let box = $('lawui');
  if (!box) {
    box = document.createElement('div'); box.id = 'lawui';
    box.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:60;display:flex;flex-direction:column;gap:6px;align-items:center;font-family:inherit';
    document.body.appendChild(box);
  }
  const me = G.me; if (!me) return;
  const sig = [...G.condemned].filter(id => id === G.myId || (G.players[id] && dist(G.players[id].rx, G.players[id].ry, me.x, me.y) <= 14)).join(',');
  if (sig === G.lawSig) return; G.lawSig = sig; box.innerHTML = '';
  if (G.condemned.has(G.myId)) {
    const row = document.createElement('div'); row.className = 'gpanel'; row.style.cssText = 'position:static;display:flex;gap:8px;align-items:center;padding:8px 10px';
    row.innerHTML = '<b style="white-space:nowrap">Últimas palavras</b><input id="lastw" maxlength="120" placeholder="Escreva e aperte Enter" style="width:min(360px,52vw)"><button class="btn" id="lastw-go">Dizer</button><button class="btn gold" id="ebail">Fiança: 1000 ouro</button>';
    box.appendChild(row);
    const go = () => { const v = $('lastw').value.trim(); if (!v) return; Net.send({ t: 'lastwords', text: v }); row.querySelector('#lastw').disabled = true; row.querySelector('#lastw-go').disabled = true; };
    row.querySelector('#lastw').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    row.querySelector('#lastw-go').onclick = go; row.querySelector('#ebail').onclick = () => Net.send({ t: 'execbail' });
  }
  for (const id of G.condemned) {
    if (id === G.myId) continue; const q = G.players[id]; if (!q || dist(q.rx, q.ry, me.x, me.y) > 14) continue;
    const b = document.createElement('button'); b.className = 'btn gold'; b.textContent = 'Pagar a fiança de ' + q.name + ' (1000 ouro) e salvá-lo da guilhotina';
    b.onclick = () => Net.send({ t: 'execbail', who: id }); box.appendChild(b);
  }
}
function boundNear() { const me = G.me; for (const id in G.players) { const q = G.players[id]; if (q !== me && q.bound && dist(q.rx, q.ry, me.x, me.y) < 1.8) return q; } return null; }
function drawPlayerBubble(ctx, e, sx, sy, now) {
  if (!e.bubble || now > e.bubble.until) return;
  ctx.save(); ctx.font = 'italic 8px serif'; ctx.textAlign = 'center'; const w = Math.min(160, ctx.measureText(e.bubble.t).width + 10);
  ctx.fillStyle = 'rgba(245,236,214,0.95)'; ctx.strokeStyle = 'rgba(60,40,20,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - w / 2, sy - 92, w, 14, 3) : ctx.rect(sx - w / 2, sy - 92, w, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2a1a0a'; ctx.fillText(e.bubble.t.length > 34 ? e.bubble.t.slice(0, 33) + '…”' : e.bubble.t, sx, sy - 82); ctx.restore();
}
setInterval(() => { if (G.started && G.condemned.size) updateLawUI(); }, 2000);
