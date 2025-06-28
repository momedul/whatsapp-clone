// UI management module - No imports, using global variables,don't eclare the firebase variable again

class UI {
  constructor() {
    this.currentScreen = "loading-screen"
    this.currentTab = "chats"
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.hideLoadingScreen()
  }

  setupEventListeners() {
    // Auth form handlers
    window.$(document).on("submit", "#login-form", (e) => this.handleLogin(e))
    window.$(document).on("submit", "#signup-form", (e) => this.handleSignup(e))
    window.$(document).on("click", ".auth-tab", (e) => this.switchAuthTab(e))

    // Google Auth handlers
    window.$(document).on("click", "#google-login-btn", () => this.handleGoogleLogin())
    window.$(document).on("click", "#google-signup-btn", () => this.handleGoogleSignup())

    // Navigation handlers
    window.$(document).on("click", ".nav-tab", (e) => this.switchTab(e))
    window.$(document).on("click", "#chat-back-btn", () => this.showScreen("main-screen"))

    // Modal handlers
    window.$(document).on("click", "[data-modal]", (e) => this.toggleModal(e))
    window.$(document).on("click", ".modal-close", (e) => this.closeModal(e))
    window.$(document).on("click", ".modal-overlay", (e) => this.closeModalOnOverlay(e))

    // Profile handlers
    window.$(document).on("click", "#edit-profile-btn", () => this.openProfileModal())
    window.$(document).on("click", "#save-profile-btn", () => this.saveProfile())
    window.$(document).on("click", "#change-image-btn", () => window.$("#profile-image-input").click())
    window.$(document).on("change", "#profile-image-input", (e) => this.handleProfileImageChange(e))

    // Friends handlers
    window.$(document).on("click", "#friends-btn", () => this.openFriendsModal())
    window.$(document).on("click", ".friends-tab", (e) => this.switchFriendsTab(e))
    window.$(document).on("click", "#send-friend-request-btn", () => this.sendFriendRequest())
    window.$(document).on("click", ".accept-btn", (e) => this.acceptFriendRequest(e))
    window.$(document).on("click", ".decline-btn", (e) => this.declineFriendRequest(e))
    window.$(document).on("click", ".message-friend-btn", (e) => this.messageFriend(e))
    window.$(document).on("click", ".call-friend-btn", (e) => this.callFriend(e))

    // Chat handlers
    window.$(document).on("click", ".chat-item", (e) => this.openChat(e))
    window.$(document).on("click", "#send-btn", () => this.sendMessage())
    window.$(document).on("keypress", "#message-input", (e) => this.handleMessageKeypress(e))
    window.$(document).on("click", "#new-chat-btn", () => this.showNewChatOptions())

    // Group handlers
    window.$(document).on("click", "#new-group-btn", () => this.openNewGroupModal())
    window.$(document).on("click", "#create-group-btn", () => this.createGroup())

    // Feed handlers
    window.$(document).on("click", "#new-feed-btn", () => this.openNewFeedModal())
    window.$(document).on("click", "#post-feed-btn", () => this.postFeed())
    window.$(document).on("click", "#feed-image-btn", () => window.$("#feed-image-input").click())
    window.$(document).on("change", "#feed-image-input", (e) => this.handleFeedImageChange(e))
    window.$(document).on("click", "#remove-feed-image", () => this.removeFeedImage())
    window.$(document).on("click", ".feed-action-btn", (e) => this.handleFeedAction(e))

    // Call handlers
    window.$(document).on("click", "#voice-call-btn", () => this.makeVoiceCall())
    window.$(document).on("click", "#video-call-btn", () => this.makeVideoCall())
    window.$(document).on("click", "#end-call-btn", () => this.endCall())
    window.$(document).on("click", "#mute-btn", () => this.toggleMute())
    window.$(document).on("click", "#speaker-btn", () => this.toggleSpeaker())
    window.$(document).on("click", "#call-video-btn", () => this.toggleVideo())

    // Settings handlers
    window.$(document).on("click", "#logout-btn", () => this.logout())

    // Search handler
    window.$(document).on("click", "#search-btn", () => this.toggleSearch())
    window.$(document).on("input", ".search-input", (e) => this.handleSearch(e))

    // Call action handlers for call history
    window.$(document).on("click", ".call-action-btn", (e) => this.makeCallFromHistory(e))

    // Message bubble click handler
    window.$(document).on("click", ".message-bubble", (e) => this.toggleMessageSeenTime(e))

    // Group chat handlers
    window.$(document).on("click", ".group-item", (e) => this.openGroupChat(e))
  }

