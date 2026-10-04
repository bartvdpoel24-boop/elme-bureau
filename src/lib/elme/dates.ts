import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { nl } from "date-fns/locale";
import { isoDate } from "@/lib/elme/model";

export function parseDay(value: string): Date {
  return parseISO(value);
}

export function shiftDay(value: string, days: number): string {
  return isoDate(addDays(parseISO(value), days));
}

export function longDay(value: string): string {
  const label = format(parseISO(value), "EEEE d MMMM", { locale: nl });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthName(date: Date): string {
  const label = format(date, "LLLL", { locale: nl });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shortMonth(date: Date): string {
  return format(date, "LLL", { locale: nl }).replace(".", "").toLowerCase();
}

export function weekDays(today: Date): Date[] {
  const start = startOfWeek(today, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: endOfWeek(today, { weekStartsOn: 1 }) });
}

export function monthDays(today: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
}

export function yearMonths(year: number): Date[] {
  const anchor = new Date(year, 0, 1);
  return eachMonthOfInterval({ start: startOfYear(anchor), end: endOfYear(anchor) });
}

export function mondayIndex(date: Date): number {
  return (getDay(date) + 6) % 7;
}

export function weekdayLabels(): string[] {
  const monday = startOfWeek(new Date(2026, 0, 5), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: monday, end: addDays(monday, 6) }).map((day) =>
    format(day, "EEEEEE", { locale: nl }).replace(".", "").toLowerCase(),
  );
}
