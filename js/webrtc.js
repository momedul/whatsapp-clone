// WebRTC module for voice and video calls - Enhanced WhatsApp-like calling

class WebRTCManager {
  constructor() {
    this.localStream = null
    this.remoteStream = null
    this.peerConnection = null
    this.isInitiator = false
    this.currentCall = null
    this.callTimeout = null
    this.ringTimeout = null
    this.init()
  }

  init() {
    // Listen for incoming calls only when user is authenticated
    if (window.currentUser) {
      this.setupCallListeners()
    }
  }

  setupCallListeners() {
    // Remove any existing listeners first
    if (window.currentUser) {
      window.database.ref(`calls/${window.currentUser.uid}/incoming`).off()

      // Set up new listener
      window.database.ref(`calls/${window.currentUser.uid}/incoming`).on("child_added", (snapshot) => {
        const callData = snapshot.val()

        // Only handle calls that are less than 1 minute old to avoid processing old calls
        const now = Date.now()
        const callTime = callData.timestamp || now

        if (now - callTime < 60000) {
          // Only process calls from last minute
          this.handleIncomingCall(snapshot.key, callData)
        }

        // Clean up old call data
        setTimeout(() => {
          snapshot.ref.remove()
        }, 5000)
      })
    }
  }

  reinitialize() {
    if (window.currentUser) {
      this.setupCallListeners()
    }
  }

  async startCall(targetUserId, isVideoCall = false) {
    try {
      // Check permissions first
      const hasPermissions = await this.checkPermissions(isVideoCall)
      if (!hasPermissions) {
        window.utils.showToast("Camera/Microphone permissions required", "error")
        return false
      }

      this.isInitiator = true
      this.currentCall = {
        targetUserId,
        isVideoCall,
        status: "calling",
        startTime: Date.now(),
      }

      // Get user media
      await this.getUserMedia(isVideoCall)

      // Create peer connection
      this.createPeerConnection()

      // Add local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // Create offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      // Send offer through Firebase
      await this.sendSignalingMessage(targetUserId, {
        type: "offer",
        offer: offer,
        isVideoCall: isVideoCall,
        from: window.currentUser.uid,
        fromName: window.currentUser.displayName || "Unknown",
        fromAvatar: window.currentUser.photoURL || "/placeholder.svg?height=100&width=100",
        timestamp: window.firebase.database.ServerValue.TIMESTAMP,
      })

      // Show calling screen
      this.showCallingScreen(targetUserId, isVideoCall)

      // Set call timeout (30 seconds)
      this.callTimeout = setTimeout(() => {
        this.endCall("timeout")
      }, 30000)

      // Save call to database
      await this.saveCallRecord(targetUserId, "outgoing", isVideoCall, "calling")

      return true
    } catch (error) {
      console.error("Error starting call:", error)
      window.utils.showToast("Failed to start call", "error")
      this.endCall("error")
      return false
    }
  }

