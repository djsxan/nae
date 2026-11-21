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
  return Math.hypot(me.x - O2.x, me.y - O2.y) < 2.3 ? O2 : null;
}
function bathEnter() {   /* menu: sentar num canto, sentar na beira (no ponto mais perto) ou boiar no meio (sozinho) */
  const O2 = ofuroNear(), me = G.me; if (!O2) return; let d = document.getElementById('bathmenu'); if (d) d.remove();
  const alone = !Object.values(G.players).some(q => q !== me && q.bathing && q.fb === me.fb && q.bathing.mode !== 'edge');
  d = document.createElement('div'); d.id = 'bathmenu'; d.className = 'gpanel lift-panel';
  const opt = (m, ic, t, sub, off) => '<button class="lift-btn' + (off ? ' here' : '') + '" data-m="' + m + '"' + (off ? ' disabled' : '') + '><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  d.innerHTML = '<div class="gp-head"><span>Ofurô</span><button class="gp-x" data-x>✕</button></div><div class="lift-list" style="padding-top:10px">' + opt('seat', '♨', 'Sentar num canto', 'Recostado na água quente, com os jatos.') + opt('edge', '⌒', 'Sentar na beira', 'Na beira mais perto de você, com as pernas na água.') + opt('float', '〰', 'Boiar no meio', alone ? 'De barriga para cima, sozinho na banheira.' : 'Só quando estiver sozinho na banheira.', !alone) + '</div>';
  document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove();
  d.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { d.remove(); G.path = null; G.pathGoal = null; me.walking = false; Net.send({ t: 'bath', on: 1, mode: b.dataset.m }); });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const d = document.getElementById('bathmenu'); if (d) d.remove(); } });
