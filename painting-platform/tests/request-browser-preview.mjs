// Local-only synthetic request journey. Never deploy this output.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const target=process.argv[2];
execFileSync(process.execPath,[new URL('./browser-preview.mjs',import.meta.url).pathname,target],{stdio:'pipe'});
const compatibility=(await readFile(path.join(target,'dist/qa-network.js'),'utf8')).split('window.fetch=')[0];
const network=compatibility+`sessionStorage.removeItem('buzzie.session');
const scenario=new URLSearchParams(location.search).get('scenario')||'success';
const origin='https://ocmgrgvzhuhyigaddhue.supabase.co';
let creates=0,uploads=0;
window.buzzieQa={calls:[]};
window.fetch=async function(input,options={}){
 const url=new URL(String(input),location.href),method=options.method||'GET',action=url.searchParams.get('action');
 window.buzzieQa.calls.push({path:url.pathname,method,action});
 if(url.origin===origin&&url.pathname==='/functions/v1/platform-api'){
  if(method==='GET'&&action==='providers')return Response.json({providers:[{slug:'r-painters-llc',cities:['Summerville','Charleston']}],services:['Interior painting','Exterior painting','Cabinet refinishing'],intake_challenge:{required:false},auth_challenge:{required:false}});
  if(method==='POST'&&action==='create'){
   creates++;
   if(scenario==='create-retry'&&creates===1)return Response.json({error:'Synthetic save failure. Please retry.'},{status:503});
   return Response.json({project_id:'11111111-1111-4111-8111-111111111111',duplicate:false},{status:201});
  }
  if(method==='POST'&&action==='upload'){
   uploads++;
   if(scenario==='partial'&&uploads===2)return Response.json({error:'Synthetic unconfirmed photo'},{status:502});
   return Response.json({ok:true,id:'synthetic-photo-'+uploads},{status:201});
  }
 }
 throw Error('Local request QA: unexpected network request blocked.');
};
for(const name of ['XMLHttpRequest','WebSocket','EventSource'])window[name]=function(){throw Error('Local request QA: network transport blocked.')};
if(typeof navigator!=='undefined')navigator.sendBeacon=()=>false;
`;
await writeFile(path.join(target,'dist/qa-network.js'),network);
const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; form-action 'none'; object-src 'none'">`;
for(const file of ['request.html','project.html','account.html']){
 let html=await readFile(path.join(target,'dist',file),'utf8');
 await writeFile(path.join(target,'dist',file),html.replace('<head>','<head>'+csp));
}
// File controls are filled through a deliberate local-only fixture button.
// Browser File/DataTransfer objects exercise the production file-input handler.
const controls=`<script>
addEventListener('DOMContentLoaded',()=>{
 const button=document.createElement('button');button.type='button';button.textContent='QA: select two synthetic photos';button.id='qa-photos';
 button.onclick=()=>{const transfer=new DataTransfer();for(const name of ['synthetic-a.png','synthetic-b.png'])transfer.items.add(new File([new Uint8Array([137,80,78,71,13,10,26,10])],name,{type:'image/png'}));const input=document.querySelector('#photos');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))};
 document.querySelector('#photos').after(button);
});
</script>`;
let request=await readFile(path.join(target,'dist/request.html'),'utf8');
await writeFile(path.join(target,'dist/request.html'),request.replace('</body>',controls+'</body>'));
await writeFile(path.join(target,'dist/qa.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8">${csp}<title>Buzzie request QA — synthetic only</title><style>body{font:14px system-ui;background:#eee;margin:16px}nav{display:flex;gap:12px;flex-wrap:wrap}iframe{display:block;height:1000px;border:1px solid #777;margin-top:16px}</style></head><body><h1>Local request journey — synthetic responses only</h1><p>No real request, upload, account or email. Never publish this fixture. Narrow frames are not physical-device tests.</p><nav id="scenarios"></nav><p id="qa-metrics" role="status"></p><iframe id="request-frame" title="Synthetic Buzzie request journey"></iframe><script>
const scenarios=['success','partial','create-retry'],params=new URLSearchParams(location.search),scenario=scenarios.includes(params.get('scenario'))?params.get('scenario'):'success',width=[320,390,768].includes(Number(params.get('width')))?Number(params.get('width')):390;
for(const s of scenarios)for(const w of [320,390,768]){const a=document.createElement('a');a.href='?scenario='+s+'&width='+w;a.textContent=s+' '+w;document.querySelector('#scenarios').append(a)}
const frame=document.querySelector('#request-frame');frame.style.width=width+'px';frame.src='request.html?scenario='+scenario;
setInterval(()=>{const d=frame.contentDocument;if(!d)return;const calls=frame.contentWindow.buzzieQa?.calls||[];document.querySelector('#qa-metrics').textContent='Frame '+width+'; document width '+d.documentElement.clientWidth+'; scroll width '+d.documentElement.scrollWidth+'; focus '+(d.activeElement?.id||d.activeElement?.tagName)+'; create calls '+calls.filter(c=>c.action==='create').length+'; upload calls '+calls.filter(c=>c.action==='upload').length},250);
</script></body></html>`);
console.log('Local synthetic request fixture ready: '+target);
