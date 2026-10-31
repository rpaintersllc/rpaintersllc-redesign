let scriptReady;
async function widgetApi(){
 if(window.turnstile)return window.turnstile;
 if(!scriptReady)scriptReady=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
  const timer=setTimeout(()=>{script.remove();reject(Error('Security check could not load. Refresh to try again.'))},15000);
  script.onload=()=>{clearTimeout(timer);window.turnstile?resolve(window.turnstile):reject(Error('Security check is unavailable. Refresh to try again.'))};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Security check could not load. Refresh to try again.'))};document.head.append(script);
 });return scriptReady;
}
export async function createAccountCheck(siteKey,target){
 if(!siteKey)throw Error('Request verification is temporarily unavailable. Please try later.');
 const api=await widgetApi();let verified='';
 const status=document.createElement('p');status.className='small';status.setAttribute('role','status');target.append(status);
 const widget=document.createElement('div');target.append(widget);
 const id=api.render(widget,{sitekey:siteKey,action:'account_signin',theme:'dark',size:'flexible','response-field':false,callback:token=>{verified=token;status.textContent='Security check complete.'},'expired-callback':()=>{verified='';status.textContent='Security check expired. Complete it again.'},'error-callback':()=>{verified='';status.textContent='Security check could not complete. Refresh to try again.'}});
 return {token(){if(!verified)throw Error('Complete the security check before submitting.');return verified},reset(){verified='';status.textContent='Complete the security check again before retrying.';api.reset(id)}};
}
