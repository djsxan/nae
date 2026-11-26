// ============================================================
//  AFETO, lista 7 (pedido de 26/11)
//  · Colo em todos os lugares (sentados, cama com ele recostado, dentro d'água, na beira) e quem senta: no 💞 Afeto,
//    "Sentar no seu colo" e "Chamar para o meu colo" (com e sem beijo).
//  · Atração: o Apaixonado fica mais forte com o cônjuge, com a intimidade (gestos trocados ao longo dos dias), com o
//    cônjuge NPC de bom humor e com nobres de casas que gostam de você.
//  · Conversas na cama: o cônjuge NPC conta notícias e segredos da casa; a moça da Casa de Veludo conta segredos dos
//    clientes; dois jogadores conversam e descansam melhor.
//  · Casa de Veludo: no colo ela ergue a taça, se anima com a música ou mexe no cabelo dele; até 3 moças na mesa; bandeja
//    de garrafas trazida pela Jade (150, 15 min: elas bebem em copos, ficam e atraem mais; às vezes levantam e dançam).
// ============================================================
const AF4 = { str: [0.1, 0.55, 2.7, 0.3], wrap: [-1.1, 1.0, 2.3, 0], lookR: 1.8, lookMax: 0.6, lookSign: 1, wallDir: 1, wallHips: 0.3, wallHugStand: 0, tray: 150, trayMs: 900000, girls: 3, nextGirl: [60000, 120000], nextGirlTray: [20000, 40000], danceMs: 12000, talkMs: 45000, bedRest: 180000 };
const AF4_LAP = { Lap: ['Chamar para o meu colo', 'quer que você sente no colo', '😊'], LapK: ['Beijo no meu colo', 'quer que você sente no colo para um beijo', '💋', 6500], LapMe: ['Sentar no seu colo', 'quer sentar no seu colo', '😊'], LapMeK: ['Beijo no seu colo', 'quer sentar no seu colo para um beijo', '💋', 6500] };
for (const [pre, ctx] of [['s', 'seat'], ['w', 'water'], ['e', 'edge'], ['b', 'bed']]) for (const suf in AF4_LAP) { const k = pre + suf, [n, a, i, d] = AF4_LAP[suf]; AF2.K[k] = [ctx, n, a, i, d]; AFX.n[k] = n; AFX.ask[k] = a; AFX.i[k] = i; if (d) AFX.dur[k] = d; if (!AFF_KS.includes(k)) AFF_KS.push(k); const L = AFF_CTX[ctx]; if (L && !L.includes(k)) L.push(k); }
AFX.sin.push('sLapK', 'sLapMeK', 'wLapK', 'wLapMeK', 'eLapK', 'eLapMeK', 'bLapK', 'bLapMeK', 'sLap', 'sLapMe', 'bLap', 'bLapMe');

// ---------------- SERVIDOR ----------------
/* atração: força do Apaixonado e intimidade com cada pessoa */
function af4Key(q) { return S.players[q.id] ? 'p:' + estOwner(q) : 'n:' + q.id; }
function af4Strength(p, q) { let m = 1; const key = estOwner(p), M = typeof mrOf === 'function' ? mrOf(key) : null;
  if (M && ((M.partner && S.players[q.id] && M.partner === estOwner(q)) || (M.kind === 'npc' && q.court === 'spouse' && q.mrKey === key))) { m += 0.5; if (M.kind === 'npc' && (M.mood ?? 70) >= 70) m += 0.25; }
  const I = (p.feats = p.feats || {}).intim || (p.feats.intim = {}), n = I[af4Key(q)] || 0; m += Math.min(0.5, n * 0.05);
  if (q.house && typeof hRec === 'function') { const F = (hRec().favor[key] || {})[q.house] || 0; if (F >= 30) m += 0.25; }
  return Math.min(2.5, m); }
