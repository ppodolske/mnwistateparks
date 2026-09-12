const assert=require('assert');
const http=require('http');
const app=require('./site-v1226.js');

(async()=>{
  const server=app.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  const body=await new Promise((resolve,reject)=>{
    http.get({host:'127.0.0.1',port,path:'/'},res=>{
      let data='';
      res.setEncoding('utf8');
      res.on('data',chunk=>data+=chunk);
      res.on('end',()=>resolve(data));
    }).on('error',reject);
  });
  await new Promise(resolve=>server.close(resolve));
  assert(body.includes('yellowstone-v1.22.6'),'homepage must include Yellowstone theme version marker');
  assert(body.includes('parks-yellowstone-theme-v1226'),'homepage must include inline Yellowstone CSS');
  assert(body.includes('family=Bebas+Neue&family=Fredoka:wght@400&family=PT+Serif:wght@400;700'),'homepage must load requested Google Fonts');
  assert(body.includes('/park-favicon.svg?v=1226'),'homepage must include versioned park favicon');
  assert(body.includes('/parks-hub-link.js?v=1226'),'homepage must include footer Preston.run script');
  assert(body.includes('--yellowstone-blue:#0067A2'),'homepage must contain Yellowstone CSS variables');
  console.log('Theme delivery audit passed: rendered homepage contains Yellowstone CSS, fonts, favicon, marker, and footer script.');
})().catch(err=>{console.error(err);process.exit(1)});
