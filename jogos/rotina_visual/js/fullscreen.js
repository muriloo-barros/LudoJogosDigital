// ════════════════════════════════════════════════════════════════
// MODO FOCO / FULLSCREEN — LudoGames
// Compartilhado entre todos os jogos (como o site.js).
//
// - Botão redondo de madeira no canto do console-frame
// - 1º clique: modo foco (overlay escurecido, header ao fundo, jogo centralizado)
// - 2º botão (aparece no modo foco): fullscreen NATIVO do navegador,
//   aplicado direto no console-frame
// - Esc sai do modo foco
// - Painel de acessibilidade (z-index 1000) abre POR CIMA do overlay (900)
// ════════════════════════════════════════════════════════════════

(function () {
'use strict';

var SVG_ENTRAR = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
var SVG_SAIR   = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';
var SVG_NATIVO = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 4h7v2H6v5H4V4zm9 0h7v7h-2V6h-5V4zM6 13v5h5v2H4v-7h2zm12 0h2v7h-7v-2h5v-5z"/></svg>';

function init() {
    var frame = document.querySelector('.console-frame');
    if (!frame) return; // página sem console (ex: index) — não faz nada

    // ── Backdrop escurecido ─────────────────────────────────────
    var backdrop = document.createElement('div');
    backdrop.className = 'foco-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    // ── Botão principal (madeira, canto do console) ─────────────
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
        if (document.fullscreenElement) {
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

    // Sincroniza ícone quando o usuário sai do nativo pelo Esc do navegador
    document.addEventListener('fullscreenchange', function () {
        btnNativo.innerHTML = document.fullscreenElement ? SVG_SAIR : SVG_NATIVO;
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