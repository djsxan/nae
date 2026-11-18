// ============================================================
//  RENDER — mundo pintado em resolução de tela.
//  Sombras projetadas pelo sol, clima e atmosfera por região,
//  luzes à noite e correção de cor cinematográfica.
// ============================================================
let SCALE = 2;                                  // pixels de tela por unidade de arte (zoom contínuo)
const lightC = document.createElement('canvas'), lightX = lightC.getContext('2d');
const shadowC = document.createElement('canvas'), shadowX = shadowC.getContext('2d');
const holeC = document.createElement('canvas'), holeX = holeC.getContext('2d');
let lastFrameT = performance.now(), SPAWN_MUL = 1;

function wind(x, y, now) { return Math.sin(now / 1400 + x * 0.37 + y * 0.21) + Math.sin(now / 530 + x * 1.1) * 0.35; }

// ---------- dia e noite (igual para todos: usa o relógio) ----------
const DAY_CYCLE_MS = 12 * 60 * 1000;
const ARMED_NPC = new Set(['guard', 'captain', 'executioner']);   // andam com a arma guardada e sacam na briga
const WT = { ph: null, rain: null, cPh: null, cRain: null, t: 0 };   // hora (fase do dia) e chuva fixadas pelo Tecelão; null = natural
// transição suave: a hora e a chuva mostradas andam até o alvo aos poucos (dia→noite ~25 s, chuva ~12 s)
function wtSmooth(natPh, natRain) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now(), dt = Math.min(1, (now - (WT.t || now)) / 1000); WT.t = now;
  const tPh = WT.ph != null ? WT.ph : natPh, tR = WT.rain != null ? WT.rain : natRain;
  if (WT.cPh == null) WT.cPh = tPh; if (WT.cRain == null) WT.cRain = tR;
  let d = ((tPh - WT.cPh) % 1 + 1.5) % 1 - 0.5; const sp = 0.02 * dt; WT.cPh = Math.abs(d) <= sp ? tPh : ((WT.cPh + Math.sign(d) * sp) % 1 + 1) % 1;
  const dr = tR - WT.cRain, rs = 0.085 * dt; WT.cRain = Math.abs(dr) <= rs ? tR : WT.cRain + Math.sign(dr) * rs;
}
function dayInfo() {
  if (WT.t !== -1) wtSmooth((gameNow() % DAY_CYCLE_MS) / DAY_CYCLE_MS, WT.cRain ?? 0);
  const ph = typeof G !== 'undefined' && G.devTime ? (G.devTime === 'day' ? 0.06 : 0.5) : WT.cPh;
  const sk = typeof seasonNow === 'function' ? seasonNow().k : 'spring', sun = Math.cos(ph * Math.PI * 2) + ({ summer: 0.16, winter: -0.14, autumn: -0.04, spring: 0.04 })[sk];
  const k = clamp((0.15 - sun) / 0.65, 0, 1);
  const dark = smooth(k) * 0.62;
  const dusk = Math.max(0, 1 - Math.abs(sun + 0.05) / 0.35);
  return { dark, dusk, night: dark > 0.3, phase: ph, sun };
}
// direção da sombra (o sol cruza o céu da esquerda para a direita)
function sunShadow(day) {
  const t = ((day.phase + 0.25) % 1) * 2;       // 0..1 de dia, 1..2 de noite
  // luz fixa: o sol fica sempre na mesma posição (mesma luz do cenário 3D)
  return { lx: 1.2, ly: 0.17, a: t <= 1 ? 0.44 * (1 - day.dark) : 0.12 };
}
// clima global (chuva em alguns períodos — igual para todos)
function weatherNow() {
  const t = Date.now() / 1000;
  const nat = clamp((Math.sin(t / 260) + Math.sin(t / 97) * 0.4 - 0.75) * 2.2, 0, 1); wtSmooth((gameNow() % DAY_CYCLE_MS) / DAY_CYCLE_MS, nat); const rain = WT.cRain;
  return { rain, wind: 0.6 + Math.sin(t / 40) * 0.4 };
}
function spawnPart(kind, x, y, extra) {
  if (G.parts.length > 350) return;
  const p = { kind, x, y, vx: 0, vy: 0, t0: performance.now(), life: 1000, seed: Math.random() * 100, ...extra };
  switch (kind) {
    case 'smoke': p.life = 2600; p.vx = 0.002; p.vy = -0.006; break;
    case 'ember': p.life = 900; p.vx = (Math.random() - 0.5) * 0.01; p.vy = -0.02; break;
    case 'leaf': p.life = 4200; p.vy = 0.006; p.vx = 0.004; p.color = p.color || (Math.random() < 0.5 ? '#6a9a42' : '#b8902a'); break;
    case 'butterfly': p.life = 7000; p.color = pick(['#e889b0', '#e8d04a', '#a8c8f0', '#f0a860', '#f2ede0']); break;
    case 'firefly': p.life = 5000; break;
    case 'chip': p.life = 650 + Math.random() * 250; { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 0.03 + Math.random() * 0.05; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; } break;
    case 'spark': p.life = 350 + Math.random() * 300; { const a = Math.random() * Math.PI * 2, s = 0.025 + Math.random() * 0.06; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.6 - 0.025; } break;
    case 'sparkle': p.life = 900; p.vy = -0.015 - Math.random() * 0.01; p.vx = (Math.random() - 0.5) * 0.005; break;
    case 'dust': p.life = 450; p.vx = (Math.random() - 0.5) * 0.01; p.vy = -0.004; break;
    case 'shard': p.life = 700; { const a = Math.random() * Math.PI * 2, s = 0.02 + Math.random() * 0.04; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.5 - 0.03; } break;
    case 'mist': p.life = 1600; p.vx = (Math.random() - 0.3) * 0.01; p.vy = -0.008; break;
    case 'snow': p.life = 1400; p.vx = (Math.random() - 0.5) * 0.006; p.vy = 0.004; break;
    case 'blood': p.life = 500; { const a = Math.random() * Math.PI * 2, s = 0.02 + Math.random() * 0.04; p.vx = Math.cos(a) * s; p.vy = -0.03 - Math.random() * 0.02; } break;
  }
  if (SPAWN_MUL !== 1) { p.x *= SPAWN_MUL; p.y *= SPAWN_MUL; }
  p.vx *= ART; p.vy *= ART;
  G.parts.push(p);
}
function drawParticles(ctx, ox, oy, now, dt) {
  const keep = [];
  for (const p of G.parts) {
    const age = now - p.t0;
    if (age > p.life) continue;
    keep.push(p);
    const t = age / p.life;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'blood' || p.kind === 'shard' || p.kind === 'chip') p.vy += 0.00012 * ART * dt;
    const x = Math.round(p.x + ox), y = Math.round(p.y + oy);
    switch (p.kind) {
      case 'smoke': softDab(ctx, x + Math.sin(age / 500 + p.seed) * 4, y, 5 + t * 14, p.color || '#8a8a8a', 0.4 * (1 - t)); break;
      case 'ember': ctx.fillStyle = `rgba(255,${150 + Math.round(p.seed * 9 % 80)},60,${1 - t})`; ctx.fillRect(x, y, 1, 1); G.lights.push({ x, y, r: 6, c: '255,150,60', a: 0.5 * (1 - t) }); break;
      case 'leaf': ctx.fillStyle = p.color; ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1; ctx.fillRect(x + Math.round(Math.sin(age / 400 + p.seed) * 4), y, 2, 1); ctx.globalAlpha = 1; break;
      case 'butterfly': {
        const bx = x + Math.round(Math.sin(age / 900 + p.seed) * 14 + Math.sin(age / 230) * 2), by = y + Math.round(Math.cos(age / 1200 + p.seed) * 7 - 8 - Math.abs(Math.sin(age / 160)) * 2);
        ctx.globalAlpha = Math.min(1, (1 - t) * 4, t * 6); ctx.fillStyle = p.color;
        const fl = Math.abs(Math.sin(age / 60)) > 0.5; ctx.fillRect(bx - (fl ? 2 : 1), by, fl ? 2 : 1, 1); ctx.fillRect(bx + 1, by, fl ? 2 : 1, 1);
        ctx.globalAlpha = 1; break;
      }
      case 'firefly': {
        const fx = x + Math.round(Math.sin(age / 700 + p.seed) * 7), fy = y + Math.round(Math.cos(age / 900 + p.seed) * 4 - 6);
        const a = Math.max(0, Math.sin(age / 300 + p.seed)) * Math.min(1, (1 - t) * 4);
        ctx.fillStyle = `rgba(220,255,130,${a})`; ctx.fillRect(fx, fy, 1, 1);
        G.lights.push({ x: fx, y: fy, r: 9, c: '200,255,120', a: a * 0.8 }); break;
      }
      case 'spark': ctx.fillStyle = (p.color || 'rgba(255,240,180,A)').replace('A', String(1 - t)); ctx.fillRect(x, y, 1, 1); break;
      case 'sparkle': ctx.fillStyle = (p.color || 'rgba(255,240,150,A)').replace('A', String(1 - t)); ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x - 1, y, 3, 1); break;
      case 'dust': ctx.fillStyle = `rgba(170,150,110,${0.45 * (1 - t)})`; ctx.fillRect(x - 1, y, 2 + Math.round(t * 2), 1); break;
      case 'shard': ctx.fillStyle = `rgba(210,240,255,${1 - t})`; ctx.fillRect(x, y, 1, 2); break;
      case 'chip': ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1; ctx.fillStyle = p.color; ctx.fillRect(x, y, 2, 1); ctx.globalAlpha = 1; break;
      case 'mist': softDab(ctx, x, y, 6 + t * 12, '#eef6ff', 0.4 * (1 - t)); break;
      case 'snow': ctx.fillStyle = `rgba(240,248,255,${1 - t})`; ctx.fillRect(x, y, 1, 1); break;
      case 'blood': { const sz = p.sz || 1, a = Math.min(1, (1 - t) * 1.6); ctx.fillStyle = `rgba(${110 + Math.round((p.seed || 0) % 40)},${12 + Math.round((p.seed || 0) % 10)},${14},${a})`; if (sz <= 1) ctx.fillRect(x, y, 1, 1); else { const sp = Math.hypot(p.vx, p.vy) * 40; ctx.beginPath(); ctx.ellipse(x, y, sz * 0.5 + Math.min(1.6, sp), sz * 0.5, Math.atan2(p.vy, p.vx), 0, 7); ctx.fill(); } break; }   // gotas de tamanhos variados, esticadas na direção do voo
    }
  }
  G.parts = keep;
}

// ---------- efeitos de combate ----------
function tileW(x, y, z = 0) { const p = iso(x, y); return { x: p.sx, y: p.sy - z }; }
const easeOut = t => 1 - (1 - t) * (1 - t);
function ring(ctx, cx, cy, r, color, w = 1) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.1, r), Math.max(0.1, r / 2), 0, 0, Math.PI * 2); ctx.stroke(); }
function glowDot(ctx, x, y, r, inner, outer) { if (!(r > 0.05)) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, inner); g.addColorStop(1, outer); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }

