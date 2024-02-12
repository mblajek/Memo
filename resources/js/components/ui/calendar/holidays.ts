import {DateTime} from "luxon";

export const SIMPLE_HOLIDAYS = [
  "2023-01-01", // New Year's Day
  "2023-01-06", // Epiphany
  "2023-04-09", // Easter Sunday
  "2023-04-10", // Easter Monday
  "2023-05-01", // Labor Day / May Day
  "2023-05-03", // Constitution Day
  "2023-05-28", // Whit Sunday
  "2023-06-08", // Corpus Christi
  "2023-08-15", // Assumption of Mary
  "2023-11-01", // All Saints' Day
  "2023-11-11", // Independence Day
  "2023-12-25", // Christmas Day
  "2023-12-26", // Second Day of Christmas
  "2024-01-01", // New Year's Day
  "2024-01-06", // Epiphany
  "2024-03-31", // Easter Sunday
  "2024-04-01", // Easter Monday
  "2024-05-01", // Labor Day / May Day
  "2024-05-03", // Constitution Day
  "2024-05-19", // Whit Sunday
  "2024-05-30", // Corpus Christi
  "2024-08-15", // Assumption of Mary
  "2024-11-01", // All Saints' Day
  "2024-11-11", // Independence Day
  "2024-12-25", // Christmas Day
  "2024-12-26", // Second Day of Christmas
  "2025-01-01", // New Year's Day
  "2025-01-06", // Epiphany
  "2025-04-20", // Easter Sunday
  "2025-04-21", // Easter Monday
  "2025-05-01", // Labor Day / May Day
  "2025-05-03", // Constitution Day
  "2025-06-08", // Whit Sunday
  "2025-06-19", // Corpus Christi
  "2025-08-15", // Assumption of Mary
  "2025-11-01", // All Saints' Day
  "2025-11-11", // Independence Day
  "2025-12-25", // Christmas Day
  "2025-12-26", // Second Day of Christmas
  "2026-01-01", // New Year's Day
  "2026-01-06", // Epiphany
  "2026-04-05", // Easter Sunday
  "2026-04-06", // Easter Monday
  "2026-05-01", // Labor Day / May Day
  "2026-05-03", // Constitution Day
  "2026-05-24", // Whit Sunday
  "2026-06-04", // Corpus Christi
  "2026-08-15", // Assumption of Mary
  "2026-11-01", // All Saints' Day
  "2026-11-11", // Independence Day
  "2026-12-25", // Christmas Day
  "2026-12-26", // Second Day of Christmas
  "2027-01-01", // New Year's Day
  "2027-01-06", // Epiphany
  "2027-03-28", // Easter Sunday
  "2027-03-29", // Easter Monday
  "2027-05-01", // Labor Day / May Day
  "2027-05-03", // Constitution Day
  "2027-05-16", // Whit Sunday
  "2027-05-27", // Corpus Christi
  "2027-08-15", // Assumption of Mary
  "2027-11-01", // All Saints' Day
  "2027-11-11", // Independence Day
  "2027-12-25", // Christmas Day
  "2027-12-26", // Second Day of Christmas
];

export function useHolidays() {
  // TODO: This should be replaced with some configurable holidays system.
  return () => SIMPLE_HOLIDAYS.map((date) => DateTime.fromISO(date));
}
