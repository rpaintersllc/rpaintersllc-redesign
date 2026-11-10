// Local-only, read-only UI fixture. Never use this output as a hosted build.
import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const target=process.argv[2];
if(!target||!path.isAbsolute(target)||!target.startsWith('/workspace/'))throw Error('Choose an absolute scratch preview directory under /workspace.');
await mkdir(target,{recursive:true});
const entries=await readdir(target);if(entries.length&&!entries.includes('.buzzie-ui-qa'))throw Error('Preview target must be empty or already contain the QA marker.');
await writeFile(path.join(target,'.buzzie-ui-qa'),'Local fixture: no hosted deployment.\n');
await cp(new URL('../web/',import.meta.url),path.join(target,'dist'),{recursive:true});
await mkdir(path.join(target,'.openai'),{recursive:true});
await writeFile(path.join(target,'.openai/hosting.json'),JSON.stringify({project_id:'appgprj_6ad381533a388191952df8df6da8f1e4',static:{directory:'dist'}}));
const fixtureNetwork=`if(!crypto.randomUUID)crypto.randomUUID=()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(v=>v.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)};
window.fetch=async function(input,options={}){
 const url=new URL(String(input),location.href),action=url.searchParams.get('action'),method=options.method||'GET';
 if(url.origin==='https://ocmgrgvzhuhyigaddhue.supabase.co'&&url.pathname==='/functions/v1/platform-api'){
  if(method==='GET'&&action==='providers')return Response.json({providers:[{slug:'r-painters-llc',cities:['Summerville','Charleston']}],services:['Interior painting','Exterior painting','Cabinet refinishing'],intake_challenge:{required:false},auth_challenge:{required:false}});
  if(method==='POST'&&action==='lookup')return Response.json({project:{lead:{service:'Interior painting',status:'contacted',city:'Summerville',zip:'29483',details:'Read-only layout fixture: living room walls and trim.',full_name:'Example Homeowner',email:'homeownerxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@example.invalid',phone:'2025550100'},business:{phone:'2025550199',website:'https://example.invalid'},property_type:'Home',timing:'Within a month',events:[{status:'new',created_at:'2026-10-21T14:00:00Z'},{status:'contacted',created_at:'2026-10-21T16:00:00Z'}],photos:[]}});
  if(method==='POST'&&action==='conversation')return Response.json({messages:[{author:'homeowner',body:'Read-only sample message: please include the walls and trim.',created_at:'2026-10-21T14:00:00Z'},{author:'business',body:'Sample reply only. A site visit can help confirm the scope.',created_at:'2026-10-21T16:00:00Z'}],visits:[]});
 }
 throw Error('Local QA: all other network requests, including every write, are blocked.');
};`;
await writeFile(path.join(target,'dist/qa-network.js'),fixtureNetwork);
await writeFile(path.join(target,'dist/qa.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Buzzie responsive QA — fixtures only</title><style>body{font:14px system-ui;background:#eee;margin:16px}nav{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}iframe{display:block;border:1px solid #777;height:850px;background:#163d30}</style></head><body><h1>Read-only responsive fixtures</h1><p>No real account or project. Writes are blocked. Narrow-frame checks do not emulate a physical phone.</p><nav id="qa-nav"></nav><iframe id="qa-frame" title="Buzzie responsive fixture"></iframe><script>
const params=new URLSearchParams(location.search),pages=['request','project','account'],widths=[320,390,768],page=pages.includes(params.get('page'))?params.get('page'):'project',width=widths.includes(Number(params.get('width')))?Number(params.get('width')):320;
for(const p of pages)for(const w of widths){const a=document.createElement('a');a.href='?page='+p+'&width='+w;a.textContent=p+' '+w;document.querySelector('#qa-nav').append(a)}
const frame=document.querySelector('#qa-frame');frame.style.width=width+'px';frame.src=page+'.html'+(page==='project'?'#project=11111111-1111-4111-8111-111111111111&key='+'a'.repeat(64):'');
</script></body></html>`);
for(const file of (await readdir(path.join(target,'dist'))).filter(f=>f.endsWith('.html'))){const name=path.join(target,'dist',file);const html=await readFile(name,'utf8');await writeFile(name,html.replace('<head>','<head><script src="qa-network.js"></script>'))}
console.log('Read-only local UI fixture ready: '+target);
