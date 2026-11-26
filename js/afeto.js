// ============================================================
//  AFETO, versão 1 (pedido de 26/11) — sempre com consentimento, só entre jogadores (adultos).
//  Roda de emojis → 💞 Afeto: pegar pela mão, abraçar, ficar abraçados, beijo no rosto, na boca e na mão.
//  Cada gesto é um pedido (Aceitar / Recusar / Bloquear); nas configurações dá para desligar os pedidos.
//  Qualquer um dos dois para quando quiser (andar, ou 💔 na roda). Quem pegou pela mão conduz; o outro vai ao lado.
//  Durante abraços e beijos o par é desenhado numa foto só (os dois esqueletos na mesma cena, com IK das mãos).
//  Esqueleto novo para todos os bonecos: clavícula, peito girável (coluna em duas partes) e pescoço que tomba de lado
//  (ficam em zero quando nenhuma pose usa, então nada muda nas poses antigas).
//  Efeitos: Apaixonado (20 min: vida, mana e fôlego voltam um pouco mais rápido); para quem é casado, beijo ou ficar
//  abraçado com outra pessoa vira segredo de infidelidade.
// ============================================================
const AFX = { reach: 2.5, askMs: 20000, cd: 5000, buff: 1200000, combat: 8000,
  gap: { hand: 0.45, hug: 0.42, hold: 0.38, kissF: 0.5, kissM: 0.44, kissH: 0.8 },
  dur: { hug: 6000, kissF: 3500, kissM: 6500, kissH: 4500 },
  n: { hand: 'Pegar pela mão', hug: 'Abraçar', hold: 'Ficar abraçados', kissF: 'Beijo no rosto', kissM: 'Beijo na boca', kissH: 'Beijo na mão' },
  ask: { hand: 'quer pegar na sua mão', hug: 'quer te abraçar', hold: 'quer ficar abraçado com você', kissF: 'quer te dar um beijo no rosto', kissM: 'quer te beijar na boca', kissH: 'quer beijar a sua mão' },
  i: { hand: '🤝', hug: '🤗', hold: '💑', kissF: '😘', kissM: '💋', kissH: '🤚' }, sin: ['kissM', 'hold', 'kissF'] };
const AFF_KS = ['hand', 'hug', 'hold', 'kissF', 'kissM', 'kissH'];
const AFF_SR = [Math.SQRT1_2, -Math.SQRT1_2];   /* direção "direita da tela" no mapa */

// ---------------- SERVIDOR ----------------
function affFree(p) { return p && !p.downed && !p.bound && !p.carriedBy && !p.dragBy && !p.gripBy && !p.surrendered && !p.tied && p.sleep == null && !p.bath && !(p.jailUntil > now_()) && now_() - (p.lastCombat || 0) > AFX.combat; }
function affSend(p) { const A = p.aff; Net.toOne(p.id, A ? { t: 'affst', k: A.k, w: A.w, lead: A.lead, side: A.side, dir: A.dir } : { t: 'affst', k: null }); }
function affEnd(p, msg) { const A = p && p.aff; if (!A) return; const q = S.players[A.w]; p.aff = null; affSend(p); if (q && q.aff && q.aff.w === p.id) { q.aff = null; affSend(q); if (msg) tell(q, msg); } }
function affSpot(a, b, k) { const g = AFX.gap[k], d0 = (b.x - a.x) * AFF_SR[0] + (b.y - a.y) * AFF_SR[1], first = d0 < 0 ? -1 : 1;
  for (const s of [first, -first]) { const x = a.x + AFF_SR[0] * g * s, y = a.y + AFF_SR[1] * g * s; if (canStandZ(x, y, a.z || 0, 0.12, a.fl || 0, a.fb ?? -1)) return { x, y, s }; } return null; }
function affSin(a, b, k) { if (!AFX.sin.includes(k) || typeof mrOf !== 'function' || typeof mr2AddSin !== 'function') return; const day = estDay();
  for (const [p, q] of [[a, b], [b, a]]) { const kp = estOwner(p), kq = estOwner(q), M = mrOf(kp); if (!M || M.partner === kq) continue; p._affSin = p._affSin || {}; if (p._affSin[kq] === day) continue; p._affSin[kq] = day;
    mr2AddSin(kp, 'affection', p.name + ', cônjuge de ' + mr2SpouseN(M) + ', foi visto aos beijos e abraços com ' + q.name + '.', kq); } }
