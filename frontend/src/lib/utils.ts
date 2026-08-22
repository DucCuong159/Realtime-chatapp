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
