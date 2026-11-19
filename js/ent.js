// ============================================================
//  GUARDIÃ DO MAGO (ent): a muda desperta e vira uma árvore que anda, luta e cresce
//  Carvalho (Terra), Salgueiro (Água) ou Cerejeira (Ar); 3 estágios; membros que caem e rebrotam
// ============================================================
const ENT_KIND = { earth: 'ent_oak', water: 'ent_willow', wind: 'ent_cherry' };
const ENT_NAME = { earth: 'Carvalho', water: 'Salgueiro', wind: 'Cerejeira' };
const ENT_NEED = [0, 45, 70, 90];   /* força da Terra para cada estágio */
const ENT_HP = [0, 260, 520, 1000], ENT_DMG = [0, [14, 24], [26, 40], [44, 66]];
const ENT_LOST = { armA: 2, armB: 4, legL: 8, legR: 16 };

// ---------------- SERVIDOR ----------------
function entList() { S.estate.ents = S.estate.ents || {}; return S.estate.ents; }
function entStageOf(p) { if (typeof elemStrength !== 'function') return 0; const v = elemStrength(p, 'earth'); return v >= ENT_NEED[3] ? 3 : v >= ENT_NEED[2] ? 2 : v >= ENT_NEED[1] ? 1 : 0; }
function entNid(key) { return 'ent_' + String(key).replace(/[^a-z0-9]/gi, '').slice(0, 24); }
function entPublic(key, r) { const n = S.npcs[entNid(key)]; return { id: entNid(key), k: r.k, st: r.st, lost: r.lost || 0, tw: r.tw || 0, sl: n && n.sleepEnt ? 1 : 0, own: r.ownName, hp: Math.round(n ? n.hp : r.hp), max: r.maxHp, dry: r.dry ? 1 : 0, mode: r.mode }; }
function entsSend(to) { const L = entList(), m = { t: 'ents', l: Object.keys(L).map(k => entPublic(k, L[k])) }; if (to) Net.toOne(to, m); else Net.toAll(m); }
function entSpawn(key, r) {
  const id = entNid(key); if (S.npcs[id]) return S.npcs[id];
  const n = { id, kind: ENT_KIND[r.k], name: ENT_NAME[r.k] + ' de ' + r.ownName, transient: true, entOf: key, x: r.x, y: r.y, z: 0, fl: 0, fb: -1, hp: r.hp, maxHp: r.maxHp, downed: null, dead: !!r.dry };
  S.npcs[id] = n; Net.toAll({ t: 'vspawn', v: visPublic(n) }); return n;
}
function entMsg(p, m) {
  const key = estOwner(p), L = entList();
  if (m.a === 'wake') {   /* despertar a muda (ritual de 8 s) */
    const sp = (S.estate.saps || []).find(s => s.owner === key); if (!sp) { tell(p, 'Você não tem uma muda plantada.'); return; }
    if (dist(p.x, p.y, sp.x, sp.y) > 2.2) { tell(p, 'Chegue perto da sua muda.'); return; }
    if (L[key] && !L[key].dry) { tell(p, 'Sua guardiã já está desperta. Só uma por vez.'); return; }
    const st = entStageOf(p); if (!st) { tell(p, 'A muda ainda não ouve você: a força da Terra precisa chegar a ' + ENT_NEED[1] + ' (agora ' + Math.floor(elemStrength(p, 'earth')) + ').'); return; }
    if (S.entWaking && S.entWaking[key]) return; (S.entWaking = S.entWaking || {})[key] = 1;
    p.sit = null; anim('p', p, 'kneelput', sp.x, sp.y); near(sp.x, sp.y, { t: 'entcut', x: sp.x, y: sp.y, k: sp.k, st, by: p.id }, VIEW_RADIUS + 6);
    setTimeout(() => { delete S.entWaking[key]; S.estate.saps = (S.estate.saps || []).filter(s => s !== sp); if (typeof sapsSend === 'function') sapsSend();
      const hp = ENT_HP[st]; L[key] = { k: sp.k, st, x: sp.x, y: sp.y, hp, maxHp: hp, lost: 0, tw: 0, regrow: {}, mode: 'follow', ownName: p.name, born: Date.now() }; estateSave();
      const n = entSpawn(key, L[key]); empSay(n, 'Brotei pessoal, fala comigo meu mago'); useGain(p, 'el_earth', 6); entsSend(); }, 8000);
    return; }
  const r = L[key]; if (!r || r.dry) return; const n = S.npcs[entNid(key)]; if (!n) return;
  if (m.a === 'order') {
    if (dist(p.x, p.y, n.x, n.y) > 4 && m.o !== 'attack') { tell(p, 'Chegue perto da sua guardiã.'); return; }
    if (m.o === 'follow') { r.mode = 'follow'; r.post = null; empSay(n, 'Vou com você, meu mago.'); }
    else if (m.o === 'guard') { r.mode = 'guard'; r.post = [n.x, n.y]; empSay(n, 'Ninguém passa por aqui.'); }
    else if (m.o === 'rest') { r.mode = 'rest'; empSay(n, 'Vou cochilar entre as árvores. Me chame quando precisar.'); }
    else if (m.o === 'attack') { const t = S.monsters[m.id]; if (!t) { tell(p, 'Escolha um inimigo.'); return; } r.mode = r.mode === 'attack' ? r.prevMode || 'follow' : r.mode; r.prevMode = r.mode; r.mode = 'attack'; n.entT = t.id; empSay(n, 'Deixa comigo!'); }
    estateSave(); entsSend(); }
}
let ENT_GROVES = null;
function entGrove(x, y) {   /* um grupo de árvores fora da cidade, perto, para dormir */
  if (!ENT_GROVES) { ENT_GROVES = []; const TR = new Set([O.TREE, O.PINE, O.OAK, O.BIRCH, O.WILLOW]); for (let ty = 4; ty < MAP_H - 4; ty += 3) for (let tx = 4; tx < MAP_W - 4; tx += 3) { let c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (TR.has(WORLD.obj[(ty + dy) * MAP_W + tx + dx])) c++; if (c >= 5 && !entNearCity(tx, ty) && WORLD.obj[ty * MAP_W + tx] === O.NONE) ENT_GROVES.push([tx + 0.5, ty + 0.5]); } }
  let best = null, bd = 1e9; for (const g of ENT_GROVES) { const d = dist(g[0], g[1], x, y); if (d < bd) { bd = d; best = g; } } return best || [x, y];
}
function entNearCity(x, y) { if (inSafe(x, y)) return true; for (const g of visGates()) if (dist(g[0], g[1], x, y) < 14) return true; return false; }   /* nunca chega perto dos portões */
function entHurt(n, r, dmg, src) {   /* dano na guardiã: pode perder um galho; morre como tronco seco (ou cinzas, se foi o fogo do dono) */
  if (r.dry || n.dead) return; n.hp -= dmg; r.hp = n.hp; near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'hurt', ms: 420 }); sfx(n.x, n.y, '-' + Math.round(dmg), src === 'fire' ? '#ff9a4a' : '#ff8a6a');
  if (dmg > n.maxHp * 0.1 && Math.random() < 0.3) { const free = Object.keys(ENT_LOST).filter(k => !(r.lost & ENT_LOST[k])); if (free.length) { const k = free[Math.floor(Math.random() * free.length)]; r.lost |= ENT_LOST[k]; r.regrow[k] = Date.now() + ESTATE_DAY_MS; near(n.x, n.y, { t: 'entbreak', id: n.id, part: k, x: n.x, y: n.y }); entsSend(); } }   /* um galho arrancado; rebrota em um dia do jogo */
  if (n.hp > 0) return;
  const q = Object.values(S.players).find(pp => estOwner(pp) === n.entOf), betrayed = src === 'fire' && q && n._lastFire === q.id;
  n.dead = true; r.dry = 1; r.hp = 0; estateSave();
  if (betrayed) {   /* queimada pelo próprio mestre: lamento e cinzas, sem semente */
    const lines = ['Mestre...? Por que o fogo?', 'Eu bebi da sua água... eu cresci por você...', 'Lembre-se de mim quando vir uma flor.'];
    lines.forEach((t, i) => setTimeout(() => { if (S.npcs[n.id]) empSay(n, t); }, i * 1800)); near(n.x, n.y, { t: 'entdie', id: n.id, ash: 1 }, VIEW_RADIUS + 6);
    setTimeout(() => { delete entList()[n.entOf]; visGone(n); estateSave(); entsSend(); if (q) tell(q, 'Sua guardiã virou cinzas nas suas próprias chamas. Não restou semente.'); }, 6500);
  } else {
    empSay(n, 'Meus galhos... secam...'); near(n.x, n.y, { t: 'entdie', id: n.id, ash: 0 }, VIEW_RADIUS + 6);
    if (q) { q.inv.entseed = (q.inv.entseed || 0) + 1; sendStat(q); tell(q, 'Sua guardiã caiu e virou um tronco seco. Ela deixou uma semente: use-a para plantar uma nova muda.'); }
    setTimeout(() => { delete entList()[n.entOf]; visGone(n); estateSave(); entsSend(); }, 120000);
  }
  entsSend();
}
function entTick(now) {
  const L = (S.estate && S.estate.ents) || {}; if (now - (S.entT || 0) < 100) return; const dt = Math.min(0.25, (now - (S.entT || now)) / 1000) || 0.1; S.entT = now;
  for (const key in L) { const r = L[key]; let n = S.npcs[entNid(key)]; if (!n) { n = entSpawn(key, r); }
    if (r.dry || n.dead) continue; const q = Object.values(S.players).find(pp => estOwner(pp) === key && !pp.dev);
    // crescer com o dono e rebrotar galhos
    if (q && now - (r.chkT || 0) > 5000) { r.chkT = now; const st = Math.max(r.st, entStageOf(q)); if (st > r.st) { r.st = st; n.maxHp = r.maxHp = ENT_HP[st]; n.hp = Math.min(n.maxHp, n.hp + ENT_HP[st] * 0.5); empSay(n, ['', '', 'Sinto a seiva subir... estou mais forte!', 'Minhas raízes alcançam o fundo da terra!'][st]); entsSend(); estateSave(); }
      for (const k in r.regrow) if (Date.now() > r.regrow[k]) { delete r.regrow[k]; r.lost &= ~ENT_LOST[k]; r.tw = (r.tw || 0) | ENT_LOST[k]; empSay(n, 'Brotou um galho novo!'); entsSend(); estateSave(); }   /* volta com galhinhos e folhas novas */
      if (n.hp < n.maxHp && !n.entFight) { n.hp = Math.min(n.maxHp, n.hp + n.maxHp * 0.01); r.hp = n.hp; } }
    const spd = [0, 1.6, 1.8, 2.0][r.st] * ((r.lost & 24) ? 0.6 : 1);
    // inimigo: o que o dono atacou, o que ataca o dono ou a própria guardiã, ou o alvo da ordem
    let m = n.entT && S.monsters[n.entT]; if (m && (m.hp <= 0 || dist(n.x, n.y, m.x, m.y) > 14 || entNearCity(m.x, m.y))) { m = null; n.entT = null; if (r.mode === 'attack') r.mode = r.prevMode || 'follow'; }
    if (!m && r.mode !== 'rest') for (const o of Object.values(S.monsters)) { if (o.hp <= 0 || (o.alt || 0) > 1 || entNearCity(o.x, o.y)) continue; const d0 = MON[o.type] || {}; if (d0.beh === 'flee' && !(q && o.aggro === q.id)) continue; const d = dist(n.x, n.y, o.x, o.y); if ((q && o.aggro === q.id && d < 12) || (d < 5 && (d0.aggro || 0) > 0)) { m = o; n.entT = o.id; break; } }
    n.entFight = !!m;
    if (m) { n.sleepEnt = false; const d = dist(n.x, n.y, m.x, m.y), reach = 1.3 + r.st * 0.35;
      if (r.st >= 2 && d > reach + 0.5 && d < 8 && now >= (n.throwT || 0)) { n.throwT = now + (r.st === 3 ? 3600 : 4800); const big = r.st === 3 && Math.random() < 0.5, log = big && r.k !== 'earth', fl = Math.round(260 + d * 70);   /* arremessa pedras, galhos e, no topo, pedras grandes e troncos */
        n.dir = dirFromVecS(m.x - n.x, m.y - n.y); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'atk_over', ms: 900, tx: m.x, ty: m.y }); near(n.x, n.y, { t: 'entthrow', id: n.id, x0: n.x, y0: n.y, x1: m.x, y1: m.y, ms: fl, big: big ? 1 : 0, log: log ? 1 : (r.k === 'wind' && !big ? 2 : 0), st: r.st });
        setTimeout(() => { if (!S.monsters[m.id]) return; const [a, b] = ENT_DMG[r.st], dmg = Math.round(rint(a, b) * (big ? 1.6 : 1)); m.hp -= dmg; near(m.x, m.y, { t: 'hit', k: 'm', id: m.id, x: m.x, y: m.y, dmg, ax: n.x, ay: n.y }); if (big && MON[m.type] && !MON[m.type].big) m.stunUntil = Math.max(m.stunUntil || 0, now_() + 1200); if (m.hp <= 0) { if (q) killMonster(m, q, 0); else { delete S.monsters[m.id]; near(m.x, m.y, { t: 'mdie', id: m.id, d: 0 }); } } }, 500 + fl); }
      else if (d > reach) npcWalk(n, m.x, m.y, spd, dt);
      else { n.walk = false; n.dir = dirFromVecS(m.x - n.x, m.y - n.y);
        if (now >= (n.nextAtk || 0)) { n.nextAtk = now + (r.k === 'wind' ? 1100 : r.k === 'water' ? 1400 : 1700); const stomp = r.st === 3 && r.k === 'earth' && Math.random() < 0.35;
          near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: stomp ? 'kick' : r.k === 'water' ? 'atk_slashL' : 'atk_slashR', ms: 900, tx: m.x, ty: m.y });
          setTimeout(() => { if (!S.monsters[m.id] || n.dead) return; const [a, b] = ENT_DMG[r.st]; const hitOne = (o, k) => { const dmg = Math.round(rint(a, b) * k); o.hp -= dmg; near(o.x, o.y, { t: 'hit', k: 'm', id: o.id, x: o.x, y: o.y, dmg, ax: n.x, ay: n.y }); if (o.hp <= 0) { if (q) killMonster(o, q, 0); else { delete S.monsters[o.id]; near(o.x, o.y, { t: 'mdie', id: o.id, d: 0 }); } } };
            if (stomp) { near(n.x, n.y, { t: 'entstomp', x: n.x, y: n.y }); for (const o of Object.values(S.monsters)) if (o.hp > 0 && dist(o.x, o.y, n.x, n.y) < 3) { hitOne(o, 0.8); if (!(MON[o.type] || {}).big) o.stunUntil = Math.max(o.stunUntil || 0, now_() + 1500); } }   /* pisão: o chão treme e derruba */
            else { hitOne(m, 1); if (r.k === 'water' && r.st >= 2 && S.monsters[m.id]) m.slowUntil = Math.max(m.slowUntil || 0, now_() + 2500); } }, 420); }   /* salgueiro: o laço de ramos prende */
        const d0 = MON[m.type] || {}; if (d0.dmg && d0.dmg[1] > 0 && now >= (n.hurtT || 0)) { n.hurtT = now + (d0.atk || 1500) + 200; entHurt(n, r, Math.round(rint(d0.dmg[0], d0.dmg[1]) * 0.7), 'mon'); } }
      continue; }
    // sem luta: o modo manda
    const tgt = r.mode === 'guard' && r.post ? r.post : r.mode === 'follow' && q && !(q.fl || 0) ? [q.x, q.y] : null;
    if (r.mode === 'rest' || !tgt || entNearCity(tgt[0], tgt[1]) || (q && (q.fl || 0))) {   /* dono na cidade (ou mandou descansar): dorme num bosque */
      const g = entGrove(n.x, n.y); if (dist(n.x, n.y, g[0], g[1]) > 0.8) { n.sleepEnt = false; npcWalk(n, g[0], g[1], spd, dt); } else { n.walk = false; if (!n.sleepEnt) { n.sleepEnt = true; entsSend(); } } continue; }
    if (n.sleepEnt) { n.sleepEnt = false; empSay(n, 'Hmm? Você voltou!'); entsSend(); }
    const d = dist(n.x, n.y, tgt[0], tgt[1]); if (d > (r.mode === 'guard' ? 0.6 : 2.4)) { const nx = n.x + (tgt[0] - n.x) * 0.3, ny = n.y + (tgt[1] - n.y) * 0.3; if (entNearCity(nx, ny)) { n.walk = false; continue; } npcWalk(n, tgt[0], tgt[1], spd * (d > 6 ? 1.4 : 1), dt); } else n.walk = false;
    r.x = n.x; r.y = n.y;
  }
  if (now - (S.entSendT || 0) > 4000) { S.entSendT = now; if (Object.keys(L).length) entsSend(); }
}
function entFlameHit(p, F, st, now) {   /* o jato de Chamas também queima a guardiã (e muito) */
  const L = (S.estate && S.estate.ents) || {}, ca = Math.cos(F.a), sa = Math.sin(F.a);
  for (const key in L) { const r = L[key], n = S.npcs[entNid(key)]; if (!n || n.dead || r.dry) continue; const dx = n.x - p.x, dy = n.y - p.y, al = dx * ca + dy * sa; if (al < 0.2 || al > st.R + 0.6 || Math.abs(-dx * sa + dy * ca) > 0.6 + al * 0.2) continue;
    n._lastFire = p.id; entHurt(n, r, Math.round(n.maxHp * 0.06 * st.F), 'fire'); near(n.x, n.y, { t: 'mburn', id: n.id, npc: 1, ms: 2000 }); if (Math.random() < 0.2) empSay(n, estOwner(p) === key ? ['Mestre, está me queimando!', 'Ai! O fogo não, mestre!'][Math.floor(Math.random() * 2)] : 'Fogo! FOGO!'); }
}

