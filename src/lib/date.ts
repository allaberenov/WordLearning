const DAY_MS = 24 * 60 * 60 * 1000;

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit"
  }).formatToParts(date);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}

export function getDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function startOfDayInTimeZone(date: Date, timeZone: string) {
  const [year, month, day] = getDateKey(date, timeZone).split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  const offset = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset * 60 * 1000);
}

export function endOfDayInTimeZone(date: Date, timeZone: string) {
  return new Date(startOfDayInTimeZone(date, timeZone).getTime() + DAY_MS - 1);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function differenceInWholeDays(later: Date, earlier: Date) {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / DAY_MS));
}

export function formatDateRu(date: Date | string | null | undefined) {
  if (!date) return "не назначено";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(date));
}

export function formatIntervalRu(now: Date, dueAt: Date) {
  const diffMs = Math.max(0, dueAt.getTime() - now.getTime());
  const minutes = Math.round(diffMs / (60 * 1000));
  if (minutes < 60) return `через ${Math.max(1, minutes)} мин`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `через ${hours} ч`;
  const days = Math.round(hours / 24);
  if (days === 1) return "завтра";
  if (days < 7) return `через ${days} дн`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `через ${weeks} нед`;
  const months = Math.round(days / 30);
  return `через ${months} мес`;
}

export function isSameDateKey(a: Date, b: Date, timeZone: string) {
  return getDateKey(a, timeZone) === getDateKey(b, timeZone);
}
