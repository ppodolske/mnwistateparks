import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPairSync,sign as rsaSign,webcrypto} from 'node:crypto';
import {safeHandle} from '../functions/_lib/api.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON;');
for(const file of ['0001_atlas_accounts.sql','0002_atlas_accounts_stage2.sql'])
  db.exec(readFileSync(resolve(import.meta.dirname,'../migrations',file),'utf8'));
class D1{
  prepare(sql){let args=[];return{bind(...a){args=a;return this},first(){return db.prepare(sql).get(...args)||null},all(){return {results:db.prepare(sql).all(...args)}},run(){const x=db.prepare(sql).run(...args);return {meta:{changes:Number(x.changes)}}}}}
  async batch(stmts){db.exec('BEGIN IMMEDIATE');try{const result=stmts.map(s=>s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
}
const d1=new D1(),project='atlas-stage2-test',env={ATLAS_DB:d1,FIREBASE_PROJECT_ID:project,ATLAS_ADMIN_EMAIL:'owner@example.com'};
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'stage2',alg:'RS256',use:'sig'};
const b64=v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url');
function token(uid,email){const ts=Math.floor(Date.now()/1000);const header=b64({alg:'RS256',kid:'stage2'});const payload=b64({aud:project,iss:`https://securetoken.google.com/${project}`,sub:uid,email,email_verified:true,iat:ts-10,exp:ts+600,auth_time:ts-20,firebase:{sign_in_provider:'google.com'}});const body=header+'.'+payload;return body+'.'+rsaSign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url')}
async function call(uid,email,method,path,body){const r=await safeHandle({env,request:new Request('https://parks.preston.run'+path,{method,headers:{authorization:'Bearer '+token(uid,email),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})},{authOptions:{getKeys:async()=>({keys:[jwk]})}});return {status:r.status,data:await r.json()}}
const document={id:'trip-1700000000000',name:'Trip TEST',startDate:'2026-10-31',endDate:'2026-11-07',parks:['rice'],stopMeta:{rice:{reservation:'SECRET-ONLY-OWNER'}},timelineV1:{visits:{rice:{start:'2026-10-31',end:'2026-11-02',stay:'camp'}}}};
test('Admin binds to first verified matching Google account, never a user-supplied role',async()=>{
 let x=await call('stranger','stranger@example.com','GET','/api/v1/account');assert.equal(x.status,200);assert.equal(x.data.admin,false);
 x=await call('owner','owner@example.com','GET','/api/v1/account');assert.equal(x.status,200);assert.equal(x.data.admin,true);
 x=await call('second','owner@example.com','GET','/api/v1/account');assert.equal(x.status,200);assert.equal(x.data.admin,false,'same email cannot replace first bound UID');
 x=await call('stranger','stranger@example.com','GET','/api/v1/admin/summary');assert.equal(x.status,403);
 x=await call('second','owner@example.com','GET','/api/v1/admin/summary');assert.equal(x.status,403);
 x=await call('owner','owner@example.com','GET','/api/v1/admin/summary');assert.equal(x.status,200);
});
test('Browser migration is owner-only, idempotent, non-destructive, no cross-user data',async()=>{
 let x=await call('owner','owner@example.com','POST','/api/v1/migrations',{sourceId:document.id,document});
 assert.equal(x.status,201,JSON.stringify(x.data));const id=x.data.id;assert.equal(x.data.alreadyImported,false);
 x=await call('owner','owner@example.com','POST','/api/v1/migrations',{sourceId:document.id,document:{...document,name:'Different; should not overwrite'}});
 assert.equal(x.status,200);assert.equal(x.data.alreadyImported,true);assert.equal(x.data.id,id);
 assert.equal(db.prepare('SELECT count(*) AS n FROM trips WHERE owner_uid=?').get('owner').n,1);
 x=await call('owner','owner@example.com','GET','/api/v1/trips/'+id);
 assert.equal(x.status,200);assert.equal(x.data.document.stopMeta.rice.reservation,'SECRET-ONLY-OWNER');assert.equal(x.data.document.name,'Trip TEST');
 x=await call('stranger','stranger@example.com','GET','/api/v1/trips/'+id);assert.equal(x.status,404);
 x=await call('stranger','stranger@example.com','GET','/api/v1/migrations');assert.equal(x.status,200);assert.equal(x.data.imports.length,0);
 x=await call('stranger','stranger@example.com','POST','/api/v1/migrations',{sourceId:document.id,document});assert.equal(x.status,201);assert.notEqual(x.data.id,id);
 x=await call('owner','owner@example.com','GET','/api/v1/migrations');assert.equal(x.data.imports.length,1);assert.equal('document' in x.data.imports[0],false);
 x=await call('owner','owner@example.com','POST','/api/v1/migrations',{sourceId:'bad id',document});assert.equal(x.status,422);
 x=await call('owner','owner@example.com','POST','/api/v1/migrations',{sourceId:'bad-shape',document:{name:'Missing parks'}});assert.equal(x.status,422);
 const admin=await call('owner','owner@example.com','GET','/api/v1/admin/summary');assert.equal(admin.status,200);assert.equal(admin.data.summary.trips,2);assert.equal(JSON.stringify(admin.data).includes('SECRET-ONLY-OWNER'),false);
});