  hideLoadingScreen() {
    window.setTimeout(() => {
      window.$("#loading-screen").addClass("hidden")
      if (window.currentUser) {
        this.showScreen("main-screen")
      } else {
        this.showScreen("auth-screen")
      }
    }, 2000)
  }

  showScreen(screenId) {
    window.$(".screen").addClass("hidden")
    window.$(`#${screenId}`).removeClass("hidden")
    this.currentScreen = screenId
  }

  // Auth methods
  async handleLogin(e) {
    e.preventDefault()
    const email = window.$("#login-email").val()
    const password = window.$("#login-password").val()

    try {
      await window.authManager.signIn(email, password)
    } catch (error) {
      console.error("Login error:", error)
    }
  }

  async handleSignup(e) {
    e.preventDefault()
    const name = window.$("#signup-name").val()
    const email = window.$("#signup-email").val()
    const password = window.$("#signup-password").val()

    try {
      await window.authManager.signUp(email, password, name)
    } catch (error) {
      console.error("Signup error:", error)
    }
  }

  async handleGoogleLogin() {
    try {
      await window.authManager.signInWithGoogle()
    } catch (error) {
      console.error("Google login error:", error)
    }
  }

  async handleGoogleSignup() {
    try {
      await window.authManager.signInWithGoogle()
    } catch (error) {
      console.error("Google signup error:", error)
    }
  }

  switchAuthTab(e) {
    const tab = window.$(e.target).data("tab")
    window.$(".auth-tab").removeClass("active")
    window.$(e.target).addClass("active")

    window.$(".auth-form").addClass("hidden")
    window.$(`#${tab}-form`).removeClass("hidden")
  }

  // Navigation methods
  switchTab(e) {
    const tab = window.$(e.target).closest(".nav-tab").data("tab")
    window.$(".nav-tab").removeClass("active")
    window.$(e.target).closest(".nav-tab").addClass("active")

    window.$(".tab-pane").removeClass("active")
    window.$(`#${tab}-content`).addClass("active")

    this.currentTab = tab
    this.loadTabContent(tab)
  }

  loadTabContent(tab) {
    switch (tab) {
      case "chats":
        this.loadChatList()
        break
      case "groups":
        this.loadGroupsList()
        break
      case "calls":
        this.loadCallHistory()
        break
      case "feeds":
        this.loadFeedsList()
        break
      case "settings":
        this.loadUserProfile()
        break
    }
  }

  // Modal methods
  toggleModal(e) {
    const modalId = window.$(e.target).data("modal")
    if (modalId) {
      this.openModal(modalId)
    } else {
      this.closeModal(e)
    }
  }

  openModal(modalId) {
    window.$("#modal-overlay").removeClass("hidden")
    window.$(".modal").addClass("hidden")
    window.$(`#${modalId}`).removeClass("hidden")
  }

  closeModal(e) {
    const modalId = window.$(e.target).data("modal") || window.$(e.target).closest("[data-modal]").data("modal")
    if (modalId) {
      window.$(`#${modalId}`).addClass("hidden")
      window.$("#modal-overlay").addClass("hidden")
    }
  }

  closeModalOnOverlay(e) {
    if (e.target === e.currentTarget) {
      window.$(".modal").addClass("hidden")
      window.$("#modal-overlay").addClass("hidden")
    }
  }

  // Profile methods
  openProfileModal() {
    if (window.currentUser) {
      window.$("#edit-profile-name").val(window.currentUser.displayName || "")
      window.$("#edit-profile-status").val("Hey there! I am using WhatsApp Clone.")
      window
        .$("#edit-profile-image")
        .attr("src", window.currentUser.photoURL || "/placeholder.svg?height=100&width=100")
      this.openModal("profile-modal")
    }
  }

  async saveProfile() {
    const name = window.$("#edit-profile-name").val()
    const status = window.$("#edit-profile-status").val()
    const imageFile = window.$("#profile-image-input")[0].files[0]

    try {
      await window.authManager.updateProfile(name, status, imageFile)
      this.closeModal({ target: { dataset: { modal: "profile-modal" } } })
      this.loadUserProfile()
    } catch (error) {
      console.error("Error saving profile:", error)
    }
  }

