import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
test('homeowner sign-in opens account projects without exposing private keys',async()=>{
 const previous={document:globalThis.document,fetch:globalThis.fetch,location:globalThis.location,sessionStorage:globalThis.sessionStorage};
 const {document}=parseHTML(await readFile(new URL('../web/account.html',import.meta.url),'utf8'));globalThis.document=document;
 globalThis.location=new URL('https://r-painters-projects.jessicuriel27.chatgpt.site/account.html');const saved=new Map();globalThis.sessionStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push(url);if(url.includes('/token?'))return Response.json({access_token:'test-session',refresh_token:'test-refresh',expires_in:3600});if(url.endsWith('/user'))return Response.json({id:'account',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-20'});return Response.json({projects:[{id:'project-one',lead:{service:'Interior painting',city:'Summerville',status:'new'}}]})};
 try{
  await import('../web/account.js');document.querySelector('#account-email').value='homeowner@example.invalid';document.querySelector('#account-password').value='test password';await document.querySelector('#account-form').onsubmit({preventDefault(){}});
  assert.equal(document.querySelector('#account-dashboard').hidden,false);assert.match(document.querySelector('#account-projects').textContent,/Interior painting/);assert.match(document.querySelector('#account-projects a').href,/project.html\?project=project-one/);assert.doesNotMatch(document.querySelector('#account-projects').innerHTML,/access_token|test-session|test-refresh/);assert.equal(document.querySelector('#account-password').value,'');assert.ok(calls.some(url=>url.includes('action=home-projects')));
 }finally{Object.assign(globalThis,previous)}
});
