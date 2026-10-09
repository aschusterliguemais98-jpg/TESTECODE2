# Afterlight

**Afterlight** é uma experiência contemplativa 3D em primeira pessoa: caminhe por um prado acima das nuvens, descubra criaturas e memórias, e acorde o guardião silencioso no alto da colina.

## Controles

- **WASD / analógico esquerdo:** caminhar
- **Mouse / analógico direito:** olhar
- **Shift:** correr
- **Espaço:** saltar
- **E / toque:** interagir
- **Esc:** pausar

O jogo é uma experiência estática e solo. Todo o progresso e as preferências ficam apenas no navegador; não é necessário login nem serviço de jogo online.

## Exploração ampliada

- Três personagens locais: Nimbo, Tavi e Orla, encontrados em novas áreas da colina.
- Três missões encadeadas, com nove objetos para descobrir, diálogos, recompensas visuais e acompanhamento na HUD.
- Prado, varanda e mirante conectados por terreno caminhável; as dez estrelas e a história original continuam independentes das missões.
- O progresso das missões é salvo localmente e continua funcionando sem serviços online.

## Segundo mapa — Dunas do Eco

- Um bioma de areia independente, conectado ao prado por portais de ida e volta, com relevo e limites próprios.
- Três marcos — Arco Afundado, Oásis Silencioso e Coluna do Vento — e Suri, que inicia a busca por três ecos de bússola.
- Uma tempestade cíclica de areia, com partículas e névoa; abrigos de pedra reduzem a intensidade local.
- A HUD indica o objetivo e a tempestade; o último mapa e o progresso dos ecos são salvos localmente.

## Desenvolvimento

```bash
pnpm dev
pnpm test
pnpm build
pnpm smoke
```

`pnpm smoke` exercita no navegador o prado, os portais nos dois sentidos, a missão desértica, o salvamento e recarregamento, a tempestade/abrigo, as três missões do prado e o layout mobile. O Preview usa `HOST=0.0.0.0` e `PORT=3000`. `pnpm build` valida TypeScript e produz `dist/`.

## Créditos e licenças

O projeto integra o material de referência Faraway como ponto de partida. A fonte visual e os créditos das bibliotecas permanecem descritos nos avisos de fonte em `public/fonts/`; Three.js é MIT e Rapier é Apache-2.0. A marca, interface e apresentação desta versão usam o título **Afterlight**.
