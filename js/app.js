// Main application initialization - No imports, using global variables,don't eclare the firebase variable again

class App {
  constructor() {
    this.isOnline = navigator.onLine
    this.init()
  }

  async init() {
    try {
      // Initialize IndexedDB
      await window.dbManager.init()
      console.log("IndexedDB initialized")

      // Initialize Firebase Auth state listener
      // This is handled in AuthManager

      // Set up online/offline listeners
      this.setupNetworkListeners()

      // Set up service worker
      this.registerServiceWorker()

      // Request notification permission
      this.requestNotificationPermission()

      // Initialize app modules after auth state is determined
      this.initializeModules()

      console.log("App initialized successfully")
    } catch (error) {
      console.error("Error initializing app:", error)
      window.utils.showToast("Failed to initialize app", "error")
    }
  }

  initializeModules() {
    // Modules will be initialized when user signs in
    // This is handled in AuthManager.onUserSignedIn()
  }

  setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true
      console.log("App is online")
      window.utils.showToast("Back online", "success")

      // Sync pending data
      if (window.currentUser) {
        window.dbManager.syncWithFirebase()
      }
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
      console.log("App is offline")
      window.utils.showToast("You are offline", "warning")
    })
  }

  async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        console.log("Service Worker registered:", registration)

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available
              if (confirm("New version available. Reload to update?")) {
                window.location.reload()
              }
            }
          })
        })
      } catch (error) {
        console.error("Service Worker registration failed:", error)
      }
    }
  }

  async requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        const permission = await Notification.requestPermission()
        console.log("Notification permission:", permission)
      } catch (error) {
        console.error("Error requesting notification permission:", error)
      }
    }
  }

  // Install prompt handling
  setupInstallPrompt() {
    let deferredPrompt

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      deferredPrompt = e

      // Show install button or banner
      this.showInstallPrompt(deferredPrompt)
    })

    window.addEventListener("appinstalled", () => {
      console.log("PWA was installed")
      window.utils.showToast("App installed successfully!", "success")
      deferredPrompt = null
    })
  }

  showInstallPrompt(deferredPrompt) {
    // You can customize this to show your own install UI
    const installButton = document.createElement("button")
    installButton.textContent = "Install App"
    installButton.className = "install-btn"
    installButton.onclick = async () => {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log("Install prompt outcome:", outcome)
      installButton.remove()
      deferredPrompt = null
    }

    document.body.appendChild(installButton)
  }

  // Background sync
  async registerBackgroundSync() {
    if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register("background-sync")
        console.log("Background sync registered")
      } catch (error) {
        console.error("Background sync registration failed:", error)
      }
    }
  }

  // Push notifications setup
  async setupPushNotifications() {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          // Subscribe to push notifications
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(window.APP_CONFIG.vapidKey),
          })
        }

        // Send subscription to server (Firebase in this case)
        if (window.currentUser && subscription) {
          await window.database.ref(`users/${window.currentUser.uid}/pushSubscription`).set({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("p256dh")))),
              auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("auth")))),
            },
          })
        }

        console.log("Push notifications set up")
      } catch (error) {
        console.error("Push notification setup failed:", error)
      }
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Error handling
  setupErrorHandling() {
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error)

      // Log to Firebase for debugging (optional)
      if (window.currentUser) {
        window.database.ref("error_logs").push({
          user_id: window.currentUser.uid,
          error: event.error.toString(),
          stack: event.error.stack,
          timestamp: window.firebase.database.ServerValue.TIMESTAMP,
          url: event.filename,
          line: event.lineno,
        })
      }
    })

    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason)

      // Prevent the default browser behavior
      event.preventDefault()

      // Show user-friendly error message
      window.utils.showToast("Something went wrong. Please try again.", "error")
    })
  }

  // Performance monitoring
  setupPerformanceMonitoring() {
    if ("performance" in window) {
      window.addEventListener("load", () => {
        setTimeout(() => {
          const perfData = window.performance.getEntriesByType("navigation")[0]
          console.log("Page load time:", perfData.loadEventEnd - perfData.loadEventStart)

          // Log performance metrics (optional)
          if (window.currentUser) {
            window.database.ref("performance_logs").push({
              user_id: window.currentUser.uid,
              load_time: perfData.loadEventEnd - perfData.loadEventStart,
              dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
              timestamp: window.firebase.database.ServerValue.TIMESTAMP,
            })
          }
        }, 0)
      })
    }
  }

  // Cleanup on app close
  cleanup() {
    // Set user offline
    if (window.currentUser) {
      window.authManager.setOnlineStatus(false)
    }

    // Close WebRTC connections
    if (window.webRTCManager) {
      window.webRTCManager.endCall()
    }

    // Clear intervals and timeouts
    // This would be handled by individual modules
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  const app = new App()
  window.app = app

  // Setup install prompt
  app.setupInstallPrompt()

  // Setup error handling
  app.setupErrorHandling()

  // Setup performance monitoring
  app.setupPerformanceMonitoring()

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    app.cleanup()
  })
})

// Global variables
window.currentUser = null
window.currentChat = null
window.currentCall = null
window.APP_CONFIG = typeof window.APP_CONFIG !== 'undefined' ? window.APP_CONFIG : { vapidKey: "your-vapid-key-here" }
window.database = typeof window.database !== 'undefined' ? window.database : { ref: () => {} } // Placeholder for Firebase database
window.firebase = typeof window.firebase !== 'undefined' ? window.firebase : { database: { ServerValue: { TIMESTAMP: Date.now() } } } // Placeholder for Firebase


// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { App, utils: window.utils };
}
