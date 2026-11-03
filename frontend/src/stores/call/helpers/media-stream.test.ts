import { webrtcManager } from "@/lib/webrtc";
import type { CallSliceGet, CallSliceSet } from "@/stores/call/types";
import type { CallType } from "@/types/call.type";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupLocalMedia } from "./media-stream";

vi.mock("@/lib/webrtc", () => ({
  webrtcManager: {
    setOnLocalStream: vi.fn(),
    setOnRemoteTrack: vi.fn(),
    getLocalStream: vi.fn(),
    setVideoEnabled: vi.fn(),
    setMute: vi.fn(),
  },
}));

describe("setupLocalMedia", () => {
  let mockSet: CallSliceSet;
  let mockGet: CallSliceGet;
  let mockStream: MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSet = vi.fn() as unknown as CallSliceSet;
    mockGet = vi.fn(() => ({
      isVideoOff: false,
      isMuted: false,
    })) as unknown as CallSliceGet;

    mockStream = {
      id: "mock-stream-id",
      getTracks: vi.fn().mockReturnValue([]),
    } as unknown as MediaStream;

    vi.mocked(webrtcManager.getLocalStream).mockResolvedValue(mockStream);
  });

  it("attaches listeners to webrtcManager for local stream and remote track", async () => {
    await setupLocalMedia({
      callType: "audio",
      set: mockSet,
      get: mockGet,
    });

    expect(webrtcManager.setOnLocalStream).toHaveBeenCalledTimes(1);
    expect(webrtcManager.setOnRemoteTrack).toHaveBeenCalledTimes(1);

    // Test that the registered callbacks update zustand state
    const onLocalStreamCb = vi.mocked(webrtcManager.setOnLocalStream).mock.calls[0][0];
    const onRemoteTrackCb = vi.mocked(webrtcManager.setOnRemoteTrack).mock.calls[0][0];

    expect(onLocalStreamCb).toBeTypeOf("function");
    expect(onRemoteTrackCb).toBeTypeOf("function");

    const testLocalStream = { id: "test-local" } as MediaStream;
    onLocalStreamCb!(testLocalStream);
    expect(mockSet).toHaveBeenCalledWith({ localStream: testLocalStream });

    const testRemoteStream = { id: "test-remote" } as MediaStream;
    onRemoteTrackCb!(testRemoteStream);
    expect(mockSet).toHaveBeenCalledWith({ remoteStream: testRemoteStream });
  });

  it("acquires local stream for specified callType and sets it in store", async () => {
    const callType: CallType = "video";
    const result = await setupLocalMedia({
      callType,
      set: mockSet,
      get: mockGet,
    });

    expect(webrtcManager.getLocalStream).toHaveBeenCalledWith("video");
    expect(mockSet).toHaveBeenCalledWith({ localStream: mockStream });
    expect(result).toBe(mockStream);
  });

  it("applies persisted track states (unmuted, video enabled)", async () => {
    vi.mocked(mockGet).mockReturnValue({
      isVideoOff: false,
      isMuted: false,
    } as ReturnType<CallSliceGet>);

    await setupLocalMedia({
      callType: "video",
      set: mockSet,
      get: mockGet,
    });

    expect(webrtcManager.setVideoEnabled).toHaveBeenCalledWith(true);
    expect(webrtcManager.setMute).toHaveBeenCalledWith(false);
  });

  it("applies persisted track states when muted and video disabled", async () => {
    vi.mocked(mockGet).mockReturnValue({
      isVideoOff: true,
      isMuted: true,
    } as ReturnType<CallSliceGet>);

    await setupLocalMedia({
      callType: "audio",
      set: mockSet,
      get: mockGet,
    });

    expect(webrtcManager.setVideoEnabled).toHaveBeenCalledWith(false);
    expect(webrtcManager.setMute).toHaveBeenCalledWith(true);
  });

  it("propagates error when webrtcManager.getLocalStream rejects", async () => {
    const error = new Error("Device not found");
    vi.mocked(webrtcManager.getLocalStream).mockRejectedValueOnce(error);

    await expect(
      setupLocalMedia({
        callType: "video",
        set: mockSet,
        get: mockGet,
      }),
    ).rejects.toThrow("Device not found");

    expect(mockSet).not.toHaveBeenCalledWith({ localStream: mockStream });
  });
});
