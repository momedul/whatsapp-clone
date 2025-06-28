// WebRTC module for voice and video calls
const firebase = window.firebase // Declare the firebase variable

class WebRTCManager {
  constructor() {
    this.localStream = null
    this.remoteStream = null
    this.peerConnection = null
    this.isInitiator = false
    this.currentCall = null
    this.init()
  }

  init() {
    // Listen for incoming calls
    if (window.currentUser) {
      window.database.ref(`calls/${window.currentUser.uid}/incoming`).on("child_added", (snapshot) => {
        this.handleIncomingCall(snapshot.key, snapshot.val())
      })
    }
  }

  async startCall(targetUserId, isVideoCall = false) {
    try {
      this.isInitiator = true
      this.currentCall = {
        targetUserId,
        isVideoCall,
        status: "calling",
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
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      })

      // Show call screen
      if (window.UI && window.UI.showCallScreen) {
        window.UI.showCallScreen(targetUserId, "Calling...", isVideoCall)
      }

      // Save call to database
      await this.saveCallRecord(targetUserId, "outgoing", isVideoCall)
    } catch (error) {
      console.error("Error starting call:", error)
      window.utils.showToast("Failed to start call", "error")
    }
  }

  async handleIncomingCall(callId, callData) {
    try {
      if (callData.type === "offer") {
        this.currentCall = {
          targetUserId: callData.from,
          isVideoCall: callData.isVideoCall,
          status: "incoming",
          callId: callId,
        }

        // Show incoming call notification
        const accept = confirm(`Incoming ${callData.isVideoCall ? "video" : "voice"} call. Accept?`)

        if (accept) {
          await this.acceptCall(callData)
        } else {
          await this.rejectCall(callId, callData.from)
        }
      } else if (callData.type === "answer") {
        await this.handleAnswer(callData.answer)
      } else if (callData.type === "ice-candidate") {
        await this.handleIceCandidate(callData.candidate)
      } else if (callData.type === "end-call") {
        this.endCall()
      }
    } catch (error) {
      console.error("Error handling incoming call:", error)
    }
  }

  async acceptCall(callData) {
    try {
      this.isInitiator = false

      // Get user media
      await this.getUserMedia(callData.isVideoCall)

      // Create peer connection
      this.createPeerConnection()

      // Add local stream
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // Set remote description
      await this.peerConnection.setRemoteDescription(callData.offer)

      // Create answer
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      // Send answer
      await this.sendSignalingMessage(callData.from, {
        type: "answer",
        answer: answer,
        from: window.currentUser.uid,
      })

      // Show call screen
      if (window.UI && window.UI.showCallScreen) {
        window.UI.showCallScreen(callData.from, "Connected", callData.isVideoCall)
      }

      // Save call record
      await this.saveCallRecord(callData.from, "incoming", callData.isVideoCall)
    } catch (error) {
      console.error("Error accepting call:", error)
    }
  }

  async rejectCall(callId, fromUserId) {
    try {
      await this.sendSignalingMessage(fromUserId, {
        type: "end-call",
        from: window.currentUser.uid,
      })

      // Remove call from Firebase
      await window.database.ref(`calls/${window.currentUser.uid}/incoming/${callId}`).remove()
    } catch (error) {
      console.error("Error rejecting call:", error)
    }
  }

  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(answer)

      // Update call status
      if (this.currentCall) {
        this.currentCall.status = "connected"
      }

      // Update UI
      const callStatusElement = document.getElementById("call-status")
      if (callStatusElement) {
        callStatusElement.textContent = "Connected"
      }
    } catch (error) {
      console.error("Error handling answer:", error)
    }
  }

  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate)
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  createPeerConnection() {
    const rtcConfiguration = window.APP_CONFIG
      ? window.APP_CONFIG.rtcConfiguration
      : {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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

      if (this.peerConnection.connectionState === "disconnected" || this.peerConnection.connectionState === "failed") {
        this.endCall()
      }
    }
  }

  async getUserMedia(isVideoCall) {
    try {
      const constraints = {
        audio: true,
        video: isVideoCall,
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

  async endCall() {
    try {
      // Send end call signal
      if (this.currentCall && this.currentCall.targetUserId) {
        await this.sendSignalingMessage(this.currentCall.targetUserId, {
          type: "end-call",
          from: window.currentUser.uid,
        })
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

      // Hide call screen
      if (window.UI && window.UI.showScreen) {
        window.UI.showScreen("main-screen")
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

  async saveCallRecord(targetUserId, direction, isVideoCall) {
    try {
      const callRecord = {
        call_from: direction === "outgoing" ? window.currentUser.uid : targetUserId,
        call_to: direction === "outgoing" ? targetUserId : window.currentUser.uid,
        call_type: isVideoCall ? "video" : "voice",
        call_direction: direction,
        call_duration: 0, // Will be updated when call ends
        call_status: "completed",
        call_created: Date.now(),
      }

      // Save to IndexedDB
      if (window.dbManager && window.dbManager.add) {
        await window.dbManager.add("calls", callRecord)
      }

      // Save to Firebase
      await window.database.ref("call_history").push({
        ...callRecord,
        call_created: firebase.database.ServerValue.TIMESTAMP,
      })
    } catch (error) {
      console.error("Error saving call record:", error)
    }
  }
}

// Initialize WebRTC manager
const webRTCManager = new WebRTCManager()
window.webRTCManager = webRTCManager
