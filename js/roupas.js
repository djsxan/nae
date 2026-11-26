// ============================================================
//  ROUPAS E ROSTOS (pedido de 26/11)
//  Roupa casual para andar na cidade: kimono ou medieval de cidade (túnica, colete, calça e botas; vestido no corpo
//  feminino), com duas cores à escolha. U (ou a roda de emojis, ou a aba Personagem) troca entre a casual e a de
//  vocação, fora de combate; com a casual a defesa da armadura não vale.
//  Capacete: os três elmos fechados de cavaleiro podem sair; o capacete fica na mão. Os guardas e sentinelas de
//  elmo fechado passam a mostrar o rosto (elmo aberto na frente).
//  Na aparência, a roupa entra como sufixo: '~c' + estilo (k/m) + cor 1 + cor 2 (hex sem #) e '~h' (capacete na mão).
// ============================================================
const ROUPA = { combat: 8000, def: 'm7a2a3ae8d8b8', helms: ['greathelm', 'horned', 'winged'], cols: ['#2a3a5a', '#7a2a3a', '#2a5a4a', '#8a2a4a', '#1a1a1e', '#e8dcc0', '#c8a040', '#5a3a22', '#3a3a44', '#e8d8b8', '#6a4a8a', '#c86a2a'] };
const casOk = s => /^[km][0-9a-f]{12}$/.test(String(s || ''));
const casParse = s => casOk(s) ? { s: s[0], c1: '#' + s.slice(1, 7), c2: '#' + s.slice(7, 13) } : casParse(ROUPA.def);
const helmSkin = (cls, skin) => cls === 'knight' && ['iron', 'dragon', 'sun'].includes(String(skin || '').split('~')[0]);

// ---------------- SERVIDOR ----------------
function roupaMsg(p, m) { const now = Date.now();
  if (m.a === 'wear') { if (p.downed || p.bound) return; if (now - (p.lastCombat || 0) < ROUPA.combat) { tell(p, 'Não dá para trocar de roupa no meio de uma luta.'); return; }
    p.outfit = p.outfit === 'cas' ? null : 'cas'; if (p.outfit === 'cas') p.helmOff = false; tell(p, p.outfit === 'cas' ? 'Você vestiu a roupa casual. A armadura de vocação não protege enquanto isso.' : 'Você vestiu a roupa de vocação de novo.'); sendStat(p); return; }
  if (m.a === 'helm') { if (p.outfit === 'cas' || !helmSkin(p.cls, p.skin)) { tell(p, 'Sem capacete para tirar.'); return; } p.helmOff = !p.helmOff; tell(p, p.helmOff ? 'Você tira o capacete e o leva na mão.' : 'Você põe o capacete de volta.'); return; }
  if (m.a === 'set') { const s = String(m.cas || '').toLowerCase(); if (!casOk(s)) return; p.cas = s; Net.toAll({ t: 'pinfo', p: pinfo(p) }); tell(p, 'Roupa casual escolhida: ' + (s[0] === 'k' ? 'kimono' : 'medieval') + '.'); return; } }

