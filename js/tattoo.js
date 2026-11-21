// ============================================================
//  TATUAGENS — Estúdio Âncora & Tinta (Rua do Mercado), marcas com efeito social
//  5 lugares do corpo; qualquer tatuagem pode ser coberta por outra; aparecem só de roupa de banho.
//  A marca de uma facção só passa a valer depois que alguém dela vê o jogador sem a roupa
//  (Termas, massagem, ofurô) ou, no caso da guarda, na prisão. A Fé só sabe pelo boato.
// ============================================================
const TAT_TIME = 6000, TAT_PAIN = 0.1;
const TAT_FNAME = { valcarne: 'da Casa Valcarne', draemor: 'da Casa Draemor', moranthe: 'da Casa Moranthe', thornvale: 'da Casa Thornvale', solmire: 'da Casa Solmire', crown: 'da coroa', guard: 'da Guarda', under: 'do submundo', faith: 'da Fé' };   /* já com o artigo */

// ---------------- SERVIDOR ----------------
function tatOf(p) { if (!p.tats) p.tats = (skinParts(p.skin).tats || [0, 0, 0, 0, 0]).slice(); return p.tats; }
function tatHas(p, f) { return tatOf(p).some(i => TATS[i] && TATS[i].f === f); }
function tatRec(p) { const E = S.estate; E.tat = E.tat || { seen: {} }; const k = estOwner(p); return E.tat.seen[k] || (E.tat.seen[k] = {}); }
function tatKnown(p, f) { if (!p || !S.estate || !tatHas(p, f)) return false; const R = tatRec(p); return !!(f === 'guard' ? R['guard+'] : f === 'under' ? R['under+'] : f === 'faith' ? R.faith : f === 'crown' ? R.crown : R['own:' + f]); }
function tatApply(p) { const SP = skinParts(p.skin); p.skin = skinJoin(SP.base, SP.fem, tatOf(p)); Net.toAll({ t: 'pinfo', p: pinfo(p) }); }
function tatSwim(p) { return !!(p.thw || p.bath || p.thMass || p.thSit); }   /* sem a roupa: nas piscinas, no ofurô, na mesa de massagem */
function tatFaction(n) { if (n.house) return n.house; const k = n.kind || ''; if (k.startsWith('k_')) return 'crown'; if (k === 'guard' || k === 'captain' || k === 'v_offguard' || n.id === 'pz_guard') return 'guard'; if (k.startsWith('v_thug') || n.id === 'pz_shadow') return 'under'; return null; }
/* alguém da facção f viu o corpo de p: cada efeito acontece uma vez */
function tatSeenBy(p, f, who) {
  const R = tatRec(p), day = estDay(), once = (key, fn) => { if (R[key]) return; R[key] = day; fn(); if (typeof estateSave === 'function') estateSave(); };
  if (!R.any && tatOf(p).some(Boolean)) R.any = day;
  if (tatHas(p, 'faith') && !R.rumor) R.rumor = day;   /* a Fé não vai aos banhos: fica sabendo pelo boato, no dia seguinte */
  const nm = who ? (who.tell || who.name.split(',')[0] + ' viu') : 'Alguém viu';
  if (HOUSE_BY && HOUSE_BY[f]) {
    if (tatHas(p, f)) once('own:' + f, () => { hFavor(p, f, 12, 'viram a marca da casa na sua pele'); tell(p, nm + ' a marca da ' + HOUSE_BY[f].n + ' em você. A casa passa a tratar você como um dos seus.'); });
    for (const h of HOUSES) if (h.id !== f && tatHas(p, h.id)) once('rival:' + f + ':' + h.id, () => { hFavor(p, f, -4, 'você carrega a marca da ' + h.n); });
  } else if (f === 'crown') { if (tatHas(p, 'crown')) once('crown', () => { const C = crownRec(), k = crownKey(p); C.favor[k] = (C.favor[k] || 0) + 10; repAdd(p, 'nobres', 5, 'a marca da coroa'); tell(p, nm + ' a Coroa de Aurenfell na sua pele: +10 de favor da coroa.'); }); }
  else if (f === 'guard') {
    if (tatHas(p, 'guard')) once('guard+', () => { repAdd(p, 'guarda', 12, 'a marca da Guarda'); tell(p, nm + ' o Escudo da Guarda em você. As sentinelas passam a confiar mais.'); });
    if (tatHas(p, 'under')) once('guard-', () => { repAdd(p, 'guarda', -10, 'a marca do submundo'); tell(p, nm + ' o Olho do Submundo em você. A guarda vai ficar de olho.'); }); }
  else if (f === 'under') {
    if (tatHas(p, 'under')) once('under+', () => { tell(p, nm + ' o Olho do Submundo e fez um aceno discreto. Os gatunos da cidade não mexem mais na sua bolsa.'); });
    if (tatHas(p, 'guard')) once('under-', () => { repAdd(p, 'cidade', -3, 'o submundo desconfia de você'); tell(p, nm + ' o Escudo da Guarda em você e virou o rosto.'); }); }
}
function tatTick(now) {
  if (!S.estate || now - (S.tatT || 0) < 1000) return; S.tatT = now; const day = estDay(); tatBathers(); tatClientTick(now); tatLookers(now);
  for (const p of Object.values(S.players)) { const T = tatOf(p);
    if (p.tatInk) { const K = p.tatInk; if (!p.sit || p.downed) { p.tatInk = null; near(p.x, p.y, { t: 'tatfx', id: p.id, on: 0 }); tell(p, 'Você se mexeu: a tatuagem ficou pela metade e o ouro não volta.'); }
      else if (now >= K.until) { p.tatInk = null; p.sit = null; const old = T[K.slot]; T[K.slot] = K.i; tatApply(p); p.hp = Math.max(1, p.hp - Math.round(p.maxHp * TAT_PAIN)); near(p.x, p.y, { t: 'tatfx', id: p.id, on: 0 });
        const R = tatRec(p); for (const k of Object.keys(R)) { const m = k.match(/^own:(\w+)$/); if ((m && !tatHas(p, m[1])) || (k === 'crown' && !tatHas(p, 'crown')) || (k === 'guard+' && !tatHas(p, 'guard')) || (k === 'under+' && !tatHas(p, 'under')) || ((k === 'faith' || k === 'rumor') && !tatHas(p, 'faith'))) delete R[k]; }   /* marca coberta: a facção deixa de reconhecer */
        tell(p, (old ? TATS[old].n + ' coberta: ' : '') + TATS[K.i].n + ' tatuada ' + ['no braço esquerdo', 'no braço direito', 'no peito', 'nas costas', 'na perna'][K.slot] + '. Aparece quando você está de roupa de banho.' + (TATS[K.i].f ? ' A marca só passa a valer quando alguém ' + TAT_FNAME[TATS[K.i].f] + ' vir.' : '')); sendStat(p); }
      continue; }
    if (!T.some(Boolean)) continue; const R = tatRec(p);
    if (R.rumor && !R.faith && day > R.rumor && tatHas(p, 'faith')) { R.faith = day; repAdd(p, 'cidade', 4, 'a marca da Fé'); tell(p, 'O boato chegou à Catedral: dizem que você carrega o Sol da Aurora na pele. A Irmã Lúmina passa a olhar você com outros olhos.'); }
    if (p.jailUntil > now && !R.jail) { R.jail = day; tatSeenBy(p, 'guard', null); }   /* na prisão a guarda revista e vê tudo */
    if (!tatSwim(p)) continue;
    for (const n of Object.values(S.npcs)) { if (n.dead || n.downed || (n.fl || 0) !== (p.fl || 0) || dist(n.x, n.y, p.x, p.y) > 6) continue; const f = tatFaction(n); if (f) tatSeenBy(p, f, n); else { if (!R.any) R.any = day; if (tatHas(p, 'faith') && !R.rumor) R.rumor = day; } }
  }
}
function tatMsg(p, m) {
  const n = S.npcs.tattooist; if (!n || (p.fl || 0) !== (n.fl || 0) || dist(p.x, p.y, n.x, n.y) > 4) return; const now = now_(), T = tatOf(p);
  if (m.a === 'ink') { const slot = m.slot | 0, i = m.i | 0, D = TATS[i]; if (slot < 0 || slot > 4 || !D || p.tatInk) return; if (S.tatCl && S.tatCl.until && !S.tatCl.done) { empSay(n, 'Espere a sua vez. Estou com um freguês na cadeira.'); return; } if (T[slot] === i) { empSay(n, 'Essa você já tem aí.'); return; }
    if ((p.gold || 0) < D.p) { empSay(n, 'São ' + D.p + ' de ouro. Tinta boa não é de graça.'); return; }
    p.gold -= D.p; { const st = WORLD.seats.find(s => dist(s.x, s.y, n.x, n.y) < 1.6); if (st) { p.x = st.x; p.y = st.y; p.dir = st.dir; p.sit = 'c'; Net.toOne(p.id, { t: 'tp', x: st.x, y: st.y, z: 0, fl: p.fl || 0, fb: p.fb == null ? -1 : p.fb }); n.dir = dirFromVecS(st.x - n.x, st.y - n.y); } else p.sit = 'g'; } p.walking = false;   /* senta na cadeira do estúdio */ if (p.atk) p.atk = null; p.tatInk = { until: now + TAT_TIME, slot, i }; near(p.x, p.y, { t: 'tatfx', id: p.id, on: 1, ms: TAT_TIME });
    empSay(n, T[slot] ? 'Vou cobrir a velha. Não se mexa.' : 'Não se mexa. Dói só no começo... e no meio, e no fim.'); near(n.x, n.y, { t: 'anim', w: 'n', id: n.id, a: 'massage', ms: TAT_TIME - 500, tx: p.x, ty: p.y }); sendStat(p); return; }
  const R = tatRec(p), known = {}; for (const f of Object.keys(TAT_FNAME)) if (tatHas(p, f)) known[f] = tatKnown(p, f) ? 1 : 0;
  Net.toOne(p.id, { t: 'tatmenu', tats: T, known, gold: p.gold | 0, log: (tatNpcRec().log || []).slice(0, 6), day: estDay() });
}
/* ---- fregueses da cidade: uma vez por dia alguém dos casarões vem se tatuar (guardas, criados e herdeiros) ---- */
const TAT_NPC_H = [13, 15], TAT_NPC_MAX = 3;
function tatNpcRec() { const E = S.estate; E.tat = E.tat || { seen: {} }; E.tat.npc = E.tat.npc || {}; E.tat.log = E.tat.log || []; return E.tat; }
function tatSeat() { const n = S.npcs.tattooist; return n ? WORLD.seats.find(s => dist(s.x, s.y, n.x, n.y) < 1.6) : null; }
function tatClient() {   /* o freguês de hoje: roda pela lista, pula quem já não tem mais o que tatuar */
  const day = estDay(); if (S.tatCl && S.tatCl.day === day) return S.tatCl;
  if (S.tatCl && S.npcs[S.tatCl.id]) S.npcs[S.tatCl.id].sitting = false;
  const R = tatNpcRec(), L = Object.values(S.npcs).filter(n => n.court === 'house' && (n.hrole === 'guard' || n.hrole === 'serv' || n.hrole === 'heir') && !n.dead).sort((a, b) => a.id < b.id ? -1 : 1); let id = null; if (!L.length) return { day, id: null, until: 0, done: 1 };   /* os casarões ainda não acordaram */
  if (R.cday === day) return S.tatCl = { day, id: null, until: 0, done: 1 };
  for (let k = 0; k < L.length && !id; k++) { const n = L[(day * 7 + k) % L.length], T = R.npc[n.id] || [], c = T.filter(Boolean).length; if (c < (n.hrole === 'heir' ? 1 : TAT_NPC_MAX)) id = n.id; }
  return S.tatCl = { day, id, until: 0, done: id ? 0 : 1 }; }