if (typeof affStart === 'function') { const _asA4 = affStart; affStart = function (a, b, k) { _asA4(a, b, k); if (!a.aff || a.aff.w !== b.id) return; const now = now_();
  for (const [p, q] of [[a, b], [b, a]]) { if (!S.players[p.id]) continue; const I = (p.feats = p.feats || {}).intim || (p.feats.intim = {}), kk = af4Key(q); I[kk] = Math.min(99, (I[kk] || 0) + 1);
    const m = af4Strength(p, q); if (!(p.loveM >= m && buffOn(p, 'love'))) { p.loveM = m; if (m >= 1.5) tell(p, '💞 Apaixonado ' + (m >= 2 ? 'de verdade' : 'forte') + ' (×' + m.toFixed(2) + '): a atração entre vocês deixa o bônus maior.'); } } }; }
/* conversas na cama */
function af4BedTick(now) { for (const p of Object.values(S.players)) { const A = p.aff; if (!A || A.ctx !== 'bed' || p.sleep == null) { p._af4Bed = 0; continue; } if (!p._af4Bed) { p._af4Bed = now; continue; } if (now - p._af4Bed < AF4.talkMs) continue; p._af4Bed = now;
  const q = S.players[A.w] || S.npcs[A.w]; if (!q) continue; const key = estOwner(p), M = typeof mrOf === 'function' ? mrOf(key) : null;
  if (!S.players[q.id] && q.court === 'spouse' && M && M.kind === 'npc') { const hid = mr2SpHid(M), H = typeof hRec === 'function' ? hRec() : null, news = H && H.news ? H.news.find(x => typeof x === 'string' ? x.includes((HOUSE_BY[hid] || {}).n || '##') : (x.t || '').includes((HOUSE_BY[hid] || {}).n || '##')) || H.news[0] : null, nt = news ? (typeof news === 'string' ? news : news.t) : null;
    if (nt) tell(p, '💬 ' + q.name + ', baixinho: “' + nt + '”'); if (hid && hid !== 'crown' && Math.random() < 0.25 && typeof secGive === 'function') { const k = ['plan', 'gold', 'power', 'rel'][Math.floor(Math.random() * 4)]; secGive(p, hid, k, q.name + ' contou na cama'); tell(p, '🤫 ' + q.name + ' te contou um segredo da própria casa (' + (SEC_KN[k] || k) + ').'); } continue; }
  if (!S.players[q.id] && /^vl_/.test(q.id)) { p._af4VlSec = p._af4VlSec || {}; const vk = (p.vlVisit && p.vlVisit.until) || 0; if (p._af4VlSec[q.id] === vk) { tell(p, '💬 ' + q.name + ' ri baixinho e conta das manias dos clientes, sem dizer nomes.'); continue; } p._af4VlSec[q.id] = vk;
    if (typeof secRandom === 'function' && Math.random() < 0.6) { const vis = HOUSES.filter(h => typeof velVisiting === 'function' && velVisiting(h.id)), pick = secRandom(p, vis.length ? [vis[0].id, 'visit'] : null); if (pick) { secGive(p, pick[0], pick[1], q.name + ' contou no travesseiro'); tell(p, '🤫 ' + q.name + ', no travesseiro, conta um segredo de um cliente da casa.'); continue; } }
    tell(p, '💬 ' + q.name + ' fala da noite e dos lordes que passaram por aqui, mas guarda os nomes para si.'); continue; }
  if (S.players[q.id]) { near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'talk', txt: '💬', ms: 2600 }); p.buffs.rested = Math.max(p.buffs.rested || 0, now) + AF4.bedRest / 3; if (p.buffs.rested > now + AF4.bedRest * 5) p.buffs.rested = now + AF4.bedRest * 5; tell(p, '💬 Vocês conversam baixinho na cama: Bem descansado por mais tempo.'); sendStat(p); } } }