function tileW1(x, y, z = 0) { const p = iso(x, y); return { x: p.sx / ART, y: p.sy / ART - z }; }
function drawEffects(ctx, ox, oy, now) {
  const l0 = G.lights.length;
  ctx.save(); ctx.scale(ART, ART); SPAWN_MUL = ART;
  drawEffects1(ctx, ox / ART, oy / ART, now);
  ctx.restore(); SPAWN_MUL = 1;
  for (let i = l0; i < G.lights.length; i++) { G.lights[i].x *= ART; G.lights[i].y *= ART; }
}
function drawEffects1(ctx, ox, oy, now) {
  const keep = [];
  for (const e of G.effects) {
    const age = now - e.t0;
    if (age < 0) { keep.push(e); continue; }
    if (age > e.dur) continue;
    keep.push(e);
    const t = age / e.dur, c = tileW1(e.x, e.y), cx = c.x + ox, cy = c.y + oy;
    switch (e.a) {
      case 'proj': {
        const a = { x: e.from.x / ART, y: e.from.y / ART }, b = tileW1(e.tx, e.ty, 12);
        const px_ = a.x + (b.x - a.x) * t + ox, py_ = a.y + (b.y - a.y) * t + oy - Math.sin(t * Math.PI) * (e.kind === 'arrow' ? 6 : 3);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        if (e.kind === 'arrow') {
          ctx.fillStyle = '#e8dcc0';
          for (let k = 0; k < 7; k++) ctx.fillRect(Math.round(px_ - Math.cos(ang) * k), Math.round(py_ - Math.sin(ang) * k), 1, 1);
          ctx.fillStyle = '#c0c6ce'; ctx.fillRect(Math.round(px_ + Math.cos(ang)), Math.round(py_ + Math.sin(ang)), 1, 1);
          ctx.fillStyle = '#b8382a'; ctx.fillRect(Math.round(px_ - Math.cos(ang) * 7), Math.round(py_ - Math.sin(ang) * 7), 1, 1);
        } else if (e.kind === 'bolt') {
          glowDot(ctx, px_, py_, 5, 'rgba(240,235,255,1)', 'rgba(140,110,230,0)');
          if (Math.random() < 0.6) spawnPart('sparkle', px_ - ox, py_ - oy, { color: 'rgba(196,181,253,A)', life: 400 });
          G.lights.push({ x: px_, y: py_, r: 16, c: '167,139,250', a: 0.8 });
        } else if (e.kind === 'fire') {
          glowDot(ctx, px_, py_, 8, 'rgba(255,250,220,1)', 'rgba(230,70,30,0)');
          spawnPart('ember', px_ - ox + (Math.random() - 0.5) * 4, py_ - oy + (Math.random() - 0.5) * 4);
          G.lights.push({ x: px_, y: py_, r: 36, c: '255,140,50', a: 1 });
        }
        break;
      }
      case 'whirl':
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - t)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy - 6, 24, 12, 0, t * 12, t * 12 + 3.5); ctx.stroke();
        ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy - 6, 28, 14, 0, t * 12 + 1, t * 12 + 4); ctx.stroke();
        if (Math.random() < 0.5) spawnPart('dust', c.x + (Math.random() - 0.5) * 30, c.y + (Math.random() - 0.5) * 10);
        break;
      case 'warcry':
        for (let k = 0; k < 3; k++) { const r = (t * 1.2 - k * 0.15) * 80; if (r > 0) ring(ctx, cx, cy, r, `rgba(230,110,90,${Math.max(0, 0.8 - t)})`, 1); }
        G.lights.push({ x: cx, y: cy - 10, r: 40 * (1 - t), c: '230,110,90', a: 0.6 });
        break;
      case 'wall': case 'agile': case 'potion': {
        const col = e.a === 'wall' ? '240,210,110' : e.a === 'agile' ? '120,220,170' : (e.k === 'hp' ? '230,110,110' : '110,150,240');
        ring(ctx, cx, cy, 5 + t * 15, `rgba(${col},${1 - t})`, 1);
        if (Math.random() < 0.6) spawnPart('sparkle', c.x + (Math.random() - 0.5) * 12, c.y - Math.random() * 16, { color: `rgba(${col},A)` });
        break;
      }
      case 'pierce': {
        const b = tileW1(e.x2, e.y2);
        ctx.strokeStyle = `rgba(190,245,200,${0.9 * (1 - t)})`; ctx.lineWidth = Math.max(1, 3 * (1 - t));
        ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(b.x + ox, b.y + oy - 10); ctx.stroke();
        const ax = cx + (b.x + ox - cx) * Math.min(1, t * 2), ay = cy - 10 + (b.y + oy - cy) * Math.min(1, t * 2);
        ctx.fillStyle = '#efffe8'; ctx.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 3, 3);
        G.lights.push({ x: ax, y: ay, r: 20, c: '187,247,208', a: 0.8 });
        break;
      }
      case 'rain':
        for (let k = 0; k < 18; k++) {
          const tk = t * 1.6 - hash2(k, 1, e.seed) * 0.6; if (tk < 0 || tk > 1) continue;
          const tx = Math.round(cx + (hash2(k, 2, e.seed) - 0.5) * 60), ty = Math.round(cy + (hash2(k, 3, e.seed) - 0.5) * 26), yy = Math.round(ty - 70 * (1 - tk));
          ctx.fillStyle = '#e8dcc0'; ctx.fillRect(tx, yy - 6, 1, 6); ctx.fillStyle = '#c0c6ce'; ctx.fillRect(tx, yy, 1, 1);
          if (tk > 0.95) spawnPart('dust', tx - ox, ty - oy);
        }
        break;
      case 'breath': {   // labareda curta saindo da boca (Hidromel de Fogo)
        const b = tileW1(e.x2, e.y2), bx = b.x + ox, by = b.y + oy - 22, k = Math.min(1, t * 2.2), fade = 1 - t;
        for (let q = 0; q < 6; q++) { const f = (q + 1) / 6 * k, px = cx + (bx - cx) * f + Math.sin(q * 3 + e.seed) * 2, py = cy - 22 + (by - cy + 22) * f - f * 6; glowDot(ctx, px, py, 2 + f * 7, 'rgba(255,' + (220 - q * 20) + ',120,' + fade + ')', 'rgba(255,90,20,0)'); }
        if (!e.sp) { e.sp = 1; for (let q = 0; q < 8; q++) spawnPart('ember', b.x + (Math.random() - 0.5) * 8, b.y - 22); }
        G.lights.push({ x: (cx + bx) / 2, y: cy - 22, r: 40 * fade + 10, c: '255,140,50', a: 0.9 }); break;
      }
      case 'bigboom': {   // clarão, bola de fogo crescendo, onda de choque no chão, fumaça subindo e brasas voando
        const k = easeOut(Math.min(1, t * 1.6)), fade = 1 - t;
        if (t < 0.18) { ctx.fillStyle = 'rgba(255,245,220,' + (0.5 * (1 - t / 0.18)) + ')'; ctx.fillRect(-2000, -2000, 6000, 6000); }   // clarão
        ctx.strokeStyle = 'rgba(255,200,140,' + (0.8 * fade) + ')'; ctx.lineWidth = 2.5 * fade + 0.5; ctx.beginPath(); ctx.ellipse(cx, cy, 8 + easeOut(t) * 70, (8 + easeOut(t) * 70) / 2, 0, 0, 7); ctx.stroke();   // onda no chão
        ctx.fillStyle = 'rgba(40,20,10,' + (0.35 * fade) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy, 12 + k * 40, 6 + k * 20, 0, 0, 7); ctx.fill();   // chão chamuscado
        { const fb = Math.max(0, 1 - t * 1.4), R0 = 6 + k * 22;   // bola de fogo sólida (aparece de dia também)
          for (let q = 0; q < 9; q++) { const a = q / 9 * Math.PI * 2 + e.seed + t * 2, rr = R0 * 0.55, px2 = cx + Math.cos(a) * rr, py2 = cy - 12 - k * 10 + Math.sin(a) * rr * 0.7; ctx.fillStyle = 'rgba(' + (q % 2 ? '255,120,30,' : '255,170,50,') + (0.85 * fb) + ')'; ctx.beginPath(); ctx.arc(px2, py2, R0 * 0.55, 0, 7); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,215,110,' + (0.95 * fb) + ')'; ctx.beginPath(); ctx.arc(cx, cy - 12 - k * 10, R0 * 0.7, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(255,250,225,' + fb + ')'; ctx.beginPath(); ctx.arc(cx, cy - 12 - k * 10, R0 * 0.38, 0, 7); ctx.fill(); }
        glowDot(ctx, cx, cy - 10 - k * 8, 8 + k * 30, 'rgba(255,240,200,' + fade + ')', 'rgba(255,90,20,0)');
        glowDot(ctx, cx, cy - 12 - k * 10, 5 + k * 18, 'rgba(255,255,240,' + (fade * 0.9) + ')', 'rgba(255,170,60,0)');
        for (let q = 0; q < 7; q++) { const a = q / 7 * Math.PI * 2 + e.seed, rr = k * 26, sx = cx + Math.cos(a) * rr, sy = cy - 10 + Math.sin(a) * rr * 0.5 - t * 18; glowDot(ctx, sx, sy, 5 + k * 9, 'rgba(255,' + (150 + q * 10) + ',60,' + (fade * 0.8) + ')', 'rgba(200,60,20,0)'); }
        if (t > 0.25) for (let q = 0; q < 5; q++) { const sy = cy - 20 - (t - 0.25) * 70 - q * 6, sx = cx + Math.sin(q * 2 + e.seed) * 10; ctx.fillStyle = 'rgba(60,50,45,' + (0.35 * fade) + ')'; ctx.beginPath(); ctx.arc(sx, sy, 6 + (t - 0.25) * 22, 0, 7); ctx.fill(); }   // fumaça
        if (!e.sp) { e.sp = 1; for (let q = 0; q < 34; q++) spawnPart(q % 3 ? 'spark' : 'ember', c.x + (Math.random() - 0.5) * 10, c.y - 10, { color: 'rgba(255,' + (140 + Math.floor(Math.random() * 90)) + ',60,A)' }); for (let q = 0; q < 10; q++) spawnPart('dust', c.x + (Math.random() - 0.5) * 30, c.y); }
        G.lights.push({ x: cx, y: cy - 10, r: 140 * fade + 20, c: '255,140,50', a: 1 });
        break;
      }
      case 'boom': {
        const r = 5 + easeOut(t) * 17;
        glowDot(ctx, cx, cy - 7, r, `rgba(255,250,230,${1 - t})`, 'rgba(230,70,30,0)');
        if (!e.sp) { e.sp = 1; for (let k = 0; k < 12; k++) spawnPart('spark', c.x, c.y - 7, { color: 'rgba(253,186,116,A)' }); }
        G.lights.push({ x: cx, y: cy - 7, r: 60 * (1 - t), c: '255,150,60', a: 1 });
        break;
      }
      case 'nova': {
        const r = easeOut(t) * 75;
        ctx.fillStyle = `rgba(186,230,253,${0.3 * (1 - t)})`; ctx.beginPath(); ctx.ellipse(cx, cy, r, r / 2, 0, 0, Math.PI * 2); ctx.fill();
        ring(ctx, cx, cy, r, `rgba(225,242,254,${1 - t})`, 1);
        ctx.fillStyle = `rgba(225,242,254,${0.9 * (1 - t)})`;
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, sx = Math.round(cx + Math.cos(a) * r * 0.85), sy = Math.round(cy + Math.sin(a) * r * 0.42), h = Math.round(9 * Math.sin(Math.min(1, t * 2) * Math.PI)); ctx.fillRect(sx, sy - h, 2, h); }
        if (!e.sp) { e.sp = 1; for (let k = 0; k < 18; k++) spawnPart('shard', c.x, c.y - 5); }
        G.lights.push({ x: cx, y: cy, r: 70 * (1 - t * 0.5), c: '186,230,253', a: 0.9 * (1 - t) });
        break;
      }
      case 'wind': {   /* Passo do Vento: rastro de vento e folhas do ponto de partida ao de chegada */
        const b = tileW1(e.x2, e.y2), ex = b.x + ox, ey = b.y + oy, fa = 1 - t;
        for (let q = 0; q < 4; q++) { const off = (q - 1.5) * 5; ctx.strokeStyle = 'rgba(220,240,240,' + (0.75 * fa) + ')'; ctx.lineWidth = 1.6 - q * 0.25; ctx.beginPath(); ctx.moveTo(cx, cy - 14 + off); ctx.quadraticCurveTo((cx + ex) / 2, (cy + ey) / 2 - 22 + off * 2, ex, ey - 14 + off); ctx.stroke(); }
        ring(ctx, cx, cy, 6 + t * 18, 'rgba(200,235,235,' + fa + ')', 1);
        if (!e.sp) { e.sp = 1; for (let q = 0; q < 14; q++) spawnPart('dust', c.x + (Math.random() - 0.5) * 16, c.y - Math.random() * 6); for (let q = 0; q < 6; q++) spawnPart('sparkle', c.x + (Math.random() - 0.5) * 20, c.y - 10 - Math.random() * 14, { color: 'rgba(170,220,150,A)' }); }
        break;
      }
      case 'bloom': {   /* Florescer: anel verde que se abre e pétalas subindo */
        const R = (e.k || 16) / 10 * 32 * easeOut(Math.min(1, t * 1.6)), fa = Math.sin(Math.min(1, t) * Math.PI);
        ctx.fillStyle = 'rgba(140,200,90,' + (0.16 * fa) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy, R, R / 2, 0, 0, 7); ctx.fill(); ring(ctx, cx, cy, R, 'rgba(190,235,140,' + (0.8 * fa) + ')', 1);
        if (Math.random() < 0.8) { const a = Math.random() * 6.28, rr = Math.random() * R; spawnPart('sparkle', c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.5, { color: ['rgba(255,170,200,A)', 'rgba(255,240,150,A)', 'rgba(220,180,255,A)', 'rgba(255,255,255,A)'][Math.floor(Math.random() * 4)] }); }
        G.lights.push({ x: cx, y: cy - 8, r: R * 0.8 + 20, c: '200,240,150', a: 0.45 * fa });
        break;
      }
      case 'spring': {   /* Fonte: jorro de água das mãos e anel molhado no chão */
        const R = (e.k || 30) / 10 * 32 * easeOut(Math.min(1, t * 1.4)), fa = 1 - t;
        ctx.fillStyle = 'rgba(120,180,230,' + (0.14 * fa) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy, R, R / 2, 0, 0, 7); ctx.fill(); ring(ctx, cx, cy, R, 'rgba(170,215,250,' + fa + ')', 1); ring(ctx, cx, cy, R * 0.6, 'rgba(170,215,250,' + (0.6 * fa) + ')', 1);
        if (t < 0.7) for (let q = 0; q < 3; q++) { const a = Math.random() * 6.28, sp = 1.2 + Math.random(); spawnPart('sparkle', c.x + Math.cos(a) * 4, c.y - 30, { color: 'rgba(150,205,255,A)', vx: Math.cos(a) * sp * 0.04, vy: -0.05 - Math.random() * 0.04 }); }
        G.lights.push({ x: cx, y: cy - 20, r: 50, c: '150,200,255', a: 0.5 * fa });
        break;
      }
      case 'heal': case 'lvlup': {
        const gold = e.a === 'lvlup', alpha = Math.sin(t * Math.PI), w = gold ? 14 : 10, col = gold ? '240,210,110' : '150,230,150';
        const g = ctx.createLinearGradient(0, cy - 60, 0, cy);
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.5 * alpha})`);
        ctx.fillStyle = g; ctx.fillRect(Math.round(cx - w / 2), Math.round(cy - 60), w, 60);
        ring(ctx, cx, cy, 9 + t * 5, `rgba(${col},${alpha})`, 1);
        if (Math.random() < 0.7) spawnPart('sparkle', c.x + (Math.random() - 0.5) * 14, c.y - Math.random() * 12, { color: `rgba(${col},A)` });
        G.lights.push({ x: cx, y: cy - 15, r: 45, c: col, a: alpha });
        break;
      }
      case 'meteor':
        for (let k = 0; k < 5; k++) {
          const st = hash2(k, 4, e.seed) * 0.35, tk = (t - st) / 0.45;
          const tx = cx + (hash2(k, 5, e.seed) - 0.5) * 70, ty = cy + (hash2(k, 6, e.seed) - 0.5) * 30;
          if (tk >= 0 && tk <= 1) {
            const mx = tx - 80 * (1 - tk), my = ty - 130 * (1 - tk);
            ctx.strokeStyle = 'rgba(250,140,60,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx - 20, my - 32); ctx.lineTo(mx, my); ctx.stroke();
            glowDot(ctx, mx, my, 7, 'rgba(255,250,230,1)', 'rgba(120,50,15,0)');
            G.lights.push({ x: mx, y: my, r: 30, c: '255,140,50', a: 1 });
          } else if (tk > 1 && tk < 1.8) {
            const bt = (tk - 1) / 0.8;
            glowDot(ctx, tx, ty - 4, 6 + bt * 20, `rgba(255,240,200,${1 - bt})`, 'rgba(127,29,29,0)');
            if (!e['b' + k]) { e['b' + k] = 1; G.shake = Math.max(G.shake, 4); for (let q = 0; q < 10; q++) spawnPart('spark', tx - ox, ty - oy - 4, { color: 'rgba(253,186,116,A)' }); }
            G.lights.push({ x: tx, y: ty - 4, r: 65 * (1 - bt), c: '255,140,50', a: 1 });
          }
        }
        break;
    }
  }
  G.effects = keep;
}

function drawMagicCircle(ctx, cx2, cy2, now, el, prog) {
  const l0 = G.lights.length; ctx.save(); ctx.scale(ART, ART);
  drawMagicCircle1(ctx, cx2 / ART, cy2 / ART, now, el, prog);
  ctx.restore();
  for (let i = l0; i < G.lights.length; i++) { G.lights[i].x *= ART; G.lights[i].y *= ART; }
}
// fogo: dois anéis de runas girando em sentidos opostos, pentagrama que vai se desenhando, brilho no chão e brasas subindo
function drawFireCircle(ctx, cx, cy, now, prog) {
  const R1 = 16, R2 = 12.5, glow = 0.35 + prog * 0.55;
  ctx.save(); ctx.translate(cx, cy);
  const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, R1 * 1.6); gr.addColorStop(0, 'rgba(255,170,60,' + (0.35 * glow) + ')'); gr.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = gr; ctx.save(); ctx.scale(1, 0.5); ctx.beginPath(); ctx.arc(0, 0, R1 * 1.6, 0, 7); ctx.fill(); ctx.restore();
  ctx.scale(1, 0.5); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const ring = (r, w, a) => { ctx.strokeStyle = 'rgba(255,190,90,' + a + ')'; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); };
  ring(R1 + 1.2, 0.6, 0.7 * glow); ring(R1 - 1.2, 0.5, 0.6 * glow); ring(R2 - 2, 0.6, 0.7 * glow);
  const runes = (r, n, rot, a) => { ctx.save(); ctx.rotate(rot); ctx.strokeStyle = 'rgba(255,220,140,' + a + ')'; ctx.lineWidth = 0.55; for (let k = 0; k < n; k++) { ctx.save(); ctx.rotate(k / n * Math.PI * 2); ctx.translate(r, 0); ctx.beginPath(); const t = (k * 7) % 4; if (t === 0) { ctx.moveTo(-0.8, -1); ctx.lineTo(0.8, 0); ctx.lineTo(-0.8, 1); } else if (t === 1) { ctx.moveTo(0, -1.1); ctx.lineTo(0, 1.1); ctx.moveTo(-0.8, -0.4); ctx.lineTo(0.8, 0.4); } else if (t === 2) { ctx.arc(0, 0, 0.8, 0.3, 5.2); } else { ctx.moveTo(-0.8, 1); ctx.lineTo(0, -1); ctx.lineTo(0.8, 1); ctx.moveTo(-0.4, 0.2); ctx.lineTo(0.4, 0.2); } ctx.stroke(); ctx.restore(); } ctx.restore(); };
  runes(R1, 16, now / 1400, 0.85 * glow); runes(R2 + 0.2, 12, -now / 1000, 0.75 * glow);
  // pentagrama se desenhando conforme a conjuração avança
  const pts = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5 + now / 2600; pts.push([Math.cos(a) * (R2 - 2), Math.sin(a) * (R2 - 2)]); }
  const segs = Math.min(5, prog * 5.4); ctx.strokeStyle = 'rgba(255,230,160,' + (0.9 * glow) + ')'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k <= Math.ceil(segs); k++) { const A = pts[(k - 1) % 5], B = pts[k % 5], f = Math.min(1, segs - (k - 1)); ctx.lineTo(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f); } ctx.stroke();
  ctx.restore();
  if (Math.random() < 0.35 + prog * 0.4) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R1; spawnPart('ember', (cx + Math.cos(a) * rr) * ART - G.view.ox, (cy + Math.sin(a) * rr * 0.5) * ART - G.view.oy); }   // brasas subindo
  G.lights.push({ x: cx, y: cy - 3, r: 34 + prog * 14, c: '255,150,60', a: 0.6 + prog * 0.4 });
}
function drawMagicCircle1(ctx, cx, cy, now, el, prog) {
  if (el === 'fire') return drawFireCircle(ctx, cx, cy, now, prog);
  const col = { fire: '250,150,70', ice: '130,210,250', holy: '240,215,110', wind: '120,220,170', phys: '230,230,230' }[el] || '196,181,253';
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.5);
  ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.stroke();
  ctx.rotate(now / 600);
  ctx.beginPath();
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, a2 = a + Math.PI * 2 / 3; ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a2) * 10, Math.sin(a2) * 10); }
  ctx.stroke();
  ctx.fillStyle = `rgba(${col},${0.15 + prog * 0.25})`; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill();
  ctx.restore();
  G.lights.push({ x: cx, y: cy - 3, r: 30, c: col, a: 0.6 + prog * 0.4 });
}

const SHADOW = sprite('shadow', 16, 6, 8, 3, pc => pc.e(8, 3, 7, 2.6, px('#000000', 0, 80)), { outline: false, k: ART });
const SHADOW_BIG = sprite('shadowb', 28, 9, 14, 4, pc => pc.e(14, 4.5, 13, 4, px('#000000', 0, 80)), { outline: false, k: ART });

// ---------- desenho de entidades ----------
const DIR_VIEW = ['S', 'E', 'N', 'W']; // 0..3
// estado de saúde visível: 0 saudável, 1 cansado (vida < 60% ou sem fôlego), 2 à beira da morte (vida < 25%)
function healthState(e) {
  if (!e.maxHp || e.downed) return 0;
  const r = e.hp / e.maxHp;
  if (r < KNEEL_HP) return 3;
  if (r < DYING_HP) return 2;
  if (r < 0.35 || (e === G.me && (G.tired || (G.stam ?? STAM_MAX) < STAM_MAX * 0.2))) return 1;
  return 0;
}
// ferimentos no corpo: mais sangue, sujeira e rasgos a cada estado (à beira da morte 1, de joelhos 2, caído 3)
function woundLevel(e) { if (e.isNpc || !e.maxHp) return 0; if (e.downed) return 3; const h = healthState(e); return h === 3 ? 2 : h === 2 ? 1 : 0; }
const WOUNDS = new WeakMap();
function woundOf(s, lv) {
  if (!s || !lv) return s;
  let m = WOUNDS.get(s); if (!m) { m = {}; WOUNDS.set(s, m); }
  if (m[lv]) return m[lv];
  const c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height; const x = c.getContext('2d');
  x.drawImage(s.c, 0, 0); x.globalCompositeOperation = 'source-atop';
  const W = c.width, H = c.height; let sd = W * 7 + H * 13 + lv; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  x.fillStyle = 'rgba(55,38,22,' + (0.1 + lv * 0.07) + ')'; x.fillRect(0, 0, W, H);                       // sujeira / roupa encardida
  for (let k = 0; k < lv * 6; k++) {                                                                       // manchas de sangue (mais no tronco)
    const px = W * (0.35 + rnd() * 0.3), py = H * (0.35 + rnd() * 0.45), r = W * (0.025 + rnd() * 0.04 * lv);
    const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(90,4,4,0.85)'); g.addColorStop(1, 'rgba(120,8,8,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
    if (rnd() < 0.5) { x.fillStyle = 'rgba(110,6,6,0.7)'; x.fillRect(px - 1, py, 2, r * (1 + rnd() * 2)); }   // escorrido
  }
  if (lv >= 2) { x.globalCompositeOperation = 'destination-out'; x.strokeStyle = 'rgba(0,0,0,0.9)'; for (let k = 0; k < lv * 2; k++) { const px = W * (0.38 + rnd() * 0.24), py = H * (0.45 + rnd() * 0.35); x.lineWidth = 1 + rnd(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 6, py + 3 + rnd() * 6); x.stroke(); } }   // rasgos
  return (m[lv] = { ...s, c });
}
function objSprite(o) { return o === O.BARREL ? smallSprite('barrel') : o === O.CRATE ? smallSprite('crate') : o === O.ROCK ? rockSprite(0, 0) : null; }
// progresso (0..1) de uma ação; golpes com preparação W ocupam os primeiros 40% da animação
function actProg(an, now) { const ms = an.ms || ACT_MS[an.a] || 400, tt = now - an.t0; if (tt < 0 || tt >= ms) return -1; if (an.W) return tt < an.W ? 0.4 * tt / an.W : 0.4 + 0.6 * (tt - an.W) / Math.max(1, ms - an.W); return tt / ms; }
function heroPoseFor(e, now) {
  const view0 = DIR_VIEW[e.dir || 0];
  const P = { view: view0 === 'W' ? 'E' : view0, walk: -1, act: null, idle: null, sit: false, carry: !!e.lifted };
  if (e.dragMode) P.drag = e.dragMode; else if (e.carrying && !e.lifted) P.drag = 'back';
  if (e.gripped) P.held = e.choked ? 2 : 1;
  if (e.bound && !e.downed) { P.tied = (e.stb & 4) ? 2 : 1; if (P.drag !== 'lead') P.drag = null; }
  else if (e.stb & 1) { P.surr = 1; P.drag = null; }
  if (e.stb & 8) P.led = 1;
  if ((e.stb & 16) && !e.downed) P.carry = true;   // carregando um pacote do trabalho
  if ((e.stb & 32) && !e.walking && !e.downed) P.act = { k: 'polish', f: Math.floor(now / 110) % 12 };   // turno: trabalhando no balcão/bancada
  P.dir = e.dir || 0;
  if (e.custP && !e.walking) { Object.assign(P, e.custP); if (P.sit) P.walk = -1; if (e.isNpc && typeof martaOfferPose === 'function') martaOfferPose(e, P, now); return P; }
  if (e.isNpc && e.kind === 'fruit' && typeof martaOfferPose === 'function' && !e.walking) martaOfferPose(e, P, now);
  if (e.custP && e.custP.sweep && e.walking) P.act = e.custP.act;
  if (e.isNpc ? (ARMED_NPC.has(e.kind) && !e.npDrawn && !e.npDown && !e.npDead) : (e === G.me ? G.me.shea : e.sheaS)) P.shea = 1;
  if (e.isNpc) { P.gait = e.drunk ? 'drunk' : NPC_GAIT[e.kind] || undefined; const h = typeof npcHeld === 'function' ? npcHeld(e) : null; if (h) P.hold = h; }
  if (e.walking) { P.walk = Math.floor(e.walkDist * (e.isNpc ? (GAIT_CAD[P.gait] || 9.5) : e.cls === 'knight' ? 8.5 : 9.5) / (e.running ? 1.45 : 1)) % 12; if (e.running) P.run = 1; if (e.dragMode === 'arms') P.walk = (12 - P.walk) % 12; }   // puxando pelos braços anda de costas
  if (e.skin === 'weaver') { P.walk = -1; P.run = 0; }
  if (!e.isNpc && ((e === G.me && G.me.buffs && G.me.buffs.tipsy > now) || (e.stb & 1048576))) P.gait = 'drunk';   // tonto de cerveja (todos veem)
  P.uni = ((e.stb || 0) >> 7) & 7 || undefined; P.cloak = ((e.stb || 0) >> 16) & 15 || undefined;
  P.wpn = e.cls === 'knight' && ((e === G.me ? e.wpn === 'halberd' : (e.stb & 64))) ? 'halberd' : undefined;
  if (e === G.me && G.melee && !e.anim) { const k = G.melee.k, held = now - G.melee.t0; P.act = { k: 'atk_' + k, f: Math.min(4, Math.floor(held / 60)) }; }
  if (e.anim && e.anim.tool && actProg(e.anim, now) >= 0) P.tool = e.anim.tool;
  if (e.anim) { const t = actProg(e.anim, now); if (e.anim.a === 'adore' && (e.anim.ms || 0) > 3000) { if (now - e.anim.t0 < e.anim.ms) P.act = { k: 'adore', f: Math.min(9, Math.floor((now - e.anim.t0) / 80)) }; } else if (t >= 0 && ACTS[e.anim.a]) P.act = { k: e.anim.a, f: Math.min(11, Math.floor(t * 12)) }; }
  if (!P.act && typeof bowPose === 'function') { const bp = bowPose(e, now); if (bp) P.act = bp; }
  if (!e.isNpc) { P.lost = e.lost || 0; P.pro = e.pro || 0; }
  if (e.knockUntil && now < e.knockUntil && now >= e.knockUntil - 650) P.act = { k: 'getup', f: Math.min(11, Math.floor((1 - (e.knockUntil - now) / 650) * 12)) };
  if (!P.act && (e === G.me ? G.parrying : e.parrying)) { P.act = { k: 'blk_front', f: 6 }; P.run = 0; }
  if (!e.isNpc && e.cls === 'knight' && (e === G.me ? (G.me.shp ?? 100) <= 0 : (e.stb & 32768))) P.shb = 1;
  if (!P.act && (e === G.me ? performance.now() < (G.stunUntil || 0) : e.stunned)) P.act = { k: 'hurt', f: 5 };
  if (e.cast && e.cast.end > now) P.act = { k: e.cast.el === 'fire' && e.cls === 'mage' ? 'castup' : 'cast', f: Math.floor(now / 70) % 12 };
  if (!P.act && e.emote && !e.walking) { const ms = ACT_MS[e.emote.k], t = (now - e.emote.t0) / ms; if (e.emote.k === 'dance') P.act = { k: 'dance', f: Math.floor(t * 12) % 12 }; else if (e.emote.k === 'adore') P.act = { k: 'adore', f: t < 0.8 ? Math.floor(t * 12) : 9 }; else if (t < 1) P.act = { k: e.emote.k + (e.cls === 'knight' && ACTS[e.emote.k + '_k'] ? '_k' : ''), f: Math.min(11, Math.floor(t * 12)) }; else e.emote = null; }
  else if (e.walking && e.emote) e.emote = null;
  if (e.sit && !P.act) { P.sit = e.sit.chair ? 'c' : 'g'; P.walk = -1; e._sseed = e._sseed ?? Math.random() * 20000; const sv = Math.floor((now + e._sseed) / 6500) % 3; if (sv) P.sv = sv; return P; }
  if (!e.isNpc) {
    if (e.slide) { P.sl = 1; P.walk = -1; P.run = 0; P.act = null; return P; }
    if (e.crouch || (e === G.me && performance.now() < (G.banding || 0))) { P.cr = 1; P.run = 0; }
    const limp = e === G.me && e.body ? Math.max(PART_STATE(e.body.legL), PART_STATE(e.body.legR)) : e.limp || 0, armw = e === G.me && e.body ? PART_STATE(e.body.armA) >= 2 : e.armWeak;
    if (limp) P.limp = limp; if (armw) P.armw = 1;
    P.hs = healthState(e);
    if (P.hs && !e.walking && !P.act) P.br = Math.floor(now / (P.hs >= 2 ? 180 : 220)) % 4;   // respiração ofegante
  }
  if (!P.act && !e.walking && e.idleAnim) {
    const t = (now - e.idleAnim.t0) / e.idleAnim.dur;
    if (t < 1) {
      if (e.idleAnim.k === 'sit') P.sit = true;
      else P.idle = { k: e.idleAnim.k, f: Math.min(11, Math.floor(t * 12)) };
    }
  }
  return P;
}

// aura do Tecelão: flutua sobre um anel de luz, fios brancos orbitando, partículas subindo e halo pulsando
function drawWeaverAura(ctx, sx, sy, now) {
  const fy = 14 + Math.sin(now / 600) * 3, pulse = 0.5 + Math.sin(now / 420) * 0.5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';

  ctx.lineWidth = 1;
  for (let r = 0; r < 2; r++) { const rr = 15 + r * 6 + ((now / 900 + r * 0.5) % 1) * 6, al = 0.5 * (1 - ((now / 900 + r * 0.5) % 1)); ctx.strokeStyle = 'rgba(255,255,255,' + al.toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, rr, rr * 0.42, 0, 0, 7); ctx.stroke(); }
  for (let k = 0; k < 3; k++) {   // fios de luz girando em elipses inclinadas
    ctx.strokeStyle = 'rgba(235,242,255,0.35)'; ctx.beginPath();
    for (let q = 0; q <= 1.0001; q += 0.08) { const a = now / (700 + k * 260) * (k % 2 ? -1 : 1) + q * 2.2 + k * 2.1, x = sx + Math.cos(a) * (13 + k * 3), y = sy - fy - 12 - k * 11 + Math.sin(a) * 4 + Math.sin(a + k) * 3; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  for (let k = 0; k < 10; k++) {   // partículas de luz subindo
    const ph = (now / 1700 + k * 0.137) % 1, x = sx + Math.sin(k * 7.3 + now / 650) * (8 + (k % 4) * 3), y = sy - ph * 72 - 4, al = Math.sin(ph * Math.PI) * 0.85;
    ctx.fillStyle = 'rgba(255,255,255,' + al.toFixed(2) + ')'; ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
  }
  ctx.restore();
}
let _stoolSpr = null;
function stoolSprite() {
  if (_stoolSpr) return _stoolSpr; const K = 4, W = 20, H = 20, c = document.createElement('canvas'); c.width = W * K; c.height = H * K; const x = c.getContext('2d'); x.scale(K, K);
  const cx = 10, by = 18; x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(cx, by, 6, 2.4, 0, 0, 7); x.fill();
  x.strokeStyle = '#4a3020'; x.lineWidth = 1.3; for (const [dx, dy] of [[-4, 0.6], [4, 0.6], [0, 2]]) { x.beginPath(); x.moveTo(cx + dx, by + dy - 0.5); x.lineTo(cx + dx * 0.55, by - 9); x.stroke(); }
  x.fillStyle = '#6e4a2a'; x.beginPath(); x.ellipse(cx, by - 9, 5, 2.1, 0, 0, 7); x.fill(); x.fillStyle = '#8f6a40'; x.beginPath(); x.ellipse(cx, by - 9.6, 4.4, 1.7, 0, 0, 7); x.fill();
  _stoolSpr = { c, w: W, h: H, ax: cx, ay: by }; return _stoolSpr;
}
// altura do tablado do cadafalso (com a rampa da escada na frente)
// cores da estação nas plantas: outono alaranjado, inverno pálido com neve; cada sprite é refeito uma vez por estação
const SEASON_PLANTS = new Set([O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW, O.BUSH, O.TALLGRASS, O.FERN, O.BERRY, O.FLOWER, O.HERB]);
const _stint = new Map();
function seasonTint(s, o) {
  if (!s || !SEASON_PLANTS.has(o) || typeof seasonNow !== 'function') return s; const sk = seasonNow().k; if (sk === 'spring' || sk === 'summer') return s;
  let m = _stint.get(s); if (!m) { m = {}; _stint.set(s, m); if (_stint.size > 600) _stint.delete(_stint.keys().next().value); }
  if (m[sk]) return m[sk];
  const c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height; const x = c.getContext('2d');
  const pine = o === O.PINE;
  try { x.filter = sk === 'autumn' ? (pine ? 'saturate(0.85)' : 'sepia(0.5) hue-rotate(-28deg) saturate(1.7) brightness(1.02)') : (pine ? 'saturate(0.6) brightness(1.05)' : 'saturate(0.2) brightness(1.12)'); } catch (e) { }
  x.drawImage(s.c, 0, 0); x.filter = 'none';
  if (sk === 'winter') { x.globalCompositeOperation = 'source-atop'; const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(240,245,255,0.18)'); g.addColorStop(1, 'rgba(240,245,255,0)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); }
  return (m[sk] = { ...s, c });
}
function stageLift(x, y) {
  return 0;   // a guilhotina agora fica no chão
  if (STAGE.x < 0) return 0; const dx = x - STAGE.x, dy = y - STAGE.y, H = 0.82 * (typeof HV !== 'undefined' ? HV : 25);
  if (Math.abs(dx) <= 1.5 && Math.abs(dy) <= 1.5) return H;
  if (Math.abs(dx) < 0.6 && dy > 1.5 && dy < 2.35) return H * (1 - (dy - 1.5) / 0.85);
  return 0;
}
function drawHeroEntity(ctx, e, sx, sy, now) {
  if (R3.ok && e.tied && !e.isNpc && typeof drawTied === 'function') { drawTied(ctx, e, sx, sy, now); e._spr = null; return; }
  if (R3.ok && e.downed && !e.isNpc && typeof drawTow === 'function' && TOWS['p:' + e.id] && drawTow(ctx, 'p:' + e.id, now)) { e._spr = null; return; }
  if (R3.ok && e.exec && e.exec.T && typeof drawExecVictim === 'function' && drawExecVictim(ctx, e, sx, sy, now)) return;
  if (R3.ok && e.downed && e.dragged && !e.isNpc && typeof drawDragged === 'function') { drawDragged(ctx, e, sx, sy, now); e._spr = null; return; }
  if (R3.ok && e.exec && e.exec.T && typeof drawExecVictim === 'function' && drawExecVictim(ctx, e, sx, sy, now)) return;
  if (R3.ok && e.exec && !e.exec.T && now < e.exec.t0 + e.exec.ms + 1500) {   // deitado na guilhotina, com a cabeça na luneta
    const s = heroSprite3D(e.cls, e.skin, e.color, { dir: 6, walk: -1, down: true, lost: e.lost || 0, pro: e.pro || 0 });
    ctx.imageSmoothingEnabled = true; pblit(ctx, woundOf(s, 3), sx, sy - 0.95 * (typeof HV !== 'undefined' ? HV : 25)); e._spr = null; return;
  }
  if (R3.ok && e.sleepB && !e.downed) {   // deitado na cama, dormindo
    const P = { dir: e.dir || 0, walk: -1, down: true, lost: e.lost || 0, pro: e.pro || 0 };
    const s = e.isNpc ? npcSprite3D(e.kind, P) : heroSprite3D(e.cls, e.skin, e.color, P);
    ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy - 11); if (typeof drawZzz === 'function') drawZzz(ctx, sx, sy - 26, now); e._spr = null; return;
  }
  if (R3.ok && e.knockUntil && now < e.knockUntil && !e.downed) { const kf = FALLS['kp' + e.id]; if (now < e.knockUntil - 650 && kf) { drawFall(ctx, kf, sx, sy, now, 1, woundLevel(e)); e._spr = null; return; } }
  if (R3.ok && e.fling) {
    const f = e.fling, k = Math.min(1, (now - f.t0) / f.ms); ctx.imageSmoothingEnabled = true;
    if (k < 1) {
      const s = heroSprite3D(e.cls, e.skin, e.color, { dir: e.dir || 0, walk: -1, act: { k: 'hurt', f: 6 } }), lift = Math.sin(Math.PI * k) * 95;
      softDab(ctx, sx, sy, 10 * (1 - Math.sin(Math.PI * k) * 0.6), '#000000', 0.3);
      ctx.save(); ctx.translate(sx, sy - lift - 26); ctx.rotate(f.spin * k * Math.PI * 3); pblit(ctx, woundOf(s, woundLevel(e)), 0, 26); ctx.restore(); e._spr = null; return;
    }
    const s = heroSprite3D(e.cls, e.skin, e.color, { dir: e.dir || 0, walk: -1, down: true }); pblit(ctx, woundOf(s, Math.max(1, woundLevel(e))), sx, sy); e._spr = null; return;
  }
  if (R3.ok) {
    if (e.downed && !e.carriedBy) { const f = FALLS['p' + e.id]; if (f) { drawFall(ctx, f, sx, sy, now, 1, 3); return; } const s = heroSprite3D(e.cls, e.skin, e.color, { dir: e.dir || 0, walk: -1, down: true }); ctx.imageSmoothingEnabled = true; pblit(ctx, woundOf(s, 3), sx, sy); return; }
    const P = heroPoseFor(e, now);
    if (!P.act && e.hitAt && now - e.hitAt < 300) P.act = { k: 'hurt', f: Math.min(11, Math.floor((now - e.hitAt) / 300 * 12)) };
    if (e.custP && e.custP.stool && typeof drawStool === 'function') drawStool(ctx, sx, sy);
    let s = null; if (typeof TOWS !== 'undefined') for (const k in TOWS) { const f = TOWS[k]; if (f.combined && f.c === e) { s = carrySprite(e, f, P); if (s && !e.isNpc) s = woundOf(s, woundLevel(e)); break; } }
    if (!s) s = e.isNpc ? npcSprite3D(e.kind, P) : woundOf(heroSprite3D(e.cls, e.skin, e.color, P), woundLevel(e));
    ctx.imageSmoothingEnabled = true;
    softDab(ctx, sx, sy, 10, '#000000', 0.35);
    const kb = knockOf(e, now); sx += kb.x * 0.6; sy += kb.y * 0.6;
    if (e !== G.me && e.anim && e.anim.W && e.anim.reach && now - e.anim.t0 < e.anim.W + 120) drawTelegraph(ctx, e, sx, sy, now);
    if (e.skin === 'weaver') drawWeaverAura(ctx, sx, sy, now);
    if (e.skin === 'weaver') sy -= 14 + Math.sin(now / 600) * 3;
    pblit(ctx, s, sx, sy); e._spr = s; e._sx = sx; e._sy = sy;
    if (e.hitAt && now - e.hitAt < 110) pblit(ctx, whiteOf(s, 'w3|' + e.id + (e.cls || e.kind)), sx, sy, 0.65);
    return;
  }
  if (e.downed && !e.carriedBy) { drawLying(ctx, e, sx, sy); return; }
  const P = heroPoseFor(e, now);
  const flip = P.flipSpin != null ? P.flipSpin : DIR_VIEW[e.dir || 0] === 'W';
  blit(ctx, SHADOW, sx, sy);
  const key = e.isNpc ? 'n|' + e.kind + '|' + poseKey(P) : 'h|' + e.cls + ':' + e.skin + ':' + e.color + '|' + poseKey(P);
  const spr = e.isNpc ? npcSprite(e.kind, P) : heroSprite(e.cls, e.skin, e.color, P);
  blit(ctx, spr, sx, sy, flip);
  if (e.hitAt && now - e.hitAt < 110) { ctx.globalAlpha = 0.7; blit(ctx, whiteOf(spr, key), sx, sy, flip); ctx.globalAlpha = 1; }
}
function drawLying(ctx, e, sx, sy) {
  const spr = heroSprite(e.cls, e.skin, e.color, { view: 'S', walk: -1 });
  blit(ctx, SHADOW_BIG, sx, sy);
  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy - 5));
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(spr.c, -spr.ax, -76);
  ctx.restore();
  if (Math.random() < 0.02) spawnPart('blood', sx - G.view.ox, sy - G.view.oy - 4);
}
function drawCarried(ctx, e, sx, sy) {
  if (typeof TOWS !== 'undefined' && TOWS['p:' + e.id] && drawTow(ctx, 'p:' + e.id, performance.now())) return;
  if (R3.ok) { const s = heroSprite3D(e.cls, e.skin, e.color, { dir: 2, walk: -1, down: true }); pblit(ctx, s, sx, sy - 70); return; }
  const spr = heroSprite(e.cls, e.skin, e.color, { view: 'S', walk: -1 });
  ctx.save();
  ctx.translate(Math.round(sx + 2), Math.round(sy - 70));
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(spr.c, -spr.ax, -76);
  ctx.restore();
}
// empurrão do golpe: sai e volta em ~250 ms
function knockOf(e, now) {
  const k = e.knock; if (!k) return { x: 0, y: 0, dx: 0 };
  const t = (now - k.t0) / 260; if (t >= 1) return { x: 0, y: 0, dx: k.dx };
  const p = Math.sin(Math.min(1, t * 1.6) * Math.PI) * (1 - t * 0.3) * 9 * k.s;
  return { x: k.dx * p, y: k.dy * p, dx: k.dx };
}
// queda nos golpes fortes: tomba, fica um instante e levanta
function fallAngle(ms) {
  const t = ms / 1100; if (t >= 1) return 0;
  return (t < 0.25 ? t / 0.25 : t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35) * 1.15;
}
const PAINT_AS = { dragon: 'troll', deer: 'wolf', boar: 'wolf', bandit: 'goblin', deserter: 'goblin', deserterchief: 'goblin', orcchief: 'orc', cryptlord: 'skeleton', elderslime: 'slime', wisp: 'slime' };
const MON_H = { dragon: 420, bandit: 84, deserter: 90, wisp: 70, orcchief: 140, cryptlord: 120, deserterchief: 104, elderslime: 70, deer: 70, boar: 46, rat: 30, slime: 40, wolf: 58, spider: 52, toad: 44, goblin: 68, skeleton: 92, orc: 104, troll: 150 };
// aviso do golpe inimigo: arco vermelho no chão que enche durante a preparação (dá tempo de aparar ou esquivar)
function drawTelegraph(ctx, e, sx, sy, now) {
  const an = e.anim, k = Math.min(1, (now - an.t0) / an.W), seg = 10, pts = [[sx, sy]], mode = SET.tele || 'soft';
  if (mode === 'off') return;
  if (mode === 'soft') {   // discretíssimo: um fio de luz na borda do alcance, só no último terço da preparação, e um lampejo no golpe
    if (k < 0.66) return; const a2 = Math.min(1, (k - 0.66) / 0.34);
    ctx.save(); ctx.beginPath(); for (let q = -seg; q <= seg; q++) { const a = an.ang + an.arc * q / seg, p = iso(e.rx + Math.cos(a) * an.reach, e.ry + Math.sin(a) * an.reach), x = p.sx + G.view.ox, y = p.sy + G.view.oy - (e.z || 0) * FLOOR_PX; q === -seg ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.lineCap = 'round'; ctx.strokeStyle = k >= 1 ? 'rgba(255,250,235,0.55)' : 'rgba(255,214,170,' + (0.06 + a2 * 0.26).toFixed(2) + ')'; ctx.lineWidth = k >= 1 ? 0.9 : 0.6; ctx.stroke(); ctx.restore(); return;
    ctx.beginPath(); for (let q = -seg; q <= seg; q++) { const a = an.ang + an.arc * q / seg, p = iso(e.rx + Math.cos(a) * an.reach, e.ry + Math.sin(a) * an.reach), x = p.sx + G.view.ox, y = p.sy + G.view.oy - (e.z || 0) * FLOOR_PX; q === -seg ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = k >= 1 ? 'rgba(255,255,255,0.7)' : 'rgba(255,70,40,' + (0.15 + a2 * 0.45).toFixed(2) + ')'; ctx.lineWidth = 1.2 + a2; ctx.stroke(); return;
  }
  for (let q = -seg; q <= seg; q++) { const a = an.ang + an.arc * q / seg, wx = e.rx + Math.cos(a) * an.reach, wy = e.ry + Math.sin(a) * an.reach, p = iso(wx, wy); pts.push([p.sx + G.view.ox, p.sy + G.view.oy - (e.z || 0) * FLOOR_PX]); }
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  const flash = k >= 1; ctx.fillStyle = flash ? 'rgba(255,240,220,0.35)' : 'rgba(210,30,15,' + (0.08 + k * 0.22).toFixed(2) + ')'; ctx.fill();
  ctx.strokeStyle = flash ? 'rgba(255,255,255,0.8)' : 'rgba(255,80,40,' + (0.3 + k * 0.5).toFixed(2) + ')'; ctx.lineWidth = 1.2; ctx.stroke();
}
function drawMonsterEntity(ctx, e, sx, sy, now) {
  if (FALLS['m' + e.id]) return;
  if (R3.ok && e.type === 'dragon') { drawDragon(ctx, e, sx, sy, now); return; }
  if (R3.ok) {
    let atk = -1, ak = null;
  if (e.anim) { const t = actProg(e.anim, now); if (t >= 0) { if (/^atk_/.test(e.anim.a)) { ak = e.anim.a; atk = Math.min(11, Math.floor(t * 12)); } else atk = Math.min(7, Math.floor(t * 8)); } }
    if (e.anim && e.anim.W && e.anim.reach && now - e.anim.t0 < e.anim.W + 120) drawTelegraph(ctx, e, sx, sy, now);
    if (!ak && e.blockAt && now - e.blockAt < 350) { ak = 'parry'; atk = 6; }
    const f = e.walking ? Math.floor(e.walkDist * 4) % 8 : -1;
    const hurtF = e.hitAt && now - e.hitAt < 300 && atk < 0 && MON_LOOK[e.type] ? Math.min(11, Math.floor((now - e.hitAt) / 300 * 12)) : -1;
    if (e.knockUntil && now < e.knockUntil) { const kf = FALLS['km' + e.id]; if (now < e.knockUntil - 600 && kf) { drawFall(ctx, kf, sx, sy, now); return; } ak = 'getup'; atk = Math.min(11, Math.floor((1 - (e.knockUntil - now) / 600) * 12)); }
    const s = monSprite3D(e.type, hurtF >= 0 ? -1 : f, atk, e.dir || 0, hurtF, ak, MON_LOOK[e.type] ? (e.lost || 0) : 0);
    let alpha = 1, sink = 0;
    const kb = knockOf(e, now); sx += kb.x; sy += kb.y;
    if (e.dieAt && now > e.dieAt) { const t = Math.min(1, (now - e.dieAt) / 600); alpha = 1 - t; sink = t * 8; }
    ctx.imageSmoothingEnabled = true;
    softDab(ctx, sx, sy, MON[e.type].big ? 34 : 18, '#000000', 0.35 * alpha);
    if (e.type === 'wisp') G.lights.push({ x: sx, y: sy - 46, r: 70, c: '140,255,200', a: 0.9 * alpha });
    const fall = e.fallAt ? fallAngle(now - e.fallAt) * (kb.dx >= 0 ? 1 : -1) : 0;
    if (fall) { ctx.save(); ctx.translate(sx, sy + sink); ctx.rotate(fall); pblit(ctx, s, 0, 0, alpha); ctx.restore(); }
    else pblit(ctx, s, sx, sy + sink, alpha);
    if (e.hitAt && now - e.hitAt < 110 && !fall) pblit(ctx, whiteOf(s, `wm|${e.type}|${f}|${atk}|${e.dir || 0}|${hurtF}`), sx, sy + sink, 0.7 * alpha);
    if (e.flags & 1 && Math.random() < 0.2) spawnPart('snow', sx - G.view.ox + (Math.random() - 0.5) * 24, sy - G.view.oy - Math.random() * 40);
    if (e.flags & 2) for (let k = 0; k < 3; k++) { const a = now / 180 + k * 2.1; dab(ctx, sx + Math.cos(a) * 12, sy - MON_H[e.type] * 0.55 - 4 + Math.sin(a) * 4, 2, 2, '#f0d040'); }
    return;
  }
  const def = MON[e.type];
  let atk = -1;
  if (e.anim) { const t = (now - e.anim.t0) / ACT_MS.bite; if (t >= 0 && t < 1) atk = Math.min(3, Math.floor(t * 4)); }
  const f = e.walking ? Math.floor(e.walkDist * 3) % 4 : (Math.floor(now / 450 + e.id) % 2) * ((e.type === 'slime' || e.type === 'toad') ? 1 : 0);
  const spr = monSprite(PAINT_AS[e.type] || e.type, f, atk);
  let alpha = 1, sink = 0;
  if (e.dieAt && now > e.dieAt) { const t = Math.min(1, (now - e.dieAt) / 600); alpha = 1 - t; sink = Math.round(t * 4); }
  blit(ctx, def.big ? SHADOW_BIG : SHADOW, sx, sy);
  ctx.globalAlpha = alpha;
  const ox = e.hitAt && now - e.hitAt < 200 ? -(e.face || 1) : 0;
  blit(ctx, spr, sx + ox, sy + sink, (e.face || 1) < 0);
  if (e.hitAt && now - e.hitAt < 110) { ctx.globalAlpha = 0.75 * alpha; blit(ctx, whiteOf(spr, `m|${e.type}|${f}|${atk}`), sx + ox, sy + sink, (e.face || 1) < 0); }
  ctx.globalAlpha = 1;
  if (e.flags & 1 && Math.random() < 0.2) spawnPart('snow', sx - G.view.ox + (Math.random() - 0.5) * 24, sy - G.view.oy - Math.random() * 32);
  if (e.flags & 2) for (let k = 0; k < 3; k++) { const a = now / 180 + k * 2.1; ctx.fillStyle = '#f0d040'; ctx.fillRect(Math.round(sx + Math.cos(a) * 12), Math.round(sy - spr.ay + 4 + Math.sin(a) * 4), 2, 2); }
}
function heroExtras(e, sx, sy) {
  if (e.isNpc) return;
  const L = lookFor(e.cls + ':' + e.skin + ':' + e.color, () => heroLook(e.cls, e.skin, e.color));
  if (e.cls === 'mage' && !e.downed) G.lights.push({ x: sx + (DIR_VIEW[e.dir || 0] === 'W' ? -14 : 14), y: sy - 84, r: 16, c: '150,190,255', a: 0.6 });
  if (!e.walking && Math.random() > 0.06) return;
  switch (L.extra) {
    case 'ember': spawnPart('ember', sx - G.view.ox + (Math.random() - 0.5) * 20, sy - G.view.oy - 16 - Math.random() * 30); break;
    case 'halo': spawnPart('sparkle', sx - G.view.ox + (Math.random() - 0.5) * 24, sy - G.view.oy - 24 - Math.random() * 40, { color: 'rgba(250,225,140,A)' }); break;
    case 'frost': spawnPart('snow', sx - G.view.ox + (Math.random() - 0.5) * 24, sy - G.view.oy - 60); break;
    case 'leaf': spawnPart('leaf', sx - G.view.ox + (Math.random() - 0.5) * 20, sy - G.view.oy - 60, { color: Math.random() < 0.5 ? '#7cc24a' : '#c9a24a' }); break;
  }
}
function drawAuras(ctx, e, sx2, sy2, now) {
  const l0 = G.lights.length; ctx.save(); ctx.scale(ART, ART); SPAWN_MUL = ART;
  drawAuras1(ctx, e, sx2 / ART, sy2 / ART, now);
  ctx.restore(); SPAWN_MUL = 1;
  for (let i = l0; i < G.lights.length; i++) { G.lights[i].x *= ART; G.lights[i].y *= ART; }
}
function drawAuras1(ctx, e, sx, sy, now) {
  const fl = e.flags || 0;
  if (fl & BUFF_BITS.wall) {
    const a = 0.25 + Math.sin(now / 200) * 0.08;
    ctx.strokeStyle = `rgba(240,210,110,${a + 0.3})`; ctx.fillStyle = `rgba(240,210,110,${a * 0.4})`; ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3 + now / 1000; ctx.lineTo(sx + Math.cos(an) * 13, sy - 18 + Math.sin(an) * 18); } ctx.closePath(); ctx.fill(); ctx.stroke();
    G.lights.push({ x: sx, y: sy - 14, r: 26, c: '240,210,110', a: 0.5 });
  }
  if (fl & BUFF_BITS.agile) for (let k = 0; k < 3; k++) { const an = now / 150 + k * 2.1; ctx.strokeStyle = 'rgba(120,220,170,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx, sy - 1 - k * 2, 8, 3, 0, an, an + 1.6); ctx.stroke(); }
  if (fl & BUFF_BITS.warcry) ring(ctx, sx, sy, 9, `rgba(230,110,90,${0.4 + Math.sin(now / 120) * 0.2})`, 1);
  if (fl & BUFF_BITS.bless && Math.random() < 0.04) spawnPart('sparkle', sx - G.view.ox / ART, sy - G.view.oy / ART - Math.random() * 36, { color: 'rgba(250,225,140,A)' });
  if (e.isNpc || e.downed) return;
  const L = lookFor(e.cls + ':' + e.skin + ':' + e.color, () => heroLook(e.cls, e.skin, e.color));
  if (L.extra === 'orbit') for (let k = 0; k < 3; k++) { const an = now / 500 + k * 2.1, x = Math.round(sx + Math.cos(an) * 10), y = Math.round(sy - 20 + Math.sin(an) * 4); ctx.fillStyle = '#d8ecff'; ctx.fillRect(x, y, 1, 1); G.lights.push({ x, y, r: 6, c: '200,225,255', a: 0.6 }); }
  if (L.extra === 'halo') { ctx.strokeStyle = 'rgba(250,225,140,0.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx, sy - 44, 5, 1.6, 0, 0, Math.PI * 2); ctx.stroke(); G.lights.push({ x: sx, y: sy - 44, r: 12, c: '250,225,140', a: 0.6 }); }
}

// ---------- objetos ----------
// ---------- objetos ----------
const TREE_TINT = { [Z.FOREST]: 3, [Z.SWAMP]: 3, [Z.WILD]: 1 };
const SWAY = { [O.WHEAT]: 0.08, [O.WHEATSPROUT]: 0.05, [O.TREE]: 0.035, [O.PINE]: 0.025, [O.BUSH]: 0.03, [O.TALLGRASS]: 0.09, [O.REEDS]: 0.08, [O.OAK]: 0.025, [O.BIRCH]: 0.045, [O.WILLOW]: 0.05, [O.FERN]: 0.07, [O.HERB]: 0.06, [O.BERRY]: 0.03 };
const CASTS = new Set([O.OAK, O.BIRCH, O.WILLOW, O.BOULDER, O.BERRY, O.TREE, O.PINE, O.DEADTREE, O.BUSH, O.ROCK, O.WALL, O.LOWWALL, O.STATUE, O.LAMP, O.BANNER, O.TENT, O.WELL, O.STALL, O.HAY, O.BARREL, O.CRATE, O.CART, O.GRAVE, O.DUMMY, O.WEAPONRACK, O.STUMP, O.TORCH, O.BRAZIER, O.FENCE, O.GATE]);
function objSprite(o, x, y) {
  const h = hash2(x, y, 17), v = Math.floor(h * 3), i = y * MAP_W + x, z = WORLD.zone[i];
  switch (o) {
    case O.STOOL: return stoolSprite();
    case O.FRUITCRATE: return natureSprite('fcrate', 0) || smallSprite('crate');
    case O.NOTICEBOARD: return natureSprite('board', 0) || smallSprite('crate');
    case O.WATERWHEEL: return natureSprite('wheel', Math.floor(performance.now() / 260) % 4) || smallSprite('crate');
    case O.VITRINE: return typeof vitrineSprite === 'function' ? vitrineSprite(i) : smallSprite('crate');
    case O.STAGEFLOOR: return null;
    case O.GUILLOTINE: if (x !== STAGE.x) return natureSprite('guilp', 0); return natureSprite('guil', typeof guilState === 'function' ? guilState() : 0) || smallSprite('cart');
    case O.OAK: return natureSprite('oak', v & 1) || treeSprite(v, 1, 3);
    case O.BIRCH: return natureSprite('birch', v & 1) || treeSprite(v, 1, 1);
    case O.WILLOW: return natureSprite('willow', v & 1) || treeSprite(v, 1, 0);
    case O.FERN: return natureSprite('fern', v % 3) || grassSprite(v, 1, 0);
    case O.ROOTS: return natureSprite('roots', v & 1) || smallSprite('stump');
    case O.SHROOMS: return natureSprite('shrooms', v & 1) || smallSprite('mushroom', 0);
    case O.BERRY: return natureSprite('berry', v & 1) || bushSprite(2);
    case O.HERB: return natureSprite('herb', v & 1) || grassSprite(v, 1, 0);
    case O.BOULDER: return natureSprite('boulder', v % 3) || rockSprite(1, 1);
    case O.TREE: return treeSprite(v, 1, h > 0.88 && z !== Z.FOREST ? 2 : (TREE_TINT[z] || 0));
    case O.PINE: return pineSprite(v);
    case O.ROCK: return rockSprite(v, z === Z.FOREST || z === Z.SWAMP ? 1 : 0);
    case O.BUSH: return bushSprite(v);
    case O.WHEAT: return wheatSprite(v % 3, 1);
    case O.WHEATSPROUT: return wheatSprite(v % 3, 0);
    case O.TALLGRASS: return grassSprite(v, 1, z === Z.BONES || z === Z.ORCS || WORLD.ground[i] === T.DEAD ? 1 : 0);
    case O.MUSHROOM: return smallSprite('mushroom', z === Z.SWAMP || (z === Z.FOREST && h < 0.3) ? 2 + (v & 1) : v & 1);
    case O.REEDS: return smallSprite('reeds', v);
    case O.STUMP: return smallSprite('stump');
    case O.LOG: return smallSprite('log', v & 1);
    case O.DEADTREE: return smallSprite('deadtree', v);
    case O.GRAVE: return smallSprite('grave', v & 1);
    case O.TENT: return smallSprite('tent');
    case O.BARREL: return smallSprite('barrel');
    case O.CRATE: return smallSprite('crate');
    case O.HAY: return smallSprite('hay');
    case O.BENCH: return smallSprite('bench');
    case O.WELL: return smallSprite('well');
    case O.STALL: return smallSprite('stall');
    case O.SPIKES: return smallSprite('spikes');
    case O.RUBBLEBIG: return smallSprite('rubblebig', v);
    case O.DUMMY: return smallSprite('dummy');
    case O.STATUE: return smallSprite('statue');
    case O.ANVIL: return smallSprite('anvil');
    case O.CAVE: return smallSprite('cave');
    case O.HOARD: return smallSprite('hoard');
    case O.ARMORPILE: return smallSprite('armorpile', v & 1);
    case O.RUINTOWER: return smallSprite('ruintower');
    case O.WEAPONRACK: return smallSprite('weaponrack');
    case O.CART: return smallSprite('cart');
    case O.TABLE: return smallSprite('table');
    case O.CAMPFIRE: return animSprite('campfire');
    case O.TORCH: return animSprite('torch');
    case O.BRAZIER: return animSprite('brazier');
    case O.LAMP: return animSprite('lamp');
    case O.BANNER: return animSprite('banner');
    case O.FOUNTAIN: return animSprite('fountain');
    case O.FENCE: { const isF = j => WORLD.obj[j] === O.FENCE || WORLD.obj[j] === O.TORCH; return fenceSprite(isF(i - 1) || isF(i + 1)); }
    case O.WALL: { const wd = WORLD.wdir[i], ax = wd === 3 || wd === 4, isT = j => WORLD.obj[j] === O.PART || WORLD.obj[j] === O.TOWER, e = (isT(ax ? i - 1 : i - MAP_W) ? 1 : 0) | (isT(ax ? i + 1 : i + MAP_W) ? 2 : 0); return wallSprite(v, false, h < 0.35, wd, e); }
    case O.LOWWALL: return wallSprite(v, true, false);
    case O.GATE: { const gi = WORLD.gateId[i]; if (gi < 0) return gateSprite(true); const gq = WORLD.gates[gi]; return (gq.vert ? y === gq.y : x === gq.x1) ? gateHouseSprite(gi) : null; }
    case O.STAIRS: return stairsSprite(WORLD.stair[i], WORLD.stairK[i]);
  }
  return null;
}
function drawSway(ctx, s, x, y, k, alpha) {
  if (!k) { pblit(ctx, s, x, y, alpha); return; }
  ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, k, 1, 0, 0); pblit(ctx, s, 0, 0, alpha); ctx.restore();
}
// partes animadas ao vivo (fogo, bandeira, água)
function liveParts(ctx, o, sx, sy, x, y, now) {
  switch (o) {
    case O.TORCH: liveFlame(ctx, sx, sy - 36, 0.5, now, x * 3 + y); G.lights.push({ x: sx, y: sy - 40, r: 42, c: '255,170,80', a: 0.95, flick: 1 }); if (Math.random() < 0.04) spawnPart('ember', sx - G.view.ox, sy - G.view.oy - 60); break;
    case O.BRAZIER: liveFlame(ctx, sx, sy - 21, 0.6, now, x + y * 5); G.lights.push({ x: sx, y: sy - 28, r: 50, c: '255,160,70', a: 1, flick: 1 }); if (Math.random() < 0.08) spawnPart('ember', sx - G.view.ox, sy - G.view.oy - 50); break;
    case O.CAMPFIRE: liveFlame(ctx, sx, sy - 4, 0.9, now, x * 7 + y); G.lights.push({ x: sx, y: sy - 16, r: 56, c: '255,150,60', a: 1, flick: 1 }); if (Math.random() < 0.08) spawnPart('smoke', sx - G.view.ox, sy - G.view.oy - 30); if (Math.random() < 0.1) spawnPart('ember', sx - G.view.ox, sy - G.view.oy - 16); break;
    case O.LAMP: { const f = 0.85 + Math.sin(now / 90 + x) * 0.08; softDab(ctx, sx + 14, sy - 66, 10 * f, '#ffd890', 0.55); G.lights.push({ x: sx + 14, y: sy - 66, r: 50, c: '255,215,140', a: 1, flick: 1 }); break; }
    case O.BANNER: {
      const top = sy - 94, left = sx + 2, wv = now / 420 + x * 0.7;
      ctx.beginPath(); ctx.moveTo(left, top);
      for (let k = 0; k <= 8; k++) { const t = k / 8; ctx.lineTo(left + t * 28, top + Math.sin(wv + t * 3) * 2.5 * t); }
      for (let k = 8; k >= 0; k--) { const t = k / 8; ctx.lineTo(left + t * 28 - 2 * t, top + 46 + Math.sin(wv + t * 3 + 1) * 3 * t - (t > 0.5 ? (t - 0.5) * 10 : 0)); }
      ctx.closePath(); ctx.fillStyle = lgrad(ctx, left, 0, left + 28, 0, [[0, '#1e3058'], [0.5, '#2c447a'], [1, '#1a284a']]); ctx.fill();
      dab(ctx, left + 13, top + 20 + Math.sin(wv + 1.5) * 1.5, 5, 5, '#c9a24a'); dab(ctx, left + 13, top + 20 + Math.sin(wv + 1.5) * 1.5, 2.4, 2.4, '#1e3058');
      break;
    }
    case O.FOUNTAIN: {
      for (let k = 0; k < 18; k++) {
        const t = ((now / 1100) + k / 18) % 1, a = k / 18 * Math.PI * 2;
        const px_ = sx + Math.cos(a) * 26 * t, py = sy - 46 + t * 34 - Math.sin(t * Math.PI) * 14 + Math.sin(a) * 9 * t;
        dab(ctx, px_, py, 1.4, 1.4, `rgba(210,235,255,${0.85 - t * 0.5})`);
      }
      softDab(ctx, sx, sy - 44, 6, '#e8f6ff', 0.6);
      break;
    }
  }
}
function drawWaterfallLive(ctx, sx, sy, H, now) {
  const top = sy - H + 4, bot = sy + 16, t = now / 1000;
  // cortina de água com bordas irregulares (mais estreita no alto)
  ctx.save();
  ctx.beginPath();
  for (let k = 0; k <= 10; k++) { const f = k / 10, y = top + (bot - top) * f, w = 18 + f * 16 + Math.sin(t * 3 + f * 9) * 1.5; ctx.lineTo(sx - 4 - w + Math.sin(f * 5 + t) * 2, y); }
  for (let k = 10; k >= 0; k--) { const f = k / 10, y = top + (bot - top) * f, w = 18 + f * 16 + Math.sin(t * 3 + f * 9 + 2) * 1.5; ctx.lineTo(sx - 4 + w + Math.sin(f * 4 - t) * 2, y); }
  ctx.closePath(); ctx.clip();
  ctx.fillStyle = lgrad(ctx, 0, top, 0, bot, [[0, 'rgba(170,215,240,0.95)'], [0.5, 'rgba(110,170,215,0.92)'], [1, 'rgba(225,242,255,0.97)']]);
  ctx.fillRect(sx - 60, top - 4, 120, bot - top + 8);
  for (let k = 0; k < 34; k++) {
    const xx = sx - 4 + (hash2(k, 3, 5) - 0.5) * 66, sp = 0.7 + hash2(k, 4, 5) * 0.6, ph = (t * 1.4 * sp + hash2(k, 5, 5)) % 1;
    const y1 = top + ph * (bot - top + 30) - 24, y2 = y1 + 10 + hash2(k, 6, 5) * 16;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + hash2(k, 7, 5) * 0.45) + ')'; ctx.lineWidth = 0.8 + hash2(k, 8, 5) * 1.8;
    ctx.beginPath(); ctx.moveTo(xx, y1); ctx.lineTo(xx + Math.sin(ph * 3) * 1.5, y2); ctx.stroke();
  }
  ctx.restore();
  // espuma e névoa na base
  for (let k = 0; k < 10; k++) { const f = (t * 0.8 + k / 10) % 1; softDab(ctx, sx - 4 + (hash2(k, 9, 3) - 0.5) * 70, bot - 2 - f * 10, 8 + f * 12, '#f4fbff', 0.6 * (1 - f)); }
  softDab(ctx, sx - 4, top + 2, 14, '#e8f6ff', 0.35);
}

// ---------- sombras projetadas ----------
function castShadow(s, x, y, sh, k) {
  const sil = silhouette(s);
  shadowX.setTransform(k, 0, -sh.lx * k, -sh.ly * k, x * k, y * k);
  shadowX.drawImage(sil.c, -sil.ax, -sil.ay, sil.w, sil.h);
}

// ---------- atmosfera por região ----------
const ZATM = {
  [Z.VILLAGE]: { tint: [255, 196, 120], ta: 0.2, fog: 0.05, fogC: [240, 200, 150], rays: 0.35, crows: 0, embers: 0, dust: 0, snow: 0, rainBias: 0 },
  [Z.FIELDS]: { tint: [255, 230, 170], ta: 0.08, fog: 0.04, fogC: [230, 235, 225], rays: 0.2, crows: 0, embers: 0, dust: 0, snow: 0, rainBias: 0 },
  [Z.FOREST]: { tint: [120, 170, 160], ta: 0.16, fog: 0.16, fogC: [170, 200, 185], rays: 1, crows: 0, embers: 0, dust: 0, snow: 0, rainBias: 0 },
  [Z.SWAMP]: { tint: [130, 160, 100], ta: 0.22, fog: 0.42, fogC: [140, 165, 135], rays: 0, crows: 0.2, embers: 0, dust: 0, snow: 0, rainBias: 0.45 },
  [Z.BONES]: { tint: [140, 140, 155], ta: 0.3, fog: 0.3, fogC: [160, 160, 170], rays: 0, crows: 1, embers: 0, dust: 1, snow: 0, rainBias: 0.1 },
  [Z.ORCS]: { tint: [235, 150, 80], ta: 0.18, fog: 0.16, fogC: [150, 115, 90], rays: 0, crows: 0.3, embers: 1, dust: 0.5, snow: 0, rainBias: 0 },
  [Z.WILD]: { tint: [170, 200, 235], ta: 0.14, fog: 0.14, fogC: [215, 225, 235], rays: 0.2, crows: 0.2, embers: 0, dust: 0, snow: 0, rainBias: 0.1 },
};
const ATM = { tint: [255, 214, 150], ta: 0.1, fog: 0, fogC: [230, 220, 200], rays: 0, crows: 0, embers: 0, dust: 0, snow: 0, rain: 0 };
function updateAtmosphere(px_, py, dt) {
  const z = zoneAt(px_, py), tgt = ZATM[z] || ZATM[Z.FIELDS];
  const nearMountain = dist(px_, py, MOUNTAIN.x, MOUNTAIN.y) < MOUNTAIN.r + 10 ? 1 : 0;
  const w = weatherNow();
  const k = Math.min(1, dt * 0.0012);
  for (const key of ['ta', 'fog', 'rays', 'crows', 'embers', 'dust']) ATM[key] += (tgt[key] - ATM[key]) * k;
  for (let i = 0; i < 3; i++) { ATM.tint[i] += (tgt.tint[i] - ATM.tint[i]) * k; ATM.fogC[i] += (tgt.fogC[i] - ATM.fogC[i]) * k; }
  const sk = typeof seasonNow === 'function' ? seasonNow().k : 'spring', wint = sk === 'winter';
  ATM.snow += ((nearMountain ? 1 : wint ? 0.35 + 0.65 * w.rain : 0) - ATM.snow) * k;
  ATM.rain += (clamp(w.rain + tgt.rainBias * (w.rain > 0 ? 1 : 0.35), 0, 1) * (nearMountain ? 0.3 : wint ? 0 : 1) - ATM.rain) * k;
  ATM.leaves = (ATM.leaves || 0) + ((sk === 'autumn' ? 0.6 + 0.4 * w.wind : 0) - (ATM.leaves || 0)) * k;
  ATM.frost = (ATM.frost || 0) + ((wint ? 1 : 0) - (ATM.frost || 0)) * k;
  ATM.wind = w.wind;
}
const FOG_TEX = (() => {
  const S = 256, c = document.createElement('canvas'); c.width = S; c.height = S;
  const x = c.getContext('2d'), R = rng(99);
  for (let i = 0; i < 70; i++) { const px_ = R() * S, py = R() * S, r = 20 + R() * 60; for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) softDab(x, px_ + ox, py + oy, r, '#ffffff', 0.18 + R() * 0.2); }
  return c;
})();
let fogPat = null;
function drawAtmosphere(ctx, W, H, now, day, cam) {
  const t = now / 1000;
  // névoa (duas camadas com movimento lento, presa ao mundo)
  if (ATM.fog > 0.01) {
    if (!fogPat) fogPat = ctx.createPattern(FOG_TEX, 'repeat');
    const c = iso(cam.x, cam.y);
    ctx.save();
    for (let l = 0; l < 2; l++) {
      const sp = l ? 9 : 5, sc = l ? 1.6 : 2.4;
      ctx.setTransform(sc, 0, 0, sc * 0.7, -((c.sx * SCALE * (l ? 0.9 : 0.75) + t * sp * 6) % (256 * sc)), -((c.sy * SCALE * (l ? 0.9 : 0.75) + t * sp) % (256 * sc * 0.7)));
      ctx.globalAlpha = ATM.fog * (l ? 0.7 : 0.9);
      ctx.fillStyle = fogPat; ctx.fillRect(0, 0, W / sc + 512, H / (sc * 0.7) + 512);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(${ATM.fogC.map(Math.round).join(',')},${ATM.fog * 0.6})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  // raios de sol entre as árvores (de dia)
  if (ATM.rays > 0.05 && !day.night) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {
      const x = ((k * 397 + t * 8) % (W + 400)) - 200, w2 = 60 + hash2(k, 1, 2) * 90, a = ATM.rays * (0.05 + Math.sin(t * 0.4 + k) * 0.03) * (1 - day.dark);
      if (a <= 0) continue;
      const g = ctx.createLinearGradient(x, 0, x + H * 0.45, H); g.addColorStop(0, `rgba(255,240,190,${a})`); g.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w2, 0); ctx.lineTo(x + w2 + H * 0.45, H); ctx.lineTo(x + H * 0.45, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // chuva
  if (ATM.rain > 0.02) {
    const n = Math.floor(320 * ATM.rain), wx = 2.2 + ATM.wind * 2;
    ctx.strokeStyle = `rgba(190,205,225,${0.25 + ATM.rain * 0.3})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const sp = 0.8 + hash2(k, 1, 7) * 0.5, x = (hash2(k, 2, 7) * (W + 200) + t * 120 * wx * sp) % (W + 200) - 100, y = (hash2(k, 3, 7) * (H + 100) + t * 900 * sp) % (H + 100) - 50;
      ctx.moveTo(x, y); ctx.lineTo(x - wx * 5, y - 18 * sp);
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(210,225,240,${0.3 * ATM.rain})`;
    for (let k = 0; k < n / 4; k++) { const ph = (t * 3 + hash2(k, 4, 8)) % 1, x = hash2(k, 5, 8 + Math.floor(t * 3 + hash2(k, 4, 8))) * W, y = hash2(k, 6, 8 + Math.floor(t * 3 + hash2(k, 4, 8))) * H; ctx.beginPath(); ctx.ellipse(x, y, 2 + ph * 5, (2 + ph * 5) * 0.4, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = `rgba(20,28,40,${0.18 * ATM.rain})`; ctx.fillRect(0, 0, W, H);
    if (ATM.rain > 0.75 && (Math.floor(t / 7) % 5 === 0) && (t % 7) < 0.15) { ctx.fillStyle = 'rgba(230,235,255,0.35)'; ctx.fillRect(0, 0, W, H); }
  }
  // neve perto da montanha
  if (ATM.leaves > 0.02) {   // outono: folhas laranja caindo e rodopiando
    for (let k = 0; k < 26 * ATM.leaves; k++) { const sp = 0.4 + hash2(k, 4, 9) * 0.6, x = (hash2(k, 5, 9) * W + t * 40 * (0.3 + ATM.wind) * sp + Math.sin(t * 0.8 + k) * 22) % W, y = (hash2(k, 6, 9) * H + t * 22 * sp) % H, a = t * (1 + sp) + k;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1, Math.abs(Math.cos(a * 1.3)) * 0.8 + 0.2); ctx.fillStyle = ['#c8642a', '#d89a3a', '#a8402a', '#e0b048'][k % 4]; ctx.globalAlpha = 0.75 * ATM.leaves; ctx.beginPath(); ctx.ellipse(0, 0, 3 + sp * 2, 1.6 + sp, 0, 0, 7); ctx.fill(); ctx.restore(); }
  }
  if (ATM.snow > 0.02) {
    ctx.fillStyle = `rgba(245,250,255,${0.8 * ATM.snow})`;
    for (let k = 0; k < 160 * ATM.snow; k++) { const sp = 0.5 + hash2(k, 1, 9) * 0.7, x = (hash2(k, 2, 9) * W + t * 30 * ATM.wind * sp + Math.sin(t + k) * 12) % W, y = (hash2(k, 3, 9) * H + t * 50 * sp) % H, r = 1 + sp * 1.6; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  }
  // poeira (colinas)
  if (ATM.dust > 0.05) {
    ctx.fillStyle = `rgba(200,190,160,${0.35 * ATM.dust})`;
    for (let k = 0; k < 60; k++) { const x = (hash2(k, 2, 11) * W + t * 60 * (0.5 + hash2(k, 1, 11))) % W, y = (hash2(k, 3, 11) * H + Math.sin(t + k) * 20) % H; ctx.fillRect(x, y, 2, 1); }
  }
  // brasas (acampamento orc)
  if (ATM.embers > 0.05) {
    for (let k = 0; k < 45; k++) { const ph = (t * (0.08 + hash2(k, 1, 12) * 0.08) + hash2(k, 2, 12)) % 1, x = hash2(k, 3, 12) * W + Math.sin(t * 2 + k) * 14, y = H * (1 - ph); ctx.fillStyle = `rgba(255,${140 + (k % 5) * 20},60,${ATM.embers * Math.sin(ph * Math.PI) * 0.8})`; ctx.fillRect(x, y, 2, 2); }
  }
  // corvos
  if (ATM.crows > 0.1) {
    ctx.strokeStyle = `rgba(20,18,20,${0.8 * ATM.crows})`; ctx.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.035 + hash2(k, 1, 13)) % 1, x = -60 + ph * (W + 120), y = H * (0.15 + hash2(k, 2, 13) * 0.35) + Math.sin(t * 0.8 + k) * 20, f = Math.sin(t * 9 + k * 2) * 5;
      ctx.beginPath(); ctx.moveTo(x - 9, y - f); ctx.quadraticCurveTo(x - 4, y - 3, x, y); ctx.quadraticCurveTo(x + 4, y - 3, x + 9, y - f); ctx.stroke();
    }
  }
}

// ---------- cena completa ----------
function renderWorld(ctx, now, cam, W, H, dpr) {
  const dt = Math.min(50, now - lastFrameT); lastFrameT = now;
  const k = dpr * SCALE, vw = W / SCALE, vh = H / SCALE;
  const c = iso(cam.x, cam.y);
  let shx = 0, shy = 0;
  if (G.shake > 0.2) { shx = (Math.random() - 0.5) * G.shake; shy = (Math.random() - 0.5) * G.shake; G.shake *= 0.86; }
  if (holeC.width !== Math.round(W * dpr) || holeC.height !== Math.round(H * dpr)) { holeC.width = Math.round(W * dpr); holeC.height = Math.round(H * dpr); }
  const ox = vw / 2 - c.sx + shx, oy = vh / 2 - c.sy + 30 + (cam.z || 0) * FLOOR_PX + shy;
  G.view = { ox, oy };
  G.lights = [];
  const day = dayInfo(), sh = sunShadow(day);
  updateAtmosphere(cam.x, cam.y, dt);

  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const corners = [unIso(-ox, -oy - 140), unIso(vw - ox, -oy - 140), unIso(-ox, vh - oy + 260), unIso(vw - ox, vh - oy + 260)];
  const minX = Math.max(0, Math.floor(Math.min(...corners.map(q => q.x))) - 2), maxX = Math.min(MAP_W - 1, Math.ceil(Math.max(...corners.map(q => q.x))) + 2);
  const minY = Math.max(0, Math.floor(Math.min(...corners.map(q => q.y))) - 2), maxY = Math.min(MAP_H - 1, Math.ceil(Math.max(...corners.map(q => q.y))) + 2);

  // 1) água + detalhes
  drawWater(ctx, { x0: 0, y0: 0, x1: vw, y1: vh }, now, day);
  ctx.save(); ctx.translate(ox, oy); drawWaterDetail(ctx, minX, maxX, minY, maxY, now, day); ctx.restore();
  // 2) chão pintado
  let budget = G.started ? 2 : 6;
  const cx0 = Math.floor(-ox / CHUNK), cx1 = Math.floor((vw - ox) / CHUNK), cy0 = Math.floor(-oy / CHUNK), cy1 = Math.floor((vh - oy) / CHUNK);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    const key = chunkKey(cx, cy);
    let ch = chunks.get(key);
    if (!ch) { if (budget-- <= 0) continue; ch = buildChunk(cx, cy); chunks.set(key, ch); }
    ctx.drawImage(ch, cx * CHUNK + ox - 0.3, cy * CHUNK + oy - 0.3, CHUNK + 0.6, CHUNK + 0.6);
  }
  if (typeof drawWeaverFlora === 'function' && G.started) { weaverFloraTick(now); drawWeaverFlora(ctx, ox, oy, now); }
  if ((ATM.frost || 0) > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(215,224,238,' + (0.55 * ATM.frost).toFixed(3) + ')'; ctx.fillRect(-20, -20, vw + 40, vh + 40); ctx.restore(); }
  if (budget > 0) { outer: for (let cy = cy0 - 1; cy <= cy1 + 1; cy++) for (let cx = cx0 - 1; cx <= cx1 + 1; cx++) { const key = chunkKey(cx, cy); if (!chunks.has(key)) { chunks.set(key, buildChunk(cx, cy)); break outer; } } }

  // 3) marcadores
  const me = G.me;
  const hideUpper = me && me.z < 0.5 && covered(me.rx, me.ry);
  const myZ = me ? (me.z || 0) * FLOOR_PX : 0;
  if (G.hover && inBounds(G.hover.x, G.hover.y)) { const p = iso(G.hover.x, G.hover.y); diamondOutline(ctx, p.sx + ox, p.sy + oy - myZ, 'rgba(255,240,200,0.35)'); }
  const tgt = G.target && G.monsters[G.target];
  if (tgt) { const p = iso(tgt.rx, tgt.ry); targetRing(ctx, p.sx + ox, p.sy + oy, now);
    const zf = { head: 0.86, torso: 0.55, legs: 0.2 }[G.aim || 'torso'], hy = p.sy + oy - (tgt.z || 0) * FLOOR_PX - (MON_H[tgt.type] || 60) * zf, hx = p.sx + ox, c = { head: '#ff5a3a', torso: '#ffd060', legs: '#6ab8ff' }[G.aim || 'torso'];
    ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx - 16, hy); ctx.lineTo(hx - 9, hy); ctx.moveTo(hx + 9, hy); ctx.lineTo(hx + 16, hy); ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy, 4 + Math.sin(now / 200), 0, 7); ctx.stroke(); }
  if (G.pathGoal) { const p = iso(G.pathGoal.x, G.pathGoal.y); diamondOutline(ctx, p.sx + ox, p.sy + oy - myZ, `rgba(240,200,80,${0.45 + Math.sin(now / 200) * 0.3})`); }
  for (const id in G.players) { const e = G.players[id]; if (e.cast && e.cast.end > now && e.visible) { const p = iso(e.rx, e.ry); drawMagicCircle(ctx, p.sx + ox, p.sy + oy - (e.z || 0) * FLOOR_PX, now, e.cast.el, (now - e.cast.start) / (e.cast.end - e.cast.start)); } }

  // 3b) no chão: sangue, aviso do sopro do dragão, fogo
  {
    const P = (x, y, z) => { const p = iso(x, y); return [p.sx + ox, p.sy + oy - (z || 0) * FLOOR_PX]; };
    G.blood = G.blood.filter(b => b.until > now);
    for (const b of G.blood) {
      const [bx, by] = P(b.x, b.y, b.z); if (bx < -40 || bx > vw + 40 || by < -40 || by > vh + 40) continue;
      const life = 1 - (now - b.t0) / (b.until - b.t0), a = Math.min(1, life * 4) * 0.75, R = b.r * 24;
      let s = b.seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      ctx.fillStyle = 'rgba(' + (70 + rnd() * 30 | 0) + ',4,4,' + a.toFixed(2) + ')';
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(bx + (rnd() - 0.5) * R, by + (rnd() - 0.5) * R * 0.5, R * (0.25 + rnd() * 0.35), R * (0.12 + rnd() * 0.16), 0, 0, 7); ctx.fill(); }
    }
    G.teles = G.teles.filter(t => now - t.t0 < t.ms + 700);
    for (const t of G.teles) {
      if (t.k === 'strip' || t.k === 'ring') {   // faixa do rasante e círculo do mergulho/pouso do dragão
        const k = Math.min(1, (now - t.t0) / t.ms); if (k >= 1) continue; ctx.beginPath();
        if (t.k === 'ring') for (let q = 0; q <= 28; q++) { const a = q / 28 * Math.PI * 2, [x, y] = P(t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r, t.z); q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        else { const c = Math.cos(t.a), s = Math.sin(t.a), nx = -s * t.w / 2, ny = c * t.w / 2; [[t.x + nx, t.y + ny], [t.x + c * t.len + nx, t.y + s * t.len + ny], [t.x + c * t.len - nx, t.y + s * t.len - ny], [t.x - nx, t.y - ny]].forEach(([wx, wy], i) => { const [x, y] = P(wx, wy, t.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); }
        ctx.closePath(); ctx.fillStyle = 'rgba(200,30,10,' + (0.08 + k * 0.2 + Math.sin(now / 60) * 0.03).toFixed(2) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(255,90,40,' + (0.3 + k * 0.4).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.stroke(); continue;
      }
      const k = (now - t.t0) / t.ms, pts = [P(t.x, t.y, t.z)];
      for (let q = -6; q <= 6; q++) { const a = t.a + t.w * q / 6; pts.push(P(t.x + Math.cos(a) * t.len, t.y + Math.sin(a) * t.len, t.z)); }
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
      if (k < 1) { ctx.fillStyle = 'rgba(200,30,10,' + (0.12 + k * 0.25 + Math.sin(now / 60) * 0.04).toFixed(2) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(255,90,40,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }
      else if (!t.nf) { const f = (now - t.t0 - t.ms) / 700, [x0, y0] = pts[0], [x1, y1] = pts[7], gr = ctx.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(255,250,200,' + (0.95 * (1 - f)).toFixed(2) + ')'); gr.addColorStop(0.35, 'rgba(255,170,40,' + (0.85 * (1 - f)).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(200,40,10,0)'); ctx.fillStyle = gr; ctx.fill(); G.lights.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: 200, c: '255,140,40', a: 1 - f }); if (Math.random() < 0.6) spawnPart('ember', x0 + (x1 - x0) * Math.random() - G.view.ox, y0 + (y1 - y0) * Math.random() - G.view.oy); }
    }
    if (typeof drawZones === 'function') drawZones(ctx, now, P);
    if (typeof drawBowGround === 'function') drawBowGround(ctx, now, P);
    G.fires = G.fires.filter(f => f.until > now);
    for (const f of G.fires) { if (now < f.t0) continue; const [fx, fy] = P(f.x, f.y, f.z), fade = Math.min(1, (f.until - now) / 800); ctx.globalAlpha = fade; liveFlame(ctx, fx, fy, 1.1 * f.r, now, f.x * 13 + f.y); ctx.globalAlpha = 1; G.lights.push({ x: fx, y: fy - 14, r: 60, c: '255,150,60', a: fade, flick: 1 }); if (Math.random() < 0.05) spawnPart('smoke', fx - G.view.ox, fy - G.view.oy - 20); }
  }
  // 3c) objetos arremessados
  G.throws = (G.throws || []).filter(t => now - t.t0 < t.ms + 50);
  for (const t of G.throws) {
    const k = Math.min(1, (now - t.t0) / t.ms), wx = t.fx + (t.tx - t.fx) * k, wy = t.fy + (t.ty - t.fy) * k, p = iso(wx, wy), lift = Math.sin(Math.PI * k) * (40 + Math.hypot(t.tx - t.fx, t.ty - t.fy) * 6) + 40 * (1 - k);
    const s = objSprite(t.o); if (!s) continue;
    softDab(ctx, p.sx + ox, p.sy + oy, 9, '#000000', 0.3);
    ctx.save(); ctx.translate(p.sx + ox, p.sy + oy - lift); ctx.rotate(k * Math.PI * 2.5); pblit(ctx, s, 0, s.h * 0.35); ctx.restore();
    if (k >= 1 && !t.hit) { t.hit = 1; for (let q = 0; q < 14; q++) spawnPart(t.o === O.ROCK ? 'dust' : 'spark', p.sx + (Math.random() - 0.5) * 16, p.sy - Math.random() * 10, t.o === O.ROCK ? undefined : { color: 'rgba(150,100,60,A)' }); if (t.by === G.myId || dist(t.tx, t.ty, G.me.x, G.me.y) < 1.5) G.shake = Math.max(G.shake, 3); }
  }
  // 4) coleta dos itens
  const items = [], upper = [], sky = [], visTrees = [], visFlowers = [], visGrass = [];
  for (const g of (G.started && G.gibs) || []) { if (now > g.until) continue; const k = Math.min(1, (now - g.t0) / 480), wx = g.x + g.dx * g.d * k, wy = g.y + g.dy * g.d * k, p = iso(wx, wy); items.push({ d: wx + wy - 0.2, k: 0, gib: g, sx: p.sx + ox, sy: p.sy + oy - (g.z || 0) * FLOOR_PX - Math.sin(Math.PI * k) * 34, gk: k }); }
  for (const c of (G.started && G.corpses) || []) { const p = iso(c.x, c.y); const it = { d: c.x + c.y - 0.35, k: 0, corpse: c, sx: p.sx + ox, sy: p.sy + oy - (c.z || 0) * FLOOR_PX }; (c.z ? upper : items).push(it); }
  if (typeof estSignItems === 'function') estSignItems(items, ox, oy);
  for (const c of (G.started && G.chests) || []) { const p = iso(c.x, c.y); items.push({ d: c.x + c.y, k: 0, chest: c, sx: p.sx + ox, sy: p.sy + oy }); }
  if (G.falls && G.falls.length) { G.falls = G.falls.filter(f => now - f.t0 < (f.tree ? 2800 : 450)); for (const f of G.falls) { const p = iso(f.x, f.y); items.push({ d: f.x + f.y + (f.tree ? 0.6 : 0.01), k: 9, f, sx: p.sx + ox, sy: p.sy + oy }); } }
  for (const id in (G.started && G.coins) || {}) { const c = G.coins[id], p = iso(c.x, c.y); items.push({ d: c.x + c.y - 0.05, k: 8, coin: c, sx: p.sx + ox, sy: p.sy + oy }); }
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const i = y * MAP_W + x, o = WORLD.obj[i], g = WORLD.ground[i];
    const wx = (x - y) * HTW, wy = (x + y) * HTH, sx = wx + ox, sy = wy + oy;
    if (sx < -140 || sx > vw + 140 || sy < -60 || sy > vh + 300) continue;
    if (g === T.CLIFF) items.push({ d: x + y, k: 0, cliff: true, x, y, sx, sy, o });
    else if (o !== O.NONE && !FLAT.has(o) && o !== O.PART && g === T.CLIFF) { upper.push({ d: x + y, k: 0, x, y, o, sx, sy: sy - FLOOR_PX }); }
    else if (o === O.PART && x === STAGE.x - 1 && y === STAGE.y) items.push({ d: x + y, k: 0, x, y, o: O.GUILLOTINE, sx, sy });   // prancha da guilhotina
    else if (o !== O.NONE && !FLAT.has(o) && o !== O.PART) { items.push({ d: x + y, k: 0, x, y, o, sx, sy }); if (o === O.TREE || o === O.PINE || o === O.OAK || o === O.BIRCH || o === O.WILLOW) visTrees.push({ wx, wy }); }
    if (o === O.FLOWER || o === O.FLOWERBED) visFlowers.push({ wx, wy });
    if ((g === T.GRASS || g === T.FOREST || g === T.SWAMP) && hash2(x, y, 5) < 0.25) visGrass.push({ wx, wy });
    if (WORLD.fl1[i] === 2 && !hideUpper) upper.push({ d: x + y, k: 5, x, y, sx, sy });
  }
  const myFl = me ? (me.fl || 0) : 0, inB0 = me && (me.z || 0) < 0.5 ? (myFl !== 0 ? me.fb : bldAt(me.rx, me.ry)) : -1;
  const flRaise = (b, f) => f !== 0 ? f * (bldDims(b).H / floorsOf(b)) * HV : 0;
  const addEnt = (e, kind) => {
    if (!e.visible) return;
    const p = iso(e.rx, e.ry), sx = p.sx + ox, sy = p.sy + oy - (e.z || 0) * FLOOR_PX;
    if (sx < -100 || sx > vw + 100 || sy < -40 || sy > vh + 200) return;
    const efl = e.fl || 0, ebi = (e.z || 0) < 0.5 ? (e === G.me && G.climbing ? G.climbing.bi : efl !== 0 ? (e.fb ?? bldAt(e.rx, e.ry)) : bldAt(e.rx, e.ry)) : -1;   // subindo a escada (até a externa, do lado de fora): altura do prédio da escada
    if (efl !== 0 && !(ebi === inB0 && efl === myFl)) return;       // quem está em outro andar não aparece
    const stH = typeof stageLift === 'function' ? stageLift(e.rx, e.ry) : 0;
    const it = { d: e.exec && e.exec.T ? STAGE.x + STAGE.y - 0.4 : stH ? Math.max(e.rx + e.ry, STAGE.x + STAGE.y + 0.6) : e.rx + e.ry + ((e.sit || (e.custP && e.custP.sit)) ? 0.15 : 0), k: kind, e, sx, sy: sy - stH - (ebi >= 0 ? flRaise(BUILDINGS[ebi], efl) + (e.lift ? e.lift * flRaise(BUILDINGS[ebi], 1) : 0) : 0), tx: e.rx, ty: e.ry };
    if ((e.z || 0) < 0.5 && inB0 >= 0 && ebi === inB0 && efl === myFl) { it.inside = true; e._inC = now; }
    if ((e.alt || 0) > 0.5) sky.push(it); else if ((e.z || 0) >= 0.5) { if (!hideUpper) upper.push(it); } else items.push(it);
  };
  for (const id in G.monsters) addEnt(G.monsters[id], 1);
  for (const n of NPCS) addEnt(G.npcs[n.id], 3);
  if (typeof cellDoorItems === 'function') cellDoorItems(items, inB0, now);
  if (typeof cabinDoorItems === 'function') cabinDoorItems(items, inB0, now);
  for (const id in G.players) { const e = G.players[id]; if (!e.carriedBy && !(e.grab && now < e.grab.until)) addEnt(e, 2); }
  const inB = inB0;
  let inside = null;
  // pontos dos jogadores (para saber quem fica escondido atrás de algo)
  const PL = [];
  for (const id in G.players) { const e = G.players[id]; if (!e.visible || e.carriedBy || (e.z || 0) >= 0.5) continue; const p = iso(e.rx, e.ry); PL.push({ e, x: p.sx + ox, y: p.sy + oy - 20, d: e.rx + e.ry, me: id === G.myId }); e._hid = false; }
  const meP = PL.find(q => q.me);
  // a imagem cobre o ponto? (usa a transparência da própria imagem)
  const covers = (sp, x, y, px, py) => { const lx = px - (x - sp.ax), ly = py - (y - sp.ay); if (lx < 0 || ly < 0 || lx >= sp.w || ly >= sp.h) return false; const m = maskOf(sp); return m.a[Math.floor(ly / 2) * m.w + Math.floor(lx / 2)] > 60; };
  // testa quem está escondido por uma imagem desenhada com profundidade d; devolve true se esconde VOCÊ
  const occTest = (sp, x, y, d, cx0, cx1) => { let mine = false; for (const q of PL) { if (q.d >= d || (cx0 != null && (q.x < cx0 || q.x > cx1))) continue; if (covers(sp, x, y, q.x, q.y)) { q.e._hid = true; if (q.me) mine = true; } } return mine; };
  G.bldDrawn = 0;
  BUILDINGS.forEach((b, bi) => {
    const p = iso(b.x - 0.5, b.y - 0.5), bx = p.sx + ox, by = p.sy + oy;
    if (bx < -1100 || bx > vw + 1100 || by < -1400 || by > vh + 700) return;
    if (bi === inB) { inside = { b, bi, sx: bx, sy: by }; return; }
    const sp = buildingSprite(b, false); if (!sp) return;
    G.bldDrawn++;
    const cA = Math.floor(-sp.ax / 32), cB = Math.ceil((sp.w - sp.ax) / 32) - 1;
    const depthOf = c => { let best = -1e9; for (const m of [c, c + 1]) { const jmax = Math.min(b.h - 1, b.w - 1 - m), jmin = Math.max(0, -m); if (jmax >= jmin) best = Math.max(best, 2 * jmax + m); } if (best < -1e8) best = c < 0 ? -c - 1 + 0 : 0; return b.x + b.y + best + 0.55; };
    const dl = depthOf(-b.h), dr = depthOf(b.w - 1);
    // você está atrás deste prédio? então ele fica translúcido (só ele)
    let al = null;
    if (meP) { const c = Math.floor((meP.x - bx) / 32), d = c < -b.h ? dl : c > b.w - 1 ? dr : depthOf(c); if (meP.d < d && covers(sp, bx, by, meP.x, meP.y)) { al = 0.38; meP.e._hid = true; } }
    for (const q of PL) { if (q.me) continue; const c = Math.floor((q.x - bx) / 32), d = c < -b.h ? dl : c > b.w - 1 ? dr : depthOf(c); if (q.d < d && covers(sp, bx, by, q.x, q.y)) q.e._hid = true; }
    for (let c = cA; c <= cB; c++) items.push({ d: c < -b.h ? dl : c > b.w - 1 ? dr : depthOf(c), k: 4, b, bi, sp, col: c, al, first: c === cA, sx: bx, sy: by });
    if (b.door === 'S' || b.door === 'E' || !b.door) { const f = doorOpenF(bi, b, now); if (f > 0.03) { const D = doorGeo(b), pc = iso(D.cx, D.cy), c = Math.floor((pc.sx + ox - bx) / 32); items.push({ d: (c < -b.h ? dl : c > b.w - 1 ? dr : depthOf(c)) + 0.01, k: 7, b, f, D, al }); } }
  });
  // perto de uma porta: já prepara o interior (sem engasgo ao entrar)
  if (me && (me.z || 0) < 0.5 && inB < 0) for (const b of BUILDINGS) { const d0 = doorOf(b); if (Math.abs(d0.x - me.rx) + Math.abs(d0.y - me.ry) < 3) { const t = S3.budget; S3.budget = Math.max(1, S3.budget); interiorSprite(b); S3.budget = t; break; } }
  if (inB >= 0 && BUILDINGS[inB].kind !== 'stairtower') { const b = BUILDINGS[inB]; for (const f of [myFl + 1, myFl - 1]) if (f >= 0 && f < floorsOf(b)) { const t = S3.budget; S3.budget = Math.max(1, S3.budget); interiorSprite(b, f); S3.budget = t; } }
  items.sort((a, b) => a.d - b.d || a.k - b.k);
  upper.sort((a, b) => a.d - b.d || a.k - b.k);

  // 5) sombras projetadas (todas numa camada, depois aplicadas de uma vez)
  if (shadowC.width !== Math.round(W * dpr) || shadowC.height !== Math.round(H * dpr)) { shadowC.width = Math.round(W * dpr); shadowC.height = Math.round(H * dpr); }
  shadowX.setTransform(1, 0, 0, 1, 0, 0); shadowX.clearRect(0, 0, shadowC.width, shadowC.height);
  const shAlpha = sh.a * (1 - ATM.rain * 0.6) * (1 - ATM.fog * 0.6);
  if (shAlpha > 0.02) {
    for (const it of items) {
      if (it.k === 0 && !it.cliff && CASTS.has(it.o)) { const s = objSprite(it.o, it.x, it.y); if (s) castShadow(s, it.sx, it.sy, sh, k); }
      else if (it.k === 0 && it.o === O.TOWER) { const p = iso(it.x - 0.5, it.y - 0.5); castShadow(towerSprite(WORLD.tvar[it.y * MAP_W + it.x], WORLD.toff[it.y * MAP_W + it.x]), p.sx + ox, p.sy + oy, sh, k); }
      else if (it.k === 4 && it.first) castShadow(it.sp, it.sx, it.sy, sh, k);
      else if (it.k === 1 && !it.e.dieAt) castShadow(R3.ok ? monSprite3D(it.e.type, -1, -1, 0) : monSprite(PAINT_AS[it.e.type] || it.e.type, 0, -1), it.sx, it.sy, sh, k);
      else if ((it.k === 2 || it.k === 3) && !it.e.downed) castShadow(R3.ok ? (it.e.isNpc ? npcSprite3D(it.e.kind, { dir: 0, walk: -1 }) : heroSprite3D(it.e.cls, it.e.skin, it.e.color, { dir: 0, walk: -1 })) : (it.e.isNpc ? npcSprite(it.e.kind, { view: 'S', walk: -1 }) : heroSprite(it.e.cls, it.e.skin, it.e.color, { view: 'S', walk: -1 })), it.sx, it.sy, sh, k);
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = shAlpha; ctx.drawImage(shadowC, 0, 0); ctx.restore();
  }

  // 6) desenho em ordem de profundidade
  const labels = [];
  let meX = -999, meY = -999, meD = 1e9;
  if (me && (me.z || 0) < 0.5) { const p = iso(me.rx, me.ry); meX = p.sx + ox; meY = p.sy + oy - 22; meD = me.rx + me.ry; }
  // em vez de deixar o objeto todo transparente, abre um círculo suave em volta do personagem
  const holeOf = (s, x, y, d, yf) => {
    if (meD >= 1e9) return false;
    const l = x - s.ax, t = y - s.ay;
    return d > meD && meX > l - 20 && meX < l + s.w + 20 && meY > t - 20 && meY < t + s.h && (yf ?? y) > meY + 14;
  };
  const drawHole = (s, x, y, alpha) => {
    const l = x - s.ax, t = y - s.ay, kk = k;
    const px0 = Math.max(0, Math.floor(l * kk)), py0 = Math.max(0, Math.floor(t * kk)), px1 = Math.min(holeC.width, Math.ceil((l + s.w) * kk)), py1 = Math.min(holeC.height, Math.ceil((t + s.h) * kk));
    if (px1 <= px0 || py1 <= py0) return;
    holeX.setTransform(1, 0, 0, 1, 0, 0); holeX.globalCompositeOperation = 'source-over'; holeX.clearRect(px0, py0, px1 - px0, py1 - py0);
    holeX.setTransform(kk, 0, 0, kk, 0, 0); holeX.imageSmoothingEnabled = true; pblit(holeX, s, x, y, alpha);
    holeX.globalCompositeOperation = 'destination-out';
    const R0 = 26, R1 = 58, g = holeX.createRadialGradient(meX, meY + 6, R0, meX, meY + 6, R1);
    g.addColorStop(0, 'rgba(0,0,0,0.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    holeX.fillStyle = g; holeX.save(); holeX.translate(meX, meY + 6); holeX.scale(1, 1.25); holeX.translate(-meX, -meY - 6); holeX.fillRect(meX - R1, meY + 6 - R1, R1 * 2, R1 * 2); holeX.restore();
    holeX.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(holeC, px0, py0, px1 - px0, py1 - py0, px0, py0, px1 - px0, py1 - py0); ctx.restore();
  };
  const blitV = (s, x, y, d, yf, alpha) => { const mine = s.h > 60 && occTest(s, x, y, d); pblit(ctx, s, x, y, mine ? 0.42 : alpha); };
  const fadeA = (s, x, y, d, yf) => {
    const l = x - s.ax, t = y - s.ay;
    return d > meD && meX > l + 6 && meX < l + s.w - 6 && meY > t && meY < t + s.h - 10 && (yf ?? y) > meY + 18 ? (yf != null && inB >= 0 ? 0.22 : 0.42) : null;
  };
  const drawItem = it => {
    if (it.gib) { const g = it.gib; ctx.imageSmoothingEnabled = true; if (it.gk >= 1 && !g.landed) { g.landed = 1; addBlood(g.x + g.dx * g.d, g.y + g.dy * g.d, g.z, 0.35, 300000); } ctx.save(); ctx.translate(it.sx, it.sy); ctx.rotate(g.rot + (it.gk < 1 ? g.spin * it.gk : g.spin)); pblit(ctx, g.s, 0, g.s.h * 0.12); ctx.restore(); return; }
    if (it.corpse) {
      const c = it.corpse; if (c.onBack) return; if (typeof TOWS !== 'undefined' && TOWS['c:' + c.id]) { drawTow(ctx, 'c:' + c.id, now); return; } let f = FALLS['m' + c.id];
      const live = G.monsters[c.id]; if (!f && live && live.dieAt && now - live.dieAt < 1500) return;   // a queda ao vivo ainda vai começar
      if (!f && R3.ok) { f = startFall({ lost: c.lost || 0, key: 'm' + c.id, type: c.type, x: c.x, y: c.y, dir: c.id % 8, ix: c.ix, iy: c.iy, cls: 'knight', big: MON[c.type].big, force: 1 }); if (f) f.fromCorpse = true; }
      if (f) { if (f.fromCorpse && !f.done && !f.staged) { for (let k = 0; k < 400 && !stepAny(f); k++); } drawFall(ctx, f, it.sx, it.sy, now, 1, c.type !== 'dragon' && MON_LOOK[c.type] ? 2 : 0); }
      { const ca = G.corpseArrows && G.corpseArrows[c.id]; if (ca) drawStuck(ctx, { arrows: ca.arrows, dir: ca.dir }, it.sx, it.sy, now, ca.dir); }
      if (!c.looted && dist(c.x, c.y, G.me.x, G.me.y) < 1.7) { const t = now / 300; for (let k = 0; k < 2; k++) dab(ctx, it.sx + Math.cos(t + k * 3) * 10, it.sy - 10 + Math.sin(t + k) * 4, 2, 2, '#ffe890'); }
      if (G.loot && G.loot.id === c.id) { const k = Math.min(1, (now - G.loot.t0) / 1300); ctx.strokeStyle = '#ffe890'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(it.sx, it.sy - 34, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); }
      return;
    }
    if (it.rsign) { drawRentSign(ctx, it.sx, it.sy, now, it.rsign); return; }
    if (it.wsign) { drawWallSign(ctx, it.sx, it.sy, it.wsign, it.along, it.price); return; }
    if (it.chest) {
      const c = it.chest, s = smallSprite('chest', c.open ? 1 : 0); ctx.imageSmoothingEnabled = true; if (s) pblit(ctx, s, it.sx, it.sy);
      if (c.mine && !c.open) { G.lights.push({ x: it.sx, y: it.sy - 10, r: 40, c: '255,220,120', a: 0.7 }); const t = now / 300; for (let k = 0; k < 3; k++) dab(ctx, it.sx + Math.cos(t + k * 2.1) * 12, it.sy - 22 + Math.sin(t * 1.3 + k) * 6, 2, 2, '#ffe890'); }
      return;
    }
    if (it.k === 0) {
      if (it.cliff) {
        const i = it.y * MAP_W + it.x, h = WORLD.height[i] || 1, s = cliffSprite(h, Math.floor(hash2(it.x, it.y, 3) * 4), h === 4 ? 1 : 0);
        blitV(s, it.sx, it.sy, it.d);
        if (it.o === O.WATERFALL) { drawWaterfallLive(ctx, it.sx, it.sy, CLIFF_H[h], now); if (Math.random() < 0.5) spawnPart('mist', it.sx - ox + (Math.random() - 0.5) * 50, it.sy - oy + 18); }
        return;
      }
      if (it.o === O.TOWER) { const p = iso(it.x - 0.5, it.y - 0.5), s = towerSprite(WORLD.tvar[it.y * MAP_W + it.x], WORLD.toff[it.y * MAP_W + it.x]); blitV(s, p.sx + ox, p.sy + oy, it.d); return; }
      const s = seasonTint(objSprite(it.o, it.x, it.y), it.o);
      if (s) { const shk = G.objShake && G.objShake[it.y * MAP_W + it.x], sw = (SWAY[it.o] ? wind(it.x, it.y, now) * SWAY[it.o] * (0.7 + ATM.wind * 0.6) : 0) + (shk && now < shk ? Math.sin(now / 35) * 0.06 * (shk - now) / 450 : 0); if (s.h > 60 && occTest(s, it.sx, it.sy, it.d)) pblit(ctx, s, it.sx, it.sy, 0.42); else drawSway(ctx, s, it.sx, it.sy, sw); }
      liveParts(ctx, it.o, it.sx, it.sy, it.x, it.y, now);
      if (it.o === O.MUSHROOM) { const z = zoneAt(it.x, it.y); if (z === Z.SWAMP || (z === Z.FOREST && hash2(it.x, it.y, 17) < 0.3)) G.lights.push({ x: it.sx, y: it.sy - 8, r: 16, c: '90,200,240', a: 0.6 }); }
      return;
    }
    if (it.k === 4) {
      const s = it.sp, kp = s.c.width / s.w, sx0 = (s.ax + it.col * 32) * kp, x0 = Math.max(0, sx0), x1 = Math.min(s.c.width, sx0 + 32.6 * kp);
      if (x1 > x0) { if (it.al) ctx.globalAlpha = it.al; ctx.drawImage(s.c, x0, 0, x1 - x0, s.c.height, it.sx - s.ax + x0 / kp, it.sy - s.ay, (x1 - x0) / kp, s.h); ctx.globalAlpha = 1; }
      if (!it.first) return;
      if ((it.b.kind === 'tavern' || it.b.kind === 'house' || it.b.kind === 'smith' || it.b.wk === 'bakery') && Math.random() < (it.b.kind !== 'house' ? 0.14 : 0.05)) { const p = iso(it.b.x - 0.5 + it.b.w * 0.3, it.b.y - 0.5 + it.b.h * 0.35); spawnPart('smoke', p.sx, p.sy - (bldTopArt(it.b) * 0.9 + 30), it.b.kind === 'tavern' && typeof dayInfo === 'function' && dayInfo().night ? { color: '#5ad86a' } : undefined); }
      if (it.b.kind === 'smith') { const p = iso(it.b.x - 0.5 + it.b.w * 0.5, it.b.y - 0.5 + it.b.h); G.lights.push({ x: p.sx + ox, y: p.sy + oy - 16, r: 62, c: '255,130,50', a: 1, flick: 1 }); if (Math.random() < 0.1) spawnPart('ember', p.sx, p.sy - 20); }
      return;
    }
    if (it.k === 6) { drawCellDoor(ctx, it); return; }
    if (it.k === 7) { drawDoorOpen(ctx, it); return; }
    if (it.k === 8) { drawCoin(ctx, it, now); return; }
    if (it.k === 9) { drawObjFall(ctx, it, now); return; }
    if (it.k === 10) { drawCabinDoor(ctx, it); return; }
    if (it.k === 5) { pblit(ctx, slabSprite(Math.floor(hash2(it.x, it.y, 4) * 3)), it.sx, it.sy - FLOOR_PX); return; }
    const e = it.e;
    ctx.imageSmoothingEnabled = false;
    if (it.k === 1) {
      drawMonsterEntity(ctx, e, it.sx, it.sy, now); if (e.burnUntil > now && typeof drawOnFire === 'function') drawOnFire(ctx, it.sx, it.sy, now, (e.rx || 0) * 7.1); if (e.carrying && G.players[e.carrying]) drawCarried(ctx, G.players[e.carrying], it.sx, it.sy - (MON[e.type].big ? 20 : 0)); if (e.arrows && !FALLS['m' + e.id]) drawStuck(ctx, e, it.sx, it.sy, now);
    } else if (it.k === 3) {
      if (typeof drawNpcState === 'function' && drawNpcState(ctx, e, it.sx, it.sy, now)) { if (e.npDead && !e.onBackBy) labels.push({ sx: it.sx, sy: it.sy - 22, name: e.name + ' (morto)', color: '#8a8a8a', npc: e, e }); return; }
      if (typeof drawPackage === 'function' && (e.isNpc || (e.stb & 16))) drawPackage(ctx, e.isNpc ? e : { pkg: true, walking: e.walking, walkDist: e.walkDist }, it.sx, it.sy, now);
      if (typeof drawNpcBubble === 'function') drawNpcBubble(ctx, e, it.sx, it.sy, now);
      drawHeroEntity(ctx, e, it.sx, it.sy, now); if (e.arrows) drawStuck(ctx, e, it.sx, it.sy, now);
      if (e.carrying && G.players[e.carrying]) drawCarried(ctx, G.players[e.carrying], it.sx, it.sy);
      labels.push({ sx: it.sx, sy: it.sy - (R3.ok ? 56 : 78), name: e.name, color: '#b8e0a8', npc: e, e });
    } else {
      ctx.imageSmoothingEnabled = true; drawAuras(ctx, e, it.sx, it.sy, now); ctx.imageSmoothingEnabled = false;
      drawHeroEntity(ctx, e, it.sx, it.sy, now); if (e.arrows) drawStuck(ctx, e, it.sx, it.sy, now);
      if (typeof drawPlayerBubble === 'function') drawPlayerBubble(ctx, e, it.sx, it.sy, now);
      if (e.dragMode === 'back' && typeof drawBackCorpse === 'function') { drawBackCorpse(ctx, e, it.sx, it.sy, now); drawNpcOnBack(ctx, e, it.sx, it.sy); }
      heroExtras(e, it.sx, it.sy);
      if (e.burnUntil > now && typeof drawOnFire === 'function') drawOnFire(ctx, it.sx, it.sy, now, (e.x || 0) * 7.1);
      if (e.emberUntil > now && !e.downed && typeof drawEmberHand === 'function') drawEmberHand(ctx, e, it.sx, it.sy, now);
      if (e.carrying && G.players[e.carrying]) drawCarried(ctx, G.players[e.carrying], it.sx, it.sy);
      if (e.lifted) { const os = objSprite(e.lifted); if (os) pblit(ctx, os, it.sx, it.sy - 58); }
      G.lights.push({ x: it.sx, y: it.sy - 30, r: 34, c: '255,240,220', a: 0.4 });
      labels.push({ sx: it.sx, sy: it.sy - (e.downed && !e.carriedBy ? 20 : (R3.ok ? 58 : 80)), name: e.name + (e.wantedUntil > now ? ' · PROCURADO' : ''), color: e.wantedUntil > now ? '#ff6a5a' : e.id === G.myId ? '#f4dc8a' : '#b8d0f0', hp: e.hp / e.maxHp, mp: e.id === G.myId ? e.mp / e.maxMp : null, e, player: true });
    }
    ctx.imageSmoothingEnabled = true;
  };
  // dentro de um prédio: o que fica NA FRENTE dele (ruas, casas e árvores mais perto da câmera) é desenhado depois do cômodo,
  // escurecido e translúcido — antes ia para trás do cômodo e parecia que a rua estava um andar abaixo
  let IR = null; const front = [];
  if (inside) { const s0 = interiorSprite(inside.b, 0) || buildingSprite(inside.b, false), b = inside.b; if (s0) IR = { l: inside.sx - s0.ax - 40, r: inside.sx - s0.ax + s0.w + 40, t: inside.sy - s0.ay - 40, b: inside.sy - s0.ay + s0.h + 90, d: b.x + b.y + b.w + b.h - 2 + 0.6 }; }
  // o que fica na frente do prédio onde você está (ao sul ou a leste, até 12 tiles): prédios, árvores e objetos
  const ib = inside ? inside.b : null, IMODE = G.intMode || 'fade', cutL = [];
  const inFront = it => { if (!ib || it.e) return false; const nr = (x0, y0, x1, y1) => x1 > ib.x - 12 && y1 > ib.y - 12 && x0 < ib.x + ib.w + 12 && y0 < ib.y + ib.h + 12;
    if (it.k === 4 && it.b) { const b = it.b; if (b === ib || !nr(b.x, b.y, b.x + b.w, b.y + b.h)) return false;
      const sxr = (x0, y0, w, h) => [iso(x0 - 0.5, y0 + h - 0.5).sx, iso(x0 + w - 0.5, y0 - 0.5).sx], [a0, a1] = sxr(b.x, b.y, b.w, b.h), [c0, c1] = sxr(ib.x, ib.y, ib.w, ib.h);
      if (a1 < c0 - 8 || a0 > c1 + 8) return false;   // não se sobrepõe ao cômodo na tela
      return (b.y >= ib.y + ib.h && b.x + b.w > ib.x - 8) || (b.x >= ib.x + ib.w && b.y + b.h > ib.y + 1); }
    if (it.x != null && it.y != null && it.k !== 6 && it.k !== 7) return nr(it.x, it.y, it.x + 1, it.y + 1) && (it.y >= ib.y + ib.h || it.x >= ib.x + ib.w);
    return false; };
  for (const it of items) { if (it.inside) continue;
    if (ib && inFront(it)) { if (IMODE === 'cut' && it.k === 4) cutL.push(it); else if (IMODE !== 'hide' || it.k === 5) front.push(it); continue; }
    if (IR && it.d > IR.d && it.sx > IR.l && it.sx < IR.r && it.sy > IR.t && it.sy < IR.b) { front.push(it); continue; } drawItem(it); }
  for (const it of upper) drawItem(it);
  for (const it of sky) drawItem(it);   // o dragão voando passa por cima de tudo
  if (typeof drawBowTop === 'function') drawBowTop(ctx, now);
  if (typeof drawRadial === 'function') { drawRadial(ctx, now); drawGripBar(ctx, now); }
  if (typeof drawChokeRing === 'function') { drawChokeRing(ctx, now); drawLockpick(ctx); }
  // dentro de uma construção: a cidade escurece e o cômodo aparece cortado, com quem está dentro
  G.cellarDark = false;
  if (inside) {
    const ff = G.flFade && BUILDINGS[G.flFade.b] === inside.b ? G.flFade : null, fk = ff ? Math.min(1, Math.max(0, now - ff.t0) / (ff.dur || 450)) : 1;
    // debaixo da terra (porão): em volta fica tudo escuro, como no Tibia; ao descer/subir escurece aos poucos
    const ck = ff ? (ff.to < 0 ? fk : 0) + (ff.from < 0 ? 1 - fk : 0) : (myFl < 0 ? 1 : 0); G.cellarDark = ck > 0.5;
    ctx.fillStyle = 'rgba(' + Math.round(8 - 6 * ck) + ',' + Math.round(5 - 4 * ck) + ',' + Math.round(2 - 1 * ck) + ',' + (0.6 + 0.4 * ck) + ')'; ctx.fillRect(-20, -20, vw + 40, vh + 40);
    // cada andar tem uma opacidade (o seu = 1, o de baixo = 0.55); ao trocar de andar, mistura as duas situações
    const A = (st, f) => f === st ? 1 : f === st - 1 && f >= 0 ? 0.55 : 0;   // o porão só aparece quando você está nele
    if (ff && fk >= 1) G.flFade = null;
    for (let f = minFl(inside.b); f < floorsOf(inside.b); f++) {
      const a = ff ? A(ff.from, f) * (1 - fk) + A(ff.to, f) * fk : A(myFl, f); if (a < 0.02) continue;
      const s = interiorSprite(inside.b, f) || (f === 0 ? buildingSprite(inside.b, false) : null);
      if (s) pblit(ctx, s, inside.sx, inside.sy - flRaise(inside.b, f), a);
    }
    for (const it of items) if (it.inside) drawItem(it);
    if (G.cellarDark) { cutL.length = 0; front.length = 0; }   // no porão não se vê os prédios da frente
    if (cutL.length) {   // corte estilo Tibia: os prédios da frente aparecem só até a altura do joelho (paredes baixas), sem esconder o cômodo
      const kh = (typeof HV !== 'undefined' ? HV : 25) * 0.55, done = new Set();
      for (const it of cutL) { const b = it.b, x0 = b.x - 0.5, y0 = b.y - 0.5, x1 = b.x + b.w - 0.5, y1 = b.y + b.h - 0.5;
        const g = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => { const q = iso(x, y); return [q.sx + G.view.ox, q.sy + G.view.oy]; });
        // faixa das paredes da frente (cantos esquerdo, de baixo e direito do chão) até a altura do joelho
        const [, Bc, Cc, Dc] = g, hull = [Dc, Cc, Bc, [Bc[0], Bc[1] - kh], [Cc[0], Cc[1] - kh], [Dc[0], Dc[1] - kh]];
        ctx.save(); ctx.beginPath(); hull.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.clip(); drawItem(it); ctx.restore();
        if (!done.has(b)) { done.add(b); ctx.save(); ctx.beginPath(); g.forEach(([x, y], k) => k ? ctx.lineTo(x, y - kh) : ctx.moveTo(x, y - kh)); ctx.closePath(); ctx.fillStyle = 'rgba(36,28,20,0.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(200,180,140,0.35)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }   // topo do corte
      }
    }
    if (front.length) {   // camada separada: escurece e deixa ver o cômodo através
      const L = G._frontL || (G._frontL = document.createElement('canvas')); if (L.width !== ctx.canvas.width || L.height !== ctx.canvas.height) { L.width = ctx.canvas.width; L.height = ctx.canvas.height; }
      const lc = L.getContext('2d'); lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, L.width, L.height); lc.setTransform(ctx.getTransform()); lc.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
      const main = ctx; ctx = lc; try { for (const it of front) drawItem(it); } finally { ctx = main; }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = IMODE === 'fade' ? 0.22 : 0.34; try { ctx.filter = 'brightness(0.55)'; } catch (e) { } ctx.drawImage(L, 0, 0); ctx.restore();
    }
  }
  if (typeof drawMeleeArc === 'function') drawMeleeArc(ctx, now);
  if (typeof drawJobsOverlay === 'function') drawJobsOverlay(ctx, now);   // barra de coleta/turno e marcador: por cima do interior
  // silhuetas: você (dourado) e amigos (azul) quando algo os esconde
  for (const q of PL) { const e = q.e; if (!e._hid || !e._spr || inside) continue; pblit(ctx, tintOf(e._spr, q.me ? '#ffd060' : '#5aa8ff'), e._sx, e._sy, 0.62); }

  drawEffects(ctx, ox, oy, now);
  if (!G.cellarDark) { if (typeof qLevelNow !== 'function' || qLevelNow() >= 1) ambient(visTrees, visFlowers, visGrass, day.night); drawParticles(ctx, ox, oy, now, dt); }   // no porão não chove nem venta
  if (G.cellarDark) for (let k = labels.length - 1; k >= 0; k--) if (!labels[k].e || labels[k].e._inC !== now) labels.splice(k, 1);   // nomes só de quem está no porão

  // luzes das casas à noite: todas as janelas, lanterna na porta e o cômodo onde você está
  if (day.dark > 0.2) for (const b of BUILDINGS) {
    if (b.kind === 'stairtower') continue;
    const c = iso(b.x + b.w / 2, b.y + b.h / 2), cx = c.sx + ox, cy = c.sy + oy; if (cx < -300 || cx > vw + 300 || cy < -400 || cy > vh + 300) continue;
    const col = b.kind === 'temple' ? '190,210,255' : '255,190,100';
    for (const [wx, wy, wz] of buildingWindows(b)) { const p = iso(wx, wy); G.lights.push({ x: p.sx + ox, y: p.sy + oy - wz, r: 34, c: col, a: 0.9 }); }
    const d = doorOf(b), p = iso(d.x, d.y); G.lights.push({ x: p.sx + ox, y: p.sy + oy - 30, r: 64, c: '255,175,90', a: 0.95, flick: 1 });
    if (b.kind === 'tavern') {   /* Ronco do Dragão: vitrais acesos nas faixas e manchas de luz colorida no chão da rua */
      const cxw = b.x + b.w / 2 - 0.5, cyw = b.y + b.h / 2 - 0.5, ddx = d.x - cxw, ddy = d.y - cyw, nx = Math.abs(ddx) > Math.abs(ddy) ? Math.sign(ddx) : 0, ny = nx ? 0 : Math.sign(ddy), tx = -ny, ty = nx, L = nx ? b.h : b.w;
      const fx = nx ? cxw + nx * b.w / 2 : d.x, fy = ny ? cyw + ny * b.h / 2 : d.y, cols = ['255,190,90', '120,230,120', '255,110,90', '255,190,90', '120,160,255'];
      for (let k = 0; k < 5; k++) { const u = (k - 2) * L / 5.2, wx = nx ? fx : cxw + tx * u, wy = ny ? fy : cyw + ty * u, q = iso(wx + nx * 0.05, wy + ny * 0.05), atDoor = Math.hypot(wx - (d.x - nx * 1.3), wy - (d.y - ny * 1.3)) < 0.75;
        if (!atDoor) G.lights.push({ x: q.sx + ox, y: q.sy + oy - 26, r: 36, c: '255,200,120', a: 1 });
        G.lights.push({ x: q.sx + ox, y: q.sy + oy - 62, r: 34, c: '255,200,120', a: 0.9 });
        const g2 = iso(wx + nx * 1.1, wy + ny * 1.1); if (!atDoor) G.lights.push({ x: g2.sx + ox, y: g2.sy + oy, r: 48, c: cols[k], a: 1 }); }
      for (const sd of [1, -1]) for (let k = 0; k < 3; k++) { const L2 = nx ? b.w : b.h, u = (k - 1) * L2 / 3.4, wx = nx ? cxw + nx * u : cxw + tx * sd * (b.w / 2 + 1.0), wy = ny ? cyw + ny * u : cyw + ty * sd * (b.h / 2 + 1.0), g3 = iso(wx, wy); G.lights.push({ x: g3.sx + ox, y: g3.sy + oy, r: 44, c: cols[(k * 2 + (sd > 0 ? 1 : 0)) % 5], a: 0.9 }); }
    }
  }
  if (inside && day.dark > 0.05) { const b = inside.b, c = iso(b.x + b.w / 2 - 0.5, b.y + b.h / 2 - 0.5); G.lights.push({ x: c.sx + ox, y: c.sy + oy - 20, r: Math.max(b.w, b.h) * 22, c: '255,200,140', a: 1 }); }
  if (G.cellarDark && inside) { const b = inside.b, c = iso(b.x + b.w / 2 - 0.5, b.y + b.h / 2 - 0.5); G.lights = [{ x: c.sx + ox, y: c.sy + oy + (bldDims(b).H / floorsOf(b)) * HV - 20, r: 150, c: '255,180,100', a: 0.9, flick: 1 }]; }   // porão: só a luz das velas
  // 7) iluminação noturna (camada em resolução reduzida = luz suave)
  if (day.dark > 0.01) {
    const lw = Math.ceil(vw / 2), lh = Math.ceil(vh / 2);
    if (lightC.width !== lw || lightC.height !== lh) { lightC.width = lw; lightC.height = lh; }
    lightX.setTransform(0.5, 0, 0, 0.5, 0, 0);
    lightX.globalCompositeOperation = 'source-over';
    lightX.clearRect(0, 0, vw, vh);
    lightX.fillStyle = `rgba(8,12,34,${day.dark})`; lightX.fillRect(0, 0, vw, vh);
    lightX.globalCompositeOperation = 'destination-out';
    for (const L of G.lights) {
      const r = L.r * 2 * (L.flick ? 0.93 + Math.sin(now / 70 + L.x) * 0.05 : 1);
      if (!(r > 0.1) || L.x < -r || L.y < -r || L.x > vw + r || L.y > vh + r) continue;
      const g = lightX.createRadialGradient(L.x, L.y, 0, L.x, L.y, r);
      g.addColorStop(0, `rgba(0,0,0,${L.a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lightX.fillStyle = g; lightX.fillRect(L.x - r, L.y - r, r * 2, r * 2);
    }
    ctx.drawImage(lightC, 0, 0, vw, vh);
    ctx.globalCompositeOperation = 'lighter';
    if (typeof qLevelNow === 'function' && qLevelNow() < 3) G.lights.length = 0;   // brilho colorido das luzes: só do nível Média para cima
    for (const L of G.lights) {
      const r = L.r * 2 * 0.7;
      if (!(r > 0.1) || L.x < -r || L.y < -r || L.x > vw + r || L.y > vh + r) continue;
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, r);
      g.addColorStop(0, `rgba(${L.c},${0.22 * L.a * day.dark * 1.4})`); g.addColorStop(1, `rgba(${L.c},0)`);
      ctx.fillStyle = g; ctx.fillRect(L.x - r, L.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // 8) atmosfera e correção de cor (em pixels de tela)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!G.cellarDark && (typeof qLevelNow !== 'function' || qLevelNow() >= 2)) drawAtmosphere(ctx, W, H, now, day, cam);   // névoa, chuva e neve: só do nível Baixa para cima   // chuva, neve e névoa não entram no porão
  if (day.dusk > 0.01) { ctx.fillStyle = `rgba(255,120,40,${day.dusk * 0.1})`; ctx.fillRect(0, 0, W, H); }
  // fim de tarde dourado: tudo um pouco mais escuro e quente, com brilho no alto da tela
  if (!day.night) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(228,206,176)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    if (!GOLD || GOLD.height !== H) { GOLD = ctx.createLinearGradient(0, 0, 0, H); GOLD.addColorStop(0, 'rgba(255,190,110,0.16)'); GOLD.addColorStop(0.45, 'rgba(255,190,110,0)'); GOLD.addColorStop(1, 'rgba(40,20,10,0.12)'); GOLD.height = H; }
    ctx.fillStyle = GOLD; ctx.fillRect(0, 0, W, H); }
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = day.night ? 'rgba(60,80,150,0.35)' : `rgba(${ATM.tint.map(Math.round).join(',')},${0.25 + ATM.ta})`; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  if (!VIGNETTE || VIGNETTE.width !== W || VIGNETTE.height !== H) {
    VIGNETTE = document.createElement('canvas'); VIGNETTE.width = W; VIGNETTE.height = H;
    const v = VIGNETTE.getContext('2d'), g = v.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(12,6,2,0)'); g.addColorStop(1, 'rgba(12,6,2,0.7)'); v.fillStyle = g; v.fillRect(0, 0, W, H);
  }
  if (typeof qLevelNow !== 'function' || qLevelNow() >= 1) ctx.drawImage(VIGNETTE, 0, 0);
  return labels;
}
let VIGNETTE = null, GOLD = null;
function diamondOutline(ctx, sx, sy, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(sx, sy - HTH); ctx.lineTo(sx + HTW, sy); ctx.lineTo(sx, sy + HTH); ctx.lineTo(sx - HTW, sy); ctx.closePath(); ctx.stroke();
}
function targetRing(ctx, sx, sy, now) {
  const r = 18 + Math.sin(now / 150) * 1.5;
  ctx.strokeStyle = 'rgba(220,60,40,0.9)'; ctx.lineWidth = 1.6;
  for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + now / 600; ctx.beginPath(); ctx.ellipse(sx, sy, r, r / 2, 0, a, a + 1.0); ctx.stroke(); }
  softDab(ctx, sx, sy, r * 0.9, '#d83a28', 0.12);
}
function ambient(visTrees, visFlowers, visGrass, night) {
  if (G.parts.length > 280) return;
  if (visTrees.length && Math.random() < 0.06 * (0.6 + ATM.wind)) { const t = pick(visTrees); spawnPart('leaf', t.wx + (Math.random() - 0.5) * 32, t.wy - 60); }
  let nb = 0, nf = 0;
  for (const p of G.parts) { if (p.kind === 'butterfly') nb++; else if (p.kind === 'firefly') nf++; }
  if (!night && ATM.rain < 0.3 && visFlowers.length && nb < 5 && Math.random() < 0.03) { const t = pick(visFlowers); spawnPart('butterfly', t.wx, t.wy); }
  if ((night || ATM.rays > 0.6) && visGrass.length && nf < (night ? 30 : 10) && Math.random() < 0.25) { const t = pick(visGrass); spawnPart('firefly', t.wx + (Math.random() - 0.5) * 32, t.wy); }
}
// ---------- textos na resolução da tela (nítidos) ----------
function pxText(ctx, text, x, y, color, size, font = '"Alegreya Sans SC", "Alegreya Sans", serif', weight = '700') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 4); ctx.strokeStyle = 'rgba(12,8,4,0.95)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function drawLabels(ctx, labels, now) {
  const S = SCALE;
  for (const l of labels) {
    const x = Math.round(l.sx * S), y = Math.round(l.sy * S);
    if (l.title) { pxText(ctx, l.title, x, y, '#ecd9a0', 17, '"Cinzel", serif', '700'); continue; }
    let yy = y;
    const e = l.e;
    if (false) {
      const w = 46;
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x - w / 2 - 2, yy - 2, w + 4, l.mp != null ? 11 : 8);
      const fr = clamp(l.hp, 0, 1);
      ctx.fillStyle = fr > 0.6 ? '#4caf50' : fr > 0.3 ? '#d8b030' : '#d04030';
      ctx.fillRect(x - w / 2, yy, Math.round(w * fr), 4);
      if (l.mp != null) { ctx.fillStyle = '#4a74d8'; ctx.fillRect(x - w / 2, yy + 5, Math.round(w * clamp(l.mp, 0, 1)), 3); }
      yy -= 6;
    }
    if (l.npc && l.npc.id === 'captain' && G.me && Object.keys(G.me.quests || {}).length < MAX_ACTIVE_QUESTS) pxText(ctx, '!', x, yy - 18 + Math.round(Math.sin(now / 200) * 2), '#f0c840', 26, '"Cinzel", serif', '900');
    if (!e) continue;
    if (e.downed && l.player && !e.exec) {
      const left = Math.max(0, (e.downUntil || 0) - now);
      pxText(ctx, e.revive ? 'Reanimando...' : `Caído · ${Math.ceil(left / 1000)}s`, x, yy - 18, '#f08a7a', 13);
      if (e.revive) { const pr = clamp((now - e.revive.t0) / REVIVE_MS, 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x - 26, yy - 12, 52, 6); ctx.fillStyle = '#7ad87a'; ctx.fillRect(x - 25, yy - 11, Math.round(50 * pr), 4); }
    }
    if (false) {
      const pr = (now - e.cast.start) / (e.cast.end - e.cast.start), w = 54;
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(x - w / 2 - 1, y + 14, w + 2, 6);
      ctx.fillStyle = '#a088e8'; ctx.fillRect(x - w / 2, y + 15, Math.round(w * pr), 4);
    }
    if (e.shout && e.shoutUntil > now) {
      const t = 1 - (e.shoutUntil - now) / 1600, s = t < 0.1 ? 1 + (0.1 - t) * 5 : 1;
      ctx.save(); ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
      pxText(ctx, e.shout, x, yy - 22 - t * 8, '#f6e4a0', Math.round(18 * s), '"Cinzel", serif', '900');
      ctx.restore();
    }
    if ((e.stb & 1024) && e !== G.me && !(e.say && e.sayUntil > now)) pxText(ctx, '📜 no menu', x, yy - 20, '#e8dcc0', 11, '"Alegreya", serif', '600');
    if (e.say && e.sayUntil > now) {   // balão de fala logo acima da cabeça, maior e com até 2 linhas
      ctx.font = '600 17px "Alegreya", serif'; const words = String(e.say).split(' '), lines = ['']; for (const wd of words) { const t = (lines[lines.length - 1] + ' ' + wd).trim(); if (ctx.measureText(t).width > 240 && lines[lines.length - 1] && lines.length < 2) lines.push(wd); else lines[lines.length - 1] = t; }
      const bw = Math.min(260, Math.max(...lines.map(l => ctx.measureText(l).width))) + 20, bh = lines.length * 20 + 8, bby = yy + 18 - (e.shout && e.shoutUntil > now ? 24 : 0), fade = Math.min(1, (e.sayUntil - now) / 400);
      ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = 'rgba(250,242,222,0.97)'; ctx.strokeStyle = '#3a2814'; ctx.lineWidth = 1.5; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - bw / 2, bby - bh, bw, bh, 8); else ctx.rect(x - bw / 2, bby - bh, bw, bh); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 6, bby - 0.5); ctx.lineTo(x, bby + 8); ctx.lineTo(x + 6, bby - 0.5); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 6, bby); ctx.lineTo(x, bby + 8); ctx.lineTo(x + 6, bby); ctx.stroke();
      ctx.fillStyle = '#2a1c0e'; ctx.textAlign = 'center'; lines.forEach((l, k) => ctx.fillText(l, x, bby - bh + 20 + k * 20, 250)); ctx.restore();
    }
    if (false) {
      const text = e.say, w = Math.min(260, ctx.measureText(text).width) + 16, by = yy - (e.shout && e.shoutUntil > now ? 46 : 22);
      ctx.fillStyle = '#efe4c8'; ctx.fillRect(x - w / 2, by - 21, w, 21);
      ctx.fillStyle = '#3a2814'; ctx.fillRect(x - w / 2, by - 22, w, 1); ctx.fillRect(x - w / 2, by, w, 1); ctx.fillRect(x - w / 2 - 1, by - 21, 1, 21); ctx.fillRect(x + w / 2, by - 21, 1, 21);
      ctx.fillStyle = '#efe4c8'; ctx.fillRect(x - 3, by, 6, 3); ctx.fillRect(x - 1, by + 3, 2, 2);
      ctx.fillStyle = '#2a1c0e'; ctx.textAlign = 'center'; ctx.fillText(text, x, by - 6, 250);
    }
  }
}
// números de dano saltitantes
function drawNumbers(ctx, now) {
  const S = SCALE, { ox, oy } = G.view;
  G.nums = G.nums.filter(n => now - n.t0 < 1200);
  for (const n of G.nums) {
    if (now < n.t0) continue;
    const t = (now - n.t0) / 1200;
    const bx = (n.wx + ox) * S, by = (n.wy + oy) * S;
    const arc = Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.85);
    const x = bx + n.vx * t * 46, y = by - 30 - arc * 46 - t * 10;
    const pop = t < 0.12 ? 1 + (0.12 - t) * 7 : 1;
    const size = Math.round((n.big ? 28 : n.small ? 16 : 23) * pop);
    ctx.save(); ctx.globalAlpha = t > 0.75 ? (1 - t) * 4 : 1;
    if (n.crit) pxText(ctx, 'CRÍTICO!', x, y - 26 * pop, '#fff2d8', 13, '"Cinzel", serif', '900');
    pxText(ctx, n.text, x, y, n.color, size, '"Cinzel", serif', '900');
    ctx.restore();
  }
}

