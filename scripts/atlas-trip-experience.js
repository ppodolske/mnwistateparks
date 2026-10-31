/* Atlas Parks Build 1: Dossier editor, source-driven readiness, offline trip snapshot.
   No direct cloud requests. Existing browser trip storage and sync remain authoritative. */
(()=>{'use strict';
const page=document.querySelector('[data-page="trip"]');
const core=window.AtlasTripExperienceCore, timeline=window.AtlasTripTimelineModel;
if(!page||!core||!timeline)return;
const id=page.dataset.tripId,key='mnwiTripCollections',parkNode=document.getElementById('parksData');
let parks=[];try{parks=JSON.parse(parkNode?.textContent||'[]')}catch{return}
const bySlug=new Map(parks.map(p=>[p.slug,p]));
const read=()=>{try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a:[]}catch{return[]}};
const current=()=>read().find(t=>t?.id===id);
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
function readOnly(){const uid=window.AtlasAccountVault?.getState?.().activeUid||window.AtlasAccountBridge?.getUid?.();if(!uid)return false;
 try{const m=JSON.parse(localStorage.getItem('atlas-sync-v1:'+uid)||'{}');return Object.values(m).some(x=>x.localId===id&&x.role==='viewer')}catch{return true}}
function write(update){if(readOnly())throw Error('Shared viewers cannot edit campsite details');
 const all=read(),trip=all.find(x=>x?.id===id);if(!trip)throw Error('Trip is no longer available');
 update(trip);localStorage.setItem(key,JSON.stringify(all));
 window.AtlasAccountVault?.snapshot?.();
 document.dispatchEvent(new CustomEvent('atlas-timeline-updated',{detail:{tripId:id,source:'dossier'}}));
 document.dispatchEvent(new CustomEvent('trip-logistics-saved',{detail:{tripId:id,source:'dossier'}}));
}
function fmt(d){if(!d)return'';return new Date(d+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'})}
const root=el('section','ax-experience');root.id='atlasTripExperience';
// Keep this standalone section at the top of the trip content; leave original editors alone.
const header=el('div','ax-head');header.append(el('h2','','Trip tools'));
const actions=el('div','ax-actions');
const mode=el('a','ax-button ax-primary','Open Trip Mode');mode.href='/tripmode/?id='+encodeURIComponent(id);
const prepare=el('button','ax-button','Prepare offline reference');prepare.type='button';
const status=el('p','ax-status','');status.setAttribute('aria-live','polite');
actions.append(mode,prepare);header.append(actions);root.append(header,status);
const readinessBox=el('section','ax-pane');readinessBox.append(el('h3','','Trip readiness'));
const findings=el('div','ax-findings');readinessBox.append(findings);root.append(readinessBox);
const dossierBox=el('section','ax-pane');dossierBox.append(el('h3','','Campsite Dossier'));
dossierBox.append(el('p','ax-help','Booking information and stay notes are part of this shared trip. A recorded reference is not a verified reservation.'));
const picker=el('select','ax-select');picker.setAttribute('aria-label','Park for campsite details');
for(const slug of current()?.parks||[]){const opt=el('option','',bySlug.get(slug)?.name||slug);opt.value=slug;picker.append(opt)}
const form=el('form','ax-form');form.noValidate=true;
const inputs={};const fields=[
 ['campground','Campground','text'],['loop','Loop','text'],['campsite','Site number','text'],
 ['reservation','Reservation reference','text'],['bookingStatus','Booking status','select'],
 ['checkIn','Check-in time','time'],['checkOut','Check-out time','time'],
 ['arrivalInstructions','Arrival instructions','textarea'],['parkingNotes','Parking / access','textarea'],
 ['waterNotes','Water availability notes','textarea'],['facilitiesNotes','Facilities notes','textarea'],
 ['contactNotes','Contact / booking notes','textarea'],['personalNotes','Other stay notes','textarea']
];
function field([name,label,type]){
 const wrap=el('label','ax-field');wrap.append(el('span','',label));let input;
 if(type==='textarea'){input=el('textarea');input.rows=2;input.maxLength=1800}
 else if(type==='select'){input=el('select');for(const [value,title] of [['not-booked','Not booked / unknown'],['pending','Awaiting confirmation'],['confirmed','Confirmed (self-reported)'],['first-come','First-come / no booking'],['cancelled','Cancelled']]){const o=el('option','',title);o.value=value;input.append(o)}}
 else{input=el('input');input.type=type;input.maxLength=250}
 input.name=name;inputs[name]=input;wrap.append(input);return wrap;
}
form.append(picker);const grid=el('div','ax-form-grid');for(const f of fields)grid.append(field(f));form.append(grid);
const save=el('button','ax-button ax-primary','Save campsite details');save.type='submit';form.append(save);
dossierBox.append(form);root.append(dossierBox);
page.prepend(root);
function renderDossier(){const slug=picker.value,t=current();if(!t||!slug){form.hidden=true;return}form.hidden=false;
 const d=core.dossier(t,slug);for(const [name,input] of Object.entries(inputs))input.value=d[name]||'';
 for(const input of Object.values(inputs))input.disabled=readOnly();save.disabled=readOnly();
}
function renderReadiness(){const trip=current();findings.replaceChildren();if(!trip){findings.append(el('p','ax-help','Trip unavailable'));return}
 const list=core.readiness(trip,parks,timeline),severities={blocker:'Conflict',attention:'Review',advisory:'Consider'};
 if(!list.length){findings.append(el('p','ax-good','No unresolved issues detected by the recorded-data checks. Check external conditions separately.'));return}
 const title=el('p','ax-summary',`${list.filter(x=>x.severity==='blocker').length} conflicts · ${list.filter(x=>x.severity==='attention').length} to review · ${list.filter(x=>x.severity==='advisory').length} advisories`);findings.append(title);
 for(const f of list){const row=el('div','ax-finding ax-'+f.severity);row.append(el('strong','',severities[f.severity]+(f.date?' · '+fmt(f.date):'')),el('span','',f.description));if(f.slug&&current()?.parks.includes(f.slug)){const b=el('button','ax-link','Open '+(bySlug.get(f.slug)?.name||f.slug));b.type='button';b.onclick=()=>{picker.value=f.slug;renderDossier();dossierBox.scrollIntoView({behavior:'smooth',block:'start'})};row.append(b)}findings.append(row)}
}
function update(){const t=current();if(!t){root.hidden=true;return}renderReadiness();if(picker.value&&t.parks.includes(picker.value))renderDossier()}
picker.addEventListener('change',renderDossier);
form.addEventListener('submit',ev=>{ev.preventDefault();try{
 const slug=picker.value;const data=Object.fromEntries(Object.entries(inputs).map(([k,n])=>[k,n.value]));
 write(trip=>core.updateDossier(trip,slug,data));status.textContent='Campsite details saved to trip. Cloud sync will reconcile the change.';renderReadiness();
 }catch(err){status.textContent='Not saved: '+err.message}});
prepare.addEventListener('click',()=>{try{
 const trip=current();if(!trip)throw Error('Trip unavailable');
 const uid=window.AtlasAccountVault?.getState?.().activeUid;
 if(!uid||uid!==window.AtlasAccountBridge?.getUid?.())throw Error('Sign in before preparing a private device reference');
 const routeRows=timeline.routes(trip,parks,window.PARK_DETAILS||{});
 const snap=core.snapshot(trip,parks,timeline,routeRows);
 localStorage.setItem('atlas-tripmode-v1:'+uid+':'+id,JSON.stringify(snap));
 status.textContent='Offline trip data saved on this device. Open Trip Mode and select Enable offline access to cache the screen.';
 }catch(err){status.textContent='Offline reference not prepared: '+err.message}
});
document.addEventListener('atlas-timeline-updated',renderReadiness);
document.addEventListener('trip-logistics-saved',renderReadiness);
document.addEventListener('atlas-account-changed',update);
update();
window.AtlasTripExperience={version:'1.0',refresh:update};
})();
