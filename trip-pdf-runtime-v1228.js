(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;

  const KEY='mnwiTripCollections';
  const id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const getTrip=()=>read().find(t=>t.id===id);
  const safeName=s=>String(s||'trip').trim().replace(/[^a-z0-9 _-]+/gi,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'trip';
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let loadingLibrary=null;
  let boundButton=null;
  let exporting=false;

  function els(){
    return {
      button:document.getElementById('printTripBtn'),
      mode:document.getElementById('bookletExportMode'),
      paper:document.getElementById('bookletPaper'),
      hint:document.getElementById('bookletExportHint')
    };
  }

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

  function pdfOptions(filename,paperValue){
    const isLetter=paperValue==='LETTER';
    return {
      margin:0,
      filename,
      image:{type:'jpeg',quality:0.96},
      html2canvas:{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false},
      jsPDF:{unit:'mm',format:isLetter?'letter':'a4',orientation:'portrait',compress:true},
      pagebreak:{
        mode:['css','legacy'],
        before:['.booklet-export-page','.booklet-day-page','.booklet-route-page','.booklet-reference-page','.booklet-notes-page','.cp-refs'],
        avoid:['.booklet-stop-card','.booklet-camp','.booklet-critical','.booklet-day-notes','.booklet-logistics-panel','.booklet-reference-row','.cp-stop','.cp-route','.cp-logistics>div','tr']
      },
      enableLinks:true
    };
  }

  function collectBookletStyles(){
    return [...document.querySelectorAll('style')]
      .filter(s=>!String(s.id||'').startsWith('parks-yellowstone-theme-'))
      .filter(s=>!s.dataset.pdfDownload)
      .map(s=>s.textContent||'')
      .join('\n');
  }

  function exportOverrides(){
    return `
      html,body{margin:0!important;padding:0!important;background:#fff!important;color:#15212b!important;font-family:Arial,Helvetica,sans-serif!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      #pdfRuntimeRoot,#pdfRuntimeRoot *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif!important}
      #pdfRuntimeRoot{display:block!important;background:#fff!important;color:#15212b!important;margin:0!important;padding:0!important}
      #pdfRuntimeRoot .booklet-overview,#pdfRuntimeRoot .booklet-day-page,#pdfRuntimeRoot .booklet-route-page,#pdfRuntimeRoot .booklet-reference-page,#pdfRuntimeRoot .booklet-notes-page{display:block!important;max-width:none!important;width:auto!important;margin-left:0!important;margin-right:0!important;box-shadow:none!important;background:#fff!important}
      #pdfRuntimeRoot .booklet-pagination-status,#pdfRuntimeRoot .booklet-export-controls,#pdfRuntimeRoot .trip-workspace-intro,#pdfRuntimeRoot .trip-workspace-section-head,#pdfRuntimeRoot .trip-workspace-export,#pdfRuntimeRoot .site-header,#pdfRuntimeRoot .site-footer{display:none!important}
      #pdfRuntimeRoot .booklet-day-page,#pdfRuntimeRoot .booklet-route-page,#pdfRuntimeRoot .booklet-reference-page,#pdfRuntimeRoot .booklet-notes-page{break-before:page!important;page-break-before:always!important}
      #pdfRuntimeRoot .booklet-stop-card,#pdfRuntimeRoot .booklet-camp,#pdfRuntimeRoot .booklet-critical,#pdfRuntimeRoot .booklet-day-notes,#pdfRuntimeRoot .booklet-logistics-panel,#pdfRuntimeRoot .booklet-reference-row,#pdfRuntimeRoot .cp-stop,#pdfRuntimeRoot .cp-route,#pdfRuntimeRoot .cp-logistics>div,#pdfRuntimeRoot tr{break-inside:avoid!important;page-break-inside:avoid!important}
      #pdfRuntimeRoot a{color:#00558a!important;text-decoration:none!important}
    `;
  }

  function makeFrame(widthMm){
    const frame=document.createElement('iframe');
    frame.setAttribute('aria-hidden','true');
    frame.tabIndex=-1;
    frame.style.cssText='position:fixed;left:-20000px;top:0;width:'+widthMm+'mm;height:1200px;border:0;opacity:0;pointer-events:none;background:#fff;';
    document.body.appendChild(frame);
    return frame;
  }

  function writeFrame(frame,bodyHTML,extraCSS,widthMm){
    const doc=frame.contentDocument;
    if(!doc)throw new Error('Could not create the isolated PDF document.');
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><style>'+extraCSS+'</style></head><body><div id="pdfRuntimeRoot" style="width:'+widthMm+'mm">'+bodyHTML+'</div></body></html>');
    doc.close();
    return doc.getElementById('pdfRuntimeRoot');
  }

  async function synchronize(){
    try{window.TripDayEditor?.persist?.(false)}catch(err){console.warn('Trip day persist before export failed',err)}
    document.dispatchEvent(new CustomEvent('trip-days-changed',{detail:{tripId:id,source:'pdf-runtime'}}));
    document.dispatchEvent(new CustomEvent('trip-logistics-saved',{detail:{tripId:id,source:'pdf-runtime'}}));
    const legacy=document.createElement('button');
    legacy.type='button';legacy.id='saveTripDetailsBtn';legacy.hidden=true;page.appendChild(legacy);legacy.click();legacy.remove();
    window.TripNextActions?.render?.();
    window.TripExportV122?.updateHint?.();
    await delay(350);
  }

  function buildDetailed(paperValue){
    window.TripExportV122?.enhanceBooklet?.();
    window.TripBookletPagination?.paginate?.();
    const body=window.TripBookletExport?.bookletBody?.();
    if(!body||!String(body).trim())throw new Error('The detailed booklet is still loading. Try again in a moment.');
    const width=paperValue==='LETTER'?'215.9':'210';
    const frame=makeFrame(width);
    const root=writeFrame(frame,body,collectBookletStyles()+exportOverrides(),width);
    if(!root){frame.remove();throw new Error('Could not build the isolated booklet document.');}
    return {root,frame,cleanup:()=>frame.remove()};
  }

  function buildCompact(paperValue){
    const trip=getTrip();
    if(!trip)throw new Error('Trip data is unavailable.');
    const source=window.TripExportV122?.compactHTML?.(trip);
    if(!source)throw new Error('The compact plan is still loading. Try again in a moment.');
    const parsed=new DOMParser().parseFromString(source,'text/html');
    const body=parsed.body.innerHTML.replace(/<script[\s\S]*?<\/script>/gi,'');
    const ownCSS=[...parsed.querySelectorAll('style')].map(s=>s.textContent||'').join('\n');
    const width=paperValue==='LETTER'?'191.9':'186';
    const frame=makeFrame(width);
    const root=writeFrame(frame,body,ownCSS+exportOverrides(),width);
    if(!root){frame.remove();throw new Error('Could not build the isolated compact-plan document.');}
    return {root,frame,cleanup:()=>frame.remove()};
  }

  async function download(event){
    if(event){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();}
    if(exporting)return false;
    const {button,mode,paper,hint}=els();
    if(!button||!mode||!paper)return false;
    const trip=getTrip();if(!trip)return false;
    exporting=true;
    const original=button.textContent;
    button.disabled=true;button.textContent='Preparing PDF…';
    if(hint){hint.className='booklet-export-hint';hint.textContent='Synchronizing trip details and building an isolated PDF…'}
    let built=null;
    try{
      await synchronize();
      await loadPDFLibrary();
      built=mode.value==='compact'?buildCompact(paper.value):buildDetailed(paper.value);
      await delay(120);
      const currentTrip=getTrip()||trip;
      const suffix=mode.value==='compact'?'compact-plan':'trip-booklet';
      const filename=safeName(currentTrip.name)+'-'+suffix+'.pdf';
      await window.html2pdf().set(pdfOptions(filename,paper.value)).from(built.root).save();
      if(hint)hint.textContent='PDF downloaded.';
    }catch(err){
      console.error(err);
      if(hint){hint.className='booklet-export-hint warn';hint.textContent=err?.message||'Could not create the PDF.'}
      alert(err?.message||'Could not create the PDF. Please try again.');
    }finally{
      built?.cleanup?.();
      exporting=false;
      button.disabled=false;button.textContent='Download PDF';
      setTimeout(()=>window.TripExportV122?.updateHint?.(),1800);
    }
    return false;
  }

  function bind(){
    const {button,mode,paper}=els();
    if(!button||!mode||!paper||!window.TripBookletExport?.bookletBody||!window.TripExportV122?.compactHTML)return false;
    if(boundButton===button&&button.dataset.pdfRuntime==='1228')return true;
    if(boundButton)boundButton.removeEventListener('click',download,true);
    boundButton=button;
    button.dataset.pdfRuntime='1228';
    button.textContent='Download PDF';
    button.onclick=null;
    button.addEventListener('click',download,true);
    window.TripCompactExport=()=>{mode.value='compact';return download()};
    window.TripBookletExport.exportBooklet=()=>{mode.value='booklet';return download()};
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(bind()||attempts>50)clearInterval(timer);
  },100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  setTimeout(bind,250);
  setTimeout(bind,800);
  window.TripPDFRuntimeV1228={bind,download,pdfOptions,buildDetailed,buildCompact};
})();
