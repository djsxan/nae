// ============================================================
//  VITRINES DO ATELIÊ · MAÇÃ DA MARTA · BARRA DE MEDALHÕES
// ============================================================
// ---------- vitrine: pedestal de pedra, manequim com uma skin e caixa de vidro com moldura dourada ----------
const VIT_ALL = (() => { const l = []; for (const cls in SKINS) SKINS[cls].forEach(s => l.push([cls, s.id])); return l; })();
const VIT_CACHE = new Map();
function vitrineSprite(i) {
  const k = (hash2(i % MAP_W, Math.floor(i / MAP_W), 77) * VIT_ALL.length | 0), slot = (k + Math.floor(Date.now() / 25000)) % VIT_ALL.length, [cls, skin] = VIT_ALL[slot];
  const key = cls + skin; let s = VIT_CACHE.get(key); if (s) return s;
  if (!R3.ok) return smallSprite('crate');
  R3.budget = Math.max(R3.budget, 1);
  const hs = heroSprite3D(cls, skin, '#6e1424', { dir: 1, walk: -1 }); if (!hs) return smallSprite('crate');
  const K = 3, W = 46, H = 88, c = document.createElement('canvas'); c.width = W * K; c.height = H * K; const x = c.getContext('2d'); x.scale(K, K);
  const cx = W / 2, by = H - 6;
  x.fillStyle = 'rgba(0,0,0,0.28)'; x.beginPath(); x.ellipse(cx, by + 1, 18, 6, 0, 0, 7); x.fill();
  // pedestal
  x.fillStyle = '#d8d0bc'; x.beginPath(); x.moveTo(cx - 16, by - 4); x.lineTo(cx, by + 4); x.lineTo(cx + 16, by - 4); x.lineTo(cx, by - 12); x.closePath(); x.fill();
  x.fillStyle = '#b8ae98'; x.beginPath(); x.moveTo(cx - 16, by - 4); x.lineTo(cx, by + 4); x.lineTo(cx, by + 9); x.lineTo(cx - 16, by + 1); x.closePath(); x.fill();
  x.fillStyle = '#a49a84'; x.beginPath(); x.moveTo(cx + 16, by - 4); x.lineTo(cx, by + 4); x.lineTo(cx, by + 9); x.lineTo(cx + 16, by + 1); x.closePath(); x.fill();
  // manequim (a skin), um pouco menor
  const sc = 0.82; x.drawImage(hs.c, cx - hs.ax * sc, by - 6 - hs.ay * sc, hs.w * sc, hs.h * sc);
  // caixa de vidro com arestas douradas
  const top = by - 74; x.fillStyle = 'rgba(190,220,235,0.10)'; x.beginPath(); x.moveTo(cx - 16, by - 4); x.lineTo(cx - 16, top + 4); x.lineTo(cx, top + 12); x.lineTo(cx + 16, top + 4); x.lineTo(cx + 16, by - 4); x.lineTo(cx, by + 4); x.closePath(); x.fill();
  x.strokeStyle = '#d4a94a'; x.lineWidth = 1; x.beginPath();
  for (const [a, b] of [[[cx - 16, by - 4], [cx - 16, top + 4]], [[cx + 16, by - 4], [cx + 16, top + 4]], [[cx, by + 4], [cx, top + 12]], [[cx - 16, top + 4], [cx, top - 4]], [[cx, top - 4], [cx + 16, top + 4]], [[cx + 16, top + 4], [cx, top + 12]], [[cx, top + 12], [cx - 16, top + 4]]]) { x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); }
  x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.22)'; x.beginPath(); x.moveTo(cx - 13, top + 10); x.lineTo(cx - 9, top + 12); x.lineTo(cx - 9, by - 12); x.lineTo(cx - 13, by - 14); x.closePath(); x.fill();   // reflexo
  x.fillStyle = '#d4a94a'; x.beginPath(); x.moveTo(cx - 16, top + 4); x.lineTo(cx, top - 4); x.lineTo(cx + 16, top + 4); x.lineTo(cx, top + 12); x.closePath(); x.globalAlpha = 0.35; x.fill(); x.globalAlpha = 1;
  s = { c, w: W, h: H, ax: cx, ay: by }; VIT_CACHE.set(key, s); return s;
}

