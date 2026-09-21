// ════════════════════════════════════════════════════════════════
// LABIRINTO SONORO — Lógica do jogo
// Para crianças cegas — orientação espacial 100% por áudio
// Personagem: 🐤 Passarinho | Objetivo: 🏡 Casinha
// ════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ─── Config das fases ────────────────────────────────────────────
const fases = [
    { tamanho: 5,  nome: "Iniciante" },
    { tamanho: 7,  nome: "Intermediário" },
    { tamanho: 9,  nome: "Avançado" },
    { tamanho: 11, nome: "Desafiador" }
];

// ─── Estado ──────────────────────────────────────────────────────
let faseAtual = 0;
let maze = null;
let tamanho = 0;
let playerX = 0, playerY = 0;
let exitX = 0, exitY = 0;
let modoMapa = false;
let celulasMapa = [];

// ─── DOM ─────────────────────────────────────────────────────────
const telaInicio = document.getElementById('tela-inicio');
const telaFase   = document.getElementById('tela-fase');
const telaJogo   = document.getElementById('tela-jogo');
const telaFinal  = document.getElementById('tela-final');
const btnStart   = document.getElementById('btn-start');
const btnJogarFase = document.getElementById('btn-jogar-fase');
const btnRestart = document.getElementById('btn-restart');
const mazePreview = document.getElementById('mazePreview');
const faseTitulo = document.getElementById('faseTitulo');
const faseDesc   = document.getElementById('faseDesc');
const hudFase    = document.getElementById('hud-fase');
const hudPos     = document.getElementById('hud-pos');
const hudDist    = document.getElementById('hud-dist');
const gameArea   = document.getElementById('gameArea');
const proxPreench = document.getElementById('proximidadePreenchimento');
const msgFinal   = document.getElementById('mensagem-final');
const togMapaTutor = document.getElementById('togMapaTutor');
const mapaLateral  = document.getElementById('mapaLateral');
const mapaTempoReal = document.getElementById('mapaTempoReal');

// ─── Narração (usa falar() do site.js se disponível, senão Web Speech direto) ─
let tokenFala = 0;

function falarSeguro(texto, callback) {
    tokenFala++;
    const meuToken = tokenFala;

    let callbackChamado = false;
    function dispararCallback() {
        if (callbackChamado) return;
        callbackChamado = true;
        if (meuToken === tokenFala && typeof callback === 'function') {
            callback();
        }
    }

    // ⏱️ Timeout de segurança:callback SEMPRE dispara, mesmo se a
    // narração falhar, for interrompida ou não suportar callback.
    // Piso calculado como no site.js: caracteres × 60ms + 1s de folga.
    const tempoSeguranca = Math.max(1500, texto.length * 60 + 1000);
    setTimeout(dispararCallback, tempoSeguranca);

    // Tenta usar falar() do site.js
    if (typeof falar === 'function') {
        try {
            falar(texto, function() {
                if (meuToken === tokenFala) dispararCallback();
            });
        } catch (e) {
            // falar() pode nem aceitar segundo argumento — segue o timeout
        }
        return;
    }

    // Fallback: Web Speech API direto
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(texto);
        utt.lang = 'pt-BR';
        if (typeof config !== 'undefined' && config.velocidade) {
            utt.rate = config.velocidade;
        }
        utt.onend = function() {
            // Chrome bug: onend dispara antes da fala de verdade terminar
            const minMs = Math.max(800, texto.length * 55);
            const elapsed = Date.now() - startTime;
            setTimeout(function() {
                if (meuToken === tokenFala) dispararCallback();
            }, Math.max(0, minMs - elapsed));
        };
        const startTime = Date.now();
        window.speechSynthesis.speak(utt);
        return;
    }

    // Sem suporte nenhum — callback já está garantido pelo timeout
}

function mostrarLegenda(texto) {
    // Tenta usar a função do site.js se existir
    if (typeof mostrarLegendaBox === 'function') {
        mostrarLegendaBox(texto);
        return;
    }

    // Fallback: manipula o DOM diretamente
    const span = document.getElementById('texto-legenda');
    const box = document.querySelector('.legenda-box');
    if (span && box) {
        span.textContent = texto;
        box.classList.add('ativa');
        clearTimeout(box._timerLegenda);
        box._timerLegenda = setTimeout(function() {
            box.classList.remove('ativa');
        }, 4000);
    }
}

