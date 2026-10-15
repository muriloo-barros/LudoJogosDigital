// ════════════════════════════════════════════════════════════════
// ROTINA VISUAL DO DIA — Lógica do jogo
// Para crianças neurodivergentes (TEA, TDAH, dislexia, discalculia)
// ════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ─── Dados das rotinas (4 rodadas × 5 passos) ───────────────────
const rotinas = [
    {
        nome: "Manhã",
        emoji: "☀️",
        passos: [
            { emoji: "☀️", texto: "Acordar",           img: "" },
            { emoji: "🛏️", texto: "Arrumar a cama",    img: "" },
            { emoji: "🍳", texto: "Tomar café",         img: "" },
            { emoji: "🪥", texto: "Escovar dentes",     img: "" },
            { emoji: "🎒", texto: "Preparar mochila",   img: "" }
        ]
    },
    {
        nome: "Escola",
        emoji: "🏫",
        passos: [
            { emoji: "🚪", texto: "Chegar na escola",  img: "" },
            { emoji: "🎒", texto: "Guardar mochila",    img: "" },
            { emoji: "📚", texto: "Aula",               img: "" },
            { emoji: "⚽", texto: "Recreio",            img: "" },
            { emoji: "🚌", texto: "Voltar pra casa",    img: "" }
        ]
    },
    {
        nome: "Tarde",
        emoji: "🌤️",
        passos: [
            { emoji: "🍽️", texto: "Almoçar",           img: "" },
            { emoji: "🪥", texto: "Escovar dentes",     img: "" },
            { emoji: "✏️", texto: "Lição de casa",      img: "" },
            { emoji: "🧸", texto: "Brincar",            img: "" },
            { emoji: "🌆", texto: "Jantar",             img: "" }
        ]
    },
    {
        nome: "Noite",
        emoji: "🌙",
        passos: [
            { emoji: "🩲", texto: "Colocar pijama",     img: "" },
            { emoji: "🪥", texto: "Escovar dentes",     img: "" },
            { emoji: "📖", texto: "Hora de ler",        img: "" },
            { emoji: "🕯️", texto: "Apagar as luzes",    img: "" },
            { emoji: "😴", texto: "Dormir",             img: "" }
        ]
    }
];

// ─── Estado do jogo ─────────────────────────────────────────────
let rodadaAtual = 0;
let pontuacaoTotal = 0;
let acertosRodada = 0;
let cardsEmbaralhados = [];
let slots = [null, null, null, null, null];
let cardSelecionadoIdx = -1;
let posicaoFoco = 0;
let verificou = false;

// ─── Elementos DOM ───────────────────────────────────────────────
const telaInicio  = document.getElementById('tela-inicio');
const telaJogo    = document.getElementById('tela-jogo');
const telaFinal   = document.getElementById('tela-final');
const btnStart    = document.getElementById('btn-start');
const btnVerificar= document.getElementById('btn-verificar');
const btnProxima  = document.getElementById('btn-proxima');
const btnRestart  = document.getElementById('btn-restart');
const bancoCards  = document.getElementById('bancoCards');
const slotLinha   = document.getElementById('slotLinha');
const tabuleiroJogo = document.getElementById('tabuleiroJogo');
const hudRodada   = document.getElementById('hud-rodada');
const hudNomeRod  = document.getElementById('hud-nome-rodada');
const hudProg     = document.getElementById('hud-progresso');
const msgFinal    = document.getElementById('mensagem-final');
const medalhaFinal= document.getElementById('medalha-final');
const tituloFinal = document.getElementById('titulo-final');

