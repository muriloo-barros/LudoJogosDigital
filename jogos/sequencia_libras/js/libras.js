// ════════════════════════════════════════════════════════════════
// SEQUÊNCIA DE LIBRAS — Lógica do jogo
// Estilo Genius com alfabeto manual de Libras
// Vídeos em videos/A.mp4 ... videos/F.mp4 (placeholders ok)
// Sem vídeo? Fallback automático: letra em destaque + tom + narração
// ════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ─── Sinais: alfabeto manual A–F ─────────────────────────────────
const LETRAS = [
    { letra: 'A', cor: '#ef5777', freq: 440 },
    { letra: 'B', cor: '#0fbcf9', freq: 494 },
    { letra: 'C', cor: '#feca57', freq: 523 },
    { letra: 'D', cor: '#05c46b', freq: 587 },
    { letra: 'E', cor: '#ff9f43', freq: 659 },
    { letra: 'F', cor: '#a55eea', freq: 740 }
];
const MAPA_LETRAS = {};
LETRAS.forEach(function (l) { MAPA_LETRAS[l.letra] = l; });

// ─── Níveis fixos ────────────────────────────────────────────────
const NIVEIS = [
    { nome: 'Fácil',   rounds: 5, sinais: 3 },
    { nome: 'Médio',   rounds: 5, sinais: 5 },
    { nome: 'Difícil', rounds: 5, sinais: 7 }
];
const DURACAO_SINAL = 1800; // ms de exibição de cada sinal

// ─── Estado ──────────────────────────────────────────────────────
let nivelAtual = 0;
let roundAtual = 0;
let sequencia = [];
let etapa = 0;
let aceitandoInput = false;
let errosTotal = 0;
let reproduzindo = false;
let videoOk = true; // vira false se o primeiro vídeo falhar

// ─── DOM ─────────────────────────────────────────────────────────
const telaInicio = document.getElementById('tela-inicio');
const telaJogo   = document.getElementById('tela-jogo');
const telaNivel  = document.getElementById('tela-nivel');
const telaFinal  = document.getElementById('tela-final');
const btnStart   = document.getElementById('btn-start');
const btnProxNivel = document.getElementById('btn-proximo-nivel');
const btnRestart = document.getElementById('btn-restart');
const btnRepetir = document.getElementById('btn-repetir');
const hudNivel   = document.getElementById('hud-nivel');
const hudRound   = document.getElementById('hud-round');
const hudSinal   = document.getElementById('hud-sinal');
const instrucao  = document.getElementById('instrucao-jogo');
const videoEl    = document.getElementById('imgSinal');
const fallbackEl = document.getElementById('fallbackLetra');
const palcoDica  = document.getElementById('palcoDica');
const cardsGrid  = document.getElementById('cardsGrid');
const msgNivel   = document.getElementById('mensagem-nivel');
const msgFinal   = document.getElementById('mensagem-final');

// Blindagem
if (!btnStart || !telaJogo || !cardsGrid || !videoEl) {
    console.error('SEQUÊNCIA DE LIBRAS: elementos do HTML não encontrados. Verifique os IDs no libras.html.');
    return;
}

// ─── Narração segura (timeout de segurança incluso) ──────────────
let tokenFala = 0;
function falarSeguro(texto, callback) {
    tokenFala++;
    const meuToken = tokenFala;
    let chamado = false;
    function disparar() {
        if (chamado) return;
        chamado = true;
        if (meuToken === tokenFala && typeof callback === 'function') callback();
    }
    const tempoSeguranca = Math.max(1500, texto.length * 60 + 1000);
    setTimeout(disparar, tempoSeguranca);
    if (typeof falar === 'function') {
        try { falar(texto, function () { if (meuToken === tokenFala) disparar(); }); } catch (e) {}
        return;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(texto);
        utt.lang = 'pt-BR';
        if (typeof config !== 'undefined' && config.velocidade) utt.rate = config.velocidade;
        const startTime = Date.now();
        utt.onend = function () {
            const minMs = Math.max(800, texto.length * 55);
            const wait = Math.max(0, minMs - (Date.now() - startTime));
            setTimeout(disparar, wait);
        };
        window.speechSynthesis.speak(utt);
        return;
    }
}
function mostrarLegenda(texto) {
    if (typeof mostrarLegendaBox === 'function') { mostrarLegendaBox(texto); return; }
    const span = document.getElementById('texto-legenda');
    const box = document.querySelector('.legenda-box');
    if (span && box) {
        span.textContent = texto;
        box.classList.add('ativa');
        clearTimeout(box._timerLegenda);
        box._timerLegenda = setTimeout(function () { box.classList.remove('ativa'); }, 4000);
    }
}

