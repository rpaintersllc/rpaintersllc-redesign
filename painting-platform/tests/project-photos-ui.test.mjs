import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {clearSession,saveSession} from '../web/auth-session.js';
const id='11111111-1111-4111-8111-111111111111',key='a'.repeat(64);
const file=()=>({type:'image/jpeg',size:20});
const photo=n=>({id:String(n),url:'https://images.invalid/'+n+'.jpg'});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,{handle=()=>{},photos=[],account=false}={}){
 const old=Object.fromEntries(['document','location','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/project.html',import.meta.url),'utf8'));globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/project.html'+(account?'?project='+id:'#project='+id+'&key='+key));
 const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};clearSession();if(account)saveSession({access_token:'mock-session',refresh_token:'mock-refresh',expires_in:3600});
 const model={photos:[...photos]},calls=[];
 globalThis.fetch=async(url,options={})=>{
  const action=new URL(url).searchParams.get('action');calls.push({action,options});const custom=await handle(action,model,options);if(custom)return custom;
  if(action==='conversation')return Response.json({messages:[],visits:[]});
  if(action==='lookup')return Response.json({project:{lead:{service:'Interior painting',status:'new',city:'Summerville',zip:'29483',details:'Test project',full_name:'Homeowner',email:'test@example.invalid',phone:'2025550190'},business:{phone:'2025550100',website:'https://contractor.invalid'},property_type:'Home',timing:'Within a month',events:[],photos:model.photos}});
  return Response.json({ok:true});
 };
 try{await import('../web/project.js?test='+crypto.randomUUID());const form=document.querySelector('#photo-form'),input=document.querySelector('#photo-input');input.files=[];await run({document,input,form,calls,model,submit:()=>form.onsubmit({preventDefault(){},target:form})})}finally{clearSession();Object.assign(globalThis,old)}
}
test('partial uploads continue, refresh the gallery and clear the full selection',()=>{
 let uploads=0;
 return screen(async({document,input,calls,submit})=>{
  input.files=[file(),file(),file()];await submit();assert.equal(uploads,3);assert.equal(document.querySelectorAll('#photos img').length,2);assert.equal(input.value,'');assert.equal(input.disabled,false);assert.match(document.querySelector('#photo-message').textContent,/2 photo\(s\) confirmed.*1 could not be confirmed/);assert.equal(calls.filter(c=>c.action==='lookup').length,2);
  input.files=[];await submit();assert.equal(uploads,3);assert.match(document.querySelector('#photo-message').textContent,/Choose at least one/);
 },{handle:(action,model)=>{if(action==='upload'){uploads++;if(uploads===2)return Response.json({error:'Failed'},{status:502});model.photos.push(photo(uploads))}}});
});
test('a photo saved despite a lost response is visible before a manual retry',()=>screen(async({document,input,submit})=>{
 input.files=[file()];await submit();assert.equal(document.querySelectorAll('#photos img').length,1);assert.match(document.querySelector('#photo-message').textContent,/0 photo\(s\) confirmed.*1 could not be confirmed.*only missing ones/);
},{handle:(action,model)=>{if(action==='upload'){model.photos.push(photo(1));throw Error('Connection lost')}}}));
test('a failed gallery refresh preserves project access but blocks further uploads',()=>{
 let lookups=0,fail=true;
 return screen(async({document,input,form,calls,submit})=>{
  input.files=[file()];await submit();assert.equal(document.querySelector('#project-content').hidden,false);assert.equal(document.querySelector('#missing').hidden,true);assert.equal(form.hidden,true);assert.match(document.querySelector('#private-link').textContent,new RegExp(key));assert.match(document.querySelector('#photo-message').textContent,/gallery could not refresh/);
  input.files=[file()];await submit();assert.equal(calls.filter(c=>c.action==='upload').length,1);fail=false;await document.querySelector('#refresh').onclick();assert.equal(form.hidden,false);await submit();assert.equal(calls.filter(c=>c.action==='upload').length,2);
 },{handle:action=>{if(action==='lookup'&&++lookups>1&&fail)throw Error('Network unavailable')}});
});
test('an authorization failure never presents stale project data as current access',()=>{
 let lookups=0;
 return screen(async({document,input,submit})=>{input.files=[file()];await submit();assert.equal(document.querySelector('#project-content').hidden,true);assert.equal(document.querySelector('#missing').hidden,false)},{handle:action=>action==='lookup'&&++lookups>1?Response.json({error:'Project not found'},{status:404}):undefined});
});
test('duplicate upload clicks cannot replay a batch while it is running',async()=>{
 const reply=deferred(),started=deferred();
 await screen(async({document,input,calls,submit})=>{input.files=[file()];const first=submit();await started.promise;assert.equal(input.disabled,true);assert.equal(document.querySelector('#photo-form button').disabled,true);await submit();assert.equal(calls.filter(c=>c.action==='upload').length,1);reply.resolve(Response.json({ok:true}));await first;assert.equal(input.disabled,false)},{handle:action=>{if(action==='upload'){started.resolve();return reply.promise}}});
});
test('invalid selections and the five-photo limit reject before any upload',()=>screen(async({input,calls,submit,document})=>{
 input.files=[{type:'image/jpeg',size:5242881}];await submit();assert.match(document.querySelector('#photo-message').textContent,/5 MB/);input.files=[file(),file()];await submit();assert.match(document.querySelector('#photo-message').textContent,/total of five/);assert.equal(calls.filter(c=>c.action==='upload').length,0);
},{photos:[photo(1),photo(2),photo(3),photo(4)]}));
test('account-owned uploads retain bearer access without a guest private key',()=>screen(async({input,calls,submit})=>{
 input.files=[file()];await submit();const upload=calls.find(c=>c.action==='upload');assert.equal(upload.options.headers.authorization,'Bearer mock-session');assert.equal(upload.options.headers['x-project-token'],undefined);assert.equal(upload.options.headers['x-project-id'],id);
},{account:true}));

