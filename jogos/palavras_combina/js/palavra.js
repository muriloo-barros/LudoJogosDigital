// ════════════════════════════════════════════════════════════════
// PALAVRA QUE COMBINA — Lógica do jogo
// Associação sinal de Libras (alfabeto manual) ↔ palavra escrita
// 4 níveis: Fácil (reconhecimento), Médio (flash 2s),
// Difícil (memorização do par sinal ↔ palavra), Invertido (palavra → sinal)
// 5 rounds cada. Imagens em imgs/libras/A.png ... F.png (fallback: letra)
// ════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ─── Banco de palavras: 3 por letra, mesma inicial (revisável) ──
const BANCO = {
    A: ['AVIÃO', 'ÁGUA', 'AMIGO'],
    B: ['BOLO', 'BOLA', 'BONECA'],
    C: ['CASA', 'CACHORRO', 'CADEIRA'],
    D: ['DADO', 'DEZ', 'DENTE'],
    E: ['ELEFANTE', 'ESCOLA', 'ESTRELA'],
    F: ['FLOR', 'FOGO', 'FESTA']
};

const LETRAS = [
    { letra: 'A', cor: '#ef5777' },
    { letra: 'B', cor: '#0fbcf9' },
    { letra: 'C', cor: '#feca57' },
    { letra: 'D', cor: '#05c46b' },
    { letra: 'E', cor: '#ff9f43' },
    { letra: 'F', cor: '#a55eea' }
];
const MAPA_LETRAS = {};
LETRAS.forEach(function (l) { MAPA_LETRAS[l.letra] = l; });

// ─── Níveis ──────────────────────────────────────────────────────
const NIVEIS = [
    { nome: 'Fácil',     rounds: 5, modo: 'normal', flash: 0,    distratores: 'diferentes' },
    { nome: 'Médio',     rounds: 5, modo: 'normal', flash: 2000, distratores: 'diferentes' },
    { nome: 'Difícil',   rounds: 5, modo: 'normal', flash: 0,    distratores: 'mesma' },
    { nome: 'Invertido', rounds: 5, modo: 'invertido' }
];
const TEMPO_PAR = 2500; // duração da fase de memorização do par (Difícil)

// ─── Estado ──────────────────────────────────────────────────────
let nivelAtual = 0;
let roundAtual = 0;
let alvo = 'A';
let palavraAlvo = '';
let opcoes = [];
let aceitandoInput = false;
let errosTotal = 0;
let flashTimer = null;

// ─── DOM ─────────────────────────────────────────────────────────
const telaInicio = document.getElementById('tela-inicio');
const telaJogo   = document.getElementById('tela-jogo');
const telaNivel  = document.getElementById('tela-nivel');
const telaFinal  = document.getElementById('tela-final');
const btnStart   = document.getElementById('btn-start');
const btnProxNivel = document.getElementById('btn-proximo-nivel');
const btnRestart = document.getElementById('btn-restart');
const hudNivel   = document.getElementById('hud-nivel');
const hudRound   = document.getElementById('hud-round');
const hudAlvo    = document.getElementById('hud-alvo');
const instrucao  = document.getElementById('instrucao-jogo');
const imgSinal   = document.getElementById('imgSinal');
const fallbackEl = document.getElementById('fallbackLetra');
const palcoPalavra = document.getElementById('palcoPalavra');
const palcoMascote = document.getElementById('palcoMascote');
const palcoDica  = document.getElementById('palcoDica');
const opcoesArea = document.getElementById('opcoesArea');
const msgNivel   = document.getElementById('mensagem-nivel');
const msgFinal   = document.getElementById('mensagem-final');

// Blindagem
if (!btnStart || !telaJogo || !opcoesArea || !imgSinal || !palcoPalavra) {
    console.error('PALAVRA QUE COMBINA: elementos do HTML não encontrados. Verifique os IDs no palavra.html.');
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
    // ⏱️ Timeout de segurança: callback SEMPRE dispara, mesmo se a
    // narração falhar, for interrompida ou não suportar callback.
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
            // Chrome bug: onend dispara antes da fala terminar de verdade
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
function somNivel()  { beep(523, 0.12, 'sine', 0.1); setTimeout(function () { beep(659, 0.12, 'sine', 0.1); }, 130); setTimeout(function () { beep(784, 0.2, 'sine', 0.1); }, 260); }
function somVitoria(){ beep(523, 0.15, 'sine', 0.1); setTimeout(function () { beep(659, 0.15, 'sine', 0.1); }, 150); setTimeout(function () { beep(784, 0.15, 'sine', 0.1); }, 300); setTimeout(function () { beep(1047, 0.25, 'sine', 0.1); }, 450); }

// ─── Utilidades ──────────────────────────────────────────────────
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}
function letraAleatoria(exceto) {
    let l;
    do { l = LETRAS[Math.floor(Math.random() * LETRAS.length)].letra; }
    while (exceto && exceto.indexOf(l) !== -1);
    return l;
}

