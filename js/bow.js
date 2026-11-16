// ============================================================
//  ARCO — segurar o clique esquerdo puxa a corda, soltar dispara, botão direito relaxa.
//  Depois de cada tiro o arqueiro pega outra flecha na aljava. A flecha voa de verdade
//  (com queda) e fica cravada onde acertou: no corpo, no chão, em árvores e paredes.
// ============================================================
G.bow = { st: 'ready' };
G.flyArrows = {}; G.gArrows = []; G.corpseArrows = {};
const isArcher = () => G.me && G.me.cls === 'archer';
function bowPress() {
  const b = G.bow, now = performance.now(), me = G.me; if (!me || me.downed || me.carrying || me.shea) return;   // arco guardado: sem mira
  if (b.st === 'nocking' && now < b.until) { b.want = true; return; }
  b.st = 'drawing'; b.t0 = now; b.want = false; Net.send({ t: 'draw', on: 1 });
}
function bowRelease() {
  const b = G.bow; b.want = false; if (b.st !== 'drawing') return;
  const now = performance.now(), pow = Math.min(1, (now - b.t0) / BOW.draw);
  if (pow < 0.15) { bowCancel(); return; }
  const S0 = arrowAim(now);
  Net.send({ t: 'loose', a: S0.a, tx: S0.tx, ty: S0.ty, pow, th: S0.th });
  b.st = 'nocking'; b.until = now + BOW.loose + BOW.nock;
}
function bowCancel() { if (G.bow.st === 'drawing') Net.send({ t: 'draw', on: 0 }); G.bow.st = 'ready'; }
function bowUpdate(now) {
  const b = G.bow; if (!isArcher()) return;
  if (G.me.shea && b.st !== 'ready') { bowCancel(); b.want = false; }
  if (b.st === 'nocking' && now >= b.until) { b.st = 'ready'; if (b.want && G.mouse0) bowPress(); }
}
const bowPow = now => G.bow.st === 'drawing' ? Math.min(1, (now - G.bow.t0) / BOW.draw) : 0;
const bowSway = now => G.bow.st === 'drawing' ? Math.max(0, now - G.bow.t0 - BOW.draw - BOW.holdSway) / 1000 : 0;

// pose de puxar a corda (eu e os outros arqueiros)
function bowPose(e, now) {
  const t0 = e === G.me ? (G.bow.st === 'drawing' ? G.bow.t0 : 0) : e.bowDrawT;
  if (!t0 || e.cls !== 'archer') return null;
  const k = Math.min(1, (now - t0) / BOW.draw), held = now - t0 - BOW.draw;
  let f = Math.floor(k * 11); if (held > BOW.holdSway && Math.floor(now / 90) % 2) f = 10;   // braço tremendo
  return { k: 'bowdraw', f };
}