for(const stale of ['success','denied','server error'])test('latest project refresh wins over stale '+stale,async()=>{
 const reply=deferred(),started=deferred();let lookups=0;
 await screen(async({document})=>{
  const first=document.querySelector('#refresh').onclick();await started.promise;
  await document.querySelector('#refresh').onclick();
  if(stale==='success')reply.resolve(Response.json({project:{lead:{service:'Old project state',status:'new'},business:{phone:'2025550100',website:'https://contractor.invalid'},events:[],photos:[]}}));
  else reply.resolve(Response.json({error:'Old refresh failure'},{status:stale==='denied'?403:502}));
  await first;
  assert.equal(document.querySelector('#project-content').hidden,false);
  assert.equal(document.querySelector('#project-title').textContent,'Interior painting');
  assert.equal(document.querySelector('#photo-form').hidden,false);
  assert.match(document.querySelector('#message').textContent,/Your project is saved/);
 },{handle:action=>{if(action==='lookup'&&++lookups===2){started.resolve();return reply.promise}}});
});
test('a stale successful lookup cannot reopen the project after a newer access denial',async()=>{
 const reply=deferred(),started=deferred();let lookups=0;
 await screen(async({document})=>{
  const first=document.querySelector('#refresh').onclick();await started.promise;
  await document.querySelector('#refresh').onclick();
  reply.resolve(Response.json({project:{lead:{service:'Old project state',status:'new'},business:{phone:'2025550100',website:'https://contractor.invalid'},events:[],photos:[]}}));await first;
  assert.equal(document.querySelector('#project-content').hidden,true);
  assert.equal(document.querySelector('#photo-form').hidden,true);
  assert.match(document.querySelector('#message').textContent,/Access denied/);
 },{handle:action=>{if(action!=='lookup')return;if(++lookups===2){started.resolve();return reply.promise}if(lookups===3)return Response.json({error:'Access denied'},{status:403})}});
});
test('uploads wait for an in-flight project refresh to confirm the current gallery',async()=>{
 const reply=deferred(),started=deferred();let lookups=0;
 await screen(async({document,input,calls,submit})=>{
  const pending=document.querySelector('#refresh').onclick();await started.promise;
  input.files=[file()];await submit();assert.equal(calls.filter(c=>c.action==='upload').length,0);
  assert.match(document.querySelector('#photo-message').textContent,/Refresh the project/);
  reply.resolve(Response.json({error:'Try later'},{status:502}));await pending;
 },{handle:action=>{if(action==='lookup'&&++lookups===2){started.resolve();return reply.promise}}});
});
