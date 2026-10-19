// funções auxiliares usadas em vários lugares do sistema

function formatarData(data) {
    if (!data) return "-"
    const dia = String(data.getDate()).padStart(2, "0")
    const mes = String(data.getMonth() + 1).padStart(2, "0")
    return `${dia}/${mes}/${data.getFullYear()}`
}

function formatarHora(data, comSegundos = false) {
    if (!data) return "-"
    const horas = String(data.getHours()).padStart(2, "0")
    const minutos = String(data.getMinutes()).padStart(2, "0")
    const segundos = String(data.getSeconds()).padStart(2, "0")
    return comSegundos ? `${horas}:${minutos}:${segundos}` : `${horas}:${minutos}`
}

function formatarDataHora(data) {
    if (!data) return "-"
    return `${formatarData(data)} ${formatarHora(data)}`
}

function formatarNumero(valor, casasDecimais = 1) {
    return valor.toFixed(casasDecimais).replace(".", ",")
}

function inserirHTML(id, html) {
    const elemento = document.getElementById(id)
    if (elemento) elemento.innerHTML = html
}

// ── NÍVEIS DE ATENÇÃO ──
// cada nível tem texto + símbolo de forma diferente (nunca depende só de cor)
const NIVEIS = {
    0:    { classe: "nivel-0", icone: "check",     texto: "Dentro do limite" },
    1:    { classe: "nivel-1", icone: "triangulo", texto: "Atenção" },
    2:    { classe: "nivel-2", icone: "octogono",  texto: "Atenção elevada" },
    sem:  { classe: "nivel-sem", icone: "semsinal", texto: "Sem leitura" },
    velho:{ classe: "nivel-1", icone: "semsinal", texto: "Dados desatualizados" }
}

function seloNivel(chave, textoPersonalizado) {
    const nivel = NIVEIS[chave] || NIVEIS.sem
    return `<span class="selo ${nivel.classe}">${icone(nivel.icone)}<span>${textoPersonalizado || nivel.texto}</span></span>`
}

// lê uma variável CSS (usada pelos gráficos para respeitar o tema claro/escuro)
function corCSS(nome) {
    return getComputedStyle(document.body).getPropertyValue(nome).trim()
}
