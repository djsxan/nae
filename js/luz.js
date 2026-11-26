// ============================================================
//  ILUMINAÇÃO (lista 5): cada tipo de prédio com a sua luz à noite (taverna âmbar, termas azuladas,
//  castelo frio com tochas, casa simples na penumbra...), luz em círculos saindo das velas, lareiras,
//  braseiros e lustres de verdade, noite mais escura e dia com mais contraste.
//  LUZ.v: 4 = mapa de luz estilo Tibia (padrão, aprovado em 25/11); 0 = como era; 1–3 e 5 = versões de comparação.
//  No mapa de luz: alcance das fontes em casas, luz em volta do jogador, lua e tempo mudam a noite, relâmpagos na tempestade.
// ============================================================
const LUZ = { v: 4 };
try { const s = localStorage.getItem('nae-luz'); if (s != null && s !== '') LUZ.v = +s || 0; } catch (e) { }
/* perfis: cor da luz geral do cômodo (c), quanto da escuridão ela tira em cada versão (a) e o tamanho dela (r) */
const LUZ_P = {
  tavern: { c: '255,176,92', a: [0, 0.86, 0.52, 0.26], r: 0.9 }, club: { c: '255,160,80', a: [0, 0.78, 0.44, 0.20], r: 0.85 }, velvet: { c: '255,90,120', a: [0, 0.70, 0.37, 0.14], r: 0.8 },
  thermae: { c: '150,205,255', a: [0, 0.88, 0.56, 0.30], r: 1 }, temple: { c: '205,215,255', a: [0, 0.82, 0.48, 0.24], r: 1 }, castle: { c: '190,200,230', a: [0, 0.70, 0.34, 0.12], r: 0.8 },
  bank: { c: '255,222,170', a: [0, 0.88, 0.56, 0.30], r: 0.95 }, manor: { c: '255,210,160', a: [0, 0.80, 0.46, 0.22], r: 0.9 }, shop: { c: '255,214,165', a: [0, 0.86, 0.52, 0.28], r: 0.9 },
  steam: { c: '255,180,110', a: [0, 0.80, 0.46, 0.22], r: 0.9 }, jail: { c: '200,190,170', a: [0, 0.58, 0.26, 0.12], r: 0.75 }, house: { c: '255,196,130', a: [0, 0.68, 0.34, 0.12], r: 0.8 },
  greenhouse: { c: '210,255,200', a: [0, 0.83, 0.50, 0.26], r: 1 }, hotel: { c: '255,200,140', a: [0, 0.74, 0.40, 0.16], r: 0.85 }, smith: { c: '255,150,80', a: [0, 0.68, 0.34, 0.12], r: 0.8 } };
function luzProfile(b) { if (!b) return LUZ_P.house; if (b.deco === 'thermae') return LUZ_P.thermae; if (b.deco === 'velvet') return LUZ_P.velvet; if (b.deco === 'club') return LUZ_P.club; if (b.deco === 'steam') return LUZ_P.steam; if (b.deco === 'greenhouse') return LUZ_P.greenhouse;
  const k = b.kind; if (k === 'tavern') return LUZ_P.tavern; if (k === 'temple') return LUZ_P.temple; if (k === 'castle' || k === 'barracks' || k === 'kguard') return LUZ_P.castle; if (k === 'bank') return LUZ_P.bank; if (k === 'manor' || k === 'boutique') return LUZ_P.manor;
  if (k === 'shop' || k === 'fruithouse' || k === 'workshop') return LUZ_P.shop; if (k === 'jail') return LUZ_P.jail; if (k === 'hotel') return LUZ_P.hotel; if (k === 'smith') return LUZ_P.smith; return LUZ_P.house; }
