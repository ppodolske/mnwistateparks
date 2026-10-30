/* ATLAS Parks — direct, text-based PDF export for Cloudflare Pages.
 * No backend, browser storage migration, paid services or screenshot PDFs.
 * Keeps the existing Detailed/Condensed and A4/Letter controls.
 */
(() => {
  'use strict';
  const tripPage = document.querySelector('[data-page="trip"]');
  if (!tripPage) return;
  const TRIPS_KEY = 'mnwiTripCollections';
  const COLORS = { blue:[0,90,135], orange:[169,79,16], ink:[30,43,49], muted:[91,105,112], line:[218,225,226], pale:[244,248,248], light:[251,247,239], teal:[27,119,105] };
  const text = value => String(value == null ? '' : value)
    .replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'")
    .replace(/[\u201c\u201d]/g,'"').replace(/\u2022/g,'-')
    .replace(/\u2192/g,' > ').replace(/\u00a0/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
  const safeFile = value => text(value || 'trip').replace(/[^a-z0-9 _-]/gi,'').replace(/\s+/g,'-').slice(0,85) || 'trip';
  const dayString = iso => {
    if (!/^\d{4}-\d\d-\d\d$/.test(iso || '')) return '';
    const d = new Date(iso + 'T12:00:00Z');
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});
  };
  const escUrl = url => /^https:\/\//.test(url || '') ? url : '';
  const setColor = (doc, method, rgb) => doc[method](...rgb);
  const getTrip = () => {
    let trips;
    try { trips = JSON.parse(localStorage.getItem(TRIPS_KEY) || '[]'); } catch { trips = []; }
    return Array.isArray(trips) ? trips.find(t => t.id === tripPage.dataset.tripId) : null;
  };
  let libraryPromise;
  function loadPDF() {
    if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.async = true;
      script.onload = () => window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('Text PDF library failed to initialize'));
      script.onerror = () => reject(new Error('Could not load text PDF library; check network access'));
      document.head.appendChild(script);
    });
    return libraryPromise;
  }
  class Booklet {
    constructor(JsPDF, paper, title) {
      this.doc = new JsPDF({unit:'mm',format:paper === 'LETTER' ? 'letter' : 'a4',orientation:'portrait',compress:true});
      this.w = this.doc.internal.pageSize.getWidth();
      this.h = this.doc.internal.pageSize.getHeight();
      this.left = 15; this.right = this.w - 15; this.width = this.right - this.left;
      this.bottom = this.h - 18; this.y = 27;
      this.title = text(title);
      this.pageCount = 1;
      this.decor();
    }
    font(size = 10, weight = 'normal', color = COLORS.ink) {
      const d = this.doc;
      d.setFont('helvetica',weight);d.setFontSize(size);setColor(d,'setTextColor',color);
    }
    decor() {
      const d = this.doc;
      setColor(d,'setFillColor',COLORS.blue);d.rect(0,0,this.w,3.5,'F');
      this.font(8,'bold',COLORS.blue);d.text('ATLAS  /  MINNESOTA + WISCONSIN STATE PARKS',this.left,12);
      setColor(d,'setDrawColor',COLORS.line);d.setLineWidth(.25);d.line(this.left,17,this.right,17);
    }
    newPage() {this.doc.addPage();this.pageCount++;this.y=27;this.decor();}
    need(height=8) {if(this.y+height>this.bottom)this.newPage();}
    heading(value,options={}) {
      const size = options.size || 15;
      this.need(options.reserve || 18);
      this.font(size,'bold',options.color || COLORS.blue);
      const lines=this.doc.splitTextToSize(text(value),this.width);
      this.doc.text(lines,this.left,this.y);
      this.y += lines.length*size*.40+3;
      return this.y;
    }
    label(value) {
      this.need(7);this.font(8,'bold',COLORS.orange);
      this.doc.text(text(value).toUpperCase(),this.left,this.y);this.y+=5;
    }
    paragraph(value,options={}) {
      if(!String(value||'').trim())return;
      const fontSize=options.size||10,lh=options.lh||4.8;
      this.font(fontSize,options.bold?'bold':'normal',options.color||COLORS.ink);
      const lines=this.doc.splitTextToSize(text(value),options.width||this.width);
      const x=options.x??this.left;
      for(const line of lines){this.need(lh+1);this.doc.text(line,x,this.y);this.y+=lh;}
      this.y+=options.after??2;
    }
    rule(pad=3){this.need(pad+2);this.y+=pad;setColor(this.doc,'setDrawColor',COLORS.line);this.doc.line(this.left,this.y,this.right,this.y);this.y+=3;}
    field(label,value,opts={}){
      if(!String(value||'').trim())return;
      this.need(15);
      this.font(8,'bold',COLORS.muted);this.doc.text(text(label).toUpperCase(),this.left,this.y);this.y+=4;
      this.paragraph(value,{size:opts.size||10,lh:4.6,after:3});
    }
    pills(items){
      const d=this.doc, gap=3, w=(this.width-gap*(items.length-1))/items.length;
      this.need(19);
      items.forEach((item,i)=>{
        const x=this.left+i*(w+gap);
        setColor(d,'setFillColor',COLORS.pale);d.roundedRect(x,this.y,w,16,1.5,1.5,'F');
        this.font(7,'bold',COLORS.muted);d.text(text(item.label).toUpperCase(),x+3,this.y+5.2);
        this.font(14,'bold',COLORS.blue);d.text(text(item.value),x+3,this.y+12.2);
      });
      this.y+=22;
    }
    link(label,url,options={}){
      if(!escUrl(url))return;
      const s=options.size||9;
      this.font(s,'bold',COLORS.blue);
      const txt=text(label);
      this.need(6);
      this.doc.textWithLink(txt,this.left,this.y,{url});this.y+=5.5;
    }
    finish(){
      const d=this.doc,total=this.doc.getNumberOfPages();
      for(let n=1;n<=total;n++){
        d.setPage(n);setColor(d,'setDrawColor',COLORS.line);d.line(this.left,this.h-13,this.right,this.h-13);
        this.font(7,'normal',COLORS.muted);
        d.text(this.title.slice(0,75),this.left,this.h-9);
        d.text(`${n} / ${total}`,this.right,this.h-9,{align:'right'});
      }
    }
  }
  function geographicOverview(out,stops,coords){
    const valid=stops.map((s,i)=>({s,i,pt:coords?.parks?.[s.slug]}))
      .filter(({pt})=>Number.isFinite(pt?.lat)&&Number.isFinite(pt?.lng));
    if(valid.length<2)return false;
    const d=out.doc;
    const mapW=Math.min(87,out.width*.49), mapH=46;
    out.need(mapH+17);out.label('Geographic stop overview');
    const x=out.left,y=out.y;
    setColor(d,'setFillColor',COLORS.pale);d.roundedRect(x,y,mapW,mapH,2,2,'F');
    const lats=valid.map(p=>p.pt.lat), lngs=valid.map(p=>p.pt.lng);
    const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
    const latRange=Math.max(.12,maxLat-minLat),lngRange=Math.max(.12,maxLng-minLng);
    const xy=({lat,lng})=>({x:x+9+((lng-minLng)/lngRange)*(mapW-18),y:y+mapH-9-((lat-minLat)/latRange)*(mapH-18)});
    setColor(d,'setDrawColor',COLORS.muted);d.setLineWidth(.42);d.setLineDashPattern([2,1.5],0);
    valid.forEach((p,i)=>{if(i){const a=xy(valid[i-1].pt),b=xy(p.pt);d.line(a.x,a.y,b.x,b.y);}});
    d.setLineDashPattern([],0);
    for(const p of valid){const a=xy(p.pt);setColor(d,'setFillColor',COLORS.blue);d.circle(a.x,a.y,3.5,'F');out.font(7,'bold',[255,255,255]);d.text(String(p.i+1),a.x,a.y+1.1,{align:'center'});}
    // Geographic markers are vector circles; no map tiles or paid API needed.
    const rx=x+mapW+6,rw=out.right-rx;
    out.font(7.8,'normal',COLORS.ink);
    const lineHeight=4.3;
    let ry=y+5;
    for(const p of valid.slice(0,8)){
      const line=`${p.i+1}. ${text(p.s.park.name)}`;
      const row=d.splitTextToSize(line,rw);
      d.text(row.slice(0,2),rx,ry);ry+=Math.min(row.length,2)*lineHeight+1;
    }
    out.y+=mapH+3;
    out.paragraph('Relative park locations and visit order only. Not a road route; no distance or driving time is implied.',{size:7.5,color:COLORS.muted,lh:3.5,after:3});
    return true;
  }
  function printStop(out,stop,i,index,refs,compact){
    const p=index.get(stop.slug)||stop.park;
    if(!p)return;
    const meta=stop.meta||{},ref=refs[p.slug]||{};
    out.need(compact?27:43);
    out.rule(3);
    out.heading(`${i+1}. ${p.name || stop.park.name}`,{size:13,reserve:compact?19:34});
    const tripKind=String(p.idealTrip||'').trim();
    const rating=Number.isFinite(Number(p.rating))?Number(p.rating).toFixed(1)+' / 5 pine':'';
    out.paragraph([p.city,p.state,tripKind,rating].filter(Boolean).join('   |   '),{size:9,color:COLORS.muted,after:3});
    if(ref.address)out.field('Address',ref.address,{size:9});
    if(!compact){
      if(p.review){out.label('What to expect');out.paragraph(p.review,{size:10.2,lh:5.1,after:3});}
      if(p.pros)out.field('Pros',p.pros,{size:9.5});
      if(p.cons)out.field('Watch out for',p.cons,{size:9.5});
      if(p.criticalFactors)out.field('Critical factors',p.criticalFactors,{size:9.5});
    }else{
      if(p.criticalFactors||p.cons)out.field('Watch out for',p.criticalFactors||p.cons,{size:9});
    }
    const campground=meta.camping?[meta.campground,meta.loop,meta.campsite].filter(Boolean).join(' / ')||'Camping planned':'';
    if(campground)out.field('Camping',campground,{size:9});
    if(meta.reservation)out.field('Reservation',meta.reservation,{size:9});
    if(meta.notes||meta.note)out.field('Your stop notes',meta.notes||meta.note,{size:9});
    const maps=ref.directionsUrl||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.name,p.city,p.state].filter(Boolean).join(', '));
    if(escUrl(maps))out.link('Open directions in Google Maps',maps,{size:9});
    const official=ref.officialUrl||ref.sourceUrl;
    if(!compact&&escUrl(official))out.link('Official park information',official,{size:8.5});
  }
  function quickReference(out,trip,stops,refs,compact){
    if(compact&&stops.length<=2)return;
    out.rule(4);out.heading('On-the-road reference',{size:14,reserve:30});
    const fields=[['Emergency / reference contact',trip.emergencyContact],['Lodging',trip.lodgingNotes],['Fuel / food / resupply',trip.resupplyNotes]];
    for(const [name,value] of fields)if(String(value||'').trim())out.field(name,value,{size:9.5});
    const checklist=['Check closures and park alerts','Confirm reservations','Check weather and trail conditions','Save offline maps','Bring booking confirmations'];
    out.label('Before departure');
    for(const item of checklist){out.need(6);out.font(9,'normal');out.doc.rect(out.left,out.y-2.6,2.6,2.6);out.doc.text(item,out.left+6,out.y);out.y+=5.3;}
    out.paragraph('Verify official park conditions, access and reservations shortly before travelling.',{size:8,color:COLORS.muted,after:0});
  }
  function journal(out){
    out.need(30);out.rule(5);out.heading('Trip notes and highlights',{size:14,reserve:18});
    for(const name of ['Favorite park','Best campsite / overnight','Biggest surprise','What I would change']){
      out.need(12);out.label(name);
      setColor(out.doc,'setDrawColor',COLORS.line);out.doc.line(out.left,out.y+2,out.right,out.y+2);out.y+=9;
    }
  }
  async function sync(){
    try {window.TripDayEditor?.persist?.(false);}catch(err){console.warn('Day editor persistence failed',err);}
    const id=tripPage.dataset.tripId;
    document.dispatchEvent(new CustomEvent('trip-days-changed',{detail:{tripId:id,source:'pdf-native'}}));
    document.dispatchEvent(new CustomEvent('trip-logistics-saved',{detail:{tripId:id,source:'pdf-native'}}));
    const save=document.createElement('button');save.id='saveTripDetailsBtn';save.hidden=true;tripPage.appendChild(save);save.click();save.remove();
    await new Promise(resolve=>setTimeout(resolve,160));
  }
  async function generate(trip, JsPDF, paper, mode){
    const [indexResponse, coordsResponse] = await Promise.all([
      fetch('/cloudflare-parks.json',{cache:'no-store'}),
      fetch('/park-coordinates.json',{cache:'no-store'}).catch(()=>null)
    ]);
    if(!indexResponse.ok)throw new Error('The complete park review index is unavailable. PDF was not generated.');
    const records=await indexResponse.json();
    if(!Array.isArray(records)||records.length!==116)throw new Error('Incomplete park reviews. PDF was not generated.');
    const index=new Map(records.map(p=>[p.slug,p]));
    const coords=coordsResponse?.ok?await coordsResponse.json().catch(()=>null):null;
    const parksNode=document.getElementById('parksData');
    const parks=JSON.parse(parksNode?.textContent||'[]');
    const itinerary=window.TripItinerary?.build?.(trip,parks,window.PARK_DETAILS||{});
    if(!itinerary)throw new Error('Trip itinerary is unavailable.');
    const stops=window.TripItinerary.orderedStops(trip,parks);
    const refs=window.PARK_REFERENCES||window.PARK_DETAILS||{};
    const out=new Booklet(JsPDF,paper,trip.name||'Trip');
    out.label(mode==='compact'?'Compact road-trip plan':'Trip booklet');
    out.heading(trip.name||'Untitled trip',{size:23,reserve:30});
    const dates=[dayString(itinerary.startDate),dayString(itinerary.endDate)].filter(Boolean);
    if(dates.length)out.paragraph(dates.join(' - '),{size:10,color:COLORS.muted});
    out.pills([{label:'Parks',value:String(stops.length)},{label:'Planned days',value:String(itinerary.assignedDays)},{label:'States',value:String(itinerary.stateCount)}]);
    if(trip.startLocation)out.field('Trip start',trip.startLocation);
    if(trip.endLocation)out.field('Trip end',trip.endLocation);
    const missing=[];
    if(!trip.startLocation)missing.push('start location');
    if(!trip.endLocation)missing.push('end location');
    if(stops.length&&!itinerary.assignedDays)missing.push('day assignments');
    if(missing.length)out.paragraph('Planning incomplete: '+missing.join(', ')+'. Route links and timing may be unavailable.',{size:8.5,color:COLORS.orange});
    if(itinerary.days.length){
      out.label('Itinerary at a glance');
      for(const day of itinerary.days){
        const names=day.stops.map(s=>s.park.name).join(' > ')||'No park stops assigned';
        out.paragraph(`${day.label}${day.date?'  /  '+dayString(day.date):''}: ${names}`,{size:9.5,lh:4.4,after:2});
        if(day.overnight&&day.key!=='Unassigned')out.paragraph('Overnight: '+day.overnight,{size:8.5,color:COLORS.muted,after:2});
        if(day.routeAvailable&&escUrl(day.routeUrl))out.link(`${day.label} driving route`,day.routeUrl,{size:8});
      }
    }
    if(trip.notes)out.field('Trip-wide notes',trip.notes,{size:9.5});
    geographicOverview(out,stops,coords);
    if(stops.length){
      for(let i=0;i<stops.length;i++){
        const stop=stops[i];
        const key=String(stop.meta?.day||'').trim();
        if(key&&(!i||key!==String(stops[i-1].meta?.day||'').trim())){
          out.need(20);out.label(`Day ${key}`);
        }
        printStop(out,stop,i,index,refs,mode==='compact');
      }
    }else{out.rule();out.paragraph('No parks added yet. Add parks in the Atlas trip planner before exporting.',{size:11});}
    quickReference(out,trip,stops,refs,mode==='compact');
    if(mode!=='compact')journal(out);
    out.finish();
    return out.doc;
  }
  let busy=false;
  async function download(ev){
    const button=document.getElementById('printTripBtn');
    if(!button||busy)return;
    busy=true;
    const mode=document.getElementById('bookletExportMode')?.value==='compact'?'compact':'booklet';
    const paper=document.getElementById('bookletPaper')?.value==='LETTER'?'LETTER':'A4';
    const hint=document.getElementById('bookletExportHint');
    button.disabled=true;button.textContent='Preparing text PDF...';
    if(hint)hint.textContent='Building a searchable, selectable-text PDF...';
    try{
      await sync();
      const trip=getTrip();
      if(!trip)throw new Error('Trip data is unavailable');
      const JsPDF=await loadPDF();
      const pdf=await generate(trip,JsPDF,paper,mode);
      const name=safeFile(trip.name)+(mode==='compact'?'-compact-plan.pdf':'-trip-booklet.pdf');
      pdf.save(name);
      if(hint)hint.textContent='Searchable PDF downloaded.';
    }catch(err){
      console.error('Atlas Parks PDF export:',err);
      if(hint)hint.textContent='PDF not generated: '+(err?.message||'unknown error');
      alert(err?.message||'PDF export failed.');
    }finally{
      button.disabled=false;button.textContent='Download PDF';busy=false;
    }
  }
  function install(){
    // Document capture intercepts before the older screenshot-based PDF runtime.
    document.addEventListener('click',ev=>{
      const button=document.getElementById('printTripBtn');
      if(!button||!button.contains(ev.target))return;
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      download(ev);
    },true);
    const button=document.getElementById('printTripBtn');
    if(button){button.dataset.pdfRuntime='native';button.title='Download searchable text PDF';}
  }
  install();
  window.TripPDFNative={generate,install,version:'1.0.0'};
})();
