import type { Locale } from '../engine/save'

/**
 * Everything the hill has to say. The player is the pilot whose little aeroplane came down on this
 * summit; the things living here speak in short, quiet lines. `chooseScript` is pure (unit tested):
 * the encounter layer owns the state and applies the returned effects.
 */

/** '' = narration (no name shown). */
export type Speaker = '' | 'fox' | 'rose' | 'sheep' | 'tapir' | 'shoebill' | 'nimbo' | 'tavi' | 'orla' | 'you'
export type Line = readonly [Speaker, string]
export type Target = 'plane' | 'hat' | 'sprout' | 'fox' | 'rose' | 'sheep' | 'box' | 'tapir' | 'shoebill' | 'guardian'
export type StarId = Target
/** Order of the ten stars in the HUD. */
export const STARS: readonly StarId[] = ['plane', 'fox', 'rose', 'sheep', 'box', 'sprout', 'hat', 'tapir', 'shoebill', 'guardian']
export const FOX_TAMED = 3
/** Scripts write the player's name as this token; the UI swaps the real name in when a talk opens. */
export const NAME_TOKEN = '{name}'
export function personalize(text: string, name: string): string {
  return text.split(NAME_TOKEN).join(name)
}

export type Book = {
  plane: { first: Line[]; again: Line[][] }
  hat: { first: Line[]; again: Line[][] }
  sprout: { first: Line[]; more: Line[]; last: Line[] }
  fox: { meet: [Line[], Line[], Line[]]; tamed: Line[][] }
  rose: { first: Line[]; again: Line[][]; fox: Line[] }
  sheep: { first: Line[]; again: Line[][] }
  box: { first: Line[]; again: Line[][] }
  tapir: { first: Line[]; again: Line[][] }
  shoebill: { first: Line[]; again: Line[][] }
  guardian: { first: Line[]; again: Line[][]; awake: Line[]; after: Line[][] }
}

