// ══════════════════════════════════════════════════════════════════
// ORGANIZADOR DE EMOÇÕES — dados das rodadas
//
// Cada emoção tem: nome, emoji (placeholder) e img (opcional).
// Para trocar o emoji por uma imagem desenhada no futuro, basta
// preencher o campo "img" com o caminho do arquivo (ex: "imgs/raiva.png").
// Se "img" estiver preenchido, o jogo usa a imagem; senão, usa o emoji.
// ══════════════════════════════════════════════════════════════════
const bancoDeRodadas = [
    {
        emocoes: [
            { nome: "Tristeza",   emoji: "😢", img: "imgs/emoji_triste.png" },
            { nome: "Raiva",      emoji: "😠", img: "imgs/emoji_raiva.png" },
            { nome: "Felicidade", emoji: "😄", img: "imgs/emoji_feliz.png" },
            { nome: "Amor",       emoji: "🥰", img: "imgs/emoji_amor.png" }
        ]
    },
    {
        emocoes: [
            { nome: "Medo",       emoji: "😨", img: "imgs/emoji_medo.png" },
            { nome: "Surpresa",   emoji: "😲", img: "imgs/emoji_animacao.png" },
            { nome: "Nojo",       emoji: "🤢", img: "imgs/emoji_nojo.png" },
            { nome: "Calma",      emoji: "😌", img: "imgs/emoji_orgulho.png" }
        ]
    },
    {
        emocoes: [
            { nome: "Vergonha",   emoji: "😳", img: "imgs/emoji_vergonha.png" },
            { nome: "Orgulho",    emoji: "😌", img: "imgs/emoji_orgulho.png" },
            { nome: "Cansaço",    emoji: "😴", img: "imgs/emoji_cansaco.png" },
            { nome: "Animação",   emoji: "🤩", img: "imgs/emoji_animacao.png" }
        ]
    }
];

const MAX_RODADAS = bancoDeRodadas.length;
const somAcerto = new Audio("sons/correto.mp3");
const somErro = new Audio("sons/errado.mp3");
const somFanfarra = new Audio("sons/parabens.mp3");

let rodadaAtual = 1;
let emocoesDaRodada = [];   // array embaralhado das 4 emoções da rodada atual
let alvosDaRodada = [];     // mesmas 4 emoções, em outra ordem, para os alvos
let acertosNaRodada = 0;    // quantas emoções já foram encaixadas certo nesta rodada

// Peça atualmente "selecionada" via teclado (modo de encaixe sem
// arrastar). Null quando nenhuma peça está selecionada.
let pecaSelecionadaTeclado = null;

// Elementos de tela
const btnStart = document.getElementById("btn-start");
const btnRestart = document.getElementById("btn-restart");
const txtInstrucao = document.getElementById("instrucao");
const hudRodada = document.getElementById("hud-rodada");
const hudRestantes = document.getElementById("hud-restantes");
const msgFinal = document.getElementById("mensagem-final");
const bancoEmocoesEl = document.getElementById("banco-emocoes");

// ─── Narração (reaproveita a config de voz/velocidade do painel) ───
//
// Fix de bug: antes, se a criança arrastasse/errasse rápido demais,
// vários "onended"/setTimeout antigos ainda pendentes podiam disparar
// por cima de uma narração mais nova, fazendo a voz gaguejar ou falar
// a frase errada. Agora cada chamada de falar() gera um "token" único;
// qualquer callback agendado antes só executa se ainda for o token mais
// recente. Callbacks de fala desatualizados são descartados.
let tokenFalaAtual = 0;

function falar(texto, aoTerminar) {
    tokenFalaAtual++;
    const meuToken = tokenFalaAtual;

    const cfg = window.acessibilidadeConfig;
    txtInstrucao.textContent = texto;

    const chamarSeAindaValido = () => {
        if (meuToken === tokenFalaAtual && typeof aoTerminar === "function") {
            aoTerminar();
        }
    };

    if (cfg && cfg.voz === false) {
        chamarSeAindaValido();
        return;
    }

    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = (cfg && cfg.vel) ? cfg.vel : 1.1;

    fala.onend = chamarSeAindaValido;
    fala.onerror = chamarSeAindaValido;

    window.speechSynthesis.speak(fala);
}

