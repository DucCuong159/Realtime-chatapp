import { DEFAULT_ICE_SERVERS } from "@/constants/call.constant";

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private queuedIceCandidates: RTCIceCandidateInit[] = [];

  constructor() {
    // Lazily create audio element for remote stream output
    if (typeof window !== "undefined") {
      this.remoteAudioElement = new Audio();
      this.remoteAudioElement.autoplay = true;
    }
  }

  /**
   * Acquire local audio stream from user microphone
   */
  async getLocalAudioStream(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error("Failed to acquire user microphone:", error);
      throw error;
    }
  }

  /**
   * Initialize PeerConnection with ICE callbacks
   */
  async initializePeerConnection(
    onIceCandidate: (candidate: RTCIceCandidateInit) => void,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void,
  ): Promise<RTCPeerConnection> {
    this.cleanupPeerConnection();

    const pc = new RTCPeerConnection(DEFAULT_ICE_SERVERS);
    this.peerConnection = pc;
    this.queuedIceCandidates = [];
    this.remoteStream = new MediaStream();

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = this.remoteStream;
    }

    // Add local audio tracks to connection
    const localStream = await this.getLocalAudioStream();
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle remote track received
    pc.ontrack = (event) => {
      if (this.remoteStream && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          this.remoteStream?.addTrack(track);
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate.toJSON());
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      onConnectionStateChange?.(pc.connectionState);
    };

    return pc;
  }

  /**
   * Create SDP Offer (Caller side)
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("PeerConnection not initialized");
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Handle SDP Offer and Create Answer (Callee side)
   */
  async handleOffer(
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("PeerConnection not initialized");
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer),
    );

    // Process any ICE candidates received before remote description was set
    await this.processQueuedIceCandidates();

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Handle SDP Answer (Caller side)
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    if (this.peerConnection.signalingState !== "stable") {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer),
      );
      await this.processQueuedIceCandidates();
    }
  }

  /**
   * Add ICE candidate from remote peer
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.queuedIceCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding received ICE candidate:", error);
    }
  }

  /**
   * Process any queued ICE candidates after remote description is set
   */
  private async processQueuedIceCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    while (this.queuedIceCandidates.length > 0) {
      const candidate = this.queuedIceCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate),
          );
        } catch (error) {
          console.error("Error adding queued ICE candidate:", error);
        }
      }
    }
  }

  /**
   * Toggle local microphone mute
   */
  setMute(isMuted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  /**
   * Cleanup peer connection only
   */
  private cleanupPeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.queuedIceCandidates = [];
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }
    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }
  }

  /**
   * Full cleanup: stops all media tracks, closes PC, resets audio element
   */
  cleanup(): void {
    this.cleanupPeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}

export const webrtcManager = new WebRTCManager();