/* Casa de Veludo: até 3 moças, bandeja da Jade, dança e "mais uma rodada" */
function af4Tray(p) { return S.vlTray && S.vlTray[p.id] && now_() < S.vlTray[p.id].until ? S.vlTray[p.id] : null; }
function af4Girls(p) { return Object.keys(S.vlTable || {}).filter(g => S.vlTable[g].who === p.id); }
function af4VlTick(now) { if (!S.vlTable) return; const b = typeof velB === 'function' && velB('velvet'); if (!b) return;
  for (const g in S.vlTable) { const T = S.vlTable[g], n = S.npcs[g], p = S.players[T.who]; if (!n || !p) continue; const tr = af4Tray(p);
    if (tr) T.until = Math.max(T.until, tr.until);   /* com a bandeja ninguém pede bebida */
    if (p.aff && p.aff.w === g && /Lap/.test(p.aff.k) && now > (T.rodada || 0)) { T.rodada = now + 20000 + Math.random() * 15000; if (Math.random() < 0.45) empSay(n, ['Mais uma rodada!', 'Saúde, querido!', 'Ai, essa música!', 'Garçom! Mais vinho!'][Math.floor(Math.random() * 4)]); }
    if (!(p.aff && p.aff.w === g)) { if (tr && !T.dance && now > (T.danceT || 0) && Math.random() < 0.12) { T.dance = now + AF4.danceMs; T.danceT = now + 40000; empSay(n, ['Vem dançar comigo!', 'Essa é a minha música!', 'Olha só!'][Math.floor(Math.random() * 3)]); }
      if (T.dance && now < T.dance) { if (now > (T.danceA || 0)) { T.danceA = now + 3000; near(n.x, n.y, { t: 'anim', w: 'n', id: g, a: 'dance', ms: 3200 }); } } else T.dance = 0;
      if (tr && !T.dance && now > (T.sipT || 0)) { T.sipT = now + 22000 + Math.random() * 15000; near(n.x, n.y, { t: 'anim', w: 'n', id: g, a: 'cheer', ms: 1400 }); if (Math.random() < 0.4) near(n.x, n.y, { t: 'anim', w: 'n', id: g, a: 'talk', txt: '🍷 Saúde!', ms: 1500 }); } } }
  /* a Jade leva a bandeja */
  const R = S.vlTrayRun, j = S.npcs.vl_jade; if (R && j) { const p = S.players[R.who]; if (!p) { S.vlTrayRun = null; } else { const dt = Math.min(0.5, (now - (R.t || now)) / 1000); R.t = now; R.i = vl4Move(j, R.pts, R.i, dt);
    if (R.i >= R.pts.length) { if (!R.back) { S.vlTray = S.vlTray || {}; S.vlTray[p.id] = { until: now + AF4.trayMs, at: [j.x, j.y] }; near(j.x, j.y, { t: 'pzfx', k: 'tray', x: R.at[0], y: R.at[1], ms: AF4.trayMs }); near(j.x, j.y, { t: 'skt', id: 'vl_jade', on: 0 }); empSay(j, 'Uma bandeja para a mesa! Bebam devagar, meninas.'); tell(p, '🍾 A bandeja chegou: 15 minutos de bebida na mesa. As moças ficam, bebem e atraem mais companhia.'); R.back = 1; R.pts = R.pts.slice().reverse(); R.i = 0; }
      else { S.vlTrayRun = null; j.walking = false; } } } } }
/* a Jade anda pelo roteiro (a casa não a puxa de volta para o balcão) */
if (typeof vlPost === 'function') { const _vpA4 = vlPost; vlPost = function (T) { if (typeof S !== 'undefined' && S.npcs) { const n = S.npcs[T.id];
  if (T.id === 'vl_jade' && S.vlTrayRun && n) return { at: vl4Loc(n.x, n.y), fl: 0, sit: 0, dir: n.dir || 0 };
  const Tb = S.vlTable && S.vlTable[T.id]; if (Tb && Tb.dance && Date.now() < Tb.dance && Tb.seat != null && WORLD.seats[Tb.seat]) { const s = WORLD.seats[Tb.seat], [u, v] = vl4Loc(s.x, s.y), cu = 6.5, cv = 6; const du = cu - u, dv = cv - v, d = Math.hypot(du, dv) || 1; return { at: [u + du / d * 0.9, v + dv / d * 0.9], fl: 0, sit: 0, dir: s.dir }; } }
  return _vpA4(T); }; }
