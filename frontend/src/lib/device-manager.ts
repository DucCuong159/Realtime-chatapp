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

interface CameraTargetConstraints {
  primary: MediaStreamConstraints;
  fallback: MediaStreamConstraints;
  targetFacingMode?: "user" | "environment";
}

const isOverconstrainedError = (err: unknown): boolean => {
  if (!err) return false;
  if (typeof err === "string") return err.includes("OverconstrainedError");
  if (typeof err === "object") {
    const error = err as { name?: string; message?: string };
    return (
      error.name === "OverconstrainedError" ||
      error.message?.includes("OverconstrainedError") === true
    );
  }
  return false;
};

const isHardwareLockError = (err: unknown): boolean => {
  if (!err) return false;
  if (typeof err === "string") {
    return err.includes("NotReadableError") || err.includes("TrackStartError");
  }
  if (typeof err === "object") {
    const error = err as { name?: string; message?: string };
    return (
      error.name === "NotReadableError" ||
      error.name === "TrackStartError" ||
      error.message?.includes("NotReadableError") === true ||
      error.message?.includes("TrackStartError") === true
    );
  }
  return false;
};

const resolveCameraConstraints = async (
  currentVideoTrack: MediaStreamTrack,
): Promise<CameraTargetConstraints | "no-alternate"> => {
  const settings =
    typeof currentVideoTrack.getSettings === "function"
      ? currentVideoTrack.getSettings()
      : {};
  const currentFacingMode = settings.facingMode;
  const currentDeviceId = settings.deviceId;

  if (currentFacingMode) {
    const targetFacingMode =
      currentFacingMode === "environment" ? "user" : "environment";
    return {
      primary: { video: { facingMode: { ideal: targetFacingMode } } },
      fallback: { video: { facingMode: targetFacingMode } },
      targetFacingMode,
    };
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  if (videoDevices.length < 2) return "no-alternate";

  const nextDevice =
    videoDevices.find(
      (d) => Boolean(d.deviceId) && d.deviceId !== currentDeviceId,
    ) ||
    videoDevices.find((d) => d.deviceId !== currentDeviceId) ||
    videoDevices[0];

  return {
    primary: nextDevice?.deviceId
      ? { video: { deviceId: { exact: nextDevice.deviceId } } }
      : { video: true },
    fallback: { video: true },
  };
};

const acquireCameraStream = async (
  constraints: CameraTargetConstraints,
): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints.primary);
  } catch (err) {
    if (!isOverconstrainedError(err)) throw err;

    try {
      return await navigator.mediaDevices.getUserMedia(constraints.fallback);
    } catch (fallbackErr) {
      if (constraints.targetFacingMode && isOverconstrainedError(fallbackErr)) {
        return await navigator.mediaDevices.getUserMedia({ video: true });
      }
      throw fallbackErr;
    }
  }
};

const replacePeerConnectionTrack = async (
  peerConnection: RTCPeerConnection | null,
  newVideoTrack: MediaStreamTrack,
): Promise<void> => {
  if (!peerConnection) return;
  const sender = peerConnection
    .getSenders()
    .find((s) => s.track?.kind === "video");
  if (sender) {
    await sender.replaceTrack(newVideoTrack);
  }
};

const isMismatchedCamera = (
  newVideoTrack: MediaStreamTrack,
  targetConstraints: CameraTargetConstraints,
  currentDeviceId?: string,
): boolean => {
  const acquiredSettings =
    typeof newVideoTrack.getSettings === "function"
      ? newVideoTrack.getSettings()
      : {};

  const isWrongFacingMode = Boolean(
    targetConstraints.targetFacingMode &&
      acquiredSettings.facingMode &&
      acquiredSettings.facingMode !== targetConstraints.targetFacingMode,
  );

  const isSameDevice = Boolean(
    currentDeviceId &&
      acquiredSettings.deviceId &&
      acquiredSettings.deviceId === currentDeviceId,
  );

  return isWrongFacingMode || isSameDevice;
};

