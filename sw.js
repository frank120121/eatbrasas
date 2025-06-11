/**
 * Service Worker for Brasas El Gordo PWA
 * Provides offline functionality, asset caching, and background sync
 */

const CACHE_NAME = 'brasas-el-gordo-v1.2.2';
const OFFLINE_PAGE = '/offline.html';

// Critical assets that must be cached for offline functionality
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/main.css',
  '/assets/js/main.js',
  OFFLINE_PAGE
];

// Static assets to cache (fonts, images, etc.)
const STATIC_ASSETS = [
  // Favicon and PWA icons
  '/assets/images/logo/favicon-16x16.png',
  '/assets/images/logo/favicon-32x32.png',
  '/assets/images/logo/android-chrome-192x192.png',
  '/assets/images/logo/android-chrome-512x512.png',
  '/assets/images/favicon/apple-touch-icon.png',
  '/assets/images/favicon/favicon.ico',
  
  // Hero videos and posters
  '/assets/videos/hero-desktop.mp4',
  '/assets/videos/hero-mobile.mp4',
  '/assets/videos/hero-desktop.webm',
  '/assets/videos/hero-mobile.webm',
  '/assets/images/hero-poster-desktop.jpg',
  '/assets/images/hero-poster-mobile.jpg'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Nunito:wght@300;400;500;600;700;800;900&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
  'https://fonts.gstatic.com/s/nunito/v24/XRXV3I6Li01BKofINeaE.woff2'
];

// Cache configuration
const CACHE_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 100,
  networkTimeoutSeconds: 5
};

/**
 * Install Event - Cache critical assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache critical assets first
        console.log('[SW] Caching critical assets');
        await cache.addAll(CRITICAL_ASSETS);
        
        // Cache static assets (non-blocking)
        try {
          console.log('[SW] Caching static assets');
          await cache.addAll(STATIC_ASSETS);
        } catch (error) {
          console.warn('[SW] Some static assets failed to cache:', error);
        }
        
        // Cache external resources (non-blocking)
        try {
          console.log('[SW] Caching external resources');
          const externalPromises = EXTERNAL_RESOURCES.map(async url => {
            try {
              const response = await fetch(url, { mode: 'cors' });
              if (response.ok) {
                await cache.put(url, response);
              }
            } catch (err) {
              console.warn(`[SW] Failed to cache external resource: ${url}`, err);
            }
          });
          await Promise.allSettled(externalPromises);
        } catch (error) {
          console.warn('[SW] External resources caching failed:', error);
        }
        
        console.log('[SW] Installation completed successfully');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
        throw error;
      }
    })()
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(name => name !== CACHE_NAME && name.startsWith('brasas-el-gordo'))
          .map(name => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          });
        
        await Promise.all(deletePromises);
        
        // Take control of all clients immediately
        await self.clients.claim();
        
        console.log('[SW] Activation completed successfully');
        
        // Notify clients of successful activation
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            message: 'Service Worker activated successfully'
          });
        });
        
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch Event - Handle all network requests
 */
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Handle different types of requests with appropriate strategies
  event.respondWith(handleFetchRequest(event.request, url));
});

/**
 * Main fetch request handler with different caching strategies
 */
async function handleFetchRequest(request, url) {
  try {
    // Strategy 1: Cache First for static assets and fonts
    if (shouldUseCacheFirst(url)) {
      return await cacheFirst(request);
    }
    
    // Strategy 2: Network First for HTML pages and API calls
    if (shouldUseNetworkFirst(url)) {
      return await networkFirst(request);
    }
    
    // Strategy 3: Stale While Revalidate for images and other assets
    return await staleWhileRevalidate(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    return await handleFetchError(request, url);
  }
}

/**
 * Determines if request should use Cache First strategy
 */
function shouldUseCacheFirst(url) {
  return (
    // Static assets
    url.pathname.includes('/assets/css/') ||
    url.pathname.includes('/assets/js/') ||
    url.pathname.includes('/assets/images/logo/') ||
    url.pathname.includes('/assets/images/favicon/') ||
    // Google Fonts
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    // Manifest
    url.pathname === '/manifest.json'
  );
}

/**
 * Determines if request should use Network First strategy
 */
function shouldUseNetworkFirst(url) {
  return (
    // HTML pages
    url.pathname === '/' ||
    url.pathname.includes('.html') ||
    // API calls (if you add them later)
    url.pathname.includes('/api/')
  );
}

/**
 * Cache First Strategy - Check cache first, fallback to network
 */
async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log(`[SW] Cache hit: ${request.url}`);
      return cachedResponse;
    }
    
    console.log(`[SW] Cache miss, fetching: ${request.url}`);
    const networkResponse = await fetchWithTimeout(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error(`[SW] Cache First failed for ${request.url}:`, error);
    throw error;
  }
}

/**
 * Network First Strategy - Try network first, fallback to cache
 */