if (typeof progEvent === 'function') { const _peB = progEvent; progEvent = function (m, now) {
  if (m.t === 'bath') { const e = G.players[m.id]; if (e) { e.bathing = m.on ? { t0: now, x: m.x, y: m.y, rx: m.rx, ry: m.ry, mode: m.mode || 'seat' } : null; if (!m.on) e.smokeT = 0; if (m.on && m.dir != null) { e.dir = m.dir; if (e === G.me) G.bathMouse0 = G.mouseS ? G.mouseS.slice() : [0, 0]; } if (!m.on && e === G.me && G.me.sit && G.me.sit.bath) G.me.sit = null; } return true; }
  return _peB(m, now);
}; }
// ---------- o herói no ofurô: o próprio modelo 3D, sem camisa e de sunga, sentado na água ----------
const BATH_POSES = {   // tl = tronco (negativo: para trás), ht = cabeça (negativo: olha para cima), aA/aB = braços [frente, abertura, cotovelo], lA/lB = pernas [quadril, joelho], wl = linha d'água (em arte, acima do pé)
  A: { n: 'Recostado, braços na borda', tl: -0.35, ht: -0.28, aA: [0.3, 1.12, 0.75], aB: [0.3, 1.12, 0.75], lA: [1.75, -1.25], lB: [1.6, -1.1], lift: 7 },
  B: { n: 'Sentado reto, mãos na água', tl: -0.05, ht: 0.05, aA: [0.35, 0.3, 0.95], aB: [0.35, 0.3, 0.95], lA: [1.9, -1.7], lB: [1.85, -1.65], lift: 5 },
  C: { n: 'Afundado até os ombros', tl: -0.2, ht: -0.12, aA: [0.8, 0.25, 1.7], aB: [0.8, 0.25, 1.7], lA: [2.2, -2.1], lB: [2.15, -2.05], lift: -2 },
  D: { n: 'Debruçado na borda', tl: 0.3, ht: 0.15, aA: [1.45, 0.35, 1.95], aB: [1.45, 0.35, 1.95], lA: [2.3, -2.2], lB: [2.25, -2.15], lift: 9 },
  I: { n: 'Enche o peito de ar', tl: -0.45, ht: -0.5, aA: [0.35, 0.9, 0.6], aB: [0.35, 0.9, 0.6], lA: [1.9, -1.6], lB: [1.85, -1.55], lift: 9 },
  W: { n: 'Passa as mãos no rosto', tl: -0.05, ht: -0.2, aA: [2.15, 0.22, 2.4], aB: [2.15, 0.22, 2.4], lA: [2.0, -1.8], lB: [1.95, -1.75], lift: 6 },
};
const BATH_TRUNKS = { knight: '#2a3a6a', archer: '#2e5a34', mage: '#7a2626' };
// sprite do banhista: mistura de duas poses (t de 0 a 4) e olhos abertos/fechados
const smokeArm = f => f >= 2 && f < 4 ? [1.6, 0.2, 2.45] : [0.75, 0.35, 1.3];   /* cachimbo: a mão vai à boca e volta */
function smokePhase(e, now) { if (!e.smokeT) return -1; const t = performance.now() - e.smokeT; if (t > 480000) { e.smokeT = 0; return -1; } const c = t % 18000; return c < 3000 ? Math.floor(c / 3000 * 8) : 0; }   /* 8 minutos; um trago a cada 18 s */
// gestos na banheira: saudar, ânimo e surpresa (emotes) e o saquê (pegar o copo da beirada, beber, devolver)
const BATH_GEST_MS = { salute: 2600, cheer: 2400, surprise: 1700 };
function bathGest(e, now) {
  const E = e.emote; if (E && BATH_GEST_MS[E.k] && now - E.t0 < BATH_GEST_MS[E.k]) { const t = (now - E.t0) / BATH_GEST_MS[E.k]; return { k: E.k, f: Math.min(7, Math.floor(t * 8)), t }; }
  const D = e.bdrink; if (D && D.sipT && now - D.sipT < 6000) { const t = (now - D.sipT) / 6000; return { k: 'sip', f: Math.min(11, Math.floor(t * 12)), t }; }
  return null;
}
function gestArm(g) {   /* braço (aA) e cabeça de cada quadro do gesto */
  const f = g.f;
  if (g.k === 'salute') return f < 1 || f > 6 ? { aA: [1.2, 0.5, 1.4] } : { aA: [2.35, 0.32, 2.35], ht: f === 3 || f === 4 ? 0.12 : 0 };
  if (g.k === 'cheer') return f < 1 || f > 6 ? { aA: [1.6, 0.5, 0.8], aB: [1.6, 0.5, 0.8] } : { aA: [2.95, 0.45 + (f % 2) * 0.1, 0.25], aB: [2.95, 0.45 + ((f + 1) % 2) * 0.1, 0.25], ht: -0.2, tl: -0.15 };
  if (g.k === 'surprise') return { aA: [0.9, 1.15, 0.35], aB: [0.9, 1.15, 0.35], ht: -0.22, tl: 0.05 };
  if (g.k === 'sip') { if (f < 1) return {}; if (f < 2) return { aB: [0.7, 1.2, 0.5] }; if (f < 3) return { aB: [1.15, 0.7, 1.4], cup: 1 }; if (f < 8) return { aB: [1.6, 0.22, 2.42], cup: 1, ht: f >= 4 && f <= 6 ? -0.28 : -0.12 }; if (f < 10) return { aB: [0.9, 1.1, 0.9], cup: 1 }; if (f < 11) return { aB: [0.7, 1.2, 0.5] }; return {}; }   /* a mão do lado do copinho */
  return {};
}
function batherSprite3D(e, pa, pb, t, closed, smk = -1, mode = 'seat', gest = null) {
  const lk = e.cls + ':' + e.skin + ':' + e.color, A = BATH_POSES[pa] || BATH_POSES.A, Bp = BATH_POSES[pb] || A, dir = (e.bdrink && mode === 'seat' ? sakeDir(e) : e.dir) | 0, k = t / 4, mix = (x, y) => x + (y - x) * k, mixA = (x, y) => x.map((v, i) => mix(v, y[i]));
  return cache3('bath|' + lk + '|' + mode + pa + pb + t + (closed ? 'c' : 'o') + smk + (gest ? gest.k + gest.f : '') + '|' + dir, () => {
    const L = lookFor('bath:' + lk, () => { const L0 = heroLook(e.cls, e.skin, e.color); return Object.assign(L0, { hair: L0.hair || '#4a3424', armor: 'bare', body: L0.skin, body2: L0.skin, legs: L0.skin, boots: L0.skin, head: 'none', cape: false, weapon: null, shield: null, pauldron: null, quiver: false, extra: null, pattern: null, trunks: BATH_TRUNKS[e.cls] || '#2a3a5a' }); });
    let R = _rigs.get('bath:' + lk); if (!R) { R = buildHumanoid(L); _rigs.set('bath:' + lk, R); }
    const PP = { dir, walk: -1, sit: mode === 'edge' ? 'c' : 'g' }, Q = buildPose(e.cls, PP);
    if (mode === 'float') Object.assign(Q, { tl: 0, ht: -0.25, hw: 0, tw: 0, aA: [0.25, 1.25, 0.35], aB: [0.25, 1.25, 0.35], lA: [0.08, -0.1], lB: [-0.04, -0.05], sway: 0, yaw: 0 });   /* boiando: braços abertos, pernas soltas */
    else if (mode === 'edge') Object.assign(Q, { tl: -0.12, ht: 0.12, hw: 0, tw: 0, aA: [-0.25, 0.35, 0.2], aB: [-0.25, 0.35, 0.2], lA: [1.45, -1.25], lB: [1.35, -1.05], sway: 0, yaw: 0 });   /* sentado na beira: mãos apoiadas atrás, pernas para dentro da água */
    else Object.assign(Q, { tl: mix(A.tl, Bp.tl), ht: mix(A.ht, Bp.ht), hw: 0, tw: 0, aA: mixA(A.aA, Bp.aA), aB: mixA(A.aB, Bp.aB), lA: mixA(A.lA, Bp.lA), lB: mixA(A.lB, Bp.lB), sway: 0, yaw: 0 });
    if (smk >= 0 && !gest) { Q.aA = smokeArm(smk); Q.pipe = 1; if (smk >= 2 && smk < 4) Q.ht = -0.12; }
    if (gest) { const G2 = gestArm(gest); if (G2.aA) Q.aA = G2.aA; if (G2.aB) Q.aB = G2.aB; if (G2.ht != null) Q.ht = G2.ht; if (G2.tl != null) Q.tl = G2.tl; if (G2.cup) Q.ochoko = 1; }
    applyPose(R, Q, PP, 0); setEyesClosed(R, closed);
    const sp = mode === 'float' ? shoot3D(R, dir, -Math.PI / 2) : shoot3D(R, dir, 0, mode !== 'edge'); setEyesClosed(R, false); return sp;
  }, 'bath|' + e.id);
}
// o que o banhista está fazendo agora: a pose A é a padrão; de vez em quando passa por B, C ou D (com transição) e fecha os olhos
function bathState(e, now) {
  const B = e.bathing, age = now - B.t0, h = (String(e.id).split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0) % 7000;
  const cyc = 20000, tc = (age + h) % cyc, n = Math.floor((age + h) / cyc), kind = n % 3 === 2 ? 'dive' : ['B', 'C', 'D'][(n - Math.floor(n / 3)) % 3];
  const liftOf = k => (BATH_POSES[k] || BATH_POSES.A).lift || 0, step = (x0, x1, t0, t1) => Math.min(4, Math.max(0, Math.floor((tc - t0) / (t1 - t0) * 4)));
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x), ec = (age + h * 1.7) % 11000, blink = (age % 4300) < 160;
  let pa = 'A', pb = 'A', t = 0, sink = 0, phase = '', closed = age < 4500 || (ec > 6000 && ec < 9500) || blink;
  if (age > 5000 && kind !== 'dive') {
    if (tc >= 12000 && tc < 13000) { pb = kind; t = step(0, 0, 12000, 13000); } else if (tc >= 13000 && tc < 17000) { pa = pb = kind; } else if (tc >= 17000 && tc < 18000) { pa = kind; pb = 'A'; t = step(0, 0, 17000, 18000); }
  } else if (age > 5000 && tc >= 11000 && tc < 18000) {   /* mergulho: enche o peito, afunda, solta bolhas, emerge com respingos e passa as mãos no rosto */
    const d = tc - 11000; closed = false;
    if (d < 700) { pb = 'I'; t = step(0, 0, 11000, 11700); }
    else if (d < 1300) { pa = 'I'; pb = 'C'; t = step(0, 0, 11700, 12300); sink = 6 * ease((d - 700) / 600); closed = true; }
    else if (d < 2300) { pa = pb = 'C'; sink = 6 + 26 * ease((d - 1300) / 1000); closed = true; phase = d > 1700 ? 'sub' : ''; }
    else if (d < 3900) { pa = pb = 'C'; sink = 32; closed = true; phase = 'under'; }
    else if (d < 4700) { pa = 'C'; pb = 'W'; t = step(0, 0, 14900, 15700); sink = 32 * (1 - ease((d - 3900) / 700)); closed = true; phase = d > 4300 ? 'up' : 'rise'; }
    else if (d < 6200) { pa = pb = 'W'; closed = true; phase = 'drip'; }
    else { pa = 'W'; pb = 'A'; t = step(0, 0, 17200, 18000); }
  }
  if (t === 4) { pa = pb; t = 0; }
  return { pa, pb, t, closed, sink, phase, lift: liftOf(pa) + (liftOf(pb) - liftOf(pa)) * t / 4 };
}
// desenha: a parte de baixo apagada (vista através da água), a superfície com ondinhas e o corpo acima da água
function drawBath(ctx, e, sx, sy, now) {
  if (!R3.ok) return; const mode = (e.bathing && e.bathing.mode) || 'seat', smk = smokePhase(e, now);
  drawRack(ctx, e, sx, sy);   /* a roupa no cabideiro fica atrás do corpo */
  if (mode === 'float') { drawFloat(ctx, e, sx, sy, now); return; }
  if (mode === 'edge') { drawEdge(ctx, e, sx, sy, now, smk); return; }
  const gst = bathGest(e, now), calm = smk >= 0 || gst || e.bdrink;
  const st = G.bathStudy && G.bathStudy.pose ? { pa: G.bathStudy.pose, pb: G.bathStudy.pose, t: 0, closed: !!G.bathStudy.closed, sink: G.bathStudy.sink || 0, phase: '', lift: (BATH_POSES[G.bathStudy.pose] || {}).lift || 0 } : bathState(e, now), s = batherSprite3D(e, calm ? 'A' : st.pa, calm ? 'A' : st.pb, calm ? 0 : st.t, calm ? false : st.closed, smk, 'seat', gst); if (calm) { st.sink = 0; st.phase = ''; st.lift = BATH_POSES.A.lift; }
  if (gst && gst.k === 'surprise') st.lift += Math.sin(Math.min(1, gst.t) * Math.PI) * 11;   /* surpresa: ergue até a cintura e afunda de novo */
  if (gst && (gst.k === 'cheer' || gst.k === 'surprise') && e._spl !== e.emote.t0 && G.view) { e._spl = e.emote.t0; for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28; spawnPart('sparkle', sx - G.view.ox + Math.cos(a) * 5, sy - 0.33 * HV - G.view.oy - 2, { color: 'rgba(200,240,250,A)', vx: Math.cos(a) * 0.06, vy: -0.08 - Math.random() * 0.08, life: 600 }); } }   /* espirro de água */
  const br = Math.sin(now / 1100) * 0.6, wy = sy - tubH(e.fb) * HV, x0 = sx - s.ax, y0 = sy - s.ay + 0.25 * HV - st.lift + st.sink + br;   /* a água do ofurô fica fixa; o corpo sobe conforme a pose e afunda no mergulho */
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, wy, s.w + 4, s.h); ctx.clip(); ctx.globalAlpha = st.sink > 20 ? 0.22 : 0.32; ctx.drawImage(s.c, x0, y0, s.w, s.h); ctx.restore();   /* debaixo d'água */
  ctx.lineWidth = 0.35; for (let q = 0; q < 2; q++) { const ph = (now / 1500 + q / 2) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 * (1 - ph)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sx, wy + 1, 6 + ph * 9, 2 + ph * 3, 0, 0, 7); ctx.stroke(); }   /* ondinhas em volta do corpo */
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y0 - 4, s.w + 4, wy - y0 + 4); ctx.clip(); ctx.drawImage(s.c, x0, y0, s.w, s.h); ctx.restore();   /* acima d'água */
  // mergulho: anel e respingos ao afundar e ao emergir, bolhas subindo enquanto está debaixo d'água, gotas escorrendo depois
  const ph0 = e._bathPh; e._bathPh = st.phase;
  if (G.view && st.phase !== ph0 && (st.phase === 'sub' || st.phase === 'up')) { e._splash = now; for (let k = 0; k < (st.phase === 'up' ? 14 : 8); k++) { const a = Math.random() * 6.28; spawnPart('sparkle', sx - G.view.ox + Math.cos(a) * 4, wy - G.view.oy - 2, { color: 'rgba(200,240,250,A)', vx: Math.cos(a) * 0.05, vy: -0.06 - Math.random() * 0.07, life: 500 }); } }
  if (e._splash && now - e._splash < 900) { const q = (now - e._splash) / 900; ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - q)).toFixed(2) + ')'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(sx, wy + 1, 4 + q * 16, 1.5 + q * 5, 0, 0, 7); ctx.stroke(); }
  if (st.phase === 'under') { for (let k = 0; k < 6; k++) { const q = (now / 500 + k / 6) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - q)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(sx + Math.sin(k * 2.3 + now / 300) * 2.5, wy - q * 1.5, 0.35 + q * 0.4, 0, 7); ctx.fill(); } }
  if (st.phase === 'drip' && G.view && Math.random() < 0.25) spawnPart('sparkle', sx - G.view.ox + (Math.random() - 0.5) * 5, wy - G.view.oy - 14, { color: 'rgba(200,240,250,A)', vx: 0, vy: 0.04, life: 400 });
  ctx.restore(); if (!gst) smokePuff(e, sx, y0 + 18, smk, now); if (e.bdrink) drawSakeRim(ctx, e, sx, sy, now, gst);
}
// copinho de saquê na beirada do canto livre e a garrafinha da doméstica servindo (fio de saquê, nível subindo)
const SAKE_RIM = [1.86, 1.62];   /* um pouco ao sul: bem apoiada na borda */   /* o copinho fica na beirada ao lado de quem bebe (canto livre, de frente para o quarto) */
function sakeRimPos(e) { const b = BUILDINGS[e.fb]; if (!b) return null; const [cx, cy] = localToWorld(b, SAKE_RIM[0], SAKE_RIM[1]); return [cx, cy]; }
function sakeDir(e) { const b = BUILDINGS[e.fb]; if (!b) return e.dir | 0; const [x0, y0] = localToWorld(b, 1.4, 1.4), [x1, y1] = localToWorld(b, 1.4, 2.4); return dirFromVec(x1 - x0, y1 - y0); }   /* bebendo: vira para o quarto */
function sakeTrayYaw(e) { const b = BUILDINGS[e.fb]; if (!b) return 0; const [x0, y0] = localToWorld(b, SAKE_RIM[0], SAKE_RIM[1] - 0.5), [x1, y1] = localToWorld(b, SAKE_RIM[0], SAKE_RIM[1] + 0.5), p0 = iso(x0, y0), p1 = iso(x1, y1); return Math.round(Math.atan2(2 * (p1.sy - p0.sy), p1.sx - p0.sx) * 100) / 100; }   /* a bandeja fica ao longo da borda */
function drawSakeRim(ctx, e, sx, sy, now, gst) {
  const D = e.bdrink, P2 = sakeRimPos(e); if (!P2 || !R3.ok || typeof sakeTraySprite !== 'function' || !D.tray) return;   /* a bandeja só aparece depois que a doméstica a traz */
  const p1 = iso(P2[0], P2[1]), p0 = iso(e.rx, e.ry), x = sx + p1.sx - p0.sx, y = sy + p1.sy - p0.sy - 0.32 * HV;
  const inHand = gst && gst.k === 'sip' && gst.f >= 2 && gst.f < 10, pour = D.pourT && now - D.pourT < 6000 ? (now - D.pourT) / 6000 : -1;
  let lvl = D.left > 0 ? D.left / 3 : 0; if (pour >= 0) lvl = pour < 0.32 ? 0 : Math.min(1, (pour - 0.32) / 0.48);
  const s = sakeTraySprite(sakeTrayYaw(e), { bottle: !(pour >= 0.12 && pour < 0.95), cup: !inHand, lvl: Math.round(lvl * 8) / 8 });
  ctx.save(); ctx.imageSmoothingEnabled = true; pblit(ctx, s, x, y); ctx.restore();   /* foto 3D suavizada */
  if (pour > 0.3 && pour < 0.84 && D.mid) { const M = G.npcs[D.mid]; if (M && M._spout && now - (M._spoutT || 0) < 1500) {
    const ax = M._spout[0], ay = M._spout[1], bx = x - s.ax + s.cup[0], by = y - s.ay + s.cup[1] - 0.3, fade = Math.min(1, (pour - 0.3) / 0.04, (0.84 - pour) / 0.04);
    ctx.save(); ctx.lineCap = 'round'; const dx = bx - ax, dy = by - ay, N = 16, P2 = [];   /* parábola: avança na horizontal em ritmo constante e cai acelerando (queda ~ t²) */
    for (let i = 0; i <= N; i++) { const t = i / N, wob = Math.sin(now / 55 + t * 9) * 0.1 * t * t; P2.push([ax + dx * t + wob, ay + dy * t * t]); }
    for (let i = 0; i < N; i++) { const t = (i + 0.5) / N, w = (1.05 - 0.5 * Math.sqrt(t)) * fade; ctx.strokeStyle = 'rgba(232,222,190,' + (0.62 * fade).toFixed(2) + ')'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(P2[i][0], P2[i][1]); ctx.lineTo(P2[i + 1][0], P2[i + 1][1]); ctx.stroke(); }   /* afina conforme acelera */
    ctx.strokeStyle = 'rgba(255,254,246,' + (0.8 * fade).toFixed(2) + ')'; ctx.lineWidth = 0.22; ctx.beginPath(); ctx.moveTo(P2[0][0] - 0.15, P2[0][1]); for (let i = 1; i <= N; i++) ctx.lineTo(P2[i][0] - 0.15 * (1 - i / N), P2[i][1]); ctx.stroke();   /* brilho */
    for (let k = 0; k < 3; k++) { const q2 = ((now / 300) + k / 3) % 1, a2 = k * 2.1 + Math.floor(now / 300); ctx.fillStyle = 'rgba(250,244,220,' + (0.75 * (1 - q2) * fade).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(bx + Math.cos(a2) * (0.4 + q2 * 1.1), by - Math.sin(q2 * Math.PI) * 1.2, 0.22, 0, 7); ctx.fill(); }   /* respingos na boca do copo */
    const q = (now % 420) / 420; ctx.strokeStyle = 'rgba(255,250,232,' + (0.5 * (1 - q) * fade).toFixed(2) + ')'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.ellipse(bx, by + 0.15, 0.6 + q * 1.2, (0.6 + q * 1.2) * 0.4, 0, 0, 7); ctx.stroke();   /* ondinha na superfície do copo */
    ctx.restore(); } }
}
function smokePuff(e, sx, my, smk, now) { if (smk === 4 && e._puff !== Math.floor(now / 3000) && G.view) { e._puff = Math.floor(now / 3000); for (let k = 0; k < 4; k++) spawnPart('smoke', sx - G.view.ox + 5 + k, my - G.view.oy - k * 2, { color: '#e8e4dc' }); } }
// boiando de barriga para cima: o corpo deitado na superfície, balançando e girando bem devagar, com ondinhas em volta
function drawFloat(ctx, e, sx, sy, now) {
  const age = now - e.bathing.t0, d0 = (e.dir | 0), dir = (d0 + Math.floor(age / 7000)) % 8, closed = (age % 9000) > 3000, s = batherSprite3D(Object.assign(Object.create(e), { dir }), 'A', 'A', 0, closed, -1, 'float');
  const bob = Math.sin(now / 900) * 0.8, wy = sy - tubH(e.fb) * HV, x0 = sx - s.ax, y0 = wy - s.ay + 6 + bob;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(s.c, x0, y0, s.w, s.h);
  const g = ctx.createRadialGradient(sx, wy + 4, 2, sx, wy + 4, 22); g.addColorStop(0, 'rgba(120,200,200,0)'); g.addColorStop(0.55, 'rgba(120,200,200,0.28)'); g.addColorStop(1, 'rgba(120,200,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, wy + 4, 22, 8, 0, 0, 7); ctx.fill();   /* água lambendo as bordas do corpo */
  ctx.lineWidth = 0.35; for (let q = 0; q < 3; q++) { const ph = (now / 1800 + q / 3) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sx, wy + 4, 10 + ph * 12, 3.5 + ph * 4, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
}
// sentado na beira: o corpo sobre a borda de hinoki e as canelas dentro da água
function drawEdge(ctx, e, sx, sy, now, smk) {
  const age = now - e.bathing.t0, closed = smk < 0 && ((age % 12000) > 8000 || (age % 4300) < 160), s = batherSprite3D(e, 'A', 'A', 0, closed, smk, 'edge', bathGest(e, now)), sw = Math.sin(now / 700) * 0.4;
  const lift = 0.3 * HV, wy = sy - Math.max(0.04, 0.22 - 0.28 * (1 - tubLvC(e.fb))) * HV, x0 = sx - s.ax, y0 = sy - s.ay - lift;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, wy, s.w + 4, s.h); ctx.clip(); ctx.globalAlpha = 0.4; ctx.drawImage(s.c, x0 + sw, y0, s.w, s.h); ctx.restore();   /* pernas debaixo d'água (balançando) */
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y0 - 4, s.w + 4, wy - y0 + 4); ctx.clip(); ctx.drawImage(s.c, x0, y0, s.w, s.h); ctx.restore();
  ctx.lineWidth = 0.35; for (let q = 0; q < 2; q++) { const ph = (now / 1400 + q / 2) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 * (1 - ph)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sx, wy + 2, 4 + ph * 7, 1.5 + ph * 2.5, 0, 0, 7); ctx.stroke(); }
  ctx.restore(); smokePuff(e, sx, y0 + 18, smk, now);
}
// de pé dentro da água do ofurô: só de sunga, com a água pela coxa
function drawWader(ctx, e, sx, sy, now) {
  const P0 = heroPoseFor(e, now), lk = e.cls + ':' + e.skin + ':' + e.color, P1 = { dir: P0.dir | 0, walk: P0.walk, run: false };
  const s = cache3('wade|' + lk + '|' + pose3Key(P1), () => { const L = lookFor('bath:' + lk, () => { const L0 = heroLook(e.cls, e.skin, e.color); return Object.assign(L0, { hair: L0.hair || '#4a3424', armor: 'bare', body: L0.skin, body2: L0.skin, legs: L0.skin, boots: L0.skin, head: 'none', cape: false, weapon: null, shield: null, pauldron: null, quiver: false, extra: null, pattern: null, trunks: BATH_TRUNKS[e.cls] || '#2a3a5a' }); });
    let R = _rigs.get('bath:' + lk); if (!R) { R = buildHumanoid(L); _rigs.set('bath:' + lk, R); } const Q = buildPose(e.cls, P1); applyPose(R, Q, P1, P1.walk >= 0 ? P1.walk / 12 * Math.PI * 2 : 0); return shoot3D(R, P1.dir, 0, false); }, 'wade|' + e.id);
  const th = !(e.fl || 0) && typeof thermaePoolAt === 'function' && thermaePoolAt(e.rx, e.ry), sink = th ? thSinkPx() + 6 : 0;   /* Termas: piscina afundada no chão */
  const wy = th ? sy + 2 : sy - (0.42 - 0.28 * (1 - tubLvC(e.fb != null && e.fb >= 0 ? e.fb : WORLD.bld[tileAt(e.rx, e.ry)]))) * HV, x0 = sx - s.ax, y0 = sy - s.ay + sink;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, wy, s.w + 4, s.h); ctx.clip(); ctx.globalAlpha = 0.35; ctx.drawImage(s.c, x0, y0, s.w, s.h); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y0 - 4, s.w + 4, wy - y0 + 4); ctx.clip(); ctx.drawImage(s.c, x0, y0, s.w, s.h); ctx.restore();
  ctx.lineWidth = 0.4; const ph = (now / (e.walking ? 600 : 1500)) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - ph)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sx, wy + 1, 5 + ph * 9, 1.8 + ph * 3, 0, 0, 7); ctx.stroke();
  ctx.restore();
}
function massageSprite(e, dir, prone = true) {   /* deitado na cama, de sunga (de bruços na massagem) */
  const lk = e.cls + ':' + e.skin + ':' + e.color, P1 = { dir: dir | 0, walk: -1, down: true, bed: 1, nowp: 1 };
  return cache3('mass|' + lk + '|' + (dir | 0) + (prone ? 'p' : 'b'), () => { const L = lookFor('bath:' + lk, () => { const L0 = heroLook(e.cls, e.skin, e.color); return Object.assign(L0, { hair: L0.hair || '#4a3424', armor: 'bare', body: L0.skin, body2: L0.skin, legs: L0.skin, boots: L0.skin, head: 'none', cape: false, weapon: null, shield: null, pauldron: null, quiver: false, extra: null, pattern: null, trunks: BATH_TRUNKS[e.cls] || '#2a3a5a' }); });
    let R = _rigs.get('bath:' + lk); if (!R) { R = buildHumanoid(L); _rigs.set('bath:' + lk, R); } const Q = buildPose(e.cls, P1); applyPose(R, Q, P1, 0); return shoot3D(R, P1.dir, prone ? Math.PI / 2 : -Math.PI / 2, false); }, 'mass|' + e.id);
}
function wadingNow(e) { if (R3.ok && !e.bathing && !e.downed && !(e.fl || 0) && !e.isNpc && typeof thermaePoolAt === 'function' && thermaePoolAt(e.rx, e.ry)) return true;   /* piscinas das Termas */
  if (!R3.ok || e.bathing || e.downed || !((e.fl || 0) > 0) || typeof inOfuroWater !== 'function') return false; const fb = e.fb != null && e.fb >= 0 ? e.fb : WORLD.bld[tileAt(e.rx, e.ry)]; return fb >= 0 && inOfuroWater(BUILDINGS[fb], e.fl, e.rx, e.ry); }   /* os outros jogadores não mandam o prédio: acha pela posição */
