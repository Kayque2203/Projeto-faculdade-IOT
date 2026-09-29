// arquivo principal — inicializa o dashboard e controla a simulação
// (não há mais fetch: os dados vêm de js/dados-simulados.js)

function renderizarTudo() {
    const leitura = obterUltimaLeitura()

    preencherCardsMetricas(leitura)
    atualizarStatusGeral(leitura)
    preencherMenuLateral(leitura)
    preencherTabelaHistorico()
    preencherTabelaAlertas()
    preencherUltimosRegistros()
    preencherLimitesConfigurados()
    desenharTodosGraficos()
}

// atualiza apenas o relógio (data/horário) sem gerar uma nova leitura,
// para os cards de Data/Horário ficarem sempre em tempo real
function atualizarRelogio() {
    const ultima = obterUltimaLeitura()
    const leituraComHoraAtual = { ...ultima, dataHora: new Date() }
    preencherCardsMetricas(leituraComHoraAtual)
}

function inicializar() {
    renderizarTudo()
    ativarNavbar()
    ativarAlternarTema()

    // gera uma nova leitura simulada periodicamente (dados + gráficos + tabelas)
    setInterval(() => {
        gerarNovaLeitura()
        renderizarTudo()
    }, CONFIG_SIMULACAO.intervaloNovaLeituraMs)

    // mantém o relógio em tempo real entre uma leitura simulada e outra
    setInterval(atualizarRelogio, CONFIG_SIMULACAO.intervaloRelogioMs)

    // redesenha os gráficos ao redimensionar a janela (canvas depende da largura)
    window.addEventListener("resize", desenharTodosGraficos)
}

inicializar()
