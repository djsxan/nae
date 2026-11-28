// ============================================================
//  PLEBEU E GUILDAS (lista 15, 28/11)
//  Personagem novo chega a Nae como plebeu: roupa simples, só punhos e briga de rua, sem árvore de habilidades.
//  Junta dinheiro com trabalhos pequenos, compra a arma básica da vocação (espada ou arco na forja do Hrodgar,
//  cajado na Arcanos & Varinhas, 150 de ouro) e paga a matrícula (250) ao mestre da guilda:
//    Cavaleiros no Quartel da Guarda · Arqueiros na Casa da Guarda · Magos na Arcanos & Varinhas.
//  A matrícula dá a roupa básica, a arma básica e libera a árvore. Quem já tinha vocação continua membro.
//  Salvo no navegador como "nome|plebeu" até entrar numa guilda; depois vira "nome|vocação".
// ============================================================
const GUILD = { arm: 150, fee: 250,
  g: { knight: { n: 'Guilda dos Cavaleiros', b: 'Quartel da Guarda', item: 'arm_sword', id: 'gd_knight', name: 'Sor Bertrand, Mestre de Armas', look: ['knight', 'iron', '#5a5a64', '#c8a040'] },
       archer: { n: 'Guilda dos Arqueiros', b: 'Casa da Guarda', item: 'arm_bow', id: 'gd_archer', name: 'Mestra Ilsa, das Flechas', look: ['archer', 'scout~f', '#2a5a2a', '#c8a060'] },
       mage: { n: 'Círculo dos Magos', b: 'Arcanos & Varinhas', item: 'arm_staff', id: 'gd_mage', name: 'Mestre Aurelian, do Círculo', look: ['mage', 'adept', '#2a2a6a', '#d8c070'] } } };
if (typeof LOOT !== 'undefined') Object.assign(LOOT, {
  arm_sword: { name: 'Espada de treino', price: 150, icon: '🗡️', color: '#b8bcc4', desc: 'A arma básica do cavaleiro. Leve ao Sor Bertrand, no Quartel da Guarda, com a matrícula.' },
  arm_bow: { name: 'Arco simples', price: 150, icon: '🏹', color: '#a07a4a', desc: 'A arma básica do arqueiro. Leve à Mestra Ilsa, na Casa da Guarda, com a matrícula.' },
  arm_staff: { name: 'Cajado de aprendiz', price: 150, icon: '🪄', color: '#8a6ad0', desc: 'A arma básica do mago. Leve ao Mestre Aurelian, na Arcanos & Varinhas, com a matrícula.' } });
const gdPleb = p => !!p && p.voc === 0;

/* os mestres: dentro do prédio da guilda, no lugar livre mais perto do meio */
if (typeof NPCS !== 'undefined' && typeof BUILDINGS !== 'undefined' && typeof bldTiles === 'function') for (const cls in GUILD.g) { const G0 = GUILD.g[cls]; if (NPCS.some(q => q.id === G0.id)) continue; const bi = BUILDINGS.findIndex(b => b.name === G0.b); if (bi < 0) continue;
  const b = BUILDINGS[bi], T = bldTiles(bi), cx = b.x + b.w / 2, cy = b.y + b.h / 2; if (!T.length) continue; T.sort((a, c) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(c[0] - cx, c[1] - cy)); const [x, y] = T[Math.min(1, T.length - 1)];
  const def = { id: G0.id, name: G0.name, kind: G0.id, x: x + 0.5, y: y + 0.5, bi }; G0.bi = bi; NPCS.push(def);
  if (typeof G !== 'undefined' && G.npcs && typeof mkEnt === 'function' && !G.npcs[G0.id]) G.npcs[G0.id] = mkEnt({ ...def, isNpc: true, visible: true, dir: 0 }); }

