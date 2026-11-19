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
  if (m.t === 'flamefx') { const e = G.players[m.id]; if (e) e.flame = m.on ? { a: m.a, r: m.r, until: now + 450 } : null; return true; }
  if (m.t === 'ember') { const e = G.players[m.id]; if (e) e.emberUntil = m.ms ? now + m.ms : 0; return true; }
  if (m.t === 'mburn') { const e = G.monsters[m.id]; if (e) e.burnUntil = now + m.ms; return true; }
  return _pe(m, now);
}; }

// ---------- Brasa na mão: chama e luz de tocha (desenhada junto do personagem) ----------
// ---------- Chamas: segurar a tecla 1 solta um jato contínuo na direção do mouse ----------
G.flame = G.flame || { on: false };
function flameAngle() { const me = G.me; if (!me) return 0; if (!G.mouseW) return me.fa ?? 0; return Math.atan2(G.mouseW.y - me.y, G.mouseW.x - me.x); }
function flameKey(e) { const me = G.me; if (!me || me.cls !== 'mage' || (typeof slotTreeNode === 'function' && slotTreeNode(0)) || !SKILLS.mage[0] || SKILLS.mage[0].id !== 'ember') return false; if (!e.repeat) flameStart(); return true; }
function flameStart() { const me = G.me; if (!me || me.downed || G.flame.on) return; if ((me.mp || 0) < 2) { showToast('Mana insuficiente.'); return; } G.flame.on = true; Net.send({ t: 'flame', on: 1, a: flameAngle() }); }
function flameStop() { if (!G.flame.on) return; G.flame.on = false; Net.send({ t: 'flame', on: 0 }); }
setInterval(() => { if (!G.flame.on || !G.me) return; if (G.me.downed) { flameStop(); return; } Net.send({ t: 'flame', on: 1, a: flameAngle() }); }, 150);
window.addEventListener('blur', () => flameStop());
function drawFlameFx(ctx, now) {
  for (const id in G.players) { const e = G.players[id], F = e.flame; if (!F || now > F.until || !e.visible) continue;
    if (!e.anim || now - e.anim.t0 > (e.anim.ms || 600)) e.anim = { a: 'cast', t0: now, ms: 600 };
    const ox = G.view.ox, oy = G.view.oy, hp = iso(e.rx + Math.cos(F.a) * 0.3, e.ry + Math.sin(F.a) * 0.3), hx = hp.sx + ox, hy = hp.sy + oy - (R3.ok ? 28 : 36);
    const tp = iso(e.rx + Math.cos(F.a) * F.r, e.ry + Math.sin(F.a) * F.r), tx = tp.sx + ox, ty = tp.sy + oy - 14, L = Math.hypot(tx - hx, ty - hy) || 1, ux = (tx - hx) / L, uy = (ty - hy) / L, px = -uy, py = ux;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let layer = 0; layer < 3; layer++) { const W = [14, 9, 4][layer], cols = [['rgba(255,70,10,0.0)', 'rgba(255,90,20,0.55)', 'rgba(255,60,10,0)'], ['rgba(255,150,40,0.1)', 'rgba(255,170,60,0.7)', 'rgba(255,120,30,0)'], ['rgba(255,250,220,0.9)', 'rgba(255,230,140,0.75)', 'rgba(255,200,80,0)']][layer];
      const g = ctx.createLinearGradient(hx, hy, tx, ty); g.addColorStop(0, cols[0]); g.addColorStop(0.35, cols[1]); g.addColorStop(1, cols[2]); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hx + px * 1.5, hy + py * 1.5);
      const N = 10; for (let k = 1; k <= N; k++) { const t = k / N, wob = Math.sin(now / 60 + k * 1.7 + layer) * 2.5 * t, w = 1.5 + W * t + wob; ctx.lineTo(hx + ux * L * t + px * w, hy + uy * L * t + py * w); }
      for (let k = N; k >= 1; k--) { const t = k / N, wob = Math.cos(now / 55 + k * 1.3 + layer) * 2.5 * t, w = 1.5 + W * t + wob; ctx.lineTo(hx + ux * L * t - px * w, hy + uy * L * t - py * w); } ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (G.view) for (let k = 0; k < 3; k++) { const t = Math.random(); spawnPart('ember', hx + ux * L * t + px * (Math.random() - 0.5) * 16 * t - ox, hy + uy * L * t + py * (Math.random() - 0.5) * 16 * t - oy, { vx: ux * 0.08, vy: uy * 0.08 - 0.03 }); }
    if (Math.random() < 0.25 && G.view) spawnPart('smoke', tx - ox, ty - oy - 4, { color: '#5a4a40' });
    G.lights.push({ x: hx + ux * L * 0.5, y: hy + uy * L * 0.5, r: 90 + L * 0.8, c: '255,150,60', a: 0.9, flick: 1 });
  }
}
// ---------- meditação: escolher o elemento e a aura de cada um ----------
const MEDIT_UI = [['fire', '🔥', 'Fogo', 'Rende mais perto de fogueiras e forjas.'], ['water', '💧', 'Água', 'Rende mais perto de rios, lagos e do ofurô.'], ['earth', '🌿', 'Terra', 'Rende mais na grama e na floresta.'], ['wind', '🌬', 'Ar', 'Rende mais no alto ou em campo aberto.'], ['holy', '☀', 'Luz', 'Rende mais ao sol, de dia.']];
function meditPick() {
  if (!G.me || G.me.cls !== 'mage') return; if (G.me.medit) { Net.send({ t: 'medit', on: 0 }); return; }
  const html = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">Sente em lótus e concentre-se num elemento: sobe a barra dele no Progresso e recupera vida, mana e fôlego. Ande para parar.</div><div class="lift-list" style="padding-top:8px">' + MEDIT_UI.map(([k, ic, n, sub]) => '<button class="lift-btn" data-el="' + k + '"><span class="lift-n">' + ic + '</span><span><b>' + n + '</b><br><small>' + sub + '</small></span></button>').join('') + '</div>';
  const d = staffPanel('meditmenu', 'Meditar', html); d.querySelectorAll('[data-el]').forEach(b => b.onclick = () => { d.remove(); G.path = null; G.pathGoal = null; G.me.walking = false; Net.send({ t: 'medit', on: 1, el: b.dataset.el }); });
}
const AURA_C = { fire: ['255,120,40', '255,200,90'], water: ['40,130,230', '160,220,255'], earth: ['90,140,50', '150,105,60'], wind: ['120,200,180', '235,255,250'], holy: ['255,220,120', '255,250,215'] };
function drawMeditAura(ctx, e, sx, sy, now, front) {
  const M = e.medit, el = M.el, C = AURA_C[el] || AURA_C.fire, age = (now - M.t0) / 1000, k = Math.min(1, age / 2.5), lev = Math.min(1, Math.max(0, (age - 2.5) / 1.8)), cy = sy - 10 - lev * 8, T = now / 1000;
  ctx.save(); ctx.globalCompositeOperation = el === 'fire' || el === 'holy' ? 'lighter' : 'source-over';   /* fogo e luz brilham; água, terra e ar têm cor própria */
  if (!front) {   /* chão: círculo do elemento */
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 20); g.addColorStop(0, 'rgba(' + C[0] + ',' + (0.42 * k).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + C[0] + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, 20, 9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(' + C[0] + ',' + (0.85 * k).toFixed(2) + ')'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(sx, sy, 15, 6.6, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(' + C[1] + ',' + (0.6 * k).toFixed(2) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(sx, sy, 17.5, 7.7, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 5; i++) { const a = T * 0.4 + i * 1.2566; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * 15, sy + Math.sin(a) * 6.6, 0.9, 0, 7); ctx.fillStyle = 'rgba(' + C[1] + ',' + (0.7 * k).toFixed(2) + ')'; ctx.fill(); }
    if (el === 'water') for (let i = 0; i < 3; i++) { const q = ((T * 0.5 + i / 3) % 1); ctx.strokeStyle = 'rgba(' + C[1] + ',' + (0.55 * (1 - q) * k).toFixed(2) + ')'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(sx, sy, 6 + q * 18, (6 + q * 18) * 0.44, 0, 0, 7); ctx.stroke(); }   /* ondas no chão */
    if (el === 'holy') { const g2 = ctx.createLinearGradient(0, sy - 60, 0, sy); g2.addColorStop(0, 'rgba(' + C[1] + ',0)'); g2.addColorStop(1, 'rgba(' + C[0] + ',' + (0.28 * k).toFixed(2) + ')'); ctx.fillStyle = g2; ctx.fillRect(sx - 9, sy - 60, 18, 60); }   /* coluna de luz */
  }
  const orb = (n, rx, ry, spd, draw) => { for (let i = 0; i < n; i++) { const a = T * spd + i * Math.PI * 2 / n, s = Math.sin(a); if ((s > 0) !== !!front) continue; draw(sx + Math.cos(a) * rx, cy + s * ry, a, i); } };
  if (el === 'fire') { orb(6, 13, 5, 1.1, (x, y, a, i) => { const f = 2.2 + Math.sin(T * 9 + i) * 0.8; const g = ctx.createRadialGradient(x, y, 0, x, y, f * 2); g.addColorStop(0, 'rgba(255,240,180,' + (0.9 * k).toFixed(2) + ')'); g.addColorStop(0.5, 'rgba(255,130,40,' + (0.6 * k).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - f * 0.6, f, f * 1.7, 0, 0, 7); ctx.fill(); });
    if (front && Math.random() < 0.3 && G.view) spawnPart('ember', sx + (Math.random() - 0.5) * 22 - G.view.ox, sy - 4 - G.view.oy, { vx: (Math.random() - 0.5) * 0.02, vy: -0.05 }); }
  if (el === 'water') orb(5, 12, 5, 0.8, (x, y, a) => { ctx.fillStyle = 'rgba(' + C[1] + ',' + (0.85 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.moveTo(x, y - 2.6); ctx.quadraticCurveTo(x + 1.7, y, x, y + 1.3); ctx.quadraticCurveTo(x - 1.7, y, x, y - 2.6); ctx.fill(); });   /* gotas em órbita */
  if (el === 'earth') orb(6, 14, 5.5, 0.45, (x, y, a, i) => { const bob = Math.sin(T * 1.5 + i) * 1.4; if (i % 2) { ctx.fillStyle = 'rgba(150,115,80,' + (0.95 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(x, y + bob, 1.8, 1.3, a, 0, 7); ctx.fill(); } else { ctx.fillStyle = 'rgba(120,190,80,' + (0.9 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(x, y + bob, 2, 0.9, a + T, 0, 7); ctx.fill(); } });   /* pedrinhas e folhas flutuando */
  if (el === 'wind') { ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const a0 = T * 2.2 + i * 1.57, hgt = ((T * 0.6 + i / 4) % 1); for (let s = 0; s < 6; s++) { const a = a0 + s * 0.22, sn = Math.sin(a); if ((sn > 0) !== !!front) continue; const rr = 13 - hgt * 5; ctx.strokeStyle = 'rgba(' + C[1] + ',' + Math.min(1, 0.3 * s * k * (1 - hgt * 0.7)).toFixed(2) + ')'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(sx, sy - 4 - hgt * 34, rr, a - 0.2, a, false); ctx.stroke(); } } }   /* redemoinho que sobe */
  if (el === 'holy') { orb(7, 10, 4, 0.6, (x, y, a, i) => { const tw = 0.6 + Math.sin(T * 4 + i * 2) * 0.4; ctx.fillStyle = 'rgba(255,245,200,' + (tw * k).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y - 6 + Math.sin(T + i) * 3, 0.8 + tw * 0.6, 0, 7); ctx.fill(); });
    if (front) { ctx.strokeStyle = 'rgba(255,230,150,' + (0.75 * k).toFixed(2) + ')'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(sx, cy - 30, 6, 2, 0, 0, 7); ctx.stroke(); } }   /* auréola */
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
