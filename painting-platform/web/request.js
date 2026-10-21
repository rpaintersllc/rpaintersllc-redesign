import {api,$,randomKey,projectLink,uploadPhoto,validatePhotos,attribution} from './common.js';
import {sessionToken,currentUser} from './auth-session.js';
const form=$('#request-form'),steps=[...document.querySelectorAll('[data-step]')],message=$('#message');let current=0,loading=false,savedLink='';
const accessToken=randomKey(),requestKey=crypto.randomUUID(),source=attribution();
function show(step){current=step;steps.forEach((el,i)=>el.hidden=i!==step);document.querySelectorAll('.progress span').forEach((el,i)=>el.classList.toggle('active',i<=step));$('#back').hidden=step===0;$('#next').hidden=step===2;$('#submit').hidden=step!==2;message.textContent='';steps[step].querySelector('h2').focus?.()}
function valid(step){for(const field of steps[step].querySelectorAll('input,textarea,select'))if(!field.checkValidity()){field.reportValidity();return false}try{if(step===1)validatePhotos([...$('#photos').files])}catch(e){message.textContent=e.message;return false}return true}
$('#next').onclick=()=>{if(valid(current))show(current+1)};$('#back').onclick=()=>show(current-1);
$('#photos').onchange=()=>{try{validatePhotos([...$('#photos').files]);$('#photo-summary').textContent=$('#photos').files.length+' photo(s) selected.';message.textContent=''}catch(e){message.textContent=e.message;$('#photos').value='';$('#photo-summary').textContent=''}};
try{const data=await api('providers');const provider=data.providers.find(p=>p.slug==='r-painters-llc');if(!provider)throw Error('The local pilot is temporarily unavailable.');const service=form.elements.namedItem('service'),city=form.elements.namedItem('city');for(const name of data.services)service.append(new Option(name,name));city.replaceChildren(new Option('Select your city',''));for(const name of provider.cities)city.append(new Option(name,name));const params=new URLSearchParams(location.search);if(data.services.includes(params.get('service')))service.value=params.get('service');if(provider.cities.includes(params.get('city')))city.value=params.get('city');if(/^294\d{2}$/.test(params.get('zip')||''))form.elements.namedItem('zip').value=params.get('zip')}catch(e){message.textContent=e.message;$('#next').disabled=true}
$('#copy-project-link').onclick=async()=>{try{await navigator.clipboard.writeText(savedLink);$('#receipt-message').textContent='Private link copied.'}catch{$('#receipt-message').textContent='Copy the private link shown above and keep it somewhere safe.'}};
form.onsubmit=async event=>{event.preventDefault();if(loading)return;for(let i=0;i<steps.length;i++)if(!valid(i)){show(i);valid(i);return}loading=true;$('#submit').disabled=true;$('#back').disabled=true;message.textContent='Saving your project…';
 try{
  const values=Object.fromEntries(new FormData(form));const result=await api('create',{...values,...source,state:'SC',provider_slug:'r-painters-llc',request_key:requestKey,access_token:accessToken,contact_consent:form.elements.namedItem('contact_consent').checked});
  const access={project_id:result.project_id,access_token:accessToken};
  savedLink=projectLink(result.project_id,accessToken);
  $('#receipt-link').textContent=savedLink;$('#open-project').href=savedLink;
  form.hidden=true;$('#request-receipt').hidden=false;$('#request-receipt').focus();
  // The saved receipt stays available even when optional follow-up steps fail.
  const files=[...$('#photos').files];let failures=0;
  if(files.length)$('#upload-status').textContent='Keep this page open while photos upload. Your project can open in another tab.';
  for(let i=0;i<files.length;i++){
   $('#upload-status').textContent='Request saved. Uploading photo '+(i+1)+' of '+files.length+'… Keep this page open.';
   try{await uploadPhoto(files[i],access)}catch{failures++}
  }
  if(failures){$('#open-project').href=savedLink+'&photos_failed='+failures;$('#upload-status').textContent='Your request is saved. '+failures+' photo(s) could not be confirmed. Open your project to check saved photos before adding any missing ones.'}
  else $('#upload-status').textContent=files.length?'All '+files.length+' photo(s) uploaded.':'You can add photos later from your project.';
  try{const token=await sessionToken();if(token){await api('claim-project',access,token);$('#account-link-status').textContent='Project linked to your homeowner account.'}}
  catch{$('#account-link-status').textContent='Your request is saved, but account linking could not be completed. Use the private link to open your project and retry linking from your confirmed account.'}

 }catch(e){if(savedLink){$('#upload-status').textContent='Your request is saved. Open your project to check its photos and account access.'}else{message.textContent=e.message;$('#submit').disabled=false;$('#back').disabled=false;loading=false}}
};

const user=await currentUser();if(user){form.elements.namedItem('email').value=user.email||'';form.elements.namedItem('full_name').value=user.user_metadata?.full_name||''}
