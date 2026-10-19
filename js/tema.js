// controla o tema claro/escuro e o destaque da navegação ao rolar a página

function ativarNavbar() {
    const links = document.querySelectorAll("header .navbar a")

    function atualizarDestaque() {
        document.querySelector("header").classList.toggle("active", window.scrollY > 0)
        links.forEach(link => {
            const secao = document.querySelector(link.getAttribute("href"))
            if (!secao) return
            const posicao = secao.getBoundingClientRect()
            const ativo = posicao.top <= 120 && posicao.bottom >= 120
            link.classList.toggle("active", ativo)
            if (ativo) link.setAttribute("aria-current", "true")
            else link.removeAttribute("aria-current")
        })
    }

    window.addEventListener("scroll", atualizarDestaque, { passive: true })
}

function ativarAlternarTema() {
    const botao = document.getElementById("botao-tema")
    botao.addEventListener("click", () => {
        const escuro = document.body.classList.toggle("dark-theme")
        botao.setAttribute("aria-pressed", String(escuro))
        botao.setAttribute("aria-label", escuro ? "Usar tema claro" : "Usar tema escuro")
        desenharTodosGraficos()   // os gráficos usam as cores do tema
    })
}
