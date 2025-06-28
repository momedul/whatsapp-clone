// Feeds management module - No imports, using global variables,don't eclare the firebase variable again

class FeedsManager {
  constructor() {
    this.feeds = []
    this.feedListeners = []
  }

  init() {
    if (!window.currentUser) return

    this.loadFeeds()
    this.listenForFeedUpdates()
  }

  async createFeed(text, imageFile = null) {
    try {
      let imageUrl = null

      // Upload image if provided
      if (imageFile) {
        imageUrl = await this.uploadFeedImage(imageFile)
      }

      const feedData = {
        feed_user: window.currentUser.uid,
        feed_text: text,
        feed_image: imageUrl,
        feed_likes: 0,
        feed_comments: 0,
        feed_created: firebase.database.ServerValue.TIMESTAMP,
      }

      // Save to Firebase
      const feedRef = window.database.ref("feeds").push()
      await feedRef.set(feedData)

      // Save to IndexedDB
      await window.dbManager.put("feeds", {
        feed_id: feedRef.key,
        feed_user: window.currentUser.uid,
        feed_text: text,
        feed_image: imageUrl,
        feed_likes: 0,
        feed_comments: 0,
        feed_created: Date.now(),
      })

      window.utils.showToast("Feed posted successfully!", "success")
      this.loadFeeds()
      return feedRef.key
    } catch (error) {
      console.error("Error creating feed:", error)
      window.utils.showToast("Failed to post feed", "error")
      throw error
    }
  }

  async uploadFeedImage(file) {
    try {
      const storageRef = window.storage.ref(`feeds/${window.currentUser.uid}/${Date.now()}_${file.name}`)
      const snapshot = await storageRef.put(file)
      const downloadURL = await snapshot.ref.getDownloadURL()
      return downloadURL
    } catch (error) {
      console.error("Error uploading feed image:", error)
      throw error
    }
  }

  async loadFeeds() {
    try {
      // Get feeds from friends and own feeds
      const friendIds = window.friendsManager ? window.friendsManager.friends.map((friend) => friend.user_id) : []
      friendIds.push(window.currentUser.uid) // Include own feeds

      const feedsSnapshot = await window.database
        .ref("feeds")
        .orderByChild("feed_created")
        .limitToLast(50)
        .once("value")

      const feeds = []
      const feedPromises = []

      feedsSnapshot.forEach((childSnapshot) => {
        const feed = childSnapshot.val()
        const feedId = childSnapshot.key

        // Only show feeds from friends or self
        if (friendIds.includes(feed.feed_user)) {
          feedPromises.push(
            window.database
              .ref(`users/${feed.feed_user}`)
              .once("value")
              .then((userSnapshot) => {
                const userData = userSnapshot.val()
                if (userData) {
                  feeds.push({
                    feed_id: feedId,
                    feed_user: feed.feed_user,
                    feed_text: feed.feed_text,
                    feed_image: feed.feed_image,
                    feed_likes: feed.feed_likes || 0,
                    feed_comments: feed.feed_comments || 0,
                    feed_created: feed.feed_created,
                    user_name: userData.name,
                    user_avatar: userData.avatar,
                    isLiked: false, // Placeholder for isLiked status
                  })
                }
              }),
          )
        }
      })

      await Promise.all(feedPromises)

      // Sort by creation time (newest first)
      feeds.sort((a, b) => b.feed_created - a.feed_created)

      this.feeds = feeds
      if (window.UI && window.UI.updateFeedsList) {
        window.UI.updateFeedsList(feeds)
      }

      return feeds
    } catch (error) {
      console.error("Error loading feeds:", error)
      return []
    }
  }

  async likeFeed(feedId) {
    try {
      const likeRef = window.database.ref(`feed_likes/${feedId}/${window.currentUser.uid}`)
      const likeSnapshot = await likeRef.once("value")

      if (likeSnapshot.exists()) {
        // Unlike
        await likeRef.remove()
        await window.database.ref(`feeds/${feedId}/feed_likes`).transaction((likes) => (likes || 1) - 1)
        return false
      } else {
        // Like
        await likeRef.set({
          user_id: window.currentUser.uid,
          created: firebase.database.ServerValue.TIMESTAMP,
        })
        await window.database.ref(`feeds/${feedId}/feed_likes`).transaction((likes) => (likes || 0) + 1)
        return true
      }
    } catch (error) {
      console.error("Error liking feed:", error)
      window.utils.showToast("Failed to like feed", "error")
      return false
    }
  }

  listenForFeedUpdates() {
    // Listen for new feeds
    window.database.ref("feeds").on("child_added", (snapshot) => {
      const feed = snapshot.val()
      const friendIds = window.friendsManager ? window.friendsManager.friends.map((friend) => friend.user_id) : []
      friendIds.push(window.currentUser.uid)

      if (friendIds.includes(feed.feed_user)) {
        this.loadFeeds()
      }
    })

    // Listen for feed changes
    window.database.ref("feeds").on("child_changed", () => {
      this.loadFeeds()
    })
  }
}

// Initialize feeds manager
const feedsManager = new FeedsManager()
window.feedsManager = feedsManager