function tatNpcPost(n) { if (n.court !== 'house' || !S.estate) return null; const h = empHour(); if (h < TAT_NPC_H[0] || h >= TAT_NPC_H[1]) return null; const C = tatClient(); if (C.done || C.id !== n.id || (!C.until && Object.values(S.players).some(p => p.tatInk))) return null; const st = tatSeat(); return st ? { x: st.x, y: st.y, fl: 0, out: 1 } : null; }
if (typeof thNoblePost === 'function') { const _tnpT = thNoblePost; thNoblePost = function (n) { return _tnpT(n) || tatNpcPost(n); }; }
function tatNpcPick(n) {   /* o que ele pede: guarda e herdeiro querem o brasão da casa; depois, desenhos comuns */
  const R = tatNpcRec(), T = (R.npc[n.id] || [0, 0, 0, 0, 0]).slice(), crest = TATS.findIndex(d => d && d.f === n.house), free = [2, 0, 1, 3, 4].filter(s => !T[s]); if (!free.length) return null;
  if (n.hrole !== 'serv' && crest > 0 && !T.includes(crest)) return [free[0], crest];
  const pool = []; for (let i = 1; i < TATS.length; i++) if (!TATS[i].f && !T.includes(i)) pool.push(i); return [free[Math.floor(Math.random() * free.length)], pool[Math.floor(Math.random() * pool.length)]]; }
