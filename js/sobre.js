// preenche a seção "Sobre": limites, componentes previstos e origem dos dados

function preencherSobre() {
    inserirHTML("lista-limites", ORDEM_METRICAS.map(chave => `
        <div class="item-sobre">
            <b>${METRICAS[chave].rotulo}</b>
            <span>${METRICAS[chave].textoLimites}</span>
        </div>`).join("") +
        `<p class="texto-pequeno">Valores iniciais de exemplo. Ainda não podem ser alterados na tela.</p>`)

    inserirHTML("lista-sensores-planejados", COMPONENTES_PREVISTOS.map(item => `
        <div class="item-sobre linha">
            <span>${item.grandeza}</span>
            <b>${item.modelo}</b>
        </div>`).join(""))

    const textoFonte = document.getElementById("texto-fonte")
    if (textoFonte) {
        textoFonte.textContent = fonteDados.modo === "esp32"
            ? `Os valores vêm do ${rotuloFonte()}, lidos pela rede Wi-Fi a cada ${CONFIG_SIMULACAO.intervaloNovaLeituraMs / 1000} segundos. As leituras dos sensores são indicativas.`
            : "Neste momento os valores são simulados em JavaScript. Quando o ESP32 estiver montado, basta informar o endereço dele em “Conexão e demonstração” para ver leituras reais."
    }
}
