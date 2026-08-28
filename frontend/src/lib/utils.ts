import { clsx, type ClassValue } from "clsx";
import { format, isThisWeek, isToday, isYesterday } from "date-fns";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  return uuidv4();
}

export const formatConversationTime = (date?: string | Date | null) => {
  if (!date) return "";
  const newDate = new Date(date);
  if (Number.isNaN(newDate.getTime())) return "Invalid date";

  if (isToday(newDate)) return format(newDate, "h:mm a");
  if (isYesterday(newDate)) return "Yesterday";
  if (isThisWeek(newDate)) return format(newDate, "EEEE");
  return format(newDate, "M/d");
};

export const isArrayEmpty = (arr?: unknown[] | null): boolean => {
  return !Array.isArray(arr) || arr.length === 0;
};

export const formatDuration = (seconds = 0): string => {
  const normalized = Math.max(
    0,
    Math.floor(
      typeof seconds === "number" && Number.isFinite(seconds) ? seconds : 0,
    ),
  );
  if (normalized === 0) return "0s";
  const h = Math.floor(normalized / 3600);
  const m = Math.floor((normalized % 3600) / 60);
  const s = normalized % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
};

export const formatCallTimer = (seconds = 0): string => {
  const normalized = Math.max(
    0,
    Math.floor(
      typeof seconds === "number" && Number.isFinite(seconds) ? seconds : 0,
    ),
  );
  const hours = Math.floor(normalized / 3600);
  const mins = Math.floor((normalized % 3600) / 60);
  const secs = normalized % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
};

export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};
