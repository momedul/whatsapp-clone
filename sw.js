const CACHE_NAME = "whatsapp-clone-v1"
const urlsToCache = [
  "/",
  "/css/styles.css",
  "/js/app.js",
  "/js/auth.js",
  "/js/messaging.js",
  "/js/webrtc.js",
  "/js/groups.js",
  "/js/friends.js",
  "/js/feeds.js",
  "/js/calls.js",
  "/js/ui.js",
  "/js/config.js",
  "/js/indexeddb.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/manifest.json",
]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        console.log("Opened cache");
        await cache.addAll(urlsToCache);
      } catch (error) {
        //console.error("Caching failed during install:", error);
        caches.open(CACHE_NAME).then(async (cache) => {
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`Failed to cache: ${url}`, err);
          }
        }
      })
      }
    })
  );
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response
      }
      return fetch(event.request)
    }),
  )
})

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})

// Push notification event
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New message received",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "2",
    },
    actions: [
      {
        action: "explore",
        title: "Open Chat",
        icon: "/icons/icon-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/icon-192x192.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("WhatsApp Clone", options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"))
  }
})

// Background sync
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync())
  }
})

function doBackgroundSync() {
  // Sync pending messages when back online
  return new Promise((resolve) => {
    // This would sync with IndexedDB and Firebase
    console.log("Background sync triggered")
    resolve()
  })
}
