// gráfico de linha (Canvas puro, sem bibliotecas). Mostra um indicador por vez.
// Os eixos são fixos para o gráfico não exagerar pequenas variações.

let graficoSelecionado = "temperatura"
const ALTURA_GRAFICO = 260            // computador e tablet
const ALTURA_GRAFICO_PEQUENA = 220    // celular

// "#rrggbb" + transparência -> rgba(...)
function comAlpha(hex, alpha) {
    const h = hex.replace("#", "")
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function montarSeletorGrafico() {
    const caixa = document.getElementById("seletor-grafico")
    caixa.innerHTML = ORDEM_METRICAS.map(chave => `
        <button type="button" data-chave="${chave}" aria-pressed="${chave === graficoSelecionado}">
            ${icone(METRICAS[chave].icone)}<span>${METRICAS[chave].rotulo}</span>
        </button>`).join("")

    caixa.addEventListener("click", evento => {
        const botao = evento.target.closest("button[data-chave]")
        if (!botao) return
        graficoSelecionado = botao.dataset.chave
        caixa.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === botao)))
        desenharTodosGraficos()
    })
}

function desenharGraficoLinha(idCanvas, chave) {
    const canvas = document.getElementById(idCanvas)
    if (!canvas) return
    const m = METRICAS[chave]

    // tamanho: largura do painel (sem o padding) e densidade de pixels da tela
    const caixa = canvas.parentElement
    const estilo = getComputedStyle(caixa)
    const largura = Math.max(240, caixa.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight))
    // altura fixa em pixels de tela. NÃO ler do atributo "height" do canvas: ele é reescrito abaixo
    // (altura x densidade de pixels) e, lido de novo, faria o gráfico crescer a cada atualização.
    const altura = largura < 520 ? ALTURA_GRAFICO_PEQUENA : ALTURA_GRAFICO
    const dpr = window.devicePixelRatio || 1
    canvas.style.width = largura + "px"
    canvas.style.height = altura + "px"
    canvas.width = Math.round(largura * dpr)
    canvas.height = Math.round(altura * dpr)

    const ctx = canvas.getContext("2d")
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, largura, altura)

    const corLinha = corCSS("--color-primary")
    const corTexto = corCSS("--color-dark-varient")
    const corGrade = corCSS("--cor-borda")
    const corAtencao = corCSS("--color-warning")
    const corElevada = corCSS("--color-danger")
    const corForte = corCSS("--color-dark")
    const fonte = "Inter, Arial, sans-serif"

    const margem = { topo: 34, direita: 18, base: 32, esquerda: 48 }
    const areaLargura = largura - margem.esquerda - margem.direita
    const areaAltura = altura - margem.topo - margem.base
    const minimo = m.eixoMin, maximo = m.eixoMax
    const baseY = margem.topo + areaAltura

    const pontos = historicoLeituras.map(l => ({ valor: l[chave], dataHora: l.dataHora }))
    const escalaX = i => margem.esquerda + (i / Math.max(pontos.length - 1, 1)) * areaLargura
    const escalaY = v => baseY - ((v - minimo) / (maximo - minimo)) * areaAltura

    // faixa confortável em azul bem claro (a mesma ideia das barras dos indicadores)
    const l = m.limites
    const confDe = l.atencaoMin != null ? l.atencaoMin : minimo
    ctx.fillStyle = comAlpha(corLinha, 0.08)
    ctx.fillRect(margem.esquerda, escalaY(l.atencaoMax), areaLargura, escalaY(confDe) - escalaY(l.atencaoMax))

    // grade e números do eixo Y
    ctx.font = `12px ${fonte}`
    ctx.textAlign = "right"
    for (let i = 0; i <= 4; i++) {
        const valor = minimo + ((maximo - minimo) * i) / 4
        const y = escalaY(valor)
        ctx.strokeStyle = comAlpha(corGrade, 0.7)
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(margem.esquerda, y); ctx.lineTo(margem.esquerda + areaLargura, y); ctx.stroke()
        ctx.fillStyle = corTexto
        ctx.fillText(String(Math.round(valor)), margem.esquerda - 8, y + 4)
    }

    // linhas dos limites (tracejadas e com texto)
    const referencias = []
    if (l.atencaoMax != null) referencias.push({ valor: l.atencaoMax, cor: corAtencao, rotulo: "Atenção", y: -5 })
    if (l.elevadaMax != null) referencias.push({ valor: l.elevadaMax, cor: corElevada, rotulo: "Atenção elevada", y: -5 })
    if (l.atencaoMin != null) referencias.push({ valor: l.atencaoMin, cor: corAtencao, rotulo: "Atenção", y: -5 })
    if (l.elevadaMin != null) referencias.push({ valor: l.elevadaMin, cor: corElevada, rotulo: "Atenção elevada", y: -5 })

    const rotulosUsados = []
    ctx.font = `600 12px ${fonte}`
    referencias.forEach(ref => {
        if (ref.valor < minimo || ref.valor > maximo) return
        const y = escalaY(ref.valor)
        ctx.setLineDash([6, 5])
        ctx.strokeStyle = ref.cor
        ctx.lineWidth = 1.6
        ctx.beginPath(); ctx.moveTo(margem.esquerda, y); ctx.lineTo(margem.esquerda + areaLargura, y); ctx.stroke()
        ctx.setLineDash([])
        const yTexto = y + ref.y
        if (rotulosUsados.some(u => Math.abs(u - yTexto) < 15)) return   // evita texto sobre texto
        rotulosUsados.push(yTexto)
        ctx.fillStyle = ref.cor
        ctx.textAlign = "left"
        ctx.fillText(ref.rotulo, margem.esquerda + 8, yTexto)
    })

    // trechos contínuos da linha (uma "Leitura indisponível" interrompe o traço)
    const trechos = []
    let atual = []
    pontos.forEach((p, i) => {
        if (p.valor === null) { if (atual.length) trechos.push(atual); atual = []; return }
        atual.push({ x: escalaX(i), y: escalaY(p.valor) })
    })
    if (atual.length) trechos.push(atual)

    // área suave sob a linha
    const degrade = ctx.createLinearGradient(0, margem.topo, 0, baseY)
    degrade.addColorStop(0, comAlpha(corLinha, 0.22))
    degrade.addColorStop(1, comAlpha(corLinha, 0.02))
    trechos.forEach(t => {
        if (t.length < 2) return
        ctx.beginPath()
        ctx.moveTo(t[0].x, baseY)
        t.forEach(pt => ctx.lineTo(pt.x, pt.y))
        ctx.lineTo(t.at(-1).x, baseY)
        ctx.closePath()
        ctx.fillStyle = degrade
        ctx.fill()
    })

    // linha
    ctx.strokeStyle = corLinha
    ctx.lineWidth = 3
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    trechos.forEach(t => {
        ctx.beginPath()
        t.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y))
        ctx.stroke()
    })

    // pontos (o último é maior e tem contorno)
    const fundoCartao = corCSS("--color-white")
    pontos.forEach((p, i) => {
        if (p.valor === null) return
        const ultimoPonto = i === pontos.length - 1
        ctx.beginPath()
        ctx.arc(escalaX(i), escalaY(p.valor), ultimoPonto ? 6 : 3, 0, Math.PI * 2)
        ctx.fillStyle = ultimoPonto ? corLinha : corLinha
        ctx.fill()
        if (ultimoPonto) { ctx.lineWidth = 3; ctx.strokeStyle = fundoCartao; ctx.stroke() }
    })

    // valor mais recente, acima do gráfico
    const ultimo = pontos.at(-1)
    ctx.font = `700 14px ${fonte}`
    ctx.textAlign = "right"
    if (ultimo.valor === null) {
        ctx.fillStyle = corElevada
        ctx.fillText("Agora: leitura indisponível", margem.esquerda + areaLargura, 18)
    } else {
        ctx.fillStyle = corForte
        const textoValor = m.categorias ? `índice ${ultimo.valor}` : formatarValor(chave, ultimo.valor)
        ctx.fillText(`Agora: ${textoValor}`, margem.esquerda + areaLargura, 18)
    }

    // eixo X: horário inicial, do meio e final
    ctx.fillStyle = corTexto
    ctx.font = `12px ${fonte}`
    ctx.textAlign = "left"
    ctx.fillText(formatarHora(pontos[0].dataHora), margem.esquerda, altura - 8)
    ctx.textAlign = "center"
    ctx.fillText(formatarHora(pontos[Math.floor(pontos.length / 2)].dataHora), margem.esquerda + areaLargura / 2, altura - 8)
    ctx.textAlign = "right"
    ctx.fillText(formatarHora(pontos.at(-1).dataHora), margem.esquerda + areaLargura, altura - 8)

    // descrição para leitores de tela
    const textoUltimo = ultimo.valor === null
        ? "leitura indisponível"
        : (m.categorias ? `${formatarValor(chave, ultimo.valor).toLowerCase()}, índice ${ultimo.valor}` : formatarValor(chave, ultimo.valor))
    canvas.setAttribute("aria-label", `Gráfico de linha de ${m.rotulo.toLowerCase()}. Último valor: ${textoUltimo}, às ${formatarHora(ultimo.dataHora)}.`)
}

function desenharTodosGraficos() {
    desenharGraficoLinha("grafico-principal", graficoSelecionado)
}
