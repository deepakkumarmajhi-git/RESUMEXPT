import { formatDistanceToNow, format } from "date-fns";

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "N/A";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatRelativeDate(date: Date | string | null | undefined) {
  if (!date) return "just now";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
