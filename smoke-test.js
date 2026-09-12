const fs=require('fs');
const {VERSION,parks,renderPath,clientJS,plannerJS,tripDetailsJS,loadCoords,COLLECTIONS,practical,injectAll}=require('./site-current.js');
function check(path,need=[]){const out=renderPath(new URL(path,'http://localhost'));if(out.status!==200)throw new Error(`${path} returned ${out.status}`);for(const token of need){if(!out.body.includes(token))throw new Error(`${path} missing ${token}`)}return out.body}
const nav=['href="/parks"','href="/explore"','href="/map"','href="/project"','href="/saved"','href="/about"'];
for(const p of ['/','/parks','/explore','/map','/project','/saved','/about'])check(p,nav);
check('/find',[...nav,'FIND A PARK','Find good fits']);
check('/collections',[...nav,'COLLECTIONS','Waterfall stops']);
check('/parks/tettegouche',[...nav,'Save park','Add to trip']);
const practicalPark=parks.find(p=>practical(p).length>0);if(!practicalPark)throw new Error('No park has practical tags');
check(`/parks/${practicalPark.slug}`,[...nav,'PRACTICAL NOTES FROM THE REVIEW']);
check('/compare?parks=tettegouche,bear-head-lake',['Compare Parks','Critical factors']);
const saved=check('/saved',[...nav,'data-page="saved"','id="createTripBtn"','id="tripRoot"']);
const trip=check('/trip?id=test-trip',[...nav,'data-page="trip"','id="tripStops"','id="saveTripBtn"','id="tripSummary"','id="printTripBtn"']);
check('/map',[...nav,'data-page="map"','All 116 parks.']);
if(parks.length!==116)throw new Error(`Expected 116 parks, found ${parks.length}`);
if(VERSION!=='1.10.2')throw new Error(`Unexpected version ${VERSION}`);
if(!Array.isArray(COLLECTIONS)||COLLECTIONS.length!==8)throw new Error('Expected 8 collections');
new Function(clientJS);new Function(plannerJS);new Function(tripDetailsJS);
for(const token of ['tripChooserModal','tripAddParkDirect','tripRouteOverview','saveDayAssignmentsBtn','Export trip PDF'])if(!plannerJS.includes(token))throw new Error(`planner-polish.js missing ${token}`);
for(const token of ['camp-details','park-address','camping-here','campground-loop','campsite-number','Park / entrance address','Campground / loop','Campsite','printTripBtn','exportCompact','break-inside:avoid'])if(!tripDetailsJS.includes(token))throw new Error(`trip-details.js missing ${token}`);
const injectedTrip=injectAll(trip);for(const token of ['src="/planner-polish.js"','src="/trip-details.js"'])if(!injectedTrip.includes(token))throw new Error(`trip response missing external script ${token}`);
if(injectedTrip.includes("const w=window.open('','_blank')"))throw new Error('trip response leaked planner source inline');
const injectedHome=injectAll(check('/'));if(injectedHome.includes("const w=window.open('','_blank')"))throw new Error('home response leaked planner source inline');
const injectedSaved=injectAll(saved);if(!injectedSaved.includes('src="/planner-polish.js"'))throw new Error('planner script not referenced on saved page');
if(!fs.existsSync('./park-coordinates.json')||!fs.existsSync('./park-coordinates.generated.json'))throw new Error('coordinate snapshot missing');
const coordinates=JSON.parse(fs.readFileSync('./park-coordinates.generated.json','utf8'));if(coordinates.count!==116||Object.keys(coordinates.parks||{}).length!==116)throw new Error('Coordinate count is not 116');
for(const p of parks){const c=coordinates.parks[p.slug];if(!c||!Number.isFinite(c.lat)||!Number.isFinite(c.lng))throw new Error(`Missing coordinate for ${p.slug}`)}
const loaded=loadCoords();if(!loaded||Object.keys(loaded.parks).length!==116)throw new Error('runtime failed to load 116 coordinates');
console.log('Smoke tests passed: v1.10.2 external planner scripts, no inline source leakage, compact non-splitting PDF, trip stop camping/address details, and 116/116 map.');
