# Nae — População viva (documento de design, v0.1)

> Status: **só documento, para revisão**. Nada disso está no jogo ainda.
> Meta: começar devagar e crescer até uma cidade de **30 a 60 moradores com nome**, que lembram do que você fez e espalham fofoca.

---

## 1. A ideia em uma frase

Cada morador de Nae é uma pessoa: tem casa, trabalho, fé, lado político, família, opinião sobre você, e conta para os outros o que viu.

## 2. Quem é cada morador (ficha)

| Campo | Exemplo |
|---|---|
| Nome, idade, aparência | Odila Varga, 34, cabelo ruivo trançado |
| Casa e trabalho | mora na Casa 7 (Alto da Catedral), padeira |
| **Classe social** | nobreza · burguesia · artesãos · trabalhadores · pobres |
| **Religião** | Fé da Aurora (oficial) · Velhos Deuses da Floresta · Culto da Lua (escondido) · cético |
| **Política / lealdade** | Coroa · Guilda dos Mercadores · Velha Nobreza · Irmandade do Javali (o povo descontente) |
| **Origem / cultura** | naense da cidade · nortenho das montanhas · gente do pântano · estrangeiro do porto do sul |
| Personalidade (2 traços) | corajosa, fofoqueira |
| Relações | casada com Bram (ferreiro), rival de Elsa (outra padeira), mãe de Pip |
| Necessidades | fome, descanso, dinheiro, convívio, fé, segurança (0–100) |
| Memória | lista de lembranças (ver seção 4) |

As quatro camadas de identidade não são enfeite: elas mudam **com quem a pessoa conversa, onde passa o tempo, em quem acredita e como reage** a você.

## 3. Rotina (o dia de um morador)

- **Agenda base** pela profissão: dorme, acorda, come, trabalha, almoça, trabalha, lazer, dorme.
- **Escolha por necessidade** (IA simples de "utilidade"): fome alta → vai comer; fé baixa → vai ao templo (ou à clareira dos Velhos Deuses); convívio baixo → taverna ou praça; dinheiro baixo → faz hora extra ou pede emprego.
- **Eventos da cidade** quebram a rotina: execução na guilhotina (curiosos se juntam), festival, dragão atacando (todos correm para dentro), mercado de sábado.
- O que já existe e serve de base: rotina da Marta (casa, cozinhar, varrer, banca), nobres passeando, NPCs olhando a guilhotina, reações ao Tecelão.

## 4. Memória e opinião

### 4.1 Lembranças

Cada morador guarda até ~20 lembranças. Cada uma tem: **quem** (jogador ou NPC), **o quê**, **peso** (−100 a +100), **como soube** (viu / ouviu de alguém) e **quando**. Lembranças fortes duram muito; as fracas desbotam em alguns dias.

| Fato | Peso típico |
|---|---|
| Você salvou alguém de um lobo / levou um ferido ao templo | +40 |
| Comprou na loja dele, deu presente, ajudou numa tarefa | +5 a +20 |
| Fez um pedido de missão pessoal | +30 |
| Brigou na rua, foi preso | −15 |
| Agrediu um morador | −40 (−80 se foi com ele) |
| Matou alguém / foi executado na frente dele | −70 |

### 4.2 Opinião

Opinião sobre um jogador = soma das lembranças (com desconto para as "ouvi dizer") + afinidade de identidade (mesma fé, mesma facção, mesma origem → começa mais simpático).

### 4.3 O que muda com a opinião

- Cumprimento, conversa, preço na loja (−20% a +30%).
- Recusar atender, fechar a porta, chamar a guarda ao te ver.
- Ajudar numa luta, esconder você dos guardas, dar uma maçã (como a Marta já faz).
- Pedidos pessoais (missões), convites (casamento, enterro, festa).

## 5. Fofoca (como a fama se espalha)

- Quando dois moradores se encontram (taverna, praça, fila do poço), cada um pode **contar** a lembrança mais forte que tem.
- Quem ouve guarda uma cópia mais fraca (peso × 0,6) e às vezes **distorcida** (um "empurrão" vira "uma surra").
- Fofoqueiros contam mais; moradores de facções rivais desconfiam do que ouvem.
- Resultado: algo que você fez na Rua Nova chega ao Bairro Nobre em ~1 dia do jogo; um assassinato na praça, em minutos.
- Fofoca também roda **entre NPCs** (Bram e Elsa brigaram → as amigas tomam partido), criando dramas sem você.

## 6. Relações e vida longa

- Família, amizade, namoro, casamento, rivalidade, dívidas entre moradores.
- **Morte de verdade**: um morador morto deixa luto (amigos tristes e com raiva de quem matou), vaga de emprego, casa vazia (que vira imóvel para alugar), herança.
- **Imigração** repõe a população aos poucos: chega um nortenho procurando trabalho, uma família do pântano fugindo de enchente.

## 7. Ligação com o resto do jogo

- **Negócios** (`negocios.md`): moradores são os **clientes** (cada classe compra coisas diferentes) e a **mão de obra** (funcionários com traços que já vêm da ficha).
- **Imóveis**: moradores precisam de casa. Casas vazias viram inquilinos; isso cria disputa entre jogadores e NPCs por moradia, então vamos precisar de **um bairro residencial novo**.
- **Lei**: testemunhas de verdade (o morador que viu e foi contar ao guarda), já ligado ao `witnessCrime` atual.
- **Fé e política**: futuras missões de facção, eleição do Conselho, festas religiosas.

## 8. Técnica (resumo)

- Estado em `S.pop` no servidor, compacto (ficha + necessidades + memória).
- **Dois níveis de simulação**: perto de jogadores, o morador anda de verdade pelo mapa; longe, a rotina é calculada por horário (ele "teleporta" para onde deveria estar quando alguém chega perto). Mantém 60 moradores leves.
- Fofoca e necessidades atualizam a cada "hora do jogo" (30 s), não a cada quadro.
- Salvo no navegador de quem hospeda (como os contratos de aluguel).

## 9. Primeiro passo sugerido (Fase 1)

1. **12 moradores nomeados** com ficha completa (incluindo as 4 camadas), casa e trabalho, aparência própria.
2. Rotina de agenda + necessidades de fome/descanso/convívio.
3. Memória e opinião só sobre **jogadores**, com 6 tipos de fato (ajudou, comprou, presenteou, agrediu, matou, foi preso).
4. Fofoca simples na taverna e na praça.
5. Um painel "Conhecidos" (quem você conhece e o que pensam de você, em palavras: "desconfia de você", "te admira").

Depois: relações entre NPCs, morte e imigração, facções ativas, 30 → 60 moradores.

## 10. Perguntas para decidir

1. Você quer **ver números** de opinião (ex.: 62/100) ou só frases ("Odila te acha corajoso")?
2. Moradores podem **morrer de vez** (e não voltar), mesmo os importantes como a Marta?
3. Podemos criar um **bairro residencial novo** (fora da muralha ou no lado leste) para caber 30+ moradores?
4. Qual religião e qual facção você imagina como **conflito principal** da cidade? (ex.: Fé da Aurora × Velhos Deuses; Coroa × Irmandade do Javali)
5. Os moradores devem reagir ao **Tecelão** como hoje (espanto/adoração) ou ele deve ficar invisível para a simulação?
6. Quer que eu escreva já as **12 fichas da Fase 1** para você revisar os nomes e histórias antes de programar?