function affStart(a, b, k) { affEnd(a); affEnd(b); const now = now_();
  if (k === 'hand') { const sp = affSpot(a, b, k) || { x: b.x, y: b.y, s: 1 }; a.aff = { k, w: b.id, lead: 1, side: sp.s, t0: now, until: 0 }; b.aff = { k, w: a.id, lead: 0, side: -sp.s, t0: now, until: 0 }; }
  else { const sp = affSpot(a, b, k); if (!sp) { tell(a, 'Não há espaço aqui para isso.'); tell(b, 'Não há espaço aqui para isso.'); return; }
    b.x = sp.x; b.y = sp.y; b.z = a.z || 0; const da = sp.s > 0 ? 2 : 6, db = sp.s > 0 ? 6 : 2; a.dir = da; b.dir = db; b.walking = a.walking = false; b.sit = a.sit = null;
    Net.toOne(b.id, { t: 'tp', x: b.x, y: b.y, z: b.z, fl: b.fl || 0, fb: b.fb ?? -1 });
    const until = AFX.dur[k] ? now + AFX.dur[k] : 0; a.aff = { k, w: b.id, lead: 1, side: sp.s, dir: da, t0: now, until, ax: a.x, ay: a.y }; b.aff = { k, w: a.id, lead: 0, side: -sp.s, dir: db, t0: now, until, ax: b.x, ay: b.y }; }
  affSend(a); affSend(b);
  for (const p of [a, b]) { const had = buffOn(p, 'love'); p.buffs.love = now + AFX.buff; if (!had) tell(p, '💞 Apaixonado (20 min): vida, mana e fôlego voltam um pouco mais rápido.'); sendStat(p); }
  affSin(a, b, k); }
function affMsg(p, m) { const now = now_();
  if (m.a === 'stop') { if (p.aff) { tell(p, 'Você se afasta.'); affEnd(p, p.name + ' se afastou.'); } return; }
  if (m.a === 'ask') { const q = S.players[m.id], k = AFF_KS.includes(m.k) ? m.k : null; if (!k || !q || q === p) return;
    if (dist(p.x, p.y, q.x, q.y) > AFX.reach || (p.fl || 0) !== (q.fl || 0)) { tell(p, 'Chegue mais perto de ' + q.name + '.'); return; }
    if (!affFree(p)) { tell(p, 'Agora não dá.'); return; } if (!affFree(q)) { tell(p, q.name + ' não pode agora.'); return; }
    p._affAsk = p._affAsk || {}; if (now - (p._affAsk[q.id] || 0) < AFX.cd) { tell(p, 'Espere um pouco antes de pedir de novo.'); return; } p._affAsk[q.id] = now;
    q.affReq = { from: p.id, k, t: now }; Net.toOne(q.id, { t: 'affask', id: p.id, name: p.name, k }); tell(p, AFX.i[k] + ' Pedido enviado a ' + q.name + '.'); return; }
  if (m.a === 'ans') { const r = p.affReq; if (!r || r.from !== m.id || now - r.t > AFX.askMs + 3000) return; p.affReq = null; const a = S.players[r.from]; if (!a) return;
    if (!m.ok) { tell(a, m.off ? p.name + ' não está aceitando pedidos de afeto.' : p.name + ' recusou.'); return; }
    if (dist(p.x, p.y, a.x, a.y) > AFX.reach + 0.8 || (p.fl || 0) !== (a.fl || 0) || !affFree(a) || !affFree(p)) { tell(p, 'Não deu: vocês se afastaram.'); tell(a, 'Não deu: vocês se afastaram.'); return; }
    affStart(a, p, r.k); return; } }
function affTick(now) { for (const p of Object.values(S.players)) { const A = p.aff; if (!A) continue; const q = S.players[A.w];
  if (!q || !q.aff || q.aff.w !== p.id) { p.aff = null; affSend(p); continue; }
  if (!A.lead) continue;
  if (A.until && now > A.until) { affEnd(p); continue; }
  if (!affFree(p) || !affFree(q)) { affEnd(p, 'O gesto foi interrompido.'); tell(p, 'O gesto foi interrompido.'); continue; }
  if (A.k === 'hand' && (dist(p.x, p.y, q.x, q.y) > 2.2 || (p.fl || 0) !== (q.fl || 0))) { tell(p, 'Vocês soltaram as mãos.'); affEnd(p, 'Vocês soltaram as mãos.'); } } }
if (typeof handleMove === 'function') { const _hmA = handleMove; handleMove = function (p, m) { _hmA(p, m); const A = p && p.aff; if (!A || A.k === 'hand') return;
  const far = Math.hypot(p.x - A.ax, p.y - A.ay); if (far <= 0.3 || now_() - A.t0 < 1500) { p.x = A.ax; p.y = A.ay; p.dir = A.dir; p.walking = false; return; }
  tell(p, 'Você se afasta.'); affEnd(p, p.name + ' se afastou.'); }; }
