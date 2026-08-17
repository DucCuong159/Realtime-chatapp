import { useSocket } from "./use-socket";

export const useIsUserOnline = (userId?: string) => {
  return useSocket((state) =>
    Boolean(userId && state.onlineUsers.includes(userId)),
  );
};

export default useIsUserOnline;
