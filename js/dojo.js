// ============================================================
//  DOJÔ DO PUNHO DE FERRO — prédio japonês ao lado do banco:
//  elevador manual (escolher o andar), dojô no térreo e apartamentos em cima
// ============================================================

// em cima do elevador (o tile do poço) de um prédio com elevador?
function liftNear() {
  const me = G.me; if (!me || me.downed || G.climbing || (me.z || 0) >= 0.5) return null;
  const fl = me.fl || 0, bi = fl !== 0 ? me.fb : bldAt(me.x, me.y), b = BUILDINGS[bi]; if (!b || stairKind(b, 0) !== 'lift') return null;
  const [cx, cy] = localToWorld(b, 7, 1); return Math.hypot(me.x - cx, me.y - cy) < 1.05 ? { bi, b, fl } : null;   /* dentro da cabine 2×2 */
}
function liftFloorName(b, f) { const top = floorsOf(b) - 1; return f === 0 ? 'Térreo — Dojô e saída' : f === top ? f + 'º andar — Suíte de luxo' : f + 'º andar — apartamentos ' + (f * 100 + 1) + ' e ' + (f * 100 + 2); }
// menu do elevador: o ascensorista leva a cabine ao andar escolhido (por enquanto sem som)
function liftMenu() {
  const L = liftNear(); if (!L) return; let d = document.getElementById('liftmenu'); if (d) d.remove();
  d = document.createElement('div'); d.id = 'liftmenu'; d.className = 'gpanel lift-panel';
  const nF = floorsOf(L.b), rows = []; for (let f = nF - 1; f >= 0; f--) rows.push('<button class="lift-btn' + (f === L.fl ? ' here' : '') + '" data-f="' + f + '"' + (f === L.fl ? ' disabled' : '') + '><span class="lift-n">' + (f === 0 ? 'T' : f) + '</span><span>' + liftFloorName(L.b, f) + (f === L.fl ? ' <small>(você está aqui)</small>' : '') + '</span></button>');
  const dial = '<svg viewBox="0 0 120 64" class="lift-dial"><path d="M8 60 A52 52 0 0 1 112 60" fill="none" stroke="#c9a24a" stroke-width="3"/>' + Array.from({ length: nF }, (_, f) => { const a = Math.PI - f / (nF - 1) * Math.PI, x = 60 + Math.cos(a) * 42, y = 60 - Math.sin(a) * 42; return '<text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="middle" font-size="11" fill="#f1e2b8" font-family="serif">' + (f === 0 ? 'T' : f) + '</text>'; }).join('') +
    (() => { const a = Math.PI - L.fl / (nF - 1) * Math.PI; return '<line x1="60" y1="60" x2="' + (60 + Math.cos(a) * 30).toFixed(1) + '" y2="' + (60 - Math.sin(a) * 30).toFixed(1) + '" stroke="#e8c060" stroke-width="2.5" stroke-linecap="round"/><circle cx="60" cy="60" r="4" fill="#c9a24a"/>'; })() + '</svg>';
  d.innerHTML = '<div class="gp-head"><span>Elevador</span><button class="gp-x" data-x>✕</button></div>' + dial + '<div class="lift-note">O ascensorista puxa a grade de latão: — Para qual andar?</div><div class="lift-list">' + rows.join('') + '</div>';
  document.body.appendChild(d);
  d.querySelector('[data-x]').onclick = () => d.remove();
  d.querySelectorAll('[data-f]').forEach(btn => btn.onclick = () => { const to = +btn.dataset.f; d.remove(); const N = liftNear(); if (!N) return; G.liftRide = { t0: performance.now(), from: N.fl, to }; Net.send({ t: 'floor', b: N.bi, to, lift: 1 }); showToast('A grade fecha e a cabine ' + (to > N.fl ? 'sobe' : 'desce') + ' até o ' + (to === 0 ? 'térreo' : to + 'º andar') + '.'); });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const d = document.getElementById('liftmenu'); if (d) d.remove(); } });

