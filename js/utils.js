// Global utility functions - No imports, using global variables,don't eclare the firebase variable again

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
