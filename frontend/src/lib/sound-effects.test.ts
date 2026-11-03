import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs BEFORE module imports — ensures the mock factory captures
// the mocked functions correctly even after Vitest's static hoisting.
const {
  mockPlay,
  mockStop,
  mockUnload,
  mockPlaying,
  mockHowlConstructor,
  mockHowlerStop,
  constructorArgs,
} = vi.hoisted(() => {
  const mockPlay = vi.fn();
  const mockStop = vi.fn();
  const mockUnload = vi.fn();
  const mockPlaying = vi.fn().mockReturnValue(false);
  const mockHowlerStop = vi.fn();
  const constructorArgs: unknown[] = [];
  const mockHowlConstructor = vi.fn((opts: unknown) => {
    constructorArgs.push(opts);
  });

  return {
    mockPlay,
    mockStop,
    mockUnload,
    mockPlaying,
    mockHowlConstructor,
    mockHowlerStop,
    constructorArgs,
  };
});

vi.mock("howler", () => {
  class MockHowl {
    play = mockPlay;
    stop = mockStop;
    unload = mockUnload;
    playing = mockPlaying;
    once = vi.fn();
    options: unknown;

    constructor(options: unknown) {
      this.options = options;
      mockHowlConstructor(options);
    }
  }

  return {
    Howl: MockHowl,
    Howler: { stop: mockHowlerStop },
  };
});

// Import AFTER mock is registered
import { soundEffects } from "./sound-effects";

describe("soundEffects (Howler.js)", () => {
  beforeEach(() => {
    mockPlay.mockClear();
    mockStop.mockClear();
    mockUnload.mockClear();
    mockHowlerStop.mockClear();
    mockPlaying.mockReturnValue(false);
  });

  describe("playOutgoingRing", () => {
    it("calls play() on outgoing-ring Howl", () => {
      soundEffects.playOutgoingRing();
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it("stops other sounds before playing outgoing ring", () => {
      soundEffects.playOutgoingRing();
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe("playIncomingRing", () => {
    it("calls play() on incoming-ring Howl", () => {
      soundEffects.playIncomingRing();
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe("playCallEndTone", () => {
    it("calls play() on call-end Howl", () => {
      soundEffects.playCallEndTone();
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe("stopAll", () => {
    it("stops all Howl instances and calls Howler.stop()", () => {
      soundEffects.stopAll();
      expect(mockStop).toHaveBeenCalledTimes(3);
      expect(mockHowlerStop).toHaveBeenCalledTimes(1);
    });
  });

  describe("destroy", () => {
    it("stops and unloads all Howl instances", () => {
      soundEffects.destroy();
      expect(mockStop).toHaveBeenCalledTimes(3);
      expect(mockUnload).toHaveBeenCalledTimes(3);
    });
  });

  describe("Howl constructor options", () => {
    it("configures outgoing-ring with loop=true and preload=true", () => {
      const outgoingCall = constructorArgs.find((args) =>
        (args as { src: string[] }).src?.some((s: string) =>
          s.includes("outgoing-ring"),
        ),
      );
      expect(outgoingCall).toBeDefined();
      expect((outgoingCall as { loop: boolean }).loop).toBe(true);
      expect((outgoingCall as { preload: boolean }).preload).toBe(true);
    });

    it("configures incoming-ring with loop=true and preload=true", () => {
      const incomingCall = constructorArgs.find((args) =>
        (args as { src: string[] }).src?.some((s: string) =>
          s.includes("incoming-ring"),
        ),
      );
      expect(incomingCall).toBeDefined();
      expect((incomingCall as { loop: boolean }).loop).toBe(true);
      expect((incomingCall as { preload: boolean }).preload).toBe(true);
    });

    it("configures call-end with loop=false and preload=true", () => {
      const endCall = constructorArgs.find((args) =>
        (args as { src: string[] }).src?.some((s: string) =>
          s.includes("call-end"),
        ),
      );
      expect(endCall).toBeDefined();
      expect((endCall as { loop: boolean }).loop).toBe(false);
      expect((endCall as { preload: boolean }).preload).toBe(true);
    });
  });
});
