// ════════════════════════════════════════════════════════════════
// CAÇA AO TESOURO POR INSTRUÇÃO VERBAL — Lógica do jogo
// Memória sequencial + escuta ativa (complementa o Super Ouvido)
// ════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ─── Direções ────────────────────────────────────────────────────
const DIRS = {
    up:    { dx: 0,  dy: -1, nome: 'pra cima',     icone: '⬆️' },
    down:  { dx: 0,  dy: 1,  nome: 'pra baixo',    icone: '⬇️' },
    left:  { dx: -1, dy: 0,  nome: 'pra esquerda', icone: '⬅️' },
    right: { dx: 1,  dy: 0,  nome: 'pra direita',  icone: '➡️' }
};
const OPOSTOS = { up: 'down', down: 'up', left: 'right', right: 'left' };
const CHAVES_TECLA = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

// ─── Níveis (nº de comandos na sequência) ────────────────────────
const NIVEIS = [
    { nome: 'Fácil',   rounds: 5, comandos: 2 },
    { nome: 'Médio',   rounds: 5, comandos: 3 },
    { nome: 'Difícil', rounds: 5, comandos: 4 }
];
const TAM = 5; // grade 5×5

// ─── Estado ──────────────────────────────────────────────────────
let nivelAtual = 0;
let roundAtual = 0;
let sequencia = [];        // [{dir:'up', passos:2}, ...]
let etapa = 0;             // índice do comando atual
let passosRestantes = 0;
let pos = { x: 0, y: 0 };  // posição atual do passarinho
let inicio = { x: 0, y: 0 };
let tesouro = { x: 0, y: 0 };
let aceitandoInput = false;
let errosTotal = 0;
let modoMapa = false;
let marcador = null;
let celulasGrade = [];

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
const hudComando = document.getElementById('hud-comando');
const instrucao  = document.getElementById('instrucao-jogo');
const palcoPersonagem = document.getElementById('palcoPersonagem');
const comandosFita = document.getElementById('comandosFita');
const mapaWrap   = document.getElementById('mapaWrap');
const gradeMapa  = document.getElementById('gradeMapa');
const togMapaTutor = document.getElementById('togMapaTutor');
const msgNivel   = document.getElementById('mensagem-nivel');
const msgFinal   = document.getElementById('mensagem-final');

