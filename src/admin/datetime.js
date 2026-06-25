export const TZ_SHANGHAI = "Asia/Shanghai";

export function getDatePartsInShanghai(time) {
  const date = new Date(time);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ_SHANGHAI,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    y: Number(parts.year),
    M: Number(parts.month),
    d: Number(parts.day),
    h: Number(parts.hour),
    m: Number(parts.minute),
    s: Number(parts.second),
  };
}

export function formatDateInShanghai(time, format = "yyyy-MM-dd HH:mm:ss") {
  const { y, M, d, h, m, s } = getDatePartsInShanghai(time);
  const pad2 = (value) => String(value).padStart(2, "0");

  return format
    .replace(/yyyy/g, String(y))
    .replace(/MM/g, pad2(M))
    .replace(/dd/g, pad2(d))
    .replace(/HH/g, pad2(h))
    .replace(/hh/g, pad2(h))
    .replace(/mm/g, pad2(m))
    .replace(/ss/g, pad2(s));
}

export function toDatetimeLocalShanghai(iso) {
  const parts = getDatePartsInShanghai(iso);
  const pad = (value) => String(value).padStart(2, "0");
  return `${parts.y}-${pad(parts.M)}-${pad(parts.d)}T${pad(parts.h)}:${pad(parts.m)}`;
}

export function parseDatetimeLocalShanghai(value) {
  if (!value) return new Date().toISOString();
  return new Date(`${value}:00+08:00`).toISOString();
}

export function getCalendarWeekday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getShanghaiYear(time) {
  return getDatePartsInShanghai(time).y;
}

export function getShanghaiDayIndex(time, year) {
  const parts = getDatePartsInShanghai(time);
  const start = getDatePartsInShanghai(`${year}-01-01T00:00:00+08:00`);
  const dateMs = Date.UTC(parts.y, parts.M - 1, parts.d);
  const startMs = Date.UTC(start.y, start.M - 1, start.d);
  return Math.floor((dateMs - startMs) / 86400000);
}

export function getYearStartInShanghai(year) {
  return Date.parse(`${year}-01-01T00:00:00+08:00`);
}