// ---------- Marta oferece uma maçã a quem está com fome (15% de chance por encontro, no máximo 1 vez a cada 10 min) ----------
const APPLE_CHANCE = 0.15, APPLE_CD = 600000;
function martaApple(now) {
  const e = G.npcs.fruit, me = G.me; if (!e || !me || e.npDown || e.npDead || !LIFE.atStall || e.walking) return;
  const d = dist(e.rx, e.ry, me.x, me.y), hungry = (me.food ?? 100) < 40;
  if (G.appleOffer && (now > G.appleOffer.until || d > 4.5)) { G.appleOffer = null; e.custP = e.custP && e.custP.offer ? null : e.custP; }
  if (d > 3.6) { G.appleNear = false; return; }
  if (G.appleNear || !hungry) { G.appleNear = true; return; }
  G.appleNear = true; let last = 0; try { last = +localStorage.getItem('nae_apple') || 0; } catch (er) { }
  if (Date.now() - last < APPLE_CD || Math.random() > APPLE_CHANCE) return;
  try { localStorage.setItem('nae_apple', String(Date.now())); } catch (er) { }
  G.appleOffer = { until: now + 9000 }; e.bubble = { t: '🍎', until: now + 9000 };
  showToast('Marta: "Ô, querido, que cara de fome! Toma uma maçã, é por minha conta." — F para aceitar');
}
function martaOfferPose(e, P, now) { if (G.appleOffer && now < G.appleOffer.until && e.id === 'fruit') { P.act = { k: 'offer', f: 6 }; e.dir = dirFromVec(G.me.x - e.rx, G.me.y - e.ry, e.dir); } }

