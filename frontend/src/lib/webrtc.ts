import { DEFAULT_ICE_SERVERS } from "@/constants/call.constant";
import type { CallType } from "@/types/call.type";
import {
  requestUserMedia,
  setAudioTracksEnabled,
  setVideoTracksEnabled,
  stopMediaTracks,
  switchCameraDevice,
  type SwitchCameraResult,
} from "./device-manager";

export type { SwitchCameraResult };

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private queuedIceCandidates: RTCIceCandidateInit[] = [];
  private isCleanedUp = false;
  private isVideoEnabled = true;
  private isAudioEnabled = true;
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
        stopMediaTracks(this.localStream);
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
        const stream = await requestUserMedia(callType);
        if (this.isCleanedUp) {
          stopMediaTracks(stream);
          throw new Error("Call ended before media access was granted");
        }

        // Apply persisted track enabled states (e.g., pre-connect camera-off or mute action)
        setVideoTracksEnabled(stream, this.isVideoEnabled);
        setAudioTracksEnabled(stream, this.isAudioEnabled);

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

  /**
   * Inject or update peer connection instance (primarily for test environments).
   */
  setPeerConnection(pc: RTCPeerConnection | null): void {
    this.peerConnection = pc;
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
        if (
          !this.remoteStream.getTracks().some((t) => t.id === event.track.id)
        ) {
          this.remoteStream.addTrack(event.track);
        }
      }

      if (this.remoteAudioElement) {
        this.remoteAudioElement.play().catch(() => {});
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
    await this.tuneSenderParameters();
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
    await this.tuneSenderParameters();
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
      await this.tuneSenderParameters();
    }
  }

  /**
   * Optimize WebRTC audio/video bitrate and encoding parameters for HD quality.
   */
  async tuneSenderParameters(): Promise<void> {
    if (!this.peerConnection) return;
    const senders = this.peerConnection.getSenders();

    for (const sender of senders) {
      if (!sender.track) continue;

      try {
        const parameters = sender.getParameters?.();
        if (
          !parameters ||
          !parameters.encodings ||
          parameters.encodings.length === 0
        ) {
          continue;
        }

        if (sender.track.kind === "video") {
          for (const encoding of parameters.encodings) {
            encoding.maxBitrate = 2_500_000; // 2.5 Mbps for FullHD/HD
          }
          parameters.degradationPreference = "maintain-framerate";
        } else if (sender.track.kind === "audio") {
          for (const encoding of parameters.encodings) {
            encoding.maxBitrate = 64_000; // 64 kbps for Studio Opus Voice
          }
        }

        await sender.setParameters?.(parameters);
      } catch (err) {
        console.warn("Could not tune sender parameters:", err);
      }
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
    this.isAudioEnabled = !isMuted;
    setAudioTracksEnabled(this.localStream, !isMuted);
  }

  /**
   * Toggle local camera track enabled/disabled
   */
  setVideoEnabled(enabled: boolean): void {
    this.isVideoEnabled = enabled;
    setVideoTracksEnabled(this.localStream, enabled);
  }

  /**
   * Switch between available cameras (e.g., front and back on mobile/tablet)
   */
  async switchCamera(): Promise<SwitchCameraResult> {
    const result = await switchCameraDevice({
      localStream: this.localStream,
      peerConnection: this.peerConnection,
      isVideoEnabled: this.isVideoEnabled,
      isAborted: () => this.isCleanedUp,
    });

    if (result === "success" && this.localStream) {
      this.onLocalStreamListener?.(this.localStream);
    }

    return result;
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
      stopMediaTracks(this.remoteStream);
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
    this.isVideoEnabled = true;
    this.isAudioEnabled = true;
    this.onRemoteTrackListener = null;
    this.onLocalStreamListener = null;
    this.cleanupPeerConnection();

    if (this.localStream) {
      stopMediaTracks(this.localStream);
      this.localStream = null;
    }
  }
}

export const webrtcManager = new WebRTCManager();