// ---------- minimapa ----------
const MINI = (() => {
  const c = document.createElement('canvas'); c.width = MAP_W; c.height = MAP_H;
  const m = c.getContext('2d');
  const cols = { [T.WATER]: '#2a5a8a', [T.SAND]: '#cbb282', [T.GRASS]: '#5a8c3c', [T.FOREST]: '#3a6530', [T.STONE]: '#8a877e', [T.DIRT]: '#7d5f3e', [T.BRIDGE]: '#6f4a2a', [T.COBBLE]: '#9c978b', [T.SWAMP]: '#4a5632', [T.DEAD]: '#978a58', [T.SHALLOW]: '#6a9a9a', [T.CLIFF]: '#6b665c', [T.FLOORSTONE]: '#a39e93' };
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const i = y * MAP_W + x, o = WORLD.obj[i];
    m.fillStyle = WORLD.bld[i] >= 0 ? '#7a3a2a' : (o === O.WALL || o === O.TOWER || o === O.PART) ? '#d8d2c4' : (o === O.TREE || o === O.PINE || o === O.OAK || o === O.BIRCH || o === O.WILLOW) ? '#2a4a20' : (o === O.FENCE ? '#5a3a1e' : WORLD.ground[i] === T.CLIFF && WORLD.height[i] >= 4 ? '#e8ecef' : cols[WORLD.ground[i]]);
    m.fillRect(x, y, 1, 1);
  }
  return c;
})();
function renderMinimap(ctx, size) {
  const s = size / MAP_W / Math.SQRT2 * 1.9;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(Math.PI / 4);
  ctx.scale(s, s);
  ctx.translate(-G.me.rx, -G.me.ry);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(MINI, 0, 0);
  { const f = typeof fogLayer === 'function' && fogLayer(); if (f) { ctx.imageSmoothingEnabled = true; ctx.drawImage(f, 0, 0); ctx.imageSmoothingEnabled = false; } }
  ctx.fillStyle = '#e04a3a';
  for (const id in G.monsters) { const e = G.monsters[id]; ctx.fillRect(e.rx - 0.7, e.ry - 0.7, 1.4, 1.4); }
  for (const id in G.players) { const e = G.players[id]; if (!e.visible) continue; ctx.fillStyle = id === G.myId ? '#ffffff' : '#6aa8f0'; ctx.fillRect(e.rx - 1.4, e.ry - 1.4, 2.8, 2.8); }
  ctx.fillStyle = '#7ad87a';
  for (const n of NPCS) ctx.fillRect(n.x - 0.8, n.y - 0.8, 1.6, 1.6);
  ctx.restore();
}