function vibrarDispositivo(padrao) {
    if ("vibrate" in navigator) {
        navigator.vibrate(padrao);
    }
}

// Embaralha uma cópia do array (Fisher-Yates), sem alterar o original
function embaralhar(array) {
    const copia = array.slice();
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

// ══════════════════════════════════════════════════════════════════
// NAVEGAÇÃO POR SETAS DENTRO DO TABULEIRO
//
// O Tab "normal" do navegador foi retirado de dentro do tabuleiro
// (peças e caixas usam tabindex="-1", exceto a primeira posição, que
// continua tabindex="0" para servir de porta de entrada vinda do
// resto da página). Uma vez com o foco dentro do tabuleiro, as setas
// do teclado (← → ↑ ↓) movem entre as 8 posições — as 4 peças do
// banco primeiro, depois as 4 caixas — como uma sequência única.
// Enter/Espaço continuam com o mesmo comportamento de seleção/encaixe
// já implementado. O Tab volta a funcionar normalmente fora do
// tabuleiro (header, botão Jogar, etc.).
// ══════════════════════════════════════════════════════════════════
function elementosDoTabuleiro() {
    // Ordem fixa: peças do banco (na ordem em que aparecem no DOM) e
    // depois as 4 caixas-alvo (alvo-0 a alvo-3). Reconstruída a cada
    // chamada porque as peças mudam de rodada para rodada.
    const pecas = Array.from(bancoEmocoesEl.querySelectorAll(".peca-emocao"));
    const alvos = [0, 1, 2, 3].map(i => document.getElementById(`alvo-${i}`));
    return [...pecas, ...alvos];
}

function moverFocoTabuleiro(elementoAtual, direcao) {
    const elementos = elementosDoTabuleiro();
    const indiceAtual = elementos.indexOf(elementoAtual);
    if (indiceAtual === -1) return;

    let proximoIndice = indiceAtual + direcao;
    // Não circula: parar no primeiro/último elemento em vez de dar a
    // volta, para não confundir quem está navegando sequencialmente
    if (proximoIndice < 0) proximoIndice = 0;
    if (proximoIndice >= elementos.length) proximoIndice = elementos.length - 1;

    elementos[proximoIndice].focus();
}

// Aplica tabindex="-1" em todos os elementos do tabuleiro, exceto o
// primeiro, que fica tabindex="0" como porta de entrada do Tab vindo
// do resto da página. Chamada sempre que o tabuleiro é remontado
// (nova rodada), já que a lista de peças muda a cada vez.
function atualizarTabindexTabuleiro() {
    const elementos = elementosDoTabuleiro();
    elementos.forEach((el, index) => {
        el.setAttribute("tabindex", index === 0 ? "0" : "-1");
    });
}

// Trata as teclas de seta em qualquer elemento do tabuleiro (peça ou
// alvo), reaproveitado pelos dois listeners de keydown existentes.
function tratarSetaNoTabuleiro(evento, elementoAtual) {
    let direcao = null;
    if (evento.code === "ArrowRight" || evento.code === "ArrowDown") direcao = 1;
    if (evento.code === "ArrowLeft" || evento.code === "ArrowUp") direcao = -1;

    if (direcao === null) return false;

    evento.preventDefault();
    moverFocoTabuleiro(elementoAtual, direcao);
    return true;
}

// Monta a frase "Aperte... arraste a tristeza, a raiva, a felicidade e o amor"
function montarTextoApresentacao() {
    const nomes = emocoesDaRodada.map(e => e.nome);
    let texto = "Nesta rodada você vai organizar: " + nomes[0];
    for (let i = 1; i < nomes.length; i++) {
        const conectivo = (i === nomes.length - 1) ? " e " : ", ";
        texto += `${conectivo}${nomes[i]}`;
    }
    texto += ". Arraste cada emoção até a caixa com o nome certo!";
    return texto;
}

// ─── Início do jogo ─────────────────────────────────────────────
btnStart.addEventListener("click", () => {
    document.getElementById("tela-inicio").classList.add("escondido");
    document.getElementById("tela-jogo").classList.remove("escondido");
    rodadaAtual = 1;
    vibrarDispositivo(100);
    iniciarRodada();
});

btnRestart.addEventListener("click", () => {
    document.getElementById("tela-final").classList.add("escondido");
    document.getElementById("tela-jogo").classList.remove("escondido");
    rodadaAtual = 1;
    iniciarRodada();
});

function iniciarRodada() {
    const dadosRodada = bancoDeRodadas[rodadaAtual - 1];
    emocoesDaRodada = embaralhar(dadosRodada.emocoes);
    alvosDaRodada = embaralhar(dadosRodada.emocoes);
    acertosNaRodada = 0;

    hudRodada.textContent = `RODADA: ${rodadaAtual}/${MAX_RODADAS}`;
    hudRestantes.textContent = `FALTAM: ${emocoesDaRodada.length}`;

    montarAlvos();
    montarBanco();

    // Narração: 1) apresentação da rodada  2) instrução de arrastar.
    // Cada etapa só começa quando a anterior termina, evitando atropelo.
    falar(`Rodada ${rodadaAtual} de ${MAX_RODADAS}.`, () => {
        falar(montarTextoApresentacao());
    });
}

// Cria as 4 caixas-alvo com o nome de cada emoção (em ordem embaralhada)
function montarAlvos() {
    alvosDaRodada.forEach((emocao, index) => {
        const alvoEl = document.getElementById(`alvo-${index}`);

        alvoEl.dataset.nomeEsperado = emocao.nome;
        alvoEl.classList.remove("preenchido", "arrastando-sobre", "erro-shake");
        alvoEl.innerHTML = `<span class="alvo-nome">${emocao.nome.toUpperCase()}</span>`;
        alvoEl.setAttribute("aria-label", `Caixa: ${emocao.nome}. Pressione Enter para soltar a emoção selecionada aqui.`);
    });
}

// Registra o listener de teclado dos alvos uma única vez (os elementos
// .alvo são fixos no HTML e reaproveitados a cada rodada — só o
// conteúdo interno muda — então isso não pode ser refeito em
// montarAlvos(), ou os listeners duplicariam a cada rodada nova)
document.querySelectorAll(".alvo").forEach((alvoEl) => {
    ativarSelecaoPorTeclado(alvoEl);
});

// Cria as 4 peças arrastáveis no banco fixo
function montarBanco() {
    bancoEmocoesEl.innerHTML = "";

    // Limpeza defensiva: se por algum motivo uma peça ainda estava
    // "selecionada" via teclado quando o banco é remontado (ex: nova
    // rodada), essa referência ficaria apontando para um elemento que
    // não existe mais no DOM. Zera para evitar estado inconsistente.
    pecaSelecionadaTeclado = null;

    emocoesDaRodada.forEach((emocao) => {
        const peca = document.createElement("div");
        peca.className = "peca-emocao";
        peca.setAttribute("role", "button");
        peca.setAttribute("tabindex", "-1");
        peca.dataset.nome = emocao.nome;
        peca.setAttribute("aria-label", `Emoção: ${emocao.nome}. Use as setas do teclado para navegar e Enter para selecionar.`);

        // Estrutura pronta para imagem: se "img" tiver um caminho, usa <img>;
        // senão, cai no emoji. Basta preencher o campo img no futuro.
        if (emocao.img) {
            const imgTag = document.createElement("img");
            imgTag.src = emocao.img;
            imgTag.alt = emocao.nome;
            peca.appendChild(imgTag);
        } else {
            peca.textContent = emocao.emoji;
        }

        ativarArraste(peca);
        bancoEmocoesEl.appendChild(peca);
    });

    // Ajusta o tabindex de todo o tabuleiro (peças + caixas) agora que
    // as peças novas desta rodada já existem no DOM
    atualizarTabindexTabuleiro();
}

// ══════════════════════════════════════════════════════════════════
// DRAG AND DROP (mouse + touch, usando Pointer Events)
// ══════════════════════════════════════════════════════════════════
function ativarArraste(peca) {
    let arrastando = false;
    let offsetX = 0;
    let offsetY = 0;
    let origemPai = null;
    let origemNextSibling = null;

    peca.addEventListener("pointerdown", (evento) => {
        if (peca.classList.contains("desaparecendo")) return;

        // Se havia uma peça selecionada via teclado (mesma ou outra) e o
        // jogador começou a arrastar com mouse/touch, cancela a seleção
        // de teclado para não deixar os dois modos misturados.
        if (pecaSelecionadaTeclado) {
            pecaSelecionadaTeclado.classList.remove("selecionada-teclado");
            pecaSelecionadaTeclado = null;
        }

        arrastando = true;
        origemPai = peca.parentElement;
        origemNextSibling = peca.nextElementSibling;

        const rect = peca.getBoundingClientRect();
        offsetX = evento.clientX - rect.left;
        offsetY = evento.clientY - rect.top;

        // Fixa a peça na posição atual antes de tirar do fluxo do banco
        peca.style.width = rect.width + "px";
        peca.style.height = rect.height + "px";
        peca.style.left = rect.left + "px";
        peca.style.top = rect.top + "px";

        document.body.appendChild(peca);
        peca.classList.add("arrastando");
        peca.setPointerCapture(evento.pointerId);

        // Narra o nome da emoção ao começar a arrastar (ajuda a criança
        // a lembrar o que está segurando)
        falar(peca.dataset.nome);
    });

    peca.addEventListener("pointermove", (evento) => {
        if (!arrastando) return;
        peca.style.left = (evento.clientX - offsetX) + "px";
        peca.style.top = (evento.clientY - offsetY) + "px";

        // Destaca visualmente o alvo que está por baixo do cursor
        const alvoSobre = detectarAlvoSobPonteiro(evento.clientX, evento.clientY);
        document.querySelectorAll(".alvo").forEach(a => a.classList.remove("arrastando-sobre"));
        if (alvoSobre) alvoSobre.classList.add("arrastando-sobre");
    });

    peca.addEventListener("pointerup", (evento) => {
        if (!arrastando) return;
        arrastando = false;
        peca.classList.remove("arrastando");
        document.querySelectorAll(".alvo").forEach(a => a.classList.remove("arrastando-sobre"));

        const alvoSobre = detectarAlvoSobPonteiro(evento.clientX, evento.clientY);

        if (alvoSobre) {
            verificarEncaixe(peca, alvoSobre, origemPai, origemNextSibling);
        } else {
            // Soltou fora de qualquer alvo: volta pro banco
            devolverAoPai(peca, origemPai, origemNextSibling);
        }
    });

    // Cancelamento (ex: perda de foco do ponteiro) também devolve a peça
    peca.addEventListener("pointercancel", () => {
        if (!arrastando) return;
        arrastando = false;
        peca.classList.remove("arrastando");
        document.querySelectorAll(".alvo").forEach(a => a.classList.remove("arrastando-sobre"));
        devolverAoPai(peca, origemPai, origemNextSibling);
    });

    // Acessibilidade por teclado: setas (← → ↑ ↓) navegam entre as 8
    // posições do tabuleiro (peças + caixas). Enter/Espaço seleciona a
    // peça (modo de encaixe sem arrastar). Pressionar Enter/Espaço de
    // novo na mesma peça cancela a seleção. Com uma peça selecionada,
    // navegue com as setas até um alvo e Enter/Espaço ali encaixa — ver
    // ativarSelecaoPorTeclado() para o lado do alvo.
    peca.addEventListener("keydown", (evento) => {
        if (tratarSetaNoTabuleiro(evento, peca)) return;

        if (evento.code === "Space" || evento.code === "Enter") {
            evento.preventDefault();
            selecionarOuCancelarPeca(peca);
        }
    });
}

// Marca/desmarca uma peça como "selecionada" para encaixe via teclado.
// Reaproveitada tanto no clique original quanto no fluxo de teclado.
function selecionarOuCancelarPeca(peca) {
    if (pecaSelecionadaTeclado === peca) {
        // Pressionou de novo na mesma peça: cancela a seleção
        peca.classList.remove("selecionada-teclado");
        pecaSelecionadaTeclado = null;
        falar(`${peca.dataset.nome} não está mais selecionada.`);
        return;
    }

    // Troca a seleção (só uma peça pode estar selecionada por vez)
    if (pecaSelecionadaTeclado) {
        pecaSelecionadaTeclado.classList.remove("selecionada-teclado");
    }

    pecaSelecionadaTeclado = peca;
    peca.classList.add("selecionada-teclado");
    falar(`${peca.dataset.nome} selecionada. Navegue até uma caixa e pressione Enter para soltar aqui, ou pressione Enter de novo aqui para cancelar.`);
}

// Dá suporte de teclado aos alvos: setas navegam pelo tabuleiro,
// Enter/Espaço num alvo com uma peça selecionada encaixa (ou erra)
// exatamente como soltar via arraste, reaproveitando a mesma
// verificarEncaixe() usada pelo mouse/touch.
function ativarSelecaoPorTeclado(alvoEl) {
    alvoEl.addEventListener("keydown", (evento) => {
        if (tratarSetaNoTabuleiro(evento, alvoEl)) return;

        if (evento.code !== "Space" && evento.code !== "Enter") return;
        evento.preventDefault();

        if (!pecaSelecionadaTeclado) {
            falar("Nenhuma emoção selecionada. Escolha uma emoção no banco primeiro.");
            return;
        }

        const peca = pecaSelecionadaTeclado;
        pecaSelecionadaTeclado = null;
        peca.classList.remove("selecionada-teclado");

        // origemPai/origemNextSibling: usados só se a peça precisar voltar
        // ao banco em caso de erro — igual ao fluxo de arraste
        const origemPai = peca.parentElement;
        const origemNextSibling = peca.nextElementSibling;

        verificarEncaixe(peca, alvoEl, origemPai, origemNextSibling);

        // Fix de acessibilidade: ao acertar, a peça é removida do DOM, e
        // ao errar ela volta pro banco — nos dois casos o navegador perde
        // a referência de foco, "teletransportando" o foco pro topo da
        // página e quebrando a navegação por teclado. Devolvemos o foco
        // para o próprio alvo (elemento fixo que nunca é removido do DOM)
        // logo em seguida, mantendo o jogador no mesmo ponto do tabuleiro.
        alvoEl.focus();
    });
}

// Descobre se as coordenadas (x, y) estão sobre algum .alvo
function detectarAlvoSobPonteiro(x, y) {
    const elementos = document.elementsFromPoint(x, y);
    return elementos.find(el => el.classList && el.classList.contains("alvo")) || null;
}

// Devolve a peça ao local original no banco (usado em soltar-fora e erro)
function devolverAoPai(peca, pai, nextSibling) {
    peca.style.position = "";
    peca.style.left = "";
    peca.style.top = "";
    peca.style.width = "";
    peca.style.height = "";

    if (nextSibling && nextSibling.parentElement === pai) {
        pai.insertBefore(peca, nextSibling);
    } else {
        pai.appendChild(peca);
    }
}

function verificarEncaixe(peca, alvoEl, origemPai, origemNextSibling) {
    const nomeEsperado = alvoEl.dataset.nomeEsperado;
    const nomeArrastado = peca.dataset.nome;

    if (alvoEl.classList.contains("preenchido")) {
        // Alvo já ocupado: trata como erro, volta pro banco
        tratarErro(peca, alvoEl, origemPai, origemNextSibling);
        return;
    }

    if (nomeArrastado === nomeEsperado) {
        tratarAcerto(peca, alvoEl);
    } else {
        tratarErro(peca, alvoEl, origemPai, origemNextSibling);
    }
}

function tratarAcerto(peca, alvoEl) {
    vibrarDispositivo([80, 50, 80]);

    // Fix de bug: mesmo problema do tratarErro — somAcerto era um único
    // Audio reaproveitado. Se a criança acertasse duas peças rápido (bem
    // possível com 4 alvos na tela), o "onended" do segundo acerto podia
    // sobrescrever o do primeiro antes de disparar, fazendo a narração da
    // próxima rodada atropelar o feedback do acerto anterior, ou pior,
    // nunca disparar. Agora cada acerto usa uma cópia independente do áudio.
    const efeitoAcerto = somAcerto.cloneNode();
    efeitoAcerto.play().catch(() => {});

    // Prepara o conteúdo a ser encaixado (imagem ou emoji) ANTES de
    // remover a peça do DOM, evitando depender do estado pós-remoção
    const conteudoEncaixado = document.createElement("div");
    conteudoEncaixado.className = "peca-encaixada";
    const imgOriginal = peca.querySelector("img");
    if (imgOriginal) {
        conteudoEncaixado.appendChild(imgOriginal.cloneNode(true));
    } else {
        conteudoEncaixado.textContent = peca.textContent;
    }

    // Agora sim remove a peça arrastada do DOM
    peca.remove();

    // Mantém a porta de entrada do Tab (tabindex="0") sempre na primeira
    // posição real do tabuleiro, já que uma peça foi removida do banco
    atualizarTabindexTabuleiro();

    alvoEl.innerHTML = "";
    alvoEl.appendChild(conteudoEncaixado);
    const nomeEl = document.createElement("span");
    nomeEl.className = "alvo-nome";
    nomeEl.textContent = alvoEl.dataset.nomeEsperado.toUpperCase();
    alvoEl.appendChild(nomeEl);
    alvoEl.classList.add("preenchido");

    acertosNaRodada++;
    const restantes = emocoesDaRodada.length - acertosNaRodada;
    hudRestantes.textContent = `FALTAM: ${restantes}`;

    let jaAvancou = false;
    const continuar = () => {
        if (jaAvancou) return;
        jaAvancou = true;

        if (restantes > 0) {
            falar(`Isso mesmo, ${alvoEl.dataset.nomeEsperado}! Continue.`);
        } else {
            avancarRodadaOuFinalizar();
        }
    };

    efeitoAcerto.onended = continuar;
    // Rede de segurança caso o evento onended não dispare
    setTimeout(continuar, 1200);
}

function tratarErro(peca, alvoEl, origemPai, origemNextSibling) {
    vibrarDispositivo([300, 100, 300]);

    // Fix de bug: somErro era um único Audio reaproveitado. Se a criança
    // errasse de novo antes dos ~900ms do erro anterior passarem, o
    // "onended" e o setTimeout do erro antigo ainda podiam disparar por
    // cima do novo, narrando o alvo errado. Agora cada erro toca uma cópia
    // independente do áudio (cloneNode), então erros em sequência nunca
    // pisam um no outro.
    const efeitoErro = somErro.cloneNode();
    efeitoErro.play().catch(() => {});

    alvoEl.classList.add("erro-shake");
    setTimeout(() => alvoEl.classList.remove("erro-shake"), 400);

    devolverAoPai(peca, origemPai, origemNextSibling);

    // Mantém a porta de entrada do Tab (tabindex="0") sempre na primeira
    // posição real do tabuleiro, já que a ordem das peças no banco pode
    // ter mudado ao devolver a peça para o lugar de origem.
    atualizarTabindexTabuleiro();

    // A narração só começa depois que o som de erro termina, para não
    // atropelar um áudio no outro. O guard local também protege caso
    // "onended" e o setTimeout de segurança disparem os dois.
    let jaFalou = false;
    const narrarErro = () => {
        if (jaFalou) return;
        jaFalou = true;
        falar(`Ops, essa não é a caixa de ${alvoEl.dataset.nomeEsperado}. Tente novamente!`);
    };

    efeitoErro.onended = narrarErro;
    setTimeout(narrarErro, 900);
}

function avancarRodadaOuFinalizar() {
    rodadaAtual++;
    if (rodadaAtual <= MAX_RODADAS) {
        falar("Muito bem! Vamos para a próxima rodada.", iniciarRodada);
    } else {
        finalizarJogo();
    }
}

function finalizarJogo() {
    document.getElementById("tela-jogo").classList.add("escondido");
    document.getElementById("tela-final").classList.remove("escondido");
    somFanfarra.play().catch(() => {});
    vibrarDispositivo([200, 100, 200, 100, 500]);

    const msgVoz = "🎉 Incrível! Você organizou todas as emoções corretamente! Parabéns, campeão das emoções!";
    msgFinal.textContent = "Você completou as 3 rodadas e organizou todas as emoções! ⭐";

    setTimeout(() => falar(msgVoz), 500);
}