/* fila de linhas do jogador: o gesto vai no fim ('k|parceiro|lead|lado') */
function affRow(p) { const A = p.aff; return A ? A.k + '|' + A.w + '|' + (A.lead ? 1 : 0) + '|' + A.side : 0; }
if (typeof BUFF_NAMES !== 'undefined') BUFF_NAMES.love = 'Apaixonado (vida, mana e fôlego voltam um pouco mais rápido)';

// ---------------- ESQUELETO NOVO (todos os bonecos) ----------------
(function () { if (typeof THREE === 'undefined' || typeof buildHumanoid !== 'function') return; const V = (x, y, z) => new THREE.Vector3(x, y, z);
  /* clavícula: um grupo entre o peito e o ombro (gira em zero = igual a antes) */
  const _bhA = buildHumanoid; buildHumanoid = function (L, opts) { const R = _bhA(L, opts); if (!R || !R.chest || !R.A || R.A.clav) return R;
    for (const [k, s] of [['A', -1], ['B', 1]]) { const sh = R[k].sh; if (!sh || sh.parent !== R.chest) continue; const cl = new THREE.Group(); cl.position.set(s * 0.07, sh.position.y - 0.01, 0); R.chest.add(cl); sh.position.sub(cl.position); cl.add(sh); R[k].clav = cl; } return R; };
  /* juntas novas: clavícula [sobe, avança], peito, pescoço e cabeça tombada */
  window.rigExtra = (R, X) => { for (const [k, s] of [['A', -1], ['B', 1]]) { const c = X['clav' + k] || [0, 0]; if (R[k].clav) R[k].clav.rotation.set(0, -s * c[1], -s * c[0]); }
    R.chest.rotation.x = X.tlc || 0; R.chest.rotation.y = X.twc || 0; if (R.neckJ) R.neckJ.rotation.set(X.nk || 0, 0, (X.roll || 0) * 0.4); R.head.rotation.z = (X.roll || 0) * 0.6; };
  window.rigReset = R => { for (const k of ['A', 'B']) if (R[k] && R[k].clav) R[k].clav.rotation.set(0, 0, 0); if (R.chest) R.chest.rotation.set(0, 0, 0); if (R.neckJ) R.neckJ.rotation.set(0, 0, 0); };
  const fk = (R, k, p) => { const s = k === 'A' ? -1 : 1; R[k].sh.rotation.set(-p[0], p[2], s * p[1], 'XZY'); R[k].el.rotation.set(-p[3], 0, 0); R[k].sh.updateMatrixWorld(true); return R[k].hand.getWorldPosition(V(0, 0, 0)); };
  /* IK do braço: [levantar, abrir, girar, cotovelo], busca por coordenadas; o cotovelo não dobra ao contrário */
  window.ikArm = (R, k, target, init) => { const p = (init || [0.6, -0.4, 0, 0.8]).slice(), lim = [[-0.6, 2.9], [-1.9, 1.2], [-1.3, 1.3], [0.05, 2.6]];
    const err = q => fk(R, k, q).distanceToSquared(target) + 0.0006 * q[2] * q[2];
    let best = err(p), st = 0.4; for (let it = 0; it < 140 && st > 0.004; it++) { let imp = false; for (let i = 0; i < 4; i++) for (const d of [st, -st]) { const q = p.slice(); q[i] = Math.min(lim[i][1], Math.max(lim[i][0], q[i] + d)); const e = err(q); if (e < best) { best = e; p.splice(0, 4, ...q); imp = true; } } if (!imp) st *= 0.55; }
    fk(R, k, p); return Math.sqrt(best); };
  /* olhar: a cabeça se vira para o ponto */
  window.lookAtP = (R, target, roll) => { const err = q => { R.head.rotation.set(q[0], q[1], (roll || 0) * 0.6, 'XZY'); R.head.updateMatrixWorld(true); const hp = R.head.getWorldPosition(V(0, 0, 0)), f = R.head.localToWorld(V(0, 0, 1)).sub(hp).normalize(); return 1 - f.dot(target.clone().sub(hp).normalize()); };
    let p = [0, 0], best = err(p), st = 0.3; for (let it = 0; it < 80 && st > 0.003; it++) { let imp = false; for (let i = 0; i < 2; i++) for (const d of [st, -st]) { const q = p.slice(); q[i] = Math.max(-0.9, Math.min(0.9, q[i] + d)); const e = err(q); if (e < best) { best = e; p = q; imp = true; } } if (!imp) st *= 0.55; } err(p); };
  /* inclinação automática: tronco e pescoço até a boca chegar ao ponto (alturas diferentes) */
  window.leanTo = (R, target) => { const mouth = () => { R.root.updateMatrixWorld(true); return R.head.localToWorld(V(0, -0.05, 0.1)); };
    const set = q => { R.spine.rotation.x = q[0] * 0.55; R.chest.rotation.x = q[0] * 0.45; if (R.neckJ) R.neckJ.rotation.x = q[1]; };
    const err = q => { set(q); return mouth().distanceToSquared(target) + 0.002 * q[1] * q[1]; };
    let p = [R.spine.rotation.x + R.chest.rotation.x, R.neckJ ? R.neckJ.rotation.x : 0], best = err(p), st = 0.2;
    for (let it = 0; it < 80 && st > 0.003; it++) { let imp = false; for (let i = 0; i < 2; i++) for (const d of [st, -st]) { const q = p.slice(); q[i] = Math.max(i ? -0.3 : -0.2, Math.min(0.6, q[i] + d)); const e = err(q); if (e < best) { best = e; p = q; imp = true; } } if (!imp) st *= 0.55; }
    set(p); return Math.sqrt(best); };
  window.wpt = (o, x, y, z) => { o.updateMatrixWorld(true); return o.localToWorld(V(x, y, z)); };
})();

