import {AUTH,PUBLISHABLE,api} from './common.js';
import {createIntakeCheck} from './intake-check.js';
export async function prepareAuthCheck(target){const data=await api('providers');return createIntakeCheck(data.auth_challenge,target,'account_auth')}
export function authPayload(body,check){if(!check)throw Error('Security settings are still loading. Refresh to try again.');const token=check.token();return {...body,...(token?{gotrue_meta_security:{captcha_token:token}}:{})}}
let memory,refreshPending,revision=0;
function readSession(){if(memory===undefined){try{memory=JSON.parse(sessionStorage.getItem('buzzie.session')||'null')}catch{memory=null}}return memory}
export function clearSession(){revision++;refreshPending=null;memory=null;try{sessionStorage.removeItem('buzzie.session')}catch{}}
export function saveSession(data){if(!data?.access_token||!data?.refresh_token)throw Error('A complete sign-in session is required.');revision++;refreshPending=null;memory={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)};try{sessionStorage.setItem('buzzie.session',JSON.stringify(memory))}catch{}return memory}
export async function authCall(path,body,token,method='POST'){
 const response=await fetch(AUTH+'/auth/v1/'+path,{method,headers:{apikey:PUBLISHABLE,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(25000)});
 const data=response.status===204?{}:await response.json();
 if(!response.ok){const code=data.error_code||data.code;throw Error(code==='captcha_failed'?'Complete the security check again before trying to sign in, register or recover your account.':code==='email_not_confirmed'?'Confirm your email before signing in.':code==='email_address_not_authorized'?'Pilot email delivery is restricted. Buzzie support must finish sender setup before this address can register.':response.status===429?'Too many attempts. Please wait before trying again.':path.startsWith('token')?'Unable to sign in. Check your email and password.':path.startsWith('signup')?'Registration could not be completed. Please try later or contact Buzzie support.':'This confirmation or recovery request could not be completed. It may have expired.');}return data;
}
export async function sessionToken(){
 const session=readSession();if(!session?.access_token)return '';
 if(session.expires_at>Math.floor(Date.now()/1000)+60)return session.access_token;
 // One refresh per session; an older response must never replace a later login or logout.
 if(refreshPending)return refreshPending;
 const started=revision;
 const pending=(async()=>{try{const data=await authCall('token?grant_type=refresh_token',{refresh_token:session.refresh_token});if(revision!==started)return '';return saveSession(data).access_token}catch{if(revision===started)clearSession();return ''}})();
 refreshPending=pending;
 try{return await pending}finally{if(refreshPending===pending)refreshPending=null}
}
export async function currentUser(){const token=await sessionToken();if(!token||readSession()?.access_token!==token)return null;const started=revision;try{const user=await authCall('user',undefined,token,'GET');return revision===started?user:null}catch{if(revision===started)clearSession();return null}}
export async function signOut(){const token=readSession()?.access_token;clearSession();if(token)try{await authCall('logout',undefined,token)}catch{}}
export function emailConfirmation(link){
 let url;try{url=new URL(link)}catch{throw Error('Paste the complete confirmation link from your Buzzie email.')}
 if(url.origin!==AUTH||url.pathname!=='/auth/v1/verify'||url.username||url.password||!['signup','recovery','magiclink','email'].includes(url.searchParams.get('type'))||!url.searchParams.get('token'))throw Error('Use the original confirmation link from your Buzzie email.');
 return {token_hash:url.searchParams.get('token'),type:url.searchParams.get('type')};
}