// máscara de transparência de uma imagem (meia resolução), para saber se ela cobre um ponto
const MASKS = new WeakMap();
function maskOf(s) {
  let m = MASKS.get(s); if (m) return m;
  const w = Math.max(1, Math.ceil(s.w / 2)), h = Math.max(1, Math.ceil(s.h / 2)), c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(s.c, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
  m = { w, h, a }; MASKS.set(s, m); return m;
}
// versão colorida de uma imagem (silhueta)
const TINTS = new WeakMap();
function tintOf(s, col) {
  let t = TINTS.get(s); if (t && t.col === col) return t.s;
  const c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height;
  const x = c.getContext('2d'); x.drawImage(s.c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  const o = { c, w: s.w, h: s.h, ax: s.ax, ay: s.ay }; TINTS.set(s, { col, s: o }); return o;
}

// ---------- portas que abrem quando alguém passa (vão escuro + folha girando para dentro) ----------
function doorGeo(b) { const [dx, dy] = doorTile(b), s = b.door || 'S', v = DOOR_V[s], tm = b.kind === 'temple'; return { cx: dx + v[0] * 0.5, cy: dy + v[1] * 0.5, ux: s === 'S' || s === 'N' ? 1 : 0, uy: s === 'S' || s === 'N' ? 0 : 1, vx: v[0], vy: v[1], hw: (tm ? 1.3 : 0.95) * 0.31, H: (tm ? 2.5 : 1.85) * 0.62 }; }
function doorOpenF(bi, b, now) {
  G.doorF = G.doorF || {}; G.doorT = G.doorT || {};
  const D = doorGeo(b), near = e => e && !e.npDead && Math.abs((e.rx ?? e.x) - D.cx) + Math.abs((e.ry ?? e.y) - D.cy) < 1.15 && dist(e.rx ?? e.x, e.ry ?? e.y, D.cx, D.cy) < 0.95;
  let want = 0; for (const id in G.players) if (near(G.players[id]) && (G.players[id].z || 0) < 0.5) { want = 1; break; }
  if (!want) for (const id in G.npcs) if (near(G.npcs[id])) { want = 1; break; }
  const dt = Math.min(0.1, (now - (G.doorT[bi] || now)) / 1000); G.doorT[bi] = now;
  const f = (G.doorF[bi] || 0) + (want - (G.doorF[bi] || 0)) * Math.min(1, dt * (want ? 9 : 3.5)); G.doorF[bi] = f < 0.01 ? 0 : f; return G.doorF[bi];
}
function drawDoorOpen(ctx, it) {
  const D = it.D, f = it.f, ox = G.view.ox, oy = G.view.oy, up = D.H * HV, P = (x, y, z = 0) => { const p = iso(x, y); return [p.sx + ox, p.sy + oy - z]; };
  const bl = P(D.cx - D.ux * D.hw, D.cy - D.uy * D.hw), br = P(D.cx + D.ux * D.hw, D.cy + D.uy * D.hw), sh = up - D.hw * 1.2 * HV * 0.55, tc = P(D.cx, D.cy, up);
  ctx.save(); if (it.al) ctx.globalAlpha = it.al;
  ctx.beginPath(); ctx.moveTo(bl[0], bl[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(br[0], br[1] - sh); ctx.quadraticCurveTo(tc[0] + (br[0] - bl[0]) * 0.5, tc[1] - 4, tc[0], tc[1]); ctx.quadraticCurveTo(tc[0] - (br[0] - bl[0]) * 0.5, tc[1] - 4, bl[0], bl[1] - sh); ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(0, tc[1], 0, bl[1]); g.addColorStop(0, 'rgba(10,6,3,' + (0.95 * f).toFixed(2) + ')'); g.addColorStop(1, 'rgba(40,26,14,' + (0.9 * f).toFixed(2) + ')'); ctx.fillStyle = g; ctx.fillRect(Math.min(bl[0], br[0]) - 2, tc[1] - 10, Math.abs(br[0] - bl[0]) + 4, bl[1] - tc[1] + 14);
  // luz de dentro (de dia mais clara, de noite a lareira)
  ctx.fillStyle = 'rgba(255,190,110,' + (0.12 * f).toFixed(2) + ')'; ctx.fillRect(Math.min(bl[0], br[0]), (bl[1] + tc[1]) / 2, Math.abs(br[0] - bl[0]), (bl[1] - tc[1]) / 2);
  // folha da porta girando para dentro a partir da dobradiça (lado direito)
  const a = f * 1.35, L = D.hw * 2, hx = D.cx + D.ux * D.hw, hy = D.cy + D.uy * D.hw, ex = hx - D.ux * L * Math.cos(a) - D.vx * L * Math.sin(a), ey = hy - D.uy * L * Math.cos(a) - D.vy * L * Math.sin(a);
  const h0 = P(hx, hy), e0 = P(ex, ey), h1 = P(hx, hy, up * 0.92), e1 = P(ex, ey, up * 0.92);
  ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(h1[0], h1[1]); ctx.closePath();
  ctx.fillStyle = '#6e4626'; ctx.fill(); ctx.strokeStyle = 'rgba(30,18,8,0.8)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.strokeStyle = 'rgba(60,60,64,0.9)'; ctx.lineWidth = 1; for (const t of [0.2, 0.75]) { ctx.beginPath(); ctx.moveTo(h0[0] + (h1[0] - h0[0]) * t, h0[1] + (h1[1] - h0[1]) * t); ctx.lineTo(e0[0] + (e1[0] - e0[0]) * t, e0[1] + (e1[1] - e0[1]) * t); ctx.stroke(); }
  ctx.restore();
}

// ---------- ouro do Tecelão: a moeda cai girando do alto, quica, fica pulsando com fios de luz; ao pegar, sobe em espiral até quem pegou ----------
function coinEvent(m, now) {
  G.coins = G.coins || {}; G.coinFx = G.coinFx || [];
  for (const c of m.add || []) G.coins[c.id] = { ...c, t0: now + (c.d || 0), seed: Math.random() * 10 };
  for (const [id, by, v] of m.del || []) { const c = G.coins[id]; delete G.coins[id]; if (c && by) G.coinFx.push({ x: c.x, y: c.y, by, v, t0: now }); if (by === G.myId && v) { G.coinSum = (G.coinSum || 0) + v; G.coinSumT = now; } }
}
function drawCoin(ctx, it, now) {
  const c = it.coin, t = (now - c.t0) / 1000; if (t < 0) return;
  const fall = 0.55, h = t < fall ? (1 - (t / fall) ** 2) * 70 : t < fall + 0.25 ? Math.sin((t - fall) / 0.25 * Math.PI) * 9 : t < fall + 0.4 ? Math.sin((t - fall - 0.25) / 0.15 * Math.PI) * 3 : 0;
  const spin = t < fall + 0.4 ? Math.cos(t * 18 + c.seed) : 1, pulse = 0.5 + Math.sin(now / 380 + c.seed) * 0.5, x = it.sx, y = it.sy - h, big = c.v >= 50 ? 1.35 : c.v >= 15 ? 1.15 : 1;
  ctx.save();
  // brilho no chão
  const g = ctx.createRadialGradient(it.sx, it.sy, 0, it.sx, it.sy, 11 * big); g.addColorStop(0, 'rgba(255,214,110,' + (0.28 + pulse * 0.22).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(it.sx, it.sy, 11 * big, 5.5 * big, 0, 0, 7); ctx.fill();
  // fios de luz dourada subindo (como os do manto do Tecelão)
  if (h < 1) { ctx.strokeStyle = 'rgba(255,226,140,' + (0.25 + pulse * 0.35).toFixed(2) + ')'; ctx.lineWidth = 0.6; for (let k = 0; k < 3; k++) { const ph = now / 600 + c.seed + k * 2.1, len = 9 + ((now / 40 + k * 13 + c.seed * 9) % 12); ctx.beginPath(); ctx.moveTo(x + (k - 1) * 1.6, y - 1); ctx.quadraticCurveTo(x + (k - 1) * 1.6 + Math.sin(ph) * 3, y - len * 0.5, x + (k - 1) * 2.2 + Math.sin(ph * 1.3) * 2, y - len); ctx.stroke(); } }
  // a moeda (deitada no chão; girando enquanto cai)
  const rw = 3.6 * big * Math.max(0.15, Math.abs(spin)), rh = h > 1 ? 3.6 * big : 1.9 * big;
  ctx.fillStyle = '#8a5a12'; ctx.beginPath(); ctx.ellipse(x, y + 0.7, rw, rh, 0, 0, 7); ctx.fill();
  const cg = ctx.createLinearGradient(x - rw, y - rh, x + rw, y + rh); cg.addColorStop(0, '#fff2b0'); cg.addColorStop(0.45, '#f2c040'); cg.addColorStop(1, '#b07a18'); ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,10,0.8)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(x, y, rw * 0.62, rh * 0.62, 0, 0, 7); ctx.stroke();
  // cintilar
  if (pulse > 0.85 || h > 1) { ctx.fillStyle = 'rgba(255,255,240,0.95)'; ctx.fillRect(x - rw * 0.4, y - rh * 0.5, 1, 1); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,180,0.6)'; ctx.fillRect(x - rw * 0.4 - 2, y - rh * 0.5, 5, 0.6); ctx.fillRect(x - rw * 0.4, y - rh * 0.5 - 2, 0.6, 5); }
  ctx.restore();
}
function drawCoinFx(ctx, now) {
  const ox = G.view.ox, oy = G.view.oy;
  G.coinFx = (G.coinFx || []).filter(f => now - f.t0 < 700);
  for (const f of G.coinFx) { const e = G.players[f.by]; if (!e) continue; const k = (now - f.t0) / 700, a = iso(f.x, f.y), b = iso(e.rx, e.ry), r = (1 - k) * 10, ang = k * 9;
    const x = a.sx + (b.sx - a.sx) * k + Math.cos(ang) * r + ox, y = a.sy + (b.sy - a.sy) * k - Math.sin(k * Math.PI) * 30 - k * 20 + Math.sin(ang) * r * 0.5 + oy;
    ctx.save(); ctx.globalAlpha = 1 - k * 0.6; ctx.fillStyle = '#f6cc48'; ctx.beginPath(); ctx.ellipse(x, y, 2.4, 2.4, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,230,150,0.5)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.restore(); }
  if (G.payFx && G.me) {   // salário do turno: sobe devagar em cima do personagem, com uma moeda girando
    const F = G.payFx, t = now - F.t0, D = 2600; if (t > D) G.payFx = null; else { const k = t / D, p = iso(G.me.rx, G.me.ry), x = p.sx + ox, y = p.sy + oy - 78 - Math.sqrt(k) * 30, a = k < 0.12 ? k / 0.12 : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1, sc = k < 0.12 ? 0.6 + 0.4 * (k / 0.12) + 0.15 * Math.sin(k / 0.12 * Math.PI) : 1;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.font = '700 10px "Cinzel", serif'; const tw = ctx.measureText('+' + F.v + ' ouro').width, cx0 = 4 - tw / 2 - 8, w = Math.abs(Math.cos(t / 160)) * 3.5 + 0.8; ctx.fillStyle = '#e8c45a'; ctx.strokeStyle = '#7a5a12'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx0, -3.5, w, 4, 0, 0, 7); ctx.fill(); ctx.stroke();
      pxText(ctx, '+' + F.v + ' ouro', 4, 0, '#ffe08a', 10, '"Cinzel", serif', '700'); if (F.own) pxText(ctx, 'rendeu no seu negócio', 4, 10, '#e8d8b0', 7, '"Cinzel", serif', '400');
      ctx.restore(); } }
  if (G.coinSum && now - G.coinSumT < 1600 && G.me) { const p = iso(G.me.rx, G.me.ry), k = (now - G.coinSumT) / 1600; ctx.save(); ctx.globalAlpha = 1 - k; pxText(ctx, '+' + G.coinSum + ' ouro', p.sx + ox, p.sy + oy - 70 - k * 14, '#ffe08a', 13, '"Cinzel", serif', '700'); ctx.restore(); } else if (G.coinSum && now - G.coinSumT >= 1600) G.coinSum = 0;
}
