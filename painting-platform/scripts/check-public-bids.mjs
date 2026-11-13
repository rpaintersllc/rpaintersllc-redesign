// Read-only catalog validation. Does not write BUZZIE/CRM records or contact anyone.
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/buzzie-opportunities/index.ts',import.meta.url),'utf8');
const {parseBidCatalog}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const get=async url=>{const r=await fetch(url,{headers:{'user-agent':'RPaintersDiscovery/1.0 (+https://rpaintersllc.com)'},redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Public source unavailable');const b=await r.arrayBuffer();if(b.byteLength>2000000)throw Error('Public source too large');return new TextDecoder().decode(b)};
const robots=await get('https://scbo.sc.gov/robots.txt');if(/Disallow:\s*\/(?:online-edition|\*)/i.test(robots)||/^Disallow:\s*\/\s*$/im.test(robots))throw Error('Public source policy disallows collection');
const delay=Math.max(10,...[...robots.matchAll(/^Crawl-delay:\s*([\d.]+)/gim)].map(m=>Number(m[1])));if(!Number.isFinite(delay)||delay>15)throw Error('Review source crawl delay');await new Promise(r=>setTimeout(r,delay*1000));
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
console.log(JSON.stringify({checked_at:new Date().toISOString(),...parseBidCatalog(await get('https://scbo.sc.gov/online-edition?c=3-'+day)),limits:'Catalog candidates only. Original documents, eligibility and profitability remain unverified.'},null,2));
