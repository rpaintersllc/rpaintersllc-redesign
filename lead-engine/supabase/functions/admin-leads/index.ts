export function makeAdminHandler(env, fetcher=fetch) {
 return async request=>{
  const origin=request.headers.get('origin')||'';
  const allowed=(env('ALLOWED_ORIGINS')||'http://localhost:5173').split(',');
  const headers={'content-type':'application/json','cache-control':'no-store','vary':'Origin',...(allowed.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'GET,PATCH,OPTIONS'}:{})};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!allowed.includes(origin))return json({error:'Forbidden'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','PATCH'].includes(request.method))return json({error:'Method not allowed'},405);
  const token=request.headers.get('authorization');
  if(!token?.startsWith('Bearer '))return json({error:'Sign in required'},401);
  try{
   const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
   const auth=await fetcher(base+'/auth/v1/user',{headers:{apikey:key,authorization:token}});
   if(!auth.ok)return json({error:'Session expired'},401);
   const user=await auth.json();
   if(!(env('ADMIN_USER_IDS')||'').split(',').filter(Boolean).includes(user.id))return json({error:'Administrator access required'},403);
   const dbheaders={apikey:key,authorization:'Bearer '+key,'content-type':'application/json'};
   if(request.method==='GET'){
    const kind=new URL(request.url).searchParams.get('kind')==='opportunities'?'opportunities':'leads';
    const res=await fetcher(base+'/rest/v1/'+kind+'?select=*&order=created_at.desc&limit=200',{headers:dbheaders});
    if(!res.ok)return json({error:'Unable to load records'},502);
    return json({records:await res.json()});
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