// ---------------- CLIENTE ----------------
if (typeof G !== 'undefined') G.ents = G.ents || {};
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peE = progEvent; progEvent = function (m, now) {
  if (m.t === 'ents') { const o = {}; for (const e of m.l || []) o[e.id] = e; G.ents = o; return true; }
  if (m.t === 'entcut') { G.entCut = { ...m, t0: now }; return true; }
  if (m.t === 'entthrow') { (G.entThrows = G.entThrows || []).push({ ...m, t0: now }); return true; }
  if (m.t === 'entstomp') { G.shake = Math.max(G.shake || 0, 10); if (G.view) { const p = iso(m.x, m.y); for (let k = 0; k < 30; k++) { const a = Math.random() * 6.28; spawnPart('dust', p.sx + Math.cos(a) * 20, p.sy + Math.sin(a) * 9, { vx: Math.cos(a) * 0.1, vy: -0.05 }); } } return true; }
  if (m.t === 'entbreak') { const e = G.npcs[m.id]; (G.entChips = G.entChips || []).push({ x: m.x, y: m.y, t0: now, part: m.part, k: e && e.kind }); return true; }
  if (m.t === 'entdie') { const e = G.npcs[m.id]; if (e) { e.entDie = { t0: now, ash: m.ash }; } return true; }
  return _peE(m, now); }; }
