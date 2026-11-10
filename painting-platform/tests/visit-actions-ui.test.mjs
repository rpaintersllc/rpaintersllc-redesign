import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountConversation} from '../web/conversation.js';
const visit={id:'mock-visit',preferred_date:'2026-11-01',time_window:'Morning',status:'requested'};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,{business=false,rows=[],handle=()=>{},onChange=()=>{}}={}){
 const previous={document:globalThis.document,fetch:globalThis.fetch};const {document}=parseHTML('<html><body><section id="target"></section></body></html>');globalThis.document=document;const calls=[];
 globalThis.fetch=async(url,options)=>{const action=new URL(url).searchParams.get('action'),body=JSON.parse(options.body);calls.push({action,body});return await handle(action,body,calls)||Response.json(action==='conversation'?{messages:[],visits:rows}:{ok:true})};
 try{const target=document.querySelector('#target');await mountConversation(target,{project_id:'mock-project',...(business?{business_id:'mock-company'}:{access_token:'mock-private'})},undefined,onChange);const visits=target.querySelector('.visits'),status=target.querySelector('[role="status"]'),refresh=[...target.querySelectorAll('button')].find(b=>b.textContent==='Refresh conversation');await run({target,visits,status,refresh,calls,submit:()=>visits.querySelector('form').onsubmit({preventDefault(){}})})}finally{Object.assign(globalThis,previous)}
}
test('pending visit request blocks repeat submit even after its date changes',async()=>{
 const pending=deferred(),started=deferred();await screen(async({visits,calls,submit,refresh})=>{
 const date=visits.querySelector('input'),time=visits.querySelector('select');date.value='2026-11-01';time.querySelector('option').selected=true;const first=submit();await started.promise;date.value='2026-11-02';await submit();assert.equal(calls.filter(c=>c.action==='visit-request').length,1);assert.equal(date.disabled,true);assert.equal(refresh.disabled,true);assert.equal(visits.getAttribute('aria-busy'),'true');pending.resolve(Response.json({ok:true}));await first;assert.equal(visits.getAttribute('aria-busy'),'false');assert.equal(refresh.disabled,false);
 },{handle:action=>{if(action==='visit-request'){started.resolve();return pending.promise}}});
});
test('company cannot confirm and decline concurrently through sibling controls',async()=>{
 const pending=deferred(),started=deferred();await screen(async({visits,calls})=>{
 const [confirm,decline]=visits.querySelectorAll('button');const first=confirm.onclick();await started.promise;assert.equal(confirm.disabled,true);assert.equal(decline.disabled,true);await decline.onclick();assert.equal(calls.filter(c=>c.action==='visit-update').length,1);pending.resolve(Response.json({ok:true}));await first;
 },{business:true,rows:[visit],handle:action=>{if(action==='visit-update'){started.resolve();return pending.promise}}});
});
test('saved visit with failed reload blocks further changes until a successful refresh',async()=>{
 let reads=0,changes=0;await screen(async({visits,status,refresh,calls})=>{
 const cancel=visits.querySelector('button');await cancel.onclick();assert.match(status.textContent,/Visit change saved, but/);assert.equal(cancel.disabled,true);await cancel.onclick();assert.equal(calls.filter(c=>c.action==='visit-update').length,1);await refresh.onclick();assert.equal(visits.querySelector('button').disabled,false);assert.equal(changes,1);
 },{rows:[visit],onChange:()=>{changes++},handle:action=>{if(action==='conversation'&&++reads===2)return Response.json({error:'Read failed'},{status:503})}});
});
test('failed visit request keeps values and retry key and enables deliberate retry',async()=>{
 let writes=0;await screen(async({visits,status,calls,submit})=>{
 const date=visits.querySelector('input'),time=visits.querySelector('select');date.value='2026-11-01';time.querySelectorAll('option')[1].selected=true;await submit();assert.match(status.textContent,/Write failed/);assert.equal(date.value,'2026-11-01');assert.equal(date.disabled,false);await submit();const writes=calls.filter(c=>c.action==='visit-request');assert.equal(writes.length,2);assert.equal(writes[0].body.request_key,writes[1].body.request_key);
 },{handle:action=>{if(action==='visit-request'&&++writes===1)return Response.json({error:'Write failed'},{status:503})}});
});
test('older conversation read cannot restore visit controls after a saved change',async()=>{
 let reads=0;const stale=deferred(),started=deferred();await screen(async({visits,status,refresh})=>{
 const older=refresh.onclick();await started.promise;await visits.querySelector('button').onclick();assert.match(status.textContent,/Visit updated/);assert.match(visits.textContent,/Cancelled by homeowner/);stale.resolve(Response.json({messages:[],visits:[visit]}));await older;assert.match(visits.textContent,/Cancelled by homeowner/);assert.equal(visits.querySelector('.visit-item button'),null);
 },{rows:[visit],handle:action=>{if(action==='conversation'){reads++;if(reads===2){started.resolve();return stale.promise}if(reads===3)return Response.json({messages:[],visits:[{...visit,status:'cancelled'}]})}}});
});
test('failed project-status callback does not turn a saved visit into a failed write',()=>screen(async({visits,status,calls})=>{
 await visits.querySelector('button').onclick();assert.match(status.textContent,/Visit updated/);assert.match(status.textContent,/Project status could not refresh/);assert.equal(calls.filter(c=>c.action==='visit-update').length,1);
},{rows:[visit],onChange:async()=>{throw Error('Status failed')}}));
