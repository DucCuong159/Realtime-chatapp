type TimerHandle = number | ReturnType<typeof setTimeout>;

let callTimer: TimerHandle | null = null;
let timeoutTimer: TimerHandle | null = null;
let endedResetTimer: TimerHandle | null = null;
let disconnectRecoveryTimer: TimerHandle | null = null;

export const setCallTimer = (timer: TimerHandle | null): void => {
  if (callTimer !== null) {
    clearInterval(callTimer);
  }
  callTimer = timer;
};

export const setTimeoutTimer = (timer: TimerHandle | null): void => {
  if (timeoutTimer !== null) {
    clearTimeout(timeoutTimer);
  }
  timeoutTimer = timer;
};

export const setEndedResetTimer = (timer: TimerHandle | null): void => {
  if (endedResetTimer !== null) {
    clearTimeout(endedResetTimer);
  }
  endedResetTimer = timer;
};

export const setDisconnectRecoveryTimer = (timer: TimerHandle | null): void => {
  if (disconnectRecoveryTimer !== null) {
    clearTimeout(disconnectRecoveryTimer);
  }
  disconnectRecoveryTimer = timer;
};

export const getDisconnectRecoveryTimer = (): TimerHandle | null => disconnectRecoveryTimer;

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
