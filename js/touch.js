// ============================================================
//  MODO CELULAR (só com tela de toque, body.touch): botões que
//  fazem o papel do teclado e do mouse, mira automática e layout
//  para paisagem. No PC nada disso aparece.
// ============================================================
const TOUCH = { on: false, aimA: null, held: {} };
function tKey(k, down) {   /* aperta/solta uma tecla de mentira: todo o jogo que lê o teclado funciona igual */
  const key = k === 'shift' ? 'Shift' : k === 'tab' ? 'Tab' : k === 'enter' ? 'Enter' : k === 'esc' ? 'Escape' : k;
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }));
}
function tAimScreen() {   /* para onde o personagem mira: o alvo escolhido, o inimigo mais perto ou a direção do joystick */
  const me = G.me; if (!me || !G.view) return null; let tx = null, ty = null;
  const t = G.target && G.monsters[G.target]; if (t && !t.dieAt && Math.hypot(t.rx - me.x, t.ry - me.y) < 10) { tx = t.rx; ty = t.ry; }
  if (tx == null) { let bd = 8; for (const id in G.monsters) { const m = G.monsters[id]; if (m.dieAt) continue; const d = Math.hypot(m.rx - me.x, m.ry - me.y); if (d < bd) { bd = d; tx = m.rx; ty = m.ry; } } }
  if (tx == null && G.pplAuto && G.pTarget) { const e = G.pTarget.k === 'p' ? G.players[G.pTarget.id] : G.npcs[G.pTarget.id]; if (e) { tx = e.rx; ty = e.ry; } }
  if (tx == null) { if (G.joy) { const [jx, jy] = G.joy, wx = jx + jy * 2, wy = jy * 2 - jx, L = Math.hypot(wx, wy) || 1; TOUCH.aimA = Math.atan2(wy / L, wx / L); } const a = TOUCH.aimA ?? me.fa ?? 0; tx = me.x + Math.cos(a) * 3; ty = me.y + Math.sin(a) * 3; }
  const p = iso(tx, ty); return [(p.sx + G.view.ox) * SCALE, (p.sy + G.view.oy) * SCALE];
}
function tMouse(type, button) { const s = tAimScreen() || [innerWidth / 2, innerHeight / 2]; G.mouseS = s; if (typeof screenToWorld === 'function') G.mouseW = screenToWorld(s[0], s[1]);
  const c = document.getElementById('game'); c.dispatchEvent(new MouseEvent(type, { button, buttons: type === 'mousedown' ? 1 << button : 0, clientX: s[0], clientY: s[1], bubbles: true })); if (type === 'mouseup') window.dispatchEvent(new MouseEvent('mouseup', { button, clientX: s[0], clientY: s[1] })); }
