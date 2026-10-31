import {identity,fail,ApiError} from './auth.mjs';
import {bootstrapAdmin,isAdmin,stage2Route} from './stage2.mjs';
const MAX=262144;
const json=(obj,status=200)=>Response.json(obj,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const now=()=>Date.now();
const validId=s=>typeof s==='string'&&/^[0-9a-f-]{36}$/i.test(s);
const validRole=s=>s==='editor'||s==='viewer';
const lower=s=>String(s||'').trim().toLowerCase();
const bytes=s=>new TextEncoder().encode(s).length;
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const token=()=>{const a=crypto.getRandomValues(new Uint8Array(32));return Array.from(a,v=>v.toString(16).padStart(2,'0')).join('')};
function titleFrom(document){return String(document.name||document.title||'Untitled trip').trim().slice(0,140)||'Untitled trip'}
function scheduled(document){
  if(document.timelineV1?.visits)return Object.values(document.timelineV1.visits).some(v=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v.start||''))?1:0;
  return (document.parks||[]).some(s=>Number(document.stopMeta?.[s]?.day)>0)?1:0;
}
async function payload(request){
  const ct=request.headers.get('content-type')||'';
  if(!/^application\/json(?:;|$)/i.test(ct))fail(415,'JSON request required');
  const length=Number(request.headers.get('content-length')||0);
  if(length>MAX)fail(413,'Request exceeds the trip size limit');
  const raw=await request.text();if(bytes(raw)>MAX)fail(413,'Request exceeds the trip size limit');
  try{const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))fail(422,'Invalid JSON object');return data}
  catch(e){if(e instanceof ApiError)throw e;fail(400,'Invalid JSON')}
}
function tripDoc(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail(422,'Trip document must be an object');
  if(!Array.isArray(input.parks)||input.parks.length>150||input.parks.some(p=>typeof p!=='string'||p.length>130))fail(422,'Invalid park list');
  // JSON serialization strips functions and breaks cyclic input in a controlled way.
  const doc=JSON.stringify(input);if(bytes(doc)>MAX-8192)fail(413,'Trip is too large');
  return {doc,title:titleFrom(input),scheduled:scheduled(input),bytes:bytes(doc)};
}
const dbGet=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const dbRun=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const dbAll=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results||[];
async function access(db,id,uid){
  const r=await dbGet(db,`SELECT t.id,t.owner_uid,t.revision,t.title,t.document,t.updated_at,
     CASE WHEN t.owner_uid=? THEN 'owner' ELSE m.role END role
     FROM trips t LEFT JOIN trip_members m ON m.trip_id=t.id AND m.uid=?
     WHERE t.id=? AND (t.owner_uid=? OR m.uid=?)`,uid,uid,id,uid,uid);
  if(!r)fail(404,'Trip not found');return r;
}
function isAllowed(role,verb){return role==='owner'||(role==='editor'&&verb==='edit')||(role==='viewer'&&verb==='read');}
async function account(db,user){
  const t=now();await dbRun(db,`INSERT INTO users(uid,email,created_at,last_active_at) VALUES(?,?,?,?)
    ON CONFLICT(uid) DO UPDATE SET email=excluded.email,last_active_at=excluded.last_active_at
    WHERE users.last_active_at < excluded.last_active_at - 3600000 OR users.email<>excluded.email`,user.uid,user.email,t,t);
}
function match(path,pat){const a=path.split('/').filter(Boolean),b=pat.split('/').filter(Boolean);if(a.length!==b.length)return null;
  const o={};for(let i=0;i<a.length;i++){if(b[i].startsWith(':'))o[b[i].slice(1)]=decodeURIComponent(a[i]);else if(a[i]!==b[i])return null;}return o;
}
export async function handle(context,{authOptions}={}){
  const {request,env}=context,url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();
  if(path==='/api/v1/health'&&method==='GET')return json({ok:true,service:'atlas-accounts',stage:1});
  if(!env.ATLAS_DB||!env.FIREBASE_PROJECT_ID)return json({error:'Accounts backend not configured'},503);
  const user=await identity(request,env,authOptions),db=env.ATLAS_DB;
  // User rows exist for all verified requests, so invitations can reference both parties.
  await account(db,user);
  await bootstrapAdmin(db,env,user);
  const stage2=await stage2Route({request,db,user,method,path});
  if(stage2)return stage2;
  if(path==='/api/v1/account'&&method==='GET')return json({uid:user.uid,admin:await isAdmin(db,env,user)});
  if(path==='/api/v1/trips'&&method==='GET'){
    const list=await dbAll(db,`SELECT t.id,t.title,t.revision,t.updated_at,
      CASE WHEN t.owner_uid=? THEN 'owner' ELSE m.role END role
      FROM trips t LEFT JOIN trip_members m ON m.trip_id=t.id AND m.uid=?
      WHERE t.owner_uid=? OR m.uid=? ORDER BY t.updated_at DESC LIMIT 250`,user.uid,user.uid,user.uid,user.uid);
    return json({trips:list});
  }
  if(path==='/api/v1/trips'&&method==='POST'){
    const data=await payload(request),d=tripDoc(data.document),id=crypto.randomUUID(),t=now();
    await dbRun(db,`INSERT INTO trips(id,owner_uid,title,document,revision,has_schedule,bytes,created_at,updated_at)
      VALUES(?,?,?,?,1,?,?,?,?)`,id,user.uid,d.title,d.doc,d.scheduled,d.bytes,t,t);
    return json({id,revision:1},201);
  }
  let params=match(path,'/api/v1/trips/:id');
  if(params){if(!validId(params.id))fail(404,'Trip not found');const t=await access(db,params.id,user.uid);
    if(method==='GET')return json({id:t.id,role:t.role,revision:t.revision,updatedAt:t.updated_at,document:JSON.parse(t.document)});
    if(method==='PUT'){
      if(!isAllowed(t.role,'edit'))fail(403,'Editor access required');
      const data=await payload(request);
      if(!Number.isInteger(data.expectedRevision)||data.expectedRevision<1)fail(422,'Expected revision is required');
      const d=tripDoc(data.document);const updated=await dbRun(db,`UPDATE trips SET title=?,document=?,has_schedule=?,bytes=?,
        revision=revision+1,updated_at=? WHERE id=? AND revision=?
        AND (owner_uid=? OR EXISTS(SELECT 1 FROM trip_members WHERE trip_id=? AND uid=? AND role='editor'))`,
        d.title,d.doc,d.scheduled,d.bytes,now(),params.id,data.expectedRevision,user.uid,params.id,user.uid);
      if(!updated.meta?.changes)return json({error:'Conflict or permission changed; reload before saving'},409);
      return json({id:params.id,revision:data.expectedRevision+1});
    }
    if(method==='DELETE'){
      if(t.role!=='owner')fail(403,'Only the trip owner may delete it');
      await dbRun(db,'DELETE FROM trips WHERE id=? AND owner_uid=?',params.id,user.uid);
      return json({deleted:true});
    }
  }
  params=match(path,'/api/v1/trips/:id/members');
  if(params&&method==='GET'){
    const t=await access(db,params.id,user.uid);if(t.role!=='owner')fail(403,'Only the owner can manage sharing');
    const members=await dbAll(db,`SELECT m.uid,m.role,m.joined_at FROM trip_members m WHERE m.trip_id=?`,params.id);
    return json({members});
  }
  params=match(path,'/api/v1/trips/:id/members/:uid');
  if(params&&method==='DELETE'){
    const t=await access(db,params.id,user.uid);if(t.role!=='owner')fail(403,'Owner access required');
    await dbRun(db,'DELETE FROM trip_members WHERE trip_id=? AND uid=?',params.id,params.uid);
    return json({removed:true});
  }
  params=match(path,'/api/v1/trips/:id/invitations');
  if(params&&method==='POST'){
    const t=await access(db,params.id,user.uid);if(t.role!=='owner')fail(403,'Only the owner can invite');
    const d=await payload(request),email=lower(d.email),role=d.role;
    if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!validRole(role))fail(422,'Verified invite email and viewer/editor role required');
    if(email===user.email)fail(422,'Owner cannot invite their own email');
    const secret=token(),id=crypto.randomUUID(),expiry=now()+7*86400000;
    await dbRun(db,`INSERT INTO trip_invitations(id,trip_id,email,role,token_hash,created_by,created_at,expires_at)
      VALUES(?,?,?,?,?,?,?,?)`,id,params.id,email,role,await hash(secret),user.uid,now(),expiry);
    // The one-time token is not stored in plaintext. Send the link yourself in v1.
    return json({invitationId:id,inviteUrl:`${url.origin}/#invite=${secret}`,expiresAt:expiry},201);
  }
  params=match(path,'/api/v1/trips/:id/invitations/:inviteId');
  if(params&&method==='DELETE'){
    const t=await access(db,params.id,user.uid);if(t.role!=='owner')fail(403,'Owner access required');
    await dbRun(db,'DELETE FROM trip_invitations WHERE id=? AND trip_id=?',params.inviteId,params.id);
    return json({revoked:true});
  }
  if(path==='/api/v1/invitations/accept'&&method==='POST'){
    const data=await payload(request),secret=String(data.token||'');
    if(!/^[a-f0-9]{64}$/.test(secret))fail(404,'Invitation invalid or expired');
    const invite=await dbGet(db,`SELECT id,trip_id,email,role,expires_at,accepted_at
      FROM trip_invitations WHERE token_hash=?`,await hash(secret));
    if(!invite||invite.email!==user.email||invite.accepted_at||invite.expires_at<=now())fail(404,'Invitation invalid, expired, or addressed to another account');
    const t=now();
    // D1 batch operations are atomic. The conditional update prevents double redemption.
    const results=await db.batch([
      db.prepare(`UPDATE trip_invitations SET accepted_at=?,accepted_by=? WHERE id=? AND accepted_at IS NULL AND expires_at>?`).bind(t,user.uid,invite.id,t),
      db.prepare(`INSERT INTO trip_members(trip_id,uid,role,joined_at) VALUES(?,?,?,?)
        ON CONFLICT(trip_id,uid) DO UPDATE SET role=excluded.role`).bind(invite.trip_id,user.uid,invite.role,t)
    ]);
    if(!results[0]?.meta?.changes)fail(409,'Invitation has already been used');
    return json({tripId:invite.trip_id,role:invite.role});
  }
  if(path==='/api/v1/admin/summary'&&method==='GET'){
    if(!(await isAdmin(db,env,user)))fail(403,'Administrator access required');
    const stats=await dbGet(db,`SELECT (SELECT count(*) FROM users) users,
      (SELECT count(*) FROM users WHERE last_active_at>=?) active_users_30d,
      (SELECT count(*) FROM trips) trips,
      (SELECT count(*) FROM trips WHERE has_schedule=1) scheduled_trips,
      (SELECT coalesce(sum(bytes),0) FROM trips) trip_document_bytes,
      (SELECT count(*) FROM trip_invitations WHERE accepted_at IS NULL AND expires_at>?) pending_invitations`,now()-30*86400000,now());
    return json({summary:stats});
  }
  return json({error:'Endpoint not found'},404);
}
export async function safeHandle(context,options){
  try{
    // Only API requests of a supported method may reach the data layer.
    if(!['GET','POST','PUT','DELETE'].includes(context.request.method))return json({error:'Method not allowed'},405);
    return await handle(context,options);
  }catch(err){
    if(err instanceof ApiError)return json({error:err.message},err.status);
    // No internal data or auth tokens in errors.
    return json({error:'Internal server error'},500);
  }
}
