// monta os cards principais do dashboard (qualidade do ar, temperatura,
// iluminação, ruído, data e horário) e o indicador de status geral

function preencherCardsMetricas(leitura) {
    const categoriaAr = CATEGORIAS_QUALIDADE_AR[leitura.qualidadeArIndex]
    const agora = leitura.dataHora

    const cards = [
        {
            icone: "air", cor: categoriaAr.cor,
            titulo: "Qualidade do Ar",
            valor: categoriaAr.nome,
            legenda: `Índice simulado: ${leitura.indiceAr}`
        },
        {
            icone: "thermostat", cor: "var(--color-primary)",
            titulo: "Temperatura",
            valor: `${formatarNumero(leitura.temperatura)} °C`,
            legenda: "Sensor: DHT22 (planejado)"
        },
        {
            icone: "wb_sunny", cor: "var(--color-warning)",
            titulo: "Iluminação",
            valor: `${leitura.iluminacao} lux`,
            legenda: "Sensor: LDR / BH1750 (planejado)"
        },
        {
            icone: "graphic_eq", cor: "var(--color-info)",
            titulo: "Ruído",
            valor: `${leitura.ruido} dB`,
            legenda: "Sensor: Módulo de Som (planejado)"
        },
        {
            icone: "calendar_today", cor: "var(--color-dark-varient)",
            titulo: "Data",
            valor: formatarData(agora),
            legenda: "Atualização automática"
        },
        {
            icone: "schedule", cor: "var(--color-dark-varient)",
            titulo: "Horário",
            valor: formatarHora(agora).slice(0, 5),
            legenda: "Hora local do sistema"
        }
    ]

    inserirHTML("cards-metricas", cards.map(card => `
        <div class="card-metrica" style="border-left-color:${card.cor}">
            <div class="top-card">
                <div>
                    <h3>${card.titulo}</h3>
                </div>
                <span class="material-icons-sharp" style="color:${card.cor}">${card.icone}</span>
            </div>
            <div class="valor-metrica" style="color:${card.cor}">${card.valor}</div>
            <span class="legenda-metrica">${card.legenda}</span>
        </div>
    `).join(""))
}

function atualizarStatusGeral(leitura) {
    const status = calcularStatusGeral(leitura)
    const cores = { normal: "var(--color-success)", atencao: "var(--color-warning)", critico: "var(--color-danger)" }

    inserirHTML("status-geral", `
        <span class="status-emoji">${status.emoji}</span>
        <div>
            <h3 style="color:${cores[status.nivel]}">${status.texto}</h3>
            <small class="text-muted">Sala de Aula — atualizado às ${formatarHora(leitura.dataHora).slice(0, 5)}</small>
        </div>
    `)

    document.getElementById("status-geral").style.borderLeftColor = cores[status.nivel]
}