// ─── Narração segura ─────────────────────────────────────────────
function falarSeguro(texto, callback) {
    if (typeof window.falar === 'function') {
        window.falar(texto, callback);
    } else if (typeof callback === 'function') {
        callback();
    }
}
function mostrarLegenda(texto) {
    if (typeof window.mostrarLegendaBox === 'function') {
        window.mostrarLegendaBox(texto);
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
function somAcerto() { beep(523,0.12,'sine',0.1); setTimeout(()=>beep(659,0.12,'sine',0.1),100); setTimeout(()=>beep(784,0.2,'sine',0.1),200); }
function somErro() { beep(200,0.3,'sawtooth',0.08); }
function somPick() { beep(440,0.06,'sine',0.08); }
function somDrop() { beep(330,0.06,'sine',0.08); }

// ─── Embaralhar ──────────────────────────────────────────────────
function embaralhar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─── Carregar rodada ─────────────────────────────────────────────
function carregarRodada() {
    const r = rotinas[rodadaAtual];
    verificou = false;
    acertosRodada = 0;
    cardSelecionadoIdx = -1;
    posicaoFoco = 0;

    cardsEmbaralhados = embaralhar(r.passos).map((p) => ({
        ...p,
        posCorreta: r.passos.indexOf(p)
    }));
    slots = [null, null, null, null, null];

    hudRodada.textContent = `RODADA: ${rodadaAtual + 1}`;
    hudNomeRod.textContent = `${r.emoji} ${r.nome}`;
    hudProg.textContent = `Progresso: ${rodadaAtual}/${rotinas.length}`;

    renderBanco();
    renderSlots();

    btnVerificar.classList.remove('escondido');
    btnVerificar.disabled = true;
    btnProxima.classList.add('escondido');

    const frase = `Rodada ${rodadaAtual + 1}: ${r.nome}. Arraste os cards na ordem correta.`;
    falarSeguro(frase);
    mostrarLegenda(frase);
}

// ─── Renderizar banco ────────────────────────────────────────────
function renderBanco() {
    bancoCards.innerHTML = '';
    cardsEmbaralhados.forEach((card, idx) => {
        if (card === null) {
            const ph = document.createElement('div');
            ph.style.width = '130px';
            ph.style.minHeight = '120px';
            ph.style.visibility = 'hidden';
            bancoCards.appendChild(ph);
            return;
        }
        const el = document.createElement('div');
        el.className = 'card-rotina';
        el.dataset.idx = idx;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `${card.emoji} ${card.texto}`);

        const emojiEl = document.createElement('span');
        emojiEl.className = 'card-emoji';
        emojiEl.textContent = card.emoji;
        el.appendChild(emojiEl);

        const textoEl = document.createElement('span');
        textoEl.className = 'card-texto';
        textoEl.textContent = card.texto;
        el.appendChild(textoEl);

        const imgEl = document.createElement('img');
        imgEl.className = 'card-img';
        imgEl.alt = '';
        if (card.img) { imgEl.src = card.img; el.classList.add('tem-img'); }
        el.appendChild(imgEl);

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('click', function(e) {
            if (e.detail === 0) return;
            selecionarCard(idx);
        });
        bancoCards.appendChild(el);
    });
    atualizarFocoVisual();
}

// ─── Renderizar slots ────────────────────────────────────────────
function renderSlots() {
    slotLinha.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot-rotina';
        slot.dataset.slot = i;
        slot.setAttribute('role', 'button');
        slot.setAttribute('aria-label', `Slot ${i + 1}, ${slots[i] ? slots[i].texto : 'vazio'}`);

        const numero = document.createElement('span');
        numero.className = 'slot-numero';
        numero.textContent = `${i + 1}º`;
        slot.appendChild(numero);

        if (slots[i]) {
            const card = slots[i];
            const cardEl = document.createElement('div');
            cardEl.className = 'card-rotina no-slot';
            cardEl.dataset.slotCard = i;

            const emojiEl = document.createElement('span');
            emojiEl.className = 'card-emoji';
            emojiEl.textContent = card.emoji;
            cardEl.appendChild(emojiEl);

            const textoEl = document.createElement('span');
            textoEl.className = 'card-texto';
            textoEl.textContent = card.texto;
            cardEl.appendChild(textoEl);

            const imgEl = document.createElement('img');
            imgEl.className = 'card-img';
            imgEl.alt = '';
            if (card.img) { imgEl.src = card.img; cardEl.classList.add('tem-img'); }
            cardEl.appendChild(imgEl);

            cardEl.addEventListener('click', function(e) {
                if (e.detail === 0) return;
                tirarDoSlot(i);
            });
            cardEl.addEventListener('pointerdown', function(e) {
                onPointerDownSlot(e, i);
            });
            slot.appendChild(cardEl);
        } else {
            const ph = document.createElement('span');
            ph.className = 'slot-placeholder';
            ph.textContent = '?';
            slot.appendChild(ph);
        }

        slot.addEventListener('click', function(e) {
            if (e.detail === 0) return;
            if (cardSelecionadoIdx >= 0) soltarNoSlot(i);
        });
        slotLinha.appendChild(slot);
    }
    atualizarFocoVisual();
}

