const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('extension/injected.js','utf8');
const functions=source.slice(source.indexOf('  function collectionModels'),source.indexOf('  // ── Estratégia 1'));
function lookup(collections,id){const c={window:{require:()=>collections},id};vm.createContext(c);vm.runInContext(functions,c);return vm.runInContext('findMsg(id)',c);}
for (const fromMe of [true,false]) {
 test(`group audio ${fromMe?'sent':'received'} matches stanza before participant`,()=>{
  const msg={id:{id:'ABC123',_serialized:`${fromMe}_group@g.us_ABC123_person@lid`}};
  assert.equal(lookup({Msg:{models:[msg]}},'ABC123'),msg);
 });
}
test('serialized-only group IDs match correctly',()=>{
 const msg={id:{_serialized:'false_group@g.us_ABC123_person@lid'}};
 assert.equal(lookup({Msg:{models:[msg]}},'ABC123'),msg);
});
test('searches loaded chat when global collection and active flag are absent',()=>{
 const msg={id:{id:'ABC123',_serialized:'false_group@g.us_ABC123_person@lid'}};
 assert.equal(lookup({Chat:{getModelsArray:()=>[{msgs:{models:[msg]}}]}},'ABC123'),msg);
});
test('private chat and full serialized identifiers continue working',()=>{
 const msg={id:{id:'ABC123',_serialized:'false_person@c.us_ABC123'}};
 const col={Msg:{models:[msg]}};
 assert.equal(lookup(col,'ABC123'),msg);assert.equal(lookup(col,msg.id._serialized),msg);
});
test('does not confuse participant suffix with message ID or select ambiguous audio',()=>{
 const a={id:{_serialized:'false_group@g.us_ABC123_person@lid'}};
 const b={id:{_serialized:'false_other@g.us_ABC123_person@lid'}};
 assert.equal(lookup({Msg:{models:[a]}},'person@lid'),null);
 assert.equal(lookup({Msg:{models:[a,b]}},'ABC123'),null);
});
