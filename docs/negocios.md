# Nae — Gestão de negócios (documento de design, v0.1)

> Status: **v1.32 — primeira versão jogável.** Já funciona: alugar ou comprar casas, lojas (4 pontos vagos da Rua Nova) e oficinas (5 na Vila do Oeste); lojas vendem sozinhas com margem barato/justo/caro; reabastecer pelo fornecedor (carroça em 1 hora do jogo); oficinas de extração (serraria, mina, horta) e de transformação (carpintaria, alambique); mensageiros NPC levam a produção até as suas lojas (e podem ser assaltados); lucro no cofre de cada negócio (vá buscar); salários, roubo noturno e melhorias (prateleiras, vitrine, ferramentas, cofre). Ainda não: contratar/demitir funcionários com traços, influência, inquilinos NPC, jogadores comprando nas lojas.
> Este documento descreve como os negócios vão funcionar e propõe uma ordem de construção. As perguntas abertas estão no fim.

---

## 1. A ideia em uma frase

Você aluga (e depois compra) **pontos comerciais** em Sxan, contrata **NPCs** para trabalhar neles, e a cidade gera **ouro, influência, materiais e inquilinos** para você, mesmo enquanto você está caçando lá fora.

## 2. Pilares

1. **Tipos fixos.** Cada ponto tem uma vocação: uma loja de poções não vende espadas. Isso dá identidade às ruas e cria motivo para ter mais de um negócio.
2. **Cadeia de verdade.** A oficina produz, um **mensageiro NPC** leva até a loja andando pela cidade, a loja vende. Dá para ver o mensageiro na rua (e ele pode ser assaltado).
3. **Pessoas, não números.** Funcionários têm nome, traços, salário e humor. Um balconista simpático vende mais; um ladrão some com o caixa.
4. **A cidade reage.** Preço, reputação e a população (ver `populacao.md`) decidem quem compra.
5. **Seguro para MMO.** Tudo é calculado no servidor (quem hospeda), em "dias do jogo" (12 minutos), com limite para o que acontece enquanto o dono está offline.

## 3. Tipos de negócio

### 3.1 Lojas (vendem)

| Loja | Vende | Pontos atuais |
|---|---|---|
| Empório | mantimentos, ferramentas, corda, gazua | Empório do Borin (com dono NPC) |
| Boticário | poções, ervas, bandagens, unguento | Boticário (vago) |
| Arcanos | varinhas, pergaminhos mágicos, cristais | Arcanos & Varinhas (vago) |
| Alfaiataria | roupas, mantos, couro trabalhado | Alfaiataria (vago) |
| Pergaminhos & Mapas | mapas, livros, contratos | Pergaminhos & Mapas (vago) |
| Taverna | comida, bebida, quartos | Taverna do Javali (Greta) |
| Fruteira / Mercearia | frutas, pão, carne | barraca da Marta |

### 3.2 Oficinas (produzem)

| Oficina | Recebe | Produz | Abastece |
|---|---|---|---|
| Forja | minério, carvão, couro | armas, armaduras, ferramentas | Empório, armeiro |
| Curtume | peles | couro, mochilas | Alfaiataria, Forja |
| Carpintaria | madeira | flechas, arcos, móveis, caixotes | Empório |
| Alambique / Alquimia | ervas, frutas, gosma | poções, hidromel | Boticário, Taverna |
| Padaria / Moinho | trigo, frutas | pão, tortas | Taverna, Fruteira |

### 3.3 Imóveis de renda

Casas compradas (fase futura) podem ser alugadas para **NPCs inquilinos** (moradores da população). Eles pagam aluguel por dia, reclamam de goteira e às vezes atrasam.

## 4. O ciclo da economia

```
 matérias-primas ──► OFICINA ──► mensageiro ──► LOJA ──► clientes (NPCs e jogadores)
 (caça, coleta,       (receitas,     (anda pela      (estoque,        │
  fornecedor NPC)     artesãos)       cidade)         preço,           ▼
                                                     balconista)   ouro + influência
```

- **Matéria-prima**: você deposita (do seu baú ou mochila), compra de um fornecedor NPC (mais caro) ou contrata um coletor (fase futura).
- **Produção**: cada receita tem tempo e exige um artesão com habilidade mínima. Ex.: Espada curta = 2 minério + 1 couro, 1/3 de dia, artesão nível 2.
- **Entrega**: o mensageiro leva até 10 itens por viagem pela rota mais curta. Se ele for derrubado, a carga cai no chão (outros jogadores podem pegar → cria conteúdo de PvP e escolta).
- **Venda**: a cada hora do jogo a loja tem uma chance de venda por item, que depende de: preço que você definiu × preço justo, demanda da classe social do bairro, reputação da loja, traços do balconista, concorrência (outra loja do mesmo tipo com preço menor).
- **Jogadores** também compram na sua loja (com o balconista NPC ou, se você estiver lá, com você).

## 5. Funcionários

### 5.1 Papéis

