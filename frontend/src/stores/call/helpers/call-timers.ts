let callTimer: number | null = null;
let timeoutTimer: number | null = null;
let endedResetTimer: number | null = null;
let disconnectRecoveryTimer: number | null = null;

export const setCallTimer = (timer: number | null) => {
  callTimer = timer;
};

export const setTimeoutTimer = (timer: number | null) => {
  timeoutTimer = timer;
};

export const setEndedResetTimer = (timer: number | null) => {
  endedResetTimer = timer;
};

export const setDisconnectRecoveryTimer = (timer: number | null) => {
  disconnectRecoveryTimer = timer;
};

export const getDisconnectRecoveryTimer = () => disconnectRecoveryTimer;

export const clearTimers = () => {
  if (callTimer !== null) {
    clearInterval(callTimer);
    callTimer = null;
  }
  if (timeoutTimer !== null) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
  if (endedResetTimer !== null) {
    clearTimeout(endedResetTimer);
    endedResetTimer = null;
  }
  if (disconnectRecoveryTimer !== null) {
    clearTimeout(disconnectRecoveryTimer);
    disconnectRecoveryTimer = null;
  }
};