// a roupa (na cor da vocação) e a arma penduradas no cabideiro
function drawRack(ctx, e, sx, sy) {   /* a roupa (na cor da vocação) dobrada no deque, com a toalha por cima e a arma deitada ao lado */
  const B = e.bathing; if (B && B.rx != null) { const p = iso(B.rx, B.ry), p0 = iso(e.rx, e.ry), cx = sx + p.sx - p0.sx, cy = sy + p.sy - p0.sy; const col = { knight: '#6a7a8a', archer: '#4a6a3a', mage: '#7a2a2a' }[e.cls] || '#6a5a4a';
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, cy, 8, 3.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy - 1.8, 7, 3, 0, 0, 7); ctx.fill(); ctx.fillRect(cx - 7, cy - 3.6, 14, 1.8); ctx.beginPath(); ctx.ellipse(cx, cy - 3.6, 7, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(cx - 1, cy - 4, 5, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.ellipse(cx + 1, cy - 5, 4, 1.7, 0, 0, 7); ctx.fill(); ctx.fillRect(cx - 3, cy - 6, 8, 1); ctx.beginPath(); ctx.ellipse(cx + 1, cy - 6, 4, 1.7, 0, 0, 7); ctx.fill();   /* toalha dobrada */
    ctx.strokeStyle = e.cls === 'mage' ? '#6a4a2a' : '#b8bcc4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx + 9, cy - 1); ctx.lineTo(cx + 22, cy + 5); ctx.stroke(); ctx.restore(); }
}

// ---------- bonecos de treino: F perto de um makiwara ou mokujin; o boneco balança quando apanha ----------
function dummyFacing() {   /* arqueiro com o arco sacado: qualquer boneco do mesmo cômodo, desde que esteja virado para ele */
  const me = G.me; if (!me || me.cls !== 'archer' || me.shea || me.downed || me.bathing || G.training) return null; const myB = (me.fl || 0) ? me.fb : bldAt(me.x, me.y); if (myB == null || myB < 0) return null;
  const fa = me.fa != null ? me.fa : (me.dir || 0) * Math.PI / 4; let best = null, bs = 1e9;
  for (const q of DUMMIES) { if ((q.fl || 0) !== (me.fl || 0) || q.bi !== myB) continue; const dd = Math.hypot(me.x - q.x, me.y - q.y); if (dd > 9 || dd < 1.2) continue; let da = Math.abs(Math.atan2(q.y - me.y, q.x - me.x) - fa) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da; if (da > 0.7) continue; const sc = da * 4 + dd * 0.2; if (sc < bs) { bs = sc; best = q; } }
  return best;
}
function dummyNear() { const me = G.me; if (!me || me.downed || me.bathing || G.training) return null; { const f = dummyFacing(); if (f) return f; } let best = null, bd = 1.7; for (const q of DUMMIES) { if ((q.fl || 0) !== (me.fl || 0)) continue; const dd = Math.hypot(me.x - q.x, me.y - q.y); if (dd < bd) { bd = dd; best = q; } } return best; }
if (typeof progEvent === 'function') { const _peT = progEvent; progEvent = function (m, now) {
  if (m.t === 'train') { G.training = !!m.on; if (m.on && G.me && DUMMIES[m.i]) { const q = DUMMIES[m.i]; G.me.dir = m.free ? dirFromVec(q.x - G.me.x, q.y - G.me.y, G.me.dir) : dirFromVec(q.x - q.fx, q.y - q.fy, G.me.dir); } return true; }   /* treinando: de frente para o boneco, sem girar com o mouse */
  if (m.t === 'tub') { tubRecv(m); return true; }
  if (m.t === 'dummyhit') { const q = DUMMIES[m.i]; if (q) setTimeout(() => { const w = tileW(q.x, q.y, 22); for (let k = 0; k < 4; k++) spawnPart('dust', w.x + (Math.random() - 0.5) * 6, w.y + (Math.random() - 0.5) * 4); if (q.t === 'makiwara') for (let k = 0; k < 2; k++) spawnPart('sparkle', w.x, w.y, { color: 'rgba(230,200,120,A)', life: 350 }); }, m.d || 0); return true; }
  return _peT(m, now);
}; }

// ---------- hidromassagem: água agitada e espumante sobre os jatos, microbolhas subindo e estourando, vapor ----------
// ---------- água do ofurô (lado do jogador): nível que sobe e desce com a alavanca da parede ----------
G.tub = G.tub || {};
function tubRecv(m) { const prev = G.tub[m.bi]; G.tub[m.bi] = { lv: m.lv, mode: m.mode, lever: m.lever, cold: !!m.cold, t: Date.now(), wetT: prev && prev.mode === 'drain' && m.mode === '' ? Date.now() : (prev && prev.wetT) || 0, flipT: prev && prev.lever !== m.lever ? Date.now() : (prev && prev.flipT) || 0, angFrom: prev && prev.lever !== m.lever ? (prev.ang ?? [1, 0, -1][prev.lever | 0]) : (prev && prev.angFrom) }; }
function tubLvC(bi) { return tubLv(G.tub[bi], Date.now()); }
function tubH(bi) { if (G._thb) return 0.33;   /* piscinas das Termas: sempre cheias */ return 0.05 + 0.28 * tubLvC(bi); }   /* altura da superfície na tela (cheia = 0,33, a mesma dos banhistas) */
function leverNear() { const me = G.me; if (!me || me.downed || me.bathing || !me.fl) return null; const b = BUILDINGS[me.fb], O2 = typeof ofuroOf === 'function' && ofuroOf(b); if (!O2 || me.fl !== O2.fl || !O2.lever) return null; return Math.hypot(me.x - O2.lever[0], me.y - O2.lever[1]) < 0.75 ? O2 : null; }
function leverPrompt() { const L = G.tub[G.me.fb] ? G.tub[G.me.fb].lever | 0 : 0; return ['F: alavanca para o meio (a cascata enche o ofurô)', 'F: alavanca para baixo (desliga a água e mantém o ofurô cheio)', 'F: alavanca para cima (esvazia o ofurô)'][L]; }
function ofuroPrompt() { const T = G.tub[G.me.fb], lv = tubLvC(G.me.fb); if (lv >= 0.5) return lv < 1 ? 'F: tomar banho no ofurô (' + (T && T.mode === 'drain' ? 'esvaziando' : 'ainda enchendo') + ': os efeitos só com ele cheio)' : T && T.cold ? 'F: tomar banho no ofurô (a água esfriou: esvazie e encha de novo)' : 'F: tomar banho no ofurô'; return T && T.mode === 'fill' ? 'Ofurô enchendo… dá para entrar quando chegar na metade' : T && T.mode === 'drain' ? 'Ofurô esvaziando…' : 'Ofurô vazio · use a alavanca na parede, à direita'; }
// alavanca de latão numa placa de jacarandá, na parede do fundo à direita da cascata: para cima = vazio, para baixo = enchendo
function drawLever(ctx, T, pt) {
  const tgt = [1, 0, -1][T.lever | 0], a0 = T.angFrom ?? tgt, k = Math.min(1, Math.max(0, (Date.now() - (T.flipT || 0)) / 450)), e2 = k * k * (3 - 2 * k); T.ang = a0 + (tgt - a0) * e2;   /* três posições: cima, meio, baixo; vira em 0,45 s */
  const U = 2.5, V = 0.17, H0 = 0.62, poly = q => { ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) ctx.lineTo(q[k][0], q[k][1]); ctx.closePath(); };
  ctx.save(); poly([pt(U - 0.07, V, H0 - 0.25), pt(U + 0.07, V, H0 - 0.25), pt(U + 0.07, V, H0 + 0.25), pt(U - 0.07, V, H0 + 0.25)]); ctx.fillStyle = '#3a140a'; ctx.fill(); ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 0.5; ctx.stroke();
  const s0 = pt(U, V, H0 - 0.17), s1 = pt(U, V, H0 + 0.17); ctx.strokeStyle = '#120806'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();   /* fenda */
  { const [ax, ay] = pt(U, V, H0 + 0.21), [bx, by] = pt(U, V, H0 - 0.21); ctx.fillStyle = '#b8b0a0'; ctx.beginPath(); ctx.arc(ax, ay, 0.6, 0, 7); ctx.fill(); ctx.fillStyle = '#6ac8d0'; ctx.beginPath(); ctx.arc(bx, by, 0.6, 0, 7); ctx.fill(); }   /* marcas: em cima vazio, embaixo água */
  const a = T.ang * 0.95, [px, py] = pt(U, V + 0.02, H0), [ex, ey] = pt(U, V + 0.02 + 0.24 * Math.cos(a), H0 + 0.24 * Math.sin(a));
  ctx.strokeStyle = '#7a5a20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke(); ctx.strokeStyle = '#e8c870'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(px, py - 0.3); ctx.lineTo(ex, ey - 0.3); ctx.stroke();   /* haste de latão */
  ctx.fillStyle = '#5a2412'; ctx.beginPath(); ctx.ellipse(ex, ey, 1.9, 1.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,220,180,.35)'; ctx.beginPath(); ctx.arc(ex - 0.5, ey - 0.5, 0.6, 0, 7); ctx.fill();   /* punho de madeira */
  ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(px, py, 1.2, 0, 7); ctx.fill(); ctx.restore();
}
function drawOfuroFx(ctx, P, now) {
  const me = G.me; if (!me || !me.fl) return; const b = BUILDINGS[me.fb], O2 = typeof ofuroOf === 'function' && ofuroOf(b); if (!O2 || me.fl !== O2.fl) return;
  const T = G.tub[me.fb] || (G.tub[me.fb] = { lv: 0, mode: '', lever: 0, t: 0 }), lv = tubLv(T, Date.now()), base = me.fl * (bldDims(b).H / floorsOf(b)) * HV, hW = 0.05 + 0.28 * lv;
  const pt = (u, v, h) => { const [x, y] = localToWorld(b, u, v), q = P(x, y, 0); return [q[0], q[1] - base - h * HV]; }, at = (u, v) => pt(u, v, hW);
  const hsh = (k, s) => { const x = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const A = 0.275, Z = 1.725, RIM = 0.39, poly = q => { ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) ctx.lineTo(q[k][0], q[k][1]); ctx.closePath(); }, quad = h => [pt(A, A, h), pt(Z, A, h), pt(Z, Z, h), pt(A, Z, h)];
  drawLever(ctx, T, pt);
  ctx.save(); poly(quad(RIM)); ctx.clip();   /* tudo de dentro da banheira só aparece pela abertura de cima */
  const wetA = T.mode === 'drain' ? 1 : T.wetT && !(T.lever | 0) ? Math.max(0, 1 - (Date.now() - T.wetT) / 120000) : 0;
  if (wetA > 0) { const h0 = Math.max(0.05, hW);   /* madeira molhada onde a água estava, secando aos poucos */
    ctx.fillStyle = 'rgba(48,24,8,' + (0.42 * wetA).toFixed(3) + ')'; poly([pt(A, A, h0), pt(Z, A, h0), pt(Z, A, 0.33), pt(A, A, 0.33)]); ctx.fill(); poly([pt(Z, A, h0), pt(Z, Z, h0), pt(Z, Z, 0.33), pt(Z, A, 0.33)]); ctx.fill();
    ctx.strokeStyle = 'rgba(36,18,6,' + (0.8 * wetA).toFixed(3) + ')'; ctx.lineWidth = 1.1; ctx.beginPath(); const l0 = pt(A, A, 0.33), l1 = pt(Z, A, 0.33), l2 = pt(Z, Z, 0.33); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]); ctx.lineTo(l2[0], l2[1]); ctx.stroke();   /* a linha d'água */
    if (lv < 0.01) { ctx.fillStyle = 'rgba(30,16,6,' + (0.38 * wetA).toFixed(3) + ')'; poly(quad(0.05)); ctx.fill();
      for (let k = 0; k < 9; k++) { const u = 0.4 + hsh(k, 31) * 1.2, v = 0.4 + hsh(k, 32) * 1.2, [gx, gy] = pt(u, v, 0.05), ln = 2 + hsh(k, 33) * 4; ctx.strokeStyle = 'rgba(255,245,230,' + (0.35 * wetA).toFixed(3) + ')'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + ln, gy - ln * 0.5); ctx.stroke(); }   /* brilho de madeira molhada */
      for (let k = 0; k < 5; k++) { const u = 0.5 + hsh(k, 41) * 1.0, v = 0.5 + hsh(k, 42) * 1.0, [gx, gy] = pt(u, v, 0.05); ctx.fillStyle = 'rgba(150,200,205,' + (0.35 * wetA).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(gx, gy, 2 + hsh(k, 43) * 3, 1 + hsh(k, 44) * 1.2, 0, 0, 7); ctx.fill(); } } }   /* pocinhas que sobraram */
  if (lv > 0.004) {   /* a superfície da água no nível atual */
    const c0 = pt(A, A, hW), c1 = pt(Z, Z, hW), gr = ctx.createLinearGradient(c0[0], c0[1], c1[0], c1[1]);
    if (T.cold) { gr.addColorStop(0, 'rgba(120,170,175,0.8)'); gr.addColorStop(1, 'rgba(95,145,155,0.84)'); } else { gr.addColorStop(0, 'rgba(125,205,208,0.78)'); gr.addColorStop(1, 'rgba(88,172,182,0.84)'); }
    ctx.fillStyle = gr; poly(quad(hW)); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.5; { const l0 = pt(A, A, hW), l1 = pt(Z, A, hW), l2 = pt(Z, Z, hW); ctx.beginPath(); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]); ctx.lineTo(l2[0], l2[1]); ctx.stroke(); }   /* menisco nas paredes do fundo */
    for (let k = 0; k < 4; k++) { const q = (Date.now() / 5200 + k / 4) % 1, v = A + 0.1 + q * (Z - A - 0.2), p0 = pt(A + 0.12 + hsh(k, 3) * 0.2, v, hW), p1 = pt(Z - 0.12 - hsh(k, 4) * 0.2, v, hW); ctx.strokeStyle = 'rgba(255,255,255,' + (0.16 * Math.sin(q * Math.PI)).toFixed(3) + ')'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }   /* brilho correndo na superfície */
    if (T.mode === 'drain') { const [cx, cy] = pt(1.3, 1.3, hW), R = 2 + 7 * Math.min(1, lv * 1.6), rot = Date.now() / 260;   /* redemoinho sobre o ralo */
      ctx.fillStyle = 'rgba(40,90,100,0.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.35, R * 0.16, 0, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.4; ctx.beginPath(); for (let s = 0; s <= 24; s++) { const t = s / 24, a = rot + k * 2.09 + t * 4.2, r = R * (1 - t * 0.85); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.45; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      for (let k = 0; k < 8; k++) { const q = (Date.now() / 900 + k / 8) % 1, a = rot * 1.5 + k * 0.8 + q * 3, r = R * (1 - q); ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - q)).toFixed(2) + ')'; ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.45, 0.45, 0.45); } } }
  ctx.restore();
  if (T.lever === 1) drawCascade(ctx, b, me.fl, P, now, base + 0.33 * HV, hW - 0.33);   /* as bicas correm com a alavanca para baixo */
  const hot = lv > 0.05 && !T.cold, filling = T.lever === 1 && lv < 1;
  if (hot && G.view && Math.random() < 0.025 + 0.06 * lv + (filling ? 0.05 : 0)) { const [vx, vy] = at(0.3 + Math.random() * 1.4, 0.3 + Math.random() * 1.4); spawnPart('smoke', vx - G.view.ox, vy - G.view.oy - 2, { color: '#ffffff' }); }   /* vapor */
  const busy = lv >= 0.5 && Object.values(G.players).some(q => q.bathing && q.fb === me.fb && q.fl === O2.fl); if (busy && !G.ofuroOn) G.ofuroOn = now; if (!busy) G.ofuroOn = 0;   /* os jatos ligam quando alguém entra e ficam ligados enquanto houver gente */
  if (!busy) return;
  const on = Math.min(1, (now - G.ofuroOn) / 1500);
  ctx.save(); ctx.globalAlpha = on;
  const jets = [[0.35, 0.75], [0.35, 1.25], [1.65, 0.75], [1.65, 1.25], [1.0, 1.65]];   /* bicos nas paredes (a do fundo tem a cascata) */
  jets.forEach(([u, v], j) => { const [jx, jy] = at(u, v), pulse = 0.65 + 0.35 * Math.sin(now / 260 + j * 1.9);
    for (let k = 0; k < 5; k++) { const a = now / 700 + k * 1.26 + j, rx = 2.2 + hsh(k, j) * 1.6;   /* água revolta: manchas claras que giram em cima do jato */
      ctx.fillStyle = 'rgba(240,252,252,' + (0.3 * pulse).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(jx + Math.cos(a) * 1.4, jy + Math.sin(a) * 0.6, rx, rx * 0.45, 0, 0, 7); ctx.fill(); }
    for (let k = 0; k < 20; k++) { const ph = (now / 380 + hsh(k, j)) % 1, ang = hsh(k + 5, j) * 6.28, rr = ph * (2.5 + hsh(k + 2, j) * 2.5);   /* microbolhas espalhando a partir do jato */
      ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - ph)).toFixed(2) + ')'; ctx.fillRect(jx + Math.cos(ang) * rr, jy + Math.sin(ang) * rr * 0.45 - ph * 0.6, 0.55, 0.55); } });
  for (let k = 0; k < 26; k++) { const ph = (now / 900 + hsh(k, 21)) % 1, u = 0.32 + hsh(k, 22) * 1.36, v = 0.32 + hsh(k, 23) * 1.36, [bx, by] = at(u, v);   /* bolhinhas pela água toda, estourando */
    if (ph < 0.85) { ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.5 * ph).toFixed(2) + ')'; ctx.fillRect(bx, by - ph * 0.5, 0.45, 0.45); }
    else { const q = (ph - 0.85) / 0.15; ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - q)).toFixed(2) + ')'; ctx.lineWidth = 0.18; ctx.beginPath(); ctx.ellipse(bx, by, 0.4 + q * 1.4, 0.2 + q * 0.6, 0, 0, 7); ctx.stroke(); } }
  ctx.restore();
}


