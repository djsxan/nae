/* Plantas feitas no Editor de Interiores: cada andar listado aqui substitui a planta gerada pelo jogo.
   Formato: { índice do prédio: { name, A, D, st?: { andar: escada movida }, fls: { andar: { F: móveis, npc: posto do morador, thin: paredes finas [u0, v0, u1, v1], mat: { floor, wall } } } } }
   Só vale se o nome do prédio bate. Parede grossa = móvel 'iwall'. Gerado a partir do arquivo exportado pelo editor. */
var INT_EDITS = {};
