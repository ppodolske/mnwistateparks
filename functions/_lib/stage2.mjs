// Atlas Accounts Stage 2: verified-Google administrator bootstrap and idempotent browser migration.
// No operation here mutates browser storage or replaces a previously imported trip.
import {ApiError,fail} from './auth.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const enc=new TextEncoder();
const MAX_BYTES=262144;
const dbGet=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const dbAll=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results||[];
const lower=s=>String(s||'').trim().toLowerCase();

export async function bootstrapAdmin(db,env,user){
  const configured=lower(env.ATLAS_ADMIN_EMAIL);
  if(configured && configured===user.email){
    // Only a *verified Google email* may establish the first admin account.
    // Once established, admin access is permanently bound to the Firebase UID.
    await db.prepare(`INSERT OR IGNORE INTO atlas_admin(id,uid,created_at) VALUES(1,?,?)`)
      .bind(user.uid,Date.now()).run();
  }
}
export async function isAdmin(db,env,user){
  if(env.ATLAS_ADMIN_UID && env.ATLAS_ADMIN_UID===user.uid)return true;
  const admin=await dbGet(db,'SELECT uid FROM atlas_admin WHERE id=1');
  return !!admin && admin.uid===user.uid;
}
function validDoc(input){
  if(!input || typeof input!=='object' || Array.isArray(input) ||
    !Array.isArray(input.parks) || input.parks.length>150 ||
    input.parks.some(p=>typeof p!=='string'||p.length>130))fail(422,'Invalid trip document');
  const document=JSON.stringify(input);
  const bytes=enc.encode(document).length;
  if(bytes>MAX_BYTES-8192)fail(413,'Trip is too large');
  const title=String(input.name||input.title||'Untitled trip').trim().slice(0,140)||'Untitled trip';
  const scheduled=input.timelineV1?.visits ? Object.values(input.timelineV1.visits).some(v=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v.start||'')) :
    input.parks.some(p=>Number(input.stopMeta?.[p]?.day)>0);
  return {document,bytes,title,scheduled:scheduled?1:0};
}
async function bodyOf(req){
  const type=req.headers.get('content-type')||'';
  if(!/^application\/json(?:;|$)/i.test(type))fail(415,'JSON required');
  if(Number(req.headers.get('content-length')||0)>MAX_BYTES)fail(413,'Request too large');
  const raw=await req.text();if(enc.encode(raw).length>MAX_BYTES)fail(413,'Request too large');
  let val;try{val=JSON.parse(raw)}catch{fail(400,'Invalid JSON')}
  if(!val || typeof val!=='object'||Array.isArray(val))fail(422,'Expected JSON object');
  return val;
}
export async function stage2Route({request,db,user,method,path}){
  if(path!=='/api/v1/migrations')return null;
  if(method==='GET'){
    // No trip contents: client needs only the mapping to avoid duplicate imports.
    return json({imports:await dbAll(db,`SELECT source_id,trip_id,created_at FROM trip_imports
      WHERE owner_uid=? ORDER BY created_at DESC LIMIT 500`,user.uid)});
  }
  if(method!=='POST')return json({error:'Method not allowed'},405);
  const data=await bodyOf(request),sourceId=data.sourceId;
  if(typeof sourceId!=='string'||sourceId.length<1||sourceId.length>128||/[^\w.:~-]/.test(sourceId))
    fail(422,'Stable browser trip identifier required');
  const existing=await dbGet(db,'SELECT trip_id FROM trip_imports WHERE owner_uid=? AND source_id=?',user.uid,sourceId);
  if(existing)return json({id:existing.trip_id,alreadyImported:true});
  const doc=validDoc(data.document),id=crypto.randomUUID(),when=Date.now();
  // Both operations are atomic on D1. The source mapping prevents repeat imports,
  // including when a client retries after a connection interruption.
  const statements=[
    db.prepare(`INSERT INTO trips(id,owner_uid,title,document,revision,has_schedule,bytes,created_at,updated_at)
      SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS
      (SELECT 1 FROM trip_imports WHERE owner_uid=? AND source_id=?)`)
      .bind(id,user.uid,doc.title,doc.document,1,doc.scheduled,doc.bytes,when,when,user.uid,sourceId),
    db.prepare(`INSERT OR IGNORE INTO trip_imports(owner_uid,source_id,trip_id,created_at)
      SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM trips WHERE id=? AND owner_uid=?)`)
      .bind(user.uid,sourceId,id,when,id,user.uid)
  ];
  await db.batch(statements);
  const imported=await dbGet(db,'SELECT trip_id FROM trip_imports WHERE owner_uid=? AND source_id=?',user.uid,sourceId);
  if(!imported)fail(409,'Import conflict; retry safely');
  return json({id:imported.trip_id,alreadyImported:imported.trip_id!==id},imported.trip_id===id?201:200);
}
