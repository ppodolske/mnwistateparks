// Firebase ID-token verifier for Cloudflare Workers WebCrypto. No Firebase service-account secret.
const KEY_URL='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let cached=null, expires=0;
export class ApiError extends Error {constructor(status,message){super(message);this.status=status;}}
export function fail(status,message){throw new ApiError(status,message);}
const decode64=s=>{
  if(typeof s!=='string'||!/^[-_A-Za-z0-9]+$/.test(s))fail(401,'Invalid authentication token');
  const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
};
const json64=s=>{try{return JSON.parse(new TextDecoder().decode(decode64(s)))}catch{fail(401,'Invalid authentication token')}};
export async function verifyFirebase(token,projectId,{getKeys,now}={}){
  if(!projectId||typeof projectId!=='string')fail(503,'Authentication is not configured');
  if(!token||token.length>8192||token.split('.').length!==3)fail(401,'Authentication required');
  const [h,p,s]=token.split('.'),header=json64(h),claims=json64(p);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid)fail(401,'Invalid authentication algorithm');
  const t=Math.floor((now??Date.now())/1000);
  if(claims.aud!==projectId||claims.iss!==`https://securetoken.google.com/${projectId}`||
    typeof claims.sub!=='string'||!claims.sub||claims.sub.length>128||
    !Number.isInteger(claims.exp)||claims.exp<=t||!Number.isInteger(claims.iat)||claims.iat>t+30||
    !Number.isInteger(claims.auth_time)||claims.auth_time>t+30||
    claims.email_verified!==true||typeof claims.email!=='string'||
    claims.firebase?.sign_in_provider!=='google.com')fail(401,'Invalid or unverified Google identity');
  const jwks=await (getKeys?getKeys():loadKeys());
  const jwk=jwks.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.alg==='RS256'&&k.use==='sig');
  if(!jwk)fail(401,'Unrecognised signing key');
  let ok=false;
  try{
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode64(s),new TextEncoder().encode(h+'.'+p));
  }catch{fail(401,'Invalid token signature')}
  if(!ok)fail(401,'Invalid token signature');
  const email=claims.email.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254)fail(401,'Invalid verified email');
  return {uid:claims.sub,email};
}
async function loadKeys(){
  if(cached&&Date.now()<expires)return cached;
  const response=await fetch(KEY_URL,{headers:{accept:'application/json'}});
  if(!response.ok)fail(503,'Authentication key service is unavailable');
  const keys=await response.json();
  if(!Array.isArray(keys.keys))fail(503,'Authentication keys are unavailable');
  const maxAge=Number(/max-age=(\d+)/.exec(response.headers.get('cache-control')||'')?.[1]||300);
  cached=keys;expires=Date.now()+Math.min(Math.max(maxAge,60),86400)*1000;
  return keys;
}
export async function identity(request,env,options){
  const header=request.headers.get('authorization')||'';
  if(!/^Bearer [A-Za-z0-9._-]+$/.test(header))fail(401,'Sign in with Google to continue');
  return verifyFirebase(header.slice(7),env.FIREBASE_PROJECT_ID,options);
}
