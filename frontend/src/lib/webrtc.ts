import { DEFAULT_ICE_SERVERS } from "@/constants/call.constant";
import type { CallType } from "@/types/call.type";

const getMediaConstraints = (callType: CallType): MediaStreamConstraints => {
  if (callType === "video") {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        facingMode: "user",
      },
    };
  }
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  };
};

const requestMedia = async (callType: CallType): Promise<MediaStream> => {
  const constraints = getMediaConstraints(callType);
  if (callType !== "video") {
    return navigator.mediaDevices.getUserMedia(constraints);
  }
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn("Retrying getUserMedia with basic constraints:", err);
    return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  }
};

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private queuedIceCandidates: RTCIceCandidateInit[] = [];
  private isCleanedUp = false;
  private pendingMediaPromise: Promise<MediaStream> | null = null;
  private onRemoteTrackListener: ((stream: MediaStream) => void) | null = null;
  private onLocalStreamListener: ((stream: MediaStream) => void) | null = null;

  constructor() {
    // Lazily create audio element for remote stream output
    if (typeof window !== "undefined") {
      this.remoteAudioElement = new Audio();
      this.remoteAudioElement.autoplay = true;
    }
  }

  /**
   * Acquire local stream (audio or audio + video) from user hardware.
   * If cleanup() is invoked before this promise resolves, newly acquired tracks
   * are immediately stopped to avoid keeping hardware sensors active.
   */
  async getLocalStream(callType: CallType = "audio"): Promise<MediaStream> {
    if (this.localStream) {
      const hasVideoTrack = this.localStream.getVideoTracks().length > 0;
      if (callType === "video" && !hasVideoTrack) {
        // Upgrade from audio-only to audio + video
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      } else {
        return this.localStream;
      }
    }

    if (this.pendingMediaPromise) {
      this.isCleanedUp = false;
      return this.pendingMediaPromise;
    }

    this.isCleanedUp = false;

    this.pendingMediaPromise = (async () => {
      try {
        const stream = await requestMedia(callType);
        if (this.isCleanedUp) {
          stream.getTracks().forEach((track) => track.stop());
          throw new Error("Call ended before media access was granted");
        }

        this.localStream = stream;
        this.onLocalStreamListener?.(stream);
        return stream;
      } catch (error) {
        console.error("Failed to acquire user media:", error);
        throw error;
      } finally {
        this.pendingMediaPromise = null;
      }
    })();

    return this.pendingMediaPromise;
  }

  /**
   * Backward compatibility helper for acquiring audio stream
   */
  async getLocalAudioStream(): Promise<MediaStream> {
    return this.getLocalStream("audio");
  }

  getLocalMediaStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteMediaStream(): MediaStream | null {
    return this.remoteStream;
  }

  setOnRemoteTrack(listener: ((stream: MediaStream) => void) | null): void {
    this.onRemoteTrackListener = listener;
    if (this.remoteStream && listener) {
      listener(this.remoteStream);
    }
  }

  setOnLocalStream(listener: ((stream: MediaStream) => void) | null): void {
    this.onLocalStreamListener = listener;
    if (this.localStream && listener) {
      listener(this.localStream);
    }
  }

  /**
   * Initialize PeerConnection with ICE callbacks and media tracks
   */
  async initializePeerConnection(
    callType: CallType = "audio",
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

    // Add local tracks (audio and optional video) to connection
    const localStream = await this.getLocalStream(callType);
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle remote tracks received
    pc.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        if (this.remoteAudioElement) {
          this.remoteAudioElement.srcObject = this.remoteStream;
        }
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!this.remoteStream!.getTracks().some((t) => t.id === track.id)) {
            this.remoteStream!.addTrack(track);
          }
        });
      } else if (event.track) {
        if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }

      this.onRemoteTrackListener?.(this.remoteStream);
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
  async createOffer(
    callType: CallType = "audio",
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("PeerConnection not initialized");
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === "video",
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
   * Toggle local camera track enabled/disabled
   */
  setVideoEnabled(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Switch between available cameras (e.g., front and back on mobile/tablet)
   */
  async switchCamera(): Promise<boolean> {
    if (!this.localStream) return false;
    const currentVideoTrack = this.localStream.getVideoTracks()[0];
    if (!currentVideoTrack) return false;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      if (videoDevices.length < 2) return false;

      const currentDeviceId = currentVideoTrack.getSettings().deviceId;
      const nextDevice =
        videoDevices.find((d) => d.deviceId !== currentDeviceId) ||
        videoDevices[0];

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDevice.deviceId } },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return false;

      if (this.peerConnection) {
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      this.localStream.removeTrack(currentVideoTrack);
      currentVideoTrack.stop();
      this.localStream.addTrack(newVideoTrack);
      this.onLocalStreamListener?.(this.localStream);
      return true;
    } catch (err) {
      console.error("Failed to switch camera:", err);
      return false;
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
   * Full cleanup: stops all media tracks, closes PC, resets audio element,
   * and cancels any pending media acquisition.
   */
  cleanup(): void {
    this.isCleanedUp = true;
    this.onRemoteTrackListener = null;
    this.onLocalStreamListener = null;
    this.cleanupPeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}

export const webrtcManager = new WebRTCManager();
