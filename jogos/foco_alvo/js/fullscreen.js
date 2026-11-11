// ════════════════════════════════════════════════════════════════
// FULLSCREEN UNIVERSAL — LudoGames
// UM ÚNICO ARQUIVO para TODOS os jogos (substitui as versões antigas)
//
// O que faz:
//   1. Botão MODO FOCO (o "zoom"): cria o foco-backdrop (escurece +
//      desfoca o site), centraliza e amplia o console via body.modo-foco
//   2. Botão TELA CHEIA nativa: Fullscreen API no próprio .console-frame
//      (só aparece dentro do modo foco, como antes)
//   3. Cursor personalizado migra pra dentro do fullscreen nativo
//      (senão ele deixa de ser renderizado fora do frame)
//   4. Classe html.em-fullscreen como backup universal para o CSS
//   5. Esc sai do modo foco (o Esc do nativo o navegador já trata)
// O visual (caixa exclusiva, cursor none, backdrop) fica no fullscreen.css
// ════════════════════════════════════════════════════════════════

(function () {
'use strict';

// ─── Ícones SVG ──────────────────────────────────────────────────
var SVG_ENTRAR = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"/></svg>';
var SVG_SAIR   = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10 3v6H4V7h4V3h2zm4 0h2v4h4v2h-6V3zM4 15h6v6H8v-4H4v-2zm10 6v-6h6v2h-4v4h-2z"/></svg>';
var SVG_NATIVO = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5zm2 2h10v6H7V9z"/></svg>';

function init() {
    // Procura o console do jogo (padrão comum a todos os jogos)
    var frame = document.querySelector('.console-frame');
    if (!frame) return; // sem console → sem botões, nada quebra

    // Blindagem: não duplica botões se o script rodar de novo
    if (frame.querySelector('.btn-fullscreen')) return;

    // ── Backdrop escurecido do modo foco ────────────────────────
    // Cobre o site ao redor (escurece + desfoca), deixando só o
    // console em destaque. O elemento existe sempre; o CSS decide
    // quando mostrá-lo (opacity/pointer-events via body.modo-foco).
    if (!document.querySelector('.foco-backdrop')) {
        var backdrop = document.createElement('div');
        backdrop.className = 'foco-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        document.body.appendChild(backdrop);
    }

    // ── Botão principal (madeira, canto do console): MODO FOCO ──
    var btnFoco = document.createElement('button');
    btnFoco.className = 'btn-fullscreen';
    btnFoco.setAttribute('aria-label', 'Ativar modo foco: destacar o jogo na tela');
    btnFoco.setAttribute('title', 'Modo foco');
    btnFoco.innerHTML = SVG_ENTRAR;
    frame.appendChild(btnFoco);

    // ── Botão nativo (só aparece no modo foco) ──────────────────
    var btnNativo = document.createElement('button');
    btnNativo.className = 'btn-fullscreen btn-fullscreen-nativo escondido';
    btnNativo.setAttribute('aria-label', 'Tela cheia nativa do navegador');
    btnNativo.setAttribute('title', 'Tela cheia (navegador)');
    btnNativo.innerHTML = SVG_NATIVO;
    frame.appendChild(btnNativo);

    var modoFoco = false;

    // ── Migrar cursor personalizado pra dentro do fullscreen ────
    // O #cursor-personalizado mora no <body>; em fullscreen nativo
    // só o console-frame e seus filhos são renderizados.
    function migrarCursor() {
        var cursor = document.getElementById('cursor-personalizado');
        if (!cursor) return;
        if (document.fullscreenElement) {
            document.fullscreenElement.appendChild(cursor);
        } else {
            document.body.appendChild(cursor);
        }
    }

    function entrarFoco() {
        modoFoco = true;
        document.body.classList.add('modo-foco');
        btnFoco.innerHTML = SVG_SAIR;
        btnFoco.setAttribute('aria-label', 'Sair do modo foco');
        btnFoco.setAttribute('title', 'Sair do modo foco');
        btnNativo.classList.remove('escondido');
    }

    function sairFoco() {
        modoFoco = false;
        document.body.classList.remove('modo-foco');
        btnFoco.innerHTML = SVG_ENTRAR;
        btnFoco.setAttribute('aria-label', 'Ativar modo foco: destacar o jogo na tela');
        btnFoco.setAttribute('title', 'Modo foco');
        btnNativo.classList.add('escondido');
        // Se estava em fullscreen nativo, sai também
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(function () {});
        }
    }

    btnFoco.addEventListener('click', function () {
        if (modoFoco) { sairFoco(); } else { entrarFoco(); }
    });

    btnNativo.addEventListener('click', function () {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(function () {});
        } else {
            // Fullscreen nativo aplicado no PRÓPRIO console-frame:
            // só o jogo ocupa a tela, nada do site aparece
            if (frame.requestFullscreen) {
                frame.requestFullscreen().catch(function () {});
            }
        }
    });

    // ── Sincronização universal quando o fullscreen muda ────────
    document.addEventListener('fullscreenchange', function () {
        btnNativo.innerHTML = document.fullscreenElement ? SVG_SAIR : SVG_NATIVO;

        // Backup universal: classe no <html> (o CSS usa como fallback
        // caso algum navegador exija prefixo no :fullscreen)
        document.documentElement.classList.toggle('em-fullscreen', !!document.fullscreenElement);

        migrarCursor();
    });

    // Esc sai do modo foco (o Esc do fullscreen nativo o navegador já trata)
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modoFoco && !document.fullscreenElement) {
            sairFoco();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();