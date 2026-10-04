import { format } from "date-fns";
import { nl } from "date-fns/locale";

export function formatDay(iso: string): string {
  return format(new Date(`${iso}T12:00:00`), "EEE d MMM", { locale: nl }).replace(/\.$/, "");
}

export function formatLong(date = new Date()): string {
  return format(date, "EEEE d MMMM", { locale: nl });
}
