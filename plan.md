# Plano de implementação — Afterlight

## Objetivo

Transformar o material de referência **Faraway** em **Afterlight**, uma experiência contemplativa 3D em primeira pessoa para navegador. O jogo preservará o cenário, os sistemas de exploração, a progressão e o espírito do código fornecido, mas terá identidade própria, conteúdo em português brasileiro e um runtime estático compatível com o projeto Three.js inicializado.

Esta revisão amplia a experiência pedida: mais personagens com falas próprias, missões encadeadas, novas áreas exploráveis e atividades de coleta/interação, mantendo o núcleo contemplativo e a narrativa original jogáveis.

O Blueprint aprovado define uma experiência Faraway completa e funcional, sem serviços online. A fonte fornecida é o ponto de partida técnico e criativo; o título público do resultado será **Afterlight**.

## Decisões de produto e escopo

- **Plataforma e engine:** Three.js + TypeScript + Vite, com Rapier para física, exportando um site estático em `dist`.
- **Experiência principal:** caminhar pelo prado suspenso sobre um mar de nuvens, descobrir o guardião antigo, conversar com as criaturas e avançar pela narrativa ambiental.
- **Controles:** teclado, mouse, gamepad e controles táteis existentes; corrida, salto, interação, pausa e configurações continuam acessíveis.
- **Idiomas:** pt-BR será o único idioma exposto ao jogador. O locale será fixo e não haverá seletor, detecção por navegador ou preferência herdada.
- **Persistência:** progresso de exploração, nome do viajante, preferências de acessibilidade/áudio/gráficos e conquistas locais continuarão em armazenamento local.
- **Fora do escopo aprovado:** Manus login, banco de dados, notas compartilhadas, presença de outros jogadores, curtidas, servidor de sala e qualquer chamada de API de jogo. Esses caminhos não serão integrados ao runtime.
- **Assets 3D:** a fonte traz a cena procedural completa; não serão gerados modelos adicionais. O uso aprovado de catálogo/procedural será respeitado nos recursos próprios de marca quando necessário.
- **Expansão do mundo:** aumentar a área segura jogável de raio 58 m para 92 m e o limite duro de 70 m para 108 m, com uma transição suave de relevo; manter o centro e a colina original intactos e estender vegetação, trilhas e física até os novos limites.
- **Novas regiões:** criar três destinos reconhecíveis — **Prado dos Brotos** (oeste), **Varanda dos Sinos** (leste) e **Mirante das Nuvens** (sul) — ligados ao prado central por terreno contínuo, marcos e encontros.
- **Novos personagens:** adicionar **Nimbo**, uma ovelha jovem; **Tavi**, uma anta exploradora; e **Orla**, um bico-de-sapato jovem. Reutilizar e adaptar as classes/modelos e animações existentes (posição, escala e encenação), sem gerar modelos por IA nem baixar assets adicionais.
- **Novas missões:** três missões em sequência, cada qual apresentada por um desses personagens; aceitar a missão no diálogo, encontrar três objetos únicos em sua região, acompanhar a contagem, voltar ao personagem para concluir e desbloquear a missão seguinte. A conclusão acende um marco local como recompensa e conserva intacta a campanha original das dez estrelas.
- **Diário contextual:** a HUD mostra a região atual, a missão ativa e a contagem do objetivo; conversas, coleta, conclusão e desbloqueio dão feedback claro sem cobrir o centro da paisagem.
- **Save retrocompatível:** persistir estados e IDs de objetivos únicos no armazenamento local; saves v1 sem progresso de missão continuam carregando como antes e recebem estado de missão inicial sem perder preferências, nome nem progresso legado.

## Direção visual e identidade

### Movimento de design

**Paisagem pastoral de filme de animação**, com escala silenciosa e texturas de natureza pintada. A cena é a interface: o horizonte, o mar de nuvens e a silhueta do guardião conduzem a leitura antes de qualquer painel.

### Princípios

1. **Descoberta serena:** a interação convida em vez de interromper; a HUD só aparece quando ajuda a caminhar, observar ou conversar.
2. **Natureza em movimento:** vento, grama, fita, nuvens, pássaros e partículas compartilham ritmos contínuos para dar vida ao mundo.
3. **Escala íntima:** o jogador explora um espaço aberto, mas com detalhes próximos e encontros claros que evitam desorientação.
4. **Clareza gentil:** controles, diálogos, pausas e preferências são legíveis sem competir com a paisagem.

### Cor, composição e elementos de assinatura