/* fontes de luz: raio (px) e cor; h = altura acima do chão (px) */
const LUZ_SRC = { candles: [30, '255,190,110', 18], fireplace: [70, '255,140,60', 8], hearth: [80, '255,140,60', 8], brazier: [58, '255,150,70', 14], chandelier: [84, '255,214,150', 46], beamlamp: [56, '255,200,130', 40],
  andon: [40, '255,214,160', 16], redlantern: [44, '255,80,100', 30], stove: [42, '255,150,80', 10], forge: [76, '255,120,50', 10], irori: [52, '255,150,80', 6], glow: [46, '200,170,255', 20], orb: [44, '150,190,255', 22],
  tesla: [60, '130,190,255', 40], boiler: [44, '255,160,90', 18], glowplant: [40, '150,255,180', 14], altar: [52, '255,220,170', 20], tbench: [0], labrum: [46, '170,220,255', 12], tcascade: [60, '160,215,255', 20], fountain2: [56, '170,220,255', 12],
  cauldron: [36, '140,255,150', 10], distill: [30, '255,190,110', 16], lab: [34, '200,160,255', 18], bigscope: [0], torch: [44, '255,160,80', 30], clock: [0], steamclock: [0],
  vbooth: [40, '255,80,80', 34], vbar: [52, '255,170,80', 36], vstage: [70, '255,80,170', 24], vband: [44, '255,160,90', 24], vding: [24, '255,140,60', 10], vlift: [30, '255,210,120', 30], vdesk: [26, '120,230,140', 14], vtable: [36, '255,150,70', 30], vstraw: [30, '140,160,255', 30], vvoid: [70, '255,70,160', 4], vtea: [34, '255,170,210', 16] };
const LUZ_K = [0, 0.85, 1.1, 1.3];
const LUZ_T = { candles: 1.6, fireplace: 5, hearth: 5, brazier: 3.5, chandelier: 6, beamlamp: 4, andon: 2.5, redlantern: 3, stove: 3, forge: 5, irori: 3.5, glow: 3, orb: 3, tesla: 4.5, boiler: 3, glowplant: 2.5, altar: 3.5, labrum: 3, tcascade: 4, fountain2: 3.5, cauldron: 2.5, distill: 2, lab: 2.5, torch: 3, vbooth: 2.2, vbar: 3, vstage: 4, vband: 3, vding: 1.4, vlift: 2, vdesk: 1.5, vtable: 2.4, vstraw: 2.4, vvoid: 4, vtea: 2.2 };
const luzHexRgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(',');   /* '#ff3a3a' → '255,58,58' */
const LUZ_PX = 36;   /* uma casa na tela, em pixels do mundo (o zoom já vem na transformação do desenho) */   /* força das fontes em cada versão */
/* luz do cômodo onde você está: substitui a luz única e alaranjada */
function luzInside(b, ox, oy, day) { if (!LUZ.v) return false; LUZ.inAt = performance.now(); const P = luzProfile(b), me = G.me, fl = (me && me.fl) || 0, zoff = fl ? fl * (bldDims(b).H / floorsOf(b)) * HV : 0, v = Math.min(3, LUZ.v), map = LUZ.v >= 4;
  const c = iso(b.x + b.w / 2 - 0.5, b.y + b.h / 2 - 0.5); if (map) { const R0 = luzRoomOf(b); G.lights.push({ x: c.sx + ox, y: c.sy + oy - 20 - zoff, r: Math.max(b.w, b.h) * 24, c: R0[1], a: R0[0] * (LUZ.v === 5 ? 0.42 : 0.55), room: 1 }); } else G.lights.push({ x: c.sx + ox, y: c.sy + oy - 20 - zoff, r: Math.max(b.w, b.h) * 22 * P.r, c: P.c, a: P.a[v] });   /* mapa de luz: a luz geral do cômodo é fraca; quem ilumina são as fontes */
  let L = null; try { L = interiorLayout(b, fl); } catch (e) { } if (!L) return true;
  for (const f of L.F) { const S0 = LUZ_SRC[f.t]; if (!S0 || !S0[0]) continue; const [x, y] = localToWorld(b, f.i + (f.w || 1) / 2, f.j + (f.h || 1) / 2), p = iso(x, y);
    G.lights.push({ x: p.sx + ox, y: p.sy + oy - (S0[2] || 16) - zoff, r: S0[0] * (map ? 1.45 : v === 3 ? 0.9 : 1), rt: map ? LUZ_T[f.t] : 0, c: f.t === 'vbooth' && typeof VL_BC !== 'undefined' ? luzHexRgb(VL_BC[(f.c | 0) % VL_BC.length]) : S0[1], a: Math.min(1, 0.95 * LUZ_K[v]), flick: /fire|hearth|brazier|candle|forge|torch|stove|irori/.test(f.t) ? 1 : 0 }); }
  if (b.deco === 'thermae' && typeof THERMAE !== 'undefined' && !fl) for (const q of THERMAE.pools) { const [x, y] = localToWorld(b, (q.u0 + q.u1) / 2, (q.v0 + q.v1) / 2), p = iso(x, y); G.lights.push({ x: p.sx + ox, y: p.sy + oy, r: Math.max(q.u1 - q.u0, q.v1 - q.v0) * 16, c: q.k === 'hot' ? '170,215,255' : '120,190,255', a: 0.7 * LUZ_K[v] }); }   /* as piscinas brilham */
  return true; }