// ---------- mira em arco: a mesma física do servidor (passos de 25 ms), então o que você vê é onde a flecha vai ----------
function arrowAim(now) {
  const me = G.me, pow = Math.max(0.15, bowPow(now)), sw = Math.min(1.5, bowSway(now)) + ((me.arrows || []).filter(q => q.part === 'armA' || q.part === 'armB').length) * 0.4;
  if (G.mouseS && typeof screenToWorld === 'function') G.mouseW = screenToWorld(G.mouseS[0], G.mouseS[1]);
  const w0 = G.mouseW || { x: me.x + Math.cos(me.fa ?? 0) * 6, y: me.y + Math.sin(me.fa ?? 0) * 6 };
  const a = Math.atan2(w0.y - me.y, w0.x - me.x) + Math.sin(now / 140) * sw * 0.07 + Math.sin(now / 53) * sw * 0.025;   // direto para o cursor (sem assistência), com tremor visível
  const r0 = dist(me.x, me.y, w0.x, w0.y), w = { x: me.x + Math.cos(a) * r0, y: me.y + Math.sin(a) * r0 };
  let aimH = 0.05, bd = 1.3;
  for (const id in G.monsters) { const q = G.monsters[id]; if (q.dieAt) continue; const d = dist(q.rx, q.ry, w.x, w.y); if (d < bd && (q.alt || 0) < 1.2) { bd = d; aimH = (MON_HT[q.type] || 1.6) * 0.62; } }
  for (const id in G.players) { const q = G.players[id]; if (q === me || !q.visible) continue; const d = dist(q.rx, q.ry, w.x, w.y); if (d < bd) { bd = d; aimH = q.downed ? 0.3 : 1.15; } }
  const D = clamp(dist(me.x, me.y, w.x, w.y), 0.5, BOW.maxRange) * 2, v = (BOW.vMin + (BOW.vMax - BOW.vMin) * pow) * 2, g = BOW.g;
  const h0 = ((me.z || 0) >= 0.5 ? 3.5 : 0) + 1.45, dh = (groundH(w.x, w.y) + aimH) - h0, disc = v ** 4 - g * (g * D * D + 2 * dh * v * v);
  const th = disc >= 0 ? Math.atan((v * v - Math.sqrt(disc)) / (g * D)) : Math.PI / 4;
  return { a, th, v, h0, pow, tx: w.x, ty: w.y, reach: disc >= 0 };
}
function arrowPath(S0) {   // simula até bater em algo; devolve pontos e o que acertou
  const me = G.me, SUB = 0.025, pts = []; let x = me.x + Math.cos(S0.a) * 0.45, y = me.y + Math.sin(S0.a) * 0.45, h = S0.h0, vx = Math.cos(S0.a) * S0.v * Math.cos(S0.th) / 2, vy = Math.sin(S0.a) * S0.v * Math.cos(S0.th) / 2, vz = S0.v * Math.sin(S0.th);
  const fa = Math.atan2(vy, vx);
  const tg = [];
  for (const id in G.monsters) { const q = G.monsters[id]; if (q.dieAt || (q.alt || 0) > 1.2) continue; tg.push({ x: q.rx, y: q.ry, r: Math.max(0.3, Math.min(1.6, MON[q.type].rad || 0.35)), H: MON_HT[q.type] || 1.6, base: (q.z || 0) >= 0.5 ? 3.5 : 0, k: 'm' }); }
  for (const id in G.players) { const q = G.players[id]; if (q === me || !q.visible || q.fl > 0) continue; tg.push({ x: q.rx, y: q.ry, r: 0.32, H: q.downed ? 0.45 : 1.8, base: (q.z || 0) >= 0.5 ? 3.5 : 0, k: 'p', down: q.downed }); }
  for (const id in G.npcs) { const q = G.npcs[id]; if (q.npDead || q.onBackBy) continue; tg.push({ x: q.rx, y: q.ry, r: 0.32, H: q.npDown ? 0.45 : 1.8, base: 0, k: 'n' }); }
  for (let s = 0; s < 200; s++) {
    x += vx * SUB; y += vy * SUB; vz -= BOW.g * SUB; h += vz * SUB; if (s % 2 === 0) pts.push([x, y, h]);
    for (const T0 of tg) { const dx = x - T0.x, dy = y - T0.y; if (dx * dx + dy * dy > T0.r * T0.r) continue; const rel = (h - T0.base) / T0.H; if (rel < 0 || rel > 1.05) continue; const lat = (-dx * Math.sin(fa) + dy * Math.cos(fa)) / T0.r; pts.push([x, y, h]); return { pts, hit: T0, part: T0.k === 'p' && T0.down ? 'torso' : arrowPart(rel, lat), x, y, h }; }
    const t = tileAt(x, y), o = WORLD.obj[t], gh = groundH(x, y);
    if (!inBounds(Math.round(x), Math.round(y)) || (WORLD.bld[t] >= 0 && h < gh + 5.5) || (BLOCKING.has(o) && h < gh + OBST_H(o)) || h <= gh) { pts.push([x, y, Math.max(gh, h)]); return { pts, hit: null, x, y, h: Math.max(gh + 0.05, Math.min(h, gh + 3)), wall: h > gh + 0.2 }; }
  }
  return { pts, hit: null, x, y, h };
}
const PART_PT = { head: 'cabeça', torso: 'tronco', armA: 'braço', armB: 'braço', legL: 'perna', legR: 'perna' };
function drawArc(ctx, now) {
  const me = G.me, ox = G.view.ox, oy = G.view.oy, S0 = arrowAim(now), R = arrowPath(S0), pw = bowPow(now), full = pw >= 1;
  ctx.save();
  // trajetória: pontinhos que ficam mais fortes perto do fim, cor pela força
  const col = full ? (bowSway(now) > 0 ? '255,140,90' : '255,226,140') : '255,255,255';
  { const P2 = R.pts.map(([x, y, h]) => { const p = iso(x, y); return [p.sx + ox, p.sy + oy - h * 25]; });
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2.2; ctx.beginPath(); P2.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    ctx.setLineDash([3, 2.2]); ctx.lineDashOffset = -now / 60; ctx.strokeStyle = 'rgba(' + col + ',0.9)'; ctx.lineWidth = 1.1; ctx.beginPath(); P2.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]); }
  // sombra da trajetória no chão (ajuda a ler distância)
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]); ctx.beginPath(); R.pts.forEach(([x, y], i) => { const p = iso(x, y); if (i) ctx.lineTo(p.sx + ox, p.sy + oy); else ctx.moveTo(p.sx + ox, p.sy + oy); }); ctx.stroke(); ctx.setLineDash([]);
  const pe = iso(R.x, R.y), ex = pe.sx + ox, ey = pe.sy + oy;
  if (R.hit) { const ph = ey - R.h * 25; ctx.strokeStyle = 'rgba(255,70,50,0.95)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(ex, ph, 3.2, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex - 5, ph); ctx.lineTo(ex - 2, ph); ctx.moveTo(ex + 2, ph); ctx.lineTo(ex + 5, ph); ctx.stroke(); ctx.fillStyle = '#ffd0c0'; ctx.font = 'bold 6px serif'; ctx.textAlign = 'center'; ctx.fillText(PART_PT[R.part] || '', ex, ph - 6); }
  else { const hy = ey - (R.wall ? R.h * 25 : 0); ctx.strokeStyle = 'rgba(' + col + ',0.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ex - 4, hy - 2); ctx.lineTo(ex + 4, hy + 2); ctx.moveTo(ex + 4, hy - 2); ctx.lineTo(ex - 4, hy + 2); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(ex, ey, 6, 3, 0, 0, 7); ctx.stroke(); }
  if (!S0.reach && pw > 0) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '6px serif'; ctx.textAlign = 'center'; const pm = iso(S0.tx, S0.ty); ctx.fillText(full ? 'longe demais' : 'puxe mais', pm.sx + ox, pm.sy + oy + 10); }
  ctx.restore();
}
// ---------- desenho: flechas voando, cravadas no corpo e no chão, mira ----------
// flecha: haste de freixo, ponta de aço com brilho, três penas (duas brancas e uma vermelha) e o entalhe no fim
function arrowShaft(ctx, bx, by, dx, dy, L, up, head) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const ex = bx - dx * L, ey = by - dy * L - (up || 0);
  const fx = ex - bx, fy = ey - by, fl = Math.hypot(fx, fy) || 1, ux = fx / fl, uy = fy / fl, nx = -uy, ny = ux;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30,18,8,0.5)'; ctx.lineWidth = 1.0; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = '#c49a64'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,210,0.5)'; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(bx + nx * 0.18, by + ny * 0.18); ctx.lineTo(ex + nx * 0.18, ey + ny * 0.18); ctx.stroke();
  if (head) {   // ponta larga de aço (para quem vê a flecha voando)
    const tx = bx - ux * 2.6, ty = by - uy * 2.6;
    ctx.fillStyle = '#7e858c'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx + nx * 0.95, by + ny * 0.95); ctx.lineTo(bx + ux * 0.5, by + uy * 0.5); ctx.lineTo(bx - nx * 0.95, by - ny * 0.95); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(230,240,250,0.85)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx + ux * 0.4, by + uy * 0.4); ctx.stroke();
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(bx + ux * 0.4 + nx * 0.4, by + uy * 0.4 + ny * 0.4); ctx.lineTo(bx + ux * 0.4 - nx * 0.4, by + uy * 0.4 - ny * 0.4); ctx.stroke();   // amarração
  }
  // penas: três aletas curvas recuadas do fim
  const f0x = ex - ux * 0.8, f0y = ey - uy * 0.8, f1x = ex - ux * 4.2, f1y = ey - uy * 4.2;
  const vane = (s, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(f1x, f1y); ctx.quadraticCurveTo(f1x + nx * s * 1.3 - ux * 1.2, f1y + ny * s * 1.3 - uy * 1.2, f0x + nx * s * 1.5, f0y + ny * s * 1.5); ctx.lineTo(f0x, f0y); ctx.closePath(); ctx.fill(); };
  vane(1, '#ece6d6'); vane(-1, '#e2dccb'); vane(0.35, '#b0322a');
  ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(ex - ux * 0.5, ey - uy * 0.5); ctx.lineTo(ex + ux * 0.3, ey + uy * 0.3); ctx.stroke();   // entalhe
}
function drawStuck(ctx, e, sx, sy, now, lyingDir) {
  if (!e.arrows || !e.arrows.length) return;
  const lying = lyingDir != null || e.downed;
  for (const a of e.arrows) {
    const rot = ((e.dir || 0) - (a.dir0 || 0)) * Math.PI / 4;
    let lx = a.lx * Math.cos(rot) - a.ly * Math.sin(rot), ly = a.lx * Math.sin(rot) + a.ly * Math.cos(rot), hz = a.h;
    if (lying) {   // corpo no chão: a altura vira posição ao longo do corpo deitado
      const bd = (lyingDir != null ? lyingDir : (e.dir || 0)) * Math.PI / 4, along = (Math.min(1, a.h / (a.H || 1.8)) - 0.5) * (a.H || 1.8) * 0.45;
      lx = Math.cos(bd) * along + lx * 0.5; ly = Math.sin(bd) * along + ly * 0.5; hz = 0.25;
    }
    const fa = a.a + rot, bx = sx + (lx - ly) * 32, by = sy + (lx + ly) * 16 - hz * 25;
    arrowShaft(ctx, bx, by, (Math.cos(fa) - Math.sin(fa)) * 32, (Math.cos(fa) + Math.sin(fa)) * 16, 17, lying ? 8 : 3);
  }
}
function drawBowGround(ctx, now, P) {
  G.gArrows = G.gArrows.filter(a => now < a.t0 + a.ms);
  for (const a of G.gArrows) {
    const [x, y] = P(a.x, a.y, 0), by = y - a.h * 25, fade = Math.min(1, (a.t0 + a.ms - now) / 1500);
    ctx.globalAlpha = fade; arrowShaft(ctx, x, by, (Math.cos(a.a) - Math.sin(a.a)) * 32, (Math.cos(a.a) + Math.sin(a.a)) * 16, 16, Math.max(1, -Math.sin(a.pitch || -0.3) * 12)); ctx.globalAlpha = 1;
  }
}
function drawBowTop(ctx, now) {
  const ox = G.view.ox, oy = G.view.oy;
  for (const id in G.flyArrows) {
    const A = G.flyArrows[id], t = (now - A.t0) / 1000; if (t > 5) { delete G.flyArrows[id]; continue; }
    const x = A.x + A.vx * t, y = A.y + A.vy * t, h = A.h + A.vz * t - 0.5 * A.g * t * t, vz = A.vz - A.g * t;
    const p = iso(x, y), sx = p.sx + ox, sy = p.sy + oy - h * 25;
    const dx = (A.vx - A.vy) * 32, dy = (A.vx + A.vy) * 16 - vz * 25 * 0.5;
    ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; const l = Math.hypot(dx, dy) || 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx / l * 26, sy - dy / l * 26); ctx.stroke(); ctx.restore();
    arrowShaft(ctx, sx + dx / l * 6, sy + dy / l * 6, dx, dy, 15, 0, true);
  }
  // mira do arqueiro: puxando, mostra a trajetória em arco e onde a flecha cai; anel no cursor enche com a força
  if (isArcher() && G.mouseW && inCombatZone() && G.bow.st === 'drawing') drawArc(ctx, now);
  if (isArcher() && !G.me.shea && G.mouseW && inCombatZone()) {   // arco guardado: sem anel de mira
    const pw = bowPow(now), sw = 0, p = iso(G.mouseW.x, G.mouseW.y);
    const x = p.sx + ox, y = p.sy + oy;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 9, 4.5, 0, 0, 7); ctx.stroke();
    if (pw > 0) { ctx.strokeStyle = pw >= 1 ? (sw > 0 ? 'rgba(255,120,80,0.95)' : 'rgba(255,230,140,0.95)') : 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 9, 4.5, 0, -Math.PI / 2, -Math.PI / 2 + pw * Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
    if (G.bow.st === 'nocking') { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '7px serif'; ctx.textAlign = 'center'; ctx.fillText('pegando flecha', x, y + 13); }
    ctx.restore();
  }
}
// ---------- eventos do servidor ----------
function bowEvent(m, now) {
  switch (m.t) {
    case 'arrow': G.flyArrows[m.id] = { ...m, t0: now }; return true;
    case 'arrowend': delete G.flyArrows[m.id]; return true;
    case 'astick': G.gArrows.push({ ...m, t0: now }); if (G.gArrows.length > 160) G.gArrows.shift(); return true;
    case 'stick': {
      const e = (m.k === 'p' ? G.players : G.monsters)[m.id]; if (!e) return true;
      (e.arrows = e.arrows || []).push({ part: m.part, h: m.h, lx: m.lx, ly: m.ly, a: m.a, dir0: e.dir || 0, H: m.k === 'p' ? 1.8 : 1.6 });
      if (e.arrows.length > 14) e.arrows.shift();
      if (e === G.me && !G.arrowTip) { G.arrowTip = 1; showToast('Uma flecha cravou em você! F arranca (dói); a bandagem tira sem dor.'); }
      return true;
    }
    case 'unstick': { const e = G.players[m.id]; if (!e || !e.arrows) return true; if (m.all) e.arrows = []; else if (m.part) e.arrows = e.arrows.filter(a => a.part !== m.part); else e.arrows.pop(); return true; }
    case 'bowrelax': G.bow.st = 'ready'; return true;
  }
  return false;
}

