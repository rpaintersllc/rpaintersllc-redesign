import {AUTH,PUBLISHABLE} from './common.js';
let memory;
export function clearSession(){memory=null;try{sessionStorage.removeItem('buzzie.session')}catch{}}
export function saveSession(data){if(!data?.access_token||!data?.refresh_token)throw Error('A complete sign-in session is required.');memory={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)};try{sessionStorage.setItem('buzzie.session',JSON.stringify(memory))}catch{}return memory}
export async function authCall(path,body,token,method='POST'){
 const response=await fetch(AUTH+'/auth/v1/'+path,{method,headers:{apikey:PUBLISHABLE,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(25000)});
 const data=response.status===204?{}:await response.json();
 if(!response.ok){const code=data.error_code||data.code;throw Error(code==='email_not_confirmed'?'Confirm your email before signing in.':code==='email_address_not_authorized'?'Pilot email delivery is restricted. Buzzie support must finish sender setup before this address can register.':response.status===429?'Too many attempts. Please wait before trying again.':path.startsWith('token')?'Unable to sign in. Check your email and password.':path==='signup'?'Registration could not be completed. Please try later or contact Buzzie support.':'This confirmation or recovery request could not be completed. It may have expired.');}return data;
}
export async function sessionToken(){
 if(memory===undefined){try{memory=JSON.parse(sessionStorage.getItem('buzzie.session')||'null')}catch{memory=null}}
 if(!memory?.access_token)return '';
 if(memory.expires_at<=Math.floor(Date.now()/1000)+60){try{saveSession(await authCall('token?grant_type=refresh_token',{refresh_token:memory.refresh_token}))}catch{clearSession();return ''}}
 return memory.access_token;
}
export async function currentUser(){const token=await sessionToken();if(!token)return null;try{return await authCall('user',undefined,token,'GET')}catch{clearSession();return null}}
export async function signOut(){const token=await sessionToken();clearSession();if(token)try{await authCall('logout',undefined,token)}catch{}}
export function emailConfirmation(link){
 let url;try{url=new URL(link)}catch{throw Error('Paste the complete confirmation link from your Buzzie email.')}
 if(url.origin!==AUTH||url.pathname!=='/auth/v1/verify'||url.username||url.password||!['signup','recovery','magiclink','email'].includes(url.searchParams.get('type'))||!url.searchParams.get('token'))throw Error('Use the original confirmation link from your Buzzie email.');
 return {token_hash:url.searchParams.get('token'),type:url.searchParams.get('type')};
}
