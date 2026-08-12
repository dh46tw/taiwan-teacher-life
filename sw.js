/* ---------- 極簡離線快取（app shell network-first，對應 WIKI 一「技術定位」PWA 需求） ---------- */
/* 每次改動任何被快取的檔案時，務必調高 CACHE_NAME 版本號——
   否則已安裝過 PWA 的使用者的瀏覽器不會偵測到 sw.js 本身有變化，
   會永遠卡在舊版快取（曾導致「種子/新功能無法運作」的問題）。 */
const CACHE_NAME='teacherlife-v1.0.1';
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
  './src/data/names.js',
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
/* network-first：連線正常時一律拿最新檔案，只有離線時才退回快取，
   避免開發期改版後使用者被舊快取卡住。 */
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).then(res=>{
      if(res&&res.status===200)caches.open(CACHE_NAME).then(c=>c.put(e.request,res.clone()));
      return res;
    }).catch(()=>caches.match(e.request))
  );
});
