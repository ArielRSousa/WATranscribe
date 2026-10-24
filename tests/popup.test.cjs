const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
async function setup(ok) {
  const elements={serviceStatus:{},retryBtn:{addEventListener(){}}};
  vm.runInNewContext(fs.readFileSync('extension/popup.js','utf8'),{document:{getElementById:id=>elements[id]},AbortSignal,fetch:async()=>({ok,json:async()=>({ok})})});
  await new Promise(r=>setImmediate(r));return elements;
}
test('anonymous popup shows service availability without credentials',async()=>{
  const e=await setup(true);assert.match(e.serviceStatus.textContent,/disponível/);assert.equal(e.retryBtn.hidden,true);
});
test('unavailable server offers retry, never claims readiness',async()=>{
  const e=await setup(false);assert.match(e.serviceStatus.textContent,/indisponível/);assert.equal(e.retryBtn.hidden,false);
});
test('public popup contains no server or credential form',()=>{
  const html=fs.readFileSync('extension/popup.html','utf8');assert.doesNotMatch(html,/<input|<form|providerSelect/);
});
test('transcription uses the public endpoint without Authorization or saved credentials',async()=>{
  let request;
  const context={chrome:{runtime:{onMessage:{addListener(){}},sendMessage(){}}},AbortSignal,fetch:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({text:'Olá'})};}};
  vm.createContext(context);vm.runInContext(fs.readFileSync('extension/offscreen.js','utf8'),context);
  const result=await vm.runInContext("transcribeWithServer({audioBase64:'YQ==',mimeType:'audio/ogg'})",context);
  assert.equal(result,'Olá');assert.equal(request.url,'https://watranscribe-api.vercel.app/api/transcribe');assert.equal(request.options.headers.Authorization,undefined);
});