// ---------- barra de habilidades: medalhões de osso com aro de latão e gravura em sépia ----------
const MEDAL_ICON = {
  bash: '<path d="M18 46 L40 24 M36 20 l8 8 M40 24 l6 -14 l4 4 l-14 6 Z" stroke-width="3"/><path d="M14 50 l6 -6" stroke-width="4"/><path d="M44 36 q6 4 4 10 M48 30 q8 2 8 10 M38 42 q2 6 -2 10" stroke-width="1.6"/>',
  warcry: '<path d="M18 26 q-4 6 0 12 q4 4 8 4 l4 8 l4 -2 l-2 -8 q10 -2 10 -14 q0 -12 -12 -12 q-10 0 -12 12 Z" stroke-width="2.4"/><path d="M42 22 q6 8 0 16 M47 17 q10 13 0 26 M52 12 q14 18 0 36" stroke-width="1.8"/>',
  whirl: '<path d="M32 32 m-16 0 a16 16 0 1 0 16 -16" stroke-width="2.6"/><path d="M32 16 l-5 -5 M32 16 l-5 5" stroke-width="2.6"/><path d="M32 32 l14 -14 M44 16 l4 -4" stroke-width="3"/><circle cx="32" cy="32" r="3" stroke-width="2"/>',
  wall: '<path d="M32 10 l18 6 v14 q0 16 -18 24 q-18 -8 -18 -24 v-14 Z" stroke-width="2.8"/><path d="M32 18 v28 M22 28 h20" stroke-width="2"/>',
  double: '<path d="M12 40 L46 18 M12 50 L46 28" stroke-width="2.4"/><path d="M46 18 l-7 0 M46 18 l-3 6 M46 28 l-7 0 M46 28 l-3 6" stroke-width="2.4"/><path d="M12 40 l4 -6 M12 40 l6 2 M12 50 l4 -6 M12 50 l6 2" stroke-width="1.6"/>',
  pierce: '<path d="M8 32 H54" stroke-width="2.6"/><path d="M54 32 l-8 -5 M54 32 l-8 5" stroke-width="2.6"/><ellipse cx="24" cy="32" rx="4" ry="11" stroke-width="2"/><ellipse cx="38" cy="32" rx="4" ry="11" stroke-width="2"/><path d="M8 32 l4 -5 M8 32 l4 5" stroke-width="1.6"/>',
  rain: '<path d="M18 10 V40 M32 6 V36 M46 10 V40" stroke-width="2.2"/><path d="M18 40 l-4 -6 M18 40 l4 -6 M32 36 l-4 -6 M32 36 l4 -6 M46 40 l-4 -6 M46 40 l4 -6" stroke-width="2.2"/><path d="M10 52 q22 -8 44 0" stroke-width="1.8"/>',
  agile: '<path d="M16 46 q10 -2 18 -14 q6 -10 16 -14 q-4 10 -10 16 q-8 8 -24 12 Z" stroke-width="2.4"/><path d="M24 40 l6 -8 M30 36 l7 -9 M36 30 l6 -8" stroke-width="1.5"/><path d="M10 52 h18" stroke-width="2"/>',
  fireball: '<circle cx="34" cy="36" r="10" stroke-width="2.6"/><path d="M26 30 q-10 -4 -14 -16 q8 6 14 4 q-4 -8 2 -14 q2 10 10 12" stroke-width="2.2"/><path d="M34 32 q4 4 0 8" stroke-width="1.6"/>',
  nova: '<path d="M32 10 V54 M13 21 L51 43 M13 43 L51 21" stroke-width="2.4"/><path d="M32 18 l-4 -4 M32 18 l4 -4 M32 46 l-4 4 M32 46 l4 4" stroke-width="1.8"/><circle cx="32" cy="32" r="5" stroke-width="2"/>',
  heal: '<path d="M18 44 q0 -14 14 -14 q14 0 14 14" stroke-width="2.4"/><path d="M32 12 V26 M25 19 H39" stroke-width="3"/><path d="M14 50 h36" stroke-width="2"/><path d="M20 22 l-4 -4 M44 22 l4 -4" stroke-width="1.5"/>',
  meteor: '<circle cx="40" cy="40" r="9" stroke-width="2.6"/><path d="M33 33 L12 12 M37 31 L22 10 M31 37 L10 22" stroke-width="2"/><path d="M38 36 l3 3 M42 42 l2 -2" stroke-width="1.5"/>',
  hp: '<path d="M26 12 h12 M28 12 v10 q-12 6 -10 20 q2 12 14 12 q12 0 14 -12 q2 -14 -10 -20 v-10" stroke-width="2.6"/><path d="M20 38 q12 6 24 0" stroke-width="1.6"/><path d="M32 34 v10 M27 39 h10" stroke-width="2.4"/>',
  mp: '<path d="M26 12 h12 M28 12 v10 q-12 6 -10 20 q2 12 14 12 q12 0 14 -12 q2 -14 -10 -20 v-10" stroke-width="2.6"/><path d="M20 38 q12 6 24 0" stroke-width="1.6"/><path d="M32 33 l4 7 l-4 6 l-4 -6 Z" stroke-width="2"/>',
  band: '<path d="M16 40 q4 -20 24 -24 q8 -2 10 4 q2 6 -6 10 q-14 6 -20 18 q-4 6 -8 -8 Z" stroke-width="2.6"/><path d="M24 34 l8 8 M30 28 l8 8 M36 24 l6 6" stroke-width="1.6"/>',
  attack: '<path d="M14 50 L46 16 M50 50 L18 16" stroke-width="3"/><path d="M42 14 l6 -2 l-2 6 M22 14 l-6 -2 l2 6" stroke-width="2"/><path d="M12 44 l8 8 M52 44 l-8 8" stroke-width="3"/>',
};
let _mid = 1;
function medalSVG(id) {
  const n = _mid++;
  return '<svg class="medal" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="mg' + n + '" cx="40%" cy="35%"><stop offset="0" stop-color="#efe2c2"/><stop offset=".7" stop-color="#cdb98e"/><stop offset="1" stop-color="#9c8458"/></radialGradient><filter id="mn' + n + '"><feTurbulence baseFrequency=".9" numOctaves="2" seed="' + n + '"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .12  0 0 0 .28 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>' +
    '<circle cx="32" cy="32" r="31" fill="#3a2a14"/><circle cx="32" cy="32" r="30" fill="#6e5428"/><circle cx="32" cy="32" r="28" fill="#c79b4c"/><circle cx="32" cy="32" r="25.5" fill="url(#mg' + n + ')"/><circle cx="32" cy="32" r="25.5" fill="#000" filter="url(#mn' + n + ')"/><circle cx="32" cy="32" r="23" fill="none" stroke="#5a4426" stroke-width=".8" stroke-dasharray="1.5 2"/>' +
    '<g fill="none" stroke="#3a2a16" stroke-linecap="round" stroke-linejoin="round" transform="translate(32 32) scale(.74) translate(-32 -32)">' + (MEDAL_ICON[id] || MEDAL_ICON.attack) + '</g></svg>';
}
function medalize(el, id) {
  if (!el) return; const cv = el.querySelector('canvas'); if (cv) cv.style.display = 'none';
  let m = el.querySelector('.medal-wrap'); if (!m) { m = document.createElement('div'); m.className = 'medal-wrap'; el.insertBefore(m, el.firstChild); }
  if (m.dataset.id !== id) { m.dataset.id = id; m.innerHTML = medalSVG(id); }
}

