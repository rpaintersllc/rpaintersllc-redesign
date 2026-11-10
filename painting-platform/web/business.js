import {api,$} from './common.js';
import {createIntakeCheck} from './intake-check.js';
let intakeCheck;const submit=$('#interest button');submit.disabled=true;
$('#interest').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{if(!intakeCheck)throw Error('Request verification is still loading. Please try again.');const challengeToken=intakeCheck.token();const values=Object.fromEntries(new FormData(event.target));await api('provider-interest',{...values,challenge_token:challengeToken,state:values.state.toUpperCase(),consent:event.target.elements.namedItem('consent').checked});event.target.reset();intakeCheck.reset();$('#message').textContent='Your interest is saved. We’ll review expansion interest before activating new business accounts. No purchase or subscription was created.'}catch(e){intakeCheck?.reset();$('#message').textContent=e.message}finally{button.disabled=false}};

try{const data=await api('providers');intakeCheck=await createIntakeCheck(data.intake_challenge,$('#intake-check'),'provider_interest');submit.disabled=false}catch(e){$('#message').textContent=e.message}