// ============================================================
//  DUELOS NO TATAME e AULAS DO SENSEI (lado do jogador)
// ============================================================
const dojoBiC = () => BUILDINGS.findIndex(b => b.kind === 'dojo');
const inDojoC = e => e && !(e.fl) && bldAt(e.rx != null ? e.rx : e.x, e.ry != null ? e.ry : e.y) === dojoBiC();
const myMove = k => !!(G.me && G.me.feats && G.me.feats.mv && G.me.feats.mv[k]);
function duelPlayerNear() { const me = G.me; if (!me || G.duel || !inDojoC(me) || me.downed) return null; let best = null, bd = 1.7; for (const id in G.players) { const q = G.players[id]; if (q === me || q.downed || !inDojoC(q)) continue; const d = Math.hypot(q.rx - me.x, q.ry - me.y); if (d < bd) { bd = d; best = q; } } return best; }
// F: no duelo = arremesso; segurando alguém = arremesso; perto de outro jogador no dojô = desafiar
function dojoF() {
  const me = G.me; if (!me) return false;
  if (myMove('throw') && ((G.duel && G.duel.st === 'fight') || me.dragMode === 'grip')) { Net.send({ t: 'hipthrow' }); return true; }
  const q = duelPlayerNear(); if (q) { duelBetMenu(q.name, bet => Net.send({ t: 'duel', a: 'invite', id: q.id, bet })); return true; }
  return false;
}
function dojoPrompt() { const me = G.me; if (!me) return ''; if (G.duel && G.duel.st === 'fight') return myMove('throw') ? 'Duelo! Mãos nuas · F colado no oponente: arremesso' : 'Duelo! Mãos nuas · perde quem cair de joelhos ou sair do tatame'; const q = duelPlayerNear(); return q ? 'F: desafiar ' + q.name + ' para um duelo' : ''; }
function duelBetMenu(name, cb) {
  let d = document.getElementById('duelmenu'); if (d) d.remove(); d = document.createElement('div'); d.id = 'duelmenu'; d.className = 'gpanel lift-panel';
  d.innerHTML = '<div class="gp-head"><span>Duelo no tatame</span><button class="gp-x" data-x>✕</button></div><div class="lift-note">Desafiar ' + name + '. Mãos nuas; perde quem cair de joelhos ou sair do tatame. Ninguém se machuca de verdade. Quanto apostar?</div><div class="lift-list">' + [10, 25, 50, 100, 200].map(v => '<button class="lift-btn" data-v="' + v + '"><span class="lift-n">' + v + '</span><span>' + v + ' de ouro (o vencedor leva ' + Math.floor(v * 2 * 0.95) + ')</span></button>').join('') + '</div>';
  document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove(); d.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { d.remove(); cb(+b.dataset.v); });
}
function duelHud(m) {
  let h = document.getElementById('duelhud'); if (m.st === 'end') { if (h) h.remove(); G.duel = null; const bp = document.getElementById('duelbet'); if (bp) bp.remove(); return; }
  const mine = G.me && (m.ai === G.myId || m.bi === G.myId); if (mine && !G.duel && G.dialog && typeof closeDialog === 'function') closeDialog(); G.duel = mine ? m : null;
  if (!h) { h = document.createElement('div'); h.id = 'duelhud'; document.body.appendChild(h); }
  const bar = (v, c) => '<div class="du-bar"><i style="width:' + v + '%;background:' + c + '"></i></div>';
  h.innerHTML = '<div class="du-t">' + (m.st === 'bow' ? 'Apostas abertas · ' + m.left + ' s' : 'Duelo · ' + m.left + ' s') + '</div><div class="du-row"><b>' + m.a + '</b>' + bar(m.ha, '#d8a040') + '<span class="du-vs">×</span>' + bar(m.hb, '#5a9ad8') + '<b>' + m.b + '</b></div><div class="du-s">Aposta ' + m.bet + ' cada · plateia: ' + m.sa + ' em ' + m.a + ', ' + m.sb + ' em ' + m.b + '</div>';
  if (m.st === 'bow' && !mine && !document.getElementById('duelbet') && G.duelBetDone !== m.id) { const d = document.createElement('div'); d.id = 'duelbet'; d.className = 'gpanel lift-panel'; d.style.top = '62%';
    d.innerHTML = '<div class="gp-head"><span>Apostar no duelo</span><button class="gp-x" data-x>✕</button></div><div class="lift-list">' + ['a', 'b'].map(sd => [10, 25, 50].map(v => '<button class="lift-btn" data-s="' + sd + '" data-v="' + v + '"><span class="lift-n">' + v + '</span><span>' + v + ' em ' + m[sd] + '</span></button>').join('')).join('') + '</div>';
    document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => { d.remove(); G.duelBetDone = m.id; }; d.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { Net.send({ t: 'duel', a: 'bet', id: m.id, side: b.dataset.s, v: +b.dataset.v }); d.remove(); G.duelBetDone = m.id; }); }
  if (m.st === 'fight') { const bp = document.getElementById('duelbet'); if (bp) bp.remove(); }
}
if (typeof progEvent === 'function') { const _peD = progEvent; progEvent = function (m, now) {
  if (m.t === 'duelinv') { gameAsk(m.name + ' desafia você para um duelo no tatame (aposta ' + m.bet + ' de ouro cada). Aceita?', { yes: 'Aceitar' }).then(ok => Net.send({ t: 'duel', a: ok ? 'accept' : 'decline' })); return true; }
  if (m.t === 'duelst') { duelHud(m); return true; }
  return _peD(m, now);
}; }
// praticantes do dojô: dá para conversar e desafiar
if (typeof NPC_DIALOG !== 'undefined') { const opts = [['Desafiar para um duelo (aposta 10)', { duel: 10 }], ['Desafiar para um duelo (aposta 25)', { duel: 25 }], ['Desafiar para um duelo (aposta 50)', { duel: 50 }]];
  NPC_DIALOG.v_gymm = { greet: 'Treino aqui todo dia antes do trabalho. Quer testar?', opts }; NPC_DIALOG.v_gymf = { greet: 'O Mestre diz que o golpe nasce no pé. Quer ver?', opts }; NPC_DIALOG.v_offguard = { greet: 'Folga de serviço, mas os punhos não descansam. Encara?', opts };
  if (NPC_DIALOG.st_dojo) { NPC_DIALOG.st_dojo.opts[1] = ['Aulas de golpes', { local: 'Escolha o golpe.' }]; NPC_DIALOG.st_dojo.opts.splice(2, 0, ['Alugar um apartamento do prédio', { open: 'estate' }]); } }
