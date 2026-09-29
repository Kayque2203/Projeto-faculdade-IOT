// preenche o menu lateral: resumo ao vivo do sistema e sensores planejados

function preencherMenuLateral(leitura) {
    const status = calcularStatusGeral(leitura)
    const cores = { normal: "var(--color-success)", atencao: "var(--color-warning)", critico: "var(--color-danger)" }

    inserirHTML("side-status", `<span style="color:${cores[status.nivel]}">${status.emoji} ${status.texto}</span>`)
    inserirHTML("side-atualizacao", formatarHora(leitura.dataHora).slice(0, 5))
    inserirHTML("side-alertas", alertasGerados.length)
    inserirHTML("side-registros", historicoLeituras.length)

    inserirHTML("lista-sensores-planejados", SENSORES_PLANEJADOS.map(sensor =>
        `<div class="sensor-tag">
            <span>${sensor.grandeza}</span>
            <b>${sensor.modelo}</b>
        </div>`
    ).join(""))
}
