// ============================================================
//  RELÓGIO (lista 4, item 3): mostrador antigo e translúcido acima das medalhas de sobrevivência
//  ponteiro das horas e dos minutos pela hora do jogo; um sol ou uma lua no alto conforme o dia
// ============================================================
function clkHour() { return typeof resHour === 'function' ? resHour() : 12; }
function clkBuild() {
  const host = document.getElementById('surv-medals'); if (!host) return null; let d = document.getElementById('nae-clock'); if (d) return d;
  d = document.createElement('div'); d.id = 'nae-clock'; d.title = 'Hora do dia';
  const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].map((t, i) => { const a = i * Math.PI / 6, x = 32 + Math.sin(a) * 21.5, y = 32 - Math.cos(a) * 21.5 + 2.2; return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" font-size="' + (i % 3 ? 4.6 : 6) + '">' + t + '</text>'; }).join('');
  const ticks = Array.from({ length: 60 }, (_, i) => { const a = i * Math.PI / 30, r0 = i % 5 ? 27.2 : 26, x0 = 32 + Math.sin(a) * r0, y0 = 32 - Math.cos(a) * r0, x1 = 32 + Math.sin(a) * 28.6, y1 = 32 - Math.cos(a) * 28.6; return '<line x1="' + x0.toFixed(2) + '" y1="' + y0.toFixed(2) + '" x2="' + x1.toFixed(2) + '" y2="' + y1.toFixed(2) + '" stroke-width="' + (i % 5 ? 0.35 : 0.8) + '"/>'; }).join('');
  d.innerHTML = '<svg viewBox="0 0 64 64" width="62" height="62" aria-hidden="true"><defs><radialGradient id="clkg" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#f3e6c4" stop-opacity=".34"/><stop offset="1" stop-color="#6b4f22" stop-opacity=".22"/></radialGradient></defs>' +
    '<circle cx="32" cy="32" r="30.5" fill="url(#clkg)" stroke="#c9a24a" stroke-opacity=".75" stroke-width="1.6"/><circle cx="32" cy="32" r="28.8" fill="none" stroke="#f1d38a" stroke-opacity=".35" stroke-width=".5"/>' +
    '<g class="clk-sky"><circle class="clk-sun" cx="32" cy="17" r="3.4"/><path class="clk-moon" d="M33.6 13.6a3.6 3.6 0 1 0 0 6.8a2.8 2.8 0 1 1 0-6.8z"/></g>' +
    '<g stroke="#e8d3a0" stroke-opacity=".8">' + ticks + '</g><g fill="#f0dfb4" fill-opacity=".85" font-family="Cinzel, Alegreya, serif">' + R + '</g>' +
    '<line class="clk-h" x1="32" y1="32" x2="32" y2="18.5" stroke="#f3e2b3" stroke-width="2.2" stroke-linecap="round"/><line class="clk-m" x1="32" y1="32" x2="32" y2="12" stroke="#f3e2b3" stroke-opacity=".85" stroke-width="1.1" stroke-linecap="round"/>' +
    '<circle cx="32" cy="32" r="1.8" fill="#c9a24a"/></svg><span class="clk-t"></span>';
  host.insertBefore(d, host.firstChild); return d;
}
function clkTick() { try { if (typeof G === 'undefined' || !G.started) return; const d = clkBuild(); if (!d) return;
  const h = clkHour(), hh = Math.floor(h), mm = Math.floor((h - hh) * 60), a12 = ((h % 12) / 12) * 360, am = (mm / 60) * 360, day = h >= 6 && h < 19;
  d.querySelector('.clk-h').setAttribute('transform', 'rotate(' + a12.toFixed(1) + ' 32 32)'); d.querySelector('.clk-m').setAttribute('transform', 'rotate(' + am.toFixed(1) + ' 32 32)');
  d.querySelector('.clk-sun').style.display = day ? '' : 'none'; d.querySelector('.clk-moon').style.display = day ? 'none' : '';
  d.querySelector('.clk-t').textContent = String(hh).padStart(2, '0') + ':' + String(Math.floor(mm / 10) * 10).padStart(2, '0'); d.title = 'Hora do dia: ' + String(hh).padStart(2, '0') + 'h' + String(mm).padStart(2, '0') + (typeof luzMoonName === 'function' ? ' · ' + luzMoonName() : ''); } catch (e) { } }
if (typeof window !== 'undefined' && typeof G !== 'undefined') setInterval(clkTick, 500);