// aulas do sensei: painel com os quatro golpes
if (typeof buildDialogOptions === 'function') { const _bdo = buildDialogOptions; buildDialogOptions = function (id) { const r = _bdo.apply(this, arguments);
  if (id === 'st_dojo') for (const b of document.querySelectorAll('#dlg-opts button')) if (b.textContent.includes('Aulas de golpes')) b.onclick = () => dojoLessons();
  return r; }; }
function dojoLessons() {
  let d = document.getElementById('lessons'); if (d) d.remove(); d = document.createElement('div'); d.id = 'lessons'; d.className = 'gpanel lift-panel'; const fl = typeof useLvl === 'function' ? useLvl(G.me, 'fist') : 0;
  d.innerHTML = '<div class="gp-head"><span>Aulas do Mestre Tetsuo</span><button class="gp-x" data-x>✕</button></div><div class="lift-note">Golpes de mão nua (com a arma guardada). Seus Punhos: ' + fl + '.</div><div class="lift-list">' + Object.entries(SENSEI_MOVES).map(([k, M]) => { const got = myMove(k), ok = fl >= M.req;
    return '<button class="lift-btn' + (got ? ' here' : '') + '" data-k="' + k + '"' + (got ? ' disabled' : '') + '><span class="lift-n">' + (got ? '✓' : M.p) + '</span><span><b>' + M.n + '</b>' + (got ? ' <small>(aprendido)</small>' : ' · ' + M.p + ' de ouro' + (M.req ? ' · Punhos ' + M.req : '') + (ok ? '' : ' <small style="color:#ff9a8a">(treine mais)</small>')) + '<br><small>' + M.d + '</small></span></button>'; }).join('') + '</div>';
  document.body.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove(); d.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { Net.send({ t: 'npc', n: 'st_dojo', a: 'learn', k: b.dataset.k }); d.remove(); });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') for (const id of ['duelmenu', 'duelbet', 'lessons']) { const d = document.getElementById(id); if (d) d.remove(); } });