const ENT_LOOK = {
  ent_oak: { bark: '#5e4428', bark2: '#7a5a36', eye: '#ffc860', leaf: ['#2e6a1c', '#3e7e22', '#24561a'], P: { hipY: 1.0, legL: [0.55, 0.5], legR: [0.22, 0.17], legX: 0.42, torso: [1.5, 0.78], lean: 0.32, armL: [1.05, 0.95], armR: [0.22, 0.15], sh: 0.78, head: 0.42 } },
  ent_willow: { bark: '#5a5240', bark2: '#7a7058', eye: '#90e0ff', leaf: ['#5e8a6c', '#76a080', '#4a7458'], P: { hipY: 2.1, legL: [1.1, 1.05], legR: [0.11, 0.07], legX: 0.2, torso: [2.0, 0.3], lean: 0.04, armL: [1.1, 1.1], armR: [0.08, 0.05], sh: 0.33, head: 0.28 } },
  ent_cherry: { bark: '#2a1c18', bark2: '#4a3028', eye: '#ffc0d8', leaf: ['#e07894', '#f098b0', '#c85a7a'], P: { hipY: 1.4, legL: [0.75, 0.7], legR: [0.12, 0.08], legX: 0.22, torso: [1.6, 0.34], lean: 0.12, armL: [0.8, 0.75], armR: [0.09, 0.06], sh: 0.36, head: 0.3 } } };
