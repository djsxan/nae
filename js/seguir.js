// ============================================================
//  SEGUIR OUTRO JOGADOR (3.3): F no jogador → "Seguir"
//  livre (o outro não é avisado); qualquer tecla de andar para; se ele entra num prédio
//  ou muda de andar, você para na porta
// ============================================================
if (typeof G !== 'undefined') G.follow = null;
function followName(id) { const q = G.players && G.players[id]; return q ? String(q.name || 'o jogador').replace(/</g, '') : 'o jogador'; }
function followTag() { let t = document.getElementById('follow-tag'); if (!G.follow) { if (t) t.remove(); return; }
  if (!t) { t = document.createElement('div'); t.id = 'follow-tag'; t.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 54px);transform:translateX(-50%);z-index:30;padding:6px 12px;border-radius:8px;background:rgba(20,14,8,.88);border:1px solid #c9a24a;color:#f6e2a8;font:600 14px Alegreya,serif;pointer-events:auto;display:flex;gap:10px;align-items:center'; document.body.appendChild(t); }
  t.innerHTML = '👣 Seguindo ' + followName(G.follow.id) + ' <button class="est-btn ghost" style="padding:2px 8px">Parar</button>'; t.querySelector('button').onclick = () => followStop('Você parou de seguir ' + followName(G.follow && G.follow.id) + '.'); }
function followStart(id) { if (!G.players[id] || id === G.myId) return; G.follow = { id, t: 0 }; followTag(); if (typeof showToast === 'function') showToast('Seguindo ' + followName(id) + '. Ande (ou clique em Parar) para parar.'); }
function followStop(msg) { if (!G.follow) return; G.follow = null; G.path = null; G.pathGoal = null; followTag(); if (msg && typeof showToast === 'function') showToast(msg); }
function followBldAt(x, y) { const i = Math.round(y) * MAP_W + Math.round(x); return WORLD.bld[i] != null ? WORLD.bld[i] : -1; }
/* a cada 0,4 s refaz o caminho até o seguido (com o mesmo andar por clique, que contorna paredes) */
function followTick(now) {
  const F = G.follow, me = G.me; if (!F || !me) return; const q = G.players[F.id];
  if (!q) { followStop(followName(F.id) + ' saiu; você parou de seguir.'); return; }
  if (me.downed || me.carriedBy || me.sleep) { followStop(); return; }
  const qb = followBldAt(q.rx ?? q.x, q.ry ?? q.y), mb = followBldAt(me.x, me.y);
  if ((q.fl || 0) !== (me.fl || 0) || (qb >= 0 && qb !== mb)) {   /* entrou num prédio ou mudou de andar: para na porta */
    const bi = (q.fl || 0) && q.fb >= 0 ? q.fb : qb, b = BUILDINGS[bi], nm = b ? ((PROPS.find(P => P.bi === bi) || {}).name || b.name || 'um prédio') : 'um prédio';
    followStop(followName(F.id) + ' entrou em ' + nm + '; você parou na porta.');
    if (b && !(me.fl || 0)) { const [dx, dy] = doorTile(b), p = findPath(me.x, me.y, dx, dy, me.z, 1); if (p) { G.path = p; G.pathGoal = { x: Math.round(dx), y: Math.round(dy) }; } }
    return; }
  const tx = q.rx ?? q.x, ty = q.ry ?? q.y, d = Math.hypot(tx - me.x, ty - me.y);
  if (d > 45) { followStop(followName(F.id) + ' ficou longe demais; você parou de seguir.'); return; }
  if (d < 1.8) { if (G.path) { G.path = null; G.pathGoal = null; } return; }
  if (now < F.t) return; F.t = now + 400;
  const p = findPath(me.x, me.y, tx, ty, me.z, 1) || (d < 4 ? [[tx, ty]] : null); if (p) { G.path = p; G.pathGoal = { x: Math.round(tx), y: Math.round(ty) }; }
}
if (typeof myInput === 'function') { const _miS = myInput; myInput = function () { const v = _miS(); if (v && G.follow) followStop('Você parou de seguir ' + followName(G.follow.id) + '.'); return v; }; }
if (typeof updateLocal === 'function') { const _ulS = updateLocal; updateLocal = function (now, dt) { try { followTick(now); } catch (e) { } return _ulS(now, dt); }; }
/* botão Seguir no painel do F em outro jogador */
if (typeof giveOpen === 'function') { const _goS = giveOpen; giveOpen = function (pid) { _goS(pid); const d = document.getElementById('givep'); if (!d || d.querySelector('[data-follow]')) return; const on = G.follow && G.follow.id === pid;
  const row = document.createElement('div'); row.className = 'bk-row'; row.innerHTML = '<button class="est-btn" data-follow>' + (on ? '✋ Parar de seguir' : '👣 Seguir ' + followName(pid)) + '</button>';
  const head = d.querySelector('.gp-head'); if (head) head.after(row); else d.prepend(row);
  row.querySelector('button').onclick = () => { d.classList.add('hidden'); if (on) followStop('Você parou de seguir ' + followName(pid) + '.'); else followStart(pid); }; }; }