// ---------------- O PAR NUMA FOTO SÓ ----------------
const GEST2 = {
  hug: { d: 0.14, A: { tl: 0.1, tlc: 0.1, clavA: [0.12, 0.3], clavB: [0.12, 0.3] }, B: { tl: 0.08, tlc: 0.08, clavA: [0.2, 0.25], clavB: [0.2, 0.25], roll: 0.25 },
    hands: (A, B) => ({ A: { A: wpt(B.chest, 0.06, -0.02, -0.17), B: wpt(B.spine, -0.08, 0.02, -0.16) }, B: { A: wpt(A.chest, -0.1, 0.16, -0.12), B: wpt(A.chest, 0.12, 0.14, -0.13) } }), look: (A, B) => ({ B: wpt(A.chest, -0.15, 0.32, 0.05) }) },
  hold: { d: 0.12, A: { tl: 0.12, tlc: 0.12, clavA: [0.1, 0.32], clavB: [0.1, 0.32] }, B: { tl: 0.14, tlc: 0.12, nk: 0.25, clavA: [0.15, 0.3], clavB: [0.15, 0.3], roll: 0.55 },
    hands: (A, B) => ({ A: { A: wpt(B.chest, 0.04, 0.04, -0.17), B: wpt(B.spine, -0.06, -0.02, -0.16) }, B: { A: wpt(A.spine, -0.1, 0.05, -0.16), B: wpt(A.chest, 0.1, 0.02, -0.16) } }), look: () => ({}) },
  kissF: { d: 0.18, A: { tl: 0.16, tlc: 0.14, clavA: [0.05, 0.2], roll: 0.3 }, B: { tl: -0.03, roll: -0.25 }, kiss: 'cheek', hands: (A, B) => ({ A: { A: wpt(B.chest, 0.17, 0.16, 0.02) } }) },
  kissM: { d: 0.15, A: { tl: 0.12, tlc: 0.12, clavA: [0.05, 0.22], clavB: [0.05, 0.25], roll: 0.38 }, B: { tl: 0.1, tlc: 0.1, clavA: [0.25, 0.2], clavB: [0.25, 0.2], roll: -0.38 }, kiss: 'mouth',
    hands: (A, B) => ({ A: { A: wpt(B.head, 0.07, -0.04, 0.03), B: wpt(B.spine, -0.05, 0.02, -0.16) }, B: { A: wpt(A.head, -0.05, -0.16, -0.08), B: wpt(A.chest, 0.12, 0.17, -0.06) } }) },
  kissH: { d: 0.33, A: { tl: 0.38, tlc: 0.32, nk: 0.15, clavA: [0.05, 0.25] }, B: { tl: -0.03, clavA: [0.05, 0.15] }, kiss: 'hand' },
};
const AFF_PAIR = new Map(), AFF_RIG = new Map();
function affPlace(R, dir, x) { const a = dir * Math.PI / 4, yaw = Math.atan2(0.5 * Math.sin(a), Math.cos(a)), t = new THREE.Vector3(); R.root.rotation.set(0, yaw, 0); R.root.position.set(0, 0, 0); R.root.updateMatrixWorld(true);
  let minY = Infinity; for (const f of [R.LA.ft, R.LB.ft]) { f.getWorldPosition(t); minY = Math.min(minY, t.y); } R.root.position.set(x, -minY + 0.035 * R.root.scale.y, 0); R.root.updateMatrixWorld(true); }