// ─── Mostrar sinal no palco (imagem ou fallback) ─────────────────
function mostrarSinal(letra) {
    palcoPalavra.classList.add('escondido');
    fallbackEl.textContent = '✋ ' + letra;
    fallbackEl.classList.remove('escondido');
    imgSinal.style.display = 'none';
    const img = new Image();
    img.onload = function () {
        imgSinal.src = img.src;
        imgSinal.alt = 'Sinal de Libras da letra ' + letra;
        imgSinal.style.display = 'block';
        fallbackEl.classList.add('escondido');
    };
    // Sem imagem ou com erro → letra gigante permanece (nada quebra)
    img.src = 'imgs/libras/' + letra + '.png';
}
function esconderSinal() {
    imgSinal.style.display = 'none';
    fallbackEl.classList.add('escondido');
    palcoPalavra.textContent = '❓';
    palcoPalavra.classList.remove('escondido');
}
function mostrarMascote() {
    palcoMascote.classList.remove('escondido');
    palcoMascote.style.animation = 'none';
    void palcoMascote.offsetWidth;
    palcoMascote.style.animation = '';
    setTimeout(function () { palcoMascote.classList.add('escondido'); }, 900);
}

// ─── Renderizar opções ───────────────────────────────────────────
function renderOpcoes() {
    opcoesArea.innerHTML = '';
    opcoes.forEach(function (op) {
        const btn = document.createElement('button');
        btn.dataset.valor = op.valor;
        if (opcoesPalavras()) {
            btn.className = 'card-palavra';
            btn.textContent = op.valor;
            btn.setAttribute('aria-label', 'Palavra ' + op.valor);
        } else {
            const l = MAPA_LETRAS[op.valor];
            btn.className = 'card-sinal';
            btn.style.background = l.cor;
            btn.innerHTML = '<span class="card-mao" aria-hidden="true">✋</span>' +
                            '<span class="card-letra">' + op.valor + '</span>';
            btn.setAttribute('aria-label', 'Sinal de Libras da letra ' + op.valor);
        }
        btn.addEventListener('click', function () {
            if (!aceitandoInput) return;
            if (op.correta) acertar(btn);
            else errar(btn);
        });
        opcoesArea.appendChild(btn);
    });
}
function opcoesPalavras() {
    return NIVEIS[nivelAtual].modo !== 'invertido';
}

// ─── Carregar round ──────────────────────────────────────────────
function carregarRound() {
    const nivel = NIVEIS[nivelAtual];
    if (flashTimer) { clearTimeout(flashTimer); flashTimer = null; }
    aceitandoInput = false;

    alvo = letraAleatoria(null);
    palavraAlvo = BANCO[alvo][Math.floor(Math.random() * BANCO[alvo].length)];

    hudNivel.textContent = 'NÍVEL: ' + nivel.nome;
    hudRound.textContent = 'ROUND: ' + (roundAtual + 1) + '/' + nivel.rounds;

    palcoPalavra.classList.remove('correta');
    palcoDica.classList.remove('palavra-par');
    opcoesArea.innerHTML = '';

    if (nivel.modo === 'invertido') {
        // INVERTIDO: palavra no palco → criança escolhe o sinal
        opcoes = shuffle([
            { valor: alvo, correta: true },
            { valor: letraAleatoria([alvo]), correta: false },
            { valor: letraAleatoria([alvo]), correta: false }
        ]);
        palcoPalavra.textContent = palavraAlvo;
        palcoPalavra.classList.remove('escondido');
        imgSinal.style.display = 'none';
        fallbackEl.classList.add('escondido');
        hudAlvo.textContent = 'SINAL: ' + palavraAlvo;
        instrucao.textContent = '👀 Qual é o sinal de ' + palavraAlvo + '?';
        palcoDica.textContent = 'Clique no sinal que combina!';
        const frase = 'Round ' + (roundAtual + 1) + '. Qual é o sinal da palavra ' + palavraAlvo + '?';
        falarSeguro(frase);
        mostrarLegenda(frase);
        renderOpcoes();
        aceitandoInput = true;
    } else {
        // Sinal no palco → criança escolhe a palavra
        let distratores = [];
        if (nivel.distratores === 'mesma') {
            // DIFÍCIL: as 3 palavras da MESMA letra — exige a memorização do par
            distratores = BANCO[alvo].slice();
        } else {
            // FÁCIL/MÉDIO: iniciais diferentes — reconhecimento da letra
            const l1 = letraAleatoria([alvo]);
            const l2 = letraAleatoria([alvo, l1]);
            distratores = [BANCO[l1][Math.floor(Math.random() * BANCO[l1].length)],
                           BANCO[l2][Math.floor(Math.random() * BANCO[l2].length)]];
            distratores.push(palavraAlvo);
        }
        opcoes = shuffle(distratores.map(function (p) {
            return { valor: p, correta: (p === palavraAlvo) };
        }));

        mostrarSinal(alvo);
        hudAlvo.textContent = 'SINAL: ' + alvo;
        renderOpcoes();

        if (nivel.distratores === 'mesma') {
            // DIFÍCIL: fase de memorização do par sinal ↔ palavra
            instrucao.textContent = '👀 Memorize o par! O sinal e a palavra vão aparecer juntos...';
            palcoDica.classList.add('palavra-par');
            palcoDica.textContent = '✋ ' + alvo + ' = ' + palavraAlvo;
            flashTimer = setTimeout(function () {
                palcoDica.classList.remove('palavra-par');
                palcoDica.textContent = 'Clique na palavra que estava com o sinal!';
                esconderSinal();
                aceitandoInput = true;
            }, TEMPO_PAR);
        } else {
            instrucao.textContent = '👀 Qual palavra combina com o sinal da letra ' + alvo + '?';
            palcoDica.textContent = 'Clique na palavra que combina!';
            const frase = 'Round ' + (roundAtual + 1) + '. Qual palavra combina com o sinal da letra ' + alvo + '?';
            falarSeguro(frase);
            mostrarLegenda(frase);

            if (nivel.flash > 0) {
                // MÉDIO: o sinal pisca e some — depois libera o input
                flashTimer = setTimeout(function () {
                    esconderSinal();
                    aceitandoInput = true;
                }, nivel.flash);
            } else {
                aceitandoInput = true;
            }
        }
    }
}

