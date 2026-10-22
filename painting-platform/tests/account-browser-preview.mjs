// Local-only account journey fixture. Never deploy this synthetic output.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const target=process.argv[2];
execFileSync(process.execPath,[new URL('./browser-preview.mjs',import.meta.url).pathname,target],{stdio:'pipe'});
const network=`sessionStorage.removeItem('buzzie.session');
const scenario=new URLSearchParams(location.search).get('scenario')||'signin';
const origin='https://ocmgrgvzhuhyigaddhue.supabase.co';
const session=()=>({access_token:'synthetic-account-access',refresh_token:'synthetic-account-refresh',expires_in:3600});
window.buzzieQa={calls:[]};
window.fetch=async function(input,options={}){
 const url=new URL(String(input),location.href),method=options.method||'GET',action=url.searchParams.get('action');
 window.buzzieQa.calls.push({path:url.pathname,method,action});
 if(url.origin===origin&&url.pathname==='/functions/v1/platform-api'){
  if(method==='GET'&&action==='providers')return Response.json({auth_challenge:{required:false}});
  if(method==='GET'&&action==='home-projects')return scenario==='list-failure'?Response.json({error:'Fixture list unavailable'},{status:503}):Response.json({projects:[{id:'synthetic-project',lead:{service:'Interior painting — synthetic example',city:'Summerville',status:'new'}}]});
  if(method==='POST'&&action==='claim-project')return Response.json({linked:true});
 }
 if(url.origin===origin){
  if(method==='POST'&&url.pathname==='/auth/v1/token'&&['password','refresh_token'].includes(url.searchParams.get('grant_type')))return scenario==='auth-failure'?Response.json({code:'invalid_credentials'},{status:400}):Response.json(session());
  if(method==='POST'&&url.pathname==='/auth/v1/signup')return scenario==='signup-rejected'?Response.json({code:'signup_disabled'},{status:403}):Response.json(scenario==='signup-session'?session():{});
  if(method==='POST'&&url.pathname==='/auth/v1/recover')return Response.json({});
  if(method==='POST'&&url.pathname==='/auth/v1/verify')return Response.json(session());
  if(method==='GET'&&url.pathname==='/auth/v1/user')return Response.json({id:'synthetic-homeowner',email:'homeowner@example.invalid',email_confirmed_at:'2026-10-22'});
  if(method==='PUT'&&url.pathname==='/auth/v1/user')return Response.json({id:'synthetic-homeowner'});
  if(method==='POST'&&url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
 }
 throw Error('Local account QA: unexpected network request blocked.');
};
for(const name of ['XMLHttpRequest','WebSocket','EventSource'])window[name]=function(){throw Error('Local account QA: network transport blocked.')};
if(typeof navigator!=='undefined')navigator.sendBeacon=()=>false;
`;
await writeFile(path.join(target,'dist/qa-network.js'),network);
const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; form-action 'none'; object-src 'none'">`;
let account=await readFile(path.join(target,'dist/account.html'),'utf8');
account=account.replace('<head>','<head>'+csp);await writeFile(path.join(target,'dist/account.html'),account);
await writeFile(path.join(target,'dist/qa.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8">${csp}<title>Buzzie account QA — synthetic only</title><style>body{font:14px system-ui;background:#eee;margin:16px}nav{display:flex;gap:12px;flex-wrap:wrap}iframe{display:block;width:390px;height:900px;border:1px solid #777;margin-top:16px}</style></head><body><h1>Local account journey — synthetic responses only</h1><p>No real account, password change or email. Never publish this fixture. Narrow frames are not physical-device tests.</p><nav id="scenarios"></nav><iframe id="account-frame" title="Synthetic Buzzie account journey"></iframe><script>
const scenarios=['signin','signup','signup-session','signup-rejected','confirmation','recovery','expired','list-failure','auth-failure'],params=new URLSearchParams(location.search),scenario=scenarios.includes(params.get('scenario'))?params.get('scenario'):'signin',width=[320,390,768].includes(Number(params.get('width')))?Number(params.get('width')):390;
for(const s of scenarios)for(const w of [320,390,768]){const a=document.createElement('a');a.href='?scenario='+s+'&width='+w;a.textContent=s+' '+w;document.querySelector('#scenarios').append(a)}
const frame=document.querySelector('#account-frame');frame.style.width=width+'px';frame.src='account.html?scenario='+scenario+(scenario.startsWith('signup')?'&mode=signup':'')+(scenario==='confirmation'?'#access_token=synthetic-link-access&refresh_token=synthetic-link-refresh&type=signup':scenario==='recovery'?'#access_token=synthetic-link-access&refresh_token=synthetic-link-refresh&type=recovery':scenario==='expired'?'#error=access_denied&error_code=otp_expired':'');
</script></body></html>`);
console.log('Local synthetic account fixture ready: '+target);
