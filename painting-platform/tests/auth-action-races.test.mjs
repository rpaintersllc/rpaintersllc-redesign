import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {clearSession,saveSession,sessionToken} from '../web/auth-session.js';
const session=token=>({access_token:token,refresh_token:token+'-refresh',expires_in:3600});
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject}}
async function screen(kind,run){
 const old=Object.fromEntries(['document','location','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/account.html',import.meta.url),'utf8'));
 globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/account.html');
 const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};clearSession();
 const input=id=>document.querySelector('#'+id),model={reply:null,list:null,writes:[]};
 globalThis.fetch=async(url,options={})=>{
  if(url.includes('action=providers'))return Response.json({});
  if(url.endsWith('/logout'))return new Response(null,{status:204});
  if(url.includes('/token?')||url.includes('/signup?')||url.includes('/recover?')){model.writes.push({url,body:JSON.parse(options.body)});return model.reply?model.reply():Response.json(kind==='recover'?{}:session('signed-in'))}
  if(url.endsWith('/user'))return Response.json({id:'homeowner',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-22'});
  if(url.includes('action=home-projects'))return model.list?model.list():Response.json({projects:[]});
  throw Error('Unexpected URL');
 };
 const submit=()=>kind==='recover'?input('recover-account').onclick():input('account-form').onsubmit({preventDefault(){}});
 try{
  await import('../web/account.js?test='+crypto.randomUUID());input('account-email').value='homeowner@example.invalid';input('account-email').checkValidity=()=>true;input('account-password').value='synthetic submitted password';input('account-consent').checked=true;
  if(kind==='signup')input('mode-signup').onclick();
  await run({input,model,submit,signout:()=>input('account-signout').onclick()});
 }finally{clearSession();Object.assign(globalThis,old)}
}
for(const kind of ['signin','signup','recover'])for(const changed of ['logout','new-login'])for(const failed of [false,true])test(kind+' ignores late '+(failed?'failure':'success')+' after '+changed,()=>screen(kind,async({input,model,submit,signout})=>{
 const reply=deferred(),started=deferred();model.reply=()=>{started.resolve();return reply.promise};const pending=submit();await started.promise;
 await signout();if(changed==='new-login')saveSession(session('new-login'));
 input('account-password').value='newer draft';input('account-message').textContent='Current session feedback';
 if(failed)reply.reject(Error('Old response failure'));else reply.resolve(Response.json(kind==='recover'?{}:session('old-response')));await pending;
 assert.equal(await sessionToken(),changed==='new-login'?'new-login':'');assert.equal(input('account-message').textContent,'Current session feedback');assert.equal(input('account-password').value,'newer draft');assert.equal(input('account-dashboard').hidden,true);assert.equal(input('auth-submit').disabled,false);
}));
for(const kind of ['signin','signup']){
 test(kind+' preserves a password edited while the response was pending',()=>screen(kind,async({input,model,submit})=>{
  const reply=deferred(),started=deferred();model.reply=()=>{started.resolve();return reply.promise};const pending=submit();await started.promise;
  input('account-password').value='newer draft';reply.resolve(Response.json(session('signed-in')));await pending;
  assert.equal(input('account-password').value,'newer draft');assert.equal(model.writes[0].body.password,'synthetic submitted password');assert.equal(input('account-dashboard').hidden,false);
 }));
 test(kind+' cannot show successful account feedback after logout during list load',()=>screen(kind,async({input,model,submit,signout})=>{
  const reply=deferred(),started=deferred();model.list=()=>{started.resolve();return reply.promise};const pending=submit();await started.promise;
  await signout();reply.resolve(Response.json({projects:[]}));await pending;
  assert.equal(await sessionToken(),'');assert.equal(input('account-message').textContent,'Signed out.');assert.equal(input('account-dashboard').hidden,true);
 }));
}
test('signup without a session keeps conditional confirmation wording and switches to sign-in',()=>screen('signup',async({input,model,submit})=>{
 model.reply=()=>Response.json({});await submit();assert.equal(await sessionToken(),'');assert.match(input('account-message').textContent,/If this address can register/);assert.equal(input('auth-submit').textContent,'Sign in');assert.equal(input('account-password').value,'');
}));
test('an ordinary sign-in failure unlocks retry and retains the submitted password',()=>screen('signin',async({input,model,submit})=>{
 model.reply=()=>Response.json({code:'invalid_credentials'},{status:400});await submit();assert.equal(input('account-password').value,'synthetic submitted password');assert.equal(input('auth-submit').disabled,false);
 model.reply=null;await submit();assert.equal(model.writes.length,2);assert.equal(await sessionToken(),'signed-in');assert.equal(input('account-password').value,'');
}));
