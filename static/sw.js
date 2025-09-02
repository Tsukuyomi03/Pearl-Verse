/**
 * PEARL VERSE - SERVICE WORKER
 * Basic service worker for PWA functionality
 */

const CACHE_NAME = 'pearl-verse-v1';
const STATIC_ASSETS = [
    '/',
    '/static/css/style.css',
    '/static/js/script.js',
    '/static/images/avatar-placeholder.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => {
                console.error('Service Worker: Failed to cache assets:', err);
            })
    );
    
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Claim control of all open pages
    self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(err => {
                console.error('Service Worker: Fetch failed:', err);
                // Return a basic offline page or fallback response
                if (event.request.destination === 'document') {
                    return new Response(
                        '<h1>Offline</h1><p>You are currently offline. Please check your connection.</p>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                }
            })
    );
});

// Background sync (if needed for offline functionality)
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('Service Worker: Background sync triggered');
        // Handle background sync tasks here
    }
});

// Push notifications (if needed)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'New notification from Pearl Verse',
            icon: '/static/images/avatar-placeholder.png',
            badge: '/static/images/avatar-placeholder.png',
            vibrate: [200, 100, 200],
            data: {
                url: data.url || '/'
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'Pearl Verse', options)
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
