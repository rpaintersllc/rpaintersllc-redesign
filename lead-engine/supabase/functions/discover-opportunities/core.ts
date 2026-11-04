const SERVICE=/\b(paint(?:er|ers|ing|ed|s)?|repaint(?:ing|ed)?|drywall|sheetrock|cabinet refinishing|pint(?:or(?:es)?|ura|ar)|yeso|popcorn (?:ceiling|removal)|(?:deck|fence) stain(?:ing)?)\b/i;
const INTENT=/\b(looking for|need(?:ing)?|seeking|recommend(?:ation|ations)?|can anyone|iso|in search of|request(?:ing)? (?:a )?(?:quote|estimate)|who (?:can|does)|wanted|solicit(?:ing)?|busco|buscando|necesito|necesitamos|recomienda(?:n)?|recomendaciones|alguien que)\b/i;
const AD=/\b(we (?:offer|provide|specialize)|our (?:painting|services|company)|call (?:us|today)|free estimates|now hiring|painters? wanted|jobs? available|join our (?:team|crew)|ofrecemos|nuestros servicios|estimados gratis|presupuestos gratis|se solicita(?:n)? pintor(?:es)?)\b/i;
const CLOSED=/\b(no longer (?:need|looking)|found (?:a|our) painter|position filled|bid (?:closed|cancelled|canceled)|already hired|ya (?:encontre|contrate)|ya no (?:necesito|busco))\b/i;
const AREAS=['north charleston','mount pleasant','summerville','charleston','west ashley','goose creek','ladson','hanahan','james island','johns island','daniel island','cane bay','isle of palms',"sullivan's island",'folly beach','moncks corner','kiawah','seabrook'];
export function originalURL(value,depth=0){
 if(depth>2)throw Error('invalid_original_url');const url=new URL(value);
 if(['www.google.com','google.com'].includes(url.hostname)&&url.pathname==='/url')return originalURL(url.searchParams.get('url')||url.searchParams.get('q')||'',depth+1);
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.href.length>1000||!url.hostname.includes('.')||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(url.hostname))throw Error('invalid_original_url');
 for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||['fbclid','gclid'].includes(key))url.searchParams.delete(key);
 url.searchParams.sort();url.hash='';return url.href;
}
export function allowedSource(source){
 try{const url=new URL(source.source_url);if(url.username||url.password||url.port||url.protocol!=='https:')return false;
 if(source.adapter==='civic_bids')return url.href==='https://www.charleston-sc.gov/Bids.aspx';
 return source.adapter==='google_alerts'&&['www.google.com','google.com'].includes(url.hostname)&&/^\/alerts\/feeds\/\d{1,100}\/\d{1,100}$/.test(url.pathname)&&!url.search&&!url.hash;
 }catch{return false}
}
function timestamp(value){if(!value||!/(?:Z|[+-]\d\d:?\d\d|GMT|UTC)$/i.test(value.trim()))return null;const time=Date.parse(value);return Number.isFinite(time)?time:null}
export function qualify(item,kind,clock=Date.now()){
 const text=(item.title+' '+(item.summary||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'');const service=SERVICE.exec(text);
 if(!service)return {reason:'unrelated_service'};
 if(/\b(?:Charleston[, ]+(?:WV|West Virginia)|Summerville[, ]+(?:GA|Georgia))\b/i.test(text))return {reason:'outside_service_area'};
 if(CLOSED.test(text))return {reason:'closed_or_filled'};
 const city=AREAS.find(a=>new RegExp('\\b'+a+'\\b','i').test(text));
 const published=timestamp(item.published_at),deadline=timestamp(item.deadline);
 if(published!==null&&published>clock+300000)return {reason:'future_timestamp'};
 if(deadline!==null&&deadline<=clock)return {reason:'expired'};
 if(kind==='homeowner_request'){
  if(AD.test(text))return {reason:'advertisement_or_employment'};
  if(!city)return {reason:'location_unconfirmed'};
  if(!INTENT.test(text))return {reason:'request_intent_unconfirmed'};
  if(published===null)return {reason:'publication_time_unconfirmed'};
  if(published<clock-86400000)return {reason:'older_than_24_hours'};
 }else if(item.open!==true)return {reason:'open_status_unconfirmed'};
 let url;try{url=originalURL(item.source_url)}catch{return {reason:'invalid_original_url'}}
 const reasons=['Service mentioned: '+service[0],'Area: '+(city||'Charleston public authority'),kind==='homeowner_request'?'Request language found; feed time within 24 hours. Original post time still needs review.':'Source lists this bid as open; verify scope, addenda and requirements.'];
 return {row:{title:item.title.slice(0,200),summary:(item.summary||'').slice(0,2000),source_url:url,city:city||'Charleston',opportunity_kind:kind,published_at:published===null?null:new Date(published).toISOString(),deadline:deadline===null?null:new Date(deadline).toISOString(),match_reasons:reasons,verification_status:'needs_original_review',suggested_response:kind==='homeowner_request'?'Hi! I’m Francisco with R Painters LLC. Would a free site visit work for you, or would you prefer to share pictures and which walls, ceilings or trim you’d like painted?':null}};
}
export function makeParsers(Parser){
 const parse=(text,type)=>new Parser().parseFromString(text,type);
 const plain=text=>(parse('<body>'+text+'</body>','text/html').documentElement?.textContent||'').replace(/\s+/g,' ').trim();
 function feed(text){
  if(/<!\s*(?:DOCTYPE|ENTITY)/i.test(text))throw Error('invalid_feed');const doc=parse(text,'text/xml');
  if(!['feed','rss','RDF'].includes(doc.documentElement?.localName.split(':').pop()))throw Error('invalid_feed');
  const nodes=[],pending=[doc.documentElement];while(pending.length){const node=pending.pop();if(!node)continue;nodes.push(node);for(const child of [...node.children].reverse())pending.push(child)}
  const local=n=>n.localName.split(':').pop();const entries=nodes.filter(n=>['entry','item'].includes(local(n)));
  return entries.slice(0,100).map(entry=>{
   const children=[...entry.children];const field=(...names)=>children.find(n=>names.includes(local(n)))?.textContent||'';
   const link=children.find(n=>local(n)==='link'&&(!n.getAttribute('rel')||n.getAttribute('rel')==='alternate'));
   return {title:plain(field('title')),summary:plain(field('content','summary','description')),source_url:link?.getAttribute('href')||link?.textContent||'',published_at:field('published','pubDate','date')};
  });
 }
 function civic(text){
  const doc=parse(text,'text/html');const rows=[...doc.querySelectorAll('.listItemsRow.bid')];if(!rows.length)throw Error('source_format_changed');
  return rows.slice(0,100).map(row=>{const a=row.querySelector('.bidTitle a'),status=row.querySelector('.bidStatus')?.textContent.replace(/\s+/g,' ').trim()||'';
   const summary=row.textContent.replace(/\s+/g,' ').trim();const match=/(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}) ([AP]M)/.exec(status);let deadline=null;
   if(match){const [,m,d,y,h,min,ampm]=match;const hour=Number(h)%12+(ampm==='PM'?12:0);const desired=Date.UTC(+y,+m-1,+d,hour,+min);
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(desired));const get=k=>Number(parts.find(p=>p.type===k).value);
    const displayed=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));deadline=new Date(desired+(desired-displayed)).toISOString();
   }
   return {title:a?.textContent.trim()||'',summary,source_url:new URL(a?.getAttribute('href')||'', 'https://www.charleston-sc.gov/Bids.aspx').href,open:/\bOpen\b/.test(status)&&!/\b(Closed|Awarded|Cancelled)\b/i.test(status),deadline};
  });
 }
 return {feed,civic};
}
export function robotsAllow(text,path){
 const groups=[];let agents=[],rules=[],hasRules=false;
 for(const raw of text.split(/\r?\n/)){const line=raw.split('#')[0].trim();const i=line.indexOf(':');if(i<0)continue;const key=line.slice(0,i).toLowerCase(),value=line.slice(i+1).trim();
  if(key==='user-agent'){if(hasRules){groups.push({agents,rules});agents=[];rules=[];hasRules=false}agents.push(value.toLowerCase())}
  else if(['disallow','allow'].includes(key)&&agents.length){hasRules=true;if(value)rules.push({allow:key==='allow',path:value})}
 }groups.push({agents,rules});
 const exact=groups.filter(g=>g.agents.some(a=>a!=='*'&&'rpaintersdiscovery'.includes(a)));const selected=exact.length?exact:groups.filter(g=>g.agents.includes('*'));
 const matching=selected.flatMap(g=>g.rules).filter(r=>path.startsWith(r.path)).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return !matching.length||matching[0].allow;
}
export async function boundedGet(url,fetcher=fetch){
 const response=await fetcher(url,{headers:{'user-agent':'RPaintersDiscovery/1.0 (+https://rpaintersllc.com)'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('source_http_'+response.status);const reader=response.body?.getReader();if(!reader)throw Error('source_empty');let bytes=0;const chunks=[];
 try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>2000000)throw Error('source_too_large');chunks.push(chunk.value)}}finally{await reader.cancel().catch(()=>{})}
 const merged=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.length}return new TextDecoder().decode(merged);
}
