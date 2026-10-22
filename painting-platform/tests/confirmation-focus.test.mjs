import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {clearSession} from '../web/auth-session.js';
const session=()=>({access_token:'adopted',refresh_token:'adopted-refresh',expires_in:3600});
const identity=()=>Response.json({id:'synthetic-owner',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-22'});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(route,run){
 const old=Object.fromEntries(['document','location','history','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/account.html',import.meta.url),'utf8'));
 globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/account.html'+(route==='callback'?'#access_token=link-access&refresh_token=link-refresh&type=signup':''));globalThis.history={replaceState(){}};
 const stored=new Map();globalThis.sessionStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};clearSession();
 let active=document.body;const focuses=[];Object.defineProperty(document,'activeElement',{get:()=>active});
 const input=id=>document.querySelector('#'+id),model={verify:null,list:null};
 for(const node of document.querySelectorAll('[id]'))node.focus=()=>{active=node;focuses.push(node.id)};
 globalThis.fetch=async(url,options={})=>{
  if(url.includes('action=providers'))return Response.json({});
  if(url.endsWith('/logout'))return new Response(null,{status:204});
  if(url.endsWith('/verify')||url.endsWith('/user')&&options.headers.authorization==='Bearer link-access')return model.verify?model.verify():(route==='manual'?Response.json(session()):identity());
  if(url.includes('/token?'))return Response.json(session());
  if(url.endsWith('/user'))return identity();
  if(url.includes('action=home-projects'))return model.list?model.list():Response.json({projects:[]});
  throw Error('Unexpected synthetic request');
 };
 try{
  await import('../web/account.js?test='+crypto.randomUUID());input('confirmation-link').value='https://ocmgrgvzhuhyigaddhue.supabase.co/auth/v1/verify?token=synthetic-hash&type=signup';
  const button=route==='callback'?input('complete-email-link'):input('confirmation-form').querySelector('button');button.focus=()=>{active=button};button.focus();
  const submit=()=>route==='callback'?button.onclick():input('confirmation-form').onsubmit({preventDefault(){},target:input('confirmation-form')});
  await run({input,model,submit,button,focuses,active:()=>active,blur:()=>{active=document.body}});
 }finally{clearSession();Object.assign(globalThis,old)}
}
for(const route of ['manual','callback']){
 test(route+' confirmation focuses the visible heading after deliberate completion',()=>screen(route,async({submit,input,active})=>{
  await submit();assert.equal(input('account-dashboard').hidden,false);assert.equal(active()?.id,'account-identity');
  if(route==='callback')assert.equal(input('complete-email-link'),null);
 }));
 for(const stage of ['verify','list'])test(route+' confirmation preserves another control chosen during '+stage,()=>screen(route,async({submit,model,input,active,focuses})=>{
  const reply=deferred(),started=deferred();model[stage]=()=>{started.resolve();return reply.promise};const pending=submit();await started.promise;input('confirmation-link').focus();
  reply.resolve(stage==='list'?Response.json({projects:[]}):route==='manual'?Response.json(session()):identity());await pending;
  assert.equal(active()?.id,'confirmation-link');assert.equal(focuses.includes('account-identity'),false);
 }));
 test(route+' logout during account load prevents stale heading focus',()=>screen(route,async({submit,model,input,focuses})=>{
  const reply=deferred(),started=deferred();model.list=()=>{started.resolve();return reply.promise};const pending=submit();await started.promise;await input('account-signout').onclick();reply.resolve(Response.json({projects:[]}));await pending;
  assert.equal(input('account-dashboard').hidden,true);assert.equal(focuses.includes('account-identity'),false);assert.equal(input('account-message').textContent,'Signed out.');
 }));
 test(route+' failed account list retains recovery guidance without heading focus',()=>screen(route,async({submit,model,input,focuses})=>{
  model.list=()=>{throw Error('Synthetic list failure')};await submit();assert.equal(focuses.includes('account-identity'),false);assert.match(input('account-message').textContent,/verified, but your account could not load/);
 }));
 test(route+' disabled-button blur still transfers focus on success',()=>screen(route,async({submit,active,input,blur})=>{
  const pending=submit();blur();await pending;assert.equal(active()?.id,'account-identity');
 }));
}
test('manual Enter from the confirmation link focuses the account heading',()=>screen('manual',async({submit,input,active})=>{
 input('confirmation-link').focus();await submit();assert.equal(active()?.id,'account-identity');
}));
test('a newer pasted link during account loading keeps its input focus',()=>screen('manual',async({submit,model,input,active,focuses})=>{
 const reply=deferred(),started=deferred();model.list=()=>{started.resolve();return reply.promise};input('confirmation-link').focus();const pending=submit();await started.promise;
 input('confirmation-link').value='https://example.invalid/new-synthetic-draft';reply.resolve(Response.json({projects:[]}));await pending;
 assert.equal(active()?.id,'confirmation-link');assert.equal(focuses.includes('account-identity'),false);
}));
