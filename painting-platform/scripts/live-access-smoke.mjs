// Read-only HTTP checks for the existing private pilot. No login, mutation or email.
import assert from 'node:assert/strict';
const base='https://ocmgrgvzhuhyigaddhue.supabase.co/functions/v1/platform-api';
const origin='https://r-painters-projects.jessicuriel27.chatgpt.site';
const headers={origin,apikey:'sb_publishable_sUzZc6Nktk_wqQh4xTTMhw_nsF_-jki'};
const checks=[];
async function check(name,action,status,extra={}){
 const response=await fetch(base+'?action='+action,{headers,...extra,signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,status,name);
 const data=response.status===204?null:await response.json();
 checks.push({name,status:response.status});return data;
}
const config=await check('provider discovery','providers',200);
assert.equal(config.pilot,true);
assert.equal(config.intake_challenge.required,true,'Intake verification must remain enabled');
assert.equal(config.intake_challenge.available,true,'Intake verification must remain configured');
assert.deepEqual(config.providers.map(p=>p.slug),['r-painters-llc'],'Single-contractor pilot');
await check('homeowner without bearer','home-projects',401);
await check('contractor without bearer','pro-list',403);
await check('homeowner invalid bearer','home-projects',401,{headers:{...headers,authorization:'Bearer invalid'}});
await check('contractor invalid bearer','pro-list',403,{headers:{...headers,authorization:'Bearer invalid'}});
await check('unapproved origin','providers',403,{headers:{...headers,origin:'https://example.invalid'}});
await check('preflight','providers',204,{method:'OPTIONS'});
console.log(JSON.stringify({checked_at:new Date().toISOString(),checks,intake_challenge:{required:true,available:true},auth_challenge_required:config.auth_challenge.required,limits:'No real homeowner login/logout, CAPTCHA success, email, writes or mobile journey tested.'},null,2));
