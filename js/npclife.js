// ============================================================
//  NPCs VULNERÁVEIS NO CLIENTE — estados vindos do anfitrião (caído, morto, puxado, carregado),
//  sentinelas que andam, prisioneiros amarrados no poste e o que cada um carrega.
// ============================================================
function visEvent(m) {
  const add = v => { if (G.npcs[v.id]) return; G.npcs[v.id] = mkEnt({ id: v.id, kind: v.kind, name: v.name, x: v.x, y: v.y, isNpc: true, visible: true, dir: 0, trader: !!v.trader }); if (!NPCS.find(q => q.id === v.id)) NPCS.push({ id: v.id, kind: v.kind, name: v.name, x: v.x, y: v.y, transient: true }); };
  if (m.t === 'vspawn') { add(m.v); return true; }
  if (m.t === 'vlist') { for (const v of m.list) add(v); return true; }
  if (m.t === 'vgone') { delete G.npcs[m.id]; const k = NPCS.findIndex(q => q.id === m.id); if (k >= 0) NPCS.splice(k, 1); if (G.dialog && G.dialog.id === m.id) closeDialog(); return true; }
  return false;
}
function applyNpcRows(rows, now) {
  const seen = new Set();
  for (const [id, x100, y100, fl, onBack, carrying] of rows || []) {
    const e = G.npcs[id]; if (!e) continue; seen.add(id);
    e.srv = true; e.dragMode = fl & 64 ? 'lead' : (e.dragMode === 'lead' ? null : e.dragMode); e.npDown = !!(fl & 1); e.npDead = !!(fl & 2); e.dragged = !!(fl & 4); e.prone = !!(fl & 8); e.npWalk = !!(fl & 32); e.crawl = !!(fl & 128); e.npSleep = !!(fl & 256); e.pkg = !!(fl & 512); e.drunk = !!(fl & 1024); e.npDrawn = !!(fl & 2048);
    e.onBackBy = onBack || null; e.carrying = carrying || null;
    e.tx = x100 / 100; e.ty = y100 / 100;
    if (e.kind !== 'fruit' || e.npDown || e.npDead || e.dragged || e.onBackBy) { if (e._snap == null || Math.hypot(e.tx - e.rx, e.ty - e.ry) > 4) { e.x = e.rx = e.tx; e.y = e.ry = e.ty; } e._snap = 1; }
  }
}
// sentinelas e corpos de NPC deslizam até a posição do anfitrião
function updateNpcMotion(now, dt) {
  for (const id in G.npcs) {
    const e = G.npcs[id]; if (e.tx == null || (e.kind === 'fruit' && !e.npDown && !e.npDead && !e.dragged && !e.onBackBy)) continue;
    const dx = e.tx - e.rx, dy = e.ty - e.ry, d = Math.hypot(dx, dy);
    if (d > 0.01) { const k = Math.min(1, dt * 9); e.rx += dx * k; e.ry += dy * k; e.x = e.rx; e.y = e.ry; if (e.crawl && d > 0.004) { e.dir = dirFromVec(dx, dy, e.dir); e.crawlD = (e.crawlD || 0) + d * k; if (e.crawlD - (e.bloodD || 0) > 0.28) { e.bloodD = e.crawlD; addBlood(e.rx + (Math.random() - 0.5) * 0.2, e.ry + (Math.random() - 0.5) * 0.2, 0, 0.18 + Math.random() * 0.22, 90000); } }
    if (!e.npDown && !e.npDead && !e.dragged) { e.dir = dirFromVec(dx, dy, e.dir); e.walking = e.npWalk || d > 0.05; e.walkDist = (e.walkDist || 0) + d * k; } }
    else if (!e.npWalk) e.walking = false;
  }
}
// NPC caído ou morto: deitado; puxado: arrastado; nas costas de alguém: não aparece no chão
function drawNpcState(ctx, e, sx, sy, now) {
  if (e.onBackBy) return true;
  if (e.npSleep && !e.npDown && !e.npDead) { const s = npcSprite3D(e.kind, { dir: e.dir || 0, walk: -1, down: true }); ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy); if (typeof drawZzz === 'function') drawZzz(ctx, sx, sy - 22, now); return true; }   // dormindo
  if (!(e.npDown || e.npDead)) return false;
  if (typeof TOWS !== 'undefined' && TOWS['n:' + e.id] && drawTow(ctx, 'n:' + e.id, now)) return true;
  if (FALLS['n' + e.id] && e.npDead) { drawFall(ctx, FALLS['n' + e.id], sx, sy, now, 1, 0); return true; }
  const P = { dir: e.dragged && typeof dragDir === 'function' ? dragDir(e) : (e.dir || 0), walk: -1, down: true, prone: !!e.prone || !!e.crawl };
  if (e.crawl || (e.npDown && !e.npDead && !e.dragged)) { P.prone = true; P.crawl = e.crawl ? 1 + Math.floor(now / 260) % 4 : 5; }   // se arrastando (ou parado, com a mão estendida)
  if (e.npDown && !e.npDead && !e.dragged && Math.random() < 0.004) addBlood(e.rx, e.ry, 0, 0.3 + Math.random() * 0.2, 90000);
  const s = npcSprite3D(e.kind, P); ctx.imageSmoothingEnabled = true; pblit(ctx, s, sx, sy);
  if (e.npDead) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#5a0c0c'; ctx.beginPath(); ctx.ellipse(sx + 6, sy + 2, 14, 5, 0, 0, 7); ctx.fill(); ctx.restore(); }
  return true;
}
// alguém carregado nas costas de um NPC/monstro, ou NPC nas costas de um jogador
function drawNpcOnBack(ctx, carrier, sx, sy) {
  for (const id in G.npcs) { const n = G.npcs[id]; if (n.onBackBy !== carrier.id) continue; if (typeof TOWS !== 'undefined' && TOWS['n:' + id] && drawTow(ctx, 'n:' + id, performance.now())) continue; const s = npcSprite3D(n.kind, { dir: 2, walk: -1, down: true }); pblit(ctx, s, sx, sy - 70); }
}
// prisioneiro amarrado: poste de madeira com cordas, sentado no chão de costas para ele
function drawTied(ctx, e, sx, sy, now) {
  ctx.save(); ctx.fillStyle = '#4a3420'; ctx.fillRect(sx - 2, sy - 44, 4, 46); ctx.fillStyle = '#3a2814'; ctx.fillRect(sx - 3, sy - 46, 6, 3);
  const s = heroSprite3D(e.cls, e.skin, e.color, { dir: e.dir || 0, walk: -1, sit: 'g', tied: 1 }); ctx.imageSmoothingEnabled = true; pblit(ctx, woundOf(s, 3), sx, sy + 2);
  ctx.strokeStyle = '#c8a870'; ctx.lineWidth = 1.2; for (const yy of [-22, -16]) { ctx.beginPath(); ctx.ellipse(sx, sy + yy, 7, 2.5, 0, 0, 7); ctx.stroke(); }
  if (e === G.me) { const k = Math.min(1, (e.esc || 0) / 100); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 22, sy - 64, 44, 6); ctx.fillStyle = '#e8c45a'; ctx.fillRect(sx - 21, sy - 63, 42 * k, 4); ctx.fillStyle = '#fff'; ctx.font = 'bold 7px serif'; ctx.textAlign = 'center'; ctx.fillText('Martele ESPAÇO para soltar as cordas', sx, sy - 68); }
  ctx.restore();
}
function tiedNear() { const me = G.me; for (const id in G.players) { const q = G.players[id]; if (q !== me && q.tied && dist(q.rx, q.ry, me.x, me.y) < 1.8) return q; } return null; }

