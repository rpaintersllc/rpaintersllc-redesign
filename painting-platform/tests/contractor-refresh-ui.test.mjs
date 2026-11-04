import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run){
 const old={document:globalThis.document,fetch:globalThis.fetch,FormData:globalThis.FormData},oldNow=Date.now;
 const {document}=parseHTML(await readFile(new URL('../web/pro.html',import.meta.url),'utf8'));globalThis.document=document;
 let now=oldNow(),logins=0;Date.now=()=>now;const reply=deferred(),started=deferred(),calls=[];
 globalThis.FormData=class{*[Symbol.iterator](){yield ['email','contractor@example.invalid'];yield ['password','fixture-only']}};
 const form=document.querySelector('#signin');form.reset=()=>{};
 globalThis.fetch=async(url,options={})=>{
  const target=new URL(url);calls.push({url,token:options.headers?.authorization});
  if(target.pathname.endsWith('/logout'))return new Response(null,{status:204});
  if(target.searchParams.get('grant_type')==='password')return Response.json({access_token:'login-'+(++logins),refresh_token:'refresh-'+logins,expires_in:3600});
  if(target.searchParams.get('grant_type')==='refresh_token'){started.resolve();return reply.promise}
  if(target.searchParams.get('action')==='providers')return Response.json({auth_challenge:{required:false}});
  if(target.searchParams.get('action')==='pro-list')return Response.json({business:{id:'business',name:'Pilot company'},role:'staff',coverage:{cities:['Summerville'],state:'SC',zip_prefix:'294',active:true,accepting_requests:true},memberships:[],projects:[],can_review_interest:false});
  throw Error('Unexpected fixture request');
 };
 try{
  await import('../web/pro.js?test='+crypto.randomUUID());
  const signin=()=>form.onsubmit({preventDefault(){},target:form});await signin();assert.equal(document.querySelector('#workspace').hidden,false);
  now+=3600000;
  await run({document,signin,calls,reply,started,refresh:()=>document.querySelector('#refresh').onclick(),signout:()=>document.querySelector('#signout').onclick()});
 }finally{Date.now=oldNow;Object.assign(globalThis,old)}
}
test('late refresh cannot revive the contractor workspace after sign-out',()=>screen(async({document,refresh,signout,calls,reply,started})=>{
 const pending=refresh();await started.promise;await signout();
 const count=calls.filter(c=>c.url.includes('action=pro-list')).length;
 reply.resolve(Response.json({access_token:'stale',refresh_token:'stale-refresh',expires_in:3600}));await pending;await refresh();
 assert.equal(document.querySelector('#workspace').hidden,true);assert.equal(calls.filter(c=>c.url.includes('action=pro-list')).length,count);
}));
for(const failed of [false,true])test('late contractor refresh '+(failed?'failure':'success')+' cannot replace a new sign-in',()=>screen(async({document,signin,refresh,signout,calls,reply,started})=>{
 const pending=refresh();await started.promise;await signout();await signin();
 reply.resolve(failed?Response.json({error:'Expired'},{status:401}):Response.json({access_token:'stale',refresh_token:'stale-refresh',expires_in:3600}));await pending;await refresh();
 assert.equal(document.querySelector('#workspace').hidden,false);
 const reads=calls.filter(c=>c.url.includes('action=pro-list'));assert.equal(reads.at(-1).token,'Bearer login-2');assert.ok(reads.every(c=>c.token!=='Bearer stale'));
}));
