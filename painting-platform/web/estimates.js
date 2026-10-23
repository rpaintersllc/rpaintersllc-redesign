import {el} from './common.js';
export function estimateCents(value){
 const text=String(value).trim();if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(text))return null;
 const [whole,fraction='']=text.split('.'),cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 return Number.isSafeInteger(cents)&&cents>=1&&cents<=999999999?cents:null;
}
const dollars=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export function mountEstimate(target,{access,estimate=null,call,isCurrent,onSaved=()=>{}}){
 const details=el('details',undefined,target,'estimate-details');el('summary','Private estimate',details);
 el('p','Internal tracking for your business team only. Saving does not send a quote, collect payment or change the project status. This keeps the latest saved amount.',details,'small');
 const saved=el('p',estimate?'Saved estimate: '+dollars(estimate.amount_cents):'No estimate amount saved.',details,'small');saved.setAttribute('role','status');
 const form=el('form',undefined,details),label=el('label','Estimate amount (USD)',form),input=el('input',undefined,label);
 input.type='text';input.inputMode='decimal';input.required=true;input.maxLength=10;input.placeholder='2500.00';input.value=estimate?(estimate.amount_cents/100).toFixed(2):'';
 const button=el('button','Save private estimate',form);button.type='submit';let saving=false,needsRefresh=false,revision=estimate?.revision||0;
 const current=()=>details.isConnected&&isCurrent();
 form.onsubmit=async event=>{
  event.preventDefault();if(saving||needsRefresh||!current())return;
  const draft=input.value,amount=estimateCents(draft);
  if(amount===null){saved.textContent='Enter an amount from $0.01 to $9,999,999.99 with no more than two decimal places.';return}
  saving=true;button.disabled=true;form.setAttribute('aria-busy','true');saved.textContent='Saving private estimate…';
  try{
   const result=await call('pro-estimate',{...access,amount_cents:amount,expected_revision:revision});
   if(!current())return;revision=result.revision;onSaved(result);
   saved.textContent='Private estimate saved: '+dollars(result.amount_cents)+(input.value!==draft?'. Your newer amount is not saved yet.':'.');
  }catch(error){if(current()){
   needsRefresh=true;saved.textContent=error.status===409?'This estimate changed in another session. Refresh the workspace before saving. Your entered amount is still here.':'The save could not be confirmed. Refresh the workspace and check the saved estimate before retrying. Your entered amount is still here.';
  }}finally{saving=false;if(current()){button.disabled=needsRefresh;form.removeAttribute('aria-busy')}}
 };
 return details;
}
