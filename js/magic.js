// ============================================================
//  MAGIA DO PENTAGRAMA — o Grimório do mago (árvore em forma de pentagrama wicca),
//  ícones das 5 magias base, a chama da Brasa na mão e o quinto espaço da barra
// ============================================================

// ---------- ícones das magias (medalhões da barra) ----------
if (typeof MEDAL_ICON !== 'undefined') Object.assign(MEDAL_ICON, {
  ember: '<path d="M20 52 v-14 q0 -4 3 -4 q3 0 3 4 v-8 q0 -4 3 -4 q3 0 3 4 v6 q0 -4 3 -4 q3 0 3 4 v4 q0 -3 3 -3 q3 0 3 3 v8 q0 10 -10 10 h-6 q-8 0 -9 -6" stroke-width="2.2"/><path d="M32 22 q-7 -6 -2 -14 q1 5 5 6 q4 -4 2 -10 q8 6 4 15 q-2 4 -9 3" stroke-width="2.2"/>',
  windstep: '<path d="M10 24 h26 q8 0 8 -6 q0 -6 -6 -6 q-5 0 -5 5" stroke-width="2.4"/><path d="M6 34 h38 q8 0 8 6 q0 6 -6 6 q-5 0 -5 -5" stroke-width="2.4"/><path d="M14 44 h14" stroke-width="2.2"/><path d="M48 22 l6 -4 M50 30 l7 0" stroke-width="1.6"/>',
  bloom: '<circle cx="32" cy="26" r="4" stroke-width="2"/><path d="M32 22 q-4 -10 0 -12 q4 2 0 12 M36 26 q10 -4 12 0 q-2 4 -12 0 M32 30 q4 10 0 12 q-4 -2 0 -12 M28 26 q-10 4 -12 0 q2 -4 12 0" stroke-width="2"/><path d="M32 42 v12 M32 50 q-8 -2 -10 -8 q8 0 10 6 M32 48 q7 -2 9 -7 q-7 0 -9 5" stroke-width="2"/><path d="M14 54 h36" stroke-width="2"/>',
  faith: '<circle cx="32" cy="22" r="7" stroke-width="2.2"/><path d="M32 8 v4 M32 32 v4 M18 22 h4 M42 22 h4 M22 12 l3 3 M42 12 l-3 3" stroke-width="1.8"/><path d="M16 54 q0 -12 8 -16 l8 6 l8 -6 q8 4 8 16" stroke-width="2.2"/><path d="M26 46 l6 4 l6 -4" stroke-width="1.6"/>',
  spring: '<path d="M32 10 q12 14 12 22 q0 12 -12 12 q-12 0 -12 -12 q0 -8 12 -22 Z" stroke-width="2.4"/><path d="M26 32 q0 6 6 7" stroke-width="1.8"/><path d="M12 52 q5 -4 10 0 t10 0 t10 0 t10 0" stroke-width="2"/>',
});

// ---------- quinto espaço da barra: só para quem tem 5 magias ----------
if (typeof buildHotbar === 'function') { const _bh = buildHotbar; buildHotbar = function () { const el = $('slot4'); if (el) el.style.display = G.me && SKILLS[G.me.cls].length > 4 ? '' : 'none'; return _bh.apply(this, arguments); }; }

// ---------- eventos das magias ----------
if (typeof progEvent === 'function') { const _pe = progEvent; progEvent = function (m, now) {
  if (m.t === 'medit') { const e = G.players[m.id]; if (e) e.medit = m.on ? { el: m.el, t0: now } : null; if (e === G.me && !m.on) { const d = document.getElementById('meditmenu'); if (d) d.remove(); } return true; }
  if (m.t === 'flamefx') { const e = G.players[m.id]; if (e) e.flame = m.on ? { a: m.a, r: m.r, until: now + 450 } : null; if (e && e === G.me && m.on) { G.faceLock = { a: m.a, until: now + 500 }; G.me.dir = dirFromVec(Math.cos(m.a), Math.sin(m.a), G.me.dir); } return true; }   /* o mago encara para onde o jato vai (também no automático) */
  if (m.t === 'ember') { const e = G.players[m.id]; if (e) e.emberUntil = m.ms ? now + m.ms : 0; return true; }
  if (m.t === 'mburn') { const e = G.monsters[m.id]; { const C = G.charMap[m.id]; G.charMap[m.id] = { c: Math.min(1, (C ? charOf(m.id, now) : 0) + 0.4), t: now }; } if (e) { e.burnUntil = now + m.ms; e.charUntil = now + m.ms + 20000; if (G.view) { const p = iso(e.rx, e.ry); sparkBurst(p.sx, p.sy - 18, FIRE_PAL[1], 12); } } return true; }   /* faíscas no impacto; chamuscado por 20 s */
  return _pe(m, now);
}; }

// ---------- Brasa na mão: chama e luz de tocha (desenhada junto do personagem) ----------
// ---------- Chamas: segurar a tecla 1 solta um jato contínuo na direção do mouse ----------
G.flame = G.flame || { on: false };
function flameAngle() { const me = G.me; if (!me) return 0; if (!G.mouseW) return me.fa ?? 0; return Math.atan2(G.mouseW.y - me.y, G.mouseW.x - me.x); }
function flameKey(e) { const me = G.me; if (!me || me.cls !== 'mage' || (typeof slotTreeNode === 'function' && slotTreeNode(0)) || !SKILLS.mage[0] || SKILLS.mage[0].id !== 'ember') return false; if (!e.repeat) flameStart(); return true; }
function flameStart() { const me = G.me; if (!me || me.downed || G.flame.on) return; if ((me.mp || 0) < 2) { showToast('Mana insuficiente.'); return; } G.flame.on = true; Net.send({ t: 'flame', on: 1, a: flameAngle() }); }
function flameStop() { if (!G.flame.on) return; G.flame.on = false; Net.send({ t: 'flame', on: 0 }); }
setInterval(() => { if (!G.flame.on || !G.me) return; if (G.me.downed) { flameStop(); return; } const a = flameAngle(); G.me.dir = dirFromVec(Math.cos(a), Math.sin(a), G.me.dir); Net.send({ t: 'flame', on: 1, a }); }, 150);   /* o mago se vira para onde o jato vai */
window.addEventListener('blur', () => flameStop());
// ---------- FOGO: jato do mago em dois estilos (pintado com fumaça / realista volumétrico) ----------
G.fireStyle = G.fireStyle || 'painted';
G.fireP = G.fireP || [];   /* partículas em coordenadas do mundo (arte), para o jato e a fumaça seguirem a câmera */
const FIRE_PAL = [   /* a cor esquenta com a maestria: laranja/vermelho -> núcleo amarelo-branco -> núcleo azul-branco */
  { core: [255, 214, 140], hot: [255, 150, 50], mid: [236, 84, 24], edge: [150, 30, 14] },
  { core: [255, 246, 200], hot: [255, 196, 80], mid: [252, 120, 30], edge: [190, 44, 16] },
  { core: [224, 242, 255], hot: [150, 200, 255], mid: [255, 214, 110], edge: [236, 96, 26] }];
