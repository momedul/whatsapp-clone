// Groups management module - Enhanced for full chat functionality

class GroupsManager {
  constructor() {
    this.currentGroup = null
    this.groupListeners = new Map()
    this.groupMessageListeners = new Map()
  }

  init() {
    if (!window.currentUser) return

    this.loadGroups()
    this.listenForGroupUpdates()
  }

  async createGroup(groupName, memberIds) {
    try {
      const groupData = {
        group_name: groupName,
        group_status: "active",
        group_created: firebase.database.ServerValue.TIMESTAMP,
        group_admin: window.currentUser.uid,
        group_avatar: `/placeholder.svg?height=50&width=50&text=${groupName.charAt(0).toUpperCase()}`,
      }

      // Create group in Firebase
      const groupRef = window.database.ref("groups").push()
      await groupRef.set(groupData)

      // Add members
      const membersPromises = memberIds.map((memberId) =>
        window.database.ref("group_members").push({
          gm_group: groupRef.key,
          gm_user: memberId,
          gm_status: "active",
          gm_role: "member",
          gm_created: firebase.database.ServerValue.TIMESTAMP,
        }),
      )

      // Add creator as admin
      membersPromises.push(
        window.database.ref("group_members").push({
          gm_group: groupRef.key,
          gm_user: window.currentUser.uid,
          gm_status: "active",
          gm_role: "admin",
          gm_created: firebase.database.ServerValue.TIMESTAMP,
        }),
      )

      await Promise.all(membersPromises)

      // Save to IndexedDB
      await window.dbManager.put("groups", {
        group_id: groupRef.key,
        group_name: groupName,
        group_status: "active",
        group_created: Date.now(),
        group_admin: window.currentUser.uid,
      })

      window.utils.showToast("Group created successfully!", "success")
      this.loadGroups()
      return groupRef.key
    } catch (error) {
      console.error("Error creating group:", error)
      window.utils.showToast("Failed to create group", "error")
      throw error
    }
  }

  async loadGroups() {
    try {
      // Get user's group memberships
      const membershipsSnapshot = await window.database
        .ref("group_members")
        .orderByChild("gm_user")
        .equalTo(window.currentUser.uid)
        .once("value")

      const groupIds = []
      membershipsSnapshot.forEach((childSnapshot) => {
        const membership = childSnapshot.val()
        if (membership.gm_status === "active") {
          groupIds.push(membership.gm_group)
        }
      })

      // Get group details
      const groups = []
      for (const groupId of groupIds) {
        try {
          const groupSnapshot = await window.database.ref(`groups/${groupId}`).once("value")
          const groupData = groupSnapshot.val()

          if (groupData) {
            // Get member count
            const memberCount = await this.getGroupMemberCount(groupId)

            // Get last message
            const lastMessage = await this.getGroupLastMessage(groupId)

            groups.push({
              group_id: groupId,
              group_name: groupData.group_name,
              group_status: groupData.group_status,
              group_avatar:
                groupData.group_avatar ||
                `/placeholder.svg?height=50&width=50&text=${groupData.group_name.charAt(0).toUpperCase()}`,
              member_count: memberCount,
              group_created: groupData.group_created,
              last_message: lastMessage?.message || "No messages yet",
              last_message_time: lastMessage?.timestamp || groupData.group_created,
              unread_count: await this.getGroupUnreadCount(groupId),
            })
          }
        } catch (error) {
          console.error("Error loading group details:", error)
        }
      }

      // Sort by last message time
      groups.sort((a, b) => b.last_message_time - a.last_message_time)

      // Update UI
      if (window.UI && window.UI.updateGroupsList) {
        window.UI.updateGroupsList(groups)
      }

      return groups
    } catch (error) {
      console.error("Error loading groups:", error)
      return []
    }
  }

  async getGroupMemberCount(groupId) {
    try {
      const membersSnapshot = await window.database
        .ref("group_members")
        .orderByChild("gm_group")
        .equalTo(groupId)
        .once("value")

      let count = 0
      membersSnapshot.forEach((childSnapshot) => {
        const membership = childSnapshot.val()
        if (membership.gm_status === "active") {
          count++
        }
      })

      return count
    } catch (error) {
      console.error("Error getting member count:", error)
      return 0
    }
  }

  async getGroupLastMessage(groupId) {
    try {
      const messagesSnapshot = await window.database
        .ref("group_messages")
        .orderByChild("gm_group")
        .equalTo(groupId)
        .limitToLast(1)
        .once("value")

      let lastMessage = null
      messagesSnapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val()
        lastMessage = {
          message: message.gm_message,
          timestamp: message.gm_created,
          from: message.gm_from,
        }
      })