/* esqueleto próprio de cada um no par (não mexe nos esqueletos do cache dos sprites) */
function affRigOf(slot, e, k) { let skin = String(e.skin || 'iron'); const cas = (e.stb & 2097152) && typeof casOk === 'function' && casOk(e.cas);
  if (cas) skin += '~c' + e.cas; else if (typeof helmSkin === 'function' && helmSkin(e.cls, e.skin) && ((e.stb & 4194304) || /^kiss/.test(k))) skin += '~h';   /* para beijar, o capacete sai */
  const lk = slot + '|' + e.cls + ':' + skin + ':' + e.color; let R = AFF_RIG.get(lk);
  if (!R) { const L = heroLook(e.cls, skin, e.color); R = buildHumanoid(L); if (typeof epicHero === 'function') epicHero(R, L, 1, String(e.skin).split('~')[0]); AFF_RIG.set(lk, R); if (AFF_RIG.size > 24) AFF_RIG.delete(AFF_RIG.keys().next().value); }
  return { R, lk }; }
function affPose(R, e) { rigReset(R); const P = { dir: 2, walk: -1, view: 'S', shea: 1, shb: 1, nowp: 1 }; if (typeof applyLost === 'function') applyLost(R, e.lost || 0, e.pro || 0); applyPose(R, buildPose(e.cls, P), P, 0); }
function affBuild(k, eA, eB, flip) { const G2 = GEST2[k], a = affRigOf('A', eA, k), b = affRigOf('B', eB, k), RA = a.R, RB = b.R, f = flip ? -1 : 1, V = (x, y, z) => new THREE.Vector3(x, y, z);
  affPose(RA, eA); affPose(RB, eB); for (const [R, X] of [[RA, G2.A], [RB, G2.B]]) { R.spine.rotation.x = X.tl || 0; rigExtra(R, X); }
  affPlace(RA, flip ? 6 : 2, -G2.d * f); affPlace(RB, flip ? 2 : 6, G2.d * f);
  const mouth = R => { R.root.updateMatrixWorld(true); return R.head.localToWorld(V(0, -0.05, 0.1)); };
  if (G2.kiss === 'cheek') for (let r = 0; r < 3; r++) { const ck = wpt(RB.head, 0.075, -0.02, 0.04); lookAtP(RA, ck, G2.A.roll); leanTo(RA, ck); }
  if (G2.kiss === 'mouth') for (let r = 0; r < 4; r++) { const mA = mouth(RA), mB = mouth(RB), mid = mA.clone().add(mB).multiplyScalar(0.5); lookAtP(RA, mB, G2.A.roll); lookAtP(RB, mA, G2.B.roll); leanTo(RA, mid.clone().add(V(-0.012 * f, 0, 0))); leanTo(RB, mid.clone().add(V(0.012 * f, 0, 0))); }
  if (G2.kiss === 'hand') { ikArm(RB, 'A', wpt(RA.head, 0, -0.05, 0.11), [1.1, -0.2, 0, 0.3]); const bh = RB.A.hand.getWorldPosition(V(0, 0, 0)); ikArm(RA, 'A', bh.add(V(0, -0.03, 0.03)), [1.0, -0.3, 0, 1.0]); }
  else { const T = G2.hands(RA, RB); for (const [w, R] of [['A', RA], ['B', RB]]) for (const arm of ['A', 'B']) if (T[w] && T[w][arm]) ikArm(R, arm, T[w][arm], [1.1, -0.7, 0, 1.4]); }
  if (G2.look) { const Lk = G2.look(RA, RB); if (Lk.A) lookAtP(RA, Lk.A, G2.A.roll); if (Lk.B) lookAtP(RB, Lk.B, G2.B.roll); }
  return [RA, RB]; }
