(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.TripModel=api;if(root.localStorage)api.migrateStorage(root.localStorage)}
})(typeof window!=='undefined'?window:null,function(){
  const STORAGE_KEY='mnwiTripCollections';
  const SCHEMA_VERSION=2;
  const text=v=>v==null?'':String(v);
  const bool=v=>v===true||v===1||v==='1'||v==='true';
  const unique=a=>[...new Set((Array.isArray(a)?a:[]).map(text).filter(Boolean))];

  function normalizeStopMeta(meta={},order=0){
    const s=meta&&typeof meta==='object'?meta:{};
    return {
      ...s,
      day:text(s.day).trim(),
      date:text(s.date).trim(),
      order:Number.isFinite(Number(s.order))&&Number(s.order)>0?Number(s.order):order,
      note:text(s.note),
      camping:bool(s.camping),
      campground:text(s.campground),
      loop:text(s.loop),
      campsite:text(s.campsite),
      reservation:text(s.reservation),
      checkIn:text(s.checkIn),
      checkOut:text(s.checkOut)
    };
  }

  function normalizeTrip(input={}){
    const t=input&&typeof input==='object'?input:{};
    const parks=unique(t.parks);
    const sourceMeta=t.stopMeta&&typeof t.stopMeta==='object'?t.stopMeta:{};
    const stopMeta={};
    for(const [slug,meta] of Object.entries(sourceMeta))stopMeta[slug]=normalizeStopMeta(meta,parks.indexOf(slug)+1||0);
    parks.forEach((slug,i)=>{stopMeta[slug]=normalizeStopMeta(stopMeta[slug]||{},i+1)});
    const legacyDate=text(t.date).trim();
    return {
      ...t,
      schemaVersion:SCHEMA_VERSION,
      id:text(t.id)||`trip-${Date.now()}`,
      name:text(t.name)||'Untitled trip',
      date:legacyDate,
      startDate:text(t.startDate).trim()||legacyDate,
      endDate:text(t.endDate).trim(),
      notes:text(t.notes),
      emergencyContact:text(t.emergencyContact),
      startLocation:text(t.startLocation),
      endLocation:text(t.endLocation),
      lodgingNotes:text(t.lodgingNotes),
      resupplyNotes:text(t.resupplyNotes),
      parks,
      stopMeta
    };
  }

  function normalizeTrips(value){return (Array.isArray(value)?value:[]).map(normalizeTrip)}

  function readTrips(storage){
    try{return normalizeTrips(JSON.parse(storage.getItem(STORAGE_KEY)||'[]'))}catch{return[]}
  }

  function writeTrips(storage,trips){
    const normalized=normalizeTrips(trips);
    storage.setItem(STORAGE_KEY,JSON.stringify(normalized));
    return normalized;
  }

  function migrateStorage(storage){
    let raw=[];
    try{raw=JSON.parse(storage.getItem(STORAGE_KEY)||'[]')}catch{raw=[]}
    const before=Array.isArray(raw)?raw:[];
    const after=normalizeTrips(before);
    const changed=JSON.stringify(before)!==JSON.stringify(after);
    if(changed)storage.setItem(STORAGE_KEY,JSON.stringify(after));
    return {changed,count:after.length,schemaVersion:SCHEMA_VERSION,trips:after};
  }

  return {STORAGE_KEY,SCHEMA_VERSION,normalizeStopMeta,normalizeTrip,normalizeTrips,readTrips,writeTrips,migrateStorage};
});
