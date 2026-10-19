// painel "Conexão e demonstração": fonte dos dados (simulação ou ESP32) e botões de simulação

function definirBotaoAtivo(id, ativo, textoAtivo, textoInativo) {
    const botao = document.getElementById(id)
    botao.setAttribute("aria-pressed", String(ativo))
    botao.textContent = ativo ? textoAtivo : textoInativo
}

function mostrarMensagemConexao(texto, ok) {
    const msg = document.getElementById("msg-conexao")
    msg.textContent = texto
    msg.className = "mensagem " + (ok ? "ok" : "erro")
}

function atualizarPainelDemo() {
    const simulado = fonteDados.modo === "simulado"

    definirBotaoAtivo("btn-falha", conexao.falhaSom, "Religar sensor de som", "Simular falha do sensor de som")
    definirBotaoAtivo("btn-conexao", !conexao.ativa, "Restabelecer conexão", "Simular perda de conexão")
    definirBotaoAtivo("btn-pausa", conexao.pausado, "Retomar atualização", "Pausar atualização")

    // as simulações só fazem sentido com dados simulados
    document.querySelectorAll("#grupo-simulacoes button").forEach(b => {
        if (b.id === "btn-pausa") return     // pausar vale para as duas fontes
        b.disabled = !simulado
    })

    document.getElementById("texto-fonte-atual").textContent = simulado
        ? "Agora: dados simulados."
        : `Agora: ${rotuloFonte()}.`
    document.getElementById("btn-simulacao").disabled = simulado
}

// gera uma leitura na hora, se o sistema estiver recebendo dados simulados
function aplicarAgora() {
    if (fonteDados.modo === "simulado" && conexao.ativa && !conexao.pausado) gerarNovaLeitura()
    renderizarTudo()
    atualizarPainelDemo()
}

function ativarControlesDemo() {
    document.getElementById("btn-luz").addEventListener("click", () => { estadoSimulado.luminosidade = 900; aplicarAgora() })
    document.getElementById("btn-som").addEventListener("click", () => { estadoSimulado.som = 80; aplicarAgora() })
    document.getElementById("btn-falha").addEventListener("click", () => { conexao.falhaSom = !conexao.falhaSom; aplicarAgora() })
    document.getElementById("btn-conexao").addEventListener("click", () => { conexao.ativa = !conexao.ativa; aplicarAgora() })
    document.getElementById("btn-pausa").addEventListener("click", () => { conexao.pausado = !conexao.pausado; aplicarAgora() })

    document.getElementById("btn-restaurar").addEventListener("click", () => {
        Object.assign(estadoSimulado, ESTADO_INICIAL)
        conexao.ativa = true
        conexao.pausado = false
        conexao.falhaSom = false
        aplicarAgora()
    })

    // conectar ao ESP32 (Enter no campo também envia)
    const campo = document.getElementById("campo-esp32")
    campo.value = lerEnderecoSalvo().replace(/^https?:\/\//, "")

    document.getElementById("form-esp32").addEventListener("submit", async evento => {
        evento.preventDefault()
        const botao = document.getElementById("btn-conectar")
        botao.disabled = true
        mostrarMensagemConexao("Conectando...", true)
        const resultado = await conectarESP32(campo.value)
        botao.disabled = false
        mostrarMensagemConexao(resultado.mensagem, resultado.ok)
        renderizarTudo()
        atualizarPainelDemo()
    })

    document.getElementById("btn-simulacao").addEventListener("click", () => {
        usarSimulacao()
        mostrarMensagemConexao("Voltei para os dados simulados.", true)
        renderizarTudo()
        atualizarPainelDemo()
    })

    atualizarPainelDemo()
}
