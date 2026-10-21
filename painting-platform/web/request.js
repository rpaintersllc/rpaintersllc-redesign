import {api,$,randomKey,projectLink,uploadPhoto,validatePhotos,attribution} from './common.js';
import {sessionToken,currentUser} from './auth-session.js';
const form=$('#request-form'),steps=[...document.querySelectorAll('[data-step]')],message=$('#message');let current=0,loading=false;
const accessToken=randomKey(),requestKey=crypto.randomUUID(),source=attribution();
function show(step){current=step;steps.forEach((el,i)=>el.hidden=i!==step);document.querySelectorAll('.progress span').forEach((el,i)=>el.classList.toggle('active',i<=step));$('#back').hidden=step===0;$('#next').hidden=step===2;$('#submit').hidden=step!==2;message.textContent='';steps[step].querySelector('h2').focus?.()}
function valid(step){for(const field of steps[step].querySelectorAll('input,textarea,select'))if(!field.checkValidity()){field.reportValidity();return false}try{if(step===1)validatePhotos([...$('#photos').files])}catch(e){message.textContent=e.message;return false}return true}
$('#next').onclick=()=>{if(valid(current))show(current+1)};$('#back').onclick=()=>show(current-1);
$('#photos').onchange=()=>{try{validatePhotos([...$('#photos').files]);$('#photo-summary').textContent=$('#photos').files.length+' photo(s) selected.';message.textContent=''}catch(e){message.textContent=e.message;$('#photos').value='';$('#photo-summary').textContent=''}};
try{const data=await api('providers');const provider=data.providers.find(p=>p.slug==='r-painters-llc');if(!provider)throw Error('The local pilot is temporarily unavailable.');const service=form.elements.namedItem('service'),city=form.elements.namedItem('city');for(const name of data.services)service.append(new Option(name,name));city.replaceChildren(new Option('Select your city',''));for(const name of provider.cities)city.append(new Option(name,name));const params=new URLSearchParams(location.search);if(data.services.includes(params.get('service')))service.value=params.get('service');if(provider.cities.includes(params.get('city')))city.value=params.get('city');if(/^294\d{2}$/.test(params.get('zip')||''))form.elements.namedItem('zip').value=params.get('zip')}catch(e){message.textContent=e.message;$('#next').disabled=true}
form.onsubmit=async event=>{event.preventDefault();if(loading)return;for(let i=0;i<steps.length;i++)if(!valid(i)){show(i);valid(i);return}loading=true;$('#submit').disabled=true;$('#back').disabled=true;message.textContent='Saving your project…';
 try{
  const values=Object.fromEntries(new FormData(form));const result=await api('create',{...values,...source,state:'SC',provider_slug:'r-painters-llc',request_key:requestKey,access_token:accessToken,contact_consent:form.elements.namedItem('contact_consent').checked});
  const access={project_id:result.project_id,access_token:accessToken};let failures=0;const files=[...$('#photos').files];for(let i=0;i<files.length;i++){message.textContent='Project saved. Uploading photo '+(i+1)+' of '+files.length+'…';try{await uploadPhoto(files[i],access)}catch{failures++}}
  const token=await sessionToken();if(token)try{await api('claim-project',access,token)}catch{}
  const link=projectLink(result.project_id,accessToken);location.href=link+(failures?'&photos_failed='+failures:'');
 }catch(e){message.textContent=e.message;$('#submit').disabled=false;$('#back').disabled=false;loading=false}
};

const user=await currentUser();if(user){form.elements.namedItem('email').value=user.email||'';form.elements.namedItem('full_name').value=user.user_metadata?.full_name||''}
