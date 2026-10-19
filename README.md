# Smart Room — Monitoramento Ambiental para Acessibilidade Sensorial (TEA)

Painel web do projeto **Smart Room** (Centro Universitário Ítalo Brasileiro — Análise e Desenvolvimento de Sistemas).
Mostra temperatura, umidade, qualidade do ar, luminosidade e nível de som para apoiar o planejamento de
espaços sensoriais mais confortáveis para pessoas com TEA.

> O sistema **não diagnostica TEA** e **não substitui** o acompanhamento profissional.
> As leituras dos sensores são **indicativas**, não medições profissionais.

## Situação do projeto

| Parte | Situação |
|---|---|
| Documento de especificação 2.0 | pronto (com ajustes sugeridos) |
| Painel web (HTML, CSS e JavaScript puros) | **pronto**, com dados simulados e modo ESP32 |
| Firmware do ESP32 (`esp32/`) | escrito, **ainda não testado em hardware** |
| Montagem física e calibração | **pendente** (ver `docs/ESP32-pinagem-e-montagem.md`) |

```
Hoje:      dados simulados (JavaScript)  →  painel
Com ESP32: sensores → ESP32 (Wi-Fi, GET /dados em JSON) → painel
```

## Como executar
Abra o `index.html` no navegador. Não precisa de servidor, instalação nem internet
(a fonte Inter é opcional; sem internet o navegador usa Arial, e os ícones são SVG embutidos).

## O que o painel mostra
- **Situação da sala** em uma frase, com símbolo, horário da última atualização e estado do sistema.
- **Alertas ativos** logo abaixo, quando houver.
- **Indicadores**: valor grande, unidade, selo de nível (texto + símbolo) e uma **barra de faixa** que mostra
  onde o valor está (faixa lisa = zona confortável; listrada = limites de atenção).
- **Gráfico** de um indicador por vez (botões para trocar), com as linhas de limite.
- **Últimas medições** e **Alertas** (ativo/encerrado) em tabelas.
- **Sobre**: propósito, aviso de que não diagnostica, limites de atenção, componentes e origem dos dados.
- **Conexão e demonstração** (botão no canto): escolher a fonte dos dados e simular situações.
- Tema claro/escuro e layout para computador, tablet e celular.

## Fonte dos dados: simulação ou ESP32
No botão **Conexão e demonstração**:
- **Simulação** (padrão): valores gerados em `js/dados-simulados.js`.
- **ESP32**: digite o endereço (ex.: `192.168.0.50` ou `smartroom.local`) e clique em *Conectar ao ESP32*.
  O painel só troca de fonte se o ESP32 responder em `GET /dados`.
  Se ele parar de responder, o painel **não volta sozinho para a simulação**: mostra "Dados desatualizados",
  para ninguém confundir número simulado com leitura real. Use *Usar simulação* para voltar.

Formato esperado do JSON (`null` = sensor com falha, mostrado como "Leitura indisponível"):

```json
{"temperatura":24.5,"umidade":55,"ar":22,"luminosidade":300,"som":40}
```

Detalhes de montagem, pinagem, calibração e solução de problemas: **`docs/ESP32-pinagem-e-montagem.md`**
(diagrama em `docs/esquema-ligacao.svg` e `.png`).

## Estados de erro (RF11, RNF07, RI05, RI06)
- **Leitura indisponível**: sensor sem resposta. O cartão avisa, o gráfico interrompe o traço e a tabela não inventa valor.
- **Dados incompletos**: com algum sensor sem leitura, o painel não diz que "tudo está bem".
- **Dados desatualizados**: sem leitura nova por 12 s, todos os cartões avisam "Pode estar desatualizado".

## Simulações para a apresentação
Luz forte, som alto, falha do sensor de som, perda de conexão, pausar a atualização e restaurar.
Só funcionam com dados simulados e não fazem parte do sistema final.

## Acessibilidade (RNF05, RI04, RI08, RU06)
- Contraste mínimo de 4,5:1 em todo texto, nos dois temas (verificado).
- Níveis por **texto + símbolo de formas diferentes** (círculo, triângulo, octógono) e **listras** nas barras, não só cor.
- Navegação por teclado, foco visível, link "Ir para o conteúdo", botões e tabelas semânticos.
- Gráfico e barras com descrição para leitores de tela; aviso lido apenas quando o estado muda.
- Respeita `prefers-reduced-motion`; sem sons, flashes ou animações intensas.
- Botão para pausar a atualização.

## Limites de atenção (valores iniciais de exemplo — validar)
| Grandeza | Confortável | Atenção | Atenção elevada |
|---|---|---|---|
| Temperatura | 19 a 27 °C | fora da faixa | abaixo de 16 ou acima de 30 °C |
| Umidade | 30 a 65 % | fora da faixa | abaixo de 20 ou acima de 75 % |
| Luminosidade | 100 a 700 lux | fora da faixa | abaixo de 50 ou acima de 1000 lux |
| Nível de som (índice 0–100) | até 55 | acima de 55 | acima de 70 |
| Qualidade do ar (índice 0–100) | até 35 | acima de 35 | acima de 65 |

Ficam em `js/dados-simulados.js` (`METRICAS`). A edição dos limites pela tela (RF10 e RI07,
prioridade baixa no backlog) **ainda não foi implementada**.

## Estrutura
```
index.html
css/    variaveis (paleta e tema) · estrutura · cabecalho · hero · indicadores · graficos · tabelas · sobre · demo · responsivo
js/     icones · auxiliares · dados-simulados · fonte-dados · indicadores · tabelas · sobre · grafico · tema · controles · principal
esp32/  smartroom-esp32/smartroom-esp32.ino   (firmware, Arduino IDE)
docs/   ESP32-pinagem-e-montagem.md · esquema-ligacao.svg/.png
```
