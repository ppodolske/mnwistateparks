const TripItinerary=require('./trip-itinerary.js');
function assert(ok,msg){if(!ok)throw new Error(msg)}
const parks=[
  {slug:'a',name:'Alpha State Park',city:'A',state:'MN'},
  {slug:'b',name:'Bravo State Park',city:'B',state:'MN'}
];
const details={a:{mapsQuery:'Alpha State Park, MN'},b:{mapsQuery:'Bravo State Park, MN'}};
let trip={startLocation:'Home, MN',endLocation:'Home, MN',startDate:'2026-09-12',dayCount:1,parks:['a','b'],stopMeta:{a:{day:'1'},b:{day:'1'}}};
let x=TripItinerary.build(trip,parks,details),d=x.days[0];
assert(d.routeStatus==='ready','Expected ready route');
assert(d.routePoints[0]==='Home, MN','Route must start at trip origin');
assert(d.routePoints[1]==='Alpha State Park, MN'&&d.routePoints[2]==='Bravo State Park, MN','Park waypoint order changed');
assert(d.routePoints[d.routePoints.length-1]==='Home, MN','Final day must end at trip end location');
assert(/origin=Home%2C%20MN/.test(d.routeUrl),'Google Maps origin missing');
assert(/destination=Home%2C%20MN/.test(d.routeUrl),'Google Maps destination missing');
trip={...trip,startLocation:'',endLocation:'',parks:['a'],stopMeta:{a:{day:'1'}}};
x=TripItinerary.build(trip,parks,details);d=x.days[0];
assert(d.routeStatus==='missing-start'&&!d.routeUrl,'Missing start should block route link');
trip={startLocation:'Home, MN',endLocation:'Other, MN',startDate:'2026-09-12',dayCount:2,parks:['a','b'],stopMeta:{a:{day:'1',camping:true,campground:'North Campground'},b:{day:'2'}}};
x=TripItinerary.build(trip,parks,details);
assert(x.days[0].routeEnd.includes('North Campground'),'Camping day should route to campground');
assert(x.days[1].start===x.days[0].routeEnd,'Next day should inherit prior route endpoint');
assert(x.days[1].routeEnd==='Other, MN','Final day should route to trip end');
assert(x.routeReadyDays===2&&x.routeIncompleteDays===0,'Route readiness counts incorrect');
trip={startLocation:'Home, MN',endLocation:'Home, MN',startDate:'2026-09-12',dayCount:2,parks:['a'],stopMeta:{a:{day:'1'}}};
x=TripItinerary.build(trip,parks,details);
assert(x.days[1].routeStatus==='empty','Empty day should be flagged');
console.log('Trip route audit passed: full day endpoints, ordered waypoints, camping handoff, final trip end, missing-start blocking and empty-day status.');
