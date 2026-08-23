const CACHE_NAME = 'daily-tracker-v3';
const ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(ASSETS);
      } catch (err) {
        console.warn('Failed to cache some assets during install:', err);
      }
      // Try to cache /login and / separately without credentials to bypass middleware redirects
      try {
        const loginRes = await fetch('/login', { credentials: 'omit' });
        if (loginRes.ok) {
          await cache.put('/login', loginRes);
        }
      } catch (err) {
        console.warn('Failed to cache /login during install:', err);
      }
      
      try {
        const rootRes = await fetch('/', { credentials: 'omit' });
        if (rootRes.ok) {
          await cache.put('/', rootRes);
        }
      } catch (err) {
        console.warn('Failed to cache / during install:', err);
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Avoid caching Supabase auth and API calls to prevent stale auth state or submission failures
  if (
    event.request.url.includes('/rest/v1/') || 
    event.request.url.includes('/auth/v1/') || 
    event.request.method !== 'GET'
  ) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Network-first strategy for authenticated routes and navigations
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/admin') || 
    url.pathname.startsWith('/student') ||
    url.pathname === '/login' ||
    url.pathname === '/'
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/login');
        });
      })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        return caches.match('/login');
      });
    })
  );
});