// ---------------- CLIENTE ----------------
/* as duas roupas casuais: muda só a roupa da aparência do jogador */
function casualLook(L, c) { const T = tone, fem = !!L.fem, base = { head: 'none', weapon: null, shield: null, quiver: false, cape: false, pauldron: null, pattern: null, extra: null, mglove: false, boots: T('#3a2416') };
  if (c.s === 'k') { Object.assign(L, base, { armor: 'robe', body: T(c.c1), body2: T(c.c1), accent: T(c.c2), trim: T(c.c1), legs: T(c.c1), boots: T('#2a1a10'), furisode: false, kimonoC: c.c2 }); if (fem) { L.hairStyle = 'bun'; if (/^#c[0-9a-f]c[0-9a-f]c/i.test(L.hair && L.hair.hex || '')) L.hair = T('#3a2418'); } return L; }
  if (fem) Object.assign(L, base, { armor: 'robe', body: T(c.c1), body2: T(c.c2), accent: T(c.c2), trim: T('#e8dcc0'), legs: T(c.c1) });
  else Object.assign(L, base, { armor: 'vest', body: T(c.c2), body2: T(c.c1), accent: T(c.c1), trim: T('#c9a24a'), legs: T('#3a3a44') });
  return L; }
if (typeof heroLook === 'function') { const _hlR = heroLook; heroLook = function (cls, skinId, accentHex) { const L = _hlR(cls, skinId, accentHex), sp = String(skinId || '').split('~'), ct = sp.find(x => /^c[km][0-9a-f]{12}$/.test(x));
  if (ct) casualLook(L, casParse(ct.slice(1))); else if (sp.includes('h') && ROUPA.helms.includes(L.head)) { L.helmHand = L.head; L.head = 'none'; if (!L.hair || L.hairStyle === 'bald') L.hairStyle = 'short'; }
  return L; }; }
/* peças presas no corpo: gola e obi do kimono, o capacete na mão, o elmo aberto */
function roupaKimono(R, L) { const S = 1, fw = L.fem ? 0.86 : 1, cm = new THREE.MeshStandardMaterial({ color: new THREE.Color('#efe6d2').convertSRGBToLinear(), roughness: 0.8 }), om = new THREE.MeshStandardMaterial({ color: new THREE.Color(L.kimonoC).convertSRGBToLinear(), roughness: 0.6, metalness: 0.15 });
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.045 * S, 0.34 * S, 0.02 * S), cm); st.position.set(s * 0.06 * fw, 0.02, 0.14 * fw + 0.005); st.rotation.z = -s * 0.42; R.chest.add(st); }
  const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * fw, 0.17 * fw, 0.1, 20), om); ob.scale.set(1.0, 1, 0.8); ob.position.y = 0.1; R.hips.add(ob);
  const kn = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.06), om); kn.position.set(0, 0.11, -0.15 * fw); R.hips.add(kn); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.04), om); w.position.set(s * 0.08, 0.12, -0.17 * fw); w.rotation.z = s * 0.3; R.hips.add(w); }
  R.robeW = 0.72; }
function roupaHelm(R, L) { const k = L.helmHand, col = k === 'winged' ? '#d9b65a' : k === 'horned' ? '#3a1c1e' : '#a3a9b3', m = new THREE.MeshStandardMaterial({ color: new THREE.Color(col).convertSRGBToLinear(), metalness: 0.85, roughness: 0.35 }), g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.104, 0.2, 18), m)); const top = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m); top.position.y = 0.1; g.add(top);
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.016), new THREE.MeshStandardMaterial({ color: 0x0c0a08 })); sl.position.set(0, 0.015, 0.1); g.add(sl);
  if (k === 'horned') for (const s of [-1, 1]) { const hn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.17, 8), new THREE.MeshStandardMaterial({ color: 0xd6c9aa })); hn.position.set(s * 0.12, 0.09, 0); hn.rotation.z = -s * 0.9; g.add(hn); }
  if (k === 'winged') for (const s of [-1, 1]) { const wg = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.12, 0.09), new THREE.MeshStandardMaterial({ color: 0xf4efe2 })); wg.position.set(s * 0.1, 0.09, 0); wg.rotation.z = -s * 0.5; g.add(wg); }
  g.position.set(0.02, -0.12, 0.05); g.rotation.set(0.25, -0.5, 0.15); R.B.hand.add(g); }
function roupaOpenHelm(R) { if (!R.head) return; R.head.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.parameters) return; const p = o.geometry.parameters, z = o.position.z;
  if (o.geometry.type === 'BoxGeometry' && z > 0.09 && p.height < 0.03) o.visible = false;
  if (o.geometry.type === 'BoxGeometry' && z > 0.1 && p.width < 0.02 && p.height > 0.08) o.visible = false;
  if (o.geometry.type === 'CylinderGeometry' && p.radiusTop > 0.1 && p.radiusTop < 0.13 && Math.abs(o.position.y) < 0.02 && p.height > 0.2) { o.geometry = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 20, 1, true, Math.PI * 0.3, Math.PI * 1.4); o.material = o.material.clone(); o.material.side = THREE.DoubleSide; } }); }