const T_BTNS = [   /* id, rótulo, ação: 'k:tecla' (segurar), 'm:botão do mouse' (segurar), 'tap:tecla' */
  ['tb-atk', '⚔', 'm:0', 'Atacar (segure para carregar)'], ['tb-def', '🛡', 'm:2', 'Defender / mirar o escudo'], ['tb-f', 'F', 'tap:f', 'Interagir, falar, pegar'],
  ['tb-g', '🗡', 'tap:g', 'Sacar / guardar a arma'], ['tb-run', '🏃', 'toggle:shift', 'Correr (liga e desliga)'], ['tb-r', 'R', 'tap:r', 'Auto-ataque (arqueiro e mago) · golpe de escudo (cavaleiro) · desarmado: empurrar, voadora correndo, corda por trás'],
  ['tb-x', '◎', 'tap: ', 'Trocar de alvo'], ['tb-kick', '🦶', 'm:3', 'Chute'],
];
const T_TOP = [['tb-tab', '☰', 'tap:tab', 'Menu do jogo (TAB)'], ['tb-map', '🗺', 'tap:m', 'Mapa'], ['tb-emo', '☺', 'tap:t', 'Emoções e meditar'], ['tb-k', '✦', 'tap:k', 'Talentos / grimório'], ['tb-chat', '💬', 'chat', 'Chat'], ['tb-v', '🛏', 'tap:v', 'Deitar / levantar']];
function touchBuild() {
  if (TOUCH.on || !document.body.classList.contains('touch')) return; TOUCH.on = true;
  const mk = (list, cls) => { const box = document.createElement('div'); box.className = cls; for (const [id, lab, act, tip] of list) { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.className = 'tbtn'; b.textContent = lab; b.title = tip; b.dataset.act = act; box.appendChild(b); } document.body.appendChild(box); return box; };
  const right = mk(T_BTNS, 'tpad'), top = mk(T_TOP, 'ttop');
  for (const b of [...right.children, ...top.children]) {
    const act = b.dataset.act, [kind, arg] = [act.split(':')[0], act.slice(act.indexOf(':') + 1)];
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('down');
      if (kind === 'm') { TOUCH.held[b.id] = 1; tMouse('mousedown', +arg); }
      else if (kind === 'tap') { tKey(arg, true); setTimeout(() => tKey(arg, false), 60); }
      else if (kind === 'toggle') { const on = !b.classList.contains('on'); b.classList.toggle('on', on); tKey(arg, on); }
      else if (kind === 'chat') { const i = document.getElementById('chat-input'); if (i) { i.focus(); } } });
    const up = e => { b.classList.remove('down'); if (kind === 'm' && TOUCH.held[b.id]) { TOUCH.held[b.id] = 0; tMouse('mouseup', +arg); } };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  }
  /* magias e poções: tocar = tecla (segurar a 1 mantém as Chamas do mago) */
  const skKey = { slot0: '1', slot1: '2', slot2: '3', slot3: '4', slot4: '5', 'pot-hp': 'q', 'pot-mp': 'e', 'pot-band': 'b' };
  for (const id in skKey) { const el = document.getElementById(id); if (!el) continue; el.style.pointerEvents = 'auto';
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); el._tDown = 1; tKey(skKey[id], true); }, true);
    const up = e => { if (!el._tDown) return; el._tDown = 0; tKey(skKey[id], false); }; el.addEventListener('pointerup', up, true); el.addEventListener('pointercancel', up, true);
    el.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); }, true); }
  const ab = document.getElementById('btn-attack'); if (ab) ab.style.display = 'none';   /* o botão grande de ataque do celular substitui o antigo */
  document.getElementById('game').style.touchAction = 'none';
  setInterval(touchTick, 120);
}
function touchTick() {   /* mantém a mira atualizada e mostra só os botões que fazem sentido agora */
  if (!G.started || !G.me) return; const me = G.me, cls = me.cls, armed = !me.shea && !me.sheathed;
  if (!Object.values(TOUCH.held).some(Boolean)) { const s = tAimScreen(); if (s) { G.mouseS = s; if (typeof screenToWorld === 'function') G.mouseW = screenToWorld(s[0], s[1]); } }
  const show = (id, v) => { const b = document.getElementById(id); if (b) b.hidden = !v; };
  show('tb-atk', armed); show('tb-def', armed && cls === 'knight'); show('tb-kick', armed); show('tb-x', armed); show('tb-r', cls !== 'knight' || armed);
  const f = document.getElementById('tb-f'); if (f) { const hint = typeof jobsPrompt === 'function' ? jobsPrompt() : ''; f.classList.toggle('glow', !!hint); }
  const rot = document.getElementById('t-rotate'); if (rot) rot.hidden = innerWidth >= innerHeight;
}
if (typeof document !== 'undefined') {
  if (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  const rot = document.createElement('div'); rot.id = 't-rotate'; rot.hidden = true; rot.innerHTML = '<div>↻</div><p>Vire o celular deitado para jogar</p>'; document.addEventListener('DOMContentLoaded', () => document.body.appendChild(rot)); if (document.body) document.body.appendChild(rot);
  const wait = setInterval(() => { if (typeof G !== 'undefined' && G.started) { clearInterval(wait); touchBuild(); } }, 500);
}