- **Filosofia de cor:** azuis profundos e brancos quentes tornam o céu e as nuvens acolhedores; verdes vivos ancoram o prado; o vermelho da fita funciona como ponto de orientação e memória.
- **Layout:** tela inteira dedicada ao mundo 3D; menus em sobreposição translúcida e compacta; tipografia e controles ocupam as bordas, não o centro da cena.
- **Elementos de assinatura:** a fita vermelha ao vento, o guardião coberto de vegetação e o relevo do prado sobre as nuvens.
- **Interação:** movimento físico leve, olhar direto e ação contextual por `E`/toque, com diálogos progressivos e progresso ambiental salvo localmente.
- **Animação:** microanimações devem refletir o vento e o tempo; transições de UI devem ser suaves, curtas e respeitar a opção de movimento reduzido.
- **Tipografia:** Sora para títulos e Figtree para leitura/UI, carregadas localmente. A hierarquia privilegia títulos arejados, rótulos discretos e diálogo confortável.

### Essência da marca

> **Afterlight** é uma caminhada contemplativa entre vento, memória e nuvens — uma aventura íntima que transforma exploração em encontro.

Personalidade: **serena, poética e acolhedora**.

Voz: curta, sensorial e convidativa. Exemplos: “Siga o vento até o alto.” e “Há memórias crescendo na grama.”

A marca visual usa uma silhueta de guardião e fita em ascensão como símbolo, com azul-cobalto do crepúsculo como cor de assinatura.

## Estratégia de integração

1. Copiar somente o frontend procedural, os módulos de engine, as fontes licenciadas, testes aplicáveis e estilos do pacote fornecido.
2. Manter as ferramentas de preview/Tweak instaladas no starter e substituir seu catálogo de parâmetros por controles que tenham consumidores reais no mundo Faraway.
3. Adaptar o ponto de entrada para solo/offline: remover autenticação, notas, sala multiplayer e seus pacotes/servidores, mantendo a exploração, encontros, narrativa e áudio procedural.
4. Atualizar HTML, UI, strings, título visível e metadados para **Afterlight**; criar a catalogação pt-BR completa e ocultar o seletor de idioma.
5. Criar favicon PNG próprio e uma capa OG de Afterlight; documentar ambos em `game-sharing.json` e preparar o passo de compartilhamento antes do primeiro checkpoint.
6. Validar por diagnósticos TypeScript, testes do jogo, build de produção, smoke test e captura visual do Preview; corrigir falhas confirmadas.

## Estrutura planejada

| Área | Responsabilidade |
|---|---|
| `src/main.ts` | Inicialização solo, carregamento progressivo, ciclo de jogo, controles, UI e registro de Tweak em desenvolvimento. |
| `src/engine/` | Renderizador, física, entrada, áudio, loop, save e locale fixo. |
| `src/game/` | Terreno e limites expandidos, nuvens, guardião, fauna, narrativa, encontros, novos NPCs/objetos em `expansion.ts`, estado e transições de missão em `missions.ts`, grama, efeitos, configurações e tuning. |
| `src/engine/save.ts` | Preferências e progresso local; leitura retrocompatível do save v1 com o estado de missão aditivo. |
| `src/ui/` | Menus, HUD contextual (região/diário), diálogo, configurações e controles táteis do modo solo. |
| `src/i18n/pt-BR.json` | Todo o texto exposto no jogo em português brasileiro, incluindo regiões, falas, objetivos e feedback de missão. |
| `tests/` | Cobertura focada das transições de missão, persistência/retrocompatibilidade e limites jogáveis do terreno. |
| `public/fonts/` | Fontes locais e seus avisos de licença. |
| `assets/share/` | Favicon e capa OG próprios, referenciados por `game-sharing.json`. |
| `scripts/manus-tuning/` | Ponte de desenvolvimento preservada, excluída do build de produção pelo plugin existente. |

## Runtime e entrega

O resultado permanece uma aplicação estática: `pnpm build` gera `dist`, sem servidor nem banco de dados. O Preview escuta em `0.0.0.0:3000` no Sandbox. O terreno e colisões cobrem o novo limite duro de 108 m dentro do collider Rapier de ±116 m; manter a geometria e o campo analítico coerentes. A grama pode renderizar até 118 m em volta da câmera e o jogador pode chegar a 92 m do centro, então ampliar `HEIGHT_TEX` para extent 224 m (size 768, preservando resolução próxima à atual) e o mapa de trample para extent 112 m, mantendo o custo por quadro controlado. O jogo terá um manifest de rota único em `/manus-routes.json`, compatível com a página inicial estática.
