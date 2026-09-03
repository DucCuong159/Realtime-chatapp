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

  it("should persist camera-off choice if setVideoEnabled(false) is called before getLocalStream resolves", async () => {
    // User toggles camera off while getUserMedia is pending / not yet acquired
    webrtcManager.setVideoEnabled(false);

    // Media acquisition completes
    const stream = await webrtcManager.getLocalStream("video");

    expect(stream).toBe(mockStream);
    expect(mockVideoTrack.enabled).toBe(false);
  });

  it("should persist mute choice if setMute(true) is called before getLocalStream resolves", async () => {
    // User mutes mic before getUserMedia resolves
    webrtcManager.setMute(true);

    // Media acquisition completes
    const stream = await webrtcManager.getLocalStream("video");

    expect(stream).toBe(mockStream);
    expect(mockAudioTrack.enabled).toBe(false);
  });

  describe("switchCamera", () => {
    it("should return 'no-alternate' if localStream has no video track or does not exist", async () => {
      const result = await webrtcManager.switchCamera();
      expect(result).toBe("no-alternate");
    });

    it("should return 'no-alternate' if fewer than 2 video devices exist", async () => {
      await webrtcManager.getLocalStream("video");

      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce([
        { kind: "videoinput", deviceId: "camera_1" } as MediaDeviceInfo,
      ]);

      const result = await webrtcManager.switchCamera();
      expect(result).toBe("no-alternate");
    });

    it("should switch camera and return 'success' when alternative camera exists", async () => {
      await webrtcManager.getLocalStream("video");

      const newVideoTrack = {
        id: "video_2",
        kind: "video",
        enabled: true,
        stop: vi.fn(),
      };
      const newStream = {
        getTracks: () => [newVideoTrack],
        getVideoTracks: () => [newVideoTrack],
      };

      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(
        newStream as unknown as MediaStream,
      );

      const result = await webrtcManager.switchCamera();
      expect(result).toBe("success");
      expect(mockVideoTrack.stop).toHaveBeenCalled();
    });

    it("should stop newly acquired tracks and return 'failed' if newStream has no video track", async () => {
      await webrtcManager.getLocalStream("video");

      const newAudioTrack = { stop: vi.fn() };
      const newStream = {
        getTracks: () => [newAudioTrack],
        getVideoTracks: () => [],
      };

      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(
        newStream as unknown as MediaStream,
      );

      const result = await webrtcManager.switchCamera();
      expect(result).toBe("failed");
      expect(newAudioTrack.stop).toHaveBeenCalled();
    });

    it("should stop newly acquired tracks and return 'failed' if getUserMedia throws an error", async () => {
      await webrtcManager.getLocalStream("video");

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error("Camera error"),
      );

      const result = await webrtcManager.switchCamera();
      expect(result).toBe("failed");
    });
  });

  it("should cleanup all tracks and listeners on cleanup", async () => {
    await webrtcManager.getLocalStream("video");

    webrtcManager.cleanup();

    expect(mockAudioTrack.stop).toHaveBeenCalled();
    expect(mockVideoTrack.stop).toHaveBeenCalled();
    expect(webrtcManager.getLocalMediaStream()).toBeNull();
  });
});
