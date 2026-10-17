// Creates one clearly marked synthetic project. Run manually against the private pilot.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const base='https://ocmgrgvzhuhyigaddhue.supabase.co/functions/v1/platform-api';
const headers={origin:'https://r-painters-projects.jessicuriel27.chatgpt.site','content-type':'application/json',apikey:'sb_publishable_sUzZc6Nktk_wqQh4xTTMhw_nsF_-jki'};
async function call(action,body){const res=await fetch(base+'?action='+action,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()}}
const payload={request_key:randomUUID(),access_token:randomBytes(32).toString('hex'),full_name:'PLATFORM SYSTEM TEST — Not a customer',email:'platform-system-test@example.invalid',phone:'2025550198',city:'Summerville',state:'SC',zip:'29483',service:'Interior painting',property_type:'Home',timing:'Just planning',details:'Synthetic platform verification. This is not a customer request.',contact_consent:true,provider_slug:'r-painters-llc'};
assert.equal((await call('providers')).status,200);
const created=await call('create',payload);assert.equal(created.status,201,JSON.stringify(created));
const access={project_id:created.data.project_id,access_token:payload.access_token};
assert.equal((await call('create',payload)).data.project_id,access.project_id);
assert.equal((await call('lookup',{...access,access_token:'0'.repeat(64)})).status,404);
let lookup=await call('lookup',access);assert.equal(lookup.status,200,JSON.stringify(lookup));assert.equal(lookup.data.project.business.slug,'r-painters-llc');
const uploaded=await fetch(base+'?action=upload',{method:'POST',headers:{...headers,'content-type':'image/webp','x-project-id':access.project_id,'x-project-token':access.access_token},body:await readFile(new URL('../web/r-painters-logo.webp',import.meta.url))});assert.equal(uploaded.status,201,await uploaded.text());
lookup=await call('lookup',access);assert.equal(lookup.data.project.photos.length,1);assert.equal((await fetch(lookup.data.project.photos[0].url)).status,200);
assert.equal((await call('pro-list')).status,403);
console.log(JSON.stringify({passed:true,project_id:access.project_id,checks:['routing','idempotence','private lookup','wrong-key denial','photo upload','signed photo retrieval','business authentication']}));
