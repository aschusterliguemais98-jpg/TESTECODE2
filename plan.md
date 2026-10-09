# Plano de implementação — Afterlight

## Objetivo

Transformar o material de referência **Faraway** em **Afterlight**, uma experiência contemplativa 3D em primeira pessoa para navegador. O jogo preservará o cenário, os sistemas de exploração, a progressão e o espírito do código fornecido, mas terá identidade própria, conteúdo em português brasileiro e um runtime estático compatível com o projeto Three.js inicializado.

A experiência já ampliada inclui mais personagens, missões encadeadas, novas áreas no prado original e atividades de exploração. Esta revisão acrescentará um **segundo mapa independente de areia**, com seu próprio percurso, personagem, missão e tempestade de areia, mantendo ambos os mundos acessíveis e a campanha original intacta.

O Blueprint aprovado define uma experiência Faraway completa e funcional, sem serviços online. A fonte fornecida é o ponto de partida técnico e criativo; o título público do resultado será **Afterlight**.

## Decisões de produto e escopo

- **Plataforma e engine:** Three.js + TypeScript + Vite, com Rapier para física, exportando um site estático em `dist`.
- **Experiência principal:** caminhar pelo prado suspenso sobre um mar de nuvens, descobrir o guardião antigo, conversar com as criaturas e avançar pela narrativa ambiental.
- **Controles:** teclado, mouse, gamepad e controles táteis existentes; corrida, salto, interação, pausa e configurações continuam acessíveis.
- **Idiomas:** pt-BR será o único idioma exposto ao jogador. O locale será fixo e não haverá seletor, detecção por navegador ou preferência herdada.
- **Persistência:** progresso de exploração, nome do viajante, preferências de acessibilidade/áudio/gráficos, missões e mapa da última sessão continuarão em armazenamento local, com migração aditiva dos saves v1.
- **Fora do escopo aprovado:** Manus login, banco de dados, notas compartilhadas, presença de outros jogadores, curtidas, servidor de sala e qualquer chamada de API de jogo. Esses caminhos não serão integrados ao runtime.
- **Assets 3D:** preservar o modelo de produção aprovado (`catalog_procedural`): reutilizar e adaptar as classes procedurais existentes; não gerar modelos por IA nem baixar assets adicionais.
- **Expansão do prado original:** manter a área segura de raio 92 m, o limite duro de 108 m, as três regiões — **Prado dos Brotos**, **Varanda dos Sinos** e **Mirante das Nuvens** — e seu terreno contínuo, vegetação, trilhas, física e campanha.
- **Segundo mapa — Dunas do Eco:** acrescentar uma área jogável de areia própria e visualmente separada, em uma plataforma de terreno e colisão independentes, acessível por um portal de pedra no prado e por um portal de retorno no deserto. A troca de mundo atualizará centro, raios de caminhada, superfície usada pelo jogador e visibilidade do cenário, sem apagar o save nem encerrar a sessão.
- **Conteúdo do deserto:** compor dunas e marcos de pedra, incluindo o Arco Afundado, o Oásis Silencioso e a Coluna do Vento. Adicionar a guia Suri reutilizando a classe procedural de criatura existente, mais três ecos de bússola interativos que iniciam e concluem uma missão própria.
- **Tempestade de areia:** criar um ciclo de calmaria e tempestade com partículas procedurais de areia, rajadas visuais e névoa quente que modula a visibilidade. Abrigos de pedra reduzem a intensidade local; a tempestade nunca causa dano, não apaga o progresso e não esconde prompts, diálogos ou objetivos essenciais. Obedecer ao recurso de movimento reduzido.
- **Campanha do prado preservada:** Nimbo, Tavi e Orla, suas três missões sequenciais, os nove objetos e as dez estrelas originais continuam separados e funcionais. A nova missão de Suri tem progresso e objetivos próprios.
- **Diário contextual:** a HUD exibe o nome do mapa/região, a missão e a contagem pertinentes ao mundo atual; durante a tempestade, sinaliza a intensidade e o efeito dos abrigos sem ocupar o centro da paisagem.

## Direção visual e identidade

### Movimento de design

**Paisagem pastoral de filme de animação**, com escala silenciosa e texturas de natureza pintada. A cena é a interface: o horizonte, o mar de nuvens e a silhueta do guardião conduzem a leitura antes de qualquer painel. O deserto será uma contraparte em tons quentes — dourado, ocre e terracota — mantendo o mesmo relevo suave, materiais foscos, silhuetas reconhecíveis e ritmo contemplativo; o azul profundo do céu e a fita vermelha seguem como assinatura da marca.

### Princípios

1. **Descoberta serena:** a interação convida em vez de interromper; a HUD só aparece quando ajuda a caminhar, observar ou conversar.
2. **Natureza em movimento:** vento, grama, fita, nuvens, pássaros, partículas de areia e mudanças graduais do tempo compartilham ritmos contínuos.
3. **Escala íntima:** o jogador explora espaços abertos, mas com detalhes próximos, abrigos legíveis e encontros claros que evitam desorientação.
4. **Clareza gentil:** controles, diálogos, tempestade, pausas e preferências são legíveis sem competir com a paisagem.
5. **Tempestade legível e acessível:** partículas moderadas, transições suaves, abrigos que realmente funcionam e movimento visual reduzido quando solicitado.

