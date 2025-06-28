// UI management module
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
  }

  hideLoadingScreen() {
    setTimeout(() => {
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
    const modalId = window.$(e.target).data("modal")
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

    const messageElement = window.$(`
      <div class="message ${isOwn ? "sent" : "received"}">
        <div class="message-bubble">
          <div class="message-text">${window.utils.sanitizeHtml(message.chat_msg)}</div>
          <div class="message-time">${window.utils.formatTime(message.chat_created)}</div>
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
        await window.messagingManager.sendMessage(window.currentChat.userId, messageText)
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

  // Additional methods for other features...
  async logout() {
    try {
      await window.authManager.signOut()
    } catch (error) {
      console.error("Logout error:", error)
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
        <div class="group-item" data-group-id="${group.group_id}">
          <div class="group-avatar">
            ${group.group_name.charAt(0).toUpperCase()}
          </div>
          <div class="group-info">
            <div class="group-name">${group.group_name}</div>
            <div class="group-members">${group.member_count} members</div>
          </div>
        </div>
      `)
      groupListContainer.append(groupItem)
    })
  }

  updateFriendsList(friends) {
    /* Implementation for friends list */
  }

  updateFriendRequests(requests) {
    /* Implementation for friend requests */
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
            <button class="feed-action-btn" data-action="like" data-feed-id="${feed.feed_id}">
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
      const callItem = window.$(`
        <div class="call-item" data-contact-id="${call.contact_id}">
          <div class="call-type-icon call-${call.call_direction}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
          </div>
          <div class="call-details">
            <div class="call-contact">${call.contact_name}</div>
            <div class="call-time">${window.utils.formatTime(call.call_created)}</div>
          </div>
          <div class="call-duration">
            ${call.call_duration > 0 ? window.callsManager.formatCallDuration(call.call_duration) : "Missed"}
          </div>
        </div>
      `)
      callListContainer.append(callItem)
    })
  }

  openFriendsModal() {
    this.openModal("friends-modal")
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

  switchFriendsTab(e) {
    const tab = window.$(e.target).data("tab")
    window.$(".friends-tab").removeClass("active")
    window.$(e.target).addClass("active")

    window.$(".friends-content").removeClass("active")
    window.$(`#${tab}`).addClass("active")
  }

  showNewChatOptions() {
    this.openFriendsModal()
  }

  openNewGroupModal() {
    this.openModal("new-group-modal")
  }

  createGroup() {
    const groupName = window.$("#group-name-input").val().trim()
    if (groupName) {
      // Get selected members (implementation needed)
      const memberIds = []
      window.groupsManager.createGroup(groupName, memberIds)
      window.$("#group-name-input").val("")
      this.closeModal({ target: { dataset: { modal: "new-group-modal" } } })
    } else {
      window.utils.showToast("Please enter a group name", "error")
    }
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
    window.callsManager.endCall()
  }

  toggleMute() {
    const isMuted = window.webRTCManager.toggleMute()
    window.$("#mute-btn").toggleClass("muted", isMuted)
  }

  toggleSpeaker() {
    // Implementation for speaker toggle
    window.$("#speaker-btn").toggleClass("active")
  }

  toggleVideo() {
    const isVideoOff = window.webRTCManager.toggleVideo()
    window.$("#call-video-btn").toggleClass("video-off", isVideoOff)
  }

  showCallScreen(userId, status, isVideo) {
    this.showScreen("call-screen")
    window.$("#call-contact-name").text("Contact")
    window.$("#call-status").text(status)

    if (isVideo) {
      window.$("#video-container").removeClass("hidden")
    } else {
      window.$("#video-container").addClass("hidden")
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
}

// Initialize UI
const uiInstance = new UI()
window.UI = uiInstance