/* mais de uma moça: a próxima vem depois de um tempo (mais rápido com a bandeja) — o limite fica no laço de ofertas (veludo4.js) */
if (typeof velMsg === 'function') { const _vmA4 = velMsg; velMsg = function (p, m) { const now = Date.now();
  if (m && m.a === 'drink' && m.ok) { const before = af4Girls(p).length; const r = _vmA4(p, m); const after = af4Girls(p).length; if (after > before) { const tr = af4Tray(p), W = tr ? AF4.nextGirlTray : AF4.nextGirl; p._af4Next = now + W[0] + Math.random() * (W[1] - W[0]); } return r; }
  if (m && m.a === 'tray') { const s = typeof vl4BoothSeat === 'function' ? vl4BoothSeat(p) : null; if (!s || !p.sit || vlBooths().own[s.vb] !== estOwner(p)) { tell(p, 'Peça a bandeja sentado no seu reservado.'); return; } if (af4Tray(p) || S.vlTrayRun) { tell(p, 'A bandeja já está a caminho (ou na mesa).'); return; }
    const j = S.npcs.vl_jade; if (!j) { tell(p, 'A Jade não está no balcão agora.'); return; } if (!debit(estOwner(p), p, AF4.tray)) { tell(p, 'A bandeja custa ' + AF4.tray + ' de ouro.'); return; } sendStat(p);
    const b = velB('velvet'), [su, sv] = vl4Loc(s.x, s.y), tu = su + (6.5 - su) * 0.18, tv = sv + (6 - sv) * 0.18, [ax, ay] = localToWorld(b, tu, tv), [ju, jv] = vl4Loc(j.x, j.y);
    S.vlTrayRun = { who: p.id, at: [ax, ay], pts: [localToWorld(b, ju, Math.max(jv, 2.2)), localToWorld(b, 6.5, Math.max(jv, 2.2)), localToWorld(b, 6.5, tv), [ax, ay]], i: 0, t: now }; near(j.x, j.y, { t: 'skt', id: 'vl_jade', on: 1 }); empSay(j, 'Uma bandeja saindo para o reservado!'); tell(p, '🍾 Você pediu uma bandeja com várias garrafas (' + AF4.tray + '). A Jade já vem trazendo.'); p._af4Next = 0; return; }
  return _vmA4(p, m); }; }
/* o reservado avisa o cliente (para mostrar o botão da bandeja) */
function af4BoothTick() { for (const p of Object.values(S.players)) { const s = p.sit && typeof vl4BoothSeat === 'function' ? vl4BoothSeat(p) : null, on = !!(s && vlBooths().own[s.vb] === estOwner(p)); if (on !== !!p._af4Booth) { p._af4Booth = on; Net.toOne(p.id, { t: 'vlbooth', on: on ? 1 : 0, tray: AF4.tray }); } } }
if (typeof affTick === 'function') { const _atA4 = affTick; affTick = function (now) { _atA4(now); if (now - (S.af4T || 0) < 1000) return; S.af4T = now; try { af4BedTick(now); af4VlTick(now); af4BoothTick(); } catch (e) { console.warn('afeto4', e); } }; }

// ---------------- CLIENTE ----------------
/* colo em cada lugar: base de quem fica embaixo e quem senta */
function affLapCtx(k, c, e, o, RA, RB, dA, rel, A) { const me = /LapMe/.test(k), kiss = /K$/.test(k), lk = kiss ? 'sLapK' : 'sLap', base = me ? RB : RA, rider = me ? RA : RB, eb = me ? o : e, er = me ? e : o, V = (x, y, z) => new THREE.Vector3(x, y, z);
  if (c === 'seat') { affPose(base, eb, { sit: 'c', dir: dA }); affPose(rider, er, { sit: 'c', dir: dA }); affPut(base, dA, 0, 0); }
  else if (c === 'water') { affPose(base, eb, { sit: 'g', tub: 1, dir: 2 }); affPose(rider, er, { sit: 'g', tub: 1, dir: 2 }); affPut(base, 2, 0, 0, true); }
  else if (c === 'edge') { affPose(base, eb, { sit: 'c', edge: 1, dir: dA }); affPose(rider, er, { sit: 'c', edge: 1, dir: dA }); affPut(base, dA, 0, 0); }
  else { affPose(base, eb, { sit: 'g', dir: dA }); affPose(rider, er, { sit: 'c', dir: dA }); const y = affYaw(dA), f = V(Math.sin(y), 0, Math.cos(y)); affPut(base, dA, -f.x * 0.32, -f.z * 0.32, true); base.spine.rotation.x = -0.12; affStraddle(base, rider, kiss); return; }   /* na cama: ele recostado na cabeceira, ela por cima, de frente */
  affLap(base, rider, lk, A && A.fr || 0); }
