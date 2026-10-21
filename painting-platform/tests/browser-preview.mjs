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
await writeFile(path.join(target,'dist/qa-network.js'),`if(!crypto.randomUUID)crypto.randomUUID=()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(v=>v.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)};window.fetch=async function(input,options={}){const url=new URL(String(input),location.href);if((options.method||'GET')==='GET'&&url.searchParams.get('action')==='providers')return Response.json({providers:[{slug:'r-painters-llc',cities:['Summerville','Charleston']}],services:['Interior painting','Exterior painting','Cabinet refinishing'],intake_challenge:{required:false},auth_challenge:{required:false}});throw Error('Local QA: all other network requests, including every write, are blocked.');};`);
for(const file of (await readdir(path.join(target,'dist'))).filter(f=>f.endsWith('.html'))){const name=path.join(target,'dist',file);const html=await readFile(name,'utf8');await writeFile(name,html.replace('<head>','<head><script src="qa-network.js"></script>'))}
console.log('Read-only local UI fixture ready: '+target);
