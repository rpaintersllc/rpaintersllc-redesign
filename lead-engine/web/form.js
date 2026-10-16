import {config} from './config.js';
const form=document.querySelector('#estimate'),message=document.querySelector('#message'),button=document.querySelector('#submit');
let token='',widget,requestKey=crypto.randomUUID();
if(!config.publishableKey||!config.turnstileSiteKey){message.textContent='This preview is not accepting requests yet. Please call 843-475-9927.'}
else{
 window.onTurnstileReady=()=>{widget=window.turnstile.render('#captcha',{sitekey:config.turnstileSiteKey,action:'lead',callback:value=>{token=value;button.disabled=false},'expired-callback':()=>{token='';button.disabled=true}})};
 const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileReady&render=explicit';script.async=true;script.onerror=()=>{message.textContent='Bot check could not load. Please call 843-475-9927.'};document.head.append(script);
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity()||!token)return;
 button.disabled=true;message.textContent='Sending your request…';
 const body=Object.fromEntries(new FormData(form));body.contact_consent=form.elements.contact_consent.checked;body.request_key=requestKey;body.captcha_token=token;
 const params=new URLSearchParams(location.search);for(const key of ['utm_source','utm_campaign'])body[key]=params.get(key)||'';
 try{
  const response=await fetch(config.supabaseUrl+'/functions/v1/submit-lead',{method:'POST',headers:{'content-type':'application/json',apikey:config.publishableKey},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||result.ok!==true)throw new Error(result.error||'Unable to confirm your request.');
  message.textContent='Thank you! Your request was saved. R Painters will contact you about your project.';form.reset();requestKey=crypto.randomUUID();
 }catch(error){message.textContent=error.name==='TimeoutError'?'We could not confirm delivery. Please retry or call 843-475-9927.':error.message}
 finally{token='';button.disabled=true;window.turnstile.reset(widget)}
});
