import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountConversation} from '../web/conversation.js';
test('conversation renders messages safely and sends replies through project access',async()=>{
 const previousDocument=globalThis.document,previousFetch=globalThis.fetch;
 const {document}=parseHTML('<html><body><section id="target"></section></body></html>');globalThis.document=document;
 const sent=[];globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);sent.push({url,body});return Response.json(url.includes('action=conversation')?{messages:[{author:'business',body:'<img src=x onerror=alert(1)>',created_at:'2026-10-17T14:00:00Z'}],visits:[{id:'visit',preferred_date:'2026-10-20',time_window:'Morning',status:'requested'}]}:{ok:true})};
 try{
  const target=document.querySelector('#target'),access={project_id:'project',access_token:'private-key'};await mountConversation(target,access);
  assert.equal(target.querySelectorAll('img').length,0);assert.match(target.textContent,/<img src=x/);assert.match(target.textContent,/Awaiting company confirmation/);assert.match(target.textContent,/Cancel visit request/);assert.doesNotMatch(target.textContent,/Confirm this visit/);
  const input=target.querySelector('textarea');input.value='Can we discuss the living room?';await input.closest('form').onsubmit({preventDefault(){}});
  const message=sent.find(row=>row.url.includes('action=message'));assert.equal(message.body.access_token,'private-key');assert.equal(message.body.message,'Can we discuss the living room?');assert.match(message.body.request_key,/^[0-9a-f-]{36}$/);assert.equal(input.value,'');
 }finally{globalThis.document=previousDocument;globalThis.fetch=previousFetch}
});

