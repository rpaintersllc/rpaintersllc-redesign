// Sends a generic owner alert only; customer names, emails, phones and project details stay in the dashboard.
export function makeNotifyHandler(env, fetcher=fetch) {
 return async request=>{
  const origin=request.headers.get('origin')||'';
  const origins=(env('ALLOWED_ORIGINS')||'http://localhost:5173').split(',');
  const headers={'content-type':'application/json','cache-control':'no-store','vary':'Origin',...(origins.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'POST,OPTIONS'}:{})};
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(request.method==='OPTIONS')return origins.includes(origin)?new Response(null,{status:204,headers}):json({error:'Forbidden origin'},403);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const base=env('SUPABASE_URL'),serverKey=env('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!serverKey)return json({error:'Server configuration incomplete'},503);
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return json({error:'Sign in required'},401);
  try{
   if(authorization!=='Bearer '+serverKey){
    if(!origins.includes(origin))return json({error:'Forbidden origin'},403);
    const auth=await fetcher(base+'/auth/v1/user',{headers:{apikey:serverKey,authorization},signal:AbortSignal.timeout(8000)});
    if(!auth.ok)return json({error:'Session expired'},401);
    const user=await auth.json();
    if(!(env('ADMIN_USER_IDS')||'').split(',').filter(Boolean).includes(user.id))return json({error:'Administrator access required'},403);
   }
   const apiKey=env('RESEND_API_KEY'),from=env('LEAD_NOTIFICATION_FROM');
   // Fail closed before claiming a queue entry or contacting a provider.
   if(env('LEAD_NOTIFICATIONS_ENABLED')!=='true'||!apiKey||!from)return json({error:'Email notifications are not configured'},503);
   const dbheaders={apikey:serverKey,authorization:'Bearer '+serverKey,'content-type':'application/json'};
   const rpc=async(name,body)=>fetcher(base+'/rest/v1/rpc/'+name,{method:'POST',headers:dbheaders,body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
   if(env('LEAD_RETRY_SCHEDULE_ENABLED')==='true'){
    // Existing server authorization stays inside this Supabase project, encrypted in Vault.
    // A scheduler failure must not prevent the immediate lead alert from being attempted.
    try{const schedule=await rpc('configure_lead_notification_schedule',{worker_key:serverKey});if(!schedule.ok){const failure=await schedule.json().catch(()=>({}));console.error('retry_schedule_setup_failed',schedule.status,failure.code||'unknown')}}catch{console.error('retry_schedule_setup_failed')}
   }
   const claim=await rpc('claim_lead_notification',{});
   if(!claim.ok)return json({error:'Unable to claim notification'},502);
   const job=await claim.json();if(!job)return json({ok:true,processed:0});
   let accepted=false,providerReference=null,errorCode='provider_unavailable',permanent=false;
   try{
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json','Idempotency-Key':'lead-alert/'+job.id},body:JSON.stringify({from,to:['rpaintersinsc@gmail.com'],subject:'New R Painters estimate request',text:'A new estimate request was saved in R Painters Lead Engine.\n\nOpen your private dashboard:\nhttps://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin\n\nReference: '+job.lead_id+'\n\nThis email contains no customer contact details.'}),signal:AbortSignal.timeout(8000)});
    if(response.ok){const data=await response.json();if(typeof data.id==='string'&&data.id){accepted=true;providerReference=data.id}else errorCode='invalid_provider_response'}
    else{errorCode='provider_http_'+response.status;permanent=response.status>=400&&response.status<500&&![408,409,429].includes(response.status)}
   }catch{errorCode='provider_network_error'}
   const finish=await rpc('finish_lead_notification',{job_id:job.id,claim_token:job.lease_token,accepted,provider_reference:providerReference,error_code:errorCode,permanent_failure:permanent});
   if(!finish.ok||await finish.json()!==true)return json({error:'Notification result could not be recorded'},502);
   return json({ok:true,processed:1,status:accepted?'accepted':permanent?'failed':'pending'});
  }catch{return json({error:'Notification service unavailable'},502)}
 };
}
if(typeof Deno!=='undefined')Deno.serve(makeNotifyHandler(key=>Deno.env.get(key)));
