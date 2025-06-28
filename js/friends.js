// Friends management module - No imports, using global variables,don't eclare the firebase variable again

class FriendsManager {
  constructor() {
    this.friendRequests = []
    this.friends = []
  }

  init() {
    if (!window.currentUser) return

    this.loadFriends()
    this.loadFriendRequests()
    this.listenForFriendUpdates()
  }

  async sendFriendRequest(email) {
    try {
      // Find user by email
      const usersSnapshot = await window.database.ref("users").orderByChild("email").equalTo(email).once("value")

      let targetUser = null
      usersSnapshot.forEach((childSnapshot) => {
        targetUser = {
          uid: childSnapshot.key,
          ...childSnapshot.val(),
        }
      })

      if (!targetUser) {
        window.utils.showToast("User not found", "error")
        return false
      }

      if (targetUser.uid === window.currentUser.uid) {
        window.utils.showToast("Cannot send friend request to yourself", "error")
        return false
      }

      // Check if already friends or request exists
      const existingFriendship = await this.checkExistingFriendship(targetUser.uid)
      if (existingFriendship) {
        window.utils.showToast("Friend request already exists or you are already friends", "error")
        return false
      }

      // Send friend request
      const friendRequestData = {
        frnd_user: window.currentUser.uid,
        frnd_user2: targetUser.uid,
        frnd_status: "pending",
        frnd_requested: firebase.database.ServerValue.TIMESTAMP,
      }

      const requestRef = window.database.ref("friends").push()
      await requestRef.set(friendRequestData)

      // Save to IndexedDB
      await window.dbManager.put("friends", {
        frnd_id: requestRef.key,
        frnd_user: window.currentUser.uid,
        frnd_user2: targetUser.uid,
        frnd_status: "pending",
        frnd_requested: Date.now(),
      })

      window.utils.showToast("Friend request sent!", "success")
      return true
    } catch (error) {
      console.error("Error sending friend request:", error)
      window.utils.showToast("Failed to send friend request", "error")
      return false
    }
  }

  async acceptFriendRequest(requestId, fromUserId) {
    try {
      await window.database.ref(`friends/${requestId}`).update({
        frnd_status: "accepted",
        frnd_accepted: firebase.database.ServerValue.TIMESTAMP,
      })

      // Update IndexedDB
      const friendship = await window.dbManager.get("friends", requestId)
      if (friendship) {
        friendship.frnd_status = "accepted"
        friendship.frnd_accepted = Date.now()
        await window.dbManager.put("friends", friendship)
      }

      window.utils.showToast("Friend request accepted!", "success")
      this.loadFriends()
      this.loadFriendRequests()
    } catch (error) {
      console.error("Error accepting friend request:", error)
      window.utils.showToast("Failed to accept friend request", "error")
    }
  }

  async declineFriendRequest(requestId) {
    try {
      await window.database.ref(`friends/${requestId}`).update({
        frnd_status: "declined",
      })

      // Update IndexedDB
      const friendship = await window.dbManager.get("friends", requestId)
      if (friendship) {
        friendship.frnd_status = "declined"
        await window.dbManager.put("friends", friendship)
      }

      window.utils.showToast("Friend request declined", "info")
      this.loadFriendRequests()
    } catch (error) {
      console.error("Error declining friend request:", error)
      window.utils.showToast("Failed to decline friend request", "error")
    }
  }

  async removeFriend(friendshipId) {
    try {
      await window.database.ref(`friends/${friendshipId}`).update({
        frnd_status: "removed",
      })

      // Update IndexedDB
      const friendship = await window.dbManager.get("friends", friendshipId)
      if (friendship) {
        friendship.frnd_status = "removed"
        await window.dbManager.put("friends", friendship)
      }

      window.utils.showToast("Friend removed", "info")
      this.loadFriends()
    } catch (error) {
      console.error("Error removing friend:", error)
      window.utils.showToast("Failed to remove friend", "error")
    }
  }

