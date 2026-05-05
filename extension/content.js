// Content Script — detecta mensagens de áudio e gerencia transcrição
// Mensagens de áudio no WhatsApp Web têm atributo [data-id] e contêm
// um <canvas> (a forma de onda / waveform) dentro delas.

let activeMessageId = null;

// ── 1. Detectar mensagens de áudio e injetar botão ───────────────────────────

// Mensagem de áudio = tem canvas (waveform) E botão de play/pause.
// Stickers e imagens têm canvas mas NÃO têm botão de play.
function isAudioMessage(el) {
  if (!el.querySelector('canvas')) return false;
  return !!el.querySelector(
    '[aria-label*="Reproduzir"], [aria-label*="Pausar"], ' +
    '[aria-label*="Play"], [aria-label*="Pause"], ' +
    '[aria-label*="play"], [aria-label*="pause"], ' +
    '[data-testid*="play"], [data-testid*="audio"], [data-testid*="ptt"]'
  );
}

function scanForAudioMessages(root) {
  (root || document).querySelectorAll('[data-id]').forEach(el => {
    if (isAudioMessage(el) && !el.querySelector('.wpp-tr-msg-btn')) {
      addTranscribeBtn(el);
    }
  });
}

// Observa qualquer mudança no DOM e reagenda um scan com debounce.
// O WhatsApp renderiza mensagens de forma assíncrona (React), então
// não podemos confiar em inspecionar cada nó adicionado individualmente.
let _scanTimer = null;
function scheduleScan() {
  clearTimeout(_scanTimer);
  _scanTimer = setTimeout(scanForAudioMessages, 600);
}
const observer = new MutationObserver(scheduleScan);
observer.observe(document.body, { childList: true, subtree: true });
scanForAudioMessages();

// ── 2. Botão "Transcrever" ────────────────────────────────────────────────────

// Wrapper único para botão + resultado, abaixo do player
function getResultWrapper(msgContainer) {
  const next = msgContainer.nextElementSibling;
  if (next?.classList.contains('wpp-tr-wrapper')) return next;
  const wrapper = document.createElement('div');
  wrapper.className = 'wpp-tr-wrapper';
  msgContainer.insertAdjacentElement('afterend', wrapper);
  return wrapper;
}

function addTranscribeBtn(msgContainer) {
  // Usa dataset para evitar duplicata
  if (msgContainer.hasAttribute('data-wpp-tr-done')) return;
  msgContainer.setAttribute('data-wpp-tr-done', '1');

  const messageId = msgContainer.getAttribute('data-id');
  if (!messageId) return;

  const wrapper = getResultWrapper(msgContainer);

  const btn = document.createElement('button');
  btn.className = 'wpp-tr-msg-btn';
  btn.textContent = '📝 Transcrever';
  btn.title = 'Transcrever audio';
  btn.addEventListener('click', e => {
    e.stopPropagation();
    handleTranscription(msgContainer, btn, messageId);
  });

  wrapper.appendChild(btn);
}

// ── 3. Transcrição ────────────────────────────────────────────────────────────

function handleTranscription(msgContainer, btn, messageId) {
  btn.disabled = true;
  btn.textContent = '⏳ Baixando áudio...';
  showResult(msgContainer, 'Conectando ao WhatsApp...', 'loading');

  activeMessageId = messageId;

  // Pede o áudio ao injected.js (mundo principal da página)
  window.dispatchEvent(new CustomEvent('wpp-request-audio', {
    detail: { messageId }
  }));

  // Aguarda resposta via postMessage
  function onMessage(e) {
    if (!e.data?._wpp) return;
    if (e.data.messageId !== messageId) return;
    window.removeEventListener('message', onMessage);

    if (e.data.type === 'audio-error') {
      btn.disabled = false;
      btn.textContent = '📝 Transcrever';
      showResult(msgContainer, '❌ ' + e.data.error, 'error');
      return;
    }
    if (e.data.type === 'audio-ready') {
      btn.textContent = '⏳ Preparando transcricao...';

      // Fire-and-forget: resultado vem por onMessage (transcriptionResult)
      // para não depender do canal do service worker ficar aberto.
      getTranscriptionSettings().then(({ model, provider, groqApiKey }) => {
        const providerLabel = provider === 'local'
          ? `Whisper local (${model.split('/')[1] || 'base'})`
          : 'Groq';
        showResult(msgContainer, `Preparando transcricao (${providerLabel})...`, 'loading');

        chrome.runtime.sendMessage({
          action:      'transcribe',
          audioBase64: e.data.audioBase64,
          isRaw:       false,
          mimeType:    e.data.mimeType,
          model,
          provider,
          groqApiKey,
          messageId,
        });
      });
    }
  }

  window.addEventListener('message', onMessage);
}