function tatClientTick(now) {
  const C = tatClient(); if (C.done || !C.id) return; const n = S.npcs[C.id], bo = S.npcs.tattooist, st = tatSeat(), h = empHour(); if (!n || !bo || !st) return;
  const at = dist(n.x, n.y, st.x, st.y) < 0.4 && !(n.fl || 0);
  if (!C.until) { if (h >= TAT_NPC_H[1]) { C.done = 1; return; } if (!at || n.downed || Object.values(S.players).some(p => p.tatInk)) return;
    C.until = now + TAT_TIME + 2000; n.sitting = true; n.walk = false; n.dir = st.dir; bo.dir = dirFromVecS(st.x - bo.x, st.y - bo.y); near(n.x, n.y, { t: 'tatfx', nid: n.id, on: 1, ms: TAT_TIME + 2000 }); near(bo.x, bo.y, { t: 'anim', w: 'n', id: bo.id, a: 'massage', ms: TAT_TIME + 1500, tx: n.x, ty: n.y });
    empSay(bo, n.hrole === 'heir' ? 'O brasão da casa, meu jovem senhor? Fique firme.' : ['Senta aí e não se mexa.', 'De novo por aqui? Escolheu bem.', 'Vai doer. Sempre dói.'][Math.floor(Math.random() * 3)]); return; }
  if (!at || n.downed) { C.done = 1; n.sitting = false; near(n.x, n.y, { t: 'tatfx', nid: n.id, on: 0 }); return; }
  if (now < C.until) return;
  C.done = 1; n.sitting = false; const K = tatNpcPick(n); if (!K) return; const R = tatNpcRec(), T = (R.npc[n.id] || [0, 0, 0, 0, 0]).slice(); T[K[0]] = K[1]; R.npc[n.id] = T; R.log.unshift({ d: estDay(), n: n.name.split(',')[0], i: K[1] }); R.log.length = Math.min(R.log.length, 8); R.cday = estDay();
  Net.toAll({ t: 'ntat', id: n.id, tats: T }); empSay(n, ['Ficou bom?', 'Arde como o inferno.', 'Agora é para sempre.'][Math.floor(Math.random() * 3)]); if (typeof estateSave === 'function') estateSave(); }
