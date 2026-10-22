import {api,$,el,STATUS,AUTH} from './common.js';
import {authCall,saveSession,sessionToken,currentUser,signOut,emailConfirmation,prepareAuthCheck,authPayload,emailCallback,verifyEmailCallback,sessionVersion,sessionSnapshot} from './auth-session.js';
const callback=emailCallback(location.hash);if(callback)history.replaceState(null,'',location.pathname+location.search);
let mode='signin',authCheck,authenticating=false,accountLoad=0,claiming=false,passwordSaving=false;$('#auth-submit').disabled=true;$('#recover-account').disabled=true;const message=$('#account-message');
function setMode(value){mode=value;const signup=value==='signup';$('#name-label').hidden=!signup;$('#signup-consent').hidden=!signup;$('#account-consent').required=signup;$('#account-password').minLength=signup?12:1;$('#account-password').autocomplete=signup?'new-password':'current-password';$('#auth-title').textContent=signup?'Make room for your next project.':'Welcome back.';$('#auth-submit').textContent=signup?'Create homeowner account':'Sign in';message.textContent=''}
$('#mode-signin').onclick=()=>setMode('signin');$('#mode-signup').onclick=()=>setMode('signup');
function authBusy(value){authenticating=value;for(const id of ['auth-submit','recover-account','mode-signin','mode-signup'])$('#'+id).disabled=value||!authCheck}
function clearAccountView(){
 $('#account-dashboard').hidden=true;$('#account-auth').hidden=false;
 $('#account-projects').replaceChildren();$('#account-identity').textContent='';
 for(const id of ['account-password','new-password','claim-link','confirmation-link'])$('#'+id).value='';
}
async function showAccount({focusFrom,focusAnchor=focusFrom}={}){
 const load=++accountLoad;$('#account-projects').replaceChildren();$('#account-identity').textContent='';await sessionToken();const revision=sessionVersion();
 const current=()=>load===accountLoad&&revision===sessionVersion();
 try{
  const user=await currentUser();if(load!==accountLoad)return false;
  if(!user){const token=await sessionToken();if(load===accountLoad&&!token)clearAccountView();return false}
  if(!current())return false;
  const moveFocus=focusFrom&&$('#account-auth').contains(focusFrom)&&(document.activeElement===focusAnchor||(focusFrom.disabled&&document.activeElement===document.body));
  $('#account-auth').hidden=true;$('#account-dashboard').hidden=false;
  $('#account-identity').textContent=user.email;$('#account-projects').replaceChildren();
  if(!user.email_confirmed_at){message.textContent='Confirm your email before linking or viewing projects.';return false}
  if(moveFocus)$('#account-identity').focus();
  const token=await sessionToken();if(!current())return false;
  el('p','Loading your projects…',$('#account-projects'),'small');
  const data=await api('home-projects',undefined,token);if(!current())return false;
  $('#account-projects').replaceChildren();
  if(!data.projects.length)el('p','Your linked projects will appear here. Start a request or add an existing project below.',$('#account-projects'),'empty');
  for(const project of data.projects){const card=el('section',undefined,$('#account-projects'),'panel');el('h3',project.lead.service,card);el('p',project.lead.city+' · '+(STATUS[project.lead.status]||project.lead.status),card,'small');const link=el('a','Open project ↗',card,'button secondary');link.href='project.html?project='+encodeURIComponent(project.id)}
  return true;
 }catch(e){if(current()){$('#account-projects').replaceChildren();message.textContent='Unable to load your projects. Refresh to try again.'}return false}
}

