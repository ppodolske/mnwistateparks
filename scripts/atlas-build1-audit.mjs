import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const core=require('./atlas-trip-experience-core.js');
const timeline=require('./trip-timeline-model.js');
const base=()=>({id:'trip-test',name:'River weekend',startDate:'2026-10-31',endDate:'2026-11-03',startLocation:'Mequon',endLocation:'Minneapolis',parks:['afton','rice'],
 stopMeta:{afton:{campground:'Backpack',campsite:'13',reservation:'EXIST-123'},rice:{campground:'Loop A'}},
 timelineV1:{version:1,visits:{afton:{start:'2026-10-31',end:'2026-11-03',stay:'camp'},rice:{start:'2026-11-02',end:'2026-11-03',stay:'camp'}},nights:{'2026-11-02':{type:'park',slug:'rice'}}}});
const parks=[{slug:'afton',name:'Afton State Park'},{slug:'rice',name:'Rice Lake State Park'}];
test('Dossier extends legacy campground and reservation without losing either',()=>{
 const t=base(),old=JSON.stringify(t);core.updateDossier(t,'afton',{...core.dossier(t,'afton'),bookingStatus:'confirmed',parkingNotes:'Park at signed trailhead'});
 assert.equal(t.stopMeta.afton.reservation,'EXIST-123');assert.equal(t.stopMeta.afton.campsite,'13');
 assert.equal(t.stopMeta.afton.dossierV1.parkingNotes,'Park at signed trailhead');assert.equal(JSON.parse(old).stopMeta.afton.reservation,'EXIST-123');
});
test('Invalid/missing/foreign Dossier fields never mutate the trip',()=>{
 const t=base(),before=JSON.stringify(t);
 assert.throws(()=>core.updateDossier(t,'other',{bookingStatus:'confirmed'}));
 assert.throws(()=>core.updateDossier(t,'afton',{bookingStatus:'fabricated'}));
 assert.throws(()=>core.updateDossier(t,'afton',{bookingStatus:'confirmed',waterNotes:'X'.repeat(1900)}));
 assert.equal(JSON.stringify(t),before);
});
test('Timeline is authoritative: overridden overnight is not mistaken for a conflict',()=>{
 const t=base(),p=core.plan(t,parks,timeline);assert.equal(p.rows.length,4);
 assert.equal(p.rows[2].night,'park');assert.equal(p.rows[2].nightSlug,'rice');
 assert.equal(core.readiness(t,parks,timeline).some(f=>f.code==='overnight-conflict'),false);
});
test('Conflicting nights are identified, but no booking is fabricated',()=>{
 const t=base();delete t.timelineV1.nights['2026-11-02'];
 const a=core.readiness(t,parks,timeline);
 assert(a.some(x=>x.code==='overnight-conflict'&&x.date==='2026-11-02'));
 assert.equal(core.dossier(t,'rice').bookingStatus,'not-booked');
});
test('Cancellation is a blocker; first-come stays are not treated as missing a reservation',()=>{
 const t=base();const d=core.dossier(t,'rice');d.bookingStatus='first-come';core.updateDossier(t,'rice',d);
 assert(!core.readiness(t,parks,timeline).some(f=>f.slug==='rice'&&f.code==='reservation-unverified'));
 const d2=core.dossier(t,'rice');d2.bookingStatus='cancelled';core.updateDossier(t,'rice',d2);
 assert(core.readiness(t,parks,timeline).some(f=>f.slug==='rice'&&f.code==='cancelled-stay'));
});
test('Offline snapshot captures only recorded data and preserves itinerary without changing input',()=>{
 const t=base(),before=JSON.stringify(t);const s=core.snapshot(t,parks,timeline,[]);
 assert.equal(s.rows.length,4);assert.equal(s.rows[0].nightDossier.reservation,'EXIST-123');
 assert.equal(s.rows[2].nightDossier.reservation,'');assert.equal(JSON.stringify(t),before);
});
test('Readiness flags missing dates rather than inventing a date',()=>{
 const t=base();t.endDate='';assert(core.readiness(t,parks,timeline).some(f=>f.code==='invalid-dates'));
});
test('Integrated scripts, print export and self-contained offline mode are delivered',()=>{
 const build=fs.readFileSync('scripts/build-cloudflare.js','utf8');
 const pdf=fs.readFileSync('scripts/atlas-print-reference.js','utf8');
 const shell=fs.readFileSync('scripts/atlas-trip-mode-page.html','utf8');
 const css=fs.readFileSync('scripts/atlas-account.css','utf8');
 assert(build.includes('tripmode/index.html')&&build.includes('/atlas-trip-experience.js'));
 assert(pdf.includes('dossier=m.dossierV1')&&pdf.includes('Arrival instructions'));
 assert(shell.includes('atlas-vault-active-uid')&&shell.includes('Enable offline access'));
 assert(css.includes('aa-type-build1'));
});