/* escuridão da noite: mais escura nas versões novas */
function luzDark(day) { return LUZ.v && LUZ.v < 4 ? Math.min(0.92, day.dark * [1, 1.05, 1.28, 1.5][LUZ.v]) : day.dark; }
/* correção de cor do dia: menos véu creme e mais contraste */
function luzGrade(ctx, W, H, day) { if (!LUZ.v) return false; const v = Math.min(3, LUZ.v === 4 ? 2 : LUZ.v === 5 ? 3 : LUZ.v);
  if (!day.night) { const mul = ['', 'rgb(236,220,198)', 'rgb(242,230,212)', 'rgb(246,236,222)'][v]; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = mul; ctx.fillRect(0, 0, W, H);
    if (v >= 2 && (typeof qLevelNow !== 'function' || qLevelNow() >= 3)) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = v === 2 ? 0.18 : 0.3; ctx.drawImage(ctx.canvas, 0, 0, W, H); ctx.globalAlpha = 1; }   /* contraste: a imagem por cima dela mesma */
    ctx.globalCompositeOperation = 'source-over'; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,200,130,' + (0.1 - v * 0.02) + ')'); g.addColorStop(0.45, 'rgba(255,190,110,0)'); g.addColorStop(1, 'rgba(30,18,10,' + (0.1 + v * 0.03) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (LUZ.v >= 4 && day.dark > 0.05) { ctx.globalCompositeOperation = 'source-over'; return true; }   /* o mapa de luz já tem a cor da noite: o véu azul por cima esverdeava a luz das fontes */
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = day.night ? 'rgba(50,70,150,' + [0, 0.3, 0.38, 0.45][v] + ')' : `rgba(${ATM.tint.map(Math.round).join(',')},${(0.25 + ATM.ta) * [1, 0.7, 0.55, 0.45][v]})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  return true; }
/* ---- modo "mapa de luz" (estilo Tibia / OTClient): a luz ambiente do mundo (cor e força) + cada fonte soma um círculo
   colorido com alcance em casas; o mapa MULTIPLICA a cena (escuro onde não chega luz, cores da cena tingidas onde chega).
   LUZ.v = 4 (ambiente médio) ou 5 (ambiente mais escuro) ---- */
const LUZ_MAP = document.createElement && document.createElement('canvas'), LUZ_MX = LUZ_MAP && LUZ_MAP.getContext('2d');
const LUZ_NIGHT = [74, 84, 118];   /* cor da noite (azul-acinzentado, como a luz do mundo à noite) */
const LUZ_ROOM = { tavern: [0.42, '255,190,120'], club: [0.36, '255,170,100'], velvet: [0.3, '220,90,120'], thermae: [0.5, '175,205,245'], temple: [0.44, '210,210,235'], castle: [0.3, '210,195,170'], bank: [0.45, '255,225,180'], manor: [0.38, '255,215,170'], shop: [0.42, '255,220,175'], steam: [0.36, '255,185,120'], jail: [0.2, '180,175,160'], house: [0.26, '255,200,140'], greenhouse: [0.45, '200,255,200'], hotel: [0.32, '255,205,150'], smith: [0.3, '255,160,90'] };
function luzRoomOf(b) { const P = luzProfile(b); for (const k in LUZ_P) if (LUZ_P[k] === P) return LUZ_ROOM[k] || LUZ_ROOM.house; return LUZ_ROOM.house; }
/* fase da lua: um ciclo a cada 8 dias do jogo (0 = lua nova, 1 = cheia) */
function luzMoon() { const d = Math.floor(gameNow() / DAY_CYCLE_MS); return (1 - Math.cos((d % 8) / 8 * Math.PI * 2)) / 2; }
const LUZ_MOON_N = ['Lua nova', 'Lua crescente', 'Quarto crescente', 'Lua quase cheia', 'Lua cheia', 'Lua quase cheia', 'Quarto minguante', 'Lua minguante'];
function luzMoonName() { return LUZ_MOON_N[Math.floor(gameNow() / DAY_CYCLE_MS) % 8]; }
/* relâmpago: na chuva forte, à noite, de vez em quando o céu clareia (dois clarões seguidos) */
function luzFlash(now, inside) { const rain = (typeof ATM !== 'undefined' && ATM.rain) || 0; if (rain > 0.55 && now > (LUZ.nextFlash || 0)) { if (LUZ.nextFlash) LUZ.flashAt = now; LUZ.nextFlash = now + 9000 + Math.random() * 22000; }
  const t = now - (LUZ.flashAt || -1e9); if (t > 700) return 0; const a = t < 90 ? 1 - t / 90 : t > 180 && t < 320 ? 0.75 * (1 - (t - 180) / 140) : 0; return a * (inside ? 0.35 : 1); }
function luzMapDraw(ctx, vw, vh, day, now) { if (LUZ.v < 4 || !LUZ_MX) return false;
  const k = Math.min(1, day.dark / 0.62), rain = (typeof ATM !== 'undefined' && ATM.rain) || 0, fog = (typeof ATM !== 'undefined' && ATM.fog) || 0, moon = luzMoon();
  const dk = Math.max(0.55, Math.min(0.92, (LUZ.v === 5 ? 0.86 : 0.74) + 0.08 - 0.22 * moon + 0.08 * rain + 0.04 * fog)), inside = performance.now() - (LUZ.inAt || 0) < 300, fl = luzFlash(now, inside) * k;
  const amb = Math.min(1, 1 - k * dk + fl * 0.6);   /* lua cheia clareia a noite; chuva e névoa escurecem; o relâmpago acende tudo por um instante */   /* força da luz do mundo: 1 de dia, ~0.25 à noite */
  const lw = Math.ceil(vw / 2), lh = Math.ceil(vh / 2); if (LUZ_MAP.width !== lw || LUZ_MAP.height !== lh) { LUZ_MAP.width = lw; LUZ_MAP.height = lh; }
  const X = LUZ_MX; X.setTransform(0.5, 0, 0, 0.5, 0, 0); X.globalCompositeOperation = 'source-over';
  const NC = inside ? [84, 82, 90] : LUZ_NIGHT, mix = (a, b, t) => Math.round(a + (b - a) * t), base = [mix(255, NC[0], k), mix(255, NC[1], k), mix(255, NC[2], k)].map(c => Math.round(c * amb + (1 - amb) * c * 0.15));
  const bs = fl > 0 ? base.map(c => Math.round(c + (235 - c) * fl * 0.55)) : base; X.fillStyle = 'rgb(' + bs.join(',') + ')'; X.fillRect(0, 0, vw, vh);
  X.globalCompositeOperation = 'lighter';
  const me = G.me; if (me && !me.dead && k > 0.05) G.lights.push({ x: vw / 2, y: vh / 2 + 30 - 14, rt: 2.2, c: '255,236,205', a: 0.5 });   /* a luz em volta de você: nunca fica no breu total */
  for (const L of G.lights) { const r = (L.rt ? L.rt * LUZ_PX : L.r * (L.room ? 2 : 2.3)) * (L.flick ? 0.94 + Math.sin(now / 70 + L.x) * 0.05 : 1); if (!(r > 0.1) || L.x < -r || L.y < -r || L.x > vw + r || L.y > vh + r) continue;
    const s = Math.min(1, (L.a == null ? 1 : L.a)) * k, g = X.createRadialGradient(L.x, L.y, 0, L.x, L.y, r); g.addColorStop(0, 'rgba(' + L.c + ',' + (0.95 * s) + ')'); g.addColorStop(0.55, 'rgba(' + L.c + ',' + (0.45 * s) + ')'); g.addColorStop(1, 'rgba(' + L.c + ',0)'); X.fillStyle = g; X.fillRect(L.x - r, L.y - r, r * 2, r * 2); }
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(LUZ_MAP, 0, 0, vw, vh);
  ctx.globalCompositeOperation = 'lighter'; for (const L of G.lights) { if (!(L.a >= 0.9) || L.r > 60) continue; const r = L.r * 0.7, g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, r); g.addColorStop(0, 'rgba(' + L.c + ',' + (0.12 * k) + ')'); g.addColorStop(1, 'rgba(' + L.c + ',0)'); ctx.fillStyle = g; ctx.fillRect(L.x - r, L.y - r, r * 2, r * 2); }   /* um brilho leve só no miolo das chamas */
  ctx.globalCompositeOperation = 'source-over'; return true; }
