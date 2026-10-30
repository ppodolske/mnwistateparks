'use strict';
// Test the actual downloadable PDF module with a strict jsPDF command recorder.
// All fixtures are fictional/local; no browser, CDN, user data or paid services.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('scripts/trip-pdf-native.js','utf8');
class RecordedPDF {
  constructor({format}={}){this.pages=[[]];this.current=0;this.links=[];this.overflow=[];this.internal={pageSize:{getWidth:()=>format==='letter'?215.9:210,getHeight:()=>format==='letter'?279.4:297}};}
  addPage(){this.pages.push([]);this.current=this.pages.length-1;}
  getNumberOfPages(){return this.pages.length;}
  setPage(n){this.current=n-1;}
  setFont(){}setFontSize(){}setTextColor(){}setFillColor(){}setDrawColor(){}setLineWidth(){}setLineDashPattern(){}
  rect(){}roundedRect(){}line(){}circle(){}
  splitTextToSize(s,max){const words=String(s).split(/\s+/),out=[];let cur='';for(const w of words){if((cur+' '+w).length>Math.floor(max/2.0)&&cur){out.push(cur);cur=w;}else cur=cur?cur+' '+w:w;}if(cur)out.push(cur);return out;}
  text(value,x,y){this.pages[this.current].push(Array.isArray(value)?value.join(' '):String(value)); if(y>this.internal.pageSize.getHeight()+0.1)this.overflow.push({value,y});}
  textWithLink(value,x,y,opt){this.text(value,x,y);this.links.push(opt.url);}
  save(){}
}
const parks=[
{slug:'rice-lake',name:'Rice Lake State Park',city:'Owatonna',state:'MN',idealTrip:'On the way',rating:2.5,review:'A quiet little park with easy trails and a lake. Campground is small and simple. Good stop if you are already in the area.',pros:'Trails, lake',cons:'Limited options',criticalFactors:'Convenience',experience:['Lakes'],practical:[]},
{slug:'afton',name:'Afton State Park',city:'Hastings',state:'MN',idealTrip:'Day trip',rating:4,review:'A nice state park for a day trip from the Twin Cities. The beach is great for hammocking but beware the bluff.',pros:'Beach, hammocking, river',cons:'Overcrowding, bugs, bluff',criticalFactors:'Steep bluff',experience:['Rivers','Beaches','Hammocking'],practical:['Bugs','Busy / crowded','Hilly / steep']},
{slug:'george-h-crosby-manitou',name:'George H. Crosby Manitou State Park',city:'Silver Bay',state:'MN',idealTrip:'Day trip',rating:4.5,review:'Very remote park. Watch your water levels. The only water is in the parking lot. Park has only remote campsites. Trails are extremely rugged.',pros:'Scenic, cascades, river, challenging trails',cons:'All trails challenging, limited water, no cell coverage',criticalFactors:'Remote hiking with limited water',experience:['Rivers','Scenic views'],practical:['Limited cell coverage','Limited water']}
];
const records=[...parks];while(records.length<116)records.push({slug:'dummy-'+records.length,name:'Unselected Park',city:'',state:'WI',rating:0,review:'',experience:[],practical:[]});
const coords={parks:{'rice-lake':{lat:44.08,lng:-93.17},afton:{lat:44.86,lng:-92.79},'george-h-crosby-manitou':{lat:47.53,lng:-91.11}}};
const refs=Object.fromEntries(parks.map(p=>[p.slug,{
  address:p.slug==='afton'?'6959 Peller Avenue South, Hastings, MN 55033':`${p.city}, MN`,
  directionsUrl:`https://www.google.com/maps/search/?api=1&query=${p.slug}`,
  mapUrl:`https://www.dnr.state.mn.us/maps/${p.slug}.pdf`,
  officialUrl:`https://www.dnr.state.mn.us/state_parks/${p.slug}.html`,
  agencyLabel:'Minnesota DNR'
}]));
const trip={id:'test',name:'TEST',date:'2026-10-31',startLocation:'Minneapolis',endLocation:'Duluth',
  emergencyContact:'Emergency reference 555-0100',lodgingNotes:'Hotel in Duluth; confirm arrival',resupplyNotes:'Fuel in Two Harbors',notes:'Bring rain jacket',
  parks:parks.map(p=>p.slug),stopMeta:{
    'rice-lake':{day:'1',note:'Morning trail and beach',camping:false},
    afton:{day:'1',camping:true,campground:'Afton Campground',loop:'West Loop',campsite:'Site 12',reservation:'ABC123',checkIn:'3 PM',checkOut:'11 AM'},
    'george-h-crosby-manitou':{day:'2',note:'Carry extra drinking water'}
  }};
