// ── DADOS SIMULADOS ──
// Centraliza toda a simulação de leituras do ambiente da sala de aula.
// Quando o ESP32 estiver pronto, basta substituir a função gerarNovaLeitura()
// por uma leitura real (ex: via fetch numa API/MQTT), mantendo o resto do
// dashboard funcionando sem alterações.

const CONFIG_SIMULACAO = {
    intervaloNovaLeituraMs: 4000,  // gera uma nova leitura a cada 4s
    intervaloRelogioMs: 1000,      // atualiza data/hora a cada 1s
    maxHistorico: 18               // pontos mantidos no histórico/gráficos
}

const LIMITES = {
    temperatura: { atencaoBaixa: 19, atencaoAlta: 27, criticaBaixa: 16, criticaAlta: 30 },
    ruido:       { atencao: 55, critico: 65 },
    iluminacao:  { atencao: 350, critico: 150 },
    indiceAr:    { boa: 35, moderada: 65 } // acima de 65 = Atenção
}

const CATEGORIAS_QUALIDADE_AR = [
    { nome: "Boa",      cor: "var(--color-success)" },
    { nome: "Moderada", cor: "var(--color-warning)" },
    { nome: "Atenção",  cor: "var(--color-danger)"  }
]

const SENSORES_PLANEJADOS = [
    { grandeza: "Temperatura",     modelo: "DHT22" },
    { grandeza: "Iluminação",      modelo: "LDR / BH1750" },
    { grandeza: "Ruído",           modelo: "Módulo de Som (KY-038)" },
    { grandeza: "Qualidade do Ar", modelo: "MQ-135" }
]

// estado atual (ponto de partida da simulação)
const estadoSimulado = {
    temperatura: 24.5,
    iluminacao: 620,
    ruido: 47,
    indiceAr: 22
}

let historicoLeituras = []
let alertasGerados = []
let alertasAtivos = {} // controla quais condições já geraram alerta (evita spam)

function variarValor(valor, minimo, maximo, passoMaximo) {
    const novo = valor + (Math.random() * 2 - 1) * passoMaximo
    return Math.min(maximo, Math.max(minimo, novo))
}

function classificarQualidadeAr(indice) {
    if (indice <= LIMITES.indiceAr.boa) return 0
    if (indice <= LIMITES.indiceAr.moderada) return 1
    return 2
}

function criarLeitura(dataHora, temperatura, iluminacao, ruido, indiceAr) {
    return {
        dataHora,
        temperatura: Number(temperatura.toFixed(1)),
        iluminacao: Math.round(iluminacao),
        ruido: Math.round(ruido),
        indiceAr: Math.round(indiceAr),
        qualidadeArIndex: classificarQualidadeAr(indiceAr)
    }
}

// popula um pequeno histórico inicial para o dashboard não começar vazio
function inicializarHistoricoBase() {
    const agora = new Date()
    const pontosBase = [
        { minutosAtras: 6, temperatura: 23.8, iluminacao: 580, ruido: 42, indiceAr: 15 },
        { minutosAtras: 5, temperatura: 23.9, iluminacao: 595, ruido: 44, indiceAr: 18 },
        { minutosAtras: 4, temperatura: 24.1, iluminacao: 610, ruido: 48, indiceAr: 20 },
        { minutosAtras: 3, temperatura: 24.3, iluminacao: 640, ruido: 53, indiceAr: 42 },
        { minutosAtras: 2, temperatura: 24.4, iluminacao: 630, ruido: 50, indiceAr: 30 },
        { minutosAtras: 1, temperatura: 24.5, iluminacao: 620, ruido: 47, indiceAr: 22 }
    ]

    historicoLeituras = pontosBase.map(ponto => {
        const dataHora = new Date(agora.getTime() - ponto.minutosAtras * 60000)
        return criarLeitura(dataHora, ponto.temperatura, ponto.iluminacao, ponto.ruido, ponto.indiceAr)
    })

    estadoSimulado.temperatura = pontosBase.at(-1).temperatura
    estadoSimulado.iluminacao  = pontosBase.at(-1).iluminacao
    estadoSimulado.ruido       = pontosBase.at(-1).ruido
    estadoSimulado.indiceAr    = pontosBase.at(-1).indiceAr
}

