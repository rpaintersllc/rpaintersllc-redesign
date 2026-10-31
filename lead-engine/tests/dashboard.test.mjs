import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(new URL('../discovery/package.json',import.meta.url));const {parseHTML}=require('linkedom');
test('dashboard wires sign-in, discovery view, source setup, scan and sign-out with mocked services',async()=>{
 const html=await readFile(new URL('../web/admin.html',import.meta.url),'utf8');const {document}=parseHTML(html);
 const originals={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch,FormData:globalThis.FormData,Option:globalThis.Option};
 globalThis.document=document;
 globalThis.window={turnstile:{render(_target,options){options.callback("synthetic-proof");return 1},reset(){}}};
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
test('search and review filters keep source evidence attached to the matching card',async()=>{
 const html=await readFile(new URL('../web/admin.html',import.meta.url),'utf8');const {document}=parseHTML(html);
 const originals=Object.fromEntries(['document','window','fetch','FormData','Option'].map(k=>[k,globalThis[k]]));
 const data=[{id:'bid',title:'Paint city office',city:'Charleston',summary:'Commercial scope',opportunity_kind:'commercial_bid',review_status:'unreviewed',created_at:'2026-10-28T17:00:00Z',source_url:'https://example.invalid/bid',source_name:'Official bid',discovery_source_id:'bid-source',match_reasons:['BID EVIDENCE']},{id:'home',title:'Need painter for bedroom',city:'Summerville',summary:'Residential scope',opportunity_kind:'homeowner_request',review_status:'unreviewed',created_at:'2026-10-28T16:00:00Z',source_url:'https://example.invalid/home',source_name:'Request feed',discovery_source_id:'home-source',match_reasons:['HOME EVIDENCE'],suggested_response:'Review this draft'}];
 globalThis.document=document;globalThis.window={turnstile:{render(_t,o){o.callback('proof');return 1},reset(){}}};
 globalThis.Option=function(text,value){const e=document.createElement('option');e.textContent=text;e.value=value;return e};globalThis.FormData=class{*[Symbol.iterator](){}};
 for(const f of document.querySelectorAll('form'))f.reset=()=>{};
 for(const [id,value]of Object.entries({kind:'opportunities',filter:'','review-filter':'','opportunity-source':'','freshness-filter':'','record-order':'priority'}))Object.defineProperty(document.getElementById(id),'value',{value,writable:true});
 globalThis.fetch=async url=>Response.json(url.includes('/auth/')?{access_token:'synthetic-token'}:url.includes('discovery-status')?{sources:[],configured_sources:[]}:{records:data});
 try{
  await import('../web/admin.js?filter-evidence');const form=document.querySelector('#signin');await form.onsubmit({preventDefault(){},target:form});
  const cards=document.querySelectorAll('#records article');assert.equal(cards[0].querySelector('h2').textContent,'Need painter for bedroom');assert.match(cards[0].textContent,/HOME EVIDENCE/);assert.doesNotMatch(cards[0].textContent,/BID EVIDENCE/);
  const search=document.querySelector('#record-search');search.value='Charleston';search.oninput();assert.equal(document.querySelectorAll('#records article').length,1);assert.match(document.querySelector('#records').textContent,/BID EVIDENCE/);assert.doesNotMatch(document.querySelector('#records').textContent,/HOME EVIDENCE/);
  search.value='';search.oninput();document.querySelector('#review-filter').value='relevant';document.querySelector('#review-filter').onchange();assert.equal(document.querySelectorAll('#records article').length,0);assert.equal(document.querySelector('#record-count').textContent,'0 of 2 loaded records');
 }finally{for(const[k,v]of Object.entries(originals)){if(v===undefined)delete globalThis[k];else globalThis[k]=v}}
});
