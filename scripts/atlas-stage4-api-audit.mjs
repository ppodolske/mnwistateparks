import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {stage4Route} from '../functions/_lib/stage4.mjs';
import {ApiError} from '../functions/_lib/auth.mjs';
const require=createRequire(import.meta.url),{DatabaseSync}=require('node:sqlite');
class D1{
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec('PRAGMA foreign_keys=ON;');for(const f of ['0001_atlas_accounts.sql','0002_atlas_accounts_stage2.sql','0003_atlas_accounts_stage4.sql'])this.db.exec(readFileSync(resolve(import.meta.dirname,'../migrations',f),'utf8'));}
 prepare(sql){const d=this.db;let args=[];return {bind(...x){args=x;return this},first(){return d.prepare(sql).get(...args)||null},all(){return {results:d.prepare(sql).all(...args)}},run(){return {meta:{changes:Number(d.prepare(sql).run(...args).changes)}}}}}
 async batch(stmts){this.db.exec('BEGIN IMMEDIATE');try{const r=stmts.map(s=>s.run());this.db.exec('COMMIT');return r}catch(e){this.db.exec('ROLLBACK');throw e}}
}
const db=new D1(),t=Date.now(),owner={uid:'owner',email:'admin@example.com'},friend={uid:'friend',email:'friend@example.com'},stranger={uid:'stranger',email:'stranger@example.com'};
for(const u of [owner,friend,stranger])db.db.prepare('INSERT INTO users(uid,email,created_at,last_active_at) VALUES(?,?,?,?)').run(u.uid,u.email,t,t);
db.db.prepare('INSERT INTO atlas_admin(id,uid,created_at) VALUES(1,?,?)').run(owner.uid,t);
const tripId='00000000-1111-4222-8333-000000000001';
db.db.prepare('INSERT INTO trips(id,owner_uid,title,document,revision,has_schedule,bytes,created_at,updated_at) VALUES(?,?,?,?,1,0,10,?,?)').run(tripId,owner.uid,'private itinerary','{"parks":[]}',t,t);
db.db.prepare('INSERT INTO trip_members(trip_id,uid,role,joined_at) VALUES(?,?,?,?)').run(tripId,friend.uid,'viewer',t);
db.db.prepare('INSERT INTO trip_invitations(id,trip_id,email,role,token_hash,created_by,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').run('invite-1',tripId,'invite@example.com','editor','hash',owner.uid,t,t+86400000);
const req=(path,method='GET',data)=>new Request('https://parks.preston.run'+path,{method,headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
async function call(who,path,method='GET',data){try{const r=await stage4Route({request:req(path,method,data),db,user:who,env:{ATLAS_ADMIN_EMAIL:'admin@example.com'},method,path});return {status:r?.status,body:r?await r.json():null}}catch(e){if(e instanceof ApiError)return {status:e.status,body:{error:e.message}};throw e}}
test('Saved parks are per-user, revision checked, and updates are atomic',async()=>{
 let a=await call(owner,'/api/v1/saved-parks');assert.deepEqual(a.body.parks,[]);assert.equal(a.body.revision,0);
 a=await call(owner,'/api/v1/saved-parks','PUT',{expectedRevision:0,parks:['rice','afton']});assert.equal(a.status,200);assert.equal(a.body.revision,1);
 a=await call(owner,'/api/v1/saved-parks','PUT',{expectedRevision:0,parks:['other']});assert.equal(a.status,409);
 a=await call(owner,'/api/v1/saved-parks');assert.deepEqual(a.body.parks,['afton','rice'],'rejected edit must not delete saved rows');
 a=await call(friend,'/api/v1/saved-parks');assert.deepEqual(a.body.parks,[]);
 a=await call(friend,'/api/v1/saved-parks','PUT',{expectedRevision:0,parks:['maple']});assert.equal(a.status,200);
 a=await call(owner,'/api/v1/saved-parks');assert.deepEqual(a.body.parks,['afton','rice']);
 a=await call(owner,'/api/v1/saved-parks','PUT',{expectedRevision:1,parks:['afton','afton']});assert.equal(a.status,422);
 a=await call(owner,'/api/v1/saved-parks','PUT',{expectedRevision:1,parks:['../private']});assert.equal(a.status,422);
});
test('Administration reveals only aggregates, not account or trip contents',async()=>{
 const deny=await call(stranger,'/api/v1/admin/overview');assert.equal(deny.status,403);
 const yes=await call(owner,'/api/v1/admin/overview');assert.equal(yes.status,200);
 assert.equal(yes.body.summary.users,3);assert.equal(yes.body.summary.trips,1);
 assert.equal(yes.body.summary.saved_parks,3);
 const body=JSON.stringify(yes.body);for(const hidden of ['friend@example.com','private itinerary','invite@example.com','admin@example.com'])assert.equal(body.includes(hidden),false);
 assert.ok(Array.isArray(yes.body.monthlyTrips));
});
test('Sharing is visible only to owner and role changes are owner-only',async()=>{
 let x=await call(friend,`/api/v1/trips/${tripId}/sharing`);assert.equal(x.status,404);
 x=await call(stranger,`/api/v1/trips/${tripId}/sharing`);assert.equal(x.status,404);
 x=await call(owner,`/api/v1/trips/${tripId}/sharing`);assert.equal(x.status,200);assert.equal(x.body.members[0].email,'friend@example.com');assert.equal(x.body.invitations[0].email,'invite@example.com');
 x=await call(friend,`/api/v1/trips/${tripId}/members/owner`,'PATCH',{role:'editor'});assert.equal(x.status,404);
 x=await call(owner,`/api/v1/trips/${tripId}/members/friend`,'PATCH',{role:'editor'});assert.equal(x.status,200);
 assert.equal(db.db.prepare("SELECT role FROM trip_members WHERE uid='friend'").get().role,'editor');
 x=await call(owner,`/api/v1/trips/${tripId}/members/friend`,'PATCH',{role:'admin'});assert.equal(x.status,422);
 x=await call(owner,`/api/v1/trips/${tripId}/members/not-present`,'PATCH',{role:'viewer'});assert.equal(x.status,404);
});
