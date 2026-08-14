// 네트워크 우선, 실패하면 캐시.
// 이전 버전은 cache-first 였고 CACHE_NAME 이 바뀌지 않는 한 index.html 이 영원히
// 갱신되지 않았다. 지침 개정이 사용자에게 전달되지 않는 문제라 전략을 바꿨다.
const CACHE_NAME = 'cardioquick-v15-i18n';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  // addAll 은 하나라도 실패하면 전체가 실패한다 → 개별 처리로 설치 자체는 살린다
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(ASSETS.map(u => cache.add(u).catch(() => null)))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
  );
});
