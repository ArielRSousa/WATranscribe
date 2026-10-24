// Transcrição pública: envia somente o áudio solicitado pelo usuário.
chrome.runtime.onMessage.addListener((msg, _sender) => {
  if (msg.target !== 'offscreen') return false;

  if (msg.action === 'transcribe') {
    const { tabId, messageId } = msg;

    transcribeWithServer(msg)
      .then(text => {
        chrome.runtime.sendMessage({
          action: 'transcriptionResult',
          tabId,
          messageId,
          success: true,
          text,
        });
      })
      .catch(err => {
        chrome.runtime.sendMessage({
          action: 'transcriptionResult',
          tabId,
          messageId,
          success: false,
          error: err.message,
        });
      });

    return false; // resposta assíncrona via sendMessage, não sendResponse
  }
});

async function transcribeWithServer({ audioBase64, mimeType }) {
  const serverUrl = 'https://watranscribe-api.vercel.app';
  if (audioBase64.length > 4_000_000) throw new Error('O servidor aceita áudios de até 3 MB. Tente um áudio menor.');
  let response;
  try {
    response = await fetch(`${serverUrl}/api/transcribe`, {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ audioBase64, mimeType }), signal:AbortSignal.timeout(55000), redirect:'error',
    });
  } catch { throw new Error('Não foi possível acessar o servidor. Confira sua conexão ou tente novamente.'); }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const wait = response.headers.get('Retry-After');
    throw new Error((payload?.error || 'Falha no servidor de transcrição.') + (response.status === 429 && wait ? ` Tente em ${wait}s.` : ''));
  }
  if (typeof payload?.text !== 'string' || !payload.text.trim()) throw new Error('O servidor retornou uma transcrição vazia.');
  return payload.text.trim();
}
