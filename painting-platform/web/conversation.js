import {api,el} from './common.js';
const VISITS={requested:'Awaiting company confirmation',confirmed:'Visit confirmed',declined:'Company could not confirm',cancelled:'Cancelled by homeowner'};
export async function mountConversation(target,access,token,onChange=()=>{}){
 target.replaceChildren();
 const business=!!access.business_id;
 const call=async(action,body)=>api(action,body,typeof token==='function'?await token():token);
 el('h2','Project conversation',target);
 el('p','Messages stay in this workspace. Refresh to check for replies. Email and text notifications are not active for these updates.',target,'small');
 const message=el('p','Loading conversation…',target,'message');message.setAttribute('role','status');
 const refresh=el('button','Refresh conversation',target,'secondary');refresh.type='button';
 const visits=el('section',undefined,target,'visits');
 const thread=el('div',undefined,target,'message-thread');thread.setAttribute('aria-label','Project messages');thread.setAttribute('role','region');thread.tabIndex=0;
 const form=el('form',undefined,target);
 const label=el('label','Your message',form),input=el('textarea',undefined,label);input.required=true;input.maxLength=2000;input.placeholder=business?'Reply about the project or arrange the visit details.':'Ask a question or share more details about your project.';
 const send=el('button','Send message',form);send.type='submit';
 let messageKey='',lastText='',visitKey='',lastVisit='',sending=false,visitBusy=false,visitNeedsRefresh=false,loadRevision=0;
 function visitControls(){for(const control of visits.querySelectorAll('button,input,select'))control.disabled=visitBusy||visitNeedsRefresh;visits.setAttribute('aria-busy',String(visitBusy));refresh.disabled=visitBusy}
 async function saveVisit(action,body,success){
  if(visitBusy)return;
  if(visitNeedsRefresh){message.textContent='Refresh the conversation before changing a visit again.';return}
  visitBusy=true;++loadRevision;visitControls();message.textContent='Saving visit…';
  try{
   await call(action,body);visitNeedsRefresh=true;
   const refreshed=await load();
   message.textContent=refreshed?success:'Visit change saved, but the conversation could not refresh. Refresh before changing the visit again.';
   try{await onChange()}catch{message.textContent+=' Project status could not refresh.'}
  }catch(e){message.textContent=e.message}
  finally{visitBusy=false;visitControls()}
 }
 async function updateVisit(id,decision){await saveVisit('visit-update',{...access,visit_id:id,decision},'Visit updated.')}
 function renderVisits(rows){
  visits.replaceChildren();el('h3','Site visit',visits);el('p','Dates and time windows use Charleston time (Eastern). Confirm the exact arrival time together in the conversation. No calendar is reserved automatically.',visits,'small');
  for(const row of rows){const item=el('article',undefined,visits,'visit-item');const date=new Date(row.preferred_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});el('strong',date+' · '+row.time_window,item);el('p',VISITS[row.status]||row.status,item,'small');
   if(business&&row.status==='requested')for(const [decision,text] of [['confirmed','Confirm this visit'],['declined','Unable to confirm']]){const button=el('button',text,item,'secondary');button.type='button';button.onclick=()=>updateVisit(row.id,decision)}
   if(!business&&['requested','confirmed'].includes(row.status)){const button=el('button','Cancel visit request',item,'secondary');button.type='button';button.onclick=()=>updateVisit(row.id,'cancelled')}
  }
  if(!rows.length)el('p','No site visit requested yet.',visits,'small');
  if(business||rows.some(v=>['requested','confirmed'].includes(v.status)))return;
  const visitForm=el('form',undefined,visits,'visit-request');const dateLabel=el('label','Preferred date',visitForm),dateInput=el('input',undefined,dateLabel);dateInput.type='date';dateInput.required=true;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=k=>parts.find(p=>p.type===k).value;dateInput.min=get('year')+'-'+get('month')+'-'+get('day');
  const timeLabel=el('label','Preferred time',visitForm),timeInput=el('select',undefined,timeLabel);for(const text of ['Morning','Afternoon','Flexible']){const option=el('option',text,timeInput);option.value=text}
  el('p','This is a request, not a booking. The company must confirm availability.',visitForm,'small');const button=el('button','Request a site visit',visitForm);button.type='submit';
  visitForm.onsubmit=async event=>{event.preventDefault();if(visitBusy||visitNeedsRefresh)return;const signature=dateInput.value+'|'+timeInput.value;if(signature!==lastVisit){visitKey=crypto.randomUUID();lastVisit=signature}await saveVisit('visit-request',{...access,request_key:visitKey,preferred_date:dateInput.value,time_window:timeInput.value},'Visit preference saved. Awaiting company confirmation.')};
 }
 async function load(){const revision=++loadRevision;refresh.disabled=true;try{const data=await call('conversation',access);if(revision!==loadRevision)return false;thread.replaceChildren();el('h3','Messages',thread);if(!data.messages.length)el('p','Start the conversation about your project.',thread,'small');for(const row of data.messages){const item=el('article',undefined,thread,'chat-message '+(row.author==='business'?'from-company':'from-homeowner'));el('strong',row.author==='business'?'Painting company':'Homeowner',item);el('p',row.body,item,'scope');el('small',new Date(row.created_at).toLocaleString('en-US'),item)}if(data.messages.length>=100)el('p','Showing the latest 100 messages.',thread,'small');renderVisits(data.visits);visitNeedsRefresh=false;visitControls();message.textContent='Conversation up to date.';return true}catch(e){if(revision===loadRevision)message.textContent=e.message;return false}finally{if(revision===loadRevision)refresh.disabled=visitBusy}}
 form.onsubmit=async event=>{event.preventDefault();if(sending)return;const draft=input.value,text=draft.trim();if(!text){message.textContent='Write a message first.';return}if(text!==lastText){messageKey=crypto.randomUUID();lastText=text}sending=true;send.disabled=true;form.setAttribute('aria-busy','true');message.textContent='Saving message…';try{await call('message',{...access,request_key:messageKey,message:text});if(input.value===draft)input.value='';messageKey='';lastText='';const refreshed=await load();message.textContent=refreshed?'Message saved to the project.':'Message saved, but the conversation could not refresh. Refresh to check replies. Do not resend the saved message.'}catch(e){message.textContent=e.message}finally{sending=false;send.disabled=false;form.removeAttribute('aria-busy')}};

 refresh.onclick=()=>{if(!visitBusy)return load()};await load();
}
