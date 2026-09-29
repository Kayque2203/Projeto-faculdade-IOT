// preenche o painel da direita: últimos registros e limites configurados

function preencherUltimosRegistros() {
    const registros = historicoLeituras.slice().reverse().slice(0, 6)

    inserirHTML("ultimos-registros", registros.map(leitura => {
        const categoria = CATEGORIAS_QUALIDADE_AR[leitura.qualidadeArIndex]
        return `<div class="update-item">
            <b>${formatarNumero(leitura.temperatura)}°C · ${leitura.iluminacao} lux · ${leitura.ruido} dB</b>
            <span style="color:${categoria.cor};font-weight:600">Ar: ${categoria.nome}</span>
            <small>${formatarDataHora(leitura.dataHora)}</small>
        </div>`
    }).join(""))
}

function preencherLimitesConfigurados() {
    const itens = [
        { titulo: "Temperatura", faixa: `${LIMITES.temperatura.atencaoBaixa}°C – ${LIMITES.temperatura.atencaoAlta}°C ideal` },
        { titulo: "Ruído",       faixa: `Atenção ≥ ${LIMITES.ruido.atencao} dB · Crítico ≥ ${LIMITES.ruido.critico} dB` },
        { titulo: "Iluminação",  faixa: `Atenção ≤ ${LIMITES.iluminacao.atencao} lux · Crítico ≤ ${LIMITES.iluminacao.critico} lux` },
        { titulo: "Qualidade do Ar", faixa: `Boa ≤ ${LIMITES.indiceAr.boa} · Moderada ≤ ${LIMITES.indiceAr.moderada} · Atenção acima disso` }
    ]

    inserirHTML("lista-limites", itens.map(item => `
        <div class="update-item">
            <b>${item.titulo}</b>
            <small>${item.faixa}</small>
        </div>
    `).join(""))
}
