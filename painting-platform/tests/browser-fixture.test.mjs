import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
let directory,fetchFixture;
before(async()=>{
 directory=await mkdtemp('/workspace/buzzie-fixture-test-');
 execFileSync(process.execPath,[new URL('./browser-preview.mjs',import.meta.url).pathname,directory]);
 const context={window:{},crypto,Response,URL,location:new URL('http://terminal.local:4173/project.html')};
 vm.runInNewContext(await readFile(directory+'/dist/qa-network.js','utf8'),context);fetchFixture=context.window.fetch;
});
after(async()=>{if(directory)await rm(directory,{recursive:true,force:true})});
const api='https://ocmgrgvzhuhyigaddhue.supabase.co/functions/v1/platform-api';
test('responsive fixtures return synthetic provider, project and conversation reads',async()=>{
 assert.equal((await (await fetchFixture(api+'?action=providers')).json()).providers.length,1);
 const project=await (await fetchFixture(api+'?action=lookup',{method:'POST'})).json();
 assert.match(project.project.lead.email,/@example\.invalid$/);
 assert.equal((await (await fetchFixture(api+'?action=conversation',{method:'POST'})).json()).messages.length,2);
});
test('responsive fixtures block every write action, Auth call and unexpected origin/path/method',async()=>{
 for(const action of ['create','upload','message','visit-request','visit-update','interest','claim-project'])await assert.rejects(fetchFixture(api+'?action='+action,{method:'POST'}),/blocked/);
 for(const [url,method] of [[api+'?action=lookup','GET'],[api+'?action=providers','POST'],['https://example.invalid/functions/v1/platform-api?action=lookup','POST'],['https://ocmgrgvzhuhyigaddhue.supabase.co/auth/v1/token','POST']])await assert.rejects(fetchFixture(url,{method}),/blocked/);
});
