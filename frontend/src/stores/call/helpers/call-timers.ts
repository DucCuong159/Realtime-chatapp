let callTimer: number | null = null;
let timeoutTimer: number | null = null;
let endedResetTimer: number | null = null;
let disconnectRecoveryTimer: number | null = null;

export const setCallTimer = (timer: number | null): void => {
  if (callTimer !== null) {
    clearInterval(callTimer);
  }
  callTimer = timer;
};

export const setTimeoutTimer = (timer: number | null): void => {
  if (timeoutTimer !== null) {
    clearTimeout(timeoutTimer);
  }
  timeoutTimer = timer;
};

export const setEndedResetTimer = (timer: number | null): void => {
  if (endedResetTimer !== null) {
    clearTimeout(endedResetTimer);
  }
  endedResetTimer = timer;
};

export const setDisconnectRecoveryTimer = (timer: number | null): void => {
  if (disconnectRecoveryTimer !== null) {
    clearTimeout(disconnectRecoveryTimer);
  }
  disconnectRecoveryTimer = timer;
};

export const getDisconnectRecoveryTimer = (): number | null => disconnectRecoveryTimer;

export const clearTimers = (): void => {
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
