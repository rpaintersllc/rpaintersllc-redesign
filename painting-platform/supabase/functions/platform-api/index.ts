export const SERVICES=['Interior painting','Exterior painting','Cabinet refinishing','Drywall repair','Deck or fence staining','Other painting project'];
const TIMINGS=['As soon as possible','Within a month','1–3 months','Just planning'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN=/^[0-9a-f]{64}$/;
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('')}
export async function boundedBody(request,limit){
 const reader=request.body?.getReader();if(!reader)throw Error('invalid_body');let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('too_large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return bytes;
}
function validImage(bytes,mime){
 if(mime==='image/jpeg')return bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==='image/png')return bytes.length>8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 if(mime==='image/webp')return bytes.length>12&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';return false;
}
export function makePlatformHandler(env,fetcher=fetch,defer=p=>p.catch(()=>{})){
 const allowed=new Set((env('PLATFORM_ALLOWED_ORIGINS')||'https://r-painters-projects.jessicuriel27.chatgpt.site').split(','));
 return async request=>{
  const origin=request.headers.get('origin')||'';
  const headers={'content-type':'application/json','cache-control':'no-store','referrer-policy':'no-referrer','vary':'Origin',...(allowed.has(origin)?{'access-control-allow-origin':origin,'access-control-allow-headers':'content-type,authorization,apikey,x-project-id,x-project-token','access-control-allow-methods':'GET,POST,OPTIONS'}:{})};
  const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  if(!allowed.has(origin))return json({error:'This origin is not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed'},405);
  const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');if(!base||!key)return json({error:'Platform unavailable'},503);
  const dbHeaders={apikey:key,authorization:'Bearer '+key,'content-type':'application/json'};
  const db=async(path,body,method)=>{const res=await fetcher(base+'/rest/v1/'+path,{method:method||(body===undefined?'GET':'POST'),headers:{...dbHeaders,prefer:'return=representation'},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('storage_error');if(res.status===204)return null;return res.json()};
  const rpc=(name,body)=>db('rpc/'+name,body);
  const challengeRequired=env('PLATFORM_REQUIRE_CHALLENGE')==='true';
  const challengeConfig=()=>({required:challengeRequired,site_key:challengeRequired?(env('PLATFORM_TURNSTILE_SITE_KEY')||''):'',available:!challengeRequired||!!(env('PLATFORM_TURNSTILE_SITE_KEY')&&env('PLATFORM_TURNSTILE_SECRET_KEY'))});
  async function challenge(token,action){
   if(!challengeRequired)return null;
   if(!challengeConfig().available)return json({error:'Request verification is temporarily unavailable. Please try later.'},503);
   if(typeof token!=='string'||!token.trim()||token.length>2048)return json({error:'Complete the security check before submitting.'},400);
   try{
    const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({secret:env('PLATFORM_TURNSTILE_SECRET_KEY'),response:token}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)return json({error:'Request verification is temporarily unavailable. Please try again.'},503);
    const result=await response.json();
    if(result.success!==true||result.hostname!==new URL(origin).hostname||result.action!==action)return json({error:'The security check expired or could not be verified. Please complete it again.'},403);
    return null;
   }catch{return json({error:'Request verification is temporarily unavailable. Please try again.'},503)}
  }

  let userPromise;
  const user=()=>userPromise||(userPromise=(async()=>{const authorization=request.headers.get('authorization')||'';if(!authorization.startsWith('Bearer '))return null;const response=await fetcher(base+'/auth/v1/user',{headers:{apikey:key,authorization},signal:AbortSignal.timeout(8000)});if(!response.ok)return null;const result=await response.json();return result?.id&&result?.email_confirmed_at?result:null})());
  async function homeProject(projectId,token){
   if(!UUID.test(projectId))return null;
   let filter;if(TOKEN.test(token||''))filter='&access_hash=eq.'+await digest(token);else{const account=await user();if(!account)return null;filter='&owner_user_id=eq.'+encodeURIComponent(account.id)}
   const rows=await db('platform_projects?select=id,access_hash&id=eq.'+projectId+filter);return rows[0]||null;
  }
  const signedPhotos=async photos=>Promise.all((photos||[]).filter(p=>p.status==='ready').map(async p=>{
   try{const res=await fetcher(base+'/storage/v1/object/sign/platform-project-photos/'+p.storage_path,{method:'POST',headers:dbHeaders,body:JSON.stringify({expiresIn:1800}),signal:AbortSignal.timeout(8000)});if(!res.ok)return {id:p.id,unavailable:true};const data=await res.json();const path=data.signedURL||data.signedUrl;return {id:p.id,url:path?.startsWith('/')?base+'/storage/v1'+path:path}}catch{return {id:p.id,unavailable:true}}
  }));
  async function member(businessId){
   const authorization=request.headers.get('authorization')||'';if(!authorization.startsWith('Bearer '))return null;
   const response=await fetcher(base+'/auth/v1/user',{headers:{apikey:key,authorization},signal:AbortSignal.timeout(8000)});if(!response.ok)return null;const user=await response.json();
   const memberships=await db('platform_business_members?select=business_id,role,business:platform_businesses(id,slug,name)&user_id=eq.'+encodeURIComponent(user.id));
   const membership=businessId?memberships.find(m=>m.business_id===businessId):memberships[0];return membership?{...membership,user,memberships}:null;
  }
  try{
   const action=new URL(request.url).searchParams.get('action')||'providers';
   if(action==='providers'&&request.method==='GET'){
    const providers=await db('platform_businesses?select=slug,name,website,phone,state,cities&active=eq.true&accepting_requests=eq.true&order=created_at.asc');
    return json({providers,services:SERVICES,pilot:true,intake_challenge:challengeConfig(),auth_challenge:{required:!!env('AUTH_TURNSTILE_SITE_KEY'),site_key:env('AUTH_TURNSTILE_SITE_KEY')||'',available:true}});
   }
   if(action==='upload'&&request.method==='POST'){
    const project=request.headers.get('x-project-id')||'',token=request.headers.get('x-project-token')||'',mime=(request.headers.get('content-type')||'').split(';')[0];
    if(!UUID.test(project))return json({error:'Private project access is required'},401);
    const owned=await homeProject(project,token);if(!owned)return json({error:'Project not found'},404);
    const bytes=await boundedBody(request,5242880);if(!validImage(bytes,mime))return json({error:'Choose a JPEG, PNG or WebP photo up to 5 MB'},400);
    const slot=await rpc('platform_reserve_photo',{project,access_key_hash:owned.access_hash,photo_mime:mime,byte_size:bytes.length});
    if(!slot)return json({error:'Project not found'},404);if(slot.error)return json({error:'Five photos are already saved or uploading'},409);
    const path=base+'/storage/v1/object/platform-project-photos/'+slot.path;
    try{
     const uploaded=await fetcher(path,{method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':mime,'x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(25000)});
     if(!uploaded.ok)throw Error('upload_error');
     await db('platform_photos?id=eq.'+slot.id,{status:'ready'},'PATCH');return json({ok:true,id:slot.id},201);
    }catch{
     // Metadata and object cleanup are independent best-effort operations.
     // A failed metadata write must not skip deletion of this reserved object.
     try{await db('platform_photos?id=eq.'+slot.id,{status:'failed'},'PATCH')}catch{}
     try{await fetcher(path,{method:'DELETE',headers:dbHeaders,signal:AbortSignal.timeout(8000)})}catch{}
     return json({error:'Photo upload could not be confirmed. Refresh the project and retry only missing photos.'},502);
    }
   }
   let body={};if(request.method==='POST'){try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,12000)))}catch(error){if(error.message==='too_large')return json({error:'Request is too large'},413);return json({error:'Invalid request'},400)}}
   if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid request'},400);
   const text=k=>typeof body[k]==='string'?body[k].trim():'';
   if(['pro-review','pro-availability'].includes(action)&&request.method==='POST'){
    if(!UUID.test(text('business_id')))return json({error:'Workspace access required'},403);
    const access=await member(text('business_id'));if(!access)return json({error:'Workspace access required'},403);
    let result;
    if(action==='pro-review'){
     if(!UUID.test(text('project_id'))||!Number.isInteger(body.expected_revision)||body.expected_revision<0||!['unreviewed','qualified','not_fit'].includes(text('qualification'))||typeof body.notes!=='string'||body.notes.length>4000)return json({error:'Check the review and notes (up to 4,000 characters)'},400);
     result=await rpc('platform_save_review',{project:text('project_id'),business:access.business_id,actor:access.user.id,expected_revision:body.expected_revision,qualification_value:text('qualification'),note_value:body.notes.trim()});
    }else{
     if(access.role!=='owner')return json({error:'Only the business owner can change request availability'},403);
     if(typeof body.accepting_requests!=='boolean'||typeof body.expected_current!=='boolean')return json({error:'Invalid availability change'},400);
     result=await rpc('platform_set_availability',{business:access.business_id,actor:access.user.id,accepting:body.accepting_requests,expected_current:body.expected_current});
    }
    if(result.error)return json({error:result.error==='conflict'?'This item changed in another session. Refresh before saving.':result.error==='not_found'?'Project not found':'Unable to save this workspace change'},result.error==='conflict'?409:result.error==='not_found'?404:403);
    return json({ok:true,...result});
   }
   if(action==='claim-project'&&request.method==='POST'){
    const account=await user();if(!account)return json({error:'Sign in with a confirmed email address first'},401);
    if(!UUID.test(text('project_id'))||!TOKEN.test(text('access_token')))return json({error:'A complete private project link is required'},400);
    const result=await rpc('platform_claim_project',{project:text('project_id'),access_key_hash:await digest(text('access_token')),account_id:account.id});
    return result?json({ok:true}):json({error:'Use the confirmed account email from this request and its original private link. This project could not be linked.'},403);
   }
   if(['conversation','message','visit-request','visit-update'].includes(action)&&request.method==='POST'){
    if(!UUID.test(text('project_id')))return json({error:'Project not found'},404);
    let businessId='',accessHash='';
    if(text('business_id')){
     if(!UUID.test(text('business_id')))return json({error:'Workspace access required'},403);
     const access=await member(text('business_id'));if(!access)return json({error:'Workspace access required'},403);businessId=access.business_id;
    }else{
     const project=await homeProject(text('project_id'),text('access_token'));if(!project)return json({error:'Project not found'},404);accessHash=project.access_hash;
    }
    const owned=await db('platform_projects?select=id&id=eq.'+text('project_id')+(businessId?'&business_id=eq.'+businessId:'&access_hash=eq.'+accessHash));
    if(!owned.length)return json({error:'Project not found'},404);
    if(action==='conversation'){
     const project='project_id=eq.'+text('project_id');
     const [messages,visits]=await Promise.all([db('platform_messages?select=id,author,body,created_at&'+project+'&order=created_at.desc,id.desc&limit=100'),db('platform_visits?select=id,preferred_date,time_window,status,created_at,updated_at&'+project+'&order=created_at.desc&limit=10')]);
     return json({messages:messages.reverse(),visits,time_zone:'America/New_York',message_limit:100});
    }
    if(action==='message'&&(!UUID.test(text('request_key'))||text('message').length<1||text('message').length>2000))return json({error:'Write a message of up to 2,000 characters'},400);
    if(action==='visit-request'&&(!UUID.test(text('request_key'))||!/^\d{4}-\d{2}-\d{2}$/.test(text('preferred_date'))||!['Morning','Afternoon','Flexible'].includes(text('time_window'))||businessId))return json({error:'Choose a date and preferred time window'},400);
    if(action==='visit-request'&&(!Number.isFinite(Date.parse(text('preferred_date')+'T12:00:00Z'))||new Date(text('preferred_date')+'T12:00:00Z').toISOString().slice(0,10)!==text('preferred_date')))return json({error:'Choose a valid date'},400);
    if(action==='visit-update'&&(!UUID.test(text('visit_id'))||!(businessId?['confirmed','declined']:['cancelled']).includes(text('decision'))))return json({error:'This visit action is not available'},400);
    const result=await rpc('platform_interact',{payload:{action,project_id:text('project_id'),business_id:businessId,access_hash:accessHash,body:text('message'),request_key:text('request_key'),preferred_date:text('preferred_date'),time_window:text('time_window'),visit_id:text('visit_id'),decision:text('decision')}});
    if(result.error){const errors={not_found:'Project not found',forbidden:'This action is not available',invalid:'Choose a valid date within the next 180 days',open_visit:'A visit is already requested or confirmed. Cancel it before requesting another.',conflict:'This item has changed. Refresh and try again.',limit:'The pilot activity limit has been reached for this project.'};return json({error:errors[result.error]||'Unable to save this update'},result.error==='not_found'?404:result.error==='limit'?429:409)}
    return json({ok:true,...result});
   }
   if(action==='provider-interest'&&request.method==='POST'){
    const states='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
    let website=text('business_website');if(website){try{const url=new URL(website);if(url.protocol!=='https:'||url.username||url.password||url.href.length>300)throw Error();website=url.href}catch{return json({error:'Use an HTTPS business website URL'},400)}}
    if(text('business_name').length<2||text('business_name').length>120||!/^\S+@\S+\.\S+$/.test(text('email'))||text('email').length>254||!states.includes(text('state'))||text('city').length<2||text('city').length>100||body.consent!==true||text('website'))return json({error:'Check your business details and contact permission'},400);
    const rejected=await challenge(body.challenge_token,'provider_interest');if(rejected)return rejected;
    const result=await rpc('platform_record_provider_interest',{payload:{business_name:text('business_name'),email:text('email').toLowerCase(),state:text('state'),city:text('city'),website}});return result.error?json({error:'The pilot interest limit has been reached. Please contact Buzzie support.'},429):json(result,201);
   }
   if(action==='create'&&request.method==='POST'){
    const email=text('email').toLowerCase();let phone=text('phone').replace(/\D/g,'');if(phone.length===11&&phone[0]==='1')phone=phone.slice(1);
    if(!UUID.test(text('request_key'))||!TOKEN.test(text('access_token'))||text('full_name').length<2||text('full_name').length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!/^\d{10}$/.test(phone)||text('city').length<2||text('city').length>100||text('state')!=='SC'||!/^\d{5}$/.test(text('zip'))||!SERVICES.includes(text('service'))||!['Home','Business'].includes(text('property_type'))||!TIMINGS.includes(text('timing'))||text('budget').length>100||text('details').length<10||text('details').length>4000||body.contact_consent!==true||text('website')||text('provider_slug')!=='r-painters-llc')return json({error:'Check the project details and contact permission'},400);
    const rejected=await challenge(body.challenge_token,'project_request');if(rejected)return rejected;
    // Pilot limits are enforced atomically in PostgreSQL; contact details remain unverified.
    const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,100);
    const result=await rpc('platform_create_project',{payload:{request_key:text('request_key'),access_hash:await digest(text('access_token')),ip_hash:await digest(key+'|'+ip),provider_slug:text('provider_slug'),full_name:text('full_name'),email,phone,city:text('city'),state:text('state'),zip:text('zip'),service:text('service'),property_type:text('property_type'),timing:text('timing'),budget:text('budget'),details:text('details'),utm_source:text('utm_source').slice(0,200),utm_campaign:text('utm_campaign').slice(0,200)}});
    if(result.error)return json({error:result.error==='outside_pilot_area'?'No participating painting company is currently accepting requests for this location.':result.error==='rate_limited'?'The pilot request limit has been reached. Please contact Buzzie support.':'This request cannot be repeated with a different private key.'},result.error==='rate_limited'?429:409);
    if(!result.duplicate&&env('LEAD_NOTIFICATIONS_ENABLED')==='true')defer(fetcher(base+'/functions/v1/notify-leads',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(25000)}).catch(()=>{}));
    return json({ok:true,project_id:result.id,duplicate:!!result.duplicate},result.duplicate?200:201);
   }
   const selection='id,created_at,property_type,timing,budget,contact_verified,lead:leads(full_name,email,phone,city,zip,service,details,status),business:platform_businesses(id,slug,name,phone,website),photos:platform_photos(id,storage_path,status),events:platform_events(status,created_at)';
   if(action==='home-projects'&&request.method==='GET'){
    const account=await user();if(!account)return json({error:'Sign in with a confirmed email address first'},401);
    const projects=await db('platform_projects?select=id,created_at,lead:leads(service,city,status)&owner_user_id=eq.'+encodeURIComponent(account.id)+'&order=created_at.desc&limit=100');
    return json({projects,email:account.email});
   }
   if(action==='lookup'&&request.method==='POST'){
    const owned=await homeProject(text('project_id'),text('access_token'));if(!owned)return json({error:'Project not found'},404);
    const rows=await db('platform_projects?select='+selection+'&id=eq.'+owned.id);
    if(!rows.length)return json({error:'Project not found'},404);const project=rows[0];project.photos=await signedPhotos(project.photos);return json({project});
   }
   if(action==='pro-list'&&request.method==='GET'){
    const chosen=new URL(request.url).searchParams.get('business_id');if(chosen&&!UUID.test(chosen))return json({error:'Invalid workspace'},400);
    const access=await member(chosen);if(!access)return json({error:'An approved business account is required'},403);
    const projects=await db('platform_projects?select='+selection+'&business_id=eq.'+access.business_id+'&order=created_at.desc&limit=100');
    const [reviews,profile]=await Promise.all([db('platform_project_reviews?select=project_id,qualification,notes,revision,updated_at&business_id=eq.'+access.business_id),db('platform_businesses?select=id,name,state,cities,zip_prefix,active,accepting_requests&id=eq.'+access.business_id)]);
    const byProject=new Map(reviews.map(r=>[r.project_id,r]));
    for(const project of projects){project.photos=await signedPhotos(project.photos);project.review=byProject.get(project.id)||{qualification:'unreviewed',notes:'',revision:0};}
    return json({business:access.business,coverage:profile[0],role:access.role,memberships:access.memberships.map(m=>({business_id:m.business_id,name:m.business.name})),projects,can_review_interest:(env('ADMIN_USER_IDS')||'').split(',').includes(access.user.id)});
   }
   if(action==='interest-list'&&request.method==='GET'){
    const access=await member();if(!access||!(env('ADMIN_USER_IDS')||'').split(',').includes(access.user.id))return json({error:'Platform owner access required'},403);
    return json({applications:await db('platform_provider_interest?select=business_name,email,state,city,website,created_at&order=created_at.desc&limit=100')});
   }
   if(action==='status'&&request.method==='POST'){
    if(!UUID.test(text('project_id'))||!UUID.test(text('business_id'))||!['new','contacted','visit_scheduled','quoted','won','lost'].includes(text('status')))return json({error:'Invalid status update'},400);
    const access=await member(text('business_id'));if(!access)return json({error:'Workspace access required'},403);
    const updated=await rpc('platform_set_status',{project:text('project_id'),business:access.business_id,next_status:text('status')});return updated?json({ok:true}):json({error:'Project not found'},404);
   }
   return json({error:'Unknown platform action'},400);
  }catch(error){return json({error:error?.message==='too_large'?'File exceeds the 5 MB limit':'Unable to complete the request. Please retry.'},error?.message==='too_large'?413:502)}
 };
}
if(typeof Deno!=='undefined')Deno.serve(makePlatformHandler(k=>Deno.env.get(k),fetch,p=>EdgeRuntime.waitUntil(p)));

