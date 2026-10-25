/* TOOT | توت — Service Worker: يخلّي الموقع يفتح أسرع ويشتغل حتى لو النت ضعيف */
var CACHE = 'toot-v9';
var CORE = ['./', 'index.html', 'code/style.css', 'code/app.js', 'code/menu-data.js',
  'toot-main-outline.png', 'toot-badge.png', 'favicon.png',
  'poster-quality.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  var isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(new URL(req.url).pathname);
  if (isImage) { // الصور: من الكاش الأول
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; });
    }));
  } else { // الصفحة والكود: من النت الأول علشان التحديثات توصل فورًا
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res;
    }).catch(function () { return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); }); }));
  }
});
