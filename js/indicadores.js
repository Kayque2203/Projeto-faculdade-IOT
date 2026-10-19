// monta o painel principal: frase sobre a sala (hero), alertas ativos e os cartões dos indicadores

// separa o valor em partes para destacar o número e deixar a unidade menor
function partesValor(chave, valor) {
    const m = METRICAS[chave]
    if (valor === null || valor === undefined) return { principal: "Leitura indisponível", unidade: "", extra: "" }
    if (m.categorias) {
        return { principal: m.categorias[classificar(chave, valor).nivel], unidade: "", extra: `índice ${valor} de 100` }
    }
    const numero = m.casas > 0 ? formatarNumero(valor, m.casas) : String(valor)
    return { principal: numero, unidade: m.unidade, extra: "" }
}

// ── BARRA DE FAIXA ──
// mostra onde o valor está entre a zona confortável (lisa) e os limites (listrados)
function zonasDa(chave) {
    const m = METRICAS[chave], l = m.limites
    const zonas = []
    let inicio = m.eixoMin
    const adicionar = (fim, nivel) => {
        if (fim > inicio) zonas.push({ de: inicio, ate: fim, nivel })
        inicio = Math.max(inicio, fim)
    }
    if (l.elevadaMin != null) adicionar(l.elevadaMin, 2)
    if (l.atencaoMin != null) adicionar(l.atencaoMin, 1)
    adicionar(l.atencaoMax, 0)
    adicionar(l.elevadaMax, 1)
    adicionar(m.eixoMax, 2)
    return zonas
}

function barraFaixa(chave, valor, desatualizado) {
    const m = METRICAS[chave]
    const total = m.eixoMax - m.eixoMin
    const zonas = zonasDa(chave).map(z =>
        `<span class="zona z${z.nivel}" style="flex:${((z.ate - z.de) / total) * 100} 1 0"></span>`).join("")

    let marcador = ""
    if (valor !== null && valor !== undefined) {
        const pct = Math.min(98, Math.max(2, ((valor - m.eixoMin) / total) * 100))
        marcador = `<span class="marcador ${desatualizado ? "apagado" : ""}" style="left:${pct}%"></span>`
    }

    const descricao = valor === null || valor === undefined
        ? `${m.rotulo}: leitura indisponível.`
        : `${m.rotulo}: ${m.categorias ? m.categorias[classificar(chave, valor).nivel].toLowerCase() + ", índice " + valor : formatarValor(chave, valor)}. ${m.faixa}.`

    return `
        <div class="faixa ${valor === null ? "sem-leitura" : ""}" role="img" aria-label="${descricao}">
            <div class="trilho">${zonas}</div>
            ${marcador}
            <div class="faixa-eixo"><span>${m.eixoMin}</span><span>${m.eixoMax}</span></div>
        </div>`
}

function cartaoIndicador(chave, leitura, velho) {
    const m = METRICAS[chave]
    const valor = leitura[chave]
    const nivel = nivelDe(leitura, chave)
    const indisponivel = nivel === null
    const classeNivel = indisponivel ? "nivel-sem" : NIVEIS[nivel].classe
    const partes = partesValor(chave, valor)
    const seloHtml = velho ? seloNivel("velho", "Pode estar desatualizado") : seloNivel(indisponivel ? "sem" : nivel)

    return `
    <article class="indicador ${classeNivel} ${velho ? "desatualizado" : ""}">
        <div class="indicador-topo">
            <span class="indicador-icone">${icone(m.icone)}</span>
            <h3>${m.rotulo}</h3>
        </div>
        <p class="indicador-valor ${indisponivel ? "indisponivel" : ""} ${m.categorias ? "categoria" : ""}">
            <span class="numero">${partes.principal}</span>
            ${partes.unidade ? `<span class="unidade">${partes.unidade}</span>` : ""}
        </p>
        ${partes.extra ? `<p class="indicador-extra">${partes.extra}</p>` : ""}
        ${seloHtml}
        ${barraFaixa(chave, valor, velho)}
        <p class="indicador-faixa">${m.faixa}${m.categorias ? " · leitura indicativa" : ""}</p>
    </article>`
}

function preencherCardsMetricas(leitura) {
    const velho = leituraDesatualizada()
    inserirHTML("cards-metricas", ORDEM_METRICAS.map(chave => cartaoIndicador(chave, leitura, velho)).join(""))
}

// ── HERO: a situação da sala em uma frase ──
const ICONE_STATUS = { 0: "check", 1: "triangulo", 2: "octogono", velho: "semsinal", sem: "semsinal" }

function classeStatus(nivel) {
    if (nivel === "velho") return "nivel-1"
    if (nivel === "sem") return "nivel-sem"
    return NIVEIS[nivel].classe
}

function atualizarStatusGeral(leitura) {
    const status = calcularStatusGeral(leitura)
    const estado = obterEstadoSistema()
    const caixa = document.getElementById("status-geral")

    caixa.className = `hero ${classeStatus(status.nivel)}`
    caixa.innerHTML = `
        <div class="hero-principal">
            <div class="hero-simbolo">${icone(ICONE_STATUS[status.nivel])}</div>
            <div>
                <p class="hero-sala">Sala sensorial</p>
                <h2 class="hero-titulo">${status.texto}</h2>
                <p class="hero-detalhe">${status.detalhe}</p>
            </div>
        </div>
        <div class="hero-lateral">
            <div class="hero-hora">
                <span class="hero-hora-valor">${formatarHora(leitura.dataHora, true)}</span>
                <span class="hero-hora-rotulo">Última atualização</span>
            </div>
            <div class="hero-chips">
                ${seloNivel(estado.nivel, estado.texto)}
                <span class="chip-fonte">${icone(fonteDados.modo === "esp32" ? "plug" : "sensors")}<span>${rotuloFonte()}</span></span>
            </div>
        </div>`

    preencherAlertasAtivos()
    return status
}

function preencherAlertasAtivos() {
    const ativos = alertasGerados.filter(a => a.ativo)
    const caixa = document.getElementById("alertas-ativos")
    if (ativos.length === 0) { caixa.innerHTML = ""; caixa.hidden = true; return }

    caixa.hidden = false
    caixa.innerHTML = `
        <h2 class="titulo-secao">${ativos.length === 1 ? "1 alerta ativo" : ativos.length + " alertas ativos"}</h2>
        <ul>${ativos.map(a => `<li>${seloNivel(a.nivel)}<span>${a.mensagem}</span><small>desde ${formatarHora(a.inicio)}</small></li>`).join("")}</ul>`
}
