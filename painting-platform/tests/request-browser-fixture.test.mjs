import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
let directory,source;
const base='https://ocmgrgvzhuhyigaddhue.supabase.co',api=base+'/functions/v1/platform-api';
before(async()=>{directory=await mkdtemp('/workspace/buzzie-request-fixture-test-');execFileSync(process.execPath,[new URL('./request-browser-preview.mjs',import.meta.url).pathname,directory]);source=await readFile(directory+'/dist/qa-network.js','utf8')});
after(async()=>{if(directory)await rm(directory,{recursive:true,force:true})});
function fixture(scenario){const context={window:{},crypto,sessionStorage:{removeItem(){}},Response,URL,URLSearchParams,location:new URL('http://terminal.local:4173/request.html?scenario='+scenario)};vm.runInNewContext(source,context);return context.window}
test('request fixture responds synthetically to declared provider, create and upload operations',async()=>{
 const f=fixture('success');assert.equal((await (await f.fetch(api+'?action=providers')).json()).providers[0].slug,'r-painters-llc');
 const response=await f.fetch(api+'?action=create',{method:'POST',body:'private-data-not-to-log'});assert.equal(response.status,201);assert.equal((await response.json()).project_id,'11111111-1111-4111-8111-111111111111');
 assert.equal((await f.fetch(api+'?action=upload',{method:'POST'})).status,201);assert.equal(JSON.stringify(f.buzzieQa.calls).includes('private-data-not-to-log'),false);
});
test('request fixture isolates partial-photo and retry scenarios with fresh counters',async()=>{
 const partial=fixture('partial');assert.equal((await partial.fetch(api+'?action=upload',{method:'POST'})).status,201);assert.equal((await partial.fetch(api+'?action=upload',{method:'POST'})).status,502);
 const retry=fixture('create-retry');assert.equal((await retry.fetch(api+'?action=create',{method:'POST'})).status,503);assert.equal((await retry.fetch(api+'?action=create',{method:'POST'})).status,201);
 assert.equal((await fixture('partial').fetch(api+'?action=upload',{method:'POST'})).status,201);
});
test('request fixture blocks Auth, Storage, messaging and every undeclared network transport',async()=>{
 const f=fixture('success');for(const action of ['message','visit-request','claim-project','lookup','pro-availability'])await assert.rejects(f.fetch(api+'?action='+action,{method:'POST'}),/blocked/);
 for(const [url,method] of [[base+'/auth/v1/user','GET'],[base+'/storage/v1/object/photos','POST'],[api+'?action=providers','POST'],[api+'?action=create','GET'],['https://example.invalid/functions/v1/platform-api?action=create','POST']])await assert.rejects(f.fetch(url,{method}),/blocked/);
 for(const transport of ['XMLHttpRequest','WebSocket','EventSource'])assert.throws(()=>new f[transport](),/blocked/);
});
test('request fixture preserves production modules and applies CSP before the network stub',async()=>{
 for(const file of ['request.html','project.html','account.html']){const html=await readFile(directory+'/dist/'+file,'utf8');assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.ok(html.indexOf('connect-src')<html.indexOf('qa-network.js'))}
 for(const file of ['request.js','common.js','auth-session.js'])assert.equal(await readFile(directory+'/dist/'+file,'utf8'),await readFile(new URL('../web/'+file,import.meta.url),'utf8'));
 const html=await readFile(directory+'/dist/request.html','utf8');assert.match(html,/new DataTransfer/);assert.match(html,/new File/);assert.match(html,/QA: select two synthetic photos/);
});
test('request fixture supplies UUID compatibility on the plain-HTTP preview origin',()=>{
 const context={window:{},crypto:{getRandomValues:crypto.getRandomValues.bind(crypto)},sessionStorage:{removeItem(){}},Response,URL,URLSearchParams,location:new URL('http://terminal.local:4173/request.html')};
 vm.runInNewContext(source,context);assert.match(context.crypto.randomUUID(),/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
