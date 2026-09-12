(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TripItinerary=api;
})(typeof window!=='undefined'?window:null,function(){
  const text=v=>v==null?'':String(v).trim();
  const isoDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(text(v))?text(v):'';
  const positiveInt=v=>{const n=Number(v);return Number.isInteger(n)&&n>=1?n:0};
  function addDays(iso,n){if(!isoDate(iso))return'';const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
  function placeQuery(p,details={}){const d=details[p.slug]||{};if(d.mapsQuery)return d.mapsQuery;const n=/\bpark\b/i.test(p.name||'')?p.name:(p.name||'')+' State Park';return [n,p.city,p.state].filter(Boolean).join(', ')}
  function mapsUrl(stops,details={}){if(!stops.length)return'';if(stops.length===1)return'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(placeQuery(stops[0],details));return mapsDirectionsUrl(stops.map(p=>placeQuery(p,details)))}
  function mapsDirectionsUrl(points){const pts=(points||[]).map(text).filter(Boolean).filter((p,i,a)=>i===0||p!==a[i-1]);if(pts.length<2)return'';const origin=pts[0],destination=pts[pts.length-1],mid=pts.slice(1,-1);let u='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent(destination)+'&travelmode=driving';if(mid.length)u+='&waypoints='+encodeURIComponent(mid.join('|'));return u}
  function orderedStops(trip,parks){const bySlug=new Map((parks||[]).map(p=>[p.slug,p]));return (trip.parks||[]).map((slug,i)=>{const p=bySlug.get(slug);if(!p)return null;return {park:p,slug,index:i,meta:(trip.stopMeta&&trip.stopMeta[slug])||{}}}).filter(Boolean)}
  function assignedDayNumbers(trip){return Object.values(trip.stopMeta||{}).map(m=>positiveInt(m&&m.day)).filter(Boolean)}
  function dayCount(trip){const explicit=positiveInt(trip&&trip.dayCount);const assigned=assignedDayNumbers(trip||{});return Math.max(explicit,assigned.length?Math.max(...assigned):0)}
  function ensureDayCount(trip){if(!trip||typeof trip!=='object')return 0;const n=dayCount(trip);trip.dayCount=n;return n}
  function addDayToTrip(trip){const n=ensureDayCount(trip)+1;trip.dayCount=n;return n}
  function removeDayFromTrip(trip,day){const n=positiveInt(day),count=ensureDayCount(trip);if(!n||n>count)return false;trip.stopMeta=trip.stopMeta||{};for(const meta of Object.values(trip.stopMeta)){const d=positiveInt(meta&&meta.day);if(!d)continue;if(d===n)meta.day='';else if(d>n)meta.day=String(d-1)}trip.dayCount=Math.max(0,count-1);return true}
  function moveDayInTrip(trip,day,delta){const n=positiveInt(day),count=ensureDayCount(trip),target=n+Number(delta||0);if(!n||!Number.isInteger(target)||target<1||target>count||target===n)return false;trip.stopMeta=trip.stopMeta||{};for(const meta of Object.values(trip.stopMeta)){const d=positiveInt(meta&&meta.day);if(d===n)meta.day=String(target);else if(d===target)meta.day=String(n)}return true}
  function groupDays(trip,parks){const count=dayCount(trip),groups=Array.from({length:count},(_,i)=>({key:String(i+1),stops:[]})),unassigned={key:'Unassigned',stops:[]};for(const stop of orderedStops(trip,parks)){const n=positiveInt(stop.meta.day);if(n&&n<=count)groups[n-1].stops.push(stop);else unassigned.stops.push(stop)}if(unassigned.stops.length)groups.push(unassigned);return groups}
  function dayDate(trip,key,stops){if(key==='Unassigned')return'';const explicit=[...new Set((stops||[]).map(s=>isoDate(s.meta.date)).filter(Boolean))];if(explicit.length===1)return explicit[0];const n=Number(key);return Number.isFinite(n)&&n>=1?addDays(trip.startDate||trip.date||'',n-1):''}
  function campingStop(day){return [...(day.stops||[])].reverse().find(s=>s.meta&&s.meta.camping)||null}
  function overnightFor(day,index,assignedDays,trip){const camping=campingStop(day);if(camping){const bits=[text(camping.meta.campground),text(camping.meta.loop),text(camping.meta.campsite)].filter(Boolean);return bits.length?bits.join(' · '):camping.park.name}if(index===assignedDays.length-1&&text(trip.endLocation))return text(trip.endLocation);return''}
  function campingQuery(stop,details={}){if(!stop)return'';const campground=text(stop.meta&&stop.meta.campground);if(!campground)return placeQuery(stop.park,details);return [campground,stop.park.name,stop.park.city,stop.park.state].filter(Boolean).join(', ')}
  function routePlan(day,index,assignedDays,trip,details,carry){
    const stopQueries=(day.stops||[]).map(s=>placeQuery(s.park,details));
    const camping=campingStop(day);
    const overnight=overnightFor(day,index,assignedDays,trip);
    const isLast=index===assignedDays.length-1;
    let endQuery='';
    if(camping)endQuery=campingQuery(camping,details);
    else if(isLast&&text(trip.endLocation))endQuery=text(trip.endLocation);
    else if(stopQueries.length)endQuery=stopQueries[stopQueries.length-1];
    const startQuery=text(carry);
    const points=[startQuery,...stopQueries];
    if(endQuery&&endQuery!==points[points.length-1])points.push(endQuery);
    const clean=points.filter(Boolean).filter((p,i,a)=>i===0||p!==a[i-1]);
    let status='ready',message='Route includes the day start, parks in itinerary order, and the overnight/end point.';
    if(!day.stops.length){status='empty';message='No parks are assigned to this day yet.'}
    else if(!startQuery){status='missing-start';message='Set the trip start/return location so this day has a route origin.'}
    else if(clean.length<2){status='incomplete';message='Add another routing point before opening a day route.'}
    const routeUrl=status==='ready'?mapsDirectionsUrl(clean):'';
    const nextCarry=endQuery||stopQueries[stopQueries.length-1]||startQuery;
    return {startQuery,endQuery,overnight,points:clean,routeUrl,status,message,ready:status==='ready',nextCarry};
  }
  function build(trip,parks,details={}){
    const groups=groupDays(trip,parks),assigned=groups.filter(g=>g.key!=='Unassigned'),unassigned=groups.filter(g=>g.key==='Unassigned'),days=[];
    let carry=text(trip.startLocation);
    for(let i=0;i<assigned.length;i++){
      const g=assigned[i],plan=routePlan(g,i,assigned,trip,details,carry),last=g.stops[g.stops.length-1],lastStopLocation=last?placeQuery(last.park,details):'';
      days.push({key:g.key,label:'Day '+g.key,date:dayDate(trip,g.key,g.stops),start:plan.startQuery,overnight:plan.overnight||plan.endQuery,lastStopLocation,stopCount:g.stops.length,stops:g.stops,routeUrl:plan.routeUrl,routeAvailable:plan.ready,routeStatus:plan.status,routeMessage:plan.message,routePoints:plan.points,routeEnd:plan.endQuery});
      carry=plan.nextCarry;
    }
    for(const g of unassigned)days.push({key:g.key,label:'Unassigned stops',date:'',start:'',overnight:'',lastStopLocation:'',stopCount:g.stops.length,stops:g.stops,routeUrl:'',routeAvailable:false,routeStatus:'unassigned',routeMessage:'Assign these parks to a numbered day before routing them.',routePoints:[],routeEnd:''});
    const states=new Set(orderedStops(trip,parks).map(s=>s.park.state).filter(Boolean));
    const routeReadyDays=days.filter(d=>d.key!=='Unassigned'&&d.routeStatus==='ready').length;
    const routeIncompleteDays=days.filter(d=>d.key!=='Unassigned'&&d.routeStatus!=='ready').length;
    return {days,totalParks:orderedStops(trip,parks).length,assignedDays:assigned.length,plannedDays:dayCount(trip),totalGroups:groups.length,stateCount:states.size,startDate:isoDate(trip.startDate||trip.date),endDate:isoDate(trip.endDate),startLocation:text(trip.startLocation),endLocation:text(trip.endLocation),routeReadyDays,routeIncompleteDays,roadDistanceKm:null,roadDriveMinutes:null,roadMetricsSource:'Google Maps route link'}
  }
  return {addDays,placeQuery,mapsUrl,mapsDirectionsUrl,orderedStops,assignedDayNumbers,dayCount,ensureDayCount,addDayToTrip,removeDayFromTrip,moveDayInTrip,groupDays,dayDate,campingStop,campingQuery,routePlan,build};
});
