import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {saveSession,clearSession} from '../web/auth-session.js';
const project='11111111-1111-4111-8111-111111111111';
const values={full_name:'Test homeowner',email:'test@example.invalid',phone:'2025550190',service:'Interior painting',property_type:'Home',details:'Paint the living room',city:'Summerville',zip:'29483',timing:'Within a month',budget:''};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,{files=[],signedIn=false,step=2,handle=()=>{}}={}){
 const old=Object.fromEntries(['document','fetch','location','Option','FormData','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/request.html',import.meta.url),'utf8'));globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/request.html');
 const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 let active=document.body;const focusCalls=[];Object.defineProperty(document,'activeElement',{get:()=>active});
 for(const node of document.querySelectorAll('input,textarea,select,button,a,section,h2'))node.focus=()=>{active=node;focusCalls.push(node.id||node.name||node.tagName);node.dispatchEvent(new document.defaultView.Event('focusin',{bubbles:true}))};
 const form=document.querySelector('#request-form');Object.defineProperty(form,'elements',{value:{namedItem:name=>form.querySelector('[name="'+name+'"]')}});
 for(const field of form.querySelectorAll('input,textarea,select')){field.checkValidity=()=>true;field.reportValidity=()=>true}
 document.querySelector('#photos').files=files;form.elements.namedItem('contact_consent').checked=true;
 globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option};
 globalThis.FormData=class{*[Symbol.iterator](){yield* Object.entries(values)}};
 const calls=[];globalThis.fetch=async(url,options={})=>{const action=new URL(url).searchParams.get('action');calls.push({url,action,options});const custom=await handle(action,options);if(custom)return custom;if(action==='providers')return Response.json({providers:[{slug:'r-painters-llc',cities:['Summerville']}],services:['Interior painting']});if(url.endsWith('/user'))return Response.json({email:values.email,user_metadata:{full_name:values.full_name}});if(action==='create')return Response.json({project_id:project});return Response.json({ok:true})};
 clearSession();if(signedIn)saveSession({access_token:'mock-session',refresh_token:'mock-refresh',expires_in:3600});
 try{await import('../web/request.js?test='+crypto.randomUUID());for(let i=0;i<step;i++)document.querySelector('#next').onclick();await run({document,form,calls,store,active:()=>active,blur:()=>{active=document.body},focusCalls,submit:()=>form.onsubmit({preventDefault(){}})})}finally{clearSession();Object.assign(globalThis,old)}
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
test('protected request sends a fresh widget token after a rejected attempt',async()=>{
 const oldWindow=globalThis.window;let config,creates=0;globalThis.window={turnstile:{render:(node,options)=>{config=options;return 'widget'},reset:()=>{}}};
 try{await screen(async({document,submit,calls})=>{
  await submit();assert.equal(calls.filter(c=>c.action==='create').length,0);assert.match(document.querySelector('#message').textContent,/security check/);
  config.callback('first-token');await submit();assert.equal(calls.filter(c=>c.action==='create').length,1);config.callback('fresh-token');await submit();const bodies=calls.filter(c=>c.action==='create').map(c=>JSON.parse(c.options.body));assert.deepEqual(bodies.map(b=>b.challenge_token),['first-token','fresh-token']);assert.equal(bodies[0].request_key,bodies[1].request_key);
 },{handle:action=>{if(action==='providers')return Response.json({providers:[{slug:'r-painters-llc',cities:['Summerville']}],services:['Interior painting'],intake_challenge:{required:true,available:true,site_key:'public-widget'}});if(action==='create'&&++creates===1)return Response.json({error:'Complete security check again'},{status:403})}})}finally{globalThis.window=oldWindow}
});

