// ══════════════════════════════════════════════════════════════════
// GENIUS DAS CORES
//
// Jogo pensado primariamente para crianças surdas: todo o feedback
// essencial é visual (cor + forma + flash de tela + vibração). O som
// e a narração por voz existem apenas como reforço opcional — o jogo
// precisa funcionar 100% mudo, já que a narração não pode ser a única
// fonte de informação para esse público.
// ══════════════════════════════════════════════════════════════════

const TOTAL_BOTOES = 4;
const TEMPO_ACESO_MS = 550;      // quanto tempo cada botão fica "aceso" na demonstração
const INTERVALO_ENTRE_MS = 250;  // pausa entre um botão e outro na demonstração
const TEMPO_FEEDBACK_MS = 350;   // duração do flash de acerto/erro

// Nota: por enquanto não temos 4 notas musicais distintas disponíveis,
// então todos os botões usam o mesmo som de clique (bônus sonoro opcional,
// nunca a fonte principal de informação). Quando houver 4 sons/notas
// diferentes, basta trocar os caminhos abaixo por um por botão.
const somClique = [
    new Audio("sons/correto.mp3"),
    new Audio("sons/correto.mp3"),
    new Audio("sons/correto.mp3"),
    new Audio("sons/correto.mp3")
];
const somErro = new Audio("sons/errado.mp3");

let sequencia = [];         // sequência completa desta partida
let passoAtualJogador = 0;  // quantos passos da sequência o jogador já acertou nesta rodada
let rodadaAtual = 0;
let aceitandoInput = false; // true quando é a vez do jogador clicar

// Modo de narração escolhido na tela inicial: "voz" ou "texto".
// null enquanto a criança/tutor ainda não escolheu — o botão "Jogar"
// fica desabilitado até essa escolha ser feita.
let modoNarracao = null;

// Elementos de tela
const btnStart = document.getElementById("btn-start");
const btnRestart = document.getElementById("btn-restart");
const txtInstrucao = document.getElementById("instrucao");
const txtInstrucaoLeitorTela = document.getElementById("instrucao-leitor-tela");
const hudRodada = document.getElementById("hud-rodada");
const hudStatus = document.getElementById("hud-status");
const tituloFinal = document.getElementById("titulo-final");
const medalhaFinal = document.getElementById("medalha-final");
const msgFinal = document.getElementById("mensagem-final");
const tabuleiroEl = document.getElementById("tabuleiro");
const flashOverlay = document.getElementById("flash-overlay");
const botoes = Array.from(document.querySelectorAll(".botao-genius"));

const btnNarracaoSim = document.getElementById("btn-narracao-sim");
const btnNarracaoNao = document.getElementById("btn-narracao-nao");
const escolhaConfirmadaEl = document.getElementById("escolha-confirmada");

// ─── Escolha obrigatória de narração (tela inicial) ────────────────
btnNarracaoSim.addEventListener("click", () => selecionarModoNarracao("voz"));
btnNarracaoNao.addEventListener("click", () => selecionarModoNarracao("texto"));

function selecionarModoNarracao(modo) {
    modoNarracao = modo;

    btnNarracaoSim.classList.toggle("selecionado", modo === "voz");
    btnNarracaoSim.classList.toggle("nao-selecionado", modo !== "voz");
    btnNarracaoNao.classList.toggle("selecionado", modo === "texto");
    btnNarracaoNao.classList.toggle("nao-selecionado", modo !== "texto");

    escolhaConfirmadaEl.textContent = modo === "voz"
        ? "✓ Narração falada ativada."
        : "✓ Modo texto ativado — as instruções vão aparecer escritas.";

    btnStart.disabled = false;
}

// ─── Narração (dois modos: fala real ou "máquina de escrever") ─────
//
// Em ambos os modos, o texto SEMPRE aparece escrito no balão de
// instrução (txtInstrucao) — a diferença é que no modo "texto" as
// letras surgem aos poucos, imitando alguém falando, no lugar da
// Web Speech API. Isso garante que o jogo nunca dependa só de som:
// mesmo no modo "voz", o texto completo já fica visível de imediato.
let tokenFalaAtual = 0;