/* cavaleira: de frente para ele, sentada sobre o quadril/coxas, um joelho de cada lado; no beijo se inclina para ele */
function affStraddle(base, rider, kiss) { const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), yb = base.root.rotation.y;
  const hb = W(base.hips), kn = W(base.LA.kn).add(W(base.LB.kn)).multiplyScalar(0.5), seat = hb.clone().lerp(kn, 0.3); seat.y = Math.max(W(base.LA.hp).y, W(base.LB.hp).y) + 0.12;
  rider.root.rotation.set(0, yb + Math.PI, 0); rider.root.position.set(0, 0, 0); rider.root.updateMatrixWorld(true); const hr = W(rider.hips); rider.root.position.set(seat.x - hr.x, seat.y - hr.y, seat.z - hr.z); rider.root.updateMatrixWorld(true);
  for (const [L, s] of [[rider.LA, -1], [rider.LB, 1]]) { L.hp.rotation.set(AF4.str[0], s * AF4.str[3], s * AF4.str[1]); L.kn.rotation.x = AF4.str[2]; if (L.ft) L.ft.rotation.x = 0.5; }   /* coxas abertas para os lados dele, joelhos dobrados, canelas para trás apoiadas na cama */
  rider.spine.rotation.set(kiss ? 0.25 : 0.05, 0, 0); rider.chest.rotation.set(kiss ? 0.2 : 0.02, 0, 0);
  const ha = W(base.head); if (kiss) { for (let r = 0; r < 4; r++) { const mid = affMouth(base).add(affMouth(rider)).multiplyScalar(0.5); lookAtP(base, affMouth(rider), 0.2); lookAtP(rider, affMouth(base), -0.25); affBend(base, affMouth, mid, [[-0.2, 0.3], [-0.2, 0.2], [-0.3, 0.3], [-0.15, 0.35], [-0.3, 0.3]]); affBend(rider, affMouth, mid, [[0, 0.6], [-0.15, 0.15], [-0.3, 0.3], [-0.2, 0.4], [-0.35, 0.35]]); } }
  else lookAtP(rider, ha, 0.15);
  for (const arm of ['A', 'B']) ikArm(rider, arm, affWP(base[arm === 'A' ? 'B' : 'A'].clav || base.chest, 0, 0.1, -0.05), [1.5, -0.6, 0.2, 1.3]);   /* braços no pescoço/ombros dele */
  ikArm(base, 'A', affWP(rider.spine, 0.1, 0.05, -0.13), [0.9, -0.6, 0, 1.3]); ikArm(base, 'B', affWP(rider.spine, -0.1, 0.05, -0.13), [0.9, -0.6, 0, 1.3]); }   /* ele segura a cintura dela */
