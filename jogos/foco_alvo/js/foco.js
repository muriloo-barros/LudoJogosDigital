// ════════════════════════════════════════════════════════════════
// FOCO NO ALVO — Lógica do jogo (VERSÃO COMPLETA E CORRIGIDA)
// Atenção seletiva e sustentada para crianças com TDAH
// ════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ─── Tipos de elemento ───────────────────────────────────────────
const AMARELO = '#FFD32A';
const AZUL    = '#0fbcf9';

function svgEstrela(cor) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<polygon points="50,5 61,38 95,38 67,59 78,92 50,71 22,92 33,59 5,38 39,38" fill="' + cor + '" stroke="#3d1f0a" stroke-width="4"/></svg>';
}
function svgCirculo(cor) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<circle cx="50" cy="50" r="42" fill="' + cor + '" stroke="#3d1f0a" stroke-width="4"/></svg>';
}

const TIPOS = {
    'estrela-amarela': { nome: 'estrela amarela', plural: 'estrelas amarelas', svg: svgEstrela(AMARELO) },
    'estrela-azul':    { nome: 'estrela azul',    plural: 'estrelas azuis',    svg: svgEstrela(AZUL)    },
    'circulo-amarelo': { nome: 'círculo amarelo', plural: 'círculos amarelos', svg: svgCirculo(AMARELO) },
    'circulo-azul':    { nome: 'círculo azul',    plural: 'círculos azuis',    svg: svgCirculo(AZUL)    }
};

// ─── Níveis e rounds ─────────────────────────────────────────────
// fácil: distrator = mesma forma, cor errada
// médio: + forma errada, mesma cor
// difícil: todos os outros 3 tipos
const NIVEIS = [
    { nome: 'Fácil',   rounds: 5, alvos: 4, distratores: 3, pool: 'facil'   },
    { nome: 'Médio',   rounds: 5, alvos: 5, distratores: 5, pool: 'medio'   },
    { nome: 'Difícil', rounds: 5, alvos: 6, distratores: 7, pool: 'dificil' }
];

const CICLO_ALVOS = ['estrela-amarela', 'circulo-amarelo', 'estrela-azul', 'circulo-azul', 'estrela-amarela'];

// ─── Estado ──────────────────────────────────────────────────────
let nivelAtual = 0;
let roundAtual = 0;
let acertosRound = 0;
let totalAlvos = 0;
let tocadasDistrator = 0;
let roundEmAndamento = false;
let alvoAtual = '';

// ─── DOM ─────────────────────────────────────────────────────────
const telaInicio = document.getElementById('tela-inicio');
const telaJogo   = document.getElementById('tela-jogo');
const telaNivel  = document.getElementById('tela-nivel');
const telaFinal  = document.getElementById('tela-final');
const btnStart   = document.getElementById('btn-start');
const btnProxNivel = document.getElementById('btn-proximo-nivel');
const btnRestart = document.getElementById('btn-restart');
const areaJogo   = document.getElementById('areaJogo');
const hudNivel   = document.getElementById('hud-nivel');
const hudRound   = document.getElementById('hud-round');
const hudAcertos = document.getElementById('hud-acertos');
const instrucao  = document.getElementById('instrucao-jogo');
const msgNivel   = document.getElementById('mensagem-nivel');
const msgFinal   = document.getElementById('mensagem-final');

// Blindagem: se o HTML não tiver os elementos, para aqui com aviso claro
if (!btnStart || !areaJogo || !telaJogo) {
    console.error('FOCO NO ALVO: elementos do HTML não encontrados. Verifique os IDs no foco.html.');
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

// ─── Efeitos sonoros (Web Audio API) ─────────────────────────────
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
function somNeutro() { beep(250, 0.15, 'sine', 0.06); }
function somRound()  { beep(523, 0.12, 'sine', 0.1); setTimeout(function () { beep(784, 0.15, 'sine', 0.1); }, 120); }
function somNivel() {
    beep(523, 0.12, 'sine', 0.1);
    setTimeout(function () { beep(659, 0.12, 'sine', 0.1); }, 130);
    setTimeout(function () { beep(784, 0.2, 'sine', 0.1); }, 260);
}
function somVitoria() {
    beep(523, 0.15, 'sine', 0.1);
    setTimeout(function () { beep(659, 0.15, 'sine', 0.1); }, 150);
    setTimeout(function () { beep(784, 0.15, 'sine', 0.1); }, 300);
    setTimeout(function () { beep(1047, 0.25, 'sine', 0.1); }, 450);
}

// ─── Utilidades ──────────────────────────────────────────────────
function embaralhar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
}

