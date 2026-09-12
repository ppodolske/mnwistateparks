const http=require('http');
const fs=require('fs');
const path=require('path');
const site=require('./site.js');

const VERSION='1.16.1';
const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const IMAGE_DIR=path.join(PUBLIC,'images');
const TRIP_MODEL_FILE=path.join(__dirname,'trip-model.js');
const TRIP_ITINERARY_FILE=path.join(__dirname,'trip-itinerary.js');
const TRIP_ITINERARY_UI_FILE=path.join(__dirname,'trip-itinerary-ui.js');
const TRIP_BOOKLET_OVERVIEW_FILE=path.join(__dirname,'trip-booklet-overview.js');
const TRIP_BOOKLET_DAYS_FILE=path.join(__dirname,'trip-booklet-days.js');
const TRIP_BOOKLET_ROUTE_FILE=path.join(__dirname,'trip-booklet-route.js');
const TRIP_BOOKLET_REFERENCE_FILE=path.join(__dirname,'trip-booklet-reference.js');
const TRIP_BOOKLET_NOTES_FILE=path.join(__dirname,'trip-booklet-notes.js');
const TRIP_BOOKLET_PAGINATION_FILE=path.join(__dirname,'trip-booklet-pagination.js');
const TRIP_BOOKLET_EXPORT_FILE=path.join(__dirname,'trip-booklet-export.js');
const TRIP_BOOKLET_REVIEW_SOURCE_FILE=path.join(__dirname,'trip-booklet-review-source.js');
const TRIP_LOGISTICS_FIX_FILE=path.join(__dirname,'trip-logistics-fix.js');
const TRIP_WORKSPACE_CLEANUP_FILE=path.join(__dirname,'trip-workspace-cleanup.js');
const REVIEW_FILES=[1,2,3,4].map(n=>path.join(__dirname,`park-review-text-${n}.js`));
const PLANNER_FILE=path.join(__dirname,'planner-polish.js');
const TRIP_DETAILS_FILE=path.join(__dirname,'trip-details.js');
const PARK_DETAILS_FILE=path.join(__dirname,'park-details.js');
const PARK_DETAILS_EXTRA_FILE=path.join(__dirname,'park-details-extra.js');
const PARK_ADDRESSES_CURRENT_FILE=path.join(__dirname,'park-addresses-current.js');
const tripModelJS=fs.readFileSync(TRIP_MODEL_FILE,'utf8');
const tripItineraryJS=fs.readFileSync(TRIP_ITINERARY_FILE,'utf8');
const tripItineraryUIJS=fs.readFileSync(TRIP_ITINERARY_UI_FILE,'utf8');
const tripBookletOverviewJS=fs.readFileSync(TRIP_BOOKLET_OVERVIEW_FILE,'utf8');
const tripBookletDaysJS=fs.readFileSync(TRIP_BOOKLET_DAYS_FILE,'utf8');
const tripBookletRouteJS=fs.readFileSync(TRIP_BOOKLET_ROUTE_FILE,'utf8');
const tripBookletReferenceJS=fs.readFileSync(TRIP_BOOKLET_REFERENCE_FILE,'utf8');
const tripBookletNotesJS=fs.readFileSync(TRIP_BOOKLET_NOTES_FILE,'utf8');
const tripBookletPaginationJS=fs.readFileSync(TRIP_BOOKLET_PAGINATION_FILE,'utf8');
const tripBookletExportJS=fs.readFileSync(TRIP_BOOKLET_EXPORT_FILE,'utf8');
const tripBookletReviewSourceJS=fs.readFileSync(TRIP_BOOKLET_REVIEW_SOURCE_FILE,'utf8');
const tripLogisticsFixJS=fs.readFileSync(TRIP_LOGISTICS_FIX_FILE,'utf8');
const tripWorkspaceCleanupJS=fs.readFileSync(TRIP_WORKSPACE_CLEANUP_FILE,'utf8');
const reviewJS=REVIEW_FILES.map(f=>fs.readFileSync(f,'utf8'));
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
  const scripts='<script src="/trip-model.js" defer></script><script src="/trip-itinerary.js" defer></script><script src="/planner-polish.js" defer></script><script src="/park-details.js" defer></script><script src="/park-details-extra.js" defer></script><script src="/park-addresses-current.js" defer></script><script src="/trip-details.js" defer></script><script src="/trip-itinerary-ui.js" defer></script><script src="/trip-booklet-overview.js" defer></script><script src="/park-review-text-1.js" defer></script><script src="/park-review-text-2.js" defer></script><script src="/park-review-text-3.js" defer></script><script src="/park-review-text-4.js" defer></script><script src="/trip-booklet-days.js" defer></script><script src="/trip-booklet-review-source.js" defer></script><script src="/trip-booklet-route.js" defer></script><script src="/trip-booklet-reference.js" defer></script><script src="/trip-booklet-notes.js" defer></script><script src="/trip-booklet-pagination.js" defer></script><script src="/trip-booklet-export.js" defer></script><script src="/trip-logistics-fix.js" defer></script><script src="/trip-workspace-cleanup.js" defer></script>';
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
    if(url.pathname==='/trip-booklet-overview.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletOverviewJS)}
    if(/^\/park-review-text-[1-4]\.js$/.test(url.pathname)){const n=Number(url.pathname.match(/(\d)/)[1]);res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(reviewJS[n-1])}
    if(url.pathname==='/trip-booklet-days.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletDaysJS)}
    if(url.pathname==='/trip-booklet-review-source.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletReviewSourceJS)}
    if(url.pathname==='/trip-booklet-route.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletRouteJS)}
    if(url.pathname==='/trip-booklet-reference.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletReferenceJS)}
    if(url.pathname==='/trip-booklet-notes.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletNotesJS)}
    if(url.pathname==='/trip-booklet-pagination.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletPaginationJS)}
    if(url.pathname==='/trip-booklet-export.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletExportJS)}
    if(url.pathname==='/trip-logistics-fix.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripLogisticsFixJS)}
    if(url.pathname==='/trip-workspace-cleanup.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripWorkspaceCleanupJS)}
    if(url.pathname==='/park-coordinates.json'){
      const coords=site.loadCoords();
      res.writeHead(coords?200:503,{'content-type':'application/json; charset=utf-8','cache-control':'no-cache'});
      return res.end(JSON.stringify(coords||{count:0,parks:{}}));
    }
    if(url.pathname==='/planner-polish.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(plannerJS)}
    if(url.pathname==='/park-details.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(parkDetailsJS)}
    if(url.pathname==='/park-details-extra.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(parkDetailsExtraJS)}
    if(url.pathname==='/park-addresses-current.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(parkAddressesCurrentJS)}
    if(url.pathname==='/trip-details.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripDetailsJS)}
    if(url.pathname==='/health'){
      const coords=site.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime',parks:site.parks.length,collections:site.COLLECTIONS.length,parkReferenceRecords:Object.keys(parkDetails).length,features:['trip-workspace-cleanup','single-visible-day-editor','single-visible-logistics-editor','single-readiness-renderer','hidden-booklet-workspace','booklet-pdf-export'],mapCoordinates:coords?Object.keys(coords.parks).length:0}));
    }
    const out=site.renderPath(url);
    res.writeHead(out.status,{'content-type':'text/html; charset=utf-8'});
    res.end(out.status===200?injectAll(out.body):out.body);
  });
}
if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (current runtime)`));
module.exports={...site,VERSION,tripModelJS,tripItineraryJS,tripItineraryUIJS,tripBookletOverviewJS,tripBookletDaysJS,tripBookletReviewSourceJS,reviewJS,tripBookletRouteJS,tripBookletReferenceJS,tripBookletNotesJS,tripBookletPaginationJS,tripBookletExportJS,tripLogisticsFixJS,tripWorkspaceCleanupJS,plannerJS,tripDetailsJS,parkDetailsJS,parkDetailsExtraJS,parkAddressesCurrentJS,parkDetails,injectAll,createServer};
