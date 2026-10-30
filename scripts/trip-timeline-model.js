/* Atlas Trip Timeline — date-based park visits and independent overnight ledger.
   No external services or storage. Pure UMD data model; legacy data is retained. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.AtlasTripTimelineModel=api;})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(Date.parse(s+'T12:00:00Z')).toISOString().slice(0,10)===s;
  const add=(d,n)=>{if(!validDate(d))return '';const a=new Date(d+'T12:00:00Z');a.setUTCDate(a.getUTCDate()+n);return a.toISOString().slice(0,10)};
  const diff=(a,b)=>validDate(a)&&validDate(b)?Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000):NaN;
  const range=t=>{const start=t?.startDate||t?.date,end=t?.endDate;if(!validDate(start)||!validDate(end)||diff(start,end)<0||diff(start,end)>365)return null;const dates=Array.from({length:diff(start,end)+1},(_,i)=>add(start,i));return {start,end,dates,nights:dates.slice(0,-1)};};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const visits=t=>t?.timelineV1?.visits||{};
  function initialize(trip){
    const r=range(trip);if(!r)return null;
    if(trip.timelineV1&&trip.timelineV1.version===1)return trip.timelineV1;
    const state={version:1,visits:{},nights:{}};
    for(const slug of trip.parks||[]){const m=trip.stopMeta?.[slug]||{},d=Number(m.day),start=Number.isInteger(d)&&d>0?add(r.start,d-1):'';
      state.visits[slug]={start:validDate(start)?start:'',end:validDate(start)?start:'',stay:m.camping?'camp':'auto'};
    }
    trip.timelineV1=state;trip.calendarDays=true;trip.dayCount=r.dates.length;return state;
  }
  function active(trip,slug,date){const v=visits(trip)[slug];return !!(v&&validDate(v.start)&&validDate(v.end)&&v.start<=date&&date<=v.end);}
  function nightCandidates(trip,date){const r=range(trip);if(!r||!r.nights.includes(date))return [];
    return (trip.parks||[]).filter(slug=>{const v=visits(trip)[slug];if(!v||!validDate(v.start)||!validDate(v.end)||v.stay==='day'||v.stay==='elsewhere')return false;
      if(v.stay==='camp')return date>=v.start&&date<=(v.end>v.start?add(v.end,-1):v.start);
      return v.stay==='auto'&&v.start<v.end&&date>=v.start&&date<v.end;
    });
  }
  function overnight(trip,date){const candidates=nightCandidates(trip,date);const override=trip.timelineV1?.nights?.[date];
    if(override){if(override.type==='none')return {type:'none',source:'override',candidates};
      if(override.type==='other')return {type:'other',label:String(override.label||'Other accommodation'),source:'override',candidates};
      if(override.type==='park'&&trip.parks?.includes(override.slug))return {type:'park',slug:override.slug,source:'override',candidates};}
    if(candidates.length>1)return {type:'conflict',candidates,source:'inferred'};
    if(candidates.length===1)return {type:'park',slug:candidates[0],source:'inferred',candidates};
    return {type:'none',source:'inferred',candidates};
  }
  function setVisit(trip,slug,start,end,stay){const r=range(trip);if(!r||!trip.parks?.includes(slug))throw Error('Trip or park is invalid');
    if(!validDate(start)||!validDate(end)||end<start||start<r.start||end>r.end)throw Error('Visit must stay within trip dates');
    initialize(trip);const before=trip.timelineV1.visits[slug]||{};
    trip.timelineV1.visits[slug]={...before,start,end,stay:['auto','camp','day','elsewhere'].includes(stay)?stay:(before.stay||'auto')};
    syncLegacy(trip);return trip.timelineV1.visits[slug];}
  function unschedule(trip,slug){initialize(trip);if(!trip.timelineV1?.visits[slug])return;
    trip.timelineV1.visits[slug]={...trip.timelineV1.visits[slug],start:'',end:''};syncLegacy(trip);}
  function setNight(trip,date,choice){const r=range(trip);if(!r||!r.nights.includes(date))throw Error('Night is outside the trip');initialize(trip);
    if(choice===null){delete trip.timelineV1.nights[date];}
    else if(choice.type==='park'&&trip.parks.includes(choice.slug))trip.timelineV1.nights[date]={type:'park',slug:choice.slug};
    else if(choice.type==='other')trip.timelineV1.nights[date]={type:'other',label:String(choice.label||'Other accommodation').trim().slice(0,180)};
    else if(choice.type==='none')trip.timelineV1.nights[date]={type:'none'};
    else throw Error('Unsupported overnight selection');
    syncLegacy(trip);}
  function syncLegacy(trip){const r=range(trip);if(!r||!trip.timelineV1)return;
    trip.calendarDays=true;trip.dayCount=r.dates.length;trip.stopMeta=trip.stopMeta||{};
    for(const slug of trip.parks||[]){const v=visits(trip)[slug],m=trip.stopMeta[slug]||{};
      const first=v&&validDate(v.start)&&v.start>=r.start&&v.start<=r.end?v.start:'';
      m.day=first?String(diff(r.start,first)+1):'';
      // Do not remove reservation/campsite metadata when switching overnight arrangements.
      if(first){m.camping=r.nights.some(n=>{const stay=overnight(trip,n);return stay.type==='park'&&stay.slug===slug});}
      trip.stopMeta[slug]=m;
    }
  }
  function schedule(trip){const r=range(trip);if(!r)return null;const timeline=initialize(trip);
    const blocks=(trip.parks||[]).map(slug=>({slug,...(timeline.visits[slug]||{start:'',end:'',stay:'auto'}),meta:trip.stopMeta?.[slug]||{}}));
    const rows=r.dates.map(date=>({date,visits:blocks.filter(b=>active(trip,b.slug,date)),night:r.nights.includes(date)?overnight(trip,date):null}));
    return {...r,blocks,rows,conflicts:rows.filter(row=>row.night?.type==='conflict').map(row=>row.date)};
  }
  function routes(trip,parks,details){const plan=schedule(trip);if(!plan)return[];
    const get=p=>{const d=details?.[p.slug]||{};return d.mapsQuery||[p.name,p.city,p.state].filter(Boolean).join(', ')};
    const bySlug=new Map((parks||[]).map(p=>[p.slug,p]));let prev=trip.startLocation||'';
    return plan.rows.map((row,i)=>{const night=row.night;const stops=row.visits.map(v=>v.slug);let end='';
      if(night?.type==='park'){const p=bySlug.get(night.slug);const m=trip.stopMeta?.[night.slug]||{};end=[m.campground,p&&get(p)].filter(Boolean).join(', ')}
      else if(night?.type==='other')end=night.label;
      else if(i===plan.rows.length-1)end=trip.endLocation||trip.startLocation||'';
      const points=[prev,...stops.map(x=>bySlug.get(x)).filter(Boolean).map(get),end].filter(Boolean).filter((x,j,a)=>j===0||x!==a[j-1]);
      const link=points.length>=2?'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(points[0])+'&destination='+encodeURIComponent(points[points.length-1])+'&travelmode=driving'+(points.length>2?'&waypoints='+encodeURIComponent(points.slice(1,-1).join('|')):''):'';
      const record={date:row.date,stops,night,origin:prev,destination:end,url:night?.type==='conflict'?'':link};if(end)prev=end;else if(points.length)prev=points[points.length-1];return record;});
  }
  return {validDate,add,diff,range,clone,initialize,visits,active,nightCandidates,overnight,setVisit,unschedule,setNight,syncLegacy,schedule,routes};
});
