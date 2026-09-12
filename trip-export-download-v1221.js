(()=>{
  const page=document.querySelector('[data-page="trip"]');if(!page)return;
  const button=document.getElementById('printTripBtn');
  const mode=document.getElementById('bookletExportMode');
  const paper=document.getElementById('bookletPaper');
  const hint=document.getElementById('bookletExportHint');
  if(!button||!mode||!paper)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const getTrip=()=>read().find(t=>t.id===id);
  const safeName=s=>String(s||'trip').trim().replace(/[^a-z0-9 _-]+/gi,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'trip';
  const collectStyles=()=>[...document.querySelectorAll('style')].filter(s=>!s.id.startsWith('parks-yellowstone-theme-')&&!s.dataset.pdfDownload).map(s=>s.textContent||'').join('\n');
  let loadingLibrary=null;

  function loadPDFLibrary(){
    if(window.html2pdf)return Promise.resolve(window.html2pdf);
    if(loadingLibrary)return loadingLibrary;
    loadingLibrary=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async=true;
      script.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(new Error('PDF library did not initialize.'));
      script.onerror=()=>reject(new Error('Could not load the PDF generator. Check your connection and try again.'));
      document.head.appendChild(script);
    });
    return loadingLibrary;
  }

  function pdfOptions(filename){
    const isLetter=paper.value==='LETTER';
    return {
      margin:0,
      filename,
      image:{type:'jpeg',quality:0.96},
      html2canvas:{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false},
      jsPDF:{unit:'mm',format:isLetter?'letter':'a4',orientation:'portrait',compress:true},
      pagebreak:{mode:['css','legacy'],before:['.booklet-export-page','.booklet-route-page','.booklet-reference-page','.booklet-notes-page','.cp-refs'],avoid:['.booklet-stop-card','.booklet-camp','.booklet-critical','.booklet-day-notes','.cp-stop','.cp-route','.cp-logistics>div','tr']},
      enableLinks:true
    };
  }

  function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  async function synchronizeExportState(){
    try{window.TripDayEditor?.persist?.(false)}catch(err){console.warn('Trip day persist before export failed',err)}
    document.dispatchEvent(new CustomEvent('trip-days-changed',{detail:{tripId:id,source:'export-sync'}}));
    document.dispatchEvent(new CustomEvent('trip-logistics-saved',{detail:{tripId:id,source:'export-sync'}}));
    const legacy=document.createElement('button');
    legacy.type='button';legacy.id='saveTripDetailsBtn';legacy.hidden=true;page.appendChild(legacy);legacy.click();legacy.remove();
    window.TripNextActions?.render?.();
    window.TripExportV122?.updateHint?.();
    await delay(300);
  }

  function makeDetailedRoot(){
    window.TripExportV122?.enhanceBooklet?.();
    window.TripBookletPagination?.paginate?.();
    const body=window.TripBookletExport?.bookletBody?.();
    if(!body||!String(body).trim())throw new Error('The detailed booklet is still loading. Try again in a moment.');
    const root=document.createElement('div');
    root.className='pdf-download-root pdf-download-detailed';
    root.innerHTML=body;
    root.style.cssText='position:absolute;left:-12000px;top:0;background:#fff;color:#15212b;width:'+(paper.value==='LETTER'?'215.9mm':'210mm')+';font-family:Arial,Helvetica,sans-serif;';
    const style=document.createElement('style');
    style.dataset.pdfDownload='true';
    style.textContent=collectStyles()+`\n.pdf-download-root,.pdf-download-root *{font-family:Arial,Helvetica,sans-serif!important}.pdf-download-detailed .booklet-overview,.pdf-download-detailed .booklet-day-page,.pdf-download-detailed .booklet-route-page,.pdf-download-detailed .booklet-reference-page,.pdf-download-detailed .booklet-notes-page{display:block!important;max-width:none!important;width:auto!important;margin-left:0!important;margin-right:0!important;box-shadow:none!important}.pdf-download-detailed .booklet-pagination-status,.pdf-download-detailed .booklet-export-controls{display:none!important}.pdf-download-detailed .booklet-day-page,.pdf-download-detailed .booklet-route-page,.pdf-download-detailed .booklet-reference-page,.pdf-download-detailed .booklet-notes-page{break-before:page;page-break-before:always}.pdf-download-detailed .booklet-stop-card,.pdf-download-detailed .booklet-camp,.pdf-download-detailed .booklet-critical,.pdf-download-detailed .booklet-day-notes,.pdf-download-detailed .booklet-logistics-panel,.pdf-download-detailed .booklet-reference-row{break-inside:avoid;page-break-inside:avoid}`;
    document.head.appendChild(style);document.body.appendChild(root);
    return {root,cleanup:()=>{root.remove();style.remove()}};
  }

  function makeCompactRoot(){
    const trip=getTrip();if(!trip)throw new Error('Trip data is unavailable.');
    const source=window.TripExportV122?.compactHTML?.(trip);if(!source)throw new Error('The compact plan is still loading. Try again in a moment.');
    const doc=new DOMParser().parseFromString(source,'text/html');
    const root=document.createElement('div');
    root.className='pdf-download-root pdf-download-compact';
    root.innerHTML=doc.body.innerHTML.replace(/<script[\s\S]*?<\/script>/gi,'');
    root.style.cssText='position:absolute;left:-12000px;top:0;background:#fff;color:#15212b;width:'+(paper.value==='LETTER'?'191.9mm':'186mm')+';font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.35;';
    const style=document.createElement('style');style.dataset.pdfDownload='true';
    style.textContent=[...doc.querySelectorAll('style')].map(s=>s.textContent||'').join('\n')+'\n.pdf-download-root,.pdf-download-root *{font-family:Arial,Helvetica,sans-serif!important}.pdf-download-compact .cp-refs{break-before:page;page-break-before:always}.pdf-download-compact .cp-stop,.pdf-download-compact .cp-route,.pdf-download-compact .cp-logistics>div,.pdf-download-compact tr{break-inside:avoid;page-break-inside:avoid}';
    document.head.appendChild(style);document.body.appendChild(root);
    return {root,cleanup:()=>{root.remove();style.remove()}};
  }

  async function download(){
    const trip=getTrip();if(!trip)return;
    const original=button.textContent;
    button.disabled=true;button.textContent='Preparing PDF…';
    if(hint){hint.className='booklet-export-hint';hint.textContent='Synchronizing trip details and building the PDF…'}
    let built=null;
    try{
      await synchronizeExportState();
      await loadPDFLibrary();
      built=mode.value==='compact'?makeCompactRoot():makeDetailedRoot();
      const currentTrip=getTrip()||trip;
      const suffix=mode.value==='compact'?'compact-plan':'trip-booklet';
      const filename=safeName(currentTrip.name)+'-'+suffix+'.pdf';
      await window.html2pdf().set(pdfOptions(filename)).from(built.root).save();
      if(hint)hint.textContent='PDF downloaded.';
    }catch(err){
      console.error(err);
      if(hint){hint.className='booklet-export-hint warn';hint.textContent=err?.message||'Could not create the PDF.'}
      alert(err?.message||'Could not create the PDF. Please try again.');
    }finally{
      built?.cleanup?.();
      button.disabled=false;button.textContent=original;
      setTimeout(()=>window.TripExportV122?.updateHint?.(),1800);
    }
  }

  button.textContent='Download PDF';
  button.setAttribute('aria-label','Download trip PDF');
  button.onclick=download;
  const exportSection=document.getElementById('workspaceExport');
  const copy=exportSection?.querySelector('.trip-workspace-export-copy');
  if(copy)copy.textContent='Choose the detailed booklet or compact plan, then download the finished PDF directly.';
  window.TripCompactExport=()=>{mode.value='compact';return download()};
  if(window.TripBookletExport)window.TripBookletExport.exportBooklet=()=>{mode.value='booklet';return download()};
  window.TripPDFDownload={download,loadPDFLibrary,pdfOptions,synchronizeExportState};
})();