if (typeof buildHumanoid === 'function') { const _bhR = buildHumanoid; buildHumanoid = function (L, opts) { const R = _bhR(L, opts); try { if (L.kimonoC) roupaKimono(R, L); if (L.helmHand) roupaHelm(R, L); if (L.openFace) roupaOpenHelm(R); } catch (e) { console.warn('roupas', e); } return R; }; }
/* guardas e sentinelas de elmo fechado mostram o rosto */
if (typeof npcLookOf === 'function') { const _nlR = npcLookOf; npcLookOf = function (kind, nid) { const L = _nlR(kind, nid); if (/guard|sentin|soldier|kguard/.test(String(kind))) L.openFace = true; return L; }; }
/* o desenho do jogador leva a roupa e o capacete no sufixo da aparência */
if (typeof heroSprite3D === 'function') { const _hsR = heroSprite3D; heroSprite3D = function (cls, skin, color, P) { if (P && (P.cas || P.nh)) skin = String(skin) + (P.cas ? '~c' + P.cas : '') + (P.nh ? '~h' : ''); return _hsR(cls, skin, color, P); }; }
if (typeof heroPoseFor === 'function') { const _hpR = heroPoseFor; heroPoseFor = function (e, now) { const P = _hpR(e, now); if (e && !e.isNpc) { if ((e.stb & 2097152) && casOk(e.cas)) P.cas = e.cas; else if ((e.stb & 4194304) && helmSkin(e.cls, e.skin)) P.nh = 1; } return P; }; }
if (typeof buildPose === 'function') { const _bpR = buildPose; buildPose = function (cls, P) { const Q = _bpR(cls, P); if (P && P.nh && !P.act && !(P.walk >= 0)) Q.aB = [0.32, 0.1, 0.55]; return Q; }; }   /* segurando o capacete junto do quadril */
/* comandos: U, roda de emojis, aba Personagem */
function roupaSend(a, x) { if (typeof Net !== 'undefined') Net.send(Object.assign({ t: 'outfit', a }, x || {})); }
if (typeof window !== 'undefined' && typeof document !== 'undefined') window.addEventListener('keydown', e => { if (!G || !G.started || e.repeat || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return; if (e.key.toLowerCase() !== 'u') return; if (G.dev && !e.shiftKey) return; roupaSend('wear'); });
if (typeof EW_INNER !== 'undefined') { EW_INNER.push('outfit', 'helm'); const _elR = emoteList; emoteList = function () { const L = _elR().slice(); if (G.me && !G.me.bathing) { L.push({ k: 'outfit', n: (G.me.stb & 2097152) ? 'Roupa de vocação' : 'Roupa casual', i: '👘' }); if (helmSkin(G.me.cls, G.me.skin) && !(G.me.stb & 2097152)) L.push({ k: 'helm', n: (G.me.stb & 4194304) ? 'Pôr o capacete' : 'Tirar o capacete', i: '⛑' }); } return L; };
  const _ceR = closeEmoteWheel; closeEmoteWheel = function (fire) { const wl = G.wheel; if (fire && wl && wl.sel >= 0) { const it = emoteList()[wl.sel]; if (it && (it.k === 'outfit' || it.k === 'helm')) { G.wheel = null; $('emote-wheel').classList.add('hidden'); roupaSend(it.k === 'outfit' ? 'wear' : 'helm'); return; } } return _ceR(fire); }; }
function roupaPicker(cas, onPick) { const c = casParse(cas), sw = (k, cur) => ROUPA.cols.map(h => '<button type="button" class="rp-sw' + (h === cur ? ' on' : '') + '" data-k="' + k + '" data-h="' + h + '" style="background:' + h + '" title="' + h + '"></button>').join('');
  const d = document.createElement('div'); d.className = 'rp-pick'; d.innerHTML = '<div class="rp-row"><button type="button" class="rp-st' + (c.s === 'k' ? ' on' : '') + '" data-s="k">👘 Kimono</button><button type="button" class="rp-st' + (c.s === 'm' ? ' on' : '') + '" data-s="m">🧥 Medieval</button></div><div class="rp-lb">Cor principal</div><div class="rp-cols">' + sw(1, c.c1) + '</div><div class="rp-lb">Cor de detalhe (faixa, colete)</div><div class="rp-cols">' + sw(2, c.c2) + '</div>';
  const cur = { ...c }, emit = () => onPick(cur.s + cur.c1.slice(1) + cur.c2.slice(1));
  d.querySelectorAll('.rp-st').forEach(b => b.onclick = () => { cur.s = b.dataset.s; d.querySelectorAll('.rp-st').forEach(o => o.classList.toggle('on', o === b)); emit(); });
  d.querySelectorAll('.rp-sw').forEach(b => b.onclick = () => { cur['c' + b.dataset.k] = b.dataset.h; d.querySelectorAll('.rp-sw[data-k="' + b.dataset.k + '"]').forEach(o => o.classList.toggle('on', o === b)); emit(); }); return d; }
function roupaSaved() { try { const s = localStorage.getItem('nae_cas'); return casOk(s) ? s : ROUPA.def; } catch (e) { return ROUPA.def; } }
function roupaSave(s) { try { localStorage.setItem('nae_cas', s); } catch (e) { } }
/* criação do personagem: escolha da roupa casual embaixo do corpo */
if (typeof document !== 'undefined') setTimeout(() => { const bs = document.getElementById('bodysel'); if (!bs || document.getElementById('rp-lobby')) return; const lb = document.createElement('label'); lb.textContent = 'Roupa casual (para a cidade)'; const box = document.createElement('div'); box.id = 'rp-lobby'; box.appendChild(roupaPicker(roupaSaved(), s => roupaSave(s))); bs.after(lb, box); }, 0);
/* aba Personagem: trocar, capacete e escolher a roupa */
if (typeof gmShow === 'function') { const _gsR = gmShow; gmShow = function (tab) { _gsR(tab); if ((tab || GM.tab) !== 'char') return; const c2 = document.querySelector('#gm-body .gm-pane[data-pane="char"] .gm-c2'); if (!c2) return; let box = c2.querySelector('.rp-box'); if (box) box.remove();
  box = document.createElement('div'); box.className = 'rp-box'; const cas = G.me && (G.me.stb & 2097152), nh = G.me && (G.me.stb & 4194304), hs = G.me && helmSkin(G.me.cls, G.me.skin);
  box.innerHTML = '<h3>Roupa</h3><div class="rp-row"><button type="button" class="rp-act" data-a="wear">' + (cas ? 'Vestir a roupa de vocação' : 'Vestir a roupa casual') + ' <small>(U)</small></button>' + (hs && !cas ? '<button type="button" class="rp-act" data-a="helm">' + (nh ? 'Pôr o capacete' : 'Tirar o capacete') + '</button>' : '') + '</div><div class="rp-note">Com a roupa casual a armadura não protege. Não dá para trocar no meio de uma luta.</div>';
  box.appendChild(roupaPicker((G.me && G.me.cas) || roupaSaved(), s => { roupaSave(s); roupaSend('set', { cas: s }); })); box.querySelectorAll('.rp-act').forEach(b => b.onclick = () => { roupaSend(b.dataset.a); setTimeout(() => gmShow('char'), 400); }); c2.prepend(box); }; }
if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = '.rp-pick{display:flex;flex-direction:column;gap:6px;margin:4px 0 8px}.rp-row{display:flex;gap:6px;flex-wrap:wrap}.rp-st,.rp-act{flex:1;min-width:120px;padding:6px 10px;border-radius:8px;border:1px solid rgba(201,162,74,.5);background:rgba(20,12,8,.55);color:inherit;font:inherit;cursor:pointer}.rp-st.on{outline:2px solid #e8c060}.rp-lb{font-size:12px;opacity:.75;letter-spacing:.04em}.rp-cols{display:grid;grid-template-columns:repeat(12,1fr);gap:4px}.rp-sw{aspect-ratio:1;border-radius:50%;border:2px solid rgba(255,255,255,.25);cursor:pointer;min-width:16px}.rp-sw.on{border-color:#ffe08a;box-shadow:0 0 0 2px #7a5a20}.rp-box{margin-bottom:10px}.rp-box h3{margin:0 0 6px}.rp-note{font-size:12px;opacity:.7;margin:4px 0}'; document.head.appendChild(st); }
