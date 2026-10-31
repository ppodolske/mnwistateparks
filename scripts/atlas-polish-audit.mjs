import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const dir=import.meta.dirname;
const read=name=>readFileSync(resolve(dir,name),'utf8');
function reference(){
 const ctx={window:{},localStorage:{getItem:()=>null},console,document:{querySelector:()=>({dataset:{tripId:'test'}}),addEventListener(){}},setTimeout,clearTimeout};
 vm.runInNewContext(read('atlas-print-reference.js'),ctx);
 return ctx.window.AtlasTripReference;
}
function sample(){
 const slugs=['rice','afton','crosby'];
 const parks=slugs.map(slug=>({slug,name:slug+' State Park'}));
 const trip={id:'test',name:'Trip',parks:['rice','crosby','afton'],startDate:'2026-10-31',endDate:'2026-11-07',stopMeta:{},timelineV1:{version:1}};
 const blocks=[{slug:'rice',start:'2026-11-02',end:'2026-11-04'},
  {slug:'afton',start:'2026-10-31',end:'2026-11-02'},
  {slug:'crosby',start:'2026-11-04',end:'2026-11-07'}];
 const rows=Array.from({length:8},(_,i)=>({date:new Date(Date.UTC(2026,9,31+i)).toISOString().slice(0,10),visits:[],night:null}));
 const timeline={schedule:()=>({start:'2026-10-31',end:'2026-11-07',nights:rows.slice(0,-1),blocks,rows}),routes:()=>[]};
 return {trip,parks,timeline};
}
test('reference follows first visit; itinerary and underlying trip order do not change',()=>{
 const {trip,parks,timeline}=sample();
 const model=reference().buildModel(trip,parks,parks,{},timeline,null);
 assert.deepEqual(Array.from(model.stops,x=>x.slug),['afton','rice','crosby']);
 assert.deepEqual(Array.from(trip.parks),['rice','crosby','afton']);
 assert.equal(model.rows.length,8);
});
test('unscheduled references come last, preserving original relative order',()=>{
 const {trip,parks,timeline}=sample();
 timeline.schedule=()=>{const base=sample().timeline.schedule();base.blocks[0].start='';base.blocks[2].start='';return base};
 const model=reference().buildModel(trip,parks,parks,{},timeline,null);
 assert.deepEqual(Array.from(model.stops,x=>x.slug),['afton','rice','crosby']);
});
test('legacy references sort by assigned day without mutating trip stops',()=>{
 const {trip,parks}=sample();delete trip.timelineV1;
 trip.stopMeta={rice:{day:'3'},afton:{day:'1'},crosby:{day:''}};
 const itinerary={build:()=>({days:[],plannedDays:4})};
 const model=reference().buildModel(trip,parks,parks,{},null,itinerary);
 assert.deepEqual(Array.from(model.stops,x=>x.slug),['afton','rice','crosby']);
 assert.deepEqual(Array.from(trip.parks),['rice','crosby','afton']);
});
class Node{
 constructor(tag,cls='',txt=''){this.tag=tag;this.className=cls;this.textContent=txt;this.children=[];this.events={};this.parent=null;this.open=false;}
 append(...nodes){for(const n of nodes){if(n.parent)n.parent.children=n.parent.children.filter(c=>c!==n);n.parent=this;this.children.push(n)}}
 before(node){if(!this.parent)throw Error('orphan');node.parent=this.parent;const i=this.parent.children.indexOf(this);this.parent.children.splice(i,0,node)}
 querySelector(tag){if(tag==='h3')return this.children.find(c=>c.tag==='h3')||null;return null;}
 querySelectorAll(){return this.children.filter(c=>c.tag==='section'&&c.className==='aa-section')}
 addEventListener(event,cb){this.events[event]=cb}
}
function grouping(){
 const src=read('atlas-account-ui.mjs');const start=src.indexOf('function foldPanel('),end=src.indexOf('function render(){');
 assert.ok(start>0&&end>start);
 const snippet=src.slice(start,end);
 const ctx={window:{AtlasSavedSync:{status:()=>({conflict:''})}},Map, Object, create:(tag,cls,txt)=>new Node(tag,cls,txt),openGroups:Object.create(null)};
 vm.createContext(ctx);vm.runInContext(snippet+'\nthis.foldPanel=foldPanel;',ctx);return ctx;
}
function section(heading){const n=new Node('section','aa-section');n.append(new Node('h3','',heading));return n}
test('account fold moves—not copies—sharing and sync controls, leaving trips visible',()=>{
 const ctx=grouping(),panel=new Node('aside');const a=section('Cloud trips · 1'),b=section('Share a cloud trip'),c=section('Trip synchronisation'),d=section('Manage trip access'),e=section('Trip invitation');panel.append(a,b,c,d,e);
 ctx.foldPanel(panel,{pending:[],conflicts:0,vault:{}});
 assert.equal(panel.children.includes(a),true);assert.equal(panel.children.includes(e),true);
 const sharing=panel.children.find(x=>x.tag==='details'&&x.children[0]?.textContent==='Sharing');
 assert.ok(sharing);assert.equal(sharing.children.includes(b),true);assert.equal(sharing.children.includes(d),true);
 assert.equal(sharing.open,false);
 const sync=panel.children.find(x=>x.tag==='details'&&x.children[0]?.textContent==='Synchronisation');
 assert.ok(sync);assert.equal(sync.children.includes(c),true);assert.equal(sync.open,false);
});
test('conflict and recovery groups open automatically and expansion survives re-render',()=>{
 const ctx=grouping();const p=new Node('aside');p.append(section('Trip synchronisation'),section('Preserved browser trips & parks'));
 ctx.foldPanel(p,{pending:[],conflicts:1,vault:{legacyAvailable:true}});
 const sync=p.children.find(x=>x.tag==='details'&&x.children[0].textContent==='Synchronisation');
 const data=p.children.find(x=>x.tag==='details'&&x.children[0].textContent==='Data & recovery');
 assert.equal(sync.open,true);assert.equal(data.open,true);
 sync.children[0].events.click();sync.open=false;
 const another=new Node('aside');another.append(section('Trip synchronisation'));
 ctx.foldPanel(another,{pending:[],conflicts:1,vault:{}});
 assert.equal(another.children[0].open,false);
});
test('admin chart is compact and monthly counts remain unmodified',()=>{
 const code=read('atlas-admin.mjs'),css=read('atlas-admin.css');
 assert.match(code,/monthly\.get\(m\.key\)/);assert.match(code,/recentTotal/);
 assert.match(code,/Math\.round\(35\*value\/max\)/);
 assert.match(css,/height:65px/);assert.match(css,/max-width:760px/);
 assert.doesNotMatch(code,/148\*value\/max/);
});
