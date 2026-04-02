document.addEventListener("DOMContentLoaded", function () {

  // ─── VLibras ──────────────────────────────────────────────────
  if (window.VLibras) {
    new window.VLibras.Widget("https://vlibras.gov.br/app");
  }

  // ─── Narração por voz ─────────────────────────────────────────
  const vozSuportada = "speechSynthesis" in window;

  const legendaBox   = document.querySelector(".legenda-box");
  const textoLegenda = document.getElementById("texto-legenda");

  // Estado das configurações de acessibilidade
  const config = {
    voz:     true,
    legenda: true,
    vel:     1,
  };

  // ─── Função Fila / Ler Texto ─────────────────────────────────────────

  let fila = [];
  let falando = false;

  function processarFila() {
    if (falando || fila.length === 0) return;

    falando = true;
    const { texto } = fila.shift();

    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = "pt-BR";
    mensagem.rate = config.vel;

    if (config.legenda && legendaBox && textoLegenda) {
      textoLegenda.innerText = texto;
      legendaBox.classList.add("ativa");
    }

    mensagem.onend = function () {
      if (legendaBox) legendaBox.classList.remove("ativa");
      falando = false;
      processarFila();
    };

    mensagem.onerror = function () {
      if (legendaBox) legendaBox.classList.remove("ativa");
      falando = false;
      processarFila();
    };

    window.speechSynthesis.speak(mensagem);
  }

  function falarTexto(e) {
    if (!vozSuportada || !config.voz) return;

    const texto = e.currentTarget.innerText.trim();
    if (!texto) return;

    fila.push({ texto });
    processarFila();
  }

  // ─── Passarinho do header ──────────────────────────────────────
  const passarinho = document.getElementById("passarinho");
  const linksNav   = document.querySelectorAll(".nav-list a");
  const navList    = document.querySelector(".nav-list");
  let timeoutSumir = null;
 
  function moverPassarinho(link) {
    if (document.body.classList.contains("sem-animacoes")) return;
    const rect    = link.getBoundingClientRect();
    const navRect = document.querySelector(".nav").getBoundingClientRect();
    const esquerda = rect.left - navRect.left + rect.width / 2 - 30;
 
    clearTimeout(timeoutSumir);
 
    if (passarinho.classList.contains("visivel")) {
      passarinho.classList.add("pousando");
      setTimeout(() => passarinho.classList.remove("pousando"), 300);
    }
 
    passarinho.style.left = esquerda + "px";
    passarinho.classList.add("visivel");
  }
 
  function esconderPassarinho() {
    timeoutSumir = setTimeout(() => {
      passarinho.classList.remove("visivel");
    }, 400);
  }
 
  // mouseenter em cada link move o passarinho
  linksNav.forEach(function (link) {
    link.addEventListener("mouseenter", function () {
      clearTimeout(timeoutSumir); // cancela qualquer sumiço pendente
      moverPassarinho(this);
    });
  });
 
  // só o nav-list controla o sumiço — evita bug entre links
  navList.addEventListener("mouseleave", esconderPassarinho);
  navList.addEventListener("mouseenter", function () {
    clearTimeout(timeoutSumir);
  });
 
  document.querySelector(".nav-list").addEventListener("mouseleave", esconderPassarinho);

  // Leitura ao passar o mouse (menu)
  document.querySelectorAll(".narra-texto").forEach(function (el) {
    el.addEventListener("mouseenter", falarTexto);
  });

  // Leitura ao clicar
  document.querySelectorAll(".leitura").forEach(function (el) {
    el.addEventListener("click", falarTexto);
  });

  // ─── Cursor personalizado ──────────────────────────────────────
  // Usa left/top (igual ao original) — transform causava desalinhamento
  const cursor = document.getElementById("cursor-personalizado");

  if (cursor) {
    document.addEventListener("mousemove", function (e) {
      cursor.style.left = (e.clientX - 40) + "px";
      cursor.style.top  = (e.clientY - 40) + "px";
    });
  }

  // ─── Gradiente do header conforme scroll ───────────────────────
  const layers = [
    { el: document.getElementById("azul"),   threshold: 0    },
    { el: document.getElementById("verde"),  threshold: 750  },
    { el: document.getElementById("marrom"), threshold: 1850 },   
  ];

  // Thresholds dinâmicos — recalcula se o layout mudar
  function recalcularThresholds() {
    const alturaDoc = document.documentElement.scrollHeight;
    if (alturaDoc > 1000) {
      layers[1].threshold = alturaDoc * 0.20;
      layers[2].threshold = alturaDoc * 0.50;
    }
  }

  recalcularThresholds();
  window.addEventListener("resize", recalcularThresholds);

  // Scroll com requestAnimationFrame para não travar a página
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
  }, { passive: true });


  // ══════════════════════════════════════════════════════════════
  // ─── PAINEL DE ACESSIBILIDADE ─────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  const btnAbrir  = document.getElementById("btnAcessibilidade");
  const btnFechar = document.getElementById("btnFechar");
  const sidebar   = document.getElementById("sidebarAcessibilidade");
  const overlay   = document.getElementById("sbOverlay");

  function abrirSidebar() {
    sidebar.classList.add("aberta");
    sidebar.setAttribute("aria-hidden", "false");
    overlay.classList.add("ativo");
    btnFechar.focus();
  }

  function fecharSidebar() {
    sidebar.classList.remove("aberta");
    sidebar.setAttribute("aria-hidden", "true");
    overlay.classList.remove("ativo");
    btnAbrir.focus();
  }

  btnAbrir.addEventListener("click", abrirSidebar);
  btnFechar.addEventListener("click", fecharSidebar);
  overlay.addEventListener("click", fecharSidebar);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sidebar.classList.contains("aberta")) {
      fecharSidebar();
    }
  });

  // ─── Toggle: Narração por voz ──────────────────────────────────
  document.getElementById("togVoz").addEventListener("change", function () {
    config.voz = this.checked;
    if (!this.checked) {
      window.speechSynthesis.cancel();
      fila = [];
      falando = false;
      if (legendaBox) legendaBox.classList.remove("ativa");
    }
    document.getElementById("rowVelocidade").style.opacity = this.checked ? "1" : "0.4";
    document.getElementById("rowVelocidade").style.pointerEvents = this.checked ? "all" : "none";
  });

  // ─── Toggle: Legendas ─────────────────────────────────────────
  document.getElementById("togLegenda").addEventListener("change", function () {
    config.legenda = this.checked;
    if (!this.checked && legendaBox) legendaBox.classList.remove("ativa");
  });

  // ─── Botões: Velocidade da narração ───────────────────────────
  document.querySelectorAll("[data-vel]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-vel]").forEach(b => b.classList.remove("ativo"));
      this.classList.add("ativo");
      config.vel = parseFloat(this.dataset.vel);
    });
  });

  // ─── Toggle: Animações ────────────────────────────────────────
  document.getElementById("togAnim").addEventListener("change", function () {
    document.body.classList.toggle("sem-animacoes", !this.checked);
    if (!this.checked) passarinho.classList.remove("visivel");
  });

  // ─── Toggle: Alto contraste ───────────────────────────────────
  document.getElementById("togContraste").addEventListener("change", function () {
    document.body.classList.toggle("alto-contraste", this.checked);
  });

  // ─── Botões: Tamanho da fonte ─────────────────────────────────
  document.querySelectorAll("[data-fonte]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-fonte]").forEach(b => b.classList.remove("ativo"));
      this.classList.add("ativo");
      document.body.classList.remove("fonte-pequena", "fonte-normal", "fonte-grande");
      document.body.classList.add("fonte-" + this.dataset.fonte);
    });
  });

  // ─── Toggle: Cursor personalizado ─────────────────────────────
  document.getElementById("togCursor").addEventListener("change", function () {
    document.body.classList.toggle("cursor-padrao", !this.checked);
  });

});