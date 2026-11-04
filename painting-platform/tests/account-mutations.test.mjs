import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {saveSession,clearSession} from '../web/auth-session.js';
const session=name=>({access_token:name,refresh_token:name+'-refresh',expires_in:3600});
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject}}
async function screen(run){
 const old=Object.fromEntries(['document','location','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/account.html',import.meta.url),'utf8'));
 globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/account.html');
 const saved=new Map();globalThis.sessionStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 clearSession();saveSession(session('A'));
 const model={write:null,writes:[],failList:false};
 globalThis.fetch=async(url,options={})=>{
  if(url.includes('action=providers'))return Response.json({});
  if(url.endsWith('/logout'))return new Response(null,{status:204});
  if(url.includes('action=claim-project')||url.endsWith('/user')&&options.method==='PUT'){
   model.writes.push({url,body:JSON.parse(options.body),token:options.headers.authorization});return model.write?model.write():Response.json({});
  }
  if(url.endsWith('/user'))return Response.json({id:'A',email:'a@example.invalid',email_confirmed_at:'2026-10-22'});
  if(url.includes('action=home-projects')){if(model.failList)throw Error('List unavailable');return Response.json({projects:[]})}
  throw Error('Unexpected URL');
 };
 const submit=id=>{const form=document.querySelector('#'+id);return form.onsubmit({preventDefault(){},target:form})};
 const input=id=>document.querySelector('#'+id);
 try{await import('../web/account.js?test='+crypto.randomUUID());await run({model,submit,input,signout:()=>input('account-signout').onclick()})}
 finally{clearSession();Object.assign(globalThis,old)}
}
const link=number=>'https://r-painters-projects.jessicuriel27.chatgpt.site/project.html#project='+number+'&key=synthetic-private-key';
for(const kind of ['claim','password']){
 const field=kind==='claim'?'claim-link':'new-password',form=kind+'-form';
 test(kind+' rejects repeated events and preserves a newer field value',()=>screen(async({model,submit,input})=>{
  const reply=deferred(),started=deferred();model.write=()=>{started.resolve();return reply.promise};
  input(field).value=kind==='claim'?link('one'):'synthetic password one';const pending=submit(form);await started.promise;
  const repeated=submit(form);await Promise.resolve();await Promise.resolve();
  const newer=kind==='claim'?link('two'):'synthetic password two';input(field).value=newer;
  reply.resolve(Response.json({}));await Promise.all([pending,repeated]);assert.equal(model.writes.length,1);assert.equal(input(field).value,newer);
  if(kind==='password')assert.match(input('account-message').textContent,/newer value.*not been saved/);
  assert.equal(input(form).querySelector('button').disabled,false);
 }));
 for(const failed of [false,true])test(kind+' ignores late '+(failed?'failure':'success')+' after sign-out and a newer login',()=>screen(async({model,submit,input,signout})=>{
  const reply=deferred(),started=deferred();model.write=()=>{started.resolve();return reply.promise};
  input(field).value=kind==='claim'?link('one'):'synthetic password one';const pending=submit(form);await started.promise;
  await signout();saveSession(session('B'));input(field).value='new account draft';input('account-message').textContent='New account';
  if(failed)reply.reject(Error('Old account failure'));else reply.resolve(Response.json({}));await pending;
  assert.equal(input(field).value,'new account draft');assert.equal(input('account-message').textContent,'New account');assert.equal(input('account-dashboard').hidden,true);
 }));
 test(kind+' failure unlocks deliberate retry without clearing input',()=>screen(async({model,submit,input})=>{
  const value=kind==='claim'?link('one'):'synthetic password';input(field).value=value;model.write=()=>{throw Error('Temporary failure')};
  await submit(form);assert.equal(input(field).value,value);assert.equal(input(form).querySelector('button').disabled,false);
  model.write=null;await submit(form);assert.equal(model.writes.length,2);assert.equal(input(field).value,'');
 }));
 test(kind+' rechecks the session after the snapshot promise resolves',()=>screen(async({model,submit,input,signout})=>{
  input(field).value=kind==='claim'?link('one'):'synthetic password';const pending=submit(form);await Promise.resolve();await signout();await pending;
  assert.equal(model.writes.length,0);assert.equal(input('account-message').textContent,'Signed out.');
 }));
 test(kind+' cannot dispatch when sign-out happens during token acquisition',()=>screen(async({model,submit,input,signout})=>{
  input(field).value=kind==='claim'?link('one'):'synthetic password';const pending=submit(form);await signout();await pending;
  assert.equal(model.writes.length,0);assert.equal(input('account-message').textContent,'Signed out.');
 }));
}
test('saved project link remains saved when the following list refresh fails',()=>screen(async({model,submit,input})=>{
 input('claim-link').value=link('one');model.failList=true;await submit('claim-form');
 assert.equal(model.writes.length,1);assert.equal(input('claim-link').value,'');assert.match(input('account-message').textContent,/Project linked, but.*could not refresh/);
}));
