export const sessionId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const jwt=id=>'e30.'+Buffer.from(JSON.stringify({sub:id,session_id:sessionId})).toString('base64url')+'.synthetic';
