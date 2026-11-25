// ============================================================
//  SEGREDOS DA COROA — o rei e a família real também escondem coisas:
//  um bastardo, uma doença, uma traição na família, um crime do passado.
//  Valem muito mais que os segredos das casas e são muito mais perigosos:
//  cada compra, boato ou chantagem aumenta a SUSPEITA da coroa sobre você,
//  e o Mestre Corvin (o espião do rei) cobra caro de quem é descoberto.
//  Um segredo da coroa só vale enquanto o mesmo rei estiver no trono.
// ============================================================
const RS_W = { rbast: 7, rsick: 6, rbetray: 8, rcrime: 8 };
const RS_KN = { rbast: 'um bastardo do rei', rsick: 'a doença escondida', rbetray: 'traição na família real', rcrime: 'um crime do passado' };
const RS_BUY = 350, RS_RUMOR = 150, RS_CV = 240, RS_STALE = 30, RS_BM_GOLD = 120, RS_HEAT = { buy: 15, rumor: 30, bm: 40, sell: -20 }, RS_COMPANY = 0.08;
const RS_TRAICAO_MS = 420000;
function rsIs(s) { return !!s && s.h === 'crown' && !!RS_W[s.k]; }   /* os pecados da família real (pecados.js) também usam h: 'crown', com outros tipos */
/* o rei de agora (só reis NPC têm segredos guardados pela Ysolde) */
function rsKing() { if (typeof sucRec !== 'function') return null; const U = sucRec(), C = crownRec(), npc = C.rk && C.rk.npcKing;
  if (U.king && U.king.startsWith('h:') && !npc && typeof PH_BY !== 'undefined' && PH_BY[U.king.slice(2)]) return null;   /* jogador no trono: ninguém vende segredo dele */
  const hid = U.king === 'edric' || U.king === 'alaric' ? 'aurenfell' : U.king && U.king.startsWith('h:') ? U.king.slice(2) : null;
  return { key: U.king, name: sucKingName(), hid }; }
function rsStale(s) { const K = rsKing(); return !K || s.king !== K.key || s.kn !== K.name; }
function rsHeat(p, add) { const R = velRec(), k = estOwner(p), H = R.rsHeat || (R.rsHeat = {}), d = estDay(), e = H[k] || (H[k] = { v: 0, d });
  if (d > e.d) { e.v = Math.max(0, e.v - 10 * (d - e.d)); e.d = d; } if (add) e.v = Math.max(0, Math.min(100, e.v + add)); return e.v; }
const rsPick = (a, seed) => a[Math.abs(seed | 0) % a.length];
function rsText(k, K, seed) { const n = K.name, U = sucRec();
  if (k === 'rbast') { const nm = rsPick(['Tomas', 'Elric', 'Bran', 'Aldo', 'Mira', 'Ilsa'], seed), age = 9 + seed % 11, where = rsPick(['na Ferraria do Vale', 'no Estábulo Real', 'no convento atrás da Catedral', 'numa fazenda ao sul da muralha'], seed >> 2), mom = rsPick(['uma criada do castelo', 'a filha de um moleiro', 'uma dama da Casa de Veludo', 'a viúva de um capitão'], seed >> 4);
    return n + ' tem um filho bastardo: ' + nm + ', de ' + age + ' anos, criado ' + where + '. A mãe era ' + mom + ', e foi paga para sumir.'; }
  if (k === 'rsick') return n + ' esconde ' + rsPick(['a febre negra, que já lhe tomou a vista de um olho', 'um mal dos pulmões: tosse sangue toda madrugada', 'tremores nas mãos que mal o deixam segurar a pena', 'um tumor que os curandeiros dão um ano para matar'], seed) + '. Os curandeiros juraram silêncio e preparam o remédio às escondidas.';
  if (k === 'rbetray') { const al = U.alive || {}, who = al.lyra !== false ? 'A Princesa Lira' : al.queen !== false ? 'A Rainha Isolda' : null; if (!who) return null;
    const hs = HOUSES.filter(h => h.id !== K.hid && !h.player && !(typeof fhIs === 'function' && fhIs(h.id))), h = hs.length ? rsPick(hs, seed) : null; if (!h) return null;
    return { t: who + ' se encontra às escondidas com ' + h.lord + ', da ' + h.n + ', na capela velha do castelo, depois das completas.', h2: h.id }; }
  return 'Antes de subir ao trono, ' + n + ' ' + rsPick(['mandou envenenar o próprio irmão mais velho, que morreu de "febre"', 'mandou queimar a aldeia de Vaurel com o povo dentro por não pagar o imposto', 'vendeu o Forte de Ardel ao inimigo e deixou o capitão ser enforcado no lugar dele', 'mandou afogar o mestre-escriba que guardava o testamento verdadeiro do pai'], seed) + '.'; }
