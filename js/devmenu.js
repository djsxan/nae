// ============================================================
//  MENU DEV — nas Configurações (tela inicial e menu Esc) há um campo de código;
//  com o código certo aparece o botão "Dev" com as ferramentas de criação
//  (Prancheta, Editor de Interiores e as próximas que entrarem em DEV_LINKS).
//  Fica liberado neste navegador; "Esconder" tira o botão.
// ============================================================
const DEV_CODE = '1515NAE';
const DEV_LINKS = [
  { n: 'Prancheta de Nae', d: 'Planta da cidade: mover, criar e redimensionar prédios, portas, ruas e muralha. "Enviar para o Claude" entrega as mudanças.', u: 'https://claude.ai/artifact/Xk6PnVkX74hxaeSyzQt778', ic: '🗺' },
  { n: 'Editor de Interiores', d: 'As plantas por dentro de cada prédio: móveis, paredes grossas e finas, moradores, piso e escadas. "Exportar" ou "Enviar ao Claude".', u: 'https://claude.ai/artifact/83TZ3hLVedKUgA1MyWMWG1', ic: '📐' },
];
if (typeof document !== 'undefined') {
  const devOn = () => { try { return localStorage.getItem('nae-devmenu') === '1'; } catch (e) { return false; } };
  const devSet = v => { try { if (v) localStorage.setItem('nae-devmenu', '1'); else localStorage.removeItem('nae-devmenu'); } catch (e) { } devInject(true); };
  const st = document.createElement('style'); st.textContent = `
#devpanel{position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;z-index:100000;background:rgba(10,8,5,.7);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px}
#devpanel .dv-box{background:#1d160e;color:#f2e6c8;border:1px solid #6a5232;border-radius:12px;width:min(560px,100%);max-height:88vh;overflow:auto;padding:14px 16px;font-family:'EB Garamond',Georgia,serif}
#devpanel h2{font-family:Cinzel,serif;font-size:20px;margin:0 0 4px;color:#e8c060}#devpanel .dv-sub{font-size:14px;color:#bba98a;margin:0 0 10px}
#devpanel a.dv-l{display:flex;gap:12px;align-items:flex-start;padding:10px;border:1px solid #4a3a24;border-radius:8px;margin:6px 0;color:inherit;text-decoration:none;background:#2a2014}#devpanel a.dv-l:hover{border-color:#c9a24a}
#devpanel .dv-ic{font-size:26px;line-height:1}#devpanel .dv-n{font-weight:600;font-size:17px}#devpanel .dv-d{font-size:14px;color:#cdbb98;line-height:1.35}
#devpanel .dv-row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}#devpanel button{font:inherit;font-size:14px;padding:5px 12px;border-radius:6px;border:1px solid #c9a24a;background:rgba(201,162,74,.15);color:inherit;cursor:pointer}
.dv-code{margin-top:14px}.dv-code input{font:inherit;font-size:15px;padding:4px 8px;border-radius:6px;border:1px solid #6a5232;background:rgba(0,0,0,.25);color:inherit;width:150px;text-transform:uppercase;letter-spacing:.08em}.dv-code small{display:block;margin-top:4px;opacity:.8}`;
  document.head.appendChild(st);
  window.devOpen = function () { let d = document.getElementById('devpanel'); if (d) d.remove(); d = document.createElement('div'); d.id = 'devpanel';
    d.innerHTML = '<div class="dv-box"><h2>Dev</h2><p class="dv-sub">Ferramentas de criação de Nae. Abrem numa aba nova.</p>' + DEV_LINKS.map(L => '<a class="dv-l" href="' + L.u + '" target="_blank" rel="noopener"><span class="dv-ic">' + L.ic + '</span><span><span class="dv-n">' + L.n + '</span><br><span class="dv-d">' + L.d + '</span></span></a>').join('') + '<div class="dv-row"><button data-hide>Esconder o menu Dev</button><button data-x>Fechar</button></div></div>';
    document.body.appendChild(d); d.onclick = e => { if (e.target === d || e.target.closest('[data-x]')) d.remove(); if (e.target.closest('[data-hide]')) { devSet(false); d.remove(); } }; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('devpanel')) { document.getElementById('devpanel').remove(); e.stopPropagation(); } }, true);
  /* campo do código e botão Dev, nas duas telas de Configurações */
  function codeBox() { const b = document.createElement('div'); b.className = 'dv-code nae-dev'; b.innerHTML = '<label>Código</label><div class="nae-row"><input type="text" maxlength="20" placeholder="digite o código" autocomplete="off"><button class="btn ghost" type="button">Usar</button></div><small></small>';
    const inp = b.querySelector('input'), msg = b.querySelector('small'), go = () => { const v = inp.value.trim().toUpperCase(); if (!v) return; if (v === DEV_CODE) { devSet(true); msg.textContent = 'Menu Dev liberado neste navegador.'; inp.value = ''; } else msg.textContent = 'Código não reconhecido.'; };
    b.querySelector('button').onclick = go; inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); }); return b; }
  function devBtn(nav, cls) { let b = nav.querySelector('[data-dev]'); if (devOn() && !b) { b = document.createElement('button'); b.dataset.dev = '1'; b.textContent = 'Dev'; if (cls) b.className = cls; b.onclick = e => { e.stopPropagation(); devOpen(); }; const q = nav.querySelector('[data-em="quit"],[data-p="quit"]'); nav.insertBefore(b, q || null); } else if (!devOn() && b) b.remove(); }
  function devInject(force) {
    for (const host of [document.querySelector('#escmenu .em-opts-body'), document.getElementById('nae-opts')]) if (host && !host.querySelector('.dv-code')) host.appendChild(codeBox());
    const n1 = document.querySelector('#escmenu .nae-nav'), n2 = document.querySelector('#title-menu .nae-nav2'); if (n1) devBtn(n1); if (n2) devBtn(n2);
  }
  setInterval(devInject, 700);
}
