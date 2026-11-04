import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountConversation} from '../web/conversation.js';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
const access={project_id:'synthetic-old',access_token:'synthetic-private'};
const visit={id:'synthetic-visit',preferred_date:'2026-11-10',time_window:'Morning',status:'requested'};
async function screen(run,{handle=()=>{},visits=[],token,scope=access}={}){
 const previous={document:globalThis.document,fetch:globalThis.fetch};const {document}=parseHTML('<html><body><section id="target"></section></body></html>');globalThis.document=document;
 const calls=[];let callbacks=0;globalThis.fetch=async(url,options)=>{const action=new URL(url).searchParams.get('action'),body=JSON.parse(options.body);calls.push({action,body});return await handle(action,body,calls)||Response.json(action==='conversation'?{messages:[{author:'homeowner',body:'Synthetic '+body.project_id,created_at:'2026-10-23'}],visits}:{ok:true})};
 try{
  const target=document.querySelector('#target');await mountConversation(target,scope,token,()=>{callbacks++});
  const input=target.querySelector('textarea'),form=input.closest('form'),status=target.querySelector('[role="status"]'),thread=target.querySelector('.message-thread'),refresh=target.querySelector('button.secondary');
  const controls={send:()=>form.onsubmit({preventDefault(){}}),read:()=>refresh.onclick(),request:()=>{const f=target.querySelector('.visit-request');f.querySelector('input').value='2026-11-10';return f.onsubmit({preventDefault(){}})},update:()=>target.querySelector('.visit-item button').onclick()};
  await run({target,input,form,status,thread,calls,controls,callbacks:()=>callbacks,replace:async()=>mountConversation(target,{project_id:'synthetic-new',access_token:'synthetic-new-private'})});
 }finally{Object.assign(globalThis,previous)}
}
for(const mode of ['detach','replace'])test((mode==='detach'?'Detached':'Replaced')+' conversation controls cannot dispatch retained message, read or visit handlers',()=>screen(async({target,input,calls,controls,replace})=>{
 input.value='Retained private draft';const request=target.querySelector('.visit-request');request.querySelector('input').value='2026-11-10';const handler=request.onsubmit;
 if(mode==='detach')target.remove();else await replace();const count=calls.length;
 await controls.send();await controls.read();await handler({preventDefault(){}});assert.equal(calls.length,count);
}));
for(const mode of ['detach','replace'])test((mode==='detach'?'Detached':'Replaced')+' visit decision cannot dispatch a retained button handler',()=>screen(async({target,calls,replace})=>{
 const handler=target.querySelector('.visit-item button').onclick;if(mode==='detach')target.remove();else await replace();const count=calls.length;await handler();assert.equal(calls.length,count);
},{visits:[visit]}));
for(const failure of [false,true])test('late read '+(failure?'failure':'success')+' cannot change replaced panel or retired nodes',()=>{
 const reply=deferred(),started=deferred();let reads=0;return screen(async({target,status,thread,controls,replace})=>{
  const pending=controls.read();await started.promise;const oldStatus=status.textContent,oldThread=thread.textContent;await replace();const current=target.innerHTML;
  reply.resolve(failure?Response.json({error:'Retired read failure'},{status:503}):Response.json({messages:[{body:'Retired reply',author:'homeowner',created_at:'2026-10-23'}],visits:[]}));await pending;
  assert.equal(target.innerHTML,current);assert.equal(status.textContent,oldStatus);assert.equal(thread.textContent,oldThread);
 },{handle:action=>{if(action==='conversation'&&++reads===2){started.resolve();return reply.promise}}});
});
for(const action of ['message','visit-request','visit-update'])for(const failure of [false,true])test('late '+action+' '+(failure?'failure':'success')+' after replacement cannot reload or run old callback',()=>{
 const reply=deferred(),started=deferred();return screen(async({target,input,status,calls,controls,callbacks,replace})=>{
  input.value='Synthetic pending draft';const pending=action==='message'?controls.send():action==='visit-request'?controls.request():controls.update();await started.promise;await replace();const count=calls.length,current=target.innerHTML,oldStatus=status.textContent;
  reply.resolve(failure?Response.json({error:'Retired action failure'},{status:503}):Response.json({ok:true}));await pending;
  assert.equal(calls.length,count);assert.equal(callbacks(),0);assert.equal(target.innerHTML,current);assert.equal(status.textContent,oldStatus);
 },{visits:action==='visit-update'?[visit]:[],handle:a=>{if(a===action){started.resolve();return reply.promise}}});
});
test('a panel detached during contractor token acquisition cannot dispatch the message',()=>{
 const reply=deferred(),started=deferred();let tokens=0;return screen(async({target,input,controls,calls})=>{
  input.value='Never dispatch';const pending=controls.send();await started.promise;target.remove();reply.resolve('synthetic-business-token');await pending;assert.equal(calls.filter(c=>c.action==='message').length,0);
 },{scope:{project_id:'synthetic-old',business_id:'synthetic-company'},token:()=>{if(++tokens===2){started.resolve();return reply.promise}return 'synthetic-business-token'}});
});
for(const kind of ['request','decision'])test('visit '+kind+' controls replaced by a fresh read cannot issue stale writes',()=>screen(async({target,calls,controls})=>{
 const control=kind==='request'?target.querySelector('.visit-request'):target.querySelector('.visit-item button');const handler=kind==='request'?()=>control.onsubmit({preventDefault(){}}):()=>control.onclick();await controls.read();const count=calls.length;await handler();assert.equal(calls.length,count);
},{visits:kind==='decision'?[visit]:[]}));