const ptBR: Book = {
  plane: {
    first: [
      ['', 'Este é o seu avião. Enterrou o nariz na grama, como se estivesse cheirando a terra.'],
      ['', 'Uma pá da hélice está amassada, e uma pequena nuvem ficou presa no motor.'],
      ['', 'Há água suficiente para alguns dias. Consertá‑lo levará muito tempo — mas hoje você não tem pressa alguma.'],
    ],
    again: [
      [['', 'Você aperta um parafuso. O avião parece dar um pequeno suspiro.']],
      [['', 'Você desenha uma ovelha na asa, a observa por um bom tempo e depois a apaga. Esta parece um tanto adoentada.']],
      [['', 'Então você desenha uma caixa, com três buraquinhos na lateral. Isso é muito melhor.']],
      [['', 'Ao longe, as nuvens mudam de forma lentamente. Você decide que o motor pode esperar até amanhã.']],
    ],
  },
  hat: {
    first: [
      ['', 'Uma pedra de forma estranha: baixa de um lado, alta do outro, com um grande abaulamento no meio.'],
      ['', 'Os adultos que passam sempre dizem: “Que chapéu bonito.”'],
      ['', 'Mas você vê de imediato que é uma jiboia que engoliu um elefante e está lentamente digerindo‑o.'],
      ['you', '…Melhor não explicar isso aos adultos.'],
    ],
    again: [
      [['', 'A jiboia ainda está digerindo. Pelo jeito, vai levar vários meses.']],
      [['', 'Você encosta o ouvido na pedra. Em algum lugar dentro, um elefante está roncando bem baixinho.']],
    ],
  },
  sprout: {
    first: [
      ['', 'Uma pequena muda brotou pela grama, erguendo duas folhas redondas.'],
      ['', 'É um broto de baobá. Enquanto são pequenos, parecem quase exatamente brotos de rosa.'],
      ['', 'Você o arranca pela raiz. Se crescesse, suas raízes rachariam a colina inteira.'],
    ],
    more: [['', 'Mais um arrancado. É um trabalho maçante, mas importante.']],
    last: [
      ['', 'Isso é tudo quanto aos brotos de baobá por hoje.'],
      ['', 'Amanhã de manhã eles voltarão a aparecer. Você precisa lembrar — todo dia.'],
    ],
  },
  fox: {
    meet: [
      [
        ['fox', 'Pare aí. Mais um passo e eu vou fugir.'],
        ['you', 'Não vou te machucar. Meu nome é {name}.'],
        ['fox', '{name}… Eu sei que você não vai. Mas saber um nome não é o mesmo que conhecer alguém.'],
        ['fox', 'Nesta colina você é apenas alguém a passar, e eu sou só uma mancha laranja na grama.'],
        ['fox', 'Se você viesse com frequência, e se sentasse um pouco mais perto a cada vez…'],
        ['fox', 'então um dia eu talvez consiga distinguir seus passos do som do vento.'],
        ['fox', 'Já basta por hoje. Da próxima vez, você pode chegar um pouco mais perto.'],
      ],
      [
        ['fox', 'Você voltou, {name}.'],
        ['fox', 'Sabe, comecei a ficar feliz antes mesmo das nuvens passarem?'],
        ['fox', 'Quanto mais perto ficava a sua vinda, mais eu inquietava. Minha cauda não parava de varrer a grama.'],
        ['fox', 'Por isso deveria haver uma hora marcada. Caso contrário, nunca sei quando começar a preparar o meu coração.'],
        ['fox', 'Agora vá. Da próxima vez, um pouco mais perto.'],
      ],
      [
        ['fox', 'Eu não como pão, e também não fico olhando as nuvens. Nuvens nunca fizeram sentido para mim.'],
        ['fox', 'Mas aquela fita vermelha… a partir de agora, sempre que eu a vir voando no vento, vou pensar em você.'],
        ['fox', 'E vou passar a amar o som do vento na grama.'],
        ['fox', 'Pronto, {name}. Você me cativou.'],
        ['fox', 'De agora em diante, aonde quer que você vá, eu vou te seguir.'],
      ],
    ],
    tamed: [
      [
        ['fox', 'Aqui vai um segredo: você tem que fechar os olhos para ver as coisas que mais importam.'],
        ['fox', 'Como agora. Meus olhos estão fechados, e ainda assim sei que é você, {name}.'],
      ],
      [['fox', 'O tempo que você dedicou a mim é o que me torna diferente de qualquer outra raposa.']],
      [['fox', 'Não esqueça, {name}: você me cativou. Isso é algo da sua responsabilidade, sempre.']],
      [['fox', 'Você está olhando as nuvens, {name}? Eu estou observando você enquanto olha as nuvens.']],
      [['fox', 'O vento é mais suave junto à rosa. A mão do guardião a protege.']],
      [['fox', 'Hoje o vento cheira um pouco doce.']],
    ],
  },
  rose: {
    first: [
      ['', 'Ao lado da grande mão do guardião, repousando na grama, uma rosa vermelha cresce sob uma cúpula de vidro.'],
      ['', 'Você ergue gentilmente o vidro.'],
      ['rose', 'Ah, então você chegou. Acabei de acordar; minhas pétalas ainda não estão no lugar.'],
      ['you', 'Olá. Meu nome é {name}.'],
      ['rose', '{name}. Um belo nome — embora não, é claro, tão belo quanto “rosa”.'],
      ['rose', 'Você viu meus espinhos? Um, dois, três, quatro. Não tenho nem um pingo de medo.'],
      ['rose', '…Embora o vento esteja um pouco frio. Quando você for embora, lembre‑se de colocar minha cúpula de volta.'],
    ],
    again: [
      [['rose', 'Aquele grandão me protege do vento todos os dias. Ele nunca diz uma palavra, mas eu sei que está ouvindo.']],
      [['rose', 'Você não precisa vir me ver todos os dias, {name}. …Mas se vier, ficarei muito feliz.']],
      [['rose', 'Não preciso de um abrigo, entende. Eu só… tenho um pouquinho de medo do frio.']],
      [['rose', 'Você acha que existem muitas rosas no mundo? Talvez. Mas eu sou a única cuja cúpula você levantou.']],
    ],
    fox: [['rose', 'Você cheira a raposa, {name}. Então você também cativou algo.']],
  },
  sheep: {
    first: [
      ['sheep', 'Béé—'],
      ['', 'Uma pequena ovelha, fofa como uma nuvem, mastiga seriamente uma folha de capim.'],
      ['', 'Ela olha para a rosa, e depois para você.'],
      ['you', '…Você não deve comê‑la.'],
      ['sheep', 'Béé.'],
    ],
    again: [
      [['', 'Você lembra que deveria desenhar uma focinheira para ela. Mas esqueceu de desenhar a tira.']],
      [
        ['sheep', 'Béé?'],
        ['', 'Ela apoia a cabeça nos dedos frios do guardião e boceja.'],
      ],
      [
        ['', 'Há algumas pétalas presas na sua lã. Quem sabe de que flor elas caíram.'],
        ['', '…Esperemos que não daquela.'],
      ],
      [
        ['sheep', 'Béé—'],
        ['', 'Parece um pouco mais rechonchuda desde que saiu da caixa.'],
      ],
      [
        ['sheep', 'Béé… {name}… béé.'],
        ['', 'Ela diz seu nome do jeito que se diria o nome de um capim particularmente saboroso.'],
      ],
    ],
  },
  box: {
    first: [
      ['', 'Uma pequena caixinha de madeira com três furos de ar na lateral.'],
      ['', 'Está vazia, exceto por um pouco de capim seco.'],
      ['', 'A ovelha que vivia nela deve ter saído por conta própria.'],
    ],
    again: [
      [['', 'Você espreita por um buraco e não vê nada. Mesmo assim, sente com certeza que há uma ovelha dormindo ali.']],
      [['', 'Às vezes uma caixa é mais ovelha do que uma ovelha.']],
    ],
  },
  tapir: {
    first: [
      ['tapir', 'Shh — Estou comendo.'],
      ['you', 'Comendo capim?'],
      ['tapir', 'Não. Sonhos. Ontem à noite a colina inteira estava cheia deles.'],
      ['tapir', 'Um deles caiu do céu. Nas costas estava escrito “{name}”.'],
      ['tapir', 'Tinha um motor dentro, e um pouquinho de medo.'],
      ['tapir', 'Eu comi a parte de medo. A parte que voa eu vou devolver a você.'],
      ['tapir', 'Não me agradeça. Animais preto‑e‑branco existem para separar sonhos e vigília.'],
    ],
    again: [
      [
        ['tapir', 'Os sonhos dos adultos são sempre duros. Você tem que mastigá‑los por um bom tempo.'],
        ['tapir', 'Os sonhos das crianças são macios, como o capim que acaba de brotar.'],
      ],
      [
        ['tapir', 'Sabe por que sou metade preto e metade branco?'],
        ['you', 'Por quê?'],
        ['tapir', 'Para que à noite você veja apenas metade de mim. A outra metade eu guardo para o dia.'],
      ],
      [
        ['tapir', 'Se tiver um pesadelo esta noite, {name}, venha me encontrar nesta encosta.'],
        ['tapir', 'Eu irei até você bem suavemente. Não vou te acordar.'],
      ],
      [['', 'A anta toca uma flor silvestre com o focinho, cheira por um longo tempo e decide não comê‑la.']],
    ],
  },
  shoebill: {
    first: [
      ['shoebill', '…'],
      ['you', 'Olá?'],
      ['shoebill', '…'],
      ['shoebill', 'Estou pensando. Estou pensando há três dias.'],
      ['you', 'Sobre o quê?'],
      ['shoebill', 'Sobre se devo me mover.'],
      ['shoebill', 'O guardião está sentado aqui há mais tempo do que eu estou em pé. Estou aprendendo com ele.'],
      ['shoebill', 'Você é… {name}.'],
      ['you', 'Ainda não te contei.'],
      ['shoebill', 'O vento contou. Há três dias.'],
      ['', 'Muito, muito lentamente, ele se inclina para você.'],
    ],
    again: [
      [
        ['shoebill', '…'],
        ['shoebill', 'Você disse algo agora há pouco? Ainda estou respondendo à última coisa que você falou.'],
      ],
      [
        ['shoebill', 'Os adultos me olham e acham que estou bravo.'],
        ['shoebill', 'Do mesmo jeito que olham para aquela pedra e acham que é um chapéu.'],
      ],
      [
        ['shoebill', 'Fique parado tempo suficiente e o vento vai achar que você é uma árvore.'],
        ['shoebill', 'E então ele te conta seus segredos.'],
      ],
      [['', 'O pássaro de bico largo observa as nuvens, e você também. Ninguém diz nada. É bom assim.']],
      [
        ['shoebill', '…{name}.'],
        ['shoebill', 'Nada. Só quis conferir se ainda me lembro.'],
      ],
    ],
  },
  guardian: {
    first: [
      ['', 'Ele não fala.'],
      ['', 'Você apoia a mão contra seus dedos. A pedra está quente do sol, e capim fino cresce nas frestas.'],
      ['', 'Seu olho é escuro, como um poço muito, muito profundo.'],
    ],
    again: [
      [['', 'Um pássaro está pousado em sua cabeça. Ele permanece perfeitamente imóvel, como se tivesse medo de despertá‑lo.']],
      [['', 'Ele fica voltado para o mar de nuvens. Talvez espere por um navio que partiu há muito, muito tempo.']],
      [['', 'Uma de suas mãos pende baixa — bem onde protege a rosa do vento.']],
      [['', 'Você se senta aos seus pés por um tempo. O vento passa por suas juntas ocas como uma canção muito antiga.']],
    ],
    awake: [
      ['', 'Você apoia a mão contra seus dedos.'],
      ['', 'Por um longo, longo tempo, nada acontece.'],
      ['', 'Então, muito suavemente, seu olho começa a brilhar.'],
      ['', 'Como uma estrela que ri, mesmo à luz do dia.'],
      ['', 'O vento passa por suas juntas ocas com um som muito suave. Parece chamar seu nome: {name}.'],
      ['', 'Talvez nunca tenha esperado que alguém voltasse — apenas que alguém se sentasse e observasse as nuvens com ele por um tempo.'],
      ['', 'De agora em diante, sempre que você olhar para as nuvens, lembrará de todos eles nesta colina.'],
    ],
    after: [
      [['', 'Há uma luzzinha no seu olho agora.']],
      [['', 'O vento sopra lá do fundo do mar de nuvens. Ele permanece tão silencioso quanto sempre, mas você sabe que está sorrindo.']],
    ],
  },
}

