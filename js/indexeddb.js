// IndexedDB for local storage and offline support
class IndexedDBManager {
  constructor() {
    this.dbName = "WhatsAppCloneDB"
    this.version = 1
    this.db = null
    this.currentUser = null // Declare currentUser variable
    this.database = null // Declare database variable
    this.firebase = null // Declare firebase variable
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Users store
        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", { keyPath: "user_id" })
          userStore.createIndex("user_email", "user_email", { unique: true })
          userStore.createIndex("user_login", "user_login", { unique: true })
        }

        // User metadata store
        if (!db.objectStoreNames.contains("usermeta")) {
          const usermetaStore = db.createObjectStore("usermeta", { keyPath: "umeta_id", autoIncrement: true })
          usermetaStore.createIndex("umeta_user", "umeta_user")
          usermetaStore.createIndex("umeta_key", "umeta_key")
        }

        // Friends store
        if (!db.objectStoreNames.contains("friends")) {
          const friendsStore = db.createObjectStore("friends", { keyPath: "frnd_id", autoIncrement: true })
          friendsStore.createIndex("frnd_user", "frnd_user")
          friendsStore.createIndex("frnd_user2", "frnd_user2")
          friendsStore.createIndex("frnd_status", "frnd_status")
        }

        // Groups store
        if (!db.objectStoreNames.contains("groups")) {
          const groupsStore = db.createObjectStore("groups", { keyPath: "group_id", autoIncrement: true })
          groupsStore.createIndex("group_status", "group_status")
        }

        // Group members store
        if (!db.objectStoreNames.contains("group_members")) {
          const groupMembersStore = db.createObjectStore("group_members", { keyPath: "gm_id", autoIncrement: true })
          groupMembersStore.createIndex("gm_group", "gm_group")
          groupMembersStore.createIndex("gm_user", "gm_user")
        }

        // Chats store
        if (!db.objectStoreNames.contains("chats")) {
          const chatsStore = db.createObjectStore("chats", { keyPath: "chat_id", autoIncrement: true })
          chatsStore.createIndex("chat_from", "chat_from")
          chatsStore.createIndex("chat_to", "chat_to")
          chatsStore.createIndex("chat_created", "chat_created")
        }

        // Feeds store
        if (!db.objectStoreNames.contains("feeds")) {
          const feedsStore = db.createObjectStore("feeds", { keyPath: "feed_id", autoIncrement: true })
          feedsStore.createIndex("feed_user", "feed_user")
          feedsStore.createIndex("feed_created", "feed_created")
        }

        // Calls store
        if (!db.objectStoreNames.contains("calls")) {
          const callsStore = db.createObjectStore("calls", { keyPath: "call_id", autoIncrement: true })
          callsStore.createIndex("call_from", "call_from")
          callsStore.createIndex("call_to", "call_to")
          callsStore.createIndex("call_created", "call_created")
        }

        // Pending messages store (for offline support)
        if (!db.objectStoreNames.contains("pending_messages")) {
          const pendingStore = db.createObjectStore("pending_messages", { keyPath: "id", autoIncrement: true })
          pendingStore.createIndex("timestamp", "timestamp")
        }
      }
    })
  }

  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.add(data)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Sync methods
  async syncWithFirebase() {
    try {
      if (!this.currentUser) return

      // Sync pending messages
      const pendingMessages = await this.getAll("pending_messages")
      for (const message of pendingMessages) {
        try {
          await this.sendMessageToFirebase(message)
          await this.delete("pending_messages", message.id)
        } catch (error) {
          console.error("Failed to sync message:", error)
        }
      }

      console.log("Sync completed")
    } catch (error) {
      console.error("Sync failed:", error)
    }
  }

  async sendMessageToFirebase(message) {
    const messageRef = this.database.ref("chats").push()
    await messageRef.set({
      chat_from: message.chat_from,
      chat_to: message.chat_to,
      chat_msg: message.chat_msg,
      chat_type: message.chat_type,
      chat_seen: 0,
      chat_created: this.firebase.database.ServerValue.TIMESTAMP,
    })
  }

  async addPendingMessage(message) {
    await this.add("pending_messages", {
      ...message,
      timestamp: Date.now(),
    })
  }
}

// Initialize IndexedDB
const dbManager = new IndexedDBManager()
window.dbManager = dbManager

// Example usage of setting currentUser, database, and firebase
// dbManager.currentUser = { user_id: 1, user_email: 'user@example.com' };
// dbManager.database = firebase.database(); // Assuming firebase is already imported
// dbManager.firebase = firebase; // Assuming firebase is already imported
