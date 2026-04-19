// Service Worker — gerencia o documento offscreen e roteia mensagens

const OFFSCREEN_URL = chrome.runtime.getURL('offscreen.html');

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [OFFSCREEN_URL],
  });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Executar o modelo Whisper via WebAssembly para transcrição de áudio',
  });
}

// ─── Roteamento de mensagens ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'offscreen') return false;

  if (msg.action === 'transcribe') {
    // Responde IMEDIATAMENTE para não manter o canal aberto.
    // O service worker pode morrer; o offscreen persiste e manda o resultado.
    sendResponse({ status: 'started' });

    const tabId = sender.tab?.id;
    ensureOffscreen()
      .then(() => chrome.runtime.sendMessage({ ...msg, target: 'offscreen', tabId }))
      .catch(err => {
        // Se o offscreen falhar ao criar, avisa a aba
        if (tabId) {
          chrome.tabs.sendMessage(tabId, {
            action: 'transcriptionResult',
            messageId: msg.messageId,
            success: false,
            error: err.message,
          }).catch(() => {});
        }
      });

    return false; // canal pode fechar
  }

  // Resultado da transcrição vindo do offscreen → repassa para a aba
  if (msg.action === 'transcriptionResult') {
    const { tabId, ...rest } = msg;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { action: 'transcriptionResult', ...rest }).catch(() => {});
    }
    return false;
  }

  // Progresso do Whisper → repassa para a aba
  if (msg.action === 'whisperProgress') {
    const tabId = msg.tabId;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { action: 'whisperProgress', message: msg.message }).catch(() => {});
    } else {
      chrome.tabs.query({ url: 'https://web.whatsapp.com/*', active: true }).then(([tab]) => {
        if (tab) chrome.tabs.sendMessage(tab.id, { action: 'whisperProgress', message: msg.message }).catch(() => {});
      });
    }
    return false;
  }
});
