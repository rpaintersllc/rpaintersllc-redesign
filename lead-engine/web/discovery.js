// Discovery additions use the existing owner session via an injected request function.
export async function showDiscoveryStatus(request, target){
 target.replaceChildren();
 const p=document.createElement('p');target.append(p);
 try{
  const result=await request();
  if(!Array.isArray(result.sources)||!result.sources.length){p.textContent='No completed source checks yet. Click Check connected sources now.';return}
  p.textContent='Latest recorded source checks (a successful check can have zero matches):';
  for(const source of result.sources){
   const line=document.createElement('p');
   const stale=Date.now()-new Date(source.checked_at).getTime()>60*60*1000;
   line.textContent=source.source_name+' · '+source.status+(stale?' · stale':'')+' · '+new Date(source.checked_at).toLocaleString('en-US')+' · '+source.items_seen+' listings checked · '+source.matches+' qualifying candidates';
   target.append(line);
  }
  for(const source of result.configured_sources||[]){if(!result.sources.some(s=>s.source_id===source.id)){const line=document.createElement('p');line.textContent=source.name+' · Connected; awaiting first check';target.append(line)}}
  if(!(result.configured_sources||[]).some(s=>s.kind==='homeowner_request'&&s.enabled)){
   const line=document.createElement('p');line.textContent='Homeowner request feeds are not connected. Commercial bid monitoring alone does not find homeowner inquiries.';target.append(line);
  }
 }catch(e){p.textContent=e.message}
}

export function showDiscoveryEvidence(row, card){
 function line(text){const p=document.createElement('p');p.textContent=text;card.append(p)}
 const notice=Array.isArray(row.opportunity_notifications)?row.opportunity_notifications[0]:row.opportunity_notifications;
 if(notice)line('Opportunity alert: '+({pending:'Pending',processing:'Processing',accepted:'Accepted by email provider; inbox delivery unconfirmed',failed:'Failed — check notification setup'}[notice.status]||notice.status));
 if(!row.discovery_source_id)return;
 line((row.opportunity_kind==='homeowner_request'?'Possible customer request':'Commercial bid')+' · Original source review required');
 if(row.published_at)line('Feed publication time: '+new Date(row.published_at).toLocaleString('en-US')+' (original post time unconfirmed)');
 if(row.deadline)line('Deadline: '+new Date(row.deadline).toLocaleString('en-US'));
 for(const reason of row.match_reasons||[])line(reason);
 if(row.suggested_response){const label=document.createElement('label');label.textContent='Suggested reply — review before using';const text=document.createElement('textarea');text.readOnly=true;text.value=row.suggested_response;label.append(text);card.append(label)}
}