test('Enter on early steps advances without creating a project',()=>screen(async({document,calls,submit})=>{
 await submit();assert.equal(document.querySelector('[data-step="1"]').hidden,false);assert.equal(document.querySelector('.progress').getAttribute('aria-valuenow'),'2');
 await submit();assert.equal(document.querySelector('[data-step="2"]').hidden,false);assert.equal(document.querySelector('#submit').hidden,false);assert.equal(calls.filter(c=>c.action==='create').length,0);
},{step:0}));
test('step navigation focuses a focusable heading and updates accessible progress',()=>screen(async({document})=>{
 const heading=document.querySelector('[data-step="1"] h2');let focused=false;heading.focus=()=>focused=true;
 document.querySelector('#next').onclick();assert.equal(focused,true);assert.equal(heading.getAttribute('tabindex'),'-1');assert.equal(document.querySelector('.progress').getAttribute('role'),'progressbar');assert.match(document.querySelector('.progress').getAttribute('aria-valuetext'),/Step 2 of 3: Where and when/);
 document.querySelector('#back').onclick();assert.equal(document.querySelector('.progress').getAttribute('aria-valuenow'),'1');
},{step:0}));
test('final validation reveals an earlier step before focusing and reporting its invalid field',()=>screen(async({document,form,calls,submit})=>{
 const field=form.elements.namedItem('service'),step=document.querySelector('[data-step="0"]');let reports=0,focused=false;
 field.checkValidity=()=>false;field.focus=()=>{assert.equal(step.hidden,false);focused=true};field.reportValidity=()=>{assert.equal(step.hidden,false);reports++;return false};
 await submit();assert.equal(focused,true);assert.equal(reports,1);assert.equal(calls.filter(c=>c.action==='create').length,0);assert.equal(document.querySelector('.progress').getAttribute('aria-valuenow'),'1');
}));


test('failed create restores a focused submit button after it is enabled',()=>screen(async({document,submit,active,focusCalls})=>{
 const button=document.querySelector('#submit');button.focus();await submit();assert.equal(button.disabled,false);assert.equal(active()===button,true);assert.equal(focusCalls.filter(x=>x==='submit').length,2);
},{handle:action=>action==='create'?Response.json({error:'Synthetic retry'},{status:503}):undefined}));
test('failed create restores the submit button after disabled-button blur',()=>{
 const reply=deferred(),started=deferred();return screen(async({document,submit,active,blur})=>{
  const button=document.querySelector('#submit');button.focus();const pending=submit();await started.promise;blur();reply.resolve(Response.json({error:'Synthetic retry'},{status:503}));await pending;assert.equal(active()===button,true);assert.equal(button.disabled,false);
 },{handle:action=>{if(action==='create'){started.resolve();return reply.promise}}});
});
test('failed create preserves a different field selected while pending',()=>{
 const reply=deferred(),started=deferred();return screen(async({document,form,submit,active})=>{
  document.querySelector('#submit').focus();const pending=submit();await started.promise;const phone=form.elements.namedItem('phone');phone.focus();reply.resolve(Response.json({error:'Synthetic retry'},{status:503}));await pending;assert.equal(active()===phone,true);
 },{handle:action=>{if(action==='create'){started.resolve();return reply.promise}}});
});
test('failed create does not reclaim focus after a newer control later blurs',()=>{
 const reply=deferred(),started=deferred();return screen(async({document,form,submit,active,blur})=>{
  document.querySelector('#submit').focus();const pending=submit();await started.promise;form.elements.namedItem('phone').focus();blur();reply.resolve(Response.json({error:'Synthetic retry'},{status:503}));await pending;assert.equal(active()===document.body,true);
 },{handle:action=>{if(action==='create'){started.resolve();return reply.promise}}});
});
test('failed Enter submission preserves its original editable field',()=>screen(async({form,submit,active})=>{
 const phone=form.elements.namedItem('phone');phone.focus();await submit();assert.equal(active()===phone,true);
},{handle:action=>action==='create'?Response.json({error:'Synthetic retry'},{status:503}):undefined}));
test('an unfocused failed submission does not manufacture button focus',()=>screen(async({document,submit,active,blur,focusCalls})=>{
 blur();await submit();assert.equal(active()===document.body,true);assert.equal(focusCalls.includes('submit'),false);
},{handle:action=>action==='create'?Response.json({error:'Synthetic retry'},{status:503}):undefined}));
test('successful request retains receipt focus instead of focusing hidden submit',()=>screen(async({document,submit,active})=>{
 document.querySelector('#submit').focus();await submit();assert.equal(active()?.id,'request-receipt');assert.equal(document.querySelector('#request-form').hidden,true);
}));
test('failed-create focus ownership resets for a deliberate later retry',()=>{
 let creates=0;const reply=deferred(),started=deferred();return screen(async({document,form,submit,active,blur})=>{
  const button=document.querySelector('#submit');button.focus();const pending=submit();await started.promise;form.elements.namedItem('phone').focus();reply.resolve(Response.json({error:'Synthetic first failure'},{status:503}));await pending;
  button.focus();const second=submit();blur();await second;assert.equal(active()===button,true);assert.equal(creates,2);
 },{handle:action=>{if(action==='create'){creates++;if(creates===1){started.resolve();return reply.promise}return Response.json({error:'Synthetic second failure'},{status:503})}}});
});


