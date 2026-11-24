// ============================================================
//  F COM MENU DE ESCOLHA (3.4): o F continua fazendo tudo; quando há mais de uma ação
//  perto (falar com alguém, abrir um baú, a placa, coletar...), abre um menu para escolher.
//  F de novo (ou 1) faz a primeira, que é a que o F já faria; 2 a 9 escolhem; Esc ou andar fecha.
// ============================================================
function faName(id, def) { const e = G.npcs && G.npcs[id]; return e && e.name ? String(e.name).split(',')[0] : def; }
function faWater() { const me = G.me; if (!me || !((me.water ?? 100) < 98 || (me.hasSkin && (me.pots.water || 0) < 5))) return false; for (let y = Math.round(me.y) - 4; y <= Math.round(me.y) + 4; y++) for (let x = Math.round(me.x) - 4; x <= Math.round(me.x) + 4; x++) if (isWaterAt(x, y) && dist(me.x, me.y, x, y) < 4.6) return true; return false; }
const fx = n => typeof window[n] === 'function';
/* as ações na mesma ordem em que o F as testa (a primeira da lista é a que o F faria sozinho) */
function faActions() {
  const me = G.me, L = [], add = (t, run) => L.push({ t, run });
  if (fx('empNear') && empNear()) add('Ordens para ' + ((G.emp && G.emp.n) || 'a doméstica'), () => empMenu());
  if (fx('segNear')) { const s = segNear(); if (s) add('Ordens para ' + faName(s.id, 'o segurança'), () => segMenu(s.id)); }
  if (fx('duelPlayerNear')) { const q = duelPlayerNear(); if (q) add('Desafiar ' + q.name + ' para um duelo', () => dojoF()); }
  if (fx('liftNear') && liftNear()) add('Usar o elevador', () => liftMenu());
  if (fx('leverNear') && leverNear()) add('Mexer a alavanca da água', () => Net.send({ t: 'tub' }));
  if (fx('ofuroNear') && ofuroNear()) add('Entrar no ofurô', () => bathEnter());
  if (fx('csSpot')) { const s = csSpot(); if (s) add(s.k === 'pick' ? 'Abrir a porta dos fundos (gazua)' : (s.up ? 'Subir pela hera' : 'Descer pela hera'), () => csF()); }
  if (fx('velNear')) { const v = velNear(); if (v) add('Falar com ' + faName(v.id, 'o atendente'), () => Net.send({ t: 'vel', a: 'talk', id: v.id })); }
  if (fx('tatNear') && tatNear()) add('Falar com o tatuador', () => Net.send({ t: 'tat', a: 'open' }));
  if (fx('prazNear') && prazNear()) add('Falar com a Lívia', () => Net.send({ t: 'praz', a: 'open' }));
  if (fx('prazWho')) { const w = prazWho(); if (w) add('Falar com ' + faName(w, 'o atendente'), () => Net.send({ t: 'praz', a: 'talk', who: w })); }
  if (fx('prazInPool') && prazInPool()) add('Opções da piscina', () => prazPoolMenu());
  if (fx('infNear') && infNear()) add('Ouvir o pregoeiro', () => Net.send({ t: 'inf', a: 'open', place: 'plaza' }));
  if (fx('houseNear')) { const h = houseNear(); if (h) add('Falar com ' + faName(h.id, 'o nobre'), () => Net.send({ t: 'house', a: 'open', id: h.id })); }
  if (fx('courtNear')) { const c = courtNear(); if (c) add('Falar com ' + faName(c.id, 'a corte'), () => Net.send({ t: 'court', a: 'open', id: c.id })); }
  if (fx('entNear')) { const e = entNear(); if (e) add('Ordens para a guardiã', () => entMenu(e)); }
  if (fx('entLogNear')) { const g = entLogNear(); if (g) add('Pegar o galho caído (lenha)', () => Net.send({ t: 'ent', a: 'log', id: g.id })); }
  if (fx('mealNear') && mealNear()) add('Comer da bandeja', () => Net.send({ t: 'emp', a: 'mealeat' }));
  if (fx('purseNear')) { const pu = purseNear(); if (pu) add('Pegar a bolsa caída', () => Net.send({ t: 'emp', a: 'purse', id: pu.id })); }
  if (fx('dummyNear') && dummyNear() && !G.training) add('Treinar no boneco', () => { const fd = fx('dummyFacing') ? dummyFacing() : null; Net.send({ t: 'train', a: 'start', i: fd ? DUMMIES.indexOf(fd) : undefined }); });
  if ((G.chests || []).some(c => c.mine && !c.open && dist(c.x, c.y, me.x, me.y) <= 1.8)) add('Abrir o baú', () => openNearChest(1.8));
  if (fx('boundNear')) { const q = boundNear(); if (q) add('Desamarrar ' + (q.name || 'a pessoa'), () => Net.send({ t: 'untie', id: q.id })); }
  if (fx('cellDoorNear') && cellDoorNear() >= 0) add('Abrir a cela', () => Net.send({ t: 'opencell' }));
  if (fx('nearStove') && nearStove()) add('Cozinhar no fogão', () => openCook());
  if (G.job && G.job.step && dist(me.x, me.y, G.job.step.x, G.job.step.y) < 1.8) add('Fazer a tarefa do serviço', () => { if (G.job.step.k === 'sweep') me.anim = { a: 'sweep', t0: performance.now(), ms: 1500 }; Net.send({ t: 'job', a: 'step' }); });
  if (typeof NOTICE !== 'undefined' && NOTICE.x >= 0 && dist(me.x, me.y, NOTICE.x, NOTICE.y) < 2) add('Ver o quadro de serviços', () => Net.send({ t: 'job', a: 'board' }));
  if (fx('shiftHere') && G.shiftUntil <= performance.now() && shiftHere() && !(fx('talkTarget') && talkTarget()) && !(fx('estInBiz') && estInBiz())) add('Começar o turno de trabalho', () => Net.send({ t: 'shift', a: 'start' }));
  if (fx('nearGather')) { const g = nearGather(); if (g && hasTool(g.G0.tool) && profLv((me.prof || {})[g.G0.prof]) >= g.G0.min) add(g.G0.verb ? g.G0.verb[0].toUpperCase() + g.G0.verb.slice(1) : 'Coletar', () => jobsF({ repeat: false })); }
  if (fx('hotelChestNear') && hotelChestNear()) add('Abrir o baú da cabine', () => hotelChestF());
  if (fx('talkTarget')) { const t = talkTarget(); if (t) add(t.k === 'n' ? 'Falar com ' + faName(t.id, 'a pessoa') : 'Dar ou seguir: ' + String((G.players[t.id] || {}).name || 'jogador').replace(/</g, ''), () => { if (t.k === 'n') openDialog(t.id); else giveOpen(t.id); }); }
  if (fx('estChestHere') && estChestHere()) add('Abrir o baú da casa', () => chestOpen());
  else if (fx('estInHome') && estInHome()) add('Painel da sua casa', () => estToggle(true, 'mine'));
  if (fx('estInBiz')) { const b = estInBiz(); if (b) add('Gerenciar ' + ((PROPS_BY[b.pid] || {}).name || 'o negócio'), () => bizOpen(b.pid)); }
  if (fx('estNearSign')) { const P = estNearSign(); if (P) add('Ver a placa: ' + P.name, () => estToggle(true, P.kind === 'bank' || P.kind === 'hotel' ? 'shop' : P.kind, P.id)); }
  if (fx('nearHarvest') && nearHarvest() >= 0) add('Colher', () => Net.send({ t: 'harvest', i: nearHarvest() }));
  if (me.inv && (me.inv.venison || me.inv.pork) && typeof nearFireC === 'function' && nearFireC()) add('Assar a carne na fogueira', () => Net.send({ t: 'cook' }));
  if (faWater()) add('Beber água', () => drinkGo());
  if ((me.arw || []).length) add('Arrancar a flecha cravada', () => Net.send({ t: 'pullarrow' }));
  /* ações iguais (ex.: duas formas de abrir o mesmo baú) aparecem uma vez só */
  const seen = new Set(); return L.filter(a => !seen.has(a.t) && seen.add(a.t));
}
/* situações em que o F tem dono certo: o menu não abre */
function faExclusive() { const me = G.me; if (!me || me.downed || G.dialog || G.riding || G.loot || G.gath || G.csAct || G.training) return true;
  if (me.carrying || me.dragMode || me.lifted || me.carriedBy) return true; if (G.duel && G.duel.st === 'fight') return true; if (G.appleOffer && performance.now() < G.appleOffer.until) return true;
  if (fx('nearestDowned') && nearestDowned()) return true; if (fx('nearCorpse') && nearCorpse()) return true; if (fx('myCell') && myCell()) return true; return false; }
