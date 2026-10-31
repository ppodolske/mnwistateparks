import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('./atlas-print-reference.js',import.meta.url),'utf8');
const page={dataset:{tripId:'trip-1'}};
const win={};
const listeners={};
const localStorage={getItem:()=>null};
const document={querySelector:s=>s==='[data-page="trip"]'?page:null,
  addEventListener:(n,f)=>listeners[n]=f,getElementById:()=>null};
vm.runInNewContext(src,{window:win,document,localStorage,console,Date,JSON,Set,Array,Map,Number,Promise,encodeURIComponent,setTimeout,alert:()=>{}});
assert.ok(win.AtlasTripReference);
class FakePDF{
 constructor(){this.pages=[[]];this.n=0;this.internal={pageSize:{getWidth:()=>210,getHeight:()=>297}};this.recorded=[];}
 setFont(){}setFontSize(){}setTextColor(){}setDrawColor(){}setLineWidth(){}setFillColor(){}
 line(){}rect(){}
 splitTextToSize(s,w){let max=Math.max(15,Math.floor(w/2.2));let result=[];for(const para of String(s).split('\n')){
   let part='';for(const word of para.split(/\s+/)){if(part.length+word.length+1>max&&part){result.push(part);part=word}else part+=(part?' ':'')+word;}
   result.push(part);
 }return result;
 }
 text(x,a,b){let value=Array.isArray(x)?x.join(' | '):x;const y=typeof b==='number'?b:0;
  if(y>282.5&&y<288)throw Error('Content violates footer space at y='+y);
  this.pages[this.n].push(value);this.recorded.push([value,y]);}
 textWithLink(s,x,y,o){assert.ok(o.url.startsWith('https://'));this.pages[this.n].push(s+' LINK');}
 addPage(){this.pages.push([]);this.n++}
 getNumberOfPages(){return this.pages.length}
 setPage(n){this.n=n-1}
 save(){}
}
const parks=[{slug:'afton',name:'Afton State Park',city:'Hastings',state:'MN',review:'Original review for Afton. A steep bluff and a riverside beach.',cons:'Steep bluff'},
 {slug:'rice-lake',name:'Rice Lake State Park',city:'Owatonna',state:'MN',review:'Original review for Rice Lake.',cons:'Limited facilities'},
 {slug:'crosby',name:'George H. Crosby Manitou State Park',city:'Finland',state:'MN',review:'Original review for Crosby. Remote trails and limited water.',cons:'Limited water'}];
const refs=Object.fromEntries(parks.map(p=>[p.slug,{address:p.name+', Minnesota',mapUrl:'https://maps.example/'+p.slug,
 officialUrl:'https://dnr.example/'+p.slug}]));
const trip={id:'trip-1',name:'Test Trip',parks:parks.map(p=>p.slug),startLocation:'Mequon, Wisconsin',endLocation:'Minneapolis, Minnesota',
 startDate:'2026-10-31',endDate:'2026-11-07',emergencyContact:'Phone 555-0100',
 stopMeta:{afton:{campground:'Backpack',campsite:'13',reservation:'REAL-1',camping:true},'rice-lake':{loop:'A',campsite:'12',camping:true},crosby:{campground:'Benson Lake',campsite:'20',camping:true}},
 timelineV1:{version:1,visits:{afton:{start:'2026-10-31',end:'2026-11-02'},'rice-lake':{start:'2026-11-02',end:'2026-11-05'},crosby:{start:'2026-11-04',end:'2026-11-07'}},nights:{}}};
const dates=['2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07'];
const visits=[['afton'],['afton'],['afton','rice-lake'],['rice-lake'],['rice-lake','crosby'],['rice-lake','crosby'],['crosby'],['crosby']];
const nights=['afton','afton','rice-lake','rice-lake','conflict','crosby','crosby',null];
const timeline={schedule:t=>({start:t.startDate,end:t.endDate,nights:dates.slice(0,-1),blocks:t.parks.map(slug=>({slug,...t.timelineV1.visits[slug]})),
 rows:dates.map((date,i)=>({date,visits:visits[i].map(slug=>({slug})),night:nights[i]?(nights[i]==='conflict'?{type:'conflict',candidates:['rice-lake','crosby']}:{type:'park',slug:nights[i]}):null}))}),
 routes:()=>dates.map((_,i)=>({url:i===0||i===2||i===4||i===7?'https://maps.example/drive/'+i:''}))};
