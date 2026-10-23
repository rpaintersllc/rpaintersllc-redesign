import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/platform-api/index.ts',import.meta.url),'utf8');
const {makePlatformHandler,digest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin='https://r-painters-projects.jessicuriel27.chatgpt.site';
// Synthetic values only; challenge/notification dispatch remain disabled.
const env=k=>({SUPABASE_URL:'https://database.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only'}[k]);
const project={request_key:'11111111-1111-4111-8111-111111111111',access_token:'a'.repeat(64),full_name:'Synthetic homeowner',email:'test@example.invalid',phone:'2025550149',city:'Summerville',state:'SC',zip:'29483',service:'Interior painting',property_type:'Home',timing:'Just planning',details:'Paint living room walls',contact_consent:true,provider_slug:'r-painters-llc'};
const request=body=>new Request('https://api.invalid/?action=create',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
for(const [label,patch] of [['another provider',{provider_slug:'other-painter'}],['another state',{state:'NC'}],['missing consent',{contact_consent:false}],['malformed ZIP',{zip:'2948'}]]){
 test('intake rejects '+label+' before any network call',async()=>{
  let calls=0;
  const handler=makePlatformHandler(env,async()=>{calls++;throw Error('Unexpected network call')});
  assert.equal((await handler(request({...project,...patch}))).status,400);
  assert.equal(calls,0);
 });
}
test('intake sends normalized location and hashes but discards submitted assignment and account identity',async()=>{
 let calls=0;
 const handler=makePlatformHandler(env,async(url,options)=>{
  calls++;assert.equal(url,'https://database.invalid/rest/v1/rpc/platform_create_project');
  const {payload}=JSON.parse(options.body);
  assert.equal(payload.provider_slug,'r-painters-llc');
  assert.equal(payload.city,'Summerville');assert.equal(payload.state,'SC');assert.equal(payload.zip,'29483');
  assert.equal(payload.email,'test@example.invalid');assert.equal(payload.phone,'2025550149');
  assert.equal(payload.access_hash,await digest(project.access_token));
  assert.equal(payload.access_token,undefined);assert.equal(payload.business_id,undefined);
  assert.equal(payload.owner_user_id,undefined);assert.equal(payload.account_id,undefined);
  assert.equal(payload.contact_verified,undefined);assert.equal(payload.source,undefined);
  return Response.json({id:project.request_key,duplicate:false});
 });
 const response=await handler(request({...project,city:' Summerville ',email:' TEST@EXAMPLE.INVALID ',phone:'+1 (202) 555-0149',business_id:'foreign-business',owner_user_id:'foreign-owner',account_id:'foreign-account',contact_verified:true,source:'discovery'}));
 assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true,project_id:project.request_key,duplicate:false});
 assert.equal(calls,1);
});
for(const [error,status,message] of [
 ['outside_pilot_area',409,'No participating painting company is currently accepting requests for this location.'],
 ['rate_limited',429,null],['request_conflict',409,null]
]){
 test(error+' cannot trigger a fallback assignment or dispatch',async()=>{
  let calls=0;
  const handler=makePlatformHandler(env,async url=>{calls++;assert.equal(url,'https://database.invalid/rest/v1/rpc/platform_create_project');return Response.json({error})});
  const response=await handler(request(project));assert.equal(response.status,status);
  const body=await response.json();assert.equal(body.ok,undefined);assert.equal(body.project_id,undefined);
  if(message)assert.equal(body.error,message);
  assert.equal(calls,1);
 });
}
test('duplicate request returns the existing receipt without a second assignment call',async()=>{
 let calls=0;
 const handler=makePlatformHandler(env,async url=>{calls++;assert.match(url,/\/rpc\/platform_create_project$/);return Response.json({id:project.request_key,duplicate:true})});
 const response=await handler(request(project));assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{ok:true,project_id:project.request_key,duplicate:true});assert.equal(calls,1);
});
test('catalog queries only active companies accepting requests using public fields',async()=>{
 let calls=0;
 const handler=makePlatformHandler(env,async url=>{
  calls++;const parsed=new URL(url);assert.equal(parsed.pathname,'/rest/v1/platform_businesses');
  assert.equal(parsed.searchParams.get('active'),'eq.true');assert.equal(parsed.searchParams.get('accepting_requests'),'eq.true');
  assert.equal(parsed.searchParams.get('select'),'slug,name,website,phone,state,cities');
  return Response.json([{slug:'r-painters-llc',name:'R Painters'}]);
 });
 const response=await handler(new Request('https://api.invalid/?action=providers',{headers:{origin}}));
 assert.equal(response.status,200);assert.deepEqual((await response.json()).providers,[{slug:'r-painters-llc',name:'R Painters'}]);assert.equal(calls,1);
});