// ---------- sobrevivência em dois medalhões ao lado do chat: fome + sede (dois arcos) e frio (termômetro) ----------
function survBuild() {
  if (document.getElementById('surv-medals')) return;
  const d = document.createElement('div'); d.id = 'surv-medals';
  const face = (id, inner) => '<svg viewBox="0 0 64 64" class="sv-m" id="' + id + '"><defs><radialGradient id="' + id + 'g" cx="40%" cy="35%"><stop offset="0" stop-color="#efe2c2"/><stop offset=".7" stop-color="#cdb98e"/><stop offset="1" stop-color="#9c8458"/></radialGradient></defs>' +
    '<circle cx="32" cy="32" r="31" fill="#3a2a14"/><circle cx="32" cy="32" r="30" fill="#6e5428"/><circle cx="32" cy="32" r="28" fill="#c79b4c"/><circle cx="32" cy="32" r="25.5" fill="url(#' + id + 'g)"/>' + inner + '</svg>';
  const arc = (cls, r) => '<circle class="sv-bg" cx="32" cy="32" r="' + r + '"/><circle class="sv-arc ' + cls + '" cx="32" cy="32" r="' + r + '" transform="rotate(-90 32 32)"/>';
  d.innerHTML = '<div class="sv-w" data-tip="Fome (fora) e sede (dentro)">' + face('sv-fw', arc('sv-food', 22) + arc('sv-water', 16.5) +
      '<g fill="none" stroke="#3a2a16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M24 34c0-5 3.5-8 8-8s8 3 8 8z"/><path d="M26 34v4h12v-4"/></g><path d="M32 18c-2 3-3.5 5-3.5 6.5a3.5 3.5 0 0 0 7 0c0-1.5-1.5-3.5-3.5-6.5z" fill="#3a6aa8" transform="translate(0 -1) scale(.62) translate(19.6 6)"/>') + '</div>' +
    '<div class="sv-w" data-tip="Frio">' + face('sv-cw', arc('sv-cold', 21) +
      '<g fill="none" stroke="#3a2a16" stroke-width="1.8" stroke-linecap="round"><path d="M32 20v14"/><circle cx="32" cy="38" r="4"/><path d="M29 22h-2M29 26h-2M29 30h-2"/></g><circle id="sv-bulb" cx="32" cy="38" r="2.6" fill="#5a8ad8"/>') + '</div>' +
    '<div id="sv-season"></div>';
  document.body.appendChild(d);
}
function survMedalsUpdate(me) {
  if (!me) return; survBuild();
  const set = (sel, v, col) => { const c = document.querySelector('#surv-medals .' + sel); if (!c) return; const r = +c.getAttribute('r'), L = 2 * Math.PI * r; c.style.strokeDasharray = L; c.style.strokeDashoffset = L * (1 - Math.max(0, Math.min(1, v))); if (col) c.style.stroke = col; };
  const food = (me.food ?? 100) / 100, water = (me.water ?? 100) / 100, cold = (me.cold || 0) / 100;
  set('sv-food', food, food < 0.3 ? '#c8402a' : '#c8822a'); set('sv-water', water, water < 0.3 ? '#c8402a' : '#3a7ac8');
  const warm = (me.cold || 0) < (G._lastCold ?? 0) - 0.1; G._lastCold = me.cold || 0;
  set('sv-cold', cold, warm ? '#e8902a' : cold > 0.5 ? '#3a5ad8' : '#7aa8e8');
  const b = document.getElementById('sv-bulb'); if (b) b.setAttribute('fill', warm ? '#e8902a' : cold > 0.5 ? '#3a5ad8' : '#7aa8e8');
  document.querySelector('#surv-medals .sv-w').classList.toggle('low', food < 0.25 || water < 0.25);
  document.querySelectorAll('#surv-medals .sv-w')[1].classList.toggle('low', cold > 0.75);
  const sn = typeof seasonNow === 'function' ? seasonNow() : null, se = document.getElementById('sv-season'); if (sn && se) se.textContent = sn.n + ' · dia ' + sn.day;
}