// cascata decorativa: lâmina d'água saindo da bica de bronze dourado na parede oeste e caindo na banheira (animação constante)
function drawCascade(ctx, b, fl, P, now, raise, hitH = -0.02) {   /* cortina d'água: fios saindo das cinco bicas de bambu na altura da cortina, caindo na banheira com espuma, anéis e respingos */
  const at = (u, v, h) => { const [x, y] = localToWorld(b, u, v), q = P(x, y, 0); return [q[0], q[1] - raise - (h || 0) * HV]; };
  const N = 5, tips = [], hits = [];
  for (let k = 0; k < N; k++) { const u = 0.56 + k * 0.22; tips.push(at(u, 0.44, 0.89)); hits.push(at(u, 0.6, hitH)); }
  ctx.save();
  { const g = ctx.createLinearGradient(0, tips[0][1], 0, hits[0][1]); g.addColorStop(0, 'rgba(200,235,250,0.18)'); g.addColorStop(1, 'rgba(230,250,255,0.32)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tips[0][0], tips[0][1]); for (const p of tips) ctx.lineTo(p[0], p[1]); for (let k = N - 1; k >= 0; k--) ctx.lineTo(hits[k][0], hits[k][1]); ctx.closePath(); ctx.fill(); }   /* véu translúcido entre os fios */
  for (let k = 0; k < N; k++) { const [x0, y0] = tips[k], [x1, y1] = hits[k];
    for (let s = 0; s < 3; s++) { const off = (s - 1) * 0.3, sh = 0.55 + 0.3 * Math.sin(now / 80 + k * 1.7 + s); ctx.strokeStyle = 'rgba(230,248,255,' + sh.toFixed(2) + ')'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(x0 + off, y0); ctx.quadraticCurveTo(x0 + off + (x1 - x0) * 0.4, y0 + (y1 - y0) * 0.12, x1 + off * 1.5, y1); ctx.stroke(); }
    for (let s = 0; s < 3; s++) { const q = (now / 330 + s / 3 + k * 0.17) % 1, x2 = x0 + (x1 - x0) * (0.4 * q + 0.6 * q * q), y2 = y0 + (y1 - y0) * q * q; ctx.fillStyle = 'rgba(255,255,255,' + (0.9 - q * 0.3).toFixed(2) + ')'; ctx.fillRect(x2 - 0.25, y2, 0.5, 1.2); } }   /* gotas descendo */
  const [fx0, fy0] = hits[0], [fx1, fy1] = hits[N - 1], cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
  { const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 16); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 16, 5, Math.atan2(fy1 - fy0, fx1 - fx0), 0, 7); ctx.fill(); }   /* espuma onde a cortina bate */
  for (let k = 0; k < N; k++) for (let s = 0; s < 2; s++) { const q = (now / 600 + s / 2 + k * 0.23) % 1, [hx, hy] = hits[k]; ctx.strokeStyle = 'rgba(255,255,255,' + (0.65 * (1 - q)).toFixed(2) + ')'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.ellipse(hx, hy + q * 2, 1.2 + q * 5, 0.5 + q * 2, 0, 0, 7); ctx.stroke(); }   /* anéis se abrindo e correndo para a frente */
  for (let k = 0; k < 10; k++) { const q = (now / 900 + k / 10) % 1, [hx, hy] = hits[k % N]; ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - q)).toFixed(2) + ')'; ctx.fillRect(hx + Math.sin(k * 2.1) * 3 * q, hy + q * 5, 0.45, 0.45); }   /* bolhas espalhando */
  ctx.restore();
  if (G.view && Math.random() < 0.55) { const [hx, hy] = hits[Math.floor(Math.random() * N)]; spawnPart('sparkle', hx - G.view.ox + (Math.random() - 0.5) * 2, hy - G.view.oy - 1, { color: 'rgba(225,248,255,A)', vx: (Math.random() - 0.5) * 0.05, vy: -0.03 - Math.random() * 0.04, life: 400 }); }   /* respingos */
  if (G.view && Math.random() < 0.035) spawnPart('smoke', cx - G.view.ox, cy - G.view.oy - 4, { color: '#ffffff' });   /* névoa da queda */
}