function affPairSprite(k, eA, eB, flip) { const key = k + '|' + (flip ? 1 : 0) + '|' + affRigOf('A', eA, k).lk + '|' + affRigOf('B', eB, k).lk + '|' + (eA.lost || 0) + (eB.lost || 0);
  let s = AFF_PAIR.get(key); if (s) return s; if (!R3.ok) return null;
  const [RA, RB] = affBuild(k, eA, eB, flip), { renderer, scene, cam, W, H } = R3;
  for (const R of [RA, RB]) { for (const A of [R.A, R.B]) if (A && A.slv && typeof hangWorld === 'function') hangWorld(A.slv, R, 0); scene.add(R.root); R.root.updateMatrixWorld(true); }
  renderer.render(scene, cam); scene.remove(RA.root); scene.remove(RB.root);
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(renderer.domElement, 0, 0);
  s = { c, w: FRAME_W, h: FRAME_H, ax: FRAME_W / 2, ay: FOOT_Y, painted: true, hd: true }; AFF_PAIR.set(key, s); if (AFF_PAIR.size > 30) AFF_PAIR.delete(AFF_PAIR.keys().next().value); return s; }

// ---------------- CLIENTE ----------------
function affParse(v) { if (!v || typeof v !== 'string') return null; const [k, w, l, s] = v.split('|'); return AFF_KS.includes(k) ? { k, w, lead: l === '1', side: +s || 1 } : null; }
if (typeof applySnapshot === 'function') { const _asA = applySnapshot; applySnapshot = function (m, now) { _asA(m, now); for (const r of m.p || []) { const e = G.players[r[0]]; if (e) e.aff = affParse(r[14]); } }; }
/* desenho: durante abraços e beijos quem conduz desenha o par inteiro (no meio dos dois); o outro não se desenha */
if (typeof drawHeroEntity === 'function') { const _dhA = drawHeroEntity; drawHeroEntity = function (ctx, e, sx, sy, now) { const A = e && !e.isNpc && e.aff;
  if (A && A.k !== 'hand' && GEST2[A.k] && R3.ok && !e.downed) {   /* só os gestos em pé desta versão */ const o = G.players[A.w]; if (o && o.visible !== false && o.aff && o.aff.w === e.id) {
    if (!A.lead) { e._spr = null; return; }
    const pa = tileW(e.rx, e.ry, 0), pb = tileW(o.rx, o.ry, 0), flip = A.side < 0, s = affPairSprite(A.k, e, o, flip);
    if (s) { ctx.imageSmoothingEnabled = true; const mx = sx + (pb.x - pa.x) / 2, my = sy + (pb.y - pa.y) / 2; softDab(ctx, mx, my, 16, '#000000', 0.35); pblit(ctx, s, mx, my); e._spr = s; e._sx = mx; e._sy = my; e._drawT = now; if (o.emote) o.emote = null; return; } } }
  return _dhA(ctx, e, sx, sy, now); }; }
/* de mãos dadas: o braço de dentro estendido para o lado do outro */
if (typeof heroPoseFor === 'function') { const _hpA = heroPoseFor; heroPoseFor = function (e, now) { const P = _hpA(e, now), A = e && !e.isNpc && e.aff;
  if (A && A.k === 'hand' && !P.sit && !P.act) { const o = G.players[A.w] || (G.npcs && G.npcs[A.w]); if (o) { const d = (e.dir || 0) * Math.PI / 4, sxv = Math.sin(d), syv = Math.cos(d), fx = syv + sxv / 2, fy = syv - sxv / 2, rx = -fy, ry = fx;
    P.hand = ((o.rx - e.rx) * rx + (o.ry - e.ry) * ry) > 0 ? 'A' : 'B'; } } return P; }; }
if (typeof buildPose === 'function') { const _bpA = buildPose; buildPose = function (cls, P) { const Q = _bpA(cls, P); if (P && P.hand) { Q[P.hand === 'A' ? 'aA' : 'aB'] = [0.22, 0.42, 0.25]; } return Q; }; }
if (typeof pose3Key === 'function') { const _pkA = pose3Key; pose3Key = function (P) { return _pkA(P) + (P && P.hand ? '|hd' + P.hand : ''); }; }
/* quem foi pego pela mão vai ao lado de quem conduz; andar por conta própria solta */
if (typeof updateLocal === 'function') { const _ulA = updateLocal; updateLocal = function (now, dt) { const me = G.me, A = G.aff; if (!me || !A || A.k !== 'hand' || A.lead) return _ulA(now, dt);
  if (typeof myInput === 'function' && (myInput() || G.path)) { G.aff = null; Net.send({ t: 'aff', a: 'stop' }); return _ulA(now, dt); }
  _ulA(now, dt); const L = G.players[A.w] || (G.npcs && G.npcs[A.w]); if (!L || L.rx == null) return; const g = AFX.gap.hand, tx = L.rx - AFF_SR[0] * g * A.side, ty = L.ry - AFF_SR[1] * g * A.side, k = Math.min(1, dt * 7), nx = me.x + (tx - me.x) * k, ny = me.y + (ty - me.y) * k;
  const ok = L.isNpc || typeof freeAt !== 'function' || freeAt(nx, ny, me.z), mv = Math.hypot(nx - me.x, ny - me.y); if (ok) { me.x = me.rx = nx; me.y = me.ry = ny; } me.dir = L.dir || 0; me.walking = mv > 0.004;
  if (now - (me._affSent || 0) > 110 && (mv > 0.002 || me.walking !== me._affW)) { me._affSent = now; me._affW = me.walking; Net.send({ t: 'mv', x: Math.round(me.x * 100) / 100, y: Math.round(me.y * 100) / 100, z: Math.round((me.z || 0) * 100) / 100, d: me.dir, w: me.walking ? 1 : 0 }, true); } }; }