function firePal(k) { const i = k < 0.38 ? 0 : k < 0.78 ? 1 : 2; return FIRE_PAL[i]; }
const lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function fireCol(pal, s) {   /* s: 0 (recém-saído, mais quente) a 1 (fim da chama) */
  if (s < 0.18) return lerpC(pal.core, pal.hot, s / 0.18); if (s < 0.5) return lerpC(pal.hot, pal.mid, (s - 0.18) / 0.32); return lerpC(pal.mid, pal.edge, Math.min(1, (s - 0.5) / 0.5)); }
const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
function flameGeom(e, F, now) {   /* de onde o jato sai (ponta do cajado) e até onde vai, em coordenadas de arte do mundo */
  const tipOk = e._tip && now - (e._tipT || 0) < 600, hp = iso(e.rx + Math.cos(F.a) * 0.3, e.ry + Math.sin(F.a) * 0.3);
  const t0 = tipOk ? e._tip : [hp.sx, hp.sy - 34], ep = iso(e.rx + Math.cos(F.a) * F.r, e.ry + Math.sin(F.a) * F.r), t1 = [ep.sx, ep.sy - 6];
  const dx = t1[0] - t0[0], dy = t1[1] - t0[1], L = Math.hypot(dx, dy) || 1; return { x0: t0[0], y0: t0[1], ux: dx / L, uy: dy / L, px: -dy / L, py: dx / L, L, k: Math.max(0, Math.min(1, (F.r - 2.5) / 3.5)) };
}
function fireSpawn(e, F, g, now, dt) {
  const real = G.fireStyle === 'real', n = real ? Math.round(36 * dt / 16) + 1 : Math.round(12 * dt / 16) + 1;
  for (let i = 0; i < n; i++) { const life = real ? 380 + Math.random() * 260 : 420 + Math.random() * 220, sp = (g.L / life) * (0.9 + Math.random() * 0.25);
    G.fireP.push({ k: 'f', x: g.x0 + g.px * (Math.random() - 0.5) * 2, y: g.y0 + g.py * (Math.random() - 0.5) * 2, vx: g.ux * sp, vy: g.uy * sp, sp: (Math.random() - 0.5) * (real ? 0.06 : 0.13), t0: now, life, seed: Math.random() * 100, pal: firePal(g.k), px: g.px, py: g.py, w: real ? 2.5 + Math.random() * 3 : 2.2 + Math.random() * 2.2, real }); }
  if (Math.random() < (real ? 0.9 : 0.45)) G.fireP.push({ k: 'e', x: g.x0 + g.ux * g.L * Math.random() * 0.8, y: g.y0 + g.uy * g.L * Math.random() * 0.8, vx: g.ux * 0.12 + (Math.random() - 0.5) * 0.06, vy: g.uy * 0.12 - 0.05 - Math.random() * 0.04, t0: now, life: 500 + Math.random() * 600, pal: firePal(g.k) });   /* brasa */
}
function fireStep(now, dt) {
  const out = [];
  for (const q of G.fireP) { const age = now - q.t0; if (age > q.life) { if (q.k === 'f' && Math.random() < (q.real ? 0.35 : 0.7)) out.push({ k: 's', x: q.x, y: q.y - 2, vx: q.vx * 0.2, vy: q.vy * 0.2 - 0.02, t0: now, life: 1600 + Math.random() * 1400, r: q.real ? 4 : 4.5, real: q.real }); continue; }   /* a chama que morre vira fumaça */
    if (q.k === 'f') { const s = age / q.life, wob = Math.sin(now / 45 + q.seed) * 0.6; q.x += (q.vx + q.px * q.sp * 6 * s + q.px * wob * 0.04) * dt; q.y += (q.vy + q.py * q.sp * 6 * s + q.py * wob * 0.04 - 0.004 * s) * dt; q.vx *= 0.995; q.vy *= 0.995; }   /* abre em cone e sobe um pouco no fim */
    else if (q.k === 's') { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.985; q.vy = q.vy * 0.985 - 0.00012 * dt; q.r += 0.012 * dt; }   /* fumaça: desacelera, sobe e se espalha */
    else if (q.k === 'e') { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 0.00022 * dt; }   /* brasa cai */
    out.push(q); }
  G.fireP = out.length > 1600 ? out.slice(out.length - 1600) : out;
}
function fireTongue(ctx, x, y, ux, uy, len, w, col, a, core) {   /* uma língua de fogo pintada: cabeça arredondada à frente, cauda fina para trás */
  const px = -uy, py = ux, hx = x + ux * len * 0.45, hy = y + uy * len * 0.45, tx = x - ux * len, ty = y - uy * len;
  ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.moveTo(tx, ty);
  ctx.bezierCurveTo(x + px * w * 0.9 - ux * len * 0.3, y + py * w * 0.9 - uy * len * 0.3, hx + px * w * 0.75, hy + py * w * 0.75, hx + ux * w * 0.3, hy + uy * w * 0.3);
  ctx.bezierCurveTo(hx - px * w * 0.75, hy - py * w * 0.75, x - px * w * 0.9 - ux * len * 0.3, y - py * w * 0.9 - uy * len * 0.3, tx, ty); ctx.fill();
  if (core) { ctx.fillStyle = rgba(core, a * 0.9); ctx.beginPath(); ctx.ellipse(x + ux * len * 0.1, y + uy * len * 0.1, len * 0.42, w * 0.32, Math.atan2(uy, ux), 0, 7); ctx.fill(); }
}
function fireDraw(ctx, now) {
  const ox = G.view.ox, oy = G.view.oy; if (!G.fireP.length) return;
  ctx.save();
  for (const q of G.fireP) if (q.k === 's') { const s = (now - q.t0) / q.life, a = (q.real ? 0.32 : 0.36) * Math.sin(Math.PI * Math.min(1, s * 1.4 + 0.08)) * (1 - s), g = ctx.createRadialGradient(q.x + ox, q.y + oy, 0, q.x + ox, q.y + oy, q.r); const c0 = q.dk ? '34,28,26' : '70,62,58', c1 = q.dk ? '52,46,44' : '96,88,84'; g.addColorStop(0, 'rgba(' + c0 + ',' + a.toFixed(3) + ')'); g.addColorStop(0.6, 'rgba(' + c1 + ',' + (a * 0.55).toFixed(3) + ')'); g.addColorStop(1, 'rgba(110,104,100,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x + ox, q.y + oy, q.r, 0, 7); ctx.fill(); }   /* fumaça atrás do fogo */
  const fl = G.fireP.filter(q => q.k === 'f' && !q.real);
  for (const pass of [0, 1, 2]) {   /* pintado em camadas: contorno escuro, corpo da chama e o núcleo claro */
    if (pass === 2) ctx.globalCompositeOperation = 'lighter';
    for (const q of fl) { const s = (now - q.t0) / q.life, x = q.x + ox, y = q.y + oy, l = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / l, uy = q.vy / l, len = 4 + s * 12 + Math.sin(now / 55 + q.seed) * 1.2, w = q.w * (0.7 + s * 2.1), fade = Math.pow(1 - s, 1.15);
      if (pass === 0) { if (s > 0.15 && s < 0.7) fireTongue(ctx, x, y, ux, uy, len * 1.06, w * 1.12, q.pal.edge, 0.16 * fade, null); }   /* contorno leve, só no meio da chama */
      else if (pass === 1) fireTongue(ctx, x, y, ux, uy, len, w, fireCol(q.pal, Math.min(1, s * 1.1 + 0.1)), (s < 0.45 ? 0.25 : 0.55) * fade, null);   /* as línguas aparecem mais no fim, onde o corpo se quebra */
      else if (s < 0.5) fireTongue(ctx, x, y, ux, uy, len * 0.7, w * 0.5, lerpC(q.pal.core, [255, 255, 255], 0.25), 0.55 * (1 - s / 0.5), null); } }
  ctx.globalCompositeOperation = 'lighter';
  for (const q of G.fireP) { const s = (now - q.t0) / q.life; if (q.k === 'f' && q.real) { const col = fireCol(q.pal, s), x = q.x + ox, y = q.y + oy, rr = q.w * (1 + s * 2.6), g = ctx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, rgba(col, 0.55 * (1 - s * 0.7))); g.addColorStop(0.5, rgba(col, 0.22 * (1 - s))); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); }
    else if (q.k === 'e') { const a = 1 - s; ctx.fillStyle = rgba(q.pal.hot, a); ctx.fillRect(q.x + ox - 0.4, q.y + oy - 0.4, 0.8, 0.8); } }
  ctx.restore();
}
// ---------- impactos: chamas que sobem (bicho em chamas, mato, fogueiras), chão queimado, fuligem e faíscas ----------
function paintFlameUp(ctx, x, y, s, now, seed, pal) {   /* labareda vertical pintada: contorno escuro, corpo e núcleo, com 3 a 5 línguas balançando */
  pal = pal || FIRE_PAL[0]; const N = 4, H = 16 * s;
  ctx.save();
  const tongue = (k, sc, col, a) => { const ph = now / (70 + k * 9) + seed + k * 1.7, sw = Math.sin(ph) * 2.2 * s + Math.sin(ph * 1.9) * 1.1 * s, hh = H * sc * (0.78 + 0.22 * Math.sin(ph * 1.3 + k)) * (k === 1 || k === 2 ? 1 : 0.72), w = 4.2 * s * sc * (k === 1 || k === 2 ? 1 : 0.75), bx = x + (k - 1.5) * 3.2 * s;
    ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.moveTo(bx - w, y); ctx.bezierCurveTo(bx - w * 1.1, y - hh * 0.45, bx + sw * 0.6 - w * 0.4, y - hh * 0.75, bx + sw, y - hh); ctx.bezierCurveTo(bx + sw * 0.6 + w * 0.4, y - hh * 0.75, bx + w * 1.1, y - hh * 0.45, bx + w, y); ctx.quadraticCurveTo(bx, y + w * 0.5, bx - w, y); ctx.fill(); };
  for (let k = 0; k < N; k++) tongue(k, 1.12, pal.edge, 0.55);
  for (let k = 0; k < N; k++) tongue(k, 0.95, pal.mid, 0.85);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 1; k < 3; k++) tongue(k, 0.6, pal.hot, 0.75);
  { const g = ctx.createRadialGradient(x, y - H * 0.18, 0, x, y - H * 0.18, H * 0.4); g.addColorStop(0, rgba(pal.core, 0.9)); g.addColorStop(1, rgba(pal.hot, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - H * 0.18, H * 0.32, H * 0.22, 0, 0, 7); ctx.fill(); }
  { const g = ctx.createRadialGradient(x, y, 0, x, y, H * 1.1); g.addColorStop(0, rgba(pal.mid, 0.22)); g.addColorStop(1, rgba(pal.mid, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, H * 1.1, H * 0.5, 0, 0, 7); ctx.fill(); }   /* brilho no chão */
  ctx.restore();
}
function liveFlame(ctx, x, y, s, now, seed) { paintFlameUp(ctx, x, y, s * 1.05, now, seed || 0, FIRE_PAL[0]); }   /* todo fogo do jogo que usa liveFlame fica pintado */
function fireSmokeAt(wx, wy, dark, r) { G.fireP.push({ k: 's', x: wx, y: wy, vx: (Math.random() - 0.5) * 0.004, vy: -0.022 - Math.random() * 0.01, t0: performance.now(), life: 1800 + Math.random() * 1400, r: r || 3.5, dk: dark ? 1 : 0 }); }
function drawOnFire(ctx, x, y, now, seed) {   /* bicho (ou gente) em chamas: labaredas pelo corpo, fumaça escura e luz */
  paintFlameUp(ctx, x - 5, y - 4, 0.55, now, seed); paintFlameUp(ctx, x + 5, y - 16, 0.48, now, seed + 3); paintFlameUp(ctx, x - 1, y - 28, 0.42, now, seed + 7);
  G.lights.push({ x, y: y - 22, r: 75, c: '255,140,50', a: 0.9, flick: 1 }); if (Math.random() < 0.3) fireSmokeAt(x - G.view.ox + (Math.random() - 0.5) * 8, y - G.view.oy - 38, true, 3);
}
G.scorch = G.scorch || [];   /* marcas de queimado no chão (coordenadas do mapa) */
function addScorch(x, y, size, ms, ember) { G.scorch.push({ x, y, r: size, t0: performance.now(), ms: ms || 30000, rot: Math.random() * 6.28, seed: Math.random() * 100, emb: ember !== false }); if (G.scorch.length > 220) G.scorch.shift(); }
function drawScorch(ctx, now, P) {   /* mancha preta irregular que esmaece, com brasas acesas no começo */
  G.scorch = G.scorch.filter(s => now - s.t0 < s.ms); if (!G.scorch.length) return;
  ctx.save();
  for (const s of G.scorch) { const [x, y] = P(s.x, s.y, 0), age = (now - s.t0) / s.ms, a = Math.min(1, (now - s.t0) / 400) * Math.min(1, (1 - age) * 1.6) * 0.62;
    ctx.fillStyle = 'rgba(24,16,10,' + a.toFixed(3) + ')'; ctx.beginPath(); for (let k = 0; k < 9; k++) { const an = s.rot + k / 9 * 6.283, rr = s.r * (0.7 + 0.3 * Math.sin(s.seed + k * 2.3)); ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.5); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(60,44,34,' + (a * 0.6).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x + s.r * 0.15, y - s.r * 0.05, s.r * 0.45, s.r * 0.2, s.rot, 0, 7); ctx.fill(); }   /* cinza no meio */
  ctx.globalCompositeOperation = 'lighter';
  for (const s of G.scorch) { if (!s.emb) continue; const t = now - s.t0; if (t > 9000) continue; const [x, y] = P(s.x, s.y, 0), a = (1 - t / 9000) * (0.6 + 0.4 * Math.sin(now / 130 + s.seed));
    for (let k = 0; k < 4; k++) { const an = s.seed + k * 1.9, rr = s.r * 0.55 * ((k * 37 % 10) / 10); ctx.fillStyle = 'rgba(255,' + (110 + k * 25) + ',40,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.5, 0.55, 0, 7); ctx.fill(); } }   /* brasas acesas */
  ctx.restore();
}
function sparkBurst(wx, wy, pal, n) { for (let k = 0; k < (n || 10); k++) { const a = Math.random() * 6.283, sp = 0.05 + Math.random() * 0.09; G.fireP.push({ k: 'e', x: wx, y: wy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 0.05, t0: performance.now(), life: 350 + Math.random() * 450, pal: pal || FIRE_PAL[1] }); } }
// ---------- carbonizado: cada queimadura escurece mais o bicho (e o corpo dele), com brasas nas rachaduras ----------
G.charMap = G.charMap || {};
function charOf(id, now) { const C = G.charMap[id]; if (!C) return 0; const age = now - C.t; if (age > 300000) { delete G.charMap[id]; return 0; } return C.c * (age < 120000 ? 1 : 1 - (age - 120000) / 180000); }
function charFilter(c) { return 'brightness(' + (1 - 0.78 * c).toFixed(3) + ') saturate(' + (1 - 0.9 * c).toFixed(3) + ') contrast(' + (1 + 0.3 * c).toFixed(3) + ') sepia(' + (0.25 * c).toFixed(3) + ')'; }
function drawEmberCracks(ctx, id, sx, sy, now, c, h) {   /* rachaduras em brasa sobre o corpo queimado */
  if (c < 0.25) return; const C = G.charMap[id], hot = C ? Math.max(0, 1 - (now - C.t) / 25000) : 0; if (hot <= 0) return; const sd = (id || 0) * 1.37;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) { const x0 = sx + Math.sin(sd + k * 2.3) * 7, y0 = sy - 6 - ((k * 13 + sd * 5) % (h || 26)), fl = 0.55 + 0.45 * Math.sin(now / 160 + k * 1.7 + sd), a = hot * c * fl;
    ctx.strokeStyle = 'rgba(255,' + (90 + k * 18) + ',30,' + a.toFixed(3) + ')'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 2 + (k % 3), y0 + 1.2); ctx.lineTo(x0 + 3.5, y0 - 0.8 + (k % 2)); ctx.stroke(); }
  ctx.restore();
}
function drawSoot(ctx, e, sx, sy, now) {   /* chamuscado: manchas de fuligem e fiapos de fumaça por um tempo depois de queimar */
  const left = (e.charUntil || 0) - now; if (left <= 0) return; const a = Math.min(1, left / 4000) * 0.45, sd = (e.id || 0) * 1.7;
  ctx.save(); ctx.fillStyle = 'rgba(20,14,10,' + a.toFixed(3) + ')'; for (let k = 0; k < 5; k++) { const ox = Math.sin(sd + k * 2.1) * 6, oy = -8 - (k * 7 % 22); ctx.beginPath(); ctx.ellipse(sx + ox, sy + oy, 3 + (k % 2) * 1.5, 2, sd + k, 0, 7); ctx.fill(); } ctx.restore();
  if (Math.random() < 0.06) fireSmokeAt(sx - G.view.ox + (Math.random() - 0.5) * 6, sy - G.view.oy - 20, true, 2.2);
  drawEmberCracks(ctx, e.id, sx, sy, now, charOf(e.id, now), 26);
}
// ---------- fogo dos móveis: lareiras, forja, lareira da taverna e irori ganham chamas pintadas animadas ----------
const FURN_FIRE = { fireplace: { h: 0.28, s: 0.75, w: 1 }, hearth: { h: 0.32, s: 1.05, w: 1 }, forge: { h: 0.46, s: 0.7, w: 2, sparks: 1 }, irori: { h: 0.06, s: 0.55, w: 1, smoke: 1 } };
const _furnFire = new Map();
function furnFires(bi, fl) {   /* lista (em cache) das bocas de fogo de um prédio/andar */
  const key = bi + ':' + fl; if (_furnFire.has(key)) return _furnFire.get(key); const b = BUILDINGS[bi], out = [];
  try { for (const f of interiorLayout(b, fl).F) { const D = FURN_FIRE[f.t]; if (!D) continue; const ci = f.i + (f.w - 1) / 2, cj = f.j + (f.h - 1) / 2; const [x, y] = fl ? localToWorld(b, f.i + f.w / 2, f.j + f.h / 2) : bLocal(b, ci, cj); out.push({ x, y, ...D, t: f.t, seed: x * 7 + y * 3 }); } } catch (e) { }
  _furnFire.set(key, out); return out;
}
function drawFurnFire(ctx, P, now) {
  const me = G.me; if (!me) return; const fl = me.fl || 0, bi = fl ? me.fb : (typeof bldAt === 'function' ? bldAt(me.x, me.y) : -1); if (bi == null || bi < 0 || !BUILDINGS[bi]) return;
  const b = BUILDINGS[bi], raise = fl ? fl * (bldDims(b).H / floorsOf(b)) * HV : 0;
  for (const F of furnFires(bi, fl)) { const q = P(F.x, F.y, 0), x = q[0], y = q[1] - raise - F.h * HV;
    if (F.w > 1) { paintFlameUp(ctx, x - 6, y, F.s * 0.8, now, F.seed, FIRE_PAL[0]); paintFlameUp(ctx, x + 6, y, F.s * 0.8, now, F.seed + 4, FIRE_PAL[1]); } else paintFlameUp(ctx, x, y, F.s, now, F.seed, FIRE_PAL[0]);
    G.lights.push({ x, y: y - 10, r: 60 + F.s * 40, c: '255,150,60', a: 0.95, flick: 1 });
    if (F.sparks && Math.random() < 0.12) sparkBurst(x - G.view.ox + (Math.random() - 0.5) * 10, y - G.view.oy - 6, FIRE_PAL[1], 3);   /* forja: faíscas */
    if (F.smoke && Math.random() < 0.05) fireSmokeAt(x - G.view.ox, y - G.view.oy - 16, false, 3); }
}
// ---------- varandas do prédio do dojô: o guarda-corpo fica na frente de quem está atrás dele (com os vãos entre as ripas) ----------
function drawRailOver(ctx, P, now) {
  const bi = BUILDINGS.findIndex(b => b.kind === 'dojo'); if (bi < 0) return; const b = BUILDINGS[bi], { H } = bldDims(b), nF = 4, fh = H / nF, w = b.w, h = b.h;
  const ents = []; for (const L of [G.players, G.npcs]) for (const id in L) { const e = L[id]; if (!e || !e._spr || (e.fl || 0) < 1 || e.fb !== bi || now - (e._drawT || 0) > 300) continue; ents.push(e); }
  if (!ents.length) return;
  const pr = (x, y, z) => { const [wx, wy] = localToWorld(b, x, z), q = P(wx, wy, 0); return [q[0], q[1] - y * HV]; };
  const line = (a, c, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); };
  for (const e of ents) { const s = e._spr, f = e.fl, y0 = f * fh, bw = f < nF - 1 ? w : 6, zf = h + 0.96, x0 = e._sx - s.ax, y0s = e._sy - s.ay;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0s, s.w, s.h); ctx.clip(); ctx.lineCap = 'butt';
    for (let x = 0.15; x < bw; x += 0.17) line(pr(x, y0 + 0.33, zf), pr(x, y0 + 0.91, zf), '#9a6a38', 0.55);   /* ripas */
    for (let x = 0; x <= bw + 0.001; x += 1) line(pr(x, y0 + 0.05, zf), pr(x, y0 + 0.97, zf), '#6a4422', 1.3);   /* pilares */
    line(pr(0, y0 + 0.93, zf), pr(bw, y0 + 0.93, zf), '#6a4422', 1.2); line(pr(0, y0 + 0.3, zf), pr(bw, y0 + 0.3, zf), '#6a4422', 0.7);   /* corrimão e travessa */
    for (const xe of [0, bw]) { for (let z = h + 0.15; z < zf; z += 0.17) line(pr(xe, y0 + 0.33, z), pr(xe, y0 + 0.91, z), '#9a6a38', 0.55); line(pr(xe, y0 + 0.93, h), pr(xe, y0 + 0.93, zf), '#6a4422', 1.1); }   /* pontas */
    ctx.restore(); }
}
G.fireLast = G.fireLast || 0;
function drawFlameFx(ctx, now) {
  const dt = Math.min(50, now - (G.fireLast || now)); G.fireLast = now;
  for (const id in G.players) { const e = G.players[id], F = e.flame; if (!F || now > F.until || !e.visible) continue;
    const g = flameGeom(e, F, now), ox = G.view.ox, oy = G.view.oy, pal = firePal(g.k);
    fireSpawn(e, F, g, now, dt);
    if (now - (e._scT || 0) > 110) { e._scT = now; const t = 0.35 + Math.random() * 0.65, j = (Math.random() - 0.5) * 0.5; addScorch(e.rx + Math.cos(F.a) * F.r * t - Math.sin(F.a) * j * t, e.ry + Math.sin(F.a) * F.r * t + Math.cos(F.a) * j * t, 9 + Math.random() * 8 * t, 30000); }   /* o jato chamusca o chão */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (G.fireStyle !== 'real') {   /* corpo contínuo do jato: cone pintado em três camadas, com a borda ondulando */
      const N = 16, BL = g.L * 0.62, W1 = Math.max(6, g.L * 0.17), X0 = g.x0 + ox, Y0 = g.y0 + oy;   /* o corpo cobre a primeira parte; o resto se quebra em línguas */
      const layer = (wm, stops, mode, ph) => { ctx.globalCompositeOperation = mode; const gr = ctx.createLinearGradient(X0, Y0, X0 + g.ux * BL, Y0 + g.uy * BL); for (const [o, c, al] of stops) gr.addColorStop(o, rgba(c, al)); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(X0 + g.px * 0.8, Y0 + g.py * 0.8);
        const side = sg => { for (let k = 1; k <= N; k++) { const kk = sg > 0 ? k : N + 1 - k, t = kk / N, w = (1.2 + W1 * Math.pow(t, 0.75) + (Math.sin(now / 58 + kk * 1.9 + ph + (sg > 0 ? 0 : 2.3)) * 2.2 + Math.sin(now / 31 + kk * 3.7 + ph) * 1.1) * t) * wm, ex = X0 + g.ux * BL * t, ey = Y0 + g.uy * BL * t; ctx.lineTo(ex + g.px * w * sg, ey + g.py * w * sg); if (sg > 0 && k === N) ctx.quadraticCurveTo(ex + g.ux * w * 0.9, ey + g.uy * w * 0.9, ex - g.px * w, ey - g.py * w); } };
        side(1); side(-1); ctx.closePath(); ctx.fill(); };
      layer(1.1, [[0, pal.edge, 0.0], [0.1, pal.edge, 0.35], [0.6, pal.edge, 0.25], [1, pal.edge, 0]], 'source-over', 4.1);   /* borda vermelho-escura irregular */
      layer(1, [[0, pal.mid, 0.0], [0.08, pal.mid, 0.6], [0.6, pal.mid, 0.4], [1, pal.mid, 0]], 'source-over', 0);   /* corpo laranja */
      layer(0.62, [[0, pal.core, 0.95], [0.3, pal.hot, 0.7], [0.75, pal.mid, 0.25], [1, pal.mid, 0]], 'lighter', 1.3);   /* miolo quente */
      layer(0.28, [[0, [255, 255, 255], 0.95], [0.25, pal.core, 0.8], [0.55, pal.hot, 0.25], [0.8, pal.hot, 0]], 'lighter', 2.6);   /* núcleo claro */
      ctx.globalCompositeOperation = 'lighter'; }
    const gl = ctx.createRadialGradient(g.x0 + ox, g.y0 + oy, 0, g.x0 + ox, g.y0 + oy, 7); gl.addColorStop(0, rgba([255, 255, 255], 0.9)); gl.addColorStop(0.4, rgba(pal.core, 0.6)); gl.addColorStop(1, rgba(pal.hot, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(g.x0 + ox, g.y0 + oy, 7, 0, 7); ctx.fill();   /* clarão no cristal */
    ctx.restore();
    { const ep = iso(e.rx + Math.cos(F.a) * F.r * 0.6, e.ry + Math.sin(F.a) * F.r * 0.6), gx = ep.sx + ox, gy = ep.sy + oy, rr = 10 + g.L * 0.45, gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr); ctx.save(); ctx.globalCompositeOperation = 'lighter'; gg.addColorStop(0, rgba(pal.hot, 0.28 * (1 + Math.sin(now / 50) * 0.15))); gg.addColorStop(1, rgba(pal.mid, 0)); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(gx, gy, rr, rr * 0.5, 0, 0, 7); ctx.fill(); ctx.restore(); }   /* o chão brilha sob o jato */
    const lx = g.x0 + ox + g.ux * g.L * 0.5, ly = g.y0 + oy + g.uy * g.L * 0.5; G.lights.push({ x: lx, y: ly, r: 110 + g.L * 0.9, c: pal.mid.map(v => v | 0).join(','), a: 0.95, flick: 1 });
  }
  fireStep(now, dt); fireDraw(ctx, now);
}
function drawEmberHand(ctx, e, sx, sy, now) {
  const side = DIR_VIEW && DIR_VIEW[e.dir || 0] === 'W' ? -1 : 1, hx = sx + side * 11, hy = sy - (R3.ok ? 31 : 41), fl = Math.min(1, (e.emberUntil - now) / 500);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (typeof glowDot === 'function') glowDot(ctx, hx, hy - 6, 26, 'rgba(255,190,90,' + (0.55 * fl) + ')', 'rgba(255,90,20,0)');
  for (let k = 0; k < 4; k++) { const ph = now / 85 + k * 1.7 + (e.rx || 0), w = 6.5 - k * 1.2, h = 20 + Math.sin(ph) * 4 - k * 2.6;
    ctx.fillStyle = ['rgba(255,90,20,', 'rgba(255,150,40,', 'rgba(255,210,100,', 'rgba(255,250,220,'][k] + (0.85 * fl) + ')';
    ctx.beginPath(); ctx.moveTo(hx - w, hy); ctx.quadraticCurveTo(hx - w * 0.9, hy - h * 0.55, hx + Math.sin(ph * 1.3) * 2, hy - h); ctx.quadraticCurveTo(hx + w * 0.9, hy - h * 0.55, hx + w, hy); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  if (Math.random() < 0.3 && G.view) spawnPart('ember', hx - G.view.ox, hy - G.view.oy - 8);
  G.lights.push({ x: hx, y: hy - 6, r: 130, c: '255,170,80', a: 0.95 * fl, flick: 1 });
}
// ---------- flores do Florescer: desenhadas no chão (o terreno já vem pintado, então as novas vão por cima) ----------
G.blooms = G.blooms || [];
if (typeof drawZones === 'function') { const _dz = drawZones; drawZones = function (ctx, now, P) {
  _dz(ctx, now, P);
  G.blooms = G.blooms.filter(b => now < b.until);
  const cols = ['#ef8fb8', '#f4d860', '#f6f0e0', '#b090ea', '#ee7060', '#ffffff'];
  for (const b of G.blooms) { const grow = Math.min(1, (now - b.t0) / 900), fade = Math.min(1, (b.until - now) / 1500);
    for (const i of b.tiles) { const x = i % MAP_W, y = Math.floor(i / MAP_W);
      for (let k = 0; k < 7; k++) { const h1 = hash2(x * 7 + k, y * 3, 77), h2 = hash2(x, y * 5 + k, 78), h3 = hash2(x + k, y + k, 79), fx = x + (h1 - 0.5) * 0.9, fy = y + (h2 - 0.5) * 0.9, [px, py] = P(fx, fy, 0), st = (4 + h3 * 4) * grow;
        ctx.globalAlpha = fade; ctx.strokeStyle = '#4e7a30'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (h3 - 0.5) * 2, py - st); ctx.stroke();
        if (grow > 0.4) { const c = cols[Math.floor(h1 * cols.length)], rr = 1.5 + h2 * 1.2, cx2 = px + (h3 - 0.5) * 2, cy2 = py - st;
          ctx.fillStyle = c; for (let q = 0; q < 5; q++) { const a = q / 5 * Math.PI * 2 + h1 * 6; ctx.beginPath(); ctx.arc(cx2 + Math.cos(a) * rr, cy2 + Math.sin(a) * rr * 0.7, rr * 0.8, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#f6c840'; ctx.beginPath(); ctx.arc(cx2, cy2, rr * 0.55, 0, 7); ctx.fill(); }
        if (b.wet && k === 0) { ctx.fillStyle = 'rgba(170,215,250,.55)'; ctx.beginPath(); ctx.arc(px + 3, py - 1, 1.2, 0, 7); ctx.fill(); } } }
    ctx.globalAlpha = 1; }
}; }
if (typeof progEvent === 'function') { const _pe2 = progEvent; progEvent = function (m, now) {
  if (m.t === 'blooms') { G.blooms = (m.l || []).map(b => ({ tiles: b[0], until: now + b[1], wet: b[2], t0: now - (m.fresh ? 0 : 2000) })); return true; }
  return _pe2(m, now);
}; }

// ============================================================
//  O GRIMÓRIO: livro aberto; à esquerda o Pentagrama, à direita as anotações
// ============================================================
const GRIM = { sel: null }, GRIM_ART = { holy: 'da', water: 'da', fire: 'do', earth: 'da', wind: 'do' }, grimOf = E => GRIM_ART[E.k] + ' ' + E.n;
const grimEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GRIM_GLYPH = {   // desenhos dos elementos (centro 0,0; ~22 de altura)
  holy: '<circle r="5.5"/><path d="M0 -11 v3 M0 8 v3 M-11 0 h3 M8 0 h3 M-7.8 -7.8 l2.1 2.1 M5.7 5.7 l2.1 2.1 M7.8 -7.8 l-2.1 2.1 M-5.7 5.7 l-2.1 2.1"/>',
  water: '<path d="M0 -11 C 5 -4 8 1 8 4 C 8 9 4 11 0 11 C -4 11 -8 9 -8 4 C -8 1 -5 -4 0 -11 Z"/><path d="M-4 4 q0 3 3 4"/>',
  fire: '<path d="M0 -12 C 4 -6 9 -2 7 5 C 6 9 3 11 0 11 C -4 11 -7 8 -7 4 C -7 -1 -3 -2 -2 -6 C -1 -3 1 -2 1 0 C 3 -3 2 -8 0 -12 Z"/><path d="M0 10 c-3 0 -3 -4 0 -7 c3 3 3 7 0 7"/>',
  earth: '<path d="M-8 9 C -9 -3 -1 -10 9 -10 C 9 0 3 8 -8 9 Z"/><path d="M-8 9 L 5 -5 M-3 4 h4 M0 1 v-4"/>',
  wind: '<path d="M-10 -4 h11 a4 4 0 1 0 -4 -4"/><path d="M-10 2 h15 a4 4 0 1 1 -4 4"/><path d="M-8 8 h6"/>',
};
function grimSpell(el) { return (SKILLS.mage || []).find(s => s.el === el) || null; }
function grimUseLvl(me, el) { return typeof useLvl === 'function' ? Math.floor(useLvl(me, 'el_' + el)) : 0; }
function grimPage(me) {   // anotações da página da direita
  const T = TREE.mage, free = Math.max(0, (me.lvl || 1) - 1 - treePts(me)), sel = GRIM.sel;
  let det = '<p class="grim-hint">Passe o mouse sobre um selo, um talento ou uma combinação do Pentagrama para ler as anotações.</p>';
  if (sel) {
    if (sel.k === 'base') { const E = MAGE_EL[sel.b], sk = grimSpell(E.k), i = SKILLS.mage.indexOf(sk); det = '<h4 style="color:' + E.ink + '">' + grimEsc(sk.name) + ' <small>· magia base ' + grimOf(E) + '</small></h4><p>' + grimEsc(sk.desc) + '</p><p class="grim-meta">Tecla ' + (i + 1) + ' · Mana ' + sk.mp + ' · Recarga ' + sk.cd / 1000 + 's · Uso ' + grimUseLvl(me, E.k) + '/100</p>'; }
    else if (sel.k === 'node') { const br = T[sel.b], nd = br.nodes[sel.n], E = MAGE_EL[sel.b], r = (me.tree && me.tree[nd.id]) | 0, bp = branchPts(me, br), unl = bp >= TREE_REQ[sel.n];
      det = '<h4 style="color:' + E.ink + '">' + grimEsc(nd.name) + ' <small>· ' + (nd.soon ? 'evolução ' + grimOf(E) : 'talento ' + grimOf(E)) + '</small></h4><p>' + grimEsc(nd.desc) + '</p><p class="grim-meta">' + (nd.soon ? '<b>Em breve.</b> Esta evolução ainda está sendo escrita.' : r + '/' + nd.max + (unl ? (free > 0 && r < nd.max ? ' · clique para aprender' : !free ? ' · sem pontos livres' : ' · completo') : ' · precisa de ' + TREE_REQ[sel.n] + ' pontos ' + (GRIM_ART[E.k] === 'do' ? 'no ' : 'na ') + E.n)) + '</p>'; }
    else if (sel.k === 'combo') { const C = MAGE_COMBOS[sel.i], A = MAGE_EL.find(e => e.k === C.a), B = MAGE_EL.find(e => e.k === C.b); det = '<h4>' + grimEsc(C.n) + ' <small>· <span style="color:' + A.ink + '">' + A.n + '</span> + <span style="color:' + B.ink + '">' + B.n + '</span></small></h4><p>' + grimEsc(C.d) + '</p><p class="grim-meta"><b>Em breve.</b> Combinar duas magias: aperte as duas teclas em seguida.</p>'; }
  }
  const spells = MAGE_EL.slice().sort((a, b) => SKILLS.mage.indexOf(grimSpell(a.k)) - SKILLS.mage.indexOf(grimSpell(b.k))).map(E => { const sk = grimSpell(E.k), i = SKILLS.mage.indexOf(sk); return '<li><span class="grim-key">' + (i + 1) + '</span><b style="color:' + E.ink + '">' + grimEsc(sk.name) + '</b><span class="grim-use" title="Uso">' + grimUseLvl(me, E.k) + '</span></li>'; }).join('');
  return '<div class="grim-h">Grimório</div><div class="grim-sub">do Pentagrama dos Cinco Elementos</div>' +
    '<div class="grim-pts">' + free + (free === 1 ? ' ponto livre' : ' pontos livres') + '</div>' +
    '<div class="grim-det">' + det + '</div>' +
    '<div class="grim-h2">As cinco magias</div><ul class="grim-spells">' + spells + '</ul>' +
    '<p class="grim-foot">Cada ponta é um elemento e começa com uma magia. Os talentos e as evoluções descem pela ponta até o centro; no meio do Pentagrama ficam as combinações de dois elementos. 1 ponto por nível · uso: sobe usando a magia · a Irmã Lúmina, na Catedral, apaga os talentos por ouro.</p>';
}
function grimSVG(me) {
  const W = 540, H = 586, cx = 270, cy = 300, R = 206, T = TREE.mage, free = Math.max(0, (me.lvl || 1) - 1 - treePts(me));
  const ang = i => (-90 + i * 72) * Math.PI / 180, pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r], f = n => n.toFixed(1);
  let o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="grim-svg"><defs>' +
    '<radialGradient id="gWax" cx="38%" cy="32%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>' +
    '<filter id="gRough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter>' +
    '<path id="gRunes" d="M ' + cx + ' ' + (cy - R - 20) + ' a ' + (R + 20) + ' ' + (R + 20) + ' 0 1 1 -0.1 0"/></defs>';
  // círculos externos com runas escritas à mão
  o += '<g class="g-ink" filter="url(#gRough)"><circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 31) + '" stroke-width="1.4"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 8) + '" stroke-width="2.2"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 5) + '" stroke-width=".7"/></g>';
  o += '<text class="g-runes"><textPath href="#gRunes" startOffset="0">ᚠ ᛁ ᚱ ᛖ · ᚹ ᛁ ᚾ ᛞ · ᛖ ᚨ ᚱ ᚦ · ᛚ ᛁ ᚷ ᚺ ᛏ · ᚹ ᚨ ᛏ ᛖ ᚱ · ᚠ ᛁ ᚱ ᛖ · ᚹ ᛁ ᚾ ᛞ · ᛖ ᚨ ᚱ ᚦ · ᛚ ᛁ ᚷ ᚺ ᛏ · ᚹ ᚨ ᛏ ᛖ ᚱ ·</textPath></text>';
  // estrela de cinco pontas (tinta com borda dourada) e o pentágono do meio
  const star = [0, 2, 4, 1, 3, 0].map(i => pt(i, R).map(f).join(',')).join(' ');
  o += '<polyline points="' + star + '" class="g-gold" stroke-width="5.2"/><polyline points="' + star + '" class="g-ink" stroke-width="2.4" filter="url(#gRough)"/>';
  const inner = [0, 1, 2, 3, 4, 0].map(i => { const a = ang(i) + Math.PI / 5; return [cx + Math.cos(a) * R * 0.382, cy + Math.sin(a) * R * 0.382].map(f).join(','); }).join(' ');
  o += '<polygon points="' + inner + '" class="g-pent"/>';
  o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + f(R * 0.25) + '" class="g-ink" stroke-width=".8" stroke-dasharray="2 3"/>';
  // combinações: as de vizinhos nos cruzamentos da estrela; as de pontas opostas no anel do meio
  MAGE_COMBOS.forEach((C, ci) => { const ia = MAGE_EL.findIndex(e => e.k === C.a), ib = MAGE_EL.findIndex(e => e.k === C.b), adj = (ia - ib + 5) % 5 === 1 || (ib - ia + 5) % 5 === 1;
    let x, y; if (adj) { const lo = (ia - ib + 5) % 5 === 1 ? ib : ia, a = ang(lo) + Math.PI / 5; x = cx + Math.cos(a) * R * 0.382; y = cy + Math.sin(a) * R * 0.382; } else { const mid = [0, 1, 2, 3, 4].find(k => k !== ia && k !== ib && (k - ia + 5) % 5 !== 0 && ((k - ia + 5) % 5 === 1 && (ib - k + 5) % 5 === 1 || (k - ib + 5) % 5 === 1 && (ia - k + 5) % 5 === 1)); const a = ang(mid); x = cx + Math.cos(a) * R * 0.17; y = cy + Math.sin(a) * R * 0.17; }
    const A = MAGE_EL[ia], B = MAGE_EL[ib], on = GRIM.sel && GRIM.sel.k === 'combo' && GRIM.sel.i === ci;
    o += '<g class="g-combo' + (on ? ' on' : '') + '" data-combo="' + ci + '" transform="translate(' + f(x) + ',' + f(y) + ')"><path d="M0 -10 L10 0 L0 10 Z" fill="' + B.c + '"/><path d="M0 -10 L-10 0 L0 10 Z" fill="' + A.c + '"/><path d="M0 -10 L10 0 L0 10 L-10 0 Z" class="g-ink" stroke-width="1.2"/><circle r="2.2" class="g-lockdot"/></g>'; });
  o += '<g transform="translate(' + cx + ',' + cy + ')" class="g-center"><circle r="13" class="g-ink" stroke-width="1.2"/><path d="M0 -8 L2.4 -2.4 L8 0 L2.4 2.4 L0 8 L-2.4 2.4 L-8 0 L-2.4 -2.4 Z" class="g-goldfill"/></g>';
  // cada ponta: selo de cera com a magia base e, descendo para o centro, 2 talentos e 3 evoluções
  T.forEach((br, b) => { const E = MAGE_EL[b], radii = [0.77, 0.645, 0.53, 0.43, 0.335], bp = branchPts(me, br);
    br.nodes.forEach((nd, n) => { const [x, y] = pt(b, R * radii[n]), r0 = (me.tree && me.tree[nd.id]) | 0, unl = bp >= TREE_REQ[n], can = !nd.soon && unl && free > 0 && r0 < nd.max, on = GRIM.sel && GRIM.sel.k === 'node' && GRIM.sel.b === b && GRIM.sel.n === n, rr = nd.soon ? 9 : 10.5;
      o += '<g class="g-node' + (nd.soon ? ' soon' : '') + (r0 ? ' got' : '') + (can ? ' can' : '') + (!unl && !nd.soon ? ' locked' : '') + (on ? ' on' : '') + '" data-node="' + b + ',' + n + '" transform="translate(' + f(x) + ',' + f(y) + ')">' +
        '<circle r="' + (rr + 6) + '" class="g-halo" fill="' + E.c + '"/><circle r="' + rr + '" class="g-disc"' + (r0 ? ' style="fill:' + E.c + '"' : '') + '/>' +
        (nd.soon ? '<path d="M-3.5 -1 v-2.5 a3.5 3.5 0 0 1 7 0 v2.5 M-5 -1 h10 v7 h-10 Z" class="g-lock"/>' : '<text class="g-rank" y="4">' + r0 + '/' + nd.max + '</text>') + '</g>'; });
    const [sx, sy] = pt(b, R), on = GRIM.sel && GRIM.sel.k === 'base' && GRIM.sel.b === b;
    let blob = ''; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = 33 + Math.sin(k * 2.7 + b) * 2.6; blob += (k ? 'L' : 'M') + f(Math.cos(a) * rr) + ' ' + f(Math.sin(a) * rr); }
    o += '<g class="g-seal' + (on ? ' on' : '') + '" data-base="' + b + '" transform="translate(' + f(sx) + ',' + f(sy) + ')"><path d="' + blob + 'Z" fill="' + E.c + '" class="g-wax"/><path d="' + blob + 'Z" fill="url(#gWax)"/><circle r="24" fill="none" stroke="' + E.ink + '" stroke-width="1.6" opacity=".7"/><circle r="22" fill="none" stroke="#fff" stroke-width=".6" opacity=".35"/>' +
      '<g class="g-glyph" stroke="' + E.ink + '" transform="translate(0.8,1)" opacity=".55">' + GRIM_GLYPH[E.k] + '</g><g class="g-glyph" stroke="#fff6dc">' + GRIM_GLYPH[E.k] + '</g></g>';
    const lab = pt(b, R + (b === 0 ? 56 : 54)); o += '<text class="g-lab" x="' + f(lab[0]) + '" y="' + f(lab[1] + (b === 0 ? 0 : 6)) + '" fill="' + E.ink + '">' + E.n + '</text>';
  });
  return o + '</svg>';
}
function grimRender() {
  const me = G.me, box = $('tree-body'); if (!me || !box) return;
  const tree = $('tree'); if (tree) tree.classList.add('grim-on');
  const head = tree && tree.querySelector('.gp-head span'); if (head) head.textContent = 'Grimório';
  $('tree-pts').textContent = ''; const info = $('tree-info'); if (info) info.style.display = 'none';
  box.innerHTML = '<div class="grim-book"><div class="grim-page grim-l">' + grimSVG(me) + '</div><div class="grim-spine"></div><div class="grim-page grim-r">' + grimPage(me) + '</div></div>';
  const pick = sel => { GRIM.sel = sel; const r = box.querySelector('.grim-r'); if (r) r.innerHTML = grimPage(me); box.querySelectorAll('.on').forEach(e => e.classList.remove('on')); };
  box.querySelectorAll('[data-base]').forEach(g => { g.addEventListener('mouseenter', () => { pick({ k: 'base', b: +g.dataset.base }); g.classList.add('on'); }); });
  box.querySelectorAll('[data-combo]').forEach(g => { g.addEventListener('mouseenter', () => { pick({ k: 'combo', i: +g.dataset.combo }); g.classList.add('on'); }); });
  box.querySelectorAll('[data-node]').forEach(g => { const [b, n] = g.dataset.node.split(',').map(Number);
    g.addEventListener('mouseenter', () => { pick({ k: 'node', b, n }); g.classList.add('on'); });
    g.addEventListener('click', () => { const nd = TREE.mage[b].nodes[n], r0 = (me.tree && me.tree[nd.id]) | 0, free = Math.max(0, (me.lvl || 1) - 1 - treePts(me)); if (nd.soon) { showToast(nd.name + ': em breve.'); return; } if (branchPts(me, TREE.mage[b]) < TREE_REQ[n]) { showToast('Gaste ' + TREE_REQ[n] + ' pontos ' + (GRIM_ART[MAGE_EL[b].k] === 'do' ? 'no ' : 'na ') + MAGE_EL[b].n + ' para liberar.'); return; } if (!free) { showToast('Sem pontos livres: suba de nível.'); return; } if (r0 >= nd.max) return; Net.send({ t: 'tlearn', id: nd.id }); }); });
}
if (typeof updateTree === 'function') { const _ut = updateTree; updateTree = function () {
  const me = G.me, tree = $('tree');
  if (me && me.cls === 'mage' && TREE.mage && TREE.mage[0] && TREE.mage[0].el) return grimRender();
  if (tree) { tree.classList.remove('grim-on'); const head = tree.querySelector('.gp-head span'); if (head) head.textContent = 'Constelações'; const info = $('tree-info'); if (info) info.style.display = ''; }
  return _ut.apply(this, arguments);
}; }
