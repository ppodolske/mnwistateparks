/* ATLAS Trip Timeline: interactive dates, drag/drop, resize, autosave, undo and overnight ledger. */
(()=>{
 'use strict';
 const page=document.querySelector('[data-page="trip"]'),M=window.AtlasTripTimelineModel;
 if(!page||!M)return;
 const KEY='mnwiTripCollections',id=page.dataset.tripId,parkNode=document.getElementById('parksData');
 if(!parkNode)return;
 let parks=[];try{parks=JSON.parse(parkNode.textContent||'[]');}catch{return;}
 const bySlug=new Map(parks.map(p=>[p.slug,p])),details=window.PARK_DETAILS||{};
 let root,selectedSlug='',selectedNight='',lastSnapshot=null,resize=null,hasInit=false;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const datestring=d=>d?new Date(d+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}):'';
 const getAll=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
 const getTrip=()=>getAll().find(t=>t.id===id);
 function ensure(){const all=getAll(),t=all.find(t=>t.id===id);if(!t)return null;
   if(!M.range(t))return t;
   if(!t.timelineV1){const backupKey='mnwiTripCollections.preTimelineBackup.v1';if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,JSON.stringify(all));M.initialize(t);M.syncLegacy(t);localStorage.setItem(KEY,JSON.stringify(all));}
   return t;
 }
 function mutate(fn){const all=getAll(),trip=all.find(t=>t.id===id);if(!trip)return;
   const old=JSON.stringify(all);try{M.initialize(trip);const result=fn(trip);if(result===false)return;
     M.syncLegacy(trip);localStorage.setItem(KEY,JSON.stringify(all));lastSnapshot=old;
     document.dispatchEvent(new CustomEvent('atlas-timeline-updated',{detail:{tripId:id}}));
     window.TripLogisticsFix?.renderReadiness?.();draw();
   }catch(err){alert(err?.message||'Cannot update timeline');console.error('Atlas timeline',err);}
 }
 function parkName(slug){return bySlug.get(slug)?.name||slug}
 const placeUrl=p=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(details[p.slug]?.mapsQuery||[p.name,p.city,p.state].filter(Boolean).join(', '));
 function showDrawer(){const trip=ensure();if(!trip)return'';const r=M.range(trip);
   if(selectedSlug){const p=bySlug.get(selectedSlug);if(!p){selectedSlug='';return'';}const v=trip.timelineV1.visits[selectedSlug]||{},m=trip.stopMeta?.[selectedSlug]||{};
     const current=M.schedule(trip).rows.filter(row=>row.night?.type==='park'&&row.night.slug===selectedSlug).map(row=>row.date);
     const val=x=>esc(x||'');
     return `<div class="tl-drawer-shade" data-shade="1"><section class="tl-drawer" role="dialog" aria-modal="true" aria-label="${esc(p.name)} trip details"><div class="tl-drawer-head"><div><span class="tl-kicker">PARK VISIT & STAY</span><h3>${esc(p.name)}</h3><p>${esc([p.city,p.state].filter(Boolean).join(', '))}</p></div><button type="button" class="tl-close" data-action="close">Close ✕</button></div>
       <div class="tl-form"><div class="tl-field"><label for="tl-start">Arrival date</label><input id="tl-start" type="date" min="${r.start}" max="${r.end}" value="${val(v.start)}"></div><div class="tl-field"><label for="tl-end">Last visit date</label><input id="tl-end" type="date" min="${r.start}" max="${r.end}" value="${val(v.end)}"></div>
       <div class="tl-field wide"><label for="tl-stay">Overnight preference</label><select id="tl-stay"><option value="auto" ${v.stay==='auto'?'selected':''}>Automatic: camp on nights covered by a multi-day visit</option><option value="camp" ${v.stay==='camp'?'selected':''}>Camp here (including a one-night visit)</option><option value="day" ${v.stay==='day'?'selected':''}>Day visit only — sleep elsewhere</option><option value="elsewhere" ${v.stay==='elsewhere'?'selected':''}>Visit over multiple days — sleep elsewhere</option></select></div>
       <div class="tl-field wide"><label for="tl-note">Visit notes</label><textarea id="tl-note" placeholder="Highlights, activities, arrival notes…">${val(m.note)}</textarea></div>
       <div class="tl-field"><label for="tl-campground">Campground</label><input id="tl-campground" value="${val(m.campground)}" placeholder="Campground name"></div><div class="tl-field"><label for="tl-loop">Loop</label><input id="tl-loop" value="${val(m.loop)}" placeholder="Optional"></div>
       <div class="tl-field"><label for="tl-campsite">Campsite</label><input id="tl-campsite" value="${val(m.campsite)}"></div><div class="tl-field"><label for="tl-reservation">Reservation #</label><input id="tl-reservation" value="${val(m.reservation)}"></div>
       <div class="tl-field"><label for="tl-checkin">Check-in time</label><input id="tl-checkin" type="time" value="${val(m.checkIn)}"></div><div class="tl-field"><label for="tl-checkout">Check-out time</label><input id="tl-checkout" type="time" value="${val(m.checkOut)}"></div></div>
       <div class="tl-drawer-note">Check-in and check-out <strong>dates</strong> follow the timeline. ${current.length?`You're currently scheduled to sleep here ${current.length} night${current.length===1?'':'s'}, starting ${datestring(current[0])}.`:'No overnight stay is currently assigned here.'} ${current.length?`Derived booking dates: check-in ${datestring(current[0])}, check-out ${datestring(M.add(current[current.length-1],1))}. `:''}Times are optional; actual campground policies vary.</div>
       <div class="tl-drawer-actions"><button type="button" class="tl-button primary" data-action="save-visit">Save visit</button><button type="button" class="tl-button warn" data-action="unschedule">Remove dates</button><a class="tl-button" target="_blank" rel="noopener" href="${esc(placeUrl(p))}">Open map ↗</a></div>
       <p class="tl-status">Updates are saved to this browser's existing trip storage.</p></section></div>`;
   }
   if(selectedNight){const n=M.overnight(trip,selectedNight);const override=trip.timelineV1.nights[selectedNight]||{};const selected=override.type==='park'?'park:'+override.slug:override.type==='other'?'other':override.type==='none'?'none':'auto';
     const options=['<option value="auto">Automatic (follow stretched park stays)</option>',...trip.parks.map(slug=>`<option value="park:${esc(slug)}" ${selected==='park:'+slug?'selected':''}>Camp at ${esc(parkName(slug))}</option>`),'<option value="other">Other accommodation / base</option>','<option value="none">Not decided / no stay</option>'];
     return `<div class="tl-drawer-shade" data-shade="1"><section class="tl-drawer" role="dialog" aria-modal="true" aria-label="Overnight details"><div class="tl-drawer-head"><div><span class="tl-kicker">OVERNIGHT</span><h3>${datestring(selectedNight)}</h3><p>Night of ${datestring(selectedNight)} → ${datestring(M.add(selectedNight,1))}</p></div><button type="button" class="tl-close" data-action="close">Close ✕</button></div>
       <div class="tl-form"><div class="tl-field wide"><label for="tl-nightchoice">Where are you sleeping?</label><select id="tl-nightchoice">${options.map(o=>o.replace('<option value="'+selected+'"','<option selected value="'+selected+'"')).join('')}</select></div><div class="tl-field wide"><label for="tl-nightlabel">Other lodging / base location</label><input id="tl-nightlabel" placeholder="Hotel or alternative location" value="${esc(override.label||'')}"></div></div>
       ${n.type==='conflict'?`<div class="tl-alert">Overlapping camping stays: ${n.candidates.map(parkName).map(esc).join(', ')}. Choose the actual overnight location here.</div>`:''}
       <div class="tl-drawer-note">Overrides affect only this night. They won't erase the other park visits, campground information or reservations.</div>
       <div class="tl-drawer-actions"><button type="button" class="tl-button primary" data-action="save-night">Save overnight</button><button type="button" class="tl-button" data-action="reset-night">Use automatic</button></div></section></div>`;
   }
   return '';
 }
 function board(t,plan){const n=plan.dates.length;
   const labelHead=`<div class="tl-label-header"><small>YOUR PARKS</small><span>Drag / select to plan</span></div>`;
   const dayHead=`<div class="tl-days" style="grid-template-columns:repeat(${n},minmax(105px,1fr))">${plan.dates.map(d=>`<div class="tl-day ${[0,6].includes(new Date(d+'T12:00:00Z').getUTCDay())?'is-weekend':''}"><b>${esc(datestring(d))}</b><span>${esc(d)}</span></div>`).join('')}</div>`;
   const parkRows=plan.blocks.filter(b=>bySlug.has(b.slug)).map(b=>{
      const p=bySlug.get(b.slug),scheduled=M.validDate(b.start)&&M.validDate(b.end)&&b.end>=plan.start&&b.start<=plan.end;
      const first=scheduled?Math.max(0,M.diff(plan.start,b.start)):0,last=scheduled?Math.min(n-1,M.diff(plan.start,b.end)):0;
      const nights=plan.nights.filter(d=>M.overnight(t,d).type==='park'&&M.overnight(t,d).slug===b.slug);
      const dots=plan.dates.map(d=>`<div class="tl-drop" data-date="${d}" data-slug="${esc(b.slug)}" style="grid-column:${M.diff(plan.start,d)+1}"></div>`).join('');
      const badge=nights.length?'⛺ '+nights.length+' night'+(nights.length===1?'':'s'):'Day visit';
      const kind=nights.length?'is-camp':b.stay==='elsewhere'?'is-other':'';
      const bar=scheduled?`<div class="tl-bar ${kind}" draggable="true" data-drag-slug="${esc(b.slug)}" data-slug="${esc(b.slug)}" style="grid-column:${first+1}/${last+2}" title="Drag to move. Stretch the right edge to change dates."><div class="tl-bar-name" data-action="select-park" data-slug="${esc(b.slug)}"><b>${esc(p.name)}</b><small>${esc(badge)} · ${M.diff(b.start,b.end)+1} day${M.diff(b.start,b.end)===0?'':'s'}</small></div><button type="button" aria-label="Stretch ${esc(p.name)} stay" class="tl-grip" data-resize="${esc(b.slug)}">⋮</button></div>`:'';
      return `<div class="tl-parkname"><button type="button" data-action="select-park" data-slug="${esc(b.slug)}">${esc(p.name)}</button><small>${scheduled?esc(datestring(b.start))+' → '+esc(datestring(b.end)):'Unscheduled'}</small></div><div class="tl-row" data-lane="${esc(b.slug)}" style="grid-template-columns:repeat(${n},minmax(105px,1fr))">${dots}${bar}</div>`;
   }).join('');
   const nightTitle='<div class="tl-night-title"><b>OVERNIGHT BASE</b><small>7 nights in an 8-day trip</small></div>';
   const nights=`<div class="tl-nightrow" style="grid-template-columns:repeat(${n},minmax(105px,1fr))">${plan.dates.map(d=>{const night=plan.nights.includes(d)?M.overnight(t,d):null;
     if(!night)return '<div class="tl-night is-final"><b>Depart</b><span>—</span></div>';
     const label=night.type==='park'?parkName(night.slug):night.type==='other'?night.label:night.type==='conflict'?'Conflict':'Undecided';
     return `<button type="button" class="tl-night is-${night.type==='park'?'park':night.type==='other'?'other':night.type==='conflict'?'conflict':'empty'}" data-night="${d}" title="Set overnight for ${esc(d)}"><b>${night.type==='park'?'⛺':night.type==='other'?'⌂':night.type==='conflict'?'⚠':'＋'}</b><span>${esc(label)}</span></button>`;
   }).join('')}</div>`;
   return `<div class="tl-main"><div class="tl-topline"><strong>YOUR ROAD TRIP, DAY BY DAY</strong><span>Drag a park to a date · Drag its right handle to stretch a stay</span></div><div class="tl-scroll"><div class="tl-board">${labelHead}${dayHead}${parkRows}${nightTitle}${nights}</div></div><div class="tl-legend"><span><i class="tl-swatch"></i> Park visit</span><span><i class="tl-swatch camp"></i> Camping base</span><span><i class="tl-swatch warning"></i> Overnight conflict</span><span>Dates are inclusive; nights are between dates</span></div></div>`;
 }
 function draw(){const t=ensure();if(!t||!root)return;const r=M.range(t);
   if(!r){page.classList.remove('atlas-timeline-ready');root.innerHTML='<div class="tl-alert">Set a valid start and end date in Edit Trip to activate the visual timeline. The original day editor remains available until then.</div>';return;}
   // Keep the undated legacy editor functional; disable it only once a dated timeline is active.
   if(window.TripDayEditor&&!window.TripDayEditor.__atlasTimelineDisabled){window.TripDayEditor.persist=()=>true;window.TripDayEditor.render=()=>{};window.TripDayEditor.addDay=()=>false;window.TripDayEditor.removeDay=()=>false;window.TripDayEditor.moveDay=()=>false;window.TripDayEditor.__atlasTimelineDisabled=true;}
   const plan=M.schedule(t);page.classList.add('atlas-timeline-ready');const scheduled=plan.blocks.filter(b=>M.validDate(b.start)&&M.validDate(b.end)&&b.start>=plan.start&&b.end<=plan.end);
   const unscheduled=plan.blocks.filter(b=>!scheduled.includes(b)&&bySlug.has(b.slug));const nights=plan.rows.filter(d=>d.night?.type==='park').length;
   const tray=`<section class="tl-unscheduled"><h4>Unscheduled parks</h4><p>${unscheduled.length?'Drag onto a date to schedule, or click to choose dates.':'All selected parks have dates. Drag a bar to move a visit.'}</p><div class="tl-tray">${unscheduled.map(b=>`<button class="tl-traypark" type="button" draggable="true" data-drag-slug="${esc(b.slug)}" data-action="select-park" data-slug="${esc(b.slug)}"><span>✥</span><b>${esc(parkName(b.slug))}</b><span>＋</span></button>`).join('')||'<span class="tl-info">Nothing waiting to be scheduled.</span>'}</div></section>`;
   const routing=M.routes(t,parks,details);
   const routeHtml=`<section class="tl-routes"><h4>Daily route & overnight handoff</h4><div class="tl-routelist">${routing.map(x=>`<div class="tl-route"><b>${esc(datestring(x.date))}</b><span>${x.stops.length?x.stops.map(parkName).map(esc).join(' · '):'No park visits'}</span><span>${x.night?.type==='park'?'⛺ '+esc(parkName(x.night.slug)):x.night?.type==='other'?'⌂ '+esc(x.night.label):x.night?.type==='conflict'?'⚠ Overnight conflict':x.night?'Overnight undecided':'Trip ends'}</span>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">Open daily directions ↗</a>`:x.night?.type==='conflict'?'<em>Resolve night to enable routing</em>':''}</div>`).join('')}</div></section>`;
   root.innerHTML=`<div class="tl-heading"><div><span class="tl-kicker">ATLAS · TRIP TIMELINE</span><h3>Plan the days. Let the nights fall into place.</h3><p>${esc(datestring(plan.start))} to ${esc(datestring(plan.end))}. Stretch a park across dates to suggest camping. Select any night to choose a different base. No separate day creation or save button.</p></div><div class="tl-metrics"><div class="tl-stat"><strong>${plan.dates.length}</strong> days</div><div class="tl-stat"><strong>${nights}</strong> camping nights</div><div class="tl-stat"><strong>${scheduled.length}</strong> placed</div>${plan.conflicts.length?`<div class="tl-stat" style="color:#a43e23"><strong>${plan.conflicts.length}</strong> conflicts</div>`:''}</div></div>
     ${board(t,plan)}${tray}<div class="tl-operations"><span class="tl-info">${plan.conflicts.length?'⚠ Resolve overnight overlaps before routing and export.':'Saved automatically to this browser.'}</span><button type="button" class="tl-button" data-action="undo" ${lastSnapshot?'':'disabled'}>↶ Undo last change</button></div>${routeHtml}${showDrawer()}`;
 }
 function saveVisit(){const start=root.querySelector('#tl-start')?.value||'',end=root.querySelector('#tl-end')?.value||'',mode=root.querySelector('#tl-stay')?.value||'auto';
   if(!start||!end){alert('Choose both a first and a last visit date.');return;}
   const fields={note:'tl-note',campground:'tl-campground',loop:'tl-loop',campsite:'tl-campsite',reservation:'tl-reservation',checkIn:'tl-checkin',checkOut:'tl-checkout'};
   mutate(t=>{M.setVisit(t,selectedSlug,start,end,mode);const m=t.stopMeta[selectedSlug]||{};for(const [key,field] of Object.entries(fields))m[key]=root.querySelector('#'+field)?.value||'';t.stopMeta[selectedSlug]=m;});selectedSlug='';draw();
 }
 function autosaveVisit(){
   if(!selectedSlug)return;
   const start=root.querySelector('#tl-start')?.value||'',end=root.querySelector('#tl-end')?.value||'';
   if(!M.validDate(start)||!M.validDate(end)||end<start){const x=root.querySelector('.tl-status');if(x)x.textContent='Choose a valid arrival and last-visit date to save this visit.';return;}
   const fields={note:'tl-note',campground:'tl-campground',loop:'tl-loop',campsite:'tl-campsite',reservation:'tl-reservation',checkIn:'tl-checkin',checkOut:'tl-checkout'};
   const all=getAll(),trip=all.find(t=>t.id===id);if(!trip)return;
   const previous=JSON.stringify(all);
   try{M.setVisit(trip,selectedSlug,start,end,root.querySelector('#tl-stay')?.value||'auto');
     const m=trip.stopMeta[selectedSlug]||{};
     for(const [key,field] of Object.entries(fields))m[key]=root.querySelector('#'+field)?.value||'';
     trip.stopMeta[selectedSlug]=m;
     localStorage.setItem(KEY,JSON.stringify(all));lastSnapshot=previous;
     const x=root.querySelector('.tl-status');if(x)x.textContent='Saved automatically. Close this panel to refresh the timeline.';
   }catch(e){const x=root.querySelector('.tl-status');if(x)x.textContent=e.message||'Cannot save the selected dates';}
 }
 function saveNight(){const choice=root.querySelector('#tl-nightchoice')?.value||'auto',label=root.querySelector('#tl-nightlabel')?.value||'';
   mutate(t=>{if(choice==='auto')M.setNight(t,selectedNight,null);else if(choice.startsWith('park:'))M.setNight(t,selectedNight,{type:'park',slug:choice.slice(5)});else if(choice==='other')M.setNight(t,selectedNight,{type:'other',label:label||'Other accommodation'});else M.setNight(t,selectedNight,{type:'none'});});selectedNight='';draw();
 }
 function targetIndex(e,row){const rect=row.getBoundingClientRect(),count=M.range(ensure()).dates.length;
   return Math.min(count-1,Math.max(0,Math.floor((e.clientX-rect.left)/rect.width*count)));}
 function resizeEnd(e){if(!resize)return;const t=ensure(),r=M.range(t),v=t.timelineV1.visits[resize.slug];if(!v?.start){resize=null;return;}
   const idx=targetIndex(e,resize.row),end=r.dates[Math.max(M.diff(r.start,v.start),idx)];const slug=resize.slug;resize=null;mutate(x=>M.setVisit(x,slug,v.start,end,v.stay));
 }
 function onClick(e){const action=e.target.closest('[data-action]')?.dataset.action;
   if(e.target.dataset.shade&&e.target===e.target.closest('.tl-drawer-shade')){selectedSlug='';selectedNight='';draw();return;}
   const night=e.target.closest('[data-night]');if(night){selectedSlug='';selectedNight=night.dataset.night;draw();return;}
   if(action==='close'){selectedSlug='';selectedNight='';draw();}
   else if(action==='select-park'){selectedNight='';selectedSlug=e.target.closest('[data-slug]')?.dataset.slug||'';draw();}
   else if(action==='save-visit')saveVisit();else if(action==='save-night')saveNight();
   else if(action==='unschedule'){const slug=selectedSlug;mutate(t=>M.unschedule(t,slug));selectedSlug='';draw();}
   else if(action==='reset-night'){mutate(t=>M.setNight(t,selectedNight,null));selectedNight='';draw();}
   else if(action==='undo'&&lastSnapshot){localStorage.setItem(KEY,lastSnapshot);lastSnapshot=null;selectedNight='';selectedSlug='';draw();}
 }
 function mount(){const section=document.getElementById('workspaceItinerary');if(!section||root)return;
   root=document.createElement('div');root.id='atlasTripTimeline';root.className='atlas-tl';section.prepend(root);
   root.addEventListener('click',onClick);
   root.addEventListener('change',e=>{if(selectedSlug&&e.target.closest('.tl-form'))autosaveVisit();});

   root.addEventListener('dragstart',e=>{const el=e.target.closest('[data-drag-slug]');if(el){e.dataTransfer.setData('text/plain',el.dataset.dragSlug);e.dataTransfer.effectAllowed='move'}});
   root.addEventListener('dragover',e=>{const cell=e.target.closest('.tl-drop');if(cell){e.preventDefault();e.dataTransfer.dropEffect='move';cell.classList.add('is-over');}});
   root.addEventListener('dragleave',e=>{const cell=e.target.closest('.tl-drop');if(cell)cell.classList.remove('is-over')});
   root.addEventListener('drop',e=>{const cell=e.target.closest('.tl-drop');if(!cell)return;e.preventDefault();const slug=e.dataTransfer.getData('text/plain');if(!bySlug.has(slug))return;
     mutate(t=>{const v=t.timelineV1.visits[slug]||{},duration=M.validDate(v.start)&&M.validDate(v.end)?Math.max(0,M.diff(v.start,v.end)):0,r=M.range(t);const end=M.add(cell.dataset.date,Math.min(duration,M.diff(cell.dataset.date,r.end)));M.setVisit(t,slug,cell.dataset.date,end,v.stay||'auto')});
   });
   root.addEventListener('pointerdown',e=>{const grip=e.target.closest('[data-resize]');if(!grip)return;const row=grip.closest('.tl-row');if(!row)return;e.preventDefault();resize={slug:grip.dataset.resize,row};grip.closest('.tl-bar')?.classList.add('is-resizing');});
   document.addEventListener('pointerup',e=>{if(resize)resizeEnd(e)});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(selectedNight||selectedSlug)){selectedNight='';selectedSlug='';draw()}});
   document.addEventListener('trip-logistics-saved',()=>setTimeout(draw,130));
   document.addEventListener('atlas-trip-date-saved',()=>setTimeout(draw,130));
   window.addEventListener('storage',e=>{if(e.key===KEY)draw()});
   // The full old editor remains available for fallback on undated trips, but must
   // never write a hidden stale form over the new timeline's canonical state.
   draw();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.AtlasTripTimeline={render:draw,version:'1.0.0'};
})();
