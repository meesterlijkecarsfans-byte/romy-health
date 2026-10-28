const CACHE='romy-health-v22';
const CORE=['./styles.css','./app.js','./schedule.js','./training-extras.js','./strength-workouts.js','./strength-config.js','./nav-icons.js','./nutrition-import.js','./nutrition-goals.js','./supabase-sync.js','./health-automation.js','./nightly-review.js','./week-overview.js','./week-summary.js','./sleep-insights.js','./performance-insights.js','./daily-focus.js','./dashboard-overview.js','./energy-sync-fix.js','./progress-charts.js','./smart-coach.js','./manifest.json','./icon.svg'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  if(event.request.mode==='navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request)));
});