// ---------- reação ao Tecelão: surpresa, depois adoração ou ânimo, e curiosidade (seguem com o olhar) ----------
const REACT_RANGE = 7, REACT_CD = 60000, LOOK_MS = 12000;
function weaverNear(e) { for (const id in G.players) { const q = G.players[id]; if (q.skin === 'weaver' && q.visible !== false && dist(q.rx, q.ry, e.rx, e.ry) < REACT_RANGE) return q; } return null; }
function npcReactions(now) {
  for (const id in G.npcs) {
    const e = G.npcs[id]; if (e.npDead || e.npDown || e.dragged || e.onBackBy || e.sleepB || (e.custP && e.custP.down)) continue;
    const w = weaverNear(e);
    if (w && now - (e.reactT || -1e9) > REACT_CD) {
      e.reactT = now; e.lookAt = w.id; e.lookUntil = now + LOOK_MS;
      e.anim = { a: 'surprise', t0: now, ms: 1000 }; e.bubble = { t: '!', until: now + 1400 };
      const next = e.kind === 'guard' || e.kind === 'captain' ? 'adore' : Math.random() < 0.55 ? 'adore' : 'cheer';
      later(1100, () => { if (e.npDead || e.npDown) return; e.anim = { a: next, t0: performance.now(), ms: ACT_MS[next] }; e.bubble = { t: next === 'adore' ? '✦' : '♪', until: performance.now() + 2400 }; });
    }
    if (e.lookUntil > now) {   // curiosos: viram para ele enquanto ele estiver por perto
      const q = G.players[e.lookAt]; if (q && dist(q.rx, q.ry, e.rx, e.ry) < REACT_RANGE + 3) { if (!e.walking) e.dir = dirFromVec(q.rx - e.rx, q.ry - e.ry, e.dir); if (!e.anim || now - e.anim.t0 > (e.anim.ms || 900)) { if (Math.random() < 0.004) e.bubble = { t: '?', until: now + 1200 }; } } else e.lookUntil = 0;
    }
  }
}
function drawNpcBubble(ctx, e, sx, sy, now) {
  if (e.custP && e.custP.doze && typeof drawZzz === 'function') drawZzz(ctx, sx, sy - 30, now);
  if (!e.bubble || now > e.bubble.until) return;
  const k = 1 - Math.max(0, (e.bubble.until - now - 200) / 1200), y = sy - (e.npDown ? 30 : 70) - Math.sin(Math.min(1, k * 3) * Math.PI) * 3, long = e.bubble.t.length > 3;
  ctx.save(); ctx.font = long ? 'italic bold 9px serif' : 'bold 12px serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,248,225,0.95)'; ctx.strokeStyle = 'rgba(40,24,10,0.9)'; ctx.lineWidth = 3;
  ctx.strokeText(e.bubble.t, sx, y); ctx.fillText(e.bubble.t, sx, y); ctx.restore();
}

