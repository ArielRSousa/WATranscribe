const status = document.getElementById('serviceStatus');
const retry = document.getElementById('retryBtn');
async function checkService() {
  retry.hidden = true;
  status.textContent = 'Verificando disponibilidade…';
  try {
    const response = await fetch('https://watranscribe-api.vercel.app/api/health', { signal:AbortSignal.timeout(10000), cache:'no-store' });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error('unavailable');
    status.textContent = '● Serviço disponível. Abra o WhatsApp para começar.';
  } catch {
    status.textContent = 'Serviço temporariamente indisponível. Tente novamente em instantes.';
    retry.hidden = false;
  }
}
retry.addEventListener('click', checkService);
checkService();