// ─── Efeitos sonoros ─────────────────────────────────────────────
let audioCtx = null;
function beep(freq, dur, tipo, vol) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = freq; osc.type = tipo || 'sine';
        gain.gain.setValueAtTime(vol || 0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
}
function somAcerto() { beep(660, 0.1, 'sine', 0.1); setTimeout(function () { beep(880, 0.12, 'sine', 0.1); }, 90); }
function somNeutro() { beep(250, 0.18, 'sine', 0.07); }
function somSuaVez() { beep(523, 0.1, 'sine', 0.1); setTimeout(function () { beep(659, 0.12, 'sine', 0.1); }, 110); }
function somNivel()  { beep(523, 0.12, 'sine', 0.1); setTimeout(function () { beep(659, 0.12, 'sine', 0.1); }, 130); setTimeout(function () { beep(784, 0.2, 'sine', 0.1); }, 260); }
function somVitoria(){ beep(523, 0.15, 'sine', 0.1); setTimeout(function () { beep(659, 0.15, 'sine', 0.1); }, 150); setTimeout(function () { beep(784, 0.15, 'sine', 0.1); }, 300); setTimeout(function () { beep(1047, 0.25, 'sine', 0.1); }, 450); }

// ─── Cards dos sinais ────────────────────────────────────────────
function renderCards() {
    cardsGrid.innerHTML = '';
    LETRAS.forEach(function (l) {
        const btn = document.createElement('button');
        btn.className = 'card-sinal';
        btn.style.background = l.cor;
        btn.dataset.letra = l.letra;
        btn.setAttribute('aria-label', 'Sinal de Libras da letra ' + l.letra);
        btn.innerHTML = '<span class="card-mao" aria-hidden="true">✋</span>' +
                        '<span class="card-letra">' + l.letra + '</span>';
        btn.addEventListener('click', function () {
            if (!aceitandoInput || reproduzindo) return;
            if (l.letra === sequencia[etapa].letra) {
                acertarCard(btn);
            } else {
                errarCard(btn);
            }
        });
        cardsGrid.appendChild(btn);
    });
}

function cardDe(letra) {
    const cards = cardsGrid.children;
    for (let i = 0; i < cards.length; i++) {
        if (cards[i].dataset.letra === letra) return cards[i];
    }
    return null;
}

// ─── Mostrar um sinal no palco (imagem ou fallback) ──────────────
function tocarSinal(letra, done) {
    const l = MAPA_LETRAS[letra];
    const card = cardDe(letra);
    if (card) card.classList.add('reproduzindo');

    beep(l.freq, 0.18, 'sine', 0.09);
    mostrarLegenda('Sinal: letra ' + l.letra);

    // Fallback por padrão; se a imagem existir, assume o comando
    fallbackEl.textContent = '✋ ' + l.letra;
    fallbackEl.classList.remove('escondido');
    videoEl.style.display = 'none';

    const img = new Image();
    img.onload = function () {
        videoEl.src = img.src;
        videoEl.alt = 'Sinal de Libras da letra ' + l.letra;
        videoEl.style.display = 'block';
        fallbackEl.classList.add('escondido');
    };
    // Sem imagem ou com erro → letra gigante permanece (nada quebra)
    img.src = 'imgs/libras/' + letra + '.png';

    setTimeout(function () {
        if (card) card.classList.remove('reproduzindo');
        if (typeof done === 'function') done();
    }, DURACAO_SINAL);
}

