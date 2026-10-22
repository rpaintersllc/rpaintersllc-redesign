import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
let directory,source;
before(async()=>{directory=await mkdtemp('/workspace/buzzie-account-fixture-test-');execFileSync(process.execPath,[new URL('./account-browser-preview.mjs',import.meta.url).pathname,directory]);source=await readFile(directory+'/dist/qa-network.js','utf8')});
after(async()=>{if(directory)await rm(directory,{recursive:true,force:true})});
const base='https://ocmgrgvzhuhyigaddhue.supabase.co';
function fixture(scenario='signin'){
 const context={window:{},sessionStorage:{removeItem(){}},Response,URL,URLSearchParams,location:new URL('http://terminal.local:4173/account.html?scenario='+scenario)};
 vm.runInNewContext(source,context);return context.window;
}
test('account fixture handles only declared synthetic Auth/account operations',async()=>{
 const f=fixture();
 for(const [path,method] of [['/auth/v1/token?grant_type=password','POST'],['/auth/v1/token?grant_type=refresh_token','POST'],['/auth/v1/signup','POST'],['/auth/v1/recover','POST'],['/auth/v1/verify','POST'],['/auth/v1/user','GET'],['/auth/v1/user','PUT'],['/auth/v1/logout','POST'],['/functions/v1/platform-api?action=providers','GET'],['/functions/v1/platform-api?action=home-projects','GET'],['/functions/v1/platform-api?action=claim-project','POST']])assert.equal((await f.fetch(base+path,{method})).ok,true);
 assert.equal(f.buzzieQa.calls.length,11);assert.equal(JSON.stringify(f.buzzieQa.calls).includes('password='),false);
});
test('account fixture rejects other origins, methods, paths, writes and transports',async()=>{
 const f=fixture();
 for(const [path,method] of [['/functions/v1/platform-api?action=create','POST'],['/functions/v1/platform-api?action=message','POST'],['/auth/v1/user','DELETE'],['/auth/v1/token?grant_type=unknown','POST'],['/auth/v1/admin/users','GET']])await assert.rejects(f.fetch(base+path,{method}),/blocked/);
 await assert.rejects(f.fetch('https://example.invalid/auth/v1/user'),/blocked/);
 for(const transport of ['XMLHttpRequest','WebSocket','EventSource'])assert.throws(()=>new f[transport](),/blocked/);
});
test('account fixture failure modes and CSP isolate the real application modules',async()=>{
 assert.equal((await fixture('list-failure').fetch(base+'/functions/v1/platform-api?action=home-projects')).status,503);
 assert.equal((await fixture('auth-failure').fetch(base+'/auth/v1/token?grant_type=password',{method:'POST'})).status,400);
 const html=await readFile(directory+'/dist/account.html','utf8');assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.ok(html.indexOf('qa-network.js')<html.indexOf('src="account.js"'));
 assert.equal(await readFile(directory+'/dist/account.js','utf8'),await readFile(new URL('../web/account.js',import.meta.url),'utf8'));
});
