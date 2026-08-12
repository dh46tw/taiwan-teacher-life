/* ---------- 極簡離線快取（app shell cache-first，對應 WIKI 一「技術定位」PWA 需求） ---------- */
const CACHE_NAME='teacherlife-v1.0.0-alpha';
const ASSETS=[
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './src/main.js',
  './src/engine/rng.js',
  './src/engine/state.js',
  './src/engine/growth.js',
  './src/engine/scoring.js',
  './src/engine/exam.js',
  './src/engine/events.js',
  './src/engine/ow.js',
  './src/engine/career-flow.js',
  './src/engine/traits-unlock.js',
  './src/engine/summary.js',
  './src/data/tables.js',
  './src/data/events.js',
  './src/data/traits.js',
  './src/data/second-life.js',
  './src/ui/render.js',
  './src/ui/share.js',
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const network=fetch(e.request).then(res=>{
        if(res&&res.status===200)caches.open(CACHE_NAME).then(c=>c.put(e.request,res.clone()));
        return res;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});
