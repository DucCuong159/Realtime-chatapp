import type { CallType } from "@/types/call.type";

export type SwitchCameraResult = "success" | "no-alternate" | "failed";

export interface SwitchCameraOptions {
  localStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  isVideoEnabled: boolean;
  isAborted?: () => boolean;
}

export const getMediaConstraints = (
  callType: CallType,
): MediaStreamConstraints => ({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 48000 },
    channelCount: { ideal: 1 },
  },
  video:
    callType === "video"
      ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: "user",
        }
      : false,
});

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

export const stopMediaTracks = (stream: MediaStream | null): void => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const setAudioTracksEnabled = (
  stream: MediaStream | null,
  enabled: boolean,
): void => {
  stream?.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
};

export const setVideoTracksEnabled = (
  stream: MediaStream | null,
  enabled: boolean,
): void => {
  stream?.getVideoTracks().forEach((track) => {
    track.enabled = enabled;
  });
};

const isAuxiliaryLens = (label: string): boolean =>
  /ultra[-_\s]?wide|tele(?:photo)?|macro|depth|0\.[0-9]x|[2-9]x/i.test(label) &&
  !/main/i.test(label);

/**
 * Identifies the opposite camera, filtering out auxiliary lenses (ultra-wide, macro, telephoto)
 * to reliably target the MAIN primary rear camera on multi-lens mobile devices.
 */
export const findNextCameraDevice = async (
  currentDeviceId?: string,
  currentFacingMode?: string,
): Promise<MediaDeviceInfo | null> => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  if (videoDevices.length < 2) return null;

  const isCurrentFront =
    currentFacingMode === "user" ||
    (!currentFacingMode &&
      currentDeviceId &&
      videoDevices[0]?.deviceId === currentDeviceId);

  if (isCurrentFront) {
    const rearCameras = videoDevices.filter((d) =>
      /back|rear|environment/i.test(d.label),
    );
    // Prioritize main rear sensor: pick explicit 'main' or exclude auxiliary lenses
    const mainRear =
      rearCameras.find((d) => /main/i.test(d.label)) ||
      rearCameras.find((d) => !isAuxiliaryLens(d.label)) ||
      rearCameras[0];

    if (mainRear && mainRear.deviceId !== currentDeviceId) return mainRear;
  } else {
    const frontCamera = videoDevices.find((d) => /front|user/i.test(d.label));
    if (frontCamera && frontCamera.deviceId !== currentDeviceId) {
      return frontCamera;
    }
  }

  return (
    videoDevices.find((d) => d.deviceId && d.deviceId !== currentDeviceId) ||
    null
  );
};

const replacePeerConnectionTrack = async (
  peerConnection: RTCPeerConnection | null,
  track: MediaStreamTrack,
): Promise<void> => {
  const sender = peerConnection
    ?.getSenders()
    .find((s) => s.track?.kind === "video");
  await sender?.replaceTrack(track);
};

const isHardwareLockError = (err: unknown): boolean => {
  if (!err) return false;
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /NotReadableError|TrackStartError/i.test(msg);
};

const acquireCameraStream = async (
  deviceId?: string,
  fallbackFacing?: "user" | "environment",
): Promise<MediaStream> => {
  if (deviceId) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
    } catch (err) {
      const isOverconstrained =
        (err instanceof Error && err.name === "OverconstrainedError") ||
        String(err).includes("OverconstrainedError");
      if (!isOverconstrained) throw err;
    }
  }

  if (fallbackFacing) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: fallbackFacing },
      });
    } catch (err) {
      const isOverconstrained =
        (err instanceof Error && err.name === "OverconstrainedError") ||
        String(err).includes("OverconstrainedError");
      if (!isOverconstrained) throw err;
    }
  }

  return navigator.mediaDevices.getUserMedia({ video: true });
};

const restoreOriginalCamera = async (
  localStream: MediaStream,
  peerConnection: RTCPeerConnection | null,
  currentTrack: MediaStreamTrack,
  deviceId?: string,
  facingMode?: string,
  isVideoEnabled?: boolean,
): Promise<void> => {
  try {
    const rollbackStream = await acquireCameraStream(
      deviceId,
      facingMode as "user" | "environment",
    );
    const restoredTrack = rollbackStream.getVideoTracks()[0];
    if (restoredTrack) {
      restoredTrack.enabled = Boolean(isVideoEnabled);
      localStream.removeTrack(currentTrack);
      localStream.addTrack(restoredTrack);
      await replacePeerConnectionTrack(peerConnection, restoredTrack);
    }
  } catch (restoreErr) {
    console.error("Failed to restore original camera:", restoreErr);
  }
};

const isSameCamera = (
  newTrack: MediaStreamTrack,
  currentDeviceId?: string,
  currentFacingMode?: string,
): boolean => {
  const settings =
    typeof newTrack.getSettings === "function" ? newTrack.getSettings() : {};
  if (currentDeviceId && settings.deviceId === currentDeviceId) return true;
  if (currentFacingMode && settings.facingMode === currentFacingMode) {
    return true;
  }
  return false;
};

/**
 * Switches between front and main rear cameras with hardware lock recovery and track synchronization.
 */
export const switchCameraDevice = async ({
  localStream,
  peerConnection,
  isVideoEnabled,
  isAborted,
}: SwitchCameraOptions): Promise<SwitchCameraResult> => {
  if (!localStream) return "no-alternate";
  const currentTrack = localStream.getVideoTracks()[0];
  if (!currentTrack) return "no-alternate";

  const settings =
    typeof currentTrack.getSettings === "function"
      ? currentTrack.getSettings()
      : {};
  const { deviceId: currentDeviceId, facingMode: currentFacingMode } = settings;

  const nextCamera = await findNextCameraDevice(
    currentDeviceId,
    currentFacingMode,
  );
  if (!nextCamera) return "no-alternate";

  const targetFacing =
    currentFacingMode === "user"
      ? "environment"
      : currentFacingMode === "environment"
        ? "user"
        : undefined;

  let newStream: MediaStream;
  let oldTrackStopped = false;

  const rollback = async (): Promise<void> => {
    if (!oldTrackStopped) return;
    await restoreOriginalCamera(
      localStream,
      peerConnection,
      currentTrack,
      currentDeviceId,
      currentFacingMode,
      isVideoEnabled,
    );
  };

  try {
    newStream = await acquireCameraStream(nextCamera.deviceId, targetFacing);
  } catch (err) {
    if (!isHardwareLockError(err)) return "failed";

    currentTrack.stop();
    oldTrackStopped = true;

    try {
      newStream = await acquireCameraStream(nextCamera.deviceId, targetFacing);
    } catch {
      await rollback();
      return "failed";
    }
  }

  if (isAborted?.()) {
    stopMediaTracks(newStream);
    await rollback();
    return "failed";
  }

  const newTrack = newStream.getVideoTracks()[0];
  if (!newTrack) {
    stopMediaTracks(newStream);
    await rollback();
    return "failed";
  }

  if (isSameCamera(newTrack, currentDeviceId, currentFacingMode)) {
    stopMediaTracks(newStream);
    await rollback();
    return "no-alternate";
  }

  newTrack.enabled = isVideoEnabled;
  await replacePeerConnectionTrack(peerConnection, newTrack);

  if (isAborted?.()) {
    stopMediaTracks(newStream);
    await rollback();
    return "failed";
  }

  currentTrack.stop();
  localStream.removeTrack(currentTrack);
  localStream.addTrack(newTrack);
  return "success";
};
