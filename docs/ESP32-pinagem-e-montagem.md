# Smart Room — pinagem, montagem e ligação com o painel

> **Status:** planejado conforme o Documento de Especificação 2.0.
> **Nada aqui foi testado em hardware ainda.** O firmware teve só a sintaxe verificada;
> o modo ESP32 do painel foi testado contra um servidor que imita o ESP32.
> Marque as evidências E01 a E05 como "pendentes" até a montagem real.

Diagrama: `docs/esquema-ligacao.svg` · Firmware: `esp32/smartroom-esp32/smartroom-esp32.ino`

## 1. Componentes (Anexo A do documento)

| Componente | Função | Alimentação |
|---|---|---|
| ESP32 DevKit | processamento, Wi-Fi e servidor `/dados` | USB 5 V |
| DHT22 | temperatura e umidade | 3,3 V |
| BH1750 (módulo GY-302) | luminosidade em lux (I²C, endereço 0x23) | 3,3 V |
| MQ-135 | indicação de qualidade do ar (analógico) | **5 V** (pino VIN) |
| KY-038 | variações de som (analógico) | 3,3 V |
| Display OLED SSD1306 128×64 (I²C, 0x3C) | exibição local (RF06) | 3,3 V |
| Protoboard, jumpers, cabo USB, fonte 5 V | montagem e alimentação | — |

> O orçamento do documento ainda não inclui o display. Confirme o preço e some ao total.
> Se usar LCD 16×2 em vez de OLED, o código do display precisa ser trocado.

## 2. Tabela de ligação

| Origem (módulo) | Pino do módulo | Destino (ESP32) | Observação |
|---|---|---|---|
| DHT22 | VCC | 3V3 | |
| DHT22 | DATA | **GPIO4** | sensor solto de 4 pinos: pull-up de 10 kΩ entre DATA e 3V3 |
| DHT22 | GND | GND | |
| BH1750 | VCC | 3V3 | |
| BH1750 | SDA | **GPIO21** | barramento I²C compartilhado |
| BH1750 | SCL | **GPIO22** | barramento I²C compartilhado |
| BH1750 | ADDR | GND | endereço 0x23 |
| BH1750 | GND | GND | |
| OLED | VCC | 3V3 | |
| OLED | SDA | **GPIO21** | compartilha com o BH1750 |
| OLED | SCL | **GPIO22** | compartilha com o BH1750 |
| OLED | GND | GND | |
| MQ-135 | VCC | **VIN (5 V)** | o aquecedor precisa de 5 V |
| MQ-135 | AO | **GPIO34**, passando por divisor de tensão | ver 3 |
| MQ-135 | GND | GND | |
| KY-038 | VCC | 3V3 | |
| KY-038 | AO | **GPIO35** | use AO (analógico), não D0 |
| KY-038 | GND | GND | |

## 3. Cuidados importantes

1. **Divisor de tensão no MQ-135.** Com 5 V de alimentação, o pino AO pode passar de 3,3 V e
   danificar o ESP32. Use dois resistores: **10 kΩ** entre AO e GPIO34, e **20 kΩ** entre GPIO34 e GND
   (a saída fica em 2/3 da tensão original, no máximo cerca de 3,3 V). Se os resistores forem outros,
   refaça a conta antes de ligar.
2. **GPIO34 e GPIO35** pertencem ao ADC1, que funciona junto com o Wi-Fi. Para leitura **analógica**, evite os pinos
   do ADC2 (GPIO0, 2, 4, 12–15, 25–27), que não leem com o Wi-Fi ligado. O DHT22 no GPIO4 é um sinal digital,
   então não sofre esse problema.
3. **GND comum** entre todos os módulos.
4. **Wi-Fi de 2,4 GHz.** O ESP32 não conecta em rede de 5 GHz.

## 4. Preparar a Arduino IDE

1. Instale o pacote de placas **esp32** (Espressif), em *Ferramentas → Placa → Gerenciador de Placas*.
2. Instale as bibliotecas: **DHT sensor library** (Adafruit) com **Adafruit Unified Sensor**, **BH1750**
   (Christopher Laws), **Adafruit SSD1306** com **Adafruit GFX Library**.
3. Abra `smartroom-esp32.ino`, escolha a placa *ESP32 Dev Module* e a porta USB.
4. No topo do arquivo, preencha `WIFI_SSID` e `WIFI_SENHA`. Se não usar display, troque `USAR_OLED` para `0`.
5. Envie o código e abra o **Monitor Serial a 115200**. Ele mostra o endereço, por exemplo
   `http://192.168.0.50/dados`, e uma linha por leitura.

Teste rápido: abra o endereço `/dados` no navegador de um computador na mesma rede. Deve aparecer algo como:
`{"temperatura":24.5,"umidade":55,"ar":22,"luminosidade":300,"som":40}`.
Um sensor com falha aparece como `null`.

## 5. Calibração (obrigatória para ter números com sentido)

- **MQ-135:** deixe ligado cerca de 24 h na primeira vez. Com o ar limpo da sala, anote o valor bruto
  que o Monitor Serial mostra (`ADC ar bruto`) e coloque em `AR_LIMPO`. Para `AR_RUIM`, use o valor com
  um estímulo forte (por exemplo, álcool em uma tampa, a alguns centímetros). O "índice" é relativo e
  **indicativo**, não é ppm.
- **KY-038:** ajuste o potenciômetro do módulo e a constante `SOM_MAXIMO` batendo palmas perto do sensor,
  até o índice chegar perto de 100 só com barulho forte. O módulo não mede decibéis.
- **Limites de atenção:** estão em `js/dados-simulados.js` (`METRICAS`). São valores de exemplo; valide com
  quem conhece as necessidades do espaço.

## 6. Ligar o painel ao ESP32

1. Abra `index.html` em um computador **na mesma rede Wi-Fi** do ESP32.
2. Clique em **Conexão e demonstração**, digite o endereço do ESP32 (ex.: `192.168.0.50` ou `smartroom.local`)
   e clique em **Conectar ao ESP32**.
3. O painel só troca de fonte se o ESP32 responder. O endereço fica salvo no navegador.
4. Se o ESP32 parar de responder, o painel **não volta para a simulação sozinho**: ele mostra
   "Dados desatualizados". Use "Usar simulação" para voltar aos dados simulados.

Se não conectar:
- O computador e o ESP32 estão na mesma rede? Teste o endereço direto no navegador.
- Abra o painel como arquivo local (`index.html`) ou por `http://`. Páginas em `https://` não podem
  chamar um endereço `http://` (bloqueio do navegador).
- `smartroom.local` pode não funcionar em alguns Windows e Android. Use o endereço IP.

## 7. Roteiro de testes (para as evidências)

| Evidência | O que registrar | Como |
|---|---|---|
| E01 | foto da montagem | ESP32 + sensores na protoboard |
| E02 | foto do display | valores aparecendo no OLED |
| E03 | teste de temperatura e umidade | comparar com um termômetro/higrômetro conhecido |
| E04 | teste de luminosidade e som | tapar o sensor de luz; bater palmas perto do KY-038 |
| E05 | teste do indicador de ar | comparar ar limpo e estímulo (calibração) |
| E06 | captura de tela do painel | painel conectado ao ESP32 |
| E07 | demonstração completa | vídeo curto: sensores → display → painel → alerta |