  async checkPermissions(isVideoCall) {
    try {
      const constraints = {
        audio: true,
        video: isVideoCall,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      stream.getTracks().forEach((track) => track.stop()) // Stop immediately after checking
      return true
    } catch (error) {
      console.error("Permission denied:", error)
      return false
    }
  }

  async handleIncomingCall(callId, callData) {
    try {
      if (callData.type === "offer") {
        // Check if user is already in a call
        if (this.currentCall) {
          // Send busy signal
          await this.sendSignalingMessage(callData.from, {
            type: "busy",
            from: window.currentUser.uid,
          })
          return
        }

        this.currentCall = {
          targetUserId: callData.from,
          isVideoCall: callData.isVideoCall,
          status: "incoming",
          callId: callId,
          offer: callData.offer,
          fromName: callData.fromName,
          fromAvatar: callData.fromAvatar,
        }

        // Show incoming call screen
        this.showIncomingCallScreen(callData)

        // Start ringing sound
        this.playRingtone()

        // Auto-reject after 30 seconds
        this.ringTimeout = setTimeout(() => {
          this.rejectCall("timeout")
        }, 30000)
      } else if (callData.type === "answer") {
        this.clearCallTimeout()
        await this.handleAnswer(callData.answer)
        this.updateCallStatus("connected")

        // Update call start time for duration calculation
        if (this.currentCall) {
          this.currentCall.startTime = Date.now()
        }
      } else if (callData.type === "ice-candidate") {
        await this.handleIceCandidate(callData.candidate)
      } else if (callData.type === "end-call") {
        this.endCall("ended")
      } else if (callData.type === "busy") {
        this.updateCallStatus("busy")
        setTimeout(() => this.endCall("busy"), 2000)
      } else if (callData.type === "rejected") {
        this.updateCallStatus("rejected")
        setTimeout(() => this.endCall("rejected"), 2000)
      } else if (callData.type === "ringing") {
        this.updateCallStatus("ringing")
      }
    } catch (error) {
      console.error("Error handling incoming call:", error)
    }
  }

  async acceptCall() {
    try {
      if (!this.currentCall || this.currentCall.status !== "incoming") return

      // Check permissions first
      const hasPermissions = await this.checkPermissions(this.currentCall.isVideoCall)
      if (!hasPermissions) {
        window.utils.showToast("Camera/Microphone permissions required", "error")
        this.rejectCall("permissions")
        return
      }

      this.stopRingtone()
      this.clearRingTimeout()

      this.isInitiator = false
      this.currentCall.status = "connecting"

      // Get user media
      await this.getUserMedia(this.currentCall.isVideoCall)

      // Create peer connection
      this.createPeerConnection()

      // Add local stream
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // Set remote description
      await this.peerConnection.setRemoteDescription(this.currentCall.offer)

      // Create answer
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      // Send answer
      await this.sendSignalingMessage(this.currentCall.targetUserId, {
        type: "answer",
        answer: answer,
        from: window.currentUser.uid,
      })

      // Show call screen
      this.showCallScreen(this.currentCall.targetUserId, "Connecting...", this.currentCall.isVideoCall)

      // Save call record
      await this.saveCallRecord(this.currentCall.targetUserId, "incoming", this.currentCall.isVideoCall, "connected")
    } catch (error) {
      console.error("Error accepting call:", error)
      this.rejectCall("error")
    }
  }

  async rejectCall(reason = "rejected") {
    try {
      if (!this.currentCall) return

      this.stopRingtone()
      this.clearRingTimeout()

      // Send rejection signal
      await this.sendSignalingMessage(this.currentCall.targetUserId, {
        type: "rejected",
        reason: reason,
        from: window.currentUser.uid,
      })

      // Save call record as missed
      await this.saveCallRecord(this.currentCall.targetUserId, "incoming", this.currentCall.isVideoCall, "missed")

      this.endCall("rejected")
    } catch (error) {
      console.error("Error rejecting call:", error)
    }
  }

  showIncomingCallScreen(callData) {
    // Hide all other screens
    window.$(".screen").addClass("hidden")

    // Show incoming call screen
    const incomingCallHtml = `
      <div id="incoming-call-screen" class="screen">
        <div class="incoming-call-container">
          <div class="incoming-call-info">
            <div class="incoming-call-avatar">
              <img src="${callData.fromAvatar}" alt="${callData.fromName}" id="incoming-call-avatar">
            </div>
            <h2 id="incoming-call-name">${callData.fromName}</h2>
            <p id="incoming-call-type">Incoming ${callData.isVideoCall ? "video" : "voice"} call</p>
            <div class="call-status-indicator">
              <div class="pulse-ring"></div>
              <div class="pulse-ring"></div>
              <div class="pulse-ring"></div>
            </div>
          </div>
          
          <div class="incoming-call-controls">
            <button class="call-control-btn reject-call-btn" id="reject-call-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
              </svg>
            </button>
            <button class="call-control-btn accept-call-btn" id="accept-call-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `

    // Remove existing incoming call screen
    window.$("#incoming-call-screen").remove()

    // Add to body
    window.$("body").append(incomingCallHtml)

    // Add event listeners
    window.$("#accept-call-btn").on("click", () => this.acceptCall())
    window.$("#reject-call-btn").on("click", () => this.rejectCall())
  }

  showCallingScreen(targetUserId, isVideoCall) {
    // Get target user info
    window.database.ref(`users/${targetUserId}`).once("value", (snapshot) => {
      const userData = snapshot.val()
      if (userData) {
        window.UI.showCallScreen(targetUserId, "Calling...", isVideoCall, userData)
        this.updateCallStatus("calling")
      }
    })
  }

  updateCallStatus(status) {
    if (this.currentCall) {
      this.currentCall.status = status
    }

    const statusElement = window.$("#call-status")
    const statusMessages = {
      calling: "Calling...",
      ringing: "Ringing...",
      connecting: "Connecting...",
      connected: "Connected",
      busy: "Busy",
      rejected: "Call declined",
      timeout: "No answer",
      ended: "Call ended",
    }

    if (statusElement.length) {
      statusElement.text(statusMessages[status] || status)
    }
  }

  playRingtone() {
    // Create audio element for ringtone
    this.ringtone = new Audio()
    this.ringtone.src =
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
    this.ringtone.loop = true
    this.ringtone.volume = 0.5
    this.ringtone.play().catch((e) => console.log("Could not play ringtone:", e))
  }

  stopRingtone() {
    if (this.ringtone) {
      this.ringtone.pause()
      this.ringtone = null
    }
  }

  clearCallTimeout() {
    if (this.callTimeout) {
      clearTimeout(this.callTimeout)
      this.callTimeout = null
    }
  }

  clearRingTimeout() {
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout)
      this.ringTimeout = null
    }
  }

  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(answer)
      this.clearCallTimeout()
      this.updateCallStatus("connected")

      // Send ringing confirmation
      await this.sendSignalingMessage(this.currentCall.targetUserId, {
        type: "ringing",
        from: window.currentUser.uid,
      })
    } catch (error) {
      console.error("Error handling answer:", error)
    }
  }

  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(candidate)
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  createPeerConnection() {
    const rtcConfiguration = {
      iceServers: [
        // Google STUN servers (most reliable)
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },

        // Cloudflare STUN servers
        { urls: "stun:stun.cloudflare.com:3478" },

        // Mozilla STUN servers
        { urls: "stun:stun.services.mozilla.com" },

        // Additional reliable STUN servers
        { urls: "stun:stun.ekiga.net" },
        { urls: "stun:stun.ideasip.com" },
        { urls: "stun:stun.rixtelecom.se" },
        { urls: "stun:stun.schlund.de" },
        { urls: "stun:stun.stunprotocol.org:3478" },
        { urls: "stun:stun.voiparound.com" },
        { urls: "stun:stun.voipbuster.com" },

        // Backup STUN servers
        { urls: "stun:openrelay.metered.ca:80" },
        { urls: "stun:relay.metered.ca:80" },
      ],
      iceCandidatePoolSize: 10,
    }

    this.peerConnection = new RTCPeerConnection(rtcConfiguration)

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCall) {
        this.sendSignalingMessage(this.currentCall.targetUserId, {
          type: "ice-candidate",
          candidate: event.candidate,
          from: window.currentUser.uid,
        })
      }
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0]
      const remoteVideo = document.getElementById("remote-video")
      if (remoteVideo) {
        remoteVideo.srcObject = this.remoteStream
      }
    }

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection.connectionState)

      if (this.peerConnection.connectionState === "connected") {
        this.updateCallStatus("connected")
        // Set start time when actually connected
        if (this.currentCall && !this.currentCall.startTime) {
          this.currentCall.startTime = Date.now()
        }
      } else if (
        this.peerConnection.connectionState === "disconnected" ||
        this.peerConnection.connectionState === "failed"
      ) {
        this.endCall("connection_failed")
      }
    }

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", this.peerConnection.iceConnectionState)

      if (
        this.peerConnection.iceConnectionState === "connected" ||
        this.peerConnection.iceConnectionState === "completed"
      ) {
        this.updateCallStatus("connected")
      } else if (this.peerConnection.iceConnectionState === "failed") {
        this.endCall("connection_failed")
      }
    }
  }

  async getUserMedia(isVideoCall) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideoCall
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Show local video if video call
      if (isVideoCall) {
        const localVideo = document.getElementById("local-video")
        if (localVideo) {
          localVideo.srcObject = this.localStream
        }
      }

      return this.localStream
    } catch (error) {
      console.error("Error getting user media:", error)
      throw error
    }
  }

  async sendSignalingMessage(targetUserId, message) {
    try {
      const messageRef = window.database.ref(`calls/${targetUserId}/incoming`).push()
      await messageRef.set(message)
    } catch (error) {
      console.error("Error sending signaling message:", error)
    }
  }

  async endCall(reason = "ended") {
    try {
      this.stopRingtone()
      this.clearCallTimeout()
      this.clearRingTimeout()

      // Send end call signal
      if (this.currentCall && this.currentCall.targetUserId) {
        await this.sendSignalingMessage(this.currentCall.targetUserId, {
          type: "end-call",
          reason: reason,
          from: window.currentUser.uid,
        })
      }

      // Calculate call duration
      let duration = 0
      if (this.currentCall && this.currentCall.startTime && this.currentCall.status === "connected") {
        duration = Math.floor((Date.now() - this.currentCall.startTime) / 1000)
      }

      // Update call record with duration
      if (this.currentCall && duration > 0) {
        await this.updateCallDuration(this.currentCall.targetUserId, duration)
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop())
        this.localStream = null
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close()
        this.peerConnection = null
      }

      // Reset variables
      this.remoteStream = null
      this.currentCall = null
      this.isInitiator = false

      // Remove incoming call screen
      window.$("#incoming-call-screen").remove()

      // Hide call screen and show main screen
      if (window.UI && window.UI.showScreen) {
        window.UI.showScreen("main-screen")
      }

      // Show end call message
      if (reason !== "ended") {
        const messages = {
          timeout: "Call timed out",
          busy: "User is busy",
          rejected: "Call was declined",
          connection_failed: "Connection failed",
          error: "Call failed",
        }
        window.utils.showToast(messages[reason] || "Call ended", "info")
      }
    } catch (error) {
      console.error("Error ending call:", error)
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return !audioTrack.enabled
      }
    }
    return false
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        return !videoTrack.enabled
      }
    }
    return false
  }

  async saveCallRecord(targetUserId, direction, isVideoCall, status) {
    try {
      const callRecord = {
        call_from: direction === "outgoing" ? window.currentUser.uid : targetUserId,
        call_to: direction === "outgoing" ? targetUserId : window.currentUser.uid,
        call_type: isVideoCall ? "video" : "voice",
        call_direction: direction,
        call_duration: 0,
        call_status: status,
        call_created: Date.now(),
      }

      // Save to IndexedDB
      if (window.dbManager && window.dbManager.add) {
        await window.dbManager.add("calls", callRecord)
      }

      // Save to Firebase
      await window.database.ref("call_history").push({
        ...callRecord,
        call_created: window.firebase.database.ServerValue.TIMESTAMP,
      })
    } catch (error) {
      console.error("Error saving call record:", error)
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
          call_duration: duration,
          call_status: "completed",
        })

        // Update IndexedDB
        const localCall = await window.dbManager.get("calls", callToUpdate.id)
        if (localCall) {
          localCall.call_duration = duration
          localCall.call_status = "completed"
          await window.dbManager.put("calls", localCall)
        }
      }
    } catch (error) {
      console.error("Error updating call duration:", error)
    }
  }
}

// Initialize WebRTC manager
const webRTCManager = new WebRTCManager()
window.webRTCManager = webRTCManager
