/*
 * Smart Room — firmware do ESP32 (Arduino IDE)
 * ------------------------------------------------------------------
 * Lê temperatura e umidade (DHT22), luminosidade (BH1750), qualidade do ar
 * (MQ-135) e nível de som (KY-038), mostra no display OLED e entrega um JSON
 * pela rede Wi-Fi para o painel web (index.html).
 *
 *   GET http://<endereço-do-esp32>/dados
 *   -> {"temperatura":24.5,"umidade":55.0,"ar":22,"luminosidade":300,"som":40}
 *   (um sensor com falha vem como null, e o painel mostra "Leitura indisponível")
 *
 * STATUS: escrito conforme o Documento de Especificação 2.0. AINDA NÃO FOI TESTADO
 * NO HARDWARE. Antes de usar, confira a pinagem em docs/ESP32-pinagem-e-montagem.md
 * e calibre os valores marcados com "CALIBRAR".
 *
 * Bibliotecas (Gerenciador de Bibliotecas da Arduino IDE):
 *   - "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor"
 *   - "BH1750" (Christopher Laws)
 *   - "Adafruit SSD1306" + "Adafruit GFX Library"   (só se USAR_OLED = 1)
 * Placa: "ESP32 Dev Module" (pacote "esp32" da Espressif).
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Wire.h>
#include <DHT.h>
#include <BH1750.h>

// ───────────────────────── CONFIGURAÇÃO ─────────────────────────
const char* WIFI_SSID  = "SEU_WIFI";        // CALIBRAR: nome da rede Wi-Fi (2,4 GHz)
const char* WIFI_SENHA = "SUA_SENHA";       // senha da rede
const char* NOME_MDNS  = "smartroom";       // também acessível em http://smartroom.local

#define USAR_OLED 1                         // 1 = display OLED SSD1306 128x64 (I2C); 0 = sem display

// Pinos (ver docs/ESP32-pinagem-e-montagem.md)
const int PINO_DHT   = 4;                   // DHT22: DATA
const int PINO_AR    = 34;                  // MQ-135: AO (ADC1, entrada apenas) via divisor de tensão
const int PINO_SOM   = 35;                  // KY-038: AO (ADC1, entrada apenas)
const int PINO_SDA   = 21;                  // I2C: BH1750 + OLED
const int PINO_SCL   = 22;

const unsigned long INTERVALO_LEITURA_MS = 2000;   // o DHT22 não aceita leituras mais rápidas que 2 s

// ── Calibração (CALIBRAR) ──
// MQ-135: valor do ADC (0–4095) no ar limpo e em ar bem ruim. O índice 0–100 é uma
// escala RELATIVA e indicativa, não uma medição em ppm. Deixe o sensor ligado ~24 h
// na primeira vez e anote o valor no ar limpo da sala (veja o Serial Monitor).
const int AR_LIMPO = 700;
const int AR_RUIM  = 2500;

// KY-038: variação de pico a pico do sinal (ADC) numa janela de 50 ms. 0 = silêncio;
// SOM_MAXIMO = "muito barulho" (índice 100). Ajuste o potenciômetro do módulo e esta
// constante batendo palmas perto do sensor.
const int SOM_MAXIMO = 2000;
const int SOM_JANELA_MS = 50;

// ───────────────────────── OBJETOS ─────────────────────────
DHT dht(PINO_DHT, DHT22);
BH1750 luxometro;
WebServer servidor(80);

#if USAR_OLED
  #include <Adafruit_GFX.h>
  #include <Adafruit_SSD1306.h>
  Adafruit_SSD1306 tela(128, 64, &Wire, -1);
  bool oledOk = false;
#endif

struct Leitura {
  float temperatura = NAN;
  float umidade = NAN;
  float ar = NAN;            // índice 0–100
  float luminosidade = NAN;  // lux
  float som = NAN;           // índice 0–100
};

Leitura atual;
bool luxometroOk = false;
unsigned long ultimaLeitura = 0;
unsigned long ultimaTentativaWifi = 0;

// ───────────────────────── SENSORES ─────────────────────────
float limitar(float v, float minimo, float maximo) {
  return v < minimo ? minimo : (v > maximo ? maximo : v);
}

// média de várias leituras do ADC (reduz ruído)
int lerAnalogicoMedio(int pino, int amostras) {
  long soma = 0;
  for (int i = 0; i < amostras; i++) {
    soma += analogRead(pino);
    delayMicroseconds(200);
  }
  return soma / amostras;
}

float lerIndiceAr() {
  int bruto = lerAnalogicoMedio(PINO_AR, 32);
  if (bruto <= 0 || bruto >= 4095) return NAN;       // fio solto ou fora da faixa
  float indice = 100.0f * (bruto - AR_LIMPO) / (float)(AR_RUIM - AR_LIMPO);
  return limitar(indice, 0, 100);
}

float lerIndiceSom() {
  int minimo = 4095, maximo = 0;
  unsigned long inicio = millis();
  while (millis() - inicio < SOM_JANELA_MS) {
    int v = analogRead(PINO_SOM);
    if (v < minimo) minimo = v;
    if (v > maximo) maximo = v;
  }
  if (maximo == 0 && minimo == 4095) return NAN;
  float indice = 100.0f * (maximo - minimo) / (float)SOM_MAXIMO;
  return limitar(indice, 0, 100);
}

void lerSensores() {
  float t = dht.readTemperature();
  float u = dht.readHumidity();
  atual.temperatura = isnan(t) ? NAN : t;
  atual.umidade = isnan(u) ? NAN : u;

  if (luxometroOk) {
    float lux = luxometro.readLightLevel();
    atual.luminosidade = (lux < 0) ? NAN : lux;      // negativo = erro de leitura
  } else {
    atual.luminosidade = NAN;
  }

  atual.ar = lerIndiceAr();
  atual.som = lerIndiceSom();

  Serial.printf("T=%.1f C  U=%.0f %%  Ar=%.0f  Lux=%.0f  Som=%.0f   (ADC ar bruto=%d)\n",
                atual.temperatura, atual.umidade, atual.ar, atual.luminosidade, atual.som,
                lerAnalogicoMedio(PINO_AR, 8));
}

// ───────────────────────── JSON ─────────────────────────
// escreve "nulo" para valores inválidos, para o painel mostrar "Leitura indisponível"
void adicionarCampo(String& json, const char* nome, float valor, int casas, bool ultimo = false) {
  json += "\"";
  json += nome;
  json += "\":";
  if (isnan(valor)) json += "null";
  else json += String(valor, casas);
  if (!ultimo) json += ",";
}

String montarJson() {
  String json = "{";
  adicionarCampo(json, "temperatura", atual.temperatura, 1);
  adicionarCampo(json, "umidade", atual.umidade, 0);
  adicionarCampo(json, "ar", atual.ar, 0);
  adicionarCampo(json, "luminosidade", atual.luminosidade, 0);
  adicionarCampo(json, "som", atual.som, 0, true);
  json += "}";
  return json;
}

void enviarCabecalhosCors() {
  // permite que o painel (aberto de outro endereço ou de um arquivo) leia os dados
  servidor.sendHeader("Access-Control-Allow-Origin", "*");
  servidor.sendHeader("Cache-Control", "no-store");
}

void aoPedirDados() {
  enviarCabecalhosCors();
  servidor.send(200, "application/json", montarJson());
}

void aoPedirRaiz() {
  enviarCabecalhosCors();
  servidor.send(200, "text/plain; charset=utf-8",
                "Smart Room (ESP32). Os dados estao em /dados");
}

void aoNaoEncontrar() {
  enviarCabecalhosCors();
  servidor.send(404, "text/plain", "Nao encontrado");
}

// ───────────────────────── WI-FI ─────────────────────────
void conectarWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  Serial.printf("Conectando em %s", WIFI_SSID);
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(400);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConectado. Endereco: http://%s/dados\n", WiFi.localIP().toString().c_str());
    if (MDNS.begin(NOME_MDNS)) Serial.printf("Tambem em http://%s.local/dados\n", NOME_MDNS);
  } else {
    Serial.println("\nSem Wi-Fi por enquanto. Vou tentar de novo.");
  }
}

void manterWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - ultimaTentativaWifi < 10000) return;
  ultimaTentativaWifi = millis();
  Serial.println("Wi-Fi caiu. Reconectando...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
}

// ───────────────────────── DISPLAY ─────────────────────────
#if USAR_OLED
void linhaTela(int y, const char* rotulo, float valor, int casas, const char* unidade) {
  tela.setCursor(0, y);
  tela.print(rotulo);
  if (isnan(valor)) tela.print("indisp.");
  else { tela.print(valor, casas); tela.print(unidade); }
}

void atualizarTela() {
  if (!oledOk) return;
  tela.clearDisplay();
  tela.setTextSize(1);
  tela.setTextColor(SSD1306_WHITE);
  tela.setCursor(0, 0);
  tela.print("SMART ROOM");
  tela.setCursor(80, 0);
  tela.print(WiFi.status() == WL_CONNECTED ? "Wi-Fi ok" : "sem Wi-Fi");
  linhaTela(12, "Temp: ", atual.temperatura, 1, " C");
  linhaTela(22, "Umid: ", atual.umidade, 0, " %");
  linhaTela(32, "Ar  : ", atual.ar, 0, " /100");
  linhaTela(42, "Luz : ", atual.luminosidade, 0, " lux");
  linhaTela(52, "Som : ", atual.som, 0, " /100");
  tela.display();
}
#else
void atualizarTela() {}
#endif

// ───────────────────────── SETUP / LOOP ─────────────────────────
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nSmart Room — iniciando (RF01)");

  analogReadResolution(12);                       // 0–4095
  analogSetPinAttenuation(PINO_AR, ADC_11db);     // até ~3,3 V
  analogSetPinAttenuation(PINO_SOM, ADC_11db);

  Wire.begin(PINO_SDA, PINO_SCL);
  dht.begin();
  luxometroOk = luxometro.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  if (!luxometroOk) Serial.println("BH1750 nao encontrado: confira SDA/SCL/VCC/GND.");

#if USAR_OLED
  oledOk = tela.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (!oledOk) Serial.println("OLED nao encontrado (endereco 0x3C).");
#endif

  conectarWifi();

  servidor.on("/", aoPedirRaiz);
  servidor.on("/dados", HTTP_GET, aoPedirDados);
  servidor.onNotFound(aoNaoEncontrar);
  servidor.begin();

  lerSensores();
  atualizarTela();
}

void loop() {
  servidor.handleClient();
  manterWifi();

  if (millis() - ultimaLeitura >= INTERVALO_LEITURA_MS) {
    ultimaLeitura = millis();
    lerSensores();
    atualizarTela();
  }
}