function falar(texto, aoTerminar) {
    tokenFalaAtual++;
    const meuToken = tokenFalaAtual;

    // O leitor de tela sempre recebe o texto completo de uma vez, mesmo
    // no modo "texto" — só o balão visual anima letra por letra.
    txtInstrucaoLeitorTela.textContent = texto;

    const chamarSeAindaValido = () => {
        if (meuToken === tokenFalaAtual && typeof aoTerminar === "function") {
            aoTerminar();
        }
    };

    if (modoNarracao === "texto") {
        digitarTexto(texto, meuToken, chamarSeAindaValido);
        return;
    }

    // Modo "voz": mostra o texto completo de imediato e narra por voz
    txtInstrucao.textContent = texto;

    const cfg = window.acessibilidadeConfig;
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

// Efeito "máquina de escrever": exibe o texto letra por letra dentro do
// balão de instrução, com um cursor piscando no final. Usa o mesmo
// sistema de token da fala por voz, então se uma digitação mais nova
// começar no meio de uma anterior, a antiga é descartada sem continuar
// escrevendo por cima.
const VELOCIDADE_DIGITACAO_MS = 35;

function digitarTexto(texto, meuToken, aoTerminar) {
    txtInstrucao.textContent = "";
    const cursor = document.createElement("span");
    cursor.className = "cursor-digitando";
    txtInstrucao.appendChild(cursor);

    let indice = 0;

    function digitarProximaLetra() {
        // Se um token mais novo já assumiu, esta digitação antiga para aqui
        if (meuToken !== tokenFalaAtual) return;

        if (indice < texto.length) {
            cursor.insertAdjacentText("beforebegin", texto[indice]);
            indice++;
            setTimeout(digitarProximaLetra, VELOCIDADE_DIGITACAO_MS);
        } else {
            // Terminou de digitar: espera um instante com o cursor piscando
            // antes de avançar, dando tempo de leitura
            setTimeout(() => {
                if (meuToken === tokenFalaAtual) aoTerminar();
            }, 700);
        }
    }

    digitarProximaLetra();
}

function vibrarDispositivo(padrao) {
    if ("vibrate" in navigator) {
        navigator.vibrate(padrao);
    }
}

// Espera "ms" milissegundos (Promise) — facilita encadear a demonstração
function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Calcula um tempo de rede de segurança generoso o bastante para o texto
// terminar de "ser digitado" no modo texto (letra por letra), ou um valor
// fixo curto no modo voz. Evita que o setTimeout de segurança dispare
// ANTES da digitação terminar de aparecer, cortando o efeito visual.
function tempoSegurancaPara(texto) {
    if (modoNarracao === "texto") {
        return (texto.length * VELOCIDADE_DIGITACAO_MS) + 700 + 600; // + margem
    }
    return 2200;
}

// ─── Início / Reinício ──────────────────────────────────────────────
btnStart.addEventListener("click", () => {
    // Segurança extra além do atributo "disabled": o jogo nunca deve
    // começar sem a escolha do modo de narração ter sido feita.
    if (!modoNarracao) return;

    document.getElementById("tela-inicio").classList.add("escondido");
    document.getElementById("tela-jogo").classList.remove("escondido");
    iniciarJogo();
});

btnRestart.addEventListener("click", () => {
    document.getElementById("tela-final").classList.add("escondido");
    document.getElementById("tela-jogo").classList.remove("escondido");
    iniciarJogo();
});

function iniciarJogo() {
    sequencia = [];
    rodadaAtual = 0;
    proximaRodada();
}

function proximaRodada() {
    rodadaAtual++;
    passoAtualJogador = 0;
    aceitandoInput = false;

    sequencia.push(Math.floor(Math.random() * TOTAL_BOTOES));

    hudRodada.textContent = `RODADA: ${rodadaAtual}`;
    hudStatus.textContent = "OBSERVE";
    tabuleiroEl.classList.add("bloqueado");

    const textoRodada = `Rodada ${rodadaAtual}. Observe a sequência.`;
    let jaIniciouDemo = false;
    const iniciarDemo = () => {
        if (jaIniciouDemo) return;
        jaIniciouDemo = true;
        demonstrarSequencia();
    };

    falar(textoRodada, iniciarDemo);
    // Rede de segurança: garante que a demonstração comece mesmo se a
    // narração falhar silenciosamente, sem cortar a digitação no modo texto.
    setTimeout(iniciarDemo, tempoSegurancaPara(textoRodada));
}

// Mostra a sequência inteira piscando os botões em ordem, com pausas
async function demonstrarSequencia() {
    // Pequena pausa antes de começar, para a criança se preparar
    await esperar(400);

    for (let i = 0; i < sequencia.length; i++) {
        await acenderBotao(sequencia[i]);
        await esperar(INTERVALO_ENTRE_MS);
    }

    // Libera a vez do jogador
    aceitandoInput = true;
    tabuleiroEl.classList.remove("bloqueado");
    hudStatus.textContent = "SUA VEZ";
    falar("Agora é sua vez! Repita a sequência.");
}

// Acende um botão por TEMPO_ACESO_MS, com som de nota opcional
function acenderBotao(index) {
    return new Promise(resolve => {
        const botao = botoes[index];
        botao.classList.add("aceso");

        const somNota = somClique[index];
        somNota.currentTime = 0;
        somNota.play().catch(() => {});

        setTimeout(() => {
            botao.classList.remove("aceso");
            setTimeout(resolve, 80);
        }, TEMPO_ACESO_MS);
    });
}

// ─── Clique do jogador ───────────────────────────────────────────
botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
        if (!aceitandoInput) return;

        const index = Number(botao.dataset.index);
        registrarCliqueDoJogador(index);
    });
});

