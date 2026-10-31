/* Atlas Trip Workspace 2.0 — one read-only itinerary view, contextual trip editors.
 * The accepted Timeline model, dossier model, original editor, export and sync remain authoritative.
 * The workspace never makes a cloud request or migrates trip data. */
(()=>{'use strict';
const page=document.querySelector('[data-page="trip"]');
const T=window.AtlasTripTimelineModel,C=window.AtlasTripExperienceCore;
if(!page||!T||!C)return;
const tripId=page.dataset.tripId,KEY='mnwiTripCollections';
const parkData=document.getElementById('parksData');if(!tripId||!parkData)return;
let parks;try{parks=JSON.parse(parkData.textContent||'[]')}catch{return;}
if(!Array.isArray(parks))return;
const bySlug=new Map(parks.map(p=>[p.slug,p]));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=esc;
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const trip=()=>read().find(x=>x?.id===tripId)||null;
const name=slug=>bySlug.get(slug)?.name||slug;
const short=slug=>name(slug).replace(/ State Park$/i,'');
const fmt=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')?new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}):'';
const weekday=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'}).toUpperCase();
const formatFull=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')?new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'';
const paths={"chevron-right": "<path d=\"m9 18 6-6-6-6\"/>", "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>", "calendar-days": "<path d=\"M8 2v4M16 2v4M3 10h18\"/><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01\"/>", "map-pin": "<path d=\"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>", "route": "<circle cx=\"6\" cy=\"19\" r=\"2\"/><path d=\"M9 19h10.5a1.5 1.5 0 0 0 0-3h-7a1.5 1.5 0 0 1 0-3h2a4 4 0 0 0 0-8H9\"/><circle cx=\"6\" cy=\"5\" r=\"2\"/>", "file-down": "<path d=\"M14 2v6h6\"/><path d=\"M4 22h14a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2v3\"/><path d=\"m4 15 4 4 4-4M8 11v8\"/>", "settings-2": "<path d=\"M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6\"/>", "cloud-check": "<path d=\"m17 15-3 3-2-2\"/><path d=\"M20 16.6A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 16.25\"/>", "circle-alert": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 8v4m0 4h.01\"/>", "tent-tree": "<path d=\"m14 20 3-8 3 8M17 12V3m-3 4 3-4 3 4M3 20l5-9 5 9ZM8 11v9\"/>", "tent": "<path d=\"M3 20 12 4l9 16ZM12 4v16M4 20h16\"/>", "flag": "<path d=\"M4 22V4a2 2 0 0 1 2-2m-2 4c4-4 8 4 12 0v11c-4 4-8-4-12 0\"/>", "navigation": "<polygon points=\"3 11 22 2 13 21 11 13 3 11\"/>", "check-circle": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m8 12 3 3 5-6\"/>", "x": "<path d=\"M18 6 6 18M6 6l12 12\"/>", "file-text": "<path d=\"M14 2v6h6\"/><path d=\"M4 22h14a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z\"/><path d=\"M8 13h8M8 17h8\"/>", "external-link": "<path d=\"M15 3h6v6M10 14 21 3M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4m0-4h.01\"/>", "arrow-left": "<path d=\"m12 19-7-7 7-7M19 12H5\"/>", "arrow-right": "<path d=\"m12 5 7 7-7 7M5 12h14\"/>", "edit-3": "<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z\"/>", "printer": "<path d=\"M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"/><path d=\"M6 14h12v8H6z\"/>"};
const icon=(n)=>`<svg class="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[n]||paths.info}</svg>`;
function isViewer(){const uid=window.AtlasAccountVault?.getState?.().activeUid||window.AtlasAccountBridge?.getUid?.();if(!uid)return false;
 try{const m=JSON.parse(localStorage.getItem('atlas-sync-v1:'+uid)||'{}');return Object.values(m).some(x=>x.localId===tripId&&x.role==='viewer')}catch{return true}}
function mutate(fn){if(isViewer())throw Error('Shared viewers cannot edit this trip');
 const all=read(),t=all.find(x=>x?.id===tripId);if(!t)throw Error('Trip unavailable');
 // Validate and apply to a detached copy before any persistent write.
 const next=JSON.parse(JSON.stringify(t));fn(next);
 const nextAll=all.map(x=>x?.id===tripId?next:x);
 localStorage.setItem(KEY,JSON.stringify(nextAll));window.AtlasAccountVault?.snapshot?.();
 document.dispatchEvent(new CustomEvent('atlas-timeline-updated',{detail:{tripId,source:'workspace2'}}));
 document.dispatchEvent(new CustomEvent('trip-logistics-saved',{detail:{tripId,source:'workspace2'}}));
}
const root=document.createElement('section');root.id='atlasTripExperience';root.className='ax-ws2';root.setAttribute('aria-label','Trip workspace');
root.innerHTML=`<div class="ax2-header"><div class="ax2-title"><p class="ax2-eyebrow">ATLAS / TRIP WORKSPACE</p><h1 id="ax2Name"></h1><div id="ax2Sub" class="ax2-sub"></div></div><div class="ax2-actions">
<a class="ax2-btn ax2-primary" id="ax2Mode" href="#">${icon('map-pin')} Trip Mode</a><button type="button" class="ax2-btn" data-action="pdf">${icon('file-down')} Print reference</button><button type="button" class="ax2-btn" data-action="details">${icon('settings-2')} Trip details</button></div></div>
<div class="ax2-facts"><div class="ax2-stats" id="ax2Stats"></div><span id="ax2Sync" class="ax2-sync" aria-live="polite"></span></div>
<div class="ax2-readiness" id="ax2Readiness" role="status"></div><div class="ax2-issues" id="ax2Issues" hidden></div>
<div class="ax2-layout"><div class="ax2-main"><div class="ax2-section-head"><div><h2>Trip timeline</h2><p>Days, visits, overnight bases and actions in one place.</p></div><button type="button" class="ax2-text-btn" data-action="schedule">${icon('edit-3')} Edit schedule</button></div>
<div id="ax2Days" class="ax2-days"></div><div id="ax2Unscheduled" class="ax2-unscheduled" hidden></div></div><aside class="ax2-rail" aria-label="Trip essentials"><div class="ax2-rail-card"><h3>Trip essentials</h3><div id="ax2Essentials"></div></div><div class="ax2-rail-card"><h3>Quick access</h3>
<button class="ax2-rail-action" data-action="schedule">${icon('calendar-days')} Edit dates and overnights</button><button class="ax2-rail-action" data-action="offline">${icon('file-down')} Prepare offline reference</button><button class="ax2-rail-action" data-action="pdf">${icon('printer')} Download trip PDF</button><p class="ax2-footnote" id="ax2OfflineStatus" aria-live="polite"></p></div></aside></div>
<div class="ax2-overlay" id="ax2Overlay" hidden></div><section class="ax2-drawer" id="ax2Drawer" hidden role="dialog" aria-modal="true" aria-labelledby="ax2DrawerTitle"><div class="ax2-drawer-head"><div><p id="ax2DrawerEyebrow" class="ax2-eyebrow"></p><h2 id="ax2DrawerTitle"></h2></div><button class="ax2-close" type="button" data-action="close" aria-label="Close panel">${icon('x')}</button></div><div id="ax2DrawerBody" class="ax2-drawer-body"></div></section>
<div class="ax2-editor" id="ax2Editor" hidden><div class="ax2-editor-head"><div><p class="ax2-eyebrow">CANONICAL DATE EDITOR</p><h2>Edit schedule and overnight choices</h2><p>Move, extend or schedule park visits, and resolve overnight bases. Changes automatically update the trip above.</p></div><button class="ax2-btn" type="button" data-action="close-schedule">${icon('x')} Close editor</button></div><div id="ax2EditorHost"></div></div>`;
// Progressive enhancement: if the trip or original editors are missing, leave the accepted page untouched.
// The accepted Cloudflare page uses the v1.22.10 quick editor and day editor.
 // Older wrappers may still expose workspaceLogistics/workspaceItinerary.
 // Reuse whichever real, event-bound editor exists; never clone it.
const originalLogistics=document.getElementById('workspaceLogistics')||
  document.getElementById('tripQuickEditorV12210');
const originalItinerary=document.getElementById('workspaceItinerary')||
  document.getElementById('tripDayEditor')||
  document.getElementById('atlasTripTimeline');
if(!trip()||!originalLogistics||!originalItinerary)return;
page.prepend(root);
const editorHost=root.querySelector('#ax2EditorHost');
 // Keep the accepted drag-and-resize timeline together with its original editor.
 // Moving the actual nodes retains their listeners, rather than creating a second owner.
 const legacyTimeline=document.getElementById('atlasTripTimeline');
 if(legacyTimeline&&legacyTimeline!==originalItinerary)editorHost.appendChild(legacyTimeline);
 editorHost.appendChild(originalItinerary);
// The original logistics form is moved to the context drawer only when opened.
// Keeping the DOM element alive preserves its save handlers and values.
const oldParent=originalLogistics.parentElement;
let pdfControlsHome=null,pdfButtonHome=null,printControl=null,printButton=null;
const legacyNext=document.getElementById('tripNextActions');if(legacyNext)legacyNext.remove();
page.classList.add('ax-ws2-active');
let openDay=new Set(),allIssuesOpen=false,drawerMode='',drawerSlug='',drawerDate='',focusReturn=null,editorOpen=false;
const $=id=>root.querySelector((id.startsWith('#')?'':'#')+id);
function schedule(){const t=trip();if(!t)return null;return T.schedule(JSON.parse(JSON.stringify(t)))}
function findings(){const t=trip();return t?C.readiness(t,parks,T):[]}
function titleForRow(row){if(!row.visits.length)return 'No park visits scheduled';return row.visits.map(x=>short(x.slug)).join(' → ')}
function nightText(row){if(row.night?.type==='park')return short(row.night.slug);
 if(row.night?.type==='conflict')return 'Overnight conflict';
 if(row.night?.type==='other')return row.night.label||'Other accommodation';
 if(row.night?.type==='none')return 'Overnight not assigned';
 return trip()?.endLocation||'Trip ends';}
function effectiveIssues(){const list=findings();
 return list.map(f=>({...f,targetDate:f.date||'',targetSlug:f.slug||'',severity:f.severity||'attention'}));}
function summary(){const t=trip();if(!t)return;
 const c=schedule(),items=effectiveIssues(),blocks=items.filter(f=>f.severity==='blocker'),att=items.filter(f=>f.severity==='attention'),adv=items.filter(f=>f.severity==='advisory');
 $('#ax2Name').textContent=t.name||'Untitled trip';
 $('#ax2Sub').textContent=[c?`${formatFull(c.start)} – ${formatFull(c.end)}`:'Dates not set',t.startLocation&&t.endLocation?`${t.startLocation} → ${t.endLocation}`:t.startLocation||t.endLocation].filter(Boolean).join('  ·  ');
 const numDays=c?.rows.length||Number(t.dayCount)||0;
 $('#ax2Stats').innerHTML=`<span><strong>${numDays}</strong> days</span><span><strong>${Math.max(0,c?.nights?.length||0)}</strong> nights</span><span><strong>${t.parks?.length||0}</strong> parks</span>`;
 const uid=window.AtlasAccountBridge?.getUid?.();const sync=window.AtlasCloudSync?.getStatus?.();
 $('#ax2Sync').textContent=!uid?'Stored on this device':sync?.conflicts?`${sync.conflicts} cloud sync conflicts`:sync?.unsynced?`${sync.unsynced} sync pending`:sync?.tracked?'Cloud trip linked':'Signed in';
 const box=$('#ax2Readiness');box.className='ax2-readiness'+(blocks.length?' ax2-alert':items.length?' ax2-review':' ax2-ready');
 const text=blocks.length?`${blocks.length} overnight or booking conflict${blocks.length===1?'':'s'}`:att.length?`${att.length} planning item${att.length===1?'':'s'} to review`:adv.length?`${adv.length} optional detail${adv.length===1?'':'s'} to review`:'No unresolved planning issues detected';
 box.innerHTML=`${icon(blocks.length||att.length?'circle-alert':'check-circle')}<div class="ax2-readiness-text"><strong>${esc(text)}</strong><span>${esc(items.length?'Issues appear alongside affected days and stays.':'Check current park information separately before departure.')}</span></div>${items.length?`<button type="button" class="ax2-text-btn" data-action="issues" aria-expanded="${allIssuesOpen}">${allIssuesOpen?'Hide':'View'} items</button>`:''}`;
 $('#ax2Issues').hidden=!allIssuesOpen||!items.length;
 $('#ax2Issues').innerHTML=items.map((f,i)=>`<button type="button" class="ax2-issue-choice" data-issue="${i}">${icon(f.severity==='blocker'?'circle-alert':'info')}<span>${f.date?`<strong>${esc(fmt(f.date))}</strong> · `:''}${esc(f.description)}</span>${icon('chevron-right')}</button>`).join('');
 $('#ax2Mode').href='/tripmode/?id='+encodeURIComponent(tripId);
 const essentials=$('#ax2Essentials');essentials.innerHTML=`<div class="ax2-essential"><span>${icon('map-pin')} Departure</span><strong>${esc(t.startLocation||'Not entered')}</strong></div><div class="ax2-essential"><span>${icon('flag')} Finish</span><strong>${esc(t.endLocation||'Not entered')}</strong></div><div class="ax2-essential"><span>${icon('tent')} Overnight coverage</span><strong>${c?`${c.rows.filter(r=>r.night&&r.night.type!=='conflict'&&r.night.type!=='none').length} of ${c.nights.length} nights assigned`:'Dates needed'}</strong></div>`;
 return {c,items};
}
function render(){const t=trip();if(!t)return;const {c,items}=summary();
 const rootDays=$('#ax2Days');if(!c){rootDays.innerHTML='<div class="ax2-empty">Set valid trip dates under Trip details to activate the daily timeline. The existing itinerary editor remains available under Edit schedule.</div>';$('#ax2Unscheduled').hidden=true;return;}
 const routes=T.routes(t,parks,window.PARK_DETAILS||{});
 const dateFirst=new Map();for(const item of items){if(item.targetSlug&&!item.targetDate){const first=c.rows.find(r=>r.visits.some(v=>v.slug===item.targetSlug));if(first)item.targetDate=first.date;}}
 const rows=c.rows.map((row,i)=>{
  const ds=row.date;const show=row.night?.type==='park',slug=show?row.night.slug:'';
  const d=slug?C.dossier(t,slug):null;
  const isFirstNight=slug&&!dateFirst.has(slug);if(isFirstNight)dateFirst.set(slug,ds);
  const issues=items.filter(f=>f.targetDate===ds&&(!['campground-missing','site-missing','cancelled-stay','reservation-unverified'].includes(f.code)||!f.targetSlug||dateFirst.get(f.targetSlug)===ds));
  const cols=issues.map(f=>`<div class="ax2-inline ${f.severity==='blocker'?'ax2-inline-block':''}">${icon('circle-alert')}<span>${esc(f.description)}</span><button type="button" data-action="issue-direct" data-code="${attr(f.code)}" data-date="${attr(ds)}" data-slug="${attr(f.targetSlug)}">Review</button></div>`).join('');
  const dateObj=new Date(ds+'T12:00:00Z'),day=String(dateObj.getUTCDate()).padStart(2,'0');const month=dateObj.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase();
  const isExpanded=openDay.has(ds);const nights=show?`<strong>${esc(nightText(row))}</strong>${d?.campground?`<span> / ${esc([d.campground,d.loop,d.campsite].filter(Boolean).join(' · '))}</span>`:''}`:esc(nightText(row));
  return `<article class="ax2-day ${issues.length?'ax2-hasissue':''} ${isExpanded?'ax2-expanded':''}" id="ax2-date-${ds}" data-date="${ds}"><div class="ax2-day-date"><span>${weekday(ds)}</span><strong>${day}</strong><span>${month}</span></div><div class="ax2-day-card"><div class="ax2-day-main"><button type="button" class="ax2-day-toggle" data-action="toggle-day" data-date="${ds}" aria-expanded="${isExpanded}"><span><small>DAY ${i+1} · ${esc(fmt(ds))}</small><strong>${esc(titleForRow(row))}</strong></span>${icon('chevron-down')}</button><div class="ax2-night"><span>${icon(show?'tent':'map-pin')} ${nights}</span>${row.night?`<button type="button" class="ax2-text-btn" data-action="${show?'stay':'night'}" data-${show?'slug':'date'}="${attr(show?slug:ds)}">${show?'Edit stay':'Select night'}</button>`:''}</div>${cols}</div><div class="ax2-day-details" ${isExpanded?'':'hidden'}><div class="ax2-day-actions">${/^https:\/\/www\.google\.com\/maps\//.test(routes[i]?.url||'')?`<a href="${attr(routes[i].url)}" target="_blank" rel="noopener noreferrer">${icon('navigation')} Directions</a>`:''}<button data-action="schedule">${icon('edit-3')} Edit dates</button>${row.night?`<button data-action="night" data-date="${ds}">${icon('tent')} Change overnight</button>`:''}${row.visits.map(v=>`<button data-action="stay" data-slug="${attr(v.slug)}">${icon('file-text')} ${esc(short(v.slug))} details</button>`).join('')}</div></div></div></article>`;
 }).join('');
 rootDays.innerHTML=rows;
 const unscheduled=t.parks.filter(slug=>!c.blocks.some(b=>b.slug===slug&&b.start&&b.end));
 const un=$('#ax2Unscheduled');un.hidden=!unscheduled.length;un.innerHTML=unscheduled.length?`<strong>${unscheduled.length} unscheduled park${unscheduled.length===1?'':'s'}</strong> ${unscheduled.map(x=>esc(name(x))).join(', ')} <button class="ax2-text-btn" data-action="schedule">Assign dates</button>`:'';
}
function drawer(eyebrow,title,content){focusReturn=document.activeElement;drawerMode=eyebrow;
 $('#ax2DrawerEyebrow').textContent=eyebrow;$('#ax2DrawerTitle').textContent=title;$('#ax2DrawerBody').replaceChildren();
 if(typeof content==='string')$('#ax2DrawerBody').innerHTML=content;else if(content)$('#ax2DrawerBody').append(content);
 $('#ax2Overlay').hidden=false;$('#ax2Drawer').hidden=false;document.body.classList.add('ax2-drawer-open');
 root.querySelector('[data-action="close"]').focus();
}
function closeDrawer(){if($('#ax2Drawer').hidden)return;
 if(originalLogistics&&$('#ax2DrawerBody').contains(originalLogistics)){
   if(originalLogistics.id==='tripQuickEditorV12210')originalLogistics.classList.remove('open');
   oldParent?.append(originalLogistics);
 }
 if(printControl&&$('#ax2DrawerBody').contains(printControl))pdfControlsHome?.append(printControl);
 if(printButton&&$('#ax2DrawerBody').contains(printButton))pdfButtonHome?.append(printButton);
 $('#ax2DrawerBody').replaceChildren();$('#ax2Drawer').hidden=true;$('#ax2Overlay').hidden=true;document.body.classList.remove('ax2-drawer-open');drawerMode='';drawerSlug='';drawerDate='';focusReturn?.focus?.();}
const FIELDS=[['campground','Campground','text'],['loop','Loop','text'],['campsite','Site number','text'],['reservation','Reservation reference','text'],['bookingStatus','Booking status','select'],['checkIn','Check-in time','time'],['checkOut','Check-out time','time'],['arrivalInstructions','Arrival instructions','textarea'],['parkingNotes','Parking / access','textarea'],['waterNotes','Water availability notes','textarea'],['facilitiesNotes','Facilities notes','textarea'],['contactNotes','Contact / booking notes','textarea'],['personalNotes','Other stay notes','textarea']];
function stayDrawer(slug){const t=trip();if(!t?.parks?.includes(slug))return;drawerSlug=slug;const d=C.dossier(t,slug);
 let html=`<p class="ax2-help">Booking information is recorded by you, not verified against a reservation provider.</p><form id="ax2StayForm"><div class="ax2-form-grid">`;
 for(const [key,label,type] of FIELDS){const v=d[key]||'';html+=`<label class="ax2-field ${type==='textarea'?'ax2-wide':''}"><span>${esc(label)}</span>`;
  if(type==='textarea')html+=`<textarea name="${key}" rows="2" maxlength="1800">${esc(v)}</textarea>`;
  else if(type==='select')html+=`<select name="${key}">${[['not-booked','Not booked / unknown'],['pending','Awaiting confirmation'],['confirmed','Confirmed (self-reported)'],['first-come','First-come / no booking'],['cancelled','Cancelled']].map(([id,title])=>`<option value="${id}" ${v===id?'selected':''}>${title}</option>`).join('')}</select>`;
  else html+=`<input name="${key}" type="${type}" value="${attr(v)}" maxlength="250">`;
  html+='</label>';
 }
 html+=`</div><div class="ax2-form-actions"><button type="button" class="ax2-btn" data-action="close">Cancel</button><button type="submit" class="ax2-btn ax2-primary" ${isViewer()?'disabled':''}>Save campsite</button></div></form>`;
 drawer('CAMPSITE DOSSIER',name(slug),html);
 $('#ax2DrawerBody').querySelectorAll('input,select,textarea').forEach(n=>n.disabled=isViewer());
}
function nightDrawer(date){const t=trip();if(!t||!T.range(t)?.nights.includes(date))return;drawerDate=date;
 const row=schedule()?.rows.find(r=>r.date===date);const override=t.timelineV1?.nights?.[date];
 const selected=override?.type==='park'?'park:'+override.slug:override?.type||'auto';
 const choices=[['auto','Automatic (follow park visits)'],...t.parks.map(s=>['park:'+s,name(s)]),['other','Other accommodation / location'],['none','Not decided']];
 drawer('OVERNIGHT',fmt(date),`<form id="ax2NightForm"><p class="ax2-help">Choose one overnight base for this date. This doesn't erase the other park visits or reservations.</p><label class="ax2-field"><span>Overnight location</span><select name="choice">${choices.map(([v,l])=>`<option value="${attr(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('')}</select></label><label class="ax2-field"><span>Other accommodation (if selected)</span><input name="other" maxlength="180" value="${attr(override?.label||'')}"></label>${row?.night?.type==='conflict'?`<p class="ax2-warning">Multiple park visits claim this night. Selecting one resolves the conflict for the selected date.</p>`:''}<div class="ax2-form-actions"><button type="button" class="ax2-btn" data-action="close">Cancel</button><button type="submit" class="ax2-btn ax2-primary" ${isViewer()?'disabled':''}>Save overnight</button></div></form>`);
 $('#ax2DrawerBody').querySelectorAll('input,select').forEach(n=>n.disabled=isViewer());
}
function detailsDrawer(){
 if(originalLogistics.id==='tripQuickEditorV12210'){
   // Run the accepted editor's own field-population handler before moving it.
   originalLogistics.classList.remove('open');
   const edit=document.getElementById('editTripTopV12210');
   if(edit)edit.click();
   else originalLogistics.classList.add('open');
 }
 drawer('TRIP INFORMATION','Trip details',originalLogistics);
 if(isViewer())originalLogistics.querySelectorAll('input,textarea,select,button').forEach(n=>n.disabled=true);
}
function pdfDrawer(){const controls=document.getElementById('bookletExportControls'),button=document.getElementById('printTripBtn');
 if(!controls||!button){drawer('PRINT REFERENCE','Download PDF','<p>Export controls are unavailable. Reload the trip and try again.</p>');return;}
 pdfControlsHome=controls.parentElement;pdfButtonHome=button.parentElement;printControl=controls;printButton=button;
 const host=document.createElement('div');host.className='ax2-print-form';host.innerHTML='<p class="ax2-help">The existing searchable, printer-friendly Atlas PDF is unchanged. Choose paper and detail level below.</p>';
 host.append(controls,button);drawer('PRINT REFERENCE','Download trip PDF',host);
}
function scheduleEditor(){closeDrawer();editorOpen=!editorOpen;const ed=$('#ax2Editor');ed.hidden=!editorOpen;
 if(editorOpen){const host=$('#ax2EditorHost');if(!host.contains(originalItinerary))host.append(originalItinerary);ed.scrollIntoView({behavior:'smooth',block:'start'});}
 else root.scrollIntoView({behavior:'smooth',block:'start'});
}
function offline(){try{const t=trip(),uid=window.AtlasAccountVault?.getState?.().activeUid;
 if(!t)throw Error('Trip unavailable');if(!uid||uid!==window.AtlasAccountBridge?.getUid?.())throw Error('Sign in to prepare a private offline reference');
 const routes=T.routes(t,parks,window.PARK_DETAILS||{});const snap=C.snapshot(t,parks,T,routes);
 localStorage.setItem('atlas-tripmode-v1:'+uid+':'+tripId,JSON.stringify(snap));
 $('#ax2OfflineStatus').textContent='Offline reference saved on this device. Open Trip Mode and enable offline access to cache its screen.';
 }catch(err){$('#ax2OfflineStatus').textContent='Not prepared: '+err.message;}}
function jumpIssue(i){const f=effectiveIssues()[i];if(!f)return;allIssuesOpen=false;
 if(f.code==='missing-start'||f.code==='missing-end'||f.code==='invalid-dates'){detailsDrawer();return;}
 if(['overnight-conflict','night-unassigned'].includes(f.code)&&f.date){nightDrawer(f.date);return;}
 if(f.slug){stayDrawer(f.slug);return;}
 if(f.date){openDay.add(f.date);render();root.querySelector('#ax2-date-'+f.date)?.scrollIntoView({behavior:'smooth',block:'center'});}else detailsDrawer();}
root.addEventListener('click',ev=>{const b=ev.target.closest('[data-action],[data-issue]');if(!b)return;
 if(b.closest('#workspaceItinerary,#workspaceLogistics,#bookletExportControls,#atlasTripTimeline,#tripDayEditor,#tripQuickEditorV12210'))return;
 const action=b.dataset.action;if(b.dataset.issue!==undefined){jumpIssue(Number(b.dataset.issue));return;}
 if(action==='toggle-day'){const d=b.dataset.date;openDay.has(d)?openDay.delete(d):openDay.add(d);render();return;}
 if(action==='stay'){stayDrawer(b.dataset.slug);return;}
 if(action==='night'){nightDrawer(b.dataset.date);return;}
 if(action==='issue-direct'){const f=effectiveIssues().find(x=>x.code===b.dataset.code&&x.date===b.dataset.date&&(!x.slug||x.slug===b.dataset.slug));if(!f)return;const idx=effectiveIssues().findIndex(x=>x===f||x.code===f.code&&x.date===f.date&&x.slug===f.slug);jumpIssue(idx);return;}
 if(action==='issues'){allIssuesOpen=!allIssuesOpen;render();return;}
 if(action==='schedule'||action==='close-schedule'){scheduleEditor();return;}
 if(action==='details'){detailsDrawer();return;}
 if(action==='pdf'){pdfDrawer();return;}
 if(action==='offline'){offline();return;}
 if(action==='close'){closeDrawer();return;}
});
root.addEventListener('submit',ev=>{if(ev.target.id==='ax2StayForm'){
 ev.preventDefault();const data=Object.fromEntries(new FormData(ev.target));try{mutate(t=>C.updateDossier(t,drawerSlug,data));closeDrawer();render();}catch(err){alert('Campsite not saved: '+err.message)}
 }else if(ev.target.id==='ax2NightForm'){
 ev.preventDefault();const data=new FormData(ev.target);try{mutate(t=>{
 const choice=data.get('choice');if(choice==='auto')T.setNight(t,drawerDate,null);
 else if(choice==='other')T.setNight(t,drawerDate,{type:'other',label:String(data.get('other')||'Other accommodation')});
 else if(choice==='none')T.setNight(t,drawerDate,{type:'none'});
 else if(String(choice).startsWith('park:'))T.setNight(t,drawerDate,{type:'park',slug:String(choice).slice(5)});
 else throw Error('Invalid overnight choice');
 });closeDrawer();render();}catch(err){alert('Overnight not saved: '+err.message)}
 }});
$('#ax2Overlay').addEventListener('click',closeDrawer);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('#ax2Drawer').hidden)closeDrawer();if(ev.key==='Tab'&&!$('#ax2Drawer').hidden){const els=[...$('#ax2Drawer').querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(x=>x.getClientRects().length);if(!els.length)return;const first=els[0],last=els[els.length-1];if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus()}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}}});
let queued=false;function update(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;if(root.isConnected)render()});}
for(const event of ['atlas-timeline-updated','trip-logistics-saved','trip-days-changed','atlas-sync-status','atlas-account-changed'])document.addEventListener(event,update);
document.addEventListener('trip-logistics-saved',ev=>{
 if(ev.detail?.source==='quick-editor-v12210'&&drawerMode==='TRIP INFORMATION')closeDrawer();
});
window.addEventListener('storage',ev=>{if(ev.key===KEY)update()});
render();window.AtlasTripExperience={version:'2.0',refresh:update};window.AtlasTripWorkspace2={refresh:update,openStay:stayDrawer,openNight:nightDrawer};
})();
