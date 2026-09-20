const CACHE='mega-worm-ru-v4';
const FILES=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon.svg','./assets/original/GroundStrip_Tex.png','./assets/original/Background_Classic_Tex.png','./assets/original/Wojira_Tex.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;}).catch(()=>caches.match('./index.html')))));