// ---------- mira do corpo a corpo: segurando o clique, o arco do golpe aparece no chão até o alcance da arma ----------
function meleeReach(k) { const me = G.me, WP = WEAPONS[me.wpn === 'halberd' ? 'halberd' : 'sword'], B = STRIKES[k], M = MELEE[me.cls] || MELEE.knight; return { r: B.reach * M.reach * WP.reach, arc: B.arc * WP.arc, zone: B.zone }; }
function drawMeleeArc(ctx, now) {
  const me = G.me, M0 = G.melee; if (!me || !M0 || me.cls !== 'knight') return;
  const held = now - M0.t0, c = held < 150 ? 0 : Math.min(1, (held - 150) / 650), heavy = c >= HEAVY, R = meleeReach(M0.k), a = me.fa ?? 0, ox = G.view.ox, oy = G.view.oy;
  const P = (ang, r) => { const p = iso(me.rx + Math.cos(ang) * r, me.ry + Math.sin(ang) * r); return [p.sx + ox, p.sy + oy]; };
  ctx.save(); const col = heavy ? '232,70,50' : '240,220,150';
  ctx.beginPath(); const c0 = P(0, 0); ctx.moveTo(c0[0], c0[1]); for (let k = 0; k <= 16; k++) { const q = P(a - R.arc + 2 * R.arc * k / 16, R.r); ctx.lineTo(q[0], q[1]); } ctx.closePath();
  ctx.fillStyle = 'rgba(' + col + ',' + (0.1 + 0.18 * c) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(' + col + ',0.85)'; ctx.lineWidth = 1; ctx.stroke();
  // barra de carga na borda do arco
  ctx.beginPath(); for (let k = 0; k <= 16; k++) { const q = P(a - R.arc + 2 * R.arc * k / 16 * c, R.r + 0.08); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.strokeStyle = 'rgba(' + col + ',1)'; ctx.lineWidth = 2; ctx.stroke();
  // quem está dentro do arco fica marcado, com a parte do corpo que vai acertar
  const ZT = { head: 'cabeça', torso: 'tronco', legs: 'pernas' }, inside = (x, y, rad) => { const d = Math.hypot(x - me.rx, y - me.ry); if (d > R.r + rad) return false; let df = Math.atan2(y - me.ry, x - me.rx) - a; df = Math.atan2(Math.sin(df), Math.cos(df)); return Math.abs(df) <= R.arc + rad / Math.max(0.5, d); };
  const mark = (x, y) => { const p = iso(x, y), sx = p.sx + ox, sy = p.sy + oy; ctx.strokeStyle = 'rgba(' + col + ',0.95)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 3.5, 0, 0, 7); ctx.stroke(); ctx.fillStyle = heavy ? '#ffb0a0' : '#fff2c0'; ctx.font = 'bold 6px serif'; ctx.textAlign = 'center'; ctx.fillText(ZT[R.zone] + (heavy && R.zone === 'head' ? ' · FATAL' : heavy ? ' · forte' : ''), sx, sy - 38); };
  for (const id in G.monsters) { const q = G.monsters[id]; if (!q.dieAt && inside(q.rx, q.ry, (MON[q.type].rad || 0.3))) mark(q.rx, q.ry); }
  for (const id in G.players) { const q = G.players[id]; if (q !== me && q.visible && !q.downed && inside(q.rx, q.ry, 0.3)) mark(q.rx, q.ry); }
  for (const id in G.npcs) { const q = G.npcs[id]; if (!q.npDead && inside(q.rx, q.ry, 0.3)) mark(q.rx, q.ry); }
  ctx.restore();
}