function tatNpcAll() { return { t: 'ntatall', all: tatNpcRec().npc }; }
/* viajantes e marginais às vezes entram só para olhar os desenhos */
if (typeof visPlan === 'function') { const _vpT = visPlan; visPlan = function (type) { const L = _vpT(type);
  if ((type === 'trav' || type === 'thug') && Math.random() < 0.3) { const bi = BUILDINGS.findIndex(b => b.office === 'tattoo'), bo = S.npcs.tattooist, ts = bi >= 0 && bo ? bldTiles(bi).filter(c => dist(c[0], c[1], bo.x, bo.y) > 0.8).sort((a, b) => dist(a[0], a[1], bo.x, bo.y) - dist(b[0], b[1], bo.x, bo.y)) : []; if (ts.length) L.splice(1, 0, { x: ts[0][0], y: ts[0][1], w: 9000 + Math.random() * 5000, tat: 1 }); }
  return L; }; }
function tatLookers(now) { const bo = S.npcs.tattooist; if (!bo) return; for (const n of Object.values(S.npcs)) { if (!n.vtype || !n.stops || n.tatSaid || !(n.wait > now)) continue; const st = n.stops[n.si]; if (!st || !st.tat || dist(n.x, n.y, st.x, st.y) > 1.2) continue; n.tatSaid = 1;
  const k = Math.floor(Math.random() * 3); empSay(n, ['Quanto custa uma âncora no braço?', 'Essa serpente aí... dói muito?', 'Só estou olhando.'][k]); setTimeout(() => { if (S.npcs.tattooist) empSay(S.npcs.tattooist, ['Quarenta de ouro e um pouco de coragem.', 'Dói o que tem de doer.', 'Olhar é de graça. A tinta, não.'][k]); }, 1800); } }