// ─── Reproduzir a sequência completa ─────────────────────────────
function reproduzirSequencia(done) {
    reproduzindo = true;
    aceitandoInput = false;
    btnRepetir.disabled = true;
    let i = 0;
    function proximo() {
        if (i >= sequencia.length) {
            reproduzindo = false;
            if (typeof done === 'function') done();
            return;
        }
        hudSinal.textContent = 'SINAL: ' + (i + 1) + '/' + sequencia.length;
        tocarSinal(sequencia[i].letra, function () {
            i++;
            proximo();
        });
    }
    proximo();
}

// ─── Geração da sequência (repete letras, mas nunca 3 iguais seguidas) ──
function gerarSequencia(qtd) {
    const seq = [];
    let guarda = 0;
    while (seq.length < qtd && guarda < 100) {
        guarda++;
        const l = LETRAS[Math.floor(Math.random() * LETRAS.length)].letra;
        const n = seq.length;
        if (n >= 2 && seq[n - 1].letra === l && seq[n - 2].letra === l) continue;
        seq.push({ letra: l });
    }
    while (seq.length < qtd) seq.push({ letra: 'A' });
    return seq;
}

// ─── Carregar round ──────────────────────────────────────────────
function carregarRound() {
    const nivel = NIVEIS[nivelAtual];
    sequencia = gerarSequencia(nivel.sinais);
    etapa = 0;
    aceitandoInput = false;

    hudNivel.textContent = 'NÍVEL: ' + nivel.nome;
    hudRound.textContent = 'ROUND: ' + (roundAtual + 1) + '/' + nivel.rounds;
    hudSinal.textContent = 'Assista...';
    instrucao.textContent = '🔊 Assista aos sinais com atenção!';
    palcoDica.textContent = 'Os sinais vão aparecer aqui...';

    renderCards();

    const frase = 'Round ' + (roundAtual + 1) + '. Assista aos ' + nivel.sinais +
        ' sinais de Libras e repita na mesma ordem!';
    falarSeguro(frase, function () {
        reproduzirSequencia(iniciarExecucao);
    });
    mostrarLegenda(frase);
}

// ─── Iniciar fase de resposta ────────────────────────────────────
function iniciarExecucao() {
    aceitandoInput = true;
    btnRepetir.disabled = false;
    somSuaVez();
    instrucao.textContent = '👉 Sua vez! Clique nos cards na ordem que você viu!';
    hudSinal.textContent = 'SINAL: 1/' + sequencia.length;
    palcoDica.textContent = 'Sinal ' + sequencia[0].letra + ' esperado...';
}

// ─── Repetir a sequência ─────────────────────────────────────────
function repetirSequencia() {
    if (sequencia.length === 0) return;
    instrucao.textContent = '🔊 Assistindo de novo...';
    falarSeguro('Atenção de novo!', function () {
        reproduzirSequencia(function () {
            aceitandoInput = true;
            btnRepetir.disabled = false;
            instrucao.textContent = '👉 Sua vez! Continuando do sinal ' + (etapa + 1) + '!';
        });
    });
}

// ─── Acertou (destaque temporário: o card continua clicável, pois a
//     letra pode aparecer de novo na sequência) ─────────────────────
function acertarCard(btn) {
    btn.classList.remove('acerto-pulse');
    void btn.offsetWidth; // reinicia a animação
    btn.classList.add('acerto-pulse');
    somAcerto();
    etapa++;

    if (etapa >= sequencia.length) {
        aceitandoInput = false;
        setTimeout(roundCompleto, 400);
        return;
    }
    hudSinal.textContent = 'SINAL: ' + (etapa + 1) + '/' + sequencia.length;
    palcoDica.textContent = 'Sinal ' + sequencia[etapa].letra + ' esperado...';
}

// ─── Errou: feedback suave, sem punição ──────────────────────────
function errarCard(btn) {
    somNeutro();
    errosTotal++;
    btn.classList.remove('errado');
    void btn.offsetWidth;
    btn.classList.add('errado');

    // Reexibe o sinal esperado no palco
    const esperado = sequencia[etapa].letra;
    aceitandoInput = false;
    tocarSinal(esperado, function () {
        aceitandoInput = true;
    });

    const frase = 'Opa! Esse não era. O sinal certo é a letra ' + esperado + '. Tente de novo!';
    instrucao.textContent = '🔁 Era a letra ' + esperado + '! Tente de novo!';
    falarSeguro(frase);
    mostrarLegenda(frase);
}

