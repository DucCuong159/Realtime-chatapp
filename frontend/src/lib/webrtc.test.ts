import { beforeEach, describe, expect, it, vi } from "vitest";
import { webrtcManager } from "./webrtc";

describe("WebRTCManager", () => {
  const mockAudioTrack = {
    id: "audio_1",
    kind: "audio",
    enabled: true,
    stop: vi.fn(),
  };

  const mockVideoTrack = {
    id: "video_1",
    kind: "video",
    enabled: true,
    stop: vi.fn(),
    getSettings: vi.fn().mockReturnValue({ deviceId: "camera_1" }),
  };

  const mockStream = {
    getTracks: () => [mockAudioTrack, mockVideoTrack],
    getAudioTracks: () => [mockAudioTrack],
    getVideoTracks: () => [mockVideoTrack],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioTrack.enabled = true;
    mockVideoTrack.enabled = true;

    Object.defineProperty(globalThis, "navigator", {
      value: {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream),
          enumerateDevices: vi.fn().mockResolvedValue([
            { kind: "videoinput", deviceId: "camera_1" },
            { kind: "videoinput", deviceId: "camera_2" },
          ]),
        },
      },
      writable: true,
    });

    webrtcManager.cleanup();
  });

  it("should acquire stream with video constraints when callType is video", async () => {
    const stream = await webrtcManager.getLocalStream("video");

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.any(Object),
        video: expect.objectContaining({
          facingMode: "user",
        }),
      }),
    );
    expect(stream).toBe(mockStream);
  });

  it("should acquire stream without video when callType is audio", async () => {
    await webrtcManager.getLocalStream("audio");

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.any(Object),
        video: false,
      }),
    );
  });

  it("should toggle audio track enabled via setMute", async () => {
    await webrtcManager.getLocalStream("audio");

    webrtcManager.setMute(true);
    expect(mockAudioTrack.enabled).toBe(false);

    webrtcManager.setMute(false);
    expect(mockAudioTrack.enabled).toBe(true);
  });

  it("should toggle video track enabled via setVideoEnabled", async () => {
    await webrtcManager.getLocalStream("video");

    webrtcManager.setVideoEnabled(false);
    expect(mockVideoTrack.enabled).toBe(false);

    webrtcManager.setVideoEnabled(true);
    expect(mockVideoTrack.enabled).toBe(true);
  });

  it("should cleanup all tracks and listeners on cleanup", async () => {
    await webrtcManager.getLocalStream("video");

    webrtcManager.cleanup();

    expect(mockAudioTrack.stop).toHaveBeenCalled();
    expect(mockVideoTrack.stop).toHaveBeenCalled();
    expect(webrtcManager.getLocalMediaStream()).toBeNull();
  });
});