/* a Casa de Veludo também vê: a portas fechadas nada fica escondido, e o que as moças veem corre pela casa */
function tatVelSeen(p, who) {
  if (!S.estate || !tatOf(p).some(Boolean)) return; const R = tatRec(p), day = estDay(), nm = String(who || 'Ela').split(',')[0]; if (!R.any) R.any = day; if (tatHas(p, 'faith') && !R.rumor) R.rumor = day;
  const marks = Object.keys(TAT_FNAME).filter(f => tatHas(p, f)); if (!marks.length) return;
  if (!R.velTold) { R.velTold = day; tell(p, nm + ' reparou nas marcas na sua pele. O que se vê na Casa de Veludo chega ao submundo e aos lordes que estiverem na casa.'); }
  tatSeenBy(p, 'under', { name: nm });
  if (typeof velNoblesIn === 'function') for (const n of velNoblesIn('velvet')) tatSeenBy(p, n.house, { name: nm, tell: nm + ' contou a ' + n.name.split(',')[0] + ' sobre' }); }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') {
  NPC_LOOKS.tattooist = () => Object.assign(heroLook('archer', 'scout', '#2a4a6a'), { armor: 'vest', body: tone('#d8c9a8'), body2: tone('#2a4a6a'), accent: tone('#b03a2a'), legs: tone('#3a3a44'), boots: tone('#3a2a1f'), head: 'none', skin: tone('#b07a52'), hair: tone('#d8d2c4'), hairStyle: 'tail', beard: tone('#d8d2c4'), beardLong: true, weapon: null, quiver: false, shield: null, cape: false, scar: 1, lost: 16, hS: 0.98, wS: 1.12, tats: [TAT_I('anchor'), TAT_I('serpent'), TAT_I('raven'), TAT_I('wave'), TAT_I('star')] });
  const bareOf = (L, trunks) => { const sk = L.skin || tone('#c89878'); return Object.assign(L, { armor: 'bare', body: sk, body2: sk, legs: sk, boots: sk, head: 'none', cape: false, capeTone: null, weapon: null, shield: null, pauldron: null, quiver: false, extra: null, pattern: null, trunks }); };
  NPC_LOOKS.tb_guard = () => Object.assign(bareOf(NPC_LOOKS.v_offguard(), '#2c4a7a'), { tatFix: [0, TAT_I('anchor'), TAT_I('m_guard'), 0, 0] });   /* sentinela de folga: o Escudo da Guarda no peito */
  NPC_LOOKS.tb_thug = () => Object.assign(bareOf(NPC_LOOKS.v_thug1(), '#1e1e1e'), { hairStyle: 'short', tatFix: [TAT_I('dagger'), 0, TAT_I('m_under'), TAT_I('serpent'), 0] });   /* o sujeito calado: o Olho do Submundo */
  if (typeof NPC_CLS !== 'undefined') Object.assign(NPC_CLS, { tattooist: 'archer', tb_guard: 'knight', tb_thug: 'archer' }); }