const stops=trip.parks.map((slug,i)=>({slug,index:i,park:parks[i],meta:trip.stopMeta[slug]}));
const groups=[
  {key:'1',label:'Day 1',date:'2026-10-31',start:'Minneapolis',overnight:'Afton Campground',routeAvailable:true,routeUrl:'https://www.google.com/maps/dir/?api=1&origin=Minneapolis',stops:stops.slice(0,2)},
  {key:'2',label:'Day 2',date:'2026-11-01',start:'Afton Campground',overnight:'Duluth',routeAvailable:false,routeMessage:'Route start incomplete',stops:stops.slice(2)}
];
const context={
 console,
 window:{TripItinerary:{build:()=>({days:groups,assignedDays:2,stateCount:1,startDate:trip.date,endDate:'2026-11-01'}),orderedStops:()=>stops},PARK_REFERENCES:refs,PARK_DETAILS:refs},
 document:{querySelector:s=>s==='[data-page="trip"]'?{dataset:{tripId:'test'}}:null,addEventListener:()=>{},getElementById:s=>s==='parksData'?{textContent:JSON.stringify(parks)}:null},
 localStorage:{getItem:()=>JSON.stringify([trip])},fetch:async url=>({ok:true,json:async()=>url.includes('coordinates')?coords:records}),
 CustomEvent:class{},setTimeout,
};
vm.runInNewContext(source,context,{filename:'trip-pdf-native.js'});
(async()=>{
 for(const paper of ['A4','LETTER'])for(const mode of ['booklet','compact']){
   const pdf=await context.window.TripPDFNative.generate(trip,RecordedPDF,paper,mode);
   const all=pdf.pages.flat().join('\n');
   const must=['TEST','Rice Lake','Afton','George H. Crosby Manitou','LOGISTICS & PARK REFERENCE','GEOGRAPHIC STOP OVERVIEW',
     'Emergency reference 555-0100','Hotel in Duluth','Fuel in Two Harbors','Check current weather and trail conditions','Fuel / resupply before remote stretches','Pack booking confirmations',
     'Day 1','Day 2','ABC123','Afton Campground','In 3 PM'];
   for(const phrase of must)assert(all.toLowerCase().includes(phrase.toLowerCase()),`${paper} ${mode}: missing ${phrase}`);
   assert(!all.includes('STOP ORDER MAP'),`${paper} ${mode}: schematic placeholder retained`);
   assert(pdf.links.some(l=>l.includes('google.com/maps')),`${paper} ${mode}: directions URL missing`);
   assert(pdf.pages.length>=2&&pdf.pages.length<=12,`${paper} ${mode}: abnormal ${pdf.pages.length}-page synthetic layout`);
   assert(pdf.overflow.length===0,`${paper} ${mode}: text outside page`);
   if(mode==='booklet'){
     const full=['What to expect','Very remote park','Experiences','Practical considerations','Limited cell coverage',
       'Pros','Cons / watch out for','Critical factors','Notes after visit','Would return','Favorite stop',
       'Day notes / changes / weather','Official park map','Minnesota DNR','Ideal trip legend','Pine rating',
       'Favorite park','Best campsite / overnight','Biggest surprise','Park to revisit','Best moment',
       'What I would change next time','General trip notes / memories / recommendations'];
     for(const phrase of full)assert(all.toLowerCase().includes(phrase.toLowerCase()),`${paper}: detailed booklet lost ${phrase}`);
     assert(pdf.links.filter(l=>l.includes('dnr.state.mn.us')).length>=6,'DNR and park map reference links missing');
   }else{
     assert(!all.includes('Trip notes and highlights'),'Compact incorrectly includes journal');
     assert(!all.includes('Very remote park'),'Compact must remain concise');
   }
   console.log(`PASS ${paper} ${mode}: ${pdf.pages.length} simulated pages; ${pdf.links.length} active links; field-parity audit passed`);
 }
  // The user's original three-park TEST trip had no assigned days or logistics.
  // Ensure a sparse trip still keeps all three reviews, tags, notes and links.
  trip.startLocation='';trip.endLocation='';trip.emergencyContact='';
  trip.lodgingNotes='';trip.resupplyNotes='';trip.notes='';trip.stopMeta={};
  for(const stop of stops)stop.meta={};
  groups.splice(0,groups.length,{key:'Unassigned',label:'Unassigned stops',date:'',start:'',overnight:'',routeAvailable:false,stops});
  context.window.TripItinerary.build=()=>({days:groups,assignedDays:0,stateCount:1,startDate:trip.date,endDate:''});
  for(const mode of ['booklet','compact']){
    const pdf=await context.window.TripPDFNative.generate(trip,RecordedPDF,'A4',mode);
    const all=pdf.pages.flat().join('\n');
    for(const title of ['Rice Lake State Park','Afton State Park','George H. Crosby Manitou State Park','Unassigned stops'])
      assert(all.includes(title),`Sparse trip ${mode}: missing ${title}`);
    if(mode==='booklet')for(const needed of ['Notes after visit','Park to revisit','Practical considerations','Ideal trip legend','Park quick reference'])
      assert(all.toLowerCase().includes(needed.toLowerCase()),`Sparse detailed: missing ${needed}`);
    console.log(`PASS sparse-trip ${mode}: ${pdf.pages.length} simulated pages, no missing park sections`);
  }
})().catch(err=>{console.error(err);process.exitCode=1});
