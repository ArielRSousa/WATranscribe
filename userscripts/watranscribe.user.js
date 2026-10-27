// ==UserScript==
// @name         WATranscribe — WhatsApp em texto
// @namespace    https://github.com/ArielRSousa/WATranscribe
// @version      3.0.5.1
// @description  Transcreva áudios do WhatsApp Web com um clique, sem login adicional.
// @author       Ariel Sousa
// @match        https://web.whatsapp.com/*
// @run-at       document-idle
// @noframes
// @sandbox      JavaScript
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      watranscribe-api.vercel.app
// @homepageURL  https://github.com/ArielRSousa/WATranscribe
// @supportURL   https://github.com/ArielRSousa/WATranscribe/issues
// @downloadURL  https://watranscribe-api.vercel.app/watranscribe.user.js
// @updateURL    https://watranscribe-api.vercel.app/watranscribe.user.js
// @license      MIT
// ==/UserScript==

(function () {
'use strict';
GM_addStyle("/* Botão e resultado acompanham o lado da mensagem, abaixo do player. */\n\n.wpp-tr-wrapper {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  width: 100%;\n  min-width: 0;\n  flex-shrink: 0;\n  /* Let the audio determine the bubble width. Transcript content must not\n     contribute to the parent's intrinsic width; height stays content-sized. */\n  contain: inline-size;\n}\n\n.wpp-tr-wrapper {\n  box-sizing: border-box;\n  padding: 2px 4px 4px;\n}\n\n.wpp-tr-msg-result {\n  text-align: start;\n}\n\n/* ── Botão inline \"Transcrever\" ──────────────────────────────────────────── */\n\n.wpp-tr-msg-btn {\n  display: inline-block;\n  width: auto;\n  margin: 6px 4px 3px 4px;\n  padding: 5px 14px;\n  background: rgba(0, 168, 132, 0.22);\n  border: 1px solid rgba(0, 168, 132, 0.5);\n  border-radius: 8px;\n  color: #00a884 !important;\n  font-size: 12px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background .15s;\n  white-space: nowrap;\n  font-family: inherit;\n  line-height: 1.2;\n  text-align: center;\n}\n\n.wpp-tr-msg-btn:hover:not(:disabled) {\n  background: rgba(0, 143, 114, 0.28);\n}\n\n.wpp-tr-msg-btn:disabled {\n  opacity: 0.7;\n  cursor: default;\n}\n\n/* ── Resultado inline ─────────────────────────────────────────────────────── */\n\n.wpp-tr-msg-result {\n  display: inline-block;\n  box-sizing: border-box;\n  min-width: 0;\n  max-width: calc(100% - 8px);\n  overflow-wrap: anywhere;\n  margin: 4px 4px 6px 4px;\n  border-radius: 6px;\n  font-size: 12px;\n  font-family: inherit;\n  line-height: 1.35;\n  word-break: break-word;\n  box-shadow: 0 1px 4px rgba(0,0,0,.2);\n  overflow: hidden;\n  animation: wpp-fadein .2s ease;\n}\n\n@keyframes wpp-fadein {\n  from { opacity: 0; transform: translateY(3px); }\n  to   { opacity: 1; transform: translateY(0); }\n}\n\n/* Barra de cabeçalho do resultado */\n.wpp-tr-result-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 4px 7px;\n  cursor: pointer;\n  user-select: none;\n  gap: 6px;\n}\n\n.wpp-tr-result-label {\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: .04em;\n  opacity: .75;\n  text-transform: uppercase;\n  flex: 1;\n}\n\n.wpp-tr-toggle-btn {\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 11px;\n  opacity: 0.7;\n  padding: 0 2px;\n  color: inherit !important;\n  transition: opacity .15s, transform .2s;\n  line-height: 1;\n}\n.wpp-tr-toggle-btn:hover { opacity: 1; }\n\n.wpp-tr-close-btn {\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 11px;\n  opacity: 0.75;\n  padding: 0 2px;\n  color: inherit !important;\n  line-height: 1;\n}\n.wpp-tr-close-btn:hover { opacity: 1; }\n\n/* Corpo do resultado (texto + copiar) */\n.wpp-tr-result-body {\n  display: flex;\n  align-items: flex-start;\n  gap: 4px;\n  padding: 6px 8px;\n}\n.wpp-tr-result-body.wpp-tr-collapsed {\n  display: none;\n}\n\n.wpp-tr-msg-result[data-type=\"loading\"] {\n  background: #2a2a2a;\n  color: #c8c8c8 !important;\n  font-style: italic;\n}\n.wpp-tr-msg-result[data-type=\"loading\"] .wpp-tr-result-header { display: none; }\n.wpp-tr-msg-result[data-type=\"loading\"] .wpp-tr-result-body {\n  padding: 6px 8px;\n  font-style: italic;\n}\n\n.wpp-tr-msg-result[data-type=\"success\"] {\n  background: #1a3a2e;\n  border: 1px solid #00a884;\n  color: #e8f5f1 !important;\n}\n\n.wpp-tr-msg-result[data-type=\"error\"] {\n  background: #3a1a1a;\n  border: 1px solid #c0392b;\n  color: #f5c6c6 !important;\n}\n.wpp-tr-msg-result[data-type=\"error\"] .wpp-tr-result-header { display: none; }\n.wpp-tr-msg-result[data-type=\"error\"] .wpp-tr-result-body { padding: 6px 8px; }\n\n.wpp-tr-result-text {\n  flex: 1;\n  min-width: 0;\n  overflow-wrap: anywhere;\n  color: inherit !important;\n}\n\n.wpp-tr-copy-btn {\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 13px;\n  opacity: 0.7;\n  flex-shrink: 0;\n  padding: 0 2px;\n  color: inherit !important;\n  transition: opacity .15s;\n}\n.wpp-tr-copy-btn:hover { opacity: 1; }\n");
  function collectionModels(collection) {
    if (!collection) return [];
    if (typeof collection.getModelsArray === 'function') return collection.getModelsArray();
    if (Array.isArray(collection.models)) return collection.models;
    const models = [];
    collection.forEach?.(model => models.push(model));
    return models;
  }

  function matchesMessageId(msg, messageId) {
    const key = msg?.id;
    const serialized = key?._serialized ?? (typeof key === 'string' ? key : '');
    if (serialized === messageId) return true;
    // DOM uses the stanza ID alone. Group serialized IDs additionally end
    // with the participant, so endsWith(stanzaId) never matched group audio.
    if (typeof key?.id === 'string' && key.id === messageId) return true;
    const parts = serialized.split('_');
    return /^(true|false)$/.test(parts[0]) && parts[2] === messageId;
  }

  function findMsg(messageId) {
    const col = unsafeWindow.require('WAWebCollections');
    let direct;
    try { direct = col?.Msg?.get?.(messageId); } catch (_) { /* some versions expect a MsgKey */ }
    if (direct) return direct;

    const chats = collectionModels(col?.Chat);
    const activeChat = col?.Chat?.active ?? chats.find(c => c.active || c.isOpen);
    if (activeChat && typeof activeChat === 'object') {
      const matches = collectionModels(activeChat.msgs).filter(m => matchesMessageId(m, messageId));
      if (matches.length === 1) return matches[0];
    }

    // Some versions do not expose an active chat or keep its messages in Msg.
    // Search loaded collections and fail on ambiguity instead of using another audio.
    const candidates = [...collectionModels(col?.Msg), ...chats.flatMap(c => collectionModels(c.msgs))];
    const matches = new Map();
    for (const msg of candidates) {
      if (!matchesMessageId(msg, messageId)) continue;
      matches.set(msg.id?._serialized || msg, msg);
    }
    return matches.size === 1 ? matches.values().next().value : null;
  }

  // ── Estratégia 1: DownloadManager do WhatsApp ─────────────────────────────

  async function tryDownloadManager(msg) {
    const dmModule = unsafeWindow.require('WAWebDownloadManager');
    const dm = dmModule?.downloadManager ?? dmModule;
    // Tenta downloadAndMaybeDecrypt primeiro (menos dependência de QPL logger)
    const dlFn = dm?.downloadAndMaybeDecrypt ?? dm?.downloadAndDecrypt;
    if (typeof dlFn !== 'function') return null;

    return await dlFn.call(dm, {
      directPath:        msg.directPath,
      encFilehash:       msg.encFilehash,
      filehash:          msg.filehash,
      mediaKey:          msg.mediaKey,
      mediaKeyTimestamp: msg.mediaKeyTimestamp,
      type:              msg.type,
      signal:            new AbortController().signal,
    });
  }

  // ── Estratégia 2: Blob já em cache (após dar play) ────────────────────────

  async function tryCachedBlob(msg) {
    // mediaObject.mediaBlob é preenchido pelo WhatsApp após o áudio ser tocado
    const raw = msg.mediaObject?.mediaBlob ?? msg.mediaBlob;
    if (!raw) return null;

    const blob = typeof raw.forceToBlob === 'function'
      ? await raw.forceToBlob()
      : (Object.prototype.toString.call(raw) === '[object Blob]' ? raw : null);

    if (!blob) return null;
    return await blob.arrayBuffer();
  }

  // ── Estratégia 3: Download manual + decrypt com Web Crypto ────────────────
  // Reimplementa a criptografia E2E de mídia do WhatsApp:
  // HKDF-SHA256(mediaKey, "WhatsApp Audio Keys") → IV + CipherKey + MacKey
  // AES-256-CBC decrypt do arquivo baixado do CDN.

  async function manualDownloadDecrypt(msg) {
    if (!msg.directPath || !msg.mediaKey) {
      throw new Error('directPath ou mediaKey ausente na mensagem.');
    }

    // Converte mediaKey para bytes (pode vir como string base64 ou ArrayBuffer-like)
    let keyBytes;
    if (typeof msg.mediaKey === 'string') {
      keyBytes = Uint8Array.from(atob(msg.mediaKey), c => c.charCodeAt(0));
    } else {
      keyBytes = new Uint8Array(msg.mediaKey);
    }

    // HKDF-SHA256: deriva IV (16 B) + CipherKey (32 B) + MacKey (32 B) = 80 B mínimo
    const hkdfBase = await crypto.subtle.importKey(
      'raw', keyBytes, 'HKDF', false, ['deriveBits']
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(32),
        info: new TextEncoder().encode('WhatsApp Audio Keys'),
      },
      hkdfBase,
      112 * 8
    );

    const iv        = new Uint8Array(derived,  0, 16);
    const cipherKey = new Uint8Array(derived, 16, 32);

    // Baixa o arquivo cifrado do CDN do WhatsApp
    const cdnUrl = 'https://mmg.whatsapp.net' + msg.directPath;
    const resp = await fetch(cdnUrl, { credentials: 'omit' });
    if (!resp.ok) throw new Error(`CDN retornou ${resp.status} para o áudio.`);
    const encrypted = await resp.arrayBuffer();

    // Remove os 10 bytes de HMAC no final antes de decifrar
    const ciphertext = encrypted.slice(0, encrypted.byteLength - 10);

    const aesKey = await crypto.subtle.importKey(
      'raw', cipherKey, 'AES-CBC', false, ['decrypt']
    );
    return await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, aesKey, ciphertext);
  }

  // ── Orquestração: tenta as três estratégias em ordem ─────────────────────

  async function downloadAudio(messageId) {
    if (typeof unsafeWindow.require !== 'function') {
      throw new Error('WhatsApp ainda não carregou (unsafeWindow.require indisponível).');
    }

    const msg = findMsg(messageId);
    if (!msg) {
      throw new Error(
        'Mensagem não encontrada no store. Tente rolar a conversa e clicar novamente.'
      );
    }

    const mime = msg.mimetype || 'audio/ogg; codecs=opus';

    // Estratégia 1
    try {
      const blobData = await tryDownloadManager(msg);
      if (blobData) return { blobData, mimeType: mime };
    } catch (_) { /* cai para a próxima */ }

    // Estratégia 2
    try {
      const blobData = await tryCachedBlob(msg);
      if (blobData) return { blobData, mimeType: mime };
    } catch (_) { /* cai para a próxima */ }

    // Estratégia 3
    const blobData = await manualDownloadDecrypt(msg);
    return { blobData, mimeType: mime };
  }

  // ── Helper: ArrayBuffer → base64 ─────────────────────────────────────────

  function bufToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const CHUNK = 8192;
    let str = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      str += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    return btoa(str);
  }


function isAudioMessage(el) {
  if (!el.querySelector('canvas')) return false;
  return !!el.querySelector(
    '[aria-label*="Reproduzir"], [aria-label*="Pausar"], ' +
    '[aria-label*="Play"], [aria-label*="Pause"], ' +
    '[aria-label*="play"], [aria-label*="pause"], ' +
    '[data-testid*="play"], [data-testid*="audio"], [data-testid*="ptt"]'
  );
}

function getResultWrapper(msgContainer) {
  // The data-id node spans the whole row. Anchor to the actual bubble instead.
  const player = msgContainer.querySelector('canvas');
  const bubble = player?.closest('[data-testid="msg-container"]');
  const host = bubble && msgContainer.contains(bubble) ? bubble : msgContainer;
  let wrapper = host.querySelector('.wpp-tr-wrapper');
  const oldSibling = msgContainer.nextElementSibling;
  if (!wrapper && oldSibling?.classList.contains('wpp-tr-wrapper')) wrapper = oldSibling;
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'wpp-tr-wrapper';
  }
  if (wrapper.parentElement !== host) host.appendChild(wrapper);
  return wrapper;
}
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
      GM_setClipboard(text);
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

})();