const ENT_SC = [0, 0.62, 0.95, 1.55], ENT_K = [1, 1.25, 1.9, 2.9];   /* tamanho do corpo e do quadro de cada estágio */
let _entBark = {};
function entBarkTex(c1, c2, vert) { const key = c1 + c2; if (_entBark[key]) return _entBark[key]; const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const x = cv.getContext('2d'); x.fillStyle = c1; x.fillRect(0, 0, 128, 256); for (let i = 0; i < 80; i++) { x.strokeStyle = i % 2 ? c2 : 'rgba(0,0,0,.38)'; x.lineWidth = 1 + Math.random() * 3; x.beginPath(); const sx = Math.random() * 128; x.moveTo(sx, 0); for (let y = 0; y <= 256; y += 24) x.lineTo(sx + Math.sin(y / (vert ? 60 : 25) + i) * (vert ? 3 : 8), y); x.stroke(); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); t.encoding = THREE.sRGBEncoding; return (_entBark[key] = t); }
function buildEntRig(kind, st, twigs, dry) {   /* mesmas juntas dos personagens (A, B, LA, LB, spine, head, hips): todas as animações servem */
  const L = ENT_LOOK[kind], P = L.P, root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(ENT_SC[st] * 0.75);
  const bm = new THREE.MeshStandardMaterial({ map: entBarkTex(dry ? '#6a6058' : L.bark, dry ? '#8a8078' : L.bark2, kind === 'ent_willow'), roughness: 0.95 }), dark = mat(L.bark2, 'wood');
  const cyl = (L0, r0, r1) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L0, 8), bm); m.position.y = -L0 / 2; m.castShadow = true; return m; };
  const hips = new THREE.Group(); hips.position.y = P.hipY; body.add(hips); const spine = new THREE.Group(); spine.rotation.x = P.lean; hips.add(spine);
  const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12, r = kind === 'ent_oak' ? P.torso[1] * (0.85 + 0.25 * Math.sin(t * Math.PI)) : P.torso[1] * (1 - 0.3 * t) + (kind === 'ent_cherry' ? 0.04 * Math.sin(t * 12) : 0); prof.push(new THREE.Vector2(r, t * P.torso[0])); }
  spine.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 18), bm));
  const neckJ = new THREE.Group(); neckJ.position.y = P.torso[0]; spine.add(neckJ); const head = new THREE.Group(); neckJ.add(head);
  const hd = new THREE.Mesh(kind === 'ent_oak' ? new THREE.DodecahedronGeometry(P.head, 1) : new THREE.SphereGeometry(P.head, 14, 10), bm); hd.scale.set(1, kind === 'ent_willow' ? 1.3 : 0.95, 0.9); hd.position.set(0, P.head * 0.7, kind === 'ent_oak' ? 0.12 : 0); head.add(hd);
  const eyeM = mat('#000000', 'gem', { emissive: dry ? '#000000' : L.eye, emissiveIntensity: dry ? 0 : 2.4 }), oz = kind === 'ent_oak' ? 0.12 : 0;
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(P.head * 0.16, 10, 8), eyeM); e.position.set(s * P.head * 0.36, P.head * 0.8, P.head * 0.85 + oz); head.add(e); const lid = new THREE.Mesh(new THREE.BoxGeometry(P.head * 0.5, P.head * 0.14, P.head * 0.3), dark); lid.position.set(s * P.head * 0.38, P.head * 1.02, P.head * 0.8 + oz); lid.rotation.z = s * (kind === 'ent_oak' ? -0.35 : -0.15); head.add(lid); }
  if (kind === 'ent_oak') for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 5), mat('#5a7a30', 'cloth')); m.position.set((i - 4) * 0.07, P.head * 0.15, P.head * 0.85 + oz); m.rotation.x = Math.PI + 0.25; head.add(m); }   /* barba de musgo */
  const twigLeaves = (parent, L0) => { for (let i = 0; i < 4; i++) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.3, 4), bm); g.position.set(0, -L0 * (0.3 + i * 0.15), 0); g.rotation.z = (i % 2 ? 1 : -1) * 0.9; parent.add(g); const lf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), mat(L.leaf[i % 3], 'cloth')); lf.scale.set(1.3, 0.5, 1); lf.position.set((i % 2 ? 1 : -1) * 0.14, -L0 * (0.3 + i * 0.15) + 0.1, 0); parent.add(lf); } };   /* membro que rebrotou: galhinhos com folhas novas */
  const arm = s => { const sh = new THREE.Group(); sh.position.set(s * P.sh, P.torso[0] * 0.88, 0); spine.add(sh); sh.add(cyl(P.armL[0], P.armR[0], P.armR[0] * 0.8)); const el = new THREE.Group(); el.position.y = -P.armL[0]; sh.add(el); el.add(cyl(P.armL[1], P.armR[0] * 0.8, P.armR[1])); const hand = new THREE.Group(); hand.position.y = -P.armL[1]; el.add(hand);
    const nf = kind === 'ent_oak' ? 3 : kind === 'ent_willow' ? 5 : 4, fl = kind === 'ent_oak' ? 0.32 : kind === 'ent_willow' ? 0.7 : 0.35; for (let f = 0; f < nf; f++) { const g = new THREE.Mesh(new THREE.CylinderGeometry(P.armR[1] * 0.18, P.armR[1] * 0.55, fl, 5), bm); g.position.set((f - (nf - 1) / 2) * P.armR[1] * 0.9, -fl / 2, 0); g.rotation.z = (f - (nf - 1) / 2) * 0.22; hand.add(g); }
    if (twigs & (s < 0 ? 2 : 4)) twigLeaves(el, P.armL[1]); return { sh, el, hand }; };
  const leg = s => { const hp = new THREE.Group(); hp.position.set(s * P.legX, 0, 0); hips.add(hp); hp.add(cyl(P.legL[0], P.legR[0], P.legR[0] * 0.85)); const kn = new THREE.Group(); kn.position.y = -P.legL[0]; hp.add(kn); kn.add(cyl(P.legL[1], P.legR[0] * 0.85, P.legR[1])); const ft = new THREE.Group(); ft.position.y = -P.legL[1]; kn.add(ft);
    for (let q = 0; q < 4; q++) { const a = (q / 4) * Math.PI * 1.4 - 0.2, g = new THREE.Mesh(new THREE.CylinderGeometry(P.legR[1] * 0.2, P.legR[1] * 0.7, P.legL[1] * 0.45, 5), bm); g.position.set(Math.sin(a) * P.legR[1] * 1.6, -0.02, Math.cos(a) * P.legR[1] * 1.6); g.rotation.set(Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2); ft.add(g); }
    if (twigs & (s < 0 ? 8 : 16)) twigLeaves(kn, P.legL[1]); return { hp, kn, ft }; };
  const A = arm(-1), B = arm(1), LA = leg(-1), LB = leg(1);
  const crown = new THREE.Group(); head.add(crown); crown.position.y = P.head * 1.4; let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  if (!dry) { if (kind === 'ent_oak') for (let i = 0; i < 20; i++) { const a = rnd() * 6.28, r = 0.4 + rnd() * 1.6, l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + rnd() * 0.3, 0), mat(L.leaf[i % 3], 'cloth', { flatShading: true })); l.position.set(Math.cos(a) * r, 0.3 + rnd() * 0.4 - r * 0.12, Math.sin(a) * r * 0.8 - 0.2); l.scale.y = 0.65; crown.add(l); }
    else if (kind === 'ent_willow') for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = 0.15 + rnd() * 0.45, len = 1.6 + rnd() * 2.2, pts = [new THREE.Vector3(Math.cos(a) * r * 0.3, 0.1, Math.sin(a) * r * 0.3), new THREE.Vector3(Math.cos(a) * r, 0.15, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r * 1.4, -len * 0.5, Math.sin(a) * r * 1.4), new THREE.Vector3(Math.cos(a) * r * 1.5, -len, Math.sin(a) * r * 1.5)]; crown.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.03, 4), mat(L.leaf[i % 3], 'cloth'))); }
    else for (let tier = 0; tier < 3; tier++) { const y = 0.1 + tier * 0.55, R = 1.5 - tier * 0.35, ox = (tier - 1) * 0.35; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, l = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 6), mat(L.leaf[(i + tier) % 3], 'cloth')); l.scale.set(1.2, 0.35, 1); l.position.set(ox + Math.cos(a) * R * 0.6, y, Math.sin(a) * R * 0.45); crown.add(l); } }
    if (st >= 2) { if (kind === 'ent_oak') for (let i = 0; i < 6; i++) { const ac = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mat('#8a6a30', 'wood')); ac.position.set((rnd() - 0.5) * 2.4, 0.1, (rnd() - 0.5) * 1.6); crown.add(ac); }
      if (kind === 'ent_cherry') for (let i = 0; i < 4; i++) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat('#fff0d8', 'cloth', { emissive: '#ffb050', emissiveIntensity: 1.2 })); lamp.scale.y = 1.3; lamp.position.set((i - 1.5) * 0.7, -0.38, (i % 2 - 0.5) * 0.6); crown.add(lamp); }
      if (kind === 'ent_willow') for (let i = 0; i < 20; i++) { const dw = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), mat('#cff4ff', 'gem', { emissive: '#6ac8ff', emissiveIntensity: 0.8 })); dw.position.set((rnd() - 0.5) * 1.2, -rnd() * 2.5, (rnd() - 0.5) * 1.2); crown.add(dw); } }
    if (st >= 3) { const glow = mat('#000', 'gem', { emissive: kind === 'ent_willow' ? '#6ad0ff' : kind === 'ent_cherry' ? '#ffd070' : '#ffb040', emissiveIntensity: 1.6 }); for (let i = 0; i < 7; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.02), glow); const a = -0.8 + i * 0.27; g.position.set(Math.sin(a) * P.torso[1], 0.4 + (i % 3) * 0.35, Math.cos(a) * P.torso[1]); g.rotation.y = a; spine.add(g); } } }   /* runas acesas no ancião */
  else { for (let i = 0; i < 5; i++) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.6, 4), bm); g.position.set((i - 2) * 0.2, 0.2, 0); g.rotation.z = (i - 2) * 0.4; crown.add(g); } }   /* tronco seco: galhos pelados */
  const R = { root, hips, spine, chest: spine, head, neckJ, A, B, LA, LB, weapon: null, kind, entBody: body }; return R;
}
const _entRigs = new Map();
function entSprite3D(e, P) {
  const I = G.ents[e.id] || { st: 1, lost: 0, tw: 0, dry: 0 }, st = I.st || 1, key = e.kind + st + 't' + (I.tw || 0) + (I.dry ? 'd' : '');
  return cache3('en3|' + key + '|' + (I.lost || 0) + '|' + (I.sl ? 's' : '') + pose3Key(P), () => {
    let R = _entRigs.get(key); if (!R) { R = buildEntRig(e.kind, st, I.tw || 0, I.dry); _entRigs.set(key, R); }
    R.A.el.visible = !(I.lost & 2); R.B.el.visible = !(I.lost & 4); R.LA.kn.visible = !(I.lost & 8); R.LB.kn.visible = !(I.lost & 16);
    const Q = buildPose('knight', P); if (I.sl) { Q.tl = 0.5; Q.ht = 0.5; Q.aA = [0.3, 0.2, 0.3]; Q.aB = [0.3, 0.2, 0.3]; Q.lA = [1.1, -1.6]; Q.lB = [1.1, -1.6]; }   /* dormindo: sentada e curvada */
    if (I.dry) { Q.tl = 0.15; Q.ht = 0.4; Q.aA = [-0.2, 0.6, 0.2]; Q.aB = [-0.2, 0.6, 0.2]; }
    applyPose(R, Q, P, P.walk >= 0 ? P.walk / 12 * Math.PI * 2 : 0); return entShoot(R, P.dir | 0, ENT_K[st]);
  }, 'en|' + e.id + (P.dir | 0));
}
function entShoot(R, dir, K) {   /* foto num quadro maior (como o dragão), apoiando os pés no chão */
  const { renderer, scene, cam } = R3; const a = dir * Math.PI / 4, yaw = Math.atan2(0.5 * Math.sin(a), Math.cos(a)); R.root.rotation.set(0, yaw, 0); R.root.position.set(0, 0, 0); R.root.updateMatrixWorld(true);
  let minY = Infinity; const v = new THREE.Vector3(); for (const f of [R.LA.ft, R.LB.ft, R.hips]) { f.getWorldPosition(v); minY = Math.min(minY, v.y); } if (minY !== Infinity) R.root.position.y = -Math.min(minY, 0.6) + 0.03; R.root.updateMatrixWorld(true);
  const sv = [cam.left, cam.right, cam.top, cam.bottom]; cam.left *= K; cam.right *= K; cam.top *= K; cam.bottom *= K; cam.updateProjectionMatrix();
  const W = Math.round(FRAME_W * PXU * K), H = Math.round(FRAME_H * PXU * K); renderer.setSize(W, H, false); scene.add(R.root); renderer.render(scene, cam); scene.remove(R.root);
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(renderer.domElement, 0, 0);   /* copia antes de voltar o tamanho (mudar o tamanho apaga a imagem) */
  [cam.left, cam.right, cam.top, cam.bottom] = sv; cam.updateProjectionMatrix(); renderer.setSize(R3.W, R3.H, false);
  return { c, w: FRAME_W * K, h: FRAME_H * K, ax: FRAME_W * K / 2, ay: FOOT_Y * K, painted: true, hd: true };
}
function entNear() { const me = G.me; if (!me || me.downed) return null; for (const id in G.ents) { const I = G.ents[id], e = G.npcs[id]; if (!e || I.own !== me.name || I.dry) continue; if (Math.hypot(e.rx - me.x, e.ry - me.y) < 2.6 + (I.st || 1) * 0.5) return e; } return null; }
function sapNearMine() { const me = G.me; if (!me) return null; for (const s of G.saps || []) if (s.own === me.name && Math.hypot(s.x - me.x, s.y - me.y) < 2) return s; return null; }
function entMenu(e) {
  const I = G.ents[e.id]; if (!I) return; const opt = (o, ic, t, sub) => '<button class="lift-btn" data-o="' + o + '"><span class="lift-n">' + ic + '</span><span><b>' + t + '</b><br><small>' + sub + '</small></span></button>';
  const html = '<div style="padding:8px 14px 0;font-size:14px;opacity:.85">' + ['', 'Broto', 'Adulta', 'Anciã'][I.st] + ' · vida ' + I.hp + '/' + I.max + (I.lost ? ' · sem ' + Object.keys(ENT_LOST).filter(k => I.lost & ENT_LOST[k]).length + ' galho(s), rebrotando' : '') + '</div><div class="lift-list" style="padding-top:8px">' +
    opt('follow', '🌳', 'Me acompanhe', 'Anda com você fora da cidade e luta ao seu lado. Na cidade, ela espera dormindo num bosque.') + opt('guard', '📍', 'Guarde aqui', 'Fica neste ponto e enfrenta quem chegar.') + opt('rest', '💤', 'Descanse', 'Vai dormir no bosque mais perto até você chamar.') + opt('attack', '⚔', 'Ataque aquele alvo', 'Clique num inimigo para ela ir para cima.') + '</div>';
  const d = staffPanel('entmenu', ENT_NAME[{ ent_oak: 'earth', ent_willow: 'water', ent_cherry: 'wind' }[e.kind]] + ' · guardiã', html);
  d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o; d.remove(); if (o === 'attack') { G.entPick = true; showToast('Clique no inimigo (Esc cancela).'); return; } Net.send({ t: 'ent', a: 'order', o }); });
}
function drawEntFx(ctx, now) {   /* ritual do despertar, arremessos e lascas */
  const ox = G.view.ox, oy = G.view.oy;
  const C = G.entCut; if (C) { const t = (now - C.t0) / 1000; if (t > 9.5) G.entCut = null; else { const p = iso(C.x, C.y), x = p.sx + ox, y = p.sy + oy;
    const rk = Math.max(0, Math.min(1, t / 0.6) * (1 - Math.max(0, Math.min(1, (t - 5) / 1.5)))); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,240,110,' + (0.8 * rk).toFixed(2) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y, 34, 15, 0, 0, 7); ctx.stroke(); for (let k = 0; k < 10; k++) { const a = now / 900 + k * 0.628; ctx.fillStyle = 'rgba(190,255,150,' + rk.toFixed(2) + ')'; ctx.font = '7px serif'; ctx.fillText('ᚱᚢᚾᛖᛋ'[k % 5], x + Math.cos(a) * 34 - 2, y + Math.sin(a) * 15 + 2); }   /* runas */
      const ck = t > 1 && t < 5.5 ? Math.min(1, (t - 1) / 0.6) * (1 - Math.max(0, (t - 4.5))) : 0; if (ck > 0) { ctx.strokeStyle = 'rgba(200,255,130,' + (0.7 * ck * (0.6 + 0.4 * Math.sin(now / 90))).toFixed(2) + ')'; ctx.lineWidth = 1.2; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 11); ctx.stroke(); } } ctx.restore();   /* rachaduras */
      if (t > 1 && t < 4.6) { G.shake = Math.max(G.shake || 0, 3); if (Math.random() < 0.5) spawnPart('dust', p.sx + (Math.random() - 0.5) * 30, p.sy - Math.random() * 6, { vx: (Math.random() - 0.5) * 0.08, vy: -0.08 }); }
      if (t > 2.5 && R3.ok) { const grow = Math.min(1, (t - 2.5) / 2), pull = Math.max(0, Math.min(1, (t - 4.5) / 1)), st = C.st || 1, fake = { id: '_cut', kind: ENT_KIND[C.k] }; G.ents._cut = { st, lost: 0, tw: 0, dry: 0, sl: 0 }; const s = entSprite3D(fake, { dir: 1, walk: t > 6.5 && t < 7.2 ? Math.floor((t - 6.5) * 16) % 12 : -1, view: 'S' });
        const sc = 0.15 + 0.85 * (1 - Math.pow(1 - grow, 3)), sink = (1 - pull) * s.h * 0.3 * sc; ctx.save(); ctx.beginPath(); ctx.rect(x - 400, y - 600, 800, 600 + 4); ctx.clip(); ctx.translate(x, y + sink); ctx.scale(sc, sc); ctx.imageSmoothingEnabled = true; ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore(); }   /* a muda cresce, sai da terra */
      /* a fala aparece no balão normal de NPC */ } }
  G.entThrows = (G.entThrows || []).filter(T => now - T.t0 < T.ms + 900);
  for (const T of G.entThrows) { const k = (now - T.t0 - 500) / T.ms; if (k < 0 || k > 1) continue; const a = iso(T.x0, T.y0), b = iso(T.x1, T.y1), x = a.sx + (b.sx - a.sx) * k + ox, y = a.sy + (b.sy - a.sy) * k + oy - 40 * (1 - k) - Math.sin(Math.PI * k) * 50;
    ctx.save(); ctx.translate(x, y); ctx.rotate(k * 9); if (T.log) { ctx.fillStyle = T.log === 2 ? '#3a2418' : '#6a4a2a'; ctx.fillRect(-(T.big ? 14 : 8), -2.5, T.big ? 28 : 16, 5); ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.arc(T.big ? 14 : 8, 0, 2.5, 0, 7); ctx.fill(); } else { const r = T.big ? 7 : 3.2; ctx.fillStyle = '#8a8478'; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(-r * 0.4, -r); ctx.lineTo(r * 0.8, -r * 0.6); ctx.lineTo(r, r * 0.3); ctx.lineTo(0, r); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(-r * 0.3, -r * 0.6, r * 0.5, r * 0.3); } ctx.restore();
    if (k > 0.95 && !T.hitFx) { T.hitFx = 1; G.shake = Math.max(G.shake || 0, T.big ? 8 : 3); for (let q = 0; q < (T.big ? 20 : 8); q++) spawnPart('dust', b.sx + (Math.random() - 0.5) * 20, b.sy - Math.random() * 8, { vx: (Math.random() - 0.5) * 0.12, vy: -0.06 }); } }
  G.entChips = (G.entChips || []).filter(c => now - c.t0 < 1500); for (const c of G.entChips) if (!c.fx) { c.fx = 1; const p = iso(c.x, c.y); for (let q = 0; q < 16; q++) spawnPart('spark', p.sx + (Math.random() - 0.5) * 16, p.sy - 30 - Math.random() * 20, { color: 'rgba(120,80,40,A)' }); }   /* lascas do galho arrancado */
}