  handleProfileImageChange(e) {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        window.$("#edit-profile-image").attr("src", e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  async loadUserProfile() {
    if (window.currentUser) {
      window.$("#profile-name").text(window.currentUser.displayName || "User")
      window.$("#profile-image").attr("src", window.currentUser.photoURL || "/placeholder.svg?height=60&width=60")

      // Load status from Firebase
      try {
        const status = await window.authManager.getUserMeta(window.currentUser.uid, "status")
        window.$("#profile-status").text(status || "Hey there! I am using WhatsApp Clone.")
      } catch (error) {
        console.error("Error loading user status:", error)
      }
    }
  }

  // Friends methods
  openFriendsModal() {
    this.openModal("friends-modal")
    // Load friends data when modal opens
    if (window.friendsManager) {
      window.friendsManager.loadFriends()
      window.friendsManager.loadFriendRequests()
    }
  }

  sendFriendRequest() {
    const email = window.$("#friend-email-input").val().trim()
    if (email && window.utils.isValidEmail(email)) {
      window.friendsManager.sendFriendRequest(email)
      window.$("#friend-email-input").val("")
    } else {
      window.utils.showToast("Please enter a valid email address", "error")
    }
  }

  acceptFriendRequest(e) {
    const requestId = window.$(e.target).data("request-id")
    const fromUserId = window.$(e.target).data("from-user-id")
    if (requestId && fromUserId) {
      window.friendsManager.acceptFriendRequest(requestId, fromUserId)
    }
  }

  declineFriendRequest(e) {
    const requestId = window.$(e.target).data("request-id")
    if (requestId) {
      window.friendsManager.declineFriendRequest(requestId)
    }
  }

  messageFriend(e) {
    const userId = window.$(e.target).data("user-id")
    if (userId) {
      this.closeModal({ target: { dataset: { modal: "friends-modal" } } })
      this.openChat(userId)
    }
  }

  callFriend(e) {
    const userId = window.$(e.target).data("user-id")
    const callType = window.$(e.target).data("call-type") || "voice"
    if (userId) {
      this.closeModal({ target: { dataset: { modal: "friends-modal" } } })
      if (callType === "video") {
        window.callsManager.makeCall(userId, true)
      } else {
        window.callsManager.makeCall(userId, false)
      }
    }
  }

  switchFriendsTab(e) {
    const tab = window.$(e.target).data("tab")
    window.$(".friends-tab").removeClass("active")
    window.$(e.target).addClass("active")

    window.$(".friends-content").removeClass("active")
    window.$(`#${tab}`).addClass("active")
  }

  updateFriendsList(friends) {
    const friendsContainer = window.$("#friends-list-container")
    friendsContainer.empty()

    if (friends.length === 0) {
      friendsContainer.html(`
      <div class="empty-state">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.01 3.01 0 0 0 16.5 6.5c-.83 0-1.58.34-2.12.89L12 10.5 9.62 7.39C9.08 6.84 8.33 6.5 7.5 6.5c-1.31 0-2.42.83-2.83 2L2.5 16H5v6h14z"/>
        </svg>
        <h3>No friends yet</h3>
        <p>Add friends to start chatting</p>
      </div>
    `)
      return
    }

    friends.forEach((friend) => {
      const friendItem = window.$(`
      <div class="friend-item">
        <div class="friend-avatar">
          <img src="${friend.avatar || "/placeholder.svg?height=40&width=40"}" alt="${friend.name}">
          ${friend.isOnline ? '<div class="online-indicator"></div>' : ""}
        </div>
        <div class="friend-info">
          <div class="friend-name">${friend.name}</div>
          <div class="friend-status">${friend.isOnline ? "Online" : `Last seen ${window.utils.formatTime(friend.lastSeen)}`}</div>
        </div>
        <div class="friend-actions">
          <button class="friend-action-btn message-btn-large message-friend-btn" data-user-id="${friend.user_id}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .4-.1.5-.2L14.5 18H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            Message
          </button>
        </div>
      </div>
    `)
      friendsContainer.append(friendItem)
    })
  }

  updateFriendRequests(requests) {
    const requestsContainer = window.$("#friend-requests-container")
    requestsContainer.empty()

    if (requests.length === 0) {
      requestsContainer.html(`
        <div class="empty-state">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <h3>No friend requests</h3>
          <p>You have no pending friend requests</p>
        </div>
      `)
      return
    }

    requests.forEach((request) => {
      const requestItem = window.$(`
        <div class="friend-item">
          <div class="friend-avatar">
            <img src="${request.avatar || "/placeholder.svg?height=40&width=40"}" alt="${request.name}">
          </div>
          <div class="friend-info">
            <div class="friend-name">${request.name}</div>
            <div class="friend-status">Wants to be your friend</div>
          </div>
          <div class="friend-actions">
            <button class="friend-action-btn accept-btn" data-request-id="${request.requestId}" data-from-user-id="${request.user_id}">
              Accept
            </button>
            <button class="friend-action-btn decline-btn" data-request-id="${request.requestId}">
              Decline
            </button>
          </div>
        </div>
      `)
      requestsContainer.append(requestItem)
    })
  }

  // Chat methods
  async loadChatList() {
    try {
      const chats = await window.messagingManager.getChatList()
      this.updateChatList(chats)
    } catch (error) {
      console.error("Error loading chat list:", error)
    }
  }

  updateChatList(chats = []) {
    const chatListContainer = window.$("#chat-list")
    chatListContainer.empty()

    if (chats.length === 0) {
      chatListContainer.html(`
        <div class="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .4-.1.5-.2L14.5 18H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <h3>No chats yet</h3>
          <p>Start a conversation with your friends</p>
        </div>
      `)
      return
    }

    chats.forEach((chat) => {
      const chatItem = window.$(`
        <div class="chat-item" data-user-id="${chat.userId}">
          <div class="chat-avatar">
            <img src="${chat.avatar || "/placeholder.svg?height=50&width=50"}" alt="${chat.name}">
            ${chat.isOnline ? '<div class="online-indicator"></div>' : ""}
          </div>
          <div class="chat-info">
            <div class="chat-name">${chat.name}</div>
            <div class="chat-last-message">${chat.lastMessage}</div>
          </div>
          <div class="chat-meta">
            <div class="chat-time">${window.utils.formatTime(chat.lastMessageTime)}</div>
            ${chat.unreadCount > 0 ? `<div class="chat-unread">${chat.unreadCount}</div>` : ""}
          </div>
        </div>
      `)
      chatListContainer.append(chatItem)
    })
  }

  async updateChatListItem(message) {
    try {
      const otherUserId = message.chat_from === window.currentUser.uid ? message.chat_to : message.chat_from

      // Get user data
      const userSnapshot = await window.database.ref(`users/${otherUserId}`).once("value")
      const userData = userSnapshot.val()

      if (!userData) return

      const chatListContainer = window.$("#chat-list")
      const existingChatItem = chatListContainer.find(`[data-user-id="${otherUserId}"]`)

      // Get unread count
      const unreadCount = await window.messagingManager.getUnreadCount(otherUserId)

      const chatItemHtml = `
        <div class="chat-item" data-user-id="${otherUserId}">
          <div class="chat-avatar">
            <img src="${userData.avatar || "/placeholder.svg?height=50&width=50"}" alt="${userData.name}">
            ${userData.isOnline ? '<div class="online-indicator"></div>' : ""}
          </div>
          <div class="chat-info">
            <div class="chat-name">${userData.name}</div>
            <div class="chat-last-message">${message.chat_msg}</div>
          </div>
          <div class="chat-meta">
            <div class="chat-time">${window.utils.formatTime(message.chat_created)}</div>
            ${unreadCount > 0 ? `<div class="chat-unread">${unreadCount}</div>` : ""}
          </div>
        </div>
      `

      if (existingChatItem.length) {
        // Update existing item
        const newChatItem = window.$(chatItemHtml)
        existingChatItem.fadeOut(200, function () {
          window.$(this).replaceWith(newChatItem)
          newChatItem.hide().prependTo(chatListContainer).slideDown(300)
        })
      } else {
        // Create new item
        const newChatItem = window.$(chatItemHtml)
        newChatItem.hide().prependTo(chatListContainer).slideDown(300)
      }
    } catch (error) {
      console.error("Error updating chat list item:", error)
    }
  }

  openChat(e) {
    const userId = window.$(e.currentTarget).data("user-id") || e
    if (userId) {
      window.currentChat = { userId }
      this.loadChatMessages(userId)
      this.showScreen("chat-screen")
    }
  }

  async loadChatMessages(userId) {
    try {
      // Get user info
      const userSnapshot = await window.database.ref(`users/${userId}`).once("value")
      const userData = userSnapshot.val()

      if (userData) {
        window.$("#chat-contact-name").text(userData.name)
        window.$("#chat-contact-avatar").attr("src", userData.avatar || "/placeholder.svg?height=40&width=40")
        window
          .$("#chat-contact-status")
          .text(userData.isOnline ? "Online" : `Last seen ${window.utils.formatTime(userData.lastSeen)}`)
      }

      // Load messages
      const messages = await window.messagingManager.getMessages(userId)
      this.displayMessages(messages)

      // Listen for typing
      window.messagingManager.listenForTyping(userId)
    } catch (error) {
      console.error("Error loading chat messages:", error)
    }
  }

  displayMessages(messages) {
    const messagesContainer = window.$("#chat-messages")
    messagesContainer.empty()

    messages.forEach((message) => {
      this.addMessageToChat(message)
    })

    // Scroll to bottom
    messagesContainer.scrollTop(messagesContainer[0].scrollHeight)
  }

  addMessageToChat(message) {
    const messagesContainer = window.$("#chat-messages")
    const isOwn = message.chat_from === window.currentUser.uid

    // Determine message status icon
    let statusIcon = ""
    if (isOwn) {
      if (message.chat_seen === 2) {
        statusIcon = `<span class="message-status seen" title="Seen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#4fc3f7">
          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
        </svg>
      </span>`
      } else if (message.chat_seen === 1) {
        statusIcon = `<span class="message-status delivered" title="Delivered">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41z"/>
        </svg>
      </span>`
      } else {
        statusIcon = `<span class="message-status sent" title="Sent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </span>`
      }
    }

    const messageElement = window.$(`
    <div class="message ${isOwn ? "sent" : "received"}" data-message-id="${message.chat_id}">
      <div class="message-bubble" data-message-id="${message.chat_id}">
        <div class="message-text">${window.utils.sanitizeHtml(message.chat_msg)}</div>
        <div class="message-meta">
          <span class="message-time">${window.utils.formatTime(message.chat_created)}</span>
          ${statusIcon}
        </div>
        ${message.chat_seen_time ? `<div class="message-seen-time hidden">${window.utils.formatDate(message.chat_seen_time)}</div>` : ""}
      </div>
    </div>
  `)

    messagesContainer.append(messageElement)
    messagesContainer.scrollTop(messagesContainer[0].scrollHeight)
  }

  async sendMessage() {
    const messageText = window.$("#message-input").val().trim()
    if (messageText && window.currentChat) {
      try {
        if (window.currentChat.isGroup) {
          await window.groupsManager.sendGroupMessage(window.currentChat.groupId, messageText)
        } else {
          await window.messagingManager.sendMessage(window.currentChat.userId, messageText)
        }
        window.$("#message-input").val("")
      } catch (error) {
        console.error("Error sending message:", error)
      }
    }
  }

  handleMessageKeypress(e) {
    if (e.which === 13) {
      // Enter key
      this.sendMessage()
    } else {
      // Start typing indicator
      if (window.currentChat) {
        window.messagingManager.startTyping(window.currentChat.userId)
      }
    }
  }

  showTypingIndicator(isTyping) {
    const messagesContainer = window.$("#chat-messages")
    window.$(".typing-indicator").remove()

    if (isTyping) {
      const typingIndicator = window.$(`
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `)
      messagesContainer.append(typingIndicator)
      messagesContainer.scrollTop(messagesContainer[0].scrollHeight)
    }
  }

  toggleMessageSeenTime(e) {
    const messageId = window.$(e.currentTarget).data("message-id")
    const seenTimeElement = window.$(e.currentTarget).find(".message-seen-time")

    if (seenTimeElement.length) {
      seenTimeElement.toggleClass("hidden")
    }

    // Mark message as seen if it's from another user and not already seen
    const message = window.$(e.currentTarget).closest(".message")
    if (message.hasClass("received") && window.currentChat) {
      window.messagingManager.markMessageAsSeen(messageId)

      // Update status icon to seen
      const statusIcon = message.find(".message-status")
      if (statusIcon.length && !statusIcon.hasClass("seen")) {
        statusIcon.removeClass("delivered sent").addClass("seen")
        statusIcon.attr("title", "Seen")
        statusIcon.html(`
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#4fc3f7">
          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
        </svg>
      `)
      }
    }
  }

  showNewChatOptions() {
    this.openFriendsModal()
  }

  // Call methods
  makeVoiceCall() {
    if (window.currentChat) {
      window.callsManager.makeCall(window.currentChat.userId, false)
    }
  }

  makeVideoCall() {
    if (window.currentChat) {
      window.callsManager.makeCall(window.currentChat.userId, true)
    }
  }

  endCall() {
    window.webRTCManager.endCall()
  }

  toggleMute() {
    const isMuted = window.webRTCManager.toggleMute()
    window.$("#mute-btn").toggleClass("muted", isMuted)

    // Update button appearance
    if (isMuted) {
      window.$("#mute-btn").css("background", "#dc3545")
    } else {
      window.$("#mute-btn").css("background", "rgba(255, 255, 255, 0.2)")
    }
  }

  toggleSpeaker() {
    // Implementation for speaker toggle
    window.$("#speaker-btn").toggleClass("active")
  }

  toggleVideo() {
    const isVideoOff = window.webRTCManager.toggleVideo()
    window.$("#call-video-btn").toggleClass("video-off", isVideoOff)

    // Update button appearance
    if (isVideoOff) {
      window.$("#call-video-btn").css("background", "#dc3545")
    } else {
      window.$("#call-video-btn").css("background", "rgba(255, 255, 255, 0.2)")
    }
  }

  showCallScreen(userId, status, isVideo, userData = null) {
    this.showScreen("call-screen")

    if (userData) {
      window.$("#call-contact-name").text(userData.name || "Unknown")
      window.$("#call-contact-avatar").attr("src", userData.avatar || "/placeholder.svg?height=120&width=120")
    } else {
      // Fallback to get user data
      window.database.ref(`users/${userId}`).once("value", (snapshot) => {
        const user = snapshot.val()
        if (user) {
          window.$("#call-contact-name").text(user.name || "Unknown")
          window.$("#call-contact-avatar").attr("src", user.avatar || "/placeholder.svg?height=120&width=120")
        }
      })
    }

    window.$("#call-status").text(status)

    if (isVideo) {
      window.$("#video-container").removeClass("hidden")
    } else {
      window.$("#video-container").addClass("hidden")
    }
  }

  // Additional methods for other features...
  async logout() {
    const confirmed = confirm("Are you sure you want to logout?")
    if (confirmed) {
      try {
        await window.authManager.signOut()
      } catch (error) {
        console.error("Logout error:", error)
      }
    }
  }

  // Placeholder methods for other features
  updateGroupsList(groups) {
    const groupListContainer = window.$("#group-list")
    groupListContainer.empty()

    if (groups.length === 0) {
      groupListContainer.html(`
      <div class="empty-state">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.01 3.01 0 0 0 16.5 6.5c-.83 0-1.58.34-2.12.89L12 10.5 9.62 7.39C9.08 6.84 8.33 6.5 7.5 6.5c-1.31 0-2.42.83-2.83 2L2.5 16H5v6h14z"/>
        </svg>
        <h3>No groups yet</h3>
        <p>Create or join a group to get started</p>
      </div>
    `)
      return
    }

    groups.forEach((group) => {
      const groupItem = window.$(`
      <div class="group-item chat-item" data-group-id="${group.group_id}">
        <div class="group-avatar chat-avatar">
          <img src="${group.group_avatar}" alt="${group.group_name}">
        </div>
        <div class="group-info chat-info">
          <div class="group-name chat-name">${group.group_name}</div>
          <div class="group-last-message chat-last-message">${group.last_message}</div>
        </div>
        <div class="group-meta chat-meta">
          <div class="group-time chat-time">${window.utils.formatTime(group.last_message_time)}</div>
          ${group.unread_count > 0 ? `<div class="group-unread chat-unread">${group.unread_count}</div>` : ""}
        </div>
      </div>
    `)
      groupListContainer.append(groupItem)
    })
  }

  updateFeedsList(feeds) {
    const feedListContainer = window.$("#feed-list")
    feedListContainer.empty()

    if (feeds.length === 0) {
      feedListContainer.html(`
        <div class="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <h3>No feeds yet</h3>
          <p>Share something with your friends</p>
        </div>
      `)
      return
    }

    feeds.forEach((feed) => {
      const feedItem = window.$(`
        <div class="feed-item" data-feed-id="${feed.feed_id}">
          <div class="feed-header">
            <div class="feed-avatar">
              <img src="${feed.user_avatar || "/placeholder.svg?height=40&width=40"}" alt="${feed.user_name}">
            </div>
            <div class="feed-user-info">
              <h4>${feed.user_name}</h4>
              <div class="feed-time">${window.utils.formatTime(feed.feed_created)}</div>
            </div>
          </div>
          <div class="feed-content">
            ${feed.feed_text ? `<div class="feed-text">${feed.feed_text}</div>` : ""}
            ${feed.feed_image ? `<img src="${feed.feed_image}" alt="Feed image" class="feed-image">` : ""}
          </div>
          <div class="feed-actions">
            <button class="feed-action-btn like-btn ${feed.isLiked ? "liked" : ""}" data-action="like" data-feed-id="${feed.feed_id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              ${feed.feed_likes}
            </button>
            <button class="feed-action-btn" data-action="comment" data-feed-id="${feed.feed_id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
              </svg>
              ${feed.feed_comments}
            </button>
          </div>
        </div>
      `)
      feedListContainer.append(feedItem)
    })
  }

  updateCallHistory(calls) {
    const callListContainer = window.$("#call-list")
    callListContainer.empty()

    if (calls.length === 0) {
      callListContainer.html(`
        <div class="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
        </svg>
        <h3>No calls yet</h3>
        <p>Make your first call</p>
      </div>
    `)
      return
    }

    calls.forEach((call) => {
      const callTypeIcon =
        call.call_type === "video"
          ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
      </svg>`
          : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
      </svg>`

      const callItem = window.$(`
      <div class="call-item" data-contact-id="${call.contact_id}">
        <div class="call-type-icon call-${call.call_direction}">
          ${callTypeIcon}
        </div>
        <div class="call-details">
          <div class="call-contact">${call.contact_name}</div>
          <div class="call-time">${window.utils.formatTime(call.call_created)}</div>
        </div>
        <div class="call-actions">
          <button class="call-action-btn" data-user-id="${call.contact_id}" data-call-type="${call.call_type}">
            ${callTypeIcon}
          </button>
        </div>
      </div>
    `)
      callListContainer.append(callItem)
    })
  }

  makeCallFromHistory(e) {
    const userId = window.$(e.target).closest(".call-action-btn").data("user-id")
    const callType = window.$(e.target).closest(".call-action-btn").data("call-type")

    if (userId) {
      if (callType === "video") {
        window.webRTCManager.startCall(userId, true)
      } else {
        window.webRTCManager.startCall(userId, false)
      }
    }
  }

  openGroupChat(e) {
    const groupId = window.$(e.currentTarget).data("group-id")
    if (groupId) {
      window.currentChat = { groupId, isGroup: true }
      this.loadGroupChatMessages(groupId)
      this.showScreen("chat-screen")
    }
  }

  async loadGroupChatMessages(groupId) {
    try {
      // Get group info
      const groupSnapshot = await window.database.ref(`groups/${groupId}`).once("value")
      const groupData = groupSnapshot.val()

      if (groupData) {
        window.$("#chat-contact-name").text(groupData.group_name)
        window.$("#chat-contact-avatar").attr("src", groupData.group_avatar || "/placeholder.svg?height=40&width=40")
        window.$("#chat-contact-status").text(`${await window.groupsManager.getGroupMemberCount(groupId)} members`)
      }

      // Load messages
      const messages = await window.groupsManager.getGroupMessages(groupId)
      this.displayGroupMessages(messages)

      // Listen for new messages
      window.groupsManager.listenForGroupMessages(groupId)

      // Mark group as read
      window.groupsManager.markGroupAsRead(groupId)
    } catch (error) {
      console.error("Error loading group chat messages:", error)
    }
  }

  displayGroupMessages(messages) {
    const messagesContainer = window.$("#chat-messages")
    messagesContainer.empty()

    messages.forEach((message) => {
      this.addGroupMessageToChat(message)
    })

    // Scroll to bottom
    messagesContainer.scrollTop(messagesContainer[0].scrollHeight)
  }

  addGroupMessageToChat(message) {
    const messagesContainer = window.$("#chat-messages")
    const isOwn = message.gm_from === window.currentUser.uid

    const messageElement = window.$(`
    <div class="message ${isOwn ? "sent" : "received"}" data-message-id="${message.gm_id}">
      ${!isOwn ? `<div class="message-sender">${message.user_name}</div>` : ""}
      <div class="message-bubble" data-message-id="${message.gm_id}">
        <div class="message-text">${window.utils.sanitizeHtml(message.gm_message)}</div>
        <div class="message-meta">
          <span class="message-time">${window.utils.formatTime(message.gm_created)}</span>
        </div>
      </div>
    </div>
  `)

    messagesContainer.append(messageElement)
    messagesContainer.scrollTop(messagesContainer[0].scrollHeight)
  }

  openNewGroupModal() {
    this.openModal("new-group-modal")
    this.loadFriendsForGroupSelection()
  }

  async loadFriendsForGroupSelection() {
    if (!window.friendsManager) return

    const friends = await window.friendsManager.loadFriends()
    const membersList = window.$("#group-members-list")
    membersList.empty()

    if (friends.length === 0) {
      membersList.html("<p>No friends available to add to group</p>")
      return
    }

    const searchInput = window.$(`
      <div class="member-search">
        <input type="text" id="member-search-input" placeholder="Search friends..." class="search-input">
      </div>
    `)
    membersList.append(searchInput)

    const membersContainer = window.$('<div class="members-container"></div>')
    membersList.append(membersContainer)

    friends.forEach((friend) => {
      const memberItem = window.$(`
        <div class="member-item">
          <div class="member-checkbox">
            <input type="checkbox" id="member-${friend.user_id}" value="${friend.user_id}">
          </div>
          <div class="member-avatar">
            <img src="${friend.avatar || "/placeholder.svg?height=30&width=30"}" alt="${friend.name}">
          </div>
          <div class="member-info">
            <div class="member-name">${friend.name}</div>
          </div>
        </div>
      `)
      membersContainer.append(memberItem)
    })

    // Add search functionality
    window.$("#member-search-input").on("input", function () {
      const searchTerm = window.$(this).val().toLowerCase()
      membersContainer.find(".member-item").each(function () {
        const memberName = window.$(this).find(".member-name").text().toLowerCase()
        if (memberName.includes(searchTerm)) {
          window.$(this).show()
        } else {
          window.$(this).hide()
        }
      })
    })
  }

  createGroup() {
    const groupName = window.$("#group-name-input").val().trim()
    const selectedMembers = []

    window.$("#group-members-list input[type='checkbox']:checked").each(function () {
      selectedMembers.push(window.$(this).val())
    })

    if (!groupName) {
      window.utils.showToast("Please enter a group name", "error")
      return
    }

    if (selectedMembers.length === 0) {
      window.utils.showToast("Please select at least one member", "error")
      return
    }

    window.groupsManager.createGroup(groupName, selectedMembers)
    window.$("#group-name-input").val("")
    window.$("#group-members-list input[type='checkbox']").prop("checked", false)
    this.closeModal({ target: { dataset: { modal: "new-group-modal" } } })
  }

  openNewFeedModal() {
    this.openModal("new-feed-modal")
  }

  postFeed() {
    const text = window.$("#feed-text-input").val().trim()
    const imageFile = window.$("#feed-image-input")[0].files[0]

    if (text || imageFile) {
      window.feedsManager.createFeed(text, imageFile)
      window.$("#feed-text-input").val("")
      window.$("#feed-image-input").val("")
      window.$("#feed-image-preview").addClass("hidden")
      this.closeModal({ target: { dataset: { modal: "new-feed-modal" } } })
    } else {
      window.utils.showToast("Please enter some text or add an image", "error")
    }
  }

  handleFeedImageChange(e) {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        window.$("#feed-preview-image").attr("src", e.target.result)
        window.$("#feed-image-preview").removeClass("hidden")
      }
      reader.readAsDataURL(file)
    }
  }