/* mensagens */
function affBlocked(name) { return (SET.affBlock || []).includes(String(name || '').trim().toLowerCase()); }
if (typeof progEvent === 'function') { const _peA = progEvent; progEvent = function (m, now) {
  if (m.t === 'affst') { G.aff = m.k ? m : null; if (m.k && m.dir != null && G.me) { G.me.dir = m.dir; G.path = null; G.pathGoal = null; } return true; }
  if (m.t === 'affask') { if (SET.aff === 'off' || affBlocked(m.name)) { Net.send({ t: 'aff', a: 'ans', id: m.id, ok: 0, off: 1 }); return true; } affAskBox(m); return true; }
  return _peA(m, now); }; }
/* caixas: escolher o gesto, responder um pedido */
function affCloseBox() { const b = document.getElementById('aff-box'); if (b) b.remove(); }
function affNear() { const me = G.me, out = []; if (!me) return out; for (const id in G.players) { const q = G.players[id]; if (id === G.myId || q.isNpc || !q.visible || q.downed || q.rx == null) continue; if ((q.fl || 0) !== (me.fl || 0)) continue; const d = Math.hypot(q.rx - me.x, q.ry - me.y); if (d <= AFX.reach) out.push([d, q]); } return out.sort((a, b) => a[0] - b[0]).map(x => x[1]); }
function affPick() { affCloseBox(); const L = affNear(); if (!L.length) { showToast('Ninguém perto para um gesto de afeto.'); return; } let who = L[0];
  const d = document.createElement('div'); d.id = 'aff-box'; d.className = 'aff-box';
  const draw = () => { d.innerHTML = '<div class="aff-h">💞 Afeto</div>' + (L.length > 1 ? '<div class="aff-who">' + L.slice(0, 5).map(q => '<button type="button" data-w="' + q.id + '" class="' + (q === who ? 'on' : '') + '">' + escAff(q.name) + '</button>').join('') + '</div>' : '<div class="aff-one">com ' + escAff(who.name) + '</div>') +
    '<div class="aff-gs">' + AFF_KS.map(k => '<button type="button" data-k="' + k + '"><span>' + AFX.i[k] + '</span>' + AFX.n[k] + '</button>').join('') + '</div><div class="aff-ft">A outra pessoa precisa aceitar. Para parar, ande ou use 💔 na roda.</div><button type="button" class="aff-x">Fechar</button>';
    d.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { who = L.find(q => String(q.id) === b.dataset.w) || who; draw(); });
    d.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { Net.send({ t: 'aff', a: 'ask', id: who.id, k: b.dataset.k }); affCloseBox(); });
    d.querySelector('.aff-x').onclick = affCloseBox; };
  draw(); document.body.appendChild(d); }
function affAskBox(m) { affCloseBox(); const d = document.createElement('div'); d.id = 'aff-box'; d.className = 'aff-box ask';
  d.innerHTML = '<div class="aff-h">' + AFX.i[m.k] + ' ' + escAff(m.name) + ' ' + AFX.ask[m.k] + '.</div><div class="aff-row"><button type="button" data-a="yes" class="ok">Aceitar</button><button type="button" data-a="no">Recusar</button><button type="button" data-a="block" class="bl">Bloquear</button></div><div class="aff-ft">Bloquear recusa todos os pedidos dessa pessoa (dá para desfazer nas configurações).</div>';
  let done = false; const ans = (ok, off) => { if (done) return; done = true; Net.send({ t: 'aff', a: 'ans', id: m.id, ok: ok ? 1 : 0, off: off ? 1 : 0 }); affCloseBox(); };
  d.querySelector('[data-a="yes"]').onclick = () => ans(1); d.querySelector('[data-a="no"]').onclick = () => ans(0);
  d.querySelector('[data-a="block"]').onclick = () => { const n = String(m.name || '').trim().toLowerCase(); SET.affBlock = (SET.affBlock || []).filter(x => x !== n).concat([n]); if (typeof saveSettings === 'function') saveSettings(); affSetUI(); ans(0, 1); showToast(m.name + ' foi bloqueado: os pedidos dessa pessoa serão recusados.'); };
  document.body.appendChild(d); setTimeout(() => ans(0), AFX.askMs); }
