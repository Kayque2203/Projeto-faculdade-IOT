// funções auxiliares usadas em vários lugares do sistema

function formatarData(data) {
    if (!data) return "-"
    const dia  = String(data.getDate()).padStart(2, "0")
    const mes  = String(data.getMonth() + 1).padStart(2, "0")
    const ano  = data.getFullYear()
    return `${dia}/${mes}/${ano}`
}

function formatarHora(data) {
    if (!data) return "-"
    const horas   = String(data.getHours()).padStart(2, "0")
    const minutos = String(data.getMinutes()).padStart(2, "0")
    const segundos = String(data.getSeconds()).padStart(2, "0")
    return `${horas}:${minutos}:${segundos}`
}

function formatarDataHora(data) {
    if (!data) return "-"
    return `${formatarData(data)} ${formatarHora(data).slice(0, 5)}`
}

function formatarNumero(valor, casasDecimais = 1) {
    return valor.toFixed(casasDecimais).replace(".", ",")
}

function inserirHTML(id, html) {
    const elemento = document.getElementById(id)
    if (elemento) elemento.innerHTML = html
}
