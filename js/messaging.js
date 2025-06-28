// Messaging module - No imports, using global variables, don't declare the firebase variable again

class MessagingManager {
  constructor() {
    this.messageListeners = new Map()
    this.typingTimeouts = new Map()
    this.chatListUpdateTimeouts = new Map() // Initialize chatListUpdateTimeouts here
  }

  init() {
    if (!window.currentUser) return

    // Listen for new messages
    this.listenForMessages()
  }

  listenForMessages() {
    // Listen for direct messages
    const messagesRef = window.database.ref("chats").orderByChild("chat_to").equalTo(window.currentUser.uid)

    messagesRef.on("child_added", (snapshot) => {
      this.handleNewMessage(snapshot.val())
    })

    // Also listen for messages sent by current user
    const sentMessagesRef = window.database.ref("chats").orderByChild("chat_from").equalTo(window.currentUser.uid)

    sentMessagesRef.on("child_added", (snapshot) => {
      this.handleNewMessage(snapshot.val())
    })
  }

  async handleNewMessage(message) {
    try {
      // Save to IndexedDB
      await window.dbManager.put("chats", message)

      // Update UI if chat is currently open
      if (
        window.currentChat &&
        ((message.chat_from === window.currentUser.uid && message.chat_to === window.currentChat.userId) ||
          (message.chat_from === window.currentChat.userId && message.chat_to === window.currentUser.uid))
      ) {
        // Only add to chat if it's not already there (prevent duplicates)
        const existingMessage = window.$("#chat-messages").find(`[data-message-id="${message.chat_id}"]`)
        if (existingMessage.length === 0) {
          window.UI.addMessageToChat(message)
        }
      }

      // Update chat list with animation (only for received messages and only once)
      if (message.chat_from !== window.currentUser.uid) {
        // Debounce chat list updates to prevent multiple updates for the same user
        const otherUserId = message.chat_from

        // Clear existing timeout for this user
        if (this.chatListUpdateTimeouts.has(otherUserId)) {
          clearTimeout(this.chatListUpdateTimeouts.get(otherUserId))
        }

        // Set new timeout to update chat list
        const timeout = setTimeout(async () => {
          await window.UI.updateChatListItem(message)
          this.chatListUpdateTimeouts.delete(otherUserId)
        }, 100) // Small delay to batch multiple messages

        this.chatListUpdateTimeouts.set(otherUserId, timeout)
      }

      // Mark as read if chat is open
      if (window.currentChat && message.chat_from === window.currentChat.userId) {
        this.markMessageAsRead(message.chat_id)
      }

      // Show notification if app is not focused
      if (document.hidden && message.chat_from !== window.currentUser.uid) {
        this.showNotification(message)
      }
    } catch (error) {
      console.error("Error handling new message:", error)
    }
  }

  async sendMessage(targetUserId, messageText, messageType = "text") {
    try {
      const message = {
        chat_from: window.currentUser.uid,
        chat_to: targetUserId,
        chat_msg: messageText,
        chat_type: messageType,
        chat_seen: 0,
        chat_created: Date.now(),
      }

      // Check if online
      if (navigator.onLine) {
        // Send to Firebase
        const messageRef = window.database.ref("chats").push()
        await messageRef.set({
          ...message,
          chat_id: messageRef.key,
          chat_created: firebase.database.ServerValue.TIMESTAMP,
        })

        // Save to IndexedDB
        await window.dbManager.put("chats", {
          ...message,
          chat_id: messageRef.key,
        })
      } else {
        // Save as pending message for offline support
        await window.dbManager.addPendingMessage(message)

        // Add to local chat immediately
        const tempId = window.utils.generateId()
        await window.dbManager.put("chats", {
          ...message,
          chat_id: tempId,
          pending: true,
        })

        // Only update UI for offline messages since online messages will be handled by listener
        window.UI.addMessageToChat({
          ...message,
          chat_id: tempId,
        })
      }

      // Don't update chat list here - it will be updated by the message listener
      return true
    } catch (error) {
      console.error("Error sending message:", error)
      window.utils.showToast("Failed to send message", "error")
      return false
    }
  }

  async getMessages(targetUserId, limit = 50) {
    try {
      // First try to get from IndexedDB
      const localMessages = await window.dbManager.getAll("chats")
      const filteredMessages = localMessages
        .filter(
          (msg) =>
            (msg.chat_from === window.currentUser.uid && msg.chat_to === targetUserId) ||
            (msg.chat_from === targetUserId && msg.chat_to === window.currentUser.uid),
        )
        .sort((a, b) => a.chat_created - b.chat_created)

      // If online, also fetch from Firebase for latest messages
      if (navigator.onLine) {
        const messagesRef = window.database.ref("chats").orderByChild("chat_created").limitToLast(limit)

        const snapshot = await messagesRef.once("value")
        const firebaseMessages = []

        snapshot.forEach((childSnapshot) => {
          const msg = childSnapshot.val()
          if (
            (msg.chat_from === window.currentUser.uid && msg.chat_to === targetUserId) ||
            (msg.chat_from === targetUserId && msg.chat_to === window.currentUser.uid)
          ) {
            firebaseMessages.push({
              ...msg,
              chat_id: childSnapshot.key,
            })
          }
        })

        // Merge and deduplicate messages
        const allMessages = [...filteredMessages, ...firebaseMessages]
        const uniqueMessages = allMessages.reduce((acc, msg) => {
          if (!acc.find((m) => m.chat_id === msg.chat_id)) {
            acc.push(msg)
          }
          return acc
        }, [])

        return uniqueMessages.sort((a, b) => a.chat_created - b.chat_created)
      }

      return filteredMessages
    } catch (error) {
      console.error("Error getting messages:", error)
      return []
    }
  }