// ---------- portas de correr dos apartamentos: abrem deslizando quando alguém chega perto e fecham sozinhas ----------
const APT_DOOR_K = {};
function drawAptDoors(ctx, P, now) {
  const me = G.me; if (!me || !me.fl) return; const b = BUILDINGS[me.fb]; if (!b || b.deco !== 'machiya') return;
  const nF = floorsOf(b), fl = me.fl, D = bDims(b)[1], raise = fl * (bldDims(b).H / nF) * HV;
  const doors = fl < nF - 1 ? [[1, 2, 'f'], [4, 5, 'f']] : [[2, 4, 'f'], [2, 3, 's']];   /* fachada: [u0, u1]; 's' = porta lateral da suíte para o hall (u = 6, v 3..4) */
  const at = (u, v, h) => { const [x, y] = localToWorld(b, u, v), q = P(x, y); return [q[0], q[1] - raise - h * HV]; };
  const people = Object.values(G.players).filter(q => (q.fl || 0) === fl && q.fb === me.fb);
  if (fl === nF - 1) { const night = G.devTime === 'night' || (typeof dayInfo === 'function' && dayInfo().night); const glow = [[1.0, 1.2, 0, 1.7, 120], [4.5, 2.6, 0, 1.5, 110], [4.9, 0.6, 0, 0.6, 90], [3.2, 1.6, 0, 1.0, 70], [1.0, 0.9, 0, 0.6, 80], [5.4, 4.2, 0, 0.5, 70]];   /* luz quente e aconchegante: lanternas, andons, kamado e banheira */
    for (const [u, v, , h, r] of glow) { const [x, y] = at(u, v, h); G.lights.push({ x, y, r: night ? r * 0.9 : r * 0.5, c: '255,160,70', a: night ? 0.45 : 0.15, flick: 1 }); } }
  doors.forEach(([a, c, kind], i) => {
    const key = me.fb + ':' + fl + ':' + i, mid = kind === 'f' ? localToWorld(b, (a + c) / 2, D) : localToWorld(b, 6, (a + c) / 2);
    const open = people.some(q => Math.hypot(q.rx - mid[0], q.ry - mid[1]) < 1.15), k0 = APT_DOOR_K[key] ?? 0, k = APT_DOOR_K[key] = k0 + ((open ? 1 : 0) - k0) * 0.12;   /* desliza suave */
    const len = c - a, panels = len > 1.5 ? 2 : 1, pw = len / panels;
    for (let pnl = 0; pnl < panels; pnl++) {
      const dir = panels === 2 ? (pnl === 0 ? -1 : 1) : 1, s0 = a + pnl * pw + dir * k * pw * 0.95, s1 = s0 + pw;   /* cada folha corre para o lado, por cima da parede */
      const quad = kind === 'f' ? [at(s0, D - 0.05, 0.03), at(s1, D - 0.05, 0.03), at(s1, D - 0.05, 0.34), at(s0, D - 0.05, 0.34)] : [at(6.02, s0, 0.03), at(6.02, s1, 0.03), at(6.02, s1, 1.95), at(6.02, s0, 1.95)];
      ctx.save(); ctx.beginPath(); quad.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = 'rgba(246,238,220,0.93)'; ctx.fill();
      ctx.strokeStyle = '#4a2c18'; ctx.lineWidth = 0.7; ctx.stroke(); ctx.lineWidth = 0.35;
      const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      for (let r = 1; r < (kind === 'f' ? 2 : 5); r++) { const L1 = lerp(quad[0], quad[3], r / 5), L2 = lerp(quad[1], quad[2], r / 5); ctx.beginPath(); ctx.moveTo(L1[0], L1[1]); ctx.lineTo(L2[0], L2[1]); ctx.stroke(); }
      for (let r = 1; r < 3; r++) { const T1 = lerp(quad[0], quad[1], r / 3), T2 = lerp(quad[3], quad[2], r / 3); ctx.beginPath(); ctx.moveTo(T1[0], T1[1]); ctx.lineTo(T2[0], T2[1]); ctx.stroke(); }
      { const hp = lerp(lerp(quad[0], quad[3], 0.5), lerp(quad[1], quad[2], 0.5), dir > 0 ? 0.12 : 0.88); ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(hp[0], hp[1], 0.7, 0, 7); ctx.fill(); }   /* puxador de latão */
      ctx.restore(); }
  });
}