/* piscina: ele de costas na parede de dentro, braços apoiados na borda; ela de frente, flutuando, braços no pescoço e pernas na cintura dele */
function affPoolWall(RA, RB, k, A, e, o, dA) { const V = (x, y, z) => new THREE.Vector3(x, y, z), W = j => j.getWorldPosition(V(0, 0, 0)), dir = AF4.wallDir;
  affPose(RA, e, { dir }); affPose(RB, o, { dir }); affPut(RA, dir, 0, 0); const ya = RA.root.rotation.y, fw = V(Math.sin(ya), 0, Math.cos(ya)), rt = V(Math.cos(ya), 0, -Math.sin(ya));
  /* braços dele na borda, atrás dos ombros */
  for (const [arm, s] of [['A', -1], ['B', 1]]) { const sh = W(RA[arm].sh); ikArm(RA, arm, sh.clone().add(fw.clone().multiplyScalar(-0.28)).add(rt.clone().multiplyScalar(s * 0.12)).add(V(0, 0.02, 0)), [-0.4, -1.0, 0, 1.6]); }
  if (k === 'wBelly' || k === 'wHug' && AF4.wallHugStand) { /* abraço: ela em pé, colada */ RB.root.rotation.set(0, ya + Math.PI, 0); RB.root.position.set(0, 0, 0); RB.root.updateMatrixWorld(true); const f0 = W(RA.hips).add(fw.clone().multiplyScalar(0.24)), h0 = W(RB.hips); RB.root.position.set(f0.x - h0.x, f0.y - h0.y - 0.02, f0.z - h0.z); RB.root.updateMatrixWorld(true); }
  else { /* pernas na cintura */ RB.root.rotation.set(0, ya + Math.PI, 0); RB.root.position.set(0, 0, 0); RB.root.updateMatrixWorld(true); const f0 = W(RA.hips).add(fw.clone().multiplyScalar(0.2)).add(V(0, 0.1, 0)), h0 = W(RB.hips); RB.root.position.set(f0.x - h0.x, f0.y - h0.y, f0.z - h0.z); RB.root.updateMatrixWorld(true);
    for (const [L, s] of [[RB.LA, -1], [RB.LB, 1]]) { L.hp.rotation.set(AF4.wrap[0], s * AF4.wrap[3], s * AF4.wrap[1]); L.kn.rotation.x = AF4.wrap[2]; } }
  if (k === 'wKiss') { for (let r = 0; r < 4; r++) { const mid = affMouth(RA).add(affMouth(RB)).multiplyScalar(0.5); lookAtP(RA, affMouth(RB), 0.3); lookAtP(RB, affMouth(RA), -0.3); affBend(RA, affMouth, mid, [[-0.2, 0.25], [-0.15, 0.15], [-0.3, 0.3], [-0.2, 0.35], [-0.3, 0.3]]); affBend(RB, affMouth, mid, [[-0.1, 0.4], [-0.15, 0.15], [-0.3, 0.3], [-0.2, 0.4], [-0.35, 0.35]]); } }
  else { const cl = RA.B.clav || RA.chest; affBend(RB, R => R.head.localToWorld(V(-0.06, 0, 0.05)), affWP(cl, 0, 0.12, 0.03), [[-0.1, 0.35], [-0.15, 0.15], [-0.3, 0.3], [-0.15, 0.25], [-0.2, 0.2]]); lookAtP(RA, W(RB.head), 0.15); }
  for (const arm of ['A', 'B']) ikArm(RB, arm, affWP(RA[arm === 'A' ? 'B' : 'A'].clav || RA.chest, 0, 0.1, -0.06), [1.5, -0.6, 0.2, 1.3]);   /* braços no pescoço dele */
  if (k === 'wBelly') affCaress(RB, RA, A && A.fr || 0);
  /* a água fica no peito: os dois descem até o quadril dele ficar na altura de quem está sentado no fundo */
  const drop = W(RA.hips).y - AF4.wallHips; for (const R of [RA, RB]) { R.root.position.y -= drop; R.root.updateMatrixWorld(true); } }
/* braço dela no colo: erguer a taça, animada com a música, mexer no cabelo dele */
function affLapArm(RA, RB, arm, fr, k) { if (k !== 'sLap' || !(fr >= 4)) { if (RB._cup) RB._cup.visible = false; return false; } const v = Math.floor(fr / 4) % 4, f = fr % 4, W = j => j.getWorldPosition(new THREE.Vector3()), V = (x, y, z) => new THREE.Vector3(x, y, z);
  if (!RB._cup) { const g = new THREE.Group(), gl = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }), wine = new THREE.MeshStandardMaterial({ color: 0x7a1424, roughness: 0.3 }); const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.022, 0.06, 10), gl); bowl.position.y = 0.06; g.add(bowl); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.035, 10), wine); w.position.y = 0.05; g.add(w); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), gl); st.position.y = 0.015; g.add(st); RB[arm].hand.add(g); RB._cup = g; RB._cupArm = arm; }
  if (RB._cupArm !== arm) { RB[arm].hand.add(RB._cup); RB._cupArm = arm; } RB._cup.visible = v === 1;
  const hb = W(RB.head), ha = W(RA.head);
  if (v === 1) { ikArm(RB, arm, hb.clone().add(V(0, 0.16 + 0.03 * Math.sin(f * Math.PI / 2), 0)).add(affWP(RB.chest, 0, 0, 0.12).sub(W(RB.chest)).multiplyScalar(1.4)), [2.2, -0.3, 0, 0.6]); return true; }   /* ergue a taça: "mais uma rodada!" */
  if (v === 2) { const sw = [0, 0.08, 0, -0.08][f]; ikArm(RB, arm, hb.clone().add(V(0, 0.08, 0)).add(affWP(RB.chest, 0.18 + sw, 0, 0.1).sub(W(RB.chest))), [1.8, 0.4, 0, 0.9]); return true; }   /* animada, balançando com a música */
  if (v === 3) { ikArm(RB, arm, ha.clone().lerp(hb, 0.25).add(V(0, 0.07 + 0.015 * f, 0)), [1.4, -0.6, 0, 1.4]); return true; }   /* mexe no cabelo dele */
  return false; }
