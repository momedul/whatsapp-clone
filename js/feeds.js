// Feeds management module
//import firebase from "firebase/app"
//import "firebase/database"
//import "firebase/storage"

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

  async checkIfLiked(feedId) {
    try {
      const likeSnapshot = await window.database.ref(`feed_likes/${feedId}/${window.currentUser.uid}`).once("value")
      return likeSnapshot.exists()
    } catch (error) {
      console.error("Error checking like status:", error)
      return false
    }
  }

  async addComment(feedId, commentText) {
    try {
      const commentData = {
        comment_user: window.currentUser.uid,
        comment_text: commentText,
        comment_created: firebase.database.ServerValue.TIMESTAMP,
      }

      const commentRef = window.database.ref(`feed_comments/${feedId}`).push()
      await commentRef.set(commentData)

      // Update comment count
      await window.database.ref(`feeds/${feedId}/feed_comments`).transaction((comments) => (comments || 0) + 1)

      window.utils.showToast("Comment added!", "success")
      return commentRef.key
    } catch (error) {
      console.error("Error adding comment:", error)
      window.utils.showToast("Failed to add comment", "error")
      return null
    }
  }

  async getComments(feedId) {
    try {
      const commentsSnapshot = await window.database
        .ref(`feed_comments/${feedId}`)
        .orderByChild("comment_created")
        .once("value")

      const comments = []
      const commentPromises = []

      commentsSnapshot.forEach((childSnapshot) => {
        const comment = childSnapshot.val()
        const commentId = childSnapshot.key

        commentPromises.push(
          window.database
            .ref(`users/${comment.comment_user}`)
            .once("value")
            .then((userSnapshot) => {
              const userData = userSnapshot.val()
              if (userData) {
                comments.push({
                  comment_id: commentId,
                  comment_user: comment.comment_user,
                  comment_text: comment.comment_text,
                  comment_created: comment.comment_created,
                  user_name: userData.name,
                  user_avatar: userData.avatar,
                })
              }
            }),
        )
      })

      await Promise.all(commentPromises)

      // Sort by creation time
      comments.sort((a, b) => a.comment_created - b.comment_created)

      return comments
    } catch (error) {
      console.error("Error getting comments:", error)
      return []
    }
  }

  async deleteFeed(feedId) {
    try {
      const feedSnapshot = await window.database.ref(`feeds/${feedId}`).once("value")
      const feed = feedSnapshot.val()

      if (feed && feed.feed_user === window.currentUser.uid) {
        // Delete feed
        await window.database.ref(`feeds/${feedId}`).remove()

        // Delete associated likes and comments
        await window.database.ref(`feed_likes/${feedId}`).remove()
        await window.database.ref(`feed_comments/${feedId}`).remove()

        // Delete from IndexedDB
        await window.dbManager.delete("feeds", feedId)

        window.utils.showToast("Feed deleted successfully!", "success")
        this.loadFeeds()
        return true
      } else {
        window.utils.showToast("You can only delete your own feeds", "error")
        return false
      }
    } catch (error) {
      console.error("Error deleting feed:", error)
      window.utils.showToast("Failed to delete feed", "error")
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

  getFeedById(feedId) {
    return this.feeds.find((feed) => feed.feed_id === feedId)
  }
}

// Initialize feeds manager
const feedsManager = new FeedsManager()
window.feedsManager = feedsManager
