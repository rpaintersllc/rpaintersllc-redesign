import {api,$,STATUS,el,drawPhotos} from './common.js';
import {authCall,prepareAuthCheck,authPayload} from './auth-session.js';
import {mountConversation} from './conversation.js';
import {createContractorSession} from './contractor-session.js';
import {mountEstimate} from './estimates.js';
const QUALIFICATION={unreviewed:'Needs review',qualified:'Qualified by your team',not_fit:'Not a fit'};
let authCheck,signingIn=false;$('#signin button').disabled=true;
let workspace='',projects=[],coverage=null,role='',generation=0;
const linkedId=new URLSearchParams(globalThis.location?.search||'').get('project')||'';
let linkedProject=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(linkedId)?linkedId:'';
const contractorSession=createContractorSession(body=>authCall('token?grant_type=refresh_token',body),clear);
const interestPanel=el('section',undefined,$('#workspace'),'panel');interestPanel.hidden=true;
const businessToken=()=>contractorSession.token();
const call=async(action,body)=>{
 const version=generation,token=await businessToken();
 if(token!==contractorSession.peekToken())throw Error('Your contractor sign-in changed. Refresh the workspace.');
 try{return await api(action,body,token)}catch(error){
  if(version===generation&&token===contractorSession.peekToken()&&[401,403].includes(error.status)&&action.split('&')[0]!=='interest-list'){
   clear();$('#message').textContent='Contractor access is unavailable. Sign in again to verify your current permissions.';
  }
  throw error;
 }
};
function clear(){
 generation++;contractorSession.clear();workspace='';projects=[];coverage=null;role='';
 $('#workspace').hidden=true;$('#login').hidden=false;$('#projects').replaceChildren();
 $('#coverage-panel').replaceChildren();$('#business-select').replaceChildren();$('#business-title').textContent='';
 interestPanel.replaceChildren();interestPanel.hidden=true;$('#project-search').value='';
 $('#linked-request').hidden=true;$('#result-count').textContent='';metrics();$('#signin').reset();
}
function metrics(){for(const [id,count]of [['total',projects.length],['new-count',projects.filter(p=>p.lead.status==='new').length],['review-count',projects.filter(p=>p.review.qualification==='unreviewed').length],['won-count',projects.filter(p=>p.lead.status==='won').length]])$('#'+id).textContent=count}
function renderCoverage(){
 const target=$('#coverage-panel');target.replaceChildren();el('h3','Your request coverage',target);if(!coverage)return;
 el('p',coverage.cities.join(', ')+' · '+coverage.state+' · ZIP prefix '+coverage.zip_prefix,target,'small');
 el('p',!coverage.active?'Provider activation is pending.':coverage.accepting_requests?'Receiving eligible new requests':'New requests paused',target,'badge');
 el('p','Availability affects new assignments only. Your existing projects remain accessible. Coverage changes and new provider activation are managed by Buzzie during the pilot.',target,'small');
 if(role!=='owner'){el('p','Only the business owner can pause or resume new requests.',target,'small');return}
 const button=el('button',coverage.accepting_requests?'Pause new requests':'Resume new requests',target,'secondary');button.type='button';
 const snapshot=coverage,business=workspace,version=generation;let savingAvailability=false;
 const current=()=>version===generation&&workspace===business&&coverage===snapshot&&button.isConnected&&contractorSession.hasSession();
 button.onclick=async()=>{
  if(savingAvailability||!current())return;
  const requested=!snapshot.accepting_requests,expected=snapshot.accepting_requests;
  savingAvailability=true;button.disabled=true;button.setAttribute('aria-busy','true');
  try{
   const result=await call('pro-availability',{business_id:business,accepting_requests:requested,expected_current:expected});
   if(!current())return;
   coverage={...snapshot,accepting_requests:result.accepting_requests};renderCoverage();
   $('#message').textContent=result.accepting_requests?'New requests resumed.':'New requests paused. Existing projects stay in your workspace.';
  }catch(e){if(current())$('#message').textContent=e.message}
  finally{savingAvailability=false;button.disabled=false;button.removeAttribute('aria-busy')}
 };
}
function render(){
 const target=$('#projects');target.replaceChildren();const status=$('#status-filter').value,qualification=$('#qualification-filter').value,search=$('#project-search').value.trim().toLowerCase(),activity=$('#message-filter').value;
 const rows=projects.filter(p=>(!linkedProject||p.id===linkedProject)&&(!status||p.lead.status===status)&&(!qualification||p.review.qualification===qualification)&&(!activity||(activity==='none'?!p.message_activity:p.message_activity?.author===activity))&&(!search||[p.lead.full_name,p.lead.city,p.lead.zip,p.lead.service,p.lead.email,p.lead.phone,p.lead.details].join(' ').toLowerCase().includes(search))).sort((a,b)=>$('#sort-order').value==='oldest'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
 $('#linked-request').hidden=!linkedProject;
 $('#result-count').textContent=rows.length+' of '+projects.length+' loaded projects';
 if(!rows.length){el('p',linkedProject?'This request is not in this workspace’s latest 100 projects, or is hidden by your filters. Check the workspace and filters, or show all projects.':projects.length?'No projects match these filters.':'Your assigned homeowner requests will appear here.',target,'empty');return}
 for(const project of rows){
  const access={project_id:project.id,business_id:workspace};const card=el('article',undefined,target,'panel project-card');const statusBadge=el('span',STATUS[project.lead.status]||project.lead.status,card,'badge');el('h3',project.lead.service,card);el('p',project.lead.city+' '+project.lead.zip+' · '+project.property_type+' · '+new Date(project.created_at).toLocaleString('en-US'),card,'small');el('p',project.lead.details,card,'scope');el('p','Timing: '+project.timing+' · Budget: '+(project.budget||'Not specified'),card,'small');el('h3',project.lead.full_name,card);
  const contact=el('p',undefined,card,'small'),phone=el('a',project.lead.phone,contact);phone.href='tel:'+project.lead.phone;el('span',' · ',contact);const email=el('a',project.lead.email,contact);email.href='mailto:'+project.lead.email;el('p','Contact information is supplied by the homeowner. Confirm identity and project scope during follow-up.',card,'small');drawPhotos(project.photos,el('div',undefined,card,'photo-grid'));
  const latest=project.message_activity;el('p',latest?(latest.author==='homeowner'?'Latest message from homeowner':'Latest message from your team')+' · '+new Date(latest.created_at).toLocaleString('en-US'):'No messages yet.',card,'small message-activity');
  const conversationButton=el('button','Messages & site visit',card,'secondary');conversationButton.type='button';const conversationTarget=el('section',undefined,card,'conversation-panel');conversationTarget.hidden=true;conversationButton.onclick=async()=>{conversationTarget.hidden=!conversationTarget.hidden;if(!conversationTarget.hidden){conversationButton.disabled=true;try{await mountConversation(conversationTarget,access,businessToken,()=>{load().catch(e=>$('#message').textContent=e.message)})}finally{conversationButton.disabled=false}}};
  const statusLabel=el('label','Homeowner-visible project status',card),select=el('select',undefined,statusLabel);select.setAttribute('aria-label','Status for '+project.lead.full_name);for(const [value,text]of Object.entries(STATUS)){const option=new Option(text,value);option.selected=value===project.lead.status;select.append(option)}let savingStatus=false;const statusGeneration=generation;
  const currentStatus=()=>statusGeneration===generation&&workspace===access.business_id&&card.isConnected&&contractorSession.hasSession();
  select.onchange=async()=>{
   if(savingStatus||!currentStatus())return;
   const previous=project.lead.status,requested=select.value;savingStatus=true;select.disabled=true;select.setAttribute('aria-busy','true');
   try{
    await call('status',{...access,status:requested});if(!currentStatus())return;
    project.lead.status=requested;select.value=requested;statusBadge.textContent=STATUS[requested];metrics();$('#message').textContent='Status saved. The homeowner’s project page reflects this change.';
   }catch(e){if(currentStatus()){select.value=previous;$('#message').textContent=e.message}}
   finally{savingStatus=false;select.disabled=false;select.removeAttribute('aria-busy')}
  };
  const estimateGeneration=generation;mountEstimate(card,{access,estimate:project.estimate,call,isCurrent:()=>estimateGeneration===generation&&workspace===access.business_id&&contractorSession.hasSession(),onSaved:value=>{project.estimate=value}});
  const details=el('details',undefined,card,'review-details');el('summary','Private contractor review',details);el('p','Visible only to your business team. Qualification is your assessment, not independent verification or a guarantee of a booked job.',details,'small');const form=el('form',undefined,details),qualLabel=el('label','Lead review',form),qual=el('select',undefined,qualLabel);for(const [value,text]of Object.entries(QUALIFICATION)){const option=new Option(text,value);option.selected=value===project.review.qualification;qual.append(option)}const noteLabel=el('label','Internal notes',form),note=el('textarea',undefined,noteLabel);note.maxLength=4000;note.value=project.review.notes;note.placeholder='Scope check, follow-up details, or why this request is a fit.';const button=el('button','Save private review',form);const saved=el('p',project.review.updated_at?'Last saved '+new Date(project.review.updated_at).toLocaleString('en-US'):'Not reviewed yet.',details,'small');saved.setAttribute('role','status');
  let savingReview=false;const reviewGeneration=generation;
  const currentReview=()=>reviewGeneration===generation&&workspace===access.business_id&&card.isConnected&&contractorSession.hasSession();
  form.onsubmit=async event=>{
   event.preventDefault();if(savingReview||!currentReview())return;
   const draft={qualification:qual.value,notes:note.value};savingReview=true;button.disabled=true;form.setAttribute('aria-busy','true');
   try{
    const result=await call('pro-review',{...access,expected_revision:project.review.revision,...draft});
    if(!currentReview())return;
    project.review=result;metrics();
    const edited=qual.value!==draft.qualification||note.value!==draft.notes;
    saved.textContent='Private review saved '+new Date(result.updated_at).toLocaleString('en-US')+(edited?'. Your newer changes are not saved yet.':'');
   }catch(e){if(currentReview())saved.textContent=e.message+' Your unsaved text is still here.'}
   finally{savingReview=false;button.disabled=false;form.removeAttribute('aria-busy')}
  };
 }
}
async function load(){
 const version=++generation;let result;
 try{result=await call('pro-list'+(workspace?'&business_id='+workspace:''))}
 catch(error){if(version!==generation||!contractorSession.hasSession())return false;throw error}
 if(version!==generation||!contractorSession.hasSession())return false;
 workspace=result.business.id;coverage=result.coverage;role=result.role;
 projects=result.projects.map(p=>({...p,review:p.review||{qualification:'unreviewed',notes:'',revision:0}}));
 $('#login').hidden=true;$('#workspace').hidden=false;$('#business-title').textContent=result.business.name;$('#business-select').replaceChildren();
 for(const m of result.memberships){const option=new Option(m.name,m.business_id);option.selected=m.business_id===workspace;$('#business-select').append(option)}
 metrics();renderCoverage();render();interestPanel.replaceChildren();interestPanel.hidden=!result.can_review_interest;
 if(result.can_review_interest){
  try{
   const data=await call('interest-list');if(version!==generation||!contractorSession.hasSession())return false;
   el('h2','Business expansion interest',interestPanel);
   if(!data.applications.length)el('p','No painting businesses have registered interest yet.',interestPanel,'small');
   for(const row of data.applications){const item=el('div',undefined,interestPanel);el('h3',row.business_name,item);el('p',row.city+', '+row.state+' · '+row.email,item,'small')}
  }catch(error){
   if(version!==generation||!contractorSession.hasSession())return false;
   interestPanel.replaceChildren();if([401,403].includes(error.status))interestPanel.hidden=true;else el('p',error.message,interestPanel,'small');
  }
 }
 return true;
}
$('#signin').onsubmit=async event=>{event.preventDefault();if(signingIn)return;signingIn=true;const button=event.target.querySelector('button');button.disabled=true;try{const result=await authCall('token?grant_type=password',authPayload(Object.fromEntries(new FormData(event.target)),authCheck));contractorSession.save(result);if(!await load())return;event.target.reset();$('#message').textContent='Contractor workspace loaded.'}catch(e){clear();$('#message').textContent=e.message}finally{signingIn=false;authCheck?.reset();button.disabled=!authCheck}};
$('#refresh').onclick=async()=>{try{if(await load())$('#message').textContent='Projects refreshed.'}catch(e){$('#message').textContent=e.message}};
for(const id of ['status-filter','qualification-filter','sort-order','message-filter'])$('#'+id).onchange=render;$('#project-search').oninput=render;
$('#show-all-projects').onclick=()=>{linkedProject='';render()};
$('#business-select').onchange=async()=>{workspace=$('#business-select').value;projects=[];render();try{await load()}catch(e){$('#message').textContent=e.message}};
$('#signout').onclick=async()=>{const previous=contractorSession.peekToken();clear();$('#message').textContent='Signed out.';if(previous)try{await authCall('logout',undefined,previous)}catch{}};

try{authCheck=await prepareAuthCheck($('#auth-check'));$('#signin button').disabled=false}catch(e){$('#message').textContent=e.message}
