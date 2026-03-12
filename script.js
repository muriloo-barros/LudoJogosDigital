new window.VLibras.Widget('https://vlibras.gov.br/app');

    // função que faz o navegador falar
    function falarTexto(e){

        // cancela falas anteriores
        window.speechSynthesis.cancel();

        // pega o texto
        const texto = e.target.innerText;

        // cria mensagem
        const mensagem = new SpeechSynthesisUtterance(texto);

        // idioma
        mensagem.lang = "pt-BR";

        // falar
        window.speechSynthesis.speak(mensagem);
    }

    // leitura ao passar o mouse (menu)
    const elementosHover = document.querySelectorAll(".narra-texto");

    elementosHover.forEach(el => {
        el.addEventListener("mouseenter", falarTexto);
    });

    // leitura ao clicar
    const elementosClick = document.querySelectorAll(".leitura");

    elementosClick.forEach(el => {
        el.addEventListener("click", falarTexto);
    });
