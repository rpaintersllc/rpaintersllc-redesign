const ORIGIN='https://r-painters-projects.jessicuriel27.chatgpt.site';
const CRM='https://fkhwyhodmjuwegupajtb.supabase.co/functions/v1/buzzie-opportunity-receiver';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const AREAS=['Charleston','Summerville','Mount Pleasant','James Island','Johns Island','Kiawah Island','Seabrook Island','North Charleston','West Ashley','Daniel Island','Goose Creek','Ladson','Hanahan','Cane Bay','Moncks Corner','Isle of Palms',"Sullivan's Island",'Folly Beach'];
export function sourceURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>1000||!/[a-z]\.[a-z]/i.test(u.hostname)||/^(localhost\.|.*\.(?:local|internal)$)/i.test(u.hostname))throw Error('invalid');for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();u.hash='';return u.href}
const date=value=>typeof value==='string'&&/(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
export function assessment(input,state,source,now=Date.now()){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Check the review fields.');
 const text=(k,max)=>{if(typeof input[k]!=='string'||input[k].length>max)throw Error('Check '+k+'.');return input[k].trim()};
 const d={city:text('city',100),project_type:text('project_type',100),description:text('description',4000),relationship:text('relationship',20),priority:text('priority',10),reason:text('reason',2000),published_at:date(input.published_at),deadline:input.deadline?date(input.deadline):null,public_contact:text('public_contact',300)};
 if(!AREAS.includes(d.city)||!['direct','subcontract','unknown'].includes(d.relationship)||!['high','medium','low'].includes(d.priority)||d.project_type.length<3||d.description.length<10)throw Error('Choose a covered area, project type and a clear scope.');
 for(const k of ['original_checked','use_allowed','hiring_intent','open_confirmed','contact_allowed']){if(typeof input[k]!=='boolean')throw Error('Check the verification fields.');d[k]=input[k]}
 if(d.public_contact&&!d.contact_allowed)throw Error('Public contact may be saved only when its use is permitted.');
 if(input.published_at&&!d.published_at||input.deadline&&!d.deadline)throw Error('Use a valid date and time with timezone.');
 if(state==='approved'){
  if(!['original_checked','use_allowed','hiring_intent','open_confirmed'].every(k=>d[k])||d.reason.length<10||d.relationship==='unknown'||!d.published_at)throw Error('Approval needs original-source verification, permitted use, hiring intent, open status, date and a reason.');
  if(/(^|\.)nextdoor\.com$/i.test(new URL(source).hostname))throw Error('Nextdoor is link-only here. Approved export requires a separately permitted integration.');
  if(Date.parse(d.published_at)>now+300000||d.deadline&&Date.parse(d.deadline)<=now||!d.deadline&&Date.parse(d.published_at)<now-7*86400000)throw Error('This opportunity is stale, closed or has a future publication date.');
 }
 return d;
}
async function readBody(request){const reader=request.body?.getReader();if(!reader)throw Error('Invalid request');let size=0,out='';const decoder=new TextDecoder();try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>14000)throw Error('Payload too large');out+=decoder.decode(r.value,{stream:true})}}finally{await reader.cancel().catch(()=>{})}const value=JSON.parse(out+decoder.decode());if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid request');return value}
// Fixed public procurement catalog only. Never fetch social pages or arbitrary submitted URLs.
export function parseBidCatalog(html,now=Date.now()){
 const plain=v=>v.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>Number(n)<1114112?String.fromCodePoint(Number(n)):' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
 const rows=[];let inspected=0;
 for(const block of html.split(/<div class="space"[^>]*>/i)){
  const match=/href=["']\/printad\?a=(\d+)/i.exec(block);if(!match)continue;inspected++;
  const text=plain(block),field=(start,end)=>text.split(start)[1]?.split(end)[0]?.trim()||'';
  const title=field('Project Name:','Agency/Owner:'),location=field('Project Location:','Project Delivery Method:'),description=field('Description:','Documents May Be Obtained From:');
  if(!/\bpaint(?:ing|er|ers)?|drywall|cabinet refinishing|deck staining\b/i.test(title+' '+description))continue;
  const normalized=location.replace(/Mt\.? Pleasant/i,'Mount Pleasant'),city=AREAS.find(c=>normalized.toLowerCase().includes(c.toLowerCase()));if(!city)continue;
  const published=field('Ad Publish Date:','Project Number:'),deadlineText=field('Bid/Submittal Date & Time:','Project Location:');
  const publishedTime=Date.parse(published+' 00:00:00 GMT');const m=/([A-Za-z]+ \d{1,2}, \d{4})\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(deadlineText);let deadline=null;
  if(m){const midnight=Date.parse(m[1]+' 00:00:00 GMT');if(Number.isFinite(midnight)){const requested=new Date(midnight+(Number(m[2])%12+(m[4].toLowerCase()==='pm'?12:0))*3600000+Number(m[3])*60000),parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(requested),get=k=>Number(parts.find(p=>p.type===k)?.value),displayed=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));deadline=new Date(requested.getTime()*2-displayed).toISOString()}}
  if(!deadline||Date.parse(deadline)<=now||!Number.isFinite(publishedTime))continue;
  rows.push({title:title.slice(0,200),source_name:'SCBO public construction catalog',source_url:'https://scbo.sc.gov/printad?a='+match[1],city,published_at:new Date(publishedTime).toISOString(),deadline,summary:description.slice(0,2000),opportunity_kind:'commercial_bid',verification_status:'needs_original_review',match_reasons:['Public construction notice; covered area and painting scope.','Publication calendar date: '+published+'; publication time is not supplied.','Check bid documents, pre-bid eligibility, insurance, registration and profitability before approval.']});
 }
 if(!inspected)throw Error('Public catalog format changed; no records imported.');return {inspected,rows};
}
async function publicText(url,fetcher){const response=await fetcher(url,{redirect:'error',headers:{'user-agent':'RPaintersDiscovery/1.0 (+https://rpaintersllc.com)'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Public source unavailable');const reader=response.body?.getReader();if(!reader)throw Error('Empty public source');let size=0,text='';const decoder=new TextDecoder();try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>2000000)throw Error('Public source too large');text+=decoder.decode(r.value,{stream:true})}}finally{await reader.cancel().catch(()=>{})}return text+decoder.decode()}

export function makeOpportunityHandler(env,fetcher=fetch){return async request=>{
 const headers={'content-type':'application/json','cache-control':'no-store','vary':'Origin',...(request.headers.get('origin')===ORIGIN?{'access-control-allow-origin':ORIGIN,'access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'GET,POST,OPTIONS'}:{})};const reply=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers});
 if(request.headers.get('origin')!==ORIGIN)return reply({error:'Origin not allowed'},403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 try{
 const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');if(!base||!key)return reply({error:'Service unavailable'},503);
 const db=async(path,body,prefer='return=representation')=>{const response=await fetcher(base+'/rest/v1/'+path,{method:body===undefined?'GET':'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json',prefer},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('database');return response.status===204?null:response.json()};const rpc=(name,body)=>db('rpc/'+name,body);
 const bearer=request.headers.get('authorization')||'';if(!bearer.startsWith('Bearer '))return reply({error:'Sign in required'},401);
 const auth=await fetcher(base+'/auth/v1/user',{headers:{apikey:key,authorization:bearer},signal:AbortSignal.timeout(10000)});if(!auth.ok)return reply({error:'Sign in again'},401);const user=await auth.json();let claims;try{const p=bearer.slice(7).split('.');claims=JSON.parse(atob(p[1].replace(/-/g,'+').replace(/_/g,'/')))}catch{return reply({error:'Invalid session'},401)}
 if(!user.email_confirmed_at||claims.sub!==user.id||typeof claims.session_id!=='string'||!/^[a-f0-9-]{36}$/i.test(claims.session_id)||await rpc('platform_active_session',{account_id:user.id,session:claims.session_id})!==true)return reply({error:'Current confirmed session required'},401);
 const members=await db('platform_business_members?select=role,business:platform_businesses!inner(slug)&user_id=eq.'+encodeURIComponent(user.id)+'&role=eq.owner&business.slug=eq.r-painters-llc');if(!members.length)return reply({error:'R Painters owner access required'},403);
 const action=new URL(request.url).searchParams.get('action')||'list';
 if(request.method==='GET'&&action==='list'){
  const [rows,reviews,outbox,attempts,scans,config,publicScan]=await Promise.all([db('opportunities?select=*&order=created_at.desc&limit=200'),db('buzzie_opportunity_reviews?select=*'),db('buzzie_crm_outbox?select=opportunity_id,status,attempts,crm_lead_id,last_result,created_at,sent_at,retry_after'),db('buzzie_crm_attempts?select=opportunity_id,attempt,started_at,finished_at,result&order=started_at.desc&limit=100'),db('discovery_scans?select=source_name,checked_at,status,items_seen,matches,error_code&order=checked_at.desc&limit=6'),db('buzzie_crm_config?select=manual_enabled'),db('buzzie_public_scan?select=started_at,last_result')]);
  return reply({records:rows.map(o=>({...o,workflow:reviews.find(r=>r.opportunity_id===o.id)||{state:o.review_status==='dismissed'?'dismissed':'new',revision:0},sync:outbox.find(q=>q.opportunity_id===o.id)||null,attempts:attempts.filter(a=>a.opportunity_id===o.id)})),scans,public_scan:publicScan[0]||null,manual_sync_enabled:config[0]?.manual_enabled===true,automatic_sync_enabled:false,limit:200});
 }
 let body;try{body=await readBody(request)}catch(e){return reply({error:e.message},400)}
 if(action==='scan-bids'){
  const claim=await rpc('buzzie_claim_public_scan',{});if(!claim)return reply({skipped:true,notice:'A public scan is running or was checked within five minutes.'});
  try{
   const robots=await publicText('https://scbo.sc.gov/robots.txt',fetcher);
   // Fail closed on an explicit catalog restriction. The known source asks for 10 seconds between reads.
   if(/Disallow:\s*\/(?:online-edition|\*)/i.test(robots)||/^Disallow:\s*\/\s*$/im.test(robots))throw Error('Public source policy disallows collection.');
   const delay=Math.max(10,...[...robots.matchAll(/^Crawl-delay:\s*([\d.]+)/gim)].map(m=>Number(m[1])));if(!Number.isFinite(delay)||delay>15)throw Error('Source requires a longer crawl interval.');await new Promise(resolve=>setTimeout(resolve,delay*1000));
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const result=parseBidCatalog(await publicText('https://scbo.sc.gov/online-edition?c=3-'+day,fetcher));let saved=0;
   for(const row of result.rows){const added=await db('opportunities?on_conflict=source_url',row,'resolution=ignore-duplicates,return=representation');saved+=added.length}
   await rpc('buzzie_finish_public_scan',{claim,result_value:{status:'ok',inspected:result.inspected,saved}});return reply({inspected:result.inspected,saved,needs_review:true});
  }catch{await rpc('buzzie_finish_public_scan',{claim,result_value:{status:'error',notice:'Source unavailable, restricted or changed. No verified leads claimed.'}});return reply({error:'Public catalog could not be verified. No access restriction was bypassed.'},502)}
 }
 if(action==='capture'){
  let url;try{url=sourceURL(body.source_url)}catch{return reply({error:'Use a complete original HTTPS source link.'},400)}
  const title=typeof body.title==='string'?body.title.trim():'',source=typeof body.source_name==='string'?body.source_name.trim():'';
  if(title.length<5||title.length>200||source.length<2||source.length>120)return reply({error:'Check the title and source.'},400);
  const rows=await db('opportunities?on_conflict=source_url',{title,source_name:source,source_url:url,opportunity_kind:'manual',verification_status:'needs_original_review'},'resolution=ignore-duplicates,return=representation');return reply({saved:true,duplicate:rows.length===0,id:rows[0]?.id||null},rows.length?201:200);
 }
 if(!UUID.test(body.id||'')||!Number.isInteger(body.expected_revision)||body.expected_revision<0||body.expected_revision>=2147483647)return reply({error:'Refresh the opportunity before saving.'},400);
 const source=(await db('opportunities?select=source_url&id=eq.'+body.id))[0];if(!source)return reply({error:'Opportunity not found'},404);
 if(action==='review'){
  if(!['new','review','approved','dismissed'].includes(body.state))return reply({error:'Invalid review state'},400);let data;try{data=assessment(body.assessment,body.state,source.source_url)}catch(e){return reply({error:e.message},400)}
  const result=await rpc('buzzie_review_opportunity',{opportunity:body.id,actor:user.id,expected:body.expected_revision,state_value:body.state,data});return result.error?reply({error:'Review not saved: '+result.error+'. Refresh before retrying.'},409):reply({review:result});
 }
 if(action==='send'){
  if(body.authorize_send!==true)return reply({error:'Explicit approval for this CRM transfer is required.'},400);
  // Resolve configured credential before acquiring a lease. It is never returned to the browser.
  const secret=await rpc('buzzie_crm_secret',{});if(typeof secret!=='string'||!/^bzcrm_[a-f0-9]{64}$/.test(secret))return reply({error:'CRM server connection is not configured.'},503);
  const claim=await rpc('buzzie_claim_crm',{opportunity:body.id,actor:user.id,expected:body.expected_revision});if(claim.error)return reply({error:'CRM transfer blocked: '+claim.error+'.'},409);if(claim.already_sent)return reply({confirmed:true,duplicate:true,lead_id:claim.crm_lead_id});
  let code='connection_failed',lead=null;
  try{const response=await fetcher(CRM,{method:'POST',headers:{'content-type':'application/json','x-buzzie-key':secret},body:JSON.stringify({action:'import',record:claim.payload}),redirect:'error',signal:AbortSignal.timeout(20000)});if(response.ok){const receipt=await response.json();if(receipt.saved===true&&receipt.reference===claim.payload.reference&&UUID.test(receipt.lead_id||'')){code='confirmed';lead=receipt.lead_id}else code='invalid_receipt'}else code='rejected'}catch{}
  const finished=await rpc('buzzie_finish_crm',{opportunity:body.id,claim:claim.lease_token,lead,result_code:code});if(!finished)return reply({error:'The result could not be recorded. Refresh first; a retry uses the same reference.'},502);
  return lead?reply({confirmed:true,lead_id:lead}):reply({error:'CRM receipt was not confirmed. The opportunity is retained. Review the error and retry manually after one minute.'},502);
 }
 return reply({error:'Unknown action'},400);
 }catch{return reply({error:'Unable to complete this operation. Refresh before retrying.'},502)}
 }};
if(typeof Deno!=='undefined')Deno.serve(makeOpportunityHandler(k=>Deno.env.get(k)));
