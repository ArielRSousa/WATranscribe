const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('extension/content.js','utf8');
const fn=source.slice(source.indexOf('function getResultWrapper'),source.indexOf('\nfunction addTranscribeBtn'));
for(const id of ['3EB04B-outgoing','3A7FA7-incoming']) {
  test(`anchors controls inside bubble with opaque ID ${id}`,()=>{
    const wrapper={};
    const bubble={querySelector:()=>bubble.child||null,appendChild(w){bubble.child=w;w.parentElement=bubble;}};
    const row={querySelector:()=>({closest:()=>bubble}),contains:e=>e===bubble};
    const context={document:{createElement:()=>wrapper},row};vm.createContext(context);vm.runInContext(fn,context);
    const result=vm.runInContext('getResultWrapper(row)',context);
    assert.equal(result.parentElement,bubble);
    assert.equal(vm.runInContext('getResultWrapper(row)',context),result);
  });
}
test('moves legacy sibling wrapper into bubble without discarding contents',()=>{
  const legacy={classList:{contains:()=>true},content:'existing transcription'};
  const bubble={querySelector:()=>null,appendChild(w){w.parentElement=bubble;}};
  const row={querySelector:()=>({closest:()=>bubble}),contains:()=>true,nextElementSibling:legacy};
  const context={row};vm.createContext(context);vm.runInContext(fn,context);
  assert.equal(vm.runInContext('getResultWrapper(row)',context),legacy);
  assert.equal(legacy.parentElement,bubble);assert.equal(legacy.content,'existing transcription');
});