  async markMessageAsRead(messageId) {
    try {
      await window.database.ref(`chats/${messageId}`).update({
        chat_seen: 1,
      })

      // Update IndexedDB
      const message = await window.dbManager.get("chats", messageId)
      if (message) {
        message.chat_seen = 1
        await window.dbManager.put("chats", message)
      }
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  }

  async markMessageAsSeen(messageId) {
    try {
      await window.database.ref(`chats/${messageId}`).update({
        chat_seen: 2, // 0 = unread, 1 = delivered, 2 = seen
        chat_seen_time: firebase.database.ServerValue.TIMESTAMP,
      })

      // Update IndexedDB
      const message = await window.dbManager.get("chats", messageId)
      if (message) {
        message.chat_seen = 2
        message.chat_seen_time = Date.now()
        await window.dbManager.put("chats", message)
      }
    } catch (error) {
      console.error("Error marking message as seen:", error)
    }
  }

  startTyping(targetUserId) {
    // Send typing indicator
    window.database.ref(`typing/${targetUserId}/${window.currentUser.uid}`).set(true)

    // Clear existing timeout
    if (this.typingTimeouts.has(targetUserId)) {
      clearTimeout(this.typingTimeouts.get(targetUserId))
    }

    // Set timeout to stop typing indicator
    const timeout = setTimeout(() => {
      this.stopTyping(targetUserId)
    }, 3000)

    this.typingTimeouts.set(targetUserId, timeout)
  }

  stopTyping(targetUserId) {
    window.database.ref(`typing/${targetUserId}/${window.currentUser.uid}`).remove()

    if (this.typingTimeouts.has(targetUserId)) {
      clearTimeout(this.typingTimeouts.get(targetUserId))
      this.typingTimeouts.delete(targetUserId)
    }
  }

  listenForTyping(targetUserId) {
    window.database.ref(`typing/${window.currentUser.uid}/${targetUserId}`).on("value", (snapshot) => {
      const isTyping = snapshot.val()
      window.UI.showTypingIndicator(isTyping)
    })
  }

  showNotification(message) {
    if ("Notification" in window && Notification.permission === "granted") {
      // Get sender info
      window.database.ref(`users/${message.chat_from}`).once("value", (snapshot) => {
        const sender = snapshot.val()
        const notification = new Notification(sender.name || "New Message", {
          body: message.chat_msg,
          icon: sender.avatar || "/icons/icon-192x192.png",
          tag: message.chat_from,
        })

        notification.onclick = () => {
          window.focus()
          window.UI.openChat(message.chat_from)
          notification.close()
        }
      })
    }
  }

  async getChatList() {
    try {
      const chats = await window.dbManager.getAll("chats")
      const chatMap = new Map()

      // Group messages by conversation
      chats.forEach((message) => {
        const otherUserId = message.chat_from === window.currentUser.uid ? message.chat_to : message.chat_from

        if (!chatMap.has(otherUserId) || message.chat_created > chatMap.get(otherUserId).chat_created) {
          chatMap.set(otherUserId, message)
        }
      })

      // Convert to array and get user info
      const chatList = []
      for (const [userId, lastMessage] of chatMap) {
        try {
          const userSnapshot = await window.database.ref(`users/${userId}`).once("value")
          const userData = userSnapshot.val()

          if (userData) {
            chatList.push({
              userId: userId,
              name: userData.name,
              avatar: userData.avatar,
              lastMessage: lastMessage.chat_msg,
              lastMessageTime: lastMessage.chat_created,
              unreadCount: await this.getUnreadCount(userId),
              isOnline: userData.isOnline,
            })
          }
        } catch (error) {
          console.error("Error getting user data for chat:", error)
        }
      }

      return chatList.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
    } catch (error) {
      console.error("Error getting chat list:", error)
      return []
    }
  }

  async getUnreadCount(userId) {
    try {
      const messages = await window.dbManager.getByIndex("chats", "chat_from", userId)
      return messages.filter((msg) => msg.chat_seen === 0).length
    } catch (error) {
      console.error("Error getting unread count:", error)
      return 0
    }
  }
}

// Initialize messaging manager
const messagingManager = new MessagingManager()
window.messagingManager = messagingManager