// ---------- a presença do Tecelão faz brotar plantinhas e flores no chão onde ele fica parado (só em grama, terra e areia) ----------
G.flora = [];
const FLORA_OK = new Set([T.GRASS, T.DIRT, T.SAND, T.FOREST]);
function weaverFloraTick(now) {
  for (const id in G.players) {
    const e = G.players[id]; if (e.skin !== 'weaver' || !e.visible || (e.z || 0) >= 0.5) continue;
    const moving = e.walking || (e._fx != null && Math.hypot(e.rx - e._fx, e.ry - e._fy) > 0.05); if (moving) { e._fx = e.rx; e._fy = e.ry; e._still = now; continue; }
    if (e._still == null) e._still = now; if (now - e._still < 3000 || now < (e._floraT || 0)) continue;
    e._floraT = now + 380 + Math.random() * 300;
    if (G.flora.filter(f => !f.wilt && Math.hypot(f.x - e.rx, f.y - e.ry) < 2).length >= 22) continue;
    const a = Math.random() * Math.PI * 2, r = 0.25 + Math.sqrt(Math.random()) * 1.35, x = e.rx + Math.cos(a) * r, y = e.ry + Math.sin(a) * r, i = tileAt(x, y);
    if (!FLORA_OK.has(WORLD.ground[i]) || WORLD.bld[i] >= 0 || WORLD.rdir[i] && WORLD.ground[i] !== T.GRASS) continue;
    G.flora.push({ x, y, t0: now, k: Math.random() < 0.45 ? 'sprout' : 'flower', c: ['#f4f0e8', '#f2d860', '#e8a0c0', '#b8c8f0'][Math.floor(Math.random() * 4)], s: 0.7 + Math.random() * 0.6, rot: Math.random() * 6.28, wilt: 0, src: id });
  }
  for (const f of G.flora) { const e = G.players[f.src]; if (!f.wilt && (!e || e.skin !== 'weaver' || Math.hypot(e.rx - f.x, e.ry - f.y) > 2.2 || (e._still && now - e._still < 200))) f.wilt = now; }
  G.flora = G.flora.filter(f => !f.wilt || now - f.wilt < 20000);
  if (G.flora.length > 160) G.flora.splice(0, G.flora.length - 160);
}
function drawWeaverFlora(ctx, ox, oy, now) {
  if (!G.flora.length) return; ctx.save();
  for (const f of G.flora) {
    const grow = Math.min(1, (now - f.t0) / 2500), w = f.wilt ? Math.max(0, 1 - (now - f.wilt) / 20000) : 1, k = grow * (0.4 + 0.6 * w), p = iso(f.x, f.y), x = p.sx + ox, y = p.sy + oy;
    if (k <= 0.02) continue; ctx.globalAlpha = 0.85 * (f.wilt ? w : 1);
    const hgt = 4.5 * k * f.s, droop = f.wilt ? (1 - w) * 2.5 : 0;
    ctx.strokeStyle = f.wilt ? '#7a8a4a' : '#5a9a3a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + droop, y - hgt * 0.6, x + droop * 1.5, y - hgt); ctx.stroke();
    ctx.fillStyle = f.wilt ? '#8a9a52' : '#6ab84a';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sd * 1.3 * k, y - hgt * 0.45, 1.3 * k, 0.6 * k, sd * 0.5, 0, 7); ctx.fill(); }
    if (f.k === 'flower' && grow > 0.5) { const fx = x + droop * 1.5, fy = y - hgt, pr = 1.1 * k * f.s; ctx.fillStyle = f.c; for (let q = 0; q < 5; q++) { const a = f.rot + q * 1.2566; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * pr, fy + Math.sin(a) * pr * 0.6, pr * 0.75, 0, 7); ctx.fill(); } ctx.fillStyle = '#f0b830'; ctx.beginPath(); ctx.arc(fx, fy, pr * 0.55, 0, 7); ctx.fill(); }
    if (!f.wilt && grow < 1 && Math.random() < 0.03) spawnPart('ember', p.sx + (Math.random() - 0.5) * 4, p.sy - hgt);
  }
  ctx.restore();
}