function escAff(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
/* roda de emojis: 💞 Afeto (ou 💔 parar) */
if (typeof EW_INNER !== 'undefined' && typeof emoteList === 'function') { EW_INNER.push('aff'); const _elA = emoteList; emoteList = function () { const L = _elA().slice(); if (G.me && !G.me.bathing) L.push(G.aff ? { k: 'aff', n: 'Parar o gesto', i: '💔' } : { k: 'aff', n: 'Afeto', i: '💞' }); return L; };
  const _ceA = closeEmoteWheel; closeEmoteWheel = function (fire) { const wl = G.wheel; if (fire && wl && wl.sel >= 0) { const it = emoteList()[wl.sel]; if (it && it.k === 'aff') { G.wheel = null; $('emote-wheel').classList.add('hidden'); document.querySelectorAll('#emote-wheel .ew-opt').forEach(o => o.classList.remove('on')); if (G.aff) { Net.send({ t: 'aff', a: 'stop' }); G.aff = null; } else affPick(); return; } } return _ceA(fire); }; }
/* configurações: receber pedidos de afeto, bloqueados */
function affSetUI() { const box = document.getElementById('pz-aff'); if (!box) return; box.querySelectorAll('button[data-af]').forEach(b => b.classList.toggle('on', (SET.aff === 'off' ? 'off' : 'on') === b.dataset.af));
  const n = (SET.affBlock || []).length, bl = document.getElementById('pz-affbl'); if (bl) { bl.textContent = n ? 'Desbloquear todos (' + n + ')' : 'Ninguém bloqueado'; bl.disabled = !n; } }
if (typeof document !== 'undefined') setTimeout(() => { const anchor = document.getElementById('pz-blood'); if (!anchor || document.getElementById('pz-aff')) return;
  const sec = document.createElement('div'); sec.className = 'pz-sec'; sec.textContent = 'Pedidos de afeto (abraço, beijo, mãos dadas)';
  const row = document.createElement('div'); row.className = 'pz-row'; row.id = 'pz-aff'; row.innerHTML = '<button data-af="on">Receber</button><button data-af="off">Desligados</button><button id="pz-affbl" type="button"></button>';
  anchor.after(sec, row); row.querySelectorAll('button[data-af]').forEach(b => b.onclick = () => { SET.aff = b.dataset.af; if (typeof saveSettings === 'function') saveSettings(); affSetUI(); showToast(SET.aff === 'off' ? 'Pedidos de afeto desligados: todos serão recusados.' : 'Pedidos de afeto ligados.'); });
  document.getElementById('pz-affbl').onclick = () => { SET.affBlock = []; if (typeof saveSettings === 'function') saveSettings(); affSetUI(); showToast('Ninguém mais está bloqueado.'); }; affSetUI(); }, 0);
if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = '.aff-box{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:60;min-width:260px;max-width:min(92vw,380px);background:rgba(28,16,14,.94);border:1px solid rgba(220,140,160,.55);border-radius:12px;padding:12px 14px;color:#f3e4d0;font:14px/1.4 Georgia,serif;box-shadow:0 8px 30px rgba(0,0,0,.5)}.aff-h{font-size:15px;font-weight:600;margin-bottom:8px;text-align:center}.aff-one{text-align:center;opacity:.8;margin:-4px 0 8px}.aff-who,.aff-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:8px}.aff-gs{display:grid;grid-template-columns:1fr 1fr;gap:6px}.aff-box button{padding:7px 10px;border-radius:8px;border:1px solid rgba(220,140,160,.45);background:rgba(60,26,34,.6);color:inherit;font:inherit;cursor:pointer}.aff-box button:hover,.aff-box button.on{background:rgba(140,50,80,.7)}.aff-gs button{display:flex;gap:6px;align-items:center;text-align:left}.aff-gs span{font-size:17px}.aff-row .ok{background:rgba(60,110,60,.7)}.aff-row .bl{opacity:.8}.aff-ft{font-size:12px;opacity:.7;margin-top:8px;text-align:center}.aff-x{display:block;margin:8px auto 0}'; document.head.appendChild(st); }
