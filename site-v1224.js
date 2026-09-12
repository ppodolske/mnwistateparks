const fs=require('fs');
const path=require('path');
const previous=require('./site-v1223.js');
const VERSION='1.22.4';
const PORT=process.env.PORT||3000;
const THEME_FILE=path.join(__dirname,'parks-yellowstone-theme.css');
const FAVICON_FILE=path.join(__dirname,'park-favicon.svg');
const themeCSS=fs.readFileSync(THEME_FILE,'utf8');
const faviconSVG=fs.readFileSync(FAVICON_FILE,'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/parks-yellowstone-theme.css'){
      res.writeHead(200,{'content-type':'text/css; charset=utf-8','cache-control':'public,max-age=300'});
      return res.end(themeCSS);
    }
    if(url.pathname==='/park-favicon.svg'){
      res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public,max-age=86400'});
      return res.end(faviconSVG);
    }
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v1224-yellowstone-brand-system-wrapper',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','park-reference-details','first-class-day-management','consolidated-trip-logistics','route-intelligence','readiness-qa','download-only-pdf-export','export-state-synchronization','preston-run-footer-link','yellowstone-brand-system','bebas-neue-headings','fredoka-body','pt-serif-metadata','compact-body-type','material-park-favicon']}));
    }
    const end=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const fonts='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fredoka:wght@400&family=PT+Serif:wght@400;700&display=swap" rel="stylesheet">';
        const theme='<link rel="stylesheet" href="/parks-yellowstone-theme.css">';
        const favicon='<link rel="icon" href="/park-favicon.svg" type="image/svg+xml">';
        const inject=fonts+theme+favicon;
        if(!html.includes('/parks-yellowstone-theme.css')){
          html=html.includes('</head>')?html.replace('</head>',inject+'</head>'):inject+html;
        }
        return end.call(this,html,...args);
      }
      return end.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (Yellowstone visual system release)`));
module.exports={...previous,VERSION,themeCSS,faviconSVG,createServer};
