import type { CallType } from "@/types/call.type";

export type SwitchCameraResult = "success" | "no-alternate" | "failed";

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

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export const getMediaConstraints = (
  callType: CallType,
): MediaStreamConstraints => ({
  audio: AUDIO_CONSTRAINTS,
  video:
    callType === "video"
      ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
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

const isErrorNamed = (err: unknown, ...names: string[]): boolean => {
  if (!err) return false;
  if (typeof err === "string") return names.some((n) => err.includes(n));
  const error = err as { name?: string; message?: string };
  return names.some((n) => error.name === n || error.message?.includes(n));
};

const isOverconstrainedError = (err: unknown): boolean =>
  isErrorNamed(err, "OverconstrainedError");

const isHardwareLockError = (err: unknown): boolean =>
  isErrorNamed(err, "NotReadableError", "TrackStartError");

const getTrackSettings = (track: MediaStreamTrack): MediaTrackSettings =>
  typeof track.getSettings === "function" ? track.getSettings() : {};

const resolveCameraTarget = async (
  currentTrack: MediaStreamTrack,
): Promise<CameraTargetConstraints | "no-alternate"> => {
  const settings = getTrackSettings(currentTrack);

  if (settings.facingMode) {
    const targetFacingMode =
      settings.facingMode === "environment" ? "user" : "environment";
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
      (d) => Boolean(d.deviceId) && d.deviceId !== settings.deviceId,
    ) ||
    videoDevices.find((d) => d.deviceId !== settings.deviceId) ||
    videoDevices[0];

  return {
    primary: nextDevice?.deviceId
      ? { video: { deviceId: { exact: nextDevice.deviceId } } }
      : { video: true },
    fallback: { video: true },
  };
};

const acquireStreamWithFallback = async (
  target: CameraTargetConstraints,
): Promise<MediaStream> => {
  const attempts: MediaStreamConstraints[] = [
    target.primary,
    target.fallback,
    ...(target.targetFacingMode ? [{ video: true }] : []),
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      return await navigator.mediaDevices.getUserMedia(attempts[i]);
    } catch (err) {
      if (!isOverconstrainedError(err) || i === attempts.length - 1) throw err;
    }
  }
  throw new Error("Failed to acquire camera stream");
};

const acquireReplacementStream = async (
  target: CameraTargetConstraints,
  currentTrack: MediaStreamTrack,
  onTrackStopped: () => void,
  isAborted?: () => boolean,
): Promise<MediaStream> => {
  try {
    return await acquireStreamWithFallback(target);
  } catch (err) {
    if (!isHardwareLockError(err)) throw err;

    currentTrack.stop();
    onTrackStopped();
    if (isAborted?.()) {
      throw new Error("Aborted after hardware unlock", { cause: err });
    }

    return acquireStreamWithFallback(target);
  }
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

const isCameraMismatch = (
  newTrack: MediaStreamTrack,
  target: CameraTargetConstraints,
  currentDeviceId?: string,
): boolean => {
  const settings = getTrackSettings(newTrack);
  const wrongFacing = Boolean(
    target.targetFacingMode &&
      settings.facingMode &&
      settings.facingMode !== target.targetFacingMode,
  );
  const sameDevice = Boolean(
    currentDeviceId &&
      settings.deviceId &&
      settings.deviceId === currentDeviceId,
  );
  return wrongFacing || sameDevice;
};

interface RestoreCameraParams {
  currentTrack: MediaStreamTrack;
  deviceId?: string;
  facingMode?: string;
  localStream: MediaStream;
  peerConnection: RTCPeerConnection | null;
  isVideoEnabled: boolean;
}

const restoreOriginalCameraTrack = async ({
  currentTrack,
  deviceId,
  facingMode,
  localStream,
  peerConnection,
  isVideoEnabled,
}: RestoreCameraParams): Promise<void> => {
  try {
    const constraints: MediaStreamConstraints = deviceId
      ? { video: { deviceId: { exact: deviceId } } }
      : facingMode
        ? { video: { facingMode: { ideal: facingMode } } }
        : { video: true };

    const restoredStream = await navigator.mediaDevices
      .getUserMedia(constraints)
      .catch(() => navigator.mediaDevices.getUserMedia({ video: true }));

    const restoredTrack = restoredStream.getVideoTracks()[0];
    if (restoredTrack) {
      restoredTrack.enabled = isVideoEnabled;
      localStream.removeTrack(currentTrack);
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

  const target = await resolveCameraTarget(currentVideoTrack);
  if (target === "no-alternate") return "no-alternate";

  const { deviceId, facingMode } = getTrackSettings(currentVideoTrack);
  let newStream: MediaStream | null = null;
  let oldTrackStopped = false;

  const rollback = async (): Promise<void> => {
    stopMediaTracks(newStream);
    if (!oldTrackStopped) return;
    oldTrackStopped = false;
    await restoreOriginalCameraTrack({
      currentTrack: currentVideoTrack,
      deviceId,
      facingMode,
      localStream,
      peerConnection,
      isVideoEnabled,
    });
  };

  try {
    newStream = await acquireReplacementStream(
      target,
      currentVideoTrack,
      () => {
        oldTrackStopped = true;
      },
      isAborted,
    );

    const newVideoTrack = newStream.getVideoTracks()[0];
    if (isAborted?.() || !newVideoTrack) {
      await rollback();
      return "failed";
    }

    if (isCameraMismatch(newVideoTrack, target, deviceId)) {
      await rollback();
      return "no-alternate";
    }

    newVideoTrack.enabled = isVideoEnabled;
    await replacePeerConnectionTrack(peerConnection, newVideoTrack);

    if (isAborted?.()) {
      await rollback();
      return "failed";
    }

    localStream.removeTrack(currentVideoTrack);
    if (!oldTrackStopped) currentVideoTrack.stop();
    localStream.addTrack(newVideoTrack);
    return "success";
  } catch (err) {
    await rollback();
    console.error("Failed to switch camera:", err);
    return "failed";
  }
};
