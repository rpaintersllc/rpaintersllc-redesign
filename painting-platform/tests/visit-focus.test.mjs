import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountConversation} from '../web/conversation.js';
import {clearSession,saveSession,sessionToken} from '../web/auth-session.js';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function screen(run,{account=false,handle=()=>{},onChange=()=>{}}={}){
 const previous={document:globalThis.document,fetch:globalThis.fetch,sessionStorage:globalThis.sessionStorage};
 const {document,window}=parseHTML('<html><body><section id="target"></section></body></html>');globalThis.document=document;const stored=new Map();globalThis.sessionStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};clearSession();saveSession({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600});
 let active=document.body,reads=0;const focuses=[];Object.defineProperty(document,'activeElement',{get:()=>active.isConnected?active:document.body});const oldFocus=window.HTMLElement.prototype.focus;
 window.HTMLElement.prototype.focus=function(){active=this;focuses.push(this);this.dispatchEvent(new window.Event('focusin',{bubbles:true}))};
 globalThis.fetch=async(url,options)=>{const action=new URL(url).searchParams.get('action');if(action==='conversation')reads++;return await handle(action,reads)||Response.json(action==='conversation'?{messages:[],visits:reads>1?[{id:'synthetic-visit',preferred_date:'2026-11-10',time_window:'Afternoon',status:'requested'}]:[]}:{ok:true})};
 try{
  const target=document.querySelector('#target');await mountConversation(target,{project_id:'synthetic-project',...(account?{}:{access_token:'synthetic-key'})},sessionToken,onChange);
  const form=target.querySelector('.visit-request'),button=form.querySelector('button'),date=form.querySelector('input'),other=target.querySelector('textarea');date.value='2026-11-10';
  await run({document,target,form,button,date,other,focuses,blur:()=>{active=document.body},active:()=>document.activeElement,heading:()=>target.querySelector('.visits h3'),submit:()=>form.onsubmit({preventDefault(){}})});
 }finally{window.HTMLElement.prototype.focus=oldFocus;clearSession();Object.assign(globalThis,previous)}
}
for(const account of [false,true])test((account?'account':'capability')+' successful visit request focuses the current Site visit heading',()=>screen(async({button,submit,active,heading})=>{button.focus();await submit();assert.equal(active()===heading(),true);assert.equal(heading().getAttribute('tabindex'),'-1')},{account}));
test('submit blurred by its busy state still restores focus after a saved visit',()=>{
 const reply=deferred(),started=deferred();return screen(async({button,submit,active,heading,blur})=>{button.focus();const pending=submit();await started.promise;blur();reply.resolve(Response.json({ok:true}));await pending;assert.equal(active()===heading(),true)},{handle:action=>{if(action==='visit-request'){started.resolve();return reply.promise}}});
});
for(const blurLater of [false,true])test('a newer control'+(blurLater?' that later blurs':'')+' keeps ownership during the visit write',()=>{
 const reply=deferred(),started=deferred();return screen(async({button,other,submit,active,focuses,heading,blur})=>{button.focus();const pending=submit();await started.promise;other.focus();if(blurLater)blur();reply.resolve(Response.json({ok:true}));await pending;assert.equal(active()===(blurLater?other.ownerDocument.body:other),true);assert.equal(focuses.includes(heading()),false)},{handle:action=>{if(action==='visit-request'){started.resolve();return reply.promise}}});
});
test('Enter from the date field does not force heading focus',()=>screen(async({date,submit,active,focuses,heading})=>{date.focus();await submit();assert.equal(active()===date.ownerDocument.body,true);assert.equal(focuses.includes(heading()),false)}));
for(const failure of ['write','refresh','denied'])test(failure+' failure never focuses a success heading',()=>screen(async({button,submit,focuses,heading})=>{button.focus();await submit();assert.equal(focuses.includes(heading()),false)},{handle:(action,reads)=>{if(failure==='write'&&action==='visit-request')return Response.json({error:'Synthetic write failed'},{status:503});if(failure!=='write'&&action==='conversation'&&reads>1)return Response.json({error:'Synthetic read failed'},{status:failure==='denied'?403:503})}}));
for(const mode of ['detach','replace','session'])test(mode+' during visit save suppresses focus effects',()=>{
 const reply=deferred(),started=deferred();return screen(async({target,button,submit,focuses})=>{button.focus();const pending=submit();await started.promise;if(mode==='detach')target.remove();else if(mode==='replace')target.replaceChildren();else clearSession();const count=focuses.length;reply.resolve(Response.json({ok:true}));await pending;assert.equal(focuses.length,count)},{account:mode==='session',handle:action=>{if(action==='visit-request'){started.resolve();return reply.promise}}});
});
test('visit focus waits for the project callback and preserves a later choice there',()=>{
 const reply=deferred(),started=deferred();return screen(async({button,other,submit,active,focuses,heading})=>{button.focus();const pending=submit();await started.promise;assert.equal(focuses.includes(heading()),false);other.focus();reply.resolve();await pending;assert.equal(active()===other,true);assert.equal(focuses.includes(heading()),false)},{onChange:()=>{started.resolve();return reply.promise}});
});
test('ordinary completed project callback permits visit heading focus',()=>{
 const reply=deferred(),started=deferred();return screen(async({button,submit,active,heading,blur})=>{button.focus();const pending=submit();await started.promise;blur();reply.resolve();await pending;assert.equal(active()===heading(),true)},{onChange:()=>{started.resolve();return reply.promise}});
});
