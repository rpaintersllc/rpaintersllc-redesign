// Synthetic API access matrix: never connects to Supabase or real storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/platform-api/index.ts',import.meta.url),'utf8');
const {makePlatformHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const ownerA=id(1),ownerB=id(2),businessA=id(3),businessB=id(4),projectA=id(5),projectB=id(6),memberA=id(7),photo=id(8),requestKey=id(9);
const origin='https://r-painters-projects.jessicuriel27.chatgpt.site',base='https://fixture.invalid';
const env=k=>({SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'synthetic-server-key'}[k]);
const records=[{id:projectA,owner_user_id:ownerA,business_id:businessA,access_hash:'a'.repeat(64)},{id:projectB,owner_user_id:ownerB,business_id:businessB,access_hash:'b'.repeat(64)}];
function fixture(){
 const calls=[];
 const fetcher=async(raw,options={})=>{
  const url=new URL(raw);assert.equal(url.origin,base);calls.push({path:url.pathname,params:url.searchParams,method:options.method||'GET'});
  if(url.pathname==='/auth/v1/user'){
   const token=options.headers.authorization?.slice(7),id=token==='member-A'?memberA:token==='owner-A'?ownerA:ownerB;
   return Response.json({id,email:'synthetic@example.invalid',...(token==='unconfirmed'?{}:{email_confirmed_at:'2026-10-22'})});
  }
  if(url.pathname==='/rest/v1/platform_business_members'){
   assert.equal(url.searchParams.get('user_id'),'eq.'+memberA);
   return Response.json([{business_id:businessA,role:'owner',business:{id:businessA,name:'Synthetic company A'}}]);
  }
  if(url.pathname==='/rest/v1/platform_projects'){
   let rows=records.filter(row=>['id','owner_user_id','business_id','access_hash'].every(key=>!url.searchParams.has(key)||url.searchParams.get(key)==='eq.'+row[key]));
   const select=url.searchParams.get('select');
   rows=rows.map(row=>select==='id'?{id:row.id}:select==='id,access_hash'?{id:row.id,access_hash:row.access_hash}:{id:row.id,lead:{full_name:'SYNTHETIC PRIVATE CONTACT',email:'private@example.invalid'},photos:[{id:photo,storage_path:'synthetic/photo.jpg',status:'ready'}]});
   return Response.json(rows);
  }
  if(url.pathname.startsWith('/storage/v1/object/sign/'))return Response.json({signedURL:'/object/sign/synthetic-only'});
  if(url.pathname==='/rest/v1/rpc/platform_reserve_photo')return Response.json({id:photo,path:'synthetic/photo.jpg'});
  if(url.pathname==='/storage/v1/object/platform-project-photos/synthetic/photo.jpg')return Response.json({});
  if(url.pathname==='/rest/v1/platform_photos'&&options.method==='PATCH')return Response.json([]);
  if(url.pathname==='/rest/v1/platform_project_reviews')return Response.json([]);
  if(url.pathname==='/rest/v1/platform_businesses')return Response.json([{id:businessA}]);
  throw Error('Unexpected downstream operation: '+url.pathname);
 };
 return {handler:makePlatformHandler(env,fetcher),calls};
}
function request(action,{token='owner-B',project=projectA,business,upload=false}={}){
 const headers={origin,authorization:'Bearer '+token,'content-type':upload?'image/jpeg':'application/json'};
 if(upload){headers['x-project-id']=project;return new Request('https://api.invalid/?action=upload',{method:'POST',headers,body:new Uint8Array([255,216,255,0])})}
 const body={project_id:project,owner_user_id:ownerA,account_id:ownerA,actor:ownerA,...(business?{business_id:business}:{}),request_key:requestKey,message:'Synthetic message',preferred_date:'2026-11-02',time_window:'Morning',visit_id:id(10),decision:business?'confirmed':'cancelled',status:'quoted',qualification:'qualified',notes:'Synthetic private note',expected_revision:0,accepting_requests:false,expected_current:true};
 return new Request('https://api.invalid/?action='+action+(action==='pro-list'?'&business_id='+business:''),{method:action==='pro-list'?'GET':'POST',headers,...(action==='pro-list'?{}:{body:JSON.stringify(body)})});
}
const homeownerActions=['lookup','upload','conversation','message','visit-request','visit-update'];
for(const action of homeownerActions)test('foreign homeowner cannot '+action+' or reach downstream private operations',async()=>{
 const {handler,calls}=fixture();const response=await handler(request(action,{upload:action==='upload'}));
 assert.equal(response.status,404);assert.deepEqual(await response.json(),{error:'Project not found'});
 assert.equal(calls.length,2);assert.equal(calls[0].path,'/auth/v1/user');assert.equal(calls[1].params.get('owner_user_id'),'eq.'+ownerB);assert.equal(calls[1].params.get('id'),'eq.'+projectA);
 assert.equal(calls.some(c=>c.path.includes('/rpc/')||c.path.includes('/storage/')||/platform_(messages|visits|photos)$/.test(c.path)),false);
});
test('unconfirmed homeowner upload stops before database, reservation or storage',async()=>{
 const {handler,calls}=fixture();assert.equal((await handler(request('upload',{token:'unconfirmed',upload:true}))).status,404);assert.equal(calls.length,1);assert.equal(calls[0].path,'/auth/v1/user');
});
for(const action of ['pro-list','status','pro-review','pro-availability','conversation','message','visit-update'])test('membership cannot be replaced by a submitted foreign business for '+action,async()=>{
 const {handler,calls}=fixture();assert.equal((await handler(request(action,{token:'member-A',business:businessB}))).status,403);assert.equal(calls.length,2);assert.equal(calls[1].path,'/rest/v1/platform_business_members');
});
for(const action of ['conversation','message','visit-update'])test('approved member cannot use '+action+' on another company project',async()=>{
 const {handler,calls}=fixture();assert.equal((await handler(request(action,{token:'member-A',business:businessA,project:projectB}))).status,404);assert.equal(calls.length,3);assert.equal(calls[2].params.get('business_id'),'eq.'+businessA);assert.equal(calls[2].params.get('id'),'eq.'+projectB);
});
test('owning homeowner can read signed photos without receiving their storage path or access hash',async()=>{
 const {handler,calls}=fixture();const response=await handler(request('lookup',{token:'owner-A'}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.project.photos[0].url,base+'/storage/v1/object/sign/synthetic-only');assert.equal(data.project.photos[0].storage_path,undefined);assert.equal(data.project.access_hash,undefined);assert.equal(calls.filter(c=>c.path.includes('/storage/')).length,1);
});
test('owning homeowner can upload through the same scoped authorization fixture',async()=>{
 const {handler,calls}=fixture();assert.equal((await handler(request('upload',{token:'owner-A',upload:true}))).status,201);assert.equal(calls[1].params.get('owner_user_id'),'eq.'+ownerA);assert.equal(calls.filter(c=>c.path.includes('/rpc/platform_reserve_photo')).length,1);assert.equal(calls.filter(c=>c.path.includes('/storage/')).length,1);
});
test('approved member list is scoped before any photo URL is signed',async()=>{
 const {handler,calls}=fixture();const response=await handler(request('pro-list',{token:'member-A',business:businessA}));assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.projects.map(p=>p.id),[projectA]);assert.equal(calls.find(c=>c.path==='/rest/v1/platform_projects').params.get('business_id'),'eq.'+businessA);assert.equal(calls.filter(c=>c.path.includes('/storage/')).length,1);
});
