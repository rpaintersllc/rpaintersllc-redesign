import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {createIntakeCheck} from '../web/intake-check.js';
const source=await readFile(new URL('../supabase/functions/platform-api/index.ts',import.meta.url),'utf8');
const {makePlatformHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin='https://r-painters-projects.jessicuriel27.chatgpt.site',hostname=new URL(origin).hostname;
const env=overrides=>k=>({SUPABASE_URL:'https://database.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only',PLATFORM_REQUIRE_CHALLENGE:'true',TURNSTILE_SITE_KEY:'public-widget',TURNSTILE_SECRET_KEY:'mock-secret',...overrides}[k]);
const interest={business_name:'Example Painter',email:'test@example.invalid',state:'SC',city:'Summerville',consent:true};
const project={request_key:'11111111-1111-4111-8111-111111111111',access_token:'a'.repeat(64),full_name:'Test homeowner',email:'test@example.invalid',phone:'2025550190',city:'Summerville',state:'SC',zip:'29483',service:'Interior painting',property_type:'Home',timing:'Within a month',details:'Paint living room walls',contact_consent:true,provider_slug:'r-painters-llc'};
const req=(action,body)=>new Request('https://api.invalid/?action='+action,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
for(const [action,body,expected] of [['create',project,'project_request'],['provider-interest',interest,'provider_interest']]){
 test(action+' requires a server-verified token before writing',async()=>{
  let writes=0,verifications=0;const h=makePlatformHandler(env(),async(url,options)=>{if(url.includes('siteverify')){verifications++;assert.deepEqual(JSON.parse(options.body),{secret:'mock-secret',response:'mock-token'});return Response.json({success:true,hostname,action:expected})}writes++;assert.doesNotMatch(options.body,/challenge_token|mock-token|mock-secret/);return Response.json({id:project.request_key})});
  assert.equal((await h(req(action,body))).status,400);assert.equal(writes,0);assert.equal((await h(req(action,{...body,challenge_token:'mock-token'}))).status,201);assert.equal(verifications,1);assert.equal(writes,1);
 });
}
test('invalid, wrong-host, wrong-action and replayed challenges cannot reach storage',async()=>{
 for(const result of [{success:false,'error-codes':['timeout-or-duplicate']},{success:true,hostname:'attacker.invalid',action:'project_request'},{success:true,hostname,action:'provider_interest'},{}]){
  let writes=0;const h=makePlatformHandler(env(),async url=>{if(url.includes('siteverify'))return Response.json(result);writes++;return Response.json({})});assert.equal((await h(req('create',{...project,challenge_token:'token'}))).status,403);assert.equal(writes,0);
 }
});
test('verification outages and missing configuration fail closed',async()=>{
 for(const mode of ['missing-secret','missing-site-key','network','http','json']){let writes=0;const h=makePlatformHandler(env(mode==='missing-secret'?{TURNSTILE_SECRET_KEY:''}:mode==='missing-site-key'?{TURNSTILE_SITE_KEY:''}:{}),async url=>{if(!url.includes('siteverify')){writes++;return Response.json({})}if(mode==='http')return new Response('',{status:503});if(mode==='json')return new Response('not-json');throw Error('Unavailable')});assert.equal((await h(req('create',{...project,challenge_token:'token'}))).status,503);assert.equal(writes,0)}
});
test('oversized or non-string tokens are rejected without a verification call',async()=>{
 for(const token of ['x'.repeat(2049),{},'   ']){let calls=0;const h=makePlatformHandler(env(),async()=>{calls++;return Response.json({})});assert.equal((await h(req('create',{...project,challenge_token:token}))).status,400);assert.equal(calls,0)}
});
test('provider discovery exposes only public challenge configuration',async()=>{
 const h=makePlatformHandler(env(),async()=>Response.json([]));const data=await (await h(req('providers'))).json();assert.deepEqual(data.intake_challenge,{required:true,available:true,site_key:'public-widget'});assert.doesNotMatch(JSON.stringify(data),/mock-secret|server-only/);
});
test('the private-pilot default does not call the external verifier',async()=>{
 let calls=0;const h=makePlatformHandler(env({PLATFORM_REQUIRE_CHALLENGE:undefined}),async url=>{calls++;assert.ok(!url.includes('cloudflare'));return Response.json({id:project.request_key})});assert.equal((await h(req('create',project))).status,201);assert.equal(calls,1);
});
test('a consumed challenge fails on replay, while a fresh challenge can retry the same project key',async()=>{
 const used=new Set(),keys=[];const h=makePlatformHandler(env(),async(url,options)=>{const body=JSON.parse(options.body);if(url.includes('siteverify')){if(used.has(body.response))return Response.json({success:false});used.add(body.response);return Response.json({success:true,hostname,action:'project_request'})}keys.push(body.payload.request_key);return Response.json({id:project.request_key,duplicate:keys.length>1})});assert.equal((await h(req('create',{...project,challenge_token:'first'}))).status,201);assert.equal((await h(req('create',{...project,challenge_token:'first'}))).status,403);assert.equal((await h(req('create',{...project,challenge_token:'fresh'}))).status,200);assert.deepEqual(keys,[project.request_key,project.request_key]);
});
test('disabled client verification never loads a third-party script',async()=>{
 const check=await createIntakeCheck(undefined,null,'project_request');assert.equal(check.token(),'');check.reset();
});
test('required client verification blocks when configuration is incomplete',async()=>{
 await assert.rejects(createIntakeCheck({required:true,available:false},null,'project_request'),/temporarily unavailable/);
});
test('widget tokens clear on expiry, error and deliberate retry',async()=>{
 const old={window:globalThis.window,document:globalThis.document};const {document}=parseHTML('<html><body><div id="check"></div></body></html>');globalThis.document=document;let options,resets=0;globalThis.window={turnstile:{render:(target,config)=>{options=config;return 'widget'},reset:id=>{assert.equal(id,'widget');resets++}}};
 try{const check=await createIntakeCheck({required:true,available:true,site_key:'public-widget'},document.querySelector('#check'),'project_request');assert.equal(options.action,'project_request');assert.equal(options['response-field'],false);assert.throws(()=>check.token(),/Complete/);options.callback('token');assert.equal(check.token(),'token');options['expired-callback']();assert.throws(()=>check.token());options.callback('token-two');options['error-callback']();assert.throws(()=>check.token());options.callback('token-three');check.reset();assert.equal(resets,1);assert.throws(()=>check.token());assert.equal(document.querySelectorAll('script').length,0)}finally{Object.assign(globalThis,old)}
});