// ── 4. Exibir resultado inline ────────────────────────────────────────────────

function showResult(msgContainer, text, type) {
  const wrapper = getResultWrapper(msgContainer);
  let el = wrapper.querySelector('.wpp-tr-msg-result');
  if (!el) {
    el = document.createElement('div');
    el.className = 'wpp-tr-msg-result';
    wrapper.appendChild(el);
  }

  el.dataset.type = type;

  if (type === 'success') {
    el.innerHTML = `
      <div class="wpp-tr-result-header">
        <span class="wpp-tr-result-label">📝 Transcrição</span>
        <button class="wpp-tr-copy-btn" title="Copiar">📋</button>
        <button class="wpp-tr-toggle-btn" title="Ocultar">▲</button>
        <button class="wpp-tr-close-btn" title="Fechar">✕</button>
      </div>
      <div class="wpp-tr-result-body">
        <span class="wpp-tr-result-text">${escapeHtml(text)}</span>
      </div>
    `;

    // Copiar
    el.querySelector('.wpp-tr-copy-btn').onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      const btn = el.querySelector('.wpp-tr-copy-btn');
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = '📋'; }, 1500);
    };

    // Mostrar / Ocultar
    const toggleBtn = el.querySelector('.wpp-tr-toggle-btn');
    const header    = el.querySelector('.wpp-tr-result-header');
    const body      = el.querySelector('.wpp-tr-result-body');
    let collapsed = false;

    const toggle = (e) => {
      e.stopPropagation();
      collapsed = !collapsed;
      body.classList.toggle('wpp-tr-collapsed', collapsed);
      toggleBtn.textContent = collapsed ? '▼' : '▲';
      toggleBtn.title = collapsed ? 'Mostrar' : 'Ocultar';
    };
    toggleBtn.onclick = toggle;
    header.onclick    = toggle;

    // Fechar caixa de transcrição
    const closeBtn = el.querySelector('.wpp-tr-close-btn');
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      el.remove();
      msgContainer.removeAttribute('data-wpp-tr-done');
      addTranscribeBtn(msgContainer);
      // fallback para casos em que o WhatsApp rerenderiza o nó na sequência
      setTimeout(() => {
        if (!getResultWrapper(msgContainer).querySelector('.wpp-tr-msg-btn')) {
          addTranscribeBtn(msgContainer);
        }
      }, 50);
    };

  } else {
    el.innerHTML = `
      <div class="wpp-tr-result-body">
        <span class="wpp-tr-result-text">${escapeHtml(text)}</span>
      </div>
    `;
  }
}

// ── 5. Mensagens do background (progresso e resultado) ───────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  // Resultado final da transcrição
  if (msg.action === 'transcriptionResult') {
    const id = msg.messageId;
    const msgContainer = id
      ? document.querySelector(`[data-id="${CSS.escape(id)}"]`)
      : null;

    if (msgContainer) {
      const wrapper = getResultWrapper(msgContainer);
      wrapper.querySelector('.wpp-tr-msg-btn')?.remove();
      if (msg.success) {
        showResult(msgContainer, msg.text, 'success');
      } else {
        showResult(msgContainer, '❌ ' + (msg.error || 'Erro desconhecido'), 'error');
        addTranscribeBtn(msgContainer);
      }
    }
    if (activeMessageId === id) activeMessageId = null;
  }

  // Progresso do Whisper
  if (msg.action === 'whisperProgress' && activeMessageId) {
    const msgContainer = document.querySelector(
      `[data-id="${CSS.escape(activeMessageId)}"]`
    );
    if (!msgContainer) return;
    const btn = getResultWrapper(msgContainer).querySelector('.wpp-tr-msg-btn');
    if (btn) btn.textContent = '⏳ ' + msg.message;
    showResult(msgContainer, msg.message, 'loading');
  }

  if (msg.action === 'forceReloadContentScript') {
    window.location.reload();
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTranscriptionSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['model', 'transcriptionProvider', 'groqApiKey'], (data) => {
      resolve({
        model: data.model || 'Xenova/whisper-base',
        provider: data.transcriptionProvider || 'groq',
        groqApiKey: data.groqApiKey || '',
      });
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