function rsGive(p, how, kind) { const K = rsKing(); if (!K) return null; const L = secList(p);
  const ks = (kind ? [kind] : Object.keys(RS_W)).filter(k => !L.some(s => rsIs(s) && s.k === k && !rsStale(s)));
  for (const k of ks.sort(() => Math.random() - 0.5)) { const r = rsText(k, K, Math.floor(Math.random() * 1e6)); if (!r) continue; const t = typeof r === 'string' ? r : r.t;
    const s = { h: 'crown', k, d: estDay(), t, w: RS_W[k], king: K.key, kn: K.name }; if (r.h2) s.h2 = r.h2; L.unshift(s); L.length = Math.min(L.length, SEC_MAX);
    if (typeof estateSave === 'function') estateSave(); tell(p, 'Segredo da COROA (' + how + ', peso ' + s.w + '): ' + t + ' Cuidado com quem você conta.'); return s; }
  return null; }
if (typeof secWeight === 'function') { const _swR = secWeight; secWeight = function (s) { return rsIs(s) ? (s.w || 7) : _swR(s); }; }
Object.assign(CV_SELL, { rbast: RS_CV, rsick: RS_CV, rbetray: RS_CV, rcrime: RS_CV });
/* companhia da Casa de Veludo: às vezes o que se conta é sobre o rei */
if (typeof secGive === 'function') { const _sgR = secGive; secGive = function (p, hid, k, how) { if (/contou baixinho/.test(how || '') && Math.random() < RS_COMPANY) { const s = rsGive(p, how); if (s) return s; } return _sgR.apply(this, arguments); }; }
/* o que cada uma das duas telas precisa saber dos segredos da coroa */
function rsInfo(p, k) { const L = secList(p); Net.toOne(p.id, { t: 'rsinfo', k, heat: rsHeat(p), buy: RS_BUY, rumor: RS_RUMOR, can: !!rsKing(), king: (rsKing() || {}).name || '', gold: p.gold | 0,
  rows: L.map((s, i) => rsIs(s) ? { i, kn: RS_KN[s.k], w: s.w, stale: rsStale(s) ? 1 : 0, bm: s.bm ? 1 : 0, gold: s.w * RS_BM_GOLD, acc: BM_STEPS.map(f => Math.round(100 * Math.max(0.05, bmAccept(s.w, f) - 0.15))) } : null).filter(Boolean) }); }
