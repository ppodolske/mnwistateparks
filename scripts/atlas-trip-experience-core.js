/* Atlas Parks Build 1: pure, testable Trip Mode/Campsite Dossier/Readiness model.
   No APIs, storage writes, generated reservations, or geolocation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.AtlasTripExperienceCore=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const FIELDS=['bookingStatus','bookingUrl','arrivalInstructions','parkingNotes','waterNotes','facilitiesNotes','contactNotes','personalNotes'];
const checklistItems=[
 ['reservationChecked','Reservation or arrival policy reviewed'],
 ['arrivalChecked','Arrival details and check-in reviewed'],
 ['accessChecked','Access, parking and conditions checked'],
 ['suppliesPacked','Camping supplies prepared'],
 ['departurePlanned','Checkout and departure planned']
];
const statuses=['not-booked','pending','confirmed','first-come','cancelled'];
const sane=x=>typeof x==='string'?x.trim():'';
const blank=x=>!sane(x);
function dossier(trip,slug){const meta=trip?.stopMeta?.[slug]||{};const nested=meta.dossierV1&&typeof meta.dossierV1==='object'&&!Array.isArray(meta.dossierV1)?meta.dossierV1:{};
  const out={slug, campground:sane(meta.campground),loop:sane(meta.loop),campsite:sane(meta.campsite),reservation:sane(meta.reservation),checkIn:sane(meta.checkIn),checkOut:sane(meta.checkOut)};
  for(const f of FIELDS)out[f]=sane(nested[f]);
  if(!statuses.includes(out.bookingStatus))out.bookingStatus='not-booked';
  const raw=nested.checklist&&typeof nested.checklist==='object'&&!Array.isArray(nested.checklist)?nested.checklist:{};
  out.checklist=Object.fromEntries(checklistItems.map(([key])=>[key,raw[key]===true]));
  return out;
}
function dossierProgress(trip,slug){
 const d=dossier(trip,slug);
 const complete=checklistItems.filter(([key])=>d.checklist[key]).length;
 return {complete,total:checklistItems.length,pending:checklistItems.filter(([key])=>!d.checklist[key]).map(([key,title])=>({key,title})),bookingStatus:d.bookingStatus};
}
function updateDossier(trip,slug,form){if(!trip||!Array.isArray(trip.parks)||!trip.parks.includes(slug))throw Error('Park is not part of this trip');
  if(!form||typeof form!=='object')throw Error('Invalid campsite dossier');
  const current=trip.stopMeta?.[slug]||{};const copy={...current};
  for(const key of ['campground','loop','campsite','reservation','checkIn','checkOut']){
    const val=sane(form[key]);if(val.length>250)throw Error(key+' is too long');copy[key]=val;
  }
  const ext={};for(const key of FIELDS){const val=sane(form[key]);
    if(val.length>(key==='bookingUrl'?500:1800))throw Error(key+' is too long');
    ext[key]=val;
  }
  if(!statuses.includes(ext.bookingStatus))throw Error('Invalid booking status');
  if(ext.bookingUrl){
    let u;try{u=new URL(ext.bookingUrl)}catch{throw Error('Booking link must be an HTTPS URL')}
    if(u.protocol!=='https:'||!u.hostname||u.username||u.password)throw Error('Booking link must be an HTTPS URL without credentials');
  }
  if(form.checklist!==undefined){
    if(!form.checklist||typeof form.checklist!=='object'||Array.isArray(form.checklist))throw Error('Invalid campsite checklist');
    for(const [key] of checklistItems)if(form.checklist[key]!==undefined&&typeof form.checklist[key]!=='boolean')throw Error('Invalid checklist value: '+key);
    ext.checklist=Object.fromEntries(checklistItems.map(([key])=>[key,form.checklist[key]===true]));
  }
  copy.dossierV1={...(current.dossierV1||{}),...ext};
  trip.stopMeta={...(trip.stopMeta||{}),[slug]:copy};return copy;
}
function plan(trip,parks,timeline){if(!trip||!Array.isArray(trip.parks))return null;
  // Call the canonical model on a clone; never let document generation migrate live state.
  const safe=JSON.parse(JSON.stringify(trip));
  const calendar=timeline?.schedule?.(safe);if(!calendar?.rows)return null;
  const bySlug=new Map((parks||[]).map(p=>[p.slug,p]));
  const rows=calendar.rows.map((r,i)=>{
    const night=r.night||null;
    const slug=night?.type==='park'?night.slug:'';
    return {date:r.date,index:i+1,visits:(r.visits||[]).map(v=>({slug:v.slug,name:bySlug.get(v.slug)?.name||v.slug})),
      night:night?.type||'end',nightSlug:slug,nightName:slug?(bySlug.get(slug)?.name||slug):night?.type==='other'?sane(night.label):'',
      conflictSlugs:night?.type==='conflict'?(night.candidates||[]):[]};
  });
  return {start:calendar.start,end:calendar.end,rows,tripName:sane(trip.name)||'Untitled trip',startLocation:sane(trip.startLocation),endLocation:sane(trip.endLocation)};
}
function readiness(trip,parks,timeline){const p=plan(trip,parks,timeline);const findings=[];
  const add=(severity,code,date,slug,description)=>findings.push({severity,code,date,slug,description});
  if(!p){add('attention','invalid-dates','','','Set a valid start and end date to enable day-by-day travel and overnight checks.');return findings;}
  if(!p.startLocation)add('attention','missing-start','','','Add your starting location for route planning.');
  if(!p.endLocation)add('advisory','missing-end','','','Add your finishing destination if you want the final drive represented.');
  for(const row of p.rows){
    if(row.night==='conflict')add('blocker','overnight-conflict',row.date,'','Two or more park stays claim the same overnight base. Select one.');
    if(row.night==='none')add('attention','night-unassigned',row.date,'','No overnight location is selected. This can be intentional; review before departure.');
    if(row.night==='park'){
      const d=dossier(trip,row.nightSlug);
      if(blank(d.campground))add('attention','campground-missing',row.date,row.nightSlug,'Campground has not been recorded.');
      if(blank(d.campsite)&&d.bookingStatus==='confirmed')add('advisory','site-missing',row.date,row.nightSlug,'Booking marked confirmed but no campsite number recorded; may be an unassigned site.');
      if(d.bookingStatus==='cancelled')add('blocker','cancelled-stay',row.date,row.nightSlug,'This night is assigned to a stay marked cancelled.');
      if(d.bookingStatus==='not-booked')add('advisory','reservation-unverified',row.date,row.nightSlug,'No booking is recorded as confirmed; this may be intentional.');
    }
  }
  const unplanned=(trip.parks||[]).filter(slug=>!p.rows.some(r=>r.visits.some(v=>v.slug===slug)));
  for(const slug of unplanned)add('attention','visit-unscheduled','',slug,'Park is in the trip but has no scheduled visit dates.');
  // Repeat the same missing campground/booking for each night is noisy; group by code/slug.
  return findings.filter((f,i,arr)=>!['campground-missing','site-missing','cancelled-stay','reservation-unverified'].includes(f.code)||arr.findIndex(x=>x.code===f.code&&x.slug===f.slug)===i);
}
function snapshot(trip,parks,timeline,routeRows){const p=plan(trip,parks,timeline);if(!p)throw Error('Set valid trip dates before preparing offline Trip Mode');
  const bySlug=new Map((parks||[]).map(x=>[x.slug,x]));
  const rows=p.rows.map((r,i)=>({...r,route: /^https:\/\//.test(routeRows?.[i]?.url||'')?routeRows[i].url:'',
    nightDossier:r.nightSlug?dossier(trip,r.nightSlug):null,
    notes:r.visits.map(v=>({slug:v.slug,notes:sane(trip.stopMeta?.[v.slug]?.note),address:sane(bySlug.get(v.slug)?.address)}))}));
  return {version:1,preparedAt:new Date().toISOString(),tripId:trip.id,tripName:p.tripName,start:p.start,end:p.end,
    startLocation:p.startLocation,endLocation:p.endLocation,rows};
}
return {dossier,updateDossier,dossierProgress,checklistItems,plan,readiness,snapshot,statuses};
});
