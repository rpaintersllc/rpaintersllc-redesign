import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CONTACT_METHODS,CONTACT_WINDOWS,contactPreference} from '../web/contact-preferences.js';
const source=await readFile(new URL('../supabase/functions/platform-api/index.ts',import.meta.url),'utf8');
const {makePlatformHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin='https://r-painters-projects.jessicuriel27.chatgpt.site';
const env=k=>({SUPABASE_URL:'https://database.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only'}[k]);
const project={request_key:'11111111-1111-4111-8111-111111111111',access_token:'a'.repeat(64),full_name:'Synthetic preference test',email:'contact@example.invalid',phone:'2025550149',city:'Summerville',state:'SC',zip:'29483',service:'Interior painting',property_type:'Home',timing:'Just planning',details:'Synthetic contact preference only',contact_consent:true,provider_slug:'r-painters-llc'};
const request=patch=>new Request('https://api.invalid/?action=create',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({...project,...patch})});
for(const method of Object.keys(CONTACT_METHODS))for(const window of Object.keys(CONTACT_WINDOWS))test('intake preserves '+method+' / '+window+' without marking identity verified',async()=>{
 let calls=0;const handler=makePlatformHandler(env,async(url,options)=>{calls++;assert.match(url,/rpc\/platform_create_project$/);const {payload}=JSON.parse(options.body);assert.equal(payload.contact_method,method);assert.equal(payload.contact_window,window);assert.equal(payload.contact_verified,undefined);return Response.json({id:project.request_key})});
 assert.equal((await handler(request({contact_method:method,contact_window:window,contact_verified:true}))).status,201);assert.equal(calls,1);
});
for(const patch of [{},{contact_method:null,contact_window:null}])test('older intake remains compatible '+JSON.stringify(patch),async()=>{
 const handler=makePlatformHandler(env,async(url,options)=>{const {payload}=JSON.parse(options.body);assert.equal(payload.contact_method,null);assert.equal(payload.contact_window,null);return Response.json({id:project.request_key})});assert.equal((await handler(request(patch))).status,201);
});
for(const patch of [{contact_method:'sms'},{contact_method:''},{contact_method:' email '},{contact_method:[]},{contact_method:{}},{contact_method:1},{contact_method:'constructor'},{contact_window:'night'},{contact_window:''},{contact_window:[]},{contact_window:1}])test('invalid preference rejected before network '+JSON.stringify(patch),async()=>{
 let calls=0;const handler=makePlatformHandler(env,async()=>{calls++;throw Error('Unexpected downstream request')});const response=await handler(request(patch));assert.equal(response.status,400);assert.match((await response.json()).error,/contact method and time/);assert.equal(calls,0);
});
test('private lookup requests persisted preferences within its existing access filter',async()=>{
 const queries=[];const handler=makePlatformHandler(env,async url=>{queries.push(url);return Response.json(url.includes('select=id,access_hash')?[{id:project.request_key,access_hash:'b'.repeat(64)}]:[{id:project.request_key,photos:[],contact_method:'email',contact_window:'weekday_morning'}])});
 const response=await handler(new Request('https://api.invalid/?action=lookup',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({project_id:project.request_key,access_token:'a'.repeat(64)})}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.project.contact_method,'email');assert.equal(data.project.contact_window,'weekday_morning');assert.match(queries[0],/access_hash=eq\./);assert.match(queries[1],/contact_method,contact_window/);
});
test('legacy and unrecognized preference values never invent a selection',()=>{
 for(const project of [{},{contact_method:null,contact_window:null},{contact_method:'constructor',contact_window:'__proto__'},{contact_method:{},contact_window:[]}])assert.equal(contactPreference(project),'Contact preference: Not provided.');
 assert.equal(contactPreference({contact_method:'email',contact_window:'weekday_evening'}),'Preferred contact: Email · Weekday evenings, 5–7 PM Eastern.');
});
