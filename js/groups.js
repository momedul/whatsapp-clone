// Groups management module
//import firebase from "firebase/app"
//import "firebase/database"

class GroupsManager {
  constructor() {
    this.currentGroup = null
    this.groupListeners = new Map()
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
          gm_created: firebase.database.ServerValue.TIMESTAMP,
        }),
      )

      // Add creator as member
      membersPromises.push(
        window.database.ref("group_members").push({
          gm_group: groupRef.key,
          gm_user: window.currentUser.uid,
          gm_status: "active",
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

  async joinGroup(groupId) {
    try {
      await window.database.ref("group_members").push({
        gm_group: groupId,
        gm_user: window.currentUser.uid,
        gm_status: "active",
        gm_created: firebase.database.ServerValue.TIMESTAMP,
      })

      window.utils.showToast("Joined group successfully!", "success")
      this.loadGroups()
    } catch (error) {
      console.error("Error joining group:", error)
      window.utils.showToast("Failed to join group", "error")
    }
  }

  async leaveGroup(groupId) {
    try {
      // Find and remove membership
      const membershipSnapshot = await window.database
        .ref("group_members")
        .orderByChild("gm_group")
        .equalTo(groupId)
        .once("value")

      membershipSnapshot.forEach((childSnapshot) => {
        const membership = childSnapshot.val()
        if (membership.gm_user === window.currentUser.uid) {
          window.database.ref(`group_members/${childSnapshot.key}`).remove()
        }
      })

      window.utils.showToast("Left group successfully!", "success")
      this.loadGroups()
    } catch (error) {
      console.error("Error leaving group:", error)
      window.utils.showToast("Failed to leave group", "error")
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

            groups.push({
              group_id: groupId,
              group_name: groupData.group_name,
              group_status: groupData.group_status,
              member_count: memberCount,
              group_created: groupData.group_created,
            })
          }
        } catch (error) {
          console.error("Error loading group details:", error)
        }
      }

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

  async getGroupMembers(groupId) {
    try {
      const membersSnapshot = await window.database
        .ref("group_members")
        .orderByChild("gm_group")
        .equalTo(groupId)
        .once("value")

      const members = []
      const memberPromises = []

      membersSnapshot.forEach((childSnapshot) => {
        const membership = childSnapshot.val()
        if (membership.gm_status === "active") {
          memberPromises.push(
            window.database
              .ref(`users/${membership.gm_user}`)
              .once("value")
              .then((userSnapshot) => {
                const userData = userSnapshot.val()
                if (userData) {
                  members.push({
                    user_id: membership.gm_user,
                    name: userData.name,
                    avatar: userData.avatar,
                    isOnline: userData.isOnline,
                  })
                }
              }),
          )
        }
      })

      await Promise.all(memberPromises)
      return members
    } catch (error) {
      console.error("Error getting group members:", error)
      return []
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

  async sendGroupMessage(groupId, messageText, messageType = "text") {
    try {
      const message = {
        group_id: groupId,
        chat_from: window.currentUser.uid,
        chat_msg: messageText,
        chat_type: messageType,
        chat_created: firebase.database.ServerValue.TIMESTAMP,
      }

      const messageRef = window.database.ref("group_messages").push()
      await messageRef.set(message)

      return true
    } catch (error) {
      console.error("Error sending group message:", error)
      return false
    }
  }

  listenForGroupMessages(groupId, callback) {
    const messagesRef = window.database.ref("group_messages").orderByChild("group_id").equalTo(groupId)

    messagesRef.on("child_added", (snapshot) => {
      callback(snapshot.val())
    })

    // Store listener for cleanup
    this.groupListeners.set(groupId, messagesRef)
  }

  stopListeningForGroupMessages(groupId) {
    const listener = this.groupListeners.get(groupId)
    if (listener) {
      listener.off()
      this.groupListeners.delete(groupId)
    }
  }
}

// Initialize groups manager
const groupsManager = new GroupsManager()
window.groupsManager = groupsManager
