// Enhanced Service Worker for Brasas El Gordo PWA
const CACHE_NAME = 'brasas-el-gordo-v3';
const OFFLINE_URL = '/offline.html';

// Essential resources for initial load
const CRITICAL_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json'
];

// Assets to cache on install
const STATIC_ASSETS = [
  '/assets/images/logo/android-chrome-192x192.png',
  '/assets/images/logo/android-chrome-512x512.png',
  '/assets/images/logo/favicon-32x32.png',
  '/assets/images/logo/favicon-16x16.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn.tailwindcss.com'
];

// Install event - cache critical assets
self.addEventListener('install', event => {
  console.log('SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('SW: Critical assets cached, skipping waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('SW: Install failed', error);
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  console.log('SW: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim(),
      // Cache static assets in background
      cacheStaticAssets()
    ])
  );
});

// Background caching of static assets
async function cacheStaticAssets() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_ASSETS);
    console.log('SW: Static assets cached successfully');
  } catch (error) {
    console.log('SW: Failed to cache some static assets:', error);
  }
}

// Fetch event - optimized caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (request.mode === 'navigate') {
    // Navigation requests (pages)
    event.respondWith(handleNavigationRequest(request));
  } else if (request.destination === 'image') {
    // Images
    event.respondWith(handleImageRequest(request));
  } else if (url.hostname === 'fonts.googleapis.com' || 
             url.hostname === 'fonts.gstatic.com' ||
             url.hostname === 'cdn.tailwindcss.com') {
    // External resources (fonts, CDN)
    event.respondWith(handleExternalResource(request));
  } else if (url.pathname.endsWith('.css') || 
             url.pathname.endsWith('.js') ||
             url.pathname.endsWith('.json')) {
    // Static assets
    event.respondWith(handleStaticAsset(request));
  } else {
    // Other requests
    event.respondWith(handleOtherRequest(request));
  }
});

// Navigation request handler - Network first with offline fallback
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('SW: Navigation request failed, serving offline page');
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(OFFLINE_URL);
    return cachedResponse || new Response('Offline - Please check your connection', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Image request handler - Cache first with network fallback
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return placeholder or error response
    return new Response('', { 
      status: 503,
      statusText: 'Image not available offline'
    });
  }
}

// External resource handler - Cache first for performance
async function handleExternalResource(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // For critical resources like Tailwind CSS, return cached version if available
    return cachedResponse || new Response('', { status: 503 });
  }
}

// Static asset handler - Network first with cache fallback
async function handleStaticAsset(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('', { status: 503 });
  }
}

// Other request handler
async function handleOtherRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('', { status: 503 });
  }
}

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      cacheUrls(event.data.payload)
    );
  }
});

// Cache specific URLs on demand
async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  return Promise.all(
    urls.map(url => {
      return fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
      }).catch(error => {
        console.log('SW: Failed to cache URL:', url, error);
      });
    })
  );
}

// Background sync for offline actions (if supported)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('SW: Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle any pending offline actions here
  // For example, sync form submissions, analytics, etc.
  console.log('SW: Processing background sync tasks');
}

// Push notification handler (for future use)
self.addEventListener('push', event => {
  console.log('SW: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva actualización disponible',
    icon: '/assets/images/logo/android-chrome-192x192.png',
    badge: '/assets/images/logo/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver más',
        icon: '/assets/images/logo/favicon-32x32.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/assets/images/logo/favicon-32x32.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Brasas El Gordo', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('SW: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});