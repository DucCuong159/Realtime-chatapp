import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findNextCameraDevice,
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
        expect.objectContaining({
          facingMode: "user",
          frameRate: { ideal: 30, max: 60 },
        }),
      );
      expect(constraints.audio).toEqual(
        expect.objectContaining({
          echoCancellation: true,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 },
        }),
      );
    });

    it("should return false for video when callType is audio", () => {
      const constraints = getMediaConstraints("audio");
      expect(constraints.video).toBe(false);
      expect(constraints.audio).toEqual(
        expect.objectContaining({
          echoCancellation: true,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 },
        }),
      );
    });
  });

  
  describe("findNextCameraDevice", () => {
    it("should return null if fewer than 2 video devices exist", async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce([
        { kind: "videoinput", deviceId: "cam_1" } as MediaDeviceInfo,
      ]);
      const result = await findNextCameraDevice("cam_1", "user");
      expect(result).toBeNull();
    });

    it("should select the MAIN rear camera and exclude auxiliary lenses", async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce([
        { kind: "videoinput", deviceId: "front_1", label: "Front Camera" },
        { kind: "videoinput", deviceId: "rear_ultra", label: "Back Ultra-Wide Camera 0.5x" },
        { kind: "videoinput", deviceId: "rear_main", label: "Back Camera (main wide)" },
        { kind: "videoinput", deviceId: "rear_macro", label: "Back Macro Lens" },
        { kind: "videoinput", deviceId: "rear_tele", label: "Back Telephoto 3x" },
      ] as MediaDeviceInfo[]);

      const result = await findNextCameraDevice("front_1", "user");
      expect(result?.deviceId).toBe("rear_main");
    });

    it("should select front camera when switching from rear camera", async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce([
        { kind: "videoinput", deviceId: "front_1", label: "Front Camera (user)" },
        { kind: "videoinput", deviceId: "rear_main", label: "Back Camera" },
      ] as MediaDeviceInfo[]);

      const result = await findNextCameraDevice("rear_main", "environment");
      expect(result?.deviceId).toBe("front_1");
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

    it("should return 'failed' if enumerateDevices rejects during camera switch", async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockRejectedValueOnce(
        new Error("Device enumeration failure"),
      );

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });
      expect(result).toBe("failed");
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

    it("should return 'failed' and stop new tracks if aborted while replaceTrack is pending", async () => {
      let aborted = false;
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
        replaceTrack: vi.fn().mockImplementation(async () => {
          // Simulate call cleanup occurring while replaceTrack was pending
          aborted = true;
        }),
      };
      const mockPC = {
        getSenders: () => [mockSender],
      } as unknown as RTCPeerConnection;

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: mockPC,
        isVideoEnabled: true,
        isAborted: () => aborted,
      });

      expect(result).toBe("failed");
      expect(newVideoTrack.stop).toHaveBeenCalled();
      expect(mockStream.addTrack).not.toHaveBeenCalled();
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

    it("should switch camera using facingMode when currentVideoTrack has facingMode: 'user'", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        facingMode: "user",
        deviceId: "camera_1",
      });

      const newVideoTrack = {
        id: "video_rear",
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

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });

      expect(result).toBe("success");
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { deviceId: { exact: "camera_2" } },
      });
      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(mockStream.removeTrack).toHaveBeenCalledWith(mockVideoTrack);
      expect(mockStream.addTrack).toHaveBeenCalledWith(newVideoTrack);
    });

    it("should target 'user' facingMode when currentVideoTrack has facingMode: 'environment'", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        facingMode: "environment",
        deviceId: "camera_rear",
      });

      const newVideoTrack = {
        id: "video_front",
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

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });

      expect(result).toBe("success");
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { deviceId: { exact: "camera_1" } },
      });
    });

    it("should retry camera acquisition when sensor is locked with NotReadableError or TrackStartError", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        facingMode: "user",
        deviceId: "camera_1",
      });

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

      const lockError = new Error("Camera sensor locked");
      lockError.name = "NotReadableError";

      vi.mocked(navigator.mediaDevices.getUserMedia)
        .mockRejectedValueOnce(lockError)
        .mockResolvedValueOnce(newStream as unknown as MediaStream);

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });

      expect(result).toBe("success");
      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
      expect(mockStream.addTrack).toHaveBeenCalledWith(newVideoTrack);
    });

    it("should fallback to basic constraints when OverconstrainedError occurs", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        facingMode: "user",
        deviceId: "camera_1",
      });

      const newVideoTrack = {
        id: "video_fallback",
        kind: "video",
        enabled: true,
        stop: vi.fn(),
      };
      const newStream = {
        getTracks: () => [newVideoTrack],
        getVideoTracks: () => [newVideoTrack],
      };

      const overconstrainedError = new Error("OverconstrainedError");
      overconstrainedError.name = "OverconstrainedError";

      vi.mocked(navigator.mediaDevices.getUserMedia)
        .mockRejectedValueOnce(overconstrainedError)
        .mockResolvedValueOnce(newStream as unknown as MediaStream);

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });

      expect(result).toBe("success");
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({
        video: { facingMode: "environment" },
      });
      expect(mockStream.addTrack).toHaveBeenCalledWith(newVideoTrack);
    });

    it("should fallback to { video: true } when switching without facingMode and OverconstrainedError occurs", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        deviceId: "camera_1",
      });

      const newVideoTrack = {
        id: "video_fallback_generic",
        kind: "video",
        enabled: true,
        stop: vi.fn(),
      };
      const newStream = {
        getTracks: () => [newVideoTrack],
        getVideoTracks: () => [newVideoTrack],
      };

      const overconstrainedError = new Error("OverconstrainedError");
      overconstrainedError.name = "OverconstrainedError";

      vi.mocked(navigator.mediaDevices.getUserMedia)
        .mockRejectedValueOnce(overconstrainedError)
        .mockResolvedValueOnce(newStream as unknown as MediaStream);

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });

      expect(result).toBe("success");
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({
        video: true,
      });
      expect(mockStream.addTrack).toHaveBeenCalledWith(newVideoTrack);
    });

    it("should restore original camera track if retry fails after hardware lock", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        facingMode: "user",
        deviceId: "camera_1",
      });

      const restoredVideoTrack = {
        id: "video_restored",
        kind: "video",
        enabled: false,
        stop: vi.fn(),
      };
      const restoredStream = {
        getTracks: () => [restoredVideoTrack],
        getVideoTracks: () => [restoredVideoTrack],
      };

      const lockError = new Error("Sensor locked");
      lockError.name = "NotReadableError";
      const retryError = new Error("Retry failed");
      retryError.name = "TrackStartError";

      const mockSender = {
        track: { kind: "video" },
        replaceTrack: vi.fn().mockResolvedValue(undefined),
      };
      const mockPC = {
        getSenders: () => [mockSender],
      } as unknown as RTCPeerConnection;

      vi.mocked(navigator.mediaDevices.getUserMedia)
        .mockRejectedValueOnce(lockError)
        .mockRejectedValueOnce(retryError)
        .mockResolvedValueOnce(restoredStream as unknown as MediaStream);

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: mockPC,
        isVideoEnabled: true,
      });

      expect(result).toBe("failed");
      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(3);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({
        video: { deviceId: { exact: "camera_1" } },
      });
      expect(restoredVideoTrack.enabled).toBe(true);
      expect(mockStream.removeTrack).toHaveBeenCalledWith(mockVideoTrack);
      expect(mockStream.addTrack).toHaveBeenCalledWith(restoredVideoTrack);
      expect(mockSender.replaceTrack).toHaveBeenCalledWith(restoredVideoTrack);
    });

    it("should return 'no-alternate' when acquired track has same facingMode as current track", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        facingMode: "user",
        deviceId: "camera_1",
      });

      const acquiredVideoTrack = {
        id: "video_same_facing",
        kind: "video",
        enabled: true,
        stop: vi.fn(),
        getSettings: () => ({ facingMode: "user", deviceId: "camera_1" }),
      };
      const acquiredStream = {
        getTracks: () => [acquiredVideoTrack],
        getVideoTracks: () => [acquiredVideoTrack],
      };

      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(
        acquiredStream as unknown as MediaStream,
      );

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });

      expect(result).toBe("no-alternate");
      expect(acquiredVideoTrack.stop).toHaveBeenCalled();
      expect(mockVideoTrack.stop).not.toHaveBeenCalled();
      expect(mockStream.addTrack).not.toHaveBeenCalled();
    });

    it("should return 'no-alternate' when acquired track has same deviceId", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        deviceId: "camera_1",
      });

      const acquiredVideoTrack = {
        id: "video_same_device",
        kind: "video",
        enabled: true,
        stop: vi.fn(),
        getSettings: () => ({ deviceId: "camera_1" }),
      };
      const acquiredStream = {
        getTracks: () => [acquiredVideoTrack],
        getVideoTracks: () => [acquiredVideoTrack],
      };

      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(
        acquiredStream as unknown as MediaStream,
      );

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: null,
        isVideoEnabled: true,
      });

      expect(result).toBe("no-alternate");
      expect(acquiredVideoTrack.stop).toHaveBeenCalled();
      expect(mockVideoTrack.stop).not.toHaveBeenCalled();
      expect(mockStream.addTrack).not.toHaveBeenCalled();
    });

    it("should restore original camera track and return 'no-alternate' if acquired track is same camera after retry", async () => {
      mockVideoTrack.getSettings.mockReturnValue({
        facingMode: "user",
        deviceId: "camera_1",
      });

      const lockError = new Error("Sensor locked");
      lockError.name = "NotReadableError";

      const acquiredVideoTrack = {
        id: "video_same",
        kind: "video",
        enabled: true,
        stop: vi.fn(),
        getSettings: () => ({ facingMode: "user" }),
      };
      const acquiredStream = {
        getTracks: () => [acquiredVideoTrack],
        getVideoTracks: () => [acquiredVideoTrack],
      };

      const restoredVideoTrack = {
        id: "video_restored",
        kind: "video",
        enabled: false,
        stop: vi.fn(),
      };
      const restoredStream = {
        getTracks: () => [restoredVideoTrack],
        getVideoTracks: () => [restoredVideoTrack],
      };

      const mockSender = {
        track: { kind: "video" },
        replaceTrack: vi.fn().mockResolvedValue(undefined),
      };
      const mockPC = {
        getSenders: () => [mockSender],
      } as unknown as RTCPeerConnection;

      vi.mocked(navigator.mediaDevices.getUserMedia)
        .mockRejectedValueOnce(lockError)
        .mockResolvedValueOnce(acquiredStream as unknown as MediaStream)
        .mockResolvedValueOnce(restoredStream as unknown as MediaStream);

      const result = await switchCameraDevice({
        localStream: mockStream as unknown as MediaStream,
        peerConnection: mockPC,
        isVideoEnabled: true,
      });

      expect(result).toBe("no-alternate");
      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(acquiredVideoTrack.stop).toHaveBeenCalled();
      expect(mockStream.removeTrack).toHaveBeenCalledWith(mockVideoTrack);
      expect(mockStream.addTrack).toHaveBeenCalledWith(restoredVideoTrack);
      expect(mockSender.replaceTrack).toHaveBeenCalledWith(restoredVideoTrack);
      expect(restoredVideoTrack.enabled).toBe(true);
    });
  });
});
