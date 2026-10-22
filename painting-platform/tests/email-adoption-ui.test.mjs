import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {clearSession,saveSession,sessionToken} from '../web/auth-session.js';
const session=token=>({access_token:token,refresh_token:token+'-refresh',expires_in:3600});
const identity=()=>Response.json({id:'link-owner',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-22'});
const fragment='#access_token=link-access&refresh_token=link-refresh&type=recovery';
const link=type=>'https://ocmgrgvzhuhyigaddhue.supabase.co/auth/v1/verify?token=synthetic-hash&type='+type;
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject}}
async function screen(route,run){
 const old=Object.fromEntries(['document','location','history','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/account.html',import.meta.url),'utf8'));
 globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/account.html'+(route==='callback'?fragment:''));
 globalThis.history={replaceState:()=>{}};const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};clearSession();
 let active=document.body;Object.defineProperty(document,'activeElement',{get:()=>active});
 let focused=0;const input=id=>document.querySelector('#'+id);input('new-password').focus=()=>{active=input('new-password');focused++};
 const model={verify:null,list:null,verifications:0};
 globalThis.fetch=async(url,options={})=>{
  if(url.includes('action=providers'))return Response.json({});
  if(url.endsWith('/logout'))return new Response(null,{status:204});
  if(url.endsWith('/verify')||url.endsWith('/user')&&options.headers.authorization==='Bearer link-access'){
   model.verifications++;return model.verify?model.verify():(route==='manual'?Response.json(session('adopted')):identity());
  }
  if(url.includes('/token?'))return Response.json(session('adopted'));
  if(url.endsWith('/user'))return identity();
  if(url.includes('action=home-projects'))return model.list?model.list():Response.json({projects:[]});
  throw Error('Unexpected URL');
 };
 const submit=()=>{active=route==='callback'?input('complete-email-link'):input('confirmation-form').querySelector('button');return route==='callback'?active.onclick():input('confirmation-form').onsubmit({preventDefault(){},target:input('confirmation-form')})};
 try{await import('../web/account.js?test='+crypto.randomUUID());input('confirmation-link').value=link('recovery');await run({input,model,submit,focused:()=>focused,signout:()=>input('account-signout').onclick()})}
 finally{clearSession();Object.assign(globalThis,old)}
}
for(const route of ['manual','callback']){
 for(const failed of [false,true])test(route+' email verification ignores late '+(failed?'failure':'success')+' after sign-out/new login',()=>screen(route,async({input,model,submit,signout,focused})=>{
  const reply=deferred(),started=deferred();model.verify=()=>{started.resolve();return reply.promise};const pending=submit();await started.promise;
  await signout();saveSession(session('new-login'));input('account-message').textContent='New session';input('confirmation-link').value='New link draft';
  if(failed)reply.reject(Error('Old verification failed'));else reply.resolve(route==='manual'?Response.json(session('old-link')):identity());await pending;
  assert.equal(await sessionToken(),'new-login');assert.equal(input('account-message').textContent,'New session');assert.equal(input('confirmation-link').value,'New link draft');assert.equal(focused(),0);assert.equal(input('account-dashboard').hidden,true);
  if(route==='callback')assert.equal(input('complete-email-link').disabled,false);
 }));
 test(route+' email completion ignores a late account load after logout',()=>screen(route,async({input,model,submit,signout,focused})=>{
  const reply=deferred(),started=deferred();model.list=()=>{started.resolve();return reply.promise};const pending=submit();await started.promise;
  await signout();reply.resolve(Response.json({projects:[]}));await pending;
  assert.equal(await sessionToken(),'');assert.equal(input('account-message').textContent,'Signed out.');assert.equal(focused(),0);assert.equal(input('account-dashboard').hidden,true);
 }));
 test(route+' verified link distinguishes a failed account load without focusing password',()=>screen(route,async({input,model,submit,focused})=>{
  model.list=()=>{throw Error('Temporary list failure')};await submit();
  assert.equal(await sessionToken(),'adopted');assert.match(input('account-message').textContent,/Email link verified, but your account could not load/);assert.match(input('account-message').textContent,/Refresh.*password recovery/);assert.equal(focused(),0);
  if(route==='callback')assert.equal(input('complete-email-link'),null);
 }));
}
test('manual confirmation blocks duplicate events and keeps a newer pasted link',()=>screen('manual',async({input,model,submit})=>{
 const reply=deferred(),started=deferred();model.verify=()=>{started.resolve();return reply.promise};const pending=submit();await started.promise;
 const repeated=submit();input('confirmation-link').value=link('signup');reply.resolve(Response.json(session('adopted')));await Promise.all([pending,repeated]);
 assert.equal(model.verifications,1);assert.equal(input('confirmation-link').value,link('signup'));
}));
for(const type of ['recovery','signup'])test('manual '+type+' displays correct successful completion and focus',()=>screen('manual',async({input,submit,focused})=>{
 input('confirmation-link').value=link(type);await submit();assert.equal(input('confirmation-link').value,'');assert.equal(input('account-dashboard').hidden,false);
 assert.match(input('account-message').textContent,type==='recovery'?/Recovery verified.*new password/:/Email confirmed/);assert.equal(focused(),type==='recovery'?1:0);
}));
test('manual confirmation failure preserves the link and unlocks a deliberate retry',()=>screen('manual',async({input,model,submit})=>{
 model.verify=()=>Response.json({error:'expired'},{status:400});await submit();assert.equal(input('confirmation-link').value,link('recovery'));assert.equal(input('confirmation-form').querySelector('button').disabled,false);
 model.verify=null;await submit();assert.equal(model.verifications,2);assert.equal(await sessionToken(),'adopted');assert.equal(input('confirmation-link').value,'');
}));