### Cor, composição e elementos de assinatura

- **Filosofia de cor:** azuis profundos e brancos quentes tornam o céu e as nuvens acolhedores; verdes vivos ancoram o prado; dourado, areia clara e terracota identificam Dunas do Eco; o vermelho da fita funciona como ponto de orientação e memória.
- **Layout:** tela inteira dedicada ao mundo 3D; menus em sobreposição translúcida e compacta; tipografia e controles ocupam as bordas, não o centro da cena.
- **Elementos de assinatura:** a fita vermelha ao vento, o guardião coberto de vegetação, o relevo do prado sobre as nuvens e os arcos de arenito esculpidos pelas rajadas.
- **Interação:** movimento físico leve, olhar direto e ação contextual por `E`/toque, portais de ida/volta, diálogos progressivos, objetivos únicos e progresso salvo localmente.
- **Animação:** microanimações devem refletir o vento e o tempo; a areia perde força perto de abrigos. Transições de UI devem ser suaves, curtas e respeitar a opção de movimento reduzido.
- **Tipografia:** Sora para títulos e Figtree para leitura/UI, carregadas localmente. A hierarquia privilegia títulos arejados, rótulos discretos e diálogo confortável.

### Essência da marca

> **Afterlight** é uma caminhada contemplativa entre vento, memória e nuvens — uma aventura íntima que transforma exploração em encontro.

Personalidade: **serena, poética e acolhedora**.

Voz: curta, sensorial e convidativa. Exemplos: “Siga o vento até o alto.” e “Há memórias crescendo na grama.” No deserto: “Quando a areia se aquieta, até uma pedra sabe indicar o caminho.”

A marca visual usa uma silhueta de guardião e fita em ascensão como símbolo, com azul-cobalto do crepúsculo como cor de assinatura.

## Estratégia de integração

1. Preservar os módulos de frontend procedural, engine, fontes licenciadas, testes aplicáveis e estilos existentes.
2. Manter as ferramentas de preview/Tweak do starter e os consumidores reais existentes no jogo.
3. Manter o runtime solo/offline: remover autenticação, notas, sala multiplayer e seus pacotes/servidores; não introduzir qualquer novo serviço externo.
4. Integrar o deserto como área isolada com terreno/collider próprios, portais, sampler de solo e limites centrados no mapa ativo; não substituir nem deformar o prado existente.
5. Ligar Suri, os ecos de bússola, tempestade e abrigos a um progresso local separado e retrocompatível; acrescentar localização, indicadores de HUD e acesso por teclado, gamepad e toque.
6. Preservar HTML, UI, strings, título visível e metadados de compartilhamento de Afterlight; não substituir imagens próprias existentes.
7. Executar diagnósticos TypeScript, testes, build, smoke test das transições/objetivos e inspeção visual desktop/mobile; corrigir falhas confirmadas.

## Estrutura planejada

| Área | Responsabilidade |
|---|---|
| `src/main.ts` | Inicialização solo, salvamento da última área, integração das interações, HUD e registros de Tweak em desenvolvimento. |
| `src/engine/` | Renderizador, física, entrada, áudio, loop, save retrocompatível e locale fixo. |
| `src/game/` | Prado, narrativa e missões originais; `desert.ts` para terreno/quest do novo mapa, `sandstorm.ts` para partículas e ciclo de clima e `map-gateway.ts` para transições seguras. |
| `src/game/player.ts` | Solo consultado e limites locais configuráveis pelo mapa ativo, preservando os controles e a física do personagem. |
| `src/game/expansion.ts` | Novos NPCs, objetos e missões já adicionados ao prado. |
| `src/engine/save.ts` | Preferências, estrelas, campanhas, último mapa e migração aditiva de saves v1. |
| `src/ui/` | Menus, HUD contextual (mapa, região, missão/tempestade), diálogo, configurações e controles táteis do modo solo. |
| `src/i18n/` | Todas as novas regiões, prompts, falas, missões e mensagens nos catálogos existentes, com pt-BR exposto ao jogador. |
| `tests/` | Cobertura focada das missões, retrocompatibilidade, topologia/altura do novo mapa, ciclo/abrigo da tempestade e fluxo de transição. |
| `public/fonts/` | Fontes locais e seus avisos de licença. |
| `assets/share/` | Favicon e capa OG próprios, referenciados por `game-sharing.json`. |
| `scripts/manus-tuning/` | Ponte de desenvolvimento preservada, excluída do build de produção pelo plugin existente. |

## Runtime e entrega

O resultado permanece uma aplicação estática: `pnpm build` gera `dist`, sem servidor nem banco de dados. O Preview escuta em `0.0.0.0:3000` no Sandbox. O prado e suas colisões preservam o limite duro de 108 m dentro do collider Rapier de ±116 m; sua geometria, grama, textura de altura e trilhas seguem coerentes. Dunas do Eco tem terreno procedural determinístico, colisão de terreno própria e um limite com margem sobre toda a superfície jogável; trocar de mapa atualiza o sampler e o centro do mesmo jogador Rapier, e o retorno restaura o spawn salvo no prado. A tempestade usa uma quantidade limitada de partículas, névoa com faixa controlada e cálculo de abrigo independente do sistema de grama, mantendo o custo e a memória previsíveis. O jogo conserva um manifest de rota único em `/manus-routes.json`, compatível com a página inicial estática.
