export function makeReceiver(env,fetcher=fetch){return async request=>{
 const reply=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const key=request.headers.get('x-buzzie-key')||'';if(!/^bzcrm_[a-f0-9]{64}$/.test(key))return reply({error:'Unauthorized'},401);
 try{
  const reader=request.body?.getReader();if(!reader)return reply({error:'Invalid request'},400);let size=0,raw='';const decoder=new TextDecoder();try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>14000)return reply({error:'Too large'},413);raw+=decoder.decode(r.value,{stream:true})}}finally{await reader.cancel().catch(()=>{})}
  let body;try{body=JSON.parse(raw+decoder.decode())}catch{return reply({error:'Invalid request'},400)}if(!body||!['import','validate'].includes(body.action)||!body.record||typeof body.record!=='object'||Array.isArray(body.record))return reply({error:'Invalid request'},400);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const base=env('SUPABASE_URL'),server=env('SUPABASE_SERVICE_ROLE_KEY');if(!base||!server)return reply({error:'Unavailable'},503);
  const r=await fetcher(base+'/rest/v1/rpc/crm_receive_buzzie',{method:'POST',headers:{apikey:server,authorization:'Bearer '+server,'content-type':'application/json'},body:JSON.stringify({key_hash:hash,submission:body.record,validate_only:body.action==='validate'}),signal:AbortSignal.timeout(15000)});if(!r.ok)return reply({error:'Unable to save'},502);const result=await r.json();return result.error?reply({error:result.error},result.error==='unauthorized'?401:409):reply(result);
 }catch{return reply({error:'Unable to save'},502)}
}}
if(typeof Deno!=='undefined')Deno.serve(makeReceiver(k=>Deno.env.get(k)));
