const fs=require('fs');
const path=require('path');
const previous=require('./site-v1224.js');
const VERSION='1.22.5';
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
    if(url.pathname==='/park-favicon.svg'){
      res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public,max-age=3600'});
      return res.end(faviconSVG);
    }
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v1225-inline-yellowstone-theme',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','park-reference-details','first-class-day-management','consolidated-trip-logistics','route-intelligence','readiness-qa','download-only-pdf-export','export-state-synchronization','preston-run-footer-link','yellowstone-brand-system','inline-theme-delivery','bebas-neue-headings','fredoka-body','pt-serif-metadata','compact-body-type','material-park-favicon']}));
    }

    const downstreamEnd=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const fonts='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fredoka:wght@400&family=PT+Serif:wght@400;700&display=swap" rel="stylesheet">';
        const favicon='<link rel="icon" href="/park-favicon.svg?v=1225" type="image/svg+xml">';
        const marker='<meta name="parks-theme-version" content="yellowstone-v1.22.5">';
        const inlineTheme='<style id="parks-yellowstone-theme-v1225">'+themeCSS+'</style>';
        const inject=fonts+favicon+marker+inlineTheme;

        html=html
          .replace(/<link[^>]+parks-yellowstone-theme\.css[^>]*>/gi,'')
          .replace(/<style id="parks-yellowstone-theme-v1225">[\s\S]*?<\/style>/gi,'')
          .replace(/<meta name="parks-theme-version"[^>]*>/gi,'');
        html=html.includes('</head>')?html.replace('</head>',inject+'</head>'):inject+html;

        try{res.removeHeader('content-length')}catch{}
        try{res.setHeader('cache-control','no-cache, no-store, must-revalidate')}catch{}
        try{res.setHeader('x-parks-theme','yellowstone-v1.22.5')}catch{}
        return downstreamEnd.call(this,html,...args);
      }
      return downstreamEnd.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (inline Yellowstone theme delivery)`));
module.exports={...previous,VERSION,themeCSS,faviconSVG,createServer};
