import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountConversation} from '../web/conversation.js';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
const cases=[['confirmed','Confirm this visit',true],['declined','Unable to confirm',true],['cancelled','Cancel visit request',false]];
async function screen(run,{decision='cancelled',business=false,handle=()=>{}}={}){
 const previous={document:globalThis.document,fetch:globalThis.fetch};
 const {document,window}=parseHTML('<html><body><section id="target"></section></body></html>');globalThis.document=document;
 let active=document.body,reads=0;const focuses=[];Object.defineProperty(document,'activeElement',{get:()=>active.isConnected?active:document.body});
 const oldFocus=window.HTMLElement.prototype.focus;window.HTMLElement.prototype.focus=function(){active=this;focuses.push(this);this.dispatchEvent(new window.Event('focusin',{bubbles:true}))};
 globalThis.fetch=async(url,options)=>{const action=new URL(url).searchParams.get('action');if(action==='conversation')reads++;return await handle(action,reads)||Response.json(action==='conversation'?{messages:[],visits:[{id:'synthetic-visit',preferred_date:'2026-11-10',time_window:'Morning',status:reads>1?decision:'requested'}]}:{ok:true})};
 try{const target=document.querySelector('#target');await mountConversation(target,{project_id:'synthetic-project',...(business?{business_id:'synthetic-business'}:{access_token:'synthetic-key'})});
 const label=cases.find(row=>row[0]===decision)[1],button=[...target.querySelectorAll('.visits button')].find(button=>button.textContent===label);
 await run({target,button,other:target.querySelector('textarea'),active:()=>document.activeElement,blur:()=>{active=document.body},heading:()=>target.querySelector('.visits h3'),focuses,status:target.querySelector('[role="status"]')});
 }finally{window.HTMLElement.prototype.focus=oldFocus;Object.assign(globalThis,previous)}
}
for(const [decision,,business] of cases){
 test(decision+' visit decision moves keyboard focus to its current heading',()=>screen(async({button,active,heading})=>{button.focus();await button.onclick();assert.equal(active()===heading(),true);assert.equal(heading().getAttribute('tabindex'),'-1')},{decision,business}));
 test(decision+' visit decision restores focus after busy control blurs',()=>{const reply=deferred(),started=deferred();return screen(async({button,blur,active,heading})=>{button.focus();const pending=button.onclick();await started.promise;blur();reply.resolve(Response.json({ok:true}));await pending;assert.equal(active()===heading(),true)},{decision,business,handle:action=>{if(action==='visit-update'){started.resolve();return reply.promise}}})});
 test(decision+' visit decision respects a newer keyboard focus choice',()=>{const reply=deferred(),started=deferred();return screen(async({button,other,active,focuses,heading})=>{button.focus();const pending=button.onclick();await started.promise;other.focus();reply.resolve(Response.json({ok:true}));await pending;assert.equal(active()===other,true);assert.equal(focuses.includes(heading()),false)},{decision,business,handle:action=>{if(action==='visit-update'){started.resolve();return reply.promise}}})});
}
for(const failure of ['write','refresh','denied'])test('visit decision '+failure+' failure does not move focus to a success heading',()=>screen(async({button,focuses,heading})=>{button.focus();await button.onclick();assert.equal(focuses.includes(heading()),false)},{handle:(action,reads)=>{if(failure==='write'&&action==='visit-update')return Response.json({error:'Synthetic write failed'},{status:503});if(failure!=='write'&&action==='conversation'&&reads>1)return Response.json({error:'Synthetic refresh failed'},{status:failure==='denied'?403:503})}}));
for(const mode of ['detach','replace'])test('visit decision '+mode+' suppresses late focus effects',()=>{const reply=deferred(),started=deferred();return screen(async({target,button,focuses})=>{button.focus();const pending=button.onclick();await started.promise;if(mode==='detach')target.remove();else target.replaceChildren();const count=focuses.length;reply.resolve(Response.json({ok:true}));await pending;assert.equal(focuses.length,count)},{handle:action=>{if(action==='visit-update'){started.resolve();return reply.promise}}})});
test('a visit decision activated without focus does not steal it',()=>screen(async({button,other,active,focuses,heading})=>{other.focus();await button.onclick();assert.equal(active()===other,true);assert.equal(focuses.includes(heading()),false)}));
