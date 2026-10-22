import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {clearSession,saveSession} from '../web/auth-session.js';
const session=()=>({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run){
 const old=Object.fromEntries(['document','location','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/account.html',import.meta.url),'utf8'));
 globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/account.html');
 const stored=new Map();globalThis.sessionStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};clearSession();
 const input=id=>document.querySelector('#'+id);let active=document.body;const focuses=[];
 Object.defineProperty(document,'activeElement',{get:()=>active});
 for(const node of document.querySelectorAll('[id]'))node.focus=()=>{active=node;focuses.push(node.id)};
 const model={auth:null,user:null,failList:false};
 globalThis.fetch=async(url)=>{
  if(url.includes('action=providers'))return Response.json({});
  if(url.includes('/token?')||url.includes('/signup?'))return model.auth?model.auth():Response.json(session());
  if(url.endsWith('/user'))return model.user?model.user():Response.json({id:'synthetic',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-22'});
  if(url.endsWith('/logout'))return new Response(null,{status:204});
  if(url.includes('action=home-projects')){if(model.failList)throw Error('List unavailable');return Response.json({projects:[]})}
  throw Error('Unexpected URL');
 };
 const submit=()=>input('account-form').onsubmit({preventDefault(){}});
 try{await import('../web/account.js?test='+crypto.randomUUID());input('account-email').value='homeowner@example.invalid';input('account-password').value='synthetic password';await run({input,model,submit,focuses,active:()=>active,blur:()=>{active=document.body}})}
 finally{clearSession();Object.assign(globalThis,old)}
}
for(const kind of ['signin','signup'])test(kind+' moves keyboard focus to the current visible account heading',()=>screen(async({input,submit,focuses,active})=>{
 if(kind==='signup'){input('mode-signup').onclick();input('account-consent').checked=true}
 input('account-password').focus();await submit();assert.equal(active()?.id,'account-identity');assert.equal(input('account-identity').getAttribute('tabindex'),'-1');assert.equal(input('account-dashboard').hidden,false);assert.equal(focuses.filter(id=>id==='account-identity').length,1);
}));
for(const stage of ['auth','user'])test('a user focus change during '+stage+' lookup is preserved',()=>screen(async({input,model,submit,active,focuses})=>{
 const reply=deferred(),started=deferred();model[stage]=()=>{started.resolve();return reply.promise};input('account-password').focus();const pending=submit();await started.promise;input('confirmation-link').focus();
 reply.resolve(stage==='auth'?Response.json(session()):Response.json({id:'synthetic',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-22'}));await pending;
 assert.equal(active()?.id,'confirmation-link');assert.equal(focuses.includes('account-identity'),false);
}));
test('manual project refresh does not move focus from its trigger',()=>screen(async({input,active,focuses})=>{
 saveSession(session());input('account-refresh').focus();await input('account-refresh').onclick();assert.equal(active()?.id,'account-refresh');assert.equal(focuses.includes('account-identity'),false);
}));
test('logout during pending identity lookup prevents heading focus',()=>screen(async({input,model,submit,focuses})=>{
 const reply=deferred(),started=deferred();model.user=()=>{started.resolve();return reply.promise};input('account-password').focus();const pending=submit();await started.promise;await input('account-signout').onclick();
 reply.resolve(Response.json({id:'synthetic',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-22'}));await pending;assert.equal(focuses.includes('account-identity'),false);assert.equal(input('account-dashboard').hidden,true);
}));

test('a submit button blurred by its busy state still leads to the account heading',()=>screen(async({input,submit,active,blur})=>{
 input('auth-submit').focus();const pending=submit();blur();await pending;assert.equal(active()?.id,'account-identity');
}));