if (typeof velMenu === 'function') { const _vmR = velMenu; velMenu = function (p, T, n) { const r = _vmR.apply(this, arguments); try { if (T && T.menu === 'ysolde') rsInfo(p, 'ysolde'); } catch (e) { } return r; }; }
if (typeof secCorvinMenu === 'function') { const _cmR = secCorvinMenu; secCorvinMenu = function (p, n, rt) { _cmR.apply(this, arguments); try { rsInfo(p, 'cv'); } catch (e) { } }; }
/* troco: a coroa descobre quem foi */
function rsCaught(p, why) { secCrime(p, 'traicao', 'traição à coroa', RS_TRAICAO_MS); rsHeat(p, 20); if (typeof hNews === 'function') hNews(p.name + ' é procurado por traição à coroa (' + why + ').'); tell(p, 'O Mestre Corvin descobriu: você é procurado por TRAIÇÃO À COROA (' + why + '). A guarda tem ordem de prender.'); }
function rsMsg(p, m) {
  if (m.a === 'rsbuy') { const n = velStaffNear(p, 'vl_ysolde'); if (!n) return true; if (!rsKing()) { empSay(n, 'Sobre o rei de agora? Ninguém nesta casa ousa abrir a boca.'); return true; }
    if ((p.gold || 0) < RS_BUY) { empSay(n, 'O que se sabe do rei custa ' + RS_BUY + ' de ouro. E ninguém pode saber que fui eu.'); return true; }
    const s = rsGive(p, 'comprado da Dama Ysolde'); if (!s) { empSay(n, 'Do rei, você já sabe tudo o que eu sei.'); return true; }
    p.gold -= RS_BUY; const hv = rsHeat(p, RS_HEAT.buy); empSay(n, 'Isto nunca saiu daqui. Se sair, eu nunca vi você.'); if (Math.random() < hv / 250) { rsHeat(p, 10); tell(p, 'Você sente olhos nas suas costas: alguém do Mestre Corvin viu você com a Ysolde.'); }
    sendStat(p); velMenu(p, VEL_STAFF.find(t => t.id === 'vl_ysolde'), n); return true; }
  if (m.a === 'rumor') { const L = secList(p), s = L[m.i | 0]; if (!rsIs(s)) return false; const n = velStaffNear(p, 'vl_ysolde'); if (!n) return true;
    if (rsStale(s)) { L.splice(m.i | 0, 1); empSay(n, 'Esse segredo morreu com o rei a quem pertencia.'); velMenu(p, VEL_STAFF.find(t => t.id === 'vl_ysolde'), n); return true; }
    if ((p.gold || 0) < RS_RUMOR) { empSay(n, 'Falar mal do rei custa ' + RS_RUMOR + ' de ouro. As bocas têm medo.'); return true; }
    p.gold -= RS_RUMOR; L.splice(m.i | 0, 1); const K = rsKing(), w = s.w, U = sucRec(); let drop = 0;
    if (K.hid && typeof infAdd === 'function') { drop = w * 2; for (const pl of INF_PLACES) infAdd(K.hid, pl.id, -drop); }
    if (K.key === 'corwyn') { U.buy = Math.max(0, (U.buy || 0) - w * 3); drop = w * 3; }
    if (K.hid && hRec().st[K.hid]) hRec().st[K.hid].prestige = clampH(hRec().st[K.hid].prestige - w, 0, 100);
    if (s.h2 && hRec().st[s.h2]) { const st = hRec().st[s.h2]; st.prestige = clampH(st.prestige - w, 0, 100); st.crown = clampH(st.crown - 20, -100, 100); }   /* o amante também cai, e a coroa não perdoa */
    if (typeof hNews === 'function') hNews('Corre pela cidade, aos cochichos: ' + s.t);
    empSay(n, 'Amanhã até as pedras do castelo vão saber. Reze para não saberem por quem.'); tell(p, 'Boato sobre o rei espalhado: a legitimidade de ' + K.name + ' caiu ' + drop + ' em cada lugar' + (s.h2 ? ', e a ' + HOUSE_BY[s.h2].n + ' caiu em desgraça com a coroa' : '') + '. O segredo foi gasto.');
    const hv = rsHeat(p, RS_HEAT.rumor); if (Math.random() < 0.25 + hv / 200) rsCaught(p, 'boato contra o rei');
    if (typeof estateSave === 'function') estateSave(); sendStat(p); velMenu(p, VEL_STAFF.find(t => t.id === 'vl_ysolde'), n); return true; }
  if (m.a === 'cv' && (m.op === 'sell' || m.op === 'rsbm')) { const L = secList(p), s = L[m.i | 0]; if (!rsIs(s)) return false; const n = S.npcs.k_whisper;
    if (!n || n.dead || n.downed || (n.fl || 0) !== (p.fl || 0) || dist(n.x, n.y, p.x, p.y) > 3.2) { tell(p, 'Chegue mais perto do Mestre Corvin.'); return true; }
    if (rsStale(s)) { L.splice(m.i | 0, 1); p.gold = (p.gold || 0) + RS_STALE; empSay(n, 'Isto falava de um rei que já não reina. Fica de lembrança.'); sendStat(p); secCorvinMenu(p, n); return true; }
    if (m.op === 'sell') { L.splice(m.i | 0, 1); p.gold = (p.gold || 0) + RS_CV; rsHeat(p, RS_HEAT.sell); empSay(n, 'A coroa agradece. E esquece que você soube.'); tell(p, 'O Mestre Corvin pagou ' + RS_CV + ' de ouro para enterrar o segredo. A suspeita da coroa sobre você caiu.'); if (typeof estateSave === 'function') estateSave(); sendStat(p); secCorvinMenu(p, n); return true; }
    const f = BM_STEPS[m.f | 0]; if (!f) return true; if (s.bm) { empSay(n, 'Você já tentou isso uma vez. A coroa lembra.'); return true; }
    s.bm = estDay(); const K = rsKing(), cap = s.w * RS_BM_GOLD, hv = rsHeat(p, RS_HEAT.bm), ok = Math.random() < Math.max(0.05, bmAccept(s.w, f) - 0.15), react = Math.random() < Math.min(0.95, bmReact(f, ok) + 0.1 + hv / 250);
    if (ok) { const g = Math.round(cap * f); p.gold = (p.gold || 0) + g; empSay(n, rsPick(['Sua Majestade paga. Uma vez.', 'Tome. E aprenda a esquecer.', 'O tesouro real é generoso com quem cala.'], g)); tell(p, 'A coroa pagou ' + g + ' de ouro pelo seu silêncio sobre ' + RS_KN[s.k] + '.'); }
    else { empSay(n, rsPick(['Você acaba de cometer o maior erro da sua vida.', 'Ameaçar o rei? Que coragem. Que pena.', 'Saia. Enquanto ainda tem pernas.'], hv | 0)); tell(p, 'A coroa recusou. O segredo ainda serve para um boato, ou para vender.'); }
    if (react) { if (Math.random() < 0.55) secPend().push({ o: estOwner(p), h: K.hid || 'aurenfell', type: 'thugs', at: now_() + 30000 + Math.random() * ESTATE_DAY_MS, n: 4, kill: 1 });   /* assassinos sem brasão, a mando do castelo */
      else rsCaught(p, 'chantagem contra o rei'); }
    if (typeof estateSave === 'function') estateSave(); sendStat(p); secCorvinMenu(p, n); return true; }
  return false; }
