// URLs reais do acervo Unsplash/Wikimedia para ilustrar de forma lúdica
const bancoDeRodadas = [
    {
        tema: "ANIMAIS",
        opcoes: [
            { nome: "Gatinho", som: "sons/gato.mp3", img: "imgs/gato.png" },
            { nome: "Cachorrinho", som: "sons/cachorro.mp3", img: "imgs/cachorro.png" },
            { nome: "Leãozinho", som: "sons/leao.mp3", img: "imgs/leao.png" }
        ]
    },
    {
        tema: "TRANSPORTES",
        opcoes: [
            { nome: "Carro", som: "sons/carro.mp3", img: "imgs/carro.png" },
            { nome: "Avião", som: "sons/aviao.mp3", img: "imgs/aviao.png" },
            { nome: "Trem", som: "sons/trem.mp3", img: "imgs/trem.png" }
        ]
    },
    {
        tema: "INSTRUMENTOS",
        opcoes: [
            { nome: "Tambor", som: "sons/tambor.wav", img: "imgs/tambor.png" },
            { nome: "Piano", som: "sons/piano.wav", img: "imgs/piano.png" },
            { nome: "Flauta", som: "sons/flauta.wav", img: "imgs/flauta.png" }
        ]
    },
    {
        tema: "NATUREZA",
        opcoes: [
            { nome: "Chuva", som: "sons/chuva.wav", img: "imgs/nuuvem.png" },
            { nome: "Vento", som: "sons/vento.wav", img: "imgs/vento.png" },
            { nome: "Mar", som: "sons/mar.wav", img: "imgs/agua.png" }
        ]
    },
    {
        tema: "COISAS DE CASA",
        opcoes: [
            { nome: "Telefone", som: "sons/telefone.wav", img: "imgs/Telefone.png" },
            { nome: "Despertador", som: "sons/despertador.wav", img: "imgs/Despertador.png" },
            { nome: "Campainha", som: "sons/campainha.mp3", img: "imgs/Campainha.png" }
        ]
    }
];

const somAcerto = new Audio("sons/correto.mp3");
const somErro = new Audio("sons/errado.mp3");
const somFanfarra = new Audio("sons/parabens.mp3");

let escolhasDaRodadaAtual = [];
let itemCorretoIndex;
let audioAtual = null;
let rodadaAtual = 1;
const MAX_RODADAS = 5;

// Elementos de tela
const btnStart = document.getElementById("btn-start");
const btnRestart = document.getElementById("btn-restart");
const btnOuvir = document.getElementById("btn-ouvir");
const txtInstrucao = document.getElementById("instrucao");
const hudRodada = document.getElementById("hud-rodada");
const hudTema = document.getElementById("hud-tema");
const msgFinal = document.getElementById("mensagem-final");
const botoesOpcao = document.querySelectorAll(".card-opcao");

// Usa a mesma config de voz/velocidade do painel de acessibilidade do
// header quando disponível, para não conflitar com a escolha do usuário.
function falar(texto, aoTerminar) {
    const cfg = window.acessibilidadeConfig;
    if (cfg && cfg.voz === false) {
        txtInstrucao.textContent = texto;
        if (typeof aoTerminar === "function") aoTerminar();
        return;
    }

    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = (cfg && cfg.vel) ? cfg.vel : 1.1;

    if (typeof aoTerminar === "function") {
        fala.onend = aoTerminar;
        fala.onerror = aoTerminar;
    }

    window.speechSynthesis.speak(fala);
    txtInstrucao.textContent = texto;
}

// Ativa motor de vibração físico se o aparelho permitir
function vibrarDispositivo(padrao) {
    if ("vibrate" in navigator) {
        navigator.vibrate(padrao);
    }
}

// Inicia o Jogo (Botão Start)
btnStart.addEventListener("click", () => {
    document.getElementById("tela-inicio").classList.add("escondido");
    document.getElementById("tela-jogo").classList.remove("escondido");
    rodadaAtual = 1;
    vibrarDispositivo(100); // Vibração curta de confirmação
    iniciarRodada();
});

function iniciarRodada() {
    const dadosRodada = bancoDeRodadas[rodadaAtual - 1];
    escolhasDaRodadaAtual = dadosRodada.opcoes;

    // Atualiza HUD superior do console
    hudRodada.textContent = `FASE: ${rodadaAtual}/5`;
    hudTema.textContent = `TEMA: ${dadosRodada.tema}`;

    itemCorretoIndex = Math.floor(Math.random() * escolhasDaRodadaAtual.length);
    audioAtual = new Audio(escolhasDaRodadaAtual[itemCorretoIndex].som);

    // Alimenta botões com Imagens e Acessibilidade
    botoesOpcao.forEach((botao, index) => {
        const item = escolhasDaRodadaAtual[index];
        const imgTag = botao.querySelector(".img-opcao");
        const labelTag = botao.querySelector(".label-opcao");

        imgTag.src = item.img;
        imgTag.alt = `Desenho de um ${item.nome}`;
        labelTag.textContent = item.nome;

        botao.setAttribute("aria-label", `Opção ${index + 1}: ${item.nome}. Pressione a tecla ${index + 1} para escolher.`);
    });

    // Ordem da narração: 1) tema  2) opções (número + nome)  3) som a identificar.
    // Cada etapa só começa quando a anterior termina de fato (callback aoTerminar),
    // evitando que os áudios se atropelem.
    const textoTema = `Fase ${rodadaAtual}. O tema é ${dadosRodada.tema}. Ouça o som com atenção e me diga qual é!`;

    falar(textoTema, () => {
        falar(montarTextoOpcoes(), () => {
            // Fix: depois de narrar as opções, o texto na tela ficava preso
            // na frase das opções. Agora volta a mostrar o texto do tema.
            txtInstrucao.textContent = textoTema;
            tocarSomAtual();
        });
    });
}

