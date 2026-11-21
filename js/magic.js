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
  if (m.t === 'flamefx') { const e = G.players[m.id]; if (e) e.flame = m.on ? { a: m.a, r: m.r, fs: m.fs || 0, until: now + 450 } : null; if (e && e === G.me && m.on) { G.faceLock = { a: m.a, until: now + 500 }; G.me.dir = dirFromVec(Math.cos(m.a), Math.sin(m.a), G.me.dir); } return true; }   /* o mago encara para onde o jato vai (também no automático) */
  if (m.t === 'mfrost') { const e = G.monsters[m.id]; if (e) { e.frostUntil = now + (m.ms || 4000); e.frostT0 = now; } return true; }   /* Gelo Eterno: bloco de gelo em volta do bicho */
  if (m.t === 'fireout') { for (const [x, y] of m.l || []) G.fires = G.fires.filter(f => Math.hypot(f.x - x, f.y - y) > 0.7); if (G.view && m.l && m.l.length) for (const [x, y] of m.l.slice(0, 8)) { const p = iso(x, y); for (let q = 0; q < 3; q++) spawnPart('smoke', p.sx + (Math.random() - 0.5) * 10, p.sy - 6); } return true; }
  if (m.t === 'ember') { const e = G.players[m.id]; if (e) e.emberUntil = m.ms ? now + m.ms : 0; return true; }
  if (m.t === 'mburn') { const e = G.monsters[m.id]; { const c0 = G.charMap[m.id] ? charOf(m.id, now) : 0; G.charMap[m.id] = { c0, c1: Math.min(1, c0 + 0.45), t: now, dur: m.ms || 3000 }; } if (e) { e.burnUntil = now + m.ms; e.charUntil = now + m.ms + 20000; if (G.view) { const p = iso(e.rx, e.ry); sparkBurst(p.sx, p.sy - 18, FIRE_PAL[1], 12); } } return true; }   /* faíscas no impacto; chamuscado por 20 s */
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
const FIRE_GREEN = { core: [228, 255, 226], hot: [130, 255, 150], mid: [44, 206, 96], edge: [18, 112, 54] }, FIRE_PURPLE = { core: [246, 228, 255], hot: [206, 140, 255], mid: [146, 64, 232], edge: [80, 22, 152] };
const palMix = (A, B, t) => ({ core: lerpC(A.core, B.core, t), hot: lerpC(A.hot, B.hot, t), mid: lerpC(A.mid, B.mid, t), edge: lerpC(A.edge, B.edge, t) });
function firePal(k, fs) { const i = k < 0.38 ? 0 : k < 0.78 ? 1 : 2; if (i < 2 || !(fs > 70)) return FIRE_PAL[i];   /* depois do azul: força 70→110 vira verde, 115→155 vira roxo */
  const g = Math.min(1, (fs - 70) / 40), pu = Math.max(0, Math.min(1, (fs - 115) / 40)); return pu > 0 ? palMix(FIRE_GREEN, FIRE_PURPLE, pu) : palMix(FIRE_PAL[2], FIRE_GREEN, g); }
var lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
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
    G.fireP.push({ k: 'f', x: g.x0 + g.px * (Math.random() - 0.5) * 2, y: g.y0 + g.py * (Math.random() - 0.5) * 2, vx: g.ux * sp, vy: g.uy * sp, sp: (Math.random() - 0.5) * (real ? 0.06 : 0.13), t0: now, life, seed: Math.random() * 100, pal: firePal(g.k, F.fs), px: g.px, py: g.py, w: real ? 2.5 + Math.random() * 3 : 2.2 + Math.random() * 2.2, real }); }
  if (Math.random() < (real ? 0.9 : 0.45)) G.fireP.push({ k: 'e', x: g.x0 + g.ux * g.L * Math.random() * 0.8, y: g.y0 + g.uy * g.L * Math.random() * 0.8, vx: g.ux * 0.12 + (Math.random() - 0.5) * 0.06, vy: g.uy * 0.12 - 0.05 - Math.random() * 0.04, t0: now, life: 500 + Math.random() * 600, pal: firePal(g.k, F.fs) });   /* brasa */
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
  paintFlameUp(ctx, x - 6, y - 10, 0.34, now, seed); paintFlameUp(ctx, x + 5, y - 22, 0.3, now, seed + 3); paintFlameUp(ctx, x, y - 32, 0.36, now, seed + 7);   /* chamas lambendo o contorno, menores */
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
function charOf(id, now) {   /* escurece aos poucos enquanto queima; depois fica carvão por 2 min e clareia devagar */
  const C = G.charMap[id]; if (!C) return 0; const dur = C.dur || 0, age = now - C.t; if (age > 300000 + dur) { delete G.charMap[id]; return 0; }
  const c1 = C.c1 != null ? C.c1 : C.c, c0 = C.c0 || 0; if (age < dur) return c0 + (c1 - c0) * (age / dur); const a2 = age - dur; return c1 * (a2 < 120000 ? 1 : 1 - (a2 - 120000) / 180000); }