// ---------------- SERVIDOR ----------------
if (typeof pinfo === 'function' && typeof S !== 'undefined') { const _piGd = pinfo; pinfo = function (p) { const r = _piGd.apply(this, arguments); if (p.voc != null) r.voc = p.voc === 0 ? 0 : 1; return r; }; }
function gdMakePleb(p) { p.voc = 0; p.cls = 'knight'; p.outfit = 'cas'; p.sheathed = true; p.tree = {}; p.maxHp = maxHpOf(p); p.maxMp = maxMpOf(p); p.hp = Math.min(p.hp || p.maxHp, p.maxHp); }
if (typeof hostOnClient === 'function' && typeof S !== 'undefined') { const _hoGd = hostOnClient; hostOnClient = function (from, m) {
  const p0 = S.players[from];
  if (m && p0 && gdPleb(p0)) {   /* o plebeu não tem arma, roupa de vocação nem árvore */
    if (m.t === 'sheathe') { tell(p0, 'Você ainda não tem arma de vocação: por enquanto, só os punhos. Entre numa guilda (Quartel da Guarda, Casa da Guarda ou Arcanos & Varinhas).'); return; }
    if (m.t === 'roupa' && m.a === 'wear') { tell(p0, 'Plebeu só tem a roupa do corpo. A roupa de vocação vem com a guilda.'); return; }
    if (m.t === 'tlearn') { tell(p0, 'A árvore de habilidades abre quando você entrar numa guilda.'); return; } }
  const r = _hoGd.apply(this, arguments);
  if (m && m.t === 'hello') { const p = S.players[from]; if (p && p.voc == null) { p.voc = m.lvl ? (m.voc === 0 ? 0 : 1) : 0; if (p.voc === 0) { gdMakePleb(p); setTimeout(() => { try { if (!S.players[from]) return; sendStat(p); Net.toAll({ t: 'pinfo', p: pinfo(p) }); tell(p, '🧺 Você chega a Nae como plebeu, com a roupa do corpo e alguns trocados. Faça biscates (quadro do chafariz, turnos nas oficinas), compre a arma de uma vocação e pague a matrícula numa guilda.'); } catch (e) { } }, 1200); } Net.toOne(from, { t: 'gdme', voc: p.voc }); } }
  return r; }; }