$('#account-form').onsubmit=async event=>{
 event.preventDefault();if(authenticating)return;const focusFrom=document.activeElement;authBusy(true);let revision=sessionVersion();
 const focusAnchor=document.activeElement,input=$('#account-password'),password=input.value,email=$('#account-email').value.trim(),signup=mode==='signup';
 try{
  if(signup&&!$('#account-consent').checked)throw Error('Please agree to the privacy and project-access terms.');
  const path=signup?'signup?redirect_to='+encodeURIComponent(new URL('account.html',location.href).href):'token?grant_type=password';
  const body={email,password,...(signup?{data:{full_name:$('#account-name').value.trim()}}:{})};
  const data=await authCall(path,authPayload(body,authCheck));if(sessionVersion()!==revision)return;
  if(input.value===password)input.value='';
  if(data.access_token){
   saveSession(data);revision=sessionVersion();const loaded=await showAccount({focusFrom,focusAnchor});
   if(sessionVersion()===revision&&loaded)message.textContent=signup?'Your homeowner account is ready.':'You’re signed in.';
  }else if(signup){
   setMode('signin');message.textContent='If this address can register, check its inbox for a confirmation email. Return here to sign in after confirming.';
  }else throw Error('Sign-in could not be completed. Please try again.');
 }catch(e){if(sessionVersion()===revision)message.textContent=e.message}
 finally{authCheck?.reset();authBusy(false)}
};
$('#recover-account').onclick=async()=>{
 if(authenticating)return;const email=$('#account-email').value.trim();
 if(!email||!$('#account-email').checkValidity()){message.textContent='Enter your email above first.';return}
 authBusy(true);const revision=sessionVersion();
 try{
  await authCall('recover?redirect_to='+encodeURIComponent(new URL('account.html',location.href).href),authPayload({email},authCheck));
  if(sessionVersion()===revision)message.textContent='If recovery is available for this address, check its inbox. Use the recovery link to return here and choose a new password.';
 }catch(e){if(sessionVersion()===revision)message.textContent=e.message}
 finally{authCheck?.reset();authBusy(false)}
};
async function showEmailAccount(type,success,revision,focusFrom){
 const loaded=await showAccount();if(sessionVersion()!==revision)return;
 message.textContent=loaded?success:'Email link verified, but your account could not load. Refresh your account to continue'+(type==='recovery'?' password recovery.':'.');
 const moveFocus=loaded&&focusFrom&&$('#confirmation-section').contains(focusFrom)&&!(focusFrom.id==='confirmation-link'&&focusFrom.value)&&(document.activeElement===focusFrom||(focusFrom.disabled&&document.activeElement===document.body));
 if(moveFocus)$(type==='recovery'?'#new-password':'#account-identity').focus();
}
$('#confirmation-form').onsubmit=async event=>{
 event.preventDefault();if(authenticating)return;const focusFrom=document.activeElement;authBusy(true);
 const button=event.target.querySelector('button'),input=$('#confirmation-link'),submitted=input.value;
 button.disabled=true;let revision=sessionVersion();
 try{
  const params=emailConfirmation(submitted),data=await authCall('verify',params);
  if(sessionVersion()!==revision)return;
  saveSession(data);revision=sessionVersion();if(input.value===submitted)input.value='';
  await showEmailAccount(params.type,params.type==='recovery'?'Recovery verified. Choose a new password below.':'Email confirmed. Your account is ready.',revision,focusFrom);
 }catch(e){if(sessionVersion()===revision)message.textContent=e.message}
 finally{button.disabled=false;authBusy(false)}
};
$('#claim-form').onsubmit=async event=>{
 event.preventDefault();if(claiming)return;claiming=true;
 const button=event.target.querySelector('button'),input=$('#claim-link'),submitted=input.value;
 button.disabled=true;let scope;const started=sessionVersion();
 try{
  const url=new URL(submitted),p=new URLSearchParams(url.hash.slice(1));
  if(url.origin!==location.origin||!p.get('project')||!p.get('key'))throw Error('Paste the original Buzzie private project link.');
  scope=await sessionSnapshot();if(!scope.isCurrent())return;
  await api('claim-project',{project_id:p.get('project'),access_token:p.get('key')},scope.token);
  if(!scope.isCurrent())return;
  if(input.value===submitted)input.value='';
  const loaded=await showAccount();if(!scope.isCurrent())return;
  message.textContent=loaded?'Project linked. You can now reopen it from this account.':'Project linked, but your project list could not refresh. Refresh your account to reopen it.';
 }catch(e){if(scope?scope.isCurrent():sessionVersion()===started)message.textContent=e.message}
 finally{claiming=false;button.disabled=false}
};
$('#password-form').onsubmit=async event=>{
 event.preventDefault();if(passwordSaving)return;passwordSaving=true;
 const button=event.target.querySelector('button'),input=$('#new-password'),submitted=input.value;
 button.disabled=true;let scope;const started=sessionVersion();
 try{
  scope=await sessionSnapshot();if(!scope.isCurrent())return;
  await authCall('user',{password:submitted},scope.token,'PUT');
  if(!scope.isCurrent())return;
  if(input.value===submitted)input.value='';
  message.textContent=input.value?'Password updated. The newer value in the field has not been saved.':'Password updated.';
 }catch(e){if(scope?scope.isCurrent():sessionVersion()===started)message.textContent=e.message}
 finally{passwordSaving=false;button.disabled=false}
};
$('#account-refresh').onclick=showAccount;$('#account-signout').onclick=async()=>{accountLoad++;const pending=signOut();clearAccountView();message.textContent='Signed out.';await pending};
// Do not adopt URL credentials until a deliberate click and matching server identities.
if(callback?.session){
 const button=el('button',callback.type==='recovery'?'Finish password recovery':'Finish email confirmation',$('#confirmation-section'),'secondary');button.id='complete-email-link';button.type='button';
 button.onclick=async()=>{
  if(authenticating)return;const focusFrom=document.activeElement;button.disabled=true;authBusy(true);let revision=sessionVersion();
  try{
   const data=await verifyEmailCallback(callback);
   if(sessionVersion()!==revision)return;
   saveSession(data);revision=sessionVersion();callback.session=null;
   await showEmailAccount(callback.type,callback.type==='recovery'?'Recovery verified. Choose a new password below.':'Email link verified. You can manage your account below.',revision,focusFrom);button.remove();
  }catch(e){if(sessionVersion()===revision)message.textContent='This email link could not be verified. It may have expired. Request a new link or sign in.';button.disabled=false}
  finally{button.disabled=false;authBusy(false)}
 };
}

setMode(new URLSearchParams(location.search).get('mode')==='signup'?'signup':'signin');try{authCheck=await prepareAuthCheck($('#auth-check'));$('#auth-submit').disabled=false;$('#recover-account').disabled=false}catch(e){message.textContent=e.message}await showAccount().catch(e=>message.textContent=e.message);

if(callback?.error)message.textContent=callback.error+(message.textContent?' '+message.textContent:'');
