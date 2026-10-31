/* Dedicated cache for the public Trip Mode HTML shell. Private trip data is NEVER cached here. */
const C='atlas-trip-mode-shell-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(C).then(c=>c.add('/tripmode/')).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.mode!=='navigate'||u.origin!==self.location.origin||!/^\/tripmode\/?$/.test(u.pathname))return;
 event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(C).then(c=>c.put('/tripmode/',copy)))}return r}).catch(async()=>await (await caches.open(C)).match('/tripmode/')||Response.error()));
});
