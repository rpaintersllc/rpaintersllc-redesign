import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {emailCallback,clearSession,saveSession,sessionToken} from '../web/auth-session.js';
const fragment='#access_token=link-access&refresh_token=link-refresh&type=recovery';
test('callback parsing recognizes expiry without trusting supplied error descriptions',()=>{
 assert.match(emailCallback('#error=access_denied&error_code=otp_expired&error_description=malicious').error,/expired/);assert.doesNotMatch(emailCallback('#error_description=malicious').error,/malicious/);assert.equal(emailCallback('#section=help'),null);
});
test('incomplete, duplicate or unsupported callback credentials are rejected',()=>{
 for(const hash of ['#access_token=one','#refresh_token=one',fragment+'&access_token=second',fragment+'&type=admin','#access_token=one&refresh_token=two&type=admin'])assert.ok(emailCallback(hash).error);
 assert.equal(emailCallback(fragment).type,'recovery');
});
async function screen(run,{hash=fragment,handle=()=>{}}={}){
 const old=Object.fromEntries(['document','location','history','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/account.html',import.meta.url),'utf8'));globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/account.html?mode=signin'+hash);let focused=false;document.querySelector('#new-password').focus=()=>{focused=true};
 const cleaned=[];globalThis.history={replaceState:(state,title,url)=>{cleaned.push(url);globalThis.location=new URL(url,location.origin)}};const stored=new Map();globalThis.sessionStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};clearSession();
 const calls=[];globalThis.fetch=async(url,options={})=>{calls.push({url,options});const result=await handle(url,options);if(result)return result;if(url.includes('action=providers'))return Response.json({});if(url.includes('action=home-projects'))return Response.json({projects:[]});if(url.includes('/token?grant_type=refresh_token'))return Response.json({access_token:'renewed-access',refresh_token:'renewed-refresh',expires_in:3600});if(url.endsWith('/user'))return Response.json({id:'same-user',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-21'});throw Error('Unexpected request')};
 try{await import('../web/account.js?test='+crypto.randomUUID());await run({document,calls,cleaned,stored,focused:()=>focused})}finally{clearSession();Object.assign(globalThis,old)}
}
test('expired redirects are scrubbed and explained without an authentication request',()=>screen(async({document,calls,cleaned})=>{
 assert.deepEqual(cleaned,['/account.html?mode=signin']);assert.match(document.querySelector('#account-message').textContent,/link has expired/);assert.equal(document.querySelector('#complete-email-link'),null);assert.equal(calls.filter(c=>c.url.includes('/auth/v1/')).length,0);assert.doesNotMatch(document.body.textContent,/untrusted-description/);
},{hash:'#error=access_denied&error_code=otp_expired&error_description=untrusted-description'}));
test('recovery waits for a click, verifies matching identities and opens the password step',()=>screen(async({document,calls,stored,focused})=>{
 assert.equal(calls.filter(c=>c.url.includes('/auth/v1/')).length,0);assert.equal(stored.has('buzzie.session'),false);assert.match(document.querySelector('#complete-email-link').textContent,/password recovery/);await document.querySelector('#complete-email-link').onclick();assert.equal(document.querySelector('#account-dashboard').hidden,false);assert.match(document.querySelector('#account-message').textContent,/Choose a new password/);assert.equal(focused(),true);assert.equal(JSON.parse(stored.get('buzzie.session')).access_token,'renewed-access');assert.doesNotMatch(document.body.innerHTML,/link-access|link-refresh|renewed-refresh/);assert.equal(document.querySelector('#complete-email-link'),null);
}));
test('email confirmation retains confirmation wording instead of a recovery prompt',()=>screen(async({document,focused})=>{
 await document.querySelector('#complete-email-link').onclick();assert.match(document.querySelector('#account-message').textContent,/Email link verified/);assert.equal(focused(),false);
},{hash:fragment.replace('type=recovery','type=signup')}));
test('mismatched access and refresh identities never become a saved session',()=>screen(async({document,stored})=>{
 await document.querySelector('#complete-email-link').onclick();assert.equal(stored.has('buzzie.session'),false);assert.equal(document.querySelector('#account-dashboard').hidden,true);assert.match(document.querySelector('#account-message').textContent,/could not be verified/);
},{handle:(url,options)=>url.endsWith('/user')&&options.headers.authorization==='Bearer renewed-access'?Response.json({id:'another-user',email_confirmed_at:'2026-10-21'}):undefined}));
test('a failed refresh cannot persist callback credentials',()=>screen(async({document,stored})=>{
 await document.querySelector('#complete-email-link').onclick();assert.equal(stored.has('buzzie.session'),false);assert.equal(document.querySelector('#complete-email-link').disabled,false);
},{handle:url=>url.includes('/token?')?Response.json({code:'refresh_token_not_found'},{status:400}):undefined}));
test('an in-flight email check cannot overwrite a newer sign-in',async()=>{
 let release,started;const waiting=new Promise(r=>release=r),begun=new Promise(r=>started=r);
 await screen(async({document})=>{const pending=document.querySelector('#complete-email-link').onclick();await begun;saveSession({access_token:'new-session',refresh_token:'new-refresh',expires_in:3600});document.querySelector('#account-message').textContent='New sign-in';release(Response.json({id:'same-user',email_confirmed_at:'2026-10-21'}));await pending;assert.equal(await sessionToken(),'new-session');assert.equal(document.querySelector('#account-message').textContent,'New sign-in');},{handle:(url,options)=>{if(url.endsWith('/user')&&options.headers.authorization==='Bearer renewed-access'){started();return waiting}}});
});
