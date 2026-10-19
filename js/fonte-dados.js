// ── FONTE DOS DADOS ──
// O painel funciona de dois jeitos:
//   1) "simulado": os valores são gerados em JavaScript (js/dados-simulados.js);
//   2) "esp32": o painel busca as leituras reais no ESP32 pela rede Wi-Fi (GET /dados).
//
// Se o ESP32 parar de responder, o painel NÃO volta sozinho para a simulação:
// ele passa a avisar "Dados desatualizados" (RF11). Assim ninguém confunde
// número simulado com leitura real. Para voltar, use "Usar simulação".

const fonteDados = {
    modo: "simulado",     // "simulado" | "esp32"
    endereco: "",         // ex.: "http://192.168.0.50"
    ultimaFalhaEm: null,
    buscando: false
}

const CHAVE_ENDERECO_SALVO = "smartroom.endereco-esp32"
const TEMPO_LIMITE_ESP32_MS = 3000

// valores fora destas faixas são tratados como "Leitura indisponível"
const FAIXA_VALIDA = {
    temperatura: [-40, 80],
    umidade: [0, 100],
    ar: [0, 100],
    luminosidade: [0, 100000],
    som: [0, 100]
}

function lerEnderecoSalvo() {
    try { return localStorage.getItem(CHAVE_ENDERECO_SALVO) || "" } catch (e) { return "" }
}

function salvarEnderecoEsp32(endereco) {
    try {
        if (endereco) localStorage.setItem(CHAVE_ENDERECO_SALVO, endereco)
        else localStorage.removeItem(CHAVE_ENDERECO_SALVO)
    } catch (e) { /* sem armazenamento: tudo bem */ }
}

function normalizarEndereco(texto) {
    let t = (texto || "").trim()
    if (!t) return ""
    if (!/^https?:\/\//i.test(t)) t = "http://" + t
    return t.replace(/\/+$/, "")
}

function rotuloFonte() {
    return fonteDados.modo === "esp32"
        ? `ESP32 em ${fonteDados.endereco.replace(/^https?:\/\//, "")}`
        : "Dados simulados"
}

async function buscarJSONESP32(endereco) {
    const controle = new AbortController()
    const tempo = setTimeout(() => controle.abort(), TEMPO_LIMITE_ESP32_MS)
    try {
        const resposta = await fetch(endereco + "/dados", { cache: "no-store", signal: controle.signal })
        if (!resposta.ok) throw new Error("HTTP " + resposta.status)
        return await resposta.json()
    } finally {
        clearTimeout(tempo)
    }
}

// transforma o JSON do ESP32 numa leitura do painel (valor ausente ou absurdo vira null)
function leituraDeJSON(json) {
    const valores = {}
    ORDEM_METRICAS.forEach(chave => {
        const v = json ? json[chave] : null
        const [minimo, maximo] = FAIXA_VALIDA[chave]
        valores[chave] = (typeof v === "number" && isFinite(v) && v >= minimo && v <= maximo) ? v : null
    })
    return criarLeitura(new Date(), valores)
}

// chamada a cada ciclo quando o modo é "esp32"
async function atualizarDoESP32() {
    if (fonteDados.buscando) return
    fonteDados.buscando = true
    try {
        const json = await buscarJSONESP32(fonteDados.endereco)
        registrarLeitura(leituraDeJSON(json))
        fonteDados.ultimaFalhaEm = null
    } catch (erro) {
        fonteDados.ultimaFalhaEm = fonteDados.ultimaFalhaEm || new Date()
    } finally {
        fonteDados.buscando = false
    }
}

function limparHistorico() {
    historicoLeituras = []
    alertasGerados = []
    alertaAtivoPorMetrica = {}
}

// testa o endereço; só troca de fonte se o ESP32 responder
async function conectarESP32(texto) {
    const endereco = normalizarEndereco(texto)
    if (!endereco) {
        return { ok: false, mensagem: "Digite o endereço do ESP32, por exemplo 192.168.0.50." }
    }
    try {
        const leitura = leituraDeJSON(await buscarJSONESP32(endereco))
        fonteDados.modo = "esp32"
        fonteDados.endereco = endereco
        fonteDados.ultimaFalhaEm = null
        limparHistorico()
        registrarLeitura(leitura)
        salvarEnderecoEsp32(endereco)
        return { ok: true, mensagem: `Conectado. Os dados agora vêm do ${rotuloFonte()}.` }
    } catch (erro) {
        return {
            ok: false,
            mensagem: `Não consegui conectar em ${endereco}. Continuo com os dados simulados. ` +
                      `Confira se o ESP32 está ligado, na mesma rede Wi-Fi, e se o endereço está certo.`
        }
    }
}

function usarSimulacao() {
    fonteDados.modo = "simulado"
    fonteDados.endereco = ""
    fonteDados.ultimaFalhaEm = null
    conexao.ativa = true
    conexao.pausado = false
    conexao.falhaSom = false
    limparHistorico()
    inicializarHistoricoBase()
    salvarEnderecoEsp32("")
}