      return lastMessage
    } catch (error) {
      console.error("Error getting last message:", error)
      return null
    }
  }

  async getGroupUnreadCount(groupId) {
    try {
      // Get user's last seen timestamp for this group
      const lastSeenSnapshot = await window.database
        .ref(`group_last_seen/${groupId}/${window.currentUser.uid}`)
        .once("value")

      const lastSeen = lastSeenSnapshot.val() || 0

      // Count messages after last seen
      const messagesSnapshot = await window.database
        .ref("group_messages")
        .orderByChild("gm_group")
        .equalTo(groupId)
        .once("value")

      let unreadCount = 0
      messagesSnapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val()
        if (message.gm_created > lastSeen && message.gm_from !== window.currentUser.uid) {
          unreadCount++
        }
      })

      return unreadCount
    } catch (error) {
      console.error("Error getting unread count:", error)
      return 0
    }
  }

  async sendGroupMessage(groupId, messageText, messageType = "text") {
    try {
      const message = {
        gm_group: groupId,
        gm_from: window.currentUser.uid,
        gm_message: messageText,
        gm_type: messageType,
        gm_created: firebase.database.ServerValue.TIMESTAMP,
      }

      // Send to Firebase
      const messageRef = window.database.ref("group_messages").push()
      await messageRef.set(message)

      // Save to IndexedDB
      await window.dbManager.put("group_messages", {
        ...message,
        gm_id: messageRef.key,
        gm_created: Date.now(),
      })

      return true
    } catch (error) {
      console.error("Error sending group message:", error)
      window.utils.showToast("Failed to send message", "error")
      return false
    }
  }

  async getGroupMessages(groupId, limit = 50) {
    try {
      const messagesSnapshot = await window.database
        .ref("group_messages")
        .orderByChild("gm_group")
        .equalTo(groupId)
        .limitToLast(limit)
        .once("value")

      const messages = []
      const userPromises = []

      messagesSnapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val()
        messages.push({
          ...message,
          gm_id: childSnapshot.key,
        })

        // Get user info for each message
        if (!userPromises.find((p) => p.userId === message.gm_from)) {
          userPromises.push({
            userId: message.gm_from,
            promise: window.database.ref(`users/${message.gm_from}`).once("value"),
          })
        }
      })

      // Get all user data
      const userResults = await Promise.all(userPromises.map((p) => p.promise))
      const userMap = new Map()

      userResults.forEach((snapshot, index) => {
        const userData = snapshot.val()
        if (userData) {
          userMap.set(userPromises[index].userId, userData)
        }
      })

      // Add user info to messages
      const messagesWithUsers = messages.map((message) => ({
        ...message,
        user_name: userMap.get(message.gm_from)?.name || "Unknown",
        user_avatar: userMap.get(message.gm_from)?.avatar || "/placeholder.svg?height=30&width=30",
      }))

      return messagesWithUsers.sort((a, b) => a.gm_created - b.gm_created)
    } catch (error) {
      console.error("Error getting group messages:", error)
      return []
    }
  }

  async markGroupAsRead(groupId) {
    try {
      // Update last seen timestamp
      await window.database
        .ref(`group_last_seen/${groupId}/${window.currentUser.uid}`)
        .set(firebase.database.ServerValue.TIMESTAMP)
    } catch (error) {
      console.error("Error marking group as read:", error)
    }
  }

  listenForGroupUpdates() {
    // Listen for new groups
    window.database
      .ref("group_members")
      .orderByChild("gm_user")
      .equalTo(window.currentUser.uid)
      .on("child_added", () => {
        this.loadGroups()
      })

    // Listen for group changes
    window.database
      .ref("group_members")
      .orderByChild("gm_user")
      .equalTo(window.currentUser.uid)
      .on("child_changed", () => {
        this.loadGroups()
      })
  }

  listenForGroupMessages(groupId) {
    // Remove existing listener
    if (this.groupMessageListeners.has(groupId)) {
      this.groupMessageListeners.get(groupId).off()
    }

    // Set up new listener
    const messagesRef = window.database.ref("group_messages").orderByChild("gm_group").equalTo(groupId)

    messagesRef.on("child_added", async (snapshot) => {
      const message = snapshot.val()

      // Get user info
      const userSnapshot = await window.database.ref(`users/${message.gm_from}`).once("value")
      const userData = userSnapshot.val()

      const messageWithUser = {
        ...message,
        gm_id: snapshot.key,
        user_name: userData?.name || "Unknown",
        user_avatar: userData?.avatar || "/placeholder.svg?height=30&width=30",
      }

      // Update UI if group chat is open
      if (window.currentChat && window.currentChat.groupId === groupId) {
        window.UI.addGroupMessageToChat(messageWithUser)
      }

      // Update group list
      this.loadGroups()
    })

    this.groupMessageListeners.set(groupId, messagesRef)
  }

  stopListeningForGroupMessages(groupId) {
    if (this.groupMessageListeners.has(groupId)) {
      this.groupMessageListeners.get(groupId).off()
      this.groupMessageListeners.delete(groupId)
    }
  }
}

// Initialize groups manager
const groupsManager = new GroupsManager()
window.groupsManager = groupsManager
