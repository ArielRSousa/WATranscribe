// Página offscreen — roda o Whisper via WebAssembly no próprio Chrome
import { pipeline, env } from './lib/transformers.min.js';

env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2/dist/';
env.allowLocalModels = false;
env.useBrowserCache  = true;

let transcriber    = null;
let currentModel   = null;
let loadingPromise = null;

// ─── Listener de mensagens ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender) => {
  if (msg.target !== 'offscreen') return false;

  if (msg.action === 'transcribe') {
    const { tabId, messageId } = msg;

    runTranscription(msg)
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

// ─── Transcrição ──────────────────────────────────────────────────────────────

async function runTranscription({ audioBase64, mimeType, isRaw, model, provider, groqApiKey, tabId }) {
  if ((provider || 'groq') === 'groq') {
    notify('Enviando audio para Groq...', tabId);
    return transcribeWithGroq({ audioBase64, mimeType, groqApiKey });
  }

  const modelId = model || 'Xenova/whisper-base';

  if (!transcriber || currentModel !== modelId) {
    await loadModel(modelId, tabId);
  }

  let samples;

  if (isRaw) {
    notify('Transcrevendo...', tabId);
    const bytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    samples = new Float32Array(bytes.buffer);
  } else {
    notify('Decodificando áudio...', tabId);
    samples = await decodeAudioBlob(audioBase64, mimeType);
    notify('Transcrevendo...', tabId);
  }

  const result = await transcriber(samples, {
    language: 'portuguese',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
    sampling_rate: 16000,
  });

  return result.text.trim();
}

async function transcribeWithGroq({ audioBase64, mimeType, groqApiKey }) {
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY ausente. Configure no popup da extensao.');
  }

  const bytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
  const type = mimeType || 'audio/ogg';
  const ext = guessAudioExtension(type);
  const blob = new Blob([bytes], { type });
  const file = new File([blob], `audio.${ext}`, { type });

  const form = new FormData();
  form.append('file', file);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'pt');
  form.append('response_format', 'json');
  form.append('temperature', '0');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: form,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.error?.message || 'Erro ao chamar Groq';
    throw new Error(detail);
  }

  const text = payload?.text?.trim();
  if (!text) throw new Error('Groq retornou transcricao vazia.');
  return text;
}

// ─── Carregamento de modelo ───────────────────────────────────────────────────

async function loadModel(modelId, tabId) {
  if (loadingPromise) { await loadingPromise; return; }

  currentModel   = modelId;
  loadingPromise = pipeline('automatic-speech-recognition', modelId, {
    progress_callback: ({ status, progress }) => {
      if (status === 'progress') notify(`Baixando modelo (${Math.round(progress)}%) — só na 1ª vez...`, tabId);
      if (status === 'done')     notify('Modelo pronto!', tabId);
    },
  }).then(p => {
    transcriber    = p;
    loadingPromise = null;
  }).catch(err => {
    loadingPromise = null;
    throw err;
  });

  await loadingPromise;
}

// ─── Decodificação de blob de áudio ──────────────────────────────────────────

async function decodeAudioBlob(base64, mimeType) {
  const bytes   = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob    = new Blob([bytes], { type: mimeType });
  const buffer  = await blob.arrayBuffer();
  const ctx     = new AudioContext({ sampleRate: 16000 });
  const decoded = await ctx.decodeAudioData(buffer);
  await ctx.close();
  return decoded.getChannelData(0);
}

// ─── Notificação de progresso ─────────────────────────────────────────────────

function notify(message, tabId) {
  chrome.runtime.sendMessage({ action: 'whisperProgress', message, tabId });
}

function guessAudioExtension(mimeType) {
  const normalized = (mimeType || '').toLowerCase();
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('mp4')) return 'm4a';
  return 'ogg';
}
