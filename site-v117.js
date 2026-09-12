const current=require('./site-current.js');
const VERSION='1.17.0';
const PORT=process.env.PORT||3000;

function createServer(){
  const server=current.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/health'){
      const coords=current.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({
        ok:true,
        version:VERSION,
        architecture:'current-runtime-v117-unassigned-workflow-wrapper',
        parks:current.parks.length,
        collections:current.COLLECTIONS.length,
        parkReferenceRecords:Object.keys(current.parkDetails||{}).length,
        mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,
        features:['trip-workspace-cleanup','unassigned-stops-workflow','assign-unassigned-to-existing-day','create-day-from-unassigned-stop','remove-unassigned-stop-from-trip','mobile-safe-unassigned-actions','single-visible-logistics-editor','single-visible-day-by-day-editor','single-readiness-renderer','booklet-hidden-in-workspace','booklet-pdf-export']
      }));
    }
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (unassigned stops workflow release)`));
module.exports={...current,VERSION,createServer};
