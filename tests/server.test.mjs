import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anonymousClient, parseAudio, reserve, transcribe, configuration } from '../server/lib/service.js';
const audio = parseAudio({audioBase64:Buffer.from('test-audio').toString('base64'),mimeType:'audio/ogg; codecs=opus'});
test('anonymous access needs no client token; missing server configuration fails closed', () => {
  assert.throws(() => configuration({}), {status:503});
  const config = configuration({GROQ_API_KEYS:'["key"]',UPSTASH_REDIS_REST_URL:'https://redis.example',UPSTASH_REDIS_REST_TOKEN:'redis'});
  assert.deepEqual(config.keys,['key']);
  assert.equal(anonymousClient({headers:{},socket:{remoteAddress:'127.0.0.1'}}).length,64);
});
test('validates audio size, base64 and type before upstream calls', () => {
  assert.throws(() => parseAudio({audioBase64:'a'.repeat(4000004)}), {status:413});
  assert.throws(() => parseAudio({audioBase64:'!!!!'}), {status:400});
  assert.throws(() => parseAudio({audioBase64:'YQ==',mimeType:'text/html'}), {status:415});
  assert.equal(audio.extension,'ogg');
});
test('invalid first key falls back without exposing credentials', async () => {
  const used=[];
  const result=await transcribe(audio,['first','second'],async()=>{},async (url,options)=>{
    used.push(options.headers.Authorization);
    return used.length===1 ? new Response('',{status:401}) : Response.json({text:' Olá! '});
  });
  assert.equal(result,'Olá!'); assert.deepEqual(used,['Bearer first','Bearer second']);
});
test('429 stops key rotation and stores provider cooldown', async () => {
  let calls=0; const commands=[];
  await assert.rejects(transcribe(audio,['first','second'],async (...cmd)=>commands.push(cmd),async()=>{
    calls++;return new Response('',{status:429,headers:{'Retry-After':'90'}});
  }), {status:429,retryAfter:90});
  assert.equal(calls,1);assert.equal(commands[0].at(-1),90);
});
test('shared limiter blocks before upstream', async () => {
  await assert.rejects(reserve(async()=>25,'client'),{status:429,retryAfter:25});
});
test('all invalid keys yield sanitized administrator error', async () => {
  await assert.rejects(transcribe(audio,['secret'],async()=>{},async()=>new Response('secret',{status:401})),error=>error.status===503&&!error.message.includes('secret'));
});
test('upstream outage and malformed success are handled', async () => {
  await assert.rejects(transcribe(audio,['key'],async()=>{},async()=>new Response('',{status:503})),{status:503});
  await assert.rejects(transcribe(audio,['key'],async()=>{},async()=>Response.json({})),{status:502});
});
