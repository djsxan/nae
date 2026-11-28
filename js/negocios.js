// ============================================================
//  ARMARIA DA MURALHA E CAFÉ GOURMET (Prancheta 28/11)
//  Dois negócios compráveis como as outras lojas: dono NPC (vende o ponto), balconista, estoque e margem.
//  · Armaria da Muralha (sul, ao lado da vila romana): Espadas, Arcos e Cajados, que viram as armas básicas das guildas.
//  · Café Gourmet (norte, perto das Termas): café coado na hora e fatias de bolo.
// ============================================================
if (typeof LOOT !== 'undefined') Object.assign(LOOT, {
  coffee: { name: 'Café Coado', price: 6, icon: '☕', color: '#6a4a2a', desc: 'Café quentinho do Café Gourmet. Bebido, enche o fôlego e deixa Animado por um tempo.' },
  cakeslice: { name: 'Fatia de Bolo', price: 18, icon: '🍰', color: '#e8b8a0', desc: 'Bolo de nozes com cobertura, do Café Gourmet. Enche a barriga.' } });

// ---------------- SERVIDOR ----------------
if (typeof useItem === 'function' && typeof S !== 'undefined') { const _uiNg = useItem; useItem = function (p, k) {
  if ((k === 'coffee' || k === 'cakeslice') && p && p.inv && p.inv[k] > 0 && !p.downed) { const now = now_(); if (now < (p.useT || 0)) return; p.useT = now + 600;
    if (--p.inv[k] <= 0) delete p.inv[k];
    if (k === 'coffee') { p.water = Math.min(100, (p.water || 0) + 15); p.cst = typeof cstMaxOf === 'function' ? cstMaxOf(p) : p.cst; p.buffs.cheer = Math.max(p.buffs.cheer || 0, now) + 240000; tell(p, '☕ Café coado: fôlego cheio e Animado por 4 minutos.'); }
    else { p.food = Math.min(100, (p.food || 0) + 35); tell(p, '🍰 Que bolo! A barriga agradece.'); }
    near(p.x, p.y, { t: 'anim', w: 'p', id: p.id, a: 'drink', ms: 1200 }); sendStat(p); return; }
  return _uiNg.apply(this, arguments); }; }

// ---------------- CLIENTE ----------------
if (typeof NPC_DIALOG !== 'undefined') Object.assign(NPC_DIALOG, {
  st_arms: { greet: 'Tobias Malho, armeiro. Espada, arco ou cajado: as armas de quem quer entrar numa guilda saem daqui.', opts: [['Comprar no balcão', { counter: 1 }], ['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] },
  st_cafe: { greet: 'Bem-vinda ao Café Gourmet! Café coado na hora e bolo de nozes. Senta, que eu levo.', opts: [['Comprar no balcão', { counter: 1 }], ['Gerenciar o negócio', { open: 'biz' }], ['Quem é o dono daqui?', { owner: 1 }]] } });
if (typeof NPC_LOOKS !== 'undefined' && typeof heroLook === 'function' && typeof tone === 'function') {
  NPC_LOOKS.st_arms = () => Object.assign(heroLook('knight', 'iron', '#5a3a22'), { armor: 'leather', body: tone('#5a3a22'), body2: tone('#3a2416'), accent: tone('#8a8c92'), trim: tone('#8a8c92'), head: 'none', hairStyle: 'short', hair: tone('#4a3020'), beard: tone('#4a3020'), weapon: 'hammer', shield: null, cape: false });
  NPC_LOOKS.st_cafe = () => Object.assign(heroLook('archer', 'scout~f', '#6a4a2a'), { armor: 'vest', body: tone('#efe6d8'), body2: tone('#6a4a2a'), accent: tone('#c8a060'), trim: tone('#6a4a2a'), head: 'none', hairStyle: 'bun', hair: tone('#2a1a10'), weapon: null, shield: null }); }
if (typeof NPC_CLS !== 'undefined') { NPC_CLS.st_arms = 'knight'; NPC_CLS.st_cafe = 'archer'; }
if (typeof FEM_KINDS !== 'undefined') FEM_KINDS.add('st_cafe');
