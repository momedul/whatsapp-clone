// Calls management module
//import firebase from "firebase/app"
//import "firebase/database"

class CallsManager {
  constructor() {
    this.callHistory = []
    this.activeCall = null
  }

  init() {
    if (!window.currentUser) return

    this.loadCallHistory()
    this.listenForIncomingCalls()
  }

  async makeCall(targetUserId, isVideoCall = false) {
    try {
      // Start WebRTC call
      await window.webRTCManager.startCall(targetUserId, isVideoCall)

      // Save call record
      await this.saveCallRecord(targetUserId, "outgoing", isVideoCall, "initiated")

      this.activeCall = {
        targetUserId,
        isVideoCall,
        direction: "outgoing",
        startTime: Date.now(),
      }

      return true
    } catch (error) {
      console.error("Error making call:", error)
      window.utils.showToast("Failed to make call", "error")
      return false
    }
  }

  async endCall() {
    try {
      if (this.activeCall) {
        const duration = Date.now() - this.activeCall.startTime

        // Update call record with duration
        await this.updateCallDuration(this.activeCall.targetUserId, duration)

        // End WebRTC call
        await window.webRTCManager.endCall()

        this.activeCall = null
        this.loadCallHistory()
      }
    } catch (error) {
      console.error("Error ending call:", error)
    }
  }

  async saveCallRecord(targetUserId, direction, isVideoCall, status) {
    try {
      const callRecord = {
        call_from: direction === "outgoing" ? window.currentUser.uid : targetUserId,
        call_to: direction === "outgoing" ? targetUserId : window.currentUser.uid,
        call_type: isVideoCall ? "video" : "voice",
        call_direction: direction,
        call_status: status,
        call_duration: 0,
        call_created: firebase.database.ServerValue.TIMESTAMP,
      }

      // Save to Firebase
      const callRef = window.database.ref("call_history").push()
      await callRef.set(callRecord)

      // Save to IndexedDB
      await window.dbManager.put("calls", {
        call_id: callRef.key,
        call_from: callRecord.call_from,
        call_to: callRecord.call_to,
        call_type: callRecord.call_type,
        call_direction: direction,
        call_status: status,
        call_duration: 0,
        call_created: Date.now(),
      })

      return callRef.key
    } catch (error) {
      console.error("Error saving call record:", error)
      return null
    }
  }

  async updateCallDuration(targetUserId, duration) {
    try {
      // Find the most recent call record
      const callsSnapshot = await window.database
        .ref("call_history")
        .orderByChild("call_created")
        .limitToLast(10)
        .once("value")

      let callToUpdate = null
      callsSnapshot.forEach((childSnapshot) => {
        const call = childSnapshot.val()
        if (
          ((call.call_from === window.currentUser.uid && call.call_to === targetUserId) ||
            (call.call_from === targetUserId && call.call_to === window.currentUser.uid)) &&
          call.call_duration === 0
        ) {
          callToUpdate = {
            id: childSnapshot.key,
            ...call,
          }
        }
      })

      if (callToUpdate) {
        await window.database.ref(`call_history/${callToUpdate.id}`).update({
          call_duration: Math.floor(duration / 1000), // Convert to seconds
          call_status: "completed",
        })

        // Update IndexedDB
        const localCall = await window.dbManager.get("calls", callToUpdate.id)
        if (localCall) {
          localCall.call_duration = Math.floor(duration / 1000)
          localCall.call_status = "completed"
          await window.dbManager.put("calls", localCall)
        }
      }
    } catch (error) {
      console.error("Error updating call duration:", error)
    }
  }

  async loadCallHistory() {
    try {
      // Get call history involving current user
      const callsSnapshot = await window.database
        .ref("call_history")
        .orderByChild("call_created")
        .limitToLast(50)
        .once("value")

      const calls = []
      const callPromises = []

      callsSnapshot.forEach((childSnapshot) => {
        const call = childSnapshot.val()
        const callId = childSnapshot.key

        if (call.call_from === window.currentUser.uid || call.call_to === window.currentUser.uid) {
          const otherUserId = call.call_from === window.currentUser.uid ? call.call_to : call.call_from
          const direction = call.call_from === window.currentUser.uid ? "outgoing" : "incoming"

          callPromises.push(
            window.database
              .ref(`users/${otherUserId}`)
              .once("value")
              .then((userSnapshot) => {
                const userData = userSnapshot.val()
                if (userData) {
                  calls.push({
                    call_id: callId,
                    contact_id: otherUserId,
                    contact_name: userData.name,
                    contact_avatar: userData.avatar,
                    call_type: call.call_type,
                    call_direction: direction,
                    call_status: call.call_status,
                    call_duration: call.call_duration,
                    call_created: call.call_created,
                  })
                }
              }),
          )
        }
      })

      await Promise.all(callPromises)

      // Sort by creation time (newest first)
      calls.sort((a, b) => b.call_created - a.call_created)

      this.callHistory = calls
      if (window.UI && window.UI.updateCallHistory) {
        window.UI.updateCallHistory(calls)
      }

      return calls
    } catch (error) {
      console.error("Error loading call history:", error)
      return []
    }
  }

  listenForIncomingCalls() {
    // This is handled by WebRTCManager
    // Just listen for call status updates
    window.database.ref("call_history").on("child_added", (snapshot) => {
      const call = snapshot.val()
      if (call.call_to === window.currentUser.uid && call.call_status === "initiated") {
        // Incoming call notification is handled by WebRTCManager
        this.loadCallHistory()
      }
    })

    window.database.ref("call_history").on("child_changed", () => {
      this.loadCallHistory()
    })
  }

  formatCallDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}:${minutes.toString().padStart(2, "0")}:00`
    }
  }

  getCallStatusIcon(call) {
    if (call.call_direction === "outgoing") {
      return call.call_status === "completed" ? "📞" : "📱"
    } else {
      return call.call_status === "completed" ? "📞" : "📵"
    }
  }

  async deleteCallRecord(callId) {
    try {
      await window.database.ref(`call_history/${callId}`).remove()
      await window.dbManager.delete("calls", callId)

      window.utils.showToast("Call record deleted", "success")
      this.loadCallHistory()
    } catch (error) {
      console.error("Error deleting call record:", error)
      window.utils.showToast("Failed to delete call record", "error")
    }
  }
}

// Initialize calls manager
const callsManager = new CallsManager()
window.callsManager = callsManager