| Papel | Faz | Salário base/dia |
|---|---|---|
| Balconista | vende na loja, abre e fecha | 6 |
| Artesão | produz na oficina (tem nível 1 a 5) | 8 a 20 |
| Aprendiz | ajuda o artesão (+20% velocidade), aprende com o tempo | 3 |
| Mensageiro | leva a produção da oficina para a loja | 5 |
| Vigia | reduz roubo e assalto ao mensageiro | 7 |
| Gerente (fase futura) | compra matéria-prima e ajusta preços sozinho | 15 |

### 5.2 Traços (1 a 2 por pessoa, visíveis só depois de alguns dias trabalhando)

- **Simpático**: +15% vendas. **Ranzinza**: −10% vendas, nunca falta.
- **Habilidoso**: produz +25%. **Desastrado**: 10% de chance de estragar material.
- **Honesto**: nunca rouba. **Mão-leve**: some 1–3% do caixa por dia (descobre com um vigia ou conferindo o livro-caixa).
- **Rápido**: mensageiro 30% mais veloz. **Preguiçoso**: às vezes vai à taverna no meio do expediente.
- **Leal**: humor cai devagar. **Ambicioso**: pede aumento todo mês, mas aprende o dobro.

### 5.3 Humor e lealdade

Sobe com salário em dia, bônus e presentes; cai com atraso, excesso de trabalho, perigo (assaltos) e sua má fama. Humor baixo dá produção pior e, no limite, pedido de demissão (o NPC volta para a população e lembra de você, bem ou mal).

### 5.4 Onde contratar

Quadro de avisos na Imobiliária ou na Taverna. Os candidatos são **moradores da população** sem emprego: o mesmo NPC que você vê andando na rua. Demitir alguém pesa na opinião dele e dos amigos.

## 6. O que os negócios rendem

1. **Ouro**: lucro do dia = vendas − salários − aluguel − matéria-prima − impostos da Coroa (10%).
2. **Influência / reputação**: por bairro e por facção (Coroa, Guilda dos Mercadores, Velha Nobreza, Povo). Desbloqueia: pontos melhores, desconto nos fornecedores, convite para o Conselho da cidade, missões especiais.
3. **Materiais**: a oficina pode mandar uma parte da produção para o seu baú em vez da loja (ex.: flechas para você mesmo).
4. **Inquilinos**: casas compradas viram renda fixa por dia.

## 7. Eventos e riscos

Roubo noturno (menor com vigia e porta trancada), assalto ao mensageiro, incêndio na forja, inspeção da guarda (multa por vender gazua demais...), festival (demanda ×2), escassez de minério, concorrente baixando preço, funcionário doente.

## 8. Telas (HUD) — evolução do painel da Imobiliária

- **Meus negócios** (nova aba): cartões de cada ponto com lucro de hoje e alerta.
- Dentro de um negócio: **Visão geral** (lucro de 7 dias em gráfico), **Estoque e preços**, **Funcionários** (retrato, traços, humor, salário, contratar/demitir), **Produção** (fila de receitas), **Livro-caixa**, **Melhorias** (balcão melhor, vitrine, depósito maior, fechadura).
- No mundo: placa com o seu nome e o brasão na porta; funcionários andando de verdade.

## 9. Regras técnicas (resumo)

- Estado no servidor em `S.biz[pid]`, salvo junto com o contrato de aluguel (já existe `S.estate`).
- Simulação por "hora do jogo" (30 s reais): produção, vendas e humor em passos discretos, fácil de testar.
- **Offline**: o negócio continua até no máximo 2 dias do jogo sem você; depois fecha as portas sozinho (salários param, sem vendas). Evita acumular fortunas sem jogar e evita falência surpresa.
- Os NPCs funcionários só "andam" quando há jogador por perto; longe, a simulação é abstrata.

## 10. Ordem de construção proposta

| Fase | Entrega |
|---|---|
| **F1** | Alugar um ponto comercial (lojas vagas da Rua Nova). Você coloca itens do baú à venda com preço; um balconista NPC fixo vende para NPCs e jogadores. Livro-caixa simples. |
| **F2** | Contratação: candidatos com traços e salário, humor, demissão. Vigia e roubo. |
| **F3** | Oficinas e receitas, mensageiro andando pela cidade (pode ser assaltado). |
| **F4** | Influência por bairro e facção, impostos, fornecedores NPC. |
| **F5** | Comprar imóveis, inquilinos NPC, eventos (incêndio, festival, inspeção). |

## 11. Perguntas para decidir

1. O ouro do lucro vai **direto para a bolsa** ou fica num **cofre do negócio** que você precisa ir buscar (mais risco, mais roleplay)?
2. Um jogador pode ter **quantos negócios** ao mesmo tempo? (sugestão: 1 loja + 1 oficina no começo, mais com influência)
3. Jogadores podem **trabalhar** no negócio de outro jogador (como balconista de verdade)?
4. Quer **concorrência entre jogadores** (duas lojas do mesmo tipo disputando clientes) ou um tipo por dono?
5. Assaltar mensageiros e lojas de outros jogadores deve ser crime normal (guarda, procurado, guilhotina)?
6. Impostos da Coroa: valor fixo, ou o **Conselho** (jogadores com influência) decide?
