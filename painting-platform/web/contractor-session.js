// Contractor credentials stay in memory, separate from homeowner sessions.
export function createContractorSession(refresh,onExpired=()=>{}){
 let session=null,revision=0,refreshPending=null;
 function clear(){revision++;session=null;refreshPending=null}
 function save(data){
  if(!data?.access_token||!data?.refresh_token)throw Error('A complete contractor session is required.');
  revision++;refreshPending=null;session={...data,expires_at:Date.now()+data.expires_in*1000};
  return session.access_token;
 }
 async function token(){
  if(!session)throw Error('Sign in to your contractor workspace.');
  if(session.expires_at>Date.now()+60000)return session.access_token;
  if(refreshPending)return refreshPending;
  const started=revision,refreshToken=session.refresh_token;
  const pending=(async()=>{
   try{
    const data=await refresh({refresh_token:refreshToken});
    if(revision!==started)throw Error('Your contractor sign-in changed. Refresh the workspace.');
    return save(data);
   }catch(error){
    if(revision===started){clear();onExpired();throw Error('Your session expired. Sign in again.')}
    throw Error('Your contractor sign-in changed. Refresh the workspace.');
   }
  })();
  refreshPending=pending;
  try{return await pending}finally{if(refreshPending===pending)refreshPending=null}
 }
 return {save,clear,token,hasSession:()=>!!session,peekToken:()=>session?.access_token||''};
}
