/* Atlas Parks · Print Reference v1
   Designed for printer-first A4 / US Letter output. Uses only recorded trip data.
   A dated Atlas Timeline is authoritative; the legacy day groups are fallback only.
   Never POSTs/PUTs, invents a campsite or adds a second itinerary. */
(() => {
  'use strict';
  const PAGE = document.querySelector('[data-page="trip"]');
  if (!PAGE) return;
  const TRIPS = 'mnwiTripCollections';
  const COLORS = {
    ink: [35,42,41], muted: [87,101,97], green: [47,91,77],
    amber: [169,91,26], rule: [205,213,209], pale: [247,249,247]
  };
  const clean = x => String(x ?? '').replace(/[\u2010-\u2015]/g,'-')
    .replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"')
    .replace(/\u2022/g,';').replace(/\u00a0/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
  const fileName=x=>(clean(x)||'trip').replace(/[^a-z0-9 _-]/gi,'').replace(/\s+/g,'-').slice(0,70)||'trip';
  const validUrl=x=>/^https:\/\//i.test(x||'')?x:'';
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(TRIPS)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
  const current=()=>read().find(t=>t?.id===PAGE.dataset.tripId)||null;
  const dayFmt=(iso,short=false)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return clean(iso||'');
    const d=new Date(iso+'T12:00:00Z');
    if(Number.isNaN(d.getTime()))return clean(iso);
    return d.toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',...(short?{weekday:'short'}:{year:'numeric'})});
  };
  const nameOf=(slug,bySlug)=>clean(bySlug.get(slug)?.name||slug);
  const siteOf=meta=>[meta?.campground,meta?.loop,meta?.campsite].map(clean).filter(Boolean).join(' / ');
  const shortPark=x=>clean(x).replace(/ State Park$/i,'');
  const list=x=>Array.isArray(x)?x:[];
  const note=x=>typeof x==='string'?clean(x):'';
  function buildModel(trip,records,parkData,refs,timeline,itinerary){
    if(!trip||typeof trip!=='object'||!Array.isArray(trip.parks))throw Error('Trip data is invalid');
    const bySlug=new Map(records.map(p=>[p.slug,p]));
    const full=new Map(list(parkData).map(p=>[p.slug,p]));
    const stops=trip.parks.map(slug=>{
      const p=bySlug.get(slug)||full.get(slug);
      return {slug,park:p||{slug,name:slug},meta:trip.stopMeta?.[slug]||{},ref:refs?.[slug]||{}};
    });
    const rows=[];let conflictCount=0;let dated=false;let nights=0;
    const calendar=timeline?.schedule?.(JSON.parse(JSON.stringify(trip)))||null;
    if(calendar?.rows?.length){
      dated=true;nights=calendar.nights?.length||0;
      const routeRows=timeline.routes?.(trip,parkData,refs)||[];
      for(let i=0;i<calendar.rows.length;i++){
        const row=calendar.rows[i],n=row.night;
        const visitSlugs=row.visits.map(x=>x.slug);
        let overnight='';let conflict=false;
        if(n?.type==='park'){
          const meta=trip.stopMeta?.[n.slug]||{};
          overnight=shortPark(nameOf(n.slug,bySlug));
          const place=siteOf(meta);
          if(place)overnight+=' / '+place;
        }else if(n?.type==='other')overnight=clean(n.label)||'Other accommodation';
        else if(n?.type==='conflict'){
          conflict=true;conflictCount++;
          overnight='CONFLICT - select one overnight base';
        }else overnight=n?'Not assigned':(trip.endLocation?'Trip ends':'Final day');
        rows.push({label:String(i+1).padStart(2,'0'),date:row.date,
          visits:visitSlugs.map(x=>nameOf(x,bySlug)),overnight,conflict,
          route:validUrl(routeRows[i]?.url)||'',
          transfer:visitSlugs.some(slug=>calendar.blocks.some(block=>block.slug===slug&&block.start===row.date))||i===calendar.rows.length-1});
      }
    }else{
      // A trip without valid dates still exports honestly using its legacy day groups.
      const built=itinerary?.build?.(trip,parkData,refs);
      for(const d of built?.days||[]){
        rows.push({label:d.key==='Unassigned'?'--':String(d.key).padStart(2,'0'),date:d.date||'',
          visits:d.stops.map(s=>s.park.name),overnight:d.key==='Unassigned'?'Unassigned':(d.overnight||'Not assigned'),
          route:validUrl(d.routeUrl)||'',transfer:!!d.stops.length,conflict:false});
      }
      nights=Math.max(0,(built?.plannedDays||0)-1);
    }
    const unscheduled=dated?stops.filter(s=>!calendar.blocks.some(b=>b.slug===s.slug&&b.start&&b.end)):[];
    // Reference pages follow first visit, not the original trip collection order.
    // Unscheduled visits follow scheduled ones. Equal dates retain original order.
    const referenceOrder=stops.slice().sort((a,b)=>{
      if(dated){
        const first=s=>calendar.blocks.find(x=>x.slug===s.slug)?.start||'';
        const aDate=first(a),bDate=first(b);
        if(aDate&&bDate)return aDate.localeCompare(bDate);
        return aDate?-1:bDate?1:0;
      }
      const order=s=>Number(s.meta?.day)>0?Number(s.meta.day):Infinity;
      return order(a)-order(b);
    });
    return {trip,bySlug,stops:referenceOrder,rows,calendar,dated,conflictCount,nights,unscheduled,dates:dated?
      [calendar.start,calendar.end]:[trip.startDate||trip.date||'',trip.endDate||'']};
  }
  const color=(d,method,rgb)=>d[method](...rgb);
  class PrintBook {
    constructor(JsPDF,paper,title){
      this.d=new JsPDF({unit:'mm',format:paper==='LETTER'?'letter':'a4',compress:true});
      this.w=this.d.internal.pageSize.getWidth();this.h=this.d.internal.pageSize.getHeight();
      this.L=15;this.R=this.w-15;this.W=this.R-this.L;this.top=26;this.last=this.h-18;
      this.y=this.top;this.title=clean(title);this.page=1;this.header();
    }
    font(size=10,bold=false,rgb=COLORS.ink){this.d.setFont('helvetica',bold?'bold':'normal');this.d.setFontSize(size);color(this.d,'setTextColor',rgb)}
    header(){
      this.font(8,true,COLORS.green);this.d.text('ATLAS  /  MINNESOTA & WISCONSIN STATE PARKS',this.L,11);
      this.font(7,false,COLORS.muted);this.d.text('TRIP REFERENCE',this.R,11,{align:'right'});
      color(this.d,'setDrawColor',COLORS.rule);this.d.setLineWidth(.3);this.d.line(this.L,15,this.R,15);
    }
    pageBreak(){this.d.addPage();this.page++;this.y=this.top;this.header()}
    ensure(h){if(this.y+h>this.last)this.pageBreak()}
    split(s,w,size=9.8,bold=false){this.font(size,bold);return this.d.splitTextToSize(clean(s),w)}
    textLines(s,{x=this.L,w=this.W,size=9.6,leading=4.7,bold=false,rgb=COLORS.ink,after=0}={}){
      if(!clean(s))return;
      const lines=this.split(s,w,size,bold);
      this.font(size,bold,rgb);
      for(const line of lines){this.ensure(leading);this.d.text(line,x,this.y);this.y+=leading}
      this.y+=after;
    }
    label(s){this.ensure(10);this.font(8.4,true,COLORS.green);this.d.text(clean(s).toUpperCase(),this.L,this.y);this.y+=7}
    rule(pad=1){this.ensure(4+pad);this.y+=pad;color(this.d,'setDrawColor',COLORS.rule);this.d.line(this.L,this.y,this.R,this.y);this.y+=3.2}
    link(s,url,x=this.L){if(!validUrl(url))return;this.ensure(5.2);this.font(8.2,true,COLORS.green);this.d.textWithLink(clean(s),x,this.y,{url});this.y+=5}
    field(s,v){if(!note(v))return;this.ensure(11);this.font(7.7,true,COLORS.muted);this.d.text(clean(s).toUpperCase(),this.L,this.y);this.y+=4.2;this.textLines(v,{size:9.7,leading:4.7,after:2})}
    footer(){const total=this.d.getNumberOfPages();for(let i=1;i<=total;i++){
      this.d.setPage(i);color(this.d,'setDrawColor',COLORS.rule);this.d.line(this.L,this.h-13,this.R,this.h-13);
      this.font(7.6,false,COLORS.muted);this.d.text(this.title.slice(0,65),this.L,this.h-8.5);
      this.d.text(`${i} / ${total}`,this.R,this.h-8.5,{align:'right'});
    }}
  }
  function topPage(b,model,mode){
    const trip=model.trip;
    b.ensure(45);b.font(19.5,true,COLORS.ink);
    const name=b.split(trip.name||'Untitled trip',b.W,19.5,true);
    b.d.text(name,b.L,b.y);b.y+=name.length*8.1+3;
    const dates=model.dates.map(x=>dayFmt(x)).filter(Boolean);
    if(dates.length)b.textLines(dates.join('  -  '),{size:10.2,leading:5.4,rgb:COLORS.muted,after:5});
    const start=note(trip.startLocation),end=note(trip.endLocation);
    if(start||end){b.textLines([start?'START  '+start:'',end?'FINISH  '+end:''].filter(Boolean).join('      |      '),{size:9.5,leading:5,after:5})}
    b.rule(1);
    const stats=[`${model.stops.length} PARKS`,`${model.rows.length} DAYS`,`${model.nights} TRIP NIGHTS`];
    if(model.conflictCount)stats.push(`${model.conflictCount} CONFLICT${model.conflictCount===1?'':'S'}`);
    b.ensure(13);const stride=b.W/stats.length;
    stats.forEach((s,i)=>{b.font(10,true,i===3?COLORS.amber:COLORS.ink);b.d.text(s,b.L+i*stride,b.y)});b.y+=9;
    b.rule(1);b.label('Daily itinerary');
    if(!model.rows.length){b.textLines('No itinerary has been scheduled.',{size:10.5});return}
    function colHead(){
      b.ensure(10);b.font(7.5,true,COLORS.muted);
      b.d.text('DATE / VISITS',b.L,b.y);
      b.d.text('OVERNIGHT',b.L+b.W*.63,b.y);b.y+=5;
      color(b.d,'setDrawColor',COLORS.rule);b.d.line(b.L,b.y,b.R,b.y);b.y+=4;
    }
    colHead();
    const x2=b.L+b.W*.63,col1=b.W*.59,col2=b.W*.35;
    for(const row of model.rows){
      const names=row.visits.length?row.visits.map(shortPark).join('  /  '):'No park visit scheduled';
      const date=row.date?dayFmt(row.date,true):'';
      const left=b.split(names,col1,9.5,true);
      const right=b.split(row.overnight,col2,9.1,row.conflict);
      const count=Math.max(left.length,right.length);
      const rowH=10+count*4.6+(row.route&&row.transfer?6:0)+3;
      if(b.y+rowH>b.last){b.pageBreak();b.label('Daily itinerary (continued)');colHead()}
      b.font(8.4,true,COLORS.green);b.d.text(row.label,b.L,b.y);
      b.font(8.7,false,COLORS.muted);b.d.text(date,b.L+13,b.y);
      b.y+=5.4;
      const y0=b.y;
      b.font(9.5,true,COLORS.ink);b.d.text(left,b.L,y0);
      b.font(9.1,row.conflict,row.conflict?COLORS.amber:COLORS.ink);b.d.text(right,x2,y0);
      b.y+=count*4.6;
      if(row.route&&row.transfer)b.link('Driving directions',row.route,b.L);
      b.y+=2;
      color(b.d,'setDrawColor',COLORS.rule);b.d.setLineWidth(.15);b.d.line(b.L,b.y,b.R,b.y);b.y+=4;
    }
    if(model.unscheduled.length){
      b.ensure(20);b.y+=3;b.font(8.8,true,COLORS.amber);b.d.text('UNSCHEDULED PARKS',b.L,b.y);b.y+=5;
      b.textLines(model.unscheduled.map(s=>s.park.name).join(', '),{size:9.5,leading:4.8});
    }
    if(model.conflictCount){
      b.ensure(16);b.y+=3;b.font(8.8,true,COLORS.amber);b.d.text('PLANNING ATTENTION',b.L,b.y);b.y+=5;
      b.textLines(`Resolve ${model.conflictCount} overnight conflict${model.conflictCount>1?'s':''} in Atlas before departing. No campsite has been selected for those nights.`,{size:9.4,leading:4.7});
    }
    if(mode==='compact'&&trip.notes){b.ensure(18);b.y+=4;b.field('Trip notes',trip.notes)}
  }
  function parkReference(b,s,model,mode,nightCount){
    const {park:p,meta:m,ref:r,slug}=s;
    const title=note(p.name||slug);const address=note(r.address||p.address);
    const camp=siteOf(m),booking=note(m.reservation),review=note(p.review);
    const personal=note(m.note||m.notes);
    // Keep the park name with its first meaningful data block.
    b.ensure(38);b.rule(3);
    b.font(13.3,true,COLORS.ink);const head=b.split(title,b.W,13.3,true);
    b.d.text(head,b.L,b.y);b.y+=head.length*6.2+3;
    if(address)b.textLines(address,{size:9.6,leading:4.8,after:3});
    const first=[];
    if(camp)first.push('SITE  '+camp);
    else if(m.camping)first.push('CAMPING PLANNED; SITE NOT ENTERED');
    if(nightCount>0)first.push(`${nightCount} NIGHT${nightCount===1?'':'S'} IN TIMELINE`);
    if(first.length)b.textLines(first.join('     |     '),{size:9.4,bold:true,leading:4.8,after:3});
    if(booking)b.field('Reservation',booking);
    const dossier=m.dossierV1&&typeof m.dossierV1==='object'?m.dossierV1:{};
    if(dossier.bookingStatus&&dossier.bookingStatus!=='not-booked')
      b.field('Booking status',({confirmed:'Confirmed (self-reported)',pending:'Awaiting confirmation','first-come':'First-come / no booking',cancelled:'Cancelled'})[dossier.bookingStatus]||'Not recorded');
    for(const [label,key] of [['Arrival instructions','arrivalInstructions'],['Parking / access','parkingNotes'],
      ['Water','waterNotes'],['Facilities','facilitiesNotes'],['Other stay notes','personalNotes']]){
      if(dossier[key])b.field(label,dossier[key]);
    }
    if(dossier.contactNotes)b.field('Contacts and booking notes',dossier.contactNotes);
    if(dossier.bookingUrl&&validUrl(dossier.bookingUrl))b.field('Saved booking link',dossier.bookingUrl);
    const checklist=dossier.checklist&&typeof dossier.checklist==='object'&&!Array.isArray(dossier.checklist)?dossier.checklist:{};
    const preparations=[['reservationChecked','Reservation or arrival policy reviewed'],['arrivalChecked','Arrival details and check-in reviewed'],['accessChecked','Access, parking and conditions checked'],['suppliesPacked','Camping supplies prepared'],['departurePlanned','Checkout and departure planned']];
    const completed=preparations.filter(([key])=>checklist[key]===true);
    if(completed.length)b.field('Preparation checked',completed.map(([,label])=>label).join(' | '));
    const dates=[note(m.checkIn),note(m.checkOut)].filter(Boolean);
    if(dates.length)b.field('Check-in / check-out',`${note(m.checkIn)||'Not entered'} / ${note(m.checkOut)||'Not entered'}`);
    if(personal)b.field('Your park notes',personal);
    if(mode!=='compact'){
      // Original review: verbatim apart from portable PDF character normalization.
      if(review)b.field('Your original review',review);
      else if(note(p.cons)||note(p.criticalFactors))b.field('Practical considerations',[p.cons,p.criticalFactors].map(note).filter(Boolean).join(' | '));
    }else if(note(p.criticalFactors))b.field('Watch out for',p.criticalFactors);
    const official=validUrl(r.officialUrl||r.sourceUrl),map=validUrl(r.mapUrl);
    const directions=validUrl(r.directionsUrl)||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.name,p.city,p.state].filter(Boolean).join(', '));
    b.ensure(8);let x=b.L;
    for(const [label,url] of [['PARK MAP',map],['DIRECTIONS',directions],['OFFICIAL PARK INFO',official]]){
      if(!url)continue;b.font(8.1,true,COLORS.green);b.d.textWithLink(label,x,b.y,{url});x+=label.length*1.85+9;
    }
    b.y+=6;
  }
  function referencePage(b,model,mode){
    // Start the reference section on a new sheet for handout clarity.
    b.pageBreak();b.ensure(35);
    b.font(17.5,true,COLORS.ink);b.d.text('Parks & practical reference',b.L,b.y);b.y+=9;
    b.textLines('Addresses, sites, reservations and original notes from this trip.',{size:9.4,rgb:COLORS.muted,leading:4.8,after:3});
    // Count resolved overnight bases, not visit days or unverified bookings.
    const count={};
    for(const row of model.calendar?.rows||[]){
      if(row.night?.type==='park')count[row.night.slug]=(count[row.night.slug]||0)+1;
    }
    for(const stop of model.stops)parkReference(b,stop,model,mode,count[stop.slug]||0);
    const trip=model.trip;
    const fields=[['Emergency / reference contact',trip.emergencyContact],['Lodging notes',trip.lodgingNotes],['Fuel / food / resupply',trip.resupplyNotes]];
    if(fields.some(([_,v])=>note(v))){b.ensure(19);b.rule(5);b.label('Trip essentials');for(const [label,value]of fields)b.field(label,value)}
    b.ensure(23);b.rule(4);b.label('Before departure');
    for(const item of ['Confirm reservations and campsites','Check park closures and trail conditions',
      'Download offline maps','Check weather and water availability','Verify campground services','Save booking confirmations offline']){
      b.ensure(6);color(b.d,'setDrawColor',COLORS.muted);b.d.rect(b.L,b.y-3,2.7,2.7);
      b.font(9.2,false,COLORS.ink);b.d.text(item,b.L+5,b.y);b.y+=6;
    }
    if(mode!=='compact'&&trip.notes){b.rule(3);b.field('Trip-wide notes',trip.notes)}
  }
  async function loadLib(){
    if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
    if(!window.__AtlasPrintLibrary){window.__AtlasPrintLibrary=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(Error('PDF library unavailable'));
      s.onerror=()=>reject(Error('Could not load the PDF library'));document.head.append(s);
    });}
    return window.__AtlasPrintLibrary;
  }
  async function generate(trip,JsPDF,paper,mode,source){
    const {records,parkData,refs,timeline,itinerary}=source;
    if(!Array.isArray(records)||records.length!==116)throw Error('Complete park reference index unavailable');
    const model=buildModel(trip,records,parkData,refs,timeline,itinerary);
    const b=new PrintBook(JsPDF,paper,trip.name||'Trip');
    topPage(b,model,mode);referencePage(b,model,mode);b.footer();
    return b.d;
  }
  let busy=false;
  async function download(){
    if(busy)return;busy=true;
    const button=document.getElementById('printTripBtn');
    const hint=document.getElementById('bookletExportHint');
    const initial=button?.textContent||'Download PDF';
    if(button){button.disabled=true;button.textContent='Preparing reference PDF...'}
    if(hint)hint.textContent='Creating printer-friendly searchable PDF...';
    try{
      // Save open editors before reading. Do not modify cloud data or browser account mapping.
      try{window.TripDayEditor?.persist?.(false)}catch(e){console.warn('Atlas day save:',e)}
      const save=document.getElementById('saveTripDetailsBtn');if(save)save.click();
      await new Promise(r=>setTimeout(r,160));
      const trip=current();if(!trip)throw Error('Trip is not available in this signed-in browser');
      const [response,JsPDF]=await Promise.all([fetch('/cloudflare-parks.json',{cache:'no-store'}),loadLib()]);
      if(!response.ok)throw Error('Park reference data unavailable');
      const records=await response.json();
      const parkData=JSON.parse(document.getElementById('parksData')?.textContent||'[]');
      const refs=window.PARK_REFERENCES||window.PARK_DETAILS||{};
      const paper=document.getElementById('bookletPaper')?.value==='LETTER'?'LETTER':'A4';
      const mode=document.getElementById('bookletExportMode')?.value==='compact'?'compact':'detailed';
      const pdf=await generate(trip,JsPDF,paper,mode,{records,parkData,refs,timeline:window.AtlasTripTimelineModel,itinerary:window.TripItinerary});
      pdf.save(fileName(trip.name)+(mode==='compact'?'-compact-reference':'-trip-reference')+'.pdf');
      if(hint)hint.textContent='Trip reference PDF downloaded.';
    }catch(err){console.error('Atlas trip reference export',err);if(hint)hint.textContent='PDF not generated: '+err.message;alert(err.message)}
    finally{busy=false;if(button){button.disabled=false;button.textContent=initial==='Preparing reference PDF...'?'Download PDF':initial}}
  }
  // This script is executed before the legacy native exporter, so one and only
  // one click handler owns the Download PDF control. Legacy remains a rollback asset.
  document.addEventListener('click',ev=>{
    const button=document.getElementById('printTripBtn');
    if(!button||!(button===ev.target||button.contains?.(ev.target)))return;
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();download();
  },true);
  window.AtlasTripReference=Object.freeze({buildModel,generate,version:'2.0.0-print-reference'});
})();
