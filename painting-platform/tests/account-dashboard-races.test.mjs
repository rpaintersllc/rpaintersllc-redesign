import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {saveSession,clearSession} from '../web/auth-session.js';
const session=name=>({access_token:name,refresh_token:name+'-refresh',expires_in:3600});
const projects=label=>Response.json({projects:[{id:label,lead:{service:label,city:'Summerville',status:'new'}}]});
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject}}
async function screen(run){
 const old=Object.fromEntries(['document','location','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));const {document}=parseHTML(await readFile(new URL('../web/account.html',import.meta.url),'utf8'));globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/account.html');const saved=new Map();globalThis.sessionStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};clearSession();saveSession(session('account-A'));
 const model={lookup:null,logout:null,user:null,denyUser:false};globalThis.fetch=async(url,options={})=>{const token=options.headers?.authorization;if(url.includes('action=providers'))return Response.json({});if(url.endsWith('/logout'))return model.logout?model.logout():new Response(null,{status:204});if(url.endsWith('/user')&&model.user)return model.user();if(url.endsWith('/user'))return model.denyUser?Response.json({error:'expired'},{status:401}):Response.json({id:token==='Bearer account-B'?'B':'A',email:token==='Bearer account-B'?'b@example.invalid':'a@example.invalid',email_confirmed_at:'2026-10-21'});if(url.includes('action=home-projects'))return model.lookup?model.lookup(token):projects(token==='Bearer account-B'?'B project':'A project');throw Error('Unexpected URL')};
 try{await import('../web/account.js?test='+crypto.randomUUID());await run({document,model,refresh:()=>document.querySelector('#account-refresh').onclick(),signout:()=>document.querySelector('#account-signout').onclick()})}finally{clearSession();Object.assign(globalThis,old)}
}
test('a project response after sign-out cannot restore previous identity or cards',()=>screen(async({document,model,refresh,signout})=>{
 const reply=deferred(),started=deferred();model.lookup=()=>{started.resolve();return reply.promise};const pending=refresh();await started.promise;await signout();reply.resolve(projects('stale A project'));await pending;assert.equal(document.querySelector('#account-dashboard').hidden,true);assert.equal(document.querySelector('#account-projects').textContent,'');assert.equal(document.querySelector('#account-identity').textContent,'');assert.equal(document.querySelector('#account-message').textContent,'Signed out.');
}));
test('a previous account response cannot mix cards into the next account',()=>screen(async({document,model,refresh})=>{
 const reply=deferred(),started=deferred();model.lookup=()=>{started.resolve();return reply.promise};const pending=refresh();await started.promise;saveSession(session('account-B'));model.lookup=null;await refresh();reply.resolve(projects('stale A project'));await pending;assert.equal(document.querySelector('#account-identity').textContent,'b@example.invalid');assert.match(document.querySelector('#account-projects').textContent,/B project/);assert.doesNotMatch(document.querySelector('#account-projects').textContent,/A project/);
}));
test('only the newest refresh may render even within the same account',()=>screen(async({document,model,refresh})=>{
 const reply=deferred(),started=deferred();model.lookup=()=>{started.resolve();return reply.promise};const older=refresh();await started.promise;model.lookup=()=>projects('newest project');await refresh();reply.resolve(projects('older project'));await older;assert.match(document.querySelector('#account-projects').textContent,/newest project/);assert.doesNotMatch(document.querySelector('#account-projects').textContent,/older project/);
}));
test('an old failed request cannot replace the newer account status',()=>screen(async({document,model,refresh})=>{
 const reply=deferred(),started=deferred();model.lookup=()=>{started.resolve();return reply.promise};const older=refresh();await started.promise;saveSession(session('account-B'));model.lookup=null;await refresh();document.querySelector('#account-message').textContent='Current account';reply.reject(Error('stale private error'));await older;assert.equal(document.querySelector('#account-message').textContent,'Current account');assert.match(document.querySelector('#account-projects').textContent,/B project/);
}));
test('local sign-out clears cards and sensitive form inputs before server logout finishes',()=>screen(async({document,model,signout})=>{
 const reply=deferred();model.logout=()=>reply.promise;document.querySelector('#new-password').value='unsaved-password';document.querySelector('#claim-link').value='https://example.invalid/#private-key';document.querySelector('#confirmation-link').value='https://example.invalid/#email-key';const pending=signout();try{assert.equal(document.querySelector('#account-dashboard').hidden,true);assert.equal(document.querySelector('#account-projects').textContent,'');assert.equal(document.querySelector('#account-identity').textContent,'');for(const id of ['new-password','claim-link','confirmation-link'])assert.equal(document.querySelector('#'+id).value,'')}finally{reply.resolve(new Response(null,{status:204}));await pending}
}));
test('a rejected session clears the old project list and identity',()=>screen(async({document,model,refresh})=>{
 model.denyUser=true;await refresh();assert.equal(document.querySelector('#account-dashboard').hidden,true);assert.equal(document.querySelector('#account-projects').textContent,'');assert.equal(document.querySelector('#account-identity').textContent,'');
}));

test('old cards disappear while a different account identity is still being checked',()=>screen(async({document,model,refresh})=>{
 const reply=deferred(),started=deferred();saveSession(session('account-B'));model.user=()=>{started.resolve();return reply.promise};const pending=refresh();await started.promise;assert.equal(document.querySelector('#account-projects').textContent,'');assert.equal(document.querySelector('#account-identity').textContent,'');reply.resolve(Response.json({id:'B',email:'b@example.invalid',email_confirmed_at:'2026-10-21'}));await pending;assert.match(document.querySelector('#account-projects').textContent,/B project/);
}));
