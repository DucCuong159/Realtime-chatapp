import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMediaConstraints,
  requestUserMedia,
  setAudioTracksEnabled,
  setVideoTracksEnabled,
  stopMediaTracks,
  switchCameraDevice,
} from "./device-manager";

describe("DeviceManager", () => {
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
  });

  describe("getMediaConstraints", () => {
    it("should return video constraints when callType is video", () => {
      const constraints = getMediaConstraints("video");
      expect(constraints.video).toEqual(
        expect.objectContaining({ facingMode: "user" }),
      );
      expect(constraints.audio).toEqual(
        expect.objectContaining({ echoCancellation: true }),
      );
    });

    it("should return false for video when callType is audio", () => {
      const constraints = getMediaConstraints("audio");
      expect(constraints.video).toBe(false);
      expect(constraints.audio).toEqual(
        expect.objectContaining({ echoCancellation: true }),
      );
    });
  });

  describe("requestUserMedia", () => {
    it("should call getUserMedia with audio-only for audio callType", async () => {
      const stream = await requestUserMedia("audio");
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: expect.any(Object),
        video: false,
      });
      expect(stream).toBe(mockStream);
    });

    it("should call getUserMedia with video constraints for video callType", async () => {
      const stream = await requestUserMedia("video");
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: expect.any(Object),
        video: expect.objectContaining({ facingMode: "user" }),
      });
      expect(stream).toBe(mockStream);
    });

    it("should retry with basic constraints if full constraints fail on video", async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia)
        .mockRejectedValueOnce(new Error("OverconstrainedError"))
        .mockResolvedValueOnce(mockStream as unknown as MediaStream);

      const stream = await requestUserMedia("video");
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({
        audio: true,
        video: true,
      });
      expect(stream).toBe(mockStream);
    });
  });

  describe("stopMediaTracks", () => {
    it("should call stop on all tracks", () => {
      stopMediaTracks(mockStream as unknown as MediaStream);
      expect(mockAudioTrack.stop).toHaveBeenCalled();
      expect(mockVideoTrack.stop).toHaveBeenCalled();
    });

    it("should handle null stream gracefully", () => {
      expect(() => stopMediaTracks(null)).not.toThrow();
    });
  });

  describe("track toggles", () => {
    it("should toggle audio track enabled", () => {
      setAudioTracksEnabled(mockStream as unknown as MediaStream, false);
      expect(mockAudioTrack.enabled).toBe(false);

      setAudioTracksEnabled(mockStream as unknown as MediaStream, true);
      expect(mockAudioTrack.enabled).toBe(true);
    });

    it("should toggle video track enabled", () => {
      setVideoTracksEnabled(mockStream as unknown as MediaStream, false);
      expect(mockVideoTrack.enabled).toBe(false);

      setVideoTracksEnabled(mockStream as unknown as MediaStream, true);
      expect(mockVideoTrack.enabled).toBe(true);
    });
  });

  describe("switchCameraDevice", () => {
    it("should return 'no-alternate' if stream has no video tracks", async () => {
      const result = await switchCameraDevice({
        localStream: {
          getVideoTracks: () => [],
        } as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });
      expect(result).toBe("no-alternate");
    });

    it("should return 'no-alternate' if fewer than 2 video devices exist", async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce([
        { kind: "videoinput", deviceId: "camera_1" } as MediaDeviceInfo,
      ]);

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });
      expect(result).toBe("no-alternate");
    });

    it("should switch camera and return 'success' when alternative camera exists", async () => {
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

      const mockSender = {
        track: { kind: "video" },
        replaceTrack: vi.fn().mockResolvedValue(undefined),
      };
      const mockPC = {
        getSenders: () => [mockSender],
      } as unknown as RTCPeerConnection;

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: mockPC,
        isVideoEnabled: true,
      });

      expect(result).toBe("success");
      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(mockSender.replaceTrack).toHaveBeenCalledWith(newVideoTrack);
      expect(mockStream.removeTrack).toHaveBeenCalledWith(mockVideoTrack);
      expect(mockStream.addTrack).toHaveBeenCalledWith(newVideoTrack);
    });

    it("should return 'failed' and stop new tracks if aborted", async () => {
      const newVideoTrack = { stop: vi.fn() };
      const newStream = {
        getTracks: () => [newVideoTrack],
        getVideoTracks: () => [newVideoTrack],
      };

      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(
        newStream as unknown as MediaStream,
      );

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
        isAborted: () => true,
      });

      expect(result).toBe("failed");
      expect(newVideoTrack.stop).toHaveBeenCalled();
    });

    it("should return 'failed' if getUserMedia throws", async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error("Hardware fail"),
      );

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });

      expect(result).toBe("failed");
    });
  });
});

