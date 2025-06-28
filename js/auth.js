// Authentication module - No imports, using global variables,don't eclare the firebase variable again

class AuthManager {
  constructor() {
    this.currentUser = null
    this.googleProvider = new firebase.auth.GoogleAuthProvider()
    this.init()
  }

  init() {
    // Configure Google provider
    this.googleProvider.addScope("email")
    this.googleProvider.addScope("profile")

    // Listen for auth state changes
    window.auth.onAuthStateChanged((user) => {
      if (user) {
        this.currentUser = user
        window.currentUser = user
        this.onUserSignedIn(user)
      } else {
        this.currentUser = null
        window.currentUser = null
        this.onUserSignedOut()
      }
    })
  }

  async signUp(email, password, name) {
    try {
      // Create user account
      const userCredential = await window.auth.createUserWithEmailAndPassword(email, password)
      const user = userCredential.user

      // Update profile
      await user.updateProfile({
        displayName: name,
      })

      // Save user data to Firebase Database
      await this.saveUserData(user, name)

      // Save to IndexedDB
      await window.dbManager.put("users", {
        user_id: user.uid,
        user_name: name,
        user_login: email,
        user_email: email,
        user_status: "active",
        user_created: Date.now(),
      })

      // Save user metadata
      await this.saveUserMeta(user.uid, "status", "Hey there! I am using WhatsApp Clone.")
      await this.saveUserMeta(user.uid, "avatar", "/placeholder.svg?height=100&width=100")

      window.utils.showToast("Account created successfully!", "success")
      return user
    } catch (error) {
      console.error("Sign up error:", error)
      window.utils.showToast(error.message, "error")
      throw error
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await window.auth.signInWithEmailAndPassword(email, password)
      window.utils.showToast("Signed in successfully!", "success")
      return userCredential.user
    } catch (error) {
      console.error("Sign in error:", error)
      window.utils.showToast(error.message, "error")
      throw error
    }
  }

  async signInWithGoogle() {
    try {
      const result = await window.auth.signInWithPopup(this.googleProvider)
      const user = result.user

      // Check if this is a new user
      const userSnapshot = await window.database.ref(`users/${user.uid}`).once("value")

      if (!userSnapshot.exists()) {
        // New user - save their data
        await this.saveUserData(user, user.displayName || user.email.split("@")[0])

        // Save to IndexedDB
        await window.dbManager.put("users", {
          user_id: user.uid,
          user_name: user.displayName || user.email.split("@")[0],
          user_login: user.email,
          user_email: user.email,
          user_status: "active",
          user_created: Date.now(),
        })

        // Save user metadata
        await this.saveUserMeta(user.uid, "status", "Hey there! I am using WhatsApp Clone.")
        await this.saveUserMeta(user.uid, "avatar", user.photoURL || "/placeholder.svg?height=100&width=100")

        window.utils.showToast("Account created with Google!", "success")
      } else {
        window.utils.showToast("Signed in with Google!", "success")
      }

      return user
    } catch (error) {
      console.error("Google sign in error:", error)
      window.utils.showToast(error.message, "error")
      throw error
    }
  }

  async signOut() {
    try {
      await window.auth.signOut()
      window.utils.showToast("Signed out successfully!", "success")
    } catch (error) {
      console.error("Sign out error:", error)
      window.utils.showToast(error.message, "error")
      throw error
    }
  }

  async saveUserData(user, name) {
    const userData = {
      uid: user.uid,
      name: name,
      email: user.email,
      status: "Hey there! I am using WhatsApp Clone.",
      avatar: user.photoURL || "/placeholder.svg?height=100&width=100",
      lastSeen: firebase.database.ServerValue.TIMESTAMP,
      isOnline: true,
    }

    await window.database.ref(`users/${user.uid}`).set(userData)
  }

  async saveUserMeta(userId, key, value) {
    await window.dbManager.put("usermeta", {
      umeta_user: userId,
      umeta_key: key,
      umeta_value: value,
    })

    // Also save to Firebase
    await window.database.ref(`users/${userId}/${key}`).set(value)
  }

  async getUserMeta(userId, key) {
    try {
      const snapshot = await window.database.ref(`users/${userId}/${key}`).once("value")
      return snapshot.val()
    } catch (error) {
      console.error("Error getting user meta:", error)
      return null
    }
  }

