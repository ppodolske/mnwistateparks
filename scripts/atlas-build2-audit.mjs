import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const core=require('./atlas-trip-experience-core.js');
const timeline=require('./trip-timeline-model.js');
const sample=()=>({id:'sample',name:'Camping Trip',parks:['afton','rice'],startDate:'2026-11-01',endDate:'2026-11-03',startLocation:'Home',endLocation:'Home',
 stopMeta:{afton:{campground:'West',campsite:'A12',reservation:'RES-1',note:'Keep note',dossierV1:{personalNotes:'Old note',bookingStatus:'confirmed',otherInternalField:'preserve'}},rice:{}},
 timelineV1:{version:1,visits:{afton:{start:'2026-11-01',end:'2026-11-03',stay:'camp'},rice:{start:'',end:'',stay:'auto'}},nights:{}}});
test('Legacy stay loads with 0/5 unchecked and no invented booking link',()=>{
 const t=sample(),d=core.dossier(t,'afton'),p=core.dossierProgress(t,'afton');
 assert.equal(d.reservation,'RES-1');assert.equal(d.bookingUrl,'');assert.equal(p.complete,0);assert.equal(p.total,5);
 assert.deepEqual(Object.values(d.checklist),[false,false,false,false,false]);
});
test('Campsite Details saves checkbox states and preserves legacy trip fields',()=>{
 const t=sample(),form={...core.dossier(t,'afton'),bookingUrl:'https://example.org/reservation/123',checklist:{reservationChecked:true,arrivalChecked:true,accessChecked:false,suppliesPacked:true,departurePlanned:false}};
 const before=JSON.stringify(t.timelineV1);
 core.updateDossier(t,'afton',form);
 assert.equal(core.dossierProgress(t,'afton').complete,3);
 assert.equal(core.dossier(t,'afton').bookingUrl,form.bookingUrl);
 assert.equal(t.stopMeta.afton.note,'Keep note');
 assert.equal(t.stopMeta.afton.dossierV1.otherInternalField,'preserve');
 assert.equal(t.stopMeta.afton.reservation,'RES-1');
 assert.equal(JSON.stringify(t.timelineV1),before);
 assert.deepEqual(t.stopMeta.rice,{});
});
test('Malformed or insecure booking URLs reject atomically',()=>{
 for(const url of ['http://example.org','javascript:alert(1)','ftp://example.org','https://user:pass@example.org']){
  const t=sample(),before=JSON.stringify(t);
  assert.throws(()=>core.updateDossier(t,'afton',{...core.dossier(t,'afton'),bookingUrl:url}),/HTTPS/);
  assert.equal(JSON.stringify(t),before,url);
 }
});
test('Invalid checkbox values reject atomically',()=>{
 const t=sample(),before=JSON.stringify(t);
 assert.throws(()=>core.updateDossier(t,'afton',{...core.dossier(t,'afton'),checklist:{arrivalChecked:'yes'}}));
 assert.equal(JSON.stringify(t),before);
});
test('Prepared trip snapshot carries only recorded checklist values, no edits',()=>{
 const t=sample();
 core.updateDossier(t,'afton',{...core.dossier(t,'afton'),bookingUrl:'https://example.org/book',checklist:{reservationChecked:true,departurePlanned:true}});
 const before=JSON.stringify(t);
 const snap=core.snapshot(t,[{slug:'afton',name:'Afton State Park'},{slug:'rice',name:'Rice Lake State Park'}],timeline,[]);
 assert.equal(snap.rows[0].nightDossier.checklist.departurePlanned,true);
 assert.equal(snap.rows[0].nightDossier.bookingUrl,'https://example.org/book');
 assert.equal(JSON.stringify(t),before);
});
test('Print and offline Trip Mode include recorded details',()=>{
 const pdf=fs.readFileSync(new URL('./atlas-print-reference.js',import.meta.url),'utf8');
 const tripMode=fs.readFileSync(new URL('./atlas-trip-mode-page.html',import.meta.url),'utf8');
 const ui=fs.readFileSync(new URL('./atlas-trip-experience.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('./atlas-trip-experience.css',import.meta.url),'utf8');
 for(const text of ['Preparation checked','Saved booking link','contactNotes','reservationChecked'])assert(pdf.includes(text),'PDF missing '+text);
 for(const text of ['Preparation checked','Saved booking link','departurePlanned'])assert(tripMode.includes(text),'Trip Mode missing '+text);
 for(const text of ['CAMPSITE DETAILS','Save details','Campsite details','C.checklistItems','bookingUrl','YOUR CAMPSITE'])assert(ui.includes(text),'Trip UI missing '+text);
 assert(!ui.includes('CAMPSITE DOSSIER'));
 assert(css.includes('Build 2: Campsite Details')&&css.includes('.ax2-dossier-check'));
 for(const script of tripMode.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(script[1]);
});