/* tatuagens que os NPCs ganham no estúdio: o anfitrião manda, a aparência é refeita */
function tatNpcSet(id, tats) { G.ntat = G.ntat || {}; G.ntat[id] = tats; const tag = '#' + id;
  if (typeof _lookCache !== 'undefined') for (const k of [..._lookCache.keys()]) if (k.endsWith(tag)) _lookCache.delete(k);
  if (typeof _rigs !== 'undefined') for (const k of [..._rigs.keys()]) if (k.endsWith(tag)) _rigs.delete(k);
  if (typeof SPR3 !== 'undefined') for (const k of [...SPR3.keys()]) if (k.startsWith('n3|') && k.includes(tag + '|')) SPR3.delete(k); }
function tatNear() { const me = G.me; if (!me || me.downed) return null; const e = G.npcs.tattooist; if (!e || e.dead || (e.fl || 0) !== (me.fl || 0)) return null; return Math.hypot(e.rx - me.x, e.ry - me.y) < 2.4 ? e : null; }
function tatIcon(id, px) { const cv = document.createElement('canvas'); cv.width = cv.height = 96; if (typeof tatDraw === 'function') tatDraw(cv.getContext('2d'), id); cv.style.cssText = 'width:' + px + 'px;height:' + px + 'px;background:#e8c3a0;border-radius:6px;flex:0 0 auto'; return cv; }
function tatPanel(html) { let d = $('tequip'); if (d) d.remove(); d = document.createElement('div'); d.id = 'tequip'; d.className = 'gpanel tat-panel'; d.innerHTML = html; document.body.appendChild(d); const x = d.querySelector('[data-x]'); if (x) x.onclick = () => d.remove(); return d; }
function tatMenu(m) {   /* 1ª tela: os cinco lugares do corpo */
  G.tatM = m; const marks = Object.keys(m.known || {});
  const d = tatPanel('<div class="gp-head"><span>Estúdio Âncora & Tinta</span><button class="gp-x" data-x>✕</button></div><div class="est-cost">“Escolha o lugar. A tinta só aparece quando você tira a roupa, nas Termas ou no banho. Se enjoar, eu cubro com outra.”' +
    (marks.length ? '<br><br>' + marks.map(f => '<b>Marca ' + TAT_FNAME[f] + '</b>: ' + (m.known[f] ? 'reconhecida.' : 'ainda ninguém de lá viu.')).join('<br>') : '') + ((m.log || []).length ? '<br><br><b>Passaram pela cadeira</b>: ' + m.log.map(l => l.n + ' (' + (TATS[l.i] ? TATS[l.i].n : '?') + ', ' + (m.day - l.d <= 0 ? 'hoje' : m.day - l.d === 1 ? 'ontem' : 'há ' + (m.day - l.d) + ' dias') + ')').join('; ') + '.' : '') + '</div><div class="tat-slots"></div>');
  const box = d.querySelector('.tat-slots'); TAT_SLOTS.forEach(([k, nm], s) => { const b = document.createElement('button'); b.className = 'est-btn tat-slot'; const cur = m.tats[s] && TATS[m.tats[s]]; if (cur) b.appendChild(tatIcon(cur.id, 40)); const t = document.createElement('span'); t.innerHTML = '<b>' + nm + '</b><small>' + (cur ? cur.n + ' · cobrir com outra' : 'pele limpa') + '</small>'; b.appendChild(t); b.onclick = () => tatPick(s); box.appendChild(b); });
}
function tatPick(s) {   /* 2ª tela: o catálogo */
  const m = G.tatM, d = tatPanel('<div class="gp-head"><span>' + TAT_SLOTS[s][1] + '</span><button class="gp-x" data-x>✕</button></div><div class="est-cost">Desenhos comuns custam 40 de ouro; as marcas de facção, 120. Leva ' + TAT_TIME / 1000 + ' s na cadeira e dói: você perde ' + Math.round(TAT_PAIN * 100) + '% da vida. <b>Uma marca só vale depois que alguém daquela facção vê você de roupa de banho.</b></div><div class="tat-cat"></div><button class="est-btn ghost" data-back>← Voltar</button>');
  const box = d.querySelector('.tat-cat'); TATS.forEach((D, i) => { if (!D) return; const b = document.createElement('button'); b.className = 'est-btn tat-opt' + (D.f ? ' mark' : '') + (m.tats[s] === i ? ' on' : ''); b.appendChild(tatIcon(D.id, 46)); const t = document.createElement('span'); t.innerHTML = '<b>' + D.n + '</b><small>' + D.p + ' de ouro' + (D.f ? ' · marca ' + TAT_FNAME[D.f] : '') + '</small>'; b.appendChild(t); if (m.tats[s] === i) b.disabled = true;
    b.onclick = () => { if (b.dataset.sure) { d.remove(); G.path = null; G.pathGoal = null; Net.send({ t: 'tat', a: 'ink', slot: s, i }); } else { box.querySelectorAll('[data-sure]').forEach(o => { delete o.dataset.sure; o.classList.remove('sure'); }); b.dataset.sure = 1; b.classList.add('sure'); t.querySelector('small').textContent = 'toque de novo para tatuar' + (m.tats[s] ? ' (cobre ' + TATS[m.tats[s]].n + ')' : ''); } }; box.appendChild(b); });
  d.querySelector('[data-back]').onclick = () => tatMenu(m);
}
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peT = progEvent; progEvent = function (m, now) {
  if (m.t === 'tatmenu') { tatMenu(m); return true; }
  if (m.t === 'ntat') { tatNpcSet(m.id, m.tats); return true; }
  if (m.t === 'ntatall') { for (const id in m.all || {}) tatNpcSet(id, m.all[id]); return true; }
  if (m.t === 'tatfx') { const e = m.nid ? G.npcs[m.nid] : G.players[m.id]; if (e) e.tatInk = m.on ? { until: performance.now() + (m.ms || TAT_TIME), t0: performance.now() } : null; return true; }
  return _peT(m, now); }; }
