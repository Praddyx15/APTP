// This service worker is automatically registered by next-pwa
// But you can customize its behavior here

const CACHE_NAME = 'aptp-cache-v1';

// URLs to precache
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/dashboard',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/styles/globals.css',
  '/manifest.json',
];

// Install event - precache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
      })
      .then((cachesToDelete) => {
        return Promise.all(cachesToDelete.map((cacheToDelete) => {
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Special handling for API requests with background sync
const bgSyncPlugin = {
  async fetchDidFail(context) {
    // If the fetch fails, add it to the background sync queue for retry when online
    await self.registration.sync.register('apiSync');
  },
};

// Background sync for offline API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'apiSync') {
    event.waitUntil(syncOfflineRequests());
  }
});

// Function to sync offline requests when back online
async function syncOfflineRequests() {
  const offlineRequestsCache = await caches.open('aptp-offline-requests');
  const offlineRequests = await offlineRequestsCache.keys();
  
  await Promise.all(offlineRequests.map(async (request) => {
    const response = await offlineRequestsCache.match(request);
    const requestData = await response.json();
    
    try {
      // Retry the API request
      await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body,
      });
      
      // If successful, remove from offline cache
      await offlineRequestsCache.delete(request);
    } catch (error) {
      console.error('Failed to sync offline request:', error);
    }
  }));
}

// Fetch event - network-first strategy for API requests, cache-first for static assets
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // API requests - network first with offline queue
  if (event.request.url.includes('/api/')) {
    // For API POST/PUT/DELETE requests, use background sync when offline
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method)) {
      const handleApiMutation = async () => {
        try {
          return await fetch(event.request.clone());
        } catch (error) {
          // Store the request for later sync
          const offlineRequestsCache = await caches.open('aptp-offline-requests');
          const uniqueUrl = `${event.request.url}-${Date.now()}`;
          
          // Clone and prepare request data for storage
          const requestClone = event.request.clone();
          const requestData = {
            url: requestClone.url,
            method: requestClone.method,
            headers: Object.fromEntries(requestClone.headers.entries()),
            body: await requestClone.text(),
          };
          
          // Store in offline cache
          await offlineRequestsCache.put(uniqueUrl, new Response(JSON.stringify(requestData)));
          await self.registration.sync.register('apiSync');
          
          // Return a custom offline response
          return new Response(JSON.stringify({
            success: false,
            message: 'Your request has been saved and will be processed when you are back online.',
            offlineQueued: true,
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      };
      
      event.respondWith(handleApiMutation());
      return;
    }
    
    // For API GET requests, use network first with cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => 
          caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // If no cache match, return offline API response
              return new Response(JSON.stringify({
                success: false,
                message: 'You are currently offline. Please check your connection.',
                offline: true,
              }), {
                headers: { 'Content-Type': 'application/json' },
              });
            })
        )
    );
    return;
  }
  
  // For assets with hash in URL (immutable), use cache first
  if (event.request.url.includes('/_next/static/')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => cachedResponse || fetch(event.request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
            return response;
          })
        )
    );
    return;
  }
  
  // For page navigation requests, use network first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline'))
    );
    return;
  }
  
  // For all other requests, use stale-while-revalidate
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response immediately if available
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Update the cache with the new response
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
            return networkResponse;
          });
        
        return cachedResponse || fetchPromise;
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action) {
    // Handle action button clicks
    console.log(`Notification action clicked: ${event.action}`);
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        const url = event.notification.data.url;
        
        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
