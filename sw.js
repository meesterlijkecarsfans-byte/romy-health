const CACHE='romy-health-v41';
const CORE=['./styles.css','./app.js','./schedule.js','./marathon-plan-2027.js','./training-extras.js','./strength-workouts.js','./strength-config.js','./nutrition-import.js','./nutrition-goals.js','./supabase-sync.js','./health-automation.js','./nightly-review.js','./week-overview.js','./energy-sync-fix.js','./tredict-intelligence.js','./insights-reorg.js','./progress-motivation.js','./minimal-ui.js','./schema-list.js','./dashboard-insights-v2.js','./romy-ui-v38.js','./romy-compat-v39.js','./nutrition-recovery-v40.js','./manifest.json','./icon.svg'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')){
    event.respondWith(fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return r;}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));return;
  }
  event.respondWith(fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return r;}).catch(()=>caches.match(event.request)));
});