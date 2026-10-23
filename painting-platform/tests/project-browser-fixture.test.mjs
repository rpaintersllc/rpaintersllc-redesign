import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
let directory,source;
const base='https://ocmgrgvzhuhyigaddhue.supabase.co',api=base+'/functions/v1/platform-api',id='11111111-1111-4111-8111-111111111111';
before(async()=>{directory=await mkdtemp('/workspace/buzzie-project-fixture-test-');execFileSync(process.execPath,[new URL('./project-browser-preview.mjs',import.meta.url).pathname,directory]);source=await readFile(directory+'/dist/qa-network.js','utf8')});
after(async()=>{if(directory)await rm(directory,{recursive:true,force:true})});
function fixture(scenario='account'){const store=new Map(),navigator={};const context={window:{},crypto,sessionStorage:{removeItem:k=>store.delete(k),setItem:(k,v)=>store.set(k,v)},Response,URL,URLSearchParams,Date,navigator,location:new URL('http://terminal.local:4173/project.html?scenario='+scenario)};vm.runInNewContext(source,context);return {f:context.window,store,navigator}}
function call(f,action,body={},headers={authorization:'Bearer synthetic-project-access'}){return f.fetch(api+'?action='+action,{method:'POST',headers,body:JSON.stringify({project_id:id,...body})})}
test('project fixture seeds only synthetic account storage and supports a separate capability mode',async()=>{
 const {f,store}=fixture();assert.equal(JSON.parse(store.get('buzzie.session')).access_token,'synthetic-project-access');assert.equal((await call(f,'lookup')).status,200);
 const cap=fixture('capability');assert.equal(cap.store.size,0);assert.equal((await call(cap.f,'lookup',{access_token:'a'.repeat(64)},{})).status,200);assert.equal((await call(cap.f,'lookup')).status,403);
});
test('project fixture message and visit replies mutate only isolated synthetic state without logging payloads',async()=>{
 const {f}=fixture();assert.equal((await call(f,'message',{message:'Synthetic draft not for call logs',request_key:'fixture-key'})).status,200);assert.equal((await call(f,'visit-request',{preferred_date:'2026-11-10',time_window:'Morning',request_key:'fixture-visit'})).status,200);const data=await (await call(f,'conversation')).json();assert.equal(data.messages.length,2);assert.equal(data.visits[0].status,'requested');assert.doesNotMatch(JSON.stringify(f.buzzieQa.calls),/Synthetic draft|fixture-key/);assert.equal((await (await call(fixture().f,'conversation')).json()).messages.length,1);
});
test('project fixture denial and foreign identity stop all private operations',async()=>{
 const {f}=fixture();for(const action of ['lookup','conversation','message','visit-request']){assert.equal((await call(f,action,{},{})).status,403);assert.equal((await call(f,action,{project_id:'foreign'})).status,403)}f.buzzieQa.denyNextLookup();for(const action of ['lookup','conversation','message','visit-request'])assert.equal((await call(f,action)).status,403);assert.equal((await call(fixture('denied').f,'lookup')).status,403);
});
test('project fixture blocks undeclared Auth, Storage, contractor and network operations',async()=>{
 const {f,navigator}=fixture();for(const action of ['create','upload','visit-update','claim-project','pro-list'])await assert.rejects(call(f,action),/blocked/);
 for(const url of [base+'/auth/v1/user',base+'/storage/v1/object/photos','https://example.invalid/functions/v1/platform-api?action=lookup'])await assert.rejects(f.fetch(url,{method:'POST'}),/blocked/);
 await assert.rejects(f.fetch(api+'?action=lookup'),/blocked/);for(const transport of ['XMLHttpRequest','WebSocket','EventSource'])assert.throws(()=>new f[transport](),/blocked/);assert.equal(navigator.sendBeacon(),false);
});
test('project fixture keeps production modules unchanged and applies CSP before stub on all pages',async()=>{
 for(const file of ['project.js','conversation.js','common.js','auth-session.js','theme.css'])assert.equal(await readFile(directory+'/dist/'+file,'utf8'),await readFile(new URL('../web/'+file,import.meta.url),'utf8'));
 for(const file of ['project.html','account.html','request.html','pro.html']){const html=await readFile(directory+'/dist/'+file,'utf8');assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.ok(html.indexOf('connect-src')<html.indexOf('qa-network.js'))}
});
