import {fail} from './auth.mjs';
import {isAdmin} from './stage2.mjs';
const json=(obj,status=200)=>Response.json(obj,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const one=(db,sql,...values)=>db.prepare(sql).bind(...values).first();
const many=async(db,sql,...values)=>(await db.prepare(sql).bind(...values).all()).results||[];
const fmt=s=>String(s||'').trim();
const roles=new Set(['viewer','editor']);
async function body(req){
 const type=req.headers.get('content-type')||'';
 if(!/^application\/json(?:;|$)/i.test(type))fail(415,'JSON required');
 if(Number(req.headers.get('content-length')||0)>25000)fail(413,'Request too large');
 const raw=await req.text();if(new TextEncoder().encode(raw).length>25000)fail(413,'Request too large');
 let obj;try{obj=JSON.parse(raw)}catch{fail(400,'Invalid JSON')}
 if(!obj||Array.isArray(obj)||typeof obj!=='object')fail(422,'Expected an object');return obj;
}
async function own(db,id,user){
 if(!/^[0-9a-f-]{36}$/i.test(id))fail(404,'Trip not found');
 const trip=await one(db,'SELECT id FROM trips WHERE id=? AND owner_uid=?',id,user.uid);
 if(!trip)fail(404,'Trip not found');return trip;
}
export async function stage4Route({request,db,user,env,method,path}){
 if(path==='/api/v1/saved-parks'){
  if(method==='GET'){
   const state=await one(db,'SELECT revision,updated_at FROM saved_parks_state WHERE uid=?',user.uid);
   const saved=await many(db,'SELECT park_slug FROM saved_parks WHERE uid=? ORDER BY park_slug',user.uid);
   return json({revision:state?.revision||0,updatedAt:state?.updated_at||0,parks:saved.map(x=>x.park_slug)});
  }
  if(method!=='PUT')return json({error:'Method not allowed'},405);
  const data=await body(request),parks=data.parks;
  if(!Number.isSafeInteger(data.expectedRevision)||data.expectedRevision<0||!Array.isArray(parks)||parks.length>116||
     parks.some(p=>typeof p!=='string'||p.length>128||!/^[a-z0-9-]+$/.test(p))||new Set(parks).size!==parks.length)
     fail(422,'Invalid saved parks or expected revision');
  const timestamp=Date.now(),writeId=crypto.randomUUID();
  const statements=[
   db.prepare('INSERT OR IGNORE INTO saved_parks_state(uid,revision,updated_at,last_write_id) VALUES(?,0,0,\'\')').bind(user.uid),
   db.prepare('UPDATE saved_parks_state SET revision=revision+1,updated_at=?,last_write_id=? WHERE uid=? AND revision=?').bind(timestamp,writeId,user.uid,data.expectedRevision),
   db.prepare('DELETE FROM saved_parks WHERE uid=? AND EXISTS(SELECT 1 FROM saved_parks_state WHERE uid=? AND last_write_id=?)').bind(user.uid,user.uid,writeId),
   ...parks.map(p=>db.prepare('INSERT INTO saved_parks(uid,park_slug,saved_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM saved_parks_state WHERE uid=? AND last_write_id=?)').bind(user.uid,p,timestamp,user.uid,writeId))
  ];
  const results=await db.batch(statements);
  if(!results[1]?.meta?.changes)return json({error:'Saved parks changed on another device. Review both lists before overwriting.'},409);
  return json({revision:data.expectedRevision+1,updatedAt:timestamp,parks});
 }
 if(path==='/api/v1/admin/overview'&&method==='GET'){
  if(!(await isAdmin(db,env,user)))fail(403,'Administrator access required');
  const now=Date.now();
  const counts=await one(db,`SELECT
   (SELECT count(*) FROM users) AS users,
   (SELECT count(*) FROM users WHERE last_active_at>=?) AS active_users_30d,
   (SELECT count(*) FROM trips) AS trips,
   (SELECT count(*) FROM trips WHERE has_schedule=1) AS scheduled_trips,
   (SELECT coalesce(sum(bytes),0) FROM trips) AS trip_document_bytes,
   (SELECT count(*) FROM saved_parks) AS saved_parks,
   (SELECT count(*) FROM trip_members) AS collaborators,
   (SELECT count(*) FROM trip_invitations WHERE accepted_at IS NULL AND expires_at>?) AS pending_invitations`,now-30*86400000,now);
  const months=await many(db,`SELECT strftime('%Y-%m',created_at/1000,'unixepoch') AS month,count(*) AS trips
   FROM trips WHERE created_at>=? GROUP BY month ORDER BY month`,now-183*86400000);
  return json({summary:counts,monthlyTrips:months,asOf:now,storageNote:'Trip-document JSON bytes only; not total Cloudflare D1 database size.'});
 }
 const sharing=/^\/api\/v1\/trips\/([0-9a-f-]{36})\/sharing$/i.exec(path);
 if(sharing&&method==='GET'){
  await own(db,sharing[1],user);
  const members=await many(db,`SELECT m.uid,m.role,m.joined_at,u.email FROM trip_members m
   JOIN users u ON u.uid=m.uid WHERE m.trip_id=? ORDER BY u.email`,sharing[1]);
  const invitations=await many(db,`SELECT id,email,role,created_at,expires_at FROM trip_invitations
   WHERE trip_id=? AND accepted_at IS NULL AND expires_at>? ORDER BY created_at DESC`,sharing[1],Date.now());
  return json({members,invitations});
 }
 const member=/^\/api\/v1\/trips\/([0-9a-f-]{36})\/members\/([^/]+)$/i.exec(path);
 if(member&&method==='PATCH'){
  await own(db,member[1],user);const data=await body(request);
  if(!roles.has(data.role)||!member[2]||member[2].length>128)fail(422,'Viewer or editor role required');
  const result=await db.prepare('UPDATE trip_members SET role=? WHERE trip_id=? AND uid=?').bind(data.role,member[1],decodeURIComponent(member[2])).run();
  if(!result.meta?.changes)fail(404,'Member not found');return json({updated:true,role:data.role});
 }
 return null;
}
