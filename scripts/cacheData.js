const cacheName = 'leaflet-tiles-cache';

// Install event - pre-cache some assets if necessary
self.addEventListener('install', event => {
    console.log('Service Worker installed.');
});

// Fetch event - intercept requests and serve from Cache Storage
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('Serving from cache:', event.request.url);
                    return response; // Serve from cache
                }
                console.log('Fetching from network:', event.request.url);
                return fetch(event.request); // Fetch from network
            })
            .catch(err => {
                console.error('Fetch failed:', err);
                throw err;
            })
    );
});
