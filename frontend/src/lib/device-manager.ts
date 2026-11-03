import type { CallType } from "@/types/call.type";

export type SwitchCameraResult = "success" | "no-alternate" | "failed";

export const getMediaConstraints = (
  callType: CallType,
): MediaStreamConstraints => {
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

/**
 * Requests media stream with constraints and fallback logic.
 */
export const requestUserMedia = async (
  callType: CallType,
): Promise<MediaStream> => {
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

/**
 * Stops all tracks in a MediaStream to release camera/mic sensors.
 */
export const stopMediaTracks = (stream: MediaStream | null): void => {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
};

/**
 * Toggles audio tracks enabled/disabled.
 */
export const setAudioTracksEnabled = (
  stream: MediaStream | null,
  enabled: boolean,
): void => {
  if (!stream) return;
  stream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
};

/**
 * Toggles video tracks enabled/disabled.
 */
export const setVideoTracksEnabled = (
  stream: MediaStream | null,
  enabled: boolean,
): void => {
  if (!stream) return;
  stream.getVideoTracks().forEach((track) => {
    track.enabled = enabled;
  });
};

export interface SwitchCameraOptions {
  localStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  isVideoEnabled: boolean;
  isAborted?: () => boolean;
}

/**
 * Switches between front and rear cameras, replacing the track in both localStream and PeerConnection.
 */
export const switchCameraDevice = async ({
  localStream,
  peerConnection,
  isVideoEnabled,
  isAborted,
}: SwitchCameraOptions): Promise<SwitchCameraResult> => {
  if (!localStream) return "no-alternate";
  const currentVideoTrack = localStream.getVideoTracks()[0];
  if (!currentVideoTrack) return "no-alternate";

  let newStream: MediaStream | null = null;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");
    if (videoDevices.length < 2) return "no-alternate";

    const currentDeviceId = currentVideoTrack.getSettings().deviceId;
    const nextDevice =
      videoDevices.find((d) => d.deviceId !== currentDeviceId) ||
      videoDevices[0];

    newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: nextDevice.deviceId } },
    });

    if (isAborted?.()) {
      stopMediaTracks(newStream);
      return "failed";
    }

    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) {
      stopMediaTracks(newStream);
      return "failed";
    }
    newVideoTrack.enabled = isVideoEnabled;

    if (peerConnection) {
      const sender = peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
    }

    if (isAborted?.()) {
      stopMediaTracks(newStream);
      return "failed";
    }

    localStream.removeTrack(currentVideoTrack);
    currentVideoTrack.stop();
    localStream.addTrack(newVideoTrack);
    return "success";
  } catch (err) {
    if (newStream) {
      stopMediaTracks(newStream);
    }
    console.error("Failed to switch camera:", err);
    return "failed";
  }
};
