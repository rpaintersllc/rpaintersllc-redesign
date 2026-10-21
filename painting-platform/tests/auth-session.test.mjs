import test from 'node:test';
import assert from 'node:assert/strict';

const fresh=()=>import('../web/auth-session.js?test='+crypto.randomUUID());
const session=(token='old',expires_in=1)=>({access_token:token,refresh_token:token+'-refresh',expires_in});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function setup(run){
 const previous={fetch:globalThis.fetch,sessionStorage:globalThis.sessionStorage};
 const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 try{await run(await fresh(),storage)}finally{Object.assign(globalThis,previous)}
}
test('simultaneous API actions share one token refresh',()=>setup(async(auth,storage)=>{
 const reply=deferred();let calls=0;globalThis.fetch=async()=>{calls++;return reply.promise};auth.saveSession(session());
 const first=auth.sessionToken(),second=auth.sessionToken(),third=auth.sessionToken();assert.equal(calls,1);
 reply.resolve(Response.json(session('renewed',3600)));
 assert.deepEqual(await Promise.all([first,second,third]),['renewed','renewed','renewed']);assert.equal(JSON.parse(storage.get('buzzie.session')).access_token,'renewed');
}));
test('sign-out clears immediately and a pending refresh cannot restore access',()=>setup(async(auth,storage)=>{
 const reply=deferred(),calls=[];globalThis.fetch=async(url)=>{calls.push(url);return url.includes('refresh_token')?reply.promise:new Response(null,{status:204})};auth.saveSession(session());
 const pending=auth.sessionToken();const logout=auth.signOut();assert.equal(storage.has('buzzie.session'),false);assert.equal(await auth.sessionToken(),'');await logout;
 reply.resolve(Response.json(session('stale',3600)));assert.equal(await pending,'');assert.equal(await auth.sessionToken(),'');assert.equal(storage.has('buzzie.session'),false);assert.equal(calls.filter(url=>url.includes('refresh_token')).length,1);assert.ok(calls.some(url=>url.endsWith('/logout')));
}));
for(const failed of [false,true])test('older refresh '+(failed?'failure':'success')+' cannot replace a new login',()=>setup(async(auth,storage)=>{
 const reply=deferred();globalThis.fetch=()=>reply.promise;auth.saveSession(session());const pending=auth.sessionToken();auth.saveSession(session('new-login',3600));
 reply.resolve(failed?Response.json({error:'expired'},{status:401}):Response.json(session('stale',3600)));
 assert.equal(await pending,'');assert.equal(await auth.sessionToken(),'new-login');assert.equal(JSON.parse(storage.get('buzzie.session')).access_token,'new-login');
}));
for(const failed of [false,true])test('late user lookup '+(failed?'failure':'success')+' cannot affect a newer session',()=>setup(async(auth)=>{
 const reply=deferred(),started=deferred();globalThis.fetch=()=>{started.resolve();return reply.promise};auth.saveSession(session('old',3600));const user=auth.currentUser();await started.promise;auth.saveSession(session('new-login',3600));
 reply.resolve(failed?Response.json({error:'expired'},{status:401}):Response.json({id:'old-user'}));assert.equal(await user,null);assert.equal(await auth.sessionToken(),'new-login');
}));
test('failed shared refresh clears only its expired session and allows a later login',()=>setup(async(auth,storage)=>{
 const reply=deferred();globalThis.fetch=()=>reply.promise;auth.saveSession(session());const first=auth.sessionToken(),second=auth.sessionToken();reply.resolve(Response.json({error:'expired'},{status:401}));assert.deepEqual(await Promise.all([first,second]),['','']);assert.equal(storage.has('buzzie.session'),false);auth.saveSession(session('next',3600));assert.equal(await auth.sessionToken(),'next');
}));
test('sign-out before user lookup starts prevents the old identity request',()=>setup(async(auth)=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({id:'old-user'})};auth.saveSession(session('old',3600));const user=auth.currentUser();auth.clearSession();assert.equal(await user,null);assert.equal(calls,0);
}));
