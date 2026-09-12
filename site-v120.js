const fs=require('fs');
const path=require('path');
const previous=require('./site-v119.js');
const VERSION='1.20.0';
const PORT=process.env.PORT||3000;
const ROUTE_INTEL_FILE=path.join(__dirname,'trip-route-intelligence.js');
const BOOKLET_ROUTE_INTEL_FILE=path.join(__dirname,'trip-booklet-route-intelligence.js');
const tripRouteIntelligenceJS=fs.readFileSync(ROUTE_INTEL_FILE,'utf8');
const tripBookletRouteIntelligenceJS=fs.readFileSync(BOOKLET_ROUTE_INTEL_FILE,'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/trip-route-intelligence.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripRouteIntelligenceJS)}
    if(url.pathname==='/trip-booklet-route-intelligence.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletRouteIntelligenceJS)}
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v120-route-intelligence-wrapper',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','unassigned-stops-workflow','park-reference-details','first-class-day-management','consolidated-trip-logistics','full-day-route-endpoints','ordered-route-waypoints','campground-route-endpoint','day-route-handoff','route-readiness-status','route-sequence-ui','booklet-route-readiness','google-maps-day-routing','no-fabricated-road-metrics','booklet-pdf-export']}));
    }
    const end=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const scripts='<script src="/trip-route-intelligence.js" defer></script><script src="/trip-booklet-route-intelligence.js" defer></script>';
        if(!html.includes('/trip-route-intelligence.js'))html=html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html+scripts;
        return end.call(this,html,...args);
      }
      return end.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (route intelligence release)`));
module.exports={...previous,VERSION,tripRouteIntelligenceJS,tripBookletRouteIntelligenceJS,createServer};
