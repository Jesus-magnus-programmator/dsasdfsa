// HaulLog offline cache. Bump VERSION when you replace index.html so phones pick up the new copy.
const VERSION="haullog-v48",FILES=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
// Install: download fresh copies (skip the phone's web cache, which can hold an older index.html for up to 10 minutes).
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES.map(u=>new Request(u,{cache:"reload"})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==VERSION).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
// A response that went through a redirect can't be handed to a page load as-is; copy it into a plain response.
const plain=r=>r.redirected?r.blob().then(b=>new Response(b,{status:r.status,statusText:r.statusText,headers:r.headers})):r;
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;
 // The map library (Leaflet) is kept so the trip map still draws without signal once it has loaded one time. Map pictures (tiles) always need a connection.
 const lu=new URL(e.request.url);if(lu.origin==="https://cdnjs.cloudflare.com"&&lu.pathname.startsWith("/ajax/libs/leaflet/")){e.respondWith(caches.open(VERSION).then(c=>c.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r&&(r.ok||r.type==="opaque"))c.put(e.request,r.clone());return r}))));return}
 // Only handle this site's own files. Other sites (for example Google's sign-in script) must fail normally when offline, not be answered with index.html.
 if(lu.origin!==location.origin)return;
 // access.json (the list of approved Google accounts) must always come fresh from the network, never from the cache.
 if(lu.pathname.endsWith("/access.json"))return;
 // Opening the app: newest version from the network when there is signal (waits at most 3 seconds), otherwise the saved copy.
 if(e.request.mode==="navigate"){e.respondWith(caches.open(VERSION).then(c=>new Promise(res=>{let done=0;
  const saved=()=>c.match(e.request,{ignoreSearch:true}).then(h=>h||c.match("index.html")).then(h=>{if(!done){done=1;res(h||fetch(e.request))}});
  const t=setTimeout(saved,3000);
  fetch(e.request.url,{cache:"no-cache"}).then(plain).then(r=>{if(r&&r.ok){c.put(e.request,r.clone());c.put("index.html",r.clone())}if(!done){done=1;clearTimeout(t);res(r)}}).catch(()=>{clearTimeout(t);saved()})})));return}
 // Everything else: open instantly from the cache, refresh the cache quietly when there is a connection.
 e.respondWith(caches.open(VERSION).then(c=>c.match(e.request,{ignoreSearch:true}).then(hit=>{
  const net=fetch(e.request).then(r=>{if(r&&r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit||c.match("index.html"));
  return hit||net})))});