// ─── Acertou ─────────────────────────────────────────────────────
function acertar(btn) {
    aceitandoInput = false;
    btn.classList.remove('acerto-pulse');
    void btn.offsetWidth;
    btn.classList.add('acerto-pulse');
    somAcerto();
    mostrarMascote();

    const frase = 'Isso! ' + (opcoesPalavras()
        ? 'A letra ' + alvo + ', de ' + palavraAlvo + '!'
        : 'Essa é a letra ' + alvo + ', de ' + palavraAlvo + '!');
    instrucao.textContent = '🎉 Muito bem! ' + alvo + ' de ' + palavraAlvo + '!';

    if (roundAtual < NIVEIS[nivelAtual].rounds - 1) {
        roundAtual++;
        falarSeguro(frase, function () { setTimeout(carregarRound, 700); });
    } else {
        nivelCompleto();
    }
    mostrarLegenda(frase);
}

// ─── Errou: feedback suave, sem punição ──────────────────────────
function errar(btn) {
    somNeutro();
    errosTotal++;
    btn.classList.remove('errado');
    void btn.offsetWidth;
    btn.classList.add('errado');

    // Destaca a opção correta (fica visível até a criança acertar)
    opcoesArea.querySelectorAll('.card-palavra, .card-sinal').forEach(function (c) {
        const op = opcoes.find(function (o) { return o.valor === c.dataset.valor; });
        if (op && op.correta) c.classList.add('correta');
    });
    palcoPalavra.classList.add('correta');

    // Reexibe o sinal (nos níveis com flash/memorização ele havia sumido)
    if (NIVEIS[nivelAtual].modo === 'normal') mostrarSinal(alvo);

    const frase = 'Opa! A resposta certa é ' +
        (opcoesPalavras() ? 'a palavra ' + palavraAlvo : 'o sinal da letra ' + alvo) +
        '. Tente de novo!';
    instrucao.textContent = '🔁 Era ' +
        (opcoesPalavras() ? 'a palavra ' + palavraAlvo + '!' : 'o sinal da letra ' + alvo + '! Tente de novo!');
    falarSeguro(frase);
    mostrarLegenda(frase);
}

// ─── Nível completo ──────────────────────────────────────────────
function nivelCompleto() {
    somNivel();
    const nivel = NIVEIS[nivelAtual];
    msgNivel.textContent = 'Você completou o nível ' + nivel.nome +
        '! Fez ' + nivel.rounds + ' combinações de sinal e palavra!';

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
    const totalRounds = NIVEIS.reduce(function (soma, n) { return soma + n.rounds; }, 0);
    const medalhaEl = document.querySelector('#tela-final .medalha-animada');

    if (errosTotal <= 3) {
        if (medalhaEl) medalhaEl.textContent = '🏆';
        msgFinal.textContent = 'Leitor de sinais! Você fez ' + totalRounds +
            ' combinações com só ' + errosTotal + ' deslizes!';
    } else if (errosTotal <= 10) {
        if (medalhaEl) medalhaEl.textContent = '🥇';
        msgFinal.textContent = 'Muito bem! ' + totalRounds + ' combinações, com ' +
            errosTotal + ' deslizes. Continue praticando!';
    } else {
        if (medalhaEl) medalhaEl.textContent = '🌟';
        msgFinal.textContent = 'Você completou todos os níveis e conectou sinais às palavras! ' +
            'Jogue de novo para memorizar ainda mais!';
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
    trocarTela(telaJogo);
    carregarRound();
});

btnProxNivel.addEventListener('click', proximoNivel);
btnRestart.addEventListener('click', reiniciar);

})();