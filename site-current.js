const http=require('http');
const fs=require('fs');
const path=require('path');
const site=require('./site.js');

const VERSION='1.10.2';
const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const IMAGE_DIR=path.join(PUBLIC,'images');
const PLANNER_FILE=path.join(__dirname,'planner-polish.js');
const TRIP_DETAILS_FILE=path.join(__dirname,'trip-details.js');
const plannerJS=fs.readFileSync(PLANNER_FILE,'utf8');
const tripDetailsJS=fs.readFileSync(TRIP_DETAILS_FILE,'utf8');

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
  const scripts='<script src="/planner-polish.js" defer></script><script src="/trip-details.js" defer></script>';
  return html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html;
}
function createServer(){
  return http.createServer((req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Bad request')}
    if(serveStatic(url.pathname,res))return;
    if(url.pathname==='/client.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(site.clientJS)}
    if(url.pathname==='/planner-polish.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(plannerJS)}
    if(url.pathname==='/trip-details.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripDetailsJS)}
    if(url.pathname==='/health'){
      const coords=site.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime',parks:site.parks.length,collections:site.COLLECTIONS.length,features:['saved-parks','compare','trip-collections','trip-day-planner','trip-stop-notes','trip-map','compact-trip-pdf','shareable-trips','day-route-overview','name-based-map-routing','explicit-day-save','park-address','camping-details','campground-loop','campsite-number','external-planner-scripts','no-split-stop-cards'],mapCoordinates:coords?Object.keys(coords.parks).length:0}));
    }
    const out=site.renderPath(url);
    res.writeHead(out.status,{'content-type':'text/html; charset=utf-8'});
    res.end(out.status===200?injectAll(out.body):out.body);
  });
}
if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (current runtime)`));
module.exports={...site,VERSION,plannerJS,tripDetailsJS,injectAll,createServer};