  async loadFriends() {
    try {
      // Get accepted friendships where current user is involved
      const friendshipsSnapshot = await window.database
        .ref("friends")
        .orderByChild("frnd_status")
        .equalTo("accepted")
        .once("value")

      const friends = []
      const friendPromises = []

      friendshipsSnapshot.forEach((childSnapshot) => {
        const friendship = childSnapshot.val()
        const friendshipId = childSnapshot.key

        let friendUserId = null
        if (friendship.frnd_user === window.currentUser.uid) {
          friendUserId = friendship.frnd_user2
        } else if (friendship.frnd_user2 === window.currentUser.uid) {
          friendUserId = friendship.frnd_user
        }

        if (friendUserId) {
          friendPromises.push(
            window.database
              .ref(`users/${friendUserId}`)
              .once("value")
              .then((userSnapshot) => {
                const userData = userSnapshot.val()
                if (userData) {
                  friends.push({
                    friendshipId: friendshipId,
                    user_id: friendUserId,
                    name: userData.name,
                    email: userData.email,
                    avatar: userData.avatar,
                    status: userData.status,
                    isOnline: userData.isOnline,
                    lastSeen: userData.lastSeen,
                  })
                }
              }),
          )
        }
      })

      await Promise.all(friendPromises)

      this.friends = friends
      if (window.UI && window.UI.updateFriendsList) {
        window.UI.updateFriendsList(friends)
      }

      return friends
    } catch (error) {
      console.error("Error loading friends:", error)
      return []
    }
  }

  async loadFriendRequests() {
    try {
      // Get pending friend requests sent to current user
      const requestsSnapshot = await window.database
        .ref("friends")
        .orderByChild("frnd_user2")
        .equalTo(window.currentUser.uid)
        .once("value")

      const requests = []
      const requestPromises = []

      requestsSnapshot.forEach((childSnapshot) => {
        const request = childSnapshot.val()
        const requestId = childSnapshot.key

        if (request.frnd_status === "pending") {
          requestPromises.push(
            window.database
              .ref(`users/${request.frnd_user}`)
              .once("value")
              .then((userSnapshot) => {
                const userData = userSnapshot.val()
                if (userData) {
                  requests.push({
                    requestId: requestId,
                    user_id: request.frnd_user,
                    name: userData.name,
                    email: userData.email,
                    avatar: userData.avatar,
                    requestedAt: request.frnd_requested,
                  })
                }
              }),
          )
        }
      })

      await Promise.all(requestPromises)

      this.friendRequests = requests
      if (window.UI && window.UI.updateFriendRequests) {
        window.UI.updateFriendRequests(requests)
      }

      return requests
    } catch (error) {
      console.error("Error loading friend requests:", error)
      return []
    }
  }

  async checkExistingFriendship(targetUserId) {
    try {
      const friendshipsSnapshot = await window.database.ref("friends").once("value")

      let exists = false
      friendshipsSnapshot.forEach((childSnapshot) => {
        const friendship = childSnapshot.val()
        if (
          ((friendship.frnd_user === window.currentUser.uid && friendship.frnd_user2 === targetUserId) ||
            (friendship.frnd_user === targetUserId && friendship.frnd_user2 === window.currentUser.uid)) &&
          (friendship.frnd_status === "pending" || friendship.frnd_status === "accepted")
        ) {
          exists = true
        }
      })

      return exists
    } catch (error) {
      console.error("Error checking existing friendship:", error)
      return false
    }
  }

  listenForFriendUpdates() {
    // Listen for new friend requests
    window.database
      .ref("friends")
      .orderByChild("frnd_user2")
      .equalTo(window.currentUser.uid)
      .on("child_added", (snapshot) => {
        const request = snapshot.val()
        if (request.frnd_status === "pending") {
          this.loadFriendRequests()

          // Show notification
          window.database.ref(`users/${request.frnd_user}`).once("value", (userSnapshot) => {
            const userData = userSnapshot.val()
            if (userData) {
              window.utils.showToast(`New friend request from ${userData.name}`, "info")
            }
          })
        }
      })

    // Listen for friend request status changes
    window.database.ref("friends").on("child_changed", () => {
      this.loadFriends()
      this.loadFriendRequests()
    })
  }

  getFriendById(userId) {
    return this.friends.find((friend) => friend.user_id === userId)
  }

  isFriend(userId) {
    return this.friends.some((friend) => friend.user_id === userId)
  }

  // Get friends list for chat selection
  getFriendsForChat() {
    return this.friends.map((friend) => ({
      userId: friend.user_id,
      name: friend.name,
      avatar: friend.avatar,
      isOnline: friend.isOnline,
      status: friend.status,
    }))
  }
}

// Initialize friends manager
const friendsManager = new FriendsManager()
window.friendsManager = friendsManager
