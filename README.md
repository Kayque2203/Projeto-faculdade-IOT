# SalaMonitor — Sistema de Monitoramento Ambiental de Sala de Aula

Dashboard web para monitoramento da qualidade do ar, temperatura, iluminação,
ruído, data e horário em sala de aula. Projeto acadêmico com um sistema físico
planejado utilizando **ESP32** e sensores, mas que, nesta etapa, implementa
**somente o frontend/dashboard**, com dados simulados em JavaScript.

## Sobre o projeto

O sistema propõe monitorar em tempo (quase) real as condições ambientais de
uma sala de aula, exibindo um painel com indicadores, gráficos de evolução,
histórico de medições e alertas automáticos. A ideia conceitual é:

```
Sala de aula → sensores (futuro) → ESP32 (futuro) → dados → dashboard
```

Nesta etapa, o fluxo implementado é apenas:

```
dados simulados → dashboard
```

## Funcionalidades

- **Dashboard** — cards com Qualidade do Ar, Temperatura, Iluminação, Ruído,
  Data e Horário, além de um indicador visual de **Status Geral** da sala
  (🟢 normal / 🟡 atenção / 🔴 crítico)
- **Monitoramento** — 4 gráficos de linha (Canvas puro) mostrando a evolução
  de temperatura, qualidade do ar, ruído e iluminação ao longo do tempo
- **Histórico** — tabela com as últimas medições registradas
- **Alertas** — lista de alertas gerados automaticamente quando algum valor
  ultrapassa os limites configurados
- Tema claro/escuro e layout totalmente responsivo (desktop, tablet e celular)

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript puro (sem frameworks nem bibliotecas
  de gráficos — os gráficos são desenhados em `<canvas>`)
- **Dados:** simulados em `js/dados-simulados.js`, com pequenas variações a
  cada atualização (não são valores totalmente aleatórios)
- **Físico (planejado, não implementado nesta etapa):** ESP32 + sensores
  DHT22 (temperatura), LDR/BH1750 (luminosidade), módulo de som (ruído) e
  MQ-135 (qualidade do ar)

## Como executar

Basta abrir o arquivo `index.html` diretamente no navegador — não é
necessário servidor, backend, banco de dados ou build (não há mais `fetch`
de arquivos externos).

## Como funciona a simulação

O arquivo `js/dados-simulados.js` concentra toda a lógica:

- `estadoSimulado` guarda os valores atuais (temperatura, iluminação, ruído,
  índice de qualidade do ar)
- `gerarNovaLeitura()` aplica uma pequena variação aleatória a cada valor
  (passeio aleatório limitado, não valores totalmente aleatórios) e adiciona
  o registro ao histórico
- `LIMITES` define as faixas de atenção/crítico usadas pelo status geral e
  pelos alertas
- Uma nova leitura é gerada a cada poucos segundos (`CONFIG_SIMULACAO`),
  simulando o comportamento de um sistema real

Quando o ESP32 estiver pronto, basta substituir `gerarNovaLeitura()` por uma
leitura real (ex: `fetch` numa API ou dados via MQTT) — o restante do
dashboard (cards, gráficos, tabelas, alertas) não precisa ser reconstruído.

## Status

Projeto acadêmico — etapa 1: dashboard/frontend com dados simulados.
Etapa da integração física (ESP32 + sensores) planejada para uma fase futura.
