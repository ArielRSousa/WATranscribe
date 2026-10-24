import { createHash } from 'node:crypto';
export const MAX_AUDIO_BYTES = 3_000_000;
export class HttpError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
export function configuration(env = process.env) {
  try {
    const keys = JSON.parse(env.GROQ_API_KEYS);

    if (!Array.isArray(keys) || !keys.length || keys.length > 3 || keys.some(k => typeof k !== 'string' || !k.trim())) throw 0;

    if (!env.UPSTASH_REDIS_REST_URL?.startsWith('https://') || !env.UPSTASH_REDIS_REST_TOKEN) throw 0;
    return { keys: [...new Set(keys)], redisUrl: env.UPSTASH_REDIS_REST_URL, redisToken: env.UPSTASH_REDIS_REST_TOKEN };
  } catch { throw new HttpError(503, 'Servidor ainda não configurado.'); }
}
export function anonymousClient(req) {
  // Vercel overwrites this header. Outside Vercel, trust only the socket.
  const ip = process.env.VERCEL === '1' ? req.headers['x-forwarded-for'] : req.socket?.remoteAddress;
  if (typeof ip !== 'string' || !ip.trim()) throw new HttpError(503, 'Não foi possível verificar o acesso.');
  return createHash('sha256').update(new Date().toISOString().slice(0,10) + ':' + ip.split(',')[0].trim()).digest('hex');
}
export function parseAudio(body) {
  const { audioBase64, mimeType } = body || {};
  if (typeof audioBase64 !== 'string' || !audioBase64.length || audioBase64.length > 4_000_000) throw new HttpError(413, 'Envie um áudio de até 3 MB.');
  if (audioBase64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(audioBase64) || Buffer.from(audioBase64, 'base64').toString('base64') !== audioBase64) throw new HttpError(400, 'Áudio inválido.');
  const type = (mimeType || 'audio/ogg').split(';')[0].toLowerCase();
  const extensions = { 'audio/ogg':'ogg', 'audio/webm':'webm', 'audio/mpeg':'mp3', 'audio/mp3':'mp3', 'audio/mp4':'m4a', 'audio/wav':'wav', 'audio/x-wav':'wav', 'audio/flac':'flac' };
  if (!extensions[type]) throw new HttpError(415, 'Formato de áudio não suportado.');
  const bytes = Buffer.from(audioBase64, 'base64');
  if (!bytes.length || bytes.length > MAX_AUDIO_BYTES) throw new HttpError(413, 'Envie um áudio de até 3 MB.');
  return { bytes, type, extension: extensions[type] };
}
export function redisStore(config, fetcher = fetch) {
  return async (...command) => {
    try {
      const response = await fetcher(config.redisUrl, { method:'POST', headers:{ Authorization:`Bearer ${config.redisToken}`, 'Content-Type':'application/json' }, body:JSON.stringify(command), signal:AbortSignal.timeout(5000) });
      const data = await response.json();
      if (!response.ok || data.error) throw 0;
      return data.result;
    } catch { throw new HttpError(503, 'Controle de uso indisponível. Tente novamente mais tarde.'); }
  };
}
export async function reserve(store, client) {
  // All limits are reserved atomically across serverless instances.
  const result = await store('EVAL', `
    local ttl=redis.call('TTL',KEYS[1]); if ttl>0 then return ttl end
    local limits={5,20,100}; local windows={60,86400,86400}
    for i=2,4 do
      if tonumber(redis.call('GET',KEYS[i]) or '0')>=limits[i-1] then return math.max(1,redis.call('TTL',KEYS[i])) end
    end
    for i=2,4 do
      local n=redis.call('INCR',KEYS[i]); if n==1 then redis.call('EXPIRE',KEYS[i],windows[i-1]) end
    end
    return 0`, 4, 'watranscribe:cooldown', `watranscribe:minute:${client}`, `watranscribe:day:${client}`, 'watranscribe:public:daily');
  if (Number(result) > 0) throw new HttpError(429, 'Limite temporário. Aguarde antes de tentar novamente.', Number(result));
}
export async function transcribe(audio, keys, store, fetcher = fetch) {
  for (const key of keys) {
    const form = new FormData();
    form.append('file', new Blob([audio.bytes], { type:audio.type }), `audio.${audio.extension}`);
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'pt');
    form.append('response_format', 'json');
    let response;
    try { response = await fetcher('https://api.groq.com/openai/v1/audio/transcriptions', { method:'POST', headers:{ Authorization:`Bearer ${key}` }, body:form, signal:AbortSignal.timeout(12000) }); }
    catch { throw new HttpError(504, 'A Groq não respondeu a tempo. Tente novamente.'); }
    // A revoked credential can fall back; quotas never trigger account rotation.
    if (response.status === 401) continue;
    if (response.status === 429) {
      const header = response.headers.get('retry-after');
      const seconds = Number(header);
      const delay = Math.max(1, Math.ceil(header && Number.isFinite(seconds) ? seconds : header && Number.isFinite(Date.parse(header)) ? (Date.parse(header)-Date.now())/1000 : 60));
      await store('EVAL', `local ttl=redis.call('TTL',KEYS[1]); if ttl<tonumber(ARGV[1]) then redis.call('SET',KEYS[1],'1','EX',ARGV[1]) end; return 1`, 1, 'watranscribe:cooldown', delay);
      throw new HttpError(429, 'Limite da Groq atingido. Aguarde para tentar novamente.', delay);
    }
    if (!response.ok) throw new HttpError(response.status >= 500 ? 503 : 422, 'A Groq não conseguiu transcrever este áudio.');
    const payload = await response.json().catch(() => null);
    if (typeof payload?.text !== 'string' || !payload.text.trim()) throw new HttpError(502, 'A Groq retornou uma transcrição vazia.');
    return payload.text.trim();
  }
  throw new HttpError(503, 'As credenciais do servidor precisam ser atualizadas pelo administrador.');
}
export function replyError(res, err) {
  if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
  res.status(err instanceof HttpError ? err.status : 500).json({ error: err instanceof HttpError ? err.message : 'Falha interna do servidor.' });
}
