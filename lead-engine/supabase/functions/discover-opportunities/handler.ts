import {allowedSource,boundedGet,qualify,robotsAllow} from './core.ts';
export function makeDiscoveryHandler(env,fetcher=fetch,parse){
 return async request=>{
  const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!key||request.headers.get('authorization')!=='Bearer '+key)return json({error:'Internal authorization required'},401);
  const headers={apikey:key,authorization:'Bearer '+key,'content-type':'application/json'};
  const db=async(path,body)=>{const res=await fetcher(base+'/rest/v1/'+path,{headers:{...headers,prefer:'resolution=ignore-duplicates,return=representation'},...(body!==undefined?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error('storage_unavailable');return res.json()};
  let lease=null;
  try{
   const raw=await request.text();if(raw.length>1000)return json({error:'Payload too large'},413);let body;try{body=raw?JSON.parse(raw):{}}catch{return json({error:'Invalid request'},400)}
   lease=await db('rpc/claim_discovery_scan',{force_run:body?.force_run===true});if(!lease)return json({ok:true,skipped:true});
   const sources=await db('discovery_sources?select=*&enabled=eq.true&order=created_at.asc&limit=6');const seen=new Set();
   const results=await Promise.all(sources.map(async source=>{
    const scan={source_id:source.id,source_name:source.name,checked_at:new Date().toISOString(),status:'ok',items_seen:0,matches:0,rejected:{},error_code:null};
    try{
     if(!allowedSource(source))throw Error('source_not_allowed');
     let items;
     if(source.adapter==='civic_bids'){
      const robots=await boundedGet('https://www.charleston-sc.gov/robots.txt',fetcher);if(!robotsAllow(robots,'/Bids.aspx'))throw Error('source_disallowed');
      items=parse.civic(await boundedGet(source.source_url,fetcher));
     }else items=parse.feed(await boundedGet(source.source_url,fetcher));
     scan.items_seen=items.length;const rows=[];
     for(const item of items){const result=qualify(item,source.kind);if(result.reason){scan.rejected[result.reason]=(scan.rejected[result.reason]||0)+1;continue}
      if(seen.has(result.row.source_url))continue;seen.add(result.row.source_url);rows.push({...result.row,source_name:source.name,discovery_source_id:source.id})}
     scan.matches=rows.length;if(rows.length){const inserted=await db('opportunities?on_conflict=source_url',rows);return {scan,saved:inserted.length}}
    }catch(error){scan.status='error';scan.error_code=/^(source_(http_\d+|format_changed|too_large|empty|not_allowed|disallowed)|invalid_feed)$/.test(error?.message)?error.message:'source_or_storage_unavailable'}
    return {scan,saved:0};
   }));
   await db('discovery_scans',results.map(r=>r.scan));
   // Reuse the existing project's sender and authorization, with a dedicated outbox.
   let alert={processed:0};try{const res=await fetcher(base+'/functions/v1/notify-opportunities',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(25000)});if(res.ok)alert=await res.json()}catch{}
   return json({ok:true,new_saved:results.reduce((n,r)=>n+r.saved,0),sources:results.map(r=>r.scan),alert});
  }catch{return json({error:'Discovery service unavailable'},502)}
  finally{if(lease)try{await db('rpc/finish_discovery_scan',{claim_token:lease})}catch{}}
 };
}
