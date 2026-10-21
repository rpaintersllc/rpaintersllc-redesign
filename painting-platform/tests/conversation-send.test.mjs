import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountConversation} from '../web/conversation.js';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,handle=()=>{}){
 const previous={document:globalThis.document,fetch:globalThis.fetch};const {document}=parseHTML('<html><body><section id="target"></section></body></html>');globalThis.document=document;const calls=[];
 globalThis.fetch=async(url,options)=>{const action=new URL(url).searchParams.get('action'),body=JSON.parse(options.body);calls.push({action,body});return await handle(action,body,calls)||Response.json(action==='conversation'?{messages:[],visits:[]}:{ok:true})};
 try{const target=document.querySelector('#target');await mountConversation(target,{project_id:'mock-project',access_token:'mock-private'});const input=target.querySelector('textarea'),form=input.closest('form'),button=form.querySelector('button'),status=target.querySelector('[role="status"]');await run({target,input,form,button,status,calls,submit:()=>form.onsubmit({preventDefault(){}})})}finally{Object.assign(globalThis,previous)}
}
test('pending message rejects repeated submits even if the draft changes',async()=>{
 const pending=deferred(),started=deferred();await screen(async({input,form,button,calls,submit})=>{
 input.value='First message';const send=submit();await started.promise;input.value='Next draft';await submit();assert.equal(calls.filter(c=>c.action==='message').length,1);assert.equal(button.disabled,true);assert.equal(form.getAttribute('aria-busy'),'true');pending.resolve(Response.json({ok:true}));await send;assert.equal(button.disabled,false);assert.equal(form.hasAttribute('aria-busy'),false);
 },action=>{if(action==='message'){started.resolve();return pending.promise}});
});
test('successful slow message preserves a newer draft',async()=>{
 const pending=deferred(),started=deferred();await screen(async({input,status,submit})=>{
 input.value='Original message';const send=submit();await started.promise;input.value='A new question';pending.resolve(Response.json({ok:true}));await send;assert.equal(input.value,'A new question');assert.match(status.textContent,/Message saved to the project/);
 },action=>{if(action==='message'){started.resolve();return pending.promise}});
});
test('saved message with failed refresh is explicit and is not retried automatically',async()=>{
 let reads=0;await screen(async({input,status,calls,submit})=>{
 input.value='A question';await submit();assert.equal(input.value,'');assert.match(status.textContent,/Message saved, but the conversation could not refresh/);assert.match(status.textContent,/Do not resend/);assert.equal(calls.filter(c=>c.action==='message').length,1);
 },action=>{if(action==='conversation'&&++reads>1)return Response.json({error:'Read failed'},{status:503})});
});
test('failed send keeps draft and reuses idempotency key for a deliberate retry',async()=>{
 let sends=0;await screen(async({input,status,calls,submit,button})=>{
 input.value='Retry this question';await submit();assert.equal(input.value,'Retry this question');assert.match(status.textContent,/Send failed/);assert.equal(button.disabled,false);await submit();const sent=calls.filter(c=>c.action==='message');assert.equal(sent.length,2);assert.equal(sent[0].body.request_key,sent[1].body.request_key);assert.equal(input.value,'');
 },action=>{if(action==='message'&&++sends===1)return Response.json({error:'Send failed'},{status:503})});
});
