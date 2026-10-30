'use strict';
// Offline smoke test: exercise the real PDF module with a jsPDF method recorder.
// No CDN, browser, external requests or user data required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('scripts/trip-pdf-native.js','utf8');
class RecordedPDF {
  constructor(){this.pages=[[]];this.current=0;this.internal={pageSize:{getWidth:()=>210,getHeight:()=>297}};this.links=[];}
  addPage(){this.pages.push([]);this.current=this.pages.length-1;}
  getNumberOfPages(){return this.pages.length;}
  setPage(n){this.current=n-1;}
  setFont(){}setFontSize(){}setTextColor(){}setFillColor(){}setDrawColor(){}setLineWidth(){}setLineDashPattern(){}
  rect(){}roundedRect(){}line(){}circle(){}
  splitTextToSize(s,max){const words=String(s).split(/\s+/),out=[];let cur='';for(const w of words){if((cur+' '+w).length>Math.floor(max/2.0)&&cur){out.push(cur);cur=w;}else cur=cur?cur+' '+w:w;}if(cur)out.push(cur);return out;}
  text(value){this.pages[this.current].push(Array.isArray(value)?value.join(' '):String(value));}
  textWithLink(value,x,y,opt){this.text(value);this.links.push(opt.url);}
  save(){}
}
const records=[
{slug:'rice-lake',name:'Rice Lake State Park',city:'Owatonna',state:'MN',idealTrip:'On the way',rating:2.5,review:'A quiet little park with easy trails and a lake. Campground is small and simple. Good stop if you are already in the area.',pros:'Trails, lake',cons:'Limited options',criticalFactors:''},
{slug:'afton',name:'Afton State Park',city:'Hastings',state:'MN',idealTrip:'Day trip',rating:4,review:'A nice state park for a day trip from the Twin Cities. The park can get overcrowded in the summer. The beach is nice for hammocking, but beware of the bluff getting down to the river.',pros:'Beach, hammocking, river',cons:'Overcrowding, bugs, bluff',criticalFactors:'Steep bluff'},
{slug:'george-h-crosby-manitou',name:'George H. Crosby Manitou State Park',city:'Silver Bay',state:'MN',idealTrip:'Day trip',rating:4.5,review:'Very remote park. Watch your water levels. The only water is in the parking lot. Park has only remote campsites. Trails are extremely rugged but can be done in Chacos. The cascades are definitely worth the hike out there.',pros:'Scenic, cascades, river, challenging trails',cons:'All trails challenging, limited water, no cell coverage',criticalFactors:'Remote hiking with limited water'}
];
while(records.length<116)records.push({slug:'dummy-'+records.length,name:'Unselected Park',city:'',state:'WI',rating:0,review:''});
const trip={id:'test',name:'TEST',date:'2026-10-31',startLocation:'',endLocation:'',parks:records.slice(0,3).map(p=>p.slug),stopMeta:{}};
const stops=trip.parks.map((slug,i)=>({slug,index:i,park:records[i],meta:{}}));
const coords={parks:{'rice-lake':{lat:44.08,lng:-93.17},afton:{lat:44.86,lng:-92.79},'george-h-crosby-manitou':{lat:47.53,lng:-91.11}}};
const context={
  console,
  window:{TripItinerary:{build:()=>({days:[{label:'Unassigned stops',stops,date:'',key:'Unassigned'}],assignedDays:0,stateCount:1,startDate:trip.date,endDate:'',}),orderedStops:()=>stops},PARK_REFERENCES:{afton:{address:'6959 Peller Avenue South, Hastings, MN 55033',directionsUrl:'https://www.google.com/maps/search/?api=1&query=Afton'},'rice-lake':{address:'Owatonna, Minnesota'},'george-h-crosby-manitou':{address:'Finland, Minnesota'}},PARK_DETAILS:{}},
  document:{querySelector:s=>s==='[data-page="trip"]'?{dataset:{tripId:'test'}}:null,addEventListener:()=>{},getElementById:s=>s==='parksData'?{textContent:JSON.stringify(stops.map(s=>s.park))}:null},
  localStorage:{getItem:()=>JSON.stringify([trip])},
  fetch:async url=>({ok:true,json:async()=>url.includes('coordinates')?coords:records}),
  CustomEvent:class{},
  setTimeout,
};
vm.runInNewContext(source,context,{filename:'trip-pdf-native.js'});
(async()=>{
  for(const mode of ['booklet','compact']){
    const pdf=await context.window.TripPDFNative.generate(trip,RecordedPDF,'A4',mode);
    const raw=pdf.pages.flat().join(' | ');
    for(const phrase of ['TEST','Rice Lake','Afton','George H. Crosby Manitou','On-the-road reference','GEOGRAPHIC STOP OVERVIEW'])assert(raw.includes(phrase),`${mode}: missing ${phrase}`);
    assert(!raw.includes('STOP ORDER MAP'),`${mode}: fake map placeholder still present`);
    assert(pdf.links.some(x=>x.includes('google.com/maps')),`${mode}: missing active directions URL`);
    assert(pdf.pages.length>=1&&pdf.pages.length<=5,`${mode}: unexpected ${pdf.pages.length}-page synthetic layout`);
    if(mode==='booklet')assert(raw.includes('Very remote park'),`${mode}: canonical review omitted`);
    if(mode==='compact')assert(!raw.includes('Very remote park'),`${mode}: condensed mode should not include full prose`);
    console.log(`PASS: ${mode} has ${pdf.pages.length} simulated page(s), searchable text commands and ${pdf.links.length} live links.`);
  }
})().catch(err=>{console.error(err);process.exitCode=1});