for(const change of ['logout','new-login'])test(change+' during create prevents automatic account linking',()=>{
 const reply=deferred(),started=deferred();return screen(async({document,submit,calls})=>{
  const pending=submit();await started.promise;if(change==='logout')clearSession();else saveSession({access_token:'new-login',refresh_token:'new-refresh',expires_in:3600});
  reply.resolve(Response.json({project_id:project}));await pending;assert.equal(calls.filter(c=>c.action==='claim-project').length,0);assert.match(document.querySelector('#account-link-status').textContent,/could not be completed or confirmed/);assert.equal(document.querySelector('#request-receipt').hidden,false);
 },{signedIn:true,handle:action=>{if(action==='create'){started.resolve();return reply.promise}}});
});
test('signing in during a guest save does not silently claim the new project',()=>{
 const reply=deferred(),started=deferred();return screen(async({submit,calls})=>{
  const pending=submit();await started.promise;saveSession({access_token:'later-login',refresh_token:'later-refresh',expires_in:3600});reply.resolve(Response.json({project_id:project}));await pending;assert.equal(calls.filter(c=>c.action==='claim-project').length,0);
 },{handle:action=>{if(action==='create'){started.resolve();return reply.promise}}});
});
test('a different session selected during photo upload cannot receive automatic linking',()=>{
 const reply=deferred(),started=deferred();return screen(async({document,submit,calls})=>{
  const pending=submit();await started.promise;saveSession({access_token:'later-login',refresh_token:'later-refresh',expires_in:3600});reply.resolve(Response.json({ok:true}));await pending;
  assert.equal(calls.filter(c=>c.action==='claim-project').length,0);assert.match(document.querySelector('#upload-status').textContent,/All 1 photo/);assert.equal(document.querySelector('#request-receipt').hidden,false);
 },{signedIn:true,files:[{type:'image/jpeg',size:20}],handle:action=>{if(action==='upload'){started.resolve();return reply.promise}}});
});
for(const [change,failed] of [['logout',false],['new-login',false],['new-login',true]])test('pending claim '+(failed?'failure':'success')+' after '+change+' cannot assert current-account ownership',()=>{
 const reply=deferred(),started=deferred();return screen(async({document,submit,calls})=>{
  const pending=submit();await started.promise;if(change==='logout')clearSession();else saveSession({access_token:'later-login',refresh_token:'later-refresh',expires_in:3600});
  reply.resolve(failed?Response.json({error:'Synthetic failure'},{status:503}):Response.json({linked:true}));await pending;
  assert.equal(calls.filter(c=>c.action==='claim-project').length,1);assert.match(document.querySelector('#account-link-status').textContent,/could not be completed or confirmed/);assert.doesNotMatch(document.querySelector('#account-link-status').textContent,/Project linked/);assert.match(document.querySelector('#receipt-link').textContent,/#project=/);
 },{signedIn:true,handle:action=>{if(action==='claim-project'){started.resolve();return reply.promise}}});
});
test('renewing a token during automatic linking asks for deliberate account confirmation',()=>screen(async({document,submit,calls})=>{
 saveSession({access_token:'expired',refresh_token:'expired-refresh',expires_at:1});await submit();assert.equal(calls.filter(c=>c.action==='claim-project').length,0);assert.match(document.querySelector('#account-link-status').textContent,/could not be completed or confirmed/);
},{signedIn:true,handle:(action,options)=>{if(!action&&options.body?.includes('expired-refresh'))return Response.json({access_token:'renewed',refresh_token:'renewed-refresh',expires_in:3600})}}));
