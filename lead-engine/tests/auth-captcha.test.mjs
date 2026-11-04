import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(new URL('../discovery/package.json',import.meta.url));const {parseHTML}=require('linkedom');
let count=0;
async function fixture(run,{proof='synthetic-proof',authReply,delayed=false}={}){
 const {document}=parseHTML(await readFile(new URL('../web/admin.html',import.meta.url),'utf8'));
 const old=Object.fromEntries(['document','window','fetch','FormData','Option'].map(k=>[k,globalThis[k]]));let renderOptions,resets=0,finish;
 const calls=[];globalThis.document=document;
 globalThis.window={turnstile:{render(_el,opts){renderOptions=opts;if(proof)opts.callback(proof);return 7},reset(id){assert.equal(id,7);resets++}}};
 globalThis.Option=function(text,value){const e=document.createElement('option');e.textContent=text;e.value=value;return e};
 globalThis.FormData=class{constructor(form){this.rows=[...form.querySelectorAll('input[name]')].map(e=>[e.name,e.value])}*[Symbol.iterator](){yield* this.rows}};
 for(const form of document.querySelectorAll('form'))form.reset=()=>{};
 Object.defineProperty(document.querySelector('#kind'),'value',{value:'leads',writable:true});
 globalThis.fetch=async(url,opts)=>{calls.push({url,opts});if(url.includes('/auth/v1/token')){if(delayed)return new Promise(r=>{finish=r});return authReply?authReply():Response.json({access_token:'synthetic-session'})}return Response.json({records:[]})};
 try{await import('../web/admin.js?captcha='+count++);const form=document.querySelector('#signin');await run({document,calls,submit:()=>form.onsubmit({preventDefault(){},target:form}),get options(){return renderOptions},get resets(){return resets},finish:response=>finish(response)})}finally{for(const[k,v]of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v}}
}
test('missing proof blocks sign-in before Auth',()=>fixture(async f=>{await f.submit();assert.equal(f.calls.length,0);assert.match(f.document.querySelector('#message').textContent,/Complete the security check/);assert.equal(f.resets,1)},{proof:''}));
test('proof travels in native Auth field and never admin API headers',()=>fixture(async f=>{await f.submit();const login=f.calls.find(c=>c.url.includes('/auth/v1/token'));assert.deepEqual(JSON.parse(login.opts.body).gotrue_meta_security,{captcha_token:'synthetic-proof'});assert.ok(f.calls.filter(c=>!c.url.includes('/auth/')).every(c=>!JSON.stringify(c.opts).includes('synthetic-proof')));assert.equal(f.document.querySelector('#login').hidden,true);assert.equal(f.resets,1)}));
test('expired proof blocks dispatch',()=>fixture(async f=>{f.options['expired-callback']();await f.submit();assert.equal(f.calls.length,0)}));
test('widget error blocks dispatch',()=>fixture(async f=>{f.options['error-callback']();await f.submit();assert.equal(f.calls.length,0)}));
test('concurrent submit sends one login',()=>fixture(async f=>{const pending=f.submit();await Promise.resolve();await f.submit();assert.equal(f.calls.length,1);f.finish(Response.json({access_token:'synthetic-session'}));await pending;assert.equal(f.resets,1)},{delayed:true}));
test('captcha rejection resets proof and explains recovery',()=>fixture(async f=>{await f.submit();assert.match(f.document.querySelector('#message').textContent,/Complete the security check again/);assert.equal(f.document.querySelector('#login').hidden,false);assert.equal(f.resets,1);await f.submit();assert.equal(f.calls.length,1)},{authReply:()=>Response.json({error_code:'captcha_failed'},{status:400})}));
test('malformed Auth success cannot open workspace',()=>fixture(async f=>{await f.submit();assert.equal(f.document.querySelector('#login').hidden,false);assert.match(f.document.querySelector('#message').textContent,/could not be confirmed/);assert.equal(f.calls.length,1)},{authReply:()=>Response.json({})}));
