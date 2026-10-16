// No service credentials are returned to clients. Public traffic stays disabled by default.
export function makeHandler(env, fetcher = fetch) {
 const origins = (env('ALLOWED_ORIGINS') || 'http://localhost:5173').split(',');
 return async request => {
  const origin = request.headers.get('origin') || '';
  const headers = {'content-type':'application/json','cache-control':'no-store','vary':'Origin', ...(origins.includes(origin) ? {'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'POST,OPTIONS'} : {})};
  const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
  if (!origins.includes(origin)) return json({error:'Forbidden origin'},403);
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return json({error:'Method not allowed'},405);
  if (env('LEAD_ENGINE_PUBLIC_SUBMISSIONS_ENABLED') !== 'true') return json({error:'Submissions are not yet enabled'},503);
  let body;
  try {
   const reader=request.body?.getReader(); let size=0; const chunks=[];
   if (!reader) return json({error:'Invalid body'},400);
   while(true){const {done,value}=await reader.read(); if(done)break; size+=value.byteLength; if(size>12000){await reader.cancel();return json({error:'Payload too large'},413)} chunks.push(value)}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
   body=JSON.parse(new TextDecoder().decode(bytes));
   if(!body || typeof body!=='object' || Array.isArray(body)) return json({error:'Invalid JSON'},400);
  } catch { return json({error:'Invalid JSON'},400); }
  const value = key => typeof body[key] === 'string' ? body[key].trim() : '';
  const lead = Object.fromEntries(['request_key','full_name','email','city','zip','service','details'].map(k=>[k,value(k)]));
  lead.email=lead.email.toLowerCase(); lead.phone=value('phone').replace(/\D/g,'');
  if(lead.phone.length===11 && lead.phone.startsWith('1'))lead.phone=lead.phone.slice(1);
  const services=['Interior painting','Exterior painting','Cabinet refinishing','Drywall repair','Deck or fence staining','Other painting project'];
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lead.request_key) || lead.full_name.length<2 || lead.full_name.length>120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || lead.email.length>254 || !/^\d{10}$/.test(lead.phone) || lead.city.length<2 || lead.city.length>100 || !/^\d{5}$/.test(lead.zip) || !services.includes(lead.service) || lead.details.length<10 || lead.details.length>4000 || body.contact_consent!==true || value('website')) return json({error:'Check required fields and consent'},400);
  const secret=env('TURNSTILE_SECRET_KEY');
  if(!secret) return json({error:'Bot protection is not configured'},503);
  try {
   const challenge=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret,response:value('captcha_token')})});
   const result=await challenge.json();
   if(!result.success || result.action!=='lead' || !origins.some(o=>new URL(o).hostname===result.hostname))return json({error:'Please complete the bot check again'},400);
   const response=await fetcher(env('SUPABASE_URL')+'/rest/v1/rpc/submit_lead_safe',{method:'POST',headers:{apikey:env('SUPABASE_SERVICE_ROLE_KEY'),authorization:'Bearer '+env('SUPABASE_SERVICE_ROLE_KEY'),'content-type':'application/json'},body:JSON.stringify({payload:{...lead,utm_source:value('utm_source').slice(0,200),utm_campaign:value('utm_campaign').slice(0,200)}})});
   const data=await response.json();
   if(!response.ok)return json({error:'Unable to confirm request'},500);
   if(data.throttled)return json({error:'Too many requests. Please call 843-475-9927.'},429);
   return json({ok:true,request_key:lead.request_key,duplicate:!!data.duplicate},data.duplicate?200:201);
  } catch {return json({error:'Unable to confirm request. Please retry.'},502)}
 };
}
if (typeof Deno !== 'undefined') Deno.serve(makeHandler(key=>Deno.env.get(key)));
