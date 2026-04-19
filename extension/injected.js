// Roda no contexto PRINCIPAL do WhatsApp Web (world: MAIN)
(function () {
  'use strict';

  // ── Encontra a mensagem pelo data-id ─────────────────────────────────────────

  function findMsg(messageId) {
    const col = window.require('WAWebCollections');

    // 1) Direto na coleção global
    const direct = col?.Msg?.get?.(messageId);
    if (direct) return direct;

    // 2) Chat ativo → chat.msgs
    const chatCol = col?.Chat;
    const chats = chatCol?.models
      ?? (chatCol && Symbol.iterator in Object(chatCol) ? [...chatCol] : []);
    const activeChat =
      chatCol?.active ??
      chats.find(c => c.active) ??
      chats.find(c => c.isOpen);

    if (activeChat) {
      const fromChat = activeChat.msgs?.get?.(messageId);
      if (fromChat) return fromChat;

      let found = null;
      activeChat.msgs?.forEach?.(m => {
        if (found) return;
        const s = m?.id?._serialized ?? String(m?.id ?? '');
        if (s === messageId || s.endsWith('_' + messageId)) found = m;
      });
      if (found) return found;
    }

    // 3) Varredura global
    let found = null;
    col?.Msg?.forEach?.(m => {
      if (found) return;
      const s = m?.id?._serialized ?? String(m?.id ?? '');
      if (s === messageId || s.endsWith('_' + messageId)) found = m;
    });
    return found;
  }

  // ── Estratégia 1: DownloadManager do WhatsApp ─────────────────────────────

  async function tryDownloadManager(msg) {
    const dmModule = window.require('WAWebDownloadManager');
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
      : (raw instanceof Blob ? raw : null);

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
    if (typeof window.require !== 'function') {
      throw new Error('WhatsApp ainda não carregou (window.require indisponível).');
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

  // ── Escuta pedidos do content.js ─────────────────────────────────────────

  window.addEventListener('wpp-request-audio', async (e) => {
    const messageId = e.detail?.messageId;
    if (!messageId) return;

    try {
      const { blobData, mimeType } = await downloadAudio(messageId);
      const audioBase64 = bufToBase64(blobData);
      window.postMessage(
        { _wpp: true, type: 'audio-ready', audioBase64, mimeType, messageId },
        '*'
      );
    } catch (err) {
      window.postMessage(
        { _wpp: true, type: 'audio-error', error: err.message, messageId },
        '*'
      );
    }
  });

})();
