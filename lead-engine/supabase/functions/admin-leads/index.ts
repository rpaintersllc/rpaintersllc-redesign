export function makeAdminHandler(env, fetcher=fetch) {
 return async request=>{
  const origin=request.headers.get('origin')||'';
  const allowed=(env('ALLOWED_ORIGINS')||'http://localhost:5173').split(',');
  const headers={'content-type':'application/json','cache-control':'no-store','vary':'Origin',...(allowed.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'GET,PATCH,POST,OPTIONS'}:{})};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!allowed.includes(origin))return json({error:'Forbidden'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','PATCH','POST'].includes(request.method))return json({error:'Method not allowed'},405);
  const token=request.headers.get('authorization');
  if(!token?.startsWith('Bearer '))return json({error:'Sign in required'},401);
  try{
   const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
   const auth=await fetcher(base+'/auth/v1/user',{headers:{apikey:key,authorization:token}});
   if(!auth.ok)return json({error:'Session expired'},401);
   const user=await auth.json();
   if(!(env('ADMIN_USER_IDS')||'').split(',').filter(Boolean).includes(user.id))return json({error:'Administrator access required'},403);
   if(request.method==='POST' && new URL(request.url).searchParams.get('action')==='save-opportunity'){
    const raw=await request.text();if(raw.length>7000)return json({error:'Payload too large'},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid request'},400)}
    const text=k=>typeof body?.[k]==='string'?body[k].trim():'';
    let url;try{url=new URL(text('source_url'))}catch{return json({error:'Enter a valid source URL'},400)}
    if(url.protocol!=='https:'||url.username||url.password||url.href.length>1000||text('title').length<5||text('title').length>200||text('source_name').length<2||text('source_name').length>120||text('city').length>100||text('summary').length>2000)return json({error:'Check opportunity details'},400);
    const res=await fetcher(base+'/rest/v1/opportunities?on_conflict=source_url',{method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json',prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({title:text('title'),source_name:text('source_name'),source_url:url.href,city:text('city')||null,summary:text('summary')||null})});
    if(!res.ok)return json({error:'Unable to save opportunity'},502);const rows=await res.json();return json({ok:true,duplicate:rows.length===0});
   }
   if(request.method==='POST'){
    if(new URL(request.url).searchParams.get('action')!=='retry-notification')return json({error:'Invalid action'},400);
    const retry=await fetcher(base+'/functions/v1/notify-leads',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(28000)});
    const result=await retry.json();
    return json(result,retry.status);
   }
   const dbheaders={apikey:key,authorization:'Bearer '+key,'content-type':'application/json'};
   if(request.method==='GET'){
    if(new URL(request.url).searchParams.get('action')==='discovery-status'){
     const res=await fetcher(base+'/rest/v1/discovery_scans?select=source_id,source_name,checked_at,status,items_seen,matches,rejected&order=checked_at.desc&limit=100',{headers:dbheaders});
     if(!res.ok)return json({error:'Discovery has not been activated yet'},503);
     const scans=await res.json(),latest=[];const seen=new Set();
     for(const scan of scans){if(!seen.has(scan.source_id)){seen.add(scan.source_id);latest.push(scan)}}
     return json({sources:latest});
    }
    const kind=new URL(request.url).searchParams.get('kind')==='opportunities'?'opportunities':'leads';
    const selection=kind==='leads'?'*,lead_notifications(status,attempts,last_error,accepted_at)':'*';
    const res=await fetcher(base+'/rest/v1/'+kind+'?select='+selection+'&order=created_at.desc&limit=200',{headers:dbheaders});
    if(!res.ok)return json({error:'Unable to load records'},502);
    return json({records:await res.json()});
   }
   if(new URL(request.url).searchParams.get('kind')==='opportunities'){
    const raw=await request.text();if(raw.length>1000)return json({error:'Payload too large'},413);const body=JSON.parse(raw);
    if(!/^[0-9a-f-]{36}$/i.test(body.id||'')||!['unreviewed','relevant','dismissed'].includes(body.review_status))return json({error:'Invalid review update'},400);
    const res=await fetcher(base+'/rest/v1/opportunities?id=eq.'+body.id+'&select=id,review_status',{method:'PATCH',headers:{...dbheaders,prefer:'return=representation'},body:JSON.stringify({review_status:body.review_status})});
    if(!res.ok)return json({error:'Unable to save review'},502);const rows=await res.json();return rows.length?json({record:rows[0]}):json({error:'Opportunity not found'},404);
   }
   const raw=await request.text(); if(raw.length>1000)return json({error:'Payload too large'},413);
   const body=JSON.parse(raw);
   if(!/^[0-9a-f-]{36}$/i.test(body.id||'')||!['new','contacted','visit_scheduled','quoted','won','lost'].includes(body.status))return json({error:'Invalid update'},400);
   const res=await fetcher(base+'/rest/v1/leads?id=eq.'+body.id+'&select=id,status',{method:'PATCH',headers:{...dbheaders,prefer:'return=representation'},body:JSON.stringify({status:body.status})});
   if(!res.ok)return json({error:'Update failed'},502);
   const rows=await res.json();return rows.length?json({record:rows[0]}):json({error:'Lead not found'},404);
  }catch{return json({error:'Unable to complete request'},502)}
 };
}
if(typeof Deno!=='undefined')Deno.serve(makeAdminHandler(key=>Deno.env.get(key)));
