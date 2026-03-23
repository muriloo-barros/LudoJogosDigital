new window.VLibras.Widget('https://vlibras.gov.br/app');

    // função que faz o navegador falar
    function falarTexto(e) {

    window.speechSynthesis.cancel();

    const texto = e.target.innerText;

    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = 'pt-BR';

    // legenda
    const legendaBox = document.querySelector(".legenda-box");
    const textoLegenda = document.getElementById("texto-legenda");

    textoLegenda.innerText = texto;
    legendaBox.classList.add("ativa");

    mensagem.onend = function(){
        legendaBox.classList.remove("ativa");
    }

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

    window.addEventListener("DOMContentLoaded", function(){

    const cursor = document.getElementById("cursor-personalizado");

    document.addEventListener("mousemove", function(e){

        cursor.style.left = (e.clientX - 40) + "px";
        cursor.style.top = (e.clientY - 40) + "px";

    });

});

// muda a cor da header conforme o scroll

const layers = [
  { el: document.getElementById('azul'),  threshold: 0   },
  { el: document.getElementById('verde'), threshold: 750  },
  { el: document.getElementById('marrom'), threshold: 1850  },
];

window.addEventListener('scroll', () => {
  const y = window.scrollY;

  // Encontra qual camada está ativa
  let active = 0;
  layers.forEach((l, i) => { if (y >= l.threshold) active = i; });

  // Mostra só a ativa, esconde as outras
  layers.forEach((l, i) => {
    l.el.style.opacity = i === active ? '1' : '0';
  });
});