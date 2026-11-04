// Local synthetic account/capability workspace. Never deploy this output.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const target=process.argv[2];
execFileSync(process.execPath,[new URL('./browser-preview.mjs',import.meta.url).pathname,target],{stdio:'pipe'});
const compatibility=(await readFile(path.join(target,'dist/qa-network.js'),'utf8')).split('window.fetch=')[0];
const network=compatibility+`const scenario=new URLSearchParams(location.search).get('scenario')||'account';
const origin='https://ocmgrgvzhuhyigaddhue.supabase.co',projectId='11111111-1111-4111-8111-111111111111',key='a'.repeat(64);
sessionStorage.removeItem('buzzie.session');
if(scenario!=='capability')sessionStorage.setItem('buzzie.session',JSON.stringify({access_token:'synthetic-project-access',refresh_token:'synthetic-project-refresh',expires_at:Math.floor(Date.now()/1000)+3600}));
let deny=scenario==='denied',messages=[{author:'business',body:'Synthetic company reply: please describe the room.',created_at:'2026-10-23T12:00:00Z'}],visits=[];
window.buzzieQa={calls:[],denyNextLookup(){deny=true}};
window.fetch=async function(input,options={}){
 const url=new URL(String(input),location.href),method=options.method||'GET',action=url.searchParams.get('action');
 window.buzzieQa.calls.push({path:url.pathname,method,action});
 if(url.origin===origin&&url.pathname==='/functions/v1/platform-api'&&method==='POST'&&['lookup','conversation','message','visit-request'].includes(action)){
  const body=JSON.parse(options.body||'{}');
  const authorized=body.project_id===projectId&&(scenario==='capability'?body.access_token===key:!body.access_token&&options.headers?.authorization==='Bearer synthetic-project-access');
  if(!authorized)return Response.json({error:'Synthetic access denied'},{status:403});
  if(action==='lookup'){
   if(deny)return Response.json({error:'Synthetic project access removed'},{status:403});
   return Response.json({project:{lead:{service:'Interior painting',status:'contacted',city:'Summerville',zip:'29483',details:'Synthetic private project: living room walls and trim.',full_name:'Synthetic Homeowner',email:'workspace@example.invalid',phone:'2025550100'},business:{phone:'2025550199',website:'https://example.invalid'},property_type:'Home',timing:'Within a month',events:[],photos:[]}});
  }
  if(deny)return Response.json({error:'Synthetic access denied'},{status:403});
  if(action==='conversation')return Response.json({messages,visits});
  if(action==='message'){if(!body.message||!body.request_key)return Response.json({error:'Synthetic invalid message'},{status:400});messages.push({author:'homeowner',body:body.message,created_at:'2026-10-23T12:30:00Z'});return Response.json({ok:true})}
  if(action==='visit-request'){if(!body.preferred_date||!body.request_key)return Response.json({error:'Synthetic invalid visit'},{status:400});visits=[{id:'synthetic-visit',preferred_date:body.preferred_date,time_window:body.time_window,status:'requested'}];return Response.json({ok:true})}
 }
 throw Error('Local project QA: unexpected network request blocked.');
};
for(const name of ['XMLHttpRequest','WebSocket','EventSource'])window[name]=function(){throw Error('Local project QA: network transport blocked.')};
if(typeof navigator!=='undefined')navigator.sendBeacon=()=>false;
`;
await writeFile(path.join(target,'dist/qa-network.js'),network);
const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; form-action 'none'; object-src 'none'">`;
for(const file of (await readdir(path.join(target,'dist'))).filter(f=>f.endsWith('.html'))){let html=await readFile(path.join(target,'dist',file),'utf8');await writeFile(path.join(target,'dist',file),html.replace('<head>','<head>'+csp))}
await writeFile(path.join(target,'dist/qa.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8">${csp}<title>Buzzie project QA — synthetic only</title><style>body{font:14px system-ui;margin:16px;background:#eee}nav{display:flex;gap:12px;flex-wrap:wrap}iframe{display:block;height:1100px;border:1px solid #777;margin-top:16px}</style></head><body><h1>Local project workspace — synthetic only</h1><p>Seeded synthetic session, not a real sign-in. No real message, visit, photo or email. Never publish this fixture.</p><nav id="scenarios"></nav><button id="deny">QA: deny subsequent project reads</button><p id="metrics" role="status"></p><iframe id="project-frame" title="Synthetic project workspace"></iframe><script>
const params=new URLSearchParams(location.search),scenarios=['account','capability','denied'],scenario=scenarios.includes(params.get('scenario'))?params.get('scenario'):'account',width=[320,390,768].includes(Number(params.get('width')))?Number(params.get('width')):390;
for(const s of scenarios)for(const w of [320,390,768]){const a=document.createElement('a');a.href='?scenario='+s+'&width='+w;a.textContent=s+' '+w;document.querySelector('#scenarios').append(a)}
const frame=document.querySelector('#project-frame');frame.style.width=width+'px';frame.src='project.html?scenario='+scenario+'&project=11111111-1111-4111-8111-111111111111'+(scenario==='capability'?'#project=11111111-1111-4111-8111-111111111111&key='+'a'.repeat(64):'');
document.querySelector('#deny').onclick=()=>frame.contentWindow.buzzieQa.denyNextLookup();
setInterval(()=>{const d=frame.contentDocument;if(!d)return;const calls=frame.contentWindow.buzzieQa?.calls||[];document.querySelector('#metrics').textContent='Frame '+width+'; document '+d.documentElement.clientWidth+'; scroll '+d.documentElement.scrollWidth+'; focus '+(d.activeElement?.id||d.activeElement?.tagName)+'; lookup '+calls.filter(c=>c.action==='lookup').length+'; message '+calls.filter(c=>c.action==='message').length+'; visit '+calls.filter(c=>c.action==='visit-request').length},250);
</script></body></html>`);
console.log('Local synthetic project fixture ready: '+target);
