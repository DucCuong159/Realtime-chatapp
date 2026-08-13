export type Time = `${number}${"s" | "m" | "h" | "d" | "w" | "y"}`;

export const convertTimeToMs = (time: Time): number => {
  const value = Number(time.slice(0, -1));
  const unit = time.slice(-1);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid time value");
  }

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    case "y":
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      throw new Error("Invalid time unit");
  }
};
