import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
const result=(notes='Initial notes')=>({qualification:'qualified',notes,revision:1,updated_at:'2026-10-21T20:00:00Z'});
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
  if(action==='pro-review')return Response.json(result(body.notes));
  return Response.json({business:{id:'business',name:'Pilot company'},role:'staff',coverage:{cities:['Summerville'],state:'SC',zip_prefix:'294',active:true,accepting_requests:true},memberships:[],projects:[{id:'project',created_at:'2026-10-21T12:00:00Z',property_type:'Home',timing:'Within a month',lead:{status:'new',full_name:'Example Homeowner',email:'fixture@example.invalid',phone:'2025550100',city:'Summerville',zip:'29483',service:'Interior painting',details:'Synthetic scope'},photos:[],review:{qualification:'unreviewed',notes:'Initial notes',revision:0}}],can_review_interest:false});
 };
 try{
  await import('../web/pro.js?test='+crypto.randomUUID());await signin.onsubmit({preventDefault(){},target:signin});
  const form=document.querySelector('.review-details form'),note=form.querySelector('textarea'),qual=form.querySelector('select'),saved=form.parentElement.querySelector('[role=status]');
  await run({document,form,note,qual,saved,calls,submit:(target=form)=>target.onsubmit({preventDefault(){}})});
 }finally{Object.assign(globalThis,old)}
}
test('a pending private review rejects duplicate submits even with a changed draft',async()=>{
 const reply=deferred(),started=deferred();
 await screen(async({form,note,calls,submit})=>{
  const pending=submit();await started.promise;note.value='New draft';const duplicate=submit();await new Promise(setImmediate);
  const count=calls.filter(c=>c.action==='pro-review').length,busy=form.getAttribute('aria-busy');
  reply.resolve(Response.json(result()));await Promise.all([pending,duplicate]);assert.equal(count,1);assert.equal(busy,'true');assert.equal(form.hasAttribute('aria-busy'),false);assert.equal(form.querySelector('button').disabled,false);
 },{handle:action=>{if(action==='pro-review'){started.resolve();return reply.promise.then(r=>r.clone())}}});
});
test('saved feedback distinguishes the submitted review from newer unsaved edits',async()=>{
 const reply=deferred(),started=deferred();let writes=0;
 await screen(async({note,qual,saved,calls,submit})=>{
  const pending=submit();await started.promise;note.value='Newer notes';qual.value='not_fit';reply.resolve(Response.json(result()));await pending;
  assert.equal(note.value,'Newer notes');assert.equal(qual.value,'not_fit');assert.match(saved.textContent,/newer changes are not saved yet/);
  await submit();const write=calls.filter(c=>c.action==='pro-review').at(-1);assert.equal(write.body.notes,'Newer notes');assert.equal(write.body.expected_revision,1);
 },{handle:action=>{if(action==='pro-review'&&++writes===1){started.resolve();return reply.promise}}});
});
test('a failed private review preserves edits and the original revision for a deliberate retry',async()=>{
 let writes=0;
 await screen(async({note,saved,form,submit,calls})=>{
  note.value='Keep this note';await submit();assert.equal(note.value,'Keep this note');assert.match(saved.textContent,/unsaved text is still here/);assert.equal(form.querySelector('button').disabled,false);
  await submit();assert.deepEqual(calls.filter(c=>c.action==='pro-review').map(c=>c.body.expected_revision),[0,0]);assert.match(saved.textContent,/Private review saved/);
 },{handle:action=>action==='pro-review'&&++writes===1?Response.json({error:'Conflict: refresh first'},{status:409}):undefined});
});
test('a response to a detached review cannot change the newly rendered form revision',async()=>{
 const reply=deferred(),started=deferred();let writes=0;
 await screen(async({document,submit,calls})=>{
  const pending=submit();await started.promise;
  document.querySelector('#project-search').oninput();const current=document.querySelector('.review-details form');
  reply.resolve(Response.json(result()));await pending;await submit(current);
  assert.equal(calls.filter(c=>c.action==='pro-review').at(-1).body.expected_revision,0);
 },{handle:action=>{if(action==='pro-review'&&++writes===1){started.resolve();return reply.promise}}});
});
test('a detached private review cannot issue a new write after the panel is replaced',()=>screen(async({document,submit,calls})=>{
 document.querySelector('#project-search').oninput();await submit();assert.equal(calls.filter(c=>c.action==='pro-review').length,0);
}));
