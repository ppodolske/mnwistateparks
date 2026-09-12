const fs=require('fs');
const path=require('path');
const previous=require('./site-v118.js');
const VERSION='1.19.0';
const PORT=process.env.PORT||3000;
const LOGISTICS_FILE=path.join(__dirname,'trip-logistics-v119.js');
const SYNC_FILE=path.join(__dirname,'trip-logistics-sync-v119.js');
const BOOKLET_LOGISTICS_FILE=path.join(__dirname,'trip-booklet-logistics-v119.js');
const tripLogisticsV119JS=fs.readFileSync(LOGISTICS_FILE,'utf8');
const tripLogisticsSyncV119JS=fs.readFileSync(SYNC_FILE,'utf8');
const tripBookletLogisticsV119JS=fs.readFileSync(BOOKLET_LOGISTICS_FILE,'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/trip-logistics-v119.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripLogisticsV119JS)}
    if(url.pathname==='/trip-logistics-sync-v119.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripLogisticsSyncV119JS)}
    if(url.pathname==='/trip-booklet-logistics-v119.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(tripBookletLogisticsV119JS)}
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v119-trip-logistics-consolidation-wrapper',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','unassigned-stops-workflow','park-reference-details','first-class-day-management','consolidated-trip-logistics','grouped-trip-basics','grouped-safety-logistics','grouped-general-notes','itinerary-aware-auto-end-date','manual-end-date-override','end-date-validation','trip-duration-summary','lodging-notes','resupply-notes','booklet-logistics-carry-through','single-visible-logistics-editor','single-visible-day-by-day-editor','single-readiness-renderer','booklet-pdf-export']}));
    }
    const end=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const scripts='<script src="/trip-logistics-v119.js" defer></script><script src="/trip-logistics-sync-v119.js" defer></script><script src="/trip-booklet-logistics-v119.js" defer></script>';
        if(!html.includes('/trip-logistics-v119.js'))html=html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html+scripts;
        return end.call(this,html,...args);
      }
      return end.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (trip logistics consolidation release)`));
module.exports={...previous,VERSION,tripLogisticsV119JS,tripLogisticsSyncV119JS,tripBookletLogisticsV119JS,createServer};