function burnGlowFilter(ph) { return 'brightness(' + (1.55 - ph * 0.55).toFixed(2) + ') sepia(1) saturate(' + (6 - ph * 2.5).toFixed(2) + ') hue-rotate(' + (-8 - ph * 22).toFixed(1) + 'deg)'; }   /* brasa por dentro: amarelo-laranja no começo, vermelho no fim */
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
  const bi = BUILDINGS.findIndex(b => b.kind === 'dojo'); if (bi < 0) return; const b = BUILDINGS[bi], { H } = bldDims(b), nF = 4, fh = H / nF, [w, h] = bDims(b);   /* fachada x profundidade no sistema local do prédio */
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
// ---------- a muda: brota da terra (carvalho, salgueiro ou cerejeira), com o aro de folhas e a luz suave ----------
const SAP_LOOK = { earth: { trunk: '#6a4a2c', leaf: ['#4e8a34', '#6aa844', '#3c7028'], glow: '150,230,110' }, water: { trunk: '#7a6a54', leaf: ['#9ab8a4', '#b8d4c4', '#7a9e8a'], glow: '140,210,230' }, wind: { trunk: '#4a3228', leaf: ['#f4b8c8', '#ffd6e0', '#e890a8'], glow: '255,190,215' } };
function drawSapling(ctx, s, sx, sy, now) {
  const L = SAP_LOOK[s.k] || SAP_LOOK.earth, born = G.sapBorn && G.sapBorn[s.x + ',' + s.y], gk = born ? Math.min(1, (now - born) / 2200) : 1, gr = gk < 1 ? 1 - Math.pow(1 - gk, 3) : 1, sway = Math.sin(now / 900 + s.x) * 0.06, sd = s.x * 7 + s.y * 3;
  ctx.save();
  { const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 34); g.addColorStop(0, 'rgba(' + L.glow + ',' + (0.28 * gr).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + L.glow + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, 34, 16, 0, 0, 7); ctx.fill(); }   /* área de efeito */
  ctx.fillStyle = 'rgba(70,46,24,0.55)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 7 * gr, 3 * gr, 0, 0, 7); ctx.fill();   /* terra revolvida */
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + sd, r = 9 + (k % 3) * 2; ctx.fillStyle = ['#e8d060', '#f0f0f0', '#c890e0'][k % 3]; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * r * gr, sy + Math.sin(a) * r * 0.45 * gr, 1.1, 0, 7); ctx.fill(); }   /* florzinhas em volta */
  if (typeof sapSprite3D === 'function' && R3.ok) { ctx.restore(); const sp = sapSprite3D(s, now); ctx.save(); ctx.translate(sx, sy); ctx.scale(gr, gr); ctx.imageSmoothingEnabled = true; pblit(ctx, sp, 0, 0); ctx.restore();   /* muda em 3D */
    if (G.view && Math.random() < (s.k === 'wind' ? 0.05 : 0.02)) spawnPart('sparkle', sx - G.view.ox + (Math.random() - 0.5) * 24, sy - G.view.oy - 6 - Math.random() * 20 * (s.g || 0.2), { color: s.k === 'wind' ? 'rgba(255,200,215,A)' : 'rgba(' + L.glow + ',A)', vx: 0, vy: -0.03, life: 1500 }); return; }
  const H = 26 * gr; ctx.translate(sx, sy); ctx.rotate(sway); ctx.strokeStyle = L.trunk; ctx.lineCap = 'round'; ctx.lineWidth = 2.6 * gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(1.5, -H * 0.5, 0, -H); ctx.stroke();
  ctx.lineWidth = 1.2 * gr; for (const [t, dir] of [[0.45, -1], [0.62, 1], [0.78, -1]]) { ctx.beginPath(); ctx.moveTo(0.5, -H * t); ctx.quadraticCurveTo(dir * 4, -H * t - 3, dir * 7 * gr, -H * t - 5 * gr); ctx.stroke(); }
  const leaf = (x, y, r, c, a) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62, a, 0, 7); ctx.fill(); };
  if (s.k === 'water') { for (let k = 0; k < 9; k++) { const x0 = (k - 4) * 2.4 * gr, len = (10 + (k % 3) * 3) * gr; ctx.strokeStyle = L.leaf[k % 3]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0 * 0.4, -H); ctx.quadraticCurveTo(x0, -H + 2, x0 * 1.2 + Math.sin(now / 700 + k) * 0.8, -H + len); ctx.stroke(); } }   /* salgueiro: ramos caindo */
  else for (let k = 0; k < 11; k++) { const a = k / 11 * 6.28 + sd, r = (5 + (k % 3) * 1.6) * gr, x = Math.cos(a) * r, y = -H - 2 + Math.sin(a) * r * 0.7; leaf(x, y, 3.2 * gr, L.leaf[k % 3], a); }
  if (s.k === 'wind' && Math.random() < 0.03 && G.view) spawnPart('sparkle', sx - G.view.ox + (Math.random() - 0.5) * 10, sy - G.view.oy - H, { color: 'rgba(255,200,215,A)', vx: 0.02, vy: 0.02, life: 1800 });   /* pétalas soltas */
  ctx.restore();
  if (Math.random() < 0.02 && G.view) spawnPart('sparkle', sx - G.view.ox + (Math.random() - 0.5) * 30, sy - G.view.oy - 4, { color: 'rgba(' + L.glow + ',A)', vx: 0, vy: -0.03, life: 1500 });   /* luzinhas subindo */
}
G.fireLast = G.fireLast || 0;
function drawFlameFx(ctx, now) {
  const dt = Math.min(50, now - (G.fireLast || now)); G.fireLast = now;
  for (const id in G.players) { const e = G.players[id], F = e.flame; if (!F || now > F.until || !e.visible) continue;
    const g = flameGeom(e, F, now), ox = G.view.ox, oy = G.view.oy, pal = firePal(g.k, F.fs);
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
// ---------- meditação: escolher o elemento e a aura de cada um ----------
const MEDIT_UI = [['fire', '🔥', 'Fogo', 'Rende mais perto de fogueiras e forjas.'], ['water', '💧', 'Água', 'Rende mais perto de rios, lagos e do ofurô.'], ['earth', '🌿', 'Terra', 'Rende mais na grama e na floresta.'], ['wind', '🌬', 'Ar', 'Rende mais no alto ou em campo aberto.'], ['holy', '☀', 'Luz', 'Rende mais ao sol, de dia.']];
function meditPick() {
  if (!G.me || G.me.cls !== 'mage') return; if (G.me.medit) { Net.send({ t: 'medit', on: 0 }); return; }
  const html = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">Sente em lótus e concentre-se num elemento: sobe a barra dele no Progresso e recupera vida, mana e fôlego. Ande para parar.</div><div class="lift-list" style="padding-top:8px">' + MEDIT_UI.map(([k, ic, n, sub]) => '<button class="lift-btn" data-el="' + k + '"><span class="lift-n">' + ic + '</span><span><b>' + n + '</b><br><small>' + sub + '</small></span></button>').join('') + '</div>';
  const d = staffPanel('meditmenu', 'Meditar', html); d.querySelectorAll('[data-el]').forEach(b => b.onclick = () => { d.remove(); G.path = null; G.pathGoal = null; G.me.walking = false; Net.send({ t: 'medit', on: 1, el: b.dataset.el }); });
}
const AURA_C = { fire: ['255,120,40', '255,200,90'], water: ['40,130,230', '160,220,255'], earth: ['90,140,50', '150,105,60'], wind: ['120,200,180', '235,255,250'], holy: ['255,220,120', '255,250,215'] };
function softBeam(ctx, x, top, bot, w, rgb, a) {   /* feixe de luz: some nas bordas e no alto */
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(0.5, 'rgba(' + rgb + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.save(); ctx.fillStyle = g; const n = 16, h = (bot - top) / n;
  for (let i = 0; i < n; i++) { ctx.globalAlpha = Math.pow((i + 1) / n, 1.4); ctx.fillRect(x - w, top + i * h, w * 2, h); } ctx.restore(); }
const MED_HEAD = { fire: 21, water: 33, earth: 27, wind: 34, holy: 37 };   /* altura da cabeça em cada pose (para os olhos do transe) */
function drawMeditEnv(ctx, e, sx, sy, cy, now, front, age, C, el) {   /* o ambiente reage: cresce em 30 s; depois de 60 s, o transe profundo */
  const I = Math.min(1, Math.max(0, (age - 1.5) / 30)), tr = Math.min(1, Math.max(0, (age - 60) / 3)), T = now / 1000, sd = (e.id ? String(e.id).length : 3) * 1.7;
  if (I <= 0) return; ctx.save();
  const A = v => Math.max(0, Math.min(1, v)).toFixed(2), side = (a) => (Math.sin(a) > 0) === !!front;
  if (!front && tr > 0) { for (let r = 0; r < 2; r++) { const q = (T * 0.35 + r * 0.5) % 1, R = 18 + q * 26; ctx.strokeStyle = 'rgba(' + C[1] + ',' + A(0.6 * tr * (1 - q)) + ')'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(sx, sy, R, R * 0.44, 0, 0, 7); ctx.stroke(); }
    const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 40); g.addColorStop(0, 'rgba(' + C[0] + ',' + A(0.32 * tr) + ')'); g.addColorStop(1, 'rgba(' + C[0] + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, 40, 17, 0, 0, 7); ctx.fill(); }   /* transe: a aura dobra de tamanho */
  if (el === 'fire') {   /* Fogo: chamas brotam do chão em roda, o chão chamusca e brilha */
    if (!front) { const g = ctx.createRadialGradient(sx, sy, 6, sx, sy, 30); g.addColorStop(0, 'rgba(40,20,10,0)'); g.addColorStop(0.7, 'rgba(30,14,6,' + A(0.35 * I) + ')'); g.addColorStop(1, 'rgba(30,14,6,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, 30, 13, 0, 0, 7); ctx.fill(); }
    const n = 3 + Math.round(I * 5 + tr * 3); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + T * 0.15 + sd; if (!side(a)) continue; const x = sx + Math.cos(a) * (22 + tr * 8), y = sy + Math.sin(a) * (9.5 + tr * 3.5); if (typeof paintFlameUp === 'function') paintFlameUp(ctx, x, y, (0.16 + I * 0.12 + tr * 0.08) * (0.8 + 0.2 * Math.sin(T * 5 + i)), now + i * 137, 2, FIRE_PAL[0]); }
    if (G.view && Math.random() < 0.15 * I) spawnPart('ember', sx + (Math.random() - 0.5) * 50 - G.view.ox, sy - G.view.oy, { vx: (Math.random() - 0.5) * 0.02, vy: -0.04 }); }
  else if (el === 'water') {   /* Água: o chão vira espelho d'água, gotas sobem em espiral e anéis largos se espalham */
    if (!front) { ctx.fillStyle = 'rgba(' + C[0] + ',' + A(0.16 * I) + ')'; ctx.beginPath(); ctx.ellipse(sx, sy, 26 + tr * 10, 11 + tr * 4, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,' + A(0.25 * I) + ')'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(sx - 6, sy - 2, 8, 2, 0, 0, 7); ctx.stroke();
      for (let i = 0; i < 2; i++) { const q = (T * 0.3 + i / 2) % 1, R = 14 + q * (24 + I * 16); ctx.strokeStyle = 'rgba(' + C[1] + ',' + A(0.45 * I * (1 - q)) + ')'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(sx, sy, R, R * 0.43, 0, 0, 7); ctx.stroke(); } }
    const n = 6 + Math.round(I * 8); for (let i = 0; i < n; i++) { const h = (T * 0.35 + i / n) % 1, a = i * 2.4 + T * 1.2, R = 20 - h * 8; if (!side(a)) continue; const x = sx + Math.cos(a) * R, y = sy + Math.sin(a) * R * 0.43 - h * 38 * (0.5 + I * 0.5); ctx.fillStyle = 'rgba(' + C[1] + ',' + A(0.8 * I * Math.sin(Math.PI * h)) + ')'; ctx.beginPath(); ctx.moveTo(x, y - 1.8); ctx.quadraticCurveTo(x + 1.2, y, x, y + 1); ctx.quadraticCurveTo(x - 1.2, y, x, y - 1.8); ctx.fill(); } }
  else if (el === 'earth') {   /* Terra: o chão racha em raios, brota capim e pedras se soltam e flutuam */
    if (!front) { ctx.strokeStyle = 'rgba(50,34,18,' + A(0.6 * I) + ')'; ctx.lineWidth = 0.8; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + sd, L = 10 + I * 16; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 2.6); ctx.lineTo(sx + Math.cos(a + 0.12) * L * 0.6, sy + Math.sin(a + 0.12) * L * 0.26); ctx.lineTo(sx + Math.cos(a - 0.05) * L, sy + Math.sin(a - 0.05) * L * 0.43); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(90,150,50,' + A(0.9 * I) + ')'; ctx.lineWidth = 0.6; for (let i = 0; i < 12; i++) { const a = i * 2.1 + sd, R = 14 + (i % 4) * 4, x = sx + Math.cos(a) * R, y = sy + Math.sin(a) * R * 0.43, hh = 2 + I * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1, y - hh); ctx.moveTo(x, y); ctx.lineTo(x + 1.2, y - hh * 0.8); ctx.stroke(); } }   /* capim brotando */
    const n = 4 + Math.round(I * 5); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + T * 0.25, R = 22 + (i % 3) * 3; if (!side(a)) continue; const up = Math.min(1, I * 2 - i * 0.08), x = sx + Math.cos(a) * R, gy = sy + Math.sin(a) * R * 0.43, y = gy - up * (14 + (i % 3) * 5) + Math.sin(T * 1.3 + i) * 1.5, r = 1.8 + (i % 3) * 0.8;
      if (up <= 0) continue; ctx.fillStyle = 'rgba(0,0,0,' + A(0.18 * up) + ')'; ctx.beginPath(); ctx.ellipse(x, gy, r * 1.2, r * 0.45, 0, 0, 7); ctx.fill(); ctx.fillStyle = ['#8a8070', '#a09480', '#6e6458'][i % 3]; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.3, y - r); ctx.lineTo(x + r * 0.8, y - r * 0.5); ctx.lineTo(x + r, y + r * 0.4); ctx.lineTo(x, y + r * 0.8); ctx.closePath(); ctx.fill(); }   /* pedras flutuando */
    if (G.view && Math.random() < 0.08 * I) spawnPart('dust', sx + (Math.random() - 0.5) * 40 - G.view.ox, sy - G.view.oy, { vx: (Math.random() - 0.5) * 0.03, vy: -0.03 }); }
  else if (el === 'wind') {   /* Ar: redemoinho de poeira e folhas subindo em espiral, capim deitado em volta */
    if (!front) { ctx.strokeStyle = 'rgba(200,190,160,' + A(0.35 * I) + ')'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { const a0 = T * 2 + i * 2.1; ctx.beginPath(); ctx.ellipse(sx, sy, 16 + i * 6, (16 + i * 6) * 0.42, 0, a0, a0 + 1.6); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(110,150,70,' + A(0.7 * I) + ')'; ctx.lineWidth = 0.6; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + sd, R = 26 + (i % 3) * 4, x = sx + Math.cos(a) * R, y = sy + Math.sin(a) * R * 0.43, tg = a + Math.PI / 2, bend = 3 + I * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - 2, x + Math.cos(tg) * bend, y - 1.5 + Math.sin(tg) * bend * 0.4); ctx.stroke(); } }   /* capim deitado pelo vento */
    const n = 6 + Math.round(I * 8); for (let i = 0; i < n; i++) { const h = (T * 0.25 + i / n) % 1, a = T * 3 + i * 1.7, R = 8 + h * 22; if (!side(a)) continue; const x = sx + Math.cos(a) * R, y = sy + Math.sin(a) * R * 0.43 - h * 50, al = A(0.9 * I * Math.sin(Math.PI * h)); ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2); ctx.fillStyle = i % 3 ? 'rgba(110,150,60,' + al + ')' : 'rgba(170,130,60,' + al + ')'; ctx.beginPath(); ctx.ellipse(0, 0, 1.8, 0.9, 0, 0, 7); ctx.fill(); ctx.restore(); } }   /* folhas no redemoinho */
  else {   /* Luz: um selo dourado gira no chão, faíscas sobem e o feixe do céu se alarga */
    if (!front) { ctx.globalCompositeOperation = 'lighter'; const R = 20 + tr * 8; ctx.strokeStyle = 'rgba(' + C[0] + ',' + A(0.7 * I) + ')'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(sx, sy, R, R * 0.43, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(sx, sy, R * 0.8, R * 0.8 * 0.43, 0, 0, 7); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + T * 0.3, x1 = sx + Math.cos(a) * R * 0.8, y1 = sy + Math.sin(a) * R * 0.8 * 0.43, x2 = sx + Math.cos(a + 0.785 * 3) * R * 0.8, y2 = sy + Math.sin(a + 0.785 * 3) * R * 0.8 * 0.43; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }   /* estrela de oito pontas */
      softBeam(ctx, sx, sy - 95, sy, 12 + I * 10 + tr * 10, C[1], 0.2 * I + 0.15 * tr); }   /* feixe do céu, de bordas suaves */
    const n = 5 + Math.round(I * 8); for (let i = 0; i < n; i++) { const h = (T * 0.3 + i / n) % 1, a = i * 2.4, R = 10 + (i % 4) * 4; if (!side(a)) continue; const x = sx + Math.cos(a) * R, y = sy + Math.sin(a) * R * 0.43 - h * 60; ctx.fillStyle = 'rgba(255,248,210,' + A(0.9 * I * Math.sin(Math.PI * h)) + ')'; ctx.beginPath(); ctx.arc(x, y, 0.9, 0, 7); ctx.fill(); } }
  if (front && tr > 0) { const hy = sy - (MED_HEAD[el] || 30) * (R3.ok ? 1 : 1.2) + (cy - sy + 10), dv = typeof DIR_VIEW !== 'undefined' ? DIR_VIEW[e.dir || 0] : 'S';   /* transe: os olhos acendem na cor do elemento */
    if (dv !== 'N' && el !== 'wind') { ctx.globalCompositeOperation = 'lighter'; for (const s of [-1, 1]) { const x = sx + s * 1.5 + (dv === 'E' ? 1.5 : dv === 'W' ? -1.5 : 0), g = ctx.createRadialGradient(x, hy, 0, x, hy, 1.6); g.addColorStop(0, 'rgba(255,255,255,' + A(tr) + ')'); g.addColorStop(0.45, 'rgba(' + C[1] + ',' + A(0.85 * tr) + ')'); g.addColorStop(1, 'rgba(' + C[0] + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, hy, 1.6, 0, 7); ctx.fill(); } } }
  ctx.restore();
  if (e === G.me && tr > 0 && !e.medit._trT) { e.medit._trT = 1; if (typeof showToast === 'function') showToast('Transe profundo: a aura dobra e você aprende 50% mais rápido.'); }
}
function drawMeditAura(ctx, e, sx, sy, now, front) {
  const M = e.medit, el = M.el, C = AURA_C[el] || AURA_C.fire, age = (now - M.t0) / 1000, k = Math.min(1, age / 2.5), lev = Math.min(1, Math.max(0, (age - 2.5) / 1.8)), cy = sy - 10 - lev * 8 * ({ fire: 0, water: 0, earth: 1, wind: 3.2, holy: 0.5 }[el] ?? 1), T = now / 1000;
  drawMeditEnv(ctx, e, sx, sy, cy, now, front, age, C, el);
  ctx.save(); ctx.globalCompositeOperation = el === 'fire' || el === 'holy' ? 'lighter' : 'source-over';   /* fogo e luz brilham; água, terra e ar têm cor própria */
  if (!front) {   /* chão: círculo do elemento */
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 20); g.addColorStop(0, 'rgba(' + C[0] + ',' + (0.42 * k).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + C[0] + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, 20, 9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(' + C[0] + ',' + (0.85 * k).toFixed(2) + ')'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(sx, sy, 15, 6.6, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(' + C[1] + ',' + (0.6 * k).toFixed(2) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(sx, sy, 17.5, 7.7, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 5; i++) { const a = T * 0.4 + i * 1.2566; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * 15, sy + Math.sin(a) * 6.6, 0.9, 0, 7); ctx.fillStyle = 'rgba(' + C[1] + ',' + (0.7 * k).toFixed(2) + ')'; ctx.fill(); }
    if (el === 'water') for (let i = 0; i < 3; i++) { const q = ((T * 0.5 + i / 3) % 1); ctx.strokeStyle = 'rgba(' + C[1] + ',' + (0.55 * (1 - q) * k).toFixed(2) + ')'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(sx, sy, 6 + q * 18, (6 + q * 18) * 0.44, 0, 0, 7); ctx.stroke(); }   /* ondas no chão */
    if (el === 'holy') softBeam(ctx, sx, sy - 60, sy, 11, C[0], 0.28 * k);   /* coluna de luz */
  }
  const orb = (n, rx, ry, spd, draw) => { for (let i = 0; i < n; i++) { const a = T * spd + i * Math.PI * 2 / n, s = Math.sin(a); if ((s > 0) !== !!front) continue; draw(sx + Math.cos(a) * rx, cy + s * ry, a, i); } };
  if (el === 'fire' && front && typeof paintFlameUp === 'function') { const fy = sy - 13; paintFlameUp(ctx, sx, fy, 0.34 + 0.06 * Math.sin(T * 3), now, 3, FIRE_PAL[k > 0.9 ? 1 : 0]); }   /* a chama nas palmas */
  if (el === 'fire') { orb(6, 13, 5, 1.1, (x, y, a, i) => { const f = 2.2 + Math.sin(T * 9 + i) * 0.8; const g = ctx.createRadialGradient(x, y, 0, x, y, f * 2); g.addColorStop(0, 'rgba(255,240,180,' + (0.9 * k).toFixed(2) + ')'); g.addColorStop(0.5, 'rgba(255,130,40,' + (0.6 * k).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - f * 0.6, f, f * 1.7, 0, 0, 7); ctx.fill(); });
    if (front && Math.random() < 0.3 && G.view) spawnPart('ember', sx + (Math.random() - 0.5) * 22 - G.view.ox, sy - 4 - G.view.oy, { vx: (Math.random() - 0.5) * 0.02, vy: -0.05 }); }
  if (el === 'water') orb(5, 12, 5, 0.8, (x, y, a) => { ctx.fillStyle = 'rgba(' + C[1] + ',' + (0.85 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.moveTo(x, y - 2.6); ctx.quadraticCurveTo(x + 1.7, y, x, y + 1.3); ctx.quadraticCurveTo(x - 1.7, y, x, y - 2.6); ctx.fill(); });   /* gotas em órbita */
  if (el === 'earth') orb(6, 14, 5.5, 0.45, (x, y, a, i) => { const bob = Math.sin(T * 1.5 + i) * 1.4; if (i % 2) { ctx.fillStyle = 'rgba(150,115,80,' + (0.95 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(x, y + bob, 1.8, 1.3, a, 0, 7); ctx.fill(); } else { ctx.fillStyle = 'rgba(120,190,80,' + (0.9 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(x, y + bob, 2, 0.9, a + T, 0, 7); ctx.fill(); } });   /* pedrinhas e folhas flutuando */
  if (el === 'wind') { ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const a0 = T * 2.2 + i * 1.57, hgt = ((T * 0.6 + i / 4) % 1); for (let s = 0; s < 6; s++) { const a = a0 + s * 0.22, sn = Math.sin(a); if ((sn > 0) !== !!front) continue; const rr = 13 - hgt * 5; ctx.strokeStyle = 'rgba(' + C[1] + ',' + Math.min(1, 0.3 * s * k * (1 - hgt * 0.7)).toFixed(2) + ')'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(sx, sy - 4 - hgt * 34, rr, a - 0.2, a, false); ctx.stroke(); } } }   /* redemoinho que sobe */
  if (el === 'holy') { orb(7, 10, 4, 0.6, (x, y, a, i) => { const tw = 0.6 + Math.sin(T * 4 + i * 2) * 0.4; ctx.fillStyle = 'rgba(255,245,200,' + (tw * k).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y - 6 + Math.sin(T + i) * 3, 0.8 + tw * 0.6, 0, 7); ctx.fill(); });
    }   /* sem auréola */
  ctx.restore();
  if (front && G.lights && k > 0.3) G.lights.push({ x: sx, y: cy, r: 60, c: C[0], a: 0.55 * k, flick: el === 'fire' ? 1 : 0 });
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
  if (m.t === 'saps') { G.saps = m.l || []; return true; }
  if (m.t === 'sapborn') { (G.sapBorn = G.sapBorn || {})[m.x + ',' + m.y] = now; if (G.view) { const p = iso(m.x, m.y); for (let k = 0; k < 24; k++) spawnPart('sparkle', p.sx + (Math.random() - 0.5) * 30, p.sy - Math.random() * 10, { color: 'rgba(150,230,120,A)', vx: (Math.random() - 0.5) * 0.06, vy: -0.05 - Math.random() * 0.05, life: 1400 }); } return true; }
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
    else if (sel.k === 'node' && T[sel.b].nodes[sel.n].evo) { const br = T[sel.b], nd = br.nodes[sel.n], E = MAGE_EL[sel.b], st = Math.floor(mStr(me, br.el)), ok = st >= nd.need, si = evoSlotOf(br), S0 = G.slotTree && G.slotTree[si], eq = S0 && S0.id === nd.id;   /* evolução: liberada pela força do elemento */
      det = '<h4 style="color:' + E.ink + '">' + grimEsc(nd.name) + ' <small>· evolução ' + grimOf(E) + '</small></h4><p>' + grimEsc(nd.desc) + '</p><p class="grim-meta">Força ' + st + '/' + nd.need + ' · Mana ' + nd.mp + ' · Recarga ' + nd.cd / 1000 + 's<br>' + (ok ? (eq ? '<b>Na tecla ' + (si + 1) + '.</b> Clique para voltar a ' + grimEsc(SKILLS.mage[si].name) + '.' : 'Liberada. Clique para pôr na tecla ' + (si + 1) + ' no lugar de ' + grimEsc((slotTreeNode(si) || { nd: SKILLS.mage[si] }).nd.name) + '.') : 'Precisa de força ' + nd.need + ' (perícia ' + E.n + ' + 10 por ponto nos talentos ' + (GRIM_ART[E.k] === 'do' ? 'do ' : 'da ') + E.n + ').') + '</p>'; }
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
    br.nodes.forEach((nd, n) => { if (nd.evo) { const [x, y] = pt(b, R * radii[n]), ok = mStr(me, br.el) >= nd.need, si = evoSlotOf(br), eq = G.slotTree && G.slotTree[si] && G.slotTree[si].id === nd.id, on = GRIM.sel && GRIM.sel.k === 'node' && GRIM.sel.b === b && GRIM.sel.n === n;   /* evolução: cadeado até ter a força; acesa quando está na tecla */
        o += '<g class="g-node' + (ok ? (eq ? ' got' : ' can') : ' soon') + (on ? ' on' : '') + '" data-node="' + b + ',' + n + '" transform="translate(' + f(x) + ',' + f(y) + ')"><circle r="16" class="g-halo" fill="' + E.c + '"/><circle r="10" class="g-disc"' + (eq ? ' style="fill:' + E.c + '"' : '') + '/>' + (ok ? '<text class="g-rank" y="4">' + (eq ? '★' : '✦') + '</text>' : '<path d="M-3.5 -1 v-2.5 a3.5 3.5 0 0 1 7 0 v2.5 M-5 -1 h10 v7 h-10 Z" class="g-lock"/>') + '</g>'; return; }
      const [x, y] = pt(b, R * radii[n]), r0 = (me.tree && me.tree[nd.id]) | 0, unl = bp >= TREE_REQ[n], can = !nd.soon && unl && free > 0 && r0 < nd.max, on = GRIM.sel && GRIM.sel.k === 'node' && GRIM.sel.b === b && GRIM.sel.n === n, rr = nd.soon ? 9 : 10.5;
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
    g.addEventListener('click', () => { const nd = TREE.mage[b].nodes[n], r0 = (me.tree && me.tree[nd.id]) | 0, free = Math.max(0, (me.lvl || 1) - 1 - treePts(me));
      if (nd.evo) { const br = TREE.mage[b], si = evoSlotOf(br); if (mStr(me, br.el) < nd.need) { showToast(nd.name + ': precisa de força ' + nd.need + ' (agora ' + Math.floor(mStr(me, br.el)) + ').'); return; } const eq = G.slotTree && G.slotTree[si] && G.slotTree[si].id === nd.id; slotEquip(si, b, n, eq ? null : nd.id); showToast(eq ? SKILLS.mage[si].name + ' voltou para a tecla ' + (si + 1) + '.' : nd.name + ' na tecla ' + (si + 1) + '.'); grimRender(); return; } if (nd.soon) { showToast(nd.name + ': em breve.'); return; } if (branchPts(me, TREE.mage[b]) < TREE_REQ[n]) { showToast('Gaste ' + TREE_REQ[n] + ' pontos ' + (GRIM_ART[MAGE_EL[b].k] === 'do' ? 'no ' : 'na ') + MAGE_EL[b].n + ' para liberar.'); return; } if (!free) { showToast('Sem pontos livres: suba de nível.'); return; } if (r0 >= nd.max) return; Net.send({ t: 'tlearn', id: nd.id }); }); });
}
if (typeof updateTree === 'function') { const _ut = updateTree; updateTree = function () {
  const me = G.me, tree = $('tree');
  if (me && me.cls === 'mage' && TREE.mage && TREE.mage[0] && TREE.mage[0].el) return grimRender();
  if (tree) { tree.classList.remove('grim-on'); const head = tree.querySelector('.gp-head span'); if (head) head.textContent = 'Constelações'; const info = $('tree-info'); if (info) info.style.display = ''; }
  return _ut.apply(this, arguments);
}; }

// ============================================================
//  EVOLUÇÕES DO AR E DA LUZ: força do elemento, efeitos na tela
// ============================================================
function mStr(me, el) { const br = (TREE.mage || []).find(b => b.el === el); return (typeof useLvl === 'function' ? useLvl(me, 'el_' + el) : 0) + (br ? branchPts(me, br) * 10 : 0); }
function evoSlotOf(br) { return (SKILLS.mage || []).findIndex(s => s.el === br.el); }
if (typeof G !== 'undefined') G.evoFx = G.evoFx || [];
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peV = progEvent; progEvent = function (m, now) {
  if (m.t === 'evofx') { G.evoFx.push({ ...m, t0: performance.now() }); if (G.evoFx.length > 60) G.evoFx.shift(); return true; }
  return _peV(m, now); }; }
/* bicho preso no Gelo Eterno: bloco translúcido com brilhos e rachaduras quando está para soltar */
function drawFrozen(ctx, e, sx, sy, now) { const left = e.frostUntil - now, al = Math.min(1, (now - (e.frostT0 || now)) / 200) * Math.min(1, left / 300), big = MON[e.type] && MON[e.type].big, w = big ? 34 : 18, h = big ? 56 : 36;
  ctx.save(); ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(sx - w, sy); ctx.lineTo(sx - w * 1.05, sy - h * 0.7); ctx.lineTo(sx - w * 0.5, sy - h); ctx.lineTo(sx + w * 0.6, sy - h * 0.95); ctx.lineTo(sx + w * 1.05, sy - h * 0.6); ctx.lineTo(sx + w, sy); ctx.closePath();
  const g = ctx.createLinearGradient(sx - w, sy - h, sx + w, sy); g.addColorStop(0, 'rgba(230,248,255,0.55)'); g.addColorStop(0.5, 'rgba(170,215,245,0.35)'); g.addColorStop(1, 'rgba(120,180,230,0.5)'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(245,252,255,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - w * 0.7, sy - h * 0.75); ctx.lineTo(sx - w * 0.35, sy - h * 0.9); ctx.stroke();
  if (left < 900) { ctx.strokeStyle = 'rgba(90,140,190,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx - w * 0.2, sy - h * 0.9); ctx.lineTo(sx + w * 0.1, sy - h * 0.55); ctx.lineTo(sx - w * 0.15, sy - h * 0.3); ctx.moveTo(sx + w * 0.1, sy - h * 0.55); ctx.lineTo(sx + w * 0.5, sy - h * 0.45); ctx.stroke(); }
  ctx.restore(); }
function evoRing(ctx, cx, cy, R, ox, oy) { ctx.beginPath(); for (let i = 0; i <= 36; i++) { const a = i / 36 * 6.2832, p = iso(cx + Math.cos(a) * R, cy + Math.sin(a) * R); i ? ctx.lineTo(p.sx + ox, p.sy + oy) : ctx.moveTo(p.sx + ox, p.sy + oy); } }
function evoWho(F) { const e = G.players && G.players[F.id]; return e && e.visible !== false ? e : null; }
function drawEvoFx(ctx, now) { if (typeof drawPplTarget === 'function') drawPplTarget(ctx, now); now = performance.now();   /* mesmo relógio do início do efeito */
  const ox = G.view.ox, oy = G.view.oy, T = now / 1000; G.evoFx = G.evoFx.filter(F => now - F.t0 < (F.ms || ({ gust: 1400, hand: 1700, enthl: 1000, tide: 1500 }[F.k] || 1400)) + 300);
  for (const F of G.evoFx) { const t = now - F.t0; if (t < 0) continue; ctx.save();
    if (F.k === 'gust') {   /* Rajada: leque de vento (faixas brancas largas), folhas e poeira */
      const k = Math.min(1, t / 700), al = Math.max(0, 1 - Math.max(0, (t - 850) / 550)), P0 = iso(F.x, F.y);
      { ctx.beginPath(); ctx.moveTo(P0.sx + ox, P0.sy + oy - 8); for (let i = 0; i <= 12; i++) { const aa = F.a - 0.62 + i / 12 * 1.24, q = iso(F.x + Math.cos(aa) * F.r * k, F.y + Math.sin(aa) * F.r * k); ctx.lineTo(q.sx + ox, q.sy + oy - 8); } ctx.closePath(); const g = ctx.createRadialGradient(P0.sx + ox, P0.sy + oy, 4, P0.sx + ox, P0.sy + oy, 140); g.addColorStop(0, 'rgba(235,250,245,' + (0.45 * al).toFixed(2) + ')'); g.addColorStop(1, 'rgba(235,250,245,0)'); ctx.fillStyle = g; ctx.fill(); }   /* o leque */
      for (let i = 0; i < 9; i++) { const da = (i / 8 - 0.5) * 1.1, a0 = F.a + da, rr = 0.8 + k * F.r * (0.55 + (i % 3) * 0.15), len = 1.4, pts = []; for (let s = 0; s <= 8; s++) { const r = rr - len + len * s / 8, aw = a0 + Math.sin(s / 8 * Math.PI) * 0.12 * (i % 2 ? 1 : -1), q = iso(F.x + Math.cos(aw) * r, F.y + Math.sin(aw) * r); pts.push([q.sx + ox, q.sy + oy - 10 - Math.sin(s / 8 * Math.PI) * 4]); }
        ctx.beginPath(); pts.forEach(([x, y], s) => { const w = Math.sin(s / 8 * Math.PI) * (3 + (i % 3)); s ? ctx.lineTo(x, y - w) : ctx.moveTo(x, y); }); for (let s = 8; s >= 0; s--) { const [x, y] = pts[s], w = Math.sin(s / 8 * Math.PI) * (3 + (i % 3)); ctx.lineTo(x, y + w * 0.4); } ctx.closePath(); ctx.fillStyle = 'rgba(250,255,252,' + (0.85 * al).toFixed(2) + ')'; ctx.fill(); }   /* faixas de vento */
      for (let i = 0; i < 8; i++) { const aa = F.a + (i / 7 - 0.5) * 1.0, r = 0.8 + k * F.r * (0.4 + (i % 4) * 0.15), q = iso(F.x + Math.cos(aa) * r, F.y + Math.sin(aa) * r); ctx.save(); ctx.translate(q.sx + ox, q.sy + oy - 14 - Math.sin(t / 90 + i) * 4); ctx.rotate(t / 80 + i); ctx.fillStyle = (i % 3 ? 'rgba(110,160,60,' : 'rgba(180,140,60,') + al.toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 1.5, 0, 0, 7); ctx.fill(); ctx.restore(); }   /* folhas */
      if (!F.dust && G.view) { F.dust = 1; for (let q = 0; q < 18; q++) { const aa = F.a + (Math.random() - 0.5) * 1.1, dd = 1 + Math.random() * F.r, p = iso(F.x + Math.cos(aa) * dd, F.y + Math.sin(aa) * dd); spawnPart('dust', p.sx, p.sy, { vx: Math.cos(aa) * 0.08, vy: Math.sin(aa) * 0.04 - 0.02 }); } } }
    else if (F.k === 'wshield' || F.k === 'pshield') {   /* redemoinho de vento / bolha de luz em volta de quem recebeu */
      const e = evoWho(F); if (e) { const p = iso(e.rx, e.ry), x = p.sx + ox, y = p.sy + oy, al = Math.min(1, t / 300) * Math.min(1, (F.ms - t) / 600);
        if (F.k === 'wshield') { ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { const a0 = T * 5 + i * 1.26, hy = 6 + i * 6; ctx.strokeStyle = 'rgba(225,250,240,' + (0.55 * al).toFixed(2) + ')'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(x, y - hy, 15 - i * 0.8, 5.5, 0, a0, a0 + 2.2); ctx.stroke(); }
          for (let i = 0; i < 4; i++) { const a = T * 6 + i * 1.57, lx = x + Math.cos(a) * 14, ly = y - 14 + Math.sin(a) * 5 - i * 4; ctx.fillStyle = 'rgba(110,150,60,' + al.toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(lx, ly, 1.7, 0.8, a, 0, 7); ctx.fill(); } }
        else { if (e.prayHit && now - e.prayHit < 250) ctx.globalAlpha = 1; const g = ctx.createRadialGradient(x, y - 16, 4, x, y - 16, 22); g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(0.75, 'rgba(255,225,130,' + (0.18 * al).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,215,110,' + (0.5 * al).toFixed(2) + ')'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 16, 15, 21, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(255,235,160,' + (0.6 * al * (0.7 + 0.3 * Math.sin(T * 4))).toFixed(2) + ')'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x, y - 16, 15, 21, 0, 0, 7); ctx.stroke(); } } }
    else if (F.k === 'glide') {   /* Voo da Pluma: penas soltas no rastro e poeira na decolagem e no pouso */
      const e = evoWho(F); if (e && G.view) { if (Math.random() < 0.5 && t < F.ms) { const p = iso(e.rx, e.ry); spawnPart('sparkle', p.sx + (Math.random() - 0.5) * 10, p.sy - 20 - Math.sin(Math.PI * Math.min(1, t / F.ms)) * 40, { color: 'rgba(250,250,240,A)', vx: (Math.random() - 0.5) * 0.02, vy: 0.02, life: 1200 }); }
        if (!F.up) { F.up = 1; const p = iso(e.rx, e.ry); for (let q = 0; q < 10; q++) spawnPart('dust', p.sx + (Math.random() - 0.5) * 16, p.sy, { vx: (Math.random() - 0.5) * 0.06, vy: -0.03 }); }
        if (!F.down && t > F.ms - 60) { F.down = 1; const p = iso(e.rx, e.ry); for (let q = 0; q < 12; q++) spawnPart('dust', p.sx + (Math.random() - 0.5) * 18, p.sy, { vx: (Math.random() - 0.5) * 0.08, vy: -0.03 }); } } }
    else if (F.k === 'hand') {   /* Mão de Luz: coluna de luz do céu, clarão e anel no chão */
      const p = iso(F.tx, F.ty), x = p.sx + ox, y = p.sy + oy, k = Math.min(1, t / 1500), al = Math.min(1, t / 120) * Math.max(0, 1 - Math.max(0, (t - 1000) / 600)), w = 12 + 6 * Math.sin(k * Math.PI);
      { const g = ctx.createLinearGradient(0, y - 170, 0, y); g.addColorStop(0, 'rgba(255,245,200,0)'); g.addColorStop(0.5, 'rgba(255,240,190,' + (0.55 * al).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,250,225,' + (0.85 * al).toFixed(2) + ')'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w * 0.5, y - 170); ctx.lineTo(x + w * 0.5, y - 170); ctx.lineTo(x + w, y); ctx.lineTo(x - w, y); ctx.closePath(); ctx.fill(); }   /* coluna */
      ctx.globalCompositeOperation = 'lighter'; softBeam(ctx, x, y - 170, y, 4, '255,255,240', al); ctx.globalCompositeOperation = 'source-over';
      { const g = ctx.createRadialGradient(x, y, 0, x, y, 46); g.addColorStop(0, 'rgba(255,252,230,' + (0.9 * al).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 46, 20, 0, 0, 7); ctx.fill(); }   /* clarão */
      ctx.strokeStyle = 'rgba(255,225,130,' + (0.95 * al).toFixed(2) + ')'; ctx.lineWidth = 2.6; evoRing(ctx, F.tx, F.ty, 0.3 + k * 2.2, ox, oy); ctx.stroke(); ctx.lineWidth = 1.2; evoRing(ctx, F.tx, F.ty, 0.15 + k * 1.4, ox, oy); ctx.stroke();
      for (let i = 0; i < 10; i++) { const h = ((t / 900 + i / 10) % 1), xx = x + Math.sin(i * 2.4) * w * 0.8, yy = y - h * 150; ctx.fillStyle = 'rgba(255,250,220,' + (al * (1 - h)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(xx, yy, 1.4, 0, 7); ctx.fill(); }   /* faíscas subindo */
      if (G.lights) G.lights.push({ x, y: y - 10, r: 140, c: '255,235,170', a: 0.9 * al, flick: 0 }); }
    else if (F.k === 'well') {   /* Poço de Luz: círculo dourado no chão, selo girando, faíscas subindo */
      const p = iso(F.x, F.y), x = p.sx + ox, y = p.sy + oy, al = Math.min(1, t / 500) * Math.min(1, (F.ms - t) / 800); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,220,120,' + (0.14 * al).toFixed(2) + ')'; evoRing(ctx, F.x, F.y, 3, ox, oy); ctx.fill(); ctx.strokeStyle = 'rgba(255,230,150,' + (0.8 * al).toFixed(2) + ')'; ctx.lineWidth = 1.3; evoRing(ctx, F.x, F.y, 3, ox, oy); ctx.stroke(); ctx.lineWidth = 0.7; evoRing(ctx, F.x, F.y, 2.6, ox, oy); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = T * 0.4 + i * 1.047, q1 = iso(F.x + Math.cos(a) * 2.6, F.y + Math.sin(a) * 2.6), q2 = iso(F.x + Math.cos(a + 2.094) * 2.6, F.y + Math.sin(a + 2.094) * 2.6); ctx.beginPath(); ctx.moveTo(q1.sx + ox, q1.sy + oy); ctx.lineTo(q2.sx + ox, q2.sy + oy); ctx.stroke(); }   /* hexagrama */
      softBeam(ctx, x, y - 110, y, 34, '255,230,150', 0.22 * al);
      if (G.view && Math.random() < 0.6) { const a = Math.random() * 6.28, r = Math.random() * 2.8, q = iso(F.x + Math.cos(a) * r, F.y + Math.sin(a) * r); spawnPart('sparkle', q.sx, q.sy, { color: 'rgba(255,240,180,A)', vx: 0, vy: -0.04, life: 1400 }); }
      if (G.lights) G.lights.push({ x, y: y - 8, r: 140, c: '255,225,140', a: 0.6 * al, flick: 0 }); }
    else if (F.k === 'enthl') {   /* cura da guardiã: fio de seiva verde da árvore até a pessoa e folhinhas subindo */
      const e2 = evoWho(F); if (e2) { const a = iso(F.fx, F.fy), p = iso(e2.rx, e2.ry), x0 = a.sx + ox, y0 = a.sy + oy - 40, x1 = p.sx + ox, y1 = p.sy + oy - 14, k = Math.min(1, t / 400), al = 1 - Math.max(0, (t - 500) / 500); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,240,110,' + (0.7 * al).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 30, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); ctx.stroke();
        for (let i = 0; i < 5; i++) { const h = (t / 900 + i / 5) % 1; ctx.fillStyle = 'rgba(170,250,120,' + (al * (1 - h)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(x1 + Math.sin(i * 2.3) * 7, y1 - h * 22, 1.6, 0.8, i, 0, 7); ctx.fill(); } } }
    else if (F.k === 'sparks') {   /* Faíscas: brasas em arco saindo da mão, com rastro, e um estalo onde caem */
      const p0 = iso(F.x, F.y);
      for (let i = 0; i < (F.l || []).length; i++) { const [ex, ey] = F.l[i], dur = Math.max(120, Math.hypot(ex - F.x, ey - F.y) * 60), k = Math.min(1, t / dur), q = iso(ex, ey), x0 = p0.sx + ox, y0 = p0.sy + oy - 22, x1 = q.sx + ox, y1 = q.sy + oy - 10;
        const at = s => [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s - Math.sin(s * Math.PI) * (10 + (i % 3) * 5)];
        if (k < 1) { for (let s = 7; s >= 1; s--) { const [x, y] = at(Math.max(0, k - s * 0.028)); ctx.fillStyle = 'rgba(255,' + (200 - s * 14) + ',' + (90 - s * 8) + ',' + (0.85 - s * 0.1).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y, 3.2 - s * 0.35, 0, 7); ctx.fill(); } const [hx, hy] = at(k); glowDot(ctx, hx, hy, 14, 'rgba(255,200,110,0.7)', 'rgba(255,90,20,0)'); ctx.fillStyle = 'rgba(255,252,230,1)'; ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, 7); ctx.fill(); if (G.view && Math.random() < 0.5) spawnPart('ember', hx - ox, hy - oy); }
        else { const tt = t - dur; if (tt < 260) { glowDot(ctx, x1, y1, 6 + tt / 14, 'rgba(255,230,160,' + (1 - tt / 260).toFixed(2) + ')', 'rgba(255,90,20,0)'); if (!F['s' + i]) { F['s' + i] = 1; if (G.view) for (let s = 0; s < 6; s++) spawnPart('spark', x1 - ox, y1 - oy, { color: 'rgba(255,190,90,A)' }); } } } }
      if (G.lights) G.lights.push({ x: p0.sx + ox, y: p0.sy + oy - 22, r: 70, c: '255,150,60', a: Math.max(0, 0.7 - t / 900) }); }
    else if (F.k === 'bigball') {   /* Bola de Fogo Maior: esfera enorme e lenta, girando, com rastro de fumaça e sombra no chão */
      const k = Math.min(1, t / F.d), p0 = iso(F.x, F.y), p1 = iso(F.tx, F.ty), gx = p0.sx + (p1.sx - p0.sx) * k + ox, gy = p0.sy + (p1.sy - p0.sy) * k + oy, h = 40 + Math.sin(k * Math.PI) * 50 - k * 24, R = 22 + Math.min(1, t / 300) * 14, ddx = p1.sx - p0.sx, ddy = p1.sy - p0.sy, dl = Math.hypot(ddx, ddy) || 1, bx = -ddx / dl, by = -ddy / dl;
      if (k < 1) { ctx.fillStyle = 'rgba(20,10,5,0.28)'; ctx.beginPath(); ctx.ellipse(gx, gy, R * 1.1, R * 0.45, 0, 0, 7); ctx.fill();
        for (let s = 1; s <= 7; s++) { const kk = Math.max(0, k - s * 0.035), tx2 = p0.sx + (p1.sx - p0.sx) * kk + ox, ty2 = p0.sy + (p1.sy - p0.sy) * kk + oy - (34 + Math.sin(kk * Math.PI) * 46 - kk * 20); glowDot(ctx, tx2, ty2, R * (1 - s * 0.1), 'rgba(255,' + (150 - s * 12) + ',40,' + (0.5 - s * 0.06).toFixed(2) + ')', 'rgba(120,40,10,0)'); }
        const cy = gy - h; glowDot(ctx, gx, cy, R * 2.4, 'rgba(255,160,60,0.55)', 'rgba(255,80,20,0)');
        if (typeof fireTongue === 'function') { const fx = -bx, fy = -by - 0.25, fl = Math.hypot(fx, fy), ux = fx / fl, uy = fy / fl, px = -uy, py = ux;   /* línguas apontando para a frente: a cauda fina escorre para trás e para cima */
          for (let q = 0; q < 16; q++) { const s = (q / 15 - 0.5) * 2, w = Math.sin(T * 11 + q * 2.1), ax = ux + px * s * 0.35 + w * 0.08, ay = uy + py * s * 0.35, al2 = Math.hypot(ax, ay), off = R * (0.15 + Math.abs(s) * 0.45); fireTongue(ctx, gx + px * s * R * 0.75 - ux * off, cy + py * s * R * 0.75 - uy * off - R * 0.1, ax / al2, ay / al2, R * (1.6 + (1 - Math.abs(s)) * 1.9 + 0.35 * w), R * (0.75 - Math.abs(s) * 0.3), q % 3 === 0 ? [190, 45, 18] : q % 2 ? [255, 105, 28] : [255, 165, 48], 0.72, q % 2 ? [255, 215, 120] : null); } }
        { const g4 = ctx.createRadialGradient(gx - R * 0.2, cy - R * 0.2, R * 0.1, gx, cy, R * 0.9); g4.addColorStop(0, 'rgba(255,255,240,1)'); g4.addColorStop(0.35, 'rgba(255,230,140,1)'); g4.addColorStop(0.7, 'rgba(255,150,50,0.97)'); g4.addColorStop(1, 'rgba(210,70,25,0.9)'); ctx.fillStyle = g4; ctx.beginPath(); ctx.arc(gx, cy, R * 0.9, 0, 7); ctx.fill(); }
        for (let q = 0; q < 3; q++) { const an = q * 2.1 + T * 3, rr = R * 0.3; glowDot(ctx, gx + Math.cos(an) * rr, cy + Math.sin(an) * rr, R * 0.45, 'rgba(255,255,235,0.55)', 'rgba(255,220,140,0)'); }
        if (G.view && Math.random() < 0.7) spawnPart('ember', gx - ox + (Math.random() - 0.5) * R, cy - oy); if (G.view && Math.random() < 0.6 && typeof fireSmokeAt === 'function') fireSmokeAt(gx - ox + bx * R, cy - oy + by * R - R * 0.5, true, 5);
        if (G.lights) G.lights.push({ x: gx, y: cy, r: 170, c: '255,140,50', a: 0.95 }); } }
    else if (F.k === 'meteor') {   /* Chuva de Meteoros: céu avermelhado na área, aviso no chão, pedras com cauda de fogo caindo em diagonal */
      const al = Math.min(1, t / 300) * Math.min(1, Math.max(0, (F.ms - t) / 600)); ctx.fillStyle = 'rgba(160,40,20,' + (0.14 * al).toFixed(2) + ')'; evoRing(ctx, F.tx, F.ty, F.r, ox, oy); ctx.fill(); ctx.strokeStyle = 'rgba(255,120,60,' + (0.4 * al).toFixed(2) + ')'; ctx.lineWidth = 1.2; evoRing(ctx, F.tx, F.ty, F.r, ox, oy); ctx.stroke();
      for (const [mx, my, dl] of F.l || []) { const tt = t - dl, q = iso(mx, my), x = q.sx + ox, y = q.sy + oy; if (tt < -350 || tt > 650) continue;
        { const w = Math.min(1, (tt + 350) / 350); ctx.strokeStyle = 'rgba(255,90,40,' + (0.7 * w).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 16 * (1.3 - w * 0.3), 7 * (1.3 - w * 0.3), 0, 0, 7); ctx.stroke(); }
        if (tt >= 0) { const k = tt / 650, hx = x + (1 - k) * 90, hy = y - (1 - k) * 300; const ux = 0.287, uy = -0.958, nx = -uy, ny = ux, L = 150, W0 = 13;   /* cauda: para cima e à direita, de onde a pedra vem */
          { const gt = ctx.createLinearGradient(hx, hy, hx + ux * L, hy + uy * L); gt.addColorStop(0, 'rgba(255,200,90,0.95)'); gt.addColorStop(0.3, 'rgba(255,120,40,0.7)'); gt.addColorStop(1, 'rgba(120,40,20,0)'); ctx.fillStyle = gt; ctx.beginPath(); ctx.moveTo(hx + nx * W0, hy + ny * W0); ctx.quadraticCurveTo(hx + ux * L * 0.5 + nx * W0 * 0.6, hy + uy * L * 0.5 + ny * W0 * 0.6, hx + ux * L, hy + uy * L); ctx.quadraticCurveTo(hx + ux * L * 0.5 - nx * W0 * 0.6, hy + uy * L * 0.5 - ny * W0 * 0.6, hx - nx * W0, hy - ny * W0); ctx.closePath(); ctx.fill(); }
          { const gt = ctx.createLinearGradient(hx, hy, hx + ux * L * 0.5, hy + uy * L * 0.5); gt.addColorStop(0, 'rgba(255,250,220,0.95)'); gt.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = gt; ctx.beginPath(); ctx.moveTo(hx + nx * 5, hy + ny * 5); ctx.lineTo(hx + ux * L * 0.5, hy + uy * L * 0.5); ctx.lineTo(hx - nx * 5, hy - ny * 5); ctx.closePath(); ctx.fill(); }
          glowDot(ctx, hx, hy, 34, 'rgba(255,190,90,0.85)', 'rgba(255,80,20,0)'); ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.arc(hx, hy, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#5a3f30'; ctx.beginPath(); ctx.arc(hx + 2, hy - 3, 5, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,170,70,0.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx, hy, 10, 1.6, 4.4); ctx.stroke();
          if (G.view && Math.random() < 0.6) spawnPart('ember', hx - ox, hy - oy); if (G.lights) G.lights.push({ x: hx, y: hy, r: 80, c: '255,140,50', a: 0.8 }); } } }
    else if (F.k === 'mist') {   /* Névoa: nuvem baixa branco-azulada, rolos de névoa girando devagar */
      const al = Math.min(1, t / 700) * Math.min(1, (F.ms - t) / 1200), R = F.r || 3;
      { const p = iso(F.x, F.y), x = p.sx + ox, y = p.sy + oy, g2 = ctx.createRadialGradient(x, y - 10, 6, x, y - 10, R * 36); g2.addColorStop(0, 'rgba(232,242,248,' + (0.55 * al).toFixed(2) + ')'); g2.addColorStop(0.7, 'rgba(220,234,244,' + (0.38 * al).toFixed(2) + ')'); g2.addColorStop(1, 'rgba(220,234,244,0)'); ctx.fillStyle = g2; evoRing(ctx, F.x, F.y, R * 1.08, ox, oy - 10); ctx.fill(); }
      for (let i = 0; i < 14; i++) { const a = i * 2.39 + T * (0.08 + (i % 3) * 0.03), rr = R * (0.25 + ((i * 37) % 70) / 100), q = iso(F.x + Math.cos(a) * rr, F.y + Math.sin(a) * rr), x = q.sx + ox, y = q.sy + oy - 8 - (i % 4) * 5 - Math.sin(T * 0.7 + i) * 3, w = 22 + (i % 5) * 6;
        const g3 = ctx.createRadialGradient(x, y, 2, x, y, w); g3.addColorStop(0, 'rgba(245,250,255,' + (0.42 * al).toFixed(2) + ')'); g3.addColorStop(1, 'rgba(235,245,252,0)'); ctx.fillStyle = g3; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.45, 0, 0, 7); ctx.fill(); } }
    else if (F.k === 'tide') {   /* Correnteza: frente de onda azul com espuma avançando na direção da mira */
      const dur = 1100, k = Math.min(1, t / dur), al = Math.max(0, 1 - Math.max(0, (t - dur) / 400)), ca = Math.cos(F.a), sa = Math.sin(F.a), d = 0.4 + k * F.r, W = 1.5;
      const pt = (al2, sd) => { const q = iso(F.x + ca * al2 - sa * sd, F.y + sa * al2 + ca * sd); return [q.sx + ox, q.sy + oy]; };
      { ctx.beginPath(); for (let s = 0; s <= 10; s++) { const sd = -W + s * W / 5, [x, y] = pt(Math.max(0.3, d - 1.4) + Math.sin(s / 10 * Math.PI) * 0.3, sd); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } for (let s = 10; s >= 0; s--) { const sd = -W + s * W / 5, [x, y] = pt(d + Math.sin(s / 10 * Math.PI) * 0.4, sd); ctx.lineTo(x, y - 24 - Math.sin(s * 1.3 + T * 8) * 3); } ctx.closePath(); { const [fx, fy] = pt(d, 0), gr = ctx.createLinearGradient(fx, fy - 26, fx, fy + 8); gr.addColorStop(0, 'rgba(170,220,245,' + (0.85 * al).toFixed(2) + ')'); gr.addColorStop(0.45, 'rgba(60,140,200,' + (0.75 * al).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(30,90,150,' + (0.55 * al).toFixed(2) + ')'); ctx.fillStyle = gr; } ctx.fill(); }
      { ctx.beginPath(); for (let s = 0; s <= 10; s++) { const sd = -W + s * W / 5, [x, y] = pt(d + Math.sin(s / 10 * Math.PI) * 0.4, sd); s ? ctx.lineTo(x, y - 24 - Math.sin(s * 1.3 + T * 8) * 3) : ctx.moveTo(x, y - 24); } ctx.strokeStyle = 'rgba(245,252,255,' + (0.95 * al).toFixed(2) + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
        for (let s = 0; s <= 14; s++) { const sd = -W + s * W / 7, [x, y] = pt(d + Math.sin(s / 14 * Math.PI) * 0.4, sd); ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * al).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(s * 3.1 + T * 9) * 3, y - 27 - Math.abs(Math.sin(s * 2.3 + T * 11)) * 6, 2 + (s % 3), 0, 7); ctx.fill(); } }   /* crista de espuma e respingos */
      { ctx.beginPath(); const [x0, y0] = pt(0.3, -W * 0.8), [x1, y1] = pt(Math.max(0.3, d - 1.2), -W * 0.8), [x2, y2] = pt(Math.max(0.3, d - 1.2), W * 0.8), [x3, y3] = pt(0.3, W * 0.8); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fillStyle = 'rgba(120,180,220,' + (0.22 * al).toFixed(2) + ')'; ctx.fill(); }   /* rastro molhado */
      if (G.view && k < 1 && Math.random() < 0.8) { const sd = (Math.random() - 0.5) * 2 * W, q = iso(F.x + ca * d - sa * sd, F.y + sa * d + ca * sd); spawnPart('sparkle', q.sx, q.sy - 12, { color: 'rgba(230,248,255,A)', vx: ca * 0.03, vy: -0.05, life: 700 }); } }
    else if (F.k === 'frost') {   /* Gelo Eterno: chão congelado com cristais que brotam e um clarão frio */
      const al = Math.min(1, t / 200) * Math.min(1, (F.ms - t) / 700), k = Math.min(1, t / 350), R = F.r || 2.5, p = iso(F.tx, F.ty), x = p.sx + ox, y = p.sy + oy;
      ctx.fillStyle = 'rgba(200,232,250,' + (0.42 * al).toFixed(2) + ')'; evoRing(ctx, F.tx, F.ty, R * k, ox, oy); ctx.fill(); ctx.strokeStyle = 'rgba(240,252,255,' + (0.85 * al).toFixed(2) + ')'; ctx.lineWidth = 1.4; evoRing(ctx, F.tx, F.ty, R * k, ox, oy); ctx.stroke();
      for (let i = 0; i < 9; i++) { const a = i * 0.698 + 0.3, rr = R * k * (0.35 + (i % 3) * 0.25), q = iso(F.tx + Math.cos(a) * rr, F.ty + Math.sin(a) * rr), cx2 = q.sx + ox, cy2 = q.sy + oy, h = (10 + (i % 4) * 5) * k; ctx.beginPath(); ctx.moveTo(cx2 - 3, cy2); ctx.lineTo(cx2, cy2 - h); ctx.lineTo(cx2 + 3, cy2); ctx.closePath(); ctx.fillStyle = 'rgba(214,240,255,' + (0.85 * al).toFixed(2) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(120,180,220,' + (0.7 * al).toFixed(2) + ')'; ctx.lineWidth = 0.8; ctx.stroke(); }
      if (t < 400) { const g2 = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, 70); g2.addColorStop(0, 'rgba(235,250,255,' + (0.8 * (1 - t / 400)).toFixed(2) + ')'); g2.addColorStop(1, 'rgba(200,235,255,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(x, y - 10, 70, 34, 0, 0, 7); ctx.fill(); }
      if (G.lights) G.lights.push({ x, y: y - 8, r: 110, c: '190,230,255', a: 0.5 * al, flick: 0 }); }
    else if (F.k === 'deflect' || F.k === 'pshit') {   /* flecha desviada / golpe no escudo de luz */
      const e = evoWho(F); if (e) { const p = iso(e.rx, e.ry), x = p.sx + ox, y = p.sy + oy - 16, k = t / 400, al = 1 - Math.min(1, k); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = (F.k === 'pshit' ? 'rgba(255,230,150,' : 'rgba(230,255,245,') + al.toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 8 + k * 14, 10 + k * 16, 0, 0, 7); ctx.stroke(); } }
    ctx.restore(); }
}
function glideLift(e, now) { const A = e.anim; if (!A || A.a !== 'glide') return 0; const k = (now - A.t0) / (A.ms || 1100); return k > 0 && k < 1 ? Math.sin(Math.PI * k) * 42 : 0; }

// ---------- ataque automático em pessoas: botão na tela, escolha do alvo e marca ----------
function pplBtnSync() {
  if (typeof document === 'undefined' || !G.me) return; let b = document.getElementById('pplbtn');
  const show = G.me.cls === 'archer' || G.me.cls === 'mage'; if (!b && show) { b = document.createElement('button'); b.id = 'pplbtn'; b.type = 'button'; b.title = 'Ataque automático em pessoas: bate no jogador ou morador que você clicar e revida em quem te atacar';
    b.onclick = ev => { ev.stopPropagation(); Net.send({ t: 'auto', ppl: G.pplAuto ? 0 : 1 }); }; document.body.appendChild(b); }
  if (!b) return; b.hidden = !show; b.classList.toggle('on', !!G.pplAuto); b.textContent = G.pplAuto ? '⚔ Pessoas: ligado' : '⚔ Pessoas: desligado'; }
function personUnderMouse(cx, cy) {
  const w = screenToWorld(cx, cy); if (!w) return null; let best = null, bd = 0.9;
  for (const id in G.players) { const e = G.players[id]; if (e === G.me || !e.visible) continue; const d = Math.hypot(e.rx - w.x, e.ry - 0.4 - w.y); if (d < bd) { bd = d; best = { k: 'p', id, name: e.name }; } }
  for (const id in G.npcs) { const e = G.npcs[id]; if (!e.visible || e.dead || (e.kind && e.kind.startsWith('ent_'))) continue; const d = Math.hypot(e.rx - w.x, e.ry - 0.4 - w.y); if (d < bd) { bd = d; best = { k: 'n', id, name: e.name || 'morador' }; } }
  return best; }
function drawPplTarget(ctx, now) {
  if (!G.pplAuto || !G.pTarget) return; const T = G.pTarget, e = T.k === 'p' ? G.players[T.id] : G.npcs[T.id]; if (!e || e.dead) { G.pTarget = null; return; }
  const p = iso(e.rx, e.ry), x = p.sx + G.view.ox, y = p.sy + G.view.oy - 48 - Math.sin(now / 200) * 2;
  ctx.save(); ctx.fillStyle = '#d83a2a'; ctx.strokeStyle = '#1a0a06'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 4, y - 5); ctx.lineTo(x + 4, y - 5); ctx.lineTo(x, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
if (typeof setInterval === 'function' && typeof document !== 'undefined') setInterval(() => { if (G.started) pplBtnSync(); }, 1500);
