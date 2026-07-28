const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function pluralRu(value: number, forms: [string, string, string]) {
  const absolute = Math.abs(value);
  const lastTwo = absolute % 100;
  const last = absolute % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

function formatPart(value: number, forms: [string, string, string]) {
  return `${value} ${pluralRu(value, forms)}`;
}

export function formatDurationRu(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "немного позже";

  const total = Math.max(0, Math.ceil(seconds));
  if (total < MINUTE) {
    return formatPart(total || 1, ["секунду", "секунды", "секунд"]);
  }

  const days = Math.floor(total / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const minutes = Math.floor((total % HOUR) / MINUTE);

  if (days > 0) {
    const parts = [formatPart(days, ["день", "дня", "дней"])];
    if (hours > 0) parts.push(formatPart(hours, ["час", "часа", "часов"]));
    return parts.join(" ");
  }

  if (hours > 0) {
    const parts = [formatPart(hours, ["час", "часа", "часов"])];
    if (minutes > 0) parts.push(formatPart(minutes, ["минуту", "минуты", "минут"]));
    return parts.join(" ");
  }

  return formatPart(minutes, ["минуту", "минуты", "минут"]);
}
