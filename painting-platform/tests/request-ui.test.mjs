import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {saveSession,clearSession} from '../web/auth-session.js';
const project='11111111-1111-4111-8111-111111111111';
const values={full_name:'Test homeowner',email:'test@example.invalid',phone:'2025550190',service:'Interior painting',property_type:'Home',details:'Paint the living room',city:'Summerville',zip:'29483',timing:'Within a month',budget:''};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,{files=[],signedIn=false,handle=()=>{}}={}){
 const old=Object.fromEntries(['document','fetch','location','Option','FormData','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/request.html',import.meta.url),'utf8'));globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/request.html');
 const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const form=document.querySelector('#request-form');Object.defineProperty(form,'elements',{value:{namedItem:name=>form.querySelector('[name="'+name+'"]')}});
 for(const field of form.querySelectorAll('input,textarea,select')){field.checkValidity=()=>true;field.reportValidity=()=>true}
 document.querySelector('#photos').files=files;form.elements.namedItem('contact_consent').checked=true;
 globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option};
 globalThis.FormData=class{*[Symbol.iterator](){yield* Object.entries(values)}};
 const calls=[];globalThis.fetch=async(url,options={})=>{const action=new URL(url).searchParams.get('action');calls.push({url,action,options});const custom=await handle(action,options);if(custom)return custom;if(action==='providers')return Response.json({providers:[{slug:'r-painters-llc',cities:['Summerville']}],services:['Interior painting']});if(url.endsWith('/user'))return Response.json({email:values.email,user_metadata:{full_name:values.full_name}});if(action==='create')return Response.json({project_id:project});return Response.json({ok:true})};
 clearSession();if(signedIn)saveSession({access_token:'mock-session',refresh_token:'mock-refresh',expires_in:3600});
 try{await import('../web/request.js?test='+crypto.randomUUID());await run({document,form,calls,store,submit:()=>form.onsubmit({preventDefault(){}})})}finally{clearSession();Object.assign(globalThis,old)}
}
test('saved receipt and private link appear before a slow photo finishes',async()=>{
 const photo=deferred(),started=deferred();
 await screen(async({document,form,calls,submit,store})=>{
  const pending=submit();await started.promise;
  assert.equal(form.hidden,true);assert.equal(document.querySelector('#request-receipt').hidden,false);assert.match(document.querySelector('#receipt-link').textContent,new RegExp('#project='+project+'&key=[a-f0-9]{64}$'));
  assert.equal(document.querySelector('#open-project').target,'_blank');assert.match(document.querySelector('#upload-status').textContent,/Keep this page open/);
  await submit();assert.equal(calls.filter(c=>c.action==='create').length,1);
  photo.resolve(Response.json({ok:true}));await pending;assert.match(document.querySelector('#upload-status').textContent,/All 1 photo/);assert.match(location.href,/request.html$/);assert.equal(store.has('painting.saved'),false);
  await document.querySelector('#copy-project-link').onclick();assert.match(document.querySelector('#receipt-message').textContent,/Copy the private link|Private link copied/);
 },{files:[{type:'image/jpeg',size:20}],handle:action=>{if(action==='upload'){started.resolve();return photo.promise}}});
});
test('partial photo and account-link failures preserve the saved request',()=>{
 let uploads=0;
 return screen(async({document,form,calls,submit})=>{
  await submit();assert.equal(form.hidden,true);assert.equal(document.querySelector('#request-receipt').hidden,false);assert.equal(calls.filter(c=>c.action==='create').length,1);assert.equal(uploads,2);
  assert.match(document.querySelector('#upload-status').textContent,/1 photo\(s\) could not be confirmed/);assert.match(document.querySelector('#open-project').href,/&photos_failed=1$/);assert.match(document.querySelector('#account-link-status').textContent,/account linking could not be completed/);assert.equal(document.querySelector('#submit').disabled,true);
 },{signedIn:true,files:[{type:'image/jpeg',size:20},{type:'image/png',size:20}],handle:action=>{if(action==='upload')return ++uploads===1?Response.json({error:'Photo failed'},{status:502}):Response.json({ok:true});if(action==='claim-project')return Response.json({error:'Link failed'},{status:502})}});
});
test('a failed create can be retried using the same idempotency and private keys',()=>{
 let creates=0;
 return screen(async({document,form,calls,submit})=>{
  await submit();assert.equal(form.hidden,false);assert.equal(document.querySelector('#request-receipt').hidden,true);assert.equal(document.querySelector('#submit').disabled,false);assert.match(document.querySelector('#message').textContent,/Please retry/);
  await submit();const bodies=calls.filter(c=>c.action==='create').map(c=>JSON.parse(c.options.body));assert.equal(bodies.length,2);assert.equal(bodies[0].request_key,bodies[1].request_key);assert.equal(bodies[0].access_token,bodies[1].access_token);assert.equal(form.hidden,true);
 },{handle:action=>action==='create'&&++creates===1?Response.json({error:'Please retry'},{status:502}):undefined});
});
test('a request without photos stays confirmed and can link to its account',()=>screen(async({document,calls,submit})=>{
 await submit();assert.match(document.querySelector('#upload-status').textContent,/add photos later/);assert.match(document.querySelector('#account-link-status').textContent,/Project linked/);assert.equal(calls.filter(c=>c.action==='upload').length,0);assert.equal(calls.filter(c=>c.action==='claim-project').length,1);
 const create=JSON.parse(calls.find(c=>c.action==='create').options.body);assert.equal(create.contact_consent,true);assert.match(document.querySelector('#receipt-link').textContent,new RegExp(create.access_token));assert.match(document.querySelector('#request-receipt').textContent,/R Painters/);
},{signedIn:true}));