// Blindagem
if (!btnStart || !telaJogo || !gradeMapa) {
    console.error('CAÇA AO TESOURO: elementos do HTML não encontrados. Verifique os IDs no caca.html.');
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
function somPasso()      { beep(700, 0.06, 'sine', 0.07); }
function somNeutro()     { beep(250, 0.18, 'sine', 0.07); }
function somSuaVez()     { beep(523, 0.1, 'sine', 0.1); setTimeout(function () { beep(659, 0.12, 'sine', 0.1); }, 110); }
function somTesouro()    { beep(659, 0.12, 'sine', 0.1); setTimeout(function () { beep(784, 0.12, 'sine', 0.1); }, 130); setTimeout(function () { beep(1047, 0.25, 'sine', 0.1); }, 260); }
function somNivel()      { beep(523, 0.12, 'sine', 0.1); setTimeout(function () { beep(659, 0.12, 'sine', 0.1); }, 130); setTimeout(function () { beep(784, 0.2, 'sine', 0.1); }, 260); }
function somVitoria()    { beep(523, 0.15, 'sine', 0.1); setTimeout(function () { beep(659, 0.15, 'sine', 0.1); }, 150); setTimeout(function () { beep(784, 0.15, 'sine', 0.1); }, 300); setTimeout(function () { beep(1047, 0.25, 'sine', 0.1); }, 450); }

// ─── Geração da sequência (sempre dentro da grade) ───────────────
function gerarSequencia(qtd) {
    let x, y, tentativas = 0;
    do {
        x = Math.floor(Math.random() * TAM);
        y = Math.floor(Math.random() * TAM);
        tentativas++;
    } while (false); // posição inicial aleatória simples

    inicio = { x: x, y: y };
    pos = { x: x, y: y };
    const seq = [];
    let guarda = 0;
    while (seq.length < qtd && guarda < 200) {
        guarda++;
        const chaves = ['up', 'down', 'left', 'right'];
        const dir = chaves[Math.floor(Math.random() * 4)];
        const passos = 1 + Math.floor(Math.random() * 2); // 1 ou 2
        const nx = pos.x + DIRS[dir].dx * passos;
        const ny = pos.y + DIRS[dir].dy * passos;
        if (nx < 0 || nx >= TAM || ny < 0 || ny >= TAM) continue;       // sai da grade? tenta outra
        if (seq.length > 0 && seq[seq.length - 1].dir === OPOSTOS[dir]) continue; // não desfaz o anterior
        seq.push({ dir: dir, passos: passos });
        pos.x = nx; pos.y = ny;
    }
    // Garantia: se algo improvável falhou, sequência mínima forçada
    while (seq.length < qtd) {
        const dir = (pos.x < TAM - 1) ? 'right' : 'down';
        const espacoDireita = TAM - 1 - pos.x;
        const espacoBaixo = TAM - 1 - pos.y;
        const maxPassos = (dir === 'right') ? espacoDireita : espacoBaixo;
        if (maxPassos < 1) break;
        const passos = Math.min(2, maxPassos);
        seq.push({ dir: dir, passos: passos });
        pos.x += DIRS[dir].dx * passos;
        pos.y += DIRS[dir].dy * passos;
    }
    tesouro = { x: pos.x, y: pos.y };
    pos = { x: inicio.x, y: inicio.y }; // FIX: devolve o personagem ao início da trilha
    return seq;
}

// ─── Frase da sequência (narração) ───────────────────────────────
function fraseSequencia() {
    const conectores = ['Primeiro,', 'Depois,', 'Em seguida,', 'Por fim,'];
    let f = '';
    sequencia.forEach(function (c, i) {
        const con = sequencia.length > 1 ? (conectores[i] || 'Depois,') : '';
        f += con + ' vá ' + c.passos + (c.passos > 1 ? ' passos' : ' passo') + ' ' + DIRS[c.dir].nome + '. ';
    });
    return f;
}

// ─── Fita de comandos (apoio visual) ─────────────────────────────
function renderFita() {
    comandosFita.innerHTML = '';
    sequencia.forEach(function (c, i) {
        const chip = document.createElement('div');
        chip.className = 'comando-chip';
        chip.innerHTML = '<span class="icone-comando">' + DIRS[c.dir].icone + '</span> ×' + c.passos;
        chip.setAttribute('aria-label', c.passos + (c.passos > 1 ? ' passos ' : ' passo ') + DIRS[c.dir].nome);
        comandosFita.appendChild(chip);
    });
    destacarFita();
}
function destacarFita() {
    const chips = comandosFita.children;
    for (let i = 0; i < chips.length; i++) {
        chips[i].classList.remove('ativo', 'feito');
        if (i < etapa) chips[i].classList.add('feito');
        else if (i === etapa && aceitandoInput) chips[i].classList.add('ativo');
    }
}

// ─── Mapa do tutor ───────────────────────────────────────────────
function renderMapa() {
    if (!modoMapa) return;
    gradeMapa.innerHTML = '';
    celulasGrade = [];
    for (let y = 0; y < TAM; y++) {
        for (let x = 0; x < TAM; x++) {
            const cel = document.createElement('div');
            cel.className = 'celula';
            if (x === inicio.x && y === inicio.y) cel.classList.add('partida');
            if (x === tesouro.x && y === tesouro.y) cel.classList.add('tesouro');
            gradeMapa.appendChild(cel);
            celulasGrade.push(cel);
        }
    }
    marcador = document.createElement('div');
    marcador.className = 'passarinho-marcador';
    gradeMapa.appendChild(marcador);
    // Espera o layout ser calculado antes de medir (fix do labirinto)
    requestAnimationFrame(function () { atualizarMapa(); });
}
function atualizarMapa() {
    if (!marcador || !modoMapa) return;
    const larguraCel = gradeMapa.clientWidth / TAM;
    const alturaCel = gradeMapa.clientHeight / TAM;
    marcador.style.width = larguraCel + 'px';
    marcador.style.height = alturaCel + 'px';
    marcador.style.fontSize = (larguraCel * 0.7) + 'px';
    marcador.style.left = (pos.x * larguraCel) + 'px';
    marcador.style.top = (pos.y * alturaCel) + 'px';
}

// ─── Carregar round ──────────────────────────────────────────────
function carregarRound() {
    const nivel = NIVEIS[nivelAtual];
    sequencia = gerarSequencia(nivel.comandos);
    // Blindagem: garante que o personagem sempre começa na partida, nunca no tesouro
    pos = { x: inicio.x, y: inicio.y };
    etapa = 0;
    passosRestantes = sequencia[0].passos;
    aceitandoInput = false;
    btnRepetir.disabled = true;

    hudNivel.textContent = 'NÍVEL: ' + nivel.nome;
    hudRound.textContent = 'ROUND: ' + (roundAtual + 1) + '/' + nivel.rounds;
    hudComando.textContent = 'Ouça com atenção...';
    instrucao.textContent = '🔊 Preste atenção nos comandos!';
    palcoPersonagem.classList.remove('errado');
    palcoPersonagem.textContent = '🐤';

    modoMapa = !!(togMapaTutor && togMapaTutor.checked);
    if (modoMapa) { mapaWrap.classList.add('visivel'); renderMapa(); }
    else { mapaWrap.classList.remove('visivel'); }

    renderFita();

    const frase = 'Round ' + (roundAtual + 1) + '. ' + fraseSequencia() + ' Preste atenção!';
    falarSeguro(frase, iniciarExecucao);
    mostrarLegenda(frase);
}

// ─── Iniciar execução (após a narração) ──────────────────────────
function iniciarExecucao() {
    aceitandoInput = true;
    btnRepetir.disabled = false;
    somSuaVez();
    instrucao.textContent = '👉 Sua vez! Aperte as setas na ordem que você ouviu!';
    hudComando.textContent = 'Comando 1/' + sequencia.length;
    destacarFita();
}

// ─── Repetir a sequência ─────────────────────────────────────────
function repetirSequencia() {
    if (sequencia.length === 0) return;
    aceitandoInput = false;
    btnRepetir.disabled = true;
    instrucao.textContent = '🔊 Ouvindo de novo...';
    const frase = 'Atenção de novo! ' + fraseSequencia();
    falarSeguro(frase, function () {
        aceitandoInput = true;
        btnRepetir.disabled = false;
        instrucao.textContent = '👉 Sua vez! Continuando do comando ' + (etapa + 1) + '!';
        destacarFita();
    });
    mostrarLegenda(frase);
}

// ─── Teclado ─────────────────────────────────────────────────────
function onKeydown(e) {
    if (telaJogo.classList.contains('escondido')) return;
    const dir = CHAVES_TECLA[e.key];
    if (!dir) return;
    e.preventDefault();
    if (!aceitandoInput) return;

    if (dir === sequencia[etapa].dir) {
        moverUmPasso(dir);
    } else {
        erroTecla(dir);
    }
}

function moverUmPasso(dir) {
    pos.x += DIRS[dir].dx;
    pos.y += DIRS[dir].dy;
    passosRestantes--;
    somPasso();

    palcoPersonagem.classList.remove('passo');
    void palcoPersonagem.offsetWidth;
    palcoPersonagem.classList.add('passo');
    atualizarMapa();

    if (passosRestantes <= 0) {
        etapa++;
        if (etapa >= sequencia.length) {
            roundCompleto();
            return;
        }
        passosRestantes = sequencia[etapa].passos;
    }
    hudComando.textContent = 'Comando ' + (etapa + 1) + '/' + sequencia.length +
        ' · faltam ' + passosRestantes + (passosRestantes > 1 ? ' passos' : ' passo');
    destacarFita();
}

// ─── Erro: som neutro + shake + comando repetido (sem punição) ───
function erroTecla(dirApertada) {
    somNeutro();
    errosTotal++;
    palcoPersonagem.classList.remove('errado');
    void palcoPersonagem.offsetWidth;
    palcoPersonagem.classList.add('errado');

    const c = sequencia[etapa];
    const frase = 'Opa! O comando atual é: ' + c.passos + (c.passos > 1 ? ' passos' : ' passo') + ' ' + DIRS[c.dir].nome + '.';
    instrucao.textContent = '🔁 ' + DIRS[c.dir].icone + ' ' + c.passos + (c.passos > 1 ? ' passos ' : ' passo ') + DIRS[c.dir].nome + '!';
    falarSeguro(frase);
    mostrarLegenda(frase);
}

// ─── Round completo (chegou no tesouro) ──────────────────────────
function roundCompleto() {
    aceitandoInput = false;
    btnRepetir.disabled = true;
    somTesouro();
    palcoPersonagem.textContent = '🎉';

    const nivel = NIVEIS[nivelAtual];
    if (roundAtual < nivel.rounds - 1) {
        roundAtual++;
        const frase = 'Você achou o tesouro! Muito bem!';
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
        '! Seguiu ' + (nivel.rounds * nivel.comandos) + ' comandos na ordem certa!';

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
    const totalComandos = NIVEIS.reduce(function (soma, n) { return soma + n.rounds * n.comandos; }, 0);
    const medalhaEl = document.querySelector('#tela-final .medalha-animada');

    if (errosTotal <= 3) {
        if (medalhaEl) medalhaEl.textContent = '🏆';
        msgFinal.textContent = 'Memória de elefante! Você seguiu ' + totalComandos +
            ' comandos na ordem, com só ' + errosTotal + ' deslizes!';
    } else if (errosTotal <= 10) {
        if (medalhaEl) medalhaEl.textContent = '🥇';
        msgFinal.textContent = 'Muito bem! ' + totalComandos + ' comandos seguidos na ordem, com ' +
            errosTotal + ' deslizes. Continue praticando!';
    } else {
        if (medalhaEl) medalhaEl.textContent = '🌟';
        msgFinal.textContent = 'Você completou todas as rodadas e achou todos os tesouros! ' +
            'Jogue de novo para afiar ainda mais sua memória!';
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
btnRepetir.addEventListener('click', repetirSequencia);
document.addEventListener('keydown', onKeydown);

window.addEventListener('resize', function () {
    if (modoMapa) atualizarMapa();
});

})();