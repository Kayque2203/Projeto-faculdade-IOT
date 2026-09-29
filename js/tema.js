// controla o tema claro/escuro e o destaque da navbar ao rolar a página
// (âncoras atualizadas para as seções do novo dashboard: #dashboard,
// #monitoramento, #historico, #alertas)

function ativarNavbar() {
    const links = document.querySelectorAll("header .navbar a")
    window.addEventListener("scroll", () => {
        document.querySelector("header").classList.toggle("active", window.scrollY > 0)
        links.forEach(link => {
            const secao = document.querySelector(link.getAttribute("href"))
            if (!secao) return
            const posicao = secao.getBoundingClientRect()
            link.classList.toggle("active", posicao.top <= 100 && posicao.bottom >= 100)
        })
    })
}

function ativarAlternarTema() {
    const botao = document.querySelector(".theme-toggler")
    botao.addEventListener("click", () => {
        document.body.classList.toggle("dark-theme")
        botao.querySelectorAll("span").forEach(icone => icone.classList.toggle("active"))
    })
}
