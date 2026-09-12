(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;

  const KEY='mnwiTripCollections';
  const id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const getTrip=()=>read().find(t=>t.id===id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const iso=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';
  const addDays=(d,n)=>{if(!iso(d))return'';const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
  const fmtDate=v=>{if(!iso(v))return'';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})};
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  const style=document.createElement('style');
  style.id='trip-workspace-refine-v12210';
  style.dataset.pdfDownload='true';
  style.textContent=`
    @media screen{
      [data-page="trip"] .trip-legacy-park-order-v12210{display:none!important}
      [data-page="trip"] #tripBookletOverview,
      [data-page="trip"] #tripBookletDays,
      [data-page="trip"] #tripBookletRoute,
      [data-page="trip"] #tripBookletReference,
      [data-page="trip"] #tripBookletNotes,
      [data-page="trip"] .booklet-pagination-status{display:none!important}
      [data-page="trip"] #workspaceExport{display:none!important}

      [data-page="trip"] .trip-title-row-v12210{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;max-width:980px}
      [data-page="trip"] .trip-title-row-v12210 h1{margin-bottom:0!important}
      [data-page="trip"] .trip-title-edit-v12210{flex:0 0 auto;margin-bottom:5px!important;background:#fff!important;color:var(--yellowstone-blue)!important;border:1px solid var(--yellowstone-line)!important}
      [data-page="trip"] .trip-title-meta-v12210{display:flex;gap:9px 18px;flex-wrap:wrap;margin:10px 0 4px;color:#5d696f;font-size:13px;line-height:1.45}
      [data-page="trip"] .trip-title-meta-v12210 span{display:inline-flex;gap:6px;align-items:center}
      [data-page="trip"] .trip-title-meta-v12210 b{font-family:"PT Serif",Georgia,serif;font-size:10px;text-transform:uppercase;letter-spacing:.055em;color:#716a60}

      [data-page="trip"] .trip-quick-editor-v12210{display:none;max-width:980px;margin:16px 0 6px;background:#fff;border:1px solid var(--yellowstone-line);border-left:5px solid var(--yellowstone-blue);border-radius:12px;padding:18px 20px;box-shadow:0 5px 18px rgba(31,43,49,.045)}
      [data-page="trip"] .trip-quick-editor-v12210.open{display:block}
      [data-page="trip"] .trip-quick-editor-head-v12210{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}
      [data-page="trip"] .trip-quick-editor-head-v12210 h2{font-family:"Bebas Neue",sans-serif!important;font-size:28px!important;font-weight:400!important;line-height:1!important;margin:3px 0 0!important}
      [data-page="trip"] .trip-quick-editor-grid-v12210{display:grid;grid-template-columns:1.2fr .8fr .8fr;gap:12px}
      [data-page="trip"] .trip-quick-editor-grid-v12210 .full{grid-column:1/-1}
      [data-page="trip"] .trip-quick-editor-grid-v12210 label>span{display:block;font-family:"PT Serif",Georgia,serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b675f;margin-bottom:5px}
      [data-page="trip"] .trip-quick-editor-grid-v12210 input{width:100%;min-height:42px;border:1px solid var(--yellowstone-line);border-radius:8px;background:#fff;padding:9px 11px;font-family:"Fredoka",Arial,sans-serif;font-size:14px;color:var(--yellowstone-ink)}
      [data-page="trip"] .trip-quick-editor-route-v12210{display:grid;grid-template-columns:1fr 1fr;gap:12px;grid-column:1/-1}
      [data-page="trip"] .trip-quick-end-toggle-v12210{grid-column:1/-1;display:flex!important;align-items:center;gap:8px;font-size:13px;color:#4f5c62;text-transform:none!important;letter-spacing:0!important;font-family:"Fredoka",Arial,sans-serif!important;font-weight:400!important}
      [data-page="trip"] .trip-quick-end-toggle-v12210 input{width:auto;min-height:0}
      [data-page="trip"] .trip-quick-end-wrap-v12210.hidden{display:none}
      [data-page="trip"] .trip-quick-editor-actions-v12210{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:15px}
      [data-page="trip"] .trip-quick-status-v12210{font-size:12px;color:#47745b}
      [data-page="trip"] .trip-quick-error-v12210{font-size:12px;color:#8a3d31;font-weight:700}

      @media(max-width:760px){
        [data-page="trip"] .trip-title-row-v12210{align-items:flex-start}
        [data-page="trip"] .trip-quick-editor-grid-v12210{grid-template-columns:1fr}
        [data-page="trip"] .trip-quick-editor-grid-v12210 .full,[data-page="trip"] .trip-quick-editor-route-v12210{grid-column:1}
        [data-page="trip"] .trip-quick-editor-route-v12210{grid-template-columns:1fr}
      }
    }
  `;
  document.head.appendChild(style);

  function hideLegacyWorkingSections(){
    const stops=document.getElementById('tripStops');
    const section=stops?.closest('.planner-section');
    if(section){section.classList.add('trip-legacy-park-order-v12210');section.setAttribute('aria-hidden','true')}
    ['tripBookletOverview','tripBookletDays','tripBookletRoute','tripBookletReference','tripBookletNotes'].forEach(key=>{
      const el=document.getElementById(key);if(el)el.setAttribute('aria-hidden','true');
    });
    document.getElementById('workspaceExport')?.setAttribute('aria-hidden','true');
  }

  function tripDayCount(trip){return Math.max(1,Number(window.TripItinerary?.dayCount?.(trip)||trip?.dayCount||1))}
  function inferredEnd(trip,start){return start?addDays(start,tripDayCount(trip)-1):''}

  function renderHeaderMeta(){
    const trip=getTrip();if(!trip)return;
    const title=document.getElementById('tripTitle');
    if(title)title.textContent=trip.name||'Untitled trip';
    const meta=document.getElementById('tripTitleMetaV12210');if(!meta)return;
    const start=trip.startDate||trip.date||'';
    const end=trip.endDate||inferredEnd(trip,start);
    let dateText='Dates not set';
    if(start&&end)dateText=start===end?fmtDate(start):fmtDate(start)+' – '+fmtDate(end);
    else if(start)dateText=fmtDate(start);
    const from=trip.startLocation||'Start not set';
    const to=trip.endLocation||trip.startLocation||'End not set';
    const routeText=from===to&&trip.startLocation?'Return to '+from:from+' → '+to;
    meta.innerHTML='<span><b>Dates</b>'+esc(dateText)+'</span><span><b>Route</b>'+esc(routeText)+'</span>';
  }

  function fillQuickEditor(){
    const trip=getTrip();if(!trip)return;
    const start=trip.startDate||trip.date||'';
    const end=trip.endDate||inferredEnd(trip,start)||'';
    const different=Boolean(trip.endLocation&&trip.startLocation&&trip.endLocation!==trip.startLocation);
    const set=(key,value)=>{const el=document.getElementById(key);if(el)el.value=value||''};
    set('tripQuickNameV12210',trip.name||'');
    set('tripQuickStartDateV12210',start);
    set('tripQuickEndDateV12210',end);
    set('tripQuickStartLocationV12210',trip.startLocation||'');
    set('tripQuickEndLocationV12210',different?trip.endLocation:'');
    const toggle=document.getElementById('tripQuickDifferentEndV12210');if(toggle)toggle.checked=different;
    document.getElementById('tripQuickEndWrapV12210')?.classList.toggle('hidden',!different);
    const status=document.getElementById('tripQuickStatusV12210');if(status){status.className='trip-quick-status-v12210';status.textContent=''}
  }

  function saveQuickEditor(){
    const trips=read(),trip=trips.find(t=>t.id===id);if(!trip)return false;
    const name=(document.getElementById('tripQuickNameV12210')?.value||'').trim();
    const start=document.getElementById('tripQuickStartDateV12210')?.value||'';
    const enteredEnd=document.getElementById('tripQuickEndDateV12210')?.value||'';
    const end=enteredEnd||inferredEnd(trip,start)||start;
    const startLocation=(document.getElementById('tripQuickStartLocationV12210')?.value||'').trim();
    const different=Boolean(document.getElementById('tripQuickDifferentEndV12210')?.checked);
    const customEnd=(document.getElementById('tripQuickEndLocationV12210')?.value||'').trim();
    const status=document.getElementById('tripQuickStatusV12210');
    if(!name){if(status){status.className='trip-quick-error-v12210';status.textContent='Enter a trip name.'}return false}
    if(start&&end&&end<start){if(status){status.className='trip-quick-error-v12210';status.textContent='End date cannot be before the start date.'}return false}
    trip.name=name;trip.startDate=start;trip.date=start;trip.endDate=end;
    trip.startLocation=startLocation;trip.endLocation=different?(customEnd||startLocation):startLocation;
    write(trips);
    const oldName=document.getElementById('tripNameEdit');if(oldName)oldName.value=name;
    document.title=name+' | MN & WI State Parks';
    renderHeaderMeta();
    window.TripLogisticsFix?.renderForm?.();
    window.TripDayEditor?.render?.();
    window.TripNextActions?.render?.();
    window.TripWorkspaceCleanup?.apply?.();
    document.dispatchEvent(new CustomEvent('trip-logistics-saved',{detail:{tripId:id,source:'quick-editor-v12210'}}));
    if(status){status.className='trip-quick-status-v12210';status.textContent='Trip updated ✓'}
    setTimeout(()=>document.getElementById('tripQuickEditorV12210')?.classList.remove('open'),550);
    return true;
  }

  function ensureHeaderEditor(){
    const title=document.getElementById('tripTitle');if(!title)return false;
    let row=document.getElementById('tripTitleRowV12210');
    if(!row){
      row=document.createElement('div');row.id='tripTitleRowV12210';row.className='trip-title-row-v12210';
      title.parentNode.insertBefore(row,title);row.appendChild(title);
      const edit=document.createElement('button');edit.id='editTripTopV12210';edit.type='button';edit.className='button ghost trip-title-edit-v12210';edit.textContent='Edit trip';row.appendChild(edit);
      const meta=document.createElement('div');meta.id='tripTitleMetaV12210';meta.className='trip-title-meta-v12210';row.insertAdjacentElement('afterend',meta);
      const panel=document.createElement('section');panel.id='tripQuickEditorV12210';panel.className='trip-quick-editor-v12210';panel.innerHTML='<div class="trip-quick-editor-head-v12210"><div><div class="kicker blue">TRIP BASICS</div><h2>Edit trip</h2></div><button id="closeTripQuickV12210" type="button" class="trip-mini-btn">Close</button></div><div class="trip-quick-editor-grid-v12210"><label><span>Trip name</span><input id="tripQuickNameV12210" type="text"></label><label><span>Start date</span><input id="tripQuickStartDateV12210" type="date"></label><label><span>End date</span><input id="tripQuickEndDateV12210" type="date"></label><div class="trip-quick-editor-route-v12210"><label><span>Start / return location</span><input id="tripQuickStartLocationV12210" type="text" placeholder="e.g. Mequon, WI"></label><label id="tripQuickEndWrapV12210" class="trip-quick-end-wrap-v12210 hidden"><span>Different end location</span><input id="tripQuickEndLocationV12210" type="text" placeholder="e.g. Minneapolis, MN"></label></div><label class="trip-quick-end-toggle-v12210"><input id="tripQuickDifferentEndV12210" type="checkbox"> End the trip somewhere different</label></div><div class="trip-quick-editor-actions-v12210"><button id="saveTripQuickV12210" type="button" class="button blue">Save changes</button><span id="tripQuickStatusV12210" class="trip-quick-status-v12210"></span></div>';
      meta.insertAdjacentElement('afterend',panel);
      edit.addEventListener('click',()=>{fillQuickEditor();panel.classList.toggle('open');if(panel.classList.contains('open'))document.getElementById('tripQuickNameV12210')?.focus()});
      panel.querySelector('#closeTripQuickV12210')?.addEventListener('click',()=>panel.classList.remove('open'));
      panel.querySelector('#tripQuickDifferentEndV12210')?.addEventListener('change',e=>document.getElementById('tripQuickEndWrapV12210')?.classList.toggle('hidden',!e.target.checked));
      panel.querySelector('#saveTripQuickV12210')?.addEventListener('click',saveQuickEditor);
    }
    renderHeaderMeta();
    return true;
  }

  async function fixedExport(event){
    event?.preventDefault();event?.stopPropagation();event?.stopImmediatePropagation();
    let runtime=window.TripPDFRuntimeV1228;
    const hint=document.getElementById('bookletExportHint');
    if(!runtime?.download){
      if(hint){hint.className='booklet-export-hint';hint.textContent='Starting PDF exporter…'}
      for(let i=0;i<30&&!window.TripPDFRuntimeV1228?.download;i++)await delay(60);
      runtime=window.TripPDFRuntimeV1228;
    }
    if(!runtime?.download){
      const msg='The PDF exporter did not initialize. Refresh the page and try again.';
      if(hint){hint.className='booklet-export-hint warn';hint.textContent=msg}
      alert(msg);return false;
    }
    return runtime.download();
  }

  function ownExportButton(){
    const old=document.getElementById('printTripBtn');if(!old)return false;
    if(old.dataset.exportOwner==='12210')return true;
    const fresh=old.cloneNode(true);
    fresh.dataset.exportOwner='12210';
    fresh.dataset.pdfRuntime='';
    fresh.textContent='Download PDF';
    old.replaceWith(fresh);
    fresh.addEventListener('click',fixedExport,true);
    return true;
  }

  function apply(){
    hideLegacyWorkingSections();
    ensureHeaderEditor();
    ownExportButton();
  }

  apply();
  setTimeout(apply,180);
  setTimeout(apply,420);
  setTimeout(apply,1050);
  document.addEventListener('trip-logistics-saved',()=>setTimeout(()=>{renderHeaderMeta();hideLegacyWorkingSections()},80));
  document.addEventListener('trip-days-changed',()=>setTimeout(()=>{renderHeaderMeta();hideLegacyWorkingSections()},80));
  window.TripWorkspaceRefineV12210={apply,saveQuickEditor,renderHeaderMeta,fixedExport};
})();
