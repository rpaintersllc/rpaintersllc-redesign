import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/platform-api/index.ts',import.meta.url),'utf8');
const {makePlatformHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const base='https://db.invalid',origin='https://r-painters-projects.jessicuriel27.chatgpt.site';
const project='11111111-1111-4111-8111-111111111111',hash='b'.repeat(64);
const ids=['22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
const env=k=>({SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'synthetic-server-key'}[k]);
function fixture({uploadFails=false,uploadFailsOnce=false,uploadThrows=false,readyFails=false,failedPatchFails=false,failedPatchThrows=false,deleteFails=false,deleteThrows=false,slotLimit=false}={}){
 const calls=[],rows=new Map(),objects=new Set();let reservations=0,uploads=0;
 const fetcher=async(raw,options={})=>{
  const url=new URL(raw),method=options.method||'GET';
  const body=typeof options.body==='string'?JSON.parse(options.body):null;
  calls.push({path:url.pathname,params:url.searchParams,method,body,headers:options.headers});
  if(url.pathname==='/rest/v1/platform_projects')return Response.json([{id:project,access_hash:hash}]);
  if(url.pathname==='/rest/v1/rpc/platform_reserve_photo'){
   if(slotLimit)return Response.json({error:'photo_limit'});
   const id=ids[reservations++];assert.ok(id,'Unexpected extra reservation');
   const path=project+'/'+id+'.jpg';rows.set(id,'pending');return Response.json({id,path});
  }
  if(url.pathname==='/rest/v1/platform_photos'&&method==='PATCH'){
   const id=url.searchParams.get('id')?.slice(3);assert.ok(rows.has(id),'Mutation must target reserved metadata');
   if(body.status==='ready'&&readyFails)return Response.json({error:'synthetic ready failure'},{status:503});
   if(body.status==='failed'&&failedPatchThrows)throw Error('synthetic metadata connection loss');
   if(body.status==='failed'&&failedPatchFails)return Response.json({error:'synthetic failed-state failure'},{status:503});
   rows.set(id,body.status);return Response.json([{id,status:body.status}]);
  }
  if(url.pathname.startsWith('/storage/v1/object/platform-project-photos/')){
   const path=url.pathname.slice('/storage/v1/object/platform-project-photos/'.length);
   assert.ok([...rows.keys()].some(id=>path===project+'/'+id+'.jpg'),'Storage target must be this reserved photo');
   if(method==='POST'){
    uploads++;assert.equal(options.headers['x-upsert'],'false');objects.add(path);
    // A lost/rejected upload response can follow a partially stored object.
    if(uploadThrows)throw Error('synthetic upload response lost');
    if(uploadFails||(uploadFailsOnce&&uploads===1))return Response.json({error:'synthetic upload failure'},{status:503});
    return Response.json({});
   }
   if(method==='DELETE'){
    if(deleteThrows)throw Error('synthetic delete response lost');
    if(deleteFails)return Response.json({error:'synthetic delete failure'},{status:503});
    objects.delete(path);return Response.json({});
   }
  }
  throw Error('Unexpected synthetic operation: '+method+' '+url.pathname);
 };
 return {handler:makePlatformHandler(env,fetcher),calls,rows,objects};
}
function request(){return new Request('https://api.invalid/?action=upload',{method:'POST',headers:{origin,'x-project-id':project,'x-project-token':'a'.repeat(64),'content-type':'image/jpeg'},body:new Uint8Array([255,216,255,0])})}
function cleanup(calls){return calls.filter(c=>c.method==='DELETE')}
test('successful upload marks only its reservation ready without cleanup',async()=>{
 const f=fixture();const response=await f.handler(request());assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true,id:ids[0]});assert.equal(f.rows.get(ids[0]),'ready');assert.equal(f.objects.size,1);assert.equal(cleanup(f.calls).length,0);
});
for(const mode of ['uploadFails','uploadThrows','readyFails'])test(mode+' attempts failed-state and object cleanup without replaying upload',async()=>{
 const f=fixture({[mode]:true});const response=await f.handler(request());assert.equal(response.status,502);assert.equal(f.rows.get(ids[0]),'failed');assert.equal(f.objects.size,0);assert.equal(cleanup(f.calls).length,1);assert.equal(f.calls.filter(c=>c.method==='POST'&&c.path.includes('/storage/')).length,1);
});
for(const mode of ['failedPatchFails','failedPatchThrows'])test(mode+' cannot prevent exact reserved-object cleanup',async()=>{
 const f=fixture({uploadFails:true,[mode]:true});const response=await f.handler(request());assert.equal(response.status,502);assert.equal(f.rows.get(ids[0]),'pending');assert.equal(cleanup(f.calls).length,1);assert.equal(f.objects.size,0);assert.match((await response.json()).error,/could not be confirmed.*Refresh.*missing photos/i);
});
for(const mode of ['deleteFails','deleteThrows'])test(mode+' keeps uncertain failure feedback and never reports success',async()=>{
 const f=fixture({readyFails:true,failedPatchFails:true,[mode]:true});const response=await f.handler(request());assert.equal(response.status,502);assert.equal(cleanup(f.calls).length,1);assert.equal(f.objects.size,1);assert.match((await response.json()).error,/could not be confirmed.*Refresh.*missing photos/i);assert.equal(f.calls.filter(c=>c.method==='POST'&&c.path.includes('/storage/')).length,1);
});
test('full photo capacity stops before any Storage write or cleanup',async()=>{
 const f=fixture({slotLimit:true});assert.equal((await f.handler(request())).status,409);assert.equal(f.calls.some(c=>c.path.includes('/storage/')),false);assert.equal(f.rows.size,0);
});

test('deliberate retry reserves a new photo and never deletes the successful retry',async()=>{
 const f=fixture({uploadFailsOnce:true});assert.equal((await f.handler(request())).status,502);
 const response=await f.handler(request());assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true,id:ids[1]});
 assert.equal(f.rows.get(ids[0]),'failed');assert.equal(f.rows.get(ids[1]),'ready');assert.deepEqual([...f.objects],[project+'/'+ids[1]+'.jpg']);
 assert.equal(cleanup(f.calls).length,1);assert.ok(cleanup(f.calls)[0].path.endsWith('/'+ids[0]+'.jpg'));
 assert.equal(f.calls.filter(c=>c.path==='/rest/v1/rpc/platform_reserve_photo').length,2);
});