interface RestoreCameraParams {
  currentVideoTrack: MediaStreamTrack;
  currentDeviceId?: string;
  currentFacingMode?: string;
  localStream: MediaStream;
  peerConnection: RTCPeerConnection | null;
  isVideoEnabled: boolean;
}

const restoreOriginalCameraTrack = async ({
  currentVideoTrack,
  currentDeviceId,
  currentFacingMode,
  localStream,
  peerConnection,
  isVideoEnabled,
}: RestoreCameraParams): Promise<void> => {
  try {
    const restoreConstraints: MediaStreamConstraints = currentDeviceId
      ? { video: { deviceId: { exact: currentDeviceId } } }
      : currentFacingMode
        ? { video: { facingMode: { ideal: currentFacingMode } } }
        : { video: true };

    let restoredStream: MediaStream;
    try {
      restoredStream =
        await navigator.mediaDevices.getUserMedia(restoreConstraints);
    } catch {
      restoredStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
    }

    const restoredTrack = restoredStream.getVideoTracks()[0];
    if (restoredTrack) {
      restoredTrack.enabled = isVideoEnabled;
      localStream.removeTrack(currentVideoTrack);
      localStream.addTrack(restoredTrack);
      await replacePeerConnectionTrack(peerConnection, restoredTrack);
    }
  } catch (err) {
    console.error("Failed to restore original camera:", err);
  }
};

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

  const currentSettings =
    typeof currentVideoTrack.getSettings === "function"
      ? currentVideoTrack.getSettings()
      : {};
  const currentDeviceId = currentSettings.deviceId;
  const currentFacingMode = currentSettings.facingMode;

  let newStream: MediaStream | null = null;
  let currentTrackStopped = false;
  let originalTrackRestored = false;

  const restoreOriginalCamera = async (): Promise<void> => {
    if (!currentTrackStopped || originalTrackRestored) return;
    originalTrackRestored = true;
    await restoreOriginalCameraTrack({
      currentVideoTrack,
      currentDeviceId,
      currentFacingMode,
      localStream,
      peerConnection,
      isVideoEnabled,
    });
  };

  try {
    const targetConstraints =
      await resolveCameraConstraints(currentVideoTrack);
    if (targetConstraints === "no-alternate") return "no-alternate";

    try {
      newStream = await acquireCameraStream(targetConstraints);
    } catch (err) {
      if (isHardwareLockError(err) && !currentTrackStopped) {
        currentVideoTrack.stop();
        currentTrackStopped = true;
        if (isAborted?.()) {
          await restoreOriginalCamera();
          return "failed";
        }
        try {
          newStream = await acquireCameraStream(targetConstraints);
        } catch (retryErr) {
          await restoreOriginalCamera();
          throw retryErr;
        }
      } else {
        throw err;
      }
    }

    if (isAborted?.()) {
      stopMediaTracks(newStream);
      await restoreOriginalCamera();
      return "failed";
    }

    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) {
      stopMediaTracks(newStream);
      await restoreOriginalCamera();
      return "failed";
    }

    if (isMismatchedCamera(newVideoTrack, targetConstraints, currentDeviceId)) {
      stopMediaTracks(newStream);
      await restoreOriginalCamera();
      return "no-alternate";
    }

    newVideoTrack.enabled = isVideoEnabled;

    await replacePeerConnectionTrack(peerConnection, newVideoTrack);

    if (isAborted?.()) {
      stopMediaTracks(newStream);
      await restoreOriginalCamera();
      return "failed";
    }

    localStream.removeTrack(currentVideoTrack);
    if (!currentTrackStopped) {
      currentVideoTrack.stop();
    }
    localStream.addTrack(newVideoTrack);
    return "success";
  } catch (err) {
    if (newStream) {
      stopMediaTracks(newStream);
    }
    await restoreOriginalCamera();
    console.error("Failed to switch camera:", err);
    return "failed";
  }
};