if (typeof velMsg === 'function') { const _vmR2 = velMsg; velMsg = function (p, m) { try { if (S.estate && !p.downed && rsMsg(p, m)) return; } catch (e) { console.warn('rsMsg', e); } return _vmR2(p, m); }; }

// ---------------- CLIENTE ----------------
function rsPatch(m) { const d = document.getElementById('tequip'); if (!d) return; const rows = d.querySelectorAll('.vel-sec'), R = {}; for (const r of m.rows) R[r.i] = r;
  rows.forEach((row, i) => { const r = R[i]; if (!r) return; row.classList.add('rs-row'); const b = row.querySelector('span > b'); if (b) b.innerHTML = '👑 A Coroa · ' + r.kn + ' · peso ' + r.w + (r.stale ? ' <i style="opacity:.7">(o rei mudou: perdeu o valor)</i>' : '');
    if (m.k === 'ysolde') { const rb = [...row.querySelectorAll('button')].find(x => /Espalhar|Confirmar/.test(x.textContent)); if (rb) { rb.innerHTML = 'Espalhar<small>−' + m.rumor + ' · arriscado</small>'; rb.title = 'Derruba a legitimidade do rei. O Mestre Corvin pode descobrir quem foi (traição à coroa).'; rb.disabled = m.gold < m.rumor && !r.stale; } }
    if (m.k === 'cv' && !r.stale) { const bb = document.createElement('button'); bb.className = 'est-btn'; bb.disabled = !!r.bm; bb.innerHTML = r.bm ? 'Já usado' : 'Chantagear<small>até ' + r.gold + '</small>'; bb.onclick = () => rsAsk(m, r); row.appendChild(bb); } });
  const head = d.querySelector('.est-cost'); if (head && !d.querySelector('.rs-head')) { const x = document.createElement('div'); x.className = 'est-cost rs-head';
    x.innerHTML = '<b>👑 Segredos da coroa</b>: ' + (m.can ? (m.k === 'ysolde' ? 'sobre ' + m.king + ' e a família real, por <b>' + m.buy + '</b> de ouro. Valem muito, e são perigosos.' : 'a coroa paga ' + RS_CV + ' para enterrar um, ou você tenta chantagear o rei por meio dele.') : 'com um jogador no trono, ninguém vende segredos do rei.') + '<br>Suspeita da coroa sobre você: <b>' + m.heat + '</b> de 100' + (m.heat >= 50 ? ' (alta: qualquer passo em falso vira traição)' : '') + '.'; head.after(x); }
  if (m.k === 'ysolde' && m.can) { const tq = d.querySelector('.tq-btns'); if (tq && !tq.querySelector('[data-rsbuy]')) { const b = document.createElement('button'); b.className = 'est-btn'; b.dataset.rsbuy = 1; b.disabled = m.gold < m.buy; b.innerHTML = '👑 Segredo da coroa<small>' + m.buy + ' de ouro</small>'; b.onclick = () => Net.send({ t: 'vel', a: 'rsbuy' }); tq.appendChild(b); } } }
function rsAsk(m, r) { const d = velPanel('Chantagear a coroa', '<div class="est-cost">“Você quer vender silêncio ao rei. Diga o preço, e pense bem.”<br><br><b>' + r.kn + '</b> · peso ' + r.w + '. Recusa ou troco: <b>quatro assassinos</b> sem brasão na rua, ou uma ordem de prisão por <b>traição à coroa</b>. Sua suspeita hoje: ' + m.heat + ' de 100.</div><div class="vel-amt" style="grid-template-columns:repeat(4,1fr)">' + BM_STEPS.map((f, i) => '<button class="est-btn" data-f="' + i + '"><b>' + Math.round(r.gold * f) + '</b><br><small>' + BM_STEP_N[i] + '<br>' + r.acc[i] + '% de aceitar</small></button>').join('') + '</div>');
  d.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { d.remove(); Net.send({ t: 'vel', a: 'cv', op: 'rsbm', i: r.i, f: +b.dataset.f }); }); }
if (typeof progEvent === 'function' && typeof G !== 'undefined') { const _peR = progEvent; progEvent = function (m, now) { if (m.t === 'rsinfo') { G.rsInfo = m; rsPatch(m); return true; } return _peR(m, now); }; }
