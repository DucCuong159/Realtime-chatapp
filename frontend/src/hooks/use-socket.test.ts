import { createMockSocket } from "@/test/test-fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSocket } from "./use-socket";

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

describe("useSocket store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSocket.setState({ socket: null, onlineUsers: [] });
  });

  it("initializes with null socket and empty onlineUsers", () => {
    expect(useSocket.getState().socket).toBeNull();
    expect(useSocket.getState().onlineUsers).toEqual([]);
  });

  it("clears onlineUsers and disconnects socket on disconnectSocket", () => {
    const mockDisconnect = vi.fn();
    const mockSocket = createMockSocket({
      disconnect: mockDisconnect,
    });

    useSocket.setState({
      socket: mockSocket,
      onlineUsers: ["u1", "u2"],
    });

    useSocket.getState().disconnectSocket();

    expect(mockDisconnect).toHaveBeenCalled();
    expect(useSocket.getState().socket).toBeNull();
    expect(useSocket.getState().onlineUsers).toEqual([]);
  });
});
