import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(new URL('../discovery/package.json',import.meta.url));const {parseHTML}=require('linkedom');
test('dashboard wires sign-in, discovery view, source setup, scan and sign-out with mocked services',async()=>{
 const html=await readFile(new URL('../web/admin.html',import.meta.url),'utf8');const {document}=parseHTML(html);
 const originals={document:globalThis.document,fetch:globalThis.fetch,FormData:globalThis.FormData,Option:globalThis.Option};
 globalThis.document=document;
 globalThis.Option=function(text,value){const el=document.createElement('option');el.textContent=text;el.value=value;return el};
 globalThis.FormData=class{constructor(form){this.entries=[...form.querySelectorAll('input[name]')].map(el=>[el.name,el.value])}*[Symbol.iterator](){yield* this.entries}};
 let connected=false;const calls=[];
 // LinkeDOM does not implement form reset, unlike a browser.
 for(const form of document.querySelectorAll('form'))form.reset=()=>{};
 const select=document.querySelector('#kind');Object.defineProperty(select,'value',{value:'opportunities',writable:true});
 globalThis.fetch=async(url,options)=>{calls.push({url,options});
  if(url.includes('/auth/v1/token'))return Response.json({access_token:'test-owner-session'});
  if(url.includes('connect-discovery-feed')){connected=true;return Response.json({ok:true})}
  if(url.includes('discovery-status'))return Response.json({sources:[{source_id:'charleston-open-bids',source_name:'Charleston bids',status:'ok',checked_at:new Date().toISOString(),items_seen:8,matches:0}],configured_sources:connected?[{id:'homeowner-feed-test',name:'Local painter requests',kind:'homeowner_request',enabled:true}]:[]});
  if(url.includes('run-discovery'))return Response.json({ok:true,new_saved:0,sources:[{status:'ok'}]});
  if(url.includes('/auth/v1/logout'))return Response.json({});
  return Response.json({records:[]});
 };
 try{
  await import('../web/admin.js?dashboard-test');
  const signin=document.querySelector('#signin');await signin.onsubmit({preventDefault(){},target:signin});
  assert.equal(document.querySelector('#login').hidden,true);assert.equal(document.querySelector('#opportunity-tools').hidden,false);
  assert.match(document.querySelector('#discovery-status').textContent,/Homeowner request feeds are not connected/);
  const feed=document.querySelector('#connect-feed');await feed.onsubmit({preventDefault(){},target:feed});
  assert.match(document.querySelector('#discovery-status').textContent,/Local painter requests/);
  await document.querySelector('#run-discovery').onclick();assert.match(document.querySelector('#message').textContent,/0 new candidates/);
  await document.querySelector('#logout').onclick();assert.equal(document.querySelector('#opportunity-tools').hidden,true);
  assert.ok(calls.some(c=>c.options?.headers?.authorization==='Bearer test-owner-session'));
 }finally{for(const [name,value]of Object.entries(originals)){if(value===undefined)delete globalThis[name];else globalThis[name]=value}}
});
