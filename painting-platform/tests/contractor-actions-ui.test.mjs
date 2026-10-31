import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}

async function screen(run,{handle=()=>{}}={}){
 const old=Object.fromEntries(['document','fetch','Option','FormData'].map(k=>[k,globalThis[k]]));
 const {document,window}=parseHTML(await readFile(new URL('../web/pro.html',import.meta.url),'utf8'));globalThis.document=document;
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||''},set(value){for(const option of this.querySelectorAll('option'))option.toggleAttribute('selected',option.value===value)}});
 globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;Object.defineProperty(option,'selected',{set(v){option.toggleAttribute('selected',v)},get(){return option.hasAttribute('selected')}});return option};
 globalThis.FormData=class{*[Symbol.iterator](){yield ['email','fixture@example.invalid'];yield ['password','fixture-only']}};
 const signin=document.querySelector('#signin');signin.reset=()=>{};const calls=[];
 globalThis.fetch=async(url,options={})=>{
  const action=new URL(url).searchParams.get('action'),body=options.body?JSON.parse(options.body):{};calls.push({action,body});
  const custom=await handle(action,body);if(custom)return custom;
  if(url.includes('/token?'))return Response.json({access_token:'mock-session',refresh_token:'mock-refresh',expires_in:3600});
  if(action==='providers')return Response.json({auth_challenge:{required:false}});
  if(action==='status')return Response.json({ok:true});
  if(action==='pro-availability')return Response.json({accepting_requests:body.accepting_requests});
  if(url.endsWith('/logout'))return new Response(null,{status:204});
  return Response.json({business:{id:'business',name:'Pilot company'},role:'owner',coverage:{cities:['Summerville'],state:'SC',zip_prefix:'294',active:true,accepting_requests:true},memberships:[],projects:[{id:'project',created_at:'2026-10-21T12:00:00Z',property_type:'Home',timing:'Within a month',lead:{status:'new',full_name:'Example Homeowner',email:'fixture@example.invalid',phone:'2025550100',city:'Summerville',zip:'29483',service:'Interior painting',details:'Synthetic scope'},photos:[],review:{qualification:'unreviewed',notes:'Initial notes',revision:0}}],can_review_interest:false});
 };
 try{
  await import('../web/pro.js?test='+crypto.randomUUID());await signin.onsubmit({preventDefault(){},target:signin});
  const form=document.querySelector('.review-details form'),note=form.querySelector('textarea'),qual=form.querySelector('select'),saved=form.parentElement.querySelector('[role=status]');
  await run({document,calls,status:document.querySelector('.project-card > label select'),availability:document.querySelector('#coverage-panel button'),signin:()=>signin.onsubmit({preventDefault(){},target:signin}),signout:()=>document.querySelector('#signout').onclick()});
 }finally{Object.assign(globalThis,old)}
}
test('status saves lock repeat events and display the exact submitted value',async()=>{
 const reply=deferred(),started=deferred();
 await screen(async({document,status,calls})=>{
  status.value='contacted';const first=status.onchange();await started.promise;
  status.value='won';const second=status.onchange();await new Promise(setImmediate);
  const count=calls.filter(c=>c.action==='status').length,busy=status.getAttribute('aria-busy');
  reply.resolve(Response.json({ok:true}));await Promise.all([first,second]);
  assert.equal(count,1);assert.equal(busy,'true');assert.equal(status.value,'contacted');
  assert.equal(document.querySelector('.project-card .badge').textContent,'Conversation started');assert.equal(document.querySelector('#won-count').textContent,'0');
 },{handle:action=>{if(action==='status'){started.resolve();return reply.promise.then(r=>r.clone())}}});
});
for(const failed of [false,true])test('late status '+(failed?'failure':'success')+' cannot overwrite a signed-out panel',async()=>{
 const reply=deferred(),started=deferred();
 await screen(async({document,status,signout})=>{
  status.value='won';const pending=status.onchange();await started.promise;await signout();
  reply.resolve(failed?Response.json({error:'Old failure'},{status:409}):Response.json({ok:true}));await pending;
  assert.equal(document.querySelector('#workspace').hidden,true);assert.equal(document.querySelector('#message').textContent,'Signed out.');
 },{handle:action=>{if(action==='status'){started.resolve();return reply.promise}}});
});
test('detached status and availability controls cannot issue new writes',()=>screen(async({document,status,availability,calls,signout,signin})=>{
 await signout();await signin();status.value='won';await status.onchange();await availability.onclick();
 assert.equal(calls.filter(c=>['status','pro-availability'].includes(c.action)).length,0);
}));
test('a failed status write restores the previous choice and permits deliberate retry',async()=>{
 let writes=0;
 await screen(async({status,calls,document})=>{
  status.value='won';await status.onchange();assert.equal(status.value,'new');assert.equal(status.disabled,false);assert.match(document.querySelector('#message').textContent,/Could not save/);
  status.value='contacted';await status.onchange();assert.equal(status.value,'contacted');assert.equal(calls.filter(c=>c.action==='status').length,2);
 },{handle:action=>action==='status'&&++writes===1?Response.json({error:'Could not save'},{status:503}):undefined});
});
test('availability rejects duplicate clicks while the pause is pending',async()=>{
 const reply=deferred(),started=deferred();
 await screen(async({document,availability,calls})=>{
  const first=availability.onclick();await started.promise;const second=availability.onclick();await new Promise(setImmediate);
  const count=calls.filter(c=>c.action==='pro-availability').length;
  reply.resolve(Response.json({accepting_requests:false}));await Promise.all([first,second]);
  assert.equal(count,1);assert.match(document.querySelector('#coverage-panel').textContent,/New requests paused/);
  assert.deepEqual(calls.find(c=>c.action==='pro-availability').body,{business_id:'business',accepting_requests:false,expected_current:true});
 },{handle:action=>{if(action==='pro-availability'){started.resolve();return reply.promise.then(r=>r.clone())}}});
});
for(const failed of [false,true])test('late availability '+(failed?'failure':'success')+' cannot change a newer workspace',async()=>{
 const reply=deferred(),started=deferred();
 await screen(async({document,availability,signout,signin})=>{
  const pending=availability.onclick();await started.promise;await signout();await signin();
  reply.resolve(failed?Response.json({error:'Old failure'},{status:409}):Response.json({accepting_requests:false}));await pending;
  assert.match(document.querySelector('#coverage-panel').textContent,/Receiving eligible new requests/);
  assert.equal(document.querySelector('#message').textContent,'Contractor workspace loaded.');
 },{handle:action=>{if(action==='pro-availability'){started.resolve();return reply.promise}}});
});
test('a changed select value during save cannot mislabel the confirmed project status',async()=>{
 const reply=deferred(),started=deferred();
 await screen(async({document,status,calls})=>{
  status.value='contacted';const pending=status.onchange();await started.promise;status.value='won';
  reply.resolve(Response.json({ok:true}));await pending;
  assert.equal(calls.find(c=>c.action==='status').body.status,'contacted');assert.equal(status.value,'contacted');assert.equal(document.querySelector('.project-card .badge').textContent,'Conversation started');
 },{handle:action=>{if(action==='status'){started.resolve();return reply.promise}}});
});