// ─── Efeitos sonoros (Web Audio API) ─────────────────────────────
let audioCtx = null;
function beep(freq, dur, tipo, vol) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = tipo || 'sine';
        gain.gain.setValueAtTime(vol || 0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
}

function somMover() { beep(600, 0.03, 'sine', 0.05); }
function somParede(dir) {
    // Cada direção tem um tom grave diferente — a criança aprende a reconhecer
    const freqs = { up: 100, right: 120, down: 140, left: 160 };
    beep(freqs[dir] || 120, 0.25, 'sawtooth', 0.1);
}
function somSonar() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
}
function somProximidade(dist, maxDist) {
    const prox = 1 - (dist / maxDist);
    const pitch = 300 + prox * 700;
    setTimeout(() => beep(pitch, 0.08, 'sine', 0.08), 60);
}
function somFase() { beep(523, 0.15, 'sine', 0.1); setTimeout(() => beep(784, 0.15, 'sine', 0.1), 150); }
function somVitoria() {
    beep(523, 0.15, 'sine', 0.1);
    setTimeout(() => beep(659, 0.15, 'sine', 0.1), 150);
    setTimeout(() => beep(784, 0.15, 'sine', 0.1), 300);
    setTimeout(() => beep(1047, 0.25, 'sine', 0.1), 450);
}

// ─── Geração de labirinto (recursive backtracker iterativo) ──────
function gerarLabirinto(tam) {
    const m = Array(tam).fill(null).map(() => Array(tam).fill(1));
    const stack = [[0, 0]];
    m[0][0] = 0;

    while (stack.length > 0) {
        const [x, y] = stack[stack.length - 1];
        const dirs = [[0,-2],[2,0],[0,2],[-2,0]];
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        let carved = false;
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < tam && ny >= 0 && ny < tam && m[ny][nx] === 1) {
                m[y + dy/2][x + dx/2] = 0;
                m[ny][nx] = 0;
                stack.push([nx, ny]);
                carved = true;
                break;
            }
        }
        if (!carved) stack.pop();
    }

    m[tam-1][tam-1] = 0;
    if (tam > 1 && m[tam-2][tam-1] === 1 && m[tam-1][tam-2] === 1) {
        m[tam-2][tam-1] = 0;
    }
    return m;
}

// ─── Renderizar preview visual (tela de fase) ───────────────────
function renderPreview() {
    mazePreview.innerHTML = '';
    mazePreview.style.gridTemplateColumns = 'repeat(' + tamanho + ', 1fr)';
    mazePreview.style.gridTemplateRows = 'repeat(' + tamanho + ', 1fr)';

    for (let y = 0; y < tamanho; y++) {
        for (let x = 0; x < tamanho; x++) {
            const cell = document.createElement('div');
            cell.className = 'maze-cell ' + (maze[y][x] === 0 ? 'path' : 'wall');
            if (x === 0 && y === 0) {
                cell.classList.add('start');
                cell.classList.remove('path');
            }
            if (x === tamanho - 1 && y === tamanho - 1) {
                cell.classList.add('exit');
                cell.classList.remove('path');
            }
            mazePreview.appendChild(cell);
        }
    }
}

// ─── Mapa do tutor (tempo real) ─────────────────────────────────
let marcadorPassarinho = null;

function renderMapaLateral() {
    if (!mapaTempoReal) return;
    mapaTempoReal.innerHTML = '';
    mapaTempoReal.style.gridTemplateColumns = 'repeat(' + tamanho + ', 1fr)';
    mapaTempoReal.style.gridTemplateRows = 'repeat(' + tamanho + ', 1fr)';
    celulasMapa = [];
    for (let y = 0; y < tamanho; y++) {
        for (let x = 0; x < tamanho; x++) {
            const cell = document.createElement('div');
            cell.className = 'maze-cell ' + (maze[y][x] === 0 ? 'path' : 'wall');
            if (x === 0 && y === 0) { cell.classList.add('start'); cell.classList.remove('path'); }
            if (x === exitX && y === exitY) { cell.classList.add('exit'); cell.classList.remove('path'); }
            mapaTempoReal.appendChild(cell);
            celulasMapa.push(cell);
        }
    }
        // Cria o marcador UMA vez — ele flutua sobre o grid e nunca é apagado
    marcadorPassarinho = document.createElement('div');
    marcadorPassarinho.className = 'passarinho-marcador';
    mapaTempoReal.appendChild(marcadorPassarinho);
    // Espera o layout ser calculado antes de medir as células
    requestAnimationFrame(function () {
        atualizarMapaLateral();
    });
}