const source={records:[...parks,...Array.from({length:113},(_,i)=>({slug:'other-'+i,name:'Other'}))],parkData:parks,refs,timeline,itinerary:null};
const {buildModel,generate}=win.AtlasTripReference;
test('Timeline is singular and preserves overlapping visits without converting conflict to a reservation',()=>{
 const m=buildModel(trip,source.records,parks,refs,timeline,null);
 assert.equal(m.rows.length,8);assert.equal(m.conflictCount,1);assert.equal(m.rows[4].conflict,true);
 assert.equal(m.rows[4].overnight,'CONFLICT - select one overnight base');
 assert.equal(m.rows[4].visits.length,2);
 assert.equal(m.nights,7);
});
test('Detailed reference uses entered reservation and original reviews, never demo data',async()=>{
 const pdf=await generate(trip,FakePDF,'A4','detailed',source);const flat=pdf.pages.flat().join('\n');
 assert.equal((flat.match(/DAILY ITINERARY/g)||[]).length,1);
 assert.equal((flat.match(/Afton State Park/g)||[]).length>=1,true);
 for(const s of ['REAL-1','Original review for Afton','Benson Lake','CONFLICT','Backpack / 13'])assert.ok(flat.includes(s),s);
 assert.ok(!/DEMO-AFT|SAMPLE BOOKING|ATLAS intelligence|Park intelligence/.test(flat));
 assert.ok(pdf.pages.length>=2);
});
test('Compact mode retains sites/reservation but skips long original review',async()=>{
 const pdf=await generate(trip,FakePDF,'LETTER','compact',source);const flat=pdf.pages.flat().join('\n');
 assert.ok(flat.includes('REAL-1'));
 assert.ok(!flat.includes('Original review for Afton'));
 assert.ok(flat.includes('Afton')&&flat.includes('Rice Lake'));
});
test('No-date trip falls back to existing day group model, not invented timeline dates',()=>{
 const t={id:'trip-1',name:'No dates',parks:['afton'],stopMeta:{afton:{day:'1'}}};
 const m=buildModel(t,source.records,parks,refs,{schedule:()=>null}, {build:()=>({days:[{key:'1',date:'',stops:[{park:parks[0]}],overnight:'',routeUrl:''}],plannedDays:1})});
 assert.equal(m.dated,false);assert.equal(m.rows.length,1);assert.equal(m.rows[0].date,'');
});
test('Long trips create additional pages without dropping itinerary dates',async()=>{
 const t={...trip,endDate:'2026-12-09'};
 const dt=Array.from({length:40},(_,i)=>new Date(Date.UTC(2026,9,31+i)).toISOString().slice(0,10));
 const ts={schedule:()=>({start:dt[0],end:dt.at(-1),nights:dt.slice(0,-1),blocks:[],rows:dt.map(date=>({date,visits:[{slug:'afton'}],night:{type:'park',slug:'afton'}}))}),routes:()=>[]};
 const pdf=await generate(t,FakePDF,'A4','compact',{...source,timeline:ts});
 assert.ok(pdf.pages.length>=3);
 assert.ok(pdf.pages.flat().join('\n').includes('DAILY ITINERARY (CONTINUED)'));
});
test('Output is read-only and click interception prevents duplicate exporter execution',()=>{
 assert.ok(!/method\s*:\s*['"](?:PUT|POST|DELETE)['"]/.test(src));
 assert.ok(!src.includes('DEMO-AFT-1026'));
 let prevented=0;
 listeners.click({target:{},preventDefault(){prevented++},stopPropagation(){},stopImmediatePropagation(){}});
 assert.equal(prevented,0);
});
