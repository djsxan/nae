// ============================================================
//  MAPA DA CIDADE: nomes de bairros, ruas e prédios (modo
//  "Nomes", discreto), filtros de ícones e arrastar o mapa.
//  Coordenadas relativas ao centro da cidade (CENTER).
// ============================================================
const CM_DISTRICTS = [
  { n: 'Alto do Banco', x: -22, y: -24 }, { n: 'Rua Nova', x: -22, y: 11 }, { n: 'Centro', x: -3, y: 8 }, { n: 'Bairro do Mercado', x: 0, y: 24 },
  { n: 'Bairro Nobre', x: 22, y: -12 }, { n: 'Bairro da Guarda', x: 25, y: -27 }, { n: 'Castelo de Nae', x: -1, y: -17, big: 1 },
  { n: 'Casas Nobres', x: 44, y: 24 }, { n: 'Largo da Catedral', x: 33, y: 12 }, { n: 'Rua dos Prazeres', x: 56, y: -2 }, { n: 'Vila do Oeste', x: -68, y: -20 },
];
const CM_STREETS = [
  { n: 'Avenida Real', a: [0.5, 9], b: [0.5, 30] }, { n: 'Rua do Mercado', a: [-30, 5.5], b: [-10, 5.5] }, { n: 'Rua do Mercado', a: [8, 5.5], b: [30, 5.5] },
  { n: 'Rua Nova', a: [-31, 8.5], b: [-10, 8.5] }, { n: 'Avenida das Bétulas', a: [18.5, -20], b: [18.5, -6] }, { n: 'Beco dos Mercadores', a: [19.5, 4], b: [19.5, 30] },
  { n: 'Rua do Templo', a: [-24, -15.5], b: [-14, -15.5] }, { n: 'Rua do Banco', a: [-24, -29], b: [-24, -18] }, { n: 'Rua de Baixo', a: [-23, 19.5], b: [17, 19.5] },
  { n: 'Travessa do Norte', a: [14, -23.5], b: [33, -23.5] }, { n: 'Rua das Termas', a: [34, -20.5], b: [62, -20.5] }, { n: 'Rua da Catedral', a: [34, 18.5], b: [62, 18.5] }, { n: 'Rua do Sul', a: [21, 28.5], b: [48, 28.5] }, { n: 'Rua da Pousada', a: [-19, 29.5], b: [0, 29.5] }, { n: 'Largo do Castelo', a: [-14, -1.5], b: [11, -1.5] },
  { n: 'Rua da Muralha Velha', a: [34.5, -29], b: [34.5, 30] }, { n: 'Avenida das Casas', a: [36, 0.5], b: [63, 0.5] }, { n: 'Rua dos Prazeres', a: [48.5, -29], b: [48.5, -4] },
];
const CM_PLAZAS = [{ n: 'Praça do Mercado', x: 0.5, y: 13 }, { n: 'Praça do Chafariz', x: 18, y: -2 }, { n: 'Praça das Casas', x: 42, y: 2.5 }];
/* categorias dos ícones (filtros) */
const CM_CATS = [['shops', 'Lojas'], ['services', 'Serviços'], ['power', 'Poder'], ['mine', 'Seus lugares'], ['players', 'Jogadores']];
const CM_ICAT = { bag: 'shops', potion: 'shops', wand: 'shops', needle: 'shops', scroll: 'shops', anvil: 'shops', saw: 'shops', apple: 'shops', bed: 'services', mug: 'services', sun: 'services', coin: 'services', bars: 'services', shield: 'services', drop: 'services', cards: 'services', heart: 'services', crown: 'power', flag: 'power', home: 'mine', key: 'mine' };
function cmSet() { try { return Object.assign({ names: true, hide: {} }, JSON.parse(localStorage.getItem('nae_cmap') || '{}')); } catch (e) { return { names: true, hide: {} }; } }
const CM = cmSet(); function cmSave() { try { localStorage.setItem('nae_cmap', JSON.stringify(CM)); } catch (e) { } }
/* ícones novos e filtro: casarões das casas, clube, termas e Casa de Veludo */
if (typeof mapIconOf === 'function') { const _mio = mapIconOf; mapIconOf = function (b, bi) { let ic = b.seat ? 'flag' : b.kind === 'club' ? 'cards' : b.kind === 'baths' ? 'drop' : b.kind === 'velvet' ? 'heart' : _mio(b, bi); if (ic && CM.hide[CM_ICAT[ic] || 'shops']) return null; return ic; }; }
if (typeof mapIcon === 'function') { const _mic = mapIcon; mapIcon = function (x, ic, px, py, R) { if (ic !== 'flag' && ic !== 'cards' && ic !== 'drop' && ic !== 'heart') return _mic(x, ic, px, py, R);
  x.save(); x.translate(px, py); x.beginPath(); x.arc(0, 0, R + 1.5, 0, 7); x.fillStyle = 'rgba(244,232,200,0.95)'; x.fill(); x.lineWidth = 1.2; x.strokeStyle = '#4a2e14'; x.stroke();
  const k = R / 6; x.scale(k, k); x.strokeStyle = '#3a2410'; x.fillStyle = '#3a2410'; x.lineWidth = 1.3; x.lineCap = 'round'; x.lineJoin = 'round';
  const L = (...p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.stroke(); };
  if (ic === 'flag') { L(-2.5, 4, -2.5, -4); x.fillStyle = '#8a1a10'; x.beginPath(); x.moveTo(-2.5, -4); x.lineTo(3.5, -2.8); x.lineTo(-2.5, -1); x.fill(); }
  else if (ic === 'cards') { L(-3.5, -2.5, 0, -3.5, 1.5, 3, -2, 4, -3.5, -2.5); L(0.5, -3, 3.5, -2, 2.5, 3.8); }
  else if (ic === 'drop') { x.beginPath(); x.moveTo(0, -4); x.quadraticCurveTo(3.5, 0.5, 2.2, 2.6); x.arc(0, 1.5, 2.6, 0.4, Math.PI - 0.4); x.quadraticCurveTo(-3.5, 0.5, 0, -4); x.stroke(); }
  else { x.fillStyle = '#a8203a'; x.beginPath(); x.moveTo(0, 3.5); x.bezierCurveTo(-4.5, 0, -3, -4, 0, -1.5); x.bezierCurveTo(3, -4, 4.5, 0, 0, 3.5); x.fill(); }
  x.restore(); }; }