// ─── Selecionar card ─────────────────────────────────────────────
function selecionarCard(idx) {
    if (verificou) return;
    if (cardSelecionadoIdx === idx) {
        cardSelecionadoIdx = -1;
    } else {
        cardSelecionadoIdx = idx;
        somPick();
        const card = cardsEmbaralhados[idx];
        falarSeguro(`Selecionado: ${card.texto}`);
        mostrarLegenda(`Selecionado: ${card.emoji} ${card.texto}`);
    }
    renderBanco();
}

// ─── Soltar no slot ──────────────────────────────────────────────
function soltarNoSlot(slotIdx) {
    if (cardSelecionadoIdx < 0) return;
    const card = cardsEmbaralhados[cardSelecionadoIdx];

    if (slots[slotIdx]) {
        const oldCard = slots[slotIdx];
        slots[slotIdx] = card;
        cardsEmbaralhados[cardSelecionadoIdx] = null;
        let nullIdx = -1;
        for (let i = 0; i < cardsEmbaralhados.length; i++) {
            if (cardsEmbaralhados[i] === null) { nullIdx = i; break; }
        }
        if (nullIdx >= 0) cardsEmbaralhados[nullIdx] = oldCard;
    } else {
        slots[slotIdx] = card;
        cardsEmbaralhados[cardSelecionadoIdx] = null;
    }
    cardSelecionadoIdx = -1;
    somDrop();
    renderBanco();
    renderSlots();
    verificarTodosPreenchidos();
}

// ─── Tirar do slot ───────────────────────────────────────────────
function tirarDoSlot(slotIdx) {
    if (verificou) return;
    const card = slots[slotIdx];
    if (!card) return;
    let nullIdx = -1;
    for (let i = 0; i < cardsEmbaralhados.length; i++) {
        if (cardsEmbaralhados[i] === null) { nullIdx = i; break; }
    }
    if (nullIdx >= 0) {
        cardsEmbaralhados[nullIdx] = card;
        slots[slotIdx] = null;
    }
    somPick();
    renderBanco();
    renderSlots();
    verificarTodosPreenchidos();
}

// ─── Verificar preenchidos ───────────────────────────────────────
function verificarTodosPreenchidos() {
    const todos = slots.every(s => s !== null);
    btnVerificar.disabled = !todos;
    if (todos && !verificou) {
        const frase = 'Todos os cards estão no lugar. Pressione verificar!';
        falarSeguro(frase);
        mostrarLegenda(frase);
    }
}

// ─── Verificar respostas ─────────────────────────────────────────
function verificar() {
    verificou = true;
    acertosRodada = 0;
    const slotEls = slotLinha.querySelectorAll('.slot-rotina');
    slotEls.forEach((slotEl, i) => {
        const cardEl = slotEl.querySelector('.card-rotina');
        if (!cardEl) return;
        if (slots[i].posCorreta === i) {
            cardEl.classList.add('correto');
            acertosRodada++;
        } else {
            cardEl.classList.add('errado');
        }
    });
    pontuacaoTotal += acertosRodada;
    if (acertosRodada === 5) somAcerto(); else { somAcerto(); somErro(); }

    const r = rotinas[rodadaAtual];
    const frase = `Você acertou ${acertosRodada} de 5 na rodada ${r.nome}.`;
    falarSeguro(frase, () => {
        btnVerificar.classList.add('escondido');
        btnProxima.classList.remove('escondido');
        btnProxima.textContent = (rodadaAtual < rotinas.length - 1)
            ? 'Próxima Rodada →' : 'Ver Resultado Final →';
        btnProxima.focus(); // FIX: depois de verificar, Enter já avança a fase
    });
    mostrarLegenda(frase);
}

// ─── Próxima rodada ──────────────────────────────────────────────
function proximaRodada() {
    if (rodadaAtual < rotinas.length - 1) {
        rodadaAtual++;
        carregarRodada();
        tabuleiroJogo.focus();
    } else {
        mostrarFinal();
    }
}

