// Limn Systems Portal Service Worker
// Version 1.0.0

const CACHE_NAME = 'limn-portal-v1';
const STATIC_CACHE_NAME = 'limn-portal-static-v1';
const API_CACHE_NAME = 'limn-portal-api-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/portal/',
  '/portal/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other critical assets
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/portal\/orders/,
  /\/api\/portal\/documents/,
  /\/api\/portal\/notifications/,
  /\/api\/portal\/messages/,
  /\/api\/portal\/production/,
  /\/api\/portal\/financial/,
];

// Network-first patterns (always try network first)
const NETWORK_FIRST_PATTERNS = [
  /\/api\/portal\/auth/,
  /\/api\/portal\/analytics/,
  /\/api\/portal\/errors/,
];

// Cache-first patterns (serve from cache if available)
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?)$/,
  /\/icons\//,
  /\/images\//,
];

self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('limn-portal-') && 
              ![CACHE_NAME, STATIC_CACHE_NAME, API_CACHE_NAME].includes(cacheName)
            )
            .map(cacheName => {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip external requests
  if (url.origin !== self.location.origin) return;
  
  // Skip if not in portal scope
  if (!url.pathname.startsWith('/portal') && !url.pathname.startsWith('/api/portal')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Authentication requests - always network first
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirst(request);
    }
    
    // Static assets - cache first
    if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await cacheFirst(request);
    }
    
    // API requests - network first with cache fallback
    if (url.pathname.startsWith('/api/portal')) {
      return await networkFirstApiCache(request);
    }
    
    // Portal pages - network first with cache fallback
    if (url.pathname.startsWith('/portal')) {
      return await networkFirstPageCache(request);
    }
    
    // Default to network
    return await fetch(request);
    
  } catch (error) {
    console.error('Service Worker: Fetch error', error);
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/portal/offline');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    // Return cached response if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return generic offline response
    return new Response('Network error', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || Promise.reject(error);
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return Promise.reject(error);
  }
}

async function networkFirstApiCache(request) {
  const url = new URL(request.url);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests to specific endpoints
    if (networkResponse.status === 200 && 
        API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      const cache = await caches.open(API_CACHE_NAME);
      const clonedResponse = networkResponse.clone();
      
      // Add timestamp to track cache freshness
      const responseWithTimestamp = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: {
          ...clonedResponse.headers,
          'sw-cached-at': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithTimestamp);
    }
    
    return networkResponse;
  } catch (error) {
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check cache freshness (5 minutes for API data)
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const isStale = cachedAt && (Date.now() - parseInt(cachedAt) > 5 * 60 * 1000);
      
      if (!isStale) {
        // Add offline indicator header
        const headers = new Headers(cachedResponse.headers);
        headers.set('sw-offline-response', 'true');
        
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers
        });
      }
    }
    
    return Promise.reject(error);
  }
}

async function networkFirstPageCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful page responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Serve from cache if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Serve offline page for navigation requests
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/portal/offline');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    return Promise.reject(error);
  }
}

// Background sync for analytics and error reporting
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync', event.tag);
  
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  } else if (event.tag === 'error-sync') {
    event.waitUntil(syncErrors());
  }
});

async function syncAnalytics() {
  try {
    // Get queued analytics data from IndexedDB or localStorage
    const queuedAnalytics = await getQueuedData('analytics');
    
    if (queuedAnalytics.length > 0) {
      console.log(`📊 Service Worker: Syncing ${queuedAnalytics.length} analytics events`);
      
      for (const data of queuedAnalytics) {
        await fetch('/api/portal/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
      
      // Clear queued data after successful sync
      await clearQueuedData('analytics');
    }
  } catch (error) {
    console.error('Service Worker: Analytics sync failed', error);
  }
}

async function syncErrors() {
  try {
    const queuedErrors = await getQueuedData('errors');
    
    if (queuedErrors.length > 0) {
      console.log(`🚨 Service Worker: Syncing ${queuedErrors.length} error reports`);
      
      for (const data of queuedErrors) {
        await fetch('/api/portal/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
      
      await clearQueuedData('errors');
    }
  } catch (error) {
    console.error('Service Worker: Error sync failed', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('📱 Service Worker: Push received');
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Limn Systems', options)
  );
});

// Notification clicks
self.addEventListener('notificationclick', event => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/portal/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes('/portal') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// Utility functions for queued data management
async function getQueuedData() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function clearQueuedData() {
  // This would typically clear IndexedDB
  // Implementation depends on your queuing strategy
}

// Periodic cache cleanup
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    event.waitUntil(cleanupCache());
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function cleanupCache() {
  const cacheWhitelist = [CACHE_NAME, STATIC_CACHE_NAME, API_CACHE_NAME];
  const cacheNames = await caches.keys();
  
  await Promise.all(
    cacheNames.map(cacheName => {
      if (!cacheWhitelist.includes(cacheName)) {
        console.log('🗑️ Service Worker: Deleting cache', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

console.log('✅ Service Worker: Loaded successfully');