  removeFeedImage() {
    window.$("#feed-image-input").val("")
    window.$("#feed-image-preview").addClass("hidden")
  }

  handleFeedAction(e) {
    const action = window.$(e.target).closest(".feed-action-btn").data("action")
    const feedId = window.$(e.target).closest(".feed-action-btn").data("feed-id")

    if (action === "like") {
      window.feedsManager.likeFeed(feedId)
    } else if (action === "comment") {
      // Open comment modal (implementation needed)
      console.log("Open comment modal for feed:", feedId)
    }
  }

  toggleSearch() {
    window.$(".search-container").toggleClass("active")
  }

  handleSearch(e) {
    const query = window.$(e.target).val().toLowerCase()
    // Implementation for search functionality
    console.log("Search query:", query)
  }

  loadGroupsList() {
    if (window.groupsManager) {
      window.groupsManager.loadGroups()
    }
  }

  loadCallHistory() {
    if (window.callsManager) {
      window.callsManager.loadCallHistory()
    }
  }

  loadFeedsList() {
    if (window.feedsManager) {
      window.feedsManager.loadFeeds()
    }
  }

  makeCallFromHistory(e) {
    const userId = window.$(e.target).closest(".call-action-btn").data("user-id")
    const callType = window.$(e.target).closest(".call-action-btn").data("call-type")

    if (userId) {
      if (callType === "video") {
        window.webRTCManager.startCall(userId, true)
      } else {
        window.webRTCManager.startCall(userId, false)
      }
    }
  }
}

// Initialize UI
const uiInstance = new UI()
window.UI = uiInstance