// ─── Tela final ──────────────────────────────────────────────────
function mostrarFinal() {
    telaInicio.classList.add('escondido');
    telaJogo.classList.add('escondido');
    telaFinal.classList.remove('escondido');
    const max = rotinas.length * 5;
    const pct = Math.round((pontuacaoTotal / max) * 100);
    if (pct >= 80) {
        tituloFinal.textContent = 'PARABÉNS!';
        medalhaFinal.textContent = '🏆';
        msgFinal.textContent = `Você acertou ${pontuacaoTotal} de ${max} atividades! Você conhece muito bem as rotinas do dia!`;
    } else if (pct >= 50) {
        tituloFinal.textContent = 'MUITO BEM!';
        medalhaFinal.textContent = '🥈';
        msgFinal.textContent = `Você acertou ${pontuacaoTotal} de ${max} atividades. Continue praticando!`;
    } else {
        tituloFinal.textContent = 'BOM ESFORÇO!';
        medalhaFinal.textContent = '🥉';
        msgFinal.textContent = `Você acertou ${pontuacaoTotal} de ${max} atividades. Tente de novo para melhorar!`;
    }
    falarSeguro(msgFinal.textContent);
    mostrarLegenda(msgFinal.textContent);
}

// ─── Trocar tela ─────────────────────────────────────────────────
function trocarTela(nova) {
    [telaInicio, telaJogo, telaFinal].forEach(t => t.classList.add('escondido'));
    nova.classList.remove('escondido');
}

// ─── Reiniciar ───────────────────────────────────────────────────
function reiniciar() {
    rodadaAtual = 0;
    pontuacaoTotal = 0;
    trocarTela(telaInicio);
}

// ════════════════════════════════════════════════════════════════
// ─── POINTER EVENTS (arrastar) ───────────────────────────────────
// ════════════════════════════════════════════════════════════════

let dragData = null;

function onPointerDown(e) {
    if (verificou) return;
    e.preventDefault();
    const el = e.currentTarget;
    const idx = parseInt(el.dataset.idx);
    if (isNaN(idx) || cardsEmbaralhados[idx] === null) return;

    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.85';
    ghost.style.transform = 'scale(1.05) rotate(2deg)';
    ghost.style.transition = 'none';
    (document.fullscreenElement || document.body).appendChild(ghost);
    el.classList.add('arrastando');

    dragData = {
        cardIdx: idx, elGhost: ghost,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        origEl: el
    };
    somPick();
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
}

function onPointerDownSlot(e, slotIdx) {
    if (verificou || !slots[slotIdx]) return;
    e.preventDefault();
    e.stopPropagation();

    // Encontra o primeiro espaço vago no banco (pra onde o card vai)
    let nullIdx = -1;
    for (let i = 0; i < cardsEmbaralhados.length; i++) {
        if (cardsEmbaralhados[i] === null) { nullIdx = i; break; }
    }
    if (nullIdx < 0) return;

    // Move o card do slot para o banco (igual antes)
    const card = slots[slotIdx];
    cardsEmbaralhados[nullIdx] = card;
    slots[slotIdx] = null;
    renderBanco();
    renderSlots();

    const newEl = bancoCards.querySelector('[data-idx="' + nullIdx + '"]');
    if (!newEl) return;

    // FIX: o fantasma nasce CENTRADO NO PONTEIRO, não na posição do banco.
    // Antes ele usava o rect do card no banco — o que fazia o "cursor"
    // de arrasto teleportar pra linha das atividades.
    const rect = newEl.getBoundingClientRect();
    const ghost = newEl.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = (e.clientX - rect.width / 2) + 'px';
    ghost.style.top = (e.clientY - rect.height / 2) + 'px';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.85';
    ghost.style.transform = 'scale(1.05) rotate(2deg)';
    ghost.style.transition = 'none';
    document.body.appendChild(ghost);
    newEl.classList.add('arrastando');

    dragData = {
        cardIdx: nullIdx,
        elGhost: ghost,
        offsetX: rect.width / 2,
        offsetY: rect.height / 2,
        origEl: newEl
    };

    somPick();
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(e) {
    if (!dragData) return;
    e.preventDefault();
    if (!dragData) return;
    e.preventDefault();

    // FIX: o preventDefault do pointermove suprime os mousemove de
    // compatibilidade — o cursor personalizado do site.js (que segue
    // mousemove) congelava durante o arrasto. Sincronizamos manualmente.
    var cursor = document.getElementById('cursor-personalizado');
    if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }

    dragData.elGhost.style.left = (e.clientX - dragData.offsetX) + 'px';
    dragData.elGhost.style.top = (e.clientY - dragData.offsetY) + 'px';
    dragData.elGhost.style.display = 'none';
    const below = document.elementFromPoint(e.clientX, e.clientY);
    dragData.elGhost.style.display = '';
    document.querySelectorAll('.slot-rotina').forEach(s => s.classList.remove('drop-ativo'));
    if (below) {
        const slot = below.closest('.slot-rotina');
        if (slot) slot.classList.add('drop-ativo');
    }
}

