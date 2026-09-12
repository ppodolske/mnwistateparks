const fs=require('fs');
const path=require('path');
const previous=require('./site-v120.js');
const VERSION='1.21.0';
const PORT=process.env.PORT||3000;
const READINESS_FILE=path.join(__dirname,'trip-readiness.js');
const READINESS_UI_FILE=path.join(__dirname,'trip-readiness-ui.js');
const tripReadinessJS=fs.readFileSync(READINESS_FILE,'utf8');
const tripReadinessUIJS=fs.readFileSync(READINESS_UI_FILE,'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/trip-readiness.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripReadinessJS)}
    if(url.pathname==='/trip-readiness-ui.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripReadinessUIJS)}
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v121-readiness-qa-wrapper',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','unassigned-stops-workflow','park-reference-details','first-class-day-management','consolidated-trip-logistics','route-intelligence','readiness-blockers','readiness-recommendations','empty-day-advisory','manual-date-span-advisory','campground-routing-blocker','campsite-advisory','impossible-date-blocking','ready-with-review-items','booklet-pdf-export']}));
    }
    const end=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const scripts='<script src="/trip-readiness.js" defer></script><script src="/trip-readiness-ui.js" defer></script>';
        if(!html.includes('/trip-readiness.js'))html=html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html+scripts;
        return end.call(this,html,...args);
      }
      return end.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (readiness and planning QA release)`));
module.exports={...previous,VERSION,tripReadinessJS,tripReadinessUIJS,createServer};
