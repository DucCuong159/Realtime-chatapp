import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTimers,
  getDisconnectRecoveryTimer,
  setCallTimer,
  setDisconnectRecoveryTimer,
  setEndedResetTimer,
  setTimeoutTimer,
} from "./call-timers";

describe("call-timers — public API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure clean state before each test
    clearTimers();
  });

  afterEach(() => {
    clearTimers();
    vi.useRealTimers();
  });

  describe("clearTimers()", () => {
    it("does not throw when no timers are set", () => {
      expect(() => clearTimers()).not.toThrow();
    });

    it("clears the call interval without throwing", () => {
      const id = setInterval(() => {}, 1000);
      setCallTimer(id);
      expect(() => clearTimers()).not.toThrow();
    });

    it("clears the timeout timer without throwing", () => {
      const id = setTimeout(() => {}, 5000);
      setTimeoutTimer(id);
      expect(() => clearTimers()).not.toThrow();
    });

    it("clears the ended-reset timer without throwing", () => {
      const id = setTimeout(() => {}, 3000);
      setEndedResetTimer(id);
      expect(() => clearTimers()).not.toThrow();
    });

    it("clears the disconnect-recovery timer without throwing", () => {
      const id = setTimeout(() => {}, 5000);
      setDisconnectRecoveryTimer(id);
      expect(() => clearTimers()).not.toThrow();
    });

    it("prevents a cleared interval from firing", () => {
      const cb = vi.fn();
      const id = setInterval(cb, 1000);
      setCallTimer(id);
      clearTimers();
      vi.advanceTimersByTime(3000);
      expect(cb).not.toHaveBeenCalled();
    });

    it("prevents a cleared timeout from firing", () => {
      const cb = vi.fn();
      const id = setTimeout(cb, 5000);
      setTimeoutTimer(id);
      clearTimers();
      vi.advanceTimersByTime(6000);
      expect(cb).not.toHaveBeenCalled();
    });

    it("can be called multiple times safely (idempotent)", () => {
      const id = setTimeout(() => {}, 5000);
      setTimeoutTimer(id);
      clearTimers();
      expect(() => clearTimers()).not.toThrow();
    });

    it("clears all four timers in a single call", () => {
      const callCb = vi.fn();
      const timeoutCb = vi.fn();
      const resetCb = vi.fn();
      const recoveryCb = vi.fn();

      setCallTimer(setInterval(callCb, 1000));
      setTimeoutTimer(setTimeout(timeoutCb, 5000));
      setEndedResetTimer(setTimeout(resetCb, 3000));
      setDisconnectRecoveryTimer(
        setTimeout(recoveryCb, 5000),
      );

      clearTimers();
      vi.advanceTimersByTime(6000);

      expect(callCb).not.toHaveBeenCalled();
      expect(timeoutCb).not.toHaveBeenCalled();
      expect(resetCb).not.toHaveBeenCalled();
      expect(recoveryCb).not.toHaveBeenCalled();
    });
  });

  describe("getDisconnectRecoveryTimer()", () => {
    it("returns null when no recovery timer is set", () => {
      expect(getDisconnectRecoveryTimer()).toBeNull();
    });

    it("returns the timer id after setDisconnectRecoveryTimer()", () => {
      const id = setTimeout(() => {}, 5000);
      setDisconnectRecoveryTimer(id);
      expect(getDisconnectRecoveryTimer()).toBe(id);
    });

    it("returns null after clearTimers()", () => {
      const id = setTimeout(() => {}, 5000);
      setDisconnectRecoveryTimer(id);
      clearTimers();
      expect(getDisconnectRecoveryTimer()).toBeNull();
    });

    it("returns null after setDisconnectRecoveryTimer(null)", () => {
      const id = setTimeout(() => {}, 5000);
      setDisconnectRecoveryTimer(id);
      setDisconnectRecoveryTimer(null);
      expect(getDisconnectRecoveryTimer()).toBeNull();
    });
  });

  describe("setters accept null without throwing", () => {
    it("setCallTimer(null) does not throw", () => {
      expect(() => setCallTimer(null)).not.toThrow();
    });

    it("setTimeoutTimer(null) does not throw", () => {
      expect(() => setTimeoutTimer(null)).not.toThrow();
    });

    it("setEndedResetTimer(null) does not throw", () => {
      expect(() => setEndedResetTimer(null)).not.toThrow();
    });

    it("setDisconnectRecoveryTimer(null) does not throw", () => {
      expect(() => setDisconnectRecoveryTimer(null)).not.toThrow();
    });
  });

  describe("timer replacement — old timer is not left dangling", () => {
    it("replacing call timer does not fire the old interval", () => {
      const oldCb = vi.fn();
      const newCb = vi.fn();

      const oldId = setInterval(oldCb, 1000);
      setCallTimer(oldId);

      // Replace with a new timer (simulates connected → re-connected edge case)
      const newId = setInterval(newCb, 1000);
      setCallTimer(newId);

      clearTimers();
      vi.advanceTimersByTime(3000);

      expect(oldCb).not.toHaveBeenCalled();
      expect(newCb).not.toHaveBeenCalled();
    });
  });
});

