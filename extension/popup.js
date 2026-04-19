const MODELS = [
  { id: 'Xenova/whisper-tiny', name: 'tiny', size: '~75 MB', note: 'mais rapido' },
  { id: 'Xenova/whisper-base', name: 'base', size: '~145 MB', note: 'equilibrado' },
  { id: 'Xenova/whisper-small', name: 'small', size: '~465 MB', note: 'mais preciso' },
  { id: 'Xenova/whisper-medium', name: 'medium', size: '~1.5 GB', note: 'melhor qualidade' },
];

const modelSelect = document.getElementById('modelSelect');
const saveBtn = document.getElementById('saveBtn');
const refreshBtn = document.getElementById('refreshBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const feedback = document.getElementById('feedback');
const activeChip = document.getElementById('activeChip');
const modelsList = document.getElementById('modelsList');

init().catch((err) => setFeedback(`Erro ao iniciar: ${err.message}`, true));

saveBtn.addEventListener('click', async () => {
  await chrome.storage.sync.set({ model: modelSelect.value });
  await refreshUI();
  setFeedback('Modelo salvo com sucesso.');
});

refreshBtn.addEventListener('click', async () => {
  await refreshUI();
  setFeedback('Status atualizado.');
});

clearAllBtn.addEventListener('click', async () => {
  clearAllBtn.disabled = true;
  setFeedback('Limpando caches de modelos...');
  try {
    await clearModelCache();
    await refreshUI();
    setFeedback('Caches removidos. Modelos serao baixados novamente quando usados.');
  } catch (err) {
    setFeedback(`Falha ao limpar cache: ${err.message}`, true);
  } finally {
    clearAllBtn.disabled = false;
  }
});

async function init() {
  MODELS.forEach((m) => {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = `${m.name} - ${m.size} (${m.note})`;
    modelSelect.appendChild(option);
  });
  await refreshUI();
}

async function refreshUI() {
  const stored = await chrome.storage.sync.get('model');
  const current = stored.model || 'Xenova/whisper-base';
  modelSelect.value = current;
  activeChip.textContent = `Em uso: ${formatModel(current)}`;

  const cacheState = await getCacheState();
  renderModelList(current, cacheState);
}

function renderModelList(currentModel, cacheState) {
  modelsList.innerHTML = '';
  MODELS.forEach((model) => {
    const downloaded = cacheState.downloaded.has(model.id);
    const item = document.createElement('div');
    item.className = 'model-item';
    item.innerHTML = `
      <div class="model-top">
        <div>
          <div class="model-name">${model.name}</div>
          <div class="model-meta">${model.size} - ${model.note}</div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          ${currentModel === model.id ? '<span class="badge in-use">em uso</span>' : ''}
          <span class="badge ${downloaded ? 'is-downloaded' : 'not-downloaded'}">
            ${downloaded ? 'baixado' : 'nao baixado'}
          </span>
        </div>
      </div>
      <div class="row" style="margin-top:8px;">
        <button class="btn-secondary use-btn" data-model="${model.id}" style="flex:1">Usar este modelo</button>
        <button class="btn-danger remove-btn" data-model="${model.id}" ${downloaded ? '' : 'disabled'}>
          Remover
        </button>
      </div>
    `;
    modelsList.appendChild(item);
  });

  modelsList.querySelectorAll('.use-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await chrome.storage.sync.set({ model: btn.dataset.model });
      await refreshUI();
      setFeedback(`Modelo ativo: ${formatModel(btn.dataset.model)}.`);
    });
  });

  modelsList.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      setFeedback(`Removendo cache de ${formatModel(btn.dataset.model)}...`);
      try {
        await clearModelCache(btn.dataset.model);
        await refreshUI();
        setFeedback(`Cache removido para ${formatModel(btn.dataset.model)}.`);
      } catch (err) {
        setFeedback(`Erro ao remover cache: ${err.message}`, true);
      }
    });
  });
}

async function getCacheState() {
  const downloaded = new Set();
  const names = await caches.keys();
  for (const cacheName of names) {
    const cache = await caches.open(cacheName);
    const reqs = await cache.keys();
    for (const req of reqs) {
      const url = req.url;
      for (const model of MODELS) {
        if (matchesModelUrl(url, model.id)) downloaded.add(model.id);
      }
    }
  }
  return { downloaded };
}

async function clearModelCache(targetModelId) {
  const names = await caches.keys();
  for (const cacheName of names) {
    const cache = await caches.open(cacheName);
    const reqs = await cache.keys();
    for (const req of reqs) {
      if (!isModelCacheUrl(req.url)) continue;
      if (targetModelId && !matchesModelUrl(req.url, targetModelId)) continue;
      await cache.delete(req);
    }
  }
}

function isModelCacheUrl(url) {
  return url.includes('huggingface.co') ||
         url.includes('cdn.jsdelivr.net') ||
         url.includes('xenova') ||
         url.includes('onnx') ||
         url.includes('transformers');
}

function matchesModelUrl(url, modelId) {
  const slug = modelId.split('/')[1];
  const normalized = url.toLowerCase();
  return normalized.includes(modelId.toLowerCase()) ||
         normalized.includes(slug.toLowerCase()) ||
         normalized.includes(`models--xenova--${slug.toLowerCase()}`);
}

function formatModel(modelId) {
  const model = MODELS.find((m) => m.id === modelId);
  return model ? `${model.name} (${model.size})` : modelId;
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? '#ff9b9b' : '#89d9c8';
}
