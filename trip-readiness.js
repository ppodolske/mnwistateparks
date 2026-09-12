(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TripReadiness=api;
})(typeof window!=='undefined'?window:null,function(){
  const text=v=>v==null?'':String(v).trim();
  const iso=v=>/^\d{4}-\d{2}-\d{2}$/.test(text(v))?text(v):'';
  const daysBetween=(a,b)=>{if(!iso(a)||!iso(b))return 0;const x=new Date(a+'T12:00:00Z'),y=new Date(b+'T12:00:00Z');return Math.round((y-x)/86400000)+1};
  const item=(severity,code,title,detail,target,icon='!')=>({severity,code,title,detail,target,icon});
  function analyze(trip,parks=[],details={},itineraryApi){
    const t=trip||{},parkSlugs=Array.isArray(t.parks)?t.parks:[],meta=t.stopMeta||{},blockers=[],recommendations=[];
    const pushBlock=(...args)=>blockers.push(item('blocker',...args));
    const pushRec=(...args)=>recommendations.push(item('recommendation',...args));
    if(!parkSlugs.length)pushBlock('no-parks','Add parks to this trip','A trip needs at least one park before day planning can begin.','/parks','+');
    const unassigned=parkSlugs.filter(slug=>!text(meta[slug]?.day)).length;
    if(unassigned)pushBlock('unassigned','Assign '+unassigned+' unassigned park'+(unassigned===1?'':'s'),'Every park should belong to a numbered day before the itinerary is ready.','#workspaceItinerary',String(unassigned));
    const start=text(t.startLocation);
    if(!start)pushBlock('missing-start','Set start / return location','The first day cannot be routed until the trip has a starting point.','#workspaceLogistics','↔');
    const startDate=iso(t.startDate||t.date),endDate=iso(t.endDate);
    if(!startDate)pushBlock('missing-date','Set trip date','Add a start date so itinerary days can be dated consistently.','#workspaceLogistics','D');
    if(startDate&&endDate&&endDate<startDate)pushBlock('date-order','Fix the trip date range','The end date is before the start date.','#workspaceLogistics','D');

    const camping=parkSlugs.map(slug=>({slug,m:meta[slug]||{}})).filter(x=>x.m.camping);
    const missingCampground=camping.filter(x=>!text(x.m.campground)).length;
    if(missingCampground)pushBlock('campground','Add campground for '+missingCampground+' camping stop'+(missingCampground===1?'':'s'),'A camping day needs a campground so its overnight endpoint can be routed reliably.','#workspaceItinerary','C');
    const missingSite=camping.filter(x=>text(x.m.campground)&&!text(x.m.campsite)).length;
    if(missingSite)pushRec('campsite','Review campsite details for '+missingSite+' camping stop'+(missingSite===1?'':'s'),'The campground is set, but the campsite/spot number is blank. This may be fine for first-come or unassigned sites.','#workspaceItinerary','C');

    let itinerary=null;
    if(itineraryApi&&typeof itineraryApi.build==='function'){
      try{itinerary=itineraryApi.build(t,parks,details)}catch{}
    }
    if(itinerary){
      const numbered=itinerary.days.filter(d=>d.key!=='Unassigned');
      const empty=numbered.filter(d=>d.routeStatus==='empty'||d.stopCount===0);
      if(empty.length)pushRec('empty-days','Review '+empty.length+' empty itinerary day'+(empty.length===1?'':'s'),'Empty days are allowed for travel or rest, but confirm they are intentional.','#workspaceItinerary','0');
      const incomplete=numbered.filter(d=>d.stopCount>0&&d.routeStatus!=='ready'&&d.routeStatus!=='missing-start');
      if(incomplete.length)pushBlock('route-inputs','Complete routing inputs for '+incomplete.length+' day'+(incomplete.length===1?'':'s'),'One or more populated days cannot yet produce a complete Google Maps route.','#workspaceItinerary','R');
      const planned=Math.max(1,Number(itinerary.plannedDays)||0);
      const span=daysBetween(startDate,endDate);
      if(t.endDateMode==='manual'&&startDate&&endDate&&span>0&&span!==planned)pushRec('date-span','Review trip dates vs. itinerary length','The manual date range spans '+span+' day'+(span===1?'':'s')+', while the itinerary contains '+planned+' day'+(planned===1?'':'s')+'.','#workspaceLogistics','D');
    }
    return {blockers,recommendations,ready:blockers.length===0,blockerCount:blockers.length,recommendationCount:recommendations.length,itinerary};
  }
  return {analyze,daysBetween};
});
