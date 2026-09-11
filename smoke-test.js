const fs=require('fs');
const {VERSION,parks,renderPath,clientJS,loadCoords,COLLECTIONS}=require('./collections-runtime.js');
function check(path,need=[]){const out=renderPath(new URL(path,'http://localhost'));if(out.status!==200)throw new Error(`${path} returned ${out.status}`);for(const token of need){if(!out.body.includes(token))throw new Error(`${path} missing ${token}`)}return out.body}
const nav=['href="/parks"','href="/explore"','href="/map"','href="/project"','href="/saved"','href="/about"'];
for(const p of ['/','/parks','/explore','/map','/project','/saved','/about'])check(p,nav);
const explore=check('/explore',[...nav,'href="/find"','Find a park for my trip','href="/collections"','Browse collections']);
const finderCount=(explore.match(/Find a park for my trip/g)||[]).length;if(finderCount!==1)throw new Error(`Expected one park finder CTA on /explore, found ${finderCount}`);
const collectionsCount=(explore.match(/Browse collections/g)||[]).length;if(collectionsCount!==1)throw new Error(`Expected one collections CTA on /explore, found ${collectionsCount}`);
check('/find',[...nav,'FIND A PARK','Find good fits','Things you want to avoid']);
check('/collections',[...nav,'COLLECTIONS','Browse the project by theme.','Waterfall stops','Five-pine entries']);
check('/collections/waterfall-stops',[...nav,'WATERFALLS','Waterfall stops','In this collection']);
check('/collections/five-pine-parks',[...nav,'5 PINE','This is not a leaderboard.']);
check('/parks/tettegouche',[...nav,'id="saveParkBtn"','Save park','id="tripParkBtn"','Add to trip','data-park-slug="tettegouche"']);
check('/saved',[...nav,'data-page="saved"','id="createTripBtn"','id="tripName"','id="tripRoot"','Trip collections']);
check('/trip?id=test-trip',[...nav,'data-page="trip"','id="tripNameEdit"','id="tripStops"','id="saveTripBtn"','id="tripSummary"','id="tripMap"','id="printTripBtn"']);
check('/compare?parks=tettegouche,bear-head-lake',['Compare Parks']);
check('/map',[...nav,'data-page="map"','id="mapData"','id="mapState"','id="mapTrip"','id="mapTag"','id="mapCount"','All 116 parks.']);
if(parks.length!==116)throw new Error(`Expected 116 parks, found ${parks.length}`);
if(VERSION!=='1.5.1')throw new Error(`Unexpected version ${VERSION}`);
if(!Array.isArray(COLLECTIONS)||COLLECTIONS.length!==8)throw new Error(`Expected 8 collections, found ${COLLECTIONS&&COLLECTIONS.length}`);
for(const c of COLLECTIONS){const matches=parks.filter(c.match);if(!matches.length)throw new Error(`Collection ${c.slug} has no parks`)}
new Function(clientJS);
for(const token of ['createTripBtn','mnwiTripCollections','Trip created ✓','saveParkBtn','tripParkBtn','stopMeta','stop-day','stop-note','printTripBtn','tripMap','data-page="map"','mapCount','L.map'])if(!clientJS.includes(token))throw new Error(`client.js missing ${token}`);
if(!fs.existsSync('./park-coordinates.generated.json'))throw new Error('Coordinate build output missing');
const coordinates=JSON.parse(fs.readFileSync('./park-coordinates.generated.json','utf8'));
if(coordinates.count!==116)throw new Error(`Coordinate file count is ${coordinates.count}, expected 116`);
const slugs=new Set(parks.map(p=>p.slug)),coordSlugs=Object.keys(coordinates.parks||{});
if(coordSlugs.length!==116)throw new Error(`Coordinate record count is ${coordSlugs.length}, expected 116`);
for(const slug of slugs){const c=coordinates.parks[slug];if(!c||!Number.isFinite(c.lat)||!Number.isFinite(c.lng))throw new Error(`Missing/invalid coordinate for ${slug}`)}
const loaded=loadCoords();if(!loaded||Object.keys(loaded.parks).length!==116)throw new Error('runtime failed to load all 116 coordinates');
console.log('Smoke tests passed: v1.5.1 collections, single Explore CTA pair, guided finder, richer trip planning, 116/116 static map, canonical navigation, save/compare.');
