import {api,$,el,STATUS,AUTH} from './common.js';
import {authCall,saveSession,sessionToken,currentUser,signOut,emailConfirmation,prepareAuthCheck,authPayload,emailCallback,verifyEmailCallback,sessionVersion} from './auth-session.js';
const callback=emailCallback(location.hash);if(callback)history.replaceState(null,'',location.pathname+location.search);
let mode='signin',authCheck,authenticating=false,accountLoad=0;$('#auth-submit').disabled=true;$('#recover-account').disabled=true;const message=$('#account-message');
function setMode(value){mode=value;const signup=value==='signup';$('#name-label').hidden=!signup;$('#signup-consent').hidden=!signup;$('#account-consent').required=signup;$('#account-password').minLength=signup?12:1;$('#account-password').autocomplete=signup?'new-password':'current-password';$('#auth-title').textContent=signup?'Make room for your next project.':'Welcome back.';$('#auth-submit').textContent=signup?'Create homeowner account':'Sign in';message.textContent=''}
$('#mode-signin').onclick=()=>setMode('signin');$('#mode-signup').onclick=()=>setMode('signup');
function authBusy(value){authenticating=value;for(const id of ['auth-submit','recover-account','mode-signin','mode-signup'])$('#'+id).disabled=value||!authCheck}
function clearAccountView(){
 $('#account-dashboard').hidden=true;$('#account-auth').hidden=false;
 $('#account-projects').replaceChildren();$('#account-identity').textContent='';
 for(const id of ['account-password','new-password','claim-link','confirmation-link'])$('#'+id).value='';
}
async function showAccount(){
 const load=++accountLoad;$('#account-projects').replaceChildren();$('#account-identity').textContent='';await sessionToken();const revision=sessionVersion();
 const current=()=>load===accountLoad&&revision===sessionVersion();
 try{
  const user=await currentUser();if(load!==accountLoad)return false;
  if(!user){const token=await sessionToken();if(load===accountLoad&&!token)clearAccountView();return false}
  if(!current())return false;
  $('#account-auth').hidden=true;$('#account-dashboard').hidden=false;
  $('#account-identity').textContent=user.email;$('#account-projects').replaceChildren();
  if(!user.email_confirmed_at){message.textContent='Confirm your email before linking or viewing projects.';return false}
  const token=await sessionToken();if(!current())return false;
  el('p','Loading your projects…',$('#account-projects'),'small');
  const data=await api('home-projects',undefined,token);if(!current())return false;
  $('#account-projects').replaceChildren();
  if(!data.projects.length)el('p','Your linked projects will appear here. Start a request or add an existing project below.',$('#account-projects'),'empty');
  for(const project of data.projects){const card=el('section',undefined,$('#account-projects'),'panel');el('h3',project.lead.service,card);el('p',project.lead.city+' · '+(STATUS[project.lead.status]||project.lead.status),card,'small');const link=el('a','Open project ↗',card,'button secondary');link.href='project.html?project='+encodeURIComponent(project.id)}
  return true;
 }catch(e){if(current()){$('#account-projects').replaceChildren();message.textContent='Unable to load your projects. Refresh to try again.'}return false}
}

