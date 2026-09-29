// preenche a tabela de histórico de medições e a tabela de alertas

function preencherTabelaHistorico() {
    const linhas = historicoLeituras.slice().reverse().map(leitura => {
        const categoria = CATEGORIAS_QUALIDADE_AR[leitura.qualidadeArIndex]
        return `<tr>
            <td>${formatarHora(leitura.dataHora).slice(0, 5)}</td>
            <td>${formatarNumero(leitura.temperatura)}°C</td>
            <td style="color:${categoria.cor};font-weight:600">${categoria.nome}</td>
            <td>${leitura.iluminacao} lux</td>
            <td>${leitura.ruido} dB</td>
        </tr>`
    })

    inserirHTML("tabela-historico", linhas.join(""))
}

function preencherTabelaAlertas() {
    const cores  = { critico: "var(--color-danger)", atencao: "var(--color-warning)" }
    const textos = { critico: "Crítico", atencao: "Atenção" }

    if (alertasGerados.length === 0) {
        inserirHTML("tabela-alertas", `<tr><td colspan="3" style="text-align:center">Nenhum alerta registrado até o momento</td></tr>`)
        return
    }

    inserirHTML("tabela-alertas", alertasGerados.map(alerta => `<tr>
        <td>${alerta.mensagem}</td>
        <td>${formatarDataHora(alerta.dataHora)}</td>
        <td style="color:${cores[alerta.status]};font-weight:600">${textos[alerta.status]}</td>
    </tr>`).join(""))
}
