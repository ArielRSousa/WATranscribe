// Standalone runtime with direct calls, without a page-message bridge.
let consented = false;
const pending = new WeakSet();

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function requestTranscription(audioBase64, mimeType) {
  if (!audioBase64 || audioBase64.length > 4_000_000) {
    return Promise.reject(new Error('Use um áudio de até 3 MB.'));
  }
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://watranscribe-api.vercel.app/api/transcribe',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ audioBase64, mimeType }),
      anonymous: true,
      timeout: 55000,
      onload(response) {
        let payload;
        try { payload = JSON.parse(response.responseText); }
        catch { reject(new Error('Resposta inválida do servidor.')); return; }
        if (response.status < 200 || response.status >= 300) {
          const wait = response.responseHeaders?.match(/^retry-after:\s*(\d+)/im)?.[1];
          reject(new Error((typeof payload?.error === 'string' ? payload.error : 'Falha na transcrição.') + (response.status === 429 && wait ? ` Tente em ${wait}s.` : '')));
          return;
        }
        if (typeof payload?.text !== 'string' || !payload.text.trim()) {
          reject(new Error('O servidor retornou uma transcrição vazia.')); return;
        }
        resolve(payload.text.trim());
      },
      onerror() { reject(new Error('Não foi possível conectar ao servidor. Confira sua internet.')); },
      ontimeout() { reject(new Error('A transcrição demorou demais. Tente novamente.')); },
      onabort() { reject(new Error('Transcrição cancelada.')); },
    });
  });
}

async function handleTranscription(container, button, messageId) {
  if (pending.has(container)) return;
  if (!consented) {
    consented = window.confirm('Transcrever este áudio?\n\nO áudio selecionado será enviado ao servidor WATranscribe (Vercel) e à Groq para gerar o texto. O IP é usado para limites de uso. Até 3 MB por áudio.\n\nPrivacidade: https://watranscribe-api.vercel.app/privacy.html\n\nEsta autorização vale para os próximos cliques nesta aba até recarregar a página.');
    if (!consented) return;
  }
  pending.add(container);
  button.disabled = true;
  button.textContent = '⏳ Obtendo áudio…';
  try {
    const audio = await downloadAudio(messageId);
    if (audio.blobData.byteLength > 3_000_000) throw new Error('Use um áudio de até 3 MB.');
    button.textContent = '⏳ Transcrevendo…';
    showResult(container, 'Convertendo áudio em texto…', 'loading');
    const text = await requestTranscription(bufToBase64(audio.blobData), audio.mimeType);
    button.remove();
    showResult(container, text, 'success');
  } catch (error) {
    showResult(container, '❌ ' + error.message, 'error');
    button.disabled = false;
    button.textContent = '📝 Transcrever';
  } finally { pending.delete(container); }
}

function addTranscribeBtn(container) {
  const wrapper = getResultWrapper(container);
  if (wrapper.querySelector('.wpp-tr-msg-btn, [data-type="success"]')) return;
  const id = container.getAttribute('data-id');
  if (!id) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'wpp-tr-msg-btn';
  button.textContent = '📝 Transcrever';
  button.title = 'Transcrever este áudio com WATranscribe';
  button.addEventListener('click', event => {
    if (!event.isTrusted) return;
    event.stopPropagation();
    handleTranscription(container, button, id);
  });
  wrapper.appendChild(button);
}

function scan() {
  document.querySelectorAll('[data-id]').forEach(container => {
    if (isAudioMessage(container)) addTranscribeBtn(container);
  });
}
let scanTimer;
const observer = new MutationObserver(records => {
  if (!records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && !node.closest?.('.wpp-tr-wrapper')))) return;
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scan, 350);
});
function start() {
  if (!document.body) { document.addEventListener('DOMContentLoaded', start, { once: true }); return; }
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
}
start();
