import { configuration, anonymousClient, parseAudio, redisStore, reserve, transcribe, replyError } from '../lib/service.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({error:'Use POST.'}); }
  try {
    const config = configuration();
    const client = anonymousClient(req);
    const audio = parseAudio(req.body);
    const store = redisStore(config);
    await reserve(store, client);
    res.status(200).json({ text:await transcribe(audio, config.keys, store) });
  } catch (err) { replyError(res, err); }
}
