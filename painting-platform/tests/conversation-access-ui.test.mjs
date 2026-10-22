import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountConversation} from '../web/conversation.js';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,handle=()=>{}){
 const previous={document:globalThis.document,fetch:globalThis.fetch};const {document}=parseHTML('<html><body><section id="target"></section></body></html>');globalThis.document=document;const calls=[];
 globalThis.fetch=async(url,options)=>{const action=new URL(url).searchParams.get('action'),body=JSON.parse(options.body);calls.push({action,body});return await handle(action,body,calls)||Response.json(action==='conversation'?{messages:[{author:'homeowner',body:'Private sample text',created_at:'2026-10-21T12:00:00Z'}],visits:[{id:'visit',preferred_date:'2026-11-10',time_window:'Morning',status:'requested'}]}:{ok:true})};
 try{const target=document.querySelector('#target');await mountConversation(target,{project_id:'mock-project',access_token:'mock-private'});const input=target.querySelector('textarea'),form=input.closest('form'),button=form.querySelector('button'),status=target.querySelector('[role="status"]');await run({target,input,form,button,status,calls,refresh:()=>target.querySelector('button.secondary').onclick(),submit:()=>form.onsubmit({preventDefault(){}})})}finally{Object.assign(globalThis,previous)}
}
test('an initial failed read blocks sends until a successful conversation refresh',async()=>{
 let reads=0;
 await screen(async({input,button,calls,submit,refresh})=>{
  assert.equal(input.disabled,true);assert.equal(button.disabled,true);input.value='Blocked draft';await submit();assert.equal(calls.filter(c=>c.action==='message').length,0);
  await refresh();assert.equal(input.disabled,false);assert.equal(button.disabled,false);await submit();assert.equal(calls.filter(c=>c.action==='message').length,1);
 },action=>action==='conversation'&&++reads===1?Response.json({error:'Read failed'},{status:503}):undefined);
});
for(const code of [401,403,404])test('conversation denial '+code+' clears private content and stays blocked through a network error',async()=>{
 let reads=0;
 await screen(async({target,input,button,calls,submit,refresh})=>{
  input.value='Private unsent draft';await refresh();
  assert.equal(target.querySelector('.message-thread').textContent,'');assert.equal(target.querySelector('.visits').textContent,'');assert.equal(input.value,'');assert.equal(button.disabled,true);
  await refresh();assert.equal(button.disabled,true);assert.equal(input.disabled,true);
  input.value='Must not send';await submit();assert.equal(calls.filter(c=>c.action==='message').length,0);
  await refresh();assert.equal(button.disabled,false);assert.match(target.querySelector('.message-thread').textContent,/Private sample text/);
 },action=>{if(action!=='conversation')return;if(++reads===2)return Response.json({error:'Denied'},{status:code});if(reads===3)throw Error('Network unavailable')});
});
test('a denied message write retires the thread and disables further sends',()=>screen(async({target,input,button,calls,submit})=>{
 input.value='Private draft';await submit();assert.equal(input.value,'');assert.equal(button.disabled,true);assert.equal(target.querySelector('.message-thread').textContent,'');
 input.value='No retry without refresh';await submit();assert.equal(calls.filter(c=>c.action==='message').length,1);
},action=>action==='message'?Response.json({error:'Denied'},{status:401}):undefined));
test('a denied visit decision retires private content and the old visit controls',()=>screen(async({target,button,calls})=>{
 const cancel=target.querySelector('.visit-item button');await cancel.onclick();assert.equal(button.disabled,true);assert.equal(target.querySelector('.message-thread').textContent,'');assert.equal(target.querySelector('.visits').textContent,'');
 await cancel.onclick();assert.equal(calls.filter(c=>c.action==='visit-update').length,1);
},action=>action==='visit-update'?Response.json({error:'Denied'},{status:403}):undefined));
test('an older read cannot restore a thread after a newer message access denial',async()=>{
 const reply=deferred(),started=deferred();let reads=0;
 await screen(async({target,input,button,refresh,submit})=>{
  const pending=refresh();await started.promise;input.value='A question';await submit();
  reply.resolve(Response.json({messages:[{author:'homeowner',body:'Stale private text',created_at:'2026-10-21T12:00:00Z'}],visits:[]}));await pending;
  assert.equal(button.disabled,true);assert.equal(target.querySelector('.message-thread').textContent,'');assert.equal(target.querySelector('.visits').textContent,'');
 },action=>{if(action==='conversation'&&++reads===2){started.resolve();return reply.promise}if(action==='message')return Response.json({error:'Denied'},{status:403})});
});