// gera a próxima leitura simulada com pequenas variações (não totalmente aleatórias)
function gerarNovaLeitura() {
    estadoSimulado.temperatura = variarValor(estadoSimulado.temperatura, 17, 31, 0.3)
    estadoSimulado.iluminacao  = variarValor(estadoSimulado.iluminacao, 80, 900, 20)
    estadoSimulado.ruido       = variarValor(estadoSimulado.ruido, 28, 72, 3)
    estadoSimulado.indiceAr    = variarValor(estadoSimulado.indiceAr, 0, 100, 6)

    const leitura = criarLeitura(
        new Date(),
        estadoSimulado.temperatura,
        estadoSimulado.iluminacao,
        estadoSimulado.ruido,
        estadoSimulado.indiceAr
    )

    historicoLeituras.push(leitura)
    if (historicoLeituras.length > CONFIG_SIMULACAO.maxHistorico) historicoLeituras.shift()

    atualizarAlertas(leitura)

    return leitura
}

function obterUltimaLeitura() {
    return historicoLeituras.at(-1)
}

// calcula o status geral do ambiente a partir da última leitura
function calcularStatusGeral(leitura) {
    if (!leitura) return { nivel: "normal", emoji: "🟢", texto: "Ambiente normal" }

    const critico =
        leitura.temperatura <= LIMITES.temperatura.criticaBaixa ||
        leitura.temperatura >= LIMITES.temperatura.criticaAlta ||
        leitura.ruido >= LIMITES.ruido.critico ||
        leitura.iluminacao <= LIMITES.iluminacao.critico ||
        leitura.qualidadeArIndex === 2

    if (critico) return { nivel: "critico", emoji: "🔴", texto: "Condição crítica" }

    const atencao =
        leitura.temperatura <= LIMITES.temperatura.atencaoBaixa ||
        leitura.temperatura >= LIMITES.temperatura.atencaoAlta ||
        leitura.ruido >= LIMITES.ruido.atencao ||
        leitura.iluminacao <= LIMITES.iluminacao.atencao ||
        leitura.qualidadeArIndex === 1

    if (atencao) return { nivel: "atencao", emoji: "🟡", texto: "Atenção" }

    return { nivel: "normal", emoji: "🟢", texto: "Ambiente normal" }
}

// gera alertas apenas quando uma condição É ATIVADA (evita repetir a cada leitura)
function atualizarAlertas(leitura) {
    const condicoes = [
        { chave: "ruidoCritico",  ativo: leitura.ruido >= LIMITES.ruido.critico,          mensagem: `Ruído acima do nível configurado (${leitura.ruido} dB)`, status: "critico" },
        { chave: "ruidoAtencao",  ativo: leitura.ruido >= LIMITES.ruido.atencao && leitura.ruido < LIMITES.ruido.critico, mensagem: `Ruído elevado (${leitura.ruido} dB)`, status: "atencao" },
        { chave: "tempAlta",      ativo: leitura.temperatura >= LIMITES.temperatura.atencaoAlta, mensagem: `Temperatura elevada (${String(leitura.temperatura).replace(".", ",")} °C)`, status: leitura.temperatura >= LIMITES.temperatura.criticaAlta ? "critico" : "atencao" },
        { chave: "tempBaixa",     ativo: leitura.temperatura <= LIMITES.temperatura.atencaoBaixa, mensagem: `Temperatura baixa (${String(leitura.temperatura).replace(".", ",")} °C)`, status: leitura.temperatura <= LIMITES.temperatura.criticaBaixa ? "critico" : "atencao" },
        { chave: "arAtencao",     ativo: leitura.qualidadeArIndex >= 1, mensagem: `Qualidade do ar em ${CATEGORIAS_QUALIDADE_AR[leitura.qualidadeArIndex].nome.toLowerCase()}`, status: leitura.qualidadeArIndex === 2 ? "critico" : "atencao" },
        { chave: "iluminacaoBaixa", ativo: leitura.iluminacao <= LIMITES.iluminacao.atencao, mensagem: `Iluminação abaixo do nível esperado (${leitura.iluminacao} lux)`, status: leitura.iluminacao <= LIMITES.iluminacao.critico ? "critico" : "atencao" }
    ]

    condicoes.forEach(condicao => {
        const jaEstavaAtivo = alertasAtivos[condicao.chave]
        if (condicao.ativo && !jaEstavaAtivo) {
            alertasGerados.unshift({ mensagem: condicao.mensagem, dataHora: leitura.dataHora, status: condicao.status })
            if (alertasGerados.length > 12) alertasGerados.pop()
        }
        alertasAtivos[condicao.chave] = condicao.ativo
    })
}

inicializarHistoricoBase()
