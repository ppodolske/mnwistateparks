(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;

  const style=document.createElement('style');
  style.id='trip-workspace-ui-v1229';
  style.textContent=`
  @media screen{
    [data-page="trip"]{max-width:1320px!important;margin:0 auto!important;padding-left:24px!important;padding-right:24px!important}
    [data-page="trip"] .page-intro{padding:44px 0 18px!important}
    [data-page="trip"] .page-intro h1{margin:8px 0 14px!important}
    [data-page="trip"] .page-intro>p{font-size:15px!important;line-height:1.6!important;max-width:820px!important;color:#45535a!important}
    [data-page="trip"] .trip-toolbar{margin:18px 0 0!important;gap:10px!important}
    [data-page="trip"] .button{font-size:13px!important;padding:11px 16px!important;min-height:42px}

    [data-page="trip"] .trip-summary{margin:26px 0 32px!important;gap:14px!important}
    [data-page="trip"] .trip-summary-card{background:#fff!important;border:1px solid var(--yellowstone-line)!important;border-top:4px solid var(--yellowstone-blue)!important;border-radius:12px!important;padding:18px 20px!important;min-height:96px!important;box-shadow:0 3px 12px rgba(31,43,49,.035)}
    [data-page="trip"] .trip-summary-card strong{font-family:"Bebas Neue",sans-serif!important;font-weight:400!important;font-size:38px!important;line-height:1!important;color:var(--yellowstone-blue)!important}
    [data-page="trip"] .trip-summary-card span{font-family:"PT Serif",Georgia,serif!important;font-size:11px!important;letter-spacing:.055em!important;color:var(--yellowstone-muted)!important}

    [data-page="trip"] .trip-export-panel-v1229{margin:20px 0 30px;background:#fff;border:1px solid var(--yellowstone-line);border-left:5px solid var(--yellowstone-orange);border-radius:14px;padding:18px 20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;box-shadow:0 5px 18px rgba(31,43,49,.045)}
    [data-page="trip"] .trip-export-panel-v1229 h2{font-family:"Bebas Neue",sans-serif!important;font-weight:400!important;font-size:30px!important;line-height:1!important;margin:3px 0 7px!important;color:var(--yellowstone-ink)!important}
    [data-page="trip"] .trip-export-panel-v1229 p{font-size:13px!important;line-height:1.5!important;margin:0!important;max-width:660px;color:#59666d}
    [data-page="trip"] .trip-export-panel-controls{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    [data-page="trip"] #bookletExportControls{display:flex!important;align-items:flex-end!important;gap:10px!important;margin:0!important;flex-wrap:wrap!important}
    [data-page="trip"] #bookletExportControls label{font-family:"PT Serif",Georgia,serif!important;font-size:10px!important;font-weight:700!important;letter-spacing:.045em!important;text-transform:uppercase!important;color:#665f55!important}
    [data-page="trip"] #bookletExportControls select{font-family:"Fredoka",Arial,sans-serif!important;font-size:13px!important;font-weight:400!important;display:block!important;margin-top:5px!important;height:42px!important;min-width:150px!important;border:1px solid var(--yellowstone-line)!important;border-radius:8px!important;background:#fff!important;color:var(--yellowstone-ink)!important;padding:0 34px 0 11px!important}
    [data-page="trip"] #bookletPaper{min-width:110px!important}
    [data-page="trip"] #bookletExportHint{display:block!important;flex-basis:100%;font-family:"Fredoka",Arial,sans-serif!important;font-size:11.5px!important;line-height:1.4!important;color:var(--yellowstone-muted)!important;max-width:420px!important;margin-top:1px!important}
    [data-page="trip"] #bookletExportHint.warn{color:#8a480f!important}
    [data-page="trip"] #printTripBtn{margin:0!important;white-space:nowrap!important;background:var(--yellowstone-orange)!important;border-color:var(--yellowstone-orange)!important;color:#fff!important}
    [data-page="trip"] #workspaceExport{display:none!important}

    [data-page="trip"] .trip-day-editor{margin:30px 0 0!important}
    [data-page="trip"] .trip-day-editor-head{margin-bottom:16px!important;align-items:flex-start!important}
    [data-page="trip"] .trip-day-editor-head h3{font-family:"Bebas Neue",sans-serif!important;font-size:30px!important;font-weight:400!important;line-height:1!important;margin:4px 0 6px!important}
    [data-page="trip"] .trip-day-editor-head p{font-size:13px!important;line-height:1.5!important;max-width:760px!important;color:#5f6970!important}
    [data-page="trip"] .trip-day-card{border:1px solid var(--yellowstone-line)!important;border-radius:14px!important;overflow:hidden!important;margin-bottom:18px!important;box-shadow:0 3px 12px rgba(31,43,49,.035)}
    [data-page="trip"] .trip-day-card-head{padding:17px 18px!important;background:#fbfaf6!important;border-bottom-color:var(--yellowstone-line)!important}
    [data-page="trip"] .trip-day-card-head h3{font-family:"Bebas Neue",sans-serif!important;font-size:25px!important;font-weight:400!important;line-height:1!important}
    [data-page="trip"] .trip-day-card-meta{font-size:12px!important;line-height:1.45!important;margin-top:5px!important;color:#677279!important}
    [data-page="trip"] .trip-day-route-link{font-size:12px!important;font-weight:500!important}
    [data-page="trip"] .trip-day-route{padding:13px 18px!important;gap:14px!important;background:rgba(127,164,194,.12)!important;border-bottom-color:var(--yellowstone-line)!important}
    [data-page="trip"] .trip-day-route span{font-family:"PT Serif",Georgia,serif!important;font-size:10px!important;font-weight:700!important;letter-spacing:.055em!important;color:#677279!important}
    [data-page="trip"] .trip-day-route strong{font-family:"Fredoka",Arial,sans-serif!important;font-size:14px!important;font-weight:400!important;color:var(--yellowstone-ink)!important}
    [data-page="trip"] .trip-day-empty{font-size:13px!important;padding:18px!important}

    [data-page="trip"] .trip-day-stop{padding:18px!important;border-bottom-color:#ebe7dc!important}
    [data-page="trip"] .trip-day-stop-title b{font-family:"Bebas Neue",sans-serif!important;font-size:22px!important;font-weight:400!important;line-height:1!important;color:var(--yellowstone-ink)!important}
    [data-page="trip"] .trip-day-stop-title span{font-size:12px!important;color:#677279!important}
    [data-page="trip"] .trip-mini-btn,[data-page="trip"] .trip-mini-link{font-family:"Fredoka",Arial,sans-serif!important;font-size:11px!important;font-weight:400!important;padding:7px 9px!important;border-radius:7px!important}
    [data-page="trip"] .trip-day-stop-fields{grid-template-columns:105px minmax(0,1fr)!important;gap:12px!important;margin-top:13px!important}
    [data-page="trip"] .trip-day-stop-fields label>span,[data-page="trip"] .trip-day-camp label>span{font-family:"PT Serif",Georgia,serif!important;font-size:10px!important;font-weight:700!important;letter-spacing:.045em!important;color:#6a6b68!important;margin-bottom:5px!important}
    [data-page="trip"] .trip-day-stop-fields input,[data-page="trip"] .trip-day-stop-fields textarea,[data-page="trip"] .trip-day-stop-fields select,[data-page="trip"] .trip-day-camp input,[data-page="trip"] .trip-day-camp select{font-family:"Fredoka",Arial,sans-serif!important;font-size:14px!important;line-height:1.4!important;padding:10px 11px!important;border-radius:8px!important;border-color:var(--yellowstone-line)!important;color:var(--yellowstone-ink)!important}
    [data-page="trip"] .trip-day-stop-fields textarea{min-height:78px!important}
    [data-page="trip"] .trip-day-camp-toggle{font-size:13px!important;color:#425158!important;gap:8px!important}
    [data-page="trip"] .trip-day-camp{padding:12px!important;gap:10px!important;background:rgba(223,203,145,.15)!important;border-color:rgba(175,126,86,.24)!important;border-radius:10px!important}
    [data-page="trip"] .trip-day-savebar{bottom:12px!important;padding:12px 14px!important;border-radius:12px!important;border-color:var(--yellowstone-line)!important;box-shadow:0 8px 26px rgba(31,43,49,.10)!important}
    [data-page="trip"] .trip-day-save-status{font-size:12px!important}
    [data-page="trip"] .trip-day-warning{font-size:11px!important}

    [data-page="trip"] .trip-workspace-section-head h2,[data-page="trip"] .trip-next-head h2{font-size:30px!important}
    [data-page="trip"] .trip-workspace-section-head p,[data-page="trip"] .trip-workspace-export-copy,[data-page="trip"] .trip-next-summary{font-size:13px!important;line-height:1.5!important}
    [data-page="trip"] .trip-next-actions{border-radius:14px!important;padding:18px 20px!important}
    [data-page="trip"] .trip-action b{font-size:14px!important}
    [data-page="trip"] .trip-action small{font-size:11px!important;line-height:1.4!important}
    [data-page="trip"] .trip-action-go{font-size:11px!important}
    [data-page="trip"] .trip-ready-message{font-size:13px!important}

    [data-page="trip"] .trip-location-editor label span,[data-page="trip"] .itinerary-stat span{font-family:"PT Serif",Georgia,serif!important;font-size:10px!important}
    [data-page="trip"] .trip-location-editor input{font-size:14px!important;border-radius:8px!important}
    [data-page="trip"] .itinerary-stat strong{font-size:16px!important}
    [data-page="trip"] .itinerary-day-meta,[data-page="trip"] .itinerary-day-route,[data-page="trip"] .itinerary-note{font-size:12px!important}

    [data-page="trip"] .trip-unassigned-head h3{font-size:26px!important}
    [data-page="trip"] .trip-unassigned-head p,[data-page="trip"] .trip-unassigned-status{font-size:12px!important}
    [data-page="trip"] .trip-unassigned-title b{font-size:15px!important}
    [data-page="trip"] .trip-unassigned-title span{font-size:11px!important}
    [data-page="trip"] .trip-unassigned-actions select,[data-page="trip"] .trip-unassigned-btn{font-size:11px!important}

    @media(max-width:760px){
      [data-page="trip"]{padding-left:16px!important;padding-right:16px!important}
      [data-page="trip"] .trip-export-panel-v1229{grid-template-columns:1fr;padding:16px}
      [data-page="trip"] .trip-export-panel-controls{justify-content:flex-start}
      [data-page="trip"] #bookletExportControls{width:100%}
      [data-page="trip"] #bookletExportControls label{flex:1 1 140px}
      [data-page="trip"] #bookletExportControls select{width:100%;min-width:0!important}
      [data-page="trip"] .trip-day-stop-fields{grid-template-columns:1fr!important}
    }
  }
  `;
  document.head.appendChild(style);

  function ensureBookletAPI(){
    window.TripBookletExport=window.TripBookletExport||{};
    if(typeof window.TripBookletExport.bookletBody!=='function'){
      window.TripBookletExport.bookletBody=()=>{
        const wrap=document.createElement('div');
        ['tripBookletOverview','tripBookletDays','tripBookletRoute','tripBookletReference','tripBookletNotes'].forEach(id=>{
          const el=document.getElementById(id);if(el)wrap.appendChild(el.cloneNode(true));
        });
        return wrap.innerHTML;
      };
    }
  }

  function ensureControls(){
    const button=document.getElementById('printTripBtn');
    if(!button)return false;
    ensureBookletAPI();

    let controls=document.getElementById('bookletExportControls');
    if(!controls){
      controls=document.createElement('span');
      controls.id='bookletExportControls';
      controls.className='booklet-export-controls';
    }
    controls.innerHTML='<label>PDF format<select id="bookletExportMode"><option value="booklet">Detailed booklet</option><option value="compact">Condensed plan</option></select></label><label>Paper<select id="bookletPaper"><option value="A4">A4</option><option value="LETTER">US Letter</option></select></label><span id="bookletExportHint" class="booklet-export-hint">Choose a format, then download the PDF.</span>';
    const paper=document.getElementById('bookletPaper');
    if(paper){paper.value=(localStorage.getItem('mnwiBookletPaper')||'A4').toUpperCase()==='LETTER'?'LETTER':'A4';paper.onchange=()=>localStorage.setItem('mnwiBookletPaper',paper.value)}

    let panel=document.getElementById('tripExportPanelV1229');
    if(!panel){
      panel=document.createElement('section');
      panel.id='tripExportPanelV1229';
      panel.className='trip-export-panel-v1229';
      panel.innerHTML='<div class="trip-export-panel-copy"><div class="kicker blue">EXPORT TRIP</div><h2>Download a clean trip PDF.</h2><p>Detailed booklet includes the full day-by-day plan, route, notes and park references. Condensed plan is a shorter quick-reference version.</p></div><div class="trip-export-panel-controls"></div>';
      const toolbar=button.closest('.trip-toolbar');
      if(toolbar)toolbar.insertAdjacentElement('afterend',panel);else button.parentElement?.insertAdjacentElement('afterend',panel);
    }
    const host=panel.querySelector('.trip-export-panel-controls');
    if(host){host.appendChild(controls);host.appendChild(button)}

    button.textContent='Download PDF';
    button.setAttribute('aria-label','Download trip PDF');
    button.onclick=null;
    document.getElementById('workspaceExport')?.setAttribute('aria-hidden','true');
    window.TripExportV122?.updateHint?.();
    window.TripPDFRuntimeV1228?.bind?.();
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{attempts+=1;if(ensureControls()||attempts>60)clearInterval(timer)},100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureControls,{once:true});else ensureControls();
  setTimeout(ensureControls,300);
  setTimeout(ensureControls,900);
  window.TripWorkspaceUIV1229={ensureControls};
})();