// Monta a frase "Aperte o número 1 para gato, 2 para cachorro e 3 para leãozinho"
function montarTextoOpcoes() {
    const nomes = escolhasDaRodadaAtual.map(item => item.nome);
    let texto = "Aperte o número 1 para " + nomes[0];
    for (let i = 1; i < nomes.length; i++) {
        const conectivo = (i === nomes.length - 1) ? " e " : ", ";
        texto += `${conectivo}${i + 1} para ${nomes[i]}`;
    }
    return texto;
}

function tocarSomAtual() {
    if (audioAtual && rodadaAtual <= MAX_RODADAS) {
        audioAtual.play().catch(() => {});
    }
}

function verificarEscolha(indexEscolhido) {
    if (rodadaAtual > MAX_RODADAS) return;

    if (indexEscolhido === itemCorretoIndex) {
        // CORRETO: Vibração alegre curta e avança
        vibrarDispositivo([80, 50, 80]);

        // Fix: o somAcerto é reaproveitado em todas as rodadas. Se o
        // setTimeout de segurança e o evento onended disparassem os dois,
        // iniciarRodada() rodava 2x e a segunda narração atropelava a
        // primeira. Agora um guard (jaAvancou) garante que só dispara uma vez.
        somAcerto.currentTime = 0;
        somAcerto.play().catch(() => {});

        rodadaAtual++;

        let jaAvancou = false;
        const avancar = () => {
            if (jaAvancou) return;
            jaAvancou = true;
            somAcerto.onended = null;
            if (rodadaAtual <= MAX_RODADAS) {
                iniciarRodada();
            } else {
                finalizarJogo();
            }
        };

        somAcerto.onended = avancar;
        // Garante avanço mesmo se o evento onended não disparar (ex: erro de carregamento)
        setTimeout(avancar, 1500);
    } else {
        // ERRADO: Vibração de erro (longa/dupla) e NÃO avança a fase!
        vibrarDispositivo([300, 100, 300]);
        somErro.play().catch(() => {});

        // Fix: a narração e o som eram disparados juntos e se atropelavam.
        // Agora o som só toca depois que a fala termina de ser narrada.
        setTimeout(() => {
            falar("Ops, esse não era o som correto! Tente novamente com outro botão. Vamos ouvir de novo!", tocarSomAtual);
        }, 1200);
    }
}

function finalizarJogo() {
    document.getElementById("tela-jogo").classList.add("escondido");
    document.getElementById("tela-final").classList.remove("escondido");
    somFanfarra.play().catch(() => {});
    vibrarDispositivo([200, 100, 200, 100, 500]); // Ritmo de vitória

    const msgVoz = "🎉 Incrível! Você completou todas as fases com sucesso e dominou o videogame! Você tem ouvidos mágicos de super-herói! Parabéns! Pressione a barra de espaço para recomeçar.";
    msgFinal.textContent = "Você completou o desafio das 5 fases perfeitamente! ⭐";

    setTimeout(() => falar(msgVoz), 500);
}

// Reiniciar Tudo
btnRestart.addEventListener("click", () => {
    document.getElementById("tela-final").classList.add("escondido");
    document.getElementById("tela-jogo").classList.remove("escondido");
    rodadaAtual = 1;
    iniciarRodada();
});

// Eventos de Voz e Interação
botoesOpcao.forEach((botao, index) => {
    // Fix: se o mouse passasse no card antes de escolhasDaRodadaAtual ser
    // populado (ex: tela inicial), dava erro "cannot read nome of undefined".
    botao.addEventListener("mouseenter", () => {
        if (rodadaAtual <= MAX_RODADAS && escolhasDaRodadaAtual[index]) {
            falar(`Botão ${index + 1}: ${escolhasDaRodadaAtual[index].nome}`);
        }
    });
    botao.addEventListener("focus", () => {
        if (rodadaAtual <= MAX_RODADAS && escolhasDaRodadaAtual[index]) {
            falar(`Botão ${index + 1}: ${escolhasDaRodadaAtual[index].nome}`);
        }
    });
    botao.addEventListener("click", () => verificarEscolha(index));
});

btnOuvir.addEventListener("click", tocarSomAtual);

// Controles Físicos do Teclado (Estilo Emulator)
window.addEventListener("keydown", (evento) => {
    if (evento.code === "Space") {
        evento.preventDefault();
        if (rodadaAtual > MAX_RODADAS) {
            btnRestart.click();
        } else if(document.getElementById("tela-inicio").classList.contains("escondido")) {
            tocarSomAtual();
        } else {
            btnStart.click();
        }
    }
    if (rodadaAtual <= MAX_RODADAS && !document.getElementById("tela-jogo").classList.contains("escondido")) {
        if (evento.key === "1") verificarEscolha(0);
        if (evento.key === "2") verificarEscolha(1);
        if (evento.key === "3") verificarEscolha(2);
    }
});
