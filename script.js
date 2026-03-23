// ─── Inicialização ──────────────────────────────────────────────
// CORRIGIDO: todo o código dentro de DOMContentLoaded para garantir
// que o DOM existe antes de qualquer querySelector ou addEventListener.
document.addEventListener("DOMContentLoaded", function () {

  // ─── VLibras ──────────────────────────────────────────────────
  // CORRIGIDO: instanciado dentro do DOMContentLoaded para evitar
  // erros em conexões lentas onde o DOM ainda não está pronto.
  if (window.VLibras) {
    new window.VLibras.Widget("https://vlibras.gov.br/app");
  }

  // ─── Narração por voz ─────────────────────────────────────────
  // CORRIGIDO: verificação de suporte à API antes de qualquer uso.
  const vozSuportada = "speechSynthesis" in window;

  const legendaBox   = document.querySelector(".legenda-box");
  const textoLegenda = document.getElementById("texto-legenda");

  function falarTexto(e) {
    if (!vozSuportada) return;

    // Cancela qualquer fala em andamento antes de iniciar a nova
    window.speechSynthesis.cancel();

    const texto = e.currentTarget.innerText.trim();
    if (!texto) return;

    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = "pt-BR";

    // Exibe legenda
    textoLegenda.innerText = texto;
    legendaBox.classList.add("ativa");

    mensagem.onend = function () {
      legendaBox.classList.remove("ativa");
    };

    // Fallback: remove legenda se a síntese falhar silenciosamente
    mensagem.onerror = function () {
      legendaBox.classList.remove("ativa");
    };

    window.speechSynthesis.speak(mensagem);
  }

  // Leitura ao passar o mouse (itens do menu)
  document.querySelectorAll(".narra-texto").forEach(function (el) {
    el.addEventListener("mouseenter", falarTexto);
  });

  // Leitura ao clicar
  document.querySelectorAll(".leitura").forEach(function (el) {
    el.addEventListener("click", falarTexto);
  });

  // ─── Cursor personalizado ──────────────────────────────────────
  // CORRIGIDO: referência armazenada fora do listener para evitar
  // re-query ao DOM a cada evento de mousemove.
  const cursor = document.getElementById("cursor-personalizado");

  if (cursor) {
    document.addEventListener("mousemove", function (e) {
      // Usa transform em vez de left/top para melhor performance (evita reflow)
      cursor.style.transform =
        "translate(" + (e.clientX - 40) + "px, " + (e.clientY - 40) + "px)";
    });
  }

  // ─── Gradiente do header conforme scroll ───────────────────────
  const layers = [
    { el: document.getElementById("azul"),   threshold: 0    },
    { el: document.getElementById("verde"),  threshold: 750  },
    { el: document.getElementById("marrom"), threshold: 1850 },
  ];

  // CORRIGIDO: thresholds dinâmicos calculados pelo tamanho do documento.
  // Se o layout mudar, os valores se recalculam automaticamente.
  // Os valores fallback (750, 1850) são mantidos caso os elementos
  // de referência não existam.
  function recalcularThresholds() {
    const alturaDoc = document.documentElement.scrollHeight;
    if (alturaDoc > 1000) {
      layers[1].threshold = alturaDoc * 0.30;
      layers[2].threshold = alturaDoc * 0.65;
    }
  }

  recalcularThresholds();
  window.addEventListener("resize", recalcularThresholds);

  // CORRIGIDO: scroll com requestAnimationFrame para evitar jank e
  // gasto desnecessário de CPU (throttle nativo do browser).
  let rafAgendado = false;

  function atualizarGradiente() {
    const y = window.scrollY;
    let ativa = 0;

    layers.forEach(function (layer, i) {
      if (y >= layer.threshold) ativa = i;
    });

    layers.forEach(function (layer, i) {
      layer.el.style.opacity = i === ativa ? "1" : "0";
    });

    rafAgendado = false;
  }

  window.addEventListener("scroll", function () {
    if (!rafAgendado) {
      rafAgendado = true;
      requestAnimationFrame(atualizarGradiente);
    }
  }, { passive: true }); // passive:true melhora performance de scroll no mobile

});
