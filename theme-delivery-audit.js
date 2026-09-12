const assert=require('assert');
const http=require('http');
const app=require('./site-v1227.js');

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
  assert(body.includes('yellowstone-v1.22.6'),'homepage must retain Yellowstone theme marker');
  assert(body.includes('parks-yellowstone-theme-v1226'),'homepage must retain inline Yellowstone CSS');
  assert(body.includes('family=Bebas+Neue&family=Fredoka:wght@400&family=PT+Serif:wght@400;700'),'homepage must load requested Google Fonts');
  assert(body.includes('/park-favicon.svg?v=1226'),'homepage must include park favicon');
  assert(body.includes('parks-release-version" content="1.22.7'),'homepage must include v1.22.7 release marker');
  assert(body.includes('/trip-export-v122.js?v=1227'),'homepage must inject export refinement script');
  assert(body.includes('/trip-export-download-v1221.js?v=1227'),'homepage must inject direct PDF download script');
  assert(body.includes('/parks-hub-link.js?v=1227'),'homepage must inject footer Preston.run script');
  assert(body.includes('--yellowstone-blue:#0067A2'),'homepage must contain Yellowstone CSS variables');
  console.log('Theme/export delivery audit passed: rendered homepage contains Yellowstone styling plus direct PDF export scripts.');
})().catch(err=>{console.error(err);process.exit(1)});
