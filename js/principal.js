// arquivo principal — inicializa o painel e controla a atualização das leituras

let assinaturaAnterior = null
let desatualizadoAnterior = false

function renderizarTudo() {
    const leitura = obterUltimaLeitura()

    preencherCardsMetricas(leitura)
    const status = atualizarStatusGeral(leitura)
    preencherTabelaHistorico()
    preencherTabelaAlertas()
    preencherSobre()
    desenharTodosGraficos()

    // avisa leitores de tela só quando a situação ou o estado do sistema MUDAM
    const estado = obterEstadoSistema()
    const assinatura = `${status.texto}|${estado.texto}`
    if (assinaturaAnterior !== null && assinatura !== assinaturaAnterior) {
        document.getElementById("anuncio").textContent =
            status.texto === estado.texto ? `${status.texto}.` : `${status.texto}. ${estado.texto}.`
    }
    assinaturaAnterior = assinatura
}

// a cada segundo, confere se as leituras ficaram velhas (sem redesenhar à toa)
function conferirDesatualizacao() {
    const agora = leituraDesatualizada()
    if (agora !== desatualizadoAnterior) {
        desatualizadoAnterior = agora
        renderizarTudo()
    }
}

async function proximaLeitura() {
    if (conexao.pausado) return
    if (fonteDados.modo === "esp32") {
        await atualizarDoESP32()
    } else {
        if (!conexao.ativa) return
        gerarNovaLeitura()
    }
    renderizarTudo()
}

async function inicializar() {
    ativarNavbar()
    ativarAlternarTema()
    montarSeletorGrafico()
    ativarControlesDemo()

    // se o endereço do ESP32 foi salvo antes, tenta reconectar sem travar a abertura
    const salvo = lerEnderecoSalvo()
    if (salvo) {
        const resultado = await conectarESP32(salvo)
        mostrarMensagemConexao(resultado.ok ? resultado.mensagem : resultado.mensagem, resultado.ok)
    }

    renderizarTudo()
    atualizarPainelDemo()

    setInterval(proximaLeitura, CONFIG_SIMULACAO.intervaloNovaLeituraMs)
    setInterval(conferirDesatualizacao, 1000)
    window.addEventListener("resize", desenharTodosGraficos)
}

inicializar()
