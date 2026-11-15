// ============================================================
//  NAE — tela inicial: cena 3D viva (da sombra da floresta para o castelo ao sol)
//  e menu minimalista. Os painéis (jogar, personagens, reinos) reaproveitam o lobby.
// ============================================================
const TITLE = { on: false };
function titleScene() {
  if (typeof THREE === 'undefined') return;
  const cv = document.createElement('canvas'); cv.id = 'title3d'; document.body.insertBefore(cv, document.body.firstChild);
  let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return; }
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xb9c2a0, 55, 190);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 400); cam.position.set(0, 1.7, 9);
  const C = (h) => new THREE.Color(h).convertSRGBToLinear();
  const M = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: C(hex), roughness: o.r ?? 0.9, metalness: o.m ?? 0, side: o.side || THREE.FrontSide, emissive: o.e ? C(o.e) : undefined, emissiveIntensity: o.ei || 0, transparent: !!o.t, opacity: o.op ?? 1, depthWrite: o.dw ?? true });
  // céu: gradiente ensolarado (azul em cima, dourado no horizonte)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C('#5f8fc4') }, hor: { value: C('#f1dfb0') } },
    vertexShader: 'varying vec3 vp; void main(){ vp = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vp,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vp; void main(){ float h = clamp(normalize(vp).y * 2.2, 0., 1.); gl_FragColor = vec4(mix(hor, top, pow(h, .7)), 1.); }' }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(C('#d8e4ff'), C('#3a3020'), 0.55));
  const sun = new THREE.DirectionalLight(C('#fff1d0'), 2.6); sun.position.set(30, 40, -50); scene.add(sun);
  // chão: clareira clara ao longe, chão escuro de floresta perto
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 60, 60).rotateX(-Math.PI / 2), M('#6f8a3c'));
  { const p = ground.geometry.attributes.position, col = []; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), x = p.getX(i); p.setY(i, Math.sin(x * 0.07) * 0.6 + Math.cos(z * 0.05) * 0.8 + (z < -40 ? Math.max(0, (-z - 40) * 0.05) : 0)); const near = Math.max(0, Math.min(1, (z + 10) / 18)); const c = C('#7a9a42').lerp(C('#1c2112'), near); col.push(c.r, c.g, c.b); } ground.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); ground.material.vertexColors = true; ground.geometry.computeVertexNormals(); }
  scene.add(ground);
  // castelo ao longe sobre uma colina: muralha, torres redondas com telhados cônicos e torre de menagem com a bandeira
  const stone = M('#a39d90'), dark = M('#3a3f4c'), castle = new THREE.Group(); castle.position.set(-4, 3.2, -78);
  castle.add(new THREE.Mesh(new THREE.BoxGeometry(34, 7, 18), stone).translateY(3.5));
  for (let k = 0; k < 16; k++) for (const z of [-9.2, 9.2]) castle.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 1), stone).translateX(-16 + k * 2.15).translateY(7.6).translateZ(z));
  for (const [x, z, h] of [[-17, -9, 11], [17, -9, 11], [-17, 9, 10], [17, 9, 10]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, h, 16), stone); t.position.set(x, h / 2, z); castle.add(t); const r = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.5, 16), dark); r.position.set(x, h + 2.2, z); castle.add(r); }
  const keep = new THREE.Mesh(new THREE.BoxGeometry(9, 19, 9), stone); keep.position.set(2, 9.5, -1); castle.add(keep);
  const kr = new THREE.Mesh(new THREE.ConeGeometry(7, 6, 4), dark); kr.rotation.y = Math.PI / 4; kr.position.set(2, 22, -1); castle.add(kr);
  for (let k = 0; k < 7; k++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.2), M('#1a1612', { e: '#4a2a10', ei: 0.4 })); w.position.set(-1 + (k % 3) * 1.9 + (k > 2 ? 0.5 : 0), 12 + Math.floor(k / 3) * 3.5, 3.55); castle.add(w); }
  castle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), M('#2a2420')).translateX(2).translateY(28));
  const flagG = new THREE.PlaneGeometry(8, 4.4, 28, 12), flag = new THREE.Mesh(flagG, new THREE.MeshLambertMaterial({ color: C('#9a1a24'), side: THREE.DoubleSide, emissive: C('#3a0608') }));
  flagG.translate(4, 0, 0); flag.position.set(2.1, 30, -1); flag.frustumCulled = false; castle.add(flag); const flag0 = flagG.attributes.position.array.slice();
  // emblema na bandeira (uma estrela/coroa clara)
  const emb = new THREE.Mesh(new THREE.CircleGeometry(0.7, 5), M('#e8d8b0', { side: THREE.DoubleSide })); emb.position.set(2.4, 0, 0.03); flag.add(emb);
  castle.scale.setScalar(1.1); scene.add(castle);
  // linha de árvores no meio da distância
  const tl = M('#3e5a2a'), tl2 = M('#2e4420');
  for (let k = 0; k < 70; k++) { const a = (k / 70) * Math.PI * 1.4 - Math.PI * 0.7, r = 46 + (k % 5) * 6, x = Math.sin(a) * r * 1.6, z = -Math.cos(a) * r * 0.9 - 20; if (Math.abs(x + 4) < 26 && z < -60) continue; const s = 2 + (k * 37 % 10) / 4, tr = new THREE.Mesh(new THREE.ConeGeometry(s, s * 3.2, 7), k % 2 ? tl : tl2); tr.position.set(x, s * 1.6 + Math.sin(x * 0.07) * 0.6, z); scene.add(tr); }
  // floresta em primeiro plano: troncos escuros e copas que fazem a moldura de sombra
  const bark = M('#1e1914'), leaf = M('#16200f'), leaf2 = M('#1d2914');
  const trunks = [[-6.5, 2.5, 0.55], [-4.2, -1, 0.35], [-9, -4, 0.7], [5.8, 1.5, 0.5], [8.5, -2.5, 0.65], [3.6, -6, 0.3], [-2.6, -9, 0.28], [11, 3, 0.8], [-12, 1, 0.9], [7, -10, 0.32]];
  for (const [x, z, r] of trunks) { const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, 22, 10), bark); t.position.set(x, 10, z); t.rotation.z = (x > 0 ? -1 : 1) * 0.03; scene.add(t); }
  for (let k = 0; k < 40; k++) { const x = (k % 2 ? 1 : -1) * (6.5 + (k * 13 % 9)), y = 11 + (k * 7 % 6), z = -10 + (k * 11 % 16); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4 + (k % 3), 1), k % 3 ? leaf : leaf2); b.position.set(x, y, z); scene.add(b); }
  for (let k = 0; k < 24; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + (k % 4), 1), leaf); b.position.set(-14 + k * 1.3, 15.5 + Math.sin(k) * 1.5, 4 - (k % 3) * 2); scene.add(b); }   // copa acima da câmera
  for (let k = 0; k < 60; k++) { const x = (k % 2 ? 1 : -1) * (1.5 + (k * 7 % 11) * 0.9), z = 5 - (k * 5 % 14); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + (k % 4) * 0.18, 0), k % 2 ? leaf : leaf2); f.scale.set(1.4, 0.55, 1.2); f.position.set(x, 0.15, z); f.rotation.y = k; scene.add(f); }   // samambaias/arbustos
  // raios de sol entre os troncos (planos aditivos)
  const shafts = [];
  for (let k = 0; k < 6; k++) { const m = new THREE.MeshBasicMaterial({ color: C('#fff0c8'), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + k * 0.3, 26), m); s.position.set(-6 + k * 2.6, 9, -4 - k); s.rotation.z = 0.5; s.rotation.y = -0.3; scene.add(s); shafts.push(s); }
  // poeira dourada no ar e folhas caindo
  const N = 260, dp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { dp[i * 3] = (Math.random() - 0.5) * 16; dp[i * 3 + 1] = Math.random() * 7; dp[i * 3 + 2] = 4 - Math.random() * 14; }
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dp, 3)), new THREE.PointsMaterial({ color: C('#fff2c8'), size: 0.035, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(dust);
  const leaves = []; const lm = M('#6a5a20', { side: THREE.DoubleSide });
  for (let k = 0; k < 18; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), lm); l.position.set((Math.random() - 0.5) * 12, Math.random() * 8, 2 - Math.random() * 10); l.userData = { s: 0.3 + Math.random() * 0.4, p: Math.random() * 6 }; scene.add(l); leaves.push(l); }
  const resize = () => { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 1 ? 60 : 42; cam.updateProjectionMatrix(); };
  resize(); window.addEventListener('resize', resize);
  TITLE.on = true; const t0 = performance.now();
  const loop = () => {
    if (!TITLE.on) { renderer.dispose(); cv.remove(); return; }
    const t = (performance.now() - t0) / 1000;
    cam.position.set(Math.sin(t * 0.11) * 0.35, 1.7 + Math.sin(t * 0.27) * 0.06, 9 + Math.sin(t * 0.07) * 0.3); cam.lookAt(-2 + Math.sin(t * 0.09) * 0.5, 9.5, -70);
    const fp = flagG.attributes.position; for (let i = 0; i < fp.count; i++) { const x0 = flag0[i * 3], y0 = flag0[i * 3 + 1], u = x0 / 8; fp.setZ(i, Math.sin(x0 * 1.6 - t * 5.5) * 0.45 * u + Math.sin(y0 * 2 + t * 3) * 0.1 * u); fp.setY(i, y0 - u * u * 0.4 + Math.sin(x0 - t * 4) * 0.08 * u); } fp.needsUpdate = true; flagG.computeVertexNormals();
    for (let i = 0; i < N; i++) { dp[i * 3] += Math.sin(t * 0.3 + i) * 0.002; dp[i * 3 + 1] += Math.sin(t * 0.5 + i * 1.7) * 0.0015 + 0.0008; if (dp[i * 3 + 1] > 7) dp[i * 3 + 1] = 0; } dust.geometry.attributes.position.needsUpdate = true;
    for (const l of leaves) { const d = l.userData; l.position.y -= d.s * 0.012; l.position.x += Math.sin(t * 1.3 + d.p) * 0.01; l.rotation.set(t * d.s * 2 + d.p, t * 1.7 + d.p, t * d.s); if (l.position.y < 0) l.position.y = 8; }
    shafts.forEach((s, k) => { s.material.opacity = 0.035 + Math.sin(t * 0.4 + k * 1.3) * 0.02; });
    renderer.render(scene, cam); requestAnimationFrame(loop);
  };
  loop();
}
// ---------- menu minimalista ----------
function titleMenu() {
  const lob = document.getElementById('lobby'); if (!lob) return;
  document.body.classList.add('nae');
  const m = document.createElement('div'); m.id = 'title-menu';
  m.innerHTML = '<div class="nae-logo">NAE</div><nav class="nae-nav">' + [['play', 'Jogar'], ['chars', 'Personagens'], ['realms', 'Reinos online'], ['opts', 'Configurações']].map(([k, n]) => '<button data-p="' + k + '">' + n + '</button>').join('') + '</nav><div class="nae-ver" id="nae-ver"></div>';
  lob.appendChild(m);
  const v = document.getElementById('version'); if (v) document.getElementById('nae-ver').textContent = v.textContent || (typeof VERSION !== 'undefined' ? VERSION : '');
  const opts = document.createElement('section'); opts.id = 'nae-opts'; opts.className = 'nae-opts';
  opts.innerHTML = '<h2>Configurações</h2><label>Qualidade gráfica</label><div class="nae-row" id="nae-q"><button data-q="low">Baixa</button><button data-q="med">Média</button><button data-q="high">Alta</button></div><p class="hint">As demais opções ficam no menu de pausa, dentro do jogo (Esc).</p>';
  lob.querySelector('.scroll').appendChild(opts);
  { // senha do criador: fica salva neste navegador; ao entrar, pergunta se é o Tecelão ou um herói normal
    const box = document.createElement('div'); box.className = 'nae-dev';
    box.innerHTML = '<label>Senha do Criador</label><div class="nae-row"><input id="nae-devpw" type="password" maxlength="24" placeholder="(opcional)" autocomplete="off"><button id="nae-devsave">Salvar</button><button id="nae-devclr">Apagar</button></div><small id="nae-devst"></small>';
    opts.appendChild(box);
    const st = () => { let has = false; try { has = !!localStorage.getItem('nae-dev'); } catch (e) { } box.querySelector('#nae-devst').textContent = has ? 'Senha salva neste navegador. Ao entrar você escolhe: Tecelão ou herói normal.' : 'Nenhuma senha salva.'; };
    box.querySelector('#nae-devsave').onclick = () => { const v = box.querySelector('#nae-devpw').value.trim(); if (!v) return; try { localStorage.setItem('nae-dev', v.toUpperCase()); } catch (e) { } box.querySelector('#nae-devpw').value = ''; st(); };
    box.querySelector('#nae-devclr').onclick = () => { try { localStorage.removeItem('nae-dev'); } catch (e) { } st(); };
    st();
  }
  { // Jogar = continuar rápido com o herói atual; Personagens = escolher/criar/editar heróis
    const scroll = lob.querySelector('.scroll'), start = scroll.querySelector('.start');
    const q = document.createElement('section'); q.id = 'nae-quick'; q.className = 'nae-quick'; scroll.insertBefore(q, start);
    const tp = document.createElement('div'); tp.id = 'nae-toplay'; tp.className = 'nae-toplay'; tp.innerHTML = '<button class="btn gold">Jogar com este herói ▸</button>'; scroll.insertBefore(tp, start);
    tp.querySelector('button').onclick = () => open('play');
    window.naeQuick = () => {
      const nm = (document.getElementById('name') || {}).value || '', cls = typeof chosenClass !== 'undefined' ? chosenClass : 'knight';
      let sv = null; try { sv = nm.trim() && typeof loadChars === 'function' ? loadChars()[charKey(nm, cls)] : null; } catch (e) { }
      const cn = typeof CLASSES !== 'undefined' && CLASSES[cls] ? CLASSES[cls].name : cls;
      q.innerHTML = nm.trim() ? '<div class="nq-card"><div class="nq-who"><b>' + nm.replace(/</g, '') + '</b><span>' + cn + (sv ? ' · nível ' + (sv.lvl || 1) + ' · ' + (sv.gold || 0) + ' ouro' : ' · herói novo') + '</span></div><button class="btn ghost" id="nq-change">Trocar herói</button></div>'
        : '<div class="nq-card"><div class="nq-who"><b>Nenhum herói ainda</b><span>Crie o seu em Personagens.</span></div><button class="btn gold" id="nq-change">Criar herói</button></div>';
      q.querySelector('#nq-change').onclick = () => open('chars');
      if (nm.trim()) { const e = document.createElement('div'); e.className = 'nq-enter'; e.innerHTML = '<button class="btn gold" id="nq-enter">Entrar no reino ▸</button><small>Entra no reino aberto ou abre um com você de anfitrião. Outros reinos e código de sala em Reinos online.</small>'; q.appendChild(e); e.querySelector('button').onclick = ev => quickEnter(ev.currentTarget); }
    };
  }
  document.body.classList.add('nae-ready');
  const markQ = () => opts.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', (typeof SET !== 'undefined' && (SET.quality || 'high')) === b.dataset.q));
  opts.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (typeof SET !== 'undefined') { SET.quality = b.dataset.q; try { saveSettings(); } catch (e) { } } markQ(); }); markQ();
  const open = k => {
    const same = document.body.dataset.tp === k && document.body.classList.contains('tp-open');
    m.querySelectorAll('button').forEach(b => b.classList.toggle('on', !same && b.dataset.p === k));
    if (same) { document.body.classList.remove('tp-open'); return; }
    document.body.dataset.tp = k; document.body.classList.add('tp-open'); if (k === 'play' && window.naeQuick) window.naeQuick();
    if (k === 'chars') { const s = document.getElementById('saved'); if (s) s.scrollIntoView({ block: 'center' }); }
    if (k === 'realms' && typeof scanServers === 'function') scanServers();
  };
  m.querySelectorAll('button').forEach(b => b.onclick = () => open(b.dataset.p));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('tp-open') && !G.started) { document.body.classList.remove('tp-open'); m.querySelectorAll('button').forEach(b => b.classList.remove('on')); } });
}
(function () {
  const go = () => { document.title = GAME_NAME; titleMenu(); titleScene(); const iv = setInterval(() => { if (typeof G !== 'undefined' && G.started) { TITLE.on = false; document.body.classList.remove('nae', 'tp-open'); clearInterval(iv); } }, 300); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