// ─── Round completo ──────────────────────────────────────────────
function roundCompleto() {
    const nivel = NIVEIS[nivelAtual];
    if (roundAtual < nivel.rounds - 1) {
        roundAtual++;
        const frase = 'Sequência completa! Muito bem!';
        falarSeguro(frase, function () { setTimeout(carregarRound, 500); });
        mostrarLegenda(frase);
    } else {
        nivelCompleto();
    }
}

// ─── Nível completo ──────────────────────────────────────────────
function nivelCompleto() {
    somNivel();
    const nivel = NIVEIS[nivelAtual];
    msgNivel.textContent = 'Você completou o nível ' + nivel.nome +
        '! Reproduziu ' + (nivel.rounds * nivel.sinais) + ' sinais de Libras na ordem!';

    if (nivelAtual >= NIVEIS.length - 1) {
        btnProxNivel.textContent = 'Ver Resultado Final →';
    } else {
        btnProxNivel.textContent = 'Próximo Nível (' + NIVEIS[nivelAtual + 1].nome + ') →';
    }

    trocarTela(telaNivel);
    falarSeguro(msgNivel.textContent);
    mostrarLegenda(msgNivel.textContent);
}

// ─── Próximo nível / final ───────────────────────────────────────
function proximoNivel() {
    if (nivelAtual < NIVEIS.length - 1) {
        nivelAtual++;
        roundAtual = 0;
        trocarTela(telaJogo);
        carregarRound();
    } else {
        mostrarFinal();
    }
}

// ─── Tela final ──────────────────────────────────────────────────
function mostrarFinal() {
    somVitoria();
    const totalSinais = NIVEIS.reduce(function (soma, n) { return soma + n.rounds * n.sinais; }, 0);
    const medalhaEl = document.querySelector('#tela-final .medalha-animada');

    if (errosTotal <= 3) {
        if (medalhaEl) medalhaEl.textContent = '🏆';
        msgFinal.textContent = 'Incrível! Você reproduziu ' + totalSinais +
            ' sinais de Libras na ordem, com só ' + errosTotal + ' deslizes!';
    } else if (errosTotal <= 10) {
        if (medalhaEl) medalhaEl.textContent = '🥇';
        msgFinal.textContent = 'Muito bem! ' + totalSinais + ' sinais na ordem, com ' +
            errosTotal + ' deslizes. Continue praticando!';
    } else {
        if (medalhaEl) medalhaEl.textContent = '🌟';
        msgFinal.textContent = 'Você completou todas as rodadas e praticou o alfabeto de Libras! ' +
            'Jogue de novo para memorizar ainda mais os sinais!';
    }

    trocarTela(telaFinal);
    falarSeguro(msgFinal.textContent);
    mostrarLegenda(msgFinal.textContent);
}

// ─── Trocar de tela ──────────────────────────────────────────────
function trocarTela(nova) {
    [telaInicio, telaJogo, telaNivel, telaFinal].forEach(function (t) {
        t.classList.add('escondido');
    });
    nova.classList.remove('escondido');
}

// ─── Reiniciar ───────────────────────────────────────────────────
function reiniciar() {
    nivelAtual = 0;
    roundAtual = 0;
    errosTotal = 0;
    trocarTela(telaInicio);
}

// ════════════════════════════════════════════════════════════════
// ─── INICIALIZAÇÃO ──────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
btnStart.addEventListener('click', function () {
    nivelAtual = 0;
    roundAtual = 0;
    errosTotal = 0;
    videoOk = true; // re-tenta os vídeos a cada partida
    trocarTela(telaJogo);
    carregarRound();
});

btnProxNivel.addEventListener('click', proximoNivel);
btnRestart.addEventListener('click', reiniciar);
btnRepetir.addEventListener('click', repetirSequencia);

})();