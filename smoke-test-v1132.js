const fs=require('fs');
const site=require('./site-current.js');
const TripModel=require('./trip-model.js');
const TripItinerary=require('./trip-itinerary.js');
const {VERSION,parks,renderPath,injectAll,tripBookletDaysJS,tripBookletReviewSourceJS,tripBookletExportJS,reviewJS,parkDetails,loadCoords,COLLECTIONS}=site;
function assert(ok,msg){if(!ok)throw new Error(msg)}
function check(path,tokens=[]){const out=renderPath(new URL(path,'http://localhost'));assert(out.status===200,`${path} returned ${out.status}`);for(const t of tokens)assert(out.body.includes(t),`${path} missing ${t}`);return out.body}
assert(VERSION==='1.13.2',`Unexpected version ${VERSION}`);
assert(parks.length===116,`Expected 116 parks, found ${parks.length}`);
assert(Array.isArray(COLLECTIONS)&&COLLECTIONS.length===8,'Expected 8 collections');
assert(Object.keys(parkDetails).length===116,`Expected 116 park references, found ${Object.keys(parkDetails).length}`);
new Function(tripBookletDaysJS);new Function(tripBookletReviewSourceJS);new Function(tripBookletExportJS);for(const src of reviewJS)new Function(src);
assert(reviewJS.length===4,'Expected four source-review chunks');
const sandbox={window:{}};const vm=require('vm');for(const src of reviewJS)vm.runInNewContext(src,sandbox);assert(Object.keys(sandbox.window.PARK_REVIEW_TEXT||{}).length===116,`Expected 116 source reviews, found ${Object.keys(sandbox.window.PARK_REVIEW_TEXT||{}).length}`);
for(const key of ['governor-thompson|WI','nelson-dewey|WI','whitefish-dunes|WI','yellowstone-lake|WI','frontenac|MN'])assert(sandbox.window.PARK_REVIEW_TEXT[key],`Missing source review ${key}`);
for(const token of ['TRIP BOOKLET · UNASSIGNED STOPS','These stops are not assigned to a numbered trip day.','data-unassigned','What to expect'])assert(tripBookletDaysJS.includes(token),`Daily booklet missing ${token}`);
for(const token of ['splitDayPages','continued','All stops are unassigned','Desktop printing: disable browser headers/footers'])assert(tripBookletExportJS.includes(token),`Booklet export missing ${token}`);
assert(!tripBookletExportJS.includes('alert("For a clean booklet PDF'), 'Blocking print alert must be removed');
for(const token of ['TripBookletReviewSource','PARK_REVIEW_TEXT','dataset.sourceReview','what to expect'])assert(tripBookletReviewSourceJS.includes(token),`Review source patch missing ${token}`);
const tripHtml=check('/trip?id=test-trip',['data-page="trip"','id="printTripBtn"']);const injected=injectAll(tripHtml);
for(const src of ['/park-review-text-1.js','/park-review-text-2.js','/park-review-text-3.js','/park-review-text-4.js','/trip-booklet-days.js','/trip-booklet-review-source.js','/trip-booklet-export.js'])assert(injected.includes(`src="${src}"`),`Injected trip missing ${src}`);
assert(injected.indexOf('src="/park-review-text-4.js"')<injected.indexOf('src="/trip-booklet-days.js"'),'Review data must load before daily pages');
assert(injected.indexOf('src="/trip-booklet-days.js"')<injected.indexOf('src="/trip-booklet-review-source.js"'),'Daily pages must load before review patch');
assert(injected.indexOf('src="/trip-booklet-review-source.js"')<injected.indexOf('src="/trip-booklet-export.js"'),'Review patch must load before export');
const sample=TripModel.normalizeTrip({id:'smoke',name:'Smoke',startDate:'2026-09-19',startLocation:'Duluth, MN',endLocation:'Grand Marais, MN',parks:['gooseberry-falls','tettegouche'],stopMeta:{'gooseberry-falls':{day:'1'},tettegouche:{day:'2'}}});const itinerary=TripItinerary.build(sample,parks,parkDetails);assert(itinerary.assignedDays===2,'Itinerary assignment regression');
assert(fs.existsSync('./park-coordinates.generated.json'),'Coordinate snapshot missing');const coords=loadCoords();assert(coords&&Object.keys(coords.parks||{}).length===116,'Runtime coordinates are not 116/116');
console.log('Smoke tests passed: v1.13.2 mobile export polish, unassigned-stop semantics, continuation pages, source review text 116/116, 116/116 park references, and 116/116 map.');
