// Raw production handler: no automatic session approval wrapper.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {jwt,sessionId} from './session-fixture.mjs';
const source=await readFile(new URL('../supabase/functions/platform-api/index.ts',import.meta.url),'utf8');
const {makePlatformHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const account='11111111-1111-4111-8111-111111111111',business='22222222-2222-4222-8222-222222222222',project='33333333-3333-4333-8333-333333333333';
const origin='https://r-painters-projects.jessicuriel27.chatgpt.site';
const env=k=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only'}[k]);
function request(action,token=jwt(account)){
 const get=['pro-list','home-projects','interest-list'].includes(action),upload=action==='upload';
 return new Request('https://api.invalid/?action='+action,{method:get?'GET':'POST',headers:{origin,authorization:'Bearer '+token,'content-type':upload?'image/jpeg':'application/json','x-project-id':project},...(!get?{body:upload?new Uint8Array([255,216,255,0]):JSON.stringify({project_id:project,business_id:action.startsWith('pro-')||action==='status'?business:undefined,access_token:action==='claim-project'?'a'.repeat(64):'',status:'quoted',qualification:'qualified',notes:'test',expected_revision:0,amount_cents:100,accepting_requests:true,expected_current:false})}:{})});
}
function fixture({active=true,auth=true,confirmed=true,sessionReply,authId=account}={}){
 const calls=[];const h=makePlatformHandler(env,async(url,options)=>{
  calls.push(url);
  if(url.endsWith('/auth/v1/user'))return auth?Response.json({id:authId,...(confirmed?{email_confirmed_at:'2026-10-28'}:{})}):new Response('',{status:401});
  if(url.endsWith('/rpc/platform_active_session')){assert.deepEqual(JSON.parse(options.body),{account_id:authId,session:sessionId});return sessionReply?sessionReply():Response.json(active)}
  if(url.includes('platform_business_members'))return Response.json([{business_id:business,business:{id:business},role:'owner'}]);
  if(url.includes('platform_businesses?'))return Response.json([{id:business}]);
  if(url.endsWith('/rpc/platform_claim_project'))return Response.json(true);
  return Response.json([]);
 });return {h,calls};
}
for(const action of ['home-projects','lookup','upload','claim-project','conversation','message','visit-request','visit-update','pro-list','pro-review','pro-estimate','pro-availability','status','interest-list'])test('revoked session blocks '+action+' before private reads or writes',async()=>{
 const {h,calls}=fixture({active:false});assert.ok([401,403,404].includes((await h(request(action))).status));assert.equal(calls.length,2);assert.match(calls[1],/platform_active_session$/);
});
for(const token of ['malformed','e30.bad.signature','e30.'+Buffer.from('{}').toString('base64url')+'.x','e30.'+Buffer.from(JSON.stringify({sub:account,session_id:'bad'})).toString('base64url')+'.x'])test('malformed session claims denied: '+token.slice(0,18),async()=>{const {h,calls}=fixture();assert.equal((await h(request('home-projects',token))).status,401);assert.equal(calls.length,1)});
test('verified Auth identity must match token subject',async()=>{const {h,calls}=fixture({authId:business});assert.equal((await h(request('pro-list'))).status,403);assert.equal(calls.length,1)});
test('Auth rejection stops before session query',async()=>{const {h,calls}=fixture({auth:false});assert.equal((await h(request('home-projects'))).status,401);assert.equal(calls.length,1)});
for(const reply of [()=>new Response('',{status:503}),()=>{throw Error('offline')},()=>Response.json('true')])test('failed or non-boolean session query cannot authorize',async()=>{const {h,calls}=fixture({sessionReply:reply});assert.notEqual((await h(request('pro-list'))).status,200);assert.equal(calls.length,2)});
test('active homeowner and contractor sessions reach their scoped lists',async()=>{for(const action of ['home-projects','pro-list']){const {h,calls}=fixture();assert.equal((await h(request(action))).status,200);assert.equal(calls.filter(c=>c.endsWith('/rpc/platform_active_session')).length,1)}});
test('active session does not waive homeowner email confirmation',async()=>{const {h}=fixture({confirmed:false});assert.equal((await h(request('home-projects'))).status,401)});
test('contractor membership remains available under its existing email policy',async()=>{const {h}=fixture({confirmed:false});assert.equal((await h(request('pro-list'))).status,200)});
test('session result is rechecked on the next request',async()=>{let active=true;const {h,calls}=fixture({sessionReply:()=>Response.json(active)});assert.equal((await h(request('home-projects'))).status,200);active=false;assert.equal((await h(request('home-projects'))).status,401);assert.equal(calls.filter(c=>c.endsWith('/rpc/platform_active_session')).length,2)});