// Navegação por setas dentro do tabuleiro (grid 2x2: 0=topo-esquerda,
// 1=topo-direita, 2=baixo-esquerda, 3=baixo-direita). O Tab normal do
// navegador foi retirado de dentro do tabuleiro (só o botao-0 mantém
// tabindex="0" como porta de entrada); as setas movem o foco de forma
// espacial, respeitando as posições reais na tela.
const MAPA_SETAS = {
    ArrowRight: { 0: 1, 1: 1, 2: 3, 3: 3 },
    ArrowLeft:  { 0: 0, 1: 0, 2: 2, 3: 2 },
    ArrowDown:  { 0: 2, 1: 3, 2: 2, 3: 3 },
    ArrowUp:    { 0: 0, 1: 1, 2: 0, 3: 1 },
};

botoes.forEach((botao) => {
    botao.addEventListener("keydown", (evento) => {
        const mapa = MAPA_SETAS[evento.code];
        if (!mapa) return;

        evento.preventDefault();
        const indexAtual = Number(botao.dataset.index);
        const proximoIndex = mapa[indexAtual];
        botoes[proximoIndex].focus();
    });
});

function registrarCliqueDoJogador(index) {
    // Feedback imediato de "toque recebido", independente de acerto/erro
    botao_acender_rapido(index);

    const esperado = sequencia[passoAtualJogador];

    if (index === esperado) {
        passoAtualJogador++;

        if (passoAtualJogador === sequencia.length) {
            // Completou a sequência inteira desta rodada
            aceitandoInput = false;
            tratarAcertoDaRodada();
        }
        // Se ainda não completou, apenas continua aceitando cliques
    } else {
        aceitandoInput = false;
        tratarErro(index);
    }
}

// Pisca rapidamente o botão clicado, dando feedback tátil-visual imediato.
// Usa um "token" por botão para que, se a criança clicar rápido demais no
// mesmo botão duas vezes, o segundo clique não corte o brilho do primeiro
// antes da hora — o brilho sempre dura o tempo completo do clique mais recente.
const tokenAcesoPorBotao = new Array(TOTAL_BOTOES).fill(0);

function botao_acender_rapido(index) {
    const botao = botoes[index];
    botao.classList.add("aceso");

    tokenAcesoPorBotao[index]++;
    const meuToken = tokenAcesoPorBotao[index];

    const somNota = somClique[index];
    somNota.currentTime = 0;
    somNota.play().catch(() => {});

    setTimeout(() => {
        if (tokenAcesoPorBotao[index] === meuToken) {
            botao.classList.remove("aceso");
        }
    }, 200);
}

function tratarAcertoDaRodada() {
    vibrarDispositivo([80, 50, 80]);
    flashTela("ativo-acerto");
    hudStatus.textContent = "ACERTOU!";

    let jaAvancou = false;
    const avancar = () => {
        if (jaAvancou) return;
        jaAvancou = true;
        proximaRodada();
    };

    // A próxima rodada só começa depois da narração de parabéns terminar,
    // para não atropelar a instrução da rodada seguinte.
    const textoAcerto = "Muito bem! Próxima rodada.";
    falar(textoAcerto, avancar);
    // Rede de segurança: se a narração falhar silenciosamente, sem cortar
    // a digitação no modo texto.
    setTimeout(avancar, tempoSegurancaPara(textoAcerto));
}

function tratarErro(indexClicado) {
    vibrarDispositivo([300, 100, 300]);
    flashTela("ativo-erro");

    const botao = botoes[indexClicado];
    botao.classList.add("feedback-erro");
    somErro.currentTime = 0;
    somErro.play().catch(() => {});

    setTimeout(() => botao.classList.remove("feedback-erro"), 400);

    hudStatus.textContent = "FIM DE JOGO";

    let jaFinalizou = false;
    const finalizar = () => {
        if (jaFinalizou) return;
        jaFinalizou = true;
        finalizarJogo();
    };

    const textoErro = "Ops, essa não é a sequência certa. Fim de jogo!";
    falar(textoErro, finalizar);
    setTimeout(finalizar, tempoSegurancaPara(textoErro));
}

// Mostra um flash colorido em tela cheia por um instante (feedback forte
// sem depender de som — essencial para o público surdo)
function flashTela(classeEstado) {
    flashOverlay.classList.add(classeEstado);
    setTimeout(() => flashOverlay.classList.remove(classeEstado), TEMPO_FEEDBACK_MS);
}

function finalizarJogo() {
    document.getElementById("tela-jogo").classList.add("escondido");
    document.getElementById("tela-final").classList.remove("escondido");

    // Pontuação = quantas rodadas o jogador completou com sucesso
    // (a rodada em que errou não conta como completa)
    const pontuacao = rodadaAtual - 1;

    tituloFinal.textContent = "FIM DE JOGO";
    medalhaFinal.textContent = pontuacao >= 5 ? "🏆" : "🎯";
    msgFinal.textContent = `Você completou ${pontuacao} ${pontuacao === 1 ? "rodada" : "rodadas"}! Toque em jogar de novo para tentar superar essa marca.`;

    setTimeout(() => {
        falar(`Você completou ${pontuacao} ${pontuacao === 1 ? "rodada" : "rodadas"}. Toque em jogar de novo para tentar de novo.`);
    }, 400);
}
