// Firebase Configuration - No imports, using global firebase from CDN
const firebase = window.firebase // Declare the firebase variable
const firebaseConfig = {
  apiKey: "AIzaSyDrocO5ZKzfU4JITWrHE7eRqebXJjURx9k",
  authDomain: "whatsapp-chat-2a1d9.firebaseapp.com",
  databaseURL: "https://whatsapp-chat-2a1d9-default-rtdb.firebaseio.com",
  projectId: "whatsapp-chat-2a1d9",
  storageBucket: "whatsapp-chat-2a1d9.firebasestorage.app",
  messagingSenderId: "475699400065",
  appId: "1:475699400065:web:0ffff5d3b53f6f62b02c80",
}

// App configuration
const APP_CONFIG = {
  name: "WhatsApp Clone",
  version: "1.0.0",
  vapidKey: "BDqa6pCGO8sWcrtoj1OL1_aAWJ3-UdVJESYX9qvGx88EmxvH5pbcfvdsV4om4N9ms09IBduMZRUWW42-wZzXlqs",
  rtcConfiguration: {
    iceServers: [
      // Google STUN servers (most reliable)
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },

      // Cloudflare STUN servers
      { urls: "stun:stun.cloudflare.com:3478" },

      // Mozilla STUN servers
      { urls: "stun:stun.services.mozilla.com" },

      // Additional reliable STUN servers
      { urls: "stun:stun.ekiga.net" },
      { urls: "stun:stun.ideasip.com" },
      { urls: "stun:stun.rixtelecom.se" },
      { urls: "stun:stun.schlund.de" },
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.voiparound.com" },
      { urls: "stun:stun.voipbuster.com" },

      // Backup STUN servers
      { urls: "stun:openrelay.metered.ca:80" },
      { urls: "stun:relay.metered.ca:80" },
    ],
    iceCandidatePoolSize: 10,
  },
}

// Global variables
window.currentUser = null
window.currentChat = null
window.currentCall = null
window.localStream = null
window.remoteStream = null
window.peerConnection = null

// Utility functions
window.utils = {
  generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),

  formatTime: (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return "now"
    if (diff < 3600000) return Math.floor(diff / 60000) + "m"
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h"
    if (diff < 604800000) return Math.floor(diff / 86400000) + "d"

    return date.toLocaleDateString()
  },

  formatDate: (timestamp) => {
    return new Date(timestamp).toLocaleString()
  },

  sanitizeHtml: (text) => {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  },

  showToast: (message, type = "info") => {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll(".toast")
    existingToasts.forEach((toast) => toast.remove())

    // Create toast notification
    const toast = document.createElement("div")
    toast.className = `toast toast-${type}`
    toast.style.position = "fixed"
    toast.style.top = "20px"
    toast.style.right = "20px"
    toast.style.background =
      type === "success" ? "#25d366" : type === "error" ? "#dc3545" : type === "warning" ? "#ffc107" : "#007bff"
    toast.style.color = "white"
    toast.style.padding = "12px 20px"
    toast.style.borderRadius = "8px"
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"
    toast.style.zIndex = "10000"
    toast.style.animation = "slideInRight 0.3s ease"
    toast.textContent = message

    // Add to DOM
    document.body.appendChild(toast)

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.display = "none"
      toast.remove()
    }, 3000)
  },

  debounce: (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  throttle: (func, limit) => {
    let inThrottle
    return function () {
      const args = arguments

      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  },

  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  compressImage: (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(resolve, "image/jpeg", quality)
      }

      img.src = URL.createObjectURL(file)
    })
  },
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Firebase services
const auth = firebase.auth()
const database = firebase.database()
const storage = firebase.storage()

// Export for use in other modules
window.APP_CONFIG = APP_CONFIG
window.auth = auth
window.database = database
window.storage = storage
