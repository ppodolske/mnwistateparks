import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const core=require('./atlas-trip-experience-core.js');
const timeline=require('./trip-timeline-model.js');
const t={id:'workspace2-sample',name:'Trip',startDate:'2026-10-31',endDate:'2026-11-04',startLocation:'Mequon',endLocation:'Minneapolis',parks:['afton','rice'],stopMeta:{afton:{campground:'Afton',campsite:'13',reservation:'KEEP'},rice:{campground:'Rice Lake'}},timelineV1:{version:1,visits:{afton:{start:'2026-10-31',end:'2026-11-03',stay:'camp'},rice:{start:'2026-11-02',end:'2026-11-04',stay:'camp'}},nights:{}}};
const parks=[{slug:'afton',name:'Afton State Park'},{slug:'rice',name:'Rice Lake State Park'}];
test('canonical timeline records overnight overlaps; readiness surfaces them once',()=>{
 const p=core.plan(t,parks,timeline);assert.equal(p.rows.length,5);
 const issues=core.readiness(t,parks,timeline);assert.equal(issues.filter(f=>f.code==='overnight-conflict').length,1);
});
test('overnight override resolves overlap without changing visit dates',()=>{
 const x=JSON.parse(JSON.stringify(t));timeline.setNight(x,'2026-11-02',{type:'park',slug:'rice'});
 const r=timeline.schedule(x);assert.deepEqual(r.conflicts,[]);
 assert.equal(r.rows[2].night.slug,'rice');assert.equal(x.timelineV1.visits.afton.end,'2026-11-03');
});
test('dossier update preserves booking, original notes and unrelated park',()=>{
 const x=JSON.parse(JSON.stringify(t));const before=JSON.stringify(x.stopMeta.rice);
 core.updateDossier(x,'afton',{campground:'Afton',loop:'B',campsite:'19',reservation:'KEEP',checkIn:'15:00',checkOut:'11:00',bookingStatus:'confirmed',arrivalInstructions:'Arrive early',parkingNotes:'Near trail',waterNotes:'Bring water',facilitiesNotes:'Basic',contactNotes:'',personalNotes:''});
 assert.equal(x.stopMeta.afton.reservation,'KEEP');assert.equal(x.stopMeta.afton.campsite,'19');
 assert.equal(JSON.stringify(x.stopMeta.rice),before);
});
test('no unverified booking becomes blocker',()=>{
 const x=JSON.parse(JSON.stringify(t));timeline.setNight(x,'2026-11-02',{type:'park',slug:'rice'});
 const issues=core.readiness(x,parks,timeline);
 assert(!issues.some(f=>f.code==='reservation-unverified'&&f.severity==='blocker'));
});
test('new controller is single presentation owner and retains old editors and exporter',()=>{
 const s=fs.readFileSync(new URL('./atlas-trip-experience.js',import.meta.url),'utf8');
 for(const v of ['ax-ws2-active','legacyNext.remove()','originalItinerary','originalLogistics','pdfControlsHome','pdfButtonHome','AtlasTripExperience','atlas-timeline-updated','ax2NightForm','ax2StayForm'])assert(s.includes(v),v);
 assert(!s.includes('fetch('),'workspace should not issue a separate cloud fetch');
 const css=fs.readFileSync(new URL('./atlas-trip-experience.css',import.meta.url),'utf8');
 assert(css.includes('.ax2-day-card')&&css.includes('.ax2-drawer')&&css.includes('@media(max-width:660px)'));
 const cleanup=fs.readFileSync(new URL('../trip-workspace-cleanup.js',import.meta.url),'utf8');
 assert(cleanup.includes("if(page.classList.contains('ax-ws2-active'))return;"));
});

test('Workspace 2.1 uses a modal editor and an independent searchable park picker',()=>{
 const js=fs.readFileSync(new URL('./atlas-trip-experience.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('./atlas-trip-experience.css',import.meta.url),'utf8');
 for(const key of ['data-action="add-park"','data-action="choose-park"','function availableParks','function choosePark','function closeSchedule','ax2ParkSearch','ax2ScheduleTitle','aria-modal="true"','ax2-advanced']) assert(js.includes(key),key);
 assert(js.includes("if(t.parks.includes(slug))throw Error('This park is already in the trip')"));
 assert(js.includes("if(isViewer()){drawer('TRIP PARKS'"));
 assert(js.includes("editorHost.appendChild(legacyTimeline)"));
 assert(!js.includes("ed.scrollIntoView"),'schedule must not open beneath timeline');
 assert(css.includes('.ax2-editor{position:fixed')&&css.includes('.ax2-park-result'));
});