function faClose() { const d = document.getElementById('fa-menu'); if (d) d.remove(); G.faMenu = null; }
function faOpen(L) { faClose(); G.faMenu = { L, x: G.me.x, y: G.me.y };
  const d = document.createElement('div'); d.id = 'fa-menu'; d.className = 'gpanel';
  d.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);top:auto;transform:translateX(-50%);width:min(340px,calc(100vw - 32px));z-index:40;padding:8px';
  d.innerHTML = '<div class="gp-sub" style="margin:2px 4px 6px">O que fazer?</div>' + L.slice(0, 9).map((a, i) => '<button class="est-btn' + (i ? ' ghost' : '') + '" data-fa="' + i + '" style="display:flex;width:100%;margin:3px 0;text-align:left;gap:8px"><kbd>' + (i ? i + 1 : 'F') + '</kbd><span>' + a.t.replace(/</g, '') + '</span></button>').join('') + '<div class="gp-note" style="margin:4px">F ou 1 faz a primeira; 2 a 9 escolhem; Esc ou andar fecha.</div>';
  document.body.appendChild(d); for (const b of d.querySelectorAll('[data-fa]')) b.onclick = () => faPick(+b.dataset.fa); }
function faPick(i) { const M = G.faMenu; if (!M || !M.L[i]) return; faClose(); try { M.L[i].run(); } catch (e) { console.warn('F', e); } }
if (typeof window !== 'undefined' && typeof G !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '') || G.paused || !G.started) return;
    const k = (e.key || '').toLowerCase();
    if (G.faMenu) {   /* menu aberto: F/1-9 escolhem, Esc fecha; as outras teclas seguem normalmente */
      if (k === 'escape') { faClose(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k === 'f' && !e.repeat) { faPick(0); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k >= '1' && k <= '9') { faPick(+k - 1); e.preventDefault(); e.stopImmediatePropagation(); return; }
      return; }
    if (k !== 'f' || e.repeat || faExclusive()) return;
    let L = []; try { L = faActions(); } catch (er) { return; }
    if (L.length < 2) return;   /* uma ação só (ou nenhuma): o F de sempre */
    faOpen(L); e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  /* andar para longe fecha o menu */
  setInterval(() => { const M = G.faMenu; if (M && G.me && Math.hypot(G.me.x - M.x, G.me.y - M.y) > 1.2) faClose(); }, 250);
}
