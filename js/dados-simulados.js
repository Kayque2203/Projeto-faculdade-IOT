// ── DADOS SIMULADOS ──
// Centraliza toda a simulação de leituras do ambiente.
// Quando o ESP32 estiver pronto, basta substituir a função gerarNovaLeitura()
// por uma leitura real (ex.: fetch numa API ou MQTT). O restante do painel
// (cards, gráficos, tabelas, alertas) continua funcionando sem alterações.

const CONFIG_SIMULACAO = {
    intervaloNovaLeituraMs: 4000,      // intervalo de atualização das leituras (RNF04)
    toleranciaDesatualizadoMs: 12000,  // sem leitura nova por este tempo = "desatualizado" (RF11)
    maxHistorico: 18                   // pontos mantidos no histórico/gráficos
}

// Cada grandeza tem limites de ATENÇÃO (nível 1) e ATENÇÃO ELEVADA (nível 2).
// "Min" = valor baixo demais; "Max" = valor alto demais.
// Os limites são valores iniciais de exemplo e devem ser validados na implementação (ver documento).
const METRICAS = {
    temperatura: {
        rotulo: "Temperatura", icone: "thermometer", sensor: "DHT22",
        unidade: "°C", casas: 1, eixoMin: 15, eixoMax: 33,
        passo: 0.3, simMin: 16, simMax: 32,
        limites: { atencaoMin: 19, atencaoMax: 27, elevadaMin: 16, elevadaMax: 30 },
        faixa: "Confortável: 19 a 27 °C",
        textoLimites: "Confortável de 19 a 27 °C. Atenção fora dessa faixa; atenção elevada abaixo de 16 ou acima de 30 °C."
    },
    umidade: {
        rotulo: "Umidade", icone: "droplet", sensor: "DHT22",
        unidade: "%", casas: 0, eixoMin: 10, eixoMax: 90,
        passo: 1.2, simMin: 15, simMax: 85,
        limites: { atencaoMin: 30, atencaoMax: 65, elevadaMin: 20, elevadaMax: 75 },
        faixa: "Confortável: 30 a 65 %",
        textoLimites: "Confortável de 30 a 65 %. Atenção fora dessa faixa; atenção elevada abaixo de 20 ou acima de 75 %."
    },
    ar: {
        rotulo: "Qualidade do ar", icone: "wind", sensor: "MQ-135",
        unidade: "", casas: 0, eixoMin: 0, eixoMax: 100,
        passo: 6, simMin: 0, simMax: 100,
        categorias: ["Boa", "Moderada", "Ruim"],
        limites: { atencaoMax: 35, elevadaMax: 65 },
        faixa: "Boa: índice até 35",
        textoLimites: "Índice de 0 a 100 (indicativo). Boa até 35; moderada de 36 a 65; ruim acima de 65."
    },
    luminosidade: {
        rotulo: "Luminosidade", icone: "sun", sensor: "BH1750",
        unidade: "lux", casas: 0, eixoMin: 0, eixoMax: 1200,
        passo: 25, simMin: 40, simMax: 1100,
        limites: { atencaoMin: 100, atencaoMax: 700, elevadaMin: 50, elevadaMax: 1000 },
        faixa: "Confortável: 100 a 700 lux",
        textoLimites: "Confortável de 100 a 700 lux. Atenção acima de 700 ou abaixo de 100; atenção elevada acima de 1000 ou abaixo de 50 lux."
    },
    som: {
        rotulo: "Nível de som", icone: "sound", sensor: "KY-038",
        unidade: "", casas: 0, eixoMin: 0, eixoMax: 100,
        passo: 4, simMin: 15, simMax: 95,
        categorias: ["Baixo", "Elevado", "Muito alto"],
        limites: { atencaoMax: 55, elevadaMax: 70 },
        faixa: "Baixo: índice até 55",
        textoLimites: "Índice de 0 a 100 (indicativo). Atenção acima de 55; atenção elevada acima de 70."
    }
}

const ORDEM_METRICAS = ["temperatura", "umidade", "ar", "luminosidade", "som"]

const COMPONENTES_PREVISTOS = [
    { grandeza: "Processamento",         modelo: "ESP32 DevKit" },
    { grandeza: "Temperatura e umidade", modelo: "DHT22" },
    { grandeza: "Qualidade do ar",       modelo: "MQ-135" },
    { grandeza: "Nível de som",          modelo: "KY-038" },
    { grandeza: "Luminosidade",          modelo: "BH1750" },
    { grandeza: "Exibição local",        modelo: "Display LCD/OLED" }
]

// valores iniciais (parecidos com o exemplo do documento)
const ESTADO_INICIAL = { temperatura: 24.5, umidade: 55, ar: 22, luminosidade: 300, som: 40 }
const estadoSimulado = { ...ESTADO_INICIAL }

