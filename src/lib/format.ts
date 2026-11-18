export function formatDateTime(iso: string, locale: string, timeZone: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone }).format(new Date(iso));
}
/** Formats a plain calendar date (YYYY-MM-DD) without shifting it through a time zone. */
export function formatDay(date: string, locale: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}