async function networkFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    try {
      console.log(`[SW] Network first: ${request.url}`);
      const networkResponse = await fetchWithTimeout(request);
      
      // Cache successful responses
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (networkError) {
      console.log(`[SW] Network failed, trying cache: ${request.url}`);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      throw networkError;
    }
  } catch (error) {
    console.error(`[SW] Network First failed for ${request.url}:`, error);
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy - Return cache immediately, update in background
 */
async function staleWhileRevalidate(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Start network request (don't await)
    const networkPromise = fetchWithTimeout(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(error => {
      console.warn(`[SW] Background update failed for ${request.url}:`, error);
    });
    
    // Return cached version immediately if available
    if (cachedResponse) {
      console.log(`[SW] Stale while revalidate (cached): ${request.url}`);
      return cachedResponse;
    }
    
    // If no cache, wait for network
    console.log(`[SW] Stale while revalidate (network): ${request.url}`);
    return await networkPromise;
  } catch (error) {
    console.error(`[SW] Stale While Revalidate failed for ${request.url}:`, error);
    throw error;
  }
}

/**
 * Fetch with timeout to prevent hanging requests
 */
async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CACHE_CONFIG.networkTimeoutSeconds * 1000);
  
  try {
    const response = await fetch(request, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Handle fetch errors with appropriate fallbacks
 */
async function handleFetchError(request, url) {
  console.log(`[SW] Handling fetch error for: ${request.url}`);
  
  // For HTML pages, return offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    const cache = await caches.open(CACHE_NAME);
    const offlinePage = await cache.match(OFFLINE_PAGE);
    
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback offline page if cached version not available
    return new Response(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sin conexión - Brasas El Gordo</title>
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5; 
          }
          .container { 
            max-width: 400px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 15px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          }
          .logo { 
            width: 80px; 
            height: 80px; 
            background: #ad2118; 
            border-radius: 20px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin: 0 auto 20px; 
            color: white; 
            font-size: 36px; 
            font-weight: bold; 
          }
          h1 { color: #333; margin-bottom: 10px; }
          p { color: #666; margin-bottom: 30px; }
          button { 
            background: #ad2118; 
            color: white; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 10px; 
            font-size: 16px; 
            cursor: pointer; 
            font-weight: bold; 
          }
          button:hover { background: #8a1a13; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">B</div>
          <h1>Sin conexión</h1>
          <p>Parece que no tienes conexión a internet. Tu carrito se guardará automáticamente.</p>
          <button onclick="window.location.reload()">Intentar de nuevo</button>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // For other resources, return a basic error response
  return new Response('Recurso no disponible sin conexión', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

/**
 * Background Sync for cart data (when API is implemented)
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCartData());
  }
});

/**
 * Sync cart data with server (placeholder for future API integration)
 */
async function syncCartData() {
  try {
    console.log('[SW] Syncing cart data...');
    
    // TODO: Implement actual cart sync with your backend API
    // For now, this is a placeholder
    
    // Example of what this would look like:
    // const cartData = await getStoredCartData();
    // const response = await fetch('/api/cart/sync', {
    //   method: 'POST',
    //   body: JSON.stringify(cartData),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    
    console.log('[SW] Cart sync completed');
    
    // Notify clients of successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CART_SYNCED',
        message: 'Cart data synced successfully'
      });
    });
    
  } catch (error) {
    console.error('[SW] Cart sync failed:', error);
    throw error;
  }
}

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
        
      case 'CACHE_CART_DATA':
        // Handle cart data caching for offline functionality
        handleCartDataCaching(event.data.cartData);
        break;
        
      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

/**
 * Handle cart data caching for offline functionality
 */
async function handleCartDataCaching(cartData) {
  try {
    // Store cart data in a separate cache for offline access
    const cartCache = await caches.open('brasas-cart-data');
    const cartResponse = new Response(JSON.stringify(cartData), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cartCache.put('/cart-data', cartResponse);
    console.log('[SW] Cart data cached for offline access');
  } catch (error) {
    console.error('[SW] Failed to cache cart data:', error);
  }
}

/**
 * Clean up old cache entries
 */
async function cleanupCaches() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    // Remove old entries if cache is getting too large
    if (requests.length > CACHE_CONFIG.maxEntries) {
      const entriesToDelete = requests.length - CACHE_CONFIG.maxEntries;
      const oldEntries = requests.slice(0, entriesToDelete);
      
      await Promise.all(oldEntries.map(request => cache.delete(request)));
      console.log(`[SW] Cleaned up ${entriesToDelete} old cache entries`);
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

/**
 * Periodic cache cleanup
 */
setInterval(cleanupCaches, CACHE_CONFIG.maxAge);

// Log service worker registration
console.log('[SW] Service Worker script loaded');

/**
 * Push notification handler (for future use)
 */
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  // Example push notification (when you implement this feature)
  const options = {
    body: 'Tu pedido está listo para recoger!',
    icon: '/assets/images/logo/android-chrome-192x192.png',
    badge: '/assets/images/logo/favicon-32x32.png',
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Brasas El Gordo', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});