// condições que a demonstração pode ligar/desligar
const conexao = {
    ativa: true,        // false = simula perda de conexão (não chegam leituras novas)
    pausado: false,     // true = a pessoa pausou a atualização
    falhaSom: false     // true = sensor de som sem leitura
}

let historicoLeituras = []
let alertasGerados = []   // { id, metrica, chave, mensagem, nivel, inicio, fim, ativo }
let alertaAtivoPorMetrica = {}
let proximoIdAlerta = 1

// ── CLASSIFICAÇÃO ──
function classificar(chave, valor) {
    if (valor === null || valor === undefined) return { nivel: null, direcao: null }
    const l = METRICAS[chave].limites
    // atenção = FORA da faixa confortável; atenção elevada = ainda mais fora
    if (l.elevadaMin != null && valor < l.elevadaMin) return { nivel: 2, direcao: "baixa" }
    if (l.elevadaMax != null && valor > l.elevadaMax) return { nivel: 2, direcao: "alta" }
    if (l.atencaoMin != null && valor < l.atencaoMin) return { nivel: 1, direcao: "baixa" }
    if (l.atencaoMax != null && valor > l.atencaoMax) return { nivel: 1, direcao: "alta" }
    return { nivel: 0, direcao: null }
}

function nivelDe(leitura, chave) {
    return classificar(chave, leitura[chave]).nivel
}

// texto do valor como aparece nas telas
function formatarValor(chave, valor) {
    if (valor === null || valor === undefined) return "Leitura indisponível"
    const m = METRICAS[chave]
    if (m.categorias) return m.categorias[classificar(chave, valor).nivel]
    const numero = m.casas > 0 ? formatarNumero(valor, m.casas) : String(valor)
    return m.unidade ? `${numero} ${m.unidade}` : numero
}

// ── SIMULAÇÃO ──
function variarValor(valor, minimo, maximo, passoMaximo) {
    const novo = valor + (Math.random() * 2 - 1) * passoMaximo
    return Math.min(maximo, Math.max(minimo, novo))
}

function criarLeitura(dataHora, valores) {
    const leitura = { dataHora }
    ORDEM_METRICAS.forEach(chave => {
        const v = valores[chave]
        leitura[chave] = (v === null || v === undefined) ? null : Number(v.toFixed(METRICAS[chave].casas || 0))
    })
    return leitura
}

// pequeno histórico inicial para o painel não começar vazio
function inicializarHistoricoBase() {
    const agora = new Date()
    const base = [
        { t: 5, temperatura: 23.8, umidade: 52, ar: 15, luminosidade: 280, som: 32 },
        { t: 4, temperatura: 23.9, umidade: 53, ar: 18, luminosidade: 290, som: 35 },
        { t: 3, temperatura: 24.1, umidade: 54, ar: 20, luminosidade: 310, som: 38 },
        { t: 2, temperatura: 24.3, umidade: 56, ar: 42, luminosidade: 330, som: 46 },
        { t: 1, temperatura: 24.4, umidade: 55, ar: 30, luminosidade: 315, som: 42 },
        { t: 0, temperatura: 24.5, umidade: 55, ar: 22, luminosidade: 300, som: 40 }
    ]

    historicoLeituras = base.map(p => {
        const dataHora = new Date(agora.getTime() - p.t * 60000)
        return criarLeitura(dataHora, p)
    })
    Object.assign(estadoSimulado, ESTADO_INICIAL)
}

// gera a próxima leitura simulada com pequenas variações (não totalmente aleatórias)
function gerarNovaLeitura() {
    ORDEM_METRICAS.forEach(chave => {
        const m = METRICAS[chave]
        estadoSimulado[chave] = variarValor(estadoSimulado[chave], m.simMin, m.simMax, m.passo)
    })

    const valores = { ...estadoSimulado }
    if (conexao.falhaSom) valores.som = null   // sensor sem leitura

    return registrarLeitura(criarLeitura(new Date(), valores))
}

// guarda uma leitura (simulada ou vinda do ESP32) no histórico e confere os alertas
function registrarLeitura(leitura) {
    historicoLeituras.push(leitura)
    if (historicoLeituras.length > CONFIG_SIMULACAO.maxHistorico) historicoLeituras.shift()
    atualizarAlertas(leitura)
    return leitura
}

function obterUltimaLeitura() {
    return historicoLeituras.at(-1)
}

// ── ESTADO DO SISTEMA (RF11, RNF07, RI05, RI06) ──
function leituraDesatualizada() {
    if (conexao.pausado) return false
    const ultima = obterUltimaLeitura()
    return !ultima || (Date.now() - ultima.dataHora.getTime()) > CONFIG_SIMULACAO.toleranciaDesatualizadoMs
}

