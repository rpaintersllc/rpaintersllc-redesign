import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {saveSession,clearSession} from '../web/auth-session.js';
const identity={id:'synthetic-homeowner',email:'account@example.invalid',user_metadata:{full_name:'Account name'}};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,{initial={},authFailure=false}={}){
 const old=Object.fromEntries(['document','location','fetch','Option','FormData','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/request.html',import.meta.url),'utf8'));
 globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/request.html');
 const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const form=document.querySelector('#request-form');Object.defineProperty(form,'elements',{value:{namedItem:name=>form.querySelector('[name="'+name+'"]')}});
 const field=name=>form.elements.namedItem(name);
 for(const control of form.querySelectorAll('input,textarea,select')){control.checkValidity=()=>true;control.reportValidity=()=>true}
 for(const [name,value] of Object.entries(initial))field(name).value=value;
 document.querySelector('#photos').files=[];field('contact_consent').checked=true;
 globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option};
 globalThis.FormData=class{*[Symbol.iterator](){yield* Object.entries({full_name:'Synthetic submitted name',email:'submitted@example.invalid',phone:'2025550149',service:'Interior painting',property_type:'Home',details:'Synthetic living room painting',city:'Summerville',zip:'29483',timing:'Just planning'})}};
 const userReply=deferred(),userStarted=deferred(),createReply=deferred(),createStarted=deferred();let creates=0;
 globalThis.fetch=async(url,options={})=>{
  const action=new URL(url).searchParams.get('action');
  if(action==='providers')return Response.json({providers:[{slug:'r-painters-llc',cities:['Summerville']}],services:['Interior painting']});
  if(url.endsWith('/auth/v1/user')){userStarted.resolve();return userReply.promise}
  if(action==='create'){creates++;createStarted.resolve();return createReply.promise}
  if(action==='claim-project')return Response.json({linked:true});
  throw Error('Unexpected synthetic prefill request');
 };
 clearSession();saveSession({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600});
 const importing=import('../web/request.js?prefill='+crypto.randomUUID());
 const respond=()=>userReply.resolve(authFailure?Response.json({error:'Synthetic unavailable'},{status:503}):Response.json(identity));
 try{
  await userStarted.promise;
  const edit=(name,value,type='input')=>{field(name).value=value;field(name).dispatchEvent(new document.defaultView.Event(type,{bubbles:true}))};
  const submit=()=>{document.querySelector('#next').onclick();document.querySelector('#next').onclick();return form.onsubmit({preventDefault(){}})};
  await run({field,edit,document,form,respond,ready:()=>importing,submit,createStarted,createReply,creates:()=>creates});
 }finally{respond();await importing;clearSession();Object.assign(globalThis,old)}
}
test('untouched empty contact fields receive current account hints',()=>screen(async({field,respond,ready})=>{
 respond();await ready();assert.equal(field('email').value,identity.email);assert.equal(field('full_name').value,identity.user_metadata.full_name);
}));
test('late account prefill preserves a newly typed email and fills untouched name',()=>screen(async({field,edit,respond,ready})=>{
 edit('email','new-contact@example.invalid');respond();await ready();assert.equal(field('email').value,'new-contact@example.invalid');assert.equal(field('full_name').value,identity.user_metadata.full_name);
}));
test('late account prefill preserves a name change and fills untouched email',()=>screen(async({field,edit,respond,ready})=>{
 edit('full_name','New contact name','change');respond();await ready();assert.equal(field('full_name').value,'New contact name');assert.equal(field('email').value,identity.email);
}));
test('contact fields deliberately typed then cleared stay empty',()=>screen(async({field,edit,respond,ready})=>{
 for(const name of ['email','full_name']){edit(name,'Temporary draft');edit(name,'')}
 respond();await ready();assert.equal(field('email').value,'');assert.equal(field('full_name').value,'');
}));
test('existing browser-filled contact values are preserved without input events',()=>screen(async({field,respond,ready})=>{
 respond();await ready();assert.equal(field('email').value,'autofill@example.invalid');assert.equal(field('full_name').value,'Browser filled name');
},{initial:{email:'autofill@example.invalid',full_name:'Browser filled name'}}));
test('logout while account hints load cannot prefill stale contact values',()=>screen(async({field,respond,ready})=>{
 clearSession();respond();await ready();assert.equal(field('email').value,'');assert.equal(field('full_name').value,'');
}));
test('a newer session prevents the old identity from prefilling the request',()=>screen(async({field,respond,ready})=>{
 saveSession({access_token:'new-synthetic-access',refresh_token:'new-synthetic-refresh',expires_in:3600});respond();await ready();assert.equal(field('email').value,'');assert.equal(field('full_name').value,'');
}));
test('account hints arriving during save cannot change submitted form fields',()=>screen(async({field,respond,ready,submit,createStarted,createReply,creates})=>{
 const saving=submit();await createStarted.promise;respond();await ready();const hints=[field('email').value,field('full_name').value];
 createReply.resolve(Response.json({error:'Synthetic unsaved failure'},{status:503}));await saving;assert.deepEqual(hints,['','']);assert.equal(creates(),1);
}));
test('account hints arriving after receipt cannot mutate hidden contact fields',()=>screen(async({field,form,respond,ready,submit,createStarted,createReply})=>{
 const saving=submit();await createStarted.promise;createReply.resolve(Response.json({project_id:'11111111-1111-4111-8111-111111111111'}));await saving;assert.equal(form.hidden,true);
 respond();await ready();assert.equal(field('email').value,'');assert.equal(field('full_name').value,'');
}));
test('failed account read leaves contact entry available without hints',()=>screen(async({field,respond,ready})=>{
 respond();await ready();assert.equal(field('email').value,'');assert.equal(field('full_name').value,'');
},{authFailure:true}));
