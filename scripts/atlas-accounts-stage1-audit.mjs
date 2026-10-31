import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {generateKeyPairSync,sign as rsaSign,webcrypto} from 'node:crypto';
import {safeHandle} from '../functions/_lib/api.mjs';
import {verifyFirebase} from '../functions/_lib/auth.mjs';
const require=createRequire(import.meta.url),{DatabaseSync}=require('node:sqlite');
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const dbFile=resolve(import.meta.dirname,'../migrations/0001_atlas_accounts.sql');
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'unit-key',alg:'RS256',use:'sig'};
const jwks={keys:[jwk]};
const b64=x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url');
const project='atlas-accounts-stage1-test';
const ts=Math.floor(Date.now()/1000);
function sign(uid,email,overrides={},fake=false){
 const header={typ:'JWT',alg:'RS256',kid:'unit-key'};
 const payload={aud:project,iss:`https://securetoken.google.com/${project}`,sub:uid,email,email_verified:true,iat:ts-5,exp:ts+3600,auth_time:ts-200,firebase:{sign_in_provider:'google.com'},...overrides};
 const data=b64(header)+'.'+b64(payload);
 return data+'.'+(fake?b64('forgery'):rsaSign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url'));
}
class D1 {
 constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec('PRAGMA foreign_keys=ON;');this.sqlite.exec(readFileSync(dbFile,'utf8'))}
 prepare(sql){const db=this.sqlite;let args=[];return {bind(...values){args=values;return this},first(){return db.prepare(sql).get(...args)||null},all(){return {results:db.prepare(sql).all(...args)}},run(){const info=db.prepare(sql).run(...args);return {meta:{changes:Number(info.changes)}}}}}
 async batch(statements){this.sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.run());this.sqlite.exec('COMMIT');return results}catch(e){this.sqlite.exec('ROLLBACK');throw e}}
}
const db=new D1();const env={ATLAS_DB:db,FIREBASE_PROJECT_ID:project,ATLAS_ADMIN_UID:'owner'};
const payload={name:'Northern Parks',parks:['rice'],startDate:'2026-10-31',endDate:'2026-11-07',stopMeta:{rice:{reservation:'private-code'}},timelineV1:{visits:{rice:{start:'2026-10-31',end:'2026-11-02',stay:'camp'}}}};
async function call(uid,email,method,path,body,tokenOverrides={},bad=false){
 const jwt=sign(uid,email,tokenOverrides,bad);
 const req=new Request('https://parks.preston.run'+path,{method,headers:{Authorization:'Bearer '+jwt,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const response=await safeHandle({request:req,env},{authOptions:{getKeys:async()=>jwks}});
 return {status:response.status,body:await response.json()};
}
test('Google identity: rejects forgery, bad issuer, wrong project and unverified email',async()=>{
 await assert.rejects(()=>verifyFirebase(sign('owner','owner@example.com',{},true),project,{getKeys:async()=>jwks}),/Invalid token signature/);
 await assert.rejects(()=>verifyFirebase(sign('owner','owner@example.com',{aud:'another-project'}),project,{getKeys:async()=>jwks}),/Invalid or unverified/);
 await assert.rejects(()=>verifyFirebase(sign('owner','owner@example.com',{email_verified:false}),project,{getKeys:async()=>jwks}),/Invalid or unverified/);
 await assert.rejects(()=>verifyFirebase(sign('owner','owner@example.com',{firebase:{sign_in_provider:'password'}}),project,{getKeys:async()=>jwks}),/Invalid or unverified/);
});
test('Full trip lifecycle, member permissions, invite email and admin privacy',async()=>{
 let response=await safeHandle({request:new Request('https://parks.preston.run/api/v1/trips'),env});assert.equal(response.status,401);
 let r=await call('owner','owner@example.com','POST','/api/v1/trips',{document:payload});assert.equal(r.status,201,r.body.error);const id=r.body.id;
 r=await call('outsider','outsider@example.com','GET',`/api/v1/trips/${id}`);assert.equal(r.status,404);
 r=await call('outsider','outsider@example.com','GET','/api/v1/admin/summary');assert.equal(r.status,403);
 r=await call('owner','owner@example.com','GET','/api/v1/admin/summary');assert.equal(r.status,200);assert.equal(r.body.summary.trips,1);assert.equal(r.body.summary.scheduled_trips,1);assert.equal('name' in r.body.summary,false);
 r=await call('owner','owner@example.com','POST',`/api/v1/trips/${id}/invitations`,{email:'Friend@Example.Com',role:'viewer'});assert.equal(r.status,201,r.body.error);const invite=r.body.inviteUrl.split('invite=')[1];assert.equal(db.sqlite.prepare('SELECT token_hash FROM trip_invitations').get().token_hash===invite,false);
 r=await call('wrong','wrong@example.com','POST','/api/v1/invitations/accept',{token:invite});assert.equal(r.status,404);
 r=await call('friend','friend@example.com','POST','/api/v1/invitations/accept',{token:invite});assert.equal(r.status,200,r.body.error);
 r=await call('friend','friend@example.com','GET',`/api/v1/trips/${id}`);assert.equal(r.status,200);assert.equal(r.body.role,'viewer');assert.equal(r.body.document.stopMeta.rice.reservation,'private-code');
 r=await call('friend','friend@example.com','PUT',`/api/v1/trips/${id}`,{expectedRevision:1,document:payload});assert.equal(r.status,403);
 r=await call('owner','owner@example.com','POST',`/api/v1/trips/${id}/invitations`,{email:'friend@example.com',role:'editor'});assert.equal(r.status,201);const edit=r.body.inviteUrl.split('invite=')[1];
 r=await call('friend','friend@example.com','POST','/api/v1/invitations/accept',{token:edit});assert.equal(r.status,200);
 r=await call('friend','friend@example.com','PUT',`/api/v1/trips/${id}`,{expectedRevision:1,document:{...payload,name:'Revised'}});assert.equal(r.status,200,r.body.error);assert.equal(r.body.revision,2);
 r=await call('owner','owner@example.com','PUT',`/api/v1/trips/${id}`,{expectedRevision:1,document:payload});assert.equal(r.status,409,'stale device save must conflict');
 r=await call('owner','owner@example.com','DELETE',`/api/v1/trips/${id}/members/friend`);assert.equal(r.status,200);
 r=await call('friend','friend@example.com','GET',`/api/v1/trips/${id}`);assert.equal(r.status,404,'revoked sharing must take effect');
 r=await call('friend','friend@example.com','POST','/api/v1/invitations/accept',{token:edit});assert.equal(r.status,404,'invitation cannot be reused');
 r=await call('owner','owner@example.com','DELETE',`/api/v1/trips/${id}`);assert.equal(r.status,200);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM trips').get().n,0);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM trip_invitations').get().n,0,'cascade invitation removal');
});
test('Database enforces collaborator roles and owner references',()=>{
 assert.throws(()=>db.sqlite.prepare("INSERT INTO trip_members(trip_id,uid,role,joined_at) VALUES('missing','owner','admin',0)").run(),/constraint/i);
});