// caixote/pacote nos braços (mensageiros e o entregador do fornecedor)
function drawPackage(ctx, e, sx, sy, now) {
  if (!e.pkg || e.npDown || e.npDead) return; const bob = e.walking ? Math.abs(Math.sin((e.walkDist || 0) * 4)) * 1.2 : 0, x = sx + 3, y = sy - 25 - bob;
  ctx.save(); ctx.fillStyle = '#8a6438'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(x - 5, y - 2); ctx.lineTo(x, y - 4.5); ctx.lineTo(x + 5, y - 2); ctx.lineTo(x, y + 0.5); ctx.closePath(); ctx.fillStyle = '#b08a52'; ctx.fill(); ctx.stroke();   // tampa
  ctx.beginPath(); ctx.moveTo(x - 5, y - 2); ctx.lineTo(x, y + 0.5); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y + 3.5); ctx.closePath(); ctx.fillStyle = '#8a6438'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 5, y - 2); ctx.lineTo(x, y + 0.5); ctx.lineTo(x, y + 6); ctx.lineTo(x + 5, y + 3.5); ctx.closePath(); ctx.fillStyle = '#6e4e2a'; ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#c8a870'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x - 2.5, y - 3.2); ctx.lineTo(x + 2.5, y - 0.8); ctx.stroke();   // barbante
  ctx.restore();
}