/* nomes por cima do mapa, discretos: bairros grandes e transparentes, ruas finas ao longo da rua, prédios só de perto */
function cmNames(x, V, size, seen) {
  if (!CM.names) return; const P = (rx, ry) => V.P(CENTER + rx, CENTER + ry), z = V.z, ok = (rx, ry) => G.dev || !seen || seen(CENTER + rx, CENTER + ry);
  x.save(); x.textAlign = 'center'; x.textBaseline = 'middle';
  const halo = (t, px, py, fs, font, col, a, hw) => { x.font = font; x.globalAlpha = a; x.lineWidth = hw; x.strokeStyle = 'rgba(244,232,200,0.75)'; x.strokeText(t, px, py); x.fillStyle = col; x.fillText(t, px, py); x.globalAlpha = 1; };
  if (z >= 1.6) for (const d of CM_DISTRICTS) { if (!ok(d.x, d.y)) continue; const [px, py] = P(d.x, d.y), fs = Math.min(34, (d.big ? 5.2 : 4.2) * z + 4); if (px < -200 || py < -60 || px > size + 200 || py > size + 60) continue; x.save(); x.translate(px, py); x.font = 'italic 700 ' + fs + 'px "Alegreya Sans SC", Georgia, serif'; x.globalAlpha = 0.3; x.fillStyle = '#3a2410'; try { x.letterSpacing = Math.round(fs * 0.18) + 'px'; } catch (e) { } x.fillText(d.n.toUpperCase(), 0, 0); x.restore(); }
  if (z >= 2.6) { for (const s of CM_STREETS) { if (!ok((s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2)) continue; const [ax, ay] = P(s.a[0], s.a[1]), [bx, by] = P(s.b[0], s.b[1]); let ang = Math.atan2(by - ay, bx - ax); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      const len = Math.hypot(bx - ax, by - ay), fs = Math.min(15, 2.6 + z * 1.6); x.font = 'italic 600 ' + fs + 'px Georgia, serif'; if (x.measureText(s.n).width > len * 0.95) continue; x.save(); x.translate((ax + bx) / 2, (ay + by) / 2); x.rotate(ang); halo(s.n, 0, 0, fs, x.font, '#5a3a1e', 0.8, 3); x.restore(); }
    for (const p of CM_PLAZAS) { if (!ok(p.x, p.y)) continue; const [px, py] = P(p.x, p.y), fs = Math.min(15, 3 + z * 1.6); halo(p.n, px, py, fs, 'italic 600 ' + fs + 'px Georgia, serif', '#5a3a1e', 0.8, 3); } }
  if (z >= 4) BUILDINGS.forEach((b, bi) => { if (!b.name || b.kind === 'house' || b.kind === 'stairtower' || b.lot) return; const [w, h] = [b.w, b.h], cx = b.x + w / 2, cy = b.y + h / 2; if (!G.dev && seen && !seen(cx, cy)) return; const [px, py] = V.P(cx, cy); if (px < -80 || py < -20 || px > size + 80 || py > size + 20) return; const fs = Math.min(12, 2 + z * 1.2); halo(b.name, px, py + 11, fs, '600 ' + fs + 'px "Alegreya Sans SC", Georgia, sans-serif', '#2a1a0a', 0.9, 2.6); });
  x.restore(); }
/* barra: Nomes, filtros e arrastar */
(function cmControls() {
  const cv = document.getElementById('wm-canvas'); if (!cv) return; const bar = cv.parentNode.querySelector('.wm-zoom'); if (!bar) return;
  const nb = document.createElement('button'); nb.textContent = 'Nomes'; nb.className = 'wm-names' + (CM.names ? ' on' : ''); nb.onclick = () => { CM.names = !CM.names; nb.classList.toggle('on', CM.names); cmSave(); drawWorldMap(); };
  const fw = document.createElement('span'); fw.className = 'wm-filt'; fw.innerHTML = CM_CATS.map(([k, n]) => '<label><input type="checkbox" data-k="' + k + '"' + (CM.hide[k] ? '' : ' checked') + '> ' + n + '</label>').join('');
  fw.querySelectorAll('input').forEach(i => i.onchange = () => { CM.hide[i.dataset.k] = !i.checked; cmSave(); drawWorldMap(); });
  const hint = bar.querySelector('span'); bar.insertBefore(nb, hint); bar.insertBefore(fw, hint); if (hint) hint.textContent = 'Roda do mouse aproxima · arraste para andar · passe o mouse nos ícones';
  bar.querySelectorAll('button[data-z]').forEach(b => b.addEventListener('click', () => { G.mapPan = null; drawWorldMap(); }));
  let D = null; cv.addEventListener('pointerdown', e => { if (e.button !== 0) return; D = { x: e.clientX, y: e.clientY, p: (G.mapPan || [0, 0]).slice(), moved: false }; });
  window.addEventListener('pointermove', e => { if (!D || !G.mapOpen) return; const dx = e.clientX - D.x, dy = e.clientY - D.y; if (!D.moved && Math.hypot(dx, dy) < 5) return; D.moved = true; const r = cv.getBoundingClientRect(), V = wmView(r.width), a = V.inv(r.width / 2, r.height / 2), b = V.inv(r.width / 2 - dx, r.height / 2 - dy); G.mapPan = [D.p[0] + b[0] - a[0], D.p[1] + b[1] - a[1]]; D.p = G.mapPan.slice(); D.x = e.clientX; D.y = e.clientY; drawWorldMap(); });
  window.addEventListener('pointerup', () => { if (D && D.moved) G.mapDragAt = performance.now(); D = null; });
})();