/* a agulha trabalhando: faíscas de tinta sobre quem está na cadeira */
function tatInkFx(ctx, e, sx, sy, now) { const K = e.tatInk; if (!K || K.until < now) return; const t = (now - K.t0) / 1000;
  ctx.save(); for (let i = 0; i < 5; i++) { const ph = (t * 2.2 + i * 0.2) % 1; ctx.fillStyle = 'rgba(28,46,70,' + (0.9 * (1 - ph)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(sx + 6 + Math.sin(t * 9 + i * 2) * 3 + ph * 4, sy - 30 - ph * 9 + (i % 2) * 2, 1.2, 0, 7); ctx.fill(); }
  const k = Math.min(1, (now - K.t0) / (K.until - K.t0)); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(sx - 14, sy - 62, 28, 4); ctx.fillStyle = '#c9a24a'; ctx.fillRect(sx - 13, sy - 61, 26 * k, 2); ctx.restore(); }
/* quem frequenta as Termas além dos nobres: a sentinela de folga ao meio-dia (tanque frio) e um informante do submundo à noite (sala quente). Os Irmãos Descalços não vão. */
const TAT_BATHERS = [{ id: 'pz_guard', kind: 'tb_guard', name: 'Sentinela de folga', h: [11, 13], at: [15, 5] }, { id: 'pz_shadow', kind: 'tb_thug', name: 'Um sujeito calado', h: [20, 23], at: [3, 9.2] }];
function tatBathers() { if (typeof thermaeBi !== 'function') return; const b = BUILDINGS[thermaeBi()]; if (!b) return; const h = empHour();
  for (const B of TAT_BATHERS) { const on = h >= B.h[0] && h < B.h[1], n = S.npcs[B.id]; if (on && !n) { const [x, y] = localToWorld(b, B.at[0], B.at[1]), v = { id: B.id, kind: B.kind, name: B.name, transient: true, court: 'praz', x, y, z: 0, fl: 0, fb: -1, hp: 300, maxHp: 300, downed: null, dead: false, dir: 0 }; S.npcs[v.id] = v; Net.toAll({ t: 'vspawn', v: visPublic(v) }); } else if (!on && n) visGone(n); } }