// ---------- ofurô da suíte de luxo: entrar, relaxar e o desenho do banho ----------
function ofuroNear() {
  const me = G.me; if (!me || me.downed || me.bathing || (me.fl || 0) === 0) return null;
  const b = BUILDINGS[me.fb], O2 = typeof ofuroOf === 'function' && ofuroOf(b); if (!O2 || me.fl !== O2.fl) return null;
  return Math.hypot(me.x - O2.x, me.y - O2.y) < 1.6 ? O2 : null;
}
function bathEnter() {
  const O2 = ofuroNear(), me = G.me; if (!O2) return;
  me.x = me.rx = O2.x; me.y = me.ry = O2.y; me.sit = { chair: 0, bath: 1 }; G.path = null; G.pathGoal = null; me.walking = false;
  Net.send({ t: 'bath', on: 1 });
}
if (typeof progEvent === 'function') { const _peB = progEvent; progEvent = function (m, now) {
  if (m.t === 'bath') { const e = G.players[m.id]; if (e) { e.bathing = m.on ? { t0: now, x: m.x, y: m.y, rx: m.rx, ry: m.ry } : null; if (!m.on && e === G.me && G.me.sit && G.me.sit.bath) G.me.sit = null; } return true; }
  return _peB(m, now);
}; }
// água por cima do corpo (até o peito), toalhinha na cabeça, vapor, "Ahhh..." e a roupa no cabideiro
function drawBath(ctx, e, sx, sy, now) {
  const B = e.bathing, k = R3.ok ? 0.8 : 1.1, top = sy - 15 * k;   /* água até o peito de quem está sentado */
  ctx.save();
  // borda de hinoki na frente e a água quente
  const g = ctx.createRadialGradient(sx, top + 5 * k, 2, sx, top + 5 * k, 24 * k); g.addColorStop(0, 'rgba(120,200,200,0.95)'); g.addColorStop(0.8, 'rgba(130,205,200,0.9)'); g.addColorStop(1, 'rgba(130,205,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, top + 5 * k, 24 * k, 10 * k, 0, 0, 7); ctx.fill();   /* só a superfície em volta do corpo (a banheira já está no cenário) */
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(sx, top + 2, 26 * k, 8 * k, 0, 0.15, Math.PI - 0.15); ctx.stroke();
  for (let q = 0; q < 3; q++) { const ph = (now / 900 + q / 3) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sx + (q - 1) * 9 * k, top + 4, (3 + ph * 9) * k, (1 + ph * 3) * k, 0, 0, 7); ctx.stroke(); }
  /* (sem borda desenhada: a banheira de hinoki já aparece no cenário) */
  const hy = sy - (R3.ok ? 37 : 50);
  ctx.restore();
  // vapor subindo
  if (Math.random() < 0.35 && G.view) spawnPart('smoke', sx - G.view.ox + (Math.random() - 0.5) * 30, top - G.view.oy - 4, { color: 'rgba(255,255,255,A)', life: 1800 });
  // a roupa (na cor da vocação) e a arma penduradas no cabideiro
  if (B.rx != null) { const p = iso(B.rx, B.ry), p0 = iso(e.rx, e.ry), cx = sx + p.sx - p0.sx, cy = sy + p.sy - p0.sy;   /* relativo ao personagem: mesma escala do desenho */ const col = { knight: '#6a7a8a', archer: '#4a6a3a', mage: '#7a2a2a' }[e.cls] || '#6a5a4a';
    ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx - 8, cy - 40); ctx.lineTo(cx + 8, cy - 40); ctx.lineTo(cx + 10, cy - 18); ctx.lineTo(cx - 10, cy - 18); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(cx - 1, cy - 40, 2, 22);
    ctx.strokeStyle = e.cls === 'mage' ? '#6a4a2a' : '#b8bcc4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 13, cy - 44); ctx.lineTo(cx + 17, cy - 8); ctx.stroke(); ctx.restore(); }
}

// quem está no ofurô: sem camisa (de sunga, debaixo d'água) — cabeça, ombros e braços apoiados na borda
function drawBather(ctx, e, sx, sy, now) {
  const k = R3.ok ? 1 : 1.3, skin = '#e0ae86', shade = '#c28c66', hair = ({ knight: '#4a3424', archer: '#6a4a2a', mage: '#2a2a2e' })[e.cls] || '#3a2a1e', br = Math.sin(now / 900) * 0.6;
  const cy = sy - 17 * k + br, hx = sx, hy = cy - 13 * k;
  ctx.save();
  ctx.fillStyle = shade; ctx.beginPath(); ctx.ellipse(sx - 15 * k, cy + 5 * k, 6 * k, 3 * k, -0.3, 0, 7); ctx.ellipse(sx + 15 * k, cy + 5 * k, 6 * k, 3 * k, 0.3, 0, 7); ctx.fill();   /* braços na borda */
  const gt = ctx.createLinearGradient(sx - 11 * k, 0, sx + 11 * k, 0); gt.addColorStop(0, shade); gt.addColorStop(0.45, skin); gt.addColorStop(1, shade);
  ctx.fillStyle = gt; ctx.beginPath(); ctx.moveTo(sx - 12 * k, cy + 6 * k); ctx.quadraticCurveTo(sx - 13 * k, cy - 4 * k, sx - 5 * k, cy - 6 * k); ctx.lineTo(sx + 5 * k, cy - 6 * k); ctx.quadraticCurveTo(sx + 13 * k, cy - 4 * k, sx + 12 * k, cy + 6 * k); ctx.closePath(); ctx.fill();   /* ombros e peito */
  ctx.strokeStyle = 'rgba(150,100,70,.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx - 4 * k, cy - 1 * k); ctx.quadraticCurveTo(sx, cy + 1 * k, sx + 4 * k, cy - 1 * k); ctx.stroke();
  ctx.fillStyle = shade; ctx.fillRect(sx - 2.5 * k, cy - 9 * k, 5 * k, 4 * k);   /* pescoço */
  const gh = ctx.createRadialGradient(hx - 2 * k, hy - 2 * k, 1, hx, hy, 7 * k); gh.addColorStop(0, '#f0c49c'); gh.addColorStop(1, shade); ctx.fillStyle = gh; ctx.beginPath(); ctx.ellipse(hx, hy, 5.6 * k, 6.4 * k, 0, 0, 7); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(hx, hy - 2.6 * k, 6 * k, 4.4 * k, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx, hy - 3.2 * k, 5.6 * k, 3.2 * k, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 0.9; for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s2 * 2.2 * k, hy + 0.6 * k, 1.2 * k, 0.2, Math.PI - 0.2); ctx.stroke(); }   /* olhos fechados, relaxando */
  ctx.restore();
}
