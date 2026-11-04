import test from 'node:test';
import assert from 'node:assert/strict';
import {createContractorSession} from '../web/contractor-session.js';
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
const session=(access_token,expires_in=1)=>({access_token,refresh_token:access_token+'-refresh',expires_in});
test('contractor actions share a single refresh and the renewed token',async()=>{
 const reply=deferred();let calls=0;
 const auth=createContractorSession(body=>{assert.deepEqual(body,{refresh_token:'old-refresh'});calls++;return reply.promise});auth.save(session('old'));
 const pending=[auth.token(),auth.token(),auth.token()];assert.equal(calls,1);
 reply.resolve(session('renewed',3600));assert.deepEqual(await Promise.all(pending),['renewed','renewed','renewed']);assert.equal(await auth.token(),'renewed');
});
test('a late contractor refresh cannot restore a signed-out session',async()=>{
 const reply=deferred(),auth=createContractorSession(()=>reply.promise);auth.save(session('old'));
 const pending=auth.token();auth.clear();assert.equal(auth.peekToken(),'');
 reply.resolve(session('stale',3600));await assert.rejects(pending,/sign-in changed/);assert.equal(auth.hasSession(),false);await assert.rejects(auth.token(),/Sign in/);
});
for(const failed of [false,true])test('stale contractor refresh '+(failed?'failure':'success')+' preserves a newer login',async()=>{
 const reply=deferred();let expired=0;const auth=createContractorSession(()=>reply.promise,()=>expired++);auth.save(session('old'));const pending=auth.token();auth.clear();auth.save(session('new-login',3600));
 if(failed)reply.reject(Error('Expired'));else reply.resolve(session('stale',3600));
 await assert.rejects(pending,/sign-in changed/);assert.equal(await auth.token(),'new-login');assert.equal(expired,0);
});
test('a failed shared refresh expires the current workspace only once and permits sign-in again',async()=>{
 const reply=deferred();let expired=0;const auth=createContractorSession(()=>reply.promise,()=>expired++);auth.save(session('old'));const first=auth.token(),second=auth.token();reply.reject(Error('Expired'));
 const results=await Promise.allSettled([first,second]);assert.ok(results.every(r=>r.status==='rejected'&&/session expired/.test(r.reason.message)));assert.equal(expired,1);assert.equal(auth.hasSession(),false);
 auth.save(session('next',3600));assert.equal(await auth.token(),'next');
});
test('a signed-out contractor cannot start a token refresh',async()=>{
 let calls=0;const auth=createContractorSession(()=>{calls++});await assert.rejects(auth.token(),/Sign in/);assert.equal(calls,0);
});
