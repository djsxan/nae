// ============================================================
//  PASSAGEM SECRETA DO CASTELO (lista 4, item 1): uma pedra solta na muralha da direita (leste)
//  leva da rua para dentro do castelo, e de volta, a qualquer hora e para qualquer um.
//  Lá dentro valem as regras de sempre: à noite, quem não pode estar no castelo e for visto é posto para fora.
// ============================================================
let _psSpots = null;
function psSpots() { if (_psSpots) return _psSpots; if (typeof BUILDINGS === 'undefined' || typeof KEEP === 'undefined') return null;
  const bi = BUILDINGS.findIndex(b => b.kind === 'castle'), b = BUILDINGS[bi]; if (!b) return null; const ym = Math.round(b.y + b.h * 0.35); let out = null, ins = null;
  for (let d = 0; d < 10 && !out; d++) for (const y of [ym + d, ym - d]) { const x = KEEP.x1 + 1; if (!out && walkableTile(x, y, 0) && walkableTile(x + 1, y, 0) && !inKeep(x, y)) out = [x, y]; }
  if (!out) return null;
  for (let r = 0; r < 8 && !ins; r++) for (let x = b.x + b.w - 1; x >= b.x + b.w - 6 && !ins; x--) for (const y of [out[1] + r, out[1] - r]) if (!ins && WORLD.bld[y * MAP_W + x] === bi && walkableTile(x, y, 0)) ins = [x, y];
  if (!ins) return null; return (_psSpots = { bi, out, ins }); }
/* lado do anfitrião: atravessar */
function psGo(p) { const P = psSpots(); if (!P || (p.fl || 0) !== 0 || p.downed || p.carriedBy || p.bound) return false;
  const nearOut = dist(p.x, p.y, P.out[0], P.out[1]) < 1.6, nearIn = dist(p.x, p.y, P.ins[0], P.ins[1]) < 1.6; if (!nearOut && !nearIn) return false;
  const [x, y] = nearOut ? P.ins : P.out; p.x = x; p.y = y; p.z = 0; p.fl = 0; p.fb = -1; p.sit = null; p.sleep = null; Net.toOne(p.id, { t: 'tp', x, y, z: 0, fl: 0, fb: -1 });
  tell(p, nearOut ? 'Você empurra a pedra solta da muralha: uma passagem estreita, úmida e escura leva para dentro do castelo.' : 'Você sai pela passagem secreta, atrás da muralha leste do castelo.'); sendStat(p); return true; }
if (typeof phMsg === 'function') { const _phP = phMsg; phMsg = function (p, m) { if (m && m.a === 'psgo') { psGo(p); return; } return _phP(p, m); }; }
/* lado do jogador: aviso e tecla F */
function psNear() { if (typeof G === 'undefined' || !G.me || (G.me.fl || 0)) return null; const P = psSpots(); if (!P) return null; const me = G.me;
  if (dist(me.x, me.y, P.out[0], P.out[1]) < 1.4) return 'in'; if (dist(me.x, me.y, P.ins[0], P.ins[1]) < 1.4) return 'out'; return null; }
if (typeof csHint === 'function') { const _chP = csHint; csHint = function () { const k = psNear(); if (k) return k === 'in' ? 'F: empurrar a pedra solta da muralha (passagem secreta)' : 'F: sair pela passagem secreta'; return _chP(); }; }
if (typeof csF === 'function') { const _cfP = csF; csF = function () { if (psNear()) { Net.send({ t: 'funda', a: 'psgo' }); return true; } return _cfP(); }; }
if (typeof faActions === 'function') { const _faP = faActions; faActions = function () { const L = _faP(), k = psNear(); if (k && !L.some(a => /passagem secreta/.test(a.t))) L.unshift({ t: k === 'in' ? 'Entrar pela passagem secreta' : 'Sair pela passagem secreta', run: () => Net.send({ t: 'funda', a: 'psgo' }) }); return L; }; }
/* item 6: o criado chamado pelo guarda vai até a porta (por cima de todas as outras rotinas da casa) */
if (typeof hPost === 'function') { const _hpD = hPost; hPost = function (def, n) { if (n && n.hrole === 'serv' && (n.callDoor || 0) > now_()) { const b = hSeatB(n.house); if (b) { const [dx, dy] = doorTile(b), v = DOOR_V[b.door || 'S']; return { x: dx + v[0] * 1.6 + 0.5, y: dy + v[1] * 1.6 + 0.5, fl: 0, out: 1 }; } } return _hpD(def, n); }; }
