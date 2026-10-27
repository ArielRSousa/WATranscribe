const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync('userscripts/watranscribe.user.js','utf8');
function load(responder,consent=true) {
 let calls=0;
 const context={testApi:{},GM_addStyle(){},GM_xmlhttpRequest(options){calls++;responder(options);},MutationObserver:class {observe(){}},document:{body:{},querySelectorAll(){return[];}},window:{confirm:()=>consent},setTimeout,clearTimeout};
 vm.createContext(context);
 // Expose the public operation only in the test copy, never in the page.
 vm.runInContext(code.replace('\nstart();','\nObject.assign(testApi,{requestTranscription,handleTranscription});'),context);
 return {context,get calls(){return calls;}};
}
test('standalone bundle has no Chrome APIs or external script dependencies',()=>{
 assert.doesNotMatch(code,/chrome\.runtime|chrome\.storage|^\/\/ @require /m);
 assert.match(code,/^\/\/ @match\s+https:\/\/web\.whatsapp\.com\/\*/m);
});
test('sends selected audio only to the configured server without cookies',async()=>{
 const app=load(options=>{
  assert.equal(options.url,'https://watranscribe-api.vercel.app/api/transcribe');
  assert.equal(options.anonymous,true);
  assert.equal(JSON.parse(options.data).audioBase64,'YQ==');
  options.onload({status:200,responseText:'{"text":" Olá "}'});
 });
 assert.equal(await app.context.testApi.requestTranscription('YQ==','audio/ogg'),'Olá');
});
test('oversized payload is rejected before network activity',async()=>{
 const app=load(()=>assert.fail());
 await assert.rejects(app.context.testApi.requestTranscription('a'.repeat(4000001),'audio/ogg'),/3 MB/);
 assert.equal(app.calls,0);
});
test('quota and timeout errors reach the user',async()=>{
 const quota=load(o=>o.onload({status:429,responseHeaders:'Retry-After: 40',responseText:'{"error":"Limite"}'}));
 await assert.rejects(quota.context.testApi.requestTranscription('YQ==','audio/ogg'),/40s/);
 const timeout=load(o=>o.ontimeout());
 await assert.rejects(timeout.context.testApi.requestTranscription('YQ==','audio/ogg'),/demorou/);
});
test('declining consent does not read audio or make requests',async()=>{
 const app=load(()=>assert.fail(),false);
 const button={disabled:false};
 await app.context.testApi.handleTranscription({},button,'id');
 assert.equal(button.disabled,false);assert.equal(app.calls,0);
});