  async updateProfile(name, status, avatarFile = null) {
    try {
      if (!this.currentUser) throw new Error("No user signed in")

      let avatarUrl = null

      // Upload avatar if provided
      if (avatarFile) {
        avatarUrl = await this.uploadAvatar(avatarFile)
      }

      // Update Firebase Auth profile
      const updates = { displayName: name }
      if (avatarUrl) updates.photoURL = avatarUrl

      await this.currentUser.updateProfile(updates)

      // Update Firebase Database
      const userSnapshot = await window.database.ref(`users/${this.currentUser.uid}`).once("value")
      const usersData = userSnapshot.exists() ? userSnapshot.val() : null
      const isOnline = usersData && typeof usersData.isOnline != "undefined" ? usersData.isOnline : true

      const userUpdates = {
        name: name,
        status: status,
        uid: this.currentUser.uid,
        email: usersData && typeof usersData.email != "undefined" ? usersData.email : this.currentUser.email,
        avatar:
          usersData && typeof usersData.avatar != "undefined"
            ? usersData.avatar
            : this.currentUser.photoURL || "/placeholder.svg?height=100&width=100",
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        isOnline: isOnline,
      }
      if (avatarUrl) userUpdates.avatar = avatarUrl

      await window.database.ref(`users/${this.currentUser.uid}`).update(userUpdates)

      // Update IndexedDB
      await window.dbManager.put("users", {
        user_id: this.currentUser.uid,
        user_name: name,
        user_login: this.currentUser.email,
        user_email: this.currentUser.email,
        user_status: "active",
        user_created: Date.now(),
      })

      await this.saveUserMeta(this.currentUser.uid, "status", status)
      if (avatarUrl) {
        await this.saveUserMeta(this.currentUser.uid, "avatar", avatarUrl)
      }

      window.utils.showToast("Profile updated successfully!", "success")
      return true
    } catch (error) {
      console.error("Profile update error:", error)
      window.utils.showToast(error.message, "error")
      throw error
    }
  }

  async uploadAvatar(file) {
    try {
      const storageRef = window.storage.ref(`avatars/${this.currentUser.uid}/${Date.now()}`)
      const snapshot = await storageRef.put(file)
      const downloadURL = await snapshot.ref.getDownloadURL()
      return downloadURL
    } catch (error) {
      console.error("Avatar upload error:", error)
      throw error
    }
  }

  async setOnlineStatus(isOnline) {
    if (!this.currentUser) return

    try {
      const userSnapshot = await window.database.ref(`users/${this.currentUser.uid}`).once("value")
      const usersData = userSnapshot.exists() ? userSnapshot.val() : null
      await window.database.ref(`users/${this.currentUser.uid}`).update({
        uid: this.currentUser.uid,
        name: usersData && typeof usersData.name != "undefined" ? usersData.name : this.currentUser.displayName,
        email: usersData && typeof usersData.email != "undefined" ? usersData.email : this.currentUser.email,
        status:
          usersData && typeof usersData.status != "undefined"
            ? usersData.status
            : "Hey there! I am using WhatsApp Clone.",
        avatar:
          usersData && typeof usersData.avatar != "undefined"
            ? usersData.avatar
            : this.currentUser.photoURL || "/placeholder.svg?height=100&width=100",
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        isOnline: isOnline,
      })
    } catch (error) {
      console.error("Error setting online status:", error)
    }
  }

  onUserSignedIn(user) {
    // Set online status
    this.setOnlineStatus(true)

    // Set up presence system
    const userStatusRef = window.database.ref(`users/${user.uid}/isOnline`)
    const connectedRef = window.database.ref(".info/connected")

    connectedRef.on("value", (snapshot) => {
      if (snapshot.val() === true) {
        userStatusRef.onDisconnect().set(false)
        userStatusRef.set(true)
      }
    })

    // Show main screen
    window.UI.showScreen("main-screen")
    window.UI.loadUserProfile()

    // Initialize other modules
    if (window.messagingManager) window.messagingManager.init()
    if (window.friendsManager) window.friendsManager.init()
    if (window.groupsManager) window.groupsManager.init()
    if (window.feedsManager) window.feedsManager.init()
    if (window.callsManager) window.callsManager.init()
    if (window.webRTCManager) window.webRTCManager.reinitialize()

    // Sync with IndexedDB
    if (window.dbManager) window.dbManager.syncWithFirebase()
  }

  onUserSignedOut() {
    // Show auth screen
    window.UI.showScreen("auth-screen")

    // Clean up
    if (this.currentUser) {
      this.setOnlineStatus(false)
    }

    // Reset global variables
    window.currentUser = null
    window.currentChat = null
    window.currentCall = null
  }
}

// Initialize auth manager
const authManager = new AuthManager()
window.authManager = authManager