$('#account-form').onsubmit=async event=>{event.preventDefault();if(authenticating)return;const button=$('#auth-submit');authBusy(true);try{const email=$('#account-email').value.trim(),password=$('#account-password').value;if(mode==='signup'){if(!$('#account-consent').checked)throw Error('Please agree to the privacy and project-access terms.');const data=await authCall('signup?redirect_to='+encodeURIComponent(new URL('account.html',location.href).href),authPayload({email,password,data:{full_name:$('#account-name').value.trim()}},authCheck));$('#account-password').value='';if(data.access_token){saveSession(data);if(await showAccount())message.textContent='Your homeowner account is ready.'}else{message.textContent='If this address can register, check its inbox for a confirmation email. Return here to sign in after confirming.';setMode('signin');message.textContent='Check your inbox to confirm your email, then sign in here.'}}else{saveSession(await authCall('token?grant_type=password',authPayload({email,password},authCheck)));$('#account-password').value='';if(await showAccount())message.textContent='You’re signed in.'}}catch(e){message.textContent=e.message}finally{authCheck?.reset();authBusy(false)}};
$('#recover-account').onclick=async()=>{if(authenticating)return;const email=$('#account-email').value.trim();if(!email||!$('#account-email').checkValidity()){message.textContent='Enter your email above first.';return}authBusy(true);try{await authCall('recover?redirect_to='+encodeURIComponent(new URL('account.html',location.href).href),authPayload({email},authCheck));message.textContent='If recovery is available for this address, check its inbox. Use the recovery link to return here and choose a new password.'}catch(e){message.textContent=e.message}finally{authCheck?.reset();authBusy(false)}};
$('#confirmation-form').onsubmit=async event=>{event.preventDefault();if(authenticating)return;authBusy(true);const button=event.target.querySelector('button');button.disabled=true;try{const input=$('#confirmation-link'),params=emailConfirmation(input.value);saveSession(await authCall('verify',params));input.value='';await showAccount();message.textContent=params.type==='recovery'?'Recovery verified. Choose a new password below.':'Email confirmed. Your account is ready.';if(params.type==='recovery')$('#new-password').focus()}catch(e){message.textContent=e.message}finally{button.disabled=false;authBusy(false)}};
$('#claim-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const url=new URL($('#claim-link').value);const p=new URLSearchParams(url.hash.slice(1));if(url.origin!==location.origin||!p.get('project')||!p.get('key'))throw Error('Paste the original Buzzie private project link.');await api('claim-project',{project_id:p.get('project'),access_token:p.get('key')},await sessionToken());$('#claim-link').value='';await showAccount();message.textContent='Project linked. You can now reopen it from this account.'}catch(e){message.textContent=e.message}finally{button.disabled=false}};
$('#password-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const token=await sessionToken();if(!token)throw Error('Sign in or verify your recovery link first.');await authCall('user',{password:$('#new-password').value},token,'PUT');$('#new-password').value='';message.textContent='Password updated.'}catch(e){message.textContent=e.message}finally{button.disabled=false}};
$('#account-refresh').onclick=showAccount;$('#account-signout').onclick=async()=>{accountLoad++;const pending=signOut();clearAccountView();message.textContent='Signed out.';await pending};
// Do not adopt URL credentials until a deliberate click and matching server identities.
if(callback?.session){
 const button=el('button',callback.type==='recovery'?'Finish password recovery':'Finish email confirmation',$('#confirmation-section'),'secondary');button.id='complete-email-link';button.type='button';
 button.onclick=async()=>{
  if(authenticating)return;button.disabled=true;authBusy(true);const started=sessionVersion();
  try{
   const data=await verifyEmailCallback(callback);
   if(sessionVersion()!==started)throw Error('Your sign-in changed while checking this link. Open the link again if needed.');
   saveSession(data);callback.session=null;await showAccount();
   message.textContent=callback.type==='recovery'?'Recovery verified. Choose a new password below.':'Email link verified. You can manage your account below.';
   if(callback.type==='recovery')$('#new-password').focus();button.remove();
  }catch(e){message.textContent=e.message.startsWith('Your sign-in changed')?e.message:'This email link could not be verified. It may have expired. Request a new link or sign in.';button.disabled=false}
  finally{authBusy(false)}
 };
}

setMode(new URLSearchParams(location.search).get('mode')==='signup'?'signup':'signin');try{authCheck=await prepareAuthCheck($('#auth-check'));$('#auth-submit').disabled=false;$('#recover-account').disabled=false}catch(e){message.textContent=e.message}await showAccount().catch(e=>message.textContent=e.message);

if(callback?.error)message.textContent=callback.error+(message.textContent?' '+message.textContent:'');
