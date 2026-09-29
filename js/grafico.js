// desenha os gráficos de linha (Canvas puro, sem bibliotecas externas)
// um gráfico por grandeza: temperatura, qualidade do ar, iluminação e ruído

function desenharGraficoLinha(idCanvas, pontos, opcoes) {
    const canvas = document.getElementById(idCanvas)
    if (!canvas) return
    canvas.width = canvas.parentElement.clientWidth - 60
    const ctx = canvas.getContext("2d")

    const largura = canvas.width
    const altura  = canvas.height
    const margem  = { topo: 20, direita: 20, base: 34, esquerda: 44 }
    const areaLargura = largura - margem.esquerda - margem.direita
    const areaAltura  = altura  - margem.topo - margem.base

    ctx.clearRect(0, 0, largura, altura)

    const valores = pontos.map(p => p.valor)
    const minimoDados = Math.min(...valores)
    const maximoDados = Math.max(...valores)
    const minimo = opcoes.min ?? Math.floor(minimoDados - (maximoDados - minimoDados || 5) * 0.15)
    const maximo = opcoes.max ?? Math.ceil(maximoDados + (maximoDados - minimoDados || 5) * 0.15)

    const escalaX = i => margem.esquerda + (i / Math.max(pontos.length - 1, 1)) * areaLargura
    const escalaY = v => margem.topo + areaAltura - ((v - minimo) / (maximo - minimo || 1)) * areaAltura

    // eixos
    ctx.strokeStyle = "rgba(132,139,200,0.3)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(margem.esquerda, margem.topo)
    ctx.lineTo(margem.esquerda, margem.topo + areaAltura)
    ctx.lineTo(margem.esquerda + areaLargura, margem.topo + areaAltura)
    ctx.stroke()

    // linhas de referência (limites)
    ;(opcoes.referencias || []).forEach(ref => {
        if (ref.valor < minimo || ref.valor > maximo) return
        const y = escalaY(ref.valor)
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = ref.cor
        ctx.beginPath()
        ctx.moveTo(margem.esquerda, y)
        ctx.lineTo(margem.esquerda + areaLargura, y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = ref.cor
        ctx.font = "10px Poppins, sans-serif"
        ctx.textAlign = "left"
        ctx.fillText(ref.rotulo, margem.esquerda + 4, y - 4)
    })

    // rótulos do eixo Y (min/max)
    ctx.fillStyle = "#677483"
    ctx.font = "10px Poppins, sans-serif"
    ctx.textAlign = "right"
    ctx.fillText(String(maximo), margem.esquerda - 6, margem.topo + 4)
    ctx.fillText(String(minimo), margem.esquerda - 6, margem.topo + areaAltura)

    // linha de dados
    ctx.strokeStyle = opcoes.cor
    ctx.lineWidth = 2.2
    ctx.beginPath()
    pontos.forEach((ponto, i) => {
        const x = escalaX(i)
        const y = escalaY(ponto.valor)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // área preenchida sob a linha
    ctx.lineTo(escalaX(pontos.length - 1), margem.topo + areaAltura)
    ctx.lineTo(escalaX(0), margem.topo + areaAltura)
    ctx.closePath()
    ctx.fillStyle = opcoes.corArea
    ctx.fill()

    // pontos + rótulo do último valor
    pontos.forEach((ponto, i) => {
        const x = escalaX(i)
        const y = escalaY(ponto.valor)
        ctx.fillStyle = opcoes.cor
        ctx.beginPath()
        ctx.arc(x, y, i === pontos.length - 1 ? 3.5 : 2, 0, Math.PI * 2)
        ctx.fill()
    })

    const ultimo = pontos.at(-1)
    ctx.fillStyle = opcoes.cor
    ctx.font = "bold 11px Poppins, sans-serif"
    ctx.textAlign = "right"
    ctx.fillText(opcoes.formatar(ultimo.valor), margem.esquerda + areaLargura, escalaY(ultimo.valor) - 8)

    // eixo X (horários inicial / final)
    ctx.fillStyle = "#677483"
    ctx.font = "10px Poppins, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(formatarHora(pontos[0].dataHora).slice(0, 5), margem.esquerda, altura - 8)
    ctx.textAlign = "right"
    ctx.fillText(formatarHora(pontos.at(-1).dataHora).slice(0, 5), margem.esquerda + areaLargura, altura - 8)
}

function desenharTodosGraficos() {
    const pontosTemperatura = historicoLeituras.map(l => ({ valor: l.temperatura, dataHora: l.dataHora }))
    const pontosAr          = historicoLeituras.map(l => ({ valor: l.indiceAr, dataHora: l.dataHora }))
    const pontosRuido       = historicoLeituras.map(l => ({ valor: l.ruido, dataHora: l.dataHora }))
    const pontosIluminacao  = historicoLeituras.map(l => ({ valor: l.iluminacao, dataHora: l.dataHora }))

    desenharGraficoLinha("grafico-temperatura", pontosTemperatura, {
        cor: "#2E8B57", corArea: "rgba(46,139,87,0.12)",
        formatar: v => `${formatarNumero(v)}°C`,
        referencias: [
            { valor: LIMITES.temperatura.atencaoAlta, cor: "#ffbb55", rotulo: "Atenção" },
            { valor: LIMITES.temperatura.criticaAlta, cor: "#ff7782", rotulo: "Crítico" }
        ]
    })

    desenharGraficoLinha("grafico-qualidade-ar", pontosAr, {
        cor: "#7d8da1", corArea: "rgba(125,141,161,0.12)", min: 0, max: 100,
        formatar: v => `Índice ${Math.round(v)}`,
        referencias: [
            { valor: LIMITES.indiceAr.boa, cor: "#41f1b6", rotulo: "Boa" },
            { valor: LIMITES.indiceAr.moderada, cor: "#ffbb55", rotulo: "Moderada" }
        ]
    })

    desenharGraficoLinha("grafico-ruido", pontosRuido, {
        cor: "#CCAA00", corArea: "rgba(204,170,0,0.12)",
        formatar: v => `${Math.round(v)} dB`,
        referencias: [
            { valor: LIMITES.ruido.atencao, cor: "#ffbb55", rotulo: "Atenção" },
            { valor: LIMITES.ruido.critico, cor: "#ff7782", rotulo: "Crítico" }
        ]
    })

    desenharGraficoLinha("grafico-iluminacao", pontosIluminacao, {
        cor: "#ffbb55", corArea: "rgba(255,187,85,0.14)",
        formatar: v => `${Math.round(v)} lux`,
        referencias: [
            { valor: LIMITES.iluminacao.atencao, cor: "#ffbb55", rotulo: "Atenção" },
            { valor: LIMITES.iluminacao.critico, cor: "#ff7782", rotulo: "Crítico" }
        ]
    })
}
