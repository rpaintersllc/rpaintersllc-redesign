import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {clearSession,authPayload} from '../web/auth-session.js';
async function screen(run,{page='account',configFail=false,handle=()=>{}}={}){
 const old=Object.fromEntries(['document','window','location','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const {document}=parseHTML(await readFile(new URL('../web/'+page+'.html',import.meta.url),'utf8'));globalThis.document=document;globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/'+page+'.html');
 let widget,resets=0;globalThis.window={turnstile:{render:(node,options)=>{widget=options;return 'mock-widget'},reset:()=>{resets++}}};const saved=new Map();globalThis.sessionStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};clearSession();
 const calls=[];globalThis.fetch=async(url,options={})=>{calls.push({url,body:options.body?JSON.parse(options.body):undefined});if(url.includes('action=providers'))return configFail?Response.json({error:'Settings unavailable'},{status:503}):Response.json({auth_challenge:{required:true,available:true,site_key:'public-auth-widget'}});const custom=await handle(url,options);if(custom)return custom;if(url.includes('/token?'))return Response.json({code:'captcha_failed'},{status:400});return Response.json({})};
 for(const input of document.querySelectorAll('input'))input.checkValidity=()=>true;
 const contractor=document.querySelector('#signin');if(contractor)contractor.reset=()=>{};
 try{await import('../web/'+page+'.js?test='+crypto.randomUUID());await run({document,calls,widget:()=>widget,resets:()=>resets})}finally{clearSession();Object.assign(globalThis,old)}
}
function details(document){document.querySelector('#account-email').value='homeowner@example.invalid';document.querySelector('#account-password').value='mock password';document.querySelector('#account-name').value='Homeowner'}
test('homeowner password sign-in includes native Auth CAPTCHA proof and resets it after failure',()=>screen(async({document,calls,widget,resets})=>{
 details(document);widget().callback('sign-in-proof');await document.querySelector('#account-form').onsubmit({preventDefault(){}});const login=calls.find(c=>c.url.includes('/token?'));assert.equal(login.body.gotrue_meta_security.captcha_token,'sign-in-proof');assert.match(document.querySelector('#account-message').textContent,/security check again/);assert.equal(resets(),1);await document.querySelector('#account-form').onsubmit({preventDefault(){}});assert.equal(calls.filter(c=>c.url.includes('/token?')).length,1);
}));
test('signup proof stays separate from user-editable profile metadata',()=>screen(async({document,calls,widget})=>{
 details(document);document.querySelector('#mode-signup').onclick();document.querySelector('#account-consent').checked=true;widget().callback('signup-proof');await document.querySelector('#account-form').onsubmit({preventDefault(){}});const signup=calls.find(c=>c.url.includes('/signup?'));assert.equal(signup.body.gotrue_meta_security.captcha_token,'signup-proof');assert.deepEqual(signup.body.data,{full_name:'Homeowner'});assert.equal(signup.body.password,'mock password');assert.equal(document.querySelector('#account-password').value,'');
}));
test('password recovery sends its own CAPTCHA proof without a password',()=>screen(async({document,calls,widget,resets})=>{
 details(document);widget().callback('recovery-proof');await document.querySelector('#recover-account').onclick();const recover=calls.find(c=>c.url.includes('/recover?'));assert.deepEqual(recover.body,{email:'homeowner@example.invalid',gotrue_meta_security:{captcha_token:'recovery-proof'}});assert.equal(resets(),1);
}));
test('unavailable security configuration blocks auth requests',()=>screen(async({document,calls})=>{
 details(document);assert.equal(document.querySelector('#auth-submit').disabled,true);assert.equal(document.querySelector('#recover-account').disabled,true);await document.querySelector('#account-form').onsubmit({preventDefault(){}});assert.equal(calls.filter(c=>c.url.includes('/auth/v1/')).length,0);assert.equal(document.querySelector('#auth-submit').disabled,true);
},{configFail:true}));
test('a pending recovery cannot reuse its token in a simultaneous sign-in',async()=>{
 let release,started;const waiting=new Promise(r=>release=r),begun=new Promise(r=>started=r);
 await screen(async({document,calls,widget})=>{details(document);widget().callback('one-use');const pending=document.querySelector('#recover-account').onclick();await begun;await document.querySelector('#account-form').onsubmit({preventDefault(){}});assert.equal(calls.filter(c=>c.url.includes('/token?')).length,0);assert.equal(document.querySelector('#mode-signup').disabled,true);release(Response.json({}));await pending;assert.equal(document.querySelector('#mode-signup').disabled,false)},{handle:url=>{if(url.includes('/recover?')){started();return waiting}}});
});
test('contractor sign-in supplies native CAPTCHA proof too',async()=>{
 const oldFormData=globalThis.FormData;globalThis.FormData=class{*[Symbol.iterator](){yield ['email','contractor@example.invalid'];yield ['password','mock password']}};
 try{await screen(async({document,calls,widget,resets})=>{widget().callback('contractor-proof');const form=document.querySelector('#signin');await form.onsubmit({preventDefault(){},target:form});const login=calls.find(c=>c.url.includes('/token?'));assert.equal(login.body.gotrue_meta_security.captcha_token,'contractor-proof');assert.equal(resets(),1);assert.match(document.querySelector('#message').textContent,/security check again/)},{page:'pro'})}finally{globalThis.FormData=oldFormData}
});
test('Auth payloads require loaded settings and omit unused CAPTCHA metadata',()=>{
 assert.throws(()=>authPayload({email:'example'},undefined),/still loading/);assert.deepEqual(authPayload({email:'example'},{token:()=>''}),{email:'example'});
});
