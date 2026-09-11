const http=require('http');
const fs=require('fs');
const path=require('path');
const app=require('./app.js');

const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const IMAGE_DIR=path.join(PUBLIC,'images');

function repairClientJS(source){
  let out='',quote=null,escaped=false;
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(quote){
      if(escaped){out+=ch;escaped=false;continue;}
      if(ch==='\\'){out+=ch;escaped=true;continue;}
      if(ch===quote){out+=ch;quote=null;continue;}
      if(ch==='\n'){out+='\\n';continue;}
      if(ch==='\r'){continue;}
      out+=ch;
    }else{
      if(ch==="'"||ch==='"'||ch==='`'){quote=ch;out+=ch;continue;}
      out+=ch;
    }
  }
  return out;
}

const clientJS=repairClientJS(app.clientJS);

function serveStatic(pathname,res){
  if(!pathname.startsWith('/images/'))return false;
  const file=path.normalize(path.join(PUBLIC,pathname.replace(/^\//,'')));
  if(!file.startsWith(IMAGE_DIR)||!fs.existsSync(file))return false;
  const ext=path.extname(file).toLowerCase();
  const type=ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.png'?'image/png':'application/octet-stream';
  res.writeHead(200,{'content-type':type,'cache-control':'public,max-age=2592000,immutable'});
  fs.createReadStream(file).pipe(res);
  return true;
}

function createServer(){
  return http.createServer((req,res)=>{
    let url;
    try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Bad request')}
    if(serveStatic(url.pathname,res))return;
    if(url.pathname==='/client.js'){
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});
      return res.end(clientJS);
    }
    if(url.pathname==='/health'){
      const coords=app.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({
        ok:true,
        version:app.VERSION,
        parks:app.parks.length,
        parkImages:app.parks.filter(p=>p.image&&fs.existsSync(path.join(PUBLIC,p.image.replace(/^\//,'')))).length,
        features:['saved-parks','compare','trip-collections','trip-day-planner','trip-stop-notes','trip-map','print-trip','static-map'],
        mapCoordinates:coords?Object.keys(coords.parks).length:0,
        clientScript:'repaired'
      }));
    }
    const out=app.renderPath(url);
    res.writeHead(out.status,{'content-type':'text/html; charset=utf-8'});
    res.end(out.body);
  });
}

if(require.main===module){
  createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${app.VERSION} on ${PORT} (runtime client repair active)`));
}

module.exports={...app,clientJS,createServer,repairClientJS};