export const BOOKS: Record<Locale, Book> = { 'pt-BR': ptBR }

/** What the hill remembers (`stars`, `fox`, `awake` are saved; the rest lasts one visit). */
export type StoryState = {
  stars: StarId[]
  fox: number
  awake: boolean
  /** Conversations already had with each target during this visit. */
  visits: Partial<Record<Target, number>>
  /** Baobab sprouts still standing (including the one being pulled). */
  sproutsLeft: number
  roseSmeltFox: boolean
}

export type Effects = {
  star?: StarId
  /** New fox taming level. */
  fox?: number
  pullSprout?: boolean
  liftDome?: boolean
  awaken?: boolean
  roseSmeltFox?: boolean
}

const cycle = <T>(list: T[], n: number): T => list[((n % list.length) + list.length) % list.length]

export type Choice = { lines: Line[]; effects: Effects; /** A repeat line was used: advance `visits`. */ repeat?: boolean }

/** Pick what a target says now, and what talking to it changes. */
export function chooseScript(book: Book, target: Target, s: StoryState): Choice {
  const seen = s.stars.includes(target)
  const n = s.visits[target] ?? 0
  const first = (lines: Line[]): Choice => ({ lines, effects: { star: target } })
  const again = (list: Line[][], effects: Effects = {}): Choice => ({ lines: cycle(list, n), effects, repeat: true })
  switch (target) {
    case 'plane':
    case 'hat':
    case 'sheep':
    case 'box':
    case 'tapir':
    case 'shoebill': {
      const b = book[target]
      if (!seen) return first(b.first)
      return again(b.again)
    }
    case 'sprout': {
      const b = book.sprout
      if (!seen) return { lines: b.first, effects: { star: 'sprout', pullSprout: true } }
      return { lines: s.sproutsLeft <= 1 ? b.last : b.more, effects: { pullSprout: true } }
    }
    case 'fox': {
      const b = book.fox
      if (s.fox < FOX_TAMED) {
        const level = Math.max(0, s.fox)
        const effects: Effects = { fox: level + 1 }
        if (level + 1 >= FOX_TAMED) effects.star = 'fox'
        return { lines: b.meet[level], effects }
      }
      return again(b.tamed, seen ? {} : { star: 'fox' })
    }
    case 'rose': {
      const b = book.rose
      if (!seen) return { lines: b.first, effects: { star: 'rose', liftDome: true } }
      if (s.fox >= FOX_TAMED && !s.roseSmeltFox) return { lines: b.fox, effects: { liftDome: true, roseSmeltFox: true } }
      return again(b.again, { liftDome: true })
    }
    case 'guardian': {
      const b = book.guardian
      if (!seen) return first(b.first)
      if (s.awake) return again(b.after)
      if (STARS.every(id => s.stars.includes(id))) return { lines: b.awake, effects: { awaken: true } }
      return again(b.again)
    }
  }
}
