const assert=require('assert');
const itinerary=require('./trip-itinerary.js');
const parks=[
  {slug:'a',name:'A State Park',city:'A',state:'MN'},
  {slug:'b',name:'B State Park',city:'B',state:'WI'},
  {slug:'c',name:'C State Park',city:'C',state:'MN'}
];
function trip(){return{parks:['a','b','c'],stopMeta:{a:{day:'1'},b:{day:'3'},c:{day:''}},startDate:'2026-09-01'}}
let t=trip();
assert.equal(itinerary.dayCount(t),3,'legacy assignments should migrate to three planned days');
itinerary.ensureDayCount(t);assert.equal(t.dayCount,3);
let groups=itinerary.groupDays(t,parks);
assert.deepEqual(groups.map(g=>g.key),['1','2','3','Unassigned'],'empty Day 2 must be preserved');
assert.equal(groups[1].stops.length,0);
assert.equal(itinerary.addDayToTrip(t),4);assert.equal(t.dayCount,4);
assert(itinerary.moveDayInTrip(t,3,-1));
assert.equal(t.stopMeta.b.day,'2','moving Day 3 earlier should move its assignments');
assert(itinerary.removeDayFromTrip(t,2));
assert.equal(t.dayCount,3);
assert.equal(t.stopMeta.b.day,'','removing a day must unassign its parks');
groups=itinerary.groupDays(t,parks);
assert.deepEqual(groups.map(g=>g.key),['1','2','3','Unassigned']);
assert.equal(groups.find(g=>g.key==='Unassigned').stops.length,2);
const built=itinerary.build(t,parks,{});
assert.equal(built.plannedDays,3);
assert.equal(built.assignedDays,3,'planned empty days count as itinerary days');
assert.equal(built.days[0].date,'2026-09-01');
assert.equal(built.days[1].date,'2026-09-02');
console.log('Trip day audit passed: legacy migration, empty days, add/reorder/remove, safe unassignment and date sequencing.');
