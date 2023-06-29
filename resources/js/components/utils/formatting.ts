/**
 * Formats the date as "YYYY-MM-DD hh:mm:ss".
 * https://xkcd.com/1179/
 */
export function formatDateTime(t: Date) {
  const iso = t.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}