function sensoresSemLeitura(leitura) {
    return ORDEM_METRICAS.filter(chave => leitura[chave] === null)
}

function obterEstadoSistema() {
    const ultima = obterUltimaLeitura()
    const hora = formatarHora(ultima.dataHora, true)
    const semLeitura = sensoresSemLeitura(ultima)

    if (conexao.pausado) {
        return { codigo: "pausado", nivel: 1, texto: "Atualização pausada", detalhe: `Última leitura às ${hora}` }
    }
    if (leituraDesatualizada()) {
        return { codigo: "desatualizado", nivel: "velho", texto: "Dados desatualizados", detalhe: (typeof fonteDados !== "undefined" && fonteDados.modo === "esp32" ? `O ESP32 não respondeu. Última leitura às ${hora}` : `Sem nova leitura desde ${hora}`) }
    }
    if (semLeitura.length > 0) {
        const nomes = semLeitura.map(c => METRICAS[c].rotulo.toLowerCase()).join(", ")
        return { codigo: "parcial", nivel: 1, texto: "Dados atualizados, com falha", detalhe: `Leitura indisponível: ${nomes}` }
    }
    return { codigo: "atualizado", nivel: 0, texto: "Dados atualizados", detalhe: `Última leitura às ${hora}` }
}

// ── STATUS GERAL DO AMBIENTE ──
function calcularStatusGeral(leitura) {
    if (leituraDesatualizada()) {
        return { nivel: "velho", texto: "Os dados estão desatualizados", detalhe: "Não use estes valores como se fossem atuais." }
    }

    const niveis = ORDEM_METRICAS.map(c => ({ chave: c, nivel: nivelDe(leitura, c) }))
    const disponiveis = niveis.filter(n => n.nivel !== null)
    const maximo = disponiveis.length ? Math.max(...disponiveis.map(n => n.nivel)) : null
    const fora = disponiveis.filter(n => n.nivel > 0).map(n => METRICAS[n.chave].rotulo.toLowerCase())
    const semLeitura = niveis.filter(n => n.nivel === null).length
    const aviso = semLeitura ? ` ${semLeitura} leitura(s) indisponível(is).` : ""

    const nomesSem = niveis.filter(n => n.nivel === null).map(n => METRICAS[n.chave].rotulo.toLowerCase()).join(", ")

    if (maximo === null) return { nivel: "sem", texto: "Sem leituras disponíveis", detalhe: "Verifique os sensores." }
    // se falta um sensor, não dá para dizer que está tudo bem
    if (maximo === 0 && semLeitura > 0) return { nivel: 1, texto: "Dados incompletos", detalhe: `Os indicadores com leitura estão dentro dos limites. Sem leitura: ${nomesSem}.` }
    if (maximo === 0) return { nivel: 0, texto: "A sala está dentro dos limites", detalhe: "Nenhum indicador precisa de atenção." }
    if (maximo === 1) return { nivel: 1, texto: "Atenção: há indicadores fora do limite", detalhe: `Fora da faixa: ${fora.join(", ")}.` + aviso }
    return { nivel: 2, texto: "Atenção elevada: indicadores bem fora do limite", detalhe: `Fora da faixa: ${fora.join(", ")}.` + aviso }
}

// ── ALERTAS ──
function mensagemAlerta(chave, direcao, nivel, valor) {
    const m = METRICAS[chave]
    if (m.categorias) return `${m.rotulo}: ${m.categorias[nivel].toLowerCase()} (índice ${valor})`
    return `${m.rotulo} ${direcao} (${formatarValor(chave, valor)})`
}

// cria um alerta quando a condição começa e o encerra quando ela termina
// (evita repetir o mesmo alerta a cada leitura)
function atualizarAlertas(leitura) {
    ORDEM_METRICAS.forEach(chave => {
        const valor = leitura[chave]
        if (valor === null) return  // sem leitura: não muda o alerta

        const { nivel, direcao } = classificar(chave, valor)
        const novaChave = nivel > 0 ? `${direcao}-${nivel}` : null
        const atual = alertaAtivoPorMetrica[chave]

        if (atual && atual.chave === novaChave) return

        if (atual) {
            atual.ativo = false
            atual.fim = leitura.dataHora
            alertaAtivoPorMetrica[chave] = null
        }

        if (novaChave) {
            const alerta = {
                id: proximoIdAlerta++, metrica: chave, chave: novaChave,
                mensagem: mensagemAlerta(chave, direcao, nivel, valor),
                nivel, inicio: leitura.dataHora, fim: null, ativo: true
            }
            alertasGerados.unshift(alerta)
            alertaAtivoPorMetrica[chave] = alerta
            if (alertasGerados.length > 12) alertasGerados.pop()
        }
    })
}

function contarAlertasAtivos() {
    return alertasGerados.filter(a => a.ativo).length
}

inicializarHistoricoBase()
