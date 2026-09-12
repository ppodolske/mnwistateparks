const http=require('http');
const fs=require('fs');
const path=require('path');
const site=require('./site.js');

const VERSION='1.12.1';
const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const IMAGE_DIR=path.join(PUBLIC,'images');
const TRIP_MODEL_FILE=path.join(__dirname,'trip-model.js');
const TRIP_ITINERARY_FILE=path.join(__dirname,'trip-itinerary.js');
const TRIP_ITINERARY_UI_FILE=path.join(__dirname,'trip-itinerary-ui.js');
const PLANNER_FILE=path.join(__dirname,'planner-polish.js');
const TRIP_DETAILS_FILE=path.join(__dirname,'trip-details.js');
const PARK_DETAILS_FILE=path.join(__dirname,'park-details.js');
const PARK_DETAILS_EXTRA_FILE=path.join(__dirname,'park-details-extra.js');
const PARK_ADDRESSES_CURRENT_FILE=path.join(__dirname,'park-addresses-current.js');
const tripModelJS=fs.readFileSync(TRIP_MODEL_FILE,'utf8');
const tripItineraryJS=fs.readFileSync(TRIP_ITINERARY_FILE,'utf8');
const tripItineraryUIJS=fs.readFileSync(TRIP_ITINERARY_UI_FILE,'utf8');
const plannerJS=fs.readFileSync(PLANNER_FILE,'utf8');
const tripDetailsJS=fs.readFileSync(TRIP_DETAILS_FILE,'utf8');
const parkDetailsJS=fs.readFileSync(PARK_DETAILS_FILE,'utf8');
const parkDetailsExtraJS=fs.readFileSync(PARK_DETAILS_EXTRA_FILE,'utf8');
const parkAddressesCurrentJS=fs.readFileSync(PARK_ADDRESSES_CURRENT_FILE,'utf8');
const parkDetails={...require('./park-details.js'),...require('./park-details-extra.js')};

function serveStatic(pathname,res){
  if(!pathname.startsWith('/images/'))return false;
  const file=path.normalize(path.join(PUBLIC,pathname.replace(/^\//,'')));
  if(!file.startsWith(IMAGE_DIR)||!fs.existsSync(file))return false;
  const ext=path.extname(file).toLowerCase();
  const type=ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.png'?'image/png':'application/octet-stream';
  res.writeHead(200,{'content-type':type,'cache-control':'public,max-age=2592000,immutable'});
  fs.createReadStream(file).pipe(res);return true;
}
function injectAll(html){
  const scripts='<script src="/trip-model.js" defer></script><script src="/trip-itinerary.js" defer></script><script src="/planner-polish.js" defer></script><script src="/park-details.js" defer></script><script src="/park-details-extra.js" defer></script><script src="/park-addresses-current.js" defer></script><script src="/trip-details.js" defer></script><script src="/trip-itinerary-ui.js" defer></script>';
  return html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html;
}
function createServer(){
  return http.createServer((req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Bad request')}
    if(serveStatic(url.pathname,res))return;
    if(url.pathname==='/client.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(site.clientJS)}
    if(url.pathname==='/trip-model.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripModelJS)}
    if(url.pathname==='/trip-itinerary.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripItineraryJS)}
    if(url.pathname==='/trip-itinerary-ui.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripItineraryUIJS)}
    if(url.pathname==='/planner-polish.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(plannerJS)}
    if(url.pathname==='/park-details.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(parkDetailsJS)}
    if(url.pathname==='/park-details-extra.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(parkDetailsExtraJS)}
    if(url.pathname==='/park-addresses-current.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(parkAddressesCurrentJS)}
    if(url.pathname==='/trip-details.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripDetailsJS)}
    if(url.pathname==='/health'){
      const coords=site.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime',parks:site.parks.length,collections:site.COLLECTIONS.length,parkReferenceRecords:Object.keys(parkDetails).length,features:['saved-parks','compare','trip-collections','trip-data-model-v2','trip-itinerary-model','itinerary-summary-ui','editable-trip-start-location','editable-trip-end-location','day-date-calculation','day-start-location','day-overnight-location','trip-route-links','park-reference-data','park-reference-coverage-116','trip-day-planner','trip-stop-notes','trip-stop-details-editor','trip-map','compact-trip-pdf','shareable-trips','day-route-overview','name-based-map-routing','explicit-day-save','auto-park-address','google-maps-place-link','camping-details','campground-name','campground-loop','campsite-number','reservation-details','check-in-out','trip-start-end-dates','trip-locations','emergency-contact','lodging-notes','resupply-notes','external-planner-scripts','no-split-stop-cards','photo-free-pdf'],mapCoordinates:coords?Object.keys(coords.parks).length:0}));
    }
    const out=site.renderPath(url);
    res.writeHead(out.status,{'content-type':'text/html; charset=utf-8'});
    res.end(out.status===200?injectAll(out.body):out.body);
  });
}
if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (current runtime)`));
module.exports={...site,VERSION,tripModelJS,tripItineraryJS,tripItineraryUIJS,plannerJS,tripDetailsJS,parkDetailsJS,parkDetailsExtraJS,parkAddressesCurrentJS,parkDetails,injectAll,createServer};
