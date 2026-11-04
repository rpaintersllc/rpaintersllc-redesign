// Local synthetic browser acceptance only; never deploy this directory.
import './browser-preview.mjs';
import {readFile,writeFile} from 'node:fs/promises';import path from 'node:path';
const target=process.argv[2],dist=path.join(target,'dist');
const network=await readFile(path.join(dist,'qa-network.js'),'utf8');
const fixture=`const readonlyFetch=window.fetch;let reviewRevision=0;
window.fetch=async(input,options={})=>{
 const url=new URL(String(input),location.href),action=url.searchParams.get('action'),body=options.body?JSON.parse(options.body):{};
 if(url.origin==='https://ocmgrgvzhuhyigaddhue.supabase.co'&&url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password')return Response.json({access_token:'SYNTHETIC-NOT-A-JWT',refresh_token:'SYNTHETIC-NOT-A-REFRESH',expires_in:3600});
 if(url.origin==='https://ocmgrgvzhuhyigaddhue.supabase.co'&&url.pathname==='/functions/v1/platform-api'){
  if(action==='pro-list')return Response.json({business:{id:'fixture',name:'Synthetic painting company'},role:'staff',coverage:{cities:['Summerville'],state:'SC',zip_prefix:'294',active:true,accepting_requests:true},memberships:[{business_id:'fixture',name:'Synthetic painting company'}],can_review_interest:false,projects:[{id:'11111111-1111-4111-8111-111111111111',created_at:'2026-11-04T12:00:00Z',property_type:'Home',timing:'Within a month',contact_method:'email',contact_window:'weekday_morning',lead:{status:'new',full_name:'SYNTHETIC QA — not a customer',email:'fixture@example.invalid',phone:'2025550100',city:'Summerville',zip:'29483',service:'Interior painting',details:'Synthetic browser fixture. No external writes or email.',utm_source:'Synthetic referral'},events:[{status:'new'}],photos:[],review:{qualification:'unreviewed',notes:'',revision:0}}]});
  if(action==='pro-review')return Response.json({...body,revision:++reviewRevision,updated_at:'2026-11-04T12:00:00Z'});
 }
 return readonlyFetch(input,options);
};`;
await writeFile(path.join(dist,'qa-network.js'),network+'\n'+fixture);
const qa=await readFile(path.join(dist,'qa.html'),'utf8');await writeFile(path.join(dist,'qa.html'),qa.replace("pages=['request','project','account']","pages=['request','project','account','pro']"));
console.log('Qualification browser fixture ready; all remote writes mocked.');