function onPointerUp(e) {
    if (!dragData) return;
    e.preventDefault();
    dragData.elGhost.style.display = 'none';
    const below = document.elementFromPoint(e.clientX, e.clientY);
    dragData.elGhost.style.display = '';
    dragData.elGhost.remove();
    dragData.origEl.classList.remove('arrastando');
    document.querySelectorAll('.slot-rotina').forEach(s => s.classList.remove('drop-ativo'));

    if (below) {
        const slot = below.closest('.slot-rotina');
        if (slot) {
            const slotIdx = parseInt(slot.dataset.slot);
            if (!isNaN(slotIdx)) {
                const cardIdx = dragData.cardIdx;
                const card = cardsEmbaralhados[cardIdx];
                if (slots[slotIdx]) {
                    const oldCard = slots[slotIdx];
                    slots[slotIdx] = card;
                    cardsEmbaralhados[cardIdx] = null;
                    let nullIdx = -1;
                    for (let i = 0; i < cardsEmbaralhados.length; i++) {
                        if (cardsEmbaralhados[i] === null && i !== cardIdx) { nullIdx = i; break; }
                    }
                    if (nullIdx >= 0) cardsEmbaralhados[nullIdx] = oldCard;
                    else cardsEmbaralhados[cardIdx] = oldCard;
                } else {
                    slots[slotIdx] = card;
                    cardsEmbaralhados[cardIdx] = null;
                }
                somDrop();
                renderBanco(); renderSlots();
                verificarTodosPreenchidos();
            }
        }
    }
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    dragData = null;
}

// ════════════════════════════════════════════════════════════════
// ─── NAVEGAÇÃO POR TECLADO (Tab entra uma vez e sai) ────────────
// ════════════════════════════════════════════════════════════════
//
// O tabuleiro-jogo é um wrapper VISÍVEL com tabindex="0".
// Tab entra nele, setas navegam o grid 2×5, Tab sai pro próximo elemento.
//
// Grid:
//   Linha 0 (posições 0-4): banco de cards
//   Linha 1 (posições 5-9): slots numerados
// ← → : horizontal dentro da linha
// ↑ ↓ : vertical (banco ↔ slots)
// Enter/Espaço: seleciona/solta/tira

