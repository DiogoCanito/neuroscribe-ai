import { TemplateModality } from '@/types/templates';

export const templates: TemplateModality[] = [
  {
    id: 'ressonancia',
    name: 'Ressonância Magnética',
    icon: 'Scan',
    regions: [
      {
        id: 'coluna',
        name: 'Coluna',
        templates: [
          {
            id: 'rm-cervico-dorsal',
            name: 'RM Cérvico-Dorsal',
            baseText: `RESSONÂNCIA MAGNÉTICA DA COLUNA CÉRVICO-DORSAL

TÉCNICA:
Estudo realizado em equipamento de 1.5T, com obtenção de sequências ponderadas em T1, T2 e STIR nos planos sagital e axial.

ACHADOS:

Alinhamento:
Mantida a lordose cervical fisiológica.

Corpos vertebrais:
Morfologia e sinal normais dos corpos vertebrais de C1 a D4.

Discos intervertebrais:
[Descrever achados discais]

Canal vertebral:
Canal vertebral com calibre normal.

Medula espinhal:
Medula espinhal com morfologia, sinal e topografia normais.

IMPRESSÃO:
`,
            autoTexts: [
              {
                keyword: 'normal',
                text: 'Estudo sem alterações significativas. Coluna cérvico-dorsal de características normais.'
              },
              {
                keyword: 'protrusao',
                text: 'Protrusão discal posterior mediana, contactando o saco dural, sem compressão radicular significativa.'
              },
              {
                keyword: 'hernia',
                text: 'Hérnia discal posterior paramediana, condicionando compressão radicular.'
              },
              {
                keyword: 'degenerativo',
                text: 'Alterações degenerativas discais, com desidratação e redução da altura discal.'
              }
            ],
            keywordReplacements: [
              { from: 'c1', to: 'C1' },
              { from: 'c2', to: 'C2' },
              { from: 'c3', to: 'C3' },
              { from: 'c4', to: 'C4' },
              { from: 'c5', to: 'C5' },
              { from: 'c6', to: 'C6' },
              { from: 'c7', to: 'C7' },
              { from: 'd1', to: 'D1' },
              { from: 'd2', to: 'D2' },
              { from: 'd3', to: 'D3' },
              { from: 'd4', to: 'D4' },
              { from: 'rm', to: 'RM' },
              { from: 'stir', to: 'STIR' }
            ]
          },
          {
            id: 'rm-cervical',
            name: 'RM Cervical',
            baseText: `RESSONÂNCIA MAGNÉTICA DA COLUNA CERVICAL

TÉCNICA:
Estudo realizado em equipamento de 1.5T, com obtenção de sequências ponderadas em T1, T2 e STIR nos planos sagital e axial.

ACHADOS:

Alinhamento:
Mantida a lordose cervical fisiológica.

Corpos vertebrais:
Morfologia e sinal normais dos corpos vertebrais de C1 a C7.

Discos intervertebrais:
[Descrever achados discais]

Canal vertebral:
Canal vertebral com calibre normal.

Medula espinhal:
Medula espinhal com morfologia, sinal e topografia normais.

Foramens neurais:
Foramens neurais pérvios bilateralmente.

IMPRESSÃO:
`,
            autoTexts: [
              {
                keyword: 'normal',
                text: 'Exame sem alterações significativas. Coluna cervical de características normais.'
              },
              {
                keyword: 'espondilose',
                text: 'Alterações degenerativas de espondilose cervical, com osteofitose marginal anterior e posterior.'
              },
              {
                keyword: 'estenose',
                text: 'Estenose foraminal, condicionando compromisso do espaço disponível para a raiz nervosa.'
              }
            ],
            keywordReplacements: [
              { from: 'c1', to: 'C1' },
              { from: 'c2', to: 'C2' },
              { from: 'c3', to: 'C3' },
              { from: 'c4', to: 'C4' },
              { from: 'c5', to: 'C5' },
              { from: 'c6', to: 'C6' },
              { from: 'c7', to: 'C7' }
            ]
          },
          {
            id: 'rm-lombar',
            name: 'RM Lombar',
            baseText: `RESSONÂNCIA MAGNÉTICA DA COLUNA LOMBAR

TÉCNICA:
Estudo realizado em equipamento de 1.5T, com obtenção de sequências ponderadas em T1, T2 e STIR nos planos sagital e axial.

ACHADOS:

Alinhamento:
Mantida a lordose lombar fisiológica.

Corpos vertebrais:
Morfologia e sinal normais dos corpos vertebrais de L1 a S1.

Discos intervertebrais:
[Descrever achados discais]

Canal vertebral:
Canal vertebral com calibre normal.

Cone medular:
Cone medular de morfologia, sinal e topografia normais, terminando ao nível de L1.

Foramens neurais:
Foramens neurais pérvios bilateralmente.

IMPRESSÃO:
`,
            autoTexts: [
              {
                keyword: 'normal',
                text: 'Exame sem alterações significativas. Coluna lombar de características normais.'
              },
              {
                keyword: 'discopatia',
                text: 'Discopatia degenerativa com desidratação discal, caracterizada por hipossinal em T2.'
              },
              {
                keyword: 'modic1',
                text: 'Alterações de Modic tipo I nos pratos vertebrais adjacentes, traduzindo processo inflamatório ativo.'
              },
              {
                keyword: 'modic2',
                text: 'Alterações de Modic tipo II nos pratos vertebrais adjacentes, traduzindo substituição gordurosa.'
              }
            ],
            keywordReplacements: [
              { from: 'l1', to: 'L1' },
              { from: 'l2', to: 'L2' },
              { from: 'l3', to: 'L3' },
              { from: 'l4', to: 'L4' },
              { from: 'l5', to: 'L5' },
              { from: 's1', to: 'S1' }
            ]
          }
        ]
      },
      {
        id: 'joelho',
        name: 'Joelho',
        templates: [
          {
            id: 'rm-joelho',
            name: 'RM Joelho',
            baseText: `RESSONÂNCIA MAGNÉTICA DO JOELHO

TÉCNICA:
Estudo realizado em equipamento de 1.5T, com obtenção de sequências ponderadas em T1, T2, DP com saturação de gordura nos planos sagital, coronal e axial.

ACHADOS:

Osso:
Ausência de alterações de sinal ósseo sugestivas de edema ou lesão focal.

Cartilagem articular:
Cartilagem articular de espessura e sinal conservados.

Meniscos:
Menisco medial de morfologia e sinal normais.
Menisco lateral de morfologia e sinal normais.

Ligamentos cruzados:
Ligamento cruzado anterior íntegro, com trajeto e sinal normais.
Ligamento cruzado posterior íntegro, com trajeto e sinal normais.

Ligamentos colaterais:
Ligamento colateral medial íntegro.
Ligamento colateral lateral íntegro.

Tendões e estruturas periarticulares:
Tendão quadricipital e tendão rotuliano íntegros.
Gordura de Hoffa sem alterações.

Derrame articular:
Sem evidência de derrame articular significativo.

IMPRESSÃO:
`,
            autoTexts: [
              {
                keyword: 'normal',
                text: 'Exame sem alterações significativas. Joelho de características normais.'
              },
              {
                keyword: 'roturaLCA',
                text: 'Rotura completa do ligamento cruzado anterior, com descontinuidade das suas fibras e alteração de sinal.'
              },
              {
                keyword: 'lesaoMeniscal',
                text: 'Lesão degenerativa meniscal com alteração de sinal linear atingindo a superfície articular.'
              },
              {
                keyword: 'condropatia',
                text: 'Condropatia com irregularidade e adelgaçamento da cartilagem articular.'
              }
            ],
            keywordReplacements: [
              { from: 'lca', to: 'LCA' },
              { from: 'lcp', to: 'LCP' },
              { from: 'lcm', to: 'LCM' },
              { from: 'lcl', to: 'LCL' },
              { from: 'mm', to: 'menisco medial' },
              { from: 'ml', to: 'menisco lateral' }
            ]
          }
        ]
      },
      {
        id: 'ombro',
        name: 'Ombro',
        templates: [
          {
            id: 'rm-ombro',
            name: 'RM Ombro',
            baseText: `RESSONÂNCIA MAGNÉTICA DO OMBRO

TÉCNICA:
Estudo realizado em equipamento de 1.5T, com obtenção de sequências ponderadas em T1, T2 e DP com saturação de gordura nos planos coronal oblíquo, sagital oblíquo e axial.

ACHADOS:

Coifa dos rotadores:
Tendão do supraespinhoso de morfologia e sinal conservados.
Tendão do infraespinhoso de morfologia e sinal conservados.
Tendão do subescapular de morfologia e sinal conservados.
Tendão do redondo menor de morfologia e sinal conservados.

Tendão da longa porção do bicípite:
Tendão da longa porção do bicípite tópico, de calibre e sinal normais.

Labrum:
Labrum glenoidal de morfologia e sinal normais.

Bursa subacromial-subdeltoideia:
Sem espessamento ou derrame.

Articulação acromioclavicular:
Articulação acromioclavicular sem alterações significativas.

IMPRESSÃO:
`,
            autoTexts: [
              {
                keyword: 'normal',
                text: 'Exame sem alterações significativas. Ombro de características normais.'
              },
              {
                keyword: 'tendinopatia',
                text: 'Tendinopatia do supraespinhoso com espessamento e alteração de sinal do tendão, sem evidência de rotura.'
              },
              {
                keyword: 'roturaSupraespinhoso',
                text: 'Rotura parcial/completa do tendão do supraespinhoso.'
              },
              {
                keyword: 'bursite',
                text: 'Bursite subacromial-subdeltoideia com espessamento e conteúdo líquido da bursa.'
              }
            ],
            keywordReplacements: [
              { from: 'se', to: 'supraespinhoso' },
              { from: 'ie', to: 'infraespinhoso' },
              { from: 'sub', to: 'subescapular' },
              { from: 'lpb', to: 'longa porção do bicípite' }
            ]
          }
        ]
      },
      {
        id: 'cranio',
        name: 'Crânio',
        templates: [
          {
            id: 'rm-cranio',
            name: 'RM Crânio',
            baseText: `RESSONÂNCIA MAGNÉTICA CRÂNIO-ENCEFÁLICA

TÉCNICA:
Estudo realizado em equipamento de 1.5T, com obtenção de sequências ponderadas em T1, T2, FLAIR, DWI e T2*.

ACHADOS:

Parênquima encefálico:
Parênquima encefálico com morfologia e intensidade de sinal normais.
Sem evidência de lesões focais, alterações de sinal da substância branca ou restrição à difusão.

Sistema ventricular:
Sistema ventricular de dimensões normais, sem sinais de hidrocefalia.

Estruturas da linha média:
Estruturas da linha média centradas.

Espaços subaracnoideus:
Espaços subaracnoideus de amplitude normal para a idade.

Transição crânio-cervical:
Transição crânio-cervical sem alterações.

IMPRESSÃO:
`,
            autoTexts: [
              {
                keyword: 'normal',
                text: 'Exame sem alterações significativas. RM crânio-encefálica de características normais.'
              },
              {
                keyword: 'leucoaraiose',
                text: 'Focos de hipersinal em T2/FLAIR na substância branca periventricular e subcortical, traduzindo alterações microangiopáticas crónicas.'
              },
              {
                keyword: 'avc',
                text: 'Lesão isquémica aguda com restrição à difusão no território da artéria cerebral média.'
              }
            ],
            keywordReplacements: [
              { from: 'flair', to: 'FLAIR' },
              { from: 'dwi', to: 'DWI' },
              { from: 'acm', to: 'ACM' },
              { from: 'aca', to: 'ACA' },
              { from: 'acp', to: 'ACP' }
            ]
          }
        ]
      }
    ]
  }
];


// Voice command patterns
export const voiceCommands = {
  selectTemplate: /^template\s+(.+)$/i,
  insertAutoText: /^texto\s+(.+)$/i,
  startRecording: /^iniciar\s*grava[çc][ãa]o$/i,
  pauseRecording: /^pausar$/i,
  stopRecording: /^parar$/i,
  continueRecording: /^continuar$/i
};