// CORRIGIDO: pools validados — fácil = mesma forma/cor errada,
// médio = + forma errada/mesma cor, difícil = todos os outros 3
function poolDistratores(tipoAlvo, nomePool) {
    const partes = tipoAlvo.split('-');
    const formaAlvo = partes[0];
    const corAlvo = partes[1];
    const outraForma = formaAlvo === 'estrela' ? 'circulo' : 'estrela';
    const outraCor = corAlvo === 'amarela' ? 'azul' : 'amarela';

    const mesmaFormaOutraCor = formaAlvo + '-' + outraCor;   // ex: estrela-azul
    const outraFormaMesmaCor = outraForma + '-' + corAlvo;   // ex: circulo-amarelo
    const outraFormaOutraCor = outraForma + '-' + outraCor;  // ex: circulo-azul

    let pool;
    if (nomePool === 'facil')      pool = [mesmaFormaOutraCor];
    else if (nomePool === 'medio') pool = [mesmaFormaOutraCor, outraFormaMesmaCor];
    else                           pool = [mesmaFormaOutraCor, outraFormaMesmaCor, outraFormaOutraCor];

    // Blindagem: só tipos que EXISTEM no TIPOS e são diferentes do alvo
    pool = pool.filter(function (t) {
        return TIPOS.hasOwnProperty(t) && t !== tipoAlvo;
    });
    // Se sobrar vazio (impossível na teoria, mas garante nunca faltar distrator)
    if (pool.length === 0) {
        pool = Object.keys(TIPOS).filter(function (t) { return t !== tipoAlvo; });
    }
    return pool;
}

// ─── Carregar round ──────────────────────────────────────────────
function carregarRound() {
    const nivel = NIVEIS[nivelAtual];
    const tipoAlvo = CICLO_ALVOS[roundAtual % CICLO_ALVOS.length];
    alvoAtual = tipoAlvo;

    roundEmAndamento = true;
    acertosRound = 0;
    totalAlvos = nivel.alvos;

    hudNivel.textContent = 'NÍVEL: ' + nivel.nome;
    hudRound.textContent = 'ROUND: ' + (roundAtual + 1) + '/' + nivel.rounds;
    hudAcertos.textContent = 'Alvos: 0/' + nivel.alvos;

    // CORRIGIDO: usa o plural correto ("estrelas amarelas")
    const frase = 'Round ' + (roundAtual + 1) + '. Clique só nas ' + TIPOS[tipoAlvo].plural + '!';
    instrucao.textContent = '👉 Clique só nas ' + TIPOS[tipoAlvo].plural.toUpperCase() + '!';
    falarSeguro(frase);
    mostrarLegenda(frase);

    renderElementos(tipoAlvo, nivel);
}

