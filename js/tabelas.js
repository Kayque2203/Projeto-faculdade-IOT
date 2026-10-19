// preenche a tabela de histórico de medições e a tabela de alertas

function celulaHistorico(chave, leitura) {
    const valor = leitura[chave]
    if (valor === null) return `<td class="celula-indisponivel">Leitura indisponível</td>`
    const m = METRICAS[chave]
    const texto = m.categorias ? `${formatarValor(chave, valor)} (${valor})` : formatarValor(chave, valor)
    const nivel = nivelDe(leitura, chave)
    // marca os valores fora do limite com símbolo + texto para leitor de tela
    const marca = nivel > 0
        ? `<span class="marca nivel-${nivel}">${icone(nivel === 1 ? "triangulo" : "octogono")}<span class="so-leitor-de-tela">${NIVEIS[nivel].texto}</span></span>`
        : ""
    return `<td>${marca}${texto}</td>`
}

function preencherTabelaHistorico() {
    const linhas = historicoLeituras.slice().reverse().map(leitura => `<tr>
        <td>${formatarHora(leitura.dataHora)}</td>
        ${ORDEM_METRICAS.map(chave => celulaHistorico(chave, leitura)).join("")}
    </tr>`)

    inserirHTML("tabela-historico", linhas.join(""))
}

function preencherTabelaAlertas() {
    if (alertasGerados.length === 0) {
        inserirHTML("tabela-alertas", `<tr><td colspan="4" class="celula-vazia">Nenhum alerta por enquanto. Quando uma leitura passar do limite, ele aparece aqui.</td></tr>`)
        return
    }

    inserirHTML("tabela-alertas", alertasGerados.map(alerta => `<tr>
        <td>${alerta.mensagem}</td>
        <td>${seloNivel(alerta.nivel)}</td>
        <td>${alerta.ativo ? "<b>Ativo</b>" : `Encerrado às ${formatarHora(alerta.fim)}`}</td>
        <td>${formatarDataHora(alerta.inicio)}</td>
    </tr>`).join(""))
}
