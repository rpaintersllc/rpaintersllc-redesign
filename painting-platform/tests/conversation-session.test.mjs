import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountConversation} from '../web/conversation.js';
import {saveSession,clearSession,sessionToken} from '../web/auth-session.js';
const login=()=>saveSession({access_token:'synthetic-current',refresh_token:'synthetic-refresh',expires_in:3600});
const replace=()=>saveSession({access_token:'synthetic-next',refresh_token:'synthetic-next-refresh',expires_in:3600});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,{access={project_id:'synthetic-project'},handle=()=>{},visits=[]}={}){
 const old={document:globalThis.document,fetch:globalThis.fetch,sessionStorage:globalThis.sessionStorage};
 const {document}=parseHTML('<html><body><section id="target"></section></body></html>');globalThis.document=document;
 const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};clearSession();login();
 const calls=[];let callbacks=0;
 globalThis.fetch=async(url,options={})=>{const action=new URL(url).searchParams.get('action');calls.push({action,options});const custom=await handle(action,options,calls);if(custom)return custom;return Response.json(action==='conversation'?{messages:[{author:'homeowner',body:'Synthetic private conversation',created_at:'2026-10-23T12:00:00Z'}],visits}:{ok:true})};
 try{const target=document.querySelector('#target');await mountConversation(target,access,sessionToken,()=>{callbacks++});const input=target.querySelector('textarea'),form=input.closest('form');await run({target,input,status:target.querySelector('[role="status"]'),calls,callbacks:()=>callbacks,refresh:()=>target.querySelector('button.secondary').onclick(),send:()=>form.onsubmit({preventDefault(){}})})}finally{clearSession();Object.assign(globalThis,old)}
}
for(const change of ['logout','new-login'])for(const failure of [false,true])test('account conversation '+(failure?'error':'read')+' after '+change+' retires private controls',()=>{
 const reply=deferred(),started=deferred();let reads=0;return screen(async({target,input,status,refresh})=>{
  input.value='Private draft';const pending=refresh();await started.promise;if(change==='logout')clearSession();else replace();reply.resolve(failure?Response.json({error:'Old response'},{status:503}):Response.json({messages:[{author:'homeowner',body:'Old private content',created_at:'2026-10-23'}],visits:[]}));await pending;
  assert.equal(target.querySelector('.message-thread').textContent,'');assert.equal(target.querySelector('.visits').textContent,'');assert.equal(input.value,'');assert.equal(input.disabled,true);assert.match(status.textContent,/session changed/);
 },{handle:action=>{if(action==='conversation'&&++reads===2){started.resolve();return reply.promise}}});
});
test('a changed session cannot send using a previously loaded account thread',()=>screen(async({input,send,calls,status})=>{
 replace();input.value='Must not dispatch';await send();assert.equal(calls.filter(c=>c.action==='message').length,0);assert.equal(input.disabled,true);assert.match(status.textContent,/session changed/);
}));
test('late account message success after logout does not reload or assert a current save',()=>{
 const reply=deferred(),started=deferred();return screen(async({target,input,send,calls,status})=>{
  input.value='Synthetic pending message';const pending=send();await started.promise;clearSession();reply.resolve(Response.json({ok:true}));await pending;assert.equal(calls.filter(c=>c.action==='conversation').length,1);assert.equal(target.querySelector('.message-thread').textContent,'');assert.equal(input.disabled,true);assert.match(status.textContent,/already sent may have been saved/);
 },{handle:action=>{if(action==='message'){started.resolve();return reply.promise}}});
});
test('late visit request after another login cannot run the project callback',()=>{
 const reply=deferred(),started=deferred();return screen(async({target,callbacks,status})=>{
  const form=target.querySelector('.visit-request');form.querySelector('input').value='2026-11-10';const pending=form.onsubmit({preventDefault(){}});await started.promise;replace();reply.resolve(Response.json({ok:true}));await pending;assert.equal(callbacks(),0);assert.equal(target.querySelector('.visits').textContent,'');assert.match(status.textContent,/session changed/);
 },{handle:action=>{if(action==='visit-request'){started.resolve();return reply.promise}}});
});
test('late account visit failure after another login cannot show an old-account error',()=>{
 const reply=deferred(),started=deferred();return screen(async({target,status})=>{
  const pending=target.querySelector('.visit-item button').onclick();await started.promise;replace();reply.resolve(Response.json({error:'Old visit error'},{status:503}));await pending;assert.match(status.textContent,/session changed/);assert.doesNotMatch(status.textContent,/Old visit error/);
 },{visits:[{id:'synthetic-visit',preferred_date:'2026-11-10',time_window:'Morning',status:'requested'}],handle:action=>{if(action==='visit-update'){started.resolve();return reply.promise}}});
});
test('logout during message token acquisition stops before dispatch',()=>screen(async({input,send,calls})=>{
 input.value='Blocked message';const pending=send();clearSession();await pending;assert.equal(calls.filter(c=>c.action==='message').length,0);assert.equal(input.disabled,true);
}));
test('a fresh read under the new session restores conversation and sending',()=>screen(async({target,input,send,refresh,calls})=>{
 replace();input.value='Old draft';await send();const retired=input.disabled;await refresh();assert.equal(retired,true);assert.equal(input.disabled,false);assert.match(target.querySelector('.message-thread').textContent,/Synthetic private conversation/);input.value='New session draft';await send();assert.equal(calls.filter(c=>c.action==='message').length,1);
}));
for(const [label,access] of [['capability',{project_id:'synthetic-project',access_token:'synthetic-private'}],['business',{project_id:'synthetic-project',business_id:'synthetic-company'}]])test(label+' conversation preserves its existing token-provider behavior',()=>screen(async({input,send,calls,status})=>{
 replace();input.value='Independent synthetic access';await send();assert.equal(calls.filter(c=>c.action==='message').length,1);assert.match(status.textContent,/Message saved/);
},{access}));
test('account conversation can renew its original session before a deliberate send',()=>screen(async({input,send,calls,status})=>{
 const originalNow=Date.now;Date.now=()=>originalNow()+3601000;
 try{input.value='Synthetic renewed send';await send();const sent=calls.find(c=>c.action==='message');assert.equal(sent.options.headers.authorization,'Bearer synthetic-renewed');assert.match(status.textContent,/Message saved/)}finally{Date.now=originalNow}
},{handle:(action,options)=>{if(!action&&options.body?.includes('synthetic-refresh'))return Response.json({access_token:'synthetic-renewed',refresh_token:'synthetic-renewed-refresh',expires_in:3600})}}));
