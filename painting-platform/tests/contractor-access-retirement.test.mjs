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
 globalThis.FormData=class{*[Symbol.iterator](){yield ['email','synthetic@example.invalid'];yield ['password','fixture-only']}};
 const form=document.querySelector('#signin');form.reset=()=>{};const calls=[];let reads=0,interests=0,logins=0;
 globalThis.fetch=async(url,options={})=>{
  const action=new URL(url).searchParams.get('action'),body=options.body?JSON.parse(options.body):{};
  if(action==='pro-list')reads++;if(action==='interest-list')interests++;
  calls.push({action,body,token:options.headers?.authorization});
  const custom=await handle(action,{reads,interests,body});if(custom)return custom;
  if(url.includes('/token?'))return Response.json({access_token:'synthetic-session-'+(++logins),refresh_token:'synthetic-refresh-'+logins,expires_in:3600});
  if(url.endsWith('/logout'))return new Response(null,{status:204});
  if(action==='providers')return Response.json({auth_challenge:{required:false}});
  if(action==='interest-list')return Response.json({applications:[{business_name:'PRIVATE APPLICANT',email:'applicant@example.invalid',city:'Summerville',state:'SC'}]});
  if(action==='pro-list')return Response.json({business:{id:'business',name:'PRIVATE COMPANY'},role:'owner',coverage:{cities:['Summerville'],state:'SC',zip_prefix:'294',active:true,accepting_requests:true},memberships:[{business_id:'business',name:'PRIVATE COMPANY'}],projects:[{id:'project',created_at:'2026-10-23T12:00:00Z',property_type:'Home',timing:'Within a month',lead:{status:'new',full_name:'PRIVATE CONTACT',email:'contact@example.invalid',phone:'2025550100',city:'Summerville',zip:'29483',service:'Interior painting',details:'PRIVATE SCOPE'},photos:[{id:'photo',url:'https://photos.invalid/synthetic-only'}],review:{qualification:'unreviewed',notes:'PRIVATE NOTE',revision:1},estimate:{amount_cents:250000,currency:'USD',revision:1}}],can_review_interest:true});
  return Response.json({ok:true});
 };
 try{
  await import('../web/pro.js?access='+crypto.randomUUID());
  const signin=()=>form.onsubmit({preventDefault(){},target:form});await signin();assert.equal(document.querySelector('#workspace').hidden,false);
  await run({document,calls,signin,refresh:()=>document.querySelector('#refresh').onclick(),signout:()=>document.querySelector('#signout').onclick()});
 }finally{Object.assign(globalThis,old)}
}
function retired(document){
 assert.equal(document.querySelector('#workspace').hidden,true);assert.equal(document.querySelector('#login').hidden,false);
 assert.equal(document.querySelector('#projects').childElementCount,0);assert.equal(document.querySelector('#coverage-panel').childElementCount,0);
 assert.equal(document.querySelector('#business-select').childElementCount,0);assert.equal(document.querySelector('#business-title').textContent,'');
 for(const id of ['total','new-count','review-count','won-count'])assert.equal(document.querySelector('#'+id).textContent,'0');
 assert.equal(document.querySelector('#project-search').value,'');
 assert.doesNotMatch(document.querySelector('#workspace').textContent,/PRIVATE/);
 assert.equal(document.querySelector('#workspace img'),null);
}
for(const code of [401,403])test('current contractor list '+code+' retires private contacts notes estimates photos and applicant data',()=>screen(async({document,refresh})=>{
 document.querySelector('#project-search').value='PRIVATE CONTACT';await refresh();retired(document);assert.match(document.querySelector('#message').textContent,/Sign in again/);
},{handle:(action,{reads})=>action==='pro-list'&&reads===2?Response.json({error:'Synthetic access denied'},{status:code}):undefined}));
test('a network error without access rejection preserves the authenticated visible workspace',()=>screen(async({document,refresh})=>{
 await refresh();assert.equal(document.querySelector('#workspace').hidden,false);assert.match(document.querySelector('#projects').textContent,/PRIVATE CONTACT/);
},{handle:(action,{reads})=>action==='pro-list'&&reads===2?Response.json({error:'Synthetic network failure'},{status:503}):undefined}));
for(const code of [403,503,200])test('stale list response '+code+' cannot replace or clear a newer contractor sign-in',()=>{
 const reply=deferred(),started=deferred();return screen(async({document,refresh,signout,signin})=>{
  const pending=refresh();await started.promise;await signout();await signin();
  reply.resolve(code===200?Response.json({business:{id:'old'},projects:[]}):Response.json({error:'Stale response'},{status:code}));
  await pending;assert.equal(document.querySelector('#workspace').hidden,false);assert.match(document.querySelector('#projects').textContent,/PRIVATE CONTACT/);assert.equal(document.querySelector('#message').textContent,'Contractor workspace loaded.');
 },{handle:(action,{reads})=>{if(action==='pro-list'&&reads===2){started.resolve();return reply.promise}}})
});
for(const action of ['status','pro-review','pro-estimate','pro-availability'])test('current '+action+' rejection retires private contractor data',()=>screen(async({document})=>{
 if(action==='status'){const select=document.querySelector('.project-card > label select');select.value='contacted';await select.onchange()}
 else if(action==='pro-review')await document.querySelector('.review-details form').onsubmit({preventDefault(){}});
 else if(action==='pro-estimate'){const form=document.querySelector('.estimate-details form');form.querySelector('input').value='3000';await form.onsubmit({preventDefault(){}})}
 else await document.querySelector('#coverage-panel button').onclick();
 retired(document);assert.match(document.querySelector('#message').textContent,/Sign in again/);
},{handle:value=>value===action?Response.json({error:'Synthetic access denied'},{status:403}):undefined}));
test('applicant-only access rejection clears the old interest list but preserves approved project access',()=>screen(async({document,refresh})=>{
 await refresh();assert.equal(document.querySelector('#workspace').hidden,false);assert.match(document.querySelector('#projects').textContent,/PRIVATE CONTACT/);assert.doesNotMatch(document.querySelector('#workspace').textContent,/PRIVATE APPLICANT/);
},{handle:(action,{interests})=>action==='interest-list'&&interests===2?Response.json({error:'Interest access removed'},{status:403}):undefined}));
test('a stale applicant-list error cannot modify a later successful list',()=>{
 const reply=deferred(),started=deferred();return screen(async({document,refresh})=>{
  const pending=refresh();await started.promise;await refresh();reply.resolve(Response.json({error:'Stale applicant error'},{status:403}));await pending;
  assert.match(document.querySelector('#workspace').textContent,/PRIVATE APPLICANT/);assert.doesNotMatch(document.querySelector('#workspace').textContent,/Stale applicant error/);
 },{handle:(action,{interests})=>{if(action==='interest-list'&&interests===2){started.resolve();return reply.promise}}})
});
test('after a denial a later network failure cannot revive the cleared project cache',()=>screen(async({document,refresh,calls})=>{
 await refresh();retired(document);const reads=calls.filter(c=>c.action==='pro-list').length;await refresh();document.querySelector('#project-search').oninput();assert.equal(document.querySelector('#workspace').hidden,true);assert.doesNotMatch(document.querySelector('#projects').textContent,/PRIVATE CONTACT|PRIVATE NOTE/);assert.equal(calls.filter(c=>c.action==='pro-list').length,reads);
},{handle:(action,{reads})=>action==='pro-list'&&reads>=2?Response.json({error:'Synthetic denied'},{status:reads===2?403:503}):undefined}));
