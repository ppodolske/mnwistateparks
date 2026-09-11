const fs=require('fs');
const {VERSION,parks,renderPath,clientJS,plannerJS,loadCoords,COLLECTIONS,practical,injectPlanner}=require('./site.js');
function check(path,need=[]){const out=renderPath(new URL(path,'http://localhost'));if(out.status!==200)throw new Error(`${path} returned ${out.status}`);for(const token of need){if(!out.body.includes(token))throw new Error(`${path} missing ${token}`)}return out.body}
const nav=['href="/parks"','href="/explore"','href="/map"','href="/project"','href="/saved"','href="/about"'];
for(const p of ['/','/parks','/explore','/map','/project','/saved','/about'])check(p,nav);
const explore=check('/explore',[...nav,'href="/find"','Find a park for my trip','href="/collections"','Browse collections']);
if((explore.match(/Find a park for my trip/g)||[]).length!==1)throw new Error('Park finder CTA duplicated');
if((explore.match(/Browse collections/g)||[]).length!==1)throw new Error('Collections CTA duplicated');
check('/find',[...nav,'FIND A PARK','Find good fits','Things you want to avoid']);
check('/collections',[...nav,'COLLECTIONS','Browse the project by theme.','Waterfall stops','Five-pine entries']);
check('/collections/waterfall-stops',[...nav,'WATERFALLS','Waterfall stops','In this collection']);
check('/parks/tettegouche',[...nav,'id="saveParkBtn"','Save park','id="tripParkBtn"','Add to trip','data-park-slug="tettegouche"']);
const practicalPark=parks.find(p=>practical(p).length>0);if(!practicalPark)throw new Error('No park has derived practical tags');
const practicalTags=practical(practicalPark);const practicalHtml=check(`/parks/${practicalPark.slug}`,[...nav,'PRACTICAL NOTES FROM THE REVIEW']);
for(const tag of practicalTags){if(!practicalHtml.includes(tag))throw new Error(`Practical tag ${tag} missing from ${practicalPark.slug}`)}
const compare=check('/compare?parks=tettegouche,bear-head-lake',['Compare Parks','Critical factors']);
if((compare.match(/Critical factors/g)||[]).length!==1)throw new Error('Compare Critical factors row duplicated');
check('/about',[...nav,'HOW THE REVIEWS WORK','Not a leaderboard.','IDEAL TRIP','Current conditions can change.']);
check('/project',[...nav,'HOW TO READ THE SITE','Original review vs. derived navigation.']);
const saved=check('/saved',[...nav,'data-page="saved"','id="createTripBtn"','id="tripName"','id="tripRoot"','Trip collections']);
const trip=check('/trip?id=test-trip',[...nav,'data-page="trip"','id="tripNameEdit"','id="tripStops"','id="saveTripBtn"','id="tripSummary"','id="tripMap"','id="printTripBtn"']);
check('/map',[...nav,'data-page="map"','id="mapData"','id="mapState"','id="mapTrip"','id="mapTag"','id="mapCount"','All 116 parks.']);
if(parks.length!==116)throw new Error(`Expected 116 parks, found ${parks.length}`);
if(VERSION!=='1.9.0')throw new Error(`Unexpected version ${VERSION}`);
if(!Array.isArray(COLLECTIONS)||COLLECTIONS.length!==8)throw new Error(`Expected 8 collections, found ${COLLECTIONS&&COLLECTIONS.length}`);
for(const c of COLLECTIONS){if(!parks.filter(c.match).length)throw new Error(`Collection ${c.slug} has no parks`)}
new Function(clientJS);
new Function(plannerJS);
for(const token of ['createTripBtn','mnwiTripCollections','Trip created ✓','saveParkBtn','tripParkBtn','stopMeta','stop-day','stop-note','printTripBtn','tripMap','data-page="map"','mapCount','L.map'])if(!clientJS.includes(token))throw new Error(`client.js missing ${token}`);
for(const token of ['tripChooserModal','trip-choice','tripAddParkDirect','tripParkSearch','Add another stop','shareTripBtn','Copy share link','shared','importSharedTrip','Save this trip','tripRouteOverview','DAY-BY-DAY','Route overview','Open in Google Maps','straight-line distance'])if(!plannerJS.includes(token))throw new Error(`planner-polish.js missing ${token}`);
const injectedSaved=injectPlanner(saved);if(!injectedSaved.includes('tripChooserModal')||!injectedSaved.includes('importSharedTrip'))throw new Error('Planner/share polish not injected into saved page response');
const injectedTrip=injectPlanner(trip);if(!injectedTrip.includes('tripAddParkDirect')||!injectedTrip.includes('shareTripBtn')||!injectedTrip.includes('tripRouteOverview'))throw new Error('Planner/route polish not injected into trip page response');
const siteSource=fs.readFileSync('./site.js','utf8');
for(const legacy of ['./app-runtime.js','./decision-runtime.js','./collections-runtime.js','./parity-runtime.js'])if(siteSource.includes(legacy))throw new Error(`Canonical runtime still depends on ${legacy}`);
if(!fs.existsSync('./park-coordinates.json'))throw new Error('Checked-in coordinate snapshot missing');
if(!fs.existsSync('./park-coordinates.generated.json'))throw new Error('Prepared runtime coordinate file missing');
const coordinates=JSON.parse(fs.readFileSync('./park-coordinates.generated.json','utf8'));
if(coordinates.count!==116||Object.keys(coordinates.parks||{}).length!==116)throw new Error('Coordinate record count is not 116');
for(const p of parks){const c=coordinates.parks[p.slug];if(!c||!Number.isFinite(c.lat)||!Number.isFinite(c.lng))throw new Error(`Missing/invalid coordinate for ${p.slug}`)}
const loaded=loadCoords();if(!loaded||Object.keys(loaded.parks).length!==116)throw new Error('runtime failed to load all 116 coordinates');
console.log('Smoke tests passed: day-by-day route overview, external directions links, shareable trips, planner polish, single runtime, parity, finder, collections, client JS, and 116/116 map.');
