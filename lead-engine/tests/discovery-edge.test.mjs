import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {allowedSource,makeParsers,qualify,originalURL,robotsAllow,boundedGet} from '../supabase/functions/discover-opportunities/core.ts';
import {makeDiscoveryHandler} from '../supabase/functions/discover-opportunities/handler.ts';
import {makeOpportunityNotifyHandler} from '../supabase/functions/notify-opportunities/index.ts';
const require=createRequire(new URL('../discovery/package.json',import.meta.url));
const {DOMParser}=require('linkedom');const parsers=makeParsers(DOMParser);
const clock=Date.parse('2026-10-17T13:00:00Z');
const item={title:'Looking for a painter in Summerville',summary:'Need bedroom painting',published_at:'2026-10-17T12:00:00Z',source_url:'https://example.org/request?utm_source=search'};
test('edge qualification rejects stale, nonlocal, ad and unverified timestamps',()=>{
 assert.equal(qualify(item,'homeowner_request',clock).row.verification_status,'needs_original_review');
 for(const patch of [{published_at:'2026-10-15T12:00:00Z'},{published_at:''},{published_at:'2026-10-17T12:00:00'},
 {title:'Looking for a painter in Boston'},{title:'We offer painting in Summerville. Free estimates'},
 {title:'Looking for a painter in Summerville. Already hired someone'},
 {title:'Looking for a painter in Charleston WV'}])assert.ok(qualify({...item,...patch},'homeowner_request',clock).reason);
});
test('RSS and namespaced Atom parse original links and publication, not updated time',()=>{
 const rss='<rss><channel><item><title>Need painter Summerville</title><link>https://example.org/a</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>';
 assert.equal(parsers.feed(rss).length,1);
 const atom='<atom:feed xmlns:atom="http://www.w3.org/2005/Atom"><atom:entry><atom:title>Looking for painter Summerville</atom:title><atom:link href="https://www.google.com/url?url=https%3A%2F%2Fexample.org%2Fa"/><atom:published>2026-10-17T12:00:00Z</atom:published><atom:updated>2026-10-18T12:00:00Z</atom:updated><atom:content>Paint a room</atom:content></atom:entry></atom:feed>';
 // Google feeds normally use a default namespace; prefixed feeds must work too.
 const defaultFeed=atom.replaceAll('atom:','').replace('xmlns:atom','xmlns');
 const parsed=parsers.feed(defaultFeed)[0];assert.equal(parsed.published_at,'2026-10-17T12:00:00Z');
 assert.equal(parsers.feed(atom)[0].title,parsed.title);
 assert.equal(originalURL(parsed.source_url),'https://example.org/a');
 assert.throws(()=>parsers.feed('<!DOCTYPE rss><rss/>'));
 assert.throws(()=>parsers.feed('<html/>'));
});
test('Civic bid rows stay separate and deadlines honor Eastern daylight and standard time',()=>{
 const html='<div class="listItemsRow bid"><div class="bidTitle"><a href="bids.aspx?bidID=1">Painting fence</a></div><div class="bidStatus">Open 10/22/2026 12:30 PM</div></div><div class="listItemsRow bid"><div class="bidTitle"><a href="bids.aspx?bidID=2">Vending</a></div><div class="bidStatus">Open 11/10/2026 12:00 PM</div></div>';
 const rows=parsers.civic(html);assert.equal(rows.length,2);assert.equal(rows[0].deadline,'2026-10-22T16:30:00.000Z');assert.equal(rows[1].deadline,'2026-11-10T17:00:00.000Z');assert.equal(qualify(rows[1],'commercial_bid',clock).reason,'unrelated_service');
 assert.throws(()=>parsers.civic('<html>Changed layout</html>'));
});
test('source URLs and robots prevent arbitrary fetching and disallowed listing retrieval',()=>{
 for(const url of ['https://127.0.0.1/alerts/feeds/1/2','https://www.google.com.evil.test/alerts/feeds/1/2','http://www.google.com/alerts/feeds/1/2','https://www.google.com/alerts/feeds/1/2?extra=1'])assert.equal(allowedSource({adapter:'google_alerts',source_url:url}),false);
 assert.equal(allowedSource({adapter:'google_alerts',source_url:'https://www.google.com/alerts/feeds/1/2'}),true);
 assert.equal(robotsAllow('User-agent: *\nDisallow: /RSS.aspx','/Bids.aspx'),true);
 assert.equal(robotsAllow('User-agent: *\nDisallow: /','/Bids.aspx'),false);
 assert.equal(robotsAllow('User-agent: *\nDisallow: /\nAllow: /Bids.aspx','/Bids.aspx'),true);
});
test('fetch bounds streamed content, rejects redirects at fetch boundary',async()=>{
 let options;await assert.rejects(boundedGet('https://www.google.com/alerts/feeds/1/2',async(_,o)=>{options=o;return new Response('x'.repeat(2000001))}));assert.equal(options.redirect,'error');
});
const envs={SUPABASE_URL:'https://db.example.test',SUPABASE_SERVICE_ROLE_KEY:'server-key',RESEND_API_KEY:'provider-key',LEAD_NOTIFICATION_FROM:'R Painters <onboarding@resend.dev>',LEAD_NOTIFICATIONS_ENABLED:'true'};
const env=k=>envs[k];
const req=(token='server-key')=>new Request('https://db.example.test/functions/v1/discover-opportunities',{method:'POST',headers:{authorization:'Bearer '+token},body:'{}'});
const source={id:'homeowner-feed-test',name:'Test feed',adapter:'google_alerts',kind:'homeowner_request',source_url:'https://www.google.com/alerts/feeds/1/2'};
test('worker authenticates before storage or source access',async()=>{
 let calls=0;const handler=makeDiscoveryHandler(env,async()=>{calls++;throw Error('must not fetch')},parsers);assert.equal((await handler(req('stranger'))).status,401);assert.equal(calls,0);
});
test('worker deduplicates, saves evidence and finishes lease even when alert wake fails',async()=>{
 const calls=[];const recent={...item,published_at:new Date().toISOString()};
 const fetcher=async(url,o)=>{calls.push({url,o});if(url.endsWith('/rpc/claim_discovery_scan'))return Response.json('lease');
 if(url.includes('/discovery_sources?'))return Response.json([source]);
 if(url.startsWith('https://www.google.com/alerts/feeds/'))return new Response('<feed/>');
 if(url.includes('/opportunities?')){const rows=JSON.parse(o.body);assert.equal(rows.length,1);assert.equal(rows[0].verification_status,'needs_original_review');return Response.json([{id:'saved'}])}
 if(url.endsWith('/discovery_scans'))return Response.json([]);
 if(url.endsWith('/functions/v1/notify-opportunities'))throw Error('Provider wake failed');
 if(url.endsWith('/rpc/finish_discovery_scan'))return Response.json(null);throw Error('Unexpected '+url)};
 const result=await (await makeDiscoveryHandler(env,fetcher,{feed:()=>[recent,recent]})(req())).json();assert.equal(result.new_saved,1);assert.equal(result.sources[0].matches,1);assert.ok(calls.at(-1).url.endsWith('finish_discovery_scan'));
});
test('source failures stay visible and never include private feed URL or exception',async()=>{
 const fetcher=async(url)=>{if(url.endsWith('claim_discovery_scan'))return Response.json('lease');if(url.includes('discovery_sources?'))return Response.json([source]);if(url.startsWith('https://www.google.com/'))throw Error('private-feed-identifier');return Response.json([])};
 const result=await (await makeDiscoveryHandler(env,fetcher,parsers)(req())).json();assert.equal(result.sources[0].status,'error');assert.doesNotMatch(JSON.stringify(result),/private-feed-identifier|\/alerts\/feeds\//);
});
test('opportunity notification uses separate queue and idempotency key with fixed owner mailbox',async()=>{
 let sent;const fetcher=async(url,o)=>{if(url.endsWith('claim_opportunity_notification'))return Response.json({id:'job',opportunity_id:'opportunity',lease_token:'lease'});if(url==='https://api.resend.com/emails'){sent=o;return Response.json({id:'provider'})}if(url.endsWith('finish_opportunity_notification'))return Response.json(true);throw Error('Unexpected endpoint')};
 const result=await (await makeOpportunityNotifyHandler(env,fetcher)(req())).json();assert.equal(result.status,'accepted');assert.equal(sent.headers['Idempotency-Key'],'opportunity-alert/job');assert.deepEqual(JSON.parse(sent.body).to,['rpaintersinsc@gmail.com']);assert.match(JSON.parse(sent.body).text,/Review the original source/);
});