function atualizarMapaLateral() {
    if (!marcadorPassarinho || !mapaTempoReal) return;
    // Tamanho de cada célula = largura do grid ÷ número de colunas
    const larguraCelula = mapaTempoReal.clientWidth / tamanho;
    const alturaCelula  = mapaTempoReal.clientHeight / tamanho;
    marcadorPassarinho.style.width  = larguraCelula + 'px';
    marcadorPassarinho.style.height = alturaCelula + 'px';
    marcadorPassarinho.style.fontSize = (larguraCelula * 0.7) + 'px';
    marcadorPassarinho.style.left = (playerX * larguraCelula) + 'px';
    marcadorPassarinho.style.top  = (playerY * alturaCelula) + 'px';
}

// ─── Trocar de tela ──────────────────────────────────────────────
function trocarTela(nova) {
    [telaInicio, telaFase, telaJogo, telaFinal].forEach(t => t.classList.add('escondido'));
    nova.classList.remove('escondido');
}

// ─── Iniciar fase ────────────────────────────────────────────────
function iniciarFase() {
    const f = fases[faseAtual];
    tamanho = f.tamanho;
    maze = gerarLabirinto(tamanho);
    playerX = 0; playerY = 0;
    exitX = tamanho - 1; exitY = tamanho - 1;

    faseTitulo.textContent = 'Fase ' + (faseAtual + 1);
    faseDesc.textContent = 'Labirinto ' + tamanho + '\u00d7' + tamanho + ' \u2014 ' + f.nome;
    renderPreview();
    trocarTela(telaFase);

    const frase = 'Fase ' + (faseAtual + 1) + '. Labirinto ' + tamanho + ' por ' + tamanho + '. ' +
                  'Você é o passarinho 🐤 e está no canto de cima à esquerda. ' +
                  'A casinha 🏡 está no canto de baixo à direita. ' +
                  'Memorize o caminho e clique em Jogar.';
    falarSeguro(frase);
    mostrarLegenda(frase);
}

// ─── Iniciar jogo da fase (audio only) ───────────────────────────
function iniciarJogoFase() {
    trocarTela(telaJogo);
    hudFase.textContent = 'FASE ' + (faseAtual + 1) + '/' + fases.length;
    atualizarHUD();
    setTimeout(() => gameArea.focus(), 100);
    modoMapa = !!(togMapaTutor && togMapaTutor.checked);
    if (modoMapa) {
        mapaLateral.classList.add('visivel');
        renderMapaLateral();
    } else {
        mapaLateral.classList.remove('visivel');
    }

    const frase = 'Jogo iniciado! Você é o passarinho. Use as setas para voar pelo labirinto. ' +
                  'Pressione espaço para ouvir quais direções estão livres. ' +
                  'Encontre a casinha!';
    falarSeguro(frase, () => {
        setTimeout(() => ativarSonar(), 500);
    });
    mostrarLegenda(frase);
}

// ─── Tentar mover ────────────────────────────────────────────────
function tentarMover(dx, dy, dir) {
    const nx = playerX + dx;
    const ny = playerY + dy;

    if (nx < 0 || nx >= tamanho || ny < 0 || ny >= tamanho || maze[ny][nx] === 1) {
        // Bateu na parede
        somParede(dir);
        const dirNomes = { up: 'em cima', right: 'à direita', down: 'embaixo', left: 'à esquerda' };
        falarSeguro('Parede ' + (dirNomes[dir] || '') + '! O passarinho não pode passar.');
        return;
    }

    // Movimento OK
    playerX = nx;
    playerY = ny;
    somMover();

    const dist = Math.abs(playerX - exitX) + Math.abs(playerY - exitY);
    const maxDist = (tamanho - 1) * 2;
    somProximidade(dist, maxDist);

    atualizarHUD();
    if (modoMapa) atualizarMapaLateral();

    // Chegou na casinha?
    if (playerX === exitX && playerY === exitY) {
        faseCompleta();
    }
}

