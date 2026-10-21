// Creates one clearly marked synthetic project. Run manually against the private pilot.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
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
const uploaded=await fetch(base+'?action=upload',{method:'POST',headers:{...headers,'content-type':'image/png','x-project-id':access.project_id,'x-project-token':access.access_token},body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});assert.equal(uploaded.status,201,await uploaded.text());
lookup=await call('lookup',access);assert.equal(lookup.data.project.photos.length,1);assert.equal((await fetch(lookup.data.project.photos[0].url)).status,200);
assert.equal((await call('pro-list')).status,403);
const message={...access,request_key:randomUUID(),message:'SYSTEM TEST: verifying project messages, not a real homeowner.'};
const saved=await call('message',message);assert.equal(saved.status,200,JSON.stringify(saved));assert.equal((await call('message',message)).data.id,saved.data.id);
assert.equal((await call('conversation',{...access,access_token:'0'.repeat(64)})).status,404);
assert.equal((await call('conversation',access)).data.messages.length,1);
const preferred_date=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
const visit=await call('visit-request',{...access,request_key:randomUUID(),preferred_date,time_window:'Flexible'});assert.equal(visit.status,200,JSON.stringify(visit));
assert.equal((await call('visit-update',{...access,visit_id:visit.data.id,decision:'confirmed'})).status,400);
assert.equal((await call('visit-update',{...access,visit_id:visit.data.id,decision:'cancelled'})).status,200);
assert.equal((await call('conversation',access)).data.visits[0].status,'cancelled');
console.log(JSON.stringify({passed:true,project_id:access.project_id,checks:['routing','idempotence','private lookup','wrong-key denial','photo upload','signed photo retrieval','business authentication','private messages','message duplicate prevention','site visit request','homeowner confirmation denial','visit cancellation']}));

