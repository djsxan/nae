// ============================================================
//  TRABALHOS NO CLIENTE — coleta (segurar F com a ferramenta), quadro de avisos, bicos e entregas com marcador,
//  turnos nos negócios e a lista de ofícios na Jornada.
// ============================================================
G.job = null; G.gath = null; G.shiftUntil = 0;
const hasTool = k => G.me && G.me.inv && G.me.inv[k] > 0;
function nearGather() {
  const me = G.me; if (!me || (me.z || 0) >= 0.5) return null; let best = null, bd = 1.75;
  for (let y = Math.round(me.y) - 2; y <= Math.round(me.y) + 2; y++) for (let x = Math.round(me.x) - 2; x <= Math.round(me.x) + 2; x++) {
    if (!inBounds(x, y)) continue; const i = y * MAP_W + x, G0 = gatherOf(WORLD.obj[i]); if (!G0 || WORLD.bld[i] >= 0) continue; const d = dist(me.x, me.y, x, y); if (d < bd) { bd = d; best = { i, G0 }; } }
  return best;
}
function gatherMs(G0) { const lv = profLv((G.me.prof || {})[G0.prof]); return 2600 * (1 - 0.06 * (lv - 1)); }
function jobsPrompt() {
  const me = G.me; if (!me) return '';
  if (G.job && G.job.step) { const s = G.job.step; if (dist(me.x, me.y, s.x, s.y) < 1.8) return 'F: ' + s.t; }
  if (NOTICE.x >= 0 && dist(me.x, me.y, NOTICE.x, NOTICE.y) < 2) return 'F: quadro de avisos (bicos e entregas)';
  if (G.shiftUntil > performance.now()) return 'Trabalhando… saia do prédio para parar';
  if (typeof hotelChestNear === 'function' && hotelChestNear()) return me.hroom >= 0 ? 'F: abrir o baú da sua cabine' : 'Baú de hóspede — alugue uma cabine com Dona Ilsa';
  if (typeof estChestHere === 'function' && estChestHere()) return 'F: abrir o baú';
  if (typeof empNear === 'function' && empNear()) return empPrompt();
  if (typeof segNear === 'function' && segNear()) return segPrompt();   /* seus empregados: o F abre as ordens */
  if (typeof entLogNear === 'function' && entLogNear()) return 'F: recolher o galho (lenha)';
  if (G.riding) return 'F: descer da guardiã';
  if (typeof csHint === 'function' && csHint()) return csHint();
  if (typeof velHint === 'function' && velHint()) return velHint();
  if (typeof tatNear === 'function' && tatNear()) return G.me.tatInk ? 'Tatuando… não se mexa' : 'F: falar com o Velho Tibúrcio (tatuagens)';
  if (typeof prazNear === 'function' && prazNear()) return 'F: falar com Lívia, a Banhista (entrada das Termas)';
  if (typeof prazWho === 'function' && prazWho()) return prazWho() === 'mass' ? 'F: falar com Dario, o Massagista' : 'F: falar com Nico, o Copeiro';
  if (typeof prazInPool === 'function' && prazInPool()) return G.me.bathing ? 'F: ficar de pé · andar também levanta' : 'F: sentar, boiar ou pedir vinho';
  if (typeof infNear === 'function' && infNear()) return 'F: falar com Tomé, o Pregoeiro (influência na praça)';
  if (typeof houseNear === 'function' && houseNear()) return 'F: falar com ' + houseNear().name;
  if (typeof courtNear === 'function' && courtNear()) return courtPrompt();
  if (typeof mealNear === 'function' && mealNear()) { const T = mealNear(); return 'F: comer ' + ((LOOT[T.items[0]] || {}).name || 'da bandeja').toLowerCase() + ' (' + T.items.length + ' na bandeja)'; }
  if (typeof entNear === 'function' && entNear()) return 'F: dar ordens à sua guardiã';
  { const t = typeof talkTarget === 'function' ? talkTarget() : null; if (t) return t.k === 'n' ? 'F: falar com ' + t.name : 'F: dar ouro ou itens para ' + t.name; }
  if (typeof estInBiz === 'function' && estInBiz()) return 'N: gerenciar o negócio';
  if (shiftHere()) return 'F: trabalhar um turno aqui';
  const g = nearGather(); if (g) { const lv = profLv((me.prof || {})[g.G0.prof]); if (!hasTool(g.G0.tool)) return 'Precisa de ' + LOOT[g.G0.tool].name.toLowerCase() + ' para ' + g.G0.verb + ' (Empório)'; if (lv < g.G0.min) return PROFS[g.G0.prof] + ' nível ' + g.G0.min + ' para ' + g.G0.verb; return (G.gath ? 'Trabalhando... (ande para parar)' : 'F: ' + g.G0.verb) + ' · ' + PROFS[g.G0.prof] + ' ' + lv; }
  return '';
}
// dentro de um negócio, perto do balcão/bancada (onde fica o funcionário)
function shiftHere() {
  const me = G.me; if (!me || (me.fl || 0) !== 0) return false; /* turno só no térreo, onde ficam os balconistas */ const bi = WORLD.bld[tileAt(me.x, me.y)]; if (bi < 0) return false;
  for (const id in G.npcs) { const n = G.npcs[id], N = NPCS.find(q => q.id === id); if (!N || N.kind === 'guard' || N.kind === 'broker' || N.transient || /^(h|ph|k|vl|cl|pz|sg)_/.test(id)) continue;   /* moradores e visitantes não oferecem turno */ if (WORLD.bld[tileAt(N.x, N.y)] === bi && dist(me.x, me.y, N.x, N.y) < 2.6) return true; }
  return false;
}
// F: retorna true se usou a tecla
function jobsF(ev) {
  const me = G.me; if (!me || ev.repeat) return false;
  if (G.job && G.job.step && dist(me.x, me.y, G.job.step.x, G.job.step.y) < 1.8) { if (G.job.step.k === 'sweep') { me.anim = { a: 'sweep', t0: performance.now(), ms: 1500 }; } Net.send({ t: 'job', a: 'step' }); return true; }
  if (NOTICE.x >= 0 && dist(me.x, me.y, NOTICE.x, NOTICE.y) < 2) { Net.send({ t: 'job', a: 'board' }); return true; }
  if (G.shiftUntil <= performance.now() && shiftHere() && !(typeof talkTarget === 'function' && talkTarget()) && !(typeof estInBiz === 'function' && estInBiz())) { Net.send({ t: 'shift', a: 'start' }); return true; }   // no próprio negócio o F abre a gestão (o turno é um botão lá)   // bancada sem ninguém por perto; com balconista, é pelo diálogo
  const g = nearGather(); if (g && hasTool(g.G0.tool) && profLv((me.prof || {})[g.G0.prof]) >= g.G0.min) { if (G.gath) { G.gath = null; return true; } const tx = g.i % MAP_W, ty = Math.floor(g.i / MAP_W); me.dir = dirFromVec(tx - me.x, ty - me.y, me.dir); G.gath = { i: g.i, t0: performance.now(), ms: gatherMs(g.G0), G0: g.G0, animT: 0, x: me.x, y: me.y }; return true; }
  return false;
}
function jobsKeyUp(k) { }
function jobsTickC(now) {
  if (typeof drinkTick === 'function') drinkTick();
  const g = G.gath, me = G.me; if (!g || !me) return;
  if (me.walking || me.downed || dist(me.x, me.y, g.x, g.y) > 0.3) { G.gath = null; return; }   // andou: para de trabalhar
  if (now > g.animT) { g.animT = now + 760; Net.send({ t: 'gathering', tool: g.G0.tool, i: g.i }); }
  if (!gatherOf(WORLD.obj[g.i])) { G.gath = null; return; }   // a árvore caiu / a pedra quebrou
  if (now - g.t0 >= g.ms) { Net.send({ t: 'gather', i: g.i }); g.t0 = now; g.n = (g.n || 0) + 1; if (g.n >= 8) G.gath = null; }   // continua golpeando até acabar (o servidor manda parar)
}
// ---------- desenho: barra de coleta/turno e marcador do trabalho ----------
function drawJobsOverlay(ctx, now) {
  const me = G.me; if (!me) return; if (typeof drawCoinFx === 'function') drawCoinFx(ctx, now); if (typeof drawBlockHud === 'function') drawBlockHud(ctx, now); const ox = G.view.ox, oy = G.view.oy, P = iso(me.rx, me.ry), x = P.sx + ox, y = P.sy + oy - 62;
  const bar = (k, col, txt) => { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 20, y, 40, 5); ctx.fillStyle = col; ctx.fillRect(x - 19, y + 1, 38 * k, 3); if (txt) { ctx.font = 'bold 6px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y - 2); } ctx.restore(); };
  if (G.gath) bar(Math.min(1, (now - G.gath.t0) / G.gath.ms), '#9ad860', G.gath.G0.verb);
  if (G.shiftUntil > now) bar(1 - (G.shiftUntil - now) / G.shiftMs, '#e8c45a', 'turno');
  const J = G.job; if (J && J.step) {   // anel pulsando no lugar certo e seta na borda se estiver fora da tela
    const s = J.step, p = iso(s.x, s.y), sx = p.sx + ox, sy = p.sy + oy, pul = 1 + Math.sin(now / 220) * 0.15, W = ctx.canvas.width / (window.devicePixelRatio || 1) / SCALE, H = ctx.canvas.height / (window.devicePixelRatio || 1) / SCALE;
    ctx.save(); ctx.strokeStyle = 'rgba(232,196,90,0.95)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(sx, sy, 9 * pul, 4.5 * pul, 0, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(232,196,90,0.9)'; ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx - 4, sy - 14 - Math.sin(now / 220) * 2); ctx.lineTo(sx + 4, sy - 14 - Math.sin(now / 220) * 2); ctx.closePath(); ctx.fill();
    if (sx < 10 || sy < 10 || sx > W - 10 || sy > H - 10) { const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx), r = Math.min(W, H) / 2 - 24, ax = cx + Math.cos(a) * r, ay = cy + Math.sin(a) * r; ctx.translate(ax, ay); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-2, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
}
// ---------- painel do quadro de avisos e rastreador ----------
function jobsEvent(m) {
  if (m.t === 'jobs') { jobsBoard(m); return true; }
  if (m.t === 'job') { G.job = m.job; jobsTracker(); return true; }
  if (m.t === 'shift') { if (m.on) { G.shiftMs = m.ms; G.shiftUntil = performance.now() + m.ms; } else G.shiftUntil = 0; return true; }
  return false;
}
function jobsBoard(m) {
  let d = document.getElementById('jobboard');
  if (!d) { d = document.createElement('div'); d.id = 'jobboard'; d.className = 'gpanel hidden'; document.body.appendChild(d); }
  d.innerHTML = '<div class="gp-head"><span>Quadro de avisos</span><button class="gp-x" id="jb-x">✕</button></div>' +
    (m.job ? '<div class="est-cost">Trabalho atual: <b>' + m.job.title + '</b> (' + m.job.i + '/' + m.job.n + ')</div>' : '') +
    m.offers.map((o, k) => '<div class="est-row biz"><i style="background:#c9a24a"></i><div><b>' + o.title + '</b><small>' + o.giver + ' · ' + PROFS[o.prof] + ' · ' + o.n + ' etapas</small></div><div class="est-r"><b>' + o.pay + '</b><small>ouro</small><button class="est-btn" data-jtake="' + k + '"' + (m.job ? ' disabled' : '') + '>Aceitar</button></div></div>').join('') +
    '<div class="gp-sub">Seus ofícios</div><div class="jb-profs">' + Object.keys(PROFS).map(k => { const xp = (m.prof || {})[k] || 0, lv = profLv(xp), a = 25 * (lv - 1) ** 2, b = 25 * lv ** 2; return '<div><span>' + PROFS[k] + ' <b>' + lv + '</b></span><i><em style="width:' + (lv >= 10 ? 100 : Math.round((xp - a) / (b - a) * 100)) + '%"></em></i></div>'; }).join('') + '</div>' +
    '<div class="gp-note">Machado, picareta e foice no Empório do Borin. Turnos: aperte F perto do balcão ou da bancada de qualquer negócio.</div>';
  d.classList.remove('hidden');
  d.querySelector('#jb-x').onclick = () => d.classList.add('hidden');
  for (const b of d.querySelectorAll('[data-jtake]')) b.onclick = () => { Net.send({ t: 'job', a: 'take', k: +b.dataset.jtake }); d.classList.add('hidden'); };
}
function jobsTracker() {
  let t = document.getElementById('jobtrack'); const J = G.job;
  if (!J) { if (t) t.remove(); return; }
  if (!t) { t = document.createElement('div'); t.id = 'jobtrack'; document.body.appendChild(t); }
  t.innerHTML = '<b>' + J.title + '</b> <small>' + J.i + '/' + J.n + ' · ' + J.pay + ' ouro</small><div>➤ ' + (J.step ? J.step.t : '') + '</div><button title="Desistir">✕</button>';
  t.querySelector('button').onclick = () => gameAsk('Desistir deste trabalho?', { yes: 'Desistir' }).then(ok => { if (ok) Net.send({ t: 'job', a: 'quit' }); });
}
// ofícios na Jornada (J)
function profsHtml() { const P0 = (G.me && G.me.prof) || {}, rep = G.me ? G.me.rep ?? 50 : 50, RG = ((G.me && G.me.feats) || {}).rg || {}; return '<div class="gp-sub">Reputação em Nae</div><div class="rep-head"><b>' + repTitle(rep) + '</b><span>' + rep + ' / 100</span></div><div class="jb-profs"><div><span>Geral <b>' + rep + '</b></span><i><em style="width:' + rep + '%"></em></i></div></div>' +
    '<div class="rep-groups">' + Object.keys(REP_G).map(g => { const v = Math.round(RG[g] || 0); return '<div><span>' + REP_G[g] + '</span><i class="rep-bi"><em style="' + (v >= 0 ? 'left:50%;width:' + (v / 2) + '%;background:#8ac46a' : 'left:' + (50 + v / 2) + '%;width:' + (-v / 2) + '%;background:#d86a5a') + '"></em></i><b>' + (v > 0 ? '+' : '') + v + '</b></div>'; }).join('') + '</div>' +
    '<div class="gp-note"><b>Vantagens:</b> ' + REP_PERKS.map(([m, t]) => (m === 30 ? (rep < 30 ? '<b style="color:#ff9a8a">' + t + '</b>' : '') : '<span style="opacity:' + (rep >= m ? 1 : 0.45) + '">' + (rep >= m ? '✓ ' : '') + t + '</span>')).filter(Boolean).join(' · ') + '</div>' +
    '<div class="gp-note"><b>Como subir:</b> presentes (cada grupo e cada morador tem gostos — o presente certo vale mais; repetir o mesmo vale menos), doar à capela, pegar ladrões (Guarda e Comerciantes), trabalhos e turnos, aluguéis e impostos em dia, comprar no comércio. Crimes derrubam com a Guarda e com a cidade.</div><div class="gp-note">Sobe com o que os moradores acham de você, trabalhos feitos, ladrões pegos, negócios e aluguéis em dia; desce com crimes. Com 70 o Conselho vende o banco.</div><div class="gp-sub">Ofícios</div><div class="jb-profs">' + Object.keys(PROFS).map(k => { const xp = P0[k] || 0, lv = profLv(xp), a = 25 * (lv - 1) ** 2, b = 25 * lv ** 2; return '<div><span>' + PROFS[k] + ' <b>' + lv + '</b></span><i><em style="width:' + (lv >= 10 ? 100 : Math.round((xp - a) / (b - a) * 100)) + '%"></em></i></div>'; }).join('') + '</div>'; }