// ─── Sonar (narra 4 direções) ────────────────────────────────────
function ativarSonar() {
    somSonar();

    const dirs = {
        up:    (playerY > 0 && maze[playerY - 1][playerX] === 0),
        right: (playerX < tamanho - 1 && maze[playerY][playerX + 1] === 0),
        down:  (playerY < tamanho - 1 && maze[playerY + 1][playerX] === 0),
        left:  (playerX > 0 && maze[playerY][playerX - 1] === 0)
    };

    const parts = [];
    parts.push(dirs.up ? 'Cima livre' : 'Cima bloqueado');
    parts.push(dirs.right ? 'Direita livre' : 'Direita bloqueado');
    parts.push(dirs.down ? 'Baixo livre' : 'Baixo bloqueado');
    parts.push(dirs.left ? 'Esquerda livre' : 'Esquerda bloqueado');

    const frase = parts.join(', ');
    falarSeguro(frase);
    mostrarLegenda(frase);
}

// ─── Atualizar HUD + barra de proximidade ────────────────────────
function atualizarHUD() {
    hudPos.textContent = 'Posição: ' + (playerY + 1) + ', ' + (playerX + 1);
    const dist = Math.abs(playerX - exitX) + Math.abs(playerY - exitY);
    hudDist.textContent = 'Distância: ' + dist;
    const maxDist = (tamanho - 1) * 2;
    const pct = Math.round((1 - dist / maxDist) * 100);
    proxPreench.style.width = pct + '%';
}

// ─── Fase completa ───────────────────────────────────────────────
function faseCompleta() {
    somVitoria();

    const faseTerminada = faseAtual + 1; // número humano da fase acabada

    // Avança independente do callback — o callback só NARRA, nunca controla o fluxo
    if (faseAtual < fases.length - 1) {
        faseAtual++;

        const frase = 'Você chegou na casinha! Fase ' + faseTerminada + ' completa! Agora a fase ' + faseAtual + 1 + '.';
        falarSeguro(frase);
        mostrarLegenda(frase);

        // Carrega próxima fase SEM depender do callback de narração
        setTimeout(() => iniciarFase(), 1200);
    } else {
        mostrarFinal();
    }
}

// ─── Tela final ──────────────────────────────────────────────────
function mostrarFinal() {
    trocarTela(telaFinal);
    const frase = 'Parabéns! O passarinho encontrou todas as casinhas! ' +
                  'Você completou todas as 4 fases do labirinto sonoro!';
    msgFinal.textContent = frase;
    falarSeguro(frase);
    mostrarLegenda(frase);
}

// ─── Reiniciar ───────────────────────────────────────────────────
function reiniciar() {
    faseAtual = 0;
    trocarTela(telaInicio);
}

// ─── Teclado ─────────────────────────────────────────────────────
function onKeydown(e) {
    if (document.activeElement !== gameArea) return;

    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            tentarMover(0, -1, 'up');
            break;
        case 'ArrowDown':
            e.preventDefault();
            tentarMover(0, 1, 'down');
            break;
        case 'ArrowLeft':
            e.preventDefault();
            tentarMover(-1, 0, 'left');
            break;
        case 'ArrowRight':
            e.preventDefault();
            tentarMover(1, 0, 'right');
            break;
        case ' ':
            e.preventDefault();
            ativarSonar();
            break;
    }
}

// ─── Inicialização ───────────────────────────────────────────────
btnStart.addEventListener('click', function() {
    faseAtual = 0;
    iniciarFase();
});

// Reposiciona o marcador se a janela mudar de tamanho
window.addEventListener('resize', function () {
    if (modoMapa) atualizarMapaLateral();
});

btnJogarFase.addEventListener('click', iniciarJogoFase);
btnRestart.addEventListener('click', reiniciar);
gameArea.addEventListener('keydown', onKeydown);

})();