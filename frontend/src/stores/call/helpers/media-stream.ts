import { webrtcManager } from "@/lib/webrtc";
import type { CallSliceGet, CallSliceSet } from "../types";
import type { CallType } from "@/types/call.type";

export const setupLocalMedia = async ({
  callType,
  set,
  get,
}: {
  callType: CallType;
  set: CallSliceSet;
  get: CallSliceGet;
}): Promise<MediaStream> => {
  webrtcManager.setOnLocalStream((stream) => set({ localStream: stream }));
  webrtcManager.setOnRemoteTrack((stream) => set({ remoteStream: stream }));

  const stream = await webrtcManager.getLocalStream(callType);
  const { isVideoOff, isMuted } = get();
  webrtcManager.setVideoEnabled(!isVideoOff);
  webrtcManager.setMute(isMuted);
  set({ localStream: stream });

  return stream;
};
