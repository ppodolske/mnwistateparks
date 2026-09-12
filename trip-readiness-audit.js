const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const Readiness=require('./trip-readiness.js');
const Itinerary=require('./trip-itinerary.js');
const parks=[
  {slug:'a',name:'Alpha',city:'A',state:'MN'},
  {slug:'b',name:'Beta',city:'B',state:'MN'},
  {slug:'c',name:'Gamma',city:'C',state:'WI'}
];
const details={a:{mapsQuery:'Alpha Park'},b:{mapsQuery:'Beta Park'},c:{mapsQuery:'Gamma Park'}};
const base={id:'qa',name:'QA',startDate:'2026-09-10',endDate:'2026-09-11',endDateMode:'auto',startLocation:'Home',endLocation:'Home',dayCount:2,parks:['a','b'],stopMeta:{a:{day:'1'},b:{day:'2'}}};
let q=Readiness.analyze(base,parks,details,Itinerary);
assert(q.ready,'Complete trip should be ready');assert(q.blockerCount===0,'Complete trip should have no blockers');
q=Readiness.analyze({...base,startLocation:''},parks,details,Itinerary);assert(q.blockers.some(x=>x.code==='missing-start'),'Missing start must block');
q=Readiness.analyze({...base,stopMeta:{a:{day:'1'},b:{day:''}}},parks,details,Itinerary);assert(q.blockers.some(x=>x.code==='unassigned'),'Unassigned parks must block');
q=Readiness.analyze({...base,dayCount:3},parks,details,Itinerary);assert(q.ready,'Empty day alone should not block');assert(q.recommendations.some(x=>x.code==='empty-days'),'Empty day should recommend review');
q=Readiness.analyze({...base,stopMeta:{a:{day:'1',camping:true,campground:''},b:{day:'2'}}},parks,details,Itinerary);assert(q.blockers.some(x=>x.code==='campground'),'Missing campground must block routing');
q=Readiness.analyze({...base,stopMeta:{a:{day:'1',camping:true,campground:'Camp A',campsite:''},b:{day:'2'}}},parks,details,Itinerary);assert(q.ready,'Missing campsite number should not block');assert(q.recommendations.some(x=>x.code==='campsite'),'Missing campsite should recommend review');
q=Readiness.analyze({...base,endDateMode:'manual',endDate:'2026-09-14'},parks,details,Itinerary);assert(q.ready,'Manual span mismatch should not block');assert(q.recommendations.some(x=>x.code==='date-span'),'Manual date span mismatch should recommend review');
q=Readiness.analyze({...base,endDate:'2026-09-09'},parks,details,Itinerary);assert(q.blockers.some(x=>x.code==='date-order'),'Impossible date order must block');
console.log('Trip readiness audit passed: blocker/recommendation separation, optional empty days, camping routing requirements, campsite advisory, date-span advisory and impossible-date blocking.');