/* compra da arma básica (forja e arcanos) e matrícula com o mestre */
if (typeof npcAction === 'function' && typeof S !== 'undefined') { const _naGd = npcAction; npcAction = function (p, m) {
  if (m && m.a === 'gdbuy') { const k = String(m.item || ''), sn = S.npcs[m.n]; if (!['arm_sword', 'arm_bow', 'arm_staff'].includes(k) || !sn || dist(p.x, p.y, sn.x, sn.y) > 4) return; const say = text => Net.toOne(p.id, { t: 'npc', n: m.n, text });
    if (!p.inv[k] && Object.keys(p.inv).length >= INV_SLOTS) { say('Sua mochila está cheia.'); return; } if (!canPay(p, GUILD.arm)) { say('Custa ' + GUILD.arm + ' de ouro. Junte com uns biscates e volte.'); return; }
    payCity(p, GUILD.arm); p.inv[k] = (p.inv[k] || 0) + 1; sendStat(p); say(LOOT[k].icon + ' ' + LOOT[k].name + '. Agora leve ao mestre da guilda, com a matrícula.'); return; }
  const cls = m && Object.keys(GUILD.g).find(c => GUILD.g[c].id === m.n); if (!cls) return _naGd.apply(this, arguments);
  const G0 = GUILD.g[cls], sn = S.npcs[G0.id]; if (!sn || sn.dead || sn.downed) return; if (dist(p.x, p.y, sn.x, sn.y) > 3.5) { tell(p, 'Chegue mais perto para conversar.'); return; } const say = text => Net.toOne(p.id, { t: 'npc', n: G0.id, text });
  if (m.a === 'gdtalk') { say(cls === 'knight' ? 'Aqui se aprende a aguentar o golpe e devolver em dobro. Escudo, espada e disciplina. Um dia esta casa vai ensinar as artes avançadas.' : cls === 'archer' ? 'O arco pede paciência: respirar, mirar, soltar. Da muralha, um bom arqueiro vale dez espadas. Um dia vamos ensinar os tiros de mestre aqui.' : 'Os cinco elementos respondem a quem estuda. Fogo, Ar, Terra, Luz e Água. Um dia este círculo vai ensinar os rituais maiores.'); return; }
  if (m.a === 'gdjoin') { if (!gdPleb(p)) { say(p.cls === cls ? 'Você já é dos nossos. Treine e volte quando a academia abrir as artes avançadas.' : 'Você já pertence a outra guilda.'); return; }
    if (!(p.inv[G0.item] > 0)) { say('Primeiro a arma: ' + LOOT[G0.item].name + ' (' + GUILD.arm + ' de ouro, ' + (G0.item === 'arm_staff' ? 'aqui no balcão da Arcanos & Varinhas' : 'na forja do Hrodgar') + '). Depois a matrícula, ' + GUILD.fee + '.'); return; }
    if (!canPay(p, GUILD.fee)) { say('A matrícula é ' + GUILD.fee + ' de ouro. Volte quando tiver.'); return; }
    payCity(p, GUILD.fee); p.inv[G0.item]--; if (p.inv[G0.item] <= 0) delete p.inv[G0.item];
    const SP = skinParts(p.skin); p.cls = cls; p.voc = 1; p.skin = skinJoin(SKINS[cls][0].id, SP.fem, SP.tats, SP.body); p.outfit = null; p.tree = cleanTree(cls, p.lvl, {}); p.maxHp = maxHpOf(p); p.maxMp = maxMpOf(p); p.hp = p.maxHp; p.mp = p.maxMp; p.sheathed = true;
    sendStat(p); Net.toAll({ t: 'pinfo', p: pinfo(p) }); Net.toOne(p.id, { t: 'gdme', voc: 1, cls, joined: 1 }); near(sn.x, sn.y, { t: 'anim', w: 'n', id: G0.id, a: 'salute', ms: 1400 });
    say('Bem-vindo à ' + G0.n + '! Esta é a sua roupa, esta é a sua arma. A árvore de habilidades está aberta para você (K). Treine.'); if (typeof sys === 'function') sys('⚔ ' + p.name + ' entrou para a ' + G0.n + '.'); if (typeof estateSave === 'function') estateSave(); return; }
  return _naGd.apply(this, arguments); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function') for (const cls in GUILD.g) { const G0 = GUILD.g[cls], [c, sk, col] = G0.look; NPC_LOOKS[G0.id] = () => Object.assign(heroLook(c, sk, col), {}); if (typeof NPC_CLS !== 'undefined') NPC_CLS[G0.id] = c; }
if (typeof NPC_DIALOG !== 'undefined') {
  const join = cls => ['⚔ Matricular-se — ' + GUILD.fee + ' ouro (com a ' + (LOOT[GUILD.g[cls].item] || {}).name + ')', { a: 'gdjoin' }], talk = ['O que a guilda ensina?', { a: 'gdtalk' }];
  NPC_DIALOG.gd_knight = { greet: 'Sor Bertrand, mestre de armas da Guilda dos Cavaleiros. Quer vestir o tabardo? Traga a espada e a matrícula.', opts: [join('knight'), talk] };
  NPC_DIALOG.gd_archer = { greet: 'Ilsa. Ensino o arco aos que têm paciência. Traga o seu arco e a matrícula, e a muralha ganha mais um par de olhos.', opts: [join('archer'), talk] };
  NPC_DIALOG.gd_mage = { greet: 'Aurelian, do Círculo dos Magos. O cajado escolhe quem o merece… e a matrícula ajuda.', opts: [join('mage'), talk] };
  const buyArm = k => [LOOT[k].icon + ' ' + LOOT[k].name + ' — ' + GUILD.arm + ' ouro (arma básica da guilda)', { a: 'gdbuy', item: k }];
  if (NPC_DIALOG.smith) NPC_DIALOG.smith.opts.splice(NPC_DIALOG.smith.opts.length - 1, 0, buyArm('arm_sword'), buyArm('arm_bow'));
  if (NPC_DIALOG.st_arcane) NPC_DIALOG.st_arcane.opts.splice(1, 0, buyArm('arm_staff')); }
/* salvar: plebeu fica em "nome|plebeu" (não sobrescreve um herói de mesmo nome) */
if (typeof charKey === 'function' && typeof G !== 'undefined') { const _ckGd = charKey; charKey = function (name, cls) { if (G._gdPleb) return String(name || '').trim().toLowerCase() + '|plebeu'; return _ckGd.apply(this, arguments); }; }
if (typeof saveChar === 'function' && typeof G !== 'undefined') { const _scGd = saveChar; saveChar = function () { if (G.me && G.me.voc == null && G._gdVocPend != null) G.me.voc = G._gdVocPend; if (G.me && G.me.voc == null) return;   /* antes de o anfitrião dizer se é plebeu, não salva (gravaria na vocação errada) */
  G._gdPleb = !!(G.me && G.me.voc === 0); try { return _scGd.apply(this, arguments); } finally { G._gdPleb = false; } }; }
function gdPlebSave(name) { try { return loadChars()[String(name || '').trim().toLowerCase() + '|plebeu'] || null; } catch (e) { return null; } }
/* entrar no mundo: sem herói salvo desta vocação, mas com plebeu salvo, continua o plebeu */
if (typeof helloMsg === 'function' && typeof G !== 'undefined') { const _hmGd = helloMsg; helloMsg = function () { const r = _hmGd.apply(this, arguments);
  try { const name = r.name || ($('name') && $('name').value) || '', has = loadChars()[_ckGdKey(name, chosenClass)], pl = gdPlebSave(name);
    if (!has && pl) { for (const k of ['lvl', 'xp', 'gold', 'pots', 'food', 'water', 'infect', 'inv', 'quests', 'qdone', 'prof', 'feats', 'body', 'bleed', 'lost', 'pro', 'jailLeft', 'use', 'hasSkin', 'cloak']) if (pl[k] !== undefined) r[k] = pl[k]; if (pl.uid) { r.uid = pl.uid; G.myUid = pl.uid; } r.voc = 0; r.tree = {}; }
    else if (!has && !pl) r.voc = 0; else r.voc = 1; } catch (e) { }
  return r; }; }
function _ckGdKey(name, cls) { return String(name || '').trim().toLowerCase() + '|' + cls; }
if (typeof clientOnServer === 'function' && typeof G !== 'undefined') { const _coGd = clientOnServer; clientOnServer = function (m) {
  if (m && m.t === 'gdme') { if (!G.me) G._gdVocPend = m.voc; if (G.me) { G.me.voc = m.voc; if (m.joined && m.cls) { try { const all = loadChars(), nm = String(G.me.name || '').trim().toLowerCase(), old = all[nm + '|' + m.cls]; if (old) all[nm + '|' + m.cls + '~antigo'] = old; delete all[nm + '|plebeu']; localStorage.setItem(SAVE_KEY, JSON.stringify(all)); } catch (e) { } chosenClass = m.cls; setTimeout(() => { try { saveChar(); } catch (e) { } }, 600); showToast('⚔ Você entrou para a ' + GUILD.g[m.cls].n + '! Árvore de habilidades aberta (K).'); } } return; }
  return _coGd.apply(this, arguments); }; }
/* árvore: o plebeu vê o caminho até a guilda */
if (typeof updateTree === 'function' && typeof G !== 'undefined') { const _utGd = updateTree; updateTree = function () { if (!(G.me && G.me.voc === 0)) return _utGd.apply(this, arguments); const t = $('tree'); if (!t) return;
  t.innerHTML = '<div class="gp-note" style="padding:14px;line-height:1.5"><b>🧺 Você ainda é plebeu.</b><br>A árvore de habilidades abre quando você entrar numa guilda.<br><br>1. Junte ouro com biscates no quadro do chafariz (sacos no porto, baias do estábulo, olivais, recados, água, caixas, entregas) e turnos nas oficinas.<br>2. Compre a arma básica: <b>Espada de treino</b> ou <b>Arco simples</b> na forja do Hrodgar, <b>Cajado de aprendiz</b> na Arcanos & Varinhas (' + GUILD.arm + ' de ouro).<br>3. Pague a matrícula (' + GUILD.fee + ') ao mestre:<br>· Cavaleiros: <b>Sor Bertrand</b>, no Quartel da Guarda<br>· Arqueiros: <b>Mestra Ilsa</b>, na Casa da Guarda<br>· Magos: <b>Mestre Aurelian</b>, na Arcanos & Varinhas</div>'; }; }
/* tela inicial: avisa que o personagem novo chega como plebeu */
if (typeof document !== 'undefined' && typeof G !== 'undefined') setInterval(() => { try { if (G.started) return; const el = $('saved-info'), nm = $('name') && $('name').value.trim(); if (!el || !nm) return; const has = loadChars()[_ckGdKey(nm, chosenClass)], pl = gdPlebSave(nm);
  const txt = has ? null : pl ? 'Continuar: ' + pl.name + ', plebeu nível ' + (pl.lvl || 1) + ' (' + (pl.gold || 0) + ' ouro)' : 'Novo personagem: ' + nm + ' chega a Nae como plebeu. A vocação vem depois, numa guilda.'; if (txt && el.textContent !== txt) el.textContent = txt; } catch (e) { } }, 500);
