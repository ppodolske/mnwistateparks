const fs=require('fs');
const path=require('path');
const current=require('./site-current.js');
const VERSION='1.18.0';
const PORT=process.env.PORT||3000;
const DAY_EDITOR_FILE=path.join(__dirname,'trip-day-editor.js');
const tripDayEditorJS=fs.readFileSync(DAY_EDITOR_FILE,'utf8');

function createServer(){
  const server=current.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/trip-day-editor.js'){
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});
      return res.end(tripDayEditorJS);
    }
    if(url.pathname==='/health'){
      const coords=current.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({
        ok:true,
        version:VERSION,
        architecture:'current-runtime-v118-first-class-day-management-wrapper',
        parks:current.parks.length,
        collections:current.COLLECTIONS.length,
        parkReferenceRecords:Object.keys(current.parkDetails||{}).length,
        mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,
        features:['trip-workspace-cleanup','unassigned-stops-workflow','park-reference-details','explicit-trip-day-count','legacy-day-migration','empty-day-support','add-trip-day','remove-trip-day-safe-unassign','reorder-trip-days','automatic-day-renumbering','day-assignment-dropdowns','canonical-trip-day-editor-runtime','single-visible-logistics-editor','single-visible-day-by-day-editor','single-readiness-renderer','booklet-hidden-in-workspace','booklet-pdf-export']
      }));
    }
    const end=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        if(!html.includes('/trip-day-editor.js'))html=html.includes('</body>')?html.replace('</body>','<script src="/trip-day-editor.js" defer></script></body>'):html+'<script src="/trip-day-editor.js" defer></script>';
        return end.call(this,html,...args);
      }
      return end.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (itinerary day management release)`));
module.exports={...current,VERSION,tripDayEditorJS,createServer};