function onKeydown(e) {
    if (document.activeElement !== tabuleiroJogo) return;
    if (verificou && e.key !== 'Enter' && e.key !== ' ') return;

    const linha = Math.floor(posicaoFoco / 5);
    const coluna = posicaoFoco % 5;
    let novaPos = posicaoFoco;

    switch (e.key) {
        case 'ArrowRight':
            e.preventDefault();
            if (linha === 0) {
                // FIX (fantasma): pula posições cujo card já foi colocado (null)
                for (let p = posicaoFoco + 1; p <= 4; p++) {
                    if (cardsEmbaralhados[p]) { novaPos = p; break; }
                }
            } else {
                novaPos = Math.min(posicaoFoco + 1, 9);
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            if (linha === 0) {
                for (let p = posicaoFoco - 1; p >= 0; p--) {
                    if (cardsEmbaralhados[p]) { novaPos = p; break; }
                }
            } else {
                novaPos = Math.max(posicaoFoco - 1, 5);
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (linha === 0) {
                novaPos = 5 + coluna;
            } else if (linha === 1 && !verificou && slots.every(s => s !== null)) {
                // FIX (Verificar): com os 5 slots preenchidos, ↓ leva ao botão
                btnVerificar.focus();
                return;
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            // FIX (fantasma): só sobe se existir card de verdade nessa coluna
            if (linha === 1 && cardsEmbaralhados[coluna]) {
                novaPos = coluna;
            }
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            acaoPosicao(posicaoFoco);
            return;
        default:
            return;
    }
    if (novaPos !== posicaoFoco) {
        posicaoFoco = novaPos;
        atualizarFocoVisual();
        anunciarPosicao();
    }
}

function acaoPosicao(pos) {
    if (pos < 5) {
        if (cardsEmbaralhados[pos] === null) return;
        selecionarCard(pos);
    } else {
        const slotIdx = pos - 5;
        if (cardSelecionadoIdx >= 0) {
            soltarNoSlot(slotIdx);
        } else if (slots[slotIdx]) {
            tirarDoSlot(slotIdx);
        }
    }
}

function atualizarFocoVisual() {
    // FIX (fantasma): se o foco caiu numa posição do banco cujo card já
    // foi colocado num slot (null), migra pro card válido mais próximo.
    if (posicaoFoco < 5 && !cardsEmbaralhados[posicaoFoco]) {
        let alternativa = -1;
        for (let d = 1; d < 5 && alternativa === -1; d++) {
            if (posicaoFoco - d >= 0 && cardsEmbaralhados[posicaoFoco - d]) alternativa = posicaoFoco - d;
            else if (posicaoFoco + d < 5 && cardsEmbaralhados[posicaoFoco + d]) alternativa = posicaoFoco + d;
        }
        posicaoFoco = (alternativa !== -1) ? alternativa : 5; // banco vazio → 1º slot
    }

    document.querySelectorAll('.card-rotina.focado, .slot-rotina.focado')
        .forEach(el => el.classList.remove('focado'));
    if (posicaoFoco < 5) {
        const cardEl = bancoCards.children[posicaoFoco];
        if (cardEl && cardEl.classList.contains('card-rotina')) {
            cardEl.classList.add('focado');
        }
    } else {
        const slotIdx = posicaoFoco - 5;
        const slotEl = slotLinha.children[slotIdx];
        if (slotEl) slotEl.classList.add('focado');
    }
    document.querySelectorAll('.card-rotina.selecionado')
        .forEach(el => el.classList.remove('selecionado'));
    if (cardSelecionadoIdx >= 0) {
        const el = bancoCards.children[cardSelecionadoIdx];
        if (el && el.classList.contains('card-rotina')) {
            el.classList.add('selecionado');
        }
    }
}

function anunciarPosicao() {
    if (posicaoFoco < 5) {
        const card = cardsEmbaralhados[posicaoFoco];
        if (card) {
            falarSeguro(card.texto);
            mostrarLegenda(`${card.emoji} ${card.texto}`);
        }
    } else {
        const slotIdx = posicaoFoco - 5;
        if (slots[slotIdx]) {
            const frase = `Slot ${slotIdx + 1}: ${slots[slotIdx].texto}`;
            falarSeguro(frase);
            mostrarLegenda(frase);
        } else {
            const frase = `Slot ${slotIdx + 1}, vazio`;
            falarSeguro(frase);
            mostrarLegenda(frase);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// ─── INICIALIZAÇÃO ──────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════

btnStart.addEventListener('click', function() {
    trocarTela(telaJogo);
    rodadaAtual = 0;
    pontuacaoTotal = 0;
    carregarRodada();
    setTimeout(() => tabuleiroJogo.focus(), 100);
});

// FIX (Verificar): voltar dos botões pro tabuleiro com as setas
btnVerificar.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        tabuleiroJogo.focus();
        atualizarFocoVisual();
        anunciarPosicao();
    }
});
btnProxima.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        tabuleiroJogo.focus();
        atualizarFocoVisual();
        anunciarPosicao();
    }
});

btnVerificar.addEventListener('click', verificar);
btnProxima.addEventListener('click', proximaRodada);
btnRestart.addEventListener('click', reiniciar);

tabuleiroJogo.addEventListener('keydown', onKeydown);
tabuleiroJogo.addEventListener('blur', function() {
    document.querySelectorAll('.card-rotina.focado, .slot-rotina.focado')
        .forEach(el => el.classList.remove('focado'));
});

// Click em qualquer card/slot foca o tabuleiro (ativa navegação por teclado)
bancoCards.addEventListener('click', () => tabuleiroJogo.focus());
slotLinha.addEventListener('click', () => tabuleiroJogo.focus());

})();