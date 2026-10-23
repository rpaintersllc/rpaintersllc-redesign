import {api,$,credentials,projectLink,STATUS,el,drawPhotos,remember,validatePhotos,uploadPhoto} from './common.js';
import {mountConversation} from './conversation.js';
import {sessionToken,sessionSnapshot} from './auth-session.js';
const access=credentials();let project,uploading=false,photosFresh=false,loadRevision=0,accountAccess;
const conversation=el('section',undefined,$('#project-content').firstElementChild,'panel');let conversationReady=false;
if(!access.access_token)$('#missing p').textContent='Sign in to your homeowner account, then reopen this project from My account.';
function forgetProject(){
 project=null;accountAccess=null;photosFresh=false;conversationReady=false;conversation.replaceChildren();
 for(const id of ['project-status','project-meta','project-scope','contact-details','business-name','private-link'])$('#'+id).textContent='';
 $('#project-title').textContent='Your project.';$('#photos').replaceChildren();$('#timeline').replaceChildren();$('#photo-input').value='';
 $('#business-phone').textContent='';$('#business-phone').removeAttribute('href');$('#business-website').removeAttribute('href');
}
async function openConversation(){if(!conversationReady&&project){conversationReady=true;await mountConversation(conversation,access,sessionToken,load)}}
async function load(){const revision=++loadRevision;photosFresh=false;let snapshot;
 // Account-backed data may only survive within the session that loaded it.
 if(!access.access_token&&accountAccess&&!accountAccess.isCurrent()){forgetProject();$('#project-content').hidden=true;$('#missing').hidden=false}
 try{const token=access.access_token?await sessionToken():(snapshot=await sessionSnapshot()).token;
 if(snapshot&&!snapshot.isCurrent())throw Error('changed_session');
 const result=await api('lookup',access,token);if(revision!==loadRevision)return false;
 if(snapshot&&!snapshot.isCurrent())throw Error('changed_session');
 project=result.project;accountAccess=snapshot;$('#project-content').hidden=false;$('#missing').hidden=true;$('#message').textContent='Your project is saved. Use this workspace to keep track of what happens next.';$('#project-title').textContent=project.lead.service;$('#project-status').textContent=STATUS[project.lead.status]||project.lead.status;$('#project-meta').textContent=project.lead.city+' · '+project.lead.zip+' · '+project.property_type+' · '+project.timing;$('#project-scope').textContent=project.lead.details;$('#contact-details').textContent='Contact details supplied: '+project.lead.full_name+' · '+project.lead.email+' · '+project.lead.phone;$('#business-name').textContent='Your local painting company';$('#business-phone').textContent=project.business.phone;$('#business-phone').href='tel:'+project.business.phone.replace(/\D/g,'');$('#business-website').href=project.business.website;const timeline=$('#timeline');timeline.replaceChildren();for(const event of project.events.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))){const li=el('li',STATUS[event.status]||event.status,timeline);el('small',new Date(event.created_at).toLocaleString('en-US'),li)}drawPhotos(project.photos,$('#photos'));$('#photo-form').hidden=project.photos.length>=5;$('#private-link').textContent=projectLink(access.project_id,access.access_token);photosFresh=true;return true}catch(e){if(revision!==loadRevision)return false;photosFresh=false;const changedAccount=!access.access_token&&(!snapshot||!snapshot.isCurrent()||(accountAccess&&!accountAccess.isCurrent()));if(changedAccount||[401,403,404].includes(e.status))forgetProject();if(changedAccount)e=Error('Your account session changed or is unavailable. Sign in and reopen this project from My account.');const keep=!!project;$('#message').textContent=keep?'Unable to refresh. Your last loaded project is shown. Refresh before adding more photos.':e.message;$('#missing').hidden=keep;$('#project-content').hidden=!keep;$('#photo-form').hidden=true;return false}}
$('#refresh').onclick=async()=>{await load();await openConversation()};
$('#copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(projectLink(access.project_id,access.access_token));$('#save-message').textContent='Private link copied.'}catch{$('#save-message').textContent='Copy the link shown above, or copy the full address from your browser.'}};
$('#remember').onclick=()=>{try{remember(access);$('#save-message').textContent='Saved in this browser. You can reopen it from My projects.'}catch{$('#save-message').textContent='Browser storage is unavailable. Copy your private link instead.'}};
$('#photo-form').onsubmit=async event=>{
 event.preventDefault();if(uploading)return;
 const input=$('#photo-input'),button=event.target.querySelector('button');
 uploading=true;button.disabled=true;input.disabled=true;
 try{
  if(!photosFresh)throw Error('Refresh the project before adding more photos.');
  const files=[...input.files];if(!files.length)throw Error('Choose at least one photo.');validatePhotos(files);
  if(files.length+(project?.photos.length||0)>5)throw Error('You can save a total of five photos.');
  let confirmed=0,unconfirmed=0;
  for(let i=0;i<files.length;i++){
   $('#photo-message').textContent='Uploading photo '+(i+1)+' of '+files.length+'…';
   try{await uploadPhoto(files[i],access,await sessionToken());confirmed++}catch{unconfirmed++}
  }
  // A lost response may still have saved a photo. Never replay the entire selection.
  input.value='';const refreshed=await load();
  $('#photo-message').textContent=confirmed+' photo(s) confirmed.'+(unconfirmed?' '+unconfirmed+' could not be confirmed. Check the saved photos, then select only missing ones.':'')+(!refreshed?' The gallery could not refresh. Refresh the project before adding more photos.':'');
 }catch(e){$('#photo-message').textContent=e.message}
 finally{uploading=false;button.disabled=false;input.disabled=false}
};
if(!access.project_id){$('#message').textContent='Open a private link or sign in to your Buzzie account.';$('#missing').hidden=false}else{await load();await openConversation();if(new URLSearchParams(location.hash.slice(1)).get('photos_failed'))$('#photo-message').textContent='Some photo uploads could not be confirmed. Check the saved photos below, then add only missing ones.'}

const accountPanel=el('section',undefined,$('#project-content').querySelector('aside'),'panel');el('h3','Keep it in your account',accountPanel);const accountLink=el('a','Create an account or sign in',accountPanel);accountLink.href='account.html';if(access.access_token){const claim=el('button','Save project to my account',accountPanel,'secondary');claim.type='button';let claiming=false;claim.onclick=async()=>{if(claiming)return;claiming=true;claim.disabled=true;let snapshot;const changed='Your account session changed. Check your account projects before retrying this link.';try{snapshot=await sessionSnapshot();if(!snapshot.isCurrent()){$('#save-message').textContent=changed;return}await api('claim-project',access,snapshot.token);$('#save-message').textContent=snapshot.isCurrent()?'Project linked to your account.':changed}catch(e){$('#save-message').textContent=snapshot?(snapshot.isCurrent()?e.message:changed):'Sign in to your confirmed account first, then return to this project.'}finally{claiming=false;claim.disabled=false}}}else{$('#remember').hidden=true;$('#private-link').previousElementSibling.textContent='Open this project by signing into your homeowner account. Copying this link does not grant access to anyone else.';$('#private-link').previousElementSibling.previousElementSibling.textContent='Your account project';$('#copy-link').textContent='Copy account project link';$('#save-message').textContent='This link requires your signed-in homeowner account.'}