function renderElementos(tipoAlvo, nivel) {
    areaJogo.innerHTML = '';

    const COLS = 5, ROWS = 4;
    const celulas = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            celulas.push({ c: c, r: r });
        }
    }

    // Quantidade de distratores SEMPRE definida e >= 1
    let qtdDistratores = parseInt(nivel.distratores, 10);
    if (isNaN(qtdDistratores) || qtdDistratores < 1) qtdDistratores = Math.max(2, nivel.alvos - 1);

    const posicoes = embaralhar(celulas).slice(0, nivel.alvos + qtdDistratores);

    const elementos = [];
    for (let i = 0; i < nivel.alvos; i++) elementos.push({ tipo: tipoAlvo, isAlvo: true });

    const pool = poolDistratores(tipoAlvo, nivel.pool);
    for (let i = 0; i < qtdDistratores; i++) {
        elementos.push({ tipo: pool[Math.floor(Math.random() * pool.length)], isAlvo: false });
    }

    elementos.forEach(function (el, i) {
        const pos = posicoes[i];
        const btn = document.createElement('button');
        btn.className = 'elemento-alvo';
        btn.setAttribute('aria-label', TIPOS[el.tipo].nome);
        btn.innerHTML = TIPOS[el.tipo].svg;
        btn.style.animationDelay = (i * 0.04) + 's';

        const cx = (pos.c + 0.5) / COLS * 100;
        const cy = (pos.r + 0.5) / ROWS * 100;
        const jitX = (Math.random() - 0.5) * (100 / COLS) * 0.4;
        const jitY = (Math.random() - 0.5) * (100 / ROWS) * 0.4;
        btn.style.left = 'calc(' + (cx + jitX) + '% - 30px)';
        btn.style.top  = 'calc(' + (cy + jitY) + '% - 30px)';

        btn.addEventListener('click', function () {
            if (!roundEmAndamento) return;
            if (el.isAlvo) {
                acertarAlvo(btn);
            } else {
                tocarDistrator(btn);
            }
        });

        areaJogo.appendChild(btn);
    });
}

// ─── Acertou o alvo ──────────────────────────────────────────────
function acertarAlvo(btn) {
    btn.classList.add('acertado');
    somAcerto();
    acertosRound++;
    hudAcertos.textContent = 'Alvos: ' + acertosRound + '/' + totalAlvos;

    if (acertosRound >= totalAlvos) {
        roundEmAndamento = false;
        setTimeout(roundCompleto, 400);
    }
}

// ─── Tocou num distrator: feedback SUAVE ─────────────────────────
function tocarDistrator(btn) {
    btn.classList.remove('errado-tap');
    void btn.offsetWidth; // reinicia a animação
    btn.classList.add('errado-tap');
    somNeutro();
    tocadasDistrator++;
    mostrarLegenda('Ops! Esse não é o alvo! Procure ' + TIPOS[alvoAtual].plural + '.');
}

// ─── Round completo ──────────────────────────────────────────────
function roundCompleto() {
    somRound();
    const nivel = NIVEIS[nivelAtual];

    if (roundAtual < nivel.rounds - 1) {
        roundAtual++;
        const frase = 'Muito bem! Round ' + roundAtual + ' completo!';
        falarSeguro(frase, function () { setTimeout(carregarRound, 300); });
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
        '! Foram ' + (nivel.rounds * nivel.alvos) + ' alvos acertados.';

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
    const totalRounds = NIVEIS.length * NIVEIS[0].rounds;
    const totalAlvosJogo = NIVEIS.reduce(function (soma, n) {
        return soma + n.rounds * n.alvos;
    }, 0);

    const medalhaEl = document.querySelector('#tela-final .medalha-animada');

    if (tocadasDistrator <= 3) {
        if (medalhaEl) medalhaEl.textContent = '🏆';
        msgFinal.textContent = 'Incrível! Você achou ' + totalAlvosJogo +
            ' alvos e se distraiu pouco (' + tocadasDistrator +
            ' cliques em distratores). Sua atenção está muito boa!';
    } else if (tocadasDistrator <= 10) {
        if (medalhaEl) medalhaEl.textContent = '🥇';
        msgFinal.textContent = 'Muito bem! Você achou ' + totalAlvosJogo +
            ' alvos, com ' + tocadasDistrator +
            ' cliques em distratores. Continue praticando!';
    } else {
        if (medalhaEl) medalhaEl.textContent = '🌟';
        msgFinal.textContent = 'Você completou as ' + totalRounds +
            ' rodadas e achou ' + totalAlvosJogo + ' alvos! ' +
            'Jogue de novo para ficar ainda mais focado!';
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
    tocadasDistrator = 0;
    trocarTela(telaInicio);
}

// ════════════════════════════════════════════════════════════════
// ─── INICIALIZAÇÃO ──────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
btnStart.addEventListener('click', function () {
    nivelAtual = 0;
    roundAtual = 0;
    tocadasDistrator = 0;
    trocarTela(telaJogo);
    carregarRound();
});

btnProxNivel.addEventListener('click', proximoNivel);
btnRestart.addEventListener('click', reiniciar);

})();