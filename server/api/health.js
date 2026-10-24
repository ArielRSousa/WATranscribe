import { configuration, redisStore, replyError } from '../lib/service.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({error:'Use GET.'}); }
  try {
    const config = configuration();
    await redisStore(config)('PING');
    res.status(200).json({ ok:true });
  } catch (err) { replyError(res, err); }
}