/* quadros do colo (para o braço dela se mexer) */
if (typeof AFF_CARESS !== 'undefined') { const _ap2 = affPairSprite2; affPairSprite2 = function (e, o, A) { if (A && A.k === 'sLap' && o && o.isNpc) { const t = performance.now(), fr = (Math.floor(t / 7000) % 4) * 4 + Math.floor(t / 600) % 4; A = Object.assign({}, A, { _lapfr: fr }); }   /* a moça no colo: de vez em quando o braço se mexe */
  return _ap2(e, o, A); }; }
/* o botão da bandeja, sentado no seu reservado */
if (typeof progEvent === 'function') { const _peA4 = progEvent; progEvent = function (m, now) {
  if (m.t === 'vlbooth') { let b = document.getElementById('vl-tray'); if (!m.on) { if (b) b.remove(); return true; } if (!b) { b = document.createElement('button'); b.id = 'vl-tray'; b.className = 'vl-tray'; b.textContent = '🍾 Pedir uma bandeja (' + m.tray + ')'; b.onclick = () => Net.send({ t: 'vel', a: 'tray' }); document.body.appendChild(b); } return true; }
  return _peA4(m, now); }; }
if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = '.vl-tray{position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:55;padding:8px 14px;border-radius:10px;border:1px solid rgba(220,140,160,.6);background:rgba(40,14,20,.9);color:#f3e4d0;font:14px Georgia,serif;cursor:pointer}.vl-tray:hover{background:rgba(110,30,50,.95)}'; document.head.appendChild(st); }

/* sentados giram o tronco e a cabeça para quem está perto (menos cara de boneco) */
function af4LookTw(e) { const d = (e.dir || 0) * Math.PI / 4, sx = Math.sin(d), sy = Math.cos(d), fx = sy + sx / 2, fy = sy - sx / 2; let best = null, bd = AF4.lookR;
  for (const L of [G.players, G.npcs]) for (const id in L) { const o = L[id]; if (o === e || !o || o.rx == null || o.visible === false || (o.fl || 0) !== (e.fl || 0)) continue; const dd = Math.hypot(o.rx - e.rx, o.ry - e.ry); if (dd < 0.2 || dd > bd) continue; bd = dd; best = o; }
  if (!best) return 0; const dx = best.rx - e.rx, dy = best.ry - e.ry, ang = Math.atan2(fx * dy - fy * dx, fx * dx + fy * dy); if (Math.abs(ang) > 2.4) return 0; return Math.round(Math.max(-AF4.lookMax, Math.min(AF4.lookMax, ang * 0.5)) / 0.15) * 0.15; }
if (typeof heroPoseFor === 'function') { const _hpA4 = heroPoseFor; heroPoseFor = function (e, now) { const P = _hpA4(e, now); if (e && P.sit && !P.act && !e.aff && e.rx != null && typeof G !== 'undefined') { const t = af4LookTw(e); if (t) P.lkT = t * AF4.lookSign; } return P; }; }
if (typeof buildPose === 'function') { const _bpA4 = buildPose; buildPose = function (cls, P) { const Q = _bpA4(cls, P); if (P && P.lkT) { Q.tw = (Q.tw || 0) + P.lkT; Q.hw = (Q.hw || 0) + P.lkT * 1.3; } return Q; }; }
if (typeof pose3Key === 'function') { const _pkA4 = pose3Key; pose3Key = function (P) { return _pkA4(P) + (P && P.lkT ? '|lk' + P.lkT.toFixed(2) : ''); }; }
