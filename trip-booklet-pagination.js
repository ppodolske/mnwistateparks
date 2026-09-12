(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;
  const PAPER={A4:{widthMm:210,heightMm:297},LETTER:{widthMm:215.9,heightMm:279.4}};
  const MARGIN_MM=11;
  const state={paper:'A4',oversize:0,pageHeightPx:0};
  function pxPerMm(){const ruler=document.createElement('div');ruler.style.cssText='position:absolute;visibility:hidden;width:100mm;height:1mm;left:-9999px;top:-9999px';document.body.appendChild(ruler);const px=ruler.getBoundingClientRect().width/100;ruler.remove();return px||3.7795275591}
  function paperName(){const saved=(localStorage.getItem('mnwiBookletPaper')||'A4').toUpperCase();return PAPER[saved]?saved:'A4'}
  function clear(){document.querySelectorAll('.booklet-oversize').forEach(el=>{el.classList.remove('booklet-oversize');el.removeAttribute('data-pagination-warning')});document.documentElement.removeAttribute('data-booklet-pagination');state.oversize=0}
  function paginate(){clear();const paper=paperName(),spec=PAPER[paper],ppm=pxPerMm(),pageHeight=(spec.heightMm-MARGIN_MM*2)*ppm;state.paper=paper;state.pageHeightPx=pageHeight;document.documentElement.dataset.bookletPagination=paper.toLowerCase();document.querySelectorAll('.booklet-stop-card').forEach(el=>{if(el.getBoundingClientRect().height>pageHeight){el.classList.add('booklet-oversize');el.dataset.paginationWarning='This stop card is taller than one printable page.';state.oversize++}});updateStatus();return {...state}}
  function updateStatus(){let el=document.getElementById('bookletPaginationStatus');if(!el){el=document.createElement('div');el.id='bookletPaginationStatus';el.className='booklet-pagination-status';const days=document.getElementById('tripBookletDays');if(days)days.insertAdjacentElement('beforebegin',el);else page.appendChild(el)}el.textContent='Print layout: '+state.paper+(state.oversize?' · '+state.oversize+' oversized stop warning'+(state.oversize===1?'':'s'):'')}
  const style=document.createElement('style');style.textContent='.booklet-pagination-status{font-size:10px;color:#667;margin:-14px 0 18px;text-align:right}.booklet-stop-card,.booklet-handwrite,.booklet-camp,.booklet-critical,.booklet-day-notes{break-inside:avoid!important;page-break-inside:avoid!important}.booklet-oversize{outline:2px dashed #9a5d45;outline-offset:2px}@media print{@page{margin:0}.booklet-pagination-status{display:none!important}.booklet-stop-card,.booklet-handwrite,.booklet-camp,.booklet-critical,.booklet-day-notes{break-inside:avoid!important;page-break-inside:avoid!important}.booklet-oversize{outline:0!important}}';document.head.appendChild(style);
  window.TripBookletPagination={PAPER,MARGIN_MM,paginate,clear,getState:()=>({...state})};
  addEventListener('beforeprint',paginate);addEventListener('afterprint',clear);
  const days=document.getElementById('tripBookletDays');if(days)new MutationObserver(()=>setTimeout(paginate,80)).observe(days,{childList:true,subtree:true});
  setTimeout(paginate,120);
})();
